// 跑三套样本 → examples/<sector>.output.json，并打印驾驶舱摘要
const fs = require('fs');
const path = require('path');
const core = require('../core/lead.js');
const lib = require('./load-data.js')();
const dir = path.join(__dirname, '..', 'examples');
fs.mkdirSync(dir, { recursive: true });
const W = core.fmtW;
Object.keys(lib.samples).sort().forEach((k) => {
  const d = lib.samples[k];
  const R = core.run(d, lib);
  const seg = R.profile.segments.filter((s) => s.id === R.profile.focus)[0];
  const sc = core.script(d, R.profile, lib, { segId: seg.id, channel: 'phone', stage: 'first', variant: 0 });
  const top = R.leads[0];
  const out = { version: core.VERSION, archetype: d.archetype, sector: d.sector, company: d.company, kpi: R.kpi,
    profile: { weights: R.profile.weights, avgCycle: R.profile.avgCycle, avgAmount: R.profile.avgAmount, repeatRate: R.profile.repeatRate, segments: R.profile.segments.map((s) => ({ id: s.id, name: s.name, count: s.count, amount: s.amount, cycle: s.cycle, repeat: s.repeat, share: Math.round(s.share * 100), pains: s.pains.map((p) => p.tag), offers: s.offers.map((o) => o.key) })), focus: R.profile.focus },
    leads: R.leads.map((l) => ({ id: l.id, industry: l.industry, grade: l.grade, total: l.total, match: l.match, signal: l.signal, stage: l.stage, owner: l.owner, action: l.action, overdue: l.overdue, dormant: l.dormant })),
    explainTop: core.explain(top, R.profile, d, lib), script: { key: sc.key, words: sc.words, sections: sc.sections, objections: sc.objections },
    funnel: R.funnel, forecast: R.forecast, plan: { days: R.plan.days.map((x) => ({ date: x.date, count: x.items.length })), overdue: R.plan.overdue.length, unassigned: R.plan.unassigned.length, byTeam: R.plan.byTeam }, teams: R.teams, report: R.report.text };
  fs.writeFileSync(path.join(dir, k + '.output.json'), JSON.stringify(out, null, 2) + '\n');
  const K = R.kpi;
  console.log(`${k.padEnd(6)} ${d.company}  线索 ${K.leads} · 本周新增 ${K.newWeek} · A ${K.gradeA} · B ${K.gradeB} · 跟进中 ${K.following} · 未分派 ${K.unassigned} · 逾期 ${K.overdue} · 沉睡 ${K.dormant} · 本月成交 ${K.wonMonth} · 线索成本 ${K.costPerLead} 元`);
  console.log('   权重 ' + core.DIMS.map((x) => core.DIM_LABEL[x] + ' ' + Math.round(R.profile.weights[x] * 100) + '%').join(' · ') + ' | 细分 ' + R.profile.segments.map((s) => s.id + ' ' + s.name + '（' + s.count + ' 家 · ' + Math.round(s.share * 100) + '%）').join(' | '));
  console.log('   前 5 线索 ' + R.leads.slice(0, 5).map((l) => l.id + ' ' + l.industry + ' ' + l.grade + l.total + '(' + l.match + '/' + l.signal + ') ' + l.actionLabel + (l.overdue ? ' 逾期' : '')).join(' | '));
  const gc = { A: 0, B: 0, C: 0, D: 0 }; R.leads.forEach((l) => gc[l.grade]++);
  console.log('   等级分布 ' + JSON.stringify(gc) + ' · 漏斗 ' + R.funnel.stages.map((s) => s.name + ' ' + s.count + (s.rate != null ? '(' + s.rate + '%)' : '')).join(' → '));
  console.log('   渠道 ' + R.funnel.channels.map((c) => c.name + ' ' + c.leads + '/A' + c.gradeA + ' ' + (c.costPerLead != null ? c.costPerLead + '元' : '-')).join(' | '));
  console.log('   预测 管道 ' + W(R.forecast.pipeline) + ' 加权 ' + W(R.forecast.expected) + ' 约 ' + R.forecast.expectedDeals + ' 单 | 计划 ' + R.plan.items.length + ' 次 ' + R.plan.days.map((x) => x.label + ' ' + x.items.length).join('、') + ' | 逾期 ' + R.plan.overdue.length + ' 未分派 ' + R.plan.unassigned.length);
  console.log('   脚本 ' + sc.key + ' ' + sc.words + ' 字：' + sc.sections[0].text.slice(0, 60) + '…');
  console.log('   ' + R.report.text.split('\n').slice(1, 4).join('\n   '));
});
