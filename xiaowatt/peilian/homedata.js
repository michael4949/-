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
const RADAR_BASE = [86, 64, 88, 80, 72, 78, 68, 84];   // 本月基线（课堂与历史记录口径），陪练关卡结果按 abilityNow() 合入
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

/* 成长档案、首页、组长工作台同用 8 维（旧十维口径并入） */
const DIMS10 = DIMS, RADAR10_PREV = RADAR_PREV, RADAR10_OLD = RADAR_OLD, TEAM_AVG10 = TEAM_AVG;
Object.defineProperty(window, 'RADAR10_NOW', { get: abilityNow });
const DIM10_DESC = Object.fromEntries(ABILITY8.map(a => [a.n, a.d + '。对应专业项目：' + a.items.map(c => c + ' ' + certItem(c).n).join('、')]));

/* 近30天陪练关卡记录（脱敏模拟；本机新记录排在前面）——每条只给情境错误，其余字段按关卡定义推导，保证与复盘页口径一致 */
const HIST_SEED = [
  { d: 1,  exam: 'e1163', mode: 'drill', dur: 14, hints: 1, errs: [{ sid: 'k2_chk', kind: 'miss', text: '检查不完整。就地控制柜已显示合闸，还需要检查机构箱分、合闸指示和刀闸连杆位置。', click: '只看了就地控制柜就下结论', right: '就地控制柜、机构箱、连杆三处一致后再下结论', fix: '三处都看完再判定' }] },
  { d: 4,  exam: 'rain',  mode: 'exam',  dur: 9,  hints: 0, abn: true, errs: [{ sid: 'sC2', kind: 'miss', text: '手动阀未完全开启。', click: '手柄停在 60%', right: '全开位置（≥ 90%）', fix: '继续拖动手柄直到全开' }] },
  { d: 7,  exam: 'e1163', mode: 'teach', dur: 18, hints: 2, errs: [{ sid: 'q1', kind: 'ans', text: '回答要点不全：缺 三相无电流。', click: '因为要看后台和机构箱', right: '后台位置、机构箱机械指示、三相电流三处独立确认，因为开关可能拒动或未到位', fix: '' }] },
  { d: 11, exam: 'rain',  mode: 'drill', dur: 11, hints: 1, errs: [{ sid: 'sA', kind: 'crit', crit: true, text: '该设备不是 #3主变雨淋阀，请重新确认设备编号。', click: '#1主变雨淋阀', right: '#3主变雨淋阀（第三套，编号牌 #3）', fix: '按现场编号牌确认设备对象不选错' }, { sid: 'q0', kind: 'fill', text: '答「控制腔，红」，正确答案是 控制腔，绿。', click: '控制腔，红', right: '控制腔，绿' }] },
  { d: 16, exam: 'e1163', mode: 'teach', dur: 21, hints: 3, red: true, errs: [{ sid: 'k2_hub', kind: 'red', crit: true, text: '未完成两项验电即合上 116340 地刀：一票否决。', click: '直接按住 116340 合闸', right: '后台二次电压、高压带电显示装置两项验电确无电压后再合地刀', fix: '先验电再接地' }] },
  { d: 22, exam: 'e1163', mode: 'teach', dur: 24, hints: 4, errs: [{ sid: 'k1_check', kind: 'read', text: '三相电流读数与后台遥测不一致。', click: '三相电流 312 安', right: 'Ia/Ib/Ic 均为 0.00 A', fix: '' }, { sid: 'q2', kind: 'choice', text: '答「B」，正确答案是 A．两个及以上非同样原理或非同源的指示且均已同时发生变化。', click: 'B', right: 'A' }] },
  { d: 27, exam: 'rain',  mode: 'teach', dur: 15, hints: 3, abn: true, errs: [{ sid: 's0', kind: 'crit', crit: true, text: '未发现雨淋阀压力异常。', click: '控制腔压力正常', right: '压力异常', fix: '指针在绿区为正常，在红区为异常' }] }
];
let __hist = null;
function EXAM_HIST() {
  if (__hist) return __hist;
  __hist = HIST_SEED.map((sd, i) => {
    const ex = EXAMS.find(e => e.id === sd.exam);
    const errs = sd.errs.map(e => { const st = ex.stations.find(x => x.id === e.sid) || {}; return Object.assign({ part: st.part || '', title: st.title || '', rule: st.rule || '', risk: st.risk || '', why: '', fix: '', click: '' }, e); });
    /* 轨迹：出错的情境第一项记错，其余一次做对 */
    const track = ex.stations.filter(st => st.type !== 'auto').map(st => {
      const bad = errs.filter(e => e.sid === st.id);
      const base = st.type === 'quiz' ? st.items.map(it => ({ n: (typeof it.q === 'function' ? it.q({}, it) : it.q).replace(/_+/g, '__'), pts: it.pts || 0 })) : (st.goals || []).map(g => ({ n: g.n, pts: g.pts || 0 }));
      const items = base.map((it, j) => { const w = bad.length && j === 0; const redHere = bad.some(e => e.kind === 'red'); return Object.assign({}, it, { ok: !w, wrong: w ? 1 : 0, hint: 0, got: w ? (redHere ? 0 : +(it.pts * .4).toFixed(2)) : it.pts }); });
      const got = +items.reduce((a, x) => a + x.got, 0).toFixed(2), pts = +items.reduce((a, x) => a + x.pts, 0).toFixed(2);
      return { sid: st.id, part: st.part || '', title: st.title, quiz: st.type === 'quiz', items, got, pts, ratio: pts ? got / pts : (bad.length ? .6 : 1) };
    });
    const raw = +track.reduce((a, t) => a + t.got, 0).toFixed(1);
    const acc = {}; DIMK.forEach(k => acc[k] = { w: 0, v: 0 });
    track.forEach(t => { const st = ex.stations.find(x => x.id === t.sid); if (!st || !st.dims) return; Object.keys(st.dims).forEach(k => { acc[k].w += st.dims[k]; acc[k].v += st.dims[k] * t.ratio; }); });
    const dims = {}; DIMK.forEach(k => { dims[k] = acc[k].w ? Math.round(100 * acc[k].v / acc[k].w) : null; });
    const rec = { id: 'H' + i, ts: Date.now() - sd.d * 864e5 - (i * 37 + 11) * 6e4, who: HOME_USER.name, exam: ex.id, examName: ex.n, short: ex.short, mode: sd.mode, modeName: EXAM_MODES[sd.mode].n, dur: sd.dur, raw, score: sd.red ? 0 : raw, max: ex.max, pass: ex.pass, red: !!sd.red, track, errs, hints: sd.hints || 0, asked: 0, dims, ver: Object.assign(versionStamp(ex.id), { time: stampOf(Date.now() - sd.d * 864e5) }), task: null, reviewer: sd.d > 10 ? '周建国' : '', log: [], mock: true, abn: !!sd.abn };
    rec.sugg = examSugg(rec);
    return rec;
  });
  return __hist;
}
/* 本人全部记录：本机 + 模拟，最近在前 */
function examHist() { return examRecords().filter(r => r.who === HOME_USER.name).concat(EXAM_HIST()).sort((a, b) => b.ts - a.ts); }
function dayOf(r) { return Math.max(0, Math.round((Date.now() - r.ts) / 864e5)); }
function histPct(r) { return r.red ? 0 : Math.round(r.score / r.max * 100); }
/* 成长曲线用的点：得分按百分制，否决记 50 位并标红 */
function histPoints() { return examHist().map(r => ({ id: r.id, d: dayOf(r), score: Math.max(50, histPct(r)), pct: histPct(r), dur: r.dur, vio: (r.errs || []).map(e => ({ lv: e.kind === 'red' ? 'red' : e.crit ? 'major' : 'minor', t: e.text })), hints: Array.from({ length: r.hints || 0 }, () => ['提示', '']), mode: r.modeName, plan: r.short })); }

