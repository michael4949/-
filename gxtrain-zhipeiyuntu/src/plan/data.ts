/* 千人千面计划数据层：个人计划、单位计划、需求汇总、班次排期、预算、执行跟踪、优化预测
   全部由成长地图的人员与缺口、单位规模、课程体系推导，稳定可复现 */
import { UNITS, UNIT_GROUPS } from '../units'
import type { UnitDef, UnitGroup } from '../units'
import { BUREAUS, PLAN_INPUTS, IDP_ITEMS, PLAN_AGG, TOPIC_COURSES, CLASS_CAL, MAIN_PROGRAMS } from '../data'
import { MAIN_PERSON, ALL_PEOPLE, GAPS, unitReady, bureauReady, short, isFunc, isBureauUnit, unitOf, teamPersons, postOfTeam } from '../atlas/data'
import type { Person } from '../atlas/data'
import { COURSES } from '../factory/data'
import { COACHES } from '../coach/data'

const hash = (s: string) => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h }
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
export const NOW_M = 9
export const MONTHS = ['1 月', '2 月', '3 月', '4 月', '5 月', '6 月', '7 月', '8 月', '9 月', '10 月', '11 月', '12 月']
export { PLAN_INPUTS, BUREAUS, UNITS, UNIT_GROUPS, short, MAIN_PERSON }

/* ---------- 学习形式 ---------- */
export type Kind = '课程' | '陪练' | '带教' | '集训' | '考试' | '认定' | '辅导'
export const KINDS: Kind[] = ['课程', '陪练', '带教', '集训', '考试', '认定', '辅导']
export const KIND_COLOR: Record<Kind, string> = { 课程: '#1e3a6e', 陪练: '#2f6df6', 带教: '#19b8d8', 集训: '#7b5cf5', 考试: '#b08a3e', 认定: '#d8b565', 辅导: '#94a3b8' }
export const KIND_COST: Record<Kind, number> = { 课程: 180, 陪练: 60, 带教: 240, 集训: 1800, 考试: 40, 认定: 320, 辅导: 120 }
export type Src = '能力缺口' | '岗位与等级' | '单位重点' | '个人意向'
export type St = '已完成' | '进行中' | '待开始' | '逾期' | '未通过 · 需重练'
export type PlanItem = { id: string; n: string; kind: Kind; h: number; m: number; q: number; st: St; src: Src; ability: string; score: number; cost: number; courseId?: string; coachId?: string; gain: number; reason: string }

