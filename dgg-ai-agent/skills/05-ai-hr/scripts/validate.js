// 内核自检：对三套样本做结构与逻辑断言。改内核或样本后先跑 run-examples 再跑这里。
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const core = require('../core/hr.js');
const lib = require('./load-data.js')();
const lint = require('../../_shared/lint.js')(lib.lintWords);
const docparse = require('../../_shared/docparse.js');
let checks = 0;
const ok = (c, m) => { assert(c, m); checks++; };
const lintText = (t, where) => { const hits = lint.hard(String(t)); ok(hits.length === 0, where + ' 命中禁词: ' + hits.join(',')); };
const cfoDir = path.join(__dirname, '..', '..', '06-ai-cfo', 'data', 'samples');
const CFO = { make: 'mfg', flow: 'trade', service: 'prof' };

// 数据表自洽
Object.keys(lib.jobs.abilityWeights).forEach((f) => { const w = lib.jobs.abilityWeights[f]; ok(Math.abs(Object.keys(w).reduce((t, k) => t + w[k], 0) - 1) < 1e-9, '能力权重和 ' + f); });
ok(Math.abs(Object.keys(lib.jobs.screenWeights).reduce((t, k) => t + lib.jobs.screenWeights[k], 0) - 1) < 1e-9, '筛选权重和');
Object.keys(lib.jobs.jobs).forEach((k) => { const J = lib.jobs.jobs[k]; ok(J.title && J.family && J.band && J.band[0] < J.band[1], '岗位 ' + k); (J.must || []).concat(J.nice || []).forEach((s) => ok(lib.jobs.skills[s], k + ' 技能 ' + s)); (J.certs || []).forEach((s) => ok(lib.jobs.certs[s], k + ' 证书 ' + s)); if (J.proQuestions) { ok(J.proQuestions.length >= 3, k + ' 专业题'); J.proQuestions.forEach((q) => { ok(q.anchors['1'] && q.anchors['3'] && q.anchors['5'] && q.probe, k + ' 题锚点'); lintText(q.q + q.probe + Object.values(q.anchors).join(''), k + ' 题'); }); } (J.duties || []).forEach((t) => lintText(t, k + ' 职责')); });
['coop', 'stable', 'value'].forEach((a) => Object.keys(lib.jobs.families).forEach((f) => { const qs = lib.questions[a][f]; ok(qs && qs.length >= 3, '题库 ' + a + ' ' + f); qs.forEach((q) => { ok(q.anchors['1'] && q.anchors['3'] && q.anchors['5'], '题库锚点 ' + a + f); lintText(q.q + q.probe + Object.values(q.anchors).join(''), '题库 ' + a + f); }); }));
lib.complianceRules.rules.forEach((r) => { ok(r.id && r.name && r.law && r.action && r.action.label && ['fix', 'plan'].indexOf(r.mode) >= 0, '规则 ' + r.id); ok(!/第\s*\d+\s*条|第[一二三四五六七八九十百]+条/.test(r.law + r.desc), r.id + ' 依据写到条款'); lintText(r.name + r.desc + r.action.desc + r.impactNote, r.id); });
lintText(JSON.stringify(lib.jdBlocks), 'JD 段落块'); lintText(JSON.stringify(lib.costParams), '成本参数');

