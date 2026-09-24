/* ===== 管理数据（9/21 客户口径：管理功能加重）：班组荣誉与特色标签、星级班组评价维度初步评分（依据分册建设工作 64 条 + 附表 1 得分比例）、员工画像（综合画像 + 专业画像）、班长队伍、三班组名册、考核指标（分管副总 / 主管 / 班长）与班长绩效、同类班组横向对比、团队风险画像、员工关怀、文化活动、面谈提纲、近五年业务量与人力配置、绩效与激励、师带徒与骨干培养、知识库三类 ===== */

/* ---------- 班组荣誉标签与特色标签（特色按规则判定：专家型 / 骨干型 / 基础型） ---------- */
const KIND_RULE = [['专家型', '技师及以上占比 ≥ 40% 且有局级及以上专家'], ['骨干型', '高级工及以上占比 ≥ 50%'], ['基础型', '高级工及以上占比 < 50%，30 岁以下过半']];
const TEAM_TAGS = {
  '配电自动化班': { star: '四星班组', starD: '2025-12 复评', honors: [['2025 年度安全生产先进班组', '局级', '2026-01'], ['2024 年工人先锋号', '局级', '2024-05']], kind: '骨干型', why: '高级工及以上 5/12，技师 2 人，★模块授权集中在骨干，无局级专家' },
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
  { k: 'b15', l1: '必备条件', n: '核心能力建设', must: true, std: '岗位证书持证率 100%（新员工除外）；保命教育 100%；核心业务自主实施：五星 ≥ 35%（修编后 35 / 30 / 25 三档）', now: () => '岗位胜任能力证 ' + certHold('岗位胜任能力证').length + '/11；保命教育 12/12；核心业务自主实施率 ' + authRate() + '%（作业授权认证表：已授权★模块 ÷ 本岗级应授权★模块）；★模块 ≥ 3 人授权 ' + skillCover().filter(c => c.must && c.a.length >= 3).length + '/' + skillCover().filter(c => c.must).length + ' 个', ok: () => authRate() >= 35, gap: () => { const hi = skillCover().filter(c => c.must && c.a.length <= 2); return (hi.length ? '★模块已授权 ≤ 2 人的有 ' + hi.length + ' 个（' + hi.map(c => c.s.k + ' ' + c.s.n).join('、') + '）' : '★模块均有 3 人以上授权'); }, fix: '按授权认证页的断层模块排带教取证：每个★模块补到 3 人授权', path: '授权认证 · 作业授权台账' },
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
  { k: 'b32', l1: '专业部分', n: '作业实施', pts: 500, sc: () => 445 + Math.min(10, DB.skillWrites().length * 2), std: '成套设备验收、保护定值管理、动作分析与故障定位、实操培训、设备维护、设备巡视 6 项', gap: () => { const c = skillCover().find(x => x.s.k === '2.2'); return '2.2 ' + c.s.n + '已授权 ' + c.a.length + ' 人；实操培训人均 ' + skill9PerCap() + ' 次（附表 1：人均实操量按排名取得分比例）'; }, fix: '2.2 带教取证（韩雪带郭子扬、赵敏）；实操量低于人均 30% 的人优先派', path: '作业授权台账 · 任务台账' },
  { k: 'b41', l1: '加分', pts: 10, n: '附加指标', sc: () => 4, std: '竞赛获奖、创新成果、专利等最高加 10 分', gap: '2025 年配网技能竞赛三等奖 +4；无创新成果', fix: '把“交换机取电排查规范”整理为创新成果申报', path: '荣誉台账' }
];
function buildDims() { return BUILD_PRE.map(b => { const o = Object.assign({}, b); o.nowV = b.now ? b.now() : ''; o.okV = b.ok ? b.ok() : null; o.scV = b.sc ? b.sc() : null; o.gapV = typeof b.gap === 'function' ? b.gap() : b.gap || ''; if (b.pts) { o.pct = Math.round(o.scV / b.pts * 100); o.cls = o.pct >= 90 ? 'ok' : o.pct >= 75 ? 'w' : 'bad'; } else { o.cls = o.okV ? 'ok' : 'bad'; o.pct = o.okV ? 100 : 0; } return o; }); }
function buildScore() { const D = buildDims(); const scored = D.filter(d => d.pts); const tot = scored.reduce((s, d) => s + d.scV, 0), full = scored.reduce((s, d) => s + d.pts, 0); const pct = +(tot / full * 100).toFixed(1); const must = D.filter(d => d.must); const mustBad = must.filter(d => !d.okV); let lv = STAR_LEVELS.find(l => pct >= l[1]); lv = lv ? lv[0] : '一星'; const five = pct >= 90 && !mustBad.length; return { tot, full, pct, lv: five ? '五星' : lv === '五星' ? '四星' : lv, mustBad, gapTo5: Math.max(0, +(90 - pct).toFixed(1)), dims: D }; }
/* 附表 1 · 指标区间划分：排名 → 得分比例 */
const RANK_RATIO = [['前三名', 1], ['第四名', 0.98], ['第五名', 0.95], ['第六名', 0.92], ['第七名', 0.88], ['第八名', 0.85], ['第九名', 0.82], ['第十名', 0.75], ['第十名后', 0.7]];
function rankRatio(r) { return r <= 3 ? 1 : r <= 10 ? RANK_RATIO[r - 3][1] : 0.7; }

/* ---------- 员工画像 = 综合画像（通用素质模型 5 项）+ 专业画像（岗位说明书 9 项二级业务），均为 L1–L4 ----------
   综合画像定义取《深圳供电局有限公司素质模型》通用素质模型；专业画像取《岗位说明书》（配网资产部运维班 · 高级作业员）岗位职责和到位标准 */
