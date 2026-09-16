/* 报告图表库 · 模块 1 专用 · 内联 SVG，无外部依赖
 * heroM1 封面主视觉（企服 + AI + 六维雷达 + 等级阶梯）· scoreArc 综合分大弧 · levelLadder 等级阶梯
 * radarPro 六维雷达（渐变填充 + 参考带 + 直标）· dimBullet 六维对照条 · dimDiverge 相对参考带偏离
 * subHeat 十八项子维度热力网格 · gauge6 六维小仪表 · answerGrid 36 题作答网格
 * gapBars 距下一级逐维差距 · actionFlow 三阶段九项行动泳道 · distCurve 同行分布
 * 分类色：六维 #1157B5 #0FA3C7 #8A54DC #E0635C #C9A227 #0E9F6E（已过色觉校验，且全部直接标名）
 */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var C = (window.DGG && window.DGG.charts) || {};
  var P = C.P || {};
  var gid1 = 0;
  function el(t, a, k) { var e = document.createElementNS(NS, t); Object.keys(a || {}).forEach(function (x) { e.setAttribute(x, a[x]); }); (k || []).forEach(function (c) { if (c) e.appendChild(c); }); return e; }
  function txt(x, y, s, a) { var o = { x: x, y: y, 'font-size': 12, fill: P.text }; Object.keys(a || {}).forEach(function (k) { o[k] = a[k]; }); var t = el('text', o); t.textContent = s; return t; }
  function svg(w, h, label) { return el('svg', { viewBox: '0 0 ' + w + ' ' + h, width: '100%', role: 'img', 'aria-label': label || '', style: 'font-family:inherit;display:block' }); }
  function grad(s, c1, c2, vertical, stops) {
    var id = 'm1g' + (++gid1);
    var defs = s.querySelector('defs') || s.insertBefore(el('defs'), s.firstChild);
    var g = el('linearGradient', vertical ? { id: id, x1: 0, y1: 0, x2: 0, y2: 1 } : { id: id, x1: 0, y1: 0, x2: 1, y2: 0 });
    (stops || [['0%', c1], ['100%', c2]]).forEach(function (t) { g.appendChild(el('stop', { offset: t[0], 'stop-color': t[1], 'stop-opacity': t[2] == null ? 1 : t[2] })); });
    defs.appendChild(g); return 'url(#' + id + ')';
  }
  function light(hex, k) { var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; var f = function (c) { return Math.round(c + (255 - c) * k); }; return '#' + ((1 << 24) + (f(r) << 16) + (f(g) << 8) + f(b)).toString(16).slice(1); }
  function dark(hex, k) { var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; var f = function (c) { return Math.round(c * (1 - k)); }; return '#' + ((1 << 24) + (f(r) << 16) + (f(g) << 8) + f(b)).toString(16).slice(1); }
  function trunc(s, n) { s = String(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
  function rr(x, y, w, h, r) { r = Math.min(r, h / 2, w / 2); return 'M' + (x + r) + ' ' + y + 'h' + (w - 2 * r) + 'a' + r + ' ' + r + ' 0 0 1 ' + r + ' ' + r + 'v' + (h - 2 * r) + 'a' + r + ' ' + r + ' 0 0 1 ' + (-r) + ' ' + r + 'h' + (-(w - 2 * r)) + 'a' + r + ' ' + r + ' 0 0 1 ' + (-r) + ' ' + (-r) + 'v' + (-(h - 2 * r)) + 'a' + r + ' ' + r + ' 0 0 1 ' + r + ' ' + (-r) + 'z'; }
  function hexPath(cx, cy, r) {
    var p = [];
    for (var i = 0; i < 6; i++) { var a = -Math.PI / 2 + i * Math.PI / 3; p.push((cx + r * Math.cos(a)).toFixed(1) + ' ' + (cy + r * Math.sin(a)).toFixed(1)); }
    return 'M' + p.join('L') + 'Z';
  }
  var BAND = '#9FB2CC';

  // ---------- 封面主视觉：左 企服 · 中 六维雷达 + AI 核 · 右 等级阶梯 ----------
  C.heroM1 = function (r, seed) {
    var W = 1000, H = 452, s = svg(W, H, '封面主视觉');
    var d = el('defs'); s.appendChild(d);
    var bg = el('linearGradient', { id: 'hm1bg', x1: 0, y1: 0, x2: 1, y2: 1 });
    [['0%', '#04101F'], ['42%', '#0A2A5E'], ['100%', '#0C4A63']].forEach(function (t) { bg.appendChild(el('stop', { offset: t[0], 'stop-color': t[1] })); });
    d.appendChild(bg);
    s.appendChild(el('rect', { x: 0, y: 0, width: W, height: H, fill: 'url(#hm1bg)' }));
    var pat = el('pattern', { id: 'hm1grid', width: 46, height: 46, patternUnits: 'userSpaceOnUse' });
    pat.appendChild(el('path', { d: 'M46 0H0V46', fill: 'none', stroke: 'rgba(130,200,230,.085)', 'stroke-width': 1 }));
    d.appendChild(pat);
    s.appendChild(el('rect', { x: 0, y: 0, width: W, height: H, fill: 'url(#hm1grid)' }));
    var rg = el('radialGradient', { id: 'hm1glow' });
    rg.appendChild(el('stop', { offset: '0%', 'stop-color': 'rgba(60,220,190,.26)' }));
    rg.appendChild(el('stop', { offset: '100%', 'stop-color': 'rgba(60,220,190,0)' }));
    d.appendChild(rg);
    s.appendChild(el('ellipse', { cx: 530, cy: 214, rx: 196, ry: 152, fill: 'url(#hm1glow)' }));

    var LN = 'rgba(158,212,235,.80)', LN2 = 'rgba(120,180,215,.44)', CY = '#4FE3C1';
    function g(x, y) { return el('g', { transform: 'translate(' + x + ' ' + y + ')' }); }

    // 左：企服元素（楼宇 · 证照与公章 · 账本）
    var L = g(66, 182);
    [[0, 56, 32, 88], [38, 26, 36, 118], [82, 62, 30, 82]].forEach(function (b) {
      L.appendChild(el('rect', { x: b[0], y: b[1], width: b[2], height: b[3], rx: 3, fill: 'rgba(26,84,132,.32)', stroke: LN, 'stroke-width': 1.6 }));
      for (var ry = b[1] + 10; ry < b[1] + b[3] - 8; ry += 16) for (var rx = b[0] + 7; rx < b[0] + b[2] - 7; rx += 13)
        L.appendChild(el('rect', { x: rx, y: ry, width: 6.5, height: 8, rx: 1, fill: (rx + ry) % 3 === 0 ? 'rgba(79,227,193,.72)' : 'rgba(150,205,230,.22)' }));
    });
    L.appendChild(el('line', { x1: -8, y1: 148, x2: 238, y2: 148, stroke: LN2, 'stroke-width': 1.4 }));
    s.appendChild(L);
    var C1 = g(196, 180);
    C1.appendChild(el('rect', { x: 0, y: 0, width: 90, height: 60, rx: 5, fill: 'rgba(18,70,116,.46)', stroke: LN, 'stroke-width': 1.6 }));
    [12, 22, 32].forEach(function (y, i) { C1.appendChild(el('rect', { x: 10, y: y, width: [52, 42, 36][i], height: 3.4, rx: 1.7, fill: 'rgba(168,214,236,.55)' })); });
    C1.appendChild(el('circle', { cx: 68, cy: 43, r: 12.5, fill: 'none', stroke: '#FF8A3D', 'stroke-width': 2 }));
    C1.appendChild(el('path', { d: 'M61 43h14M68 36v14', stroke: '#FF8A3D', 'stroke-width': 1.6 }));
    C1.appendChild(el('circle', { cx: 68, cy: 43, r: 16.5, fill: 'none', stroke: 'rgba(255,138,61,.28)', 'stroke-width': 1 }));
    s.appendChild(C1);
    var C2 = g(196, 254);
    C2.appendChild(el('rect', { x: 0, y: 0, width: 74, height: 56, rx: 5, fill: 'rgba(18,70,116,.40)', stroke: LN2, 'stroke-width': 1.4 }));
    [[12, 28], [26, 18], [40, 36], [54, 24]].forEach(function (b) { C2.appendChild(el('rect', { x: b[0], y: 44 - b[1], width: 8, height: b[1], rx: 2, fill: 'rgba(79,227,193,.6)' })); });
    s.appendChild(C2);
    s.appendChild(txt(166, 360, '企业经营现状', { 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: 'rgba(208,234,246,.92)' }));
    s.appendChild(txt(166, 376, 'PROFILE · SYSTEMS · PEOPLE', { 'text-anchor': 'middle', 'font-size': 8.5, 'letter-spacing': 2.2, fill: 'rgba(132,186,212,.72)' }));

    // 中：六维雷达 + AI 核
    var dims = (r && r.dimensions) || [];
    var RC = g(530, 212), R0 = 100, n = Math.max(3, dims.length);
    var pt = function (i, v) { var a = -Math.PI / 2 + i * 2 * Math.PI / n, rr2 = R0 * v / 100; return [rr2 * Math.cos(a), rr2 * Math.sin(a)]; };
    [25, 50, 75, 100].forEach(function (lv) {
      RC.appendChild(el('path', { d: hexPath(0, 0, R0 * lv / 100), fill: 'none', stroke: 'rgba(130,200,230,.20)', 'stroke-width': lv === 100 ? 1.4 : 1 }));
    });
    dims.forEach(function (dm, i) { var p2 = pt(i, 104); RC.appendChild(el('line', { x1: 0, y1: 0, x2: p2[0], y2: p2[1], stroke: 'rgba(130,200,230,.18)' })); });
    if (dims.length) {
      var dd = dims.map(function (dm, i) { return pt(i, dm.pct).join(' '); }).join(' L');
      var fill = grad(s, 'rgba(79,227,193,.42)', 'rgba(17,87,181,.20)', true);
      RC.appendChild(el('path', { d: 'M' + dd + ' Z', fill: fill, stroke: CY, 'stroke-width': 2.4, 'stroke-linejoin': 'round' }));
      dims.forEach(function (dm, i) {
        var p2 = pt(i, dm.pct);
        RC.appendChild(el('circle', { cx: p2[0], cy: p2[1], r: 4.6, fill: '#08243F', stroke: CY, 'stroke-width': 2 }));
        var lp = pt(i, 124), anchor = Math.abs(lp[0]) < 8 ? 'middle' : (lp[0] > 0 ? 'start' : 'end');
        RC.appendChild(txt(lp[0], lp[1] + 4, dm.name, { 'text-anchor': anchor, 'font-size': 11.5, 'font-weight': 700, fill: 'rgba(214,238,248,.92)' }));
      });
    }
    RC.appendChild(el('circle', { cx: 0, cy: 0, r: 30, fill: 'rgba(8,36,63,.86)', stroke: 'rgba(79,227,193,.55)', 'stroke-width': 1.6 }));
    RC.appendChild(el('rect', { x: -17, y: -17, width: 34, height: 34, rx: 8, fill: grad(s, '#16C6A4', '#1157B5', true), stroke: 'rgba(160,245,225,.8)', 'stroke-width': 1.4 }));
    RC.appendChild(txt(0, 5, 'AI', { 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 900, fill: '#fff' }));
    s.appendChild(RC);
    s.appendChild(txt(530, 360, '六维成熟度评估', { 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: 'rgba(208,234,246,.92)' }));
    s.appendChild(txt(530, 376, 'SIX DIMENSIONS · 36 QUESTIONS', { 'text-anchor': 'middle', 'font-size': 8.5, 'letter-spacing': 2.2, fill: 'rgba(132,186,212,.72)' }));

    // 右：等级阶梯
    var lv = (r && r.levels) || [], cur = r && r.level ? r.level.code : '';
    var RB = g(744, 292), bw = 40;
    lv.forEach(function (x, i) {
      var hgt = 26 + i * 22, on = x.code === cur;
      var bx = i * (bw + 7), by = -hgt;
      RB.appendChild(el('path', { d: rr(bx, by, bw, hgt, 6), fill: on ? grad(s, '#4FE3C1', '#1157B5', true) : 'rgba(110,170,210,.18)', stroke: on ? 'rgba(160,245,225,.8)' : 'rgba(130,190,225,.30)', 'stroke-width': on ? 1.6 : 1 }));
      RB.appendChild(txt(bx + bw / 2, by - 8, x.code, { 'text-anchor': 'middle', 'font-size': 11.5, 'font-weight': 800, fill: on ? '#7BFFE4' : 'rgba(180,215,235,.7)' }));
      RB.appendChild(txt(bx + bw / 2, 15, x.name, { 'text-anchor': 'middle', 'font-size': 10.5, fill: on ? '#D8F6EF' : 'rgba(170,205,228,.62)' }));
      if (on) RB.appendChild(el('path', { d: 'M' + (bx + bw / 2 - 5) + ' ' + (by - 22) + 'l5 7l5 -7z', fill: '#7BFFE4' }));
    });
    RB.appendChild(el('line', { x1: -8, y1: 0, x2: lv.length * (bw + 7) - 4, y2: 0, stroke: 'rgba(130,190,225,.42)' }));
    s.appendChild(RB);
    s.appendChild(txt(836, 360, '所处等级与下一步', { 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: 'rgba(208,234,246,.92)' }));
    s.appendChild(txt(836, 376, 'LEVEL · GAP · ROADMAP', { 'text-anchor': 'middle', 'font-size': 8.5, 'letter-spacing': 2.2, fill: 'rgba(132,186,212,.72)' }));

    // 扫描环与连接弧
    [138, 172].forEach(function (rad, i) {
      s.appendChild(el('circle', { cx: 530, cy: 212, r: rad, fill: 'none', stroke: 'rgba(79,227,193,' + (0.16 - i * 0.06) + ')', 'stroke-width': 1, 'stroke-dasharray': i ? '3 9' : '2 7' }));
    });
    var fl = el('linearGradient', { id: 'hm1flow', x1: 0, y1: 0, x2: 1, y2: 0 });
    [['0%', 'rgba(255,138,61,.12)'], ['36%', 'rgba(79,227,193,.62)'], ['68%', 'rgba(79,227,193,.62)'], ['100%', 'rgba(17,87,181,.20)']].forEach(function (t) { fl.appendChild(el('stop', { offset: t[0], 'stop-color': t[1] })); });
    d.appendChild(fl);
    [[-40, 130], [0, 148], [40, 130]].forEach(function (c, i) {
      s.appendChild(el('path', { d: 'M300 ' + (212 + c[0]) + 'C' + (300 + c[1]) + ' ' + (212 + c[0] * 1.6) + ',' + (736 - c[1]) + ' ' + (212 + c[0] * 1.6) + ',736 ' + (212 + c[0]),
        fill: 'none', stroke: 'url(#hm1flow)', 'stroke-width': i === 1 ? 2.2 : 1.5, 'stroke-linecap': 'round' }));
    });
    var rnd = (function (x) { return function () { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648; }; })(seed || 13);
    for (var q = 0; q < 14; q++) s.appendChild(el('circle', { cx: 310 + rnd() * 390, cy: 160 + rnd() * 100, r: 1.5 + rnd() * 1.8, fill: 'rgba(150,240,220,' + (0.26 + rnd() * 0.4) + ')' }));
    s.appendChild(el('path', { d: 'M0 408C170 388,330 426,500 408S830 388,1000 412V452H0Z', fill: 'rgba(4,18,34,.55)' }));
    s.appendChild(el('path', { d: 'M0 426C180 410,340 442,520 426S840 410,1000 430V452H0Z', fill: 'rgba(3,12,26,.75)' }));
    return s;
  };

  // ---------- 综合分大弧 ----------
  C.scoreArc = function (pct, level, next) {
    var W = 250, H = 186, cx = 125, cy = 132, R = 96, sw = 20, s = svg(W, H, '综合得分');
    var arc = function (a0, a1, r) {
      var x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0), x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
      return 'M' + x0 + ' ' + y0 + ' A' + r + ' ' + r + ' 0 ' + ((a1 - a0) > Math.PI ? 1 : 0) + ' 1 ' + x1 + ' ' + y1;
    };
    s.appendChild(el('path', { d: arc(Math.PI, 2 * Math.PI, R), fill: 'none', stroke: '#E9EEF6', 'stroke-width': sw, 'stroke-linecap': 'round' }));
    if (next) {
      var an = Math.PI + Math.PI * next.minPct / 100;
      s.appendChild(el('path', { d: arc(an - 0.012, an + 0.012, R), fill: 'none', stroke: '#C9A227', 'stroke-width': sw + 8, 'stroke-linecap': 'butt' }));
      var lx = cx + (R + 20) * Math.cos(an), ly = cy + (R + 20) * Math.sin(an);
      s.appendChild(txt(lx, ly - 2, next.code, { 'text-anchor': 'middle', 'font-size': 10, 'font-weight': 800, fill: '#8A6A14' }));
      s.appendChild(txt(lx, ly + 9, '门槛', { 'text-anchor': 'middle', 'font-size': 8.5, fill: '#A0821F' }));
    }
    var a1 = Math.PI + Math.PI * Math.max(0, Math.min(100, pct)) / 100;
    s.appendChild(el('path', { d: arc(Math.PI, a1, R), fill: 'none', stroke: grad(s, '#0FA3C7', '#1157B5', false), 'stroke-width': sw, 'stroke-linecap': 'round' }));
    s.appendChild(txt(cx, cy - 22, String(pct), { 'text-anchor': 'middle', 'font-size': 40, 'font-weight': 900, fill: P.navy }));
    s.appendChild(txt(cx + 40, cy - 22, '%', { 'text-anchor': 'start', 'font-size': 15, 'font-weight': 800, fill: P.sub }));
    if (level) {
      s.appendChild(txt(cx, cy - 2, level.code + ' ' + level.name + ' 级', { 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 800, fill: P.blue }));
      s.appendChild(txt(cx, cy + 14, '成熟度综合得分', { 'text-anchor': 'middle', 'font-size': 10, fill: P.sub }));
    }
    s.appendChild(txt(cx - R, cy + 20, '0', { 'text-anchor': 'middle', 'font-size': 10, fill: P.sub }));
    s.appendChild(txt(cx + R, cy + 20, '100', { 'text-anchor': 'middle', 'font-size': 10, fill: P.sub }));
    return s;
  };

  // ---------- 等级阶梯（立体） ----------
  C.levelLadder = function (levels, pct, code, next) {
    var W = 580, H = 214, s = svg(W, H, '成熟度等级阶梯'), base = 168, bw = 94, gap = 12;
    levels.forEach(function (lv, i) {
      var hgt = 34 + i * 20, x = 14 + i * (bw + gap), y = base - hgt, on = lv.code === code, isNext = next && lv.code === next.code;
      var c1 = on ? '#1157B5' : isNext ? '#C9A227' : '#DCE5F0', c2 = on ? '#0FA3C7' : isNext ? '#E0B450' : '#EAF0F7';
      s.appendChild(el('path', { d: rr(x, y, bw, hgt, 7), fill: grad(s, c1, c2, true), stroke: on ? 'rgba(255,255,255,.7)' : 'none', 'stroke-width': on ? 1.5 : 0 }));
      s.appendChild(el('path', { d: rr(x + 6, y + 2, bw - 12, 5, 3), fill: 'rgba(255,255,255,' + (on || isNext ? .42 : .7) + ')' }));
      s.appendChild(txt(x + bw / 2, y + hgt / 2 + 5, lv.code, { 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 900, fill: on || isNext ? '#fff' : '#8494AC' }));
      s.appendChild(txt(x + bw / 2, base + 16, lv.name, { 'text-anchor': 'middle', 'font-size': 11.5, 'font-weight': on ? 800 : 500, fill: on ? P.navy : P.sub }));
      s.appendChild(txt(x + bw / 2, base + 30, '≥ ' + lv.minPct + '%', { 'text-anchor': 'middle', 'font-size': 9.5, fill: P.sub }));
      if (on) {
        s.appendChild(el('path', { d: rr(x + bw / 2 - 30, y - 30, 60, 20, 6), fill: P.navy }));
        s.appendChild(txt(x + bw / 2, y - 16, '本企业', { 'text-anchor': 'middle', 'font-size': 10.5, 'font-weight': 800, fill: '#fff' }));
        s.appendChild(el('path', { d: 'M' + (x + bw / 2 - 5) + ' ' + (y - 10) + 'l5 6l5 -6z', fill: P.navy }));
      }
      if (isNext) s.appendChild(txt(x + bw / 2, y - 12, '下一级', { 'text-anchor': 'middle', 'font-size': 10, 'font-weight': 800, fill: '#8A6A14' }));
    });
    s.appendChild(el('line', { x1: 8, y1: base, x2: W - 8, y2: base, stroke: P.line, 'stroke-width': 1.5 }));
    return s;
  };

  // ---------- 六维雷达（渐变填充 + 参考带 + 直标） ----------
  C.radarPro = function (dims, opts) {
    opts = opts || {};
    var W = 430, H = 360, cx = 215, cy = 172, R = 116, n = dims.length, s = svg(W, H, '六维成熟度雷达');
    var pt = function (i, v) { var a = -Math.PI / 2 + i * 2 * Math.PI / n, r = R * v / 100; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
    [20, 40, 60, 80, 100].forEach(function (lv) {
      s.appendChild(el('path', { d: dims.map(function (_, i) { return pt(i, lv).join(' '); }).join(' L').replace(/^/, 'M') + ' Z', fill: lv === 100 ? '#FBFDFF' : 'none', stroke: '#E3E9F3', 'stroke-width': lv === 100 ? 1.3 : 1 }));
    });
    if (dims[0] && dims[0].band) {
      var hi = dims.map(function (dm, i) { return pt(i, dm.band[1]).join(' '); }).join(' L');
      var lo = dims.map(function (dm, i) { return pt(i, dm.band[0]).join(' '); }).reverse().join(' L');
      s.appendChild(el('path', { d: 'M' + hi + ' Z M' + lo + ' Z', fill: BAND, 'fill-opacity': .20, 'fill-rule': 'evenodd', stroke: BAND, 'stroke-width': 1, 'stroke-dasharray': '4 3' }));
    }
    dims.forEach(function (dm, i) { var p = pt(i, 100); s.appendChild(el('line', { x1: cx, y1: cy, x2: p[0], y2: p[1], stroke: '#E9EEF6' })); });
    var poly = dims.map(function (dm, i) { return pt(i, dm.pct).join(' '); }).join(' L');
    s.appendChild(el('path', { d: 'M' + poly + ' Z', fill: grad(s, 'rgba(17,87,181,.34)', 'rgba(15,163,199,.12)', true), stroke: P.blue, 'stroke-width': 2.6, 'stroke-linejoin': 'round' }));
    dims.forEach(function (dm, i) {
      var p = pt(i, dm.pct);
      s.appendChild(el('circle', { cx: p[0], cy: p[1], r: 8, fill: dm.color, 'fill-opacity': .18 }));
      s.appendChild(el('circle', { cx: p[0], cy: p[1], r: 4.4, fill: dm.color, stroke: '#fff', 'stroke-width': 1.8 }));
      var lp = pt(i, 124), anchor = Math.abs(lp[0] - cx) < 8 ? 'middle' : (lp[0] > cx ? 'start' : 'end');
      s.appendChild(txt(lp[0], lp[1] - 1, dm.name, { 'text-anchor': anchor, 'font-size': 12, 'font-weight': 800, fill: dm.color }));
      s.appendChild(txt(lp[0], lp[1] + 12, dm.pct + '%', { 'text-anchor': anchor, 'font-size': 10.5, 'font-weight': 700, fill: P.sub }));
    });
    var ly = H - 14;
    s.appendChild(el('line', { x1: 40, y1: ly - 4, x2: 62, y2: ly - 4, stroke: P.blue, 'stroke-width': 2.6 }));
    s.appendChild(txt(68, ly, '本企业', { 'font-size': 10.5, fill: P.text }));
    if (dims[0] && dims[0].band) {
      s.appendChild(el('rect', { x: 140, y: ly - 11, width: 22, height: 9, fill: BAND, 'fill-opacity': .30, stroke: BAND, 'stroke-dasharray': '3 2' }));
      s.appendChild(txt(168, ly, '同行参考带', { 'font-size': 10.5, fill: P.text }));
    }
    return s;
  };

  // ---------- 六维对照条：本企业 vs 参考带 ----------
  C.dimBullet = function (dims) {
    var W = 560, rowH = 42, H = dims.length * rowH + 30, s = svg(W, H, '六维得分与同行参考带'), L = 74, R = 470;
    var X = function (v) { return L + (R - L) * v / 100; };
    [0, 25, 50, 75, 100].forEach(function (g) {
      s.appendChild(el('line', { x1: X(g), y1: 18, x2: X(g), y2: H - 14, stroke: '#EFF3F9' }));
      s.appendChild(txt(X(g), 12, g + '%', { 'text-anchor': 'middle', 'font-size': 9.5, fill: P.sub }));
    });
    dims.forEach(function (dm, i) {
      var y = 24 + i * rowH;
      s.appendChild(txt(4, y + 18, dm.name, { 'font-size': 12, 'font-weight': 800, fill: dm.color }));
      s.appendChild(el('path', { d: rr(L, y + 6, R - L, 24, 5), fill: '#F4F7FB' }));
      if (dm.band) {
        s.appendChild(el('rect', { x: X(dm.band[0]), y: y + 6, width: X(dm.band[1]) - X(dm.band[0]), height: 24, fill: BAND, 'fill-opacity': .26 }));
        s.appendChild(el('line', { x1: X(dm.bandMid), y1: y + 4, x2: X(dm.bandMid), y2: y + 32, stroke: '#5E7391', 'stroke-width': 2 }));
      }
      s.appendChild(el('path', { d: rr(L, y + 11, Math.max(4, X(dm.pct) - L), 14, 4), fill: grad(s, light(dm.color, .3), dm.color, false) }));
      s.appendChild(txt(X(dm.pct) + 7, y + 22, dm.pct + '%', { 'font-size': 11, 'font-weight': 800, fill: dm.color }));
      var tag = dm.position === 'above' ? ['高于参考带', P.green] : dm.position === 'below' ? ['低于参考带', P.orange] : dm.position === 'within' ? ['参考带内', P.gray] : ['参考带待补', P.gray];
      s.appendChild(txt(R + 14, y + 22, tag[0], { 'font-size': 10.5, 'font-weight': 700, fill: tag[1] }));
    });
    s.appendChild(el('rect', { x: L, y: H - 12, width: 18, height: 8, fill: BAND, 'fill-opacity': .30 }));
    s.appendChild(txt(L + 24, H - 4, '同行参考带', { 'font-size': 10, fill: P.sub }));
    s.appendChild(el('line', { x1: L + 96, y1: H - 13, x2: L + 96, y2: H - 3, stroke: '#5E7391', 'stroke-width': 2 }));
    s.appendChild(txt(L + 104, H - 4, '参考带中值', { 'font-size': 10, fill: P.sub }));
    return s;
  };

  // ---------- 相对参考带中值的偏离（双向） ----------
  C.dimDiverge = function (dims) {
    var W = 540, rowH = 34, H = dims.length * rowH + 34, s = svg(W, H, '六维相对同行参考带的偏离'), mid = 300, span = 190;
    var max = Math.max(20, Math.ceil(Math.max.apply(null, dims.map(function (d) { return Math.abs(d.pct - (d.bandMid == null ? d.pct : d.bandMid)); })) / 10) * 10);
    var X = function (v) { return mid + span * v / max; };
    s.appendChild(el('line', { x1: mid, y1: 16, x2: mid, y2: H - 18, stroke: '#9AA8BE', 'stroke-width': 1.5 }));
    s.appendChild(txt(mid, 10, '同行参考带中值', { 'text-anchor': 'middle', 'font-size': 9.5, 'font-weight': 700, fill: P.sub }));
    [-max, -max / 2, max / 2, max].forEach(function (g) {
      s.appendChild(el('line', { x1: X(g), y1: 16, x2: X(g), y2: H - 18, stroke: '#F0F4F9' }));
      s.appendChild(txt(X(g), H - 6, (g > 0 ? '+' : '') + g, { 'text-anchor': 'middle', 'font-size': 9, fill: P.sub }));
    });
    dims.forEach(function (dm, i) {
      var y = 22 + i * rowH, dv = dm.bandMid == null ? 0 : Math.round((dm.pct - dm.bandMid) * 10) / 10;
      var pos = dv >= 0, w = Math.abs(X(dv) - mid);
      s.appendChild(txt(4, y + 17, dm.name, { 'font-size': 12, 'font-weight': 800, fill: dm.color }));
      s.appendChild(txt(58, y + 17, dm.pct + '%', { 'font-size': 10.5, fill: P.sub }));
      s.appendChild(el('path', { d: rr(pos ? mid : mid - w, y + 6, Math.max(3, w), 20, 4), fill: grad(s, pos ? light(P.green, .38) : light(P.orange, .3), pos ? P.green : P.orange, false) }));
      s.appendChild(txt(pos ? mid + w + 7 : mid - w - 7, y + 20, (pos ? '+' : '') + dv, { 'text-anchor': pos ? 'start' : 'end', 'font-size': 11, 'font-weight': 800, fill: pos ? P.green : P.orange }));
    });
    return s;
  };

  // ---------- 十八项子维度热力网格 ----------
  C.subHeat = function (dims) {
    var cw = 150, ch = 54, W = 92 + 3 * cw, H = 34 + dims.length * ch + 26, s = svg(W, H, '十八项子维度得分');
    var CC = { low: '#E8A33D', mid: '#1157B5', high: '#0E9F6E' };
    ['子维度 1', '子维度 2', '子维度 3'].forEach(function (t, i) { s.appendChild(txt(92 + i * cw + cw / 2, 18, t, { 'text-anchor': 'middle', 'font-size': 10, 'font-weight': 700, fill: P.sub })); });
    dims.forEach(function (dm, ri) {
      var y = 28 + ri * ch;
      s.appendChild(el('path', { d: rr(0, y + 4, 5, ch - 12, 2.5), fill: dm.color }));
      s.appendChild(txt(12, y + 22, dm.name, { 'font-size': 12, 'font-weight': 800, fill: P.text }));
      s.appendChild(txt(12, y + 36, dm.pct + '%', { 'font-size': 10, fill: P.sub }));
      dm.subdims.forEach(function (sd, ci) {
        var x = 92 + ci * cw, c = CC[sd.band], w = cw - 10;
        s.appendChild(el('path', { d: rr(x, y + 4, w, ch - 12, 6), fill: light(c, .86), stroke: light(c, .6) }));
        s.appendChild(el('path', { d: rr(x, y + 4, w * sd.pct / 100, ch - 12, 6), fill: light(c, .58) }));
        s.appendChild(el('path', { d: rr(x, y + 4, 4, ch - 12, 2), fill: c }));
        s.appendChild(txt(x + 10, y + 19, trunc(sd.name, 7), { 'font-size': 11, 'font-weight': 700, fill: dark(c, .2) }));
        s.appendChild(txt(x + 10, y + 34, sd.score + ' / ' + sd.max + ' · ' + sd.bandName, { 'font-size': 9.5, fill: P.sub }));
      });
    });
    var ly = H - 8;
    [['high', '已建立'], ['mid', '基本具备'], ['low', '待加强']].forEach(function (t, i) {
      var x = 92 + i * 120;
      s.appendChild(el('rect', { x: x, y: ly - 10, width: 14, height: 10, rx: 2, fill: CC[t[0]] }));
      s.appendChild(txt(x + 20, ly, t[1], { 'font-size': 10, fill: P.sub }));
    });
    return s;
  };

  // ---------- 六维小仪表 ----------
  C.gauge6 = function (dims) {
    var cw = 96, W = dims.length * cw, H = 106, s = svg(W, H, '六维得分仪表');
    dims.forEach(function (dm, i) {
      var cx = i * cw + cw / 2, cy = 62, R = 32, sw = 8;
      var arc = function (a0, a1, r) { var x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0), x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1); return 'M' + x0 + ' ' + y0 + ' A' + r + ' ' + r + ' 0 ' + ((a1 - a0) > Math.PI ? 1 : 0) + ' 1 ' + x1 + ' ' + y1; };
      s.appendChild(el('path', { d: arc(Math.PI * 0.75, Math.PI * 2.25, R), fill: 'none', stroke: '#EBF0F7', 'stroke-width': sw, 'stroke-linecap': 'round' }));
      if (dm.band) {
        var b0 = Math.PI * 0.75 + Math.PI * 1.5 * dm.band[0] / 100, b1 = Math.PI * 0.75 + Math.PI * 1.5 * dm.band[1] / 100;
        s.appendChild(el('path', { d: arc(b0, b1, R + 7), fill: 'none', stroke: BAND, 'stroke-width': 3, 'stroke-linecap': 'round', opacity: .75 }));
      }
      s.appendChild(el('path', { d: arc(Math.PI * 0.75, Math.PI * 0.75 + Math.PI * 1.5 * dm.pct / 100, R), fill: 'none', stroke: grad(s, light(dm.color, .34), dm.color, false), 'stroke-width': sw, 'stroke-linecap': 'round' }));
      s.appendChild(txt(cx, cy + 4, dm.pct + '', { 'text-anchor': 'middle', 'font-size': 16, 'font-weight': 900, fill: dm.color }));
      s.appendChild(txt(cx, cy + 16, '%', { 'text-anchor': 'middle', 'font-size': 9, fill: P.sub }));
      s.appendChild(txt(cx, 16, dm.name, { 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 800, fill: P.text }));
      s.appendChild(txt(cx, H - 6, dm.score + ' / ' + dm.max + ' 分', { 'text-anchor': 'middle', 'font-size': 9.5, fill: P.sub }));
    });
    return s;
  };

  // ---------- 36 题作答网格 ----------
  C.answerGrid = function (answers, dims) {
    var cols = 6, cell = 26, gap = 5, LW = 56, W = LW + cols * (cell + gap) + 130, H = 26 + dims.length * (cell + gap) + 24, s = svg(W, H, '36 题作答分布');
    var SC = ['#F0D4CF', '#F3DCB4', '#AFC9EA', '#8FD9C2'];
    var SCT = ['#A5322A', '#8A6A14', '#123F86', '#0B7A55'];
    dims.forEach(function (dm, ri) {
      var y = 22 + ri * (cell + gap);
      s.appendChild(txt(0, y + 17, dm.name, { 'font-size': 11.5, 'font-weight': 800, fill: dm.color }));
      var list = answers.filter(function (a) { return a.dimension === dm.key; });
      list.forEach(function (a, ci) {
        var x = LW + ci * (cell + gap);
        s.appendChild(el('path', { d: rr(x, y, cell, cell, 5), fill: SC[a.score] }));
        s.appendChild(txt(x + cell / 2, y + 17, String(a.score), { 'text-anchor': 'middle', 'font-size': 11.5, 'font-weight': 800, fill: SCT[a.score] }));
      });
      var sum = list.reduce(function (t, a) { return t + a.score; }, 0);
      s.appendChild(txt(LW + cols * (cell + gap) + 8, y + 17, sum + ' / ' + (list.length * 3) + ' 分', { 'font-size': 11, 'font-weight': 700, fill: P.text }));
    });
    var ly = H - 6;
    [0, 1, 2, 3].forEach(function (v, i) {
      var x = LW + i * 76;
      s.appendChild(el('path', { d: rr(x, ly - 12, 16, 13, 3), fill: SC[v] }));
      s.appendChild(txt(x + 8, ly - 2, String(v), { 'text-anchor': 'middle', 'font-size': 9.5, 'font-weight': 800, fill: SCT[v] }));
      s.appendChild(txt(x + 22, ly - 2, ['尚未开始', '有想法', '已在做', '已成体系'][v], { 'font-size': 10, fill: P.sub }));
    });
    return s;
  };

  // ---------- 距下一级：逐维差距 ----------
  C.gapBars = function (gap) {
    var items = gap.items, W = 540, rowH = 36, H = items.length * rowH + 30, s = svg(W, H, '距下一级的逐维差距'), L = 66, R = 424;
    var X = function (v) { return L + (R - L) * v / 100; };
    s.appendChild(el('line', { x1: X(gap.items[0].targetPct), y1: 14, x2: X(gap.items[0].targetPct), y2: H - 16, stroke: '#C9A227', 'stroke-width': 2, 'stroke-dasharray': '5 3' }));
    s.appendChild(txt(X(gap.items[0].targetPct), 10, gap.code + ' 门槛 ' + gap.items[0].targetPct + '%', { 'text-anchor': 'middle', 'font-size': 9.5, 'font-weight': 800, fill: '#8A6A14' }));
    items.forEach(function (it, i) {
      var y = 20 + i * rowH;
      s.appendChild(txt(4, y + 18, it.name, { 'font-size': 12, 'font-weight': 800, fill: it.color }));
      s.appendChild(el('path', { d: rr(L, y + 7, R - L, 18, 4), fill: '#F2F6FB' }));
      s.appendChild(el('path', { d: rr(L, y + 7, Math.max(4, X(it.pct) - L), 18, 4), fill: grad(s, light(it.color, .34), it.color, false) }));
      if (!it.reached) {
        s.appendChild(el('path', { d: rr(X(it.pct), y + 7, Math.max(2, X(it.targetPct) - X(it.pct)), 18, 4), fill: '#C9A227', 'fill-opacity': .22 }));
        s.appendChild(txt(R + 12, y + 20, '+' + it.alloc + ' 分', { 'font-size': 11, 'font-weight': 800, fill: '#8A6A14' }));
      } else {
        s.appendChild(txt(R + 12, y + 20, '已达标', { 'font-size': 11, 'font-weight': 800, fill: P.green }));
      }
      s.appendChild(txt(L + 7, y + 20, it.pct + '%', { 'font-size': 10.5, 'font-weight': 700, fill: '#fff' }));
    });
    return s;
  };

  // ---------- 三阶段九项行动泳道 ----------
  C.actionFlow = function (roadmap, actions) {
    var W = 640, laneH = 96, H = roadmap.length * laneH + 14, s = svg(W, H, '三阶段九项行动'), LW = 96;
    var PC = [['#0E9F6E', '#0FA3C7'], ['#1157B5', '#00C2F0'], ['#8A54DC', '#C4457E']];
    roadmap.forEach(function (ph, pi) {
      var y = 8 + pi * laneH;
      s.appendChild(el('path', { d: rr(0, y, LW, laneH - 12, 8), fill: light(PC[pi][0], .88) }));
      s.appendChild(el('path', { d: rr(0, y, 5, laneH - 12, 2.5), fill: PC[pi][0] }));
      s.appendChild(txt(12, y + 26, ph.name, { 'font-size': 12.5, 'font-weight': 900, fill: dark(PC[pi][0], .12) }));
      s.appendChild(txt(12, y + 44, ph.title, { 'font-size': 11.5, 'font-weight': 700, fill: P.text }));
      var list = actions.filter(function (a) { return a.phase === ph.key; });
      var cw = (W - LW - 16) / Math.max(1, list.length);
      list.forEach(function (a, ai) {
        var x = LW + 12 + ai * cw;
        s.appendChild(el('path', { d: rr(x, y, cw - 10, laneH - 12, 8), fill: '#fff', stroke: '#E7EDF5' }));
        s.appendChild(el('path', { d: rr(x, y, cw - 10, 4, 2), fill: a.color }));
        s.appendChild(el('circle', { cx: x + 16, cy: y + 24, r: 10, fill: light(a.color, .84) }));
        s.appendChild(txt(x + 16, y + 28, String(a.order), { 'text-anchor': 'middle', 'font-size': 10.5, 'font-weight': 800, fill: dark(a.color, .15) }));
        s.appendChild(txt(x + 31, y + 22, a.dimensionName, { 'font-size': 10, 'font-weight': 700, fill: a.color }));
        s.appendChild(txt(x + 10, y + 46, trunc(a.title, 11), { 'font-size': 10.5, 'font-weight': 700, fill: P.text }));
        s.appendChild(txt(x + 10, y + 62, a.owner ? trunc(a.owner, 9) : '', { 'font-size': 9.5, fill: P.sub }));
        s.appendChild(txt(x + 10, y + 76, a.weeks + ' 周 · ' + a.cost + '投入', { 'font-size': 9.5, fill: P.sub }));
      });
      if (pi < roadmap.length - 1) s.appendChild(el('path', { d: 'M' + (LW / 2) + ' ' + (y + laneH - 12) + 'v7m-4 -3l4 4l4 -4', fill: 'none', stroke: P.gray, 'stroke-width': 1.6, 'stroke-linecap': 'round' }));
    });
    return s;
  };

  // ---------- 同行分布曲线 ----------
  C.distCurve = function (mean, sd, x, pctl, industryName) {
    var W = 540, H = 224, L = 40, R = 512, B = 176, s = svg(W, H, '同行分布'), T = 26;
    var f = function (v) { return Math.exp(-Math.pow(v - mean, 2) / (2 * sd * sd)); };
    var X = function (v) { return L + (R - L) * v / 100; }, Y = function (v) { return B - (B - T) * v; };
    var pts = [], fill = [X(0) + ' ' + B];
    for (var v = 0; v <= 100; v += 1.5) { var yy = Y(f(v)); pts.push(X(v) + ' ' + yy); }
    for (var v2 = 0; v2 <= x; v2 += 1.5) fill.push(X(v2) + ' ' + Y(f(v2)));
    fill.push(X(x) + ' ' + B);
    s.appendChild(el('path', { d: 'M' + fill.join('L') + 'Z', fill: grad(s, 'rgba(15,163,199,.30)', 'rgba(15,163,199,.05)', true) }));
    s.appendChild(el('path', { d: 'M' + pts.join('L'), fill: 'none', stroke: P.blue, 'stroke-width': 2.2 }));
    s.appendChild(el('line', { x1: L, y1: B, x2: R, y2: B, stroke: P.line }));
    [0, 25, 50, 75, 100].forEach(function (g) { s.appendChild(txt(X(g), B + 16, g + '%', { 'text-anchor': 'middle', 'font-size': 10, fill: P.sub })); });
    s.appendChild(el('line', { x1: X(mean), y1: T - 4, x2: X(mean), y2: B, stroke: '#7E8DA4', 'stroke-dasharray': '4 3' }));
    s.appendChild(txt(X(mean), T - 8, '同行均值 ' + mean + '%', { 'text-anchor': 'middle', 'font-size': 10, fill: '#5E6D84' }));
    s.appendChild(el('line', { x1: X(x), y1: T - 4, x2: X(x), y2: B, stroke: P.navy, 'stroke-width': 2 }));
    s.appendChild(el('circle', { cx: X(x), cy: Y(f(x)), r: 5.5, fill: P.navy, stroke: '#fff', 'stroke-width': 2 }));
    var bx = Math.min(R - 96, Math.max(L, X(x) - 48));
    s.appendChild(el('path', { d: rr(bx, B + 24, 96, 24, 6), fill: P.navy }));
    s.appendChild(txt(bx + 48, B + 40, '本企业 ' + x + '%', { 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 800, fill: '#fff' }));
    s.appendChild(txt(L, H - 4, '阴影为得分低于本企业的同行' + (pctl != null ? '，约 ' + pctl + '%' : '') + (industryName ? '（' + industryName + '同规模）' : ''), { 'font-size': 9.5, fill: P.sub }));
    return s;
  };

  window.DGG = window.DGG || {}; window.DGG.charts = C;
})();
