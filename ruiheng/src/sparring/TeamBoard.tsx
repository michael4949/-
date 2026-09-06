/** 团队看板（管理）：团队成员表 / 团队雷达 / 待练任务下发表单 */
import { useMemo, useState } from 'react';
import * as Icons from 'lucide-react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, Tooltip } from 'recharts';
import type { Coach } from './coaches';
import { DIMS, MODES, TEAM_ROWS, TEAM_DIM_AVG, TEAM_PRACTICED } from './data';
import type { Student, Mode } from './data';

type SortKey = 'sessions' | 'avg' | 'red' | 'taskRate';

export default function TeamBoard({ student, coaches, onToast }: { student: Student; coaches: Coach[]; onToast: (t: string) => void }) {
  const [sort, setSort] = useState<SortKey>('avg');
  const [branch, setBranch] = useState('全部');
  const [form, setForm] = useState({ title: '完整尽调访谈流程（考核模式）', coachId: 'dd-interview', mode: 'exam' as Mode, due: '2026-09-12', target: 75, members: ['m1', 'm4', 'm6'] });
  const rows = useMemo(() => TEAM_ROWS.filter((r) => branch === '全部' || r.branch === branch).slice().sort((a, b) => (sort === 'red' ? a.red - b.red : b[sort] - a[sort])), [sort, branch]);
  const radar = DIMS.map((d, i) => ({ dim: d, team: TEAM_DIM_AVG[i], me: student.radarNow[i] }));
  const toggle = (id: string) => setForm((f) => ({ ...f, members: f.members.includes(id) ? f.members.filter((m) => m !== id) : [...f.members, id] }));
  const submit = () => { onToast(`已向 ${form.members.length} 位成员下发「${form.title}」· 截止 ${form.due}`); };
  const H = ({ k, label }: { k: SortKey; label: string }) => <th style={{ cursor: 'pointer' }} onClick={() => setSort(k)}>{label}{sort === k ? ' ▾' : ''}</th>;
  return (
    <div className="fade-in">
      <div className="spa-h">
        <div><h2>团队看板 <span className="chip purple" style={{ verticalAlign: 'middle' }}>管理</span></h2><p>{TEAM_ROWS.length} 名成员 · 本月已练 {TEAM_PRACTICED.n}/{TEAM_PRACTICED.m} 人 · 团队均分 {Math.round(TEAM_ROWS.reduce((a, r) => a + r.avg, 0) / TEAM_ROWS.length)} · 红线合计 {TEAM_ROWS.reduce((a, r) => a + r.red, 0)}</p></div>
        <div className="spa-sw">{['全部', '城东支行', '高新支行'].map((b) => <button key={b} className={branch === b ? 'on' : ''} onClick={() => setBranch(b)}>{b}</button>)}</div>
      </div>
      <div className="spa-grid spa-c32">
        <div className="card">
          <div className="card-h"><div className="card-t"><span className="dot" />团队成员</div><span className="card-s">点击表头排序 · 仅汇总统计，不显示逐句记录</span></div>
          <div className="spa-team-wrap">
            <table className="spa-team-tbl">
              <thead><tr><th>成员</th><th>机构</th><H k="sessions" label="场次（30 天）" /><H k="avg" label="均分" /><H k="red" label="红线" /><H k="taskRate" label="待练任务完成率" /><th>本月</th></tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id} style={r.name === student.name ? { fontWeight: 800 } : undefined}>
                    <td><span className="nm"><span className="av" style={{ background: `linear-gradient(135deg, ${['#e63946', '#f4b942', '#2dc48d', '#3a86ff', '#9b5de5', '#ff8c42', '#00b4d8', '#ff5da2'][i % 8]}, #c9a24d)` }}>{r.avatar}</span>{r.name}{r.name === student.name && <span className="chip" style={{ padding: '0 6px', fontSize: 10 }}>当前学员</span>}</span></td>
                    <td>{r.branch}</td><td>{r.sessions}</td>
                    <td><span className={r.avg >= 75 ? 'spa-tone-green' : r.avg >= 60 ? 'spa-tone-gold' : 'spa-tone-red'} style={{ fontWeight: 800 }}>{r.avg}</span></td>
                    <td>{r.red ? <span className="chip red" style={{ padding: '0 7px', fontSize: 10.5 }}>{r.red}</span> : <span className="chip green" style={{ padding: '0 7px', fontSize: 10.5 }}>0</span>}</td>
                    <td><span className="bar"><i style={{ width: `${r.taskRate}%` }} /></span>{r.taskRate}%</td>
                    <td>{r.practicedThisMonth ? <Icons.CheckCircle2 size={14} color="#1f8a5a" /> : <Icons.Circle size={14} color="#c9c2b4" />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card">
            <div className="card-h"><div className="card-t"><span className="dot" />团队雷达</div><span className="card-s">团队均值 vs {student.name}</span></div>
            <div style={{ height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radar} cx="50%" cy="50%" outerRadius="70%">
                  <defs>
                    <linearGradient id="tbTeam" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#3a86ff" stopOpacity={.5} /><stop offset="1" stopColor="#00b4d8" stopOpacity={.3} /></linearGradient>
                    <linearGradient id="tbMe" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ff5da2" stopOpacity={.6} /><stop offset="1" stopColor="#f4b942" stopOpacity={.4} /></linearGradient>
                  </defs>
                  <PolarGrid stroke="rgba(120,100,60,.22)" />
                  <PolarAngleAxis dataKey="dim" tick={{ fontSize: 10.5, fill: '#5f5850' }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="团队均值" dataKey="team" stroke="#3a86ff" strokeWidth={2} fill="url(#tbTeam)" />
                  <Radar name={student.name} dataKey="me" stroke="#ff5da2" strokeWidth={2} fill="url(#tbMe)" dot={{ r: 2.5, fill: '#ff5da2', strokeWidth: 0 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />
                  <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="card gold">
            <div className="card-h"><div className="card-t"><span className="dot" />待练任务下发</div><span className="card-s">团队长 / 支行行长</span></div>
            <div className="spa-form">
              <div className="full"><label className="spa-lbl">任务名称</label><input className="spa-inp" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><label className="spa-lbl">教练</label><select className="spa-inp" value={form.coachId} onChange={(e) => setForm({ ...form, coachId: e.target.value })}>{coaches.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div><label className="spa-lbl">模式</label><select className="spa-inp" value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value as Mode })}>{MODES.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
              <div><label className="spa-lbl">截止日期</label><input className="spa-inp" type="date" value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} /></div>
              <div><label className="spa-lbl">目标分数</label><input className="spa-inp" type="number" value={form.target} onChange={(e) => setForm({ ...form, target: Number(e.target.value) })} /></div>
              <div className="full"><label className="spa-lbl">下发对象（{form.members.length} 人）</label>
                <div className="spa-chk-list">{TEAM_ROWS.map((r) => <label key={r.id} className={form.members.includes(r.id) ? 'on' : ''}><input type="checkbox" hidden checked={form.members.includes(r.id)} onChange={() => toggle(r.id)} />{r.name}</label>)}</div>
              </div>
              <div className="full" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button className="btn" onClick={submit} disabled={!form.members.length}><Icons.Send size={13} />下发任务</button>
                <button className="btn ghost sm" onClick={() => setForm({ ...form, members: TEAM_ROWS.filter((r) => r.avg < 70).map((r) => r.id) })}>选中均分低于 70 的成员</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
