// 内核自检：对三套账套样本做结构与逻辑断言。改内核或样本后先跑 run-examples 再跑这里。
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const core = require('../core/fin.js');
const lib = require('./load-data.js')();
const lint = require('../../_shared/lint.js')(lib.lintWords);
let checks = 0;
const ok = (c, m) => { assert(c, m); checks++; };
const lintText = (t, where) => { const hits = lint.hard(String(t)); ok(hits.length === 0, where + ' 命中禁词: ' + hits.join(',')); };

Object.keys(lib.samples).sort().forEach((k) => {
  const d = lib.samples[k];
  const R = core.run(d, lib), R2 = core.run(d, lib);
  ok(JSON.stringify(R.kpi) === JSON.stringify(R2.kpi), k + ' 确定性');
  // 1. 三表：资产负债表每期平衡；现金流量表净额 = 货币资金变动；利润表净利润 = 现金流量表起点
  R.statements.bs.forEach((b, i) => ok(Math.abs(b.diff) <= 10, k + ' 第 ' + i + ' 期资产负债表不平 ' + b.diff));
  R.statements.cf.forEach((c, i) => { ok(Math.abs(c.net - c.dCash) <= 10, k + ' 第 ' + i + ' 期现金流量净额与货币资金变动不符'); ok(c.netProfit === R.statements.pl[i].netProfit, k + ' 净利润口径'); });
  // 2. 勾稽：异常规则必有下钻与（有 fix 的）调整分录；调整后该条回到正常且三表仍平；调整不动原数据
  const before = JSON.stringify(d);
  const bad = R.reconcile.rows.filter((r) => r.status === 'bad');
  ok(bad.length >= 3, k + ' 样本应至少埋 3 处异常，实际 ' + bad.length);
  bad.forEach((r) => { ok(r.drill && (r.drill.rows || []).length >= 1, k + ' ' + r.id + ' 无下钻明细'); lintText(r.explain, k + ' ' + r.id); });
  let dd = d;
  bad.filter((r) => r.fix).forEach((r) => {
    dd = core.applyFix(dd, r.id, lib);
    const R3 = core.run(dd, lib);
    const row = R3.reconcile.rows.filter((x) => x.id === r.id)[0];
    ok(row.fixed, k + ' ' + r.id + ' 调整后未标记');
    ok(row.status !== 'bad', k + ' ' + r.id + ' 调整后仍异常 ' + row.diff);
    R3.statements.bs.forEach((b) => ok(Math.abs(b.diff) <= 10, k + ' ' + r.id + ' 调整后资产负债表不平 ' + b.diff));
  });
  ok(JSON.stringify(d) === before, k + ' applyFix 改动了原数据');
  const Rf = core.run(dd, lib);
  ok(Rf.reconcile.counts.bad <= R.reconcile.counts.bad - bad.filter((r) => r.fix).length + 1, k + ' 全部调整后异常数未下降');
  ok(dd.log.length === bad.filter((r) => r.fix).length, k + ' 调整日志条数');
  // 3. 风险：每条有证据；概率与影响在范围内；处置后概率下降且记日志
  R.risks.rows.forEach((r) => { ok(r.evidence.length >= 1, k + ' ' + r.id + ' 无证据'); ok(r.prob >= 0 && r.prob <= 1 && r.impact >= 0, k + ' ' + r.id + ' 概率或影响越界'); r.evidence.forEach((e) => lintText(e, k + ' ' + r.id)); });
  const top = R.risks.rows.filter((r) => r.level !== 'low')[0];
  if (top) {
    const d2 = core.applyRiskAction(d, top.id, top.actions[0].key, lib);
    const R4 = core.run(d2, lib);
    const r4 = R4.risks.rows.filter((x) => x.id === top.id)[0];
    ok(r4.handled.length === 1 || top.actions[0].key === 'declareUninvoiced', k + ' 处置未记录');
    ok(r4.prob <= top.prob, k + ' 处置后概率未下降');
    ok(d2.log.length === 1, k + ' 处置日志');
  }
  // 4. 现金：各周首尾相接；期初 = 银行余额；方案三个；推荐在三者中；执行后预测与方案一致
  const f = R.forecast;
  ok(f.weeks.length === d.cash.weeks, k + ' 周数');
  ok(f.weeks[0].opening === f.opening, k + ' 期初');
  f.weeks.forEach((w, i) => { ok(w.ending === w.opening + w.inflow - w.outflow, k + ' 第 ' + i + ' 周不衔接'); if (i) ok(w.opening === f.weeks[i - 1].ending, k + ' 第 ' + i + ' 周期初不等于上周期末'); });
  const co = core.cashOptions(d, lib);
  ok(co.options.length === 3 && ['A', 'B', 'C'].indexOf(co.recommend) >= 0, k + ' 现金方案');
  lintText(co.reason, k + ' 现金推荐理由');
  const d5 = core.applyCashOption(d, co.recommend, lib);
  const f5 = core.forecast(d5);
  ok(f5.minEnding === co.options.filter((o) => o.key === co.recommend)[0].minEnding, k + ' 方案落地后最低现金与模拟不一致');
  // 5. 政策：三态齐全；金额非负；不符项金额为 0；加入清单后汇总正确
  ok(R.policies.rows.length === lib.policies.policies.length, k + ' 政策条数');
  R.policies.rows.forEach((p) => { ok(p.amount >= 0, k + ' ' + p.id + ' 金额为负'); if (p.status === 'no') ok(p.amount === 0, k + ' ' + p.id + ' 不符却有金额'); lintText(p.reason, k + ' ' + p.id); });
  const okP = R.policies.rows.filter((p) => p.status === 'ok');
  ok(okP.length >= 1, k + ' 无可享政策');
  let d6 = d; okP.forEach((p) => { d6 = core.togglePolicy(d6, p.id); });
  const R6 = core.run(d6, lib);
  ok(R6.policies.amountListed === R.policies.amountOk, k + ' 申报清单汇总');
  // 6. 月报与 KPI
  ok(R.report.lines.length >= 6, k + ' 月报过短');
  lintText(R.report.text, k + ' 月报');
  ok(R.kpi.rev === R.statements.pl[R.statements.pl.length - 1].rev, k + ' KPI 收入');
  // 7. examples 与本次重算一致
  const ex = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'examples', k + '.output.json'), 'utf8'));
  ok(ex.kpi.rev === R.kpi.rev && ex.reconcile.counts.bad === R.reconcile.counts.bad && ex.forecast.minEnding === R.forecast.minEnding, k + ' examples 与内核不一致，先跑 run-examples');
});
ok(core.CREDITS === lib.credits.perRun['AI CFO'], '积分与 _shared/credits.json 不一致');
ok(core.evalExpr('a * (1 + b) - c >= 10 && d == \'x\'', { a: 10, b: 0.13, c: 1, d: 'x' }) === true, '表达式求值');
console.log('validate ok · ' + checks + ' 项断言通过');
