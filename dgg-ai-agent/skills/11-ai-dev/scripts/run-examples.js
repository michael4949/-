// 跑三套样本（默认预置句：ensure → generate → run，再预演三条追加句）→ examples/<archetype>.output.json，并打印一行应用摘要。改内核或样本后先跑这里再跑 validate。
const fs = require('fs');
const path = require('path');
const K = require('../core/build.js');
const lib = require('./load-data.js')();
const dir = path.join(__dirname, '..', 'examples');
fs.mkdirSync(dir, { recursive: true });

Object.keys(lib.samples).sort().forEach((k) => {
  const d = K.generate(K.ensure(lib.samples[k]), lib);
  const R = K.run(d, lib);
  const P = R.parsed, T = R.testResult, S = R.stats;
  const byKind = {}; T.byKind.forEach((b) => { byKind[b.kind] = b.passed + '/' + b.n; });
  const out = {
    version: K.VERSION, archetype: d.archetype, company: d.company, today: d.today, text: R.text,
    parsed: { object: P.object, objectName: P.objectName, flow: P.flow, flowMode: P.flowMode, hits: P.hits, unknown: P.unknown, roles: P.roles.map((r) => ({ slot: r.slot, title: r.title, hit: r.hit })) },
    kpi: R.kpi,
    pages: R.pages.map((p) => ({ n: p.n, name: p.name, device: p.device, roles: p.roles })),
    states: R.spec.states.map((s) => s.label),
    transitions: R.spec.transitions.map((t) => t.action),
    apis: R.apis.map((a) => ({ id: a.id, method: a.method, path: a.path, roles: a.roles })),
    tests: { byKind, passed: T.passed, total: T.total, warnings: T.warnings.map((w) => w.text) },
    stats: { open: S.open, doing: S.doing, done: S.done, avgAcceptMin: S.avgAcceptMin, overdueN: S.overdueN },
    checklist: { passed: R.checklist.passed, total: R.checklist.total, all: R.checklist.all, items: R.checklist.items.map((i) => ({ label: i.label, ok: i.ok })) },
    deliverables: R.deliverables.map((x) => ({ name: x.name, no: x.no, count: x.count })),
    report: { text: R.report.text },
    followUps: K.followUpsOf(lib, k).map((f) => { const pv = K.previewDelta(R.spec, f.text, lib); return { text: f.text, mode: pv.delta.mode, types: pv.delta.ops.map((o) => o.type), states: pv.states, fields: pv.fields, pages: pv.pages, apis: pv.apis, tests: pv.tests, rules: pv.rules, stats: pv.stats }; })
  };
  fs.writeFileSync(path.join(dir, k + '.output.json'), JSON.stringify(out, null, 2) + '\n');
  const Kp = R.kpi;
  console.log(`${k.padEnd(7)} ${d.company}  ${P.objectName} · ${P.flowName}${P.flowModeName ? '（' + P.flowModeName + '）' : ''} 命中 ${P.hits} 词 · ${Kp.pages} 页 ${Kp.fields} 字段 ${Kp.roles} 角色 ${Kp.states} 节点 ${Kp.apis} 接口 · 用例 ${Kp.passed}/${Kp.tests} 越权拦截 ${Kp.roleBlocked} · 记录 ${Kp.rows} 待办 ${Kp.open} 超时 ${Kp.overdue} 平均${S.acceptLabel} ${S.avgAcceptMin} 分 · 检查 ${Kp.checklist} · ${Kp.version} ${R.env} · 追加 ${out.followUps.map((f) => '+' + f.states + '节点/' + f.fields + '字段/' + f.pages + '页').join(' ')}`);
});
