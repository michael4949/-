/** 工作台：问候 / KPI / 团队伙伴 / 今日待练 / 学时进度 / 能力雷达 / 扣分红线趋势 / 成长地图 / 练习方式 / 对标表 / 时长次数 / 岗位胜任度 */
import { useMemo } from 'react';
import * as Icons from 'lucide-react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import type { Coach } from './coaches';
import { DIMS, ASSIGNMENTS, TEAM_ROWS, TEAM_PRACTICED, TEAM_DIM_AVG, MAP_NODES, MAP_STATUS, greeting, fmtMin, modeById } from './data';
import type { Student, SessionResult, Mode } from './data';
import type { Tab } from './SparringApp';

const C = ['#e63946', '#f4b942', '#2dc48d', '#3a86ff', '#9b5de5', '#ff8c42', '#00b4d8', '#ff5da2'];
const TT = { borderRadius: 10, fontSize: 12, border: '1px solid rgba(201,162,77,.3)' };

interface Props { student: Student; coaches: Coach[]; doneAssign: string[]; results: SessionResult[]; onGo: (l: { coachId: string; mode: Mode; assignmentId?: string }) => void; onTab: (t: Tab) => void }

export default function Workbench({ student: s, coaches, doneAssign, results, onGo, onTab }: Props) {
  const radar = useMemo(() => DIMS.map((d, i) => ({ dim: d, now: s.radarNow[i], last: s.radarLast[i], team: TEAM_DIM_AVG[i] })), [s]);
  const sessions30 = s.kpi.sessions30 + results.length;
  const minutes = s.kpi.minutes + Math.round(results.reduce((a, r) => a + r.durationSec, 0) / 60);
  const avg = results.length ? Math.round((s.kpi.avg * s.kpi.sessions30 + results.reduce((a, r) => a + r.score, 0)) / sessions30) : s.kpi.avg;
  const dimsOk = s.radarNow.filter((v) => v >= 70).length;
  const assigns = ASSIGNMENTS[s.id].map((a) => ({ ...a, done: a.done || doneAssign.includes(a.id) }));
  const hoursPct = Math.round((s.hours.done / s.hours.target) * 100);
  const methodsTotal = s.methods.reduce((a, m) => a + m.value, 0);
  const coachName = (id: string) => coaches.find((c) => c.id === id)?.name ?? id;

  return (
    <div className="fade-in">
      <div className="spa-hello">
        <div className="big">{s.avatar}</div>
        <div>
          <h2>{greeting()}，{s.name}</h2>
          <p>{s.title} · {s.branch} · {s.years} · 今天有 {assigns.filter((a) => !a.done).length} 项待练任务，建议先完成团队长下发的考核。</p>
        </div>
        <div className="spa-kpis">
          <div className="spa-kpi i"><b>{sessions30}</b><span>近 30 天场次</span></div>
          <div className="spa-kpi"><b>{fmtMin(minutes)}</b><span>累计时长</span></div>
          <div className="spa-kpi g"><b>{avg}<small>+{Math.max(1, avg - Math.round(s.radarLast.reduce((a, b) => a + b, 0) / 10))}</small></b><span>平均得分</span></div>
          <div className="spa-kpi r"><b>{dimsOk}<small style={{ color: 'var(--ink-3)' }}>/ {DIMS.length}</small></b><span>达标维度（≥ 70）</span></div>
        </div>
      </div>

      <div className="spa-grid spa-c3" style={{ marginTop: 14 }}>
        <div className="card">
          <div className="card-h"><div className="card-t"><span className="dot" />团队伙伴</div><span className="chip green"><i />本月已练 {TEAM_PRACTICED.n}/{TEAM_PRACTICED.m} 人</span></div>
          <div className="spa-team-row">
            <div className="spa-avs">{TEAM_ROWS.slice(0, 14).map((r, i) => <span key={r.id} className={`av${r.practicedThisMonth ? '' : ' off'}`} style={r.practicedThisMonth ? { background: `linear-gradient(135deg, ${C[i % C.length]}, ${C[(i + 3) % C.length]})` } : undefined} title={`${r.name} · ${r.practicedThisMonth ? '本月已练' : '本月未练'}`}>{r.avatar}</span>)}<span className="av off">+{TEAM_ROWS.length - 14}</span></div>
          </div>
          <div className="card-s" style={{ marginTop: 8 }}>团队均分 {Math.round(TEAM_ROWS.reduce((a, r) => a + r.avg, 0) / TEAM_ROWS.length)} · 本月团队红线触发 {TEAM_ROWS.reduce((a, r) => a + r.red, 0)} 次 · 点击「团队看板」查看明细</div>
          <button className="btn sm ghost" style={{ marginTop: 8 }} onClick={() => onTab('team')}><Icons.Network size={12} />团队看板</button>
        </div>
        <div className="card gold">
          <div className="card-h"><div className="card-t"><span className="dot" />今日待练任务</div><span className="card-s">{assigns.filter((a) => a.done).length}/{assigns.length} 已完成</span></div>
          {assigns.map((a) => (
            <div key={a.id} className={`spa-task${a.done ? ' done' : ''}`}>
              <div className="ic">{a.done ? <Icons.Check size={18} /> : <Icons.Flag size={18} />}</div>
              <div><b>{a.title}</b><span>{a.from} · 截止 {a.due}{a.target ? ` · 目标 ≥ ${a.target} 分` : ''} · {modeById(a.mode).name}</span></div>
              {a.done ? <span className="chip green"><i />已完成</span> : <button className="btn sm" onClick={() => onGo({ coachId: a.coachId, mode: a.mode, assignmentId: a.id })}>去完成</button>}
            </div>
          ))}
        </div>
        <div className="card green">
          <div className="card-h"><div className="card-t"><span className="dot" />年度实训学时进度</div><span className="card-s">目标 {s.hours.target} 学时</span></div>
          <div className="spa-hours">
            <svg className="ring" viewBox="0 0 100 100">
              <defs><linearGradient id="wbRing" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f4b942" /><stop offset="1" stopColor="#1f8a5a" /></linearGradient></defs>
              <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(201,162,77,.18)" strokeWidth="10" />
              <circle cx="50" cy="50" r="40" fill="none" stroke="url(#wbRing)" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(hoursPct / 100) * 251.3} 251.3`} transform="rotate(-90 50 50)" />
              <text x="50" y="47" textAnchor="middle" fontSize="18" fill="#1e1b16">{hoursPct}%</text>
              <text x="50" y="62" textAnchor="middle" fontSize="9" fill="#8c8478">{s.hours.done}/{s.hours.target} 学时</text>
            </svg>
            <div className="det">{s.hours.detail.map((d) => <div key={d.name}><span>{d.name}</span><b>{d.hours} h</b></div>)}</div>
          </div>
        </div>
      </div>

      <div className="spa-grid spa-c3" style={{ marginTop: 14 }}>
        <div className="card">
          <div className="card-h"><div className="card-t"><span className="dot" />能力雷达</div><span className="card-s">本月 vs 上月 · 10 维</span></div>
          <div style={{ height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radar} cx="50%" cy="50%" outerRadius="70%">
                <defs>
                  <linearGradient id="wbRadarNow" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#e63946" stopOpacity={.7} /><stop offset="1" stopColor="#f4b942" stopOpacity={.5} /></linearGradient>
                  <linearGradient id="wbRadarLast" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#3a86ff" stopOpacity={.45} /><stop offset="1" stopColor="#00b4d8" stopOpacity={.3} /></linearGradient>
                </defs>
                <PolarGrid stroke="rgba(120,100,60,.22)" />
                <PolarAngleAxis dataKey="dim" tick={{ fontSize: 10.5, fill: '#5f5850' }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name="上月" dataKey="last" stroke="#3a86ff" strokeWidth={1.5} fill="url(#wbRadarLast)" />
                <Radar name="本月" dataKey="now" stroke="#e63946" strokeWidth={2} fill="url(#wbRadarNow)" dot={{ r: 2.5, fill: '#e63946', strokeWidth: 0 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />
                <Tooltip contentStyle={TT} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <div className="card-h"><div className="card-t"><span className="dot" />扣分与红线趋势</div><span className="card-s">近 5 周</span></div>
          <div style={{ height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={s.weekly} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="wbLineDed" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#ff8c42" /><stop offset="1" stopColor="#f4b942" /></linearGradient>
                  <linearGradient id="wbLineRed" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#e63946" /><stop offset="1" stopColor="#ff5da2" /></linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="rgba(120,100,60,.14)" />
                <XAxis dataKey="w" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="l" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="r" orientation="right" domain={[0, 4]} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TT} />
                <Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />
                <Line yAxisId="l" type="monotone" dataKey="deduct" name="周扣分合计" stroke="url(#wbLineDed)" strokeWidth={3} dot={{ r: 4, fill: '#ff8c42', strokeWidth: 0 }} />
                <Line yAxisId="r" type="monotone" dataKey="red" name="红线触发" stroke="url(#wbLineRed)" strokeWidth={3} dot={{ r: 4, fill: '#e63946', strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <div className="card-h"><div className="card-t"><span className="dot" />练习方式分布</div><span className="card-s">近 30 天 {methodsTotal} 场</span></div>
          <div style={{ height: 190 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <defs>{C.slice(0, 4).map((c, i) => <linearGradient key={i} id={`wbPie${i}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={c} stopOpacity={.95} /><stop offset="1" stopColor={C[(i + 4) % C.length]} stopOpacity={.8} /></linearGradient>)}</defs>
                <Pie data={s.methods} dataKey="value" nameKey="name" innerRadius={52} outerRadius={80} paddingAngle={3} stroke="rgba(255,255,255,.9)">
                  {s.methods.map((_, i) => <Cell key={i} fill={`url(#wbPie${i})`} />)}
                </Pie>
                <Tooltip contentStyle={TT} formatter={(v) => [`${v} 场`, '']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="spa-legend" style={{ justifyContent: 'center' }}>{s.methods.map((m, i) => <span key={m.name}><i style={{ background: `linear-gradient(135deg, ${C[i]}, ${C[(i + 4) % C.length]})` }} />{m.name} {Math.round((m.value / methodsTotal) * 100)}%</span>)}</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="card-h"><div className="card-t"><span className="dot" />学员成长地图</div>
          <div className="spa-legend">{(Object.keys(MAP_STATUS) as (keyof typeof MAP_STATUS)[]).map((k) => <span key={k}><i style={{ background: `url(#gm-${k})`, backgroundImage: k === 'done' ? 'linear-gradient(135deg,#5fd3a0,#1f8a5a)' : k === 'doing' ? 'linear-gradient(135deg,#f7e2a5,#a9843a)' : k === 'todo' ? 'linear-gradient(135deg,#ffb86b,#d9781b)' : 'linear-gradient(135deg,#c7a4ff,#9b5de5)' }} />{MAP_STATUS[k].label}</span>)}</div>
        </div>
        <GrowthMap status={s.map} />
      </div>

      <div className="spa-grid spa-c3" style={{ marginTop: 14 }}>
        <div className="card">
          <div className="card-h"><div className="card-t"><span className="dot" />能力对标</div><span className="card-s">我 vs 团队均值</span></div>
          <table className="spa-bench">
            <thead><tr><th>维度</th><th>我</th><th>团队</th><th>差距</th></tr></thead>
            <tbody>{radar.map((r) => { const d = r.now - r.team; return <tr key={r.dim}><td>{r.dim}</td><td>{r.now}</td><td>{r.team}</td><td className={d >= 0 ? 'up' : 'dn'}>{d >= 0 ? '+' : ''}{d}</td></tr>; })}</tbody>
          </table>
        </div>
        <div className="card">
          <div className="card-h"><div className="card-t"><span className="dot" />练习时长与次数</div><span className="card-s">近 5 周</span></div>
          <div style={{ height: 230 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={s.weekly} margin={{ top: 8, right: 4, left: -18, bottom: 0 }} barGap={3}>
                <defs>
                  <linearGradient id="wbBarMin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2dc48d" /><stop offset="1" stopColor="#1f8a5a" /></linearGradient>
                  <linearGradient id="wbBarCnt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f4b942" /><stop offset="1" stopColor="#e63946" /></linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="rgba(120,100,60,.14)" />
                <XAxis dataKey="w" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="l" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'rgba(201,162,77,.08)' }} contentStyle={TT} />
                <Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />
                <Bar yAxisId="l" dataKey="minutes" name="时长（分）" fill="url(#wbBarMin)" radius={[5, 5, 0, 0]} />
                <Bar yAxisId="r" dataKey="sessions" name="场次" fill="url(#wbBarCnt)" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <div className="card-h"><div className="card-t"><span className="dot" />岗位胜任度</div><span className="card-s">胜任线 {s.competencyGate}</span></div>
          <div className="spa-gauge">
            <div className={`n ${s.competency >= s.competencyGate ? 'green-text' : 'gold-text'}`}>{s.competency}</div>
            <div style={{ flex: 1 }}>
              <div className="bar"><i style={{ width: `${s.competency}%` }} /></div>
              <div className="card-s" style={{ marginTop: 6 }}>{s.competency >= s.competencyGate ? '已达到岗位胜任线，可进入晋升通道评估' : `距胜任线还差 ${s.competencyGate - s.competency} 分，重点补齐「${radar.slice().sort((a, b) => a.now - b.now)[0].dim}」`}</div>
            </div>
          </div>
          <div className="spa-cap" style={{ marginTop: 12 }}>胜任度构成</div>
          <div className="spa-kv"><span>十维能力均值（60%）</span><b>{Math.round(s.radarNow.reduce((a, b) => a + b, 0) / 10)}</b></div>
          <div className="spa-kv"><span>考核模式最好成绩（25%）</span><b>{Math.max(...Object.values(s.bestByCoach))}</b></div>
          <div className="spa-kv"><span>合规记录（15%）</span><b className={s.weekly.reduce((a, w) => a + w.red, 0) === 0 ? 'spa-tone-green' : 'spa-tone-red'}>近 5 周红线 {s.weekly.reduce((a, w) => a + w.red, 0)} 次</b></div>
          <div className="spa-cap" style={{ marginTop: 12 }}>最近场次</div>
          {[...results.map((r) => ({ d: '今天', s: r.score, coach: r.coachId })), ...s.history.slice(-3).reverse()].slice(0, 3).map((h, i) => <div className="spa-kv" key={i}><span>{h.d} · {coachName(h.coach)}</span><b className={h.s >= 70 ? 'spa-tone-green' : 'spa-tone-gold'}>{h.s}</b></div>)}
        </div>
      </div>
    </div>
  );
}

