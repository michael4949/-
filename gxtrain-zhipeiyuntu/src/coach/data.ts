/* AI 智能陪练 · 数据层（客户口径的演示数据，可直接改）
   人员、班组、教练目录、场次、课程、徽章均为广西电网公司口径。 */
import { STEPS, KNOW } from './script'

/* ============ 三个数字人角色（形象取自教练形象库） ============ */
export type CharKey = 'jianhu' | 'diaodu' | 'zhiban'
export const CHARACTERS: Record<CharKey, { name: string; role: string; img: string; tint: string; org: string }> = {
  jianhu: { name: '黄志远', role: '监护人', img: 'daozha', tint: '#1e3a6e', org: '南宁供电局 变电管理所' },
  diaodu: { name: '韦 岚', role: '值班调度员', img: 'term', tint: '#0b63b0', org: '南宁地调' },
  zhiban: { name: '覃建国', role: '值班负责人', img: 'angui', tint: '#a8823a', org: '变电运行一班' },
}
export const POSE_LABEL: Record<string, string> = {
  idle: '待命', call: '唱票', confirm: '发令', point: '指向设备', explain: '讲解', stop: '制止', correct: '纠错', listen: '倾听', nod: '确认',
}

/* ============ 站点与调度口径 ============ */
export const STATION = '110kV仿真站'
export const STATION_FULL = '广西电网公司培训评价中心 · 110kV仿真站'
export const DISPATCH = '南宁地调'
export const DISPATCHER = '韦岚'
export const TASK_TEXT = '将110kV仿真站110kV培训三线1163线路由运行转检修'

/* ============ 教学模式 ============ */
export const MODES = {
  teach: { n: '教学模式', d: '每一步给出指令与标准话术，出错先提醒不判违规' },
  drill: { n: '演练模式', d: '只给方向不给答案，出错照常判定' },
  exam: { n: '考核模式', d: '无提示，全程计分' },
} as const
export type ModeKey = keyof typeof MODES

/* ============ 练习方式 ============ */
export type PlanDef = { id: string; n: string; d: string; steps: () => number[]; prep?: boolean; preset?: number | 'auto'; trap?: boolean }
export const idxOf = (f: (s: typeof STEPS[number]) => boolean) => STEPS.map((s, i) => (f(s) ? i : -1)).filter(i => i >= 0)
export function wrongSteps(): number[] {
  try {
    const last = JSON.parse(localStorage.getItem('zpyt_lastvio') || '[]') as { step: string }[]
    const nos = Array.from(new Set(last.map(v => String(v.step))))
    return idxOf(s => nos.includes(s.no))
  } catch { return [] }
}
export const PLANS: PlanDef[] = [
  { id: 'full', n: '完整操作票', d: '30 项全票，含上岗前准备与五防模拟，约 25 分钟', steps: () => STEPS.map((_, i) => i), prep: true },
  { id: 'p1', n: '分段 · 运行 → 热备用', d: '第 1–8 项，接令、核对、断开开关、汇报，约 7 分钟', steps: () => idxOf(s => s.phase === 1), preset: 1 },
  { id: 'p2', n: '分段 · 热备用 → 冷备用', d: '第 9–15 项，拉刀闸与 GIS 四项核对，约 7 分钟', steps: () => idxOf(s => s.phase === 2), preset: 2 },
  { id: 'p3', n: '分段 · 冷备用 → 检修', d: '第 16–27 项，两种验电、接地、二次隔离、挂牌，约 10 分钟', steps: () => idxOf(s => s.phase === 3), preset: 3 },
  { id: 'sp_vd', n: '专项 · 验电接地', d: '只练第 16–21 项：先验电再接地这条红线', steps: () => idxOf(s => ['16', '17', '18', '19', '20', '21'].includes(s.no)), preset: 3 },
  { id: 'sp_gis', n: '专项 · GIS 四项核对', d: '只练第 10–13 项：刀闸操作与四项位置指示', steps: () => idxOf(s => ['10', '11', '12', '13'].includes(s.no)), preset: 2 },
  { id: 'sp_ord', n: '专项 · 接令与票令核对', d: '只练三次接令：复诵、记录、票令不一致的识别（含陷阱）', steps: () => idxOf(s => ['1', '9', '16'].includes(s.no)), preset: 1, trap: true },
  { id: 'wrong', n: '错题重练', d: '重练上一次触发扣分或红线的项目', steps: () => wrongSteps(), preset: 'auto' },
]
export const PLAN2ID: [string, string][] = [['完整', 'full'], ['分段 · 运行', 'p1'], ['分段 · 热备用', 'p2'], ['分段 · 冷备用', 'p3'], ['专项 · GIS', 'sp_gis'], ['专项 · 验电', 'sp_vd'], ['专项 · 接令', 'sp_ord'], ['错题', 'wrong']]
export const planId = (name: string) => (PLAN2ID.find(([p]) => name.startsWith(p)) || ['', 'full'])[1]

/* ============ 评分口径 ============ */
export const DIMN: Record<string, string> = { rule: '规程符合性', order: '操作顺序与逻辑', dual: '双人核对执行', state: '设备状态核对', risk: '风险辨识与异常处置', term: '调度术语与记录规范' }
export const CUT: Record<string, number> = { red: 100, major: 12, minor: 5 }
export const DIMS6 = ['规程记忆', '唱票复诵', '设备状态核对', '异常处置', '调度术语', '风险辨识']
export const DIMS10 = DIMS6.concat(['操作顺序', '验电接地', '二次隔离', '记录规范'])
export const DIM10_DESC: Record<string, string> = {
  操作顺序: '按票面顺序逐项执行，不跳项、不漏项、不回退', 验电接地: '两种非同源验电确认无电压后再合接地刀闸',
  二次隔离: '压板、空气开关、把手操作前核对屏柜名称，操作后核对指示', 记录规范: '接令记录、操作票填写、标注"√"的时机与完整性',
}
export const DIM_PLAN: Record<string, [string, string]> = { 设备状态核对: ['sp_gis', 'GIS 四项核对'], 调度术语: ['sp_ord', '接令与票令核对'], 规程记忆: ['sp_vd', '验电接地'], 唱票复诵: ['sp_vd', '验电接地'] }

/* ============ 上岗前准备 ============ */
export const AUDIT = [
  '操作任务、操作步骤填写正确，操作人自审、监护人审核、值班负责人审批三审签字完毕',
  '操作人、监护人资格在有效范围内，受令人具备相应调度受令资格',
  '一组操作人员本时间段内只执行本份操作票',
]
export const DRESS = [
  '纯棉工作服着装整洁完好，扣子扣全，袖口、裤脚不挽起',
  '操作人佩戴操作人袖章，监护人佩戴监护人袖章',
  '安全帽外观正常且在有效期内，双手持帽檐从前至后扣于头顶，调整后箍并系好下颌带',
]

/* ============ 拟票练习 ============ */
export const FLOW: [string, string][] = [
  ['接受任务', '值班负责人接调度预令，明确操作任务与时间'],
  ['拟票', '按调度预令和现场设备状态逐项拟写操作票'],
  ['审核', '拟票人自审、监护人复审、值班负责人审核'],
  ['签发', '值班负责人签发，注明操作票编号与拟票时间'],
  ['五防模拟', '在五防主机上按票序模拟，通过后下传电脑钥匙'],
  ['现场操作', '监护人唱票、操作人手指口述复诵、执行后检查回报'],
  ['汇报终结', '逐段汇报调度，操作完毕记录结束时间并归档'],
]
export const FHEAD = [
  { k: 'unit', n: '发令单位', ok: '南宁地调', opt: ['南宁地调', '广西中调', '本站值班负责人'],
    why: '本次操作任务由南宁地调下令，发令单位应按实际下令单位填写，不得写成本站或其他调度机构。' },
  { k: 'from', n: '发令人', ok: '韦岚', opt: ['韦岚', '黄志远', '梁玲玲'],
    why: '发令人是调度侧实际下令的值班调度员，黄志远是本站监护人、梁玲玲是操作人，都不能填在发令人栏。' },
  { k: 'to', n: '受令人', ok: '黄志远', opt: ['黄志远', '梁玲玲', '韦岚'],
    why: '受令人须是当值值班负责人或经授权的具备接令资格人员，本次由监护人黄志远接令，操作人不得代为接令。' },
  { k: 'task', n: '操作任务', ok: TASK_TEXT,
    opt: [TASK_TEXT, '将110kV仿真站110kV培训三线1163线路由运行转冷备用', '将培训三线1163开关由运行转检修'],
    why: '操作任务须写全变电站名称、电压等级与设备双重名称，操作对象是线路而非开关；本票最终状态是检修。' },
]
export const SEGNAME: Record<number, string> = { 1: '运行 → 热备用', 2: '热备用 → 冷备用', 3: '冷备用 → 检修' }

