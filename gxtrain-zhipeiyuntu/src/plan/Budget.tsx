/* 预算与投入（一级）→ 单位预算（二级）→ 预算科目明细（三级） */
import { useState } from 'react'
import { Panel, Donut, Bars, CountUp } from '../ui'
import { LineChart, Columns, Ring } from '../charts'
import { TOTAL, UNIT_PLANS, BUREAU_PLANS, BUDGET_CATS, CAT_SHARE, BUDGET_BY_GRP, budgetLines, unitPlanOf, MONTHS, NOW_M, short, AI_SAVE } from './data'
import { useNav, Typewriter, Kpi } from './nav'

const CAT_C = ['#1e3a6e', '#2f6df6', '#7b5cf5', '#19b8d8', '#b08a3e', '#94a3b8']

export function BudgetView() {
  const { push, toast } = useNav()
  const [mode, setMode] = useState<'单位' | '地市局'>('单位')
  const rows = (mode === '单位' ? UNIT_PLANS : BUREAU_PLANS).slice().sort((a, b) => b.budget - a.budget)
  const cats = BUDGET_CATS.map((k, i) => ({ k, n: Math.round(TOTAL.budget * CAT_SHARE[i] * 10) / 10, c: CAT_C[i] }))
  const rate = Math.round(TOTAL.spent / TOTAL.budget * 100)
  const monthly = MONTHS.map((_, i) => Math.round(TOTAL.budget / 12 * [.6, .5, 1.1, 1.2, 1.1, 1.0, .7, .8, 1.3, 1.4, 1.3, 1.0][i] * 10) / 10)
  const spentM = monthly.map((v, i) => i < NOW_M ? Math.round(v * (i === NOW_M - 1 ? .4 : .96 + ((i * 7) % 9) / 100) * 10) / 10 : null)
  return (
    <div className="h-full flex flex-col gap-3 p-3 min-h-0">
      <div className="grid grid-cols-5 gap-3 shrink-0">
        <Kpi k="年度预算" v={<><CountUp to={TOTAL.budget} dec={1} /><span className="text-[12px] font-normal text-slate-500 ml-1">万元</span></>} d={`人均 ${Math.round(TOTAL.budget * 10000 / TOTAL.plans)} 元`} />
        <Kpi k="已执行" v={<><CountUp to={TOTAL.spent} dec={1} /><span className="text-[12px] font-normal text-slate-500 ml-1">万元</span></>} d={`执行率 ${rate}% · 时间进度 ${Math.round(NOW_M / 12 * 100)}%`} gold />
        <Kpi k="每学时成本" v={<><CountUp to={Math.round(TOTAL.spent * 10000 / (TOTAL.hours * TOTAL.done / 100))} /><span className="text-[12px] font-normal text-slate-500 ml-1">元</span></>} d="较去年 -12%" />
        <Kpi k="AI 可节省" v={<><CountUp to={AI_SAVE} dec={1} /><span className="text-[12px] font-normal text-slate-500 ml-1">万元</span></>} d="线上化 + 学时上限 + 合并开班" gold onClick={() => push({ v: 'insight' })} />
        <Kpi k="执行偏快单位" v={<CountUp to={UNIT_PLANS.filter(u => u.spent / u.budget > NOW_M / 12 + .06).length} />} d="需关注第四季度额度" onClick={() => setMode('单位')} />
      </div>
      <div className="flex-1 min-h-0 grid grid-cols-[340px_1fr_340px] gap-3">
        <div className="flex flex-col gap-3 min-h-0">
          <Panel title="预算科目构成"><div className="p-2 flex items-center gap-3"><Donut data={cats} size={124} label="万元" center={`${Math.round(TOTAL.budget)}`} /><div className="flex-1 space-y-1">{cats.map(d => <div key={d.k} className="flex items-center gap-2 text-[11px]"><span className="w-2 h-2 rounded-sm" style={{ background: d.c }} /><span className="text-slate-600">{d.k}</span><span className="ml-auto num">{d.n}</span></div>)}</div></div></Panel>
          <Panel title="按单位组　预算 / 已执行" className="flex-1"><div className="p-3"><Bars data={BUDGET_BY_GRP.map(b => ({ label: b.g, v: b.budget }))} unit=" 万" /><div className="mt-3 space-y-1 text-[11px]">{BUDGET_BY_GRP.map(b => <div key={b.g} className="flex items-center gap-2"><span className="w-[100px] text-slate-600 truncate">{b.g}</span><div className="flex-1 h-[6px] bg-slate-100 rounded overflow-hidden"><div className="h-full bar-grow" style={{ width: `${b.spent / b.budget * 100}%`, background: b.spent / b.budget > NOW_M / 12 + .06 ? 'var(--bad)' : 'var(--ok)' }} /></div><span className="num w-[36px] text-right">{Math.round(b.spent / b.budget * 100)}%</span></div>)}</div></div></Panel>
        </div>
        <div className="flex flex-col gap-3 min-h-0">
          <Panel title="月度预算与执行　万元"><div className="px-3 pt-2"><LineChart labels={MONTHS} h={150} series={[{ name: '预算', color: '#94a3b8', dash: true, data: monthly }, { name: '已执行', color: '#b08a3e', area: true, data: spentM }]} yMin={0} /></div></Panel>
          <Panel title={`${mode}预算执行`} className="flex-1" bodyClass="overflow-auto scroll" extra={<div className="seg"><button className={mode === '单位' ? 'on' : ''} onClick={() => setMode('单位')}>28 个单位</button><button className={mode === '地市局' ? 'on' : ''} onClick={() => setMode('地市局')}>14 个地市局</button></div>}>
            <table className="grid"><thead><tr><th>#</th><th>{mode}</th><th>人数</th><th>预算</th><th>已执行</th><th>执行率</th><th>人均</th><th>状态</th></tr></thead><tbody>{rows.map((u, i) => { const r = Math.round(u.spent / u.budget * 100); const fast = u.spent / u.budget > NOW_M / 12 + .06, slow = u.spent / u.budget < NOW_M / 12 - .1; return <tr key={u.name} className="cursor-pointer row-in" onClick={() => push({ v: 'budgetUnit', name: u.name })}><td className="num text-slate-400">{i + 1}</td><td className="font-medium">{short(u.name)}</td><td className="num">{u.people.toLocaleString()}</td><td className="num">{u.budget} 万</td><td className="num">{u.spent} 万</td><td><div className="flex items-center gap-1.5"><div className="w-[64px] h-[6px] bg-slate-100 rounded overflow-hidden"><div className="h-full" style={{ width: `${r}%`, background: fast ? 'var(--bad)' : slow ? 'var(--gold)' : 'var(--ok)' }} /></div><span className="num text-[11px]">{r}%</span></div></td><td className="num">{Math.round(u.budget * 10000 / u.people)} 元</td><td><span className={`tag ${fast ? 'tag-bad' : slow ? 'tag-warn' : 'tag-ok'}`}>{fast ? '偏快' : slow ? '偏慢' : '正常'}</span></td></tr> })}</tbody></table>
          </Panel>
        </div>
        <div className="flex flex-col gap-3 min-h-0">
          <Panel title="AI 预算判读" extra={<span className="ai-badge">每月</span>}><div className="p-3"><div className="ai-out text-[12px]"><Typewriter text={`预算执行率 ${rate}%，与时间进度（${Math.round(NOW_M / 12 * 100)}%）基本匹配。${UNIT_PLANS.filter(u => u.spent / u.budget > NOW_M / 12 + .06).map(u => short(u.name)).slice(0, 3).join('、')}执行偏快，集训类科目占比高；线上化 3 门面上覆盖课与合并继电保护班，可节省 ${AI_SAVE} 万元用于第四季度补齐缺口。`} speed={7} /></div>
            <div className="mt-2 space-y-1.5"><button className="act-btn" onClick={() => push({ v: 'insight' })}><span className="ic">优</span>查看节省方案<small>AI 优化与预测</small></button><button className="act-btn gold" onClick={() => toast('已生成第四季度预算调整建议并提交')}><span className="ic">调</span>生成额度调整建议<small>第四季度</small></button><button className="act-btn" onClick={() => toast('已导出预算执行表（xlsx）')}><span className="ic">出</span>导出执行表<small>xlsx</small></button></div></div></Panel>
          <Panel title="每学时成本　按科目" className="flex-1"><div className="p-3"><Columns h={110} data={[{ label: '课程', v: 28 }, { label: '陪练', v: 12 }, { label: '集训', v: 96, color: 'var(--gold)' }, { label: '带教', v: 38 }, { label: '认定', v: 52 }, { label: '线上', v: 6 }]} unit=" 元" /><div className="text-[10.5px] text-slate-500 mt-1">集训类单位成本最高，线上课最低</div></div></Panel>
        </div>
      </div>
    </div>
  )
}

