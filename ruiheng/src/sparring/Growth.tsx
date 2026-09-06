/** 成长档案：学员画像 / 资质证书 / 成就徽章 / 能力标签 / 课堂 ⇄ 底座回写记录 */
import { useMemo } from 'react';
import * as Icons from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import type { Coach } from './coaches';
import { ACHIEVEMENTS, DIMS, modeById, ticketItems } from './data';
import type { Student, SessionResult } from './data';

const Ico = ({ name, size = 18 }: { name: string; size?: number }) => { const C = (Icons as unknown as Record<string, React.ComponentType<{ size?: number }>>)[name] ?? Icons.Circle; return <C size={size} />; };

export default function Growth({ student: s, coaches, results }: { student: Student; coaches: Coach[]; results: SessionResult[] }) {
  const got = useMemo(() => {
    const set = new Set(s.achievements);
    results.forEach((r) => {
      if (r.score >= 90) set.add('score-90');
      if (r.mode === 'exam' && r.score >= 90) set.add('exam-90');
      const c = coaches.find((x) => x.id === r.coachId);
      if (c && r.items.length === ticketItems(c.stages).length && r.score >= 85) set.add('full-85');
      if (r.retryItems.length === 0 && r.writeback.method.startsWith('错题重练') && r.score >= 90) set.add('retry-90');
      if (r.summary.includes('虚假陈述')) set.add('fraud-detect');
    });
    const zero = [...results.map((r) => r.redlines.length), ...s.history.map((h) => h.red)].slice(0, 5);
    if (zero.length >= 5 && zero.every((n) => n === 0)) set.add('zero-red-5');
    return set;
  }, [s, results, coaches]);
  const hist = [...s.history.map((h) => ({ d: h.d, s: h.s })), ...results.slice().reverse().map((r, i) => ({ d: `今天${results.length > 1 ? `-${i + 1}` : ''}`, s: r.score }))];
  const wbs = [...results.map((r) => ({ at: r.writeback.at, method: r.writeback.method, score: r.score, taskDone: r.writeback.taskDone })), ...s.writebacks];
  const coachName = (id: string) => coaches.find((c) => c.id === id)?.name ?? id;
  const strong = DIMS.map((d, i) => ({ d, v: s.radarNow[i] })).sort((a, b) => b.v - a.v);

  return (
    <div className="fade-in">
      <div className="spa-h"><div><h2>成长档案</h2><p>学员画像 · 资质证书 · 成就徽章 · 能力标签 · 每场陪练结束即时回写行内学习平台</p></div><span className="spa-sync"><Icons.RefreshCw size={13} />课堂 ⇄ 底座 回写正常 · 最近同步 {wbs[0]?.at ?? '—'}</span></div>
      <div className="card">
        <div className="spa-profile">
          <div className="av">{s.avatar}</div>
          <div style={{ flex: 1 }}>
            <h3>{s.name} <span className="card-s" style={{ fontWeight: 600 }}>工号 {s.empNo}</span></h3>
            <div className="kv">
              <span>岗位 <b>{s.title}</b></span><span>序列 <b>{s.sequence}</b></span><span>机构 <b>{s.branch}</b></span><span>从业 <b>{s.years}</b></span>
              <span>证书 <b>{s.certs.filter((c) => c.status === '有效').length}/{s.certs.length} 有效</b></span><span>陪练场次 <b>{s.kpi.sessions30 + results.length}（近 30 天）</b></span><span>平均得分 <b>{s.kpi.avg}</b></span><span>岗位胜任度 <b>{s.competency}</b></span>
            </div>
          </div>
          <div className="spa-tags"><div className="grp"><span className="cap">能力标签</span>{s.tags.map((t) => <span key={t} className="chip green"><i />{t}</span>)}{strong.slice(0, 2).map((x) => <span key={x.d} className="chip"><i />{x.d} {x.v}</span>)}</div></div>
        </div>
      </div>

      <div className="spa-grid spa-c3" style={{ marginTop: 14 }}>
        <div className="card gold">
          <div className="card-h"><div className="card-t"><span className="dot" />资质证书</div><span className="card-s">{s.certs.length} 项</span></div>
          {s.certs.map((c) => (
            <div key={c.name} className={`spa-cert${c.status === '待复训' ? ' warn' : ''}`}>
              <div className="ic"><Icons.BadgeCheck size={16} /></div>
              <div style={{ flex: 1 }}><b>{c.name}</b><span>{c.org} · 取得 {c.date}</span></div>
              <span className={`chip ${c.status === '有效' ? 'green' : 'orange'}`}><i />{c.status}</span>
            </div>
          ))}
        </div>
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="card-h"><div className="card-t"><span className="dot" />成就徽章</div><span className="card-s">已获得 {got.size}/{ACHIEVEMENTS.length}</span></div>
          <div className="spa-badges">
            {ACHIEVEMENTS.map((a) => (
              <div key={a.id} className={`spa-badge ${a.tone}${got.has(a.id) ? '' : ' lock'}`} title={a.rule}>
                <div className="ic">{got.has(a.id) ? <Ico name={a.icon} /> : <Icons.Lock size={16} />}</div>
                <b>{a.name}</b><span>{a.rule}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="spa-grid spa-c23" style={{ marginTop: 14 }}>
        <div className="card">
          <div className="card-h"><div className="card-t"><span className="dot" />得分轨迹</div><span className="card-s">最近 {hist.length} 场</span></div>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={hist} margin={{ top: 8, right: 10, left: -18, bottom: 0 }}>
                <defs><linearGradient id="grLine" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#00b4d8" /><stop offset=".5" stopColor="#2dc48d" /><stop offset="1" stopColor="#f4b942" /></linearGradient></defs>
                <CartesianGrid vertical={false} stroke="rgba(120,100,60,.14)" />
                <XAxis dataKey="d" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis domain={[40, 100]} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                <Line type="monotone" dataKey="s" name="得分" stroke="url(#grLine)" strokeWidth={3} dot={{ r: 4, fill: '#ff8c42', strokeWidth: 0 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="spa-cap" style={{ marginTop: 10 }}>最近场次</div>
          {[...results.map((r) => ({ d: '今天', coach: r.coachId, mode: r.mode, s: r.score, red: r.redlines.length })), ...s.history.slice().reverse()].slice(0, 5).map((h, i) => (
            <div className="spa-kv" key={i}><span>{h.d} · {coachName(h.coach)} · {modeById(h.mode).short}</span><b className={h.red ? 'spa-tone-red' : h.s >= 70 ? 'spa-tone-green' : 'spa-tone-gold'}>{h.s} 分{h.red ? ` · 红线 ${h.red}` : ''}</b></div>
          ))}
        </div>
        <div className="card green">
          <div className="card-h"><div className="card-t"><span className="dot" />课堂 ⇄ 底座 回写记录</div><span className="card-s">每场结束即时回写行内学习平台</span></div>
          <table className="spa-wb">
            <thead><tr><th>时间</th><th>工号</th><th>练习方式</th><th>得分</th><th>任务完成</th><th>状态</th></tr></thead>
            <tbody>
              {wbs.map((w, i) => (
                <tr key={i}><td>{w.at}</td><td>{s.empNo}</td><td>{w.method}</td><td><b className={w.score >= 70 ? 'spa-tone-green' : 'spa-tone-gold'}>{w.score}</b></td><td>{w.taskDone ? <span className="chip green"><i />是</span> : <span className="chip orange"><i />否</span>}</td><td><span className="chip"><i />已回写</span></td></tr>
              ))}
            </tbody>
          </table>
          <div className="card-s" style={{ marginTop: 8 }}>回写字段：工号、练习方式、得分、任务完成；逐句对话内容不回写，仅本人可见。</div>
        </div>
      </div>
    </div>
  );
}
