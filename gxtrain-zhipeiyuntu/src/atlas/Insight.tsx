/* AI 预测与干预（一级）→ 干预方案（二级）→ 单位落地（三级） */
import { useMemo, useState } from 'react'
import { Panel, Bars, Radar } from '../ui'
import { LineChart, Scatter, Columns, Ring } from '../charts'
import { UNIT_GROUPS } from '../units'
import { READY_TREND, READY_FORECAST, FEATURES, CORR, UNITS, simulate, unitReady, unitRadar, unitTeams, unitOf, short } from './data'
import { useNav, Typewriter, Kpi } from './nav'

const LABELS = [...Array.from({ length: 26 }).map((_, i) => `第 ${12 + i} 周`), ...Array.from({ length: 12 }).map((_, i) => `+${i + 1}`)]
const M12 = Array.from({ length: 12 }).map((_, i) => `+${i + 1} 月`)
const unitDelta = (uid: string, delta: number) => { const c = CORR.find(x => x.id === uid)!; return Math.round(delta * (1.6 - c.x / 4.2) * 10) / 10 }

function Slider({ k, v, min, max, step, unit, onChange }: { k: string; v: number; min: number; max: number; step: number; unit: string; onChange: (v: number) => void }) {
  return <div className="mb-3"><div className="flex items-center text-[11.5px] mb-1"><span className="text-slate-600">{k}</span><span className="ml-auto num font-semibold" style={{ color: 'var(--indigo)' }}>{v}{unit}</span></div><input type="range" min={min} max={max} step={step} value={v} onChange={e => onChange(parseFloat(e.target.value))} className="w-full accent-[var(--ai)]" /></div>
}

