/* 运行期会话：多会话、多轮上下文、回答索引；页面切换与下钻返回后对话仍在 */
import type { Answer, Ctx } from './engine'

export type Turn = { id: string; q: string; a?: Answer; at: string; pending?: boolean; fb?: 'up' | 'down' }
export type Session = { id: string; title: string; role: string; at: string; turns: Turn[]; ctx: Ctx; pinned?: boolean }
let seq = 0
const now = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }
export const SESSIONS: Session[] = [
  { id: 's0', title: '新会话', role: 'dept', at: now(), turns: [], ctx: {} },
  { id: 's1', title: '全公司岗位能力达标率', role: 'dept', at: '昨天 16:20', turns: [], ctx: { metric: 'ready', key: '全公司', dim: '单位' }, pinned: true },
  { id: 's2', title: '规程修订后受影响的课件', role: 'dept', at: '昨天 09:41', turns: [], ctx: {} },
  { id: 's3', title: '陪练上线后通过率变化', role: 'dept', at: '09-12', turns: [], ctx: { metric: 'pass' } },
  { id: 's4', title: '95598 停电投诉受理时限', role: 'cs', at: '09-11', turns: [], ctx: {} },
  { id: 's5', title: '财务部必修课完成情况', role: 'fin', at: '09-10', turns: [], ctx: { metric: 'done', key: '财务部', dim: '科室' } },
]
export let currentId = 's0'
export const ANSWERS: Record<string, Answer> = {}
export const current = () => SESSIONS.find(s => s.id === currentId) ?? SESSIONS[0]
export function switchSession(id: string) { currentId = id }
export function newSession(role: string) { const s: Session = { id: `s${Date.now()}`, title: '新会话', role, at: now(), turns: [], ctx: {} }; SESSIONS.unshift(s); currentId = s.id; return s }
export function addTurn(q: string): Turn { const s = current(); const t: Turn = { id: `t${++seq}`, q, at: now(), pending: true }; s.turns.push(t); if (s.title === '新会话') s.title = q.slice(0, 18); return t }
export function resolveTurn(t: Turn, a: Answer, ctx: Ctx) { t.a = a; t.pending = false; ANSWERS[a.id] = a; current().ctx = ctx }
export const answerById = (id: string) => ANSWERS[id]
export function togglePin(id: string) { const s = SESSIONS.find(x => x.id === id); if (s) s.pinned = !s.pinned }
