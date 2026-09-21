/* ===== 管理数据（9/21 客户口径：管理功能加重）：班组荣誉与特色标签、星级班组评价维度初步评分（依据分册建设工作 64 条 + 附表 1 得分比例）、六维个人画像、班长队伍、三班组名册、年度指标任务、同类班组横向对比、团队风险画像、员工关怀、文化活动、面谈提纲、近五年业务量与人力配置、绩效与激励、师带徒与骨干培养、知识库三类 ===== */

/* ---------- 班组荣誉标签与特色标签（特色按规则判定：专家型 / 骨干型 / 基础型） ---------- */
const KIND_RULE = [['专家型', '技师及以上占比 ≥ 40% 且有局级及以上专家'], ['骨干型', '高级工及以上占比 ≥ 50%'], ['基础型', '高级工及以上占比 < 50%，30 岁以下过半']];
const TEAM_TAGS = {
  '配电自动化班': { star: '四星班组', starD: '2025-12 复评', honors: [['2025 年度安全生产先进班组', '局级', '2026-01'], ['2024 年工人先锋号', '局级', '2024-05']], kind: '骨干型', why: '高级工及以上 5/12，技师 2 人，九类核心技能可自主实施 6 类，无局级专家' },
  '试验班': { star: '五星班组', starD: '2024-12 评定', honors: [['2023 年先进集体', '局级', '2024-01'], ['2025 年质量信得过班组', '市级', '2025-12']], kind: '专家型', why: '技师及以上 4/8，局级专家 1 人（周建国），交接试验 296 条全部自主实施' },
  '配电运维一班': { star: '三星班组', starD: '2025-12 评定', honors: [['2025 年青年文明号', '局级', '2025-05']], kind: '基础型', why: '30 岁以下 6/11，高级工 2 人，核心业务自主实施 5/9，人均实操 18.2 次' }
};
/* ---------- 星级班组评价维度 · 初步评分（维度 = 分册建设工作二级目录；标准分取自分册；本班现状取台账或班务记录）---------- */
const STAR_LEVELS = [['五星', 90], ['四星', 80], ['三星', 70], ['二星', 60]];
const BUILD_PRE = [
  { k: 'b11', l1: '必备条件', n: '安全生产', must: true, std: '近一年无一般及以上事故、无有人为责任的四级及以上事件；无二级及以上单位越级查处的 A、B 类违章', now: () => '事故事件 0；A、B 类违章 0；一般违章 ' + VIOLATIONS.length + ' 起（本班自查）', ok: () => true, path: '电网管理平台 · 违章管理' },
  { k: 'b12', l1: '必备条件', n: '党风廉政', must: true, std: '评价周期内班组成员不发生违纪违法事件', now: () => '0 起', ok: () => true, path: '——' },
  { k: 'b13', l1: '必备条件', n: '行风舆情', must: true, std: '不发生因班组责任引发的社会舆论事件', now: () => '0 起', ok: () => true, path: '——' },
  { k: 'b14', l1: '必备条件', n: '党建水平', must: true, std: '五星：所在党支部近五年获网公司及以上标杆党支部或先进党组织称号', now: () => '所在党支部 2024 年获局级先进党支部，未获网公司级', ok: () => false, gap: '缺网公司级党建荣誉，五星必备条件不满足', fix: '2026 年申报网公司标杆党支部；把党建融合项目（终端在线率攻坚）做成支部书记项目' , path: '党建管理系统' },
  { k: 'b15', l1: '必备条件', n: '核心能力建设', must: true, std: '岗位证书持证率 100%（新员工除外）；保命教育 100%；核心业务自主实施：五星 ≥ 35%（修编后 35 / 30 / 25 三档）', now: () => '岗位胜任能力证 ' + certHold('岗位胜任能力证').length + '/11；保命教育 12/12；九类核心技能可自主实施 ' + skillCover().filter(c => c.a.length >= 3).length + '/9 类，自主实施比例 ' + Math.round(PEOPLE.reduce((s, p) => s + skill9Of(p).q.filter(x => x === 'A').length, 0) / (PEOPLE.length * 9) * 100) + '%', ok: () => skillCover().filter(c => c.a.length >= 3).length >= 6, gap: '三类核心技能（光纤差动、终端调试、动作分析）可自主实施不足 3 人', fix: '按技能矩阵的断层项排带教：每类补到 3 人可自主', path: '技能矩阵 · 核心技能台账' },
  { k: 'b16', l1: '必备条件', n: '班站标准化水平', must: true, std: '达到公司班站标准化建设达标要求', now: () => '2025-06 通过局级标准化达标验收', ok: () => true, path: '班组建设管理系统' },
  { k: 'b17', l1: '必备条件', n: '资源配置', must: true, std: '基本配置（场地、工器具、仪器）与人员配置符合规定', now: () => '定编 12 到岗 ' + PEOPLE.filter(p => p.status !== '休假').length + '；工器具定检 100%', ok: () => true, path: '人员名册 · 工器具台账' },
  { k: 'b21', l1: '通用部分', n: '安全管理', pts: 75, sc: () => 68 - DB.defects().filter(d => /超期/.test(d.st)).length * 2, std: '制度、责任制、风险评估、关键任务分析、作业指导书、工作票管理、职业健康、急救 10 项', gap: '关键任务分析未覆盖“交换机取电排查”这类新任务；作业指导书 2 份未按 2026 版规程修订', fix: '本月补关键任务分析 1 份、修订作业指导书 2 份（韩雪）', path: '安全生产管理系统' },
  { k: 'b22', l1: '通用部分', n: '培训管理', pts: 25, sc: () => Math.round(19 + Math.min(4, (LS.get('plan', []).length ? 2 : 0))), std: '培训计划 10、培训实施 10、培训效果评估 5', gap: '培训效果评估未做（成绩记录未对到能力图谱）；本月学时未完成 ' + PEOPLE.filter(p => p.hours.m < 3).length + ' 人', fix: '考评定级把每次成绩落到模块等级；8 月补学时名单发到个人', path: '培训台账 · 成绩记录' },
  { k: 'b23', l1: '通用部分', n: '人员配置', pts: 15, sc: () => 12, std: '岗位配置符合规定 5、上岗资质 5、员工技能水平 5（素质当量）', gap: () => '素质当量均值 ' + skillEqAvg() + '，五星参考 ≥ 0.7；初级工 4 人、未定级 1 人', fix: '陈浩、周明、林芷若 2026 下半年申报中级工；刘一鸣 2027 定级', path: '技能等级认定台账' },
  { k: 'b24', l1: '通用部分', n: '会议管理', pts: 10, sc: () => 10, std: '班前班后会、班务会 5；安全活动 5', path: '会议记录' },
  { k: 'b25', l1: '通用部分', n: '定置管理', pts: 3, sc: () => 3, std: '定置管理 3', path: '现场检查记录' },
  { k: 'b26', l1: '通用部分', n: '班组帮扶', pts: 5, sc: () => 2 + (LS.get('culture_add', []).some(x => x.kind === '帮扶' || /帮扶/.test(x.t)) ? 3 : 0), std: '帮扶计划 2、帮扶活动 3', gap: '有帮扶计划（对口配电运维一班），本年帮扶活动 0 次', fix: '9 月组织一次跨班组带教（终端调试）并留记录', path: '班组活动记录' },
  { k: 'b27', l1: '通用部分', n: '人文关怀', pts: 7, sc: () => 5 + (LS.get('care_done', {}) && Object.keys(LS.get('care_done', {})).length ? 2 : 0), std: '慰问关爱 2、合理化建议 2、工余环境 3', gap: '本年慰问关爱记录 1 次；合理化建议 3 条未反馈', fix: '关怀提醒逐条办结并留记录；合理化建议本月给答复', path: '班组活动记录' },
  { k: 'b28', l1: '通用部分', n: '设备文档与台账', pts: 30, sc: () => 24 - DB.defects().filter(d => /超期/.test(d.st)).length * 2, std: '技术图档 10、缺陷管理 20', gap: () => '缺陷超期 ' + DB.defects().filter(d => /超期/.test(d.st)).length + ' 单；图档更新滞后 2 座站', fix: '华发民公用柜今天闭环；田寮站改造后图档同步', path: '缺陷台账 · 图档系统' },
  { k: 'b29', l1: '通用部分', n: '绩效管理', pts: 10, sc: () => 6 + Math.min(4, Object.keys(LS.get('perf_ok', {})).length ? 3 : 0), std: '考评要求 5、定期开展绩效考评 5', gap: '2026 年只做了一季度考评，月度考评未留记录', fix: '绩效与激励页每月确认一次系数并留痕', path: '绩效考评记录' },
  { k: 'b210', l1: '通用部分', n: '党建融合', pts: 20, sc: () => 12, std: '党建与业务融合 20', gap: '党员责任区未与关键节点表挂钩；五星党员 1 名（修编后要求 ≥ 1，已满足）', fix: '把 19 项关键节点按党员责任区分片', path: '党建管理系统' },
  { k: 'b31', l1: '专业部分', n: '作业组织', pts: 300, sc: () => 258, std: '工器具、计划管理、作业过程与风险管控、事故事件、应急、二次设备运维 / 检修 / 调试、项目立项 11 项', gap: '二次设备常规检修计划完成 82%；应急演练本年 1 次（要求 2 次）', fix: '9 月补一次应急演练；检修计划按周计划排到 10 月', path: '生产管理系统' },
  { k: 'b32', l1: '专业部分', n: '作业实施', pts: 500, sc: () => 445 + Math.min(10, DB.skillWrites().length * 2), std: '成套设备验收、保护定值管理、动作分析与故障定位、实操培训、设备维护、设备巡视 6 项', gap: '动作分析与故障定位自主实施 2 人；实操培训人均 ' + skill9PerCap() + ' 次（附表 1：人均实操量按排名取得分比例）', fix: '动作分析带教（韩雪带郭子扬、赵敏）；实操量低于人均 30% 的人优先派', path: '核心技能台账 · 任务台账' },
  { k: 'b41', l1: '加分', pts: 10, n: '附加指标', sc: () => 4, std: '竞赛获奖、创新成果、专利等最高加 10 分', gap: '2025 年配网技能竞赛三等奖 +4；无创新成果', fix: '把“交换机取电排查规范”整理为创新成果申报', path: '荣誉台账' }
];
function buildDims() { return BUILD_PRE.map(b => { const o = Object.assign({}, b); o.nowV = b.now ? b.now() : ''; o.okV = b.ok ? b.ok() : null; o.scV = b.sc ? b.sc() : null; o.gapV = typeof b.gap === 'function' ? b.gap() : b.gap || ''; if (b.pts) { o.pct = Math.round(o.scV / b.pts * 100); o.cls = o.pct >= 90 ? 'ok' : o.pct >= 75 ? 'w' : 'bad'; } else { o.cls = o.okV ? 'ok' : 'bad'; o.pct = o.okV ? 100 : 0; } return o; }); }
function buildScore() { const D = buildDims(); const scored = D.filter(d => d.pts); const tot = scored.reduce((s, d) => s + d.scV, 0), full = scored.reduce((s, d) => s + d.pts, 0); const pct = +(tot / full * 100).toFixed(1); const must = D.filter(d => d.must); const mustBad = must.filter(d => !d.okV); let lv = STAR_LEVELS.find(l => pct >= l[1]); lv = lv ? lv[0] : '一星'; const five = pct >= 90 && !mustBad.length; return { tot, full, pct, lv: five ? '五星' : lv === '五星' ? '四星' : lv, mustBad, gapTo5: Math.max(0, +(90 - pct).toFixed(1)), dims: D }; }
/* 附表 1 · 指标区间划分：排名 → 得分比例 */
const RANK_RATIO = [['前三名', 1], ['第四名', 0.98], ['第五名', 0.95], ['第六名', 0.92], ['第七名', 0.88], ['第八名', 0.85], ['第九名', 0.82], ['第十名', 0.75], ['第十名后', 0.7]];
function rankRatio(r) { return r <= 3 ? 1 : r <= 10 ? RANK_RATIO[r - 3][1] : 0.7; }