export function InsightView() {
  const { push, toast, jump } = useNav()
  const [coach, setCoach] = useState(2.6), [course, setCourse] = useState(92), [mentor, setMentor] = useState(60)
  const [sel, setSel] = useState<string>()
  const r = simulate(coach, course, mentor)
  const scen = READY_FORECAST.base.map((v, i) => Math.round((v + r.delta * Math.min(1, (i + 1) / 6)) * 10) / 10)
  const pts = CORR.map(c => ({ ...c, color: c.grp === '地市供电局' ? '#2f6df6' : c.grp === '本部职能部门' ? '#7b5cf5' : c.grp === '直属机构' ? '#19b8d8' : c.grp === '县域新电力' ? '#178a54' : '#b08a3e' }))
  return (
    <div className="h-full flex flex-col gap-3 p-3 min-h-0">
      <div className="grid grid-cols-5 gap-3 shrink-0">
        <Kpi k="当前达标率" v={<>87.4<span className="text-[12px] font-normal text-slate-500 ml-1">%</span></>} d="较年初 +6.2 个百分点" spark={READY_TREND} />
        <Kpi k="12 个月预测" v={<>{READY_FORECAST.base[11]}<span className="text-[12px] font-normal text-slate-500 ml-1">%</span></>} d={`区间 ${READY_FORECAST.lo[11]}% – ${READY_FORECAST.hi[11]}%`} gold />
        <Kpi k="距年度目标" v={<>{Math.round((90 - 87.4) * 10) / 10}<span className="text-[12px] font-normal text-slate-500 ml-1">pt</span></>} d="按当前趋势 10 个月后达成" />
        <Kpi k="最强驱动因子" v={FEATURES[0].k} d={`解释力 ${FEATURES[0].w}%`} gold />
        <Kpi k="方案后预测" v={<>{r.ready}<span className="text-[12px] font-normal text-slate-500 ml-1">%</span></>} d={`${r.delta >= 0 ? '+' : ''}${r.delta} pt · ${r.weeks} 周见效`} onClick={() => push({ v: 'scenario', coach, course, mentor })} />
      </div>
      <div className="flex-1 min-h-0 grid grid-cols-[1fr_1fr_340px] gap-3">
        <div className="flex flex-col gap-3 min-h-0">
          <Panel title="达标率趋势与预测　近 26 周 + 未来 12 周" extra={<span className="ai-badge">AI 预测</span>}><div className="px-3 pt-2"><LineChart labels={LABELS} h={180} unit="%" series={[{ name: '达标率', color: '#1e3a6e', area: true, data: [...READY_TREND, ...Array(12).fill(null)] }, { name: '基线预测', color: '#2f6df6', dash: true, data: [...Array(25).fill(null), READY_TREND[25], ...READY_FORECAST.base] }, { name: '方案预测', color: '#178a54', dash: true, data: [...Array(25).fill(null), READY_TREND[25], ...scen] }]} band={{ lo: READY_FORECAST.lo, hi: READY_FORECAST.hi, from: 26 }} target={{ v: 90, label: '年度目标 90%' }} /></div></Panel>
          <Panel title="驱动因子　对达标率的解释力" className="flex-1" bodyClass="overflow-auto scroll"><div className="p-3"><Bars data={FEATURES.map(f => ({ label: f.k, v: f.w }))} unit="%" max={40} /><div className="mt-2 space-y-1 text-[11px] text-slate-600">{FEATURES.filter(f => f.d).map(f => <div key={f.k} className="flex gap-2"><span className="w-1.5 h-1.5 mt-[6px] shrink-0 rounded-full" style={{ background: 'var(--gold)' }} />{f.d}</div>)}</div></div></Panel>
        </div>
        <div className="flex flex-col gap-3 min-h-0">
          <Panel title="陪练频次 × 达标率增量　28 个单位"><div className="px-2 pt-1"><Scatter points={pts} xLabel="月均陪练场次 / 人" yLabel="达标率较年初增量 pt" h={230} xMin={0} xMax={4.5} yMin={0} yMax={30} sel={sel} onPoint={p => { setSel(p.id); push({ v: 'scenarioUnit', coach, course, mentor, unit: UNITS.find(u => u.id === p.id)!.name }) }} /></div></Panel>
          <Panel title="AI 预测报告" className="flex-1" extra={<span className="text-[10.5px] text-slate-500">每周一 06:00</span>}><div className="p-3"><div className="ai-out text-[12px]"><Typewriter text={`按当前趋势，12 个月后达标率 ${READY_FORECAST.base[11]}%（区间 ${READY_FORECAST.lo[11]}–${READY_FORECAST.hi[11]}），年度目标 90% 预计在第 10 个月达成。陪练频次是最强驱动因子：陪练频次每提高 1 场 / 人 / 月，达标率约 +2.1 个百分点；频次低于 1.2 场的 7 个单位是最大的提升空间。右侧模拟器可测算不同干预组合的效果、成本与见效周期。`} speed={7} /></div></div></Panel>
        </div>
        <div className="flex flex-col gap-3 min-h-0">
          <Panel title="干预模拟器" extra={<span className="ai-badge">实时重算</span>}>
            <div className="p-3">
              <Slider k="月均陪练场次 / 人" v={coach} min={0.5} max={4} step={0.1} unit=" 场" onChange={setCoach} />
              <Slider k="必修课完成率" v={course} min={60} max={100} step={1} unit="%" onChange={setCourse} />
              <Slider k="师带徒结对率" v={mentor} min={20} max={90} step={1} unit="%" onChange={setMentor} />
              <div className="flex items-center gap-3 hair-t pt-3"><Ring v={r.ready} size={72} stroke={7} color={r.ready >= 90 ? 'var(--ok)' : 'var(--ai)'} sub="预测达标" /><div className="grid grid-cols-2 gap-1.5 flex-1 text-center">{[['变化', `${r.delta >= 0 ? '+' : ''}${r.delta} pt`], ['见效', `${r.weeks} 周`], ['增量投入', `${r.cost >= 0 ? '+' : ''}${r.cost} 万`], ['目标', r.ready >= 90 ? '达成' : '未达']].map(([k, v], i) => <div key={k} className="hairline py-1"><div className={`num text-[13px] font-semibold ${i === 0 ? 'gold-grad' : 'num-grad'}`}>{v}</div><div className="text-[9.5px] text-slate-500">{k}</div></div>)}</div></div>
              <div className="mt-3"><LineChart labels={M12} h={110} unit="%" series={[{ name: '基线', color: '#94a3b8', dash: true, data: READY_FORECAST.base }, { name: '方案', color: '#178a54', area: true, data: scen }]} target={{ v: 90, label: '90%' }} yMin={84} yMax={98} /></div>
              <div className="flex gap-2 mt-2"><button className="btn btn-primary btn-sm flex-1" onClick={() => push({ v: 'scenario', coach, course, mentor })}>保存为干预方案 ›</button><button className="btn btn-sm flex-1" onClick={() => { setCoach(1.6); setCourse(86); setMentor(42); toast('已回到当前水平') }}>回到当前水平</button></div>
            </div>
          </Panel>
          <Panel title="推荐动作" className="flex-1"><div className="p-2 space-y-1.5"><button className="act-btn" onClick={() => { toast('已向 7 个低频单位下发陪练任务'); jump('coach', 'company') }}><span className="ic">练</span>低频单位加密陪练<small>7 个单位 · 陪练中心</small></button><button className="act-btn gold" onClick={() => { toast('已推送必修课催办'); jump('plan', 'track') }}><span className="ic">课</span>催办必修课<small>千人千面 · 跟踪</small></button></div></Panel>
        </div>
      </div>
    </div>
  )
}

