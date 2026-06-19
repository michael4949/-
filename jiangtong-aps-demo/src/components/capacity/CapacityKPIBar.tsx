// 产能负荷分析页顶部 KPI 条
import { CAPACITY_KPI } from '../../mock/capacityData';

export default function CapacityKPIBar() {
  const items = [
    { label: '整体利用率', value: `${CAPACITY_KPI.overall}%`,   tone: 'ink'    as const },
    { label: '瓶颈数',     value: CAPACITY_KPI.bottleneckCount, tone: 'danger' as const },
    { label: '空闲产线',   value: CAPACITY_KPI.idleCount,       tone: 'info'   as const },
    { label: '过载产线',   value: CAPACITY_KPI.overloadedCount, tone: 'warn'   as const },
  ];
  const toneCls = {
    ink: 'text-ink',
    danger: 'text-danger',
    info: 'text-info',
    warn: 'text-warn',
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
