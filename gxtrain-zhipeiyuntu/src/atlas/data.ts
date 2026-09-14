/* 学习成长地图数据层：能力模型、人员画像、单位全景、缺口与预警、人才梯队、成长批次、预测与干预
   所有数值由岗位模型、单位规模与评估表场景推导，稳定可复现 */
import { UNITS } from '../units'
import type { UnitDef, UnitGroup } from '../units'
import { PERSON, LINES, GRADES, BUREAUS } from '../data'
import { TEAM } from '../coach/data'
import { COURSES } from '../factory/data'
import { COACHES } from '../coach/data'

const hash = (s: string) => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h }
const pick = <T,>(arr: T[], seed: number) => arr[seed % arr.length]
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
export const short = (n: string) => n.replace(/（.*）/, '')

/* ---------- 能力模型 ---------- */
export const ABILITY_SETS: Record<string, string[]> = {
  变电: ['倒闸操作', '设备巡视', '异常处置', '继电保护', '安全规程', '调度配合'],
  配电: ['带电作业', '故障研判', '配网运维', '分布式接入', '安全规程', '客户沟通'],
  营销: ['装表接电', '业扩报装', '用电检查', '计量抄核', '客户服务', '合规风控'],
  输电: ['线路巡视', '通道管理', '登杆作业', '缺陷识别', '安全规程', '应急处置'],
  调度: ['下令受令', '运行方式', '事故处置', '新能源调度', '安全规程', '系统操作'],
  信息通信: ['网络运维', '信息安全', '数据治理', '智能体开发', '应急处置', '制度规程'],
  基建: ['工程管理', '安全文明施工', '造价管理', '影像管控', '验收规范', '合规风控'],
  安监: ['隐患排查', '两票管理', '风险辨识', '应急管理', '安全规程', '事故分析'],
  职能: ['制度规程', '业务流程', '数据分析', 'AI 工具应用', '沟通协作', '风险合规'],
}
export const GRADE_LINE: Record<string, number> = { 初级工: 55, 中级工: 65, 高级工: 72, 技师: 80, 高级技师: 88, 助理级: 60, 中级: 70, 高级: 78, 资深: 86 }
export const PROD_GRADES = GRADES
export const FUNC_GRADES = ['助理级', '中级', '高级', '资深']
export const isFunc = (u: UnitDef | undefined) => !!u && (u.grp === '本部职能部门' || u.grp === '直属机构' || u.grp === '产业公司')
export function lineOf(unitName: string, post: string): string {
  const u = UNITS.find(x => x.name === unitName)
  if (u && isFunc(u)) return u.name.includes('数字化') ? '信息通信' : u.name.includes('基建') || u.name.includes('送变电') ? '基建' : u.name.includes('安全') ? '安监' : u.name.includes('调度') ? '调度' : '职能'
  if (/变电|继电/.test(post)) return '变电'; if (/配电|台区|带电|配网/.test(post)) return '配电'; if (/装表|营销|抄核|用电|客户/.test(post)) return '营销'; if (/输电|线路|通道/.test(post)) return '输电'; if (/调度/.test(post)) return '调度'
  return pick(['变电', '配电', '营销', '输电'], hash(post))
}
export const abilitiesOf = (unitName: string, post: string) => ABILITY_SETS[lineOf(unitName, post)] ?? ABILITY_SETS.职能