/* ---------- 个人计划 ---------- */
const ST_OF = (m: number, seed: number): St => m < NOW_M ? (seed % 9 === 0 ? '未通过 · 需重练' : seed % 7 === 0 ? '逾期' : '已完成') : m === NOW_M ? '进行中' : '待开始'
export function personPlan(p: Person): PlanItem[] {
  if (p.id === MAIN_PERSON.id) {
    const map: Record<string, Kind> = { 课程: '课程', 考试: '考试', 陪练: '陪练', 辅导: '辅导', 集训: '集训', 认定: '认定' }
    return IDP_ITEMS.flatMap((qq, qi) => qq.items.map((it, i) => { const m = qi * 3 + 1 + (i % 3); const kind = map[it.k] ?? '课程'; return { id: `mp-${qi}-${i}`, n: it.n, kind, h: it.h, m, q: qi + 1, st: it.st as St, src: (i === 0 ? '能力缺口' : i === 1 ? '岗位与等级' : '单位重点') as Src, ability: ['继电保护', '安全规程', '异常处置', '倒闸操作', '设备巡视', '继电保护', '调度配合', '异常处置', '倒闸操作', '异常处置', '异常处置', '继电保护'][qi * 3 + i] ?? '异常处置', score: 92 - qi * 6 - i * 3, cost: KIND_COST[kind] * (kind === '集训' ? 1 : it.h / 4), courseId: kind === '课程' ? COURSES[(qi * 3 + i) % 40].id : undefined, coachId: kind === '陪练' ? (i % 2 ? 'abn' : 'daozha') : undefined, gain: 3 + (i % 4), reason: i === 0 ? `来自成长地图缺口：${['继电保护', '异常处置', '异常处置', '异常处置'][qi]}差 ${4 + qi * 2} 分` : i === 1 ? '技师申报要求项' : '南宁供电局年度重点：迎峰度夏保供' } }))
  }
  const s = hash(p.id)
  const gaps = p.abilities.filter(a => a.v < a.need).sort((a, b) => (b.need - b.v) - (a.need - a.v))
  const items: PlanItem[] = []
  gaps.forEach((g, i) => {
    const c = COURSES[(s + i * 7) % 40], k = COACHES[(s + i) % COACHES.length]
    const m1 = 1 + ((s >>> i) % 10)
    items.push({ id: `${p.id}-c${i}`, n: c.name, kind: '课程', h: c.hours, m: m1, q: Math.ceil(m1 / 3), st: ST_OF(m1, s + i), src: '能力缺口', ability: g.k, score: 95 - i * 6, cost: KIND_COST.课程 * c.hours / 4, courseId: c.id, gain: 4 + (i % 3), reason: `${g.k}差 ${g.need - g.v} 分，课程覆盖该能力项的 ${60 + (s % 30)}% 考点` })
    const m2 = Math.min(12, m1 + 1)
    items.push({ id: `${p.id}-p${i}`, n: `${k.n} · 专项陪练 ×2`, kind: '陪练', h: 2, m: m2, q: Math.ceil(m2 / 3), st: ST_OF(m2, s + i + 3), src: '能力缺口', ability: g.k, score: 90 - i * 5, cost: KIND_COST.陪练 * 2, coachId: k.id, gain: 5 + (i % 4), reason: '课程后 2 周内陪练，巩固效果最好' })
  })
  const me = 3 + (s % 8)
  items.push({ id: `${p.id}-e`, n: isFunc(UNITS.find(u => u.name === p.unit)) ? '制度规程年度考试' : '安规年度考试', kind: '考试', h: 2, m: me, q: Math.ceil(me / 3), st: ST_OF(me, s + 11), src: '岗位与等级', ability: p.abilities[4].k, score: 88, cost: KIND_COST.考试, gain: 2, reason: '岗位年度必考' })
  const mu = 6 + (s % 5)
  items.push({ id: `${p.id}-u`, n: p.unit.includes('地市') ? '迎峰度夏保供专题' : p.unit.includes('营销') ? '线损治理专题' : 'AI 工具在本岗位的应用', kind: '课程', h: 4, m: mu, q: Math.ceil(mu / 3), st: ST_OF(mu, s + 13), src: '单位重点', ability: p.abilities[3].k, score: 80, cost: KIND_COST.课程, gain: 2, reason: '本单位年度重点，全员必修' })
  if (gaps.length < 3) { const mm = 10 + (s % 3); items.push({ id: `${p.id}-g`, n: `${p.nextGrade}等级认定`, kind: '认定', h: 4, m: mm, q: 4, st: ST_OF(mm, s), src: '岗位与等级', ability: '综合', score: 85, cost: KIND_COST.认定, gain: 0, reason: `距${p.nextGrade}仅差 ${gaps.length} 项，本年可申报` }) }
  const mi = 4 + (s % 6)
  items.push({ id: `${p.id}-i`, n: ['内训师 AI 造课训战营', '技术比武集训', '数字化专责轮训', '班组长带班能力提升'][s % 4], kind: s % 4 === 0 ? '集训' : '辅导', h: s % 4 === 0 ? 24 : 6, m: mi, q: Math.ceil(mi / 3), st: ST_OF(mi, s + 5), src: '个人意向', ability: '发展方向', score: 70, cost: s % 4 === 0 ? KIND_COST.集训 : KIND_COST.辅导, gain: 1, reason: 'IDP 填写的发展意向' })
  return items.sort((a, b) => a.m - b.m)
}
export const planHours = (items: PlanItem[]) => items.reduce((s, i) => s + i.h, 0)
export const planDone = (items: PlanItem[]) => Math.round(items.filter(i => i.st === '已完成').length / Math.max(1, items.length) * 100)
export const personById = (id: string, unit?: string, team?: string) => { if (id === MAIN_PERSON.id) return MAIN_PERSON; const pool = unit && team ? teamPersons(unit, team, postOfTeam(team)) : []; return pool.find(p => p.id === id) ?? ALL_PEOPLE.find(p => p.id === id) }

