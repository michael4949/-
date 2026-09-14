/* 智能问数助手数据层：身份、指标字典、技能、渠道、知识缺口、回答复核、热点与趋势
   问答本体在 engine.ts；运行期会话在 store.ts */
import { ASK_ROLES, ASK_HOT, BUREAUS } from '../data'
import { UNITS } from '../units'
import type { UnitGroup } from '../units'

export type Role = { id: string; name: string; who: string; scope: string; grp: string; unit: string; person: string }
export const ROLES: Role[] = ASK_ROLES.map(r => ({ ...r, person: r.who.split(' · ')[0], unit: r.who.split(' · ').slice(-1)[0] }))
export const roleById = (id: string) => ROLES.find(r => r.id === id) ?? ROLES[3]

const hash = (s: string) => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h }
const pick = <T,>(arr: T[], seed: number) => arr[seed % arr.length]
const pad = (n: number, w = 2) => String(n).padStart(w, '0')
export const dateBack = (days: number) => { const d = new Date(2026, 8, 14); d.setDate(d.getDate() - days); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }

/* ---------- 指标字典 ---------- */
export type Metric = {
  id: string; name: string; aliases: string[]; unit: string; def: string; formula: string; src: string; tables: string[]; freq: string; owner: string; uses: number
  dims: string[]; history: { date: string; note: string; by: string }[]; base: number; spread: number; higherBetter: boolean; fmt: (v: number) => string; questions: string[]
}
const pct = (v: number) => `${v.toFixed(1)}%`
const num = (v: number) => Math.round(v).toLocaleString()
export const METRICS: Metric[] = [
  { id: 'hours', name: '人均培训学时', aliases: ['学时', '培训学时', '人均学时'], unit: '学时', def: '统计期内员工完成的培训学时之和除以在册人数，含线上课程、集训、陪练与班组学习。', formula: 'Σ(课程学时 + 集训学时 + 陪练折算学时 + 班组学习学时) ÷ 在册人数', src: '培训系统 · 陪练引擎', tables: ['trn_course_record', 'trn_class_attend', 'coach_session', 'team_study_log'], freq: '每日 02:00', owner: '人力资源部 培训开发', uses: 12840, dims: ['单位', '班组', '岗位', '个人', '月份'], history: [{ date: '2026-07-01', note: '陪练时长按 1.0 系数折算学时，此前为 0.8', by: '培训科' }, { date: '2026-01-01', note: '班组学习纳入学时口径', by: '培训科' }], base: 68, spread: 22, higherBetter: true, fmt: v => v.toFixed(1), questions: ['我的年度学时完成了多少？', '南宁供电局今年人均学时多少？', '哪个单位学时最低？'] },
  { id: 'done', name: '必修课完成率', aliases: ['完成率', '必修完成率', '课程完成率', '必修课', '没完成', '未完成', '完成情况'], unit: '%', def: '统计期内完成全部必修课程的人数占应学人数的比例。', formula: '完成全部必修课人数 ÷ 应学人数 × 100%', src: '培训系统', tables: ['trn_course_record', 'trn_required_map'], freq: '每日 02:00', owner: '人力资源部 培训开发', uses: 9860, dims: ['单位', '班组', '岗位', '课程'], history: [{ date: '2026-03-15', note: '新增 AI 素养必修课后重算', by: '培训科' }], base: 86, spread: 14, higherBetter: true, fmt: pct, questions: ['财务部员工本年必修课完成情况？', '本班组谁还没完成必修课？'] },
  { id: 'pass', name: '考试通过率', aliases: ['通过率', '考试通过率', '一次通过率'], unit: '%', def: '统计期内考试一次通过人数占参考人数的比例。', formula: '一次通过人数 ÷ 参考人数 × 100%', src: '考试系统', tables: ['exam_result', 'exam_paper'], freq: '考试结束后 10 分钟', owner: '培训评价中心', uses: 8420, dims: ['单位', '班组', '岗位', '课程', '题目'], history: [{ date: '2026-05-01', note: '补考通过计入"累计通过率"，一次通过率口径保持', by: '培训评价中心' }], base: 81, spread: 16, higherBetter: true, fmt: pct, questions: ['陪练上线后技能认定通过率有变化吗？', '继电保护定值单课程通过率多少？'] },
  { id: 'ready', name: '岗位能力达标率', aliases: ['达标率', '能力达标率', '胜任率'], unit: '%', def: '在册员工中全部必备能力项达到岗位等级要求线的人数占比。', formula: '全部能力项达标人数 ÷ 在册人数 × 100%', src: '成长地图 · 考试系统 · 陪练引擎', tables: ['atlas_ability', 'exam_result', 'coach_session'], freq: '每周一 06:00', owner: '人力资源部 培训开发', uses: 7210, dims: ['单位', '专业', '等级', '班组', '个人'], history: [{ date: '2026-06-01', note: '新增分布式接入相关能力项 6 项', by: '生产技术部' }], base: 84, spread: 18, higherBetter: true, fmt: pct, questions: ['全公司岗位能力达标率现在多少？', '哪些班组达标率低于 75%？'] },
  { id: 'coach', name: '陪练一次通过率', aliases: ['陪练通过率', '陪练成绩', '陪练完成', '陪练'], unit: '%', def: '陪练舱考核模式下一次达到 80 分且未触发红线的场次占比。', formula: '一次通过场次 ÷ 考核场次 × 100%', src: '陪练引擎', tables: ['coach_session', 'coach_violation'], freq: '实时', owner: '培训评价中心', uses: 5130, dims: ['单位', '班组', '个人', '科目'], history: [{ date: '2026-08-01', note: '红线项一票否决纳入口径', by: '培训科' }], base: 78, spread: 20, higherBetter: true, fmt: pct, questions: ['本班组本月陪练完成情况？', '倒闸操作陪练哪一步失分最多？'] },
  { id: 'cert', name: '证照到期人数', aliases: ['证照', '证书到期', '证件到期', '持证', '证书', '到期'], unit: '人', def: '未来 90 天内特种作业证、职业资格证或上岗证到期的人数。', formula: 'count(证照到期日 ≤ 今天 + 90 天)', src: '人资系统 · 证照库', tables: ['hr_cert', 'hr_person'], freq: '每日 02:00', owner: '人力资源部 员工服务', uses: 4380, dims: ['单位', '班组', '证照类型', '个人'], history: [{ date: '2026-02-01', note: '接入应急管理部特种作业证照库校验', by: '数字化部' }], base: 12, spread: 30, higherBetter: false, fmt: num, questions: ['我的证书还有多久到期？', '本单位 90 天内证照到期多少人？'] },
  { id: 'budget', name: '培训经费执行率', aliases: ['经费执行率', '经费', '预算执行'], unit: '%', def: '已入账培训费用占年度培训预算的比例。', formula: '已入账培训费 ÷ 年度培训预算 × 100%', src: '财务系统', tables: ['fin_voucher', 'fin_budget'], freq: '每日 06:00', owner: '财务部 预算管理', uses: 1980, dims: ['单位', '科目', '月份'], history: [{ date: '2026-07-01', note: '线上平台服务费按教材资料费列支', by: '财务部' }], base: 62, spread: 24, higherBetter: true, fmt: pct, questions: ['本部门本年培训经费执行进度？'] },
  { id: 'hit', name: '提问命中率', aliases: ['命中率', '知识命中率'], unit: '%', def: '助手回答中引用到知识资产条目或数据口径的提问占比。', formula: '有出处回答数 ÷ 提问总数 × 100%', src: '问数助手', tables: ['ask_turn', 'ask_cite'], freq: '实时', owner: '知识运营', uses: 2410, dims: ['单位', '身份', '渠道', '主题'], history: [{ date: '2026-08-15', note: '数据类回答须带口径卡方计入命中', by: '知识运营' }], base: 94, spread: 6, higherBetter: true, fmt: pct, questions: ['助手本周命中率多少？', '哪类问题最容易未命中？'] },
  { id: 'rating', name: '课程满意度', aliases: ['满意度', '课程评分', '评分'], unit: '分', def: '学员对课程五分制评价的平均值。', formula: 'Σ评分 ÷ 评价数', src: '培训系统', tables: ['trn_feedback'], freq: '每日 02:00', owner: '人力资源部 培训开发', uses: 1760, dims: ['单位', '课程', '内训师'], history: [], base: 4.5, spread: .5, higherBetter: true, fmt: v => v.toFixed(2), questions: ['今年评分最高的课程是哪门？'] },
  { id: 'plan', name: '计划完成率', aliases: ['计划完成', '学习计划完成率', 'IDP 完成率', '年度计划', '学习计划'], unit: '%', def: '个人年度学习计划中已完成学习项占全部学习项的比例。', formula: '已完成学习项 ÷ 计划学习项 × 100%', src: '千人千面计划', tables: ['plan_item', 'plan_person'], freq: '每日 02:00', owner: '人力资源部 培训开发', uses: 3320, dims: ['单位', '班组', '个人', '季度'], history: [{ date: '2026-04-01', note: '陪练重练任务计入学习项', by: '培训科' }], base: 71, spread: 22, higherBetter: true, fmt: pct, questions: ['本班组季度计划完成率多少？', '我的年度计划完成了多少？'] },
  { id: 'trainer', name: '内训师自主成课占比', aliases: ['自主成课', '内训师占比', '内训师成课'], unit: '%', def: '本年新增课程中由认证内训师自主完成开发的比例。', formula: '内训师自主成课数 ÷ 本年新增课程数 × 100%', src: '课程工厂', tables: ['fac_course', 'fac_trainer'], freq: '每日 02:00', owner: '培训评价中心', uses: 640, dims: ['单位', '期次'], history: [], base: 71, spread: 20, higherBetter: true, fmt: pct, questions: ['今年课件开发的效率变化？'] },
  { id: 'ai', name: 'AI 素养培训覆盖率', aliases: ['AI 覆盖率', '人工智能培训覆盖', 'AI 素养'], unit: '%', def: '完成全员 AI 素养分层培训对应层级课程的人数占在册人数的比例。', formula: '完成对应层级课程人数 ÷ 在册人数 × 100%', src: '培训系统', tables: ['trn_course_record'], freq: '每日 02:00', owner: '人力资源部 培训开发', uses: 2210, dims: ['单位', '层级'], history: [], base: 62, spread: 26, higherBetter: true, fmt: pct, questions: ['"人工智能+"全员培训覆盖到什么程度了？'] },
]
export const metricById = (id: string) => METRICS.find(m => m.id === id)
export function findMetric(q: string): Metric | undefined {
  let best: Metric | undefined; let bestLen = 0
  METRICS.forEach(m => [m.name, ...m.aliases].forEach(a => { if (q.includes(a) && a.length > bestLen) { best = m; bestLen = a.length } }))
  return best
}
/* 单位级指标值：由单位规模、场景均分与指标基线推导，稳定可复现 */
export function metricValue(m: Metric, key: string): number {
  const h = hash(m.id + key)
  const u = UNITS.find(x => x.name === key || x.name.startsWith(key))
  const lift = u ? (u.avg - 3.2) * (m.spread / 6) : 0
  const v = m.base + ((h % 1000) / 1000 - .5) * m.spread + lift
  return m.id === 'cert' ? Math.max(0, Math.round(v * ((u?.people ?? 400) / 400))) : m.id === 'rating' ? Math.max(3.6, Math.min(4.95, v)) : Math.max(m.higherBetter ? 40 : 0, Math.min(99.5, v))
}
export const unitShort = (n: string) => n.replace(/（.*）/, '')
export function unitRows(m: Metric, filterGrp?: UnitGroup | 'all') {
  const list = (filterGrp && filterGrp !== 'all') ? UNITS.filter(u => u.grp === filterGrp) : UNITS
  const seen = new Set<string>()
  return list.map(u => { const s0 = unitShort(u.name); const s = seen.has(s0) ? u.name : s0; seen.add(s0); return { name: u.name, short: s, grp: u.grp, n: u.people, v: metricValue(m, u.name), trend: ((hash(m.id + u.id + 't') % 9) - 4) } }).sort((a, b) => m.higherBetter ? b.v - a.v : a.v - b.v)
}
export function bureauRows(m: Metric) {
  return BUREAUS.map(b => ({ name: b, short: b, grp: '地市供电局' as UnitGroup, n: 1800 + (hash(b) % 2400), v: metricValue(m, b), trend: ((hash(m.id + b + 't') % 9) - 4) })).sort((a, b) => m.higherBetter ? b.v - a.v : a.v - b.v)
}
export function teamRows(m: Metric, unit: string) {
  const base = ['变电管理一所', '变电管理二所', '配电管理所', '输电管理所', '营销部', '调度控制中心', '客户服务中心', '安全监管部']
  return base.map(t => ({ name: `${unitShort(unit)} · ${t}`, short: t, grp: '班组' as const, n: 24 + (hash(unit + t) % 40), v: metricValue(m, unit + t), trend: ((hash(m.id + unit + t) % 9) - 4) })).sort((a, b) => m.higherBetter ? b.v - a.v : a.v - b.v)
}
const NAMES = ['韦明', '黄文杰', '周伟', '李明辉', '农小刚', '陈立', '蓝海', '覃丽', '梁雨桐', '陆泽宇', '莫晓萌', '潘子豪']
export function personRows(m: Metric, team: string) {
  return NAMES.map((n, i) => ({ name: n, short: n, grp: '个人' as const, n: 1, v: metricValue(m, team + n + i), trend: ((hash(m.id + team + n) % 9) - 4) })).sort((a, b) => m.higherBetter ? b.v - a.v : a.v - b.v)
}
export function monthSeries(m: Metric, key: string) {
  return Array.from({ length: 12 }).map((_, i) => ({ label: `${i + 1} 月`, v: Math.round((metricValue(m, key) + Math.sin(i / 1.7 + hash(key) % 5) * m.spread * .18 + (i - 8) * (m.higherBetter ? .35 : -.2)) * 10) / 10 }))
}

