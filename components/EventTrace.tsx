import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Sparkles, Wrench, Archive } from 'lucide-react';
import type { AgentEvent } from '../types';

// Renders the agent's "work" (tool calls/results/skills) for one assistant turn,
// collapsed by default so the final answer stays front and center.
const EventTrace: React.FC<{ events: AgentEvent[] }> = ({ events }) => {
  const [open, setOpen] = useState(false);
  const trace = events.filter((e) => e.type !== 'final' && !(e.type === 'assistant' && e.data?.final));
  const skills = events.filter((e) => e.type === 'skill');

  if (trace.length === 0 && skills.length === 0) return null;

  return (
    <div className="mt-2 text-xs">
      {skills.map((s, i) => (
        <div key={`sk-${i}`} className="mb-2 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-amber-800">
          <Sparkles className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            学到一个新技能：<span className="font-semibold">{s.data?.name}</span>
            <span className="text-amber-600">（{s.data?.reason}）</span>
          </span>
        </div>
      ))}
      {trace.length > 0 && (
        <button
          onClick={() => setOpen(!open)}
          className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-600 transition-colors"
        >
          {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          工作过程（{trace.length} 步）
        </button>
      )}
      {open && (
        <div className="mt-2 space-y-1.5 border-l-2 border-slate-200 pl-3">
          {trace.map((e, i) => (
            <TraceLine key={i} ev={e} />
          ))}
        </div>
      )}
    </div>
  );
};

const TraceLine: React.FC<{ ev: AgentEvent }> = ({ ev }) => {
  if (ev.type === 'tool_call') {
    const args = ev.data?.arguments || {};
    const preview = Object.entries(args)
      .slice(0, 3)
      .map(([k, v]) => `${k}=${short(String(v))}`)
      .join(', ');
    return (
      <div className="flex items-start gap-2 text-slate-600">
        <Wrench className="w-3.5 h-3.5 mt-0.5 text-slate-400 shrink-0" />
        <span className="font-mono">{ev.text}({preview})</span>
      </div>
    );
  }
  if (ev.type === 'tool_result') {
    const err = ev.data?.is_error;
    return (
      <div className={`flex items-start gap-2 ${err ? 'text-red-500' : 'text-slate-400'}`}>
        {err ? <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> : <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
        <span className="whitespace-pre-wrap break-words">{short(ev.text, 200)}</span>
      </div>
    );
  }
  if (ev.type === 'compacted') {
    return (
      <div className="flex items-center gap-2 text-slate-400">
        <Archive className="w-3.5 h-3.5 shrink-0" /> {ev.text}
      </div>
    );
  }
  if (ev.type === 'error') {
    return (
      <div className="flex items-center gap-2 text-red-500">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {ev.text}
      </div>
    );
  }
  return null;
};

function short(s: string, n = 60): string {
  const oneLine = s.replace(/\s+/g, ' ');
  return oneLine.length <= n ? oneLine : oneLine.slice(0, n - 1) + '…';
}

export default EventTrace;