/* ---------- 单位计划 ---------- */
export type UnitPlan = { name: string; grp: UnitGroup | '地市局'; people: number; hours: number; avgH: number; done: number; budget: number; spent: number; overdue: number; planned: number[]; actual: number[]; risk: '低' | '中' | '高' }
function build(name: string, grp: UnitGroup | '地市局', people: number, ready: number): UnitPlan {
  const h = hash(name)
  const avgH = clamp(Math.round(50 + ((h % 40) - 12) + (grp === '本部职能部门' ? -12 : 0) + (grp === '地市局' && (h % 3 === 0) ? 10 : 0)), 28, 86)
  const done = clamp(Math.round(ready - 4 + ((h % 13) - 6)), 62, 96)
  const budget = Math.round(people * avgH * 34 / 10000 * 10) / 10
  const spent = Math.round(budget * (NOW_M / 12) * (done / 88) * 10) / 10
  const planned = MONTHS.map((_, i) => Math.round(people * avgH / 12 * [.6, .5, 1.1, 1.2, 1.1, 1.0, .7, .8, 1.3, 1.4, 1.3, 1.0][i]))
  const actual = planned.map((v, i) => i < NOW_M - 1 ? Math.round(v * (done / 100 + ((h >>> i) % 11 - 5) / 100)) : i === NOW_M - 1 ? Math.round(v * .42) : 0)
  return { name, grp, people, hours: people * avgH, avgH, done, budget, spent, overdue: Math.round(people * (100 - done) / 100 * .18), planned, actual, risk: done < 75 ? '高' : done < 82 ? '中' : '低' }
}
export const UNIT_PLANS: UnitPlan[] = UNITS.map(u => build(u.name, u.grp, u.people, unitReady(u)))
export const BUREAU_PLANS: UnitPlan[] = BUREAUS.map((b, i) => build(b, '地市局', 1800 + (hash(b) % 1500) + (i < 3 ? 900 : 0), bureauReady(b)))
export const unitPlanOf = (name: string) => UNIT_PLANS.find(x => x.name === name || short(x.name) === name) ?? BUREAU_PLANS.find(x => x.name === name)
export const TOTAL = { plans: 45694, hours: UNIT_PLANS.reduce((s, u) => s + u.hours, 0), done: 82.3, budget: Math.round(UNIT_PLANS.reduce((s, u) => s + u.budget, 0) * 10) / 10, spent: Math.round(UNIT_PLANS.reduce((s, u) => s + u.spent, 0) * 10) / 10, overdue: UNIT_PLANS.reduce((s, u) => s + u.overdue, 0) }
export const MONTH_PLAN = MONTHS.map((_, i) => UNIT_PLANS.reduce((s, u) => s + u.planned[i], 0))
export const MONTH_ACT = MONTHS.map((_, i) => UNIT_PLANS.reduce((s, u) => s + u.actual[i], 0))
export const KIND_MIX = [{ k: '课程', n: 41 }, { k: '陪练', n: 24 }, { k: '带教', n: 9 }, { k: '集训', n: 8 }, { k: '考试', n: 10 }, { k: '认定', n: 5 }, { k: '辅导', n: 3 }].map(x => ({ ...x, c: KIND_COLOR[x.k as Kind] }))
export const SRC_MIX = PLAN_INPUTS.map(p => ({ k: p.k, n: p.w, c: ['#1e3a6e', '#2f6df6', '#b08a3e', '#19b8d8'][PLAN_INPUTS.indexOf(p)] }))