/* ---------- 人员 ---------- */
export type Ability = { k: string; v: number; need: number; prev: number; history: number[]; w: number }
export type Record_ = { t: string; k: '陪练' | '考试' | '课程' | '竞赛' | '认定' | '带教'; n: string; r: string; delta: number; ability: string; ok: boolean; id?: string }
export type Person = {
  id: string; name: string; unit: string; team: string; post: string; grade: string; years: number; grades: string[]
  abilities: Ability[]; records: Record_[]; potential: number; nextGrade: string; eta: number; progress: number; mentor?: string; joined: string
}
const NAMES = TEAM.map(t => t.n ?? (t as unknown as { name: string }).name).filter(Boolean)
const POOL = ['韦明', ...NAMES, '黄文杰', '周伟', '李明辉', '农小刚', '陈立', '蓝海', '覃丽', '梁雨桐', '陆泽宇', '莫晓萌', '潘子豪', '罗芷若', '卢浩然', '唐淑仪']
export function buildPerson(name: string, unit: string, team: string, post: string, seed?: number): Person {
  const s = seed ?? hash(name + unit + team)
  const func = isFunc(UNITS.find(u => u.name === unit))
  const grades = func ? FUNC_GRADES : PROD_GRADES
  const gi = 1 + (s % (grades.length - 2))
  const grade = grades[gi], nextGrade = grades[Math.min(grades.length - 1, gi + 1)]
  const need = GRADE_LINE[nextGrade]
  const ab = abilitiesOf(unit, post)
  const abilities: Ability[] = ab.map((k, i) => {
    const h = hash(name + k)
    const v = clamp(Math.round(need - 14 + (h % 30) + (i === 4 ? 8 : 0)), 40, 98)
    const history = Array.from({ length: 12 }).map((_, m) => clamp(Math.round(v - (11 - m) * (0.5 + (h % 5) / 10) + Math.sin(m / 2 + h % 7) * 2), 35, 98))
    return { k, v, need: need + (i % 3 === 1 ? -5 : 0), prev: history[8], history, w: [25, 20, 20, 15, 10, 10][i] }
  })
  const gaps = abilities.filter(a => a.v < a.need)
  const potential = clamp(Math.round(45 + (s % 42) + (gaps.length < 2 ? 6 : 0)), 40, 95)
  const progress = clamp(Math.round(100 - gaps.reduce((a, g) => a + (g.need - g.v), 0) * 1.6), 20, 98)
  const eta = Math.max(2, Math.round(gaps.reduce((a, g) => a + (g.need - g.v), 0) * .55) + 3)
  const coach = COACHES[s % COACHES.length]
  const course = COURSES[(s >>> 3) % 40]
  const records: Record_[] = [
    { t: '2026-09-05', k: '陪练', n: coach.n, r: `${70 + (s % 24)} 分 · ${s % 5 === 0 ? '未通过' : '通过'}`, delta: s % 5 === 0 ? -2 : 3 + (s % 4), ability: ab[0], ok: s % 5 !== 0, id: coach.id },
    { t: '2026-08-22', k: '考试', n: func ? '制度规程年度考试' : '安规（变电部分）年度考试', r: `${80 + (s % 18)} 分 · 合格`, delta: 2, ability: ab[4], ok: true },
    { t: '2026-08-10', k: '课程', n: course.name, r: `${course.hours} 学时 · 完成`, delta: 4, ability: ab[2], ok: true, id: course.id },
    { t: '2026-07-18', k: '陪练', n: COACHES[(s + 3) % COACHES.length].n, r: `${58 + (s % 20)} 分 · ${s % 3 === 0 ? '未通过' : '通过'}`, delta: s % 3 === 0 ? -3 : 2, ability: ab[1], ok: s % 3 !== 0, id: COACHES[(s + 3) % COACHES.length].id },
    { t: '2026-06-30', k: s % 2 ? '竞赛' : '带教', n: s % 2 ? `${short(unit)}技术比武` : `师带徒 · ${pick(POOL, s >>> 5)} 带教季度评价`, r: s % 2 ? `第 ${3 + (s % 9)} 名` : '优秀', delta: 3, ability: ab[3], ok: true },
    { t: '2026-05-14', k: '课程', n: COURSES[(s >>> 5) % 40].name, r: `${COURSES[(s >>> 5) % 40].hours} 学时 · 完成`, delta: 3, ability: ab[5], ok: true, id: COURSES[(s >>> 5) % 40].id },
  ]
  return { id: `p-${hash(name + unit + team).toString(36)}`, name, unit, team, post, grade, years: 2 + (s % 14), grades, abilities, records, potential, nextGrade, eta, progress, mentor: pick(POOL, s >>> 7), joined: `${2026 - 2 - (s % 14)}-0${1 + (s % 9)}` }
}
export const MAIN_PERSON: Person = (() => {
  const p = buildPerson('韦明', '地市供电局（14个）', '南宁供电局 · 变电管理一所', '变电值班员', 11)
  p.grade = PERSON.grade; p.nextGrade = '技师'; p.years = PERSON.years; p.progress = PERSON.progress; p.eta = 14
  p.abilities = PERSON.radar.map((r, i) => ({ k: r.k, v: r.v, need: r.need, prev: r.v - [3, 2, 5, 4, 1, 3][i], history: Array.from({ length: 12 }).map((_, m) => clamp(Math.round(r.v - (11 - m) * [.9, .6, 1.2, 1.1, .3, .7][i] + Math.sin(m / 2 + i) * 1.5), 35, 98)), w: [25, 20, 20, 15, 10, 10][i] }))
  p.records[0] = { t: '2026-09-05', k: '陪练', n: '倒闸操作 · 黄志远', r: '86 分 · 通过', delta: 4, ability: '倒闸操作', ok: true, id: 'daozha' }
  p.records[3] = { t: '2026-07-18', k: '陪练', n: '母线倒闸操作', r: '74 分 · 未通过', delta: -3, ability: '异常处置', ok: false, id: 'abn' }
  return p
})()
export function teamPersons(unit: string, team: string, post = '变电值班员'): Person[] {
  const names = POOL.filter(n => n !== '韦明').slice(0, 11)
  const list = names.map(n => buildPerson(n, unit, team, post))
  return team === MAIN_PERSON.team || `${short(unit)} · ${team}` === MAIN_PERSON.team ? [MAIN_PERSON, ...list] : list
}
export const postOfTeam = (team: string) => /配电|配网|台区/.test(team) ? '配网运维员' : /输电|线路/.test(team) ? '线路运维员' : /营销|客户|计量/.test(team) ? '装表接电员' : /调度/.test(team) ? '调度员' : /安全|安监/.test(team) ? '安全专责' : /变电/.test(team) ? '变电值班员' : (() => { const u = UNITS.find(x => x.depts.some(d => d.name === team)); return u?.depts.find(d => d.name === team)?.posts[0] ?? '变电值班员' })()
export const personById = (id: string, unit?: string, team?: string): Person | undefined => {
  if (id === MAIN_PERSON.id) return MAIN_PERSON
  const pool = teamPersons(unit ?? MAIN_PERSON.unit, team ?? MAIN_PERSON.team, postOfTeam(team ?? MAIN_PERSON.team))
  return pool.find(p => p.id === id) ?? ALL_PEOPLE.find(p => p.id === id)
}
export const TEAMS_OF: Record<string, string[]> = { default: ['变电管理一所', '变电管理二所', '配电管理所', '输电管理所', '营销部', '调度控制中心', '客户服务中心', '安全监管部'] }
export const NAME_POOL = POOL
export const isBureauUnit = (u: UnitDef | undefined) => !!u && u.grp === '地市供电局'
export const teamsOf = (u: UnitDef) => isFunc(u) ? u.depts.map(d => d.name) : isBureauUnit(u) ? BUREAUS : TEAMS_OF.default
export const BUREAU_UNIT = UNITS.find(u => u.grp === '地市供电局')!
export function bureauReady(name: string) { return clamp(Math.round(84 + ((hash(name) % 25) - 12) + (name.startsWith('南宁') || name.startsWith('柳州') ? 4 : 0)), 70, 96) }
export function bureauRadar(name: string) { return DOMAINS.map((k, i) => ({ k, v: clamp(Math.round(bureauReady(name) + ((hash(name + k) % 19) - 9) + (i === 3 ? -5 : 0)), 55, 98), need: 80 })) }
export function bureauTrend(name: string) { const r = bureauReady(name); return Array.from({ length: 12 }).map((_, i) => clamp(Math.round(r - (11 - i) * .5 + Math.sin(i / 1.7 + hash(name) % 4) * 1.4), 55, 99)) }
/* 全公司样本人员（梯队与盘点用） */
export const ALL_PEOPLE: Person[] = (() => {
  const out: Person[] = [MAIN_PERSON]
  UNITS.forEach((u, ui) => {
    const teams = teamsOf(u)
    const k = isBureauUnit(u) ? 14 : u.grp === '县域新电力' ? 4 : u.grp === '直属机构' ? 3 : 2
    for (let i = 0; i < k; i++) {
      const name = POOL[1 + ((ui * 3 + i * 5) % (POOL.length - 1))]
      const team = isBureauUnit(u) ? `${BUREAUS[i]} · ${TEAMS_OF.default[i % 8]}` : isFunc(u) ? teams[i % teams.length] : `${short(u.name)} · ${teams[i % teams.length]}`
      const p = buildPerson(name, u.name, team, postOfTeam(team))
      if (p.id !== MAIN_PERSON.id && !out.some(x => x.id === p.id)) out.push(p)
    }
  })
  return out
})()

