/* 一级：计划驾驶舱 */
import { Panel, Bars, CountUp, Donut } from '../ui'
import { LineChart, Heatmap, heat } from '../charts'
import { TOTAL, MONTHS, MONTH_PLAN, MONTH_ACT, NOW_M, KIND_MIX, SRC_MIX, UNIT_PLANS, BUREAU_PLANS, CLASSES, CONFLICTS, P_INSIGHTS, DONE_TREND, short } from './data'
import { useNav, Kpi, StTag } from './nav'
import type { Route } from './nav'

export default function Board() {
  const { push } = useNav()
  const units = [...UNIT_PLANS].sort((a, b) => b.done - a.done)
  const risky = UNIT_PLANS.filter(u => u.risk === '高').sort((a, b) => a.done - b.done)
  const cells = BUREAU_PLANS.map(b => MONTHS.slice(0, NOW_M).map((_, i) => Math.max(55, Math.min(99, Math.round(b.done + (b.actual[i] / Math.max(1, b.planned[i]) - b.done / 100) * 40 + (i === NOW_M - 1 ? -30 : 0))))))
  const thisMonth = CLASSES.filter(c => c.m === NOW_M)
  return (
    <div className="h-full flex flex-col gap-3 p-3 min-h-0">
      <div className="grid grid-cols-6 gap-3 shrink-0">
        <Kpi k="已生成计划" v={<CountUp to={TOTAL.plans} />} d="一人一份 · 与 IDP 同步" onClick={() => push({ v: 'engine' })} />
        <Kpi k="本年计划学时" v={<CountUp to={Math.round(TOTAL.hours / 10000)} suffix=" 万" />} d={`人均 ${Math.round(TOTAL.hours / TOTAL.plans)} 学时`} gold onClick={() => push({ v: 'agg' })} />
        <Kpi k="计划完成率" v={<><CountUp to={TOTAL.done} dec={1} /><span className="text-[12px] font-normal text-slate-500 ml-1">%</span></>} d="较上季 +3.1 个百分点" onClick={() => push({ v: 'track' })} spark={DONE_TREND} />
        <Kpi k="预算执行" v={<><CountUp to={Math.round(TOTAL.spent / TOTAL.budget * 100)} /><span className="text-[12px] font-normal text-slate-500 ml-1">%</span></>} d={`${TOTAL.spent} / ${TOTAL.budget} 万元`} gold onClick={() => push({ v: 'budget' })} />
        <Kpi k="开班班次" v={<CountUp to={CLASSES.length} />} d={`本月 ${thisMonth.length} 期 · 待排期 ${CLASSES.filter(c => c.st === '待排期').length}`} onClick={() => push({ v: 'schedule' })} />
        <Kpi k="待处理冲突" v={<CountUp to={CONFLICTS.length} />} d="AI 已给出处置方案" gold onClick={() => push({ v: 'schedule' })} />
      </div>
      <div className="flex-1 min-h-0 grid grid-cols-[320px_1fr_360px] gap-3">
        <div className="flex flex-col gap-3 min-h-0">
          <Panel title="学习形式构成" extra={<button className="btn btn-sm" onClick={() => push({ v: 'agg' })}>需求 ›</button>}><div className="p-2 flex items-center gap-3"><Donut data={KIND_MIX} size={120} label="学习形式" center="7 类" /><div className="flex-1 space-y-1">{KIND_MIX.map(d => <div key={d.k} className="flex items-center gap-2 text-[11.5px]"><span className="w-2 h-2 rounded-sm" style={{ background: d.c }} /><span className="text-slate-600">{d.k}</span><span className="ml-auto num text-slate-500">{d.n}%</span></div>)}</div></div></Panel>
          <Panel title="输入来源权重" extra={<button className="btn btn-sm" onClick={() => push({ v: 'engine' })}>引擎 ›</button>}><div className="p-3"><Bars data={SRC_MIX.map(s => ({ label: s.k, v: s.n }))} unit="%" max={50} /></div></Panel>
          <Panel title="高风险单位" className="flex-1" bodyClass="overflow-auto scroll"><div className="p-2 space-y-1">{risky.slice(0, 6).map(u => <button key={u.name} onClick={() => push({ v: 'trackUnit', name: u.name })} className="w-full flex items-center gap-2 hairline px-2.5 py-2 text-[12px] hover:border-[var(--ai)]"><span className="tag tag-bad">高</span><span className="truncate flex-1 text-left">{short(u.name)}</span><span className="num text-slate-500">逾期 {u.overdue}</span><span className="num font-semibold" style={{ color: 'var(--bad)' }}>{u.done}%</span></button>)}</div></Panel>
        </div>
        <div className="flex flex-col gap-3 min-h-0">
          <Panel title="月度计划学时与完成　万学时" extra={<span className="ai-badge">进度对照</span>}><div className="px-3 pt-2 pb-1"><LineChart labels={MONTHS} h={160} series={[{ name: '计划', color: '#94a3b8', dash: true, data: MONTH_PLAN.map(v => Math.round(v / 1000) / 10) }, { name: '实际完成', color: '#1e3a6e', area: true, data: MONTH_ACT.map((v, i) => i < NOW_M ? Math.round(v / 1000) / 10 : null) }]} yMin={0} /></div></Panel>
          <Panel title="14 个地市局 × 月 完成率" className="flex-1" bodyClass="overflow-auto scroll" extra={<button className="btn btn-sm" onClick={() => push({ v: 'track' })}>跟踪 ›</button>}><div className="p-3"><Heatmap rows={BUREAU_PLANS.map(b => b.name.replace(/供电局$/, ''))} cols={MONTHS.slice(0, NOW_M)} cells={cells} cellH={24} rowW={64} colorOf={v => heat(v)} onCell={r => push({ v: 'trackUnit', name: BUREAU_PLANS[r].name })} /><div className="text-[10.5px] text-slate-500 mt-1">本月为进行中数值</div></div></Panel>
        </div>
        <div className="flex flex-col gap-3 min-h-0">
          <Panel title="AI 洞察" extra={<span className="text-[10.5px] text-slate-500">每周一 06:00</span>}><div className="p-2 space-y-1.5">{P_INSIGHTS.map(x => <button key={x.k} onClick={() => push({ v: x.go } as Route)} className="a-card w-full text-left"><div className="flex items-center gap-2"><span className={`tag tag-${x.tag}`}>{x.k}</span><span className="num text-[12px] font-semibold" style={{ color: 'var(--indigo)' }}>{x.v}</span></div><div className="text-[11px] text-slate-600 leading-snug mt-1">{x.d}</div><span className="go">›</span></button>)}</div></Panel>
          <Panel title="单位完成率　前 6 / 后 4" className="flex-1" bodyClass="overflow-auto scroll"><div className="p-2 space-y-1">{[...units.slice(0, 6), ...units.slice(-4)].map((u, i) => <button key={u.name} onClick={() => push({ v: 'trackUnit', name: u.name })} className="w-full text-left flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded-lg"><span className="num text-[11px] w-[16px]" style={{ color: i < 3 ? 'var(--gold)' : '#94a3b8' }}>{i < 6 ? i + 1 : 28 - (9 - i)}</span><span className="text-[12px] truncate flex-1">{short(u.name)}</span><span className="num text-[12px] font-semibold" style={{ color: u.done >= 85 ? 'var(--ok)' : u.done >= 75 ? 'var(--indigo)' : 'var(--bad)' }}>{u.done}%</span></button>)}</div></Panel>
          <Panel title="本月开班"><div className="p-2 space-y-1">{thisMonth.slice(0, 4).map(c => <button key={c.id} onClick={() => push({ v: 'schedClass', id: c.id })} className="w-full text-left flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded-lg text-[12px]"><span className="num text-slate-500 w-[40px]">{c.d}</span><span className="flex-1 truncate">{c.name}</span><StTag s={c.st} /></button>)}</div></Panel>
        </div>
      </div>
    </div>
  )
}
