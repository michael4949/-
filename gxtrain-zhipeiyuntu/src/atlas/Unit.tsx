/* 单位能力全景（一级）→ 单位详情（二级）→ 班组详情（三级） */
import { useMemo, useState } from 'react'
import { Panel, Radar, Donut, Bars, CountUp } from '../ui'
import { LineChart, Heatmap, Scatter, Columns, Ring, Sparkline, heat } from '../charts'
import { UNIT_GROUPS } from '../units'
import type { UnitGroup } from '../units'
import { UNITS, BUREAUS, DOMAINS, CORR, GAP_LEVELS, TEAMS_OF, unitReady, unitRadar, unitTrend, unitTeams, gapDist, teamPersons, teamsOf, unitOf, short, POST_MODELS, isFunc, isBureauUnit, postOfTeam, teamStat, bureauRadar, bureauReady, bureauTrend, BUREAU_UNIT } from './data'
import { useNav, Typewriter, Kpi, Delta } from './nav'

const GRP_COLOR: Record<UnitGroup, string> = { 本部职能部门: '#7b5cf5', 直属机构: '#19b8d8', 地市供电局: '#2f6df6', 县域新电力: '#178a54', 产业公司: '#b08a3e' }
const score = (abilities: { v: number; w: number }[]) => Math.round(abilities.reduce((s, a) => s + a.v * a.w, 0) / 100)
const MONTHS = ['10 月', '11 月', '12 月', '1 月', '2 月', '3 月', '4 月', '5 月', '6 月', '7 月', '8 月', '9 月']

