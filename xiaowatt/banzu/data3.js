/* ===== 数据层 3：五类画像指标模型 / 履职证据 / 岗位胜任评价 / 职业技能等级 / 九类核心技能 / 班组资质盘点 / 年龄与梯队 / 指标对照（全部脱敏模拟） =====
   本助手不输出绩效等级、不自动打分（需求文档 6.2）：只把台账证据按类别列出来，供班组长绩效沟通时引用。
   岗位胜任评价与技能等级是台账事实的对照，结论一律由班组长确认后使用；每类都写明数据授权、证据、用途、人工复核。 */

const CERT_KINDS = ['高压电工作业证', '岗位胜任能力证', '工作负责人资格', '继电保护作业资格', '电力电缆作业证', '登高架设作业证'];
/* 岗位说明书：各岗位应持资质、应达技能等级、能力图谱底线（配网管理部 2026 版岗位说明书） */
const POST_REQ = {
  '班长': { cert: ['高压电工作业证', '岗位胜任能力证', '工作负责人资格'], skill: '技师', mods: { site: 4, ops: 3, fault: 3 } },
  '技术员': { cert: ['高压电工作业证', '岗位胜任能力证', '工作负责人资格', '继电保护作业资格'], skill: '技师', mods: { relay: 4, scada: 3, fault: 3 } },
  '高级作业员': { cert: ['高压电工作业证', '岗位胜任能力证', '工作负责人资格'], skill: '高级工', mods: { ops: 3, fault: 3, site: 3 } },
  '中级作业员': { cert: ['高压电工作业证', '岗位胜任能力证'], skill: '中级工', mods: { ops: 3, fault: 2, relay: 2 } },
  '初级作业员': { cert: ['高压电工作业证'], skill: '初级工', mods: { ops: 2, site: 2 } }
};
/* 班组按作业需要的持证人数下限（班长与配网管理部 2026-07 定；岗位胜任能力证按评价标准"所有在岗人员（新员工除外）均须取得"） */
const CERT_NEED = { '高压电工作业证': 12, '岗位胜任能力证': 11, '工作负责人资格': 4, '继电保护作业资格': 4, '电力电缆作业证': 3, '登高架设作业证': 6 };
const CERT_WHY = {
  '高压电工作业证': '进入作业现场的准入证，全员必须持有',
  '岗位胜任能力证': '星级班组必备条件：所有在岗人员（新员工除外）须取得对应岗位的岗位技能证书，无缺项、过期、无证上岗',
  '工作负责人资格': '第一种工作票必须由持证人担任负责人；按每天最多 3 张票加轮休备份算下限',
  '继电保护作业资格': '保护定检、定值管理、二次回路作业每组至少 2 人持证加 1 人复核',
  '电力电缆作业证': '交接试验、电缆震荡波与局放试验每组至少 2 人持证加 1 人复核',
  '登高架设作业证': '柱上 FTU 不停电检修与杆上终端作业每组 2 人持证、同时开工 3 组算下限'
};
function postKey(p) { return p.post.replace('副班长 · ', '').replace('（学员）', ''); }
function certHold(kind) { return PEOPLE.filter(p => p.cert.includes(kind)); }

/* ---------- 数据授权 · 证据 · 用途 · 人工复核（每类结论都带这四行） ---------- */
const DISCLOSE = {
  evid: { auth: '违章记录、任务台账、两票台账、缺陷台账、学时台账、成绩记录、师带徒、知识库；均为班组自有台账', ev: '每条证据后标出来自哪张台账，点开可核', use: '供班组长绩效沟通时引用，不出等级、不打分；正式绩效由公司绩效系统承接', review: '班组长逐条核对后使用' },
  post: { auth: '证书台账、能力图谱、成绩记录、实操评分表、违章记录、安全活动台账', ev: '对照岗位说明书四类要求逐项列出实际', use: '识别未达标项并转成培养重点；不用于排名', review: '结论由班组长确认后写入画像，确认人留名' },
  skill: { auth: '技能等级认定台账（局技能鉴定站）、申报条件、成绩记录', ev: '现等级、取得时间、鉴定成绩、本等级年限', use: '判断够不够岗位要求、何时具备申报条件', review: '报名由本人与班组长确认' },
  skill9: { auth: '工作票工作负责人与工作班成员记录、培训台账', ev: '本年实操次数按工作票逐次累计；资格由班长确认', use: '派工时校验能否自主实施；星级评价"人均核心技能实操量"取数', review: '资格变更由班组长确认' }
};

