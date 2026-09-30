// 跑三套样本 → examples/<sector>.output.json，并打印决策驾驶舱摘要
const fs = require('fs');
const path = require('path');
const core = require('../core/decide.js');
const lib = require('./load-data.js')();
const dir = path.join(__dirname, '..', 'examples');
fs.mkdirSync(dir, { recursive: true });
const W = core.fmtW;
Object.keys(lib.samples).sort().forEach((k) => {
  const d = lib.samples[k];
  const R = core.run(d, lib);
  const A = R.attribution, root = A.rootCause;
  const ev = root ? core.evidence(d, lib, root.id, root.direction) : [];
  const S = root ? core.simulateAll(d, lib, root.id) : { sims: [], recommended: null };
  const d2 = root ? core.approve(core.submit(d, lib, root.id, S.recommended), lib, 'A-2609-01', '同意') : d;
  const R2 = core.run(d2, lib);
  const out = { version: core.VERSION, archetype: d.archetype, sector: d.sector, company: d.company, period: d.period, kpi: R.kpi,
    tree: Object.keys(R.tree.nodes).map((id) => { const n = R.tree.nodes[id]; return { id, name: n.name, cur: n.curText, prev: n.prevText, budget: n.budgetText, delta: n.deltaText, status: n.status, source: n.source }; }),
    attribution: { metric: A.name, basis: A.basisName, from: A.fromText, to: A.toText, delta: A.deltaText, method: A.method, groups: A.groups.map((g) => g.name + ' ' + g.valueText), leaves: A.leaves.map((x) => ({ id: x.id, name: x.name, value: x.value, text: x.valueText, factor: x.factorText, hurt: x.hurt, adj: x.adjText })), rootCause: root ? root.name : null },
    evidence: ev.map((e) => e.moduleName + ' · ' + e.title + '：' + e.detail),
    options: S.sims.map((s) => ({ key: s.option.key, name: s.option.name, owner: s.option.owner, invest: s.option.invest, risk: s.option.risk, params: s.params, summary: s.summary, netBenefit: s.totals.netBenefit, cashDelta12: s.totals.cashDelta12, recommended: s.recommended })),
    approvalExample: d2.approvals[0] ? { id: d2.approvals[0].id, option: d2.approvals[0].option.name, opinions: d2.approvals[0].opinions, status: d2.approvals[0].status, decisionId: d2.approvals[0].decisionId } : null,
    decisions: R2.decisions.map((x) => ({ id: x.id, title: x.title, status: x.statusName, owner: x.owner, progress: x.progress, next: x.next ? x.next.due + ' ' + x.next.title : null, tracking: x.tracking ? x.tracking.metricName + ' 目标 ' + x.tracking.targetText.join('/') + (x.tracking.actualText.length ? ' 实际 ' + x.tracking.actualText.join('/') : '') : null, review: x.review ? x.review.text : null })),
    report: R2.report.text };
  fs.writeFileSync(path.join(dir, k + '.output.json'), JSON.stringify(out, null, 2) + '\n');
  const K = R.kpi;
  console.log(`${k.padEnd(7)} ${d.company}  利润 ${W(K.profit)}(${W(K.profitDelta)}) · 收入 ${W(K.rev)} · 毛利率 ${(K.gm * 100).toFixed(1)}%/预算 ${(K.gmBudget * 100).toFixed(0)}% · 现金周期 ${Math.round(K.ccc)} 天 · 准时 ${Math.round(K.onTimeRate * 100)}% · 指标 风险 ${K.risk} 关注 ${K.watch} 正常 ${K.ok} · 决议执行中 ${K.executing} 完成 ${K.doneDecisions}`);
  console.log('   归因 ' + A.name + ' ' + A.deltaText + ' 主因 ' + (root ? root.name + ' ' + W(root.adjValue) : '—') + ' | ' + A.hurts.slice(0, 4).map((x) => x.name + ' ' + x.valueText).join(' · ') + ' | 校验 ' + A.check.toFixed(2));
  console.log('   证据 ' + ev.map((e) => e.moduleName + '·' + e.title).join(' / '));
  console.log('   方案 ' + S.sims.map((s) => s.option.key + ' ' + s.option.name + ' 净效益 ' + W(s.totals.netBenefit) + (s.recommended ? ' ★' : '')).join(' | '));
  if (d2.approvals[0]) console.log('   会签 ' + d2.approvals[0].opinions.map((o) => o.role + ' ' + o.opinionName).join(' / ') + ' → ' + d2.approvals[0].decisionId + ' ' + R2.decisions[0].milestones.length + ' 个节点');
  console.log('   ' + R2.report.text.split('\n').slice(1, 3).join('\n   ').slice(0, 500));
});