/* ---------- 单位全景 ---------- */
export const DOMAINS = ['专业技能', '安全规程', '异常处置', '数字化与 AI', '管理协作', '合规风控']
export function unitReady(u: UnitDef) { return clamp(Math.round(70 + (u.avg - 2.6) * 16 + (u.id.length % 5)), 66, 96) }
export function unitRadar(u: UnitDef) { return DOMAINS.map((k, i) => ({ k, v: clamp(Math.round(unitReady(u) + ((hash(u.id + k) % 21) - 10) + (i === 3 ? -6 : 0)), 50, 98), need: 80 })) }
export function unitTrend(u: UnitDef) { const r = unitReady(u); return Array.from({ length: 12 }).map((_, i) => clamp(Math.round(r - (11 - i) * .45 + Math.sin(i / 1.8 + hash(u.id) % 5) * 1.6), 50, 99)) }
export function unitTeams(u: UnitDef) { return teamsOf(u).map((t, i) => { const h = hash(u.id + t); return { name: t, n: isFunc(u) ? Math.max(4, Math.round(u.people / u.depts.length)) : isBureauUnit(u) ? 1800 + (h % 1500) : 22 + (h % 40), v: isBureauUnit(u) ? bureauReady(t) : clamp(unitReady(u) + ((h % 25) - 12), 55, 98), gaps: 1 + (h % 4), trend: ((h % 9) - 4), lead: pick(POOL, h >>> 3), i } }).sort((a, b) => b.v - a.v) }
/* 任意班组（含「地市局 · 班组」两段式）的统计口径 */
export function teamStat(u: UnitDef, team: string) { const hit = unitTeams(u).find(t => t.name === team); if (hit) return hit; const h = hash(u.id + team); const bureau = team.split(' · ')[0]; const base = BUREAUS.includes(bureau) ? bureauReady(bureau) : unitReady(u); return { name: team, n: 22 + (h % 40), v: clamp(base + ((h % 25) - 12), 55, 98), gaps: 1 + (h % 4), trend: ((h % 9) - 4), lead: pick(POOL, h >>> 3), i: 0 } }
export const GAP_LEVELS = ['已全部达标', '缺 1–2 项', '缺 3–5 项', '缺 6 项以上']
export function gapDist(v: number, n: number) { return [Math.round(n * v / 100), Math.round(n * (100 - v) / 100 * .55), Math.round(n * (100 - v) / 100 * .31), Math.round(n * (100 - v) / 100 * .14)] }

