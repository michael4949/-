/* 报告图表库 · 模块 3 专用 · 内联 SVG，无外部依赖，纯矢量（无 filter、无模糊）
 * 形态刻意避开模块 1 / 2 已有的 39 个函数：
 *   不再做弧形仪表（m1 scoreArc / gauge6、m2 dial 已有三个）、不做环形（m2 donut）、
 *   不做纵向瀑布（m2 waterfall）、敏感度不做中轴发散条（m1 dimDiverge 已是那个形态）。
 * 本族的语汇是账簿与现金流：横向累加桥、穿越零轴的月度柱、回本曲线、区间杠铃、横向堆叠。
 * 正负值除颜色外一律有冗余编码：方向（零轴上下）、真减号 U+2212、直接标数。
 */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var M = {
    ink: '#24211C', ink2: '#3E382F', ink3: '#4A443A', sub: '#8C8678',
    cu: '#BC6A15', cu2: '#8A4E10', cuLite: '#E9C994',
    pos: '#028F72', neg: '#A8382E', cat: '#8A4FA2',
    line: '#E5E0D6', line2: '#EFEBE3', paper: '#FCFBF8', zebra: '#F7F5F0',
    grid: '#EDE8DF', sh1: '#D9D2C6'
  };
  var gid = 0;
  function el(t, a, k) { var e = document.createElementNS(NS, t); Object.keys(a || {}).forEach(function (x) { e.setAttribute(x, a[x]); }); (k || []).forEach(function (c) { if (c) e.appendChild(c); }); return e; }
  function txt(x, y, s, a) { var o = { x: x, y: y, 'font-size': 10, fill: M.ink3 }; Object.keys(a || {}).forEach(function (k) { o[k] = a[k]; }); var t = el('text', o); t.textContent = s; return t; }
  function svg(w, h, label) { return el('svg', { viewBox: '0 0 ' + w + ' ' + h, width: '100%', role: 'img', 'aria-label': label || '', style: 'font-family:inherit;display:block' }); }
  function grad(s, c1, c2, vertical) {
    var id = 'm3g' + (++gid);
    var defs = s.querySelector('defs') || s.insertBefore(el('defs'), s.firstChild);
    var g = el('linearGradient', vertical ? { id: id, x1: 0, y1: 0, x2: 0, y2: 1 } : { id: id, x1: 0, y1: 0, x2: 1, y2: 0 });
    g.appendChild(el('stop', { offset: '0%', 'stop-color': c1 }));
    g.appendChild(el('stop', { offset: '100%', 'stop-color': c2 }));
    defs.appendChild(g); return 'url(#' + id + ')';
  }
  function fmtY(n) { var a = Math.abs(n); return a >= 10000 ? (n / 10000).toFixed(a >= 100000 ? 0 : 1) + ' 万' : String(Math.round(n)); }
  function fmtS(n) { return (n < 0 ? '−' : '') + Math.abs(Math.round(n)).toLocaleString('en-US'); }
  function nice(max) { if (max <= 0) return 1; var p = Math.pow(10, Math.floor(Math.log10(max))); var r = max / p; return (r <= 1 ? 1 : r <= 2 ? 2 : r <= 5 ? 5 : 10) * p; }

  /* ---------- 1. 封面主视觉：结算流水线（企服 → AI → 回报），构图是单一横向动线 ---------- */
  function heroM3(o) {
    var W = 900, H = 300, s = svg(W, H, '投入回报主视觉');
    s.appendChild(el('rect', { x: 0, y: 0, width: W, height: H, fill: grad(s, '#1A1713', '#3A2C18') }));
    for (var i = 0; i < 26; i++) s.appendChild(el('line', { x1: i * 36, y1: 0, x2: i * 36 - 60, y2: H, stroke: '#FFFFFF', 'stroke-opacity': .03 }));
    var g = el('g');
    // 左：企服 —— 楼宇 + 账本 + 公章
    [[52, 168, 26, 76], [84, 148, 22, 96], [112, 182, 20, 62]].forEach(function (b, k) {
      g.appendChild(el('rect', { x: b[0], y: b[1], width: b[2], height: b[3], fill: 'none', stroke: '#7FE3C4', 'stroke-opacity': .5 }));
      for (var r = 0; r < Math.floor(b[3] / 16); r++) for (var c = 0; c < 2; c++)
        g.appendChild(el('rect', { x: b[0] + 5 + c * 10, y: b[1] + 8 + r * 16, width: 5, height: 6, fill: '#7FE3C4', 'fill-opacity': (r + c + k) % 3 ? .3 : .75 }));
    });
    g.appendChild(el('rect', { x: 146, y: 176, width: 46, height: 34, fill: 'none', stroke: '#E9C994', 'stroke-opacity': .62 }));
    [184, 190, 196, 202].forEach(function (y) { g.appendChild(el('line', { x1: 152, y1: y, x2: 186, y2: y, stroke: '#E9C994', 'stroke-opacity': .42 })); });
    g.appendChild(el('circle', { cx: 205, cy: 160, r: 13, fill: 'none', stroke: '#E9C994', 'stroke-opacity': .6 }));
    g.appendChild(el('text', { x: 205, y: 165, 'text-anchor': 'middle', 'font-size': 11, fill: '#E9C994', 'fill-opacity': .8 })).textContent = '章';
    // 中：AI 核心 —— 方阵 + 中心方块
    var cx = 450, cy = 150;
    g.appendChild(el('rect', { x: cx - 34, y: cy - 34, width: 68, height: 68, fill: grad(s, '#0E6B57', '#028F72'), stroke: '#7FE3C4', 'stroke-opacity': .55 }));
    g.appendChild(el('text', { x: cx, y: cy + 7, 'text-anchor': 'middle', 'font-size': 22, 'font-weight': 900, fill: '#fff' })).textContent = 'AI';
    [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1.5], [0, 1.5], [-1.5, 0], [1.5, 0]].forEach(function (d) {
      var x = cx + d[0] * 62, y = cy + d[1] * 52;
      g.appendChild(el('line', { x1: cx + d[0] * 34, y1: cy + d[1] * 30, x2: x, y2: y, stroke: '#7FE3C4', 'stroke-opacity': .32 }));
      g.appendChild(el('rect', { x: x - 4, y: y - 4, width: 8, height: 8, fill: '#7FE3C4', 'fill-opacity': .55 }));
    });
    // 右：回报 —— 向上的金额阶梯 + 转正旗
    var bx = 640;
    [30, 46, 64, 86, 112].forEach(function (h, k) {
      g.appendChild(el('rect', { x: bx + k * 34, y: 216 - h, width: 24, height: h, fill: k < 2 ? '#8A4E10' : grad(s, '#E9C994', '#BC6A15'), 'fill-opacity': k < 2 ? .8 : 1 }));
    });
    g.appendChild(el('line', { x1: bx - 8, y1: 216, x2: bx + 180, y2: 216, stroke: '#E9C994', 'stroke-opacity': .5 }));
    g.appendChild(el('path', { d: 'M' + (bx + 140) + ' 104 L' + (bx + 140) + ' 78 L' + (bx + 176) + ' 86 L' + (bx + 140) + ' 94 Z', fill: '#7FE3C4' }));
    // 贯穿的结算线：左 → 中 → 右 单一动线
    g.appendChild(el('path', { d: 'M232 168 C 320 168, 340 150, 412 150 M488 150 C 560 150, 580 178, 632 186', fill: 'none', stroke: grad(s, '#7FE3C4', '#E9C994'), 'stroke-width': 2, 'stroke-opacity': .7 }));
    s.appendChild(g);
    [['企业经营现状', 'COST SIDE', 128], ['AI 场景投入', 'THE ENGINE', 450], ['回收与结余', 'RETURN SIDE', 730]].forEach(function (t) {
      s.appendChild(txt(t[2], 262, t[0], { 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 800, fill: '#fff' }));
      s.appendChild(txt(t[2], 278, t[1], { 'text-anchor': 'middle', 'font-size': 8, 'letter-spacing': 2.6, fill: '#B9AE97' }));
    });
    return s;
  }

  /* ---------- 2. 24 个月现金流柱：穿越零轴，正负分列 ---------- */
  function cashflowBars(rows, o) {
    o = o || {};
    var W = 640, H = 210, L = 46, R = 12, T = 14, B = 26;
    var s = svg(W, H, '24 个月现金流');
    var iw = W - L - R, ih = H - T - B;
    var mx = nice(Math.max.apply(null, rows.map(function (r) { return Math.max(Math.abs(r.benefit), Math.abs(r.cost)); })) || 1);
    var zero = T + ih / 2, half = ih / 2;
    var bw = Math.min(16, iw / rows.length - 3);
    [1, .5, 0, -.5, -1].forEach(function (f) {
      var y = zero - f * half;
      s.appendChild(el('line', { x1: L, y1: y, x2: W - R, y2: y, stroke: f === 0 ? M.ink : M.grid, 'stroke-width': f === 0 ? 1.4 : 1 }));
      s.appendChild(txt(L - 6, y + 3, (f < 0 ? '−' : '') + fmtY(Math.abs(f * mx)), { 'text-anchor': 'end', 'font-size': 8.5, fill: M.sub }));
    });
    rows.forEach(function (r, i) {
      var x = L + (i + .5) * (iw / rows.length) - bw / 2;
      if (r.benefit > 0) { var hb = r.benefit / mx * half; s.appendChild(el('rect', { x: x, y: zero - hb, width: bw, height: hb, fill: M.pos })); }
      if (r.cost > 0) { var hc = r.cost / mx * half; s.appendChild(el('rect', { x: x, y: zero, width: bw, height: hc, fill: M.neg })); s.appendChild(el('path', { d: 'M' + x + ' ' + (zero + hc) + 'l' + bw + ' ' + (-hc), stroke: '#fff', 'stroke-opacity': .3, fill: 'none' })); }
      if (i === 0 || (i + 1) % 6 === 0) s.appendChild(txt(x + bw / 2, H - 9, String(r.m), { 'text-anchor': 'middle', 'font-size': 8.5, fill: M.sub }));
    });
    s.appendChild(txt(L, T + 8, '收 ▲', { 'font-size': 8.5, fill: M.pos, 'font-weight': 700 }));
    s.appendChild(txt(L, H - B + 2, '支 ▼', { 'font-size': 8.5, fill: M.neg, 'font-weight': 700 }));
    s.appendChild(txt(W - R, H - 9, '月', { 'text-anchor': 'end', 'font-size': 8.5, fill: M.sub }));
    return s;
  }

  /* ---------- 3. 回本曲线：累计净额穿越零轴，标出转正点 ---------- */
  function paybackCurve(rows, pay, o) {
    o = o || {};
    var W = 640, H = 200, L = 52, R = 14, T = 16, B = 26;
    var s = svg(W, H, '累计净额回本曲线');
    var iw = W - L - R, ih = H - T - B;
    var vals = rows.map(function (r) { return r.cum; });
    var lo = Math.min.apply(null, vals.concat([0])), hi = Math.max.apply(null, vals.concat([0]));
    var span = (hi - lo) || 1;
    var Y = function (v) { return T + ih - (v - lo) / span * ih; };
    var X = function (i) { return L + i * (iw / (rows.length - 1)); };
    var zy = Y(0);
    // 零轴上下分带
    s.appendChild(el('rect', { x: L, y: T, width: iw, height: Math.max(0, zy - T), fill: '#F2FAF7' }));
    s.appendChild(el('rect', { x: L, y: zy, width: iw, height: Math.max(0, T + ih - zy), fill: '#FDF6F4' }));
    [0, .25, .5, .75, 1].forEach(function (f) {
      var v = lo + f * span, y = Y(v);
      s.appendChild(el('line', { x1: L, y1: y, x2: W - R, y2: y, stroke: M.grid }));
      s.appendChild(txt(L - 6, y + 3, fmtY(v), { 'text-anchor': 'end', 'font-size': 8.5, fill: M.sub }));
    });
    s.appendChild(el('line', { x1: L, y1: zy, x2: W - R, y2: zy, stroke: M.ink, 'stroke-width': 1.4 }));
    var d = rows.map(function (r, i) { return (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(r.cum).toFixed(1); }).join('');
    // 面积
    s.appendChild(el('path', { d: d + 'L' + X(rows.length - 1).toFixed(1) + ' ' + zy.toFixed(1) + 'L' + X(0).toFixed(1) + ' ' + zy.toFixed(1) + 'Z', fill: M.cu, 'fill-opacity': .1 }));
    s.appendChild(el('path', { d: d, fill: 'none', stroke: M.cu, 'stroke-width': 2.2 }));
    rows.forEach(function (r, i) { if ((i + 1) % 3 === 0 || i === 0) s.appendChild(el('rect', { x: X(i) - 2, y: Y(r.cum) - 2, width: 4, height: 4, fill: M.cu })); });
    if (pay) {
      var pi = pay - 1, px = X(pi);
      s.appendChild(el('line', { x1: px, y1: T, x2: px, y2: T + ih, stroke: M.pos, 'stroke-width': 1.4, 'stroke-dasharray': '4 3' }));
      s.appendChild(el('rect', { x: px - 4, y: Y(rows[pi].cum) - 4, width: 8, height: 8, fill: M.pos, stroke: '#fff', 'stroke-width': 1.5 }));
      var lab = '第 ' + pay + ' 个月转正', lx = Math.min(px + 7, W - R - 74);
      s.appendChild(el('rect', { x: lx, y: T + 2, width: 72, height: 15, fill: '#fff', stroke: M.pos }));
      s.appendChild(txt(lx + 36, T + 13, lab, { 'text-anchor': 'middle', 'font-size': 9, 'font-weight': 800, fill: M.pos }));
    }
    [1, 6, 12, 18, 24].forEach(function (m) { if (m <= rows.length) s.appendChild(txt(X(m - 1), H - 9, String(m), { 'text-anchor': 'middle', 'font-size': 8.5, fill: M.sub })); });
    s.appendChild(txt(W - R, H - 9, '月', { 'text-anchor': 'end', 'font-size': 8.5, fill: M.sub }));
    return s;
  }

  /* ---------- 4. 收益杠杆桥：横向累加，与模块 2 的纵向瀑布形态不同 ---------- */
  function benefitBridge(levers, total, o) {
    o = o || {};
    var rowH = 26, W = 600, H = 34 + levers.length * rowH + 34;
    var s = svg(W, H, '收益杠杆桥');
    var L = 96, R = 92, iw = W - L - R;
    var acc = 0, mx = Math.max(total, 1);
    levers.forEach(function (lv, i) {
      var y = 30 + i * rowH;
      var x0 = L + acc / mx * iw, w = Math.max(2, lv.final / mx * iw);
      s.appendChild(txt(L - 8, y + 12, lv.name, { 'text-anchor': 'end', 'font-size': 10, 'font-weight': 700, fill: M.ink }));
      s.appendChild(el('rect', { x: x0, y: y, width: w, height: 16, fill: lv.cash ? grad(s, M.cuLite, M.cu) : M.sub, 'fill-opacity': lv.cash ? 1 : .5 }));
      if (!lv.cash) for (var t = 0; t < w; t += 5) s.appendChild(el('line', { x1: x0 + t, y1: y + 16, x2: x0 + t + 5, y2: y, stroke: '#fff', 'stroke-opacity': .5 }));
      if (i) s.appendChild(el('line', { x1: x0, y1: y - rowH + 16, x2: x0, y2: y, stroke: M.line, 'stroke-dasharray': '2 2' }));
      s.appendChild(txt(W - R + 6, y + 12, fmtS(lv.final), { 'font-size': 10, 'font-weight': 800, fill: lv.cash ? M.cu2 : M.sub, 'font-variant-numeric': 'tabular-nums' }));
      if (lv.discounted) s.appendChild(txt(x0 + w + 4, y + 12, '×35%', { 'font-size': 8, fill: M.sub }));
      acc += lv.final;
    });
    var yt = 30 + levers.length * rowH + 4;
    s.appendChild(el('line', { x1: L, y1: yt, x2: W - R, y2: yt, stroke: M.ink }));
    s.appendChild(el('rect', { x: L, y: yt + 4, width: iw, height: 18, fill: M.ink }));
    s.appendChild(txt(L - 8, yt + 17, '合计', { 'text-anchor': 'end', 'font-size': 10.5, 'font-weight': 900, fill: M.ink }));
    s.appendChild(txt(L + 8, yt + 17, '每月收益', { 'font-size': 9.5, 'font-weight': 700, fill: '#fff' }));
    s.appendChild(txt(W - R + 6, yt + 17, fmtS(total), { 'font-size': 11.5, 'font-weight': 900, fill: M.ink, 'font-variant-numeric': 'tabular-nums' }));
    s.appendChild(txt(L, 14, '元 / 月', { 'font-size': 8.5, fill: M.sub }));
    s.appendChild(txt(W - R + 6, 14, '计入额', { 'font-size': 8.5, fill: M.sub }));
    return s;
  }

  /* ---------- 5. 投入构成：横向堆叠（不做环形，模块 2 已有） ---------- */
  function investStack(items, o) {
    o = o || {};
    var W = 420, H = 30 + items.length * 20 + 42;
    var s = svg(W, H, '投入构成');
    var total = items.reduce(function (t, x) { return t + x.amount; }, 0) || 1;
    var COLORS = [M.cu, M.cu2, M.cat, M.neg, M.sub];
    var x = 10, bw = W - 20;
    s.appendChild(el('rect', { x: 10, y: 10, width: bw, height: 26, fill: '#fff', stroke: M.line }));
    items.forEach(function (it, i) {
      var w = it.amount / total * bw;
      s.appendChild(el('rect', { x: x, y: 10, width: w, height: 26, fill: COLORS[i % COLORS.length] }));
      s.appendChild(el('rect', { x: x, y: 10, width: w, height: 3, fill: '#fff', 'fill-opacity': .3 }));
      if (w > 34) s.appendChild(txt(x + w / 2, 27, Math.round(it.amount / total * 100) + '%', { 'text-anchor': 'middle', 'font-size': 9, 'font-weight': 800, fill: '#fff' }));
      x += w;
    });
    items.forEach(function (it, i) {
      var y = 48 + i * 20;
      s.appendChild(el('rect', { x: 10, y: y, width: 10, height: 10, fill: COLORS[i % COLORS.length] }));
      s.appendChild(txt(26, y + 9, it.name, { 'font-size': 9.5, fill: M.ink3 }));
      s.appendChild(txt(W - 10, y + 9, fmtS(it.amount) + ' 元', { 'text-anchor': 'end', 'font-size': 9.5, 'font-weight': 800, fill: M.ink, 'font-variant-numeric': 'tabular-nums' }));
    });
    return s;
  }

  /* ---------- 6. 敏感度：区间杠铃（不做中轴发散条，模块 1 dimDiverge 已是那形态） ---------- */
  function sensitivityRange(items, base, horizon, o) {
    o = o || {};
    var rowH = 28, W = 560, H = 26 + items.length * rowH + 24;
    var s = svg(W, H, '敏感度');
    var L = 118, R = 58, iw = W - L - R;
    var maxM = horizon + 1;
    var X = function (m) { return L + (m == null ? maxM : m) / maxM * iw; };
    [1, 6, 12, 18, 24].forEach(function (m) {
      s.appendChild(el('line', { x1: X(m), y1: 20, x2: X(m), y2: H - 22, stroke: M.grid }));
      s.appendChild(txt(X(m), H - 10, String(m), { 'text-anchor': 'middle', 'font-size': 8.5, fill: M.sub }));
    });
    s.appendChild(txt(W - R + 8, H - 10, '月', { 'font-size': 8.5, fill: M.sub }));
    if (base) s.appendChild(el('line', { x1: X(base), y1: 20, x2: X(base), y2: H - 22, stroke: M.ink, 'stroke-width': 1.4, 'stroke-dasharray': '4 3' }));
    items.forEach(function (it, i) {
      var y = 26 + i * rowH + 8;
      var a = Math.min(X(it.low), X(it.high)), b = Math.max(X(it.low), X(it.high));
      s.appendChild(txt(L - 8, y + 4, it.label, { 'text-anchor': 'end', 'font-size': 10, 'font-weight': 700, fill: M.ink }));
      s.appendChild(el('line', { x1: a, y1: y, x2: b, y2: y, stroke: M.cu, 'stroke-width': 5 }));
      [[a, it.low], [b, it.high]].forEach(function (p) {
        var beyond = p[1] == null;
        s.appendChild(el('rect', { x: p[0] - 4, y: y - 4, width: 8, height: 8, fill: beyond ? '#fff' : M.cu2, stroke: M.cu2, 'stroke-width': 1.4 }));
      });
      s.appendChild(txt(W - R + 8, y + 4, it.spread ? '±' + it.spread + ' 月' : '不变', { 'font-size': 9, 'font-weight': 800, fill: it.spread ? M.ink : M.sub }));
    });
    s.appendChild(txt(L, 14, '每项上下各调 20%，看回本月挪到哪；空心端表示超过 ' + horizon + ' 个月', { 'font-size': 8.5, fill: M.sub }));
    return s;
  }

  /* ---------- 7. 三档情景：区间带 + 三个标记 ---------- */
  function scenarioBand(list, horizon, o) {
    o = o || {};
    var W = 600, H = 132, L = 16, R = 16;
    var s = svg(W, H, '三档情景');
    var iw = W - L - R, maxM = horizon + 1;
    var X = function (m) { return L + (m == null ? maxM : m) / maxM * iw; };
    var cons = list[0], mid = list[1], opt = list[2];
    s.appendChild(el('rect', { x: X(opt.payback), y: 44, width: Math.max(2, X(cons.payback) - X(opt.payback)), height: 26, fill: M.cu, 'fill-opacity': .16 }));
    s.appendChild(el('line', { x1: L, y1: 70, x2: W - R, y2: 70, stroke: M.ink }));
    [1, 6, 12, 18, 24].forEach(function (m) {
      s.appendChild(el('line', { x1: X(m), y1: 66, x2: X(m), y2: 74, stroke: M.ink }));
      s.appendChild(txt(X(m), 86, '第 ' + m + ' 月', { 'text-anchor': 'middle', 'font-size': 8.5, fill: M.sub }));
    });
    var seen = [];
    list.forEach(function (sc, i) {
      var x = X(sc.payback), up = i !== 1;
      var y = up ? 38 : 96;
      while (seen.some(function (p) { return Math.abs(p[0] - x) < 58 && p[1] === y; })) { y += up ? -16 : 16; }
      seen.push([x, y]);
      s.appendChild(el('line', { x1: x, y1: up ? y + 4 : y - 10, x2: x, y2: 70, stroke: M.ink2, 'stroke-dasharray': '2 2' }));
      s.appendChild(el('rect', { x: x - 3, y: 67, width: 6, height: 6, fill: i === 1 ? M.cu : M.ink2 }));
      var t = sc.name + '：' + (sc.payback ? '第 ' + sc.payback + ' 月' : '超过 ' + horizon + ' 月');
      var w = t.length * 9 + 10, bx = Math.max(L, Math.min(x - w / 2, W - R - w));
      s.appendChild(el('rect', { x: bx, y: y - 12, width: w, height: 16, fill: '#fff', stroke: i === 1 ? M.cu : M.line }));
      s.appendChild(txt(bx + w / 2, y, t, { 'text-anchor': 'middle', 'font-size': 9.5, 'font-weight': i === 1 ? 800 : 700, fill: i === 1 ? M.cu2 : M.ink3 }));
    });
    s.appendChild(txt(L, 118, '带宽是保守档与积极档之间的距离；做决定时看保守档', { 'font-size': 8.5, fill: M.sub }));
    return s;
  }

  /* ---------- 8. 收益构成：现金 vs 工时 分栏条 ---------- */
  function cashVsHours(cash, hours, o) {
    var W = 420, H = 84, L = 10, R = 10;
    var s = svg(W, H, '收益构成');
    var total = (cash + hours) || 1, iw = W - L - R;
    var cw = cash / total * iw;
    s.appendChild(el('rect', { x: L, y: 22, width: cw, height: 24, fill: grad(s, M.cuLite, M.cu) }));
    s.appendChild(el('rect', { x: L + cw, y: 22, width: iw - cw, height: 24, fill: '#EDE8DF' }));
    for (var t = 0; t < iw - cw; t += 6) s.appendChild(el('line', { x1: L + cw + t, y1: 46, x2: L + cw + t + 6, y2: 22, stroke: M.sub, 'stroke-opacity': .5 }));
    s.appendChild(txt(L, 16, '现金收益', { 'font-size': 9.5, 'font-weight': 800, fill: M.cu2 }));
    s.appendChild(txt(W - R, 16, '工时折算（不计入回收期）', { 'text-anchor': 'end', 'font-size': 9.5, 'font-weight': 700, fill: M.sub }));
    s.appendChild(txt(L, 62, fmtS(cash) + ' 元 / 月', { 'font-size': 11, 'font-weight': 900, fill: M.ink }));
    s.appendChild(txt(W - R, 62, fmtS(hours) + ' 元 / 月', { 'text-anchor': 'end', 'font-size': 11, 'font-weight': 900, fill: M.sub }));
    s.appendChild(txt(L, 76, '斜纹部分只有在省下的时间换成别的产出时才成立', { 'font-size': 8.5, fill: M.sub }));
    return s;
  }

  /* ---------- 9. 爬坡：前三个月的收益到位比例 ---------- */
  function rampSteps(ramp, monthly, o) {
    var W = 420, H = 110, L = 34, B = 26;
    var s = svg(W, H, '收益爬坡');
    var n = ramp.length + 1, bw = (W - L - 16) / n - 10;
    ramp.concat([1]).forEach(function (f, i) {
      var h = f * (H - B - 22), x = L + i * ((W - L - 16) / n);
      s.appendChild(el('rect', { x: x, y: H - B - h, width: bw, height: h, fill: i === ramp.length ? grad(s, M.cuLite, M.cu) : '#E6D9C2' }));
      s.appendChild(txt(x + bw / 2, H - B - h - 5, Math.round(f * 100) + '%', { 'text-anchor': 'middle', 'font-size': 9.5, 'font-weight': 800, fill: M.ink }));
      s.appendChild(txt(x + bw / 2, H - 10, i === ramp.length ? '第 4 月起' : '第 ' + (i + 1) + ' 月', { 'text-anchor': 'middle', 'font-size': 8.5, fill: M.sub }));
    });
    s.appendChild(el('line', { x1: L - 4, y1: H - B, x2: W - 12, y2: H - B, stroke: M.ink }));
    s.appendChild(txt(L - 8, 20, '满额 ' + fmtS(monthly) + ' 元 / 月', { 'font-size': 9, fill: M.sub }));
    return s;
  }

  /* ---------- 10. 口径来源：逐项标出谁给的 ---------- */
  function sourceGrid(entries, o) {
    var W = 560, cols = 3, rows = Math.ceil(entries.length / cols);
    var H = 18 + rows * 22 + 16, cw = W / cols;
    var s = svg(W, H, '口径来源');
    var C = { user: M.pos, profile: M.cu, 'default': M.neg, scene: M.cat };
    var N = { user: '贵司填写', profile: '按画像推的参考值', 'default': '未填，按 0 计', scene: '场景库' };
    entries.forEach(function (e, i) {
      var x = (i % cols) * cw + 8, y = 18 + Math.floor(i / cols) * 22;
      s.appendChild(el('rect', { x: x, y: y, width: 8, height: 8, fill: C[e.src] || M.sub }));
      s.appendChild(txt(x + 14, y + 8, e.label, { 'font-size': 9.5, fill: M.ink3 }));
    });
    var lx = 8;
    Object.keys(N).forEach(function (k) {
      s.appendChild(el('rect', { x: lx, y: H - 12, width: 8, height: 8, fill: C[k] }));
      s.appendChild(txt(lx + 12, H - 4, N[k], { 'font-size': 8.5, fill: M.sub }));
      lx += N[k].length * 9 + 30;
    });
    return s;
  }

  /* ---------- 11. 置信度：线性刻度（不做仪表盘） ---------- */
  function confidenceBar(score, bands, o) {
    var W = 420, H = 62, L = 10, R = 10;
    var s = svg(W, H, '口径可信度');
    var iw = W - L - R;
    [[0, 60, M.neg], [60, 80, M.cu], [80, 100, M.pos]].forEach(function (b) {
      s.appendChild(el('rect', { x: L + b[0] / 100 * iw, y: 22, width: (b[1] - b[0]) / 100 * iw, height: 14, fill: b[2], 'fill-opacity': .22 }));
    });
    s.appendChild(el('rect', { x: L, y: 22, width: score / 100 * iw, height: 14, fill: score >= 80 ? M.pos : score >= 60 ? M.cu : M.neg }));
    var x = L + score / 100 * iw;
    s.appendChild(el('path', { d: 'M' + x + ' 18 l-5 -8 h10 Z', fill: M.ink }));
    s.appendChild(txt(x, 8, score + ' 分', { 'text-anchor': 'middle', 'font-size': 10.5, 'font-weight': 900, fill: M.ink }));
    [[0, '需要补数'], [60, '可作参考'], [80, '口径扎实']].forEach(function (b) {
      s.appendChild(txt(L + b[0] / 100 * iw + 3, 50, b[1], { 'font-size': 8.5, fill: M.sub }));
    });
    return s;
  }

  /* ---------- 12. 月度台账阶梯：24 个月累计净额的台阶读法 ---------- */
  function monthLadder(rows, pay, o) {
    var W = 640, H = 96, L = 12, R = 12;
    var s = svg(W, H, '月度台账');
    var iw = W - L - R, cw = iw / rows.length;
    var vals = rows.map(function (r) { return r.cum; });
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals), span = (hi - lo) || 1;
    rows.forEach(function (r, i) {
      var h = (r.cum - lo) / span * 46;
      var pos = r.cum > 0;
      s.appendChild(el('rect', { x: L + i * cw + 1, y: 58 - h, width: cw - 2, height: Math.max(1.5, h), fill: pos ? M.pos : M.neg, 'fill-opacity': pos ? .85 : .6 }));
      if (pay && r.m === pay) s.appendChild(el('rect', { x: L + i * cw, y: 54 - h - 4, width: cw, height: 3, fill: M.ink }));
    });
    s.appendChild(el('line', { x1: L, y1: 58, x2: W - R, y2: 58, stroke: M.ink }));
    [1, 6, 12, 18, 24].forEach(function (m) { s.appendChild(txt(L + (m - .5) * cw, 72, String(m), { 'text-anchor': 'middle', 'font-size': 8.5, fill: M.sub })); });
    s.appendChild(txt(L, 88, '累计净额：红为未回收，绿为已转正' + (pay ? '；黑标为第 ' + pay + ' 个月' : ''), { 'font-size': 8.5, fill: M.sub }));
    return s;
  }

  window.DGG = window.DGG || {}; window.DGG.charts = window.DGG.charts || {};
  Object.assign(window.DGG.charts, {
    heroM3: heroM3, cashflowBars: cashflowBars, paybackCurve: paybackCurve, benefitBridge: benefitBridge,
    investStack: investStack, sensitivityRange: sensitivityRange, scenarioBand: scenarioBand,
    cashVsHours: cashVsHours, rampSteps: rampSteps, sourceGrid: sourceGrid,
    confidenceBar: confidenceBar, monthLadder: monthLadder, M3PALETTE: M
  });
})();