/* ---------- 生成引擎 ---------- */
export type EngineScope = { grp: UnitGroup | '全部'; grade: string; onlyGaps: boolean }
export function engineStats(w: number[], scope: EngineScope) {
  const units = scope.grp === '全部' ? UNITS : UNITS.filter(u => u.grp === scope.grp)
  const people = Math.round(units.reduce((s, u) => s + u.people, 0) * (scope.grade === '全部' ? 1 : .34) * (scope.onlyGaps ? .61 : 1))
  const wsum = w.reduce((a, b) => a + b, 0) || 1
  const avgItems = Math.round((5.2 + w[0] / wsum * 4 + w[3] / wsum * 1.5) * 10) / 10
  const avgH = Math.round(38 + w[0] / wsum * 30 + w[2] / wsum * 22)
  const budget = Math.round(people * avgH * 34 / 10000)
  const conflicts = Math.round(people / 1200 + w[2] / wsum * 20)
  const classes = Math.round(people * avgItems * .18 / 40)
  return { people, avgItems, avgH, budget, conflicts, classes, units: units.length }
}
export const ENGINE_STEPS = ['读取能力缺口与岗位要求', '匹配课程、陪练、带教资源', '与检修计划、迎峰度夏节点校验冲突', '按学时上限与季度均衡排布', '生成 IDP 条目并派发']

