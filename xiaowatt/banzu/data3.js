/* ===== 数据层 3：绩效考核 / 岗位胜任评价 / 职业技能等级 / 班组资质盘点 / 年龄与梯队（全部脱敏模拟） =====
   三类等级的分值与结论从台账推导：违章记录、任务台账、两票台账、缺陷台账、学时台账、成绩记录、师带徒、班组知识库。
   台账变了这三类评级跟着变；所有结论标注由班组长确认后使用。 */

const CERT_KINDS = ['高压电工证', '登高作业证', '工作负责人资格', '带电作业资格', '电缆试验作业证'];
/* 岗位说明书：各岗位应持资质、应达技能等级、能力图谱底线（所里 2026 版岗位说明书） */
const POST_REQ = {
  '班长': { cert: ['高压电工证', '工作负责人资格'], skill: '技师', mods: { site: 4, ops: 3, fault: 3 } },
  '高级作业员': { cert: ['高压电工证', '登高作业证', '工作负责人资格'], skill: '高级工', mods: { ops: 3, fault: 3, site: 3 } },
  '中级作业员': { cert: ['高压电工证', '登高作业证'], skill: '中级工', mods: { ops: 3, fault: 2, relay: 2 } },
  '初级作业员': { cert: ['高压电工证'], skill: '初级工', mods: { ops: 2, site: 2 } }
};
/* 班组按作业需要的持证人数下限（赵立群与所里 2026-07 定） */
const CERT_NEED = { '高压电工证': 12, '登高作业证': 8, '工作负责人资格': 4, '带电作业资格': 3, '电缆试验作业证': 3 };
const CERT_WHY = {
  '高压电工证': '进入作业现场的准入证，全员必须持有',
  '登高作业证': '杆上作业、绝缘子与拉线更换必须持证，按每组 2 人、同时开工 4 组算下限',
  '工作负责人资格': '第一种工作票必须由持证人担任负责人；按每天最多 3 张票加轮休备份算下限',
  '带电作业资格': '带电检测与带电作业每组至少 2 人持证加 1 人监护',
  '电缆试验作业证': '电缆振荡波与局放试验每组至少 2 人持证加 1 人复核'
};
function postKey(p) { return p.post.replace('副班长 · ', '').replace('（学员）', ''); }
function certHold(kind) { return PEOPLE.filter(p => p.cert.includes(kind)); }

/* ---------- 一、绩效考核（季度）：五类考核内容，权重合计 100 ---------- */
const PERF_ITEMS = [
  { k: 'safe', n: '安全生产', w: 30, src: '违章记录 · 安全活动台账', std: '本季度无违章、无事故；安全日与事故通报学习按时参加' },
  { k: 'task', n: '任务完成', w: 25, src: '任务台账 · 派工记录', std: '派工任务按期完成；抢修与消缺响应及时' },
  { k: 'qual', n: '工作质量', w: 20, src: '两票台账 · 缺陷台账', std: '两票无不合格；巡视发现缺陷并跟踪闭环' },
  { k: 'study', n: '学习培训', w: 15, src: '学时台账 · 成绩记录', std: '年度学时按月进度完成；理论与实操考试合格' },
  { k: 'coop', n: '协同创新', w: 10, src: '师带徒 · 班组知识库', std: '承担带教、贡献经验或案例、提合理化建议' }
];
const PERF_LV = [[90, '优秀'], [80, '良好'], [70, '合格'], [0, '待改进']];
const HOURS_DUE = 40;  // 9 月应达学时（60 学时 / 年按月折算）

