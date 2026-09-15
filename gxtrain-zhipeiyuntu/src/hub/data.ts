/* 知识资产中枢数据层：条目、专家、规程版本、入库批次、质量与权限、检索意图
   组织维度来自 units.ts（28 个一级单位），专业维度沿用 data.ts 的四维标签树 */
import { UNITS } from '../units'
import type { UnitDef, UnitGroup } from '../units'
import { ASSET_TREE, ASSET_KINDS } from '../data'
import { COACHES } from '../coach/data'

export type AssetKind = '规程条款' | '作业步骤' | '典型案例' | '岗位诀窍' | '题目'
export type RefKind = '课件' | '题目' | '陪练剧本' | '助手条目'
export type Sens = '公开' | '内部' | '敏感'
export type AssetStatus = '已发布' | '待审核' | '待复核' | '已下线'
export type RefItem = { id: string; name: string; where: string; when: string }
export type Asset = {
  id: string; kind: AssetKind; title: string
  unit: string; grp: UnitGroup | '公司通用'; dept: string; post: string; pro: string; topic: string
  src: string; anchor: string; summary: string; body: string[]; tags: string[]
  use: number; ver: string; updated: string; expires: string; sens: Sens; owner: string; status: AssetStatus
  rel: string[]; refs: { kind: RefKind; items: RefItem[] }[]
  history: { ver: string; date: string; by: string; note: string }[]
  quality: { score: number; issues: string[] }
  core?: boolean
}

export const KINDS: AssetKind[] = ['规程条款', '作业步骤', '典型案例', '岗位诀窍', '题目']
export const KIND_CODE: Record<AssetKind, string> = { 规程条款: 'GC', 作业步骤: 'BZ', 典型案例: 'AL', 岗位诀窍: 'KZ', 题目: 'TM' }
export const KIND_COLOR: Record<AssetKind, string> = { 规程条款: '#1e3a6e', 作业步骤: '#2b4e92', 典型案例: '#6a86b8', 岗位诀窍: '#a8823a', 题目: '#d4af63' }
export const REF_KINDS: RefKind[] = ['课件', '题目', '陪练剧本', '助手条目']
export const SENS_ORDER: Sens[] = ['公开', '内部', '敏感']

const hash = (s: string) => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h }
const pick = <T,>(arr: T[], seed: number) => arr[seed % arr.length]
const pad = (n: number, w = 4) => String(n).padStart(w, '0')
const dateBack = (days: number) => { const d = new Date(2026, 8, 14); d.setDate(d.getDate() - days); return `${d.getFullYear()}-${pad(d.getMonth() + 1, 2)}-${pad(d.getDate(), 2)}` }
const dateFwd = (days: number) => dateBack(-days)

/* 各单位的制度与规程来源（用于生成条款类资产的出处） */
const DOC_OF: Record<string, string[]> = {
  人力资源部: ['广西电网公司培训管理办法', '员工绩效管理办法', '干部选拔任用工作细则', '劳动用工管理规定'],
  党建工作部: ['党支部标准化规范化建设指引', '党员教育管理工作条例'],
  '党建工作部（宣传）': ['新闻宣传管理办法', '融媒体内容审核细则'],
  办公室: ['南方电网公司公文处理办法', '督办工作实施细则', '会议管理办法', '印章管理规定'],
  基建部: ['基建工程安全文明施工管理规定', '工程造价管理办法', '工程档案管理细则'],
  安全监管部: ['电力安全工作规程', '安全生产隐患排查治理办法', '两票管理规定', '应急预案管理办法'],
  审计部: ['内部审计工作规定', '工程结算审计操作指引'],
  工会: ['职工帮扶工作办法', '职工代表大会实施细则'],
  市场营销部: ['供电营业规则', '业扩报装管理办法', '电费抄核收管理规定', '用电检查管理办法'],
  战略规划部: ['电网规划管理办法', '新能源接入评估指引'],
  '数字化部（信息中心）': ['数据管理办法', '网络与信息安全管理规定', '智能体开发与运营规范'],
  '法律事务部（合规）': ['合同管理办法', '合规管理办法', '法律纠纷案件管理规定'],
  '物资部（供应链管理）': ['南方电网公司物资采购管理规定', '供应商管理办法', '仓储配送管理细则'],
  生产技术部: ['变电现场电气操作票管理细则', '输电线路运行规程', '配电网运维管理规定', '设备状态评价导则'],
  科技部: ['科技项目管理办法', '知识产权管理规定'],
  纪检监察组: ['纪检监察工作规则', '廉洁风险防控管理办法'],
  财务部: ['南方电网公司财务管理制度', '预算管理办法', '税务管理规定', '资金管理办法'],
  培训评价中心: ['技能等级认定实施细则', '题库建设与考试管理规范'],
  '客户服务中心（95598）': ['95598 客户服务业务规范', '投诉处理管理办法'],
  广西电力交易中心: ['广西电力市场交易规则', '绿电绿证交易实施细则'],
  广西电科院: ['电力设备入网检测规范', '电能质量监测技术导则'],
  '电力调度控制中心（省调）': ['广西电网调度规程', '新能源功率预测管理规定', '调度操作票管理细则'],
  计量中心: ['电能计量装置管理办法', '用电信息采集运行规范'],
  '地市供电局（14个）': ['变电现场电气操作票管理细则', '配电网运维管理规定', '供电营业规则', '电力安全工作规程'],
  '广西新电力投资集团（40家县企）': ['农村电网运维管理规定', '供电所标准化建设指引'],
  广西电动汽车服务公司: ['充电设施运营管理办法', '充电安全管理规定'],
  广西电网能源科技公司: ['综合能源项目管理办法', '合同能源管理实施细则'],
  广西送变电建设公司: ['输变电工程施工安全管理规定', '施工方案编制与交底细则'],
}
const docOf = (u: UnitDef, i: number) => pick(DOC_OF[u.name] ?? [`${u.name.replace(/（.*）/, '')}业务管理规定`], i)

/* 专业与领域：生产单位沿用专业条线，职能与直属单位按业务领域 */
const PRO_OF: Record<string, string> = {
  人力资源部: '人力资源', 党建工作部: '党建', '党建工作部（宣传）': '宣传', 办公室: '行政', 基建部: '基建', 安全监管部: '安监', 审计部: '审计', 工会: '工会',
  市场营销部: '营销', 战略规划部: '规划', '数字化部（信息中心）': '数字化', '法律事务部（合规）': '法律合规', '物资部（供应链管理）': '物资', 生产技术部: '生产',
  科技部: '科技', 纪检监察组: '纪检', 财务部: '财务', 培训评价中心: '培训评价', '客户服务中心（95598）': '客户服务', 广西电力交易中心: '电力交易', 广西电科院: '试验检测',
  '电力调度控制中心（省调）': '调度', 计量中心: '计量', '地市供电局（14个）': '配电', '广西新电力投资集团（40家县企）': '配电', 广西电动汽车服务公司: '充电运营', 广西电网能源科技公司: '综合能源', 广西送变电建设公司: '施工',
}
export const proOf = (u: UnitDef) => PRO_OF[u.name] ?? '综合'

const SURNAMES = ['韦', '黄', '覃', '梁', '陆', '农', '蓝', '莫', '潘', '唐', '卢', '罗', '周', '陈', '李', '苏']
const GIVEN = ['志明', '国强', '小燕', '建华', '海波', '振华', '雨桐', '泽宇', '晓萌', '子豪', '嘉琪', '俊杰', '淑仪', '浩然', '芷若', '文博', '思远', '敏', '峰', '雨']
const TITLES = ['高级技师', '技能专家', '技师', '高级专责', '资深专责', '首席专家']
const nameAt = (seed: number) => pick(SURNAMES, seed) + pick(GIVEN, seed >>> 3)

const TIP_TAILS = ['现场速查要点', '三步核对法', '常见错项与识别', '口径与边界', '快速判断顺序']
const STEP_N = [9, 12, 15, 18, 21, 27]

function refsFor(id: string, title: string, unit: string, use: number, topic: string): Asset['refs'] {
  const h = hash(id)
  const coachPool = COACHES.filter(c => c.unit === unit || c.unit.startsWith(unit.slice(0, 4)))
  const coach = coachPool.length ? pick(coachPool, h) : pick(COACHES, h)
  const n = { 课件: Math.max(1, Math.round(use * .06)), 题目: Math.max(2, Math.round(use * .22)), 陪练剧本: Math.max(1, Math.round(use * .008)), 助手条目: Math.max(2, Math.round(use * .7)) }
  const mk = (kind: RefKind, count: number): RefItem[] => Array.from({ length: Math.min(count, 12) }).map((_, i) => {
    const s = h + i * 97
    if (kind === '课件') return { id: `C-2026-${pad(300 + (s % 600))}`, name: `${topic}${pick(['必修课', '专题课', '岗位入门', '复训课'], s)}`, where: `第 ${1 + (s % 6)} 章 第 ${1 + (s % 4)} 节`, when: dateBack(s % 200) }
    if (kind === '题目') return { id: `TM-${pad(1000 + (s % 9000), 5)}`, name: `${title.slice(0, 14)}${pick(['判断题', '单选题', '多选题', '情景题'], s)}`, where: pick(['岗位认证题库', '安规复训题库', '班组周考', '新员工题库'], s), when: dateBack(s % 300) }
    if (kind === '陪练剧本') return { id: coach.id, name: coach.n, where: `${pick(['第 3 步 知识点卡', '异常处置支线', '五防模拟校核', '票令核对陷阱', '示范讲解'], s)}`, when: dateBack(s % 120) }
    return { id: `Q-${pad(s % 8000)}`, name: `问：${title.slice(0, 16)}${pick(['怎么做？', '有哪些要求？', '什么情况下适用？', '注意什么？'], s)}`, where: pick(['一线员工视图', '班组长视图', '培训专责视图', '职能部门视图'], s), when: dateBack(s % 40) }
  })
  return REF_KINDS.map(k => ({ kind: k, items: mk(k, n[k]) }))
}
function historyFor(id: string, ver: string, updated: string, owner: string) {
  const h = hash(id)
  const v = parseInt(ver.slice(1)) || 1
  const rows = [{ ver: `v${v}`, date: updated, by: owner, note: pick(['按 2026 修订版条款复核并更新表述', '补充现场实拍与判断顺序', '合并两条重复条目', '按专家确认稿调整要点', '增加适用岗位与标签'], h) }]
  if (v > 1) rows.push({ ver: `v${v - 1}`, date: dateBack(120 + (h % 200)), by: nameAt(h >>> 2), note: pick(['首次审核通过并发布', '由访谈转写稿整理入库', '由规程解析自动生成，人工校对', '课程反馈触发的表述修正'], h >>> 1) })
  if (v > 2) rows.push({ ver: `v${v - 2}`, date: dateBack(400 + (h % 200)), by: '入库流水线', note: '自动抽取草稿' })
  return rows
}
function qualityFor(id: string, updated: string, use: number, anchor: string) {
  const h = hash(id)
  const issues: string[] = []
  const age = Math.round((new Date(2026, 8, 14).getTime() - new Date(updated).getTime()) / 864e5)
  if (age > 330) issues.push('超过 12 个月未复核')
  if (use < 6) issues.push('近 90 天零引用')
  if (anchor === '—' && h % 3 === 0) issues.push('缺少规程锚点')
  if (h % 23 === 0) issues.push('与同主题条目表述存在差异')
  const score = Math.max(58, Math.min(98, 96 - issues.length * 11 - (h % 5)))
  return { score, issues }
}

