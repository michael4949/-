/* 知识图谱：以条目为中心的关联网络，点击节点下钻 */
import { useMemo, useState } from 'react'
import { Panel } from '../ui'
import { ASSETS, assetById, KIND_COLOR, DOCS, HOT_ASSETS } from './data'
import type { Asset } from './data'
import { useNav, KindTag, Field } from './nav'

type Node = { id: string; label: string; kind: string; color: string; ring: number; angle: number; asset?: Asset; hint?: string }
const REF_COLOR: Record<string, string> = { 课件: '#2b7a78', 题目: '#d4af63', 陪练剧本: '#8e5ea2', 助手条目: '#6a86b8' }

function build(a: Asset): Node[] {
  const nodes: Node[] = [{ id: a.id, label: a.title, kind: a.kind, color: KIND_COLOR[a.kind], ring: 0, angle: 0, asset: a }]
  const ring1: Node[] = []
  a.rel.map(assetById).filter(Boolean).forEach(x => ring1.push({ id: x!.id, label: x!.title, kind: x!.kind, color: KIND_COLOR[x!.kind], ring: 1, angle: 0, asset: x! }))
  ASSETS.filter(x => x.id !== a.id && !a.rel.includes(x.id) && x.topic === a.topic && x.unit === a.unit).slice(0, 3).forEach(x => ring1.push({ id: x.id, label: x.title, kind: x.kind, color: KIND_COLOR[x.kind], ring: 1, angle: 0, asset: x, hint: '同主题' }))
  ring1.push({ id: 'post', label: a.post, kind: '岗位', color: '#14213d', ring: 1, angle: 0 })
  ring1.push({ id: 'unit', label: a.unit.replace(/（.*）/, ''), kind: '单位', color: '#4a5568', ring: 1, angle: 0 })
  const doc = DOCS.find(d => a.src.includes(d.name))
  ring1.push({ id: 'doc', label: doc ? doc.name : a.src.split(' ')[0], kind: '规程', color: '#7a5c1e', ring: 1, angle: 0, hint: doc?.ver })
  const ring2: Node[] = []
  a.refs.forEach(r => r.items.slice(0, 3).forEach((it, i) => ring2.push({ id: `${r.kind}-${i}`, label: it.name, kind: r.kind, color: REF_COLOR[r.kind], ring: 2, angle: 0, hint: it.where })))
  ring1.forEach((n, i) => n.angle = (i / ring1.length) * Math.PI * 2 - Math.PI / 2)
  ring2.forEach((n, i) => n.angle = (i / ring2.length) * Math.PI * 2 - Math.PI / 2 + .2)
  return [...nodes, ...ring1, ...ring2]
}

