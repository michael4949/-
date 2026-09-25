/* ===== 平台数据层：人员 · 两大场景演练记录（本机 + 近30天脱敏模拟）· 九项能力 · 培训任务 =====
   唯一数据源：工作台、评分复盘、成长档案、AI 测评、数据分析、管理视角都从这里取数，保证各处数字一致。
   模拟记录不是手写分数，而是用判卷引擎 / 应急计分对合成答卷实时算出来的（与本机记录同一口径）。 */

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

const LS_TASKS = 'xwt_tasks', LS_GOALS = 'xwt_goals', LS_HOURS = 'xwt_hours', LS_COURSE = 'xwt_course_prog', LS_QUIZ = 'xwt_quiz', LS_PLAN = 'xwt_plan', LS_TEAMREV = 'xwt_team_review';
function lsGet(k, d) { try { return JSON.parse(localStorage.getItem(k) || 'null') || d; } catch (e) { return d; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
function dayLabel(d) { const t = new Date(Date.now() - d * 864e5); return `${t.getMonth() + 1}/${t.getDate()}`; }
function dateAfter(days) { const t = new Date(Date.now() + days * 864e5); return `${t.getMonth() + 1}月${t.getDate()}日`; }
function stampOf(ts) { const t = new Date(ts); return `${t.getMonth() + 1}/${t.getDate()} ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`; }
function tsOf(d) { const t = +new Date(String(d || '').replace(/-/g, '/')); return isNaN(t) ? Date.now() : t; }

/* ---------- 技能水平九项：操作票五项 + 应急处置四项 ---------- */
const SKILL9 = [
  { k: 't1', g: 'tk', n: '操作顺序', d: '开关、刀闸、地刀的先后关系：先转负荷后停主变，先断变低后断变高，先拉主变侧后拉母线侧；组内可换序的边界' },
  { k: 't2', g: 'tk', n: '漏项控制', d: '检查项、安全措施项、二次项逐项写全，不漏写整票不合格项' },
  { k: 't3', g: 'tk', n: '文字规范', d: '双重名称、一栏一个动词、主子项分写，屏柜、压板、空开编号与附表一致' },
  { k: 't4', g: 'tk', n: '危险辨识', d: '识别未验电接地、带负荷拉刀闸、未转负荷即停主变、先断变高等整票不合格情形' },
  { k: 't5', g: 'tk', n: '二次与压板', d: '备自投压板、远方 / 就地把手、刀闸地刀电源与主变控制电源空开的正确处置' },
  { k: 'e1', g: 'em', n: '处置要点完整', d: '按应急处置卡把处置要点逐项答全' },
  { k: 'e2', g: 'em', n: '关键注意事项', d: '能指出事例中违反注意事项的做法（关键得分点）' },
  { k: 'e3', g: 'em', n: '信息报送', d: '电话首报快报现象、缓报原因、7 类重大事件直报分管副总、10 分钟 elink 续报' },
  { k: 'e4', g: 'em', n: '现场急救与自我防护', d: '心肺复苏、止血包扎、先断电先检测再施救等急救与防护要点' }
];
const SK_N = SKILL9.map(x => x.n), SK_K = SKILL9.map(x => x.k);
const SCENE_N = { tk: '操作票填写', em: '应急处置' };
const clamp = v => Math.max(0, Math.min(100, Math.round(v)));

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

/* ---------- 近30天脱敏模拟记录（合成答卷 → 引擎实时计分） ---------- */
const SIM_TK = [[27, 'miss', '训练模式', 1180], [22, 'order', '训练模式', 1030], [16, 'ok', '考核模式', 960], [11, 'text', '考核模式', 870], [6, 'load', '考核模式', 760], [3, 'swap', '考核模式', 820]];
const SIM_EM = [[25, 'heat2', 'part', 540], [20, 'shock', 'key', 610], [18, 'ofire', 'part', 480], [13, 'confined', 'ok', 530], [9, 'quake', 'part', 600], [7, 'efire', 'key', 450], [4, 'injury', 'ok', 560], [1, 'pshock', 'part', 420]];
let __sim = null;
function simRecs() {
  if (__sim) return __sim;
  const base = Date.now();
  const tk = SIM_TK.map(([d, kind, mode, sec], i) => {
    const rows = tkAuto(kind), res = tkJudge(rows);
    const ts = base - d * 864e5 - (3 + i) * 36e5;
    return { id: 'stk' + i, src: 'tk', ts, d: stampOf(ts), n: SCENE_N.tk, sub: '#3主变运行转检修 · 3M负荷转#2主变代供', mode, score: res.score, raw: res.raw, pass: res.pass, fatal: res.fatal, sec, sum: tkSumOf(res), dims: tkDims(res), mock: true, rows: rows.map(r => ({ t: r.t, parent: r.parent })) };
  });
  const em = SIM_EM.map(([d, id, kind, sec], i) => {
    const e = EMGMAP[id], a = emgModel(e, kind), r = emgScore(e, a);
    const ts = base - d * 864e5 - (5 + i) * 36e5;
    return { id: 'sem' + i, src: 'em', ts, d: stampOf(ts), n: SCENE_N.em, sub: e.card + (e.sc ? ' · ' + e.sc : ''), eid: id, mode: i % 3 === 2 ? '考核模式' : '训练模式', score: r.score, pass: r.pass, sec, keyMiss: r.keyMiss, sum: emSumOf(r), dims: r.dims, mock: true, a };
  });
  __sim = tk.concat(em);
  return __sim;
}
function emSumOf(r) {
  const s = [];
  const miss = r.pts.filter(x => x.st !== 'ok').length; if (miss) s.push('处置要点未答全 ' + miss);
  if (r.keyMiss) s.push('关键遗漏 ' + r.keyMiss);
  const rm = r.rep.filter(x => x.st !== 'ok').length; if (rm) s.push('信息报送缺 ' + rm);
  return s;
}

/* ---------- 统一记录：本机 + 模拟，按时间倒序 ---------- */
const __tkc = {};
function localTkRecs() {
  return tkRecords().map((r, i) => {
    const key = r.d + '|' + (r.no || '') + '|' + (r.rows || []).length + '|' + r.score;
    if (!__tkc[key]) { const res = tkJudge(r.rows || []); __tkc[key] = { dims: tkDims(res), sum: tkSumOf(res), raw: res.raw }; }
    const c = __tkc[key];
    return { id: 'ltk' + i, src: 'tk', ts: tsOf(r.d), d: r.d, n: SCENE_N.tk, sub: '票号 ' + (r.no || '未填'), mode: r.mode, score: r.score, raw: c.raw, pass: r.pass, fatal: r.fatal || [], sec: r.sec || 0, sum: c.sum, dims: c.dims, rows: r.rows, li: i };
  });
}
function localEmRecs() {
  return emRecords().map((r, i) => {
    const e = EMGMAP[r.id] || {};
    return { id: 'lem' + i, src: 'em', ts: r.ts || tsOf(r.d), d: r.d, n: SCENE_N.em, sub: (e.card || '') + (e.sc ? ' · ' + e.sc : ''), eid: r.id, mode: r.mode, score: r.score, pass: r.pass, sec: r.sec || 0, keyMiss: r.keyMiss || 0, sum: r.sum || [], dims: r.dims || {}, a: r.a, li: i };
  });
}
function allRecs() { return localTkRecs().concat(localEmRecs()).concat(simRecs()).sort((a, b) => b.ts - a.ts); }
function recById(id) { return allRecs().find(r => r.id === id); }
function dayOf(r) { return Math.max(0, Math.round((Date.now() - r.ts) / 864e5)); }

/* ---------- 九项能力：最近 3 次为本期，再往前 3 次为上期 ---------- */
function abilityCalc() {
  const L = allRecs();
  const pick = (g, k, from, n) => {
    const vs = L.filter(r => r.src === g).slice(from, from + n).map(r => r.dims && r.dims[k]).filter(v => v != null);
    return vs.length ? Math.round(vs.reduce((a, b) => a + b, 0) / vs.length) : null;
  };
  const now = SKILL9.map(s => { const v = pick(s.g, s.k, 0, 3); return v == null ? 0 : v; });
  const prev = SKILL9.map((s, i) => { const v = pick(s.g, s.k, 3, 3); return v == null ? now[i] : v; });
  return { now, prev };
}
function abilityNow() { return abilityCalc().now; }
/* 班组均值（组织级口径，脱敏模拟） */
const TEAM_AVG9 = [80, 82, 76, 84, 72, 78, 70, 58, 74];

/* ---------- 班组（虚拟人物；ab 与 SKILL9 同序；任玲玲取本机 + 模拟实算） ---------- */
const TEAM = [
  { n: '任玲玲', post: '变电运行值班员' },
  { n: '李文博', post: '变电运行值班员', tk: 88, em: 82, cnt: 9, last: 2, danger: 0, keyMiss: 1, ab: [86, 90, 82, 100, 78, 84, 80, 62, 82] },
  { n: '王思远', post: '变电运行主值', tk: 94, em: 90, cnt: 7, last: 4, danger: 0, keyMiss: 0, ab: [92, 94, 88, 100, 90, 90, 92, 80, 88] },
  { n: '张雨桐', post: '变电运行值班员', tk: 72, em: 76, cnt: 11, last: 1, danger: 1, keyMiss: 3, ab: [70, 78, 70, 30, 66, 78, 62, 50, 72] },
  { n: '刘泽宇', post: '变电运行值班员', tk: 58, em: 64, cnt: 3, last: 9, danger: 1, keyMiss: 4, ab: [60, 64, 58, 30, 50, 66, 46, 30, 60] },
  { n: '陈晓萌', post: '变电运行值班员', tk: 84, em: 80, cnt: 8, last: 3, danger: 0, keyMiss: 1, ab: [82, 86, 80, 100, 74, 82, 78, 60, 80] },
  { n: '赵子豪', post: '变电运行值班员', tk: 0, em: 0, cnt: 0, last: -1, danger: 0, keyMiss: 0, ab: null },
  { n: '黄嘉琪', post: '变电运行主值', tk: 90, em: 86, cnt: 6, last: 6, danger: 0, keyMiss: 0, ab: [90, 88, 86, 100, 86, 86, 88, 72, 84] },
  { n: '吴俊杰', post: '变电运行值班员', tk: 66, em: 70, cnt: 7, last: 5, danger: 2, keyMiss: 2, ab: [64, 70, 66, 10, 60, 72, 64, 44, 70] },
  { n: '周淑仪', post: '变电运行值班员', tk: 86, em: 84, cnt: 10, last: 2, danger: 0, keyMiss: 1, ab: [84, 88, 84, 100, 80, 84, 82, 66, 84] }
];
function teamRows() {
  const L = allRecs(), me = abilityNow();
  const tk = L.filter(r => r.src === 'tk'), em = L.filter(r => r.src === 'em');
  const avg = a => a.length ? Math.round(a.reduce((s, r) => s + r.score, 0) / a.length) : 0;
  return TEAM.map(m => m.n !== HOME_USER.name ? m : Object.assign({}, m, {
    tk: avg(tk), em: avg(em), cnt: L.filter(r => dayOf(r) <= 30).length, last: L.length ? dayOf(L[0]) : -1,
    danger: tk.filter(r => (r.fatal || []).length).length, keyMiss: em.reduce((s, r) => s + (r.keyMiss || 0), 0), ab: me
  }));
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
  L.forEach(r => { const k = r.src === 'tk' ? '操作票填写' : '应急 · ' + ((EMG_CAT.find(c => c.k === (EMGMAP[r.eid] || {}).cat) || {}).n || '其他'); kindCnt[k] = (kindCnt[k] || 0) + 1; });
  const totalMin = L.reduce((a, r) => a + Math.round((r.sec || 0) / 60), 0);
  const avg = L.length ? Math.round(L.reduce((a, r) => a + r.score, 0) / L.length) : 0;
  const passRate = L.length ? Math.round(100 * L.filter(r => r.pass).length / L.length) : 0;
  const tk = L.filter(r => r.src === 'tk'), em = L.filter(r => r.src === 'em');
  const scenes = new Set(allRecs().filter(r => r.src === 'em').map(r => r.eid)), cards = new Set(Array.from(scenes).map(id => (EMGMAP[id] || {}).card));
  return { byDay, kindCnt, totalMin, avg, cnt: L.length, passRate, tk, em, danger: tk.filter(r => (r.fatal || []).length).length, keyMiss: em.reduce((s, r) => s + (r.keyMiss || 0), 0), scenes, cards };
}
