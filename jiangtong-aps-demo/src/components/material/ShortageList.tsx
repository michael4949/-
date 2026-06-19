// 物料齐套页：左侧缺料工单清单 + ✨ AI 根因分析按钮
import { AlertTriangle } from 'lucide-react';
import { SHORTAGE_LIST, type ShortageItem } from '../../mock/shortageList';
import AIButton from '../ai/AIButton';

interface Props {
  onAnalyze: (item: ShortageItem) => void;
}

const SEV_COLOR: Record<ShortageItem['severity'], string> = {
  high: 'border-l-danger bg-red-50/60',
  medium: 'border-l-warn bg-amber-50/60',
  low: 'border-l-info bg-sky-50/60',
};
const SEV_TAG: Record<ShortageItem['severity'], string> = {
  high: 'bg-danger text-white',
  medium: 'bg-warn text-white',
  low: 'bg-info text-white',
};
const SEV_LABEL: Record<ShortageItem['severity'], string> = {
  high: '紧急',
  medium: '关注',
  low: '提示',
};

export default function ShortageList({ onAnalyze }: Props) {
  return (
    <div className="card-base flex flex-col h-full min-h-0">
      <div className="px-4 py-3 border-b border-line bg-panel2 flex items-center">
        <AlertTriangle size={14} className="text-warn mr-1.5" />
        <span className="text-[13px] font-semibold">缺料工单</span>
        <span className="ml-auto text-[11.5px] text-ink-faint tabular-nums">共 {SHORTAGE_LIST.length} 张</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {SHORTAGE_LIST.map((s) => (
          <div
            key={s.workOrderId}
            className={`border-l-4 ${SEV_COLOR[s.severity]} bg-card rounded-md px-3 py-2 border border-line`}
          >
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-mono text-[11.5px] text-ink">{s.workOrderId}</span>
              <span className={`tag ${SEV_TAG[s.severity]}`}>{SEV_LABEL[s.severity]}</span>
              <span className="ml-auto text-[10.5px] text-ink-faint">预计齐套 {s.estimatedReadyDate.slice(5)}</span>
            </div>
            <div className="text-[12px] text-ink font-medium truncate">{s.productName}</div>
            <div className="text-[11px] text-ink-faint mt-0.5">客户：{s.customer}</div>
            <div className="mt-1.5 space-y-0.5">
              {s.missingMaterials.map((m, i) => (
                <div key={i} className="text-[11.5px] text-ink-dim flex items-center gap-2">
                  <span className="text-warn">▪</span>
                  <span>缺{m.spec}</span>
                  <span className="ml-auto tabular-nums font-semibold text-warn">{m.gap}{m.unit}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 flex">
              <AIButton size="sm" label="AI 根因分析" onClick={() => onAnalyze(s)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
