/*
 * AI决策 · 内核
 * 输入：一家企业 12 个月的经营指标序列（从 AI CFO / AI ERP / AI获客 / AI人力官 / AI法务 取数）、预算、证据事实、决议台账 + 指标树 / 证据库 / 方案库 / 会签规则
 * 计算：指标树（公式逐月算出，与预算或上期比给红黄绿）→ 连环替代法归因（因子贡献之和等于变动，证据卡指回模块）
 *       → 方案预演（参数作用在驱动节点上，12 个月走势与净效益，按风险系数推荐）→ 会签意见与终批（决议编号、执行节点、跟踪目标）→ 执行与复盘 → KPI 与月报
 * 发起审批、批准 / 驳回、节点更新都写进同一份数据副本，各屏按副本重算。确定性、离线、无网络。UMD：Node 与浏览器共用。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.DGG = root.DGG || {}; root.DGG.coreM9 = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VERSION = '1.1.0';
  var MODULE_NAME = 'AI决策';
  var CREDITS = 100;
  var DAY = 86400000;
  var BASIS_NAME = { prev: '较上期', avg3: '较前三月均值' };
  var OPINION_NAME = { agree: '同意', cond: '有条件同意', object: '反对' };
  var STATUS_NAME = { ok: '正常', watch: '关注', risk: '风险' };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function r0(n) { return Math.round(n); }
  function r1(n) { return Math.round(n * 10) / 10; }
  function sum(a) { return a.reduce(function (t, x) { return t + x; }, 0); }
  function avg(a) { return a.length ? sum(a) / a.length : 0; }
  function fmtN(n) { return (n < 0 ? '−' : '') + String(Math.abs(Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function fmtW(n) { return Math.abs(n) >= 10000 ? (n < 0 ? '−' : '') + (Math.round(Math.abs(n) / 1000) / 10) + ' 万元' : fmtN(n) + ' 元'; }
  function fmtSigned(n, f) { return (n > 0 ? '+' : n < 0 ? '−' : '') + f(Math.abs(n)); }
  function ms(s) { var p = s.split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2]); }
  function dateOf(base, d) { var t = new Date(ms(base) + d * DAY); return t.getUTCFullYear() + '-' + String(t.getUTCMonth() + 1).padStart(2, '0') + '-' + String(t.getUTCDate()).padStart(2, '0'); }
  function addMonths(ym, n) { var p = ym.split('-'); var mm = +p[1] - 1 + n; var yy = +p[0] + Math.floor(mm / 12); mm = ((mm % 12) + 12) % 12; return yy + '-' + String(mm + 1).padStart(2, '0'); }
  function short(s) { var p = s.split('-'); return p.length > 2 ? (+p[1]) + '-' + (+p[2]) : (+p[1]) + '月'; }
  function days(a, b) { return Math.round((ms(b) - ms(a)) / DAY); }
  function fill(t, ctx) { return String(t).replace(/\{(\w+)\}/g, function (_, k) { return ctx[k] != null ? ctx[k] : ''; }); }
  function evalExpr(expr, env) {
    var src = String(expr).replace(/\b(p|f)\.(\w+)/g, '$1_$2');
    var t = src.match(/\d+\.?\d*|[A-Za-z_][A-Za-z0-9_]*|'[^']*'|&&|\|\||<=|>=|==|!=|[-+*/()<>!]/g) || [];
    var i = 0;
    function peek() { return t[i]; } function next() { return t[i++]; }
    function primary() { var x = next(); if (x === '(') { var v = or(); next(); return v; } if (x === '!') return !primary(); if (x === '-') return -primary(); if (/^\d/.test(x)) return parseFloat(x); if (/^'/.test(x)) return x.slice(1, -1); if (x === 'true') return true; if (x === 'false') return false; if (x === 'null') return null; return env[x] === undefined ? 0 : env[x]; }
    function mul() { var v = primary(); while (peek() === '*' || peek() === '/') { var op = next(), r = primary(); v = op === '*' ? v * r : v / r; } return v; }
    function add() { var v = mul(); while (peek() === '+' || peek() === '-') { var op = next(), r = mul(); v = op === '+' ? v + r : v - r; } return v; }
    function cmp() { var v = add(); while (['<', '>', '<=', '>=', '==', '!='].indexOf(peek()) >= 0) { var op = next(), r = add(); v = op === '<' ? v < r : op === '>' ? v > r : op === '<=' ? v <= r : op === '>=' ? v >= r : op === '==' ? v == r : v != r; } return v; }
    function and() { var v = cmp(); while (peek() === '&&') { next(); var r = cmp(); v = v && r; } return v; }
    function or() { var v = and(); while (peek() === '||') { next(); var r = and(); v = v || r; } return v; }
    return or();
  }
  function ensure(raw) { var d = clone(raw); d.approvals = d.approvals || []; d.decisions = d.decisions || []; d.log = d.log || []; d.decisions.forEach(function (x) { x.milestones = x.milestones || []; }); return d; }
  function nodeMap(lib) { var m = {}; lib.metricTree.nodes.forEach(function (n) { m[n.id] = n; }); return m; }
  function fmtVal(node, v) { if (v == null || isNaN(v)) return '—'; if (node.unit === '元') return fmtW(v); if (node.unit === '%') return (Math.round(v * 1000) / 10) + '%'; if (node.unit === '天') return r0(v) + ' 天'; return fmtN(v) + ' ' + node.unit; }
  function fmtDelta(node, v) { if (node.unit === '元') return fmtSigned(v, fmtW); if (node.unit === '%') return fmtSigned(v * 100, function (x) { return r1(x) + ' 个点'; }); if (node.unit === '天') return fmtSigned(v, function (x) { return r1(x) + ' 天'; }); return fmtSigned(v, function (x) { return r1(x) + ' ' + node.unit; }); }

  /* ---------------- 指标树 ---------------- */
  function computeValues(d, lib) {
    var N = nodeMap(lib), S = d.series, n = d.months.length, memo = {};
    function leafAt(node, i) { var c = node.calc; if (c.series) return S[c.series][i]; var env = {}; Object.keys(S).forEach(function (k) { env[k] = S[k][i]; }); return evalExpr(c.expr, env); }
    function val(id) {
      if (memo[id]) return memo[id];
      var node = N[id], out = [];
      for (var i = 0; i < n; i++) {
        var v;
        if (node.kind === 'leaf') v = leafAt(node, i);
        else if (node.kind === 'sum') { v = node.base || 0; node.children.forEach(function (c) { v += c.sign * val(c.id)[i]; }); }
        else { v = 1; node.children.forEach(function (c) { v *= val(c)[i]; }); }
        out.push(v);
      }
      memo[id] = out; return out;
    }
    lib.metricTree.nodes.forEach(function (x) { val(x.id); });
    return memo;
  }
  function budgetOf(d, id, i, V) {
    var B = d.budget || {};
    if (id === 'rev') return B.rev ? B.rev[i] : null;
    if (id === 'gm') return B.gm != null ? B.gm : null;
    if (id === 'opex') return B.opex != null ? B.opex : null;
    if (id === 'grossProfit') return B.rev && B.gm != null ? B.rev[i] * B.gm : null;
    if (id === 'profit') return B.rev && B.gm != null && B.opex != null ? B.rev[i] * B.gm - B.opex : null;
    if (B[id] != null) return typeof B[id] === 'number' ? B[id] : B[id][i];
    return null;
  }
  function statusOf(node, cur, ref) {
    if (ref == null) return 'ok';
    var bad = node.good === 'up' ? ref - cur : node.good === 'down' ? cur - ref : Math.abs(cur - ref);
    var tol = node.tolMode === 'pct' ? node.tol * Math.abs(ref) : node.tol;
    return bad <= tol ? 'ok' : bad <= 2 * tol ? 'watch' : 'risk';
  }
  function tree(d, lib) {
    var N = nodeMap(lib), V = computeValues(d, lib), last = d.months.length - 1, out = {};
    lib.metricTree.nodes.forEach(function (node) {
      var vals = V[node.id], cur = vals[last], prev = vals[last - 1], a3 = avg(vals.slice(last - 3, last)), bud = budgetOf(d, node.id, last, V);
      var refKind = bud != null ? 'budget' : 'prev', ref = bud != null ? bud : prev;
      out[node.id] = { id: node.id, name: node.name, unit: node.unit, kind: node.kind, group: node.group, source: node.source, sourceName: lib.metricTree.modules[node.source] || node.source, explain: node.explain, good: node.good, children: node.kind === 'sum' ? node.children.map(function (c) { return c.id; }) : node.kind === 'product' ? node.children : [], values: vals, cur: cur, prev: prev, avg3: a3, budget: bud, delta: cur - prev, deltaPct: prev ? (cur - prev) / Math.abs(prev) : 0, devBudget: bud != null ? cur - bud : null, status: statusOf(node, cur, ref), refKind: refKind, curText: fmtVal(node, cur), prevText: fmtVal(node, prev), budgetText: bud != null ? fmtVal(node, bud) : null, deltaText: fmtDelta(node, cur - prev), devBudgetText: bud != null ? fmtDelta(node, cur - bud) : null };
    });
    var groups = lib.metricTree.groups.map(function (g) { return { key: g.key, name: g.name, root: g.root, nodes: lib.metricTree.nodes.filter(function (n) { return n.group === g.key; }).map(function (n) { return out[n.id]; }) }; });
    var counts = { ok: 0, watch: 0, risk: 0 }; Object.keys(out).forEach(function (k) { counts[out[k].status]++; });
    return { nodes: out, groups: groups, counts: counts, period: d.period, months: d.months };
  }

  /* ---------------- 归因（连环替代法） ---------------- */
  function attribute(d, lib, metricId, basis) {
    var N = nodeMap(lib), V = computeValues(d, lib), last = d.months.length - 1; basis = basis || 'prev';
    var from = {}, to = {};
    // 基期：叶子取上期或前三月均值，复合节点按公式由叶子基期值重算，保证贡献之和等于变动
    Object.keys(V).forEach(function (k) { to[k] = V[k][last]; if (N[k].kind === 'leaf') from[k] = basis === 'avg3' ? avg(V[k].slice(last - 3, last)) : V[k][last - 1]; });
    function fromOf(id) { if (from[id] != null) return from[id]; var node = N[id], v; if (node.kind === 'sum') { v = node.base || 0; node.children.forEach(function (ch) { v += ch.sign * fromOf(ch.id); }); } else { v = 1; node.children.forEach(function (ch) { v *= fromOf(ch); }); } from[id] = v; return v; }
    Object.keys(V).forEach(function (k) { fromOf(k); });
    // 返回叶子贡献列表（以 id 节点的单位计），之和等于 to[id] − from[id]
    function decompose(id) {
      var node = N[id];
      if (node.kind === 'leaf') return [{ id: id, value: to[id] - from[id], path: [id] }];
      var out = [];
      if (node.kind === 'sum') {
        node.children.forEach(function (c) { decompose(c.id).forEach(function (x) { out.push({ id: x.id, value: c.sign * x.value, path: [id].concat(x.path) }); }); });
      } else {
        var ids = node.children, k = ids.length;
        ids.forEach(function (cid, j) {
          var term = 1; for (var q = 0; q < k; q++) term *= q < j ? to[ids[q]] : q === j ? (to[ids[q]] - from[ids[q]]) : from[ids[q]];
          var dc = to[cid] - from[cid], leaves = decompose(cid);
          leaves.forEach(function (x) { out.push({ id: x.id, value: dc ? term * (x.value / dc) : 0, path: [id].concat(x.path) }); });
        });
      }
      return out;
    }
    var leaves = decompose(metricId), node = N[metricId], delta = to[metricId] - from[metricId];
    var direct = {};
    leaves.forEach(function (x) { var c = x.path[1] || x.id; direct[c] = (direct[c] || 0) + x.value; });
    var good = node.good;
    var oneOff = (d.facts && d.facts.oneOff) || {};
    var items = leaves.map(function (x) {
      var ln = N[x.id], f0 = from[x.id], f1 = to[x.id];
      var hurt = good === 'up' ? x.value < 0 : good === 'down' ? x.value > 0 : false;
      // 一次性项：本期含一次性金额的叶子，按其在本指标里的方向剔除后再判主因
      var oo = oneOff[x.id] || 0, dfac = f1 - f0, adj = x.value - (dfac ? x.value * (oo / dfac) : 0);
      var hurtAdj = good === 'up' ? adj < 0 : good === 'down' ? adj > 0 : false;
      return { id: x.id, name: ln.name, unit: ln.unit, path: x.path, pathNames: x.path.map(function (p) { return N[p].name; }), value: x.value, valueText: fmtDelta(node, x.value), share: delta ? x.value / delta : 0, hurt: hurt, oneOff: oo, adjValue: adj, adjText: oo ? '剔除一次性 ' + fmtVal(ln, oo) + ' 后 ' + fmtDelta(node, adj) : null, hurtAdj: hurtAdj, factorFrom: f0, factorTo: f1, factorDelta: dfac, factorText: fmtVal(ln, f0) + ' → ' + fmtVal(ln, f1) + '（' + fmtDelta(ln, dfac) + '）', direction: dfac > 0 ? '+' : dfac < 0 ? '-' : '0', source: ln.source, sourceName: lib.metricTree.modules[ln.source] };
    });
    items.sort(function (a, b) { return Math.abs(b.value) - Math.abs(a.value); });
    var groups = Object.keys(direct).map(function (c) { return { id: c, name: N[c].name, value: direct[c], valueText: fmtDelta(node, direct[c]), share: delta ? direct[c] / delta : 0, hurt: good === 'up' ? direct[c] < 0 : direct[c] > 0, leaves: items.filter(function (x) { return (x.path[1] || x.id) === c; }) }; }).sort(function (a, b) { return Math.abs(b.value) - Math.abs(a.value); });
    var hurts = items.filter(function (x) { return x.hurtAdj && Math.abs(x.adjValue) > 1e-9; }).sort(function (a, b) { return Math.abs(b.adjValue) - Math.abs(a.adjValue); });
    var check = Math.abs(sum(items.map(function (x) { return x.value; })) - delta);
    var order = node.kind === 'product' ? node.children.map(function (c) { return N[c].name; }).join(' → ') : node.kind === 'sum' ? node.children.map(function (c) { return N[c.id].name; }).join('、') : '';
    return { metric: metricId, name: node.name, unit: node.unit, basis: basis, basisName: BASIS_NAME[basis], from: from[metricId], to: to[metricId], fromText: fmtVal(node, from[metricId]), toText: fmtVal(node, to[metricId]), delta: delta, deltaText: fmtDelta(node, delta), deltaPct: from[metricId] ? delta / Math.abs(from[metricId]) : 0, groups: groups, leaves: items, hurts: hurts, rootCause: hurts[0] || null, check: check, method: '连环替代法：按 ' + (order || node.name) + ' 的顺序逐个替换因子，各因子贡献之和等于 ' + node.name + ' 的变动' };
  }
  function evidence(d, lib, leafId, direction) {
    var N = nodeMap(lib), cards = lib.evidence.cards[leafId + (direction === '-' ? '-' : '+')] || lib.evidence.cards[leafId + '+'] || lib.evidence.cards['default'];
    return cards.map(function (c) { return { module: c.module, moduleName: lib.metricTree.modules[c.module] || c.module, screen: c.screen, title: fill(c.title, d.facts), detail: fill(c.detail, d.facts), ref: c.ref, factor: N[leafId] ? N[leafId].name : leafId }; });
  }

  /* ---------------- 方案预演 ---------------- */
  var DRIVERS = ['orders', 'avgOrder', 'materialRatio', 'laborRatio', 'overheadRatio', 'sellExp', 'adminExp', 'rdExp', 'finExp', 'dso', 'dio', 'dpo', 'onTimeRate', 'turnover', 'complianceExposure', 'highRiskContracts', 'headcount'];
  function baseline(d, lib) {
    var V = computeValues(d, lib), last = d.months.length - 1, b = {};
    DRIVERS.forEach(function (k) { b[k] = avg(V[k].slice(last - 2, last + 1)); });
    var labels = []; for (var i = 1; i <= 12; i++) labels.push(addMonths(d.period, i));
    return { drivers: b, labels: labels };
  }
  function derive(x) { var rev = x.orders * x.avgOrder, gm = 1 - x.materialRatio - x.laborRatio - x.overheadRatio, opex = x.sellExp + x.adminExp + x.rdExp + x.finExp; return { rev: rev, gm: gm, grossProfit: rev * gm, opex: opex, profit: rev * gm - opex, ccc: x.dso + x.dio - x.dpo, onTimeRate: Math.min(0.99, x.onTimeRate), turnover: x.turnover, complianceExposure: Math.max(0, x.complianceExposure), highRiskContracts: Math.max(0, x.highRiskContracts) }; }
  function playbookKey(lib, causeId) { if (lib.playbooks.causes[causeId]) return causeId; var parent = null; lib.metricTree.nodes.forEach(function (n) { var kids = n.kind === 'sum' ? n.children.map(function (c) { return c.id; }) : n.kind === 'product' ? n.children : []; if (kids.indexOf(causeId) >= 0) parent = n.id; }); return parent ? playbookKey(lib, parent) : null; }
  function options(d, lib, causeId) {
    var pk = playbookKey(lib, causeId), pb = pk ? lib.playbooks.causes[pk] : null; if (!pb) return { cause: causeId, causeName: (nodeMap(lib)[causeId] || {}).name, playbook: null, options: [] };
    var ctx = d.facts;
    return { cause: causeId, causeName: fill(pb.cause, ctx), playbook: pk, options: pb.options.map(function (o) { return Object.assign({}, o, { name: fill(o.name, ctx), desc: fill(o.desc, ctx), note: fill(o.note || '', ctx), params: o.params.map(function (x) { return Object.assign({}, x, { label: fill(x.label, ctx) }); }), milestones: o.milestones.map(function (m) { return Object.assign({}, m, { title: fill(m.title, ctx) }); }), defaults: (function () { var p = {}; o.params.forEach(function (x) { p[x.key] = x.default; }); return p; })() }); }) };
  }
  function simulate(d, lib, causeId, key, params) {
    var O = options(d, lib, causeId), opt = O.options.filter(function (o) { return o.key === key; })[0]; if (!opt) return null;
    var p = Object.assign({}, opt.defaults, params || {}), f = d.facts, B = baseline(d, lib);
    var env = {}; Object.keys(p).forEach(function (k) { env['p_' + k] = p[k]; }); Object.keys(f).forEach(function (k) { if (typeof f[k] === 'number') env['f_' + k] = f[k]; });
    var base = B.labels.map(function () { return derive(B.drivers); });
    var months = B.labels.map(function (label, m) {
      var x = clone(B.drivers), t = m + 1;
      opt.effects.forEach(function (e) {
        var ramp = e.ramp || 1, r = t < opt.leadMonths ? 0 : Math.min(1, (t - opt.leadMonths + 1) / ramp);
        var v = evalExpr(e.expr, env) * r;
        if (e.mode === 'pct') x[e.node] = B.drivers[e.node] * (1 + v) + (x[e.node] - B.drivers[e.node]);
        else x[e.node] = x[e.node] + v;
      });
      var one = 0; if (t === opt.leadMonths) one = opt.invest;
      var dv = derive(x); dv.label = label; dv.profitNet = dv.profit - one; dv.oneOff = one; return dv;
    });
    var profit12 = sum(months.map(function (m) { return m.profit; })), baseProfit12 = sum(base.map(function (m) { return m.profit; }));
    var rev12 = sum(months.map(function (m) { return m.rev; })), baseRev12 = sum(base.map(function (m) { return m.rev; }));
    var end = months[11], b0 = base[0];
    var profitDelta12 = profit12 - baseProfit12, wc = (b0.ccc - end.ccc) * (b0.rev / 30);
    var totals = { profit12: profit12, baseProfit12: baseProfit12, profitDelta12: profitDelta12, revDelta12: rev12 - baseRev12, gmEnd: end.gm, gmBase: b0.gm, cccEnd: end.ccc, cccBase: b0.ccc, onTimeEnd: end.onTimeRate, onTimeBase: b0.onTimeRate, complianceEnd: end.complianceExposure, invest: opt.invest, cashDelta12: profitDelta12 + wc - opt.invest, workingCapital: wc, netBenefit: profitDelta12 - opt.invest, orderEndPct: (months[11].rev / months[11].gm === 0 ? 0 : 0), riskFactor: lib.playbooks.riskFactor[opt.risk] };
    totals.orderEndPct = r1(100 * (B.drivers.orders ? ((function () { var x = clone(B.drivers); opt.effects.forEach(function (e) { if (e.node === 'orders') { var v = evalExpr(e.expr, env); x.orders = e.mode === 'pct' ? x.orders * (1 + v) : x.orders + v; } }); return x.orders; })() - B.drivers.orders) / B.drivers.orders : 0));
    totals.score = totals.netBenefit * totals.riskFactor;
    return { cause: causeId, causeName: O.causeName, option: opt, params: p, labels: B.labels, months: months, base: base, totals: totals, summary: '12 个月利润 ' + fmtSigned(profitDelta12, fmtW) + '，毛利率 ' + fmtVal({ unit: '%' }, b0.gm) + ' → ' + fmtVal({ unit: '%' }, end.gm) + '，现金 ' + fmtSigned(totals.cashDelta12, fmtW) + (opt.invest ? '，投入 ' + fmtW(opt.invest) : '') };
  }
  function simulateAll(d, lib, causeId, paramsByKey) {
    var O = options(d, lib, causeId), sims = O.options.map(function (o) { return simulate(d, lib, causeId, o.key, (paramsByKey || {})[o.key]); });
    var best = null; sims.forEach(function (s) { if (!best || s.totals.score > best.totals.score) best = s; });
    sims.forEach(function (s) { s.recommended = best && s.option.key === best.option.key; });
    return { cause: causeId, causeName: O.causeName, sims: sims, recommended: best ? best.option.key : null };
  }

  /* ---------------- 审批 ---------------- */
  function nextId(prefix, period, list) { var ym = period.slice(2, 4) + period.slice(5, 7); var n = list.filter(function (x) { return x.id.indexOf(prefix + '-' + ym + '-') === 0; }).length + 1; return prefix + '-' + ym + '-' + String(n).padStart(2, '0'); }
  function opinions(lib, sim, facts) {
    var T = sim.totals, p = sim.params, env = { netBenefit: T.netBenefit, invest: T.invest, cash: facts.cash || 0, cashDelta12: T.cashDelta12, onTimeEnd: r0(T.onTimeEnd * 100), orderEndPct: T.orderEndPct, pricePct: p.pricePct || 0 };
    sim.option.tags.forEach(function (t) { env['tag_' + t] = true; });
    var ctx = { netBenefit: fmtSigned(T.netBenefit, fmtW), invest: fmtW(T.invest), cashDelta12: fmtSigned(T.cashDelta12, fmtW), onTimeEnd: env.onTimeEnd, orderEndPct: T.orderEndPct, pricePct: env.pricePct };
    return lib.approvalRules.signers.map(function (s) {
      var hit = null; for (var i = 0; i < s.checks.length && !hit; i++) { var c = s.checks[i]; var ok = false; try { ok = c.when === 'true' ? true : !!evalExpr(c.when, env); } catch (e) { ok = false; } if (ok) hit = c; }
      return { role: s.role, key: s.key, opinion: hit.opinion, opinionName: OPINION_NAME[hit.opinion], text: fill(hit.text, ctx) };
    });
  }
  function submit(raw, lib, causeId, key, params) {
    var d = ensure(raw); var sim = simulate(d, lib, causeId, key, params); if (!sim) return d;
    var id = nextId(lib.approvalRules.idPrefix.approval, d.today.slice(0, 7), d.approvals);
    var ap = { id: id, causeId: causeId, causeName: sim.causeName, metricId: rootMetricOf(lib, causeId), option: { key: sim.option.key, name: sim.option.name, desc: sim.option.desc, owner: sim.option.owner, invest: sim.option.invest, risk: sim.option.risk, tags: sim.option.tags, leadMonths: sim.option.leadMonths, milestones: sim.option.milestones, note: sim.option.note }, params: sim.params, paramText: sim.option.params.map(function (x) { return fill(x.label, d.facts) + ' ' + sim.params[x.key] + ' ' + x.unit; }).join(' · '), totals: sim.totals, summary: sim.summary, opinions: opinions(lib, sim, d.facts), status: 'pending', submittedAt: d.today, decidedAt: null, comment: null, decisionId: null };
    ap.objections = ap.opinions.filter(function (o) { return o.opinion === 'object'; }).length; ap.conditions = ap.opinions.filter(function (o) { return o.opinion === 'cond'; }).length;
    d.approvals.push(ap);
    d.log.push({ seq: d.log.length + 1, kind: 'approval', label: '发起审批', detail: id + ' ' + sim.option.name + ' · ' + sim.summary });
    return d;
  }
  function rootMetricOf(lib, causeId) { var N = nodeMap(lib), g = N[causeId] ? N[causeId].group : 'profit'; var G = lib.metricTree.groups.filter(function (x) { return x.key === g; })[0]; return G ? G.root : 'profit'; }
  function approve(raw, lib, approvalId, comment) {
    var d = ensure(raw); var ap = d.approvals.filter(function (x) { return x.id === approvalId; })[0]; if (!ap || ap.status !== 'pending') return d;
    var sim = simulate(d, lib, ap.causeId, ap.option.key, ap.params);
    var N = nodeMap(lib), metric = ap.metricId === 'profit' ? 'gm' : ap.metricId, tn = N[metric];
    var target = sim.months.slice(0, 6).map(function (m) { return metric === 'gm' ? m.gm : metric === 'profit' ? m.profit : metric === 'ccc' ? m.ccc : metric === 'onTimeRate' ? m.onTimeRate : metric === 'complianceExposure' ? m.complianceExposure : metric === 'deals' ? d.series.deals[d.series.deals.length - 1] : m.profit; });
    var id = nextId(lib.approvalRules.idPrefix.decision, d.today.slice(0, 7), d.decisions);
    ap.status = 'approved'; ap.decidedAt = d.today; ap.comment = comment || ''; ap.decisionId = id;
    d.decisions.unshift({ id: id, title: ap.option.name, cause: ap.causeId, causeName: ap.causeName, option: ap.option.name, owner: ap.option.owner, approvedAt: d.today, status: 'executing', invest: ap.option.invest, expected: sim.summary, approvalId: ap.id, comment: comment || '', milestones: ap.option.milestones.map(function (m, i) { return { title: m.title, owner: m.owner, due: dateOf(d.today, m.days), status: i === 0 ? 'doing' : 'todo' }; }), tracking: { metric: metric, metricName: tn ? tn.name : metric, months: sim.labels.slice(0, 6), target: target, actual: [] }, review: null });
    d.log.push({ seq: d.log.length + 1, kind: 'decision', label: '批准并形成决议', detail: id + ' ' + ap.option.name + ' · 责任 ' + ap.option.owner + ' · ' + ap.option.milestones.length + ' 个执行节点' });
    return d;
  }
  function reject(raw, lib, approvalId, comment) {
    var d = ensure(raw); var ap = d.approvals.filter(function (x) { return x.id === approvalId; })[0]; if (!ap || ap.status !== 'pending') return d;
    ap.status = 'rejected'; ap.decidedAt = d.today; ap.comment = comment || '';
    d.log.push({ seq: d.log.length + 1, kind: 'approval', label: '驳回', detail: ap.id + ' ' + ap.option.name + (comment ? ' · ' + comment : '') });
    return d;
  }
  function setMilestone(raw, decisionId, idx, status) {
    var d = ensure(raw); var dc = d.decisions.filter(function (x) { return x.id === decisionId; })[0]; if (!dc || !dc.milestones[idx]) return d;
    dc.milestones[idx].status = status;
    if (status === 'done') { var nx = dc.milestones.filter(function (m) { return m.status === 'todo'; })[0]; if (nx) nx.status = 'doing'; if (dc.milestones.every(function (m) { return m.status === 'done'; })) dc.status = 'done'; }
    d.log.push({ seq: d.log.length + 1, kind: 'execute', label: status === 'done' ? '节点完成' : '节点更新', detail: dc.id + ' ' + dc.milestones[idx].title });
    return d;
  }
  function decisions(d, lib) {
    var N = nodeMap(lib);
    return d.decisions.map(function (x) {
      var done = x.milestones.filter(function (m) { return m.status === 'done'; }).length, total = x.milestones.length;
      var next = x.milestones.filter(function (m) { return m.status !== 'done'; })[0];
      var overdue = x.milestones.filter(function (m) { return m.status !== 'done' && days(d.today, m.due) < 0; });
      var tr = null;
      if (x.tracking) { var tn = N[x.tracking.metric] || { unit: '', name: x.tracking.metric }; tr = { metric: x.tracking.metric, metricName: tn.name, months: x.tracking.months, target: x.tracking.target, actual: x.tracking.actual || [], targetText: x.tracking.target.map(function (v) { return fmtVal(tn, v); }), actualText: (x.tracking.actual || []).map(function (v) { return fmtVal(tn, v); }), variance: (x.tracking.actual || []).map(function (v, i) { return v - x.tracking.target[i]; }), varianceText: (x.tracking.actual || []).map(function (v, i) { return fmtDelta(tn, v - x.tracking.target[i]); }), lastVariance: (x.tracking.actual || []).length ? (x.tracking.actual[x.tracking.actual.length - 1] - x.tracking.target[x.tracking.actual.length - 1]) : null, onTrack: (x.tracking.actual || []).length ? (tn.good === 'down' ? x.tracking.actual[x.tracking.actual.length - 1] <= x.tracking.target[x.tracking.actual.length - 1] : x.tracking.actual[x.tracking.actual.length - 1] >= x.tracking.target[x.tracking.actual.length - 1]) : null }; }
      return Object.assign({}, x, { causeName: x.causeName || (N[x.cause] ? N[x.cause].name : x.cause), progress: total ? r0(100 * done / total) : 0, done: done, total: total, next: next || null, overdue: overdue, ageDays: days(x.approvedAt, d.today), statusName: { executing: '执行中', done: '已完成', paused: '已暂停' }[x.status] || x.status, tracking: tr });
    });
  }

  /* ---------------- KPI 与月报 ---------------- */
  function kpi(d, T, att, dec, lib) {
    var n = T.nodes;
    return { period: d.period, profit: n.profit.cur, profitPrev: n.profit.prev, profitDelta: n.profit.delta, profitBudget: n.profit.budget, rev: n.rev.cur, revDeltaPct: n.rev.deltaPct, gm: n.gm.cur, gmPrev: n.gm.prev, gmBudget: n.gm.budget, ccc: n.ccc.cur, cccBudget: n.ccc.budget, onTimeRate: n.onTimeRate.cur, onTimeBudget: n.onTimeRate.budget, deals: n.deals.cur, perCapitaRevenue: n.perCapitaRevenue.cur, complianceExposure: n.complianceExposure.cur, risk: T.counts.risk, watch: T.counts.watch, ok: T.counts.ok, rootCause: att.rootCause ? att.rootCause.name : null, rootCauseValue: att.rootCause ? att.rootCause.value : 0, pending: d.approvals.filter(function (a) { return a.status === 'pending'; }).length, approved: d.approvals.filter(function (a) { return a.status === 'approved'; }).length, executing: dec.filter(function (x) { return x.status === 'executing'; }).length, doneDecisions: dec.filter(function (x) { return x.status === 'done'; }).length, overdueMilestones: sum(dec.map(function (x) { return x.overdue.length; })), missedReviews: dec.filter(function (x) { return x.review && x.review.result === 'miss'; }).length };
  }
  function report(d, T, att, dec, k, lib) {
    var n = T.nodes, lines = ['【决策月报】' + d.period.replace('-', ' 年 ') + ' 月 · ' + d.company];
    lines.push('指标 ' + Object.keys(n).length + ' 项：风险 ' + k.risk + ' · 关注 ' + k.watch + ' · 正常 ' + k.ok + '；经营利润 ' + n.profit.curText + '（较上期 ' + n.profit.deltaText + (n.profit.budget != null ? '，较预算 ' + n.profit.devBudgetText : '') + '）· 收入 ' + n.rev.curText + '（' + fmtSigned(r1(n.rev.deltaPct * 100), function (x) { return x + '%'; }) + '）· 毛利率 ' + n.gm.curText + '（上期 ' + n.gm.prevText + (n.gm.budget != null ? '，预算 ' + n.gm.budgetText : '') + '）· 现金周期 ' + n.ccc.curText + ' · 准时交付率 ' + n.onTimeRate.curText);
    var reds = Object.keys(n).filter(function (x) { return n[x].status === 'risk'; }).map(function (x) { return n[x].name + ' ' + n[x].curText; });
    if (reds.length) lines.push('风险指标：' + reds.join('；'));
    lines.push('归因（' + att.name + ' ' + att.basisName + ' ' + att.deltaText + '）：' + att.hurts.slice(0, 4).map(function (x) { return x.name + ' ' + x.valueText + '（' + x.factorText + '）'; }).join('；') + (att.rootCause ? '；主因 ' + att.rootCause.name : ''));
    var pend = d.approvals.filter(function (a) { return a.status === 'pending'; });
    lines.push('审批：待批 ' + pend.length + ' 单' + (pend.length ? '（' + pend.map(function (a) { return a.id + ' ' + a.option.name + '，会签 ' + a.opinions.map(function (o) { return o.role + o.opinionName; }).join(' / '); }).join('；') + '）' : '') + ' · 本期批准 ' + d.approvals.filter(function (a) { return a.status === 'approved'; }).length + ' · 驳回 ' + d.approvals.filter(function (a) { return a.status === 'rejected'; }).length);
    lines.push('决议执行：执行中 ' + k.executing + ' 项 · 已完成 ' + k.doneDecisions + ' 项 · 逾期节点 ' + k.overdueMilestones + '；' + dec.filter(function (x) { return x.status === 'executing'; }).slice(0, 3).map(function (x) { return x.id + ' ' + x.title + ' ' + x.progress + '%' + (x.next ? '，下一节点 ' + short(x.next.due) + ' ' + x.next.title : ''); }).join('；'));
    dec.filter(function (x) { return x.review; }).slice(0, 2).forEach(function (x) { lines.push('复盘 ' + x.id + ' ' + x.title + '：' + (x.review.result === 'miss' ? '未达标' : '达标') + '。' + x.review.text); });
    if (d.log.length) lines.push('本期处置：' + d.log.map(function (l) { return l.label + ' ' + l.detail.split(' · ')[0]; }).join('；'));
    var todo = [];
    if (att.rootCause && !pend.length && !d.approvals.some(function (a) { return a.causeId === att.rootCause.id && a.status === 'approved'; })) todo.push('对主因「' + att.rootCause.name + '」预演方案并发起审批');
    pend.forEach(function (a) { todo.push('终批 ' + a.id); });
    dec.forEach(function (x) { x.overdue.slice(0, 1).forEach(function (m) { todo.push(x.id + ' 逾期节点：' + m.title); }); });
    if (todo.length) lines.push('待办：' + todo.slice(0, 4).join('；'));
    return { lines: lines, text: lines.join('\n'), todo: todo };
  }
  function run(raw, lib, opt) {
    var d = ensure(raw); opt = opt || {};
    var T = tree(d, lib), att = attribute(d, lib, opt.metric || 'profit', opt.basis || 'prev'), dec = decisions(d, lib);
    var k = kpi(d, T, att, dec, lib);
    return { version: VERSION, data: d, tree: T, attribution: att, decisions: dec, approvals: d.approvals, kpi: k, report: report(d, T, att, dec, k, lib) };
  }

  return {
    VERSION: VERSION, MODULE_NAME: MODULE_NAME, CREDITS: CREDITS, BASIS_NAME: BASIS_NAME, OPINION_NAME: OPINION_NAME, STATUS_NAME: STATUS_NAME, DRIVERS: DRIVERS,
    ensure: ensure, run: run, tree: tree, computeValues: computeValues, attribute: attribute, evidence: evidence, playbookKey: playbookKey, options: options, baseline: baseline, simulate: simulate, simulateAll: simulateAll,
    opinions: opinions, submit: submit, approve: approve, reject: reject, setMilestone: setMilestone, decisions: decisions, rootMetricOf: rootMetricOf,
    fmtN: fmtN, fmtW: fmtW, fmtVal: fmtVal, fmtDelta: fmtDelta, fmtSigned: fmtSigned, short: short, days: days, dateOf: dateOf, addMonths: addMonths, evalExpr: evalExpr
  };
});
