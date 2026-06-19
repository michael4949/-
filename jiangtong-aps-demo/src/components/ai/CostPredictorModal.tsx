// Agent #23 成本预测 Modal
//   左：成本构成饼图 + 影响因素列表
//   右：单位成本 + 毛利 + 敏感性分析
import { X, Sparkles, Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import type { CostPredictorOutput } from '../../mock/agentResponses.sprint6';
import { fmtMoney } from '../../utils/format';

interface Props {
  open: boolean;
  loading: boolean;
  output: CostPredictorOutput | null;
  onClose: () => void;
}

export default function CostPredictorModal({ open, loading, output, onClose }: Props) {
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
          <span className="ai-chip"><Sparkles size={11} /> AI 预测</span>
          <h3 className="text-[14px] font-semibold">
            {output ? `${output.workOrderId} · 成本预测` : '预测中…'}
          </h3>
          <button onClick={onClose} className="ml-auto w-8 h-8 rounded-md hover:bg-bg flex items-center justify-center text-ink-faint">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {loading || !output ? (
            <div className="flex items-center justify-center gap-3 py-20 text-ai">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-[13.5px] font-medium">AI 基于铜价 + 加工费 + 损耗率预测中…</span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 关键预测结果 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <ResultCard label="单位成本" value={`¥${output.prediction.unitCostPerTon.toLocaleString()}`} subLabel="/吨" tone="brand" />
                <ResultCard label="毛利率" value={`${output.prediction.grossMarginPct}%`} tone="ok" />
                <ResultCard label="预计总成本" value={fmtMoney(output.prediction.totalCost)} subLabel={`数量 ${output.quantity}kg`} tone="ink" />
              </div>

              {/* 产品信息 */}
              <div className="bg-panel2 rounded-md px-4 py-2.5 text-[12.5px] leading-relaxed">
                <b className="text-ink">订单：</b>{output.customer} · {output.productName} · {output.quantity}kg
                <span className="ml-3 text-ink-faint">总收入 {fmtMoney(output.prediction.totalRevenue)}</span>
              </div>

              <div className="grid grid-cols-[1fr_1fr] gap-5">
                {/* 成本构成 */}
                <section>
                  <div className="text-[10.5px] text-ink-faint tracking-wider uppercase mb-2">成本构成</div>
                  <div className="space-y-1.5">
                    {output.components.map((c, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11.5px]">
                        <span className="w-3 h-3 rounded-sm flex-none" style={{ background: c.color }} />
                        <span className="text-ink-dim flex-1">{c.name}</span>
                        <span className="text-ink-faint tabular-nums w-16 text-right">¥{c.value.toLocaleString()}</span>
                        <span className="text-ink font-semibold tabular-nums w-12 text-right">{c.pct}%</span>
                      </div>
                    ))}
                  </div>
                  {/* 简易饼条形可视化 */}
                  <div className="mt-2 h-2 flex rounded overflow-hidden">
                    {output.components.map((c, i) => (
                      <div key={i} title={`${c.name} ${c.pct}%`} style={{ background: c.color, width: `${c.pct}%` }} />
                    ))}
                  </div>
                </section>

                {/* 影响因素 */}
                <section>
                  <div className="text-[10.5px] text-ink-faint tracking-wider uppercase mb-2">影响因素</div>
                  <div className="space-y-1.5">
                    {output.factors.map((f, i) => (
                      <div key={i} className="text-[11.5px] border-b border-line/60 pb-1.5">
                        <div className="flex items-center">
                          <span className="text-ink-dim flex-1">{f.key}</span>
                          <span className="text-ink font-semibold tabular-nums">{f.value}</span>
                        </div>
                        {f.note && <div className="text-[10.5px] text-ink-faint">{f.note}</div>}
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              {/* 敏感性分析 */}
              <section>
                <div className="text-[10.5px] text-ink-faint tracking-wider uppercase mb-2">敏感性分析</div>
                <div className="space-y-1.5">
                  {output.sensitivity.map((s, i) => (
                    <div key={i} className="flex items-center gap-3 text-[12px] bg-panel2 rounded-md px-3 py-2">
                      {s.isPositive
                        ? <TrendingUp size={13} className="text-ok flex-none" />
                        : <TrendingDown size={13} className="text-danger flex-none" />}
                      <span className="text-ink-dim flex-1">{s.factor}</span>
                      <span className={`font-semibold ${s.isPositive ? 'text-ok' : 'text-danger'}`}>{s.impact}</span>
                    </div>
                  ))}
                </div>
              </section>

              <div className="text-[11px] text-ink-faint border-t border-line pt-2">
                💡 预测基于当前铜价与排产方案，铜价波动 ±1% 会带来 ±0.7% 毛利率变化
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultCard({ label, value, subLabel, tone }: { label: string; value: string; subLabel?: string; tone: 'brand' | 'ok' | 'ink' }) {
  const cls = tone === 'brand' ? 'text-brand' : tone === 'ok' ? 'text-ok' : 'text-ink';
  return (
    <div className="card-base p-3 text-center">
      <div className="text-[11px] text-ink-faint mb-1">{label}</div>
      <div className={`text-[20px] font-bold tabular-nums ${cls}`}>{value}</div>
      {subLabel && <div className="text-[10.5px] text-ink-faint mt-0.5">{subLabel}</div>}
    </div>
  );
}