function perfOf(p) {
  const rows = [];
  /* 安全生产：违章扣分，安全活动出勤 */
  const vio = VIOLATIONS.filter(v => v.who === p.n);
  const vcut = vio.reduce((s, v) => s + (v.lv === '严重' ? 30 : 12), 0);
  rows.push(Object.assign({}, PERF_ITEMS[0], { v: Math.max(0, 100 - vcut), ev: (vio.length ? vio.map(v => ({ t: v.d + ' ' + v.t + '（' + v.lv + '违章，扣 ' + (v.lv === '严重' ? 30 : 12) + '）', s: '违章记录' })) : [{ t: '本年无违章记录', s: '违章记录' }]).concat([{ t: '安全日与事故通报学习参加 ' + SAFETY_ACT.length + ' 次，全勤', s: '安全活动台账' }]) }));
  /* 任务完成：本月任务台账里他参与的行 */
  const mine = DB.taskLedger().filter(t => String(t.who).includes(p.n));
  const done = mine.filter(t => /已完成|已关闭/.test(t.st)).length;
  const late = mine.filter(t => /超期/.test(t.st)).length;
  const over = Math.max(0, p.week - WEEK_LIMIT);
  rows.push(Object.assign({}, PERF_ITEMS[1], { v: Math.max(0, (mine.length ? Math.round(done / mine.length * 100) - late * 10 : 88) - (over ? 8 : 0)), ev: [{ t: '本月参与作业 ' + mine.length + ' 项，完成 ' + done + ' 项' + (late ? '，超期 ' + late + ' 项（每项扣 10）' : '，无超期'), s: '任务台账' }, { t: '本周外勤 ' + p.week + ' 小时' + (over ? '，超出班组约定 ' + over + ' 小时（扣 8，工时不是越多越好）' : '，在班组约定 ' + WEEK_LIMIT + ' 小时内'), s: '工时台账' }] }));
  /* 工作质量：担任负责人的票 + 发现的缺陷 */
  const tk = DB.tickets().filter(t => t.lead === p.n);
  const bad = tk.filter(t => t.st === '已退回').length;
  const found = DB.defects().filter(d => String(d.src).includes(p.n));
  rows.push(Object.assign({}, PERF_ITEMS[2], { v: Math.max(0, 88 - bad * 15 + Math.min(12, found.length * 6)), ev: [{ t: tk.length ? ('担任工作负责人 ' + tk.length + ' 张票' + (bad ? '，退回修改 ' + bad + ' 张（每张扣 15）' : '，无不合格')) : '本月未担任工作负责人', s: '两票台账' }, { t: found.length ? '巡视发现缺陷 ' + found.length + ' 处：' + found.map(d => d.t.split(' ').slice(0, 2).join(' ')).join('、') + '（每处加 6）' : '本月未登记新发现的缺陷', s: '缺陷台账' }] }));
  /* 学习培训：学时进度 + 考试成绩 */
  const hs = SCORE_HIST[p.n] || [];
  const avg = hs.length ? Math.round(hs.reduce((s, x) => s + x.s, 0) / hs.length) : null;
  const hp = Math.round(p.hours.done / HOURS_DUE * 100);
  rows.push(Object.assign({}, PERF_ITEMS[3], { v: Math.max(0, Math.min(100, Math.round(hp * 0.6 + (avg == null ? 75 : avg) * 0.4))), ev: [{ t: '年度学时 ' + p.hours.done + '/60，9 月应达 ' + HOURS_DUE + '，完成率 ' + hp + '%；本月 ' + p.hours.m + '/5', s: '学时台账' }, { t: hs.length ? '本年考试 ' + hs.length + ' 次，均分 ' + avg + '：' + hs.map(x => x.t + ' ' + x.s).join('、') : '本年尚无考试记录', s: '成绩记录' }, { t: '已学课程 ' + (TRAIN_DONE[p.n] || []).length + '/7 门', s: '培训台账' }] }));
  /* 协同创新：带教 + 案例 + 经验 */
  const men = MENTORS.filter(m => m.m === p.n), stu = MENTORS.find(m => m.s === p.n);
  const cs = CASES.concat(CASES2).filter(a => a.who === p.n);
  const ex = EXPERIENCE.concat(EXPERIENCE2).filter(e => e.who === p.n);
  rows.push(Object.assign({}, PERF_ITEMS[4], { v: Math.min(100, 60 + men.length * 20 + cs.length * 10 + ex.length * 10), ev: [{ t: men.length ? '带教 ' + men.map(m => m.s + '（' + m.focus + '）').join('、') : stu ? '在' + stu.m + '名下学习，' + stu.focus : '本季度未承担带教', s: '师带徒' }, { t: cs.length ? '贡献典型案例 ' + cs.length + ' 例：' + cs.map(a => a.t).join('、') : '本季度未提交案例', s: '班组知识库' }, { t: ex.length ? '沉淀经验 ' + ex.length + ' 条：' + ex.map(e => e.t).join('、') : '本季度未沉淀经验条目', s: '班长与骨干经验' }] }));
  const total = Math.round(rows.reduce((s, r) => s + r.v * r.w, 0) / 100);
  const lv = PERF_LV.find(x => total >= x[0])[1];
  return { rows, total, lv };
}

