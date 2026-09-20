/*
 * AI流程提效 · 内核（UMD）
 * 只围绕生产部门的生产环节：报工核验 → 约束识别与在制预测 → 异常预警与根因 → 时间损失与两率 → 标准工时校准 → 按瓶颈节拍投料
 * → 换型合批 → 改善预演（调 AI ERP 排程引擎重算）→ 明日派工与跨线支援 → 保养窗口 → 增效账与周报
 * 纯规则 / 算法 / 统计，无 LLM，确定性；所有客户动作返回新副本并写日志。产线 / 工序 / 路线 / 标准工时来自 AI ERP 样本（依赖注入 lib.erp = coreM10）。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.DGG = root.DGG || {}; root.DGG.coreM8 = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var VERSION = '1.1.0', MODULE_NAME = 'AI流程提效', CREDITS = 50;
  var EXC_STATUS = { open: '待处置', doing: '处置中', closed: '已关闭' };
  var LEDGER_KIND = { setup: '换型', wait: '等待', rework: '返工', down: '停机', ot: '加班', release: '投料', support: '支援' };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function r0(x) { return Math.round(x); }
  function r1(x) { return Math.round(x * 10) / 10; }
  function r2(x) { return Math.round(x * 100) / 100; }
  function r4(x) { return Math.round(x * 10000) / 10000; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function sum(arr, f) { var t = 0; (arr || []).forEach(function (x) { t += f ? f(x) : x; }); return t; }
  function byId(arr) { var m = {}; (arr || []).forEach(function (x) { m[x.id] = x; }); return m; }
  function fmtN(n) { var s = String(Math.abs(Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ','); return (n < 0 ? '−' : '') + s; }
  function fmtH(h) { return (Math.round(h * 10) / 10).toFixed(1) + ' h'; }
  function addDays(iso, n) { var d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function short(iso) { return iso.slice(5).replace('-', '-'); }
  function weekday(iso) { return new Date(iso + 'T00:00:00Z').getUTCDay(); }
  function median(arr) { var a = arr.slice().sort(function (x, y) { return x - y; }); if (!a.length) return 0; var m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; }
  function fill(text, map) { return String(text == null ? '' : text).replace(/\{(\w+)\}/g, function (m, k) { return map[k] != null ? map[k] : m; }); }

  // ---------- 状态 ----------
  function ensure(raw) {
    var d = clone(raw);
    ['verified', 'adopted', 'exceptions'].forEach(function (k) { d[k] = d[k] || {}; });
    ['projects', 'ledger', 'maintenance', 'training', 'log'].forEach(function (k) { d[k] = d[k] || []; });
    if (d.focus === undefined) d.focus = null;
    if (d.releasePlan === undefined) d.releasePlan = null;
    if (d.jobSeq === undefined) d.jobSeq = null;
    if (d.dispatch === undefined) d.dispatch = null;
    if (d._cl === undefined) d._cl = null;   // 本次识别出的约束线（run 时写入，供词表与预演使用）
    return d;
  }
  function V(d, lib) { return lib.vocab[d.archetype] || lib.vocab.make; }
  function erpSample(d, lib) { return lib.erpSamples[d.erpKey || d.archetype]; }
  function words(d, lib, extra) {
    var v = V(d, lib), es = erpSample(d, lib), L = byId(es.lines);
    var m = {
      setup: v.setup, tooling: v.tooling, program: v.program, lot: v.lot, lots: v.lots, line: v.line, wip: v.wip, dispatch: v.dispatch, firstPiece: v.firstPiece, firstPieceCheck: v.firstPieceCheck,
      fpy: v.fpy, release: v.release, queue: v.queue, capacity: v.capacity, machine: v.machine, down: v.down, support: v.support, unit: v.unit, report: v.report, maint: v.maint, op: v.op,
      bottleneck: L[d._cl || d.constraintExpected] ? L[d._cl || d.constraintExpected].name : v.bottleneck, spareLine: L[d.spare.line] ? L[d.spare.line].name : '', releaseLine: L[d.releaseLine] ? L[d.releaseLine].name : v.releaseLine,
      foreman: v.roles.foreman, lead: v.roles.lead, eng: v.roles.eng, maintRole: v.roles.maint
    };
    Object.keys(v).forEach(function (k) { if (typeof v[k] === 'string' && m[k] == null) m[k] = v[k]; });
    if (extra) Object.keys(extra).forEach(function (k) { m[k] = extra[k]; });
    return m;
  }
  function t(d, lib, text, extra) { var m = words(d, lib, extra), s = String(text == null ? '' : text); for (var i = 0; i < 3 && /\{\w+\}/.test(s); i++) s = fill(s, m); return s; }
  function roleName(d, lib, key) { return V(d, lib).roles[key] || key; }
  function pushLog(d, kind, label, detail) { d.log.push({ seq: d.log.length + 1, kind: kind, label: label, detail: detail, at: d.today }); }
  function nextId(d, prefix) { var n = 0; ['projects', 'ledger', 'maintenance', 'training'].forEach(function (k) { (d[k] || []).forEach(function (x) { if (x.id && x.id.indexOf(prefix + '-') === 0) n++; }); }); return prefix + '-' + d.today.slice(2, 4) + d.today.slice(5, 7) + '-' + pad(n + 1); }

  // ---------- 产线 / 工序 / 路线 ----------
  function erpBase(d, lib) {
    var es = clone(erpSample(d, lib));
    // 采纳的标准工时写到 m8 副本的路线上（原样本不动）
    es.products.forEach(function (p) { p.route.forEach(function (r) { var k = p.id + '|' + r.op; if (d.adopted[k]) r.hoursPerUnit = d.adopted[k]; }); });
    return es;
  }
  function simOf(d, lib, mods) { var es = erpBase(d, lib); if (mods) mods(es); return { es: es, S: lib.erp.schedule(es) }; }
  function shiftsOf(line, v) { return line.capHoursPerDay >= ((v && v.twoShiftCap) || 12) ? 2 : 1; }
  function workdaysPerWeek(es) { return 7 - ((es.workday && es.workday.restWeekdays) || [0]).length; }
  function hpuOfLine(es, lineId) { var hs = []; es.products.forEach(function (p) { p.route.forEach(function (r) { if (r.line === lineId) hs.push(r.hoursPerUnit); }); }); return hs.length ? sum(hs) / hs.length : 0; }
  function perQty(d, lib) { var v = V(d, lib); return v.perQty || (d.archetype === 'make' ? 1000 : d.archetype === 'flow' ? 100 : 1); }
  function perQtyLabel(d, lib) { var v = V(d, lib); return v.perQtyLabel || (d.archetype === 'make' ? '千件' : d.archetype === 'flow' ? '百箱' : '户'); }
  // 工序流的分段：按路线顺序，把工序集合相同的产线并成一格（服务业按环节分）
  function stages(d, lib, es) {
    var L = byId(es.lines), pos = {}, cnt = {};
    es.products.forEach(function (p) { p.route.forEach(function (r, i) { pos[r.line] = (pos[r.line] || 0) + i / Math.max(1, p.route.length - 1); cnt[r.line] = (cnt[r.line] || 0) + 1; }); });
    var order = es.lines.map(function (l) { return l.id; }).sort(function (a, b) { return (pos[a] || 0) / (cnt[a] || 1) - (pos[b] || 0) / (cnt[b] || 1); });
    var out = [], seen = {};
    if (d.archetype === 'service') {
      var ops = []; es.products.forEach(function (p) { p.route.forEach(function (r) { if (ops.indexOf(r.op) < 0) ops.push(r.op); }); });
      // 按路线里出现的平均位置排序
      var opPos = {}, opCnt = {}; es.products.forEach(function (p) { p.route.forEach(function (r, i) { opPos[r.op] = (opPos[r.op] || 0) + i; opCnt[r.op] = (opCnt[r.op] || 0) + 1; }); });
      ops.sort(function (a, b) { return opPos[a] / opCnt[a] - opPos[b] / opCnt[b]; });
      ops.forEach(function (op) { var lines = es.lines.filter(function (l) { return l.ops.indexOf(op) >= 0; }).map(function (l) { return l.id; }); out.push({ key: op, name: op, ops: [op], lines: lines }); });
      return out;
    }
    order.forEach(function (id) {
      var l = L[id], key = l.ops.join('/');
      if (seen[key]) { seen[key].lines.push(id); return; }
      var st = { key: key, name: l.ops.length > 1 ? l.ops.join(' / ') : l.ops[0], ops: l.ops.slice(), lines: [id] };
      seen[key] = st; out.push(st);
    });
    return out;
  }
  function thisWeekReports(d) { return d.reports.filter(function (r) { return r.date >= d.weekStart; }); }
  function effectiveDays(d) { var days = {}; d.lossToday.forEach(function (x) { days[x.date] = x.date === d.today ? 0.5 : 1; }); return sum(Object.keys(days).map(function (k) { return days[k]; })); }

  // ---------- 约束识别与在制 ----------
  function queueDaysOf(S, lineIds) {
    var q = 0;
    S.orders.forEach(function (o) {
      if (o.status === 'done') return;
      o.ops.forEach(function (p, i) {
        if (lineIds.indexOf(p.line) < 0 || p.done || p.startF == null) return;
        var prevEnd = 0; for (var j = i - 1; j >= 0; j--) { if (o.ops[j].endF != null) { prevEnd = o.ops[j].endF; break; } if (o.ops[j].done) { prevEnd = 0; break; } }
        q += Math.max(0, p.startF - Math.max(prevEnd, p.earliestF == null ? 0 : p.earliestF));
      });
    });
    return r1(q);
  }
  function wipCurve(S, es, lineIds, days) {
    var hpu = hpuOfLine(es, lineIds[0]) || 0.001, L = byId(es.lines), eff = (L[lineIds[0]] && L[lineIds[0]].eff) || 1, out = [];
    for (var dd = 0; dd < days; dd++) {
      var units = 0, hours = 0;
      S.orders.forEach(function (o) {
        if (o.status === 'done') return;
        o.ops.forEach(function (p, i) {
          if (lineIds.indexOf(p.line) < 0 || p.done) return;
          var prevDone = i === 0 ? true : (o.ops[i - 1].done || (o.ops[i - 1].endF != null && o.ops[i - 1].endF <= dd + 1));
          var notStarted = p.inProgress ? false : (p.startF == null ? true : p.startF >= dd + 1);
          if (prevDone && notStarted) { units += o.qty * (1 - (p.prog || 0)); hours += p.remain || (o.qty * hpu); }
        });
      });
      out.push({ d: dd, date: S.days ? S.days[dd].date : null, label: S.days ? S.days[dd].label : String(dd), rest: S.days ? !!S.days[dd].rest : false, units: r0(units), hours: r1(hours / eff) });
    }
    return out;
  }
  function bottleneck(d, lib, S, es) {
    var L = byId(es.lines), lines = S.lines.slice();
    var maxLoad = Math.max.apply(null, lines.map(function (l) { return l.load7; }));
    var cands = lines.filter(function (l) { return l.load7 === maxLoad; }).map(function (l) { return { l: l, q: queueDaysOf(S, [l.id]) }; }).sort(function (a, b) { return b.q - a.q || a.l.id.localeCompare(b.l.id); });
    var cl = cands[0].l, queue = cands[0].q;
    var longest = lines.map(function (l) { return { id: l.id, name: l.name, days: queueDaysOf(S, [l.id]) }; }).sort(function (a, b) { return b.days - a.days; })[0];
    var balance = r0(100 * sum(lines, function (l) { return l.load7; }) / (lines.length * (maxLoad || 1)));
    var hpu = hpuOfLine(es, cl.id), cap = L[cl.id].capHoursPerDay, buf = (d.buffers && d.buffers[cl.id]) || { capDays: 1.5 };
    var curve = wipCurve(S, es, [cl.id], 7), maxH = r1(buf.capDays * cap), maxUnits = r0(maxH / (hpu || 1));
    var overDay = null; curve.forEach(function (c) { if (overDay == null && c.hours >= maxH) overDay = c; });
    return { line: { id: cl.id, name: cl.name }, load7: cl.load7, queueDays: queue, longestQueue: longest, sameLine: longest.id === cl.id, balanceRate: balance, hpu: hpu, unitPerHour: r0(1 / (hpu || 1)), capHoursPerDay: cap,
      wip: { today: curve[0], tomorrow: curve[1], curve: curve, maxHours: maxH, maxUnits: maxUnits, capDays: buf.capDays, overDay: overDay }, wipDays: r1(curve[0].hours / cap), wipDaysTomorrow: r1(curve[1].hours / cap) };
  }
  function flowCards(d, lib, S, es, B) {
    var L = byId(es.lines), SL = byId(S.lines), reps = thisWeekReports(d), days = effectiveDays(d) || 1, pq = perQty(d, lib);
    return stages(d, lib, es).map(function (st) {
      var stdH = [], actH = [], q = 0, good = 0, rw = 0, waitMin = 0, wipUnits = 0, plannedMin = 0, lossMin = 0;
      es.products.forEach(function (p) { p.route.forEach(function (r) { if (st.lines.indexOf(r.line) >= 0 && st.ops.indexOf(r.op) >= 0) stdH.push(r.hoursPerUnit); }); });
      var stdSum = 0, actSum = 0;
      reps.forEach(function (r) { if (st.lines.indexOf(r.line) < 0 || st.ops.indexOf(r.op) < 0) return; var n = r.qtyGood + r.qtyRework; actSum += r.runMin / 60; stdSum += n * (r.std || 0); q += n; good += r.qtyGood; rw += r.qtyRework; waitMin += r.waitMin; });
      S.orders.forEach(function (o) { if (o.status !== 'done' && o.currentLine && st.lines.some(function (id) { return L[id].name === o.currentLine; }) && (d.archetype !== 'service' || o.currentOp === st.ops[0])) wipUnits += o.qty * (1 - (o.progressPct || 0) / 100); });
      d.lossToday.forEach(function (x) { if (st.lines.indexOf(x.line) < 0) return; plannedMin += x.plannedMin; lossMin += x.setupMin + x.downMin + sum(Object.keys(x.waitMin).map(function (k) { return x.waitMin[k]; })); });
      var std = q ? stdSum / q : (stdH.length ? sum(stdH) / stdH.length : 0), act = q ? actSum / q : std;
      var load = Math.max.apply(null, st.lines.map(function (id) { return SL[id] ? SL[id].load7 : 0; }));
      var isC = st.lines.indexOf(B.line.id) >= 0;
      return { key: st.key, name: st.name, lines: st.lines.map(function (id) { return { id: id, name: L[id].name, load7: SL[id] ? SL[id].load7 : 0, status: SL[id] ? SL[id].status : 'ok' }; }), ops: st.ops, isConstraint: isC, load7: load,
        stdText: r2(std * pq) + ' h/' + perQtyLabel(d, lib), actText: r2(act * pq) + ' h/' + perQtyLabel(d, lib), devPct: std ? r0(100 * (act - std) / std) : 0,
        wipUnits: r0(wipUnits), waitH: r1(waitMin / 60), fpy: q ? r1(100 * good / q) : null, availability: plannedMin ? r0(100 * (1 - lossMin / plannedMin)) : null, qty: q };
    });
  }

  // ---------- 报工核验 ----------
  function stdStat(d, product, op) { return d.stdStats.filter(function (s) { return s.product === product && s.op === op; })[0]; }
  function verifyReports(d, lib) {
    var v = V(d, lib), rows = [], reps = thisWeekReports(d), th = lib.rules.thresholds;
    var byKey = {};
    reps.forEach(function (r) { var k = r.order + '|' + r.op + '|' + r.date + '|' + r.shift; (byKey[k] = byKey[k] || []).push(r); });
    reps.forEach(function (r) {
      var n = r.qtyGood + r.qtyRework, actual = r.runMin / 60 / Math.max(1, n), dev = r.std ? (actual - r.std) / r.std : 0;
      if (Math.abs(dev) > th.devStd) { var ss = stdStat(d, r.product, r.op); var med = ss ? ss.median : r.std; rows.push({ id: 'V-' + r.id, kind: 'dev', kindName: '工时偏离', reportId: r.id, line: r.line, op: r.op, emp: r.emp, text: '单件 ' + r4(actual) + ' h，标准 ' + r4(r.std) + ' h，偏离 ' + (dev > 0 ? '+' : '') + r0(dev * 100) + '%', suggest: '按 12 周 ' + (ss ? ss.n : 0) + ' 批中位 ' + r4(med) + ' h/' + v.unit + ' 修正为 ' + r0(med * 60 * n) + ' min' }); }
    });
    Object.keys(byKey).forEach(function (k) { var g = byKey[k]; if (g.length < 2) return; for (var i = 1; i < g.length; i++) { if (g[i].qtyGood + g[i].qtyRework === g[0].qtyGood + g[0].qtyRework) rows.push({ id: 'V-' + g[i].id, kind: 'dup', kindName: '重复' + v.report, reportId: g[i].id, line: g[i].line, op: g[i].op, emp: g[i].emp, text: '与 ' + g[0].id + ' 同' + v.lot + '同工序同班次，数量相同', suggest: '保留首条 ' + g[0].id + '，本条作废' }); } });
    if (d.missingSlot) { var ms = d.missingSlot; if (!reps.some(function (r) { return r.date === ms.date && r.shift === ms.shift && r.line === ms.line; })) rows.push({ id: 'V-MISS-' + ms.date.slice(5).replace('-', '') + ms.shift, kind: 'missing', kindName: '漏报', reportId: null, line: ms.line, op: ms.op, emp: null, text: short(ms.date) + ' ' + (ms.shift === 'A' ? v.shiftA : v.shiftB) + ' 排班在岗且有' + v.lot + '在线，无' + v.report, suggest: '按' + v.lot + ' ' + ms.order + ' 补录 ' + fmtN(ms.suggestQty) + ' ' + v.unit + ' · ' + ms.suggestRunMin + ' min' }); }
    // 数量守恒：本道本周累计 > 前道本周累计（前道本周有报工才比）
    var es = erpSample(d, lib), routes = {}; es.products.forEach(function (p) { routes[p.id] = p.route.map(function (r) { return r.op; }); });
    var cum = {}; reps.forEach(function (r) { var k = r.order + '|' + r.op; cum[k] = (cum[k] || 0) + r.qtyGood + r.qtyRework; });
    var flagged = {};
    reps.forEach(function (r) { var ops = routes[r.product] || [], i = ops.indexOf(r.op); if (i <= 0) return; var prevK = r.order + '|' + ops[i - 1], k = r.order + '|' + r.op; if (cum[prevK] == null || flagged[k]) return; if (cum[k] > cum[prevK]) { flagged[k] = true; rows.push({ id: 'V-' + r.id, kind: 'conserve', kindName: '数量守恒', reportId: r.id, line: r.line, op: r.op, emp: r.emp, text: r.order + ' ' + r.op + ' 本周累计 ' + fmtN(cum[k]) + '，前道 ' + ops[i - 1] + ' 累计 ' + fmtN(cum[prevK]), suggest: '本条数量改为 ' + fmtN(Math.max(0, cum[prevK] - (cum[k] - r.qtyGood - r.qtyRework))) + ' ' + v.unit }); } });
    // 时段重叠
    var byEmp = {}; reps.forEach(function (r) { if (r.emp) (byEmp[r.emp + '|' + r.date] = byEmp[r.emp + '|' + r.date] || []).push(r); });
    Object.keys(byEmp).forEach(function (k) { var g = byEmp[k].sort(function (a, b) { return a.startMin - b.startMin; }); for (var i = 1; i < g.length; i++) { if (g[i].startMin < g[i - 1].endMin && g[i].id !== g[i - 1].id && !rows.some(function (x) { return x.reportId === g[i].id; })) rows.push({ id: 'V-' + g[i].id, kind: 'overlap', kindName: '时段重叠', reportId: g[i].id, line: g[i].line, op: g[i].op, emp: g[i].emp, text: '与 ' + g[i - 1].id + ' 时段相交', suggest: '开始时间改为 ' + pad(Math.floor(g[i - 1].endMin / 60)) + ':' + pad(g[i - 1].endMin % 60) }); } });
    rows.forEach(function (x) { x.resolved = !!d.verified[x.id]; });
    rows.sort(function (a, b) { return a.id.localeCompare(b.id); });
    var counts = {}; rows.forEach(function (x) { counts[x.kind] = (counts[x.kind] || 0) + 1; });
    return { rows: rows, total: reps.length, pending: rows.filter(function (x) { return !x.resolved; }).length, counts: counts };
  }
  function confirmReport(raw, lib, id) { var d = ensure(raw); if (d.verified[id]) return d; d.verified[id] = true; var row = verifyReports(d, lib).rows.filter(function (x) { return x.id === id; })[0]; pushLog(d, 'verify', '确认' + V(d, lib).report, row ? row.kindName + ' · ' + (row.reportId || row.id) + ' · ' + row.suggest : id); return d; }
  function confirmAllReports(raw, lib) { var d = ensure(raw); var rows = verifyReports(d, lib).rows.filter(function (x) { return !x.resolved; }); rows.forEach(function (x) { d.verified[x.id] = true; }); if (rows.length) pushLog(d, 'verify', '核验' + V(d, lib).reports, rows.length + ' 条已确认 · ' + rows.map(function (x) { return x.kindName; }).join(' / ')); return d; }

  // ---------- 异常预警与根因 ----------
  function spcLimits(pbar, n, sigma) { var s = Math.sqrt(Math.max(1e-9, pbar * (1 - pbar) / Math.max(1, n))); return { pbar: pbar, sigma: s, lcl: Math.max(0, pbar - sigma * s), ucl: Math.min(1, pbar + sigma * s) }; }
  function causeOf(d, lib, when) { var rc = lib.rules.rootCauses.filter(function (c) { return c.when === when; })[0] || lib.rules.rootCauses.filter(function (c) { return c.when === 'default'; })[0]; return rc; }
  function alerts(d, lib, S, es, B) {
    var v = V(d, lib), L = byId(es.lines), SL = byId(S.lines), th = lib.rules.thresholds, rules = byId(lib.rules.rules), out = [], reps = thisWeekReports(d);
    var W = words(d, lib), stz = stages(d, lib, es), n = 0;
    function make(rule, o) { n++; var rc = causeOf(d, lib, o.when); var lineName = L[o.line] ? L[o.line].name : ''; var key = rule.id + '|' + (o.machine || o.line) + '|' + (o.reportId || ''); var m = words(d, lib, { line: lineName, machine: o.machine || v.machine, op: o.op || '', lot: o.lot || '', reason: o.reason || '', min: o.min, hours: o.hours, max: o.max, pbar: o.pbar, value: o.value, k: o.k, lcl: o.lcl, actual: o.actual, std: o.std, count: o.count, shift: o.shift, plan: o.plan, span: o.span || '' }); var id = 'EX-' + d.today.slice(5).replace('-', '') + '-' + pad(n); var st = d.exceptions[key] || 'open'; out.push({ id: id, key: key, rule: rule.id, ruleName: fill(rule.name, m), kind: rule.kind, line: o.line, lineName: lineName, machine: o.machine || null, op: o.op || null, text: fill(rule.text, m), cause: fill(rc.cause, m), role: rc.role, roleName: roleName(d, lib, rc.role), action: fill(rc.action, m), savedH: rc.savedH, status: st, statusName: EXC_STATUS[st], reportId: o.reportId || null }); }
    // R1 在制超限
    if (B.wip.tomorrow.hours >= B.wip.maxHours) make(rules.R1, { when: 'wip_over', line: B.line.id, hours: B.wip.tomorrow.hours, max: B.wip.maxHours });
    // R2 单批等待超时
    reps.filter(function (r) { return r.waitMin >= th.waitMin; }).forEach(function (r) {
      var when = 'default';
      if (r.waitReason === v.waitReasons[1]) { var st = stz.filter(function (s) { return s.lines.indexOf(r.line) >= 0; })[0], idx = stz.indexOf(st), prev = idx > 0 ? stz[idx - 1] : null; var prevLoad = prev ? Math.max.apply(null, prev.lines.map(function (id) { return SL[id] ? SL[id].load7 : 0; })) : 100; if (prevLoad < 60) when = 'wait_upstream_idle'; }
      else if (r.waitReason === v.waitReasons[2]) when = 'wait_inspection';
      make(rules.R2, { when: when, line: r.line, op: r.op, lot: r.order, reason: r.waitReason, min: r.waitMin, reportId: r.id });
    });
    // R3 一次合格率判异（约束线各设备，本周批次序列）
    var pbar = d.weekly.length ? sum(d.weekly, function (w) { return w.fpy; }) / d.weekly.length / 100 : 0.96;
    d.machines.filter(function (m) { return m.line === B.line.id; }).forEach(function (m) {
      var rs = reps.filter(function (r) { return r.machine === m.id; }); if (rs.length < lib.rules.spc.minN) return;
      var avgN = sum(rs, function (r) { return r.qtyGood + r.qtyRework; }) / rs.length, lim = spcLimits(pbar, avgN, lib.rules.spc.sigma);
      var k = 0; for (var i = rs.length - 1; i >= 0; i--) { var f = rs[i].qtyGood / Math.max(1, rs[i].qtyGood + rs[i].qtyRework); if (f < lim.lcl) k++; else break; }
      if (k >= lib.rules.spc.minN) { var last = rs[rs.length - 1], afterSetup = rs.slice(-k).every(function (r) { return r.setupMin > 0 && r.firstPieceOk === false; }), afterDown = m.downEvents && m.downEvents.length > 0; make(rules.R3, { when: afterSetup ? 'quality_after_setup' : afterDown ? 'quality_after_down' : 'default', line: m.line, machine: m.id, op: last.op, pbar: r1(pbar * 100) + '%', value: r1(100 * last.qtyGood / (last.qtyGood + last.qtyRework)) + '%', k: k, lcl: r1(lim.lcl * 100) + '%', reportId: last.id }); }
    });
    // R4 单件工时判异（已核验且未被核验规则命中的报工）
    var vr = verifyReports(d, lib).rows.map(function (x) { return x.reportId; });
    var skillOf = skillMatrix(d, lib).levels;
    reps.filter(function (r) { return r.verified && vr.indexOf(r.id) < 0; }).forEach(function (r) {
      var ss = stdStat(d, r.product, r.op); if (!ss || ss.n < 8) return; var sig = (ss.p75 - ss.p25) / 1.35, ucl = ss.median + 3 * sig, n2 = r.qtyGood + r.qtyRework, actual = r.runMin / 60 / Math.max(1, n2);
      if (actual > ucl && sig > 0) { var lv = skillOf[r.emp] ? (skillOf[r.emp][r.op] || 0) : 0; make(rules.R4, { when: lv <= 1 ? 'speed_low_skill' : 'default', line: r.line, machine: r.machine, op: r.op, actual: r4(actual), std: r4(ss.median), reportId: r.id }); }
    });
    // R5 设备频繁停机
    d.machines.forEach(function (m) { var ev = m.downEvents || []; if (!ev.length) return; var byDay = {}; ev.forEach(function (e) { byDay[e.date] = (byDay[e.date] || 0) + 1; }); var maxDay = Math.max.apply(null, Object.keys(byDay).map(function (k) { return byDay[k]; })); var longOne = ev.some(function (e) { return e.toMin - e.fromMin >= th.downMinSingle; }); var last2 = ev.slice(-th.downCount24h); var dayMs = function (iso) { return new Date(iso + 'T00:00:00Z').getTime() / 60000; }; var within24 = last2.length >= th.downCount24h && (dayMs(last2[last2.length - 1].date) + last2[last2.length - 1].fromMin) - (dayMs(last2[0].date) + last2[0].fromMin) <= 24 * 60; var within2d = last2.length >= th.downCount24h && addDays(last2[0].date, 1) >= last2[last2.length - 1].date; if (within24 || within2d || maxDay >= th.downCount24h || (longOne && ev.length >= 2)) make(rules.R5, { when: 'down_repeat', line: m.line, machine: m.id, count: (within24 || within2d) ? last2.length : ev.length, reason: ev[ev.length - 1].reason, span: within24 ? '24 小时内' : '近两日' }); });
    // R6 交接班首小时落后
    d.planHit.forEach(function (p) { var first = p.hours[0], hourPlan = p.plan / (d.shiftHours || 8); if (hourPlan >= 5 && first < hourPlan * th.firstHourRatio) make(rules.R6, { when: 'plan_behind', line: p.line, shift: p.shift === 'A' ? v.shiftA : v.shiftB, actual: fmtN(first), plan: fmtN(r0(hourPlan)) }); });
    return out;
  }
  function handleException(raw, lib, id) { var d = ensure(raw); var R = run(d, lib), ex = R.alerts.filter(function (x) { return x.id === id || x.key === id; })[0]; if (!ex || ex.status !== 'open') return d; d._cl = R.bottleneck.line.id; d.exceptions[ex.key] = 'doing'; { if (ex.savedH > 0) addLedger(d, { source: ex.key, action: ex.action, kind: ex.kind === 'quality' ? 'rework' : ex.kind === 'down' ? 'down' : 'wait', savedH: ex.savedH, line: ex.line, isBottleneck: ex.line === R.bottleneck.line.id, role: ex.roleName, basis: '按规则表预计' }); pushLog(d, 'exception', '处置异常 ' + id, ex.ruleName + ' · ' + ex.cause + ' · ' + ex.action + ' · ' + ex.roleName); } return d; }

  // ---------- 时间损失与两率 ----------
  function lossWaterfall(d, lib, lineId, scope, seqSaved) {
    var v = V(d, lib), es = erpSample(d, lib), L = byId(es.lines), line = L[lineId];
    var rows = scope === 'week' ? d.lossToday.filter(function (x) { return x.line === lineId; }) : d.lossToday.filter(function (x) { return x.line === lineId && x.date === d.today; });
    var days = scope === 'week' ? effectiveDays(d) : 0.5;
    var T = sum(rows, function (x) { return x.plannedMin; }), Sm = sum(rows, function (x) { return x.setupMin; }), D = sum(rows, function (x) { return x.downMin; }), Wk = {}, Wt = 0;
    v.waitReasons.forEach(function (k) { Wk[k] = sum(rows, function (x) { return x.waitMin[k] || 0; }); Wt += Wk[k]; });
    var Vm = sum(rows, function (x) { return x.speedMin; }), Q = sum(rows, function (x) { return x.reworkMin; });
    var R = T - Sm - D - Wt, eff = R - Vm - Q;
    var per = function (m) { return r1(m / 60 / Math.max(0.5, days)); };
    var items = [{ id: 'setup', label: v.setup, value: -per(Sm) }, { id: 'down', label: v.down, value: -per(D) }];
    v.waitReasons.forEach(function (k) { if (Wk[k] > 0) items.push({ id: 'wait:' + k, label: k, value: -per(Wk[k]) }); });
    items.push({ id: 'speed', label: v.speed, value: -per(Vm) }); items.push({ id: 'rework', label: v.rework, value: -per(Q) });
    items = items.filter(function (x) { return x.value !== 0; }).sort(function (a, b) { return a.value - b.value; });
    var startV = per(T), endV = r1(startV + sum(items, function (x) { return x.value; }));
    var firstPieceH = per(Wk[v.waitReasons[2]] || 0) * (lib.improveLib.recoverRates.firstPiece || 0.8);
    var setupSaved = seqSaved != null ? seqSaved : 0;
    var weeklySeries = d.lossWeekly.filter(function (x) { return x.line === lineId; }).map(function (x) { var w = sum(Object.keys(x.waitMin).map(function (k) { return x.waitMin[k]; })); var Rw = x.plannedMin - x.setupMin - x.downMin - w; return { week: x.week, effUtil: r1(100 * (Rw - x.speedMin - x.reworkMin) / x.plannedMin), availability: r1(100 * Rw / x.plannedMin), setupH: r1(x.setupMin / 60) }; });
    return { line: { id: lineId, name: line ? line.name : lineId }, scope: scope, days: days, start: { label: '计划 ' + v.run + '时间', value: startV }, end: { label: v.cutting, value: endV }, items: items,
      availability: T ? r0(100 * R / T) : 0, performance: R ? r0(100 * (R - Vm) / R) : 0, effUtil: T ? r0(100 * eff / T) : 0, primary: items[0] || null,
      waitDist: v.waitReasons.map(function (k) { return { label: k, value: per(Wk[k]), hi: k === v.waitReasons[2] }; }),
      recoverable: { setup: r1(setupSaved), firstPiece: r1(firstPieceH), total: r1(setupSaved + firstPieceH), unitsPerWeek: null }, weekly: weeklySeries };
  }

  // ---------- 标准工时校准 ----------
  function calibrateStd(d, lib) {
    var v = V(d, lib), es = erpSample(d, lib), P = byId(es.products), rows = [];
    d.stdStats.forEach(function (s) {
      var dev = s.std ? (s.median - s.std) / s.std : 0, iqr = s.median ? (s.p75 - s.p25) / s.median : 1, stable = s.n >= 8 && iqr < 0.25;
      var status = Math.abs(dev) >= 0.15 && stable ? 'expired' : 'keep';
      var k = s.product + '|' + s.op;
      rows.push({ key: k, product: s.product, productName: P[s.product] ? P[s.product].name : s.product, op: s.op, line: s.line, std: s.std, median: s.median, dev: r1(dev * 100), n: s.n, iqrRatio: r2(iqr), stable: stable, status: status, statusName: status === 'expired' ? '过期' : '维持', direction: dev > 0 ? '排程偏乐观' : dev < 0 ? '标准偏松' : '一致', suggest: status === 'expired' ? Math.ceil(s.median * 1e4) / 1e4 : null, adopted: !!d.adopted[k] });
    });
    rows.sort(function (a, b) { return (a.status === 'expired' ? 0 : 1) - (b.status === 'expired' ? 0 : 1) || Math.abs(b.dev) - Math.abs(a.dev); });
    return rows;
  }
  function adoptStd(raw, lib, product, op) { var d = ensure(raw); var row = calibrateStd(d, lib).filter(function (x) { return x.product === product && x.op === op; })[0]; if (!row || row.status !== 'expired' || row.adopted) return d; d.adopted[row.key] = row.suggest; pushLog(d, 'std', '采纳标准工时', row.productName + ' ' + row.op + ' ' + row.std + ' → ' + row.suggest + ' h/' + V(d, lib).unit + ' · ' + roleName(d, lib, 'eng') + '复核'); return d; }

  // ---------- 按瓶颈节拍投料 ----------
  function buffer(d, lib, S, es, B) {
    var v = V(d, lib), L = byId(es.lines), cl = L[B.line.id], rel = L[d.releaseLine], SL = byId(S.lines);
    var hoursT = B.wip.tomorrow.hours, max = B.wip.maxHours, hpu = B.hpu || 0.001;
    var status = hoursT >= max ? 'over' : hoursT >= max * 2 / 3 ? 'red' : hoursT >= max / 3 ? 'yellow' : 'green';
    var dailyOut = cl.capHoursPerDay * (cl.eff || 1);
    var allowedUnits = Math.max(0, r0((max - (hoursT - dailyOut)) / hpu));
    var relHpu = hpuOfLine(es, d.releaseLine) || hpu, before = SL[d.releaseLine] ? SL[d.releaseLine].days[1].used : 0;
    // 明日在放行线上开工且路线经过约束线的批次，按交期从松到紧暂缓
    var lots = [];
    S.orders.forEach(function (o) { if (o.status === 'done') return; var first = o.ops.filter(function (p) { return p.line === d.releaseLine && !p.done; })[0]; if (!first || first.startDay !== 1) return; if (!o.ops.some(function (p) { return p.line === B.line.id; })) return; lots.push({ id: o.id, product: o.productName, qty: o.qty, dueDay: o.dueDay, hours: r1(first.remain || first.work) }); });
    lots.sort(function (a, b) { return b.dueDay - a.dueDay; });
    var held = [], released = 0, keep = 0;
    lots.forEach(function (l) { if (released + l.qty <= allowedUnits) { released += l.qty; keep += l.hours; } else held.push(l); });
    var after = lots.length ? Math.min(before, r1(keep + Math.max(0, before - sum(lots, function (l) { return l.hours; })))) : before;
    if (held.length === 0 && lots.length) after = before;
    return { line: B.line, hours: hoursT, today: B.wip.today.hours, max: max, capDays: B.wip.capDays, status: status, statusName: { over: '超限', red: '红', yellow: '黄', green: '绿' }[status], units: B.wip.tomorrow.units, maxUnits: B.wip.maxUnits,
      release: { line: { id: d.releaseLine, name: rel ? rel.name : '' }, allowedUnits: allowedUnits, before: r1(before), after: r1(after), freedHours: r1(Math.max(0, before - after)), heldLots: held, lots: lots, date: S.days ? S.days[1].date : addDays(d.today, 1) },
      wipDays: { before: r1(hoursT / cl.capHoursPerDay), after: r1(Math.min(hoursT, max) / cl.capHoursPerDay) }, applied: !!d.releasePlan };
  }
  function applyRelease(raw, lib) { var d = ensure(raw); if (d.releasePlan) return d; var R = run(d, lib), b = R.buffer; d._cl = R.bottleneck.line.id; d.releasePlan = { date: b.release.date, allowedUnits: b.release.allowedUnits, before: b.release.before, after: b.release.after, freedHours: b.release.freedHours, heldLots: b.release.heldLots.map(function (l) { return l.id; }), wipDaysBefore: b.wipDays.before, wipDaysAfter: b.wipDays.after }; if (b.release.freedHours > 0) addLedger(d, { source: 'release', action: '按' + R.bottleneck.line.name + '节拍' + V(d, lib).release, kind: 'release', savedH: b.release.freedHours, line: d.releaseLine, isBottleneck: false, role: roleName(d, lib, 'foreman'), basis: b.release.line.name + '明日计划 ' + b.release.before + ' → ' + b.release.after + ' h' }); pushLog(d, 'release', V(d, lib).release + '计划下发', b.release.line.name + ' ' + short(b.release.date) + ' 计划 ' + b.release.before + ' → ' + b.release.after + ' h · 暂缓 ' + b.release.heldLots.length + ' 个' + V(d, lib).lot + ' · ' + roleName(d, lib, 'foreman')); return d; }

  // ---------- 换型合批 ----------
  function setupCost(d, a, b, factor) { var m = d.setupMatrix, c = a.product === b.product ? m.sameProduct : a.fixture === b.fixture ? m.sameFixture : m.diffFixture; return r0(c * (factor == null ? 1 : factor)); }
  function seqCost(d, seq, factor) { var t2 = 0, ch = 0; for (var i = 1; i < seq.length; i++) { var c = setupCost(d, seq[i - 1], seq[i], factor); t2 += c; if (c >= r0(d.setupMatrix.sameFixture * (factor == null ? 1 : factor))) ch++; } return { minutes: t2, changeovers: ch }; }
  function seqOk(seq) { var n = seq.length; for (var i = 0; i < n; i++) { if (seq[i].dueDay <= 1 && i >= Math.ceil(n / 2)) return false; } return true; }
  function sequenceJobs(d, lib, setupMin) {
    var v = V(d, lib), jobs = d.jobsToday.slice(), factor = setupMin != null ? setupMin / d.setupMatrix.diffFixture : 1;
    var before = seqCost(d, jobs, factor), best = null, bestCost = Infinity, bestKey = '';
    var n = jobs.length, used = new Array(n), cur = [];
    function rec() {
      if (cur.length === n) { if (!seqOk(cur)) return; var c = seqCost(d, cur, factor); var key = cur.map(function (j) { return j.id; }).join(','); if (c.minutes < bestCost || (c.minutes === bestCost && key < bestKey)) { bestCost = c.minutes; best = cur.slice(); bestKey = key; } return; }
      // 剪枝：交期紧的批次只能在前半段
      var half = Math.ceil(n / 2);
      for (var i = 0; i < n; i++) { if (used[i]) continue; if (jobs[i].dueDay <= 1 && cur.length >= half) continue; used[i] = true; cur.push(jobs[i]); rec(); cur.pop(); used[i] = false; }
    }
    if (n <= 9) rec(); else { best = jobs.slice(); }
    if (!best) best = jobs.slice();
    var after = seqCost(d, best, factor);
    var steps = { internal: sum(d.setupSteps.filter(function (s) { return s.internal; }), function (s) { return s.min; }), external: sum(d.setupSteps.filter(function (s) { return !s.internal; }), function (s) { return s.min; }) };
    var es = erpSample(d, lib), wd = workdaysPerWeek(es);
    var rows = best.map(function (j, i) { var c = i ? setupCost(d, best[i - 1], j, factor) : 0; var kind = i ? (best[i - 1].product === j.product ? v.setupKinds.sameProduct : best[i - 1].fixture === j.fixture ? v.setupKinds.sameFixture : v.setupKinds.diffFixture) : '—'; return { seq: i + 1, id: j.id, order: j.order, product: j.product, qty: j.qty, dueDay: j.dueDay, fixture: j.fixture, program: j.program, setupMin: c, kind: kind }; });
    return { before: { seq: jobs.map(function (j) { return j.id; }), changeovers: before.changeovers, minutes: before.minutes }, after: { seq: best.map(function (j) { return j.id; }), changeovers: after.changeovers, minutes: after.minutes, rows: rows },
      savedMin: before.minutes - after.minutes, savedHPerDay: r1((before.minutes - after.minutes) / 60), savedHPerWeek: r1((before.minutes - after.minutes) / 60 * wd), dueOk: seqOk(best), factor: factor, setupMin: setupMin != null ? setupMin : d.setupMatrix.diffFixture, steps: steps, applied: !!d.jobSeq };
  }
  function applySequence(raw, lib, setupMin) { var d = ensure(raw); if (d.jobSeq) return d; var R = run(d, lib), q = sequenceJobs(d, lib, setupMin); d._cl = R.bottleneck.line.id; if (q.savedMin <= 0 || !q.dueOk) { pushLog(d, 'sequence', 'AI 重排今日' + V(d, lib).lot + '顺序', '当前顺序已满足交期约束，无可省' + V(d, lib).setup + '时间'); return d; } d.jobSeq = { seq: q.after.seq, savedMin: q.savedMin, savedHPerDay: q.savedHPerDay, setupMin: q.setupMin, changeovers: [q.before.changeovers, q.after.changeovers] }; addLedger(d, { source: 'sequence', action: V(d, lib).setup + '合批 · ' + R.bottleneck.line.name, kind: 'setup', savedH: q.savedHPerWeek, line: R.bottleneck.line.id, isBottleneck: true, role: roleName(d, lib, 'eng'), basis: '每日 ' + q.savedHPerDay + ' h × ' + workdaysPerWeek(erpSample(d, lib)) + ' 个工作日' }); pushLog(d, 'sequence', 'AI 重排今日' + V(d, lib).lot + '顺序', R.bottleneck.line.name + ' ' + V(d, lib).setup + ' ' + q.before.changeovers + ' 次 ' + r1(q.before.minutes / 60) + ' h → ' + q.after.changeovers + ' 次 ' + r1(q.after.minutes / 60) + ' h · 省 ' + q.savedHPerDay + ' h/日'); return d; }

  // ---------- 改善预演 ----------
  function metricsOf(d, lib, S, es, B0) {
    var cl = B0.line.id, SL = byId(S.lines), L = byId(es.lines), l = SL[cl], hpu = hpuOfLine(es, cl) || 0.001;
    var stageLines = (stages(d, lib, es).filter(function (st) { return st.lines.indexOf(cl) >= 0; })[0] || { lines: [cl] }).lines;
    var stageUnits = 0; stageLines.forEach(function (id) { var sl2 = SL[id]; if (!sl2) return; var h2 = hpuOfLine(es, id) || hpu; stageUnits += sum(sl2.days.slice(0, 7), function (x) { return x.used; }) * (L[id].eff || 1) / h2; });
    var used7 = sum(l.days.slice(0, 7), function (x) { return x.used; });
    var open = S.orders.filter(function (o) { return o.status !== 'done'; });
    var flow = open.length ? sum(open, function (o) { return o.finishF; }) / open.length : 0;
    var spare = SL[d.spare.line];
    return { load: l.load7, queueDays: queueDaysOf(S, [cl]), weeklyUnits: r0(stageUnits), lineUnits: r0(used7 * (L[cl].eff || 1) / hpu), flowIndex: r2(flow), otHours: r1(sum(S.lines, function (x) { return x.overtimeHours || 0; })), spareLoad: spare ? spare.load7 : null, wipTomorrow: wipCurve(S, es, [cl], 2)[1].hours };
  }
  function improveCards(d, lib) { return lib.improveLib.cards.map(function (c) { var o = clone(c); o.name = t(d, lib, o.name); o.desc = t(d, lib, o.desc); o.roleName = roleName(d, lib, o.role); o.params.forEach(function (p) { p.label = t(d, lib, p.label); if (p.key === 'support' && d.spare.defaultSupport != null) p.default = d.spare.defaultSupport; if (p.key === 'setupMin' && p.default == null) p.default = d.setupMatrix.diffFixture; if (p.key === 'lunchH' && d.lunchH != null) p.default = d.lunchH; }); (o.milestones || []).forEach(function (m) { m.title = t(d, lib, m.title); }); return o; }); }
  function modsFor(d, lib, key, params, seqSaved, firstPieceH, clId) {
    var cl = clId || d._cl || d.constraintExpected;
    return function (es) {
      var L = byId(es.lines);
      if (key === 'A') { L[cl].capHoursPerDay = r1(L[cl].capHoursPerDay + seqSaved); }
      if (key === 'B') { var sp = L[d.spare.line], n = params.support == null ? (d.spare.defaultSupport == null ? 2 : d.spare.defaultSupport) : params.support; if (n > 0) { sp.capHoursPerDay = r1(sp.capHoursPerDay + d.spare.capPerPerson * n); sp.crew = sp.crew + n; if (d.spare.effTo) sp.eff = Math.max(sp.eff || 1, d.spare.effTo);
        if (d.spare.line !== cl) { // 约束线上未开工、交期最紧的批次改到备用线（每名支援人员分流一个批次）
          var S0 = lib.erp.schedule(clone(es)), cands = S0.orders.filter(function (o) { return o.status !== 'done' && o.ops.some(function (p) { return p.line === cl && !p.done && !p.inProgress && sp.ops.indexOf(p.op) >= 0; }); }).sort(function (a, b) { return a.dueDay - b.dueDay || a.id.localeCompare(b.id); }).slice(0, n);
          cands.forEach(function (o) { var od = byId(es.orders)[o.id]; od.overrides = od.overrides || {}; od.overrides.lines = od.overrides.lines || {}; o.ops.forEach(function (p) { if (p.line === cl && !p.done && !p.inProgress && sp.ops.indexOf(p.op) >= 0) od.overrides.lines[p.op] = d.spare.line; }); });
        } } }
      if (key === 'C') { L[cl].capHoursPerDay = r1(L[cl].capHoursPerDay + (params.lunchH == null ? d.lunchH : params.lunchH) + firstPieceH); }
      if (key === 'D') { es.overtime = es.overtime || []; es.overtime.push({ line: cl, from: 0, days: 7, hours: params.otHours == null ? 3 : params.otHours }); }
    };
  }
  function preview(d, lib, keys, params, ctx) {
    params = params || {};
    var v = V(d, lib), base = ctx || run(d, lib), es0 = base.es, S0 = base.S, B0 = base.bottleneck, m0 = base.metrics;
    var seqSaved = sequenceJobs(d, lib, params.setupMin).savedHPerDay, firstPieceH = base.loss.recoverable.firstPiece;
    var cards = improveCards(d, lib), byKey = {}; cards.forEach(function (c) { byKey[c.key] = c; });
    function evalKeys(ks) {
      var r = simOf(d, lib, function (es) { ks.forEach(function (k) { modsFor(d, lib, k, params, seqSaved, firstPieceH, B0.line.id)(es); }); });
      var m = metricsOf(d, lib, r.S, r.es, B0), L = byId(es0.lines), L2 = byId(r.es.lines), notes = [];
      ks.forEach(function (k) { if (k === 'A' || k === 'C') notes.push(B0.line.name + ' 日可用 ' + L[B0.line.id].capHoursPerDay + ' → ' + L2[B0.line.id].capHoursPerDay + ' h'); if (k === 'B') notes.push(L[d.spare.line].name + ' 日可用 ' + L[d.spare.line].capHoursPerDay + ' → ' + L2[d.spare.line].capHoursPerDay + ' h · ' + v.support + ' ' + (params.support == null ? (d.spare.defaultSupport == null ? 2 : d.spare.defaultSupport) : params.support) + ' 人'); if (k === 'D') notes.push(B0.line.name + ' 未来 7 个工作日每天加班 ' + (params.otHours == null ? 3 : params.otHours) + ' h'); });
      var cost = ks.indexOf('D') >= 0 ? lib.erp.overtimeCost(r.es, B0.line.id, params.otHours == null ? 3 : params.otHours, 7) : 0;
      var flowDays = d.weekly.length ? r1(d.weekly[d.weekly.length - 1].flowDays * (m0.flowIndex ? m.flowIndex / m0.flowIndex : 1)) : null;
      return { keys: ks, metrics: m, notes: notes, cost: cost, flowDays: flowDays, deltas: { queueDays: r1(m.queueDays - m0.queueDays), weeklyUnits: m.weeklyUnits - m0.weeklyUnits, load: m.load - m0.load, otHours: r1(m.otHours - m0.otHours) } };
    }
    var singles = (keys && keys.length ? keys : cards.map(function (c) { return c.key; })).map(function (k) { var e = evalKeys([k]); var c = byKey[k]; return { key: k, name: c.name, desc: c.desc, role: c.role, roleName: c.roleName, params: c.params, milestones: c.milestones, result: e }; });
    var combo = evalKeys(lib.improveLib.combo);
    var rank = singles.slice().sort(function (a, b) { var ao = a.result.metrics.otHours > 0 ? 1 : 0, bo = b.result.metrics.otHours > 0 ? 1 : 0; return ao - bo || a.result.metrics.queueDays - b.result.metrics.queueDays || b.result.metrics.weeklyUnits - a.result.metrics.weeklyUnits || a.key.localeCompare(b.key); });
    var rec = rank[0] ? rank[0].key : null; singles.forEach(function (s) { s.recommended = s.key === rec; });
    var baseFlow = d.weekly.length ? d.weekly[d.weekly.length - 1].flowDays : null;
    return { base: { metrics: m0, flowDays: baseFlow }, cards: singles, combo: { keys: lib.improveLib.combo, name: lib.improveLib.combo.join(' + '), result: combo }, recommended: rec, seqSaved: seqSaved, firstPieceH: r1(firstPieceH) };
  }
  function commitProject(raw, lib, keys, params) {
    var d = ensure(raw); params = params || {};
    var cards = {}; improveCards(d, lib).forEach(function (c) { cards[c.key] = c; });
    keys = (keys || []).filter(function (k, i, a) { return cards[k] && a.indexOf(k) === i; }).sort(); if (!keys.length) return d;
    var R = run(d, lib), pv = preview(d, lib, null, params, R), v = V(d, lib); d._cl = R.bottleneck.line.id;
    var res = keys.length === 1 ? pv.cards.filter(function (c) { return c.key === keys[0]; })[0].result : (keys.join() === lib.improveLib.combo.slice().sort().join() ? pv.combo.result : (function () { var r = simOf(d, lib, function (es) { keys.forEach(function (k) { modsFor(d, lib, k, params, pv.seqSaved, pv.firstPieceH, R.bottleneck.line.id)(es); }); }); return { metrics: metricsOf(d, lib, r.S, r.es, R.bottleneck), keys: keys }; })());
    var id = nextId(d, 'IMP'), ms = [], seen = {};
    keys.forEach(function (k) { (cards[k].milestones || []).forEach(function (m) { var title = t(d, lib, m.title); if (seen[title]) return; seen[title] = true; ms.push({ title: title, due: addDays(d.today, m.days), owner: cards[k].roleName, status: 'pending' }); }); });
    ms.sort(function (a, b) { return a.due.localeCompare(b.due); });
    var proj = { id: id, keys: keys, name: keys.map(function (k) { return cards[k].name; }).join(' + '), owner: cards[keys[0]].roleName, createdAt: d.today, status: 'executing', params: params, target: { queueDays: lib.improveLib.kpiTargets.queueDays, weeklyUnits: res.metrics.weeklyUnits, load: res.metrics.load }, expected: res.metrics, baseline: R.metrics, milestones: ms };
    d.projects.push(proj);
    var wd = workdaysPerWeek(erpSample(d, lib));
    if (keys.indexOf('A') >= 0 && !d.ledger.some(function (l) { return l.source === 'sequence'; })) addLedger(d, { source: 'sequence', action: v.setup + '合批 · ' + R.bottleneck.line.name, kind: 'setup', savedH: r1(pv.seqSaved * wd), line: R.bottleneck.line.id, isBottleneck: true, role: roleName(d, lib, 'eng'), basis: '每日 ' + pv.seqSaved + ' h × ' + wd + ' 个工作日' });
    if (keys.indexOf('C') >= 0) addLedger(d, { source: 'projectC', action: cards.C.name, kind: 'wait', savedH: r1(((params.lunchH == null ? d.lunchH : params.lunchH) + pv.firstPieceH) * wd), line: R.bottleneck.line.id, isBottleneck: true, role: cards.C.roleName, basis: '每日 ' + r1((params.lunchH == null ? d.lunchH : params.lunchH) + pv.firstPieceH) + ' h × ' + wd + ' 个工作日' });
    if (keys.indexOf('B') >= 0) { var n = params.support == null ? (d.spare.defaultSupport == null ? 2 : d.spare.defaultSupport) : params.support; if (n > 0) addLedger(d, { source: 'projectB', action: cards.B.name, kind: 'support', savedH: r1(d.spare.capPerPerson * n * wd), line: d.spare.line, isBottleneck: true, role: cards.B.roleName, basis: n + ' 人 × ' + d.spare.capPerPerson + ' h × ' + wd + ' 个工作日' }); }
    pushLog(d, 'project', '立项 ' + id, proj.name + ' · ' + proj.owner + ' · 目标 ' + v.queue + ' ≤ ' + proj.target.queueDays + ' 天 · 预计 ' + R.metrics.queueDays + ' → ' + res.metrics.queueDays + ' 天');
    return d;
  }
  function setMilestone(raw, lib, projectId, idx, status) { var d = ensure(raw); var p = d.projects.filter(function (x) { return x.id === projectId; })[0]; if (!p || !p.milestones[idx]) return d; p.milestones[idx].status = status; if (p.milestones.every(function (m) { return m.status === 'done'; })) p.status = 'observing'; pushLog(d, 'milestone', p.id + ' 节点' + (status === 'done' ? '完成' : '更新'), p.milestones[idx].title); return d; }

  // ---------- 技能矩阵 ----------
  function levelOf(n, eff) { if (!n) return 0; if (n < 5) return 1; if (eff >= 0.95 && n >= 15) return 3; if (eff >= 0.8) return 2; return 1; }
  function skillMatrix(d, lib) {
    var es = erpSample(d, lib), levels = {}, ops = [];
    es.lines.forEach(function (l) { l.ops.forEach(function (o) { if (ops.indexOf(o) < 0) ops.push(o); }); });
    d.skills.forEach(function (s) { levels[s.emp] = {}; ops.forEach(function (o) { levels[s.emp][o] = 0; }); });
    d.empStats.forEach(function (e) { if (!levels[e.emp]) { levels[e.emp] = {}; ops.forEach(function (o) { levels[e.emp][o] = 0; }); } levels[e.emp][e.op] = levelOf(e.n, e.effMed); });
    var need = {}; es.lines.forEach(function (l) { l.ops.forEach(function (o) { need[o] = (need[o] || 0) + l.crew * shiftsOf(l, V(d, lib)); }); });
    var coverage = ops.map(function (o) { var n = Object.keys(levels).filter(function (e) { return levels[e][o] >= 2; }).length; var ratio = need[o] ? r2(n / need[o]) : null; return { op: o, qualified: n, need: need[o] || 0, ratio: ratio, single: ratio != null && ratio < 1.5 }; });
    var cl = d._cl || d.constraintExpected, L = byId(es.lines), pairs = [];
    L[cl].ops.forEach(function (o) {
      var cov = coverage.filter(function (c) { return c.op === o; })[0]; if (!cov || !cov.single) return;
      var mentors = d.skills.filter(function (s) { return s.home === cl && levels[s.emp][o] === 3; }).map(function (s) { return s.emp; }).sort();
      var trainees = d.skills.filter(function (s) { return levels[s.emp][o] === 1; }).map(function (s) { return s.emp; }).sort();
      trainees.slice(0, 2).forEach(function (tr, i) { if (mentors[i % Math.max(1, mentors.length)]) pairs.push({ op: o, trainee: tr, mentor: mentors[i % mentors.length], added: d.training.some(function (x) { return x.trainee === tr && x.op === o; }) }); });
    });
    return { ops: ops, levels: levels, coverage: coverage, pairs: pairs };
  }
  function addTraining(raw, lib, trainee, op) { var d = ensure(raw); if (d.training.some(function (x) { return x.trainee === trainee && x.op === op; })) return d; var sm = skillMatrix(d, lib); if (!d.skills.some(function (s) { return s.emp === trainee; }) || sm.ops.indexOf(op) < 0) return d; var pair = sm.pairs.filter(function (p) { return p.trainee === trainee && p.op === op; })[0]; d.training.push({ id: nextId(d, 'TR'), trainee: trainee, mentor: pair ? pair.mentor : null, op: op, start: d.today }); pushLog(d, 'training', '加入本周带教', trainee + ' 由 ' + (pair ? pair.mentor : '—') + ' 带教 ' + op); return d; }

  // ---------- 明日派工与跨线支援 ----------
  function dispatch(d, lib, S, es, B) {
    var v = V(d, lib), L = byId(es.lines), SL = byId(S.lines), sm = skillMatrix(d, lib), E = byId(d.employees.map(function (e) { return { id: e.id, job: e.job, overtimeH: e.overtimeH }; }));
    var home = {}; d.skills.forEach(function (s) { home[s.emp] = s.home; });
    var dayIdx = 1, date = S.days ? S.days[dayIdx].date : addDays(d.today, 1), rest = S.days ? S.days[dayIdx].rest : false;
    var projB = d.projects.filter(function (p) { return p.keys.indexOf('B') >= 0; })[0], supportN = projB ? (projB.params.support == null ? (d.spare.defaultSupport == null ? 2 : d.spare.defaultSupport) : projB.params.support) : 0;
    var rows = [], unmet = [], usedEmp = {}, otCap = d.otCap || { month: 36, day: 3 };
    var lineOrder = S.lines.slice().sort(function (a, b) { return b.load7 - a.load7 || a.id.localeCompare(b.id); });
    var lowLines = S.lines.filter(function (l) { return l.load7 < 65; }).map(function (l) { return l.id; });
    var leaders = {}; d.employees.forEach(function (e) { if (e.job === 'leader' || e.job === 'mgr') leaders[e.id] = true; });
    function candidates(l, opts) {
      return d.skills.filter(function (s) { return !usedEmp[s.emp] && !leaders[s.emp]; })
        .map(function (s) { var e = E[s.emp] || { overtimeH: 0 }; var lv = Math.max.apply(null, l.ops.map(function (o) { return (sm.levels[s.emp] && sm.levels[s.emp][o]) || 0; })); var isHome = s.home === l.id; var donor = !isHome; var lowHome = !s.home || lowLines.indexOf(s.home) >= 0 || (SL[s.home] && SL[s.home].days[dayIdx].used === 0); return { emp: s.emp, home: s.home, level: lv, ot: e.overtimeH, isHome: isHome, donor: donor, lowHome: lowHome }; })
        .filter(function (c) { return opts.support ? (!c.isHome && c.lowHome && c.level >= 2) : opts.assist ? (c.isHome && c.level === 1) : opts.donor ? (c.donor && c.level >= 2) : (c.isHome && c.level >= 2); })
        .sort(function (a, b) { return (b.lowHome ? 1 : 0) - (a.lowHome ? 1 : 0) || a.ot - b.ot || b.level - a.level || a.emp.localeCompare(b.emp); });
    }
    var counters = {};
    function place(l, shiftName, c, isSupportShift) { var k = l.id + '|' + shiftName; counters[k] = (counters[k] || 0) + 1; usedEmp[c.emp] = true; rows.push({ line: l.id, lineName: l.name, shift: shiftName, station: (l.ops[0] || '') + ' ' + pad(counters[k]), emp: c.emp, level: c.level, support: !c.isHome, assist: !!c.assist, home: c.home ? (L[c.home] ? L[c.home].name : c.home) : '', overtimeH: c.ot, otPlanned: 0, isSupportShift: !!isSupportShift }); }
    // 第一遍：各线各班先用本线人员（2 级以上，不够时 1 级副手补位）；第二遍：缺口由低负荷线的多能工支援；最后：备用线第二班只用支援人员
    var gaps = [];
    lineOrder.forEach(function (sl) {
      var l = L[sl.id]; if (!l) return;
      var active = sl.days[dayIdx].used > 0 && !rest; if (!active) return;
      var shifts = shiftsOf(l, v);
      for (var si = 0; si < shifts; si++) {
        var shiftName = si === 0 ? v.shiftA : v.shiftB, need = l.crew;
        var picked = candidates(l, {}).slice(0, need);
        if (picked.length < need) picked = picked.concat(candidates(l, { assist: true }).slice(0, need - picked.length).map(function (c) { c.assist = true; return c; }));
        picked.forEach(function (c) { place(l, shiftName, c, false); });
        if (picked.length < need) gaps.push({ l: l, shiftName: shiftName, missing: need - picked.length });
      }
    });
    gaps.forEach(function (g) { var picked = candidates(g.l, { donor: true }).slice(0, g.missing); picked.forEach(function (c) { place(g.l, g.shiftName, c, false); }); if (picked.length < g.missing) unmet.push({ line: g.l.name, shift: g.shiftName, missing: g.missing - picked.length }); });
    if (supportN > 0 && L[d.spare.line]) { var spl = L[d.spare.line], sp = candidates(spl, { support: true }).slice(0, supportN); sp.forEach(function (c) { place(spl, v.secondShift, c, true); }); if (sp.length < supportN) unmet.push({ line: spl.name, shift: v.secondShift, missing: supportN - sp.length }); }
    var over = d.employees.filter(function (e) { return e.overtimeH > otCap.month; });
    var supportRows = rows.filter(function (r) { return r.support; });
    var es2 = erpSample(d, lib), wd = workdaysPerWeek(es2);
    var otWeekBefore = d.weekly.length ? d.weekly[d.weekly.length - 1].otHours : 0;
    var otWeekAfter = Math.max(0, r0(otWeekBefore - (projB ? d.spare.capPerPerson * supportN * wd : 0)));
    return { id: 'DP-' + date.slice(5).replace('-', ''), date: date, rest: rest, rows: rows, need: rows.length + sum(unmet, function (u) { return u.missing; }), filled: rows.length, assists: rows.filter(function (r) { return r.assist; }).length, support: supportRows.length, supportEmps: supportRows.map(function (r) { return r.emp; }), unmet: unmet,
      overLimit: over.length, overLimitNoOt: over.length, otWeek: { before: otWeekBefore, after: otWeekAfter, delta: r0(otWeekAfter - otWeekBefore) }, secondShift: !!projB && supportN > 0, applied: !!d.dispatch };
  }
  function applyDispatch(raw, lib) { var d = ensure(raw); if (d.dispatch) return d; var R = run(d, lib), p = R.dispatch; d._cl = R.bottleneck.line.id; d.dispatch = { id: p.id, date: p.date, rows: p.rows, support: p.supportEmps, otWeek: p.otWeek }; if (p.otWeek.delta < 0) addLedger(d, { source: 'dispatch', action: V(d, lib).dispatch + ' ' + p.id + ' · ' + V(d, lib).support + '替代加班', kind: 'ot', savedH: -p.otWeek.delta, line: d.spare.line, isBottleneck: false, role: roleName(d, lib, 'foreman'), basis: '本周加班 ' + p.otWeek.before + ' → ' + p.otWeek.after + ' h' }); pushLog(d, 'dispatch', V(d, lib).dispatch + ' ' + p.id + ' 已下发', p.filled + ' 人 · ' + V(d, lib).support + ' ' + p.support + ' 人 · 未覆盖 ' + sum(p.unmet, function (u) { return u.missing; }) + ' · ' + roleName(d, lib, 'foreman')); return d; }

  // ---------- 保养到期与保养窗口 ----------
  function maintenance(d, lib, S, es, B) {
    var v = V(d, lib), L = byId(es.lines), SL = byId(S.lines), out = [];
    d.machines.forEach(function (m) {
      var runDue = m.cumRunH >= 0.9 * m.pmIntervalH, toolDue = m.tooling && m.tooling.usedUnits >= 0.9 * m.tooling.lifeUnits;
      var s12 = m.stops12w || [], avg = s12.length ? sum(s12) / s12.length : 0, last2 = s12.slice(-2), trend = last2.length === 2 && avg > 0 && (last2[0] + last2[1]) / 2 > 1.5 * avg;
      if (!runDue && !toolDue && !trend) return;
      var sl = SL[m.line], best = null;
      if (sl) sl.days.slice(0, 7).forEach(function (day, i) { if (i === 0) return; if (m.line === B.line.id && B.wip.curve[i] && B.wip.curve[i].hours >= B.wip.maxHours * 2 / 3 && !day.rest) return; var score = day.rest ? -1 : day.pct; if (!best || score < best.score) best = { d: i, date: day.date, label: day.label, rest: day.rest, pct: day.pct, score: score }; });
      var reasons = []; if (runDue) reasons.push('距上次' + v.maint + '运行 ' + m.cumRunH + ' / ' + m.pmIntervalH + ' h'); if (toolDue) reasons.push(v.tooling + ' ' + m.tooling.id + ' 寿命 ' + r0(100 * m.tooling.usedUnits / m.tooling.lifeUnits) + '%'); if (trend) reasons.push('近两周' + v.down + ' ' + (last2[0] + last2[1]) + ' 次（周均 ' + r1(avg) + '）');
      var sched = d.maintenance.filter(function (x) { return x.machine === m.id; })[0];
      out.push({ machine: m.id, line: m.line, lineName: L[m.line] ? L[m.line].name : m.line, reasons: reasons, minutes: m.pmMinutes, window: best ? { d: best.d, date: best.date, label: best.label + (best.rest ? '（休息日）' : ''), pct: best.pct } : null, role: roleName(d, lib, 'maint'), scheduled: !!sched, scheduledAt: sched ? sched.date : null, savedH: r1(Math.max(0.5, (last2.length === 2 ? (last2[0] + last2[1]) / 2 : 0) - avg) * 0.7 + 0.5) });
    });
    return out;
  }
  function scheduleMaint(raw, lib, machineId) { var d = ensure(raw); if (d.maintenance.some(function (x) { return x.machine === machineId; })) return d; var R = run(d, lib), m = R.maintenance.filter(function (x) { return x.machine === machineId; })[0]; d._cl = R.bottleneck.line.id; if (!m || !m.window) return d; d.maintenance.push({ id: nextId(d, 'PM'), machine: machineId, line: m.line, date: m.window.date, d: m.window.d, minutes: m.minutes }); addLedger(d, { source: 'maint:' + machineId, action: V(d, lib).maint + ' ' + machineId + ' 排入窗口', kind: 'down', savedH: m.savedH, line: m.line, isBottleneck: m.line === R.bottleneck.line.id, role: m.role, basis: '按近两周高于 12 周均值的' + V(d, lib).down + '次数折算' }); pushLog(d, 'maint', V(d, lib).maint + ' ' + machineId + ' 已排入', m.window.label + ' · ' + m.minutes + ' min · ' + m.role); return d; }

  // ---------- 小时节拍 ----------
  function planHit(d, lib, es) {
    var v = V(d, lib), L = byId(es.lines), th = lib.rules.thresholds;
    return d.planHit.map(function (p) { var hourPlan = p.plan / (d.shiftHours || 8), elapsed = p.hours.length, target = r0(hourPlan * elapsed), actual = p.hours[p.hours.length - 1], pct = target ? r0(100 * actual / target) : 0; return { line: p.line, lineName: L[p.line] ? L[p.line].name : p.line, shift: p.shift === 'A' ? v.shiftA : v.shiftB, plan: p.plan, target: target, actual: actual, pct: pct, behind: pct < 85, firstHourBehind: p.hours[0] < hourPlan * th.firstHourRatio, hours: p.hours }; });
  }

  // ---------- 增效账 ----------
  function addLedger(d, e) { d.ledger = d.ledger.filter(function (x) { return x.source !== e.source; }); var mx = 0; d.ledger.forEach(function (x) { var n = parseInt(String(x.id).slice(3), 10); if (n > mx) mx = n; }); e.id = 'LG-' + pad(mx + 1); e.at = d.today; d.ledger.push(e); }
  function ledger(d, lib, B) {
    var v = V(d, lib), KN = { setup: v.setup, wait: v.wait, rework: v.rework, down: v.down, ot: '加班', release: v.release, support: v.support };
    var rows = d.ledger.map(function (x) { return { id: x.id, source: x.source, action: x.action, kind: x.kind, kindName: KN[x.kind] || LEDGER_KIND[x.kind] || x.kind, savedH: x.savedH, line: x.line, isBottleneck: x.isBottleneck, role: x.role, basis: x.basis, units: x.isBottleneck && x.kind !== 'ot' ? r0(x.savedH / (B.hpu || 1)) : 0 }; });
    var bottleneckH = r1(sum(rows.filter(function (x) { return x.isBottleneck && x.kind !== 'ot'; }), function (x) { return x.savedH; }));
    var nonBottleneckH = r1(sum(rows.filter(function (x) { return !x.isBottleneck && x.kind !== 'ot'; }), function (x) { return x.savedH; }));
    var otH = r1(sum(rows.filter(function (x) { return x.kind === 'ot'; }), function (x) { return x.savedH; }));
    var byKind = {}; rows.forEach(function (x) { if (x.kind === 'ot') return; byKind[x.kind] = (byKind[x.kind] || 0) + x.savedH; });
    return { rows: rows, totals: { bottleneckH: bottleneckH, nonBottleneckH: nonBottleneckH, units: r0(bottleneckH / (B.hpu || 1)), otH: otH, count: rows.length }, byKind: Object.keys(byKind).map(function (k) { return { kind: k, label: KN[k] || LEDGER_KIND[k] || k, value: r1(byKind[k]) }; }), counterText: '本周 AI 建议预计节省 ' + fmtH(bottleneckH + nonBottleneckH) };
  }

  // ---------- 周报与效果核验 ----------
  function weekly(d, lib, R) {
    var v = V(d, lib), W = d.weekly, last = W[W.length - 1], cur = { week: d.weekStart, effUtil: R.loss.effUtil, flowDays: last.flowDays, otHours: last.otHours, fpy: last.fpy, wipDays: R.bottleneck.wipDays, output: last.output };
    var series = W.map(function (w) { return { week: w.week, label: short(w.week), effUtil: w.effUtil, flowDays: w.flowDays, otHours: w.otHours, fpy: w.fpy, wipDays: w.wipDays, output: w.output, planHit: w.planHit }; });
    var anomalies = []; ['effUtil', 'flowDays', 'otHours'].forEach(function (k) { var vals = W.map(function (w) { return w[k]; }), mean = sum(vals) / vals.length, sd = Math.sqrt(sum(vals, function (x) { return (x - mean) * (x - mean); }) / vals.length); W.forEach(function (w) { if (Math.abs(w[k] - mean) > 1.5 * sd && sd > 0) anomalies.push({ week: w.week, key: k, value: w[k] }); }); });
    var pv = R.preview, after = R.committed ? R.committed.metrics : null;
    var compare = [
      { k: v.bottleneck + '负荷', before: R.metrics.load + '%', after: after ? after.load + '%' : '—' },
      { k: v.queue, before: R.metrics.queueDays + ' 天', after: after ? after.queueDays + ' 天' : '—' },
      { k: v.capacity, before: fmtN(R.metrics.weeklyUnits) + ' ' + v.unit, after: after ? fmtN(after.weeklyUnits) + ' ' + v.unit : '—' },
      { k: '有效利用率', before: R.loss.effUtil + '%', after: after ? Math.min(100, r0(R.loss.effUtil + 100 * sum(R.ledger.rows.filter(function (x) { return x.line === R.bottleneck.line.id && x.kind !== 'ot'; }), function (x) { return x.savedH; }) / (R.bottleneck.capHoursPerDay * workdaysPerWeek(R.es)))) + '%' : '—' },
      { k: '本周加班', before: last.otHours + ' h', after: R.dispatch.otWeek.after + ' h' },
      { k: v.flowDays, before: last.flowDays + ' 天', after: R.committed && R.committed.flowDays != null ? R.committed.flowDays + ' 天' : '—' }
    ];
    var verify = d.projects.map(function (p) { var actual = R.metrics.queueDays; var ok = actual <= p.target.queueDays; var due = p.milestones.length ? p.milestones[p.milestones.length - 1].due : d.today; return { id: p.id, name: p.name, target: v.queue + ' ≤ ' + p.target.queueDays + ' 天', expected: p.expected.queueDays + ' 天', actual: actual + ' 天', status: p.status === 'observing' ? (ok ? 'ok' : 'miss') : 'watch', statusName: p.status === 'observing' ? (ok ? '达标' : '未达标') : '观察中', due: due }; });
    var lines = [];
    lines.push('【' + v.dept + '提效周报】' + d.company + ' · ' + short(d.weekStart) + ' 至 ' + short(addDays(d.weekStart, 6)) + ' 周');
    lines.push('一、' + v.flowName + '：' + v.bottleneck + ' ' + R.bottleneck.line.name + '，负荷 ' + R.metrics.load + '%，' + v.queue + ' ' + R.metrics.queueDays + ' 天；有效利用率 ' + R.loss.effUtil + '%（上周 ' + last.effUtil + '%）；' + v.fpy + ' ' + last.fpy + '%；' + v.wip + '天数 ' + R.bottleneck.wipDays + ' 天');
    lines.push('二、本周异常 ' + R.alerts.length + ' 起，已处置 ' + R.alerts.filter(function (a) { return a.status !== 'open'; }).length + ' 起' + (R.alerts.length ? '：' + R.alerts.slice(0, 3).map(function (a) { return a.ruleName + '（' + a.cause + '）'; }).join('；') : ''));
    var issued = [d.jobSeq ? v.setup + '顺序表' : '', d.releasePlan ? v.release + '计划' : '', d.dispatch ? v.dispatch + ' ' + d.dispatch.id : '', d.maintenance.length ? v.maint + ' ' + d.maintenance.map(function (m) { return m.machine; }).join('/') : '', Object.keys(d.adopted).length ? '标准工时校准 ' + Object.keys(d.adopted).length + ' 项' : ''].filter(Boolean);
    lines.push('三、已下发：' + (issued.length ? issued.join('、') : '无'));
    lines.push('四、改善项目：' + (d.projects.length ? d.projects.map(function (p) { return p.id + ' ' + p.name + '（' + p.owner + '，目标 ' + v.queue + ' ≤ ' + p.target.queueDays + ' 天，预计 ' + p.expected.queueDays + ' 天）'; }).join('；') : '本周无新立项'));
    lines.push('五、增效账：' + (R.ledger.rows.length ? R.ledger.rows.map(function (x) { return x.kindName + ' ' + x.savedH + ' h'; }).join('、') + '，合计 ' + v.bottleneck + '工时 ' + R.ledger.totals.bottleneckH + ' h ≈ ' + fmtN(R.ledger.totals.units) + ' ' + v.unit + '，其他 ' + R.ledger.totals.nonBottleneckH + ' h，加班减少 ' + R.ledger.totals.otH + ' h（均为预计）' : '本周尚无采纳记录'));
    lines.push('六、下周提醒：' + [R.maintenance.filter(function (m) { return !m.scheduled && m.window; }).map(function (m) { return m.machine + ' ' + v.maint + '窗口 ' + m.window.label; }).join('、'), R.calibration.filter(function (c) { return c.status === 'expired' && !c.adopted; }).length ? '标准工时待校准 ' + R.calibration.filter(function (c) { return c.status === 'expired' && !c.adopted; }).length + ' 项' : '', R.skills.pairs.length ? '带教 ' + R.skills.pairs.length + ' 对' : ''].filter(Boolean).join('；') || '无');
    lines.push('收件人：' + v.roles.lead + '、' + v.roles.eng + '、' + v.roles.foreman + '、' + v.roles.maint);
    return { series: series, current: cur, anomalies: anomalies, compare: compare, verify: verify, text: lines.join('\n'), recipients: [v.roles.lead, v.roles.eng, v.roles.foreman, v.roles.maint] };
  }

  // ---------- 汇总 ----------
  function kpi(d, lib, R) {
    var v = V(d, lib);
    return { period: d.weekStart, constraint: R.bottleneck.line.name, load7: R.metrics.load, queueDays: R.metrics.queueDays, balanceRate: R.bottleneck.balanceRate, wipDays: R.bottleneck.wipDays, wipUnits: R.bottleneck.wip.today.units, effUtil: R.loss.effUtil, fpy: (function () { var reps = thisWeekReports(d), g = sum(reps, function (r) { return r.qtyGood; }), t2 = sum(reps, function (r) { return r.qtyGood + r.qtyRework; }); return t2 ? r1(100 * g / t2) : R.weekly.current.fpy; })(), otHours: R.weekly.current.otHours,
      alertsOpen: R.alerts.filter(function (a) { return a.status === 'open'; }).length, alertsTotal: R.alerts.length, reportsPending: R.verify.pending, reportsTotal: R.verify.total, stdExpired: R.calibration.filter(function (c) { return c.status === 'expired' && !c.adopted; }).length,
      projects: d.projects.length, maintDue: R.maintenance.filter(function (m) { return !m.scheduled; }).length, savedH: r1(R.ledger.totals.bottleneckH + R.ledger.totals.nonBottleneckH), weeklyUnits: R.metrics.weeklyUnits, flowDays: R.weekly.current.flowDays, lines: R.S.lines.length, stages: R.flow.length, products: R.es.products.length, lots: R.S.orders.filter(function (o) { return o.status !== 'done'; }).length };
  }
  function run(raw, lib) {
    var d = ensure(raw), v = V(d, lib);
    var sim = simOf(d, lib), S = sim.S, es = sim.es;
    var B = bottleneck(d, lib, S, es);
    d._cl = B.line.id;
    var R = { version: VERSION, data: d, es: es, S: S, vocab: v, bottleneck: B };
    R.metrics = metricsOf(d, lib, S, es, B);
    R.flow = flowCards(d, lib, S, es, B);
    R.verify = verifyReports(d, lib);
    R.sequence = sequenceJobs(d, lib, d.jobSeq ? d.jobSeq.setupMin : null);
    R.loss = lossWaterfall(d, lib, d.focus || B.line.id, 'week', R.sequence.savedHPerDay);
    R.calibration = calibrateStd(d, lib);
    R.buffer = buffer(d, lib, S, es, B);
    R.skills = skillMatrix(d, lib);
    R.alerts = alerts(d, lib, S, es, B);
    R.preview = preview(d, lib, null, {}, R);
    R.committed = null;
    if (d.projects.length) { var p = d.projects[d.projects.length - 1]; var r2x = simOf(d, lib, function (es2) { p.keys.forEach(function (k) { modsFor(d, lib, k, p.params || {}, R.preview.seqSaved, R.preview.firstPieceH, B.line.id)(es2); }); }); var m = metricsOf(d, lib, r2x.S, r2x.es, B); R.committed = { project: p.id, metrics: m, flowDays: d.weekly.length ? r1(d.weekly[d.weekly.length - 1].flowDays * (R.metrics.flowIndex ? m.flowIndex / R.metrics.flowIndex : 1)) : null }; }
    R.dispatch = dispatch(d, lib, S, es, B);
    R.maintenance = maintenance(d, lib, S, es, B);
    R.planHit = planHit(d, lib, es);
    R.ledger = ledger(d, lib, B);
    R.weekly = weekly(d, lib, R);
    R.kpi = kpi(d, lib, R);
    R.improveCards = improveCards(d, lib);
    return R;
  }

  return {
    VERSION: VERSION, MODULE_NAME: MODULE_NAME, CREDITS: CREDITS, EXC_STATUS: EXC_STATUS, LEDGER_KIND: LEDGER_KIND,
    ensure: ensure, run: run, t: t, words: words, V: V, roleName: roleName, stages: stages, simOf: simOf, erpBase: erpBase,
    bottleneck: bottleneck, flowCards: flowCards, verifyReports: verifyReports, confirmReport: confirmReport, confirmAllReports: confirmAllReports,
    alerts: alerts, handleException: handleException, lossWaterfall: lossWaterfall, calibrateStd: calibrateStd, adoptStd: adoptStd,
    buffer: buffer, applyRelease: applyRelease, sequenceJobs: sequenceJobs, applySequence: applySequence, seqCost: seqCost,
    improveCards: improveCards, preview: preview, commitProject: commitProject, setMilestone: setMilestone,
    skillMatrix: skillMatrix, addTraining: addTraining, dispatch: dispatch, applyDispatch: applyDispatch, maintenance: maintenance, scheduleMaint: scheduleMaint,
    planHit: planHit, ledger: ledger, weekly: weekly, kpi: kpi, spcLimits: spcLimits, queueDaysOf: queueDaysOf, wipCurve: wipCurve,
    fmtN: fmtN, fmtH: fmtH, short: short, addDays: addDays, fill: fill, r1: r1
  };
});
