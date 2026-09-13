/* ===== 工作台数据层：全部为脱敏模拟数据，唯一数据源，各图表/页面由此推导 ===== */

const HOME_USER = {
  name: '任玲玲', team: '变电运行一班', post: '变电运行值班员',
  hours: { done: 68, need: 90 },          // 年度培训学时（知识课堂回写口径）
  certs: [
    { n: '高压电工作业证', got: '2024-03-18', review: '2027-03-17', ok: true },
    { n: '变电站倒闸操作资格', got: '2025-01-10', review: '2026-01-09', ok: true }
  ]
};

/* 8 维能力（ability.js：认证表 20 个专业项目 + 两项考试内容抽取，全站同名同序） */
const DIMS6 = DIMS;                              // 兼容旧引用：现为 8 维
const RADAR_BASE = [86, 64, 88, 80, 72, 78, 68, 84];   // 本月基线（陪练舱与课堂口径），题库考试结果按 abilityNow() 合入
const RADAR_PREV = [80, 56, 84, 74, 62, 72, 60, 78];
const RADAR_OLD  = [74, 50, 78, 66, 54, 66, 52, 70];   // 前月，成长档案用
const TEAM_AVG   = [83, 76, 85, 82, 74, 80, 72, 81];   // 班组均值（组织级口径）
/* 本月现值 = 基线与本机题库考试结果（近 5 次）按 6:4 合成，考试模块落盘后即时变化 */
function abilityNow() {
  const ex = (typeof examRecords === 'function' ? examRecords() : []).filter(r => r.who === HOME_USER.name).slice(0, 5);
  if (!ex.length) return RADAR_BASE.slice();
  return RADAR_BASE.map((b, i) => { const k = DIMK[i]; const vs = ex.map(r => r.dims && r.dims[k]).filter(v => v != null); if (!vs.length) return b; const m = vs.reduce((a, v) => a + v, 0) / vs.length; return Math.round(b * .6 + m * .4); });
}
Object.defineProperty(window, 'RADAR_NOW', { get: abilityNow });   // 全局读取即为现值（随本机考试记录变化）

/* 成长档案与陪练舱、首页、组长工作台同用 8 维（旧十维口径并入） */
const DIMS10 = DIMS, RADAR10_PREV = RADAR_PREV, RADAR10_OLD = RADAR_OLD, TEAM_AVG10 = TEAM_AVG;
Object.defineProperty(window, 'RADAR10_NOW', { get: abilityNow });
const DIM10_DESC = Object.fromEntries(ABILITY8.map(a => [a.n, a.d + '。对应专业项目：' + a.items.map(c => c + ' ' + certItem(c).n).join('、')]));

