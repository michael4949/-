/* IDP 联动视图（一级）→ 计划条目（二级）→ 完成证据（三级） */
import { useMemo, useState } from 'react'
import { Panel, Donut } from '../ui'
import { Gantt, Columns, Ring } from '../charts'
import { MAIN_PERSON, personPlan, planHours, planDone, KIND_COLOR, KINDS, MONTHS, NOW_M, short, personById } from './data'
import type { PlanItem } from './data'
import { teamPersons, postOfTeam } from '../atlas/data'
import type { Person } from '../atlas/data'
import { useNav, Typewriter, Field, KindTag, StTag, Delta } from './nav'

const resolve = (id?: string, unit?: string, team?: string): Person => (id ? personById(id, unit, team) : undefined) ?? MAIN_PERSON

export function IdpView({ id, unit, team }: { id?: string; unit?: string; team?: string }) {
  const { push, toast, jump } = useNav()
  const p = resolve(id, unit, team)
  const items = useMemo(() => personPlan(p), [p])
  const [q, setQ] = useState('')
  const mates = useMemo(() => teamPersons(p.unit, p.team, postOfTeam(p.team)), [p.unit, p.team])
  const doneH = items.filter(i => i.st === '已完成').reduce((s, i) => s + i.h, 0)
  const late = items.filter(i => i.st === '逾期' || i.st.startsWith('未通过'))
  const rows = KINDS.filter(k => items.some(i => i.kind === k)).map(k => ({ name: k, sub: `${items.filter(i => i.kind === k).length} 项`, spans: items.filter(i => i.kind === k).map(i => ({ from: i.m - 1, to: i.m, color: KIND_COLOR[k], label: i.n, st: i.st })) }))
  const monthH = MONTHS.map((_, m) => ({ label: MONTHS[m], v: items.filter(i => i.m === m + 1).reduce((s, i) => s + i.h, 0), color: m + 1 === NOW_M ? 'var(--gold)' : undefined }))
  const srcMix = ['能力缺口', '岗位与等级', '单位重点', '个人意向'].map((k, i) => ({ k, n: items.filter(x => x.src === k).length, c: ['#1e3a6e', '#2f6df6', '#b08a3e', '#19b8d8'][i] })).filter(x => x.n)
  return (
    <div className="h-full grid grid-cols-[290px_1fr_340px] gap-3 p-3 min-h-0">
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="学员" extra={<input value={q} onChange={e => setQ(e.target.value)} placeholder="搜本班组成员" className="hairline px-2 py-0.5 text-[11px] w-[100px] outline-none" />}>
          <div className="p-3.5"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-2xl flex items-center justify-center text-[18px] text-white serif" style={{ background: 'linear-gradient(135deg,var(--gold),var(--gold-2))' }}>{p.name[0]}</div><div className="min-w-0"><div className="text-[15px] font-semibold">{p.name}</div><div className="text-[11px] text-slate-500">{p.post} · {p.grade}</div></div><div className="ml-auto"><Ring v={planDone(items)} size={56} stroke={6} /></div></div><div className="text-[11px] text-slate-500 mt-1.5">{short(p.unit)} · {p.team.replace(/^.*· /, '')}</div><div className="gold-rule my-2.5" /><div className="grid grid-cols-3 gap-1.5 text-center">{[['条目', `${items.length}`], ['学时', `${doneH}/${planHours(items)}`], ['逾期', `${late.length}`]].map(([k, v], i) => <div key={k} className="hairline py-1.5"><div className={`num text-[14px] font-semibold ${i === 2 && late.length ? 'text-[var(--bad)]' : 'num-grad'}`}>{v}</div><div className="text-[9.5px] text-slate-500">{k}</div></div>)}</div>
            {q && <div className="mt-2 space-y-0.5">{mates.filter(m => m.name.includes(q)).slice(0, 5).map(m => <button key={m.id} className="w-full text-left text-[12px] px-2 py-1 hover:bg-slate-50 rounded-lg" onClick={() => { push({ v: 'idp', id: m.id, unit: m.unit, team: m.team }); setQ('') }}>{m.name} · {m.grade}</button>)}</div>}</div>
        </Panel>
        <Panel title="计划来源"><div className="p-2 flex items-center gap-3"><Donut data={srcMix} size={104} label="条目" center={`${items.length}`} /><div className="flex-1 space-y-1">{srcMix.map(d => <div key={d.k} className="flex items-center gap-2 text-[11px]"><span className="w-2 h-2 rounded-sm" style={{ background: d.c }} /><span className="text-slate-600">{d.k}</span><span className="ml-auto num">{d.n}</span></div>)}</div></div></Panel>
        <Panel title="发展目标" className="flex-1"><div className="p-3 text-[12px] space-y-1"><Field k="目标等级" v={`${p.nextGrade} · 预计 ${p.eta} 个月`} /><Field k="缺口能力项" v={p.abilities.filter(a => a.v < a.need).map(a => a.k).join('、') || '已全部达标'} /><Field k="师傅" v={p.mentor ?? '—'} /><button className="btn btn-sm w-full mt-1" onClick={() => jump('map', 'person', { v: 'person', id: p.id, unit: p.unit, team: p.team })}>查看成长地图 ›</button></div></Panel>
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="12 个月计划排布" extra={<span className="text-[10.5px] text-slate-500">金线为本月</span>}><div className="p-3"><Gantt rows={rows} cols={12} colLabel={i => MONTHS[i]} now={NOW_M - .5} onSpan={(r, i) => { const it = items.filter(x => x.kind === r.name)[i]; if (it) push({ v: 'idpItem', pid: p.id, id: it.id, unit: p.unit, team: p.team }) }} /></div></Panel>
        <Panel title="按季度" className="flex-1" bodyClass="overflow-auto scroll"><div className="p-3 grid grid-cols-4 gap-2">{[1, 2, 3, 4].map(qq => <div key={qq}><div className="flex items-center gap-1.5 mb-1.5"><span className="num text-[12px] font-semibold" style={{ color: 'var(--indigo)' }}>Q{qq}</span><span className="text-[10.5px] text-slate-500">{items.filter(i => i.q === qq).reduce((s, i) => s + i.h, 0)} 学时</span></div><div className="space-y-1">{items.filter(i => i.q === qq).map(i => <button key={i.id} onClick={() => push({ v: 'idpItem', pid: p.id, id: i.id, unit: p.unit, team: p.team })} className="a-card w-full text-left"><div className="flex items-center gap-1.5"><KindTag k={i.kind} /><span className="num text-[10px] text-slate-400 ml-auto">{i.m} 月</span></div><div className="text-[11.5px] leading-snug mt-0.5 line-clamp-2">{i.n}</div><div className="mt-1"><StTag s={i.st} /></div><span className="go">›</span></button>)}</div></div>)}</div></Panel>
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="AI 计划助手" extra={<span className="ai-badge">滚动调整</span>}><div className="p-3"><div className="ai-out text-[12px]"><Typewriter text={`${p.name}本年计划 ${items.length} 项、${planHours(items)} 学时，已完成 ${planDone(items)}%。${late.length ? `${late.map(i => i.n).slice(0, 2).join('、')}${late.length > 2 ? ' 等' : ''}逾期或未通过，建议本月安排重练并顺延后续条目 2 周；` : '无逾期条目；'}第四季度 ${items.filter(i => i.q === 4).reduce((s, i) => s + i.h, 0)} 学时${items.filter(i => i.q === 4).reduce((s, i) => s + i.h, 0) > 21 ? '偏重，建议把一门课程提前' : '安排合理'}。`} speed={7} /></div>
          <div className="mt-2 space-y-1.5"><button className="act-btn" onClick={() => toast('已按建议调整并同步 IDP')}><span className="ic">调</span>一键采纳调整<small>顺延 + 提前</small></button><button className="act-btn gold" onClick={() => toast('已同步到公司 IDP 系统')}><span className="ic">同</span>同步到 IDP 系统<small>人力资源部</small></button><button className="act-btn" onClick={() => { toast('已生成下一季度计划草案'); }}><span className="ic">生</span>生成下季度计划<small>滚动</small></button></div></div></Panel>
        <Panel title="月学时分布" className="flex-1"><div className="p-3"><Columns h={110} data={monthH} max={24} /><div className="text-[10.5px] text-slate-500 mt-1">金色为本月 · 上限每月 12 学时</div></div></Panel>
      </div>
    </div>
  )
}

