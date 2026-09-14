/* 规程版本与影响（一级）→ 版本详情与影响面（二级）→ 同步任务单（三级） */
import { useEffect, useState } from 'react'
import { Panel, Progress } from '../ui'
import { DOCS, docById, ASSETS, REF_KINDS } from './data'
import { useNav, StatusTag, KindTag } from './nav'

export function VersionView() {
  const { push } = useNav()
  const [st, setSt] = useState('')
  const list = DOCS.filter(d => !st || d.status === st)
  return (
    <div className="h-full grid grid-cols-[1fr_340px] gap-3 p-3 min-h-0">
      <Panel title="规程与制度版本库" extra={<div className="flex gap-1">{['', '现行', '待生效', '修订中'].map(s => <button key={s} className={`dim-tab ${st === s ? 'on' : ''}`} onClick={() => setSt(s)}>{s || '全部'}</button>)}</div>} bodyClass="overflow-auto scroll">
        <table className="grid">
          <thead><tr><th>规程 / 制度</th><th>发布单位</th><th>版本</th><th>生效</th><th>条款变化</th><th>关联资产</th><th>影响面</th><th>状态</th></tr></thead>
          <tbody>{list.map((d, i) => (
            <tr key={d.id} className="cursor-pointer row-in" style={{ animationDelay: `${i * .04}s` }} onClick={() => push({ v: 'doc', id: d.id })}>
              <td className="font-medium">《{d.name}》</td><td className="text-slate-600 text-[11.5px]">{d.issuedBy}</td>
              <td><span className="tag">{d.ver}</span><span className="text-[10.5px] text-slate-400 ml-1">← {d.prev}</span></td>
              <td className="num text-slate-500">{d.effective}</td>
              <td className="num">{d.clauses.filter(c => c.change !== '不变').length} <span className="text-[10.5px] text-slate-400">/ {d.clauses.length}</span></td>
              <td className="num">{d.assets}</td>
              <td className="text-[11px] text-slate-600 whitespace-nowrap">课件 {d.impact.课件} · 题目 {d.impact.题目} · 剧本 {d.impact.陪练剧本} · 助手 {d.impact.助手条目}</td>
              <td><StatusTag s={d.status} /></td>
            </tr>
          ))}</tbody>
        </table>
        <div className="p-3 text-[11.5px] text-slate-500 leading-relaxed hair-t">改一次，处处更新。中枢维护规程条款与全部下游资产的引用关系，修订后可定位到具体课件章节、题目、陪练剧本分支与助手条目。点击任一行进入版本详情。</div>
      </Panel>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="待生效与修订中">
          <div className="p-2 space-y-1.5">
            {DOCS.filter(d => d.status !== '现行').map(d => (
              <button key={d.id} onClick={() => push({ v: 'doc', id: d.id })} className="a-card w-full text-left">
                <div className="flex items-center gap-2"><StatusTag s={d.status} /><span className="num text-[11px] text-slate-500">{d.effective}</span></div>
                <div className="text-[12.5px] font-medium mt-1 leading-snug">《{d.name}》{d.ver}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">同步任务 {d.tasks.length} 张 · 待处理 {d.tasks.filter(t => t.st !== '已完成').length} 张</div><span className="go">›</span>
              </button>
            ))}
          </div>
        </Panel>
        <Panel title="同步流水　近期" className="flex-1" bodyClass="overflow-auto scroll">
          <div className="p-2 space-y-1">
            {DOCS.flatMap(d => d.log.map(l => ({ ...l, d }))).sort((a, b) => b.t.localeCompare(a.t)).slice(0, 10).map((l, i) => (
              <button key={i} onClick={() => push({ v: 'doc', id: l.d.id })} className="w-full text-left flex gap-2 px-2 py-1.5 hover:bg-slate-50 text-[11.5px]">
                <span className="num text-slate-400 shrink-0">{l.t}</span><span className="text-slate-600 truncate">{l.who} · {l.what}</span>
              </button>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  )
}

export function DocView({ id }: { id: string }) {
  const { push, toast } = useNav()
  const d = docById(id)
  const [calc, setCalc] = useState<'idle' | 'run' | 'done'>(d && d.tasks.length ? 'done' : 'idle')
  const [step, setStep] = useState(0)
  useEffect(() => { if (calc !== 'run') return; if (step >= 4) { const t = setTimeout(() => setCalc('done'), 400); return () => clearTimeout(t) } const t = setTimeout(() => setStep(s => s + 1), 480); return () => clearTimeout(t) }, [calc, step])
  if (!d) return null
  const changed = d.clauses.filter(c => c.change !== '不变')
  const related = ASSETS.filter(a => a.src.includes(d.name)).slice(0, 8)
  return (
    <div className="h-full grid grid-cols-[1fr_360px] gap-3 p-3 min-h-0">
      <div className="flex flex-col gap-3 min-h-0">
        <div className="panel p-4 shrink-0">
          <div className="flex items-center gap-2"><span className="text-[16px] font-semibold serif">《{d.name}》</span><span className="tag">{d.ver}</span><StatusTag s={d.status} /><span className="ml-auto text-[11.5px] text-slate-500">{d.issuedBy} · 生效 {d.effective} · 上一版 {d.prev}</span></div>
          <div className="text-[12px] text-slate-600 mt-1.5">{changed.length} 处条款变化（修改 {changed.filter(c => c.change === '修改').length} · 新增 {changed.filter(c => c.change === '新增').length} · 删除 {changed.filter(c => c.change === '删除').length}），关联资产 {d.assets} 条。</div>
        </div>
        <Panel title="条款变化　新旧对照" className="flex-1" bodyClass="overflow-auto scroll">
          <div className="p-3 space-y-2">
            {d.clauses.map((c, i) => (
              <div key={c.no} className={`clause row-in ${c.change !== '不变' ? 'hit' : ''}`} style={{ animationDelay: `${i * .06}s` }}>
                <div className="flex items-center gap-2 mb-1"><span className="no">{c.no}</span><span className="text-[12.5px] font-medium">{c.title}</span><span className={`tag ${c.change === '修改' ? 'tag-warn' : c.change === '新增' ? 'tag-ok' : c.change === '删除' ? 'tag-bad' : ''}`}>{c.change}</span><span className="ml-auto num text-[10.5px] text-slate-400">引用 {c.hits}</span></div>
                {c.change === '不变' ? <div className="text-[11.5px] text-slate-400">条款内容未变化，引用资产无需更新。</div> : (
                  <div className="grid grid-cols-2 gap-3 text-[12px] leading-relaxed">
                    <div><div className="text-[10.5px] text-slate-400 mb-0.5">旧版</div>{c.old ? <span className="diff-old">{c.old}</span> : <span className="text-slate-300">（无）</span>}</div>
                    <div><div className="text-[10.5px] text-slate-400 mb-0.5">新版</div>{c.now ? <span className="diff-new">{c.now}</span> : <span className="text-slate-300">（已删除）</span>}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="影响面测算">
          <div className="p-3">
            {calc === 'idle' && <button className="btn btn-primary w-full" onClick={() => { setCalc('run'); setStep(0) }}>测算影响面</button>}
            {calc === 'run' && <div className="space-y-1.5">{['检索引用变化条款的资产条目…', '定位受影响课件章节…', '匹配题目与陪练剧本分支…', '识别助手条目…', '生成同步任务单…'].map((s, i) => <div key={s} className="text-[11.5px] flex items-center gap-2" style={{ color: i <= step ? 'var(--ink)' : '#94a3b8' }}><span className="w-1.5 h-1.5 pulse-dot" style={{ background: i <= step ? 'var(--indigo-2)' : '#cbd3de' }} />{s}</div>)}</div>}
            {calc === 'done' && (
              <div className="fade-in">
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {REF_KINDS.map(k => <button key={k} className="hairline py-2 text-center hover:border-[var(--indigo-2)]" onClick={() => related[0] && push({ v: 'refs', id: related[0].id, kind: k })}><div className="num text-[20px] font-semibold" style={{ color: 'var(--indigo)' }}>{d.impact[k]}</div><div className="text-[10.5px] text-slate-500">{k}</div></button>)}
                </div>
                <div className="text-[11.5px] text-slate-600 leading-relaxed">人工逐一核对预计 <b className="num">{Math.round(d.assets * .66)}</b> 小时；中枢自动定位后仅需专业部门确认 <b className="num" style={{ color: 'var(--gold)' }}>{Math.max(1, Math.round(changed.length * 1.2))}</b> 处存疑项。</div>
                {d.tasks.length === 0 && <button className="btn btn-gold w-full mt-2" onClick={() => toast('已按责任单位生成 4 张同步任务单')}>生成同步任务单</button>}
              </div>
            )}
          </div>
        </Panel>
        <Panel title={`同步任务单　${d.tasks.length} 张`} className="flex-1" bodyClass="overflow-auto scroll" extra={<span className="text-[10.5px] text-slate-500">点击进入三级</span>}>
          <div className="p-2 space-y-1.5">
            {d.tasks.map(t => (
              <button key={t.id} onClick={() => push({ v: 'task', doc: d.id, id: t.id })} className="a-card w-full text-left">
                <div className="flex items-center gap-2"><StatusTag s={t.st} /><span className="text-[11px] text-slate-500 truncate">{t.unit}</span><span className="ml-auto num text-[10.5px] text-slate-400">截止 {t.due}</span></div>
                <div className="text-[12px] font-medium mt-1 leading-snug">{t.what}</div>
                <div className="flex items-center gap-2 mt-1.5"><div className="flex-1"><Progress v={t.st === '已完成' ? 100 : t.st === '处理中' ? 55 : 0} /></div><span className="num text-[11px] text-slate-500">{t.n} 项</span></div><span className="go">›</span>
              </button>
            ))}
            {d.tasks.length === 0 && <div className="text-[12px] text-slate-400 text-center py-4">测算后生成</div>}
          </div>
        </Panel>
        <Panel title="关联资产">
          <div className="p-2 space-y-0.5 max-h-[150px] overflow-auto scroll">
            {related.map(a => <button key={a.id} onClick={() => push({ v: 'asset', id: a.id })} className="w-full text-left flex items-center gap-1.5 px-2 py-1 hover:bg-slate-50 text-[11.5px]"><KindTag k={a.kind} /><span className="truncate">{a.title}</span></button>)}
            {related.length === 0 && <div className="text-[11.5px] text-slate-400 px-2 py-2">关联资产按条款锚点自动匹配</div>}
          </div>
        </Panel>
      </div>
    </div>
  )
}

export function TaskView({ doc, id }: { doc: string; id: string }) {
  const { push, toast } = useNav()
  const d = docById(doc)
  const t = d?.tasks.find(x => x.id === id)
  const [st, setSt] = useState(t?.st ?? '待处理')
  const [done, setDone] = useState<Set<number>>(new Set())
  if (!d || !t) return null
  const n = Math.min(12, t.n)
  const items = Array.from({ length: n }).map((_, i) => ({ id: `${t.id.toUpperCase()}-${String(i + 1).padStart(3, '0')}`, name: `${t.what.replace(/与.*$/, '')} · 第 ${i + 1} 项`, where: d.clauses.filter(c => c.change !== '不变')[i % Math.max(1, d.clauses.filter(c => c.change !== '不变').length)]?.no ?? '—', st: t.st === '已完成' || done.has(i) ? '已完成' : i < 3 && t.st === '处理中' ? '已完成' : '待处理' }))
  return (
    <div className="h-full grid grid-cols-[1fr_320px] gap-3 p-3 min-h-0">
      <Panel title={`任务清单　${t.n} 项（展示前 ${n} 项）`} extra={<button className="btn btn-sm btn-primary" onClick={() => { setDone(new Set(items.map((_, i) => i))); setSt('已完成'); toast('本任务单全部项已标记完成，规程同步闭环') }}>全部标记完成</button>} bodyClass="overflow-auto scroll">
        <table className="grid">
          <thead><tr><th>编号</th><th>受影响项</th><th>关联条款</th><th>状态</th><th></th></tr></thead>
          <tbody>{items.map((x, i) => (
            <tr key={x.id} className="row-in" style={{ animationDelay: `${i * .04}s` }}>
              <td className="num text-slate-500">{x.id}</td><td className="font-medium">{x.name}</td><td><span className="tag tag-gold">{x.where}</span></td><td><StatusTag s={x.st} /></td>
              <td>{x.st !== '已完成' && <button className="btn btn-sm" onClick={() => { setDone(s => new Set([...s, i])); toast(`${x.id} 已更新并复核`) }}>更新并复核</button>}</td>
            </tr>
          ))}</tbody>
        </table>
      </Panel>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="任务单">
          <div className="p-3 text-[12px] space-y-1.5">
            <div className="text-[13px] font-semibold leading-snug">{t.what}</div>
            <div className="flex justify-between"><span className="text-slate-500">规程</span><span className="truncate ml-3">《{d.name}》</span></div>
            <div className="flex justify-between"><span className="text-slate-500">责任单位</span><span>{t.unit}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">责任人</span><span>{t.owner}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">截止</span><span className="num">{t.due}</span></div>
            <div className="flex justify-between items-center"><span className="text-slate-500">状态</span><StatusTag s={st} /></div>
          </div>
        </Panel>
        <Panel title="动作" className="flex-1">
          <div className="p-3 space-y-2">
            <button className="btn btn-primary w-full" onClick={() => toast(`已推送提醒给 ${t.owner}`)}>一键推送提醒</button>
            <button className="btn w-full" onClick={() => toast('已延期 5 个工作日并记录原因')}>申请延期</button>
            <button className="btn w-full" onClick={() => push({ v: 'doc', id: d.id })}>返回版本详情</button>
            <div className="text-[10.5px] text-slate-400 leading-relaxed pt-1">全部项完成后，本规程在该责任单位范围内的同步状态自动置为已完成。</div>
          </div>
        </Panel>
      </div>
    </div>
  )
}
