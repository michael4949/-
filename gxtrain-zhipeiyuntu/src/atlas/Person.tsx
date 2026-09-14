/* 个人成长地图（一级）→ 能力项 / 对比 / 晋级模拟（二级）→ 证据记录（三级） */
import { useMemo, useState } from 'react'
import { Panel, Radar, Progress, Bars } from '../ui'
import { LineChart, Ring, Columns } from '../charts'
import { MAIN_PERSON, personById, teamPersons, GRADE_LINE } from './data'
import type { Person, Ability } from './data'
import { useNav, Typewriter, Delta, Field } from './nav'

const resolve = (id?: string, unit?: string, team?: string): Person => (id ? personById(id, unit, team) : undefined) ?? MAIN_PERSON
const score = (p: Person) => Math.round(p.abilities.reduce((s, a) => s + a.v * a.w, 0) / 100)

export function PersonView({ id, unit, team }: { id?: string; unit?: string; team?: string }) {
  const { push, toast, jump } = useNav()
  const p = resolve(id, unit, team)
  const [q, setQ] = useState('')
  const mates = useMemo(() => teamPersons(p.unit, p.team, p.post), [p.unit, p.team, p.post])
  const gaps = p.abilities.filter(a => a.v < a.need).sort((a, b) => (b.need - b.v) - (a.need - a.v))
  const labels = ['10 月', '11 月', '12 月', '1 月', '2 月', '3 月', '4 月', '5 月', '6 月', '7 月', '8 月', '9 月']
  const proj = Array.from({ length: 8 }).map((_, i) => Math.min(100, p.progress + (i + 1) * (100 - p.progress) / Math.max(1, p.eta) * 1.4))
  return (
    <div className="h-full grid grid-cols-[280px_1fr_360px] gap-3 p-3 min-h-0">
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="学员" extra={<input value={q} onChange={e => setQ(e.target.value)} placeholder="搜本班组成员" className="hairline px-2 py-0.5 text-[11px] w-[100px] outline-none" />}>
          <div className="p-3.5">
            <div className="flex items-center gap-3 mb-2"><div className="w-12 h-12 rounded-2xl flex items-center justify-center text-[18px] font-semibold text-white serif" style={{ background: 'linear-gradient(135deg,var(--indigo),var(--ai))' }}>{p.name[0]}</div><div><div className="text-[15px] font-semibold">{p.name}</div><div className="text-[11.5px] text-slate-500">{p.post} · {p.grade}</div></div><div className="ml-auto"><Ring v={p.progress} size={56} stroke={6} sub="" /></div></div>
            <div className="text-[11.5px] text-slate-500">{p.team} · 从业 {p.years} 年 · 师傅 {p.mentor}</div>
            <div className="gold-rule my-2.5" />
            <div className="text-[11px] text-slate-500 mb-1">距 {p.nextGrade} 要求线完成度 <b className="num" style={{ color: 'var(--gold)' }}>{p.progress}%</b> · 预计 {p.eta} 个月</div>
            {q && <div className="mt-2 space-y-0.5">{mates.filter(m => m.name.includes(q)).slice(0, 5).map(m => <button key={m.id} className="w-full text-left text-[12px] px-2 py-1 hover:bg-slate-50 rounded-lg" onClick={() => { push({ v: 'person', id: m.id, unit: m.unit, team: m.team }); setQ('') }}>{m.name} · {m.grade}</button>)}</div>}
          </div>
        </Panel>
        <Panel title="等级路径"><div className="p-3.5">{p.grades.map((g, i) => { const idx = p.grades.indexOf(p.grade); const st = i < idx ? 'done' : i === idx ? 'now' : i === idx + 1 ? 'doing' : 'todo'; return <div key={g} className="flex gap-2.5 pb-3 relative last:pb-0"><div className="shrink-0 relative"><span className="w-4 h-4 block rounded-full" style={{ background: st === 'done' ? 'var(--ok)' : st === 'now' ? 'var(--indigo)' : st === 'doing' ? 'var(--gold)' : '#d5dce6', boxShadow: st === 'doing' ? '0 0 0 4px rgba(216,181,101,.25)' : undefined }} />{i < p.grades.length - 1 && <span className="absolute left-1/2 top-5 bottom-[-4px] w-[1px] -translate-x-1/2" style={{ background: 'var(--line)' }} />}</div><div><div className={`text-[13px] ${st === 'doing' ? 'font-semibold' : ''}`} style={st === 'todo' ? { color: '#94a3b8' } : {}}>{g}<span className="text-[10.5px] text-slate-400 ml-2">要求线 {GRADE_LINE[g]}</span></div><div className="text-[11px] text-slate-500">{st === 'done' ? `已认定 · ${2026 - (idx - i) * 2}` : st === 'now' ? '当前等级' : st === 'doing' ? `目标 ${2026 + Math.ceil(p.eta / 12)} · 预计 ${p.eta} 个月` : '—'}</div></div></div> })}</div></Panel>
        <Panel title="学习履历" className="flex-1" bodyClass="overflow-auto scroll"><div className="p-2 space-y-1">{p.records.map((r, i) => <button key={i} onClick={() => push({ v: 'evidence', p: p.id, idx: i, unit: p.unit, team: p.team })} className="a-card w-full text-left"><div className="flex items-center gap-1.5"><span className="tag">{r.k}</span><span className="num text-[10.5px] text-slate-400 ml-auto">{r.t}</span></div><div className="text-[11.5px] leading-snug mt-0.5">{r.n}</div><div className="flex items-center gap-2 text-[10.5px] mt-0.5"><span style={{ color: r.ok ? 'var(--ok)' : 'var(--bad)' }}>{r.r}</span><span className="ml-auto"><Delta v={r.delta} /></span><span className="text-slate-400">{r.ability}</span></div><span className="go">›</span></button>)}</div></Panel>
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="岗位能力雷达" extra={<span className="flex items-center gap-3 text-[11px] text-slate-500"><span className="flex items-center gap-1"><span className="w-3 h-[2px]" style={{ background: 'var(--indigo-2)' }} />当前</span><span className="flex items-center gap-1"><span className="w-3 h-[2px]" style={{ background: 'var(--gold)' }} />{p.nextGrade}要求线</span><button className="btn btn-sm" onClick={() => push({ v: 'compare', p: p.id, unit: p.unit, team: p.team })}>对比 ›</button></span>}>
          <div className="p-3 grid grid-cols-[300px_1fr] gap-3 items-center">
            <Radar data={p.abilities.map(a => ({ k: a.k, v: a.v, need: a.need }))} size={290} />
            <div className="grid grid-cols-2 gap-2">{p.abilities.map(a => <button key={a.k} onClick={() => push({ v: 'ability', p: p.id, k: a.k, unit: p.unit, team: p.team })} className="hairline p-2 text-left hover:border-[var(--ai)]"><div className="flex items-center justify-between mb-1"><span className="text-[11.5px]">{a.k}</span><span className="num text-[12.5px] font-semibold" style={{ color: a.v >= a.need ? 'var(--ok)' : 'var(--bad)' }}>{a.v}</span></div><Progress v={a.v} color={a.v >= a.need ? 'var(--ok)' : 'var(--bad)'} /><div className="flex items-center justify-between text-[10.5px] text-slate-400 mt-1"><span>要求 {a.need}{a.v < a.need && <span style={{ color: 'var(--bad)' }}> · 差 {a.need - a.v}</span>}</span><Delta v={a.v - a.prev} /></div></button>)}</div>
          </div>
        </Panel>
        <Panel title="综合得分走势　12 个月" className="flex-1" extra={<span className="num text-[11px] text-slate-500">当前 {score(p)}</span>}>
          <div className="px-3 pt-2"><LineChart labels={labels} h={150} series={[{ name: '综合得分', color: '#1e3a6e', area: true, data: Array.from({ length: 12 }).map((_, m) => Math.round(p.abilities.reduce((s, a) => s + a.history[m] * a.w, 0) / 100)) }, { name: '要求线', color: '#b08a3e', dash: true, data: Array(12).fill(GRADE_LINE[p.nextGrade]) }]} /></div>
        </Panel>
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="AI 成长助手" extra={<span className="ai-badge">预测</span>}>
          <div className="p-3">
            <div className="ai-out text-[12px]"><Typewriter text={`${p.name}距${p.nextGrade}要求线还差 ${gaps.length} 项：${gaps.map(g => `${g.k}（差 ${g.need - g.v}）`).join('、')}。按近 3 个月的提升速度，预计 ${p.eta} 个月达标；若把${gaps[0]?.k ?? '薄弱项'}的陪练频次提高到每月 2 场，可提前 ${Math.max(1, Math.round(p.eta * .3))} 个月。`} speed={7} /></div>
            <div className="mt-2"><Columns h={90} data={proj.map((v, i) => ({ label: `+${i + 1}月`, v: Math.round(v), color: v >= 100 ? 'var(--ok)' : undefined }))} unit="%" max={110} /></div>
            <div className="flex gap-2 mt-2"><button className="btn btn-sm btn-primary flex-1" onClick={() => push({ v: 'pathSim', p: p.id, unit: p.unit, team: p.team })}>晋级模拟 ›</button><button className="btn btn-sm flex-1" onClick={() => { toast('已生成年度学习计划并写入 IDP'); jump('plan', 'idp') }}>生成计划</button></div>
          </div>
        </Panel>
        <Panel title="缺口与补齐路径" className="flex-1" bodyClass="overflow-auto scroll">
          <div className="p-2 space-y-1.5">
            {gaps.map((g, i) => <button key={g.k} onClick={() => push({ v: 'ability', p: p.id, k: g.k, unit: p.unit, team: p.team })} className="a-card w-full text-left"><div className="flex items-center gap-2"><span className={`tag ${i === 0 ? 'tag-bad' : i === 1 ? 'tag-warn' : ''}`}>{i === 0 ? '高优先' : i === 1 ? '中优先' : '低优先'}</span><span className="text-[12.5px] font-medium">{g.k}</span><span className="ml-auto num text-[12px]" style={{ color: 'var(--bad)' }}>差 {g.need - g.v}</span></div><div className="text-[11px] text-slate-500 mt-1">课程 · 陪练 · 带教三条路径，点开查看证据与方案</div><span className="go">›</span></button>)}
            {gaps.length === 0 && <div className="text-[12px] p-3" style={{ color: 'var(--ok)' }}>✓ 全部能力项已达要求线，可申报 {p.nextGrade}</div>}
          </div>
        </Panel>
        <Panel title="班组对照"><div className="p-3"><Bars data={[{ label: '本人', v: score(p), note: '' }, { label: '班组均值', v: Math.round(mates.reduce((s, m) => s + score(m), 0) / mates.length) }, { label: '同岗位 Top 10%', v: 89 }]} max={100} /></div></Panel>
      </div>
    </div>
  )
}