/* ---------- 二级：计划条目 ---------- */
export function IdpItem({ pid, id, unit, team }: { pid: string; id: string; unit?: string; team?: string }) {
  const { push, toast, jump } = useNav()
  const p = resolve(pid, unit, team)
  const items = personPlan(p)
  const it: PlanItem = items.find(x => x.id === id) ?? items[0]
  const a = p.abilities.find(x => x.k === it.ability)
  const before = items.filter(x => x.m < it.m).slice(-2), after = items.filter(x => x.m > it.m).slice(0, 2)
  return (
    <div className="h-full grid grid-cols-[1fr_1fr_320px] gap-3 p-3 min-h-0">
      <div className="flex flex-col gap-3 min-h-0">
        <div className="panel p-4 shrink-0"><div className="flex items-center gap-2"><KindTag k={it.kind} /><StTag s={it.st} /><span className="ml-auto num text-[11px] text-slate-500">{it.m} 月 · Q{it.q} · {it.h} 学时</span></div><div className="text-[17px] font-semibold serif mt-1 leading-snug">{it.n}</div><div className="text-[11.5px] text-slate-500 mt-1">{p.name} · {p.post} · 预算 {Math.round(it.cost)} 元</div></div>
        <Panel title="生成依据" className="flex-1"><div className="p-3 text-[12px]"><Field k="来源" v={<span className="tag">{it.src}</span>} /><Field k="对应能力项" v={a ? `${it.ability} · 当前 ${a.v} / 要求 ${a.need}${a.v < a.need ? `（差 ${a.need - a.v}）` : '（已达标）'}` : it.ability} /><Field k="理由" v={it.reason} /><Field k="预期提升" v={it.gain ? `+${it.gain} 分` : '—'} /><div className="flex items-center gap-2 mt-2"><span className="text-[11px] text-slate-500">匹配得分</span><div className="flex-1 h-[7px] bg-slate-100 rounded overflow-hidden"><div className="h-full bar-grow" style={{ width: `${it.score}%`, background: 'var(--ai)' }} /></div><span className="num text-[12px] font-semibold">{it.score}</span></div></div></Panel>
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="前后条目"><div className="p-2 space-y-1">{[...before.map(x => ({ x, t: '前置' })), { x: it, t: '本条' }, ...after.map(x => ({ x, t: '后续' }))].map(({ x, t }) => <button key={x.id} disabled={x.id === it.id} onClick={() => push({ v: 'idpItem', pid: p.id, id: x.id, unit: p.unit, team: p.team })} className={`w-full flex items-center gap-2 text-[12px] px-2 py-1.5 rounded-lg ${x.id === it.id ? 'bg-[var(--indigo-soft)]' : 'hover:bg-slate-50'}`}><span className="tag">{t}</span><KindTag k={x.kind} /><span className="truncate flex-1 text-left">{x.n}</span><span className="num text-slate-500">{x.m} 月</span></button>)}</div></Panel>
        <Panel title="关联资源" className="flex-1"><div className="p-3 space-y-1.5">{it.courseId && <button className="act-btn" onClick={() => jump('factory', 'lib', { v: 'course', id: it.courseId } as never)}><span className="ic">课</span>打开课程<small>课程库</small></button>}{it.coachId && <button className="act-btn gold" onClick={() => jump('coach', 'plaza')}><span className="ic">练</span>进入陪练<small>陪练中心</small></button>}{it.kind === '考试' && <button className="act-btn" onClick={() => jump('factory', 'bank')}><span className="ic">题</span>查看试卷<small>题库工作台</small></button>}{it.kind === '带教' || it.kind === '辅导' ? <button className="act-btn gold" onClick={() => toast(`已提醒 ${p.mentor}`)}><span className="ic">带</span>提醒师傅<small>{p.mentor}</small></button> : null}<button className="act-btn" onClick={() => jump('hub', 'search', { v: 'search', q: it.ability } as never)}><span className="ic">搜</span>相关规程条款<small>知识中枢</small></button></div></Panel>
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="操作" extra={<span className="ai-badge">AI 建议</span>}><div className="p-3"><div className="ai-out text-[12px]"><Typewriter text={it.st === '已完成' ? `本条已完成，${it.ability}提升 ${it.gain} 分。可查看完成证据并回写成长地图。` : it.st.startsWith('未通过') ? `上次未通过，失分集中在关键判断项。建议 2 周内重练一次，重练前先看评分复盘的错误卡。` : it.st === '逾期' ? `已逾期，建议改期到本月最后一周，并把后续条目顺延 2 周。` : `安排在 ${it.m} 月，${it.kind === '陪练' ? '前置课程已完成，可按期进行' : '与本月其他条目合计学时在上限内'}。`} speed={7} /></div>
          <div className="mt-2 space-y-1.5"><button className="act-btn" onClick={() => push({ v: 'idpEvidence', pid: p.id, id: it.id, unit: p.unit, team: p.team })}><span className="ic">证</span>查看完成证据<small>三级</small></button><button className="act-btn gold" onClick={() => toast('已改期并顺延后续条目')}><span className="ic">期</span>改期<small>顺延 2 周</small></button><button className="act-btn" onClick={() => toast('已标记完成，待证据回写')}><span className="ic">完</span>标记完成<small>需上传证据</small></button></div></div></Panel>
      </div>
    </div>
  )
}

