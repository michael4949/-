// 内核自检：对三套账套样本做结构与逻辑断言。改内核或样本后先跑 run-examples 再跑这里。
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const core = require('../core/fin.js');
const lib = require('./load-data.js')();
const lint = require('../../_shared/lint.js')(lib.lintWords);
const docparse = require('../../_shared/docparse.js');
let checks = 0;
const ok = (c, m) => { assert(c, m); checks++; };
const lintText = (t, where) => { const hits = lint.hard(String(t)); ok(hits.length === 0, where + ' 命中禁词: ' + hits.join(',')); };

Object.keys(lib.samples).sort().forEach((k) => {
  const d = lib.samples[k];
  const R = core.run(d, lib), R2 = core.run(d, lib);
  ok(JSON.stringify(R.kpi) === JSON.stringify(R2.kpi), k + ' 确定性');
  // 1. 三表：资产负债表每期平衡；现金流量表净额 = 货币资金变动；利润表净利润 = 现金流量表起点
  R.statements.bs.forEach((b, i) => ok(Math.abs(b.diff) <= 10, k + ' 第 ' + i + ' 期资产负债表不平 ' + b.diff));
  R.statements.cf.forEach((c, i) => { ok(Math.abs(c.net - c.dCash) <= 10, k + ' 第 ' + i + ' 期现金流量净额与货币资金变动不符'); ok(c.netProfit === R.statements.pl[i].netProfit, k + ' 净利润口径'); });
  // 2. 勾稽：异常规则必有下钻与（有 fix 的）调整分录；调整后该条回到正常且三表仍平；调整不动原数据
  const before = JSON.stringify(d);
  const bad = R.reconcile.rows.filter((r) => r.status === 'bad');
  ok(bad.length >= 3, k + ' 样本应至少埋 3 处异常，实际 ' + bad.length);
  bad.forEach((r) => { ok(r.drill && (r.drill.rows || []).length >= 1, k + ' ' + r.id + ' 无下钻明细'); lintText(r.explain, k + ' ' + r.id); });
  let dd = d;
  bad.filter((r) => r.fix).forEach((r) => {
    dd = core.applyFix(dd, r.id, lib);
    const R3 = core.run(dd, lib);
    const row = R3.reconcile.rows.filter((x) => x.id === r.id)[0];
    ok(row.fixed, k + ' ' + r.id + ' 调整后未标记');
    ok(row.status !== 'bad', k + ' ' + r.id + ' 调整后仍异常 ' + row.diff);
    R3.statements.bs.forEach((b) => ok(Math.abs(b.diff) <= 10, k + ' ' + r.id + ' 调整后资产负债表不平 ' + b.diff));
  });
  ok(JSON.stringify(d) === before, k + ' applyFix 改动了原数据');
  const Rf = core.run(dd, lib);
  ok(Rf.reconcile.counts.bad <= R.reconcile.counts.bad - bad.filter((r) => r.fix).length + 1, k + ' 全部调整后异常数未下降');
  ok(dd.log.length === bad.filter((r) => r.fix).length, k + ' 调整日志条数');
  // 3. 风险：每条有证据；概率与影响在范围内；处置后概率下降且记日志
  R.risks.rows.forEach((r) => { ok(r.evidence.length >= 1, k + ' ' + r.id + ' 无证据'); ok(r.prob >= 0 && r.prob <= 1 && r.impact >= 0, k + ' ' + r.id + ' 概率或影响越界'); r.evidence.forEach((e) => lintText(e, k + ' ' + r.id)); });
  const top = R.risks.rows.filter((r) => r.level !== 'low')[0];
  if (top) {
    const d2 = core.applyRiskAction(d, top.id, top.actions[0].key, lib);
    const R4 = core.run(d2, lib);
    const r4 = R4.risks.rows.filter((x) => x.id === top.id)[0];
    ok(r4.handled.length === 1 || top.actions[0].key === 'declareUninvoiced', k + ' 处置未记录');
    ok(r4.prob <= top.prob, k + ' 处置后概率未下降');
    ok(d2.log.length === 1, k + ' 处置日志');
  }
  // 4. 现金：各周首尾相接；期初 = 银行余额；方案三个；推荐在三者中；执行后预测与方案一致
  const f = R.forecast;
  ok(f.weeks.length === d.cash.weeks, k + ' 周数');
  ok(f.weeks[0].opening === f.opening, k + ' 期初');
  f.weeks.forEach((w, i) => { ok(w.ending === w.opening + w.inflow - w.outflow, k + ' 第 ' + i + ' 周不衔接'); if (i) ok(w.opening === f.weeks[i - 1].ending, k + ' 第 ' + i + ' 周期初不等于上周期末'); });
  const co = core.cashOptions(d, lib);
  ok(co.options.length === 3 && ['A', 'B', 'C'].indexOf(co.recommend) >= 0, k + ' 现金方案');
  lintText(co.reason, k + ' 现金推荐理由');
  const d5 = core.applyCashOption(d, co.recommend, lib);
  const f5 = core.forecast(d5);
  ok(f5.minEnding === co.options.filter((o) => o.key === co.recommend)[0].minEnding, k + ' 方案落地后最低现金与模拟不一致');
  // 5. 政策：三态齐全；金额非负；不符项金额为 0；加入清单后汇总正确
  ok(R.policies.rows.length === lib.policies.policies.length, k + ' 政策条数');
  R.policies.rows.forEach((p) => { ok(p.amount >= 0, k + ' ' + p.id + ' 金额为负'); if (p.status === 'no') ok(p.amount === 0, k + ' ' + p.id + ' 不符却有金额'); lintText(p.reason, k + ' ' + p.id); });
  const okP = R.policies.rows.filter((p) => p.status === 'ok');
  ok(okP.length >= 1, k + ' 无可享政策');
  let d6 = d; okP.forEach((p) => { d6 = core.togglePolicy(d6, p.id); });
  const R6 = core.run(d6, lib);
  ok(R6.policies.amountListed === R.policies.amountOk, k + ' 申报清单汇总');
  // 6. 月报与 KPI
  ok(R.report.lines.length >= 6, k + ' 月报过短');
  lintText(R.report.text, k + ' 月报');
  ok(R.kpi.rev === R.statements.pl[R.statements.pl.length - 1].rev, k + ' KPI 收入');
  // 7. examples 与本次重算一致
  const ex = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'examples', k + '.output.json'), 'utf8'));
  ok(ex.kpi.rev === R.kpi.rev && ex.reconcile.counts.bad === R.reconcile.counts.bad && ex.forecast.minEnding === R.forecast.minEnding, k + ' examples 与内核不一致，先跑 run-examples');
  // 8. 对话与文档摄入：六屏开场、快捷问句、问答、文档
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
  // 四种点名：勾稽 / 风险 / 政策 / 周，不在本屏也能答
  ok(core.ask('R03 为什么差', 'board', d, lib, R).act.panel === 'rule', k + ' 点名勾稽条');
  ok(core.ask('K09 依据是什么', 'connect', d, lib, R).act.panel === 'risk', k + ' 点名风险条');
  ok(core.ask('P02 呢', 'cash', d, lib, R).act.panel === 'policy', k + ' 点名政策条');
  ok(core.ask('第 2 周怎么样', 'policy', d, lib, R).act.panel === 'week', k + ' 点名周');
  ok(core.ask('今天天气如何', 'board', d, lib, R) === null, k + ' 答不上返回 null');
  ok(core.brief('没有这一屏', d, lib, R) === null, k + ' 未知屏 brief 返回 null');
  // 「够不够」只测算、「按方案 X 执行」才写回
  ok(core.ask('催收够不够', 'cash', d, lib, R).act.type === 'open', k + ' 疑问句只测算');
  ok(core.ask('就按方案 A 执行', 'cash', d, lib, R).act.type === 'apply', k + ' 执行句写回');
  // 文档：科目余额表只摆比对、合同首期写新副本、经营 PPT 与邮件只对口径
  const before8 = JSON.stringify(d);
  const tb = docparse.parse({ name: 'trial-balance.csv', bytes: Buffer.from('科目编码,科目名称,期初余额,本期借方,本期贷方,期末余额\n1001,库存现金,12000,3000,4000,11000\n1122,应收账款,3200000,900000,560000,3540000\n1405,库存商品,2100000,800000,550000,2350000\n2202,应付账款,2000000,460000,800000,2340000\n', 'utf8') });
  const tIn = core.ingest(tb, 'recon', d, lib, R);
  ok(tIn && tIn.text && !tIn.data && tIn.act.type === 'open' && tIn.act.panel === 'trial' && tIn.act.rows.length >= 3, k + ' ingest 科目余额表');
  ok(isBlocks(tIn.blocks) && isAct(tIn.act), k + ' ingest 科目余额表块与动作');
  ok(JSON.stringify(core.ingest(tb, 'recon', d, lib, R)) === JSON.stringify(tIn), k + ' ingest 两次不一致');
  lintText(tIn.text, k + ' ingest 科目余额表');
  const ct = docparse.parse({ name: 'contract.txt', bytes: Buffer.from('采购框架合同\n第一条 合同金额：人民币 1,860,000 元（含税 13%），分三期支付。\n第二条 首付 30%，交付验收后付 60%，质保金 10%。\n第三条 交付期限：2026 年 11 月 30 日前完成全部交付。\n', 'utf8') });
  const cIn = core.ingest(ct, 'cash', d, lib, R);
  ok(cIn && cIn.data && cIn.data !== d && cIn.data.cash.apItems.length === d.cash.apItems.length + 1, k + ' ingest 合同首期写新副本');
  ok(JSON.stringify(d) === before8 && cIn.act.type === 'goto' && cIn.act.step === 'cash', k + ' ingest 合同不动入参');
  ok(core.run(cIn.data, lib).forecast.weeks.length === R.forecast.weeks.length, k + ' ingest 合同后可继续算');
  lintText(cIn.text, k + ' ingest 合同');
  const deck = { ok: true, kind: 'ppt', name: 'review.pptx', size: 1024, sizeText: '1 KB', ext: 'pptx', text: '三季度经营回顾 收入 4,260 万元 毛利率 28.4%', paragraphs: [], tables: [], sheets: [], slides: [{ no: 1, title: '三季度经营回顾', lines: ['收入 4,260 万元'] }], mail: null, stats: {}, note: '' };
  const pIn = core.ingest(deck, 'board', d, lib, R);
  ok(pIn && pIn.text && !pIn.data && pIn.act.panel === 'kpi', k + ' ingest 经营回顾只对口径');
  lintText(pIn.text, k + ' ingest 经营回顾');
  const ml = docparse.parse({ name: 'mail.eml', bytes: Buffer.from('From: \u91c7\u8d2d\u90e8 <procurement@example.com>\nSubject: =?utf-8?B?5LuY5qy+55Sz6K+3?=\nDate: Wed, 16 Sep 2026 10:12:00 +0800\nContent-Type: text/plain; charset=utf-8\n\n\u672c\u671f\u5e94\u4ed8\u8d26\u6b3e 234 \u4e07\u5143\uff0c\u5176\u4e2d\u903e\u671f 48 \u4e07\u5143\u3002\n', 'utf8') });
  const mIn = core.ingest(ml, 'risk', d, lib, R);
  ok(mIn && mIn.text && !mIn.data && mIn.act.panel === 'risk', k + ' ingest 付款邮件');
  lintText(mIn.text, k + ' ingest 付款邮件');
  ok(core.ingest({ ok: false }, 'board', d, lib, R) === null, k + ' ingest 解析失败返回 null');
  ok(JSON.stringify(d) === before8, k + ' ingest 全程未动入参');
});
ok(core.CREDITS === lib.credits.perRun['AI CFO'], '积分与 _shared/credits.json 不一致');
ok(core.evalExpr('a * (1 + b) - c >= 10 && d == \'x\'', { a: 10, b: 0.13, c: 1, d: 'x' }) === true, '表达式求值');
console.log('validate ok · ' + checks + ' 项断言通过');
