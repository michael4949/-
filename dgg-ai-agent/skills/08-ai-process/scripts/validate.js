// 内核自检：对三套样本做结构与逻辑断言（确定性、不改原样本、约束识别、报工核验、异常、瀑布守恒、校准、投料、合批、预演、立项、派工、保养、增效账、周报、文案禁词、examples 一致）。
// 改内核或样本后先跑 run-examples 再跑这里。若某条断言因内核缺陷不成立：写成 TODO 注释跳过并在结果里报告，不削弱断言、不改内核。
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const K = require('../core/flow.js');
const lib = require('./load-data.js')();
lib.erp = require(path.join(__dirname, '..', '..', '10-ai-erp', 'core', 'sim.js'));
const lint = require('../../_shared/lint.js')(lib.lintWords);
const schema = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'schema', 'data.json'), 'utf8'));
let checks = 0;
const ok = (c, m) => { assert(c, m); checks++; };
const near = (a, b, tol) => Math.abs(a - b) <= (tol == null ? 0.05 : tol);
const finite = (x) => typeof x === 'number' && isFinite(x);
const AVOID = /刀|承诺/;
const lintText = (t, where) => { const s = String(t == null ? '' : t); const hits = lint.hard(s); ok(hits.length === 0, where + ' 命中禁词: ' + hits.join(',')); ok(!AVOID.test(s), where + ' 含回避词 ' + s.slice(0, 80)); };
const clean = (t, where) => { const s = String(t == null ? '' : t); ok(!/\{\w+\}|undefined|NaN/.test(s), where + ' 文本异常 ' + s.slice(0, 120)); lintText(s, where); };
const r0 = (x) => Math.round(x), r1 = (x) => Math.round(x * 10) / 10;
const sum = (arr, f) => arr.reduce((t, x) => t + (f ? f(x) : x), 0);
const multiset = (a) => a.slice().sort().join(',');

// ---------- 简单 JSON Schema 检查（只做 required / type / enum / pattern / additionalProperties，不引第三方库） ----------
function typeOf(v) { return v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v; }
function checkSchema(sc, v, where, errs) {
  if (sc.$ref) sc = schema.definitions[sc.$ref.replace('#/definitions/', '')];
  if (sc.type) { const ts = [].concat(sc.type), t = typeOf(v); if (ts.indexOf(t) < 0 && !(t === 'number' && ts.indexOf('integer') >= 0 && Number.isInteger(v))) { errs.push(where + ' 类型应为 ' + ts.join('|') + '，实为 ' + t); return; } }
  if (sc.enum && sc.enum.indexOf(v) < 0) errs.push(where + ' 取值 ' + v + ' 不在 ' + sc.enum.join('/'));
  if (sc.pattern && typeof v === 'string' && !new RegExp(sc.pattern).test(v)) errs.push(where + ' 不匹配 ' + sc.pattern);
  if (sc.minimum != null && typeof v === 'number' && v < sc.minimum) errs.push(where + ' 小于 ' + sc.minimum);
  if (sc.maximum != null && typeof v === 'number' && v > sc.maximum) errs.push(where + ' 大于 ' + sc.maximum);
  if (typeOf(v) === 'object') {
    (sc.required || []).forEach((k) => { if (!(k in v)) errs.push(where + ' 缺 ' + k); });
    Object.keys(v).forEach((k) => { if (sc.properties && sc.properties[k]) checkSchema(sc.properties[k], v[k], where + '.' + k, errs); else if (sc.additionalProperties && typeof sc.additionalProperties === 'object') checkSchema(sc.additionalProperties, v[k], where + '.' + k, errs); else if (sc.additionalProperties === false) errs.push(where + ' 多余字段 ' + k); });
  }
  if (typeOf(v) === 'array') { if (sc.minItems != null && v.length < sc.minItems) errs.push(where + ' 少于 ' + sc.minItems + ' 项'); if (sc.maxItems != null && v.length > sc.maxItems) errs.push(where + ' 多于 ' + sc.maxItems + ' 项'); if (sc.items) v.forEach((x, i) => checkSchema(sc.items, x, where + '[' + i + ']', errs)); }
}

// ---------- 内核源码：确定性 ----------
const src = fs.readFileSync(path.join(__dirname, '..', 'core', 'flow.js'), 'utf8');
ok(!/Date\.now|Math\.random/.test(src), '内核源码不得含 Date.now / Math.random');
ok(K.VERSION && K.MODULE_NAME === 'AI流程提效' && K.CREDITS === 50, '内核版本与积分');
ok(lib.credits.perRun[K.MODULE_NAME] === K.CREDITS, '积分表与内核一致');

