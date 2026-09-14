/* 中枢的分级导航：路由栈、面包屑、页面过渡、提示与跨模块跳转 */
import type { ReactNode } from 'react'
import { DrillShell, useDrill, Typewriter, useWidth } from '../drill'
export { Typewriter, useWidth }
import type { AssetKind, RefKind, Sens, AssetStatus } from './data'
import { assetById, docById, batchById, EXPERTS_ALL, KIND_COLOR, Q_CATS } from './data'

export type Route =
  | { v: 'board' }
  | { v: 'catalog'; unit?: string; kind?: AssetKind; pro?: string; dim?: 'org' | 'pro' | 'kind' | 'post'; post?: string }
  | { v: 'asset'; id: string }
  | { v: 'refs'; id: string; kind: RefKind }
  | { v: 'clause'; id: string }
  | { v: 'diff'; id: string }
  | { v: 'ingest' }
  | { v: 'batch'; id: string }
  | { v: 'item'; batch: string; id: string }
  | { v: 'expert' }
  | { v: 'expertDetail'; id: string }
  | { v: 'graph'; id?: string }
  | { v: 'version' }
  | { v: 'doc'; id: string }
  | { v: 'task'; doc: string; id: string }
  | { v: 'quality' }
  | { v: 'issues'; cat: string }
  | { v: 'search'; q?: string }

export const ROOT_OF: Record<string, Route> = {
  board: { v: 'board' }, catalog: { v: 'catalog' }, search: { v: 'search' }, ingest: { v: 'ingest' },
  expert: { v: 'expert' }, graph: { v: 'graph' }, version: { v: 'version' }, quality: { v: 'quality' },
}
export const TAB_OF: Record<Route['v'], string> = {
  board: 'board', catalog: 'catalog', asset: 'catalog', refs: 'catalog', clause: 'catalog', diff: 'catalog',
  ingest: 'ingest', batch: 'ingest', item: 'ingest', expert: 'expert', expertDetail: 'expert', graph: 'graph',
  version: 'version', doc: 'version', task: 'version', quality: 'quality', issues: 'quality', search: 'search',
}
export function labelOf(r: Route): string {
  switch (r.v) {
    case 'board': return '总览驾驶舱'
    case 'catalog': return r.unit ? `资产目录 · ${r.unit.replace(/（.*）/, '')}` : r.kind ? `资产目录 · ${r.kind}` : r.pro ? `资产目录 · ${r.pro}` : '资产目录'
    case 'asset': { const a = assetById(r.id); return a ? `${a.id} ${a.title}` : r.id }
    case 'refs': return `${r.kind}引用清单`
    case 'clause': return '规程原文'
    case 'diff': return '版本对比'
    case 'ingest': return '智能入库'
    case 'batch': return batchById(r.id)?.name ?? r.id
    case 'item': return '条目审核'
    case 'expert': return '专家经验萃取'
    case 'expertDetail': return EXPERTS_ALL.find(e => e.id === r.id)?.name ?? r.id
    case 'graph': return r.id ? `知识图谱 · ${assetById(r.id)?.title ?? r.id}` : '知识图谱'
    case 'version': return '规程版本与影响'
    case 'doc': return docById(r.id)?.name ?? r.id
    case 'task': return '同步任务单'
    case 'quality': return '质量与权限'
    case 'issues': return Q_CATS.find(c => c.id === r.cat)?.name ?? r.cat
    case 'search': return r.q ? `语义检索 · ${r.q}` : '语义检索'
  }
}

export const useNav = () => useDrill<Route>()
export function HubShell({ tab, init, nonce, children }: { tab: string; init?: Route; nonce?: number; children: (r: Route, level: number) => ReactNode }) {
  return <DrillShell<Route> tab={tab} init={init} nonce={nonce} roots={ROOT_OF} labelOf={labelOf} home="中枢">{children}</DrillShell>
}

