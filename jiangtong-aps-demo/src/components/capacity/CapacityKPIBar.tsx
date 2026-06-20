// 产能负荷分析页顶部 KPI 条
//   ★ v2.2.2：KPI 跟随 AI 缓解方案应用实时变化
import { CAPACITY_KPI } from '../../mock/capacityData';
import { useCapacityOpsStore } from '../../store/useCapacityOpsStore';

export default function CapacityKPIBar() {
  const resolved = useCapacityOpsStore((s) => s.resolvedBottlenecks);
  const bottleneckRemain = Math.max(0, CAPACITY_KPI.bottleneckCount - resolved.size);
  const overloadRemain = Math.max(0, CAPACITY_KPI.overloadedCount - resolved.size);

  const items = [
    { label: '整体利用率', value: `${CAPACITY_KPI.overall}%`,   tone: 'ink'    as const, delta: '' },
    { label: '瓶颈数',     value: bottleneckRemain,             tone: 'danger' as const, delta: resolved.size > 0 ? `↓ ${resolved.size}` : '' },
    { label: '空闲产线',   value: CAPACITY_KPI.idleCount,       tone: 'info'   as const, delta: '' },
    { label: '过载产线',   value: overloadRemain,               tone: 'warn'   as const, delta: resolved.size > 0 ? `↓ ${resolved.size}` : '' },
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
          {it.delta && <span className="text-[10.5px] text-ok font-semibold tabular-nums">{it.delta}</span>}
        </div>
      ))}
    </div>
  );
}