/* ---------- 助手技能 ---------- */
export type Skill = { id: string; name: string; kind: '查询' | '生成' | '执行' | '提醒'; desc: string; params: { k: string; d: string }[]; example: string; roles: string[]; uses: number; ok: number; status: '已上线' | '灰度' | '待审批'; go?: { node: string; tab: string }; logs: { t: string; who: string; unit: string; q: string; ms: number; ok: boolean }[] }
const mkLogs = (id: string, q: string[]) => Array.from({ length: 8 }).map((_, i) => { const h = hash(id + i); return { t: `2026-09-${pad(14 - (i % 5))} ${pad(8 + (h % 10))}:${pad(h % 60)}`, who: pick(NAMES, h), unit: unitShort(pick(UNITS, h >>> 2).name), q: pick(q, h), ms: 380 + (h % 1800), ok: h % 13 !== 0 } })
export const SKILLS: Skill[] = [
  { id: 'q_data', name: '查培训数据', kind: '查询', desc: '按单位、班组、岗位、个人与时间口径查询指标，答案带图表与口径卡，可下钻。', params: [{ k: '指标', d: '指标字典中的任一指标或别名' }, { k: '维度', d: '单位 / 班组 / 岗位 / 个人 / 月份' }, { k: '时间', d: '本年 / 本月 / 近 30 天 / 季度' }], example: '南宁供电局今年人均学时多少？', roles: ['全部身份，按数据范围收窄'], uses: 48210, ok: 97.4, status: '已上线', logs: mkLogs('q_data', ['南宁供电局今年人均学时多少？', '本班组季度计划完成率？', '财务部必修课完成情况']) },
  { id: 'q_rule', name: '查规程与制度', kind: '查询', desc: '语义检索知识资产中枢，答案逐条带出处与锚点，敏感条目按身份脱敏。', params: [{ k: '问题', d: '自然语言' }, { k: '范围', d: '本岗位 / 本单位 / 全公司' }], example: '不能直接验电时怎么确认设备无电？', roles: ['全部身份'], uses: 61320, ok: 94.2, status: '已上线', go: { node: 'hub', tab: 'search' }, logs: mkLogs('q_rule', ['GIS 刀闸操作后要核对哪几项', '培训费报销要附哪些材料', '请示能不能同时主送两个上级']) },
  { id: 'q_person', name: '查个人档案', kind: '查询', desc: '查询本人或本班组成员的学时、证照、能力雷达与学习计划，班组长可见本班。', params: [{ k: '对象', d: '本人 / 班组成员' }, { k: '内容', d: '学时 / 证照 / 能力 / 计划' }], example: '我的证书还有多久到期？', roles: ['一线员工（本人）', '班组长（本班）', '培训专责（本单位）'], uses: 18760, ok: 98.1, status: '已上线', go: { node: 'map', tab: 'person' }, logs: mkLogs('q_person', ['我的证书还有多久到期？', '我的年度学时完成了多少？', '我的能力雷达']) },
  { id: 'do_coach', name: '下发陪练任务', kind: '执行', desc: '按科目与截止时间给班组或个人下发陪练任务，同步到陪练工作台与班组看板。', params: [{ k: '科目', d: '教练目录中的科目' }, { k: '对象', d: '班组 / 个人' }, { k: '截止', d: '日期' }], example: '给本班组下发一次 GIS 四项核对专项陪练，本周五截止', roles: ['班组长', '培训专责', '培训科'], uses: 2140, ok: 99.2, status: '已上线', go: { node: 'coach', tab: 'team' }, logs: mkLogs('do_coach', ['给本班组下发 GIS 四项核对专项陪练', '给覃雨桐安排一次错题重练']) },
  { id: 'do_course', name: '生成课程需求', kind: '生成', desc: '把未命中的提问或能力缺口转成课程立项需求，推送到课程工厂生成工作台。', params: [{ k: '主题', d: '提问或能力项' }, { k: '岗位', d: '适用岗位' }, { k: '课时', d: '默认 2 学时' }], example: '把"低压台区反送电判断"立项成课程', roles: ['培训专责', '培训科'], uses: 386, ok: 100, status: '已上线', go: { node: 'factory', tab: 'gen' }, logs: mkLogs('do_course', ['把借调人员学时归属做成一讲微课', '反送电判断立项']) },
  { id: 'do_class', name: '预约开班', kind: '执行', desc: '查询开班日历并为个人或班组预约名额，满员时排候补。', params: [{ k: '课程', d: '开班日历中的课程' }, { k: '人数', d: '' }], example: '帮我报名 10-16 的班组长 AI 带班课', roles: ['全部身份'], uses: 3260, ok: 96.8, status: '已上线', go: { node: 'course', tab: 'cal' }, logs: mkLogs('do_class', ['帮我报名岗位 AI 工具入门', '安规复训什么时候开班']) },
  { id: 'gen_card', name: '生成班前会知识卡', kind: '生成', desc: '按班组近期错题与规程变化生成一页班前会知识卡，可推送到班组看板。', params: [{ k: '班组', d: '' }, { k: '主题', d: '可选' }], example: '给本班组生成本周班前会知识卡', roles: ['班组长', '培训专责'], uses: 1720, ok: 98.4, status: '已上线', go: { node: 'coach', tab: 'team' }, logs: mkLogs('gen_card', ['生成本周班前会知识卡', '把票令核对的要点做成一页卡']) },
  { id: 'q_cert', name: '查证照到期', kind: '查询', desc: '按单位或班组列出 90 天内证照到期人员，可一键生成复审提醒。', params: [{ k: '范围', d: '单位 / 班组' }, { k: '天数', d: '默认 90' }], example: '本单位 90 天内证照到期多少人？', roles: ['班组长', '培训专责', '培训科'], uses: 2880, ok: 99.5, status: '已上线', logs: mkLogs('q_cert', ['本单位 90 天内证照到期多少人', '特种作业证快到期的有谁']) },
  { id: 'gen_report', name: '导出报表', kind: '生成', desc: '把当前回答的数据导出为报表或简报，按培训科月报模板排版。', params: [{ k: '内容', d: '当前回答' }, { k: '格式', d: 'xlsx / docx' }], example: '把这个结果导出成月报', roles: ['培训专责', '培训科'], uses: 940, ok: 100, status: '已上线', logs: mkLogs('gen_report', ['导出成月报', '导出各单位达标率']) },
  { id: 'remind', name: '提醒待办', kind: '提醒', desc: '设置一次性或周期提醒：证照复审、计划节点、陪练截止，推送到移动端。', params: [{ k: '事项', d: '' }, { k: '时间', d: '' }], example: '证书到期前 30 天提醒我', roles: ['全部身份'], uses: 5640, ok: 99.8, status: '已上线', logs: mkLogs('remind', ['证书到期前 30 天提醒我', '每周一提醒我看班组看板']) },
  { id: 'gen_plan', name: '生成学习计划', kind: '生成', desc: '按能力缺口与晋级目标生成个人年度学习计划，写入 IDP。', params: [{ k: '对象', d: '本人 / 班组成员' }, { k: '周期', d: '年度 / 半年' }], example: '按我的缺口生成明年学习计划', roles: ['一线员工', '班组长', '培训专责'], uses: 1210, ok: 97.9, status: '已上线', go: { node: 'plan', tab: 'engine' }, logs: mkLogs('gen_plan', ['生成明年学习计划', '给覃雨桐生成补强计划']) },
  { id: 'q_budget', name: '查培训经费', kind: '查询', desc: '按单位与科目查询培训经费预算、执行与在途，口径与财务系统一致。', params: [{ k: '单位', d: '' }, { k: '科目', d: '可选' }], example: '本部门本年培训经费执行进度？', roles: ['财务专责', '培训专责', '培训科'], uses: 760, ok: 98.6, status: '灰度', logs: mkLogs('q_budget', ['本部门本年培训经费执行进度', '外聘讲师课酬支出']) },
  { id: 'do_ticket', name: '生成课程需求工单', kind: '执行', desc: '从提问热度榜直接创建课程立项、题库补充或规程修订建议工单。', params: [{ k: '来源', d: '热点提问' }, { k: '类型', d: '课程 / 题库 / 规程' }], example: '把"票令不一致怎么处理"生成题库补充工单', roles: ['培训科', '知识运营'], uses: 212, ok: 100, status: '待审批', logs: mkLogs('do_ticket', ['生成题库补充工单']) },
]
export const skillById = (id: string) => SKILLS.find(s => s.id === id)

