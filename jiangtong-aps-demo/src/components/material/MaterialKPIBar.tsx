// 物料齐套页顶部 KPI 条
import { SHORTAGE_KPI } from '../../mock/shortageList';
import { MATERIAL_KPI } from '../../mock/materialBatches';

export default function MaterialKPIBar() {
  const items = [
    { label: '齐套率',     value: `${SHORTAGE_KPI.kittingRate}%`,    tone: 'ok'   as const },
    { label: '缺料工单',   value: SHORTAGE_KPI.total,                tone: 'warn' as const },
    { label: '齐套预警',   value: SHORTAGE_KPI.high,                 tone: 'danger' as const },
    { label: '采购在途',   value: `${MATERIAL_KPI.inTransit} 笔`,    tone: 'info' as const },
  ];
  const toneCls = {
    ok: 'text-ok',
    warn: 'text-warn',
    danger: 'text-danger',
    info: 'text-info',
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
