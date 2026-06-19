// Agent #19 预警归因 Modal
import { X, Sparkles, Loader2, Repeat, AlertTriangle } from 'lucide-react';
import type { AlertCauseExplainOutput } from '../../mock/agentResponses.sprint6';

interface Props {
  open: boolean;
  loading: boolean;
  output: AlertCauseExplainOutput | null;
  onClose: () => void;
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

export default function AlertCauseExplainModal({ open, loading, output, onClose }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[700px] max-h-[86vh] bg-card border border-line rounded-xl shadow-card flex flex-col overflow-hidden animate-modal-in"
      >
        <div className="h-1 bg-gradient-to-r from-ai via-purple-500 to-pink-400" />
        <div className="flex items-center gap-2 px-5 py-3 border-b border-line">
          <span className="ai-chip"><Sparkles size={11} /> AI 归因</span>
          <h3 className="text-[14px] font-semibold">
            {output ? `${output.alertId} · 预警归因报告` : '归因分析中…'}
          </h3>
          <button onClick={onClose} className="ml-auto w-8 h-8 rounded-md hover:bg-bg flex items-center justify-center text-ink-faint">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {loading || !output ? (
            <div className="flex items-center justify-center gap-3 py-20 text-ai">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-[13.5px] font-medium">AI 分析根因 + 复发模式中…</span>
            </div>
          ) : (
            <div className="space-y-4 text-[12.5px]">
              {/* 预警概要 */}
              <div className="rounded-md bg-red-50/60 border-l-4 border-danger px-4 py-2.5 leading-relaxed">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle size={13} className="text-danger" />
                  <span className="text-[10.5px] font-bold text-danger uppercase tracking-wider">{output.alertType}预警</span>
                </div>
                <div className="text-[12.5px] text-ink">{output.alertTitle}</div>
              </div>

              {/* 根因因素 */}
              <section>
                <div className="text-[10.5px] text-ink-faint tracking-wider uppercase mb-2">
                  根因因素（{output.causes.length} 项）
                </div>
                <div className="space-y-2">
                  {output.causes.map((c, i) => (
                    <div key={i} className={`rounded-md border-l-4 ${SEV_COLOR[c.severity]} px-3 py-2 border border-line`}>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[12px] font-semibold text-ink">{c.category}</span>
                        <span className={`tag ${SEV_TAG[c.severity]}`}>
                          {c.severity === 'high' ? '高' : c.severity === 'medium' ? '中' : '低'}
                        </span>
                      </div>
                      <div className="text-[12px] text-ink-dim leading-relaxed">{c.detail}</div>
                    </div>
                  ))}
                </div>
              </section>

              {/* 复发模式 */}
              <div className="rounded-md bg-ai-bg/60 border border-ai/30 px-3 py-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <Repeat size={12} className="text-ai" />
                  <span className="text-[11.5px] font-semibold text-ai">复发模式</span>
                </div>
                <div className="text-[11.5px] text-ink-dim leading-relaxed">
                  过去 30 天该类预警发生 <b className="text-ink tabular-nums">{output.recurrence.past30days}</b> 次 · {output.recurrence.pattern}
                </div>
              </div>

              {/* 建议处置 */}
              <section>
                <div className="text-[10.5px] text-ink-faint tracking-wider uppercase mb-2">建议处置</div>
                <ol className="space-y-1.5 pl-1">
                  {output.recommendations.map((r, i) => (
                    <li key={i} className="flex items-baseline gap-2 text-[12.5px] text-ink leading-relaxed">
                      <span className="text-ai font-bold flex-none w-5">{i + 1}.</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ol>
              </section>
            </div>
          )}
        </div>
        {!loading && output && (
          <div className="p-3 border-t border-line bg-panel2 flex justify-end gap-2">
            <button onClick={onClose} className="btn">关闭</button>
            <button className="btn btn-ai"><Sparkles size={12} />开始处置</button>
          </div>
        )}
      </div>
    </div>
  );
}