/* ============ 设备双重名称 ============ */
export const DEVNAME: Record<string, string> = {
  CB1163: '培训三线1163开关', DS11634: '培训三线线路侧11634刀闸', DS11632: '培训三线2M侧11632刀闸',
  ES116340: '培训三线线路侧116340地刀', K1QK: '1QK把手', KZK: 'ZK把手',
  M1DK: '1DK空气开关', M2DK: '2DK空气开关', M4DK: '4DK空气开关', M1K2: '1K2空气开关',
  M1K1: '1K1空气开关', M1ZKK: '1ZKK空气开关',
  T4DK: '4DK空气开关（挂牌位）', T11634: '11634刀闸操作把手（挂牌位）', TCLOSE: '1163开关合闸按钮（挂牌位）',
  hmi_mode: '运行方式光字牌', hmi_current: '三相电流遥测', hmi_volt: '线路二次电压',
  bay_plate: '间隔名称牌', bay_hvdisp: '高压带电显示装置', cab_hvdisp: '高压带电显示装置', bay_draw: '汇控柜模拟接线图', bay_label: '设备标签',
  p8_open: '1163开关分闸按钮', p8_close: '1163开关合闸按钮', ES116340_open: '116340地刀分闸按钮', cab_handle: '11634刀闸操作把手',
  gis_hui: '汇控柜电气指示', gis_mech: '机构箱机械指示', gis_arm: '刀闸拐臂指示', gis_line: '转轴划线标识',
  WFKEY: '电脑钥匙',
}
export const devName = (id: string) => DEVNAME[id] || id
export const LOCSHORT: Record<string, string> = { phone: '调度电话旁', wufang: '五防电脑', hmi: '监控后台', bay: '1163间隔现场', p8: '8P测控屏', p20: '20P保护屏', cab: '就地控制柜' }

/* ============ 设备编号读法 ============ */
export const NUMREAD: [string, string, string][] = [
  ['一十一万六千三百四十', '116340', '一一六三四零'], ['十一万六千三百四十', '116340', '一一六三四零'],
  ['一万一千六百三十四', '11634', '一一六三四'], ['一万一千六百三十二', '11632', '一一六三二'], ['一千一百六十三', '1163', '一一六三'],
]

/* ============ 五拍 ============ */
export const BEATS: [string, string][] = [['唱票', 'CALL'], ['手指口述', 'POINT+RECITE'], ['对，执行', 'ORDER'], ['执行', 'ACT'], ['检查回报', 'REPORT'], ['标√', 'TICK']]

/* ============ 学员 / 班组长 / 培训科 ============ */
export type RoleKey = 'student' | 'lead' | 'dept'
export const HOME_USER = {
  name: '梁玲玲', team: '变电运行一班', unit: '南宁供电局 变电管理所', post: '变电运行值班员', join: '2024-08', mentor: '黄志远',
  hours: { done: 68, need: 90 },
  certs: [
    { n: '高压电工作业证', got: '2024-03-18', review: '2027-03-17', ok: true },
    { n: '变电站倒闸操作资格', got: '2025-01-10', review: '2026-01-09', ok: true },
  ],
}
export const LEAD_USER = { name: '覃建国', team: '变电运行一班', unit: '南宁供电局 变电管理所', post: '班组长' }
export const DEPT_USER = { name: '陈科长', team: '人力资源部培训科', unit: '广西电网公司本部', post: '培训科' }

export const RADAR_NOW = [86, 90, 62, 74, 71, 83]
export const RADAR_PREV = [80, 84, 55, 60, 66, 79]
export const RADAR_OLD = [72, 78, 48, 52, 60, 74]
export const TEAM_AVG = [82, 85, 74, 70, 78, 80]
export const RADAR10_NOW = RADAR_NOW.concat([88, 76, 80, 84])
export const RADAR10_PREV = RADAR_PREV.concat([82, 64, 72, 78])
export const RADAR10_OLD = RADAR_OLD.concat([74, 55, 60, 70])
export const TEAM_AVG10 = TEAM_AVG.concat([84, 79, 77, 82])

export type Vio = { lv: 'red' | 'major' | 'minor'; step: string; t: string; cite: string; detail?: string; rule?: string; cut?: number; dimn?: string }
export type Session = {
  id?: string; d: number; plan: string; mode: string; dur: number; score: number
  hints: [string, string][]; vio: Vio[]; praise?: { title: string }[]; lines?: Line[]; dims?: number[]; real?: boolean; ts?: number
}
export type Line = { step: string; beat: number; t: string; mine: string; std: string }

export const SESSIONS: Session[] = [
  { d: 1, plan: '分段 · 冷备用 → 检修', mode: '演练模式', dur: 23, score: 86, hints: [['设备状态核对', 'GIS 四项核对第二级提示']], vio: [{ lv: 'minor', step: '13', t: '四项位置指示核对顺序不完整', cite: '附录G-5' }] },
  { d: 3, plan: '专项 · GIS 四项核对', mode: '演练模式', dur: 11, score: 78, hints: [['设备状态核对', 'GIS 四项核对第一级提示']], vio: [{ lv: 'minor', step: '11', t: '汇控柜电气指示未逐项唱读', cite: '附录G-5' }] },
  { d: 5, plan: '完整操作票', mode: '演练模式', dur: 47, score: 88, hints: [], vio: [{ lv: 'minor', step: '9', t: '接令记录漏填发令时间', cite: '细则第十八条' }] },
  { d: 8, plan: '专项 · 接令与票令核对', mode: '考核模式', dur: 9, score: 92, hints: [], vio: [] },
  { d: 11, plan: '分段 · 热备用 → 冷备用', mode: '演练模式', dur: 19, score: 83, hints: [['调度术语', '复诵话术第一级提示']], vio: [{ lv: 'minor', step: '10', t: '复诵缺设备双重名称', cite: '附录J' }] },
  { d: 13, plan: '错题重练', mode: '演练模式', dur: 14, score: 90, hints: [], vio: [] },
  { d: 16, plan: '专项 · 验电接地', mode: '教学模式', dur: 12, score: 75, hints: [['规程记忆', '验电顺序第一级提示']], vio: [{ lv: 'major', t: '验电顺序不完整', step: '18', cite: '附录G-23' }] },
  { d: 18, plan: '分段 · 运行 → 热备用', mode: '教学模式', dur: 17, score: 81, hints: [], vio: [{ lv: 'minor', step: '4', t: '检查回报口径不完整', cite: '附录J' }] },
  { d: 22, plan: '完整操作票', mode: '演练模式', dur: 52, score: 74, hints: [['异常处置', '异常上报流程第二级提示']], vio: [{ lv: 'major', step: '11', t: '发现异常未立即中止操作', cite: '细则第十三条（四）' }, { lv: 'minor', step: '12', t: '汇报值班负责人用语不规范', cite: '附录J' }] },
  { d: 25, plan: '专项 · GIS 四项核对', mode: '教学模式', dur: 13, score: 70, hints: [['设备状态核对', 'GIS 四项核对第三级提示']], vio: [{ lv: 'minor', step: '11', t: '只核对后台未核对就地指示', cite: '附录G-5' }] },
  { d: 27, plan: '分段 · 冷备用 → 检修', mode: '教学模式', dur: 26, score: 68, hints: [['设备状态核对', 'GIS 四项核对第二级提示'], ['规程记忆', '接地前验电第一级提示']], vio: [{ lv: 'red', step: '20', t: '未完成两种验电即准备合接地刀闸', cite: '细则第十三条（四）' }] },
  { d: 29, plan: '完整操作票', mode: '教学模式', dur: 58, score: 66, hints: [['唱票复诵', '唱票节拍第一级提示']], vio: [{ lv: 'minor', step: '2', t: '唱票未等监护人"对，执行"即操作', cite: '附录J' }, { lv: 'minor', step: '6', t: '走错间隔经提醒返回', cite: '附录J' }] },
]
export const HOME_TASK = { plan: 'full', name: '完整操作票（考核模式）', from: '班组长 覃建国', dueDays: 2 }
export const FITNESS = {
  pct: 82, post: '变电运行值班员',
  parts: [
    { n: '规程理论考试', v: '92 分', need: '≥ 80 分', ok: true },
    { n: '实操演练场次', v: '12 场', need: '≥ 15 场', ok: false, gap: '再完成 3 场演练/考核模式练习' },
    { n: '年度培训学时', v: '68 学时', need: '≥ 90 学时', ok: false, gap: '知识课堂待修 22 学时' },
    { n: '有效资质证书', v: '2 / 2', need: '2 项齐全', ok: true },
  ],
}
export const HOUR_LOG = [
  { d: 2, n: '变电站防误操作专题', h: 2, src: '知识课堂' },
  { d: 6, n: '完整操作票练习（陪练学时）', h: 1, src: '陪练回写' },
  { d: 9, n: '安规（变电部分）年度复训', h: 4, src: '知识课堂' },
  { d: 15, n: '两票管理细则修编解读', h: 2, src: '知识课堂' },
  { d: 23, n: '完整操作票练习（陪练学时）', h: 1, src: '陪练回写' },
]

