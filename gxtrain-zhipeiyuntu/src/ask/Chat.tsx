/* 问答工作台（一级）→ 数据下钻 / 答案溯源（二级）→ 单位、班组或个人明细（三级） */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Panel, Bars, Progress } from '../ui'
import { ROLES, roleById, METRICS, metricById, metricValue, teamRows, personRows, monthSeries, unitShort, SKILLS } from './data'
import { answer, suggest } from './engine'
import type { Answer, DrillRow } from './engine'
import { SESSIONS, current, switchSession, newSession, addTurn, resolveTurn, answerById, togglePin } from './store'
import type { Turn } from './store'
import { useNav, KindTag, Typewriter, Field, useWidth } from './nav'
import { ABILITY_SETS } from '../atlas/data'
import type { Route } from './nav'
import { UNITS } from '../units'

const EXAMPLES: Record<string, { k: string; qs: string[] }[]> = {
  dept: [{ k: '问数据', qs: ['全公司岗位能力达标率现在多少？', '各地市局人均培训学时排名', '哪些单位必修课完成率低于 75%'] }, { k: '问知识', qs: ['规程修订后受影响的课件有多少？', '不能直接验电时怎么确认设备无电？'] }, { k: '让助手做事', qs: ['把"借调人员学时归属"做成一讲微课', '把各单位达标率导出成月报'] }],
  lead: [{ k: '问数据', qs: ['本班组本月陪练完成情况？', '本班组谁还没完成必修课', '本班组证照到期多少人'] }, { k: '问知识', qs: ['票令不一致怎么处理', 'GIS 刀闸操作后要核对哪几项'] }, { k: '让助手做事', qs: ['给本班组下发一次 GIS 四项核对专项陪练，本周五截止', '给本班组生成本周班前会知识卡'] }],
  staff: [{ k: '问数据', qs: ['我的证书还有多久到期？', '我的年度学时完成了多少？'] }, { k: '问知识', qs: ['不能直接验电时该怎么做？', '五防锁具打不开怎么办'] }, { k: '让助手做事', qs: ['证书到期前 30 天提醒我', '帮我报名岗位 AI 工具入门'] }],
}
const defaultExamples = (role: string) => EXAMPLES[role] ?? [{ k: '问数据', qs: (ROLES.find(r => r.id === role) ? METRICS.slice(0, 3).map(m => m.questions[0]) : []) }, { k: '问知识', qs: ['相关制度对本岗位有什么要求？'] }, { k: '让助手做事', qs: ['把这个结果导出成月报', '证书到期前 30 天提醒我'] }]