/* 近30天练习场次（d=距今天数，倒序＝最近在前） */
const SESSIONS = [
  { d: 1,  plan: '分段 · 冷备用 → 检修',   mode: '演练模式', dur: 23, score: 86, hints: [['状态核对与确认', 'GIS 四项核对第二级提示']], vio: [{ lv: 'minor', step: '13', t: '四项位置指示核对顺序不完整', cite: '附录G-5' }] },
  { d: 3,  plan: '专项 · GIS 四项核对',    mode: '演练模式', dur: 11, score: 78, hints: [['状态核对与确认', 'GIS 四项核对第一级提示']], vio: [{ lv: 'minor', step: '11', t: '汇控柜电气指示未逐项唱读', cite: '附录G-5' }] },
  { d: 5,  plan: '完整操作票',             mode: '演练模式', dur: 47, score: 88, hints: [], vio: [{ lv: 'minor', step: '9', t: '接令记录漏填发令时间', cite: '细则第十八条' }] },
  { d: 8,  plan: '专项 · 接令与票令核对',  mode: '考核模式', dur: 9,  score: 92, hints: [], vio: [] },
  { d: 11, plan: '分段 · 热备用 → 冷备用', mode: '演练模式', dur: 19, score: 83, hints: [['操作程序与票务规范', '复诵话术第一级提示']], vio: [{ lv: 'minor', step: '10', t: '复诵缺设备双重名称', cite: '附录J' }] },
  { d: 13, plan: '错题重练',               mode: '演练模式', dur: 14, score: 90, hints: [], vio: [] },
  { d: 16, plan: '专项 · 验电接地',        mode: '教学模式', dur: 12, score: 75, hints: [['安全措施与风险控制', '验电顺序第一级提示']], vio: [{ lv: 'major', t: '验电顺序不完整', step: '18', cite: '附录G-23' }] },
  { d: 18, plan: '分段 · 运行 → 热备用',   mode: '教学模式', dur: 17, score: 81, hints: [], vio: [{ lv: 'minor', step: '4', t: '检查回报口径不完整', cite: '附录J' }] },
  { d: 22, plan: '完整操作票',             mode: '演练模式', dur: 52, score: 74, hints: [['异常与应急处置', '异常上报流程第二级提示']], vio: [{ lv: 'major', step: '11', t: '发现异常未立即中止操作', cite: '细则第十三条（四）' }, { lv: 'minor', step: '12', t: '汇报值班负责人用语不规范', cite: '附录J' }] },
  { d: 25, plan: '专项 · GIS 四项核对',    mode: '教学模式', dur: 13, score: 70, hints: [['状态核对与确认', 'GIS 四项核对第三级提示']], vio: [{ lv: 'minor', step: '11', t: '只核对后台未核对就地指示', cite: '附录G-5' }] },
  { d: 27, plan: '分段 · 冷备用 → 检修',   mode: '教学模式', dur: 26, score: 68, hints: [['状态核对与确认', 'GIS 四项核对第二级提示'], ['安全措施与风险控制', '接地前验电第一级提示']], vio: [{ lv: 'red', step: '20', t: '未完成两种验电即准备合接地刀闸', cite: '细则第十三条（四）' }] },
  { d: 29, plan: '完整操作票',             mode: '教学模式', dur: 58, score: 66, hints: [['操作程序与票务规范', '唱票节拍第一级提示']], vio: [{ lv: 'minor', step: '2', t: '唱票未等监护人"对，执行"即操作', cite: '附录J' }, { lv: 'minor', step: '6', t: '走错间隔经提醒返回', cite: '附录J' }] }
];

/* 今日待练任务（班组长下发） */
const HOME_TASK = { plan: 'full', name: '完整操作票（考核模式）', from: '班组长 周建国', dueDays: 2 };

/* 岗位胜任度构成 */
const FITNESS = {
  pct: 82, post: '变电运行值班员',
  parts: [
    { n: '规程理论考试', v: '92 分', need: '≥ 80 分', ok: true },
    { n: '实操演练场次', v: '12 场', need: '≥ 15 场', ok: false, gap: '再完成 3 场演练/考核模式练习' },
    { n: '年度培训学时', v: '68 学时', need: '≥ 90 学时', ok: false, gap: '知识课堂待修 22 学时' },
    { n: '有效资质证书', v: '2 / 2', need: '2 项齐全', ok: true }
  ]
};

/* 知识课堂：推荐课程与学时回写记录 */
const COURSES = [
  { n: 'GIS 设备结构与四项位置指示核对', h: 4, tag: '状态核对与确认' },
  { n: '调度规范用语与接发令要点', h: 2, tag: '操作程序与票务规范' },
  { n: '倒闸操作典型异常处置案例', h: 3, tag: '异常与应急处置' },
  { n: '电气操作票填写与三审要求', h: 2, tag: '操作程序与票务规范' }
];
const HOUR_LOG = [
  { d: 2,  n: '变电站防误操作专题', h: 2, src: '知识课堂' },
  { d: 6,  n: '完整操作票练习（陪练学时）', h: 1, src: '陪练底座回写' },
  { d: 9,  n: '安规（变电部分）年度复训', h: 4, src: '知识课堂' },
  { d: 15, n: '两票管理细则修编解读', h: 2, src: '知识课堂' },
  { d: 23, n: '完整操作票练习（陪练学时）', h: 1, src: '陪练底座回写' }
];

