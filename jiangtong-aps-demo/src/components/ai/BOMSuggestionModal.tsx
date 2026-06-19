// Agent #8 BOM 草稿 Modal
//   左侧：BOM 表（主料 / 辅料）+ 工艺路径
//   右侧：推理依据 + 相似工单引用
import { X, Sparkles, Loader2, Save, Route as RouteIcon, Boxes } from 'lucide-react';
import type { BOMSuggestionOutput } from '../../mock/agentResponses.sprint4';

interface Props {
  open: boolean;
  loading: boolean;
  output: BOMSuggestionOutput | null;
  onClose: () => void;
  onSave: () => void;
}

export default function BOMSuggestionModal({ open, loading, output, onClose, onSave }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[920px] max-h-[88vh] bg-card border border-line rounded-xl shadow-card flex flex-col overflow-hidden animate-modal-in"
      >
        <div className="h-1 bg-gradient-to-r from-ai via-purple-500 to-pink-400" />
        <div className="flex items-center gap-2 px-5 py-3 border-b border-line">
          <span className="ai-chip">
            <Sparkles size={11} /> AI 生成
          </span>
          <h3 className="text-[14px] font-semibold">
            {output ? `${output.workOrderId} · BOM 草稿` : '生成 BOM 中…'}
          </h3>
          <button onClick={onClose} className="ml-auto w-8 h-8 rounded-md hover:bg-bg flex items-center justify-center text-ink-faint">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {loading || !output ? (
            <div className="flex items-center justify-center gap-3 py-20 text-ai">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-[13.5px] font-medium">AI 正在生成 BOM 草稿…</span>
            </div>
          ) : (
            <div className="grid grid-cols-[1fr_320px] gap-5">
              {/* 左：BOM + 工艺路径 */}
              <div className="space-y-4 min-w-0">
                <div>
                  <div className="text-[11.5px] text-ink-faint mb-1.5">产品</div>
                  <div className="text-[13px] font-semibold text-ink">{output.productName}</div>
                </div>

                <section>
                  <div className="flex items-center mb-2">
                    <Boxes size={13} className="text-ai mr-1.5" />
                    <span className="text-[12.5px] font-semibold">BOM 草稿</span>
                    <span className="ml-auto text-[10.5px] text-ink-faint">共 {output.bom.length} 项</span>
                  </div>
                  <table className="w-full text-[12px]">
                    <thead className="text-[11px] text-ink-faint">
                      <tr className="text-left">
                        <th className="py-1.5 pr-2 font-medium">类</th>
                        <th className="py-1.5 pr-2 font-medium">物料</th>
                        <th className="py-1.5 pr-2 font-medium">规格</th>
                        <th className="py-1.5 pr-2 font-medium text-right">数量</th>
                      </tr>
                    </thead>
                    <tbody>
                      {output.bom.map((item, i) => (
                        <tr key={i} className="border-t border-line">
                          <td className="py-1.5 pr-2">
                            <span className={`tag ${item.category === 'main' ? 'bg-brand text-white' : 'bg-info/15 text-info'}`}>
                              {item.category === 'main' ? '主料' : '辅料'}
                            </span>
                          </td>
                          <td className="py-1.5 pr-2 text-ink font-medium">{item.material}</td>
                          <td className="py-1.5 pr-2 text-ink-dim text-[11.5px]">
                            {item.spec}
                            {item.note && (
                              <span className="ml-1.5 text-[10.5px] text-warn">（{item.note}）</span>
                            )}
                          </td>
                          <td className="py-1.5 pr-2 text-right tabular-nums text-ink">
                            {item.qty} {item.unit}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>

                <section>
                  <div className="flex items-center mb-2">
                    <RouteIcon size={13} className="text-ai mr-1.5" />
                    <span className="text-[12.5px] font-semibold">工艺路径建议</span>
                  </div>
                  <ol className="space-y-1.5">
                    {output.route.map((step) => (
                      <li key={step.step} className="flex items-center gap-3 text-[12px]">
                        <span className="w-6 h-6 rounded-full bg-ai/10 text-ai font-bold flex items-center justify-center text-[11px]">
                          {step.step}
                        </span>
                        <span className="text-ink font-medium flex-1">{step.process}</span>
                        <span className="text-ink-dim text-[11px]">{step.resource}</span>
                        <span className="text-ink-faint tabular-nums text-[11px] w-14 text-right">{step.durationMin} 分钟</span>
                      </li>
                    ))}
                  </ol>
                </section>
              </div>

              {/* 右：推理依据 */}
              <div className="space-y-4 border-l border-line pl-5">
                <div>
                  <div className="text-[11.5px] text-ink-faint mb-1.5">参考相似工单</div>
                  <div className="space-y-1">
                    {output.basedOnSimilar.map((id) => (
                      <div key={id} className="text-[12px] font-mono text-ink-dim bg-panel2 px-2 py-1 rounded">{id}</div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[11.5px] text-ink-faint mb-1.5">推理依据</div>
                  <p className="text-[12px] text-ink-dim leading-relaxed">{output.reasoning}</p>
                </div>
                <div className="text-[11px] text-ink-faint border-t border-line pt-3">
                  💡 此 BOM 为 AI 草稿，请工艺部门复核后保存
                </div>
              </div>
            </div>
          )}
        </div>
        {!loading && output && (
          <div className="p-3 border-t border-line bg-panel2 flex justify-end gap-2">
            <button onClick={onClose} className="btn">关闭</button>
            <button onClick={onSave} className="btn btn-ai"><Save size={12} />保存草稿</button>
          </div>
        )}
      </div>
    </div>
  );
}
