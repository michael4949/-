/* AI 优化与预测（一级）→ 优化方案（二级）→ 单位落地（三级） */
import { useMemo, useState } from 'react'
import { Panel, Bars } from '../ui'
import { LineChart, Scatter, Columns, Ring } from '../charts'
import { UNIT_GROUPS } from '../units'
import { TOTAL, DONE_TREND, DONE_FORECAST, MONTHS, NOW_M, LOAD_PTS, SUGGESTIONS, optimize, UNIT_PLANS, BUREAU_PLANS, unitPlanOf, short } from './data'
import { useNav, Typewriter, Kpi } from './nav'

/* 建议里的 money 为负代表省钱，与模拟器省下的额度合并成一个净额 */
const net = (r: { saved: number }, money: number) => Math.round((r.saved - money) * 10) / 10
const LABELS = [...MONTHS.slice(0, NOW_M), ...MONTHS.slice(NOW_M).map(m => `${m}（预测）`)]
function Slider({ k, v, min, max, step, unit, onChange }: { k: string; v: number; min: number; max: number; step: number; unit: string; onChange: (v: number) => void }) {
  return <div className="mb-3"><div className="flex items-center text-[11.5px] mb-1"><span className="text-slate-600">{k}</span><span className="ml-auto num font-semibold" style={{ color: 'var(--indigo)' }}>{v}{unit}</span></div><input type="range" min={min} max={max} step={step} value={v} onChange={e => onChange(parseFloat(e.target.value))} className="w-full accent-[var(--ai)]" /></div>
}

