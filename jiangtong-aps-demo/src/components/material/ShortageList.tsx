// 物料齐套页：左侧缺料工单清单 + ✨ AI 根因分析按钮 + ✨ AI 一键准备
//   ★ v2.2.2：加「AI 准备」交互 — 应用后该工单从风险列表移除 + 齐套率 KPI 上升
import { AlertTriangle, Check, Wand2 } from 'lucide-react';
import { SHORTAGE_LIST, type ShortageItem } from '../../mock/shortageList';
import { useMaterialOpsStore } from '../../store/useMaterialOpsStore';
import AIButton from '../ai/AIButton';

interface Props {
  onAnalyze: (item: ShortageItem) => void;
  onPrepare: (item: ShortageItem) => void;
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

export default function ShortageList({ onAnalyze, onPrepare }: Props) {
  const preparedIds = useMaterialOpsStore((s) => s.preparedIds);
  const remaining = SHORTAGE_LIST.filter((s) => !preparedIds.has(s.workOrderId));
  return (
    <div className="card-base flex flex-col h-full min-h-0">
      <div className="px-4 py-3 border-b border-line bg-panel2 flex items-center">
        <AlertTriangle size={14} className="text-warn mr-1.5" />
        <span className="text-[13px] font-semibold">缺料工单</span>
        <span className="ml-auto text-[11.5px] text-ink-faint tabular-nums">
          待处理 {remaining.length} / 共 {SHORTAGE_LIST.length}
          {preparedIds.size > 0 && <span className="ml-1 text-ok">· AI 已准备 {preparedIds.size}</span>}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {SHORTAGE_LIST.map((s) => {
          const prepared = preparedIds.has(s.workOrderId);
          return (
            <div
              key={s.workOrderId}
              className={`border-l-4 ${prepared ? 'border-l-ok bg-ok/5' : SEV_COLOR[s.severity]} bg-card rounded-md px-3 py-2 border border-line transition-all`}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-mono text-[11.5px] text-ink">{s.workOrderId}</span>
                {prepared ? (
                  <span className="tag bg-ok text-white inline-flex items-center gap-0.5"><Check size={9} />AI 已准备</span>
                ) : (
                  <span className={`tag ${SEV_TAG[s.severity]}`}>{SEV_LABEL[s.severity]}</span>
                )}
                <span className="ml-auto text-[10.5px] text-ink-faint">
                  {prepared ? '✓ 预计齐套提前至 ' : '预计齐套 '}{s.estimatedReadyDate.slice(5)}
                </span>
              </div>
              <div className={`text-[12px] font-medium truncate ${prepared ? 'text-ink-dim line-through' : 'text-ink'}`}>{s.productName}</div>
              <div className="text-[11px] text-ink-faint mt-0.5">客户：{s.customer}</div>
              {!prepared && (
                <div className="mt-1.5 space-y-0.5">
                  {s.missingMaterials.map((m, i) => (
                    <div key={i} className="text-[11.5px] text-ink-dim flex items-center gap-2">
                      <span className="text-warn">▪</span>
                      <span>缺{m.spec}</span>
                      <span className="ml-auto tabular-nums font-semibold text-warn">{m.gap}{m.unit}</span>
                    </div>
                  ))}
                </div>
              )}
              {prepared && (
                <div className="mt-1.5 text-[11px] text-ok leading-relaxed">
                  ✓ AI 已自动协调替代批次 / 触发紧急采购 / 调高安全库存
                </div>
              )}
              {!prepared && (
                <div className="mt-2 flex gap-1.5">
                  <AIButton size="sm" label="AI 根因分析" onClick={() => onAnalyze(s)} />
                  <button onClick={() => onPrepare(s)} className="btn btn-sm btn-ai" title="一键应用 AI 准备建议">
                    <Wand2 size={10} />AI 一键准备
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