/* ---------- 一、履职证据（替代原"绩效考核等级"）：五类只列证据、不出分数 ---------- */
const EVID_ITEMS = [
  { k: 'safe', n: '安全生产', src: '违章记录 · 安全活动台账' },
  { k: 'task', n: '任务完成', src: '任务台账 · 派工记录 · 关键节点闭环' },
  { k: 'qual', n: '工作质量', src: '两票台账 · 缺陷台账' },
  { k: 'study', n: '学习培训', src: '学时台账 · 成绩记录' },
  { k: 'coop', n: '协同带教', src: '师带徒 · 班组知识库' }
];
const HOURS_DUE = 35;  // 8 月应达学时（60 学时 / 年按月折算）
function evidenceOf(p) {
  const rows = [];
  const vio = VIOLATIONS.filter(v => v.who === p.n);
  rows.push(Object.assign({}, EVID_ITEMS[0], { ev: (vio.length ? vio.map(v => ({ t: v.d + ' ' + v.t + '（' + v.lv + '违章，' + v.fix + '）', s: '违章记录' })) : [{ t: '本年无违章记录', s: '违章记录' }]).concat([{ t: '安全日与事故通报学习参加 ' + SAFETY_ACT.length + ' 次，全勤', s: '安全活动台账' }]) }));
  const mine = DB.taskLedger().filter(t => String(t.who).includes(p.n));
  const done = mine.filter(t => /已完成|已关闭/.test(t.st)).length;
  const late = mine.filter(t => /超期/.test(t.st)).length;
  const over = Math.max(0, p.week - WEEK_LIMIT);
  const nodes = NODES.filter(n => n.a === p.n);
  rows.push(Object.assign({}, EVID_ITEMS[1], { ev: [{ t: '本月参与作业 ' + mine.length + ' 项，完成 ' + done + ' 项' + (late ? '，超期 ' + late + ' 项' : '，无超期'), s: '任务台账' }, { t: nodes.length ? '关键节点 A 责任 ' + nodes.length + ' 项：' + nodes.map(n => n.t).join('、') + '，本周' + (DB.nodesDone().filter(id => nodes.some(n => n.id === id)).length) + ' 项已清' : '本周无关键节点 A 责任', s: '关键节点闭环' }, { t: '本周外勤 ' + p.week + ' 小时' + (over ? '，超出班组约定 ' + over + ' 小时' : '，在班组约定 ' + WEEK_LIMIT + ' 小时内'), s: '工时台账' }] }));
  const tk = DB.tickets().filter(t => t.lead === p.n);
  const bad = tk.filter(t => t.st === '已退回').length;
  const found = DB.defects().filter(d => String(d.src).includes(p.n));
  rows.push(Object.assign({}, EVID_ITEMS[2], { ev: [{ t: tk.length ? ('担任工作负责人 ' + tk.length + ' 张票' + (bad ? '，退回修改 ' + bad + ' 张' : '，无不合格')) : '本月未担任工作负责人', s: '两票台账' }, { t: found.length ? '发现并登记缺陷 ' + found.length + ' 处' : '本月未登记新发现的缺陷', s: '缺陷台账' }, { t: '核心技能本年实操 ' + skill9Of(p).total + ' 次，班组人均 ' + skill9PerCap() + ' 次', s: '工作票 · 实操量' }] }));
  const hs = SCORE_HIST[p.n] || [];
  const avg = hs.length ? Math.round(hs.reduce((s, x) => s + x.s, 0) / hs.length) : null;
  rows.push(Object.assign({}, EVID_ITEMS[3], { ev: [{ t: '年度学时 ' + p.hours.done + '/60，8 月应达 ' + HOURS_DUE + '；本月 ' + p.hours.m + '/5', s: '学时台账' }, { t: hs.length ? '本年考试 ' + hs.length + ' 次，均分 ' + avg + '：' + hs.map(x => x.t + ' ' + x.s).join('、') : '本年尚无考试记录', s: '成绩记录' }, { t: '已学课程 ' + (TRAIN_DONE[p.n] || []).length + '/7 门', s: '培训台账' }] }));
  const men = MENTORS.filter(m => m.m === p.n), stu = MENTORS.find(m => m.s === p.n);
  const cs = CASES.concat(CASES2).filter(a => a.who === p.n);
  const ex = EXPERIENCE.concat(EXPERIENCE2).filter(e => e.who === p.n);
  rows.push(Object.assign({}, EVID_ITEMS[4], { ev: [{ t: men.length ? '带教 ' + men.map(m => m.s + '（' + m.focus + '）').join('、') : stu ? '在' + stu.m + '名下学习，' + stu.focus : '本季度未承担带教', s: '师带徒' }, { t: cs.length ? '贡献典型案例 ' + cs.length + ' 例：' + cs.map(a => a.t).join('、') : '本季度未提交案例', s: '班组知识库' }, { t: ex.length ? '沉淀经验 ' + ex.length + ' 条，被派工 / 培养引用 ' + ex.reduce((s, e) => s + (e.used || 0), 0) + ' 次' : '本季度未沉淀经验条目', s: '班长与骨干经验' }] }));
  return { rows };
}

