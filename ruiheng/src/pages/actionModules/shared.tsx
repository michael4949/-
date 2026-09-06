import type { ComponentType, ReactNode } from 'react';
import * as Icons from 'lucide-react';
import type { ProductFunction } from '../../data/types';
import type { FnSpec } from '../../data/fnspec';
import type { Company, Risk } from '../../data/companies';
import type { UDoc } from '../../components/UploadDocs';

/* ====================================================================== 数据模型 */
export type Priority = 'P1' | 'P2' | 'P3';
export type LogKind = 'sys' | 'ai' | 'user';
export interface LogEntry { at: string; who: string; text: string; kind: LogKind }
export interface Task {
  id: string; coId: string; co: Company; title: string; owner: string; ownerName: string;
  due: string; time: string; channel: string; priority: Priority; col: number; prevCol?: number;
  aiNext: string; log: LogEntry[]; attachments: string[]; tags: string[]; synced: boolean; score?: number;
}
export interface NewTask {
  title: string; coId: string; owner?: string; due?: string; time?: string; channel?: string; priority?: Priority; col?: number;
  aiNext?: string; tags?: string[]; attachments?: string[]; note?: string;
}

/** 专属工作区模块拿到的上下文：当前步骤、看板任务与所有可用操作 */
export interface ModuleCtx {
  fid: string; fn: ProductFunction; spec: FnSpec; today: Date; cols: string[]; flow: string[];
  step: number; setStep: (n: number) => void; completeStep: (note?: string) => void; doneSteps: boolean[];
  tasks: Task[]; setTasks: (f: (prev: Task[]) => Task[]) => void;
  selected: Task | undefined; select: (id: string | null) => void;
  moveTask: (id: string, col: number, note?: string) => void;
  addLog: (id: string, text: string, kind?: LogKind) => void;
  addTask: (t: NewTask) => Task;
  toast: (m: string) => void; nav: (to: string) => void;
  docs: UDoc[]; docsDone: boolean;
}
export interface ActionModule { Component: ComponentType<{ ctx: ModuleCtx }>; wide?: (step: number) => boolean }