export function ChatView({ r }: { r: Extract<Route, { v: 'chat' }> }) {
  const { push, toast, jump } = useNav()
  const [, force] = useState(0)
  const rerender = useCallback(() => force(x => x + 1), [])
  const [role, setRole] = useState(r.role ?? current().role)
  const [input, setInput] = useState('')
  const [mic, setMic] = useState(false)
  const [stepIdx, setStepIdx] = useState(0)
  const feed = useRef<HTMLDivElement>(null)
  const asked = useRef(false)
  const sess = current()
  const pending = sess.turns.find(t => t.pending)
  const ask = useCallback((q: string) => {
    if (!q.trim() || current().turns.some(t => t.pending)) return
    const t = addTurn(q.trim()); setInput(''); setStepIdx(0); rerender()
    const { a, ctx } = answer(q.trim(), role, current().ctx)
    const total = a.think.length
    let i = 0
    const tick = () => { i += 1; setStepIdx(i); if (i >= total) { setTimeout(() => { resolveTurn(t, a, ctx); rerender() }, 260) } else setTimeout(tick, 320) }
    setTimeout(tick, 320)
  }, [role, rerender])
  useEffect(() => { if (r.q && !asked.current) { asked.current = true; setTimeout(() => ask(r.q!), 200) } }, [r.q, ask])
  useEffect(() => { feed.current?.scrollTo({ top: 1e6, behavior: 'smooth' }) }, [sess.turns.length, stepIdx])
  const sugg = useMemo(() => suggest(input, role), [input, role])
  const rl = roleById(role)
  const cites = sess.turns.flatMap(t => t.a?.refs ?? []).filter((c, i, arr) => arr.findIndex(x => x.t === c.t) === i).slice(0, 6)
  const ctx = sess.ctx
  return (
    <div className="h-full grid grid-cols-[250px_1fr_290px] gap-3 p-3 min-h-0">
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="当前身份" extra={<span className="text-[10.5px] text-slate-500">28 个单位全员</span>}>
          <div className="p-2 grid grid-cols-2 gap-1.5">
            {ROLES.map(x => <button key={x.id} className={`role-btn ${role === x.id ? 'on' : ''}`} title={`${x.who} · ${x.scope}`} onClick={() => { setRole(x.id); current().role = x.id; rerender() }}><div className="text-[12px] font-semibold truncate">{x.name}</div><div className="text-[10.5px] text-slate-500 truncate">{x.unit}</div></button>)}
          </div>
          <div className="px-2.5 pb-2 text-[10.5px]" style={{ color: 'var(--gold)' }}>{rl.who} · 数据范围：{rl.scope}</div>
        </Panel>
        <Panel title="会话" className="flex-1" bodyClass="overflow-auto scroll" extra={<button className="btn btn-sm" onClick={() => { newSession(role); rerender() }}>新会话</button>}>
          <div className="p-2 space-y-0.5">
            {[...SESSIONS].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)).map(s => (
              <button key={s.id} className={`sess ${s.id === sess.id ? 'on' : ''}`} onClick={() => { switchSession(s.id); setRole(s.role); rerender() }} onDoubleClick={() => { togglePin(s.id); rerender() }}>
                <span className="flex items-center gap-1.5">{s.pinned && <span className="text-[var(--gold)] text-[10px]">★</span>}<span className="truncate">{s.title}</span></span><small>{roleById(s.role).name} · {s.at} · {s.turns.length} 轮</small>
              </button>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title={<span className="flex items-center gap-2">问数助手<span className="ai-badge">智培云图 · 助手</span><span className="text-[11px] font-normal text-slate-500">{rl.name}视图</span></span>} extra={<span className="text-[10.5px] text-slate-500">知识 · 数据 · 动作，一个入口</span>}>
        <div className="h-full flex flex-col min-h-0">
          <div ref={feed} className="chat-feed">
            {sess.turns.length === 0 && (
              <div className="welcome">
                <div className="orb">问</div>
                <div className="text-[15px] font-semibold serif">您好，{rl.person}。想了解什么？</div>
                <div className="text-[11.5px] text-slate-500">问知识带出处，问数据带图表与口径，让助手做事直接执行</div>
                <div className="grid grid-cols-3 gap-3 w-full max-w-[860px] mt-2">
                  {defaultExamples(role).map(g => <div key={g.k} className="a-card cursor-default"><div className="text-[11px] font-semibold mb-1.5" style={{ color: 'var(--indigo)' }}>{g.k}</div>{g.qs.map(q => <button key={q} className="block w-full text-left text-[12px] leading-snug py-1 hover:text-[var(--ai)]" onClick={() => ask(q)}>· {q}</button>)}</div>)}
                </div>
              </div>
            )}
            {sess.turns.map((t, i) => <TurnView key={t.id} t={t} last={i === sess.turns.length - 1} stepIdx={t.pending ? stepIdx : 99} onAsk={ask} onFb={(fb) => { t.fb = fb; rerender(); toast(fb === 'up' ? '感谢反馈，已记入满意度' : '已记入复核队列，知识运营会跟进') }} push={push} jump={jump} toast={toast} />)}
          </div>
          <div className="composer">
            {sugg.length > 0 && input && !pending && <div className="suggest">{sugg.map(s => <button key={s} onClick={() => ask(s)}>{s}</button>)}</div>}
            <div className="box">
              <button className={`mic ${mic ? 'on' : ''}`} title="语音提问" onClick={() => { if (mic) return; setMic(true); setTimeout(() => { setMic(false); setInput(defaultExamples(role)[0].qs[0]) }, 1400) }}>{mic ? '●' : '🎤'}</button>
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && ask(input)} placeholder={mic ? '正在聆听…' : '问规程、问步骤、问案例；问学时、证照、通过率、完成率；或者让助手下发任务、生成课程、预约开班…'} />
              <button className="btn btn-primary btn-sm" disabled={!!pending} onClick={() => ask(input)}>{pending ? '思考中…' : '提问'}</button>
            </div>
            <div className="chips-row mt-2">{(ctx.metric ? [`那${unitShort(UNITS[(sess.turns.length * 7) % UNITS.length].name)}呢？`, '按班组看', '近 12 个月趋势', '导出成报表'] : defaultExamples(role).flatMap(g => g.qs).slice(0, 4)).map(c => <button key={c} className="chip" onClick={() => ask(c)}>{c}</button>)}</div>
          </div>
        </div>
      </Panel>

      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="会话上下文">
          <div className="p-3 text-[12px] space-y-1.5">
            <div className="flex justify-between"><span className="text-slate-500">数据范围</span><span className="text-right">{rl.scope}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">沿用指标</span><span>{ctx.metric ? metricById(ctx.metric)?.name : '—'}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">沿用范围</span><span className="truncate ml-3">{ctx.key ? `${unitShort(ctx.key)} · ${ctx.dim}` : '—'}</span></div>
            <div className="text-[10.5px] text-slate-400 pt-1 leading-relaxed">追问"那 XX 呢"、"按班组看"、"近 12 个月趋势"时沿用上一轮的指标与范围。</div>
          </div>
        </Panel>
        <Panel title="本会话出处" bodyClass="overflow-auto scroll">
          <div className="p-2 space-y-1">
            {cites.map(c => <button key={c.t} className="w-full text-left cite justify-start" onClick={() => c.m ? push({ v: 'metric', id: c.m }) : c.id ? jump('hub', 'catalog', { v: 'asset', id: c.id }) : jump('hub', 'search', { v: 'search', q: c.s })}><b>{c.t}</b><span className="text-slate-500 truncate">{c.s}</span></button>)}
            {cites.length === 0 && <div className="text-[11.5px] text-slate-400 p-2">回答中的出处会汇总在这里，可直接跳到中枢条目</div>}
          </div>
        </Panel>
        <Panel title="可用技能" className="flex-1" bodyClass="overflow-auto scroll" extra={<button className="btn btn-sm" onClick={() => push({ v: 'skills' })}>全部 ›</button>}>
          <div className="p-2 space-y-1">
            {SKILLS.filter(s => s.status === '已上线').slice(0, 6).map(s => <button key={s.id} onClick={() => ask(s.example)} className="w-full text-left flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded-lg"><KindTag k={s.kind} /><span className="text-[12px] truncate flex-1">{s.name}</span><span className="text-[10.5px] text-slate-400">试一试</span></button>)}
          </div>
        </Panel>
        <Panel title="导出"><div className="p-2 flex gap-2"><button className="btn btn-sm flex-1" onClick={() => toast('本会话已导出为简报')}>导出会话</button><button className="btn btn-sm flex-1" onClick={() => toast('已分享到班组看板')}>分享</button></div></Panel>
      </div>
    </div>
  )
}