/* ---------- 二、岗位胜任能力评价（岗评）：四类对照岗位说明书 ---------- */
function postEvalOf(p) {
  const req = POST_REQ[postKey(p)] || POST_REQ['初级作业员']; const lv = PEOPLEPG.lv(p); const rows = [];
  const miss = req.cert.filter(c => !p.cert.includes(c));
  const due = certsDueWithin(90).filter(c => c.who === p.n);
  rows.push({ n: '资质准入', ok: !miss.length, req: '应持 ' + req.cert.join('、'), ev: [{ t: '实持 ' + p.cert.join('、'), s: '证书台账' }].concat(miss.length ? [{ t: '缺 ' + miss.join('、'), s: '证书台账' }] : [], due.length ? [{ t: due.map(c => c.name + ' ' + c.due + ' 到期，还有 ' + daysTo(c.due) + ' 天').join('；'), s: '证书台账' }] : []) });
  const kMiss = Object.keys(req.mods).filter(k => lv[MODS.findIndex(m => m.k === k)] < req.mods[k]);
  rows.push({ n: '专业知识', ok: !kMiss.length, req: Object.keys(req.mods).map(k => MODS.find(m => m.k === k).n + ' ≥ ' + LV[req.mods[k]]).join('、'), ev: Object.keys(req.mods).map(k => { const i = MODS.findIndex(m => m.k === k); return { t: MODS[i].n + ' 现 ' + LV[lv[i]] + '（要求 ' + LV[req.mods[k]] + '）' + (lv[i] < req.mods[k] ? ' ✗' : ''), s: '能力图谱' }; }).concat([{ t: '课程完成 ' + (TRAIN_DONE[p.n] || []).length + '/7 门', s: '培训台账' }]) });
  const sc = LS.get('scores', {})[p.n]; const prac = (SCORE_HIST[p.n] || []).filter(x => /实操/.test(x.t));
  const best = prac.length ? Math.max.apply(null, prac.map(x => x.s)) : (sc ? sc.total : 0);
  const s9 = skill9Of(p);
  rows.push({ n: '技能操作', ok: best >= 80 || s9.a >= 5, req: '实操考核 ≥ 80 分，或九类核心技能可自主实施 ≥ 5 类', ev: (prac.length ? prac.map(x => ({ t: x.d + ' ' + x.t + ' ' + x.s + ' 分', s: '成绩记录' })) : [{ t: '本年无实操考核记录', s: '成绩记录' }]).concat(sc ? [{ t: sc.sheet + ' ' + sc.total + ' 分' + (sc.veto ? '（否决项）' : ''), s: '实操评分表' }] : [], [{ t: '核心技能可自主实施 ' + s9.a + '/9 类，本年实操 ' + s9.total + ' 次', s: '工作票 · 实操量' }]) });
  const vio = VIOLATIONS.filter(v => v.who === p.n);
  rows.push({ n: '安全履职', ok: !vio.some(v => v.lv === '严重'), req: '无严重违章；两票执行规范；安全活动全勤', ev: (vio.length ? vio.map(v => ({ t: v.d + ' ' + v.t + '（' + v.lv + '），处理：' + v.fix, s: '违章记录' })) : [{ t: '本年无违章记录', s: '违章记录' }]).concat([{ t: '安全活动参加 ' + SAFETY_ACT.length + ' 次', s: '安全活动台账' }]) });
  const ok = rows.filter(r => r.ok).length;
  return { rows, ok, n: rows.length, concl: ok === 4 ? '胜任' : ok === 3 ? '基本胜任' : '待提升', req };
}