/* ---------- 岗位能力模型 ---------- */
export type PostModel = { id: string; unit: string; grp: UnitGroup; dept: string; post: string; line: string; abilities: { k: string; w: number; lines: Record<string, number>; src: string; courses: number; coaches: number; questions: number }[]; people: number; ready: number; ver: string; updated: string; scene?: string }
export const POST_MODELS: PostModel[] = UNITS.flatMap(u => u.depts.flatMap(d => d.posts.map(post => {
  const line = lineOf(u.name, post)
  const grades = isFunc(u) ? FUNC_GRADES : PROD_GRADES
  const h = hash(u.id + post)
  const scene = u.scenes.find(s => s.post === post)
  return { id: `pm-${h.toString(36)}`, unit: u.name, grp: u.grp, dept: d.name, post, line, people: isFunc(u) ? Math.max(3, Math.round(u.people / Math.max(1, u.depts.length))) : 60 + (h % 900), ready: clamp(unitReady(u) + ((h % 17) - 8), 60, 97), ver: `v${1 + (h % 3)}`, updated: `2026-0${1 + (h % 9)}-1${h % 9}`, scene: scene?.name,
    abilities: (ABILITY_SETS[line] ?? ABILITY_SETS.职能).map((k, i) => ({ k, w: [25, 20, 20, 15, 10, 10][i], lines: Object.fromEntries(grades.map((g, gi) => [g, GRADE_LINE[g] + (i % 3 === 1 ? -5 : 0) + gi * 0])), src: i === 3 && scene ? `评估表场景：${scene.name}` : i < 2 ? '规程与作业指导书' : i === 4 ? '安规与制度' : '岗位说明书', courses: 2 + ((h >>> i) % 9), coaches: (h >>> (i + 2)) % 4, questions: 30 + ((h >>> (i + 1)) % 200) })) }
})))
export const postModelById = (id: string) => POST_MODELS.find(m => m.id === id)

