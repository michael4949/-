/* AI 课程工厂数据层：课程、章节、题目、试卷、微课、内训师、审核与学习数据
   课程与题目由知识资产中枢的条目与评估表场景生成，出处逐条回链 */
import { UNITS } from '../units'
import type { UnitGroup } from '../units'
import { ASSETS, assetById } from '../hub/data'
import type { Asset } from '../hub/data'
import { COURSE_OUTLINE } from '../data'
import { COACHES } from '../coach/data'

export type CourseKind = '必修课' | '专题课' | '岗位入门' | '复训课' | '微课'
export type CourseStatus = '已发布' | '内训师审核中' | '专业部门审核中' | '生成中' | '草稿' | '已下线'
export type OutputKind = '讲义' | '课件' | '微课脚本' | '实训任务书' | '配套试题'
export const OUTPUTS: OutputKind[] = ['讲义', '课件', '微课脚本', '实训任务书', '配套试题']
export type Chapter = { no: string; title: string; minutes: number; pages: number; kps: string[]; assets: string[]; quiz: number; drop: number }
export type ReviewNote = { id: string; page: number; kind: 'AI 自检' | '人工'; sev: 'bad' | 'warn' | 'ok'; text: string; fix: string; st: '待处理' | '已修改' | '已确认' }
export type ReviewStage = '内训师审核' | '专业部门审核' | '培训科发布'
export type Review = { stage: ReviewStage; who: string; when: string; result: '通过' | '退回' | '进行中' | '待开始'; notes: ReviewNote[] }
export type Course = {
  id: string; name: string; kind: CourseKind; unit: string; grp: UnitGroup | '公司通用'; post: string; hours: number
  status: CourseStatus; ver: string; updated: string; owner: string; period: number; src: string[]; chapters: Chapter[]
  outputs: Record<OutputKind, number>; stats: { learners: number; done: number; pass: number; score: number; rating: number; feedback: number }
  reviews: Review[]; history: { ver: string; date: string; by: string; note: string }[]; tags: string[]; core?: boolean; summary: string
}
export type QKind = '单选' | '多选' | '判断' | '情景'
export const Q_KINDS: QKind[] = ['单选', '多选', '判断', '情景']
export type Question = {
  id: string; kind: QKind; stem: string; options: string[]; answer: number[]; analysis: string; kp: string; anchor: string; anchorText: string
  unit: string; post: string; level: string; diff: number; disc: number; stats: { n: number; correct: number }; status: '已发布' | '待审核' | '已停用'
  src: 'AI 生成' | '内训师编写' | '规程解析'; course?: string; updated: string; wrongOpt?: number
}
export type Paper = { id: string; name: string; post: string; level: string; n: number; mix: Record<QKind, number>; diff: number; qs: string[]; created: string; checks: { k: string; ok: boolean; d: string }[] }
export type Scene = { no: number; shot: '讲解' | '示意图' | '现场实拍' | '字幕卡' | '互动提问'; narration: string; visual: string; seconds: number }
export type Micro = { id: string; course: string; title: string; minutes: number; presenter: { name: string; img: string; role: string }; scenes: Scene[]; status: '已发布' | '渲染中' | '脚本待审'; views: number; done: number; unit: string; post: string }
export type Trainer = { id: string; name: string; unit: string; grp: UnitGroup; dept: string; title: string; cert: '已认证' | '培训中' | '待认证'; batch: string; courses: string[]; questions: number; micro: number; score: number; topics: string[]; tasks: { course: string; stage: string; due: string; st: '进行中' | '待开始' | '已完成' }[] }

const hash = (s: string) => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h }
const pick = <T,>(arr: T[], seed: number) => arr[seed % arr.length]
const pad = (n: number, w = 4) => String(n).padStart(w, '0')
const dateBack = (days: number) => { const d = new Date(2026, 8, 14); d.setDate(d.getDate() - days); return `${d.getFullYear()}-${pad(d.getMonth() + 1, 2)}-${pad(d.getDate(), 2)}` }
const SURNAMES = ['韦', '黄', '覃', '梁', '陆', '农', '蓝', '莫', '潘', '唐', '卢', '罗', '周', '陈', '李', '苏']
const GIVEN = ['志明', '国强', '小燕', '建华', '海波', '振华', '雨桐', '泽宇', '晓萌', '子豪', '嘉琪', '俊杰', '淑仪', '浩然', '芷若', '文博', '思远', '敏', '峰', '雨']
const nameAt = (seed: number) => pick(SURNAMES, seed) + pick(GIVEN, seed >>> 3)
const short = (u: string) => u.replace(/（.*）/, '')

