// 内核自检：对三套样本做结构与逻辑断言。改内核或样本后先跑 run-examples 再跑这里。
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const core = require('../core/decide.js');
const lib = require('./load-data.js')();
const lint = require('../../_shared/lint.js')(lib.lintWords);
const skills = path.join(__dirname, '..', '..');
const CFO = require(path.join(skills, '06-ai-cfo', 'core', 'fin.js')), cfoLib = require(path.join(skills, '06-ai-cfo', 'scripts', 'load-data.js'))();
const ERP = require(path.join(skills, '10-ai-erp', 'core', 'sim.js')), erpLib = require(path.join(skills, '10-ai-erp', 'scripts', 'load-data.js'))();
const HR = require(path.join(skills, '05-ai-hr', 'core', 'hr.js')), hrLib = require(path.join(skills, '05-ai-hr', 'scripts', 'load-data.js'))();
const LEGAL = require(path.join(skills, '07-ai-legal', 'core', 'legal.js')), legalLib = require(path.join(skills, '07-ai-legal', 'scripts', 'load-data.js'))();
let checks = 0;
const ok = (c, m) => { assert(c, m); checks++; };
const lintText = (t, where) => { const hits = lint.hard(String(t)); ok(hits.length === 0, where + ' 命中禁词: ' + hits.join(',')); };
const clean = (t, where) => { ok(!/\{\w+\}|undefined|NaN/.test(t), where + ' 文本异常 ' + t); lintText(t, where); };
const N = {}; lib.metricTree.nodes.forEach((n) => { N[n.id] = n; });

// 数据表自洽
lib.metricTree.nodes.forEach((n) => { (n.kind === 'sum' ? n.children.map((c) => c.id) : n.kind === 'product' ? n.children : []).forEach((c) => ok(N[c], n.id + ' 子节点 ' + c)); ok(lib.metricTree.modules[n.source], n.id + ' 来源'); ok(['up', 'down', 'flat'].indexOf(n.good) >= 0, n.id + ' good'); lintText(n.name + n.explain, n.id); });
lib.metricTree.attributable.forEach((id) => ok(N[id] && N[id].kind !== 'leaf', '可归因指标 ' + id));
Object.keys(lib.evidence.cards).forEach((k) => lib.evidence.cards[k].forEach((c) => { ok(lib.metricTree.modules[c.module], '证据模块 ' + k); lintText(c.title + c.detail + c.ref, '证据 ' + k); }));
Object.keys(lib.playbooks.causes).forEach((k) => { ok(N[k], '方案库因子 ' + k); lib.playbooks.causes[k].options.forEach((o) => { ok(o.key && o.name && o.owner && o.params.length && o.effects.length && o.milestones.length && lib.playbooks.riskFactor[o.risk], k + ' 方案 ' + o.key); o.params.forEach((p) => ok(p.default >= p.min && p.default <= p.max, k + o.key + ' 参数默认值 ' + p.key)); o.effects.forEach((e) => ok(N[e.node] && ['pct', 'pt', 'add', 'days'].indexOf(e.mode) >= 0, k + o.key + ' 效果 ' + e.node)); lintText(o.name + o.desc + o.note + o.milestones.map((m) => m.title).join(''), k + o.key); }); });
lib.approvalRules.signers.forEach((s) => { ok(s.checks.length && s.checks[s.checks.length - 1].when === 'true', s.role + ' 兜底'); s.checks.forEach((c) => { ok(core.OPINION_NAME[c.opinion], s.role + ' 意见'); lintText(c.text, s.role); }); });

