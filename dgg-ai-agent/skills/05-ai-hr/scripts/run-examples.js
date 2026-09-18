// 跑三套样本 → examples/<sector>.output.json，并打印人力驾驶舱摘要
const fs = require('fs');
const path = require('path');
const core = require('../core/hr.js');
const lib = require('./load-data.js')();
const dir = path.join(__dirname, '..', 'examples');
fs.mkdirSync(dir, { recursive: true });
const W = core.fmtW;
Object.keys(lib.samples).sort().forEach((k) => {
  const d = lib.samples[k];
  const R = core.run(d, lib);
  const K = R.kpi;
  const top = R.candidates[0];
  const jdSite = core.jd(d, d.needs[0].id, lib, 'site'), jdPoster = core.jd(d, d.needs[0].id, lib, 'poster');
  const scored = R.candidates.filter((c) => c.scores)[0];
  const out = { version: core.VERSION, archetype: d.archetype, sector: d.sector, company: d.company, kpi: K,
    org: { headcount: R.org.headcount, budget: R.org.budget, byDept: R.org.byDept, tenure: R.org.tenure, age: R.org.age, turnover: R.org.turnover, reasons: R.org.reasons, dispatchRatio: R.org.dispatchRatio, avgWage: R.org.avgWage },
    needs: R.needs.map((n) => ({ id: n.id, title: n.title, count: n.count, dueDate: n.dueDate, band: n.band, candidates: n.candidates, gradeA: n.gradeA, stages: n.stages })),
    jd: { site: jdSite.text, poster: jdPoster.text },
    candidates: R.candidates.map((c) => ({ id: c.id, job: c.jobTitle, grade: c.grade, total: c.total, dims: c.score.dims, gates: c.score.gates, stage: c.stage, action: c.action, expected: c.expected })),
    explainTop: { seen: top.score.seen, reasons: top.score.reasons },
    interview: scored ? { id: scored.id, kit: core.interviewKit(d, scored, lib).sets.map((s) => s.label + ' ×' + s.questions.length), result: scored.interview } : null,
    compliance: R.compliance.items.map((i) => ({ id: i.id, name: i.name, severity: i.severity, count: i.count, impact: i.impact, status: i.status })),
    calendar: { counts: R.calendar.counts, weeks: R.calendar.weeks.map((w) => w.label + ':' + w.items.length) },
    cost: { monthly: R.cost.monthly, annual: R.cost.annual, share: R.cost.share, structure: R.cost.structure, perCapitaCost: R.cost.perCapitaCost, perCapitaRevenue: R.cost.perCapitaRevenue },
    plans: R.sim.plans.map((p) => ({ key: p.key, name: p.name, total12: p.total12, delta: p.delta, endHeadcount: p.endHeadcount, share: p.share, hires: p.hires, recommended: p.recommended })),
    report: R.report.text };
  fs.writeFileSync(path.join(dir, k + '.output.json'), JSON.stringify(out, null, 2) + '\n');
  console.log(`${k.padEnd(7)} ${d.company}  在编 ${K.headcount}/${K.budget} · 离职率 ${K.turnover}%(参考 ${K.turnoverBench}) · 人均产值 ${W(K.perCapitaRevenue)} · 成本占比 ${K.laborShare}%(参考 ${K.laborBench}) · 合规 ${K.complianceOpen} 项 高 ${K.complianceHigh} 影响 ${W(K.complianceImpact)} · 基数 ${K.socialBaseRatio}% · 超时 ${K.overtimeOver} · 到期 ${K.contractsDue60}`);
  const gc = { A: 0, B: 0, C: 0, D: 0 }; R.candidates.forEach((c) => gc[c.grade]++);
  console.log('   候选 ' + R.candidates.length + ' ' + JSON.stringify(gc) + ' | ' + R.needs.map((n) => n.title + ' ' + n.count + '人 候选 ' + n.candidates + ' A' + n.gradeA + ' 带 ' + n.band.join('-')).join(' | '));
  console.log('   分值 ' + R.candidates.map((c) => c.id.slice(-3) + c.grade + c.total).join(' '));
  console.log('   合规 ' + R.compliance.items.map((i) => i.id + ':' + i.count + '人/' + Math.round(i.impact / 10000) + '万/' + i.status[0]).join(' '));
  console.log('   成本 月 ' + W(R.cost.monthly) + ' 年 ' + W(R.cost.annual) + ' | 方案 ' + R.sim.plans.map((p) => p.key + ' ' + W(p.total12) + ' Δ' + W(p.delta) + ' 期末' + p.endHeadcount).join(' | ') + ' | 社保Δ/月 ' + W(R.sim.socialDelta));
  console.log('   日历 ' + R.calendar.counts.total + ' 项 ' + R.calendar.weeks.map((w) => w.items.length).join('/') + ' | JD ' + jdSite.words + ' 字 / 海报 ' + jdPoster.words + ' 字' + (scored ? ' | 面试 ' + scored.id + ' ' + scored.interview.avg + ' ' + scored.interview.verdictName + ' 定薪 ' + scored.interview.suggested : ''));
  console.log('   ' + R.report.text.split('\n').slice(1, 4).join('\n   '));
});
