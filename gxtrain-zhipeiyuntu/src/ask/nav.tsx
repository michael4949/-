/* 问数助手的分级路由与共用小件 */
import type { ReactNode } from 'react'
import { DrillShell, useDrill } from '../drill'
import { answerById } from './store'
import { metricById, skillById, channelById, gapById, reviewById, HOTS } from './data'
export { Typewriter, useWidth } from '../drill'
export { Kpi, Field, StatusTag, AreaChart } from '../hub/nav'

export type Route =
  | { v: 'board' }
  | { v: 'chat'; q?: string; role?: string } | { v: 'drill'; a: string } | { v: 'trace'; a: string } | { v: 'row'; a: string; name: string }
  | { v: 'hot' } | { v: 'hotDetail'; rank: number } | { v: 'hotAction'; rank: number; idx: number }
  | { v: 'gaps' } | { v: 'gap'; id: string } | { v: 'gapDraft'; id: string }
  | { v: 'metrics' } | { v: 'metric'; id: string } | { v: 'lineage'; id: string; node: string }
  | { v: 'skills' } | { v: 'skill'; id: string } | { v: 'skillLog'; id: string }
  | { v: 'quality' } | { v: 'reviewItem'; id: string } | { v: 'rewrite'; id: string }
  | { v: 'channels' } | { v: 'channel'; id: string } | { v: 'channelUnit'; id: string; unit: string }

export const ROOT_OF: Record<string, Route> = { board: { v: 'board' }, chat: { v: 'chat' }, hot: { v: 'hot' }, gaps: { v: 'gaps' }, metrics: { v: 'metrics' }, skills: { v: 'skills' }, quality: { v: 'quality' }, channels: { v: 'channels' } }
export function labelOf(r: Route): string {
  switch (r.v) {
    case 'board': return '助手驾驶舱'
    case 'chat': return '问答工作台'
    case 'drill': return `数据下钻 · ${answerById(r.a)?.caliber?.name ?? ''}`
    case 'trace': return '答案溯源'
    case 'row': return r.name
    case 'hot': return '提问热度榜'
    case 'hotDetail': return HOTS.find(h => h.rank === r.rank)?.q ?? '提问明细'
    case 'hotAction': return HOTS.find(h => h.rank === r.rank)?.actions[r.idx]?.k ?? '触发动作'
    case 'gaps': return '知识缺口'
    case 'gap': return gapById(r.id)?.topic ?? r.id
    case 'gapDraft': return '条目草稿'
    case 'metrics': return '数据口径中心'
    case 'metric': return metricById(r.id)?.name ?? r.id
    case 'lineage': return `血缘 · ${r.node}`
    case 'skills': return '助手技能'
    case 'skill': return skillById(r.id)?.name ?? r.id
    case 'skillLog': return '调用日志'
    case 'quality': return '回答质量'
    case 'reviewItem': return reviewById(r.id)?.q ?? r.id
    case 'rewrite': return '改写对比'
    case 'channels': return '渠道与嵌入'
    case 'channel': return channelById(r.id)?.name ?? r.id
    case 'channelUnit': return r.unit
  }
}
export const useNav = () => useDrill<Route>()
export function AskShell({ tab, init, nonce, children }: { tab: string; init?: Route; nonce?: number; children: (r: Route, level: number) => ReactNode }) {
  return <DrillShell<Route> tab={tab} init={init} nonce={nonce} roots={ROOT_OF} labelOf={labelOf} home="助手">{children}</DrillShell>
}
export function KindTag({ k }: { k: string }) {
  const c: Record<string, string> = { 知识: '#b08a3e', 数据: '#2f6df6', 混合: '#7b5cf5', 动作: '#178a54', 未命中: '#c2402f', 查询: '#2f6df6', 生成: '#7b5cf5', 执行: '#178a54', 提醒: '#b08a3e' }
  const col = c[k] ?? '#1e3a6e'
  return <span className="tag" style={{ color: col, borderColor: col + '55', background: col + '12' }}>{k}</span>
}
export function Spark({ v, color = 'var(--ai)' }: { v: number[]; color?: string }) {
  const mn = Math.min(...v), mx = Math.max(...v)
  return <svg width="64" height="20" viewBox="0 0 64 20"><polyline fill="none" stroke={color} strokeWidth="1.5" points={v.map((y, i) => `${(i / (v.length - 1)) * 62 + 1},${19 - (y - mn) / Math.max(1, mx - mn) * 17}`).join(' ')} /></svg>
}