/* ---------- 六维个人画像（业务技能 / 安全素质 / 领导力 / 沟通能力 / 写作能力 / 工作经验，1–5）---------- */
const SIX_DIMS = ['业务技能', '安全素质', '领导力', '沟通能力', '写作能力', '工作经验'];
const SIX6 = {
  '赵立群': [4, 5, 5, 4, 4, 5], '韩雪': [5, 5, 4, 4, 5, 4], '黄伟强': [4, 4, 3, 3, 2, 5], '李文博': [4, 4, 3, 4, 3, 3], '吴倩': [4, 4, 2, 4, 3, 3], '郭子扬': [3, 3, 2, 3, 2, 2], '赵敏': [3, 4, 2, 4, 4, 2], '王安': [3, 3, 2, 2, 2, 3], '陈浩': [2, 3, 1, 3, 2, 1], '周明': [2, 3, 1, 3, 3, 1], '林芷若': [2, 3, 1, 4, 4, 1], '刘一鸣': [2, 3, 1, 3, 2, 1],
  '周建国': [5, 5, 5, 4, 4, 5], '张伟': [5, 4, 4, 3, 3, 5], '刘畅': [4, 4, 3, 4, 3, 4], '吴磊': [3, 4, 2, 3, 2, 3], '孙倩': [3, 4, 2, 4, 4, 2], '马涛': [3, 3, 2, 3, 2, 1], '何静': [2, 3, 1, 3, 3, 1], '陈晨': [2, 3, 1, 2, 2, 1],
  '陈志远': [4, 5, 4, 5, 4, 4], '林小虎': [4, 4, 4, 4, 3, 4], '郑浩': [4, 4, 3, 3, 3, 3], '邓丽': [4, 4, 3, 4, 4, 3], '冯超': [3, 4, 2, 3, 2, 3], '叶芳': [3, 3, 2, 4, 4, 2], '谭俊': [3, 3, 2, 3, 2, 2], '罗天': [2, 3, 1, 2, 2, 1], '曾静': [2, 3, 1, 4, 3, 1], '方远': [2, 3, 1, 3, 2, 1], '高子安': [2, 3, 1, 3, 2, 1]
};
function sixOf(n) { return SIX6[n] || [3, 3, 2, 3, 2, 2]; }
function sixTop(n) { const v = sixOf(n); return v.map((x, i) => [SIX_DIMS[i], x]).sort((a, b) => b[1] - a[1]).slice(0, 2); }
const SIX_EVID = { '业务技能': '能力图谱 8 模块均值、技能等级', '安全素质': '违章记录、两票执行、安全活动出勤', '领导力': '工作负责人次数、带徒、组织节点', '沟通能力': '跨班组协同、客户投诉、班务会发言', '写作能力': '文稿起草、案例沉淀、周报要点', '工作经验': '工龄、经手站点数、故障处理次数' };