/* ---------- 三级：完成证据 ---------- */
export function IdpEvidence({ pid, id, unit, team }: { pid: string; id: string; unit?: string; team?: string }) {
  const { toast, jump } = useNav()
  const p = resolve(pid, unit, team)
  const items = personPlan(p)
  const it = items.find(x => x.id === id) ?? items[0]
  const done = it.st === '已完成', fail = it.st.startsWith('未通过')
  const seed = it.id.length * 7 + it.m
  const parts = it.kind === '陪练' ? ['接令与拟票', '上岗前准备', '五防模拟', '执行', '检查回报'] : it.kind === '考试' || it.kind === '认定' ? ['单选', '多选', '判断', '情景'] : it.kind === '课程' ? ['学习进度', '章节测验', '结业考核'] : ['出勤', '作业', '评价']
  const scores = parts.map((_, i) => done ? 72 + ((seed * (i + 3)) % 26) : fail ? 48 + ((seed * (i + 2)) % 30) : 0)
  const total = done || fail ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
  const rec = p.records.find(r => r.k === (it.kind === '认定' ? '认定' : it.kind === '辅导' || it.kind === '集训' ? '带教' : it.kind as '陪练' | '考试' | '课程'))
  return (
    <div className="h-full grid grid-cols-[1fr_1fr_300px] gap-3 p-3 min-h-0">
      <Panel title={`${it.kind} · ${it.n}`} extra={<StTag s={it.st} />}>
        <div className="p-4">{done || fail ? <><div className="flex items-center gap-4"><Ring v={total} size={84} stroke={8} color={fail ? 'var(--bad)' : 'var(--ok)'} label={`${total}`} sub={fail ? '未通过' : '通过'} /><div className="text-[12px] text-slate-600 leading-relaxed">完成时间 <b className="num">2026-{String(it.m).padStart(2, '0')}-{String(8 + (seed % 18)).padStart(2, '0')}</b><br />对 {it.ability} 的影响 <Delta v={fail ? -2 : it.gain} /> 分<br />证据已回写成长地图</div></div><div className="mt-4"><Columns h={120} data={parts.map((s, i) => ({ label: s, v: scores[i], color: scores[i] < 70 ? 'var(--bad)' : undefined }))} max={100} /></div><div className="text-[11px] text-slate-500 mt-1">红色为失分环节</div></> : <div className="text-[12px] text-slate-500 p-6 text-center">条目尚未完成，完成后证据将从{it.kind === '陪练' ? '陪练舱' : it.kind === '课程' ? '课程学习记录' : '考务系统'}自动回写。</div>}</div>
      </Panel>
      <Panel title="证据来源" bodyClass="overflow-auto scroll"><div className="p-3 space-y-2 text-[12px]">{rec ? <div className="hairline px-3 py-2"><div className="flex items-center gap-2"><span className="tag">{rec.k}</span><span className="font-medium">{rec.n}</span><span className="num text-[10.5px] text-slate-400 ml-auto">{rec.t}</span></div><div className="text-[11px] mt-1" style={{ color: rec.ok ? 'var(--ok)' : 'var(--bad)' }}>{rec.r}</div></div> : <div className="text-slate-400">暂无直接证据</div>}<div className="hair-t pt-2 text-[11px] text-slate-500">评价口径：陪练得分 40% · 考试 30% · 课程完成 15% · 带教评价 15%；证据 12 个月内有效。</div>{(done || fail) && <div className="hairline px-3 py-2"><div className="text-[11px] text-slate-500 mb-1">失分要点</div><div>{parts.filter((_, i) => scores[i] < 70).length ? parts.filter((_, i) => scores[i] < 70).map(s => <div key={s} className="flex gap-2"><span className="w-1.5 h-1.5 mt-[6px] rounded-full shrink-0" style={{ background: 'var(--bad)' }} />{s}：关键项核对不完整，对应条款已挂接</div>) : '各环节均达标'}</div></div>}</div></Panel>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="打开来源"><div className="p-3 space-y-2">{it.kind === '陪练' && <button className="btn btn-primary w-full" onClick={() => jump('coach', 'review')}>查看评分复盘</button>}{it.kind === '课程' && <button className="btn btn-primary w-full" onClick={() => jump('factory', 'lib', it.courseId ? { v: 'course', id: it.courseId } as never : undefined)}>打开课程</button>}{(it.kind === '考试' || it.kind === '认定') && <button className="btn btn-primary w-full" onClick={() => jump('factory', 'bank')}>查看试卷与错题</button>}<button className="btn w-full" onClick={() => jump('map', 'person', { v: 'ability', p: p.id, k: it.ability, unit: p.unit, team: p.team } as never)}>回看成长地图能力项</button><button className="btn w-full" onClick={() => toast('已把失分点推送为班前会知识卡')}>推送为知识卡</button></div></Panel>
        <Panel title="AI 判读" className="flex-1"><div className="p-3"><div className="ai-out text-[12px]"><Typewriter text={done ? `本条完成，${it.ability}提升 ${it.gain} 分；${parts[scores.indexOf(Math.min(...scores))]}得分最低，建议在后续陪练中重点练习。` : fail ? `未通过，${parts.filter((_, i) => scores[i] < 70).join('、')}失分，已自动追加一次重练并顺延后续条目。` : '完成后系统将自动抓取得分与失分环节，无需手工填报。'} speed={7} /></div></div></Panel>
      </div>
    </div>
  )
}
