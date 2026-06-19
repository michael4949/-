// 物料齐套页：右侧物料批次状态
import { Boxes, Package, Truck, Lock } from 'lucide-react';
import { MATERIAL_BATCHES, MATERIAL_KIND_LABEL, MATERIAL_STATUS_LABEL, type MaterialBatch } from '../../mock/materialBatches';

const STATUS_ICON = {
  available: <Package size={11} className="text-ok" />,
  locked:    <Lock size={11} className="text-warn" />,
  reserved:  <Lock size={11} className="text-ai" />,
  'in-transit': <Truck size={11} className="text-info" />,
};
const STATUS_CLR: Record<MaterialBatch['status'], string> = {
  available: 'text-ok',
  locked: 'text-warn',
  reserved: 'text-ai',
  'in-transit': 'text-info',
};

export default function MaterialBatchPanel() {
  const groups: MaterialBatch['kind'][] = ['copper-rod', 'paint', 'tin', 'lubricant'];
  return (
    <div className="card-base flex flex-col h-full min-h-0">
      <div className="px-4 py-3 border-b border-line bg-panel2 flex items-center">
        <Boxes size={14} className="text-info mr-1.5" />
        <span className="text-[13px] font-semibold">物料批次</span>
        <span className="ml-auto text-[11.5px] text-ink-faint tabular-nums">共 {MATERIAL_BATCHES.length} 批</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {groups.map((g) => {
          const items = MATERIAL_BATCHES.filter((b) => b.kind === g);
          if (items.length === 0) return null;
          return (
            <section key={g}>
              <div className="text-[11px] text-ink-faint tracking-wider uppercase mb-1.5">
                {MATERIAL_KIND_LABEL[g]}（{items.length}）
              </div>
              <div className="space-y-1">
                {items.map((b) => (
                  <div key={b.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-panel2 hover:bg-bg transition-colors">
                    {STATUS_ICON[b.status]}
                    <span className="font-mono text-[10.5px] text-ink">{b.id}</span>
                    <span className="text-[11.5px] text-ink-dim truncate flex-1">{b.spec}</span>
                    <span className="text-[11.5px] tabular-nums font-semibold text-ink">
                      {b.quantity}{b.unit === 't' ? 't' : b.unit === 'kg' ? 'kg' : 'L'}
                    </span>
                    <span className={`text-[10px] font-semibold ${STATUS_CLR[b.status]} min-w-[36px] text-right`}>
                      {MATERIAL_STATUS_LABEL[b.status]}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