/* ---------- 三班组名册（配电运维一班补齐，全部虚拟）---------- */
const TEAM3_PEOPLE = [
  { n: '陈志远', post: '班长', age: 39, yrs: 16, cert: ['高压电工作业证', '岗位胜任能力证', '工作负责人资格', '登高架设作业证'] },
  { n: '林小虎', post: '副班长', age: 36, yrs: 13, cert: ['高压电工作业证', '岗位胜任能力证', '工作负责人资格', '登高架设作业证'] },
  { n: '郑浩', post: '高级作业员', age: 34, yrs: 11, cert: ['高压电工作业证', '岗位胜任能力证', '工作负责人资格', '登高架设作业证', '电力电缆作业证'] },
  { n: '邓丽', post: '高级作业员', age: 33, yrs: 10, cert: ['高压电工作业证', '岗位胜任能力证', '工作负责人资格'] },
  { n: '冯超', post: '中级作业员', age: 31, yrs: 8, cert: ['高压电工作业证', '岗位胜任能力证', '登高架设作业证'] },
  { n: '叶芳', post: '中级作业员', age: 29, yrs: 6, cert: ['高压电工作业证', '岗位胜任能力证'] },
  { n: '谭俊', post: '中级作业员', age: 28, yrs: 5, cert: ['高压电工作业证', '岗位胜任能力证', '登高架设作业证'] },
  { n: '罗天', post: '初级作业员', age: 27, yrs: 3, cert: ['高压电工作业证', '岗位胜任能力证'] },
  { n: '曾静', post: '初级作业员', age: 26, yrs: 2, cert: ['高压电工作业证'] },
  { n: '方远', post: '初级作业员', age: 25, yrs: 2, cert: ['高压电工作业证'] },
  { n: '高子安', post: '初级作业员（学员）', age: 23, yrs: 1, cert: ['高压电工作业证'] }
];
const SKILL_LV3 = { '陈志远': '技师', '林小虎': '高级工', '郑浩': '高级工', '邓丽': '高级工', '冯超': '中级工', '叶芳': '中级工', '谭俊': '中级工', '罗天': '初级工', '曾静': '初级工', '方远': '初级工', '高子安': '未定级', '周建国': '高级技师', '张伟': '技师', '刘畅': '技师', '吴磊': '高级工', '孙倩': '中级工', '马涛': '中级工', '何静': '初级工', '陈晨': '未定级' };
function skillLvOf(n) { return (SKILLS[n] || {}).lv || SKILL_LV3[n] || '未定级'; }
/* 星级工程师 / 专家（局级人才台账） */
const STAR_ENG = { '韩雪': '三星工程师', '赵立群': '三星工程师', '李文博': '一星工程师', '周建国': '四星工程师', '张伟': '二星工程师', '刘畅': '一星工程师', '陈志远': '二星工程师', '郑浩': '一星工程师' };
const EXPERTS = { '周建国': '局级专家（电气试验）', '韩雪': '局级专家候选（配电自动化）' };
function teamPeople(team) { return team === TEAM.name ? PEOPLE : team === LAB.name ? LAB.people : TEAM3_PEOPLE; }
function teamOfPerson(n) { return P[n] ? TEAM.name : LAB.people.some(p => p.n === n) ? LAB.name : TEAM3_PEOPLE.some(p => p.n === n) ? TEAM3.name : ''; }
function personAny(n) { return P[n] || LAB.people.find(p => p.n === n) || TEAM3_PEOPLE.find(p => p.n === n); }
function postClass(p) { return /班长/.test(p.post) ? '班长' : /技术员|专责/.test(p.post) ? '专责' : /高级/.test(p.post) ? '高级作业员' : /中级/.test(p.post) ? '中级作业员' : '初级作业员'; }
function teamStat(team) { const ps = teamPeople(team); const on = team === TEAM.name ? ps.filter(p => p.status !== '休假').length : team === LAB.name ? ps.length - LAB.borrowed.length : ps.length - 1; const lv = {}; ps.forEach(p => { const l = skillLvOf(p.n); lv[l] = (lv[l] || 0) + 1; }); const posts = {}; ps.forEach(p => { const k = postClass(p); posts[k] = (posts[k] || 0) + 1; }); const avgAge = +(ps.reduce((s, p) => s + p.age, 0) / ps.length).toFixed(1); const young = ps.filter(p => p.age <= 30).length; const senior = ps.filter(p => /技师/.test(skillLvOf(p.n))).length; const high = ps.filter(p => /高级工|技师/.test(skillLvOf(p.n))).length; const eng = ps.filter(p => STAR_ENG[p.n]).length; return { team, n: ps.length, on, lv, posts, avgAge, young, senior, high, eng, expert: ps.filter(p => EXPERTS[p.n] && /^局级专家（/.test(EXPERTS[p.n])).length, stable: STABILITY[team] }; }
const STABILITY = { '配电自动化班': { leave3y: 1, borrowed: 0, longSick: 0, intent: 0, avgYrs: 8.6 }, '试验班': { leave3y: 0, borrowed: 1, longSick: 1, intent: 1, avgYrs: 9.5 }, '配电运维一班': { leave3y: 2, borrowed: 0, longSick: 0, intent: 0, avgYrs: 7.0 } };

