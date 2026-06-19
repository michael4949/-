// §9 自研 div-based 甘特图（Sprint 2 新增：Agent #3 Inline Hint + 场景 3 冲突→AI 找位置）
import { useEffect, useMemo, useRef, useState } from 'react';
import { useScheduleStore, GANTT_START } from '../../store/useScheduleStore';
import { useExplainStore } from '../../store/useExplainStore';
import { getResourcesByWorkshop } from '../../mock/productLines';
import type { WorkOrder } from '../../types/workOrder';
import { fmtDate, fmtDateTime } from '../../utils/format';
import { GANTT_DAYS, HOUR_WIDTH_WEEK, HOUR_WIDTH_DAY } from '../../mock/scheduleData';
import { ANOMALY_OPT, type AnomalyOptimization } from '../../mock/agentResponses';
import AIHintInline from '../ai/AIHintInline';

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
  const aiFindBestSlot = useScheduleStore((s) => s.aiFindBestSlot);
  const applyAnomalyMerge = useScheduleStore((s) => s.applyAnomalyMerge);
  const showExplain = useExplainStore((s) => s.show);

  const resources = useMemo(() => getResourcesByWorkshop(workshop), [workshop]);
  const hourWidth = view === 'week' ? HOUR_WIDTH_WEEK : HOUR_WIDTH_DAY;
  const totalHours = view === 'week' ? GANTT_DAYS * 24 : 24;
  const totalWidth = totalHours * hourWidth;

  const scrollRef = useRef<HTMLDivElement>(null);
  const laneRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<null | {
    woId: string;
    grabOffsetMs: number; durMs: number;
    ghostLeftPx: number; ghostTopPx: number; ghostWidthPx: number;
    conflict: boolean;
    conflictWith?: string;
  }>(null);
  const [conflictHint, setConflictHint] = useState<{ x: number; y: number; msg: string } | null>(null);
  // 拖拽放下时若冲突 → 弹"是否覆盖 / 让算法找最佳位置"
  const [conflictDialog, setConflictDialog] = useState<null | {
    woId: string; conflictWith: string;
  }>(null);
  const [aiSuggesting, setAiSuggesting] = useState(false);

  const msToPx = (ms: number) => (ms - GANTT_START.getTime()) / 3_600_000 * hourWidth;
  const pxToMs = (px: number) => GANTT_START.getTime() + (px / hourWidth) * 3_600_000;
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
      w.scheduledEnd.getTime() > startMs && w.scheduledStart.getTime() < endMs,
    );
  }, [scheduled, resources, totalHours]);

  // Agent #3：漆包车间下显示漆包机 #3 行末的 Inline Hint
  const anomalyRowIdx = useMemo(() => {
    if (workshop !== 'enameling') return -1;
    return resources.findIndex((r) => r.id === ANOMALY_OPT.resourceId);
  }, [resources, workshop]);

  // 进入排产页时若 hash 带 #anomaly 标记 → 自动滚动到漆包机 #3 行
  useEffect(() => {
    if (anomalyRowIdx < 0) return;
    if (window.location.hash.includes('anomaly')) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ top: anomalyRowIdx * ROW_H - 60, behavior: 'smooth' });
      }, 200);
    }
  }, [anomalyRowIdx]);

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
    let conflict = false; let conflictWith: string | undefined;
    if (targetResId) {
      const sameRow = visibleOrders.filter((w) => w.id !== drag.woId && w.scheduledResourceId === targetResId);
      for (const o of sameRow) {
        if (!(newEnd <= o.scheduledStart!.getTime() || newStart >= o.scheduledEnd!.getTime())) {
          conflict = true; conflictWith = o.id; break;
        }
      }
    }
    setDrag({ ...drag, ghostLeftPx: msToPx(newStart), ghostTopPx: targetRow * ROW_H, conflict, conflictWith });
    setConflictHint(conflict ? { x: e.clientX - rect.left, y: e.clientY - rect.top - 30, msg: `⚠️ 与 ${conflictWith} 冲突` } : null);
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
      setDrag(null); setConflictHint(null);
    } else if (drag.conflict && drag.conflictWith) {
      // §9.2 场景 3：弹"是否覆盖 / 让算法找最佳位置"
      setConflictDialog({ woId: drag.woId, conflictWith: drag.conflictWith });
      setDrag(null); setConflictHint(null);
    } else {
      setDrag(null); setConflictHint(null);
    }
  }
  function onLaneDragOver(e: React.DragEvent) {
    if (e.dataTransfer.types.includes('application/x-pending-wo')) {
      e.preventDefault(); e.dataTransfer.dropEffect = 'move';
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
    const result = schedulePending(id, targetResId, snapMs(pxToMs(x)));
    if (!result.ok) alert('该位置与 ' + result.conflictWith + ' 冲突，请换位置');
  }

  // 冲突对话框 → "让算法找最佳位置"
  async function onAIFindSlot() {
    if (!conflictDialog) return;
    setAiSuggesting(true);
    // mock 1 秒（§9.2 场景 3 原文：1 秒后建议位置）
    await new Promise((r) => setTimeout(r, 1000));
    const wo = scheduled.find((w) => w.id === conflictDialog.woId);
    const preferRes = wo?.scheduledResourceId ?? resources[0].id;
    const slot = aiFindBestSlot(conflictDialog.woId, preferRes);
    setAiSuggesting(false);
    if (slot) {
      const resName = resources.find((r) => r.id === slot.resourceId)?.name ?? slot.resourceId;
      const result = moveOrder(conflictDialog.woId, slot.resourceId, slot.startMs);
      setConflictDialog(null);
      if (result.ok) {
        alert(`✨ AI 建议位置：${resName} · ${fmtDateTime(new Date(slot.startMs))}（已应用）`);
      }
    } else {
      alert('未找到合适位置');
    }
  }

  // Agent #3 异常 Hint 点击：弹 Explain Modal
  function onAnomalyHintClick() {
    const opt = ANOMALY_OPT;
    showExplain({
      title: `${opt.resource} · 排产可优化`,
      content: (
        <div className="space-y-3">
          <p>检测到 <b className="text-ink">{opt.resource}</b> 在未来 3 天闲置率约 <b className="text-warn">{opt.idle}%</b>。建议将以下 3 张同规格工单合并到 {opt.resource} 连续生产：</p>
          <ul className="space-y-1 pl-1">
            {opt.affectedWorkOrders.map((w) => (
              <li key={w.id} className="flex items-baseline gap-2 text-[12.5px]">
                <span className="text-ai">·</span>
                <span className="font-mono text-ink-dim">{w.id}</span>
                <span className="text-ink">{w.product}</span>
                <span className="text-ink-faint">{w.quantity}kg</span>
              </li>
            ))}
          </ul>
          <p>预计可节省 <b className="text-ai">{opt.savedHours} 小时</b>换型时间，{opt.resource} 利用率从 {opt.utilizationBefore}% → <b className="text-ok">{opt.utilizationAfter}%</b>，换型损失 {opt.kpiBefore}% → <b className="text-ok">{opt.kpiAfter}%</b>。</p>
        </div>
      ),
      primaryAction: {
        label: '应用建议',
        onClick: () => {
          applyAnomalyMerge(opt);
          useExplainStore.getState().close();
        },
      },
    });
  }

  const days = useMemo(() => {
    const arr: { offsetHr: number; label: string; weekday: string }[] = [];
    for (let i = 0; i < (view === 'week' ? GANTT_DAYS : 1); i++) {
      const d = new Date(GANTT_START.getTime() + i * 24 * 3_600_000);
      arr.push({ offsetHr: i * 24, label: fmtDate(d), weekday: '日一二三四五六'[d.getDay()] });
    }
    return arr;
  }, [view]);

  const now = new Date('2026-07-15T09:24:00');
  const nowPx = msToPx(now.getTime());
  const nowVisible = nowPx >= 0 && nowPx <= totalWidth;

  return (
    <div className="flex bg-card border border-line rounded-xl overflow-hidden h-full">
      {/* 资源轴 */}
      <div className="flex-none w-[200px] border-r border-line bg-panel2 overflow-hidden flex flex-col">
        <div className="h-12 border-b border-line flex items-center px-3 text-[11px] font-semibold text-ink-dim">
          资源 / 时间
        </div>
        <div className="overflow-hidden" ref={scrollRef}>
          {resources.map((r, idx) => (
            <div key={r.id} className="border-b border-line flex items-center px-3 gap-1.5"
                 style={{ height: ROW_H }}>
              <div className="text-[12.5px] font-medium leading-tight flex-none">{r.name}</div>
              {/* Agent #3 漆包机 #3 行末 Inline Hint */}
              {idx === anomalyRowIdx && (
                <AIHintInline
                  hint={{ id: 'anomaly-1', resourceId: r.id, type: 'idle', message: '闲置 30%, 可优化' }}
                  onClick={onAnomalyHintClick}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 时间轴 + 主区 */}
      <div className="flex-1 overflow-auto relative" ref={scrollRef}>
        <div style={{ width: totalWidth }}>
          {/* 时间轴 */}
          <div className="h-12 border-b border-line bg-panel2 sticky top-0 z-[2] relative">
            <div className="flex h-6">
              {days.map((d) => (
                <div key={d.offsetHr} className="border-r border-line text-[11px] text-ink-dim flex items-center justify-center font-semibold"
                     style={{ width: 24 * hourWidth }}>
                  {d.label} {d.weekday}
                </div>
              ))}
            </div>
            {view === 'day' && (
              <div className="flex h-6 text-[10px] text-ink-faint">
                {Array.from({ length: 24 }).map((_, h) => (
                  <div key={h} className="border-r border-line/60 flex items-center justify-center"
                       style={{ width: hourWidth }}>{h}时</div>
                ))}
              </div>
            )}
            {view === 'week' && (
              <div className="flex h-6 text-[10px] text-ink-faint">
                {days.map((d) =>
                  [0, 6, 12, 18].map((h) => (
                    <div key={d.offsetHr + h} className="border-r border-line/60 flex items-center justify-center"
                         style={{ width: 6 * hourWidth }}>{h}时</div>
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
            {resources.map((_, ri) => (
              <div key={ri} className="absolute left-0 right-0 border-b border-line/60"
                   style={{ top: ri * ROW_H, height: ROW_H }} />
            ))}
            {Array.from({ length: totalHours / (view === 'week' ? 6 : 1) }).map((_, i) => (
              <div key={i} className="absolute top-0 bottom-0 border-r border-line/50"
                   style={{ left: i * (view === 'week' ? 6 : 1) * hourWidth }} />
            ))}
            {nowVisible && (
              <div className="absolute top-0 bottom-0 w-px bg-danger z-[3]" style={{ left: nowPx }}>
                <div className="absolute -top-3 -left-7 text-[9px] font-bold text-danger px-1 bg-card">现在</div>
              </div>
            )}

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
                              ${isFlash ? 'gantt-flash' : ''}
                              ${isUrgent ? 'ring-2 ring-danger ring-offset-1 ring-offset-card' : ''}`}
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

      {/* 场景 3：拖拽冲突 → 是否覆盖 / 让算法找最佳位置 */}
      {conflictDialog && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center px-4" onClick={() => setConflictDialog(null)}>
          <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" />
          <div onClick={(e) => e.stopPropagation()}
               className="relative w-full max-w-[420px] bg-card border border-line rounded-xl shadow-card overflow-hidden">
            <div className="px-4 py-3 border-b border-line text-[14px] font-semibold flex items-center gap-2">
              ⚠️ <span>拖拽冲突</span>
            </div>
            <div className="px-4 py-3 text-[12.5px] text-ink-dim leading-7">
              此位置与 <b className="font-mono text-ink">{conflictDialog.conflictWith}</b> 冲突。
              <br />您可以选择覆盖原工单，或让算法为您找一个最佳位置。
            </div>
            <div className="px-4 py-3 bg-panel2 border-t border-line flex justify-end gap-2">
              <button className="btn" onClick={() => setConflictDialog(null)}>取消</button>
              <button
                className="btn btn-ai"
                disabled={aiSuggesting}
                onClick={onAIFindSlot}
              >
                {aiSuggesting ? <><span className="inline-block animate-spin">⟳</span> 计算中…</> : <>✨ 让算法找最佳位置</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { ROW_H };
