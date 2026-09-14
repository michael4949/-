/* 执行跟踪（一级）→ 单位跟踪（二级）→ 个人跟踪（三级） */
import { useMemo, useState } from 'react'
import { Panel, Bars, CountUp } from '../ui'
import { LineChart, Columns, Ring, Sparkline, Pyramid } from '../charts'
import { FUNNEL, CUM_PLAN, CUM_ACT, MONTHS, NOW_M, UNIT_PLANS, BUREAU_PLANS, unitPlanOf, overdueOf, personPlan, planDone, planHours, short, TOTAL } from './data'
import { unitOf, isFunc, isBureauUnit, teamsOf, teamStat, BUREAUS, personById, teamPersons, postOfTeam } from '../atlas/data'
import { useNav, Typewriter, Kpi, Delta, KindTag, StTag } from './nav'

export function TrackView() {
  const { push, toast, jump } = useNav()
  const [mode, setMode] = useState<'单位' | '地市局'>('单位')
  const rows = (mode === '单位' ? UNIT_PLANS : BUREAU_PLANS).slice().sort((a, b) => b.done - a.done)
  const trend = (u: typeof rows[0]) => u.actual.slice(0, NOW_M - 1).map((v, i) => Math.round(v / Math.max(1, u.planned[i]) * 100))
  return (
    <div className="h-full flex flex-col gap-3 p-3 min-h-0">
      <div className="grid grid-cols-6 gap-3 shrink-0">
        <Kpi k="计划完成率" v={<><CountUp to={TOTAL.done} dec={1} /><span className="text-[12px] font-normal text-slate-500 ml-1">%</span></>} d="较上季 +3.1 个百分点" />
        <Kpi k="按期推进" v={<><CountUp to={Math.round(FUNNEL[3].n / FUNNEL[0].n * 100)} /><span className="text-[12px] font-normal text-slate-500 ml-1">%</span></>} d={`${FUNNEL[3].n.toLocaleString()} 人`} gold />
        <Kpi k="逾期条目" v={<CountUp to={TOTAL.overdue} />} d="集中在陪练与考试" onClick={() => rows.length && push({ v: 'trackUnit', name: rows[rows.length - 1].name })} />
        <Kpi k="未派发" v={<CountUp to={FUNNEL[0].n - FUNNEL[1].n} />} d="新入职与转岗人员" gold />
        <Kpi k="本月应完成" v={<CountUp to={Math.round(TOTAL.plans * .31)} />} d={`已完成 ${Math.round(TOTAL.plans * .31 * .42).toLocaleString()}`} />
        <Kpi k="高风险单位" v={<CountUp to={UNIT_PLANS.filter(u => u.risk === '高').length} />} d="完成率低于 75%" gold onClick={() => setMode('单位')} />
      </div>
      <div className="flex-1 min-h-0 grid grid-cols-[320px_1fr_340px] gap-3">
        <div className="flex flex-col gap-3 min-h-0">
          <Panel title="执行漏斗"><div className="p-2"><Pyramid levels={FUNNEL.map((f, i) => ({ k: f.k, n: f.n, c: ['#1e3a6e', '#2b4e92', '#2f6df6', '#19b8d8', '#178a54'][i], note: i ? `${Math.round(f.n / FUNNEL[i - 1].n * 100)}%` : undefined }))} h={180} /></div></Panel>
          <Panel title="逾期按形式" className="flex-1"><div className="p-3"><Bars data={[{ label: '陪练', v: Math.round(TOTAL.overdue * .38) }, { label: '考试', v: Math.round(TOTAL.overdue * .24) }, { label: '课程', v: Math.round(TOTAL.overdue * .21) }, { label: '带教', v: Math.round(TOTAL.overdue * .1) }, { label: '认定', v: Math.round(TOTAL.overdue * .07) }]} /><button className="btn btn-sm w-full mt-3" onClick={() => { toast('已向逾期人员及班组长推送催办'); jump('ask', 'chat', { v: 'chat', q: '本月逾期的陪练任务' } as never) }}>一键催办逾期</button></div></Panel>
        </div>
        <div className="flex flex-col gap-3 min-h-0">
          <Panel title="累计完成率 vs 计划　%" extra={<span className="ai-badge">进度</span>}><div className="px-3 pt-2"><LineChart labels={MONTHS} h={150} unit="%" series={[{ name: '计划累计', color: '#94a3b8', dash: true, data: CUM_PLAN }, { name: '实际累计', color: '#1e3a6e', area: true, data: CUM_ACT }]} yMin={0} yMax={100} /></div></Panel>
          <Panel title={`${mode}完成率排行`} className="flex-1" bodyClass="overflow-auto scroll" extra={<div className="seg"><button className={mode === '单位' ? 'on' : ''} onClick={() => setMode('单位')}>28 个单位</button><button className={mode === '地市局' ? 'on' : ''} onClick={() => setMode('地市局')}>14 个地市局</button></div>}>
            <table className="grid"><thead><tr><th>#</th><th>{mode}</th><th>人数</th><th>完成率</th><th>逾期</th><th>月度趋势</th><th>风险</th></tr></thead><tbody>{rows.map((u, i) => <tr key={u.name} className="cursor-pointer row-in" onClick={() => push({ v: 'trackUnit', name: u.name })}><td className="num" style={{ color: i < 3 ? 'var(--gold)' : '#94a3b8' }}>{i + 1}</td><td className="font-medium">{short(u.name)}</td><td className="num">{u.people.toLocaleString()}</td><td className="num font-semibold" style={{ color: u.done >= 85 ? 'var(--ok)' : u.done >= 75 ? 'var(--indigo)' : 'var(--bad)' }}>{u.done}%</td><td className="num">{u.overdue}</td><td><Sparkline v={trend(u)} w={80} color={u.risk === '高' ? 'var(--bad)' : 'var(--ai)'} /></td><td><span className={`tag ${u.risk === '高' ? 'tag-bad' : u.risk === '中' ? 'tag-warn' : 'tag-ok'}`}>{u.risk}</span></td></tr>)}</tbody></table>
          </Panel>
        </div>
        <div className="flex flex-col gap-3 min-h-0">
          <Panel title="AI 跟踪判读" extra={<span className="ai-badge">每周</span>}><div className="p-3"><div className="ai-out text-[12px]"><Typewriter text={`累计完成 ${CUM_ACT[NOW_M - 2]}%，计划 ${CUM_PLAN[NOW_M - 2]}%，落后 ${CUM_PLAN[NOW_M - 2] - (CUM_ACT[NOW_M - 2] ?? 0)} 个百分点，主要由 7–8 月迎峰度夏停训造成。${UNIT_PLANS.filter(u => u.risk === '高').map(u => short(u.name)).slice(0, 3).join('、')}完成率低于 75%，逾期以陪练为主；建议第四季度前两周集中补练。`} speed={7} /></div>
            <div className="mt-2 space-y-1.5"><button className="act-btn" onClick={() => { toast('已下发补练任务'); jump('coach', 'company') }}><span className="ic">练</span>集中补练<small>陪练中心 · 公司看板</small></button><button className="act-btn gold" onClick={() => push({ v: 'insight' })}><span className="ic">预</span>查看年末预测<small>AI 优化与预测</small></button></div></div></Panel>
          <Panel title="本月里程碑" className="flex-1"><div className="p-2 space-y-1 text-[11.5px]">{[['09-15', '第三季度计划复盘', '进行中'], ['09-20', '技师申报材料截止', '待开始'], ['09-25', '第四季度计划下发', '待开始'], ['09-30', '迎峰度夏停训解除', '待开始']].map(([d, n, s]) => <div key={d} className="flex items-center gap-2 px-2 py-1.5 hairline"><span className="num text-slate-500">{d}</span><span className="flex-1">{n}</span><StTag s={s} /></div>)}</div></Panel>
        </div>
      </div>
    </div>
  )
}

