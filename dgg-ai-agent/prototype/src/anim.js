/* ==========================================================================
   anim.js · 场景动画引擎（m4–m11 六屏共用）
   ------------------------------------------------------------------
   展会现场观众没耐心读字，八个场景改成「看得懂的动画」：数字自己跳、线自己画、
   行自己流进来、数据包自己从左边流到右边、该看的地方自己亮起来。
   全部用 requestAnimationFrame + CSS 变换，不依赖任何库；切屏自动停表，不留野定时器。

   对外：window.DGG.anim
     timeline()                 造一条时间轴：.at(ms, fn) / .gap(ms, fn) / .play() / .stop()
     count(el, to, opt)         数字滚动（opt: from, ms, fmt, unit, decimals）
     drawSvg(el, ms, delay)     SVG 路径「画出来」（stroke-dasharray）
     rise(nodes, opt)           一组元素错峰淡入上浮（opt: stagger, ms, from）
     stream(rows, opt)          表格行逐行流入并短暂高亮
     packet(fromEl, toEl, opt)  从 A 元素飞一个数据包到 B 元素（opt: color, ms, count, label）
     pulse(el, opt)             聚焦脉冲（把观众视线拉过去）
     typeIn(el, text, opt)      逐字打字
     grow(el, opt)              条形 / 进度条从 0 长到目标（读 data-to 或 opt.to，单位 %）
     ring(el, pct, opt)         圆环进度绘制
     scan(el, opt)              一道扫描光带划过元素
     stopAll(scope)             停掉 scope 内所有由本引擎启动的动画（屏切换时调）
   约定：所有函数都对 null 安全；prefers-reduced-motion 时直接落到终态。
   ========================================================================== */