const PORT_GEN_SRC = '《深圳供电局有限公司素质模型》通用素质模型';
const PORT_PRO_SRC = '《岗位说明书》岗位职责和到位标准（运维班 · 高级作业员）';
const GEN5 = [
  { k: 'loyal', n: '忠诚执行', d: '以身为公司一员而自豪，对供电事业充满信心与激情，并忠于这项事业，全力克服各种障碍，完成上级交办、职责范围内或自己承诺的事项。', lv: ['认同执行', '积极投入', '勇于担当', '倡导奉献'], ev: '任务按期完成率、急难险重任务承接、上级交办事项闭环' },
  { k: 'up', n: '不断求进', d: '拥有不断改进工作的热情和意愿，自发性地改进工作标准和成果，支持公司创先目标的实现。', lv: ['高效完成', '主动提升', '迎接挑战', '氛围营造'], ev: '学时完成、技能等级晋升、授权模块新增、改进与创新成果' },
  { k: 'safe', n: '安全意识', d: '坚守"安全第一"的理念，业务生产过程中时刻秉承忧患意识和风险意识，工作中时刻维护人身安全、企业信息安全、资产安全以及人员行为导致的电网安全，具备责任意识。', lv: ['风险意识', '风险管控', '系统防范', '打造文化'], ev: '违章记录、两票合格率、安全活动出勤、现场风险制止' },
  { k: 'cust', n: '客户导向', d: '快速响应用电客户需求，并主动思考客户需求，不断提升服务质量和效率，致力于成为用电客户和利益相关方的战略伙伴。', lv: ['热情周到', '优化服务', '洞察需求', '追求共赢'], ev: '客户投诉与表扬、抢修到场与复电时长、保供电任务' },
  { k: 'coop', n: '沟通协作', d: '作为集体的一分子，乐于与大家一起工作，认可他人劳动以及相互协作的重要性，通过相互沟通以及积极地行动确保团队成员的紧密配合。', lv: ['乐于沟通', '主动协作', '推进合作', '强化合力'], ev: '跨班组协同、带徒、班务会发言、协同评价' }
];
const PRO9 = [
  { k: 'rep', l1: '设备管理', n: '抢修管理', s: '抢修', sub: ['故障排查', '中压故障急修', '验收管理'], std: '符合《深圳供电局有限公司中压抢修与快速复电业务指导书》《南方电网公司中低压配电运行标准》等有关要求', ev: '抢修工单、故障定位记录、复电时长' },
  { k: 'haz', l1: '设备管理', n: '设备隐患管理', s: '隐患', sub: ['涉电公共安全隐患治理', '设备隐患治理'], std: '符合《中国南方电网有限责任公司设备风险评估管理办法》《深圳供电局有限公司设备状态评价及风险评估业务指导书》等有关要求', ev: '隐患台账：临时性措施、整改性措施及质量管控' },
  { k: 'def', l1: '设备管理', n: '设备缺陷管理', s: '缺陷', sub: ['缺陷处理', '验收管理'], std: '符合《南方电网公司中低压配电运行标准》《中国南方电网有限责任公司设备缺陷管理办法》等有关要求', ev: '缺陷台账：按时限消缺、消缺质量与验收评价' },
  { k: 'op', l1: '设备管理', n: '操作管理', s: '操作', sub: ['中压操作'], std: '符合《中国南方电网有限责任公司电气操作票管理规定》《深圳供电局有限公司电气操作票管理业务指导书》等有关要求', ev: '操作票张数与合格率、转供电与方式转换操作' },
  { k: 'pat', l1: '设备管理', n: '巡视管理', s: '巡视', sub: ['日常巡视（人工+无人机）', '特殊巡视'], std: '符合《深圳供电局运行值班管理业务指导书》《配电日常巡视作业指导书》《配电设备运维规程（试行）》等有关要求', ev: '巡视记录、红外测温与局放检测、发现缺陷数' },
  { k: 'mnt', l1: '设备管理', n: '维护管理', s: '维护', sub: ['特殊维护（保供电工作、家族性缺陷排查等）'], std: '符合《南方电网公司中低压配电运行标准》《深圳供电局有限公司维护检修业务指导书（修订）》等有关要求', ev: '专项排查维护、保供电、家族性缺陷排查' },
  { k: 'doc', l1: '作业管理', n: '作业文件管理（两书、两票）', s: '两书两票', sub: ['工作票、操作票填写与审核', '现场勘察与安全技术交底', '施工方案编制、作业指导书本地化修编'], std: '符合《中国南方电网有限责任公司电气工作票管理规定》《深圳供电局有限公司电气工作票管理业务指导书》等有关要求', ev: '两票台账：填写与签发张数、合格率' },
  { k: 'tool', l1: '作业管理', n: '安全工器具及生产机具管理', s: '工器具', sub: ['检测与试验', '维护保养'], std: '符合《中国南方电网有限责任公司电力安全工作规程》《深圳供电局有限公司班组生产工器具管理业务指导书》等有关要求', ev: '工器具台账：定期检测、领用、保养记录' },
  { k: 'site', l1: '作业管理', n: '作业现场管理', s: '作业现场', sub: ['作业过程管理', '作业风险监督', '作业应急管理'], std: '符合《深圳供电局有限公司安全风险评估与控制管理业务指导书》《深圳供电局有限公司维护检修业务指导书（修订）》等有关要求', ev: '工作负责人次数、作业风险评估、违章、事故预想' }
];
const PRO_LV = ['了解', '在指导下完成', '独立完成', '能指导他人'];
const PORT = {
  '赵立群': ['43443', '434444444'],
  '韩雪': ['44433', '434444444'],
  '黄伟强': ['42332', '434444343'],
  '李文博': ['33333', '324333333'],
  '吴倩': ['33333', '324333332'],
  '郭子扬': ['22222', '213222222'],
  '赵敏': ['23323', '213222322'],
  '王安': ['21222', '213222222'],
  '陈浩': ['22222', '112111211'],
  '周明': ['22222', '112111211'],
  '林芷若': ['23233', '112111211'],
  '刘一鸣': ['23222', '112121211'],
  '周建国': ['44443', '334334444'],
  '张伟': ['43332', '334334444'],
  '刘畅': ['33333', '224223343'],
  '吴磊': ['32322', '113112232'],
  '孙倩': ['23323', '113112332'],
  '马涛': ['22222', '113112232'],
  '何静': ['22222', '112111221'],
  '陈晨': ['22212', '112111221'],
  '陈志远': ['43444', '443444433'],
  '林小虎': ['33333', '443444433'],
  '郑浩': ['33322', '443444333'],
  '邓丽': ['33333', '443444333'],
  '冯超': ['32322', '332333222'],
  '叶芳': ['23223', '332333322'],
  '谭俊': ['22222', '332333222'],
  '罗天': ['22212', '221222211'],
  '曾静': ['22223', '221222211'],
  '方远': ['22222', '221222211'],
  '高子安': ['22222', '221222211']
};
function genOf(n) { const x = PORT[n]; return x ? x[0].split('').map(Number) : [2, 2, 2, 2, 2]; }
function proOf(n) { const x = PORT[n]; return x ? x[1].split('').map(Number) : PRO9.map(() => 2); }
/* 专业画像到位要求：高级作业员（含班长、副班长）L3 独立完成；中级、初级作业员 L2 在指导下完成 */
function proReq(p) { return p && authLv(p) !== '高' ? 2 : 3; }
function proGap(n) { const p = typeof personAny === 'function' ? personAny(n) : P[n]; const r = proReq(p); return proOf(n).map((v, i) => ({ d: PRO9[i], v, i })).filter(x => x.v < r); }
function portTop(n) { const g = genOf(n).map((v, i) => [GEN5[i].n, v, 'gen', i]); const pr = proOf(n).map((v, i) => [PRO9[i].n, v, 'pro', i]); return g.concat(pr).sort((a, b) => b[1] - a[1] || (a[2] === 'gen' ? -1 : 1)).slice(0, 2); }
function portLow(n) { const gap = proGap(n).sort((a, b) => a.v - b.v)[0]; if (gap) return [gap.d.n, gap.v, 'pro', gap.i]; const g = genOf(n).map((v, i) => [GEN5[i].n, v, 'gen', i]).sort((a, b) => a[1] - b[1]); return g[0]; }
function lvName(kind, i, v) { return kind === 'gen' ? GEN5[i].lv[v - 1] : PRO_LV[v - 1]; }

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
const STABILITY = { '配电自动化班': { leave3y: 1, borrowed: 0, longSick: 0, intent: 0, avgYrs: 8.6 }, '试验班': { leave3y: 0, borrowed: 1, longSick: 1, intent: 1, avgYrs: 9.6 }, '配电运维一班': { leave3y: 2, borrowed: 0, longSick: 0, intent: 0, avgYrs: 7.0 } };

