/* 演示台外壳：路由 · station · 右侧常驻栏（当前企业 / 积分 / 微信）· 底栏价格条 · 待机页 · LLM 与打印钩子
 * 依赖：window.DGG_DATA（构建时内联）、window.DGG_CONFIG、qrcode（vendor）、DGG.makeLint
 */
(function () {
  'use strict';
  var CFG = window.DGG_CONFIG;
  var DATA = window.DGG_DATA;
  var lint = DGG.makeLint(DATA.lintWords);

  // ---------- 小工具 ----------
  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else if (v === false || v == null) return;
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, v);
    });
    (children || []).forEach(function (c) {
      if (c == null || c === false) return;
      el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    });
    return el;
  }
  function svgEl(tag, attrs) {
    var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.keys(attrs || {}).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    return el;
  }
  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }

  // ---------- 模块登记（DM 3+4+4，一字不改） ----------
  var MODULES = [
    { id: 'm1',  name: '企业AI成熟度评估',      sub: '六维打分，看清同行位置', big: true,  icon: 'radar' },
    { id: 'm2',  name: '企业AI高价值场景排序',  sub: '先做哪个场景最值',       big: true,  icon: 'target' },
    { id: 'm3',  name: '企业AI投入ROI测算器',   sub: '整批场景一次算清回收期',       big: true,  icon: 'calc' },
    { id: 'm4',  name: 'AI获客',                sub: '画像脚本线索一次出',     icon: 'person' },
    { id: 'm5',  name: 'AI人力官',              sub: 'JD简历面试合规成本',     icon: 'badge' },
    { id: 'm6',  name: 'AI CFO',                sub: '三表勾稽风险现金政策',   icon: 'coin' },
    { id: 'm7',  name: 'AI法务',                sub: '合同设立知产三件事',     icon: 'scale' },
    { id: 'm8',  name: 'AI流程提效',            sub: '千户代账流水线作业',     icon: 'flow' },
    { id: 'm9',  name: 'AI决策',                sub: '指标归因方案审批',       icon: 'compass' },
    { id: 'm10', name: 'AI ERP',                sub: '订单交付指挥室',         icon: 'factory' },
    { id: 'm11', name: 'AI软件开发',            sub: '一句需求变可点页面',     icon: 'code' }
  ];
  MODULES.forEach(function (m) { m.credits = DATA.credits.perRun[m.name]; });
  var ICONS = {
    radar:   '<path d="M12 3l7.8 4.5v9L12 21l-7.8-4.5v-9z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 7.5l3.9 2.25v4.5L12 16.5l-3.9-2.25v-4.5z" fill="currentColor" opacity=".25"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/>',
    target:  '<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/>',
    calc:    '<rect x="5" y="3" width="14" height="18" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="8" y="6" width="8" height="3.5" rx="1" fill="currentColor" opacity=".3"/><circle cx="9" cy="13.5" r="1.1" fill="currentColor"/><circle cx="12" cy="13.5" r="1.1" fill="currentColor"/><circle cx="15" cy="13.5" r="1.1" fill="currentColor"/><circle cx="9" cy="17" r="1.1" fill="currentColor"/><circle cx="12" cy="17" r="1.1" fill="currentColor"/><circle cx="15" cy="17" r="1.1" fill="currentColor"/>',
    person:  '<circle cx="12" cy="8" r="3.6" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M4.5 20c.8-4 3.9-6 7.5-6s6.7 2 7.5 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    badge:   '<path d="M12 3l2.2 2.4 3.2-.5.6 3.2 2.9 1.5-1.4 2.9 1.4 2.9-2.9 1.5-.6 3.2-3.2-.5L12 21l-2.2-2.4-3.2.5-.6-3.2-2.9-1.5 1.4-2.9-1.4-2.9 2.9-1.5.6-3.2 3.2.5z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M9 12l2 2 4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    coin:    '<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M9 9.5h6M9 12h6M12 7v10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    scale:   '<path d="M12 4v16M5 20h14M4 9l8-3 8 3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M4 9l-2.5 6h5zM20 9l-2.5 6h5z" fill="currentColor" opacity=".3"/>',
    flow:    '<rect x="3" y="4" width="6" height="5" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="15" y="4" width="6" height="5" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="9" y="15" width="6" height="5" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M6 9v3h12V9M12 12v3" fill="none" stroke="currentColor" stroke-width="1.8"/>',
    compass: '<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M15.5 8.5l-2 5-5 2 2-5z" fill="currentColor" opacity=".35" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>',
    factory: '<path d="M3 20V9l5 3V9l5 3V9l5 3v8z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M17 12V5h3v7" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="7" y="15" width="3" height="3" fill="currentColor" opacity=".35"/><rect x="13" y="15" width="3" height="3" fill="currentColor" opacity=".35"/>',
    code:    '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M13.5 5l-3 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'
  };
  var BUILT = {}; // 模块渲染器登记：DGG.registerModule(id, {mount, unmount})

  // ---------- 价格（docs/01，逐字） ----------
  var PRICES = [
    { key: 'lite',    name: '轻享版',   price: 0,     unit: '元/套年', seats: '30 坐席',       pts: '赠 10000 积分' },
    { key: 'std',     name: '标准版',   price: 1280,  unit: '元/套年', seats: '30~100 坐席',   pts: '赠 20000 积分' },
    { key: 'adv',     name: '高级版',   price: 2280,  unit: '元/套年', seats: '100~300 坐席',  pts: '赠 50000 积分' },
    { key: 'flag',    name: '旗舰版',   price: 3280,  unit: '元/套年', seats: '无限坐席',      pts: '赠 100000 积分' },
    { key: 'diag',    name: '入企诊断', price: 1980,  unit: '元',      seats: '1 天',          pts: '专家入企 AI 诊断' },
    { key: 'private', name: '私域部署', price: 12800, unit: '元起',    seats: '100 坐席起',    pts: '私享 12800 / 专享 22800 / 尊享 33800' }
  ];

  // ---------- 状态（全部内存，不用任何存储 API） ----------
  var S = {
    station: CFG.station,
    route: 'home',
    industryDisplay: 'manufacturing',
    company: null,
    credits: { spent: 0, remaining: CFG.credits.start },
    recommended: null,
    qrReady: false,
    idleHold: 0,           // >0 时暂停待机计时
    idleUntil: 0,
    activeModule: null
  };

  // ---------- DOM 引用 ----------
  var $main, $rail, $pricebar, $idle, $body = document.body;

  // ---------- 路由 ----------
  function parseHash() {
    var m = (location.hash || '').replace(/^#\/?/, '').split('/');
    return { route: m[0] || 'home', step: m[1] || '' };
  }
  function go(route, step) {
    var hash = '#/' + route + (step ? '/' + step : '');
    if (location.hash === hash) render(); else location.hash = hash;
  }
  function render() {
    var r = parseHash();
    if (S.activeModule && S.activeModule !== r.route) {
      if (BUILT[S.activeModule] && BUILT[S.activeModule].unmount) BUILT[S.activeModule].unmount();
      S.activeModule = null;
    }
    clear($main);
    if (r.route === 'home' || !BUILT[r.route]) { renderHome(); S.recommended = null; }
    else { S.activeModule = r.route; BUILT[r.route].mount($main, r.step, api); }
    renderPricebar();
    touch();
    scheduleHints();
  }

  // ---------- 滚动提示：可滚动且未到底的容器，底部出现渐隐带 + 下箭头（点箭头翻一屏） ----------
  var HINT_SEL = '.main, .pd-work, .pd-drawer > .bd';
  var hints = [], hintRaf = 0;
  function scheduleHints() { if (hintRaf) return; hintRaf = requestAnimationFrame(function () { hintRaf = 0; updateScrollHints(); }); }
  function hintFor(el) { for (var i = 0; i < hints.length; i++) if (hints[i].el === el) return hints[i]; return null; }
  function updateScrollHints() {
    var seen = [];
    Array.prototype.forEach.call(document.querySelectorAll(HINT_SEL), function (el) {
      var r = el.getBoundingClientRect();
      var more = r.height > 120 && el.scrollHeight - el.clientHeight - el.scrollTop > 14;
      var hh = hintFor(el);
      if (more) {
        if (!hh) {
          var node = h('div', { class: 'scroll-hint' }, [h('button', { class: 'chev', 'aria-label': '向下', onclick: function () { el.scrollBy({ top: Math.round(el.clientHeight * 0.7), behavior: 'smooth' }); } })]);
          document.body.appendChild(node); hh = { el: el, node: node }; hints.push(hh);
        }
        hh.node.style.left = r.left + 'px'; hh.node.style.width = r.width + 'px'; hh.node.style.top = (r.bottom - 64) + 'px';
        hh.node.classList.add('on');
      } else if (hh) hh.node.classList.remove('on');
      seen.push(el);
    });
    hints = hints.filter(function (x) { if (seen.indexOf(x.el) >= 0 && document.contains(x.el)) return true; if (x.node.parentNode) x.node.parentNode.removeChild(x.node); return false; });
  }
  document.addEventListener('scroll', scheduleHints, true);
  window.addEventListener('resize', scheduleHints);
  new MutationObserver(scheduleHints).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
  setInterval(scheduleHints, 1500);

  // ---------- 首页 11 宫格 ----------
  function renderHome() {
    $main.appendChild(h('div', { class: 'page-title' }, [h('h1', {}, ['薯片AI智能体']), h('span', { class: 'sub' }, ['AI 赋能企业经营全链路解决方案'])]));
    $main.appendChild(gridEl(function (m) { if (BUILT[m.id]) go(m.id); }));
  }
  function gridEl(onClick) {
    var g = h('div', { class: 'grid' });
    MODULES.forEach(function (m) {
      var card = h('button', {
        class: 'card' + (m.big ? ' big' : ''), 'data-id': m.id, disabled: !BUILT[m.id],
        onclick: function () { onClick && onClick(m); }
      }, [
        h('span', { class: 'icon', html: '<svg viewBox="0 0 24 24">' + ICONS[m.icon] + '</svg>' }),
        h('span', { class: 'name' }, [m.name]),
        h('span', { class: 'sub' }, [m.sub]),
        h('span', { class: 'cr' }, [h('b', { class: 'num' }, [String(m.credits)]), ' 积分'])
      ]);
      g.appendChild(card);
    });
    return g;
  }

  // ---------- 右侧常驻栏 ----------
  function renderRail() {
    clear($rail);
    var c = S.company;
    var name = c && c.name ? c.name : (c ? '本企业' : '未选择');
    var meta = c ? [industryNameOf(c.industry), optText('size', c.size), c.province, optText('years', c.years)].filter(Boolean).join(' · ') : '';
    var picker = h('div', { class: 'picker' });
    var menu = null;
    var toggle = h('button', { class: 'link', onclick: function () {
      if (menu) { picker.removeChild(menu); menu = null; return; }
      menu = h('div', { class: 'menu' });
      DATA.companies.forEach(function (sc) {
        menu.appendChild(h('button', { onclick: function () { setCompany(sc.profile); picker.removeChild(menu); menu = null; } }, [sc.profile.name]));
      });
      menu.appendChild(h('button', { class: 'muted', onclick: function () { setCompany(null); picker.removeChild(menu); menu = null; } }, ['清空']));
      picker.appendChild(menu);
    } }, ['切换']);
    picker.appendChild(toggle);
    $rail.appendChild(h('div', {}, [
      h('h4', {}, ['当前企业']),
      h('div', { class: 'company-name' }, [name]),
      meta ? h('div', { class: 'company-meta' }, [meta]) : null,
      picker
    ]));
    $rail.appendChild(h('div', {}, [
      h('h4', {}, ['积分']),
      h('div', { class: 'credits' }, [
        h('div', { class: 'credit spent' }, [h('div', { class: 'k' }, ['本次消耗']), h('div', { class: 'v num', id: 'cr-spent' }, [String(S.credits.spent)])]),
        h('div', { class: 'credit' }, [h('div', { class: 'k' }, ['剩余']), h('div', { class: 'v num', id: 'cr-left' }, [fmt(S.credits.remaining)])])
      ])
    ]));
    var qrBox = h('div', { class: 'qr' + (S.qrReady ? ' ready' : ''), html: qrSvg(CFG.wechatUrl, 4) });
    qrBox.appendChild(h('div', { class: 'cap' }, ['扫码接收结果']));
    $rail.appendChild(h('div', {}, [h('h4', {}, ['结果发送到微信']), qrBox]));
    if (S.station === '2') $rail.appendChild(h('div', { id: 'agent-status' }, [h('h4', {}, ['智能体状态'])]));
  }
  function animateNum(el, from, to, ms) {
    var t0 = performance.now();
    (function step(t) {
      var k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(Math.round(from + (to - from) * e));
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }
  function charge(n) {
    var a = S.credits.spent, b = S.credits.remaining;
    S.credits.spent = n; S.credits.remaining = Math.max(0, b - n);
    var e1 = document.getElementById('cr-spent'), e2 = document.getElementById('cr-left');
    if (e1) animateNum(e1, a, n, 500);
    if (e2) animateNum(e2, b, S.credits.remaining, 700);
  }
  function setQrReady(on) {
    S.qrReady = !!on;
    var q = $rail.querySelector('.qr'); if (q) q.classList.toggle('ready', S.qrReady);
  }
  function setCompany(c) {
    S.company = c ? JSON.parse(JSON.stringify(c)) : null;
    renderRail();
    if (S.activeModule && BUILT[S.activeModule].onCompany) BUILT[S.activeModule].onCompany(S.company);
  }
  function industryNameOf(slug) {
    var hit = null;
    DATA.industries.sectors.forEach(function (s) { s.industries.forEach(function (i) { if (i.slug === slug) hit = i; }); });
    return hit ? hit.name : slug;
  }
  function optText(key, v) {
    var f = DATA.fields.filter(function (x) { return x.key === key; })[0];
    var o = f && f.options ? f.options.filter(function (x) { return x.v === v; })[0] : null;
    return o ? o.t : (v == null ? '' : String(v));
  }
  function qrSvg(text, cell) {
    try {
      var q = qrcode(0, 'M'); q.addData(text); q.make();
      return q.createSvgTag({ cellSize: cell, margin: 0, scalable: true });
    } catch (e) { return ''; }
  }

  // ---------- 底栏价格条 ----------
  var popEl = null;
  function renderPricebar() {
    clear($pricebar); popEl = null;
    PRICES.forEach(function (p) {
      var pill = h('button', { class: 'pill' + (S.recommended === p.key ? ' rec' : ''), onclick: function (ev) { togglePop(p, ev.currentTarget); } }, [
        h('span', {}, [p.name]), h('span', { class: 'p num' }, [fmt(p.price)]), h('span', { class: 'u' }, [p.unit])
      ]);
      $pricebar.appendChild(pill);
    });
  }
  function togglePop(p, anchor) {
    if (popEl) { $pricebar.removeChild(popEl); var same = popEl._key === p.key; popEl = null; if (same) return; }
    popEl = h('div', { class: 'pop' }, [
      h('b', {}, [p.name, ' ', h('span', { class: 'num', style: 'color:var(--brand)' }, [fmt(p.price)]), ' ', p.unit]),
      h('div', { class: 'row' }, [h('span', {}, ['坐席']), h('span', {}, [p.seats])]),
      h('div', { class: 'row' }, [h('span', {}, ['积分']), h('span', {}, [p.pts])])
    ]);
    popEl._key = p.key;
    popEl.style.left = anchor.offsetLeft + 'px';
    $pricebar.appendChild(popEl);
  }
  document.addEventListener('click', function (e) {
    if (popEl && !$pricebar.contains(e.target)) { $pricebar.removeChild(popEl); popEl = null; }
  });

  // ---------- 待机页 ----------
  var idleTimer = null, litTimer = null;
  function touch() { S.idleUntil = Date.now() + (S.idleHold ? 1e12 : idleMs()); }
  function idleMs() {
    var r = parseHash();
    if (S.station === '2') return CFG.idle.defaultMs;
    if (r.step === 'result') return CFG.idle.resultMs;
    if (r.step === 'quiz') return CFG.idle.quizMs;
    return CFG.idle.defaultMs;
  }
  function holdIdle(on) { S.idleHold += on ? 1 : -1; if (S.idleHold < 0) S.idleHold = 0; touch(); }
  function showIdle() {
    if (!$idle.classList.contains('hidden')) return;
    clear($idle);
    $idle.appendChild(h('div', { class: 'brand' }, [h('img', { src: CFG.logo, alt: '顶呱呱' }), h('div', { class: 't' }, ['薯片AI智能体'])]));
    $idle.appendChild(h('div', { class: 'nums' }, [
      h('div', { class: 'n' }, [h('div', { class: 'k' }, ['增值业绩增长率']), h('div', { class: 'v num' }, [h('span', { class: 'arrow' }, ['↑']), '30%'])]),
      h('div', { class: 'n' }, [h('div', { class: 'k' }, ['解决方案输出时间']), h('div', { class: 'v num' }, [h('span', { class: 'arrow' }, ['↓']), '15分钟'])]),
      h('div', { class: 'n' }, [h('div', { class: 'k' }, ['财务出错率']), h('div', { class: 'v num' }, [h('span', { class: 'arrow' }, ['↓']), '5%以下'])])
    ]));
    var g = gridEl(null); $idle.appendChild(g);
    $idle.appendChild(h('div', { class: 'foot' }, [h('b', {}, ['18 年']), ' 行业沉淀 · ', h('b', {}, ['530 万+']), ' 真实数据验证　　培育企业核心竞争力，让老板经营企业更简单']));
    $idle.classList.remove('hidden');
    var cards = g.querySelectorAll('.card'), i = 0;
    litTimer = setInterval(function () {
      cards.forEach(function (c) { c.classList.remove('lit'); });
      cards[i % cards.length].classList.add('lit'); i++;
    }, 1400);
  }
  function hideIdle() {
    if ($idle.classList.contains('hidden')) return;
    $idle.classList.add('hidden'); clearInterval(litTimer);
    resetSession();
  }
  function resetSession() {
    // 退出待机 = 清场：企业、积分、微信高亮全部回到初始，落到本机默认页
    S.company = null; S.credits = { spent: 0, remaining: CFG.credits.start }; S.qrReady = false;
    renderRail();
    go.apply(null, defaultRoute());
  }
  function defaultRoute() {
    if (S.station === '1') return ['m1', 'input'];
    return ['home'];
  }
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (ev) {
    document.addEventListener(ev, function () {
      if (!$idle.classList.contains('hidden')) { hideIdle(); return; }
      touch();
    }, { passive: true });
  });
  // 展会现场不希望屏幕停一会儿就跳回首页：默认关闭待机，?idle=on 时才启用
  var IDLE_ON = /(?:^|[?&])idle=on(?:&|$)/.test(location.search);
  idleTimer = setInterval(function () {
    if (!IDLE_ON) return;
    if (S.idleHold) return;
    if (Date.now() > S.idleUntil && $idle.classList.contains('hidden')) showIdle();
  }, 1000);

  // ---------- 微信弹层 ----------
  function showWeChat() {
    holdIdle(true);
    var bg = h('div', { class: 'modal-bg', onclick: function (e) { if (e.target === bg) close(); } });
    var box = h('div', { class: 'modal', html: '<h3>结果发送到微信</h3>' + qrSvg(CFG.wechatUrl, 6) + '<div class="cap">微信扫码，结果即刻送达</div>' });
    box.appendChild(h('button', { class: 'btn', onclick: close }, ['完成']));
    bg.appendChild(box); document.body.appendChild(bg);
    function close() { document.body.removeChild(bg); holdIdle(false); }
  }

  // ---------- 打印 ----------
  function print() {
    holdIdle(true);
    var done = function () { holdIdle(false); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    setTimeout(window.print, 50);
  }

  // ---------- LLM（可选，8 秒，失败即模板） ----------
  function llm(prompt, timeoutMs) {
    var ep = CFG.llm && CFG.llm.endpoint;
    if (!ep) return Promise.resolve({ skipped: true });
    var ctrl = new AbortController();
    var t = setTimeout(function () { ctrl.abort(); }, timeoutMs || CFG.llm.timeoutMs);
    holdIdle(true);
    return fetch(ep, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: CFG.llm.model, prompt: prompt }), signal: ctrl.signal })
      .then(function (r) { return r.json(); })
      .then(function (j) { clearTimeout(t); holdIdle(false); return { text: j.text || j.content || '' }; })
      .catch(function () { clearTimeout(t); holdIdle(false); return { failed: true }; });
  }

  // ---------- 对模块暴露的 API ----------
  var api = {
    h: h, svgEl: svgEl, fmt: fmt, clear: clear, go: go, DATA: DATA, CFG: CFG, lint: lint,
    getCompany: function () { return S.company; }, setCompany: setCompany,
    charge: charge, setQrReady: setQrReady, recommend: function (k) { S.recommended = k; renderPricebar(); },
    holdIdle: holdIdle, touch: touch, showWeChat: showWeChat, print: print, llm: llm,
    industryNameOf: industryNameOf, optText: optText, station: function () { return S.station; },
    isBuilt: function (id) { return !!BUILT[id]; },
    displayIndustryDefault: function () {
      var d = DATA.industries.display.filter(function (x) { return x.key === S.industryDisplay; })[0];
      return d ? d.default : null;
    }
  };
  window.DGG.registerModule = function (id, impl) { BUILT[id] = impl; };
  window.DGG.shell = api;

  // ---------- 启动 ----------
  window.addEventListener('DOMContentLoaded', function () {
    $main = document.getElementById('main'); $rail = document.getElementById('rail');
    $pricebar = document.getElementById('pricebar'); $idle = document.getElementById('idle');
    $body.setAttribute('data-station', S.station || '3');
    document.getElementById('logo').src = CFG.logo;
    var sel = document.getElementById('industry');
    DATA.industries.display.forEach(function (d) { sel.appendChild(h('option', { value: d.key }, [d.name])); });
    sel.value = S.industryDisplay;
    sel.addEventListener('change', function () {
      S.industryDisplay = sel.value;
      if (S.activeModule && BUILT[S.activeModule].onIndustry) BUILT[S.activeModule].onIndustry(api.displayIndustryDefault());
    });
    document.getElementById('home-link').addEventListener('click', function () { go('home'); });
    renderRail();
    window.addEventListener('hashchange', render);
    if (!location.hash) { var d = defaultRoute(); location.hash = '#/' + d.join('/'); }
    render();
    if (S.station === '2') showIdle();
  });
})();