/* ---------- 章节模板 ---------- */
const CH_TPL = [
  (t: string) => [`${t}的业务背景与口径`, '相关制度条款与责任边界', `${t}标准作业流程`, '常见错项与典型案例', 'AI 工具在本环节的用法', '考核要点与实操任务']
]
function chaptersFor(name: string, hours: number, assets: Asset[], seed: number): Chapter[] {
  const titles = CH_TPL[0](name.replace(/专题课|岗位入门|复训课|必修课|微课/g, '').replace(/ *$/, ''))
  const n = Math.max(4, Math.min(6, Math.round(hours) + 1))
  return titles.slice(0, n).map((t, i) => ({
    no: `第${['一', '二', '三', '四', '五', '六'][i]}章`, title: t, minutes: Math.round(hours * 45 / n), pages: 6 + ((seed + i * 7) % 9),
    kps: assets.slice(i, i + 2).map(a => a.tags[0] ?? a.topic), assets: assets.slice(i, i + 2).map(a => a.id), quiz: 3 + ((seed + i) % 5), drop: Math.max(2, Math.min(38, 4 + i * 5 + ((seed >>> (i + 1)) % 9))),
  }))
}
function reviewsFor(status: CourseStatus, owner: string, unit: string, seed: number, updated: string): Review[] {
  const aiNotes = (n: number): ReviewNote[] => Array.from({ length: n }).map((_, i) => ({
    id: `n${seed % 1000}-${i}`, page: 3 + ((seed + i * 5) % 18), kind: (i % 3 === 2 ? '人工' : 'AI 自检') as ReviewNote['kind'], sev: (['warn', 'bad', 'ok', 'warn'] as const)[(seed + i) % 4],
    text: pick(['引用的条款为旧版本，规程已于近期修订', '术语与公司标准用语不一致', '本页文字密度过高，建议拆分为两页', '案例中出现供应商名称，需脱敏', '题目答案与讲义表述不一致', '缺少本章的考核要点小结', '图示与文字说明顺序相反'], seed + i),
    fix: pick(['替换为现行版本条款并更新锚点', '按术语表统一替换', '按要点拆页并补充示意图', '以"某供应商"替代并记录脱敏', '以规程条款为准修正题目解析', '按章节知识点生成小结页', '调整图文顺序'], seed + i),
    st: (['待处理', '已修改', '已确认'] as const)[(seed + i) % 3],
  }))
  const stages: ReviewStage[] = ['内训师审核', '专业部门审核', '培训科发布']
  const idx = status === '已发布' ? 3 : status === '专业部门审核中' ? 1 : status === '内训师审核中' ? 0 : -1
  return stages.map((st, i): Review => ({
    stage: st, who: i === 0 ? owner : i === 1 ? `${short(unit)} 审核人` : '陈科长 · 培训科', when: i <= idx ? dateBack(20 - i * 5 + (seed % 5)) : '—',
    result: i < idx ? '通过' : i === idx ? (status === '已发布' ? '通过' : '进行中') : '待开始', notes: i <= Math.max(0, idx) ? aiNotes(i === 0 ? 4 + (seed % 3) : 2 + (seed % 2)) : [],
  })).map((r, i): Review => idx === 3 && i === 2 ? { ...r, result: '通过', when: updated } : r)
}