function MiniLine({ data, unit }: { data: { label: string; v: number }[]; unit?: string }) {
  const [ref, w0] = useWidth<HTMLDivElement>()
  const w = Math.max(280, w0), h = 130, pad = 28
  const vs = data.map(d => d.v), mn = Math.min(...vs), mx = Math.max(...vs)
  const x = (i: number) => pad + (i / (data.length - 1)) * (w - pad * 2)
  const y = (v: number) => h - 22 - (v - mn) / Math.max(.1, mx - mn) * (h - 40)
  return <div ref={ref} className="w-full">{w0 > 0 && <svg width={w} height={h}>
    {[0, .5, 1].map(g => <line key={g} x1={pad} x2={w - pad} y1={y(mn + (mx - mn) * g)} y2={y(mn + (mx - mn) * g)} stroke="#e8edf5" />)}
    <polygon points={`${x(0)},${h - 22} ${data.map((d, i) => `${x(i)},${y(d.v)}`).join(' ')} ${x(data.length - 1)},${h - 22}`} fill="rgba(47,109,246,.08)" />
    <polyline fill="none" stroke="var(--ai)" strokeWidth="2" strokeLinejoin="round" points={data.map((d, i) => `${x(i)},${y(d.v)}`).join(' ')} strokeDasharray="1200" strokeDashoffset="1200" style={{ animation: 'dash-draw 1.4s ease-out forwards' }} />
    {data.map((d, i) => <g key={i}><circle cx={x(i)} cy={y(d.v)} r="2.6" fill="var(--ai)" /><text x={x(i)} y={y(d.v) - 7} fontSize="9.5" textAnchor="middle" fill="#4d5f7d">{d.v}{unit === '%' ? '' : ''}</text><text x={x(i)} y={h - 6} fontSize="9.5" textAnchor="middle" fill="#8a94a6">{d.label}</text></g>)}
    <style>{`@keyframes dash-draw { to { stroke-dashoffset: 0 } }`}</style>
  </svg>}</div>
}

const LINES = Object.keys(ABILITY_SETS)
/* 图表柱子的去向：与下钻行对得上就进该行的三级页，整张图都是专业线就进成长地图的岗位能力模型；对不上就不做成可点 */
function pickOf(a: Answer, push: (r: Route) => void, jump: (n: string, tab: string, r?: { v: string; [k: string]: unknown }) => void) {
  if (!a.chart || a.chart.type !== 'bar') return undefined
  const rows = a.drill?.rows ?? []
  const rowOf = (l: string) => rows.find(x => x.short === l || x.name === l)
  if (a.drill && a.drill.dim !== '月份' && a.chart.data.some(d => rowOf(d.label))) {
    return (l: string) => { const r = rowOf(l); if (r) push({ v: 'row', a: a.id, name: r.name }) }
  }
  if (a.chart.data.length > 1 && a.chart.data.every(d => LINES.includes(d.label))) {
    return (l: string) => jump('map', 'matrix', { v: 'matrix', line: l })
  }
  return undefined
}

