/* 运行期状态：生成的草稿、组出的试卷、审核批注状态；跨页面共享 */
import type { Course, Paper } from './data'
import { findCourse as findBase, questionById, microById, trainerById, SESSION_COURSES } from './data'
export { questionById, microById, trainerById }
export const DRAFTS: Record<string, Course> = {}
export const PAPERS: Record<string, Paper> = {}
export function findCourse(id: string): Course | undefined { return findBase(id) ?? Object.values(DRAFTS).find(d => d.id === id) }
export function addDraft(key: string, c: Course) { DRAFTS[key] = c }
export function submitDraft(c: Course) { if (!SESSION_COURSES.some(x => x.id === c.id)) SESSION_COURSES.unshift({ ...c, status: '内训师审核中', owner: '待指定内训师' }) }
export function addPaper(p: Paper) { PAPERS[p.id] = p }
