// 库存锁定页：左侧锁定记录表
import { useMemo, useState } from 'react';
import { Lock, ChevronLeft, ChevronRight, AlertTriangle, RotateCw, Check, Sparkles } from 'lucide-react';
import { LOCK_RECORDS, LOCK_HEALTH_LABEL, type LockHealth } from '../../mock/lockRecords';
import { MATERIAL_KIND_LABEL } from '../../mock/materialBatches';
import { useInventoryOpsStore } from '../../store/useInventoryOpsStore';
import { fmtMoney, fmtDate } from '../../utils/format';

const PAGE_SIZE = 14;
const HEALTH_TAG: Record<LockHealth, string> = {
  healthy:  'bg-ok/15 text-ok',
  overdue:  'bg-warn/15 text-warn',
  flapping: 'bg-ai/15 text-ai',
};
const HEALTH_ICON: Record<LockHealth, JSX.Element> = {
  healthy:  <Check size={10} />,
  overdue:  <AlertTriangle size={10} />,
  flapping: <RotateCw size={10} />,
};

export default function LockRecordList() {
  const [page, setPage] = useState(0);
  const [healthFilter, setHealthFilter] = useState<'all' | LockHealth>('all');
  const releasedLockIds = useInventoryOpsStore((s) => s.releasedLockIds);

  const filtered = useMemo(() => {
    return LOCK_RECORDS.filter((r) => healthFilter === 'all' || r.health === healthFilter)
      .sort((a, b) => {
        const order: Record<LockHealth, number> = { overdue: 0, flapping: 1, healthy: 2 };
        if (a.health !== b.health) return order[a.health] - order[b.health];
        return b.daysSinceLocked - a.daysSinceLocked;
      });
  }, [healthFilter]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const items = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="card-base flex flex-col h-full min-h-0">
      <div className="px-4 py-3 border-b border-line bg-panel2 flex items-center gap-2">
        <Lock size={14} className="text-ai" />
        <span className="text-[13px] font-semibold">锁定记录</span>
        <div className="ml-3 flex gap-1">
          {(['all', 'overdue', 'flapping', 'healthy'] as const).map((h) => (
            <button
              key={h}
              onClick={() => { setHealthFilter(h); setPage(0); }}
              className={`text-[10.5px] px-2 py-1 rounded-md font-medium transition-colors
                          ${h === healthFilter ? 'bg-brand text-white' : 'bg-card border border-line text-ink-dim hover:border-brand'}`}
            >
              {h === 'all' ? '全部' : LOCK_HEALTH_LABEL[h]}
            </button>
          ))}
        </div>
        <span className="ml-auto text-[11.5px] text-ink-faint tabular-nums">共 {filtered.length} 笔</span>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-[12px]">
          <thead className="text-[11px] text-ink-faint sticky top-0 bg-panel2 z-10">
            <tr className="text-left">
              <th className="px-3 py-2 font-medium">工单</th>
              <th className="px-3 py-2 font-medium">物料</th>
              <th className="px-3 py-2 font-medium">批次</th>
              <th className="px-3 py-2 font-medium text-right">数量</th>
              <th className="px-3 py-2 font-medium text-right">价值</th>
              <th className="px-3 py-2 font-medium">锁定时间</th>
              <th className="px-3 py-2 font-medium">状态</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => {
              const isReleased = releasedLockIds.has(r.workOrderId);
              return (
              <tr key={r.id} className={`border-t border-line hover:bg-bg ${isReleased ? 'bg-ai-bg/30' : ''}`}>
                <td className="px-3 py-1.5 font-mono text-[11.5px] text-ink">{r.workOrderId}</td>
                <td className="px-3 py-1.5 text-ink-dim">{MATERIAL_KIND_LABEL[r.materialKind]}</td>
                <td className="px-3 py-1.5 font-mono text-[11px] text-ink-dim truncate max-w-[150px]">{r.materialBatchId}</td>
                <td className="px-3 py-1.5 text-right tabular-nums text-ink">{r.quantity}{r.unit}</td>
                <td className="px-3 py-1.5 text-right tabular-nums text-ink-dim">{fmtMoney(r.value)}</td>
                <td className="px-3 py-1.5 text-ink-dim tabular-nums">{fmtDate(r.lockedAt)} <span className="text-ink-faint">({r.daysSinceLocked}天)</span></td>
                <td className="px-3 py-1.5">
                  {isReleased ? (
                    <span className="tag inline-flex items-center gap-0.5 bg-ai/15 text-ai">
                      <Sparkles size={10} />已调解
                    </span>
                  ) : (
                    <span className={`tag inline-flex items-center gap-0.5 ${HEALTH_TAG[r.health]}`}>
                      {HEALTH_ICON[r.health]} {LOCK_HEALTH_LABEL[r.health]}
                      {r.health === 'flapping' && r.reLockCount && <span className="ml-0.5">x{r.reLockCount}</span>}
                    </span>
                  )}
                </td>
              </tr>
              );
            })}
            {items.length === 0 && (
              <tr><td colSpan={7} className="text-center text-ink-faint py-10 text-[12.5px]">无匹配记录</td></tr>
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
