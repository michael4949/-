import { useEffect, useRef, useState } from 'react';
import { MessageSquareText, X, Send, Sparkles, Check, WandSparkles } from 'lucide-react';
import type { Answer, ApplyAction, ChatMsg, Evidence } from './types';
import { EvRefs } from './ReasoningChain';

/** 右下角"追问 AI"：快捷追问 + 自由输入；由页面提供本地规则应答；回复可"应用到方案"。 */
export default function AskAi({ presets, answer, evidence, excluded, onApply, request, evidenceCount, intro }: {
  presets: string[]; answer: (q: string) => Answer; evidence: Evidence[]; excluded: Set<string>; onApply: (a: ApplyAction) => void;
  request?: { q: string; n: number } | null; evidenceCount: number; intro: string;
}) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<ChatMsg[]>([{ role: 'ai', text: intro }]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const answerRef = useRef(answer); answerRef.current = answer;
  const lastReq = useRef(0);

  const ask = (q: string) => {
    const text = q.trim(); if (!text) return;
    setMsgs((m) => [...m, { role: 'user', text }]); setInput(''); setTyping(true);
    window.setTimeout(() => { const a = answerRef.current(text); setTyping(false); setMsgs((m) => [...m, { role: 'ai', text: a.text, evidence: a.evidence, apply: a.apply }]); }, 650);
  };
  useEffect(() => { if (request && request.n !== lastReq.current) { lastReq.current = request.n; setOpen(true); ask(request.q); } }, [request]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { bodyRef.current?.scrollTo({ top: 1e6, behavior: 'smooth' }); }, [msgs, typing, open]);

  if (!open) return <button className="ai-fab" onClick={() => setOpen(true)}><MessageSquareText size={16} />追问 AI<span className="n">{evidenceCount} 条证据在手</span></button>;
  return (
    <div className="ai-ask fade-in">
      <div className="hd"><Sparkles size={15} color="var(--red)" /><b>追问 AI · 基于 {evidenceCount} 条证据{excluded.size ? `（已排除 ${excluded.size} 条）` : ''}</b><span className="ai-tag">回复引用证据 · 可应用到方案</span><button className="up-x" onClick={() => setOpen(false)}><X size={14} /></button></div>
      <div className="body" ref={bodyRef}>
        {msgs.map((m, i) => (
          <div key={i} className={`ai-msg ${m.role}`}>
            {m.text}
            {m.evidence && m.evidence.length > 0 && <div className="ev"><span className="ai-muted">依据：</span><EvRefs ids={m.evidence} evidence={evidence} excluded={excluded} /></div>}
            {m.apply && (
              <div className="ap">
                {m.applied ? <span className="chip green"><Check size={11} />已应用：{m.apply.label}</span>
                  : <button className="btn sm gold" onClick={() => { onApply(m.apply!); setMsgs((ms) => ms.map((x, j) => (j === i ? { ...x, applied: true } : x))); }}><WandSparkles size={12} />应用到方案：{m.apply.label}</button>}
              </div>
            )}
          </div>
        ))}
        {typing && <div className="ai-msg"><span className="ai-typing"><i /><i /><i /></span></div>}
      </div>
      <div className="ai-presets">{presets.map((p) => <button key={p} onClick={() => ask(p)}>{p}</button>)}</div>
      <div className="in">
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="输入问题：预算 / 时间 / 竞品 / 董事长 / 结算 / 授信 / 风险 / 下一步…" onKeyDown={(e) => e.key === 'Enter' && ask(input)} />
        <button className="btn sm" onClick={() => ask(input)}><Send size={12} />发送</button>
      </div>
    </div>
  );
}