/* ---------- 二、岗位胜任能力评价（岗评）：四类对照岗位说明书 ---------- */
function postEvalOf(p) {
  const req = POST_REQ[postKey(p)] || POST_REQ['初级作业员']; const lv = PEOPLEPG.lv(p); const rows = [];
  /* 1 资质准入 */
  const miss = req.cert.filter(c => !p.cert.includes(c));
  const due = certsDueWithin(90).filter(c => c.who === p.n);
  rows.push({ n: '资质准入', ok: !miss.length, req: '应持 ' + req.cert.join('、'), ev: [{ t: '实持 ' + p.cert.join('、'), s: '证书台账' }].concat(miss.length ? [{ t: '缺 ' + miss.join('、'), s: '证书台账' }] : [], due.length ? [{ t: due.map(c => c.name + ' ' + c.due + ' 到期，还有 ' + daysTo(c.due) + ' 天').join('；'), s: '证书台账' }] : []) });
  /* 2 专业知识 */
  const kMiss = Object.keys(req.mods).filter(k => lv[MODS.findIndex(m => m.k === k)] < req.mods[k]);
  rows.push({ n: '专业知识', ok: !kMiss.length, req: Object.keys(req.mods).map(k => MODS.find(m => m.k === k).n + ' ≥ ' + LV[req.mods[k]]).join('、'), ev: Object.keys(req.mods).map(k => { const i = MODS.findIndex(m => m.k === k); return { t: MODS[i].n + ' 现 ' + LV[lv[i]] + '（要求 ' + LV[req.mods[k]] + '）' + (lv[i] < req.mods[k] ? ' ✗' : ''), s: '能力图谱' }; }).concat([{ t: '课程完成 ' + (TRAIN_DONE[p.n] || []).length + '/7 门', s: '培训台账' }]) });
  /* 3 技能操作 */
  const sc = LS.get('scores', {})[p.n]; const prac = (SCORE_HIST[p.n] || []).filter(x => /实操/.test(x.t));
  const best = prac.length ? Math.max.apply(null, prac.map(x => x.s)) : (sc ? sc.total : 0);
  rows.push({ n: '技能操作', ok: best >= 80, req: '实操考核 ≥ 80 分，能独立完成本岗位典型作业', ev: (prac.length ? prac.map(x => ({ t: x.d + ' ' + x.t + ' ' + x.s + ' 分', s: '成绩记录' })) : [{ t: '本年无实操考核记录', s: '成绩记录' }]).concat(sc ? [{ t: sc.sheet + ' ' + sc.total + ' 分' + (sc.veto ? '（否决项）' : ''), s: '实操评分表' }] : []) });
  /* 4 安全履职 */
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
/* 申报条件：取得下一等级需要的本等级年限（技能等级认定管理办法 · 申报条件） */
const SKILL_YRS = { '未定级': 1, '初级工': 3, '中级工': 4, '高级工': 5, '技师': 5 };
function skillOf(p) {
  const s = SKILLS[p.n] || SKILLS['刘一鸣']; const i = SKILL_LADDER.indexOf(s.lv);
  const req = POST_REQ[postKey(p)] || POST_REQ['初级作业员']; const ri = SKILL_LADDER.indexOf(req.skill);
  const held = s.got === '—' ? 0 : +((new Date(TODAY) - new Date(s.got + '-01')) / 31536000000).toFixed(1);
  const need = SKILL_YRS[s.lv] || 5; const next = SKILL_LADDER[Math.min(5, i + 1)];
  return { cur: s.lv, i, got: s.got, score: s.s, by: s.by, held, need, next, can: held >= need, gap: ri - i, reqLv: req.skill };
}

/* ---------- 四、班组资质盘点 ---------- */
function certGap() {
  return CERT_KINDS.map(k => {
    const hold = certHold(k), need = CERT_NEED[k], due = certsDueWithin(90).filter(c => c.name === k);
    const lack = Math.max(0, need - hold.length);
    const cand = PEOPLE.filter(p => !p.cert.includes(k) && p.post !== '班长' && p.status !== '休假')
      .map(p => ({ p, sc: (p.yrs >= 3 ? 2 : 0) + (p.cert.length >= 2 ? 1 : 0) + (k === '工作负责人资格' && p.cert.includes('登高作业证') && p.yrs >= 8 ? 4 : 0) + (k === '带电作业资格' && p.cert.includes('登高作业证') && p.yrs >= 5 ? 3 : 0) + (k === '登高作业证' ? p.yrs >= 3 ? 2 : 1 : 0) - (p.age > 35 ? 1 : 0) }))
      .sort((a, b) => b.sc - a.sc).slice(0, lack).map(x => x.p);
    return { k, hold, n: hold.length, need, lack, due, cand, why: CERT_WHY[k] };
  });
}
/* 下次培训重点：资质缺口 + 图谱短板 + 学时落后，三项合并 */
function trainFocus() {
  const out = []; const gaps = certGap().filter(g => g.lack);
  gaps.forEach(g => out.push({ kind: '取证', t: g.k + ' 取证培训', who: g.cand.map(p => p.n), why: '班组下限 ' + g.need + ' 人，现有 ' + g.n + ' 人，缺 ' + g.lack + ' 人：' + g.why, when: g.k === '工作负责人资格' ? '10 月局培训班' : '10 月所内取证班' }));
  const avg = MODS.map((m, i) => PEOPLE.reduce((s, p) => s + PEOPLEPG.lv(p)[i], 0) / PEOPLE.length);
  const wi = avg.indexOf(Math.min.apply(null, avg)); const m = MODS[wi]; const c = COURSES.find(c => c.mod === m.k);
  const weak = PEOPLE.filter(p => PEOPLEPG.lv(p)[wi] <= 1).map(p => p.n);
  out.push({ kind: '补短板', t: (c ? '《' + c.n + '》' : m.n) + ' 专项', who: weak, why: '班组"' + m.n + '"均值 L' + avg[wi].toFixed(1) + '，是八个模块里最低的；' + weak.length + ' 人还在 L1', when: '10-20 前理论测试' });
  const lag = PEOPLE.filter(p => p.hours.done < HOURS_DUE).map(p => p.n);
  if (lag.length) out.push({ kind: '补学时', t: '学时补课与线上课程', who: lag, why: '年度学时低于 9 月应达 ' + HOURS_DUE + ' 学时，按现在进度年底到不了 60', when: '每周五下午' });
  return out;
}

/* ---------- 五、年龄结构与梯队（老龄化提前预防） ---------- */
const RETIRE = 60;  // 生产岗位退休年龄
const AGE_BANDS = [['≤25 岁', 0, 25], ['26–30 岁', 26, 30], ['31–35 岁', 31, 35], ['36–40 岁', 36, 40], ['41–45 岁', 41, 45], ['46 岁以上', 46, 99]];
function ageStruct() { return AGE_BANDS.map(b => ({ n: b[0], list: PEOPLE.filter(p => p.age >= b[1] && p.age <= b[2]) })); }
function ageAvg(list) { return list.length ? +(list.reduce((s, p) => s + p.age, 0) / list.length).toFixed(1) : 0; }
/* 关键资质持有人的年龄结构：持证人越少、越集中在高年龄段，断层风险越高 */
function certAge() {
  return CERT_KINDS.filter(k => k !== '高压电工证').map(k => {
    const hold = certHold(k); const avg = ageAvg(hold); const y5 = hold.filter(p => p.age + 5 >= RETIRE).length;
    const young = hold.filter(p => p.age <= 32).length;
    const risk = hold.length <= 2 ? '高' : (avg >= 38 && young === 0) ? '高' : (avg >= 35 || young <= 1) ? '中' : '低';
    return { k, hold, avg, young, y5, risk, need: CERT_NEED[k] };
  });
}
/* 梯队与断层：按岗位层级看年龄，找出没有接班人的位置 */
function ageRisk() {
  const out = []; const ca = certAge();
  ca.filter(c => c.risk === '高').forEach(c => {
    const cand = PEOPLE.filter(p => !p.cert.includes(c.k) && p.age <= 35 && p.yrs >= 5 && p.status !== '休假').sort((a, b) => (b.yrs + (b.cert.includes('登高作业证') ? 10 : 0)) - (a.yrs + (a.cert.includes('登高作业证') ? 10 : 0)));
    out.push({ lv: '高', t: c.k + ' 持证人 ' + c.hold.length + ' 人，平均 ' + c.avg + ' 岁', d: '持证人是' + c.hold.map(p => p.n + '（' + p.age + '）').join('、') + (c.young ? '' : '，35 岁以下无人持证') + '。这类作业一旦有人休假或调离就派不出工。', fix: '建议培养 ' + (cand.slice(0, 2).map(p => p.n + '（' + p.age + ' 岁 · ' + p.yrs + ' 年）').join('、') || '暂无符合申报条件的人选') + '，10 月报名取证。', who: cand.slice(0, 2).map(p => p.n) });
  });
  const senior = PEOPLE.filter(p => /高级作业员|班长/.test(postKey(p)));
  const sAvg = ageAvg(senior);
  const succ = PEOPLE.filter(p => postKey(p) === '中级作业员' && p.yrs >= 7);
  out.push({ lv: sAvg >= 38 ? '中' : '低', t: '骨干层平均 ' + sAvg + ' 岁，' + senior.length + ' 人', d: '班长与高级作业员是' + senior.map(p => p.n + '（' + p.age + '）').join('、') + '；五年后平均 ' + (sAvg + 5).toFixed(1) + ' 岁' + (senior.filter(p => p.age + 5 >= RETIRE - 5).length ? '，' + senior.filter(p => p.age + 5 >= RETIRE - 5).length + ' 人进入退休前五年' : '，暂无人临近退休，但骨干层整体在上移，补位要从现在开始压担子') + '。', fix: '中级作业员里工龄满 7 年的是' + (succ.map(p => p.n + '（' + p.age + '）').join('、') || '暂无') + '，可作为骨干补位人选，先压担子再报资格。', who: succ.map(p => p.n) });
  const young = PEOPLE.filter(p => p.age <= 30);
  const yNoCert = young.filter(p => p.cert.length <= 1);
  if (yNoCert.length) out.push({ lv: '中', t: '30 岁以下 ' + young.length + ' 人，其中 ' + yNoCert.length + ' 人只有高压电工证', d: yNoCert.map(p => p.n + '（' + p.age + ' 岁 · ' + p.yrs + ' 年）').join('、') + ' 只有准入证，能干的活受限，工时也上不去。', fix: '按工龄先给' + yNoCert.filter(p => p.yrs >= 2).slice(0, 2).map(p => p.n).join('、') + '排登高作业证，取证后可独立参加杆上作业。', who: yNoCert.filter(p => p.yrs >= 2).slice(0, 2).map(p => p.n) });
  return out;
}
/* 五年后年龄推演 */
function ageIn(n) { return AGE_BANDS.map(b => PEOPLE.filter(p => p.age + n >= b[1] && p.age + n <= b[2]).length); }

/* ---------- 六、班组画像与台账中心的指标对照 ---------- */
function metricMap() {
  const m = DB.month();
  return [
    { n: '本周外勤工时', v: PEOPLE.reduce((s, p) => s + p.week, 0) + ' h', d: '12 人合计，约定每人每周不超过 ' + WEEK_LIMIT + ' h', tab: 'hours', act: 'ch-hours', who: '黄伟强' },
    { n: '证书 90 天内到期', v: certsDueWithin(90).length + ' 人', d: certsDueWithin(90).map(c => c.who).join('、') || '无', tab: 'cert', act: 'six', k: 'cert' },
    { n: '年度学时完成', v: Math.round(PEOPLE.reduce((s, p) => s + p.hours.done / p.hours.req, 0) / PEOPLE.length * 100) + '%', d: PEOPLE.filter(p => p.hours.m < 3).length + ' 人本月未完成', tab: 'study', act: 'six', k: 'hours' },
    { n: '本月任务完成', v: m.jobsDone + '/' + m.jobs, d: '未完成 ' + (m.jobs - m.jobsDone) + ' 项', tab: 'task', act: 'six', k: 'jobs' },
    { n: '两票合格', v: m.ticketsOK + '/' + m.tickets, d: '待审 ' + DB.tickets().filter(t => t.st === '待审').length + ' 张', tab: 'ticket', act: 'six', k: 'jobs' },
    { n: '缺陷闭环', v: m.defectsClosed + '/' + m.defectsFound, d: '未闭环 ' + (m.defectsFound - m.defectsClosed) + ' 处', tab: 'defect', act: 'hz-stage', k: '已关闭' },
    { n: '本月安全活动', v: m.safetyDays + '/' + m.safetyDaysPlan + ' 次', d: '事故通报学习 ' + m.incidentStudy + ' 次', tab: 'safety', act: 'six', k: 'safety' },
    { n: '课程完成', v: PEOPLE.reduce((s, p) => s + (TRAIN_DONE[p.n] || []).length, 0) + '/' + (PEOPLE.length * 7) + ' 门次', d: (TRAIN_DONE ? PEOPLE.filter(p => (TRAIN_DONE[p.n] || []).length <= 2).length : 0) + ' 人不足 3 门', tab: 'train', act: 'nav' }
  ];
}