/* ============ 班组 12 人（广西口径） ============ */
export type Member = { n: string; post: string; sess: number; avg: number; last: number; task: 'todo' | 'done'; red: number; dims: number[] }
export const TEAM: Member[] = [
  { n: '梁玲玲', post: '变电运行值班员', sess: 12, avg: 79, last: 1, task: 'todo', red: 1, dims: [86, 90, 62, 74, 71, 83] },
  { n: '黄文博', post: '变电运行值班员', sess: 9, avg: 84, last: 2, task: 'done', red: 0, dims: [88, 86, 80, 78, 82, 85] },
  { n: '韦思远', post: '变电运行主值', sess: 6, avg: 91, last: 4, task: 'done', red: 0, dims: [93, 92, 88, 86, 90, 91] },
  { n: '覃雨桐', post: '变电运行值班员', sess: 11, avg: 76, last: 1, task: 'done', red: 1, dims: [80, 82, 70, 66, 74, 79] },
  { n: '农泽宇', post: '变电运行值班员', sess: 3, avg: 68, last: 9, task: 'todo', red: 1, dims: [72, 70, 58, 60, 64, 71] },
  { n: '陆晓萌', post: '变电运行值班员', sess: 8, avg: 82, last: 3, task: 'done', red: 0, dims: [85, 88, 74, 77, 80, 84] },
  { n: '蓝子豪', post: '变电运行值班员', sess: 0, avg: 0, last: -1, task: 'todo', red: 0, dims: [0, 0, 0, 0, 0, 0] },
  { n: '莫嘉琪', post: '变电运行主值', sess: 5, avg: 88, last: 6, task: 'done', red: 0, dims: [90, 89, 85, 84, 88, 90] },
  { n: '潘俊杰', post: '变电运行值班员', sess: 7, avg: 73, last: 5, task: 'todo', red: 2, dims: [76, 78, 64, 62, 70, 77] },
  { n: '唐淑仪', post: '变电运行值班员', sess: 10, avg: 85, last: 2, task: 'done', red: 0, dims: [87, 90, 78, 80, 84, 86] },
  { n: '卢浩然', post: '变电运行值班员', sess: 0, avg: 0, last: -1, task: 'todo', red: 0, dims: [0, 0, 0, 0, 0, 0] },
  { n: '罗芷若', post: '变电运行值班员', sess: 4, avg: 80, last: 7, task: 'done', red: 0, dims: [83, 84, 72, 75, 78, 81] },
]
export const REDLINES: [string, number][] = [['GIS 只看后台未核对就地', 4], ['未验电即合接地刀闸', 3], ['走错间隔', 2], ['票令不一致未识别', 2], ['发现异常未中止', 2], ['跳项操作', 1]]
export const MILESTONES = [
  { d: '2024-08-30', t: '入职集中培训结业', k: 'done' }, { d: '2025-02-28', t: '导师带教期通过', k: 'done' },
  { d: '2025-06-12', t: '首次独立完成倒闸操作', k: 'done' }, { d: '2026-03-18', t: '安规年度考试 92 分', k: 'done' },
  { d: null, ago: 29, t: '首场完整操作票陪练', k: 'done' }, { d: null, ago: 8, t: '首场考核模式满 90 分', k: 'done' },
  { d: null, ago: -2, t: '完整操作票 · 考核模式（班组长下发）', k: 'next' }, { d: null, ago: -30, t: '岗位胜任度认定（人工审核）', k: 'future' },
] as { d: string | null; ago?: number; t: string; k: string }[]
export const LADDER = [
  { post: '变电运行值班员', cur: true, req: ['安规考试 ≥ 80', '实操场次 ≥ 15', '年度学时 ≥ 90', '资质证书齐全'], met: [true, false, false, true] },
  { post: '变电运行主值', cur: false, req: ['胜任度认定通过', '独立值班 ≥ 12 个月', '异常处置专项 ≥ 85', '带教新员工 1 名'], met: [false, false, false, false] },
  { post: '值长', cur: false, req: ['主值任职 ≥ 24 个月', '事故预案演练组织', '班组管理培训结业'], met: [false, false, false] },
]

/* ============ 学员成长地图（工作台中心件） ============ */
export const GROWTH_NODES = [
  { id: 'g1', x: 85, y: 505, s: 'done', t: '岗前培训', v: '已完成' },
  { id: 'g2', x: 215, y: 435, s: 'done', t: '安规考试', v: '92 分' },
  { id: 'g3', x: 345, y: 365, s: 'done', t: '完整票·教学模式', v: '已完成' },
  { id: 'g4', x: 465, y: 285, s: 'done', t: '分段与专项强化', v: '8 场' },
  { id: 'g5', x: 585, y: 340, s: 'cur', t: 'GIS 四项核对·专项', v: '补强中 62 分' },
  { id: 'g6', x: 695, y: 250, s: 'next', t: '完整票·考核模式', v: '' },
  { id: 'g7', x: 800, y: 165, s: 'ahead', t: '胜任度测算', v: '82%' },
  { id: 'g8', x: 818, y: 88, s: 'future', t: '晋升通道·主值', v: '差距 2 项' },
  { id: 'b1', x: 555, y: 88, s: 'feed', t: '年度学时', v: '68/90' },
  { id: 'b2', x: 425, y: 135, s: 'feed', t: '实操场次', v: '12/15' },
]
export const GROWTH_EDGES = [
  { d: 'M85,505 C130,478 168,458 215,435', s: 'done' }, { d: 'M215,435 C258,412 300,388 345,365', s: 'done' },
  { d: 'M345,365 C385,338 425,310 465,285', s: 'done' }, { d: 'M465,285 C505,303 545,322 585,340', s: 'done', p: 1 },
  { d: 'M585,340 C620,310 658,278 695,250', s: 'act', p: 1 }, { d: 'M695,250 C730,222 765,192 800,165', s: 'future' },
  { d: 'M800,165 C812,138 816,112 818,88', s: 'future' }, { d: 'M555,88 C640,98 725,125 795,158', s: 'feed', p: 1 },
  { d: 'M425,135 C550,143 675,150 793,162', s: 'feed', p: 1 },
]

