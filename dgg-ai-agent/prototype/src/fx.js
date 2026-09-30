/* ==========================================================================
   fx.js · 定稿背景动效层（浅色海报底 + 舞台流光）
   两张固定画布，都是 body 的最前两个子元素、z-index 0、pointer-events:none，位于 .app 之下：
     #dgg-fx   低分辨率渐变网格（约 1/10 尺寸，CSS 拉伸到全屏，交给合成器插值，几乎不耗 CPU）
               珍珠白 → 天蓝 → 丁香紫 → 薄荷 缓慢呼吸，10 fps 重绘，并叠两团随当前模块主色的色晕；
     #dgg-fx2  全分辨率透明层（DPR ≤ 1.5）：六条贝塞尔流光线（淡线体 + 渐亮拖尾 + 发光亮头）
               + 七十余颗缓慢上浮的光点（实心小点 + 柔和光晕），全部按当前模块色着色，30 fps 封顶。
   规则：页面不可见时暂停；prefers-reduced-motion 只画一帧静态；零外部依赖；随机数带种子，每次开机画面一致；
         待机页可见时把画布抬到 .app 之上、待机层（z-index 100）之下。
   对外：window.DGG.FX = { start(), stop(), setModule(id, colors), setScheme('light'|'dark'), running, scheme }（同时保留 window.DGG_FX 别名）
         setScheme 切换浅场／暗场底色（首页与待机用暗场），约 0.6 s 交叉过渡。
         外壳在每次路由切换时调用 setModule(id, 调色板条目 {pa, pa2, soft, ink, hd1, hd2, hdt, on})，颜色约 1 s 内交叉过渡。
   ========================================================================== */