/* ---------- 二级：能力项 ---------- */
export function AbilityView({ p: pid, k, unit, team }: { p: string; k: string; unit?: string; team?: string }) {
  const { push, toast, jump } = useNav()
  const p = resolve(pid, unit, team)
  const a: Ability = p.abilities.find(x => x.k === k) ?? p.abilities[0]
  const mates = teamPersons(p.unit, p.team, p.post)
  const labels = ['10 月', '11 月', '12 月', '1 月', '2 月', '3 月', '4 月', '5 月', '6 月', '7 月', '8 月', '9 月']
  const ev = p.records.filter(r => r.ability === a.k)
  const bins = ['< 60', '60–70', '70–80', '80–90', '≥ 90'].map((b, i) => ({ label: b, v: mates.filter(m => { const v = m.abilities.find(x => x.k === a.k)?.v ?? 0; return i === 0 ? v < 60 : i === 4 ? v >= 90 : v >= 50 + i * 10 && v < 60 + i * 10 }).length, color: (a.v < 60 && i === 0) || (a.v >= 90 && i === 4) || (a.v >= 50 + i * 10 && a.v < 60 + i * 10) ? 'var(--gold)' : undefined }))
  return (
    <div className="h-full grid grid-cols-[1fr_1fr_320px] gap-3 p-3 min-h-0">
      <div className="flex flex-col gap-3 min-h-0">
        <div className="panel p-4 shrink-0"><div className="flex items-center gap-2"><span className="tag">{p.name} · {p.post}</span><span className="tag tag-gold">权重 {a.w}%</span><span className="ml-auto text-[11px] text-slate-500">要求线 {a.need} · 当前 <b className="num" style={{ color: a.v >= a.need ? 'var(--ok)' : 'var(--bad)' }}>{a.v}</b> · 环比 <Delta v={a.v - a.prev} /></span></div><div className="text-[18px] font-semibold serif mt-1">{a.k}</div></div>
        <Panel title="得分走势　12 个月" className="flex-1"><div className="px-3 pt-2"><LineChart labels={labels} h={200} series={[{ name: a.k, color: '#2f6df6', area: true, data: a.history }, { name: '要求线', color: '#b08a3e', dash: true, data: Array(12).fill(a.need) }, { name: '班组均值', color: '#94a3b8', dash: true, data: Array.from({ length: 12 }).map((_, m) => Math.round(mates.reduce((s, x) => s + (x.abilities.find(y => y.k === a.k)?.history[m] ?? 0), 0) / mates.length)) }]} yMin={40} yMax={100} /></div></Panel>
        <Panel title="同岗位分布　本班组"><div className="p-3"><Columns h={110} data={bins} /><div className="text-[10.5px] text-slate-500 mt-1">金色为本人所在区间</div></div></Panel>
      </div>
      <Panel title={`证据记录　${ev.length} 条`} bodyClass="overflow-auto scroll" extra={<span className="text-[10.5px] text-slate-500">点击进入三级</span>}>
        <div className="p-2 space-y-1.5">{ev.length ? ev.map(r => <button key={r.t} onClick={() => push({ v: 'evidence', p: p.id, idx: p.records.indexOf(r), unit: p.unit, team: p.team })} className="a-card w-full text-left"><div className="flex items-center gap-1.5"><span className="tag">{r.k}</span><span className="num text-[10.5px] text-slate-400 ml-auto">{r.t}</span></div><div className="text-[12.5px] mt-1">{r.n}</div><div className="flex items-center gap-2 text-[11px] mt-0.5"><span style={{ color: r.ok ? 'var(--ok)' : 'var(--bad)' }}>{r.r}</span><span className="ml-auto"><Delta v={r.delta} /></span></div><span className="go">›</span></button>) : <div className="text-[12px] text-slate-400 p-3">近 12 个月无直接证据，得分来自上一次认定与关联能力推算。建议安排一次陪练或考试形成证据。</div>}
          <div className="hair-t pt-2 mt-2 px-1 text-[11px] text-slate-500">评价方式：陪练得分 40% · 考试 30% · 课程完成 15% · 带教评价 15%</div></div>
      </Panel>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="AI 补齐方案" extra={<span className="ai-badge">推荐</span>}>
          <div className="p-3"><div className="ai-out text-[12px]"><Typewriter text={a.v >= a.need ? `${a.k}已达要求线 ${a.need}，近 3 个月${a.v - a.prev >= 0 ? '稳中有升' : '略有回落'}。建议每季度保持 1 场陪练维持水平，并作为班组带教的示范项。` : `${a.k}差 ${a.need - a.v} 分。失分集中在${ev.find(r => !r.ok)?.n ?? '最近一次考核的关键判断项'}。建议先完成 1 门 ${a.k}课程（4 学时），再安排 2 场专项陪练；按班组同类案例，${Math.round((a.need - a.v) * 1.1 + 4)} 周内可达标。`} speed={7} /></div>
            <div className="mt-2 space-y-1.5">
              <button className="act-btn" onClick={() => { toast('已安排专项陪练'); jump('coach', 'plaza') }}><span className="ic">练</span>安排专项陪练<small>陪练中心</small></button>
              <button className="act-btn gold" onClick={() => { toast('已报名相关课程'); jump('factory', 'lib') }}><span className="ic">课</span>报名相关课程<small>课程库</small></button>
              <button className="act-btn" onClick={() => toast(`已向 ${p.mentor} 发起带教请求`)}><span className="ic">带</span>请师傅带教<small>{p.mentor}</small></button>
              <button className="act-btn gold" onClick={() => { toast('已写入个人学习计划'); jump('plan', 'idp') }}><span className="ic">划</span>写入学习计划<small>千人千面</small></button>
            </div>
          </div>
        </Panel>
        <Panel title="关联资源" className="flex-1"><div className="p-3 text-[12px] space-y-1.5"><Field k="规程与条目" v={<button className="underline text-[var(--indigo)]" onClick={() => jump('hub', 'search', { v: 'search', q: a.k })}>中枢检索「{a.k}」›</button>} /><div className="flex justify-between"><span className="text-slate-500">关联课程</span><span className="num">{3 + (a.k.length % 5)} 门</span></div><div className="flex justify-between"><span className="text-slate-500">陪练科目</span><span className="num">{1 + (a.k.length % 3)} 个</span></div><div className="flex justify-between"><span className="text-slate-500">题目</span><span className="num">{40 + (a.k.length * 17) % 120} 道</span></div></div></Panel>
      </div>
    </div>
  )
}