/* ============ AI 教练目录：覆盖公司本部、直属机构、地市局、县域、产业公司 ============ */
export type Coach = {
  id: string; n: string; fam: string; dom: string; unit: string; open: boolean; lvl: 1 | 2 | 3; min: number; users: number; gain: number
  tags: string[]; desc: string; avatar?: string; custom?: boolean; scene?: string
}
export const COACH_FAMS = ['变电运行', '变电检修', '配网与供电所', '调度', '营销服务', '安全监督', '班组管理', '本部职能部门', '直属机构', '产业公司']
export const COACHES: Coach[] = [
  { id: 'daozha', n: '倒闸操作 · 黄志远', fam: '变电运行', dom: '倒闸操作', unit: '地市供电局（14 个）', open: true, lvl: 3, min: 45, users: 238, gain: 11, tags: ['唱票复诵', '设备状态核对', '调度术语'], desc: '110kV 线路运行转检修全流程对练：接令、唱票复诵、手指口述、执行核对、检查回报，含票令核对与异常处置支线。' },
  { id: 'abn', n: '事故异常处置推演', fam: '变电运行', dom: '异常处置', unit: '地市供电局（14 个）', open: false, lvl: 3, min: 30, users: 186, gain: 9, tags: ['异常处置', '调度术语'], desc: '刀闸位置不一致、保护动作、直流接地等典型异常的中止、汇报、隔离处置对练。' },
  { id: 'patrol', n: '设备巡视要点考问', fam: '变电运行', dom: '设备巡视', unit: '生产技术部', open: false, lvl: 2, min: 20, users: 154, gain: 7, tags: ['规程记忆', '风险辨识'], desc: '按巡视路线逐设备考问外观、油位、压力、红外测温判读要点，漏项即时纠正。', scene: '变电站视频与红外巡检智能分析' },
  { id: 'test', n: '高压试验作业交底', fam: '变电检修', dom: '高压试验', unit: '广西电科院', open: false, lvl: 3, min: 25, users: 97, gain: 8, tags: ['作业交底', '风险辨识'], desc: '试验前安全交底对练：试验范围、加压区域、监护布置、异常终止条件逐项陈述。', scene: '设备入网检测与型式试验' },
  { id: 'anco', n: '检修安全措施布置', fam: '变电检修', dom: '检修作业', unit: '地市供电局（14 个）', open: false, lvl: 2, min: 22, users: 121, gain: 8, tags: ['安措布置', '规程记忆'], desc: '按工作票核对接地、遮栏、标示牌布置顺序与完整性，缺项漏项即时指出。' },
  { id: 'relay', n: '二次安措与定值单核对', fam: '变电检修', dom: '二次作业', unit: '电力调度控制中心（省调）', open: false, lvl: 3, min: 28, users: 76, gain: 10, tags: ['安措布置', '设备状态核对'], desc: '压板投退、二次接线隔离与定值单逐项核对对练，防走错间隔、防误碰运行设备。', scene: '保护定值整定计算与校核' },
  { id: 'dnet', n: '配网抢修工单处置', fam: '配网与供电所', dom: '故障抢修', unit: '地市供电局（14 个）', open: false, lvl: 2, min: 24, users: 203, gain: 9, tags: ['应急处置', '沟通表达'], desc: '接单、研判、到场勘查、隔离恢复、回访全流程对练，含多工单并发排序。', scene: '抢修班组调度与抢修车辆定位调派' },
  { id: 'live', n: '带电作业作业许可', fam: '配网与供电所', dom: '带电作业', unit: '生产技术部', open: false, lvl: 3, min: 26, users: 68, gain: 8, tags: ['作业交底', '风险辨识'], desc: '带电作业许可条件逐项核对与终止条件判断对练，气象、绝缘、监护缺一不可。', scene: '带电作业方案编制与风险评估' },
  { id: 'biz2', avatar: 'biz', n: '台区经理走访与用电潜力挖掘', fam: '配网与供电所', dom: '台区服务', unit: '地市供电局（14 个）', open: true, lvl: 2, min: 20, users: 312, gain: 9, tags: ['沟通表达', '数据判读'], desc: 'AI 扮演台区客户，练习走访开场、用电情况问询、增供扩销机会识别与线损异常的现场解释。', scene: '台区片区服务、走访与用电潜力挖掘（P1）' },
  { id: 'dnet2', avatar: 'dnet', n: '供电所营配综合受理', fam: '配网与供电所', dom: '综合柜员', unit: '广西新电力投资集团（40 家县企）', open: false, lvl: 2, min: 18, users: 141, gain: 7, tags: ['沟通表达', '流程规范'], desc: '县域供电所综合柜员对练：报装、过户、更名、故障报修的受理口径与时限承诺，AI 扮演客户逐轮追问。', scene: '供电所营配业务综合受理与办理' },
  { id: 'term', n: '调度术语对练 · 韦岚', fam: '调度', dom: '调度用语', unit: '电力调度控制中心（省调）', open: false, lvl: 2, min: 15, users: 312, gain: 12, tags: ['调度术语', '唱票复诵'], desc: '规范术语、设备双重名称、复诵与录音留痕要点的高频对练，纠正口语化表达。', scene: '调度指令录音转写与复诵一致性核对' },
  { id: 'order', n: '接发令规范', fam: '调度', dom: '接发令', unit: '地市供电局（14 个）', open: false, lvl: 2, min: 18, users: 145, gain: 9, tags: ['调度术语', '规程记忆'], desc: '接令记录、复诵核对、票令一致性判断对练，含故意念错的干扰令识别。' },
  { id: 'cust', n: '业扩报装现场勘查', fam: '营销服务', dom: '业扩报装', unit: '市场营销部', open: true, lvl: 2, min: 22, users: 189, gain: 7, tags: ['风险辨识', '沟通表达'], desc: '现场勘查要点、供电方案要素与客户答疑对练，AI 扮演报装客户与设计单位。', scene: '业扩报装受理、流程流转与超期预警（P1）' },
  { id: 'comp', n: '95598 投诉工单回复', fam: '营销服务', dom: '投诉处理', unit: '客户服务中心（95598）', open: false, lvl: 2, min: 16, users: 132, gain: 7, tags: ['沟通表达'], desc: '按投诉分类练习回复口径与时限要求，回复初稿逐句点评。', scene: '智能语音客服与用户意图识别' },
  { id: 'biz', n: '台区线损异常现场解释', fam: '营销服务', dom: '线损治理', unit: '市场营销部', open: false, lvl: 2, min: 20, users: 156, gain: 8, tags: ['数据判读', '沟通表达'], desc: '面对高损台区的用户与所长，用数据说清线损来源、排查顺序与整改动作。', scene: '台区线损分析与治理定位（P1）' },
  { id: 'cust2', avatar: 'cust', n: '充电站客户服务与故障响应', fam: '营销服务', dom: '客户服务', unit: '广西电动汽车服务公司', open: false, lvl: 1, min: 15, users: 88, gain: 6, tags: ['沟通表达', '应急处置'], desc: '充电桩故障报修、占位纠纷、动态价格解释的客户应答对练。', scene: '充电站运营分析与动态价格策略（P1）' },
  { id: 'angui', n: '安规考问 · 变电部分', fam: '安全监督', dom: '安规', unit: '安全监管部', open: false, lvl: 2, min: 18, users: 421, gain: 10, tags: ['规程记忆'], desc: '按章节随机考问 + 场景判断题，答错即出条款原文与解析。', scene: '安全培训、考试与题库管理' },
  { id: 'fire', n: '消防应急处置', fam: '安全监督', dom: '应急', unit: '安全监管部', open: false, lvl: 2, min: 20, users: 167, gain: 8, tags: ['应急处置'], desc: '设备着火、人员触电急救的分秒推演，处置顺序错误即时打断。', scene: '应急预案生成与演练效果评估' },
  { id: 'space', n: '有限空间作业监护', fam: '安全监督', dom: '作业监护', unit: '广西送变电建设公司', open: false, lvl: 3, min: 24, users: 54, gain: 9, tags: ['风险辨识', '安措布置'], desc: '气体检测、通风、监护职责与应急撤离的全要素对练。', scene: '施工现场安全旁站与验收记录' },
  { id: 'meet', n: '班组安全日活动主持', fam: '班组管理', dom: '班组建设', unit: '地市供电局（14 个）', open: false, lvl: 1, min: 15, users: 98, gain: 6, tags: ['沟通表达', '带教引导'], desc: '安全日活动的议程组织、案例讲评与讨论引导演练。' },
  { id: 'mentor', n: '新员工岗前引导', fam: '班组管理', dom: '师带徒', unit: '人力资源部', open: false, lvl: 1, min: 18, users: 73, gain: 6, tags: ['带教引导'], desc: '入职首周引导对练：安全交底、岗位认知、首次上站注意事项。' },
  { id: 'hr1', avatar: 'comp', n: '人资制度政策应答', fam: '本部职能部门', dom: '员工服务', unit: '人力资源部', open: true, lvl: 1, min: 15, users: 264, gain: 8, tags: ['制度记忆', '沟通表达'], desc: 'AI 扮演来访员工，就社保、公积金、证明开具、休假与薪酬口径逐轮提问，答复须引用制度条款。', scene: '人资制度与政策智能问答（P2）' },
  { id: 'hr2', avatar: 'mentor', n: '结构化面试官对练', fam: '本部职能部门', dom: '招聘配置', unit: '人力资源部', open: false, lvl: 2, min: 25, users: 41, gain: 7, tags: ['带教引导', '沟通表达'], desc: '按岗位胜任力模型追问，AI 扮演候选人；评分偏差与诱导性提问即时提示。', scene: '简历筛选与岗位胜任力匹配' },
  { id: 'off1', avatar: 'meet', n: '会议纪要与督办应答', fam: '本部职能部门', dom: '文秘会务', unit: '办公室', open: false, lvl: 1, min: 15, users: 57, gain: 6, tags: ['公文规范', '沟通表达'], desc: '听会后口述纪要要点、议题跟踪与领导批示督办的闭环应答。', scene: '会议纪要生成与议题跟踪' },
  { id: 'fin1', avatar: 'biz', n: '票据审核与报销答疑', fam: '本部职能部门', dom: '财务共享', unit: '财务部', open: false, lvl: 2, min: 18, users: 96, gain: 7, tags: ['制度记忆', '数据判读'], desc: 'AI 扮演报销人，核算会计练习票据合规判断、退单口径与政策解释。', scene: '票据识别与凭证自动生成（P2）' },
  { id: 'sup1', avatar: 'test', n: '供应商资质核验问答', fam: '本部职能部门', dom: '供应商管理', unit: '物资部（供应链管理）', open: false, lvl: 2, min: 20, users: 62, gain: 7, tags: ['制度记忆', '风险辨识'], desc: '按招标文件逐项核对供应商资质、业绩与关联关系，AI 扮演投标人应答。', scene: '供应商资质、业绩与关联关系核验' },
  { id: 'law1', avatar: 'order', n: '合同风险条款谈判', fam: '本部职能部门', dom: '合同管理', unit: '法律事务部（合规）', open: false, lvl: 3, min: 25, users: 38, gain: 8, tags: ['风险辨识', '沟通表达'], desc: 'AI 扮演对方法务，围绕违约、验收、知识产权条款轮番施压，练习守住底线的表达。', scene: '各类合同法律风险智能审查' },
  { id: 'dig1', avatar: 'relay', n: '运维工单故障根因推演', fam: '本部职能部门', dom: '应用运维', unit: '数字化部（信息中心）', open: false, lvl: 2, min: 22, users: 71, gain: 8, tags: ['异常处置', '数据判读'], desc: '按告警与日志线索逐步收敛根因，跳步猜测即时打断。', scene: '应用运维工单处理与故障根因定位' },
  { id: 'aud1', avatar: 'order', n: '审计取证访谈', fam: '本部职能部门', dom: '内部审计', unit: '审计部', open: false, lvl: 2, min: 20, users: 29, gain: 6, tags: ['沟通表达', '风险辨识'], desc: 'AI 扮演被审计单位经办人，练习提问顺序、证据固定与口径核实。', scene: '内部审计疑点智能筛查' },
  { id: 'plan1', avatar: 'biz', n: '新能源接入承载力答复', fam: '本部职能部门', dom: '新能源规划', unit: '战略规划部', open: false, lvl: 2, min: 20, users: 44, gain: 7, tags: ['数据判读', '沟通表达'], desc: '面对分布式光伏业主的接入诉求，用台区承载力数据说明序位与方案。', scene: '台区级新能源承载力评估与接入序位安排（P2）' },
  { id: 'cap1', avatar: 'anco', n: '施工现场安全旁站交底', fam: '本部职能部门', dom: '质量安全', unit: '基建部', open: false, lvl: 2, min: 22, users: 83, gain: 8, tags: ['作业交底', '风险辨识'], desc: '高处、吊装、临近带电作业的交底与违章制止对练。', scene: '施工现场作业违章视频智能识别（P2）' },
  { id: 'par1', avatar: 'meet', n: '新闻稿口径与舆情应答', fam: '本部职能部门', dom: '新闻宣传', unit: '党建工作部（宣传）', open: false, lvl: 1, min: 15, users: 36, gain: 6, tags: ['沟通表达', '公文规范'], desc: '停电事件、抢修进展的对外口径练习，AI 扮演媒体记者追问。', scene: '新闻稿件、外宣素材与融媒体内容生产' },
  { id: 'trd1', avatar: 'term', n: '市场主体注册咨询应答', fam: '直属机构', dom: '市场管理', unit: '广西电力交易中心', open: false, lvl: 2, min: 18, users: 52, gain: 7, tags: ['制度记忆', '沟通表达'], desc: 'AI 扮演售电公司与用户，就注册条件、绿电绿证交易规则逐轮咨询。', scene: '绿电与绿证交易组织及跨区撮合（P2）' },
  { id: 'met1', avatar: 'patrol', n: '采集异常处理推演', fam: '直属机构', dom: '采集运维', unit: '计量中心', open: false, lvl: 2, min: 20, users: 118, gain: 8, tags: ['异常处置', '数据判读'], desc: '按采集失败类型逐步定位终端、信道、表计原因，练习派单口径。', scene: '用电信息采集成功率提升与异常处理（P1）' },
  { id: 'cs1', avatar: 'comp', n: '95598 坐席意图识别对练', fam: '直属机构', dom: '话务运营', unit: '客户服务中心（95598）', open: false, lvl: 1, min: 15, users: 204, gain: 7, tags: ['沟通表达'], desc: 'AI 扮演来电用户，坐席练习意图识别、工单分类与话术规范。', scene: '智能语音客服与用户意图识别' },
  { id: 'tec1', avatar: 'mentor', n: '考评员实操评分校准', fam: '直属机构', dom: '技能评价', unit: '培训评价中心', open: true, lvl: 2, min: 20, users: 66, gain: 8, tags: ['带教引导', '规程记忆'], desc: '观看同一段操作录像，与 AI 评分逐项比对，校准考评尺度。', scene: '技能等级评价与实操考评' },
  { id: 'ene1', avatar: 'biz', n: '用户能效诊断沟通', fam: '产业公司', dom: '节能服务', unit: '广西电网能源科技公司', open: false, lvl: 2, min: 20, users: 47, gain: 7, tags: ['数据判读', '沟通表达'], desc: '面对工业用户，用负荷曲线说明节能改造空间与收益测算。', scene: '用户能效诊断与节能改造方案生成（P2）' },
  { id: 'con1', avatar: 'live', n: '输电线路施工工序交底', fam: '产业公司', dom: '工程技术', unit: '广西送变电建设公司', open: false, lvl: 2, min: 22, users: 58, gain: 7, tags: ['作业交底', '风险辨识'], desc: '基础、组塔、架线三阶段的技术交底对练，AI 扮演班组长提问。', scene: '施工方案编制与技术交底文件生成' },
]
export const COACH_GLYPH: Record<string, string> = { 变电运行: '运', 变电检修: '检', 配网与供电所: '配', 调度: '调', 营销服务: '营', 安全监督: '安', 班组管理: '班', 本部职能部门: '职', 直属机构: '直', 产业公司: '产' }
export const RECO = [
  { coach: 'daozha', pre: 'sp_gis', why: '近两场「设备状态核对」使用了提示', act: '开始练习' },
  { coach: 'term', pre: null as string | null, why: '「调度术语」低于班组均值 7 分', act: '查看教练' },
  { coach: 'angui', pre: null as string | null, why: '安规修编后尚未复训', act: '查看教练' },
]
export const MYCOACH = [{ id: 'daozha', last: '今天 09:12', cnt: 14, score: 86, prog: 72 }]
export const COACH_APPLY: { id: string; at: string; st: string }[] = [
  { id: 'term', at: '9月5日 提交', st: '培训专责审核中' },
  { id: 'angui', at: '9月1日 提交', st: '已通过 · 待配置账号' },
]

