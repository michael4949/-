/* ===== 业绩贡献评价（附件5-5 技能专家业绩贡献评价标准）+ 五类专家综合评价权重（附件1 三、（二）综合评价程序）=====
   分值表、等级、排名档、上限与限填项数照录标准原文；自评结果由本人填报，最终得分以评审专家组复评为准。 */

const PERF_R4 = ['项目负责排名第1', '项目负责排名第2', '项目负责排名前5', '其他主要参与人'];
const PERF_R3 = ['主编', '核心起草人员', '一般人员'];
/* 按排名等差递减：给定首位与末位分值，中间等差 */
function perfRank(first, last, n, rank) { if (n <= 1) return first; const r = Math.max(1, Math.min(n, rank)); return +(first - (first - last) * (r - 1) / (n - 1)).toFixed(2); }

const PERF_STD = [
  {
    g: '工作成果', items: [
      { c: '101-104', n: '解决问题', d: '主持或重要参与解决电网、电厂运行建设中的生产技术问题，取得显著成效', type: 'grid', roles: PERF_R4, max: 23,
        lv: [['国家级', [15, 12, 9, 6]], ['南网公司级', [10, 8, 6, 4]], ['分子公司级', [8, 6.4, 4, 3.2]], ['地市企业级', [5, 4, 2.5, 2]]],
        note: '清单制与申报制结合；人资部公示 15 项任务清单，另可额外申报 8 项。需技术研究报告、表彰决定、竣工验收报告等证明，技术报告需公告发文、三级领导人签字、报告原件、本部门盖章。' },
      { c: '201-204', n: '工艺创新', d: '研究新方法，开发新产品／新装置／新工艺／新材料，提高生产建设效率并推广实施，产生显著效益', type: 'grid', roles: PERF_R4, max: 5,
        lv: [['国家级', [15, 12, 9, 6]], ['南网公司级', [10, 8, 6, 4]], ['分子公司级', [8, 6.4, 4, 3.2]], ['地市企业级', [5, 4, 2.5, 2]]],
        note: '申报制，限填 5 项以内。需红头文件、推广应用成效及角色排名证明，由归口部门签字盖章。' }
    ]
  },
  {
    g: '技术标准', items: [
      { c: '301-305', n: '技术标准编制', d: '主持或主要编制（修订）以正式文件发布的技术标准类文件', type: 'grid', roles: PERF_R3, max: 3,
        lv: [['国际标准', [20, 10, 5]], ['国家标准', [10, 7, 3.5]], ['行业标准、地方标准', [6, 4, 2]], ['团体标准', [3, 2, 1]], ['企业标准', [3, 2, 1]]],
        note: '限填 3 项以内。行业级及以上修订与新编等值，其他修订按新编的 50% 计；同一标准已获技术标准奖励的此处不重复计分。' }
    ]
  },
  {
    g: '规范编制', items: [
      { c: '401-404', n: '规范编制', d: '制度规范、技术手册、管理规定、实施细则、业务指导书、作业指导书等', type: 'grid', roles: PERF_R3, max: 5,
        lv: [['行业级及以上', [5, 3, 1.5]], ['南网公司级', [3, 2, 1]], ['分子公司级', [1, 0.5, 0.25]], ['地市企业级', [0.5, 0.25, 0.125]]],
        note: '限填 5 项以内。已包含在制度、规范中的业务指导书不重复计分；同一标准不得按设备型号、一二次等维度拆分罗列。' }
    ]
  },
  {
    g: '工作质量', cap: 30, capNote: '501–505 合计上限 30 分，其中 501 项上限 10 分', items: [
      { c: '501', n: '两票或营销类作业表单合格连续累计数', d: '近三年，安全生产信息系统中担任工作负责人、工作班成员、许可人、会签人、签发人的工作票与担任操作人、监护人的操作票累计数量', type: 'step', step: 50, per: 2, unit: '张', cap: 10, note: '满 50 张得 2 分，每增加 50 张加 2 分；本项上限 10 分。' },
      { c: '502', n: '操作无差错连续累计次数', d: '近三年', type: 'step', step: 1000, per: 2, unit: '次', note: '满 1000 次得 2 分，每增加 1000 次增加 2 分。' },
      { c: '503', n: '发现／处理缺陷累计数', d: '近三年', type: 'step', step: 30, per: 2, unit: '项', note: '满 30 项得 2 分，每增加 30 项增加 2 分。' },
      { c: '504', n: '年度绩效 A 次数', d: '近三年', type: 'count', per: 4, unit: '次', note: '4 分／次。' },
      { c: '505', n: '获得通报表扬', d: '近三年', type: 'grid', roles: ['次数'], lv: [['南网公司级', [3]], ['分子公司级', [2]], ['地市企业级', [1]]], note: '南网公司级 3 分／次、分子公司级 2 分／次、地市企业级 1 分／次。' }
    ]
  },
  {
    g: '新技能应用', items: [
      { c: '601-603', n: '南方电网公司价值创造奖、管理创新奖、科技进步奖', type: 'rank',
        lv: [['一等', 6, 3, 15], ['二等', 4, 2, 9], ['三等', 2.5, 1.5, 7]],
        note: '按排名等差递减；科技进步奖按标准分值 1.5 倍计分；同一成果与解决问题、技改项目只按最高项计分。' },
      { c: '604-606', n: '分子公司价值创造奖、管理创新奖、科技进步奖', type: 'rank',
        lv: [['一等', 2, 0.6, 15], ['二等', 0.9, 0.2, 10], ['三等', 0.3, 0.05, 7]], note: '按排名等差递减。' }
    ]
  },
  {
    g: '获得专利奖励', cap: 10, capNote: '此项积分上限 10 分', items: [
      { c: '701', n: '中国专利奖', type: 'grid', roles: ['排名第1', '排名第2', '排名第3'], lv: [['金奖', [30, 27, 14]], ['银奖', [22, 19, 10]], ['优秀奖', [15, 12, 7]]], note: '按最高等级获奖算分，单个专利不重复算分；此处计分的专利在「获得专利授权」不重复计分。' },
      { c: '702', n: '省部级、行业级专利奖（含深圳市）', type: 'grid', roles: ['排名第1', '排名第2', '排名第3'], lv: [['金奖', [10, 7, 5]], ['银奖', [7, 5, 3]], ['优秀奖', [5, 3, 2]]] },
      { c: '703', n: '地市专利奖', type: 'grid', roles: ['排名第1', '排名第2', '排名第3'], lv: [['金奖', [1.8, 1.2, 0.9]], ['银奖', [1.2, 0.6, 0.6]], ['优秀奖', [0.6, 0.3, 0.3]] ], note: '杰出级技能专家考评中，地市或分子公司专利奖不计分。' }
    ]
  },
  {
    g: '获得职工创新奖励', items: [
      { c: '801', n: '全国职工优秀技术创新成果奖', type: 'rank', lv: [['一等', 10, 2.2, 7], ['二等', 6, 1.2, 7], ['三等', 4, 1, 7]], note: '各等级排名得分按首位与末位等差递减计算；需获奖证书；全国 QC 奖只认政府颁发。' },
      { c: '802', n: '全国能源化学地质系统优秀职工技术创新成果奖、全国电力职工技术成果奖、国际 QC 奖', type: 'rank', lv: [['一等', 6, 1.2, 7], ['二等', 4, 0.4, 7], ['三等', 2.5, 0.1, 7]] },
      { c: '803', n: '南网公司职工技术创新奖、全国 QC 奖', type: 'rank', lv: [['一等', 5, 0.8, 7], ['二等', 3, 0.3, 7], ['三等', 2, 0.1, 7]] },
      { c: '804', n: '地市或分子公司职工技术创新奖、省部级（行业级）QC 奖', type: 'rank', lv: [['一等', 3, 0.5, 7], ['二等', 2, 0.3, 7], ['三等', 1, 0.1, 7]] },
      { c: '805', n: '其他等级 QC 奖', type: 'rank', lv: [['一等', 2, 0.5, 7], ['二等', 1, 0.3, 7], ['三等', 0.7, 0.1, 7]] }
    ]
  },
  {
    g: '技能成果', items: [
      { c: '901', n: '获得大众创新奖励', type: 'count', per: 0.1, unit: '项', cap: 1, note: '0.1 分／项，本项合计上限 1 分；杰出级、领军级技能专家不评估此项。' },
      { c: '1001-1004', n: '获得专利授权', type: 'grid', roles: ['项数单价'], max: 5,
        lv: [['国际发明专利', [5]], ['发明专利', [1]], ['实用新型专利（含软件著作）', [0.2]], ['外观设计专利', [0.1]]],
        note: '限填 5 项以内。同一专利已获专利奖的此处不重复计分；1001 仅含美国、日本、英国、澳大利亚发明专利。' },
      { c: '1101-1107', n: '参加技能竞赛并获奖', type: 'grid', roles: ['一等', '二等', '三等'],
        lv: [['国际级技能竞赛', [45, 40, 35]], ['国家部委（级）主办的全国技能竞赛', [33, 30, 27]], ['国家部委下属司局（级）主办的全国行业技能竞赛', [25, 22, 20]], ['行业协会主办的全国行业技能竞赛', [20, 16, 14]], ['省级／南网公司级技能竞赛', [14, 12, 10]], ['地市级政府／分子公司级技能竞赛', [10, 8, 6]], ['三级单位级技能竞赛', [6, 4, 2]]],
        note: '个人奖项按标准计分，团体奖项按标准的 20% 计分；竞赛获奖项目教练按相应项目得分标准的 40% 计分，教练积分上限 30 分。' }
    ]
  },
  {
    g: '人才发展成果', items: [
      { c: '1201-1205', n: '入选人才支持计划', type: 'grid', roles: ['第一档', '第二档', '第三档'],
        lv: [['国家级', [50, 45, 40]], ['省部级', [30, 25, 20]], ['地市政府级', [10, 8, 3]], ['南网公司级', [10, 8, 3]], ['分子公司级', [5, 3.5, 2]]],
        note: '同一申报人入选多个人才支持计划的，仅按最高等级计分一次。', max: 1 },
      { c: '1301-1306', n: '获得人才荣誉或奖励', type: 'grid', roles: ['第一档', '第二档', '第三档'],
        lv: [['国家级', [20, 15, 10]], ['省部级／行业级', [10, 8, 5]], ['地市政府级', [5, 3.5, 2]], ['南网公司级', [5, 3.5, 2]], ['分子公司级', [3, 2, 1]], ['地市企业级', [1, 0.8, 0.5]]],
        note: '指与专业领域相关的个人荣誉或奖励，以公司荣誉项目库为准；集体荣誉按标准的 20% 计分；仅按最高等级计分一次。', max: 1 },
      { c: '1401-1404', n: '发挥人才培养作用', d: '主持或主要参与培训评价标准或课件编制开发、各类题库编制、竞赛技术手册编制、岗位评价标准编制、评价任务等', type: 'grid', roles: ['组长', '核心成员', '一般人员'],
        lv: [['行业级及以上', [6, 4, 2.5]], ['南网公司级', [4, 3, 1]], ['分子公司级', [2, 1, 0.5]], ['地市企业级', [1, 0.5, 0.25]]],
        note: '核心人员指该项工作除组长外前 30% 的完成人员；担任技能竞赛教练的不在此项计分。' },
      { c: '1501-1504', n: '知识培训授课', type: 'grid', roles: ['1 个月及以上', '1 周及以上至 1 个月以下', '1 周以内'],
        lv: [['行业级及以上', [6, 4, 2.5]], ['南网公司级', [4, 3, 1]], ['分子公司级', [2, 1, 0.5]], ['地市企业级', [1, 0.5, 0.25]]],
        note: '按每项培训授课任务的培训周期计算，须提供红头文培训通知、课程安排表（含讲师姓名）。' },
      { c: '1601-1604', n: '人才交流', type: 'grid', roles: ['1 年及以上', '6 个月及以上'], cap: 9,
        lv: [['参与系统内交流挂职 · 南网公司级', [6, 3]], ['参与系统内交流挂职 · 分子公司级', [4, 2]], ['参与系统外交流挂职 · 国外交流', [9, 4.5]], ['参与系统外交流挂职 · 国内交流', [6, 3]]],
        note: '此项积分上限 9 分；系统内外借用借调可计分，需有正式手续／发文。' },
      { c: '1701', n: '人才培养成效 · 培养徒弟', d: '近三年发挥传帮带作用', type: 'count', per: 1, unit: '名', cap: 2, note: '每培养 1 名徒弟加 1 分，上限 2 分；必须提供所在部门（单位）盖章的师徒协议。' },
      { c: '1702', n: '高技能等级人才培养 · 技师', d: '近三年辅导员工参加高技能等级考试', type: 'count', per: 1, unit: '名', note: '每培养 1 名技师加 1 分；须提供正式发文、资格证书与盖章的人才培养证明。' },
      { c: '1702b', n: '高技能等级人才培养 · 高级技师', type: 'count', per: 2, unit: '名', note: '每培养 1 名高级技师加 2 分。' },
      { c: '1703', n: '专家个人从技师提升为高级技师', d: '近三年', type: 'count', per: 2, unit: '次', max: 1, note: '加 2 分。' }
    ]
  }
];
/* 1401-1404 与 1501-1504 合计上限 20 分 */
const PERF_LINK_CAP = [{ codes: ['1401-1404', '1501-1504'], cap: 20, n: '发挥人才培养作用 + 知识培训授课' }];