/* ---------- 二级：对比 ---------- */
export function CompareView({ p: pid, unit, team }: { p: string; unit?: string; team?: string }) {
  const { push } = useNav()
  const p = resolve(pid, unit, team)
  const mates = teamPersons(p.unit, p.team, p.post)
  const [vs, setVs] = useState<'team' | 'top' | 'peer'>('team')
  const top = [...mates].sort((a, b) => score(b) - score(a))[0]
  const peer = mates.find(m => m.id !== p.id && m.grade === p.grade) ?? mates[1]
  const ref = vs === 'team' ? p.abilities.map(a => Math.round(mates.reduce((s, m) => s + (m.abilities.find(x => x.k === a.k)?.v ?? 0), 0) / mates.length)) : vs === 'top' ? p.abilities.map(a => top.abilities.find(x => x.k === a.k)?.v ?? 0) : p.abilities.map(a => peer.abilities.find(x => x.k === a.k)?.v ?? 0)
  const name = vs === 'team' ? '班组均值' : vs === 'top' ? `班组第一 · ${top.name}` : `同等级 · ${peer.name}`
  return (
    <div className="h-full grid grid-cols-[1fr_1fr_300px] gap-3 p-3 min-h-0">
      <Panel title={`${p.name} vs ${name}`} extra={<div className="seg"><button className={vs === 'team' ? 'on' : ''} onClick={() => setVs('team')}>班组均值</button><button className={vs === 'top' ? 'on' : ''} onClick={() => setVs('top')}>班组第一</button><button className={vs === 'peer' ? 'on' : ''} onClick={() => setVs('peer')}>同等级</button></div>}>
        <div className="p-3 flex flex-col items-center"><Radar data={p.abilities.map((a, i) => ({ k: a.k, v: a.v, need: ref[i] }))} size={320} /><div className="flex gap-4 text-[11px] text-slate-500"><span className="flex items-center gap-1"><span className="w-3 h-[2px]" style={{ background: 'var(--indigo-2)' }} />{p.name}</span><span className="flex items-center gap-1"><span className="w-3 h-[2px]" style={{ background: 'var(--gold)' }} />{name}</span></div></div>
      </Panel>
      <Panel title="逐项差距" bodyClass="overflow-auto scroll"><div className="p-3"><Bars data={p.abilities.map((a, i) => ({ label: a.k, v: a.v - ref[i], note: a.v - ref[i] < 0 ? '落后' : undefined }))} max={30} /><div className="text-[11.5px] text-slate-500 mt-3 hair-t pt-2">正值为领先，负值为落后（分）。</div><table className="grid mt-3"><thead><tr><th>能力项</th><th>本人</th><th>{name}</th><th>差距</th></tr></thead><tbody>{p.abilities.map((a, i) => <tr key={a.k} className="cursor-pointer" onClick={() => push({ v: 'ability', p: p.id, k: a.k, unit: p.unit, team: p.team })}><td>{a.k}</td><td className="num">{a.v}</td><td className="num">{ref[i]}</td><td><Delta v={a.v - ref[i]} /></td></tr>)}</tbody></table></div></Panel>
      <Panel title="AI 判读"><div className="p-3"><div className="ai-out text-[12px]"><Typewriter text={`与${name}相比，${p.name}在${p.abilities.filter((a, i) => a.v - ref[i] > 3).map(a => a.k).join('、') || '各项'}上领先，在${p.abilities.filter((a, i) => a.v - ref[i] < -3).map(a => a.k).join('、') || '无明显项'}上落后。${vs === 'top' ? `向${top.name}学习的重点是其陪练频次（每月 ${2 + (top.name.length % 2)} 场）。` : '建议把落后项纳入下季度计划，并与领先者结对。'}`} speed={7} /></div></div></Panel>
    </div>
  )
}

