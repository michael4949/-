// Agent #1 的方案卡（在 Copilot 消息流内渲染）
import { Check, Crown } from 'lucide-react';
import type { InsertScheme } from '../../mock/agentResponses';

interface Props {
  schemes: InsertScheme[];
  appliedId?: string | null;
  onApply: (s: InsertScheme) => void;
}

export default function InsertSchemeCard({ schemes, appliedId, onApply }: Props) {
  return (
    <div className="space-y-2">
      {schemes.map((s) => {
        const applied = appliedId === s.id;
        return (
          <div
            key={s.id}
            className={`relative rounded-lg border bg-card p-3 transition-colors
                       ${s.recommended ? 'border-ai shadow-[0_0_0_1px_rgba(124,58,237,0.2)]' : 'border-line'}
                       ${applied ? 'ring-2 ring-ok ring-offset-1 ring-offset-card' : ''}`}
          >
            {s.recommended && (
              <span className="absolute -top-2.5 right-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-white bg-ai rounded px-1.5 py-0.5">
                <Crown size={10} /> AI 推荐
              </span>
            )}
            <div className="text-[13px] font-semibold mb-1.5">{s.label}</div>
            <div className="grid grid-cols-3 gap-1.5 text-[11px] mb-2">
              <Field label="受影响" value={`${s.impact.affectedOrders} 张`} />
              <Field label="OTD" value={s.impact.otdDelta} />
              <Field label="换型"  value={s.impact.changeoverDelta} />
            </div>
            {s.reason && (
              <div className="text-[11.5px] text-ink-faint mb-2 leading-relaxed">{s.reason}</div>
            )}
            <button
              onClick={() => onApply(s)}
              disabled={applied}
              className={`btn btn-sm w-full justify-center ${applied ? 'bg-ok text-white border-ok hover:bg-ok hover:text-white' : 'btn-ai'}`}
            >
              {applied ? <><Check size={12} /> 已应用</> : '应用此方案'}
            </button>
          </div>
        );
      })}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-panel2 rounded px-1.5 py-1 text-center">
      <div className="text-ink-faint text-[10px]">{label}</div>
      <div className="font-semibold text-ink tabular-nums">{value}</div>
    </div>
  );
}
