/* 计划生成引擎（一级）→ 单位生成结果（二级）→ 个人计划依据（三级） */
import { useEffect, useMemo, useState } from 'react'
import { Panel, Bars, Radar } from '../ui'
import { Gantt, Columns, Ring } from '../charts'
import { UNIT_GROUPS } from '../units'
import type { UnitGroup } from '../units'
import { PLAN_INPUTS, UNITS, BUREAUS, ENGINE_STEPS, engineStats, personPlan, planHours, KIND_COLOR, short, personById, ENGINE_LAST} from './data'
import type { EngineScope } from './data'
import { teamPersons, postOfTeam, unitOf, isFunc, isBureauUnit, GRADES } from '../atlas/data'
import { useNav, Typewriter, Field, KindTag, StTag } from './nav'

const sampleTeam = (unitName: string) => { const u = unitOf(unitName); if (!u) return '变电管理一所'; return isBureauUnit(u) ? `${BUREAUS[0]} · 变电管理一所` : isFunc(u) ? u.depts[0].name : `${short(u.name)} · 变电管理一所` }

export function EngineView() {
  const { push, toast } = useNav()
  const [w, setW] = useState(PLAN_INPUTS.map(p => p.w))
  const [scope, setScope] = useState<EngineScope>({ grp: '全部', grade: '全部', onlyGaps: false })
  const [step, setStep] = useState(ENGINE_LAST.ran ? ENGINE_STEPS.length : -1)
  const [ran, setRan] = useState(ENGINE_LAST.ran)
  const st = engineStats(w, scope)
  const unit = scope.grp === '全部' ? UNITS[23] : UNITS.find(u => u.grp === scope.grp) ?? UNITS[0]
  const team = sampleTeam(unit.name)
  const people = useMemo(() => teamPersons(unit.name, team, postOfTeam(team)).slice(0, 5), [unit.name, team])
  useEffect(() => { if (step < 0 || step >= ENGINE_STEPS.length) return; const t = setTimeout(() => { if (step === ENGINE_STEPS.length - 1) { setRan(true); ENGINE_LAST.ran = true; setStep(ENGINE_STEPS.length) } else setStep(step + 1) }, 650); return () => clearTimeout(t) }, [step])
  const run = () => { setRan(false); setStep(0) }
  const rows = ran ? people.flatMap(p => { const it = personPlan(p); return [{ name: `${p.name} · ${p.grade}`, sub: `${planHours(it)} 学时`, spans: it.map(i => ({ from: i.m - 1, to: i.m, color: KIND_COLOR[i.kind], label: i.kind, st: i.st })) }] }) : []
  return (
    <div className="h-full flex flex-col gap-3 p-3 min-h-0">
      <div className="pipe shrink-0">{['① 输入与权重', '② 对象范围', '③ AI 排布', '④ 结果与下发'].map((s, i) => <div key={s} className={`st ${i < 2 || (i === 2 && step >= 0) || (i === 3 && ran) ? (i === 2 && step >= 0 && !ran ? 'cur' : 'done') : ''}`}><span className="dot" /><span className="nm">{s}</span><span className="ct">{i === 0 ? `${w.reduce((a, b) => a + b, 0)}%` : i === 1 ? `${st.people.toLocaleString()} 人` : i === 2 ? (ran ? '已完成' : step >= 0 ? `${ENGINE_STEPS[Math.min(step, 4)]}` : '待运行') : ran ? `${st.classes} 期班次` : '—'}</span></div>)}</div>
      <div className="flex-1 min-h-0 grid grid-cols-[340px_1fr_320px] gap-3">
        <div className="flex flex-col gap-3 min-h-0">
          <Panel title="① 输入源与权重" extra={<span className="text-[10.5px] text-slate-500">拖动后右侧实时重算</span>}><div className="p-3">{PLAN_INPUTS.map((p, i) => <div key={p.k} className="mb-2.5"><div className="flex items-center text-[11.5px]"><span className="font-medium">{p.k}</span><span className="ml-auto num font-semibold" style={{ color: 'var(--indigo)' }}>{w[i]}%</span></div><div className="text-[10.5px] text-slate-500 mb-1">{p.d}</div><input type="range" min={0} max={60} value={w[i]} onChange={e => setW(ws => ws.map((x, j) => j === i ? parseInt(e.target.value) : x))} className="w-full accent-[var(--ai)]" /></div>)}</div></Panel>
          <Panel title="② 对象范围" className="flex-1"><div className="p-3"><div className="text-[11px] text-slate-500 mb-1">单位范围</div><div className="flex flex-wrap gap-1 mb-2">{(['全部', ...UNIT_GROUPS] as const).map(g => <button key={g} className={`dim-tab ${scope.grp === g ? 'on' : ''}`} onClick={() => setScope(s => ({ ...s, grp: g as UnitGroup | '全部' }))}>{g}</button>)}</div><div className="text-[11px] text-slate-500 mb-1">等级</div><div className="flex flex-wrap gap-1 mb-2">{['全部', ...GRADES].map(g => <button key={g} className={`dim-tab ${scope.grade === g ? 'on' : ''}`} onClick={() => setScope(s => ({ ...s, grade: g }))}>{g}</button>)}</div><label className="flex items-center gap-2 text-[12px]"><input type="checkbox" checked={scope.onlyGaps} onChange={e => setScope(s => ({ ...s, onlyGaps: e.target.checked }))} className="accent-[var(--ai)]" />仅对存在能力缺口的人员生成</label>
            <div className="grid grid-cols-3 gap-1.5 mt-3 text-center">{[['对象', `${st.people.toLocaleString()} 人`], ['单位', `${st.units} 个`], ['人均条目', `${st.avgItems}`], ['人均学时', `${st.avgH}`], ['预算', `${st.budget} 万`], ['预计冲突', `${st.conflicts}`]].map(([k, v], i) => <div key={k} className="hairline py-1.5"><div className={`num text-[13px] font-semibold ${i === 0 ? 'gold-grad' : 'num-grad'}`}>{v}</div><div className="text-[9.5px] text-slate-500">{k}</div></div>)}</div></div></Panel>
        </div>
        <div className="flex flex-col gap-3 min-h-0">
          <Panel title="③ AI 排布" extra={<button className="btn btn-primary btn-sm" onClick={run} disabled={step >= 0 && !ran}>{ran ? '重新生成' : step >= 0 ? '生成中…' : '开始生成'}</button>}>
            <div className="p-3">{step < 0 ? <div className="text-[12px] text-slate-500 p-4 text-center">设定权重与范围后开始生成，引擎按五个步骤排布并实时展示。</div> : <div className="ai-think space-y-1">{ENGINE_STEPS.map((s, i) => <div key={s} className={`flex items-center gap-2 text-[12px] ${i < step || ran ? 'text-slate-700' : i === step ? '' : 'text-slate-300'}`}><i className={i < step || ran ? '' : i === step ? 'pulse-dot' : ''} style={{ background: i < step || ran ? 'var(--ok)' : i === step ? 'var(--ai)' : '#e2e8f0' }} />{s}{(i < step || ran) && <span className="ml-auto num text-[10.5px] text-slate-400">{[`${st.people.toLocaleString()} 人 · ${Math.round(st.people * 2.3).toLocaleString()} 项缺口`, `匹配课程 ${Math.round(st.people * .9).toLocaleString()} 门次 · 陪练 ${Math.round(st.people * 1.6).toLocaleString()} 场`, `发现冲突 ${st.conflicts} 处 · 自动改期 ${Math.max(0, st.conflicts - 3)} 处`, `超上限 ${Math.round(st.people * .04).toLocaleString()} 人已压缩`, `写入 ${st.people.toLocaleString()} 份 IDP`][i]}</span>}</div>)}</div>}</div>
          </Panel>
          <Panel title={ran ? `④ 结果预览　${short(unit.name)} · ${team.replace(/^.*· /, '')} 样本 5 人` : '④ 结果预览'} className="flex-1" bodyClass="overflow-auto scroll" extra={ran && <button className="btn btn-sm" onClick={() => push({ v: 'engineRun', grp: scope.grp, unit: unit.name })}>查看单位结果 ›</button>}>
            <div className="p-3">{ran ? <><Gantt rows={rows} cols={12} now={8.5} onSpan={(r) => { const p = people.find(x => r.name.startsWith(x.name)); if (p) push({ v: 'engineItem', unit: unit.name, team, pid: p.id }) }} /><div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[10.5px] text-slate-500">{Object.entries(KIND_COLOR).map(([k, c]) => <span key={k} className="flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: c }} />{k}</span>)}<span className="ml-auto">金线为当前月</span></div></> : <div className="text-[12px] text-slate-400 p-6 text-center">生成完成后在此预览样本人员的 12 个月排布</div>}</div>
          </Panel>
        </div>
        <div className="flex flex-col gap-3 min-h-0">
          <Panel title="AI 说明" extra={<span className="ai-badge">规则</span>}><div className="p-3"><div className="ai-out text-[12px]"><Typewriter text={ran ? `已为 ${st.people.toLocaleString()} 人生成计划，人均 ${st.avgItems} 项、${st.avgH} 学时，预算 ${st.budget} 万元。能力缺口权重 ${w[0]}%，缺口类条目占比 ${Math.round(w[0] / (w.reduce((a, b) => a + b, 0) || 1) * 100)}%；${st.conflicts} 处排期冲突中 ${Math.max(0, st.conflicts - 3)} 处已自动改期，其余 3 处需人工确认。` : `引擎按四个输入源加权打分，逐人挑选条目并排布到 12 个月：学时上限每人 60，课程后 2 周内安排陪练，与检修计划、迎峰度夏节点做冲突校验，季度学时均衡。`} speed={7} /></div>
            <div className="mt-2 space-y-1.5"><button className="act-btn" disabled={!ran} onClick={() => toast(`已下发 ${st.people.toLocaleString()} 份计划并写入 IDP`)}><span className="ic">发</span>下发到 {st.units} 个单位<small>写入 IDP · 班组看板可见</small></button><button className="act-btn gold" disabled={!ran} onClick={() => push({ v: 'agg' })}><span className="ic">汇</span>查看需求汇总<small>开班与预算</small></button></div></div></Panel>
          <Panel title="生成规则"><div className="p-3 text-[11.5px] space-y-1.5"><Field k="学时上限" v="每人每年 60 学时，超出按得分裁剪" /><Field k="陪练前置" v="课程后 2 周内安排陪练" /><Field k="冲突校验" v="检修计划 · 迎峰度夏 · 场地 · 讲师" /><Field k="季度均衡" v="单季学时不超过全年 35%" /></div></Panel>
          <Panel title="历史生成" className="flex-1"><div className="p-2 space-y-0.5 text-[11.5px]">{[['2026-09-01', '全公司 · 第四季度滚动', '45,694 人'], ['2026-06-28', '地市供电局 · 迎峰度夏专项', '35,850 人'], ['2026-01-06', '全公司 · 年度计划', '45,102 人']].map(([d, n, c]) => <div key={d} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded-lg"><span className="num text-slate-400">{d}</span><span className="flex-1 truncate">{n}</span><span className="num text-slate-500">{c}</span></div>)}</div></Panel>
        </div>
      </div>
    </div>
  )
}