/* ---------- 二级：晋级模拟 ---------- */
export function PathSim({ p: pid, unit, team }: { p: string; unit?: string; team?: string }) {
  const { toast, jump } = useNav()
  const p = resolve(pid, unit, team)
  const gaps = p.abilities.filter(a => a.v < a.need)
  const options = gaps.flatMap(g => [{ id: `${g.k}-c`, k: g.k, kind: '课程', n: `${g.k}专题课`, h: 4, gain: 4 + (g.k.length % 3) }, { id: `${g.k}-p`, k: g.k, kind: '陪练', n: `${g.k} · 专项陪练 ×2`, h: 2, gain: 5 + (g.k.length % 4) }, { id: `${g.k}-m`, k: g.k, kind: '带教', n: `${p.mentor} 带教 4 周`, h: 8, gain: 3 }])
  const [on, setOn] = useState<string[]>(options.filter(o => o.kind === '陪练').map(o => o.id))
  const sim = p.abilities.map(a => ({ k: a.k, v: Math.min(100, a.v + options.filter(o => on.includes(o.id) && o.k === a.k).reduce((s, o) => s + o.gain, 0)), need: a.need }))
  const left = sim.filter(a => a.v < a.need).length
  const hours = options.filter(o => on.includes(o.id)).reduce((s, o) => s + o.h, 0)
  const eta = Math.max(1, Math.round(p.eta - options.filter(o => on.includes(o.id)).length * 1.6))
  return (
    <div className="h-full grid grid-cols-[360px_1fr_300px] gap-3 p-3 min-h-0">
      <Panel title="选择学习项" bodyClass="overflow-auto scroll" extra={<span className="text-[10.5px] text-slate-500">勾选后右侧实时重算</span>}>
        <div className="p-2 space-y-1.5">{gaps.map(g => <div key={g.k}><div className="text-[11px] text-slate-500 px-1 pt-1">{g.k} · 差 {g.need - g.v}</div>{options.filter(o => o.k === g.k).map(o => <label key={o.id} className={`mat ${on.includes(o.id) ? 'on' : ''}`}><input type="checkbox" checked={on.includes(o.id)} onChange={() => setOn(s => s.includes(o.id) ? s.filter(x => x !== o.id) : [...s, o.id])} className="accent-[var(--ai)] mt-[3px]" /><div className="flex-1"><div className="flex items-center gap-2 text-[12px]"><span className="tag">{o.kind}</span>{o.n}</div><div className="text-[10.5px] text-slate-500 mt-0.5">{o.h} 学时 · 预计 +{o.gain} 分</div></div></label>)}</div>)}</div>
      </Panel>
      <Panel title="模拟后雷达" extra={<span className="flex items-center gap-3 text-[11px] text-slate-500"><span className="flex items-center gap-1"><span className="w-3 h-[2px]" style={{ background: 'var(--indigo-2)' }} />模拟后</span><span className="flex items-center gap-1"><span className="w-3 h-[2px]" style={{ background: 'var(--gold)' }} />要求线</span></span>}>
        <div className="p-3 flex flex-col items-center"><Radar data={sim} size={320} /><div className="grid grid-cols-3 gap-2 w-full mt-2">{[['仍未达标', `${left} 项`], ['所需学时', `${hours} 学时`], ['预计达标', `${eta} 个月`]].map(([k, v], i) => <div key={k} className="hairline py-2 text-center"><div className={`num text-[19px] font-semibold ${i === 2 ? 'gold-grad' : 'num-grad'}`}>{v}</div><div className="text-[10.5px] text-slate-500">{k}</div></div>)}</div></div>
      </Panel>
      <div className="flex flex-col gap-3"><Panel title="AI 建议"><div className="p-3"><div className="ai-out text-[12px]"><Typewriter text={left === 0 ? `按当前勾选，${p.name}全部能力项可在 ${eta} 个月内达到${p.nextGrade}要求线，合计 ${hours} 学时；建议把陪练排在课程之后 2 周内，巩固效果最好。` : `仍有 ${left} 项未达标：${sim.filter(a => a.v < a.need).map(a => a.k).join('、')}。建议补选对应的陪练项，收益最高。`} speed={7} /></div><button className="btn btn-primary w-full mt-3" onClick={() => { toast('已生成学习计划并写入 IDP'); jump('plan', 'idp') }}>生成为学习计划</button></div></Panel></div>
    </div>
  )
}