/* ---------- 渠道 ---------- */
export type Channel = { id: string; name: string; desc: string; daily: number; share: number; hit: number; sat: number; roles: string[]; on: boolean; top: string[]; units: { name: string; n: number }[]; trend: number[]; cfg: { k: string; v: string }[] }
const mkTrend = (seed: number, base: number) => Array.from({ length: 12 }).map((_, i) => Math.round(base * (0.8 + ((hash(String(seed * 31 + i)) % 40) / 100)) + i * base * .02))
export const CHANNELS: Channel[] = [
  { id: 'web', name: '智培云图工作台', desc: '培训专责与培训科的主入口，支持全部技能与下钻。', daily: 1120, share: 36, hit: 95.1, sat: 4.6, roles: ['培训专责', '培训科', '班组长'], on: true, top: ['全公司岗位能力达标率现在多少？', '今年课件开发的效率变化？', '规程修订后受影响的课件有多少？'], units: UNITS.slice(0, 9).filter(u => !u.name.includes('宣传')).map(u => ({ name: unitShort(u.name), n: 60 + (hash(u.id + 'w') % 200) })), trend: mkTrend(1, 1000), cfg: [{ k: '默认身份', v: '按登录人岗位' }, { k: '数据下钻', v: '开' }, { k: '敏感脱敏', v: '按分级' }] },
  { id: 'board', name: '班组电子看板', desc: '班组长在班前会使用，问班组数据与规程，一键生成知识卡。', daily: 640, share: 20, hit: 93.8, sat: 4.5, roles: ['班组长', '一线员工'], on: true, top: ['本班组本月陪练完成情况？', '票令不一致怎么处理', '标志牌挂在哪几个位置'], units: BUREAUS.slice(0, 8).map(b => ({ name: b, n: 40 + (hash(b + 'b') % 120) })), trend: mkTrend(2, 600), cfg: [{ k: '默认身份', v: '班组长' }, { k: '语音输入', v: '开' }, { k: '大屏排版', v: '开' }] },
  { id: 'mobile', name: 'i南网移动端', desc: '员工随时问学时、证照、开班与规程，支持语音与拍照识别设备铭牌。', daily: 980, share: 31, hit: 94.6, sat: 4.7, roles: ['一线员工', '全员'], on: true, top: ['我的证书还有多久到期？', 'GIS 刀闸四项位置指示是哪四项', '安规复训什么时候开班'], units: BUREAUS.slice(0, 8).map(b => ({ name: b, n: 60 + (hash(b + 'm') % 160) })), trend: mkTrend(3, 900), cfg: [{ k: '默认身份', v: '本人' }, { k: '语音输入', v: '开' }, { k: '拍照识别', v: '开' }] },
  { id: 'cabin', name: '陪练舱内助手', desc: '陪练过程中随时"问教练"，答案挂接当前步骤的规程条款。', daily: 310, share: 10, hit: 96.9, sat: 4.8, roles: ['学员'], on: true, top: ['间接验电两种原理怎么组合', '五防锁具打不开怎么办', '设备编号怎么报读'], units: BUREAUS.slice(0, 8).map(b => ({ name: b, n: 20 + (hash(b + 'c') % 60) })), trend: mkTrend(4, 300), cfg: [{ k: '上下文', v: '当前步骤' }, { k: '回答长度', v: '短' }] },
  { id: 'cs', name: '95598 坐席端', desc: '坐席在通话中侧边提问业务规范与话术，答案 3 秒内返回。', daily: 90, share: 3, hit: 97.2, sat: 4.6, roles: ['95598 坐席'], on: true, top: ['停电投诉的受理时限与升级规则是什么？', '客户情绪激动时怎么应对？'], units: [{ name: '话务一班', n: 40 }, { name: '话务二班', n: 32 }, { name: '在线服务班', n: 18 }], trend: mkTrend(5, 80), cfg: [{ k: '默认身份', v: '95598 坐席' }, { k: '通话侧边栏', v: '开' }] },
]
export const channelById = (id: string) => CHANNELS.find(c => c.id === id)