/* ============ 手工条目：全公司通用与各类单位的代表性资产 ============ */
type CoreIn = Omit<Asset, 'refs' | 'history' | 'quality' | 'core'>
const CORE_IN: CoreIn[] = [
  { id: 'KZ-2411', kind: '岗位诀窍', title: 'GIS 刀闸位置的四项指示核对法', unit: '地市供电局（14个）', grp: '地市供电局', dept: '变电管理所', post: '变电值班员', pro: '变电', topic: '倒闸操作',
    src: '陆志明 · 高级技师 · 南宁供电局', anchor: '附录G-5', summary: '设备本体封闭看不见触头，仅凭后台遥信可能误判，四项指示须全部核到。',
    body: ['GIS 刀闸操作后须核对四项位置指示：监控后台的刀闸位置显示及报文、汇控柜刀闸电气指示、刀闸机构箱机械指示、刀闸拐臂指示与转轴划线标识。', '四项中任何一项不一致，立即中止操作，按变化管理要求向调度汇报，等待处理意见后再继续。', '现场经验：机构箱机械指示最容易被忽略，尤其是夜间操作时，建议手电照射拐臂划线后再唱票确认。'],
    tags: ['GIS', '位置核对', '倒闸操作', '变化管理'], use: 342, ver: 'v3', updated: '2026-08-30', expires: '2027-08-30', sens: '内部', owner: '陆志明', status: '已发布', rel: ['GC-1244', 'BZ-1180', 'AL-0442'] },
  { id: 'GC-0871', kind: '规程条款', title: '接到调度正式指令后应再次核实操作票内容', unit: '公司通用', grp: '公司通用', dept: '生产技术部', post: '变电值班员', pro: '变电', topic: '倒闸操作',
    src: '变电现场电气操作票管理细则 第十八条', anchor: '细则十八条', summary: '防止按上一项指令或错误票面继续操作，接令后复核票面与指令一致。',
    body: ['操作人员接到调度正式操作指令后，应再次核实操作票内容与指令一致，包括操作任务、设备双重名称、操作顺序与安全措施。', '票令不一致时不得操作，应立即向发令人询问清楚，必要时重新拟票。', '2026 修订版将"再次核实"的范围由任务与设备名称扩展到操作顺序与安全措施。'],
    tags: ['票令核对', '调度指令', '操作票'], use: 918, ver: 'v2', updated: '2026-09-08', expires: '2028-09-08', sens: '公开', owner: '生产技术部', status: '已发布', rel: ['KZ-2411', 'BZ-1180', 'TM-3320'] },
  { id: 'KZ-2903', kind: '岗位诀窍', title: '主变异响的三种典型音色与初判方向', unit: '地市供电局（14个）', grp: '地市供电局', dept: '变电管理所', post: '变电运维员', pro: '变电', topic: '设备巡视',
    src: '韦国强 · 技能专家 · 柳州供电局', anchor: '—', summary: '嗡鸣、爆裂、周期性咔哒，对应不同缺陷方向。',
    body: ['均匀嗡鸣加重，多为过负荷或铁芯多点接地，先看负荷曲线与铁芯接地电流。', '不规则爆裂声，多为内部放电，立即红外测温并加强油色谱跟踪，必要时申请停运。', '周期性咔哒声，多为有载分接开关或冷却器机械部件松动，结合分接开关动作记录判断。'],
    tags: ['主变', '异响', '缺陷初判'], use: 187, ver: 'v2', updated: '2026-06-12', expires: '2027-06-12', sens: '内部', owner: '韦国强', status: '已发布', rel: ['KZ-2411'] },
  { id: 'AL-0442', kind: '典型案例', title: '某局 110kV 线路未验电即合地刀事件', unit: '公司通用', grp: '公司通用', dept: '安全监管部', post: '全体', pro: '变电', topic: '异常与事故处理',
    src: '公司事故通报 2025-17 号', anchor: '细则十三条(四)', summary: '两种非同源指示均未确认即接地，触碰红线。',
    body: ['事件经过：线路由运行转检修操作中，操作人未按票面进行间接验电，直接合上线路地刀。', '直接原因：监护人未履行监护职责，唱票复诵流于形式；后台电压显示与带电显示装置均未核对。', '整改要求：间接验电两项指示全部纳入陪练一票否决项，全公司变电运行人员完成复训并考试。'],
    tags: ['红线', '验电', '接地', '事故通报'], use: 1204, ver: 'v1', updated: '2025-12-01', expires: '2027-12-01', sens: '内部', owner: '安全监管部', status: '已发布', rel: ['GC-1244', 'KZ-2411'] },
  { id: 'BZ-1180', kind: '作业步骤', title: '线路由运行转检修（GIS 站）标准步骤', unit: '公司通用', grp: '公司通用', dept: '生产技术部', post: '变电值班员', pro: '变电', topic: '倒闸操作',
    src: '作业指导书 BD-GIS-03', anchor: '附录F 2.11.3', summary: '27 项主子项，含两次间接验电。',
    body: ['接令与核对：接受调度预令、拟票、审核、接正式令后再次核实。', '操作前准备：核对设备双重名称、检查五防钥匙与操作工具、着装检查。', '执行：断开断路器、核对位置、拉开线路侧刀闸、间接验电（两项非同源指示）、合线路地刀、再次核对四项位置指示。', '检查回报：全部操作完毕后检查无漏项，向调度回令。'],
    tags: ['操作票', 'GIS', '运行转检修', '间接验电'], use: 662, ver: 'v3', updated: '2026-09-02', expires: '2027-09-02', sens: '内部', owner: '生产技术部', status: '已发布', rel: ['GC-0871', 'GC-1244', 'KZ-2411'] },
  { id: 'KZ-3118', kind: '岗位诀窍', title: '低压台区反送电判断的现场速查顺序', unit: '地市供电局（14个）', grp: '地市供电局', dept: '供电所', post: '台区经理', pro: '配电', topic: '分布式接入',
    src: '黄建华 · 技师 · 玉林供电局', anchor: '—', summary: '分布式并网后新增的高频判断场景。',
    body: ['先查台区是否接有分布式光伏，再查并网点开关状态与防孤岛保护动作记录。', '低压侧验电前先断开并网开关，验电应逐相进行，任一相有电即视为反送电。', '现场速查顺序：并网清单 → 并网开关 → 防孤岛记录 → 逐相验电 → 挂接地线。'],
    tags: ['反送电', '分布式光伏', '台区', '验电'], use: 254, ver: 'v2', updated: '2026-07-20', expires: '2027-07-20', sens: '内部', owner: '黄建华', status: '已发布', rel: ['GC-1244'] },
  { id: 'KZ-2755', kind: '岗位诀窍', title: '装表接电现场三种接线错误的快速识别', unit: '地市供电局（14个）', grp: '地市供电局', dept: '营销部', post: '装表接电员', pro: '营销', topic: '装表接电',
    src: '梁小燕 · 高级技师 · 桂林供电局', anchor: '—', summary: '相序、互感器极性、零线串接。',
    body: ['相序错误：用相序表核对，表计显示逆相序报警即为相序接反。', '互感器极性接反：功率因数异常或电能表反向计量，检查 P1/P2 与 S1/S2 对应关系。', '零线串接：电压不平衡且中性点电压偏高，逐一断开负荷排查。'],
    tags: ['装表接电', '接线错误', '互感器'], use: 431, ver: 'v2', updated: '2026-05-06', expires: '2027-05-06', sens: '内部', owner: '梁小燕', status: '已发布', rel: [] },
  { id: 'GC-1244', kind: '规程条款', title: '不能直接验电时应有两个及以上非同源指示', unit: '公司通用', grp: '公司通用', dept: '安全监管部', post: '变电值班员', pro: '变电', topic: '倒闸操作',
    src: '变电现场电气操作票管理细则 附录G-23', anchor: '附录G-23', summary: '两种指示均须发生应有变化，才能确认该设备已无电。',
    body: ['不能直接验电的设备，应有两个及以上非同样原理或非同源的指示，且均已同时发生对应变化，才能确认该设备已无电。', '本站采用监控后台线路二次电压与现场高压带电显示装置两种指示。', '操作前应先确认带电显示装置确有电压，停电后才有变化依据。'],
    tags: ['间接验电', '非同源指示', '红线'], use: 806, ver: 'v2', updated: '2026-09-08', expires: '2028-09-08', sens: '公开', owner: '安全监管部', status: '已发布', rel: ['AL-0442', 'BZ-1180', 'KZ-3118'] },
  { id: 'TM-3320', kind: '题目', title: '接令后核实操作票 · 情景判断题（6 道）', unit: '公司通用', grp: '公司通用', dept: '培训评价中心', post: '变电值班员', pro: '变电', topic: '倒闸操作',
    src: '培训评价中心 · 变电运行岗位认证题库', anchor: '细则十八条', summary: '围绕票令不一致的六种情景设计判断题。',
    body: ['情景一：调度指令中的操作顺序与票面不一致，操作人应如何处理？', '情景二：指令中的设备双重名称与票面一致、操作任务不同，能否按票操作？', '正确答案均指向"不得操作，向发令人询问清楚"，错误选项模拟现场常见的侥幸做法。'],
    tags: ['题目', '票令核对', '情景题'], use: 96, ver: 'v1', updated: '2026-09-10', expires: '2027-09-10', sens: '内部', owner: '培训评价中心', status: '待审核', rel: ['GC-0871'] },
  { id: 'GC-5102', kind: '规程条款', title: '培训费列支范围与报销附件要求', unit: '人力资源部', grp: '本部职能部门', dept: '培训开发', post: '培训专责', pro: '人力资源', topic: '培训管理',
    src: '广西电网公司培训费管理实施细则 第九条', anchor: '细则第九条', summary: '五类费用可列支，报销附件四件齐全。',
    body: ['培训费按职工教育经费列支，包括师资费、场地费、教材资料费、差旅费与住宿费。', '报销附件：经批准的培训计划或立项单、培训通知与签到表、发票与付款凭证、培训效果评估表。', '外聘讲师课酬按公司标准执行，超标准部分需分管领导审批。'],
    tags: ['培训费', '职教经费', '报销'], use: 388, ver: 'v2', updated: '2026-08-15', expires: '2027-08-15', sens: '公开', owner: '人力资源部', status: '已发布', rel: ['KZ-5106', 'BZ-5110'] },
  { id: 'KZ-5106', kind: '岗位诀窍', title: '培训经费执行进度的月度核对口径', unit: '财务部', grp: '本部职能部门', dept: '会计核算', post: '会计核算专责', pro: '财务', topic: '预算执行',
    src: '黄敏 · 会计核算专责 · 财务部', anchor: '预算管理办法 第二十条', summary: '按"已发生、已入账、已支付"三口径分别统计，避免执行率虚高。',
    body: ['月度核对时区分三口径：已发生（培训已举办）、已入账（凭证已过账）、已支付（款项已付出）。', '执行率对外口径以已入账为准，年末预测以已发生加在途为准。', '常见差错：培训已办但发票未到，被误计为未执行，导致四季度集中报销。'],
    tags: ['培训经费', '预算执行', '核对口径'], use: 142, ver: 'v1', updated: '2026-07-02', expires: '2027-07-02', sens: '内部', owner: '黄敏', status: '已发布', rel: ['GC-5102'] },
  { id: 'BZ-5110', kind: '作业步骤', title: '年度培训计划编制与下达流程', unit: '人力资源部', grp: '本部职能部门', dept: '培训开发', post: '培训专责', pro: '人力资源', topic: '培训管理',
    src: '广西电网公司培训管理办法 第三章', anchor: '办法第十二至十六条', summary: '需求汇总、计划编制、预算匹配、审批下达、执行跟踪五个环节。',
    body: ['需求汇总：由千人千面计划自动汇总个人计划，各单位在此基础上补充专项需求。', '计划编制：按主干项目、分部门专题课与岗位复训三类编排班次与预算。', '审批下达：经人力资源部审核、分管领导审批后下达各单位，并同步至开班日历。', '执行跟踪：按季度统计完成率与经费执行率，偏差超过 15% 的单位自动提醒。'],
    tags: ['培训计划', '流程', '预算'], use: 226, ver: 'v3', updated: '2026-09-01', expires: '2027-09-01', sens: '公开', owner: '人力资源部', status: '已发布', rel: ['GC-5102'] },
  { id: 'GC-5120', kind: '规程条款', title: '岗位能力矩阵与达标认定口径', unit: '人力资源部', grp: '本部职能部门', dept: '培训开发', post: '培训专责', pro: '人力资源', topic: '能力评价',
    src: '广西电网公司岗位能力矩阵管理规定 第八条', anchor: '规定第八条', summary: '能力项按岗位与等级设要求线，达标以最近一次证据为准。',
    body: ['每个岗位按专业线设 6 项核心能力项，各能力项在初级工至高级技师五个等级分别设要求线。', '达标判定：连续两次证据均达要求线，或最近一次高于要求线 5 分以上。', '证据权重：陪练得分 40%、考试 30%、课程完成 15%、带教评价 15%，证据自形成之日起 12 个月内有效，超期按 80% 折算。', '岗位能力达标率 = 全部能力项达标人数 ÷ 在册人数，按月随成长地图刷新。'],
    tags: ['能力矩阵', '达标率', '要求线'], use: 412, ver: 'v2', updated: '2026-08-28', expires: '2027-08-28', sens: '公开', owner: '人力资源部', status: '已发布', rel: ['GC-5121', 'BZ-5112'] },
  { id: 'GC-5121', kind: '规程条款', title: '技能等级认定的申报条件与有效证据', unit: '人力资源部', grp: '本部职能部门', dept: '培训开发', post: '培训专责', pro: '人力资源', topic: '能力评价',
    src: '广西电网公司技能人才评价管理办法 第十五条', anchor: '办法第十五条', summary: '申报需全部能力项达要求线，实操与理论分别计分。',
    body: ['申报下一等级需本等级全部能力项达到要求线，且从业年限满足办法附表要求。', '认定分理论与实操两部分，实操一次未通过的，间隔 30 天后可重考一次。', '陪练记录、竞赛名次与带教评价可作为实操加分证据，累计不超过 10 分。', '认定结果回写成长地图与个人发展计划，作为下一年度培训计划的输入。'],
    tags: ['技能等级', '认定', '申报条件'], use: 356, ver: 'v3', updated: '2026-07-19', expires: '2027-07-19', sens: '公开', owner: '人力资源部', status: '已发布', rel: ['GC-5120', 'BZ-5112'] },
  { id: 'BZ-5112', kind: '作业步骤', title: '必修课与年度培训学时的统计与回写', unit: '人力资源部', grp: '本部职能部门', dept: '培训开发', post: '培训专责', pro: '人力资源', topic: '培训管理',
    src: '广西电网公司培训管理办法 第五章', anchor: '办法第二十二至二十五条', summary: '学时按课程、陪练、集训三类分别计入，完成率按人统计。',
    body: ['课程学时以结业考核通过为准计入，未通过的不计学时；陪练按场次折算，每场 1 学时。', '必修课完成率 = 已完成必修课人数 ÷ 应修人数，按岗位分别统计。', '人均培训学时 = 全年计入学时合计 ÷ 在册人数，年度要求不低于 48 学时。', '学时由课程工厂、陪练引擎与考务系统每日回写，次月 5 日前完成上月对账。'],
    tags: ['学时', '必修课', '完成率'], use: 298, ver: 'v2', updated: '2026-09-03', expires: '2027-09-03', sens: '公开', owner: '人力资源部', status: '已发布', rel: ['BZ-5110', 'GC-5120'] },
  { id: 'GC-5122', kind: '规程条款', title: '特种作业证照复审的提前量与责任分工', unit: '安全监管部', grp: '本部职能部门', dept: '安全监督', post: '安全专责', pro: '安全', topic: '证照管理',
    src: '广西电网公司特种作业人员管理规定 第十一条', anchor: '规定第十一条', summary: '证照到期前 90 天启动复审，逾期即刻停止相应作业。',
    body: ['特种作业操作证有效期届满前 90 天，由所在单位安监部门汇总名单并报名复审班。', '到期前 30 天未完成复审的，列入重点提醒名单，同步推送至本人与班组长移动端。', '证照逾期人员即刻停止相应作业，恢复作业需提供复审合格证明。', '证照台账与培训计划联动，复审班次由千人千面计划自动排入当季。'],
    tags: ['证照', '复审', '特种作业'], use: 264, ver: 'v1', updated: '2026-06-11', expires: '2027-06-11', sens: '公开', owner: '安全监管部', status: '已发布', rel: ['GC-5120'] },
  { id: 'GC-5203', kind: '规程条款', title: '请示应当一文一事、只主送一个上级机关', unit: '办公室', grp: '本部职能部门', dept: '文秘', post: '文秘', pro: '行政', topic: '公文处理',
    src: '南方电网公司公文处理办法 第十七条', anchor: '办法第十七条', summary: '请示不得多头主送，需要其他机关知晓的用抄送。',
    body: ['请示应当一文一事，只主送一个上级机关，需要同时送其他机关的，用抄送形式。', '请示一般不抄送下级机关；报告中不得夹带请示事项。', '跨部门事项由办公室统一编号后，按主办部门与协办部门分别标注。'],
    tags: ['公文', '请示', '主送抄送'], use: 312, ver: 'v1', updated: '2026-03-18', expires: '2028-03-18', sens: '公开', owner: '办公室', status: '已发布', rel: ['AL-5108', 'BZ-5204'] },
  { id: 'AL-5108', kind: '典型案例', title: '会议纪要表述争议引发的督办返工', unit: '办公室', grp: '本部职能部门', dept: '文秘', post: '文秘', pro: '行政', topic: '公文处理',
    src: '办公室工作案例 2026-03', anchor: '办法第二十六条', summary: '议而未决事项被写成结论，导致责任部门理解不一致。',
    body: ['某次专题会上，关于分布式接入评估口径的讨论尚未形成结论，纪要写为"会议同意按 A 方案执行"。', '两个责任部门据此各自推进，两周后发现口径冲突，督办事项返工。', '改进：议而未决事项写"会议要求进一步研究"，纪要印发前须经与会部门负责人核签。'],
    tags: ['会议纪要', '督办', '案例'], use: 88, ver: 'v1', updated: '2026-04-02', expires: '2027-04-02', sens: '内部', owner: '办公室', status: '已发布', rel: ['GC-5203'] },
  { id: 'BZ-5204', kind: '作业步骤', title: '领导批示件登记、转办、催办与销号流程', unit: '办公室', grp: '本部职能部门', dept: '督查督办', post: '督办专责', pro: '行政', topic: '督办管理',
    src: '广西电网公司督办工作实施细则 第八条', anchor: '细则第八条', summary: '当日登记转办，到期自动提醒，办结核对后销号。',
    body: ['登记：批示件当日登记，明确主办部门与办结时限。', '转办：当日转办至主办部门负责人，涉及多部门的指定牵头部门。', '催办：每周汇总进度，到期未办结自动提醒主办部门负责人。', '销号：主办部门提交办理结果，办公室核对与批示要求一致后销号。'],
    tags: ['督办', '批示件', '闭环'], use: 174, ver: 'v2', updated: '2026-08-08', expires: '2027-08-08', sens: '内部', owner: '办公室', status: '已发布', rel: ['GC-5203'] },
  { id: 'GC-5401', kind: '规程条款', title: '紧急采购的适用情形与审批权限', unit: '物资部（供应链管理）', grp: '本部职能部门', dept: '采购管理', post: '采购管理专责', pro: '物资', topic: '采购管理',
    src: '南方电网公司物资采购管理规定 第三十二条', anchor: '规定第三十二条', summary: '限于抢修抢险、保供应急、上级临时任务三类情形。',
    body: ['紧急采购限于三类情形：抢修抢险、保供应急、上级临时任务。', '由需求部门提出并说明紧急理由，物资部审核后报分管领导审批；金额超过限额的报总经理办公会。', '紧急采购完成后 10 个工作日内补办备案，全年紧急采购金额占比列入部门考核。'],
    tags: ['紧急采购', '审批权限', '合规'], use: 206, ver: 'v2', updated: '2026-06-25', expires: '2028-06-25', sens: '内部', owner: '物资部', status: '已发布', rel: ['BZ-5408'] },
  { id: 'BZ-5408', kind: '作业步骤', title: '到货验收与规格不符异常处理流程', unit: '物资部（供应链管理）', grp: '本部职能部门', dept: '仓储配送', post: '仓储管理员', pro: '物资', topic: '仓储配送',
    src: '仓储配送管理细则 第四章', anchor: '规定第四十五条', summary: '当场留证、48 小时通知供应商、按合同换退货并纳入履约评价。',
    body: ['当场拍照留证并填写验收异常单，物资暂存待处理区。', '48 小时内通知供应商，供应商确认后按合同约定换货或退货。', '换货期间影响工程进度的按合同索赔条款执行；同一供应商年内两次以上规格不符触发履约评价扣分。'],
    tags: ['到货验收', '异常处理', '供应商'], use: 158, ver: 'v1', updated: '2026-05-30', expires: '2027-05-30', sens: '内部', owner: '物资部', status: '已发布', rel: ['GC-5401'] },
  { id: 'GC-5301', kind: '规程条款', title: '停电类投诉的受理时限与升级规则', unit: '客户服务中心（95598）', grp: '直属机构', dept: '话务班', post: '95598 坐席', pro: '客户服务', topic: '投诉处理',
    src: '95598 客户服务业务规范 6.3', anchor: '规范 6.3', summary: '30 分钟派单，城区 45 分钟、农村 90 分钟到达现场，超时自动升级。',
    body: ['停电类投诉受理后 30 分钟内派单到属地供电所，城区 45 分钟、农村 90 分钟内到达现场。', '超时未反馈的工单自动升级到地市局客服中心，两小时未办结升级到省公司。', '客户第二次来电同一事项，坐席须在系统标注"重复来电"并转班长跟进。'],
    tags: ['投诉', '停电', '升级规则', '时限'], use: 466, ver: 'v3', updated: '2026-08-20', expires: '2027-08-20', sens: '公开', owner: '客户服务中心', status: '已发布', rel: ['KZ-5320', 'AL-5312'] },
  { id: 'KZ-5320', kind: '岗位诀窍', title: '客户情绪激动时的"先接住再处理"话术', unit: '客户服务中心（95598）', grp: '直属机构', dept: '话务班', post: '95598 坐席', pro: '客户服务', topic: '投诉处理',
    src: '梁雨 · 高级坐席 · 客户服务中心', anchor: '规范 8.2', summary: '先致歉并复述问题，再说明动作与时间，不争辩责任归属。',
    body: ['先接住情绪：致歉并复述客户遇到的问题，让客户确认理解无误。', '再处理事项：说明已采取的动作与预计时间，不承诺无法兑现的时限。', '客户使用侮辱性语言时，提醒一次后可按规范转班长处理，通话记录完整保留。'],
    tags: ['话术', '情绪安抚', '投诉'], use: 298, ver: 'v2', updated: '2026-07-11', expires: '2027-07-11', sens: '内部', owner: '梁雨', status: '已发布', rel: ['GC-5301'] },
  { id: 'AL-5312', kind: '典型案例', title: '台风期间集中来电应对复盘', unit: '客户服务中心（95598）', grp: '直属机构', dept: '话务班', post: '95598 坐席', pro: '客户服务', topic: '投诉处理',
    src: '客户服务中心复盘报告 2026-07', anchor: '规范 附录 B', summary: '停电来电峰值 11 倍于日常，自助播报与分级排队降低升级率。',
    body: ['7 月台风登陆当日停电类来电达日常 11 倍，前两小时人工接通率降至 41%。', '启用停电区域自助播报后，重复来电减少 63%；按城区、农村分级排队后升级率回落到日常水平。', '复盘结论：预警发布后 30 分钟内启用自助播报模板，列入应急预案。'],
    tags: ['应急', '台风', '来电高峰', '复盘'], use: 122, ver: 'v1', updated: '2026-07-28', expires: '2027-07-28', sens: '内部', owner: '客户服务中心', status: '已发布', rel: ['GC-5301'] },
  { id: 'GC-5601', kind: '规程条款', title: '安全生产隐患排查治理的闭环要求', unit: '安全监管部', grp: '本部职能部门', dept: '安全监督', post: '安监专责', pro: '安监', topic: '隐患治理',
    src: '安全生产隐患排查治理办法 第十五条', anchor: '办法第十五条', summary: '隐患登记、评估定级、治理销号、复查验收四个环节缺一不可。',
    body: ['隐患发现后 24 小时内登记，按重大、较大、一般三级评估定级。', '重大隐患由公司挂牌督办，治理期间落实监控措施；治理完成后由安全监管部复查验收方可销号。', '同类隐患一年内在同一单位复发两次以上的，纳入安全绩效考核。'],
    tags: ['隐患', '闭环', '定级', '销号'], use: 354, ver: 'v2', updated: '2026-04-20', expires: '2028-04-20', sens: '公开', owner: '安全监管部', status: '已发布', rel: ['AL-0442'] },
  { id: 'GC-5701', kind: '规程条款', title: '合同签订前的法律审查范围与时限', unit: '法律事务部（合规）', grp: '本部职能部门', dept: '合同管理', post: '法律事务专责', pro: '法律合规', topic: '合同管理',
    src: '合同管理办法 第二十一条', anchor: '办法第二十一条', summary: '主体资格、权利义务、违约责任与争议解决四项必审，5 个工作日内反馈。',
    body: ['合同签订前须经法律审查，审查范围包括主体资格、权利义务对等性、违约责任与争议解决条款。', '法律事务部自收到完整材料起 5 个工作日内反馈审查意见，重大合同可延长至 10 个工作日。', '未经审查的合同不得用印。'],
    tags: ['合同', '法律审查', '用印'], use: 268, ver: 'v1', updated: '2026-02-10', expires: '2028-02-10', sens: '公开', owner: '法律事务部', status: '已发布', rel: [] },
  { id: 'KZ-5801', kind: '岗位诀窍', title: '主数据一致性核验的三张对照表', unit: '数字化部（信息中心）', grp: '本部职能部门', dept: '数据管理', post: '数据管理专责', pro: '数字化', topic: '数据治理',
    src: '覃海涛 · 数据管理专责 · 数字化部', anchor: '数据管理办法 第九条', summary: '设备、人员、组织三张主数据对照表每周比对，差异率超 0.5% 即启动治理。',
    body: ['设备主数据对照生产系统与资产系统，人员主数据对照人资系统与统一认证，组织主数据对照组织架构与财务成本中心。', '每周自动比对，差异率超过 0.5% 触发治理工单，指定数据责任人限期处理。', '常见差异来源：组织机构调整后成本中心未同步、设备退役后台账未更新。'],
    tags: ['主数据', '数据质量', '核验'], use: 134, ver: 'v1', updated: '2026-08-01', expires: '2027-08-01', sens: '内部', owner: '覃海涛', status: '已发布', rel: [] },
  { id: 'KZ-5901', kind: '岗位诀窍', title: '新能源功率预测偏差的三类来源与修正顺序', unit: '电力调度控制中心（省调）', grp: '直属机构', dept: '新能源调度', post: '新能源调度员', pro: '调度', topic: '功率预测',
    src: '莫振宇 · 首席专家 · 省调', anchor: '新能源功率预测管理规定 第七条', summary: '气象源偏差、装机容量更新滞后、限电指令未剔除，按此顺序排查。',
    body: ['先查气象源：数值天气预报更新时间与实际云量、风速的偏差。', '再查装机：新投产与检修容量是否及时更新到预测模型。', '最后剔除限电影响：受限时段的实发功率不能作为预测误差统计样本。'],
    tags: ['新能源', '功率预测', '偏差修正'], use: 176, ver: 'v2', updated: '2026-08-26', expires: '2027-08-26', sens: '内部', owner: '莫振宇', status: '已发布', rel: [] },
  { id: 'BZ-6001', kind: '作业步骤', title: '智能组卷与试卷质量校验流程', unit: '培训评价中心', grp: '直属机构', dept: '考试评价', post: '考评专责', pro: '培训评价', topic: '题库与考试',
    src: '题库建设与考试管理规范 第五章', anchor: '规范第五章', summary: '按能力项分布抽题、难度均衡校验、重复率与规程时效校验后成卷。',
    body: ['设定考核岗位与等级，按能力项权重从题库抽题。', '难度均衡校验：各难度层级占比偏差不超过 5%。', '时效校验：引用已修订规程条款的题目自动替换为新版题目。', '重复率校验：与近三次考试题目重复率低于 20%。'],
    tags: ['组卷', '题库', '考试'], use: 118, ver: 'v1', updated: '2026-09-05', expires: '2027-09-05', sens: '内部', owner: '培训评价中心', status: '已发布', rel: ['TM-3320'] },
]