/* ---------- 二级：单位跟踪 ---------- */
export function TrackUnit({ name }: { name: string }) {
  const { push, toast, jump } = useNav()
  const plan = unitPlanOf(name) ?? UNIT_PLANS[0]
  const isB = BUREAUS.includes(plan.name)
  const u = isB ? unitOf('地市供电局（14个）')! : (unitOf(plan.name) ?? unitOf('地市供电局（14个）')!)
  const teams = useMemo(() => (isB ? ['变电管理一所', '变电管理二所', '配电管理所', '输电管理所', '营销部', '调度控制中心', '客户服务中心', '安全监管部'].map(t => `${plan.name} · ${t}`) : isBureauUnit(u) ? BUREAUS : teamsOf(u)).map(t => { const s = teamStat(u, t); return { t, s, done: Math.max(50, Math.min(99, plan.done + ((s.v - 80) / 2))), overdue: Math.round(s.n * (100 - plan.done) / 100 * .18) } }).sort((a, b) => b.done - a.done), [u, plan, isB])
  const team0 = isB ? `${plan.name} · 变电管理一所` : isBureauUnit(u) ? `${BUREAUS[0]} · 变电管理一所` : isFunc(u) ? u.depts[0].name : `${short(u.name)} · 变电管理一所`
  const overdue = useMemo(() => overdueOf(u.name, team0), [u.name, team0])
  const cum = plan.actual.map((_, i) => i < NOW_M ? Math.round(plan.actual.slice(0, i + 1).reduce((a, b) => a + b, 0) / plan.hours * 100) : null)
  const cumP = plan.planned.map((_, i) => Math.round(plan.planned.slice(0, i + 1).reduce((a, b) => a + b, 0) / plan.hours * 100))
  return (
    <div className="h-full grid grid-cols-[300px_1fr_340px] gap-3 p-3 min-h-0">
      <div className="flex flex-col gap-3 min-h-0">
        <div className="panel p-4 shrink-0"><span className={`tag ${plan.risk === '高' ? 'tag-bad' : plan.risk === '中' ? 'tag-warn' : 'tag-ok'}`}>风险 {plan.risk}</span><div className="text-[17px] font-semibold serif mt-1">{short(plan.name)}</div><div className="text-[11px] text-slate-500">{plan.people.toLocaleString()} 人 · 人均 {plan.avgH} 学时</div><div className="flex items-center gap-3 mt-3"><Ring v={plan.done} size={64} stroke={7} color={plan.done >= 85 ? 'var(--ok)' : plan.done >= 75 ? 'var(--ai)' : 'var(--bad)'} sub="完成率" /><div className="text-[11.5px] text-slate-600 leading-relaxed">逾期 <b className="num" style={{ color: 'var(--bad)' }}>{plan.overdue}</b> 条<br />累计 <b className="num">{cum[NOW_M - 2]}%</b> / 计划 {cumP[NOW_M - 2]}%<br />环比 <Delta v={Math.round((plan.actual[NOW_M - 2] / Math.max(1, plan.planned[NOW_M - 2]) - plan.actual[NOW_M - 3] / Math.max(1, plan.planned[NOW_M - 3])) * 100)} unit="pt" /></div></div></div>
        <Panel title="月度完成学时"><div className="p-3"><Columns h={110} data={MONTHS.map((m, i) => ({ label: m, v: Math.round(plan.actual[i] / 100) / 10, color: i === NOW_M - 1 ? 'var(--gold)' : undefined }))} unit="k" /></div></Panel>
        <Panel title="AI 判读" className="flex-1"><div className="p-3"><div className="ai-out text-[12px]"><Typewriter text={`${short(plan.name)}完成率 ${plan.done}%，${teams[teams.length - 1].t.replace(/^.*· /, '')}最低（${Math.round(teams[teams.length - 1].done)}%，逾期 ${teams[teams.length - 1].overdue} 条），逾期以陪练为主；建议班组长本周安排集中补练，${plan.risk === '高' ? '并把第四季度个人意向类条目延后。' : '第四季度按计划推进即可。'}`} speed={7} /></div><button className="btn btn-primary btn-sm w-full mt-2" onClick={() => { toast(`已向 ${short(plan.name)} 各班组长推送催办`); jump('coach', 'team') }}>催办到班组看板</button></div></Panel>
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="累计完成率 vs 计划"><div className="px-3 pt-2"><LineChart labels={MONTHS} h={140} unit="%" series={[{ name: '计划', color: '#94a3b8', dash: true, data: cumP }, { name: '实际', color: '#2f6df6', area: true, data: cum }]} yMin={0} yMax={100} /></div></Panel>
        <Panel title={`${isB || isBureauUnit(u) ? (isB ? '班组' : '地市局') : isFunc(u) ? '科室' : '班组'}完成率`} className="flex-1" bodyClass="overflow-auto scroll" extra={<span className="text-[10.5px] text-slate-500">{isBureauUnit(u) && !isB ? '点击进入地市局' : '点击进入人员'}</span>}><table className="grid"><thead><tr><th>#</th><th>名称</th><th>负责人</th><th>人数</th><th>完成率</th><th>逾期</th></tr></thead><tbody>{teams.map((x, i) => <tr key={x.t} className="cursor-pointer" onClick={() => isBureauUnit(u) && !isB ? push({ v: 'trackUnit', name: x.t }) : push({ v: 'trackPerson', name: u.name, team: x.t, pid: teamPersons(u.name, x.t, postOfTeam(x.t))[0].id })}><td className="num" style={{ color: i < 3 ? 'var(--gold)' : '#94a3b8' }}>{i + 1}</td><td className="font-medium">{x.t.replace(/^.*· /, '')}</td><td>{x.s.lead}</td><td className="num">{x.s.n.toLocaleString()}</td><td className="num font-semibold" style={{ color: x.done >= 85 ? 'var(--ok)' : x.done >= 75 ? 'var(--indigo)' : 'var(--bad)' }}>{Math.round(x.done)}%</td><td className="num">{x.overdue}</td></tr>)}</tbody></table></Panel>
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title={`逾期与未通过　样本 ${overdue.length} 条`} className="flex-1" bodyClass="overflow-auto scroll" extra={<span className="text-[10.5px] text-slate-500">点击进入个人</span>}><div className="p-2 space-y-1.5">{overdue.length ? overdue.map(o => <button key={o.p.id + o.item.id} onClick={() => push({ v: 'trackPerson', name: u.name, team: o.p.team, pid: o.p.id })} className="a-card w-full text-left"><div className="flex items-center gap-2"><KindTag k={o.item.kind} /><span className="text-[12px] font-medium">{o.p.name}</span><span className="num text-[10.5px] ml-auto" style={{ color: 'var(--bad)' }}>逾期 {o.days} 天</span></div><div className="text-[11px] text-slate-600 mt-0.5 truncate">{o.item.n}</div><div className="mt-1"><StTag s={o.item.st} /></div><span className="go">›</span></button>) : <div className="text-[12px] text-slate-400 p-3">样本班组无逾期条目</div>}</div></Panel>
      </div>
    </div>
  )
}