/* ---------- 知识缺口（未命中聚类） ---------- */
export type Gap = { id: string; topic: string; n: number; weeks: number; units: string[]; roles: string[]; samples: string[]; owner: string; status: '待认领' | '补充中' | '已回流'; kind: '规程条款' | '作业步骤' | '岗位诀窍'; draft: { title: string; body: string[]; src: string } }
export const GAPS: Gap[] = [
  { id: 'g1', topic: '借调人员的培训学时计入哪个单位', n: 41, weeks: 3, units: ['南宁供电局', '柳州供电局', '财务部', '物资部'], roles: ['培训专责', '班组长'], samples: ['借调到省公司的人学时算谁的', '借调期间必修课在哪个单位学', '借调人员年度学时怎么统计'], owner: '人力资源部 培训开发', status: '待认领', kind: '规程条款', draft: { title: '借调人员培训学时的归属与统计', body: ['借调期间的培训学时计入借调接收单位的统计口径，原单位保留查询权限。', '必修课按接收单位岗位要求执行，原单位必修课在借调结束后 60 天内补学。', '年度学时汇总时按借调起止日期分段计入两个单位。'], src: '广西电网公司培训管理办法 第二十三条（建议新增释义）' } },
  { id: 'g2', topic: '外包人员能否参加公司内部技能认定', n: 28, weeks: 3, units: ['玉林供电局', '贵港供电局', '广西送变电建设公司'], roles: ['班组长', '培训专责'], samples: ['外包队伍能不能考我们的技能等级', '承包商人员参加认定要什么条件', '外包人员的陪练成绩算不算数'], owner: '培训评价中心', status: '待认领', kind: '规程条款', draft: { title: '外包人员参加技能认定的条件', body: ['承包商人员可参加公司组织的岗位准入认定，不参加职业技能等级认定。', '参加准入认定须由承包商提出申请，经项目管理单位审核。', '陪练成绩作为准入认定的参考项，权重 30%。'], src: '技能等级认定实施细则（建议新增条款）' } },
  { id: 'g3', topic: '线上课程学时与集训学时能否互抵', n: 19, weeks: 2, units: ['北海供电局', '梧州供电局'], roles: ['一线员工'], samples: ['网课学满了还要去集训吗', '线上学时能顶集训学时吗'], owner: '人力资源部 培训开发', status: '补充中', kind: '规程条款', draft: { title: '线上学时与集训学时的折算关系', body: ['线上课程学时与集训学时分别统计，必修集训不以线上学时抵扣。', '选修类课程线上学时可按 1:1 计入年度总学时。'], src: '广西电网公司培训管理办法 第十九条' } },
  { id: 'g4', topic: '新入职员工安规考试时限', n: 17, weeks: 1, units: ['地市供电局'], roles: ['班组长'], samples: ['新员工多久内必须考安规', '安规没考过能不能上岗'], owner: '安全监管部', status: '已回流', kind: '规程条款', draft: { title: '新入职员工安规考试的时限与上岗关系', body: ['新入职员工入职 30 天内完成安规考试，考试合格前不得单独承担现场工作。'], src: '电力安全工作规程 培训考试规定' } },
  { id: 'g5', topic: '95598 夜间来电升级到谁', n: 15, weeks: 2, units: ['客户服务中心'], roles: ['95598 坐席'], samples: ['夜里超时工单升级给谁', '夜班升级流程'], owner: '客户服务中心', status: '补充中', kind: '作业步骤', draft: { title: '夜间时段工单升级路径', body: ['22:00 至次日 07:00 超时工单升级到值班长，值班长 30 分钟内未处置升级到地市局客服中心值班经理。'], src: '95598 客户服务业务规范 附录 B（建议补充夜间路径）' } },
  { id: 'g6', topic: '采购合同用印前是否需要法务复核', n: 12, weeks: 1, units: ['物资部', '基建部'], roles: ['采购专责'], samples: ['合同法务审过了还要复核吗', '用印前法务要不要再看'], owner: '法律事务部', status: '待认领', kind: '作业步骤', draft: { title: '合同用印前的法务复核情形', body: ['经法律审查后合同文本无实质修改的直接用印；条款有修改的须重新送审。'], src: '合同管理办法 第二十一条' } },
]
export const gapById = (id: string) => GAPS.find(g => g.id === id)