/* ---------- 班长队伍与梯队 ---------- */
const LEADERS = [
  { n: '赵立群', team: '配电自动化班', age: 45, yrs: 22, asLeader: 8, lv: '技师', star: '三星工程师', party: true, edu: '本科', deputy: '韩雪', backup: [['韩雪', '可接任', '技师 · 三星工程师 · 副班长 5 年'], ['李文博', '培养中', '高级工 · 一星工程师 · 工作负责人 3 年']], retireIn: 15 },
  { n: '周建国', team: '试验班', age: 48, yrs: 26, asLeader: 12, lv: '高级技师', star: '四星工程师', party: true, edu: '大专', deputy: '张伟', backup: [['张伟', '可接任', '技师 · 二星工程师 · 主持交接试验 120 条'], ['刘畅', '培养中', '技师 · 借调配电运维一班中']], retireIn: 12 },
  { n: '陈志远', team: '配电运维一班', age: 39, yrs: 16, asLeader: 3, lv: '技师', star: '二星工程师', party: false, edu: '本科', deputy: '林小虎', backup: [['林小虎', '培养中', '高级工 · 副班长 2 年 · 未取技师']], retireIn: 21 }
];
function leaderStat() { const L = LEADERS; return { avgAge: +(L.reduce((s, l) => s + l.age, 0) / L.length).toFixed(1), avgLead: +(L.reduce((s, l) => s + l.asLeader, 0) / L.length).toFixed(1), party: L.filter(l => l.party).length, senior: L.filter(l => /技师/.test(l.lv)).length, ready: L.reduce((s, l) => s + l.backup.filter(b => b[1] === '可接任').length, 0), training: L.reduce((s, l) => s + l.backup.filter(b => b[1] === '培养中').length, 0), retire10: L.filter(l => l.retireIn <= 10).length }; }

/* ---------- 年度指标任务（来源：组织经营业绩指标 / 主管个人年度业绩责任书）---------- */
const YEAR_PCT = 60; // 2026-08-07 时间进度
const GOALS = [
  { k: 'g1', n: '配电自动化终端在线率', unit: '%', src: '组织经营业绩指标', target: 99.5, stretch: 99.8, cur: () => WK29.val('online'), kind: 'rate', team: '配电自动化班', note: '雷雨季 7–9 月离线过夜终端要日清；主站侧通道中断不计入班组', teams: { '配电自动化班': () => WK29.val('online') } },
  { k: 'g2', n: '遥控成功率', unit: '%', src: '组织经营业绩指标', target: 98.5, stretch: 99.2, cur: () => WK29.val('remote'), kind: 'rate', team: '配电自动化班', note: '晨操遥控失败当天查网线、把手位置、刀闸位置三项', teams: { '配电自动化班': () => WK29.val('remote') } },
  { k: 'g3', n: '自愈有效复电率', unit: '%', src: '组织经营业绩指标', target: 95, stretch: 98, cur: () => WK29.val('heal'), kind: 'rate', team: '配电自动化班', note: '自愈误动、拒动逐条分析，定值单与现场一致性每季核一次', teams: { '配电自动化班': () => WK29.val('heal') } },
  { k: 'g4', n: '缺陷限时闭环率', unit: '%', src: '主管个人年度业绩责任书', target: 100, stretch: 100, cur: () => WK29.val('close'), kind: 'rate', team: '三班组', note: '紧急 24 小时、重大 72 小时、一般 30 天；超期一单扣当月', teams: { '配电自动化班': () => WK29.val('close'), '试验班': () => 100, '配电运维一班': () => 98.9 } },
  { k: 'g5', n: '两票合格率', unit: '%', src: '主管个人年度业绩责任书', target: 100, stretch: 100, cur: () => +(DB.month().ticketsOK / DB.month().tickets * 100).toFixed(1), kind: 'rate', team: '三班组', note: '退回票不计不合格，执行后发现缺项才计', teams: { '配电自动化班': () => +(DB.month().ticketsOK / DB.month().tickets * 100).toFixed(1), '试验班': () => 100, '配电运维一班': () => 100 } },
  { k: 'g6', n: '配网自动化改造工程投运', unit: '座', src: '组织经营业绩指标', target: 36, stretch: 40, cur: () => 21, kind: 'count', team: '配电自动化班', note: '田寮站 F02 下周验收后 +1；9 月前投运 4 座才追上进度', teams: { '配电自动化班': () => 21 } },
  { k: 'g7', n: '交接试验完成', unit: '条', src: '组织经营业绩指标', target: 420, stretch: 460, cur: () => LAB.total, kind: 'count', team: '试验班', note: '7–8 月为高峰，试验班人均工时已超约定，需调配支援', teams: { '试验班': () => LAB.total } },
  { k: 'g8', n: '中压客户平均停电时间', unit: '小时', src: '组织经营业绩指标', target: 1.2, stretch: 1.0, cur: () => 1.31, kind: 'down', team: '配电运维一班', note: '转供电方案预置率要到 100%；故障抢修到场 45 分钟', teams: { '配电运维一班': () => 1.31 } },
  { k: 'g9', n: '人均核心技能实操量', unit: '次', src: '主管个人年度业绩责任书', target: 30, stretch: 36, cur: () => skill9PerCap(), kind: 'count', team: '三班组', note: '附表 1：人均实操量 = 核心技能自主实施完成总次数 / 人数，按排名取得分比例', teams: { '配电自动化班': () => skill9PerCap(), '试验班': () => 34.5, '配电运维一班': () => 18.2 } },
  { k: 'g10', n: '年度生产计划完成率', unit: '%', src: '组织经营业绩指标', target: 95, stretch: 98, cur: () => +(DB.month().jobsDone / DB.month().jobs * 100).toFixed(1), kind: 'rate', team: '三班组', note: '按月计划口径；调整过的计划要留变更记录', teams: { '配电自动化班': () => +(DB.month().jobsDone / DB.month().jobs * 100).toFixed(1), '试验班': () => 100, '配电运维一班': () => 100 } },
  { k: 'g11', n: '员工年度学时完成率', unit: '%', src: '主管个人年度业绩责任书', target: 100, stretch: 100, cur: () => Math.round(PEOPLE.reduce((s, p) => s + p.hours.done / p.hours.req, 0) / PEOPLE.length * 100), kind: 'prog', team: '三班组', note: '按时间进度看，落后 10 个百分点以上的人列入关怀提醒', teams: { '配电自动化班': () => Math.round(PEOPLE.reduce((s, p) => s + p.hours.done / p.hours.req, 0) / PEOPLE.length * 100), '试验班': () => 64, '配电运维一班': () => 55 } },
  { k: 'g12', n: '星级班组建设', unit: '', src: '主管个人年度业绩责任书', target: '配电自动化班保四星争五星 · 配电运维一班升四星', stretch: '两个班组同年升星', cur: () => '配电自动化班初步评分 ' + buildScore().pct + '（' + buildScore().lv + '）· 配电运维一班 三星', kind: 'text', light: () => buildScore().pct >= 90 ? 'ok' : buildScore().pct >= 85 ? 'w' : 'bad', team: '三班组', note: '五星必备条件 7 项一票否决，先补党建水平与核心能力建设', teams: { '配电自动化班': () => buildScore().pct + ' 分', '试验班': () => '五星（2024 评定）', '配电运维一班': () => '三星 · 初步评分 76.4' } },
  { k: 'g13', n: '安全生产事故事件', unit: '起', src: '组织经营业绩指标', target: 0, stretch: 0, cur: () => 0, kind: 'down', team: '三班组', note: '一般违章本年 ' + VIOLATIONS.length + ' 起，全部本班自查；越级查处 0 起', teams: { '配电自动化班': () => 0, '试验班': () => 0, '配电运维一班': () => 0 } }
];
function goalEval(g) { const v = g.cur(); let light, prog; if (g.kind === 'text') { light = g.light(); prog = null; } else if (g.kind === 'rate') { prog = +(v / g.target * 100).toFixed(1); light = v >= g.target ? 'ok' : v >= g.target * 0.985 ? 'w' : 'bad'; } else if (g.kind === 'down') { prog = null; light = v <= g.target ? 'ok' : v <= g.target * 1.05 ? 'w' : 'bad'; } else if (g.kind === 'prog') { prog = v; light = v >= YEAR_PCT ? 'ok' : v >= YEAR_PCT - 8 ? 'w' : 'bad'; } else { prog = +(v / g.target * 100).toFixed(1); light = prog >= YEAR_PCT ? 'ok' : prog >= YEAR_PCT - 8 ? 'w' : 'bad'; } return Object.assign({}, g, { v, light, prog, lightN: { ok: '绿', w: '黄', bad: '红' }[light] }); }
function goalsAll() { return GOALS.map(goalEval); }