/* ---------- 二级：单位生成结果 ---------- */
export function EngineRun({ grp, unit }: { grp: string; unit: string }) {
  const { push, replace, toast } = useNav()
  const units = grp === '全部' ? UNITS : UNITS.filter(u => u.grp === grp)
  const u = unitOf(unit) ?? units[0]
  const team = sampleTeam(u.name)
  const people = useMemo(() => teamPersons(u.name, team, postOfTeam(team)), [u.name, team])
  const rows = people.map(p => { const it = personPlan(p); return { p, it, h: planHours(it), cost: Math.round(it.reduce((s, i) => s + i.cost, 0)), gaps: p.abilities.filter(a => a.v < a.need).length, src: ['能力缺口', '岗位与等级', '单位重点', '个人意向'].map(s => it.filter(i => i.src === s).length) } })
  const over = rows.filter(r => r.h > 60)
  const bins = ['< 30', '30–45', '45–60', '> 60'].map((label, i) => ({ label, v: rows.filter(r => i === 0 ? r.h < 30 : i === 1 ? r.h < 45 : i === 2 ? r.h <= 60 : r.h > 60).length, color: i === 3 ? 'var(--bad)' : undefined }))
  return (
    <div className="h-full grid grid-cols-[1fr_320px] gap-3 p-3 min-h-0">
      <Panel title={`${short(u.name)} · ${team.replace(/^.*· /, '')}　样本 ${people.length} 人`} bodyClass="overflow-auto scroll" extra={<div className="flex flex-wrap gap-1 max-w-[700px] justify-end">{units.slice(0, 8).map(x => <button key={x.id} className={`chip ${x.id === u.id ? 'on' : ''}`} style={x.id === u.id ? { borderColor: 'var(--ai)', color: 'var(--ai)' } : {}} onClick={() => replace({ v: 'engineRun', grp, unit: x.name })}>{short(x.name)}</button>)}</div>}>
        <table className="grid"><thead><tr><th>姓名</th><th>等级</th><th>缺口</th><th>条目</th><th>学时</th><th>来源构成</th><th>预算</th><th>校验</th></tr></thead>
          <tbody>{rows.map(r => <tr key={r.p.id} className="cursor-pointer row-in" onClick={() => push({ v: 'engineItem', unit: u.name, team, pid: r.p.id })}><td className="font-medium">{r.p.name}</td><td>{r.p.grade}</td><td className="num">{r.gaps} 项</td><td className="num">{r.it.length}</td><td className="num font-semibold" style={{ color: r.h > 60 ? 'var(--bad)' : 'inherit' }}>{r.h}</td><td><div className="flex h-[8px] w-[140px] rounded overflow-hidden">{r.src.map((n, i) => <span key={i} style={{ width: `${n / r.it.length * 100}%`, background: ['#1e3a6e', '#2f6df6', '#b08a3e', '#19b8d8'][i] }} />)}</div></td><td className="num">{r.cost.toLocaleString()} 元</td><td>{r.h > 60 ? <span className="tag tag-bad">超上限</span> : <span className="tag tag-ok">通过</span>}</td></tr>)}</tbody></table>
        <div className="p-3 hair-t flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] text-slate-500">{['能力缺口', '岗位与等级', '单位重点', '个人意向'].map((s, i) => <span key={s} className="flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: ['#1e3a6e', '#2f6df6', '#b08a3e', '#19b8d8'][i] }} />{s}</span>)}</div>
      </Panel>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="学时分布"><div className="p-3"><Columns h={110} data={bins} /></div></Panel>
        <Panel title="AI 校验" className="flex-1" extra={<span className="ai-badge">自动</span>}><div className="p-3"><div className="ai-out text-[12px]"><Typewriter text={`${short(u.name)}样本 ${people.length} 人，人均 ${Math.round(rows.reduce((s, r) => s + r.h, 0) / rows.length)} 学时。${over.length ? `${over.map(r => r.p.name).join('、')}超过 60 学时上限，已按得分裁剪个人意向类条目；` : '全部在学时上限内；'}缺口类条目占 ${Math.round(rows.reduce((s, r) => s + r.src[0], 0) / rows.reduce((s, r) => s + r.it.length, 0) * 100)}%。`} speed={7} /></div>
          <div className="mt-2 space-y-1.5"><button className="act-btn" onClick={() => toast(`已下发 ${short(u.name)} 的计划并写入 IDP`)}><span className="ic">发</span>下发本单位计划<small>{u.people.toLocaleString()} 人</small></button><button className="act-btn gold" onClick={() => push({ v: 'idp', id: people[0].id, unit: u.name, team })}><span className="ic">看</span>打开 {people[0].name} 的 IDP<small>IDP 联动视图</small></button></div></div></Panel>
      </div>
    </div>
  )
}

/* ---------- 三级：个人计划依据 ---------- */
export function EngineItem({ unit, team, pid }: { unit: string; team: string; pid: string }) {
  const { push, toast, jump } = useNav()
  const p = personById(pid, unit, team) ?? teamPersons(unit, team, postOfTeam(team))[0]
  const items = personPlan(p)
  const src = ['能力缺口', '岗位与等级', '单位重点', '个人意向'].map((s, i) => ({ label: s, v: items.filter(x => x.src === s).length, color: ['#1e3a6e', '#2f6df6', '#b08a3e', '#19b8d8'][i] }))
  return (
    <div className="h-full grid grid-cols-[300px_1fr_320px] gap-3 p-3 min-h-0">
      <div className="flex flex-col gap-3 min-h-0">
        <div className="panel p-4 shrink-0"><div className="flex items-center gap-3"><div className="w-11 h-11 rounded-2xl flex items-center justify-center text-[17px] text-white serif" style={{ background: 'linear-gradient(135deg,var(--indigo),var(--ai))' }}>{p.name[0]}</div><div><div className="text-[15px] font-semibold">{p.name}</div><div className="text-[11px] text-slate-500">{p.post} · {p.grade} → {p.nextGrade}</div></div><div className="ml-auto"><Ring v={Math.min(100, Math.round(planHours(items) / 60 * 100))} size={54} stroke={6} label={`${planHours(items)}`} sub="学时" /></div></div><div className="text-[11px] text-slate-500 mt-2">{short(p.unit)} · {p.team.replace(/^.*· /, '')} · {items.length} 项条目 · 预算 {Math.round(items.reduce((s, i) => s + i.cost, 0)).toLocaleString()} 元</div></div>
        <Panel title="能力雷达与缺口"><div className="p-2 flex justify-center"><Radar data={p.abilities.map(a => ({ k: a.k, v: a.v, need: a.need }))} size={230} /></div></Panel>
        <Panel title="来源构成" className="flex-1"><div className="p-3"><Columns h={90} data={src} /></div></Panel>
      </div>
      <Panel title="条目与生成依据" bodyClass="overflow-auto scroll" extra={<span className="text-[10.5px] text-slate-500">得分 = 来源权重 × 匹配度</span>}>
        <div className="p-2 space-y-1.5">{items.map(i => <div key={i.id} className="hairline px-3 py-2"><div className="flex items-center gap-2 text-[12px]"><KindTag k={i.kind} /><span className="font-medium truncate flex-1">{i.n}</span><span className="num text-[10.5px] text-slate-500">{i.m} 月 · {i.h} 学时</span><StTag s={i.st} /></div><div className="flex items-center gap-2 mt-1.5"><span className="tag">{i.src}</span><span className="text-[11px] text-slate-600 flex-1">{i.reason}</span><div className="w-[90px] h-[6px] bg-slate-100 rounded overflow-hidden"><div className="h-full bar-grow" style={{ width: `${i.score}%`, background: 'var(--ai)' }} /></div><span className="num text-[11px] w-[28px] text-right">{i.score}</span></div></div>)}</div>
      </Panel>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="AI 判读" extra={<span className="ai-badge">逐人</span>}><div className="p-3"><div className="ai-out text-[12px]"><Typewriter text={`${p.name}的计划以能力缺口为主（${src[0].v} 项），预计完成后 ${p.abilities.filter(a => a.v < a.need).length} 项缺口可补齐 ${Math.min(p.abilities.filter(a => a.v < a.need).length, Math.round(src[0].v / 2))} 项，${p.nextGrade}申报时间可提前到明年 ${3 + (p.id.length % 6)} 月。${planHours(items) > 60 ? '学时超出上限，建议把个人意向条目移到下一年度。' : '学时在上限内，第四季度安排偏重，建议把一门课程提前到本月。'}`} speed={7} /></div>
          <div className="mt-2 space-y-1.5"><button className="act-btn" onClick={() => { toast('已采纳并写入 IDP'); push({ v: 'idp', id: p.id, unit: p.unit, team: p.team }) }}><span className="ic">采</span>采纳并写入 IDP<small>IDP 联动视图</small></button><button className="act-btn gold" onClick={() => toast('已把个人意向条目移至下一年度')}><span className="ic">调</span>调整学时<small>压缩至 60 以内</small></button><button className="act-btn" onClick={() => jump('map', 'person', { v: 'person', id: p.id, unit: p.unit, team: p.team })}><span className="ic">图</span>查看成长地图<small>能力与证据</small></button></div></div></Panel>
        <Panel title="学时按季度" className="flex-1"><div className="p-3"><Bars data={[1, 2, 3, 4].map(q => ({ label: `Q${q}`, v: items.filter(i => i.q === q).reduce((s, i) => s + i.h, 0), note: items.filter(i => i.q === q).reduce((s, i) => s + i.h, 0) > 21 ? '偏重' : undefined }))} unit=" 学时" max={30} /></div></Panel>
      </div>
    </div>
  )
}
