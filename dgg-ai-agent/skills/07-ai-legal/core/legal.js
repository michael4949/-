/*
 * AI法务 · 内核
 * 输入：一家企业的合同（结构化条款）、证照、知产清单、新设主体输入 + 审查规则 / 设立规则 / 知产类别表
 * 计算：合同逐条审查（必备条款缺失、风险条款、修订建议、风险分）→ 新设主体方案（流程时间线、材料、股权控制线、章程要点）
 *       → 知产到期与年费、布局缺口、近似与侵权线索、费用估算 → 统一台账与 90 天日历 → KPI 与月报
 * 采纳修订、确认设立、加入续展 / 申请清单都写进同一份数据副本，各屏按副本重算。
 * 确定性、离线、无网络。UMD：Node 与浏览器共用。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.DGG = root.DGG || {}; root.DGG.coreM7 = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VERSION = '1.2.0';
  var MODULE_NAME = 'AI法务';
  var CREDITS = 30;
  var DAY = 86400000;
  var SEV_LABEL = { high: '高', mid: '中', low: '低' };
  var MISSING_HIGH = ['acceptance', 'ip', 'quality', 'liability', 'material', 'exclusivity', 'data'];

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function r0(n) { return Math.round(n); }
  function sum(a) { return a.reduce(function (t, x) { return t + x; }, 0); }
  function fmtN(n) { return (n < 0 ? '−' : '') + String(Math.abs(Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function fmtW(n) { return Math.abs(n) >= 10000 ? (Math.round(n / 1000) / 10) + ' 万元' : fmtN(n) + ' 元'; }
  function ms(s) { var p = s.split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2]); }
  function dateOf(base, d) { var t = new Date(ms(base) + d * DAY); return t.getUTCFullYear() + '-' + String(t.getUTCMonth() + 1).padStart(2, '0') + '-' + String(t.getUTCDate()).padStart(2, '0'); }
  function addYears(s, y) { var p = s.split('-'); return (+p[0] + y) + '-' + p[1] + '-' + p[2]; }
  function addMonths(s, m) { var p = s.split('-'); var mm = +p[1] - 1 + m; var yy = +p[0] + Math.floor(mm / 12); mm = ((mm % 12) + 12) % 12; return yy + '-' + String(mm + 1).padStart(2, '0') + '-' + p[2]; }
  function short(s) { var p = s.split('-'); return (+p[1]) + '-' + (+p[2]); }
  function days(a, b) { return Math.round((ms(b) - ms(a)) / DAY); }
  var WD = ['日', '一', '二', '三', '四', '五', '六'];
  function weekday(s) { return WD[new Date(ms(s)).getUTCDay()]; }

  function evalExpr(expr, env) {
    var t = String(expr).match(/\d+\.?\d*|[A-Za-z_][A-Za-z0-9_]*|'[^']*'|&&|\|\||<=|>=|==|!=|[-+*/()<>!]/g) || [];
    var i = 0;
    function peek() { return t[i]; } function next() { return t[i++]; }
    function primary() { var x = next(); if (x === '(') { var v = or(); next(); return v; } if (x === '!') return !primary(); if (x === '-') return -primary(); if (/^\d/.test(x)) return parseFloat(x); if (/^'/.test(x)) return x.slice(1, -1); if (x === 'true') return true; if (x === 'false') return false; if (x === 'null') return null; return env[x] === undefined ? null : env[x]; }
    function mul() { var v = primary(); while (peek() === '*' || peek() === '/') { var op = next(), r = primary(); v = op === '*' ? v * r : v / r; } return v; }
    function add() { var v = mul(); while (peek() === '+' || peek() === '-') { var op = next(), r = mul(); v = op === '+' ? v + r : v - r; } return v; }
    function cmp() { var v = add(); while (['<', '>', '<=', '>=', '==', '!='].indexOf(peek()) >= 0) { var op = next(), r = add(); v = op === '<' ? v < r : op === '>' ? v > r : op === '<=' ? v <= r : op === '>=' ? v >= r : op === '==' ? v == r : v != r; } return v; }
    function and() { var v = cmp(); while (peek() === '&&') { next(); var r = cmp(); v = v && r; } return v; }
    function or() { var v = and(); while (peek() === '||') { next(); var r = and(); v = v || r; } return v; }
    return or();
  }
  function ensure(raw) { var d = clone(raw); d.renewList = d.renewList || []; d.applyList = d.applyList || []; d.log = d.log || []; d.setup = d.setup || {}; d.contracts.forEach(function (c) { c.clauses.forEach(function (k) { k.params = k.params || {}; }); c.revisions = c.revisions || []; }); return d; }

  /* ---------------- 合同审查 ---------------- */
  function fillIssue(t, params) {
    var ctx = clone(params);
    if (params.advanceRatio != null) ctx.advanceRatioPct = r0(params.advanceRatio * 100);
    if (params.rate != null) ctx.ratePct = r0(params.rate * 100);
    if (params.penalty != null && typeof params.penalty === 'number') ctx.penalty = fmtN(params.penalty);
    return String(t).replace(/\{(\w+)\}/g, function (_, k) { return ctx[k] != null ? ctx[k] : ''; });
  }
  function reviewContract(c, lib) {
    var R = lib.contractRules, W = R.weights;
    var findings = [];
    var present = {}; c.clauses.forEach(function (k) { present[k.type] = k; });
    (R.required[c.type] || []).forEach(function (t) {
      if (present[t]) return;
      var tpl = R.templates[t];
      var sev = MISSING_HIGH.indexOf(t) >= 0 ? 'high' : 'mid';
      findings.push({ id: 'M-' + t, kind: 'missing', clauseNo: null, clauseType: t, clauseTitle: tpl ? tpl.title : t, severity: sev, issue: '缺少「' + (tpl ? tpl.title : t) + '」条款' + (sev === 'high' ? '，履行中最容易起争议的环节没有约定' : ''), basis: '民法典合同编：合同内容由当事人约定，一般包括标的、数量、质量、价款、履行期限地点方式、违约责任和解决争议的方法', fix: tpl ? { mode: 'insert', title: tpl.title, text: tpl.text, params: tpl.params } : null });
    });
    R.risks.forEach(function (r) {
      var k = present[r.clause]; if (!k) return;
      var env = clone(k.params); env.role = c.role;
      var hit = false; try { hit = !!evalExpr(r.when, env); } catch (e) { hit = false; }
      if (!hit) return;
      findings.push({ id: r.id, kind: 'risk', clauseNo: k.no, clauseType: r.clause, clauseTitle: k.title, severity: r.severity, issue: fillIssue(r.issue, k.params), basis: r.basis, fix: r.fix ? { mode: r.fix.mode, title: r.fix.title, text: r.fix.text, params: r.fix.params } : null, current: k.text });
    });
    var order = { high: 0, mid: 1, low: 2 };
    findings.sort(function (a, b) { return order[a.severity] - order[b.severity] || (a.clauseNo || '99').localeCompare(b.clauseNo || '99'); });
    var penalty = sum(findings.map(function (f) { return W[f.severity]; }));
    var score = Math.max(0, 100 - penalty);
    var hiCount = findings.filter(function (f) { return f.severity === 'high'; }).length;
    var level = score < R.levels.mid ? 'high' : (score < R.levels.low || hiCount > 0) ? 'mid' : 'low';
    return { findings: findings, score: score, level: level, counts: { high: findings.filter(function (f) { return f.severity === 'high'; }).length, mid: findings.filter(function (f) { return f.severity === 'mid'; }).length, low: findings.filter(function (f) { return f.severity === 'low'; }).length }, revised: c.revisions.length };
  }
  function applyFix(raw, contractId, findingId, lib) {
    var d = ensure(raw);
    var c = d.contracts.filter(function (x) { return x.id === contractId; })[0]; if (!c) return d;
    var rv = reviewContract(c, lib);
    var f = rv.findings.filter(function (x) { return x.id === findingId; })[0]; if (!f || !f.fix) return d;
    if (f.fix.mode === 'insert') {
      var no = String(c.clauses.length + 1);
      c.clauses.push({ no: no, type: f.clauseType, title: f.fix.title, text: f.fix.text, params: clone(f.fix.params), revised: true, inserted: true });
      c.revisions.push({ findingId: findingId, mode: 'insert', clauseNo: no, title: f.fix.title });
    } else {
      var k = c.clauses.filter(function (x) { return x.no === f.clauseNo; })[0]; if (!k) return d;
      k.before = k.before || k.text; k.text = f.fix.text; k.title = f.fix.title || k.title; Object.keys(f.fix.params || {}).forEach(function (p) { k.params[p] = f.fix.params[p]; }); k.revised = true;
      c.revisions.push({ findingId: findingId, mode: 'replace', clauseNo: k.no, title: k.title });
    }
    var after = reviewContract(c, lib);
    d.log.push({ seq: d.log.length + 1, kind: 'contract', label: '采纳修订', detail: c.id + ' ' + (f.fix.mode === 'insert' ? '新增' : '修订') + '「' + f.fix.title + '」，风险分 ' + rv.score + ' → ' + after.score });
    return d;
  }
  /* 批量采纳：按入参那一刻的审查结果收集全部高风险可修订项，逐条走 applyFix，逐处写日志 */
  function applyAllHigh(raw, lib) {
    var d = ensure(raw);
    reviewAll(d, lib).forEach(function (c) {
      c.findings.filter(function (x) { return x.severity === 'high' && x.fix; }).forEach(function (x) { d = applyFix(d, c.id, x.id, lib); });
    });
    return d;
  }
  function opinion(c, rv, lib) {
    var R = lib.contractRules;
    var lines = ['【合同审查意见】' + c.id + ' ' + c.title, '相对方 ' + c.party + ' · ' + R.types[c.type] + ' · ' + R.roles[c.role] + (c.amount ? ' · 金额 ' + fmtW(c.amount) : '') + ' · 期限 ' + short(c.start) + ' 至 ' + short(c.end), '风险分 ' + rv.score + '（' + { high: '高风险', mid: '中风险', low: '低风险' }[rv.level] + '）· 高 ' + rv.counts.high + ' · 中 ' + rv.counts.mid + ' · 低 ' + rv.counts.low + (rv.revised ? ' · 已采纳修订 ' + rv.revised + ' 处' : '')];
    rv.findings.forEach(function (f, i) { lines.push((i + 1) + '. [' + SEV_LABEL[f.severity] + '] ' + (f.clauseNo ? '第 ' + f.clauseNo + ' 条 ' : '') + f.clauseTitle + '：' + f.issue + '。依据：' + f.basis + (f.fix ? '。建议：' + (f.fix.mode === 'insert' ? '新增条款「' + f.fix.title + '」' : '修订为「' + f.fix.text + '」') : '')); });
    if (!rv.findings.length) lines.push('未发现需要修订的条款，可按现稿签署。');
    else lines.push('结论：' + (rv.level === 'high' ? '建议修订后再签署，重点处理高风险项' : rv.level === 'mid' ? '建议与相对方协商修订中风险项后签署' : '可签署，低风险项可在下次续签时调整'));
    return { lines: lines, text: lines.join('\n') };
  }
  function reviewAll(d, lib) {
    var R = lib.contractRules;
    var rows = d.contracts.map(function (c) {
      var rv = reviewContract(c, lib);
      return { id: c.id, title: c.title, type: c.type, typeName: R.types[c.type] || c.type, role: c.role, roleName: R.roles[c.role] || c.role, party: c.party, amount: c.amount, signed: c.signed, start: c.start, end: c.end, endDays: days(d.today, c.end), status: c.status, milestones: c.milestones || [], clauses: c.clauses, review: rv, score: rv.score, level: rv.level, findings: rv.findings, revisions: c.revisions };
    });
    rows.sort(function (a, b) { return a.score - b.score; });
    return rows;
  }

  /* ---------------- 新设主体 ---------------- */
  function equity(shares, lib) {
    var E = lib.setupRules.equity;
    var s = shares.slice().sort(function (a, b) { return b.pct - a.pct; });
    var top = s[0] ? s[0].pct / 100 : 0, second = s[1] ? s[1].pct / 100 : 0;
    var deadlock = s.length >= 2 && Math.abs(s[0].pct - s[1].pct) < 0.5 && s[0].pct >= 50;
    var control = deadlock ? '僵局' : top >= E.absolute ? '绝对控制' : top > E.relative - 0.01 ? '相对控制' : '无控制方';
    var lines = [{ key: 'absolute', pct: E.absolute * 100, label: '绝对控制线 2/3', met: top >= E.absolute, text: E.notes.absolute }, { key: 'relative', pct: E.relative * 100, label: '相对控制线 1/2', met: top > E.relative - 0.01, text: E.notes.relative }, { key: 'veto', pct: E.veto * 100, label: '否决线 1/3', met: second >= E.veto, holder: second >= E.veto ? s[1].holder : null, text: E.notes.veto }];
    var charter = E.charter.filter(function (r) { return r.when === 'always' || (r.when === 'top < 0.67' && top < E.absolute) || (r.when === 'second >= 0.34' && second >= E.veto) || (r.when === 'deadlock' && deadlock) || (r.when === 'platform' && s.some(function (x) { return x.platform; })); }).map(function (r) { return r.text; });
    var total = sum(shares.map(function (x) { return x.pct; }));
    return { holders: s, top: top, second: second, control: control, deadlock: deadlock, lines: lines, charter: charter, totalOk: Math.abs(total - 100) < 0.01, total: total };
  }
  function setupPlan(d, lib) {
    var S = d.setup, E = lib.setupRules, ent = E.entities[S.type] || E.entities.subsidiary;
    var start = S.startDate || d.today;
    var cur = 0, steps = ent.steps.map(function (st, i) { var s0 = cur; cur += st.days; return { key: st.key, title: st.title, days: st.days, materials: st.materials, startDay: s0, endDay: cur, start: dateOf(start, s0), end: dateOf(start, cur), order: i + 1, kind: 'step' }; });
    (S.licenses || []).forEach(function (name) { var L = E.licenses[name]; if (!L) return; var s0 = steps[Math.min(3, steps.length - 1)].endDay; steps.push({ key: 'lic-' + name, title: name, days: L.days, materials: L.materials, note: L.note, startDay: s0, endDay: s0 + L.days, start: dateOf(start, s0), end: dateOf(start, s0 + L.days), order: steps.length + 1, kind: 'license' }); });
    var totalDays = Math.max.apply(null, steps.map(function (s) { return s.endDay; }));
    var eq = S.type === 'branch' ? null : equity(S.shares || [], lib);
    var risks = [];
    if (eq && eq.deadlock) risks.push({ severity: 'high', text: '股权对半分，任何决议都需双方同意，经营僵局风险高' });
    if (eq && eq.top < E.equity.absolute && eq.top >= E.equity.relative) risks.push({ severity: 'mid', text: '母公司持股 ' + r0(eq.top * 100) + '%，未达三分之二，修改章程、增减资等特别事项需其他股东配合' });
    if (eq && eq.second >= E.equity.veto) risks.push({ severity: 'mid', text: eq.holders[1].holder + ' 持股 ' + eq.holders[1].pct + '%，对特别决议有否决权' });
    if ((S.licenses || []).length) risks.push({ severity: 'mid', text: '经营范围涉及 ' + S.licenses.join('、') + '，取得许可前不得开展相应业务；许可办理 ' + S.licenses.map(function (n) { return n + ' 约 ' + ((E.licenses[n] || {}).days || '—') + ' 天'; }).join('、') });
    if (S.type !== 'branch' && S.capital) risks.push({ severity: 'low', text: '注册资本 ' + fmtW(S.capital) + '，认缴出资须自成立之日起五年内缴足，章程写明各股东出资时间' });
    if (S.type === 'branch') risks.push({ severity: 'low', text: '分公司无独立法人资格，债务由总公司承担；对外签约以总公司名义或授权范围内进行' });
    var fees = E.fees;
    var feeTotal = fees.seal + fees.agency;
    return { type: S.type, typeName: ent.name, typeDesc: ent.desc, name: S.name, region: S.region, capital: S.capital, scope: S.scope || [], licenses: S.licenses || [], reason: S.reason, startDate: start, steps: steps, totalDays: totalDays, endDate: dateOf(start, totalDays), equity: eq, risks: risks, fees: { seal: fees.seal, agency: fees.agency, total: feeTotal, note: fees.note }, confirmed: !!S.confirmed, materials: steps.reduce(function (t, s) { return t.concat(s.materials.map(function (m) { return { step: s.title, item: m }; })); }, []) };
  }
  function updateSetup(raw, patch) { var d = ensure(raw); Object.keys(patch).forEach(function (k) { d.setup[k] = patch[k]; }); d.setup.confirmed = false; return d; }
  function confirmSetup(raw, lib) { var d = ensure(raw); d.setup.confirmed = true; var p = setupPlan(d, lib); d.log.push({ seq: d.log.length + 1, kind: 'setup', label: '确认设立方案', detail: p.typeName + ' ' + p.name + '，' + short(p.startDate) + ' 启动，' + p.totalDays + ' 天，' + p.steps.length + ' 个节点进台账' }); return d; }

  /* ---------------- 知识产权 ---------------- */
  function ipReview(d, lib) {
    var I = lib.ipClasses, RU = I.rules, F = I.fees, ip = d.ip, today = d.today;
    var renew = {}; d.renewList.forEach(function (x) { renew[x] = true; }); var apply = {}; d.applyList.forEach(function (x) { apply[x] = true; });
    var assets = [];
    ip.trademarks.forEach(function (t) {
      var expiry = addYears(t.regDate, RU.trademarkYears); var left = days(today, expiry);
      var windowOpen = left <= RU.renewWindowMonths * 30.4 && left >= -RU.graceMonths * 30.4;
      var st = left < -RU.graceMonths * 30.4 ? '已失效' : left < 0 ? '宽展期' : windowOpen ? '可续展' : '有效';
      assets.push({ id: t.id, kind: 'trademark', kindName: '商标', title: t.name + ' · 第 ' + t.classes.join('、') + ' 类', name: t.name, classes: t.classes, classNames: t.classes.map(function (c) { return I.classNames[c] || c; }), regNo: t.regNo, regDate: t.regDate, due: expiry, dueLabel: '续展截止', daysLeft: left, status: st, action: windowOpen ? '续展' : null, fee: windowOpen ? (F.renewal.official + F.renewal.agency + (left < 0 ? F.renewal.graceExtra : 0)) * t.classes.length : 0, listed: !!renew[t.id], urgent: windowOpen });
    });
    ip.patents.forEach(function (p) {
      var life = RU.patentYears[p.kind], expiry = addYears(p.appDate, life);
      var yearIdx = 0; var d0 = p.appDate; while (days(addYears(d0, yearIdx + 1), today) > 0 && yearIdx < life) yearIdx++;
      var nextFee = addYears(d0, yearIdx + 1); var left = days(today, nextFee); var feeYear = yearIdx + 2;
      var table = F.patentAnnual[p.kind] || []; var fee = table[Math.min(table.length - 1, feeYear - 1)] || 0;
      var due = left <= RU.feeAheadDays;
      assets.push({ id: p.id, kind: 'patent', kindName: { invention: '发明专利', utility: '实用新型', design: '外观设计' }[p.kind], title: p.title, patentKind: p.kind, appDate: p.appDate, grantDate: p.grantDate, expiry: expiry, due: nextFee, dueLabel: '第 ' + feeYear + ' 年年费', daysLeft: left, status: days(today, expiry) < 0 ? '已届满' : '有效', action: due ? '缴年费' : null, fee: fee, feeYear: feeYear, listed: !!renew[p.id], urgent: due });
    });
    ip.software.forEach(function (s) { assets.push({ id: s.id, kind: 'software', kindName: '软件著作权', title: s.title, regDate: s.regDate, due: null, dueLabel: '无年费', daysLeft: null, status: '有效', action: null, fee: 0, listed: false, urgent: false }); });
    (ip.domains || []).forEach(function (dm, i) { var left = days(today, dm.expiry); assets.push({ id: 'DM-' + (i + 1), kind: 'domain', kindName: '域名', title: dm.name, due: dm.expiry, dueLabel: '到期', daysLeft: left, status: left < 0 ? '已过期' : '有效', action: left <= 60 ? '续费' : null, fee: left <= 60 ? 120 : 0, listed: !!renew['DM-' + (i + 1)], urgent: left <= 60 }); });
    assets.sort(function (a, b) { return (a.daysLeft == null ? 9999 : a.daysLeft) - (b.daysLeft == null ? 9999 : b.daysLeft); });
    // 布局缺口
    var map = I.byIndustry[d.profile.industry] || I.byIndustry.default;
    var have = {}; ip.trademarks.forEach(function (t) { t.classes.forEach(function (c) { have[c] = (have[c] || []).concat([t.name]); }); });
    var gaps = [];
    map.core.forEach(function (c) { if (!have[c]) gaps.push({ cls: c, name: I.classNames[c] || c, tier: 'core', reason: map.reasons[c], fee: F.trademark.official + F.trademark.agency, listed: !!apply[c] }); });
    map.extend.forEach(function (c) { if (!have[c]) gaps.push({ cls: c, name: I.classNames[c] || c, tier: 'extend', reason: map.reasons[c], fee: F.trademark.official + F.trademark.agency, listed: !!apply[c] }); });
    var covered = map.core.concat(map.extend).filter(function (c) { return have[c]; });
    var coverage = r0(100 * covered.length / (map.core.length + map.extend.length));
    var similar = (ip.similarMarks || []).map(function (s) { return Object.assign({}, s, { classNames: s.classes.map(function (c) { return I.classNames[c] || c; }), daysLeft: s.deadline ? days(today, s.deadline) : null, action: s.deadline ? '提异议' : '评估无效宣告' }); });
    var leads = (ip.infringementLeads || []).map(function (l) { return Object.assign({}, l, { action: l.similarity >= 0.85 ? '发函 + 平台投诉' : '取证观察' }); });
    var renewItems = assets.filter(function (a) { return a.listed; }), applyItems = gaps.filter(function (g) { return g.listed; });
    return { assets: assets, gaps: gaps, coverage: coverage, covered: covered, similar: similar, leads: leads, counts: { total: assets.length, urgent: assets.filter(function (a) { return a.urgent; }).length, trademarks: ip.trademarks.length, patents: ip.patents.length, software: ip.software.length, gaps: gaps.length, coreGaps: gaps.filter(function (g) { return g.tier === 'core'; }).length }, renewFee: sum(renewItems.map(function (a) { return a.fee; })), applyFee: sum(applyItems.map(function (g) { return g.fee; })), renewCount: renewItems.length, applyCount: applyItems.length };
  }
  function toggleRenew(raw, id) { var d = ensure(raw); var i = d.renewList.indexOf(id); if (i >= 0) d.renewList.splice(i, 1); else { d.renewList.push(id); d.log.push({ seq: d.log.length + 1, kind: 'ip', label: '加入续展 / 缴费清单', detail: id }); } return d; }
  function toggleApply(raw, cls) { var d = ensure(raw); var i = d.applyList.indexOf(cls); if (i >= 0) d.applyList.splice(i, 1); else { d.applyList.push(cls); d.log.push({ seq: d.log.length + 1, kind: 'ip', label: '加入申请清单', detail: '第 ' + cls + ' 类' }); } return d; }

  /* ---------------- 证照、台账、日历 ---------------- */
  function licenses(d, lib) {
    var ahead = lib.ipClasses.rules.licenseAheadDays;
    return d.licenses.map(function (l) { var left = l.expiry ? days(d.today, l.expiry) : null; return Object.assign({}, l, { daysLeft: left, state: left == null ? 'ok' : left < 0 ? 'expired' : left <= ahead ? 'due' : 'ok', stateName: left == null ? '长期有效' : left < 0 ? '已过期' : left <= ahead ? left + ' 天后到期' : '有效' }); });
  }
  function register(d, contracts, setup, ipr, lic, lib) {
    var RU = lib.ipClasses.rules, items = [];
    contracts.forEach(function (c) {
      if (c.endDays <= 90) items.push({ date: c.end, kind: 'contract', kindName: '合同到期', title: c.id + ' ' + c.title, sub: c.party, tone: c.endDays <= RU.contractAheadDays ? 'risk' : 'ok', ref: c.id });
      c.milestones.forEach(function (m) { var dd = days(d.today, m.date); if (dd >= -7 && dd <= 90) items.push({ date: m.date, kind: 'milestone', kindName: '履约节点', title: c.id + ' ' + m.text, sub: c.party, tone: dd < 0 ? 'late' : dd <= 14 ? 'risk' : 'ok', ref: c.id }); });
    });
    lic.forEach(function (l) { if (l.expiry && l.daysLeft <= 90) items.push({ date: l.expiry, kind: 'license', kindName: '证照到期', title: l.name, sub: l.issuer, tone: l.daysLeft < 0 ? 'late' : l.daysLeft <= RU.licenseAheadDays ? 'risk' : 'ok', ref: l.id }); });
    ipr.assets.forEach(function (a) { if (a.due && a.daysLeft != null && a.daysLeft <= 90) items.push({ date: a.due, kind: 'ip', kindName: a.kind === 'trademark' ? '商标续展' : a.kind === 'patent' ? '专利年费' : '域名续费', title: a.title, sub: a.dueLabel + (a.fee ? ' · 预计 ' + fmtN(a.fee) + ' 元' : ''), tone: a.daysLeft < 0 ? 'late' : a.daysLeft <= 30 ? 'risk' : 'ok', ref: a.id, listed: a.listed }); });
    ipr.similar.forEach(function (s) { if (s.deadline && s.daysLeft <= 90) items.push({ date: s.deadline, kind: 'ip', kindName: '异议期截止', title: '近似商标「' + s.name + '」第 ' + s.classes.join('、') + ' 类', sub: s.holder + ' · 相似度 ' + r0(s.similarity * 100) + '%', tone: s.daysLeft <= 30 ? 'risk' : 'ok', ref: s.name }); });
    if (setup.confirmed) setup.steps.forEach(function (s) { if (days(d.today, s.end) <= 90) items.push({ date: s.end, kind: 'setup', kindName: '设立节点', title: s.title, sub: setup.name, tone: 'accent', ref: s.key }); });
    items.forEach(function (it) { it.daysLeft = days(d.today, it.date); it.label = short(it.date); });
    items.sort(function (a, b) { return ms(a.date) - ms(b.date); });
    var weeks = []; for (var w = 0; w < 13; w++) { var s0 = dateOf(d.weekStart, w * 7); weeks.push({ w: w, start: s0, end: dateOf(d.weekStart, w * 7 + 6), label: short(s0), items: [] }); }
    items.forEach(function (it) { var w = Math.floor(days(d.weekStart, it.date) / 7); if (w >= 0 && w < 13) weeks[w].items.push(it); });
    var overdue = items.filter(function (it) { return it.daysLeft < 0; }), due30 = items.filter(function (it) { return it.daysLeft >= 0 && it.daysLeft <= 30; });
    return { items: items, weeks: weeks, overdue: overdue, due30: due30, counts: { total: items.length, overdue: overdue.length, due30: due30.length, contract: items.filter(function (i) { return i.kind === 'contract' || i.kind === 'milestone'; }).length, license: items.filter(function (i) { return i.kind === 'license'; }).length, ip: items.filter(function (i) { return i.kind === 'ip'; }).length, setup: items.filter(function (i) { return i.kind === 'setup'; }).length } };
  }

  /* ---------------- KPI 与月报 ---------------- */
  function kpi(d, contracts, setup, ipr, lic, reg) {
    var open = contracts.reduce(function (t, c) { return t + c.findings.length; }, 0);
    var avg = contracts.length ? r0(sum(contracts.map(function (c) { return c.score; })) / contracts.length) : 100;
    var licOk = lic.filter(function (l) { return l.state === 'ok'; }).length / Math.max(1, lic.length);
    var compliance = r0(avg * 0.4 + licOk * 100 * 0.3 + ipr.coverage * 0.3);
    return { contracts: contracts.length, inReview: contracts.filter(function (c) { return c.status === '审查中'; }).length, highRisk: contracts.filter(function (c) { return c.level === 'high'; }).length, midRisk: contracts.filter(function (c) { return c.level === 'mid'; }).length, findingsOpen: open, revised: contracts.reduce(function (t, c) { return t + c.revisions.length; }, 0), avgScore: avg, due30: reg.counts.due30, overdue: reg.counts.overdue, licDue: lic.filter(function (l) { return l.state !== 'ok'; }).length, licTotal: lic.length, ipAssets: ipr.counts.total, ipUrgent: ipr.counts.urgent, ipGaps: ipr.counts.gaps, coverage: ipr.coverage, setupDays: setup.totalDays, setupConfirmed: setup.confirmed, compliance: compliance };
  }
  function report(d, contracts, setup, ipr, lic, reg, k, lib) {
    var lines = ['【法务月报】' + d.today.slice(0, 7).replace('-', ' 年 ') + ' 月 · ' + d.company];
    lines.push('合同 ' + k.contracts + ' 份：审查中 ' + k.inReview + ' · 高风险 ' + k.highRisk + ' · 中风险 ' + k.midRisk + ' · 待处理问题 ' + k.findingsOpen + ' 处 · 已采纳修订 ' + k.revised + ' 处 · 平均风险分 ' + k.avgScore);
    var hi = contracts.filter(function (c) { return c.level === 'high'; });
    if (hi.length) lines.push('高风险合同：' + hi.map(function (c) { return c.id + ' ' + c.party + '（' + c.score + ' 分，' + c.findings.filter(function (f) { return f.severity === 'high'; }).map(function (f) { return f.clauseTitle; }).join('、') + '）'; }).join('；'));
    lines.push('证照 ' + k.licTotal + ' 项：' + (k.licDue ? lic.filter(function (l) { return l.state !== 'ok'; }).map(function (l) { return l.name + ' ' + l.stateName; }).join('；') : '全部有效'));
    lines.push('知产 ' + k.ipAssets + ' 项：待续展 / 缴费 ' + k.ipUrgent + ' 项 · 商标布局覆盖 ' + k.coverage + '% · 缺口 ' + k.ipGaps + ' 类' + (ipr.counts.coreGaps ? '（核心类 ' + ipr.counts.coreGaps + ' 类）' : '') + (ipr.renewCount ? ' · 续展清单 ' + ipr.renewCount + ' 项 预计 ' + fmtN(ipr.renewFee) + ' 元' : '') + (ipr.applyCount ? ' · 申请清单 ' + ipr.applyCount + ' 类 预计 ' + fmtN(ipr.applyFee) + ' 元' : ''));
    if (ipr.similar.length) lines.push('近似商标 ' + ipr.similar.length + ' 件：' + ipr.similar.map(function (s) { return '「' + s.name + '」' + s.status + (s.deadline ? '，' + short(s.deadline) + ' 前' + s.action : '，' + s.action); }).join('；'));
    lines.push('新设主体：' + setup.typeName + ' ' + setup.name + '，' + (setup.confirmed ? '已确认，' + short(setup.startDate) + ' 启动，预计 ' + short(setup.endDate) + ' 完成' : '方案待确认，' + setup.totalDays + ' 天 ' + setup.steps.length + ' 个节点'));
    lines.push('90 天台账 ' + reg.counts.total + ' 项：30 天内 ' + reg.counts.due30 + ' 项' + (reg.counts.overdue ? ' · 逾期 ' + reg.counts.overdue + ' 项' : '') + '；最近：' + reg.items.slice(0, 4).map(function (i) { return short(i.date) + ' ' + i.title; }).join('；'));
    if (d.log.length) lines.push('本期处置：' + d.log.map(function (l) { return l.label; }).join('；'));
    var todo = [];
    hi.slice(0, 2).forEach(function (c) { todo.push(c.id + '：采纳 ' + c.findings.filter(function (f) { return f.severity === 'high'; }).length + ' 处高风险修订'); });
    lic.filter(function (l) { return l.state !== 'ok'; }).slice(0, 2).forEach(function (l) { todo.push(l.name + '：' + l.stateName + '，启动换证'); });
    ipr.assets.filter(function (a) { return a.urgent && !a.listed; }).slice(0, 2).forEach(function (a) { todo.push(a.title + '：' + a.action + '，' + a.daysLeft + ' 天'); });
    if (todo.length) lines.push('待办：' + todo.join('；'));
    return { lines: lines, text: lines.join('\n'), todo: todo };
  }
  function run(raw, lib) {
    var d = ensure(raw);
    var contracts = reviewAll(d, lib), setup = setupPlan(d, lib), ipr = ipReview(d, lib), lic = licenses(d, lib);
    var reg = register(d, contracts, setup, ipr, lic, lib);
    var k = kpi(d, contracts, setup, ipr, lic, reg);
    var byId = {}; contracts.forEach(function (c) { byId[c.id] = c; });
    return { version: VERSION, data: d, contracts: contracts, byId: byId, setup: setup, ip: ipr, licenses: lic, register: reg, kpi: k, report: report(d, contracts, setup, ipr, lic, reg, k, lib) };
  }

  /* ---------------- 对话与文档摄入 ----------------
     screens / brief / suggest / ask / ingest 五个导出：纯函数，只认入参，不碰 DOM、window、时钟与随机数。
     result 是 run(data, lib) 的结果，可选：传了就用，没传自己算一次。答不上返回 null，不编数。
     回答里的 blocks 是平台中立的纯数据（kv / table / tags / text），act 是声明式动作（goto / focus / open / apply / set）。
     选中态（当前合同 / 台账筛选）不在契约里：合同取风险分排在前面的一份，台账按全量算。 */
  var SCREENS = [['connect', '接入'], ['board', '法务驾驶舱'], ['contracts', '合同审查'], ['setup', '新设主体'], ['ip', '知识产权'], ['register', '台账与提醒']];
  var CAPS = ['合同审查', '新设主体', '知识产权', '台账与提醒'];
  var LV_NAME = { high: '高风险', mid: '中风险', low: '低风险' };
  var PRESETS = [[70, 30], [60, 40], [51, 49], [50, 50]];
  var KIND_NAME = { contract: '合同与节点', license: '证照', ip: '知产', setup: '设立' };
  var DOC_LABEL = { word: 'Word', excel: 'Excel', ppt: 'PPT', pdf: 'PDF', eml: '邮件', text: '文本' };

  function screens() { return SCREENS.map(function (s) { return { key: s[0], label: s[1] }; }); }
  function ctxOf(data, lib, result) { return (result && result.kpi && result.data && result.register && result.byId) ? result : run(data, lib); }
  function cut(s, n) { s = String(s == null ? '' : s); return s.length > n ? s.slice(0, n) + '…' : s; }
  function has(q, arr) { for (var i = 0; i < arr.length; i++) if (q.indexOf(arr[i]) >= 0) return true; return false; }
  function pad2(n) { return String(+n).length < 2 ? '0' + (+n) : String(+n); }
  /* 规则库里的比较级措辞在对话里收一档 */
  function soft(s) { return String(s == null ? '' : s).split('最容易').join('容易').split('最短').join('较短').split('最长').join('较长').split('最近').join('近期'); }
  function softL(list) { return (list || []).map(soft); }
  function dsh(d, s) { return !s ? '' : (String(s).slice(0, 4) === d.today.slice(0, 4) ? short(s) : String(s)); }
  function ipT(a) { return cut(String(a && a.title || ''), 16); }
  function srcShort(name) { return String(name).split(' · ')[0]; }
  function kvB(rows) { return { type: 'kv', rows: rows }; }
  function tableB(head, rows) { return { type: 'table', head: head, rows: rows }; }
  function tagsB(items) { return { type: 'tags', items: items }; }
  function textB(t) { return { type: 'text', text: t }; }
  function industryName(lib, slug) {
    var src = lib && lib.industries, hit = null;
    if (!src) return slug;
    (src.sectors || []).forEach(function (s) { (s.industries || []).forEach(function (i) { if (i.slug === slug) hit = i; }); });
    return hit ? hit.name : slug;
  }
  function topContract(R) { return R.contracts[0]; }
  function curContract(R) { return R.contracts[0]; }
  function missingOf(c) { return c.findings.filter(function (f) { return f.kind === 'missing'; }); }
  function urgentIp(R) { return R.ip.assets.filter(function (a) { return a.urgent; }); }
  function coreGap(R) { return R.ip.gaps.filter(function (g) { return g.tier === 'core'; })[0] || R.ip.gaps[0]; }
  function licSoon(R) { return R.licenses.filter(function (l) { return l.state !== 'ok'; }).sort(function (a, b) { return (a.daysLeft == null ? 9999 : a.daysLeft) - (b.daysLeft == null ? 9999 : b.daysLeft); })[0]; }
  function licOkPct(R) { var l = R.licenses; return l.length ? r0(100 * l.filter(function (x) { return x.state === 'ok'; }).length / l.length) : 100; }
  function nextItem(R) { var reg = R.register; return reg.overdue[0] || reg.due30[0] || reg.items[0]; }
  function kindCount(R, key) { var c = R.register.counts; return key === 'contract' ? c.contract : key === 'license' ? c.license : key === 'ip' ? c.ip : c.setup; }
  /* 台账里的一项落到哪一屏 */
  function jumpAct(it) {
    if (!it) return null;
    if (it.kind === 'contract' || it.kind === 'milestone') return { type: 'open', panel: 'contract', ref: it.ref };
    if (it.kind === 'license') return { type: 'open', panel: 'license', ref: it.ref };
    if (it.kind === 'ip') return { type: 'goto', step: 'ip' };
    if (it.kind === 'setup') return { type: 'goto', step: 'setup' };
    return null;
  }

  /* 开场发现：进这一屏先说一条从数据里算出来的话 */
  function brief(step, data, lib, result) {
    var R = ctxOf(data, lib, result), d = R.data, k = R.kpi, reg = R.register, I = R.ip, S = R.setup;
    if (step === 'connect') {
      var dir = d.sources.filter(function (s) { return s.mode === 'direct'; }).length;
      return d.sources.length + ' 个来源已接入（直连 ' + dir + ' 个）：合同 ' + k.contracts + ' 份、证照 ' + k.licTotal + ' 项、知产 ' + k.ipAssets + ' 项，其中高风险合同 ' + k.highRisk + ' 份。';
    }
    if (step === 'board') {
      var t = topContract(R), ls = licSoon(R);
      return '合规分 ' + k.compliance + '；' + t.id + ' 风险分 ' + t.score + '，' + dsh(d, t.end) + ' 到期' + (ls && ls.daysLeft != null ? '；' + ls.name + ' ' + ls.stateName : '') + '。';
    }
    if (step === 'contracts') {
      var C = curContract(R), ms = missingOf(C);
      return C.id + ' ' + C.party + '：风险分 ' + C.score + '，' + (ms.length ? '缺「' + ms.map(function (x) { return x.clauseTitle; }).join('」「') + '」' : C.findings.length + ' 处待改') + '，高 ' + C.review.counts.high + ' 中 ' + C.review.counts.mid + '。';
    }
    if (step === 'setup') {
      var lic = (S.licenses || [])[0], ld = lic ? (lib.setupRules.licenses[lic] || {}).days : 0;
      return S.equity
        ? '股权 ' + S.equity.holders.map(function (x) { return x.pct + '%'; }).join(' / ') + ' 落在' + S.equity.control + '；' + (ld ? lic + ' ' + ld + ' 天与登记并行，' : '') + '全程 ' + S.totalDays + ' 天，' + short(S.endDate) + ' 完成。'
        : S.typeName + ' ' + S.name + '：' + S.steps.length + ' 个节点 ' + S.totalDays + ' 天，' + short(S.endDate) + ' 完成，预计费用 ' + fmtN(S.fees.total) + ' 元。';
    }
    if (step === 'ip') {
      var u = urgentIp(R)[0], gp = coreGap(R);
      return (u ? ipT(u) + ' ' + u.dueLabel + ' 还有 ' + u.daysLeft + ' 天，预计 ' + fmtN(u.fee) + ' 元' : '60 天内无续展与缴费') + '；商标覆盖 ' + I.coverage + '%，缺口 ' + I.counts.gaps + ' 类' + (gp ? '，第 ' + gp.cls + ' 类' + gp.name + '属' + (gp.tier === 'core' ? '核心' : '延伸') + '类' : '') + '。';
    }
    if (step === 'register') {
      if (reg.counts.overdue) { var o = reg.overdue[0]; return o.kindName + '「' + o.title + '」逾期 ' + (-o.daysLeft) + ' 天；30 天内还有 ' + reg.counts.due30 + ' 项，其中证照 ' + reg.counts.license + ' 项。'; }
      var nx = nextItem(R);
      return nx ? '下一项 ' + short(nx.date) + ' ' + nx.title + '（' + nx.daysLeft + ' 天后）；90 天台账共 ' + reg.counts.total + ' 项。' : '90 天内无到期事项。';
    }
    return null;
  }

  /* 快捷问句：每屏 3–4 条，条条都能被 ask 答上 */
  function suggest(step, data, lib, result) {
    if (step === 'connect') return ['接了哪几个来源', '高风险合同有几份', '进法务驾驶舱'];
    if (step === 'board') return ['哪份合同风险高', '合规分是怎么算的', '30 天内要办什么', '先处理哪一件'];
    if (step === 'contracts') return ['缺哪些必备条款', '为什么判高风险', '采纳全部高风险修订', '账期超过 90 天的是哪份'];
    if (step === 'setup') return ['为什么要 ' + ctxOf(data, lib, result).setup.totalDays + ' 天', '股权够控股吗', '改成 51 / 49 会怎样', '要花多少钱'];
    if (step === 'ip') return ['哪几项快到期', '缺口类别为什么要补', '近似商标怎么办', '把快到期的加入清单'];
    if (step === 'register') return ['有没有逾期', '只看证照', '月报写了什么', '哪一周事项密集'];
    return [];
  }

  /* 问答：认得的问法逐条作答，答不上返回 null 交给平台兜底 */
  function ask(question, step, data, lib, result) {
    var R = ctxOf(data, lib, result), k = R.kpi, d = R.data, I = R.ip, S = R.setup, reg = R.register;
    var q = String(question == null ? '' : question), m, i;

    /* 点名某份合同 */
    m = q.match(/HT[-\s]?(\d{4})[-\s]?(\d{3})/i);
    if (m) {
      var cid = 'HT-' + m[1] + '-' + m[2], cc = R.byId[cid];
      if (cc) return { text: cc.id + ' ' + cc.title + '（' + cc.party + ' · ' + cc.typeName + ' · ' + cc.roleName + '）：风险分 ' + cc.score + '，' + LV_NAME[cc.level] + '，高 ' + cc.review.counts.high + ' 中 ' + cc.review.counts.mid + ' 低 ' + cc.review.counts.low + '，' + dsh(d, cc.start) + ' 至 ' + dsh(d, cc.end) + '（' + cc.endDays + ' 天）。',
        blocks: [tableB(['等级', '条款', '问题'], cc.findings.slice(0, 4).map(function (f) { return [SEV_LABEL[f.severity], cut(f.clauseTitle, 8), cut(soft(f.issue), 16)]; }))],
        ref: cc.id, act: { type: 'open', panel: 'contract', ref: cid } };
    }
    /* 点名某项知产 */
    m = q.match(/(TM|ZL|RZ|DM)[-\s]?0?(\d{1,2})/i);
    if (m) {
      var pre = m[1].toUpperCase(), aid = pre + '-' + (pre === 'DM' ? String(+m[2]) : pad2(m[2]));
      var aa = I.assets.filter(function (x) { return x.id === aid; })[0];
      if (aa) return { text: aa.id + ' ' + aa.title + '（' + aa.kindName + '）：' + (aa.due ? aa.dueLabel + ' ' + aa.due + '，还有 ' + aa.daysLeft + ' 天' : aa.dueLabel) + '，状态' + aa.status + (aa.action ? '，动作' + aa.action + '，预计 ' + fmtN(aa.fee) + ' 元' : '') + '。',
        ref: aa.id,
        act: (aa.action && step === 'ip') ? { type: 'apply', action: 'toggleRenew', input: { id: aa.id } } : { type: 'open', panel: 'ip', ref: aa.id } };
    }
    /* 点名某个商标类别 */
    m = q.match(/第\s*(\d{1,2})\s*类/);
    if (m) {
      var cls = pad2(m[1]);
      var gpx = I.gaps.filter(function (x) { return x.cls === cls; })[0];
      var IC = lib.ipClasses, mp = IC.byIndustry[d.profile.industry] || IC.byIndustry.default;
      if (gpx) return { text: '第 ' + cls + ' 类' + gpx.name + '（' + (gpx.tier === 'core' ? '核心类' : '延伸类') + '）尚未注册：' + gpx.reason + '。申请预计 ' + fmtN(gpx.fee) + ' 元。',
        ref: 'CLS-' + cls,
        act: step === 'ip' ? { type: 'apply', action: 'toggleApply', input: { cls: cls } } : { type: 'goto', step: 'ip' } };
      var own = d.ip.trademarks.filter(function (t) { return t.classes.indexOf(cls) >= 0; });
      if (own.length) return { text: '第 ' + cls + ' 类' + (IC.classNames[cls] || '') + '已注册：' + own.map(function (t) { return t.name + '（' + t.regNo + '，注册 ' + t.regDate + '）'; }).join('；') + '。',
        ref: step === 'ip' ? 'CLS-' + cls : null };
      if (mp.core.concat(mp.extend).indexOf(cls) < 0) return { text: '第 ' + cls + ' 类不在本行业应覆盖的 ' + (mp.core.length + mp.extend.length) + ' 个类别里，核心类是第 ' + mp.core.join('、') + ' 类。' };
    }
    /* 点名某张证照 */
    var lic0 = R.licenses.filter(function (l) { return q.indexOf(l.name) >= 0 || (l.name.length > 4 && q.indexOf(l.name.slice(0, 4)) >= 0); })[0];
    if (lic0) return { text: lic0.name + '（' + lic0.issuer + (lic0.no ? ' · ' + lic0.no : '') + '）：' + lic0.stateName + (lic0.expiry ? '，到期 ' + lic0.expiry : '') + '。到期前 60 天启动换证，换证期间原证继续有效。',
      ref: lic0.id, act: { type: 'open', panel: 'license', ref: lic0.id } };
    /* 换屏 */
    if (has(q, ['进法务驾驶舱', '驾驶舱', '开始审查', '开始分析'])) return { text: '合规分 ' + k.compliance + '，合同 ' + k.contracts + ' 份、高风险 ' + k.highRisk + ' 份，30 天内到期 ' + k.due30 + ' 项。',
      act: { type: 'goto', step: 'board' } };

    if (step === 'connect') {
      if (has(q, ['来源', '直连', '接了', '同步', '导入', '几个'])) {
        var dirs = d.sources.filter(function (s) { return s.mode === 'direct'; });
        return { text: '共 ' + d.sources.length + ' 个来源，系统直连 ' + dirs.length + ' 个，其余表格导入，合计 ' + fmtN(d.sources.reduce(function (t, s) { return t + s.rows; }, 0)) + ' 条。',
          blocks: [tableB(['来源', '方式', '条数'], d.sources.map(function (s) { return [srcShort(s.name), s.mode === 'direct' ? '直连' : '导入', fmtN(s.rows)]; }))] };
      }
      if (has(q, ['高风险', '几份', '合同'])) return { text: '合同 ' + k.contracts + ' 份：高风险 ' + k.highRisk + ' 份、中风险 ' + k.midRisk + ' 份，待处理 ' + k.findingsOpen + ' 处，平均风险分 ' + k.avgScore + '。',
        blocks: [tableB(['合同', '相对方', '风险分'], R.contracts.slice(0, 4).map(function (c) { return [c.id, cut(c.party, 10), c.score]; }))],
        act: { type: 'set', path: 'filter', value: 'high' } };
      if (has(q, ['能力', '开通', '能做'])) return { text: '已开通 ' + CAPS.length + ' 项：' + CAPS.join('、') + '。' };
      if (has(q, ['注册资本', '主体', '成立', '行业'])) return { text: d.company + '：' + industryName(lib, d.profile.industry) + '，注册资本 ' + fmtW(d.profile.capital) + (d.profile.province ? '，' + d.profile.province : '') + (d.profile.founded ? '，成立 ' + d.profile.founded.slice(0, 4) + ' 年' : '') + '。' };
    }

    if (step === 'board') {
      if (has(q, ['合规分', '怎么算', '为什么低'])) return { text: '合规分 ' + k.compliance + ' = 合同平均风险分 ' + k.avgScore + ' × 40% + 证照有效率 ' + licOkPct(R) + '% × 30% + 商标布局覆盖 ' + k.coverage + '% × 30%。',
        blocks: [kvB([['合同 40%', k.avgScore], ['证照 30%', licOkPct(R) + '%'], ['商标布局 30%', k.coverage + '%'], ['合规分', k.compliance]])] };
      if (has(q, ['风险高', '哪份', '哪几份', '高风险'])) {
        var hi = R.contracts.filter(function (c) { return c.level === 'high'; });
        return { text: hi.length ? '高风险 ' + hi.length + ' 份：' + hi.map(function (c) { return c.id + ' ' + c.party + '（' + c.score + ' 分）'; }).join('；') + '。' : '当前无高风险合同，中风险 ' + k.midRisk + ' 份。',
          blocks: [tableB(['合同', '相对方', '风险分', '高'], hi.map(function (c) { return [c.id, cut(c.party, 10), c.score, c.review.counts.high]; }))],
          act: { type: 'set', path: 'filter', value: 'high' } };
      }
      if (has(q, ['30 天', '待办', '要办', '到期'])) return { text: '30 天内 ' + reg.counts.due30 + ' 项' + (reg.counts.overdue ? '，另有逾期 ' + reg.counts.overdue + ' 项' : '') + '：合同与节点 ' + reg.counts.contract + '、证照 ' + reg.counts.license + '、知产 ' + reg.counts.ip + '。',
        blocks: [tableB(['日期', '事项', '剩余'], reg.overdue.concat(reg.due30).slice(0, 5).map(function (it) { return [it.label, cut(it.title, 14), it.daysLeft < 0 ? '逾期 ' + (-it.daysLeft) : it.daysLeft + ' 天']; }))],
        act: { type: 'set', path: 'regKind', value: null } };
      if (has(q, ['先处理', '优先', '哪一件', '怎么办', '建议'])) {
        var t0 = topContract(R), u0 = urgentIp(R)[0], o0 = reg.overdue[0];
        return { text: '先看三件：' + (o0 ? o0.title + ' 已逾期 ' + (-o0.daysLeft) + ' 天；' : '') + t0.id + ' 风险分 ' + t0.score + '，' + (missingOf(t0).length ? '缺 ' + missingOf(t0).length + ' 项必备条款' : t0.findings.length + ' 处待改') + '；' + (u0 ? ipT(u0) + ' ' + u0.dueLabel + ' 还有 ' + u0.daysLeft + ' 天' : '知产无近期到期') + '。',
          ref: t0.id, act: { type: 'open', panel: 'contract', ref: t0.id } };
      }
      if (has(q, ['证照', '换证'])) {
        var l0 = licSoon(R);
        return { text: '证照 ' + k.licTotal + ' 项，待办 ' + k.licDue + ' 项' + (l0 ? '：' + l0.name + ' ' + l0.stateName + '（' + l0.issuer + '）' : '') + '。',
          blocks: [tableB(['证照', '发证机关', '到期'], R.licenses.map(function (l) { return [cut(l.name, 12), cut(l.issuer, 10), l.expiry ? short(l.expiry) : '长期']; }))],
          ref: l0 ? l0.id : null, act: l0 ? { type: 'open', panel: 'license', ref: l0.id } : null };
      }
      if (has(q, ['知产', '商标', '专利', '覆盖'])) return { text: '知产 ' + k.ipAssets + ' 项，待续展 / 缴费 ' + k.ipUrgent + ' 项；商标布局覆盖 ' + k.coverage + '%，缺口 ' + k.ipGaps + ' 类（核心类 ' + I.counts.coreGaps + '）。',
        act: { type: 'goto', step: 'ip' } };
    }

    if (step === 'contracts') {
      var C = curContract(R);
      if (has(q, ['缺', '必备条款', '少了'])) {
        var ms = missingOf(C);
        return { text: ms.length ? C.id + ' 缺 ' + ms.length + ' 项必备条款：' + ms.map(function (x) { return '「' + x.clauseTitle + '」' + SEV_LABEL[x.severity] + '风险'; }).join('、') + '。采纳后按模板新增，风险分随之重算。'
          : C.id + ' 必备条款齐全，剩下 ' + C.findings.length + ' 处是条款内容的风险项。',
          blocks: ms.length ? [tableB(['条款', '等级', '处理'], ms.map(function (x) { return [x.clauseTitle, SEV_LABEL[x.severity], x.fix ? '新增' : '人工核对']; }))] : null,
          ref: C.id };
      }
      if (has(q, ['为什么', '凭什么', '依据', '判高', '判'])) {
        var Wt = lib.contractRules.weights, L = lib.contractRules.levels;
        return { text: C.id + ' 风险分 ' + C.score + '：满分 100，高风险每处扣 ' + Wt.high + '、中风险 ' + Wt.mid + '、低风险 ' + Wt.low + '；本份高 ' + C.review.counts.high + ' 中 ' + C.review.counts.mid + ' 低 ' + C.review.counts.low + '，扣 ' + (100 - C.score) + ' 分。低于 ' + L.mid + ' 判高风险。\n首要一处：' + C.findings[0].clauseTitle + '——' + soft(C.findings[0].issue) + '。依据：' + cut(soft(C.findings[0].basis), 46) + '。',
          blocks: [tableB(['等级', '处数', '扣分'], [['高', C.review.counts.high, C.review.counts.high * Wt.high], ['中', C.review.counts.mid, C.review.counts.mid * Wt.mid], ['低', C.review.counts.low, C.review.counts.low * Wt.low]])],
          ref: C.id };
      }
      if (has(q, ['采纳', '改过来', '按建议', '修订'])) {
        var hiAll = R.contracts.reduce(function (t, c) { return t + c.review.counts.high; }, 0);
        if (has(q, ['全部', '所有', '高风险'])) {
          if (!hiAll) return { text: '当前没有待采纳的高风险修订，已采纳 ' + k.revised + ' 处。' };
          return { text: '采纳全部高风险修订 ' + hiAll + ' 处：按条款模板新增或改写，' + R.contracts.filter(function (c) { return c.review.counts.high; }).map(function (c) { return c.id; }).join('、') + ' 的风险分一起重算。',
            act: { type: 'apply', action: 'applyAllHigh', input: {} } };
        }
        var f0 = C.findings.filter(function (x) { return x.fix; })[0];
        if (!f0) return { text: C.id + ' 没有可直接采纳的修订，剩下的要人工核对原件。' };
        return { text: C.id + ' ' + (f0.fix.mode === 'insert' ? '新增' : '修订') + '「' + f0.fix.title + '」：' + cut(f0.fix.text, 52) + '。采纳后风险分重算。',
          ref: C.id, act: { type: 'apply', action: 'applyFix', input: { contractId: C.id, findingId: f0.id } } };
      }
      if (has(q, ['账期', '90 天', '付款', '回款'])) {
        var long = [];
        R.contracts.forEach(function (c) { c.findings.forEach(function (f) { if (f.id === 'C01') long.push([c.id, cut(c.party, 10), f.issue.replace(/[^0-9]*(\d+).*/, '$1') + ' 天']); }); });
        return { text: long.length ? '账期超过 90 天的有 ' + long.length + ' 份：' + long.map(function (x) { return x[0] + '（' + x[2] + '）'; }).join('、') + '，我方为供方时资金占用与坏账风险高。' : '没有账期超过 90 天的销售合同。',
          blocks: long.length ? [tableB(['合同', '相对方', '账期'], long)] : null };
      }
      if (has(q, ['金额', '多少钱', '合计'])) {
        var tot = R.contracts.reduce(function (t, c) { return t + (c.amount || 0); }, 0);
        return { text: '在册合同金额合计 ' + fmtW(tot) + '，其中高风险 ' + fmtW(R.contracts.filter(function (c) { return c.level === 'high'; }).reduce(function (t, c) { return t + (c.amount || 0); }, 0)) + '。',
          blocks: [tableB(['合同', '金额', '等级'], R.contracts.slice().sort(function (a, b) { return (b.amount || 0) - (a.amount || 0); }).slice(0, 4).map(function (c) { return [c.id, c.amount ? fmtW(c.amount) : '—', LV_NAME[c.level]]; }))] };
      }
      if (has(q, ['意见', '发给', '微信'])) {
        var raw0 = d.contracts.filter(function (x) { return x.id === C.id; })[0];
        return { text: softL(opinion(raw0, C.review, lib).lines.slice(0, 4)).join('\n'),
          ref: C.id, act: { type: 'open', panel: 'opinion', ref: C.id } };
      }
    }

    if (step === 'setup') {
      if (has(q, ['多少天', '为什么', '几天', '工期', '天数'])) {
        var lp = S.steps.filter(function (x) { return x.kind === 'license'; });
        return { text: '全程 ' + S.totalDays + ' 天：' + S.steps.length + ' 个节点，' + short(S.startDate) + ' 启动、' + short(S.endDate) + ' 完成' + (lp.length ? '；' + lp.map(function (x) { return x.title + ' ' + x.days + ' 天'; }).join('、') + '与登记并行办理' : '') + '。',
          blocks: [tableB(['节点', '天数'], S.steps.slice(0, 6).map(function (x) { return [x.order + '. ' + cut(x.title, 10), x.days + ' 天']; }))] };
      }
      if (has(q, ['51', '49', '改成', '换成', '60', '50 / 50'])) {
        var pk = PRESETS.filter(function (p) { return q.indexOf(String(p[0])) >= 0 && q.indexOf(String(p[1])) >= 0; })[0] || [51, 49];
        if (!S.equity) return { text: S.typeName + '不设股权，由总公司全资，' + S.typeDesc + '。' };
        var sp = d.setup.shares || [{ holder: d.company, pct: 100 }];
        var n2 = clone(sp);
        if (n2.length < 2) n2.push({ holder: '合作方', pct: 0 });
        n2[0].pct = pk[0]; n2[1].pct = pk[1];
        for (i = 2; i < n2.length; i++) n2[i].pct = 0;
        var eq2 = equity(n2, lib);
        return { text: '改成 ' + pk[0] + ' / ' + pk[1] + '：落在' + eq2.control + (eq2.deadlock ? '，两方各半形成僵局' : '') + '；' + eq2.lines.map(function (l) { return l.label + (l.met ? ' 达到' : ' 未达'); }).join('、') + '。已按这个比例重算。',
          act: { type: 'set', path: 'setup.shares', value: pk } };
      }
      if (has(q, ['控股', '控制', '够吗', '股权'])) {
        if (!S.equity) return { text: S.typeName + '不设股权，由总公司全资，' + S.typeDesc + '。' };
        return { text: '股权 ' + S.equity.holders.map(function (x) { return cut(x.holder, 10) + ' ' + x.pct + '%'; }).join(' / ') + '：控股股东 ' + r0(S.equity.top * 100) + '%，落在' + S.equity.control + '。' + S.equity.lines.map(function (l) { return l.label + ' ' + l.pct + '% ' + (l.met ? '达到' : '未达'); }).join('；') + '。',
          blocks: [tableB(['控制线', '门槛', '判断'], S.equity.lines.map(function (l) { return [l.label.replace(/线.*/, '线'), l.pct + '%', l.met ? '达到' : '未达']; }))],
          ref: 'EQ-' + S.equity.lines[0].key };
      }
      if (has(q, ['多少钱', '费用', '花'])) return { text: '预计费用 ' + fmtN(S.fees.total) + ' 元：刻章 ' + fmtN(S.fees.seal) + ' 元、代办 ' + fmtN(S.fees.agency) + ' 元。' + S.fees.note + '。' };
      if (has(q, ['材料', '要交什么', '清单'])) return { text: '材料合计 ' + S.materials.length + ' 项，按节点分摊。',
        blocks: [tableB(['节点', '材料'], S.materials.slice(0, 6).map(function (x) { return [cut(x.step, 10), cut(x.item, 14)]; }))] };
      if (has(q, ['许可', '排污', '经营范围'])) return { text: (S.licenses || []).length ? '涉及许可 ' + S.licenses.join('、') + '，约 ' + S.licenses.map(function (n) { return (lib.setupRules.licenses[n] || {}).days; }).join(' / ') + ' 天，与登记并行；取得许可前不得开展相应业务。' : '当前方案不涉及前置或后置许可。' };
      if (has(q, ['确认', '进台账'])) return { text: S.confirmed ? '方案已确认，' + S.steps.length + ' 个节点已进 90 天台账。' : '确认后 ' + S.steps.length + ' 个节点按日期进 90 天台账。',
        act: S.confirmed ? null : { type: 'apply', action: 'confirmSetup', input: {} } };
    }

    if (step === 'ip') {
      if (has(q, ['加入清单', '加进清单', '都加', '一起加'])) {
        var pend = urgentIp(R).filter(function (a) { return !a.listed && a.action; });
        if (!pend.length) return { text: '待续展 / 缴费的都已在清单里，预计 ' + fmtN(I.renewFee) + ' 元。' };
        return { text: '把 ' + pend.length + ' 项加入清单：' + pend.map(function (a) { return ipT(a); }).join('、') + '，预计合计 ' + fmtN(pend.reduce(function (t, a) { return t + a.fee; }, 0)) + ' 元。',
          act: { type: 'apply', action: 'toggleRenew', input: { ids: pend.map(function (a) { return a.id; }) } } };
      }
      if (has(q, ['快到期', '到期', '几项', '续展', '年费'])) {
        var us = urgentIp(R);
        return { text: us.length ? '60 天内 ' + us.length + ' 项：' + us.map(function (a) { return ipT(a) + ' ' + a.dueLabel + ' ' + a.daysLeft + ' 天'; }).join('；') + '，预计合计 ' + fmtN(us.reduce(function (t, a) { return t + a.fee; }, 0)) + ' 元。' : '60 天内没有需要续展或缴费的资产。',
          blocks: [tableB(['资产', '事项', '剩余', '预计'], us.map(function (a) { return [cut(ipT(a), 12), a.dueLabel, a.daysLeft + ' 天', fmtN(a.fee)]; }))],
          ref: us.length ? us[0].id : null };
      }
      if (has(q, ['缺口', '为什么要补', '补哪几类', '布局'])) {
        var cg = coreGap(R);
        return { text: '应覆盖 ' + (I.covered.length + I.gaps.length) + ' 类，已覆盖 ' + I.covered.length + ' 类（' + I.coverage + '%），缺 ' + I.gaps.length + ' 类，核心类 ' + I.counts.coreGaps + ' 类。' + (cg ? '第 ' + cg.cls + ' 类' + cg.name + '：' + cg.reason + '。' : ''),
          blocks: [tableB(['类别', '核心 / 延伸', '预计'], I.gaps.map(function (x) { return ['第 ' + x.cls + ' 类 ' + x.name, x.tier === 'core' ? '核心' : '延伸', fmtN(x.fee)]; }))],
          ref: cg ? 'CLS-' + cg.cls : null };
      }
      if (has(q, ['近似', '异议', '侵权', '线索', '怎么办'])) {
        if (!I.similar.length && !I.leads.length) return { text: '当前无近似商标与侵权线索。' };
        return { text: I.similar.map(function (s) { return '「' + s.name + '」第 ' + s.classes.join('、') + ' 类（' + s.holder + '，相似 ' + r0(s.similarity * 100) + '%）' + s.status + (s.deadline ? '，' + s.deadline + ' 前' + s.action + '，还有 ' + s.daysLeft + ' 天' : '，' + s.action); }).join('；') + (I.leads.length ? '。侵权线索 ' + I.leads.length + ' 条：' + I.leads.map(function (l) { return l.where + ' ' + l.action; }).join('；') : '') + '。',
          blocks: [tagsB(I.leads.map(function (l) { return cut(l.where + ' · ' + l.note, 20); }))] };
      }
      if (has(q, ['多少钱', '费用', '合计', '预计'])) return { text: '续展 / 缴费清单 ' + I.renewCount + ' 项预计 ' + fmtN(I.renewFee) + ' 元，商标申请清单 ' + I.applyCount + ' 类预计 ' + fmtN(I.applyFee) + ' 元，合计 ' + fmtN(I.renewFee + I.applyFee) + ' 元（官费加预计代理费）。' };
    }

    if (step === 'register') {
      if (has(q, ['逾期', '过期', '超了'])) return { text: reg.counts.overdue ? '逾期 ' + reg.counts.overdue + ' 项：' + reg.overdue.map(function (it) { return it.title + '（' + it.kindName + '，' + (-it.daysLeft) + ' 天）'; }).join('；') + '。' : '当前没有逾期事项，30 天内 ' + reg.counts.due30 + ' 项。',
        ref: reg.counts.overdue ? reg.overdue[0].ref : null,
        act: reg.counts.overdue ? jumpAct(reg.overdue[0]) : null };
      if (has(q, ['只看', '筛', '过滤'])) {
        var key = q.indexOf('证照') >= 0 ? 'license' : q.indexOf('知产') >= 0 || q.indexOf('商标') >= 0 || q.indexOf('专利') >= 0 ? 'ip' : q.indexOf('设立') >= 0 ? 'setup' : q.indexOf('合同') >= 0 ? 'contract' : null;
        if (key) return { text: '只看' + KIND_NAME[key] + '：' + kindCount(R, key) + ' 项。', act: { type: 'set', path: 'regKind', value: key } };
      }
      if (has(q, ['哪一周', '哪周', '事多', '密集', '集中'])) {
        var top = reg.weeks.slice().sort(function (a, b) { return b.items.length - a.items.length; })[0];
        return { text: '第 ' + (top.w + 1) + ' 周（' + top.start + ' 起）事项 ' + top.items.length + ' 项：' + top.items.slice(0, 3).map(function (it) { return short(it.date) + ' ' + cut(it.title, 14); }).join('；') + '。',
          blocks: [tableB(['日期', '事项', '类型'], top.items.slice(0, 5).map(function (it) { return [it.label, cut(it.title, 14), it.kindName]; }))] };
      }
      if (has(q, ['月报', '报告', '写了什么', '发给'])) return { text: softL(R.report.lines.slice(1, 4)).join('\n'),
        blocks: [tagsB(R.report.todo.slice(0, 3).map(function (t) { return cut(soft(t), 20); }))] };
      if (has(q, ['30 天', '近期', '要办'])) return { text: '30 天内 ' + reg.counts.due30 + ' 项：合同与节点 ' + reg.counts.contract + '、证照 ' + reg.counts.license + '、知产 ' + reg.counts.ip + (reg.counts.setup ? '、设立 ' + reg.counts.setup : '') + '。',
        blocks: [tableB(['日期', '事项', '剩余'], reg.due30.slice(0, 6).map(function (it) { return [it.label, cut(it.title, 14), it.daysLeft + ' 天']; }))] };
    }
    return null;
  }

  /* ---------------- 文档摄入 ----------------
     Word / PDF / 文本里读到合同金额 → 拆条款、按类型核必备条款、算风险分，写进合同台账；
     Excel 按合同台账要的列核对；PPT 看有没有法务口径；邮件对上我方为买方的合同。 */
  var CTYPE = [[/采购/, 'purchase', 'buy'], [/设备/, 'equipment', 'buy'], [/销售|供货|订货/, 'sale', 'supply'], [/借款|贷款/, 'loan', 'borrower'],
    [/租赁/, 'lease', 'lessee'], [/加工|承揽/, 'processing', 'orderer'], [/保密|NDA/i, 'nda', 'disclosing'], [/劳动/, 'labor', 'employer'],
    [/代理/, 'agency', 'principal'], [/软件/, 'software', 'client'], [/服务/, 'service', 'client'], [/框架/, 'framework', 'buy']];
  var CLAUSE_MAP = [
    [/质量标准|技术协议|封样|质量要求/, 'quality', '质量标准'],
    [/质保|保修|warranty/i, 'warranty', '质保期'],
    [/验收|异议期/, 'acceptance', '验收与异议期'],
    [/交付|交货|delivery|发货/i, 'delivery', '交付期限'],
    [/违约|penalty|赔偿责任/i, 'liability', '违约责任'],
    [/合同金额|价款|付款|支付|amount|payment/i, 'payment', '合同金额与付款'],
    [/争议|管辖|仲裁|诉讼/, 'dispute', '争议解决'],
    [/保密/, 'confidentiality', '保密'],
    [/知识产权|图纸|著作权|专利权/, 'ip', '知识产权归属'],
    [/不可抗力/, 'force', '不可抗力'],
    [/标的|品名|规格型号/, 'subject', '标的']
  ];
  function docLabel(kind) { return DOC_LABEL[kind] || '文件'; }
  function num0(s) { var v = parseFloat(String(s == null ? '' : s).replace(/[,，\s元%]/g, '')); return isNaN(v) ? null : v; }
  function lines0(doc) {
    var ls = (doc.paragraphs && doc.paragraphs.length ? doc.paragraphs : String(doc.text || '').split(/[\n\r]+/));
    return ls.map(function (x) { return String(x).replace(/\s+/g, ' ').trim(); }).filter(function (x) { return x.length > 1; });
  }
  function ingestContract(doc, R, lib) {
    var txt = String(doc.text || '').replace(/\s+/g, ' '), ls = lines0(doc), CR = lib.contractRules, d0 = R.data, i;
    var mAmt = txt.match(/(?:合同金额|金额|价款|总价)[^0-9]{0,8}([\d][\d,，.]*)\s*元/) || txt.match(/(?:CNY|RMB|人民币)\s*([\d][\d,.]*)/i) || txt.match(/Amount[^0-9]{0,10}([\d][\d,.]*)/i);
    var total = mAmt ? num0(mAmt[1]) : null;
    if (!total) return null;
    var mTax = txt.match(/含税\s*(\d{1,2})\s*%/) || txt.match(/Tax\s*(\d{1,2})\s*%/i);
    var mDue = txt.match(/(?:交付|交货|delivery)[^0-9]{0,12}(20\d{2})\s*[年\-\.]\s*(\d{1,2})\s*[月\-\.]\s*(\d{1,2})/i);
    var due = mDue ? mDue[1] + '-' + pad2(mDue[2]) + '-' + pad2(mDue[3]) : null;
    var mCap = txt.match(/(?:累计)?不超过[^0-9]{0,10}(\d{1,3}(?:\.\d+)?)\s*%/) || txt.match(/cap\s*(\d{1,3}(?:\.\d+)?)\s*%/i);
    var capPct = mCap ? parseFloat(mCap[1]) : null;
    var mWar = txt.match(/质保期?\s*(\d{1,2})\s*个?月/) || txt.match(/保修\s*(\d{1,2})\s*个?月/) || txt.match(/warranty[^0-9]{0,8}(\d{1,2})/i);
    var warMonths = mWar ? +mWar[1] : null;
    /* 付款表：期次 / 比例 / 金额 */
    var payTbl = null, adv = null;
    (doc.tables || []).forEach(function (t) { if (!payTbl && t.length > 1 && String(t[0].join('')).match(/比例|金额|期次|款/)) payTbl = t; });
    if (payTbl) { var r1 = payTbl[1] || [], pc = r1.filter(function (x) { return /%/.test(String(x)); })[0]; if (pc) adv = num0(pc) / 100; }
    if (adv == null) { var mAdv = txt.match(/(?:首付|预付)[^0-9]{0,6}(\d{1,3})\s*%/); if (mAdv) adv = +mAdv[1] / 100; }
    /* 条款拆解 */
    var seen = {}, clauses = [];
    ls.forEach(function (ln) {
      if (clauses.length >= 12 || /^(甲方|乙方|双方|供方|需方|出租方|承租方|From|To)[：:\s]/.test(ln)) return;
      var hit = null;
      CLAUSE_MAP.forEach(function (mp) { if (!hit && mp[0].test(ln) && !seen[mp[1]]) hit = mp; });
      if (!hit) return;
      seen[hit[1]] = 1;
      var params = {};
      if (hit[1] === 'payment') { params.termDays = 0; params.advanceRatio = adv == null ? 0 : adv; }
      if (hit[1] === 'delivery') params.latePenalty = /违约|penalty|逾期/i.test(txt);
      if (hit[1] === 'liability') params.capMultiple = capPct == null ? null : capPct / 100;
      if (hit[1] === 'warranty') params.months = warMonths == null ? 12 : warMonths;
      if (hit[1] === 'acceptance') params.objectionDays = 15;
      if (hit[1] === 'quality') params.standard = '文档约定';
      if (hit[1] === 'dispute') params.venue = /乙方所在地|对方所在地/.test(ln) ? 'counterparty' : 'ours';
      clauses.push({ no: String(clauses.length + 1), type: hit[1], title: hit[2], text: cut(ln, 96), params: params });
    });
    if (!clauses.length) return null;
    /* 抬头与相对方 */
    var title = ls[0] && ls[0].length <= 24 ? ls[0] : '导入合同';
    var mParty = txt.match(/乙方[：:]\s*([^\s　，,；;甲]+)/) || txt.match(/供方[：:]\s*([^\s　，,；;]+)/);
    var party = mParty ? mParty[1].replace(/(股份)?有限(责任)?公司$/, '').replace(/公司$/, '') : '文档相对方';
    var tp = 'purchase', role = 'buy';
    for (i = 0; i < CTYPE.length; i++) { if (CTYPE[i][0].test(title) || CTYPE[i][0].test(txt.slice(0, 90))) { tp = CTYPE[i][1]; role = CTYPE[i][2]; break; } }
    var end = due || dateOf(d0.today, 365);
    var seq = d0.contracts.filter(function (c) { return String(c.id).indexOf('HT-DOC-') === 0; }).length + 1;
    var id = 'HT-DOC-' + pad2(seq);
    var cObj = { id: id, type: tp, role: role, title: title, party: party, amount: r0(total), signed: d0.today, start: d0.today, end: end,
      status: '审查中', milestones: due ? [{ date: due, text: '交付期限' }] : [], clauses: clauses, revisions: [] };
    var rv = reviewContract(cObj, lib);
    var miss = rv.findings.filter(function (f) { return f.kind === 'missing'; });
    var L = docLabel(doc.kind);
    var lines = [L + '《' + doc.name + '》读完：' + title + '，相对方 ' + party + '，金额 ' + fmtN(total) + ' 元' + (mTax ? '（含税 ' + mTax[1] + '%）' : '') + (due ? '，交付 ' + due : '') + (capPct != null ? '，违约金上限 ' + capPct + '%' : '') + (warMonths ? '，质保 ' + warMonths + ' 个月' : '') + '。'];
    lines.push('按' + (CR.types[tp] || tp) + '必备条款逐项核对：文档里读到 ' + clauses.length + ' 条（' + clauses.map(function (c) { return c.title; }).join('、') + '）' + (miss.length ? '，缺 ' + miss.length + ' 项：' + miss.map(function (x) { return '「' + x.clauseTitle + '」'; }).join('') : '，必备条款齐全') + '。');
    lines.push('风险分 ' + rv.score + '（' + LV_NAME[rv.level] + '）：高 ' + rv.counts.high + ' 中 ' + rv.counts.mid + ' 低 ' + rv.counts.low + '。已进合同台账 ' + id + '，' + (due ? '交付期限 ' + due + ' 一并进 90 天台账。' : '到期日按一年计。'));
    var kvl = [['金额', fmtN(total) + ' 元']];
    if (mTax) kvl.push(['税率', mTax[1] + '%']);
    if (due) kvl.push(['交付期限', due]);
    if (adv != null) kvl.push(['首期比例', r0(adv * 100) + '%']);
    if (capPct != null) kvl.push(['违约金上限', capPct + '%']);
    kvl.push(['风险分', rv.score + ' · ' + LV_NAME[rv.level]]);
    var blocks = [kvB(kvl)];
    if (payTbl) blocks.push(tableB(payTbl[0].slice(0, 3), payTbl.slice(1, 4).map(function (r) { return r.slice(0, 3); })));
    if (miss.length) blocks.push(tagsB(miss.map(function (x) { return '缺 ' + x.clauseTitle; })));
    var d2 = ensure(d0);
    d2.contracts.push(clone(cObj));
    d2.log.push({ seq: d2.log.length + 1, kind: 'contract', label: '文档进台账', detail: id + ' ' + title + '，' + fmtN(total) + ' 元，风险分 ' + rv.score + '，缺 ' + miss.length + ' 项必备条款' });
    return { text: lines.join('\n'), blocks: blocks, ref: id, data: d2, act: { type: 'apply', action: 'ingest', input: { doc: doc } } };
  }
  function ingestSheet(doc, R) {
    var s0 = (doc.sheets || [])[0];
    if (!s0 || !s0.rows.length) return null;
    var head = (s0.rows[0] || []).map(function (x) { return String(x).trim(); });
    var body = s0.rows.slice(1).filter(function (r) { return String(r[0] || '').trim(); });
    var iId = -1, iParty = -1;
    head.forEach(function (x, i) {
      if (iId < 0 && /合同编号|合同号|编号/.test(x)) iId = i;
      if (iParty < 0 && /相对方|对方|客户|供应商|乙方/.test(x)) iParty = i;
    });
    if (iId >= 0 && iParty >= 0) {
      return { text: 'Excel《' + doc.name + '》读完：' + doc.sheets.length + ' 张表、' + body.length + ' 行合同，表头 ' + head.slice(0, 6).join(' / ') + '。\n台账里已有 ' + R.contracts.length + ' 份，导入的 ' + body.length + ' 行按合同编号比对后并入。',
        blocks: [tableB(head.slice(0, 4), body.slice(0, 4).map(function (r) { return r.slice(0, 4); }))],
        act: { type: 'set', path: 'filter', value: null } };
    }
    return { text: 'Excel《' + doc.name + '》读完：' + doc.sheets.length + ' 张表、' + body.length + ' 行，表头 ' + head.slice(0, 6).join(' / ') + '。\n这张表没有合同编号与相对方两列，进不了合同台账；合同台账要的列是 合同编号 / 相对方 / 类型 / 金额 / 起止日期 / 状态。' + (/科目/.test(head.join('')) ? '\n表头是科目口径，属于账务数据，法务这边不动。' : ''),
      blocks: [tableB(head.slice(0, 4), body.slice(0, 4).map(function (r) { return r.slice(0, 4); }))] };
  }
  function ingestSlides(doc, R) {
    var titles = (doc.slides || []).map(function (s) { return s.title || ''; }).filter(Boolean);
    var txt = String(doc.text || '').replace(/\s+/g, ' ');
    var hits = [];
    [[/合同/, '合同'], [/商标/, '商标'], [/专利/, '专利'], [/许可|资质|证照/, '证照'], [/子公司|分公司|设立/, '设立'], [/诉讼|仲裁|纠纷/, '争议']].forEach(function (x) { if (x[0].test(txt)) hits.push(x[1]); });
    var dates = (txt.match(/20\d{2}\s*[年\-]\s*\d{1,2}\s*[月\-]?\s*\d{0,2}/g) || []).slice(0, 3);
    var lines = ['PPT《' + doc.name + '》读完：' + doc.slides.length + ' 页，首页「' + (titles[0] || '—') + '」' + (titles[1] ? '，第 2 页「' + titles[1] + '」' : '') + '。'];
    lines.push(hits.length ? '正文里出现法务口径：' + hits.join('、') + '，可以对上台账核；' : '正文没有合同、知产、证照、设立这几类法务口径，台账不动；');
    lines.push('台账现状：合同 ' + R.kpi.contracts + ' 份（高风险 ' + R.kpi.highRisk + '）、证照 ' + R.kpi.licTotal + ' 项、知产 ' + R.kpi.ipAssets + ' 项' + (dates.length ? '；文档提到的日期 ' + dates.join('、') : '') + '。');
    return { text: lines.join('\n'), blocks: [tagsB(titles.slice(0, 4))],
      act: { type: 'open', panel: 'doc', ref: doc.name, title: doc.name, sub: 'PPT · ' + doc.slides.length + ' 页 · ' + doc.sizeText,
        blocks: [textB((doc.slides || []).map(function (s) { return '第 ' + s.no + ' 页 ' + (s.title || '') + '\n' + s.lines.join('\n'); }).join('\n\n'))] } };
  }
  function ingestMail(doc, R) {
    var ml = doc.mail || {}, txt = String(doc.text || '').replace(/\s+/g, ' ');
    var wan = (txt.match(/([\d][\d,.]*)\s*万元/g) || []);
    var buys = R.contracts.filter(function (c) { return c.role === 'buy' || c.roleName.indexOf('买方') >= 0 || c.roleName.indexOf('定作') >= 0; });
    var tot = buys.reduce(function (t, c) { return t + (c.amount || 0); }, 0);
    var lines = ['邮件《' + (ml.subject || doc.name) + '》读完：发件 ' + (ml.from || '—') + '，' + (ml.date || '') + (wan.length ? '，正文金额 ' + wan.join('、') : '') + '。'];
    if (wan.length) lines.push('对上合同台账：我方为买方 / 定作方的合同 ' + buys.length + ' 份，金额合计 ' + fmtW(tot) + '，其中 30 天内有履约节点的 ' + R.register.due30.filter(function (it) { return it.kind === 'milestone'; }).length + ' 项。');
    else lines.push('正文没读到金额，合同台账不动。');
    lines.push('附件 ' + ((ml.attaches || []).length) + ' 个；' + (R.register.counts.overdue ? '台账里已有逾期 ' + R.register.counts.overdue + ' 项，先处理那一项。' : '台账里暂无逾期项。'));
    var pick = (buys[0] || R.contracts[0] || {}).id || null;
    return { text: lines.join('\n'),
      blocks: [kvB([['发件', ml.from || '—'], ['主题', cut(ml.subject || '—', 16)], ['日期', ml.date || '—']]),
        buys.length ? tableB(['合同', '相对方', '金额'], buys.slice(0, 4).map(function (c) { return [c.id, cut(c.party, 10), c.amount ? fmtW(c.amount) : '—']; })) : null],
      ref: pick, act: pick ? { type: 'open', panel: 'contract', ref: pick } : null };
  }
  function ingest(doc, step, data, lib, result) {
    if (!doc || !doc.ok) return null;
    var R = ctxOf(data, lib, result);
    if (doc.kind === 'excel') return ingestSheet(doc, R);
    if (doc.kind === 'ppt') return ingestSlides(doc, R);
    if (doc.kind === 'eml') return ingestMail(doc, R);
    var c = ingestContract(doc, R, lib);
    if (c) return c;
    var ls = lines0(doc);
    return { text: docLabel(doc.kind) + '《' + doc.name + '》读完：' + ls.length + ' 段。没读到合同金额，进不了审查；审查要的是金额、交付期限、付款方式、违约责任这几项。\n开头：' + cut(ls[0] || '—', 40),
      blocks: [tagsB(ls.slice(0, 4).map(function (x) { return cut(x, 16); }))] };
  }

  return {
    VERSION: VERSION, MODULE_NAME: MODULE_NAME, CREDITS: CREDITS, SEV_LABEL: SEV_LABEL,
    ensure: ensure, run: run, reviewContract: reviewContract, reviewAll: reviewAll, applyFix: applyFix, applyAllHigh: applyAllHigh, opinion: opinion,
    equity: equity, setupPlan: setupPlan, updateSetup: updateSetup, confirmSetup: confirmSetup,
    ipReview: ipReview, toggleRenew: toggleRenew, toggleApply: toggleApply, licenses: licenses, register: register,
    screens: screens, brief: brief, suggest: suggest, ask: ask, ingest: ingest,
    LV_NAME: LV_NAME,
    fmtN: fmtN, fmtW: fmtW, short: short, days: days, dateOf: dateOf, weekday: weekday, evalExpr: evalExpr
  };
});