/* ---------- 同类班组横向对比（配网管理部三班组）---------- */
function compareRows() { const m = DB.month(); const T = {}; TEAMS.forEach(t => { T[t.n] = t; }); const st = { '配电自动化班': teamStat('配电自动化班'), '试验班': teamStat('试验班'), '配电运维一班': teamStat('配电运维一班') };
  const hoursOf = { '配电自动化班': PEOPLE.reduce((s, p) => s + p.week, 0), '试验班': Object.values(LAB.week).reduce((s, x) => s + x, 0), '配电运维一班': 69 };
  return [
    { k: 'jobs', n: '本月任务完成', unit: '', vals: { '配电自动化班': m.jobsDone + '/' + m.jobs, '试验班': '60/60', '配电运维一班': '42/42' }, num: { '配电自动化班': +(m.jobsDone / m.jobs * 100).toFixed(0), '试验班': 100, '配电运维一班': 100 }, high: true },
    { k: 'load', n: '人均本周外勤工时', unit: 'h', num: { '配电自动化班': +(hoursOf['配电自动化班'] / 12).toFixed(1), '试验班': +(hoursOf['试验班'] / 8).toFixed(1), '配电运维一班': +(69 / 11).toFixed(1) }, limit: WEEK_LIMIT * 0.75, high: false, note: '约定每人每周外勤 ≤ 24 小时' },
    { k: 'over', n: '超约定工时人数', unit: '人', num: { '配电自动化班': PEOPLE.filter(p => p.week > WEEK_LIMIT).length, '试验班': Object.values(LAB.week).filter(x => x > WEEK_LIMIT).length, '配电运维一班': 0 }, high: false },
    { k: 'tk', n: '两票合格率', unit: '%', num: { '配电自动化班': +(m.ticketsOK / m.tickets * 100).toFixed(1), '试验班': 100, '配电运维一班': 100 }, high: true },
    { k: 'df', n: '缺陷闭环', unit: '', vals: { '配电自动化班': m.defectsClosed + '/' + m.defectsFound + (DB.defects().filter(d => /超期/.test(d.st)).length ? ' · 超期 ' + DB.defects().filter(d => /超期/.test(d.st)).length : ''), '试验班': '—', '配电运维一班': '17/18' }, num: { '配电自动化班': +(m.defectsClosed / m.defectsFound * 100).toFixed(0), '试验班': null, '配电运维一班': 94 }, high: true },
    { k: 'cap', n: '人均核心技能实操量', unit: '次', num: { '配电自动化班': skill9PerCap(), '试验班': 34.5, '配电运维一班': 18.2 }, high: true, note: '附表 1 按排名取得分比例' },
    { k: 'hrs', n: '学时完成率', unit: '%', num: { '配电自动化班': Math.round(PEOPLE.reduce((s, p) => s + p.hours.done / p.hours.req, 0) / PEOPLE.length * 100), '试验班': 64, '配电运维一班': 55 }, high: true, limit: YEAR_PCT },
    { k: 'cert', n: '90 天内到期证书', unit: '本', num: { '配电自动化班': certsDueWithin(90).length, '试验班': 1, '配电运维一班': 2 }, high: false },
    { k: 'on', n: '在岗率', unit: '%', num: { '配电自动化班': Math.round(st['配电自动化班'].on / 12 * 100), '试验班': Math.round(st['试验班'].on / 8 * 100), '配电运维一班': Math.round(st['配电运维一班'].on / 11 * 100) }, high: true },
    { k: 'high', n: '高级工及以上占比', unit: '%', num: { '配电自动化班': Math.round(st['配电自动化班'].high / 12 * 100), '试验班': Math.round(st['试验班'].high / 8 * 100), '配电运维一班': Math.round(st['配电运维一班'].high / 11 * 100) }, high: true }
  ].map(r => { const names = TEAMS.map(t => t.n); const nums = names.map(n => r.num[n]).filter(x => x != null); const best = r.high ? Math.max.apply(null, nums) : Math.min.apply(null, nums); const worst = r.high ? Math.min.apply(null, nums) : Math.max.apply(null, nums); r.best = names.filter(n => r.num[n] === best); r.worst = names.filter(n => r.num[n] === worst && best !== worst); return r; }); }
function compareAdvice() { const rows = compareRows(); const load = rows.find(r => r.k === 'load'); const names = TEAMS.map(t => t.n); const hi = names.slice().sort((a, b) => load.num[b] - load.num[a]); return { busy: hi[0], idle: hi[hi.length - 1], gap: +(load.num[hi[0]] - load.num[hi[hi.length - 1]]).toFixed(1), who: hi[hi.length - 1] === '配电运维一班' ? '郑浩' : hi[hi.length - 1] === '试验班' ? '吴磊' : '李文博', need: hi[0] === '试验班' ? '8 月交接试验高峰（' + LAB.total + ' 条，本月 60 条）' : hi[0] === '配电自动化班' ? '田寮站验收与消缺并行' : '故障抢修' }; }