export function PInsightView() {
  const { push, toast } = useNav()
  const [cap, setCap] = useState(52), [online, setOnline] = useState(45), [coach, setCoach] = useState(60)
  const [applied, setApplied] = useState<string[]>([])
  const [sel, setSel] = useState<string>()
  const r = optimize(cap, online, coach)
  const bonus = applied.reduce((s, id) => s + parseFloat(SUGGESTIONS.find(x => x.id === id)!.effect), 0)
  const money = applied.reduce((s, id) => s + SUGGESTIONS.find(x => x.id === id)!.money, 0)
  const scen = DONE_FORECAST.base.map((v, i) => Math.round((v + (r.delta + bonus) * Math.min(1, (i + 1) / 3)) * 10) / 10)
  const over = LOAD_PTS.filter(p => p.x > 70)
  return (
    <div className="h-full flex flex-col gap-3 p-3 min-h-0">
      <div className="grid grid-cols-5 gap-3 shrink-0">
        <Kpi k="当前完成率" v={<>{TOTAL.done}<span className="text-[12px] font-normal text-slate-500 ml-1">%</span></>} d="较上季 +3.1 个百分点" spark={DONE_TREND} />
        <Kpi k="年末预测" v={<>{DONE_FORECAST.base[3]}<span className="text-[12px] font-normal text-slate-500 ml-1">%</span></>} d={`区间 ${DONE_FORECAST.lo[3]}% – ${DONE_FORECAST.hi[3]}% · 目标 88%`} gold />
        <Kpi k="负荷过重单位" v={over.length} d={`人均超 70 学时 · 完成率平均 ${Math.round(over.reduce((s, p) => s + p.y, 0) / Math.max(1, over.length))}%`} onClick={() => over[0] && push({ v: 'optUnit', cap, online, coach, unit: over[0].id })} />
        <Kpi k="方案后预测" v={<>{Math.min(97, Math.round((r.done + bonus) * 10) / 10)}<span className="text-[12px] font-normal text-slate-500 ml-1">%</span></>} d={`${r.delta + bonus >= 0 ? '+' : ''}${Math.round((r.delta + bonus) * 10) / 10} pt · 预算 ${net(r, money) >= 0 ? '省' : '增'} ${Math.abs(net(r, money))} 万`} gold onClick={() => push({ v: 'optScenario', cap, online, coach })} />
        <Kpi k="已采纳建议" v={`${applied.length} / ${SUGGESTIONS.length}`} d="采纳后预测实时重算" />
      </div>
      <div className="flex-1 min-h-0 grid grid-cols-[1fr_1fr_340px] gap-3">
        <div className="flex flex-col gap-3 min-h-0">
          <Panel title="完成率走势与年末预测" extra={<span className="ai-badge">AI 预测</span>}><div className="px-3 pt-2"><LineChart labels={LABELS} h={180} unit="%" series={[{ name: '完成率', color: '#1e3a6e', area: true, data: [...DONE_TREND, ...Array(12 - NOW_M).fill(null)] }, { name: '基线预测', color: '#2f6df6', dash: true, data: [...Array(NOW_M - 1).fill(null), DONE_TREND[NOW_M - 1], ...DONE_FORECAST.base.slice(1)] }, { name: '方案预测', color: '#178a54', dash: true, data: [...Array(NOW_M - 1).fill(null), DONE_TREND[NOW_M - 1], ...scen.slice(1)] }]} band={{ lo: DONE_FORECAST.lo, hi: DONE_FORECAST.hi, from: NOW_M - 1 }} target={{ v: 88, label: '年度目标 88%' }} yMin={70} yMax={96} /></div></Panel>
          <Panel title="人均学时 × 完成率　28 个单位 + 14 个地市局" className="flex-1"><div className="px-2 pt-1"><Scatter points={LOAD_PTS} xLabel="人均计划学时" yLabel="完成率 %" h={220} xMin={20} xMax={95} yMin={55} yMax={100} quadrants quadLabels={['负荷轻 · 完成好', '合理区', '负荷重 · 仍完成', '', '', '', '负荷轻 · 需催办', '关注', '负荷过重']} sel={sel} onPoint={p => { setSel(p.id); push({ v: 'optUnit', cap, online, coach, unit: p.id! }) }} /></div></Panel>
        </div>
        <div className="flex flex-col gap-3 min-h-0">
          <Panel title="AI 优化建议" className="flex-1" bodyClass="overflow-auto scroll" extra={<span className="ai-badge">{applied.length ? `已采纳 ${applied.length}` : '待采纳'}</span>}><div className="p-2 space-y-1.5">{SUGGESTIONS.map(s => { const on = applied.includes(s.id); return <button key={s.id} onClick={() => { setApplied(a => on ? a.filter(x => x !== s.id) : [...a, s.id]); toast(on ? `已撤销：${s.t}` : `已采纳：${s.t}`) }} className="a-card w-full text-left" style={on ? { borderColor: 'var(--ok)', background: 'rgba(23,138,84,.06)' } : {}}><div className="flex items-center gap-2"><span className={`tag ${on ? 'tag-ok' : 'tag-gold'}`}>{on ? '已采纳' : s.k}</span><span className="text-[12.5px] font-medium flex-1 truncate">{s.t}</span></div><div className="flex items-center gap-3 mt-1 text-[11px]"><span className="num font-semibold" style={{ color: 'var(--ok)' }}>完成率 {s.effect}</span><span className="num" style={{ color: s.money < 0 ? 'var(--ok)' : 'var(--bad)' }}>预算 {s.money > 0 ? '+' : ''}{s.money} 万</span></div><div className="text-[10.5px] text-slate-500 mt-1 leading-snug">{s.d}</div><span className="go">{on ? '✓' : '›'}</span></button> })}</div></Panel>
          <Panel title="负荷过重单位"><div className="p-3"><Columns h={100} data={over.slice(0, 8).map(p => ({ label: p.label, v: p.x, color: 'var(--bad)' }))} unit="h" /></div></Panel>
        </div>
        <div className="flex flex-col gap-3 min-h-0">
          <Panel title="参数模拟器" extra={<span className="ai-badge">实时重算</span>}><div className="p-3">
            <Slider k="人均学时上限" v={cap} min={40} max={80} step={1} unit=" 学时" onChange={setCap} />
            <Slider k="线上化比例" v={online} min={20} max={70} step={1} unit="%" onChange={setOnline} />
            <Slider k="陪练前置比例" v={coach} min={10} max={70} step={1} unit="%" onChange={setCoach} />
            <div className="flex items-center gap-3 hair-t pt-3"><Ring v={Math.min(97, r.done + bonus)} size={72} stroke={7} color={r.done + bonus >= 88 ? 'var(--ok)' : 'var(--ai)'} sub="年末预测" /><div className="grid grid-cols-2 gap-1.5 flex-1 text-center">{[['变化', `${r.delta + bonus >= 0 ? '+' : ''}${Math.round((r.delta + bonus) * 10) / 10} pt`], ['预算', `${Math.round((r.budget + money) * 10) / 10} 万`], ['总学时', `${Math.round(r.hours / 10000)} 万`], ['目标', r.done + bonus >= 88 ? '达成' : '未达']].map(([k, v], i) => <div key={k} className="hairline py-1"><div className={`num text-[13px] font-semibold ${i === 0 ? 'gold-grad' : 'num-grad'}`}>{v}</div><div className="text-[9.5px] text-slate-500">{k}</div></div>)}</div></div>
            <div className="flex gap-2 mt-3"><button className="btn btn-primary btn-sm flex-1" onClick={() => push({ v: 'optScenario', cap, online, coach })}>生成优化方案 ›</button><button className="btn btn-sm flex-1" onClick={() => { setCap(60); setOnline(32); setCoach(24); setApplied([]); toast('已回到当前水平') }}>回到当前水平</button></div>
          </div></Panel>
          <Panel title="AI 预测报告" className="flex-1"><div className="p-3"><div className="ai-out text-[12px]"><Typewriter text={`按当前进度，年末完成率 ${DONE_FORECAST.base[3]}%（区间 ${DONE_FORECAST.lo[3]}–${DONE_FORECAST.hi[3]}），距 88% 目标差 ${Math.round((88 - DONE_FORECAST.base[3]) * 10) / 10} 个百分点。负荷过重是主因：${over.slice(0, 3).map(p => p.label).join('、')}人均超 70 学时。采纳学时上限 52 + 线上化 45% + 陪练前置 60% 的组合，年末可达 ${Math.min(97, Math.round((optimize(52, 45, 60).done + SUGGESTIONS.reduce((s, x) => s + parseFloat(x.effect), 0)) * 10) / 10)}%，预算节省 ${Math.round((optimize(52, 45, 60).saved - SUGGESTIONS.reduce((s, x) => s + x.money, 0)) * 10) / 10} 万元。`} speed={7} /></div></div></Panel>
        </div>
      </div>
    </div>
  )
}

