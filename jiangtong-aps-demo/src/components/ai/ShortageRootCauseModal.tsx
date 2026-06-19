// Agent #10 缺料根因分析报告
//   多因素分类列表 + 建议处置 + 下游影响
import { X, Sparkles, Loader2, ArrowRight } from 'lucide-react';
import type { ShortageRootCauseOutput } from '../../mock/agentResponses.sprint4';

interface Props {
  open: boolean;
  loading: boolean;
  output: ShortageRootCauseOutput | null;
  onClose: () => void;
  onAskAI: () => void;
}

const SEV_COLOR = {
  high:   'border-l-danger bg-red-50/60',
  medium: 'border-l-warn bg-amber-50/60',
  low:    'border-l-info bg-sky-50/60',
};
const SEV_TAG = {
  high:   'bg-danger text-white',
  medium: 'bg-warn text-white',
  low:    'bg-info text-white',
};

export default function ShortageRootCauseModal({ open, loading, output, onClose, onAskAI }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[680px] max-h-[86vh] bg-card border border-line rounded-xl shadow-card flex flex-col overflow-hidden animate-modal-in"
      >
        <div className="h-1 bg-gradient-to-r from-ai via-purple-500 to-pink-400" />
        <div className="flex items-center gap-2 px-5 py-3 border-b border-line">
          <span className="ai-chip">
            <Sparkles size={11} /> AI 分析
          </span>
          <h3 className="text-[14px] font-semibold">
            {output ? `${output.workOrderId} · 缺料根因分析` : '正在分析…'}
          </h3>
          <button onClick={onClose} className="ml-auto w-8 h-8 rounded-md hover:bg-bg flex items-center justify-center text-ink-faint">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {loading || !output ? (
            <div className="flex items-center justify-center gap-3 py-20 text-ai">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-[13.5px] font-medium">AI 多因素根因分析中…</span>
            </div>
          ) : (
            <div className="space-y-4 text-[12.5px]">
              <div className="rounded-md bg-panel2 px-4 py-2.5 leading-relaxed">
                <b className="text-ink">客户：</b>{output.customer} ·
                <b className="text-ink"> 缺料：</b>{output.missingMaterial}
              </div>

              <section>
                <div className="text-[10.5px] text-ink-faint tracking-wider uppercase mb-2">根因因素（{output.factors.length} 项）</div>
                <div className="space-y-2">
                  {output.factors.map((f, i) => (
                    <div
                      key={i}
                      className={`rounded-md border-l-4 ${SEV_COLOR[f.severity]} px-3 py-2 border border-line`}
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[12px] font-semibold text-ink">{f.category}</span>
                        <span className={`tag ${SEV_TAG[f.severity]}`}>
                          {f.severity === 'high' ? '高' : f.severity === 'medium' ? '中' : '低'}
                        </span>
                      </div>
                      <div className="text-[12px] text-ink-dim leading-relaxed">{f.detail}</div>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <div className="text-[10.5px] text-ink-faint tracking-wider uppercase mb-2">建议处置</div>
                <p className="text-[12.5px] text-ink leading-relaxed bg-ai-bg/60 rounded-md p-3 border-l-4 border-ai">
                  {output.recommendation}
                </p>
              </section>

              <section>
                <div className="text-[10.5px] text-ink-faint tracking-wider uppercase mb-2">
                  下游受影响工单（{output.downstreamImpact.length} 张）
                </div>
                <table className="w-full text-[12px]">
                  <thead className="text-[11px] text-ink-faint">
                    <tr className="text-left">
                      <th className="py-1.5 pr-2 font-medium">工单</th>
                      <th className="py-1.5 pr-2 font-medium">产品</th>
                      <th className="py-1.5 pr-2 font-medium text-right">预计延期</th>
                    </tr>
                  </thead>
                  <tbody>
                    {output.downstreamImpact.map((d) => (
                      <tr key={d.workOrderId} className="border-t border-line">
                        <td className="py-1.5 pr-2 font-mono text-[11.5px]">{d.workOrderId}</td>
                        <td className="py-1.5 pr-2 text-ink-dim">{d.product}</td>
                        <td className="py-1.5 pr-2 text-right tabular-nums text-warn font-semibold">{d.delayHours}h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </div>
          )}
        </div>
        {!loading && output && (
          <div className="p-3 border-t border-line bg-panel2 flex justify-end gap-2">
            <button onClick={onClose} className="btn">关闭</button>
            <button onClick={onAskAI} className="btn btn-ai">
              <Sparkles size={12} />追问 AI 助手 <ArrowRight size={12} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