/* ---------- 团队风险画像聚合 ---------- */
const SENSITIVE_POSTS = [
  { post: '工器具与仪器保管', team: '配电自动化班', who: '王安', since: '2022-03', limit: 3 }, { post: '工程验收签字', team: '配电自动化班', who: '韩雪', since: '2021-06', limit: 3 },
  { post: '试验报告审核', team: '试验班', who: '张伟', since: '2020-01', limit: 3 }, { post: '物资领用', team: '试验班', who: '吴磊', since: '2024-09', limit: 3 },
  { post: '缺陷登记专责', team: '配电运维一班', who: '郑浩', since: '2024-06', limit: 3 }, { post: '备品备件保管', team: '配电运维一班', who: '冯超', since: '2022-11', limit: 3 }
];
function yearsSince(ym) { const [y, m] = ym.split('-').map(Number); return +((2026 - y) + (8 - m) / 12).toFixed(1); }
function riskAgg() {
  const rot = SENSITIVE_POSTS.map(s => Object.assign({}, s, { yrs: yearsSince(s.since) })).filter(s => s.yrs >= s.limit).map(s => ({ g: '敏感岗位轮岗', lv: s.yrs >= s.limit + 2 ? '高' : '中', team: s.team, who: s.who, t: s.post + ' 任职 ' + s.yrs + ' 年，超过 ' + s.limit + ' 年轮岗期', act: 'rotate', src: '岗位任职台账' }));
  const att = [{ g: '考勤异常', lv: '高', team: '试验班', who: '何静', t: '近 30 天病假 12 天，长病关注', act: 'care', src: '考勤台账' }, { g: '考勤异常', lv: '低', team: '配电运维一班', who: '谭俊', t: '近 30 天迟到 3 次', act: 'remind', src: '考勤台账' }, { g: '考勤异常', lv: '中', team: '配电自动化班', who: '黄伟强', t: '连续三周外勤工时 ' + P['黄伟强'].week + ' 小时以上，家中老人住院', act: 'care', src: '工时台账 · 谈心记录' }];
  const perf = [{ g: '绩效持续偏低', lv: '中', team: '配电自动化班', who: '王安', t: '本月学时 0，核心技能实操量低于人均 30%，两季度履职证据偏少', act: 'talk', src: '学时台账 · 核心技能台账' }, { g: '绩效持续偏低', lv: '中', team: '配电运维一班', who: '罗天', t: '连续两季度考评靠后，岗位胜任评价待提升 2 项', act: 'talk', src: '绩效考评记录' }];
  const stab = [{ g: '队伍稳定性', lv: '中', team: '试验班', who: '刘畅', t: '借调配电运维一班 ' + Math.round((new Date(TODAY) - new Date(LAB.borrowed[0].since)) / 86400000) + ' 天，无返岗时间', act: 'transfer', src: '跨班组调配台账' }, { g: '队伍稳定性', lv: '中', team: '试验班', who: '陈晨', t: '学员提出转岗意向，试验班近一年无新进人员', act: 'talk', src: '谈心记录' }, { g: '队伍稳定性', lv: '低', team: '配电运维一班', who: '—', t: '近三年离职 2 人，30 岁以下 6/11，初级作业员 4 人只持准入证', act: 'ladder', src: '人员名册' }];
  return rot.concat(att, perf, stab);
}

/* ---------- 员工关怀：入职关键年份 / 回访 / 高强度 / 重点关注 ---------- */
const JOIN = { '赵立群': '2004-07', '韩雪': '2011-08', '黄伟强': '2008-09', '李文博': '2016-10', '吴倩': '2018-07', '郭子扬': '2020-08', '赵敏': '2021-09', '王安': '2017-08', '陈浩': '2023-07', '周明': '2024-07', '林芷若': '2024-08', '刘一鸣': '2025-07' };
const KEY_YEARS = [5, 10, 15, 20, 25, 30];
const FOLLOWUPS = [{ who: '黄伟强', t: '家中老人住院，已排两天室内；回访问恢复情况与下周排班', due: '2026-08-14', from: '2026-07-31 谈心' }, { who: '王安', t: '约定 8 月补两门课；回访学时进度', due: '2026-08-31', from: '2026-06-30 谈心' }, { who: '刘一鸣', t: '想学继保，已安排跟黄伟强旁站；回访旁站感受', due: '2026-08-17', from: '2026-07-17 谈心' }];
function careList() {
  const out = [];
  PEOPLE.forEach(p => { const [y, m] = JOIN[p.n].split('-').map(Number); const yrs = 2026 - y; if (KEY_YEARS.includes(yrs)) { const days = Math.round((new Date('2026-' + String(m).padStart(2, '0') + '-15') - new Date(TODAY)) / 86400000); if (days >= -30 && days <= 90) out.push({ k: 'year', who: p.n, t: '入职 ' + yrs + ' 年（' + JOIN[p.n].replace('-', ' 年 ') + ' 月入职）', when: '2026-' + String(m).padStart(2, '0'), days, act: days <= 0 ? '本月' : days + ' 天后', sug: yrs >= 20 ? '班务会上表彰，申报局级荣誉' : yrs >= 10 ? '班务会上表彰，送一封感谢信到家属' : '班前会上说一句，送纪念工牌' }); } });
  FOLLOWUPS.forEach(f => { const days = Math.round((new Date(f.due) - new Date(TODAY)) / 86400000); out.push({ k: 'follow', who: f.who, t: f.t, when: f.due, days, act: days < 0 ? '已过期 ' + (-days) + ' 天' : days === 0 ? '今天' : days + ' 天后', sug: '来源：' + f.from }); });
  PEOPLE.filter(p => p.week >= WEEK_LIMIT).forEach(p => out.push({ k: 'load', who: p.n, t: '本周外勤 ' + p.week + ' 小时' + (p.week > WEEK_LIMIT ? '，超约定 ' + (p.week - WEEK_LIMIT) + ' 小时' : '，到约定上限'), when: TODAY, days: 0, act: '本周', sug: '下周排两天室内；问一句家里情况' }));
  return out.sort((a, b) => a.days - b.days);
}
const FOCUS_PEOPLE = [
  { who: '何静', team: '试验班', tag: '长病', t: '近 30 天病假 12 天', do: '关怀面谈，问医疗与工作安排意愿，调整为室内试验记录整理' },
  { who: '韩雪', team: '配电自动化班', tag: '高绩效', t: '局级技术能手、局级专家候选、班长后备', do: '绩效面谈，谈专家申报与班长梯队安排，防止流失' },
  { who: '张伟', team: '试验班', tag: '高绩效', t: '主持交接试验 120 条，报告审核 6 年', do: '绩效面谈，谈轮岗与二星升三星工程师' },
  { who: '王安', team: '配电自动化班', tag: '低绩效', t: '学时 0、实操量低于人均 30%', do: '绩效面谈，定 8 月两门课和两次带教任务' },
  { who: '罗天', team: '配电运维一班', tag: '低绩效', t: '连续两季度考评靠后', do: '关键事件面谈，对着两次超期缺陷谈' },
  { who: '刘畅', team: '试验班', tag: '借调', t: '借调配电运维一班 50 天以上', do: '谈返岗时间，避免两边都不管' },
  { who: '刘一鸣', team: '配电自动化班', tag: '新员工', t: '入职 13 个月，光差保护理论 40 分', do: '关怀面谈，问师带徒感受与困难' }
];
const TALK_GUIDES = {
  '绩效面谈': { open: '先肯定：说一件本季度对方做得好的具体事（带日期、地点）', items: ['对照指标：任务完成、两票、学时、实操量四项各说数据来源', '听对方讲：哪一项自己觉得没达到，原因是什么', '一起定：下季度 2 件可检查的事、时间、需要班组给什么支持', '收尾：把约定写进谈心记录，约下次回访时间'], tips: ['只说事实和台账数，不说"态度"', '一次谈一到两个问题，不翻旧账', '对方沉默时等 5 秒再说话', '结论由本人复述一遍'] },
  '关键事件面谈': { open: '直接点明事件：时间、地点、发生了什么（不加评价）', items: ['还原过程：让对方按时间顺序讲一遍', '找原因：是规程不清、技能不够、还是当天安排问题', '定措施：对事不对人，写清谁在什么时候补什么', '说清后果：这件事在考评里怎么记，以后怎么消除影响'], tips: ['24 小时内谈，不拖', '有第二人在场（副班长或安全员）', '不与其他问题合并谈', '记录当天签字'] },
  '关怀面谈': { open: '从生活问起：身体、家里、通勤，不先谈工作', items: ['问困难：需要班组调整什么（排班、外勤、值班）', '给选项：两到三个可行的安排让对方选', '说边界：哪些能办、哪些要报部门', '约回访：两周内再问一次'], tips: ['不打听隐私，只问工作相关的困难', '承诺的事当天办', '长病、家庭变故的人不安排高风险作业'] }
};
const CULTURE_DEPT = [
  { d: '2026-08-15', kind: '主题党日', t: '"终端在线率攻坚"主题党日', team: '三班组', st: '计划中', who: '党支部', n: 18 },
  { d: '2026-08-21', kind: '座谈会', t: '2025–2026 年新员工座谈会', team: '三班组', st: '待通知', who: '陈国安', n: 7 },
  { d: '2026-09-12', kind: '团建', t: '配网管理部秋季团建（羊台山徒步）', team: '三班组', st: '待审批', who: '工会小组', n: 31 },
  { d: '2026-07-10', kind: '迎新会', t: '2026 届新员工迎新会', team: '三班组', st: '已举办', who: '陈国安', n: 29 },
  { d: '2026-06-20', kind: '座谈会', t: '班长座谈：关键节点表落地', team: '三班组', st: '已举办', who: '陈国安', n: 6 },
  { d: '2026-10-30', kind: '欢送会', t: '无退休、调离人员，本季不办', team: '—', st: '无需', who: '—', n: 0 }
];
const CULTURE_TEAM = [
  { d: '2026-08-05', kind: '学习', t: '光纤差动保护原理（第二讲）', host: '韩雪', n: 11, note: '刘一鸣、周明课后补测' },
  { d: '2026-07-29', kind: '分享', t: '光侨路 3# 频繁投退处理复盘', host: '吴倩', n: 12, note: '沉淀为案例 1 条' },
  { d: '2026-07-22', kind: '座谈', t: '雷雨季外勤安排座谈', host: '赵立群', n: 12, note: '定下高温轮换、外勤上限 24 小时' },
  { d: '2026-07-15', kind: '学习', t: '2026 版安规变化点', host: '黄伟强', n: 10, note: '两人外勤缺席，补课已排' },
  { d: '2026-07-08', kind: '分享', t: '交换机取电排查手法（带工具箱）', host: '李文博', n: 12, note: '' }
];