/* ---------- 需求汇总 ---------- */
export type Demand = { id: string; c: string; line: string; n: number; cls: number; pri: '高' | '中' | '低'; per: string; hours: number; online: boolean; cost: number; byGrp: number[]; byBureau: number[]; src: string; courseId?: string }
const spread = (n: number, seed: string, k: number, bias?: number[]) => { const ws = Array.from({ length: k }).map((_, i) => (bias?.[i] ?? 1) * (0.5 + (hash(seed + i) % 100) / 100)); const t = ws.reduce((a, b) => a + b, 0); return ws.map(w => Math.round(n * w / t)) }
export const DEMANDS: Demand[] = [
  ...PLAN_AGG.map((a, i) => ({ id: `d${i}`, c: a.c, line: ['变电', '变电', '配电', '变电', '调度', '营销', '职能'][i], n: a.n, cls: a.cls, pri: a.pri as '高' | '中', per: a.per, hours: [8, 6, 4, 4, 2, 6, 4][i], online: a.per.includes('线上'), cost: Math.round(a.n * [8, 6, 4, 4, 2, 6, 4][i] * 34 / 10000 * 10) / 10, byGrp: spread(a.n, a.c, 5, i === 6 ? [3, 1.2, 4, 1, .6] : [.15, .6, 5, 1.2, .3]), byBureau: spread(Math.round(a.n * .7), a.c + 'b', 14), src: i === 6 ? '主干项目：全员 AI 素养' : '成长地图缺口', courseId: COURSES[i * 5 % 40].id })),
  ...GAPS.slice(0, 5).map((g, i) => ({ id: `g${i}`, c: g.fix[0].n, line: g.line, n: g.people, cls: Math.ceil(g.people / 40), pri: (g.priority === 'P1' ? '高' : g.priority === 'P2' ? '中' : '低') as '高' | '中' | '低', per: g.priority === 'P1' ? '省公司统一开班' : '地市局分批', hours: g.fix[0].hours, online: false, cost: g.cost, byGrp: spread(g.people, g.id, 5, g.line === '职能' ? [4, 1, 1, .5, .5] : [.2, .8, 5, 1, .3]), byBureau: spread(Math.round(g.people * .7), g.id + 'b', 14), src: `缺口 ${g.ability}`, courseId: g.fix[0].id })),
  ...TOPIC_COURSES.slice(0, 4).map((t, i) => ({ id: `t${i}`, c: t.name, line: '职能', n: t.n, cls: Math.ceil(t.n / 45), pri: '中' as const, per: '专题课', hours: parseFloat(t.h) * 8, online: false, cost: Math.round(t.n * parseFloat(t.h) * 8 * 34 / 10000 * 10) / 10, byGrp: spread(t.n, t.name, 5, [4, 2, 2, .5, .5]), byBureau: spread(Math.round(t.n * .5), t.name + 'b', 14), src: `专题课 · ${t.dept}` })),
].sort((a, b) => b.n - a.n)
export const demandById = (id: string) => DEMANDS.find(d => d.id === id)
export const VENUES = ['培训评价中心', '省调培训室', '广西电科院', '柳州供电局', '南宁供电局', '线上']
export type ClassPlan = { id: string; d: string; no: number; name: string; venue: string; cap: number; sign: number; m: number; w: number; days: number; trainer: string; st: '已完成' | '进行中' | '报名中' | '已满员' | '待排期'; conflict?: string; units: string[]; demand?: string }
export const CLASSES: ClassPlan[] = (() => {
  const out: ClassPlan[] = []
  DEMANDS.forEach((d, di) => { const k = Math.min(4, d.cls); for (let i = 0; i < k; i++) { const h = hash(d.id + i); const m = 1 + (h % 12); const w = 1 + ((h >>> 4) % 4); const venue = d.online ? '线上' : VENUES[h % 5]; const conflict = (h >>> 2) % 4 === 0 && m >= NOW_M ? ['与迎峰度夏保供重叠', '与检修计划冲突', '场地已被占用', '讲师同期已排班'][h % 4] : undefined; out.push({ id: `cl-${di}-${i}`, d: `${String(m).padStart(2, '0')}-${String(w * 7 - 3).padStart(2, '0')}`, no: i + 1, name: `${d.c}（第 ${i + 1} 期）`, venue, cap: d.online ? 2000 : 40 + (h % 3) * 10, sign: 0, m, w, days: d.online ? 1 : Math.max(1, Math.round(d.hours / 8)), trainer: ['莫振华', '覃海波', '黄志远', '梁小燕', '陆志明', '数字人讲师'][h % 6], st: m < NOW_M ? '已完成' : m === NOW_M ? '进行中' : conflict ? '待排期' : h % 3 === 0 ? '已满员' : '报名中', conflict, units: BUREAUS.slice(h % 10, h % 10 + 3), demand: d.id }) } })
  out.forEach(c => { c.sign = c.st === '已满员' ? c.cap : c.st === '待排期' ? 0 : Math.round(c.cap * (.55 + (hash(c.id) % 40) / 100)) })
  CLASS_CAL.forEach((c, i) => out.push({ id: `cal-${i}`, d: c.d, no: 1, name: c.n, venue: c.p, cap: c.cap, sign: c.sign, m: parseInt(c.d.slice(0, 2)), w: Math.ceil(parseInt(c.d.slice(3)) / 7), days: 2, trainer: ['莫振华', '覃海波', '黄志远', '梁小燕'][i % 4], st: c.st as '报名中' | '已满员', units: BUREAUS.slice(i, i + 3) }))
  return out.sort((a, b) => a.m - b.m || a.w - b.w)
})()
export const classById = (id: string) => CLASSES.find(c => c.id === id)
export const CONFLICTS = CLASSES.filter(c => c.conflict)
export const CAL_HEAT = MONTHS.map((_, m) => [1, 2, 3, 4].map(w => CLASSES.filter(c => c.m === m + 1 && c.w === w).length))
export const RESOLVE: Record<string, string[]> = { 与迎峰度夏保供重叠: ['推迟至 10 月第 2 周', '拆为 2 个半天线上', '改由地市局分批'], 与检修计划冲突: ['改期至检修结束后一周', '改为线上直播 + 回放', '与检修单位对调名额'], 场地已被占用: ['改用广西电科院教室', '改期一周', '转线上'], 讲师同期已排班: ['更换为数字人讲师', '改期一周', '拆班由两名讲师承担'] }