/* ---------- 三级：个人跟踪 ---------- */
export function TrackPerson({ name, team, pid }: { name: string; team: string; pid: string }) {
  const { push, toast, jump } = useNav()
  const p = personById(pid, name, team) ?? teamPersons(name, team, postOfTeam(team))[0]
  const items = personPlan(p)
  const late = items.filter(i => i.st === '逾期' || i.st.startsWith('未通过'))
  const mates = teamPersons(name, team, postOfTeam(team))
  return (
    <div className="h-full grid grid-cols-[300px_1fr_320px] gap-3 p-3 min-h-0">
      <div className="flex flex-col gap-3 min-h-0">
        <div className="panel p-4 shrink-0"><div className="flex items-center gap-3"><div className="w-11 h-11 rounded-2xl flex items-center justify-center text-[17px] text-white serif" style={{ background: 'linear-gradient(135deg,var(--indigo),var(--ai))' }}>{p.name[0]}</div><div><div className="text-[15px] font-semibold">{p.name}</div><div className="text-[11px] text-slate-500">{p.post} · {p.grade}</div></div><div className="ml-auto"><Ring v={planDone(items)} size={54} stroke={6} /></div></div><div className="text-[11px] text-slate-500 mt-2">{short(p.unit)} · {p.team.replace(/^.*· /, '')} · {items.length} 项 · {planHours(items)} 学时 · 逾期 <b style={{ color: late.length ? 'var(--bad)' : 'inherit' }}>{late.length}</b></div></div>
        <Panel title="同班组" className="flex-1" bodyClass="overflow-auto scroll"><div className="p-2 space-y-0.5">{mates.map(m => { const it = personPlan(m); return <button key={m.id} onClick={() => push({ v: 'trackPerson', name, team, pid: m.id })} className={`w-full flex items-center gap-2 text-[12px] px-2 py-1.5 rounded-lg ${m.id === p.id ? 'bg-[var(--indigo-soft)]' : 'hover:bg-slate-50'}`}><span className="flex-1 text-left">{m.name}</span><span className="num text-slate-500">{planDone(it)}%</span><span className="num" style={{ color: it.some(i => i.st === '逾期' || i.st.startsWith('未通过')) ? 'var(--bad)' : '#94a3b8' }}>{it.filter(i => i.st === '逾期' || i.st.startsWith('未通过')).length} 逾期</span></button> })}</div></Panel>
      </div>
      <Panel title="计划条目执行" bodyClass="overflow-auto scroll"><table className="grid"><thead><tr><th>月</th><th>形式</th><th>条目</th><th>学时</th><th>状态</th><th>动作</th></tr></thead><tbody>{items.map(i => <tr key={i.id} className={i.st === '逾期' || i.st.startsWith('未通过') ? 'row-in' : ''}><td className="num">{i.m} 月</td><td><KindTag k={i.kind} /></td><td className="font-medium">{i.n}</td><td className="num">{i.h}</td><td><StTag s={i.st} /></td><td>{(i.st === '逾期' || i.st.startsWith('未通过')) ? <button className="btn btn-sm" onClick={() => toast(`已催办：${i.n}`)}>催办</button> : i.st === '进行中' ? <button className="btn btn-sm" onClick={() => jump('plan', 'idp', { v: 'idpItem', pid: p.id, id: i.id, unit: p.unit, team: p.team } as never)}>查看</button> : <span className="text-slate-300">—</span>}</td></tr>)}</tbody></table></Panel>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="AI 跟踪建议" extra={<span className="ai-badge">逐人</span>}><div className="p-3"><div className="ai-out text-[12px]"><Typewriter text={late.length ? `${p.name}有 ${late.length} 项逾期或未通过：${late.map(i => i.n).slice(0, 2).join('、')}。建议本周内安排重练，并把 ${items.filter(i => i.st === '待开始')[0]?.n ?? '后续条目'}顺延 2 周；已通知师傅 ${p.mentor}。` : `${p.name}计划推进正常，完成 ${planDone(items)}%，本月 ${items.filter(i => i.m === NOW_M).length} 项进行中。`} speed={7} /></div>
          <div className="mt-2 space-y-1.5"><button className="act-btn" onClick={() => toast(`已向 ${p.name} 与班组长推送催办`)}><span className="ic">催</span>一键催办<small>移动端 + 班组看板</small></button><button className="act-btn gold" onClick={() => jump('plan', 'idp', { v: 'idp', id: p.id, unit: p.unit, team: p.team } as never)}><span className="ic">划</span>打开 IDP<small>调整排布</small></button><button className="act-btn" onClick={() => jump('map', 'person', { v: 'person', id: p.id, unit: p.unit, team: p.team } as never)}><span className="ic">图</span>成长地图<small>能力与证据</small></button></div></div></Panel>
      </div>
    </div>
  )
}
