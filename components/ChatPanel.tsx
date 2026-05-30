import React, { useEffect, useRef, useState } from 'react';
import { Brain, Send, User, Loader2 } from 'lucide-react';
import type { ChatTurn } from '../types';
import { chat } from '../services/mnemoApi';
import EventTrace from './EventTrace';

interface Props {
  session: string | null;
  setSession: (s: string | null) => void;
  onActivity: () => void; // refresh skills/memory after a turn
  online: boolean | null;
}

const SUGGESTIONS = [
  '记住：我每天早上 9 点开站会',
  '回忆一下我之前让你记住的事',
  '你现在学会了哪些技能？',
];

const ChatPanel: React.FC<Props> = ({ session, setSession, onActivity, online }) => {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns]);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || busy) return;
    setInput('');
    setBusy(true);
    setTurns((t) => [...t, { role: 'user', text: message }, { role: 'assistant', text: '', pending: true }]);
    try {
      const resp = await chat(message, session);
      setSession(resp.session);
      setTurns((t) => {
        const copy = [...t];
        copy[copy.length - 1] = { role: 'assistant', text: resp.answer, events: resp.events };
        return copy;
      });
      onActivity();
    } catch (e: any) {
      setTurns((t) => {
        const copy = [...t];
        copy[copy.length - 1] = {
          role: 'assistant',
          text: `⛔ 没连上后端大脑。请先在终端运行 “mnemo serve”（错误：${e.message}）。`,
        };
        return copy;
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* transcript */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {turns.length === 0 && <EmptyState online={online} onPick={send} />}
        {turns.map((turn, i) =>
          turn.role === 'user' ? (
            <div key={i} className="flex gap-3 justify-end">
              <div className="max-w-[80%] bg-corporate-900 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm leading-relaxed">
                {turn.text}
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-slate-500" />
              </div>
            </div>
          ) : (
            <div key={i} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-corporate-900 flex items-center justify-center shrink-0">
                <Brain className="w-4 h-4 text-corporate-accent" />
              </div>
              <div className="max-w-[85%]">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm leading-relaxed text-slate-800 whitespace-pre-wrap">
                  {turn.pending ? (
                    <span className="inline-flex items-center gap-2 text-slate-400">
                      <Loader2 className="w-4 h-4 animate-spin" /> 思考中…
                    </span>
                  ) : (
                    turn.text || '（无输出）'
                  )}
                </div>
                {turn.events && <EventTrace events={turn.events} />}
              </div>
            </div>
          )
        )}
        <div ref={endRef} />
      </div>

      {/* composer */}
      <div className="border-t border-slate-200 p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            placeholder="用大白话告诉它你想干嘛…（Enter 发送，Shift+Enter 换行）"
            className="flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-corporate-900/10 focus:border-corporate-900/30 max-h-32"
          />
          <button
            onClick={() => send(input)}
            disabled={busy || !input.trim()}
            className="h-11 w-11 rounded-xl bg-corporate-900 text-white flex items-center justify-center disabled:opacity-30 hover:bg-corporate-800 transition-colors shrink-0"
          >
            {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
};

const EmptyState: React.FC<{ online: boolean | null; onPick: (s: string) => void }> = ({ online, onPick }) => (
  <div className="h-full flex flex-col items-center justify-center text-center py-10">
    <div className="w-14 h-14 rounded-2xl bg-corporate-900 flex items-center justify-center mb-4">
      <Brain className="w-7 h-7 text-corporate-accent" />
    </div>
    <h2 className="text-lg font-semibold text-corporate-900">和 Mnemo 聊聊</h2>
    <p className="text-sm text-slate-500 mt-1 max-w-sm">
      它会记住你说的话、跨对话回忆，做完复杂任务后还会自己总结成「技能」。
    </p>
    {online === false && (
      <p className="text-xs text-red-500 mt-3">⚠️ 还没连上后端，请先运行 “mnemo serve”。</p>
    )}
    <div className="mt-5 flex flex-wrap gap-2 justify-center max-w-md">
      {SUGGESTIONS.map((s) => (
        <button
          key={s}
          onClick={() => onPick(s)}
          className="text-xs bg-white border border-slate-200 rounded-full px-3 py-1.5 text-slate-600 hover:border-corporate-900/30 hover:text-corporate-900 transition-colors"
        >
          {s}
        </button>
      ))}
    </div>
  </div>
);

export default ChatPanel;