/* ---------- 班长队伍与梯队 ---------- */
const LEADERS = [
  { n: '赵立群', team: '配电自动化班', age: 45, yrs: 22, asLeader: 8, lv: '技师', star: '三星工程师', party: true, edu: '本科', deputy: '韩雪', backup: [['韩雪', '可接任', '技师 · 三星工程师 · 副班长 5 年'], ['李文博', '培养中', '高级工 · 一星工程师 · 工作负责人 3 年']], retireIn: 15 },
  { n: '周建国', team: '试验班', age: 48, yrs: 26, asLeader: 12, lv: '高级技师', star: '四星工程师', party: true, edu: '大专', deputy: '张伟', backup: [['张伟', '可接任', '技师 · 二星工程师 · 主持交接试验 120 条'], ['刘畅', '培养中', '技师 · 借调配电运维一班中']], retireIn: 12 },
  { n: '陈志远', team: '配电运维一班', age: 39, yrs: 16, asLeader: 3, lv: '技师', star: '二星工程师', party: false, edu: '本科', deputy: '林小虎', backup: [['林小虎', '培养中', '高级工 · 副班长 2 年 · 未取技师']], retireIn: 21 }
];
function leaderStat() { const L = LEADERS; return { avgAge: +(L.reduce((s, l) => s + l.age, 0) / L.length).toFixed(1), avgLead: +(L.reduce((s, l) => s + l.asLeader, 0) / L.length).toFixed(1), party: L.filter(l => l.party).length, senior: L.filter(l => /技师/.test(l.lv)).length, ready: L.reduce((s, l) => s + l.backup.filter(b => b[1] === '可接任').length, 0), training: L.reduce((s, l) => s + l.backup.filter(b => b[1] === '培养中').length, 0), retire10: L.filter(l => l.retireIn <= 10).length }; }

/* ---------- 考核指标：分管副总 / 主管 / 班长三个维度（2026 年度业绩责任书原文口径）----------
   基础值 / 满分值 / 挑战值与评分标准取责任书；当前值：快速复电成功率取周报光明值，配电自动化班安全生产过程管理按本机违章台账推算，其余为部门台账预设 */
