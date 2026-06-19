// Agent #15 缓解方案 Modal
//   3 方案对比卡（与 InsertSchemeCard 风格一致）：指标变化柱 + 代价 + 推荐角标
import { X, Sparkles, Loader2, Check, Crown, Lightbulb } from 'lucide-react';
import type { MitigationGeneratorOutput, MitigationPlan } from '../../mock/agentResponses.sprint5';

interface Props {
  open: boolean;
  loading: boolean;
  output: MitigationGeneratorOutput | null;
  onClose: () => void;
  onApply: (plan: MitigationPlan) => void;
  appliedId?: string | null;
}

export default function MitigationGeneratorModal({ open, loading, output, onClose, onApply, appliedId }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[860px] max-h-[88vh] bg-card border border-line rounded-xl shadow-card flex flex-col overflow-hidden animate-modal-in"
      >
        <div className="h-1 bg-gradient-to-r from-ai via-purple-500 to-pink-400" />
        <div className="flex items-center gap-2 px-5 py-3 border-b border-line">
          <span className="ai-chip"><Sparkles size={11} /> AI 生成</span>
          <h3 className="text-[14px] font-semibold">
            {output ? `${output.resourceName} · 缓解方案` : '生成缓解方案中…'}
          </h3>
          <button onClick={onClose} className="ml-auto w-8 h-8 rounded-md hover:bg-bg flex items-center justify-center text-ink-faint">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {loading || !output ? (
            <div className="flex items-center justify-center gap-3 py-20 text-ai">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-[13.5px] font-medium">AI 多目标优化缓解方案中…</span>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-md bg-panel2 px-4 py-2.5 text-[12.5px] leading-relaxed">
                <Lightbulb size={12} className="inline mr-1 text-warn" />
                <span className="text-ink-dim">{output.bottleneckSummary}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {output.plans.map((p) => {
                  const applied = appliedId === p.id;
                  return (
                    <div
                      key={p.id}
                      className={`relative rounded-lg border p-3
                                  ${p.recommended ? 'border-ai shadow-[0_0_0_1px_rgba(124,58,237,0.2)]' : 'border-line'}
                                  ${applied ? 'ring-2 ring-ok ring-offset-1 ring-offset-card' : ''}`}
                    >
                      {p.recommended && (
                        <span className="absolute -top-2.5 right-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-white bg-ai rounded px-1.5 py-0.5">
                          <Crown size={10} /> AI 推荐
                        </span>
                      )}
                      <div className="text-[13px] font-semibold mb-2">{p.label}</div>
                      <div className="text-[11.5px] text-ink-dim mb-3 leading-relaxed">{p.detail}</div>
                      <div className="space-y-1.5 mb-3">
                        {p.metrics.map((m, i) => (
                          <div key={i} className="text-[10.5px]">
                            <div className="flex items-baseline">
                              <span className="text-ink-faint">{m.key}</span>
                              <span className="ml-auto tabular-nums text-ink-dim">{m.before} →
                                <b className={`ml-1 ${m.isGood ? 'text-ok' : 'text-warn'}`}>{m.after}</b>
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="text-[11px] text-ink-faint mb-2 pt-2 border-t border-line">
                        代价：{p.cost}
                      </div>
                      <button
                        onClick={() => onApply(p)}
                        disabled={applied}
                        className={`btn btn-sm w-full justify-center
                                    ${applied ? 'bg-ok text-white border-ok hover:bg-ok hover:text-white' : 'btn-ai'}`}
                      >
                        {applied ? <><Check size={12} />已应用</> : '应用此方案'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
