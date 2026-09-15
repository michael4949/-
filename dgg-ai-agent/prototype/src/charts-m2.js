/* 报告图表库 · 模块 2 专用 · 内联 SVG，无外部依赖
 * cover2 封面主视觉 · bubbleMatrix 价值门槛气泡矩阵 · sankey 痛点→场景→模块 · heatmap 数据就绪度
 * funnel 筛选漏斗 · gantt 12 月排期 · axisStack 四维贡献条 · waterfall 得分瀑布 · radarCompare 四维对比
 * painBars 痛点分组 · painBubbles 痛点严重度 · dial 综合分仪表 · ladder 三步走阶梯 · depArc 数据依赖
 * 色板分域：四维轴 #E0635C/#1157B5/#0E9F6E/#C9A227，痛点四组 #8A54DC/#0FA3C7/#C4457E/#FF8A3D，两组不同图
 * 模块名一律中性底色直接标注，不做颜色编码
 */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var C = (window.DGG && window.DGG.charts) || {};
  var P = C.P || {};
  var gid2 = 0;
  function el(t, a, k) { var e = document.createElementNS(NS, t); Object.keys(a || {}).forEach(function (x) { e.setAttribute(x, a[x]); }); (k || []).forEach(function (c) { if (c) e.appendChild(c); }); return e; }
  function txt(x, y, s, a) { var o = { x: x, y: y, 'font-size': 12, fill: P.text }; Object.keys(a || {}).forEach(function (k) { o[k] = a[k]; }); var t = el('text', o); t.textContent = s; return t; }
  function svg(w, h, label) { return el('svg', { viewBox: '0 0 ' + w + ' ' + h, width: '100%', role: 'img', 'aria-label': label || '', style: 'font-family:inherit;display:block' }); }
  function grad(s, c1, c2, vertical) {
    var id = 'm2g' + (++gid2);
    var defs = s.querySelector('defs') || s.insertBefore(el('defs'), s.firstChild);
    var g = el('linearGradient', vertical ? { id: id, x1: 0, y1: 0, x2: 0, y2: 1 } : { id: id, x1: 0, y1: 0, x2: 1, y2: 0 });
    g.appendChild(el('stop', { offset: '0%', 'stop-color': c1 })); g.appendChild(el('stop', { offset: '100%', 'stop-color': c2 }));
    defs.appendChild(g); return 'url(#' + id + ')';
  }
  function light(hex, k) { var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; var f = function (c) { return Math.round(c + (255 - c) * k); }; return '#' + ((1 << 24) + (f(r) << 16) + (f(g) << 8) + f(b)).toString(16).slice(1); }
  function trunc(s, n) { s = String(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
  function rr(x, y, w, h, r) { r = Math.min(r, h / 2, w / 2); return 'M' + (x + r) + ' ' + y + 'h' + (w - 2 * r) + 'a' + r + ' ' + r + ' 0 0 1 ' + r + ' ' + r + 'v' + (h - 2 * r) + 'a' + r + ' ' + r + ' 0 0 1 ' + (-r) + ' ' + r + 'h' + (-(w - 2 * r)) + 'a' + r + ' ' + r + ' 0 0 1 ' + (-r) + ' ' + (-r) + 'v' + (-(h - 2 * r)) + 'a' + r + ' ' + r + ' 0 0 1 ' + r + ' ' + (-r) + 'z'; }
  var COST_R = { '零': 9, '轻': 12, '中': 16, '重': 20 };
  var OK = '#0E9F6E', NEED = '#E8A33D', NONE = '#E3E9F3';

  // ---------- 封面主视觉：排序阶梯 + 候选场景气泡场 ----------
  C.cover2 = function (scenes, seed) {
    var W = 1000, H = 520, s = svg(W, H, '封面主视觉');
    s.appendChild(el('rect', { x: 0, y: 0, width: W, height: H, fill: grad(s, '#061A3C', '#0A2A5E', false) }));
    var d = s.querySelector('defs') || s.insertBefore(el('defs', {}), s.firstChild);
    var pat = el('pattern', { id: 'm2grid', width: 40, height: 40, patternUnits: 'userSpaceOnUse' });
    pat.appendChild(el('path', { d: 'M40 0H0V40', fill: 'none', stroke: 'rgba(120,180,255,.10)', 'stroke-width': 1 }));
    d.appendChild(pat);
    s.appendChild(el('rect', { x: 0, y: 0, width: W, height: H, fill: 'url(#m2grid)' }));
    // 候选场景气泡场：按得分决定亮度与大小
    var rnd = (function (x) { return function () { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648; }; })(seed || 7);
    scenes.forEach(function (sc, i) {
      var x = 90 + rnd() * 820, y = 70 + rnd() * 380, r = 5 + sc.score / 100 * 16, top = sc.rank <= 3;
      s.appendChild(el('circle', { cx: x, cy: y, r: r, fill: top ? 'rgba(0,194,240,.55)' : 'rgba(120,170,235,.16)', stroke: top ? '#7FE4FF' : 'rgba(150,195,250,.30)', 'stroke-width': top ? 1.6 : 1 }));
      if (top) s.appendChild(el('circle', { cx: x, cy: y, r: r + 7, fill: 'none', stroke: 'rgba(0,194,240,.35)', 'stroke-width': 1 }));
    });
    // 排序阶梯（前三名）
    var bx = 92, by = 430, bw = 74;
    scenes.slice(0, 3).forEach(function (sc, i) {
      var hh = 96 - i * 26, x = bx + i * (bw + 16);
      s.appendChild(el('path', { d: rr(x, by - hh, bw, hh, 8), fill: grad(s, i === 0 ? '#00C2F0' : 'rgba(110,170,240,.55)', i === 0 ? '#1157B5' : 'rgba(60,110,190,.45)', true) }));
      s.appendChild(txt(x + bw / 2, by - hh - 10, 'No.' + (i + 1), { 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 800, fill: i === 0 ? '#7FE4FF' : 'rgba(210,230,255,.85)' }));
      s.appendChild(txt(x + bw / 2, by + 18, trunc(sc.name, 6), { 'text-anchor': 'middle', 'font-size': 11, fill: 'rgba(214,232,255,.9)' }));
    });
    s.appendChild(el('line', { x1: 80, y1: by, x2: 360, y2: by, stroke: 'rgba(150,195,250,.35)' }));
    return s;
  };

  // ---------- 价值 × 实施门槛 气泡矩阵：大小=投入档，描边=数据条件 ----------
  C.bubbleMatrix = function (scenes, compact) {
    var W = compact ? 420 : 580, H = compact ? 366 : 520, L = compact ? 40 : 64, R = compact ? 400 : 552, T = compact ? 26 : 34, B = compact ? 300 : 404;
    var s = svg(W, H, '场景价值与实施门槛矩阵');
    var X = function (v) { return L + (R - L) * (v - 0.5) / 5; }, Y = function (v) { return B - (B - T) * (v - 0.5) / 5; };
    var mx = (L + R) / 2, my = (T + B) / 2;
    s.appendChild(el('rect', { x: L, y: T, width: mx - L, height: my - T, fill: 'rgba(14,159,110,.09)' }));
    s.appendChild(el('rect', { x: mx, y: T, width: R - mx, height: my - T, fill: 'rgba(17,87,181,.07)' }));
    s.appendChild(el('rect', { x: L, y: my, width: mx - L, height: B - my, fill: 'rgba(255,138,61,.09)' }));
    s.appendChild(el('rect', { x: mx, y: my, width: R - mx, height: B - my, fill: 'rgba(145,159,183,.09)' }));
    var qf = compact ? 10 : 11;
    s.appendChild(txt(L + 8, T + 15, compact ? '先做' : '先做 · 价值高 门槛低', { 'font-size': qf, 'font-weight': 800, fill: OK }));
    s.appendChild(txt(R - 8, T + 15, compact ? '规划' : '规划 · 价值高 门槛高', { 'text-anchor': 'end', 'font-size': qf, 'font-weight': 800, fill: P.blue }));
    s.appendChild(txt(L + 8, B - 8, compact ? '顺带' : '顺带 · 价值一般 门槛低', { 'font-size': qf, 'font-weight': 800, fill: P.orange }));
    s.appendChild(txt(R - 8, B - 8, compact ? '暂缓' : '暂缓 · 价值一般 门槛高', { 'text-anchor': 'end', 'font-size': qf, 'font-weight': 800, fill: P.gray }));
    s.appendChild(el('line', { x1: L, y1: B, x2: R, y2: B, stroke: P.line }));
    s.appendChild(el('line', { x1: L, y1: T, x2: L, y2: B, stroke: P.line }));
    for (var i = 1; i <= 5; i++) {
      s.appendChild(txt(X(i), B + 16, String(i), { 'text-anchor': 'middle', 'font-size': 10, fill: P.sub }));
      s.appendChild(txt(L - 10, Y(i) + 4, String(i), { 'text-anchor': 'end', 'font-size': 10, fill: P.sub }));
    }
    s.appendChild(txt(mx, B + 34, '实施门槛 →', { 'text-anchor': 'middle', 'font-size': 11, fill: P.sub }));
    s.appendChild(txt(16, my, '业务价值 →', { 'text-anchor': 'middle', 'font-size': 11, fill: P.sub, transform: 'rotate(-90 16 ' + my + ')' }));
    var seen = {}, marks = [];
    // 四角象限标题先占位，标签不得压到它们
    var placed = [
      { x1: L, y1: T, x2: L + 150, y2: T + 22 }, { x1: R - 150, y1: T, x2: R, y2: T + 22 },
      { x1: L, y1: B - 22, x2: L + 160, y2: B }, { x1: R - 160, y1: B - 22, x2: R, y2: B }
    ];
    scenes.forEach(function (sc) {
      var k = Math.round(sc.axis.barrier) + '-' + sc.value; seen[k] = (seen[k] || 0) + 1;
      var off = (seen[k] - 1) * 26;
      var x = X(sc.axis.barrier) + off * 0.8, y = Y(sc.value) - off * 0.55;
      var r = (COST_R[sc.cost] || 12) * (compact ? 0.92 : 1), top = sc.rank <= 3;
      s.appendChild(el('circle', { cx: x, cy: y, r: r, fill: sc.blocked ? '#fff' : grad(s, light(P.blue, top ? .15 : .55), top ? P.blue : light(P.blue, .35), true),
        stroke: sc.blocked ? NEED : '#fff', 'stroke-width': 2, 'stroke-dasharray': sc.blocked ? '4 3' : '' }));
      s.appendChild(txt(x, y + (compact ? 5 : 4), String(sc.rank), { 'text-anchor': 'middle', 'font-size': compact ? 14 : 11, 'font-weight': 800, fill: sc.blocked ? NEED : '#fff' }));
      marks.push({ sc: sc, x: x, y: y, r: r, top: top });
      placed.push({ x1: x - r, y1: y - r, x2: x + r, y2: y + r });
    });
    // 标签防重叠：右 → 左 → 下 → 上，逐个试位；都不行就压在气泡下方并下移
    function hits(b) { return placed.some(function (a) { return !(b.x2 < a.x1 || b.x1 > a.x2 || b.y2 < a.y1 || b.y1 > a.y2); }); }
    if (!compact) marks.forEach(function (m) {
      var label = trunc(m.sc.name, 9), w = label.length * 11.2, hh = 13;
      var cands = [
        { x: m.x + m.r + 5, y: m.y + 4, a: 'start' },
        { x: m.x - m.r - 5, y: m.y + 4, a: 'end' },
        { x: m.x, y: m.y + m.r + 14, a: 'middle' },
        { x: m.x, y: m.y - m.r - 6, a: 'middle' },
        { x: m.x + m.r + 5, y: m.y + 18, a: 'start' },
        { x: m.x - m.r - 5, y: m.y + 18, a: 'end' }
      ];
      var pick = null;
      for (var i = 0; i < cands.length && !pick; i++) {
        var c = cands[i];
        var x1 = c.a === 'start' ? c.x : c.a === 'end' ? c.x - w : c.x - w / 2;
        var box = { x1: x1, y1: c.y - hh, x2: x1 + w, y2: c.y + 3 };
        if (box.x1 >= 4 && box.x2 <= W - 6 && box.y1 >= T + 2 && box.y2 <= B - 2 && !hits(box)) pick = { c: c, box: box };
      }
      if (!pick) { var c0 = cands[2], x0 = c0.x - w / 2; pick = { c: c0, box: { x1: x0, y1: c0.y - hh, x2: x0 + w, y2: c0.y + 3 } }; }
      placed.push(pick.box);
      s.appendChild(txt(pick.c.x, pick.c.y, label, { 'text-anchor': pick.c.a, 'font-size': 11, 'font-weight': m.top ? 700 : 500, fill: m.top ? P.text : P.sub }));
    });
    var ly = B + (compact ? 44 : 56);
    s.appendChild(txt(L, ly, '气泡大小 = 投入档', { 'font-size': compact ? 12 : 11, 'font-weight': 700, fill: P.text }));
    ['零', '轻', '中', '重'].forEach(function (c, i) {
      var cx = L + (compact ? 116 : 118) + i * (compact ? 50 : 54);
      s.appendChild(el('circle', { cx: cx, cy: ly - 4, r: COST_R[c] * (compact ? 0.82 : 1), fill: 'none', stroke: P.line, 'stroke-width': 1.5 }));
      s.appendChild(txt(cx, ly - 1, c, { 'text-anchor': 'middle', 'font-size': compact ? 11 : 10, fill: P.sub }));
    });
    var ly2 = B + (compact ? 68 : 86);
    s.appendChild(el('circle', { cx: L + 9, cy: ly2 - 4, r: 9, fill: '#fff', stroke: NEED, 'stroke-width': 2, 'stroke-dasharray': '4 3' }));
    s.appendChild(txt(L + 24, ly2, compact ? '虚线圈 = 关键数据源缺失' : '虚线圈 = 关键数据源缺失，补齐后重新评估', { 'font-size': compact ? 12 : 11, fill: P.sub }));
    return s;
  };

  // ---------- 痛点组 → 场景 → 模块 ----------
  C.sankey = function (sk) {
    var rows = sk.scenes.length, H = Math.max(260, 54 + rows * 40), W = 620, s = svg(W, H, '痛点与场景对应关系');
    var LX = 4, LW = 104, MX = 200, MW = 210, RX = 452, RW = 164;
    var gh = Math.min(64, (H - 54) / Math.max(1, sk.groups.length) - 10);
    var gy = {}, top = 44;
    sk.groups.forEach(function (g, i) {
      var y = top + i * (gh + 12);
      gy[g.key] = y + gh / 2;
      s.appendChild(el('path', { d: rr(LX, y, LW, gh, 6), fill: light(g.color, .82), stroke: g.color, 'stroke-width': 1.5 }));
      s.appendChild(txt(LX + LW / 2, y + gh / 2 - 3, g.name, { 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, fill: P.text }));
      s.appendChild(txt(LX + LW / 2, y + gh / 2 + 13, g.count + ' 项 · 严重度 ' + g.severity, { 'text-anchor': 'middle', 'font-size': 10, fill: P.sub }));
    });
    var colorOf = {}; sk.groups.forEach(function (g) { colorOf[g.key] = g.color; });
    var sy = {};
    sk.scenes.forEach(function (sc, i) { sy[sc.id] = top + i * 40 + 14; });
    sk.links.forEach(function (lk) {
      var y2 = sy[lk.scene];
      lk.groups.forEach(function (gk) {
        if (gy[gk] == null) return;
        var y1 = gy[gk], c = colorOf[gk] || P.gray;
        var x1 = LX + LW, x2 = MX;
        s.appendChild(el('path', { d: 'M' + x1 + ' ' + y1 + 'C' + (x1 + 48) + ' ' + y1 + ',' + (x2 - 48) + ' ' + y2 + ',' + x2 + ' ' + y2,
          fill: 'none', stroke: c, 'stroke-width': Math.max(2, lk.weight / 22), opacity: .42, 'stroke-linecap': 'round' }));
      });
    });
    sk.scenes.forEach(function (sc) {
      var y = sy[sc.id] - 14;
      s.appendChild(el('path', { d: rr(MX, y, MW, 28, 5), fill: '#fff', stroke: P.line }));
      s.appendChild(el('path', { d: rr(MX, y, 4, 28, 2), fill: sc.rank <= 3 ? P.blue : P.gray }));
      s.appendChild(txt(MX + 12, y + 18, trunc(sc.rank + '. ' + sc.name, 13), { 'font-size': 11, 'font-weight': sc.rank <= 3 ? 700 : 500, fill: P.text }));
      s.appendChild(txt(MX + MW - 8, y + 18, sc.score.toFixed(1), { 'text-anchor': 'end', 'font-size': 11, 'font-weight': 800, fill: P.blue }));
      var my2 = y + 14;
      s.appendChild(el('path', { d: 'M' + (MX + MW) + ' ' + my2 + 'C' + (MX + MW + 30) + ' ' + my2 + ',' + (RX - 30) + ' ' + my2 + ',' + RX + ' ' + my2,
        fill: 'none', stroke: P.line, 'stroke-width': 2 }));
      s.appendChild(el('path', { d: rr(RX, y + 1, RW, 26, 5), fill: P.bg, stroke: P.line }));
      s.appendChild(txt(RX + RW / 2, y + 18, sc.module, { 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, fill: P.navy }));
    });
    s.appendChild(txt(LX + LW / 2, 22, '勾选的痛点', { 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 800, fill: P.sub }));
    s.appendChild(txt(MX + MW / 2, 22, '匹配到的场景', { 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 800, fill: P.sub }));
    s.appendChild(txt(RX + RW / 2, 22, '对应模块', { 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 800, fill: P.sub }));
    return s;
  };

  // ---------- 数据就绪度热力图：0 不需要 / 1 需要但缺 / 2 需要且已有 ----------
  C.heatmap = function (rows, systems) {
    var LW = 152, cw = 54, ch = 25, W = LW + systems.length * cw + 8, H = 40 + rows.length * ch + 34;
    var s = svg(W, H, '场景与数据源就绪度');
    var shortOf = function (n) { var t = String(n).split('/')[0].trim(); return t.length > 4 ? t.slice(0, 4) : t; };
    systems.forEach(function (sys, i) {
      var x = LW + i * cw + cw / 2;
      s.appendChild(txt(x, 22, shortOf(sys.name), { 'text-anchor': 'middle', 'font-size': 11, fill: sys.has ? P.text : P.sub, 'font-weight': sys.has ? 700 : 400 }));
      if (!sys.has) s.appendChild(txt(x, 33, '暂无', { 'text-anchor': 'middle', 'font-size': 9, fill: NEED }));
    });
    rows.forEach(function (r, ri) {
      var y = 38 + ri * ch;
      if (ri % 2 === 0) s.appendChild(el('rect', { x: 0, y: y, width: W, height: ch, fill: 'rgba(238,243,250,.55)' }));
      s.appendChild(txt(4, y + 17, trunc(r.rank + '. ' + r.name, 13), { 'font-size': 11, fill: r.rank <= 3 ? P.text : P.sub, 'font-weight': r.rank <= 3 ? 700 : 400 }));
      r.cells.forEach(function (v, ci) {
        var x = LW + ci * cw;
        s.appendChild(el('path', { d: rr(x + 3, y + 3, cw - 6, ch - 6, 4), fill: v === 2 ? OK : v === 1 ? light(NEED, .1) : NONE, opacity: v ? 1 : .55 }));
        if (v) s.appendChild(txt(x + cw / 2, y + 17, v === 2 ? '✓' : '补', { 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 800, fill: '#fff' }));
      });
    });
    var ly = 38 + rows.length * ch + 22;
    [[OK, '✓', '需要且已具备'], [light(NEED, .1), '补', '需要但缺失'], [NONE, '', '该场景不需要']].forEach(function (t, i) {
      var x = 4 + i * 132;
      s.appendChild(el('path', { d: rr(x, ly - 12, 16, 16, 4), fill: t[0] }));
      if (t[1]) s.appendChild(txt(x + 8, ly, t[1], { 'text-anchor': 'middle', 'font-size': 10, 'font-weight': 800, fill: '#fff' }));
      s.appendChild(txt(x + 22, ly, t[2], { 'font-size': 11, fill: P.sub }));
    });
    return s;
  };

  // ---------- 筛选漏斗 ----------
  C.funnel = function (steps) {
    var W = 560, rowH = 52, H = steps.length * rowH + 16, s = svg(W, H, '场景筛选过程');
    var maxV = Math.max.apply(null, steps.map(function (x) { return x.count; })) || 1;
    var LW = 470;
    steps.forEach(function (st, i) {
      var y = 8 + i * rowH, w = Math.max(74, LW * st.count / maxV), x = (LW - w) / 2 + 6;
      var k = i / Math.max(1, steps.length - 1);
      var c1 = '#9EC2EB', c2 = '#0A2A5E';
      s.appendChild(el('path', { d: rr(x, y, w, rowH - 12, 6), fill: grad(s, light(c2, .62 - k * .42), light(c2, .34 - k * .34), false) }));
      s.appendChild(txt(x + 12, y + 26, st.label, { 'font-size': 12, 'font-weight': 700, fill: '#fff' }));
      s.appendChild(txt(x + w - 12, y + 26, st.count + ' 个', { 'text-anchor': 'end', 'font-size': 13, 'font-weight': 800, fill: '#fff' }));
      s.appendChild(txt(LW + 18, y + 26, st.note, { 'font-size': 10, fill: P.sub }));
      if (i < steps.length - 1) s.appendChild(el('path', { d: 'M' + (LW / 2 + 6) + ' ' + (y + rowH - 11) + 'l5 7l-10 0z', fill: P.line }));
    });
    return s;
  };

  // ---------- 12 个月排期甘特 ----------
  C.gantt = function (phases) {
    var W = 620, L = 132, R = 606, rows = phases.reduce(function (t, p) { return t + p.bars.length; }, 0);
    var H = 58 + rows * 34 + phases.length * 26, s = svg(W, H, '12 个月排期');
    var X = function (m) { return L + (R - L) * (m - 1) / 12; };
    for (var m = 1; m <= 13; m++) {
      s.appendChild(el('line', { x1: X(m), y1: 34, x2: X(m), y2: H - 18, stroke: m % 3 === 1 ? P.line : '#EFF3F9' }));
      if (m <= 12) s.appendChild(txt(X(m) + (X(2) - X(1)) / 2, 26, m + '月', { 'text-anchor': 'middle', 'font-size': 10, fill: P.sub }));
    }
    var PC = { p1: OK, p2: P.blue, p3: P.purple };
    var y = 44;
    phases.forEach(function (ph) {
      s.appendChild(el('path', { d: rr(4, y, 124, 20, 4), fill: light(PC[ph.key], .84) }));
      s.appendChild(txt(10, y + 14, ph.name + ' · ' + ph.title, { 'font-size': 11, 'font-weight': 800, fill: P.text }));
      var x0 = X(ph.months[0]), x1 = X(ph.months[1] + 1);
      s.appendChild(el('path', { d: rr(x0, y, x1 - x0, 20, 4), fill: light(PC[ph.key], .9) }));
      s.appendChild(txt((x0 + x1) / 2, y + 14, '第 ' + ph.months[0] + '–' + ph.months[1] + ' 个月', { 'text-anchor': 'middle', 'font-size': 10, 'font-weight': 700, fill: PC[ph.key] }));
      y += 26;
      ph.bars.forEach(function (b) {
        var months = Math.max(1, Math.round(b.weeks / 4.34));
        var bx = X(ph.months[0]), bw = Math.min(X(ph.months[1] + 1), X(ph.months[0] + months)) - bx;
        s.appendChild(txt(126, y + 15, trunc(b.name, 9), { 'text-anchor': 'end', 'font-size': 11, fill: P.text }));
        var bwr = Math.max(24, bw), lab = b.weeks + ' 周 · ' + b.cost, inside = bwr >= lab.length * 9 + 14;
        s.appendChild(el('path', { d: rr(bx, y + 3, bwr, 18, 4), fill: b.blocked ? '#fff' : grad(s, light(PC[ph.key], .35), PC[ph.key], false), stroke: b.blocked ? NEED : 'none', 'stroke-width': b.blocked ? 1.6 : 0, 'stroke-dasharray': b.blocked ? '4 3' : '' }));
        var lx = inside ? bx + 8 : bx + bwr + 6;
        s.appendChild(txt(lx, y + 16, lab, { 'font-size': 10, 'font-weight': 700, fill: inside && !b.blocked ? '#fff' : (b.blocked ? NEED : P.text) }));
        var mx2 = (inside ? bx + bwr : lx + lab.length * 9) + 8;
        var over = mx2 + b.module.length * 10 > W - 4;
        s.appendChild(txt(over ? W - 4 : mx2, y + 16, b.module, { 'text-anchor': over ? 'end' : 'start', 'font-size': 10, fill: P.sub }));
        y += 34;
      });
    });
    return s;
  };

  // ---------- 四维贡献堆叠条（排序表配图） ----------
  C.axisStack = function (list, axes, maxScore) {
    var W = 560, rowH = 30, H = list.length * rowH + 34, s = svg(W, H, '各场景四维得分构成');
    var L = 148, R = 512, max = maxScore || 100;
    list.forEach(function (it, i) {
      var y = 24 + i * rowH, x = L;
      s.appendChild(txt(4, y + 15, trunc(it.rank + '. ' + it.name, 13), { 'font-size': 11, 'font-weight': it.rank <= 3 ? 700 : 400, fill: it.rank <= 3 ? P.text : P.sub }));
      axes.forEach(function (a) {
        var w = (R - L) * (it.contrib[a.key] / max);
        if (w > 0.5) {
          s.appendChild(el('rect', { x: x, y: y + 5, width: Math.max(1, w - 2), height: 16, fill: a.color, rx: 2 }));
          if (w > 30) s.appendChild(txt(x + w / 2 - 1, y + 17, it.contrib[a.key].toFixed(0), { 'text-anchor': 'middle', 'font-size': 9, 'font-weight': 700, fill: '#fff' }));
        }
        x += w;
      });
      s.appendChild(txt(R + 8, y + 17, it.score.toFixed(1), { 'font-size': 12, 'font-weight': 800, fill: P.navy }));
    });
    axes.forEach(function (a, i) {
      var x = L + i * 92;
      s.appendChild(el('rect', { x: x, y: 4, width: 10, height: 10, fill: a.color, rx: 2 }));
      s.appendChild(txt(x + 15, 13, a.name, { 'font-size': 10, fill: P.sub }));
    });
    return s;
  };

  // ---------- 得分瀑布：四维如何累加成总分 ----------
  C.waterfall = function (contrib, axes, total) {
    var W = 520, H = 250, L = 46, B = 196, s = svg(W, H, '综合得分构成'), max = 100;
    var Y = function (v) { return B - (B - 26) * v / max; };
    for (var g = 0; g <= 100; g += 25) {
      s.appendChild(el('line', { x1: L, y1: Y(g), x2: W - 74, y2: Y(g), stroke: '#EFF3F9' }));
      s.appendChild(txt(L - 8, Y(g) + 4, String(g), { 'text-anchor': 'end', 'font-size': 10, fill: P.sub }));
    }
    var x = L + 10, bw = 74, acc = 0;
    axes.forEach(function (a) {
      var v = contrib[a.key], y0 = Y(acc), y1 = Y(acc + v);
      s.appendChild(el('path', { d: rr(x, y1, bw, Math.max(3, y0 - y1), 4), fill: a.color }));
      s.appendChild(txt(x + bw / 2, y1 - 6, '+' + v.toFixed(1), { 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 800, fill: a.color }));
      s.appendChild(txt(x + bw / 2, B + 16, a.name, { 'text-anchor': 'middle', 'font-size': 10, fill: P.sub }));
      s.appendChild(txt(x + bw / 2, B + 30, Math.round(a.weight * 100) + '%', { 'text-anchor': 'middle', 'font-size': 10, 'font-weight': 700, fill: P.text }));
      acc += v;
      if (a !== axes[axes.length - 1]) s.appendChild(el('line', { x1: x + bw, y1: y1, x2: x + bw + 22, y2: y1, stroke: P.line, 'stroke-dasharray': '3 3' }));
      x += bw + 22;
    });
    var ty = Y(total);
    s.appendChild(el('path', { d: rr(x, ty, bw, B - ty, 4), fill: grad(s, P.blue, P.navy, true) }));
    s.appendChild(txt(x + bw / 2, ty - 6, total.toFixed(1), { 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 800, fill: P.navy }));
    s.appendChild(txt(x + bw / 2, B + 16, '综合得分', { 'text-anchor': 'middle', 'font-size': 10, 'font-weight': 700, fill: P.text }));
    s.appendChild(el('line', { x1: L, y1: B, x2: W - 10, y2: B, stroke: P.line }));
    return s;
  };

  // ---------- 四维雷达对比（至多 3 个场景） ----------
  C.radarCompare = function (list, axes) {
    var W = 420, H = 330, cx = 210, cy = 158, R = 104, n = axes.length, s = svg(W, H, '前三个场景四维对比');
    var COLORS = [P.blue, OK, P.purple], DASH = ['', '5 3', '2 3'];
    var pt = function (i, v) { var a = -Math.PI / 2 + i * 2 * Math.PI / n, r = R * v / 5; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
    [1, 2, 3, 4, 5].forEach(function (g) {
      var d = axes.map(function (_, i) { return pt(i, g).join(' '); }).join(' L');
      s.appendChild(el('path', { d: 'M' + d + ' Z', fill: g === 5 ? '#FBFDFF' : 'none', stroke: '#E3E9F3' }));
    });
    axes.forEach(function (a, i) {
      var p = pt(i, 5.06);
      s.appendChild(el('line', { x1: cx, y1: cy, x2: p[0], y2: p[1], stroke: '#E9EEF6' }));
      var lp = pt(i, 5.5), anchor = Math.abs(lp[0] - cx) < 6 ? 'middle' : (lp[0] > cx ? 'start' : 'end');
      s.appendChild(txt(lp[0], lp[1] + 4, a.name, { 'text-anchor': anchor, 'font-size': 11, 'font-weight': 700, fill: a.color }));
    });
    list.slice(0, 3).forEach(function (it, k) {
      var d = axes.map(function (a, i) { return pt(i, a.invert ? 6 - it.axis[a.key] : it.axis[a.key]).join(' '); }).join(' L');
      s.appendChild(el('path', { d: 'M' + d + ' Z', fill: COLORS[k], 'fill-opacity': .10, stroke: COLORS[k], 'stroke-width': 2, 'stroke-dasharray': DASH[k] }));
      axes.forEach(function (a, i) { var p = pt(i, a.invert ? 6 - it.axis[a.key] : it.axis[a.key]); s.appendChild(el('circle', { cx: p[0], cy: p[1], r: 3.4, fill: COLORS[k], stroke: '#fff', 'stroke-width': 1.5 })); });
    });
    list.slice(0, 3).forEach(function (it, k) {
      var y = 282 + k * 16;
      s.appendChild(el('line', { x1: 14, y1: y - 4, x2: 34, y2: y - 4, stroke: COLORS[k], 'stroke-width': 2.4, 'stroke-dasharray': DASH[k] }));
      s.appendChild(txt(40, y, it.rank + '. ' + trunc(it.name, 12) + '（' + it.score.toFixed(0) + ' 分）', { 'font-size': 11, fill: P.text }));
    });
    s.appendChild(txt(cx, H - 4, '实施门槛按（6 − 门槛）作图，四角越外越有利', { 'text-anchor': 'middle', 'font-size': 10, fill: P.sub }));
    return s;
  };

  // ---------- 痛点分组横条 ----------
  C.painBars = function (groups) {
    var W = 520, rowH = 44, H = groups.length * rowH + 8, s = svg(W, H, '痛点分布'), L = 110, R = 448;
    var max = Math.max.apply(null, groups.map(function (g) { return g.severity; })) || 1;
    groups.forEach(function (g, i) {
      var y = 6 + i * rowH;
      s.appendChild(txt(4, y + 20, g.name, { 'font-size': 12, 'font-weight': 700, fill: P.text }));
      s.appendChild(txt(4, y + 34, g.count + ' 项', { 'font-size': 10, fill: P.sub }));
      var w = (R - L) * g.severity / max;
      s.appendChild(el('path', { d: rr(L, y + 8, Math.max(3, w), 22, 4), fill: grad(s, light(g.color, .34), g.color, false) }));
      if (g.severity) s.appendChild(txt(L + w + 8, y + 24, '严重度 ' + g.severity + ' · 占 ' + g.pct + '%', { 'font-size': 11, 'font-weight': 700, fill: g.color }));
      else s.appendChild(txt(L + 8, y + 24, '本次未勾选', { 'font-size': 11, fill: P.sub }));
    });
    return s;
  };

  // ---------- 痛点严重度气泡 ----------
  C.painBubbles = function (pains) {
    var cols = 3, rowH = 74, rows = Math.ceil(pains.length / cols), W = 560, H = rows * rowH + 8, s = svg(W, H, '所选痛点与严重度');
    pains.forEach(function (p, i) {
      var cx = 46 + (i % cols) * 180, cy = 34 + Math.floor(i / cols) * rowH;
      var r = 14 + p.severity * 3.6;
      s.appendChild(el('circle', { cx: cx, cy: cy, r: r, fill: light(p.color, .84), stroke: p.color, 'stroke-width': 2 }));
      s.appendChild(txt(cx, cy + 5, String(p.severity), { 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 800, fill: p.color }));
      s.appendChild(txt(cx + r + 8, cy - 2, p.tag, { 'font-size': 11, 'font-weight': 700, fill: P.text }));
      s.appendChild(txt(cx + r + 8, cy + 13, trunc(p.severityName, 7), { 'font-size': 10, fill: P.sub }));
    });
    return s;
  };

  // ---------- 综合分半环仪表 ----------
  C.dial = function (score, label, sub) {
    var W = 230, H = 156, cx = 115, cy = 118, R = 88, sw = 17, s = svg(W, H, '综合得分');
    var arc = function (a0, a1, r) {
      var x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0), x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
      return 'M' + x0 + ' ' + y0 + ' A' + r + ' ' + r + ' 0 ' + ((a1 - a0) > Math.PI ? 1 : 0) + ' 1 ' + x1 + ' ' + y1;
    };
    s.appendChild(el('path', { d: arc(Math.PI, 2 * Math.PI, R), fill: 'none', stroke: '#E9EEF6', 'stroke-width': sw, 'stroke-linecap': 'round' }));
    var a1 = Math.PI + Math.PI * Math.max(0, Math.min(100, score)) / 100;
    s.appendChild(el('path', { d: arc(Math.PI, a1, R), fill: 'none', stroke: grad(s, P.cyan, P.blue, false), 'stroke-width': sw, 'stroke-linecap': 'round' }));
    s.appendChild(txt(cx - R, cy + 16, '0', { 'text-anchor': 'middle', 'font-size': 10, fill: P.sub }));
    s.appendChild(txt(cx + R, cy + 16, '100', { 'text-anchor': 'middle', 'font-size': 10, fill: P.sub }));
    s.appendChild(txt(cx, cy - 16, score.toFixed(1), { 'text-anchor': 'middle', 'font-size': 32, 'font-weight': 800, fill: P.navy }));
    s.appendChild(txt(cx, cy + 2, label || '综合得分', { 'text-anchor': 'middle', 'font-size': 11, fill: P.sub }));
    if (sub) s.appendChild(txt(cx, cy + 18, sub, { 'text-anchor': 'middle', 'font-size': 10, 'font-weight': 700, fill: P.blue }));
    return s;
  };

  // ---------- 三步走阶梯 ----------
  C.ladder = function (combo) {
    var W = 600, H = 260, s = svg(W, H, '三步走组合'), base = 226, bw = 172;
    var PC = { p1: OK, p2: P.blue, p3: P.purple };
    combo.forEach(function (c, i) {
      var x = 12 + i * (bw + 16), h = 96 + i * 34, y = base - h;
      s.appendChild(el('path', { d: rr(x, y, bw, h, 8), fill: light(PC[c.key], .88), stroke: light(PC[c.key], .55) }));
      s.appendChild(el('path', { d: rr(x, y, bw, 28, 8), fill: PC[c.key] }));
      s.appendChild(txt(x + 10, y + 19, c.name + ' · ' + c.title, { 'font-size': 11, 'font-weight': 800, fill: '#fff' }));
      c.scenes.forEach(function (sc, k) {
        var ly = y + 46 + k * 30;
        s.appendChild(el('circle', { cx: x + 16, cy: ly - 4, r: 9, fill: '#fff', stroke: PC[c.key], 'stroke-width': 1.6 }));
        s.appendChild(txt(x + 16, ly, String(sc.rank), { 'text-anchor': 'middle', 'font-size': 10, 'font-weight': 800, fill: PC[c.key] }));
        s.appendChild(txt(x + 31, ly - 5, trunc(sc.name, 8), { 'font-size': 11, 'font-weight': 700, fill: P.text }));
        s.appendChild(txt(x + 31, ly + 9, sc.weeks + ' 周 · ' + sc.cost + '投入 · ' + trunc(sc.module, 7), { 'font-size': 9, fill: P.sub }));
      });
      s.appendChild(txt(x + bw / 2, base + 18, c.milestone.length > 18 ? trunc(c.milestone, 18) : c.milestone, { 'text-anchor': 'middle', 'font-size': 10, fill: P.sub }));
      if (i < combo.length - 1) s.appendChild(el('path', { d: 'M' + (x + bw + 3) + ' ' + (base - 24) + 'l10 0m-4 -4l4 4l-4 4', fill: 'none', stroke: P.gray, 'stroke-width': 1.6, 'stroke-linecap': 'round' }));
    });
    s.appendChild(el('line', { x1: 8, y1: base, x2: W - 8, y2: base, stroke: P.line }));
    return s;
  };

  // ---------- 数据补齐 → 解锁场景 ----------
  C.depArc = function (missing, blocked) {
    var LH = 46, RH = 30, rows = Math.max(missing.length, blocked.length);
    var W = 560, H = Math.max(160, 40 + rows * Math.max(LH, RH)), s = svg(W, H, '数据补齐与解锁场景');
    var LX = 4, LW = 176, RX = 340, RW = 214;
    var ly = {}, y = 34;
    missing.forEach(function (m, i) {
      ly[m.system] = y + LH / 2 - 6;
      s.appendChild(el('path', { d: rr(LX, y, LW, LH - 10, 6), fill: light(NEED, .82), stroke: NEED, 'stroke-width': 1.4, 'stroke-dasharray': '4 3' }));
      s.appendChild(txt(LX + 12, y + 16, m.name, { 'font-size': 11, 'font-weight': 800, fill: P.text }));
      s.appendChild(txt(LX + 12, y + 30, '补齐后解锁 ' + m.unlock + ' 个场景', { 'font-size': 10, fill: P.sub }));
      y += LH;
    });
    var by = 34;
    blocked.forEach(function (b) {
      var cy = by + RH / 2 - 5;
      s.appendChild(el('path', { d: rr(RX, by, RW, RH - 8, 5), fill: '#fff', stroke: P.line }));
      s.appendChild(txt(RX + 10, by + 15, trunc(b.rank + '. ' + b.name, 12), { 'font-size': 11, fill: P.text }));
      s.appendChild(txt(RX + RW - 10, by + 15, trunc(b.missing.join('、'), 8), { 'text-anchor': 'end', 'font-size': 10, fill: NEED }));
      (b.missing || []).forEach(function () {});
      var src = null;
      missing.forEach(function (m) { if (b.missing.indexOf(m.name) >= 0 && src == null) src = ly[m.system]; });
      if (src != null) s.appendChild(el('path', { d: 'M' + (LX + LW) + ' ' + src + 'C' + (LX + LW + 60) + ' ' + src + ',' + (RX - 60) + ' ' + cy + ',' + RX + ' ' + cy, fill: 'none', stroke: NEED, 'stroke-width': 1.6, opacity: .5 }));
      by += RH;
    });
    s.appendChild(txt(LX + LW / 2, 20, '需要补齐的数据源', { 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 800, fill: P.sub }));
    s.appendChild(txt(RX + RW / 2, 20, '因此暂缓的场景', { 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 800, fill: P.sub }));
    return s;
  };

  window.DGG = window.DGG || {}; window.DGG.charts = C;
})();