/* ---------- 三、职业技能等级（技能等级认定台账） ---------- */
const SKILL_LADDER = ['未定级', '初级工', '中级工', '高级工', '技师', '高级技师'];
const SKILLS = {
  '赵立群': { lv: '技师', got: '2021-11', s: 89, by: '局技能鉴定站' }, '韩雪': { lv: '技师', got: '2023-06', s: 91, by: '局技能鉴定站' },
  '黄伟强': { lv: '高级工', got: '2019-09', s: 86, by: '局技能鉴定站' }, '李文博': { lv: '高级工', got: '2022-12', s: 88, by: '局技能鉴定站' },
  '吴倩': { lv: '高级工', got: '2024-05', s: 83, by: '局技能鉴定站' }, '郭子扬': { lv: '中级工', got: '2023-05', s: 81, by: '局技能鉴定站' },
  '赵敏': { lv: '中级工', got: '2022-11', s: 79, by: '局技能鉴定站' }, '王安': { lv: '中级工', got: '2021-06', s: 76, by: '局技能鉴定站' },
  '陈浩': { lv: '初级工', got: '2024-11', s: 78, by: '局技能鉴定站' }, '周明': { lv: '初级工', got: '2025-06', s: 75, by: '局技能鉴定站' },
  '林芷若': { lv: '初级工', got: '2025-06', s: 80, by: '局技能鉴定站' }, '刘一鸣': { lv: '未定级', got: '—', s: 0, by: '—' }
};
/* 素质当量（星级评价"员工技能水平"）：高级技师 1.8 / 技师 1.2 / 高级工 0.7 / 中级工 0.5 / 初级工 0.3 */
const SKILL_EQ = { '高级技师': 1.8, '技师': 1.2, '高级工': 0.7, '中级工': 0.5, '初级工': 0.3, '未定级': 0 };
const SKILL_YRS = { '未定级': 1, '初级工': 3, '中级工': 4, '高级工': 5, '技师': 5 };
function skillOf(p) {
  const s = SKILLS[p.n] || SKILLS['刘一鸣']; const i = SKILL_LADDER.indexOf(s.lv);
  const req = POST_REQ[postKey(p)] || POST_REQ['初级作业员']; const ri = SKILL_LADDER.indexOf(req.skill);
  const held = s.got === '—' ? 0 : +((new Date(TODAY) - new Date(s.got + '-01')) / 31536000000).toFixed(1);
  const need = SKILL_YRS[s.lv] || 5; const next = SKILL_LADDER[Math.min(5, i + 1)];
  return { cur: s.lv, i, got: s.got, score: s.s, by: s.by, held, need, next, can: held >= need, gap: ri - i, reqLv: req.skill };
}
function skillEqAvg() { return +(PEOPLE.reduce((s, p) => s + (SKILL_EQ[(SKILLS[p.n] || {}).lv] || 0), 0) / PEOPLE.length).toFixed(2); }

/* ---------- 四、九类核心技能：资格、实操量、覆盖 ---------- */
function skill9Of(p) { const q = LS.get('skill9', {})[p.n] || {}; const base = SKILLQ[p.n] || { q: SKILL9.map(() => '-'), n: SKILL9.map(() => 0) }; const add = LS.get('skill9n', {})[p.n] || {}; const qs = base.q.map((v, i) => q[SKILL9[i].k] || v); const ns = base.n.map((v, i) => v + (add[SKILL9[i].k] || 0)); return { q: qs, n: ns, a: qs.filter(x => x === 'A').length, b: qs.filter(x => x === 'B').length, total: ns.reduce((s, x) => s + x, 0) }; }
function skillCover() { return SKILL9.map((s, i) => { const a = PEOPLE.filter(p => skill9Of(p).q[i] === 'A'); const b = PEOPLE.filter(p => skill9Of(p).q[i] === 'B'); const n = PEOPLE.reduce((t, p) => t + skill9Of(p).n[i], 0); return { s, a, b, n, risk: a.length <= 2 ? '高' : a.length <= 4 ? '中' : '低' }; }); }
function skill9PerCap() { return +(PEOPLE.reduce((s, p) => s + skill9Of(p).total, 0) / PEOPLE.length).toFixed(1); }
function skill9Low() { const cap = skill9PerCap(); return PEOPLE.filter(p => p.post !== '班长' && !/学员/.test(p.post) && skill9Of(p).total < cap * 0.3); }