type CoreIn = Omit<Course, 'chapters' | 'outputs' | 'stats' | 'reviews' | 'history' | 'core' | 'src'> & { src?: string[]; chapters?: Chapter[]; stats?: Course['stats'] }
const CORE_IN: CoreIn[] = [
  { id: 'C-2026-0342', name: '线路由运行转检修标准化操作', kind: '必修课', unit: '公司通用', grp: '公司通用', post: '变电值班员', hours: 6, status: '已发布', ver: 'v3', updated: '2026-09-09', owner: '陆志明', period: 2.1, tags: ['倒闸操作', '间接验电', '五防'], summary: '以 110kV 线路由运行转检修 27 项操作票为主线，覆盖票令核对、五防模拟、五拍闭环、验电接地与二次隔离。',
    src: ['GC-0871', 'BZ-1180', 'GC-1244', 'AL-0442', 'KZ-2411'], chapters: COURSE_OUTLINE.map((c, i) => ({ no: c.c, title: c.t, minutes: Math.round(parseFloat(c.p) * 45), pages: [8, 12, 11, 10, 14, 9][i], kps: c.pts, assets: [['GC-0871'], ['GC-0871', 'BZ-1180'], ['BZ-1180'], ['KZ-2411'], ['GC-1244', 'AL-0442'], ['BZ-1180']][i], quiz: [4, 6, 6, 5, 8, 5][i], drop: [3, 6, 9, 12, 21, 8][i] })),
    stats: { learners: 1840, done: 91, pass: 84, score: 86.2, rating: 4.7, feedback: 212 } },
  { id: 'C-2026-0339', name: '低压台区反送电判断与处置', kind: '专题课', unit: '地市供电局（14个）', grp: '地市供电局', post: '台区经理', hours: 4, status: '专业部门审核中', ver: 'v1', updated: '2026-09-11', owner: '黄建华', period: 1.8, tags: ['反送电', '分布式光伏'], summary: '由问数助手 688 次未命中提问触发立项，专家诀窍 12 条转成课程，含并网清单核对与逐相验电实操。', src: ['KZ-3118', 'GC-1244'] },
  { id: 'C-2026-0351', name: '财务智能化与经营数据分析', kind: '专题课', unit: '财务部', grp: '本部职能部门', post: '会计核算专责', hours: 6, status: '已发布', ver: 'v2', updated: '2026-08-28', owner: '黄敏', period: 2.3, tags: ['票据识别', '预算滚动预测', '经营分析'], summary: '票据识别与凭证自动化、预算滚动预测方法、成本动因分析与经营指标异常预警建模。', src: ['KZ-5106', 'GC-5102'], stats: { learners: 88, done: 71, pass: 88, score: 84.1, rating: 4.5, feedback: 31 } },
  { id: 'C-2026-0348', name: '95598 停电投诉受理与升级', kind: '岗位入门', unit: '客户服务中心（95598）', grp: '直属机构', post: '95598 坐席', hours: 3, status: '已发布', ver: 'v3', updated: '2026-08-24', owner: '梁雨', period: 1.2, tags: ['投诉处理', '升级规则', '话术'], summary: '停电类投诉的受理时限、升级规则、情绪安抚话术与台风期间集中来电应对。', src: ['GC-5301', 'KZ-5320', 'AL-5312'], stats: { learners: 560, done: 94, pass: 91, score: 88.6, rating: 4.8, feedback: 96 } },
  { id: 'C-2026-0355', name: '公文写作 AI 辅助与督办闭环', kind: '专题课', unit: '办公室', grp: '本部职能部门', post: '文秘', hours: 4, status: '内训师审核中', ver: 'v1', updated: '2026-09-12', owner: '覃文', period: 1.5, tags: ['公文', '会议纪要', '督办'], summary: '请示报告行文规则、会议纪要表述边界、批示件闭环流程，配 AI 辅助起草与格式校核演示。', src: ['GC-5203', 'AL-5108', 'BZ-5204'] },
  { id: 'C-2026-0346', name: '采购合规与紧急采购审批', kind: '复训课', unit: '物资部（供应链管理）', grp: '本部职能部门', post: '采购管理专责', hours: 3, status: '已发布', ver: 'v2', updated: '2026-07-30', owner: '陆峰', period: 1.4, tags: ['紧急采购', '到货验收', '供应商'], summary: '紧急采购三类情形与审批链、到货验收异常处理、供应商履约评价。', src: ['GC-5401', 'BZ-5408'], stats: { learners: 78, done: 92, pass: 95, score: 90.4, rating: 4.6, feedback: 24 } },
  { id: 'C-2026-0358', name: '人才数据分析与培训数字化', kind: '专题课', unit: '人力资源部', grp: '本部职能部门', post: '培训专责', hours: 4, status: '生成中', ver: 'v1', updated: '2026-09-14', owner: '周敏', period: 0.6, tags: ['能力矩阵', '培训数据', '成长地图'], summary: '能力矩阵建模、培训数据的读法与归因、学习成长地图的用法、培训效果与业务指标的关联分析。', src: ['BZ-5110', 'GC-5102'] },
  { id: 'C-2026-0336', name: '装表接电现场典型错误识别', kind: '必修课', unit: '地市供电局（14个）', grp: '地市供电局', post: '装表接电员', hours: 4, status: '已发布', ver: 'v4', updated: '2026-06-18', owner: '梁小燕', period: 1.5, tags: ['装表接电', '接线错误'], summary: '相序、互感器极性、零线串接三类现场接线错误的快速识别与处置。', src: ['KZ-2755'], stats: { learners: 2210, done: 93, pass: 90, score: 89.1, rating: 4.7, feedback: 318 } },
  { id: 'C-2026-0330', name: '继电保护定值单执行与校核', kind: '专题课', unit: '广西电科院', grp: '直属机构', post: '继电保护员', hours: 6, status: '已发布', ver: 'v2', updated: '2026-05-14', owner: '莫振华', period: 2.4, tags: ['定值单', '保护校核'], summary: '定值单的接收、校核、执行与回执，含保护动作分析典型案例。', stats: { learners: 640, done: 82, pass: 79, score: 81.5, rating: 4.4, feedback: 74 } },
  { id: 'C-2026-0322', name: '调度受令与复诵规范', kind: '必修课', unit: '电力调度控制中心（省调）', grp: '直属机构', post: '值班调度员', hours: 4, status: '已发布', ver: 'v2', updated: '2026-04-20', owner: '莫振宇', period: 1.9, tags: ['调度指令', '复诵'], summary: '调度术语、下令受令与复诵的规范动作，含票令不一致的处置路径。', src: ['GC-0871'], stats: { learners: 480, done: 96, pass: 92, score: 90.8, rating: 4.6, feedback: 52 } },
  { id: 'C-2026-0327', name: '输电通道外破隐患识别与上报', kind: '专题课', unit: '生产技术部', grp: '本部职能部门', post: '线路运维员', hours: 3, status: '已发布', ver: 'v3', updated: '2026-08-02', owner: '覃海波', period: 1.1, tags: ['通道隐患', '外破'], summary: '施工机械与树障隐患的识别标准、上报流程与机巡影像复核。', stats: { learners: 1120, done: 88, pass: 86, score: 85.4, rating: 4.5, feedback: 140 } },
  { id: 'C-2026-0341', name: '配网带电作业风险辨识与防控', kind: '必修课', unit: '地市供电局（14个）', grp: '地市供电局', post: '带电作业员', hours: 8, status: '已发布', ver: 'v2', updated: '2026-07-12', owner: '黄建华', period: 2.6, tags: ['带电作业', '风险辨识'], summary: '带电作业站位、绝缘遮蔽、风险辨识清单与典型违章案例。', stats: { learners: 960, done: 85, pass: 81, score: 83.7, rating: 4.4, feedback: 118 } },
]

