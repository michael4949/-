// 异常预警中心：事件列表
import { useMemo, useState } from 'react';
import { Sparkles, ChevronLeft, ChevronRight, ChevronDown, ArrowDown, X as IconX, Check } from 'lucide-react';
import {
  ALERT_EVENTS, ALERT_TYPE_COLOR, ALERT_LEVEL_LABEL, ALERT_LEVEL_COLOR,
  ALERT_STATUS_LABEL,
  type AlertType, type AlertLevel, type AlertStatus, type AlertEvent,
} from '../../mock/alerts';
import { useAlertOpsStore } from '../../store/useAlertOpsStore';
import { fmtDateTime } from '../../utils/format';

interface Props {
  onExplain: (event: AlertEvent) => void;
}

type TypeFilter = 'all' | AlertType;
type LevelFilter = 'all' | AlertLevel;
type StatusFilter = 'all' | AlertStatus;

const PAGE_SIZE = 12;

const TYPE_OPTIONS: { v: TypeFilter; label: string }[] = [
  { v: 'all',   label: '全部' },
  { v: '缺料',  label: '缺料' },
  { v: '延期',  label: '延期' },
  { v: '产能',  label: '产能' },
  { v: '损耗',  label: '损耗' },
  { v: '质量',  label: '质量' },
  { v: '设备',  label: '设备' },
];
const LEVEL_OPTIONS: { v: LevelFilter; label: string }[] = [
  { v: 'all',       label: '全部' },
  { v: 'urgent',    label: '紧急' },
  { v: 'important', label: '重要' },
  { v: 'info',      label: '提示' },
];
const STATUS_OPTIONS: { v: StatusFilter; label: string }[] = [
  { v: 'all',       label: '全部' },
  { v: 'unhandled', label: '未处理' },
  { v: 'handling',  label: '处理中' },
  { v: 'resolved',  label: '已处理' },
];