/* ---------- 缺口与预警 ---------- */
export type Gap = { id: string; ability: string; line: string; people: number; units: string[]; ready: number; rootCause: string; fix: { k: string; n: string; kind: '课程' | '陪练' | '集训' | '带教'; hours: number; id?: string }[]; cost: number; weeks: number; trend: number[]; priority: 'P1' | 'P2' | 'P3' }
export const GAPS: Gap[] = [
  { id: 'g1', ability: '继电保护', line: '变电', people: 312, units: ['南宁供电局', '柳州供电局', '桂林供电局', '玉林供电局'], ready: 58, rootCause: '定值单执行与校核课程通过率 79%，第四章保护动作分析流失 21%；陪练科目尚未覆盖保护校核情景。', fix: [{ k: '课程', n: '继电保护定值单执行与校核（修订版）', kind: '课程', hours: 6, id: 'C-2026-0330' }, { k: '陪练', n: '定值单校核 · 专项', kind: '陪练', hours: 1 }, { k: '带教', n: '莫振华 技能专家 带教 8 人', kind: '带教', hours: 12 }], cost: 18.6, weeks: 10, trend: [54, 55, 55, 56, 57, 57, 58, 58], priority: 'P1' },
  { id: 'g2', ability: '异常处置', line: '变电', people: 274, units: ['南宁供电局', '百色供电局', '河池供电局'], ready: 66, rootCause: '母线倒闸操作陪练一次通过率 62%，异常处置分支失分集中在中止时机判断。', fix: [{ k: '陪练', n: '事故异常处置推演', kind: '陪练', hours: 1, id: 'abn' }, { k: '课程', n: '主变异常与事故处理', kind: '课程', hours: 4 }], cost: 9.4, weeks: 6, trend: [60, 61, 62, 63, 64, 65, 65, 66], priority: 'P1' },
  { id: 'g3', ability: '分布式接入', line: '配电', people: 486, units: ['玉林供电局', '贵港供电局', '北海供电局', '广西新电力投资集团'], ready: 61, rootCause: '今年新增能力项，课程刚发布两个月；台区反送电判断课程仍在审核。', fix: [{ k: '课程', n: '低压台区反送电判断与处置', kind: '课程', hours: 4, id: 'C-2026-0339' }, { k: '陪练', n: '台区反送电判断 · 专项', kind: '陪练', hours: 1 }], cost: 22.1, weeks: 12, trend: [48, 50, 52, 55, 57, 58, 60, 61], priority: 'P1' },
  { id: 'g4', ability: 'AI 工具应用', line: '职能', people: 1180, units: ['财务部', '办公室', '物资部', '人力资源部', '战略规划部'], ready: 57, rootCause: '全员 AI 素养一线层覆盖 56%，职能部门专题课多数在排期中。', fix: [{ k: '课程', n: '全员 AI 素养分层培训 · 骨干层', kind: '课程', hours: 8 }, { k: '集训', n: '业务骨干 AI 场景开发训战营', kind: '集训', hours: 40 }], cost: 31.8, weeks: 16, trend: [40, 43, 46, 49, 51, 53, 55, 57], priority: 'P2' },
  { id: 'g5', ability: '新能源调度', line: '调度', people: 96, units: ['电力调度控制中心', '南宁供电局', '柳州供电局'], ready: 69, rootCause: '功率预测偏差修正口径刚发布，调度员仿真培训 DTS 场景未更新。', fix: [{ k: '课程', n: '新能源高占比下的 AI 调度辅助', kind: '课程', hours: 16 }, { k: '陪练', n: '新能源出力偏差处置 · 情景', kind: '陪练', hours: 1 }], cost: 7.2, weeks: 8, trend: [62, 63, 64, 65, 66, 67, 68, 69], priority: 'P2' },
  { id: 'g6', ability: '投诉处理', line: '客户服务', people: 118, units: ['客户服务中心', '南宁供电局', '桂林供电局'], ready: 74, rootCause: '规范 V4.2 缩短受理时限后，坐席复训完成率 94%，夜间升级路径未纳入条目。', fix: [{ k: '课程', n: '95598 停电投诉受理与升级', kind: '课程', hours: 3, id: 'C-2026-0348' }, { k: '陪练', n: '停电投诉受理 · 情景', kind: '陪练', hours: 1 }], cost: 3.1, weeks: 4, trend: [70, 71, 71, 72, 73, 73, 74, 74], priority: 'P3' },
  { id: 'g7', ability: '合同法律审查', line: '法律合规', people: 64, units: ['法律事务部', '物资部', '基建部'], ready: 72, rootCause: '合同管理办法修订后未复训，用印前复核情形理解不一。', fix: [{ k: '课程', n: '采购合规与紧急采购审批', kind: '课程', hours: 3, id: 'C-2026-0346' }], cost: 1.8, weeks: 3, trend: [68, 69, 70, 70, 71, 71, 72, 72], priority: 'P3' },
  { id: 'g8', ability: '缺陷识别', line: '输电', people: 208, units: ['百色供电局', '河池供电局', '梧州供电局'], ready: 71, rootCause: '机巡影像缺陷识别课程覆盖 60%，复核标准不统一。', fix: [{ k: '课程', n: '输电通道外破隐患识别与上报', kind: '课程', hours: 3, id: 'C-2026-0327' }, { k: '带教', n: '覃海波 技能专家 带教 6 人', kind: '带教', hours: 8 }], cost: 5.6, weeks: 6, trend: [64, 65, 66, 67, 68, 69, 70, 71], priority: 'P2' },
]
export const gapById = (id: string) => GAPS.find(g => g.id === id)
export type Alert = { id: string; kind: '证照到期' | '晋级窗口' | '梯队断层' | '达标下滑' | '能力退化'; title: string; n: number; unit: string; due: string; sev: 'bad' | 'warn' | 'ok'; d: string; go: string }
export const ALERTS: Alert[] = [
  { id: 'a1', kind: '证照到期', title: '特种作业证 90 天内到期', n: 186, unit: '14 个地市局', due: '2026-12-13', sev: 'bad', d: '其中 42 人尚未报名复审班，集中在百色、河池。', go: 'gaps' },
  { id: 'a2', kind: '晋级窗口', title: '技师申报窗口 2027-03 开启', n: 412, unit: '全公司', due: '2027-03-01', sev: 'warn', d: '412 人进度超过 60%，其中 128 人仅差 1 项能力。', go: 'talent' },
  { id: 'a3', kind: '梯队断层', title: '继电保护高级技师 3 年内退休 4 人', n: 4, unit: '广西电科院 · 柳州供电局', due: '2029-06', sev: 'bad', d: '技师层储备 6 人，达标 2 人；建议启动带教与萃取。', go: 'talent' },
  { id: 'a4', kind: '达标下滑', title: '配电专业达标率连续两季下滑', n: 3, unit: '玉林 · 贵港 · 北海', due: '本季', sev: 'warn', d: '受分布式接入新增能力项拉低，属结构性过渡。', go: 'gaps' },
  { id: 'a5', kind: '能力退化', title: '12 个月未参加陪练的变电值班员', n: 96, unit: '8 个地市局', due: '本月', sev: 'warn', d: '倒闸操作得分较上次平均下降 4.2 分。', go: 'gaps' },
  { id: 'a6', kind: '晋级窗口', title: '职能序列高级专责认定', n: 88, unit: '本部职能部门', due: '2027-01', sev: 'ok', d: 'AI 工具应用能力项为主要缺口。', go: 'talent' },
]

