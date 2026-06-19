// Agent #12 抢料冲突调解 Modal
//   左：冲突详情（多工单争抢）  右：AI 分配方案（带替代批次建议）
import { X, Sparkles, Loader2, Check, ArrowRight } from 'lucide-react';
import type { ConflictMediationOutput } from '../../mock/agentResponses.sprint5';
import { PRIORITY_LABEL } from '../../types/workOrder';

interface Props {
  open: boolean;
  loading: boolean;
  output: ConflictMediationOutput | null;
  onClose: () => void;
  onApply: () => void;
}

export default function ConflictMediatorModal({ open, loading, output, onClose, onApply }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[760px] max-h-[88vh] bg-card border border-line rounded-xl shadow-card flex flex-col overflow-hidden animate-modal-in"
      >
        <div className="h-1 bg-gradient-to-r from-ai via-purple-500 to-pink-400" />
        <div className="flex items-center gap-2 px-5 py-3 border-b border-line">
          <span className="ai-chip">
            <Sparkles size={11} /> AI 调解
          </span>
          <h3 className="text-[14px] font-semibold">
            {output ? `${output.conflictId} · 抢料冲突调解方案` : '正在调解中…'}
          </h3>
          <button onClick={onClose} className="ml-auto w-8 h-8 rounded-md hover:bg-bg flex items-center justify-center text-ink-faint">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {loading || !output ? (
            <div className="flex items-center justify-center gap-3 py-20 text-ai">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-[13.5px] font-medium">AI 基于优先级 + 交期紧迫度计算分配中…</span>
            </div>
          ) : (
            <div className="space-y-4 text-[12.5px]">
              {/* 冲突摘要 */}
              <div className="rounded-md bg-panel2 px-4 py-2.5 leading-relaxed">
                <div className="flex items-center gap-2 mb-1">
                  <b className="text-ink">物料：</b>
                  <span>{output.conflict.materialSpec}</span>
                  <span className="font-mono text-[11px] text-ink-faint ml-1">({output.conflict.materialBatchId})</span>
                </div>
                <div className="flex items-center gap-4 text-[12px]">
                  <span>可用 <b className="text-ink tabular-nums">{output.conflict.available}{output.conflict.unit}</b></span>
                  {output.conflict.gap > 0 && <span className="text-danger">缺口 <b className="tabular-nums">{output.conflict.gap}{output.conflict.unit}</b></span>}
                  <span className="text-ink-faint">争抢工单 {output.conflict.competitors.length} 张</span>
                </div>
              </div>

              {/* 分配方案表 */}
              <section>
                <div className="text-[10.5px] text-ink-faint tracking-wider uppercase mb-2">
                  AI 分配方案
                </div>
                <div className="space-y-2">
                  {output.allocations.map((a, i) => (
                    <div
                      key={a.workOrderId}
                      className={`rounded-md border p-3 ${
                        a.allocated > 0 && !a.altBatch ? 'border-ok/40 bg-ok/5'
                        : a.altBatch ? 'border-warn/40 bg-warn/5'
                        : 'border-line'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-bold text-ink-faint">#{i + 1}</span>
                        <span className="font-mono text-[12px] text-ink">{a.workOrderId}</span>
                        <span className="text-[12px] text-ink-dim ml-1">{a.customer}</span>
                        <span className="ml-auto">
                          {a.allocated > 0 && !a.altBatch && (
                            <span className="ai-chip bg-ok/20 text-ok border-ok/30"><Check size={10} />全额分配</span>
                          )}
                          {a.altBatch && (
                            <span className="ai-chip bg-warn/20 text-warn border-warn/30"><ArrowRight size={10} />切换批次</span>
                          )}
                        </span>
                      </div>
                      <div className="grid grid-cols-[80px_1fr] gap-2 text-[11.5px]">
                        <span className="text-ink-faint">分配数量</span>
                        <span className="tabular-nums font-semibold text-ink">
                          {a.allocated} {a.unit}
                          {a.altBatch && <span className="ml-2 text-warn">→ 使用 {a.altBatch}</span>}
                        </span>
                        <span className="text-ink-faint">理由</span>
                        <span className="text-ink-dim leading-relaxed">{a.rationale}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* 全局收益 */}
              <div className="rounded-md bg-ai-bg/60 border-l-4 border-ai px-4 py-2.5">
                <div className="text-[10.5px] text-ai font-semibold uppercase tracking-wider mb-1">全局收益</div>
                <div className="text-[12px] text-ink leading-relaxed">{output.benefit}</div>
              </div>
            </div>
          )}
        </div>
        {!loading && output && (
          <div className="p-3 border-t border-line bg-panel2 flex justify-end gap-2">
            <button onClick={onClose} className="btn">关闭</button>
            <button onClick={onApply} className="btn btn-ai"><Check size={12} />应用此方案</button>
          </div>
        )}
      </div>
    </div>
  );
}