function perfItemScore(it, v) {
  if (!v) return 0;
  const n = Math.max(0, +v.n || 0);
  let sc = 0;
  if (it.type === 'count') sc = n * it.per;
  else if (it.type === 'step') sc = Math.floor(n / it.step) * it.per;
  else if (it.type === 'rank') { const L = it.lv[v.lv | 0]; if (!L) return 0; sc = perfRank(L[1], L[2], L[3], +v.rank || 1) * n; }
  else { const L = it.lv[v.lv | 0]; if (!L) return 0; sc = (L[1][v.role | 0] || 0) * n; }
  if (it.max) sc = Math.min(sc, it.type === 'grid' || it.type === 'rank' ? sc : sc);
  if (it.cap != null) sc = Math.min(sc, it.cap);
  return +sc.toFixed(2);
}
function perfCalc(vals) {
  const groups = PERF_STD.map(g => {
    const items = g.items.map(it => ({ it, sc: perfItemScore(it, vals[it.c]), n: (vals[it.c] || {}).n || 0 }));
    let sum = +items.reduce((a, b) => a + b.sc, 0).toFixed(2);
    const capped = g.cap != null && sum > g.cap;
    if (capped) sum = g.cap;
    return { g: g.g, cap: g.cap, capNote: g.capNote, capped, items, sum };
  });
  const linked = PERF_LINK_CAP.map(L => {
    const raw = +PERF_STD.flatMap(g => g.items).filter(it => L.codes.includes(it.c)).reduce((a, it) => a + perfItemScore(it, vals[it.c]), 0).toFixed(2);
    return { n: L.n, cap: L.cap, raw, over: raw > L.cap };
  });
  let total = +groups.reduce((a, b) => a + b.sum, 0).toFixed(2);
  linked.forEach(L => { if (L.over) total = +(total - (L.raw - L.cap)).toFixed(2); });
  return { groups, linked, total: Math.min(100, total), raw: total };
}
/* 自评建议：还有空间的方向、要补的证明材料、可申报项数余量 */
function perfAdvice(r, vals) {
  const out = []; const empty = [];
  r.groups.forEach(g => {
    const filled = g.items.filter(x => x.n > 0);
    if (!filled.length) { empty.push(g.g); return; }
    if (g.capped) out.push({ t: g.g, s: '已触上限', d: g.capNote + '，再补报同类业绩不再增分，建议把材料放到其他一级指标。' });
    filled.forEach(x => { if (x.it.max && x.n > x.it.max) out.push({ t: g.g, s: x.it.n + ' 超限填项数', d: '标准限填 ' + x.it.max + ' 项，超出部分不计分，建议只报最高等级的 ' + x.it.max + ' 项。' }); });
  });
  r.linked.forEach(L => { if (L.over) out.push({ t: '人才发展成果', s: L.n + ' 合计超上限', d: '两项合计上限 ' + L.cap + ' 分，自评填报折合 ' + L.raw + ' 分，超出部分不计入。' }); });
  if (empty.length) out.push({ t: '还有空间的方向', s: empty.length + ' 类未填报', d: empty.join('、') + ' 目前一项未填。这几类按标准都可直接计分，建议核对近三年台账与获奖、发文记录后补报。' });
  out.push({ t: '评价方式', s: '三个环节', d: '业绩评价分组内合议、存疑修正、组织复评三个环节；成果及排名已公开发文的按标准化成果计量，没有发文依据的重要业绩事项走清单制与申报制，两者不可重复。' });
  out.push({ t: '证明材料', s: '按标准逐项备齐', d: '工作成果类需技术研究报告、表彰决定、竣工验收报告等，技术报告要公告发文、三级领导人签字、报告原件与本部门盖章；奖项类需获奖证书；培养类需盖章的师徒协议与人才培养证明。' });
  return out;
}

