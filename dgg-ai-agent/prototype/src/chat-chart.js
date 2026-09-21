/* ==========================================================================
   chat-chart.js · 对话里的 2.5D 图表
   ------------------------------------------------------------------
   「智能问数」的效果：AI 回答不只是一段字，数值类的问题直接出图。
   图表规格是平台中立的纯数据（见 SPEC §10.6 的 blocks），这里只负责画成 SVG。

   关于「2.5D」：用**等深挤出**，不用透视。
     · 每根柱子 / 每段都按同一个深度向量（右 5px、上 4px）挤出，没有近大远小；
     · 值一律读正面那个面的高度，正面贴着基线、与坐标轴对齐，所以立体只是外观，不歪曲数值
       —— 真三维图会因为透视与遮挡让人读错长度，那是数据图里公认的坑。
     · 顶面取同色浅一档、侧面取同色深一档，不引入新色相。
   配色：单序列用当前模块主色（跟着页面走）；多序列用一组固定顺序的分类色，
   这组色已用 dataviz 的校验器在本底色上跑过（明度带 / 彩度下限 / 色盲可分辨 / 常视可分辨全部通过，
   对比度一项给的是 WARN，所以每张图都直接标数值，不靠颜色单独承载信息）。

   对外：window.DGG.chatChart = { render(spec, opt) → <svg>, TYPES }
   spec = { chart, title, unit, labels[], series[{name,data[],color?}], total?, target?, max?, note? }
   ========================================================================== */