/* ---------- 二级：单位预算 ---------- */
export function BudgetUnit({ name }: { name: string }) {
  const { push, toast } = useNav()
  const u = unitPlanOf(name) ?? UNIT_PLANS[0]
  const cats = BUDGET_CATS.map((k, i) => ({ label: k, v: Math.round(u.budget * CAT_SHARE[i] * 10) / 10, spent: Math.round(u.spent * CAT_SHARE[i] * (i === 2 ? 1.25 : .95) * 10) / 10 }))
  const rate = Math.round(u.spent / u.budget * 100)
  const monthly = u.planned.map(v => Math.round(v * 34 / 10000 * 10) / 10), spentM = u.actual.map((v, i) => i < NOW_M ? Math.round(v * 34 / 10000 * 10) / 10 : null)
  return (
    <div className="h-full grid grid-cols-[300px_1fr_320px] gap-3 p-3 min-h-0">
      <div className="flex flex-col gap-3 min-h-0">
        <div className="panel p-4 shrink-0"><span className="tag">{u.grp}</span><div className="text-[17px] font-semibold serif mt-1">{short(u.name)}</div><div className="text-[11px] text-slate-500">{u.people.toLocaleString()} 人 · 人均 {Math.round(u.budget * 10000 / u.people)} 元</div><div className="flex items-center gap-3 mt-3"><Ring v={rate} size={64} stroke={7} color={rate > NOW_M / 12 * 100 + 6 ? 'var(--bad)' : 'var(--ok)'} sub="执行率" /><div className="text-[11.5px] text-slate-600 leading-relaxed">预算 <b className="num">{u.budget}</b> 万元<br />已执行 <b className="num">{u.spent}</b> 万元<br />计划完成率 <b className="num">{u.done}%</b></div></div></div>
        <Panel title="科目执行" className="flex-1" bodyClass="overflow-auto scroll" extra={<span className="text-[10.5px] text-slate-500">点击进入明细</span>}><div className="p-2 space-y-1">{cats.map((c, i) => <button key={c.label} onClick={() => push({ v: 'budgetLine', name: u.name, cat: c.label })} className="w-full text-left px-2 py-1.5 hover:bg-slate-50 rounded-lg"><div className="flex items-center text-[12px]"><span className="w-2 h-2 rounded-sm mr-2" style={{ background: CAT_C[i] }} /><span>{c.label}</span><span className="ml-auto num">{c.spent} / {c.v} 万</span></div><div className="h-[5px] bg-slate-100 rounded mt-1 overflow-hidden"><div className="h-full" style={{ width: `${Math.min(100, c.spent / c.v * 100)}%`, background: c.spent / c.v > NOW_M / 12 + .08 ? 'var(--bad)' : CAT_C[i] }} /></div></button>)}</div></Panel>
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="月度预算与执行　万元"><div className="px-3 pt-2"><LineChart labels={MONTHS} h={150} series={[{ name: '预算', color: '#94a3b8', dash: true, data: monthly }, { name: '已执行', color: '#b08a3e', area: true, data: spentM }]} yMin={0} /></div></Panel>
        <Panel title="投入 → 成效" className="flex-1"><div className="p-3"><Columns h={120} data={[{ label: '每学时成本', v: Math.round(u.spent * 10000 / Math.max(1, u.actual.reduce((a, b) => a + b, 0))) }, { label: '每人成本', v: Math.round(u.spent * 10000 / u.people) }, { label: '达标率提升 pt', v: 4 + (u.name.length % 5), color: 'var(--gold)' }, { label: '完成率 %', v: u.done, color: 'var(--ok)' }]} /><div className="text-[10.5px] text-slate-500 mt-1">单位：元 / pt / %</div></div></Panel>
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="AI 判读" extra={<span className="ai-badge">单位</span>}><div className="p-3"><div className="ai-out text-[12px]"><Typewriter text={`${short(u.name)}执行率 ${rate}%，${rate > NOW_M / 12 * 100 + 6 ? '快于时间进度，集训与训战营科目执行 125%，第四季度额度可能不足；建议把 2 门课程转线上并申请调剂 ' + Math.round(u.budget * .08 * 10) / 10 + ' 万元。' : rate < NOW_M / 12 * 100 - 10 ? '慢于时间进度，主要是陪练与带教科目未启动；建议本月集中安排。' : '与时间进度匹配，第四季度按计划执行即可。'}`} speed={7} /></div>
          <div className="mt-2 space-y-1.5"><button className="act-btn" onClick={() => toast('已提交额度调剂申请')}><span className="ic">调</span>申请额度调剂<small>培训科审批</small></button><button className="act-btn gold" onClick={() => push({ v: 'trackUnit', name: u.name })}><span className="ic">跟</span>查看执行跟踪<small>{short(u.name)}</small></button></div></div></Panel>
      </div>
    </div>
  )
}

