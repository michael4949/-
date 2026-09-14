/* 千人千面计划的分级路由与共用小件 */
import type { ReactNode } from 'react'
import { DrillShell, useDrill } from '../drill'
import { demandById, classById, personById, short, KIND_COLOR } from './data'
import type { Kind } from './data'
export { Typewriter, useWidth } from '../drill'
export { Kpi, Field, StatusTag } from '../hub/nav'
export { Delta, PriTag } from '../atlas/nav'

export type Route =
  | { v: 'board' }
  | { v: 'engine' } | { v: 'engineRun'; grp: string; unit: string } | { v: 'engineItem'; unit: string; team: string; pid: string }
  | { v: 'idp'; id?: string; unit?: string; team?: string } | { v: 'idpItem'; pid: string; id: string; unit?: string; team?: string } | { v: 'idpEvidence'; pid: string; id: string; unit?: string; team?: string }
  | { v: 'agg' } | { v: 'aggCourse'; id: string } | { v: 'aggClass'; id: string; no: number }
  | { v: 'schedule' } | { v: 'schedClass'; id: string } | { v: 'schedConflict'; id: string }
  | { v: 'budget' } | { v: 'budgetUnit'; name: string } | { v: 'budgetLine'; name: string; cat: string }
  | { v: 'track' } | { v: 'trackUnit'; name: string } | { v: 'trackPerson'; name: string; pid: string; team: string }
  | { v: 'insight' } | { v: 'optScenario'; cap: number; online: number; coach: number } | { v: 'optUnit'; cap: number; online: number; coach: number; unit: string }

export const ROOT_OF: Record<string, Route> = { board: { v: 'board' }, engine: { v: 'engine' }, idp: { v: 'idp' }, agg: { v: 'agg' }, schedule: { v: 'schedule' }, budget: { v: 'budget' }, track: { v: 'track' }, insight: { v: 'insight' } }
export function labelOf(r: Route): string {
  switch (r.v) {
    case 'board': return '计划驾驶舱'
    case 'engine': return '计划生成引擎'
    case 'engineRun': return `生成结果 · ${short(r.unit)}`
    case 'engineItem': return `${personById(r.pid, r.unit, r.team)?.name ?? ''} 的计划依据`
    case 'idp': return r.id ? `${personById(r.id, r.unit, r.team)?.name ?? '个人'} · IDP` : 'IDP 联动视图'
    case 'idpItem': return '计划条目'
    case 'idpEvidence': return '完成证据'
    case 'agg': return '需求汇总'
    case 'aggCourse': return demandById(r.id)?.c ?? '课程需求'
    case 'aggClass': return `第 ${r.no} 期`
    case 'schedule': return '排期与冲突'
    case 'schedClass': return classById(r.id)?.name ?? '班次'
    case 'schedConflict': return '冲突处置'
    case 'budget': return '预算与投入'
    case 'budgetUnit': return short(r.name)
    case 'budgetLine': return r.cat
    case 'track': return '执行跟踪'
    case 'trackUnit': return short(r.name)
    case 'trackPerson': return personById(r.pid, r.name, r.team)?.name ?? '个人'
    case 'insight': return 'AI 优化与预测'
    case 'optScenario': return '优化方案'
    case 'optUnit': return short(r.unit)
  }
}
export const useNav = () => useDrill<Route>()
export function PlanShell({ tab, init, nonce, children }: { tab: string; init?: Route; nonce?: number; children: (r: Route, level: number) => ReactNode }) {
  return <DrillShell<Route> tab={tab} init={init} nonce={nonce} roots={ROOT_OF} labelOf={labelOf} home="计划">{children}</DrillShell>
}
export function KindTag({ k }: { k: Kind | string }) { const c = KIND_COLOR[k as Kind] ?? '#1e3a6e'; return <span className="tag" style={{ color: c, borderColor: c + '55', background: c + '12' }}>{k}</span> }
export function StTag({ s }: { s: string }) { return <span className={`tag ${s === '已完成' ? 'tag-ok' : s === '进行中' || s === '报名中' ? 'tag-warn' : s === '逾期' || s.startsWith('未通过') || s === '待排期' ? 'tag-bad' : s === '已满员' ? 'tag-gold' : ''}`}>{s}</span> }