/* ---------- 二级：干预方案 ---------- */
export function ScenarioView({ coach, course, mentor }: { coach: number; course: number; mentor: number }) {
  const { push, toast, jump } = useNav()
  const r = simulate(coach, course, mentor)
  const rows = useMemo(() => UNITS.map(u => { const d = unitDelta(u.id, r.delta); const cost = Math.round(Math.max(0, r.cost) * u.people / 45694 * 10) / 10; return { u, cur: unitReady(u), d, next: Math.min(99, Math.round((unitReady(u) + d) * 10) / 10), cost, weeks: Math.max(4, Math.round(r.weeks * (1 + (CORR.find(x => x.id === u.id)!.x - 1.6) / 6))) } }).sort((a, b) => b.d - a.d), [r.delta, r.cost, r.weeks])
  const byGrp = UNIT_GROUPS.map(g => { const rs = rows.filter(x => x.u.grp === g); return { label: g, gain: Math.round(rs.reduce((s, x) => s + x.d, 0) / Math.max(1, rs.length) * 10) / 10, cost: Math.round(rs.reduce((s, x) => s + x.cost, 0) * 10) / 10 } })
  const scen = READY_FORECAST.base.map((v, i) => Math.round((v + r.delta * Math.min(1, (i + 1) / 6)) * 10) / 10)
  return (
    <div className="h-full grid grid-cols-[300px_1fr_320px] gap-3 p-3 min-h-0">
      <div className="flex flex-col gap-3 min-h-0">
        <div className="panel p-4 shrink-0"><span className="tag tag-gold">干预方案</span><div className="text-[17px] font-semibold serif mt-1">陪练 {coach} 场 · 必修课 {course}% · 结对 {mentor}%</div><div className="flex items-center gap-3 mt-3"><Ring v={r.ready} size={64} stroke={7} color={r.ready >= 90 ? 'var(--ok)' : 'var(--ai)'} sub="预测" /><div className="text-[11.5px] text-slate-600 leading-relaxed">达标率 <b className="num">{r.delta >= 0 ? '+' : ''}{r.delta} pt</b><br />见效 <b className="num">{r.weeks}</b> 周<br />增量投入 <b className="num">{r.cost >= 0 ? '+' : ''}{r.cost}</b> 万元</div></div></div>
        <Panel title="分组收益与投入"><div className="p-3"><Columns h={110} data={byGrp.map(b => ({ label: b.label, v: b.gain }))} unit=" pt" /><div className="mt-2 space-y-0.5 text-[11px]">{byGrp.map(b => <div key={b.label} className="flex"><span className="text-slate-600">{b.label}</span><span className="ml-auto num">{b.cost} 万</span></div>)}</div></div></Panel>
        <Panel title="12 个月走势" className="flex-1"><div className="px-3 pt-2"><LineChart labels={M12} h={120} unit="%" series={[{ name: '基线', color: '#94a3b8', dash: true, data: READY_FORECAST.base }, { name: '方案', color: '#178a54', area: true, data: scen }]} target={{ v: 90, label: '90%' }} yMin={84} yMax={98} /></div></Panel>
      </div>
      <Panel title="各单位预测效果　按增量排序" bodyClass="overflow-auto scroll">
        <table className="grid"><thead><tr><th>#</th><th>单位</th><th>当前</th><th>预测</th><th>增量</th><th>见效</th><th>投入</th><th>主要动作</th></tr></thead>
          <tbody>{rows.map((x, i) => <tr key={x.u.id} className="cursor-pointer row-in" onClick={() => push({ v: 'scenarioUnit', coach, course, mentor, unit: x.u.name })}><td className="num" style={{ color: i < 3 ? 'var(--gold)' : '#94a3b8' }}>{i + 1}</td><td className="font-medium">{short(x.u.name)}</td><td className="num">{x.cur}%</td><td className="num font-semibold" style={{ color: x.next >= 90 ? 'var(--ok)' : 'var(--indigo)' }}>{x.next}%</td><td className="num" style={{ color: x.d > 0 ? 'var(--ok)' : 'var(--bad)' }}>{x.d > 0 ? '+' : ''}{x.d}</td><td className="num">{x.weeks} 周</td><td className="num">{x.cost} 万</td><td><span className="tag">{CORR.find(c => c.id === x.u.id)!.x < 1.5 ? '加密陪练' : course > 90 ? '催办必修课' : '结对带教'}</span></td></tr>)}</tbody></table>
      </Panel>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="AI 方案说明" extra={<span className="ai-badge">测算</span>}><div className="p-3"><div className="ai-out text-[12px]"><Typewriter text={`本方案 12 个月后达标率 ${r.ready}%，${r.ready >= 90 ? '可提前达成年度目标' : '仍未达到 90%，建议把陪练频次提高到 2.6 场以上'}。增量最大的是 ${rows.slice(0, 3).map(x => short(x.u.name)).join('、')}（陪练基数低，边际效果强）；本部职能部门增量有限，主要依靠必修课与 AI 素养课。总增量投入 ${r.cost} 万元，折合每提升 1 个百分点 ${r.delta > 0 ? Math.round(r.cost / r.delta) : 0} 万元。`} speed={7} /></div>
          <div className="mt-2 space-y-1.5"><button className="act-btn" onClick={() => { toast('已把方案下发至千人千面计划引擎'); jump('plan', 'engine') }}><span className="ic">划</span>下发到千人千面计划<small>28 个单位</small></button><button className="act-btn gold" onClick={() => { toast('已生成开班需求'); jump('factory', 'system') }}><span className="ic">班</span>生成开班需求<small>课程体系</small></button><button className="act-btn" onClick={() => { toast('已下发陪练任务'); jump('coach', 'company') }}><span className="ic">练</span>下发陪练任务<small>陪练中心 · 公司看板</small></button><button className="act-btn gold" onClick={() => toast('方案已提交培训科审批')}><span className="ic">批</span>提交审批<small>培训科</small></button></div></div></Panel>
      </div>
    </div>
  )
}

