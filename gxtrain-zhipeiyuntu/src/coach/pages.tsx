/* 陪练中心各页：工作台 / 教练中心 / 评分复盘 / 成长档案 / 知识课堂 / 班组看板 / 教练编辑器 / 公司看板 */
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { STEPS, KNOW } from './script'
import { HOME_USER, LEAD_USER, DEPT_USER, DIMS6, DIMS10, DIM10_DESC, DIM_PLAN, RADAR_NOW, RADAR_PREV, TEAM_AVG, RADAR10_NOW, RADAR10_PREV, RADAR10_OLD, TEAM_AVG10,
  SESSIONS, HOME_TASK, FITNESS, HOUR_LOG, COACHES, COACH_FAMS, COACH_GLYPH, RECO, MYCOACH, COACH_APPLY, TEAM, REDLINES, MILESTONES, LADDER, GROWTH_NODES, GROWTH_EDGES,
  CLASSROOM, ARCH_IF, COURSE_LIB, COURSES, QUIZ, LMAP_MASTERY, LMAP_PLAN, BADGES, SAMPLE_TICKET, RED_NAMES, KB_FILES, ED_TPL, ED_SAMPLE_VIO, COMPANY_BOARD, PLANS, planId, LS, lsGet, lsSet, CHARACTERS } from './data'
import type { Session, Coach, RoleKey, Line, Vio } from './data'
import { COACH_IMGS } from './images'
import { Radar, Combo, Donut, Area, Heat, Gauge, SessionCurve, MiniBars, GrowthMap, dayLabel, dateAfter, heatBg } from './charts'
import { retrieve, missingSegs, sim } from './engine'
import { DigitalHuman } from './DigitalHuman'

/* ---------- 上下文 ---------- */
export type Ctx = { go: (h: string) => void; train: (plan: string | null) => void; drill: (d: DrillDef | null) => void; role: RoleKey; setRole: (r: RoleKey) => void; toast: (t: string) => void }
export type DrillDef = { title: string; sub?: string; body: React.ReactNode; foot?: React.ReactNode }
export const CoachCtx = createContext<Ctx>({ go: () => {}, train: () => {}, drill: () => {}, role: 'student', setRole: () => {}, toast: () => {} })
const useCtx = () => useContext(CoachCtx)

/* ---------- 数据推导 ---------- */
export function homeAgg() {
  const byDay: Record<number, { min: number; cnt: number }> = {}
  SESSIONS.forEach(s => { byDay[s.d] = byDay[s.d] || { min: 0, cnt: 0 }; byDay[s.d].min += s.dur; byDay[s.d].cnt += 1 })
  const planCnt: Record<string, number> = {}
  SESSIONS.forEach(s => { const k = s.plan.startsWith('专项') ? '专项练习' : s.plan.startsWith('分段') ? '分段练习' : s.plan.startsWith('完整') ? '完整操作票' : '错题重练'; planCnt[k] = (planCnt[k] || 0) + 1 })
  const weeks = [0, 0, 0, 0, 0], reds = [0, 0, 0, 0, 0]
  SESSIONS.forEach(s => { const w = Math.min(4, Math.floor(s.d / 7)); s.vio.forEach(v => { weeks[w] += v.lv === 'red' ? 10 : v.lv === 'major' ? 5 : 2; if (v.lv === 'red') reds[w] += 1 }) })
  const totalMin = SESSIONS.reduce((a, s) => a + s.dur, 0); const avg = Math.round(SESSIONS.reduce((a, s) => a + s.score, 0) / SESSIONS.length)
  return { byDay, planCnt, weeks, reds, totalMin, avg, cnt: SESSIONS.length }
}
function estDims(s: Session) { const A = homeAgg(); return RADAR_NOW.map((v, i) => Math.max(30, Math.min(100, Math.round(v + (s.score - A.avg) * .7 + ((s.d * 7 + i * 13) % 7) - 3)))) }
function mockLines(s: Session): Line[] {
  const P = PLANS.find(p => p.id === planId(s.plan)); if (!P) return []
  const idx = P.steps().slice(0, 7); const out: Line[] = []
  idx.forEach((i, k) => {
    const st = STEPS[i]; if (!st || !st.recite) return
    let mine = st.recite; const v = s.vio.find(x => x.step === st.no)
    if (v && /双重名称|复诵/.test(v.t)) mine = mine.replace('培训三线', '').replace('线路侧', '')
    else if (v && /唱读|核对/.test(v.t)) mine = mine.replace(/在(分|合)闸位置$/, '')
    else if (k === 2 && s.mode === '教学模式') mine = mine.replace('110kV仿真站', '')
    out.push({ step: st.no, beat: 1, t: st.ticket, mine, std: st.recite })
    if (st.report && k % 3 === 1) out.push({ step: st.no, beat: 4, t: st.ticket, mine: st.report, std: st.report })
  })
  return out
}
export function unifySessions(): Session[] {
  const local = lsGet<Session[]>(LS.sessions, []).map((s, i) => ({ ...s, id: 'L' + i, real: true, d: Math.max(0, Math.round((Date.now() - (s.ts || Date.now())) / 864e5)) }))
  const mock = SESSIONS.map((s, i) => ({ ...s, id: 'M' + i, real: false, dims: estDims(s), lines: mockLines(s), praise: s.praise || [] }))
  return local.concat(mock)
}
function planStepsOf(s: Session) { const P = PLANS.find(p => p.id === planId(s.plan)); let idx = P ? P.steps() : []; if (!idx.length) idx = STEPS.map((_, i) => i).slice(0, 8); return idx.map(i => STEPS[i]) }
export function vioDim(v: Vio) { const t = v.t; if (/核对|指示/.test(t)) return '设备状态核对'; if (/复诵|唱票|双重名称/.test(t)) return '唱票复诵'; if (/接令|术语|用语|汇报/.test(t)) return '调度术语'; if (/验电|接地|规程|记录/.test(t)) return '规程记忆'; if (/异常|中止/.test(t)) return '异常处置'; return '风险辨识' }
const hourLog = () => HOUR_LOG.concat(lsGet<typeof HOUR_LOG>(LS.hours, [])).slice().sort((a, b) => a.d - b.d)
const hoursAdd = (n: string, h: number) => { const l = lsGet<typeof HOUR_LOG>(LS.hours, []); l.unshift({ d: 0, n, h, src: '陪练回写' }); lsSet(LS.hours, l.slice(0, 20)) }
const customCoaches = (): Coach[] => lsGet<{ id: string; n: string; fam: string; dom: string; steps: number; reds: number; avatar: string }[]>(LS.coaches, []).map(c => ({ id: c.id, n: c.n, fam: c.fam, dom: c.dom, unit: '本单位自建', open: false, custom: true, lvl: 2, min: Math.max(10, Math.round(c.steps * 1.6)), users: 0, gain: 0, tags: ['唱票复诵', '设备状态核对'], desc: `由教练编辑器发布 · ${c.steps} 项操作票 · 红线 ${c.reds} 条 · 待班组长审核开通`, avatar: c.avatar }))
const ALL = () => COACHES.concat(customCoaches())
const applyList = () => { const a = lsGet<typeof COACH_APPLY>(LS.apply, []); return a.length ? a : COACH_APPLY }
const Tag = ({ lv }: { lv: string }) => <span className={`ctag ${lv === 'red' ? 'rl' : lv === 'major' ? 'wn' : ''}`}>{lv === 'red' ? '一票否决' : lv === 'major' ? '严重' : '不规范'}</span>
function SessTable({ list }: { list: Session[] }) {
  return <table className="htbl"><thead><tr><th>日期</th><th>练习方式</th><th>模式</th><th>用时</th><th>得分</th><th>扣分项</th></tr></thead><tbody>{list.map((s, i) => <tr key={i}><td className="mono">{s.real ? '今天' : dayLabel(s.d)}</td><td>{s.plan}</td><td>{s.mode}</td><td className="mono">{s.dur} 分钟</td><td className={`mono ${s.score < 75 ? 'wv' : ''}`}>{s.score}</td><td>{s.vio.length ? s.vio.length + ' 项' : '—'}</td></tr>)}</tbody></table>
}
const Sec = ({ t, children }: { t: string; children: React.ReactNode }) => <div className="csec"><div className="cst">{t}</div><div className="csc">{children}</div></div>
const Hcard = ({ t, sub, extra, children, cls, ai }: { t: string; sub?: string; extra?: React.ReactNode; children: React.ReactNode; cls?: string; ai?: string }) => <section className={`hcard ${cls || ''}`}><div className="hch"><b>{t}</b>{ai && <em className="ai">{ai}</em>}{sub && <span>{sub}</span>}{extra && <span className="phr">{extra}</span>}</div><div className="hcb">{children}</div></section>
const Kpi = ({ v, k, cls }: { v: React.ReactNode; k: string; cls?: string }) => <div className={`kpi ${cls || ''}`}><b>{v}</b><span>{k}</span></div>
const Av = ({ c, size = 44 }: { c: Coach; size?: number }) => COACH_IMGS[c.avatar || c.id] ? <img className="cav" style={{ width: size, height: size }} src={COACH_IMGS[c.avatar || c.id]} alt={c.n} /> : <div className="cav" style={{ width: size, height: size }}>{COACH_GLYPH[c.fam] || '练'}</div>

/* ---------- 下钻 ---------- */
export function useDrills() {
  const ctx = useCtx()
  const drillDim = (i: number) => {
    const n = DIMS6[i]; const hints = SESSIONS.filter(s => s.hints.some(h => h[0] === n)); const vios = SESSIONS.flatMap(s => s.vio.filter(v => vioDim(v) === n).map(v => ({ ...v, d: s.d }))); const sp = DIM_PLAN[n]
    ctx.drill({ title: `能力明细 · ${n}`, sub: `本月 ${RADAR_NOW[i]} 分 · 上月 ${RADAR_PREV[i]} 分 · 班组均值 ${TEAM_AVG[i]} 分`, body: <>
      <Sec t="相关扣分记录（近30天）">{vios.length ? <table className="htbl"><thead><tr><th>日期</th><th>第几项</th><th>扣分内容</th><th>依据</th></tr></thead><tbody>{vios.map((v, k) => <tr key={k}><td className="mono">{dayLabel(v.d)}</td><td className="mono">第{v.step}项</td><td><Tag lv={v.lv} />{v.t}</td><td className="mono">{v.cite}</td></tr>)}</tbody></table> : '近30天该维度无扣分记录。'}</Sec>
      <Sec t="提示使用记录">{hints.length ? hints.map((s, k) => <div key={k} className="hrow"><span className="mono">{dayLabel(s.d)}</span> {s.plan} · {s.hints.filter(h => h[0] === n).map(h => h[1]).join('、')}</div>) : '近30天该维度未使用提示。'}</Sec></>,
      foot: <>{sp && <button className="btn btn-primary" onClick={() => { ctx.drill(null); ctx.train(sp[0]) }}>练「{sp[1]}」专项</button>}<button className="btn" onClick={() => { ctx.drill(null); ctx.go('review') }}>打开评分复盘</button></> })
  }
  const drillDay = (d: number) => { const list = SESSIONS.filter(s => s.d === d); ctx.drill({ title: `练习明细 · ${dayLabel(d)}`, sub: `${list.length} 场 · 合计 ${list.reduce((a, s) => a + s.dur, 0)} 分钟`, body: <SessTable list={list} />, foot: <button className="btn" onClick={() => { ctx.drill(null); ctx.go('review') }}>打开评分复盘</button> }) }
  const drillPlan = (k: string) => { const list = SESSIONS.filter(s => (k === '专项练习' && s.plan.startsWith('专项')) || (k === '分段练习' && s.plan.startsWith('分段')) || (k === '完整操作票' && s.plan.startsWith('完整')) || (k === '错题重练' && s.plan.startsWith('错题'))); ctx.drill({ title: `练习方式明细 · ${k}`, sub: `近30天 ${list.length} 场`, body: <SessTable list={list} />, foot: <button className="btn" onClick={() => { ctx.drill(null); ctx.go('review') }}>打开评分复盘</button> }) }
  const drillWeek = (w: number) => { const A = homeAgg(); const vios = SESSIONS.filter(s => Math.min(4, Math.floor(s.d / 7)) === w && s.vio.length).flatMap(s => s.vio.map(v => ({ ...v, d: s.d, plan: s.plan }))); ctx.drill({ title: `扣分明细 · ${w === 0 ? '本周' : w + ' 周前'}`, sub: `扣分 ${A.weeks[w]} · 红线 ${A.reds[w]} 次`, body: vios.length ? <table className="htbl"><thead><tr><th>日期</th><th>场次</th><th>扣分内容</th><th>依据</th></tr></thead><tbody>{vios.map((v, k) => <tr key={k}><td className="mono">{dayLabel(v.d)}</td><td>{v.plan}</td><td><Tag lv={v.lv} />第{v.step}项 {v.t}</td><td className="mono">{v.cite}</td></tr>)}</tbody></table> : '当周无扣分记录。', foot: <button className="btn" onClick={() => { ctx.drill(null); ctx.go('review') }}>打开评分复盘</button> }) }
  const drillFit = () => ctx.drill({ title: `岗位胜任度构成 · ${FITNESS.post}`, sub: `综合测算 ${FITNESS.pct}%`, body: <><table className="htbl"><thead><tr><th>构成项</th><th>当前</th><th>要求</th><th>状态</th></tr></thead><tbody>{FITNESS.parts.map(p => <tr key={p.n}><td>{p.n}</td><td className="mono">{p.v}</td><td className="mono">{p.need}</td><td>{p.ok ? <span className="ctag ok">达标</span> : <span className="ctag wn">待补齐</span>}</td></tr>)}</tbody></table><Sec t="差距项">{FITNESS.parts.filter(p => !p.ok).map(p => <div key={p.n} className="hrow">· {p.gap}</div>)}</Sec><div className="tk3">胜任度为系统测算参考，任职资格评定以人工审核结果为准。</div></>, foot: <><button className="btn" onClick={() => { ctx.drill(null); ctx.go('growth') }}>查看成长档案</button><button className="btn btn-primary" onClick={() => { ctx.drill(null); ctx.train('full') }}>去完成演练场次</button></> })
  const nodeClick = (id: string) => {
    if (id === 'g5') return drillDim(2); if (id === 'g6') return ctx.train('full'); if (id === 'g7') return drillFit(); if (id === 'b1') return ctx.go('classroom')
    if (id === 'g1') return ctx.drill({ title: '岗前培训', sub: '入职培训记录', body: <table className="htbl"><thead><tr><th>项目</th><th>结果</th><th>日期</th></tr></thead><tbody><tr><td>入职集中培训</td><td><span className="ctag ok">结业</span></td><td className="mono">2024-08-30</td></tr><tr><td>导师带教期</td><td><span className="ctag ok">通过</span></td><td className="mono">2025-02-28</td></tr></tbody></table>, foot: <button className="btn" onClick={() => { ctx.drill(null); ctx.go('growth') }}>查看成长档案</button> })
    if (id === 'g2') return ctx.drill({ title: '安规考试 · 变电部分', sub: '年度考试与复训', body: <table className="htbl"><thead><tr><th>项目</th><th>成绩/状态</th><th>日期</th></tr></thead><tbody><tr><td>年度安规笔试</td><td className="mono gv">92 分</td><td className="mono">{dayLabel(80)}</td></tr><tr><td>安规修编后复训</td><td><span className="ctag wn">待安排</span></td><td className="mono">—</td></tr></tbody></table>, foot: <button className="btn" onClick={() => { ctx.drill(null); ctx.go('classroom') }}>查看知识课堂</button> })
    if (id === 'g3') { const l = SESSIONS.filter(s => s.mode === '教学模式' && s.plan.startsWith('完整')); return ctx.drill({ title: '完整票 · 教学模式', sub: `${l.length} 场`, body: <SessTable list={l} /> }) }
    if (id === 'g4') { const l = SESSIONS.filter(s => s.plan.startsWith('分段') || s.plan.startsWith('专项')); return ctx.drill({ title: '分段与专项强化', sub: `近30天 ${l.length} 场`, body: <SessTable list={l} /> }) }
    if (id === 'g8') return ctx.drill({ title: '晋升通道 · 主值', sub: '当前差距项', body: <><table className="htbl"><thead><tr><th>差距项</th><th>当前</th><th>要求</th></tr></thead><tbody>{FITNESS.parts.filter(p => !p.ok).map(p => <tr key={p.n}><td>{p.n}</td><td className="mono">{p.v}</td><td className="mono">{p.need}</td></tr>)}</tbody></table><div className="tk3">晋升资格以人工审核结果为准。</div></>, foot: <button className="btn btn-primary" onClick={() => { ctx.drill(null); ctx.train('full') }}>去完成演练场次</button> })
    if (id === 'b2') return ctx.drill({ title: '实操场次', sub: '12 / 15 场（胜任度要求）', body: <SessTable list={SESSIONS} />, foot: <button className="btn btn-primary" onClick={() => { ctx.drill(null); ctx.train('full') }}>去完成任务</button> })
  }
  return { drillDim, drillDay, drillPlan, drillWeek, drillFit, nodeClick }
}