/* ---------- 绩效与激励（月度考评系数由证据推导，班组长确认后使用）---------- */
const PERF_POOL = 12000;
function perfRows() { const ok = LS.get('perf_ok', {}); const adj = LS.get('perf_adj', {}); return PEOPLE.map(p => { const E = evidenceOf(p); const rows = E.rows || []; const n = rows.length; const s9 = skill9Of(p); const base = 1.0; let co = base; if (p.week > WEEK_LIMIT) co += 0.05; if (s9.total >= skill9PerCap()) co += 0.05; if (p.hours.m >= 5) co += 0.03; if (p.hours.m === 0) co -= 0.05; if (skill9Low().some(x => x.n === p.n)) co -= 0.05; if (HONORS.some(h => h.who === p.n && h.d >= '2026-01')) co += 0.05; if (MENTORS.some(m => m.m === p.n)) co += 0.03; co = +(co + (adj[p.n] || 0)).toFixed(2); const why = []; if (p.week > WEEK_LIMIT) why.push('外勤超约定'); if (s9.total >= skill9PerCap()) why.push('实操量达人均'); if (p.hours.m >= 5) why.push('本月学时 ≥ 5'); if (p.hours.m === 0) why.push('本月学时 0'); if (skill9Low().some(x => x.n === p.n)) why.push('实操量低于人均 30%'); if (HONORS.some(h => h.who === p.n && h.d >= '2026-01')) why.push('本年获荣誉'); if (MENTORS.some(m => m.m === p.n)) why.push('带徒'); return { p, co, why, evid: n, ok: !!ok[p.n], nonm: co >= 1.08 ? '评优推荐' : co >= 1.03 ? '班务会表扬' : co < 1 ? '补课与带教任务' : '培训机会' }; }); }
function perfAlloc() { const R = perfRows(); const sum = R.reduce((s, r) => s + r.co, 0); return R.map(r => Object.assign({}, r, { money: Math.round(PERF_POOL * r.co / sum / 10) * 10 })); }

/* ---------- 师带徒与骨干培养 ---------- */
const MENTEE = { '刘一鸣': { stage: '新员工', train: 28, proj: 3, contest: 0, cert: '高压电工作业证 · 岗位胜任能力证待考（2026-11）', theory: 40, lastProj: '田寮站验收随队' }, '周明': { stage: '次新员工', train: 24, proj: 5, contest: 0, cert: '岗位胜任能力证待考（2026-10）', theory: 74, lastProj: '楼村片区终端巡视' }, '林芷若': { stage: '次新员工', train: 36, proj: 4, contest: 1, cert: '岗位胜任能力证待考（2026-10）', theory: 80, lastProj: '主站定值核对' }, '陈浩': { stage: '次新员工', train: 20, proj: 6, contest: 1, cert: '岗位胜任能力证 ✓ · 电力电缆作业证待考', theory: 82, lastProj: '光侨路 3# 消缺' } };
const BACKBONE = [
  { who: '韩雪', now: '技师 · 三星工程师', next: '局级专家（配电自动化）', when: '2026-12 申报', items: ['主导 1 项技术革新（交换机取电排查规范）', '带徒 1 人出师（陈浩）', '发表 1 篇技术总结'], done: 2 },
  { who: '李文博', now: '高级工 · 一星工程师', next: '技师 · 二星工程师', when: '2027-06 申报', items: ['技师鉴定理论 ≥ 80', '主持 2 项成套设备验收', '动作分析自主实施 5 次'], done: 1 },
  { who: '吴倩', now: '高级工', next: '一星工程师', when: '2027-03 申报', items: ['电缆试验自主实施 10 次', '完成局放检测培训', '带徒 1 人（周明）'], done: 1 },
  { who: '郭子扬', now: '中级工', next: '高级工', when: '2026-11 申报', items: ['倒闸操作实操 ≥ 85（已 88）', '终端调试自主实施 3 次', '二次回路理论 ≥ 80（79）'], done: 1 }
];