Object.keys(lib.samples).sort().forEach((k) => {
  const d = lib.samples[k];
  const before = JSON.stringify(d);
  const R = core.run(d, lib), R2 = core.run(d, lib);
  ok(JSON.stringify(R.kpi) === JSON.stringify(R2.kpi), k + ' 确定性');
  ok(JSON.stringify(d) === before, k + ' run 改动了原数据');
  const hc = d.employees.length, O = R.org;
  // 0. 与 AI CFO 账套口径一致：人数、工资总额、社保基数
  const cfo = JSON.parse(fs.readFileSync(path.join(cfoDir, CFO[k] + '.json'), 'utf8')), P = cfo.external.payroll;
  ok(hc === P.headcount, k + ' 人数与 CFO 不一致 ' + hc + ' vs ' + P.headcount);
  ok(R.cost.wages === P.gross[P.gross.length - 1], k + ' 工资总额与 CFO 不一致 ' + R.cost.wages);
  ok(R.cost.socialBase === P.socialBase[P.socialBase.length - 1], k + ' 社保基数与 CFO 不一致 ' + R.cost.socialBase);
  ok(R.cost.social === P.social[P.social.length - 1], k + ' 社保与 CFO 不一致 ' + R.cost.social + ' vs ' + P.social[P.social.length - 1]);
  // 1. 组织盘点
  ok(O.byDept.reduce((t, x) => t + x.headcount, 0) === hc && O.budget === d.departments.reduce((t, x) => t + x.budget, 0) && O.vacancy === O.budget - hc, k + ' 部门合计');
  ok(O.tenure.reduce((t, x) => t + x.value, 0) === hc && O.age.reduce((t, x) => t + x.value, 0) === hc && O.edu.reduce((t, x) => t + x.value, 0) === hc, k + ' 结构分桶');
  ok(O.turnover === Math.round(100 * d.leavers.length / hc) && O.leaversByMonth.length === 12 && O.leaversByMonth.reduce((t, x) => t + x.count, 0) === d.leavers.length, k + ' 离职统计');
  ok(O.reasons.reduce((t, x) => t + x.value, 0) === d.leavers.length, k + ' 离职原因');
  d.employees.forEach((e) => { ok(/^E-\d{3}$/.test(e.id) && !e.name, k + ' 员工记录 ' + e.id); ok(e.socialBase <= e.wage && e.wage > 0, k + ' ' + e.id + ' 基数不超过工资'); ok(lib.jobs.jobs[e.job], k + ' ' + e.id + ' 岗位 ' + e.job); });
  ok(O.perCapitaRevenue === Math.round(d.profile.revenue12 / hc), k + ' 人均产值');
  // 2. JD：两版无占位符、含关键信息、长度合理；发布写回
  d.needs.forEach((n) => {
    ['site', 'poster'].forEach((v) => {
      const j = core.jd(d, n.id, lib, v);
      ok(!/\{\w+\}/.test(j.text), k + ' JD 占位符 ' + n.id + ' ' + v + ' ' + (j.text.match(/\{\w+\}/) || [])[0]);
      ok(j.text.indexOf(j.jobTitle) >= 0 && j.text.indexOf(core.fmtN(j.band[0])) >= 0 && j.text.indexOf(d.company) >= 0, k + ' JD 内容 ' + n.id);
      ok(v === 'site' ? (j.words >= 320 && j.words <= 800) : (j.words >= 120 && j.words <= 400), k + ' JD 长度 ' + n.id + ' ' + v + ' ' + j.words);
      ok(j.sections.length === 5 && !j.published, k + ' JD 结构 ' + n.id);
      lintText(j.text, k + ' JD ' + n.id);
    });
    const dp = core.publish(d, n.id, 'poster', lib); const jp = core.jd(dp, n.id, lib, 'poster');
    ok(jp.published && jp.publishedVariant === 'poster' && dp.log.length === 1 && core.run(dp, lib).kpi.published === 1, k + ' 发布 ' + n.id);
  });
  ok(JSON.stringify(d) === before, k + ' publish 改动了原数据');
  // 3. 简历打分
  const grades = { A: 0, B: 0, C: 0, D: 0 };
  R.candidates.forEach((c, i) => {
    const s = c.score; grades[c.grade]++;
    Object.keys(s.dims).forEach((x) => ok(s.dims[x] >= 0 && s.dims[x] <= 100, k + ' ' + c.id + ' 维度 ' + x));
    const exp = Math.round(Object.keys(lib.jobs.screenWeights).reduce((t, x) => t + lib.jobs.screenWeights[x] * s.dims[x], 0));
    ok(c.total === exp, k + ' ' + c.id + ' 总分复算');
    const g = s.gates.length ? 'D' : c.total >= lib.jobs.grades.A ? 'A' : c.total >= lib.jobs.grades.B ? 'B' : 'C';
    ok(c.grade === g, k + ' ' + c.id + ' 等级');
    ok(s.seen.length === 4 && s.reasons.length >= 3 && s.reasons.length <= 5, k + ' ' + c.id + ' 解释');
    s.seen.concat(s.reasons).forEach((t) => { ok(!/\{\w+\}|undefined|NaN/.test(t), k + ' ' + c.id + ' 解释文本 ' + t); lintText(t, k + ' ' + c.id); });
    if (i) ok(c.total <= R.candidates[i - 1].total, k + ' 候选排序');
    ok(c.action && c.stageName && c.sourceName && c.eduName, k + ' ' + c.id + ' 字段');
    ok(/^C-\d{4}-\d{3}$/.test(c.id) && !c.name, k + ' 候选人记录 ' + c.id);
  });
  ok(grades.A >= 3 && grades.B >= 3 && grades.D >= 3 && grades.A <= R.candidates.length * 0.45, k + ' 等级分布 ' + JSON.stringify(grades));
  // 4. 流程写回：初筛 → 面试 → 评分 → offer；淘汰；原数据不动
  const fresh = R.candidates.filter((c) => c.stage === 'new' && c.grade !== 'D')[0];
  let d1 = core.pass(d, fresh.id); ok(core.run(d1, lib).byId[fresh.id].stage === 'screened', k + ' 通过初筛');
  d1 = core.schedule(d1, fresh.id, '2026-09-25'); const c1 = core.run(d1, lib).byId[fresh.id]; ok(c1.stage === 'interview' && c1.interviewDate === '2026-09-25', k + ' 安排面试');
  ok(core.run(d1, lib).calendar.items.some((i) => i.kind === 'interview' && i.ref === fresh.id), k + ' 面试进日历');
  d1 = core.score(d1, fresh.id, { pro: 5, coop: 4, stable: 4, value: 5 }, lib); const c2 = core.run(d1, lib).byId[fresh.id];
  ok(c2.stage === 'done' && c2.interview && c2.interview.verdict === 'hire', k + ' 录入评分');
  const kit = core.interviewKit(d1, c2, lib); ok(kit.sets.length === 4 && kit.sets.every((s) => s.questions.length >= 2) && kit.interviewers.length >= 2 && Math.abs(kit.sets.reduce((t, s) => t + s.weight, 0) - 1) < 1e-9, k + ' 面试题包');
  const Wt = lib.jobs.abilityWeights[c2.family]; const avg = Math.round(100 * Object.keys(Wt).reduce((t, x) => t + Wt[x] * c2.scores[x], 0)) / 100;
  ok(c2.interview.avg === avg && c2.interview.suggested >= c2.interview.band[0] && c2.interview.suggested <= c2.interview.band[1] && c2.interview.suggested % 100 === 0 && c2.interview.radar.length === 4, k + ' 面试结果');
  c2.interview.notes.forEach((t) => lintText(t, k + ' 定薪说明'));
  d1 = core.offer(d1, fresh.id, null, lib); const c3 = core.run(d1, lib).byId[fresh.id]; ok(c3.stage === 'offer' && c3.offer.salary === c2.interview.suggested && core.run(d1, lib).kpi.offers === 1 + R.kpi.offers, k + ' 发 offer');
  const low = core.score(d, fresh.id, { pro: 2, coop: 3, stable: 2, value: 3 }, lib); ok(core.run(low, lib).byId[fresh.id].interview.verdict === 'no', k + ' 低分不录用');
  const rj = core.reject(d, fresh.id); ok(core.run(rj, lib).byId[fresh.id].stage === 'rejected' && core.run(rj, lib).kpi.candidates === R.kpi.candidates - 1, k + ' 淘汰');
  ok(d1.log.length === 4 && JSON.stringify(d) === before, k + ' 流程日志与原数据');
  // 5. 合规
  const comp = R.compliance;
  ok(comp.items.length === lib.complianceRules.rules.length, k + ' 规则条数');
  comp.items.forEach((i) => {
    ok(i.impact === i.affected.reduce((t, a) => t + a.amount, 0), k + ' ' + i.id + ' 影响合计');
    i.affected.forEach((a) => { ok(a.id === '—' || d.employees.some((e) => e.id === a.id), k + ' ' + i.id + ' 涉及人 ' + a.id); ok(!/undefined|NaN/.test(a.detail), k + ' ' + i.id + ' 明细 ' + a.detail); });
    ok(i.status === 'open' ? i.count > 0 : i.status === 'clear' ? i.count === 0 : true, k + ' ' + i.id + ' 状态 ' + i.status + ' ' + i.count);
    lintText(i.name + ' ' + i.desc + ' ' + i.affected.map((a) => a.detail).join(' '), k + ' ' + i.id);
  });
  const h05 = comp.items.filter((i) => i.id === 'H05')[0]; const rate = lib.costParams.regions[d.profile.province].socialEmployer;
  ok(h05.impact === Math.round(d.employees.reduce((t, e) => t + Math.round((e.wage - e.socialBase) * rate * 12), 0)), k + ' H05 影响复算');
  if (k === 'make') ok(Math.abs(h05.impact - (P.gross[P.gross.length - 1] - P.socialBase[P.socialBase.length - 1]) * rate * 12) < 200, k + ' H05 与 CFO K10 口径一致 ' + h05.impact);
  ok(comp.impact === comp.open.reduce((t, i) => t + i.impact, 0) && comp.counts.open === comp.open.length, k + ' 合规合计');
  let dc = d;
  comp.items.filter((i) => i.status === 'open').forEach((i) => {
    dc = core.resolve(dc, i.id, lib); const after = core.run(dc, lib).compliance.items.filter((x) => x.id === i.id)[0];
    ok((i.mode === 'fix' ? after.count === 0 : after.count === i.count) && after.status === (i.mode === 'fix' ? 'handled' : 'planned') && after.resolvedAt === d.today, k + ' ' + i.id + ' 处置后 ' + after.status + ' ' + after.count);
    if (i.id === 'H05') { ok(dc.employees.every((e) => e.socialBase === e.wage), k + ' H05 基数写回'); ok(core.run(dc, lib).sim.socialDelta === 0 && core.run(dc, lib).cost.social > R.cost.social, k + ' H05 后成本上升'); }
    if (i.id === 'H01') ok(dc.employees.every((e) => e.contract.signed), k + ' H01 写回');
    if (i.id === 'H03') ok(core.run(dc, lib).compliance.items.filter((x) => x.id === 'H03')[0].count === 0, k + ' H03 写回');
  });
  const twice = core.resolve(dc, 'H05', lib); ok(twice.log.length === dc.log.length, k + ' 重复处置无副作用');
  const RC = core.run(dc, lib); ok(RC.compliance.counts.open === 0 && RC.kpi.complianceImpact === 0 && dc.log.length === comp.counts.open, k + ' 全部处置后');
  ok(JSON.stringify(d) === before, k + ' resolve 改动了原数据');
  // 6. 日历
  const cal = R.calendar;
  cal.items.forEach((it, i) => { ok(it.daysLeft >= -7 && it.daysLeft <= 90 && it.label && it.kindName && it.tone, k + ' 日历项 ' + it.title); if (i) ok(it.daysLeft >= cal.items[i - 1].daysLeft, k + ' 日历排序'); lintText(it.title + it.sub, k + ' 日历'); });
  ok(cal.weeks.length === 13 && cal.weeks[0].start === d.weekStart && cal.weeks.reduce((t, w) => t + w.items.length, 0) === cal.items.filter((i) => core.days(d.weekStart, i.date) >= 0 && core.days(d.weekStart, i.date) < 91).length, k + ' 周格');
  ok(cal.counts.contract + cal.counts.probation + cal.counts.need + cal.counts.interview + cal.items.filter((i) => i.kind === 'leave').length === cal.counts.total, k + ' 日历类别');
  d.needs.forEach((n) => ok(cal.items.some((i) => i.kind === 'need' && i.ref === n.id), k + ' 需求单进日历 ' + n.id));
  // 7. 成本与三方案
  const C = R.cost, RG = lib.costParams.regions[d.profile.province];
  ok(C.monthly === C.wages + C.social + C.fund + C.welfare && C.social === Math.round(C.socialBase * RG.socialEmployer) && C.welfare === hc * lib.costParams.welfarePerCapita, k + ' 月成本');
  ok(C.annual === C.monthly * 12 + C.recruiting + C.training + C.turnoverCost && C.structure.reduce((t, x) => t + x.value, 0) === C.annual, k + ' 年成本');
  ok(C.share === Math.round(1000 * C.annual / d.profile.revenue12) / 10 && C.perCapitaCost === Math.round(C.annual / hc), k + ' 占比与人均');
  const S = R.sim; ok(S.plans.length === 3 && S.labels.length === 12 && S.plans.filter((p) => p.recommended).length === 1, k + ' 方案数');
  S.plans.forEach((p) => { ok(p.months.length === 12 && p.total12 === p.months.reduce((t, m) => t + m.cost, 0) && p.delta === p.total12 - S.base.reduce((t, m) => t + m.cost, 0), k + ' 方案 ' + p.key); p.notes.forEach((t) => lintText(t, k + ' 方案说明')); lintText(p.overtime + p.compliance + p.desc, k + ' 方案文案'); });
  const [A, B, Cp] = S.plans;
  ok(A.months.every((m, i) => m.cost >= S.base[i].cost) && A.endHeadcount === hc + R.kpi.needCount, k + ' A 方案');
  ok(B.delta - A.delta === S.socialDelta * 12 && B.months.every((m, i) => m.headcount === A.months[i].headcount), k + ' B 方案');
  ok(Cp.months.every((m, i) => m.headcount <= hc) && Cp.endHeadcount < hc && Cp.hires === 0, k + ' C 方案');
  const da = core.adoptPlan(d, 'B', lib); ok(core.run(da, lib).sim.plans[1].adopted && core.run(da, lib).kpi.plan === 'B' && da.log.length === 1, k + ' 采纳方案');
  // 8. 月报
  ok(R.report.lines.length >= 7 && R.report.text.indexOf(d.company) >= 0 && R.report.text.indexOf('本期处置') < 0, k + ' 月报');
  ok(core.run(da, lib).report.text.indexOf('本期处置') >= 0 && core.run(da, lib).report.text.indexOf('已采纳 B') >= 0, k + ' 月报处置行');
  lintText(R.report.text, k + ' 月报');
  // 9. examples 一致；样本禁词与代号
  const ex = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'examples', k + '.output.json'), 'utf8'));
  ok(JSON.stringify(ex.kpi) === JSON.stringify(R.kpi), k + ' examples 与内核不一致，先跑 run-examples');
  lintText(JSON.stringify(d), k + ' 样本全文');
  d.needs.forEach((n) => ok(/^R-\d{4}-\d{2}$/.test(n.id), k + ' 需求单编号 ' + n.id)); d.leavers.forEach((l) => ok(/^L-\d{3}$/.test(l.id), k + ' 离职记录 ' + l.id));
  // 10. 对话与文档摄入：六屏开场、快捷问句、问答、文档
  const steps = core.screens().map((x) => x.key);
  ok(steps.length === 6 && core.screens().every((x) => x.key && x.label), k + ' screens 六屏登记');
  const isBlocks = (bs) => !bs || (Array.isArray(bs) && bs.every((b) => b == null || ['kv', 'table', 'tags', 'text'].indexOf(b.type) >= 0));
  const isAct = (a) => !a || (typeof a === 'object' && typeof a.type === 'string' && ['goto', 'focus', 'open', 'apply', 'set'].indexOf(a.type) >= 0 && JSON.stringify(a) === JSON.stringify(JSON.parse(JSON.stringify(a))));
  steps.forEach((st) => {
    const b = core.brief(st, d, lib, R);
    ok(typeof b === 'string' && b.length > 10 && !/undefined|NaN|\{\w+\}/.test(b), k + ' brief ' + st + '：' + b);
    lintText(b, k + ' brief ' + st);
    ok(JSON.stringify(core.brief(st, d, lib)) === JSON.stringify(b), k + ' brief 不传 result 结果不一致 ' + st);
    const sg = core.suggest(st, d, lib, R);
    ok(Array.isArray(sg) && sg.length >= 2 && sg.length <= 4, k + ' suggest ' + st);
    sg.forEach((q) => {
      const a = core.ask(q, st, d, lib, R);
      ok(a && a.text && !/undefined|NaN/.test(a.text), k + ' suggest 答不上 ' + st + ' · ' + q);
      ok(JSON.stringify(core.ask(q, st, d, lib, R)) === JSON.stringify(a), k + ' ask 两次不一致 ' + st + ' · ' + q);
      ok(JSON.stringify(core.ask(q, st, d, lib)) === JSON.stringify(a), k + ' ask 不传 result 结果不一致 ' + st + ' · ' + q);
      ok(isBlocks(a.blocks), k + ' ask blocks 块型 ' + q);
      ok(isAct(a.act), k + ' ask act 必须是纯数据 ' + q);
      lintText(a.text, k + ' ask ' + st + ' · ' + q);
    });
  });
  ok(core.ask('今天天气如何', 'board', d, lib, R) === null, k + ' 答不上返回 null');
  ok(core.brief('没有这一屏', d, lib, R) === null, k + ' 未知屏 brief 返回 null');
  // 文档：简历入池写新副本、合同核对只开抽屉、经营回顾改收入口径
  const resume = docparse.parse({ name: 'resume.txt', bytes: Buffer.from('求职简历\n应聘 ' + lib.jobs.jobs[d.needs[0].job].title + '\n工作经历：8 年相关工作经验\n教育背景：大专\n期望薪资 7800 元\n自我评价：踏实\n', 'utf8') });
  const rIn = core.ingest(resume, 'recruit', d, lib, R);
  ok(rIn && rIn.text && rIn.data && rIn.data !== d, k + ' ingest 简历');
  ok(rIn.data.candidates.length === d.candidates.length + 1 && JSON.stringify(d) === before, k + ' ingest 简历写新副本、不动入参');
  ok(core.run(rIn.data, lib).byId[rIn.data.candidates[rIn.data.candidates.length - 1].id].score.total > 0, k + ' ingest 简历可继续算');
  ok(rIn.act && rIn.act.type === 'apply' && rIn.act.action === 'ingest', k + ' ingest 简历动作');
  ok(JSON.stringify(core.ingest(resume, 'recruit', d, lib, R)) === JSON.stringify(rIn), k + ' ingest 两次不一致');
  lintText(rIn.text, k + ' ingest 简历');
  const contract = docparse.parse({ name: 'contract.txt', bytes: Buffer.from('第一条 合同金额：人民币 186 万元\n第二条 交付期限：2026 年 11 月 30 日\n第三条 违约责任：逾期交付按万分之三计违约金\n', 'utf8') });
  const cIn = core.ingest(contract, 'compliance', d, lib, R);
  ok(cIn && cIn.text && !cIn.data && cIn.act.type === 'open' && cIn.act.panel === 'doc' && isBlocks(cIn.act.blocks), k + ' ingest 合同文本');
  ok(isBlocks(cIn.blocks) && cIn.ref === 'H01', k + ' ingest 合同文本块与高亮');
  lintText(cIn.text, k + ' ingest 合同');
  const deck = { ok: true, kind: 'ppt', name: 'review.pptx', size: 1024, sizeText: '1 KB', ext: 'pptx', text: '三季度经营回顾 收入 4,260 万元 同比 +12%', paragraphs: [], tables: [], sheets: [], slides: [{ no: 1, title: '三季度经营回顾', lines: ['收入 4,260 万元'] }], mail: null, stats: {}, note: '' };
  const pIn = core.ingest(deck, 'cost', d, lib, R);
  ok(pIn && pIn.data && pIn.data !== d && pIn.data.profile.revenue12 === 42600000 && d.profile.revenue12 !== 42600000, k + ' ingest 经营回顾改收入口径');
  ok(core.run(pIn.data, lib).cost.perCapitaRevenue === Math.round(42600000 / hc) && JSON.stringify(d) === before, k + ' ingest 收入口径重算');
  lintText(pIn.text, k + ' ingest 经营回顾');
  ok(core.ingest({ ok: false }, 'board', d, lib, R) === null, k + ' ingest 解析失败返回 null');
});
console.log('validate ok: ' + checks + ' 项断言通过');
