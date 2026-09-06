import { useMemo, useState } from 'react';
import * as Icons from 'lucide-react';
import type { Company } from '../../data/companies';
import { ActionBtns, type SystemHandler } from './ActionBtns';
import { CURRENT_USER, type PlanTask, type Pri } from './content';
import { addDays, ymdDot } from './text';

/** 混合类结果区下半部：AI 生成的可执行行动计划（编辑 / 添加 / 勾选 / 加入工作计划 / 推送 OA）+ 进度环 + 本周日程 */
const PRI_NEXT: Record<Pri, Pri> = { P1: 'P2', P2: 'P3', P3: 'P1' };
const PRI_NAME: Record<Pri, string> = { P1: 'P1 紧急', P2: 'P2 重要', P3: 'P3 常规' };
const WEEK = ['周一', '周二', '周三', '周四', '周五'];

export default function ActionPlan({ initial, co, fnName, onToast, onSystem }: {
  initial: PlanTask[]; co: Company; fnName: string; onToast: (m: string) => void; onSystem: SystemHandler;
}) {
  const [tasks, setTasks] = useState<PlanTask[]>(initial);
  const [seq, setSeq] = useState(0);
  const done = tasks.filter((t) => t.done).length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const upd = (id: string, patch: Partial<PlanTask>) => setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const add = () => {
    const id = `new-${seq}`; setSeq((s) => s + 1);
    setTasks((ts) => [...ts, { id, title: '', owner: CURRENT_USER, due: ymdDot(addDays(new Date(), 3)), pri: 'P2', action: 'plan', done: false }]);
    window.setTimeout(() => document.getElementById(`ap-${id}`)?.focus(), 30);
  };
  const week = useMemo(() => {
    const now = new Date(); const dow = (now.getDay() + 6) % 7; const mon = addDays(now, -dow);
    return WEEK.map((name, i) => { const d = addDays(mon, i); const key = ymdDot(d); return { name, key, day: d.getDate(), today: key === ymdDot(now) }; });
  }, []);
  const open = tasks.filter((t) => !t.done).length;

  return (
    <div className="card fp-panel wide ap fade-in">
      <div className="fp-panel-h">
        <div className="t"><span className="ico list"><Icons.ListTodo size={13} /></span><span>行动计划 · {co.name}</span></div>
        <div className="ap-tools">
          <span className="chip iris"><i />AI 依据结论生成 {initial.length} 项</span>
          <button className="btn ghost sm" onClick={add}><Icons.Plus size={12} />添加任务</button>
          <button className="btn gold sm" onClick={() => onToast(`已将 ${open} 项任务加入 ${CURRENT_USER} 的本周工作计划`)}><Icons.CalendarCheck2 size={12} />全部加入工作计划</button>
          <button className="btn green sm" onClick={() => { onSystem('oa', '推送行内 OA 待办'); onToast(`已推送 ${open} 项待办至行内 OA（${fnName}）`); }}><Icons.Send size={12} />推送 OA</button>
        </div>
      </div>
      <div className="ap-grid">
        <div className="ap-list">
          {tasks.map((t, i) => (
            <div className={`ap-task${t.done ? ' done' : ''}`} key={t.id}>
              <label className="ap-chk"><input type="checkbox" checked={t.done} onChange={(e) => upd(t.id, { done: e.target.checked })} /><span className="n">{i + 1}</span></label>
              <div className="ap-main">
                <input id={`ap-${t.id}`} className="ap-title" value={t.title} placeholder="输入任务内容……" onChange={(e) => upd(t.id, { title: e.target.value })} />
                <div className="ap-meta">
                  <span className="chip"><Icons.UserRound size={11} />{t.owner}</span>
                  <label className="ap-due" title="截止日"><Icons.CalendarDays size={11} /><input type="date" value={t.due} onChange={(e) => upd(t.id, { due: e.target.value })} /></label>
                  <button className={`ap-pri ${t.pri}`} onClick={() => upd(t.id, { pri: PRI_NEXT[t.pri] })} title="点击切换优先级">{PRI_NAME[t.pri]}</button>
                  {t.action && <ActionBtns ids={[t.action]} onSystem={onSystem} ghost className="inline" />}
                  <button className="up-x" title="移除" onClick={() => setTasks((ts) => ts.filter((x) => x.id !== t.id))}><Icons.X size={13} /></button>
                </div>
              </div>
            </div>
          ))}
          {tasks.length === 0 && <div className="fp-empty"><b>暂无任务</b>点击「添加任务」新增</div>}
        </div>
        <div className="ap-side">
          <div className="ap-ring">
            <svg viewBox="0 0 96 96" width="96" height="96" aria-label={`完成进度 ${pct}%`}>
              <defs>
                <linearGradient id="ap-ring-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#e63946" /><stop offset=".5" stopColor="#f4b942" /><stop offset="1" stopColor="#2dc48d" /></linearGradient>
                <linearGradient id="ap-ring-b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="rgba(201,162,77,.16)" /><stop offset="1" stopColor="rgba(61,187,134,.14)" /></linearGradient>
              </defs>
              <circle cx="48" cy="48" r="38" fill="none" stroke="url(#ap-ring-b)" strokeWidth="10" />
              <circle cx="48" cy="48" r="38" fill="none" stroke="url(#ap-ring-g)" strokeWidth="10" strokeLinecap="round" pathLength={100} strokeDasharray={`${Math.max(0.5, pct)} 100`} transform="rotate(-90 48 48)" className="ap-arc" />
              <text x="48" y="45" textAnchor="middle" className="ap-ring-n">{pct}%</text>
              <text x="48" y="60" textAnchor="middle" className="ap-ring-s">{done}/{tasks.length} 完成</text>
            </svg>
            <div className="ap-ring-t">
              <b>执行进度</b>
              <span>{open > 0 ? `待办 ${open} 项 · 最近截止 ${tasks.filter((t) => !t.done).map((t) => t.due).sort()[0]?.slice(5) ?? '--'}` : '全部完成'}</span>
              <span>负责人 {CURRENT_USER}</span>
            </div>
          </div>
          <div className="ap-week">
            <div className="ap-week-h"><b><Icons.CalendarRange size={12} /> 本周日程</b><span>{week[0].key.slice(5)} ~ {week[4].key.slice(5)}</span></div>
            {week.map((d) => {
              const items = tasks.filter((t) => t.due === d.key);
              return (
                <div className={`ap-day${d.today ? ' today' : ''}`} key={d.key}>
                  <span className="dn">{d.name}<small>{d.day}</small></span>
                  <div className="dl">
                    {items.length ? items.map((t) => <span key={t.id} className={`chip ${t.pri === 'P1' ? 'red' : t.pri === 'P2' ? 'orange' : ''}${t.done ? ' off' : ''}`}><i />{t.title.slice(0, 14) || '未命名任务'}</span>)
                      : <span className="ph">— 可安排拜访 / 复核 —</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="fp-foot"><span>勾选、编辑与截止日随任务保存，加入工作计划后同步到「工作计划与提醒」</span><span className="ai-tag">AI 生成 · 需人工复核</span></div>
    </div>
  );
}