/* ---------- 五、班组资质盘点 ---------- */
function certGap() {
  return CERT_KINDS.map(k => {
    const hold = certHold(k), need = CERT_NEED[k], due = certsDueWithin(90).filter(c => c.name === k);
    const lack = Math.max(0, need - hold.length);
    const cand = PEOPLE.filter(p => !p.cert.includes(k) && p.post !== '班长' && p.status !== '休假' && !(k === '岗位胜任能力证' && p.yrs < 1))
      .map(p => ({ p, sc: (p.yrs >= 3 ? 2 : 0) + (p.cert.length >= 2 ? 1 : 0) + (k === '工作负责人资格' && p.yrs >= 8 ? 4 : 0) + (k === '继电保护作业资格' && PEOPLEPG.lv(p)[3] >= 3 ? 4 : 0) + (k === '电力电缆作业证' && (SKILLQ[p.n] || { q: [] }).q[1] === 'A' ? 3 : 0) + (k === '登高架设作业证' ? (p.yrs >= 3 ? 2 : 1) : 0) + (k === '岗位胜任能力证' ? 5 : 0) - (p.age > 35 ? 1 : 0) }))
      .sort((a, b) => b.sc - a.sc).slice(0, lack).map(x => x.p);
    return { k, hold, n: hold.length, need, lack, due, cand, why: CERT_WHY[k] };
  });
}
/* 下次培训重点：资质缺口 + 核心技能覆盖薄弱 + 图谱短板 + 学时落后 */
function trainFocus() {
  const out = []; const gaps = certGap().filter(g => g.lack);
  gaps.forEach(g => out.push({ kind: '取证', t: g.k + ' 取证培训', who: g.cand.map(p => p.n), why: '班组下限 ' + g.need + ' 人，现有 ' + g.n + ' 人，缺 ' + g.lack + ' 人：' + g.why, when: /负责人|继电保护/.test(g.k) ? '9 月局培训班' : '9 月部内取证班' }));
  const weak9 = skillCover().filter(c => c.risk === '高');
  weak9.slice(0, 2).forEach(c => out.push({ kind: '核心技能', t: '「' + c.s.n + '」带教实操', who: c.b.slice(0, 2).map(p => p.n), why: '可自主实施只有 ' + c.a.length + ' 人（' + c.a.map(p => p.n).join('、') + '），一人休假就派不出工；' + c.b.length + ' 人已在带教', when: '9 月随工作票安排' }));
  const avg = MODS.map((m, i) => PEOPLE.reduce((s, p) => s + PEOPLEPG.lv(p)[i], 0) / PEOPLE.length);
  const wi = avg.indexOf(Math.min.apply(null, avg)); const m = MODS[wi]; const c = COURSES.find(c => c.mod === m.k);
  const weak = PEOPLE.filter(p => PEOPLEPG.lv(p)[wi] <= 1).map(p => p.n);
  out.push({ kind: '补短板', t: (c ? '《' + c.n + '》' : m.n) + ' 专项', who: weak, why: '班组"' + m.n + '"均值 L' + avg[wi].toFixed(1) + '，是八个模块里最低的；' + weak.length + ' 人还在 L1', when: '9-20 前理论测试' });
  const lag = PEOPLE.filter(p => p.hours.done < HOURS_DUE).map(p => p.n);
  if (lag.length) out.push({ kind: '补学时', t: '学时补课与线上课程', who: lag, why: '年度学时低于 8 月应达 ' + HOURS_DUE + ' 学时，按现在进度年底到不了 60', when: '每周五下午' });
  return out;
}

