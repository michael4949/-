// 跑三套样本 → examples/<archetype>.output.json，并打印一行工序流看板摘要。改内核或样本后先跑这里再跑 validate。
const fs = require('fs');
const path = require('path');
const K = require('../core/flow.js');
const lib = require('./load-data.js')();
lib.erp = require(path.join(__dirname, '..', '..', '10-ai-erp', 'core', 'sim.js'));
const dir = path.join(__dirname, '..', 'examples');
fs.mkdirSync(dir, { recursive: true });

Object.keys(lib.samples).sort().forEach((k) => {
  const d = K.ensure(lib.samples[k]);
  const R = K.run(d, lib);
  const B = R.bottleneck, L = R.loss, P = R.preview, D = R.dispatch;
  const out = {
    version: K.VERSION, archetype: d.archetype, company: d.company, dept: d.dept, today: d.today, weekStart: d.weekStart,
    kpi: R.kpi,
    bottleneck: { line: B.line, load7: B.load7, queueDays: B.queueDays, longestQueue: B.longestQueue, sameLine: B.sameLine, balanceRate: B.balanceRate, hpu: B.hpu, capHoursPerDay: B.capHoursPerDay,
      wip: { today: B.wip.today.hours, tomorrow: B.wip.tomorrow.hours, maxHours: B.wip.maxHours, maxUnits: B.wip.maxUnits, capDays: B.wip.capDays, overDay: B.wip.overDay ? B.wip.overDay.label : null }, wipDays: B.wipDays },
    verify: { counts: R.verify.counts, pending: R.verify.pending, total: R.verify.total },
    alerts: R.alerts.map((a) => ({ id: a.id, rule: a.rule, lineName: a.lineName, cause: a.cause, roleName: a.roleName, savedH: a.savedH })),
    loss: { line: L.line, start: L.start, end: L.end, items: L.items, availability: L.availability, performance: L.performance, effUtil: L.effUtil },
    calibrationExpired: R.calibration.filter((c) => c.status === 'expired'),
    sequence: { before: R.sequence.before, after: { seq: R.sequence.after.seq, changeovers: R.sequence.after.changeovers, minutes: R.sequence.after.minutes }, savedHPerDay: R.sequence.savedHPerDay },
    preview: { base: P.base.metrics, recommended: P.recommended, cards: P.cards.map((c) => ({ key: c.key, name: c.name, recommended: c.recommended, result: { metrics: c.result.metrics, cost: c.result.cost } })), combo: { keys: P.combo.keys, metrics: P.combo.result.metrics } },
    dispatch: { id: D.id, date: D.date, filled: D.filled, support: D.support, unmet: D.unmet, otWeek: D.otWeek },
    maintenance: R.maintenance.map((m) => ({ machine: m.machine, lineName: m.lineName, reasons: m.reasons, window: m.window ? m.window.label : null, minutes: m.minutes, role: m.role, scheduled: m.scheduled })),
    ledger: { totals: R.ledger.totals, counterText: R.ledger.counterText },
    weekly: { text: R.weekly.text }
  };
  fs.writeFileSync(path.join(dir, k + '.output.json'), JSON.stringify(out, null, 2) + '\n');
  const Kp = R.kpi;
  console.log(`${k.padEnd(7)} ${d.company}  约束 ${Kp.constraint} 负荷 ${Kp.load7}% · 排队 ${Kp.queueDays} 天 · 平衡率 ${Kp.balanceRate}% · 在制 ${Kp.wipDays} 天 · 有效利用率 ${Kp.effUtil}% · 报工待核 ${Kp.reportsPending}/${Kp.reportsTotal} · 异常 ${Kp.alertsOpen}/${Kp.alertsTotal} · 标准工时过期 ${Kp.stdExpired} · 保养到期 ${Kp.maintDue} · 推荐方案 ${P.recommended} · 派工 ${D.filled} 人（支援 ${D.support}）`);
});
