// 内核自检：对三套样本做结构与逻辑断言。改内核或样本后先跑 run-examples 再跑这里。
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const core = require('../core/decide.js');
const lib = require('./load-data.js')();
const lint = require('../../_shared/lint.js')(lib.lintWords);
const docparse = require('../../_shared/docparse.js');
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
  // 10. 对话与文档摄入：六屏开场、快捷问句、问答、声明式动作、文档写回
  const raw0 = JSON.stringify(d);
  const steps = core.screens().map((x) => x.key);
  ok(steps.length === 6 && core.screens().every((x) => x.key && x.label), k + ' screens 六屏登记');
  const isBlocks = (bs) => !bs || (Array.isArray(bs) && bs.every((b) => b == null || (['kv', 'table', 'tags', 'list', 'metric', 'text', 'chart'].indexOf(b.type) >= 0 && (b.type !== 'chart' || ['column', 'bar', 'stack', 'line', 'area', 'donut', 'pie', 'funnel', 'gauge', 'radar', 'waterfall', 'progress', 'heat', 'scatter'].indexOf(b.chart) >= 0))));
  const isAct = (a) => !a || (typeof a === 'object' && typeof a.type === 'string' && ['goto', 'focus', 'open', 'apply', 'set'].indexOf(a.type) >= 0 && JSON.stringify(a) === JSON.stringify(JSON.parse(JSON.stringify(a))));
  steps.forEach((st) => {
    const b = core.brief(st, d, lib, R);
    const bt = typeof b === 'string' ? b : (b && b.text);
    ok(typeof bt === 'string' && bt.length > 10 && !/undefined|NaN|\{\w+\}/.test(bt), k + ' brief ' + st + '：' + bt);
    ok(typeof b === 'string' || isBlocks(b.blocks), k + ' brief blocks 块型 ' + st);
    clean(bt, k + ' brief ' + st);
    ok(JSON.stringify(core.brief(st, d, lib)) === JSON.stringify(b), k + ' brief 不传 result 结果不一致 ' + st);
    const sg = core.suggest(st, d, lib, R);
    ok(Array.isArray(sg) && sg.length >= 2 && sg.length <= 4, k + ' suggest ' + st);
    sg.forEach((q) => {
      const a = core.ask(q, st, d, lib, R);
      ok(a && a.text, k + ' suggest 答不上 ' + st + ' · ' + q);
      ok(JSON.stringify(core.ask(q, st, d, lib, R)) === JSON.stringify(a), k + ' ask 两次不一致 ' + st + ' · ' + q);
      ok(JSON.stringify(core.ask(q, st, d, lib)) === JSON.stringify(a), k + ' ask 不传 result 结果不一致 ' + st + ' · ' + q);
      ok(isBlocks(a.blocks), k + ' ask blocks 块型 ' + q);
      ok(isAct(a.act), k + ' ask act 必须是纯数据 ' + q);
      clean(a.text, k + ' ask ' + st + ' · ' + q);
    });
  });
  // suggest 里「改成 X」的问句：动作值必须等于问句里的那个数，回答里的净效益必须是按这个数重算的真值
  core.suggest('options', d, lib, R).filter((q) => q.indexOf('改成') >= 0).forEach((q) => {
    const a = core.ask(q, 'options', d, lib, R), n0 = q.match(/(\d+(?:\.\d+)?)/);
    ok(n0 && a && a.act && a.act.type === 'set' && a.act.path.indexOf('params.') === 0, k + ' suggest 改参数问句没给出 set 动作 ' + q);
    ok(a.act.value === parseFloat(n0[1]), k + ' suggest 改参数问句动作值 ' + q + ' 落成了 ' + a.act.value);
    const sg0 = a.act.path.slice(7).split('.'), np0 = {}; np0[sg0[2]] = a.act.value;
    const sReal = core.simulate(d, lib, sg0[0], sg0[1], np0);
    ok(a.text.indexOf(core.fmtSigned(sReal.totals.netBenefit, core.fmtW)) >= 0, k + ' suggest 改参数问句净效益对不上 ' + q + '，真值 ' + core.fmtSigned(sReal.totals.netBenefit, core.fmtW));
    ok(a.act.value === sReal.params[sg0[2]], k + ' suggest 改参数问句参数没落到位 ' + q);
  });
  // 点名类与动作词表：指标名、因子名、决议号、审批号、组抽屉、发起与终批
  const nQ = core.ask('毛利率是多少', 'board', d, lib, R);
  ok(nQ && nQ.ref === 'gm' && isAct(nQ.act), k + ' 点名指标');
  const lQ = core.ask(root.name + '为什么变了', 'attr', d, lib, R);
  ok(lQ && lQ.ref === root.id && lQ.act.type === 'set' && lQ.act.path === 'factor', k + ' 点名因子');
  const dQ = core.ask(R.decisions[0].id + ' 怎么样', 'execute', d, lib, R);
  ok(dQ && dQ.ref === R.decisions[0].id && dQ.act.type === 'focus', k + ' 点名决议');
  const gQ = core.ask('打开利润组', 'board', d, lib, R);
  ok(gQ && gQ.act.type === 'open' && gQ.act.panel === 'group', k + ' 打开分组抽屉');
  const eQ = core.ask('证据在哪', 'attr', d, lib, R);
  ok(eQ && eQ.act.type === 'open' && eQ.act.panel === 'evidence', k + ' 证据卡动作');
  const sQ = core.ask('发起审批', 'approval', d, lib, R);
  ok(sQ && sQ.act.type === 'apply' && sQ.act.action === 'submit' && sQ.act.input.cause && sQ.act.input.option, k + ' 发起审批动作');
  const aQ = core.ask('批准', 'approval', d, lib, R);
  ok(aQ && aQ.act.type === 'apply' && aQ.act.action === 'approve', k + ' 终批动作');
  const dsub = core.submit(d, lib, sQ.act.input.cause, sQ.act.input.option, sQ.act.input.params);
  ok(dsub.approvals.length === d.approvals.length + 1, k + ' 发起动作可落单');
  const RS = core.run(dsub, lib), pQ = core.ask('批准', 'approval', dsub, lib, RS);
  ok(pQ && pQ.act.action === 'approve' && pQ.act.input.approvalId === dsub.approvals[0].id, k + ' 有待批单时终批点名');
  ok(core.approve(dsub, lib, pQ.act.input.approvalId, '').decisions.length === d.decisions.length + 1, k + ' 终批动作可成决议');
  // 选中态：屏上选的根因 / 方案 / 参数经 run 的 opt 进来，拟稿、回答与落单都按选中的那一档算
  const alt = S.sims.filter((x) => !x.recommended)[0] || S.sims[0];
  const ap0 = alt.option.params[0], pv = ap0.default === ap0.max ? ap0.min : ap0.max;
  const selIn = { cause: root.id, option: alt.option.key, params: { [alt.option.key]: { [ap0.key]: pv } } };
  const Rsel = core.run(d, lib, Object.assign({ metric: 'profit', basis: 'prev' }, selIn));
  ok(JSON.stringify(Rsel.selection) === JSON.stringify(selIn), k + ' run 收下选中态 ' + JSON.stringify(Rsel.selection));
  ok(core.run(d, lib).selection === undefined && core.run(d, lib, { metric: 'profit' }).selection === undefined, k + ' 不传选中态就不出 selection');
  const sAlt = core.simulate(d, lib, root.id, alt.option.key, { [ap0.key]: pv });
  const qNet = core.ask('净效益怎么算的', 'approval', d, lib, Rsel);
  ok(qNet.text.indexOf(core.fmtSigned(sAlt.totals.netBenefit, core.fmtW)) >= 0, k + ' 净效益要按屏上选的那一档算：' + qNet.text);
  const Rflat = core.run(d, lib, { cause: root.id, option: alt.option.key, params: { [ap0.key]: pv } });
  ok(JSON.stringify(core.ask('净效益怎么算的', 'approval', d, lib, Rflat)) === JSON.stringify(qNet), k + ' 参数没按方案 key 分组也按选中的方案收');
  const qLead = core.ask('多久见效', 'options', d, lib, Rsel);
  ok(qLead.text.indexOf('方案 ' + alt.option.key + ' ') === 0, k + ' 见效要按屏上选的方案答：' + qLead.text);
  const qSub = core.ask('发起审批', 'approval', d, lib, Rsel);
  ok(qSub.act.input.option === alt.option.key && qSub.act.input.params[ap0.key] === pv, k + ' 发起审批要按屏上选的方案与参数落单 ' + JSON.stringify(qSub.act.input));
  const dSel = core.submit(d, lib, qSub.act.input.cause, qSub.act.input.option, qSub.act.input.params);
  ok(dSel.approvals[0].option.key === alt.option.key && Math.abs(dSel.approvals[0].totals.netBenefit - sAlt.totals.netBenefit) < 1e-6, k + ' 落单的净效益与屏上那一档一致');
  ok(JSON.stringify(core.ask('净效益怎么算的', 'approval', d, lib, core.run(d, lib, { cause: 'noSuchCause', option: 'Z' }))) === JSON.stringify(core.ask('净效益怎么算的', 'approval', d, lib, R)), k + ' 认不得的选中态退回推荐档');
  ok(core.ask('今天天气如何', 'board', d, lib, R) === null, k + ' 答不上返回 null');
  ok(core.brief('没有这一屏', d, lib, R) === null && core.ask('有没有逾期', '没有这一屏', d, lib, R) === null, k + ' 未知屏返回 null');
  ok(JSON.stringify(d) === raw0, k + ' 对话没动入参');
  // 文档：PPT 与邮件写目标、科目余额表对账、合同取金额与账期、写回一律新副本
  const mkDoc = (o) => Object.assign({ ok: true, name: 'doc', size: 1024, sizeText: '1 KB', ext: '', text: '', paragraphs: [], tables: [], sheets: [], slides: [], mail: null, stats: {}, note: '' }, o);
  const ppt = mkDoc({ kind: 'ppt', name: 'review.pptx', ext: 'pptx', text: '2026 年三季度经营回顾 毛利率 28.4%，环比 -1.2pt 交付准时率 95% 应收账款周转 68 天 新客成交 18 单',
    slides: [{ no: 1, title: '2026 年三季度经营回顾', lines: ['毛利率 28.4%'] }] });
  const pIn = core.ingest(ppt, 'board', d, lib, R);
  ok(pIn && pIn.text && pIn.data && pIn.data !== d && JSON.stringify(d) === raw0, k + ' ingest PPT 写新副本、不动入参');
  ok(pIn.data.docTargets && pIn.data.docTargets.profit && pIn.data.docTargets.profit.id === 'gm', k + ' ingest PPT 写驾驶舱目标');
  ok(pIn.data.sources.filter((s) => s.id === 'doc-import').length === 1 && pIn.data.log.length === d.log.length + 1, k + ' ingest PPT 记导入批次');
  ok(!pIn.act, k + ' ingest 写回只给 data，不吐 act（SPEC §12：apply 不许指回这次调用的动作自己）');
  ok(JSON.stringify(core.ingest(ppt, 'board', d, lib, R)) === JSON.stringify(pIn), k + ' ingest 两次不一致');
  ok(isBlocks(pIn.blocks), k + ' ingest PPT 块型'); clean(pIn.text, k + ' ingest PPT');
  ok(core.run(pIn.data, lib).kpi.risk >= 0, k + ' ingest 写回后可继续算');
  const pIn2 = core.ingest(ppt, 'board', pIn.data, lib);
  ok(pIn2.data.sources.filter((s) => s.id === 'doc-import').length === 1, k + ' ingest 重复导入不叠批次');
  ok(pIn2.data.log.filter((x) => x.kind === 'import').length === 1, k + ' ingest 重复导入不叠处置日志');
  ok(pIn2.data.log.every((x, i) => x.seq === i + 1), k + ' 处置日志序号连续');
  ok(core.run(pIn2.data, lib).report.text.indexOf('导入 review.pptx 2 页，抓到 5 个指标口径；导入 review.pptx') < 0, k + ' 月报本期处置不重复');
  const tb = mkDoc({ kind: 'excel', name: 'trial-balance.xlsx', ext: 'xlsx',
    sheets: [{ name: '科目余额表', rows: [['科目编码', '科目名称', '期初余额', '本期借方', '本期贷方', '期末余额'], ['1122', '应收账款', '3120000', '2400000', '1980000', '3540000'], ['1405', '库存商品', '2180000', '1620000', '1450000', '2350000']] }] });
  const tIn = core.ingest(tb, 'board', d, lib, R);
  ok(tIn && tIn.data && tIn.text.indexOf('应收账款期末') >= 0 && tIn.text.indexOf('回款天数') >= 0, k + ' ingest 科目余额表对账');
  clean(tIn.text, k + ' ingest 科目表');
  const contract = docparse.parse({ name: 'contract.txt', bytes: Buffer.from('采购框架合同\n第一条 合同金额：人民币 1,860,000 元（含税 13%）。\n第二条 账期 60 天。\n第三条 违约金 5%。\n', 'utf8') });
  const cIn = core.ingest(contract, 'board', d, lib, R);
  ok(cIn && cIn.data && cIn.text.indexOf('合规敞口') >= 0 && cIn.text.indexOf('回款天数') >= 0, k + ' ingest 合同取金额与账期');
  clean(cIn.text, k + ' ingest 合同');
  const cEn = docparse.parse({ name: 'contract-en.txt', bytes: Buffer.from('Purchase Framework Contract\nAmount: CNY 1,860,000  Tax 13%\nPayment Terms: Net 60 days\nDelivery: 2026-11-30\nPenalty: 0.05% per day, cap 5%\n', 'utf8') });
  const eIn = core.ingest(cEn, 'board', d, lib, R);
  ok(eIn && eIn.data && !eIn.act && eIn.text.indexOf('186 万元') >= 0 && eIn.text.indexOf('账期 60 天') >= 0, k + ' ingest 认英文写法的金额与账期：' + (eIn && eIn.text));
  ok(JSON.stringify(eIn.blocks).indexOf('0.05%') >= 0, k + ' ingest 认英文写法的违约条款');
  clean(eIn.text, k + ' ingest 英文合同');
  const plain = docparse.parse({ name: 'note.txt', bytes: Buffer.from('本周例会纪要\n各部门按既定分工推进。\n', 'utf8') });
  const nIn = core.ingest(plain, 'board', d, lib, R);
  ok(nIn && !nIn.data && !nIn.act && nIn.text.indexOf('不动数') >= 0, k + ' ingest 无口径文档不动数');
  const mail = mkDoc({ kind: 'eml', name: 'mail.eml', ext: 'eml', text: '本月毛利率 28.4%，请安排。', mail: { from: '采购部 <procurement@example.com>', to: '财务部', cc: '', subject: '关于 11 月付款申请', date: '2026-09-16', attaches: [] } });
  const mIn = core.ingest(mail, 'board', d, lib, R);
  ok(mIn && mIn.data && mIn.data.docTargets && !mIn.data.sources.some((s) => s.id === 'doc-import'), k + ' ingest 邮件只写目标不记批次');
  ok(mIn.text.indexOf('@') < 0 && JSON.stringify(mIn.blocks).indexOf('@') < 0 && !mIn.act, k + ' 邮件摘要只留职务，不带邮箱地址');
  clean(mIn.text, k + ' ingest 邮件');
  ok(core.ingest({ ok: false }, 'board', d, lib, R) === null && core.ingest(null, 'board', d, lib, R) === null, k + ' ingest 解析失败返回 null');
  ok(JSON.stringify(d) === raw0, k + ' 文档摄入没动入参');
});
console.log('validate ok: ' + checks + ' 项断言通过');