export function UnitView() {
  const { push } = useNav()
  const [grp, setGrp] = useState<UnitGroup | '全部'>('全部')
  const [sel, setSel] = useState<string>()
  const units = useMemo(() => (grp === '全部' ? UNITS : UNITS.filter(u => u.grp === grp)).slice().sort((a, b) => unitReady(b) - unitReady(a)), [grp])
  const bureauMode = grp === '地市供电局'
  const rows = bureauMode ? BUREAUS.slice().sort((a, b) => bureauReady(b) - bureauReady(a)) : units.map(u => units.filter(x => short(x.name) === short(u.name)).length > 1 ? u.name : short(u.name))
  const cells = bureauMode ? rows.map(b => bureauRadar(b).map(x => x.v)) : units.map(u => unitRadar(u).map(x => x.v))
  const avg = Math.round(units.reduce((s, u) => s + unitReady(u), 0) / Math.max(1, units.length) * 10) / 10
  const weak = DOMAINS.map((k, i) => ({ k, v: Math.round(cells.reduce((s, r) => s + r[i], 0) / Math.max(1, cells.length)) })).sort((a, b) => a.v - b.v)
  const pts = UNITS.map(u => { const c = CORR.find(x => x.id === u.id)!; return { id: u.id, label: short(u.name), x: c.x, y: unitReady(u), r: c.r, color: GRP_COLOR[u.grp], grp: u.grp } })
  const below = units.filter(u => unitReady(u) < 80)
  return (
    <div className="h-full flex flex-col gap-3 p-3 min-h-0">
      <div className="grid grid-cols-5 gap-3 shrink-0">
        <Kpi k={bureauMode ? '地市供电局' : '覆盖单位'} v={<CountUp to={bureauMode ? 14 : units.length} />} d={`${units.reduce((s, u) => s + u.people, 0).toLocaleString()} 人已建档`} />
        <Kpi k="平均达标率" v={<><CountUp to={avg} dec={1} /><span className="text-[12px] font-normal text-slate-500 ml-1">%</span></>} d={`最高 ${short(units[0]?.name ?? '')} ${unitReady(units[0])}%`} gold />
        <Kpi k={bureauMode ? '低于 80% 的地市局' : '低于 80% 的单位'} v={<CountUp to={bureauMode ? BUREAUS.filter(b => bureauReady(b) < 80).length : below.length} />} d={(bureauMode ? BUREAUS.filter(b => bureauReady(b) < 80).slice(0, 3) : below.slice(0, 3).map(u => short(u.name))).join(' · ') || '无'} onClick={() => bureauMode ? push({ v: 'unitDetail', name: BUREAU_UNIT.name }) : below[0] && push({ v: 'unitDetail', name: below[0].name })} />
        <Kpi k="最薄弱领域" v={weak[0].k} d={`平均 ${weak[0].v} 分 · 其次 ${weak[1].k} ${weak[1].v} 分`} gold />
        <Kpi k="岗位模型" v={<CountUp to={POST_MODELS.filter(m => grp === '全部' || m.grp === grp).length} />} d="点击进入岗位能力模型" onClick={() => push({ v: 'matrix' })} />
      </div>
      <div className="flex-1 min-h-0 grid grid-cols-[1fr_400px] gap-3">
        <Panel title="单位 × 能力领域热力矩阵" bodyClass="overflow-auto scroll" extra={<div className="seg">{(['全部', ...UNIT_GROUPS] as const).map(g => <button key={g} className={grp === g ? 'on' : ''} onClick={() => setGrp(g)}>{g}</button>)}</div>}>
          <div className="p-3"><Heatmap rows={rows} cols={DOMAINS} cells={cells} cellH={26} rowW={124} colorOf={v => heat(v)} sel={sel && !bureauMode ? [units.findIndex(u => u.id === sel), -1] : null} onCell={(r) => bureauMode ? push({ v: 'teamDetail', unit: BUREAU_UNIT.name, team: rows[r] }) : push({ v: 'unitDetail', name: units[r].name })} />
            <div className="flex items-center gap-3 text-[10.5px] text-slate-500 mt-2"><span>颜色越深达标率越高</span><span className="flex items-center gap-1"><i className="w-3 h-3 rounded-sm inline-block" style={{ background: heat(65) }} />65</span><span className="flex items-center gap-1"><i className="w-3 h-3 rounded-sm inline-block" style={{ background: heat(80) }} />80</span><span className="flex items-center gap-1"><i className="w-3 h-3 rounded-sm inline-block" style={{ background: heat(95) }} />95</span><span className="ml-auto">点击任一格进入单位详情</span></div>
          </div>
        </Panel>
        <div className="flex flex-col gap-3 min-h-0">
          <Panel title="陪练频次 × 达标率　28 个单位" extra={<span className="ai-badge">相关性 0.71</span>}>
            <div className="px-2 pt-1"><Scatter points={pts} xLabel="月均陪练场次 / 人" yLabel="达标率 %" h={220} xMin={0} xMax={4.5} yMin={60} yMax={100} sel={sel} onPoint={p => { setSel(p.id); push({ v: 'unitDetail', name: UNITS.find(u => u.id === p.id)!.name }) }} /></div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 px-3 pb-2 text-[10.5px] text-slate-500">{UNIT_GROUPS.map(g => <span key={g} className="flex items-center gap-1"><i className="w-2 h-2 rounded-full inline-block" style={{ background: GRP_COLOR[g] }} />{g}</span>)}</div>
          </Panel>
          <Panel title="AI 判读" className="flex-1" bodyClass="overflow-auto scroll">
            <div className="p-3"><div className="ai-out text-[12px]"><Typewriter text={`${grp === '全部' ? '全公司' : grp}平均达标率 ${avg}%。${weak[0].k}是共同短板（平均 ${weak[0].v} 分），${bureauMode ? `${BUREAUS.filter(b => bureauReady(b) < 80).length} 个地市局低于 80%：${BUREAUS.filter(b => bureauReady(b) < 80).slice(0, 4).join('、')}` : `${below.length} 个单位低于 80%：${below.slice(0, 4).map(u => short(u.name)).join('、')}${below.length > 4 ? ' 等' : ''}`}。散点显示陪练频次高于每人每月 2 场的单位，达标率普遍高出 6 个百分点以上，建议对低频单位下发陪练任务。`} speed={7} /></div>
              <div className="mt-2 space-y-1">{bureauMode ? rows.slice(-4).reverse().map(b => <button key={b} onClick={() => push({ v: 'teamDetail', unit: BUREAU_UNIT.name, team: b })} className="w-full flex items-center gap-2 text-[12px] px-2 py-1.5 hover:bg-slate-50 rounded-lg"><span className="tag tag-warn">待提升</span><span className="truncate flex-1 text-left">{b}</span><Sparkline v={bureauTrend(b)} color="var(--bad)" /><span className="num font-semibold" style={{ color: 'var(--bad)' }}>{bureauReady(b)}%</span></button>) : units.slice(-4).reverse().map(u => <button key={u.id} onClick={() => push({ v: 'unitDetail', name: u.name })} className="w-full flex items-center gap-2 text-[12px] px-2 py-1.5 hover:bg-slate-50 rounded-lg"><span className="tag tag-warn">待提升</span><span className="truncate flex-1 text-left">{short(u.name)}</span><Sparkline v={unitTrend(u)} color="var(--bad)" /><span className="num font-semibold" style={{ color: 'var(--bad)' }}>{unitReady(u)}%</span></button>)}</div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}

/* ---------- 二级：单位详情 ---------- */
export function UnitDetail({ name }: { name: string }) {
  const { push, toast, jump } = useNav()
  const u = unitOf(name) ?? UNITS[0]
  const ready = unitReady(u), radar = unitRadar(u), trend = unitTrend(u), teams = unitTeams(u)
  const dist = gapDist(ready, u.people)
  const models = POST_MODELS.filter(m => m.unit === u.name)
  const companyAvg = [81.8, 82.3, 82.9, 83.4, 84.1, 84.6, 85.2, 85.8, 86.3, 86.8, 87.1, 87.4]
  const weak = radar.slice().sort((a, b) => a.v - b.v)[0]
  return (
    <div className="h-full grid grid-cols-[300px_1fr_340px] gap-3 p-3 min-h-0">
      <div className="flex flex-col gap-3 min-h-0">
        <div className="panel p-4 shrink-0">
          <div className="flex items-center gap-3"><Ring v={ready} size={68} stroke={7} color={ready >= 85 ? 'var(--ok)' : ready >= 75 ? 'var(--ai)' : 'var(--bad)'} /><div className="min-w-0"><div className="text-[15px] font-semibold serif leading-tight">{short(u.name)}</div><div className="text-[11px] text-slate-500 mt-0.5">{u.grp} · {u.people.toLocaleString()} 人 · {u.depts.length} 个科室</div><div className="text-[11px] mt-1">达标率排名 <b className="num" style={{ color: 'var(--gold)' }}>第 {UNITS.slice().sort((a, b) => unitReady(b) - unitReady(a)).findIndex(x => x.id === u.id) + 1}</b> / 28 · 较年初 <Delta v={Math.round((trend[11] - trend[0]) * 10) / 10} unit="pt" /></div></div></div>
          <div className="gold-rule my-3" />
          <div className="grid grid-cols-2 gap-2 text-center">{[['岗位模型', `${models.length} 个`], ['AI 场景', `${u.sceneN} 个`], ['P1 场景', `${u.p1} 个`], ['班组 / 科室', `${teams.length} 个`]].map(([k, v]) => <div key={k} className="hairline py-1.5"><div className="num text-[15px] font-semibold num-grad">{v}</div><div className="text-[10px] text-slate-500">{k}</div></div>)}</div>
        </div>
        <Panel title="能力领域雷达"><div className="p-2 flex justify-center"><Radar data={radar} size={250} /></div></Panel>
        <Panel title="达标构成" className="flex-1"><div className="p-3 flex items-center gap-3"><Donut data={GAP_LEVELS.map((k, i) => ({ k, n: dist[i], c: ['#178a54', '#2f6df6', '#b08a3e', '#c2402f'][i] }))} size={110} label="在岗" /><div className="flex-1 space-y-1">{GAP_LEVELS.map((k, i) => <div key={k} className="flex items-center gap-2 text-[11px]"><span className="w-2 h-2 rounded-sm" style={{ background: ['#178a54', '#2f6df6', '#b08a3e', '#c2402f'][i] }} /><span className="text-slate-600">{k}</span><span className="ml-auto num">{dist[i].toLocaleString()}</span></div>)}</div></div></Panel>
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="达标率走势　12 个月 · 与公司均值对照"><div className="px-3 pt-2"><LineChart labels={MONTHS} h={150} unit="%" series={[{ name: short(u.name), color: '#2f6df6', area: true, data: trend }, { name: '公司均值', color: '#94a3b8', dash: true, data: companyAvg }]} target={{ v: 90, label: '年度目标 90%' }} yMin={60} yMax={100} /></div></Panel>
        <Panel title={`${isFunc(u) ? '科室' : isBureauUnit(u) ? '地市局' : '班组'}达标排行　${teams.length} 个`} className="flex-1" bodyClass="overflow-auto scroll" extra={<span className="text-[10.5px] text-slate-500">点击进入三级</span>}>
          <table className="grid"><thead><tr><th>#</th><th>{isFunc(u) ? '科室' : isBureauUnit(u) ? '地市局' : '班组'}</th><th>负责人</th><th>人数</th><th>达标率</th><th>缺口项</th><th>趋势</th></tr></thead>
            <tbody>{teams.map((t, i) => <tr key={t.name} className="cursor-pointer" onClick={() => push({ v: 'teamDetail', unit: u.name, team: t.name })}><td className="num" style={{ color: i < 3 ? 'var(--gold)' : '#94a3b8' }}>{i + 1}</td><td className="font-medium">{t.name}</td><td>{t.lead}</td><td className="num">{t.n}</td><td className="num font-semibold" style={{ color: t.v >= 85 ? 'var(--ok)' : t.v >= 75 ? 'var(--indigo)' : 'var(--bad)' }}>{t.v}%</td><td className="num">{t.gaps} 项</td><td><Delta v={t.trend} unit="pt" /></td></tr>)}</tbody></table>
        </Panel>
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="AI 判读与处置" extra={<span className="ai-badge">诊断</span>}>
          <div className="p-3"><div className="ai-out text-[12px]"><Typewriter text={`${short(u.name)}达标率 ${ready}%，${ready >= 87.4 ? '高于' : '低于'}公司均值 ${Math.abs(Math.round((ready - 87.4) * 10) / 10)} 个百分点。最薄弱领域为${weak.k}（${weak.v} 分），${teams[teams.length - 1].name}拖累最大（${teams[teams.length - 1].v}%，${teams[teams.length - 1].gaps} 项缺口）。建议：对该${isFunc(u) ? '科室' : isBureauUnit(u) ? '地市局' : '班组'}下发${weak.k}专项陪练；把 ${dist[2] + dist[3]} 名缺 3 项以上的人员纳入第四季度集训。`} speed={7} /></div>
            <div className="mt-2 space-y-1.5">
              <button className="act-btn" onClick={() => { toast(`已为 ${short(u.name)} 生成单位培训计划草案`); jump('plan', 'agg') }}><span className="ic">划</span>生成单位培训计划<small>千人千面</small></button>
              <button className="act-btn gold" onClick={() => { toast('已下发陪练任务到各班组'); jump('coach', 'company') }}><span className="ic">练</span>下发{weak.k}陪练任务<small>陪练中心</small></button>
              <button className="act-btn" onClick={() => push({ v: 'gaps' })}><span className="ic">缺</span>查看本单位相关缺口<small>缺口与预警</small></button>
            </div>
          </div>
        </Panel>
        <Panel title="岗位模型与达标" className="flex-1" bodyClass="overflow-auto scroll">
          <div className="p-2 space-y-1">{models.slice(0, 10).map(m => <button key={m.id} onClick={() => push({ v: 'postModel', id: m.id })} className="w-full flex items-center gap-2 text-[12px] px-2 py-1.5 hover:bg-slate-50 rounded-lg"><span className="truncate flex-1 text-left">{m.post}<span className="text-[10.5px] text-slate-400 ml-1">{m.dept}</span></span><span className="num text-slate-500">{m.people} 人</span><span className="num font-semibold w-[40px] text-right" style={{ color: m.ready >= 85 ? 'var(--ok)' : m.ready >= 75 ? 'var(--indigo)' : 'var(--bad)' }}>{m.ready}%</span></button>)}</div>
        </Panel>
        <Panel title="领域得分"><div className="p-3"><Bars data={radar.map(r => ({ label: r.k, v: r.v, note: r.v < 80 ? '待提升' : undefined }))} max={100} /></div></Panel>
      </div>
    </div>
  )
}

/* ---------- 三级：班组详情 ---------- */
export function TeamDetail({ unit, team }: { unit: string; team: string }) {
  const { push, toast, jump } = useNav()
  const u = unitOf(unit) ?? UNITS[0]
  const isBureau = BUREAUS.includes(team)
  const bureau = team.split(' · ')[0]
  const teamKey = isBureau ? `${team} · 变电管理一所` : team
  const t = teamStat(u, team)
  const post = postOfTeam(teamKey)
  const people = useMemo(() => teamPersons(u.name, teamKey, post), [u, teamKey, post])
  const siblings = isBureau ? TEAMS_OF.default.map(x => `${team} · ${x}`) : BUREAUS.includes(bureau) ? TEAMS_OF.default.map(x => `${bureau} · ${x}`).filter(x => x !== team) : teamsOf(u).filter(x => x !== team).slice(0, 7)
  const abilities = people[0].abilities.map(a => a.k)
  const cells = people.map(p => p.abilities.map(a => a.v))
  const avgAb = abilities.map((k, i) => ({ label: k, v: Math.round(cells.reduce((s, r) => s + r[i], 0) / cells.length), note: undefined as string | undefined }))
  const weakest = avgAb.slice().sort((a, b) => a.v - b.v)[0]
  const sorted = people.slice().sort((a, b) => score(b.abilities) - score(a.abilities))
  return (
    <div className="h-full grid grid-cols-[1fr_1fr_320px] gap-3 p-3 min-h-0">
      <div className="flex flex-col gap-3 min-h-0">
        <div className="panel p-3 shrink-0 flex items-center gap-3"><div><div className="text-[15px] font-semibold serif">{team}</div><div className="text-[11px] text-slate-500">{short(u.name)} · 负责人 {t.lead} · {t.n.toLocaleString()} 人{isBureau ? ' · 样本班组 变电管理一所' : ` · 岗位 ${post}`}</div></div><div className="ml-auto flex items-center gap-2"><Ring v={t.v} size={54} stroke={6} /><div className="text-[11px] text-slate-500">达标率<br /><Delta v={t.trend} unit="pt" /></div></div></div>
        <Panel title={`成员 × 能力项热力　样本 ${people.length} 人`} className="flex-1" bodyClass="overflow-auto scroll" extra={<span className="text-[10.5px] text-slate-500">点击格子看该成员该能力</span>}>
          <div className="p-3"><Heatmap rows={people.map(p => p.name)} cols={abilities} cells={cells} cellH={26} rowW={70} colorOf={v => heat(v)} onCell={(r, c) => push({ v: 'ability', p: people[r].id, k: abilities[c], unit: people[r].unit, team: people[r].team })} /></div>
        </Panel>
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="能力项均值"><div className="p-3"><Columns h={120} data={avgAb.map(a => ({ ...a, color: a.v < 70 ? 'var(--bad)' : undefined }))} max={100} /></div></Panel>
        <Panel title="成员达标排行" className="flex-1" bodyClass="overflow-auto scroll" extra={<span className="text-[10.5px] text-slate-500">点击进入个人成长地图</span>}>
          <table className="grid"><thead><tr><th>#</th><th>姓名</th><th>等级</th><th>综合</th><th>缺口</th><th>完成度</th><th>预计达标</th></tr></thead>
            <tbody>{sorted.map((p, i) => <tr key={p.id} className="cursor-pointer" onClick={() => push({ v: 'person', id: p.id, unit: p.unit, team: p.team })}><td className="num" style={{ color: i < 3 ? 'var(--gold)' : '#94a3b8' }}>{i + 1}</td><td className="font-medium">{p.name}</td><td>{p.grade}</td><td className="num font-semibold">{score(p.abilities)}</td><td className="num" style={{ color: p.abilities.filter(a => a.v < a.need).length >= 3 ? 'var(--bad)' : 'inherit' }}>{p.abilities.filter(a => a.v < a.need).length} 项</td><td><div className="flex items-center gap-1.5"><div className="w-[60px] h-[6px] bg-slate-100 rounded overflow-hidden"><div className="h-full bar-grow" style={{ width: `${p.progress}%`, background: 'var(--ai)' }} /></div><span className="num text-[10.5px]">{p.progress}%</span></div></td><td className="num">{p.eta} 个月</td></tr>)}</tbody></table>
        </Panel>
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="AI 班组判读" extra={<span className="ai-badge">班组长视角</span>}>
          <div className="p-3"><div className="ai-out text-[12px]"><Typewriter text={`${team}整体达标率 ${t.v}%，${weakest.label}为共同短板（均值 ${weakest.v}）。${sorted[sorted.length - 1].name}、${sorted[sorted.length - 2].name}缺口最多，建议由 ${sorted[0].name} 结对带教；本月班前会知识卡围绕${weakest.label}安排 4 期。`} speed={7} /></div>
            <div className="mt-2 space-y-1.5">
              <button className="act-btn" onClick={() => { toast(`已向 ${team} 下发 ${weakest.label} 陪练任务`); jump('coach', 'team') }}><span className="ic">练</span>下发{weakest.label}陪练任务<small>班组看板</small></button>
              <button className="act-btn gold" onClick={() => toast(`已发起 ${sorted[0].name} → ${sorted[sorted.length - 1].name} 结对带教`)}><span className="ic">带</span>发起结对带教<small>{sorted[0].name} 带 {sorted[sorted.length - 1].name}</small></button>
              <button className="act-btn" onClick={() => { toast('已生成班组季度学习计划'); jump('plan', 'agg') }}><span className="ic">划</span>生成班组季度计划<small>千人千面</small></button>
              <button className="act-btn gold" onClick={() => jump('hub', 'search', { v: 'search', q: weakest.label })}><span className="ic">卡</span>生成班前会知识卡<small>知识中枢</small></button>
            </div>
          </div>
        </Panel>
        <Panel title={isBureau ? `${team} · 班组` : '相邻班组'} className="flex-1" bodyClass="overflow-auto scroll"><div className="p-2 space-y-0.5">{siblings.map(x => { const tt = teamStat(u, x); return <button key={x} onClick={() => push({ v: 'teamDetail', unit: u.name, team: x })} className="w-full flex items-center gap-2 text-[12px] px-2 py-1.5 hover:bg-slate-50 rounded-lg"><span className="truncate flex-1 text-left">{x.replace(`${bureau} · `, '')}</span><span className="num text-[10.5px] text-slate-400">{tt.n} 人</span><span className="num font-semibold" style={{ color: tt.v >= 85 ? 'var(--ok)' : tt.v >= 75 ? 'var(--indigo)' : 'var(--bad)' }}>{tt.v}%</span></button> })}</div></Panel>
      </div>
    </div>
  )
}
