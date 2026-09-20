// 内核自检：对三套样本做结构与逻辑断言。改内核或样本后先跑 run-examples 再跑这里。
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const core = require('../core/legal.js');
const lib = require('./load-data.js')();
const lint = require('../../_shared/lint.js')(lib.lintWords);
const docparse = require('../../_shared/docparse.js');
let checks = 0;
const ok = (c, m) => { assert(c, m); checks++; };
const lintText = (t, where) => { const hits = lint.hard(String(t)); ok(hits.length === 0, where + ' 命中禁词: ' + hits.join(',')); };
const R0 = lib.contractRules;
const W = R0.weights;

// 规则表自洽：每条风险规则的修订结果不再命中本条；模板插入的条款不命中任何规则
R0.risks.forEach((r) => {
  ok(r.fix && ['replace', 'insert'].indexOf(r.fix.mode) >= 0, r.id + ' 缺修订');
  ok(['high', 'mid', 'low'].indexOf(r.severity) >= 0, r.id + ' 严重度');
  const env = Object.assign({ role: 'supply' }, r.fix.params);
  ['supply', 'buy', 'borrower', 'lessee', 'orderer', 'disclosing', 'employer', 'principal', 'client', 'provider', 'merchant', 'supplier'].forEach((role) => { env.role = role; ok(!core.evalExpr(r.when, env), r.id + ' 修订后仍命中 (' + role + ')'); });
  ok(!/\{\w+\}/.test(r.fix.text), r.id + ' 修订文本含占位符');
  ok(!/第\s*\d+\s*条|第[一二三四五六七八九十百]+条/.test(r.basis), r.id + ' 依据写到了条款编号');
  lintText(r.issue + r.basis + r.fix.text, r.id);
});
Object.keys(R0.templates).forEach((t) => {
  const tpl = R0.templates[t];
  R0.risks.filter((r) => r.clause === t).forEach((r) => { const env = Object.assign({ role: 'buy' }, tpl.params); ok(!core.evalExpr(r.when, env), '模板 ' + t + ' 命中 ' + r.id); });
  lintText(tpl.title + tpl.text, '模板 ' + t);
});
Object.keys(R0.required).forEach((t) => { ok(R0.types[t], '合同类型 ' + t + ' 无名称'); R0.required[t].forEach((k) => ok(R0.templates[k], t + ' 必备条款 ' + k + ' 无模板')); });

