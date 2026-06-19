// 库存锁定页顶部 KPI 条
import { LOCK_KPI } from '../../mock/lockRecords';
import { INVENTORY_CONFLICTS } from '../../mock/inventoryConflicts';
import { fmtMoney } from '../../utils/format';

export default function InventoryKPIBar() {
  const items = [
    { label: '锁定笔数',      value: LOCK_KPI.total,                          tone: 'ink'    as const },
    { label: '占用价值',      value: fmtMoney(LOCK_KPI.totalValue),           tone: 'brand'  as const },
    { label: '超期未开工',    value: LOCK_KPI.overdue,                        tone: 'warn'   as const },
    { label: '冲突待处理',    value: INVENTORY_CONFLICTS.filter((c) => c.severity !== 'low').length, tone: 'danger' as const },
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
        </div>
      ))}
    </div>
  );
}