const YEAR_PCT = 60; // 2026-08-07 时间进度
/* 第三方客户满意度（季度回访测评，按班组分解） */
const CSAT = { '配电自动化班': 90.8, '试验班': 91.2, '配电运维一班': 87.4 };
function csatAvg() { const ns = Object.keys(CSAT); const tot = ns.reduce((s, n) => s + teamStat(n).n, 0); return +(ns.reduce((s, n) => s + CSAT[n] * teamStat(n).n, 0) / tot).toFixed(1); }
const KPI_DEF = {
  csat: { n: '第三方客户满意度', unit: '分', base: 87.6, full: 89.6, chal: null, dir: 1, fmt: v => v.toFixed(1),
    rule: '满意度分数达到基础值得 100 分，达到满分值得 120 分，之间按线性插值法折算；低于基础值每低 0.1 分扣 2 分，扣完为止。指标得分由满意度分数得分和诉求管控质量得分（12398 投诉管控量、投诉（风险）升级率等）各占 50% 合计，最高 120 分',
    score(v) { return v >= this.full ? 120 : v >= this.base ? 100 + (v - this.base) / (this.full - this.base) * 20 : Math.max(0, 100 - Math.round((this.base - v) * 10) * 2); } },
  rel: { n: '综合供电可靠率', star: true, unit: '%', base: 99.9981, full: 99.9986, chal: 99.9987, dir: 1, fmt: v => v.toFixed(5),
    rule: '达到基础值得 80 分，达到满分值得 100 分，达到挑战值得 110 分，之间按线性插值法计算；差于基础值每差 0.0001 个百分点扣 1 分。另有可靠性关键项目完成率、超 12 时户事件同比降幅、可靠性工作质量评价与数据质量加扣分；数据取自供电可靠性系统，剔除重大事件日及 3 分钟内停电',
    score(v) { return v >= this.chal ? 110 : v >= this.full ? 100 + (v - this.full) / (this.chal - this.full) * 10 : v >= this.base ? 80 + (v - this.base) / (this.full - this.base) * 20 : Math.max(0, 80 - Math.round((this.base - v) / 0.0001)); } },
  trip: { n: '中压线路故障跳闸次数', star: true, unit: '条次', base: 91, full: 83, chal: null, dir: -1, cum: true, fmt: v => String(Math.round(v)),
    rule: '全年故障次数达到基础值得 100 分，达到满分值得 120 分，之间按线性插值法计算；差于基础值每增加 1 次扣 1 分。重复故障 3 次及以上线路每条扣 2 分；频繁停电线路和台区扣 60 分 / 条；超 3 小时复电故障超过考核值（光明 4 次）每次扣 1 分；故障瞒报、原因谎报每发现 1 次记为 3 次',
    score(v) { return v <= this.full ? 120 : v <= this.base ? 100 + (this.base - v) / (this.base - this.full) * 20 : Math.max(0, 100 - (v - this.base)); } },
  fast: { n: '快速复电成功率', unit: '%', base: null, full: 88, chal: null, dir: 1, fmt: v => v.toFixed(1),
    rule: '达到或优于满分值得 120 分，每低于满分值 1% 扣 4 分，扣完为止。算法：成功次数 ÷ 具备快速复电条件的跳闸次数（剔除分界断路器动作、低压影响用户数为零、公线专用线路发生的跳闸）',
    score(v) { return v >= this.full ? 120 : Math.max(0, 120 - (this.full - v) * 4); } },
  duty: { n: '安全生产责任制履职评价', unit: '分', base: 100, full: 100, chal: null, dir: 1, fmt: v => String(v),
    rule: '达到或优于满分值得 120 分；未达到满分值的，每低于满分值 1 分，在 120 分基础上扣 1 分，扣完为止',
    score(v) { return v >= this.full ? 120 : Math.max(0, 120 - (this.full - v)); } },
  outage: { n: '中压客户平均停电时间', unit: '时户', base: 307, full: 226, chal: 210, dir: -1, cum: true, fmt: v => String(Math.round(v)),
    rule: '达到基础值得 80 分，达到满分值得 100 分，达到挑战值得 110 分，之间按线性插值法计算；可靠性关键项目完成率超过 95% 加 5 分；超 12 时户事件数同比减少 10% / 25% / 40% 分别加 1 / 3 / 5 分',
    score(v) { return v <= this.chal ? 110 : v <= this.full ? 100 + (this.full - v) / (this.full - this.chal) * 10 : v <= this.base ? 80 + (this.base - v) / (this.base - this.full) * 20 : Math.max(0, 80 - (v - this.base)); } },
  tripT: { n: '中压线路故障跳闸次数', unit: '次', base: 27, full: 26, chal: null, dir: -1, cum: true, fmt: v => String(Math.round(v)),
    rule: '达到基础值得 100 分，达到满分值得 120 分，之间按线性插值法计算；差于基础值每增加 1 次扣 1 分。重复故障 3 次及以上线路每条扣 2 分，频繁停电线路扣 60 分 / 条，超 3 小时复电超过考核值每次扣 1 分',
    score(v) { return v <= this.full ? 120 : v <= this.base ? 100 + (this.base - v) / (this.base - this.full) * 20 : Math.max(0, 100 - (v - this.base)); } },
  drop: { n: '故障平均停电用户数降幅', unit: '%', base: -3, full: -3.5, chal: null, dir: -1, fmt: v => v.toFixed(1),
    rule: '达到基础值（同比下降 3%）得 100 分，达到满分值（同比下降 3.5%）得 120 分，之间按线性插值法计算；指标同比增加时不得分（降幅不足 3% 时本页按比例折算）',
    score(v) { return v <= this.full ? 120 : v <= this.base ? 100 + (this.base - v) / (this.base - this.full) * 20 : v >= 0 ? 0 : 100 * v / this.base; } },
  proc: { n: '安全生产过程管理', unit: '分', base: null, full: 50, chal: null, dir: 1, risk: true, fmt: v => v.toFixed(1),
    rule: '风险指标：安全生产过程管理考核得分与加分之和不低于 50 分时本项不扣分；低于 50 分时按差值扣分',
    score(v) { return v >= this.full ? 0 : -(this.full - v); } }
};
const KPI_LV = [
  { k: 'vp', n: '分管副总', who: '分管副总经理（分管配资业务）', doc: '直属单位经理层副职年度经营业绩责任书', share: 80, items: [['csat', 15], ['rel', 15], ['fast', 10], ['duty', 10]] },
  { k: 'mgr', n: '主管', who: '陈国安 · 配网资产部主管', doc: '部门四级正干部年度业绩责任书', share: 80, items: [['csat', 15], ['rel', 15], ['trip', 15], ['duty', 5]] },
  { k: 'lead', n: '班长', who: '赵立群 · 周建国 · 陈志远', doc: '员工年度业绩责任书（班长）', share: 50, items: [['csat', 10], ['outage', 10], ['fast', 10], ['proc', 0]] }
];
/* 局级当前值（截至 2026-08-07；累计类按时间进度推算全年） */
const KPI_CUR = { csat: { v: 88.9, src: '网公司第三方客户满意度调查 · 上半年' }, rel: { v: 99.99832, src: '供电可靠性系统 · 1–7 月' }, trip: { ytd: 53, src: 'OMS 故障跳闸记录 · 1–7 月累计' }, fast: { v: () => WK29.val('fastok'), src: '周报第 29 期 · 光明' }, duty: { v: 100, src: '安全生产责任制履职评价 · 上半年' } };
/* 班长维度按班组取值：配电自动化班快速复电取周报、安全生产过程管理按本机违章台账推算；其余为部门台账预设 */
const KPI_TEAM = {
  '配电自动化班': { csat: { v: () => CSAT['配电自动化班'], src: '第三方季度回访测评' }, outage: { ytd: 145, src: '供电可靠性系统 · 1–7 月累计' }, fast: { v: () => WK29.val('fastok'), src: '周报第 29 期 · 光明' }, proc: { v: () => +(52 - VIOLATIONS.length * 0.5).toFixed(1), src: '安全生产过程管理考核 · 违章台账' }, tripT: { ytd: 11, src: 'OMS 故障跳闸记录 · 1–7 月累计' }, drop: { v: -3.6, src: '供电可靠性系统 · 同比' } },
  '试验班': { csat: { v: () => CSAT['试验班'], src: '第三方季度回访测评' }, outage: { ytd: 131, src: '供电可靠性系统 · 1–7 月累计' }, fast: { v: 86.0, src: '部门台账' }, proc: { v: 53.5, src: '安全生产过程管理考核' }, tripT: { ytd: 14, src: 'OMS 故障跳闸记录 · 1–7 月累计' }, drop: { v: -3.8, src: '供电可靠性系统 · 同比' } },
  '配电运维一班': { csat: { v: () => CSAT['配电运维一班'], src: '第三方季度回访测评' }, outage: { ytd: 178, src: '供电可靠性系统 · 1–7 月累计' }, fast: { v: 84.2, src: '部门台账' }, proc: { v: 47.0, src: '安全生产过程管理考核' }, tripT: { ytd: 17, src: 'OMS 故障跳闸记录 · 1–7 月累计' }, drop: { v: -2.6, src: '供电可靠性系统 · 同比' } }
};
function kpiLight(d, v) { if (d.risk) return v >= d.full ? 'ok' : 'bad'; if (d.dir < 0) return v <= d.full ? 'ok' : v <= d.base ? 'w' : 'bad'; if (d.base == null || d.base === d.full) return v >= d.full ? 'ok' : d.score(v) >= 108 ? 'w' : 'bad'; return v >= d.full ? 'ok' : v >= d.base ? 'w' : 'bad'; }
function kpiRow(k, w, team) { const d = KPI_DEF[k]; const src = team ? (KPI_TEAM[team] || {})[k] : KPI_CUR[k]; let v = null, ytd = null; if (src) { if (src.ytd != null) { ytd = src.ytd; v = +(ytd / YEAR_PCT * 100).toFixed(1); } else v = typeof src.v === 'function' ? src.v() : src.v; }
  const s = v == null ? null : +d.score(v).toFixed(1); const light = v == null ? 'w' : kpiLight(d, v);
  return Object.assign({}, d, { k, w, team: team || null, v, ytd, s, light, lightN: { ok: '绿', w: '黄', bad: '红' }[light], src: src ? src.src : '', vTxt: v == null ? '—' : ytd != null ? '累计 ' + ytd + d.unit + ' · 推算全年 ' + d.fmt(v) + d.unit : d.fmt(v) + d.unit }); }