/* ---------- 回答复核队列 ---------- */
export type ReviewItem = { id: string; q: string; role: string; unit: string; channel: string; score: number; issue: '出处不准' | '口径不一致' | '表述过长' | '敏感信息' | '未理解意图'; a: string; refs: string[]; status: '待复核' | '已改写' | '已确认'; when: string; fix: string }
export const REVIEWS: ReviewItem[] = [
  { id: 'r1', q: '票令不一致的时候到底听谁的', role: '一线员工', unit: '柳州供电局', channel: '移动端', score: 2, issue: '出处不准', a: '以调度指令为准，按指令继续操作。', refs: ['GC-0871'], status: '待复核', when: '2026-09-13 09:12', fix: '票令不一致时不得操作，应立即向发令人询问清楚，必要时重新拟票。出处：细则第十八条。' },
  { id: 'r2', q: '南宁局达标率多少', role: '培训专责', unit: '南宁供电局', channel: '工作台', score: 3, issue: '口径不一致', a: '南宁供电局达标率 91.2%（含补考通过）。', refs: [], status: '待复核', when: '2026-09-12 16:40', fix: '按现行口径回答一次达标率并附口径卡；补考口径单独说明。' },
  { id: 'r3', q: '培训费报销附件', role: '财务专责', unit: '财务部', channel: '工作台', score: 3, issue: '表述过长', a: '（回答 620 字，含细则全文引用）', refs: ['GC-5102'], status: '已改写', when: '2026-09-11 11:05', fix: '压缩为四件附件清单，细则全文改为出处链接。' },
  { id: 'r4', q: '某供应商去年中标了几次', role: '采购专责', unit: '物资部', channel: '工作台', score: 1, issue: '敏感信息', a: '（回答含供应商名称与金额）', refs: [], status: '已确认', when: '2026-09-10 15:22', fix: '按敏感分级拦截并提示改用物资部业务系统查询。' },
  { id: 'r5', q: '我们所今年能不能评先进', role: '班组长', unit: '桂林供电局', channel: '看板', score: 2, issue: '未理解意图', a: '未能理解问题，请换一种问法。', refs: [], status: '待复核', when: '2026-09-09 08:30', fix: '识别为"评先条件 + 本所指标达成情况"，分别回答条件出处与指标数据。' },
  { id: 'r6', q: '继电保护课程通过率', role: '培训科', unit: '省公司', channel: '工作台', score: 3, issue: '口径不一致', a: '通过率 79%。', refs: [], status: '已改写', when: '2026-09-08 10:14', fix: '补充一次通过率 79% 与累计通过率 91% 两个口径及课程链接。' },
]
export const reviewById = (id: string) => REVIEWS.find(r => r.id === id)