/* ===== AI 教练中心：预设教练目录 ===== */
const COACH_FAMS = ['变电运行', '变电检修', '配网', '调度', '营销服务', '安全监督', '班组管理'];
const COACHES = [
  { id: 'daozha', n: '倒闸操作 · 陈志远', fam: '变电运行', dom: '倒闸操作', open: true, exam: 'e1163', lvl: 3, min: 45, users: 238, gain: 11, tags: ['状态核对与确认', '安全措施与风险控制', '操作程序与票务规范'], desc: '110kV 培训三线 1163 运行转检修：1163 关卡（断开开关后的状态检查 · 验电、接地及地刀三位置检查，含一票否决主线）与完整操作票 29 项对练。' },
  { id: 'abn',    n: '事故异常处置推演', fam: '变电运行', dom: '异常处置', open: false, lvl: 3, min: 30, users: 186, gain: 9,  tags: ['异常处置', '调度术语'], desc: '刀闸位置不一致、保护动作、直流接地等典型异常的中止、汇报、隔离处置对练。' },
  { id: 'patrol', n: '设备巡视要点考问', fam: '变电运行', dom: '设备巡视', open: false, lvl: 2, min: 20, users: 154, gain: 7,  tags: ['规程记忆', '风险辨识'], desc: '按巡视路线逐设备考问外观、油位、压力、红外测温判读要点，漏项即时纠正。' },
  { id: 'test',   n: '高压试验作业交底', fam: '变电检修', dom: '高压试验', open: false, lvl: 3, min: 25, users: 97,  gain: 8,  tags: ['作业交底', '风险辨识'], desc: '试验前安全交底对练：试验范围、加压区域、监护布置、异常终止条件逐项陈述。' },
  { id: 'anco',   n: '检修安全措施布置', fam: '变电检修', dom: '检修作业', open: false, lvl: 2, min: 22, users: 121, gain: 8,  tags: ['安措布置', '规程记忆'], desc: '按工作票核对接地、遮栏、标示牌布置顺序与完整性，缺项漏项即时指出。' },
  { id: 'relay',  n: '二次安措与定值单核对', fam: '变电检修', dom: '二次作业', open: false, lvl: 3, min: 28, users: 76,  gain: 10, tags: ['安措布置', '设备状态核对'], desc: '压板投退、二次接线隔离与定值单逐项核对对练，防走错间隔、防误碰运行设备。' },
  { id: 'dnet',   n: '配网抢修工单处置', fam: '配网', dom: '故障抢修', open: false, lvl: 2, min: 24, users: 203, gain: 9,  tags: ['应急处置', '沟通表达'], desc: '接单、研判、到场勘查、隔离恢复、回访全流程对练，含多工单并发排序。' },
  { id: 'live',   n: '带电作业作业许可', fam: '配网', dom: '带电作业', open: false, lvl: 3, min: 26, users: 68,  gain: 8,  tags: ['作业交底', '风险辨识'], desc: '带电作业许可条件逐项核对与终止条件判断对练，气象、绝缘、监护缺一不可。' },
  { id: 'term',   n: '调度术语对练', fam: '调度', dom: '调度用语', open: false, lvl: 2, min: 15, users: 312, gain: 12, tags: ['调度术语', '唱票复诵'], desc: '规范术语、设备双重名称、复诵与录音留痕要点的高频对练，纠正口语化表达。' },
  { id: 'order',  n: '接发令规范', fam: '调度', dom: '接发令', open: false, lvl: 2, min: 18, users: 145, gain: 9,  tags: ['调度术语', '规程记忆'], desc: '接令记录、复诵核对、票令一致性判断对练，含故意念错的干扰令识别。' },
  { id: 'cust',   n: '停电施工现场沟通', fam: '营销服务', dom: '客户沟通', open: false, lvl: 2, min: 20, users: 178, gain: 8,  tags: ['沟通表达'], desc: '计划停电告知、现场受阻协调、情绪安抚的多轮对话演练，AI 扮演客户。' },
  { id: 'comp',   n: '投诉工单回复', fam: '营销服务', dom: '投诉处理', open: false, lvl: 2, min: 16, users: 132, gain: 7,  tags: ['沟通表达'], desc: '按投诉分类练习回复口径与时限要求，回复初稿逐句点评。' },
  { id: 'biz',    n: '业扩报装现场勘查', fam: '营销服务', dom: '业扩报装', open: false, lvl: 2, min: 22, users: 89,  gain: 7,  tags: ['风险辨识', '沟通表达'], desc: '现场勘查要点、供电方案要素与客户答疑对练。' },
  { id: 'angui',  n: '安规考问 · 变电部分', fam: '安全监督', dom: '安规', open: false, lvl: 2, min: 18, users: 421, gain: 10, tags: ['规程记忆'], desc: '按章节随机考问 + 场景判断题，答错即出条款原文与解析。' },
  { id: 'fire',   n: '雨淋阀机械手动启动 · 周建国', fam: '安全监督', dom: '消防应急', open: true, exam: 'rain', avatar: 'angui', lvl: 2, min: 15, users: 167, gain: 8,  tags: ['异常与应急处置', '设备辨识与定位', '仪表读数与工器具使用'], desc: '#3主变防护区火灾、消防报警主机故障时的雨淋阀机械手动启动：阀组状态检查、设备辨识、紧急启动阀盒与手动阀全开、水喷雾确认，含七条关键错误与口述汇报。' },
  { id: 'space',  n: '有限空间作业监护', fam: '安全监督', dom: '作业监护', open: false, lvl: 3, min: 24, users: 54,  gain: 9,  tags: ['风险辨识', '安措布置'], desc: '气体检测、通风、监护职责与应急撤离的全要素对练。' },
  { id: 'meet',   n: '班组安全日活动主持', fam: '班组管理', dom: '班组建设', open: false, lvl: 1, min: 15, users: 98,  gain: 6,  tags: ['沟通表达', '带教引导'], desc: '安全日活动的议程组织、案例讲评与讨论引导演练。' },
  { id: 'mentor', n: '新员工岗前引导', fam: '班组管理', dom: '师带徒', open: false, lvl: 1, min: 18, users: 73,  gain: 6,  tags: ['带教引导'], desc: '入职首周引导对练：安全交底、岗位认知、首次上站注意事项。' }
];