/* ---------- 预算 ---------- */
export const BUDGET_CATS = ['课程与课件', '陪练与仿真', '集训与训战营', '带教与导师', '考试与认定', '差旅与场地']
export const CAT_SHARE = [.31, .14, .22, .09, .08, .16]
export const BUDGET_BY_GRP = UNIT_GROUPS.map(g => { const us = UNIT_PLANS.filter(u => u.grp === g); return { g, budget: Math.round(us.reduce((s, u) => s + u.budget, 0) * 10) / 10, spent: Math.round(us.reduce((s, u) => s + u.spent, 0) * 10) / 10 } })
export const budgetLines = (u: UnitPlan, cat: string) => { const ci = BUDGET_CATS.indexOf(cat); const total = u.budget * CAT_SHARE[ci]; const names = [['必修课采购与更新', '专题课开发', '微课制作', '课件版权'], ['陪练平台运行', '教练开发', '仿真场景更新'], ['训战营住宿与教材', '外聘导师', '集训场地'], ['带教津贴', '导师认证'], ['认定考务', '考试系统', '证书'], ['差旅', '场地租用', '餐饮']][ci]; const ws = names.map((n, i) => 1 + (hash(u.name + n) % 5) / 5 - i * .1); const t = ws.reduce((a, b) => a + b, 0); return names.map((n, i) => ({ n, budget: Math.round(total * ws[i] / t * 10) / 10, spent: Math.round(total * ws[i] / t * (u.spent / u.budget) * (0.8 + (hash(n) % 40) / 100) * 10) / 10 })) }

/* ---------- 执行跟踪 ---------- */
export const FUNNEL = [{ k: '已生成计划', n: 45694 }, { k: '已派发到人', n: 45102 }, { k: '已启动', n: 41230 }, { k: '按期推进', n: 37610 }, { k: '已完成', n: 32946 }]
export const CUM_PLAN = MONTH_PLAN.map((_, i) => Math.round(MONTH_PLAN.slice(0, i + 1).reduce((a, b) => a + b, 0) / TOTAL.hours * 100))
export const CUM_ACT = MONTH_ACT.map((_, i) => i < NOW_M ? Math.round(MONTH_ACT.slice(0, i + 1).reduce((a, b) => a + b, 0) / TOTAL.hours * 100) : null)
export type Overdue = { p: Person; item: PlanItem; days: number }
export function overdueOf(unitName: string, team?: string): Overdue[] {
  const u = unitOf(unitName); if (!u) return []
  const t = team ?? (isBureauUnit(u) ? `${BUREAUS[0]} · 变电管理一所` : isFunc(u) ? u.depts[0].name : `${short(u.name)} · 变电管理一所`)
  return teamPersons(u.name, t, postOfTeam(t)).flatMap(p => personPlan(p).filter(i => i.st === '逾期' || i.st === '未通过 · 需重练').map(item => ({ p, item, days: 6 + (hash(p.id + item.id) % 40) }))).slice(0, 12)
}