/* ============ 由评估表场景批量生成的条目 ============ */
function genFromUnits(): CoreIn[] {
  const out: CoreIn[] = []
  UNITS.forEach(u => {
    u.scenes.forEach((s, i) => {
      const base = hash(u.id + s.name)
      const pro = proOf(u)
      const topic = s.dept
      const expert = nameAt(base)
      const title = pick(TITLES, base)
      const upd = dateBack(base % 420)
      const common = { unit: u.name, grp: u.grp, dept: s.dept, post: s.post, pro, topic, sens: (base % 7 === 0 ? '敏感' : base % 3 === 0 ? '公开' : '内部') as Sens, status: (base % 19 === 0 ? '待复核' : base % 29 === 0 ? '待审核' : '已发布') as AssetStatus }
      const doc = docOf(u, i)
      const clause = 5 + (base % 40)
      const gc = `GC-${pad(2000 + (base % 7000))}`, bz = `BZ-${pad(2000 + ((base >>> 2) % 7000))}`, kz = `KZ-${pad(4000 + ((base >>> 4) % 5000))}`, tm = `TM-${pad(4000 + ((base >>> 6) % 5000))}`, al = `AL-${pad(1000 + ((base >>> 8) % 3000))}`
      out.push({ ...common, id: gc, kind: '规程条款', title: `${s.name}的制度要求`, src: `《${doc}》 第${clause}条`, anchor: `第${clause}条`,
        summary: `《${doc}》对${s.post}在${s.name}环节的职责、时限与审批要求。`,
        body: [`${s.post}负责${s.name}相关工作，按《${doc}》第${clause}条执行。`, `涉及${s.tech.split('＋')[0]}的环节，须保留过程记录并可追溯。`, `与上级规定不一致时，以上级规定为准，并及时提请修订本条。`],
        tags: [s.dept, s.post, s.pri, '制度'], use: 40 + (base % 260), ver: `v${1 + (base % 3)}`, updated: upd, expires: dateFwd(365 - (base % 300)), owner: u.name.replace(/（.*）/, ''), rel: [bz, kz] })
      out.push({ ...common, id: bz, kind: '作业步骤', title: `${s.name} 标准作业流程`, src: `作业指导书 ${pro.slice(0, 2)}-${pad(base % 99, 2)}`, anchor: `${pick(STEP_N, base)} 项主子项`,
        summary: `${s.name}的标准作业流程，覆盖准备、执行、检查与记录四个环节。`,
        body: ['准备：确认输入材料齐全、权限与工具就绪。', `执行：按${pick(STEP_N, base)} 项主子项逐项操作，关键项须双人核对。`, '检查：输出结果与规范逐项比对，异常项按变化管理要求上报。', '记录：过程记录归档并同步至知识资产中枢。'],
        tags: [s.dept, s.post, '流程', s.tech.split('＋')[0]], use: 20 + ((base >>> 1) % 200), ver: `v${1 + ((base >>> 1) % 3)}`, updated: dateBack((base >>> 1) % 380), expires: dateFwd(365 - ((base >>> 1) % 300)), owner: u.name.replace(/（.*）/, ''), rel: [gc, kz] })
      out.push({ ...common, id: kz, kind: '岗位诀窍', title: `${s.name}：${pick(TIP_TAILS, base)}`, src: `${expert} · ${title} · ${u.name.replace(/（.*）/, '')}`, anchor: base % 2 ? `第${clause}条` : '—',
        summary: `${expert}在${s.post}岗位上沉淀的${s.name}经验，${pick(['三步判断', '先看什么后看什么', '常见错项', '口径边界'], base)}一目了然。`,
        body: [`第一步：${pick(['先核对输入口径', '先确认责任边界', '先看历史记录', '先查上级要求'], base)}，避免在错误前提下推进。`, `第二步：${pick(['按频次最高的三种情形逐一排除', '把结果与上季度同期比对', '用两种独立来源交叉验证', '关键项双人复核'], base >>> 1)}。`, `第三步：${pick(['把结论写成一句话并给出依据条款', '异常情况先上报再处理', '把过程记录同步到中枢', '向下游使用方同步口径'], base >>> 2)}。`],
        tags: [s.post, '诀窍', s.dept], use: 10 + ((base >>> 3) % 180), ver: `v${1 + ((base >>> 3) % 2)}`, updated: dateBack((base >>> 3) % 300), expires: dateFwd(365 - ((base >>> 3) % 300)), owner: expert, rel: [gc, bz] })
      out.push({ ...common, id: tm, kind: '题目', title: `${s.name} · ${pick(['情景判断题', '单选题组', '案例分析题'], base)}（${4 + (base % 9)} 道）`, src: '培训评价中心 · 岗位题库', anchor: `第${clause}条`,
        summary: `围绕${s.name}的关键判断点出题，与规程条款逐题挂钩。`,
        body: [`题目覆盖${s.post}在${s.name}中的${3 + (base % 4)} 个关键判断点。`, '每题挂接规程条款锚点，条款修订后题目自动进入复核队列。'],
        tags: ['题目', s.post], use: 5 + ((base >>> 5) % 90), ver: 'v1', updated: dateBack((base >>> 5) % 200), expires: dateFwd(300), owner: '培训评价中心', rel: [gc] })
      if (i % 3 === 1) out.push({ ...common, id: al, kind: '典型案例', title: `${u.name.replace(/（.*）/, '')}${s.name}典型案例复盘`, src: `${u.name.replace(/（.*）/, '')}工作案例 2026-${pad(1 + (base % 9), 2)}`, anchor: `第${clause}条`,
        summary: `一次${s.name}环节的偏差处置复盘，形成可复用的改进措施。`,
        body: ['事件经过：关键环节的输入口径与上级要求不一致，导致结果返工。', '原因分析：流程中缺少交叉核对步骤，责任边界不清。', '改进措施：补充双人核对，把口径写入作业步骤并回流到课件与题库。'],
        tags: ['案例', s.dept, '复盘'], use: 15 + ((base >>> 7) % 150), ver: 'v1', updated: dateBack((base >>> 7) % 400), expires: dateFwd(365), owner: u.name.replace(/（.*）/, ''), rel: [gc, bz] })
    })
  })
  return out
}