/* ---------- 六、年龄结构与梯队（老龄化提前预防） ---------- */
const RETIRE = 60;
const AGE_BANDS = [['≤25 岁', 0, 25], ['26–30 岁', 26, 30], ['31–35 岁', 31, 35], ['36–40 岁', 36, 40], ['41–45 岁', 41, 45], ['46 岁以上', 46, 99]];
function ageStruct() { return AGE_BANDS.map(b => ({ n: b[0], list: PEOPLE.filter(p => p.age >= b[1] && p.age <= b[2]) })); }
function ageAvg(list) { return list.length ? +(list.reduce((s, p) => s + p.age, 0) / list.length).toFixed(1) : 0; }
function certAge() {
  return CERT_KINDS.filter(k => k !== '高压电工作业证' && k !== '岗位胜任能力证').map(k => {
    const hold = certHold(k); const avg = ageAvg(hold); const y5 = hold.filter(p => p.age + 5 >= RETIRE).length;
    const young = hold.filter(p => p.age <= 32).length;
    const risk = hold.length <= 2 ? '高' : (avg >= 38 && young === 0) ? '高' : (avg >= 35 || young <= 1) ? '中' : '低';
    return { k, hold, avg, young, y5, risk, need: CERT_NEED[k] };
  });
}
function ageRisk() {
  const out = []; const ca = certAge();
  ca.filter(c => c.risk === '高').forEach(c => {
    const cand = PEOPLE.filter(p => !p.cert.includes(c.k) && p.age <= 35 && p.yrs >= 3 && p.status !== '休假').sort((a, b) => (b.yrs + (b.cert.includes('岗位胜任能力证') ? 10 : 0)) - (a.yrs + (a.cert.includes('岗位胜任能力证') ? 10 : 0)));
    out.push({ lv: '高', t: c.k + ' 持证人 ' + c.hold.length + ' 人，平均 ' + c.avg + ' 岁', d: '持证人是' + c.hold.map(p => p.n + '（' + p.age + '）').join('、') + (c.young ? '' : '，35 岁以下无人持证') + '。这类作业一旦有人休假或调离就派不出工。', fix: '建议培养 ' + (cand.slice(0, 2).map(p => p.n + '（' + p.age + ' 岁 · ' + p.yrs + ' 年）').join('、') || '暂无符合申报条件的人选') + '，9 月报名取证。', who: cand.slice(0, 2).map(p => p.n) });
  });
  const senior = PEOPLE.filter(p => /高级作业员|班长|技术员/.test(postKey(p)));
  const sAvg = ageAvg(senior);
  const succ = PEOPLE.filter(p => postKey(p) === '中级作业员' && p.yrs >= 7);
  out.push({ lv: sAvg >= 38 ? '中' : '低', t: '骨干层平均 ' + sAvg + ' 岁，' + senior.length + ' 人', d: '班长、技术员与高级作业员是' + senior.map(p => p.n + '（' + p.age + '）').join('、') + '；五年后平均 ' + (sAvg + 5).toFixed(1) + ' 岁' + (senior.filter(p => p.age + 5 >= RETIRE - 5).length ? '，' + senior.filter(p => p.age + 5 >= RETIRE - 5).length + ' 人进入退休前五年' : '，暂无人临近退休，但骨干层整体在上移，补位要从现在开始压担子') + '。', fix: '中级作业员里工龄满 7 年的是' + (succ.map(p => p.n + '（' + p.age + '）').join('、') || '暂无') + '，可作为骨干补位人选，先压担子再报资格。', who: succ.map(p => p.n) });
  const young = PEOPLE.filter(p => p.age <= 30);
  const yNoCert = young.filter(p => p.cert.length <= 1);
  if (yNoCert.length) out.push({ lv: '中', t: '30 岁以下 ' + young.length + ' 人，其中 ' + yNoCert.length + ' 人只有高压电工作业证', d: yNoCert.map(p => p.n + '（' + p.age + ' 岁 · ' + p.yrs + ' 年）').join('、') + ' 只有准入证，没有岗位胜任能力证，能干的活受限，星级评价里也是缺项。', fix: '按工龄先给' + yNoCert.filter(p => p.yrs >= 1).slice(0, 2).map(p => p.n).join('、') + '排岗位胜任能力评价，取证后可独立参加作业。', who: yNoCert.filter(p => p.yrs >= 1).slice(0, 2).map(p => p.n) });
  const key9 = skillCover().filter(c => c.risk === '高' && c.a.length && ageAvg(c.a) >= 36);
  key9.slice(0, 1).forEach(c => out.push({ lv: '高', t: '「' + c.s.n + '」只有 ' + c.a.length + ' 人能自主实施，平均 ' + ageAvg(c.a) + ' 岁', d: '这项是星级评价的完全自主实施类核心技能，能做的人是' + c.a.map(p => p.n + '（' + p.age + '）').join('、') + '，年轻人还没接上。', fix: '把带教中的' + (c.b.map(p => p.n).join('、') || '中级作业员') + '排进这项作业的工作班成员，年内独立完成一次并由负责人签字。', who: c.b.map(p => p.n) }));
  return out;
}
function ageIn(n) { return AGE_BANDS.map(b => PEOPLE.filter(p => p.age + n >= b[1] && p.age + n <= b[2]).length); }