/* 今日待练任务（班组长下发） */
const HOME_TASK = { exam: 'e1163', mode: 'exam', name: '1163 开关与地刀检查（考核模式）', from: '班组长 周建国', dueDays: 2 };

/* 岗位胜任度构成 */
const FITNESS = {
  pct: 82, post: '变电运行值班员',
  parts: [
    { n: '规程理论考试', v: '92 分', need: '≥ 80 分', ok: true },
    { n: '陪练关卡考核', v: '1 / 2 项及格', need: '2 项考核模式及格', ok: false, gap: '「雨淋阀机械手动启动」考核模式及格' },
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
  { d: 6,  n: '1163 开关与地刀检查（陪练关卡学时）', h: 1, src: '陪练底座回写' },
  { d: 9,  n: '安规（变电部分）年度复训', h: 4, src: '知识课堂' },
  { d: 15, n: '两票管理细则修编解读', h: 2, src: '知识课堂' },
  { d: 23, n: '雨淋阀机械手动启动（陪练关卡学时）', h: 1, src: '陪练底座回写' }
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
    { exam: 'e1163', mode: 'teach', why: '最近一次 1163 关卡「状态核对与确认」用了提示', act: '训练模式复练' }
  ];
}

/* 我在练的教练（工作台窄条，只列本人已开练的；全量目录在教练中心） */
const MYCOACH = [
  { id: 'daozha', last: '昨天', cnt: 4, score: '12.5/15', prog: 72 },
  { id: 'fire', last: '4 天前', cnt: 3, score: '12.2/13.5', prog: 60 }
];
/* 本人已提交、等待本单位开通的教练（教练中心里申请，工作台看进度） */
const COACH_APPLY = [
  { id: 'term',  at: '9月5日 提交', st: '培训专责审核中' },
  { id: 'angui', at: '9月1日 提交', st: '已通过 · 待配置账号' }
];