/* ---------- 人才梯队 ---------- */
export type Talent = { id: string; name: string; unit: string; post: string; grade: string; ability: number; potential: number; box: string; succession?: string }
const BOX = (a: number, p: number) => `${a >= 82 ? '高' : a >= 70 ? '中' : '低'}能力·${p >= 78 ? '高' : p >= 62 ? '中' : '低'}潜力`
export const TALENTS: Talent[] = ALL_PEOPLE.map(p => { const a = Math.round(p.abilities.reduce((s, x) => s + x.v * x.w, 0) / 100); return { id: p.id, name: p.name, unit: short(p.unit), post: p.post, grade: p.grade, ability: a, potential: p.potential, box: BOX(a, p.potential) } })
export const PYRAMID = [{ k: '高级技师', n: 1204 }, { k: '技师', n: 6880 }, { k: '高级工', n: 14210 }, { k: '中级工', n: 12960 }, { k: '初级工', n: 6420 }]
export const KEY_POSTS = [
  { post: '继电保护高级技师', unit: '广西电科院', holder: '莫振华', retire: '2028-08', ready: ['覃雨桐', '蓝子豪'], readyN: 2, poolN: 6 },
  { post: '变电运维高级技师', unit: '南宁供电局', holder: '陆志明', retire: '2027-03', ready: ['黄文博', '韦思远', '梁玲玲'], readyN: 3, poolN: 9 },
  { post: '输电线路技能专家', unit: '生产技术部', holder: '覃海波', retire: '2026-12', ready: ['农泽宇'], readyN: 1, poolN: 5 },
  { post: '装表接电高级技师', unit: '桂林供电局', holder: '梁小燕', retire: '2029-06', ready: ['莫嘉琪', '潘俊杰'], readyN: 2, poolN: 7 },
  { post: '新能源首席调度', unit: '省调', holder: '莫振宇', retire: '2030-10', ready: ['陆晓萌', '唐淑仪'], readyN: 2, poolN: 4 },
  { post: '会计核算资深专责', unit: '财务部', holder: '黄敏', retire: '2032-05', ready: ['卢浩然'], readyN: 1, poolN: 3 },
]