/* ---------- 五类专家：面试答辩评价标准与综合评价权重 ---------- */
/* 专业技术专家代表性成果评价标准（附件6 一、（一））：指标按权重折算，每项 0–100 分，分三档 */
const EXP_ACH = {
  tech: { n: '代表性成果评价标准 · 科研序列 / 技术序列', items: [
    { k: 'orig', n: '原创性', w: 40, mean: '成果在业务攻关中解决关键难题并取得重大突破，掌握核心技术并进行集成创新的程度，自主创新在总体成果中的比重', lv: [['优秀', '有重大突破或创新，且完全自主创新', 90, 100], ['良好', '有明显突破或创新，多项子成果自主创新', 60, 89], ['一般', '创新程度不高，单项子成果有创新', 0, 59]] },
    { k: 'adv', n: '先进性', w: 40, mean: '与国内外最先进的技术或成果相比，其总体水平、主要技术、理念、经济、环境、生态等指标所处的位置', lv: [['优秀', '达到同类技术领先水平', 90, 100], ['良好', '达到同类技术先进水平', 60, 89], ['一般', '接近同类技术先进水平', 0, 59]] },
    { k: 'cplx', n: '复杂性', w: 20, mean: '技术或成果的实现对现有理论、模型、算法、其他技术的依赖程度，以及实现的难度和复杂程度', lv: [['优秀', '在自创的理论、模型等的支撑下的技术／成果实现，有很高的复杂性', 90, 100], ['良好', '引入跨领域的技术／成果得以实现，有较高的复杂性', 60, 89], ['一般', '在现有技术／成果基础上的改进，有一定的复杂性', 0, 59]] }
  ] },
  func: { n: '代表性成果评价标准 · 专业序列（职能类）', items: [
    { k: 'new', n: '创新性', w: 30, mean: '成果在业务攻关中解决关键难题并取得重大突破的程度，自主创新在总体成果中的比重', lv: [['优秀', '有重大突破或创新，且完全自主创新', 90, 100], ['良好', '有明显突破或创新，多项子成果自主创新', 60, 89], ['一般', '成效、效率显著提升或效益贡献突出', 0, 59]] },
    { k: 'use', n: '实用性', w: 40, mean: '成果已经达到实际应用的程度', lv: [['优秀', '该成果已经得到广泛应用，或该成果的落地应用程度高', 90, 100], ['良好', '该成果已经应用于实际工作，或该成果的落地应用程度较高', 60, 89], ['一般', '效率得到提升或效益贡献良好', 0, 59]] },
    { k: 'ben', n: '效益性', w: 30, mean: '成果对于解决公司重点、难点问题所起的作用，以及带来的直接或间接经济效益', lv: [['优秀', '成效、效率显著提升或效益贡献突出', 90, 100], ['良好', '该成果基本具备落地应用的条件', 60, 89], ['一般', '效率提升或效益贡献一般，或虽有提升但产生了其他负面效应', 0, 59]] }
  ] },
  mkt: { n: '代表性成果评价标准 · 专业序列（市场类）', items: [
    { k: 'new', n: '创新性', w: 20, mean: '成果在业务攻关中解决关键难题并取得重大突破，或在管理及商业模式上有重大的创新突破', lv: [['优秀', '有重大突破或创新，且完全自主创新', 90, 100], ['良好', '有明显突破或创新，多项子成果自主创新', 60, 89], ['一般', '创新程度不高，单项子成果有创新', 0, 59]] },
    { k: 'comp', n: '竞争力', w: 40, mean: '成果对于解决行业、公司重点难点问题，推动公司转型升级，提高核心竞争力或相关业务领域实力的作用', lv: [['优秀', '显著促进相关专业领域发展，在国内外具有显著竞争优势', 90, 100], ['良好', '推动相关专业领域发展作用明显，在国内外具有一定竞争优势', 60, 89], ['一般', '对相关专业领域发展有一定作用，在国内外竞争优势一般', 0, 59]] },
    { k: 'ben', n: '效益性', w: 40, mean: '成果有市场价值，能够带来直接或间接的经济效益', lv: [['优秀', '经济效益显著', 90, 100], ['良好', '经济效益良好', 60, 89], ['一般', '经济效益一般', 0, 59]] }
  ] }
};
/* 综合评价各环节分数占比（附件1 三、（二））。技能专家的技能实操与理论水平为现场考评环节，本平台不测评，按现场成绩录入 */
const EXP_KINDS = [
  { k: 'skill', n: '技能专家', pos: '侧重选拔在公司生产经营各专业领域工作实绩突出、技能水平出众、发展潜力较大，在基层一线发挥示范带头作用的技能人才', face: 'core',
    w: [['工作业绩评价', 'perf', 40], ['技能实操', 'lab', 30], ['理论水平', 'theory', 15], ['面试答辩（核心能力评价、招标竞聘）', 'face', 15]],
    faceNote: '含自我介绍、工作实例及专业见解、专家招标竞聘答辩、专家自由提问四部分' },
  { k: 'res', n: '专业技术专家（科研序列）', pos: '侧重选拔在工程科技领域开展关键核心技术攻关、解决关键科学技术问题并取得重要研究成果的科研人才', face: 'tech',
    w: [['业绩贡献评价', 'perf', 60], ['代表性成果评价', 'ach', 25], ['发展潜力评价（招标竞聘）', 'bid', 15]],
    faceNote: '含自我介绍、代表性成果展示、专家招标竞聘答辩、专家自由提问四部分' },
  { k: 'tech', n: '专业技术专家（技术序列）', pos: '侧重选拔在电网规划、基建工程、生产运维、电力营销、调度控制、供应链、数字化、安全监管等领域完成重大工程建设支撑、解决重大安全和生产技术问题、开展重点项目攻关的技术人才', face: 'tech',
    w: [['业绩贡献评价', 'perf', 60], ['代表性成果评价', 'ach', 25], ['发展潜力评价（招标竞聘）', 'bid', 15]],
    faceNote: '含自我介绍、代表性成果展示、专家招标竞聘答辩、专家自由提问四部分' },
  { k: 'func', n: '专业技术专家（专业序列-职能类）', pos: '侧重选拔在各非技术类职能业务领域解决重大问题、策划重大改革、推进重大专项工作并取得显著成效的专业技术人才', face: 'func',
    w: [['业绩贡献评价', 'perf', 60], ['代表性成果评价', 'ach', 20], ['发展潜力评价（招标竞聘）', 'bid', 20]],
    faceNote: '含自我介绍、代表性成果展示、专家招标竞聘答辩、专家自由提问四部分' },
  { k: 'mkt', n: '专业技术专家（专业序列-市场类）', pos: '侧重选拔在新兴、国际、金融等市场化业务中做出突出贡献、产生显著效益的专业技术人才', face: 'mkt',
    w: [['业绩贡献评价', 'perf', 60], ['代表性成果评价', 'ach', 25], ['发展潜力评价（招标竞聘）', 'bid', 15]],
    faceNote: '含自我介绍、代表性成果展示、专家招标竞聘答辩、专家自由提问四部分' }
];
function expKind(k) { return EXP_KINDS.find(x => x.k === k) || EXP_KINDS[0]; }
/* 面试答辩专家组（附件1 四、（三））：拔尖级 5 人 */
const EXP_PANEL = [
  ['组长', '业务归口部门三级干部（领军级由公司领导担任）'],
  ['人资评委', '人力资源部三级干部'],
  ['业务评委', '相关业务领域三级干部'],
  ['专家评委', '不参与选聘的领军级及以上专家、专家委成员或内外部高水平专家']
];
/* 综合报告：业绩 + 面试按类别权重折算 */
function expOverall(kindK, perfTotal, face) {
  const K = expKind(kindK);
  const rows = K.w.map(([n, k, w]) => {
    let v = null, src = '';
    if (k === 'perf') { v = perfTotal; src = '业绩贡献自评（附件5-5）'; }
    else if (k === 'face') { v = face.core; src = '本次答辩 · 核心能力评价'; }
    else if (k === 'ach') { v = face.ach; src = '本次答辩 · 代表性成果评价'; }
    else if (k === 'bid') { v = face.bid; src = '本次答辩 · 招标竞聘'; }
    else { v = (face.site && face.site[k] != null) ? face.site[k] : null; src = '现场考评环节 · ' + (v == null ? '未录入' : '已录入成绩'); }
    return { n, k, w, v, src, part: v == null ? null : +(v * w / 100).toFixed(1) };
  });
  const got = rows.filter(r => r.part != null);
  const wSum = got.reduce((a, b) => a + b.w, 0);
  const sum = +got.reduce((a, b) => a + b.part, 0).toFixed(1);
  return { K, rows, sum, wSum, norm: wSum ? +(sum / wSum * 100).toFixed(1) : 0 };
}