// ---------- 数据表自洽 ----------
['make', 'flow', 'service'].forEach((a) => { const v = lib.vocab[a]; ok(v && Object.keys(v.roles).sort().join() === 'eng,foreman,lead,maint', a + ' 词表 roles 四个岗位'); ok(v.waitReasons.length === 4 && v.caps.length === 11, a + ' 词表 waitReasons / caps'); Object.keys(v).forEach((k) => { if (typeof v[k] === 'string') lintText(v[k], a + ' 词表 ' + k); }); v.roles && Object.keys(v.roles).forEach((k) => lintText(v.roles[k], a + ' 岗位')); });
lib.rules.rules.forEach((r) => { ok(r.id && r.name && r.text && r.kind, '规则 ' + r.id); lintText(r.name + r.text, '规则 ' + r.id); });
lib.rules.rootCauses.forEach((c) => { ok(['lead', 'eng', 'foreman', 'maint'].indexOf(c.role) >= 0 && typeof c.savedH === 'number', '根因 ' + c.id + ' 岗位'); lintText(c.cause + c.action, '根因 ' + c.id); });
ok(lib.rules.rootCauses.some((c) => c.when === 'default'), '根因兜底');
ok(lib.improveLib.cards.length === 4 && lib.improveLib.cards.map((c) => c.key).join('') === 'ABCD' && lib.improveLib.combo.length === 3, '方案库四卡 + 组合');
lib.improveLib.cards.forEach((c) => { ok(['lead', 'eng', 'foreman', 'maint'].indexOf(c.role) >= 0 && c.params.length && c.milestones.length, '方案 ' + c.key); c.params.forEach((p) => ok(p.default == null || (p.default >= p.min && p.default <= p.max), c.key + ' 参数默认值 ' + p.key)); lintText(c.name + c.desc + c.milestones.map((m) => m.title).join(''), '方案 ' + c.key); });

const erpBefore = JSON.stringify(lib.erpSamples);
const seenVerifyKinds = {};

