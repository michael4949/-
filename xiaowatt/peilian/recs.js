/* ===== 平台数据层：人员 · 六个陪练场景的演练记录（本机 + 近30天脱敏模拟）· 安全能力成熟度（四维度）· 培训任务 =====
   唯一数据源：工作台、评分复盘、成长档案、AI 测评、数据分析、管理视角都从这里取数，保证各处数字一致。
   两票 / 应急的模拟记录不是手写分数，而是用判卷引擎 / 应急计分对合成答卷实时算出来的（与本机记录同一口径）。 */

const HOME_USER = {
  name: '任玲玲', team: '变电运行一班', post: '变电运行值班员', dept: '变电管理一所', join: '2024-08', mentor: '陈志远',
  hours: { done: 68, need: 90 },
  certs: [
    { n: '高压电工作业证', got: '2024-03-18', review: '2027-03-17' },
    { n: '变电站倒闸操作资格', got: '2025-01-10', review: '2026-01-09' }
  ]
};
const LEAD_USER = { name: '周建国', team: '变电运行一班', post: '班组长' };
const ROLE = { cur: 'student' };
const APP_NAME = '安全学习智能陪练', APP_SLOGAN = '一切事故都可以预防';

const LS_TASKS = 'xwt_tasks', LS_GOALS = 'xwt_goals', LS_HOURS = 'xwt_hours', LS_COURSE = 'xwt_course_prog', LS_QUIZ = 'xwt_quiz', LS_PLAN = 'xwt_plan', LS_TEAMREV = 'xwt_team_review', LS_RECS = 'xwt_recs';
function lsGet(k, d) { try { return JSON.parse(localStorage.getItem(k) || 'null') || d; } catch (e) { return d; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
function dayLabel(d) { const t = new Date(Date.now() - d * 864e5); return `${t.getMonth() + 1}/${t.getDate()}`; }
function dateAfter(days) { const t = new Date(Date.now() + days * 864e5); return `${t.getMonth() + 1}月${t.getDate()}日`; }
function stampOf(ts) { const t = new Date(ts); return `${t.getMonth() + 1}/${t.getDate()} ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`; }
function tsOf(d) { const t = +new Date(String(d || '').replace(/-/g, '/')); return isNaN(t) ? Date.now() : t; }
const clamp = v => Math.max(0, Math.min(100, Math.round(v)));

/* ---------- 六个陪练场景 → 四个能力维度 → 安全能力成熟度 ---------- */
const SCENES = [
  { k: 'rule', n: '安规知识陪练', short: '安规', dim: 'kn', sub: '安规考试题库 · 单选 · 多选 · 判断', src: '安规题库判定' },
  { k: 'inst', n: '制度学习陪练', short: '制度', dim: 'kn', sub: '制度文件 → 课件 → 讲课 → 考试', src: '制度考试判定' },
  { k: 'tk', n: '两票填写陪练', short: '两票', dim: 'op', sub: '操作票陪练 · 工作票陪练', src: '操作票判卷结果 · 工作票安全措施判定' },
  { k: 'life', n: '保命技能陪练', short: '保命', dim: 'op', sub: '安规题库保命题型', src: '保命题判定' },
  { k: 'em', n: '应急处置陪练', short: '应急', dim: 'em', sub: '17 类应急处置卡 · 21 个情境', src: '应急处置点评' },
  { k: 'case', n: '案例分析陪练', short: '案例', dim: 'rv', sub: '安规题库小案例 · 大案例 · 班组长推送', src: '案例子题判定' }
];
const SCENE_MAP = {}; SCENES.forEach(s => { SCENE_MAP[s.k] = s; });
const SCENE_N = {}; SCENES.forEach(s => { SCENE_N[s.k] = s.n; });
const DIM4 = [
  { k: 'kn', n: '安全知识能力', short: '安全知识', scenes: ['rule', 'inst'], d: '安规知识陪练、制度学习陪练：安规题库与制度文件的掌握情况' },
  { k: 'op', n: '安全作业能力', short: '安全作业', scenes: ['tk', 'life'], d: '两票填写陪练、保命技能陪练：两票填写规范与保命题型掌握' },
  { k: 'em', n: '应急处置能力', short: '应急处置', scenes: ['em'], d: '应急处置陪练：六类情境的处置要点、事例纠错与信息报送' },
  { k: 'rv', n: '警示复盘能力', short: '警示复盘', scenes: ['case'], d: '案例分析陪练：案例子题的原因分析、违规辨识、责任与措施' }
];
const DIM4_MAP = {}; DIM4.forEach(d => { DIM4_MAP[d.k] = d; });
/* 安全能力成熟度分级（由班组长 / 培训管理员确认后使用） */
const MATURITY_LV = [[90, '精通'], [75, '熟练'], [60, '合格'], [0, '待提升']];
function maturityLv(v) { return v == null ? '待练' : MATURITY_LV.find(x => v >= x[0])[1]; }

/* 各场景指标（雷达项）：k 唯一键，g 场景，n 名称，d 取数口径。10/2 客户意见：每个场景 ≥ 5 个维度，维度按内容分类——
   两票按判卷错误类别；应急按处置卡情境类别；安规 / 保命 / 案例按题库内容类别（gen_bank.py 打标）；制度按制度主题。 */
const SKILLS = [
  { k: 't1', g: 'tk', n: '操作顺序', d: '开关、刀闸、地刀的先后关系：先转负荷后停主变，先断变低后断变高，先拉主变侧后拉母线侧；组内可换序的边界' },
  { k: 't2', g: 'tk', n: '漏项控制', d: '检查项、安全措施项、二次项逐项写全，不漏写整票不合格项' },
  { k: 't3', g: 'tk', n: '文字规范', d: '双重名称、一栏一个动词、主子项分写，屏柜、压板、空开编号与附表一致' },
  { k: 't4', g: 'tk', n: '危险辨识', d: '识别未验电接地、带负荷拉刀闸、未转负荷即停主变、先断变高等整票不合格情形' },
  { k: 't5', g: 'tk', n: '二次与压板', d: '备自投压板、远方 / 就地把手、刀闸地刀电源与主变控制电源空开的正确处置' }
].concat(EMG_CAT.map(c => ({ k: 'em_' + c.k, g: 'em', n: c.n, d: '「' + c.n + '」类应急处置卡情境的处置得分：处置要点 + 事例纠错 + 信息报送（取该类情境最近 3 次）' }))).concat([
  { k: 'r_base', g: 'rule', n: '基本要求与人员条件', d: '安规总则、术语、人员基本条件、安全距离、巡视等条款题的答对率' },
  { k: 'r_ticket', g: 'rule', n: '工作票与许可', d: '工作票填用、签发、许可、监护、间断转移终结等条款题的答对率' },
  { k: 'r_switch', g: 'rule', n: '倒闸操作与防误', d: '操作票、倒闸操作、五防闭锁、双重名称等条款题的答对率' },
  { k: 'r_tech', g: 'rule', n: '保证安全的技术措施', d: '停电、验电、接地、遮栏与标示牌等条款题的答对率' },
  { k: 'r_special', g: 'rule', n: '带电与特殊作业', d: '带电作业、高处、起重、动火、有限空间、试验与二次等条款题的答对率' },
  { k: 'r_emerg', g: 'rule', n: '应急与消防', d: '触电急救、消防灭火、应急处置等条款题的答对率' },
  { k: 'l_dist', g: 'life', n: '安全距离与防触电', d: '保命题型中安全距离、带电体接近、防触电类题目的答对率' },
  { k: 'l_tech', g: 'life', n: '停电验电接地', d: '保命题型中停电、验电、接地、遮栏标示牌类题目的答对率' },
  { k: 'l_ppe', g: 'life', n: '个人防护与工器具', d: '保命题型中安全帽、安全带、绝缘手套、工器具检查类题目的答对率' },
  { k: 'l_high', g: 'life', n: '高处起重与特殊作业', d: '保命题型中高处、起重、有限空间、动火类题目的答对率' },
  { k: 'l_perm', g: 'life', n: '作业许可与监护', d: '保命题型中工作票、许可、监护、擅自作业类题目的答对率' },
  { k: 'l_aid', g: 'life', n: '应急与急救', d: '保命题型中触电急救、灭火、撤离类题目的答对率' },
  { k: 'c_hazard', g: 'case', n: '事故定性与隐患识别', d: '案例子题中事故等级、定性、隐患识别类题目的答对率' },
  { k: 'c_cause', g: 'case', n: '原因分析', d: '案例子题中直接 / 间接原因类题目的答对率' },
  { k: 'c_viol', g: 'case', n: '违规辨识', d: '案例子题中违反条款、违章做法类题目的答对率' },
  { k: 'c_duty', g: 'case', n: '责任与职责', d: '案例子题中责任认定、各岗位职责类题目的答对率' },
  { k: 'c_measure', g: 'case', n: '防范措施与教训', d: '案例子题中防范措施、整改与教训类题目的答对率' },
  { k: 'c_rule', g: 'case', n: '规程依据', d: '案例子题中两票、规程规定类题目的答对率' },
  { k: 'z1', g: 'inst', n: '应急处置条例', d: '《电力安全事故应急处置和调查处理条例》学习与考试得分' },
  { k: 'z2', g: 'inst', n: '隐患判定标准', d: '41 号令与南方电网重大和较大事故隐患判定标准（2026 版）学习与考试得分' },
  { k: 'z3', g: 'inst', n: '安全生产硬措施', d: '国资委十条硬措施与南方电网公司加强安全生产工作硬措施学习与考试得分' },
  { k: 'z4', g: 'inst', n: '有限空间作业', d: '有限空间作业安全管控指引与 GB 46768 学习与考试得分' },
  { k: 'z5', g: 'inst', n: '动火作业', d: '安规配电部分动火作业与安规释义学习与考试得分' },
  { k: 'z6', g: 'inst', n: '高处作业防高坠', d: '高处作业防高坠安全措施图册学习与考试得分' }
]);
const SKILL_MAP = {}; SKILLS.forEach(s => { SKILL_MAP[s.k] = s; });
function skillsOf(g) { return SKILLS.filter(s => s.g === g); }
const SK_K = SKILLS.map(s => s.k);

/* 操作票判卷结果 → 五项 */
const TK_SEC = TICKET.filter(s => /压板|空气开关|把手|屏：|柜：/.test(s.t)).map(s => s.no);
function tkDims(res) {
  const c = res.byKind;
  const secOk = TK_SEC.filter(no => res.pos[no] != null && !res.errs.some(e => e.kind === 'text' && e.stdNo === no)).length;
  return {
    t1: clamp(100 - (c.order || 0) * 12 - (c.cross || 0) * 20),
    t2: clamp(100 - (c.miss || 0) * 6),
    t3: clamp(100 - ((c.text || 0) + (c.level || 0)) * 8),
    t4: res.fatal.length ? (res.fatal.length > 1 ? 10 : 30) : 100,
    t5: clamp(secOk / TK_SEC.length * 100)
  };
}
function tkSumOf(res) { return Object.keys(res.byKind).map(k => ERR_KINDS[k].n + ' ' + res.byKind[k]); }

/* ---------- 近30天脱敏模拟记录 ---------- */
/* 两票 / 应急：合成答卷 → 引擎实时计分 */
const SIM_TK = [[27, 'miss', '训练模式', 1180], [22, 'order', '训练模式', 1030], [16, 'ok', '考核模式', 960], [11, 'text', '考核模式', 870], [6, 'load', '考核模式', 760], [3, 'swap', '考核模式', 820]];
const SIM_EM = [[25, 'heat2', 'part', 540], [20, 'shock', 'key', 610], [18, 'ofire', 'part', 480], [15, 'traffic', 'part', 500], [13, 'confined', 'ok', 530], [9, 'quake', 'part', 600], [7, 'efire', 'key', 450], [4, 'injury', 'ok', 560], [3, 'food', 'ok', 430], [1, 'pshock', 'part', 420]];
/* 其余四个场景：[天前, 场景, 情境, 模式, 用时秒, 各指标得分]（讲师演示台状态清单标注为预设） */
const SIM_NEW = [
  [26, 'rule', '安规 · 保证安全的技术措施 · 8 题', '训练模式', 410, { r_base: 83, r_ticket: 67, r_switch: 100, r_tech: 75, r_special: 80, r_emerg: 100 }],
  [14, 'rule', '安规 · 工作票与许可 · 8 题', '考核模式', 350, { r_base: 100, r_ticket: 83, r_switch: 86, r_tech: 100, r_special: 67, r_emerg: 100 }],
  [5, 'rule', '安规 · 随机 · 8 题', '训练模式', 380, { r_base: 83, r_ticket: 83, r_switch: 82, r_tech: 75, r_special: 71, r_emerg: 100 }],
  [23, 'life', '保命题 · 停电验电接地 · 8 题', '训练模式', 300, { l_dist: 75, l_tech: 60, l_ppe: 100, l_high: 70, l_perm: 80, l_aid: 100 }],
  [8, 'life', '保命题 · 随机 · 8 题', '考核模式', 240, { l_dist: 100, l_tech: 80, l_ppe: 100, l_high: 88, l_perm: 67, l_aid: 100 }],
  [19, 'case', '小案例 · 110kV 线路开关转冷备用误操作', '训练模式', 720, { c_hazard: 75, c_cause: 60, c_viol: 70, c_duty: 50, c_measure: 80, c_rule: 67 }],
  [2, 'case', '大案例 · 220kV 刀闸检修接地线装设', '考核模式', 640, { c_hazard: 80, c_cause: 80, c_viol: 75, c_duty: 67, c_measure: 100, c_rule: 80 }],
  [21, 'inst', '电力重大事故隐患判定标准及治理监督管理规定（41 号令）', '训练模式', 520, { z2: 83 }],
  [16, 'inst', '南方电网公司加强安全生产工作硬措施', '训练模式', 480, { z3: 78 }],
  [10, 'inst', '动火作业相关安规释义', '考核模式', 300, { z5: 100 }],
  [6, 'inst', '电力安全事故应急处置和调查处理条例', '考核模式', 360, { z1: 90 }]
];
let __sim = null;
function simRecs() {
  if (__sim) return __sim;
  const base = Date.now();
  const tk = SIM_TK.map(([d, kind, mode, sec], i) => {
    const rows = tkAuto(kind), res = tkJudge(rows);
    const ts = base - d * 864e5 - (3 + i) * 36e5;
    return { id: 'stk' + i, src: 'tk', ts, d: stampOf(ts), n: SCENE_N.tk, sub: '操作票 · #3主变运行转检修 · 3M负荷转#2主变代供', mode, score: res.score, raw: res.raw, pass: res.pass, fatal: res.fatal, sec, sum: tkSumOf(res), dims: tkDims(res), mock: true, rows: rows.map(r => ({ t: r.t, parent: r.parent })) };
  });
  const em = SIM_EM.map(([d, id, kind, sec], i) => {
    const e = EMGMAP[id], a = emgModel(e, kind), r = emgScore(e, a, sec);
    const ts = base - d * 864e5 - (5 + i) * 36e5;
    return { id: 'sem' + i, src: 'em', ts, d: stampOf(ts), n: SCENE_N.em, sub: e.card + (e.sc ? ' · ' + e.sc : ''), eid: id, mode: i % 3 === 2 ? '考核模式' : '训练模式', score: r.score, pass: r.pass, sec, keyMiss: r.keyMiss, sum: emSumOf(r), dims: r.dims, mock: true, a };
  });
  const nw = SIM_NEW.map(([d, k, sub, mode, sec, dims], i) => {
    const vs = Object.keys(dims).map(x => dims[x]); const score = Math.round(vs.reduce((a, b) => a + b, 0) / vs.length);
    const ts = base - d * 864e5 - (7 + i) * 36e5;
    const low = skillsOf(k).filter(s => dims[s.k] < 70).map(s => s.n + ' ' + dims[s.k]);
    return { id: 'snw' + i, src: k, ts, d: stampOf(ts), n: SCENE_N[k], sub, mode, score, pass: score >= 60, sec, sum: low, dims, mock: true };
  });
  __sim = tk.concat(em).concat(nw);
  return __sim;
}
function emSumOf(r) {
  const s = [];
  const miss = r.pts.filter(x => x.st !== 'ok').length; if (miss) s.push('处置要点未答全 ' + miss);
  if (r.keyMiss) s.push('关键遗漏 ' + r.keyMiss);
  const rm = r.rep.filter(x => x.st !== 'ok').length; if (rm) s.push('信息报送缺 ' + rm);
  if (r.dims.e1 != null && r.dims.e1 < 60) s.push('作答偏慢');
  return s;
}

/* ---------- 统一记录：本机 + 模拟，按时间倒序 ---------- */
const __tkc = {};
function localTkRecs() {
  return tkRecords().map((r, i) => {
    const key = r.d + '|' + (r.no || '') + '|' + (r.rows || []).length + '|' + r.score;
    if (!__tkc[key]) { const res = tkJudge(r.rows || []); __tkc[key] = { dims: tkDims(res), sum: tkSumOf(res), raw: res.raw }; }
    const c = __tkc[key];
    return { id: 'ltk' + i, src: 'tk', ts: tsOf(r.d), d: r.d, n: SCENE_N.tk, sub: '操作票 · 票号 ' + (r.no || '未填'), mode: r.mode, score: r.score, raw: c.raw, pass: r.pass, fatal: r.fatal || [], sec: r.sec || 0, sum: c.sum, dims: c.dims, rows: r.rows, li: i };
  });
}
function localEmRecs() {
  return emRecords().map((r, i) => {
    const e = EMGMAP[r.id] || {};
    return { id: 'lem' + i, src: 'em', ts: r.ts || tsOf(r.d), d: r.d, n: SCENE_N.em, sub: (e.card || '') + (e.sc ? ' · ' + e.sc : ''), eid: r.id, mode: r.mode, score: r.score, pass: r.pass, sec: r.sec || 0, keyMiss: r.keyMiss || 0, sum: r.sum || [], dims: r.dims || {}, a: r.a, sit: r.sit, li: i };
  });
}
/* 其余四个场景的本机记录（各场景引擎提交后写入） */
function localNewRecs() { return lsGet(LS_RECS, []).map((r, i) => Object.assign({ id: 'lnw' + i, n: SCENE_N[r.src] }, r)); }
function recSave(rec) { const a = lsGet(LS_RECS, []); a.unshift(rec); lsSet(LS_RECS, a.slice(0, 80)); }
function allRecs() { return localTkRecs().concat(localEmRecs()).concat(localNewRecs()).concat(simRecs()).sort((a, b) => b.ts - a.ts); }
function recById(id) { return allRecs().find(r => r.id === id); }
function dayOf(r) { return Math.max(0, Math.round((Date.now() - r.ts) / 864e5)); }

/* ---------- 能力测算：场景指标（最近 3 次为本期，再往前 3 次为上期）→ 场景得分 → 四维度 → 成熟度 ---------- */
let __abc = null, __abcN = -1;
function abilityCalc() {
  const L = allRecs();
  if (__abc && __abcN === L.length && __abc.__first === (L[0] || {}).id) return __abc;
  const avg = vs => vs.length ? Math.round(vs.reduce((a, b) => a + b, 0) / vs.length) : null;
  const scene = {};
  SCENES.forEach(s => {
    const R = L.filter(r => r.src === s.k);
    const pick = (k, from, n) => avg(R.slice(from, from + n).map(r => r.dims && r.dims[k]).filter(v => v != null));
    const now = {}, prev = {};
    skillsOf(s.k).forEach(d => { now[d.k] = pick(d.k, 0, 3); const p = pick(d.k, 3, 3); prev[d.k] = p == null ? now[d.k] : p; });
    const nv = Object.keys(now).map(k => now[k]).filter(v => v != null), pv = Object.keys(prev).map(k => prev[k]).filter(v => v != null);
    scene[s.k] = { k: s.k, n: s.n, now, prev, score: avg(nv), prevScore: avg(pv), cnt: R.length, last: R[0] || null, best: R.length ? Math.max.apply(null, R.map(r => r.score)) : null };
  });
  const dim4 = DIM4.map(d => {
    const sc = d.scenes.map(k => scene[k]);
    const vs = sc.map(x => x.score).filter(v => v != null), ps = sc.map(x => x.prevScore).filter(v => v != null);
    return { k: d.k, n: d.n, short: d.short, score: avg(vs), prev: avg(ps), scenes: sc, missing: sc.filter(x => x.score == null).map(x => x.n) };
  });
  const mv = dim4.map(d => d.score).filter(v => v != null), mp = dim4.map(d => d.prev).filter(v => v != null);
  const mat = { pct: avg(mv), prev: avg(mp), lv: maturityLv(avg(mv)), dims: dim4, missing: dim4.filter(d => d.score == null).map(d => d.n) };
  __abc = { scene, dim4, mat, __first: (L[0] || {}).id }; __abcN = L.length;
  return __abc;
}
function sceneScore(k) { return abilityCalc().scene[k]; }
function maturity() { return abilityCalc().mat; }
/* 所有指标按本期得分升序（没练过的场景的指标记 0，标 none），用于推荐与短板 */
function weakOrder() {
  const A = abilityCalc();
  return SKILLS.map(s => { const v = A.scene[s.g].now[s.k]; return { s, k: s.k, g: s.g, n: s.n, v: v == null ? 0 : v, none: v == null }; }).sort((a, b) => a.v - b.v || (a.none ? -1 : 1));
}
/* 班组均值（组织级口径，脱敏模拟） */
function teamAvgOf() {
  const T = teamRows().filter(m => m.sc);
  const avg = f => Math.round(T.reduce((a, m) => a + f(m), 0) / (T.length || 1));
  const sc = {}; SCENES.forEach(s => { sc[s.k] = avg(m => m.sc[s.k] || 0); });
  const dim = {}; DIM4.forEach(d => { dim[d.k] = avg(m => m.dim4[d.k] || 0); });
  const dims = {}; SKILLS.forEach(s => { dims[s.k] = avg(m => (m.dims || {})[s.k] || 0); });
  return { sc, dim, dims, mat: avg(m => m.mat || 0) };
}

/* ---------- 班组（虚拟人物；sc 为六场景得分，指标由场景得分派生） ---------- */
const TEAM = [
  { n: '任玲玲', post: '变电运行值班员' },
  { n: '李文博', post: '变电运行值班员', sc: { tk: 88, em: 82, rule: 84, life: 80, case: 76, inst: 86 }, cnt: 9, last: 2, danger: 0, keyMiss: 1 },
  { n: '王思远', post: '变电运行主值', sc: { tk: 94, em: 90, rule: 92, life: 90, case: 88, inst: 91 }, cnt: 7, last: 4, danger: 0, keyMiss: 0 },
  { n: '张雨桐', post: '变电运行值班员', sc: { tk: 72, em: 76, rule: 70, life: 74, case: 62, inst: 78 }, cnt: 11, last: 1, danger: 1, keyMiss: 3 },
  { n: '刘泽宇', post: '变电运行值班员', sc: { tk: 58, em: 64, rule: 60, life: 55, case: 50, inst: 66 }, cnt: 3, last: 9, danger: 1, keyMiss: 4 },
  { n: '陈晓萌', post: '变电运行值班员', sc: { tk: 84, em: 80, rule: 82, life: 78, case: 74, inst: 85 }, cnt: 8, last: 3, danger: 0, keyMiss: 1 },
  { n: '赵子豪', post: '变电运行值班员', sc: null, cnt: 0, last: -1, danger: 0, keyMiss: 0 },
  { n: '黄嘉琪', post: '变电运行主值', sc: { tk: 90, em: 86, rule: 88, life: 86, case: 82, inst: 89 }, cnt: 6, last: 6, danger: 0, keyMiss: 0 },
  { n: '吴俊杰', post: '变电运行值班员', sc: { tk: 66, em: 70, rule: 64, life: 60, case: 58, inst: 70 }, cnt: 7, last: 5, danger: 2, keyMiss: 2 },
  { n: '周淑仪', post: '变电运行值班员', sc: { tk: 86, em: 84, rule: 86, life: 82, case: 80, inst: 88 }, cnt: 10, last: 2, danger: 0, keyMiss: 1 }
];
function dimsFromScene(sc, seed) {
  const dims = {}; SKILLS.forEach((s, i) => { const base = sc[s.g]; if (base == null) return; const off = ((seed * 7 + i * 13) % 17) - 8; dims[s.k] = clamp(base + off); });
  return dims;
}
function dim4FromScene(sc) { const o = {}; DIM4.forEach(d => { const vs = d.scenes.map(k => sc[k]).filter(v => v != null); o[d.k] = vs.length ? Math.round(vs.reduce((a, b) => a + b, 0) / vs.length) : null; }); return o; }
function teamRows() {
  const L = allRecs(), A = abilityCalc();
  return TEAM.map((m, i) => {
    if (m.n !== HOME_USER.name) {
      if (!m.sc) return Object.assign({}, m, { dims: null, dim4: null, mat: null });
      const dim4 = dim4FromScene(m.sc); const vs = Object.keys(dim4).map(k => dim4[k]).filter(v => v != null);
      return Object.assign({}, m, { dims: dimsFromScene(m.sc, i), dim4, mat: Math.round(vs.reduce((a, b) => a + b, 0) / vs.length) });
    }
    const sc = {}; SCENES.forEach(s => { sc[s.k] = A.scene[s.k].score; });
    const dims = {}; SKILLS.forEach(s => { dims[s.k] = A.scene[s.g].now[s.k]; });
    const dim4 = {}; A.dim4.forEach(d => { dim4[d.k] = d.score; });
    const tk = L.filter(r => r.src === 'tk'), em = L.filter(r => r.src === 'em');
    return Object.assign({}, m, { sc, dims, dim4, mat: A.mat.pct, cnt: L.filter(r => dayOf(r) <= 30).length, last: L.length ? dayOf(L[0]) : -1, danger: tk.filter(r => (r.fatal || []).length).length, keyMiss: em.reduce((s, r) => s + (r.keyMiss || 0), 0) });
  });
}

/* ---------- 培训任务：班组长下发 → 学员完成 → 成绩回写 ---------- */
const HOME_TASK = { id: 'seed', scene: 'tk', target: '', targetN: '#3主变运行转检修操作票', mode: 'exam', from: '班组长 周建国', dueDays: 2, note: '考核模式，及格 60 分' };
function taskList() { return lsGet(LS_TASKS, []); }
function myTodo() { return taskList().filter(t => (!t.who || !t.who.length || t.who.includes(HOME_USER.name)) && !(t.results || []).some(r => r.who === HOME_USER.name)); }
/* 学员提交一次演练后，回写到第一条匹配的未完成任务 */
function taskHit(src, eid, score, pass) {
  const L = taskList(); const t = L.find(x => x.scene === src && (!x.target || x.target === eid) && (!x.who || !x.who.length || x.who.includes(HOME_USER.name)) && !(x.results || []).some(r => r.who === HOME_USER.name));
  if (!t) return null;
  t.results = (t.results || []).concat([{ who: HOME_USER.name, score, pass, ts: Date.now() }]);
  lsSet(LS_TASKS, L); return t;
}

/* ---------- 聚合（工作台、复盘、档案共用） ---------- */
function homeAgg() {
  const L = allRecs().filter(r => dayOf(r) <= 30);
  const byDay = {}; L.forEach(r => { const d = dayOf(r); (byDay[d] = byDay[d] || { min: 0, cnt: 0 }); byDay[d].min += Math.max(1, Math.round((r.sec || 0) / 60)); byDay[d].cnt += 1; });
  const kindCnt = {};
  L.forEach(r => { const k = SCENE_N[r.src] || r.src; kindCnt[k] = (kindCnt[k] || 0) + 1; });
  const totalMin = L.reduce((a, r) => a + Math.round((r.sec || 0) / 60), 0);
  const avg = L.length ? Math.round(L.reduce((a, r) => a + r.score, 0) / L.length) : 0;
  const passRate = L.length ? Math.round(100 * L.filter(r => r.pass).length / L.length) : 0;
  const tk = L.filter(r => r.src === 'tk'), em = L.filter(r => r.src === 'em');
  const scenes = new Set(allRecs().filter(r => r.src === 'em').map(r => r.eid)), cards = new Set(Array.from(scenes).map(id => (EMGMAP[id] || {}).card));
  const played = new Set(allRecs().map(r => r.src));
  return { byDay, kindCnt, totalMin, avg, cnt: L.length, passRate, tk, em, danger: tk.filter(r => (r.fatal || []).length).length, keyMiss: em.reduce((s, r) => s + (r.keyMiss || 0), 0), scenes, cards, played };
}
