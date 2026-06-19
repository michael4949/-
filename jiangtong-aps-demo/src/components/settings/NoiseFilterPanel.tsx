// Agent #20 预警噪声过滤 · 治理 Tab 子页
import { useState } from 'react';
import { Check, ListChecks, ArrowDown, EyeOff, GitMerge } from 'lucide-react';
import { NOISE_FILTER, type NoiseFilterCandidate } from '../../mock/agentResponses.sprint6';

const ACTION_ICON: Record<NoiseFilterCandidate['suggestedAction'], JSX.Element> = {
  downgrade: <ArrowDown size={11} />,
  suppress:  <EyeOff size={11} />,
  merge:     <GitMerge size={11} />,
};
const ACTION_LABEL: Record<NoiseFilterCandidate['suggestedAction'], string> = {
  downgrade: '降级',
  suppress:  '抑制',
  merge:     '合并',
};
const ACTION_CLR: Record<NoiseFilterCandidate['suggestedAction'], string> = {
  downgrade: 'bg-warn/15 text-warn',
  suppress:  'bg-danger/15 text-danger',
  merge:     'bg-info/15 text-info',
};

export default function NoiseFilterPanel() {
  const [applied, setApplied] = useState<Set<string>>(new Set());
  const all = NOISE_FILTER.candidates;
  const pending = all.filter((c) => !applied.has(c.id));

  function applyOne(id: string) {
    setApplied((s) => { const next = new Set(s); next.add(id); return next; });
  }
  function applyAll() {
    setApplied(new Set(all.map((c) => c.id)));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center">
        <ListChecks size={13} className="text-ai mr-1.5" />
        <span className="text-[12.5px] font-semibold">预警优化建议（{pending.length} 待应用）</span>
        <span className="ml-auto flex items-center gap-2">
          <span className="text-[10.5px] text-ink-faint">Agent #20 · {NOISE_FILTER.runAt}</span>
          {pending.length > 0 && (
            <button onClick={applyAll} className="btn btn-sm btn-ai">
              <Check size={11} />批量应用全部
            </button>
          )}
        </span>
      </div>
      <div className="text-[12px] text-ink-dim leading-relaxed bg-ai-bg/40 rounded-md p-2.5 border-l-4 border-ai">
        {NOISE_FILTER.summary}。基于过去 30 天预警响应率分析，建议如下处置以减少噪声、提升信号价值。
      </div>

      <table className="w-full text-[12px]">
        <thead className="text-[11px] text-ink-faint bg-panel2">
          <tr className="text-left">
            <th className="px-2 py-1.5 font-medium w-12">ID</th>
            <th className="px-2 py-1.5 font-medium w-16">类型</th>
            <th className="px-2 py-1.5 font-medium">代表预警</th>
            <th className="px-2 py-1.5 font-medium text-right">30 天次数</th>
            <th className="px-2 py-1.5 font-medium text-right">响应率</th>
            <th className="px-2 py-1.5 font-medium">建议动作</th>
            <th className="px-2 py-1.5 font-medium">理由</th>
            <th className="px-2 py-1.5 font-medium text-right w-20">操作</th>
          </tr>
        </thead>
        <tbody>
          {all.map((c) => {
            const ap = applied.has(c.id);
            return (
              <tr key={c.id} className={`border-t border-line ${ap ? 'opacity-60' : 'hover:bg-bg'}`}>
                <td className="px-2 py-1.5 font-mono text-[11px] text-ink-faint">{c.id}</td>
                <td className="px-2 py-1.5"><span className="tag bg-ink-faint/15 text-ink-dim">{c.alertType}</span></td>
                <td className="px-2 py-1.5 text-ink-dim text-[11.5px] truncate max-w-[260px]" title={c.exampleTitle}>{c.exampleTitle}</td>
                <td className="px-2 py-1.5 text-right tabular-nums text-ink">{c.past30count}</td>
                <td className="px-2 py-1.5 text-right tabular-nums text-warn font-semibold">{Math.round(c.responseRate * 100)}%</td>
                <td className="px-2 py-1.5">
                  <span className={`tag inline-flex items-center gap-1 ${ACTION_CLR[c.suggestedAction]}`}>
                    {ACTION_ICON[c.suggestedAction]}
                    {ACTION_LABEL[c.suggestedAction]}
                  </span>
                </td>
                <td className="px-2 py-1.5 text-[11px] text-ink-faint leading-relaxed">{c.reasoning}</td>
                <td className="px-2 py-1.5 text-right">
                  {ap ? (
                    <span className="text-[11px] text-ok font-semibold">✓ 已应用</span>
                  ) : (
                    <button onClick={() => applyOne(c.id)} className="btn btn-sm btn-ai">
                      <Check size={11} />应用
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