/* ---------- 成长批次 ---------- */
export type Cohort = { id: string; name: string; n: number; joined: string; curve: number[]; milestones: { m: number; k: string; done: number }[]; ready: number; avgMonths: number }
export const COHORTS: Cohort[] = [
  { id: 'c2024', name: '2024 届新员工', n: 486, joined: '2024-07', curve: [12, 21, 33, 44, 52, 58, 63, 68, 72, 75, 78, 80, 82, 84, 85, 86, 87, 88], milestones: [{ m: 1, k: '岗前培训', done: 100 }, { m: 3, k: '安规考试', done: 98 }, { m: 6, k: '首次陪练通过', done: 91 }, { m: 12, k: '中级工认定', done: 76 }, { m: 18, k: '独立值班', done: 64 }], ready: 88, avgMonths: 13.2 },
  { id: 'c2025', name: '2025 届新员工', n: 512, joined: '2025-07', curve: [14, 25, 38, 49, 58, 65, 70, 74, 78, 81, 83, 85, 86, 87], milestones: [{ m: 1, k: '岗前培训', done: 100 }, { m: 3, k: '安规考试', done: 99 }, { m: 6, k: '首次陪练通过', done: 94 }, { m: 12, k: '中级工认定', done: 81 }, { m: 18, k: '独立值班', done: 0 }], ready: 87, avgMonths: 11.4 },
  { id: 'c2026', name: '2026 届新员工', n: 534, joined: '2026-07', curve: [18, 31, 46], milestones: [{ m: 1, k: '岗前培训', done: 100 }, { m: 3, k: '安规考试', done: 62 }, { m: 6, k: '首次陪练通过', done: 0 }, { m: 12, k: '中级工认定', done: 0 }, { m: 18, k: '独立值班', done: 0 }], ready: 46, avgMonths: 0 },
]
export const JOURNEY = [{ k: '入职适应期', months: '0–6 月', items: ['岗前培训', '安规考试', '师带徒结对', '首次陪练'] }, { k: '岗位强化期', months: '6–18 月', items: ['必修课', '分段与专项陪练', '中级工认定', '独立值班'] }, { k: '胜任晋升期', months: '18 月以上', items: ['高级工 / 技师认定', '技术比武', '内训师', '带教']}]

