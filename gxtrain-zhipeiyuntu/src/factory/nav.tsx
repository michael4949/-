/* 课程工厂的分级路由与共用小件 */
import type { ReactNode } from 'react'
import { DrillShell, useDrill } from '../drill'
import type { CourseKind, OutputKind } from './data'
import { findCourse, questionById, microById, trainerById, PAPERS, DRAFTS } from './store'
import { MAIN_PROGRAMS, TOPIC_COURSES, CLASS_CAL } from '../data'
export { Typewriter, useWidth } from '../drill'
export { Kpi, Field, StatusTag, AreaChart } from '../hub/nav'

export type Route =
  | { v: 'board' }
  | { v: 'gen' } | { v: 'draft'; key: string } | { v: 'chapter'; course: string; no: number } | { v: 'output'; course: string; kind: OutputKind }
  | { v: 'lib'; unit?: string; kind?: CourseKind; status?: string; post?: string } | { v: 'course'; id: string } | { v: 'learn'; id: string }
  | { v: 'bank'; post?: string } | { v: 'question'; id: string } | { v: 'answers'; id: string } | { v: 'paper'; id: string }
  | { v: 'review' } | { v: 'reviewDetail'; id: string } | { v: 'note'; course: string; id: string }
  | { v: 'media' } | { v: 'micro'; id: string } | { v: 'scene'; micro: string; no: number }
  | { v: 'trainer' } | { v: 'trainerDetail'; id: string }
  | { v: 'analytics' } | { v: 'courseStats'; id: string } | { v: 'revision'; id: string }
  | { v: 'system' } | { v: 'program'; id: string } | { v: 'programBatch'; id: string; no: number } | { v: 'topic'; i: number } | { v: 'classDetail'; i: number }

export const ROOT_OF: Record<string, Route> = { board: { v: 'board' }, gen: { v: 'gen' }, lib: { v: 'lib' }, system: { v: 'system' }, bank: { v: 'bank' }, review: { v: 'review' }, media: { v: 'media' }, trainer: { v: 'trainer' }, analytics: { v: 'analytics' } }
export function labelOf(r: Route): string {
  switch (r.v) {
    case 'board': return '工厂驾驶舱'
    case 'gen': return '课件生成工作台'
    case 'draft': return DRAFTS[r.key]?.name ?? '生成结果'
    case 'chapter': return `${findCourse(r.course)?.chapters[r.no]?.no ?? ''} ${findCourse(r.course)?.chapters[r.no]?.title ?? '章节'}`
    case 'output': return `${r.kind}预览`
    case 'lib': return r.unit ? `课程库 · ${r.unit.replace(/（.*）/, '')}` : r.status ? `课程库 · ${r.status}` : '课程库'
    case 'course': return findCourse(r.id)?.name ?? r.id
    case 'learn': return '学习数据'
    case 'bank': return r.post ? `题库 · ${r.post}` : '题库工作台'
    case 'question': return `${r.id} ${questionById(r.id)?.stem.slice(0, 16) ?? ''}`
    case 'answers': return '作答分析'
    case 'paper': return PAPERS[r.id]?.name ?? '试卷'
    case 'review': return '审核工作流'
    case 'reviewDetail': return `审核 · ${findCourse(r.id)?.name ?? r.id}`
    case 'note': return '页级批注'
    case 'media': return '微课工作室'
    case 'micro': return microById(r.id)?.title ?? r.id
    case 'scene': return `分镜 ${r.no}`
    case 'trainer': return '内训师工作台'
    case 'trainerDetail': return trainerById(r.id)?.name ?? r.id
    case 'analytics': return '课程效果分析'
    case 'courseStats': return `效果 · ${findCourse(r.id)?.name ?? r.id}`
    case 'revision': return '修订任务'
    case 'system': return '课程体系'
    case 'program': return MAIN_PROGRAMS.find(p => p.id === r.id)?.name ?? '主干项目'
    case 'programBatch': return `第 ${r.no} 期`
    case 'topic': return TOPIC_COURSES[r.i]?.name ?? '专题课'
    case 'classDetail': return CLASS_CAL[r.i]?.n ?? '班次'
  }
}
export const useNav = () => useDrill<Route>()
export function FactoryShell({ tab, init, nonce, children }: { tab: string; init?: Route; nonce?: number; children: (r: Route, level: number) => ReactNode }) {
  return <DrillShell<Route> tab={tab} init={init} nonce={nonce} roots={ROOT_OF} labelOf={labelOf} home="工厂">{children}</DrillShell>
}

export const KIND_COLOR: Record<CourseKind, string> = { 必修课: '#1e3a6e', 专题课: '#2f6df6', 岗位入门: '#19b8d8', 复训课: '#b08a3e', 微课: '#7b5cf5' }
export function KindTag({ k }: { k: CourseKind }) {
  return <span className="tag" style={{ color: KIND_COLOR[k], borderColor: KIND_COLOR[k] + '55', background: KIND_COLOR[k] + '12' }}>{k}</span>
}
export function QTag({ k }: { k: string }) {
  const c: Record<string, string> = { 单选: '#2f6df6', 多选: '#7b5cf5', 判断: '#178a54', 情景: '#b08a3e' }
  return <span className="tag" style={{ color: c[k] ?? '#1e3a6e', borderColor: (c[k] ?? '#1e3a6e') + '55', background: (c[k] ?? '#1e3a6e') + '12' }}>{k}</span>
}
export function Diff({ d }: { d: number }) {
  return <span className="inline-flex gap-[2px] align-middle">{[1, 2, 3, 4, 5].map(i => <i key={i} className="w-[6px] h-[10px] rounded-[2px]" style={{ background: i <= d ? (d >= 4 ? 'var(--bad)' : d >= 3 ? 'var(--warn)' : 'var(--ok)') : '#e2e8f0' }} />)}</span>
}
