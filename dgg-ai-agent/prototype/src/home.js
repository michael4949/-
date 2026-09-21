/* 首页 · 展台版（暖金展板）
   左右两列共 8 张产品卡、中间三张报告卡 + 企业应用 AI 地图、右侧常驻栏、底部价格条。
   三张报告卡里的预览图不画示意数：数值由构建期用各自内核跑「杭州锐合精密五金有限公司」得出
   （build.js 的 data.homePreview），点进去看到的就是同一份，现场不会出现卡片与内屏对不上的情况。
   全部 SVG 内联，无外链、无存储 API。 */
(function () {
  var NS = 'http://www.w3.org/2000/svg';
  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (attrs[k] == null) return;
      if (k === 'html') el.innerHTML = attrs[k];
      else if (k.slice(0, 2) === 'on') el[k] = attrs[k];
      else el.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c == null) return; el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return el;
  }
  function svg(vb, inner, cls) {
    var s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', vb); s.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    if (cls) s.setAttribute('class', cls);
    s.innerHTML = inner; return s;
  }
  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

  /* ---------- 人物徽章：同一套画法换配色与行头，八个人各不相同 ---------- */
  /* 不用照片：要断网可用、零外链，照片只能内嵌成大体积 base64；这里用同一组路径参数化出八个人。 */
  var FACES = {
    m4:  { skin: '#F3D3B8', hair: '#3A2A22', suit: '#2F6BD4', suit2: '#1E4E9E', inner: '#FFFFFF', tie: '#E8B04B', style: 'bob',   glass: false, hat: null, collar: 'v' },
    m5:  { skin: '#F5D8BE', hair: '#241A16', suit: '#2B3A57', suit2: '#1B263C', inner: '#F4F7FC', tie: '#C9A227', style: 'tail',  glass: false, hat: null, collar: 'round' },
    m6:  { skin: '#EFD0B4', hair: '#6E6E74', suit: '#20345C', suit2: '#152444', inner: '#FFFFFF', tie: '#9FB6D8', style: 'short', glass: true,  hat: null, collar: 'v' },
    m7:  { skin: '#F2D2B6', hair: '#2A1D18', suit: '#8E2F33', suit2: '#6B2126', inner: '#FFFFFF', tie: '#3C4D6B', style: 'side',  glass: false, hat: null, collar: 'v' },
    m8:  { skin: '#F4D6BC', hair: '#2C2019', suit: '#2E7D74', suit2: '#1F5C55', inner: '#E8F2F0', tie: null,      style: 'bun',   glass: false, hat: null, collar: 'work' },
    m9:  { skin: '#EFD0B4', hair: '#221914', suit: '#24406E', suit2: '#172D52', inner: '#FFFFFF', tie: '#4E79B8', style: 'short', glass: false, hat: null, collar: 'v' },
    m10: { skin: '#F1CFAF', hair: '#2A1E17', suit: '#D2622C', suit2: '#A9491D', inner: '#F6E3CF', tie: null,      style: 'short', glass: false, hat: '#E8B733', collar: 'work' },
    m11: { skin: '#F5D9C0', hair: '#1F1712', suit: '#C4332F', suit2: '#96231F', inner: '#2A2F3A', tie: null,      style: 'crop',  glass: false, hat: null, collar: 'hood' }
  };
  function faceSvg(id) {
    var f = FACES[id] || FACES.m9, p = [];
    p.push('<defs><clipPath id="fc-' + id + '"><circle cx="50" cy="50" r="46"/></clipPath>' +
           '<linearGradient id="fb-' + id + '" x1="0" y1="0" x2="0" y2="1">' +
           '<stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#E9F0F9"/></linearGradient></defs>');
    p.push('<circle cx="50" cy="50" r="46" fill="url(#fb-' + id + ')"/>');
    p.push('<g clip-path="url(#fc-' + id + ')">');
    /* 肩：占满下半圈，远看才像人不像图标 */
    p.push('<path d="M4 104c3-22 18-32 46-36 28 4 43 14 46 36z" fill="' + f.suit + '"/>');
    p.push('<path d="M4 104c3-22 18-32 46-36l-11 12-9 24z" fill="' + f.suit2 + '"/>');
    if (f.collar === 'hood') {
      p.push('<path d="M50 68c-13 2-22 6-28 11l10 25h36l10-25c-6-5-15-9-28-11z" fill="' + f.inner + '"/>');
      p.push('<path d="M28 74c6 12 16 18 22 18s16-6 22-18c-6-4-13-6-22-6s-16 2-22 6z" fill="' + f.suit2 + '"/>');
    } else if (f.collar === 'work') {
      p.push('<path d="M50 68c-9 1-17 4-23 7l23 12 23-12c-6-3-14-6-23-7z" fill="' + f.inner + '"/>');
      p.push('<rect x="46" y="76" width="8" height="28" rx="2" fill="' + f.suit2 + '"/>');
    } else if (f.collar === 'round') {
      p.push('<path d="M50 68c-10 1-18 4-24 8a26 26 0 0 0 48 0c-6-4-14-7-24-8z" fill="' + f.inner + '"/>');
    } else {
      p.push('<path d="M50 68c-10 1-18 4-24 8l24 28 24-28c-6-4-14-7-24-8z" fill="' + f.inner + '"/>');
    }
    if (f.tie) p.push('<path d="M50 74l6 6-6 24-6-24z" fill="' + f.tie + '"/>');
    /* 颈 */
    p.push('<path d="M42 56h16v16H42z" fill="' + f.skin + '"/>');
    p.push('<path d="M42 62q8 7 16 0v-6H42z" fill="#000" opacity=".08"/>');
    /* 脸：椭圆 + 耳 */
    p.push('<ellipse cx="31" cy="40" rx="3.4" ry="4.6" fill="' + f.skin + '"/><ellipse cx="69" cy="40" rx="3.4" ry="4.6" fill="' + f.skin + '"/>');
    p.push('<ellipse cx="50" cy="38" rx="19" ry="22" fill="' + f.skin + '"/>');
    /* 发型 */
    if (f.style === 'bob') p.push('<path d="M29 40c-2-18 8-27 21-27s23 9 21 27c2-10-2-15-9-16-7 4-18 5-26 2-4 3-6 7-7 14z" fill="' + f.hair + '"/><path d="M27 38c-3 12-2 22 2 29-4-15-3-24-2-29zM73 38c3 12 2 22-2 29 4-15 3-24 2-29z" fill="' + f.hair + '"/>');
    else if (f.style === 'tail') p.push('<path d="M29 40c-2-18 8-27 21-27s23 9 21 27c2-10-2-15-9-16-7 4-18 5-26 2-4 3-6 7-7 14z" fill="' + f.hair + '"/><path d="M71 36c7 3 10 12 8 22-2 9-7 13-11 13 5-8 6-24 3-35z" fill="' + f.hair + '"/>');
    else if (f.style === 'bun')  p.push('<path d="M29 40c-2-18 8-27 21-27s23 9 21 27c2-10-2-15-9-16-7 4-18 5-26 2-4 3-6 7-7 14z" fill="' + f.hair + '"/><circle cx="50" cy="10" r="8" fill="' + f.hair + '"/>');
    else if (f.style === 'side') p.push('<path d="M29 38c0-17 9-25 21-25s21 8 21 25c-2-10-5-14-10-15-9 6-20 5-25 1-4 3-6 7-7 14z" fill="' + f.hair + '"/>');
    else if (f.style === 'crop') p.push('<path d="M30 36c1-14 9-22 20-22s19 8 20 22c-3-7-6-10-10-11-8 3-16 3-22 1-4 2-6 5-8 10z" fill="' + f.hair + '"/>');
    else p.push('<path d="M29 38c0-16 9-25 21-25s21 9 21 25c-2-10-5-14-10-15-8 4-21 4-26 0-3 3-5 8-6 15z" fill="' + f.hair + '"/>');
    /* 眉眼口：只给轮廓 */
    p.push('<path d="M40 33q4-2.4 8 0M52 33q4-2.4 8 0" fill="none" stroke="' + f.hair + '" stroke-width="2" stroke-linecap="round" opacity=".85"/>');
    p.push('<ellipse cx="43" cy="40" rx="2.1" ry="2.5" fill="#33261F"/><ellipse cx="57" cy="40" rx="2.1" ry="2.5" fill="#33261F"/>');
    p.push('<path d="M50 43v4.5" fill="none" stroke="#C99180" stroke-width="1.5" stroke-linecap="round"/>');
    p.push('<path d="M45 51q5 4 10 0" fill="none" stroke="#B9776A" stroke-width="2" stroke-linecap="round"/>');
    if (f.glass) p.push('<g fill="none" stroke="#54606F" stroke-width="1.8"><rect x="34.5" y="35.5" width="14" height="10" rx="3.5"/><rect x="51.5" y="35.5" width="14" height="10" rx="3.5"/><path d="M48.5 40h3M34.5 39l-4-1M65.5 39l4-1"/></g>');
    if (f.hat) {
      p.push('<path d="M26 28c1-14 11-22 24-22s23 8 24 22z" fill="' + f.hat + '"/>');
      p.push('<rect x="21" y="27" width="58" height="6" rx="3" fill="' + f.hat + '"/>');
      p.push('<path d="M47 6h6v22h-6z" fill="#FFFFFF" opacity=".42"/>');
    }
    p.push('</g>');
    p.push('<circle cx="50" cy="50" r="46" fill="none" stroke="rgba(180,145,70,.55)" stroke-width="2"/>');
    p.push('<circle cx="50" cy="50" r="49" fill="none" stroke="rgba(180,145,70,.28)" stroke-width="1.4"/>');
    return p.join('');
  }

  /* ---------- 报告卡的三张预览图（数值来自构建期内核真算） ---------- */
  function radarPreview(pv, color) {
    var dims = pv.dims, n = dims.length, cx = 78, cy = 74, R = 46, g = [];
    function pt(i, r) { var a = -Math.PI / 2 + i * 2 * Math.PI / n; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; }
    function ring(r) { var d = []; for (var i = 0; i < n; i++) { var q = pt(i, r); d.push((i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1)); } return d.join('') + 'Z'; }
    [1, .66, .33].forEach(function (k) { g.push('<path d="' + ring(R * k) + '" fill="none" stroke="#C9D6E8" stroke-width="1"/>'); });
    for (var i = 0; i < n; i++) { var q = pt(i, R); g.push('<path d="M' + cx + ' ' + cy + 'L' + q[0].toFixed(1) + ' ' + q[1].toFixed(1) + '" stroke="#C9D6E8" stroke-width="1"/>'); }
    var d = [];
    dims.forEach(function (x, i) { var q = pt(i, R * Math.max(.08, x.pct / 100)); d.push((i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1)); });
    g.push('<path d="' + d.join('') + 'Z" fill="' + color + '" fill-opacity=".26" stroke="' + color + '" stroke-width="2" stroke-linejoin="round"/>');
    dims.forEach(function (x, i) { var q = pt(i, R * Math.max(.08, x.pct / 100)); g.push('<circle cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="2.6" fill="' + color + '"/>'); });
    dims.forEach(function (x, i) {
      var q = pt(i, R + 15), anc = Math.abs(q[0] - cx) < 4 ? 'middle' : (q[0] > cx ? 'start' : 'end');
      g.push('<text x="' + q[0].toFixed(1) + '" y="' + (q[1] + 4).toFixed(1) + '" text-anchor="' + anc + '" font-size="11" fill="#5A6B7E">' + esc(x.name) + '</text>');
    });
    return svg('0 0 156 150', g.join(''), 'pv-radar');
  }
  function barsPreview(pv, color) {
    var rows = pv.scenes, g = [], W = 268, x0 = 132, top = 6, hgt = 13, gap = 4.6;
    var max = Math.max.apply(null, rows.map(function (r) { return r.score; }));
    rows.forEach(function (r, i) {
      var y = top + i * (hgt + gap), w = Math.max(10, (W - x0 - 34) * r.score / max);
      g.push('<text x="' + (x0 - 6) + '" y="' + (y + hgt - 2.5) + '" text-anchor="end" font-size="10.5" fill="#46536E">' + esc(r.name) + '</text>');
      /* 场景名最长 9 个字，给足 132px 的左栏，不靠截断 */
      g.push('<rect x="' + x0 + '" y="' + (y + 2.6) + '" width="' + (w + 3).toFixed(1) + '" height="' + (hgt - 2.6) + '" rx="2" fill="#000" opacity=".07"/>');
      g.push('<rect x="' + x0 + '" y="' + y + '" width="' + w.toFixed(1) + '" height="' + (hgt - 2.6) + '" rx="2" fill="' + shade(color, i / rows.length) + '"/>');
      g.push('<text x="' + (x0 + w + 5).toFixed(1) + '" y="' + (y + hgt - 4) + '" font-size="10" font-weight="700" fill="#46536E">' + r.score + '</text>');
    });
    return svg('0 0 ' + W + ' ' + (top + rows.length * (hgt + gap)), g.join(''), 'pv-bars');
  }
  function linePreview(pv, color) {
    var f = pv.flow, g = [], W = 250, H = 104, L = 30, Rr = 8, T = 10, B = 20;
    var vals = f.map(function (p) { return p.cum; }).concat(f.map(function (p) { return -p.invCum; }));
    var hi = Math.max.apply(null, vals), lo = Math.min.apply(null, vals), span = (hi - lo) || 1;
    var px = function (i) { return L + (W - L - Rr) * i / (f.length - 1); };
    var py = function (v) { return T + (H - T - B) * (1 - (v - lo) / span); };
    g.push('<path d="M' + L + ' ' + py(0).toFixed(1) + 'H' + (W - Rr) + '" stroke="#C9D6E8" stroke-width="1" stroke-dasharray="3 3"/>');
    var inv = [], ben = [];
    f.forEach(function (p, i) { inv.push((i ? 'L' : 'M') + px(i).toFixed(1) + ' ' + py(-p.invCum).toFixed(1)); ben.push((i ? 'L' : 'M') + px(i).toFixed(1) + ' ' + py(p.cum).toFixed(1)); });
    g.push('<path d="' + ben.join('') + 'L' + px(f.length - 1).toFixed(1) + ' ' + py(lo).toFixed(1) + 'L' + L + ' ' + py(lo).toFixed(1) + 'Z" fill="' + color + '" fill-opacity=".12"/>');
    g.push('<path d="' + inv.join('') + '" fill="none" stroke="#2F6BD4" stroke-width="2" stroke-linejoin="round"/>');
    g.push('<path d="' + ben.join('') + '" fill="none" stroke="' + color + '" stroke-width="2.4" stroke-linejoin="round"/>');
    var bi = pv.paybackIdx;
    if (bi >= 0 && bi < f.length) {
      g.push('<circle cx="' + px(bi).toFixed(1) + '" cy="' + py(f[bi].cum).toFixed(1) + '" r="5.4" fill="#FFF" stroke="' + color + '" stroke-width="2.4"/>');
      g.push('<circle cx="' + px(bi).toFixed(1) + '" cy="' + py(f[bi].cum).toFixed(1) + '" r="2" fill="' + color + '"/>');
    }
    [0, 6, 12, 18, 23].forEach(function (i) {
      g.push('<text x="' + px(i).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle" font-size="10" fill="#6B7A90">' + (i === 0 ? '0' : (i + 1) + ' 期') + '</text>');
    });
    return svg('0 0 ' + W + ' ' + H, g.join(''), 'pv-line');
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function shade(hex, k) {
    var c = hex.replace('#', ''), r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16), t = .55 * k;
    return 'rgb(' + Math.round(r + (255 - r) * t) + ',' + Math.round(g + (255 - g) * t) + ',' + Math.round(b + (255 - b) * t) + ')';
  }

  /* ---------- 企业应用 AI 地图：等轴测（2:1 菱形网格，无透视） ---------- */
  /* 画法与对话区图表同源：固定深度挤出，不做灭点，正面读值、顶面提亮、侧面压暗。 */
  function aiMap() {
    var U = 28, OX = 452, OY = 150, g = [];
    function iso(x, y, z) { return [OX + (x - y) * U, OY + (x + y) * U * 0.5 - (z || 0) * U * 0.62]; }
    function poly(pts, fill, stroke, op) {
      return '<path d="' + pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join('') + 'Z" fill="' + fill + '"' +
        (stroke ? ' stroke="' + stroke + '" stroke-width="1"' : '') + (op ? ' opacity="' + op + '"' : '') + '/>';
    }
    function lighten(hex, k) { return mix(hex, '#FFFFFF', k); }
    function darken(hex, k) { return mix(hex, '#0B1220', k); }
    function mix(a, b, k) {
      var pa = [parseInt(a.substr(1, 2), 16), parseInt(a.substr(3, 2), 16), parseInt(a.substr(5, 2), 16)];
      var pb = [parseInt(b.substr(1, 2), 16), parseInt(b.substr(3, 2), 16), parseInt(b.substr(5, 2), 16)];
      return 'rgb(' + pa.map(function (v, i) { return Math.round(v + (pb[i] - v) * k); }).join(',') + ')';
    }
    /* 立方体：先底后顶，保证近处压住远处 */
    function box(x, y, w, d, hgt, color) {
      var A = iso(x, y, hgt), B = iso(x + w, y, hgt), C = iso(x + w, y + d, hgt), D = iso(x, y + d, hgt);
      var a0 = iso(x, y, 0), b0 = iso(x + w, y, 0), c0 = iso(x + w, y + d, 0), d0 = iso(x, y + d, 0);
      return poly([D, C, c0, d0], darken(color, .22)) +      /* 右侧面 */
             poly([A, D, d0, a0], darken(color, .34)) +      /* 左侧面 */
             poly([A, B, C, D], lighten(color, .18));        /* 顶面 */
    }
    /* 地台 */
    var PW = 15.4, PD = 11.2;
    var p1 = iso(0, 0, 0), p2 = iso(PW, 0, 0), p3 = iso(PW, PD, 0), p4 = iso(0, PD, 0);
    var e1 = iso(0, 0, -.78), e2 = iso(PW, 0, -.78), e3 = iso(PW, PD, -.78), e4 = iso(0, PD, -.78);
    g.push(poly([p4, p3, e3, e4], '#D9C9A4'));
    g.push(poly([p1, p4, e4, e1], '#C9B78E'));
    g.push(poly([p1, p2, p3, p4], '#F3EADA'));
    g.push(poly([p1, p2, p3, p4], 'none', 'rgba(168,140,84,.45)'));
    /* 草地与道路 */
    function pad(x, y, w, d, fill) { return poly([iso(x, y, 0), iso(x + w, y, 0), iso(x + w, y + d, 0), iso(x, y + d, 0)], fill); }
    g.push(pad(.5, .5, 14.4, 10.2, '#EDE2CC'));
    g.push(pad(.5, 5.3, 14.4, .9, '#E2D5BA'));
    g.push(pad(7.3, .5, .9, 10.2, '#E2D5BA'));

    /* 五个片区：办公区 / 生产车间 / 仓库物流 / 客户接待 / 门店街区 */
    var ZONES = [
      { key: 'office',  name: '办公区',   x: 1.2, y: 1.0, c: '#4E80D8' },
      { key: 'shop',    name: '生产车间', x: 5.6, y: 0.9, c: '#38A08A' },
      { key: 'ware',    name: '仓库物流', x: 10.4, y: 1.1, c: '#E0912F' },
      { key: 'front',   name: '客户接待', x: 1.4, y: 6.8, c: '#7C6BD0' },
      { key: 'retail',  name: '门店街区', x: 9.2, y: 6.9, c: '#D9663F', span: 2.3, lift: 2.4 }
    ];
    /* 办公区：一栋主楼 + 两栋配楼 */
    g.push(box(1.2, 1.0, 2.6, 2.4, 2.5, '#E4E9F2'));
    g.push(box(1.5, 1.3, 2.0, 1.8, 2.66, '#8FB0E2'));
    g.push(box(4.1, 1.6, 1.3, 1.6, 1.7, '#E9EDF4'));
    g.push(box(1.4, 3.7, 1.5, 1.1, 1.2, '#EDE7DA'));
    /* 生产车间：长跨厂房 + 锯齿顶 */
    g.push(box(5.6, 0.9, 3.6, 3.0, 1.9, '#E6EFEA'));
    for (var s = 0; s < 4; s++) g.push(box(5.75 + s * .88, 1.05, .62, 2.7, 2.28, '#9DC9BA'));
    /* 仓库物流：库房 + 货架 + 一辆车 */
    g.push(box(10.4, 1.1, 3.3, 2.8, 2.0, '#F0E7D8'));
    for (var r = 0; r < 3; r++) g.push(box(10.6 + r * 1.05, 1.35, .7, 2.3, 2.42, '#E8B878'));
    g.push(box(11.0, 4.3, 1.9, .9, .82, '#5C6B84'));
    g.push(box(12.5, 4.35, .8, .8, 1.1, '#8494AE'));
    /* 客户接待：门厅 + 水景 */
    g.push(box(1.4, 6.8, 2.8, 2.2, 1.35, '#EEE9F6'));
    g.push(box(1.7, 7.1, 2.2, 1.6, 1.52, '#B9AEE4'));
    g.push(pad(4.6, 7.2, 1.9, 1.6, '#CFE2EE'));
    /* 门店街区：一排门脸 */
    var SHOP = ['#E9B7A2', '#EBD3A6', '#C9D9C0', '#D9C3DD'];
    for (var q = 0; q < 4; q++) {
      var hgt = 1.15 + (q % 2) * .24;
      g.push(box(9.2 + q * 1.15, 6.9, .92, 1.9, hgt, '#F3E9DA'));
      g.push(box(9.2 + q * 1.15, 6.9, .92, .34, hgt + .2, SHOP[q]));   /* 遮阳篷：四家门脸各一色，远看才分得出是一排店 */
    }
    g.push(pad(9.2, 9.0, 4.6, .8, '#E2D5BA'));
    /* 树 */
    [[4.9, 4.5], [8.6, 4.6], [.9, 9.4], [7.0, 9.6], [14.3, 5.0], [6.2, 5.9]].forEach(function (t) {
      g.push(box(t[0], t[1], .26, .26, .5, '#9A7C4E'));
      var c = iso(t[0] + .13, t[1] + .13, .95);
      g.push('<ellipse cx="' + c[0].toFixed(1) + '" cy="' + c[1].toFixed(1) + '" rx="12" ry="9" fill="#7FB07A"/>');
      g.push('<ellipse cx="' + (c[0] - 2).toFixed(1) + '" cy="' + (c[1] - 3).toFixed(1) + '" rx="8" ry="6" fill="#93C08C"/>');
    });
    /* 数据光带：三条沿路的流向，对应三类链路 */
    function ribbon(pts, color, dash, dur) {
      var d = pts.map(function (p, i) { var q = iso(p[0], p[1], .12); return (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join('');
      return '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="11" stroke-linecap="round" stroke-linejoin="round" opacity=".13"/>' +
             '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity=".26"/>' +
             '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="' + dash + '">' +
             '<animate attributeName="stroke-dashoffset" from="' + dash.split(' ')[0] * 2 + '" to="0" dur="' + dur + 's" repeatCount="indefinite"/></path>';
    }
    g.push(ribbon([[.9, 5.75], [7.75, 5.75], [7.75, .9]], '#2F6BD4', '14 12', 3.2));
    g.push(ribbon([[7.75, 5.75], [14.9, 5.75]], '#1BAF7A', '14 12', 2.8));
    g.push(ribbon([[7.75, 5.75], [7.75, 10.4], [13.8, 10.4]], '#E07A3C', '14 12', 3.6));
    /* 片区标牌 */
    ZONES.forEach(function (z) {
      var c = iso(z.x + (z.span || 1.1), z.y + .6, z.lift || 3.15), w = z.name.length * 13 + 18;
      g.push('<g class="zone" data-zone="' + z.key + '">' +
        '<rect x="' + (c[0] - w / 2).toFixed(1) + '" y="' + (c[1] - 22).toFixed(1) + '" width="' + w + '" height="23" rx="11.5" fill="#FFFFFF" opacity=".94"/>' +
        '<rect x="' + (c[0] - w / 2).toFixed(1) + '" y="' + (c[1] - 22).toFixed(1) + '" width="' + w + '" height="23" rx="11.5" fill="none" stroke="' + z.c + '" stroke-width="1.6"/>' +
        '<text x="' + c[0].toFixed(1) + '" y="' + (c[1] - 6).toFixed(1) + '" text-anchor="middle" font-size="13" font-weight="700" fill="' + z.c + '">' + z.name + '</text></g>');
    });
    return svg('128 65 765 477', g.join(''), 'ai-map-svg');
  }

  window.DGG = window.DGG || {};
  window.DGG.home = { h: h, svg: svg, fmt: fmt, faceSvg: faceSvg, aiMap: aiMap, radarPreview: radarPreview, barsPreview: barsPreview, linePreview: linePreview, esc: esc };
})();