/* ---------- 三级：单位落地 ---------- */
export function ScenarioUnit({ coach, course, mentor, unit }: { coach: number; course: number; mentor: number; unit: string }) {
  const { push, toast, jump } = useNav()
  const u = unitOf(unit) ?? UNITS[0]
  const r = simulate(coach, course, mentor)
  const d = unitDelta(u.id, r.delta)
  const cur = unitReady(u), next = Math.min(99, Math.round((cur + d) * 10) / 10)
  const radar = unitRadar(u).map(x => ({ k: x.k, v: x.v, need: Math.min(99, Math.round(x.v + d * (x.k === '异常处置' || x.k === '专业技能' ? 1.3 : .7))) }))
  const teams = unitTeams(u).map(t => ({ ...t, next: Math.min(99, Math.round(t.v + d * (t.v < cur ? 1.3 : .8))) }))
  const c = CORR.find(x => x.id === u.id)!
  const trend = Array.from({ length: 12 }).map((_, i) => Math.round((cur + d * Math.min(1, (i + 1) / 6)) * 10) / 10)
  return (
    <div className="h-full grid grid-cols-[300px_1fr_320px] gap-3 p-3 min-h-0">
      <div className="flex flex-col gap-3 min-h-0">
        <div className="panel p-4 shrink-0"><span className="tag">{u.grp}</span><div className="text-[17px] font-semibold serif mt-1">{short(u.name)}</div><div className="text-[11.5px] text-slate-500">{u.people.toLocaleString()} 人 · 当前陪练 {c.x} 场 / 人 / 月</div><div className="flex items-center gap-3 mt-3"><Ring v={next} size={64} stroke={7} color={next >= 90 ? 'var(--ok)' : 'var(--ai)'} sub="方案后" /><div className="text-[11.5px] text-slate-600 leading-relaxed">当前 <b className="num">{cur}%</b> → <b className="num" style={{ color: 'var(--ok)' }}>{next}%</b><br />增量 <b className="num">{d > 0 ? '+' : ''}{d} pt</b><br />投入 <b className="num">{Math.round(Math.max(0, r.cost) * u.people / 45694 * 10) / 10}</b> 万元</div></div></div>
        <Panel title="能力领域 · 当前 vs 方案后" className="flex-1"><div className="p-2 flex flex-col items-center"><Radar data={radar} size={240} /><div className="flex gap-4 text-[10.5px] text-slate-500"><span className="flex items-center gap-1"><span className="w-3 h-[2px]" style={{ background: 'var(--indigo-2)' }} />当前</span><span className="flex items-center gap-1"><span className="w-3 h-[2px]" style={{ background: 'var(--gold)' }} />方案后</span></div></div></Panel>
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="12 个月走势"><div className="px-3 pt-2"><LineChart labels={M12} h={140} unit="%" series={[{ name: '方案后', color: '#178a54', area: true, data: trend }, { name: '不干预', color: '#94a3b8', dash: true, data: Array.from({ length: 12 }).map((_, i) => Math.round((cur + (i + 1) * .18) * 10) / 10) }]} target={{ v: 90, label: '90%' }} yMin={Math.min(cur, 60) - 2} yMax={100} /></div></Panel>
        <Panel title="班组落地清单" className="flex-1" bodyClass="overflow-auto scroll"><table className="grid"><thead><tr><th>班组</th><th>负责人</th><th>当前</th><th>方案后</th><th>动作</th></tr></thead><tbody>{teams.map(t => <tr key={t.name} className="cursor-pointer" onClick={() => push({ v: 'teamDetail', unit: u.name, team: t.name })}><td className="font-medium">{t.name}</td><td>{t.lead}</td><td className="num">{t.v}%</td><td className="num font-semibold" style={{ color: 'var(--ok)' }}>{t.next}%</td><td><span className="tag">{t.v < cur ? `陪练 ${coach} 场 / 月 + 结对` : '陪练维持 + 必修课'}</span></td></tr>)}</tbody></table></Panel>
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="AI 落地建议" extra={<span className="ai-badge">单位</span>}><div className="p-3"><div className="ai-out text-[12px]"><Typewriter text={`${short(u.name)}当前陪练 ${c.x} 场 / 人 / 月，${c.x < 1.6 ? '低于公司均值，加密陪练的边际效果最强' : '已高于公司均值，增量主要来自必修课与结对'}。方案后预计 ${next}%，${teams.filter(t => t.v < cur).map(t => t.name).slice(0, 2).join('、')}提升空间最大，建议先在这两个班组落地，4 周后复盘。`} speed={7} /></div>
          <div className="mt-2 space-y-1.5"><button className="act-btn" onClick={() => { toast(`已向 ${short(u.name)} 下发陪练任务`); jump('coach', 'company') }}><span className="ic">练</span>下发陪练任务<small>{teams.length} 个班组</small></button><button className="act-btn gold" onClick={() => { toast('已生成单位培训计划'); jump('plan', 'agg') }}><span className="ic">划</span>生成单位计划<small>千人千面</small></button><button className="act-btn" onClick={() => push({ v: 'unitDetail', name: u.name })}><span className="ic">看</span>查看单位全景<small>单位详情</small></button></div></div></Panel>
      </div>
    </div>
  )
}