const levelCounts = {};
Object.keys(lib.samples).sort().forEach((k) => {
  const d = lib.samples[k];
  const R = core.run(d, lib), R2 = core.run(d, lib);
  ok(JSON.stringify(R.kpi) === JSON.stringify(R2.kpi), k + ' 确定性');
  ok(JSON.stringify(R.data) !== undefined && JSON.stringify(d) === JSON.stringify(lib.samples[k]), k + ' run 改动了原数据');
  levelCounts[k] = { high: R.kpi.highRisk, mid: R.kpi.midRisk, low: R.contracts.length - R.kpi.highRisk - R.kpi.midRisk };
  // 1. 合同审查：分数可复算；等级与阈值一致；每条发现有依据与修订；按分数升序
  R.contracts.forEach((c, i) => {
    const pen = c.findings.reduce((t, f) => t + W[f.severity], 0);
    ok(c.score === Math.max(0, 100 - pen), k + ' ' + c.id + ' 分数复算');
    const hi = c.findings.filter((f) => f.severity === 'high').length;
    const exp = c.score < R0.levels.mid ? 'high' : (c.score < R0.levels.low || hi > 0) ? 'mid' : 'low';
    ok(c.level === exp, k + ' ' + c.id + ' 等级 ' + c.level + ' vs ' + exp);
    if (i) ok(c.score >= R.contracts[i - 1].score, k + ' 排序');
    c.findings.forEach((f) => {
      ok(f.basis && f.issue && f.fix, k + ' ' + c.id + ' ' + f.id + ' 不完整');
      ok(!/\{\w+\}/.test(f.issue), k + ' ' + c.id + ' ' + f.id + ' 问题描述有未替换占位符 ' + f.issue);
      if (f.kind === 'risk') ok(c.clauses.some((x) => x.no === f.clauseNo && x.type === f.clauseType), k + ' ' + c.id + ' ' + f.id + ' 条款号');
      lintText(f.issue + ' ' + f.basis + ' ' + f.fix.text, k + ' ' + c.id + ' ' + f.id);
    });
    const raw = d.contracts.filter((x) => x.id === c.id)[0];
    const op = core.opinion(raw, c.review, lib);
    ok(op.lines.length === 3 + Math.max(1, c.findings.length) + (c.findings.length ? 1 : 0), k + ' ' + c.id + ' 意见行数');
    ok(op.text.indexOf(c.id) >= 0 && op.text.indexOf('风险分 ' + c.score) >= 0, k + ' ' + c.id + ' 意见内容');
    lintText(op.text, k + ' ' + c.id + ' 意见');
    lintText(c.title + ' ' + c.party + ' ' + c.clauses.map((x) => x.title + x.text).join(' '), k + ' ' + c.id + ' 合同文本');
  });
  // 2. 逐条采纳修订：分数单调不降；全部采纳后 100 分、无高风险、必备条款齐全；原数据不动；日志逐条
  R.contracts.forEach((c) => {
    let cur = d, last = c.score, n = 0;
    const before = JSON.stringify(d);
    for (let guard = 0; guard < 20; guard++) {
      const rv = core.reviewContract(core.run(cur, lib).byId[c.id], lib);
      if (!rv.findings.length) break;
      const f = rv.findings[0];
      cur = core.applyFix(cur, c.id, f.id, lib); n++;
      const after = core.run(cur, lib).byId[c.id];
      ok(after.score >= last, k + ' ' + c.id + ' 采纳 ' + f.id + ' 后分数下降 ' + last + '→' + after.score);
      ok(!after.findings.some((x) => x.id === f.id), k + ' ' + c.id + ' 采纳 ' + f.id + ' 后仍命中');
      last = after.score;
    }
    ok(JSON.stringify(d) === before, k + ' ' + c.id + ' applyFix 改动了原数据');
    const fin = core.run(cur, lib).byId[c.id];
    ok(fin.score === 100 && fin.level === 'low' && fin.findings.length === 0, k + ' ' + c.id + ' 全部采纳后 ' + fin.score + ' ' + fin.findings.map((f) => f.id).join(','));
    const present = {}; fin.clauses.forEach((x) => { present[x.type] = 1; });
    (R0.required[c.type] || []).forEach((t) => ok(present[t], k + ' ' + c.id + ' 采纳后仍缺 ' + t));
    ok(fin.revisions.length === n && cur.log.filter((l) => l.kind === 'contract').length === n, k + ' ' + c.id + ' 修订记录 ' + n);
    fin.clauses.filter((x) => x.revised && !x.inserted).forEach((x) => ok(x.before && x.before !== x.text, k + ' ' + c.id + ' 第 ' + x.no + ' 条修订前文缺失'));
    const nos = fin.clauses.map((x) => x.no); ok(new Set(nos).size === nos.length, k + ' ' + c.id + ' 条款编号重复');
  });
  // 采纳一处高风险修订后，合同等级不升高、KPI 待处理问题减一
  const hiC = R.contracts.filter((c) => c.findings.some((f) => f.severity === 'high'))[0];
  if (hiC) { const f = hiC.findings.filter((x) => x.severity === 'high')[0]; const R3 = core.run(core.applyFix(d, hiC.id, f.id, lib), lib); ok(R3.kpi.findingsOpen <= R.kpi.findingsOpen - 1 && R3.kpi.revised === 1, k + ' 采纳后 KPI'); ok(R3.byId[hiC.id].score === hiC.score + W.high, k + ' 采纳高风险后分数'); }
  // 3. 股权控制线
  const eq = core.equity([{ holder: 'A', pct: 70 }, { holder: 'B', pct: 30 }], lib);
  ok(eq.control === '绝对控制' && eq.lines[0].met && eq.lines[1].met && !eq.lines[2].met, '70/30');
  const eq2 = core.equity([{ holder: 'A', pct: 60 }, { holder: 'B', pct: 40 }], lib);
  ok(eq2.control === '相对控制' && !eq2.lines[0].met && eq2.lines[1].met && eq2.lines[2].met && eq2.lines[2].holder === 'B', '60/40');
  const eq3 = core.equity([{ holder: 'A', pct: 50 }, { holder: 'B', pct: 50 }], lib);
  ok(eq3.control === '僵局' && eq3.deadlock && eq3.charter.some((t) => t.indexOf('对半') >= 0), '50/50');
  const eq4 = core.equity([{ holder: 'A', pct: 40 }, { holder: 'B', pct: 35 }, { holder: 'C', pct: 25 }], lib);
  ok(eq4.control === '无控制方' && eq4.lines[2].met, '40/35/25');
  ok(core.equity([{ holder: 'A', pct: 51 }, { holder: 'B', pct: 49 }], lib).control === '相对控制', '51/49');
  ok(core.equity([{ holder: 'A', pct: 67 }, { holder: 'B', pct: 33 }], lib).control === '绝对控制', '67/33');
  ok(!core.equity([{ holder: 'A', pct: 70 }, { holder: 'B', pct: 20 }], lib).totalOk, '合计校验');
  // 4. 设立方案：步骤连续、总天数 = 最晚结束；许可并行；更新后待确认；确认后进台账
  const S = R.setup;
  S.steps.filter((s) => s.kind === 'step').forEach((s, i, arr) => { if (i) ok(s.startDay === arr[i - 1].endDay, k + ' 设立步骤不连续 ' + s.title); ok(core.days(s.start, s.end) === s.days, k + ' 步骤日期 ' + s.title); });
  ok(S.totalDays === Math.max(...S.steps.map((s) => s.endDay)) && S.endDate === core.dateOf(S.startDate, S.totalDays), k + ' 设立总天数');
  ok(S.materials.length >= 10 && S.fees.total === lib.setupRules.fees.seal + lib.setupRules.fees.agency, k + ' 材料与费用');
  S.risks.forEach((r) => lintText(r.text, k + ' 设立风险')); (S.equity ? S.equity.charter : []).forEach((t) => lintText(t, k + ' 章程'));
  ok(!S.confirmed && R.register.counts.setup === 0, k + ' 未确认不进台账');
  const dC = core.confirmSetup(d, lib); const RC = core.run(dC, lib);
  ok(RC.setup.confirmed && RC.register.counts.setup === RC.setup.steps.filter((s) => core.days(d.today, s.end) <= 90).length && RC.register.counts.setup > 0, k + ' 确认后台账 ' + RC.register.counts.setup);
  ok(dC.log.some((l) => l.kind === 'setup'), k + ' 确认日志');
  const dU = core.updateSetup(dC, { type: 'branch' }); const RU = core.run(dU, lib);
  ok(!RU.setup.confirmed && RU.setup.type === 'branch' && RU.setup.equity === null && RU.register.counts.setup === 0, k + ' 更新后待确认');
  const dN = core.updateSetup(d, { type: 'newco', shares: [{ holder: '甲', pct: 50 }, { holder: '乙', pct: 50 }] }); const RN = core.run(dN, lib);
  ok(RN.setup.equity.deadlock && RN.setup.risks.some((r) => r.severity === 'high'), k + ' 对半分风险');
  // 5. 知产：到期日复算；续展窗口；年费年份；清单切换；缺口与覆盖率复算
  const I = lib.ipClasses;
  R.ip.assets.forEach((a) => {
    if (a.kind === 'trademark') { ok(a.due === a.regDate.replace(/^\d{4}/, (y) => +y + I.rules.trademarkYears), k + ' ' + a.id + ' 商标到期'); ok(a.daysLeft === core.days(d.today, a.due), k + ' ' + a.id + ' 剩余天数'); ok((a.action === '续展') === (a.daysLeft <= I.rules.renewWindowMonths * 30.4 && a.daysLeft >= -I.rules.graceMonths * 30.4), k + ' ' + a.id + ' 续展窗口'); if (a.action) ok(a.fee === (I.fees.renewal.official + I.fees.renewal.agency + (a.daysLeft < 0 ? I.fees.renewal.graceExtra : 0)) * a.classes.length, k + ' ' + a.id + ' 续展费'); }
    if (a.kind === 'patent') { ok(core.days(d.today, a.due) === a.daysLeft && a.daysLeft > -366, k + ' ' + a.id + ' 年费日期'); ok(a.feeYear >= 2 && a.fee > 0, k + ' ' + a.id + ' 年费'); ok((a.action === '缴年费') === (a.daysLeft <= I.rules.feeAheadDays), k + ' ' + a.id + ' 年费提醒'); }
    lintText(a.title, k + ' ' + a.id);
  });
  const map = I.byIndustry[d.profile.industry] || I.byIndustry.default; const have = {}; d.ip.trademarks.forEach((t) => t.classes.forEach((c) => { have[c] = 1; }));
  const all = map.core.concat(map.extend); ok(R.ip.coverage === Math.round(100 * all.filter((c) => have[c]).length / all.length), k + ' 覆盖率复算');
  ok(R.ip.gaps.length === all.filter((c) => !have[c]).length && R.ip.gaps.every((g) => !have[g.cls] && g.reason), k + ' 缺口');
  const urgent = R.ip.assets.filter((a) => a.urgent)[0];
  if (urgent) { const dR = core.toggleRenew(d, urgent.id); const RR = core.run(dR, lib); ok(RR.ip.renewCount === 1 && RR.ip.renewFee === urgent.fee, k + ' 加入续展清单'); ok(core.run(core.toggleRenew(dR, urgent.id), lib).ip.renewCount === 0, k + ' 移出续展清单'); ok(RR.register.items.filter((i) => i.ref === urgent.id)[0].listed === true, k + ' 台账标记已列'); }
  const gap = R.ip.gaps[0];
  if (gap) { const dA = core.toggleApply(d, gap.cls); const RA = core.run(dA, lib); ok(RA.ip.applyCount === 1 && RA.ip.applyFee === gap.fee && RA.ip.gaps[0].listed, k + ' 加入申请清单'); }
  R.ip.similar.forEach((s) => ok(s.action && s.classNames.length === s.classes.length, k + ' 近似商标 ' + s.name)); R.ip.leads.forEach((l) => ok(l.action, k + ' 侵权线索'));
  // 6. 证照
  R.licenses.forEach((l) => { const exp = l.daysLeft == null ? 'ok' : l.daysLeft < 0 ? 'expired' : l.daysLeft <= I.rules.licenseAheadDays ? 'due' : 'ok'; ok(l.state === exp, k + ' 证照 ' + l.name); lintText(l.name + ' ' + (l.issuer || ''), k + ' 证照'); });
  // 7. 台账：全部在 90 天内或 7 天内逾期；升序；每周项数之和 = 落在 13 周内的项；类别计数
  const reg = R.register;
  reg.items.forEach((it, i) => { ok(it.daysLeft <= 90 && it.daysLeft >= -7, k + ' 台账越界 ' + it.title + ' ' + it.daysLeft); if (i) ok(it.daysLeft >= reg.items[i - 1].daysLeft, k + ' 台账未排序'); ok(it.label && it.kindName && it.tone, k + ' 台账项不完整'); lintText(it.title + ' ' + it.sub, k + ' 台账 ' + it.title); });
  ok(reg.weeks.length === 13 && reg.weeks[0].start === d.weekStart, k + ' 周格');
  const inWeeks = reg.items.filter((it) => core.days(d.weekStart, it.date) >= 0 && core.days(d.weekStart, it.date) < 91).length;
  ok(reg.weeks.reduce((t, w) => t + w.items.length, 0) === inWeeks, k + ' 周格项数');
  ok(reg.counts.total === reg.items.length && reg.counts.overdue === reg.items.filter((i) => i.daysLeft < 0).length && reg.counts.due30 === reg.items.filter((i) => i.daysLeft >= 0 && i.daysLeft <= 30).length, k + ' 台账计数');
  ok(reg.counts.contract + reg.counts.license + reg.counts.ip + reg.counts.setup === reg.counts.total, k + ' 台账类别计数');
  d.contracts.forEach((c) => { if (core.days(d.today, c.end) <= 90) ok(reg.items.some((i) => i.kind === 'contract' && i.ref === c.id), k + ' ' + c.id + ' 到期未进台账'); (c.milestones || []).forEach((m) => { const dd = core.days(d.today, m.date); if (dd >= -7 && dd <= 90) ok(reg.items.some((i) => i.kind === 'milestone' && i.title.indexOf(m.text) >= 0), k + ' 节点未进台账 ' + m.text); }); });
  R.licenses.forEach((l) => { if (l.daysLeft != null && l.daysLeft <= 90) ok(reg.items.some((i) => i.kind === 'license' && i.ref === l.id), k + ' 证照未进台账 ' + l.name); });
  R.ip.assets.forEach((a) => { if (a.daysLeft != null && a.daysLeft <= 90) ok(reg.items.some((i) => i.kind === 'ip' && i.ref === a.id), k + ' 知产未进台账 ' + a.id); });
  // 8. KPI 与月报
  const K = R.kpi;
  ok(K.avgScore === Math.round(R.contracts.reduce((t, c) => t + c.score, 0) / R.contracts.length), k + ' 均分');
  ok(K.findingsOpen === R.contracts.reduce((t, c) => t + c.findings.length, 0) && K.highRisk + K.midRisk <= K.contracts, k + ' KPI 合同');
  ok(K.compliance >= 0 && K.compliance <= 100 && K.compliance === Math.round(K.avgScore * 0.4 + (R.licenses.filter((l) => l.state === 'ok').length / R.licenses.length) * 30 + K.coverage * 0.3), k + ' 合规分复算');
  ok(K.due30 === reg.counts.due30 && K.ipUrgent === R.ip.counts.urgent && K.ipGaps === R.ip.gaps.length, k + ' KPI 台账知产');
  ok(R.report.lines.length >= 7 && R.report.text.indexOf(d.company) >= 0, k + ' 月报');
  lintText(R.report.text, k + ' 月报');
  const RL = core.run(core.toggleRenew(core.applyFix(d, R.contracts[0].id, R.contracts[0].findings[0].id, lib), R.ip.assets[0].id), lib);
  ok(RL.report.text.indexOf('本期处置') >= 0 && RL.data.log.length === 2, k + ' 月报处置行');
  // 9. examples 一致
  const ex = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'examples', k + '.output.json'), 'utf8'));
  ok(JSON.stringify(ex.kpi) === JSON.stringify(K), k + ' examples 与内核不一致，先跑 run-examples');
  // 10. 样本文本禁词、代号规范
  lintText(JSON.stringify(d), k + ' 样本全文');
  d.contracts.forEach((c) => ok(/^HT-\d{4}-\d{3}$/.test(c.id), k + ' 合同编号 ' + c.id));
  ok(!/企查查|天眼查|启信宝|爱企查/.test(JSON.stringify(d)), k + ' 数据源厂商名');
  // 11. 对话与文档摄入：六屏开场、快捷问句、问答、文档
  const raw0 = JSON.stringify(d);
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
      ok(a && a.text && !/undefined|NaN|\{\w+\}/.test(a.text), k + ' suggest 答不上 ' + st + ' · ' + q);
      ok(JSON.stringify(core.ask(q, st, d, lib, R)) === JSON.stringify(a), k + ' ask 两次不一致 ' + st + ' · ' + q);
      ok(JSON.stringify(core.ask(q, st, d, lib)) === JSON.stringify(a), k + ' ask 不传 result 结果不一致 ' + st + ' · ' + q);
      ok(isBlocks(a.blocks), k + ' ask blocks 块型 ' + q);
      ok(isAct(a.act), k + ' ask act 必须是纯数据 ' + q);
      lintText(a.text, k + ' ask ' + st + ' · ' + q);
    });
  });
  // 点名类：合同号、知产编号、商标类别、证照名
  const nc = core.ask(R.contracts[0].id + ' 怎么样', 'board', d, lib, R);
  ok(nc && nc.ref === R.contracts[0].id && nc.act.type === 'open' && nc.act.panel === 'contract', k + ' 点名合同');
  const na = core.ask(R.ip.assets[0].id + ' 什么时候到期', 'ip', d, lib, R);
  ok(na && na.ref === R.ip.assets[0].id && isAct(na.act), k + ' 点名知产 ' + R.ip.assets[0].id);
  const ng = core.ask('第 ' + R.ip.gaps[0].cls + ' 类', 'ip', d, lib, R);
  ok(ng && ng.act.type === 'apply' && ng.act.action === 'toggleApply', k + ' 点名缺口类别');
  ok(core.ask('第 ' + R.ip.gaps[0].cls + ' 类', 'board', d, lib, R).act.type === 'goto', k + ' 缺口类别不在知产屏先换屏');
  const nl = core.ask(R.licenses[0].name + ' 还有多久', 'board', d, lib, R);
  ok(nl && nl.ref === R.licenses[0].id && nl.act.panel === 'license', k + ' 点名证照');
  ok(core.ask('今天天气如何', 'board', d, lib, R) === null, k + ' 答不上返回 null');
  ok(core.brief('没有这一屏', d, lib, R) === null && core.ask('有没有逾期', '没有这一屏', d, lib, R) === null, k + ' 未知屏返回 null');
  ok(JSON.stringify(d) === raw0, k + ' 对话没动入参');
  // 文档：合同文本进台账写新副本、台账 Excel 与科目 Excel 分流、PPT 与邮件只换屏 / 开抽屉
  const cdoc = docparse.parse({ name: 'contract.txt', bytes: Buffer.from('采购框架合同\n甲方：' + d.company + '　乙方：宁波德昌模具有限公司\n第一条 合同金额：人民币 1,860,000 元（含税 13%），分三期支付，首付 30%。\n第二条 交付期限：2026 年 11 月 30 日前完成全部交付。\n第三条 违约责任：逾期交付按日万分之五计收违约金，累计不超过合同金额 5%。\n第四条 质保期 12 个月，自验收合格之日起算。\n', 'utf8') });
  const cIn = core.ingest(cdoc, 'contracts', d, lib, R);
  ok(cIn && cIn.text && cIn.data && cIn.data !== d, k + ' ingest 合同文本');
  ok(cIn.data.contracts.length === d.contracts.length + 1 && JSON.stringify(d) === raw0, k + ' ingest 写新副本、不动入参');
  const added = cIn.data.contracts[cIn.data.contracts.length - 1];
  ok(added.id === 'HT-DOC-01' && cIn.ref === added.id && added.amount === 1860000, k + ' ingest 合同编号与金额');
  ok(core.run(cIn.data, lib).byId[added.id].score === core.reviewContract(added, lib).score, k + ' ingest 合同可继续算');
  ok(cIn.act.type === 'apply' && cIn.act.action === 'ingest', k + ' ingest 合同动作');
  ok(JSON.stringify(core.ingest(cdoc, 'contracts', d, lib, R)) === JSON.stringify(cIn), k + ' ingest 两次不一致');
  ok(isBlocks(cIn.blocks), k + ' ingest 合同块型');
  lintText(cIn.text, k + ' ingest 合同');
  const ledger = { ok: true, kind: 'excel', name: 'contracts.xlsx', size: 2048, sizeText: '2 KB', ext: 'xlsx', text: '', paragraphs: [], tables: [], slides: [], mail: null, stats: {}, note: '',
    sheets: [{ name: '合同台账', rows: [['合同编号', '相对方', '金额'], ['HT-2601-001', 'K-001 · 汽配', '860000']] }] };
  const lIn = core.ingest(ledger, 'contracts', d, lib, R);
  ok(lIn && !lIn.data && lIn.act.type === 'set' && lIn.act.path === 'filter', k + ' ingest 合同台账表');
  const tb = { ok: true, kind: 'excel', name: 'trial-balance.xlsx', size: 2048, sizeText: '2 KB', ext: 'xlsx', text: '', paragraphs: [], tables: [], slides: [], mail: null, stats: {}, note: '',
    sheets: [{ name: '科目余额表', rows: [['科目编码', '科目名称', '期末余额'], ['1001', '库存现金', '12000']] }] };
  const tIn = core.ingest(tb, 'contracts', d, lib, R);
  ok(tIn && !tIn.data && !tIn.act && tIn.text.indexOf('进不了合同台账') >= 0, k + ' ingest 科目表不进台账');
  lintText(tIn.text, k + ' ingest 科目表');
  const deck = { ok: true, kind: 'ppt', name: 'review.pptx', size: 1024, sizeText: '1 KB', ext: 'pptx', text: '三季度经营回顾 收入 4,260 万元', paragraphs: [], tables: [], sheets: [], mail: null, stats: {}, note: '',
    slides: [{ no: 1, title: '三季度经营回顾', lines: ['收入 4,260 万元'] }] };
  const pIn = core.ingest(deck, 'register', d, lib, R);
  ok(pIn && !pIn.data && pIn.act.type === 'open' && pIn.act.panel === 'doc' && isBlocks(pIn.act.blocks), k + ' ingest PPT');
  lintText(pIn.text, k + ' ingest PPT');
  const mail = { ok: true, kind: 'eml', name: 'mail.eml', size: 900, sizeText: '900 B', ext: 'eml', text: '本月付款 234 万元，请安排。', paragraphs: [], tables: [], sheets: [], slides: [], stats: {}, note: '',
    mail: { from: '采购部', to: '财务部', cc: '', subject: '关于 11 月付款申请', date: '2026-09-16', attaches: [] } };
  const mIn = core.ingest(mail, 'board', d, lib, R);
  ok(mIn && !mIn.data && mIn.act.type === 'open' && mIn.act.panel === 'contract' && R.byId[mIn.act.ref], k + ' ingest 邮件');
  lintText(mIn.text, k + ' ingest 邮件');
  ok(core.ingest({ ok: false }, 'board', d, lib, R) === null && core.ingest(null, 'board', d, lib, R) === null, k + ' ingest 解析失败返回 null');
});
ok(levelCounts.make.high === 3 && levelCounts.make.mid === 5 && levelCounts.make.low === 4, '制造样本等级分布 ' + JSON.stringify(levelCounts.make));
console.log('validate ok: ' + checks + ' 项断言通过 · ' + JSON.stringify(levelCounts));