/* ============ 知识课堂（供给来自智培云图知识资产中枢与课程工厂） ============ */
export const CLASSROOM = {
  syncAt: '今日 07:30',
  supply: [
    { k: 'course', n: '课程库', v: '1,286 门', note: '来自 AI 课程工厂', dir: 'in' },
    { k: 'quiz', n: '题库', v: '28,450 题', note: '错题联动出题', dir: 'in' },
    { k: 'hours', n: '学时', v: '68 / 90', note: '陪练学时回写', dir: 'out' },
    { k: 'profile', n: '学员画像', v: '36 字段', note: '来自成长地图', dir: 'in' },
  ],
  quizLink: [
    { vio: '四项位置指示核对顺序不完整', q: 'GIS 组合电器刀闸操作后应依次核对哪四项指示？', mastery: 60, tries: 3 },
    { vio: '复诵缺设备双重名称', q: '操作票中设备名称须填写哪两项要素？', mastery: 80, tries: 2 },
    { vio: '接令记录漏填发令时间', q: '接受调度指令时记录应包含哪些内容？', mastery: 100, tries: 1 },
    { vio: '验电顺序不完整', q: '不能直接验电的设备如何确认无电压？', mastery: 70, tries: 2 },
  ],
  profileSync: [['岗位与序列', '变电运行值班员 · 运行序列', '已同步'], ['资质证书', '2 项有效', '已同步'], ['年度学时', '68 学时', '已回写'], ['能力六维', '本月更新', '已同步'], ['陪练场次', '12 场 / 30 天', '已回写']],
}
export const ARCH_IF: Record<string, { n: string; dir: string; freq: string; fields: string[]; last: string }> = {
  course: { n: '课程库', dir: '课程工厂 → 陪练', freq: '每日 07:30 增量同步', fields: ['课程编号', '课程名称', '学时', '能力标签', '章节', '适用岗位'], last: '1,286 门 · 今日新增 6 门' },
  quiz: { n: '题库', dir: '知识资产中枢 → 陪练', freq: '每日 07:30 增量同步', fields: ['题目编号', '题干', '选项', '答案', '解析', '依据条款', '能力标签'], last: '28,450 题 · 错题联动 4 类' },
  hours: { n: '学时回写', dir: '陪练 → 成长地图', freq: '每场陪练结束即时回写', fields: ['学员工号', '场次编号', '练习方式', '学时', '得分', '完成时间'], last: '本月已回写 3 条' },
  profile: { n: '学员画像', dir: '成长地图 ⇄ 陪练', freq: '每日 07:30 双向同步', fields: ['岗位与序列', '资质证书', '年度学时', '能力六维', '陪练场次', '任务完成'], last: '36 字段 · 全部一致' },
}
export const COURSE_LIB = [
  { id: 'c1', n: 'GIS 设备结构与四项位置指示核对', h: 4, tag: '设备状态核对', lvl: '进阶', ch: ['GIS 结构与气室', '汇控柜电气指示', '机构箱机械指示与拐臂', '转轴划线与异常判读'], done: 1, k: 'gis' },
  { id: 'c2', n: '调度规范用语与接发令要点', h: 2, tag: '调度术语', lvl: '基础', ch: ['规范术语与双重名称', '接令记录与复诵'], done: 0, k: 'diaodu' },
  { id: 'c3', n: '变电站防误操作专题', h: 2, tag: '规程记忆', lvl: '基础', ch: ['五防原理', '模拟预演与电脑钥匙'], done: 2, k: 'wufang' },
  { id: 'c4', n: '两票管理细则修编解读', h: 2, tag: '规程记忆', lvl: '基础', ch: ['修编要点', '附录 G/J 判据'], done: 2, k: 'sanshen' },
  { id: 'c5', n: '倒闸操作典型异常处置案例', h: 3, tag: '异常处置', lvl: '进阶', ch: ['位置指示不一致', '五防锁具异常', '保护动作与直流接地'], done: 0, k: 'yichang' },
  { id: 'c6', n: '电气操作票填写与三审要求', h: 2, tag: '记录规范', lvl: '基础', ch: ['票面填写', '三审与票令核对'], done: 0, k: 'sanshen' },
  { id: 'c7', n: '先验电再接地：GIS 间接验电方法', h: 2, tag: '验电接地', lvl: '进阶', ch: ['两种非同源指示', '高压带电显示装置判读'], done: 0, k: 'yandian' },
  { id: 'c8', n: '二次隔离与标志牌悬挂', h: 2, tag: '二次隔离', lvl: '基础', ch: ['压板与空气开关', '标志牌位置与记录'], done: 0, k: 'erci' },
  { id: 'c9', n: '唱票复诵与手指口述规范', h: 1, tag: '唱票复诵', lvl: '基础', ch: ['五拍闭环', '常见口误'], done: 1, k: 'changpiao' },
  { id: 'c10', n: '设备四种状态与运行方式核对', h: 1, tag: '设备状态核对', lvl: '基础', ch: ['四种状态', '后台核对要点'], done: 0, k: 'state' },
  { id: 'c11', n: '走错间隔风险与现场核对', h: 1, tag: '风险辨识', lvl: '基础', ch: ['图实一致与标实一致', '站位与手势'], done: 0, k: 'state' },
  { id: 'c12', n: '安规（变电部分）年度复训', h: 4, tag: '规程记忆', lvl: '基础', ch: ['总则', '倒闸操作', '验电接地', '二次工作'], done: 4, k: 'sanshen' },
]
export const COURSES = COURSE_LIB.slice(0, 4).map(c => ({ n: c.n, h: c.h, tag: c.tag }))
export const QUIZ = [
  { id: 'q1', k: 'gis', dim: '设备状态核对', q: 'GIS 组合电器刀闸操作后，应依次核对哪几项位置指示？', opts: ['监控后台位置与报文 → 汇控柜电气指示 → 机构箱机械指示 → 拐臂指示与转轴划线标识', '只核对监控后台位置显示', '监控后台 + 汇控柜电气指示两项', '机构箱机械指示 + 拐臂指示两项'], a: 0, why: '四项指示缺一不可，只看后台是本班组红线触发最多的一类。', cite: '附录G-5' },
  { id: 'q2', k: 'yandian', dim: '规程记忆', q: '不能直接验电的 GIS 设备，怎样才能确认已无电压？', opts: ['两个及以上非同样原理或非同源的指示均已同时发生变化', '监控后台一次遥测显示为零即可', '向调度电话询问确认', '在柜体外用验电笔试验'], a: 0, why: '后台二次电压核对与高压带电显示装置属于两种不同原理，须两项交叉一致。', cite: '附录G-23' },
  { id: 'q3', k: 'sanshen', dim: '调度术语', q: '接到调度正式指令后，操作前应当？', opts: ['再次"三审"，核实操作票内容与调度指令一致', '立即按票执行', '先向值班负责人汇报再执行', '等待调度第二次下令'], a: 0, why: '票令不一致是接令环节的典型陷阱，复诵后仍继续执行按严重扣分处理。', cite: '细则第十八条' },
  { id: 'q4', k: 'changpiao', dim: '唱票复诵', q: '操作票中的设备名称应如何填写与复诵？', opts: ['设备双重称号，并注明电压等级', '只念设备编号', '只念设备名称', '按现场习惯叫法'], a: 0, why: '复诵缺双重名称是本班组最常见的不规范项。', cite: '附录F 2.10' },
  { id: 'q5', k: 'changpiao', dim: '唱票复诵', q: '每一项操作的正确节拍顺序是？', opts: ['监护人唱票 → 操作人手指口述并复诵 → 监护人"对，执行" → 执行 → 检查回报 → 标"√"', '操作 → 复诵 → 标"√"', '唱票 → 执行 → 复诵', '复诵 → 唱票 → 执行'], a: 0, why: '未等监护人"对，执行"即操作，按严重扣分处理。', cite: '风险4' },
  { id: 'q6', k: 'yichang', dim: '异常处置', q: '现场机构箱机械指示与监控后台位置不一致，应当？', opts: ['立即中止操作并上报，不得盲目重试', '按后台位置回报到位', '再操作一次看指示是否恢复', '继续下一项，事后汇报'], a: 0, why: '"凡变化必上报"：位置指示不一致继续操作触发一票否决。', cite: '细则第十四条（一）' },
  { id: 'q7', k: 'state', dim: '风险辨识', q: '到达每一个操作地点后，首先应当？', opts: ['核对间隔名称与待操作设备双重名称，确认图实一致、标实一致', '直接开始操作', '检查安全帽下颌带', '拨打调度电话汇报到位'], a: 0, why: '走错间隔按严重扣分处理，核对双重名称是唯一有效防线。', cite: '风险7' },
  { id: 'q8', k: 'changpiao', dim: '唱票复诵', q: '"手指口述"的要求是？', opts: ['口到、眼到、手到，三者落在同一个操作对象上', '只需口述票面内容', '只需手指设备', '由监护人代替操作人完成'], a: 0, why: '只复诵未手指、手指对象与票面不符，都记不规范。', cite: '附录E' },
  { id: 'q9', k: 'diaodu', dim: '调度术语', q: '接受调度指令时，记录应包含哪些内容？', opts: ['发令单位、发令人、受令人、受令时间与指令内容', '只记指令内容', '只记受令时间', '不需要记录，录音即可'], a: 0, why: '发令单位或发令人漏填按不规范处理，事后无法追溯。', cite: '附录F 2.4／2.5／2.7' },
  { id: 'q10', k: 'wufang', dim: '操作顺序', q: '五防模拟时点击顺序与操作票不一致，系统会？', opts: ['被防误逻辑拒绝，须按票面顺序重新模拟', '允许继续并记录', '自动纠正为正确顺序', '跳过该步'], a: 0, why: '模拟预演的意义就在于把顺序错误拦在实际操作之前。', cite: '风险2' },
  { id: 'q11', k: 'yandian', dim: '验电接地', q: '合上接地刀闸之前必须完成什么？', opts: ['两种非同源验电，确认设备已无电压', '向调度汇报', '悬挂标示牌', '把手切至远控'], a: 0, why: '未验电即合接地刀闸是一票否决红线。', cite: '细则第十三条（四）' },
  { id: 'q12', k: 'changpiao', dim: '记录规范', q: '操作票"操作√"栏应在什么时候标注？', opts: ['每项操作完成后由监护人立即标注，不得补打勾或提前打勾', '全部操作完成后统一标注', '操作前预先标注', '由操作人在复诵时标注'], a: 0, why: '补打勾或提前打勾会让票面失去真实过程留痕。', cite: '附录F 2.13' },
  { id: 'q13', k: 'yichang', dim: '异常处置', q: '当前不存在异常触发条件时点击"中止操作并上报"，属于？', opts: ['无依据中止，打断作业连续性，记不规范', '正确的谨慎行为，加分', '不影响评价', '触发一票否决'], a: 0, why: '中止判断本身也是被评价的能力项，中止应有明确依据。', cite: '细则第十四条' },
  { id: 'q14', k: 'erci', dim: '二次隔离', q: '在保护屏、测控屏进行二次操作前后应当？', opts: ['操作前核对屏柜名称防走错屏，操作后核对指示', '直接拉开空气开关', '不需要核对', '由检修人员代为操作'], a: 0, why: '二次隔离错误会造成保护误动或拒动。', cite: '附录J' },
]
export const LMAP_MASTERY: Record<string, number> = { state: 92, sanshen: 88, wufang: 85, changpiao: 90, yandian: 74, gis: 58, erci: 80, yichang: 70, diaodu: 76 }
export const LMAP_PLAN: Record<string, string> = { gis: 'sp_gis', yandian: 'sp_vd', diaodu: 'sp_ord', sanshen: 'sp_ord', changpiao: 'p1', yichang: 'full', erci: 'p3', wufang: 'full', state: 'p1' }