/* ---------- 二级：优化方案 ---------- */
export function OptScenario({ cap, online, coach }: { cap: number; online: number; coach: number }) {
  const { push, toast, jump } = useNav()
  const r = optimize(cap, online, coach)
  const rows = useMemo(() => [...UNIT_PLANS, ...BUREAU_PLANS].filter(u => u.grp !== '地市供电局').map(u => { const d = Math.round((r.delta * (u.avgH > 60 ? 1.8 : u.avgH > 45 ? 1 : .5) + (u.done < 75 ? 1.5 : 0)) * 10) / 10; return { u, d, next: Math.min(99, Math.round((u.done + d) * 10) / 10), save: Math.round(u.budget * (r.saved / TOTAL.budget) * 10) / 10, hours: Math.round(u.hours * (r.hours / TOTAL.hours)) } }).sort((a, b) => b.d - a.d), [r.delta, r.saved, r.hours])
  const byGrp = [...UNIT_GROUPS.filter(g => g !== '地市供电局'), '地市局'].map(g => { const rs = rows.filter(x => x.u.grp === g); return { label: g, v: Math.round(rs.reduce((s, x) => s + x.d, 0) / Math.max(1, rs.length) * 10) / 10 } })
  return (
    <div className="h-full grid grid-cols-[300px_1fr_320px] gap-3 p-3 min-h-0">
      <div className="flex flex-col gap-3 min-h-0">
        <div className="panel p-4 shrink-0"><span className="tag tag-gold">优化方案</span><div className="text-[16px] font-semibold serif mt-1">上限 {cap} 学时 · 线上 {online}% · 陪练前置 {coach}%</div><div className="flex items-center gap-3 mt-3"><Ring v={r.done} size={64} stroke={7} color={r.done >= 88 ? 'var(--ok)' : 'var(--ai)'} sub="年末预测" /><div className="text-[11.5px] text-slate-600 leading-relaxed">完成率 <b className="num">{r.delta >= 0 ? '+' : ''}{r.delta} pt</b><br />预算 <b className="num">{r.budget}</b> 万（{r.saved >= 0 ? '省' : '增'} {Math.abs(r.saved)} 万）<br />总学时 <b className="num">{Math.round(r.hours / 10000)}</b> 万</div></div></div>
        <Panel title="分组效果　完成率增量 pt"><div className="p-3"><Columns h={110} data={byGrp} unit="" /></div></Panel>
        <Panel title="方案内容" className="flex-1"><div className="p-3 text-[12px] space-y-2">{[[`人均学时上限 ${cap}`, `超出部分裁剪个人意向类条目，影响 ${Math.round(TOTAL.plans * Math.max(0, 60 - cap) / 100).toLocaleString()} 人`], [`线上化 ${online}%`, `${Math.round((online - 32) / 100 * 120)} 期面上覆盖课转线上直播 + 回放`], [`陪练前置 ${coach}%`, '课程后 2 周内自动派发陪练任务']].map(([k, v]) => <div key={k} className="hairline px-3 py-2"><div className="font-medium">{k}</div><div className="text-[11px] text-slate-500 mt-0.5">{v}</div></div>)}</div></Panel>
      </div>
      <Panel title="各单位效果　按增量排序" bodyClass="overflow-auto scroll"><table className="grid"><thead><tr><th>#</th><th>单位</th><th>人均学时</th><th>当前</th><th>预测</th><th>增量</th><th>节省</th><th>主要动作</th></tr></thead><tbody>{rows.map((x, i) => <tr key={x.u.name} className="cursor-pointer row-in" onClick={() => push({ v: 'optUnit', cap, online, coach, unit: x.u.name })}><td className="num" style={{ color: i < 3 ? 'var(--gold)' : '#94a3b8' }}>{i + 1}</td><td className="font-medium">{short(x.u.name)}</td><td className="num" style={{ color: x.u.avgH > 70 ? 'var(--bad)' : 'inherit' }}>{x.u.avgH}</td><td className="num">{x.u.done}%</td><td className="num font-semibold" style={{ color: x.next >= 88 ? 'var(--ok)' : 'var(--indigo)' }}>{x.next}%</td><td className="num" style={{ color: x.d > 0 ? 'var(--ok)' : 'var(--bad)' }}>{x.d > 0 ? '+' : ''}{x.d}</td><td className="num">{x.save} 万</td><td><span className="tag">{x.u.avgH > 60 ? '压缩学时' : x.u.done < 75 ? '陪练前置 + 催办' : '线上化'}</span></td></tr>)}</tbody></table></Panel>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="AI 方案说明" extra={<span className="ai-badge">测算</span>}><div className="p-3"><div className="ai-out text-[12px]"><Typewriter text={`本方案年末完成率 ${r.done}%，${r.done >= 88 ? '可达成年度目标' : '仍未达 88%，建议把学时上限降到 52 并采纳全部建议'}。增量最大的是 ${rows.slice(0, 3).map(x => short(x.u.name)).join('、')}（负荷过重或完成率偏低）；预算${r.saved >= 0 ? `节省 ${r.saved} 万元，可用于第四季度补齐缺口` : `增加 ${Math.abs(r.saved)} 万元`}。`} speed={7} /></div>
          <div className="mt-2 space-y-1.5"><button className="act-btn" onClick={() => { toast('已下发到计划引擎，重新生成第四季度计划'); push({ v: 'engine' }) }}><span className="ic">引</span>下发到计划引擎<small>重算第四季度</small></button><button className="act-btn gold" onClick={() => { toast('已更新开班排期'); push({ v: 'schedule' }) }}><span className="ic">排</span>更新开班排期<small>线上化班次</small></button><button className="act-btn" onClick={() => { toast('已生成预算调整建议'); push({ v: 'budget' }) }}><span className="ic">预</span>生成预算调整<small>预算与投入</small></button><button className="act-btn gold" onClick={() => { toast('已下发陪练前置任务'); jump('coach', 'company') }}><span className="ic">练</span>下发陪练前置<small>陪练中心</small></button></div></div></Panel>
      </div>
    </div>
  )
}