/* ---------- 近五年业务量与人力配置（部门）---------- */
const TREND5 = { years: ['2022', '2023', '2024', '2025', '2026 预计'], jobs: [1380, 1520, 1710, 1930, 2100], defects: [320, 350, 410, 460, 520], terms: [1850, 2100, 2400, 2750, 3100], heads: [30, 31, 31, 31, 31], avgAge: [29.6, 30.1, 30.6, 31.1, 31.5], senior: [5, 5, 6, 6, 7], teams: { '配电自动化班': [11, 12, 12, 12, 12], '试验班': [8, 8, 8, 8, 8], '配电运维一班': [11, 11, 11, 11, 11] } };
function trendCalc() { const T = TREND5; const per = T.jobs.map((j, i) => +(j / T.heads[i]).toFixed(1)); const g = (a) => Math.round((a[a.length - 1] - a[0]) / a[0] * 100); return { per, jobsG: g(T.jobs), headsG: g(T.heads), perG: g(per), termsG: g(T.terms), next: +(per[per.length - 1] * (1 + (per[per.length - 1] - per[per.length - 2]) / per[per.length - 2])).toFixed(1), need: Math.ceil(T.jobs[4] * 1.09 / per[3]) - T.heads[4] }; }

/* ---------- 知识库三类：制度政策类 / 生产技术类 / 行政办公类 ---------- */
const KB_CAT3 = ['制度政策类', '生产技术类', '行政办公类'];
const KB3 = [
  { id: 'z1', cat3: '制度政策类', cat: '班组建设', t: '星级班组评价：必备条件与星级判定', src: STAR_SRC + ' · 总则', body: '必备条件 7 项一票否决（安全生产、党风廉政、行风舆情、党建水平、核心能力建设、班站标准化、资源配置）；通用部分 10 项 175 分、专业部分 2 项 800 分、加分最高 10 分；按得分比例定星级，复评班组周期取近两年。', tags: ['星级', '班组建设'] },
  { id: 'z2', cat3: '制度政策类', cat: '班组建设', t: '指标区间划分与得分比例（附表 1）', src: STAR_SRC + ' · 附表 1', body: '排名前三名得分比例 1，第四名 0.98，第五名 0.95，第六名 0.92，第七名 0.88，第八名 0.85，第九名 0.82，第十名 0.75，第十名后 0.7；人均实操量 = 核心技能自主实施完成总次数 / 人数。', tags: ['星级', '排名'] },
  { id: 'z3', cat3: '制度政策类', cat: '绩效', t: '班组月度绩效考评办法（摘）', src: '《供电局班组绩效管理实施细则》 · 第三章', body: '月度考评以安全、任务、质量、学习、协同五类证据为依据，系数区间 0.8–1.2；考评结果由班长确认、部门备案后用于当月绩效分配；连续两季度靠后的员工须安排面谈并记录。', tags: ['绩效', '考评'] },
  { id: 'z4', cat3: '制度政策类', cat: '人才', t: '星级工程师与专家评聘条件（摘）', src: '《技术技能人才评聘管理办法》 · 附件 2', body: '一星工程师：高级工及以上、主持专业项目 2 项；二星：技师或工程师、技术总结 1 篇；三星：局级技术能手或竞赛前三；局级专家：三星工程师满两年、主导技术革新 1 项、带徒 1 人出师。', tags: ['星级工程师', '专家', '人才'] },
  { id: 'z5', cat3: '制度政策类', cat: '安规', t: '敏感岗位轮岗要求', src: '《岗位廉洁风险防控手册》 · 第四章', body: '物资领用、工器具与仪器保管、工程验收签字、试验报告审核等关键敏感岗位任职满 3 年应轮岗；确需延长的由部门书面说明并备案，最长不超过 5 年。', tags: ['轮岗', '敏感岗位'] },
  { id: 'x1', cat3: '行政办公类', cat: '财务报销', t: '差旅与外勤费用报销', src: '《费用报销管理办法》 · 第二章', body: '外勤误餐按实际外勤日计，凭派工单与工时记录报销；市内交通按公务用车优先，打车需事前审批；报销单每月 5 日前交部门，附发票、派工单、工时台账截图。', tags: ['报销', '差旅'] },
  { id: 'x2', cat3: '行政办公类', cat: '劳动保护', t: '劳动保护用品发放标准', src: '《劳动防护用品管理规定》 · 附表', body: '绝缘手套、绝缘鞋每年检测一次、两年更换；安全帽三年更换；高温季节 6–9 月每人每月发放防暑用品；雷雨季外勤配备雨具与防滑鞋；领用登记在班组台账。', tags: ['劳保', '防暑'] },
  { id: 'x3', cat3: '行政办公类', cat: '考勤休假', t: '年休假与调休规则', src: '《员工考勤与休假管理规定》 · 第三章', body: '工龄满 1 年 5 天、满 10 年 10 天、满 20 年 15 天；值班后次日调休；病假 30 天以上须提交医院证明并转人事备案；休假期间不安排值班与外勤。', tags: ['休假', '考勤'] },
  { id: 'x4', cat3: '行政办公类', cat: '会议文书', t: '班前班后会记录要求', src: '《班组管理标准》 · 会议管理', body: '班前会讲当日任务、风险点、人员状态，班后会讲完成情况、遗留问题；记录当天填写，班长签字，保存两年；文稿中心可按派工单自动生成初稿。', tags: ['会议', '记录'] },
  { id: 'x5', cat3: '行政办公类', cat: '工会福利', t: '员工关怀与慰问标准', src: '《工会关爱慰问办法》 · 第二章', body: '住院慰问、直系亲属重病或去世慰问、婚育慰问按标准办理；入职 5、10、20、30 年颁发纪念工牌；生日当月班组组织小型活动，费用在工会经费列支。', tags: ['关怀', '慰问'] }
];
function kbCat3(k) { if (k.cat3) return k.cat3; const c = k.cat || ''; const t = (k.tags || []).join(' '); if (/班组约定|两票|安规|绩效|制度/.test(c + t)) return '制度政策类'; return '生产技术类'; }
