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

/* 生成工作台的上一次生成结果：返回一级页后仍能看到产线与产出物 */
export const GEN_LAST: { key: string; log: string[]; unit: string; post: string; hours: number } = { key: '', log: [], unit: '', post: '', hours: 4 }
export function rememberGen(key: string, log: string[], unit: string, post: string, hours: number) { GEN_LAST.key = key; GEN_LAST.log = log; GEN_LAST.unit = unit; GEN_LAST.post = post; GEN_LAST.hours = hours }
