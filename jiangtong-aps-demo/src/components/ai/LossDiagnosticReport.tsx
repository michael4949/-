// §6.2.4 损耗异常诊断报告：四段
//   ① 总体偏差  ② 根因列表（severity 排序+色彩） ③ 建议处置  ④ 关联数据（可下钻 → Copilot）
import type { LossDiagnosticOutput } from '../../types/cost';
import { ArrowRight, MessageSquare } from 'lucide-react';
import { useExplainStore } from '../../store/useExplainStore';

interface Props {
  data: LossDiagnosticOutput;
  onAskCopilot: (q: string) => void;
}

const SEV_STYLE = {
  high:   { label: '高', clr: 'text-danger', bg: 'bg-danger/10 border-danger/30',  dot: 'bg-danger' },
  medium: { label: '中', clr: 'text-warn',   bg: 'bg-warn/10 border-warn/30',     dot: 'bg-warn' },
  low:    { label: '低', clr: 'text-info',   bg: 'bg-info/10 border-info/30',     dot: 'bg-info' },
} as const;

export default function LossDiagnosticReport({ data, onAskCopilot }: Props) {
  const causes = [...data.rootCauses].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.severity] - order[b.severity];
  });

  return (
    <div className="space-y-4">
      {/* ① 总体偏差 */}
      <section>
        <SectionTitle no="①" label="总体偏差" />
        <div className="bg-panel2 rounded-md p-4 grid grid-cols-3 gap-4 text-center">
          <Stat label="实际损耗率" value={`${data.actualLoss.toFixed(2)}%`} valueClass="text-danger" />
          <Stat label="30 天均值（基线）" value={`${data.baseline.toFixed(2)}%`} valueClass="text-ink-dim" />
          <Stat label="偏差" value={`+${data.deviation.toFixed(2)}pp`} valueClass="text-danger" highlight />
        </div>
        <div className="mt-2 text-[12px] text-ink-dim leading-7">
          工单 <b className="font-mono">{data.workOrder}</b>（{data.productName} · {data.customer}）本次实际损耗
          <b className="text-danger"> {data.actualLoss.toFixed(2)}% </b>
          显著高于近 30 天均值 <b>{data.baseline.toFixed(2)}%</b>，偏差
          <b className="text-danger"> +{data.deviation.toFixed(2)}pp</b>。
        </div>
      </section>

      {/* ② 根因列表 */}
      <section>
        <SectionTitle no="②" label="根因列表" subtitle="按严重程度排序" />
        <ul className="space-y-2">
          {causes.map((c, i) => {
            const s = SEV_STYLE[c.severity];
            return (
              <li key={i} className={`rounded-md border ${s.bg} px-3 py-2.5`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                  <span className="font-semibold text-[13px] text-ink">{c.factor}</span>
                  <span className={`ml-auto text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${s.clr} bg-card border border-current/30`}>
                    严重度 · {s.label}
                  </span>
                </div>
                <div className="text-[12px] text-ink-dim leading-6">{c.detail}</div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ③ 建议处置 */}
      <section>
        <SectionTitle no="③" label="建议处置" />
        <ol className="space-y-1.5 text-[12.5px] text-ink-dim leading-7 pl-1 list-decimal list-inside">
          {data.recommendation.map((rec, i) => <li key={i}>{rec}</li>)}
        </ol>
      </section>

      {/* ④ 关联数据（可下钻 → Copilot 追问） */}
      <section>
        <SectionTitle no="④" label="关联数据" subtitle="点击关键数据 → 向 AI 追问" />
        <div className="space-y-1.5">
          {causes.filter((c) => c.related).map((c, i) => {
            const r = c.related!;
            const q =
              r.kind === 'batch' ? `LB-2024-09-A 批次还用在哪些工单？`
              : r.kind === 'machine' ? `${r.value} 近一周还有哪些异常工单？`
              : `${r.value} 还参与了哪些工单？`;
            return (
              <button
                key={i}
                onClick={() => {
                  onAskCopilot(q);
                  useExplainStore.getState().close();
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md border border-line hover:border-ai hover:bg-ai-bg transition-colors text-left group"
              >
                <span className="text-[11px] text-ink-faint flex-none">{c.factor}</span>
                <span className="font-mono font-semibold text-ink">{r.value}</span>
                <span className="ml-auto text-[11.5px] text-ai font-semibold inline-flex items-center gap-1">
                  <MessageSquare size={12} /> 向 AI 追问
                  <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function SectionTitle({ no, label, subtitle }: { no: string; label: string; subtitle?: string }) {
  return (
    <div className="flex items-baseline gap-2 mb-2">
      <span className="text-[12px] font-bold text-ai">{no}</span>
      <span className="text-[13px] font-semibold text-ink">{label}</span>
      {subtitle && <span className="text-[11px] text-ink-faint">{subtitle}</span>}
    </div>
  );
}
function Stat({ label, value, valueClass, highlight }: { label: string; value: string; valueClass: string; highlight?: boolean }) {
  return (
    <div>
      <div className="text-[10.5px] text-ink-faint mb-0.5">{label}</div>
      <div className={`text-[20px] font-bold tabular-nums ${valueClass} ${highlight ? 'inline-block px-2 py-0.5 rounded bg-danger/10' : ''}`}>
        {value}
      </div>
    </div>
  );
}