const ALL_IN: CoreIn[] = [...CORE_IN, ...genFromUnits().filter(g => !CORE_IN.some(c => c.id === g.id))]
export const ASSETS: Asset[] = ALL_IN.map((a, i) => ({
  ...a, core: i < CORE_IN.length,
  refs: refsFor(a.id, a.title, a.unit, a.use, a.topic),
  history: historyFor(a.id, a.ver, a.updated, a.owner),
  quality: qualityFor(a.id, a.updated, a.use, a.anchor),
}))
export const ASSET_MAP: Record<string, Asset> = Object.fromEntries(ASSETS.map(a => [a.id, a]))
export const assetById = (id: string) => ASSET_MAP[id]
export const TOTAL_ASSETS = ASSET_KINDS.reduce((a, k) => a + k.n, 0)
export const unitAssets = (unit: string) => ASSETS.filter(a => a.unit === unit)
/* 单位口径的资产总量：按评估表场景数放大到全量口径，用于目录计数 */
const rawTotal = (u: UnitDef) => u.sceneN * 118 + u.people * 0.9 + (hash(u.id) % 300)
const TOTAL_SCALE = TOTAL_ASSETS / UNITS.reduce((a, u) => a + rawTotal(u), 0)
export const unitTotal = (u: UnitDef) => Math.round(rawTotal(u) * TOTAL_SCALE)