Object.keys(lib.samples).sort().forEach((k) => {
  const d = lib.samples[k];
  const before = JSON.stringify(d);
  const R = core.run(d, lib), R2 = core.run(d, lib);
  ok(JSON.stringify(R.kpi) === JSON.stringify(R2.kpi), k + ' 确定性');
  ok(JSON.stringify(d) === before, k + ' run 改动了原数据');
  const T = R.tree, n = d.months.length, last = n - 1, V = core.computeValues(d, lib);
  // 1. 指标树：序列长度、公式复算、状态
  Object.keys(T.nodes).forEach((id) => {
    const node = T.nodes[id]; ok(node.values.length === n, k + ' ' + id + ' 序列长度');
    node.values.forEach((v) => ok(typeof v === 'number' && !isNaN(v), k + ' ' + id + ' 数值'));
    const def = N[id];
    if (def.kind === 'product') node.values.forEach((v, i) => ok(Math.abs(v - def.children.reduce((t, c) => t * V[c][i], 1)) < 1e-6 * Math.max(1, Math.abs(v)), k + ' ' + id + ' 乘积'));
    if (def.kind === 'sum') node.values.forEach((v, i) => ok(Math.abs(v - ((def.base || 0) + def.children.reduce((t, c) => t + c.sign * V[c.id][i], 0))) < 1e-6 * Math.max(1, Math.abs(v)), k + ' ' + id + ' 求和'));
    ok(['ok', 'watch', 'risk'].indexOf(node.status) >= 0 && node.curText && node.prevText && node.deltaText, k + ' ' + id + ' 状态与文本');
    clean(node.curText + node.deltaText + (node.budgetText || ''), k + ' ' + id);
  });
  ok(T.counts.ok + T.counts.watch + T.counts.risk === lib.metricTree.nodes.length, k + ' 状态计数');
  ok(T.groups.length === lib.metricTree.groups.length && T.groups.every((g) => g.nodes.length >= 2), k + ' 分组');
  // 2. 与各模块口径一致
  const cfoKey = { make: 'make', flow: 'flow', service: 'service' }[k];
  const R6 = CFO.run(cfoLib.samples[cfoKey], cfoLib);
  ok(T.nodes.rev.cur === R6.kpi.rev, k + ' 收入与 CFO 一致');
  ok(Math.abs(T.nodes.gm.cur * 100 - R6.kpi.gm) < 0.06 && Math.abs(T.nodes.gm.prev * 100 - R6.kpi.gmPrev) < 0.06, k + ' 毛利率与 CFO 一致 ' + T.nodes.gm.cur + ' vs ' + R6.kpi.gm);
  ok(T.nodes.arOverdue.cur === R6.kpi.arOverdue, k + ' 应收逾期与 CFO 一致');
  const S10 = ERP.schedule(erpLib.samples[k]);
  ok(Math.abs(T.nodes.onTimeRate.cur * 100 - S10.kpi.onTimeRate) < 0.01 && T.nodes.lateOrders.cur === S10.kpi.late, k + ' 准时率与 ERP 一致');
  const R5 = HR.run(hrLib.samples[k], hrLib);
  ok(T.nodes.headcount.cur === R5.kpi.headcount && Math.abs(T.nodes.turnover.cur * 100 - R5.kpi.turnover) < 0.01 && T.nodes.overtimeOver.cur === R5.kpi.overtimeOver, k + ' 人力与人力官一致');
  ok(T.nodes.complianceExposure.cur === R5.kpi.complianceImpact + d.facts.contractExposure, k + ' 合规敞口 = 人力官影响 + 合同敞口');
  const R7 = LEGAL.run(legalLib.samples[k], legalLib);
  ok(T.nodes.highRiskContracts.cur === R7.kpi.highRisk, k + ' 高风险合同与法务一致');
  // 3. 归因：贡献之和等于变动；主因为剔除一次性后伤害最大的因子
  lib.metricTree.attributable.forEach((mid) => ['prev', 'avg3'].forEach((basis) => {
    const A = core.attribute(d, lib, mid, basis);
    ok(A.check < 1e-6 * Math.max(1, Math.abs(A.delta)), k + ' ' + mid + ' ' + basis + ' 贡献之和 ' + A.check);
    ok(Math.abs(A.groups.reduce((t, g) => t + g.value, 0) - A.delta) < 1e-6 * Math.max(1, Math.abs(A.delta)), k + ' ' + mid + ' 分组之和');
    A.leaves.forEach((x) => { clean(x.valueText + x.factorText + x.pathNames.join('/'), k + ' ' + mid + ' ' + x.id); ok(x.path[0] === mid && x.path[x.path.length - 1] === x.id, k + ' 路径 ' + x.id); });
    if (A.rootCause) { ok(A.rootCause.hurtAdj && A.hurts.every((h) => Math.abs(h.adjValue) <= Math.abs(A.rootCause.adjValue)), k + ' ' + mid + ' 主因'); }
    clean(A.method + A.deltaText + A.fromText + A.toText, k + ' ' + mid + ' 文案');
  }));
  const A = R.attribution, root = A.rootCause;
  ok(root && root.id !== 'adminExp', k + ' 一次性项剔除后主因 ' + (root && root.name));
  const adm = A.leaves.filter((x) => x.id === 'adminExp')[0]; ok(adm.adjText && Math.abs(adm.adjValue) < Math.abs(adm.value), k + ' 管理费用剔除一次性');
  // 4. 证据
  A.leaves.forEach((x) => { const ev = core.evidence(d, lib, x.id, x.direction); ok(ev.length >= 1, k + ' 证据 ' + x.id); ev.forEach((e) => { ok(e.moduleName && e.screen && e.title, k + ' 证据卡 ' + x.id); clean(e.title + e.detail + e.ref, k + ' 证据 ' + x.id); }); });
  // 5. 方案预演：每个方案库因子都能预演；净效益公式；推荐唯一；效果方向
  Object.keys(lib.playbooks.causes).forEach((cid) => {
    const S = core.simulateAll(d, lib, cid);
    ok(S.sims.length >= 1 && S.sims.filter((s) => s.recommended).length === 1 && S.recommended, k + ' ' + cid + ' 推荐');
    S.sims.forEach((s) => {
      const T2 = s.totals;
      ok(s.months.length === 12 && s.base.length === 12 && s.labels[0] === core.addMonths(d.period, 1), k + ' ' + cid + s.option.key + ' 月数');
      ok(Math.abs(T2.netBenefit - (T2.profitDelta12 - T2.invest)) < 1e-6 && Math.abs(T2.cashDelta12 - (T2.profitDelta12 + T2.workingCapital - T2.invest)) < 1e-6, k + ' ' + cid + s.option.key + ' 净效益公式');
      ok(s.base.every((m) => Math.abs(m.profit - s.base[0].profit) < 1e-6), k + ' ' + cid + s.option.key + ' 基线平稳');
      ok(s.months[0].profit === s.base[0].profit || s.option.leadMonths <= 1, k + ' ' + cid + s.option.key + ' 见效前无变化');
      clean(s.option.name + s.option.desc + s.summary + s.option.milestones.map((m) => m.title).join('') + s.option.params.map((p) => p.label).join(''), k + ' ' + cid + s.option.key);
      ok(Math.abs(T2.score - T2.netBenefit * lib.playbooks.riskFactor[s.option.risk]) < 1e-6, k + ' 风险系数');
    });
  });
  const SB = core.simulate(d, lib, 'orders', 'B'); ok(SB.totals.onTimeEnd > SB.totals.onTimeBase && SB.totals.revDelta12 > 0, k + ' 解除瓶颈方案方向');
  const SP = core.simulate(d, lib, 'avgOrder', 'A', { pricePct: 4 }); ok(SP.totals.revDelta12 > 0 && SP.params.pricePct === 4, k + ' 调价参数生效');
  const S2 = core.simulate(d, lib, 'avgOrder', 'A', { pricePct: 2 }); ok(SP.totals.revDelta12 > S2.totals.revDelta12, k + ' 调价幅度单调');
  ok(core.playbookKey(lib, 'adminExp') === 'opex' && core.options(d, lib, 'adminExp').options.length >= 2, k + ' 方案库回退');
  // 6. 审批流：发起 → 会签意见 → 批准 → 决议；驳回；节点更新；原数据不动
  const S = core.simulateAll(d, lib, root.id);
  let d1 = core.submit(d, lib, root.id, S.recommended);
  ok(d1.approvals.length === 1 && /^A-\d{4}-\d{2}$/.test(d1.approvals[0].id) && d1.approvals[0].status === 'pending', k + ' 发起审批');
  const ap = d1.approvals[0]; ok(ap.opinions.length === lib.approvalRules.signers.length && ap.opinions.every((o) => core.OPINION_NAME[o.opinion] && o.text), k + ' 会签意见');
  ap.opinions.forEach((o) => clean(o.text, k + ' 会签 ' + o.role)); clean(ap.paramText + ap.summary + ap.option.name, k + ' 审批单');
  ok(core.run(d1, lib).kpi.pending === 1, k + ' 待批计数');
  const d2 = core.approve(d1, lib, ap.id, '同意');
  const dec = core.run(d2, lib).decisions[0];
  ok(d2.approvals[0].status === 'approved' && d2.approvals[0].decisionId === dec.id && /^D-\d{4}-\d{2}$/.test(dec.id) && dec.status === 'executing', k + ' 批准成决议');
  ok(dec.milestones.length === ap.option.milestones.length && dec.milestones[0].status === 'doing' && dec.milestones.every((m) => core.days(d.today, m.due) >= 0), k + ' 决议节点');
  ok(dec.tracking && dec.tracking.target.length === 6 && dec.tracking.months[0] === core.addMonths(d.period, 1), k + ' 决议跟踪目标');
  ok(core.approve(d2, lib, ap.id, '再批').log.length === d2.log.length, k + ' 重复批准无副作用');
  const d3 = core.reject(d1, lib, ap.id, '再看一个月'); ok(d3.approvals[0].status === 'rejected' && d3.approvals[0].comment === '再看一个月' && core.run(d3, lib).decisions.length === d.decisions.length, k + ' 驳回');
  let d4 = core.setMilestone(d2, dec.id, 0, 'done'); ok(core.run(d4, lib).decisions[0].milestones[1].status === 'doing', k + ' 节点完成推进');
  dec.milestones.forEach((m, i) => { d4 = core.setMilestone(d4, dec.id, i, 'done'); }); ok(core.run(d4, lib).decisions[0].status === 'done', k + ' 全部完成');
  ok(JSON.stringify(d) === before && d2.log.length === 2, k + ' 流程原数据与日志');
  // 会签规则：调价 4% 反对、2% 有条件
  const dp = core.submit(d, lib, 'avgOrder', 'A', { pricePct: 4 }); ok(dp.approvals[0].opinions.filter((o) => o.key === 'sales')[0].opinion === 'object', k + ' 调价 4% 反对');
  const dp2 = core.submit(d, lib, 'avgOrder', 'A', { pricePct: 2 }); ok(dp2.approvals[0].opinions.filter((o) => o.key === 'sales')[0].opinion === 'cond', k + ' 调价 2% 有条件');
  // 7. 决议台账：预置决议的复盘、进度、逾期
  R.decisions.forEach((x) => { ok(x.progress >= 0 && x.progress <= 100 && x.statusName && x.causeName, k + ' 决议 ' + x.id); if (x.review) { ok(['miss', 'hit'].indexOf(x.review.result) >= 0 && x.tracking && x.tracking.actualText.length, k + ' 复盘 ' + x.id); clean(x.review.text, k + ' 复盘'); } if (x.tracking && x.tracking.actual.length) ok(typeof x.tracking.onTrack === 'boolean', k + ' 跟踪 ' + x.id); });
  ok(R.decisions.some((x) => x.review && x.review.result === 'miss'), k + ' 有未达标复盘');
  // 8. KPI 与月报
  ok(R.kpi.risk === T.counts.risk && R.kpi.executing === d.decisions.filter((x) => x.status === 'executing').length && R.kpi.rootCause === root.name, k + ' KPI');
  ok(R.report.lines.length >= 6 && R.report.text.indexOf(d.company) >= 0 && R.report.text.indexOf('本期处置') < 0, k + ' 月报');
  ok(core.run(d2, lib).report.text.indexOf('本期处置') >= 0, k + ' 月报处置行'); clean(R.report.text, k + ' 月报'); clean(core.run(d2, lib).report.text, k + ' 月报 2');
  // 9. examples 一致；样本禁词
  const ex = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'examples', k + '.output.json'), 'utf8'));
  ok(JSON.stringify(ex.kpi) === JSON.stringify(R.kpi), k + ' examples 与内核不一致，先跑 run-examples');
  lintText(JSON.stringify(d), k + ' 样本全文');
  ok(!/企查查|天眼查|启信宝|爱企查/.test(JSON.stringify(d)), k + ' 数据源厂商名');
});
console.log('validate ok: ' + checks + ' 项断言通过');
