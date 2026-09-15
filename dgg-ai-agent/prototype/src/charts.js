/* 报告图表库 v2 · 内联 SVG，无外部依赖 · 咨询报告信息图风格
 * hero 封面主视觉 · radar 六维雷达 · gradBars 渐变条+说明 · vbars 竖条+参考带 · levelScale 等级刻度 · stackBar 堆叠条
 * bell 同行分布 · rankedBars 排序横条 · timeline 路线图 · matrix 价值/难度矩阵 · donut 环图 · ring 进度环
 */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var P = { navy: '#0A2A5E', navy2: '#06152E', blue: '#1157B5', blue2: '#5274F0', cyan: '#00C2F0', green: '#0E9F6E', orange: '#FF8A3D', purple: '#8A54DC', pink: '#C46F8D', gray: '#919FB7', red: '#D0453B', text: '#2C3A52', sub: '#78869C', line: '#DCE4F0', bg: '#F7FAFD', grid: '#E3E9F3' };
  var STATUS = { low: P.orange, mid: P.blue, high: P.green };
  var gid = 0;
  function el(tag, attrs, kids) { var e = document.createElementNS(NS, tag); Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); }); (kids || []).forEach(function (c) { if (c) e.appendChild(c); }); return e; }
  function txt(x, y, s, a) { var o = { x: x, y: y, 'font-size': 12, fill: P.text }; Object.keys(a || {}).forEach(function (k) { o[k] = a[k]; }); var t = el('text', o); t.textContent = s; return t; }
  function svg(w, h, label) { return el('svg', { viewBox: '0 0 ' + w + ' ' + h, width: '100%', role: 'img', 'aria-label': label || '', style: 'font-family:inherit;display:block' }); }
  function grad(s, c1, c2, vertical) {
    var id = 'g' + (++gid);
    var defs = s.querySelector('defs') || s.insertBefore(el('defs'), s.firstChild);
    var g = el('linearGradient', vertical ? { id: id, x1: 0, y1: 0, x2: 0, y2: 1 } : { id: id, x1: 0, y1: 0, x2: 1, y2: 0 });
    g.appendChild(el('stop', { offset: '0%', 'stop-color': c1 })); g.appendChild(el('stop', { offset: '100%', 'stop-color': c2 }));
    defs.appendChild(g); return 'url(#' + id + ')';
  }
  function lighten(hex, k) { var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; var f = function (c) { return Math.round(c + (255 - c) * k); }; return '#' + ((1 << 24) + (f(r) << 16) + (f(g) << 8) + f(b)).toString(16).slice(1); }
  function trunc(s, n) { s = String(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
  function lcg(seed) { var x = seed; return function () { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648; }; }
  var C = { P: P, STATUS: STATUS };

  // ---------- 封面主视觉：深色科技网格 + 电路线 + 数据驱动的六维多边形 + 节点网络 ----------
  C.hero = function (dims, seed) {
    var W = 1000, H = 520, s = svg(W, H, '封面主视觉');
    var bg = grad(s, '#061A3C', '#0A2A5E', false);
    s.appendChild(el('rect', { x: 0, y: 0, width: W, height: H, fill: bg }));
    var glow = grad(s, '#1E3FA8', '#5B2FB6', false);
    s.appendChild(el('rect', { x: 600, y: 0, width: 400, height: H, fill: glow, opacity: .35 }));
    for (var x = 0; x <= W; x += 40) s.appendChild(el('line', { x1: x, y1: 0, x2: x, y2: H, stroke: '#3B5FA8', 'stroke-width': .6, opacity: .35 }));
    for (var y = 0; y <= H; y += 40) s.appendChild(el('line', { x1: 0, y1: y, x2: W, y2: y, stroke: '#3B5FA8', 'stroke-width': .6, opacity: .35 }));
    var rnd = lcg(seed || 7);
    for (var i = 0; i < 14; i++) {
      var x0 = 60 + rnd() * 880, y0 = 40 + rnd() * 440, len = 60 + rnd() * 120, dir = rnd() > .5 ? 1 : -1;
      var d = 'M' + x0 + ' ' + y0 + ' h' + len + ' l' + (30 * dir) + ' ' + (-30) + ' h' + (40 + rnd() * 60);
      s.appendChild(el('path', { d: d, fill: 'none', stroke: P.cyan, 'stroke-width': 1.2, opacity: .55 }));
      s.appendChild(el('circle', { cx: x0, cy: y0, r: 3, fill: P.cyan, opacity: .9 }));
    }
    // 六维多边形（数据驱动）
    var cx = 270, cy = 335, R = 118, N = dims.length;
    function pt(i, v) { var a = -Math.PI / 2 + i * 2 * Math.PI / N, r = R * v / 100; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
    function poly(v) { return v.map(function (x, i) { return pt(i, x).join(','); }).join(' '); }
    [33, 66, 100].forEach(function (g) { s.appendChild(el('polygon', { points: poly(dims.map(function () { return g; })), fill: 'none', stroke: '#7FA6FF', 'stroke-width': g === 100 ? 1.5 : .8, opacity: .5 })); });
    dims.forEach(function (_, i) { var p = pt(i, 100); s.appendChild(el('line', { x1: cx, y1: cy, x2: p[0], y2: p[1], stroke: '#7FA6FF', 'stroke-width': .8, opacity: .4 })); });
    var pf = grad(s, '#00C2F0', '#5274F0', true);
    s.appendChild(el('polygon', { points: poly(dims.map(function (d) { return d.pct; })), fill: pf, opacity: .55, stroke: P.cyan, 'stroke-width': 2.5, 'stroke-linejoin': 'round' }));
    dims.forEach(function (d, i) {
      var p = pt(i, d.pct); s.appendChild(el('circle', { cx: p[0], cy: p[1], r: 5, fill: '#fff' })); s.appendChild(el('circle', { cx: p[0], cy: p[1], r: 9, fill: 'none', stroke: P.cyan, 'stroke-width': 1.5, opacity: .8 }));
      var lp = pt(i, 118); s.appendChild(txt(lp[0], lp[1] + 5, d.name, { 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700, fill: '#DCE8FF' }));
    });
    // 节点网络
    var nodes = [[700, 150], [700, 250], [700, 350], [800, 120], [800, 220], [800, 320], [800, 420], [900, 190], [900, 330]];
    for (var a = 0; a < 3; a++) for (var b = 3; b < 7; b++) s.appendChild(el('line', { x1: nodes[a][0], y1: nodes[a][1], x2: nodes[b][0], y2: nodes[b][1], stroke: '#8B7CF6', 'stroke-width': .8, opacity: .55 }));
    for (var b2 = 3; b2 < 7; b2++) for (var c2 = 7; c2 < 9; c2++) s.appendChild(el('line', { x1: nodes[b2][0], y1: nodes[b2][1], x2: nodes[c2][0], y2: nodes[c2][1], stroke: '#8B7CF6', 'stroke-width': .8, opacity: .55 }));
    nodes.forEach(function (n, i) { var col = i < 3 ? P.cyan : (i < 7 ? P.blue2 : P.purple); s.appendChild(el('circle', { cx: n[0], cy: n[1], r: 16, fill: col, opacity: .25 })); s.appendChild(el('circle', { cx: n[0], cy: n[1], r: 9, fill: col, stroke: '#fff', 'stroke-width': 1.5 })); });
    s.appendChild(txt(800, 480, 'AI MATURITY ENGINE', { 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 800, fill: '#B9A6FF', 'letter-spacing': 3 }));
    var bar = grad(s, '#5274F0', '#C46F8D', false);
    s.appendChild(el('rect', { x: 0, y: H - 8, width: W, height: 8, fill: bar }));
    return s;
  };

  // ---------- 六维雷达 + 同行参考带 ----------
  C.radar = function (dims, opts) {
    opts = opts || {};
    var W = 440, cx = 220, cy = 222, R = 138, N = dims.length;
    var s = svg(W, 440, '六维成熟度雷达图');
    function pt(i, v) { var a = -Math.PI / 2 + i * 2 * Math.PI / N, r = R * v / 100; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
    function poly(v) { return v.map(function (x, i) { return pt(i, x).join(','); }).join(' '); }
    [25, 50, 75, 100].forEach(function (g) { s.appendChild(el('polygon', { points: poly(dims.map(function () { return g; })), fill: 'none', stroke: '#C9D4E8', 'stroke-width': g === 100 ? 1.4 : 1 })); });
    dims.forEach(function (_, i) { var p = pt(i, 100); s.appendChild(el('line', { x1: cx, y1: cy, x2: p[0], y2: p[1], stroke: '#C9D4E8' })); });
    if (opts.band !== false && dims.every(function (d) { return d.band; })) {
      var o = poly(dims.map(function (d) { return d.band[1]; })), inn = poly(dims.map(function (d) { return d.band[0]; }));
      s.appendChild(el('path', { d: 'M' + o.replace(/ /g, ' L') + ' Z M' + inn.replace(/ /g, ' L') + ' Z', fill: 'rgba(255,138,61,.16)', 'fill-rule': 'evenodd', stroke: P.orange, 'stroke-width': 1.4, 'stroke-dasharray': '4 3' }));
    }
    s.appendChild(el('polygon', { points: poly(dims.map(function (d) { return d.pct; })), fill: 'rgba(17,87,181,.22)', stroke: P.blue, 'stroke-width': 3, 'stroke-linejoin': 'round' }));
    dims.forEach(function (d, i) {
      var p = pt(i, d.pct);
      s.appendChild(el('circle', { cx: p[0], cy: p[1], r: 7, fill: '#fff', stroke: P.blue, 'stroke-width': 3 }));
      var lp = pt(i, 121), anchor = Math.abs(lp[0] - cx) < 8 ? 'middle' : (lp[0] < cx ? 'end' : 'start');
      s.appendChild(txt(lp[0], lp[1] - 3, d.name, { 'text-anchor': anchor, 'font-size': 15, 'font-weight': 800, fill: P.text }));
      s.appendChild(txt(lp[0], lp[1] + 15, d.pct + '%', { 'text-anchor': anchor, 'font-size': 13, 'font-weight': 800, fill: P.blue }));
    });
    return s;
  };

  // ---------- 渐变横条 + 每条一句说明（就绪度面板右侧 / 子维度）----------
  C.gradBars = function (items, opts) {
    opts = opts || {};
    var W = opts.width || 520, L = opts.labelW || 96, rowH = opts.explain === false ? 40 : 64, top = 6, H = top + items.length * rowH;
    var s = svg(W, H, opts.label || '得分条');
    var bx = L + 10, bw = W - bx - 64;
    items.forEach(function (it, i) {
      var y = top + i * rowH, col = it.color || STATUS[it.band] || P.blue;
      s.appendChild(txt(L, y + 20, it.name, { 'text-anchor': 'end', 'font-size': 14, 'font-weight': 800, fill: P.text }));
      s.appendChild(el('rect', { x: bx, y: y + 6, width: bw, height: 18, rx: 9, fill: '#E9EEF6' }));
      s.appendChild(el('rect', { x: bx, y: y + 6, width: Math.max(18, bw * it.value / 100), height: 18, rx: 9, fill: grad(s, lighten(col, .35), col, false) }));
      s.appendChild(txt(W - 4, y + 21, it.valueText != null ? it.valueText : Math.round(it.value), { 'text-anchor': 'end', 'font-size': 16, 'font-weight': 800, fill: col, style: 'font-variant-numeric:tabular-nums' }));
      if (opts.explain !== false && it.explain) s.appendChild(txt(bx, y + 44, trunc(it.explain, opts.explainLen || 34), { 'font-size': 11.5, fill: P.sub }));
    });
    return s;
  };

  // ---------- 竖条 + 参考带区间（六维得分）----------
  C.vbars = function (items, opts) {
    opts = opts || {};
    var W = 760, H = 300, L = 40, R = 740, T = 40, B = 240, n = items.length, slot = (R - L) / n, bw = Math.min(64, slot * .5);
    var s = svg(W, H, '六维得分与参考带');
    var Y = function (v) { return B - (B - T) * v / 100; };
    [0, 25, 50, 75, 100].forEach(function (g) { s.appendChild(el('line', { x1: L, y1: Y(g), x2: R, y2: Y(g), stroke: P.grid })); s.appendChild(txt(L - 6, Y(g) + 4, g + '%', { 'text-anchor': 'end', 'font-size': 10, fill: P.sub })); });
    items.forEach(function (it, i) {
      var x = L + slot * i + slot / 2;
      if (it.band) { s.appendChild(el('rect', { x: x - bw / 2 - 10, y: Y(it.band[1]), width: bw + 20, height: Y(it.band[0]) - Y(it.band[1]), fill: 'rgba(255,138,61,.14)', stroke: P.orange, 'stroke-width': 1, 'stroke-dasharray': '3 2', rx: 3 })); }
      var col = it.position === 'below' ? P.red : it.color;
      s.appendChild(el('rect', { x: x - bw / 2, y: Y(it.value), width: bw, height: B - Y(it.value), rx: 6, fill: grad(s, col, lighten(col, .25), true) }));
      s.appendChild(txt(x, Y(it.value) - 8, it.value + '%', { 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 800, fill: col }));
      s.appendChild(txt(x, B + 20, it.name, { 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: P.text }));
      s.appendChild(txt(x, B + 38, it.sub || '', { 'text-anchor': 'middle', 'font-size': 11, fill: it.position === 'below' ? P.red : (it.position === 'above' ? P.green : P.sub), 'font-weight': 700 }));
    });
    s.appendChild(el('line', { x1: L, y1: B, x2: R, y2: B, stroke: P.line }));
    s.appendChild(el('rect', { x: R - 150, y: 8, width: 14, height: 10, fill: 'rgba(255,138,61,.3)', stroke: P.orange, 'stroke-dasharray': '3 2' })); s.appendChild(txt(R - 132, 17, '同行参考带区间', { 'font-size': 11, fill: P.sub }));
    return s;
  };

  // ---------- 等级刻度 ----------
  C.levelScale = function (levels, pct, currentCode) {
    var W = 760, H = 104, x0 = 20, x1 = 740, y = 44, hgt = 22;
    var s = svg(W, H, '成熟度等级刻度');
    var shades = ['#DCE4F5', '#B9C7F5', '#7FA0EF', '#1157B5', '#0A2A5E'];
    var X = function (p) { return x0 + (x1 - x0) * p / 100; };
    levels.forEach(function (l, i) {
      var a = l.minPct, b = i < levels.length - 1 ? levels[i + 1].minPct : 100, cur = l.code === currentCode;
      s.appendChild(el('rect', { x: X(a) + 1, y: y, width: Math.max(0, X(b) - X(a) - 2), height: hgt, rx: 5, fill: shades[i], stroke: cur ? P.cyan : 'none', 'stroke-width': 3 }));
      s.appendChild(txt((X(a) + X(b)) / 2, y + hgt + 18, l.code + ' ' + l.name, { 'text-anchor': 'middle', 'font-weight': cur ? 800 : 600, 'font-size': 13, fill: cur ? P.navy : P.sub }));
      if (i > 0) s.appendChild(txt(X(a), y + hgt + 34, a + '%', { 'text-anchor': 'middle', 'font-size': 10, fill: P.sub }));
    });
    var mx = X(pct);
    s.appendChild(el('path', { d: 'M' + mx + ' ' + (y - 4) + ' l-8 -13 h16 z', fill: P.cyan }));
    s.appendChild(el('line', { x1: mx, y1: y - 4, x2: mx, y2: y + hgt + 2, stroke: P.cyan, 'stroke-width': 3 }));
    s.appendChild(txt(mx, y - 22, '本企业 ' + pct + '%', { 'text-anchor': mx > 660 ? 'end' : (mx < 100 ? 'start' : 'middle'), 'font-weight': 800, 'font-size': 14, fill: P.navy }));
    return s;
  };

  // ---------- 堆叠条 ----------
  C.stackBar = function (segs) {
    var W = 760, H = 78, x0 = 20, x1 = 740, y = 22, hgt = 30, total = segs.reduce(function (t, x) { return t + x.max; }, 0);
    var s = svg(W, H, '总分分解'), x = x0;
    segs.forEach(function (g) {
      var wMax = (x1 - x0) * g.max / total, w = (x1 - x0) * g.v / total;
      s.appendChild(el('rect', { x: x, y: y, width: wMax - 2, height: hgt, rx: 5, fill: g.color, opacity: .16 }));
      s.appendChild(el('rect', { x: x, y: y, width: Math.max(0, w - 2), height: hgt, rx: 5, fill: grad(s, g.color, lighten(g.color, .2), false) }));
      s.appendChild(txt(x + wMax / 2, y + hgt + 18, g.name + ' ' + g.v + '/' + g.max, { 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, fill: P.sub }));
      if (w > 34) s.appendChild(txt(x + 8, y + 20, String(g.v), { 'font-size': 13, 'font-weight': 800, fill: '#fff' }));
      x += wMax;
    });
    s.appendChild(txt(x1, y - 6, '合计 ' + segs.reduce(function (t, g) { return t + g.v; }, 0) + ' / ' + total, { 'text-anchor': 'end', 'font-size': 12, 'font-weight': 800, fill: P.navy }));
    return s;
  };

  // ---------- 同行分布 ----------
  C.bell = function (mean, sd, x, percentile) {
    var W = 760, H = 236, L = 40, R = 730, T = 30, B = 190, s = svg(W, H, '同行分布');
    var X = function (v) { return L + (R - L) * v / 100; };
    function pdf(v) { var z = (v - mean) / sd; return Math.exp(-0.5 * z * z); }
    var pts = [], area = [];
    for (var v = 0; v <= 100; v += 1) { var yy = B - (B - T - 10) * pdf(v); pts.push(X(v) + ',' + yy); if (v <= x) area.push(X(v) + ',' + yy); }
    [0, 25, 50, 75, 100].forEach(function (g) { s.appendChild(el('line', { x1: X(g), y1: T, x2: X(g), y2: B, stroke: P.grid })); s.appendChild(txt(X(g), B + 18, g + '%', { 'text-anchor': 'middle', 'font-size': 11, fill: P.sub })); });
    s.appendChild(el('line', { x1: L, y1: B, x2: R, y2: B, stroke: P.line }));
    if (area.length) s.appendChild(el('polygon', { points: X(0) + ',' + B + ' ' + area.join(' ') + ' ' + X(x) + ',' + B, fill: grad(s, '#DCE8FF', '#5274F0', true), opacity: .55 }));
    s.appendChild(el('polyline', { points: pts.join(' '), fill: 'none', stroke: P.orange, 'stroke-width': 2.5 }));
    s.appendChild(el('line', { x1: X(mean), y1: T + 6, x2: X(mean), y2: B, stroke: P.orange, 'stroke-dasharray': '4 3' }));
    s.appendChild(txt(X(mean) + 5, B - 8, '同行均值 ' + mean + '%', { 'font-size': 11, fill: P.sub }));
    s.appendChild(el('line', { x1: X(x), y1: T + 14, x2: X(x), y2: B, stroke: P.navy, 'stroke-width': 2.5 }));
    s.appendChild(el('circle', { cx: X(x), cy: B - (B - T - 10) * pdf(x), r: 6, fill: P.blue, stroke: '#fff', 'stroke-width': 2.5 }));
    var anchor = X(x) > 600 ? 'end' : (X(x) < 160 ? 'start' : 'middle');
    s.appendChild(txt(X(x), T + 10, '本企业 ' + x + '%' + (percentile != null ? ' · 超过 ' + percentile + '% 同行' : ''), { 'text-anchor': anchor, 'font-size': 14, 'font-weight': 800, fill: P.navy }));
    s.appendChild(txt(R, H - 6, '横轴：综合得分 · 纵轴：同行企业密度', { 'text-anchor': 'end', 'font-size': 10, fill: P.sub }));
    return s;
  };

  // ---------- 十八项排序横条 ----------
  C.rankedBars = function (items) {
    var W = 760, L = 210, rowH = 26, top = 24, H = top + items.length * rowH + 10, s = svg(W, H, '子维度排序');
    var X = function (v) { return L + (W - L - 70) * v / 100; };
    [25, 50, 75, 100].forEach(function (g) { s.appendChild(el('line', { x1: X(g), y1: top - 4, x2: X(g), y2: H - 8, stroke: P.grid })); s.appendChild(txt(X(g), top - 8, g + '%', { 'text-anchor': 'middle', 'font-size': 10, fill: P.sub })); });
    items.forEach(function (it, i) {
      var y = top + i * rowH;
      s.appendChild(el('circle', { cx: 14, cy: y + 11, r: 5, fill: STATUS[it.band] }));
      s.appendChild(txt(26, y + 15, it.dimName, { 'font-size': 11, fill: P.sub }));
      s.appendChild(txt(64, y + 15, trunc(it.name, 9), { 'font-size': 12, 'font-weight': 700 }));
      s.appendChild(el('rect', { x: L, y: y + 3, width: Math.max(4, X(it.pct) - L), height: 16, rx: 4, fill: grad(s, lighten(it.color, .3), it.color, false) }));
      s.appendChild(txt(X(it.pct) + 6, y + 15, it.score + '/' + it.max + ' · ' + it.pct + '%', { 'font-size': 11, 'font-weight': 700 }));
    });
    return s;
  };

  // ---------- 12 个月路线图 ----------
  C.timeline = function (phases, actions) {
    var W = 760, L = 30, R = 740, top = 56, rowH = 30, H = top + actions.length * rowH + 16, s = svg(W, H, '升级路线图');
    var X = function (m) { return L + (R - L) * (m - 1) / 12; };
    var tint = ['rgba(0,194,240,.08)', 'rgba(82,116,240,.08)', 'rgba(138,84,220,.08)'], head = [P.cyan, P.blue2, P.purple];
    phases.forEach(function (p, i) {
      s.appendChild(el('rect', { x: X(p.months[0]), y: 28, width: X(p.months[1] + 1) - X(p.months[0]), height: H - 36, fill: tint[i] }));
      s.appendChild(el('rect', { x: X(p.months[0]) + 2, y: 4, width: X(p.months[1] + 1) - X(p.months[0]) - 4, height: 20, rx: 10, fill: grad(s, head[i], lighten(head[i], .2), false) }));
      s.appendChild(txt((X(p.months[0]) + X(p.months[1] + 1)) / 2, 18, p.name + ' · ' + p.title, { 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 800, fill: '#fff' }));
    });
    for (var m = 1; m <= 12; m++) { s.appendChild(el('line', { x1: X(m), y1: 28, x2: X(m), y2: H - 8, stroke: P.grid })); s.appendChild(txt(X(m) + (X(2) - X(1)) / 2, 42, m + '月', { 'text-anchor': 'middle', 'font-size': 10, fill: P.sub })); }
    actions.forEach(function (a, i) {
      var ph = phases.filter(function (p) { return p.key === a.phase; })[0];
      var start = ph.months[0], dur = Math.max(0.8, Math.min(a.weeks / 4.33, ph.months[1] - ph.months[0] + 1)), y = top + i * rowH;
      var bw = Math.max(26, X(start + dur) - X(start) - 4), bx = X(start) + 2;
      s.appendChild(el('rect', { x: bx, y: y, width: bw, height: 20, rx: 6, fill: grad(s, a.color, lighten(a.color, .25), false) }));
      s.appendChild(txt(bx + bw / 2, y + 14, String(a.order), { 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 800, fill: '#fff' }));
      var label = trunc(a.title, 15) + '　' + a.dimensionName + ' · ' + a.weeks + ' 周', left = bx > 420;
      s.appendChild(txt(left ? bx - 8 : bx + bw + 8, y + 14, label, { 'text-anchor': left ? 'end' : 'start', 'font-size': 11, 'font-weight': 600, fill: P.text }));
    });
    return s;
  };

  // ---------- 价值 / 难度矩阵 ----------
  C.matrix = function (scenes) {
    var W = 560, H = 470, L = 60, R = 540, T = 36, B = 410, s = svg(W, H, '场景价值难度矩阵');
    var X = function (d) { return L + (R - L) * (d - 0.5) / 5; }, Y = function (v) { return B - (B - T) * (v - 0.5) / 5; }, mx = (L + R) / 2, my = (T + B) / 2;
    s.appendChild(el('rect', { x: L, y: T, width: mx - L, height: my - T, fill: 'rgba(14,159,110,.10)' }));
    s.appendChild(el('rect', { x: mx, y: T, width: R - mx, height: my - T, fill: 'rgba(17,87,181,.08)' }));
    s.appendChild(el('rect', { x: L, y: my, width: mx - L, height: B - my, fill: 'rgba(255,138,61,.10)' }));
    s.appendChild(el('rect', { x: mx, y: my, width: R - mx, height: B - my, fill: 'rgba(145,159,183,.10)' }));
    s.appendChild(txt(L + 8, T + 16, '优先做 · 高价值 低难度', { 'font-size': 11, 'font-weight': 800, fill: P.green }));
    s.appendChild(txt(R - 8, T + 16, '规划做 · 高价值 高难度', { 'text-anchor': 'end', 'font-size': 11, 'font-weight': 800, fill: P.blue }));
    s.appendChild(txt(L + 8, B - 8, '快赢 · 低价值 低难度', { 'font-size': 11, 'font-weight': 800, fill: P.orange }));
    s.appendChild(txt(R - 8, B - 8, '暂缓 · 低价值 高难度', { 'text-anchor': 'end', 'font-size': 11, 'font-weight': 800, fill: P.gray }));
    s.appendChild(el('line', { x1: L, y1: B, x2: R, y2: B, stroke: P.line })); s.appendChild(el('line', { x1: L, y1: T, x2: L, y2: B, stroke: P.line }));
    for (var i = 1; i <= 5; i++) { s.appendChild(txt(X(i), B + 16, String(i), { 'text-anchor': 'middle', 'font-size': 10, fill: P.sub })); s.appendChild(txt(L - 10, Y(i) + 4, String(i), { 'text-anchor': 'end', 'font-size': 10, fill: P.sub })); }
    s.appendChild(txt((L + R) / 2, B + 34, '实施难度 →', { 'text-anchor': 'middle', 'font-size': 11, fill: P.sub }));
    s.appendChild(txt(14, (T + B) / 2, '业务价值 →', { 'text-anchor': 'middle', 'font-size': 11, fill: P.sub, transform: 'rotate(-90 14 ' + (T + B) / 2 + ')' }));
    var seen = {};
    scenes.forEach(function (sc) {
      var k = sc.difficulty + '-' + sc.value; seen[k] = (seen[k] || 0) + 1;
      var off = (seen[k] - 1) * 22, x = X(sc.difficulty) + off, y = Y(sc.value) - off * 0.6, top5 = sc.rank <= 5;
      s.appendChild(el('circle', { cx: x, cy: y, r: 14, fill: top5 ? grad(s, P.blue2, P.blue, true) : '#fff', stroke: top5 ? '#fff' : P.line, 'stroke-width': 2 }));
      s.appendChild(txt(x, y + 4, String(sc.rank), { 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 800, fill: top5 ? '#fff' : P.sub }));
      var lft = x > R - 90;
      s.appendChild(txt(lft ? x - 18 : x + 18, y + 4, trunc(sc.name, 8), { 'text-anchor': lft ? 'end' : 'start', 'font-size': 11, 'font-weight': top5 ? 700 : 500, fill: top5 ? P.text : P.sub }));
    });
    return s;
  };

  // ---------- 环图 ----------
  C.donut = function (parts, centerText, centerSub) {
    var W = 220, cx = 110, cy = 110, r = 84, sw = 26, s = svg(W, W, '环图');
    var total = parts.reduce(function (t, p) { return t + p.v; }, 0) || 1, a0 = -Math.PI / 2;
    parts.forEach(function (p) {
      var a1 = a0 + 2 * Math.PI * p.v / total;
      if (p.v > 0) { var x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0), x1 = cx + r * Math.cos(a1 - 0.02), y1 = cy + r * Math.sin(a1 - 0.02), large = (a1 - a0) > Math.PI ? 1 : 0; s.appendChild(el('path', { d: 'M' + x0 + ' ' + y0 + ' A' + r + ' ' + r + ' 0 ' + large + ' 1 ' + x1 + ' ' + y1, fill: 'none', stroke: p.color, 'stroke-width': sw })); }
      a0 = a1;
    });
    s.appendChild(txt(cx, cy + 4, centerText, { 'text-anchor': 'middle', 'font-size': 26, 'font-weight': 800, fill: P.navy }));
    if (centerSub) s.appendChild(txt(cx, cy + 24, centerSub, { 'text-anchor': 'middle', 'font-size': 11, fill: P.sub }));
    return s;
  };

  // ---------- 进度环 ----------
  C.ring = function (pct, color, label) {
    var S = 120, c = 60, r = 48, sw = 12, s = svg(S, S, '得分环');
    s.appendChild(el('circle', { cx: c, cy: c, r: r, fill: 'none', stroke: '#E9EEF6', 'stroke-width': sw }));
    var len = 2 * Math.PI * r;
    s.appendChild(el('circle', { cx: c, cy: c, r: r, fill: 'none', stroke: grad(s, lighten(color, .3), color, false), 'stroke-width': sw, 'stroke-linecap': 'round', 'stroke-dasharray': (len * pct / 100) + ' ' + len, transform: 'rotate(-90 ' + c + ' ' + c + ')' }));
    s.appendChild(txt(c, c + 6, pct + '%', { 'text-anchor': 'middle', 'font-size': 20, 'font-weight': 800, fill: color }));
    if (label) s.appendChild(txt(c, c + 24, label, { 'text-anchor': 'middle', 'font-size': 10, fill: P.sub }));
    return s;
  };

  window.DGG = window.DGG || {}; window.DGG.charts = C;
})();