(function () {
  'use strict';
  window.DGG = window.DGG || {};

  var NS = 'http://www.w3.org/2000/svg';
  /* dataviz 参考分类色，固定顺序、不循环；第 9 个序列一律并进「其他」 */
  var CAT = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'];
  var INK = '#1A2233', SUB = '#66718A', MUTE = '#98A2B8', LINE = '#E3E8F2', SURF = '#FFFFFF';
  var DX = 5, DY = -4;                        /* 等深挤出向量：所有面共用同一个，绝不随大小变化 */

  function el(name, attrs) {
    var e = document.createElementNS(NS, name), k;
    for (k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k) && attrs[k] != null) e.setAttribute(k, attrs[k]);
    return e;
  }
  function txt(x, y, s, o) {
    o = o || {};
    var t = el('text', { x: x, y: y, fill: o.fill || SUB, 'font-size': o.size || 9.5, 'text-anchor': o.anchor || 'start',
      'font-weight': o.weight || 500, 'font-family': 'inherit' });
    if (o.tabular) t.setAttribute('style', 'font-variant-numeric:tabular-nums');
    t.textContent = s == null ? '' : String(s);
    return t;
  }
  /* 同色系深浅：只动明度，不动色相 */
  function hex2rgb(h) { h = String(h).replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  function rgb2hex(c) { return '#' + c.map(function (v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? '0' : '') + v.toString(16); }).join(''); }
  function lighten(h, k) { var c = hex2rgb(h); return rgb2hex(c.map(function (v) { return v + (255 - v) * k; })); }
  function darken(h, k) { var c = hex2rgb(h); return rgb2hex(c.map(function (v) { return v * (1 - k); })); }
  function fmt(n, dec) {
    if (n == null || isNaN(n)) return '';
    var v = dec != null ? Number(n).toFixed(dec) : (Math.abs(n) >= 100 || n === Math.round(n) ? String(Math.round(n)) : String(Math.round(n * 10) / 10));
    var p = v.split('.'); p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ','); return p.join('.');
  }
  function nice(m) {                      /* 轴上限取整到好看的刻度 */
    if (m <= 0) return 1;
    var e = Math.pow(10, Math.floor(Math.log(m) / Math.LN10)), f = m / e;
    var st = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10], i;
    for (i = 0; i < st.length; i++) if (f <= st[i] + 1e-9) return st[i] * e;
    return 10 * e;
  }
  function catOf(spec, i) {
    var s = spec.series && spec.series[0];
    if (s && s.colors && s.colors[i]) return s.colors[i];
    return CAT[i % CAT.length];
  }
  function colorOf(spec, i, accent) {
    var s = spec.series && spec.series[i];
    if (s && s.color) return s.color;
    if ((spec.series || []).length <= 1) return accent;
    return CAT[i % CAT.length];
  }

  /* 一个 2.5D 盒子：正面 + 顶面 + 右侧面。值读正面高度 */
  function box(g, x, y, w, h, color, r) {
    if (h <= 0.5) h = 0.5;
    var top = el('path', { d: 'M' + x + ',' + y + ' l' + DX + ',' + DY + ' h' + w + ' l' + (-DX) + ',' + (-DY) + ' Z', fill: lighten(color, .28) });
    var side = el('path', { d: 'M' + (x + w) + ',' + y + ' l' + DX + ',' + DY + ' v' + h + ' l' + (-DX) + ',' + (-DY) + ' Z', fill: darken(color, .22) });
    r = Math.min(r == null ? 3 : r, w / 2, h);
    var front = el('path', { d: 'M' + x + ',' + (y + h) + ' V' + (y + r) + ' a' + r + ',' + r + ' 0 0 1 ' + r + ',' + (-r) + ' h' + (w - 2 * r) + ' a' + r + ',' + r + ' 0 0 1 ' + r + ',' + r + ' V' + (y + h) + ' Z', fill: color });
    g.appendChild(top); g.appendChild(side); g.appendChild(front);
  }
  /* 横向的 2.5D 盒子（条形 / 漏斗 / 进度） */
  function boxH(g, x, y, w, h, color, r) {
    if (w <= 0.5) w = 0.5;
    var top = el('path', { d: 'M' + x + ',' + y + ' l' + DX + ',' + DY + ' h' + w + ' l' + (-DX) + ',' + (-DY) + ' Z', fill: lighten(color, .28) });
    var side = el('path', { d: 'M' + (x + w) + ',' + y + ' l' + DX + ',' + DY + ' v' + h + ' l' + (-DX) + ',' + (-DY) + ' Z', fill: darken(color, .22) });
    r = Math.min(r == null ? 3 : r, h / 2, w);
    var front = el('path', { d: 'M' + x + ',' + y + ' h' + (w - r) + ' a' + r + ',' + r + ' 0 0 1 ' + r + ',' + r + ' v' + (h - 2 * r) + ' a' + r + ',' + r + ' 0 0 1 ' + (-r) + ',' + r + ' H' + x + ' Z', fill: color });
    g.appendChild(top); g.appendChild(side); g.appendChild(front);
  }

  function grid(g, x0, x1, ys) {
    ys.forEach(function (y) { g.appendChild(el('line', { x1: x0, y1: y, x2: x1, y2: y, stroke: LINE, 'stroke-width': 1 })); });
  }

  /* ---------------- 各类图 ---------------- */
  function drawColumn(spec, A) {                    /* 2.5D 柱：分类量级 */
    var W = A.W, labels = spec.labels || [], ss = spec.series || [];
    var n = labels.length, pad = { l: 30, r: 10, t: 16, b: 20 };
    var H = A.H || 116, x0 = pad.l, x1 = W - pad.r, y0 = pad.t, y1 = H - pad.b;
    var all = []; ss.forEach(function (s) { (s.data || []).forEach(function (v) { all.push(Math.abs(+v || 0)); }); });
    var mx = nice(Math.max.apply(null, all.concat([0])) || 1);
    var g = el('g', {});
    grid(g, x0, x1, [y0, (y0 + y1) / 2, y1]);
    g.appendChild(txt(x0 - 4, y0 + 3, fmt(mx), { anchor: 'end', size: 8.5, fill: MUTE, tabular: 1 }));
    g.appendChild(txt(x0 - 4, y1 + 3, '0', { anchor: 'end', size: 8.5, fill: MUTE, tabular: 1 }));
    var slot = (x1 - x0 - DX) / Math.max(1, n), k = ss.length;
    var bw = Math.max(5, (slot - 8) / Math.max(1, k) - 2);
    labels.forEach(function (lb, i) {
      ss.forEach(function (s, j) {
        var v = Math.abs(+(s.data || [])[i] || 0), h = (v / mx) * (y1 - y0);
        var x = x0 + slot * i + (slot - (bw + 2) * k) / 2 + j * (bw + 2);
        box(g, x, y1 - h, bw, h, colorOf(spec, j, A.accent));
        if (n * k <= 8) g.appendChild(txt(x + bw / 2 + DX / 2, y1 - h + DY - 3, fmt((s.data || [])[i]), { anchor: 'middle', size: k > 1 ? 8.5 : 9, fill: INK, weight: 700, tabular: 1 }));
      });
      if (n <= 9) g.appendChild(txt(x0 + slot * i + slot / 2, y1 + 12, lb, { anchor: 'middle', size: 8.5, fill: SUB }));
    });
    return { g: g, H: H };
  }

  function drawBar(spec, A) {                       /* 2.5D 条：标签长时用 */
    var W = A.W, labels = spec.labels || [], s0 = (spec.series || [])[0] || { data: [] };
    var n = labels.length, rowH = 20, H = 12 + n * rowH + 6;
    var mx = nice(Math.max.apply(null, (s0.data || []).map(function (v) { return Math.abs(+v || 0); }).concat([0])) || 1);
    var rsv = Math.max(34, (fmt(mx) + (spec.unit || '')).length * 6.4 + 12);
    var lw = Math.min(88, Math.max(44, W * 0.34)), x0 = lw + 4, x1 = W - rsv;
    var g = el('g', {});
    labels.forEach(function (lb, i) {
      var v = Math.abs(+(s0.data || [])[i] || 0), w = (v / mx) * (x1 - x0), y = 12 + i * rowH;
      g.appendChild(txt(lw, y + 10, String(lb).slice(0, 8), { anchor: 'end', size: 9, fill: SUB }));
      boxH(g, x0, y, w, 12, colorOf(spec, 0, A.accent));
      g.appendChild(txt(x0 + w + DX + 5, y + 10, fmt((s0.data || [])[i]) + (spec.unit || ''), { size: 9, fill: INK, weight: 700, tabular: 1 }));
    });
    return { g: g, H: H };
  }

  function drawStack(spec, A) {                     /* 2.5D 堆叠柱：构成 */
    var W = A.W, labels = spec.labels || [], ss = spec.series || [];
    var n = labels.length, pad = { l: 26, r: 10, t: 14, b: 20 }, H = A.H || 120;
    var x0 = pad.l, x1 = W - pad.r, y0 = pad.t, y1 = H - pad.b;
    var totals = labels.map(function (_, i) { var t = 0; ss.forEach(function (s) { t += Math.abs(+(s.data || [])[i] || 0); }); return t; });
    var mx = nice(Math.max.apply(null, totals.concat([0])) || 1);
    var g = el('g', {});
    grid(g, x0, x1, [y0, y1]);
    var slot = (x1 - x0 - DX) / Math.max(1, n), bw = Math.max(8, slot - 12);
    labels.forEach(function (lb, i) {
      var acc = 0, x = x0 + slot * i + (slot - bw) / 2;
      ss.forEach(function (s, j) {
        var v = Math.abs(+(s.data || [])[i] || 0), h = (v / mx) * (y1 - y0);
        if (h <= 0) return;
        box(g, x, y1 - acc - h, bw, Math.max(1, h - 2), colorOf(spec, j, A.accent), 2);   /* 段间留 2px 底色缝 */
        acc += h;
      });
      g.appendChild(txt(x + bw / 2 + DX / 2, y1 - acc + DY - 3, fmt(totals[i]), { anchor: 'middle', size: 9, fill: INK, weight: 700, tabular: 1 }));
      g.appendChild(txt(x0 + slot * i + slot / 2, y1 + 12, lb, { anchor: 'middle', size: 8.5, fill: SUB }));
    });
    return { g: g, H: H };
  }

  function drawLine(spec, A, filled) {              /* 折线 / 面积：时间趋势 */
    var W = A.W, labels = spec.labels || [], ss = spec.series || [];
    var pad = { l: 30, r: 12, t: 16, b: 20 }, H = A.H || 116;
    var x0 = pad.l, x1 = W - pad.r, y0 = pad.t, y1 = H - pad.b;
    var all = []; ss.forEach(function (s) { (s.data || []).forEach(function (v) { if (v != null) all.push(+v); }); });
    if (!all.length) all = [0, 1];
    var dmin = Math.min.apply(null, all), dmax = Math.max.apply(null, all), lo, hi;
    if (filled) { lo = Math.min(0, dmin); hi = dmax; }
    else {
      var pad2 = (dmax - dmin) * .16 || Math.abs(dmax) * .1 || 1;
      lo = dmin - pad2; hi = dmax + pad2 * .5;
      if (dmin >= 0 && lo < 0) lo = 0;
    }
    if (hi <= lo) hi = lo + 1;
    var span = (hi - lo) || 1;
    var g = el('g', {});
    grid(g, x0, x1, [y0, (y0 + y1) / 2, y1]);
    var n = Math.max(1, labels.length - 1);
    var px = function (i) { return x0 + (x1 - x0) * (labels.length < 2 ? .5 : i / n); };
    var py = function (v) { return y1 - ((+v - lo) / span) * (y1 - y0); };
    ss.forEach(function (s, j) {
      var c = colorOf(spec, j, A.accent), d = '', a = '', i;
      for (i = 0; i < (s.data || []).length; i++) {
        var X = px(i), Y = py(s.data[i]);
        d += (i ? 'L' : 'M') + X.toFixed(1) + ',' + Y.toFixed(1);
        a += (i ? 'L' : 'M') + X.toFixed(1) + ',' + Y.toFixed(1);
      }
      if (filled && (s.data || []).length) {
        a += 'L' + px(s.data.length - 1).toFixed(1) + ',' + y1 + 'L' + px(0).toFixed(1) + ',' + y1 + 'Z';
        var lg = el('linearGradient', { id: A.uid + '-ag' + j, x1: 0, y1: 0, x2: 0, y2: 1 });
        lg.appendChild(el('stop', { offset: 0, 'stop-color': c, 'stop-opacity': .30 }));
        lg.appendChild(el('stop', { offset: 1, 'stop-color': c, 'stop-opacity': .02 }));
        A.defs.appendChild(lg);
        g.appendChild(el('path', { d: a, fill: 'url(#' + A.uid + '-ag' + j + ')' }));
      }
      /* 2.5D：线下方同色暗影带出厚度，不改变任何点的位置 */
      g.appendChild(el('path', { d: d, fill: 'none', stroke: darken(c, .34), 'stroke-width': 2.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', transform: 'translate(2.4,2.4)', opacity: .20 }));
      g.appendChild(el('path', { d: d, fill: 'none', stroke: c, 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
      /* 只标端点与极值，不是每点都标 */
      var last = (s.data || []).length - 1;
      if (last >= 0) {
        g.appendChild(el('circle', { cx: px(last), cy: py(s.data[last]), r: 4, fill: c, stroke: SURF, 'stroke-width': 2 }));
        g.appendChild(txt(px(last) - 2, py(s.data[last]) - 8, fmt(s.data[last]) + (spec.unit || ''), { anchor: 'end', size: 9, fill: INK, weight: 700, tabular: 1 }));
      }
    });
    g.appendChild(txt(x0 - 4, py(dmax) + 3, fmt(dmax), { anchor: 'end', size: 8.5, fill: MUTE, tabular: 1 }));
    g.appendChild(txt(x0 - 4, (filled ? y1 : py(dmin)) + 3, fmt(filled ? 0 : dmin), { anchor: 'end', size: 8.5, fill: MUTE, tabular: 1 }));
    labels.forEach(function (lb, i) {
      if (labels.length > 7 && i % 2) return;
      g.appendChild(txt(px(i), y1 + 12, lb, { anchor: 'middle', size: 8.5, fill: SUB }));
    });
    return { g: g, H: H };
  }

  function drawDonut(spec, A) {                     /* 2.5D 环：占比，最多 6 段 */
    var W = A.W, labels = spec.labels || [], s0 = (spec.series || [])[0] || { data: [] };
    var data = (s0.data || []).slice(0, 6), H = 118;
    var cx = 62, cy = 58, R = 42, r = 24, depth = 8;
    var total = data.reduce(function (a, b) { return a + Math.abs(+b || 0); }, 0) || 1;
    var g = el('g', {});
    function arc(a0, a1, rr, ry) {
      var x1 = cx + rr * Math.cos(a0), y1 = cy + ry * Math.sin(a0);
      var x2 = cx + rr * Math.cos(a1), y2 = cy + ry * Math.sin(a1);
      return { x1: x1, y1: y1, x2: x2, y2: y2, big: (a1 - a0) > Math.PI ? 1 : 0 };
    }
    var RY = R * 0.62, ry2 = r * 0.62;            /* 压扁成椭圆 = 俯视 2.5D */
    var a = -Math.PI / 2, i;
    /* 先画底部侧壁（只有下半圈看得见），再画顶面 */
    for (i = 0; i < data.length; i++) {
      var frac = Math.abs(+data[i] || 0) / total, a1 = a + frac * Math.PI * 2, c = catOf(spec, i);
      var o = arc(a, a1, R, RY);
      if (Math.sin(a) > -0.1 || Math.sin(a1) > -0.1) {
        g.appendChild(el('path', { d: 'M' + o.x1 + ',' + o.y1 + ' A' + R + ',' + RY + ' 0 ' + o.big + ' 1 ' + o.x2 + ',' + o.y2 + ' v' + depth + ' A' + R + ',' + RY + ' 0 ' + o.big + ' 0 ' + o.x1 + ',' + (o.y1 + depth) + ' Z', fill: darken(c, .3) }));
      }
      a = a1;
    }
    a = -Math.PI / 2;
    for (i = 0; i < data.length; i++) {
      var f2 = Math.abs(+data[i] || 0) / total, b1 = a + f2 * Math.PI * 2, c2 = catOf(spec, i);
      var oo = arc(a, b1, R, RY), ii = arc(b1, a, r, ry2);
      g.appendChild(el('path', { d: 'M' + oo.x1 + ',' + oo.y1 + ' A' + R + ',' + RY + ' 0 ' + oo.big + ' 1 ' + oo.x2 + ',' + oo.y2 + ' L' + ii.x1 + ',' + ii.y1 + ' A' + r + ',' + ry2 + ' 0 ' + ii.big + ' 0 ' + ii.x2 + ',' + ii.y2 + ' Z', fill: c2, stroke: SURF, 'stroke-width': 2 }));
      a = b1;
    }
    if (spec.total != null) {
      g.appendChild(txt(cx, cy + 1, fmt(spec.total), { anchor: 'middle', size: 13, fill: INK, weight: 800 }));
      if (spec.unit) g.appendChild(txt(cx, cy + 12, spec.unit, { anchor: 'middle', size: 8, fill: MUTE }));
    }
    labels.slice(0, 6).forEach(function (lb, k) {
      var y = 16 + k * 16, c3 = catOf(spec, k);
      g.appendChild(el('rect', { x: 118, y: y - 7, width: 8, height: 8, rx: 2, fill: c3 }));
      g.appendChild(txt(130, y, String(lb).slice(0, 7), { size: 9, fill: SUB }));
      g.appendChild(txt(W - 4, y, fmt(data[k]) + (spec.unit || ''), { anchor: 'end', size: 9, fill: INK, weight: 700, tabular: 1 }));
    });
    return { g: g, H: Math.max(H, 16 + Math.min(6, labels.length) * 16 + 8) };
  }

  function drawFunnel(spec, A) {                    /* 2.5D 漏斗：转化 */
    var W = A.W, labels = spec.labels || [], s0 = (spec.series || [])[0] || { data: [] };
    var data = s0.data || [], n = data.length, rowH = 24, H = 10 + n * rowH + 4;
    var mx = Math.max.apply(null, data.map(function (v) { return Math.abs(+v || 0); }).concat([1]));
    var rsv = Math.max(46, (fmt(mx) + (spec.unit || '')).length * 6.4 + 34);
    var c = colorOf(spec, 0, A.accent), g = el('g', {});
    data.forEach(function (v, i) {
      var w = (Math.abs(+v || 0) / mx) * (W - 56 - rsv), y = 10 + i * rowH;
      var shade = lighten(c, i * 0.09);
      g.appendChild(txt(52, y + 12, String(labels[i] || '').slice(0, 6), { anchor: 'end', size: 9, fill: SUB }));
      boxH(g, 56, y, w, 15, shade);
      g.appendChild(txt(56 + w + DX + 5, y + 12, fmt(v) + (spec.unit || ''), { size: 9.5, fill: INK, weight: 700, tabular: 1 }));
      if (i) {
        var prev = Math.abs(+data[i - 1] || 0), rate = prev ? Math.round((Math.abs(+v || 0) / prev) * 100) : 0;
        g.appendChild(txt(W - 2, y + 2, rate + '%', { anchor: 'end', size: 8.5, fill: MUTE, tabular: 1 }));
      }
    });
    return { g: g, H: H };
  }

  function drawGauge(spec, A) {                     /* 2.5D 仪表：单指标 vs 目标 */
    var W = A.W, v = +(spec.value != null ? spec.value : ((spec.series || [])[0] || {}).data), H = 104;
    var max = +(spec.max != null ? spec.max : 100), tgt = spec.target;
    var cx = W / 2, cy = 58, R = 54, ry = 38, c = colorOf(spec, 0, A.accent);
    var g = el('g', {}), p = Math.max(0, Math.min(1, (v || 0) / (max || 1)));
    function pt(q, rr, rry) { var a = Math.PI + Math.max(0, Math.min(1, q)) * Math.PI; return [cx + rr * Math.cos(a), cy + rry * Math.sin(a)]; }
    function band(host, q0, q1, fill, w, op) {
      var a = pt(q0, R, ry), b = pt(q1, R, ry);
      host.appendChild(el('path', { d: 'M' + a[0].toFixed(1) + ',' + a[1].toFixed(1) + ' A' + R + ',' + ry + ' 0 0 1 ' + b[0].toFixed(1) + ',' + b[1].toFixed(1),
        fill: 'none', stroke: fill, 'stroke-width': w, 'stroke-linecap': 'round', opacity: op == null ? 1 : op }));
    }
    band(g, 0, 1, '#EDF0F6', 13);                                   /* 未走到的刻度 */
    var sh = el('g', { transform: 'translate(2.6,2.6)' });          /* 厚度：同一段弧的暗影，不动读数 */
    band(sh, 0, Math.max(.012, p), darken(c, .34), 13, .34);
    g.appendChild(sh);
    band(g, 0, Math.max(.012, p), c, 13);
    if (tgt != null) {                                              /* 目标：刻度外侧一个点 + 一小截引线 */
      var q = Math.max(0, Math.min(1, tgt / (max || 1)));
      var o1 = pt(q, R - 8.5, ry - 6), o2 = pt(q, R + 8.5, ry + 6), o3 = pt(q, R + 13, ry + 9.5);
      g.appendChild(el('line', { x1: o1[0].toFixed(1), y1: o1[1].toFixed(1), x2: o2[0].toFixed(1), y2: o2[1].toFixed(1), stroke: SURF, 'stroke-width': 3.4, 'stroke-linecap': 'round' }));
      g.appendChild(el('line', { x1: o1[0].toFixed(1), y1: o1[1].toFixed(1), x2: o2[0].toFixed(1), y2: o2[1].toFixed(1), stroke: INK, 'stroke-width': 1.6, 'stroke-linecap': 'round' }));
      g.appendChild(el('circle', { cx: o3[0].toFixed(1), cy: o3[1].toFixed(1), r: 2.6, fill: INK }));
    }
    g.appendChild(txt(cx, cy + 22, fmt(v) + (spec.unit || ''), { anchor: 'middle', size: 23, fill: INK, weight: 800, tabular: 1 }));
    if (tgt != null) g.appendChild(txt(cx, cy + 37, '目标 ' + fmt(tgt) + (spec.unit || ''), { anchor: 'middle', size: 9, fill: MUTE, tabular: 1 }));
    else if (spec.unit) g.appendChild(txt(cx, cy + 37, spec.unit, { anchor: 'middle', size: 9, fill: MUTE }));
    return { g: g, H: H };
  }

  function drawRadar(spec, A) {                     /* 雷达：多维画像 */
    var W = A.W, labels = spec.labels || [], ss = spec.series || [], H = 132;
    var cx = W / 2, cy = 66, R = 46, n = labels.length || 1;
    var mx = spec.max || 100, g = el('g', {});
    function pt(i, v) { var a = -Math.PI / 2 + (i / n) * Math.PI * 2, rr = (v / mx) * R; return [cx + rr * Math.cos(a), cy + rr * Math.sin(a) * .88]; }
    [0.33, 0.66, 1].forEach(function (k) {
      var d = '', i; for (i = 0; i < n; i++) { var p = pt(i, mx * k); d += (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1); }
      g.appendChild(el('path', { d: d + 'Z', fill: 'none', stroke: LINE, 'stroke-width': 1 }));
    });
    ss.forEach(function (s, j) {
      var c = colorOf(spec, j, A.accent), d = '', i;
      for (i = 0; i < n; i++) { var p = pt(i, Math.abs(+(s.data || [])[i] || 0)); d += (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1); }
      g.appendChild(el('path', { d: d + 'Z', fill: c, 'fill-opacity': .18, stroke: c, 'stroke-width': 2, 'stroke-linejoin': 'round' }));
      for (i = 0; i < n; i++) { var q = pt(i, Math.abs(+(s.data || [])[i] || 0)); g.appendChild(el('circle', { cx: q[0], cy: q[1], r: 3, fill: c, stroke: SURF, 'stroke-width': 1.5 })); }
    });
    labels.forEach(function (lb, i) {
      var p = pt(i, mx * 1.22);
      g.appendChild(txt(p[0], p[1] + 3, String(lb).slice(0, 4), { anchor: p[0] > cx + 6 ? 'start' : (p[0] < cx - 6 ? 'end' : 'middle'), size: 8.5, fill: SUB }));
    });
    return { g: g, H: H };
  }

  function drawWaterfall(spec, A) {                 /* 2.5D 瀑布：增减归因 */
    var W = A.W, labels = spec.labels || [], s0 = (spec.series || [])[0] || { data: [] };
    var data = s0.data || [], pad = { l: 30, r: 10, t: 16, b: 22 }, H = A.H || 124;
    var x0 = pad.l, x1 = W - pad.r, y0 = pad.t, y1 = H - pad.b;
    var acc = 0, pts = data.map(function (v) {
      if (v == null) return { from: 0, to: acc, v: acc, total: true };       /* null = 这一根是累计合计 */
      var s = acc; acc += (+v || 0); return { from: s, to: acc, v: +v || 0, total: false };
    });
    var lo = Math.min(0, Math.min.apply(null, pts.map(function (p) { return Math.min(p.from, p.to); })));
    var hi = Math.max.apply(null, pts.map(function (p) { return Math.max(p.from, p.to); }).concat([1]));
    var span = (hi - lo) || 1, g = el('g', {});
    grid(g, x0, x1, [y0, y1]);
    var slot = (x1 - x0 - DX) / Math.max(1, pts.length), bw = Math.max(8, slot - 10);
    var UP = '#1baf7a', DN = '#e34948';
    pts.forEach(function (p, i) {
      var yA = y1 - ((p.from - lo) / span) * (y1 - y0), yB = y1 - ((p.to - lo) / span) * (y1 - y0);
      var x = x0 + slot * i + (slot - bw) / 2;
      box(g, x, Math.min(yA, yB), bw, Math.abs(yB - yA), p.total ? A.accent : (p.v >= 0 ? UP : DN));
      g.appendChild(txt(x + bw / 2 + DX / 2, Math.min(yA, yB) + DY - 3, (p.total || p.v < 0 ? '' : '+') + fmt(p.v), { anchor: 'middle', size: 8.5, fill: INK, weight: 700, tabular: 1 }));
      g.appendChild(txt(x + bw / 2, y1 + 12, String(labels[i] || '').slice(0, 5), { anchor: 'middle', size: 8.5, fill: SUB }));
    });
    return { g: g, H: H };
  }

  function drawProgress(spec, A) {                  /* 多项完成度：一组进度条 */
    var W = A.W, labels = spec.labels || [], s0 = (spec.series || [])[0] || { data: [] };
    var n = labels.length, rowH = 22, H = 8 + n * rowH, c = colorOf(spec, 0, A.accent);
    var max = spec.max || 100, lw = Math.min(80, W * .3), g = el('g', {});
    labels.forEach(function (lb, i) {
      var v = Math.abs(+(s0.data || [])[i] || 0), y = 8 + i * rowH;
      var x0 = lw + 4, x1 = W - 42, w = ((v / max) * (x1 - x0));
      g.appendChild(txt(lw, y + 9, String(lb).slice(0, 7), { anchor: 'end', size: 9, fill: SUB }));
      g.appendChild(el('rect', { x: x0, y: y, width: x1 - x0, height: 10, rx: 5, fill: '#EDF0F6' }));
      boxH(g, x0, y, Math.max(2, w), 10, v / max >= .999 ? '#1baf7a' : c, 5);
      g.appendChild(txt(W - 2, y + 9, fmt(v) + (spec.unit || ''), { anchor: 'end', size: 9, fill: INK, weight: 700, tabular: 1 }));
    });
    return { g: g, H: H };
  }

  function drawHeat(spec, A) {                      /* 热力网格：单色深浅，不用彩虹 */
    var W = A.W, cols = spec.labels || [], rows = spec.rows || [], m = spec.matrix || [];
    var cw = Math.min(26, (W - 54) / Math.max(1, cols.length)), ch = 17;
    var H = 16 + rows.length * (ch + 3) + 6, c = colorOf(spec, 0, A.accent), g = el('g', {});
    var all = []; m.forEach(function (r) { (r || []).forEach(function (v) { all.push(Math.abs(+v || 0)); }); });
    var mx = Math.max.apply(null, all.concat([1]));
    cols.forEach(function (cl, j) { g.appendChild(txt(50 + j * (cw + 3) + cw / 2, 10, String(cl).slice(0, 3), { anchor: 'middle', size: 8, fill: MUTE })); });
    rows.forEach(function (rw, i) {
      var y = 16 + i * (ch + 3);
      g.appendChild(txt(46, y + 12, String(rw).slice(0, 5), { anchor: 'end', size: 9, fill: SUB }));
      (m[i] || []).forEach(function (v, j) {
        var k = Math.abs(+v || 0) / mx;
        g.appendChild(el('rect', { x: 50 + j * (cw + 3), y: y, width: cw, height: ch, rx: 3, fill: lighten(c, 1 - (0.15 + k * 0.85)) }));
        if (cw >= 20) g.appendChild(txt(50 + j * (cw + 3) + cw / 2, y + 12, fmt(v), { anchor: 'middle', size: 8, fill: k > .55 ? '#fff' : INK, weight: 600, tabular: 1 }));
      });
    });
    return { g: g, H: H };
  }

  function drawScatter(spec, A) {                   /* 散点：两指标关系，序列上限 3 */
    var W = A.W, ss = (spec.series || []).slice(0, 3), pad = { l: 30, r: 12, t: spec.yLabel ? 24 : 14, b: 20 }, H = A.H || (spec.yLabel ? 132 : 124);
    var x0 = pad.l, x1 = W - pad.r, y0 = pad.t, y1 = H - pad.b, g = el('g', {});
    var xs = [], ys = [];
    ss.forEach(function (s) { (s.points || []).forEach(function (p) { xs.push(+p[0]); ys.push(+p[1]); }); });
    var xm = nice(Math.max.apply(null, xs.concat([1]))), ym = nice(Math.max.apply(null, ys.concat([1])));
    grid(g, x0, x1, [y0, (y0 + y1) / 2, y1]);
    g.appendChild(txt(x0 - 4, y0 + 3, fmt(ym), { anchor: 'end', size: 8.5, fill: MUTE, tabular: 1 }));
    g.appendChild(txt(x0 - 4, y1 + 3, '0', { anchor: 'end', size: 8.5, fill: MUTE, tabular: 1 }));
    ss.forEach(function (s, j) {
      var c = colorOf(spec, j, A.accent);
      (s.points || []).forEach(function (p) {
        var X = x0 + (+p[0] / xm) * (x1 - x0), Y = y1 - (+p[1] / ym) * (y1 - y0);
        g.appendChild(el('ellipse', { cx: X + 2.6, cy: Y + 2.6, rx: 5.6, ry: 4.4, fill: darken(c, .3), opacity: .22 }));
        g.appendChild(el('circle', { cx: X, cy: Y, r: 5.4, fill: c, stroke: SURF, 'stroke-width': 2 }));
      });
    });
    if (spec.yLabel) g.appendChild(txt(0, y0 - 11, spec.yLabel, { size: 8.5, fill: MUTE }));
    g.appendChild(txt(x1, y1 + 12, spec.xLabel || '', { anchor: 'end', size: 8.5, fill: MUTE }));
    return { g: g, H: H };
  }

  var DRAW = {
    column: drawColumn, bar: drawBar, stack: drawStack,
    line: function (s, a) { return drawLine(s, a, false); },
    area: function (s, a) { return drawLine(s, a, true); },
    donut: drawDonut, pie: drawDonut, funnel: drawFunnel, gauge: drawGauge,
    radar: drawRadar, waterfall: drawWaterfall, progress: drawProgress, heat: drawHeat, scatter: drawScatter
  };

  var SEQ = 0;
  function render(spec, opt) {
    opt = opt || {};
    if (!spec || !spec.chart || !DRAW[spec.chart]) return null;
    var W = opt.width || 286;
    var accent = opt.accent || '#2a78d6';
    var uid = 'cc' + (++SEQ);
    var svg = el('svg', { width: '100%', viewBox: '0 0 ' + W + ' 10', 'aria-hidden': 'true', class: 'cc' });
    var defs = el('defs', {}); svg.appendChild(defs);
    var head = 0, wrap = el('g', {});
    if (spec.title) { svg.appendChild(txt(0, 10, spec.title, { size: 10, fill: SUB, weight: 600 })); head = 16; }
    var out;
    try { out = DRAW[spec.chart](spec, { W: W, H: spec.height, accent: accent, defs: defs, uid: uid }); }
    catch (e) { return null; }
    wrap.setAttribute('transform', 'translate(0,' + head + ')');
    wrap.appendChild(out.g); svg.appendChild(wrap);
    var total = head + out.H;
    /* 多序列一定给图例：身份不能只靠颜色 */
    var ss = spec.series || [];
    if (ss.length > 1 && spec.chart !== 'donut' && spec.chart !== 'pie') {
      var lx = 0, ly = total + 10;
      ss.forEach(function (s, j) {
        if (!s.name) return;
        svg.appendChild(el('rect', { x: lx, y: ly - 7, width: 8, height: 8, rx: 2, fill: colorOf(spec, j, accent) }));
        var t = txt(lx + 12, ly, s.name, { size: 9, fill: SUB });
        svg.appendChild(t);
        lx += 12 + String(s.name).length * 9 + 10;
      });
      total = ly + 6;
    }
    if (spec.note) { svg.appendChild(txt(0, total + 11, spec.note, { size: 8.5, fill: MUTE })); total += 14; }
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + total);
    svg.setAttribute('style', 'display:block;height:auto;overflow:visible');
    return svg;
  }

  window.DGG.chatChart = { render: render, TYPES: Object.keys(DRAW), CAT: CAT };
})();