/* ---------- 七、五类画像指标模型 V1（每个指标：来源 / 阈值 / 用途 / 确认人） ---------- */
const FIVE = [
  { k: 'struct', n: '结构健康', d: '班组人还够不够、年龄和梯队接不接得上', items: [
    { n: '缺编率', v: () => Math.round((12 - PEOPLE.filter(p => p.status !== '休假').length) / 12 * 100) + '%', th: '≤10%（星级班组必备条件）', src: '人员名册 · 人员去向', use: '超过阈值触发补员或跨班支援申请', who: '管理者' },
    { n: '30 岁以下占比', v: () => Math.round(PEOPLE.filter(p => p.age <= 30).length / PEOPLE.length * 100) + '%', th: '≥30%', src: '人员名册', use: '低于阈值时人才梯队页给出进人建议', who: '管理者' },
    { n: '骨干层平均年龄', v: () => ageAvg(PEOPLE.filter(p => /高级作业员|班长|技术员/.test(postKey(p)))) + ' 岁', th: '<38 岁；≥38 岁提示补位', src: '人员名册 · 岗位', use: '触发骨干补位人选与压担子计划', who: '班组长' }
  ] },
  { k: 'cert', n: '资质底线', d: '证书够不够派工、有没有临期', items: [
    { n: '岗位胜任能力证覆盖', v: () => certHold('岗位胜任能力证').length + '/' + CERT_NEED['岗位胜任能力证'], th: '在岗人员（新员工除外）100%', src: '证书台账', use: '缺项人员排进取证计划；星级评价必备条件', who: '班组长' },
    { n: '90 天内到期', v: () => certsDueWithin(90).length + ' 人', th: '到期前 30 天完成复审报名', src: '证书台账', use: '提醒本人并报名复审', who: '班组长' },
    { n: '作业下限缺口', v: () => certGap().filter(g => g.lack).length + ' 类', th: '0 类', src: '证书台账 · 作业下限', use: '缺口类别排取证；跨班组时看谁能借', who: '管理者' }
  ] },
  { k: 'skill', n: '能力覆盖', d: '九类核心技能能不能自主实施、实操量够不够', items: [
    { n: '核心技能可自主实施覆盖', v: () => skillCover().filter(c => c.a.length >= 3).length + '/9 类', th: '每类 ≥3 人可自主实施', src: '工作票 · 资格台账', use: '不足的类别排带教实操；派工校验', who: '班组长' },
    { n: '人均核心技能实操量', v: () => skill9PerCap() + ' 次', th: '具备资格者不低于人均 30%', src: '工作票逐次累计', use: '星级评价 3.2.2 取数；低于 30% 的人优先派', who: '管理者' },
    { n: '图谱最弱模块', v: () => { const avg = MODS.map((m, i) => PEOPLE.reduce((s, p) => s + PEOPLEPG.lv(p)[i], 0) / PEOPLE.length); const wi = avg.indexOf(Math.min.apply(null, avg)); return MODS[wi].n.replace('能力', '') + ' L' + avg[wi].toFixed(1); }, th: '均值 ≥ L3', src: '能力图谱（考评定级回写）', use: '排课与带教对象', who: '班组长' }
  ] },
  { k: 'load', n: '工作量公平', d: '活有没有堆在几个人身上', items: [
    { n: '本周超约定人数', v: () => PEOPLE.filter(p => p.week > WEEK_LIMIT).length + ' 人', th: '0 人（每周 ≤24h）', src: '工时台账', use: '派工时避开；下周计划均衡', who: '班组长' },
    { n: '最高与最低工时差', v: () => (Math.max.apply(null, PEOPLE.map(p => p.week)) - Math.min.apply(null, PEOPLE.filter(p => p.post !== '班长' && p.status !== '休假').map(p => p.week))) + ' 小时', th: '≤12 小时', src: '工时台账', use: '超过阈值提示换人', who: '班组长' },
    { n: '连续作业超 3 小时', v: () => DB.progressAll().filter(g => g.warn).length + ' 组', th: '高温期 0 组', src: '现场进度回传', use: '触发轮换通知', who: '班组长' }
  ] },
  { k: 'grow', n: '人才培养与输出', d: '培养有没有在办、人有没有往外输出', items: [
    { n: '培养计划在办', v: () => LS.get('plan', []).length + MENTORS.length + ' 项', th: '每人至少 1 项', src: '培训计划 · 师带徒', use: '缺口识别 → 培养建议 → 结果回写', who: '班组长' },
    { n: '近三年人才输出', v: () => OUTPUT3.length + ' 人', th: '每年 ≥1 人', src: '人员异动台账', use: '管理者看跨班组人才输出与晋升', who: '管理者' },
    { n: '新员工培养周期', v: () => '14 个月', th: '≤18 个月取得岗位胜任能力证', src: '证书台账 · 入职时间', use: '超周期的新员工提级带教', who: '班组长' }
  ] }
];
/* 近三年人才输出 / 晋升 / 跨班锻炼（人员异动台账，虚拟） */
const OUTPUT3 = [
  { n: '孙志远', d: '2024-03', kind: '晋升', to: '配网管理部 技术专责' }, { n: '罗海', d: '2024-11', kind: '输出', to: '试验班 副班长' }, { n: '韩雪', d: '2025-06', kind: '跨班锻炼', to: '配电运维一班 三个月' }, { n: '吴倩', d: '2026-02', kind: '跨班锻炼', to: '试验班 两周（电缆试验）' }
];
/* 指标模型确认记录（三上三下，虚拟人物） */
const CONFIRM_LOG = [
  { d: '2026-07-15', who: '赵立群 · 配电自动化班 班长', what: '第一轮：五类指标、阈值、来源逐条过一遍，改了工作量公平的阈值（每周 24 小时）' },
  { d: '2026-07-22', who: '陈国安 · 配网管理部 主管', what: '第二轮：确认能力覆盖按九类核心技能取数，人均实操量按星级评价口径' },
  { d: '2026-07-29', who: '周小敏 · 数据专责', what: '第三轮：核对每个指标的台账来源与取数字段，确认人写入模型' },
  { d: '2026-08-05', who: '班组全员会', what: '五类指标模型 V1 全员过目，无异议' }
];
function fiveOf() { return FIVE.map(f => ({ k: f.k, n: f.n, d: f.d, items: f.items.map(it => Object.assign({}, it, { val: it.v() })) })); }