/* ============ 专家（覆盖生产、职能与直属单位） ============ */
export type Expert = {
  id: string; name: string; title: string; unit: string; grp: UnitGroup; dept: string; years: number
  status: '待启动' | '访谈中' | '整理中' | '已完成'; items: number; retire: string; topics: string[]
  interviews: { date: string; len: string; stage: string; done: boolean }[]
  outline: string[]; tips: string[]; courses: number
}
export const EXPERTS_ALL: Expert[] = [
  { id: 'e1', name: '陆志明', title: '高级技师 · 变电运维', unit: '地市供电局（14个）', grp: '地市供电局', dept: '南宁供电局 变电管理一所', years: 31, status: '已完成', items: 74, retire: '2027-03', topics: ['GIS 倒闸操作', '位置核对', '异常处置'], interviews: [{ date: '2026-03-12', len: '2h10m', stage: '倒闸操作', done: true }, { date: '2026-04-02', len: '1h50m', stage: '异常处置', done: true }, { date: '2026-05-08', len: '1h20m', stage: '确认稿', done: true }], outline: [], tips: ['KZ-2411'], courses: 6 },
  { id: 'e2', name: '韦国强', title: '技能专家 · 变电检修', unit: '地市供电局（14个）', grp: '地市供电局', dept: '柳州供电局 变电管理二所', years: 29, status: '已完成', items: 66, retire: '2027-11', topics: ['主变缺陷', '油色谱', '检修工艺'], interviews: [{ date: '2026-02-20', len: '2h', stage: '缺陷判断', done: true }, { date: '2026-03-15', len: '1h40m', stage: '检修工艺', done: true }, { date: '2026-04-20', len: '1h', stage: '确认稿', done: true }], outline: [], tips: ['KZ-2903'], courses: 5 },
  { id: 'e3', name: '梁小燕', title: '高级技师 · 装表接电', unit: '地市供电局（14个）', grp: '地市供电局', dept: '桂林供电局 营销部', years: 26, status: '整理中', items: 52, retire: '2029-06', topics: ['装表接电', '计量差错', '现场稽查'], interviews: [{ date: '2026-06-03', len: '2h', stage: '接线错误识别', done: true }, { date: '2026-07-01', len: '1h30m', stage: '现场稽查', done: true }, { date: '2026-09-20', len: '1h', stage: '确认稿', done: false }], outline: [], tips: ['KZ-2755'], courses: 4 },
  { id: 'e4', name: '黄建华', title: '技师 · 配网运维', unit: '地市供电局（14个）', grp: '地市供电局', dept: '玉林供电局 配电管理所', years: 24, status: '整理中', items: 38, retire: '2031-02', topics: ['台区反送电', '分布式接入', '故障研判'], interviews: [{ date: '2026-06-18', len: '1h50m', stage: '反送电判断', done: true }, { date: '2026-08-06', len: '1h40m', stage: '故障研判', done: true }, { date: '2026-09-25', len: '1h', stage: '确认稿', done: false }], outline: [], tips: ['KZ-3118'], courses: 3 },
  { id: 'e5', name: '覃海波', title: '技能专家 · 输电线路', unit: '生产技术部', grp: '本部职能部门', dept: '输电管理', years: 33, status: '访谈中', items: 21, retire: '2026-12', topics: ['通道外破', '登杆作业', '巡视要点'], interviews: [{ date: '2026-08-28', len: '2h', stage: '通道隐患', done: true }, { date: '2026-09-18', len: '2h', stage: '登杆作业', done: false }, { date: '2026-10-09', len: '1h', stage: '确认稿', done: false }], outline: [], tips: [], courses: 1 },
  { id: 'e6', name: '莫振华', title: '高级技师 · 继电保护', unit: '广西电科院', grp: '直属机构', dept: '继电保护室', years: 28, status: '待启动', items: 0, retire: '2028-08', topics: ['定值单校核', '保护动作分析'], interviews: [{ date: '2026-10-15', len: '2h', stage: '定值单校核', done: false }, { date: '2026-11-05', len: '2h', stage: '动作分析', done: false }, { date: '2026-11-26', len: '1h', stage: '确认稿', done: false }], outline: [], tips: [], courses: 0 },
  { id: 'e7', name: '黄敏', title: '资深专责 · 会计核算', unit: '财务部', grp: '本部职能部门', dept: '会计核算', years: 22, status: '已完成', items: 31, retire: '2032-05', topics: ['培训经费核对', '票据审核', '凭证自动化'], interviews: [{ date: '2026-05-14', len: '1h30m', stage: '票据审核', done: true }, { date: '2026-06-04', len: '1h20m', stage: '经费口径', done: true }, { date: '2026-06-25', len: '50m', stage: '确认稿', done: true }], outline: [], tips: ['KZ-5106'], courses: 2 },
  { id: 'e8', name: '覃文', title: '高级专责 · 文秘', unit: '办公室', grp: '本部职能部门', dept: '文秘', years: 19, status: '已完成', items: 27, retire: '2034-01', topics: ['公文写作', '会议纪要', '督办闭环'], interviews: [{ date: '2026-03-05', len: '1h40m', stage: '公文规范', done: true }, { date: '2026-03-26', len: '1h20m', stage: '纪要与督办', done: true }, { date: '2026-04-16', len: '40m', stage: '确认稿', done: true }], outline: [], tips: ['GC-5203', 'BZ-5204'], courses: 2 },
  { id: 'e9', name: '梁雨', title: '高级坐席 · 话务班', unit: '客户服务中心（95598）', grp: '直属机构', dept: '话务班', years: 14, status: '整理中', items: 24, retire: '2040-08', topics: ['投诉升级', '情绪安抚话术', '应急来电'], interviews: [{ date: '2026-07-08', len: '1h30m', stage: '投诉处理', done: true }, { date: '2026-08-12', len: '1h20m', stage: '应急来电', done: true }, { date: '2026-09-22', len: '40m', stage: '确认稿', done: false }], outline: [], tips: ['KZ-5320'], courses: 1 },
  { id: 'e10', name: '陆峰', title: '资深专责 · 采购管理', unit: '物资部（供应链管理）', grp: '本部职能部门', dept: '采购管理', years: 21, status: '访谈中', items: 12, retire: '2033-03', topics: ['紧急采购', '招标文件校核', '供应商关联识别'], interviews: [{ date: '2026-09-02', len: '1h40m', stage: '采购合规', done: true }, { date: '2026-09-24', len: '1h30m', stage: '招标校核', done: false }, { date: '2026-10-20', len: '40m', stage: '确认稿', done: false }], outline: [], tips: ['GC-5401'], courses: 0 },
  { id: 'e11', name: '莫振宇', title: '首席专家 · 新能源调度', unit: '电力调度控制中心（省调）', grp: '直属机构', dept: '新能源调度', years: 25, status: '整理中', items: 29, retire: '2030-10', topics: ['功率预测', '出力偏差', '调度指令'], interviews: [{ date: '2026-07-22', len: '2h', stage: '预测偏差', done: true }, { date: '2026-08-19', len: '1h40m', stage: '调度指令', done: true }, { date: '2026-09-30', len: '1h', stage: '确认稿', done: false }], outline: [], tips: ['KZ-5901'], courses: 2 },
  { id: 'e12', name: '周敏', title: '高级专责 · 培训开发', unit: '人力资源部', grp: '本部职能部门', dept: '培训开发', years: 17, status: '待启动', items: 0, retire: '2036-06', topics: ['培训计划编制', '经费口径', '效果评估'], interviews: [{ date: '2026-10-08', len: '1h30m', stage: '计划编制', done: false }, { date: '2026-10-29', len: '1h30m', stage: '效果评估', done: false }, { date: '2026-11-19', len: '40m', stage: '确认稿', done: false }], outline: [], tips: ['BZ-5110'], courses: 0 },
]
export const EXTRACT_STAGES = ['结构化访谈提纲生成', '现场访谈与录音', 'AI 转写与要点抽取', '条目化整理与专家确认', '回流课件、题库、陪练与助手']
export const stageIdx = (s: Expert['status']) => s === '已完成' ? 5 : s === '整理中' ? 4 : s === '访谈中' ? 2 : 0
/* AI 生成的访谈提纲（按专家主题） */
export const outlineFor = (e: Expert) => [
  `开场：请您回顾从业 ${e.years} 年里印象最深的一次${e.topics[0]}现场，当时的判断顺序是什么？`,
  `主题一 ${e.topics[0]}：新人最常犯的三个错误，您是怎么发现并纠正的？`,
  `主题二 ${e.topics[1] ?? e.topics[0]}：哪些判断规程里没写、只能靠经验？请举一个具体场景。`,
  `主题三 ${e.topics[2] ?? e.topics[0]}：遇到规程与现场情况冲突时，您的处理边界在哪里？`,
  '收尾：如果只能给接班人留三句话，您会说什么？',
]