/* 推荐位（由近30天数据生成推荐理由） */
function recoList() {
  const a = abilityNow(); const order = DIMS.map((n, i) => [n, a[i], TEAM_AVG[i]]).sort((x, y) => x[1] - y[1]);
  const w1 = order[0], w2 = order[1];
  return [
    { exam: DIM_EXAM[w1[0]] || 'e1163', why: `「${w1[0]}」${w1[1]} 分，低于班组均值 ${w1[2] - w1[1]} 分`, act: '开始考试' },
    { exam: DIM_EXAM[w2[0]] || 'rain', why: `「${w2[0]}」${w2[1]} 分，为第二短板`, act: '开始考试' },
    { coach: 'daozha', pre: 'sp_gis', why: '近两场「状态核对与确认」使用了提示', act: '陪练舱练习' }
  ];
}

/* 我在练的教练（工作台窄条，只列本人已开练的；全量目录在教练中心） */
const MYCOACH = [
  { id: 'daozha', last: '今天 09:12', cnt: 14, score: 86, prog: 72 },
  { id: 'fire', last: '3 天前', cnt: 2, score: 7, prog: 40 }
];
/* 本人已提交、等待本单位开通的教练（教练中心里申请，工作台看进度） */
const COACH_APPLY = [
  { id: 'term',  at: '9月5日 提交', st: '培训专责审核中' },
  { id: 'angui', at: '9月1日 提交', st: '已通过 · 待配置账号' }
];