/* ============ 能力徽章 ============ */
export type Badge = { id: string; n: string; d: string; test: (L: Session[]) => boolean; plan?: string }
export const BADGES: Badge[] = [
  { id: 'b1', n: '首场满 90', d: '任一场次得分 ≥ 90', test: L => L.some(s => s.score >= 90) },
  { id: 'b2', n: '零红线 · 连续 5 场', d: '最近 5 场未触发红线', test: L => L.slice(0, 5).length >= 5 && L.slice(0, 5).every(s => !s.vio.some(v => v.lv === 'red')) },
  { id: 'b3', n: '完整票通关', d: '完整操作票得分 ≥ 85', test: L => L.some(s => s.plan.startsWith('完整') && s.score >= 85) },
  { id: 'b4', n: '考核达标', d: '考核模式得分 ≥ 90', test: L => L.some(s => s.mode === '考核模式' && s.score >= 90) },
  { id: 'b5', n: '月练 12 场', d: '近 30 天场次 ≥ 12', test: L => L.length >= 12 },
  { id: 'b6', n: '错题清零', d: '错题重练得分 ≥ 90', test: L => L.some(s => s.plan.startsWith('错题') && s.score >= 90) },
  { id: 'b7', n: '不用提示 · 3 场', d: '3 场未使用任何提示', test: L => L.filter(s => !(s.hints || []).length).length >= 3 },
  { id: 'b8', n: '唱票复诵 90+', d: '唱票复诵维度 ≥ 90', test: () => RADAR_NOW[1] >= 90 },
  { id: 'b9', n: 'GIS 四项核对达标', d: '设备状态核对维度 ≥ 80', test: () => RADAR_NOW[2] >= 80, plan: 'sp_gis' },
  { id: 'b10', n: '异常识别', d: '陪练中发现异常并正确中止上报', test: L => L.some(s => (s.praise || []).some(p => /异常|中止/.test(p.title))), plan: 'full' },
  { id: 'b11', n: '学时达标', d: '年度学时 ≥ 90', test: () => HOME_USER.hours.done >= 90 },
  { id: 'b12', n: '票令核对', d: '专项 · 接令与票令核对 ≥ 90', test: L => L.some(s => /接令/.test(s.plan) && s.score >= 90) },
]