/* ============ 规程与制度版本库 ============ */
export type Clause = { no: string; title: string; change: '修改' | '新增' | '删除' | '不变'; old?: string; now?: string; hits: number }
export type SyncTask = { id: string; unit: string; owner: string; what: string; n: number; st: '待处理' | '处理中' | '已完成'; due: string }
export type Doc = {
  id: string; name: string; unit: string; grp: UnitGroup | '公司通用'; ver: string; prev: string; effective: string
  status: '现行' | '待生效' | '修订中'; issuedBy: string; clauses: Clause[]
  impact: Record<RefKind, number>; tasks: SyncTask[]; assets: number; log: { t: string; who: string; what: string }[]
}
export const DOCS: Doc[] = [
  { id: 'd1', name: '变电现场电气操作票管理细则', unit: '生产技术部', grp: '本部职能部门', ver: '2026 修订版', prev: '2023 版', effective: '2026-10-01', status: '待生效', issuedBy: '生产技术部 · 安全监管部',
    clauses: [
      { no: '第十八条', title: '接令后核实操作票', change: '修改', old: '操作人员接到调度正式操作指令后，应核对操作任务与设备名称。', now: '操作人员接到调度正式操作指令后，应再次核实操作票内容与指令一致，包括操作任务、设备双重名称、操作顺序与安全措施。', hits: 118 },
      { no: '附录G-5', title: 'GIS 刀闸位置指示核对', change: '修改', old: '刀闸操作后应核对后台位置显示与现场机械指示。', now: '刀闸操作后应核对四项位置指示：后台显示及报文、汇控柜电气指示、机构箱机械指示、拐臂与转轴划线标识。', hits: 96 },
      { no: '附录G-23', title: '间接验电的非同源指示', change: '不变', hits: 74 },
      { no: '附录F 2.11.5', title: '远方操作后的现场核对', change: '新增', now: '远方操作断路器后，应到现场核对机构位置指示与后台一致，方可进行后续操作。', hits: 0 },
      { no: '第二十一条', title: '操作票保存期限', change: '修改', old: '操作票保存期限为一年。', now: '操作票保存期限为三年，电子票与纸质票同步归档。', hits: 12 },
    ],
    impact: { 课件: 31, 题目: 426, 陪练剧本: 6, 助手条目: 88 }, assets: 214,
    tasks: [
      { id: 't1', unit: '培训评价中心', owner: '考评专责', what: '第十八条相关题目替换与复核', n: 318, st: '处理中', due: '2026-09-25' },
      { id: 't2', unit: '人力资源部 培训开发', owner: '培训专责', what: '变电值班员必修课第二章课件更新', n: 26, st: '处理中', due: '2026-09-22' },
      { id: 't3', unit: 'AI 智能陪练 · 教练编辑器', owner: '剧本维护', what: '倒闸操作教练第 3、9 步知识点卡更新', n: 6, st: '已完成', due: '2026-09-15' },
      { id: 't4', unit: '智能问数助手', owner: '知识运营', what: '票令核对相关助手条目重新生成', n: 88, st: '待处理', due: '2026-09-28' },
      { id: 't5', unit: '14 个地市局 变电管理所', owner: '各所培训专责', what: '班组学习包下发与复训签到', n: 14, st: '待处理', due: '2026-10-08' },
    ],
    log: [{ t: '2026-09-08', who: '生产技术部', what: '修订稿入库，自动解析出 5 处条款变化' }, { t: '2026-09-09', who: '入库流水线', what: '影响面测算完成，生成 5 张同步任务单' }, { t: '2026-09-15', who: '剧本维护', what: '陪练剧本更新完成' }] },
  { id: 'd2', name: '95598 客户服务业务规范', unit: '客户服务中心（95598）', grp: '直属机构', ver: 'V4.2', prev: 'V4.1', effective: '2026-08-20', status: '现行', issuedBy: '市场营销部 · 客户服务中心',
    clauses: [
      { no: '6.3', title: '停电类投诉受理时限', change: '修改', old: '停电类投诉受理后 60 分钟内派单到属地供电所。', now: '停电类投诉受理后 30 分钟内派单到属地供电所，城区 45 分钟、农村 90 分钟内到达现场。', hits: 64 },
      { no: '附录 B', title: '工单升级时限表', change: '修改', old: '四小时未办结升级到省公司。', now: '两小时未办结升级到省公司。', hits: 41 },
      { no: '8.2', title: '客户情绪应对', change: '不变', hits: 38 },
    ],
    impact: { 课件: 9, 题目: 112, 陪练剧本: 2, 助手条目: 36 }, assets: 58,
    tasks: [{ id: 't6', unit: '客户服务中心 话务班', owner: '班长', what: '坐席复训与话术卡更新', n: 36, st: '已完成', due: '2026-08-30' }, { id: 't7', unit: '培训评价中心', owner: '考评专责', what: '投诉时限题目替换', n: 112, st: '已完成', due: '2026-09-05' }],
    log: [{ t: '2026-08-18', who: '客户服务中心', what: 'V4.2 入库' }, { t: '2026-09-05', who: '培训评价中心', what: '题目替换完成' }] },
  { id: 'd3', name: '广西电网公司培训费管理实施细则', unit: '人力资源部', grp: '本部职能部门', ver: '2026 版', prev: '2024 版', effective: '2026-07-01', status: '现行', issuedBy: '人力资源部 · 财务部',
    clauses: [
      { no: '第九条', title: '培训费列支范围', change: '修改', old: '培训费包括师资费、场地费、教材资料费、差旅费。', now: '培训费包括师资费、场地费、教材资料费、差旅费与住宿费；线上培训的平台服务费按教材资料费列支。', hits: 22 },
      { no: '附表二', title: '外聘讲师课酬标准', change: '修改', old: '行业专家每学时 800 元以内。', now: '行业专家与高校教授每学时 1,000 元以内，省级技能专家每学时 600 元以内。', hits: 14 },
      { no: '第十五条', title: '效果评估表', change: '新增', now: '报销附件须包含培训效果评估表。', hits: 0 },
    ],
    impact: { 课件: 4, 题目: 38, 陪练剧本: 0, 助手条目: 21 }, assets: 31,
    tasks: [{ id: 't8', unit: '财务部 会计核算', owner: '黄敏', what: '报销审核口径卡更新', n: 6, st: '已完成', due: '2026-07-10' }, { id: 't9', unit: '智能问数助手', owner: '知识运营', what: '培训费相关助手条目更新', n: 21, st: '已完成', due: '2026-07-12' }],
    log: [{ t: '2026-06-28', who: '人力资源部', what: '2026 版入库' }] },
  { id: 'd4', name: '南方电网公司物资采购管理规定', unit: '物资部（供应链管理）', grp: '本部职能部门', ver: '2025 修订版', prev: '2022 版', effective: '2025-11-01', status: '现行', issuedBy: '物资部',
    clauses: [
      { no: '第三十二条', title: '紧急采购', change: '修改', old: '紧急采购由物资部审批。', now: '紧急采购由物资部审核后报分管领导审批，金额超过限额的报总经理办公会；完成后 10 个工作日内备案。', hits: 18 },
      { no: '第四十五条', title: '到货验收异常', change: '不变', hits: 16 },
    ],
    impact: { 课件: 3, 题目: 44, 陪练剧本: 0, 助手条目: 12 }, assets: 44,
    tasks: [{ id: 't10', unit: '物资部', owner: '陆峰', what: '采购合规课件更新', n: 3, st: '已完成', due: '2025-11-20' }],
    log: [{ t: '2025-10-25', who: '物资部', what: '修订版入库' }] },
  { id: 'd5', name: '新能源功率预测管理规定', unit: '电力调度控制中心（省调）', grp: '直属机构', ver: '2026 版', prev: '首版', effective: '2026-11-01', status: '修订中', issuedBy: '电力调度控制中心',
    clauses: [
      { no: '第七条', title: '预测偏差考核样本', change: '修改', old: '预测偏差按全部时段统计。', now: '受限时段的实发功率不作为预测偏差统计样本。', hits: 9 },
      { no: '第十二条', title: '装机容量更新时限', change: '新增', now: '新投产与检修容量应在 24 小时内更新到预测模型。', hits: 0 },
    ],
    impact: { 课件: 2, 题目: 26, 陪练剧本: 1, 助手条目: 9 }, assets: 19,
    tasks: [{ id: 't11', unit: '省调 新能源调度', owner: '莫振宇', what: '修订稿条款确认', n: 2, st: '处理中', due: '2026-10-15' }],
    log: [{ t: '2026-09-10', who: '省调', what: '修订稿入库，待条款确认' }] },
  { id: 'd6', name: '南方电网公司公文处理办法', unit: '办公室', grp: '本部职能部门', ver: '2024 版', prev: '2020 版', effective: '2024-05-01', status: '现行', issuedBy: '办公室',
    clauses: [{ no: '第十七条', title: '请示行文规则', change: '不变', hits: 27 }, { no: '第二十六条', title: '会议纪要', change: '不变', hits: 19 }],
    impact: { 课件: 2, 题目: 30, 陪练剧本: 0, 助手条目: 14 }, assets: 26,
    tasks: [], log: [{ t: '2024-04-20', who: '办公室', what: '2024 版入库' }] },
  { id: 'd7', name: '安全生产隐患排查治理办法', unit: '安全监管部', grp: '本部职能部门', ver: '2026 版', prev: '2023 版', effective: '2026-04-20', status: '现行', issuedBy: '安全监管部',
    clauses: [{ no: '第十五条', title: '隐患闭环', change: '修改', old: '隐患治理完成后由所在单位销号。', now: '重大隐患治理完成后由安全监管部复查验收方可销号。', hits: 33 }, { no: '第二十条', title: '复发考核', change: '新增', now: '同类隐患一年内在同一单位复发两次以上的纳入安全绩效考核。', hits: 0 }],
    impact: { 课件: 7, 题目: 96, 陪练剧本: 1, 助手条目: 24 }, assets: 52,
    tasks: [{ id: 't12', unit: '培训评价中心', owner: '考评专责', what: '隐患闭环题目替换', n: 96, st: '已完成', due: '2026-05-10' }], log: [{ t: '2026-04-15', who: '安全监管部', what: '2026 版入库' }] },
  { id: 'd8', name: '题库建设与考试管理规范', unit: '培训评价中心', grp: '直属机构', ver: 'V2.0', prev: 'V1.3', effective: '2026-09-05', status: '现行', issuedBy: '人力资源部 · 培训评价中心',
    clauses: [{ no: '第五章', title: '智能组卷校验', change: '新增', now: '组卷须通过难度均衡、时效与重复率三项校验。', hits: 0 }],
    impact: { 课件: 1, 题目: 0, 陪练剧本: 0, 助手条目: 6 }, assets: 12, tasks: [], log: [{ t: '2026-09-01', who: '培训评价中心', what: 'V2.0 入库' }] },
]
export const docById = (id: string) => DOCS.find(d => d.id === id)

