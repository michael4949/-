/* 成长地图的分级路由与共用小件 */
import type { ReactNode } from 'react'
import { DrillShell, useDrill } from '../drill'
import { personById, postModelById, gapById, COHORTS, short } from './data'
export { Typewriter, useWidth } from '../drill'
export { Kpi, Field, StatusTag, AreaChart } from '../hub/nav'

export type Route =
  | { v: 'board' }
  | { v: 'person'; id?: string; unit?: string; team?: string } | { v: 'ability'; p: string; k: string; unit?: string; team?: string } | { v: 'evidence'; p: string; idx: number; unit?: string; team?: string } | { v: 'compare'; p: string; unit?: string; team?: string } | { v: 'pathSim'; p: string; unit?: string; team?: string }
  | { v: 'unit' } | { v: 'unitDetail'; name: string } | { v: 'teamDetail'; unit: string; team: string }
  | { v: 'matrix' } | { v: 'postModel'; id: string } | { v: 'abilityDef'; id: string; k: string }
  | { v: 'gaps' } | { v: 'gapDetail'; id: string } | { v: 'gapPeople'; id: string }
  | { v: 'talent' } | { v: 'pool'; box: string } | { v: 'succession'; post: string }
  | { v: 'journey' } | { v: 'cohort'; id: string } | { v: 'cohortStage'; id: string; m: number }
  | { v: 'insight' } | { v: 'scenario'; coach: number; course: number; mentor: number } | { v: 'scenarioUnit'; coach: number; course: number; mentor: number; unit: string }

export const ROOT_OF: Record<string, Route> = { board: { v: 'board' }, person: { v: 'person' }, unit: { v: 'unit' }, matrix: { v: 'matrix' }, gaps: { v: 'gaps' }, talent: { v: 'talent' }, journey: { v: 'journey' }, insight: { v: 'insight' } }
export function labelOf(r: Route): string {
  switch (r.v) {
    case 'board': return '地图驾驶舱'
    case 'person': return r.id ? (personById(r.id, r.unit, r.team)?.name ?? '个人') + ' · 成长地图' : '个人成长地图'
    case 'ability': return `能力项 · ${r.k}`
    case 'evidence': return '证据记录'
    case 'compare': return '对比'
    case 'pathSim': return '晋级模拟'
    case 'unit': return '单位能力全景'
    case 'unitDetail': return short(r.name)
    case 'teamDetail': return r.team
    case 'matrix': return '岗位能力模型'
    case 'postModel': return `${postModelById(r.id)?.post ?? ''} 模型`
    case 'abilityDef': return `能力项 · ${r.k}`
    case 'gaps': return '缺口与预警'
    case 'gapDetail': return `缺口 · ${gapById(r.id)?.ability ?? ''}`
    case 'gapPeople': return '人员清单'
    case 'talent': return '人才梯队'
    case 'pool': return r.box
    case 'succession': return `继任 · ${r.post}`
    case 'journey': return '成长轨迹'
    case 'cohort': return COHORTS.find(c => c.id === r.id)?.name ?? r.id
    case 'cohortStage': return `第 ${r.m} 月节点`
    case 'insight': return 'AI 预测与干预'
    case 'scenario': return '干预方案'
    case 'scenarioUnit': return short(r.unit)
  }
}
export const useNav = () => useDrill<Route>()
export function AtlasShell({ tab, init, nonce, children }: { tab: string; init?: Route; nonce?: number; children: (r: Route, level: number) => ReactNode }) {
  return <DrillShell<Route> tab={tab} init={init} nonce={nonce} roots={ROOT_OF} labelOf={labelOf} home="地图">{children}</DrillShell>
}
export function Delta({ v, unit = '' }: { v: number; unit?: string }) { return <span className="num" style={{ color: v > 0 ? 'var(--ok)' : v < 0 ? 'var(--bad)' : '#94a3b8' }}>{v > 0 ? '↑' : v < 0 ? '↓' : '—'} {Math.abs(v)}{unit}</span> }
export function PriTag({ p }: { p: string }) { return <span className={`tag ${p === 'P1' ? 'tag-bad' : p === 'P2' ? 'tag-warn' : ''}`}>{p}</span> }