Object.keys(lib.samples).sort().forEach((k) => {
  const raw = lib.samples[k];
  const before = JSON.stringify(raw);
  // 0. schema
  const errs = []; checkSchema(schema, raw, k, errs); ok(errs.length === 0, k + ' schema: ' + errs.slice(0, 5).join('；'));
  ok(raw.employees.every((e) => Object.keys(e).sort().join() === 'id,job,overtimeH' && /^E-\d{3}$/.test(e.id)), k + ' 员工只有 id / job / overtimeH');
  ok(!/企查查|天眼查|启信宝|爱企查/.test(before), k + ' 样本数据源厂商名');
  lintText(before, k + ' 样本全文');

  const d = K.ensure(raw);
  const R = K.run(d, lib), R2 = K.run(d, lib);
  const v = R.vocab, roleKeys = Object.keys(v.roles), es = R.es, L = {}; es.lines.forEach((l) => { L[l.id] = l; });
  // 1. 确定性与不改原样本
  ok(JSON.stringify(R.kpi) === JSON.stringify(R2.kpi), k + ' run 两次 kpi 相同');
  ok(JSON.stringify(R.weekly.text) === JSON.stringify(R2.weekly.text) && JSON.stringify(R.dispatch.rows) === JSON.stringify(R2.dispatch.rows), k + ' run 两次周报与派工相同');
  ok(JSON.stringify(raw) === before, k + ' run 改动了原样本');
  ok(JSON.stringify(lib.erpSamples) === erpBefore, k + ' run 改动了 AI ERP 样本');
  // 2. 约束识别
  ok(R.bottleneck.line.id === raw.constraintExpected, k + ' 约束线 ' + R.bottleneck.line.id + ' ≠ ' + raw.constraintExpected);
  const maxLoad = Math.max.apply(null, R.S.lines.map((l) => l.load7)); ok(R.bottleneck.load7 === maxLoad, k + ' 约束线负荷最高');
  ok(R.bottleneck.wip.curve.length === 7 && near(R.bottleneck.wip.maxHours, R.bottleneck.wip.capDays * R.bottleneck.capHoursPerDay, 0.05), k + ' 在制曲线 7 天、上限 = capDays × 日可用');
  ok(R.bottleneck.balanceRate >= 0 && R.bottleneck.balanceRate <= 100 && R.bottleneck.longestQueue.days >= R.bottleneck.queueDays, k + ' 平衡率与最长排队');
  ok(raw.employees.filter((e) => e.overtimeH > raw.otCap.month).length === raw.facts.overtimeOver, k + ' 加班超限人数 = facts.overtimeOver');
  const nC = R.flow.filter((f) => f.isConstraint).length; ok(R.flow.length >= 3 && (k === 'service' ? nC >= 1 : nC === 1), k + ' 工序流分段与约束格');
  R.flow.forEach((f) => { ok(f.lines.length >= 1 && f.load7 >= 0 && (f.fpy == null || (f.fpy >= 0 && f.fpy <= 100)), k + ' 工序流卡 ' + f.key); clean(f.name + f.stdText + f.actText + f.lines.map((l) => l.name).join(''), k + ' 工序流卡 ' + f.key); });
  // 3. 报工核验：只标记不改数
  const VR = R.verify; Object.keys(VR.counts).forEach((x) => { seenVerifyKinds[x] = true; });
  ok(VR.total === raw.reports.filter((r) => r.date >= raw.weekStart).length && VR.pending === VR.rows.length, k + ' 核验条数与待确认');
  VR.rows.forEach((r) => { ok(['dev', 'dup', 'missing', 'conserve', 'overlap'].indexOf(r.kind) >= 0 && r.kindName && r.suggest && r.resolved === false, k + ' 核验行 ' + r.id); ok(!r.emp || /^E-\d{3}$/.test(r.emp), k + ' 核验行员工只用编号'); clean(r.kindName + r.text + r.suggest, k + ' 核验 ' + r.id); });
  const rawQty = raw.reports.map((r) => r.qtyGood + '/' + r.qtyRework + '/' + r.runMin).join(','); ok(rawQty === R.data.reports.map((r) => r.qtyGood + '/' + r.qtyRework + '/' + r.runMin).join(','), k + ' 核验不改报工数量');
  if (k === 'make') ['missing', 'dev', 'dup', 'conserve', 'overlap'].forEach((x) => ok(VR.counts[x] >= 1, 'make 核验规则 ' + x + ' 至少命中一次'));
  const dAll = K.confirmAllReports(d, lib); ok(K.run(dAll, lib).verify.pending === 0 && dAll.log.length === d.log.length + 1, k + ' 全部确认后 pending 0 且日志 +1');
  ok(K.confirmAllReports(dAll, lib).log.length === dAll.log.length, k + ' 重复确认无副作用');
  if (VR.rows.length) { const d1 = K.confirmReport(d, lib, VR.rows[0].id); ok(K.run(d1, lib).verify.pending === VR.pending - 1 && d1.log.length === 1, k + ' 单条确认'); clean(d1.log[0].label + d1.log[0].detail, k + ' 确认日志'); }
  // 4. 异常预警与根因
  ok(R.alerts.length >= 2, k + ' 至少两条异常');
  R.alerts.forEach((a) => {
    ok(/^EX-\d{4}-\d{2}$/.test(a.id) && /^R[1-6]$/.test(a.rule) && roleKeys.indexOf(a.role) >= 0 && a.roleName === v.roles[a.role] && a.statusName && a.status === 'open', k + ' 异常 ' + a.id + ' 岗位 / 状态');
    ok(a.lineName && a.cause && a.action && typeof a.savedH === 'number', k + ' 异常 ' + a.id + ' 根因指到岗位');
    clean(a.ruleName + a.text + a.cause + a.action + a.roleName + a.statusName + a.lineName, k + ' 异常 ' + a.id);
  });
  ok(new Set(R.alerts.map((a) => a.id)).size === R.alerts.length, k + ' 异常编号唯一');
  R.alerts.filter((a) => a.rule === 'R3').forEach((a) => { const m = a.text.match(/下限 ([\d.]+)%/); const pbar = sum(raw.weekly, (w) => w.fpy) / raw.weekly.length; ok(m && parseFloat(m[1]) < pbar, k + ' R3 下限取 12 周均值 3σ 以下'); });
  const exId = k === 'make' ? 'EX-0917-03' : R.alerts.filter((a) => a.savedH > 0)[0].id;
  const ex = R.alerts.filter((a) => a.id === exId)[0]; ok(ex && ex.savedH > 0, k + ' 待处置异常 ' + exId);
  const dEx = K.handleException(d, lib, exId), REx = K.run(dEx, lib);
  ok(dEx.exceptions[REx.alerts.filter((a) => a.id === exId)[0].key] === 'doing' && REx.alerts.filter((a) => a.id === exId)[0].status === 'doing' && REx.alerts.filter((a) => a.id === exId)[0].statusName === K.EXC_STATUS.doing, k + ' 处置后状态 doing');
  ok(dEx.ledger.length === d.ledger.length + 1 && dEx.ledger[0].source === ex.key && dEx.ledger[0].savedH === ex.savedH && dEx.log.length === 1, k + ' 处置后增效账 +1');
  ok(REx.kpi.alertsOpen === R.kpi.alertsOpen - 1 && K.handleException(dEx, lib, exId).ledger.length === dEx.ledger.length, k + ' 处置计数与重复处置无副作用');
  const ex0 = R.alerts.filter((a) => a.savedH === 0)[0]; if (ex0) ok(K.handleException(d, lib, ex0.id).ledger.length === 0, k + ' savedH 为 0 不进增效账');
  clean(dEx.log[0].label + dEx.log[0].detail, k + ' 处置日志');
  // 5. 时间损失瀑布守恒与三率
  const Lw = R.loss; ok(Lw.line.id === R.bottleneck.line.id && Lw.scope === 'week', k + ' 瀑布默认约束线本周');
  ok(near(Lw.start.value + sum(Lw.items, (x) => x.value), Lw.end.value), k + ' 瀑布守恒 ' + Lw.start.value + ' + Σ ≠ ' + Lw.end.value);
  ok(Lw.items.every((x) => x.value < 0) && Lw.items.slice(1).every((x, i) => x.value >= Lw.items[i].value), k + ' 瀑布各项为负且按损失排序');
  const rows = raw.lossToday.filter((x) => x.line === Lw.line.id), T = sum(rows, (x) => x.plannedMin), S_ = sum(rows, (x) => x.setupMin), D_ = sum(rows, (x) => x.downMin), W_ = sum(rows, (x) => sum(Object.keys(x.waitMin).map((q) => x.waitMin[q]))), V_ = sum(rows, (x) => x.speedMin), Q_ = sum(rows, (x) => x.reworkMin), Rn = T - S_ - D_ - W_;
  ok(Lw.availability === r0(100 * Rn / T) && Lw.performance === r0(100 * (Rn - V_) / Rn) && Lw.effUtil === r0(100 * (Rn - V_ - Q_) / T), k + ' 可用率 / 性能率 / 有效利用率复算');
  ok(near(Lw.start.value * Math.max(0.5, Lw.days) * 60, T, 3.1 * Math.max(0.5, Lw.days)) && Lw.effUtil <= Lw.availability, k + ' 计划时间折算与有效利用率不高于可用率');
  Lw.items.forEach((x) => clean(x.label, k + ' 瀑布项')); clean(Lw.start.label + Lw.end.label, k + ' 瀑布标签');
  ok(Lw.weekly.length === raw.lossWeekly.filter((x) => x.line === Lw.line.id).length && Lw.weekly.every((w) => finite(w.effUtil) && w.effUtil <= w.availability), k + ' 12 周有效利用率序列');
  // 6. 标准工时校准
  R.calibration.forEach((c) => {
    const exp = Math.abs(c.dev) >= 15 && c.stable; ok((c.status === 'expired') === exp, k + ' 校准 ' + c.key + ' 过期判定');
    ok(c.stable === (c.n >= 8 && c.iqrRatio < 0.25) || Math.abs(c.iqrRatio - 0.25) < 0.006, k + ' 校准 ' + c.key + ' 稳定判定');
    if (c.status === 'expired') ok(c.suggest === Math.ceil(c.median * 1e4) / 1e4 && c.suggest >= c.median, k + ' 校准 ' + c.key + ' 建议值向上取到 0.0001'); else ok(c.suggest === null, k + ' 校准 ' + c.key + ' 维持无建议值');
    ok(c.adopted === false && c.statusName && c.direction, k + ' 校准 ' + c.key + ' 状态');
    clean(c.productName + c.op + c.statusName + c.direction, k + ' 校准 ' + c.key);
  });
  const expired = R.calibration.filter((c) => c.status === 'expired'); ok(expired.length >= 1 && R.kpi.stdExpired === expired.length, k + ' 有过期标准工时');
  ok(R.calibration.slice(0, expired.length).every((c) => c.status === 'expired'), k + ' 过期行排在前');
  const c0 = expired[0], dAd = K.adoptStd(d, lib, c0.product, c0.op), RAd = K.run(dAd, lib);
  ok(dAd.adopted[c0.key] === c0.suggest && RAd.calibration.filter((c) => c.key === c0.key)[0].adopted === true && RAd.kpi.stdExpired === expired.length - 1, k + ' 采纳后该行 adopted');
  ok(RAd.metrics.queueDays !== R.metrics.queueDays || RAd.metrics.weeklyUnits !== R.metrics.weeklyUnits || RAd.metrics.load !== R.metrics.load || JSON.stringify(RAd.es.products) !== JSON.stringify(R.es.products), k + ' 采纳后排程重算 ' + R.metrics.queueDays + ' → ' + RAd.metrics.queueDays);
  ok(JSON.stringify(lib.erpSamples) === erpBefore, k + ' 采纳不改 AI ERP 样本');
  const keep = R.calibration.filter((c) => c.status === 'keep')[0]; if (keep) ok(K.adoptStd(d, lib, keep.product, keep.op).log.length === 0, k + ' 维持行不可采纳');
  clean(dAd.log[0].label + dAd.log[0].detail, k + ' 采纳日志');
  // 7. 按瓶颈节拍投料
  const Bf = R.buffer, th = Bf.hours >= Bf.max ? 'over' : Bf.hours >= Bf.max * 2 / 3 ? 'red' : Bf.hours >= Bf.max / 3 ? 'yellow' : 'green';
  ok(Bf.status === th && Bf.statusName, k + ' 缓冲状态阈值 ' + Bf.status);
  const cl = L[Bf.line.id]; ok(near(Bf.release.allowedUnits, Math.max(0, r0((Bf.max - (Bf.hours - cl.capHoursPerDay * (cl.eff || 1))) / (R.bottleneck.hpu || 0.001))), 1), k + ' 投料许可复算');
  ok(Bf.release.allowedUnits >= 0 && Bf.release.after <= Bf.release.before && near(Bf.release.freedHours, Math.max(0, Bf.release.before - Bf.release.after)), k + ' 投料许可 ≥ 0、明日计划只减不增');
  ok(Bf.release.line.id === raw.releaseLine && Bf.wipDays.after <= Bf.wipDays.before && Bf.applied === false, k + ' 放行线与在制天数');
  const dRel = K.applyRelease(d, lib);
  ok(dRel.releasePlan && dRel.releasePlan.freedHours >= 0 && dRel.releasePlan.date === Bf.release.date && dRel.log.length === 1 && K.run(dRel, lib).buffer.applied === true, k + ' 下发投料计划');
  ok(dRel.ledger.length === (Bf.release.freedHours > 0 ? 1 : 0) && K.applyRelease(dRel, lib).log.length === 1, k + ' 投料进账与重复下发');
  clean(dRel.log[0].label + dRel.log[0].detail, k + ' 投料日志');
  // 8. 换型合批
  const Sq = R.sequence, n = raw.jobsToday.length;
  ok(n <= 9 && Sq.after.minutes <= Sq.before.minutes && Sq.savedMin === Sq.before.minutes - Sq.after.minutes && Sq.savedHPerDay === r1(Sq.savedMin / 60), k + ' 合批换型不劣于原序');
  ok(multiset(Sq.after.seq) === multiset(Sq.before.seq) && Sq.after.seq.length === n && Sq.after.rows.length === n, k + ' 合批前后同一多重集');
  ok(Sq.dueOk === true, k + ' 合批交期约束');
  const jobs = {}; raw.jobsToday.forEach((j) => { jobs[j.id] = j; });
  Sq.after.seq.forEach((id, i) => { if (jobs[id].dueDay <= 1) ok(i < Math.ceil(n / 2), k + ' 交期 ≤ 1 天的批次 ' + id + ' 在前半段'); });
  ok(raw.jobsToday.some((j) => j.dueDay <= 1), k + ' 有交期紧的批次可验');
  ok(near(K.seqCost(d, Sq.after.rows.map((r) => jobs[r.id])).minutes, Sq.after.minutes, 0) && Sq.after.rows.every((r, i) => (i === 0 ? r.setupMin === 0 : r.setupMin > 0) && r.kind), k + ' 合批行换型分钟复算');
  const Sq2 = K.sequenceJobs(d, lib, 30); ok(Sq2.factor === 30 / raw.setupMatrix.diffFixture && Sq2.after.minutes <= Sq2.before.minutes && Sq2.dueOk, k + ' 调停机换型时间后仍成立');
  const dSeq = K.applySequence(d, lib);
  ok(dSeq.jobSeq && dSeq.jobSeq.seq.join() === Sq.after.seq.join() && dSeq.ledger.some((l) => l.source === 'sequence' && l.isBottleneck && l.kind === 'setup') && K.run(dSeq, lib).sequence.applied === true, k + ' 下发顺序表进增效账');
  ok(K.applySequence(dSeq, lib).ledger.length === dSeq.ledger.length, k + ' 重复下发顺序表无副作用');
  clean(dSeq.log[0].label + dSeq.log[0].detail, k + ' 顺序表日志');
  // 9. 改善预演
  const P = R.preview, MF = ['load', 'queueDays', 'weeklyUnits', 'lineUnits', 'flowIndex', 'otHours', 'spareLoad', 'wipTomorrow'];
  ok(P.cards.length === 4 && P.cards.map((c) => c.key).join('') === 'ABCD' && P.combo && P.combo.keys.join('') === 'ABC', k + ' 四张卡 + 组合');
  ok(P.cards.filter((c) => c.recommended).length === 1 && P.recommended === P.cards.filter((c) => c.recommended)[0].key, k + ' 推荐唯一');
  const rank = P.cards.slice().sort((a, b) => (a.result.metrics.otHours > 0 ? 1 : 0) - (b.result.metrics.otHours > 0 ? 1 : 0) || a.result.metrics.queueDays - b.result.metrics.queueDays || b.result.metrics.weeklyUnits - a.result.metrics.weeklyUnits || a.key.localeCompare(b.key));
  ok(rank[0].key === P.recommended, k + ' 推荐规则：不加班优先 → 排队天最小 → 周产能最大');
  P.cards.forEach((c) => {
    const one = K.preview(d, lib, [c.key], {}, R); ok(one.cards.length === 1 && JSON.stringify(one.cards[0].result.metrics) === JSON.stringify(c.result.metrics), k + ' 单卡 ' + c.key + ' 重算一致');
    ok(JSON.stringify(raw) === before && JSON.stringify(lib.erpSamples) === erpBefore, k + ' 卡 ' + c.key + ' 跑完原样本不变');
    ok(MF.every((f) => finite(c.result.metrics[f]) || (f === 'spareLoad' && c.result.metrics[f] === null)), k + ' 卡 ' + c.key + ' 指标字段齐全');
    ok(c.key === 'D' ? c.result.cost > 0 && c.result.metrics.otHours > 0 : c.result.cost === 0, k + ' 卡 ' + c.key + ' 费用');
    ok(c.roleName === v.roles[c.role] && c.params.length && c.result.notes.length >= 1 && c.result.deltas && finite(c.result.deltas.queueDays), k + ' 卡 ' + c.key + ' 岗位 / 参数 / 说明');
    ok(c.result.metrics.queueDays <= P.base.metrics.queueDays + 0.05, k + ' 卡 ' + c.key + ' 排队天不劣于基线');
    clean(c.name + c.desc + c.result.notes.join('') + c.params.map((p) => p.label).join('') + c.roleName, k + ' 卡 ' + c.key);
    c.milestones.forEach((m) => clean(m.title, k + ' 卡 ' + c.key + ' 节点'));
  });
  ok(MF.every((f) => finite(P.combo.result.metrics[f])) && P.combo.result.cost === 0 && P.combo.result.metrics.queueDays <= Math.min.apply(null, P.cards.filter((c) => c.key !== 'D').map((c) => c.result.metrics.queueDays)) + 0.05, k + ' 组合指标齐全且不劣于单卡');
  const PB = K.preview(d, lib, ['B'], { support: 0 }, R); ok(PB.cards[0].result.metrics.queueDays >= P.cards[1].result.metrics.queueDays, k + ' 支援 0 人不优于 2 人');
  // 10. 立项
  const dP = K.commitProject(d, lib, ['A', 'B', 'C'], { support: 2 }), RP = K.run(dP, lib), pj = dP.projects[0];
  ok(dP.projects.length === d.projects.length + 1 && pj.id === 'IMP-2609-01' && pj.keys.join('') === 'ABC' && pj.status === 'executing' && roleKeys.some((r) => v.roles[r] === pj.owner), k + ' 立项编号与状态');
  ok(pj.milestones.length >= 3 && pj.milestones.every((m, i) => i === 0 || m.due >= pj.milestones[i - 1].due) && pj.milestones.every((m) => m.due > raw.today && m.status === 'pending' && roleKeys.some((r) => v.roles[r] === m.owner)), k + ' 节点日期递增、责任只有四岗');
  pj.milestones.forEach((m) => clean(m.title + m.owner, k + ' 节点'));
  const PC = K.preview(d, lib, null, { support: 2 }, R);
  ok(RP.committed && RP.committed.project === pj.id && JSON.stringify(RP.committed.metrics) === JSON.stringify(PC.combo.result.metrics) && JSON.stringify(pj.expected) === JSON.stringify(PC.combo.result.metrics) && RP.kpi.projects === 1, k + ' committed 与同参数组合预演一致');
  ok(pj.target.queueDays === lib.improveLib.kpiTargets.queueDays && JSON.stringify(pj.baseline) === JSON.stringify(R.metrics), k + ' 目标与基线');
  ok(new Set(dP.ledger.map((l) => l.source)).size === dP.ledger.length && dP.ledger.some((l) => l.source === 'sequence') && dP.ledger.some((l) => l.source === 'projectB') && dP.ledger.some((l) => l.source === 'projectC'), k + ' 立项增效账按 source 去重');
  const dP2 = K.commitProject(dP, lib, ['D'], { otHours: 2 }); ok(dP2.projects.length === 2 && dP2.projects[1].id === 'IMP-2609-02' && dP2.ledger.length === dP.ledger.length, k + ' 第二个项目编号递增、加班不进增效账');
  const dM = K.setMilestone(dP, lib, pj.id, 0, 'done'); ok(dM.projects[0].milestones[0].status === 'done' && dM.projects[0].status === 'executing' && dM.log.length === dP.log.length + 1, k + ' 节点完成');
  let dAllM = dP; pj.milestones.forEach((m, i) => { dAllM = K.setMilestone(dAllM, lib, pj.id, i, 'done'); }); ok(dAllM.projects[0].status === 'observing' && K.run(dAllM, lib).weekly.verify[0].status !== 'watch', k + ' 全部节点完成进观察期并核验');
  clean(dP.log[0].label + dP.log[0].detail, k + ' 立项日志');
  ok(JSON.stringify(raw) === before, k + ' 立项不改原样本');
  // 11. 派工
  const DP = R.dispatch, homeOf = {}; raw.skills.forEach((s) => { homeOf[s.emp] = s.home; });
  const lineName = {}; es.lines.forEach((l) => { lineName[l.id] = l.name; });
  ok(/^DP-\d{4}$/.test(DP.id) && DP.rows.length === DP.filled && DP.unmet.length === 0 && DP.rest === false, k + ' 派工单编号、无缺口');
  const seen = {}; DP.rows.forEach((r) => { const key = r.emp + '|' + r.shift; ok(!seen[key], k + ' 派工 ' + r.emp + ' 同一班次重复'); seen[key] = true; });
  DP.rows.forEach((r) => {
    ok(r.level >= 1 && r.level <= 3 && /^E-\d{3}$/.test(r.emp) && r.lineName && r.station && r.shift, k + ' 派工行 ' + r.emp);
    ok(r.support === (homeOf[r.emp] !== r.line), k + ' 派工行 ' + r.emp + ' 支援标记');
    if (r.support) ok(r.home !== r.lineName && r.level >= 2, k + ' 支援行 ' + r.emp + ' 来自他线且 2 级以上');
    if (r.assist) ok(r.level === 1 && !r.support, k + ' 副手 ' + r.emp + ' 为本线 1 级');
    if (r.isSupportShift) ok(r.support && r.shift === v.secondShift, k + ' 备用线第二班只用支援人员');
    clean(r.lineName + r.shift + r.station + r.home, k + ' 派工行 ' + r.emp);
  });
  const leaders = raw.employees.filter((e) => e.job === 'leader' || e.job === 'mgr').map((e) => e.id); ok(DP.rows.every((r) => leaders.indexOf(r.emp) < 0), k + ' 班组长不进派工行');
  ok(DP.support === DP.rows.filter((r) => r.support).length && DP.supportEmps.length === DP.support && DP.assists === DP.rows.filter((r) => r.assist).length, k + ' 支援与副手计数');
  ok(DP.overLimit === raw.facts.overtimeOver && DP.otWeek.before === raw.weekly[raw.weekly.length - 1].otHours && DP.otWeek.after === DP.otWeek.before && DP.secondShift === false, k + ' 未立项时加班不变');
  const DPB = RP.dispatch; ok(DPB.secondShift && DPB.support >= 1 && DPB.rows.some((r) => r.isSupportShift) && DPB.otWeek.after <= DPB.otWeek.before && DPB.otWeek.delta === DPB.otWeek.after - DPB.otWeek.before, k + ' 立项含 B 后支援 ≥ 1 且加班不增');
  const seenB = {}; DPB.rows.forEach((r) => { const key = r.emp + '|' + r.shift; ok(!seenB[key], k + ' 立项后派工 ' + r.emp + ' 同一班次重复'); seenB[key] = true; ok(!r.isSupportShift || (r.support && r.line === raw.spareLine), k + ' 第二班行在备用线'); });
  const dDp = K.applyDispatch(dP, lib); ok(dDp.dispatch && dDp.dispatch.id === DPB.id && dDp.dispatch.rows.length === DPB.rows.length && K.run(dDp, lib).dispatch.applied === true, k + ' 下发派工单');
  ok(dDp.ledger.filter((l) => l.source === 'dispatch').length === (DPB.otWeek.delta < 0 ? 1 : 0) && (DPB.otWeek.delta >= 0 || dDp.ledger.filter((l) => l.source === 'dispatch')[0].kind === 'ot'), k + ' 支援替代加班进账');
  ok(K.applyDispatch(dDp, lib).log.length === dDp.log.length, k + ' 重复下发派工无副作用');
  clean(dDp.log[dDp.log.length - 1].label + dDp.log[dDp.log.length - 1].detail, k + ' 派工日志');
  // 12. 保养窗口
  ok(R.maintenance.length >= 1 && R.kpi.maintDue === R.maintenance.length, k + ' 有保养到期');
  R.maintenance.forEach((m) => {
    ok(m.reasons.length >= 1 && m.window && m.window.date > raw.today && m.window.d >= 1 && m.window.d <= 6 && m.minutes > 0 && m.role === v.roles.maint && m.scheduled === false && m.savedH > 0, k + ' 保养 ' + m.machine);
    ok(raw.machines.some((x) => x.id === m.machine && x.line === m.line), k + ' 保养 ' + m.machine + ' 设备存在');
    m.reasons.forEach((r) => clean(r, k + ' 保养原因 ' + m.machine)); clean(m.window.label + m.lineName + m.role, k + ' 保养窗口 ' + m.machine);
  });
  raw.machines.forEach((m) => { const due = m.cumRunH >= 0.9 * m.pmIntervalH || (m.tooling && m.tooling.usedUnits >= 0.9 * m.tooling.lifeUnits); if (due) ok(R.maintenance.some((x) => x.machine === m.id), k + ' 到期设备 ' + m.id + ' 在列表'); });
  const m0 = R.maintenance[0], dMt = K.scheduleMaint(d, lib, m0.machine), RMt = K.run(dMt, lib);
  ok(RMt.maintenance.filter((x) => x.machine === m0.machine)[0].scheduled === true && RMt.kpi.maintDue === R.kpi.maintDue - 1 && dMt.maintenance[0].id === 'PM-2609-01' && dMt.maintenance[0].date === m0.window.date, k + ' 排入保养窗口');
  ok(dMt.ledger.length === 1 && dMt.ledger[0].source === 'maint:' + m0.machine && dMt.ledger[0].kind === 'down' && K.scheduleMaint(dMt, lib, m0.machine).ledger.length === 1, k + ' 保养进账与重复排入');
  clean(dMt.log[0].label + dMt.log[0].detail + dMt.ledger[0].action + dMt.ledger[0].basis, k + ' 保养日志');
  // 13. 技能矩阵与带教
  const SM = R.skills; ok(SM.ops.length >= 3 && Object.keys(SM.levels).length === raw.skills.length, k + ' 技能矩阵覆盖全员');
  Object.keys(SM.levels).forEach((e) => { ok(/^E-\d{3}$/.test(e) && SM.ops.every((o) => [0, 1, 2, 3].indexOf(SM.levels[e][o]) >= 0), k + ' 技能等级 ' + e); });
  SM.coverage.forEach((c) => { ok(c.need > 0 && c.qualified >= 0 && c.ratio === Math.round(100 * c.qualified / c.need) / 100 && c.single === (c.ratio < 1.5), k + ' 覆盖 ' + c.op); ok(c.qualified === Object.keys(SM.levels).filter((e) => SM.levels[e][c.op] >= 2).length, k + ' 覆盖 ' + c.op + ' 合格人数复算'); });
  SM.pairs.forEach((p) => { ok(/^E-\d{3}$/.test(p.trainee) && /^E-\d{3}$/.test(p.mentor) && SM.levels[p.trainee][p.op] === 1 && SM.levels[p.mentor][p.op] === 3 && p.added === false, k + ' 带教对 ' + p.trainee); });
  if (SM.pairs.length) { const p = SM.pairs[0], dTr = K.addTraining(d, lib, p.trainee, p.op); ok(dTr.training.length === 1 && dTr.training[0].id === 'TR-2609-01' && dTr.training[0].mentor === p.mentor && K.run(dTr, lib).skills.pairs[0].added === true && K.addTraining(dTr, lib, p.trainee, p.op).log.length === 1, k + ' 加入带教'); clean(dTr.log[0].label + dTr.log[0].detail, k + ' 带教日志'); }
  // 14. 增效账
  const LG = RP.ledger; ok(LG.rows.length === dP.ledger.length && LG.totals.count === LG.rows.length, k + ' 增效账行数');
  ok(near(LG.totals.bottleneckH + LG.totals.nonBottleneckH, sum(LG.rows.filter((x) => x.kind !== 'ot'), (x) => x.savedH)), k + ' 增效账合计 = Σ非加班行');
  ok(near(LG.totals.bottleneckH, sum(LG.rows.filter((x) => x.isBottleneck && x.kind !== 'ot'), (x) => x.savedH)) && LG.totals.units === r0(LG.totals.bottleneckH / (R.bottleneck.hpu || 1)), k + ' 瓶颈工时与折件');
  ok(/\d/.test(LG.counterText) && LG.counterText.indexOf(String(r1(LG.totals.bottleneckH + LG.totals.nonBottleneckH).toFixed(1))) >= 0, k + ' 计数器文案含数字');
  ok(RP.kpi.savedH === r1(LG.totals.bottleneckH + LG.totals.nonBottleneckH), k + ' kpi.savedH');
  LG.rows.forEach((x) => { ok(/^LG-\d{2}$/.test(x.id) && x.kindName && roleKeys.some((r) => v.roles[r] === x.role) && x.savedH > 0, k + ' 增效账行 ' + x.id); clean(x.action + x.basis + x.role + x.kindName, k + ' 增效账 ' + x.id); });
  const dOt = K.applyDispatch(dP, lib), LO = K.run(dOt, lib).ledger; ok(near(LO.totals.otH, sum(LO.rows.filter((x) => x.kind === 'ot'), (x) => x.savedH)) && near(LO.totals.bottleneckH + LO.totals.nonBottleneckH, sum(LO.rows.filter((x) => x.kind !== 'ot'), (x) => x.savedH)), k + ' 加班行单列');
  ok(R.ledger.rows.length === 0 && R.ledger.counterText.indexOf('0.0 h') >= 0, k + ' 初始增效账为空');
  // 15. 周报
  [R, RP].forEach((RR, i) => {
    const txt = RR.weekly.text, ls = txt.split('\n');
    ok(txt.charAt(0) === '【' && ls.filter((l) => /^[一二三四五六]、/.test(l)).length === 6 && ls.length === 8, k + ' 周报 ' + i + ' 以【开头、六个段落');
    ok(ls[ls.length - 1].indexOf('收件人') === 0 && RR.weekly.recipients.length === 4 && RR.weekly.recipients.every((r) => roleKeys.some((x) => v.roles[x] === r)), k + ' 周报 ' + i + ' 收件人只写职务');
    ok(!/E-\d{3}/.test(txt) && txt.indexOf(raw.company) >= 0 && txt.indexOf(RR.bottleneck.line.name) >= 0, k + ' 周报 ' + i + ' 不出现员工编号、含公司与约束线');
    ok(RR.weekly.compare.length === 6 && RR.weekly.series.length === raw.weekly.length && RR.weekly.current.effUtil === RR.loss.effUtil, k + ' 周报 ' + i + ' 对比表与序列');
    clean(txt, k + ' 周报 ' + i); RR.weekly.compare.forEach((c) => clean(c.k + c.before + c.after, k + ' 周报对比 ' + c.k)); RR.weekly.verify.forEach((x) => clean(x.name + x.target + x.statusName, k + ' 周报核验'));
  });
  ok(RP.weekly.text.indexOf(pj.id) >= 0 && RP.weekly.text.indexOf('预计') >= 0 && RP.weekly.verify.length === 1 && RP.weekly.verify[0].status === 'watch', k + ' 立项后周报含项目与预计');
  ok(RP.weekly.text.indexOf('（均为预计）') >= 0 && R.weekly.text.indexOf('本周尚无采纳记录') >= 0, k + ' 增效账段落标预计');
  ok(RR_fields(R.kpi), k + ' kpi 字段齐全且数值有限');
  ok(R.kpi.constraint === R.bottleneck.line.name && R.kpi.alertsTotal === R.alerts.length && R.kpi.reportsPending === R.verify.pending && R.kpi.effUtil === R.loss.effUtil && R.kpi.lines === es.lines.length && R.kpi.stages === R.flow.length, k + ' kpi 与各段一致');
  // 16. 改善卡与小时节拍
  R.improveCards.forEach((c) => { ok(c.roleName === v.roles[c.role] && c.params.every((p) => p.default != null && p.default >= p.min && p.default <= p.max), k + ' 改善卡 ' + c.key + ' 默认值'); clean(c.name + c.desc + c.roleName + c.params.map((p) => p.label).join(''), k + ' 改善卡 ' + c.key); });
  R.planHit.forEach((p) => { ok(p.lineName && p.hours.length >= 1 && p.actual === p.hours[p.hours.length - 1] && finite(p.pct) && typeof p.behind === 'boolean', k + ' 小时节拍 ' + p.line); clean(p.lineName + p.shift, k + ' 小时节拍'); });
  ok(R.alerts.filter((a) => a.rule === 'R6').length === R.planHit.filter((p) => p.firstHourBehind && p.plan / (raw.shiftHours || 8) >= 5).length, k + ' R6 与小时节拍一致');
  // 17. 日志与全部动作后的原样本
  Object.keys(dP).forEach((key) => { ok(key in d, k + ' 立项后无新增顶层键 ' + key); });
  ok(JSON.stringify(raw) === before && JSON.stringify(lib.erpSamples) === erpBefore, k + ' 全部动作后原样本与 AI ERP 样本不变');
  // 18. examples 一致
  const exPath = path.join(__dirname, '..', 'examples', k + '.output.json'); ok(fs.existsSync(exPath), k + ' examples 缺失，先跑 run-examples');
  const exo = JSON.parse(fs.readFileSync(exPath, 'utf8'));
  ok(JSON.stringify(exo.kpi) === JSON.stringify(R.kpi) && exo.weekly.text === R.weekly.text && exo.bottleneck.line.id === R.bottleneck.line.id, k + ' examples 与内核不一致，先跑 run-examples');
  lintText(JSON.stringify(exo), k + ' examples 全文');
});
ok(['missing', 'dev', 'dup', 'conserve', 'overlap'].every((x) => seenVerifyKinds[x]), '核验五条规则各至少命中一次');

function RR_fields(kp) { const F = ['period', 'constraint', 'load7', 'queueDays', 'balanceRate', 'wipDays', 'wipUnits', 'effUtil', 'fpy', 'otHours', 'alertsOpen', 'alertsTotal', 'reportsPending', 'reportsTotal', 'stdExpired', 'projects', 'maintDue', 'savedH', 'weeklyUnits', 'flowDays', 'lines', 'stages', 'products', 'lots']; return F.every((f) => f in kp && (typeof kp[f] === 'string' ? kp[f].length > 0 : finite(kp[f]))); }

console.log('validate ok: 通过 ' + checks + ' 项断言');