function genCourses(): CoreIn[] {
  const out: CoreIn[] = []
  const used = new Set<string>(CORE_IN.map(c => c.id))
  const uniq = (seed: number) => { let n = 400 + (seed % 560); while (used.has(`C-2026-${pad(n, 4)}`)) n = 400 + ((n + 1 - 400) % 560); const id = `C-2026-${pad(n, 4)}`; used.add(id); return id }
  const kinds: CourseKind[] = ['专题课', '岗位入门', '复训课', '专题课', '微课']
  UNITS.forEach(u => u.scenes.forEach((s, i) => {
    const seed = hash(u.id + s.name + 'c')
    const status: CourseStatus = seed % 11 === 0 ? '内训师审核中' : seed % 13 === 0 ? '专业部门审核中' : seed % 17 === 0 ? '草稿' : seed % 29 === 0 ? '已下线' : '已发布'
    const kind = kinds[(seed + i) % kinds.length]
    out.push({ id: uniq(seed), name: `${s.name}${kind === '微课' ? '' : kind === '岗位入门' ? '岗位入门' : kind === '复训课' ? '复训' : '专题课'}`, kind, unit: u.name, grp: u.grp, post: s.post, hours: kind === '微课' ? 0.5 : 2 + (seed % 5), status, ver: `v${1 + (seed % 3)}`, updated: dateBack(seed % 400), owner: nameAt(seed), period: kind === '微课' ? 0.3 : 1 + ((seed % 20) / 10), tags: [s.dept, s.post, s.pri], summary: `围绕${s.name}场景，面向${s.post}，覆盖制度口径、标准作业流程、常见错项与 ${s.tech.split('＋')[0]} 工具用法。` })
  }))
  return out
}
const ALL_IN: CoreIn[] = [...CORE_IN, ...genCourses().filter(g => !CORE_IN.some(c => c.id === g.id))]
export const COURSES: Course[] = ALL_IN.map((c, i) => {
  const seed = hash(c.id)
  const src = c.src ?? ASSETS.filter(a => a.unit === c.unit && (a.post === c.post || a.dept === c.tags[0])).slice(0, 5).map(a => a.id)
  const assets = src.map(assetById).filter(Boolean) as Asset[]
  const chapters = c.chapters ?? chaptersFor(c.name, c.hours, assets.length ? assets : ASSETS.slice(seed % 50, seed % 50 + 6), seed)
  const learners = c.stats?.learners ?? (c.status === '已发布' ? 40 + (seed % 900) : 0)
  return {
    ...c, core: i < CORE_IN.length, src, chapters,
    outputs: { 讲义: chapters.reduce((a, ch) => a + Math.round(ch.pages * 1.6), 0), 课件: chapters.reduce((a, ch) => a + ch.pages, 0), 微课脚本: chapters.length, 实训任务书: Math.max(1, Math.round(chapters.length / 2)), 配套试题: chapters.reduce((a, ch) => a + ch.quiz, 0) * 3 },
    stats: c.stats ?? { learners, done: learners ? 60 + (seed % 36) : 0, pass: learners ? 65 + (seed % 31) : 0, score: learners ? 74 + (seed % 17) + (seed % 10) / 10 : 0, rating: learners ? 3.9 + ((seed % 9) / 10) : 0, feedback: Math.round(learners * .11) },
    reviews: reviewsFor(c.status, c.owner, c.unit, seed, c.updated),
    history: [{ ver: c.ver, date: c.updated, by: c.owner, note: pick(['按规程新版更新引用条款', '补充案例与实操任务', '内训师修订讲义表述', '首版发布'], seed) }, ...(c.ver !== 'v1' ? [{ ver: 'v1', date: dateBack(200 + (seed % 200)), by: '课程工厂', note: 'AI 生成初稿，内训师校对' }] : [])],
  }
})
export const COURSE_MAP: Record<string, Course> = Object.fromEntries(COURSES.map(c => [c.id, c]))
export const courseById = (id: string) => COURSE_MAP[id]
export const TOTAL_COURSES = 1286