/* ---- 由 SESSIONS 推导的聚合（保证各图表数字一致） ---- */
function homeAgg() {
  const byDay = {};                      // 天 → {min, cnt}
  SESSIONS.forEach(s => { (byDay[s.d] = byDay[s.d] || { min: 0, cnt: 0 }); byDay[s.d].min += s.dur; byDay[s.d].cnt += 1; });
  const planCnt = {};                    // 练习方式 → 场次
  SESSIONS.forEach(s => { const k = s.plan.startsWith('专项') ? '专项练习' : s.plan.startsWith('分段') ? '分段练习' : s.plan.startsWith('完整') ? '完整操作票' : '错题重练'; planCnt[k] = (planCnt[k] || 0) + 1; });
  const weeks = [0, 0, 0, 0, 0], reds = [0, 0, 0, 0, 0];   // 近5周扣分/红线（w0=最近一周）
  SESSIONS.forEach(s => {
    const w = Math.min(4, Math.floor(s.d / 7));
    s.vio.forEach(v => { weeks[w] += v.lv === 'red' ? 10 : v.lv === 'major' ? 5 : 2; if (v.lv === 'red') reds[w] += 1; });
  });
  const totalMin = SESSIONS.reduce((a, s) => a + s.dur, 0);
  const avg = Math.round(SESSIONS.reduce((a, s) => a + s.score, 0) / SESSIONS.length);
  return { byDay, planCnt, weeks, reds, totalMin, avg, cnt: SESSIONS.length };
}

function dayLabel(d) {                   // 距今 d 天 → M/D
  const t = new Date(Date.now() - d * 864e5);
  return `${t.getMonth() + 1}/${t.getDate()}`;
}
function dateAfter(days) {
  const t = new Date(Date.now() + days * 864e5);
  return `${t.getMonth() + 1}月${t.getDate()}日`;
}

/* ===== 学员成长地图（驾驶舱中心件）：节点与流向边，全部由既有数据推导 ===== */
const GROWTH_NODES = [
  { id: 'g1', x: 85,  y: 505, s: 'done',   t: '岗前培训',          v: '已完成' },
  { id: 'g2', x: 215, y: 435, s: 'done',   t: '安规考试',          v: '92 分' },
  { id: 'g3', x: 345, y: 365, s: 'done',   t: '完整票·教学模式',   v: '已完成' },
  { id: 'g4', x: 465, y: 285, s: 'done',   t: '分段与专项强化',    v: '8 场' },
  { id: 'g5', x: 585, y: 340, s: 'cur',    t: '状态核对与确认·1163 关卡', v: '补强中' },
  { id: 'g6', x: 695, y: 250, s: 'next',   t: '题库考试·考核模式',   v: '' },
  { id: 'g7', x: 800, y: 165, s: 'ahead',  t: '作业授权认证表草稿',  v: '' },
  { id: 'g8', x: 818, y: 88,  s: 'future', t: '作业授权·高级作业员', v: '差距项' },
  { id: 'b1', x: 555, y: 88,  s: 'feed',   t: '年度学时',          v: '68/90' },
  { id: 'b2', x: 425, y: 135, s: 'feed',   t: '实操考试',          v: '' }
];
const GROWTH_EDGES = [
  { d: 'M85,505 C130,478 168,458 215,435',   s: 'done' },
  { d: 'M215,435 C258,412 300,388 345,365',  s: 'done' },
  { d: 'M345,365 C385,338 425,310 465,285',  s: 'done' },
  { d: 'M465,285 C505,303 545,322 585,340',  s: 'done', p: 1 },
  { d: 'M585,340 C620,310 658,278 695,250',  s: 'act',  p: 1 },
  { d: 'M695,250 C730,222 765,192 800,165',  s: 'future' },
  { d: 'M800,165 C812,138 816,112 818,88',   s: 'future' },
  { d: 'M555,88 C640,98 725,125 795,158',    s: 'feed', p: 1 },
  { d: 'M425,135 C550,143 675,150 793,162',  s: 'feed', p: 1 }
];
