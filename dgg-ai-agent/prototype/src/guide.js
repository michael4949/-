/* ==========================================================================
   guide.js · 现场引导层（m4–m11 每一屏）
   ------------------------------------------------------------------
   展台现场是销售在旁边讲、客户自己点。所以每一屏都要满足两件事：
     一、点得下去 —— 屏底常驻一条「下一步 · <下一屏名>」，由 frame() 按 tabs 自动算出，
         哪一屏都不会走到死路；末屏给「返回首页」，一轮演示自然收尾。
     二、不用找 —— 一个会跟着目标走的箭头，指着这一屏该点的那个按钮。
         点过一次之后箭头就移到「下一步」，保证客户一路点得下去，不会卡在某一屏反复点。

   箭头挑目标的顺序：
     1) 模块显式指定的 [data-guide]（模块知道本屏主操作是哪个就标它）
     2) 本屏第一个可用的主按钮 .pd-btn.primary
     3) 屏底的「下一步」
   抽屉 / 弹窗打开时箭头让位（那会儿该点的在浮层里，模块自己会标）。

   对外：window.DGG.guide = { mount(opts) → 句柄, clear() }
   ========================================================================== */
(function () {
  'use strict';
  window.DGG = window.DGG || {};

  var REDUCE = false;
  try { REDUCE = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { REDUCE = false; }

  /* 「这一屏已经点过主操作了」按 模块/屏 记住，屏内重绘不清零，换屏才清 */
  var USED = {};
  var cur = null;                      /* 当前挂载的句柄，同一时刻只有一个 */

  function h(tag, attrs, kids) {
    var el = document.createElement(tag), k;
    attrs = attrs || {};
    for (k in attrs) {
      if (!Object.prototype.hasOwnProperty.call(attrs, k) || attrs[k] == null || attrs[k] === false) continue;
      if (k === 'class') el.className = attrs[k];
      else if (k === 'html') el.innerHTML = attrs[k];
      else if (k.slice(0, 2) === 'on') el[k] = attrs[k];
      else el.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) { if (c == null) return; el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return el;
  }

  function clear() {
    if (!cur) return;
    try { cur.stop(); } catch (e) { /* 忽略 */ }
    cur = null;
  }

  function mount(o) {
    clear();
    var root = o.root, work = o.work;
    if (!root || !work) return null;
    var key = (o.id || '') + '/' + (o.step || '');

    /* ---------- 屏底「下一步」 ---------- */
    var isLast = !o.nextKey;
    var bar = h('div', { class: 'pd-next' + (isLast ? ' last' : '') });
    var goBtn = h('button', {
      class: 'go',
      onclick: function () {
        if (isLast) { if (o.onHome) o.onHome(); }
        else if (o.onNext) o.onNext(o.nextKey);
      }
    }, [
      h('span', { class: 'k' }, [isLast ? '演示完成' : '下一步']),
      h('span', { class: 'v' }, [isLast ? '返回首页' : (o.nextLabel || '')]),
      h('span', { class: 'ar', html: '<svg viewBox="0 0 24 24"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>' })
    ]);
    bar.appendChild(goBtn);
    (o.barHost || root.querySelector('.pd-body') || root).appendChild(bar);

    /* ---------- 跟随式箭头 ---------- */
    var arrow = h('div', { class: 'pd-arrow', 'aria-hidden': 'true' }, [
      h('span', { class: 'tip', html: '<svg viewBox="0 0 34 24"><path d="M2 12h24M20 4l9 8-9 8" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>' })
    ]);
    root.appendChild(arrow);
    var ring = h('div', { class: 'pd-guide-ring', 'aria-hidden': 'true' });
    root.appendChild(ring);

    var raf = 0, timer = 0, stopped = false, shown = false, lastTarget = null, scrolled = 0;

    function overlayOpen() { return !!root.querySelector('.pd-drawer-bg, .modal-bg'); }

    /* 箭头左边那一小块压没压到字：拿目标所在行里的文字节点实际矩形去碰
       （用 elementFromPoint 不行 —— 文字常挂在有子元素的容器上，命中的是容器不是那行字） */
    function occupied(tr) {
      var box = { l: tr.left - 62, r: tr.left - 6, t: tr.top + tr.height / 2 - 16, b: tr.top + tr.height / 2 + 16 };
      if (box.l < 0) return true;
      var scope = t0 && t0.parentNode && t0.parentNode.nodeType === 1 ? t0.parentNode : work;
      var walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, null);
      var n, rg = document.createRange(), i, rects;
      while ((n = walker.nextNode())) {
        if (!n.nodeValue || !n.nodeValue.trim()) continue;
        rg.selectNodeContents(n);
        rects = rg.getClientRects();
        for (i = 0; i < rects.length; i++) {
          var q = rects[i];
          if (!q.width || !q.height) continue;
          if (q.right > box.l && q.left < box.r && q.bottom > box.t && q.top < box.b) return true;
        }
      }
      return false;
    }

    /* 这一屏该点哪个，由模块显式告诉我们，不靠猜。
       之前用「本屏第一个主按钮」猜，驾驶舱这种总览屏就会指到角落里一张卡的侧向操作上去。
       顺序：模块标的 [data-guide] → 模块给的 aim 文字 → 屏底「下一步」。
       aim 传 'next' 表示这一屏本来就没有主操作（总览屏），直接指「下一步」。 */
    function byText(aim) {
      var list = work.querySelectorAll('button:not([disabled]), a[role="button"]'), i, el, txt;
      for (i = 0; i < list.length; i++) {
        el = list[i];
        if (el.offsetParent === null) continue;
        txt = (el.textContent || '').replace(/\s+/g, ' ').trim();
        if (txt && txt.indexOf(aim) === 0) return el;
      }
      for (i = 0; i < list.length; i++) {                         /* 退一步：包含也算 */
        el = list[i];
        if (el.offsetParent === null) continue;
        txt = (el.textContent || '').replace(/\s+/g, ' ').trim();
        if (txt && txt.indexOf(aim) >= 0) return el;
      }
      return null;
    }
    function pickTarget() {
      if (overlayOpen()) return null;
      if (!USED[key]) {
        var m = work.querySelector('[data-guide]:not([disabled])');
        if (m && m.offsetParent !== null) return m;
        if (o.aim && o.aim !== 'next') { var t = byText(o.aim); if (t) return t; }
      }
      return goBtn;
    }

    /* 目标在主区里被滚出视野时，箭头贴着可视边缘，不跑到框外 */
    var t0 = null;
    function place() {
      if (stopped) return;
      var t = pickTarget();
      t0 = t;
      if (!t) { arrow.classList.remove('on'); ring.classList.remove('on'); lastTarget = null; return; }
      var rr = root.getBoundingClientRect(), tr = t.getBoundingClientRect();
      if (!tr.width && !tr.height) { arrow.classList.remove('on'); ring.classList.remove('on'); return; }
      /* 目标被滚在屏外：先把它滚进来（每屏只滚一次），滚完还看不见就把箭头交给「下一步」，
         绝不出现「有目标却没箭头」—— 客户会以为没得点。 */
      var wr = work.getBoundingClientRect();
      /* 要求目标**整个**露出来再指：只露一半（卡在工作区下沿、被屏底那条压住）时，
         客户看到的是个半截按钮，先滚到居中再指 */
      if (work.contains(t) && !(tr.top >= wr.top - 2 && tr.bottom <= wr.bottom + 2)) {
        if (scrolled < 3) {
          scrolled++;
          try { t.scrollIntoView({ block: 'center', behavior: scrolled > 1 ? 'auto' : 'smooth' }); } catch (e) { /* 忽略 */ }
          setTimeout(schedule, 420);
          return;
        }
        t = goBtn; t0 = t; tr = t.getBoundingClientRect();     /* 滚了还看不见（被藏住了），交给「下一步」 */
      }

      /* 箭头默认放目标左侧；左边不够就放上方 */
      /* 默认放目标左侧；左边挤不下、或那块地方已经有字，就改放上方，别压着内容 */
      var side = 'left';
      if (tr.left - rr.left < 86 || occupied(tr)) side = 'top';
      var x, y;
      if (side === 'left') { x = tr.left - rr.left; y = tr.top - rr.top + tr.height / 2; }
      else { x = tr.left - rr.left + tr.width / 2; y = tr.top - rr.top; }
      arrow.setAttribute('data-side', side);
      arrow.style.transform = side === 'left'
        ? 'translate(' + (x - 14) + 'px,' + y + 'px) translate(-100%,-50%)'
        : 'translate(' + x + 'px,' + (y - 12) + 'px) translate(-50%,-100%)';
      ring.style.transform = 'translate(' + (tr.left - rr.left) + 'px,' + (tr.top - rr.top) + 'px)';
      ring.style.width = tr.width + 'px';
      ring.style.height = tr.height + 'px';
      if (shown) { arrow.classList.add('on'); ring.classList.add('on'); }
      bar.classList.toggle('dim', t !== goBtn);
      if (t !== lastTarget) { lastTarget = t; arrow.classList.remove('hop'); void arrow.offsetWidth; arrow.classList.add('hop'); }
    }
    function schedule() { if (raf || stopped) return; raf = requestAnimationFrame(function () { raf = 0; place(); }); }

    /* 本屏点过一次主操作，箭头就交给「下一步」 */
    function onClick(e) {
      var t = e.target;
      while (t && t !== work) { if (t.tagName === 'BUTTON' || t.tagName === 'A') break; t = t.parentNode; }
      if (!t || t === work) return;
      USED[key] = 1;
      setTimeout(schedule, 60);
    }
    work.addEventListener('click', onClick, true);

    var mo = null;
    if (window.MutationObserver) { mo = new MutationObserver(schedule); mo.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'disabled', 'data-guide'] }); }
    work.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);

    /* 进屏先让动画把话讲完，再亮箭头 */
    timer = setTimeout(function () { shown = true; place(); }, REDUCE ? 0 : (o.delay == null ? 1200 : o.delay));
    var tick = setInterval(schedule, 900);
    place();

    var handle = {
      refresh: schedule,
      target: function () { return pickTarget(); },
      stop: function () {
        stopped = true;
        clearTimeout(timer); clearInterval(tick);
        if (raf) cancelAnimationFrame(raf);
        if (mo) mo.disconnect();
        work.removeEventListener('click', onClick, true);
        work.removeEventListener('scroll', schedule, true);
        window.removeEventListener('resize', schedule);
        if (bar.parentNode) bar.parentNode.removeChild(bar);
        if (arrow.parentNode) arrow.parentNode.removeChild(arrow);
        if (ring.parentNode) ring.parentNode.removeChild(ring);
      }
    };
    cur = handle;
    return handle;
  }

  /* 换模块时把「点过」的记录清掉，下次进来还是从头引导 */
  function resetModule(id) {
    var k; for (k in USED) if (Object.prototype.hasOwnProperty.call(USED, k) && k.indexOf(id + '/') === 0) delete USED[k];
  }

  /* 这一屏该点哪：对话坞回答「下一步做什么」时要跟箭头指的是同一个按钮 */
  function target() { try { return cur && cur.target ? cur.target() : null; } catch (e) { return null; } }

  window.DGG.guide = { mount: mount, clear: clear, resetModule: resetModule, target: target, _used: USED };
})();