/* ---------- 题目 ---------- */
const LEVELS_PROD = ['初级工', '中级工', '高级工', '技师', '高级技师']
const LEVELS_FUNC = ['助理级', '中级', '高级', '资深']
function qFromAsset(a: Asset, i: number, course?: string): Question {
  const seed = hash(a.id + i)
  const kind: QKind = (['判断', '单选', '多选', '情景'] as QKind[])[(seed + i) % 4]
  const isFunc = a.grp === '本部职能部门' || a.grp === '直属机构' || a.grp === '产业公司'
  const level = pick(isFunc ? LEVELS_FUNC : LEVELS_PROD, seed >>> 2)
  const opts = kind === '判断' ? ['正确', '错误'] : kind === '单选' ? ['凭经验直接处理', `${a.body[0].slice(0, 26)}…`, '先执行后补记录', '以上均可'] : kind === '多选' ? [`${a.body[0].slice(0, 20)}…`, `${(a.body[1] ?? a.summary).slice(0, 20)}…`, '无需核对，按习惯做法', `${(a.body[2] ?? a.summary).slice(0, 20)}…`] : ['立即按经验处理并事后汇报', `${(a.body[2] ?? a.body[0]).slice(0, 26)}…`, '等待他人决定', '跳过本环节']
  const answer = kind === '判断' ? [(seed % 5 === 0 ? 1 : 0)] : kind === '多选' ? [0, 1, 3] : [1]
  const stem = kind === '判断' ? `${a.summary.replace(/。$/, '')}${seed % 5 === 0 ? '，无需再作其他核对' : ''}。` : kind === '单选' ? `关于"${a.title}"，下列做法正确的是` : kind === '多选' ? `${a.title}中，应当做到的包括` : `${a.post}在${a.topic}环节遇到与"${a.title}"要求不一致的情况，应当`
  const n = 60 + (seed % 900)
  return { id: `Q-${pad(10000 + (seed % 80000), 5)}`, kind, stem, options: opts, answer, analysis: a.body[0], kp: a.tags[0] ?? a.topic, anchor: a.id, anchorText: `${a.src}${a.anchor !== '—' ? `（${a.anchor}）` : ''}`, unit: a.unit, post: a.post, level, diff: 1 + (seed % 5), disc: Math.round((0.18 + (seed % 40) / 100) * 100) / 100, stats: { n, correct: 48 + (seed % 48) }, status: seed % 9 === 0 ? '待审核' : seed % 31 === 0 ? '已停用' : '已发布', src: (['AI 生成', '内训师编写', '规程解析'] as const)[seed % 3], course, updated: a.updated, wrongOpt: kind === '判断' ? undefined : answer[0] === 1 ? 0 : 2 }
}
export const QUESTIONS: Question[] = (() => {
  const out: Question[] = []
  const seen = new Set<string>()
  ASSETS.forEach(a => {
    const n = a.core ? 3 : a.kind === '题目' ? 2 : 1
    const course = COURSES.find(c => c.src.includes(a.id))?.id
    for (let i = 0; i < n; i++) { const q = qFromAsset(a, i, course); if (!seen.has(q.id)) { seen.add(q.id); out.push(q) } }
  })
  return out
})()
export const Q_MAP: Record<string, Question> = Object.fromEntries(QUESTIONS.map(q => [q.id, q]))
export const questionById = (id: string) => Q_MAP[id]
export const TOTAL_QUESTIONS = 28450
export const POSTS_ALL = Array.from(new Set(QUESTIONS.map(q => q.post))).sort()
export function buildPaper(post: string, level: string, n: number, mix: Record<QKind, number>, seed = 1): Paper {
  const pool = QUESTIONS.filter(q => q.post === post && q.status === '已发布')
  const qs: string[] = []
  Q_KINDS.forEach(k => { const want = Math.round(n * mix[k] / 100); pool.filter(q => q.kind === k).slice(0, want).forEach(q => qs.push(q.id)) })
  const chosen = qs.map(questionById)
  const diff = chosen.length ? chosen.reduce((a, q) => a + q.diff, 0) / chosen.length : 3
  return { id: `P-2026-${pad(300 + (hash(post + level + seed) % 600))}`, name: `${post} · ${level} 认证试卷`, post, level, n: qs.length, mix, diff: Math.round(diff * 10) / 10, qs, created: '2026-09-14',
    checks: [{ k: '难度均衡', ok: Math.abs(diff - 3) < 1.2, d: `平均难度 ${diff.toFixed(1)}，各层级占比偏差 ${(Math.abs(diff - 3) * 4).toFixed(1)}%` }, { k: '规程时效', ok: true, d: '引用条款均为现行版本' }, { k: '重复率', ok: true, d: '与近三次考试重复 12%，低于 20%' }, { k: '题量', ok: qs.length >= Math.min(n, 8), d: `题库可用 ${pool.length} 道，成卷 ${qs.length} 道` }] }
}

