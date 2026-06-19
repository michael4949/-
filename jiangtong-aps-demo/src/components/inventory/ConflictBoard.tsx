// 库存锁定页：右侧抢料冲突看板
//   每条冲突卡：物料 + 多工单争抢 + ✨ AI 调解按钮
import { Flame } from 'lucide-react';
import { INVENTORY_CONFLICTS, type InventoryConflict } from '../../mock/inventoryConflicts';
import { PRIORITY_LABEL, type Priority } from '../../types/workOrder';
import AIButton from '../ai/AIButton';

interface Props {
  onMediate: (conflict: InventoryConflict) => void;
  resolvedIds: string[];
}

const SEV_COLOR: Record<InventoryConflict['severity'], string> = {
  high: 'border-l-danger bg-red-50/60',
  medium: 'border-l-warn bg-amber-50/60',
  low: 'border-l-info bg-sky-50/60',
};
const PRIO_DOT: Record<Priority, string> = {
  urgent: 'bg-danger',
  important: 'bg-warn',
  normal: 'bg-info',
};

export default function ConflictBoard({ onMediate, resolvedIds }: Props) {
  return (
    <div className="card-base flex flex-col h-full min-h-0">
      <div className="px-4 py-3 border-b border-line bg-panel2 flex items-center">
        <Flame size={14} className="text-danger mr-1.5" />
        <span className="text-[13px] font-semibold">冲突看板</span>
        <span className="ml-auto text-[11.5px] text-ink-faint tabular-nums">
          {INVENTORY_CONFLICTS.length - resolvedIds.length} / {INVENTORY_CONFLICTS.length} 待处理
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
        {INVENTORY_CONFLICTS.map((c) => {
          const resolved = resolvedIds.includes(c.id);
          return (
            <div
              key={c.id}
              className={`border-l-4 ${SEV_COLOR[c.severity]} bg-card rounded-md px-3 py-2 border border-line
                          ${resolved ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Flame size={11} className={c.severity === 'high' ? 'text-danger' : c.severity === 'medium' ? 'text-warn' : 'text-info'} />
                <span className="text-[11.5px] font-semibold text-ink">{c.id}</span>
                <span className="ml-auto font-mono text-[10.5px] text-ink-dim">{c.materialBatchId}</span>
              </div>
              <div className="text-[12px] text-ink mb-1.5">{c.materialSpec}</div>
              <div className="text-[10.5px] text-ink-faint mb-2 flex items-center gap-2">
                <span>可用 <b className="tabular-nums text-ink">{c.available}{c.unit}</b></span>
                {c.gap > 0 && <span className="text-danger">· 缺口 <b className="tabular-nums">{c.gap}{c.unit}</b></span>}
              </div>
              <div className="space-y-1 mb-2">
                {c.competitors.map((cp) => (
                  <div key={cp.workOrderId} className="text-[10.5px] flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full flex-none ${PRIO_DOT[cp.priority]}`} />
                    <span className="font-mono text-[10px] text-ink-dim">{cp.workOrderId}</span>
                    <span className="text-ink-dim truncate flex-1">{cp.customer}</span>
                    <span className="text-ink-faint">{PRIORITY_LABEL[cp.priority]}</span>
                    <span className="tabular-nums font-semibold text-ink">{cp.required}{c.unit}</span>
                  </div>
                ))}
              </div>
              {resolved ? (
                <div className="text-[10.5px] text-ok font-semibold">✓ 已应用 AI 调解方案</div>
              ) : (
                <AIButton size="sm" label="AI 调解" onClick={() => onMediate(c)} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