/* ---------- 成长地图（蜿蜒路径 SVG） ---------- */
function GrowthMap({ status }: { status: Student['map'] }) {
  const W = 1100, H = 210;
  const pts = MAP_NODES.map((_, i) => ({ x: 70 + i * ((W - 140) / (MAP_NODES.length - 1)), y: i % 2 === 0 ? 62 : 148 }));
  const d = pts.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `C ${pts[i - 1].x + 60} ${pts[i - 1].y}, ${p.x - 60} ${p.y}, ${p.x} ${p.y}`)).join(' ');
  const fill: Record<string, string> = { done: 'url(#gm-done)', doing: 'url(#gm-doing)', todo: 'url(#gm-todo)', plan: 'url(#gm-plan)' };
  const doneCount = status.filter((s) => s === 'done').length;
  return (
    <svg className="spa-map" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="学员成长地图">
      <defs>
        <linearGradient id="gm-path" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#1f8a5a" /><stop offset=".5" stopColor="#f4b942" /><stop offset="1" stopColor="#9b5de5" /></linearGradient>
        <linearGradient id="gm-done" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#5fd3a0" /><stop offset="1" stopColor="#1f8a5a" /></linearGradient>
        <linearGradient id="gm-doing" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f7e2a5" /><stop offset="1" stopColor="#a9843a" /></linearGradient>
        <linearGradient id="gm-todo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffb86b" /><stop offset="1" stopColor="#d9781b" /></linearGradient>
        <linearGradient id="gm-plan" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#c7a4ff" /><stop offset="1" stopColor="#9b5de5" /></linearGradient>
        <filter id="gm-glow"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <path d={d} fill="none" stroke="rgba(201,162,77,.2)" strokeWidth="10" strokeLinecap="round" />
      <path d={d} fill="none" stroke="url(#gm-path)" strokeWidth="4" strokeLinecap="round" strokeDasharray="8 6" />
      {pts.map((p, i) => {
        const st = status[i]; const cur = st === 'doing';
        return (
          <g key={i}>
            {cur && <circle cx={p.x} cy={p.y} r="22" fill="url(#gm-doing)" opacity=".28" filter="url(#gm-glow)" />}
            <circle cx={p.x} cy={p.y} r="15" fill={fill[st]} stroke="rgba(255,255,255,.95)" strokeWidth="3" />
            <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff">{st === 'done' ? '✓' : i + 1}</text>
            <text x={p.x} y={i % 2 === 0 ? p.y - 26 : p.y + 34} textAnchor="middle" fontSize="12" fontWeight="800" fill="#1e1b16">{MAP_NODES[i]}</text>
            <text x={p.x} y={i % 2 === 0 ? p.y - 12 : p.y + 48} textAnchor="middle" fontSize="10" fill={st === 'done' ? '#155e3e' : st === 'doing' ? '#9c7a2e' : '#8c8478'}>{MAP_STATUS[st].label}</text>
          </g>
        );
      })}
      <text x={W - 20} y={H - 8} textAnchor="end" fontSize="11" fill="#8c8478">已完成 {doneCount}/{MAP_NODES.length} 站</text>
    </svg>
  );
}