function kpiRows(dimK) { const D = KPI_LV.find(x => x.k === dimK) || KPI_LV[0]; if (dimK !== 'lead') return D.items.map(([k, w]) => kpiRow(k, w));
  const ord = { bad: 0, w: 1, ok: 2 }; return D.items.map(([k, w]) => { const teams = {}; TEAMS.forEach(t => { teams[t.n] = kpiRow(k, w, t.n); }); const worst = Object.values(teams).sort((a, b) => ord[a.light] - ord[b.light])[0]; return Object.assign({}, KPI_DEF[k], { k, w, teams, light: worst.light, lightN: worst.lightN }); }); }
/* 汇总给导航角标、分析参谋：分管副总与主管去重，班长维度按三班组最差一格 */
function goalsAll() { const out = []; ['vp', 'mgr'].forEach(dk => kpiRows(dk).forEach(r => { if (!out.some(x => x.k === r.k)) out.push(Object.assign({ dim: dk }, r)); })); kpiRows('lead').forEach(r => out.push(Object.assign({}, r, { k: 'L_' + r.k, dim: 'lead', n: '班长 · ' + r.n }))); return out; }

/* ---------- 班长绩效（员工年度业绩责任书 · 班长）：考核指标 50% + 重点任务 10% + 综合评价 40% + 加扣分（≤ 2 分）+ 红线事项 ----------
   单项得分上限 120 分，本页按 ÷1.2 折为百分制后乘权重；安全生产过程管理为风险指标，按差值扣分；初步评分由部门确认后使用 */