/* ---------- 微课 ---------- */
const PRESENTERS = [{ name: '黄志远', img: 'daozha', role: '数字人讲师 · 变电运行' }, { name: '韦岚', img: 'term', role: '数字人讲师 · 调度' }, { name: '覃建国', img: 'angui', role: '数字人讲师 · 安监' }, { name: '梁玲玲', img: 'biz', role: '数字人讲师 · 职能业务' }, { name: '梁雨', img: 'cust', role: '数字人讲师 · 客户服务' }, { name: '黄敏', img: 'comp', role: '数字人讲师 · 财务' }, { name: '陆峰', img: 'order', role: '数字人讲师 · 物资' }, { name: '覃文', img: 'meet', role: '数字人讲师 · 行政' }]
function scenesFor(c: Course, seed: number): Scene[] {
  const ch = c.chapters[0]
  return [
    { no: 1, shot: '字幕卡', narration: `大家好，这一讲我们用 ${3 + (seed % 3)} 分钟讲清楚"${c.name}"里最容易出偏差的一个点。`, visual: `标题卡：${c.name}`, seconds: 12 },
    { no: 2, shot: '讲解', narration: c.summary, visual: '数字人半身讲解，右侧要点逐条浮现', seconds: 38 },
    { no: 3, shot: '示意图', narration: `先看${ch.title}。${ch.kps[0] ?? '关键判断'}是第一步，${ch.kps[1] ?? '交叉核对'}是第二步。`, visual: `流程示意：${ch.kps.join(' → ')}`, seconds: 42 },
    { no: 4, shot: '现场实拍', narration: `这是现场的真实情形，注意画面里的这一处。`, visual: pick(['现场实拍 · 设备位置指示', '现场实拍 · 单据与系统界面', '现场实拍 · 客户沟通场景', '现场实拍 · 作业现场'], seed), seconds: 30 },
    { no: 5, shot: '互动提问', narration: `请判断：${(c.chapters[1]?.kps[0] ?? ch.kps[0] ?? '关键要求')}缺一项，能不能继续？三秒后公布答案。`, visual: '互动题卡 · 三秒倒计时', seconds: 20 },
    { no: 6, shot: '字幕卡', narration: `记住出处：${(c.src.map(assetById).filter(Boolean)[0]?.src) ?? '公司相关制度'}。下一讲见。`, visual: '出处卡与下一讲预告', seconds: 14 },
  ]
}
export const MICROS: Micro[] = COURSES.filter(c => c.core || c.kind === '微课').slice(0, 24).map((c, i) => {
  const seed = hash(c.id + 'm')
  const p = PRESENTERS[(c.grp === '本部职能部门' ? 3 : c.grp === '直属机构' ? 4 : 0) + (seed % 3)] ?? PRESENTERS[0]
  return { id: `M-${pad(100 + i, 3)}`, course: c.id, title: `${c.chapters[0].title.replace(/的业务背景与口径/, '')} · 三分钟讲清楚`, minutes: 2.5 + (seed % 4) * .5, presenter: p, scenes: scenesFor(c, seed), status: (['已发布', '已发布', '渲染中', '脚本待审'] as const)[seed % 4], views: c.status === '已发布' ? 120 + (seed % 3000) : 0, done: 70 + (seed % 28), unit: c.unit, post: c.post }
})
export const microById = (id: string) => MICROS.find(m => m.id === id)

/* ---------- 内训师 ---------- */
export const TRAINERS: Trainer[] = (() => {
  const base: Omit<Trainer, 'courses' | 'tasks' | 'questions' | 'micro' | 'score'>[] = [
    { id: 't1', name: '陆志明', unit: '地市供电局（14个）', grp: '地市供电局', dept: '南宁供电局 变电管理一所', title: '高级技师', cert: '已认证', batch: '第 1 期', topics: ['倒闸操作', '位置核对'] },
    { id: 't2', name: '梁小燕', unit: '地市供电局（14个）', grp: '地市供电局', dept: '桂林供电局 营销部', title: '高级技师', cert: '已认证', batch: '第 2 期', topics: ['装表接电'] },
    { id: 't3', name: '黄建华', unit: '地市供电局（14个）', grp: '地市供电局', dept: '玉林供电局 配电管理所', title: '技师', cert: '已认证', batch: '第 3 期', topics: ['配网运维', '反送电'] },
    { id: 't4', name: '黄敏', unit: '财务部', grp: '本部职能部门', dept: '会计核算', title: '资深专责', cert: '已认证', batch: '第 4 期', topics: ['票据审核', '经费口径'] },
    { id: 't5', name: '覃文', unit: '办公室', grp: '本部职能部门', dept: '文秘', title: '高级专责', cert: '已认证', batch: '第 4 期', topics: ['公文写作', '督办'] },
    { id: 't6', name: '梁雨', unit: '客户服务中心（95598）', grp: '直属机构', dept: '话务班', title: '高级坐席', cert: '已认证', batch: '第 5 期', topics: ['投诉处理', '话术'] },
    { id: 't7', name: '陆峰', unit: '物资部（供应链管理）', grp: '本部职能部门', dept: '采购管理', title: '资深专责', cert: '培训中', batch: '第 6 期', topics: ['采购合规'] },
    { id: 't8', name: '周敏', unit: '人力资源部', grp: '本部职能部门', dept: '培训开发', title: '高级专责', cert: '培训中', batch: '第 6 期', topics: ['培训数字化'] },
    { id: 't9', name: '莫振宇', unit: '电力调度控制中心（省调）', grp: '直属机构', dept: '新能源调度', title: '首席专家', cert: '已认证', batch: '第 3 期', topics: ['功率预测', '调度指令'] },
    { id: 't10', name: '覃海波', unit: '生产技术部', grp: '本部职能部门', dept: '输电管理', title: '技能专家', cert: '已认证', batch: '第 2 期', topics: ['通道隐患'] },
    { id: 't11', name: '莫振华', unit: '广西电科院', grp: '直属机构', dept: '继电保护室', title: '高级技师', cert: '已认证', batch: '第 1 期', topics: ['定值单校核'] },
    { id: 't12', name: '覃海涛', unit: '数字化部（信息中心）', grp: '本部职能部门', dept: '数据管理', title: '数据管理专责', cert: '待认证', batch: '第 7 期', topics: ['数据治理', '智能体开发'] },
  ]
  const more = UNITS.filter(u => !base.some(b => b.unit === u.name)).slice(0, 12).map((u, i) => {
    const seed = hash(u.id + 't')
    return { id: `t${13 + i}`, name: nameAt(seed), unit: u.name, grp: u.grp, dept: u.depts[0]?.name ?? '综合', title: pick(['高级专责', '资深专责', '技师', '高级技师'], seed), cert: (['已认证', '培训中', '待认证'] as const)[seed % 3], batch: `第 ${1 + (seed % 7)} 期`, topics: u.scenes.slice(0, 2).map(s => s.dept) }
  })
  return [...base, ...more].map(t => {
    const seed = hash(t.id)
    const courses = COURSES.filter(c => c.owner === t.name || (c.unit === t.unit && hash(c.id + t.id) % 6 === 0)).slice(0, 6).map(c => c.id)
    return { ...t, courses, questions: courses.length * 18 + (seed % 60), micro: Math.round(courses.length / 2), score: courses.length ? 82 + (seed % 16) : 0,
      tasks: courses.slice(0, 3).map((cid, i) => ({ course: cid, stage: pick(['讲义校对', '试题复核', '微课口播录制', '规程新版更新'], seed + i), due: dateBack(-(5 + i * 6 + (seed % 5))), st: (['进行中', '待开始', '已完成'] as const)[(seed + i) % 3] })) }
  })
})()
export const trainerById = (id: string) => TRAINERS.find(t => t.id === id)

