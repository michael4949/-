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
  /* 工博会口径：显示名按物料定稿；key 是内核里的原名（积分表与内核 MODULE_NAME 仍按原名）。hidden 的模块不进导航与首页，但路由仍可达。 */
  var MODULES = [
    { id: 'm1',  key: '企业AI成熟度评估',     name: '企业AI成熟度评估',      sub: '六维打分',               icon: 'radar',   hidden: true },
    { id: 'm2',  key: '企业AI高价值场景排序', name: '场景优先级规划',        sub: '182 个场景库 · 4 维评估模型', icon: 'target' },
    { id: 'm3',  key: '企业AI投入ROI测算器',  name: '投入产出测算',          sub: '24 期现金流 · 3 档情景',  icon: 'calc' },
    { id: 'm4',  key: 'AI获客',               name: 'AI获客',                sub: '客户画像 · 线索评分 · 智能分派', icon: 'person' },
    { id: 'm5',  key: 'AI人力官',             name: 'AI人岗匹配与用工合规',  sub: '人岗匹配 · 合规审查',     icon: 'badge' },
    { id: 'm6',  key: 'AI CFO',               name: 'AI现金流与经营预警',    sub: '三表勾稽 · 13 周资金预测', icon: 'coin' },
    { id: 'm7',  key: 'AI法务',               name: '合同风险审查',          sub: '合同逐条过规则',          icon: 'scale',   hidden: true },
    { id: 'm8',  key: 'AI流程提效',           name: 'AI报工核验',            sub: '报工核验 · 瓶颈工序识别', icon: 'flow' },
    { id: 'm9',  key: 'AI决策',               name: 'AI经营指标分析',        sub: '指标归因 · 方案推演',     icon: 'compass' },
    { id: 'm10', key: 'AI ERP',               name: 'AI工序级排程',          sub: '工序级排程 · 插单多情景预演', icon: 'factory' },
    { id: 'm11', key: 'AI软件开发',           name: 'AI软件开发',            sub: '一句话需求变成可点页面',  icon: 'code',    hidden: true }
  ];
  MODULES.forEach(function (m) { m.credits = DATA.credits.perRun[m.key] || 0; });
  /* 制造业 8 个细分（首页与顶栏的行业下拉只列这些） */
  var MFG = []; DATA.industries.sectors.forEach(function (sec) { sec.industries.forEach(function (i) { if (/^mfg-/.test(i.slug)) MFG.push({ slug: i.slug, name: i.name }); }); });
  /* 15 分钟动线：模块末屏的「演示完成」改为「下一步」去这里 */
  var FLOW = { m2: { id: 'm3', label: '投入产出测算' }, m3: { id: 'connect', label: '选一个场景深潜' } };
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
    industrySlug: 'mfg-auto',
    company: null,
    credits: { spent: 0, remaining: CFG.credits.start },
    recommended: null,
    qrReady: false,
    idleHold: 0,           // >0 时暂停待机计时
    idleUntil: 0,
    activeModule: null
  };

  // ---------- DOM 引用 ----------
  var $main, $rail, $idle, $body = document.body;

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
    if (S.companyHint) { S.companyHint = null; if (!S.company) renderRail(); }
    if (S.activeModule && S.activeModule !== r.route) {
      if (BUILT[S.activeModule] && BUILT[S.activeModule].unmount) BUILT[S.activeModule].unmount();
      S.activeModule = null;
    }
    clear($main);
    setModuleTheme(r.route === 'home' || r.route === 'connect' || !BUILT[r.route] ? 'home' : r.route, r.step || '');
    if (r.route === 'connect') { $body.setAttribute('data-module', 'connect'); window.DGG.connect.render($main, api, r.step || ''); }
    else if (r.route === 'home' || !BUILT[r.route]) { renderHome(); S.recommended = null; }
    else { S.activeModule = r.route; BUILT[r.route].mount($main, r.step, api); }
    touch();
    scheduleHints();
  }

  // ---------- 滚动提示：可滚动且未到底的容器，底部出现渐隐带 + 下箭头（点箭头翻一屏） ----------
  var HINT_SEL = '.main, .pd-work, .pd-scroll, .pd-drawer > .bd';
  var hints = [], hintRaf = 0;
  function scheduleHints() { if (hintRaf) return; hintRaf = requestAnimationFrame(function () { hintRaf = 0; updateScrollHints(); }); }
  function hintFor(el) { for (var i = 0; i < hints.length; i++) if (hints[i].el === el) return hints[i]; return null; }
  function updateScrollHints() {
    var seen = [], shown = [];
    var overlay = document.querySelector('.pd-drawer-bg, .modal-bg'); /* 抽屉 / 弹窗打开时只给浮层内的滚动区出提示 */
    Array.prototype.forEach.call(document.querySelectorAll(HINT_SEL), function (el) {
      var r = el.getBoundingClientRect();
      var more = r.height > 120 && el.scrollHeight - el.clientHeight - el.scrollTop > 14;
      if (more && overlay && !overlay.contains(el)) more = false;
      /* 嵌套滚动区（卡内表格）：其底边落在外层提示带附近时不再单独出箭头，避免两枚箭头叠在一起 */
      if (more) for (var k = 0; k < shown.length; k++) { var o = shown[k]; if (o.el !== el && o.el.contains(el) && r.bottom > o.r.bottom - 110 && r.left < o.r.right && r.right > o.r.left) { more = false; break; } }
      if (more) shown.push({ el: el, r: r });
      var hh = hintFor(el);
      if (more) {
        if (!hh) {
          var node = h('div', { class: 'scroll-hint' + (el.classList.contains('pd-scroll') ? ' nested' : '') }, [h('button', { class: 'chev', 'aria-label': '向下', onclick: function () { el.scrollBy({ top: Math.round(el.clientHeight * 0.7), behavior: 'smooth' }); } })]);
          document.body.appendChild(node); hh = { el: el, node: node }; hints.push(hh);
        }
        hh.node.style.left = r.left + 'px'; hh.node.style.width = r.width + 'px'; hh.node.style.top = (r.bottom - (hh.node.offsetHeight || 80)) + 'px';
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

  // ---------- 当前模块主题：body[data-module] + 模块色变量（首页用品牌蓝） ----------
  function setModuleTheme(id, step) {
    var P = (window.DGG && window.DGG.PALETTE) || {}, c = P[id] || P.m1 || { pa: '#4974F6', pa2: '#38D4E8', soft: '#E8EFFD', ink: '#1E3FA8', hd1: '#1E3FA8', hd2: '#4974F6', hdt: '#fff', on: '#fff' };
    $body.setAttribute('data-module', id); $body.setAttribute('data-step', step || '');
    ['pa', 'pa2', 'soft', 'ink', 'hd1', 'hd2', 'hdt', 'on'].forEach(function (k) { $body.style.setProperty('--m-' + k, c[k]); });
    if (window.DGG && window.DGG.FX && window.DGG.FX.setModule) window.DGG.FX.setModule(id, c);
    syncScheme();
  }

  // ---------- 明暗场：首页与待机页用暗场底（深空），模块页用浅场底 ----------
  function syncScheme() {
    var dark = !!($idle && !$idle.classList.contains('hidden'));   /* 展台版首页是亮场，只有待机页压暗 */
    $body.classList.toggle('dark-scheme', !!dark);
    if (window.DGG && window.DGG.FX && window.DGG.FX.setScheme) window.DGG.FX.setScheme(dark ? 'dark' : 'light');
  }

  // ---------- 首页 · 工博会展板（home.js） ----------
  function byId(id) { for (var i = 0; i < MODULES.length; i++) if (MODULES[i].id === id) return MODULES[i]; return null; }
  function cardStyle(id) {
    var pc = (window.DGG && window.DGG.PALETTE && window.DGG.PALETTE[id]) || null;
    return pc ? '--c-pa:' + pc.pa + ';--c-pa2:' + pc.pa2 + ';--c-soft:' + pc.soft + ';--c-ink:' + pc.ink + ';--c-hd1:' + pc.hd1 + ';--c-hd2:' + pc.hd2 + ';--c-hdt:' + pc.hdt : null;
  }
  function openModule(m) { if (BUILT[m.id]) go(m.id); }
  function gridEl(onClick) {
    var g = h('div', { class: 'grid tiles' });
    MODULES.forEach(function (m) {
      if (m.hidden) return;
      g.appendChild(h('button', {
        class: 'card', 'data-id': m.id, disabled: !BUILT[m.id], style: cardStyle(m.id),
        onclick: function () { onClick && onClick(m); }
      }, [
        h('span', { class: 'icon', html: '<svg viewBox="0 0 24 24">' + ICONS[m.icon] + '</svg>' }),
        h('span', { class: 'name' }, [m.name]),
        h('span', { class: 'sub' }, [m.sub])
      ]));
    });
    return g;
  }
  function renderHome() { window.DGG.home.render($main, api); }

  // ---------- 右侧常驻栏 ----------
  function renderRail() {
    clear($rail);
    var c = S.company || S.companyHint; /* 未在外壳选企业时，显示当前产品模块已接入的企业 */
    var name = c && c.name ? c.name : (c ? '本企业' : '未选择');
    var meta = c ? (c.metaText != null ? c.metaText : [industryNameOf(c.industry), optText('size', c.size), c.province, optText('years', c.years)].filter(Boolean).join(' · ')) : '';
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
    var qrBox = h('div', { class: 'qr' + (S.qrReady ? ' ready' : ''), html: qrSvg(CFG.wechatUrl, 4) });
    qrBox.appendChild(h('div', { class: 'cap' }, ['扫码领取报告 · 专家咨询']));
    $rail.appendChild(h('div', {}, [h('h4', {}, ['企业微信']), qrBox]));
    $rail.appendChild(h('div', {}, [
      h('button', { class: 'btn lead', onclick: function () { window.DGG.lead.leadForm({}); } }, [h('b', {}, ['预约专家 · 入企 / 线上交流']), h('span', {}, ['顾问一对一 · 2 个工作日内联系'])]),
      h('div', { class: 'lead-cnt', html: '已预约 <b>' + window.DGG.lead.count() + '</b> 家企业 · <a href="#" class="csv">导出</a>', onclick: function (e) { if (e.target.classList.contains('csv')) { e.preventDefault(); window.DGG.lead.exportCsv(); } } })
    ]));
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
    /* 工博会版屏上不显示积分：只记状态，兼容内核的扣分回调 */
    void a; void b;
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

  // ---------- 价格：工博会版不上屏 ----------
  function renderPricebar() {}

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
    /* 待机 = 回到首页展板让它自己轮巡，只压一条「扫码预约」横幅 */
    go('home');
    clear($idle);
    $idle.appendChild(h('div', { class: 'idle-banner' }, [
      h('div', { class: 't' }, ['扫码预约 15 分钟现场演示']),
      h('div', { class: 's' }, ['让 AI 真正为业务增长负责 · 展位 6.2H-B018']),
      h('div', { class: 'q', html: qrSvg(CFG.wechatUrl, 4) })
    ]));
    $idle.classList.remove('hidden');
    syncScheme();
  }
  function hideIdle() {
    if ($idle.classList.contains('hidden')) return;
    $idle.classList.add('hidden');
    syncScheme();
    resetSession();
  }
  function resetSession() {
    // 退出待机 = 清场：企业、积分、微信高亮全部回到初始，落到本机默认页
    S.company = null; S.credits = { spent: 0, remaining: CFG.credits.start }; S.qrReady = false;
    renderRail();
    go.apply(null, defaultRoute());
  }
  function defaultRoute() {
    if (S.station === 'pad') return ['m2', 'input'];
    return ['home'];
  }
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (ev) {
    document.addEventListener(ev, function () {
      if (!$idle.classList.contains('hidden')) { hideIdle(); return; }
      touch();
    }, { passive: true });
  });
  // 展会现场不希望屏幕停一会儿就跳回首页：默认关闭待机，?idle=on 时才启用
  var IDLE_ON = /(?:^|[?&])idle=on(?:&|$)/.test(location.search) || S.station === 'tv';
  idleTimer = setInterval(function () {
    if (!IDLE_ON) return;
    if (S.idleHold) return;
    if (Date.now() > S.idleUntil && $idle.classList.contains('hidden')) showIdle();
  }, 1000);

  // ---------- 微信弹层 ----------
  function showWeChat() {
    holdIdle(true);
    var bg = h('div', { class: 'modal-bg', onclick: function (e) { if (e.target === bg) close(); } });
    var box = h('div', { class: 'modal', html: '<h3>扫码领取本报告</h3>' + qrSvg(CFG.wechatUrl, 6) + '<div class="cap">企业微信扫码 · 报告与专家咨询</div>' });
    box.appendChild(h('button', { class: 'btn ghost', onclick: function () { close(); window.DGG.lead.leadForm({}); } }, ['预约专家 · 入企 / 线上交流']));
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
    setCompanyHint: function (c) { S.companyHint = c || null; if (!S.company) renderRail(); },
    charge: charge, setQrReady: setQrReady, recommend: function (k) { S.recommended = k; renderPricebar(); },
    holdIdle: holdIdle, touch: touch, showWeChat: showWeChat, print: print, llm: llm,
    industryNameOf: industryNameOf, optText: optText, station: function () { return S.station; },
    isBuilt: function (id) { return !!BUILT[id]; },
    displayIndustryDefault: function () { return S.industrySlug; },
    industrySlug: function () { return S.industrySlug; },
    setIndustry: function (slug) {
      S.industrySlug = slug;
      var top = document.getElementById('industry'); if (top) top.value = slug;
      if (S.activeModule && BUILT[S.activeModule] && BUILT[S.activeModule].onIndustry) BUILT[S.activeModule].onIndustry(slug);
    },
    mfgIndustries: function () { return MFG.slice(); },
    modules: function () { return MODULES.filter(function (m) { return !m.hidden; }); },
    moduleName: function (id) { var m = byId(id); return m ? m.name : id; },
    flowNext: function (id) { return FLOW[id] || null; },
    qrSvg: qrSvg,
    deliver: function (host, o) { return window.DGG.lead.deliver(host, o); }
  };
  window.DGG.registerModule = function (id, impl) { BUILT[id] = impl; };
  window.DGG.shell = api;

  // ---------- 启动 ----------
  window.addEventListener('DOMContentLoaded', function () {
    $main = document.getElementById('main'); $rail = document.getElementById('rail');
    $idle = document.getElementById('idle');
    $body.setAttribute('data-station', S.station || 'desk');
    document.getElementById('logo').src = CFG.logo;
    var sel = document.getElementById('industry');
    MFG.forEach(function (i) { sel.appendChild(h('option', { value: i.slug }, [i.name])); });
    sel.value = S.industrySlug;
    sel.addEventListener('change', function () { api.setIndustry(sel.value); });
    document.getElementById('home-link').addEventListener('click', function () { go('home'); });
    renderRail();
    window.addEventListener('hashchange', render);
    if (!location.hash) { var d = defaultRoute(); location.hash = '#/' + d.join('/'); }
    render();
    if (S.station === 'tv') showIdle();
  });
})();