/* 代表性成果评价：把各题得分按指标映射折算成 0–100，再按权重合计 */
const EXP_ACH_MAP = { tech: { orig: 'new', adv: 'adv', cplx: 'use' }, func: { new: 'new', use: 'use', ben: 'adv' }, mkt: { new: 'new', comp: 'adv', ben: 'use' } };
function expAch(kindK, rounds) {
  const K = expKind(kindK); const sheet = EXP_ACH[K.face]; if (!sheet) return null;
  const map = EXP_ACH_MAP[K.face] || {};
  const by = {}; rounds.forEach(r => { const s = r.q.std; (by[s] = by[s] || []).push(r.sc.total); });
  const items = sheet.items.map(it => {
    const src = map[it.k]; const arr = by[src] || [];
    const v = arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
    const lv = v == null ? null : (it.lv.find(l => v >= l[2] && v <= l[3]) || it.lv[it.lv.length - 1]);
    return { item: it, v, lv };
  });
  const got = items.filter(x => x.v != null);
  const sum = got.length ? Math.round(got.reduce((a, b) => a + b.v * b.item.w, 0) / got.reduce((a, b) => a + b.item.w, 0)) : 0;
  return { sheet, items, sum };
}

/* ---------- 导出 Excel：离线生成带格式的 .xls（HTML 表格 + Excel MIME），可直接用 Excel 打开 ---------- */
function xlsEsc(v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
/* blocks: [{ t: 小标题, sub: 说明, head: [列名], rows: [[值]], w: [列宽], mark: (r,c,v)=>'ok'|'bad'|'w'|'' }] */
function xlsDownload(fileName, title, sub, blocks) {
  const sty = `<style>
    table{border-collapse:collapse;font-family:"Microsoft YaHei",Arial;font-size:11pt}
    td,th{border:.5pt solid #b8c0b8;padding:5px 8px;vertical-align:top}
    .t1{font-size:16pt;font-weight:bold;color:#1f4d33;border:none;padding:10px 0 2px}
    .t2{font-size:10pt;color:#6b7a6e;border:none;padding:0 0 10px}
    .h{background:#e8efe9;font-weight:bold;color:#1f4d33}
    .s{background:#f4f7f4;font-weight:bold;color:#1f4d33;font-size:12pt}
    .ok{background:#eaf5ee;color:#1f6b42;font-weight:bold}
    .bad{background:#fbeded;color:#a52a2a;font-weight:bold}
    .w{background:#fdf6e7;color:#8a5a12;font-weight:bold}
    .num{mso-number-format:"0.0#";text-align:right}
  </style>`;
  const body = blocks.map(b => {
    const cols = (b.head || []).length || 1;
    const head = b.head ? `<tr>${b.head.map(x => `<th class="h">${xlsEsc(x)}</th>`).join('')}</tr>` : '';
    const rows = (b.rows || []).map((r, ri) => `<tr>${r.map((c, ci) => `<td class="${b.mark ? (b.mark(ri, ci, c) || '') : ''}">${xlsEsc(c)}</td>`).join('')}</tr>`).join('');
    return `<tr><td class="s" colspan="${cols}">${xlsEsc(b.t)}${b.sub ? ' <span style="font-weight:normal;font-size:9pt;color:#6b7a6e">' + xlsEsc(b.sub) + '</span>' : ''}</td></tr>${head}${rows}<tr><td colspan="${cols}" style="border:none;height:8px"></td></tr>`;
  }).join('');
  const cols = Math.max.apply(null, blocks.map(b => (b.head || []).length || 1));
  const html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8">${sty}</head><body>
    <table><tr><td class="t1" colspan="${cols}">${xlsEsc(title)}</td></tr><tr><td class="t2" colspan="${cols}">${xlsEsc(sub)}</td></tr>${body}</table></body></html>`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + html], { type: 'application/vnd.ms-excel;charset=utf-8' }));
  a.download = fileName; a.click();
}