/* ---------- 八、班组画像与台账中心的指标对照 ---------- */
function metricMap() {
  const m = DB.month();
  return [
    { n: '本周外勤工时', v: PEOPLE.reduce((s, p) => s + p.week, 0) + ' h', d: '12 人合计，约定每人每周不超过 ' + WEEK_LIMIT + ' h', tab: 'hours', act: 'ch-hours', who: '黄伟强' },
    { n: '证书 90 天内到期', v: certsDueWithin(90).length + ' 人', d: certsDueWithin(90).map(c => c.who).join('、') || '无', tab: 'cert', act: 'six', k: 'cert' },
    { n: '年度学时完成', v: Math.round(PEOPLE.reduce((s, p) => s + p.hours.done / p.hours.req, 0) / PEOPLE.length * 100) + '%', d: PEOPLE.filter(p => p.hours.m < 3).length + ' 人本月未完成', tab: 'study', act: 'six', k: 'hours' },
    { n: '本月任务完成', v: m.jobsDone + '/' + m.jobs, d: '未完成 ' + (m.jobs - m.jobsDone) + ' 项', tab: 'task', act: 'six', k: 'jobs' },
    { n: '两票合格', v: m.ticketsOK + '/' + m.tickets, d: '待审 ' + DB.tickets().filter(t => t.st === '待审').length + ' 张', tab: 'ticket', act: 'six', k: 'jobs' },
    { n: '缺陷闭环', v: m.defectsClosed + '/' + m.defectsFound, d: '未闭环 ' + (m.defectsFound - m.defectsClosed) + ' 处', tab: 'defect', act: 'hz-stage', k: '已关闭' },
    { n: '周报指标 · 在线率', v: WK29.val('online') + '%', d: '全市第 ' + WK29.rank('online') + '，与周报第 29 期一致', tab: 'weekly', act: 'nav' },
    { n: '核心技能实操量', v: skill9PerCap() + ' 次/人', d: skill9Low().length + ' 人低于人均 30%', tab: 'skill9', act: 'nav' }
  ];
}
