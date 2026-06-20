// 物料齐套页顶部 KPI 条
//   ★ v2.2.2：KPI 跟随 AI 一键准备实时变化（齐套率上升、缺料工单数下降）
import { SHORTAGE_KPI, SHORTAGE_LIST } from '../../mock/shortageList';
import { MATERIAL_KPI } from '../../mock/materialBatches';
import { useMaterialOpsStore } from '../../store/useMaterialOpsStore';

export default function MaterialKPIBar() {
  const preparedSize = useMaterialOpsStore((s) => s.preparedIds.size);
  // 每准备 1 张 → 齐套率 +1pp（演示，最高 99.5%）
  const kittingRate = Math.min(99.5, SHORTAGE_KPI.kittingRate + preparedSize * 1.0);
  const remaining = SHORTAGE_LIST.length - preparedSize;
  const highRemain = Math.max(0, SHORTAGE_KPI.high - preparedSize);

  const items = [
    { label: '齐套率',     value: `${kittingRate.toFixed(1)}%`,      tone: 'ok'   as const, delta: preparedSize > 0 ? `↑ ${preparedSize.toFixed(1)}pp` : '' },
    { label: '缺料工单',   value: remaining,                          tone: 'warn' as const, delta: preparedSize > 0 ? `↓ ${preparedSize}` : '' },
    { label: '齐套预警',   value: highRemain,                         tone: 'danger' as const, delta: '' },
    { label: '采购在途',   value: `${MATERIAL_KPI.inTransit} 笔`,    tone: 'info' as const, delta: '' },
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
          {it.delta && <span className="text-[10.5px] text-ok font-semibold tabular-nums">{it.delta}</span>}
        </div>
      ))}
    </div>
  );
}