/* ================= 工作台 ================= */
export function HomePage() {
  const ctx = useCtx(); const D = useDrills(); const A = homeAgg()
  const okDims = RADAR_NOW.filter(v => v >= 70).length; const last = SESSIONS[0]
  const xwFull = `近两场「设备状态核对」都使用了提示，短板集中在 GIS 四项位置指示；班组长下发的${HOME_TASK.name}${dateAfter(HOME_TASK.dueDays)}截止，建议先完成任务，再加练一轮「GIS 四项核对」专项。`
  const [typed, setTyped] = useState('')
  useEffect(() => { let i = 0; const t = setInterval(() => { i += 1; setTyped(xwFull.slice(0, i)); if (i >= xwFull.length) clearInterval(t) }, 22); return () => clearInterval(t) }, [])
  const h = new Date().getHours(); const greet = h < 6 ? '夜深了' : h < 9 ? '早上好' : h < 12 ? '上午好' : h < 18 ? '下午好' : '晚上好'
  const d = new Date(); const today = `${d.getMonth() + 1}月${d.getDate()}日 周${'日一二三四五六'[d.getDay()]}`
  const applies = applyList()
  return (
    <div className="hpage">
      <section className="hero">
        <div className="hgreet"><h1>{greet}，{HOME_USER.name}</h1><div className="hsub">{HOME_USER.unit} · {HOME_USER.team} · {HOME_USER.post} · 今天 {today}</div>
          <div className="hkpis"><Kpi v={A.cnt} k="近30天场次" /><Kpi v={(A.totalMin / 60).toFixed(1) + 'h'} k="累计时长" /><Kpi v={A.avg} k="平均得分" /><Kpi v={`${okDims}/6`} k="达标维度" cls={okDims < 6 ? 'warn' : 'good'} /></div>
          <div className="hteam"><span className="lb">班组伙伴</span>{TEAM.map(m => <i key={m.n} className={`tm ${m.n === HOME_USER.name ? 'me' : m.sess === 0 ? 'idle' : ''}`} title={`${m.n} · ${m.sess ? '近30天 ' + m.sess + ' 场' : '本月未练'}`}>{m.n.slice(0, 1)}</i>)}<span className="tmx" onClick={() => ctx.go('team')}>{TEAM.filter(m => m.sess).length}/{TEAM.length} 人本月已练</span></div></div>
        <div className="taskcard"><div className="tk1">今日待练任务</div><div className="tk2">{HOME_TASK.name}</div><div className="tk3">{HOME_TASK.from} 下发 · {dateAfter(HOME_TASK.dueDays)}截止 · 未完成</div><button className="btn btn-primary" onClick={() => ctx.train('full')}>去完成</button></div>
        <div className="hourcard"><div className="tk1">年度培训学时</div><div className="hbar"><div className="hfill" style={{ width: `${Math.round(HOME_USER.hours.done / HOME_USER.hours.need * 100)}%` }} /></div><div className="tk3"><b className="mono">{HOME_USER.hours.done}</b> / {HOME_USER.hours.need} 学时 · 知识课堂回写</div><button className="btn" onClick={() => ctx.go('classroom')}>学时明细</button></div>
      </section>
      <section className="cockpit">
        <Hcard cls="ck tl" t="能力六维" sub="本月 vs 上月"><Radar dims={DIMS6} now={RADAR_NOW} prev={RADAR_PREV} w={330} h={236} onDim={D.drillDim} /></Hcard>
        <Hcard cls="ckc" t="学员成长地图" ai="AI" sub={`${HOME_USER.name} · ${HOME_USER.post} · 同步于 今日 07:30`}><GrowthMap nodes={GROWTH_NODES.map(n => n.id === 'g6' ? { ...n, v: dateAfter(HOME_TASK.dueDays) + '截止' } : n)} edges={GROWTH_EDGES} onNode={D.nodeClick} /></Hcard>
        <Hcard cls="ck tr" t="练习方式分布" sub="近30天 · 按场次"><Donut cnt={A.planCnt} onPlan={D.drillPlan} /></Hcard>
        <Hcard cls="ck bl" t="扣分与红线趋势" sub="近5周 · 周合计"><Area weeks={A.weeks} reds={A.reds} onWeek={D.drillWeek} /></Hcard>
        <Hcard cls="ck br" t="能力对标" sub="我 vs 班组均值（组织级口径）"><Heat dims={DIMS6} mine={RADAR_NOW} team={TEAM_AVG} onDim={D.drillDim} /></Hcard>
      </section>
      <section className="cockpit2">
        <Hcard t="练习时长与次数" sub="近30天 · 按日"><Combo byDay={A.byDay} w={720} h={190} onDay={D.drillDay} /></Hcard>
        <Hcard t="岗位胜任度" sub={FITNESS.post}><Gauge pct={FITNESS.pct} post={FITNESS.post} onClick={D.drillFit} /></Hcard>
      </section>
      <section className="reco">
        {RECO.map(r => { const c = COACHES.find(x => x.id === r.coach)!; return <div key={r.coach} className="rcard"><div className="rwhy"><i className="ai">AI 推荐</i>{r.why}</div><b>{c.n}</b><div className="tk3">{c.fam} · {c.min} 分钟 · 已练 {c.users} 人 · 平均提分 +{c.gain}</div><button className={`btn ${c.open ? 'btn-primary' : ''}`} onClick={() => c.open ? ctx.train(r.pre) : ctx.go('plaza')}>{r.act}</button></div> })}
        <div className="rcard"><div className="rwhy"><i>最近复盘</i>{dayLabel(last.d)}</div><b>{last.plan} · {last.score} 分</b><div className="tk3">{last.mode} · 用时 {last.dur} 分钟 · 扣分 {last.vio.length} 项</div><div className="tk3">GIS 四项核对仍依赖提示，其余节拍完整。</div><button className="btn" onClick={() => ctx.go('review')}>查看复盘</button></div>
      </section>
      <section className="xwbar"><div className="xwavt"><i />智培教练</div><div className="xwtxt">{typed}</div><div className="xwbtns"><button className="btn btn-primary" onClick={() => ctx.train('full')}>去完成任务</button><button className="btn" onClick={() => ctx.train('sp_gis')}>练 GIS 专项</button></div><div className="xwsrc">由近30天练习数据生成</div></section>
      <section className="mycoach"><div className="mch"><b>我在练的教练</b><span>本单位已为我开通 {ALL().filter(c => c.open).length} 位 · 开通申请 {applies.length} 条</span><button className="btn" onClick={() => ctx.go('plaza')}>去教练中心</button></div>
        <div className="mcrow">{MYCOACH.map(mc => { const c = ALL().find(x => x.id === mc.id)!; return <div key={mc.id} className="mcc"><Av c={c} /><div className="mcm"><b>{c.n}</b><span>最近一次 {mc.last} · 已练 {mc.cnt} 场 · 最近得分 {mc.score}</span><div className="mcbar"><i style={{ width: `${mc.prog}%` }} /></div><span className="mcp">本教练剧本已练 {mc.prog}%</span></div><button className="btn btn-primary" onClick={() => ctx.train(null)}>继续练</button></div> })}
          {applies.map(a => { const c = ALL().find(x => x.id === a.id); if (!c) return null; return <div key={a.id} className="mcc apply"><Av c={c} /><div className="mcm"><b>{c.n}</b><span>{a.at} · {a.st}</span><span className="mcp">开通后出现在本条，可直接开练</span></div><button className="btn" onClick={() => ctx.go('plaza')}>查看</button></div> })}</div></section>
    </div>)
}

/* ================= 教练中心 ================= */
export function PlazaPage() {
  const ctx = useCtx()
  const [pf, setPf] = useState({ fam: '全部', dom: '全部', tag: '全部', unit: '全部' })
  const [, force] = useState(0)
  const ALLC = ALL(); const applies = applyList()
  const doms = ['全部', ...new Set(ALLC.filter(c => pf.fam === '全部' || c.fam === pf.fam).map(c => c.dom))]
  const tags = ['全部', ...new Set(ALLC.flatMap(c => c.tags))]
  const units = ['全部', ...new Set(ALLC.map(c => c.unit))]
  const list = ALLC.filter(c => (pf.fam === '全部' || c.fam === pf.fam) && (pf.dom === '全部' || c.dom === pf.dom) && (pf.tag === '全部' || c.tags.includes(pf.tag)) && (pf.unit === '全部' || c.unit === pf.unit))
  const openN = ALLC.filter(c => c.open).length, cusN = ALLC.length - COACHES.length; const hot = ALLC.slice().sort((a, b) => b.users - a.users)[0]
  const apply = (c: Coach) => { if (applies.some(a => a.id === c.id)) return ctx.toast('该教练的开通申请已提交'); const d = new Date(); const l = applies.concat({ id: c.id, at: `${d.getMonth() + 1}月${d.getDate()}日 提交`, st: '培训专责审核中' }); lsSet(LS.apply, l); ctx.toast(`已向培训专责提交「${c.n}」开通申请`); force(x => x + 1) }
  const chip = (f: keyof typeof pf, v: string) => <span key={v} className={`fchip ${pf[f] === v ? 'on' : ''}`} onClick={() => setPf(p => ({ ...p, [f]: v, ...(f === 'fam' ? { dom: '全部' } : {}) }))}>{v}</span>
  return (
    <div className="hpage">
      <div className="pzhero"><div className="pzt"><h1>AI 教练中心</h1><div className="hsub">全公司教练目录 · 覆盖本部职能部门、直属机构、14 个地市局、县域新电力与产业公司 · 开通与自建由各单位培训专责管理</div></div>
        <div className="pzk"><Kpi v={ALLC.length} k="教练总数" /><Kpi v={new Set(ALLC.map(c => c.unit)).size} k="覆盖单位" /><Kpi v={openN} k="已开通" cls="good" /><Kpi v={ALLC.length - openN} k="未开通" cls="warn" /><Kpi v={cusN} k="本单位自建" /></div>
        <div className="pzact"><button className="btn btn-primary" onClick={() => ctx.go('editor')}>新建教练</button><button className="btn" onClick={() => ctx.go('home')}>回工作台</button></div>
        <div className="pzhot">本月最多人练：<b>{hot.n}</b> · {hot.users} 人 · 平均提分 +{hot.gain}　｜　未开通的教练可提交开通申请，审核通过后出现在工作台「我在练的教练」。</div></div>
      <div className="pzf"><label>岗位族</label>{['全部', ...COACH_FAMS].map(v => chip('fam', v))}</div>
      <div className="pzf"><label>单位</label>{units.map(v => chip('unit', v))}</div>
      <div className="pzf"><label>业务域</label>{doms.map(v => chip('dom', v))}</div>
      <div className="pzf"><label>能力项</label>{tags.map(v => chip('tag', v))}</div>
      <div className="pzcnt">筛选出 {list.length} 位教练</div>
      <div className="pzgrid">{list.map(c => { const ap = applies.find(a => a.id === c.id); return <div key={c.id} className={`ccard ${c.open ? 'openc' : 'lockc'}`}>
        <div className="crow1"><Av c={c} /><div className="cmeta"><b>{c.n}</b><span>{c.fam} · {c.dom}</span></div>{c.open ? <span className="copen">已开通</span> : c.custom ? <span className="copen" style={{ color: '#8a6d15', background: '#faf3dc', borderColor: '#e3d49e' }}>自建 · 待审核</span> : <span className="clock">未开通</span>}</div>
        <div className="cunit">服务单位：{c.unit}{c.scene && <> · 对应场景「{c.scene}」</>}</div>
        <div className="cdesc">{c.desc}</div><div className="ctags">{c.tags.map(t => <i key={t}>{t}</i>)}</div>
        <div className="cstat"><span>难度 {'●'.repeat(c.lvl)}{'○'.repeat(3 - c.lvl)}</span><span>{c.min} 分钟</span><span>已练 {c.users} 人</span><span>平均提分 +{c.gain}</span></div>
        {c.open ? <button className="btn btn-primary cgo" onClick={() => c.id === 'daozha' ? ctx.train(null) : ctx.toast(`「${c.n}」剧本已开通，本次演示以倒闸操作陪练舱为例`)}>开始练习</button> : c.custom ? <button className="btn cgo" onClick={() => ctx.go('editor')}>在教练编辑器中继续完善</button> : ap ? <div className="capply">开通申请 {ap.at} · {ap.st}</div> : <button className="btn cgo" onClick={() => apply(c)}>申请开通</button>}
      </div> })}{!list.length && <div className="pzempty">当前筛选条件下暂无教练</div>}</div>
    </div>)
}