export function GraphView({ id }: { id?: string }) {
  const { push } = useNav()
  const a = assetById(id ?? 'KZ-2411') ?? HOT_ASSETS[0]
  const nodes = useMemo(() => build(a), [a])
  const [sel, setSel] = useState<Node>(nodes[0])
  const W = 860, H = 560, cx = W / 2, cy = H / 2, R = [0, 150, 245]
  const pos = (n: Node) => ({ x: cx + Math.cos(n.angle) * R[n.ring], y: cy + Math.sin(n.angle) * R[n.ring] })
  const center = nodes[0]
  const stats = { 条目: nodes.filter(n => n.asset).length - 1, 引用: nodes.filter(n => n.ring === 2).length, 岗位: 1, 规程: 1 }
  return (
    <div className="h-full grid grid-cols-[1fr_330px] gap-3 p-3 min-h-0">
      <Panel title="关联网络" extra={
        <div className="flex items-center gap-2 text-[10.5px] text-slate-500">
          {Object.entries({ ...KIND_COLOR, ...REF_COLOR }).map(([k, c]) => <span key={k} className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: c }} />{k}</span>)}
        </div>}>
        <div className="h-full flex items-center justify-center p-2">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" style={{ maxHeight: '100%' }}>
            {[1, 2].map(r => <circle key={r} cx={cx} cy={cy} r={R[r]} fill="none" stroke="#e6eaf1" strokeDasharray="3 5" />)}
            {nodes.slice(1).map(n => {
              const p = pos(n)
              const from = n.ring === 1 ? { x: cx, y: cy } : pos(nodes.slice(1).filter(m => m.ring === 1).sort((m1, m2) => Math.abs(m1.angle - n.angle) - Math.abs(m2.angle - n.angle))[0] ?? nodes[0])
              return <line key={'e' + n.id} x1={from.x} y1={from.y} x2={p.x} y2={p.y} stroke={n.color} strokeOpacity={.45} strokeWidth={n.ring === 1 ? 1.4 : .9} className="gedge" />
            })}
            {nodes.map((n, i) => {
              const p = pos(n)
              const r = n.ring === 0 ? 34 : n.ring === 1 ? 22 : 13
              const on = sel.id === n.id
              return (
                <g key={n.id} className={`gnode ${n.ring === 0 ? 'gcenter' : ''} pop-in`} style={{ transformOrigin: `${p.x}px ${p.y}px`, animationDelay: `${i * .03}s` }} onClick={() => setSel(n)} onDoubleClick={() => n.asset && n.ring > 0 && push({ v: 'graph', id: n.asset.id })}>
                  {on && <circle cx={p.x} cy={p.y} r={r + 6} fill="none" stroke="var(--gold)" strokeWidth="2" />}
                  <circle cx={p.x} cy={p.y} r={r} fill={n.color} opacity={n.ring === 2 ? .8 : 1} />
                  <text x={p.x} y={p.y} fontSize={n.ring === 0 ? 11 : n.ring === 1 ? 10 : 8} fill="#fff" textAnchor="middle" dominantBaseline="middle">{n.kind.slice(0, 2)}</text>
                  <text x={p.x} y={p.y + r + 11} fontSize={n.ring === 2 ? 9 : 10.5} fill={n.ring === 0 ? 'var(--ink)' : '#475569'} textAnchor="middle" fontWeight={n.ring === 0 ? 600 : 400}>{n.label.length > (n.ring === 2 ? 10 : 14) ? n.label.slice(0, n.ring === 2 ? 10 : 14) + '…' : n.label}</text>
                </g>
              )
            })}
          </svg>
        </div>
      </Panel>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="中心条目">
          <div className="p-3"><div className="flex items-center gap-2 mb-1"><KindTag k={center.asset!.kind} /><span className="num text-[11px] text-slate-400">{center.asset!.id}</span></div><div className="text-[13px] font-semibold leading-snug">{center.label}</div>
            <div className="grid grid-cols-4 gap-1.5 mt-2.5 text-center">{Object.entries(stats).map(([k, v]) => <div key={k} className="hairline py-1.5"><div className="num text-[15px] font-semibold" style={{ color: 'var(--indigo)' }}>{v}</div><div className="text-[10px] text-slate-500">{k}</div></div>)}</div>
            <button className="btn btn-sm mt-2.5 w-full" onClick={() => push({ v: 'asset', id: center.asset!.id })}>打开条目详情</button></div>
        </Panel>
        <Panel title="选中节点" className="flex-1" bodyClass="overflow-auto scroll">
          <div className="p-3 fade-in" key={sel.id}>
            <div className="flex items-center gap-2 mb-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: sel.color }} /><span className="text-[11px] text-slate-500">{sel.kind}</span>{sel.hint && <span className="tag ml-auto">{sel.hint}</span>}</div>
            <div className="text-[13px] font-medium leading-snug mb-2">{sel.label}</div>
            {sel.asset ? <>
              <Field k="要点" v={sel.asset.summary} />
              <Field k="来源" v={sel.asset.src} />
              <div className="flex gap-2 mt-1">
                {sel.ring > 0 && <button className="btn btn-sm btn-primary flex-1" onClick={() => push({ v: 'graph', id: sel.asset!.id })}>以此为中心</button>}
                <button className="btn btn-sm flex-1" onClick={() => push({ v: 'asset', id: sel.asset!.id })}>打开条目</button>
              </div>
            </> : sel.id === 'post' ? <>
              <Field k="岗位画像" v={`该岗位关联资产 ${ASSETS.filter(x => x.post === sel.label).length} 条，其中诀窍 ${ASSETS.filter(x => x.post === sel.label && x.kind === '岗位诀窍').length} 条。`} />
              <button className="btn btn-sm w-full" onClick={() => push({ v: 'catalog', post: sel.label, dim: 'post' })}>查看该岗位全部资产</button>
            </> : sel.id === 'unit' ? <>
              <Field k="单位" v={`${center.asset!.unit} 的资产集合，覆盖 ${new Set(ASSETS.filter(x => x.unit === center.asset!.unit).map(x => x.post)).size} 个岗位。`} />
              <button className="btn btn-sm w-full" onClick={() => push({ v: 'catalog', unit: center.asset!.unit, dim: 'org' })}>查看该单位资产目录</button>
            </> : sel.id === 'doc' ? <>
              <Field k="规程" v={`本条目的来源文件${sel.hint ? `，当前版本 ${sel.hint}` : ''}。`} />
              {DOCS.find(d => d.name === sel.label) && <button className="btn btn-sm w-full" onClick={() => push({ v: 'doc', id: DOCS.find(d => d.name === sel.label)!.id })}>查看版本与影响</button>}
            </> : <>
              <Field k="引用位置" v={sel.hint ?? '—'} />
              <button className="btn btn-sm w-full" onClick={() => push({ v: 'refs', id: center.asset!.id, kind: sel.kind as never })}>查看{sel.kind}引用清单</button>
            </>}
            <div className="text-[10.5px] text-slate-400 mt-3 pt-2 hair-t">单击查看节点，双击条目节点以其为中心重新展开。</div>
          </div>
        </Panel>
      </div>
    </div>
  )
}
