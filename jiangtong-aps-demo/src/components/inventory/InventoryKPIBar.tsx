// 库存锁定页顶部 KPI 条
//   ★ v2.2.2：KPI 跟随 AI 调解实时变化
import { LOCK_KPI } from '../../mock/lockRecords';
import { INVENTORY_CONFLICTS } from '../../mock/inventoryConflicts';
import { useInventoryOpsStore } from '../../store/useInventoryOpsStore';
import { fmtMoney } from '../../utils/format';

export default function InventoryKPIBar() {
  const resolved = useInventoryOpsStore((s) => s.resolvedConflicts);
  const pendingConflicts = INVENTORY_CONFLICTS.filter((c) => c.severity !== 'low' && !resolved.has(c.id)).length;
  const totalPendingHigh = INVENTORY_CONFLICTS.filter((c) => c.severity !== 'low').length;

  const items = [
    { label: '锁定笔数',      value: LOCK_KPI.total,                          tone: 'ink'    as const, delta: '' },
    { label: '占用价值',      value: fmtMoney(LOCK_KPI.totalValue),           tone: 'brand'  as const, delta: '' },
    { label: '超期未开工',    value: LOCK_KPI.overdue,                        tone: 'warn'   as const, delta: '' },
    { label: '冲突待处理',    value: pendingConflicts,                        tone: 'danger' as const, delta: resolved.size > 0 ? `↓ ${resolved.size}/${totalPendingHigh}` : '' },
  ];
  const toneCls = {
    ink: 'text-ink',
    brand: 'text-brand',
    warn: 'text-warn',
    danger: 'text-danger',
  };
  return (
    <div className="card-base p-3 grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((it) => (
        <div key={it.label} className="flex items-baseline gap-2">
          <span className="text-[11.5px] text-ink-faint">{it.label}</span>
          <span className={`ml-auto text-[18px] font-bold tabular-nums ${toneCls[it.tone]}`}>{it.value}</span>
          {it.delta && <span className="text-[10.5px] text-ok font-semibold tabular-nums">{it.delta}</span>}
        </div>
      ))}
    </div>
  );
}
