// §9 自研 div-based 甘特图（不引入 vis-timeline）
// 资源 × 时间二维。pointer 拖拽 + 同行区间相交冲突检测 + 落位回写 store。
import { useEffect, useMemo, useRef, useState } from 'react';
import { useScheduleStore, GANTT_START } from '../../store/useScheduleStore';
import { getResourcesByWorkshop } from '../../mock/productLines';
import type { WorkOrder } from '../../types/workOrder';
import { fmtDate, fmtTime } from '../../utils/format';
import { GANTT_DAYS, HOUR_WIDTH_WEEK, HOUR_WIDTH_DAY } from '../../mock/scheduleData';

const ROW_H = 44;

export default function GanttChart() {
  const workshop = useScheduleStore((s) => s.workshop);
  const view = useScheduleStore((s) => s.view);
  const scheduled = useScheduleStore((s) => s.scheduled);
  const selectedId = useScheduleStore((s) => s.selectedId);
  const flashIds = useScheduleStore((s) => s.flashIds);
  const select = useScheduleStore((s) => s.select);
  const moveOrder = useScheduleStore((s) => s.moveOrder);
  const schedulePending = useScheduleStore((s) => s.schedulePending);

  const resources = useMemo(() => getResourcesByWorkshop(workshop), [workshop]);
  const hourWidth = view === 'week' ? HOUR_WIDTH_WEEK : HOUR_WIDTH_DAY;
  const totalHours = view === 'week' ? GANTT_DAYS * 24 : 24;
  const totalWidth = totalHours * hourWidth;

  const laneRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<null | {
    woId: string; fromExternal?: boolean;
    grabOffsetMs: number; durMs: number;
    ghostLeftPx: number; ghostTopPx: number; ghostWidthPx: number;
    conflict: boolean;
  }>(null);
  const [conflictHint, setConflictHint] = useState<{ x: number; y: number; msg: string } | null>(null);

  // 时间 → x（ms 距 GANTT_START 起点）
  const msToPx = (ms: number) => (ms - GANTT_START.getTime()) / 3_600_000 * hourWidth;
  const pxToMs = (px: number) => GANTT_START.getTime() + (px / hourWidth) * 3_600_000;
  // 对齐到 15 分钟
  const snapMs = (ms: number) => {
    const QUARTER = 15 * 60 * 1000;
    return Math.round(ms / QUARTER) * QUARTER;
  };

  const visibleOrders = useMemo(() => {
    const startMs = GANTT_START.getTime();
    const endMs = startMs + totalHours * 3_600_000;
    return scheduled.filter((w) =>
      w.scheduledResourceId && w.scheduledStart && w.scheduledEnd &&
      resources.some((r) => r.id === w.scheduledResourceId) &&
      // 至少有一段落在窗口内
      w.scheduledEnd.getTime() > startMs && w.scheduledStart.getTime() < endMs,
    );
  }, [scheduled, resources, totalHours]);

  // 拖拽逻辑
  function onPointerDown(e: React.PointerEvent, wo: WorkOrder) {
    if (!wo.scheduledStart || !wo.scheduledEnd || !wo.scheduledResourceId) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
    const grab = pxToMs(e.clientX - (laneRef.current?.getBoundingClientRect().left ?? 0)) - wo.scheduledStart.getTime();
    setDrag({
      woId: wo.id,
      grabOffsetMs: grab,
      durMs: wo.scheduledEnd.getTime() - wo.scheduledStart.getTime(),
      ghostLeftPx: msToPx(wo.scheduledStart.getTime()),
      ghostTopPx: resources.findIndex((r) => r.id === wo.scheduledResourceId) * ROW_H,
      ghostWidthPx: (wo.scheduledEnd.getTime() - wo.scheduledStart.getTime()) / 3_600_000 * hourWidth,
      conflict: false,
    });
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag) return;
    const rect = laneRef.current!.getBoundingClientRect();
    const x = Math.max(0, Math.min(totalWidth, e.clientX - rect.left));
    const y = Math.max(0, Math.min(resources.length * ROW_H - 1, e.clientY - rect.top));
    const targetRow = Math.floor(y / ROW_H);
    const newStart = snapMs(pxToMs(x) - drag.grabOffsetMs);
    const newEnd = newStart + drag.durMs;
    const targetResId = resources[targetRow]?.id;
    // 区间相交 → 冲突
    let conflict = false;
    if (targetResId) {
      const sameRow = visibleOrders.filter((w) =>
        w.id !== drag.woId && w.scheduledResourceId === targetResId,
      );
      conflict = sameRow.some((o) =>
        !(newEnd <= o.scheduledStart!.getTime() || newStart >= o.scheduledEnd!.getTime()),
      );
    }
    setDrag({
      ...drag,
      ghostLeftPx: msToPx(newStart),
      ghostTopPx: targetRow * ROW_H,
      conflict,
    });
    setConflictHint(conflict ? {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top - 30,
      msg: '⚠️ 与已有工单冲突',
    } : null);
  }
  function onPointerUp(e: React.PointerEvent) {
    if (!drag) return;
    const rect = laneRef.current!.getBoundingClientRect();
    const x = Math.max(0, Math.min(totalWidth, e.clientX - rect.left));
    const y = Math.max(0, Math.min(resources.length * ROW_H - 1, e.clientY - rect.top));
    const targetRow = Math.floor(y / ROW_H);
    const newStart = snapMs(pxToMs(x) - drag.grabOffsetMs);
    const targetResId = resources[targetRow]?.id;
    if (targetResId && !drag.conflict) {
      moveOrder(drag.woId, targetResId, newStart);
    }
    setDrag(null);
    setConflictHint(null);
  }

  // ====== 待排池外部 HTML5 拖入支持（待排池设置 draggable + dataTransfer 携带 id） ======
  function onLaneDragOver(e: React.DragEvent) {
    if (e.dataTransfer.types.includes('application/x-pending-wo')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    }
  }
  function onLaneDrop(e: React.DragEvent) {
    const id = e.dataTransfer.getData('application/x-pending-wo');
    if (!id) return;
    const rect = laneRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const targetRow = Math.floor(y / ROW_H);
    const targetResId = resources[targetRow]?.id;
    if (!targetResId) return;
    const startMs = snapMs(pxToMs(x));
    const result = schedulePending(id, targetResId, startMs);
    if (!result.ok) {
      // 简单 inline 提示
      alert('该位置与 ' + result.conflictWith + ' 冲突，请换位置');
    }
  }

  // 时间轴 ticks
  const days = useMemo(() => {
    const arr: { offsetHr: number; label: string; weekday: string }[] = [];
    for (let i = 0; i < (view === 'week' ? GANTT_DAYS : 1); i++) {
      const d = new Date(GANTT_START.getTime() + i * 24 * 3_600_000);
      arr.push({
        offsetHr: i * 24,
        label: fmtDate(d),
        weekday: '日一二三四五六'[d.getDay()],
      });
    }
    return arr;
  }, [view]);

  // 当前时间指示线
  const now = new Date('2026-07-15T09:24:00');
  const nowPx = msToPx(now.getTime());
  const nowVisible = nowPx >= 0 && nowPx <= totalWidth;

  return (
    <div className="flex bg-card border border-line rounded-xl overflow-hidden">
      {/* 资源轴 */}
      <div className="flex-none w-[180px] border-r border-line bg-panel2">
        <div className="h-12 border-b border-line flex items-center px-3 text-[11px] font-semibold text-ink-dim sticky top-0 z-[2] bg-panel2">
          资源 / 时间
        </div>
        <div>
          {resources.map((r) => (
            <div key={r.id} className="border-b border-line flex items-center px-3"
                 style={{ height: ROW_H }}>
              <div className="text-[12.5px] font-medium leading-tight">{r.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 时间轴 + 主区 */}
      <div className="flex-1 overflow-x-auto overflow-y-auto relative">
        <div style={{ width: totalWidth }}>
          {/* 时间轴 */}
          <div className="h-12 border-b border-line bg-panel2 sticky top-0 z-[2] relative">
            {/* 日级标签 */}
            <div className="flex h-6">
              {days.map((d) => (
                <div key={d.offsetHr} className="border-r border-line text-[11px] text-ink-dim flex items-center justify-center font-semibold"
                     style={{ width: 24 * hourWidth }}>
                  {d.label} {d.weekday}
                </div>
              ))}
            </div>
            {/* 小时标签（仅日视图显示） */}
            {view === 'day' && (
              <div className="flex h-6 text-[10px] text-ink-faint">
                {Array.from({ length: 24 }).map((_, h) => (
                  <div key={h} className="border-r border-line/60 flex items-center justify-center"
                       style={{ width: hourWidth }}>
                    {h}时
                  </div>
                ))}
              </div>
            )}
            {/* 周视图 6/12/18/24 刻度 */}
            {view === 'week' && (
              <div className="flex h-6 text-[10px] text-ink-faint">
                {days.map((d) =>
                  [0, 6, 12, 18].map((h) => (
                    <div key={d.offsetHr + h} className="border-r border-line/60 flex items-center justify-center"
                         style={{ width: 6 * hourWidth }}>
                      {h}时
                    </div>
                  )),
                )}
              </div>
            )}
          </div>

          {/* 工单条主区 */}
          <div
            ref={laneRef}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={() => { setDrag(null); setConflictHint(null); }}
            onDragOver={onLaneDragOver}
            onDrop={onLaneDrop}
            className="relative"
            style={{ width: totalWidth, height: resources.length * ROW_H }}
          >
            {/* 网格 */}
            {resources.map((_, ri) => (
              <div key={ri} className="absolute left-0 right-0 border-b border-line/60"
                   style={{ top: ri * ROW_H, height: ROW_H }} />
            ))}
            {Array.from({ length: totalHours / (view === 'week' ? 6 : 1) }).map((_, i) => (
              <div key={i} className="absolute top-0 bottom-0 border-r border-line/50"
                   style={{ left: i * (view === 'week' ? 6 : 1) * hourWidth }} />
            ))}
            {/* 当前时间线 */}
            {nowVisible && (
              <div className="absolute top-0 bottom-0 w-px bg-danger z-[3]" style={{ left: nowPx }}>
                <div className="absolute -top-3 -left-7 text-[9px] font-bold text-danger px-1 bg-card">
                  现在
                </div>
              </div>
            )}

            {/* 工单条 */}
            {visibleOrders.map((wo) => {
              const ri = resources.findIndex((r) => r.id === wo.scheduledResourceId);
              if (ri < 0) return null;
              const left = msToPx(wo.scheduledStart!.getTime());
              const width = (wo.scheduledEnd!.getTime() - wo.scheduledStart!.getTime()) / 3_600_000 * hourWidth;
              const isSel = wo.id === selectedId;
              const isFlash = flashIds.includes(wo.id);
              const isUrgent = wo.priority === 'urgent';
              const dragging = drag?.woId === wo.id;
              const opacity = dragging ? 0.25 : 1;
              return (
                <div
                  key={wo.id}
                  className={`absolute rounded-md flex items-center px-2 cursor-grab active:cursor-grabbing
                              select-none text-white text-[10px] font-semibold truncate
                              shadow-sm hover:shadow-md transition-shadow
                              ${isSel ? 'ring-2 ring-brand ring-offset-1 ring-offset-card' : ''}
                              ${isFlash ? 'animate-pulse ring-2 ring-ai ring-offset-1 ring-offset-card' : ''}
                              ${isUrgent ? 'ring-1 ring-danger' : ''}`}
                  style={{
                    top: ri * ROW_H + 6,
                    left,
                    width: Math.max(12, width),
                    height: ROW_H - 12,
                    background: wo.colorCode,
                    opacity,
                  }}
                  onPointerDown={(e) => onPointerDown(e, wo)}
                  onClick={(e) => { e.stopPropagation(); select(wo.id); }}
                  title={`${wo.id} · ${wo.productName} · ${wo.quantity}kg · ${wo.customer}`}
                >
                  <span className="truncate">{wo.productName.split(' ')[0]} · {wo.quantity}kg</span>
                </div>
              );
            })}

            {/* 拖拽 Ghost */}
            {drag && (
              <div
                className={`absolute rounded-md ring-2 z-[4] pointer-events-none
                            ${drag.conflict ? 'ring-danger bg-danger/30 animate-pulse' : 'ring-ai bg-ai/20'}`}
                style={{
                  left: drag.ghostLeftPx, top: drag.ghostTopPx + 6,
                  width: Math.max(12, drag.ghostWidthPx), height: ROW_H - 12,
                }}
              />
            )}
            {/* 冲突 Tooltip */}
            {conflictHint && (
              <div
                className="absolute z-[5] text-[10px] font-semibold text-white bg-danger
                           rounded px-2 py-0.5 pointer-events-none whitespace-nowrap"
                style={{ left: conflictHint.x + 6, top: conflictHint.y }}
              >
                {conflictHint.msg}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export { ROW_H };
