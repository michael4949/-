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

  var VERSION = '1.1.0';
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

  return {
    VERSION: VERSION, MODULE_NAME: MODULE_NAME, CREDITS: CREDITS, SEV_LABEL: SEV_LABEL,
    ensure: ensure, run: run, reviewContract: reviewContract, reviewAll: reviewAll, applyFix: applyFix, opinion: opinion,
    equity: equity, setupPlan: setupPlan, updateSetup: updateSetup, confirmSetup: confirmSetup,
    ipReview: ipReview, toggleRenew: toggleRenew, toggleApply: toggleApply, licenses: licenses, register: register,
    fmtN: fmtN, fmtW: fmtW, short: short, days: days, dateOf: dateOf, weekday: weekday, evalExpr: evalExpr
  };
});