/* ---------- 三级：单位落地 ---------- */
export function OptUnit({ cap, online, coach, unit }: { cap: number; online: number; coach: number; unit: string }) {
  const { push, toast, jump } = useNav()
  const u = unitPlanOf(unit) ?? UNIT_PLANS[0]
  const r = optimize(cap, online, coach)
  const d = Math.round((r.delta * (u.avgH > 60 ? 1.8 : u.avgH > 45 ? 1 : .5) + (u.done < 75 ? 1.5 : 0)) * 10) / 10
  const next = Math.min(99, Math.round((u.done + d) * 10) / 10)
  const newAvg = Math.min(u.avgH, cap)
  const acts = [{ k: '压缩学时', on: u.avgH > cap, d: `人均 ${u.avgH} → ${newAvg} 学时，裁剪个人意向类条目 ${Math.round(u.people * (u.avgH - newAvg) / 6)} 项` }, { k: '线上化', on: true, d: `${Math.round(u.people * online / 100 / 40)} 期面上覆盖课转线上` }, { k: '陪练前置', on: u.done < 85, d: `课程后 2 周内派发陪练，覆盖 ${Math.round(u.people * coach / 100)} 人` }, { k: '催办', on: u.done < 78, d: `逾期 ${u.overdue} 条推送到班组看板` }]
  const cum = u.planned.map((_, i) => Math.round(u.planned.slice(0, i + 1).reduce((a, b) => a + b, 0) / u.hours * 100))
  const act = u.actual.map((_, i) => i < NOW_M ? Math.round(u.actual.slice(0, i + 1).reduce((a, b) => a + b, 0) / u.hours * 100) : null)
  const proj = MONTHS.map((_, i) => i < NOW_M - 1 ? null : Math.min(99, Math.round((act[NOW_M - 1] ?? 60) + (i - NOW_M + 1) * ((next - (act[NOW_M - 1] ?? 60)) / (12 - NOW_M)))))
  return (
    <div className="h-full grid grid-cols-[300px_1fr_320px] gap-3 p-3 min-h-0">
      <div className="flex flex-col gap-3 min-h-0">
        <div className="panel p-4 shrink-0"><span className="tag">{u.grp}</span><div className="text-[17px] font-semibold serif mt-1">{short(u.name)}</div><div className="text-[11px] text-slate-500">{u.people.toLocaleString()} 人 · 人均 {u.avgH} 学时 · 逾期 {u.overdue}</div><div className="flex items-center gap-3 mt-3"><Ring v={next} size={64} stroke={7} color={next >= 88 ? 'var(--ok)' : 'var(--ai)'} sub="方案后" /><div className="text-[11.5px] text-slate-600 leading-relaxed">当前 <b className="num">{u.done}%</b> → <b className="num" style={{ color: 'var(--ok)' }}>{next}%</b><br />增量 <b className="num">{d > 0 ? '+' : ''}{d} pt</b><br />节省 <b className="num">{Math.round(u.budget * (r.saved / TOTAL.budget) * 10) / 10}</b> 万元</div></div></div>
        <Panel title="落地动作" className="flex-1"><div className="p-2 space-y-1.5">{acts.map(a => <div key={a.k} className={`hairline px-3 py-2 ${a.on ? '' : 'opacity-50'}`}><div className="flex items-center gap-2 text-[12px]"><span className={`tag ${a.on ? 'tag-ok' : ''}`}>{a.on ? '执行' : '不适用'}</span><span className="font-medium">{a.k}</span></div><div className="text-[11px] text-slate-500 mt-0.5">{a.d}</div></div>)}</div></Panel>
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="累计完成率　实际 · 方案后预测"><div className="px-3 pt-2"><LineChart labels={MONTHS} h={160} unit="%" series={[{ name: '计划', color: '#94a3b8', dash: true, data: cum }, { name: '实际', color: '#2f6df6', area: true, data: act }, { name: '方案后', color: '#178a54', dash: true, data: proj }]} yMin={0} yMax={100} /></div></Panel>
        <Panel title="学时结构　方案前后" className="flex-1"><div className="p-3"><Bars data={[{ label: '能力缺口类', v: Math.round(newAvg * .46) }, { label: '岗位与等级', v: Math.round(newAvg * .24) }, { label: '单位重点', v: Math.round(newAvg * .18) }, { label: '个人意向', v: Math.round(newAvg * .12), note: u.avgH > cap ? '已压缩' : undefined }]} unit=" 学时" /><div className="text-[11px] text-slate-500 mt-2 hair-t pt-2">人均 {u.avgH} → {newAvg} 学时；线上占比 32% → {online}%</div></div></Panel>
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="AI 落地建议" extra={<span className="ai-badge">单位</span>}><div className="p-3"><div className="ai-out text-[12px]"><Typewriter text={`${short(u.name)}${u.avgH > 70 ? `人均 ${u.avgH} 学时属负荷过重，压缩学时后完成率预计 +${Math.round(d * .6 * 10) / 10} pt；` : u.done < 75 ? '完成率偏低，陪练前置与催办的效果最强；' : '负荷合理，主要收益来自线上化；'}方案后年末 ${next}%。建议先在完成率最低的两个班组落地，4 周后复盘。`} speed={7} /></div>
          <div className="mt-2 space-y-1.5"><button className="act-btn" onClick={() => { toast(`已为 ${short(u.name)} 重算第四季度计划`); push({ v: 'engineRun', grp: '全部', unit: u.name }) }}><span className="ic">引</span>重算本单位计划<small>计划引擎</small></button><button className="act-btn gold" onClick={() => push({ v: 'trackUnit', name: u.name })}><span className="ic">跟</span>查看执行跟踪<small>{short(u.name)}</small></button><button className="act-btn" onClick={() => { toast('已下发陪练前置任务'); jump('coach', 'company') }}><span className="ic">练</span>下发陪练任务<small>陪练中心</small></button></div></div></Panel>
      </div>
    </div>
  )
}
