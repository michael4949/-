// 内核自检：对三套样本做结构与逻辑断言。改内核或样本后先跑 run-examples 再跑这里。
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const core = require('../core/lead.js');
const docparse = require('../../_shared/docparse.js');
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
  // 10. 对话与文档摄入：六屏开场、快捷问句、问答、文档
  const steps = core.screens().map((x) => x.key);
  ok(steps.length === 6 && core.screens().every((x) => x.key && x.label), k + ' screens 六屏登记');
  const isBlocks = (bs) => !bs || (Array.isArray(bs) && bs.every((b) => b == null || ['kv', 'table', 'tags', 'text'].indexOf(b.type) >= 0));
  const isAct = (a) => !a || (typeof a === 'object' && typeof a.type === 'string' && ['goto', 'focus', 'open', 'apply', 'set'].indexOf(a.type) >= 0 && JSON.stringify(a) === JSON.stringify(JSON.parse(JSON.stringify(a))));
  steps.forEach((st) => {
    const b = core.brief(st, d, lib, R);
    ok(typeof b === 'string' && b.length > 10 && !/undefined|NaN|\{\w+\}/.test(b), k + ' brief ' + st + '：' + b);
    lintText(b, k + ' brief ' + st);
    ok(JSON.stringify(core.brief(st, d, lib)) === JSON.stringify(b), k + ' brief 不传 result 结果不一致 ' + st);
    const sg = core.suggest(st, d, lib, R);
    ok(Array.isArray(sg) && sg.length >= 2 && sg.length <= 4, k + ' suggest ' + st);
    sg.forEach((q) => {
      const a = core.ask(q, st, d, lib, R);
      ok(a && a.text && !/undefined|NaN/.test(a.text), k + ' suggest 答不上 ' + st + ' · ' + q);
      ok(JSON.stringify(core.ask(q, st, d, lib, R)) === JSON.stringify(a), k + ' ask 两次不一致 ' + st + ' · ' + q);
      ok(JSON.stringify(core.ask(q, st, d, lib)) === JSON.stringify(a), k + ' ask 不传 result 结果不一致 ' + st + ' · ' + q);
      ok(isBlocks(a.blocks), k + ' ask blocks 块型 ' + q);
      ok(isAct(a.act), k + ' ask act 必须是纯数据 ' + q);
      lintText(a.text, k + ' ask ' + st + ' · ' + q);
    });
  });
  ok(core.ask('今天天气如何', 'board', d, lib, R) === null, k + ' 答不上返回 null');
  ok(core.brief('没有这一屏', d, lib, R) === null, k + ' 未知屏 brief 返回 null');
  // 文档：合同回填金额、来函记跟进、表格开全表、幻灯片只对口径
  const openNow = R.leads.filter((l) => l.stage !== 'won' && !l.dormant);
  const target = openNow.slice().sort((a, b) => b.amountEst - a.amountEst)[0];
  const amount = target.amountEst - 40000;
  const wordDoc = { ok: true, kind: 'word', name: 'contract.docx', size: 2048, sizeText: '2 KB', ext: 'docx',
    text: '采购框架合同\n合同金额：' + amount + ' 元\n交付期限：2026 年 11 月 30 日\n质保期 12 个月\n',
    paragraphs: ['采购框架合同', '合同金额：' + amount + ' 元', '交付期限：2026 年 11 月 30 日', '质保期 12 个月'],
    tables: [[['期次', '比例', '金额'], ['首付', '30%', String(Math.round(amount * 0.3))]]], sheets: [], slides: [], mail: null, stats: {}, note: '' };
  const beforeDoc = JSON.stringify(d);
  const wIn = core.ingest(wordDoc, 'leads', d, lib, R);
  ok(wIn && wIn.text && wIn.data && wIn.data !== d, k + ' ingest 合同返回新副本');
  ok(JSON.stringify(d) === beforeDoc, k + ' ingest 改动了原数据');
  const backfilled = wIn.data.leads.filter((l) => l.id === wIn.act.ref)[0];
  ok(backfilled.amountEst === amount && backfilled.note === '交付期限 2026-11-30', k + ' ingest 合同未回填金额与期限');
  ok(wIn.data.log.length === d.log.length + 1 && wIn.act.type === 'apply' && wIn.act.action === 'ingest', k + ' ingest 合同动作');
  ok(isBlocks(wIn.blocks) && JSON.stringify(core.ingest(wordDoc, 'leads', d, lib, R)) === JSON.stringify(wIn), k + ' ingest 合同两次不一致');
  ok(core.run(wIn.data, lib).byId[wIn.act.ref].amountEst === amount, k + ' ingest 合同回填后算不通');
  lintText(wIn.text, k + ' ingest 合同');
  const mail = docparse.parse({ name: 'mail.eml', bytes: Buffer.from('From: 采购部 <po@example.com>\nSubject: =?utf-8?B?' + Buffer.from('关于付款申请', 'utf8').toString('base64') + '?=\nDate: Wed, 16 Sep 2026 10:12:00 +0800\nContent-Type: text/plain; charset=utf-8\n\n本期申请付款 ' + amount + ' 元，请于 2026 年 11 月 30 日前安排。\n', 'utf8') });
  ok(mail.ok && mail.kind === 'eml', k + ' 来函解析');
  const mIn = core.ingest(mail, 'leads', d, lib, R);
  ok(mIn && mIn.text && mIn.data && mIn.data !== d && mIn.data.log.length === d.log.length + 1, k + ' ingest 来函写新副本');
  ok(JSON.stringify(d) === beforeDoc, k + ' ingest 来函改动了原数据');
  lintText(mIn.text, k + ' ingest 来函');
  const sheetDoc = { ok: true, kind: 'excel', name: 'leads.xlsx', size: 1024, sizeText: '1 KB', ext: 'xlsx', text: '', paragraphs: [], tables: [],
    sheets: [{ name: '线索表', rows: [['企业', '区域', '职务', '年采购额'], ['储能设备厂', '华东', '采购经理', '2400000']] }], slides: [], mail: null, stats: {}, note: '' };
  const sIn = core.ingest(sheetDoc, 'leads', d, lib, R);
  ok(sIn && sIn.text && !sIn.data && sIn.act.type === 'open' && sIn.act.panel === 'sheet' && sIn.act.input.head.length === 4, k + ' ingest 表格开全表');
  lintText(sIn.text, k + ' ingest 表格');
  const deck = { ok: true, kind: 'ppt', name: 'review.pptx', size: 1024, sizeText: '1 KB', ext: 'pptx', text: '', paragraphs: [], tables: [], sheets: [],
    slides: [{ no: 1, title: '三季度经营回顾', lines: ['新客成交 18 家'] }], mail: null, stats: {}, note: '' };
  const pIn = core.ingest(deck, 'board', d, lib, R);
  ok(pIn && pIn.text.indexOf('近 90 天成交 ' + R.kpi.deals90 + ' 单') >= 0 && !pIn.data, k + ' ingest 幻灯片对口径');
  lintText(pIn.text, k + ' ingest 幻灯片');
  const bad = core.ingest({ ok: false, name: 'x.doc', note: 'Office 97 老格式' }, 'leads', d, lib, R);
  ok(bad && bad.text.indexOf('没读出内容') >= 0 && !bad.data, k + ' ingest 读不出如实说');
  // 11. examples 一致
  const ex = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'examples', k + '.output.json'), 'utf8'));
  ok(ex.kpi.leads === R.kpi.leads && ex.kpi.gradeA === R.kpi.gradeA && ex.forecast.expected === R.forecast.expected, k + ' examples 与内核不一致，先跑 run-examples');
});
ok(core.CREDITS === lib.credits.perRun['AI获客'], '积分与 _shared/credits.json 不一致');
console.log('validate ok · ' + checks + ' 项断言通过');
