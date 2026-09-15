/* 报告图表库 · 内联 SVG，无外部依赖
 * radar 六维雷达 · levelScale 等级刻度 · hbars 分组横条 · stackBar 堆叠条 · bell 同行分布
 * rankedBars 排序横条 · timeline 路线图 · matrix 价值/难度矩阵 · donut 环图 · subdimBars 子维度条 · ring 进度环
 * 规则：细线、直接标注、网格弱化、文字用文本色、每图配图例或表格
 */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var STATUS = { low: 'var(--risk)', mid: 'var(--warn)', high: 'var(--ok)' };
  function el(tag, attrs, kids) {
    var e = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    (kids || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }
  function txt(x, y, s, attrs) {
    var a = { x: x, y: y, 'font-size': 12, fill: 'var(--text)' };
    Object.keys(attrs || {}).forEach(function (k) { a[k] = attrs[k]; });
    var t = el('text', a); t.textContent = s; return t;
  }
  function svg(w, h, label) { return el('svg', { viewBox: '0 0 ' + w + ' ' + h, width: '100%', role: 'img', 'aria-label': label || '', style: 'font-family:inherit;display:block' }); }
  function trunc(s, n) { s = String(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
  var C = {};

  // ---------- 六维雷达 + 同行参考带 ----------
  C.radar = function (dims, opts) {
    opts = opts || {};
    var W = 440, cx = 220, cy = 218, R = 140, N = dims.length, MAX = 100;
    var s = svg(W, 430, '六维成熟度雷达图');
    function pt(i, v) { var a = -Math.PI / 2 + i * 2 * Math.PI / N, r = R * v / MAX; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
    function poly(v) { return v.map(function (x, i) { return pt(i, x).join(','); }).join(' '); }
    [25, 50, 75, 100].forEach(function (g) { s.appendChild(el('polygon', { points: poly(dims.map(function () { return g; })), fill: 'none', stroke: 'var(--chart-grid)', 'stroke-width': g === 100 ? 1.5 : 1 })); });
    dims.forEach(function (_, i) { var p = pt(i, MAX); s.appendChild(el('line', { x1: cx, y1: cy, x2: p[0], y2: p[1], stroke: 'var(--chart-grid)' })); });
    if (dims.every(function (d) { return d.band; })) {
      var o = poly(dims.map(function (d) { return d.band[1]; })), inn = poly(dims.map(function (d) { return d.band[0]; }));
      s.appendChild(el('path', { d: 'M' + o.replace(/ /g, ' L') + ' Z M' + inn.replace(/ /g, ' L') + ' Z', fill: 'var(--chart-band-fill)', 'fill-rule': 'evenodd', stroke: 'var(--chart-band-stroke)', 'stroke-width': 1.5, 'stroke-dasharray': '4 3' }));
    }
    s.appendChild(el('polygon', { points: poly(dims.map(function (d) { return d.pct; })), fill: 'rgba(73,116,246,.22)', stroke: 'var(--chart-primary)', 'stroke-width': 2, 'stroke-linejoin': 'round' }));
    dims.forEach(function (d, i) {
      var p = pt(i, d.pct);
      s.appendChild(el('circle', { cx: p[0], cy: p[1], r: 6, fill: '#fff' }));
      s.appendChild(el('circle', { cx: p[0], cy: p[1], r: 4, fill: d.color || 'var(--chart-primary)' }));
      var lp = pt(i, MAX + 17), anchor = Math.abs(lp[0] - cx) < 8 ? 'middle' : (lp[0] < cx ? 'end' : 'start');
      s.appendChild(txt(lp[0], lp[1] - 4, d.name, { 'text-anchor': anchor, 'font-size': 14, 'font-weight': 700 }));
      s.appendChild(txt(lp[0], lp[1] + 13, d.pct + '%', { 'text-anchor': anchor, 'font-size': 12, 'font-weight': 700, fill: d.color || 'var(--brand)' }));
    });
    return s;
  };

  // ---------- 等级刻度 ----------
  C.levelScale = function (levels, pct, currentCode) {
    var W = 760, H = 104, x0 = 20, x1 = 740, y = 44, hgt = 20;
    var s = svg(W, H, '成熟度等级刻度');
    var shades = ['#DCE4F5', '#B9C7F5', '#8FA8F0', '#4974F6', '#1E3FA8'];
    var X = function (p) { return x0 + (x1 - x0) * p / 100; };
    levels.forEach(function (l, i) {
      var a = l.minPct, b = i < levels.length - 1 ? levels[i + 1].minPct : 100;
      var cur = l.code === currentCode;
      s.appendChild(el('rect', { x: X(a) + 1, y: y, width: Math.max(0, X(b) - X(a) - 2), height: hgt, rx: 4, fill: shades[i], stroke: cur ? 'var(--brand-navy)' : 'none', 'stroke-width': 2 }));
      s.appendChild(txt((X(a) + X(b)) / 2, y + hgt + 18, l.code + ' ' + l.name, { 'text-anchor': 'middle', 'font-weight': cur ? 800 : 600, fill: cur ? 'var(--brand-navy)' : 'var(--text-sub)' }));
      if (i > 0) s.appendChild(txt(X(a), y + hgt + 34, a + '%', { 'text-anchor': 'middle', 'font-size': 10, fill: 'var(--text-sub)' }));
    });
    var mx = X(pct);
    s.appendChild(el('path', { d: 'M' + mx + ' ' + (y - 4) + ' l-7 -12 h14 z', fill: 'var(--brand-navy)' }));
    s.appendChild(el('line', { x1: mx, y1: y - 4, x2: mx, y2: y + hgt + 2, stroke: 'var(--brand-navy)', 'stroke-width': 2 }));
    s.appendChild(txt(mx, y - 20, '本企业 ' + pct + '%', { 'text-anchor': mx > 660 ? 'end' : (mx < 100 ? 'start' : 'middle'), 'font-weight': 800, 'font-size': 13, fill: 'var(--brand-navy)' }));
    return s;
  };

  // ---------- 分组横条（本企业 vs 参考带中值） ----------
  C.hbars = function (rows, opts) {
    opts = opts || {};
    var W = 760, L = 96, rowH = 40, top = 30, barH = 12, max = opts.max || 100;
    var H = top + rows.length * rowH + 8;
    var s = svg(W, H, opts.label || '分组条形图');
    var X = function (v) { return L + (W - L - 60) * v / max; };
    var series = rows[0].values.map(function (v) { return v.label; });
    series.forEach(function (name, i) {
      var x = L + i * 150;
      s.appendChild(el('rect', { x: x, y: 8, width: 12, height: 12, rx: 3, fill: i === 0 ? 'var(--chart-primary)' : 'var(--chart-band-stroke)' }));
      s.appendChild(txt(x + 18, 18, name, { 'font-size': 12, fill: 'var(--text-sub)' }));
    });
    [0, 25, 50, 75, 100].forEach(function (g) { s.appendChild(el('line', { x1: X(g), y1: top, x2: X(g), y2: H - 8, stroke: 'var(--chart-grid)' })); });
    rows.forEach(function (r, i) {
      var y = top + i * rowH + 6;
      s.appendChild(txt(L - 10, y + 18, r.name, { 'text-anchor': 'end', 'font-weight': 700, 'font-size': 13 }));
      r.values.forEach(function (v, k) {
        var yy = y + k * (barH + 4), w = Math.max(2, X(v.v) - L);
        s.appendChild(el('rect', { x: L, y: yy, width: w, height: barH, rx: 3, fill: k === 0 ? (r.color || 'var(--chart-primary)') : 'var(--chart-band-stroke)', opacity: k === 0 ? 1 : .75 }));
        s.appendChild(txt(L + w + 6, yy + barH - 2, v.v + '%', { 'font-size': 11, 'font-weight': 700, fill: 'var(--text)', style: 'font-variant-numeric:tabular-nums' }));
      });
    });
    return s;
  };

  // ---------- 堆叠条（总分分解） ----------
  C.stackBar = function (segs, opts) {
    opts = opts || {};
    var W = 760, H = 78, x0 = 20, x1 = 740, y = 22, hgt = 30;
    var total = segs.reduce(function (t, x) { return t + x.max; }, 0);
    var s = svg(W, H, '总分分解');
    var x = x0;
    segs.forEach(function (g) {
      var wMax = (x1 - x0) * g.max / total, w = (x1 - x0) * g.v / total;
      s.appendChild(el('rect', { x: x, y: y, width: wMax - 2, height: hgt, rx: 4, fill: g.color, opacity: .18 }));
      s.appendChild(el('rect', { x: x, y: y, width: Math.max(0, w - 2), height: hgt, rx: 4, fill: g.color }));
      s.appendChild(txt(x + wMax / 2, y + hgt + 18, g.name + ' ' + g.v + '/' + g.max, { 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, fill: 'var(--text-sub)' }));
      if (w > 34) s.appendChild(txt(x + 8, y + 20, String(g.v), { 'font-size': 13, 'font-weight': 800, fill: '#fff', style: 'font-variant-numeric:tabular-nums' }));
      x += wMax;
    });
    s.appendChild(txt(x1, y - 6, '合计 ' + segs.reduce(function (t, g) { return t + g.v; }, 0) + ' / ' + total, { 'text-anchor': 'end', 'font-size': 12, 'font-weight': 700, fill: 'var(--brand-deep)' }));
    return s;
  };

  // ---------- 同行分布（正态曲线 + 本企业位置） ----------
  C.bell = function (mean, sd, x, percentile) {
    var W = 760, H = 236, L = 40, R = 730, T = 30, B = 190;
    var s = svg(W, H, '同行分布');
    var X = function (v) { return L + (R - L) * v / 100; };
    function pdf(v) { var z = (v - mean) / sd; return Math.exp(-0.5 * z * z); }
    var pts = [], area = [];
    for (var v = 0; v <= 100; v += 1) { var yy = B - (B - T - 10) * pdf(v); pts.push(X(v) + ',' + yy); if (v <= x) area.push(X(v) + ',' + yy); }
    [0, 25, 50, 75, 100].forEach(function (g) { s.appendChild(el('line', { x1: X(g), y1: T, x2: X(g), y2: B, stroke: 'var(--chart-grid)' })); s.appendChild(txt(X(g), B + 18, g + '%', { 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--text-sub)' })); });
    s.appendChild(el('line', { x1: L, y1: B, x2: R, y2: B, stroke: 'var(--line)' }));
    if (area.length) s.appendChild(el('polygon', { points: X(0) + ',' + B + ' ' + area.join(' ') + ' ' + X(x) + ',' + B, fill: 'rgba(73,116,246,.16)' }));
    s.appendChild(el('polyline', { points: pts.join(' '), fill: 'none', stroke: 'var(--chart-band-stroke)', 'stroke-width': 2 }));
    s.appendChild(el('line', { x1: X(mean), y1: T + 6, x2: X(mean), y2: B, stroke: 'var(--chart-band-stroke)', 'stroke-dasharray': '4 3' }));
    s.appendChild(txt(X(mean) + 5, B - 8, '同行均值 ' + mean + '%', { 'text-anchor': 'start', 'font-size': 11, fill: 'var(--text-sub)' }));
    s.appendChild(el('line', { x1: X(x), y1: T + 14, x2: X(x), y2: B, stroke: 'var(--brand-navy)', 'stroke-width': 2 }));
    s.appendChild(el('circle', { cx: X(x), cy: B - (B - T - 10) * pdf(x), r: 5, fill: 'var(--brand)', stroke: '#fff', 'stroke-width': 2 }));
    var anchor = X(x) > 600 ? 'end' : (X(x) < 160 ? 'start' : 'middle');
    s.appendChild(txt(X(x), T + 10, '本企业 ' + x + '%' + (percentile != null ? ' · 超过 ' + percentile + '% 同行' : ''), { 'text-anchor': anchor, 'font-size': 13, 'font-weight': 800, fill: 'var(--brand-navy)' }));
    s.appendChild(txt(R, H - 6, '横轴：综合得分 · 纵轴：同行企业密度', { 'text-anchor': 'end', 'font-size': 10, fill: 'var(--text-sub)' }));
    return s;
  };

  // ---------- 十八项排序横条 ----------
  C.rankedBars = function (items) {
    var W = 760, L = 210, rowH = 26, top = 24, H = top + items.length * rowH + 10;
    var s = svg(W, H, '子维度排序');
    var X = function (v) { return L + (W - L - 70) * v / 100; };
    [25, 50, 75, 100].forEach(function (g) { s.appendChild(el('line', { x1: X(g), y1: top - 4, x2: X(g), y2: H - 8, stroke: 'var(--chart-grid)' })); s.appendChild(txt(X(g), top - 8, g + '%', { 'text-anchor': 'middle', 'font-size': 10, fill: 'var(--text-sub)' })); });
    items.forEach(function (it, i) {
      var y = top + i * rowH;
      s.appendChild(el('circle', { cx: 14, cy: y + 11, r: 5, fill: STATUS[it.band] }));
      s.appendChild(txt(26, y + 15, it.dimName, { 'font-size': 11, fill: 'var(--text-sub)' }));
      s.appendChild(txt(64, y + 15, trunc(it.name, 9), { 'font-size': 12, 'font-weight': 700 }));
      s.appendChild(el('rect', { x: L, y: y + 3, width: Math.max(2, X(it.pct) - L), height: 16, rx: 3, fill: it.color }));
      s.appendChild(txt(X(it.pct) + 6, y + 15, it.score + '/' + it.max + ' · ' + it.pct + '%', { 'font-size': 11, 'font-weight': 700, style: 'font-variant-numeric:tabular-nums' }));
    });
    return s;
  };

  // ---------- 12 个月路线图 ----------
  C.timeline = function (phases, actions) {
    var W = 760, L = 30, R = 740, top = 54, rowH = 30, H = top + actions.length * rowH + 16;
    var s = svg(W, H, '升级路线图');
    var X = function (m) { return L + (R - L) * (m - 1) / 12; };
    var tint = ['rgba(73,116,246,.07)', 'rgba(27,165,184,.07)', 'rgba(124,92,214,.07)'];
    phases.forEach(function (p, i) {
      s.appendChild(el('rect', { x: X(p.months[0]), y: 26, width: X(p.months[1] + 1) - X(p.months[0]), height: H - 34, fill: tint[i] }));
      s.appendChild(txt((X(p.months[0]) + X(p.months[1] + 1)) / 2, 18, p.name + ' · ' + p.title, { 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 800, fill: 'var(--brand-deep)' }));
    });
    for (var m = 1; m <= 12; m++) { s.appendChild(el('line', { x1: X(m), y1: 26, x2: X(m), y2: H - 8, stroke: 'var(--chart-grid)' })); s.appendChild(txt(X(m) + (X(2) - X(1)) / 2, 40, m + '月', { 'text-anchor': 'middle', 'font-size': 10, fill: 'var(--text-sub)' })); }
    actions.forEach(function (a, i) {
      var ph = phases.filter(function (p) { return p.key === a.phase; })[0];
      var start = ph.months[0], dur = Math.max(0.8, Math.min(a.weeks / 4.33, ph.months[1] - ph.months[0] + 1));
      var y = top + i * rowH;
      var bw = Math.max(26, X(start + dur) - X(start) - 4), bx = X(start) + 2;
      s.appendChild(el('rect', { x: bx, y: y, width: bw, height: 20, rx: 5, fill: a.color }));
      s.appendChild(txt(bx + bw / 2, y + 14, String(a.order), { 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 800, fill: '#fff' }));
      var label = trunc(a.title, 15) + '　' + a.dimensionName + ' · ' + a.weeks + ' 周', left = bx > 420;
      s.appendChild(txt(left ? bx - 8 : bx + bw + 8, y + 14, label, { 'text-anchor': left ? 'end' : 'start', 'font-size': 11, 'font-weight': 600, fill: 'var(--text)' }));
    });
    return s;
  };

  // ---------- 价值 / 难度矩阵 ----------
  C.matrix = function (scenes) {
    var W = 560, H = 470, L = 60, R = 540, T = 36, B = 410;
    var s = svg(W, H, '场景价值难度矩阵');
    var X = function (d) { return L + (R - L) * (d - 0.5) / 5; }, Y = function (v) { return B - (B - T) * (v - 0.5) / 5; };
    var mx = (L + R) / 2, my = (T + B) / 2;
    s.appendChild(el('rect', { x: L, y: T, width: mx - L, height: my - T, fill: 'rgba(34,160,107,.08)' }));
    s.appendChild(el('rect', { x: mx, y: T, width: R - mx, height: my - T, fill: 'rgba(73,116,246,.07)' }));
    s.appendChild(el('rect', { x: L, y: my, width: mx - L, height: B - my, fill: 'rgba(232,163,61,.08)' }));
    s.appendChild(el('rect', { x: mx, y: my, width: R - mx, height: B - my, fill: 'rgba(90,100,120,.06)' }));
    s.appendChild(txt(L + 8, T + 16, '优先做 · 高价值 低难度', { 'font-size': 11, 'font-weight': 700, fill: 'var(--ok)' }));
    s.appendChild(txt(R - 8, T + 16, '规划做 · 高价值 高难度', { 'text-anchor': 'end', 'font-size': 11, 'font-weight': 700, fill: 'var(--brand)' }));
    s.appendChild(txt(L + 8, B - 8, '快赢 · 低价值 低难度', { 'font-size': 11, 'font-weight': 700, fill: 'var(--warn)' }));
    s.appendChild(txt(R - 8, B - 8, '暂缓 · 低价值 高难度', { 'text-anchor': 'end', 'font-size': 11, 'font-weight': 700, fill: 'var(--text-sub)' }));
    s.appendChild(el('line', { x1: L, y1: B, x2: R, y2: B, stroke: 'var(--line)' })); s.appendChild(el('line', { x1: L, y1: T, x2: L, y2: B, stroke: 'var(--line)' }));
    for (var i = 1; i <= 5; i++) { s.appendChild(txt(X(i), B + 16, String(i), { 'text-anchor': 'middle', 'font-size': 10, fill: 'var(--text-sub)' })); s.appendChild(txt(L - 10, Y(i) + 4, String(i), { 'text-anchor': 'end', 'font-size': 10, fill: 'var(--text-sub)' })); }
    s.appendChild(txt((L + R) / 2, B + 34, '实施难度 →', { 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--text-sub)' }));
    s.appendChild(txt(14, (T + B) / 2, '业务价值 →', { 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--text-sub)', transform: 'rotate(-90 14 ' + (T + B) / 2 + ')' }));
    // 同位置散开
    var seen = {};
    scenes.forEach(function (sc) {
      var k = sc.difficulty + '-' + sc.value; seen[k] = (seen[k] || 0) + 1;
      var off = (seen[k] - 1) * 22;
      var x = X(sc.difficulty) + off, y = Y(sc.value) - off * 0.6, top5 = sc.rank <= 5;
      s.appendChild(el('circle', { cx: x, cy: y, r: 13, fill: top5 ? 'var(--brand)' : '#fff', stroke: top5 ? '#fff' : 'var(--line)', 'stroke-width': 2 }));
      s.appendChild(txt(x, y + 4, String(sc.rank), { 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 800, fill: top5 ? '#fff' : 'var(--text-sub)' }));
      var lft = x > R - 90;
      s.appendChild(txt(lft ? x - 17 : x + 17, y + 4, trunc(sc.name, 8), { 'text-anchor': lft ? 'end' : 'start', 'font-size': 11, 'font-weight': top5 ? 700 : 500, fill: top5 ? 'var(--text)' : 'var(--text-sub)' }));
    });
    return s;
  };

  // ---------- 环图 ----------
  C.donut = function (parts, centerText, centerSub) {
    var W = 220, cx = 110, cy = 110, r = 84, sw = 26;
    var s = svg(W, W, '环图');
    var total = parts.reduce(function (t, p) { return t + p.v; }, 0) || 1;
    var a0 = -Math.PI / 2;
    parts.forEach(function (p) {
      var a1 = a0 + 2 * Math.PI * p.v / total;
      if (p.v > 0) {
        var x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0), x1 = cx + r * Math.cos(a1 - 0.02), y1 = cy + r * Math.sin(a1 - 0.02);
        var large = (a1 - a0) > Math.PI ? 1 : 0;
        s.appendChild(el('path', { d: 'M' + x0 + ' ' + y0 + ' A' + r + ' ' + r + ' 0 ' + large + ' 1 ' + x1 + ' ' + y1, fill: 'none', stroke: p.color, 'stroke-width': sw }));
      }
      a0 = a1;
    });
    s.appendChild(txt(cx, cy + 4, centerText, { 'text-anchor': 'middle', 'font-size': 26, 'font-weight': 800, fill: 'var(--brand-deep)' }));
    if (centerSub) s.appendChild(txt(cx, cy + 24, centerSub, { 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--text-sub)' }));
    return s;
  };

  // ---------- 子维度条（0–6） ----------
  C.subdimBars = function (subs, color) {
    var W = 720, L = 130, rowH = 40, H = subs.length * rowH + 8;
    var s = svg(W, H, '子维度得分');
    var X = function (v, m) { return L + (W - L - 120) * v / m; };
    subs.forEach(function (sd, i) {
      var y = i * rowH + 6;
      s.appendChild(txt(L - 10, y + 18, sd.name, { 'text-anchor': 'end', 'font-size': 13, 'font-weight': 700 }));
      s.appendChild(el('rect', { x: L, y: y + 6, width: W - L - 120, height: 14, rx: 4, fill: 'var(--surface-alt)' }));
      s.appendChild(el('rect', { x: L, y: y + 6, width: Math.max(2, X(sd.score, sd.max) - L), height: 14, rx: 4, fill: color }));
      s.appendChild(el('circle', { cx: W - 104, cy: y + 13, r: 5, fill: STATUS[sd.band] }));
      s.appendChild(txt(W - 94, y + 17, sd.score + ' / ' + sd.max + ' · ' + sd.bandName, { 'font-size': 12, 'font-weight': 700, style: 'font-variant-numeric:tabular-nums' }));
    });
    return s;
  };

  // ---------- 进度环 ----------
  C.ring = function (pct, color, label) {
    var S = 120, c = 60, r = 48, sw = 11;
    var s = svg(S, S, '得分环');
    s.appendChild(el('circle', { cx: c, cy: c, r: r, fill: 'none', stroke: 'var(--surface-alt)', 'stroke-width': sw }));
    var len = 2 * Math.PI * r;
    s.appendChild(el('circle', { cx: c, cy: c, r: r, fill: 'none', stroke: color, 'stroke-width': sw, 'stroke-linecap': 'round', 'stroke-dasharray': (len * pct / 100) + ' ' + len, transform: 'rotate(-90 ' + c + ' ' + c + ')' }));
    s.appendChild(txt(c, c + 6, pct + '%', { 'text-anchor': 'middle', 'font-size': 20, 'font-weight': 800, fill: color }));
    if (label) s.appendChild(txt(c, c + 24, label, { 'text-anchor': 'middle', 'font-size': 10, fill: 'var(--text-sub)' }));
    return s;
  };

  window.DGG = window.DGG || {}; window.DGG.charts = C;
})();