/* ================= 评分复盘 ================= */
function diffNodes(mine: string, std: string) {
  const a = Array.from(mine || ''), b = Array.from(std || ''); const n = a.length, m = b.length
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1))
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
  let i = 0, j = 0; const out: React.ReactNode[] = []
  while (i < n && j < m) { if (a[i] === b[j]) { out.push(a[i]); i++; j++ } else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push(<span key={'x' + i} className="dx">{a[i]}</span>); i++ } else { out.push(<span key={'m' + j} className="dm">{b[j]}</span>); j++ } }
  while (i < n) { out.push(<span key={'x' + i} className="dx">{a[i]}</span>); i++ }
  while (j < m) { out.push(<span key={'m' + j} className="dm">{b[j]}</span>); j++ }
  return out
}
const simPct = (a: string, b: string) => { const x = Array.from(a || ''), y = Array.from(b || ''); if (!y.length) return 100; let c = 0; const ys = new Set(y); x.forEach(ch => { if (ys.has(ch)) c++ }); return Math.round(100 * Math.min(1, c / y.length)) }
function aiReview(s: Session, prev?: Session) {
  const red = s.vio.find(v => v.lv === 'red'); const majors = s.vio.filter(v => v.lv === 'major'), minors = s.vio.filter(v => v.lv === 'minor')
  const dimCnt: Record<string, number> = {}; s.vio.forEach(v => { const d = vioDim(v); dimCnt[d] = (dimCnt[d] || 0) + 1 }); const worst = Object.keys(dimCnt).sort((x, y) => dimCnt[y] - dimCnt[x])[0]
  const dims = s.dims || RADAR_NOW; const best = dims.indexOf(Math.max(...dims)), weak = dims.indexOf(Math.min(...dims)); const out: string[] = []
  out.push(`本场「${s.plan}」${s.mode}，用时 ${s.dur} 分钟，综合 ${s.score} 分${prev ? `，较上一场${s.score - prev.score >= 0 ? '提升' : '下降'} ${Math.abs(s.score - prev.score)} 分` : ''}。`)
  if (red) out.push(`触发一票否决：${red.t}（第${red.step}项）。这是本场首要纠正项，其余节拍的完成度不作为本场评价依据。`)
  if (majors.length) out.push(`严重扣分 ${majors.length} 项：${majors.map(v => v.t).join('、')}。`)
  if (minors.length) out.push(`不规范 ${minors.length} 项，集中在「${worst}」环节（${minors.map(v => '第' + v.step + '项').join('、')}）。`)
  if (!s.vio.length) out.push('全程未触发扣分项，各节拍闭环完整。')
  if (s.hints && s.hints.length) out.push(`使用提示 ${s.hints.length} 次，主要在「${s.hints[0][0]}」，该环节尚未形成不看提示也能完成的稳定性。`)
  out.push(`「${DIMS6[best]}」${dims[best]} 分为本场最强项；「${DIMS6[weak]}」${dims[weak]} 分最弱。`)
  const sp = DIM_PLAN[DIMS6[weak]]; out.push(sp ? `建议先安排一轮「${sp[1]}」专项，再回到完整票考核模式验证。` : '建议以错题重练巩固本场扣分项后，进入考核模式验证。')
  return out.join('')
}
function rvActions(s: Session) {
  const items: { t: string; cite?: string; plan?: string }[] = []
  s.vio.forEach(v => { const st = STEPS.find(x => x.no === String(v.step)); items.push({ t: `第${v.step}项 ${v.t} → ${st && st.recite ? '按票面完整复诵：' + st.recite : '按票面顺序执行并核对'}`, cite: v.cite }) })
  ;(s.hints || []).forEach(h => items.push({ t: `「${h[0]}」不看提示独立完成一次`, cite: h[1] }))
  DIMS6.forEach((d, i) => { if ((s.dims || RADAR_NOW)[i] < 75 && DIM_PLAN[d]) items.push({ t: `安排一轮「${DIM_PLAN[d][1]}」专项，把「${d}」练到 75 分以上`, plan: DIM_PLAN[d][0] }) })
  if (!items.length) items.push({ t: '本场无扣分，下一场进入考核模式验证稳定性', plan: 'full' })
  return items.slice(0, 8)
}
export function ReviewPage() {
  const ctx = useCtx(); const D = useDrills()
  const all = useMemo(() => unifySessions(), [])
  const [filter, setFilter] = useState('all'); const [cmp, setCmp] = useState<'prev' | 'best' | 'avg'>('prev'); const [sel, setSel] = useState(all[0]?.id || '')
  const [tl, setTl] = useState<string | null>(null); const [follow, setFollow] = useState<Record<number, 'open' | 'pass' | null>>({}); const [fin, setFin] = useState<Record<number, string>>({})
  const [acts, setActs] = useState<Record<string, Record<string, boolean>>>(() => lsGet(LS.acts, {}))
  const list = all.filter(s => filter === 'red' ? s.vio.some(v => v.lv === 'red') : filter === 'exam' ? s.mode === '考核模式' : filter === 'local' ? s.real : filter === 'low' ? s.score < 80 : true)
  const idx = all.findIndex(x => x.id === sel); const s = all[idx] || all[0]; const prev = all[idx + 1]
  const A = homeAgg(); const red = s.vio.some(v => v.lv === 'red'); const dims = s.dims || RADAR_NOW
  const others = all.filter(x => x.id !== s.id); const best = others.slice().sort((a, b) => b.score - a.score)[0]
  const cmpVals = cmp === 'best' && best ? best.dims || RADAR_NOW : cmp === 'avg' ? RADAR_NOW : prev ? prev.dims || RADAR_PREV : RADAR_PREV
  const cmpLabel = cmp === 'best' ? '最佳场' : cmp === 'avg' ? '30天均值' : '上一场'
  const steps = planStepsOf(s); const cur = tl || steps[0]?.no; const lines = s.lines || []
  const weakDims = DIMS6.map((n, i) => [n, dims[i]] as [string, number]).filter(x => x[1] < 75).map(x => x[0]); const courses = COURSES.filter(c => weakDims.includes(c.tag))
  const actList = rvActions(s); const actSt = acts[s.id!] || {}; const actDone = actList.filter((_, i) => actSt['a' + i]).length
  const better = prev ? DIMS6.map((d, i) => [d, dims[i] - (prev.dims || RADAR_PREV)[i]] as [string, number]).filter(x => x[1] > 0) : []
  const [playing, setPlaying] = useState(false)
  useEffect(() => { if (!playing) return; let i = 0; const t = setInterval(() => { if (i >= steps.length) { setPlaying(false); return } setTl(steps[i].no); i++ }, 520); return () => clearInterval(t) }, [playing])
  const stepInfo = (no: string) => { const st = STEPS.find(x => x.no === String(no)); if (!st) return null; const v = s.vio.filter(x => String(x.step) === st.no); const line = lines.find(l => String(l.step) === st.no && l.beat === 1); return <><b className="mono">第{st.no}项</b> {st.ticket}<br />{v.length ? v.map((x, k) => <span key={k}><Tag lv={x.lv} />{x.t}<span className="cite">{x.cite}</span><br /></span>) : <span><span className="ctag ok">完成</span>五拍闭环完整，监护人标"√"</span>}{line && <div className="tk3">复诵：{diffNodes(line.mine, line.std)}</div>}</> }
  const summary = () => ctx.drill({ title: '复盘摘要', sub: '提交带教师傅前由本人确认', body: <div className="draft">{`${HOME_USER.name} · 陪练复盘摘要（${s.real ? '今天' : dayLabel(s.d)}）\n练习方式：${s.plan} · ${s.mode} · 用时 ${s.dur} 分钟\n综合得分：${s.score}${prev ? `（上一场 ${prev.score}）` : ''}\n扣分项：${s.vio.length ? s.vio.map(v => `第${v.step}项 ${v.t}（${v.cite || ''}）`).join('；') : '无'}\n提示使用：${(s.hints || []).length} 次\n六维：${DIMS6.map((d, i) => `${d} ${dims[i]}`).join(' / ')}\n下次练习要做到：\n${actList.map((a, i) => `${i + 1}. ${a.t}`).join('\n')}\n\n以上内容由陪练系统按本场留痕数据生成，经本人确认后提交带教师傅。`}</div>, foot: <button className="btn" onClick={() => ctx.toast('已复制摘要')}>复制摘要</button> })
  return (
    <div className="hpage"><div className="ppage">
      <div className="ph"><b>评分复盘</b><span>近30天 {A.cnt + all.filter(x => x.real).length} 场 · 平均 {A.avg} 分 · 记录由陪练舱自动留痕</span><span className="phr"><button className="btn sm" onClick={summary}>生成复盘摘要</button></span></div>
      <div className="rvwrap">
        <aside className="hcard rvlist"><div className="hch"><b>场次记录</b><span>{list.length} 场</span></div>
          <div className="chips">{([['all', '全部'], ['local', '本机'], ['exam', '考核'], ['red', '红线'], ['low', '<80']] as [string, string][]).map(([k, n]) => <span key={k} className={`chip ${filter === k ? 'on' : ''}`} onClick={() => setFilter(k)}>{n}</span>)}</div>
          {list.map(x => <div key={x.id} className={`rvit ${x.id === s.id ? 'on' : ''}`} onClick={() => { setSel(x.id!); setTl(null) }}><div className="rv1"><span className="mono">{x.real ? '今天' : dayLabel(x.d)}</span>{x.real && <i className="rvloc">本机</i>}<b className={`mono ${x.score < 75 ? 'wv' : 'gv'}`}>{x.score}</b></div><div className="rv2">{x.plan}</div><div className="rv3">{x.mode} · {x.dur} 分钟 · 扣分 {x.vio.length}</div></div>)}
          {!list.length && <div className="tk3" style={{ padding: 14 }}>没有符合条件的场次。</div>}</aside>
        <main className="rvmain">
          <section className="hcard rvhead"><div><div className={`rvbig ${red ? 'wv' : ''}`}>{s.score}</div><div className="tk3">综合得分 · {red ? '触发一票否决' : s.mode}</div>
            <div className="rvkpis"><span><b>{s.dur}</b>分钟</span><span><b>{s.vio.length}</b>扣分项</span><span><b>{(s.hints || []).length}</b>提示</span><span><b>{s.vio.filter(v => v.lv === 'red').length}</b>红线</span>{prev && <span><b className={s.score >= prev.score ? 'gv' : 'wv'}>{s.score - prev.score >= 0 ? '+' : ''}{s.score - prev.score}</b>较上一场</span>}</div>
            <div className="rvtags">{DIMS6.map((t, i) => <i key={t} className={dims[i] > 80 ? 'ok' : dims[i] > 55 ? 'wn' : 'bad'} onClick={() => D.drillDim(i)}>{t} {dims[i] > 80 ? '达标' : dims[i] > 55 ? '待提升' : '短板'}</i>)}</div>
            {better.length > 0 && <div className="tk3" style={{ marginTop: 8 }}>较上一场进步：{better.map(x => `${x[0]} +${x[1]}`).join('、')}</div>}</div>
            <div><div className="chips" style={{ justifyContent: 'center' }}>{([['prev', '上一场'], ['best', '最佳场'], ['avg', '30天均值']] as ['prev' | 'best' | 'avg', string][]).map(([k, n]) => <span key={k} className={`chip ${cmp === k ? 'on' : ''}`} onClick={() => setCmp(k)}>{n}</span>)}</div>
              <Radar dims={DIMS6} now={dims} prev={cmpVals} w={330} h={240} l1="本场" l2={cmpLabel} onDim={D.drillDim} /><div className="tk3" style={{ textAlign: 'center' }}>本场 vs {cmpLabel} · 顶点可查明细</div></div></section>
          <Hcard t="AI 复盘" ai="AI" sub="由本场留痕数据生成"><div className="airv">{aiReview(s, prev)}</div></Hcard>
          <Hcard t="场次回放" sub="逐项时间轴 · 绿=完成 金=不规范 橙=严重 红=一票否决 · 小点=用了提示" extra={<button className="btn sm" onClick={() => setPlaying(p => !p)}>{playing ? '■ 停止回放' : '▶ 回放本场'}</button>}>
            <div className="rvtl">{steps.map(st => { const v = s.vio.filter(x => String(x.step) === st.no); const lv = v.some(x => x.lv === 'red') ? 'red' : v.some(x => x.lv === 'major') ? 'major' : v.length ? 'minor' : 'ok'; const hinted = (s.hints || []).some(h => (h[1] || '').includes(`第${st.no}项`)); return <span key={st.no} className={`tlx ${lv} ${cur === st.no ? 'cur' : ''}`} title={`第${st.no}项 · ${st.ticket}${v.length ? ' · ' + v.map(x => x.t).join('；') : ' · 完成'}`} onClick={() => setTl(st.no)}>{st.no}{hinted && <i />}</span> })}</div>
            <div className="rvtlinfo">{cur && stepInfo(cur)}</div></Hcard>
          <Hcard t="逐句回放" sub="我的复诵/回报 vs 票面标准话术 · 漏说 说错/多说 · 点「跟读」当场再练一遍">
            {lines.length ? <div className="tl">{lines.map((l, i) => <div key={i} className={`tlrow ${follow[i] === 'pass' ? 'pass' : ''}`}><div className="tlk"><b className="mono">第{l.step}项</b><span>{l.beat === 1 ? '复诵' : '回报'}</span><em className={`mono ${simPct(l.mine, l.std) < 86 ? 'wv' : 'gv'}`}>{simPct(l.mine, l.std)}%</em><button className="btn sm" onClick={() => setFollow(f => ({ ...f, [i]: f[i] ? null : 'open' }))}>{follow[i] ? '收起' : '跟读'}</button></div>
              <div><div className="tlt">{l.t}</div><div className="tlme">我说：{diffNodes(l.mine, l.std)}</div><div className="tlstd">标准：{l.std}</div>
                {follow[i] && <div className="tlfollow"><input className="tlin" value={fin[i] || ''} placeholder="照标准话术念一遍…" onChange={e => { const v = e.target.value; setFin(f => ({ ...f, [i]: v })); if (Math.round(sim(v, l.std) * 100) >= 86) setFollow(f => ({ ...f, [i]: 'pass' })) }} /><span className="tlmeter">{follow[i] === 'pass' ? <b className="gv">吻合度 {Math.round(sim(fin[i] || '', l.std) * 100)}% · 通过 ✓</b> : fin[i] ? <>吻合度 <b className={Math.round(sim(fin[i], l.std) * 100) >= 62 ? 'wv' : 'bad'}>{Math.round(sim(fin[i], l.std) * 100)}%</b>{missingSegs(fin[i], l.std).slice(0, 3).map(x => <em key={x}> {x}</em>)}</> : '吻合度 —'}</span></div>}</div></div>)}</div> : <div className="tk3">本场无逐句记录。</div>}</Hcard>
          <Hcard t="错误卡" sub="错在哪 · 依据 · 正确做法">{s.vio.length ? <><div className="errgrid">{s.vio.map((v, k) => { const st = STEPS.find(x => x.no === String(v.step)); return <div key={k} className={`errc ${v.lv}`}><div className="err1"><Tag lv={v.lv} /><b>第{v.step}项</b><span>{st ? st.ticket : ''}</span></div><div className="err2"><label>错在哪</label>{v.t}</div><div className="err2"><label>依据</label><span className="mono">{v.cite}</span>{st && <div className="errq">{st.rule}</div>}</div><div className="err2"><label>正确做法</label>{st ? (st.recite || st.report || '按票面执行') : '按票面执行'}</div></div> })}</div>
            <div className="rvact"><button className="btn btn-primary" onClick={() => { lsSet(LS.lastvio, s.vio.map(v => ({ step: v.step, title: v.t }))); ctx.train('wrong') }}>错题重练（{s.vio.length} 项）</button><button className="btn" onClick={() => ctx.train(planId(s.plan))}>重练该方式</button></div></> : <div className="tk3">本场未触发扣分项。</div>}</Hcard>
          <div className="gtwo">
            <Hcard t="下次练习要做到" ai="AI" sub={`由本场留痕生成 · 已完成 ${actDone}/${actList.length}`}>{actList.map((a, i) => <label key={i} className={`actit ${actSt['a' + i] ? 'done' : ''}`}><input type="checkbox" checked={!!actSt['a' + i]} onChange={e => { const n = { ...acts, [s.id!]: { ...actSt, ['a' + i]: e.target.checked } }; setActs(n); lsSet(LS.acts, n) }} /><span>{a.t}{a.cite && <i className="cite">{a.cite}</i>}</span>{a.plan && <button className="btn sm" onClick={() => ctx.train(a.plan!)}>去练</button>}</label>)}</Hcard>
            <Hcard t="下一步建议" sub="专项 + 课程（知识资产中枢与课程工厂供给）">{(s.hints || []).map((h, k) => <div key={k} className="hrow hint">提示 · {h[0]} · {h[1]}</div>)}{(s.praise || []).map((p, k) => <div key={k} className="hrow"><span className="ctag ok">加分</span>{p.title}</div>)}
              {weakDims.map(d => DIM_PLAN[d] ? <div key={d} className="hrow"><button className="btn sm" onClick={() => ctx.train(DIM_PLAN[d][0])}>练「{DIM_PLAN[d][1]}」专项</button> <span className="tk3">针对「{d}」</span></div> : null)}
              {courses.length ? courses.map(c => <div key={c.n} className="hrow">课程 · {c.n} <span className="tk3">{c.h} 学时 · {c.tag}</span> <button className="btn sm" onClick={() => ctx.go('classroom')}>去学</button></div>) : <div className="hrow">各维度均达标，建议进入考核模式。</div>}
              <div className="hrow"><button className="btn sm" onClick={() => ctx.go('growth')}>查看成长档案</button></div></Hcard>
          </div>
        </main></div></div></div>)
}