/* ---------- 预测与干预 ---------- */
export const READY_TREND = Array.from({ length: 26 }).map((_, i) => Math.round((80.2 + i * .28 + Math.sin(i / 2.5) * .5) * 10) / 10)
export const READY_FORECAST = { base: Array.from({ length: 12 }).map((_, i) => Math.round((87.4 + (i + 1) * .26) * 10) / 10), lo: Array.from({ length: 12 }).map((_, i) => Math.round((87.4 + (i + 1) * .26 - (i + 1) * .18) * 10) / 10), hi: Array.from({ length: 12 }).map((_, i) => Math.round((87.4 + (i + 1) * .26 + (i + 1) * .16) * 10) / 10) }
export const FEATURES = [{ k: '月均陪练场次', w: 31, d: '每增加 1 场 / 月，达标概率 +6.8%' }, { k: '必修课完成', w: 22, d: '完成率每 +10%，达标率 +2.1 个百分点' }, { k: '师带徒结对', w: 17, d: '有结对的员工达标周期短 3.4 个月' }, { k: '班组长带班质量', w: 12, d: '班前会知识卡使用班组高 4.6 个百分点' }, { k: '规程更新及时性', w: 10, d: '课件滞后规程超 60 天，通过率降 5%' }, { k: '证照复审及时', w: 8, d: '' }]
export function simulate(coachPerMonth: number, coursePct: number, mentorPct: number) {
  const base = 87.4
  const d = (coachPerMonth - 1.6) * 2.1 + (coursePct - 86) * .21 + (mentorPct - 42) * .09
  const v = clamp(base + d, 70, 97)
  return { ready: Math.round(v * 10) / 10, delta: Math.round(d * 10) / 10, weeks: Math.max(4, Math.round(26 - d * 1.5)), cost: Math.round((coachPerMonth - 1.6) * 38 + (coursePct - 86) * 4.2 + (mentorPct - 42) * 1.8) }
}
export const CORR = UNITS.map(u => ({ id: u.id, label: short(u.name), x: clamp(Math.round(1.1 + (hash(u.id + 'c') % 30) / 10 + (u.avg - 3) * .8), 0.4, 4.2), y: clamp(unitReady(u) - 70 + ((hash(u.id + 'y') % 9) - 4), 0, 30), r: Math.max(4, Math.min(14, Math.sqrt(u.people) / 8)), grp: u.grp }))
export const AT_INSIGHTS = [
  { k: '结构性缺口', v: '继电保护 · 312 人', d: '技师层达标率 58%，四个地市局集中；课程第四章流失最高，陪练科目缺失，已给出补齐方案。', go: 'gaps', tag: 'bad' },
  { k: '晋级预测', v: '明年可达技师 412 人', d: '按当前进度，128 人仅差一项能力；建议第四季度集中安排专项陪练。', go: 'talent', tag: 'ok' },
  { k: '梯队断层', v: '4 个关键岗位', d: '继电保护高级技师 3 年内退休 4 人，储备达标仅 2 人；输电技能专家 12 月退休，接班 1 人。', go: 'talent', tag: 'warn' },
  { k: '干预效果', v: '陪练 +1 场 / 月 → +2.1 pt', d: '陪练频次是达标率最强解释因子（31%）；模拟器可测算成本与见效周期。', go: 'insight', tag: 'ok' },
]
export const unitOf = (name: string) => UNITS.find(u => u.name === name || short(u.name) === name)
export { UNITS, LINES, GRADES, BUREAUS }
