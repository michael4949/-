// 跑三套样本 → examples/<sector>.output.json，并打印法务驾驶舱摘要
const fs = require('fs');
const path = require('path');
const core = require('../core/legal.js');
const lib = require('./load-data.js')();
const dir = path.join(__dirname, '..', 'examples');
fs.mkdirSync(dir, { recursive: true });
Object.keys(lib.samples).sort().forEach((k) => {
  const d = lib.samples[k];
  const R = core.run(d, lib);
  const top = R.contracts[0];
  const op = core.opinion(d.contracts.filter((c) => c.id === top.id)[0], top.review, lib);
  const out = { version: core.VERSION, archetype: d.archetype, sector: d.sector, company: d.company, kpi: R.kpi,
    contracts: R.contracts.map((c) => ({ id: c.id, title: c.title, type: c.typeName, role: c.roleName, party: c.party, amount: c.amount, status: c.status, end: c.end, score: c.score, level: c.level, counts: c.review.counts, findings: c.findings.map((f) => f.id + ' ' + f.severity + ' ' + (f.clauseNo ? '第' + f.clauseNo + '条 ' : '') + f.clauseTitle) })),
    opinionTop: op.text,
    setup: { type: R.setup.typeName, name: R.setup.name, region: R.setup.region, startDate: R.setup.startDate, endDate: R.setup.endDate, totalDays: R.setup.totalDays, steps: R.setup.steps.map((s) => s.title + ' ' + s.start + '→' + s.end), equity: R.setup.equity ? { control: R.setup.equity.control, lines: R.setup.equity.lines.map((l) => l.label + (l.met ? ' 达到' : ' 未达')), charter: R.setup.equity.charter } : null, risks: R.setup.risks, fees: R.setup.fees },
    ip: { coverage: R.ip.coverage, counts: R.ip.counts, assets: R.ip.assets.map((a) => ({ id: a.id, kind: a.kindName, title: a.title, due: a.due, daysLeft: a.daysLeft, status: a.status, action: a.action, fee: a.fee })), gaps: R.ip.gaps.map((g) => g.cls + ' ' + g.name + ' ' + g.tier), similar: R.ip.similar.map((s) => s.name + ' ' + s.status + ' ' + s.action), leads: R.ip.leads.map((l) => l.where + ' ' + l.product + ' ' + l.action) },
    licenses: R.licenses.map((l) => l.name + ' ' + l.stateName),
    register: { counts: R.register.counts, weeks: R.register.weeks.map((w) => w.label + ':' + w.items.length), items: R.register.items.map((i) => i.label + ' ' + i.kindName + ' ' + i.title) },
    report: R.report.text };
  fs.writeFileSync(path.join(dir, k + '.output.json'), JSON.stringify(out, null, 2) + '\n');
  const K = R.kpi;
  console.log(`${k.padEnd(6)} ${d.company}  合同 ${K.contracts} · 审查中 ${K.inReview} · 高 ${K.highRisk} · 中 ${K.midRisk} · 问题 ${K.findingsOpen} · 均分 ${K.avgScore} · 合规 ${K.compliance} · 证照到期 ${K.licDue}/${K.licTotal} · 知产 ${K.ipAssets}(急 ${K.ipUrgent}) 覆盖 ${K.coverage}% 缺口 ${K.ipGaps} · 台账 30 天 ${K.due30} 逾期 ${K.overdue} · 设立 ${K.setupDays} 天`);
  R.contracts.forEach((c) => console.log('   ' + c.id + ' ' + c.typeName.padEnd(7) + ' ' + String(c.score).padStart(3) + ' ' + c.level.padEnd(4) + ' ' + c.findings.map((f) => f.id + (f.kind === 'missing' ? '' : '@' + f.clauseNo) + ':' + f.severity[0]).join(' ')));
  console.log('   设立 ' + R.setup.typeName + ' ' + R.setup.totalDays + ' 天 ' + R.setup.startDate + '→' + R.setup.endDate + ' | ' + (R.setup.equity ? R.setup.equity.control + ' ' + R.setup.equity.lines.map((l) => l.label + (l.met ? '✓' : '✗')).join(' ') : '分公司') + ' | 风险 ' + R.setup.risks.map((r) => r.severity).join(','));
  console.log('   知产 ' + R.ip.assets.map((a) => a.id + ' ' + a.status + (a.action ? ' ' + a.action + '(' + a.daysLeft + 'd ' + a.fee + ')' : '')).join(' | '));
  console.log('   缺口 ' + R.ip.gaps.map((g) => g.cls + g.tier[0]).join(' ') + ' | 近似 ' + R.ip.similar.map((s) => s.name + ' ' + s.action + ' ' + s.daysLeft).join(', ') + ' | 线索 ' + R.ip.leads.length);
  console.log('   证照 ' + R.licenses.map((l) => l.name + ' ' + l.stateName).join(' | '));
  console.log('   台账 ' + R.register.counts.total + ' 项 ' + R.register.weeks.map((w) => w.items.length).join('/') + ' | 30 天 ' + R.register.counts.due30 + ' 逾期 ' + R.register.counts.overdue);
  console.log('   ' + R.report.text.split('\n').slice(1, 5).join('\n   '));
});