/* ================= 成长档案 ================= */
export function GrowthPage() {
  const ctx = useCtx(); const A = homeAgg()
  const [cmp, setCmp] = useState<'prev' | 'old' | 'team'>('prev'); const [show, setShow] = useState<Record<string, boolean>>({ score: true, dur: false, vio: false, hint: false, avg: true, pass: true })
  const [goals, setGoals] = useState<Record<number, number>>(() => lsGet(LS.goals, {}))
  const all = useMemo(() => unifySessions(), []); const pts = all.slice().sort((a, b) => b.d - a.d)
  const badges = BADGES.map(b => ({ ...b, lit: !!b.test(all) })); const lit = badges.filter(b => b.lit).length
  const up = DIMS10.filter((_, i) => RADAR10_NOW[i] > RADAR10_PREV[i]).length; const done = MILESTONES.filter(m => m.k === 'done').length
  const predict = (i: number) => Math.max(0, Math.min(100, Math.round(RADAR10_NOW[i] + (RADAR10_NOW[i] - RADAR10_PREV[i]) * .6 + (RADAR10_PREV[i] - RADAR10_OLD[i]) * .2)))
  const hasGoal = Object.keys(goals).length > 0; const target = hasGoal ? DIMS10.map((_, i) => goals[i] != null ? goals[i] : RADAR10_NOW[i]) : null
  const cmpv = cmp === 'old' ? RADAR10_OLD : cmp === 'team' ? TEAM_AVG10 : RADAR10_PREV; const lb = cmp === 'old' ? '前月' : cmp === 'team' ? '班组均值' : '上月'
  const growthDim = (i: number) => { const n = DIMS10[i]; const rel = i < 6 ? all.filter(s => s.vio.some(v => vioDim(v) === n)).slice(0, 6) : []; const g = goals[i]
    ctx.drill({ title: `能力明细 · ${n}`, sub: `前月 ${RADAR10_OLD[i]} · 上月 ${RADAR10_PREV[i]} · 本月 ${RADAR10_NOW[i]} · 班组均值 ${TEAM_AVG10[i]}`, body: <>{DIM10_DESC[n] && <div className="hrow">{DIM10_DESC[n]}</div>}<div className="gtwo"><Radar dims={DIMS10} now={RADAR10_NOW} prev={TEAM_AVG10} w={320} h={240} l1="本人" l2="班组均值" /><div><div className="hrow">三期走势：{RADAR10_OLD[i]} → {RADAR10_PREV[i]} → <b>{RADAR10_NOW[i]}</b>，预测下月 {predict(i)}</div><div className="hrow">较班组均值 {RADAR10_NOW[i] - TEAM_AVG10[i] >= 0 ? '+' : ''}{RADAR10_NOW[i] - TEAM_AVG10[i]}</div><div className="hrow">本月目标：{g != null ? `${g}（${RADAR10_NOW[i] >= g ? '已达成' : '差 ' + (g - RADAR10_NOW[i])}）` : '未设定，可在三期对照表中填写'}</div></div></div>{rel.length > 0 && <Sec t="相关扣分场次"><SessTable list={rel} /></Sec>}<div className="tk3">测算供参考，能力评价以人工审核为准。</div></>, foot: DIM_PLAN[n] ? <button className="btn btn-primary" onClick={() => { ctx.drill(null); ctx.train(DIM_PLAN[n][0]) }}>练「{DIM_PLAN[n][1]}」专项</button> : <button className="btn btn-primary" onClick={() => { ctx.drill(null); ctx.train('full') }}>去练完整票</button> }) }
  return (
    <div className="hpage"><div className="ppage">
      <div className="ph"><b>成长档案</b><span>{HOME_USER.name} · {HOME_USER.post} · {HOME_USER.unit} {HOME_USER.team}</span><span className="phr"><button className="btn sm" onClick={() => window.print()}>打印 / 导出档案</button></span></div>
      <section className="hcard gcard"><div className="gav">{HOME_USER.name.slice(0, 1)}</div><div className="gmeta"><b>{HOME_USER.name}</b><span>{HOME_USER.post} · {HOME_USER.team} · {HOME_USER.join} 入职 · 带教师傅 {HOME_USER.mentor}</span></div>
        <div className="gkpis"><Kpi v={A.cnt} k="近30天场次" /><Kpi v={(A.totalMin / 60).toFixed(1) + 'h'} k="累计时长" /><Kpi v={A.avg} k="平均得分" /><Kpi v={`${HOME_USER.hours.done}/${HOME_USER.hours.need}`} k="年度学时" /><Kpi v={`${up}/10`} k="维度上升" cls="good" /><Kpi v={`${lit}/${badges.length}`} k="能力徽章" cls="good" /><Kpi v={done} k="里程碑" cls="good" /></div></section>
      <div className="gtwo g21">
        <Hcard t="能力全景" sub="十维 · 本月 vs 对照 · 顶点可查明细" extra={<span className="chips">{([['prev', '上月'], ['old', '前月'], ['team', '班组均值']] as ['prev' | 'old' | 'team', string][]).map(([k, n]) => <span key={k} className={`chip ${cmp === k ? 'on' : ''}`} onClick={() => setCmp(k)}>{n}</span>)}</span>}><Radar dims={DIMS10} now={RADAR10_NOW} prev={cmpv} w={440} h={320} l1="本月" l2={lb} target={target} c2={cmp === 'team' ? '#7aa0c8' : '#b3bfcf'} onDim={growthDim} /></Hcard>
        <Hcard t="三期对照与目标" ai="AI 预测" sub="前月 / 上月 / 本月 · 预测为测算参考 · 目标可直接填写"><table className="htbl gtbl"><thead><tr><th>维度</th><th>前月</th><th>上月</th><th>本月</th><th>变化</th><th>预测下月</th><th>本月目标</th><th>差距</th></tr></thead><tbody>
          {DIMS10.map((n, i) => { const d = RADAR10_NOW[i] - RADAR10_PREV[i]; const g = goals[i]; return <tr key={n}><td className="hitv" onClick={() => growthDim(i)} style={{ cursor: 'pointer' }}>{n}</td><td className="mono">{RADAR10_OLD[i]}</td><td className="mono">{RADAR10_PREV[i]}</td><td className="mono">{RADAR10_NOW[i]}</td><td className={`mono ${d >= 0 ? 'gv' : 'wv'}`}>{d >= 0 ? '+' : ''}{d}</td><td className="mono">{predict(i)}</td><td><input className="gin" type="number" min={0} max={100} value={g ?? ''} placeholder="—" onChange={e => { const v = e.target.value; const ng = { ...goals }; if (v === '') delete ng[i]; else ng[i] = Math.max(0, Math.min(100, +v)); setGoals(ng); lsSet(LS.goals, ng) }} /></td><td className={`mono ${g != null ? (RADAR10_NOW[i] >= g ? 'gv' : 'wv') : ''}`}>{g != null ? (RADAR10_NOW[i] >= g ? '已达成' : RADAR10_NOW[i] - g) : '—'}</td></tr> })}</tbody></table>
          <div className="tk3" style={{ marginTop: 6 }}>预测按近三期趋势线性外推；目标由本人设定，达成情况以人工审核为准。</div></Hcard>
      </div>
      <Hcard t="成长曲线" sub="近30天各场 · 点击图例切换序列 · 点击数据点打开该场复盘" extra={<span className="chips">{([['score', '得分'], ['avg', '7日均线'], ['dur', '用时'], ['vio', '扣分项'], ['hint', '提示次数'], ['pass', '及格/考核线']] as [string, string][]).map(([k, n]) => <span key={k} className={`chip ${show[k] ? 'on' : ''}`} onClick={() => setShow(s => ({ ...s, [k]: !s[k] }))}>{n}</span>)}</span>}><SessionCurve pts={pts} show={show} w={980} h={250} onSess={() => ctx.go('review')} /></Hcard>
      <Hcard t="能力徽章" sub={`${lit} 枚已点亮 · 由近30天留痕自动判定`}><div className="bgrid">{badges.map(b => <div key={b.id} className={`badge ${b.lit ? 'lit' : ''}`} title={b.d} onClick={() => ctx.drill({ title: `能力徽章 · ${b.n}`, sub: b.lit ? '已点亮' : '未点亮', body: <><div className="hrow">点亮条件：{b.d}</div><div className="hrow">判定依据：近30天陪练留痕（含本机场次），系统自动判定。</div>{b.lit ? <div className="hrow"><span className="ctag ok">已点亮</span>保持即可。</div> : <div className="hrow"><span className="ctag wn">未点亮</span>完成条件后自动点亮。</div>}</>, foot: b.plan ? <button className="btn btn-primary" onClick={() => { ctx.drill(null); ctx.train(b.plan!) }}>去练相关内容</button> : undefined })}><svg viewBox="0 0 48 48"><polygon points="24,3 42,13 42,35 24,45 6,35 6,13" fill={b.lit ? '#a8823a' : '#f1efe2'} stroke={b.lit ? '#a8823a' : '#d9d6c5'} strokeWidth={1.6} /><path d="M15 25 l6 6 12 -13" fill="none" stroke={b.lit ? '#fff' : '#c8d0dc'} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" /></svg><b>{b.n}</b><span>{b.lit ? '已点亮' : '未点亮'}</span></div>)}</div></Hcard>
      <Hcard t="学习地图" sub="九大知识主题掌握度 · 点亮 = 掌握度 ≥ 75"><div className="lmap">{KNOW.map(k => { const m = LMAP_MASTERY[k.id] || 0, on = m >= 75; return <div key={k.id} className={`lmt ${on ? 'lit' : ''}`} onClick={() => ctx.drill({ title: `知识主题 · ${k.t}`, sub: `${k.sub} · 掌握度 ${m}`, body: <Sec t="知识点">{k.body.map(b => <div key={b[0]} className="hrow"><b>{b[0]}</b><div className="tk3" style={{ whiteSpace: 'pre-line' }}>{b[1]}</div></div>)}</Sec>, foot: <><button className="btn" onClick={() => { ctx.drill(null); ctx.go('classroom') }}>去课堂测 6 题</button><button className="btn btn-primary" onClick={() => { ctx.drill(null); ctx.train(LMAP_PLAN[k.id] || 'full') }}>去练相关内容</button></> })}><svg viewBox="0 0 44 44"><circle cx={22} cy={22} r={18} fill="none" stroke="#e6eaf1" strokeWidth={4} /><circle cx={22} cy={22} r={18} fill="none" stroke={on ? '#1d7a4f' : '#a8823a'} strokeWidth={4} strokeDasharray={`${(113 * m / 100).toFixed(1)} 113`} transform="rotate(-90 22 22)" strokeLinecap="round" /><text x={22} y={26} textAnchor="middle" fontSize={11} fontFamily="monospace" fill={on ? '#1d7a4f' : '#a8823a'}>{m}</text></svg><div><b>{k.t}</b><span>{k.sub}</span></div></div> })}</div></Hcard>
      <div className="gtwo">
        <Hcard t="晋升通道" sub="当前 · 变电运行值班员"><div className="ladder">{LADDER.map(r => <div key={r.post} className={`rung ${r.cur ? 'cur' : ''}`}><div className="rh"><b>{r.post}</b>{r.cur && <i>当前</i>}<span className="mono">{r.met.filter(Boolean).length}/{r.req.length}</span></div><div className="rq">{r.req.map((q, j) => <span key={q} className={r.met[j] ? 'ok' : ''}>{r.met[j] ? '✓' : '○'} {q}</span>)}</div></div>)}</div><div className="tk3" style={{ marginTop: 8 }}>晋升资格以人工审核结果为准。</div></Hcard>
        <Hcard t="成长里程碑" sub={`${done} 项已达成`}><div className="ms">{MILESTONES.map(m => <div key={m.t} className={`msi ${m.k}`}><i /><span className="mono">{m.d || (m.ago! >= 0 ? dayLabel(m.ago!) : dateAfter(-m.ago!))}</span><b>{m.t}</b></div>)}</div></Hcard>
      </div>
      <div className="gtwo">
        <Hcard t="学时记录" sub={`年度 ${HOME_USER.hours.done}/${HOME_USER.hours.need} 学时 · 知识课堂回写`}><table className="htbl"><thead><tr><th>日期</th><th>内容</th><th>学时</th><th>来源</th></tr></thead><tbody>{hourLog().map((x, i) => <tr key={i}><td className="mono">{x.d === 0 ? '今天' : dayLabel(x.d)}</td><td>{x.n}</td><td className="mono">{x.h}</td><td>{x.src}</td></tr>)}</tbody></table></Hcard>
        <Hcard t="资质证书" sub={`${HOME_USER.certs.length} 项有效`}><table className="htbl"><thead><tr><th>证书</th><th>取得</th><th>复审期限</th><th>状态</th></tr></thead><tbody>{HOME_USER.certs.map(c => <tr key={c.n}><td>{c.n}</td><td className="mono">{c.got}</td><td className="mono">{c.review}</td><td><span className="ctag ok">有效</span></td></tr>)}</tbody></table></Hcard>
      </div>
      <div className="tk3" style={{ margin: '6px 4px 14px' }}>能力与胜任度数据为系统测算参考，任职资格评定以人工审核结果为准。</div></div></div>)
}

/* ================= 知识课堂 ================= */
export function ClassroomPage() {
  const ctx = useCtx()
  const [q, setQ] = useState(''); const [tag, setTag] = useState('全部'); const [syncing, setSyncing] = useState(false); const [syncAt, setSyncAt] = useState(CLASSROOM.syncAt)
  const [prog, setProg] = useState<Record<string, number>>(() => lsGet(LS.course, {}))
  const [quiz, setQuiz] = useState<{ topic: string; ids: string[]; i: number; ans: Record<number, number>; done: boolean } | null>(null)
  const [plan, setPlan] = useState<{ rows: { day: string; k: string; t: string; min: number; dim: string; plan?: string }[]; saved: boolean } | null>(() => lsGet(LS.plan, null))
  const [, force] = useState(0)
  const cs = COURSE_LIB.map(c => ({ ...c, done: Math.max(c.done, prog[c.id] || 0) }))
  const tags = ['全部', ...new Set(COURSE_LIB.map(c => c.tag))]
  const list = cs.filter(c => (tag === '全部' || c.tag === tag) && (!q || c.n.includes(q) || c.ch.some(x => x.includes(q))))
  const hist = lsGet<{ topic: string; right: number; n: number }[]>(LS.quiz, [])
  const courseDrill = (id: string) => { const c = cs.find(x => x.id === id)!; ctx.drill({ title: `课程 · ${c.n}`, sub: `${c.tag} · ${c.lvl} · ${c.h} 学时 · ${c.done}/${c.ch.length} 章`, body: <><div className="hbar"><div className="hfill" style={{ width: `${Math.round(c.done / c.ch.length * 100)}%` }} /></div>{c.ch.map((n, i) => <div key={n} className={`chap ${i < c.done ? 'done' : i === c.done ? 'cur' : ''}`}><i>{i < c.done ? '✓' : i + 1}</i><b>{n}</b><span>{i < c.done ? '已完成' : i === c.done ? '当前章节' : '待学'}</span></div>)}<div className="tk3" style={{ marginTop: 8 }}>章节完成后学时按课堂口径回写至成长档案。</div></>, foot: c.done < c.ch.length ? <button className="btn btn-primary" onClick={() => { const p = { ...prog, [id]: c.done + 1 }; setProg(p); lsSet(LS.course, p); if (c.done + 1 >= c.ch.length) { hoursAdd(c.n, c.h); ctx.toast(`「${c.n}」已完成，学时回写 ${c.h}`) } else ctx.toast(`已完成第 ${c.done + 1} 章，进度已同步`); ctx.drill(null); setTimeout(() => courseDrill(id), 50) }}>学完本章「{c.ch[c.done]}」</button> : <button className="btn" onClick={() => { ctx.drill(null); ctx.train(LMAP_PLAN[c.k] || 'full') }}>去练相关内容</button> }) }
  const quizStart = (topic: string) => { const k = topic === '全部' ? null : (KNOW.find(x => x.t === topic) || { id: '' }).id; let pool = k ? QUIZ.filter(x => x.k === k) : QUIZ.slice(); if (pool.length < 6) pool = pool.concat(QUIZ.filter(x => !pool.includes(x))); const seed = Date.now() % 7; pool = pool.slice(seed).concat(pool.slice(0, seed)); setQuiz({ topic, ids: pool.slice(0, 6).map(x => x.id), i: 0, ans: {}, done: false }) }
  const quizNext = () => { if (!quiz) return; const ni = quiz.i + 1; if (ni >= quiz.ids.length) { const right = quiz.ids.filter((id, i) => quiz.ans[i] === QUIZ.find(x => x.id === id)!.a).length; const h = hist.slice(); h.unshift({ topic: quiz.topic, right, n: quiz.ids.length }); lsSet(LS.quiz, h.slice(0, 20)); hoursAdd(`随堂测验 · ${quiz.topic === '全部' ? '综合' : quiz.topic}（${right}/${quiz.ids.length}）`, .5); setQuiz({ ...quiz, done: true }); return } setQuiz({ ...quiz, i: ni }) }
  const planGen = () => { const weak = DIMS6.map((d, i) => [d, RADAR_NOW[i]] as [string, number]).sort((a, b) => a[1] - b[1]).slice(0, 3).map(x => x[0]); const open = cs.filter(c => c.done < c.ch.length); const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']; const rows: NonNullable<typeof plan>['rows'] = []; let ci = 0
    for (let d = 0; d < 7; d++) { const dim = weak[d % weak.length]; if (d % 3 === 0) { const c = open.find(x => x.tag === dim) || open[ci++ % open.length]; if (c) rows.push({ day: days[d], k: '课程', t: `${c.n} · 第 ${c.done + 1} 章「${c.ch[c.done]}」`, min: 30, dim: c.tag }) } else if (d % 3 === 1) { const p = DIM_PLAN[dim]; rows.push({ day: days[d], k: '陪练', t: p ? `专项 · ${p[1]}` : '完整操作票 · 演练模式', min: 15, dim, plan: p ? p[0] : 'full' }) } else rows.push({ day: days[d], k: '测验', t: `随堂测验 · ${dim} 相关 6 题`, min: 10, dim }) }
    setPlan({ rows, saved: false }) }
  const qh = () => { if (!quiz) return null; if (quiz.done) { const right = quiz.ids.filter((id, i) => quiz.ans[i] === QUIZ.find(x => x.id === id)!.a).length; const wrong = quiz.ids.map((id, i) => [QUIZ.find(x => x.id === id)!, quiz.ans[i]] as const).filter(([qq, a]) => a !== qq.a); return <div className="qzdone"><div className={`rvbig ${right / quiz.ids.length >= .8 ? '' : 'wv'}`} style={{ fontSize: 44 }}>{right}<span style={{ fontSize: 16, color: '#8a94a6' }}>/{quiz.ids.length}</span></div><div className="tk3">{quiz.topic === '全部' ? '综合测验' : quiz.topic} · 学时已回写 0.5 · 记录已写入成长档案</div>{wrong.length ? <Sec t="错题">{wrong.map(([qq]) => <div key={qq.id} className="hrow"><b>{qq.q}</b><div className="tk3">正确：{qq.opts[qq.a]} · {qq.cite}</div></div>)}</Sec> : <div className="hrow"><span className="ctag ok">全部答对</span></div>}<div className="rvact" style={{ justifyContent: 'center' }}><button className="btn btn-primary" onClick={() => quizStart(quiz.topic)}>再测一组</button>{wrong.length > 0 && <button className="btn" onClick={() => ctx.train(LMAP_PLAN[wrong[0][0].k] || 'full')}>去练「{KNOW.find(k => k.id === wrong[0][0].k)!.t}」相关项</button>}</div></div> }
    const qq = QUIZ.find(x => x.id === quiz.ids[quiz.i])!; const a = quiz.ans[quiz.i]
    return <div className="qz"><div className="qzh"><span className="tbno">第 {quiz.i + 1}/{quiz.ids.length} 题</span><i className="ctag-c">{qq.dim}</i><span className="tk3">{KNOW.find(k => k.id === qq.k)!.t}</span></div><div className="qzq">{qq.q}</div>
      <div className="qzopts">{qq.opts.map((o, i) => <div key={i} className={`qzo ${a != null ? (i === qq.a ? 'right' : i === a ? 'wrong' : 'dim') : ''}`} onClick={() => { if (a == null) setQuiz({ ...quiz, ans: { ...quiz.ans, [quiz.i]: i } }) }}><b>{'ABCD'[i]}</b>{o}</div>)}</div>
      {a != null ? <><div className={`qzx ${a === qq.a ? 'ok' : 'bad'}`}><b>{a === qq.a ? '回答正确' : '回答错误'}</b> {qq.why} <span className="cite">依据 {qq.cite}</span></div><div className="rvact"><button className="btn btn-primary" onClick={quizNext}>{quiz.i + 1 >= quiz.ids.length ? '查看结果' : '下一题'}</button></div></> : <div className="tk3">选择一个答案，系统立即给出判定与依据。</div>}</div> }
  const archDrill = (k: string) => { const f = ARCH_IF[k]; ctx.drill({ title: `接口 · ${f.n}`, sub: `${f.dir} · ${f.freq}`, body: <><div className="hrow">最近同步：{f.last}</div><Sec t="字段"><div className="rvtags">{f.fields.map(x => <i key={x} className="ok">{x}</i>)}</div></Sec><div className="hrow">同步方式：增量拉取，失败自动重试，结果写入学时回写记录。</div></> }) }
  return (
    <div className="hpage"><div className="ppage">
      <div className="ph"><b>知识课堂</b><span>供给来自智培云图知识资产中枢与 AI 课程工厂 · 上次同步 {syncAt}</span><span className="phr"><button className={`btn sm ${syncing ? 'busy' : ''}`} onClick={() => { if (syncing) return; setSyncing(true); setTimeout(() => { const d = new Date(); setSyncAt(`今日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`); setSyncing(false); ctx.toast('课程库 / 题库 / 学员画像已同步，学时已回写') }, 1100) }}>{syncing ? '同步中…' : '立即同步'}</button></span></div>
      <Hcard t="接入关系" sub="课程 / 题库 / 学员画像 供给 → 陪练；陪练学时 → 成长地图回写">
        <svg viewBox="0 0 900 300" className="chsvg">
          <rect x={20} y={30} width={250} height={240} rx={12} fill="#f4f6fa" stroke="#d8dfe9" /><text x={145} y={58} textAnchor="middle" fontSize={13} fontWeight={700} fill="#14213d">智培云图 · 知识资产中枢 / 课程工厂</text><text x={145} y={74} textAnchor="middle" fontSize={10} fill="#8a94a6">供给层</text>
          {CLASSROOM.supply.map((s, i) => <g key={s.k} className="hitv" onClick={() => archDrill(s.k)}><rect x={40} y={88 + i * 44} width={210} height={34} rx={6} fill="#fff" stroke="#e6eaf1" /><text x={52} y={109 + i * 44} fontSize={12} fill="#14213d">{s.n}</text><text x={238} y={109 + i * 44} textAnchor="end" fontSize={11} fontFamily="monospace" fill="#1e3a6e">{s.v}</text></g>)}
          <rect x={480} y={30} width={400} height={240} rx={12} fill="#eaeff7" stroke="#1e3a6e" strokeWidth={1.6} /><text x={680} y={58} textAnchor="middle" fontSize={14} fontWeight={700} fill="#1e3a6e">AI 智能陪练</text><text x={680} y={74} textAnchor="middle" fontSize={10} fill="#2b4e92">主体 · 调用供给数据并回写学时</text>
          {([['AI 教练中心', 500, 92, 'plaza'], ['陪练舱', 700, 92, 'cabin'], ['评分复盘', 500, 150, 'review'], ['成长档案', 700, 150, 'growth'], ['班组看板', 500, 208, 'team'], ['教练编辑器', 700, 208, 'editor']] as [string, number, number, string][]).map(([n, x, y, go]) => <g key={n} className="hitv" onClick={() => ctx.go(go)}><rect x={x} y={y} width={180} height={40} rx={6} fill="#fff" stroke="#b9c8e0" /><text x={x + 90} y={y + 25} textAnchor="middle" fontSize={12} fill="#14213d">{n}</text></g>)}
          {CLASSROOM.supply.map((s, i) => { const y = 105 + i * 44; const p = s.dir === 'in' ? `M250,${y} C360,${y} 380,140 480,140` : `M480,160 C380,160 360,${y} 250,${y}`; return <g key={'e' + s.k}><path d={p} className={`gedge ${s.dir === 'in' ? 'gfeed' : 'gact'}`} fill="none" /><circle r={3.4} fill={s.dir === 'in' ? '#1e3a6e' : '#a8823a'}><animateMotion dur={`${2.6 + i * .4}s`} repeatCount="indefinite" path={p} /></circle></g> })}
          <text x={365} y={122} textAnchor="middle" fontSize={10.5} fill="#1e3a6e">供给 →</text><text x={365} y={188} textAnchor="middle" fontSize={10.5} fill="#a8823a">← 学时回写</text>
        </svg></Hcard>
      <div className="syncline">{CLASSROOM.supply.map(s => <span key={s.k} className={`sy ${syncing ? 'busy' : ''}`} onClick={() => archDrill(s.k)}>{s.n} {s.dir === 'in' ? '已同步' : '已回写'} · {s.v}</span>)}</div>
      <div className="gtwo g32">
        <Hcard t="课程库" sub={`${list.length}/${cs.length} 门`}><div className="clsearch"><input value={q} placeholder="搜索课程或章节…" onChange={e => setQ(e.target.value)} /><div className="chips">{tags.map(t => <span key={t} className={`chip ${tag === t ? 'on' : ''}`} onClick={() => setTag(t)}>{t}</span>)}</div></div>
          <div className="clist">{list.map(c => <div key={c.id} className="crs hitv" onClick={() => courseDrill(c.id)}><div className="crs1"><b>{c.n}</b><i className="ctag-c">{c.tag}</i><span className="tk3">{c.lvl} · {c.h} 学时</span></div><div className="hbar"><div className="hfill" style={{ width: `${Math.round(c.done / c.ch.length * 100)}%` }} /></div><div className="tk3">{c.done}/{c.ch.length} 章{c.done >= c.ch.length ? ' · 已完成，学时已回写' : c.done ? ' · 学习中' : ''}</div></div>)}{!list.length && <div className="tk3">没有匹配的课程。</div>}</div></Hcard>
        <Hcard t="随堂测验" ai="AI 出题" sub="题库联动 · 答错即出依据条款 · 完成回写 0.5 学时">{quiz ? qh() : <><div className="chips">{['全部'].concat(KNOW.map(k => k.t)).map(t => <span key={t} className="chip" onClick={() => quizStart(t)}>{t}</span>)}</div><div className="tk3" style={{ marginTop: 8 }}>按主题抽 6 题（题库 {QUIZ.length} 题）。{hist.length > 0 && `本机测验 ${hist.length} 次，最近 ${hist[0].right}/${hist[0].n}（${hist[0].topic}）`}</div></>}</Hcard>
      </div>
      <div className="gtwo">
        <Hcard t="错题 → 题库联动" sub="陪练扣分项自动匹配练习题"><table className="htbl"><thead><tr><th>陪练扣分项</th><th>匹配题目</th><th>掌握度</th></tr></thead><tbody>{CLASSROOM.quizLink.map(x => <tr key={x.vio}><td>{x.vio}</td><td>{x.q}<div className="tk3">练习 {x.tries} 次</div></td><td style={{ width: 110 }}><div className="hbar"><div className="hfill" style={{ width: `${x.mastery}%`, background: x.mastery >= 80 ? '#1d7a4f' : '#a8823a' }} /></div><span className="mono tk3">{x.mastery}%</span></td></tr>)}</tbody></table></Hcard>
        <Hcard t="本周学习计划" ai="AI" sub="按能力短板 + 课程进度生成 · 由本人确认后生效" extra={<button className="btn sm" onClick={planGen}>{plan ? '重新生成' : '生成本周计划'}</button>}>{plan ? <><table className="htbl"><thead><tr><th>日</th><th>类型</th><th>内容</th><th>时长</th><th>针对</th></tr></thead><tbody>{plan.rows.map((r, i) => <tr key={i}><td className="mono">{r.day}</td><td><i className="ctag-c">{r.k}</i></td><td>{r.t}{r.plan && <> <button className="btn sm" onClick={() => ctx.train(r.plan!)}>去练</button></>}</td><td className="mono">{r.min} 分钟</td><td className="tk3">{r.dim}</td></tr>)}</tbody></table><div className="rvact">{plan.saved ? <span className="ctag ok">已加入日程</span> : <button className="btn btn-primary" onClick={() => { const p = { ...plan, saved: true }; setPlan(p); lsSet(LS.plan, p); ctx.toast('本周计划已加入日程，每日待练任务将按计划提醒'); force(x => x + 1) }}>确认并加入日程</button>}<span className="tk3">合计 {plan.rows.reduce((a, r) => a + r.min, 0)} 分钟 · 计划由系统生成，经本人确认后生效</span></div></> : <div className="edempty">点「生成本周计划」，系统按当前短板（{DIMS6.map((d, i) => [d, RADAR_NOW[i]] as [string, number]).sort((a, b) => a[1] - b[1]).slice(0, 3).map(x => x[0]).join('、')}）与课程进度排出 7 天安排。</div>}</Hcard>
      </div>
      <div className="gtwo">
        <Hcard t="学员画像同步" sub="成长地图 ⇄ 陪练"><table className="htbl"><thead><tr><th>字段</th><th>当前值</th><th>状态</th></tr></thead><tbody>{CLASSROOM.profileSync.map(r => <tr key={r[0]}><td>{r[0]}</td><td>{r[1]}</td><td><span className="ctag ok">{r[2]}</span></td></tr>)}</tbody></table></Hcard>
        <Hcard t="学时回写记录" sub="近30天"><table className="htbl"><thead><tr><th>日期</th><th>内容</th><th>学时</th><th>来源</th></tr></thead><tbody>{hourLog().map((x, i) => <tr key={i}><td className="mono">{x.d === 0 ? '今天' : dayLabel(x.d)}</td><td>{x.n}</td><td className="mono">{x.h}</td><td>{x.src}</td></tr>)}</tbody></table></Hcard>
      </div></div></div>)
}

/* ================= 班组看板 ================= */
export function TeamPage() {
  const ctx = useCtx()
  const [tasks, setTasks] = useState(() => lsGet<{ coach: string; plan: string; mode: string; due: string; pass: number; who: string; done: number; total: number }[]>(LS.tasks, []))
  const [f, setF] = useState({ coach: 'daozha', plan: 'full', mode: '考核模式', due: new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10), pass: 80, who: '全班' })
  const active = TEAM.filter(m => m.sess > 0); const cover = Math.round(active.length / TEAM.length * 100); const avgAll = Math.round(active.reduce((a, m) => a + m.avg, 0) / active.length)
  const redTotal = REDLINES.reduce((a, r) => a + r[1], 0); const idle = TEAM.filter(m => m.sess === 0 || m.last > 6); const maxR = Math.max(...REDLINES.map(r => r[1]))
  const allTasks = [{ coach: '倒闸操作 · 黄志远', plan: '完整操作票', mode: '考核模式', due: dateAfter(HOME_TASK.dueDays), pass: 80, who: '全班', done: 7, total: 12 }].concat(tasks)
  const send = (who: string) => { const c = COACHES.find(x => x.id === f.coach) || COACHES[0]; const p = PLANS.find(x => x.id === f.plan) || PLANS[0]; const t = { coach: c.n, plan: p.n, mode: f.mode, due: f.due.replace(/^\d{4}-0?(\d+)-0?(\d+)$/, '$1月$2日'), pass: f.pass, who, done: 0, total: who === '全班' ? TEAM.length : who === '未练人员' ? idle.length : 1 }; const l = [t, ...tasks].slice(0, 10); setTasks(l); lsSet(LS.tasks, l); ctx.toast(`已下发：${t.plan} · ${t.mode} · ${t.due}截止 · 对象 ${t.who}`); ctx.drill(null) }
  const memberDrill = (m: typeof TEAM[number]) => ctx.drill({ title: `成员 · ${m.n}`, sub: `${m.post} · 近30天 ${m.sess} 场 · 平均 ${m.avg || '—'} 分`, body: m.sess ? <div className="gtwo"><div><Radar dims={DIMS6} now={m.dims} prev={TEAM_AVG} w={320} h={240} l1="本人" l2="班组均值" /><div className="tk3" style={{ textAlign: 'center' }}>本人 vs 班组均值</div></div><div><MiniBars vals={m.dims} /><div className="hrow" style={{ marginTop: 8 }}>红线触发 {m.red} 次 · 最近练习 {m.last === 0 ? '今天' : m.last + ' 天前'} · 本月任务{m.task === 'done' ? '已完成' : '未完成'}</div><div className="tk3">正式考评以人工审核为准。</div></div></div> : <div className="hrow">本月尚无陪练记录。</div>, foot: <button className="btn btn-primary" onClick={() => send(m.n)}>给 {m.n} 下发专项任务</button> })
  return (
    <div className="hpage"><div className="ppage">
      <div className="ph"><b>班组看板</b><span>{LEAD_USER.unit} {LEAD_USER.team} · 班组长 {LEAD_USER.name} · {TEAM.length} 人</span></div>
      <div className="hkpis" style={{ marginTop: -4 }}><Kpi v={cover + '%'} k={`陪练覆盖率 ${active.length}/${TEAM.length}`} cls={cover >= 90 ? 'good' : 'warn'} /><Kpi v={(TEAM.reduce((a, m) => a + m.sess, 0) / TEAM.length).toFixed(1)} k="人均场次 · 30天" /><Kpi v={avgAll} k="班组平均分" /><Kpi v={redTotal} k="红线触发 · 本月" cls="warn" /><Kpi v={TEAM.filter(m => m.task === 'todo').length} k="任务未完成" /></div>
      <div className="tmwrap">
        <Hcard t="成员总览" sub="按能力短板排序"><table className="htbl"><thead><tr><th>成员</th><th>岗位</th><th>场次</th><th>平均分</th><th>短板</th><th>最近练习</th><th>本月任务</th></tr></thead><tbody>{TEAM.map(m => { const w = m.sess ? DIMS6[m.dims.indexOf(Math.min(...m.dims))] : '—'; return <tr key={m.n} className="rrow" onClick={() => memberDrill(m)}><td><b>{m.n}</b></td><td>{m.post}</td><td className="mono">{m.sess || '—'}</td><td className={`mono ${m.avg && m.avg < 75 ? 'wv' : 'gv'}`}>{m.avg || '—'}</td><td>{w}</td><td className="mono">{m.last < 0 ? '未练' : m.last === 0 ? '今天' : m.last + ' 天前'}</td><td>{m.task === 'done' ? <span className="ctag ok">已完成</span> : <span className="ctag wn">未完成</span>}</td></tr> })}</tbody></table><div className="tk3" style={{ marginTop: 8 }}>评价数据为陪练系统自动记录，用于培训安排参考；正式考评以人工审核为准。</div></Hcard>
        <Hcard t="班组短板热力" sub="成员 × 能力项"><div className="theat" style={{ gridTemplateColumns: '70px repeat(6,1fr)' }}><div className="heath" />{DIMS6.map(d => <div key={d} className="heath">{d}</div>)}{TEAM.map(m => <React.Fragment key={m.n}><div className="heatn">{m.n}</div>{m.dims.map((v, i) => v ? <div key={i} className="heatc" style={heatBg(v)}>{v}</div> : <div key={i} className="heatc" style={{ background: '#f4f6fa', color: '#b3bfcf' }}>—</div>)}</React.Fragment>)}</div></Hcard>
      </div>
      <div className="tmwrap2">
        <Hcard t="红线触发统计" sub="本月 · 按类型">{REDLINES.map(r => <div key={r[0]} className="bar"><span>{r[0]}</span><div className="btrk"><div className="bfill" style={{ width: `${Math.round(r[1] / maxR * 100)}%` }} /></div><b className="mono">{r[1]}</b></div>)}</Hcard>
        <Hcard t="未练与待提醒" ai="AI 草稿" sub={`${idle.length} 人`}>{idle.map(m => <div key={m.n} className="hrow"><b>{m.n}</b> <span className="tk3">{m.sess === 0 ? '本月未练' : m.last + ' 天未练'} · {m.task === 'todo' ? '任务未完成' : '任务已完成'}</span></div>)}<button className="btn" style={{ marginTop: 8 }} onClick={() => ctx.drill({ title: '提醒草稿', sub: `${idle.length} 人 · 复制后经企业微信发送`, body: <><div className="draft">{idle.map(m => `${m.n}：${m.sess === 0 ? '本月尚未进行陪练' : '已 ' + m.last + ' 天未练习'}，请于${dateAfter(HOME_TASK.dueDays)}前完成班组下发的「${HOME_TASK.name}」。`).join('\n')}{`\n\n—— ${LEAD_USER.team} ${LEAD_USER.name}`}</div><div className="tk3" style={{ marginTop: 8 }}>草稿由看板数据生成，发送前由班组长确认。</div></>, foot: <button className="btn" onClick={() => ctx.toast('已复制草稿')}>复制草稿</button> })}>生成提醒草稿</button></Hcard>
        <Hcard t="任务下发" sub="选教练 · 截止 · 及格线"><div className="frm"><label>教练<select value={f.coach} onChange={e => setF({ ...f, coach: e.target.value })}>{COACHES.map(c => <option key={c.id} value={c.id} disabled={!c.open}>{c.n}{c.open ? '' : '（未开通）'}</option>)}</select></label><label>练习方式<select value={f.plan} onChange={e => setF({ ...f, plan: e.target.value })}>{PLANS.filter(p => p.id !== 'wrong').map(p => <option key={p.id} value={p.id}>{p.n}</option>)}</select></label><label>模式<select value={f.mode} onChange={e => setF({ ...f, mode: e.target.value })}><option>考核模式</option><option>演练模式</option><option>教学模式</option></select></label><div className="frm2"><label>截止<input type="date" value={f.due} onChange={e => setF({ ...f, due: e.target.value })} /></label><label>及格线<input type="number" value={f.pass} min={60} max={100} onChange={e => setF({ ...f, pass: +e.target.value })} /></label></div><label>对象<select value={f.who} onChange={e => setF({ ...f, who: e.target.value })}><option>全班</option><option>未练人员</option>{TEAM.map(m => <option key={m.n}>{m.n}</option>)}</select></label><button className="btn btn-primary" onClick={() => send(f.who)}>下发任务</button></div></Hcard>
      </div>
      <Hcard t="本月任务" sub={`${allTasks.length} 项`}><table className="htbl"><thead><tr><th>教练</th><th>练习方式</th><th>模式</th><th>截止</th><th>及格线</th><th>对象</th><th>完成</th></tr></thead><tbody>{allTasks.map((t, i) => <tr key={i}><td>{t.coach}</td><td>{t.plan}</td><td>{t.mode}</td><td className="mono">{t.due}</td><td className="mono">{t.pass}</td><td>{t.who}</td><td className="mono">{t.done}/{t.total}</td></tr>)}</tbody></table></Hcard>
    </div></div>)
}

/* ================= 教练编辑器 ================= */
type EdStep = { no: number; raw: string; t: string; act: string; an: string; loc: string; judge: string[]; cite: string; red: boolean; ok: boolean }
function parseTicket(text: string): EdStep[] {
  return text.split(/\n+/).map(l => l.trim()).filter(Boolean).map((raw, i) => {
    const t = raw.replace(/^\d+[.、\s]+/, ''); let act = 'check', an = '状态核对', loc = '间隔现场', judge = ['状态核对'], cite = '附录J', red = false
    if (/接.*调度令|接调度令/.test(t)) { act = 'recv'; an = '接令'; loc = '调度电话旁'; judge = ['复诵与调度令一致', '记录发令单位/发令人/时间']; cite = '细则第十八条' }
    else if (/^汇报/.test(t)) { act = 'report'; an = '汇报'; loc = '调度电话旁'; judge = ['汇报口径完整'] }
    else if (/五防|模拟/.test(t)) { act = 'wufang'; an = '五防模拟'; loc = '五防电脑旁'; judge = ['按票面顺序模拟'] }
    else if (/地刀/.test(t) && /^合上/.test(t)) { act = 'ground'; an = '合接地刀闸'; loc = '就地控制柜'; judge = ['红线：合地刀前须完成两种非同源验电', '检查地刀合闸位置']; cite = '细则第十三条（四）/ 附录G-23'; red = true }
    else if (/地刀/.test(t) && /^拉开/.test(t)) { act = 'ground'; an = '拉接地刀闸'; loc = '就地控制柜'; judge = ['确认工作票终结、人员撤离', '检查地刀分闸位置'] }
    else if (/刀闸/.test(t) && /^(拉开|合上)/.test(t)) { act = 'gis'; an = 'GIS 刀闸操作'; loc = '监控后台旁'; judge = ['GIS 四项位置指示核对：后台/汇控柜/机构箱/拐臂']; cite = '附录G-5' }
    else if (/开关/.test(t) && /^(断开|合上)/.test(t)) { act = 'switch'; an = '开关操作'; loc = '监控后台旁'; judge = ['监控后台执行', '检查开关位置指示与三相电流'] }
    else if (/验电|确无电压/.test(t)) { act = 'verify'; an = '验电'; loc = '间隔现场'; judge = ['两种非同源指示均已变化']; cite = '附录G-23' }
    else if (/空气开关|压板|把手/.test(t)) { act = 'secondary'; an = '二次操作'; loc = '保护/测控屏'; judge = ['核对屏柜名称防走错屏', '操作后核对指示'] }
    else if (/标示牌|标志牌|挂.*牌/.test(t)) { act = 'tag'; an = '标示牌'; loc = '间隔现场'; judge = ['悬挂/收回位置与记录一致'] }
    else if (/^检查/.test(t)) { act = 'check'; an = '检查核对'; loc = /后台|电流/.test(t) ? '监控后台旁' : /地刀|刀闸/.test(t) ? '就地控制柜' : '间隔现场'; judge = ['核对实际位置与票面一致'] }
    return { no: i + 1, raw, t, act, an, loc, judge, cite, red, ok: false }
  })
}
function lintSteps(S0: EdStep[]) {
  const out: { lv: string; t: string; cite: string }[] = []; if (!S0.length) return out
  if (S0[0].act !== 'recv') out.push({ lv: 'wn', t: '首项不是接调度令，操作票应以接令开始', cite: '细则第十八条' })
  S0.forEach((s, i) => {
    if (s.red) { const prev = S0.slice(Math.max(0, i - 4), i); if (!prev.some(p => p.act === 'verify')) out.push({ lv: 'rl', t: `第${s.no}项合接地刀闸前 4 项内无验电项，须先验电再接地`, cite: '细则第十三条（四）' }) }
    if (s.act === 'gis' && !(S0[i + 1] && S0[i + 1].act === 'check')) out.push({ lv: 'wn', t: `第${s.no}项刀闸操作后缺少位置核对项`, cite: '附录G-5' })
    if (s.act === 'switch' && !(S0[i + 1] && S0[i + 1].act === 'check')) out.push({ lv: 'wn', t: `第${s.no}项开关操作后缺少位置与电流核对项`, cite: '附录J' })
    if (s.act === 'recv') { let j = i + 1, hasRep = false; while (j < S0.length && S0[j].act !== 'recv') { if (S0[j].act === 'report') hasRep = true; j++ } if (!hasRep) out.push({ lv: 'wn', t: `第${s.no}项接令后本段没有汇报调度项`, cite: '附录J' }) }
    const dup = S0.findIndex((x, k) => k < i && x.t === s.t); if (dup >= 0) out.push({ lv: 'wn', t: `第${s.no}项与第${S0[dup].no}项票面重复`, cite: '' })
  })
  const un = S0.filter(s => !s.ok).length; if (un) out.push({ lv: 'ok', t: `${un} 项尚未人工校核`, cite: '' })
  if (!out.length) out.push({ lv: 'ok', t: '未发现顺序与缺项问题，可校核后发布', cite: '' })
  return out
}
export function EditorPage() {
  const ctx = useCtx()
  const [tab, setTab] = useState('steps'); const [text, setText] = useState(SAMPLE_TICKET); const [steps, setSteps] = useState<EdStep[] | null>(null); const [lint, setLint] = useState<ReturnType<typeof lintSteps> | null>(null)
  const [ed, setEd] = useState({ name: '培训二线 1162 检修转运行 · 黄志远', role: '监护人', avatar: 'daozha', tone: '沉稳', opening: `${HOME_USER.name}，今天的操作任务是将培训二线1162线路由检修转运行。开始前先完成三审、着装互检和风险分析。` })
  const [w, setW] = useState([20, 20, 20, 15, 15, 10]); const [reds, setReds] = useState([true, true, true, true, true, true]); const [hint, setHint] = useState([1, 2, 4]); const [kb, setKb] = useState(KNOW.map(k => k.id)); const [kbq, setKbq] = useState(''); const [files, setFiles] = useState<[string, string][]>([])
  const [prog, setProg] = useState(''); const [pv, setPv] = useState({ pose: 'idle', speaking: false, nodAt: 0, shakeAt: 0 }); const [cap, setCap] = useState('点「试听开场白」，数字人按当前设定开口。')
  const [, force] = useState(0)
  const custom = lsGet<{ id: string; n: string; steps: number; reds: number; avatar: string; ts: number; role?: string; tone?: string; text?: string }[]>(LS.coaches, [])
  const sum = w.reduce((a, b) => a + b, 0) || 1; const pen = [0, 0, 0, 0, 0, 0]; ED_SAMPLE_VIO.forEach(([d, p]) => { pen[d] -= p * 1.2 }); const vals = pen.map(p => Math.max(4, Math.min(100, 100 + p))); const score = Math.round(vals.reduce((a, v, i) => a + v * w[i] / sum, 0))
  const gen = () => { const s = parseTicket(text); setSteps(s); setLint(null); let i = 0; const t = setInterval(() => { i++; setProg(`解析中 ${Math.min(i, s.length)}/${s.length}`); if (i >= s.length) { clearInterval(t); setProg(`解析完成 · ${s.length} 项`) } }, 90) }
  const genOpen = () => { const task = (text.split(/\n/)[0] || '').replace(/^\d+[.、\s]+/, '').replace(/^接.*?调度令[:：]?/, '').trim() || '本次操作任务'; const T = ({ 沉稳: ['今天我们有一项操作任务：', '开始前先完成三审、着装互检和风险分析，逐条确认。'], 亲和: ['我们一起来完成今天的操作任务：', '别急，先把三审、着装互检和风险分析过一遍，有不清楚的随时问我。'], 严格: ['本次操作任务：', '三审、着装互检、风险分析缺一项不得开始。每一项唱票复诵到位，出错即记。'] } as Record<string, [string, string]>)[ed.tone]; const R = ({ 监护人: `${HOME_USER.name}，`, 值班调度员: '110kV仿真站，我是南宁地调值班调度员。', 值班负责人: `${HOME_USER.name}、黄志远，我是值班负责人。`, 客户: '你好，我是这次停电施工的现场客户代表。' } as Record<string, string>)[ed.role] || ''; setEd({ ...ed, opening: `${R}${T[0]}${task}。${T[1]}` }) }
  const listen = () => { setPv({ ...pv, speaking: true, pose: 'explain', nodAt: Date.now() }); let i = 0; const t = setInterval(() => { i += 2; setCap(ed.opening.slice(0, i)); if (i >= ed.opening.length) { clearInterval(t); setPv(p => ({ ...p, speaking: false, pose: 'idle' })) } }, 40) }
  const publish = () => { if (!steps) return; const l = custom.slice(); l.unshift({ id: 'c' + Date.now(), n: ed.name.trim() || '自建教练', steps: steps.length, reds: steps.filter(s => s.red).length, avatar: ed.avatar, role: ed.role, tone: ed.tone, text, ts: Date.now() }); lsSet(LS.coaches, l.slice(0, 10)); ctx.toast(`已发布「${ed.name}」，教练中心可见，待班组长审核开通`); ctx.go('plaza') }
  const rehearse = () => { if (!steps) return ctx.toast('先生成剧本'); let i = 0; const paint = () => { const s = steps[i]; const call = s.act === 'recv' ? `现在调度下令：${s.t.replace(/^接.*?调度令[:：]?/, '')}。` : s.act === 'report' ? `${s.t}。` : `第${s.no}项，${s.t}。`
    ctx.drill({ title: `剧本试演 · ${ed.name}`, sub: `${steps.length} 项 · 监护人唱票 → 判定点`, body: <div className="rh"><div><DigitalHuman name={ed.name} img={s.act === 'recv' ? 'term' : ed.avatar} tint="#1e3a6e" dh={{ pose: s.act === 'recv' ? 'explain' : 'call', speaking: true, nodAt: 0, shakeAt: 0 }} size="sm" gaze={false} /><div className="tk3" style={{ textAlign: 'center' }}>{s.act === 'recv' ? '值班调度员' : ed.role} · {ed.tone}</div></div><div><div className="hbar"><div className="hfill" style={{ width: `${Math.round((i + 1) / steps.length * 100)}%` }} /></div><div className="tk3" style={{ margin: '6px 0' }}>第 {i + 1}/{steps.length} 项 · {s.an} · {s.loc}</div><div className="rhcall">{call}</div><div className="tk3">操作人应：手指「{s.t.replace(/^(拉开|合上|断开|检查|核对)/, '').slice(0, 18)}」并复诵 → 监护人「对，执行」→ 执行 → 检查回报</div><div className="rvtags" style={{ marginTop: 8 }}>{s.judge.map(j => <i key={j} className={/红线/.test(j) ? 'bad' : 'ok'}>{j}</i>)}</div><div className="tk3" style={{ marginTop: 6 }}>依据 {s.cite}</div></div></div>, foot: <><button className="btn" onClick={() => { i = Math.max(0, i - 1); paint() }}>上一项</button><button className="btn btn-primary" onClick={() => { i = Math.min(steps.length - 1, i + 1); paint() }}>下一项</button></> }) }; paint() }
  const tabs: [string, string][] = [['role', '角色设定'], ['steps', '剧本步骤'], ['score', '评分规则'], ['kb', '知识库挂载'], ['pub', '已发布']]
  return (
    <div className="hpage"><div className="ppage">
      <div className="ph"><b>教练编辑器</b><span>从一张操作票生成一个新教练 · 已发布 {custom.length} 个</span></div>
      <div className="tabs">{tabs.map(([k, n]) => <span key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{n}</span>)}</div>
      <section className="hcard"><div className="hcb">
        {tab === 'role' && <div className="edrole"><div className="frm">
          <label>教练名称<input value={ed.name} onChange={e => setEd({ ...ed, name: e.target.value })} /></label>
          <label>扮演角色<select value={ed.role} onChange={e => setEd({ ...ed, role: e.target.value })}>{['监护人', '值班调度员', '值班负责人', '客户'].map(r => <option key={r}>{r}</option>)}</select></label>
          <label>形象（形象库 21 幅）<div className="avpick">{Object.keys(COACH_IMGS).filter(k => !k.endsWith('_hd')).map(k => { const c = COACHES.find(x => (x.avatar || x.id) === k); return <figure key={k} className={ed.avatar === k ? 'on' : ''} title={c ? c.n : k} onClick={() => setEd({ ...ed, avatar: k })}><img src={COACH_IMGS[k]} alt={k} /><figcaption>{c ? c.n.replace(/ · .*$/, '') : k}</figcaption></figure> })}</div></label>
          <label>语气<div className="seg">{['沉稳', '亲和', '严格'].map(t => <span key={t} className={ed.tone === t ? 'on' : ''} onClick={() => setEd({ ...ed, tone: t })}>{t}</span>)}</div></label>
          <label>开场白<textarea rows={3} value={ed.opening} onChange={e => setEd({ ...ed, opening: e.target.value })} /></label>
          <div className="rvact"><button className="btn" onClick={genOpen}>按角色与语气生成开场白</button><button className="btn btn-primary" onClick={listen}>试听开场白</button></div></div>
          <div className="edprev"><div className="hch" style={{ padding: '0 0 8px', background: 'none', border: 'none' }}><b>数字人预览</b><span>形象 · 语气 · 开场白 即时生效</span></div><DigitalHuman name={ed.name} img={ed.avatar} tint="#1e3a6e" dh={pv} size="sm" gaze={false} /><div className="edname"><b>{ed.name}</b><span>AI数字人陪练教练 · {ed.role}</span></div><div className="edcap">{cap}</div></div></div>}
        {tab === 'steps' && <div className="edsteps"><div className="edsrc"><div className="hch" style={{ padding: '0 0 6px', background: 'none', border: 'none' }}><b>操作票原文</b><span>粘贴票面文本，每行一项</span></div><textarea rows={17} value={text} onChange={e => setText(e.target.value)} /><div className="rvact"><button className="btn btn-primary" onClick={gen}>生成剧本</button><button className="btn" onClick={() => setText(SAMPLE_TICKET)}>载入样例票</button><span className="tk3">{prog}</span></div></div>
          <div className="edout"><div className="hch" style={{ padding: '0 0 6px', background: 'none', border: 'none' }}><b>剧本草稿</b><em className="ai">AI 解析</em><span>{steps ? `${steps.length} 项 · 判定点 ${steps.reduce((a, s) => a + s.judge.length, 0)} · 红线 ${steps.filter(s => s.red).length} · 已校核 ${steps.filter(s => s.ok).length}` : '待生成'}</span></div>
            {steps ? <><table className="htbl edtbl"><thead><tr><th>序</th><th>票面</th><th>动作</th><th>作业位置</th><th>判定点</th><th>依据</th><th>校核</th><th></th></tr></thead><tbody>{steps.map((s, i) => <tr key={i} className={`erow in ${s.red ? 'red' : ''}`}><td className="mono">{s.no}</td><td>{s.t}</td><td><i className="ctag-c">{s.an}</i></td><td contentEditable suppressContentEditableWarning className="edcell" onBlur={e => { s.loc = e.currentTarget.textContent || s.loc }}>{s.loc}</td><td>{s.judge.map(j => <span key={j} className={`jchip ${/红线/.test(j) ? 'rl' : ''}`}>{j}</span>)}</td><td className="mono tk3">{s.cite}</td><td><input type="checkbox" checked={s.ok} onChange={e => { s.ok = e.target.checked; force(x => x + 1) }} /></td>
              <td className="edtools"><button title="上移" onClick={() => { if (i === 0) return; const n = steps.slice(); [n[i - 1], n[i]] = [n[i], n[i - 1]]; n.forEach((x, k) => { x.no = k + 1 }); setSteps(n) }}>↑</button><button title="下移" onClick={() => { if (i === steps.length - 1) return; const n = steps.slice(); [n[i + 1], n[i]] = [n[i], n[i + 1]]; n.forEach((x, k) => { x.no = k + 1 }); setSteps(n) }}>↓</button><button className={s.red ? 'on' : ''} title="设为红线项" onClick={() => { s.red = !s.red; if (s.red && !s.judge.some(j => /红线/.test(j))) s.judge.unshift('红线：本项错误一票否决'); if (!s.red) s.judge = s.judge.filter(j => !/^红线：本项/.test(j)); force(x => x + 1) }}>红线</button><button title="删除" onClick={() => { const n = steps.filter((_, k) => k !== i); n.forEach((x, k) => { x.no = k + 1 }); setSteps(n) }}>✕</button></td></tr>)}</tbody></table>
              {lint && <div className="edlint">{lint.map((l, k) => <div key={k} className="hrow"><span className={`ctag ${l.lv}`}>{l.lv === 'rl' ? '红线' : l.lv === 'wn' ? '提醒' : '通过'}</span>{l.t}{l.cite && <i className="cite">{l.cite}</i>}</div>)}</div>}
              <div className="rvact"><button className="btn" onClick={() => setLint(lintSteps(steps))}>一致性检查</button><button className="btn" onClick={rehearse}>剧本试演</button><button className="btn" onClick={() => { steps.forEach(s => { s.ok = true }); force(x => x + 1) }}>全部校核通过</button><button className="btn btn-primary" disabled={!steps.every(s => s.ok)} onClick={publish}>发布为新教练</button></div></> : <div className="edempty">粘贴操作票后点「生成剧本」，系统按票面逐项解析动作类型、作业位置、判定点与依据条款；随后可逐项校核、调整顺序、标记红线，并做一致性检查与试演。</div>}</div></div>}
        {tab === 'score' && <div className="edscore"><div className="frm"><div className="hch" style={{ padding: '0 0 6px', background: 'none', border: 'none' }}><b>六维权重</b><span>合计 <b>{w.reduce((a, b) => a + b, 0)}</b></span><span className="phr chips">{Object.keys(ED_TPL).map(k => <span key={k} className="chip" onClick={() => { setW(ED_TPL[k].w.slice()); setReds(ED_TPL[k].reds.map(Boolean)); setHint(ED_TPL[k].hint.slice()); ctx.toast(`已套用「${ED_TPL[k].n}」模板`) }}>{ED_TPL[k].n}模板</span>)}<span className="chip" onClick={() => { const s = w.reduce((a, b) => a + b, 0) || 1; const n = w.map(x => Math.round(x / s * 100)); n[0] += 100 - n.reduce((a, b) => a + b, 0); setW(n) }}>归一到 100</span></span></div>
          {DIMS6.map((d, i) => <label key={d} className="wrow">{d}<input type="range" min={0} max={40} value={w[i]} onChange={e => { const n = w.slice(); n[i] = +e.target.value; setW(n) }} /><b className="mono">{w[i]}</b></label>)}
          <div className="hch" style={{ padding: '10px 0 6px', background: 'none', border: 'none' }}><b>红线（一票否决）</b><span>{reds.filter(Boolean).length}/6 启用</span></div><div className="redlist">{RED_NAMES.map((r, i) => <label key={r} className={`tog ${reds[i] ? 'on' : ''}`} onClick={() => { const n = reds.slice(); n[i] = !n[i]; setReds(n) }}><i />{r}</label>)}</div>
          <div className="hch" style={{ padding: '10px 0 6px', background: 'none', border: 'none' }}><b>提示扣分</b><span>三级递进 · 留痕不阻断</span></div><div className="hrow">方向提示 −{hint[0]} · 要点提示 −{hint[1]} · 标准答案 −{hint[2]}</div></div>
          <div className="edsample"><div className="hch" style={{ padding: '0 0 8px', background: 'none', border: 'none' }}><b>示例场次试算</b><span>拖动权重即时重算</span></div><div className="rvbig" style={{ fontSize: 44 }}>{score}</div><div className="tk3">示例扣分：{ED_SAMPLE_VIO.map(v => `${DIMS6[v[0]]} −${v[1]}（${v[2]}）`).join('；')}</div><MiniBars vals={vals.map(Math.round)} /></div></div>}
        {tab === 'kb' && <div className="frm"><div className="hch" style={{ padding: '0 0 6px', background: 'none', border: 'none' }}><b>知识主题</b><span>{kb.length}/{KNOW.length} 已挂载 · 来自知识资产中枢</span></div><div className="kblist">{KNOW.map(k => <label key={k.id} className={`tog ${kb.includes(k.id) ? 'on' : ''}`} onClick={() => setKb(kb.includes(k.id) ? kb.filter(x => x !== k.id) : kb.concat(k.id))}><i />{k.t}<span>{k.sub}</span></label>)}</div>
          <div className="hch" style={{ padding: '12px 0 6px', background: 'none', border: 'none' }}><b>检索测试</b><span>按挂载的知识库回答，与陪练舱「问教练」同一检索</span></div><div className="kbq"><input value={kbq} placeholder="例如：GIS 刀闸要核对哪四项" onChange={e => setKbq(e.target.value)} /><div className="kbr">{kbq.trim().length >= 2 ? (() => { const r = retrieve(kbq); return <><div className="airv" style={{ fontSize: 12.5, whiteSpace: 'pre-line' }}>{r.text}</div><div className="tk3" style={{ marginTop: 4 }}>依据：{r.src}</div></> })() : <span className="tk3">输入问题即时检索。</span>}</div></div>
          <div className="hch" style={{ padding: '12px 0 6px', background: 'none', border: 'none' }}><b>规程与素材</b><span>{KB_FILES.length + files.length} 份</span><span className="phr"><label className="btn sm" style={{ cursor: 'pointer' }}>上传规程文本<input type="file" accept=".txt,.md,.csv" hidden onChange={e => { const f = e.target.files?.[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { const n = String(rd.result || '').split(/\n+/).filter(l => l.trim()).length; setFiles(x => [[f.name, `已解析 · ${n} 段`], ...x]); ctx.toast(`「${f.name}」已解析 ${n} 段，挂载到知识库`) }; rd.readAsText(f) }} /></label></span></div>
          <table className="htbl"><thead><tr><th>文件</th><th>解析状态</th></tr></thead><tbody>{files.concat(KB_FILES).map(f => <tr key={f[0]}><td>{f[0]}</td><td className="tk3">{f[1]}</td></tr>)}</tbody></table></div>}
        {tab === 'pub' && <div className="frm"><div className="hch" style={{ padding: '0 0 6px', background: 'none', border: 'none' }}><b>已发布教练</b><span>{custom.length} 个 · 待班组长审核开通</span></div>{custom.length ? <table className="htbl"><thead><tr><th>教练</th><th>形象</th><th>步骤</th><th>红线</th><th>发布时间</th><th></th></tr></thead><tbody>{custom.map(c => <tr key={c.id}><td><b>{c.n}</b></td><td><img className="cav" style={{ width: 32, height: 32 }} src={COACH_IMGS[c.avatar] || ''} alt="" /></td><td className="mono">{c.steps}</td><td className="mono">{c.reds}</td><td className="mono">{new Date(c.ts).toLocaleString('zh-CN', { hour12: false }).slice(0, 16)}</td><td><button className="btn sm" onClick={() => { setEd({ ...ed, name: c.n, avatar: c.avatar, role: c.role || ed.role, tone: c.tone || ed.tone }); if (c.text) { setText(c.text); setSteps(parseTicket(c.text).map(s => ({ ...s, ok: true }))) } setTab('steps'); ctx.toast(`已载入「${c.n}」`) }}>载入编辑</button> <button className="btn sm" onClick={() => { lsSet(LS.coaches, custom.filter(x => x.id !== c.id)); ctx.toast('已下架'); force(x => x + 1) }}>下架</button></td></tr>)}</tbody></table> : <div className="edempty">尚未发布自建教练。在「剧本步骤」生成并校核后发布。</div>}</div>}
      </div></section></div></div>)
}

/* ================= 公司看板（培训科视角） ================= */
export function CompanyPage() {
  const ctx = useCtx()
  const [grp, setGrp] = useState('全部')
  const grps = ['全部', ...new Set(COMPANY_BOARD.map(u => u.grp))]
  const rows = COMPANY_BOARD.filter(u => grp === '全部' || u.grp === grp)
  const people = COMPANY_BOARD.reduce((a, u) => a + u.people, 0), sess = COMPANY_BOARD.reduce((a, u) => a + u.sess, 0), red = COMPANY_BOARD.reduce((a, u) => a + u.red, 0)
  const cover = Math.round(COMPANY_BOARD.reduce((a, u) => a + u.cover * u.people, 0) / people)
  const weakCnt: Record<string, number> = {}; COMPANY_BOARD.forEach(u => { weakCnt[u.weak] = (weakCnt[u.weak] || 0) + 1 })
  const weakTop = Object.entries(weakCnt).sort((a, b) => b[1] - a[1]).slice(0, 6); const maxW = weakTop[0]?.[1] || 1
  const drillUnit = (u: typeof COMPANY_BOARD[number]) => ctx.drill({ title: `单位 · ${u.unit}`, sub: `${u.grp} · 在册 ${u.people.toLocaleString()} 人 · 已开通教练 ${u.coaches} 个`, body: <><div className="hkpis"><Kpi v={u.cover + '%'} k="陪练覆盖率" cls={u.cover >= 85 ? 'good' : 'warn'} /><Kpi v={u.sess.toLocaleString()} k="本年场次" /><Kpi v={u.avg} k="平均得分" /><Kpi v={u.red} k="红线触发" cls={u.red > 10 ? 'bad' : ''} /></div><Sec t="本单位已开通的教练"><div className="rvtags">{COACHES.filter(c => c.unit === u.unit || (u.grp === '地市供电局' && c.unit.includes('地市供电局'))).slice(0, 8).map(c => <i key={c.id} className={c.open ? 'ok' : ''}>{c.n}</i>)}</div></Sec><Sec t="首要短板"><div className="hrow">{u.weak} · 建议按单位下发一轮对应专项，并把该项纳入下季度技能评价抽考</div></Sec><div className="tk3">数据为陪练系统自动汇总，用于培训安排参考；正式考评以人工审核为准。</div></>, foot: <><button className="btn" onClick={() => { ctx.drill(null); ctx.go('plaza') }}>查看该单位教练</button><button className="btn btn-primary" onClick={() => { ctx.drill(null); ctx.toast(`已向 ${u.unit} 培训专责下发「${u.weak}」专项任务`) }}>下发专项任务</button></> })
  return (
    <div className="hpage"><div className="ppage">
      <div className="ph"><b>公司陪练运行看板</b><span>{DEPT_USER.name} · {DEPT_USER.team} · 28 个一级单位口径 · 本年累计</span></div>
      <div className="hkpis" style={{ marginTop: -4 }}><Kpi v={people.toLocaleString()} k="在册陪练对象" /><Kpi v={cover + '%'} k="人员加权覆盖率" cls={cover >= 80 ? 'good' : 'warn'} /><Kpi v={sess.toLocaleString()} k="本年陪练场次" /><Kpi v={red} k="红线触发 · 本年" cls="warn" /><Kpi v={COACHES.length} k="教练目录" /><Kpi v={new Set(COACHES.map(c => c.unit)).size} k="教练覆盖单位" cls="good" /></div>
      <div className="pzf"><label>单位类型</label>{grps.map(g => <span key={g} className={`fchip ${grp === g ? 'on' : ''}`} onClick={() => setGrp(g)}>{g}</span>)}</div>
      <div className="gtwo g21">
        <Hcard t="各单位陪练覆盖与得分" sub="按覆盖率与得分排序"><table className="htbl"><thead><tr><th>一级单位</th><th>类型</th><th>在册</th><th>覆盖率</th><th>场次</th><th>平均分</th><th>红线</th><th>教练</th><th>首要短板</th></tr></thead><tbody>{rows.map(u => <tr key={u.unit} className="rrow" onClick={() => drillUnit(u)}><td><b>{u.unit}</b></td><td><span className="cgrp">{u.grp}</span></td><td className="mono">{u.people.toLocaleString()}</td><td><div style={{ display: 'flex', gap: 6, alignItems: 'center' }}><div className="hbar" style={{ width: 70, margin: 0 }}><div className="hfill" style={{ width: `${u.cover}%`, background: u.cover >= 85 ? '#1d7a4f' : u.cover >= 70 ? '#2b4e92' : '#b8791d' }} /></div><span className="mono">{u.cover}%</span></div></td><td className="mono">{u.sess.toLocaleString()}</td><td className={`mono ${u.avg < 78 ? 'wv' : 'gv'}`}>{u.avg}</td><td className={`mono ${u.red > 12 ? 'wv' : ''}`}>{u.red}</td><td className="mono">{u.coaches}</td><td>{u.weak}</td></tr>)}</tbody></table></Hcard>
        <div className="ppage">
          <Hcard t="全公司短板分布" sub="按单位首要短板计数">{weakTop.map(([k, n]) => <div key={k} className="bar"><span>{k}</span><div className="btrk"><div className="bfill" style={{ width: `${Math.round(n / maxW * 100)}%` }} /></div><b className="mono">{n}</b></div>)}<div className="tk3" style={{ marginTop: 6 }}>设备状态核对与异常处置在地市局集中出现，建议纳入下季度公司级专项。</div></Hcard>
          <Hcard t="教练目录按单位类型" sub="每类单位可练的教练数量">{['地市供电局（14 个）', '县域新电力', '本部职能部门', '直属机构', '产业公司'].map(g => { const n = COACHES.filter(c => (g === '地市供电局（14 个）' ? c.unit.includes('地市供电局') : g === '县域新电力' ? c.unit.includes('新电力') : g === '本部职能部门' ? c.fam === '本部职能部门' || ['市场营销部', '生产技术部', '人力资源部', '安全监管部', '战略规划部', '基建部'].includes(c.unit) : g === '直属机构' ? c.fam === '直属机构' || ['电力调度控制中心（省调）', '广西电科院', '客户服务中心（95598）', '计量中心', '培训评价中心', '广西电力交易中心'].includes(c.unit) : c.fam === '产业公司' || ['广西电动汽车服务公司', '广西送变电建设公司', '广西电网能源科技公司'].includes(c.unit))).length; return <div key={g} className="bar"><span>{g}</span><div className="btrk"><div className="bfill" style={{ width: `${Math.round(n / 14 * 100)}%`, background: '#2b4e92' }} /></div><b className="mono">{n}</b></div> })}<div className="tk3" style={{ marginTop: 6 }}>人力资源部自身的「人资制度政策应答」「结构化面试官对练」已开通，供本部门员工使用。</div></Hcard>
          <Hcard t="本季度公司级动作" ai="AI 建议" sub="由各单位短板与覆盖率生成">{[['向覆盖率低于 70% 的 6 个单位下发「完整操作票 · 考核模式」季度任务', 'task'], ['把「GIS 四项核对」「异常处置」两项专项纳入 14 个地市局技能评价抽考', 'plan'], ['为县域新电力 40 家县企开通「供电所营配综合受理」教练', 'plaza']].map(([t, go]) => <div key={t} className="hrow" style={{ display: 'flex', gap: 8, alignItems: 'center' }}><span style={{ flex: 1 }}>{t}</span><button className="btn sm" onClick={() => go === 'plaza' ? ctx.go('plaza') : ctx.toast('已生成任务单，待培训科确认后下发')}>执行</button></div>)}</Hcard>
        </div>
      </div>
    </div></div>)
}

export const ROLE_USERS: Record<RoleKey, { name: string; team: string; post: string }> = { student: HOME_USER, lead: LEAD_USER, dept: DEPT_USER }
export { CHARACTERS }