export default function AlertEventTable({ onExplain }: Props) {
  const [typeF, setTypeF] = useState<TypeFilter>('all');
  const [levelF, setLevelF] = useState<LevelFilter>('all');
  const [statusF, setStatusF] = useState<StatusFilter>('unhandled');
  const [page, setPage] = useState(0);
  const [openMenu, setOpenMenu] = useState<'type' | 'level' | 'status' | null>(null);
  const downgradedKeys = useAlertOpsStore((s) => s.downgradedKeys);
  const dismissedIds = useAlertOpsStore((s) => s.dismissedIds);
  const explainedIds = useAlertOpsStore((s) => s.explainedIds);
  const dismissAlert = useAlertOpsStore((s) => s.dismissAlert);

  // 预警实时状态：根据 noise filter 应用结果，把某些 info 级降为已忽略
  const effective = useMemo(() => {
    return ALERT_EVENTS.map((a) => {
      // 如果该类型 + 等级被过滤 → 视为已忽略
      const filtered = downgradedKeys.has(`${a.type}:${a.level}`);
      const dismissed = dismissedIds.has(a.id);
      const status: AlertStatus = (filtered || dismissed) ? 'ignored' : a.status;
      const level: AlertLevel = filtered && a.level !== 'info' ? 'info' : a.level;
      return { ...a, status, level, _filtered: filtered, _dismissed: dismissed };
    });
  }, [downgradedKeys, dismissedIds]);

  const filtered = useMemo(() => {
    return effective
      .filter((a) => typeF === 'all' || a.type === typeF)
      .filter((a) => levelF === 'all' || a.level === levelF)
      .filter((a) => statusF === 'all' || a.status === statusF)
      .sort((a, b) => {
        const lvOrder: Record<AlertLevel, number> = { urgent: 0, important: 1, info: 2 };
        if (a.level !== b.level) return lvOrder[a.level] - lvOrder[b.level];
        return b.at.getTime() - a.at.getTime();
      });
  }, [effective, typeF, levelF, statusF]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const items = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="card-base flex flex-col flex-1 min-h-0">
      <div className="flex items-center gap-2 p-3 border-b border-line flex-wrap">
        <Dropdown label={`类型：${TYPE_OPTIONS.find((o) => o.v === typeF)?.label}`} open={openMenu === 'type'} onToggle={() => setOpenMenu(openMenu === 'type' ? null : 'type')}>
          {TYPE_OPTIONS.map((opt) => (
            <button key={opt.v} onClick={() => { setTypeF(opt.v); setPage(0); setOpenMenu(null); }} className={`w-full text-left px-3 py-1.5 text-[12.5px] hover:bg-bg ${opt.v === typeF ? 'text-brand font-semibold' : ''}`}>
              {opt.label}
            </button>
          ))}
        </Dropdown>
        <Dropdown label={`优先级：${LEVEL_OPTIONS.find((o) => o.v === levelF)?.label}`} open={openMenu === 'level'} onToggle={() => setOpenMenu(openMenu === 'level' ? null : 'level')}>
          {LEVEL_OPTIONS.map((opt) => (
            <button key={opt.v} onClick={() => { setLevelF(opt.v); setPage(0); setOpenMenu(null); }} className={`w-full text-left px-3 py-1.5 text-[12.5px] hover:bg-bg ${opt.v === levelF ? 'text-brand font-semibold' : ''}`}>
              {opt.label}
            </button>
          ))}
        </Dropdown>
        <Dropdown label={`状态：${STATUS_OPTIONS.find((o) => o.v === statusF)?.label}`} open={openMenu === 'status'} onToggle={() => setOpenMenu(openMenu === 'status' ? null : 'status')}>
          {STATUS_OPTIONS.map((opt) => (
            <button key={opt.v} onClick={() => { setStatusF(opt.v); setPage(0); setOpenMenu(null); }} className={`w-full text-left px-3 py-1.5 text-[12.5px] hover:bg-bg ${opt.v === statusF ? 'text-brand font-semibold' : ''}`}>
              {opt.label}
            </button>
          ))}
        </Dropdown>
        <span className="ml-auto text-[11.5px] text-ink-faint tabular-nums">
          共 {filtered.length} 条 · 第 {page + 1}/{totalPages} 页
        </span>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-[12.5px]">
          <thead className="text-[11.5px] text-ink-faint sticky top-0 bg-panel2 z-10">
            <tr className="text-left">
              <th className="px-3 py-2 font-medium">时间</th>
              <th className="px-3 py-2 font-medium">类型</th>
              <th className="px-3 py-2 font-medium">等级</th>
              <th className="px-3 py-2 font-medium">内容</th>
              <th className="px-3 py-2 font-medium">关联</th>
              <th className="px-3 py-2 font-medium">状态</th>
              <th className="px-3 py-2 font-medium text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((a) => {
              const lvDot = a.level === 'urgent' ? '🔴' : a.level === 'important' ? '🟠' : '🟡';
              const wasDowngraded = a._filtered;
              const wasExplained = explainedIds.has(a.id);
              return (
                <tr key={a.id} className={`border-t border-line hover:bg-bg ${wasDowngraded ? 'bg-ai-bg/30' : ''}`}>
                  <td className="px-3 py-1.5 text-ink-dim tabular-nums whitespace-nowrap">{fmtDateTime(a.at)}</td>
                  <td className="px-3 py-1.5">
                    <span className={`tag ${ALERT_TYPE_COLOR[a.type].tag}`}>{a.type}</span>
                  </td>
                  <td className="px-3 py-1.5 whitespace-nowrap">
                    <span className={`text-[12px] font-semibold ${ALERT_LEVEL_COLOR[a.level]}`}>
                      {lvDot} {ALERT_LEVEL_LABEL[a.level]}
                    </span>
                    {wasDowngraded && <span className="ml-1 text-[10px] text-ai">↓AI</span>}
                  </td>
                  <td className="px-3 py-1.5 text-ink truncate max-w-[400px]" title={a.title}>{a.title}</td>
                  <td className="px-3 py-1.5 text-ink-dim text-[11.5px] whitespace-nowrap">{a.source ?? '-'}</td>
                  <td className="px-3 py-1.5 text-ink-dim">
                    {ALERT_STATUS_LABEL[a.status]}
                    {wasExplained && <span className="ml-1 text-ok text-[10px]">✓已分析</span>}
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => onExplain(a)}
                        className="btn btn-sm btn-ai"
                        title="AI 归因分析"
                      >
                        <Sparkles size={11} />AI 归因
                      </button>
                      {a.status === 'unhandled' && (
                        <button
                          onClick={() => dismissAlert(a.id)}
                          className="btn btn-sm"
                          title="忽略该预警（从未处理列表移除）"
                        >
                          <IconX size={11} />忽略
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr><td colSpan={7} className="text-center text-ink-faint py-10 text-[12.5px]">无匹配预警</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-end gap-1 px-3 py-2 border-t border-line bg-panel2">
        <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="btn btn-sm">
          <ChevronLeft size={13} />上一页
        </button>
        <span className="text-[11.5px] text-ink-faint tabular-nums px-2">第 {page + 1} / {totalPages} 页</span>
        <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="btn btn-sm">
          下一页<ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}

function Dropdown({ label, open, onToggle, children }: { label: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="relative">
      <button onClick={onToggle} className="btn btn-sm">
        {label}<ChevronDown size={12} />
      </button>
      {open && (
        <div className="absolute left-0 mt-1 w-44 bg-card border border-line rounded-md shadow-card py-1 z-30 max-h-80 overflow-y-auto">
          {children}
        </div>
      )}
    </div>
  );
}