/* ---------- 优化与预测 ---------- */
export const DONE_TREND = MONTHS.slice(0, NOW_M).map((_, i) => Math.round((CUM_ACT[i] ?? 0) / Math.max(1, CUM_PLAN[i]) * 1000) / 10)
export const DONE_FORECAST = { base: [82.3, 82.9, 83.4, 84.1].map(v => v), lo: [82.3, 82.2, 82.0, 81.9], hi: [82.3, 83.6, 84.9, 86.2] }
export function optimize(cap: number, online: number, coach: number) {
  const d = (60 - cap) * .12 + (online - 32) * .11 + (coach - 24) * .08
  const done = clamp(Math.round((84.1 + d) * 10) / 10, 70, 97)
  const budget = Math.round((TOTAL.budget * (1 - (online - 32) * .0012 - (60 - cap) * .0008)) * 10) / 10
  const hours = Math.round(TOTAL.hours * (1 - (60 - cap) * .008))
  return { done, delta: Math.round(d * 10) / 10, budget, hours, saved: Math.round((TOTAL.budget - budget) * 10) / 10 }
}
export const SUGGESTIONS = [
  { id: 's1', k: '线上化', t: '把 3 门面上覆盖课转为线上直播 + 回放', effect: '+2.4 pt', money: -18.6, d: '「AI 工具在本岗位的应用」「设备红外测温与判读」「新型电能表现场安装」线下班次 62 期，转线上后释放 2,480 人日。' },
  { id: 's2', k: '学时上限', t: '把人均学时上限从 60 降到 52', effect: '+3.1 pt', money: -9.2, d: '负荷过重的 6 个单位完成率平均 71%，压缩个人意向类条目后可回到 80% 以上。' },
  { id: 's3', k: '陪练前置', t: '课程后 2 周内安排陪练的比例提到 60%', effect: '+1.8 pt', money: 4.6, d: '成长地图显示陪练前置的班组达标周期短 3.4 个月。' },
  { id: 's4', k: '合并开班', t: '把 4 个地市局的继电保护班合并为省公司统一开班', effect: '+0.6 pt', money: -6.4, d: '各局报名 22–31 人，合并后 3 期即可覆盖，减少讲师重复排班。' },
]
export const AI_SAVE = Math.round((optimize(52, 45, 60).saved - SUGGESTIONS.reduce((s, x) => s + x.money, 0)) * 10) / 10
export const LOAD_PTS = [...UNIT_PLANS.filter(u => !isBureauUnit(UNITS.find(x => x.name === u.name))), ...BUREAU_PLANS].map(u => ({ id: u.name, label: short(u.name).replace(/供电局$/, ''), x: u.avgH, y: u.done, r: Math.max(4, Math.min(13, Math.sqrt(u.people) / 8)), grp: u.grp, color: u.grp === '地市局' ? '#2f6df6' : u.grp === '本部职能部门' ? '#7b5cf5' : u.grp === '直属机构' ? '#19b8d8' : u.grp === '县域新电力' ? '#178a54' : '#b08a3e' }))
export const P_INSIGHTS = [
  { k: '完成率预测', v: '年末 84.1%', d: '按当前进度年末完成率 84.1%（区间 81.9–86.2），距 88% 目标差 3.9 个百分点；第四季度计划学时最重。', go: 'insight', tag: 'warn' },
  { k: '负荷过重', v: `${LOAD_PTS.filter(p => p.x > 70).length} 个单位人均超 70 学时`, d: `完成率平均 ${Math.round(LOAD_PTS.filter(p => p.x > 70).reduce((s, p) => s + p.y, 0) / Math.max(1, LOAD_PTS.filter(p => p.x > 70).length))}%，主要是个人意向类条目挤占；建议启用学时上限 52。`, go: 'insight', tag: 'bad' },
  { k: '开班冲突', v: `${CONFLICTS.length} 个班次待处理`, d: '与迎峰度夏、检修计划重叠，AI 已给出改期与拆班方案。', go: 'schedule', tag: 'warn' },
  { k: '预算执行', v: `${Math.round(TOTAL.spent / TOTAL.budget * 100)}% · 进度匹配`, d: `采纳全部优化建议可节省 ${AI_SAVE} 万元，集训类预算执行偏快需关注。`, go: 'budget', tag: 'ok' },
]
export const PROGRAM_NAMES = MAIN_PROGRAMS.map(p => p.name)
export const unitDefOf = (name: string): UnitDef | undefined => unitOf(name)