/* ---------- 审核队列与效果 ---------- */
export const REVIEW_QUEUE = COURSES.filter(c => c.status === '内训师审核中' || c.status === '专业部门审核中').sort((a, b) => b.updated.localeCompare(a.updated))
export const TREND_F = Array.from({ length: 26 }).map((_, i) => ({ w: `第 ${12 + i} 周`, made: 22 + ((i * 131) % 30) + Math.round(Math.sin(i / 2.1) * 8) + Math.round(i / 2), learners: 900 + ((i * 271) % 700) + i * 25 + Math.round(Math.cos(i / 1.9) * 160), pass: 76 + ((i * 7) % 9) + Math.round(Math.sin(i / 3) * 3) }))
export const F_INSIGHTS = [
  { k: '课程缺口', v: '4 门待立项', d: '问数助手连续三周未命中：借调人员学时归属、外包人员技能认定；成长地图缺口：继电保护定值单校核 312 人未达标。', go: { v: 'gen' as const }, tag: 'warn' },
  { k: '规程更新待处理', v: '26 门课件', d: '《变电现场电气操作票管理细则》2026 修订版 10-01 生效，变电值班员必修课第二章等 26 门课件待更新。', go: { v: 'review' as const }, tag: 'bad' },
  { k: '通过率偏低', v: '3 门 < 75%', d: '继电保护定值单执行与校核、配网带电作业风险辨识、调度受令复训（南宁）三门课通过率低于 75%，集中在第四章试题。', go: { v: 'analytics' as const }, tag: 'warn' },
  { k: '内训师产能', v: '178 人 · 71%', d: '本年新增课程 71% 由内训师自主完成，第 7 期训战营 24 人 10 月结业。', go: { v: 'trainer' as const }, tag: 'ok' },
]
export const unitCourseDist = () => UNITS.map(u => ({ u, n: Math.round(u.sceneN * 4.6 + u.people * .012 + (hash(u.id + 'cd') % 9)) })).sort((a, b) => b.n - a.n)

/* ---------- 生成工作台：按单位、岗位、课时构建课程草稿 ---------- */
export type GenParams = { unit: string; post: string; hours: number; kind: CourseKind; materials: string[]; outputs: OutputKind[]; name?: string }
export function buildDraft(p: GenParams): Course {
  const u = UNITS.find(x => x.name === p.unit)
  const seed = hash(p.unit + p.post + p.hours + p.kind)
  const assets = p.materials.map(assetById).filter(Boolean) as Asset[]
  const pool = assets.length ? assets : ASSETS.filter(a => a.unit === p.unit && a.post === p.post).slice(0, 6)
  const scene = u?.scenes.find(s => s.post === p.post)
  const name = p.name || `${scene?.name ?? pool[0]?.topic ?? p.post + '业务'}${p.kind === '岗位入门' ? '岗位入门' : p.kind === '复训课' ? '复训' : p.kind === '微课' ? '' : '专题课'}`
  const chapters = chaptersFor(name, p.hours, pool, seed)
  return {
    id: `C-2026-${pad(360 + (seed % 40))}`, name, kind: p.kind, unit: p.unit, grp: u?.grp ?? '公司通用', post: p.post, hours: p.hours, status: '草稿', ver: 'v1', updated: '2026-09-14', owner: '课程工厂 · 待指定内训师', period: 0.1, src: pool.map(a => a.id), chapters,
    outputs: { 讲义: chapters.reduce((a, ch) => a + Math.round(ch.pages * 1.6), 0), 课件: chapters.reduce((a, ch) => a + ch.pages, 0), 微课脚本: chapters.length, 实训任务书: Math.max(1, Math.round(chapters.length / 2)), 配套试题: chapters.reduce((a, ch) => a + ch.quiz, 0) * 3 },
    stats: { learners: 0, done: 0, pass: 0, score: 0, rating: 0, feedback: 0 }, reviews: reviewsFor('草稿', '待指定', p.unit, seed, '2026-09-14'), history: [{ ver: 'v1', date: '2026-09-14', by: '课程工厂', note: 'AI 生成初稿' }],
    tags: [scene?.dept ?? p.post, p.post, p.kind], summary: `面向${short(p.unit)}${p.post}，围绕${scene?.name ?? name}，${p.hours} 学时，由 ${pool.length} 条知识资产生成，出处逐条回链。`,
  }
}
/* 运行期新增的草稿课程（本次会话内可在课程库看到） */
export const SESSION_COURSES: Course[] = []
export const allCourses = () => [...SESSION_COURSES, ...COURSES]
export const findCourse = (id: string) => SESSION_COURSES.find(c => c.id === id) ?? courseById(id)

