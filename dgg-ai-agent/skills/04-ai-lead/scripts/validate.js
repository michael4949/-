// 内核自检：对三套样本做结构与逻辑断言。改内核或样本后先跑 run-examples 再跑这里。
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const core = require('../core/lead.js');
const lib = require('./load-data.js')();
const lint = require('../../_shared/lint.js')(lib.lintWords);
let checks = 0;
const ok = (c, m) => { assert(c, m); checks++; };
const lintText = (t, where) => { const hits = lint.hard(String(t)); ok(hits.length === 0, where + ' 命中禁词: ' + hits.join(',')); };

Object.keys(lib.samples).sort().forEach((k) => {
  const d = lib.samples[k];
  const R = core.run(d, lib), R2 = core.run(d, lib);
  ok(JSON.stringify(R.kpi) === JSON.stringify(R2.kpi), k + ' 确定性');
  // 1. 画像：权重和为 1；三个细分；细分各有痛点、买点、案例
  const wsum = core.DIMS.reduce((t, x) => t + R.profile.weights[x], 0);
  ok(Math.abs(wsum - 1) < 1e-9, k + ' 权重和 ' + wsum);
  ok(R.profile.segments.length === 3, k + ' 细分数');
  R.profile.segments.forEach((s) => { ok(s.pains.length >= 2 && s.offers.length >= 1 && s.proof, k + ' ' + s.id + ' 细分不完整'); ok(s.count >= 1 && s.amount > 0, k + ' ' + s.id + ' 细分统计'); });
  // 2. 评分：0–100；等级与阈值一致；每条有解释；权重上调则匹配画像的线索分不降
  R.leads.forEach((l) => {
    ok(l.total >= 0 && l.total <= 100 && l.match >= 0 && l.match <= 100 && l.signal >= 0 && l.signal <= 100, k + ' ' + l.id + ' 分值越界');
    const g = lib.stages.grades; const exp = l.total >= g.A ? 'A' : l.total >= g.B ? 'B' : l.total >= g.C ? 'C' : 'D';
    ok(l.grade === exp, k + ' ' + l.id + ' 等级');
    const ex = core.explain(l, R.profile, d, lib); ok(ex.seen.length === 4 && ex.reasons.length === 3, k + ' ' + l.id + ' 解释'); ex.seen.concat(ex.reasons).forEach((t) => lintText(t, k + ' ' + l.id));
    ok(['first', 'follow', 'quote', 'wake', 'done'].indexOf(l.action) >= 0, k + ' ' + l.id + ' 动作');
  });
  const seg = R.profile.segments.filter((s) => s.id === R.profile.focus)[0];
  const matched = R.leads.filter((l) => l.sector === seg.sector);
  const d2 = core.setWeight(d, 'sector', 1.8);
  const R3 = core.run(d2, lib);
  matched.forEach((l) => { const l3 = R3.byId[l.id]; ok(l3.match >= l.match - 1, k + ' ' + l.id + ' 上调行业权重后匹配分下降 ' + l.match + '→' + l3.match); });
  // 3. 切换重点细分后排序变化且顶部线索属于该细分行业
  const other = R.profile.segments.filter((s) => s.id !== R.profile.focus)[0];
  const R4 = core.run(core.setFocus(d, other.id), lib);
  ok(R4.profile.focus === other.id, k + ' 切换细分');
  // 4. 脚本：四渠道 × 四阶段 × 两版都能组合，无未替换占位符，长度合理，异议 3 条
  ['phone', 'wechat', 'fair', 'mail'].forEach((ch) => ['first', 'follow', 'quote', 'wake'].forEach((st) => [0, 1].forEach((v) => {
    R.profile.segments.forEach((s) => {
      const sc = core.script(d, R.profile, lib, { segId: s.id, channel: ch, stage: st, variant: v });
      ok(sc.sections.length === 5 && sc.objections.length === 3, k + ' 脚本结构 ' + sc.key);
      ok(!/\{\w+\}/.test(sc.text), k + ' 脚本有未替换占位符 ' + sc.key + ' ' + (sc.text.match(/\{\w+\}/) || [])[0]);
      ok(sc.words >= 120 && sc.words <= 420, k + ' 脚本长度 ' + sc.key + ' ' + sc.words);
      lintText(sc.text, k + ' 脚本 ' + sc.key);
    });
  })));
  const scA = core.script(d, R.profile, lib, { segId: seg.id, channel: 'phone', stage: 'first', variant: 0 }), scB = core.script(d, R.profile, lib, { segId: seg.id, channel: 'phone', stage: 'first', variant: 1 });
  ok(scA.text !== scB.text, k + ' 换一版无变化');
  const d5 = core.adoptScript(d, scA.key, 0);
  ok(core.script(d5, R.profile, lib, { segId: seg.id, channel: 'phone', stage: 'first', variant: 0 }).adopted, k + ' 采用未生效');
  // 5. 分派：一键分派后未分派数为 0 或各组满载；不超负载；原数据不动
  const before = JSON.stringify(d);
  const d6 = core.assignAll(d, lib);
  ok(JSON.stringify(d) === before, k + ' assignAll 改动了原数据');
  const R6 = core.run(d6, lib);
  R6.teams.forEach((t) => ok(t.load <= t.cap, k + ' ' + t.name + ' 超负载 ' + t.load + '/' + t.cap));
  ok(R6.kpi.unassigned === 0 || R6.teams.every((t) => t.free === 0), k + ' 一键分派后仍有未分派且有空位');
  ok(d6.log.length === 1, k + ' 分派日志');
  // 6. 计划：每组每天 ≤ 5；不重复；加入计划后出现在计划里；预测可复算
  const seen = {};
  R6.plan.items.forEach((it) => { ok(!seen[it.leadId], k + ' 计划重复 ' + it.leadId); seen[it.leadId] = 1; });
  R6.plan.days.forEach((day) => d.teams.forEach((t) => ok(day.items.filter((i) => i.owner === t.id).length <= 5, k + ' ' + day.date + ' ' + t.name + ' 超 5 条')));
  const unplanned = R6.leads.filter((l) => l.owner && l.stage !== 'won' && !l.dormant && l.grade === 'C' && !l.overdue)[0];
  if (unplanned) { const d7 = core.addPlan(d6, unplanned.id); const R7 = core.run(d7, lib); ok(R7.plan.items.some((i) => i.leadId === unplanned.id), k + ' 加入计划未生效'); }
  const st = {}; lib.stages.stages.forEach((s) => { st[s.key] = s.prob; });
  const exp = Math.round(R.leads.filter((l) => l.stage !== 'won' && !l.dormant).reduce((t, l) => t + st[l.stage] * l.amountEst, 0));
  ok(exp === R.forecast.expected, k + ' 预测复算 ' + exp + ' vs ' + R.forecast.expected);
  // 7. 漏斗单调；渠道条数之和 = 线索数
  for (let i = 1; i < R.funnel.stages.length; i++) ok(R.funnel.stages[i].count <= R.funnel.stages[i - 1].count, k + ' 漏斗不单调');
  ok(R.funnel.channels.reduce((t, c) => t + c.leads, 0) === R.leads.length, k + ' 渠道条数');
  // 8. 推进与沉睡
  const lead0 = R.leads.filter((l) => l.stage === 'lead')[0];
  if (lead0) { const d8 = core.advance(d, lead0.id, '电话沟通'); const R8 = core.run(d8, lib); ok(R8.byId[lead0.id].stage === 'contact' && R8.byId[lead0.id].lastAge === 0, k + ' 推进阶段'); }
  const dorm = R.leads.filter((l) => l.dormant)[0];
  if (dorm) ok(dorm.action === 'wake', k + ' 沉睡动作');
  // 9. 周报与禁词
  ok(R.report.lines.length >= 7, k + ' 周报过短'); lintText(R.report.text, k + ' 周报');
  R.leads.forEach((l) => lintText(l.name + ' ' + (l.lastAction ? l.lastAction.text : ''), k + ' 线索文案'));
  // 10. examples 一致
  const ex = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'examples', k + '.output.json'), 'utf8'));
  ok(ex.kpi.leads === R.kpi.leads && ex.kpi.gradeA === R.kpi.gradeA && ex.forecast.expected === R.forecast.expected, k + ' examples 与内核不一致，先跑 run-examples');
});
ok(core.CREDITS === lib.credits.perRun['AI获客'], '积分与 _shared/credits.json 不一致');
console.log('validate ok · ' + checks + ' 项断言通过');