/* ---------- 热点提问（扩展） ---------- */
export type Hot = { rank: number; q: string; n: number; up: boolean; act: string; units: string[]; roles: string[]; trend: number[]; samples: string[]; sat: number; actions: { k: string; d: string; st: '已完成' | '进行中' | '待启动'; go: { node: string; tab: string; route?: { v: string; [k: string]: unknown } } }[]; assetId?: string }
const ASSET_OF: Record<string, string> = { 'GIS 刀闸四项位置指示是哪四项': 'KZ-2411', '间接验电两种原理怎么组合': 'GC-1244', '票令不一致怎么处理': 'GC-0871', '低压台区反送电怎么判断': 'KZ-3118' }
export const HOTS: Hot[] = ASK_HOT.map((h, i) => {
  const s = hash(h.q)
  return { rank: i + 1, ...h, units: [pick(BUREAUS, s), pick(BUREAUS, s >>> 3), pick(BUREAUS, s >>> 6)].filter((v, j, a) => a.indexOf(v) === j), roles: i < 5 ? ['一线员工', '班组长'] : ['一线员工', '培训专责'], trend: Array.from({ length: 8 }).map((_, k) => Math.round(h.n / 8 * (0.7 + ((hash(h.q + k) % 60) / 100) + (h.up ? k * .06 : 0)))), samples: [h.q, `${h.q}？现场怎么做`, `新员工问：${h.q}`], sat: 4.2 + ((s % 7) / 10), assetId: ASSET_OF[h.q],
    actions: [{ k: h.act, d: '已由热度触发', st: '已完成', go: h.act.includes('课') || h.act.includes('立项') ? { node: 'factory', tab: 'lib' } : h.act.includes('陪练') ? { node: 'coach', tab: 'plaza' } : { node: 'course', tab: 'cal' } }, { k: '补充助手条目', d: '把高频问法写成标准回答', st: i % 2 ? '进行中' : '待启动', go: { node: 'hub', tab: 'ingest' } }, { k: '生成班前会知识卡', d: '推送到提问集中的班组', st: '待启动', go: { node: 'coach', tab: 'team' } }] }
})