const LPERF_Q = { no: '2026 年第三季度', range: '2026-07-01 至 09-30', state: '在评', prev: ['2025 年第四季度', '2026 年第一季度', '2026 年第二季度'], qs: ['25Q4', '26Q1', '26Q2', '26Q3'] };
const LPERF_KPI = [['csat', 10], ['outage', 10], ['fast', 10], ['tripT', 10], ['drop', 10]];
const LPERF_TASKS = [
  { k: 't1', n: '落实调度安全生产工作任务', w: 4, src: '公司所属部门（单位）经营业绩考核', rule: '自愈覆盖率 100%（含新增线路）得 30 分，每降低 1 个百分点扣 1 分，90% 以下不得分；中压快速复电应用成效达到 67% 得 35 分，每增减 1 个百分点加减 1 分，最高 43 分；低压快速复电应用成效同中压；本项最高 120 分',
    calc(team) { const I = LPERF_TASK_IN[team].t1; const heal = typeof I.heal === 'function' ? I.heal() : I.heal; const a = heal < 90 ? 0 : 30 - (100 - heal), b = Math.min(43, 35 + (I.mv - 67)), c = Math.min(43, 35 + (I.lv - 67)); return { s: +Math.min(120, a + b + c).toFixed(1), txt: '自愈覆盖率 ' + heal + '% → ' + a + ' 分；中压快速复电应用成效 ' + I.mv + '% → ' + b + ' 分；低压 ' + I.lv + '% → ' + c + ' 分' }; } },
  { k: 't2', n: '推动配电网高质量发展', w: 4, src: '公司所属部门（单位）经营业绩考核', rule: '按时高质量完成所有里程碑节点得 110 分；任务滞后、完成质量和成效不理想、未推进完成的每项扣分（本页按每项 5 分预估）；在重点任务中获上级表彰或通报表扬每项加 5 分，最多加 10 分；最高 120 分',
    calc(team) { const I = LPERF_TASK_IN[team].t2; const s = Math.min(120, 110 - I.late * 5 + Math.min(10, I.praise * 5)); return { s, txt: I.txt + (I.late ? '；滞后 ' + I.late + ' 项' : '；里程碑按期') + (I.praise ? '；通报表扬 ' + I.praise + ' 项' : '') }; } },
  { k: 't3', n: '配网"六百二零"攻坚行动', w: 2, src: '光明局年度重点工作', rule: '用户出门隐患、城中村频繁停电风险、安全隐患架空线路段、电缆隐患、配网自动化主干节点覆盖等 8 项任务 100% 完成得 120 分；所有任务均值每降低 1 个百分点扣 1 分',
    calc(team) { const I = LPERF_TASK_IN[team].t3; return { s: Math.max(0, 120 - (100 - I.avg)), txt: '8 项任务完成率均值 ' + I.avg + '%' + (I.txt ? '；' + I.txt : '') }; } }
];
/* 重点任务完成情况（局级任务按班组分解，部门台账预设；配电自动化班自愈覆盖率取周报） */
const LPERF_TASK_IN = {
  '配电自动化班': { t1: { heal: () => WK29.val('healcov'), mv: 72, lv: 70 }, t2: { late: 0, praise: 0, txt: '数字生产建设任务按节点推进' }, t3: { avg: 96, txt: '配网自动化主干节点覆盖为本班负责项' } },
  '试验班': { t1: { heal: () => WK29.val('healcov'), mv: 72, lv: 70 }, t2: { late: 0, praise: 1, txt: '电缆附件质量抽检按期完成' }, t3: { avg: 100, txt: '' } },
  '配电运维一班': { t1: { heal: () => WK29.val('healcov'), mv: 72, lv: 70 }, t2: { late: 1, praise: 0, txt: '电缆和通道全生命周期管理台账补录滞后' }, t3: { avg: 91, txt: '城中村频繁停电风险问题解决率 82%' } }
};
const LPERF_EVAL = [
  { k: 'e1', n: '政治过硬', w: 15, base: 90, pt: '自觉用习近平新时代中国特色社会主义思想武装头脑，把忠诚拥护"两个确立"、坚决做到"两个维护"体现到日常工作中。想问题、做工作能自觉从大局出发、为全局考虑，刻苦工作、敢于斗争、乐于奉献，在推动公司战略部署落实落地中走在前、做表率。', ev: '党建与安全活动出勤、跨班组支援',
    items(team, I) { const r = [['安全活动 / 党建学习缺席 ' + I.absent + ' 人次', -I.absent * 2]]; if (team === LAB.name) r.push(['借调骨干支援配电运维一班，服从全局调配', 2]); return r; } },
  { k: 'e2', n: '勇于创新', w: 10, base: 80, pt: '发挥基层创新能动性，始终保持强烈的创新意识和进取精神，敢闯敢试、敢于攀登，以求真务实态度、追求卓越信念把工作不断推向更高水平。', ev: '创新与 QC 成果、本季度新增授权模块',
    items(team) { const r = (LPERF_INNOV[team] || []).slice(); if (team === TEAM.name) { const n = Object.values(LS.get('skill9', {})).reduce((s, o) => s + Object.values(o).filter(v => v === 'A').length, 0); r.push(['本季度新增授权 ' + n + ' 项', Math.min(3, n)]); } if (!r.length) r.push(['本季度无创新成果登记', 0]); return r; } },
  { k: 'e3', n: '作风优良', w: 15, base: 95, pt: '弘扬新风正气，廉洁自律、公道正派、规范用权，自觉遵守廉洁从业各项规定。践行"知行合一、以知促行"的执行力文化，攻坚克难、真抓实干，养成"严、勤、细、实"的工作作风和"马上就办、办就办好"的工作习惯。', ev: '到期未派、待审票、周报漏报、一般违章',
    items(team, I) { return [['到期未派 ' + I.late + ' 项', -I.late * 3], ['待审票 ' + I.pend + ' 张', -I.pend * 2], ['周报漏报 ' + I.wkMiss + ' 期', -I.wkMiss * 3], ['一般违章 ' + I.vio + ' 起', -I.vio * 2]]; } }
];
const LPERF_INNOV = { '配电自动化班': [['永磁驱动终端频繁投退排查法 · 班组创新成果', 4]], '试验班': [['电缆振荡波试验作业卡优化 · QC 成果', 3], ['局职工创新项目 1 项', 3]], '配电运维一班': [] };
const LPERF_ADJ = { '赵立群': [], '周建国': [['试验班获局级通报表扬（电缆振荡波试验零差错）', 1]], '陈志远': [['上级查处一般违章 1 起（部门考核扣分分解）', -0.5]] };
const LPERF_RED = { '赵立群': null, '周建国': null, '陈志远': null };
const LPERF_DIMS = [
  { k: 'kpi', n: '考核指标', pts: 50, src: '考核指标页 · 班长维度 · 供电可靠性系统 · 周报 · 第三方回访', rule: '第三方客户满意度、中压客户平均停电时间、快速复电成功率、中压线路故障跳闸次数、故障平均停电用户数降幅各占 10%，单项得分 0–120 分按责任书评分标准计算；安全生产过程管理为风险指标，低于 50 分按差值扣分' },
  { k: 'task', n: '重点任务', pts: 10, src: '员工年度业绩责任书 · 重点任务里程碑 · 周报', rule: '落实调度安全生产工作任务 4%、推动配电网高质量发展 4%、配网"六百二零"攻坚行动 2%，按各项里程碑计分规则计算，单项最高 120 分' },
  { k: 'eval', n: '综合评价', pts: 40, src: '派工记录 · 两票台账 · 周报报送 · 违章台账 · 安全活动台账 · 创新成果登记', rule: '政治过硬 15%、勇于创新 10%、作风优良 15%，由部门按评价要点评价；页面按台账证据给出初步分（基准分加减证据项），由部门确认后使用' }
];
const LPERF_GRADE = [[90, '优秀', 'ok'], [80, '良好', 'ok'], [70, '合格', 'w'], [0, '需改进', 'bad']];
const LPERF_APPLY = { '优秀': '月度绩效上浮一档；推荐参评局级优秀班组长；可申报星级工程师升星', '良好': '月度绩效按标准档；短板项列入下季度改进要求', '合格': '月度绩效按标准档下限；由部门与本人签一份改进承诺，逐月回访', '需改进': '月度绩效下浮一档；部门约谈并限期两个月整改，整改期内不参加评优' };
const LPERF_HIST = { '赵立群': [85.2, 86.4, 88.1], '周建国': [92.0, 92.8, 93.6], '陈志远': [80.4, 79.1, 77.6] };
/* 未接入台账的两个班组给预设输入项，已在讲师演示台状态清单标注；配电自动化班一律取本机台账实时值 */
const LPERF_IN = {
  '配电自动化班': { absent: 1, wkMiss: 0 },
  '试验班': { vio: 0, absent: 0, wkMiss: 0, late: 0, pend: 0 },
  '配电运维一班': { vio: 2, absent: 2, wkMiss: 1, late: 1, pend: 1 }
};
function lperfIn(team) {
  const pre = LPERF_IN[team] || {}; const own = team === TEAM.name;
  return { vio: own ? VIOLATIONS.length : pre.vio, absent: pre.absent, wkMiss: pre.wkMiss,
    late: own ? DB.jobs().filter(j => j.st === '待派' && j.dateIso <= TODAY).length : pre.late,
    pend: own ? DB.tickets().filter(t => t.st === '待审').length : pre.pend };
}
function lperfOf(name) {
  const L = LEADERS.find(l => l.n === name) || LEADERS[0]; const team = L.team; const I = lperfIn(team);
  const kpis = LPERF_KPI.map(([k, w]) => { const r = kpiRow(k, w, team); return Object.assign(r, { pts: +(r.s / 1.2 * w / 100).toFixed(2) }); });
  const proc = kpiRow('proc', 0, team); const risk = proc.v != null && proc.v < 50 ? +(50 - proc.v).toFixed(1) : 0;
  const tasks = LPERF_TASKS.map(t => { const r = t.calc(team); return Object.assign({}, t, r, { pts: +(r.s / 1.2 * t.w / 100).toFixed(2) }); });
  const evals = LPERF_EVAL.map(e => { const items = e.items(team, I); const s = Math.max(0, Math.min(100, items.reduce((a, x) => a + x[1], e.base))); return Object.assign({}, e, { items, s, pts: +(s * e.w / 100).toFixed(2) }); });
  const mk = (d, rows, items) => { const sc = +rows.reduce((a, x) => a + x.pts, 0).toFixed(1); const pct = Math.round(sc / d.pts * 100); return Object.assign({}, d, { sc, pct, cls: pct >= 90 ? 'ok' : pct >= 75 ? 'w' : 'bad', rows, items }); };
  const D = [
    mk(LPERF_DIMS[0], kpis, kpis.map(r => [r.n + ' ' + r.vTxt + '（' + r.s + ' 分）', +(r.w - r.pts).toFixed(1)])),
    mk(LPERF_DIMS[1], tasks, tasks.map(r => [r.n + '：' + r.txt + '（' + r.s + ' 分）', +(r.w - r.pts).toFixed(1)])),
    mk(LPERF_DIMS[2], evals, evals.map(r => [r.n + '：' + r.items.filter(x => x[1]).map(x => x[0]).join('、') + '（' + r.s + ' 分）', +(r.w - r.pts).toFixed(1)]))
  ];
  const adjRows = LPERF_ADJ[name] || []; const adj = Math.max(-2, Math.min(2, adjRows.reduce((s, x) => s + x[1], 0))); const red = LPERF_RED[name] || null;
  let total = +(D.reduce((s, d) => s + d.sc, 0) - risk + adj).toFixed(1); if (red) total = Math.min(total, 69.9);
  const g = LPERF_GRADE.find(x => total >= x[0]);
  const rank = D.slice().sort((a, b) => b.pct - a.pct);
  const hist = LPERF_HIST[name] || [];
  const subs = kpis.map(r => ({ n: r.n, p: r.s / 1.2 })).concat(tasks.map(r => ({ n: r.n, p: r.s / 1.2 })), evals.map(r => ({ n: r.n, p: r.s }))).sort((a, b) => a.p - b.p);
  return { L, team, dims: D, kpis, tasks, evals, proc, risk, adj, adjRows, red, total, grade: g[1], gradeCls: g[2], strong: rank.slice(0, 2), weak: rank.slice(-2).reverse(), lowSubs: subs.slice(0, 3), apply: LPERF_APPLY[g[1]], hist: hist.concat([total]), delta: hist.length ? +(total - hist[hist.length - 1]).toFixed(1) : 0, input: I };
}
function lperfAll() { return LEADERS.map(l => lperfOf(l.n)); }