/* ---------- 共用小件 ---------- */
export function KindTag({ k }: { k: AssetKind }) {
  return <span className="tag" style={{ color: KIND_COLOR[k], borderColor: KIND_COLOR[k] + '55', background: KIND_COLOR[k] + '10' }}>{k}</span>
}
export function SensTag({ s }: { s: Sens }) {
  return <span className={`tag ${s === '敏感' ? 'tag-bad' : s === '内部' ? '' : 'tag-ok'}`}>{s}</span>
}
export function StatusTag({ s }: { s: AssetStatus | string }) {
  const c = s === '已发布' || s === '已完成' || s === '现行' || s === '通过' ? 'tag-ok' : s === '待审核' || s === '待复核' || s === '待生效' || s === '处理中' || s === '待审' || s === '待处理' ? 'tag-warn' : s === '已下线' || s === '退回' || s === '已退回' ? 'tag-bad' : ''
  return <span className={`tag ${c}`}>{s}</span>
}
export function Kpi({ k, v, d, gold, onClick, spark }: { k: string; v: ReactNode; d?: string; gold?: boolean; onClick?: () => void; spark?: number[] }) {
  return (
    <div className={`hkpi ${gold ? 'gold' : ''}`} onClick={onClick}>
      <div className="k">{k}</div>
      <div className="v num">{v}</div>
      {d && <div className="d">{d}</div>}
      {spark && <svg className="spark" width="64" height="22" viewBox="0 0 64 22"><polyline fill="none" stroke={gold ? 'var(--gold)' : 'var(--indigo-2)'} strokeWidth="1.5"
        points={spark.map((y, i) => `${(i / (spark.length - 1)) * 62 + 1},${21 - (y - Math.min(...spark)) / Math.max(1, Math.max(...spark) - Math.min(...spark)) * 18}`).join(' ')} /></svg>}
    </div>
  )
}
export function Field({ k, v }: { k: string; v: ReactNode }) {
  return <div className="mb-2.5"><div className="text-[11px] text-slate-500 mb-0.5">{k}</div><div className="text-[12.5px] leading-relaxed">{v}</div></div>
}
export function AreaChart({ data, keys, colors, h = 150, labels }: { data: number[][]; keys: string[]; colors: string[]; h?: number; labels: string[] }) {
  const [ref, w0] = useWidth<HTMLDivElement>()
  const w = Math.max(320, w0), pad = 30
  const max = Math.max(...data.flat()) * 1.12
  const n = data[0].length
  const x = (i: number) => pad + (i / (n - 1)) * (w - pad * 2)
  const y = (v: number) => h - 18 - (v / max) * (h - 30)
  const every = Math.max(1, Math.ceil(n / Math.max(4, Math.floor((w - pad * 2) / 64))))
  return (
    <div ref={ref} className="w-full">
      {w0 > 0 && <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        {[0, .25, .5, .75, 1].map(g => <line key={g} x1={pad} x2={w - pad} y1={y(max * g)} y2={y(max * g)} stroke="#e8edf5" />)}
        {data.map((row, k) => {
          const pts = row.map((v, i) => `${x(i)},${y(v)}`).join(' ')
          return <g key={k}>
            <polygon points={`${x(0)},${y(0)} ${pts} ${x(row.length - 1)},${y(0)}`} fill={colors[k]} opacity=".07" />
            <polyline points={pts} fill="none" stroke={colors[k]} strokeWidth="1.8" strokeLinejoin="round" strokeDasharray="2400" strokeDashoffset="2400" style={{ animation: 'dash-draw 1.6s ease-out forwards', animationDelay: `${k * .2}s` }} />
            {row.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="2" fill={colors[k]} />)}
          </g>
        })}
        {labels.map((l, i) => (i % every === 0 || i === labels.length - 1) && <text key={l + i} x={x(i)} y={h - 4} fontSize="10" fill="#8a94a6" textAnchor="middle">{l}</text>)}
        {keys.map((k, i) => <g key={k}><rect x={pad + i * 96} y={4} width="10" height="3" rx="1.5" fill={colors[i]} /><text x={pad + i * 96 + 14} y={8} fontSize="10" fill="#64748b">{k}</text></g>)}
        <style>{`@keyframes dash-draw { to { stroke-dashoffset: 0 } }`}</style>
      </svg>}
    </div>
  )
}