function TurnView({ t, last, stepIdx, onAsk, onFb, push, jump, toast }: { t: Turn; last: boolean; stepIdx: number; onAsk: (q: string) => void; onFb: (f: 'up' | 'down') => void; push: (r: Route) => void; jump: (n: string, tab: string, r?: { v: string; [k: string]: unknown }) => void; toast: (m: string) => void }) {
  const a = t.a
  const steps = a?.think ?? ['识别意图与范围…', '匹配口径与检索来源…', '取数与校验…', '生成回答…']
  const [open, setOpen] = useState(false)
  return (
    <>
      <div className="bub-q">{t.q}</div>
      <div className="bub-a">
        <div className="av">AI</div>
        <div className="acard">
          <details className="think" open={t.pending || open} onToggle={e => setOpen((e.target as HTMLDetailsElement).open)}>
            <summary><span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: 'var(--ai)' }} />{t.pending ? '正在思考' : `已思考 ${steps.length} 步 · ${a?.ms ?? 0} ms · 置信度 ${Math.round((a?.confidence ?? 0) * 100)}%`}<span className="ml-auto text-[10px] text-slate-400">{t.pending ? '' : '展开'}</span></summary>
            <div className="pt-1">{(t.pending ? steps.slice(0, stepIdx + 1) : steps).map((s, i) => <div key={s} className={`st ${t.pending && i === stepIdx ? 'doing' : ''}`}><i />{s}</div>)}</div>
          </details>
          {a && (
            <div className="fade-in">
              <div className="flex items-center gap-2 mt-2"><KindTag k={a.kind} /><span className="text-[10.5px] text-slate-400">范围：{a.scope}</span>{a.skill && <span className="tag">{SKILLS.find(s => s.id === a.skill)?.name}</span>}</div>
              <div className="atext">{last ? <Typewriter text={a.text} speed={6} /> : a.text}</div>
              {a.exec && <div className="exec mt-2">{a.exec.steps.map(s => <div key={s} className="row"><i>✓</i>{s}</div>)}<div className="mt-1.5 flex flex-wrap gap-1.5">{a.exec.params.map(p => <span key={p.k} className="tag">{p.k}：{p.v}</span>)}</div></div>}
              {a.chart && <div className="mt-3 hair-t pt-3">{a.chart.type === 'line' ? <><div className="text-[11.5px] text-slate-600 mb-1">{a.chart.title}</div><MiniLine data={a.chart.data} unit={a.chart.unit} /></> : <Bars title={a.chart.title} data={a.chart.data} unit={a.chart.unit === '%' ? '%' : ''} onPick={pickOf(a, push, jump)} />}</div>}
              {a.caliber && <div className="caliber mt-3"><b>口径</b> {a.caliber.name} = {a.caliber.formula}<span className="text-slate-500"> · 来源 {a.caliber.src} · {a.caliber.freq} · 责任 {a.caliber.owner}</span></div>}
              {a.refs.length > 0 && <div className="mt-3 hair-t pt-2.5"><div className="text-[10.5px] text-slate-500 mb-1.5">出处</div><div className="chips-row">{a.refs.map(r => <button key={r.t} className="cite" onClick={() => r.m ? push({ v: 'metric', id: r.m }) : r.id ? jump('hub', 'catalog', { v: 'asset', id: r.id }) : jump('hub', 'search', { v: 'search', q: r.s })}><b>{r.t}</b><span className="text-slate-500">{r.s}</span></button>)}</div></div>}
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {a.drill && <button className="ans-act" onClick={() => push({ v: 'drill', a: a.id })}><span className="ic">钻</span>数据下钻 · {a.drill.rows.length} 条</button>}
                <button className="ans-act" onClick={() => push({ v: 'trace', a: a.id })}><span className="ic" style={{ background: 'linear-gradient(135deg,var(--gold),var(--gold-2))' }}>溯</span>答案溯源</button>
                {a.actions.map(x => <button key={x.k} className="ans-act" onClick={() => x.node === 'ask' ? (x.skill ? onAsk(x.k === '导出报表' ? '把这个结果导出成月报' : x.k === '申请授权' ? '提醒培训专责给我开通跨单位查询权限' : x.k === '生成复审提醒' ? '证书到期前 30 天提醒相关人员' : x.k) : push({ v: 'skills' })) : (toast(`已打开 ${x.k}`), jump(x.node, x.tab, x.route))}><span className="ic">{x.k.slice(0, 1)}</span>{x.k}<span className="text-[10px] text-slate-400">{x.d}</span></button>)}
                <span className="ml-auto fb"><button className={t.fb === 'up' ? 'on' : ''} onClick={() => onFb('up')}>👍</button><button className={t.fb === 'down' ? 'on' : ''} onClick={() => onFb('down')}>👎</button></span>
              </div>
              {a.follow.length > 0 && <div className="chips-row mt-2.5">{a.follow.map(f => <button key={f} className="chip" onClick={() => onAsk(f)}>{f}</button>)}</div>}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

/* ---------- 二级：数据下钻 ---------- */
export function DrillView({ aid }: { aid: string }) {
  const { push, toast, jump, back } = useNav()
  const a = answerById(aid)
  const [sort, setSort] = useState<'v' | 'trend' | 'name'>('v')
  const [q, setQ] = useState('')
  const [grp, setGrp] = useState('')
  if (!a || !a.drill) return <div className="p-6 text-slate-400">该回答没有可下钻的数据</div>
  const m = metricById(a.drill.metric)!
  const rows = [...a.drill.rows].filter(r => (!q || r.name.includes(q)) && (!grp || r.grp === grp)).sort((x, y) => sort === 'v' ? (m.higherBetter ? y.v - x.v : x.v - y.v) : sort === 'trend' ? y.trend - x.trend : x.name.localeCompare(y.name))
  const avg = a.drill.rows.reduce((s, r) => s + r.v, 0) / a.drill.rows.length
  const grps = [...new Set(a.drill.rows.map(r => r.grp))]
  const buckets = m.unit === '%' ? [['< 70', r => r.v < 70], ['70–80', r => r.v >= 70 && r.v < 80], ['80–90', r => r.v >= 80 && r.v < 90], ['≥ 90', r => r.v >= 90]] as [string, (r: DrillRow) => boolean][] : [['低', r => r.v < avg * .9], ['中', r => r.v >= avg * .9 && r.v <= avg * 1.1], ['高', r => r.v > avg * 1.1]] as [string, (r: DrillRow) => boolean][]
  return (
    <div className="h-full grid grid-cols-[1fr_380px_300px] gap-3 p-3 min-h-0">
      <Panel title={<span>{m.name}　<span className="text-[11.5px] font-normal text-slate-500">{a.drill.note} · {rows.length} 条</span></span>} extra={<><input value={q} onChange={e => setQ(e.target.value)} placeholder="搜名称" className="hairline px-2 py-1 text-[12px] w-[120px] outline-none" />{grps.length > 1 && <select value={grp} onChange={e => setGrp(e.target.value)} className="hairline px-2 py-1 text-[12px]"><option value="">全部类别</option>{grps.map(g => <option key={g}>{g}</option>)}</select>}<select value={sort} onChange={e => setSort(e.target.value as never)} className="hairline px-2 py-1 text-[12px]"><option value="v">按数值</option><option value="trend">按环比</option><option value="name">按名称</option></select></>} bodyClass="overflow-auto scroll">
        <table className="grid">
          <thead><tr><th>#</th><th>{a.drill.dim}</th><th>类别</th><th>{m.name}</th><th>与均值</th><th>环比</th><th>人数</th><th></th></tr></thead>
          <tbody>{rows.map((r, i) => (
            <tr key={r.name} className="tbl-row" onClick={() => a.drill!.dim !== '月份' && push({ v: 'row', a: a.id, name: r.name })}>
              <td className="num text-slate-400">{i + 1}</td><td className="font-medium">{r.short}</td><td className="text-[11px] text-slate-500">{r.grp}</td>
              <td className="w-[160px]"><div className="flex items-center gap-2"><div className="heat flex-1"><i style={{ width: `${Math.min(100, m.unit === '%' ? r.v : r.v / Math.max(...a.drill!.rows.map(x => x.v)) * 100)}%`, background: (m.higherBetter ? r.v >= avg : r.v <= avg) ? 'linear-gradient(90deg,var(--indigo),var(--ai))' : 'linear-gradient(90deg,var(--warn),var(--gold-2))', animationDelay: `${i * .03}s` }} /></div><span className="num w-[52px] text-right font-semibold">{m.fmt(r.v)}</span></div></td>
              <td className="num" style={{ color: (m.higherBetter ? r.v >= avg : r.v <= avg) ? 'var(--ok)' : 'var(--bad)' }}>{r.v >= avg ? '+' : ''}{(r.v - avg).toFixed(1)}</td>
              <td className="num" style={{ color: r.trend >= 0 ? 'var(--ok)' : 'var(--bad)' }}>{r.trend >= 0 ? '↑' : '↓'} {Math.abs(r.trend)}</td>
              <td className="num text-slate-500">{r.n ? r.n.toLocaleString() : '—'}</td><td>{a.drill!.dim !== '月份' && <span className="text-[var(--gold)]">›</span>}</td>
            </tr>
          ))}</tbody>
        </table>
      </Panel>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="分布"><div className="p-3"><Bars data={buckets.map(([k, f]) => ({ label: k, v: a.drill!.rows.filter(f).length, note: k.startsWith('<') || k === '低' ? '关注' : undefined }))} title={`${a.drill.dim}数（按${m.name}区间）`} /></div></Panel>
        <Panel title="前 10" className="flex-1"><div className="p-3"><Bars data={rows.slice(0, 10).map(r => ({ label: r.short, v: Math.round(r.v * 10) / 10 }))} unit={m.unit === '%' ? '%' : ''} /></div></Panel>
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="口径卡"><div className="p-3 text-[12px] space-y-1.5"><Field k="定义" v={m.def} /><Field k="公式" v={m.formula} /><div className="flex justify-between"><span className="text-slate-500">来源</span><span>{m.src}</span></div><div className="flex justify-between"><span className="text-slate-500">更新</span><span>{m.freq}</span></div><div className="flex justify-between"><span className="text-slate-500">责任</span><span>{m.owner}</span></div>{m.history[0] && <div className="text-[11px] text-slate-500 pt-1 hair-t">最近口径变更 {m.history[0].date}：{m.history[0].note}</div>}<button className="btn btn-sm w-full mt-1" onClick={() => push({ v: 'metric', id: m.id })}>指标详情与血缘 ›</button></div></Panel>
        <Panel title="动作" className="flex-1"><div className="p-2 space-y-1.5">
          <button className="act-btn" onClick={() => toast('已按月报模板导出')}><span className="ic">出</span>导出报表<small>xlsx</small></button>
          {(m.id === 'pass' || m.id === 'coach' || m.id === 'ready') && <button className="act-btn gold" onClick={() => { toast(`已给 ${rows[rows.length - 1]?.short} 下发陪练任务`); jump('coach', 'team') }}><span className="ic">练</span>给末位下发陪练<small>班组看板</small></button>}
          <button className="act-btn" onClick={() => jump('plan', 'engine')}><span className="ic">划</span>生成补强计划<small>千人千面</small></button>
          <button className="act-btn gold" onClick={() => jump('map', 'unit')}><span className="ic">图</span>看成长地图<small>能力全景</small></button>
          <button className="btn btn-primary w-full mt-2" onClick={back}>继续追问</button>
        </div></Panel>
      </div>
    </div>
  )
}

/* ---------- 二级：答案溯源 ---------- */
export function TraceView({ aid }: { aid: string }) {
  const { push, toast, jump } = useNav()
  const a = answerById(aid)
  if (!a) return null
  const m = a.metric ? metricById(a.metric) : undefined
  const durs = a.think.map((_, i) => Math.round(a.ms * [.18, .27, .35, .2, .1][i % 5]))
  return (
    <div className="h-full grid grid-cols-[1fr_1fr_300px] gap-3 p-3 min-h-0">
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="推理链" extra={<span className="text-[10.5px] text-slate-500">{a.ms} ms · 置信度 {Math.round(a.confidence * 100)}%</span>}>
          <div className="p-3">
            {a.think.map((s, i) => <div key={s} className="flex gap-2.5 pb-3 relative"><div className="shrink-0 relative"><div className="stage-dot done">{i + 1}</div>{i < a.think.length - 1 && <span className="absolute left-1/2 top-[26px] bottom-[-12px] w-[1px] -translate-x-1/2" style={{ background: 'var(--line)' }} />}</div><div className="pt-0.5"><div className="text-[12.5px]">{s}</div><div className="text-[10.5px] text-slate-400">{durs[i]} ms</div></div></div>)}
          </div>
        </Panel>
        <Panel title="权限与脱敏" className="flex-1"><div className="p-3 text-[12px] space-y-1.5"><div className="flex justify-between"><span className="text-slate-500">提问身份范围</span><span>{a.scope}</span></div><div className="flex justify-between"><span className="text-slate-500">敏感条目</span><span>{a.retrieved?.length ? '已按分级过滤' : '无'}</span></div><div className="flex justify-between"><span className="text-slate-500">数据越权检查</span><span style={{ color: 'var(--ok)' }}>通过</span></div><div className="flex justify-between"><span className="text-slate-500">模型</span><span>智培云图助手 · 2026.09</span></div><div className="flex justify-between"><span className="text-slate-500">回答类型</span><KindTag k={a.kind} /></div></div></Panel>
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        {a.retrieved && a.retrieved.length > 0 ? (
          <Panel title={`召回条目　${a.retrieved.length}`} className="flex-1" bodyClass="overflow-auto scroll">
            <div className="p-2 space-y-1.5">{a.retrieved.map((r, i) => <button key={r.id + i} className="a-card w-full text-left" onClick={() => r.id.match(/^[A-Z]{2}-/) ? jump('hub', 'catalog', { v: 'asset', id: r.id }) : jump('hub', 'search', { v: 'search', q: r.title })}><div className="flex items-center gap-2"><span className="tag">{r.kind}</span><span className="num text-[10.5px] text-slate-400">{r.id}</span><span className="ml-auto num text-[11px]" style={{ color: 'var(--ai)' }}>{Math.round(r.score * 100)}%</span></div><div className="text-[12.5px] font-medium mt-1">{r.title}</div><div className="mt-1.5"><Progress v={r.score * 100} /></div><div className="text-[10.5px] text-slate-500 mt-1">{r.why}</div><span className="go">›</span></button>)}</div>
          </Panel>
        ) : m ? (
          <Panel title="数据路径" className="flex-1"><div className="p-3">
            {[['源系统', m.src], ['数据表', m.tables.join(' · ')], ['指标', `${m.name} = ${m.formula}`], ['范围', a.caliber?.scope ?? a.scope], ['回答', `${a.drill?.rows.length ?? 0} 条聚合，附图表与口径卡`]].map(([k, v], i) => <div key={k} className="flex gap-2.5 pb-3 relative"><div className="shrink-0 relative"><div className={`stage-dot ${i === 2 ? 'cur' : 'done'}`}>{i + 1}</div>{i < 4 && <span className="absolute left-1/2 top-[26px] bottom-[-12px] w-[1px] -translate-x-1/2" style={{ background: 'var(--line)' }} />}</div><div className="pt-0.5"><div className="text-[11px] text-slate-500">{k}</div><div className="text-[12.5px]">{v}</div></div></div>)}
            <button className="btn btn-sm w-full" onClick={() => push({ v: 'metric', id: m.id })}>查看指标血缘 ›</button>
          </div></Panel>
        ) : (
          <Panel title="执行记录" className="flex-1"><div className="p-3">{a.exec ? <div className="exec">{a.exec.steps.map(s => <div key={s} className="row"><i>✓</i>{s}</div>)}<div className="mt-2 text-[12px]">{a.exec.result}</div></div> : <div className="text-[12px] text-slate-400">本回答未调用数据或知识来源</div>}{a.skill && <button className="btn btn-sm w-full mt-3" onClick={() => push({ v: 'skill', id: a.skill! })}>查看技能与调用日志 ›</button>}</div></Panel>
        )}
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="回答"><div className="p-3 text-[12px] leading-relaxed"><div className="text-[11px] text-slate-500 mb-1">问题</div><div className="font-medium mb-2">{a.q}</div><div className="text-[11px] text-slate-500 mb-1">回答</div><div className="line-clamp-6">{a.text}</div></div></Panel>
        <Panel title="评审" className="flex-1"><div className="p-3 space-y-2"><button className="btn btn-primary w-full" onClick={() => toast('已标记为优质回答，纳入示例库')}>标记为优质回答</button><button className="btn w-full" onClick={() => { toast('已加入复核队列'); push({ v: 'quality' }) }}>加入复核队列</button><button className="btn w-full" onClick={() => toast('已导出溯源报告')}>导出溯源报告</button></div></Panel>
      </div>
    </div>
  )
}

/* ---------- 三级：单位 / 班组 / 个人明细 ---------- */
export function RowView({ aid, name }: { aid: string; name: string }) {
  const { push, toast, jump } = useNav()
  const a = answerById(aid)
  if (!a || !a.drill) return null
  const m = metricById(a.drill.metric)!
  const dim = a.drill.dim
  const atTeam = name.includes(' · ')
  const sub = atTeam ? personRows(m, name) : dim === '单位' || dim === '地市局' ? teamRows(m, name) : dim === '班组' || dim === '科室' ? personRows(m, name) : []
  const subDim = atTeam ? '成员' : sub.length ? `下属${sub[0].grp}` : '成员'
  const series = monthSeries(m, name)
  const others = METRICS.filter(x => x.id !== m.id).slice(0, 5)
  return (
    <div className="h-full grid grid-cols-[1fr_1fr_300px] gap-3 p-3 min-h-0">
      <div className="flex flex-col gap-3 min-h-0">
        <div className="panel p-4 shrink-0"><div className="flex items-center gap-2"><span className="tag">{dim}</span><span className="text-[17px] font-semibold serif">{unitShort(name)}</span><span className="ml-auto text-[11px] text-slate-500">{m.name}</span></div>
          <div className="grid grid-cols-6 gap-2 mt-3">{[m, ...others].map((x, i) => <div key={x.id} className="hairline py-2 text-center"><div className={`num text-[17px] font-semibold ${i === 0 ? 'num-grad' : 'gold-grad'}`}>{x.fmt(metricValue(x, name))}</div><div className="text-[10px] text-slate-500 truncate px-1">{x.name}</div></div>)}</div></div>
        <Panel title={`${m.name} · 近 12 个月`} className="flex-1"><div className="p-3"><MiniLine data={series} unit={m.unit} /></div></Panel>
      </div>
      <Panel title={sub.length ? `${subDim}　${sub.length}` : '记录'} bodyClass="overflow-auto scroll">
        {sub.length ? <table className="grid"><thead><tr><th>#</th><th>名称</th><th>{m.name}</th><th>环比</th></tr></thead><tbody>{sub.map((r, i) => <tr key={r.name} className="tbl-row" onClick={() => atTeam || dim === '班组' || dim === '科室' ? jump('map', 'person') : push({ v: 'row', a: aid, name: r.name })}><td className="num text-slate-400">{i + 1}</td><td className="font-medium">{r.short}</td><td className="w-[150px]"><div className="flex items-center gap-2"><div className="heat flex-1"><i style={{ width: `${Math.min(100, m.unit === '%' ? r.v : 60)}%`, background: 'linear-gradient(90deg,var(--indigo),var(--ai))' }} /></div><span className="num w-[48px] text-right">{m.fmt(r.v)}</span></div></td><td className="num" style={{ color: r.trend >= 0 ? 'var(--ok)' : 'var(--bad)' }}>{r.trend >= 0 ? '↑' : '↓'} {Math.abs(r.trend)}</td></tr>)}</tbody></table>
          : <div className="p-3 space-y-1.5 text-[12px]">{[['2026-09-05', '陪练 · 线路由运行转检修', '86 分 · 通过'], ['2026-08-22', '考试 · 安规年度考试', '92 分 · 合格'], ['2026-08-10', '课程 · 低压台区反送电判断', '4 学时 · 完成'], ['2026-07-18', '陪练 · 母线倒闸操作', '74 分 · 未通过']].map(([t, n, r]) => <div key={t} className="hairline px-2.5 py-2"><div className="flex items-center gap-2"><span className="num text-[10.5px] text-slate-400">{t}</span><span className="ml-auto text-[11px]" style={{ color: r.includes('未') ? 'var(--bad)' : 'var(--ok)' }}>{r}</span></div><div>{n}</div></div>)}</div>}
      </Panel>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="AI 判读"><div className="p-3"><div className="ai-out text-[12px]">{`${unitShort(name)}的${m.name}为 ${m.fmt(metricValue(m, name))}，${metricValue(m, name) >= metricValue(m, '公司') === m.higherBetter ? '优于' : '弱于'}全公司水平（${m.fmt(metricValue(m, '公司'))}）。近 12 个月${series[11].v >= series[0].v ? '呈上升趋势' : '有所回落'}，${sub.length ? `差距主要来自${sub[sub.length - 1].short}` : '建议关注最近一次未通过记录对应的能力项'}。`}</div></div></Panel>
        <Panel title="动作" className="flex-1"><div className="p-2 space-y-1.5">
          <button className="act-btn" onClick={() => jump('map', dim === '个人' ? 'person' : 'unit')}><span className="ic">图</span>成长地图<small>{dim === '个人' ? '个人' : '单位'}视图</small></button>
          <button className="act-btn gold" onClick={() => { toast(`已给${unitShort(name)}下发陪练任务`); jump('coach', 'team') }}><span className="ic">练</span>下发陪练<small>班组看板</small></button>
          <button className="act-btn" onClick={() => jump('plan', 'engine')}><span className="ic">划</span>生成学习计划<small>千人千面</small></button>
          <button className="act-btn gold" onClick={() => toast('已导出明细')}><span className="ic">出</span>导出明细<small>xlsx</small></button>
        </div></Panel>
      </div>
    </div>
  )
}