/* ---------- 同类班组横向对比（配网资产部三班组）---------- */
function compareRows() { const m = DB.month(); const T = {}; TEAMS.forEach(t => { T[t.n] = t; }); const st = { '配电自动化班': teamStat('配电自动化班'), '试验班': teamStat('试验班'), '配电运维一班': teamStat('配电运维一班') };
  const hoursOf = { '配电自动化班': PEOPLE.reduce((s, p) => s + p.week, 0), '试验班': Object.values(LAB.week).reduce((s, x) => s + x, 0), '配电运维一班': 69 };
  return [
    { k: 'jobs', n: '本月任务完成', unit: '', vals: { '配电自动化班': m.jobsDone + '/' + m.jobs, '试验班': '60/60', '配电运维一班': '42/42' }, num: { '配电自动化班': +(m.jobsDone / m.jobs * 100).toFixed(0), '试验班': 100, '配电运维一班': 100 }, high: true },
    { k: 'load', n: '人均本周外勤工时', unit: 'h', num: { '配电自动化班': +(hoursOf['配电自动化班'] / 12).toFixed(1), '试验班': +(hoursOf['试验班'] / 8).toFixed(1), '配电运维一班': +(69 / 11).toFixed(1) }, limit: WEEK_LIMIT * 0.75, high: false, note: '约定每人每周外勤 ≤ 24 小时' },
    { k: 'over', n: '本周外勤超 24 小时人数', unit: '人', note: '班组约定每人每周外勤不超过 24 小时，超出需班长确认', num: { '配电自动化班': PEOPLE.filter(p => p.week > WEEK_LIMIT).length, '试验班': Object.values(LAB.week).filter(x => x > WEEK_LIMIT).length, '配电运维一班': 0 }, high: false, note: '班组约定每人每周外勤不超过 24 小时，超出需班长确认' },
    { k: 'tk', n: '两票合格率', unit: '%', num: { '配电自动化班': +(m.ticketsOK / m.tickets * 100).toFixed(1), '试验班': 100, '配电运维一班': 100 }, high: true },
    { k: 'df', n: '缺陷闭环', unit: '', vals: { '配电自动化班': m.defectsClosed + '/' + m.defectsFound + (DB.defects().filter(d => /超期/.test(d.st)).length ? ' · 超期 ' + DB.defects().filter(d => /超期/.test(d.st)).length : ''), '试验班': '—', '配电运维一班': '17/18' }, num: { '配电自动化班': +(m.defectsClosed / m.defectsFound * 100).toFixed(0), '试验班': null, '配电运维一班': 94 }, high: true },
    { k: 'cap', n: '人均核心技能实操量', unit: '次', num: { '配电自动化班': skill9PerCap(), '试验班': 34.5, '配电运维一班': 18.2 }, high: true, note: '附表 1 按排名取得分比例' },
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
  const perf = [{ g: '绩效持续偏低', lv: '中', team: '配电自动化班', who: '王安', t: '本月学时 0，核心技能实操量低于人均 30%，两季度履职证据偏少', act: 'talk', src: '学时台账 · 作业授权台账' }, { g: '绩效持续偏低', lv: '中', team: '配电运维一班', who: '罗天', t: '连续两季度考评靠后，岗位胜任评价待提升 2 项', act: 'talk', src: '绩效考评记录' }];
  const stab = [{ g: '队伍稳定性', lv: '中', team: '试验班', who: '刘畅', t: '借调配电运维一班 ' + Math.round((new Date(TODAY) - new Date(LAB.borrowed[0].since)) / 86400000) + ' 天，无返岗时间', act: 'transfer', src: '跨班组调配台账' }, { g: '队伍稳定性', lv: '中', team: '试验班', who: '陈晨', t: '学员提出转岗意向，试验班近一年无新进人员', act: 'talk', src: '谈心记录' }, { g: '队伍稳定性', lv: '低', team: '配电运维一班', who: '—', t: '近三年离职 2 人，30 岁以下 6/11，初级作业员 4 人只持准入证', act: 'ladder', src: '人员名册' }];
  return rot.concat(att, perf, stab);
}

/* ---------- 员工关怀：入职关键年份 / 回访 / 高强度 / 重点关注 ---------- */
const JOIN = { '赵立群': '2004-07', '韩雪': '2011-08', '黄伟强': '2008-09', '李文博': '2016-10', '吴倩': '2018-07', '郭子扬': '2020-08', '赵敏': '2021-09', '王安': '2017-08', '陈浩': '2023-07', '周明': '2024-07', '林芷若': '2024-08', '刘一鸣': '2025-09' };
const KEY_YEARS = [5, 10, 15, 20, 25, 30];
const JOIN_LAB = { '周建国': '2000-07', '张伟': '2009-07', '刘畅': '2014-08', '吴磊': '2017-07', '孙倩': '2020-08', '马涛': '2023-07', '何静': '2024-07', '陈晨': '2024-08' };
const JOIN3 = { '陈志远': '2010-07', '林小虎': '2013-07', '郑浩': '2015-08', '邓丽': '2016-07', '冯超': '2018-07', '叶芳': '2020-07', '谭俊': '2021-08', '罗天': '2023-09', '曾静': '2024-07', '方远': '2024-08', '高子安': '2025-08' };
function joinOf(n) { return JOIN[n] || JOIN_LAB[n] || JOIN3[n] || ''; }
/* 新进人员窗口：相对今天（2026-08）向前 12 个月 / 36 个月 */
const NEW_WIN = { y1: '2025-08', y3: '2023-08' };
function newHires(team) { const ps = teamPeople(team); const rows = ps.map(p => ({ p, d: joinOf(p.n) })).filter(x => x.d).sort((a, b) => b.d.localeCompare(a.d));
  const l1 = rows.filter(x => x.d >= NEW_WIN.y1), l3 = rows.filter(x => x.d >= NEW_WIN.y3);
  return { team, y1: l1.length, y3: l3.length, list1: l1, list3: l3, pct3: Math.round(l3.length / ps.length * 100) }; }

const FOLLOWUPS = [{ who: '黄伟强', t: '家中老人住院，已排两天室内；回访问恢复情况与下周排班', due: '2026-08-14', from: '2026-07-31 谈心' }, { who: '王安', t: '约定 8 月补两门课；回访学时进度', due: '2026-08-31', from: '2026-06-30 谈心' }, { who: '刘一鸣', t: '想学继保，已安排跟黄伟强旁站；回访旁站感受', due: '2026-08-17', from: '2026-07-17 谈心' }];
function careList() {
  const out = [];
  PEOPLE.forEach(p => { const [y, m] = JOIN[p.n].split('-').map(Number); const yrs = 2026 - y; if (KEY_YEARS.includes(yrs)) { const days = Math.round((new Date('2026-' + String(m).padStart(2, '0') + '-15') - new Date(TODAY)) / 86400000); if (days >= -30 && days <= 90) out.push({ k: 'year', who: p.n, t: '入职 ' + yrs + ' 年（' + JOIN[p.n].replace('-', ' 年 ') + ' 月入职）', when: '2026-' + String(m).padStart(2, '0'), days, act: days <= 0 ? '本月' : days + ' 天后', sug: yrs >= 20 ? '班务会上表彰，申报局级荣誉' : yrs >= 10 ? '班务会上表彰，送一封感谢信到家属' : '班前会上说一句，送纪念工牌' }); } });
  FOLLOWUPS.forEach(f => { const days = Math.round((new Date(f.due) - new Date(TODAY)) / 86400000); out.push({ k: 'follow', who: f.who, t: f.t, when: f.due, days, act: days < 0 ? '已过期 ' + (-days) + ' 天' : days === 0 ? '今天' : days + ' 天后', sug: '来源：' + f.from }); });
  PEOPLE.filter(p => p.week >= WEEK_LIMIT).forEach(p => out.push({ k: 'load', who: p.n, t: '本周外勤 ' + p.week + ' 小时' + (p.week > WEEK_LIMIT ? '，超出约定 ' + (p.week - WEEK_LIMIT) + ' 小时' : '，到约定上限'), when: TODAY, days: 0, act: '本周', sug: '下周排两天室内；问一句家里情况' }));
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
  { d: '2026-09-12', kind: '团建', t: '配网资产部秋季团建（羊台山徒步）', team: '三班组', st: '待审批', who: '工会小组', n: 31 },
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
function perfRows() { const ok = LS.get('perf_ok', {}); const adj = LS.get('perf_adj', {}); return PEOPLE.map(p => { const E = evidenceOf(p); const rows = E.rows || []; const n = rows.length; const s9 = skill9Of(p); const base = 1.0; let co = base; if (p.week > WEEK_LIMIT) co += 0.05; if (s9.total >= skill9PerCap()) co += 0.05; if (p.hours.m >= 5) co += 0.03; if (p.hours.m === 0) co -= 0.05; if (skill9Low().some(x => x.n === p.n)) co -= 0.05; if (HONORS.some(h => h.who === p.n && h.d >= '2026-01')) co += 0.05; if (MENTORS.some(m => m.m === p.n)) co += 0.03; co = +(co + (adj[p.n] || 0)).toFixed(2); const why = []; if (p.week > WEEK_LIMIT) why.push('外勤超 24 小时'); if (s9.total >= skill9PerCap()) why.push('实操量达人均'); if (p.hours.m >= 5) why.push('本月学时 ≥ 5'); if (p.hours.m === 0) why.push('本月学时 0'); if (skill9Low().some(x => x.n === p.n)) why.push('实操量低于人均 30%'); if (HONORS.some(h => h.who === p.n && h.d >= '2026-01')) why.push('本年获荣誉'); if (MENTORS.some(m => m.m === p.n)) why.push('带徒'); return { p, co, why, evid: n, ok: !!ok[p.n], nonm: co >= 1.08 ? '评优推荐' : co >= 1.03 ? '班务会表扬' : co < 1 ? '补课与带教任务' : '培训机会' }; }); }
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