/* ====================================================================== 日期与格式 */
export const pad2 = (n: number) => String(n).padStart(2, '0');
export const iso = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
export const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const parseIso = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
/** a（ISO 日期）相对 b 的天数：负数为已过期 */
export const dayDiff = (a: string, b: Date) => Math.round((parseIso(a).getTime() - b.getTime()) / 864e5);
export const WEEK = ['日', '一', '二', '三', '四', '五', '六'];
export const cnDate = (s: string) => { const d = parseIso(s); return `${d.getMonth() + 1}月${d.getDate()}日 周${WEEK[d.getDay()]}`; };
export const mdShort = (s: string) => `${Number(s.slice(5, 7))}/${Number(s.slice(8, 10))}`;
export const stamp = (d = new Date()) => `${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
export const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
/** 本周周一；周末则取下周一 */
export const mondayOf = (today: Date) => { const dow = today.getDay(); const off = dow === 0 ? 1 : dow === 6 ? 2 : 1 - dow; return addDays(today, off); };
export const fmtWan = (n: number) => n.toLocaleString('zh-CN', { maximumFractionDigits: 0 });
export const fmtPct = (n: number, d = 2) => `${n.toFixed(d)}%`;
export function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}

/* ====================================================================== 语义色 */
export const prioTone = (p: Priority) => (p === 'P1' ? 'red' : p === 'P2' ? 'orange' : 'blue');
export const riskTone = (r: Risk) => (r === 'red' ? 'red' : r === 'orange' ? 'orange' : r === 'yellow' ? '' : 'green');
export const dueState = (t: Task, today: Date, lastCol: number) => {
  if (t.col >= lastCol) return 'done' as const;
  const d = dayDiff(t.due, today);
  return d < 0 ? ('over' as const) : d === 0 ? ('today' as const) : d <= 3 ? ('soon' as const) : ('later' as const);
};
export const dueLabel = (t: Task, today: Date, lastCol: number) => {
  const s = dueState(t, today, lastCol); const d = dayDiff(t.due, today);
  return s === 'done' ? '已完成' : s === 'over' ? `逾期 ${-d} 天` : s === 'today' ? '今日' : `${d} 天后`;
};

/* ====================================================================== 通用小组件 */
export function IconOf({ name, size = 14 }: { name: string; size?: number }) {
  const C = (Icons as unknown as Record<string, ComponentType<{ size?: number }>>)[name] ?? Icons.Circle;
  return <C size={size} />;
}
export function Sec({ children, extra, tight }: { children: ReactNode; extra?: ReactNode; tight?: boolean }) {
  return <div className={`af-sec${tight ? ' tight' : ''}`}><span>{children}</span>{extra && <em>{extra}</em>}</div>;
}
export function AiCard({ title = 'AI 建议', text, onAdopt, adopted, tone = 'gold', children, adoptLabel = '一键采用' }: {
  title?: string; text?: ReactNode; onAdopt?: () => void; adopted?: boolean; tone?: 'gold' | 'red' | 'green' | 'blue'; children?: ReactNode; adoptLabel?: string;
}) {
  return (
    <div className={`af-aicard ${tone}`}>
      <div className="af-aicard-h"><span className="af-aibadge"><Icons.Sparkles size={12} />{title}</span><span className="ai-tag">AI 生成 · 需人工复核</span></div>
      {text && <div className="af-aicard-p">{text}</div>}
      {children}
      {onAdopt && (
        <div className="af-aicard-f">
          <button className={`btn sm ${adopted ? 'green' : 'gold'}`} onClick={onAdopt}>
            {adopted ? <><Icons.Check size={12} />已采用</> : <><Icons.Wand2 size={12} />{adoptLabel}</>}
          </button>
        </div>
      )}
    </div>
  );
}
export function Field({ label, hint, children, req }: { label: ReactNode; hint?: ReactNode; children: ReactNode; req?: boolean }) {
  return <div className="af-field"><label className="af-lbl">{label}{req && <span className="req">*</span>}{hint && <span className="hint">{hint}</span>}</label>{children}</div>;
}
export function Check({ on, label, sub, onClick, right }: { on: boolean; label: ReactNode; sub?: ReactNode; onClick: () => void; right?: ReactNode }) {
  return (
    <div className={`af-check${on ? ' on' : ''}`} onClick={onClick}>
      <span className="bx">{on && <Icons.Check size={11} />}</span>
      <div className="bd"><b>{label}</b>{sub && <span>{sub}</span>}</div>
      {right && <div className="rt" onClick={(e) => e.stopPropagation()}>{right}</div>}
    </div>
  );
}
export function ChipPick<T extends string>({ options, value, onChange, tone = 'red' }: { options: readonly T[]; value: T; onChange: (v: T) => void; tone?: string }) {
  return <div className="af-chips">{options.map((o) => <button key={o} className={`chip${value === o ? ` ${tone}` : ''}`} onClick={() => onChange(o)}><i />{o}</button>)}</div>;
}
export function ChipMulti({ options, value, onChange, tone = 'green' }: { options: readonly string[]; value: string[]; onChange: (v: string[]) => void; tone?: string }) {
  const toggle = (o: string) => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o]);
  return <div className="af-chips">{options.map((o) => <button key={o} className={`chip${value.includes(o) ? ` ${tone}` : ''}`} onClick={() => toggle(o)}><i />{o}</button>)}</div>;
}
export function NumInput({ value, onChange, unit, step = 1, min, max, width }: { value: number; onChange: (v: number) => void; unit?: string; step?: number; min?: number; max?: number; width?: number }) {
  return (
    <div className="af-num" style={width ? { width } : undefined}>
      <input className="af-inp" type="number" value={value} step={step} min={min} max={max} onChange={(e) => onChange(Number(e.target.value))} />
      {unit && <span className="unit">{unit}</span>}
    </div>
  );
}
export function Empty({ icon = 'Inbox', title, sub }: { icon?: string; title: string; sub?: string }) {
  return <div className="af-empty"><div className="ico"><IconOf name={icon} size={20} /></div><b>{title}</b>{sub && <span>{sub}</span>}</div>;
}
export function Score({ v, max = 5 }: { v: number; max?: number }) {
  return <span className="af-score">{Array.from({ length: max }, (_, i) => <i key={i} className={i < v ? 'on' : ''} />)}</span>;
}
