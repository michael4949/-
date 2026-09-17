// 跑四种业态样本 → examples/<archetype>.output.json（改内核或样本后先跑），并打印指挥室摘要
// 每套输出：排程全景 + 首张延期订单的归因与处置候选 + 预置加急单的三方案对比 + 采购建议 + 交付日报
const fs = require('fs');
const path = require('path');
const core = require('../core/sim.js');
const data = require('./load-data.js')();
const dir = path.join(__dirname, '..', 'examples');
fs.mkdirSync(dir, { recursive: true });
const pad = (s, n) => { s = String(s); const w = s.replace(/[^\x00-\xff]/g, 'xx').length; return s + ' '.repeat(Math.max(0, n - w)); };

Object.keys(data.samples).sort().forEach((k) => {
  const d = data.samples[k];
  const S = core.schedule(d);
  const first = S.orders.filter((o) => o.status === 'late')[0] || S.orders.filter((o) => o.status === 'risk')[0];
  const explain = first ? core.explain(S, first.id) : null;
  const actions = first ? core.actions(d, S, first.id) : [];
  const insert = core.simulateInsert(d, d.insertPresets[0]);
  delete insert._S; delete insert.base;
  const plan = core.purchasePlan(d, S);
  const daily = core.daily(d, S, plan);
  const out = { version: core.VERSION, archetype: k, company: d.company, today: d.today, kpi: S.kpi,
    orders: S.orders.map((o) => ({ id: o.id, customer: o.customer, productName: o.productName, qty: o.qty, due: o.due, finishDate: o.finishDate, status: o.status, riskReason: o.riskReason, cause: o.cause, lateDays: o.lateDays, kitRate: o.kitRate, waitMaterial: o.waitMaterial, waitCapacity: o.waitCapacity, ops: o.ops.map((p) => ({ op: p.op, line: p.line, done: p.done, inProgress: p.inProgress, startDay: p.startDay, endDay: p.endDay, remain: p.remain })) })),
    lines: S.lines.map((L) => ({ id: L.id, name: L.name, load7: L.load7, loadHorizon: L.loadHorizon, status: L.status })),
    focus: first ? { orderId: first.id, explain, actions: actions.map((a) => ({ key: a.key, label: a.label, desc: a.desc, cost: a.cost, rank: a.rank, advised: a.advised, effect: a.effect })) } : null,
    insert, purchase: { summary: plan.summary, items: plan.items.filter((x) => x.urgency !== 'ok').map((x) => ({ id: x.id, name: x.name, urgency: x.urgency, suggestQty: x.suggestQty, unit: x.unit, latestOrderLabel: x.latestOrderLabel, overdue: x.overdue, amount: x.amount, reason: x.reason })), slow: plan.slow, po: plan.po.map((p) => ({ supplier: p.supplier, amount: p.amount, lines: p.lines.length })) },
    daily: { kpi: daily.kpi, text: daily.text } };
  fs.writeFileSync(path.join(dir, k + '.output.json'), JSON.stringify(out, null, 2) + '\n');
  const V = d.vocab;
  console.log(`${pad(k, 8)} ${pad(d.company, 30)} ${V.orders} ${S.kpi.open} 张：按期 ${S.kpi.open - S.kpi.late} · 风险 ${S.kpi.risk} · 延期 ${S.kpi.late} · 按期率 ${S.kpi.onTimeRate}%`);
  if (first) console.log(`    焦点 ${first.id} ${explain.label}：${explain.reasons[0]}`);
  actions.slice(0, 2).forEach((a) => console.log(`    ${a.rank}. ${a.label} ${a.desc} → ${a.effect.finishBefore} 改为 ${a.effect.finishAfter}${a.effect.meetsDue ? '（赶上）' : ''}，费用 ${a.cost} 元`));
  console.log(`    ${V.insert} ${insert.request.customer} → 推荐 ${insert.recommend}：${insert.reason}`);
  console.log(`    ${V.purchase} 缺口 ${plan.summary.short} · 安全库存 ${plan.summary.safety} · 下单 ${plan.summary.buy} 项 ${plan.summary.amount} 元 · 呆滞 ${plan.summary.slow} 项`);
});