/* ---------- 三级：预算科目明细 ---------- */
export function BudgetLine({ name, cat }: { name: string; cat: string }) {
  const { toast } = useNav()
  const u = unitPlanOf(name) ?? UNIT_PLANS[0]
  const lines = budgetLines(u, cat)
  const total = lines.reduce((s, l) => s + l.budget, 0), spent = lines.reduce((s, l) => s + l.spent, 0)
  return (
    <div className="h-full grid grid-cols-[1fr_320px] gap-3 p-3 min-h-0">
      <Panel title={`${short(u.name)} · ${cat}　${Math.round(spent * 10) / 10} / ${Math.round(total * 10) / 10} 万元`} bodyClass="overflow-auto scroll">
        <table className="grid"><thead><tr><th>明细项</th><th>预算</th><th>已执行</th><th>执行率</th><th>关联班次 / 条目</th><th>状态</th></tr></thead><tbody>{lines.map((l, i) => { const r = Math.round(l.spent / l.budget * 100); return <tr key={l.n} className="row-in"><td className="font-medium">{l.n}</td><td className="num">{l.budget} 万</td><td className="num">{l.spent} 万</td><td><div className="flex items-center gap-1.5"><div className="w-[80px] h-[6px] bg-slate-100 rounded overflow-hidden"><div className="h-full" style={{ width: `${Math.min(100, r)}%`, background: r > 100 ? 'var(--bad)' : 'var(--ai)' }} /></div><span className="num text-[11px]">{r}%</span></div></td><td className="num text-slate-500">{3 + (i * 7 + u.name.length) % 20} 项</td><td><span className={`tag ${r > 100 ? 'tag-bad' : r > 60 ? 'tag-ok' : 'tag-warn'}`}>{r > 100 ? '超支' : r > 60 ? '正常' : '偏慢'}</span></td></tr> })}</tbody></table>
        <div className="p-3 hair-t"><Bars data={lines.map(l => ({ label: l.n, v: l.spent, note: l.spent > l.budget ? '超支' : undefined }))} unit=" 万" /></div>
      </Panel>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="AI 优化建议" extra={<span className="ai-badge">科目</span>}><div className="p-3"><div className="ai-out text-[12px]"><Typewriter text={`${cat}已执行 ${Math.round(spent / total * 100)}%。${lines.find(l => l.spent > l.budget) ? `${lines.find(l => l.spent > l.budget)!.n}超支，建议从执行偏慢的${lines.slice().sort((a, b) => a.spent / a.budget - b.spent / b.budget)[0].n}调剂 ${Math.round(total * .06 * 10) / 10} 万元；` : '各项均在额度内；'}${cat.includes('课程') ? '微课制作可由数字人讲师承担，可省 40%。' : cat.includes('集训') ? '训战营住宿改为就近安排，可省 15%。' : cat.includes('差旅') ? '区域合并开班可减少 30% 差旅。' : '按计划执行即可。'}`} speed={7} /></div>
          <div className="mt-2 space-y-1.5"><button className="act-btn" onClick={() => toast('已生成科目内调剂方案')}><span className="ic">调</span>科目内调剂<small>自动生成</small></button><button className="act-btn gold" onClick={() => toast('已导出明细（xlsx）')}><span className="ic">出</span>导出明细<small>xlsx</small></button></div></div></Panel>
      </div>
    </div>
  )
}