/* ============ 智能入库流水线 ============ */
export const PIPE_STAGES = ['解析', '切分', '抽取', '打标', '去重', '审核', '发布']
export type Source = { id: string; name: string; kind: string; desc: string; month: number; auto: boolean; units: string }
export const SOURCES: Source[] = [
  { id: 's1', name: '规程与制度库同步', kind: '制度文件', desc: '公司制度库新发布或修订的规程、办法、细则自动拉取', month: 38, auto: true, units: '全部一级单位' },
  { id: 's2', name: '事故通报与案例', kind: '通报', desc: '安全监管部事故通报、各单位工作案例', month: 17, auto: true, units: '安全监管部 · 各地市局' },
  { id: 's3', name: '专家访谈录音', kind: '音频', desc: '访谈录音转写、要点抽取、条目化', month: 9, auto: false, units: '12 位在采专家' },
  { id: 's4', name: '95598 工单与投诉', kind: '工单', desc: '高频工单归类后生成客服知识条目', month: 412, auto: true, units: '客户服务中心' },
  { id: 's5', name: '课程反馈与提问', kind: '反馈', desc: '课程评价与问数助手未命中的提问', month: 266, auto: true, units: '全员' },
  { id: 's6', name: '部门上传', kind: '文档', desc: '各部门上传的作业指导书、模板、会议纪要', month: 74, auto: false, units: '28 个一级单位' },
]
export type BatchItem = { id: string; kind: AssetKind; title: string; conf: number; dup?: string; tags: string[]; st: '待审' | '通过' | '合并' | '退回'; excerpt: string; extract: string[]; unit: string; post: string }
export type Batch = { id: string; src: string; name: string; unit: string; time: string; n: number; stage: number; st: '处理中' | '待审核' | '已发布' | '已退回'; items: BatchItem[] }
export const BATCHES: Batch[] = [
  { id: 'b1', src: 's1', name: '《变电现场电气操作票管理细则》2026 修订版', unit: '生产技术部', time: '2026-09-08 09:12', n: 214, stage: 6, st: '已发布', items: [
    { id: 'i1', kind: '规程条款', title: '接到调度正式指令后应再次核实操作票内容', conf: .97, tags: ['票令核对', '调度指令'], st: '通过', excerpt: '第十八条 操作人员接到调度正式操作指令后，应再次核实操作票内容与指令一致，包括操作任务、设备双重名称、操作顺序与安全措施。', extract: ['类型：规程条款', '适用岗位：变电值班员、监护人', '锚点：第十八条', '与现有条目 GC-0871 为同一条款的新版本，建议版本更新'], unit: '公司通用', post: '变电值班员' },
    { id: 'i2', kind: '规程条款', title: 'GIS 刀闸操作后应核对四项位置指示', conf: .95, dup: 'KZ-2411', tags: ['GIS', '位置核对'], st: '通过', excerpt: '附录G-5 刀闸操作后应核对四项位置指示：后台显示及报文、汇控柜电气指示、机构箱机械指示、拐臂与转轴划线标识。', extract: ['类型：规程条款', '锚点：附录G-5', '与岗位诀窍 KZ-2411 主题相同，建议建立引用关系而非合并'], unit: '公司通用', post: '变电值班员' },
    { id: 'i3', kind: '作业步骤', title: '远方操作断路器后的现场核对步骤', conf: .88, tags: ['远方操作', '现场核对'], st: '通过', excerpt: '附录F 2.11.5 远方操作断路器后，应到现场核对机构位置指示与后台一致，方可进行后续操作。', extract: ['类型：作业步骤（新增）', '适用岗位：变电值班员', '建议关联陪练剧本：倒闸操作 · 第 9 步'], unit: '公司通用', post: '变电值班员' },
  ] },
  { id: 'b2', src: 's3', name: '陆峰访谈 · 采购合规（第 1 轮）', unit: '物资部（供应链管理）', time: '2026-09-02 15:40', n: 18, stage: 5, st: '待审核', items: [
    { id: 'i4', kind: '岗位诀窍', title: '紧急采购理由说明的三个必写要素', conf: .91, tags: ['紧急采购', '合规'], st: '待审', excerpt: '"……写紧急理由的时候，一定要写清楚三个东西：为什么等不了正常流程、不采购会造成什么后果、为什么选这家供应商。少一个，审计来查的时候都说不清。"', extract: ['类型：岗位诀窍', '适用岗位：采购管理专责、需求部门经办', '规程锚点：物资采购管理规定 第三十二条', '建议关联：GC-5401'], unit: '物资部（供应链管理）', post: '采购管理专责' },
    { id: 'i5', kind: '岗位诀窍', title: '投标文件形式合规比对的高频错项', conf: .86, tags: ['招标', '合规比对'], st: '待审', excerpt: '"……最常见的是授权书日期晚于投标截止日、业绩合同没有盖骑缝章、报价表小数点位数和格式不一致。"', extract: ['类型：岗位诀窍', '适用岗位：招标管理专责', '建议生成题目：3 道判断题'], unit: '物资部（供应链管理）', post: '招标管理专责' },
    { id: 'i6', kind: '典型案例', title: '某批次电缆到货规格不符的处置过程', conf: .79, dup: 'BZ-5408', tags: ['到货验收', '案例'], st: '待审', excerpt: '"……去年有一批 10kV 电缆，到货截面比合同小一档，仓库当场拍照，48 小时内发了函，供应商一周换货，工程没耽误。"', extract: ['类型：典型案例', '与作业步骤 BZ-5408 流程一致，建议作为其案例附件', '敏感等级：内部（涉及供应商名称，已脱敏）'], unit: '物资部（供应链管理）', post: '仓储管理员' },
  ] },
  { id: 'b3', src: 's4', name: '95598 工单归类 · 8 月停电类高频问题', unit: '客户服务中心（95598）', time: '2026-09-01 08:00', n: 412, stage: 4, st: '处理中', items: [
    { id: 'i7', kind: '岗位诀窍', title: '计划停电与故障停电来电的分流话术', conf: .83, tags: ['停电', '话术'], st: '待审', excerpt: '工单聚类：计划停电咨询 2,140 单、故障停电报修 1,860 单，坐席平均处理时长差异 48 秒。', extract: ['类型：岗位诀窍（由工单聚类生成）', '建议先由话务班班长确认话术'], unit: '客户服务中心（95598）', post: '95598 坐席' },
  ] },
  { id: 'b4', src: 's5', name: '问数助手未命中提问 · 第 36 周', unit: '全员', time: '2026-09-07 23:00', n: 266, stage: 3, st: '处理中', items: [
    { id: 'i8', kind: '规程条款', title: '借调人员的培训学时计入哪个单位', conf: .74, tags: ['学时', '借调'], st: '待审', excerpt: '相似提问 41 次，来自 9 个单位；现有资产无命中。', extract: ['类型：规程条款（待补）', '建议来源：培训管理办法 第二十三条', '责任单位：人力资源部 培训开发'], unit: '人力资源部', post: '培训专责' },
    { id: 'i9', kind: '规程条款', title: '外包人员能否参加公司内部技能认定', conf: .71, tags: ['外包', '技能认定'], st: '待审', excerpt: '相似提问 28 次，来自 6 个地市局。', extract: ['类型：规程条款（待补）', '建议来源：技能等级认定实施细则', '责任单位：培训评价中心'], unit: '培训评价中心', post: '考评专责' },
  ] },
  { id: 'b5', src: 's6', name: '财务部上传 · 票据识别与凭证自动生成作业指导书', unit: '财务部', time: '2026-09-11 10:30', n: 26, stage: 2, st: '处理中', items: [
    { id: 'i10', kind: '作业步骤', title: '票据识别结果人工复核的抽检比例与要点', conf: .89, tags: ['票据', '复核'], st: '待审', excerpt: '第 4.2 节 识别置信度低于 0.9 的票据全部复核，其余按 5% 抽检；复核要点为金额、日期、开票方与用途。', extract: ['类型：作业步骤', '适用岗位：会计核算专责', '建议生成课件片段：财务智能化专题课 第 2 章'], unit: '财务部', post: '会计核算专责' },
  ] },
  { id: 'b6', src: 's2', name: '公司事故通报 2026-11 号（误合地刀）', unit: '安全监管部', time: '2026-08-21 14:05', n: 8, stage: 6, st: '已发布', items: [
    { id: 'i11', kind: '典型案例', title: '误合地刀事件的四个失守环节', conf: .96, tags: ['红线', '接地'], st: '通过', excerpt: '通报指出唱票复诵、间接验电、监护、五防校核四个环节均未有效执行。', extract: ['类型：典型案例', '已关联 GC-1244、AL-0442', '已推送班组学习包 1 期'], unit: '公司通用', post: '全体' },
  ] },
]
export const batchById = (id: string) => BATCHES.find(b => b.id === id)

