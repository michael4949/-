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

  var VERSION = '1.2.0';
  var MODULE_NAME = 'AI ERP';
  var CREDITS = 100;
  var HZ = 60;               // 产线日历长度（天），超出即视为无法排入
  var EPS = 1e-6;

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function r1(n) { return Math.round(n * 10) / 10; }
  function r0(n) { return Math.round(n); }
  function sum(a) { return a.reduce(function (t, x) { return t + x; }, 0); }
  function byId(list) { var m = {}; (list || []).forEach(function (x) { m[x.id] = x; }); return m; }
  function fmtN(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

  /* ---------------- 日期 ---------------- */
  /* 公历与日序号互转：纯整数算术，不建 Date 对象、不取系统时钟，任何宿主上同一份入参得同一份输出。
   * dnum / civil 是 days-from-civil / civil-from-days 那一对，以 1970-01-01 为第 0 天，与 UTC 日历逐日对齐。 */
  function dnum(y, m, dd) {
    y -= m <= 2 ? 1 : 0;
    var era = Math.floor(y / 400), yoe = y - era * 400;                        // yoe ∈ [0, 399]
    var doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + dd - 1;      // doy ∈ [0, 365]
    var doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;    // doe ∈ [0, 146096]
    return era * 146097 + doe - 719468;
  }
  function civil(z) {
    z += 719468;
    var era = Math.floor(z / 146097), doe = z - era * 146097;
    var yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
    var doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
    var mp = Math.floor((5 * doy + 2) / 153), m = mp + (mp < 10 ? 3 : -9);
    return { y: yoe + era * 400 + (m <= 2 ? 1 : 0), m: m, d: doy - Math.floor((153 * mp + 2) / 5) + 1 };
  }
  function ds(s) { var p = String(s).split('-'); return dnum(+p[0], +p[1], +p[2]); }
  function dayIdx(data, s) { if (typeof s === 'number') return s; return ds(s) - ds(data.today); }
  function dateOf(data, d) { var t = civil(ds(data.today) + d); return t.y + '-' + String(t.m).padStart(2, '0') + '-' + String(t.d).padStart(2, '0'); }
  function weekday(data, d) { var z = ds(data.today) + d; return ((z % 7) + 11) % 7; }   // 1970-01-01 是周四
  var WD = ['日', '一', '二', '三', '四', '五', '六'];
  function short(data, d) { var t = civil(ds(data.today) + d); return t.m + '-' + t.d; }
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
      if (target) { var altT = altLine(data, target.line, target.op); if (altT) { var tOp = o.ops.filter(function (x) { return x.op === target.op; })[0]; rr = { op: target.op, from: target.line, to: altT, inProgress: tOp.inProgress, prog: tOp.prog }; } }
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

  /* ---------------- 对话与文档摄入 ----------------
     screens / brief / suggest / ask / ingest 五个导出：纯函数，只认入参，不碰 DOM、window、时钟与随机数。
     result 是 schedule(data) 的结果，也收 { S, plan, daily } 整套（原型按后者传），可选：
     传了就用，没传就自己算一遍；plan 与 daily 缺哪个补哪个。
     答不上返回 null，不编数。blocks 是平台中立的纯数据（kv / table / tags / text），
     act 是声明式动作（goto / focus / open / apply / set），平台可以只实现子集。
     屏上的选中态不在排程里：下钻看哪一张取 data.focus，没有就按「延期 → 风险 → 排在前面的一张」，与第 3 屏默认一致；
     加急单取 data.insertDraft，没有就取 data.insertPresets[0]，方案取 data.insertPick，没有就取推荐档。 */
  var SCREENS = [['connect', '接入'], ['room', '指挥室'], ['order', '订单下钻'], ['insert', '插单模拟'], ['stock', '物料与库存'], ['daily', '交付日报']];
  var RISK_LABEL = { tight: '余量不足', unordered: '未下单', waiting: '等料' };
  var DOC_LABEL = { word: 'Word', excel: 'Excel', ppt: 'PPT', pdf: 'PDF', eml: '邮件', text: '文本' };

  function screens() { return SCREENS.map(function (s) { return { key: s[0], label: s[1] }; }); }
  function isStep(step) { for (var i = 0; i < SCREENS.length; i++) if (SCREENS[i][0] === step) return true; return false; }
  /* 出给人看的字按同一张口径表落（与屏上同一口径） */
  function tx(s) {
    return String(s == null ? '' : s)
      .replace(/最晚下单日/g, '下单截止日').replace(/最晚下单/g, '下单截止')
      .replace(/最晚/g, '不晚于').replace(/最接近/g, '更贴近').replace(/最少/g, '较少').replace(/最久/g, '居首')
      .replace(/承诺/g, '约定').replace(/必须/g, '须')
      .replace(/刀具/g, '刃具').replace(/刀片/g, '铣刃');
  }
  function cut(s, n) { s = String(s == null ? '' : s); return s.length > n ? s.slice(0, n) + '…' : s; }
  function has(q, list) { for (var i = 0; i < list.length; i++) if (q.indexOf(list[i]) >= 0) return true; return false; }
  function kvB(rows) { return { type: 'kv', rows: rows }; }
  function tableB(head, rows) { return { type: 'table', head: head, rows: (rows || []).slice(0, 6) }; }
  function tagsB(items) { return { type: 'tags', items: items }; }
  function say(text, blocks, act, ref) {
    var o = { text: tx(text) };
    if (blocks && blocks.length) o.blocks = blocks;
    if (act) o.act = act;
    if (ref != null) o.ref = ref;
    return o;
  }
  function ctxOf(data, lib, result) {
    var S = (result && result.S && result.S.byId) ? result.S
      : (result && result.byId && result.kpi && result.data) ? result : schedule(data);
    var plan = (result && result.plan && result.plan.items) ? result.plan : purchasePlan(S.data, S);
    var rep = (result && result.daily && result.daily.risks) ? result.daily : daily(S.data, S, plan);
    return { raw: data || S.data, d: S.data, v: S.data.vocab || {}, S: S, k: S.kpi, plan: plan, rep: rep };
  }
  function uiOf(C, key) { return (C.raw && C.raw[key] != null) ? C.raw[key] : C.d[key]; }
  function causeOf(o) {
    if (o.status === 'done') return '已完工';
    if (o.status === 'late') return CAUSES[o.cause].label;
    if (o.status === 'risk') return RISK_LABEL[o.riskReason] || '风险';
    return '按期';
  }
  function lateOrders(C) { return C.S.orders.filter(function (o) { return o.status === 'late'; }).sort(function (a, b) { return b.lateDays - a.lateDays; }); }
  function riskOrders(C) { return C.S.orders.filter(function (o) { return o.status === 'risk'; }); }
  function overLines(C) { return C.S.lines.filter(function (L) { return L.status === 'over'; }); }
  /* 下钻屏看的是哪一张：与第 3 屏默认同一口径 */
  function curOrder(C) {
    var id = uiOf(C, 'focus');
    if (id && C.S.byId[id]) return C.S.byId[id];
    return C.S.orders.filter(function (o) { return o.status === 'late'; })[0]
      || C.S.orders.filter(function (o) { return o.status === 'risk'; })[0] || C.S.orders[0];
  }
  function draftOf(C) {
    var req = uiOf(C, 'insertDraft') || (C.d.insertPresets || [])[0];
    return req ? clone(req) : null;
  }
  function simOf(C) {
    var req = draftOf(C);
    if (!req) return null;
    var sim = simulateInsert(C.d, req);
    delete sim._S; delete sim.base;
    var p = uiOf(C, 'insertPick');
    var okPick = p && sim.options.filter(function (x) { return x.key === p; }).length ? p : sim.recommend;
    sim.request = req; sim.picked = okPick;
    return sim;
  }
  function optOf(sim, key) { return sim.options.filter(function (x) { return x.key === key; })[0]; }
  function findOrder(C, q) {
    var hit = null;
    C.S.orders.forEach(function (o) { if (q.indexOf(o.id) >= 0 || q.indexOf(o.id.slice(-4)) >= 0) hit = o; });
    if (!hit) C.S.orders.forEach(function (o) { var c = o.customer.split(' · ')[0]; if (c && q.indexOf(c) >= 0) hit = o; });
    return hit;
  }
  function findMaterial(C, q) {
    var hit = null;
    C.plan.items.forEach(function (m) { if (q.indexOf(m.name) >= 0) hit = m; });
    if (!hit) C.plan.items.forEach(function (m) { if (m.name.length > 3 && q.indexOf(m.name.slice(0, 3)) >= 0) hit = m; });
    return hit;
  }
  function orderMats(o) { var out = []; o.ops.forEach(function (op) { (op.mat || []).forEach(function (m) { out.push(m); }); }); return out; }
  function tomorrowList(C) {
    var seen = {}, out = [];
    C.rep.tomorrow.forEach(function (t) { var s = tx(t.text); if (seen[s]) return; seen[s] = 1; out.push(t); });
    return out;
  }
  function actionOf(C, o, key) { return o.status === 'done' ? null : actions(C.d, C.S, o.id).filter(function (a) { return a.key === key; })[0] || null; }
  function actAction(o, a) { var p = clone(a.params); p.cost = a.cost; return { type: 'apply', action: 'applyAction', input: { orderId: o.id, key: a.key, params: p } }; }

  /* 开场发现：进这一屏先说一条从排程里算出来的话 */
  function brief(step, data, lib, result) {
    if (!isStep(step)) return null;
    var C = ctxOf(data, lib, result), v = C.v, S = C.S, k = C.k, plan = C.plan, D = C.rep;
    var worst = lateOrders(C)[0];
    if (step === 'connect') {
      var total = C.d.sources.reduce(function (a, s) { return a + s.rows; }, 0);
      return tx(C.d.sources.length + ' 个来源今早同步 ' + fmtN(total) + ' 条，' + k.open + ' ' + v.counter + v.orders + '里 ' + k.late + ' ' + v.counter + '已延期，合计晚 ' + k.lateDaysTotal + ' 天。');
    }
    if (step === 'room') {
      var over = overLines(C);
      return tx('按期率 ' + k.onTimeRate + '%' + (worst ? '，' + worst.id + ' 晚 ' + worst.lateDays + ' 天，延期天数居首' : '')
        + (over.length ? '；' + over.map(function (L) { return L.name + ' ' + L.load7 + '%'; }).join('、') + ' 已满负荷。' : '。'));
    }
    if (step === 'order') {
      var o = curOrder(C);
      var acts = o.status === 'done' ? [] : actions(C.d, S, o.id);
      return tx(o.id + ' ' + (o.lateDays > 0 ? '晚 ' + o.lateDays + ' 天' : causeOf(o)) + '，卡在' + (o.currentOp ? '「' + o.currentOp + '」' + o.currentLine : v.ops)
        + (acts[0] ? '；' + acts[0].label + ' ' + acts[0].targetName + ' 可到 ' + acts[0].effect.finishAfter + '，预计 ' + fmtN(acts[0].cost) + ' 元。' : '。'));
    }
    if (step === 'insert') {
      var sim = simOf(C);
      if (!sim) return tx(v.insertNoun + '填好就能按三种策略各排一遍。');
      var rec = optOf(sim, sim.recommend);
      return tx(sim.request.customer + ' 加急 ' + fmtN(sim.request.qty) + ' ' + v.qtyUnit + '：方案 ' + rec.key + ' ' + rec.name + ' ' + rec.finishLabel + ' 完工，拖累 ' + rec.affected + ' ' + v.counter + '，预计 ' + fmtN(rec.cost) + ' 元。');
    }
    if (step === 'stock') {
      var t0 = C.plan.items.filter(function (x) { return x.urgency === 'short'; })[0] || C.plan.items[0];
      if (!t0) return tx('库存与在途覆盖排程内需求。');
      return tx(t0.name + ' 库存 ' + fmtN(t0.stock) + '、在途 ' + fmtN(t0.onOrder) + '，排程需 ' + fmtN(t0.demand) + ' ' + t0.unit + '、安全库存 ' + fmtN(t0.safety) + ' ' + t0.unit + '，下单截止 ' + t0.latestOrderLabel + '；' + plan.summary.buy + ' 项待下单预计 ' + fmtN(plan.summary.amount) + ' 元。');
    }
    if (step === 'daily') {
      var mustBuy = plan.items.filter(function (x) { return x.suggestQty > 0 && x.latestOrderDay <= 0; }).length;
      return tx('今日 ' + D.deliveries.filter(function (x) { return x.ok; }).length + ' ' + v.counter + '可交付；风险与延期 ' + D.risks.length + ' ' + v.counter + '（延期 ' + D.kpi.late + ' ' + v.counter + '、风险 ' + D.kpi.risk + ' ' + v.counter + '）；' + mustBuy + ' 项' + v.material + '今日须下单。');
    }
    return null;
  }

  /* 快捷问句：每屏 3–4 条，条条都能被 ask 答上 */
  function suggest(step, data, lib, result) {
    if (!isStep(step)) return [];
    var C = ctxOf(data, lib, result), v = C.v;
    if (step === 'connect') return ['延期的是哪几' + v.counter, '数据源都通了吗', '为什么会延期', '直接进' + v.room];
    if (step === 'room') return ['按期率为什么只有 ' + C.k.onTimeRate + '%', '哪条' + v.line + '满负荷', '先处理哪一' + v.counter, v.material + '缺口在哪'];
    if (step === 'order') return ['为什么晚', '加班要花多少', '调线行不行', '换下一' + v.counter];
    if (step === 'insert') return ['三个方案差在哪', '哪些' + v.order + '被拖累', '按 C 排要多少钱', '就按推荐落单'];
    if (step === 'stock') return ['今天哪几项要下单', '采购单一共多少钱', '呆滞占了多少钱', '生成采购单'];
    if (step === 'daily') return ['今天能交几' + v.counter, '明天要注意什么', '风险' + v.order + '有哪些', '发给谁'];
    return [];
  }

  /* 问答：认得的问法逐条作答，答不上返回 null 交给平台兜底 */
  function ask(question, step, data, lib, result) {
    if (!isStep(step)) return null;
    var C = ctxOf(data, lib, result), v = C.v, S = C.S, k = C.k, plan = C.plan, D = C.rep;
    var q = String(question == null ? '' : question);

    /* —— 点名某一张单 —— */
    var oq = findOrder(C, q);
    if (oq && !has(q, ['物料', '库存'])) {
      var acts0 = oq.status === 'done' ? [] : actions(C.d, S, oq.id);
      var txt = oq.id + ' ' + cut(oq.customer, 14) + ' · ' + oq.productName + ' × ' + fmtN(oq.qty) + ' ' + v.qtyUnit + '\n'
        + v.due + ' ' + oq.dueLabel + '，' + v.finish + ' ' + oq.finishLabel + (oq.lateDays > 0 ? '，晚 ' + oq.lateDays + ' 天' : '，余量 ' + oq.slack + ' 天')
        + '；齐套 ' + Math.round(oq.kitRate * 100) + '%，' + (oq.currentOp ? '当前「' + oq.currentOp + '」在 ' + oq.currentLine : '全部完工') + '。';
      if (acts0[0]) txt += '\n建议' + acts0[0].label + ' ' + acts0[0].targetName + '：' + v.finish + ' ' + acts0[0].effect.finishBefore + ' → ' + acts0[0].effect.finishAfter + '，预计 ' + fmtN(acts0[0].cost) + ' 元。';
      return say(txt, null, { type: 'set', path: 'focus', value: oq.id }, oq.id);
    }

    /* —— 点名某一种物料 —— */
    var mq = findMaterial(C, q);
    if (mq) {
      return say(mq.name + '：库存 ' + fmtN(mq.stock) + ' ' + mq.unit + '、安全库存 ' + fmtN(mq.safety) + '、在途 ' + fmtN(mq.onOrder) + '，排程需 ' + fmtN(mq.demand) + ' ' + mq.unit + '。\n'
        + (mq.suggestQty ? '建议下单 ' + fmtN(mq.suggestQty) + ' ' + mq.unit + '（' + mq.supplier + '，提前期 ' + mq.leadDays + ' 天），下单截止 ' + mq.latestOrderLabel + '，预计 ' + fmtN(mq.amount) + ' 元。' : '排程内无需补单。'),
        mq.drivers.length ? [tagsB(mq.drivers.slice(0, 3))] : null,
        { type: 'open', panel: 'material', ref: mq.id });
    }

    if (has(q, ['数据源', '来源', '同步', '接入', '通了'])) {
      return say(C.d.sources.map(function (s) { return s.name + ' ' + (s.mode === 'direct' ? '系统直连' : '表格导入') + ' ' + fmtN(s.rows) + ' 条 · ' + s.lastSync.slice(5); }).join('\n'),
        null, { type: 'focus', ref: C.d.sources[0].id });
    }
    if (has(q, ['进指挥室', '进入', '开始', '直接进'])) {
      return say(v.room + '按' + v.due + '倒推排了一遍，' + k.late + ' ' + v.counter + '延期、' + k.risk + ' ' + v.counter + '风险。', null, { type: 'goto', step: 'room' });
    }

    /* 屏内问句先由本屏分支接：站在订单下钻屏问「为什么晚」，答的是这一张单，不跳走 */
    if (step === 'order') {
      var o = curOrder(C);
      var ex = explain(S, o.id), acts = o.status === 'done' ? [] : actions(C.d, S, o.id);
      if (has(q, ['为什么', '原因', '怎么回事', '卡在'])) {
        return say(o.id + ' ' + ex.label + '：' + ex.reasons[0] + '。\n' + ex.seen[0],
          [kvB([[v.due, o.dueLabel], [v.finish, o.finishLabel], ['余量', o.slack + ' 天'], ['齐套', Math.round(o.kitRate * 100) + '%']])],
          { type: 'focus', ref: o.id });
      }
      if (has(q, ['加班'])) {
        var ot = acts.filter(function (a) { return a.key === 'overtime'; })[0];
        if (!ot) return say('这一' + v.counter + '排不出加班收益，换调线或改期更划算。');
        return say(ot.targetName + ' 加班 3 h/日，' + v.finish + ' ' + ot.effect.finishBefore + ' → ' + ot.effect.finishAfter + '，'
          + (ot.effect.meetsDue ? '赶上' + v.due : '追回 ' + ot.effect.gain + ' 天') + '，拖累 ' + ot.effect.affected + ' ' + v.counter + '，预计 ' + fmtN(ot.cost) + ' 元。\n已按这个方案执行，' + v.room + '重排。',
          null, actAction(o, ot));
      }
      if (has(q, ['调线', '换线', '换条'])) {
        var rr = acts.filter(function (a) { return a.key === 'reroute'; })[0];
        if (!rr) return say('这道' + v.op + '没有可替代' + v.line + '，调线走不通。');
        return say(rr.desc + '：' + v.finish + ' ' + rr.effect.finishBefore + ' → ' + rr.effect.finishAfter
          + (rr.effect.gain > 0 ? '，追回 ' + rr.effect.gain + ' 天，不花钱。已按这个方案执行。' : rr.effect.gain < 0 ? '，反而晚 ' + (-rr.effect.gain) + ' 天，不建议动。' : '，没改善，不建议动。'),
          null, rr.effect.gain > 0 ? actAction(o, rr) : null);
      }
      if (has(q, ['改期', '改约', '跟客户'])) {
        var rs = acts.filter(function (a) { return a.key === 'reschedule'; })[0];
        if (!rs) return say('这一' + v.counter + '不需要改期。');
        return say(rs.desc + '：改完不再算延期，不动其他' + v.orders + '的排程，不花钱。\n已按这个方案执行。', null, actAction(o, rs));
      }
      if (has(q, ['齐套', '物料', '缺料', '领料'])) {
        var mats = orderMats(o);
        if (!mats.length) return say('这一' + v.counter + '没有待领' + v.material + '，齐套 100%。');
        return say('齐套 ' + Math.round(o.kitRate * 100) + '%：' + mats.map(function (m) { return m.name + ' 需 ' + fmtN(m.need) + ' ' + m.unit + (m.ready === 0 ? ' 齐备' : m.assumed ? ' 缺 ' + fmtN(m.short) : ' ' + m.readyLabel + ' 到'); }).join('；') + '。',
          null, { type: 'focus', ref: mats[0].material });
      }
      if (has(q, ['下一', '换一', '别的'])) {
        var al = S.orders.filter(function (x) { return x.status === 'late' || x.status === 'risk'; });
        if (!al.length) return say('在手' + v.orders + '没有延期或风险的，不用换。');
        var i2 = al.map(function (x) { return x.id; }).indexOf(o.id), nx = al[(i2 + 1) % al.length];
        return say(nx.id + ' ' + causeOf(nx) + '，' + v.finish + ' ' + nx.finishLabel + (nx.lateDays > 0 ? '，晚 ' + nx.lateDays + ' 天' : '') + '。',
          null, { type: 'set', path: 'focus', value: nx.id });
      }
    }

    if (has(q, ['为什么']) && has(q, ['延期', '晚', '按期'])) {
      var L0 = lateOrders(C);
      if (!L0.length) return say('在手 ' + k.open + ' ' + v.counter + '全部按期，按期率 ' + k.onTimeRate + '%。');
      var by = {};
      L0.forEach(function (o2) { var c = CAUSES[o2.cause].label; by[c] = (by[c] || 0) + 1; });
      var ov = overLines(C);
      return say('延期 ' + L0.length + ' ' + v.counter + '的归因：' + Object.keys(by).map(function (c) { return c + ' ' + by[c] + ' ' + v.counter; }).join('、') + '。\n'
        + (ov.length ? ov.map(function (L2) { return L2.name; }).join('、') + ' 未来 7 天负荷 ' + ov[0].load7 + '%，' + v.op + '排队等' + v.line + '；' : '')
        + '齐套率低于 100% 的有 ' + S.orders.filter(function (o2) { return o2.status !== 'done' && o2.kitRate < 1; }).length + ' ' + v.counter + '。',
        [tableB(['单号', '归因', '晚'], L0.map(function (o2) { return [o2.id.slice(-4), CAUSES[o2.cause].label, o2.lateDays + ' 天']; }))],
        { type: 'set', path: 'filter', value: 'late' }, L0[0].id);
    }
    if (has(q, ['延期', '晚了', '迟', '按期率', '准时'])) {
      var L = lateOrders(C);
      if (!L.length) return say('在手 ' + k.open + ' ' + v.counter + '全部按期，按期率 ' + k.onTimeRate + '%。');
      return say('按期率 ' + k.onTimeRate + '%：' + k.open + ' ' + v.counter + '在手，' + k.late + ' ' + v.counter + '延期合计 ' + k.lateDaysTotal + ' 天。\n'
        + L.map(function (o2) { return o2.id + ' ' + CAUSES[o2.cause].label + ' 晚 ' + o2.lateDays + ' 天'; }).join('；') + '。',
        [tableB(['单号', v.due, v.finish, '晚'], L.map(function (o2) { return [o2.id.slice(-4), o2.dueLabel, o2.finishLabel, o2.lateDays + ' 天']; }))],
        { type: 'set', path: 'filter', value: 'late' }, L[0].id);
    }
    if (has(q, ['风险', '要小心', '会不会'])) {
      /* 日报屏的「风险与延期」是延期 + 风险的合集，屏上与气泡里取同一份 */
      if (step === 'daily') {
        if (!D.risks.length) return say(v.daily + '里没有延期或风险' + v.order + '。');
        return say(v.daily + '「风险与延期」' + D.risks.length + ' ' + v.counter + '：延期 ' + k.late + ' ' + v.counter + '、风险 ' + k.risk + ' ' + v.counter + '。\n'
          + D.risks.map(function (r) { return r.id + ' ' + r.causeLabel + (r.lateDays > 0 ? ' 晚 ' + r.lateDays + ' 天' : '') + (r.handled ? '（已处置）' : ''); }).join('；') + '。',
          [tableB(['单号', '判断', v.finish], D.risks.map(function (r) { return [r.id.slice(-4), r.causeLabel, r.finishLabel]; }))],
          { type: 'focus', ref: D.risks[0].id });
      }
      var R = riskOrders(C);
      if (!R.length) return say('当前没有风险' + v.order + '。');
      return say(R.length + ' ' + v.counter + '风险：' + R.map(function (o2) { return o2.id + ' ' + causeOf(o2) + '（余量 ' + o2.slack + ' 天）'; }).join('；') + '。',
        [tableB(['单号', '判断', '余量'], R.map(function (o2) { return [o2.id.slice(-4), causeOf(o2), o2.slack + ' 天']; }))],
        { type: 'set', path: 'filter', value: 'risk' }, R[0].id);
    }
    if (has(q, [v.line, '负荷', '瓶颈', '满负荷', '产能'])) {
      var over2 = S.lines.filter(function (L2) { return L2.status !== 'ok'; });
      return say('7 日平均负荷 ' + k.load7 + '%' + (over2.length ? '；' + over2.map(function (L2) { return L2.name + ' ' + L2.load7 + '%'; }).join('、') + '。' : '，没有满负荷' + v.line + '。'),
        [tableB([v.line, '负荷'], S.lines.map(function (L2) { return [cut(L2.name, 8), L2.load7 + '%']; }))],
        { type: 'focus', ref: (over2[0] || S.lines[0]).id });
    }
    if (has(q, ['先处理', '先做', '怎么办', '下一步', '建议'])) {
      var L3 = lateOrders(C), o3 = L3[0] || riskOrders(C)[0];
      if (!o3) return say('在手' + v.orders + '按期，先把 ' + plan.summary.buy + ' 项采购单下掉。', null, { type: 'goto', step: 'stock' });
      var a3 = actions(C.d, S, o3.id)[0];
      return say('先看 ' + o3.id + '（' + CAUSES[o3.cause].label + '，晚 ' + o3.lateDays + ' 天）'
        + (a3 ? '：' + a3.label + ' ' + a3.targetName + '，' + v.finish + ' ' + a3.effect.finishBefore + ' → ' + a3.effect.finishAfter + '，拖累 ' + a3.effect.affected + ' ' + v.counter + '，预计 ' + fmtN(a3.cost) + ' 元。' : '。'),
        null, { type: 'set', path: 'focus', value: o3.id });
    }

    if (step === 'insert') {
      var sim = simOf(C);
      if (sim) {
        var rec = optOf(sim, sim.recommend), cur = optOf(sim, sim.picked);
        if (has(q, ['落单', '就按', '执行', '下单'])) {
          var use = has(q, ['推荐']) ? rec : cur;
          return say('按方案 ' + use.key + '（' + use.name + '）落单，' + v.finish + ' ' + use.finishLabel + '；落单后' + v.orders + '按新排程刷新。',
            null, { type: 'apply', action: 'applyInsert', input: { strategy: use.key, req: sim.request } });
        }
        if (has(q, ['差在哪', '三个方案', '对比', '哪个好', '推荐'])) {
          return say(sim.options.map(function (op) { return op.key + ' ' + op.name + ' ' + op.finishLabel + (op.meetsDue ? ' 按期' : ' 晚 ' + op.lateDays + ' 天') + '，拖累 ' + op.affected + ' ' + v.counter + '，预计 ' + fmtN(op.cost) + ' 元'; }).join('\n') + '。\nAI 推荐 ' + sim.recommend + '：' + sim.reason + '。',
            [tableB(['方案', v.finish, '拖累', '费用'], sim.options.map(function (op) { return [op.key, op.finishLabel, op.affected + ' ' + v.counter, fmtN(op.cost)]; }))],
            { type: 'set', path: 'insert.pick', value: sim.recommend });
        }
        if (has(q, ['拖累', '影响', '谁被', '哪些'])) {
          var aff = cur.rows.filter(function (r) { return r.delta > 0; });
          if (!aff.length) return say('方案 ' + cur.key + ' 不推后任何在手' + v.order + '。');
          return say('方案 ' + cur.key + ' 推后 ' + aff.length + ' ' + v.counter + '：' + aff.map(function (r) { return r.id + ' ' + r.before + ' → ' + r.after + '（+' + r.delta + ' 天）'; }).join('；') + '，转延期 ' + cur.newlyLate + ' ' + v.counter + '。',
            [tableB(['单号', '前', '后'], aff.map(function (r) { return [r.id.slice(-4), r.before, r.after]; }))],
            { type: 'focus', ref: aff[0].id });
        }
        if (has(q, ['C', '加班', '多少钱', '费用'])) {
          var cOpt = optOf(sim, 'C');
          return say('方案 C ' + cOpt.name + '：' + v.finish + ' ' + cOpt.finishLabel + '，拖累 ' + cOpt.affected + ' ' + v.counter + '，预计加班费 ' + fmtN(cOpt.cost) + ' 元。'
            + (cOpt.notes.length ? '\n' + cOpt.notes.join('；') + '。' : ''),
            null, { type: 'set', path: 'insert.pick', value: 'C' });
        }
      }
    }

    if (step === 'stock' || has(q, ['采购', '下单', '缺口', '呆滞', '库存'])) {
      if (has(q, ['呆滞', '占用', '压着'])) {
        if (!plan.slow.length) return say('没有呆滞' + v.material + '。');
        return say('呆滞 ' + plan.slow.length + ' 项占用 ' + fmtN(plan.summary.slowCapital) + ' 元：' + plan.slow.map(function (x) { return x.name + ' ' + fmtN(x.stock) + ' ' + x.unit + '（' + fmtN(x.capital) + ' 元）'; }).join('；') + '。',
          null, { type: 'open', panel: 'slow' });
      }
      if (has(q, ['今天', '今日', '要下单', '来不及', '截止'])) {
        var today = plan.items.filter(function (x) { return x.suggestQty > 0 && x.latestOrderDay <= 0; });
        if (!today.length) return say('今日没有到下单截止的' + v.material + '。');
        return say(today.length + ' 项今日到截止：' + today.map(function (x) { return x.name + ' ' + fmtN(x.suggestQty) + ' ' + x.unit + (x.overdue ? '（已过）' : ''); }).join('；') + '，合计预计 ' + fmtN(today.reduce(function (a, x) { return a + x.amount; }, 0)) + ' 元。',
          [tableB([v.material, '建议', '截止'], today.map(function (x) { return [cut(x.name, 7), fmtN(x.suggestQty) + ' ' + x.unit, x.latestOrderLabel]; }))],
          { type: 'focus', ref: today[0].id });
      }
      if (has(q, ['多少钱', '总共', '一共', '金额'])) {
        if (!plan.po.length) return say('当前没有需要下单的' + v.material + '。');
        return say(plan.po.length + ' 张采购单、' + plan.summary.buy + ' 项，预计 ' + fmtN(plan.summary.amount) + ' 元：' + plan.po.map(function (p) { return p.supplier + ' ' + fmtN(p.amount) + ' 元'; }).join('；') + '。',
          [tableB([v.supplier, '金额'], plan.po.map(function (p) { return [cut(p.supplier, 8), fmtN(p.amount) + ' 元']; }))],
          { type: 'focus', ref: plan.po[0].supplier });
      }
      if (has(q, ['生成', '下掉', '开单'])) {
        if (!plan.po.length) return say('当前没有需要下单的' + v.material + '。');
        return say('生成 ' + plan.po.length + ' 张采购单，预计 ' + fmtN(plan.summary.amount) + ' 元；计入在途后' + v.orders + '按到货日重排。',
          null, { type: 'apply', action: 'applyPurchase', input: { ids: plan.items.filter(function (x) { return x.suggestQty > 0; }).map(function (x) { return x.id; }) } });
      }
      if (has(q, ['缺口', '缺料', '不够'])) {
        var sh2 = plan.items.filter(function (x) { return x.urgency === 'short' || x.urgency === 'safety'; });
        if (!sh2.length) return say('库存与在途覆盖排程内需求，没有缺口。');
        return say('缺口 ' + plan.summary.short + ' 项、低于安全库存 ' + plan.summary.safety + ' 项：' + sh2.slice(0, 4).map(function (x) { return x.name + ' 库存 ' + fmtN(x.stock) + ' / 需 ' + fmtN(x.demand) + ' ' + x.unit; }).join('；') + '。',
          [tableB([v.material, '库存', '需求'], sh2.slice(0, 5).map(function (x) { return [cut(x.name, 7), fmtN(x.stock), fmtN(x.demand)]; }))],
          { type: 'focus', ref: sh2[0].id });
      }
    }

    if (step === 'daily' || has(q, ['日报', '今天能交', '明天', '发给谁'])) {
      if (has(q, ['发给谁', '收件', '微信', '发送'])) {
        return say('收件人：' + [v.handler, '车间主任', '总经理', '采购主管'].join('、') + '。' + v.daily + '是微信文本版，扫码接收。',
          null, { type: 'open', panel: 'wechat' });
      }
      if (has(q, ['今天能交', '今日交付', '几' + v.counter, '交几'])) {
        if (!D.deliveries.length) return say('今日没有到期' + v.order + '。');
        return say(D.deliveries.map(function (x) { return x.id + ' ' + cut(x.customer, 12) + ' ' + (x.ok ? '可交付' : '延至 ' + x.finishLabel); }).join('\n') + '。',
          null, { type: 'focus', ref: D.deliveries[0].id });
      }
      if (has(q, ['明天', '明日', '注意'])) {
        if (!D.tomorrow.length) return say('明日无到期、开工与到货事项。');
        return say(tomorrowList(C).slice(0, 6).map(function (t) { return tx(t.text); }).join('\n'), null, { type: 'goto', step: 'daily' });
      }
    }

    if (has(q, ['插单', '加急', '模拟'])) {
      return say(v.insertNoun + '按三种策略各排一遍：' + v.strategies.A + ' / ' + v.strategies.B + ' / ' + v.strategies.C + '，逐' + v.counter + '对比受影响的在手' + v.order + '与代价。',
        null, { type: 'goto', step: 'insert' });
    }
    if (has(q, ['多少' + v.counter, '在手', '几' + v.counter])) {
      return say('在手 ' + k.open + ' ' + v.counter + '：按期 ' + (k.open - k.late) + '、风险 ' + k.risk + '、延期 ' + k.late + '；已完工待发运 ' + k.done + ' ' + v.counter + '。');
    }
    return null;
  }

  /* ---------------- 文档摄入：订单表排产 / 科目余额对账 / 采购合同 / 会议材料 / 邮件 ---------------- */
  function docCols(head) {
    var map = {};
    (head || []).forEach(function (x, i) {
      var s = String(x || '');
      if (map.id == null && /单号|订单|编号|工单/.test(s)) map.id = i;
      if (map.cust == null && /客户|甲方|收货|买方/.test(s)) map.cust = i;
      if (map.prod == null && /产品|品名|物料名|规格|型号|商品/.test(s)) map.prod = i;
      if (map.qty == null && /数量|件数|台数|订量/.test(s)) map.qty = i;
      if (map.due == null && /交期|交付|到期|需求日|完成日/.test(s)) map.due = i;
      if (map.acc == null && /科目/.test(s)) map.acc = i;
      if (map.end == null && /期末/.test(s)) map.end = i;
      if (map.dr == null && /借方/.test(s)) map.dr = i;
      if (map.cr == null && /贷方/.test(s)) map.cr = i;
    });
    return map;
  }
  function numOf(x) { var n = parseFloat(String(x == null ? '' : x).replace(/[,，\s元]/g, '')); return isNaN(n) ? 0 : n; }
  var CN_NUM = { '零': 0, '一': 1, '二': 2, '两': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10 };
  function cnNum(t) {
    t = String(t || '').trim();
    if (/^[\d.]+$/.test(t)) return parseFloat(t);
    if (CN_NUM[t] != null) return CN_NUM[t];
    var m = /^十([一二三四五六七八九])$/.exec(t); if (m) return 10 + CN_NUM[m[1]];
    var m2 = /^([一二三四五六七八九])十([一二三四五六七八九])?$/.exec(t); if (m2) return CN_NUM[m2[1]] * 10 + (m2[2] ? CN_NUM[m2[2]] : 0);
    return NaN;
  }
  /* 写回一律先 normalize 出新副本再改，不动入参；同一份文档重复导入不叠批次 */
  function docSource(d, doc, rows) {
    var nd = normalize(d);
    nd.sources = nd.sources.filter(function (s) { return s.id !== 'doc-import'; });
    nd.sources.push({ id: 'doc-import', name: cut(doc.name, 16), mode: 'import', lastSync: nd.today + ' 14:20', rows: rows });
    return nd;
  }
  function docHead(doc) { return (doc.kind === 'pdf' ? 'PDF' : doc.kind === 'text' ? '文本' : 'Word'); }

  function ingestExcel(doc, C) {
    var v = C.v, s0 = (doc.sheets || [])[0];
    if (!s0 || !s0.rows.length) return { text: 'Excel《' + doc.name + '》读完，没有可用数据行。' };
    var head = s0.rows[0], body = s0.rows.slice(1).filter(function (r) { return r.join('').trim(); });
    var map = docCols(head);
    var preview = tableB(head.slice(0, 4).map(function (x) { return cut(x, 6); }), body.slice(0, 3).map(function (r) { return r.slice(0, 4).map(function (x) { return cut(x, 10); }); }));

    /* 1) 订单表 → 真的排一遍产 */
    if (map.qty != null && (map.due != null || map.prod != null) && (map.id != null || map.cust != null)) {
      var row0 = body[0] || [];
      var qty = Math.max(1, Math.round(numOf(row0[map.qty])));
      /* 表里的产品与交期对不上在册口径时，一律换成本模块排得动的值——换了就在回答里说破，
       * 不与真从表里读到的客户、数量混在同一句话里。subs 收的就是这几条换值说明。 */
      var subs = [], prod = C.d.products[0];
      if (map.prod != null) {
        var pn = String(row0[map.prod] || '').trim(), hit = null;
        C.d.products.forEach(function (p) { if (pn && (p.name.indexOf(pn) >= 0 || pn.indexOf(p.name.slice(0, 4)) >= 0)) hit = p; });
        if (hit) prod = hit;
        else subs.push(pn ? '产品名「' + cut(pn, 14) + '」没对上在册' + v.product + '，按更贴近的「' + prod.name + '」排'
          : '这张表的' + v.product + '列是空的，按在册的「' + prod.name + '」排');
      } else subs.push('这张表没有' + v.product + '列，按在册的「' + prod.name + '」排');
      var dueDay = 7, dueRaw = map.due != null ? String(row0[map.due] || '').trim() : '';
      var md = dueRaw.match(/(\d{4})\D(\d{1,2})\D(\d{1,2})/), hzn = C.d.horizon;
      if (md) {
        var dueTxt = md[1] + '-' + ('0' + md[2]).slice(-2) + '-' + ('0' + md[3]).slice(-2);
        var dd = dayIdx(C.d, dueTxt);
        if (dd >= 1 && dd <= hzn) dueDay = dd;
        else subs.push('表里' + v.due + ' ' + dueTxt + ' 落在 ' + hzn + ' 天排程窗口外，按窗口内 ' + dueDay + ' 天（' + short(C.d, dueDay) + '）排，实际' + v.due + '另行确认');
      } else if (map.due == null) subs.push('这张表没有' + v.due + '列，按窗口内 ' + dueDay + ' 天（' + short(C.d, dueDay) + '）排');
      else if (!dueRaw) subs.push('第 1 行的' + v.due + '是空的，按窗口内 ' + dueDay + ' 天（' + short(C.d, dueDay) + '）排');
      else subs.push('表里' + v.due + '「' + cut(dueRaw, 14) + '」没读成日期，按窗口内 ' + dueDay + ' 天（' + short(C.d, dueDay) + '）排');
      var req = { customer: cut(map.cust != null ? String(row0[map.cust] || '') : (map.id != null ? String(row0[map.id]) : ''), 16) || 'K-040 · 导入', product: prod.id, qty: qty, due: dateOf(C.d, dueDay) };
      var sim = simulateInsert(C.d, req), rec = sim.options.filter(function (x) { return x.key === sim.recommend; })[0];
      var nd = docSource(C.d, doc, body.length);
      nd.insertDraft = req; nd.insertPick = sim.recommend;
      return { text: tx('Excel《' + doc.name + '》读完：《' + s0.name + '》' + body.length + ' 行 ' + head.length + ' 列。\n'
        + '按第 1 行排产：' + req.customer + ' · ' + prod.name + ' × ' + fmtN(qty) + ' ' + v.qtyUnit + '，' + v.due + ' ' + short(C.d, dueDay) + '。\n'
        + (subs.length ? subs.join('；') + '。\n' : '')
        + '三种策略各排一遍：' + sim.options.map(function (op) { return op.key + ' ' + op.finishLabel + '（拖累 ' + op.affected + '，' + fmtN(op.cost) + ' 元）'; }).join('，') + '；推荐 ' + rec.key + '。已填进' + v.insert + '。'),
        blocks: [preview], data: nd, ref: 'insert-draft', act: { type: 'apply', action: 'ingest', input: { doc: doc } } };
    }

    /* 2) 科目余额表 → 与库存、应付口径对一遍 */
    if (map.acc != null && (map.end != null || map.dr != null)) {
      var grab = function (re) { for (var i = 0; i < body.length; i++) { if (re.test(body[i].join('|'))) return body[i]; } return null; };
      var gr = grab(/库存商品|产成品/), ap = grab(/应付账款/), ar = grab(/应收账款/);
      var matCap = C.d.materials.reduce(function (a, m) { return a + (m.stock || 0) * (m.unitCost || 0); }, 0);
      var lines = ['Excel《' + doc.name + '》读完：《' + s0.name + '》' + body.length + ' 行，列是 ' + head.slice(0, 6).map(function (x) { return cut(x, 6); }).join(' / ') + '。'];
      var kv = [];
      var cell = function (row, i) { return row && i != null && row[i] != null && String(row[i]).trim() !== '' ? numOf(row[i]) : null; };
      if (gr) {
        var endV = cell(gr, map.end), d1 = cell(gr, map.dr) || 0, c1 = cell(gr, map.cr) || 0;
        lines.push('库存商品' + (endV != null ? '期末 ' + fmtN(endV) + ' 元，' : '') + '本期借 ' + fmtN(d1) + ' / 贷 ' + fmtN(c1) + '，净增 ' + fmtN(d1 - c1) + ' 元；本模块' + v.material + '库存按单价折 ' + fmtN(matCap) + ' 元，其中呆滞 ' + C.plan.slow.length + ' 项占 ' + fmtN(C.plan.summary.slowCapital) + ' 元。');
        if (endV != null) kv.push(['库存商品期末', fmtN(endV) + ' 元']);
        kv.push([v.material + '折价', fmtN(matCap) + ' 元'], ['呆滞占用', fmtN(C.plan.summary.slowCapital) + ' 元']);
      }
      if (ap) {
        var apEnd = cell(ap, map.end), apCr = cell(ap, map.cr);
        lines.push('应付账款' + (apEnd != null ? '期末 ' + fmtN(apEnd) + ' 元' : '本期贷方 ' + fmtN(apCr || 0) + ' 元（这张表没有期末格）') + '；本模块 ' + C.plan.summary.buy + ' 项采购单草稿预计 ' + fmtN(C.plan.summary.amount) + ' 元，落单后应付增 ' + fmtN(C.plan.summary.amount) + ' 元。');
        kv.push([apEnd != null ? '应付账款期末' : '应付账款本期贷方', fmtN(apEnd != null ? apEnd : (apCr || 0)) + ' 元'], ['采购单草稿', fmtN(C.plan.summary.amount) + ' 元']);
      }
      if (ar && cell(ar, map.end) != null) kv.push(['应收账款期末', fmtN(cell(ar, map.end)) + ' 元']);
      lines.push('这张表没有' + v.order + '与' + v.due + '列，排程不动数；已登记为导入批次。');
      return { text: tx(lines.join('\n')), blocks: [kvB(kv)], data: docSource(C.d, doc, body.length),
        ref: C.plan.po.length ? C.plan.po[0].supplier : 'doc-import', act: { type: 'apply', action: 'ingest', input: { doc: doc } } };
    }

    /* 3) 其他表：把真读到的列与行数说清楚 */
    return { text: tx('Excel《' + doc.name + '》读完：' + doc.sheets.length + ' 张表，《' + s0.name + '》' + body.length + ' 行 ' + head.length + ' 列。\n'
      + '列是 ' + head.slice(0, 6).map(function (x) { return cut(x, 8); }).join(' / ') + '。\n'
      + '排产要 ' + ['单号', v.customer, v.product, v.qty, v.due].join(' / ') + ' 这几列，这张表里没有，排程不动数。已按 ' + body.length + ' 行登记为导入批次。'),
      blocks: [preview], data: docSource(C.d, doc, body.length), ref: 'doc-import', act: { type: 'apply', action: 'ingest', input: { doc: doc } } };
  }

  function ingestWord(doc, C) {
    var v = C.v, k = C.k, txt = String(doc.text || '').replace(/\s+/g, ' ');
    /* 金额 / 交付期限 / 逾期口径三样各认中文与拉丁两种写法：同一份合同不论哪种落笔都读得出数 */
    var mAmt = txt.match(/(?:合同)?金额[^0-9]{0,8}([\d,]+(?:\.\d+)?)\s*元/) || txt.match(/人民币\s*([\d,]+(?:\.\d+)?)\s*元/)
      || txt.match(/(?:CNY|RMB|¥)\s*([\d,]+(?:\.\d+)?)/i) || txt.match(/Amount[^0-9]{0,8}([\d,]+(?:\.\d+)?)/i);
    var mDue = txt.match(/(20\d{2})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/)
      || txt.match(/Deliver\w*[^0-9]{0,8}(20\d{2})-(\d{1,2})-(\d{1,2})/i);
    var mPen = txt.match(/万分之\s*([\d.]+|[零一二三四五六七八九十]{1,3})/);
    var pen = mPen ? cnNum(mPen[1]) : NaN;
    if (isNaN(pen)) { var mPct = txt.match(/([\d.]+)\s*%\s*per\s*day/i); if (mPct) pen = Math.round(parseFloat(mPct[1]) * 10000) / 100; }  // 日 n% → 万分之 n×100
    var mCap = txt.match(/不超过[^0-9]{0,10}([\d.]+)\s*%/) || txt.match(/cap\s*([\d.]+)\s*%/i);
    var mB = txt.match(/乙方[：:\s]*([^\s　,，。；]{3,20})/);
    var lines = [docHead(doc) + '《' + doc.name + '》读完：' + ((doc.paragraphs || []).length || 1) + ' 段'
      + (doc.tables && doc.tables.length ? '、' + doc.tables.length + ' 张表' : '') + '。'];
    var kv = [], late = lateOrders(C);
    if (mB) { lines.push('乙方 ' + mB[1] + '。'); kv.push(['乙方', cut(mB[1], 14)]); }
    if (mAmt) kv.push(['合同金额', mAmt[1] + ' 元']);
    if (mDue) {
      var due = mDue[1] + '-' + ('0' + mDue[2]).slice(-2) + '-' + ('0' + mDue[3]).slice(-2);
      var days = dayIdx(C.d, due);
      lines.push('交付期限 ' + due + '，距 ' + C.d.today + ' 还有 ' + days + ' 天；排程窗口 ' + C.d.horizon + ' 天，落在窗口' + (days <= C.d.horizon ? '内' : '外') + '。');
      kv.push(['交付期限', due], ['剩余', days + ' 天']);
    }
    if (!isNaN(pen) && mAmt) {
      var amt = numOf(mAmt[1]), rate = pen / 10000;
      var fee = Math.round(amt * rate * k.lateDaysTotal);
      var capV = mCap ? Math.round(amt * parseFloat(mCap[1]) / 100) : null;
      lines.push('逾期口径按日万分之 ' + pen + (mCap ? '、累计不超 ' + mCap[1] + '%' : '') + '：套当前延期合计 ' + k.lateDaysTotal + ' 天，'
        + fmtN(amt) + ' × ' + pen + '‱ × ' + k.lateDaysTotal + ' = 预计 ' + fmtN(fee) + ' 元'
        + (capV != null ? '，' + (fee >= capV ? '已到 ' + fmtN(capV) + ' 元上限。' : '未到 ' + fmtN(capV) + ' 元上限。') : '。'));
      kv.push(['逾期口径', '日万分之 ' + pen], ['延期合计', k.lateDaysTotal + ' 天'], ['预计违约金', fmtN(fee) + ' 元']);
    }
    if (!mAmt && !mDue && isNaN(pen)) {
      lines.push('没读到金额、交付期限或逾期口径，排程这边不动数。');
      return { text: tx(lines.join('\n')), blocks: [tagsB((doc.paragraphs || []).slice(0, 3).map(function (p) { return cut(p, 16); }))] };
    }
    lines.push('延期' + v.orders + ' ' + k.late + ' ' + v.counter + '：' + late.slice(0, 3).map(function (o) { return o.id + ' 晚 ' + o.lateDays + ' 天'; }).join('、') + '。');
    return { text: tx(lines.join('\n')), blocks: [kvB(kv)], ref: late.length ? late[0].id : null,
      act: late.length ? { type: 'set', path: 'filter', value: 'late' } : null };
  }

  function ingestSlides(doc, C) {
    var v = C.v, k = C.k, txt = String(doc.text || '').replace(/\s+/g, ' ');
    var titles = (doc.slides || []).map(function (s) { return s.title || ''; }).filter(Boolean);
    var mHit = txt.match(/(?:准时率|按期率|达成率)[^0-9]{0,6}(\d{1,3}(?:\.\d+)?)\s*%/);
    var lines = ['PPT《' + doc.name + '》读完：' + doc.slides.length + ' 页，第 1 页「' + (titles[0] || '—') + '」' + (titles[1] ? '、第 2 页「' + titles[1] + '」' : '') + '。'];
    if (!mHit) {
      lines.push('没读到按期率口径，排程这边不动数。');
      return { text: tx(lines.join('\n')), blocks: [tagsB(titles.slice(0, 3))] };
    }
    var late = lateOrders(C);
    var target = parseFloat(mHit[1]);
    var need = Math.ceil(k.open * target / 100);
    var gap = Math.max(0, need - (k.open - k.late));
    lines.push('文档目标按期率 ' + target + '%，当前 ' + k.onTimeRate + '%；' + k.open + ' ' + v.counter + '在手要按期 ' + need + ' ' + v.counter + '，现在 ' + (k.open - k.late) + ' ' + v.counter + '，差 ' + gap + ' ' + v.counter + '。');
    if (gap) lines.push('按延期天数排，先救 ' + late.slice(0, gap).map(function (o) { return o.id + '（晚 ' + o.lateDays + ' 天）'; }).join('、') + '。');
    return { text: tx(lines.join('\n')), blocks: [kvB([['文档目标', target + '%'], ['当前按期率', k.onTimeRate + '%'], ['要补', gap + ' ' + v.counter]]), tagsB(titles.slice(0, 2))],
      ref: late.length ? late[0].id : null, act: late.length ? { type: 'set', path: 'filter', value: 'late' } : null };
  }

  function ingestMail(doc, C) {
    var v = C.v, ml = doc.mail || {}, txt = String(doc.text || '').replace(/\s+/g, ' ');
    var mWan = txt.match(/([\d.]+)\s*万元/);
    var mDay = txt.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
    var kv = [['发件', cut(ml.from || '—', 16)], ['主题', cut(ml.subject || '—', 16)], ['日期', ml.date || '—']];
    var lines = ['邮件《' + (ml.subject || doc.name) + '》读完：发件 ' + (ml.from || '—') + '，' + (ml.date || '') + '。'];
    if (mWan) {
      var amt = Math.round(parseFloat(mWan[1]) * 10000);
      lines.push('正文提到 ' + mWan[1] + ' 万元付款' + (mDay ? '、' + mDay[1] + ' 月 ' + mDay[2] + ' 日前审批' : '') + '；本模块采购单草稿 ' + C.plan.summary.buy + ' 项预计 ' + fmtN(C.plan.summary.amount) + ' 元，占其中 ' + (amt ? Math.round(1000 * C.plan.summary.amount / amt) / 10 : 0) + '%。');
      kv.push(['邮件金额', fmtN(amt) + ' 元'], ['采购单草稿', fmtN(C.plan.summary.amount) + ' 元']);
      return { text: tx(lines.join('\n')), blocks: [kvB(kv)], ref: C.plan.po.length ? C.plan.po[0].supplier : null,
        act: C.plan.po.length ? { type: 'focus', ref: C.plan.po[0].supplier } : { type: 'goto', step: 'stock' } };
    }
    lines.push('正文没有' + v.order + '、' + v.due + '或采购金额，排程这边不动数。');
    return { text: tx(lines.join('\n')), blocks: [kvB(kv), tagsB((ml.attaches || []).slice(0, 3).map(function (a) { return cut(a, 14); }))] };
  }

  /* 文档摄入：按本模块业务把文档用起来；写回业务数据时返回 { …, data: 新副本 } */
  function ingest(doc, step, data, lib, result) {
    if (!doc || !doc.ok) return null;
    var C = ctxOf(data, lib, result);
    if (doc.kind === 'excel') return ingestExcel(doc, C);
    if (doc.kind === 'ppt') return ingestSlides(doc, C);
    if (doc.kind === 'eml') return ingestMail(doc, C);
    if (doc.kind === 'word' || doc.kind === 'pdf' || doc.kind === 'text') return ingestWord(doc, C);
    return null;
  }

  return {
    VERSION: VERSION, MODULE_NAME: MODULE_NAME, CREDITS: CREDITS, CAUSES: CAUSES, HZ: HZ,
    normalize: normalize, schedule: schedule, explain: explain, actions: actions, applyAction: applyAction,
    simulateInsert: simulateInsert, applyInsert: applyInsert, purchasePlan: purchasePlan, applyPurchase: applyPurchase, daily: daily, diff: diff,
    screens: screens, brief: brief, suggest: suggest, ask: ask, ingest: ingest,
    dayIdx: dayIdx, dateOf: dateOf, short: short, isRest: isRest, weekday: weekday, fmtN: fmtN, overtimeCost: overtimeCost, nextOrderId: nextOrderId
  };
});