/* ============ 教练编辑器 ============ */
export const SAMPLE_TICKET = `1. 接调度令：将110kV仿真站110kV培训二线1162线路由检修转冷备用
2. 检查培训二线1162间隔工作票已全部终结，标示牌已收回
3. 拉开培训二线线路侧116240地刀
4. 检查培训二线线路侧116240地刀在分闸位置
5. 汇报调度：培训二线1162线路已由检修转冷备用
6. 接调度令：将110kV培训二线1162线路由冷备用转热备用
7. 合上培训二线2M侧11622刀闸
8. 检查培训二线2M侧11622刀闸在合闸位置
9. 合上培训二线线路侧11624刀闸
10. 检查培训二线线路侧11624刀闸在合闸位置
11. 汇报调度：培训二线1162线路已由冷备用转热备用
12. 接调度令：将110kV培训二线1162线路由热备用转运行
13. 合上培训二线1162开关
14. 检查培训二线1162开关在合闸位置，三相电流正常
15. 汇报调度：培训二线1162线路已由热备用转运行`
export const RED_NAMES = ['未验电即合接地刀闸', '发现异常未中止', '跳项操作', '走错间隔', 'GIS 只看后台未核对就地', '票令不一致未识别']
export const KB_FILES: [string, string][] = [
  ['110kV培训三线1163线路由运行转检修操作细则及流程图', '已解析 · 27 项 / 5 页流程图'],
  ['模拟操作脚本 V7', '已解析 · 117 条台词'],
  ['操作票试卷 2（含答案）', '已解析 · 27 项 + 三段调度令'],
  ['广西电网公司 变电现场电气操作票管理细则（脱敏版）', '已解析 · 附录 G/J 判据 38 条'],
]
export const ED_TPL: Record<string, { n: string; w: number[]; reds: number[]; hint: number[] }> = {
  exam: { n: '考核', w: [20, 20, 20, 15, 15, 10], reds: [1, 1, 1, 1, 1, 1], hint: [2, 4, 8] },
  teach: { n: '教学', w: [15, 25, 20, 10, 15, 15], reds: [1, 1, 0, 1, 1, 0], hint: [0, 1, 2] },
  special: { n: '专项 · 设备核对', w: [10, 15, 35, 10, 10, 20], reds: [1, 1, 1, 1, 1, 1], hint: [1, 2, 4] },
}
export const ED_SAMPLE_VIO: [number, number, string][] = [[2, 12, 'GIS 位置确认不充分'], [1, 5, '复诵不完整'], [4, 5, '接令记录不完整']]