/* 讲义、课件页、任务书文本 */
export function lectureText(c: Course, ch: Chapter): string {
  const as = ch.assets.map(assetById).filter(Boolean) as Asset[]
  const a = as[0]
  return `${ch.no} ${ch.title}\n\n一、本章目标\n掌握${ch.kps.join('、') || ch.title}的判断依据与操作要求，能在现场独立完成并说明出处。\n\n二、要点\n1. ${a?.body[0] ?? c.summary}\n2. ${a?.body[1] ?? '关键项双人核对，异常先上报再处理。'}\n3. ${as[1]?.body[0] ?? a?.body[2] ?? '过程记录归档并同步到知识资产中枢。'}\n\n三、现场案例\n${as.find(x => x.kind === '典型案例')?.body[0] ?? '一次因输入口径不一致导致返工的案例：缺少交叉核对步骤，责任边界不清，改进后补充双人核对并把口径写入作业步骤。'}\n\n四、出处\n${as.map(x => `· ${x.src}${x.anchor !== '—' ? `（${x.anchor}）` : ''}`).join('\n') || '· 公司相关制度'}\n\n五、本章小测 ${ch.quiz} 题，通过线 80 分。`
}
export function taskbookText(c: Course): string {
  const ch = c.chapters
  return `《${c.name}》实训任务书\n\n适用岗位：${c.post}　课时：${c.hours} 学时　考核方式：现场实操 + 口述\n\n任务一（${ch[0]?.title}）\n· 说出本环节的制度依据与责任边界，监考人抽问 2 条。\n· 评分：依据完整 10 分，边界清晰 10 分。\n\n任务二（${ch[2]?.title ?? ch[1]?.title}）\n· 按标准作业流程完成一次完整操作，关键项须口述核对内容。\n· 评分：步骤顺序 20 分，关键项核对 20 分，异常处置 10 分。\n\n任务三（${ch[3]?.title ?? '常见错项识别'}）\n· 从 5 个现场情形中识别 3 处错项并说明纠正做法。\n· 评分：识别 15 分，纠正 15 分。\n\n通过线：80 分；任一红线项失守判不通过。\n出处：${c.src.map(assetById).filter(Boolean).map(a => a!.anchor !== '—' ? a!.anchor : a!.id).join('、')}`
}
export function slidesFor(c: Course, ch: Chapter): { title: string; bullets: string[]; note: string }[] {
  const as = ch.assets.map(assetById).filter(Boolean) as Asset[]
  const a = as[0]
  return [
    { title: ch.title, bullets: ['本章目标', ...ch.kps.slice(0, 3)], note: `各位同事，这一章讲${ch.title}。` },
    { title: '制度依据', bullets: as.map(x => `${x.src}`).slice(0, 3).concat(a ? [a.anchor !== '—' ? `锚点：${a.anchor}` : `条目：${a.id}`] : []), note: '先把依据放在前面，后面每一步都能回到这里。' },
    { title: '关键动作', bullets: (a?.body ?? [c.summary]).slice(0, 3), note: '这三条是现场最容易漏的。' },
    { title: '常见错项', bullets: ['凭经验直接处理', '先执行后补记录', '跳过交叉核对', '异常未先上报'], note: '每一条都对应一次真实返工。' },
    { title: '本章小结', bullets: [`${ch.kps[0] ?? '关键判断'}先做`, `${ch.kps[1] ?? '交叉核对'}必做`, '异常先报后处'], note: '请学员复述三条小结。' },
  ]
}
/* 单位短名（去掉括号后若重名则保留全名，避免重复键） */
export function unitLabels(n: number): string[] {
  const out: string[] = []
  UNITS.slice(0, n).forEach(u => { const s = u.name.replace(/（.*）/, ''); out.push(out.includes(s) ? u.name : s) })
  return out
}
export const COACH_FOR = (c: Course) => COACHES.find(k => k.unit === c.unit) ?? COACHES[0]
