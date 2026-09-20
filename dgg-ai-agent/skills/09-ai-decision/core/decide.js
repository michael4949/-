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

  var VERSION = '1.2.0';
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
  /* 屏上的选中态：平台把当前选的根因 / 方案 / 参数经 opt 传进来（opt.cause / opt.option / opt.params，
     也可以整包放在 opt.selection 里），run 收进 result.selection，对话按它作答；不传就按推荐的那一档。 */
  function selectionOf(opt, lib) {
    var sel = opt.selection || opt, out = {}, on = false;
    if (sel.cause && playbookKey(lib, sel.cause)) { out.cause = sel.cause; on = true; }
    if (sel.option) { out.option = String(sel.option); on = true; }
    if (sel.params && typeof sel.params === 'object') { out.params = clone(sel.params); on = true; }
    return on ? out : null;
  }
  function run(raw, lib, opt) {
    var d = ensure(raw); opt = opt || {};
    var T = tree(d, lib), att = attribute(d, lib, opt.metric || 'profit', opt.basis || 'prev'), dec = decisions(d, lib);
    var k = kpi(d, T, att, dec, lib);
    var out = { version: VERSION, data: d, tree: T, attribution: att, decisions: dec, approvals: d.approvals, kpi: k, report: report(d, T, att, dec, k, lib) };
    var sel = selectionOf(opt, lib);
    if (sel) out.selection = sel;
    return out;
  }

  /* ---------------- 对话与文档摄入 ----------------
     screens / brief / suggest / ask / ingest 五个导出：纯函数，只认入参，不碰 DOM、window、时钟与随机数。
     result 是 run(data, lib, opt) 的结果，可选：传了就用（原型按当前指标与基期算好再传进来），没传按 profit / prev 自己算一次。
     答不上返回 null，不编数。blocks 是平台中立的纯数据（kv / table / tags / text），act 是声明式动作（goto / focus / open / apply / set）。
     屏上选中的根因 / 方案 / 参数走 result.selection 进来（平台调 run 时放进 opt，见 selectionOf），拟稿与预演按选中的那一档算；
     没传才回退到方案库推荐的一档与方案默认参数。因子取主因（没有主因取贡献居前的一个），
     决议按 复盘未达标 → 有逾期节点 → 执行中 → 台账排在前面的一项 取，与执行屏默认选中的那一项一致。 */
  var SCREENS = [['connect', '接入'], ['board', '决策驾驶舱'], ['attr', '指标归因'], ['options', '方案预演'], ['approval', '审批'], ['execute', '执行与复盘']];
  var AP_NAME = { pending: '待终批', approved: '已批准', rejected: '已驳回' };
  var DOC_LABEL = { word: 'Word', excel: 'Excel', ppt: 'PPT', pdf: 'PDF', eml: '邮件', text: '文本' };

  function screens() { return SCREENS.map(function (s) { return { key: s[0], label: s[1] }; }); }
  function ctxOf(data, lib, result) { return (result && result.tree && result.attribution && result.decisions && result.kpi && result.data) ? result : run(data, lib); }
  function cut(s, n) { s = String(s == null ? '' : s); return s.length > n ? s.slice(0, n) + '…' : s; }
  function has(q, arr) { for (var i = 0; i < arr.length; i++) if (q.indexOf(arr[i]) >= 0) return true; return false; }
  function kvB(rows) { return { type: 'kv', rows: rows }; }
  function tableB(head, rows) { return { type: 'table', head: head, rows: rows }; }
  function tagsB(items) { return { type: 'tags', items: items }; }
  function srcName(s) { return String(s.name || '').split(' · ')[0]; }
  function pct0(v) { return Math.round(v * 100); }
  function pct1(v) { return Math.round(v * 1000) / 10; }
  /* 偏差口径：有预算比预算，没预算比上期 —— 与驾驶舱瓦片同一口径 */
  function devOf(n) { return n.budget != null ? { v: n.devBudget, text: '较预算 ' + n.devBudgetText } : { v: n.delta, text: '较上期 ' + n.deltaText }; }
  function offOf(g) { return g.nodes.filter(function (x) { return x.status !== 'ok'; }).length; }
  function riskNodes(R) {
    var N = R.tree.nodes;
    return Object.keys(N).filter(function (id) { return N[id].status !== 'ok'; }).sort(function (a, b) {
      var ra = N[a].status === 'risk' ? 0 : 1, rb = N[b].status === 'risk' ? 0 : 1;
      if (ra !== rb) return ra - rb;
      return Math.abs(devOf(N[b]).v || 0) - Math.abs(devOf(N[a]).v || 0);
    }).map(function (id) { return N[id]; });
  }
  function nodeByName(q, R) {
    var N = R.tree.nodes, hit = null;
    Object.keys(N).forEach(function (id) { var n = N[id]; if (q.indexOf(n.name) >= 0 && (!hit || n.name.length > hit.name.length)) hit = n; });
    return hit;
  }
  function leafByName(q, A) {
    var hit = null;
    A.leaves.forEach(function (x) { if (q.indexOf(x.name) >= 0 && (!hit || x.name.length > hit.name.length)) hit = x; });
    return hit;
  }
  function factorOf(A) { return A.rootCause || A.leaves[0] || null; }
  function causeList(R, lib) {
    var A = R.attribution, out = [];
    if (A.rootCause && playbookKey(lib, A.rootCause.id)) out.push(A.rootCause.id);
    A.hurts.forEach(function (x) { if (out.indexOf(x.id) < 0 && playbookKey(lib, x.id)) out.push(x.id); });
    return out;
  }
  /* 选中态里的参数按方案 key 分组，逐项对上方案库的参数定义（认数字、超出上下限的收回区间内） */
  function fitParams(O, byKey) {
    var out = {};
    O.options.forEach(function (o) {
      var src = (byKey || {})[o.key]; if (!src || typeof src !== 'object') return;
      var p = {}, on = false;
      o.params.forEach(function (x) {
        var v = src[x.key];
        if (typeof v !== 'number' || !isFinite(v)) return;
        p[x.key] = Math.min(x.max, Math.max(x.min, v)); on = true;
      });
      if (on) out[o.key] = p;
    });
    return out;
  }
  /* 拟稿：根因、方案与参数先认屏上选中的那一档（result.selection），没有才取方案库认得的第一个根因、推荐的方案与默认参数 */
  function draft(R, lib) {
    var sel = R.selection || {}, cs = causeList(R, lib);
    var cause = sel.cause && playbookKey(lib, sel.cause) ? sel.cause : (cs[0] || (playbookKey(lib, 'orders') ? 'orders' : null));
    if (!cause) return null;
    var O = options(R.data, lib, cause), P0 = sel.params;
    /* 参数按方案 key 分组；平台只给一层（没分组）时，按选中的那个方案收 */
    if (P0 && sel.option && !O.options.some(function (o) { return P0[o.key] && typeof P0[o.key] === 'object'; })) { var w = {}; w[sel.option] = P0; P0 = w; }
    var byKey = (!sel.cause || sel.cause === cause) ? fitParams(O, P0) : {};
    var S = simulateAll(R.data, lib, cause, byKey);
    if (!S.sims.length) return null;
    var key = sel.option && S.sims.some(function (s) { return s.option.key === sel.option; }) ? sel.option : S.recommended;
    var sim = S.sims.filter(function (s) { return s.option.key === key; })[0];
    if (!sim) return null;
    return { cause: cause, causeName: S.causeName, S: S, sim: sim, opinions: opinions(lib, sim, R.data.facts) };
  }
  function pendingOf(d) { return d.approvals.filter(function (a) { return a.status === 'pending'; })[0] || null; }
  function curDecision(R) {
    var dec = R.decisions;
    return dec.filter(function (x) { return x.review && x.review.result === 'miss'; })[0]
      || dec.filter(function (x) { return x.overdue.length; })[0]
      || dec.filter(function (x) { return x.status === 'executing'; })[0] || dec[0] || null;
  }
  function trackMetric(lib, metricId) { var m = metricId === 'profit' ? 'gm' : metricId; return m; }

  /* 开场发现：进这一屏先说一条从数据里算出来的话 */
  function brief(step, data, lib, result) {
    if (!step) step = SCREENS[0][0];                 /* 不传 step = 首屏（SPEC §10.2 / §10.3） */
    var R = ctxOf(data, lib, result), d = R.data, k = R.kpi, T = R.tree, N = T.nodes, A = R.attribution;
    if (step === 'connect') {
      var rows = d.sources.reduce(function (t, s) { return t + s.rows; }, 0);
      var t0 = (d.sources[0] || {}).lastSync || d.today;
      return t0.slice(-5) + ' ' + d.sources.length + ' 个模块同步了 ' + fmtN(rows) + ' 条，' + lib.metricTree.nodes.length + ' 个指标节点里 ' + T.counts.risk + ' 项亮红、' + T.counts.watch + ' 项贴着容差。';
    }
    if (step === 'board') {
      return '经营利润 ' + fmtW(k.profit) + '，' + devOf(N.profit).text
        + (A.hurts.length ? '；缺口主要落在 ' + A.hurts.slice(0, 2).map(function (x) { return x.name + ' ' + x.valueText; }).join('、') : '；各因子都在容差内') + '。';
    }
    if (step === 'attr') {
      var top = A.leaves[0];
      if (!top) return A.name + ' ' + A.basisName + ' ' + A.deltaText + '，没有可拆的因子。';
      return A.leaves.length + ' 个因子里 ' + top.name + ' ' + top.valueText + ' 居前，剔除一次性项后主因判给 ' + (A.rootCause ? A.rootCause.name + ' ' + A.rootCause.valueText : '无') + '。';
    }
    if (step === 'options') {
      var dr = draft(R, lib);
      if (!dr) return '这个根因方案库里还没有对应方案。';
      var rec = dr.sim, other = dr.S.sims.filter(function (s) { return !s.recommended; })[0];
      return '方案 ' + rec.option.key + ' ' + rec.option.name + '，12 个月净效益 ' + fmtSigned(rec.totals.netBenefit, fmtW)
        + (other ? '，比 ' + other.option.key + ' 多 ' + fmtW(Math.abs(rec.totals.netBenefit - other.totals.netBenefit)) : '') + '。';
    }
    if (step === 'approval') {
      var ap = pendingOf(d);
      if (ap) return ap.id + ' 会签 ' + ap.opinions.filter(function (o) { return o.opinion === 'agree'; }).length + ' 位同意' + (ap.objections ? '、' + ap.objections + ' 位反对' : '') + '，净效益 ' + fmtSigned(ap.totals.netBenefit, fmtW) + '，等 ' + lib.approvalRules.final.role + ' 终批。';
      var dr2 = draft(R, lib);
      if (!dr2) return '台账里还没有审批单。';
      return '拟稿 ' + dr2.sim.option.key + ' ' + dr2.sim.option.name + '，会签预判 ' + dr2.opinions.filter(function (o) { return o.opinion === 'agree'; }).length + ' 位同意，净效益 ' + fmtSigned(dr2.sim.totals.netBenefit, fmtW) + '，随时可发起。';
    }
    if (step === 'execute') {
      var miss = R.decisions.filter(function (x) { return x.review && x.review.result === 'miss'; })[0];
      if (miss) return miss.id + ' ' + miss.title + ' 复盘未达标：' + cut(String(miss.review.text).split('；')[0], 34) + '。';
      var nx = R.decisions.filter(function (x) { return x.next; })[0];
      return nx ? nx.id + ' 下一节点 ' + short(nx.next.due) + ' ' + nx.next.title + '，责任 ' + nx.owner + '。' : '台账里 ' + R.decisions.length + ' 项决议，节点全部完成。';
    }
    return null;
  }

  /* 快捷问句：每屏 3–4 条，条条都能被 ask 答上 */
  function suggest(step, data, lib, result) {
    if (!step) step = SCREENS[0][0];                 /* 不传 step = 首屏（SPEC §10.2 / §10.3） */
    if (step === 'connect') return ['哪几项亮红', '数据什么时候同步的', '决议台账有几项'];
    if (step === 'board') return ['利润为什么掉了', '现金周期怎么样', '待批的是什么', '打开利润组'];
    if (step === 'attr') {
      var R = ctxOf(data, lib, result), F = factorOf(R.attribution);
      return ['主因是怎么定的', (F ? F.name : '管理费用') + '为什么变了', '有什么方案', '证据在哪'];
    }
    if (step === 'options') {
      var R2 = ctxOf(data, lib, result), dr = draft(R2, lib);
      if (!dr) return ['有什么方案', '多久见效', '发起审批'];
      var p = dr.sim.option.params[0], cur = dr.sim.params[p.key];
      var v = cur + p.step <= p.max ? cur + p.step : Math.max(p.min, cur - p.step);   /* 顶到上限就往回退一档 */
      v = Math.round(v * 100) / 100;                                                  /* 0.5 一档的参数按两位收干净 */
      return [dr.S.sims.map(function (s) { return s.option.key; }).join(' 和 ') + ' 差在哪', p.label + '改成 ' + v + ' ' + p.unit, '多久见效', '发起审批'];
    }
    if (step === 'approval') return ['会签有人反对吗', '净效益怎么算的', '批了会怎样', '批准'];
    if (step === 'execute') return ['有逾期吗', '下一个节点是什么', '复盘为什么没达标', '月报发给谁'];
    return [];
  }

  /* 问答：认得的问法逐条作答，答不上返回 null 交给平台兜底 */
  function ask(question, step, data, lib, result) {
    /* step 选填：不传就是「没有屏上下文」，全局分支照答（SPEC §10.4）；给了不认识的屏才算没接住 */
    if (step && SCREENS.every(function (s) { return s[0] !== step; })) return null;
    var R = ctxOf(data, lib, result), d = R.data, T = R.tree, N = T.nodes, A = R.attribution, k = R.kpi;
    var q = String(question == null ? '' : question);

    /* —— 接入 —— */
    if (has(q, ['亮红', '红灯', '超容差', '容差外', '哪几项', '风险指标'])) {
      var reds = riskNodes(R);
      if (!reds.length) return { text: lib.metricTree.nodes.length + ' 个指标节点都在容差内。' };
      return { text: reds.filter(function (n) { return n.status === 'risk'; }).length + ' 项亮红、' + reds.filter(function (n) { return n.status === 'watch'; }).length + ' 项贴着容差；排前面的是 ' + reds.slice(0, 3).map(function (n) { return n.name + ' ' + n.curText; }).join('、') + '。',
        blocks: [tableB(['指标', '本期', '偏差'], reds.slice(0, 5).map(function (n) { return [n.name, n.curText, devOf(n).text.replace(/^较\S{2}\s/, '')]; }))],
        ref: reds[0].id, act: { type: 'focus', ref: reds[0].id } };
    }
    if (has(q, ['指标节点', '指标树', '几个节点', '多少指标', '指标有多少', '几个指标'])) {
      var gs = T.groups, worst = gs.slice().sort(function (a, b) { return offOf(b) - offOf(a); })[0];
      return { text: lib.metricTree.nodes.length + ' 个指标节点分 ' + gs.length + ' 组：' + gs.map(function (g) { return g.name + ' ' + g.nodes.length + ' 项'; }).join('、') + '；容差外 ' + (T.counts.risk + T.counts.watch) + ' 项，亮红 ' + T.counts.risk + ' 项、贴着容差 ' + T.counts.watch + ' 项，其中 ' + offOf(worst) + ' 项落在' + worst.name + '组。',
        blocks: [tableB(['组', '指标', '容差外'], gs.map(function (g) { return [g.name, g.nodes.length + ' 项', offOf(g) ? offOf(g) + ' 项' : '—']; }))],
        ref: worst.root, act: { type: 'focus', ref: worst.root } };
    }
    if (has(q, ['同步', '什么时候', '取数', '数据源', '几个模块'])) {
      var rows = d.sources.reduce(function (t, s) { return t + s.rows; }, 0);
      return { text: d.sources.length + ' 个模块今早 ' + (d.sources[0].lastSync || '').slice(-5) + ' 同步完，共 ' + fmtN(rows) + ' 条；' + d.sources.filter(function (s) { return s.mode === 'direct'; }).length + ' 个模块直连。',
        blocks: [tableB(['模块', '条数', '接入'], d.sources.map(function (s) { return [srcName(s), fmtN(s.rows), s.mode === 'direct' ? '直连' : '导入']; }))],
        ref: d.sources[0].id, act: { type: 'focus', ref: d.sources[0].id } };
    }

    /* —— 归因 —— */
    if (has(q, ['为什么掉', '为什么降', '为什么少', '掉了', '降了', '为什么', '原因', '怎么回事']) && !has(q, ['复盘', '达标', '月报'])) {
      var lf = leafByName(q, A);
      if (lf) return { text: lf.name + ' ' + lf.factorText + '，对 ' + A.name + ' 的贡献 ' + lf.valueText + '，占变动 ' + Math.round(Math.abs(lf.share) * 100) + '%，数据来自 ' + lf.sourceName + '。' + (lf.adjText ? lf.adjText + '。' : ''),
        blocks: [kvB([['路径', lf.pathNames.join(' › ')], ['贡献', lf.valueText], ['占比', Math.round(Math.abs(lf.share) * 100) + '%']])],
        ref: lf.id, act: { type: 'set', path: 'factor', value: lf.id } };
      var f0 = factorOf(A);
      return { text: A.name + ' ' + A.basisName + ' ' + A.fromText + ' → ' + A.toText + '（' + A.deltaText + '）。不利因子 ' + A.hurts.length + ' 个：' + A.hurts.slice(0, 3).map(function (x) { return x.name + ' ' + x.valueText; }).join('、') + '。',
        blocks: [tableB(['因子', '贡献', '来源'], A.leaves.slice(0, 5).map(function (x) { return [x.name, x.valueText, x.sourceName]; }))],
        ref: f0 ? f0.id : null, act: f0 ? { type: 'set', path: 'factor', value: f0.id } : null };
    }
    if (has(q, ['主因', '怎么定的', '根因', '判断依据'])) {
      if (!A.rootCause) return { text: '这一期因子都在容差内，没有判主因。' };
      var rc = A.rootCause;
      return { text: '主因 ' + rc.name + '：' + rc.factorText + '，贡献 ' + rc.valueText + '，占变动 ' + Math.round(Math.abs(rc.share) * 100) + '%。取的是剔除一次性项后对 ' + A.name + ' 伤害居前的因子；各因子贡献之和等于变动，校验通过。',
        blocks: [tableB(['因子', '贡献'], A.hurts.slice(0, 4).map(function (x) { return [x.name, x.valueText]; }))],
        ref: rc.id, act: { type: 'set', path: 'factor', value: rc.id } };
    }
    if (has(q, ['证据', '在哪看', '凭什么', '哪来的'])) {
      var F = factorOf(A);
      if (!F) return { text: '这一期没有可取证的因子。' };
      var ev = evidence(d, lib, F.id, F.direction);
      if (!ev.length) return { text: F.name + ' 这个因子还没有证据卡。' };
      return { text: F.name + ' 有 ' + ev.length + ' 张证据卡：' + ev.map(function (e) { return e.moduleName + '「' + e.title + '」' + e.detail; }).join('；') + '。',
        blocks: [tagsB(ev.map(function (e) { return e.moduleName + ' · ' + e.ref; }))],
        ref: F.id, act: { type: 'open', panel: 'evidence', ref: F.id } };
    }

    /* —— 方案 —— */
    var mNum = q.match(/(\d+(?:\.\d+)?)\s*(人|个点|%|％|天|份|万元)?/);      /* 带小数的档位（3.5% / 0.5 个点）也要认全 */
    if (has(q, ['增员', '加人', '人手', '招人', '调价', '降幅', '比例', '参数', '改成', '按'])) {
      var nw = draft(R, lib);
      if (nw && mNum && mNum[1]) {
        var val = parseFloat(mNum[1]), p0 = null;
        nw.sim.option.params.forEach(function (p) { if (!p0 && val >= p.min && val <= p.max) p0 = p; });
        if (p0) {
          var cur0 = nw.sim.params[p0.key];
          var np = {}; Object.keys(nw.sim.params).forEach(function (kk) { np[kk] = nw.sim.params[kk]; }); np[p0.key] = val;
          var s2 = simulate(d, lib, nw.cause, nw.sim.option.key, np), t2 = s2.totals;
          var tail = '期末毛利率 ' + pct1(t2.gmEnd) + '%，现金 ' + fmtSigned(t2.cashDelta12, fmtW) + '。';
          var bk = [kvB([['参数', val + ' ' + p0.unit], ['净效益', fmtSigned(t2.netBenefit, fmtW)], ['投入', s2.option.invest ? fmtW(s2.option.invest) + '（预计）' : '无']])];
          var ac = { type: 'set', path: 'params.' + nw.cause + '.' + nw.sim.option.key + '.' + p0.key, value: val };
          if (val === cur0) return { text: p0.label + ' 现在就是 ' + val + ' ' + p0.unit + '，这一档 12 个月净效益 ' + fmtSigned(t2.netBenefit, fmtW) + '，' + tail + '换一个数就重算。', blocks: bk, act: ac };
          return { text: p0.label + ' 从 ' + cur0 + ' 调到 ' + val + ' ' + p0.unit + '：12 个月净效益 ' + fmtSigned(nw.sim.totals.netBenefit, fmtW) + ' → ' + fmtSigned(t2.netBenefit, fmtW) + '，' + tail + '参数已改过来。',
            blocks: bk, act: ac };
        }
      }
    }
    if (has(q, ['方案', '怎么办', '建议', '下一步', '对策', '差在哪', '选哪个', 'A 和 B', 'AB'])) {
      var n1 = draft(R, lib);
      if (!n1) return { text: '这个根因方案库里还没有对应方案，先换一个因子。', act: { type: 'goto', step: 'attr' } };
      return { text: n1.causeName + ' 有 ' + n1.S.sims.length + ' 个方案：' + n1.S.sims.map(function (s) { return s.option.key + ' ' + s.option.name + ' 净效益 ' + fmtSigned(s.totals.netBenefit, fmtW) + '（投入 ' + (s.option.invest ? fmtW(s.option.invest) : '无') + '，' + s.option.leadMonths + ' 个月见效）'; }).join('；') + '。推荐 ' + n1.sim.option.key + '。',
        blocks: [tableB(['方案', '净效益', '投入'], n1.S.sims.map(function (s) { return [s.option.key, fmtSigned(s.totals.netBenefit, fmtW), s.option.invest ? fmtW(s.option.invest) : '无']; }))],
        act: { type: 'goto', step: 'options' } };
    }
    if (has(q, ['见效', '多久', '几个月', '多长时间']) && !nodeByName(q, R)) {
      var n2 = draft(R, lib);
      if (n2) return { text: '方案 ' + n2.sim.option.key + ' ' + n2.sim.option.leadMonths + ' 个月见效，' + n2.sim.option.milestones.length + ' 个执行节点，责任 ' + n2.sim.option.owner + '；12 个月后期末毛利率 ' + pct1(n2.sim.totals.gmEnd) + '%、准时率 ' + pct0(n2.sim.totals.onTimeEnd) + '%。',
        blocks: [tableB(['节点', '天数'], n2.sim.option.milestones.map(function (m) { return [cut(m.title, 14), m.days + ' 天']; }))] };
    }

    /* —— 审批 —— */
    if (has(q, ['会签', '反对', '意见', '谁同意', '有条件'])) {
      var ap1 = pendingOf(d), dr1 = ap1 ? null : draft(R, lib);
      var ops = ap1 ? ap1.opinions : dr1 ? dr1.opinions : [];
      if (!ops.length) return { text: '还没有可会签的方案，先在方案预演里选一个。', act: { type: 'goto', step: 'options' } };
      return { text: (ap1 ? ap1.id : '拟稿') + ' 会签：' + ops.map(function (o) { return o.role + ' ' + o.opinionName + '（' + o.text + '）'; }).join('；') + '。',
        blocks: [tableB(['会签人', '意见'], ops.map(function (o) { return [o.role, o.opinionName]; }))],
        ref: ap1 ? ap1.id : null, act: ap1 ? { type: 'focus', ref: ap1.id } : { type: 'goto', step: 'approval' } };
    }
    if (has(q, ['净效益', '怎么算', '算出来'])) {
      var ap2 = pendingOf(d), dr2 = ap2 ? null : draft(R, lib);
      var Tt = ap2 ? ap2.totals : dr2 ? dr2.sim.totals : null;
      if (!Tt) return null;
      return { text: '净效益 = 12 个月利润增量 ' + fmtSigned(Tt.profitDelta12, fmtW) + ' 减一次性投入 ' + fmtW(Tt.invest) + '（预计），' + fmtSigned(Tt.netBenefit, fmtW) + '；同口径现金影响 ' + fmtSigned(Tt.cashDelta12, fmtW) + '。',
        blocks: [kvB([['利润增量', fmtSigned(Tt.profitDelta12, fmtW)], ['投入', fmtW(Tt.invest) + '（预计）'], ['净效益', fmtSigned(Tt.netBenefit, fmtW)], ['现金影响', fmtSigned(Tt.cashDelta12, fmtW)]])] };
    }
    /* 打听「批了会怎样」只讲不落单；说「批准」才真批 */
    if (has(q, ['批了会', '批了之后', '批了以后', '批准后', '批准会', '批了怎么', '批完'])) {
      var apQ = pendingOf(d), drQ = apQ ? null : draft(R, lib);
      var oQ = apQ ? apQ.option : drQ ? drQ.sim.option : null;
      if (!oQ) return { text: '现在没有可批的单子，先在方案预演里选一个。', act: { type: 'goto', step: 'options' } };
      var mQ = trackMetric(lib, apQ ? apQ.metricId : rootMetricOf(lib, drQ.cause));
      var tQ = apQ ? apQ.totals : drQ.sim.totals;
      return { text: (apQ ? apQ.id : '拟稿 ' + oQ.key) + ' 批准后转决议进台账，' + oQ.milestones.length + ' 个执行节点按 ' + d.today + ' 起排期，末节点 ' + short(dateOf(d.today, oQ.milestones[oQ.milestones.length - 1].days)) + ' 收口，责任 ' + oQ.owner + '，指标跟踪盯 ' + (N[mQ] ? N[mQ].name : mQ) + '，12 个月净效益 ' + fmtSigned(tQ.netBenefit, fmtW) + '。',
        blocks: [tableB(['节点', '到期', '责任'], oQ.milestones.map(function (m) { return [cut(m.title, 12), short(dateOf(d.today, m.days)), m.owner || oQ.owner]; }))],
        ref: apQ ? apQ.id : null, act: apQ ? { type: 'focus', ref: apQ.id } : { type: 'goto', step: 'approval' } };
    }
    if (has(q, ['发起审批', '提交审批', '上会', '发起'])) {
      var apS = pendingOf(d);
      if (apS) return { text: apS.id + ' 已经在 ' + lib.approvalRules.final.role + ' 终批队列里了，不用再发起。',
        ref: apS.id, act: { type: 'focus', ref: apS.id } };
      var drS = draft(R, lib);
      if (!drS) return { text: '现在没有可发起的拟稿，先在方案预演里选一个。', act: { type: 'goto', step: 'options' } };
      return { text: '发起后 ' + drS.sim.option.key + ' ' + drS.sim.option.name + ' 进 ' + lib.approvalRules.final.role + ' 终批队列，会签预判 ' + drS.opinions.filter(function (o) { return o.opinion === 'agree'; }).length + ' 位同意。',
        act: { type: 'apply', action: 'submit', input: { cause: drS.cause, option: drS.sim.option.key, params: drS.sim.params } } };
    }
    if (has(q, ['批准', '批了', '通过它', '同意它'])) {
      var ap3 = pendingOf(d);
      if (ap3) return { text: '批准 ' + ap3.id + ' 转决议进台账，' + ap3.option.milestones.length + ' 个执行节点按 ' + d.today + ' 起排期，责任 ' + ap3.option.owner + '，指标跟踪盯 ' + (N[trackMetric(lib, ap3.metricId)] || { name: ap3.metricId }).name + '。',
        ref: ap3.id, act: { type: 'apply', action: 'approve', input: { approvalId: ap3.id } } };
      var dr3 = draft(R, lib);
      if (!dr3) return { text: '现在没有可批的单子，先在方案预演里选一个。', act: { type: 'goto', step: 'options' } };
      var m3 = trackMetric(lib, rootMetricOf(lib, dr3.cause));
      return { text: '台账里还没发起单子，拟稿 ' + dr3.sim.option.key + ' ' + dr3.sim.option.name + ' 发起与终批一次做完：进 ' + lib.approvalRules.final.role + ' 终批队列，会签预判 ' + dr3.opinions.filter(function (o) { return o.opinion === 'agree'; }).length + ' 位同意，批准后转决议，' + dr3.sim.option.milestones.length + ' 个执行节点按 ' + d.today + ' 起排期，责任 ' + dr3.sim.option.owner + '，指标跟踪盯 ' + (N[m3] ? N[m3].name : m3) + '。',
        act: { type: 'apply', action: 'approve', input: { cause: dr3.cause, option: dr3.sim.option.key, params: dr3.sim.params } } };
    }

    /* —— 执行 —— */
    if (has(q, ['逾期', '延期节点', '催办'])) {
      var od = [];
      R.decisions.forEach(function (x) { x.overdue.forEach(function (m) { od.push([x.id, cut(m.title, 12), short(m.due)]); }); });
      if (!od.length) {
        var nx2 = R.decisions.filter(function (x) { return x.next; })[0];
        return { text: '没有逾期节点。' + (nx2 ? nx2.id + ' 下一节点 ' + short(nx2.next.due) + ' ' + nx2.next.title + '，责任 ' + nx2.owner + '。' : ''),
          ref: nx2 ? nx2.id : null, act: nx2 ? { type: 'focus', ref: nx2.id } : null };
      }
      return { text: od.length + ' 个节点逾期：' + od.map(function (x) { return x[0] + ' ' + x[1] + '（' + x[2] + '）'; }).join('；') + '。',
        blocks: [tableB(['决议', '节点', '到期'], od.slice(0, 5))],
        ref: od[0][0], act: { type: 'focus', ref: od[0][0] } };
    }
    if (has(q, ['下一个节点', '下一节点', '执行节点', '节点', '进度']) && !has(q, ['指标节点', '指标树'])) {
      var dd = curDecision(R);
      if (!dd) return { text: '台账里还没有决议。' };
      return { text: dd.id + ' ' + dd.title + '，进度 ' + dd.progress + '%（' + dd.done + ' / ' + dd.total + ' 节点）' + (dd.next ? '，下一节点 ' + short(dd.next.due) + ' ' + dd.next.title + '，责任 ' + (dd.next.owner || dd.owner) : '，节点全部完成') + '。',
        blocks: [tableB(['节点', '到期', '状态'], dd.milestones.map(function (m) { return [cut(m.title, 12), short(m.due), m.status === 'done' ? '完成' : m.status === 'doing' ? '进行' : '待办']; }))],
        ref: dd.id, act: { type: 'focus', ref: dd.id } };
    }
    if (has(q, ['复盘', '没达标', '未达标', '教训'])) {
      var rv = R.decisions.filter(function (x) { return x.review; });
      if (!rv.length) return { text: '还没有到复盘期的决议。' };
      return { text: rv.map(function (x) { return x.id + ' ' + x.title + '：' + (x.review.result === 'miss' ? '未达标。' : '达标。') + x.review.text; }).join('\n'),
        ref: rv[0].id, act: { type: 'open', panel: 'review', ref: rv[0].id } };
    }
    if (has(q, ['月报', '发给谁', '收件', '微信'])) {
      return { text: '决策月报收件人：总经理、经营班子、各会签负责人；内容是指标、归因、审批、决议执行与复盘，微信文本版。',
        blocks: [tagsB(['总经理', '经营班子', '各会签负责人'])],
        act: { type: 'open', panel: 'report' } };
    }

    /* —— 指标名直接命中 —— */
    var n3 = nodeByName(q, R);
    if (n3) {
      var dv = devOf(n3);
      return { text: n3.name + ' ' + n3.curText + '，' + dv.text + '，上期 ' + n3.prevText + '，来自 ' + n3.sourceName + '。',
        blocks: [kvB([['本期', n3.curText], ['上期', n3.prevText], [n3.budget != null ? '预算' : '近三月均值', n3.budget != null ? n3.budgetText : fmtVal(n3, n3.avg3)], ['状态', STATUS_NAME[n3.status]]])],
        ref: n3.id, act: n3.status === 'ok' ? null : { type: 'set', path: 'metric', value: n3.id } };
    }
    var lf2 = leafByName(q, A);
    if (lf2) return { text: lf2.name + ' ' + lf2.factorText + '，贡献 ' + lf2.valueText + '，来自 ' + lf2.sourceName + '。', ref: lf2.id };
    /* 台账 / 审批单编号 */
    var hitD = R.decisions.filter(function (x) { return q.indexOf(x.id) >= 0; })[0];
    if (hitD) return { text: hitD.id + ' ' + hitD.title + '：' + hitD.statusName + '，进度 ' + hitD.progress + '%，责任 ' + hitD.owner + '，投入 ' + (hitD.invest ? fmtW(hitD.invest) + '（预计）' : '无') + '。',
      ref: hitD.id, act: { type: 'focus', ref: hitD.id } };
    var hitA = d.approvals.filter(function (x) { return q.indexOf(x.id) >= 0; })[0];
    if (hitA) return { text: hitA.id + ' ' + hitA.option.name + '：' + AP_NAME[hitA.status] + '，净效益 ' + fmtSigned(hitA.totals.netBenefit, fmtW) + '，会签 ' + hitA.opinions.map(function (o) { return o.role + ' ' + o.opinionName; }).join('、') + '。',
      ref: hitA.id, act: { type: 'focus', ref: hitA.id } };
    if (has(q, ['决议', '台账', '几项决议'])) {
      if (!R.decisions.length) return { text: '台账里还没有决议，审批批准后才会进台账。', act: { type: 'goto', step: 'approval' } };
      return { text: '决策台账 ' + R.decisions.length + ' 项：执行中 ' + k.executing + ' · 已完成 ' + k.doneDecisions + ' · 逾期节点 ' + k.overdueMilestones + ' 个。' + R.decisions.map(function (x) { return x.id + ' ' + x.title + ' ' + x.progress + '%'; }).join('；') + '。',
        blocks: [tableB(['决议', '根因', '进度'], R.decisions.map(function (x) { return [x.id, x.causeName, x.progress + '%']; }))],
        ref: R.decisions[0].id, act: { type: 'focus', ref: R.decisions[0].id } };
    }
    if (has(q, ['打开', '抽屉', '明细', '全组', '组里', '还有哪些'])) {
      var grp = T.groups.filter(function (x) { return q.indexOf(x.name) >= 0; })[0] || T.groups[0];
      return { text: grp.name + ' 组 ' + grp.nodes.length + ' 个指标，' + offOf(grp) + ' 个在容差外。',
        blocks: [tableB(['指标', '本期'], grp.nodes.slice(0, 6).map(function (x) { return [x.name, x.curText]; }))],
        ref: grp.root, act: { type: 'open', panel: 'group', ref: grp.key } };
    }
    if (has(q, ['待批', '审批单', '几单'])) {
      if (k.pending) return { text: '待终批 ' + k.pending + ' 单：' + d.approvals.filter(function (a) { return a.status === 'pending'; }).map(function (a) { return a.id + ' ' + a.option.name + ' ' + fmtSigned(a.totals.netBenefit, fmtW); }).join('；') + '。',
        ref: pendingOf(d).id, act: { type: 'focus', ref: pendingOf(d).id } };
      var dr4 = draft(R, lib);
      return { text: '台账里没有待批单' + (dr4 ? '，拟稿是 ' + dr4.sim.option.key + ' ' + dr4.sim.option.name + '，净效益 ' + fmtSigned(dr4.sim.totals.netBenefit, fmtW) : '') + '。',
        act: { type: 'goto', step: 'approval' } };
    }
    if (has(q, ['积分', '多少钱', '收费'])) return { text: '进一次决策驾驶舱扣 ' + CREDITS + ' 积分，指标树、归因、方案预演、审批与复盘都在这一次里。' };
    return null;
  }

  /* ---------------- 文档摄入 ----------------
     PPT / 邮件 / Word / PDF 取指标口径与合同条款，Excel 认科目余额表；
     对得上指标树的数值写成驾驶舱对应组的目标，导入批次记进数据源与处置日志，全部落在新数据副本上。
     写回只走 data 这一条路：新副本交给平台存回会话状态，不再吐 act —— apply 不许指回这次调用的动作自己。 */
  var DOC_MAP = [
    { re: /(毛利率)[^0-9%]{0,8}(\d{1,3}(?:\.\d+)?)\s*%/, id: 'gm', kind: 'pct' },
    { re: /(准时率|准时交付率|交付准时率)[^0-9%]{0,8}(\d{1,3}(?:\.\d+)?)\s*%/, id: 'onTimeRate', kind: 'pct' },
    { re: /(应收账款周转|应收周转|回款天数|账期)[^0-9]{0,8}(\d{1,3}(?:\.\d+)?)\s*天/, id: 'dso', kind: 'day' },
    { re: /(库存天数|存货周转)[^0-9]{0,8}(\d{1,3}(?:\.\d+)?)\s*天/, id: 'dio', kind: 'day' },
    { re: /(离职率)[^0-9%]{0,8}(\d{1,3}(?:\.\d+)?)\s*%/, id: 'turnover', kind: 'pct' },
    { re: /(转化率|商机转化率)[^0-9%]{0,8}(\d{1,3}(?:\.\d+)?)\s*%/, id: 'winRate', kind: 'pct' },
    { re: /(新客成交|成交)[^0-9]{0,8}(\d{1,4})\s*(?:家|单)/, id: 'deals', kind: 'cnt' },
    { re: /(收入|营业收入)[^0-9]{0,8}(\d[\d,]*(?:\.\d+)?)\s*万元/, id: 'rev', kind: 'wan' }
  ];
  function docLabel(kind) { return DOC_LABEL[kind] || '文本'; }
  function pickMetrics(txt, R) {
    var N = R.tree.nodes, out = [];
    DOC_MAP.forEach(function (m) {
      var mt = txt.match(m.re); if (!mt) return;
      var n = N[m.id]; if (!n) return;
      var raw = parseFloat(String(mt[2]).replace(/,/g, ''));
      var val = m.kind === 'pct' ? raw / 100 : m.kind === 'wan' ? raw * 10000 : raw;
      out.push({ node: n, id: m.id, label: mt[1], raw: raw, val: val, kind: m.kind,
        text: m.kind === 'pct' ? raw + '%' : m.kind === 'day' ? raw + ' 天' : m.kind === 'wan' ? fmtN(raw) + ' 万元' : raw + ' ' + n.unit,
        cmp: m.kind === 'wan' ? null : fmtDelta(n, n.cur - val) });
    });
    return out;
  }
  /* 导入批次进数据源与处置日志；写回一律先 ensure 出新副本 */
  function addSource(raw, doc, rows, note) {
    var nd = ensure(raw), label = '导入 ' + cut(doc.name, 14);
    nd.sources = nd.sources.filter(function (s) { return s.id !== 'doc-import'; });   /* 数据源里只留最近一份文档的导入批次 */
    nd.sources.push({ id: 'doc-import', name: cut(doc.name, 20) + ' · 文档导入', mode: 'import', lastSync: nd.today + ' 14:20', rows: rows });
    nd.log = nd.log.filter(function (x) { return !(x.kind === 'import' && x.label === label); });   /* 同一份重复导入，处置日志也不叠 */
    nd.log.forEach(function (x, i) { x.seq = i + 1; });
    nd.log.push({ seq: nd.log.length + 1, kind: 'import', label: label, detail: note });
    return nd;
  }
  /* 对上指标树的数值写成所属组的目标，驾驶舱瓦片上显示 */
  function writeTargets(nd, hits, lib) {
    var t = {};
    hits.forEach(function (x) {
      if (x.kind === 'wan') return;                       /* 金额口径不同期，不写成目标 */
      var g = lib.metricTree.groups.filter(function (q) { return q.key === x.node.group; })[0];
      if (g) t[g.root] = { id: x.id, text: x.text };
    });
    if (Object.keys(t).length) nd.docTargets = t;
    return nd;
  }
  function ingestSlides(doc, R, lib) {
    var txt = String(doc.text || '').replace(/\s+/g, ' ');
    var titles = (doc.slides || []).map(function (s) { return s.title || ''; }).filter(Boolean);
    var hits = pickMetrics(txt, R);
    var nd = addSource(R.data, doc, doc.slides.length, doc.slides.length + ' 页，抓到 ' + hits.length + ' 个指标口径');
    if (!hits.length) {
      return { text: 'PPT《' + doc.name + '》读完：' + doc.slides.length + ' 页，第 1 页「' + (titles[0] || '—') + '」。正文里没读到能对上指标树的数值，已按 ' + doc.slides.length + ' 页登记为导入批次。',
        blocks: [tagsB(titles.slice(0, 4).map(function (t) { return cut(t, 16); }))],
        data: nd };
    }
    writeTargets(nd, hits, lib);
    var gap = hits.filter(function (x) { return x.cmp; }).sort(function (a, b) { return Math.abs(b.node.cur - b.val) / (Math.abs(b.val) || 1) - Math.abs(a.node.cur - a.val) / (Math.abs(a.val) || 1); })[0];
    var lines = ['PPT《' + doc.name + '》读完：' + doc.slides.length + ' 页，抓到 ' + hits.length + ' 个指标口径。'];
    lines.push(hits.map(function (x) { return x.label + ' 文档 ' + x.text + ' · 本期 ' + x.node.curText + (x.cmp ? '（差 ' + x.cmp + '）' : '（金额口径不同期，不直接比）'); }).join('\n'));
    if (gap) lines.push('差得多的是 ' + gap.node.name + '：文档 ' + gap.text + '，本期 ' + gap.node.curText + '。目标已写到驾驶舱对应的组上。');
    return { text: lines.join('\n'),
      blocks: [tableB(['指标', '文档', '本期'], hits.slice(0, 5).map(function (x) { return [x.node.name, x.text, x.node.curText]; }))],
      data: nd, ref: gap ? gap.id : null };
  }
  function ingestSheet(doc, R) {
    var s0 = (doc.sheets || [])[0];
    if (!s0 || !s0.rows.length) return { text: 'Excel《' + doc.name + '》读完，没有可用的数据行。' };
    var head = s0.rows[0], body = s0.rows.slice(1).filter(function (r) { return r.join('').trim(); });
    var iName = -1, iEnd = -1, iDr = -1, iCr = -1;
    head.forEach(function (x, i) {
      var s = String(x || '');
      if (iName < 0 && /科目名称|名称|项目/.test(s)) iName = i;
      if (iEnd < 0 && /期末/.test(s)) iEnd = i;
      if (iDr < 0 && /借方/.test(s)) iDr = i;
      if (iCr < 0 && /贷方/.test(s)) iCr = i;
    });
    var num = function (x) { var v = parseFloat(String(x).replace(/,/g, '')); return isNaN(v) ? 0 : v; };
    if (iName >= 0 && iEnd >= 0) {
      var find = function (re) { var hit = null; body.forEach(function (r) { if (!hit && re.test(String(r[iName]))) hit = r; }); return hit; };
      var ar = find(/应收/), ap = find(/应付/), inv = find(/存货|库存商品/), cash = find(/银行存款/);
      var dr = iDr >= 0 ? body.reduce(function (t, r) { return t + num(r[iDr]); }, 0) : 0;
      var cr = iCr >= 0 ? body.reduce(function (t, r) { return t + num(r[iCr]); }, 0) : 0;
      var N = R.tree.nodes, lines = ['Excel《' + doc.name + '》读完：《' + s0.name + '》' + body.length + ' 行 ' + head.length + ' 列。'];
      if (iDr >= 0 && iCr >= 0) lines.push('本期借方合计 ' + fmtN(dr) + ' 元，贷方合计 ' + fmtN(cr) + ' 元，差额 ' + fmtN(dr - cr) + ' 元' + (Math.abs(dr - cr) < 1 ? '，借贷相等' : '，两边没对平') + '。');
      var kv = [];
      if (ar) { var arv = num(ar[iEnd]); kv.push(['应收账款期末', fmtN(arv) + ' 元']); lines.push('应收账款期末 ' + fmtW(arv) + '，按本期收入 ' + fmtW(N.rev.cur) + ' 折回款天数约 ' + Math.round(arv / (N.rev.cur / 30)) + ' 天，指标树里回款天数 ' + N.dso.curText + '。'); }
      if (inv) { var iv = num(inv[iEnd]); kv.push(['存货期末', fmtN(iv) + ' 元']); }
      if (ap) kv.push(['应付账款期末', fmtN(num(ap[iEnd])) + ' 元']);
      if (cash) kv.push(['银行存款期末', fmtN(num(cash[iEnd])) + ' 元']);
      var nd = addSource(R.data, doc, body.length, body.length + ' 行科目余额，取应收与存货口径');
      lines.push('已按 ' + body.length + ' 行登记为导入批次。');
      return { text: lines.join('\n'), blocks: kv.length ? [kvB(kv)] : null,
        data: nd, ref: 'ccc' };
    }
    var nums = [];
    body.forEach(function (r) { r.forEach(function (x) { var v = num(x); if (Math.abs(v) > 999) nums.push(v); }); });
    var nd2 = addSource(R.data, doc, body.length, '《' + s0.name + '》' + body.length + ' 行，列里没有科目口径');
    return { text: 'Excel《' + doc.name + '》读完：' + doc.sheets.length + ' 张表，《' + s0.name + '》' + body.length + ' 行 ' + head.length + ' 列。\n列是 ' + head.slice(0, 6).map(function (x) { return cut(String(x), 8); }).join(' / ') + (nums.length ? '，数值列里数额居前的一笔 ' + fmtN(Math.max.apply(null, nums)) : '') + '。\n指标对账要科目名称与期末余额两列，这张表里没有，已按 ' + body.length + ' 行登记为导入批次。',
      blocks: [tableB(head.slice(0, 4).map(function (x) { return cut(String(x), 6); }), body.slice(0, 3).map(function (r) { return r.slice(0, 4).map(function (x) { return cut(String(x), 10); }); }))],
      data: nd2 };
  }
  function ingestText(doc, R, lib) {
    var txt = String(doc.text || '').replace(/\s+/g, ' '), N = R.tree.nodes;
    /* 中文写法先认，认不到再认英文合同的写法；金额不写「万元 / 元」的按元算 */
    var amt = txt.match(/(?:金额|合同[金总]?额|总价|价款)[^0-9]{0,6}([\d,]+(?:\.\d+)?)(?!\d)\s*(万元|元)?(?!\s*[%‰])/)
      || txt.match(/(?:Contract\s*Value|Amount|Total)\s*[:：]?\s*(?:CNY|RMB|¥|￥)?\s*([\d,]+(?:\.\d+)?)(?!\d)(?!\s*[%‰])/i);
    var pay = txt.match(/(?:账期|付款|收款)[^0-9]{0,8}(\d{1,3})\s*(?:个?日|天)/)
      || txt.match(/(?:Payment\s*Terms|Payment|Terms|Net)\s*[:：]?\s*(?:Net\s*)?(\d{1,3})(?!\d)\s*(?:days?\b)?/i);
    var pen = txt.match(/(?:违约金|逾期)[^0-9%]{0,10}(\d{1,3}(?:\.\d+)?)\s*[%‰]/)
      || txt.match(/(?:Penalty|Late\s*fee)\s*[:：]?\s*(\d{1,3}(?:\.\d+)?)\s*[%‰]/i);
    var amtV = amt ? parseFloat(String(amt[1]).replace(/,/g, '')) * (amt[2] === '万元' ? 10000 : 1) : null;
    var hits = pickMetrics(txt, R);
    var paras = (doc.paragraphs || []).filter(function (p) { return p && p.length > 4; });
    var lines = [docLabel(doc.kind) + '《' + doc.name + '》读完：' + paras.length + ' 段、' + (doc.stats && doc.stats['字数'] ? doc.stats['字数'] : txt.length) + ' 字。'];
    var kv = [];
    if (amt) { kv.push(['合同金额', fmtW(amtV)]); lines.push('金额条款 ' + fmtW(amtV) + '，本期合规敞口 ' + fmtW(N.complianceExposure.cur) + '，高风险合同 ' + N.highRiskContracts.curText + '，这一份占敞口 ' + Math.round(amtV / Math.max(1, N.complianceExposure.cur) * 100) + '%。'); }
    if (pay) { kv.push(['账期条款', pay[1] + ' 天']); lines.push('账期 ' + pay[1] + ' 天，指标树里回款天数 ' + N.dso.curText + '，差 ' + Math.round(N.dso.cur - (+pay[1])) + ' 天。'); }
    if (pen) kv.push(['违约条款', pen[1] + '%']);
    if (hits.length) lines.push('正文里还对上 ' + hits.length + ' 个指标口径：' + hits.map(function (x) { return x.node.name + ' ' + x.text; }).join('、') + '，已写到驾驶舱对应的组上。');
    if (!amt && !pay && !pen && !hits.length) {
      lines.push('正文里没读到金额、账期条款或能对上指标树的数值，六屏这一期不动数。开头一段是「' + cut(paras[0] || '—', 26) + '」。');
      return { text: lines.join('\n'), blocks: [tagsB(paras.slice(0, 3).map(function (p) { return cut(p, 14); }))] };
    }
    var nd = addSource(R.data, doc, paras.length, '合同条款 ' + (amt ? '金额 ' + fmtW(amtV) : '') + (pay ? ' · 账期 ' + pay[1] + ' 天' : ''));
    if (hits.length) writeTargets(nd, hits, lib);
    return { text: lines.join('\n'), blocks: kv.length ? [kvB(kv)] : null,
      data: nd, ref: 'complianceExposure' };
  }
  function ingestMail(doc, R, lib) {
    var ml = doc.mail || {}, txt = String(doc.text || '').replace(/\s+/g, ' ');
    var hits = pickMetrics(txt, R);
    var from = String(ml.from == null ? '' : ml.from).split('<')[0].trim() || '—';   /* 只留职务那一段，邮箱地址不进回答 */
    var kv = [['发件', from], ['主题', cut(ml.subject || '—', 20)], ['日期', ml.date || '—'], ['附件', (ml.attaches || []).length + ' 个']];
    if (hits.length) {
      var nd = writeTargets(ensure(R.data), hits, lib);
      return { text: '邮件《' + cut(ml.subject || doc.name, 20) + '》读完：' + (ml.date || '') + '，正文对上 ' + hits.length + ' 个指标口径。\n' + hits.map(function (x) { return x.node.name + ' 邮件 ' + x.text + ' · 本期 ' + x.node.curText + (x.cmp ? '（差 ' + x.cmp + '）' : ''); }).join('\n') + '\n目标已写到驾驶舱对应的组上。',
        blocks: [kvB(kv)],
        data: nd, ref: hits[0].id };
    }
    return { text: '邮件《' + cut(ml.subject || doc.name, 20) + '》读完：发件 ' + from + '，' + (ml.date || '') + '，附件 ' + (ml.attaches || []).length + ' 个。正文里没读到能对上指标树的数值，六屏这一期不动数。',
      blocks: [kvB(kv), (ml.attaches || []).length ? tagsB((ml.attaches || []).slice(0, 3).map(function (a) { return cut(a, 16); })) : null].filter(Boolean) };
  }
  function ingest(doc, step, data, lib, result) {
    if (!doc || !doc.ok) return null;
    var R = ctxOf(data, lib, result);
    if (doc.kind === 'ppt') return ingestSlides(doc, R, lib);
    if (doc.kind === 'excel') return ingestSheet(doc, R);
    if (doc.kind === 'eml') return ingestMail(doc, R, lib);
    if (doc.kind === 'word' || doc.kind === 'pdf' || doc.kind === 'text') return ingestText(doc, R, lib);
    return null;
  }

  return {
    VERSION: VERSION, MODULE_NAME: MODULE_NAME, CREDITS: CREDITS, BASIS_NAME: BASIS_NAME, OPINION_NAME: OPINION_NAME, STATUS_NAME: STATUS_NAME, DRIVERS: DRIVERS,
    ensure: ensure, run: run, tree: tree, computeValues: computeValues, attribute: attribute, evidence: evidence, playbookKey: playbookKey, options: options, baseline: baseline, simulate: simulate, simulateAll: simulateAll,
    opinions: opinions, submit: submit, approve: approve, reject: reject, setMilestone: setMilestone, decisions: decisions, rootMetricOf: rootMetricOf,
    screens: screens, brief: brief, suggest: suggest, ask: ask, ingest: ingest,
    fmtN: fmtN, fmtW: fmtW, fmtVal: fmtVal, fmtDelta: fmtDelta, fmtSigned: fmtSigned, short: short, days: days, dateOf: dateOf, addMonths: addMonths, evalExpr: evalExpr
  };
});