/* ============ 培训科视角：全公司陪练运行看板（28 个一级单位口径） ============ */
export type UnitRow = { unit: string; grp: string; people: number; cover: number; sess: number; avg: number; red: number; coaches: number; weak: string }
export const COMPANY_BOARD: UnitRow[] = [
  { unit: '南宁供电局', grp: '地市供电局', people: 6120, cover: 91, sess: 4820, avg: 84, red: 21, coaches: 9, weak: '设备状态核对' },
  { unit: '柳州供电局', grp: '地市供电局', people: 4680, cover: 88, sess: 3410, avg: 82, red: 18, coaches: 8, weak: '异常处置' },
  { unit: '桂林供电局', grp: '地市供电局', people: 4210, cover: 83, sess: 2960, avg: 80, red: 16, coaches: 7, weak: '票令核对' },
  { unit: '梧州供电局', grp: '地市供电局', people: 2860, cover: 86, sess: 2010, avg: 83, red: 9, coaches: 7, weak: '标志牌悬挂' },
  { unit: '北海供电局', grp: '地市供电局', people: 2140, cover: 90, sess: 1690, avg: 85, red: 6, coaches: 6, weak: '调度术语' },
  { unit: '防城港供电局', grp: '地市供电局', people: 1580, cover: 79, sess: 980, avg: 78, red: 8, coaches: 5, weak: '五防模拟' },
  { unit: '钦州供电局', grp: '地市供电局', people: 2260, cover: 81, sess: 1420, avg: 79, red: 10, coaches: 6, weak: '设备状态核对' },
  { unit: '贵港供电局', grp: '地市供电局', people: 2380, cover: 84, sess: 1580, avg: 81, red: 9, coaches: 6, weak: '带电作业站位' },
  { unit: '玉林供电局', grp: '地市供电局', people: 3120, cover: 87, sess: 2340, avg: 82, red: 11, coaches: 7, weak: '带电作业站位' },
  { unit: '百色供电局', grp: '地市供电局', people: 2640, cover: 74, sess: 1310, avg: 76, red: 14, coaches: 5, weak: '五防模拟' },
  { unit: '贺州供电局', grp: '地市供电局', people: 1720, cover: 80, sess: 1040, avg: 79, red: 7, coaches: 5, weak: '间接验电组合' },
  { unit: '河池供电局', grp: '地市供电局', people: 2310, cover: 72, sess: 1120, avg: 75, red: 13, coaches: 5, weak: '异常处置' },
  { unit: '来宾供电局', grp: '地市供电局', people: 1860, cover: 82, sess: 1160, avg: 80, red: 8, coaches: 5, weak: '票令核对' },
  { unit: '崇左供电局', grp: '地市供电局', people: 1690, cover: 77, sess: 940, avg: 78, red: 9, coaches: 5, weak: '间接验电组合' },
  { unit: '广西新电力投资集团（40 家县企）', grp: '县域新电力', people: 5240, cover: 63, sess: 2280, avg: 74, red: 17, coaches: 4, weak: '综合受理口径' },
  { unit: '电力调度控制中心（省调）', grp: '直属机构', people: 320, cover: 94, sess: 610, avg: 88, red: 2, coaches: 4, weak: '复诵一致性' },
  { unit: '广西电力交易中心', grp: '直属机构', people: 140, cover: 71, sess: 120, avg: 83, red: 0, coaches: 2, weak: '规则解释' },
  { unit: '计量中心', grp: '直属机构', people: 380, cover: 82, sess: 420, avg: 84, red: 1, coaches: 3, weak: '采集异常定位' },
  { unit: '客户服务中心（95598）', grp: '直属机构', people: 560, cover: 89, sess: 1180, avg: 86, red: 0, coaches: 3, weak: '意图识别' },
  { unit: '广西电科院', grp: '直属机构', people: 410, cover: 68, sess: 260, avg: 85, red: 1, coaches: 2, weak: '试验交底' },
  { unit: '培训评价中心', grp: '直属机构', people: 120, cover: 96, sess: 310, avg: 90, red: 0, coaches: 3, weak: '评分尺度' },
  { unit: '市场营销部', grp: '本部职能部门', people: 96, cover: 78, sess: 210, avg: 85, red: 0, coaches: 3, weak: '线损解释' },
  { unit: '生产技术部', grp: '本部职能部门', people: 88, cover: 74, sess: 160, avg: 84, red: 1, coaches: 3, weak: '巡视判读' },
  { unit: '人力资源部', grp: '本部职能部门', people: 62, cover: 85, sess: 190, avg: 87, red: 0, coaches: 2, weak: '政策口径' },
  { unit: '安全监管部', grp: '本部职能部门', people: 54, cover: 88, sess: 230, avg: 88, red: 0, coaches: 3, weak: '应急顺序' },
  { unit: '财务部 / 物资部 / 法律 / 审计 / 办公室 等', grp: '本部职能部门', people: 410, cover: 52, sess: 380, avg: 82, red: 0, coaches: 6, weak: '制度记忆' },
  { unit: '广西电动汽车服务公司', grp: '产业公司', people: 260, cover: 61, sess: 180, avg: 81, red: 0, coaches: 1, weak: '客户应答' },
  { unit: '能源科技公司 / 送变电公司', grp: '产业公司', people: 1480, cover: 58, sess: 640, avg: 79, red: 5, coaches: 3, weak: '作业交底' },
]

/* ============ 本机存储键 ============ */
export const LS = {
  sessions: 'zpyt_sessions', tasks: 'zpyt_tasks', coaches: 'zpyt_custom_coaches', goals: 'zpyt_goals', hours: 'zpyt_hours',
  course: 'zpyt_course_prog', quiz: 'zpyt_quiz', plan: 'zpyt_plan', acts: 'zpyt_actions', apply: 'zpyt_coach_apply', lastvio: 'zpyt_lastvio',
}
export function lsGet<T>(k: string, d: T): T { try { return (JSON.parse(localStorage.getItem(k) || 'null') as T) || d } catch { return d } }
export function lsSet(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* 无痕模式下忽略 */ } }

export const KNOW_IDS = KNOW.map(k => k.id)