/* ============ 质量与权限 ============ */
export type QCat = { id: string; name: string; desc: string; n: number; sev: 'bad' | 'warn' | 'ok' }
export const Q_CATS: QCat[] = [
  { id: 'stale', name: '超期未复核', desc: '超过 12 个月未复核的条目，可能与现行规程脱节', n: 1284, sev: 'warn' },
  { id: 'conflict', name: '表述冲突', desc: '同主题条目对同一事项的表述存在差异', n: 96, sev: 'bad' },
  { id: 'orphan', name: '零引用', desc: '近 90 天未被课件、题目、陪练或助手引用', n: 2310, sev: 'warn' },
  { id: 'nosrc', name: '缺来源锚点', desc: '诀窍或案例未挂接规程条款', n: 418, sev: 'warn' },
  { id: 'dup', name: '疑似重复', desc: '语义相似度高于 0.92 的条目对', n: 152, sev: 'ok' },
]
export const issuesOf = (cat: string) => {
  const key = cat === 'stale' ? '超过 12 个月未复核' : cat === 'conflict' ? '与同主题条目表述存在差异' : cat === 'orphan' ? '近 90 天零引用' : cat === 'nosrc' ? '缺少规程锚点' : ''
  if (!key) return ASSETS.filter(a => a.quality.score < 80).slice(0, 40)
  return ASSETS.filter(a => a.quality.issues.includes(key)).slice(0, 60)
}
export const SENS_LEVELS: { lvl: Sens; desc: string; who: string; n: number; c: string }[] = [
  { lvl: '公开', desc: '公司全员可见，可被助手直接引用', who: '全员', n: 21860, c: '#1d7a4f' },
  { lvl: '内部', desc: '本单位与相关专业可见，助手引用时脱敏', who: '本单位 · 相关专业', n: 23124, c: '#2b4e92' },
  { lvl: '敏感', desc: '涉及客户信息、供应商、纪检与审计内容，仅授权岗位可见', who: '授权岗位', n: 2060, c: '#b03a2e' },
]
export const PERM_ROLES = ['一线员工', '班组长', '培训专责', '培训科', '专业部门审核人', '知识运营']
export const PERM_ACTS = ['查看公开', '查看内部', '查看敏感', '提交入库', '审核发布', '版本回滚', '权限配置']
export const PERM: Record<string, boolean[]> = {
  一线员工: [true, true, false, true, false, false, false],
  班组长: [true, true, false, true, false, false, false],
  培训专责: [true, true, false, true, true, false, false],
  培训科: [true, true, true, true, true, true, true],
  专业部门审核人: [true, true, true, true, true, true, false],
  知识运营: [true, true, true, true, true, true, true],
}
export const AUDIT = [
  { t: '2026-09-14 08:42', who: '陈科长 · 培训科', what: '审核通过', obj: 'BZ-1180 v3', ip: '10.36.*' },
  { t: '2026-09-13 17:20', who: '知识运营', what: '影响面测算', obj: 'd1 变电现场电气操作票管理细则', ip: '10.36.*' },
  { t: '2026-09-13 16:05', who: '黄敏 · 财务部', what: '提交入库', obj: 'b5 票据识别作业指导书', ip: '10.36.*' },
  { t: '2026-09-12 11:31', who: '梁雨 · 客户服务中心', what: '查看敏感', obj: 'AL-5312 台风期间集中来电复盘', ip: '10.41.*' },
  { t: '2026-09-12 09:14', who: '入库流水线', what: '自动打标', obj: 'b4 未命中提问 266 条', ip: '系统' },
  { t: '2026-09-11 15:48', who: '陆峰 · 物资部', what: '专家确认', obj: 'i4 紧急采购理由三要素', ip: '10.36.*' },
  { t: '2026-09-10 10:02', who: '培训评价中心', what: '题目替换', obj: 'GC-0871 关联题目 318 道', ip: '10.38.*' },
  { t: '2026-09-09 14:27', who: '知识运营', what: '版本回滚', obj: 'KZ-2903 v2 → v1（表述争议）', ip: '10.36.*' },
]

/* ============ 语义检索：意图解析与预置问答 ============ */
export type Intent = { post?: string; unit?: string; kind?: AssetKind; topic?: string }
const POST_WORDS = ['变电值班员', '台区经理', '装表接电员', '95598 坐席', '坐席', '采购', '会计', '文秘', '培训专责', '调度员', '班组长', '安监']
const TOPIC_WORDS = ['验电', '刀闸', '地刀', '操作票', '票令', '主变', '反送电', '投诉', '停电', '培训费', '报销', '公文', '请示', '纪要', '督办', '紧急采购', '验收', '隐患', '合同', '主数据', '功率预测', '组卷', '课酬', '接线']
export function parseIntent(q: string): Intent {
  const it: Intent = {}
  POST_WORDS.forEach(w => { if (q.includes(w)) it.post = w })
  UNITS.forEach(u => { const short = u.name.replace(/（.*）/, ''); if (q.includes(short) || q.includes(short.slice(0, 3))) it.unit = u.name })
  KINDS.forEach(k => { if (q.includes(k.slice(0, 2))) it.kind = k })
  if (/怎么做|步骤|流程/.test(q)) it.kind = it.kind ?? '作业步骤'
  if (/案例|事件|复盘/.test(q)) it.kind = it.kind ?? '典型案例'
  if (/规定|要求|条款|能不能|可以/.test(q)) it.kind = it.kind ?? '规程条款'
  TOPIC_WORDS.forEach(w => { if (q.includes(w)) it.topic = it.topic ? `${it.topic}、${w}` : w })
  return it
}
export function searchAssets(q: string): { asset: Asset; score: number; why: string }[] {
  const it = parseIntent(q)
  const clean = q.replace(/[？?，。、！!：:；;（）()\s]/g, ' ').replace(/(的|是|吗|呢|怎么|什么|哪些|如何|要求|应该|可以|能不能|多长时间|必须|先|哪一项|情况下|谁|要)/g, ' ')
  const segs = clean.split(/\s+/).filter(s => s.length >= 2)
  const strong = new Set<string>()
  TOPIC_WORDS.forEach(w => { if (q.includes(w)) strong.add(w) })
  POST_WORDS.forEach(w => { if (q.includes(w)) strong.add(w.replace(' ', '')) })
  const bigrams = new Set<string>()
  segs.forEach(s => { for (let i = 0; i + 2 <= s.length; i++) bigrams.add(s.slice(i, i + 2)) })
  strong.forEach(w => { for (let i = 0; i + 2 <= w.length; i++) bigrams.delete(w.slice(i, i + 2)) })
  const scored = ASSETS.map(a => {
    let s = 0; const why: string[] = []
    const text = a.summary + a.body.join('')
    strong.forEach(w => { if (a.title.includes(w)) { s += 3; why.push(`标题命中"${w}"`) } else if (a.tags.some(t => t.includes(w))) { s += 2.2; why.push(`标签命中"${w}"`) } else if (text.includes(w)) { s += 1.4; why.push(`正文命中"${w}"`) } })
    let bg = 0
    bigrams.forEach(b => { if (a.title.includes(b)) bg += 1.2; else if (a.tags.some(t => t.includes(b))) bg += .8; else if (text.includes(b)) bg += .4 })
    if (bg > 0) { s += Math.min(4, bg); if (!why.length) why.push('语义相近') }
    if (it.post && a.post.replace(' ', '').includes(it.post.replace(' ', ''))) { s += 1.5; why.push('岗位匹配') }
    if (it.unit && a.unit === it.unit) { s += 1.5; why.push('单位匹配') }
    if (it.kind && a.kind === it.kind) { s += .8 }
    if (a.core) s += .8
    return { asset: a, score: s, why: why.slice(0, 2).join(' · ') }
  }).filter(x => x.score >= 3.2).sort((a, b) => b.score - a.score || b.asset.use - a.asset.use)
  return scored.slice(0, 24)
}
export const SEARCH_PRESETS = [
  '不能直接验电时怎么确认设备无电？', '95598 坐席遇到停电投诉多长时间必须派单？', '培训费报销要附哪些材料？',
  '紧急采购什么情况下可以用，谁审批？', '请示能不能同时主送两个上级？', '主变有异响先查什么？', '新能源功率预测偏差大先排查哪一项？',
]
export function answerFor(hits: { asset: Asset }[]): string {
  if (!hits.length) return '知识资产中枢暂无与该问题直接匹配的条目。已把这条提问记入未命中队列，责任单位确认后将补充条目并回流到助手。'
  const top = hits[0].asset
  const second = hits[1]?.asset
  return `${top.summary} ${top.body[0]} ${second ? `另可参考「${second.title}」：${second.summary}` : ''} 出处：${top.src}${top.anchor !== '—' ? `（${top.anchor}）` : ''}。`
}

/* ============ 驾驶舱 ============ */
export const TREND = Array.from({ length: 26 }).map((_, i) => ({ w: `第 ${12 + i} 周`, in: 520 + ((i * 173) % 420) + i * 14 + Math.round(Math.sin(i / 2.3) * 90), review: 300 + ((i * 97) % 260) + i * 8 + Math.round(Math.cos(i / 3.1) * 60), ref: 4200 + ((i * 311) % 1800) + i * 70 + Math.round(Math.sin(i / 1.7) * 380) }))
export const HOT_ASSETS = [...ASSETS].sort((a, b) => b.use - a.use).slice(0, 8)
export const INSIGHTS = [
  { k: '提问未命中', v: '266 条 / 周', d: '借调人员学时归属、外包人员技能认定两类问题连续三周未命中，责任单位为人力资源部与培训评价中心。', go: { v: 'ingest' as const }, tag: 'warn' },
  { k: '规程待生效', v: '1 部 · 10-01', d: '《变电现场电气操作票管理细则》2026 修订版 5 处条款变化，同步任务 5 张，2 张待处理。', go: { v: 'doc' as const, id: 'd1' }, tag: 'bad' },
  { k: '资产健康度', v: '91.6 分', d: '本月复核 1,203 条，超期未复核 1,284 条，集中在配电与营销两个专业的 2024 年入库条目。', go: { v: 'quality' as const }, tag: 'ok' },
  { k: '专家退休预警', v: '2 位 · 12 个月内', d: '覃海波（2026-12）访谈进行中，陆志明（2027-03）已完成萃取；莫振华 2028-08 退休，尚未启动。', go: { v: 'expert' as const }, tag: 'warn' },
]
export const unitDist = () => UNITS.map(u => ({ u, n: unitTotal(u) })).sort((a, b) => b.n - a.n)
export { ASSET_TREE, ASSET_KINDS }