/* ---------- 趋势与驾驶舱 ---------- */
export const TREND_A = Array.from({ length: 26 }).map((_, i) => ({ w: `第 ${12 + i} 周`, q: 15200 + ((i * 431) % 5200) + i * 240 + Math.round(Math.sin(i / 2.2) * 1800), hit: Math.round((91 + (i * .13) + Math.sin(i / 3) * 1.2) * 10) / 10, sat: Math.round((4.3 + i * .012 + Math.cos(i / 2.5) * .08) * 100) / 100 }))
export const HOURS = [{ label: '07–09 班前', v: 28, note: '峰值' }, { label: '09–12 作业', v: 24 }, { label: '12–14', v: 8 }, { label: '14–17 作业', v: 21 }, { label: '17–20 班后', v: 12 }, { label: '其他', v: 7 }]
export const ROLE_DIST = [{ k: '一线员工', v: 52 }, { k: '班组长', v: 21 }, { k: '培训专责', v: 12 }, { k: '职能部门', v: 9 }, { k: '培训科', v: 4 }, { k: '95598 坐席', v: 2 }]
export const A_INSIGHTS = [
  { k: '未命中聚类', v: '6 类 · 132 条', d: '借调人员学时归属与外包人员技能认定连续三周未命中，责任单位待认领。', go: { v: 'gaps' as const }, tag: 'warn' },
  { k: '异常波动', v: '停电类 +11 倍', d: '台风预警期间 95598 坐席端停电类提问激增，助手自动切换应急话术模板并推送自助播报建议。', go: { v: 'channels' as const }, tag: 'bad' },
  { k: '口径变更', v: '2 项本月生效', d: '陪练时长按 1.0 折算学时、数据类回答须带口径卡；涉及 4,380 条历史回答已重算。', go: { v: 'metrics' as const }, tag: 'ok' },
  { k: '低分回答', v: '3 条待复核', d: '票令不一致的回答出处不准已拦截；南宁局达标率口径混用已改写。', go: { v: 'quality' as const }, tag: 'warn' },
]
export const unitAskDist = () => UNITS.map(u => ({ u, n: Math.round(u.people * .058 + u.sceneN * 9 + (hash(u.id + 'a') % 40)) })).sort((a, b) => b.n - a.n)
