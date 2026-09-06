/** 教练中心：AI 数字人陪练教练卡片 + 教练详情抽屉 */
import { useState } from 'react';
import * as Icons from 'lucide-react';
import type { Coach } from './coaches';
import { FID_NAMES } from './coaches';
import { MODES, ticketItems, redById } from './data';
import type { Mode, Student, SessionResult } from './data';

const Ico = ({ name, size = 14 }: { name: string; size?: number }) => { const C = (Icons as unknown as Record<string, React.ComponentType<{ size?: number }>>)[name] ?? Icons.Circle; return <C size={size} />; };
const Stars = ({ n }: { n: number }) => <span className="spa-stars" title={`难度 ${n}/5`}>{'★'.repeat(n)}{'☆'.repeat(5 - n)}</span>;

interface Props { coaches: Coach[]; student: Student; results: SessionResult[]; onStart: (id: string, mode: Mode) => void }

export default function CoachCenter({ coaches, student, results, onStart }: Props) {
  const [view, setView] = useState<Coach | null>(null);
  const [cat, setCat] = useState('全部');
  const cats = ['全部', ...Array.from(new Set(coaches.map((c) => c.category)))];
  const best = (c: Coach) => Math.max(student.bestByCoach[c.id] ?? 0, ...results.filter((r) => r.coachId === c.id).map((r) => r.score));
  const list = coaches.filter((c) => cat === '全部' || c.category === cat);
  return (
    <div className="fade-in">
      <div className="spa-h">
        <div><h2>教练中心</h2><p>每位数字人教练对应一项真实工作任务 · 角色设定 / 流程票 / 红线项 · 选择模式后进入陪练舱</p></div>
        <div className="spa-sw">{cats.map((k) => <button key={k} className={cat === k ? 'on' : ''} onClick={() => setCat(k)}>{k}</button>)}</div>
      </div>
      <div className="spa-coaches">
        {list.map((c) => {
          const items = ticketItems(c.stages); const reds = items.filter((i) => i.redline).length + c.redlines.length; const b = best(c);
          return (
            <div key={c.id} className="card spa-coach">
              <div className="hd">
                <div className="av" style={{ background: c.grad }}>{c.role.initial}<span className="ic"><Ico name={c.icon} size={12} /></span></div>
                <div style={{ minWidth: 0 }}><b>{c.name}</b><span>{c.task}</span></div>
              </div>
              <div className="role">
                <b>{c.role.name} · {c.role.title}</b> <span className="card-s">{c.role.company}</span>
                <div className="tr">{c.role.traits.map((t) => <span key={t} className="chip">{t}</span>)}<span className="chip red"><i />情绪：{c.role.emotion}</span></div>
              </div>
              <div className="meta">
                <div><b><Stars n={c.difficulty} /></b><span>难度</span></div>
                <div><b>{items.length}</b><span>流程项</span></div>
                <div className="red"><b>{reds}</b><span>红线项</span></div>
                <div className="best"><b>{b || '—'}</b><span>我的最好成绩</span></div>
              </div>
              <div className="spa-fids">{c.fids.map((f) => <span key={f} className="chip blue" title={FID_NAMES[f]}>{f}</span>)}<span className="chip purple">{c.category}</span></div>
              <div className="acts">
                <button className="btn sm" onClick={() => onStart(c.id, 'teach')}><Icons.Play size={12} />开始练习</button>
                <button className="btn sm ghost" onClick={() => setView(c)}><Icons.Eye size={12} />查看教练</button>
              </div>
            </div>
          );
        })}
      </div>

      {view && (
        <>
          <div className="spa-overlay" onClick={() => setView(null)} />
          <div className="spa-detail">
            <button className="btn sm ghost" style={{ position: 'absolute', top: 14, right: 14 }} onClick={() => setView(null)}><Icons.X size={13} />关闭</button>
            <div className="hd" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div className="av" style={{ width: 56, height: 56, borderRadius: 16, background: view.grad, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 22, fontWeight: 900 }}>{view.role.initial}</div>
              <div><h2 style={{ fontSize: 18, fontWeight: 900 }}>{view.name}</h2><div className="card-s">{view.task}</div></div>
            </div>
            <div className="spa-cap" style={{ marginTop: 14 }}>角色设定</div>
            <div className="spa-mini">
              <div className="spa-kv"><span>客户角色</span><b>{view.role.name} · {view.role.title} · {view.role.company}</b></div>
              <div className="spa-kv"><span>性格</span><b>{view.role.traits.join(' · ')}</b></div>
              <div className="spa-kv"><span>情绪</span><b>{view.role.emotion} · 初始情绪值 {view.role.mood}</b></div>
              <div className="spa-kv"><span>本场目标</span><b style={{ textAlign: 'right', maxWidth: 320 }}>{view.goal}</b></div>
              <div className="spa-kv"><span>开场</span><b style={{ textAlign: 'right', maxWidth: 320, fontWeight: 500, fontStyle: 'italic' }}>"{view.opening}"</b></div>
            </div>
            <div className="spa-cap" style={{ marginTop: 14 }}>流程票 · {view.stages.length} 段 {ticketItems(view.stages).length} 项</div>
            {view.stages.map((s) => (
              <div className="spa-stage" key={s.id}>
                <div className="st">{s.name}</div>
                {s.items.map((it, i) => (
                  <div className={`it${it.redline ? ' red' : ''}`} key={it.id}>
                    <span className="n">{i + 1}</span>
                    <div style={{ minWidth: 0 }}><b>{it.name}</b> <span className="card-s">{it.score} 分{it.redline ? ' · 红线项' : ''}</span><p>要点：{it.points.join('；')}</p><p style={{ color: 'var(--red-3)' }}>常见错误：{it.errors.join('；')}</p></div>
                  </div>
                ))}
              </div>
            ))}
            <div className="spa-cap" style={{ marginTop: 14 }}>红线（一票否决）</div>
            <div className="spa-tags"><div className="grp">{view.redlines.map((r) => <span key={r} className="chip red"><i />{redById(r).label}</span>)}</div></div>
            <div className="spa-cap" style={{ marginTop: 14 }}>评分规则</div>
            <div className="spa-mini">
              <div className="spa-kv"><span>及格线 / 考核线</span><b>{view.passLine} / {view.examLine}</b></div>
              <div className="spa-kv"><span>对应功能</span><b style={{ textAlign: 'right' }}>{view.fids.map((f) => `${f} ${FID_NAMES[f] ?? ''}`).join('；')}</b></div>
              <div className="spa-kv"><span>我的最好成绩</span><b>{best(view) || '尚未练习'}</b></div>
            </div>
            <div className="spa-cap" style={{ marginTop: 14 }}>选择模式开始</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {MODES.map((m) => <button key={m.id} className={`btn sm ${m.tone === 'green' ? 'green' : m.tone === 'gold' ? 'gold' : ''}`} onClick={() => { setView(null); onStart(view.id, m.id); }}><Icons.Play size={12} />{m.name}</button>)}
            </div>
            <div className="card-s" style={{ marginTop: 8 }}>{MODES.map((m) => `${m.name}：${m.desc}`).join('　')}</div>
          </div>
        </>
      )}
    </div>
  );
}
