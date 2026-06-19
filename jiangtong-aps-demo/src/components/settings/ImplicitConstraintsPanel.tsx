// Agent #7 隐性约束挖掘 · 治理 Tab 子页
//   列表：AI 挖掘的疑似隐性约束 + 接受/驳回 操作
import { useState } from 'react';
import { Check, X, Lightbulb, Sparkles } from 'lucide-react';
import { IMPLICIT_CONSTRAINTS } from '../../mock/agentResponses.sprint4';

type Status = 'pending' | 'accepted' | 'rejected';

export default function ImplicitConstraintsPanel() {
  const [statuses, setStatuses] = useState<Record<string, Status>>(
    Object.fromEntries(IMPLICIT_CONSTRAINTS.candidates.map((c) => [c.id, 'pending'])),
  );

  const pending = Object.values(statuses).filter((s) => s === 'pending').length;

  return (
    <div className="space-y-3">
      <div className="flex items-center">
        <Lightbulb size={13} className="text-ai mr-1.5" />
        <span className="text-[12.5px] font-semibold">隐性约束待审（{pending} 待处理）</span>
        <span className="ml-auto text-[10.5px] text-ink-faint">
          Agent #7 · 每周日 02:00 自动挖掘
        </span>
      </div>
      <div className="text-[12px] text-ink-dim leading-relaxed bg-ai-bg/40 rounded-md p-2.5 border-l-4 border-ai">
        AI 基于过去 60 天的工单数据 + 质量/损耗记录，发现以下疑似隐性约束。计划员审核后接受可纳入正式约束库（影响排产算法）。
      </div>

      <div className="space-y-2">
        {IMPLICIT_CONSTRAINTS.candidates.map((c) => {
          const st = statuses[c.id];
          return (
            <div key={c.id} className={`rounded-md border p-3
                                        ${st === 'accepted' ? 'border-ok/40 bg-ok/5'
                                         : st === 'rejected' ? 'border-ink-faint/40 bg-bg opacity-60'
                                         : 'border-line bg-card'}`}>
              <div className="flex items-center gap-2 mb-1.5">
                <Sparkles size={11} className="text-ai" />
                <span className="text-[11px] font-mono text-ink-faint">{c.id}</span>
                <span className="ml-auto text-[10.5px] text-ink-faint">
                  置信度 <b className="text-ai tabular-nums">{Math.round(c.confidence * 100)}%</b>
                  <span className="mx-2">·</span>
                  影响工单 <b className="text-ink tabular-nums">{c.affectedOrders}</b>
                </span>
              </div>
              <div className="text-[12.5px] text-ink font-medium mb-1.5">{c.statement}</div>
              <div className="text-[11.5px] text-ink-dim leading-relaxed mb-2.5">
                <b className="text-ink-faint">证据：</b>{c.evidence}
              </div>
              {st === 'pending' ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => setStatuses((m) => ({ ...m, [c.id]: 'accepted' }))}
                    className="btn btn-sm bg-ok text-white border-ok hover:bg-ok hover:border-ok hover:text-white"
                  >
                    <Check size={11} />接受为正式约束
                  </button>
                  <button
                    onClick={() => setStatuses((m) => ({ ...m, [c.id]: 'rejected' }))}
                    className="btn btn-sm"
                  >
                    <X size={11} />驳回
                  </button>
                </div>
              ) : (
                <div className={`text-[11.5px] font-semibold ${st === 'accepted' ? 'text-ok' : 'text-ink-faint'}`}>
                  {st === 'accepted' ? '✓ 已接受为正式约束' : '✗ 已驳回'}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
