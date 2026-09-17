/*
 * AI ERP · 订单交付指挥室 内核
 * 一个确定性的排程引擎：把在手订单按（优先级、交期、接单时间）顺序，沿各自的工序路线
 * 在产线日历上向前排，得到每道工序的开工/完工、每张订单的预计完工与延期归因。
 * 在同一套引擎上叠四件事：
 *   · 处置动作（催料 / 调线 / 加班 / 改期）——改数据、整体重排、与处置前逐单对比
 *   · 插单模拟——同一张加急订单按三种策略各排一遍，逐单对比受影响的订单与代价
 *   · 采购建议——按排程推算每种物料的库存走势，倒推缺口日、建议量与最晚下单日
 *   · 交付日报——今日交付、风险订单、已处置、明日提醒
 * 时间口径：日序号相对 today（0 = 今天），产线日历按工作日 + 加班小时；休息日产能为 0。
 * 纯函数、无随机、断网可用。UMD：Node 与浏览器共用。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.DGG = root.DGG || {}; root.DGG.coreM10 = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VERSION = '1.0.0';
  var MODULE_NAME = 'AI ERP';
  var CREDITS = 100;
  var HZ = 60;               // 产线日历长度（天），超出即视为无法排入
  var DAY = 86400000;
  var EPS = 1e-6;

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function r1(n) { return Math.round(n * 10) / 10; }
  function r0(n) { return Math.round(n); }
  function sum(a) { return a.reduce(function (t, x) { return t + x; }, 0); }
  function byId(list) { var m = {}; (list || []).forEach(function (x) { m[x.id] = x; }); return m; }
  function fmtN(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

  /* ---------------- 日期 ---------------- */
  function ms(s) { var p = s.split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2]); }
  function dayIdx(data, s) { if (typeof s === 'number') return s; return Math.round((ms(s) - ms(data.today)) / DAY); }
  function dateOf(data, d) { var t = new Date(ms(data.today) + d * DAY); return t.getUTCFullYear() + '-' + String(t.getUTCMonth() + 1).padStart(2, '0') + '-' + String(t.getUTCDate()).padStart(2, '0'); }
  function weekday(data, d) { return new Date(ms(data.today) + d * DAY).getUTCDay(); }
  var WD = ['日', '一', '二', '三', '四', '五', '六'];
  function short(data, d) { var t = new Date(ms(data.today) + d * DAY); return (t.getUTCMonth() + 1) + '-' + t.getUTCDate(); }
  function isRest(data, d) {
    var w = weekday(data, d);
    var cfg = data.workday || {};
    if ((cfg.restWeekdays || []).indexOf(w) >= 0) return true;
    if ((cfg.restDays || []).indexOf(dateOf(data, d)) >= 0) return true;
    return false;
  }
  function cmpT(a, b) { return a.d !== b.d ? a.d - b.d : a.h - b.h; }
  function maxT(a, b) { return cmpT(a, b) >= 0 ? a : b; }

  /* ---------------- 规范化 ---------------- */
  function normalize(raw) {
    var data = clone(raw);
    data.horizon = data.horizon || 21;
    data.workday = data.workday || { restWeekdays: [0] };
    data.labor = data.labor || { hourly: 42, overtimeMul: 1.3 };
    data.overtime = data.overtime || [];
    data.log = data.log || [];
    data.lines.forEach(function (L) { L.eff = L.eff || 1; L.crew = L.crew || 4; L.ops = L.ops || []; });
    data.orders.forEach(function (o) {
      o.progress = o.progress || {};
      o.priority = o.priority == null ? 2 : o.priority;
      o.overrides = o.overrides || {};
      o.received = o.received || data.today;
    });
    data.materials.forEach(function (m) { m.onOrder = m.onOrder || []; m.moq = m.moq || 1; m.pack = m.pack || 1; });
    return data;
  }

  /* ---------------- 产线日历 ---------------- */
  function calendar(data) {
    var cal = {};
    data.lines.forEach(function (L) {
      var cap = [], ot = [], busy = [], wd = [], n = 0;
      for (var d = 0; d < HZ; d++) { var rest = isRest(data, d); cap.push(rest ? 0 : L.capHoursPerDay); ot.push(0); busy.push([]); wd.push(n); if (!rest) n++; }
      cal[L.id] = { line: L, cap: cap, ot: ot, busy: busy, wd: wd };
    });
    data.overtime.forEach(function (o) {
      var c = cal[o.line]; if (!c) return;
      var from = dayIdx(data, o.from);
      for (var d = Math.max(0, from); d < from + o.days && d < HZ; d++) {
        if (isRest(data, d)) continue;
        c.cap[d] += o.hours; c.ot[d] += o.hours;
      }
    });
    return cal;
  }

  // 在产线日历上从 from 起向后找空档放 hours 小时的活，允许跨天分段；返回段列表并占用
  function place(cal, lineId, hours, from) {
    var c = cal[lineId]; if (!c) return null;
    var H = hours, segs = [], d = Math.max(0, from.d), h = from.d < 0 ? 0 : from.h;
    while (H > EPS) {
      if (d >= HZ) return null;
      var cap = c.cap[d];
      if (cap <= 0) { d++; h = 0; continue; }
      var b = c.busy[d], cursor = h;
      for (var i = 0; i <= b.length && H > EPS; i++) {
        var gapEnd = i < b.length ? b[i][0] : cap;
        var gapStart = Math.max(cursor, i > 0 ? b[i - 1][1] : 0);
        if (gapEnd - gapStart > EPS) {
          var take = Math.min(gapEnd - gapStart, H);
          segs.push({ d: d, from: gapStart, to: gapStart + take });
          H -= take;
        }
        cursor = Math.max(cursor, gapEnd);
      }
      d++; h = 0;
    }
    segs.forEach(function (s) { var bb = c.busy[s.d]; bb.push([s.from, s.to]); bb.sort(function (x, y) { return x[0] - y[0]; }); });
    return segs;
  }

  // 时刻 → 以 24 小时为一天的分数位置（各线通用，甘特按此画）
  function frac(cal, lineId, t) { return t.d + Math.min(1, t.h / 24); }
  // 工作日口径的时刻：休息日不计入等待
  function wfrac(cal, lineId, t) { var c = cal[lineId]; return c.wd[Math.min(t.d, HZ - 1)] + Math.min(1, t.h / 24); }

  /* ---------------- 物料分配 ---------------- */
  // 按排程顺序把库存与在途分配给各订单；返回每笔需求的齐备日
  function materialPool(data) {
    var pool = {};
    data.materials.forEach(function (m) {
      pool[m.id] = { m: m, free: m.stock, arrivals: m.onOrder.map(function (a) { return { eta: dayIdx(data, a.eta), qty: a.qty, left: a.qty, po: a.po }; }).sort(function (a, b) { return a.eta - b.eta; }), demands: [] };
    });
    return pool;
  }
  function allocate(pool, data, matId, need, orderId, op) {
    var p = pool[matId];
    if (!p) return { ready: 0, from: 'none', assumed: false };
    var rec = { orderId: orderId, op: op, need: need, fromStock: 0, fromPO: [], ready: 0, assumed: false };
    var left = need;
    var take = Math.min(p.free, left); p.free -= take; left -= take; rec.fromStock = take;
    var ready = 0;
    for (var i = 0; i < p.arrivals.length && left > EPS; i++) {
      var a = p.arrivals[i]; if (a.left <= EPS) continue;
      var t = Math.min(a.left, left); a.left -= t; left -= t;
      rec.fromPO.push({ po: a.po, qty: t, eta: a.eta });
      ready = Math.max(ready, a.eta);
    }
    if (left > EPS) { // 无在途可覆盖：按今日下单、按采购提前期到货推算
      rec.assumed = true; rec.short = left;
      ready = Math.max(ready, p.m.leadDays);
      p.assumedShort = (p.assumedShort || 0) + left;
    }
    rec.ready = ready;
    p.demands.push(rec);
    return rec;
  }

  /* ---------------- 主排程 ---------------- */
  function orderKey(o) { return [o.priority, o.due, o.received, o.id]; }
  function cmpOrder(a, b) {
    var ka = orderKey(a), kb = orderKey(b);
    for (var i = 0; i < ka.length; i++) { if (ka[i] < kb[i]) return -1; if (ka[i] > kb[i]) return 1; }
    return 0;
  }

  function schedule(raw) {
    var data = normalize(raw);
    var cal = calendar(data);
    var pool = materialPool(data);
    var products = byId(data.products), lines = byId(data.lines), mats = byId(data.materials);
    var ordered = data.orders.slice().sort(cmpOrder);
    var out = [];

    // 每张订单的工序链：拆分订单按 parts 各成一条链，进度只对未拆分订单生效
    function chainsOf(o) {
      var prod = products[o.product];
      var parts = o.parts && o.parts.length ? o.parts : [{ id: '', qty: o.qty, lines: {} }];
      return parts.map(function (pt) {
        var lineMap = {};
        Object.keys(o.overrides.lines || {}).forEach(function (k) { lineMap[k] = o.overrides.lines[k]; });
        Object.keys(pt.lines || {}).forEach(function (k) { lineMap[k] = pt.lines[k]; });
        return { part: pt.id, qty: pt.qty, ops: prod.route.map(function (st) {
          var lineId = lineMap[st.op] || st.line;
          var L = lines[lineId] || lines[st.line];
          var prog = pt.id ? 0 : (o.progress[st.op] || 0);
          var rerouted = L.id !== st.line;
          var work = pt.qty * st.hoursPerUnit / L.eff;
          var moved = rerouted && prog > 0 && prog < 1;   // 在制工序换线：剩余部分搬走，需重新调机
          var remain = prog >= 1 ? 0 : work * (1 - prog) + (prog > 0 && !moved ? 0 : (st.setupHours || 0));
          var bom = prod.bom.filter(function (b) { return (b.op || prod.route[0].op) === st.op; });
          return { op: st.op, line: L.id, lineName: L.name, rerouted: rerouted, moved: moved, prog: prog, work: work, remain: remain, bom: bom, setup: prog > 0 && !moved ? 0 : (st.setupHours || 0) };
        }) };
      });
    }
    var plans = ordered.map(function (o) { return { o: o, chains: chainsOf(o) }; });

    // 第一遍：在制工序先占位（已开工的活不让位）
    plans.forEach(function (pl) {
      pl.chains.forEach(function (ch) {
        ch.ops.forEach(function (op) {
          if (op.prog > 0 && op.prog < 1 && op.remain > EPS && !op.moved) {
            op.segs = place(cal, op.line, op.remain, { d: 0, h: 0 });
            op.inProgress = true;
          }
        });
      });
    });

    // 第二遍：按优先顺序排未开工工序，物料在对应工序齐备后才能开工
    plans.forEach(function (pl) {
      var o = pl.o;
      pl.chains.forEach(function (ch) {
        var prev = { d: 0, h: 0 };
        ch.ops.forEach(function (op, i) {
          op.index = i;
          if (op.prog >= 1) { op.done = true; op.start = null; op.end = null; return; }
          var natural = maxT(prev, { d: 0, h: 0 });
          var matReady = 0, matWait = [];
          if (!op.inProgress && op.bom.length) {
            op.bom.forEach(function (b) {
              var need = b.per === 'order' ? b.qtyPer : ch.qty * b.qtyPer;   // per: 'order' 的资源按单计，不随数量放大
              var rec = allocate(pool, data, b.material, need, o.id, op.op);
              rec.material = b.material;
              matWait.push(rec);
              matReady = Math.max(matReady, rec.ready);
            });
          }
          op.mat = matWait;
          var earliest = maxT(natural, { d: matReady, h: 0 });
          op.naturalF = frac(cal, op.line, natural); op.earliestF = frac(cal, op.line, earliest);
          op.waitMaterial = Math.max(0, wfrac(cal, op.line, { d: matReady, h: 0 }) - wfrac(cal, op.line, natural));
          op.matReady = matReady;
          if (!op.inProgress) {
            if (op.remain > EPS) op.segs = place(cal, op.line, op.remain, earliest);
            else op.segs = [];
          }
          if (!op.segs) { op.overflow = true; op.start = null; op.end = null; prev = { d: HZ, h: 0 }; return; }
          if (!op.segs.length) { op.start = earliest; op.end = earliest; prev = earliest; return; }
          var first = op.segs[0], last = op.segs[op.segs.length - 1];
          op.start = { d: first.d, h: first.from }; op.end = { d: last.d, h: last.to };
          op.startF = frac(cal, op.line, op.start); op.endF = frac(cal, op.line, op.end);
          op.waitCapacity = op.inProgress ? 0 : Math.max(0, wfrac(cal, op.line, op.start) - wfrac(cal, op.line, earliest));
          op.earliestF = frac(cal, op.line, earliest);
          op.startDate = dateOf(data, op.start.d); op.endDate = dateOf(data, op.end.d);
          op.startLabel = short(data, op.start.d); op.endLabel = short(data, op.end.d);
          op.queueAhead = queueAhead(cal, op.line, earliest, op.start);
          prev = op.end;
        });
      });
    });

    // 汇总到订单
    plans.forEach(function (pl) {
      var o = pl.o;
      var due = dayIdx(data, o.due);
      var allOps = [];
      pl.chains.forEach(function (ch) { ch.ops.forEach(function (op) { op.part = ch.part; allOps.push(op); }); });
      var doneAll = allOps.every(function (op) { return op.done; });
      var overflow = allOps.some(function (op) { return op.overflow; });
      var finish = null, finishOp = null;
      allOps.forEach(function (op) { if (op.end && (!finish || cmpT(op.end, finish) > 0)) { finish = op.end; finishOp = op; } });
      var finishDay = doneAll ? 0 : overflow ? null : finish ? finish.d : 0;
      var lateDays = finishDay == null ? null : Math.max(0, finishDay - due);
      var slack = finishDay == null ? null : due - finishDay;
      var waitMat = Math.max.apply(null, [0].concat(allOps.map(function (op) { return op.waitMaterial || 0; })));
      var waitCap = sum(allOps.map(function (op) { return op.waitCapacity || 0; }));
      var remainHours = sum(allOps.map(function (op) { return op.remain || 0; }));
      var cause = 'none';
      if (!doneAll && lateDays > 0) {
        if (waitMat > 0 && waitMat >= waitCap) cause = 'material';
        else if (waitCap >= 0.5) cause = 'capacity';
        else cause = 'upstream';
      }
      if (overflow) cause = 'capacity';
      // 齐套率：未开工工序所需物料，当前库存即可覆盖的比例
      var kitItems = [], kitReady = 0;
      allOps.forEach(function (op) { (op.mat || []).forEach(function (rec) { kitItems.push(rec); if (rec.ready === 0) kitReady++; }); });
      var kitRate = kitItems.length ? kitReady / kitItems.length : 1;
      var assumedAny = kitItems.some(function (rec) { return rec.assumed; });
      var riskReason = null;
      if (!doneAll && !(lateDays > 0)) {
        if (slack != null && slack < 1) riskReason = 'tight';
        else if (assumedAny) riskReason = 'unordered';
        else if (waitMat > 0) riskReason = 'waiting';
      }
      var status = doneAll ? 'done' : lateDays > 0 ? 'late' : riskReason ? 'risk' : 'ok';
      if (o.handled && status !== 'late') status = 'handled';
      var doneOps = allOps.filter(function (op) { return op.done; }).length;
      var progressPct = allOps.length ? r0(100 * sum(allOps.map(function (op) { return op.work > 0 ? op.prog * op.work : 0; })) / Math.max(1, sum(allOps.map(function (op) { return op.work; })))) : 0;
      var cur = allOps.filter(function (op) { return !op.done; })[0];
      var bottleneck = null, maxWait = 0;
      allOps.forEach(function (op) { if ((op.waitCapacity || 0) > maxWait) { maxWait = op.waitCapacity; bottleneck = op; } });
      var matBlock = null, matBinding = false;
      allOps.forEach(function (op) { (op.mat || []).forEach(function (rec) { if (rec.ready > 0 && (!matBlock || rec.ready > matBlock.ready)) { matBlock = rec; matBinding = (op.waitMaterial || 0) > 0; } }); });
      out.push({
        id: o.id, customer: o.customer, product: o.product, productName: products[o.product].name, qty: o.qty,
        due: o.due, dueDay: due, dueLabel: short(data, due), received: o.received, priority: o.priority,
        finishDay: finishDay, finishDate: finishDay == null ? null : dateOf(data, finishDay), finishLabel: finishDay == null ? '超出排程窗口' : short(data, finishDay),
        finishF: finishOp && !overflow ? r1(frac(cal, finishOp.line, finish) * 100) / 100 : (overflow ? null : 0),
        lateDays: lateDays, slack: slack, status: status, riskReason: riskReason, cause: cause, kitRate: Math.round(kitRate * 100) / 100,
        waitMaterial: r1(waitMat), waitCapacity: r1(waitCap), remainHours: r1(remainHours),
        opsDone: doneOps, opsTotal: allOps.length, progressPct: progressPct,
        currentOp: cur ? cur.op : null, currentLine: cur ? cur.lineName : null,
        bottleneck: bottleneck ? { op: bottleneck.op, line: bottleneck.line, lineName: bottleneck.lineName, wait: r1(bottleneck.waitCapacity), ahead: bottleneck.queueAhead } : null,
        matBlock: matBlock ? { binding: matBinding, material: matBlock.material, name: mats[matBlock.material] ? mats[matBlock.material].name : matBlock.material, unit: mats[matBlock.material] ? mats[matBlock.material].unit : '', need: r0(matBlock.need), fromStock: r0(matBlock.fromStock), fromPO: matBlock.fromPO, ready: matBlock.ready, readyLabel: short(data, matBlock.ready), assumed: matBlock.assumed, short: matBlock.short ? r0(matBlock.short) : 0, leadDays: mats[matBlock.material] ? mats[matBlock.material].leadDays : null } : null,
        handled: !!o.handled, originalDue: o.originalDue || null, actions: (o.actions || []).slice(), parts: o.parts ? o.parts.length : 0,
        ops: allOps.map(function (op) {
          return { op: op.op, part: op.part, line: op.line, lineName: op.lineName, rerouted: op.rerouted, prog: op.prog, done: !!op.done, inProgress: !!op.inProgress,
            work: r1(op.work), remain: r1(op.remain), setup: op.setup, startF: op.startF == null ? null : r1(op.startF * 100) / 100, endF: op.endF == null ? null : r1(op.endF * 100) / 100,
            startDay: op.start ? op.start.d : null, endDay: op.end ? op.end.d : null, startLabel: op.startLabel || null, endLabel: op.endLabel || null,
            waitMaterial: r1(op.waitMaterial || 0), waitCapacity: r1(op.waitCapacity || 0), matReady: op.matReady || 0, queueAhead: op.queueAhead || [],
            naturalF: op.naturalF == null ? null : r1(op.naturalF * 100) / 100, earliestF: op.earliestF == null ? null : r1(op.earliestF * 100) / 100,
            mat: (op.mat || []).map(function (rec) { return { material: rec.material, name: mats[rec.material] ? mats[rec.material].name : rec.material, unit: mats[rec.material] ? mats[rec.material].unit : '', need: r0(rec.need), fromStock: r0(rec.fromStock), fromPO: rec.fromPO, ready: rec.ready, readyLabel: short(data, rec.ready), assumed: rec.assumed, short: rec.short ? r0(rec.short) : 0 }; }),
            segs: (op.segs || []).map(function (s) { return { d: s.d, from: r1(s.from), to: r1(s.to) }; }) };
        })
      });
    });

    // 产线负荷
    var lineLoad = data.lines.map(function (L) {
      var c = cal[L.id];
      var days = [];
      for (var d = 0; d < data.horizon; d++) {
        var used = sum(c.busy[d].map(function (b) { return b[1] - b[0]; }));
        days.push({ d: d, date: dateOf(data, d), label: short(data, d), rest: isRest(data, d), cap: c.cap[d], ot: c.ot[d], used: r1(used), pct: c.cap[d] > 0 ? r0(100 * used / c.cap[d]) : 0 });
      }
      var wk = days.slice(0, 7).filter(function (x) { return !x.rest; });
      var load7 = wk.length ? r0(100 * sum(wk.map(function (x) { return x.used; })) / Math.max(1, sum(wk.map(function (x) { return x.cap; })))) : 0;
      var wk2 = days.filter(function (x) { return !x.rest; });
      var loadH = wk2.length ? r0(100 * sum(wk2.map(function (x) { return x.used; })) / Math.max(1, sum(wk2.map(function (x) { return x.cap; })))) : 0;
      var ot = sum(c.ot.slice(0, data.horizon));
      return { id: L.id, name: L.name, ops: L.ops, capHoursPerDay: L.capHoursPerDay, crew: L.crew, days: days, load7: load7, loadHorizon: loadH, overtimeHours: ot, status: load7 >= 100 ? 'over' : load7 >= 85 ? 'tight' : 'ok' };
    });

    // 物料分配结果
    var matAlloc = data.materials.map(function (m) {
      var p = pool[m.id];
      return { id: m.id, name: m.name, unit: m.unit, stock: m.stock, safety: m.safety, freeAfter: r0(p.free), assumedShort: r0(p.assumedShort || 0), demands: p.demands.map(function (rec) { return { orderId: rec.orderId, op: rec.op, need: r0(rec.need), ready: rec.ready, assumed: rec.assumed }; }) };
    });

    var kpi = summarize(out, lineLoad, matAlloc);
    var days = []; for (var d = 0; d < data.horizon; d++) days.push({ d: d, date: dateOf(data, d), label: short(data, d), wd: WD[weekday(data, d)], rest: isRest(data, d) });
    var byid = {}; out.forEach(function (x) { byid[x.id] = x; });
    return { version: VERSION, today: data.today, horizon: data.horizon, days: days, orders: out, byId: byid, lines: lineLoad, materials: matAlloc, kpi: kpi, data: data };
  }

  function queueAhead(cal, lineId, from, start) {
    // 从可开工时刻到实际开工之间，这条线上被谁占着——只返回段数用于口径说明
    var c = cal[lineId], n = 0;
    for (var d = Math.max(0, from.d); d <= start.d && d < HZ; d++) {
      c.busy[d].forEach(function (b) {
        var fromH = d === from.d ? from.h : 0, toH = d === start.d ? start.h : Infinity;
        if (b[1] > fromH + EPS && b[0] < toH - EPS) n++;
      });
    }
    return n;
  }

  function summarize(orders, lines, mats) {
    var open = orders.filter(function (o) { return o.status !== 'done'; });
    var n = function (st) { return orders.filter(function (o) { return o.status === st; }).length; };
    var shortMats = mats.filter(function (m) { return m.assumedShort > 0; }).length;
    var late = n('late'), risk = n('risk'), ok = n('ok') + n('handled');
    return {
      total: orders.length, open: open.length, done: n('done'), late: late, risk: risk, ok: ok, handled: n('handled'),
      onTimeRate: open.length ? r0(100 * (open.length - late) / open.length) : 100,
      load7: lines.length ? r0(sum(lines.map(function (L) { return L.load7; })) / lines.length) : 0,
      overLines: lines.filter(function (L) { return L.status === 'over'; }).length,
      shortMaterials: shortMats,
      dueToday: orders.filter(function (o) { return o.dueDay === 0; }).length,
      lateDaysTotal: sum(open.map(function (o) { return o.lateDays || 0; }))
    };
  }

  /* ---------------- 归因说明 ---------------- */
  var CAUSES = {
    material: { label: '缺料', desc: '开工所需物料的到货日晚于可开工日' },
    capacity: { label: '产能不足', desc: '工序排队等待产线，前序订单占用了产能' },
    upstream: { label: '前道拖后', desc: '前道工序实际进度落后，剩余工时已装不进交期' },
    none: { label: '按期', desc: '各工序均可按计划开工与完工' }
  };
  function explain(S, orderId) {
    var o = S.byId[orderId]; if (!o) return null;
    var data = S.data, V = data.vocab || {};
    var seen = [], reasons = [];
    seen.push((V.ops || '工序路线') + ' ' + o.opsTotal + ' 道 · 已完成 ' + o.opsDone + ' 道' + (o.currentOp ? ' · 当前「' + o.currentOp + '」' + (o.ops.filter(function (x) { return x.op === o.currentOp; })[0].inProgress ? '进度 ' + r0(o.ops.filter(function (x) { return x.op === o.currentOp; })[0].prog * 100) + '%' : '待开工') : ''));
    seen.push((V.due || '交期') + ' ' + o.dueLabel + ' · ' + (V.finish || '预计完工') + ' ' + o.finishLabel + (o.lateDays > 0 ? ' · 晚 ' + o.lateDays + ' 天' : o.slack != null ? ' · 余量 ' + o.slack + ' 天' : ''));
    if (o.matBlock) {
      var mb = o.matBlock;
      seen.push((V.material || '物料') + ' ' + mb.name + ' 需 ' + fmtN(mb.need) + ' ' + mb.unit + ' · 可用库存 ' + fmtN(mb.fromStock) + ' ' + mb.unit + (mb.fromPO.length ? ' · 在途 ' + mb.fromPO.map(function (p) { return p.po + ' ' + short(data, p.eta) + ' 到货，分配 ' + fmtN(p.qty) + ' ' + mb.unit; }).join('、') : '') + (mb.assumed ? ' · 缺 ' + fmtN(mb.short) + ' ' + mb.unit + ' 无在途' : ''));
    }
    if (o.bottleneck) {
      var L = S.lines.filter(function (x) { return x.id === o.bottleneck.line; })[0];
      seen.push((V.line || '产线') + ' ' + o.bottleneck.lineName + ' 未来 7 天负荷 ' + (L ? L.load7 : '-') + '% · 「' + o.bottleneck.op + '」前面排着 ' + o.bottleneck.ahead + ' 段活，等待 ' + o.bottleneck.wait + ' 天');
    }
    var c = CAUSES[o.cause];
    if (o.status === 'done') reasons.push('全部' + (V.op || '工序') + '已完工，等待发运');
    else if (o.cause === 'material') reasons.push('物料 ' + (o.matBlock ? o.matBlock.name : '') + ' 齐备日 ' + (o.matBlock ? o.matBlock.readyLabel : '') + (o.matBlock && o.matBlock.assumed ? '（按今日下单、' + o.matBlock.leadDays + ' 天到货推算）' : '') + '，晚于可开工日，后续 ' + (V.op || '工序') + '整体后移 ' + o.waitMaterial + ' 天');
    else if (o.cause === 'capacity') reasons.push((o.bottleneck ? o.bottleneck.lineName + ' 的「' + o.bottleneck.op + '」' : '') + '排队等待 ' + o.waitCapacity + ' 天，前面的' + (V.order || '订单') + '优先级更高或' + (V.due || '交期') + '更早');
    else if (o.cause === 'upstream') reasons.push('剩余 ' + o.remainHours + ' 小时按当前' + (V.line || '产线') + '日历排完已超过' + (V.due || '交期') + '，前道' + (V.op || '工序') + '实际进度落后于计划');
    else if (o.riskReason === 'tight') reasons.push('预计完工与' + (V.due || '交期') + '只差 ' + o.slack + ' 天，任一' + (V.op || '工序') + '波动即延期');
    else if (o.riskReason === 'unordered') reasons.push('齐套率 ' + r0(o.kitRate * 100) + '%，' + (o.matBlock ? o.matBlock.name + ' 缺 ' + fmtN(o.matBlock.short) + ' ' + o.matBlock.unit + ' 尚无在途' : '有物料尚无在途') + '，排程按今日下单推算，采购单今天不下就延期');
    else if (o.riskReason === 'waiting') reasons.push('齐套率 ' + r0(o.kitRate * 100) + '%，' + (o.matBlock ? o.matBlock.name + ' ' + o.matBlock.readyLabel + ' 到货' : '物料在途') + '后才能开工，等料 ' + o.waitMaterial + ' 天，仍可按期');
    else reasons.push(c.desc);
    return { cause: o.cause, label: o.status === 'done' ? '已完工' : c.label, desc: c.desc, seen: seen, reasons: reasons };
  }

  /* ---------------- 处置动作 ---------------- */
  function overtimeCost(data, lineId, hours, days) {
    var L = byId(data.lines)[lineId]; if (!L) return 0;
    var workdays = 0; for (var d = 0; d < days; d++) if (!isRest(data, d)) workdays++;
    return r0(hours * workdays * L.crew * data.labor.hourly * data.labor.overtimeMul);
  }
  function altLine(data, lineId, op) {
    var cands = data.lines.filter(function (L) { return L.id !== lineId && L.ops.indexOf(op) >= 0; });
    return cands.length ? cands[0] : null;
  }
  function diff(S0, S1) {
    var rows = [];
    S0.orders.forEach(function (a) {
      var b = S1.byId[a.id]; if (!b || a.status === 'done') return;
      var fa = a.finishDay == null ? HZ : a.finishDay, fb = b.finishDay == null ? HZ : b.finishDay;
      var delta = fb - fa;
      if (delta !== 0 || a.status !== b.status) rows.push({ id: a.id, customer: a.customer, before: a.finishLabel, after: b.finishLabel, beforeDay: a.finishDay, afterDay: b.finishDay, delta: delta, lateBefore: a.lateDays, lateAfter: b.lateDays, turnsLate: a.lateDays === 0 && b.lateDays > 0, turnsOk: a.lateDays > 0 && b.lateDays === 0, statusBefore: a.status, statusAfter: b.status });
    });
    rows.sort(function (x, y) { return y.delta - x.delta; });
    return rows;
  }

  function actionCandidates(data, S, orderId) {
    var o = S.byId[orderId]; if (!o) return [];
    var V = data.vocab || {}, A = V.actions || { expedite: '催料', reroute: '调线', overtime: '加班', reschedule: '改期' };
    var list = [];
    if (o.matBlock && o.matBlock.ready > 0 && o.matBlock.binding) {
      var mb = o.matBlock, m = byId(data.materials)[mb.material];
      var newEta = mb.assumed ? Math.max(1, Math.ceil(m.leadDays * 0.5)) : Math.max(1, mb.ready - 3);
      if (newEta < mb.ready) list.push({ key: 'expedite', label: A.expedite, target: mb.material, targetName: mb.name, desc: (mb.assumed ? '紧急下单 ' + fmtN(mb.short) + ' ' + mb.unit + '，与' + (m.supplier || (V.supplier || '供应商')) + '协商 ' + newEta + ' 天到货' : '与' + (m.supplier || (V.supplier || '供应商')) + '协商 ' + mb.fromPO.map(function (p) { return p.po; }).join('、') + ' 提前到 ' + short(data, newEta) + ' 到货'), params: { material: mb.material, eta: newEta, qty: mb.assumed ? mb.short : 0 }, cost: mb.assumed ? r0(mb.short * (m.unitCost || 0) * 0.08) : r0(sum(mb.fromPO.map(function (p) { return p.qty; })) * (m.unitCost || 0) * 0.05), costNote: '加急费按货值估' });
    }
    var target = o.bottleneck && o.bottleneck.wait > 0 ? o.bottleneck : null;
    var curOp = o.ops.filter(function (x) { return !x.done; })[0];
    var otLine = target ? target.line : curOp ? curOp.line : null;
    var otOp = target ? target.op : curOp ? curOp.op : null;
    if (otLine && o.status !== 'done') {
      list.push({ key: 'overtime', label: A.overtime, target: otLine, targetName: byId(data.lines)[otLine].name, desc: byId(data.lines)[otLine].name + ' 未来 7 个工作日每天加班 3 小时', params: { line: otLine, hours: 3, days: 7 }, cost: overtimeCost(data, otLine, 3, 7), costNote: '加班费按班组人数 × 综合时薪 × 1.3' });
      var rerouteOps = o.ops.filter(function (x) { return !x.done && !x.rerouted; });
      var rr = null;
      rerouteOps.forEach(function (x) { if (rr) return; var alt = altLine(data, x.line, x.op); if (alt) rr = { op: x.op, from: x.line, to: alt, inProgress: x.inProgress, prog: x.prog }; });
      if (target) { var altT = altLine(data, target.line, target.op); if (altT) { var tx = o.ops.filter(function (x) { return x.op === target.op; })[0]; rr = { op: target.op, from: target.line, to: altT, inProgress: tx.inProgress, prog: tx.prog }; } }
      if (rr) list.push({ key: 'reroute', label: A.reroute, target: rr.to.id, targetName: rr.to.name, desc: '「' + rr.op + '」' + (rr.inProgress ? '剩余 ' + r0((1 - rr.prog) * 100) + '% ' : '') + '由 ' + byId(data.lines)[rr.from].name + ' 改到 ' + rr.to.name + (rr.to.eff < 1 ? '（效率 ' + r0(rr.to.eff * 100) + '%）' : ''), params: { op: rr.op, line: rr.to.id }, cost: 0, costNote: rr.inProgress ? '换线需重新调机，剩余部分重排' : '换线需重新调机' });
    }
    if (o.status !== 'done' && o.lateDays > 0) {
      list.push({ key: 'reschedule', label: A.reschedule, target: o.id, targetName: o.customer, desc: '与 ' + o.customer + ' 改约到 ' + short(data, (o.finishDay == null ? HZ : o.finishDay) + 1), params: { due: dateOf(data, (o.finishDay == null ? HZ : o.finishDay) + 1) }, cost: 0, costNote: '需客户确认' });
    }
    return list;
  }

  function actions(data, S, orderId) {
    var o = S.byId[orderId]; if (!o) return [];
    var list = actionCandidates(data, S, orderId).map(function (a) {
      var d2 = applyAction(data, orderId, a.key, a.params, true);
      var S2 = schedule(d2);
      var n = S2.byId[orderId];
      var rows = diff(S, S2).filter(function (r) { return r.id !== orderId; });
      var worse = rows.filter(function (r) { return r.delta > 0; });
      a.effect = {
        finishBefore: o.finishLabel, finishAfter: n.finishLabel, finishBeforeDay: o.finishDay, finishAfterDay: n.finishDay,
        lateBefore: o.lateDays, lateAfter: n.lateDays, gain: (o.finishDay == null ? HZ : o.finishDay) - (n.finishDay == null ? HZ : n.finishDay),
        meetsDue: n.lateDays === 0, affected: worse.length, newlyLate: worse.filter(function (r) { return r.turnsLate; }).length, rows: rows.slice(0, 6)
      };
      a.advised = a.effect.gain > 0 || (a.effect.meetsDue && a.key !== 'reschedule');
      return a;
    });
    // 推荐序：先看能否赶上交期，再看提前天数、拖累别家的张数、代价；改期垫底
    var w = function (a) { return [a.key === 'reschedule' ? 1 : 0, a.effect.meetsDue ? 0 : 1, -a.effect.gain, a.effect.newlyLate, a.cost]; };
    list.sort(function (x, y) { var a = w(x), b = w(y); for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; });
    list.forEach(function (a, i) { a.rank = i + 1; });
    return list;
  }

  // 把动作写进数据（返回新数据，原数据不动）；dry=true 时不记日志、不标已处置
  function applyAction(raw, orderId, key, params, dry) {
    var data = normalize(raw);
    var o = byId(data.orders)[orderId]; if (!o) return data;
    var V = data.vocab || {}, A = V.actions || { expedite: '催料', reroute: '调线', overtime: '加班', reschedule: '改期' };
    var detail = '';
    if (key === 'expedite') {
      var m = byId(data.materials)[params.material];
      if (m) {
        if (params.qty > 0) { m.onOrder.push({ po: 'PO-' + data.today.slice(2, 4) + data.today.slice(5, 7) + '-' + String(900 + data.log.length).slice(-3), qty: params.qty, eta: dateOf(data, params.eta), expedited: true }); detail = m.name + ' 紧急下单 ' + fmtN(params.qty) + ' ' + m.unit + '，' + short(data, params.eta) + ' 到'; }
        else { m.onOrder.forEach(function (po) { if (dayIdx(data, po.eta) > params.eta) { po.eta = dateOf(data, params.eta); po.expedited = true; } }); detail = m.name + ' 在途提前到 ' + short(data, params.eta) + ' 到货'; }
      }
    } else if (key === 'reroute') {
      o.overrides.lines = o.overrides.lines || {}; o.overrides.lines[params.op] = params.line;
      detail = '「' + params.op + '」改到 ' + byId(data.lines)[params.line].name;
    } else if (key === 'overtime') {
      data.overtime.push({ line: params.line, from: 0, days: params.days, hours: params.hours, orderId: orderId });
      detail = byId(data.lines)[params.line].name + ' 加班 ' + params.hours + ' 小时 × ' + params.days + ' 天';
    } else if (key === 'reschedule') {
      o.originalDue = o.originalDue || o.due; o.due = params.due; detail = (V.due || '交期') + '改为 ' + short(data, dayIdx(data, params.due));
    }
    if (!dry) {
      o.handled = true; o.actions = (o.actions || []).concat([{ key: key, label: A[key], detail: detail }]);
      data.log.push({ seq: data.log.length + 1, orderId: orderId, customer: o.customer, action: key, label: A[key], detail: detail, cost: params.cost || 0 });
    }
    return data;
  }

  /* ---------------- 插单模拟 ---------------- */
  function nextOrderId(data) {
    var n = 0; data.orders.forEach(function (o) { var m = /-(\d+)$/.exec(o.id); if (m) n = Math.max(n, +m[1]); });
    return 'SO-' + data.today.slice(2, 4) + data.today.slice(5, 7) + '-' + String(n + 1).padStart(4, '0');
  }
  function buildInsert(data, req, strategy, S0) {
    var d = normalize(data);
    var loadOf = {}; if (S0) S0.lines.forEach(function (L) { loadOf[L.id] = L; });
    var prod = byId(d.products)[req.product];
    var o = { id: req.id || nextOrderId(d), customer: req.customer, product: req.product, qty: req.qty, due: req.due, received: d.today, progress: {}, overrides: {}, inserted: true, strategy: strategy };
    var cost = 0, notes = [];
    if (strategy === 'A') { o.priority = 0; }
    else if (strategy === 'B') { o.priority = 9; }
    else {
      o.priority = 0;
      var parts = [{ id: 'A', qty: Math.ceil(req.qty / 2), lines: {} }, { id: 'B', qty: Math.floor(req.qty / 2), lines: {} }];
      var otLines = {};
      prod.route.forEach(function (st) {
        var alt = altLine(d, st.line, st.op);
        if (alt) { parts[1].lines[st.op] = alt.id; notes.push('「' + st.op + '」分到 ' + byId(d.lines)[st.line].name + ' 与 ' + alt.name + ' 并行'); }
        var ld = loadOf[st.line];
        if (!ld || ld.load7 >= 60) otLines[st.line] = true;
      });
      o.parts = parts;
      Object.keys(otLines).forEach(function (L) { d.overtime.push({ line: L, from: 0, days: 7, hours: 3, orderId: o.id }); cost += overtimeCost(d, L, 3, 7); });
      if (Object.keys(otLines).length) notes.push(Object.keys(otLines).map(function (L) { return byId(d.lines)[L].name; }).join('、') + ' 未来 7 个工作日每天加班 3 小时');
    }
    d.orders.push(o);
    return { data: d, order: o, cost: cost, notes: notes };
  }
  function simulateInsert(raw, req) {
    var data = normalize(raw);
    var S0 = schedule(data);
    var V = data.vocab || {}, ST = V.strategies || { A: '优先插队', B: '末尾排队', C: '拆分并行 + 加班' }, CT = V.counter || '张', OD = V.order || '订单';
    var options = ['A', 'B', 'C'].map(function (k) {
      var b = buildInsert(data, req, k, S0);
      var S1 = schedule(b.data);
      var n = S1.byId[b.order.id];
      var rows = diff(S0, S1);
      var worse = rows.filter(function (r) { return r.delta > 0; });
      return { key: k, name: ST[k], orderId: b.order.id, finishLabel: n.finishLabel, finishDay: n.finishDay, lateDays: n.lateDays, meetsDue: n.lateDays === 0,
        affected: worse.length, newlyLate: worse.filter(function (r) { return r.turnsLate; }).length, delayDaysTotal: sum(worse.map(function (r) { return r.delta; })),
        cost: b.cost, notes: b.notes, rows: rows, ops: n.ops, kpiAfter: S1.kpi, S: S1 };
    });
    var ok = options.filter(function (x) { return x.meetsDue; });
    var pick;
    if (ok.length) { ok.sort(function (a, b) { return a.newlyLate - b.newlyLate || a.cost - b.cost || a.affected - b.affected || a.finishDay - b.finishDay; }); pick = ok[0]; }
    else { var s = options.slice().sort(function (a, b) { return a.lateDays - b.lateDays || a.newlyLate - b.newlyLate || a.cost - b.cost; }); pick = s[0]; }
    var reason;
    if (ok.length === 0) reason = '三个方案都赶不上 ' + short(data, dayIdx(data, req.due)) + '，' + pick.name + '最接近（' + pick.finishLabel + ' 完工，晚 ' + pick.lateDays + ' 天），建议先与客户确认能否接受 ' + pick.finishLabel;
    else if (pick.newlyLate === 0 && pick.cost === 0) reason = pick.name + '能按 ' + short(data, dayIdx(data, req.due)) + ' 交付，不增加加班费' + (pick.affected ? '；' + pick.affected + ' ' + CT + (V.orders || '在手订单') + '完工日后移 ' + Math.min.apply(null, pick.rows.filter(function (r) { return r.delta > 0; }).map(function (r) { return r.delta; })) + '–' + Math.max.apply(null, pick.rows.filter(function (r) { return r.delta > 0; }).map(function (r) { return r.delta; })) + ' 天但仍在' + (V.due || '交期') + '内' : '，不影响任何' + (V.orders || '在手订单'));
    else if (pick.newlyLate === 0) reason = pick.name + '能按期交付且不让任何' + OD + '转为延期，代价是加班费 ' + fmtN(pick.cost) + ' 元';
    else reason = pick.name + '能按期交付，但会让 ' + pick.newlyLate + ' ' + CT + OD + '转为延期，需要先与这些' + (V.customer || '客户') + '改约';
    return { request: req, base: S0, options: options.map(function (x) { var y = clone(x); delete y.S; return y; }), recommend: pick.key, reason: reason, _S: options.reduce(function (m, x) { m[x.key] = x.S; return m; }, {}) };
  }
  function applyInsert(raw, req, strategy) {
    var b = buildInsert(raw, req, strategy, schedule(raw));
    var V = b.data.vocab || {}, ST = V.strategies || { A: '优先插队', B: '末尾排队', C: '拆分并行 + 加班' };
    b.data.log.push({ seq: b.data.log.length + 1, orderId: b.order.id, customer: req.customer, action: 'insert', label: (V.insert || '插单') + ' · ' + ST[strategy], detail: req.customer + ' ' + fmtN(req.qty) + ' ' + (V.qtyUnit || '件') + '，' + (V.due || '交期') + ' ' + short(b.data, dayIdx(b.data, req.due)) + (b.notes.length ? '；' + b.notes.join('；') : ''), cost: b.cost });
    return b.data;
  }

  /* ---------------- 采购建议 ---------------- */
  function purchasePlan(raw, S) {
    var data = normalize(raw);
    var H = data.horizon;
    var items = [], slow = [];
    var consume = {}; // matId -> [{d, qty, orderId, op}]
    S.orders.forEach(function (o) {
      o.ops.forEach(function (op) {
        (op.mat || []).forEach(function (rec) {
          var d = op.startDay == null ? H : op.startDay;
          (consume[rec.material] = consume[rec.material] || []).push({ d: d, qty: rec.need, orderId: o.id, op: op.op, customer: o.customer });
        });
      });
    });
    data.materials.forEach(function (m) {
      var arrivals = m.onOrder.map(function (a) { return { d: dayIdx(data, a.eta), qty: a.qty, po: a.po, expedited: !!a.expedited }; });
      var cons = (consume[m.id] || []).slice().sort(function (a, b) { return a.d - b.d; });
      var curve = [], level = m.stock, firstBelowSafety = null, firstNegative = null;
      for (var d = 0; d < H; d++) {
        arrivals.forEach(function (a) { if (a.d === d) level += a.qty; });
        cons.forEach(function (c) { if (c.d === d) level -= c.qty; });
        curve.push({ d: d, level: r0(level) });
        if (firstBelowSafety == null && level < m.safety) firstBelowSafety = d;
        if (firstNegative == null && level < -EPS) firstNegative = d;
      }
      var demandH = sum(cons.filter(function (c) { return c.d < H; }).map(function (c) { return c.qty; }));
      var onOrderH = sum(arrivals.filter(function (a) { return a.d < H; }).map(function (a) { return a.qty; }));
      var gap = demandH + m.safety - m.stock - onOrderH;
      var sug = 0;
      if (gap > EPS) { sug = Math.max(m.moq, Math.ceil(gap / m.pack) * m.pack); }
      var needBy = firstNegative != null ? firstNegative : firstBelowSafety;
      var latest = needBy == null ? null : needBy - m.leadDays;
      var urgency = firstNegative != null ? 'short' : firstBelowSafety != null ? (gap > EPS ? 'safety' : 'watch') : 'ok';
      var assumed = S.materials.filter(function (x) { return x.id === m.id; })[0];
      if (assumed && assumed.assumedShort > 0 && urgency === 'short') latest = Math.min(latest == null ? 0 : latest, 0);
      var drivers = cons.slice(0, 3).map(function (c) { return c.orderId + ' ' + short(data, Math.min(c.d, H)) + ' 需 ' + fmtN(c.qty) + ' ' + m.unit; });
      var daysCover = m.avgDailyUse > 0 ? r0(m.stock / m.avgDailyUse) : null;
      var it = { id: m.id, name: m.name, spec: m.spec || '', unit: m.unit, supplier: m.supplier || '', stock: m.stock, safety: m.safety, onOrder: onOrderH, demand: r0(demandH), curve: curve,
        urgency: urgency, shortDay: firstNegative, shortLabel: firstNegative == null ? null : short(data, firstNegative), safetyDay: firstBelowSafety, safetyLabel: firstBelowSafety == null ? null : short(data, firstBelowSafety),
        suggestQty: sug, moq: m.moq, leadDays: m.leadDays, latestOrderDay: latest, latestOrderLabel: latest == null ? null : latest <= 0 ? '今日' : short(data, latest), overdue: latest != null && latest < 0,
        unitCost: m.unitCost || 0, amount: r0(sug * (m.unitCost || 0)), drivers: drivers, daysCover: daysCover, arrivals: arrivals.map(function (a) { return { po: a.po, qty: a.qty, label: short(data, a.d), expedited: a.expedited }; }) };
      it.reason = urgency === 'short' ? '按排程 ' + it.shortLabel + ' 出现缺口' + (drivers.length ? '，' + drivers[0] : '') + '；提前期 ' + m.leadDays + ' 天，' + (it.overdue ? '今日下单也晚于缺口日，需与' + (m.supplier || '供应商') + '协商加急' : latest === 0 ? '今日下单刚好赶上' : '最晚 ' + it.latestOrderLabel + ' 下单')
        : urgency === 'safety' ? it.safetyLabel + ' 起低于安全库存 ' + fmtN(m.safety) + ' ' + m.unit + '，提前期 ' + m.leadDays + ' 天，' + (it.overdue ? '按提前期本应更早下单，建议今日补单' : '最晚 ' + it.latestOrderLabel + ' 下单')
        : urgency === 'watch' ? it.safetyLabel + ' 起低于安全库存，在途 ' + arrivals.map(function (a) { return a.po + ' ' + short(data, a.d) + ' 到 ' + fmtN(a.qty) + ' ' + m.unit; }).join('、') + ' 后回补，暂不下单'
        : daysCover != null && daysCover > 90 && demandH <= EPS ? '库存可用 ' + daysCover + ' 天且排程内无需求，占用资金 ' + fmtN(m.stock * (m.unitCost || 0)) + ' 元'
        : '库存与在途可覆盖排程内需求';
      if (urgency === 'watch') { it.suggestQty = 0; it.amount = 0; it.overdue = false; items.push(it); }
      else if (urgency !== 'ok' && sug > 0) items.push(it);
      else if (daysCover != null && daysCover > 90 && demandH <= EPS) slow.push({ id: m.id, name: m.name, unit: m.unit, stock: m.stock, daysCover: daysCover, capital: r0(m.stock * (m.unitCost || 0)), reason: it.reason });
      else items.push(it);
    });
    var rank = { short: 0, safety: 1, watch: 2, ok: 3 };
    items.sort(function (a, b) { return rank[a.urgency] - rank[b.urgency] || (a.latestOrderDay == null ? 99 : a.latestOrderDay) - (b.latestOrderDay == null ? 99 : b.latestOrderDay) || a.id.localeCompare(b.id); });
    slow.sort(function (a, b) { return b.capital - a.capital; });
    var buy = items.filter(function (x) { return x.suggestQty > 0; });
    var po = {};
    buy.forEach(function (x) { (po[x.supplier] = po[x.supplier] || { supplier: x.supplier, lines: [], amount: 0 }).lines.push(x); po[x.supplier].amount += x.amount; });
    var poList = Object.keys(po).map(function (k) { return po[k]; }).sort(function (a, b) { return b.amount - a.amount; });
    return { items: items, slow: slow, po: poList, summary: { short: items.filter(function (x) { return x.urgency === 'short'; }).length, safety: items.filter(function (x) { return x.urgency === 'safety'; }).length, watch: items.filter(function (x) { return x.urgency === 'watch'; }).length, buy: buy.length, amount: sum(buy.map(function (x) { return x.amount; })), slow: slow.length, slowCapital: sum(slow.map(function (x) { return x.capital; })), overdue: buy.filter(function (x) { return x.overdue; }).length } };
  }

  /* ---------------- 采购单落单 ---------------- */
  function nextPoId(data) {
    var n = 0;
    data.materials.forEach(function (m) { (m.onOrder || []).forEach(function (a) { var x = /-(\d+)$/.exec(a.po || ''); if (x) n = Math.max(n, +x[1]); }); });
    data.log.forEach(function (l) { (l.pos || []).forEach(function (po) { var x = /-(\d+)$/.exec(po); if (x) n = Math.max(n, +x[1]); }); });
    return function () { n++; return 'PO-' + data.today.slice(2, 4) + data.today.slice(5, 7) + '-' + String(n).padStart(3, '0'); };
  }
  // 把采购建议里的下单项落成在途（按供应商各成一张采购单）；返回新数据与采购单列表
  function applyPurchase(raw, plan, ids) {
    var data = normalize(raw), V = data.vocab || {};
    var next = nextPoId(data), mats = byId(data.materials);
    var groups = {}, pos = [];
    plan.items.forEach(function (x) {
      if (!(x.suggestQty > 0)) return;
      if (ids && ids.indexOf(x.id) < 0) return;
      var m = mats[x.id]; if (!m) return;
      var g = groups[x.supplier] = groups[x.supplier] || { po: next(), supplier: x.supplier, lines: [], amount: 0, eta: 0 };
      var eta = Math.max(1, m.leadDays);
      m.onOrder.push({ po: g.po, qty: x.suggestQty, eta: dateOf(data, eta) });
      g.lines.push({ material: m.id, name: m.name, qty: x.suggestQty, unit: m.unit, amount: x.amount, eta: dateOf(data, eta) });
      g.amount += x.amount; g.eta = Math.max(g.eta, eta);
    });
    Object.keys(groups).forEach(function (k) { pos.push(groups[k]); });
    if (pos.length) data.log.push({ seq: data.log.length + 1, orderId: '', customer: '', action: 'purchase', label: V.purchase || '采购建议', detail: '生成 ' + pos.length + ' 张采购单：' + pos.map(function (p) { return p.po + ' ' + p.supplier + ' ' + fmtN(p.amount) + ' 元'; }).join('；'), cost: sum(pos.map(function (p) { return p.amount; })), pos: pos.map(function (p) { return p.po; }) });
    return { data: data, pos: pos };
  }

  /* ---------------- 交付日报 ---------------- */
  function daily(raw, S, plan) {
    var data = normalize(raw), V = data.vocab || {};
    var today = S.orders.filter(function (o) { return o.dueDay === 0 || (o.status === 'done'); }).map(function (o) { return { id: o.id, customer: o.customer, productName: o.productName, qty: o.qty, dueLabel: o.dueLabel, status: o.status, finishLabel: o.finishLabel, ok: o.status === 'done' || o.lateDays === 0 }; });
    var risks = S.orders.filter(function (o) { return o.status === 'late' || o.status === 'risk'; }).sort(function (a, b) { return (a.status === 'late' ? 0 : 1) - (b.status === 'late' ? 0 : 1) || a.dueDay - b.dueDay || (b.lateDays || 0) - (a.lateDays || 0); }).map(function (o) { return { id: o.id, customer: o.customer, dueLabel: o.dueLabel, finishLabel: o.finishLabel, lateDays: o.lateDays, status: o.status, cause: o.cause, causeLabel: CAUSES[o.cause].label, handled: o.handled, actions: o.actions }; });
    var handled = data.log.slice();
    var tomorrow = [];
    S.orders.forEach(function (o) {
      if (o.dueDay === 1) tomorrow.push({ kind: 'due', text: o.id + ' ' + o.customer + ' 明日到期' + (o.status === 'done' ? '，已完工待发运' : o.lateDays > 0 ? '，预计 ' + o.finishLabel + ' 完工' : '，可按期交付') });
      o.ops.forEach(function (op) { if (op.startDay === 1 && !op.inProgress) tomorrow.push({ kind: 'start', text: o.id + ' 「' + op.op + '」明日在 ' + op.lineName + ' 开工' }); });
    });
    data.materials.forEach(function (m) { m.onOrder.forEach(function (a) { if (dayIdx(data, a.eta) === 1) tomorrow.push({ kind: 'arrival', text: m.name + ' ' + fmtN(a.qty) + ' ' + m.unit + ' 明日到货（' + a.po + '）' }); }); });
    if (plan) plan.items.forEach(function (x) { if (x.suggestQty > 0 && x.latestOrderDay != null && x.latestOrderDay <= 1) tomorrow.push({ kind: 'po', text: x.name + ' ' + (x.latestOrderDay <= 0 ? '今日' : '明日') + '前需下单 ' + fmtN(x.suggestQty) + ' ' + x.unit }); });
    var k = S.kpi;
    var lines = [];
    lines.push('【' + (V.daily || '交付日报') + '】' + data.today.replace(/-/g, '.') + ' 周' + WD[weekday(data, 0)]);
    lines.push((V.orders || '在手订单') + ' ' + k.open + ' ' + (V.counter || '张') + '：按期 ' + (k.open - k.late) + ' · 风险 ' + k.risk + ' · 延期 ' + k.late + '（按期率 ' + k.onTimeRate + '%）');
    if (today.length) lines.push('今日交付：' + today.map(function (t) { return t.id + ' ' + t.customer + (t.ok ? '' : '（延期至 ' + t.finishLabel + '）'); }).join('；'));
    if (risks.length) lines.push('风险' + (V.order || '订单') + '：' + risks.slice(0, 5).map(function (r) { return r.id + ' ' + r.causeLabel + (r.lateDays > 0 ? ' 晚 ' + r.lateDays + ' 天' : '') + (r.handled ? '（已处置）' : ''); }).join('；'));
    if (handled.length) lines.push('今日处置 ' + handled.length + ' 项：' + handled.map(function (h) { return h.label + ' ' + h.orderId; }).join('；'));
    if (plan) lines.push((V.purchase || '采购建议') + '：缺口 ' + plan.summary.short + ' 项 · 低于安全库存 ' + plan.summary.safety + ' 项 · 建议下单 ' + plan.summary.buy + ' 项 合计 ' + fmtN(plan.summary.amount) + ' 元' + (plan.summary.overdue ? ' · ' + plan.summary.overdue + ' 项已错过最晚下单日' : ''));
    if (tomorrow.length) lines.push('明日提醒：' + tomorrow.slice(0, 6).map(function (t) { return t.text; }).join('；'));
    lines.push((V.lines || '产线负荷') + '：' + S.lines.map(function (L) { return L.name + ' ' + L.load7 + '%'; }).join(' · '));
    return { date: data.today, weekday: WD[weekday(data, 0)], kpi: k, deliveries: today, risks: risks, handled: handled, tomorrow: tomorrow, lines: S.lines.map(function (L) { return { id: L.id, name: L.name, load7: L.load7, status: L.status, overtimeHours: L.overtimeHours }; }), text: lines.join('\n') };
  }

  return {
    VERSION: VERSION, MODULE_NAME: MODULE_NAME, CREDITS: CREDITS, CAUSES: CAUSES, HZ: HZ,
    normalize: normalize, schedule: schedule, explain: explain, actions: actions, applyAction: applyAction,
    simulateInsert: simulateInsert, applyInsert: applyInsert, purchasePlan: purchasePlan, applyPurchase: applyPurchase, daily: daily, diff: diff,
    dayIdx: dayIdx, dateOf: dateOf, short: short, isRest: isRest, weekday: weekday, fmtN: fmtN, overtimeCost: overtimeCost, nextOrderId: nextOrderId
  };
});