/* ---------- 三级：证据记录 ---------- */
export function EvidenceView({ p: pid, idx, unit, team }: { p: string; idx: number; unit?: string; team?: string }) {
  const { jump, toast } = useNav()
  const p = resolve(pid, unit, team)
  const r = p.records[idx] ?? p.records[0]
  const a = p.abilities.find(x => x.k === r.ability)
  const steps = r.k === '陪练' ? ['接令与拟票', '上岗前准备', '五防模拟', '执行', '检查回报'] : r.k === '考试' ? ['单选', '多选', '判断', '情景'] : ['学习', '章节测验', '结业考核']
  const scores = steps.map((_, i) => Math.round(60 + ((idx + 1) * (i + 3) * 17) % 40))
  return (
    <div className="h-full grid grid-cols-[1fr_1fr_300px] gap-3 p-3 min-h-0">
      <Panel title={`${r.k} · ${r.n}`} extra={<span className="num text-[11px] text-slate-500">{r.t}</span>}>
        <div className="p-4"><div className="text-[24px] font-semibold num-grad">{r.r}</div><div className="text-[12px] text-slate-500 mt-1">对 {r.ability} 的影响 <Delta v={r.delta} /> 分{a && ` · 当前 ${a.v} / 要求 ${a.need}`}</div>
          <div className="mt-4"><Columns h={130} data={steps.map((s, i) => ({ label: s, v: scores[i], color: scores[i] < 70 ? 'var(--bad)' : undefined }))} max={100} /></div>
          <div className="text-[11px] text-slate-500 mt-2">红色为失分环节</div></div>
      </Panel>
      <Panel title="失分与要点" bodyClass="overflow-auto scroll"><div className="p-3 space-y-2">{steps.map((s, i) => <div key={s} className={`hairline px-3 py-2 ${scores[i] < 70 ? 'border-[rgba(194,64,47,.4)]' : ''}`}><div className="flex items-center gap-2 text-[12px]"><span className="font-medium">{s}</span><span className="ml-auto num" style={{ color: scores[i] < 70 ? 'var(--bad)' : 'var(--ok)' }}>{scores[i]}</span></div>{scores[i] < 70 && <div className="text-[11px] text-slate-600 mt-1">{r.k === '陪练' ? '关键项核对漏一项，扣 10 分；教练已推送知识点卡。' : '两道情景题误选"凭经验处理"，对应条款已挂接。'}</div>}</div>)}</div></Panel>
      <div className="flex flex-col gap-3"><Panel title="打开来源"><div className="p-3 space-y-2">{r.k === '陪练' && <button className="btn btn-primary w-full" onClick={() => jump('coach', 'review')}>查看评分复盘</button>}{r.k === '课程' && <button className="btn btn-primary w-full" onClick={() => jump('factory', 'lib', r.id ? { v: 'course', id: r.id } : undefined)}>打开课程</button>}{r.k === '考试' && <button className="btn btn-primary w-full" onClick={() => jump('factory', 'bank')}>查看试卷与错题</button>}<button className="btn w-full" onClick={() => toast('已把失分点推送为班前会知识卡')}>推送为知识卡</button></div></Panel><Panel title="AI 判读" className="flex-1"><div className="p-3"><div className="ai-out text-[12px]"><Typewriter text={r.ok ? `本次${r.k}通过，${r.ability}提升 ${r.delta} 分。失分环节集中在${steps[scores.indexOf(Math.min(...scores))]}，建议下次陪练重点练习。` : `本次${r.k}未通过，${r.ability}回落 ${Math.abs(r.delta)} 分。失分环节为${steps.filter((_, i) => scores[i] < 70).join('、')}，已自动追加一次重练任务。`} speed={7} /></div></div></Panel></div>
    </div>
  )
}
