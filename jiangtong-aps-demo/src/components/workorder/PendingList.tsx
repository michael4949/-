// 左侧待排池：可搜索 + 优先级筛选 + HTML5 拖入甘特
//   ★ v2.2.1：绞线工单（stranded）醒目标识 + 置顶，便于演示 Agent #4 配股助手
import { useState } from 'react';
import { useScheduleStore } from '../../store/useScheduleStore';
import type { Priority, WorkOrder } from '../../types/workOrder';
import { Search, GripVertical, Sparkles } from 'lucide-react';
import { fmtDate } from '../../utils/format';
import { PRIORITY_LABEL } from '../../types/workOrder';

const PRIO_CLR: Record<Priority, string> = {
  urgent:    'border-l-danger bg-red-50/60',
  important: 'border-l-warn   bg-amber-50/60',
  normal:    'border-l-info   bg-sky-50/60',
};
const PRIO_TAG: Record<Priority, string> = {
  urgent: 'bg-danger text-white',
  important: 'bg-warn text-white',
  normal: 'bg-info text-white',
};

export default function PendingList() {
  const pending = useScheduleStore((s) => s.pending);
  const select = useScheduleStore((s) => s.select);
  const selectedId = useScheduleStore((s) => s.selectedId);
  const [q, setQ] = useState('');
  const [prio, setPrio] = useState<Priority | 'all'>('all');

  const list = pending.filter((w) => {
    if (prio !== 'all' && w.priority !== prio) return false;
    if (q) {
      const s = `${w.id} ${w.productName} ${w.customer}`.toLowerCase();
      if (!s.includes(q.toLowerCase())) return false;
    }
    return true;
  }).slice().sort((a, b) => {
    // ★ stranded 工单置顶（演示 Agent #4 配股助手入口）
    const aStr = a.productCategory === 'stranded' ? 0 : 1;
    const bStr = b.productCategory === 'stranded' ? 0 : 1;
    if (aStr !== bStr) return aStr - bStr;
    return 0;
  });
  const strandCount = pending.filter((w) => w.productCategory === 'stranded').length;

  function onDragStart(e: React.DragEvent, wo: WorkOrder) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/x-pending-wo', wo.id);
    e.dataTransfer.setData('text/plain', wo.id);
  }

  return (
    <div className="flex flex-col h-full bg-card border border-line rounded-xl overflow-hidden">
      <div className="p-3 border-b border-line space-y-2 bg-panel2">
        <div className="text-[12.5px] font-semibold flex items-center">
          待排池
          <span className="ml-auto text-[11px] text-ink-faint tabular-nums">共 {pending.length} 张</span>
        </div>
        {strandCount > 0 && (
          <div className="text-[10.5px] text-ai bg-ai-bg rounded-md px-2 py-1 inline-flex items-center gap-1">
            <Sparkles size={10} />{strandCount} 张绞线工单 · 选中可调用配股助手
          </div>
        )}
        <div className="relative">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="搜索工单/产品/客户"
            className="w-full h-8 pl-7 pr-3 rounded-md bg-card border border-line text-[12px] placeholder:text-ink-faint outline-none focus:border-brand"
          />
        </div>
        <div className="flex gap-1">
          {(['all','urgent','important','normal'] as const).map((p) => (
            <button key={p}
                    onClick={() => setPrio(p)}
                    className={`flex-1 h-7 rounded-md text-[11px] font-semibold border transition-colors
                                ${prio === p
                                  ? 'bg-brand-50 text-brand border-brand'
                                  : 'bg-card text-ink-dim border-line hover:border-line-soft'}`}>
              {p === 'all' ? '全部' : PRIORITY_LABEL[p]}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {list.map((wo) => {
          const isStranded = wo.productCategory === 'stranded';
          return (
          <div
            key={wo.id}
            draggable
            onDragStart={(e) => onDragStart(e, wo)}
            onClick={() => select(wo.id)}
            className={`group border-l-4 ${PRIO_CLR[wo.priority]} bg-card rounded-md px-2.5 py-1.5
                        cursor-grab active:cursor-grabbing select-none border border-line
                        hover:border-brand/60 transition-colors
                        ${selectedId === wo.id ? 'ring-2 ring-brand/40' : ''}
                        ${isStranded ? 'ring-1 ring-ai/40' : ''}`}
            title={isStranded ? '绞线工单 · 选中可调用 AI 配股助手' : '拖入甘特图排程'}
          >
            <div className="flex items-center gap-1.5">
              <GripVertical size={11} className="text-ink-faint opacity-0 group-hover:opacity-100" />
              <span className="font-mono text-[10.5px] text-ink-dim">{wo.id}</span>
              {isStranded && (
                <span className="tag bg-ai/15 text-ai inline-flex items-center gap-0.5"><Sparkles size={8} />配股</span>
              )}
              <span className={`tag ml-auto ${PRIO_TAG[wo.priority]}`}>{PRIORITY_LABEL[wo.priority]}</span>
            </div>
            <div className="text-[12px] font-medium leading-tight mt-0.5 truncate">{wo.productName}</div>
            <div className="text-[10.5px] text-ink-faint mt-0.5 flex items-center gap-2">
              <span>{wo.quantity}kg</span>
              <span>·</span>
              <span className="truncate">{wo.customer}</span>
              <span className="ml-auto text-ink-dim">交期 {fmtDate(wo.dueDate)}</span>
            </div>
          </div>
          );
        })}
        {list.length === 0 && (
          <div className="text-center text-ink-faint text-[12px] py-8">无匹配</div>
        )}
      </div>
    </div>
  );
}