/* ---- 由陪练关卡记录推导的聚合（保证各图表数字一致） ---- */
function homeAgg() {
  const L = examHist();
  const byDay = {};                      // 天 → {min, cnt}
  L.forEach(r => { const d = dayOf(r); (byDay[d] = byDay[d] || { min: 0, cnt: 0 }); byDay[d].min += r.dur; byDay[d].cnt += 1; });
  const kindCnt = {};                    // 关卡 · 模式 → 次数
  L.forEach(r => { const k = `${r.short} · ${r.modeName.slice(0, 2)}`; kindCnt[k] = (kindCnt[k] || 0) + 1; });
  const weeks = [0, 0, 0, 0, 0], reds = [0, 0, 0, 0, 0];   // 近5周错误权重 / 红线（w0=最近一周）
  L.forEach(r => { const w = Math.min(4, Math.floor(dayOf(r) / 7)); (r.errs || []).forEach(e => { weeks[w] += e.kind === 'red' ? 10 : e.crit ? 5 : 2; if (e.kind === 'red') reds[w] += 1; }); });
  const totalMin = L.reduce((a, r) => a + r.dur, 0);
  const avg = L.length ? Math.round(L.reduce((a, r) => a + histPct(r), 0) / L.length) : 0;
  const passRate = L.length ? Math.round(100 * L.filter(r => !r.red && r.score >= r.pass).length / L.length) : 0;
  return { byDay, kindCnt, weeks, reds, totalMin, avg, cnt: L.length, passRate };
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
  { id: 'g3', x: 345, y: 365, s: 'done',   t: '1163 关卡·训练模式',   v: '已通过' },
  { id: 'g4', x: 465, y: 285, s: 'done',   t: '雨淋阀关卡·演练模式',   v: '2 次' },
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