(function () {
  'use strict';
  if (typeof document === 'undefined') return;
  window.DGG = window.DGG || {};
  var prev = window.DGG.FX;
  if (prev && prev._real && typeof prev.stop === 'function') { try { prev.stop(); } catch (e) { /* 忽略 */ } }

  var FPS = 30, STEP = 1000 / FPS, ID = 'dgg-fx', ID2 = 'dgg-fx2';
  var reduce = false;
  try { reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { reduce = false; }

  var mesh = null, mctx = null, MW = 192, MH = 108;       /* 低分辨率网格画布 */
  var canvas = null, ctx = null, W = 0, H = 0, DPR = 1;    /* 全分辨率透明层 */
  var raf = 0, running = false, started = false, last = 0, t0 = 0, frame = 0;
  var lines = [], dots = [];
  var DEF = { a: [47, 107, 255], b: [90, 160, 255], k: [30, 63, 168] };   /* 品牌蓝：pa / pa2 / ink */
  var cur = { a: DEF.a.slice(), b: DEF.b.slice(), k: DEF.k.slice() };
  var tgt = { a: DEF.a.slice(), b: DEF.b.slice(), k: DEF.k.slice() };
  var sprites = null, spriteKey = '';
  var moduleId = 'home', lastPa = '';

  /* ---------- 工具 ---------- */
  function rng(seed) {                       /* mulberry32 */
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function hex(s) {
    s = String(s || '').trim();
    var m = /^#([0-9a-f]{6})$/i.exec(s);
    if (m) { var n = parseInt(m[1], 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
    m = /^#([0-9a-f]{3})$/i.exec(s);
    if (m) return [parseInt(m[1][0] + m[1][0], 16), parseInt(m[1][1] + m[1][1], 16), parseInt(m[1][2] + m[1][2], 16)];
    m = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(s);
    if (m) return [+m[1], +m[2], +m[3]];
    return null;
  }
  function rgba(c, a) { return 'rgba(' + (c[0] + .5 | 0) + ',' + (c[1] + .5 | 0) + ',' + (c[2] + .5 | 0) + ',' + a + ')'; }
  function toward(a, b, k) { a[0] += (b[0] - a[0]) * k; a[1] += (b[1] - a[1]) * k; a[2] += (b[2] - a[2]) * k; }
  function same(a, b) { return Math.abs(a[0] - b[0]) < .6 && Math.abs(a[1] - b[1]) < .6 && Math.abs(a[2] - b[2]) < .6; }
  function q8(c) { return ((c[0] / 8 + .5) | 0) + ',' + ((c[1] / 8 + .5) | 0) + ',' + ((c[2] / 8 + .5) | 0); }

  /* ---------- 模块色：外壳调用 setModule；兜底读取 body 行内 --m-pa ---------- */
  function applyColors(c) {
    var a = c && hex(c.pa), b = c && hex(c.pa2), k = c && hex(c.ink);
    if (!a) return false;
    tgt.a = a; tgt.b = b || a.slice(); tgt.k = k || a.slice();
    lastPa = String(c.pa || '').trim().toLowerCase();
    if (!started || reduce) { cur.a = tgt.a.slice(); cur.b = tgt.b.slice(); cur.k = tgt.k.slice(); }
    if (reduce && started) render(performance.now());
    return true;
  }
  function setModule(id, colors) {
    moduleId = id || 'home';
    var c = colors;
    if (!c || !c.pa) { var P = window.DGG && window.DGG.PALETTE; c = P && (P[moduleId] || P.m1) || null; }
    if (!applyColors(c)) readBodyColors();
  }
  function readBodyColors() {
    try {
      var cs = getComputedStyle(document.body);
      var pa = cs.getPropertyValue('--m-pa').trim();
      if (!pa || pa.toLowerCase() === lastPa) return;
      applyColors({ pa: pa, pa2: cs.getPropertyValue('--m-pa2').trim(), ink: cs.getPropertyValue('--m-ink').trim() });
    } catch (e) { /* 忽略 */ }
  }

  /* ---------- 光晕贴图（径向渐变预渲染，避免逐帧 shadowBlur / 建渐变） ---------- */
  function makeSprite(c) {
    var s = 64, cv = document.createElement('canvas'); cv.width = s; cv.height = s;
    var g = cv.getContext('2d'), r = s / 2, grd = g.createRadialGradient(r, r, 0, r, r, r);
    grd.addColorStop(0, rgba(c, 1)); grd.addColorStop(.22, rgba(c, .62)); grd.addColorStop(.55, rgba(c, .16)); grd.addColorStop(1, rgba(c, 0));
    g.fillStyle = grd; g.fillRect(0, 0, s, s);
    return cv;
  }
  function ensureSprites() {
    var key = q8(cur.a) + '|' + q8(cur.b) + '|' + q8(cur.k);
    if (key === spriteKey && sprites) return;
    spriteKey = key;
    sprites = { a: makeSprite(cur.a), b: makeSprite(cur.b), k: makeSprite(cur.k), w: makeSprite([255, 255, 255]) };
  }

  /* ---------- 渐变网格的色块（归一化坐标；珍珠白 → 天蓝 → 丁香紫 → 薄荷） ---------- */
  var BLOBS = [
    { x: .12, y: .18, r: .62, c: [191, 216, 255], a: .80, sp: .050, ph: 0.0, amp: .06 }, /* 天蓝 */
    { x: .78, y: .22, r: .58, c: [220, 208, 255], a: .72, sp: .041, ph: 1.7, amp: .07 }, /* 丁香紫 */
    { x: .55, y: .88, r: .66, c: [200, 241, 228], a: .70, sp: .036, ph: 3.1, amp: .06 }, /* 薄荷 */
    { x: .30, y: .70, r: .46, c: [255, 232, 214], a: .34, sp: .058, ph: 4.4, amp: .05 }, /* 浅杏 */
    { x: .92, y: .72, r: .50, c: [201, 228, 255], a: .55, sp: .045, ph: 2.3, amp: .05 }, /* 淡蓝 */
    { x: .50, y: .35, r: .55, c: [255, 255, 255], a: .75, sp: .030, ph: 5.2, amp: .04 }  /* 高光 */
  ];
  /* ---------- 暗场色块（与 BLOBS 一一对应，只换颜色与浓度；首页/待机用） ---------- */
  var BLOBS_DARK = [
    { c: [30, 58, 130],  a: .70 },   /* 深蓝 */
    { c: [52, 36, 112],  a: .62 },   /* 深紫 */
    { c: [10, 62, 78],   a: .52 },   /* 深青 */
    { c: [64, 40, 34],   a: .26 },   /* 暗棕 */
    { c: [22, 50, 104],  a: .48 },   /* 墨蓝 */
    { c: [16, 26, 56],   a: .80 }    /* 夜芯 */
  ];
  var BASE_LIGHT = [247, 249, 255], BASE_DARK = [5, 8, 18];
  var schemeMix = 0, schemeTarget = 0;                 /* 0 = 浅场 · 1 = 暗场；约 0.6 s 过渡 */
  function mix1(a, b, k) { return a + (b - a) * k; }
  function css3(c) { return 'rgb(' + (c[0] + .5 | 0) + ',' + (c[1] + .5 | 0) + ',' + (c[2] + .5 | 0) + ')'; }
  function setScheme(name) {
    var v = name === 'dark' ? 1 : 0;
    if (v === schemeTarget) return;
    schemeTarget = v;
    if (reduce) { schemeMix = v; if (started) render(performance.now()); }
  }

  function drawMesh(t) {
    var k = schemeMix;
    mctx.fillStyle = css3([mix1(BASE_LIGHT[0], BASE_DARK[0], k), mix1(BASE_LIGHT[1], BASE_DARK[1], k), mix1(BASE_LIGHT[2], BASE_DARK[2], k)]);
    mctx.fillRect(0, 0, MW, MH);
    var big = Math.max(MW, MH), i, b, d, x, y, r, g, cr, cg, cb, ca;
    for (i = 0; i < BLOBS.length; i++) {
      b = BLOBS[i]; d = BLOBS_DARK[i];
      x = (b.x + Math.sin(t * b.sp + b.ph) * b.amp) * MW; y = (b.y + Math.cos(t * b.sp * .8 + b.ph) * b.amp) * MH;
      r = b.r * big * (1 + .05 * Math.sin(t * b.sp * 1.3 + b.ph));
      cr = mix1(b.c[0], d.c[0], k); cg = mix1(b.c[1], d.c[1], k); cb = mix1(b.c[2], d.c[2], k); ca = mix1(b.a, d.a, k);
      g = mctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(' + (cr + .5 | 0) + ',' + (cg + .5 | 0) + ',' + (cb + .5 | 0) + ',' + ca + ')');
      g.addColorStop(1, 'rgba(' + (cr + .5 | 0) + ',' + (cg + .5 | 0) + ',' + (cb + .5 | 0) + ',0)');
      mctx.fillStyle = g; mctx.fillRect(0, 0, MW, MH);
    }
    /* 模块主色：两团淡色晕（右中 pa、左下 pa2），随路由交叉过渡；暗场下略提浓度当作辉光 */
    x = (.74 + Math.sin(t * .04) * .05) * MW; y = (.52 + Math.cos(t * .03) * .06) * MH;
    g = mctx.createRadialGradient(x, y, 0, x, y, .52 * MW);
    g.addColorStop(0, rgba(cur.a, mix1(.21, .30, k))); g.addColorStop(1, rgba(cur.a, 0));
    mctx.fillStyle = g; mctx.fillRect(0, 0, MW, MH);
    x = (.14 + Math.cos(t * .035) * .04) * MW; y = (.84 + Math.sin(t * .045) * .05) * MH;
    g = mctx.createRadialGradient(x, y, 0, x, y, .40 * MW);
    g.addColorStop(0, rgba(cur.b, mix1(.16, .26, k))); g.addColorStop(1, rgba(cur.b, 0));
    mctx.fillStyle = g; mctx.fillRect(0, 0, MW, MH);
  }

  /* ---------- 场景构建（种子随机，分辨率无关：坐标为 0–1 比例） ---------- */
  function build() {
    var rnd = rng(20260919), i, N = 6;
    lines = []; dots = [];
    for (i = 0; i < N; i++) {
      lines.push({
        y: .14 + (i / (N - 1)) * .72 + (rnd() - .5) * .08,      /* 基线高度 */
        amp: .05 + rnd() * .08, k: 1 + rnd() * 1.6, ph: rnd() * 6.2832, drift: .05 + rnd() * .05,
        u: rnd(), speed: .028 + rnd() * .022, tail: .16 + rnd() * .1,
        tone: i % 3 === 0 ? 'k' : (i % 3 === 1 ? 'a' : 'b'), width: 2.2 + rnd() * .3, dir: i % 2 ? -1 : 1
      });
    }
    for (i = 0; i < 76; i++) {
      var p = rnd();
      dots.push({ x: rnd(), y: rnd(), r: 2.5 + rnd() * 2.5, vy: .006 + rnd() * .009, sway: .004 + rnd() * .008,
        ph: rnd() * 6.2832, tw: .25 + rnd() * .4, a: .25 + rnd() * .2, tone: p < .45 ? 'a' : (p < .75 ? 'b' : 'k') });
    }
  }
  function lineY(l, x, t) { return l.y * H + Math.sin(x / W * Math.PI * l.k + l.ph + t * l.drift) * l.amp * H; }
  function tracePts(l, t, from, to, n) {
    var pts = [], i, u, x;
    for (i = 0; i <= n; i++) {
      u = from + (to - from) * i / n;
      if (l.dir < 0) u = 1 - u;
      x = -.05 * W + u * 1.1 * W; pts.push([x, lineY(l, x, t)]);
    }
    return pts;
  }
  function sprite(tone) { return sprites[tone] || sprites.a; }
  function tone(l) { return l.tone === 'a' ? cur.a : (l.tone === 'b' ? cur.b : cur.k); }

  function drawComets(t) {
    var i, l, c, full, p, head, seg, s, k, hp, sz;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (i = 0; i < lines.length; i++) {
      l = lines[i]; c = tone(l);
      /* 淡线体 */
      full = tracePts(l, t, 0, 1, 40);
      ctx.beginPath(); ctx.moveTo(full[0][0], full[0][1]);
      for (p = 1; p < full.length; p++) ctx.lineTo(full[p][0], full[p][1]);
      ctx.strokeStyle = rgba(c, .18); ctx.lineWidth = 1.5; ctx.stroke();
      /* 渐亮拖尾：从尾到头透明度 0 → .45、线宽 1.5 → width */
      head = (l.u + t * l.speed) % 1.2 - .1;
      seg = tracePts(l, t, Math.max(-.05, head - l.tail), head, 22);
      for (s = 1; s < seg.length; s++) {
        k = s / (seg.length - 1);
        ctx.beginPath(); ctx.moveTo(seg[s - 1][0], seg[s - 1][1]); ctx.lineTo(seg[s][0], seg[s][1]);
        ctx.strokeStyle = rgba(c, .45 * k * (.4 + .6 * k)); ctx.lineWidth = 1.5 + (l.width - 1.5) * k; ctx.stroke();
      }
      /* 亮头：模块色光晕 + 白色芯点 */
      hp = seg[seg.length - 1]; sz = 40;
      ctx.globalAlpha = .7; ctx.drawImage(sprite(l.tone), hp[0] - sz / 2, hp[1] - sz / 2, sz, sz);
      ctx.globalAlpha = .95; ctx.beginPath(); ctx.arc(hp[0], hp[1], 3, 0, 6.2832); ctx.fillStyle = rgba(c, 1); ctx.fill();
      ctx.beginPath(); ctx.arc(hp[0], hp[1], 1.4, 0, 6.2832); ctx.fillStyle = '#fff'; ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  function drawDots(t) {
    var i, o, y, x, tw, px, py, sz, c;
    for (i = 0; i < dots.length; i++) {
      o = dots[i]; c = o.tone === 'a' ? cur.a : (o.tone === 'b' ? cur.b : cur.k);
      y = ((o.y - t * o.vy) % 1 + 1) % 1; x = (o.x + Math.sin(t * .3 + o.ph) * o.sway + 1) % 1;
      tw = .5 + .5 * Math.sin(t * o.tw + o.ph);                    /* 0–1 缓慢呼吸 */
      px = x * W; py = y * H; sz = o.r * 5;
      ctx.globalAlpha = (.12 + .18 * tw) * (o.a / .35) * (1 + .55 * schemeMix);
      ctx.drawImage(sprite(o.tone), px - sz / 2, py - sz / 2, sz, sz);
      ctx.globalAlpha = Math.min(1, o.a * (.7 + .3 * tw) * (1 + .5 * schemeMix));
      ctx.beginPath(); ctx.arc(px, py, o.r, 0, 6.2832); ctx.fillStyle = rgba(c, 1); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function render(ms) {
    var t = (ms - t0) / 1000;
    var fading = !same(cur.a, tgt.a) || !same(cur.b, tgt.b) || !same(cur.k, tgt.k);
    if (fading) { toward(cur.a, tgt.a, .1); toward(cur.b, tgt.b, .1); toward(cur.k, tgt.k, .1); }   /* 30 fps × .1 ≈ 1 s 过渡 */
    if (schemeMix !== schemeTarget) {                                   /* 浅场 ⇄ 暗场：约 0.6 s */
      schemeMix += (schemeTarget - schemeMix) * .16;
      if (Math.abs(schemeTarget - schemeMix) < .004) schemeMix = schemeTarget;
      fading = true;
    }
    ensureSprites();
    if (fading || frame % 3 === 0) drawMesh(t);             /* 网格 10 fps 足够（变化极慢）；过渡期间逐帧 */
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    drawComets(t);
    drawDots(t);
    frame++;
  }
  function tick(ms) {
    if (!running) return;
    raf = requestAnimationFrame(tick);
    if (ms - last < STEP) return;
    last = ms - ((ms - last) % STEP);
    render(ms);
  }

  /* ---------- 生命周期 ---------- */
  function mk(id) {
    var c = document.getElementById(id);
    if (!c) { c = document.createElement('canvas'); c.id = id; c.setAttribute('aria-hidden', 'true'); }
    c.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;z-index:0;pointer-events:none;display:block;';
    return c;
  }
  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    DPR = Math.min(1.5, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    MW = Math.max(96, Math.round(W / 10)); MH = Math.max(54, Math.round(H / 10));
    mesh.width = MW; mesh.height = MH;
    frame = 0;
  }
  var idleZ = '0';
  function syncIdle() {
    var idle = document.getElementById('idle');
    var z = idle && !idle.classList.contains('hidden') ? '99' : '0';
    if (z !== idleZ) { idleZ = z; mesh.style.zIndex = z; canvas.style.zIndex = z; }
  }
  var rsTimer = 0;
  function ensure() {
    if (canvas) return;
    mesh = mk(ID); canvas = mk(ID2);
    var body = document.body;
    body.insertBefore(mesh, body.firstChild);
    body.insertBefore(canvas, mesh.nextSibling);
    /* 打印时不输出画布（固定定位元素会重复印在每一页上）；!important 仅为压过上面的行内 display */
    if (!document.getElementById('dgg-fx-print')) {
      var st = document.createElement('style'); st.id = 'dgg-fx-print';
      st.textContent = '@media print{#' + ID + ',#' + ID2 + '{display:none!important}}';
      (document.head || body).appendChild(st);
    }
    mctx = mesh.getContext('2d', { alpha: false });
    ctx = canvas.getContext('2d', { alpha: true });
    build(); resize();
    if (lastPa === '') { var P = window.DGG.PALETTE; var b = document.body.getAttribute('data-module'); if (!applyColors(P && (P[b] || P.m1))) readBodyColors(); }
    cur.a = tgt.a.slice(); cur.b = tgt.b.slice(); cur.k = tgt.k.slice();
    window.addEventListener('resize', function () {
      clearTimeout(rsTimer);
      rsTimer = setTimeout(function () { resize(); if (!running || reduce) render(performance.now()); }, 120);
    });
    document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); else resume(); });
    var idle = document.getElementById('idle');
    if (idle && window.MutationObserver) new MutationObserver(syncIdle).observe(idle, { attributes: true, attributeFilter: ['class'] });
    setInterval(function () { syncIdle(); readBodyColors(); }, 1000);
    syncIdle();
    t0 = performance.now();
  }
  function pause() { if (raf) cancelAnimationFrame(raf); raf = 0; }
  function resume() { if (!running || raf || document.hidden) return; last = 0; raf = requestAnimationFrame(tick); }
  function start() {
    if (!document.body) { document.addEventListener('DOMContentLoaded', start); return; }
    ensure(); started = true;
    if (reduce) { running = false; t0 = performance.now() - 4000; frame = 0; render(performance.now()); return; }
    if (running) return;
    running = true; resume();
  }
  function stop() { running = false; pause(); if (ctx) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); } }

  var api = { start: start, stop: stop, setModule: setModule, setScheme: setScheme, _real: true, get running() { return running; }, get scheme() { return schemeTarget ? 'dark' : 'light'; } };
  window.DGG.FX = api; window.DGG_FX = api;
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
