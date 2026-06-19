// §11.1 Copilot 完整化（Sprint 2：Agent #1 紧急插单助手；Sprint 3：cost Agent）
import { Sparkles, X, Send, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useCopilotStore } from '../../store/useCopilotStore';
import { useScheduleStore } from '../../store/useScheduleStore';
import { mockAIInvoke } from '../../utils/mockApi';
import type { InsertEvalOutput, InsertScheme } from '../../mock/agentResponses';
import InsertSchemeCard from './InsertSchemeCard';

const QUICK_SUGGESTS_SCHEDULE = [
  '华翔电机来一张急单,500kg QA-0.08mm,下周二必须交',
  '海尔智家急单 800kg QZ-0.5mm 下周三交',
  '美的集团 1200kg QA-0.21mm 紧急加单',
];

export default function CopilotPanel() {
  const { open, toggle, setOpen, contextAgent, messages, pushMessage, thinking, setThinking } = useCopilotStore();
  const insertCtx = useScheduleStore((s) => s.insertContext);
  const apply = useScheduleStore((s) => s.applyInsertScheme);
  const setInsertContext = useScheduleStore((s) => s.setInsertContext);
  const [appliedSchemes, setAppliedSchemes] = useState<Record<string, string>>({}); // msgId -> schemeId
  const [draft, setDraft] = useState('');
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, thinking]);

  const isSchedule = contextAgent === 'schedule.insert-assistant';

  async function submit(text: string) {
    if (!text.trim() || thinking) return;
    setDraft('');
    const userMsg = { id: 'u-' + Date.now(), role: 'user' as const, content: text, timestamp: new Date() };
    pushMessage(userMsg);

    if (!isSchedule) {
      // 非排产页：占位回复
      setThinking(true);
      await new Promise((r) => setTimeout(r, 800));
      pushMessage({ id: 'a-' + Date.now(), role: 'assistant', content: '此模块的 AI 能力将在后续 Sprint 启用。', timestamp: new Date() });
      setThinking(false);
      return;
    }

    // Agent #1
    setInsertContext(text);
    setThinking(true);
    const { output } = await mockAIInvoke({ agentId: 'schedule.insert-assistant', input: { text } });
    setThinking(false);
    const r = output as InsertEvalOutput;
    pushMessage({
      id: 'a-' + Date.now(),
      role: 'assistant',
      content: `已为您评估**3 种插单方案**（${r.request.customer} · ${r.request.product} · ${r.request.quantity}kg · 交期 ${r.request.dueDate}）：`,
      attachments: [{ type: 'scheme', data: r }],
      timestamp: new Date(),
    });
  }

  function onApplyScheme(parentMsgId: string, scheme: InsertScheme, output: InsertEvalOutput) {
    if (appliedSchemes[parentMsgId]) return;
    apply(scheme, output.request.customer, output.request.product, output.request.quantity);
    setAppliedSchemes((m) => ({ ...m, [parentMsgId]: scheme.id }));
    pushMessage({
      id: 'a-' + Date.now(),
      role: 'assistant',
      content: `已应用 **${scheme.label}**：受影响 ${scheme.impact.affectedOrders} 张工单已自动后推；新急单已写入甘特图并在闪烁标记中。请在排产页确认后下发计划。`,
      timestamp: new Date(),
    });
  }

  return (
    <>
      {!open && (
        <button
          onClick={toggle}
          className="fixed right-6 bottom-6 z-[9999] h-12 px-4 rounded-full
                     bg-gradient-to-br from-ai to-purple-500 text-white font-semibold text-[13px]
                     shadow-fab hover:shadow-[0_14px_40px_rgba(124,58,237,0.4)]
                     transition-all flex items-center gap-2"
          title="排产助手 · AI"
        >
          <Sparkles size={16} />
          <span>AI 助手</span>
        </button>
      )}

      <aside
        className={`fixed top-0 right-0 h-screen w-[420px] z-[9999] bg-card border-l border-line
                    shadow-[-10px_0_40px_rgba(17,24,39,0.10)]
                    transform transition-transform duration-300 flex flex-col
                    ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* 头部 */}
        <div className="h-14 flex-none px-4 flex items-center gap-3 border-b border-line bg-panel2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-ai to-purple-500 flex items-center justify-center text-white">
            <Sparkles size={15} />
          </div>
          <div className="leading-tight">
            <div className="text-[14px] font-semibold">排产助手</div>
            <div className="text-[10.5px] text-ink-faint">
              {isSchedule ? '已绑定 · 紧急插单助手' : contextAgent ? `已绑定 · ${contextAgent}` : '当前页未绑定 Agent'}
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="ml-auto w-8 h-8 rounded-lg hover:bg-bg flex items-center justify-center text-ink-dim"
            title="关闭"
          >
            <X size={16} />
          </button>
        </div>

        {/* 消息区 */}
        <div ref={bodyRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-bg">
          {messages.length === 0 && !thinking && (
            <div className="text-[12.5px] text-ink-dim leading-7 border border-dashed border-line rounded-lg px-4 py-3 bg-card">
              您好，我是排产助手 ✨<br />
              {isSchedule
                ? '我可以帮您评估急单插入方案。请描述需求，例如"华翔电机来一张急单,500kg QA-0.08mm,下周二必须交"。'
                : '请切到「智能排产」页与我对话，或在工单详情面板点 ✨ 解释为何这样排。'}
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
              <div className={`max-w-[88%] rounded-lg px-3 py-2 text-[12.5px] leading-relaxed
                              ${m.role === 'user'
                                ? 'bg-brand text-white'
                                : 'bg-card border border-line text-ink'}`}>
                <div dangerouslySetInnerHTML={{ __html: m.content.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>') }} />
                {m.attachments?.map((att, i) => att.type === 'scheme' ? (
                  <div className="mt-2" key={i}>
                    <InsertSchemeCard
                      schemes={(att.data as InsertEvalOutput).schemes}
                      appliedId={appliedSchemes[m.id]}
                      onApply={(s) => onApplyScheme(m.id, s, att.data as InsertEvalOutput)}
                    />
                  </div>
                ) : null)}
              </div>
            </div>
          ))}
          {thinking && (
            <div className="flex justify-start">
              <div className="bg-card border border-line rounded-lg px-3 py-2 text-[12.5px] text-ai inline-flex items-center gap-2">
                <Loader2 size={13} className="animate-spin" />
                AI 思考中…
              </div>
            </div>
          )}
        </div>

        {/* 底部输入 */}
        <div className="flex-none border-t border-line p-3 bg-card">
          {isSchedule && (
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {QUICK_SUGGESTS_SCHEDULE.map((s) => (
                <button key={s} onClick={() => submit(s)} className="ai-chip cursor-pointer hover:bg-ai-soft">
                  {s.length > 18 ? s.slice(0, 18) + '…' : s}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) submit(draft); }}
              placeholder={isSchedule ? '描述插单需求…' : '当前页未绑定 Agent'}
              disabled={!isSchedule}
              className="flex-1 h-9 px-3 rounded-lg bg-panel2 border border-line text-[12.5px]
                         placeholder:text-ink-faint outline-none focus:border-ai focus:ring-2 focus:ring-ai/20 disabled:opacity-50"
            />
            <button
              onClick={() => submit(draft)}
              disabled={!isSchedule || !draft.trim() || thinking}
              className="w-9 h-9 rounded-lg bg-gradient-to-br from-ai to-purple-500 text-white
                         flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed">
              <Send size={14} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
