// 跑三套账套样本 → examples/<sector>.output.json（改内核或样本后先跑），并打印驾驶舱摘要
const fs = require('fs');
const path = require('path');
const core = require('../core/fin.js');
const lib = require('./load-data.js')();
const dir = path.join(__dirname, '..', 'examples');
fs.mkdirSync(dir, { recursive: true });
const W = core.fmtW;
Object.keys(lib.samples).sort().forEach((k) => {
  const d = lib.samples[k];
  const R = core.run(d, lib);
  const co = core.cashOptions(d, lib);
  const out = { version: core.VERSION, archetype: d.archetype, sector: d.sector, company: d.company, period: d.period, kpi: R.kpi,
    statements: { pl: R.statements.pl.map((p) => ({ month: p.month, rev: p.rev, gross: p.gross, gm: Math.round(p.gm * 1000) / 10, netProfit: p.netProfit })), bsLast: R.statements.bs[R.statements.bs.length - 1], cfLast: R.statements.cf[R.statements.cf.length - 1] },
    reconcile: { counts: R.reconcile.counts, rows: R.reconcile.rows.map((r) => ({ id: r.id, name: r.name, status: r.status, lhs: r.lhs, rhs: r.rhs, diff: r.diff, tol: r.tol, fix: r.fix ? r.fix.label + ' ' + r.fix.amount : null })), reasons: R.reconcile.reasons },
    risks: { counts: R.risks.counts, rows: R.risks.rows.map((r) => ({ id: r.id, name: r.name, level: r.level, value: r.value, unit: r.unit, band: r.band, prob: r.prob, impact: r.impact, evidence: r.evidence })) },
    forecast: { opening: R.forecast.opening, safety: R.forecast.safety, minWeek: R.forecast.minWeek, minEnding: R.forecast.minEnding, gap: R.forecast.gap, weeks: R.forecast.weeks.map((w) => ({ w: w.w, label: w.label, inflow: w.inflow, outflow: w.outflow, ending: w.ending })) },
    cashOptions: { recommend: co.recommend, reason: co.reason, options: co.options.map((o) => ({ key: o.key, name: o.name, minEnding: o.minEnding, gap: o.gap, cost: o.cost, clears: o.clears })) },
    policies: { counts: R.policies.counts, amountOk: R.policies.amountOk, rows: R.policies.rows.map((p) => ({ id: p.id, name: p.name, status: p.status, amount: p.amount, reason: p.reason })) },
    report: R.report.text };
  fs.writeFileSync(path.join(dir, k + '.output.json'), JSON.stringify(out, null, 2) + '\n');
  const K = R.kpi;
  console.log(`${k.padEnd(6)} ${d.company}  收入 ${W(K.rev)} 毛利率 ${K.gm}% 净利率 ${K.nm}% 经营现金流 ${W(K.cfo)} 账户余额 ${W(K.cash)} 可用 ${K.cashMonths} 月`);
  console.log('   勾稽 ' + JSON.stringify(R.reconcile.counts) + ' → ' + R.reconcile.rows.filter((r) => r.status !== 'ok' && r.status !== 'na').map((r) => r.id + ' ' + r.name + ' 差 ' + core.fmtN(r.diff) + ' [' + r.status + ']' + (r.fix ? ' → ' + r.fix.label + ' ' + core.fmtN(r.fix.amount) : '')).join(' | '));
  console.log('   风险 ' + JSON.stringify(R.risks.counts) + ' → ' + R.risks.rows.map((r) => r.id + ' ' + r.name + ' ' + r.value + r.unit + ' 带[' + r.band + '] p' + r.prob + ' 影响 ' + W(r.impact) + ' ' + r.level).join(' | '));
  console.log('   现金 期初 ' + W(R.forecast.opening) + ' 最低 第' + (R.forecast.minWeek + 1) + '周 ' + W(R.forecast.minEnding) + ' 缺口 ' + W(R.forecast.gap) + ' 周末 ' + R.forecast.weeks.map((w) => Math.round(w.ending / 10000)).join(' '));
  console.log('   方案 ' + co.options.map((o) => o.key + ' ' + o.name + ' 最低 ' + W(o.minEnding) + (o.clears ? ' ✓' : ' 缺 ' + W(o.gap)) + ' 成本 ' + o.cost).join(' | ') + ' → 推荐 ' + co.recommend + '：' + co.reason);
  console.log('   政策 ' + JSON.stringify(R.policies.counts) + ' 可享 ' + W(R.policies.amountOk) + ' → ' + R.policies.rows.map((p) => p.id + (p.status === 'ok' ? '✓' : p.status === 'pending' ? '~' : '✗') + W(p.amount)).join(' '));
  console.log('   ' + R.report.text.split('\n').slice(1).join('\n   '));
});