(function () {
  'use strict';
  window.DGG = window.DGG || {};

  var REDUCE = false;
  try { REDUCE = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { REDUCE = false; }

  var LIVE = [];                                   /* 所有在跑的句柄，切屏时统一收掉 */
  function reg(stop) { var o = { stop: stop, dead: false }; LIVE.push(o); return o; }
  function kill(o) { if (o && !o.dead) { o.dead = true; try { o.stop(); } catch (e) { /* 忽略 */ } } }
  function stopAll() { var l = LIVE; LIVE = []; l.forEach(kill); }

  function ease(k) { return k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }   /* easeInOutCubic */
  function easeOut(k) { return 1 - Math.pow(1 - k, 3); }
  function fmtNum(n, decimals) {
    var s = decimals ? n.toFixed(decimals) : String(Math.round(n));
    var p = s.split('.');
    p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return p.join('.');
  }
  function nodesOf(x) {
    if (!x) return [];
    if (x.nodeType === 1) return [x];
    return Array.prototype.slice.call(x);
  }

  /* ---------- 逐帧驱动 ---------- */
  function run(ms, step, done) {
    if (REDUCE || ms <= 0) { step(1); if (done) done(); return reg(function () { }); }
    var t0 = 0, raf = 0, handle = reg(function () { if (raf) cancelAnimationFrame(raf); });
    function tick(t) {
      if (handle.dead) return;
      if (!t0) t0 = t;
      var k = Math.min(1, (t - t0) / ms);
      step(k);
      if (k < 1) raf = requestAnimationFrame(tick);
      else { handle.dead = true; if (done) done(); }
    }
    raf = requestAnimationFrame(tick);
    return handle;
  }

  /* ---------- 时间轴 ---------- */
  function timeline() {
    var items = [], cursor = 0, timers = [], stopped = false;
    var api = {
      at: function (ms, fn) { items.push({ t: ms, fn: fn }); cursor = Math.max(cursor, ms); return api; },
      gap: function (ms, fn) { cursor += ms; items.push({ t: cursor, fn: fn }); return api; },
      play: function () {
        if (REDUCE) { items.forEach(function (it) { try { it.fn(); } catch (e) { /* 忽略 */ } }); return api; }
        items.forEach(function (it) {
          timers.push(setTimeout(function () { if (!stopped) { try { it.fn(); } catch (e) { /* 忽略 */ } } }, it.t));
        });
        reg(api.stop);
        return api;
      },
      stop: function () { stopped = true; timers.forEach(clearTimeout); timers = []; },
      get length() { return cursor; }
    };
    return api;
  }

  /* ---------- 数字滚动 ---------- */
  function count(el, to, opt) {
    if (!el) return null;
    opt = opt || {};
    var from = opt.from != null ? opt.from : 0;
    var ms = opt.ms != null ? opt.ms : 900;
    var dec = opt.decimals || 0;
    var fmt = opt.fmt || function (v) { return fmtNum(v, dec); };
    el.classList.add('an-count');
    return run(ms, function (k) {
      el.textContent = fmt(from + (to - from) * easeOut(k)) + (opt.unit || '');
    }, function () { el.textContent = fmt(to) + (opt.unit || ''); el.classList.remove('an-count'); });
  }

  /* ---------- SVG 路径画出来 ---------- */
  function drawSvg(el, ms, delay) {
    var list = nodesOf(el), out = [];
    list.forEach(function (p) {
      var len = 0;
      try { len = p.getTotalLength ? p.getTotalLength() : 0; } catch (e) { len = 0; }
      if (!len) return;
      p.style.strokeDasharray = len + ' ' + len;
      p.style.strokeDashoffset = String(len);
      var h = null;
      var t = setTimeout(function () {
        h = run(ms || 900, function (k) { p.style.strokeDashoffset = String(len * (1 - easeOut(k))); },
                function () { p.style.strokeDashoffset = '0'; });
      }, delay || 0);
      out.push(reg(function () { clearTimeout(t); kill(h); p.style.strokeDashoffset = '0'; }));
    });
    return out;
  }

  /* ---------- 一组元素错峰淡入上浮 ---------- */
  function rise(x, opt) {
    opt = opt || {};
    var list = nodesOf(x), st = opt.stagger != null ? opt.stagger : 70, ms = opt.ms || 460;
    var from = opt.from || 'up';
    var dx = from === 'left' ? -18 : (from === 'right' ? 18 : 0);
    var dy = from === 'up' ? 14 : (from === 'down' ? -14 : 0);
    list.forEach(function (el, i) {
      if (REDUCE) return;
      el.style.opacity = '0';
      el.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
      el.style.transition = 'opacity ' + ms + 'ms cubic-bezier(.2,.7,.3,1) ' + (i * st) + 'ms, transform ' + ms + 'ms cubic-bezier(.2,.7,.3,1) ' + (i * st) + 'ms';
      var t = setTimeout(function () { el.style.opacity = ''; el.style.transform = ''; }, 20);
      reg(function () { clearTimeout(t); el.style.opacity = ''; el.style.transform = ''; el.style.transition = ''; });
    });
    return list.length ? (list.length - 1) * st + ms : 0;
  }

  /* ---------- 表格行逐行流入 ---------- */
  function stream(x, opt) {
    opt = opt || {};
    var list = nodesOf(x), st = opt.stagger != null ? opt.stagger : 90;
    list.forEach(function (tr, i) {
      if (REDUCE) return;
      tr.classList.add('an-row-wait');
      var t = setTimeout(function () {
        tr.classList.remove('an-row-wait');
        tr.classList.add('an-row-in');
        var t2 = setTimeout(function () { tr.classList.remove('an-row-in'); }, 900);
        reg(function () { clearTimeout(t2); tr.classList.remove('an-row-in'); });
      }, i * st + (opt.delay || 0));
      reg(function () { clearTimeout(t); tr.classList.remove('an-row-wait', 'an-row-in'); });
    });
    return list.length * st + (opt.delay || 0);
  }

  /* ---------- 数据包沿直线从 A 飞到 B ---------- */
  function packet(a, b, opt) {
    opt = opt || {};
    if (!a || !b || REDUCE) { if (opt.done) opt.done(); return null; }
    var host = opt.host || document.querySelector('.pd-app') || document.body;
    var hr = host.getBoundingClientRect(), ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    var x0 = ra.left + ra.width / 2 - hr.left, y0 = ra.top + ra.height / 2 - hr.top;
    var x1 = rb.left + rb.width / 2 - hr.left, y1 = rb.top + rb.height / 2 - hr.top;
    var n = opt.count || 3, ms = opt.ms || 760, gap = opt.gap != null ? opt.gap : 130, made = [];
    var arc = opt.arc != null ? opt.arc : Math.min(120, Math.abs(x1 - x0) * .18 + 24);
    var i, timers = [];
    for (i = 0; i < n; i++) {
      (function (idx) {
        timers.push(setTimeout(function () {
          var dot = document.createElement('span');
          dot.className = 'an-packet' + (opt.cls ? ' ' + opt.cls : '');
          if (opt.color) dot.style.background = opt.color;
          if (opt.label && idx === 0) { dot.className += ' lab'; dot.textContent = opt.label; }
          host.appendChild(dot);
          made.push(dot);
          run(ms, function (k) {
            var e = easeOut(k);
            var cx = x0 + (x1 - x0) * e;
            var cy = y0 + (y1 - y0) * e - Math.sin(Math.PI * e) * arc;
            dot.style.transform = 'translate(' + cx + 'px,' + cy + 'px) translate(-50%,-50%) scale(' + (.6 + .7 * Math.sin(Math.PI * k)) + ')';
            dot.style.opacity = String(k < .12 ? k / .12 : (k > .88 ? (1 - k) / .12 : 1));
          }, function () {
            if (dot.parentNode) dot.parentNode.removeChild(dot);
            if (idx === n - 1 && opt.done) opt.done();
          });
        }, idx * gap));
      })(i);
    }
    return reg(function () {
      timers.forEach(clearTimeout);
      made.forEach(function (d) { if (d.parentNode) d.parentNode.removeChild(d); });
    });
  }

  /* ---------- 聚焦脉冲 ---------- */
  function pulse(el, opt) {
    if (!el || !el.classList) return null;
    opt = opt || {};
    el.classList.add('an-pulse');
    var t = setTimeout(function () { el.classList.remove('an-pulse'); }, opt.ms || 2200);
    if (opt.scroll !== false) { try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) { /* 忽略 */ } }
    return reg(function () { clearTimeout(t); el.classList.remove('an-pulse'); });
  }

  /* ---------- 打字 ---------- */
  function typeIn(el, text, opt) {
    if (!el) return null;
    opt = opt || {};
    text = String(text == null ? el.textContent : text);
    var cps = opt.cps || 42;
    el.textContent = '';
    if (opt.caret !== false) el.classList.add('an-caret');
    return run(text.length / cps * 1000, function (k) {
      el.textContent = text.slice(0, Math.max(1, Math.round(text.length * k)));
    }, function () { el.textContent = text; el.classList.remove('an-caret'); if (opt.done) opt.done(); });
  }

  /* ---------- 条形生长 ---------- */
  function grow(x, opt) {
    opt = opt || {};
    var list = nodesOf(x), ms = opt.ms || 760, st = opt.stagger != null ? opt.stagger : 60;
    list.forEach(function (el, i) {
      var to = opt.to != null ? opt.to : parseFloat(el.getAttribute('data-to') || el.style.width || '0');
      var axis = opt.axis || 'width';
      el.style[axis] = '0%';
      var t = setTimeout(function () {
        run(ms, function (k) { el.style[axis] = (to * easeOut(k)) + '%'; }, function () { el.style[axis] = to + '%'; });
      }, i * st + (opt.delay || 0));
      reg(function () { clearTimeout(t); el.style[axis] = to + '%'; });
    });
    return list.length * st + ms;
  }

  /* ---------- 圆环进度 ---------- */
  function ring(el, pct, opt) {
    if (!el) return null;
    opt = opt || {};
    var r = parseFloat(el.getAttribute('r') || '0'), c = 2 * Math.PI * r;
    el.style.strokeDasharray = c + ' ' + c;
    el.style.strokeDashoffset = String(c);
    return run(opt.ms || 900, function (k) { el.style.strokeDashoffset = String(c * (1 - pct / 100 * easeOut(k))); },
               function () { el.style.strokeDashoffset = String(c * (1 - pct / 100)); });
  }

  /* ---------- 扫描光带 ---------- */
  function scan(el, opt) {
    if (!el || REDUCE) return null;
    opt = opt || {};
    el.classList.add('an-scan');
    var t = setTimeout(function () { el.classList.remove('an-scan'); }, opt.ms || 1400);
    return reg(function () { clearTimeout(t); el.classList.remove('an-scan'); });
  }

  window.DGG.anim = {
    timeline: timeline, count: count, drawSvg: drawSvg, rise: rise, stream: stream,
    packet: packet, pulse: pulse, typeIn: typeIn, grow: grow, ring: ring, scan: scan,
    stopAll: stopAll, run: run, ease: ease, easeOut: easeOut, fmt: fmtNum,
    get reduced() { return REDUCE; }
  };
})();
