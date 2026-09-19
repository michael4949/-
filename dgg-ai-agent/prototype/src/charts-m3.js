/* 报告图表库 · 模块 3 专用 · 内联 SVG，无外部依赖，纯矢量（无 filter、无模糊）
 * 形态刻意避开模块 1 / 2 已有的 39 个函数：
 *   不做弧形仪表（m1 scoreArc / gauge6、m2 dial）、不做环形（m2 donut / ring）、
 *   不做纵向瀑布（m2 waterfall）、敏感度不做中轴发散条（m1 dimDiverge 已是该形态）。
 * 本族语汇取自财务报表：横向累加桥、穿越零轴的期次柱、累计净额曲线、区间杠铃、横向堆叠、期次脉冲。
 * 正负值除颜色外一律有冗余编码：零轴上下的方向、真减号 U+2212、直接标数。
 * 配色与 report-m3.css 同源：深墨绿 + 香槟金，与模块 1 的海军蓝、模块 2 的蓝青完全分离。
 */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var M = {
    ink: '#12241E', ink2: '#24352E', ink3: '#33453E', sub: '#6E7F78',
    mc: '#0A3A2E', mc2: '#11705A', mc3: '#2E9B7E', mint: '#7FE3C4',
    cu: '#C69A18', cu2: '#8A6A0E', cuLite: '#E8C65A',
    pos: '#00875A', neg: '#B03030', cat: '#9B3D9B', cat2: '#D4A017', cat3: '#C2603A',
    line: '#DFE7E3', line2: '#EDF2F0', paper: '#FCFDFD', zebra: '#F8FAF9',
    grid: '#E6EEEA', sh1: '#C8D6D0'
  };
  var CATS = [M.mc2, M.cu, M.cat, M.cat3, M.mc3, M.cat2];
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
  function trunc(s, n) { s = String(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

  /* ---------- 1. 封面主视觉：投入与回报的天平 ----------
   * 构图：顶部独立标题带 —— 左盘企业服务 ⇄ 支点 AI 能力 ⇄ 右盘效益回报，一根连续金梁贯穿。 */
  function heroM3(o) {
    o = o || {};
    var W = 900, H = 300, s = svg(W, H, '投入回报主视觉');
    s.appendChild(el('rect', { x: 0, y: 0, width: W, height: H, fill: grad(s, '#05201A', '#0E4536') }));
    for (var i = 0; i < 30; i++) s.appendChild(el('line', { x1: i * 34, y1: 70, x2: i * 34 - 54, y2: H, stroke: '#FFFFFF', 'stroke-opacity': .028 }));
    // 顶部标题带（右侧 200px 留给纸面 logo）
    s.appendChild(el('rect', { x: 0, y: 0, width: W, height: 70, fill: '#FFFFFF', 'fill-opacity': .055 }));
    s.appendChild(el('rect', { x: 0, y: 69, width: W, height: 1.4, fill: grad(s, M.cu, 'rgba(198,154,24,0)') }));
    s.appendChild(el('rect', { x: 0, y: 0, width: 5, height: 70, fill: M.cu }));
    s.appendChild(txt(30, 36, o.title || '企业 AI 投入回报测算报告', { 'font-size': 23, 'font-weight': 900, fill: '#FFFFFF', 'letter-spacing': .6 }));
    s.appendChild(txt(31, 55, o.en || 'AI INVESTMENT RETURN ANALYSIS', { 'font-size': 8.5, 'letter-spacing': 3.4, fill: '#8FC4B0' }));
    var st = el('g');
    // 地平线与支点
    st.appendChild(el('line', { x1: 150, y1: 266, x2: 750, y2: 266, stroke: M.mint, 'stroke-opacity': .3 }));
    st.appendChild(el('path', { d: 'M450 150 L420 266 L480 266 Z', fill: grad(s, '#0E6B57', '#05261E', true), stroke: M.mint, 'stroke-opacity': .32 }));
    // 连续金梁（左低右高的相反：右盘承重，右端下沉）
    var lx = 162, ly = 136, rx = 738, ry = 166;
    st.appendChild(el('path', { d: 'M' + lx + ' ' + ly + ' L' + rx + ' ' + ry, stroke: grad(s, M.mint, M.cuLite), 'stroke-width': 7, 'stroke-linecap': 'round' }));
    st.appendChild(el('path', { d: 'M' + lx + ' ' + (ly - 2.2) + ' L' + rx + ' ' + (ry - 2.2), stroke: '#FFFFFF', 'stroke-opacity': .34, 'stroke-width': 1.4, 'stroke-linecap': 'round' }));
    [[lx, ly], [rx, ry]].forEach(function (p) { st.appendChild(el('circle', { cx: p[0], cy: p[1], r: 5.5, fill: M.cuLite })); });
    // 左盘：企业服务（楼宇 + 印章）
    st.appendChild(el('path', { d: 'M' + lx + ' ' + ly + ' L126 186 M' + lx + ' ' + ly + ' L198 186', stroke: M.mint, 'stroke-opacity': .5 }));
    st.appendChild(el('path', { d: 'M118 186 L206 186 L192 212 L132 212 Z', fill: '#FFFFFF', 'fill-opacity': .07, stroke: M.mint, 'stroke-opacity': .55 }));
    [[132, 26, 14], [150, 34, 16], [170, 22, 13]].forEach(function (b, k) {
      st.appendChild(el('rect', { x: b[0], y: 186 - b[1], width: b[2], height: b[1], fill: '#FFFFFF', 'fill-opacity': .09, stroke: M.mint, 'stroke-opacity': .55 }));
      for (var r = 0; r < Math.floor(b[1] / 9); r++) st.appendChild(el('rect', { x: b[0] + 3, y: 186 - b[1] + 4 + r * 9, width: b[2] - 6, height: 3.4, fill: M.mint, 'fill-opacity': (r + k) % 2 ? .3 : .62 }));
    });
    st.appendChild(el('circle', { cx: 196, cy: 168, r: 11, fill: 'none', stroke: M.cuLite, 'stroke-opacity': .7 }));
    st.appendChild(txt(196, 172, '章', { 'text-anchor': 'middle', 'font-size': 10, fill: M.cuLite, 'fill-opacity': .86 }));
    // 右盘：效益回报（递增金条 + 转正标）
    st.appendChild(el('path', { d: 'M' + rx + ' ' + ry + ' L702 216 M' + rx + ' ' + ry + ' L774 216', stroke: M.cuLite, 'stroke-opacity': .5 }));
    st.appendChild(el('path', { d: 'M694 216 L782 216 L768 242 L708 242 Z', fill: '#FFFFFF', 'fill-opacity': .07, stroke: M.cuLite, 'stroke-opacity': .58 }));
    [14, 20, 26, 32].forEach(function (hh, k) {
      st.appendChild(el('rect', { x: 706 + k * 17, y: 216 - hh, width: 12, height: hh, fill: k < 2 ? M.cu2 : grad(s, M.cuLite, M.cu), 'fill-opacity': k < 2 ? .78 : 1 }));
    });
    st.appendChild(el('path', { d: 'M762 190 L762 176 L786 183 Z', fill: M.mint }));
    // 支点上的 AI 核心与节点网络
    [[372, 100], [414, 84], [486, 84], [528, 100], [450, 76]].forEach(function (p) {
      st.appendChild(el('line', { x1: 450, y1: 120, x2: p[0], y2: p[1], stroke: M.mint, 'stroke-opacity': .26 }));
      st.appendChild(el('rect', { x: p[0] - 4, y: p[1] - 4, width: 8, height: 8, fill: M.mint, 'fill-opacity': .5 }));
    });
    st.appendChild(el('rect', { x: 420, y: 118, width: 60, height: 44, rx: 4, fill: grad(s, '#0E6B57', '#02A07E', true), stroke: M.cuLite, 'stroke-opacity': .8 }));
    st.appendChild(txt(450, 147, 'AI', { 'text-anchor': 'middle', 'font-size': 20, 'font-weight': 900, fill: '#FFFFFF' }));
    s.appendChild(st);
    [['企业服务投入', 'INVESTMENT', 162], ['AI 能力', 'CAPABILITY', 450], ['效益回报', 'RETURN', 738]].forEach(function (t) {
      s.appendChild(txt(t[2], 284, t[0], { 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 800, fill: '#FFFFFF' }));
      s.appendChild(txt(t[2], 296, t[1], { 'text-anchor': 'middle', 'font-size': 7.2, 'letter-spacing': 2.4, fill: '#8FC4B0' }));
    });
    return s;
  }

  /* ---------- 2. 封面缩略：累计净额走势与转正点 ---------- */
  function miniCurve(rows, pay) {
    var W = 320, H = 92, L = 6, R = 6, T = 10, B = 18;
    var s = svg(W, H, '累计净额缩览');
    var iw = W - L - R, ih = H - T - B;
    var vals = rows.map(function (r) { return r.cum; });
    var lo = Math.min.apply(null, vals.concat([0])), hi = Math.max.apply(null, vals.concat([0])), span = (hi - lo) || 1;
    var Y = function (v) { return T + ih - (v - lo) / span * ih; }, X = function (i) { return L + i * (iw / (rows.length - 1 || 1)); };
    var z = Y(0);
    s.appendChild(el('rect', { x: L, y: T, width: iw, height: z - T, fill: M.pos, 'fill-opacity': .05 }));
    s.appendChild(el('line', { x1: L, y1: z, x2: W - R, y2: z, stroke: M.ink, 'stroke-opacity': .5 }));
    var d = rows.map(function (r, i) { return (i ? 'L' : 'M') + X(i) + ' ' + Y(r.cum); }).join(' ');
    s.appendChild(el('path', { d: d + ' L' + X(rows.length - 1) + ' ' + z + ' L' + L + ' ' + z + ' Z', fill: M.mc2, 'fill-opacity': .1 }));
    s.appendChild(el('path', { d: d, fill: 'none', stroke: M.mc2, 'stroke-width': 2 }));
    if (pay) {
      var px = X(pay - 1);
      s.appendChild(el('line', { x1: px, y1: T, x2: px, y2: z + 4, stroke: M.cu, 'stroke-dasharray': '3 2' }));
      s.appendChild(el('circle', { cx: px, cy: Y(rows[pay - 1].cum), r: 3.4, fill: M.cu }));
      s.appendChild(txt(px + 5, T + 9, '第 ' + pay + ' 期转正', { 'font-size': 8.5, 'font-weight': 700, fill: M.cu2 }));
    }
    s.appendChild(txt(L, H - 5, '第 1 期', { 'font-size': 8, fill: M.sub }));
    s.appendChild(txt(W - R, H - 5, '第 ' + rows.length + ' 期', { 'text-anchor': 'end', 'font-size': 8, fill: M.sub }));
    return s;
  }

  /* ---------- 3. 24 期现金流：穿越零轴，收支分列 ---------- */
  function cashflowBars(rows, o) {
    o = o || {};
    var W = 640, H = 210, L = 46, R = 12, T = 14, B = 26;
    var s = svg(W, H, '24 期现金流');
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
      if (r.cost > 0) { var hc = r.cost / mx * half; s.appendChild(el('rect', { x: x, y: zero, width: bw, height: hc, fill: M.neg })); s.appendChild(el('path', { d: 'M' + x + ' ' + (zero + hc) + 'l' + bw + ' ' + (-hc), stroke: '#fff', 'stroke-opacity': .32, fill: 'none' })); }
      if (i === 0 || (i + 1) % 6 === 0) s.appendChild(txt(x + bw / 2, H - 9, String(r.m), { 'text-anchor': 'middle', 'font-size': 8.5, fill: M.sub }));
    });
    s.appendChild(txt(L, T + 8, '收益 ▲', { 'font-size': 8.5, fill: M.pos, 'font-weight': 700 }));
    s.appendChild(txt(L, H - B + 2, '支出 ▼', { 'font-size': 8.5, fill: M.neg, 'font-weight': 700 }));
    s.appendChild(txt(W - R, H - 9, '期', { 'text-anchor': 'end', 'font-size': 8.5, fill: M.sub }));
    return s;
  }

  /* ---------- 4. 累计净额与回收期：曲线穿越零轴 ---------- */
  function paybackCurve(rows, pay, o) {
    o = o || {};
    var W = 640, H = 200, L = 52, R = 14, T = 16, B = 26;
    var s = svg(W, H, '累计净额与回收期');
    var iw = W - L - R, ih = H - T - B;
    var vals = rows.map(function (r) { return r.cum; }).concat((o.baseline || []).map(function (r) { return r.cum; }));
    var lo = Math.min.apply(null, vals.concat([0])), hi = Math.max.apply(null, vals.concat([0])), span = (hi - lo) || 1;
    var Y = function (v) { return T + ih - (v - lo) / span * ih; }, X = function (i) { return L + i * (iw / (rows.length - 1 || 1)); };
    var z = Y(0);
    s.appendChild(el('rect', { x: L, y: T, width: iw, height: Math.max(0, z - T), fill: M.pos, 'fill-opacity': .045 }));
    s.appendChild(el('rect', { x: L, y: z, width: iw, height: Math.max(0, T + ih - z), fill: M.neg, 'fill-opacity': .045 }));
    [0, .25, .5, .75, 1].forEach(function (f) {
      var v = lo + span * f, y = Y(v);
      s.appendChild(el('line', { x1: L, y1: y, x2: W - R, y2: y, stroke: M.grid }));
      s.appendChild(txt(L - 6, y + 3, fmtY(v), { 'text-anchor': 'end', 'font-size': 8.5, fill: M.sub }));
    });
    s.appendChild(el('line', { x1: L, y1: z, x2: W - R, y2: z, stroke: M.ink, 'stroke-width': 1.4 }));
    var d = rows.map(function (r, i) { return (i ? 'L' : 'M') + X(i) + ' ' + Y(r.cum); }).join(' ');
    s.appendChild(el('path', { d: d + ' L' + X(rows.length - 1) + ' ' + z + ' L' + L + ' ' + z + ' Z', fill: grad(s, 'rgba(17,112,90,.20)', 'rgba(17,112,90,.02)', true) }));
    s.appendChild(el('path', { d: d, fill: 'none', stroke: M.mc2, 'stroke-width': 2.2 }));
    if (o.baseline && o.baseline.length === rows.length) {
      var bd = o.baseline.map(function (r, i) { return (i ? 'L' : 'M') + X(i) + ' ' + Y(r.cum); }).join(' ');
      s.appendChild(el('path', { d: bd, fill: 'none', stroke: M.sub, 'stroke-width': 1.4, 'stroke-dasharray': '4 3' }));
      s.appendChild(txt(L + 4, Y(o.baseline[o.baseline.length - 1].cum) - 5, '基线', { 'font-size': 8, 'font-weight': 700, fill: M.sub }));
    }
    rows.forEach(function (r, i) { if ((i + 1) % 3 === 0 || i === 0) s.appendChild(el('circle', { cx: X(i), cy: Y(r.cum), r: 2, fill: M.mc2 })); });
    if (pay) {
      var px = X(pay - 1);
      s.appendChild(el('line', { x1: px, y1: T, x2: px, y2: T + ih, stroke: M.cu, 'stroke-dasharray': '4 3' }));
      s.appendChild(el('circle', { cx: px, cy: Y(rows[pay - 1].cum), r: 4.6, fill: M.cu, stroke: '#fff', 'stroke-width': 1.6 }));
      var lab = '第 ' + pay + ' 期转正', lw = lab.length * 8 + 12, lxp = Math.min(px + 8, W - R - lw);
      s.appendChild(el('rect', { x: lxp, y: T + 2, width: lw, height: 16, fill: '#FFFBF0', stroke: '#E3D3A8' }));
      s.appendChild(txt(lxp + 6, T + 13.5, lab, { 'font-size': 9, 'font-weight': 800, fill: M.cu2 }));
    }
    [1, 6, 12, 18, 24].forEach(function (m) { if (m <= rows.length) s.appendChild(txt(X(m - 1), H - 9, String(m), { 'text-anchor': 'middle', 'font-size': 8.5, fill: M.sub })); });
    s.appendChild(txt(W - R, H - 9, '期', { 'text-anchor': 'end', 'font-size': 8.5, fill: M.sub }));
    s.appendChild(txt(L, H - 9, '累计净额（元）', { 'font-size': 8.5, fill: M.sub }));
    return s;
  }

  /* ---------- 5. 累计净额台阶：24 期的逐期读法 ---------- */
  function monthLadder(rows, pay, o) {
    var W = 640, H = 96, L = 12, R = 12;
    var s = svg(W, H, '累计净额台阶');
    var iw = W - L - R, cw = iw / rows.length;
    var vals = rows.map(function (r) { return r.cum; });
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals), span = (hi - lo) || 1;
    rows.forEach(function (r, i) {
      var hgt = (r.cum - lo) / span * 46, pos = r.cum > 0;
      s.appendChild(el('rect', { x: L + i * cw + 1, y: 58 - hgt, width: cw - 2, height: Math.max(1.5, hgt), fill: pos ? M.pos : M.neg, 'fill-opacity': pos ? .85 : .6 }));
      if (pay && r.m === pay) s.appendChild(el('rect', { x: L + i * cw, y: 50 - hgt, width: cw, height: 3, fill: M.ink }));
    });
    s.appendChild(el('line', { x1: L, y1: 58, x2: W - R, y2: 58, stroke: M.ink }));
    [1, 6, 12, 18, 24].forEach(function (m) { s.appendChild(txt(L + (m - .5) * cw, 72, String(m), { 'text-anchor': 'middle', 'font-size': 8.5, fill: M.sub })); });
    s.appendChild(txt(L, 88, '柱高为累计净额；红为尚未回收，绿为已转正' + (pay ? '；黑标为第 ' + pay + ' 期' : ''), { 'font-size': 8.5, fill: M.sub }));
    return s;
  }

  /* ---------- 6. 收益构成桥：逐项横向累加至合并口径 ---------- */
  function benefitBridge(levers, total, o) {
    o = o || {};
    var rowH = 26, W = 600, H = 34 + levers.length * rowH + 34;
    var s = svg(W, H, '收益构成桥');
    var L = 132, R = 66, iw = W - L - R;
    var mx = Math.max(total, levers.reduce(function (a, b) { return a + b.monthly; }, 0)) || 1;
    var acc = 0;
    s.appendChild(txt(L, 14, '按测算金额降序逐项累加（元 / 月）', { 'font-size': 8.5, fill: M.sub }));
    levers.forEach(function (v, i) {
      var y = 26 + i * rowH;
      var counted = v.final != null ? v.final : v.monthly;
      var x0 = L + acc / mx * iw, w = Math.max(2, counted / mx * iw);
      var ghost = Math.max(0, (v.monthly - counted) / mx * iw);
      s.appendChild(txt(L - 8, y + 12, trunc(v.name, 9), { 'text-anchor': 'end', 'font-size': 9.5, 'font-weight': 700, fill: M.ink }));
      s.appendChild(el('rect', { x: x0, y: y + 3, width: w, height: 15, fill: v.cash === false ? M.mc3 : M.mc2 }));
      if (v.cash === false) for (var g = x0 + 4; g < x0 + w; g += 6) s.appendChild(el('line', { x1: g, y1: y + 3, x2: g - 6, y2: y + 18, stroke: '#fff', 'stroke-opacity': .5 }));
      if (ghost > .5) {
        s.appendChild(el('rect', { x: x0 + w, y: y + 3, width: ghost, height: 15, fill: M.line, stroke: M.sh1 }));
        var lab = fmtS(counted) + '（折减 ' + fmtS(v.monthly - counted) + '）';
        var lx = x0 + w + ghost + 5, lw = lab.length * 7.6;
        if (lx + lw > W - 4) { lx = Math.max(L, x0 + w - lw - 5); }   // 贴右缘时改为左置，避免被裁掉
        s.appendChild(txt(lx, y + 14, lab, { 'font-size': 8.5, 'font-weight': 700, fill: M.ink2 }));
      } else {
        s.appendChild(txt(Math.min(x0 + w + 5, W - 52), y + 14, fmtS(counted), { 'font-size': 9, 'font-weight': 700, fill: M.ink2 }));
      }
      if (i < levers.length - 1) s.appendChild(el('line', { x1: x0 + w, y1: y + 18, x2: x0 + w, y2: y + rowH + 3, stroke: M.sub, 'stroke-dasharray': '2 2' }));
      acc += counted;
    });
    var yb = 26 + levers.length * rowH + 4;
    s.appendChild(el('line', { x1: L, y1: yb, x2: W - R + 40, y2: yb, stroke: M.ink }));
    s.appendChild(txt(L - 8, yb + 15, '合并口径', { 'text-anchor': 'end', 'font-size': 9.5, 'font-weight': 800, fill: M.ink }));
    s.appendChild(el('rect', { x: L, y: yb + 4, width: Math.max(2, total / mx * iw), height: 15, fill: grad(s, M.mc, M.cu) }));
    s.appendChild(txt(L + total / mx * iw + 5, yb + 15, fmtS(total), { 'font-size': 9.5, 'font-weight': 800, fill: M.cu2 }));
    s.appendChild(txt(L, H - 3, '灰色段为重叠折减扣除部分；斜纹填充为非现金科目', { 'font-size': 8, fill: M.sub }));
    return s;
  }

  /* ---------- 7. 逐项杠杆：折减前后对照 ---------- */
  function leverBars(levers, o) {
    var rowH = 30, W = 560, H = 20 + levers.length * rowH + 16;
    var s = svg(W, H, '杠杆折减对照');
    var L = 120, R = 74, iw = W - L - R;
    var mx = Math.max.apply(null, levers.map(function (v) { return v.monthly / (v.cut || 1); }).concat([1]));
    levers.forEach(function (v, i) {
      var y = 16 + i * rowH, gross = v.monthly / (v.cut || 1);
      s.appendChild(txt(L - 8, y + 11, trunc(v.name, 9), { 'text-anchor': 'end', 'font-size': 9.5, 'font-weight': 700, fill: M.ink }));
      s.appendChild(txt(L - 8, y + 22, '折减 ' + Math.round((v.cut || 1) * 100) + '%', { 'text-anchor': 'end', 'font-size': 8, fill: M.sub }));
      s.appendChild(el('rect', { x: L, y: y + 2, width: Math.max(2, gross / mx * iw), height: 8, fill: M.line, stroke: M.sh1 }));
      s.appendChild(el('rect', { x: L, y: y + 12, width: Math.max(2, v.monthly / mx * iw), height: 10, fill: CATS[i % CATS.length] }));
      s.appendChild(txt(L + gross / mx * iw + 5, y + 9, fmtS(gross), { 'font-size': 8, fill: M.sub }));
      s.appendChild(txt(L + v.monthly / mx * iw + 5, y + 21, fmtS(v.monthly), { 'font-size': 9, 'font-weight': 700, fill: M.ink2 }));
      if (v.final != null && v.final < v.monthly) {
        var fx = L + v.final / mx * iw;
        s.appendChild(el('line', { x1: fx, y1: y + 10, x2: fx, y2: y + 24, stroke: M.ink, 'stroke-width': 1.4 }));
        s.appendChild(el('path', { d: 'M' + fx + ' ' + (y + 24) + ' l-3 4 l6 0 Z', fill: M.ink }));
      }
    });
    s.appendChild(txt(L, H - 3, '上条为折减前测算值，下条为折减后测算值；黑色标记为合并权重折减后的计列值（元 / 月）', { 'font-size': 8, fill: M.sub }));
    return s;
  }

  /* ---------- 8. 两道护栏：价值系数与营收封顶的依次作用 ---------- */
  /* 内核 benefit 的两道护栏：rawMonthly（各场景合并，已含场景内折减与价值系数）→ afterCross（跨场景去重）→ fullMonthly（营收封顶）。
   * o.console：测算台右栏用的放大版（viewBox 310 宽、字号 ≥ 12），报告版保持原样。 */
  function capFunnel(b, o) {
    o = o || {};
    var C = !!o.console, W = C ? 310 : 400, RH = C ? 64 : 52, rows = [], s;
    rows.push({ k: '逐项合并', v: b.rawMonthly, note: '各场景合并，含场景内折减与价值系数' });
    rows.push({ k: '跨场景去重', v: b.afterCross, note: b.crossDiscount > 0 ? '同一杠杆多场景命中，折减 ' + fmtS(b.crossDiscount) + ' 元' : '无跨场景重复计列' });
    rows.push({ k: b.capMonthly != null ? '营收封顶线' : '营收封顶未启用', v: b.fullMonthly, note: b.capped ? '已触顶，超出未确认' : (b.capMonthly != null ? '未触及封顶线' : '营业收入区间未知') });
    var top = C ? 26 : 22, H = top + rows.length * RH + (C ? 6 : 14);
    s = svg(W, H, '收益护栏');
    var mx = Math.max.apply(null, rows.map(function (r) { return r.v || 0; }).concat([1]));
    var L = 12, iw = W - L - (C ? 84 : 78);
    var f = C ? { t: 12, k: 13, v: 12.5, n: 12 } : { t: 8.5, k: 9.5, v: 10.5, n: 8 };
    s.appendChild(txt(L, C ? 14 : 12, '合并后的月度收益依次通过两道护栏（元 / 月）', { 'font-size': f.t, fill: M.sub }));
    rows.forEach(function (r, i) {
      var y = top + i * RH, v = r.v || 0, w = Math.max(3, v / mx * iw), bh = C ? 16 : 17, by = y + (C ? 17 : 14);
      s.appendChild(txt(L, y + (C ? 11 : 9), r.k, { 'font-size': f.k, 'font-weight': 700, fill: M.ink }));
      s.appendChild(el('rect', { x: L, y: by, width: iw, height: bh, fill: M.zebra, stroke: M.line }));
      s.appendChild(el('rect', { x: L, y: by, width: w, height: bh, fill: i === 2 && b.capped ? M.cu : (i === 0 ? M.mc3 : M.mc2) }));
      s.appendChild(txt(L + iw + 6, by + bh - 4, fmtS(v), { 'font-size': f.v, 'font-weight': 800, fill: M.ink }));
      s.appendChild(txt(L, by + bh + (C ? 15 : 10), r.note, { 'font-size': f.n, fill: M.sub }));
      if (i < rows.length - 1) s.appendChild(el('path', { d: 'M' + (L + iw / 2 - 4) + ' ' + (y + RH - 7) + ' l8 0 l-4 5 Z', fill: M.sub }));
    });
    return s;
  }

  /* ---------- 9. 收益科目构成：现金与非现金 ---------- */
  function cashVsHours(cash, hours, o) {
    var W = 420, H = 84, L = 10, R = 10;
    var s = svg(W, H, '收益科目构成');
    var total = (cash + hours) || 1, iw = W - L - R;
    var wc = cash / total * iw;
    s.appendChild(el('rect', { x: L, y: 22, width: Math.max(1, wc), height: 26, fill: M.pos }));
    s.appendChild(el('rect', { x: L + wc, y: 22, width: Math.max(1, iw - wc), height: 26, fill: M.line, stroke: M.sh1 }));
    for (var x = L + wc + 4; x < L + iw; x += 7) s.appendChild(el('line', { x1: x, y1: 22, x2: x - 7, y2: 48, stroke: M.sub, 'stroke-opacity': .5 }));
    s.appendChild(txt(L, 16, '现金科目', { 'font-size': 9, 'font-weight': 700, fill: M.pos }));
    s.appendChild(txt(L + iw, 16, '非现金科目', { 'text-anchor': 'end', 'font-size': 9, 'font-weight': 700, fill: M.ink3 }));
    s.appendChild(txt(L + 4, 64, fmtS(cash) + ' 元 / 月　' + Math.round(cash / total * 100) + '%', { 'font-size': 9.5, 'font-weight': 800, fill: M.ink }));
    s.appendChild(txt(L + iw, 64, fmtS(hours) + ' 元 / 月　' + Math.round(hours / total * 100) + '%', { 'text-anchor': 'end', 'font-size': 9.5, 'font-weight': 800, fill: M.ink3 }));
    s.appendChild(txt(L, 78, '仅现金科目参与回收期测算', { 'font-size': 8, fill: M.sub }));
    return s;
  }

  /* ---------- 10. 投入结构：横向堆叠 + 逐项标注 ---------- */
  function investStack(items, o) {
    o = o || {};
    var C = !!o.console, W = C ? 310 : 420, RH = C ? 32 : 20, y0 = C ? 60 : 46;   /* console：测算台右栏放大版，字号 ≥ 12 */
    var yb = y0 + items.length * RH + 4, H = yb + (C ? 26 : 22);
    var s = svg(W, H, '投入结构');
    var L = 10, R = 10, iw = W - L - R, bt = C ? 8 : 10, bh = C ? 28 : 24;
    var total = items.reduce(function (a, b) { return a + b.amount; }, 0) || 1, acc = 0;
    items.forEach(function (it, i) {
      var w = it.amount / total * iw;
      s.appendChild(el('rect', { x: L + acc, y: bt, width: Math.max(1, w), height: bh, fill: CATS[i % CATS.length] }));
      if (w > (C ? 36 : 30)) s.appendChild(txt(L + acc + w / 2, bt + bh / 2 + (C ? 4.5 : 4), Math.round(it.amount / total * 100) + '%', { 'text-anchor': 'middle', 'font-size': C ? 12 : 9, 'font-weight': 800, fill: '#fff' }));
      acc += w;
    });
    items.forEach(function (it, i) {
      var y = y0 + i * RH;
      s.appendChild(el('rect', { x: L, y: y - (C ? 9 : 8), width: C ? 10 : 9, height: C ? 10 : 9, fill: CATS[i % CATS.length] }));
      s.appendChild(txt(L + (C ? 17 : 15), y, trunc(it.name, C ? 11 : 14), { 'font-size': C ? 12.5 : 9.5, fill: M.ink2 }));
      s.appendChild(txt(L + iw, y, fmtS(it.amount) + ' 元', { 'text-anchor': 'end', 'font-size': C ? 12.5 : 9.5, 'font-weight': 700, fill: M.ink }));
      s.appendChild(txt(L + iw, y + (C ? 14 : 9), it.yearly ? '年度订阅' : '一次性', { 'text-anchor': 'end', 'font-size': C ? 12 : 7.5, fill: M.sub }));
    });
    s.appendChild(el('line', { x1: L, y1: yb, x2: L + iw, y2: yb, stroke: M.ink }));
    s.appendChild(txt(L, yb + (C ? 18 : 13), '首年现金支出合计', { 'font-size': C ? 12.5 : 9.5, 'font-weight': 800, fill: M.ink }));
    s.appendChild(txt(L + iw, yb + (C ? 18 : 13), fmtS(total) + ' 元', { 'text-anchor': 'end', 'font-size': C ? 13 : 10.5, 'font-weight': 900, fill: M.cu2 }));
    return s;
  }

  /* ---------- 11. 发生期次分布：24 期支出脉冲 ---------- */
  function costTiming(once, yearly, o) {
    var W = 420, H = 118, L = 26, R = 10, B = 30;
    var s = svg(W, H, '发生期次分布');
    var iw = W - L - R, n = 24, cw = iw / n;
    var mx = Math.max(once + yearly, yearly) || 1;
    var base = H - B;
    s.appendChild(el('line', { x1: L, y1: base, x2: W - R, y2: base, stroke: M.ink }));
    [.5, 1].forEach(function (f) {
      var y = base - f * 62;
      s.appendChild(el('line', { x1: L, y1: y, x2: W - R, y2: y, stroke: M.grid }));
      s.appendChild(txt(L - 4, y + 3, fmtY(mx * f), { 'text-anchor': 'end', 'font-size': 7.5, fill: M.sub }));
    });
    for (var m = 1; m <= n; m++) {
      var v = m === 1 ? once + yearly : (m === 13 ? yearly : 0);
      if (v > 0) {
        var hgt = v / mx * 62;
        s.appendChild(el('rect', { x: L + (m - 1) * cw + 1, y: base - hgt, width: Math.max(3, cw - 2), height: hgt, fill: m === 1 ? M.neg : M.cat3 }));
        s.appendChild(txt(L + (m - 1) * cw + cw / 2 + (m === 1 ? 6 : 0), base - hgt - 4, fmtY(v), { 'text-anchor': m === 1 ? 'start' : 'middle', 'font-size': 8, 'font-weight': 700, fill: M.ink2 }));
      } else {
        s.appendChild(el('line', { x1: L + (m - 1) * cw + cw / 2, y1: base, x2: L + (m - 1) * cw + cw / 2, y2: base - 2.5, stroke: M.sh1 }));
      }
    }
    [1, 6, 12, 13, 18, 24].forEach(function (m) { s.appendChild(txt(L + (m - .5) * cw, base + 12, String(m), { 'text-anchor': 'middle', 'font-size': 7.5, fill: m === 1 || m === 13 ? M.ink2 : M.sub, 'font-weight': m === 1 || m === 13 ? 700 : 400 })); });
    s.appendChild(txt(L, H - 4, '第 1 期计列一次性支出与首年订阅，第 13 期计列续费', { 'font-size': 8, fill: M.sub }));
    return s;
  }

  /* ---------- 12. 情景区间：三档回收期与首年净额 ---------- */
  /* 测算台右栏放大版（o.console）：三列纵排，标签 / 数值分行，字号 ≥ 12 */
  function scenarioBandC(list, horizon) {
    var W = 310, H = 196, L = 8, R = 8;
    var s = svg(W, H, '情景区间');
    var iw = W - L - R, cw = iw / list.length, cols = [M.cat3, M.mc2, M.pos];
    list.forEach(function (sc, i) {
      var x = L + i * cw, mid = x + cw / 2, xl = x + 12, xr = x + cw - 12;
      s.appendChild(el('rect', { x: x + 3, y: 4, width: cw - 6, height: H - 8, fill: i === 1 ? M.zebra : M.paper, stroke: i === 1 ? M.mc2 : M.line, 'stroke-width': i === 1 ? 1.4 : 1 }));
      s.appendChild(el('rect', { x: x + 3, y: 4, width: cw - 6, height: 3, fill: cols[i] }));
      s.appendChild(txt(mid, 26, sc.name + '档', { 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 800, fill: M.ink }));
      s.appendChild(txt(mid, 58, sc.payback == null ? '> ' + horizon : '第 ' + sc.payback, { 'text-anchor': 'middle', 'font-size': 28, 'font-weight': 900, fill: cols[i] }));
      s.appendChild(txt(mid, 76, sc.payback == null ? '期内未转正' : '期转正', { 'text-anchor': 'middle', 'font-size': 12, fill: M.sub }));
      s.appendChild(el('line', { x1: xl, y1: 86, x2: xr, y2: 86, stroke: M.line }));
      [['首年净额', fmtS(sc.cum12) + ' 元', sc.cum12 >= 0 ? M.pos : M.neg],
       ['两年净额', fmtS(sc.cum24) + ' 元', sc.cum24 >= 0 ? M.pos : M.neg],
       ['首年投报率', sc.roi12 + '%', M.ink2]].forEach(function (kv, j) {
        var y = 102 + j * 34;
        s.appendChild(txt(xl, y, kv[0], { 'font-size': 12, fill: M.sub }));
        s.appendChild(txt(xr, y + 16, kv[1], { 'text-anchor': 'end', 'font-size': 12, 'font-weight': 700, fill: kv[2] }));
      });
    });
    return s;
  }
  function scenarioBand(list, horizon, o) {
    o = o || {};
    if (o.console) return scenarioBandC(list, horizon);
    var W = 600, H = 138, L = 16, R = 16;
    var s = svg(W, H, '情景区间');
    var iw = W - L - R, cw = iw / list.length;
    var cols = [M.cat3, M.mc2, M.pos];
    list.forEach(function (sc, i) {
      var x = L + i * cw, mid = x + cw / 2;
      s.appendChild(el('rect', { x: x + 4, y: 8, width: cw - 8, height: H - 22, fill: i === 1 ? M.zebra : M.paper, stroke: i === 1 ? M.mc2 : M.line, 'stroke-width': i === 1 ? 1.4 : 1 }));
      s.appendChild(el('rect', { x: x + 4, y: 8, width: cw - 8, height: 3, fill: cols[i] }));
      s.appendChild(txt(mid, 26, sc.name + '档', { 'text-anchor': 'middle', 'font-size': 10, 'font-weight': 800, fill: M.ink }));
      s.appendChild(txt(mid, 54, sc.payback == null ? '> ' + horizon : '第 ' + sc.payback, { 'text-anchor': 'middle', 'font-size': 26, 'font-weight': 900, fill: cols[i] }));
      s.appendChild(txt(mid, 68, sc.payback == null ? '期内未转正' : '期转正', { 'text-anchor': 'middle', 'font-size': 8.5, fill: M.sub }));
      s.appendChild(el('line', { x1: x + 14, y1: 78, x2: x + cw - 14, y2: 78, stroke: M.line }));
      s.appendChild(txt(x + 14, 92, '首年净额', { 'font-size': 8.5, fill: M.sub }));
      s.appendChild(txt(x + cw - 14, 92, fmtS(sc.cum12) + ' 元', { 'text-anchor': 'end', 'font-size': 9, 'font-weight': 700, fill: sc.cum12 >= 0 ? M.pos : M.neg }));
      s.appendChild(txt(x + 14, 106, '两年净额', { 'font-size': 8.5, fill: M.sub }));
      s.appendChild(txt(x + cw - 14, 106, fmtS(sc.cum24) + ' 元', { 'text-anchor': 'end', 'font-size': 9, 'font-weight': 700, fill: sc.cum24 >= 0 ? M.pos : M.neg }));
      s.appendChild(txt(x + 14, 120, '首年投报率', { 'font-size': 8.5, fill: M.sub }));
      s.appendChild(txt(x + cw - 14, 120, sc.roi12 + '%', { 'text-anchor': 'end', 'font-size': 9, 'font-weight': 700, fill: M.ink2 }));
    });
    return s;
  }

  /* ---------- 13. 三档累计净额折线对照 ---------- */
  function scenarioLines(sets, horizon, o) {
    var W = 620, H = 196, L = 54, R = 76, T = 14, B = 26;
    var s = svg(W, H, '三档累计净额');
    var iw = W - L - R, ih = H - T - B;
    var all = [];
    sets.forEach(function (st) { st.rows.forEach(function (r) { all.push(r.cum); }); });
    all.push(0);
    var lo = Math.min.apply(null, all), hi = Math.max.apply(null, all), span = (hi - lo) || 1;
    var Y = function (v) { return T + ih - (v - lo) / span * ih; }, X = function (i) { return L + i * (iw / (horizon - 1 || 1)); };
    [0, .25, .5, .75, 1].forEach(function (f) {
      var v = lo + span * f, y = Y(v);
      s.appendChild(el('line', { x1: L, y1: y, x2: L + iw, y2: y, stroke: M.grid }));
      s.appendChild(txt(L - 6, y + 3, fmtY(v), { 'text-anchor': 'end', 'font-size': 8.5, fill: M.sub }));
    });
    s.appendChild(el('line', { x1: L, y1: Y(0), x2: L + iw, y2: Y(0), stroke: M.ink, 'stroke-width': 1.3 }));
    var cols = [M.cat3, M.mc2, M.pos], dash = ['4 3', '', '2 2'];
    sets.forEach(function (st, k) {
      var d = st.rows.map(function (r, i) { return (i ? 'L' : 'M') + X(i) + ' ' + Y(r.cum); }).join(' ');
      s.appendChild(el('path', { d: d, fill: 'none', stroke: cols[k], 'stroke-width': k === 1 ? 2.2 : 1.6, 'stroke-dasharray': dash[k] }));
      var last = st.rows[st.rows.length - 1];
      s.appendChild(el('circle', { cx: X(st.rows.length - 1), cy: Y(last.cum), r: 2.6, fill: cols[k] }));
      s.appendChild(txt(L + iw + 6, Y(last.cum) + 3.4, st.name + '　' + fmtY(last.cum), { 'font-size': 8.5, 'font-weight': 700, fill: cols[k] }));
      if (st.payback) s.appendChild(el('circle', { cx: X(st.payback - 1), cy: Y(0), r: 3.2, fill: '#fff', stroke: cols[k], 'stroke-width': 1.6 }));
    });
    [1, 6, 12, 18, 24].forEach(function (m) { if (m <= horizon) s.appendChild(txt(X(m - 1), H - 9, String(m), { 'text-anchor': 'middle', 'font-size': 8.5, fill: M.sub })); });
    s.appendChild(txt(L, H - 9, '空心点为各档转正期次', { 'font-size': 8, fill: M.sub }));
    return s;
  }

  /* ---------- 14. 敏感度：单因素扰动的回收期区间杠铃 ---------- */
  function sensitivityRange(items, base, horizon, o) {
    o = o || {};
    var rowH = 30, W = 560, H = 30 + items.length * rowH + 22;
    var s = svg(W, H, '敏感度区间');
    var L = 126, R = 26, iw = W - L - R;
    var caps = items.map(function (it) { return Math.max(it.low == null ? horizon + 1 : it.low, it.high == null ? horizon + 1 : it.high); });
    var mx = Math.max.apply(null, caps.concat([base || 1, 6]));
    var X = function (m) { return L + (m - 1) / (mx - 1 || 1) * iw; };
    [1, Math.round(mx / 2), mx].forEach(function (m) {
      s.appendChild(el('line', { x1: X(m), y1: 20, x2: X(m), y2: H - 20, stroke: M.grid }));
      s.appendChild(txt(X(m), 14, '第 ' + m + ' 期', { 'text-anchor': 'middle', 'font-size': 8, fill: M.sub }));
    });
    if (base) {
      s.appendChild(el('line', { x1: X(base), y1: 20, x2: X(base), y2: H - 20, stroke: M.ink, 'stroke-dasharray': '3 2' }));
      s.appendChild(txt(X(base), H - 8, '中性档 第 ' + base + ' 期', { 'text-anchor': 'middle', 'font-size': 8, 'font-weight': 700, fill: M.ink2 }));
    }
    items.forEach(function (it, i) {
      var y = 28 + i * rowH + 8;
      var a = X(it.low == null ? horizon + 1 : it.low), b = X(it.high == null ? horizon + 1 : it.high);
      var x0 = Math.min(a, b), x1 = Math.max(a, b);
      s.appendChild(txt(L - 8, y + 2, trunc(it.label, 9), { 'text-anchor': 'end', 'font-size': 9.5, 'font-weight': 700, fill: M.ink }));
      s.appendChild(txt(L - 8, y + 12, '影响 ' + it.spread + ' 期', { 'text-anchor': 'end', 'font-size': 7.5, fill: it.spread > 0 ? M.cu2 : M.sub }));
      s.appendChild(el('line', { x1: x0, y1: y, x2: x1, y2: y, stroke: it.spread > 0 ? M.cu : M.sh1, 'stroke-width': 3.4 }));
      s.appendChild(el('circle', { cx: a, cy: y, r: 4.2, fill: M.neg }));
      s.appendChild(el('circle', { cx: b, cy: y, r: 4.2, fill: M.pos }));
      if (it.spread > 0) s.appendChild(txt(x1 + 8, y + 3, '第 ' + Math.max(it.low, it.high) + ' / 第 ' + Math.min(it.low, it.high) + ' 期', { 'font-size': 7.5, fill: M.sub }));
    });
    s.appendChild(txt(6, H - 8, '红点为不利方向，绿点为有利方向', { 'font-size': 8, fill: M.sub }));
    return s;
  }

  /* ---------- 15. 效能爬坡：过渡期的释放比例 ---------- */
  function rampSteps(ramp, monthly, o) {
    var W = 420, H = 116, L = 34, B = 30;
    var s = svg(W, H, '效能爬坡');
    var n = ramp.length + 1, gapw = (W - L - 16) / n, bw = gapw - 12, base = H - B;
    s.appendChild(el('line', { x1: L, y1: base, x2: W - 10, y2: base, stroke: M.ink }));
    for (var i = 0; i < n; i++) {
      var f = i < ramp.length ? ramp[i] : 1;
      var hgt = f * 62, x = L + i * gapw + 6;
      s.appendChild(el('rect', { x: x, y: base - 62, width: bw, height: 62, fill: M.zebra, stroke: M.line2 }));
      s.appendChild(el('rect', { x: x, y: base - hgt, width: bw, height: hgt, fill: i < ramp.length ? M.mc3 : M.mc2 }));
      s.appendChild(txt(x + bw / 2, base - hgt - 5, Math.round(f * 100) + '%', { 'text-anchor': 'middle', 'font-size': 9, 'font-weight': 800, fill: M.ink2 }));
      s.appendChild(txt(x + bw / 2, base + 12, i < ramp.length ? '第 ' + (i + 1) + ' 期' : '第 ' + n + ' 期起', { 'text-anchor': 'middle', 'font-size': 8, fill: M.sub }));
      s.appendChild(txt(x + bw / 2, base + 22, fmtS(monthly * f) + ' 元', { 'text-anchor': 'middle', 'font-size': 8, fill: M.ink3 }));
    }
    s.appendChild(txt(L - 6, base - 62 + 4, '满额', { 'text-anchor': 'end', 'font-size': 7.5, fill: M.sub }));
    s.appendChild(txt(L - 6, base + 3, '0', { 'text-anchor': 'end', 'font-size': 7.5, fill: M.sub }));
    return s;
  }

  /* ---------- 16. 上线周期：阶段甘特 ---------- */
  function weeksGantt(phases, totalWeeks, o) {
    var W = 560, rowH = 24, H = 24 + phases.length * rowH + 20;
    var s = svg(W, H, '上线周期');
    var L = 104, R = 58, iw = W - L - R;
    var X = function (w) { return L + w / (totalWeeks || 1) * iw; };
    var ticks = Math.min(8, Math.ceil(totalWeeks));
    for (var t = 0; t <= ticks; t++) {
      var wk = totalWeeks / ticks * t;
      s.appendChild(el('line', { x1: X(wk), y1: 16, x2: X(wk), y2: H - 18, stroke: M.grid }));
      s.appendChild(txt(X(wk), 11, (Math.round(wk * 10) / 10) + ' 周', { 'text-anchor': 'middle', 'font-size': 7.5, fill: M.sub }));
    }
    var acc = 0;
    phases.forEach(function (p, i) {
      var y = 22 + i * rowH;
      s.appendChild(txt(L - 8, y + 13, trunc(p.name, 7), { 'text-anchor': 'end', 'font-size': 9.5, 'font-weight': 700, fill: M.ink }));
      s.appendChild(el('rect', { x: X(acc), y: y + 4, width: Math.max(3, X(acc + p.weeks) - X(acc)), height: 14, fill: CATS[i % CATS.length] }));
      s.appendChild(txt(X(acc + p.weeks) + 5, y + 14, (Math.round(p.weeks * 10) / 10) + ' 周', { 'font-size': 8.5, 'font-weight': 700, fill: M.ink2 }));
      acc += p.weeks;
    });
    s.appendChild(txt(6, H - 5, '阶段按顺序推进，合计 ' + (Math.round(totalWeeks * 10) / 10) + ' 周，含数据现状系数', { 'font-size': 8, fill: M.sub }));
    return s;
  }

  /* ---------- 17. 数据来源分布：逐项口径的来源标记 ---------- */
  function sourceGrid(entries, o) {
    var W = 560, cols = 3, rows = Math.ceil(entries.length / cols);
    var H = 20 + rows * 24 + 18, cw = W / cols;
    var s = svg(W, H, '数据来源分布');
    var map = { user: [M.pos, '企业填报'], profile: [M.mc2, '画像推定'], benchmark: [M.cu, '参考值'], none: [M.sub, '缺口'] };
    entries.forEach(function (e, i) {
      var c = map[e.src] || map.none;
      var x = (i % cols) * cw + 8, y = 20 + Math.floor(i / cols) * 24;
      s.appendChild(el('rect', { x: x, y: y, width: cw - 16, height: 19, fill: M.paper, stroke: M.line }));
      s.appendChild(el('rect', { x: x, y: y, width: 3.4, height: 19, fill: c[0] }));
      s.appendChild(txt(x + 9, y + 13, trunc(e.label, 8), { 'font-size': 9, fill: M.ink2 }));
      s.appendChild(txt(x + cw - 22, y + 13, c[1], { 'text-anchor': 'end', 'font-size': 8, 'font-weight': 700, fill: c[0] }));
    });
    var lx = 8;
    ['user', 'profile', 'benchmark', 'none'].forEach(function (k) {
      var c = map[k], n = entries.filter(function (e) { return e.src === k; }).length;
      s.appendChild(el('rect', { x: lx, y: 4, width: 8, height: 8, fill: c[0] }));
      s.appendChild(txt(lx + 12, 11.5, c[1] + ' ' + n + ' 项', { 'font-size': 8, fill: M.sub }));
      lx += c[1].length * 8 + 46;
    });
    s.appendChild(txt(8, H - 5, '企业填报项可直接用于决策讨论；参考值项需在复核时替换', { 'font-size': 8, fill: M.sub }));
    return s;
  }

  /* ---------- 18. 测算可信度：分段标尺 ---------- */
  function confidenceBar(score, bands, o) {
    var W = 420, H = 68, L = 10, R = 10;
    var s = svg(W, H, '测算可信度');
    var iw = W - L - R;
    var segs = bands || [[0, 55, M.neg, '待补齐'], [55, 78, M.cu, '基本可用'], [78, 100, M.pos, '口径扎实']];
    segs.forEach(function (g) {
      var x = L + g[0] / 100 * iw, w = (g[1] - g[0]) / 100 * iw;
      s.appendChild(el('rect', { x: x, y: 24, width: w, height: 14, fill: g[2], 'fill-opacity': .22 }));
      s.appendChild(el('rect', { x: x, y: 36, width: w, height: 2, fill: g[2] }));
      s.appendChild(txt(x + w / 2, 50, g[3], { 'text-anchor': 'middle', 'font-size': 8, fill: g[2] }));
    });
    var px = L + score / 100 * iw;
    s.appendChild(el('path', { d: 'M' + px + ' 22 l-5 -8 l10 0 Z', fill: M.ink }));
    s.appendChild(el('line', { x1: px, y1: 22, x2: px, y2: 40, stroke: M.ink, 'stroke-width': 1.6 }));
    s.appendChild(txt(px, 11, score + ' 分', { 'text-anchor': 'middle', 'font-size': 10.5, 'font-weight': 900, fill: M.ink }));
    s.appendChild(txt(L, H - 3, '按各项参数的来源加权计分', { 'font-size': 8, fill: M.sub }));
    return s;
  }

  /* ---------- 19. 数据缺口：影响程度与补齐路径 ---------- */
  function gapImpact(items, o) {
    var W = 560, rowH = 26, H = 18 + Math.max(1, items.length) * rowH + 14;
    var s = svg(W, H, '数据缺口影响');
    var L = 132, R = 120, iw = W - L - R;
    if (!items.length) {
      s.appendChild(el('rect', { x: 8, y: 16, width: W - 16, height: 28, fill: '#F2F9F5', stroke: '#BFE0CF' }));
      s.appendChild(txt(W / 2, 34, '本次测算所需字段均已取得，无待补齐项', { 'text-anchor': 'middle', 'font-size': 10, 'font-weight': 700, fill: M.pos }));
      return s;
    }
    var lv = { high: [M.neg, 3, '高'], mid: [M.cu, 2, '中'], low: [M.sub, 1, '低'] };
    s.appendChild(txt(L, 12, '影响程度', { 'font-size': 8, fill: M.sub }));
    items.forEach(function (it, i) {
      var y = 18 + i * rowH, c = lv[it.impact] || lv.mid;
      s.appendChild(txt(L - 8, y + 15, trunc(it.label || it.name, 9), { 'text-anchor': 'end', 'font-size': 9.5, 'font-weight': 700, fill: M.ink }));
      for (var k = 0; k < 3; k++) s.appendChild(el('rect', { x: L + k * (iw / 3 + 2), y: y + 6, width: iw / 3 - 4, height: 12, fill: k < c[1] ? c[0] : M.line2 }));
      s.appendChild(txt(L + iw + 8, y + 16, c[2] + '　' + trunc(it.fix || it.how || '补齐后重新测算', 10), { 'font-size': 8.5, fill: M.ink3 }));
    });
    s.appendChild(txt(8, H - 3, '影响程度按该字段对回收期的期次变动幅度划分', { 'font-size': 8, fill: M.sub }));
    return s;
  }

  /* ---------- 20. 组织保障：角色 × 阶段的投入强度 ---------- */
  function roleMatrix(roles, o) {
    var stages = ['诊断确认', '数据准备', '配置上线', '试运行', '效益复盘'];
    var W = 560, rowH = 30, H = 34 + roles.length * rowH + 16;
    var s = svg(W, H, '角色阶段矩阵');
    var L = 116, R = 74, iw = W - L - R, cw = iw / stages.length;
    var load = { owner: [1, 1, 2, 2, 3], biz: [3, 2, 3, 3, 2], data: [2, 3, 3, 1, 1] };
    stages.forEach(function (st, i) { s.appendChild(txt(L + i * cw + cw / 2, 18, st, { 'text-anchor': 'middle', 'font-size': 8.5, 'font-weight': 700, fill: M.ink3 })); });
    roles.forEach(function (r, i) {
      var y = 26 + i * rowH, arr = load[r.key] || [2, 2, 2, 2, 2];
      s.appendChild(txt(L - 8, y + 15, r.name, { 'text-anchor': 'end', 'font-size': 9.5, 'font-weight': 700, fill: M.ink }));
      arr.forEach(function (v, k) {
        s.appendChild(el('rect', { x: L + k * cw + 2, y: y + 4, width: cw - 4, height: 20, fill: M.mc2, 'fill-opacity': v === 3 ? .82 : v === 2 ? .42 : .16 }));
        s.appendChild(txt(L + k * cw + cw / 2, y + 18, v === 3 ? '主责' : v === 2 ? '参与' : '知会', { 'text-anchor': 'middle', 'font-size': 8, 'font-weight': 700, fill: v === 3 ? '#fff' : M.ink2 }));
      });
      s.appendChild(txt(L + iw + 8, y + 18, r.time, { 'font-size': 8.5, fill: M.ink3 }));
    });
    s.appendChild(txt(8, H - 3, '主责为该阶段的第一责任人，参与为配合提供口径与数据，知会为结果周知', { 'font-size': 8, fill: M.sub }));
    return s;
  }

  /* ---------- 21. 复核触发条件：影响方向与幅度 ---------- */
  function triggerMap(items, o) {
    var W = 560, rowH = 22, H = 24 + items.length * rowH + 14;
    var s = svg(W, H, '复核触发条件');
    var L = 12, mid = 300;
    items.forEach(function (it, i) {
      var y = 22 + i * rowH;
      s.appendChild(el('rect', { x: L, y: y, width: W - 24, height: rowH - 4, fill: i % 2 ? M.zebra : M.paper }));
      s.appendChild(el('rect', { x: L, y: y, width: 3, height: rowH - 4, fill: CATS[i % CATS.length] }));
      s.appendChild(txt(L + 10, y + 12.5, String(i + 1).padStart(2, '0'), { 'font-size': 8, 'font-weight': 800, fill: M.sub }));
      s.appendChild(txt(L + 28, y + 12.5, trunc(it.when, 16), { 'font-size': 9.5, 'font-weight': 700, fill: M.ink }));
      var dirs = ['回收期前移或后移', '结论不可沿用', '投入科目重估', '折减系数可替换', '收益基数重估'];
      s.appendChild(txt(mid + 8, y + 12.5, dirs[i % dirs.length], { 'font-size': 8.5, fill: M.ink3 }));
    });
    s.appendChild(txt(L, 14, '触发情形', { 'font-size': 8, fill: M.sub }));
    s.appendChild(txt(mid + 8, 14, '对测算结论的影响', { 'font-size': 8, fill: M.sub }));
    return s;
  }

  /* ---------- 22. 投报率：12 期与 24 期对照 ---------- */
  function roiTrack(roi, o) {
    var W = 420, H = 104, L = 78, R = 66;
    var s = svg(W, H, '投报率对照');
    var iw = W - L - R;
    var mx = Math.max(roi.roi12, roi.roi24, 100) || 100;
    [['首年（12 期）', roi.roi12, roi.inv12, M.mc2], ['两年（24 期）', roi.roi24, roi.inv24, M.cu]].forEach(function (d, i) {
      var y = 24 + i * 38;
      s.appendChild(txt(L - 8, y + 13, d[0], { 'text-anchor': 'end', 'font-size': 9, 'font-weight': 700, fill: M.ink }));
      s.appendChild(el('rect', { x: L, y: y + 3, width: iw, height: 16, fill: M.zebra, stroke: M.line2 }));
      s.appendChild(el('rect', { x: L, y: y + 3, width: Math.max(2, Math.min(1, d[1] / mx) * iw), height: 16, fill: d[3] }));
      s.appendChild(txt(L + iw + 6, y + 15, d[1] + '%', { 'font-size': 11, 'font-weight': 900, fill: d[3] }));
      s.appendChild(txt(L, y + 30, '投入基数 ' + fmtS(d[2]) + ' 元', { 'font-size': 7.5, fill: M.sub }));
    });
    s.appendChild(txt(L - 8, 14, '投报率', { 'text-anchor': 'end', 'font-size': 8, fill: M.sub }));
    s.appendChild(txt(L, 14, '累计净收益 ÷ 同期投入' + (roi.meaningful === false ? '（比率已超出常规区间，建议以回收期为准）' : ''), { 'font-size': 8, fill: M.sub }));
    return s;
  }

  /* ---------- 23. 同业场景横向对照：上线周期 × 价值分档 ---------- */
  function peerBars(rows, cur, o) {
    var W = 560, rowH = 24, H = 22 + rows.length * rowH + 16;
    var s = svg(W, H, '同业场景对照');
    var L = 132, R = 96, iw = W - L - R;
    var mxw = Math.max.apply(null, rows.map(function (r) { return r.weeks; }).concat([1]));
    rows.forEach(function (r, i) {
      var y = 22 + i * rowH, on = r.id === cur;
      if (on) s.appendChild(el('rect', { x: 6, y: y - 2, width: W - 12, height: rowH - 2, fill: '#F2F9F5' }));
      s.appendChild(txt(L - 8, y + 13, trunc(r.name, 9), { 'text-anchor': 'end', 'font-size': 9.5, 'font-weight': on ? 800 : 600, fill: on ? M.mc : M.ink2 }));
      s.appendChild(el('rect', { x: L, y: y + 4, width: Math.max(3, r.weeks / mxw * iw), height: 13, fill: on ? M.mc2 : M.sh1 }));
      s.appendChild(txt(L + r.weeks / mxw * iw + 5, y + 14, r.weeks + ' 周', { 'font-size': 8.5, 'font-weight': on ? 800 : 400, fill: on ? M.mc : M.sub }));
      for (var k = 0; k < 5; k++) s.appendChild(el('rect', { x: W - R + 30 + k * 8, y: y + 5, width: 6, height: 11, fill: k < r.value ? M.cu : M.line2 }));
      s.appendChild(txt(W - R + 24, y + 14, r.cost, { 'text-anchor': 'end', 'font-size': 8.5, fill: M.ink3 }));
    });
    s.appendChild(txt(L, 14, '上线周期', { 'font-size': 8, fill: M.sub }));
    s.appendChild(txt(W - R + 24, 14, '投入', { 'text-anchor': 'end', 'font-size': 8, fill: M.sub }));
    s.appendChild(txt(W - R + 30, 14, '价值分档', { 'font-size': 8, fill: M.sub }));
    s.appendChild(txt(6, H - 3, '绿底行为本次测算场景；价值分档为场景库所载字段', { 'font-size': 8, fill: M.sub }));
    return s;
  }

  /* ---------- 24. 报价档位阶梯 ---------- */
  function priceLadder(tiers, cur, o) {
    var W = 440, H = 132, L = 10, R = 10, B = 34;
    var s = svg(W, H, '档位阶梯');
    var iw = W - L - R, cw = iw / tiers.length, base = H - B;
    var mx = Math.max.apply(null, tiers.map(function (t) { return t.yearly || 0; }).concat([1]));
    tiers.forEach(function (t, i) {
      var x = L + i * cw, on = t.key === cur, hgt = (t.yearly || 0) / mx * 66;
      s.appendChild(el('rect', { x: x + 5, y: base - hgt, width: cw - 10, height: Math.max(3, hgt), fill: on ? grad(s, M.mc, M.mc2, true) : M.line, stroke: on ? M.cu : M.sh1, 'stroke-width': on ? 1.6 : 1 }));
      s.appendChild(txt(x + cw / 2, base - hgt - 6, (t.yearly || 0) + ' 元', { 'text-anchor': 'middle', 'font-size': 9, 'font-weight': on ? 800 : 600, fill: on ? M.cu2 : M.ink3 }));
      s.appendChild(txt(x + cw / 2, base + 13, t.name, { 'text-anchor': 'middle', 'font-size': 9, 'font-weight': on ? 800 : 400, fill: on ? M.mc : M.ink3 }));
      if (on) s.appendChild(txt(x + cw / 2, base + 25, '本次计列', { 'text-anchor': 'middle', 'font-size': 8, 'font-weight': 700, fill: M.cu2 }));
    });
    s.appendChild(el('line', { x1: L, y1: base, x2: W - R, y2: base, stroke: M.ink }));
    s.appendChild(txt(L, 12, '单套年费（元 / 套年）', { 'font-size': 8, fill: M.sub }));
    return s;
  }


  /* ---------- 25. 报告结构导航：章节与页次 ---------- */
  function chapterMap(chapters, o) {
    var cols = 3, rows = Math.ceil(chapters.length / cols);
    var W = 580, rowH = 22, H = 17 + rows * rowH + 11, cw = W / cols;
    var s = svg(W, H, '报告结构');
    chapters.forEach(function (c, i) {
      var x = (i % cols) * cw + 6, y = 18 + Math.floor(i / cols) * rowH;
      s.appendChild(el('rect', { x: x, y: y, width: cw - 13, height: rowH - 5, fill: i % 2 ? M.zebra : M.paper, stroke: M.line2 }));
      s.appendChild(el('rect', { x: x, y: y, width: 21, height: rowH - 5, fill: CATS[i % CATS.length] }));
      s.appendChild(txt(x + 10.5, y + 12.5, c.no, { 'text-anchor': 'middle', 'font-size': 8.4, 'font-weight': 800, fill: '#fff' }));
      s.appendChild(txt(x + 27, y + 12.5, trunc(c.title, 7), { 'font-size': 9.2, 'font-weight': 700, fill: M.ink }));
      s.appendChild(txt(x + cw - 18, y + 12.5, 'P' + c.page, { 'text-anchor': 'end', 'font-size': 8.4, fill: M.sub }));
    });
    s.appendChild(txt(6, 11, '全文共 ' + (o && o.total ? o.total : chapters.length) + ' 页，正文 13 章，附录 3 篇', { 'font-size': 8, fill: M.sub }));
    return s;
  }

  /* ---------- 26. 内部工时的期次分布 ---------- */
  function laborTiming(setupAmount, runMonthly, setupMonths, o) {
    var W = 420, H = 118, L = 30, R = 10, B = 30;
    var s = svg(W, H, '工时期次分布');
    var iw = W - L - R, n = 24, cw = iw / n, base = H - B;
    var sm = Math.max(1, Math.ceil(setupMonths));
    var per = setupAmount / sm;
    var mx = per + runMonthly || 1;
    s.appendChild(el('line', { x1: L, y1: base, x2: W - R, y2: base, stroke: M.ink }));
    [.5, 1].forEach(function (f) {
      var y = base - f * 60;
      s.appendChild(el('line', { x1: L, y1: y, x2: W - R, y2: y, stroke: M.grid }));
      s.appendChild(txt(L - 4, y + 3, fmtY(mx * f), { 'text-anchor': 'end', 'font-size': 7.5, fill: M.sub }));
    });
    for (var m = 1; m <= n; m++) {
      var setup = m <= sm ? per : 0, run = runMonthly;
      var hr = run / mx * 60, hs = setup / mx * 60;
      s.appendChild(el('rect', { x: L + (m - 1) * cw + 1, y: base - hr, width: Math.max(2, cw - 2), height: Math.max(.6, hr), fill: M.mc3 }));
      if (hs > 0) s.appendChild(el('rect', { x: L + (m - 1) * cw + 1, y: base - hr - hs, width: Math.max(2, cw - 2), height: hs, fill: M.cat3 }));
    }
    [1, 6, 12, 18, 24].forEach(function (m) { s.appendChild(txt(L + (m - .5) * cw, base + 12, String(m), { 'text-anchor': 'middle', 'font-size': 7.5, fill: M.sub })); });
    s.appendChild(el('rect', { x: L, y: 6, width: 8, height: 8, fill: M.cat3 })); s.appendChild(txt(L + 12, 13, '上线期投入', { 'font-size': 8, fill: M.sub }));
    s.appendChild(el('rect', { x: L + 84, y: 6, width: 8, height: 8, fill: M.mc3 })); s.appendChild(txt(L + 96, 13, '运行期投入', { 'font-size': 8, fill: M.sub }));
    s.appendChild(txt(L, H - 4, '上线期工时按 ' + sm + ' 期均摊列示，仅作分布示意，不参与现金口径', { 'font-size': 8, fill: M.sub }));
    return s;
  }

  /* ---------- 27. 双口径累计净额对照 ---------- */
  function dualCurve(flow, flowAll, pay, payAll, o) {
    var W = 560, H = 176, L = 54, R = 66, T = 14, B = 26;
    var s = svg(W, H, '双口径对照');
    var iw = W - L - R, ih = H - T - B;
    var all = flow.map(function (r) { return r.cum; }).concat(flowAll.map(function (r) { return r.cum; })).concat([0]);
    var lo = Math.min.apply(null, all), hi = Math.max.apply(null, all), span = (hi - lo) || 1;
    var Y = function (v) { return T + ih - (v - lo) / span * ih; }, X = function (i) { return L + i * (iw / (flow.length - 1 || 1)); };
    [0, .5, 1].forEach(function (f) {
      var v = lo + span * f, y = Y(v);
      s.appendChild(el('line', { x1: L, y1: y, x2: L + iw, y2: y, stroke: M.grid }));
      s.appendChild(txt(L - 6, y + 3, fmtY(v), { 'text-anchor': 'end', 'font-size': 8.5, fill: M.sub }));
    });
    s.appendChild(el('line', { x1: L, y1: Y(0), x2: L + iw, y2: Y(0), stroke: M.ink, 'stroke-width': 1.3 }));
    [[flowAll, M.sub, '3 2', '含非现金口径', payAll], [flow, M.mc2, '', '现金口径', pay]].forEach(function (d) {
      var path = d[0].map(function (r, i) { return (i ? 'L' : 'M') + X(i) + ' ' + Y(r.cum); }).join(' ');
      s.appendChild(el('path', { d: path, fill: 'none', stroke: d[1], 'stroke-width': d[2] ? 1.6 : 2.2, 'stroke-dasharray': d[2] }));
      var last = d[0][d[0].length - 1];
      s.appendChild(txt(L + iw + 6, Y(last.cum) + 3.4, d[3], { 'font-size': 8.5, 'font-weight': 700, fill: d[1] }));
      if (d[4]) s.appendChild(el('circle', { cx: X(d[4] - 1), cy: Y(0), r: 3.4, fill: '#fff', stroke: d[1], 'stroke-width': 1.8 }));
    });
    [1, 6, 12, 18, 24].forEach(function (m) { if (m <= flow.length) s.appendChild(txt(X(m - 1), H - 9, String(m), { 'text-anchor': 'middle', 'font-size': 8.5, fill: M.sub })); });
    s.appendChild(txt(L, H - 9, '空心点为各口径转正期次', { 'font-size': 8, fill: M.sub }));
    return s;
  }

  /* ---------- 28. 参数补齐路径：可信度的三级台阶 ---------- */
  function readinessLadder(steps, o) {
    var W = 440, H = 124, L = 12, R = 12, B = 34;
    var s = svg(W, H, '补齐路径');
    var iw = W - L - R, cw = iw / steps.length, base = H - B;
    steps.forEach(function (st, i) {
      var hgt = st.score / 100 * 66, x = L + i * cw;
      s.appendChild(el('rect', { x: x + 6, y: base - 66, width: cw - 12, height: 66, fill: M.zebra, stroke: M.line2 }));
      s.appendChild(el('rect', { x: x + 6, y: base - hgt, width: cw - 12, height: Math.max(3, hgt), fill: i === 0 ? M.mc2 : (i === steps.length - 1 ? M.pos : M.mc3) }));
      s.appendChild(txt(x + cw / 2, base - hgt - 5, st.score + ' 分', { 'text-anchor': 'middle', 'font-size': 9.5, 'font-weight': 800, fill: M.ink }));
      s.appendChild(txt(x + cw / 2, base + 13, st.name, { 'text-anchor': 'middle', 'font-size': 9, 'font-weight': 700, fill: M.ink2 }));
      s.appendChild(txt(x + cw / 2, base + 25, st.note, { 'text-anchor': 'middle', 'font-size': 7.5, fill: M.sub }));
      if (i < steps.length - 1) s.appendChild(el('path', { d: 'M' + (x + cw - 5) + ' ' + (base - 30) + ' l6 4 l-6 4 Z', fill: M.sub }));
    });
    s.appendChild(el('line', { x1: L, y1: base, x2: W - R, y2: base, stroke: M.ink }));
    s.appendChild(txt(L, 12, '参数可信度评分（满分 100）', { 'font-size': 8, fill: M.sub }));
    return s;
  }

  /* ---------- 29. 折减系数标尺：七项杠杆对照 ---------- */
  function cutScale(items, used, o) {
    var W = 560, rowH = 20, H = 20 + items.length * rowH + 14;
    var s = svg(W, H, '折减系数标尺');
    var L = 132, R = 56, iw = W - L - R;
    [0, 25, 50, 75, 100].forEach(function (v) {
      var x = L + v / 100 * iw;
      s.appendChild(el('line', { x1: x, y1: 16, x2: x, y2: H - 16, stroke: M.grid }));
      s.appendChild(txt(x, 11, v + '%', { 'text-anchor': 'middle', 'font-size': 7.5, fill: M.sub }));
    });
    items.forEach(function (it, i) {
      var y = 18 + i * rowH, on = (used || []).indexOf(it.key) >= 0;
      s.appendChild(txt(L - 8, y + 12, trunc(it.name, 9), { 'text-anchor': 'end', 'font-size': 9, 'font-weight': on ? 800 : 500, fill: on ? M.ink : M.sub }));
      s.appendChild(el('rect', { x: L, y: y + 4, width: Math.max(2, it.cut * iw), height: 11, fill: on ? CATS[i % CATS.length] : M.line }));
      s.appendChild(txt(L + it.cut * iw + 5, y + 13, Math.round(it.cut * 100) + '%', { 'font-size': 8.5, 'font-weight': on ? 800 : 400, fill: on ? M.ink2 : M.sub }));
      if (on) s.appendChild(txt(W - 8, y + 13, '本次命中', { 'text-anchor': 'end', 'font-size': 7.5, 'font-weight': 700, fill: M.pos }));
    });
    s.appendChild(txt(6, H - 3, '横轴为折减系数，即工具可影响的部分占该事项全量的比例', { 'font-size': 8, fill: M.sub }));
    return s;
  }

  /* ---------- 30. 回收进度：累计净收益对投入的覆盖率 ---------- */
  function recoveryShare(flow, invest, o) {
    var W = 560, H = 128, L = 40, R = 14, T = 16, B = 28;
    var s = svg(W, H, '回收进度');
    var iw = W - L - R, ih = H - T - B, cw = iw / flow.length;
    var acc = 0;
    var pts = flow.map(function (r) { acc += r.benefit; return Math.min(1.6, acc / (invest || 1)); });
    var mx = Math.max(1.05, Math.max.apply(null, pts));
    var Y = function (v) { return T + ih - v / mx * ih; };
    [0, .5, 1].forEach(function (f) {
      s.appendChild(el('line', { x1: L, y1: Y(f), x2: L + iw, y2: Y(f), stroke: f === 1 ? M.cu : M.grid, 'stroke-dasharray': f === 1 ? '4 3' : '' }));
      s.appendChild(txt(L - 5, Y(f) + 3, Math.round(f * 100) + '%', { 'text-anchor': 'end', 'font-size': 7.5, fill: f === 1 ? M.cu2 : M.sub }));
    });
    pts.forEach(function (v, i) {
      s.appendChild(el('rect', { x: L + i * cw + 1, y: Y(v), width: Math.max(2, cw - 2), height: T + ih - Y(v), fill: v >= 1 ? M.pos : M.mc3, 'fill-opacity': v >= 1 ? .9 : .6 }));
    });
    s.appendChild(el('line', { x1: L, y1: T + ih, x2: L + iw, y2: T + ih, stroke: M.ink }));
    [1, 6, 12, 18, 24].forEach(function (m) { if (m <= flow.length) s.appendChild(txt(L + (m - .5) * cw, H - 14, String(m), { 'text-anchor': 'middle', 'font-size': 8, fill: M.sub })); });
    s.appendChild(txt(L, 11, '累计收益对首年现金支出的覆盖率', { 'font-size': 8, fill: M.sub }));
    s.appendChild(txt(L, H - 3, '金色虚线为 100% 覆盖线；越过该线即收益累计已等于首年现金支出', { 'font-size': 8, fill: M.sub }));
    return s;
  }

  /* ---------- 31. 测算式数值代入：参数方块与运算链 ---------- */
  function formulaFlow(levers, o) {
    var W = 560, rowH = 56, H = 16 + levers.length * rowH + 10;
    var s = svg(W, H, '测算式代入');
    levers.forEach(function (lv, i) {
      var y = 16 + i * rowH;
      s.appendChild(txt(8, y + 10, lv.name, { 'font-size': 9.5, 'font-weight': 800, fill: M.ink }));
      s.appendChild(el('line', { x1: 8, y1: y + 15, x2: W - 8, y2: y + 15, stroke: M.line2 }));
      var parts = String(lv.basis || '').split(/\s*×\s*/);
      var x = 8, col = CATS[i % CATS.length];
      parts.forEach(function (ptxt, k) {
        var w = Math.min(150, Math.max(46, ptxt.length * 7.2 + 14));
        if (x + w > W - 120) return;
        s.appendChild(el('rect', { x: x, y: y + 22, width: w, height: 20, fill: col, 'fill-opacity': .1, stroke: col, 'stroke-opacity': .5 }));
        s.appendChild(txt(x + w / 2, y + 35.5, trunc(ptxt, 18), { 'text-anchor': 'middle', 'font-size': 8.5, fill: M.ink2 }));
        x += w;
        if (k < parts.length - 1) { s.appendChild(txt(x + 7, y + 36, '×', { 'text-anchor': 'middle', 'font-size': 10, fill: M.sub })); x += 15; }
      });
      s.appendChild(txt(x + 8, y + 36, '=', { 'font-size': 10, fill: M.sub }));
      s.appendChild(el('rect', { x: x + 20, y: y + 22, width: W - 28 - x, height: 20, fill: col }));
      s.appendChild(txt(W - 14, y + 36, fmtS(lv.monthly) + ' 元/月', { 'text-anchor': 'end', 'font-size': 9, 'font-weight': 800, fill: '#fff' }));
      s.appendChild(txt(8, y + 52, (lv.cash ? '现金科目' : '非现金科目') + '　合并权重 ' + (lv.discounted ? '35%' : '100%') + '　计列 ' + fmtS(lv.final) + ' 元/月', { 'font-size': 8, fill: M.sub }));
    });
    s.appendChild(txt(8, 11, '各项测算式的参数代入与结果（折减系数已含在末位因子中）', { 'font-size': 8, fill: M.sub }));
    return s;
  }

  /* ---------- 32. 投入合理性核验：占营收比重在常见区间中的位置 ---------- */
  function shareGauge(share, lo, hi, o) {
    var W = 560, H = 112, L = 16, R = 16, T = 34;
    var s = svg(W, H, '投入占营收核验');
    var iw = W - L - R;
    var mx = Math.max(hi * 1.9, share * 1.25, hi + 0.1);
    var X = function (v) { return L + Math.min(1, v / mx) * iw; };
    // 三段标尺：偏低 / 常见区间 / 偏高
    s.appendChild(el('rect', { x: L, y: T, width: X(lo) - L, height: 20, fill: M.neg, 'fill-opacity': .16 }));
    s.appendChild(el('rect', { x: X(lo), y: T, width: X(hi) - X(lo), height: 20, fill: M.pos, 'fill-opacity': .20 }));
    s.appendChild(el('rect', { x: X(hi), y: T, width: L + iw - X(hi), height: 20, fill: M.cu, 'fill-opacity': .16 }));
    s.appendChild(el('rect', { x: X(lo), y: T + 20, width: X(hi) - X(lo), height: 2.4, fill: M.pos }));
    s.appendChild(el('line', { x1: L, y1: T + 20, x2: L + iw, y2: T + 20, stroke: M.ink }));
    [[L, X(lo), '明显偏低', M.neg], [X(lo), X(hi), '常见区间', M.pos], [X(hi), L + iw, '明显偏高', M.cu2]]
      .forEach(function (g) {
        if (g[1] - g[0] < 42) return;
        s.appendChild(txt((g[0] + g[1]) / 2, T + 36, g[2], { 'text-anchor': 'middle', 'font-size': 9.5, 'font-weight': 700, fill: g[3] }));
      });
    [lo, hi].forEach(function (v) {
      s.appendChild(el('line', { x1: X(v), y1: T - 4, x2: X(v), y2: T + 24, stroke: M.ink3, 'stroke-dasharray': '3 2' }));
      s.appendChild(txt(X(v), T + 50, v + '%', { 'text-anchor': 'middle', 'font-size': 9, fill: M.sub }));
    });
    if (share != null) {
      var px = X(share);
      var col = share < lo ? M.neg : (share > hi ? M.cu2 : M.pos);
      s.appendChild(el('path', { d: 'M' + px + ' ' + (T - 3) + ' l-6 -9 l12 0 Z', fill: col }));
      s.appendChild(el('line', { x1: px, y1: T - 3, x2: px, y2: T + 22, stroke: col, 'stroke-width': 2 }));
      var lab = share + '%', lw = lab.length * 8 + 18;
      var lx = Math.max(L, Math.min(px - lw / 2, L + iw - lw));
      s.appendChild(el('rect', { x: lx, y: 4, width: lw, height: 19, fill: '#fff', stroke: col }));
      s.appendChild(txt(lx + lw / 2, 17.5, lab, { 'text-anchor': 'middle', 'font-size': 11.5, 'font-weight': 900, fill: col }));
    }
    s.appendChild(txt(L, H - 6, '横轴为首年现金支出占年度营业收入的比重；区间按单一场景计', { 'font-size': 9, fill: M.sub }));
    return s;
  }

  /* ---------- 33. 测算单元界定：环节 → 角色 → 替代事项 ---------- */
  function sceneFrame(sc, o) {
    var W = 580, H = 148, s = svg(W, H, '测算单元界定');
    var cols = [
      { t: '所属环节', v: sc.stage || '—', c: M.mc2 },
      { t: '使用角色', v: sc.user || '—', c: M.cu },
      { t: '替代事项', v: sc.replaces || '—', c: M.cat }
    ];
    var bw = (W - 24 - 2 * 26) / 3;
    cols.forEach(function (col, i) {
      var x = 12 + i * (bw + 26);
      s.appendChild(el('rect', { x: x, y: 20, width: bw, height: 66, rx: 6, fill: col.c, 'fill-opacity': .07, stroke: col.c, 'stroke-opacity': .45 }));
      s.appendChild(el('rect', { x: x, y: 20, width: bw, height: 3, rx: 1.5, fill: col.c }));
      s.appendChild(txt(x + 11, 39, col.t, { 'font-size': 9.5, 'font-weight': 800, fill: col.c }));
      var words = String(col.v), per = Math.floor((bw - 22) / 11.2);
      for (var k = 0; k < 3 && k * per < words.length; k++) {
        s.appendChild(txt(x + 11, 57 + k * 15, words.slice(k * per, (k + 1) * per), { 'font-size': 11, 'font-weight': 700, fill: M.ink }));
      }
      if (i < 2) s.appendChild(el('path', { d: 'M' + (x + bw + 7) + ' 53 l11 0 M' + (x + bw + 14) + ' 49 l4 4 l-4 4', stroke: M.sub, fill: 'none', 'stroke-width': 1.4 }));
    });
    s.appendChild(txt(12, 12, '场景边界由下列三项场景库字段共同界定', { 'font-size': 9, fill: M.sub }));
    s.appendChild(el('rect', { x: 12, y: 98, width: W - 24, height: 32, rx: 5, fill: M.zebra, stroke: M.line }));
    s.appendChild(el('rect', { x: 12, y: 98, width: 3.5, height: 32, fill: M.cu }));
    s.appendChild(txt(24, 112, '效益折算口径', { 'font-size': 9, 'font-weight': 800, fill: M.sub }));
    s.appendChild(txt(24, 125, trunc(sc.roiBasis || '—', 44), { 'font-size': 10.5, 'font-weight': 700, fill: M.ink }));
    s.appendChild(txt(12, 143, '折算口径决定本场景命中哪几项效益杠杆，逐项测算见第 04 章', { 'font-size': 9, fill: M.sub }));
    return s;
  }

  /* ---------- 34. 锁定优先级：按影响幅度排序的条 ---------- */
  function priorityBars(items, o) {
    var W = 560, rowH = 26, H = 20 + items.length * rowH + 14;
    var s = svg(W, H, '锁定优先级');
    var L = 126, R = 96, iw = W - L - R;
    var mx = Math.max.apply(null, items.map(function (x) { return x.spread; }).concat([1]));
    items.forEach(function (it, i) {
      var y = 20 + i * rowH, must = it.spread >= 2;
      s.appendChild(txt(L - 8, y + 14, trunc(it.label, 9), { 'text-anchor': 'end', 'font-size': 10, 'font-weight': must ? 800 : 600, fill: must ? M.ink : M.sub }));
      s.appendChild(el('rect', { x: L, y: y + 5, width: iw, height: 14, fill: M.zebra, stroke: M.line2 }));
      s.appendChild(el('rect', { x: L, y: y + 5, width: Math.max(2, it.spread / mx * iw), height: 14, fill: must ? M.neg : M.sh1 }));
      s.appendChild(txt(L + Math.max(2, it.spread / mx * iw) + 6, y + 15.5, it.spread + ' 期', { 'font-size': 9.5, 'font-weight': 700, fill: must ? M.neg : M.sub }));
      s.appendChild(txt(W - 8, y + 15.5, must ? '合同锁定' : '实施中可调', { 'text-anchor': 'end', 'font-size': 9, 'font-weight': must ? 800 : 400, fill: must ? M.ink2 : M.sub }));
    });
    s.appendChild(txt(6, 12, '条长为该项上下扰动 20% 所引起的转正期次变动幅度', { 'font-size': 9, fill: M.sub }));
    s.appendChild(txt(6, H - 3, '影响 2 期及以上的口径建议写入方案或合同，其余可按实施进展调整', { 'font-size': 9, fill: M.sub }));
    return s;
  }

  /* ---------- 35. 逐场景贡献：现金 + 非现金，右侧标份额 ---------- */
  function contribBars(scenes, o) {
    var rowH = 26, W = 560, H = 20 + scenes.length * rowH + 14;
    var s = svg(W, H, '逐场景贡献');
    var L = 132, R = 64, iw = W - L - R;
    var mx = Math.max.apply(null, scenes.map(function (x) { return x.cashMonthly + x.hoursMonthly; }).concat([1]));
    scenes.forEach(function (x, i) {
      var y = 20 + i * rowH;
      var wc = x.cashMonthly / mx * iw, wh = x.hoursMonthly / mx * iw;
      s.appendChild(txt(L - 8, y + 13, trunc(x.name, 9), { 'text-anchor': 'end', 'font-size': 9.5, 'font-weight': 700, fill: M.ink }));
      s.appendChild(txt(L - 8, y + 23, '第 ' + x.wave + ' 批 · 第 ' + x.startMonth + ' 期起', { 'text-anchor': 'end', 'font-size': 7.5, fill: M.sub }));
      s.appendChild(el('rect', { x: L, y: y + 4, width: iw, height: 14, fill: M.zebra, stroke: M.line2 }));
      if (wc > 0) s.appendChild(el('rect', { x: L, y: y + 4, width: Math.max(2, wc), height: 14, fill: CATS[i % CATS.length] }));
      if (wh > 0) {
        s.appendChild(el('rect', { x: L + wc, y: y + 4, width: Math.max(2, wh), height: 14, fill: M.line, stroke: M.sh1 }));
        for (var g = L + wc + 4; g < L + wc + wh; g += 6) s.appendChild(el('line', { x1: g, y1: y + 4, x2: g - 6, y2: y + 18, stroke: M.sub, 'stroke-opacity': .5 }));
      }
      s.appendChild(txt(L + Math.max(wc + wh, 2) + 6, y + 15, fmtS(x.cashMonthly), { 'font-size': 9, 'font-weight': 700, fill: M.ink2 }));
      s.appendChild(txt(W - 6, y + 15, x.share + '%', { 'text-anchor': 'end', 'font-size': 10, 'font-weight': 900, fill: x.share >= 30 ? M.mc : M.sub }));
    });
    s.appendChild(txt(6, 12, '实色为现金收益，斜纹为非现金收益；右列为占组合现金收益的份额', { 'font-size': 8.5, fill: M.sub }));
    return s;
  }

  window.DGG = window.DGG || {}; window.DGG.charts = window.DGG.charts || {};
  Object.assign(window.DGG.charts, {
    heroM3: heroM3, miniCurve: miniCurve, cashflowBars: cashflowBars, paybackCurve: paybackCurve,
    monthLadder: monthLadder, benefitBridge: benefitBridge, leverBars: leverBars, capFunnel: capFunnel,
    cashVsHours: cashVsHours, investStack: investStack, costTiming: costTiming, scenarioBand: scenarioBand,
    scenarioLines: scenarioLines, sensitivityRange: sensitivityRange, rampSteps: rampSteps,
    weeksGantt: weeksGantt, sourceGrid: sourceGrid, confidenceBar: confidenceBar, gapImpact: gapImpact,
    roleMatrix: roleMatrix, triggerMap: triggerMap, roiTrack: roiTrack, peerBars: peerBars,
    priceLadder: priceLadder, chapterMap: chapterMap, laborTiming: laborTiming, dualCurve: dualCurve,
    readinessLadder: readinessLadder, formulaFlow: formulaFlow, shareGauge: shareGauge, sceneFrame: sceneFrame, priorityBars: priorityBars, contribBars: contribBars, cutScale: cutScale, recoveryShare: recoveryShare, M3PALETTE: M
  });
})();
