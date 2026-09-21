/* AI ERP · 订单交付指挥室（六屏）
 * 接入 → 指挥室 → 订单下钻 → 插单模拟 → 物料与库存 → 交付日报
 * 每屏三拍：接入（来源亮起、数据包飞向排程引擎）→ 展开（数字滚、路径画、条形长、行流入）→ 结论（一句话横幅 + 聚焦）
 * 全部计算走 DGG.coreM10（与 skill 同一份内核），开场发现 / 快捷问句 / 问答 / 文档摄入也在内核里
 * （screens / brief / suggest / ask / ingest）；本文件在 DGG.chatBrain('m10') 上只登记 ctx（取上下文）与 act（把声明式动作落到页面）
 * 纯预制、断网可用；不用任何存储 API
 */
(function () {
  'use strict';
  var sh, $root, h, DATA, P, K;
  var ACCENT = window.DGG.PALETTE.m10;
  var CAPS = ['订单交付预警', '智能排产与插单模拟', '库存与安全库存预警', '交付日报'];
  var ARCHE = { make: { name: '制造型' }, flow: { name: '流通型' }, project: { name: '项目型' }, service: { name: '服务型' } };
  var PRIO = { 0: '插单', 1: '重点', 2: '普通', 3: '备货', 9: '排队' };
  var M = { step: 'connect', arche: null, data: null, S: null, plan: null, daily: null, focus: null, filter: null,
    charged: false, name: null, company: null, insert: { req: null, sim: null, pick: null }, who: 0, frame: null, pos: [],
    told: null, replay: null, lastStep: null };

  function anim() { return window.DGG.anim; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function cut(s, n) { s = String(s == null ? '' : s); return s.length > n ? s.slice(0, n) + '…' : s; }

  /* 口径统一：屏上只出现系统里会出现的词 */
  function TX(s) {
    return String(s == null ? '' : s)
      .replace(/最晚下单日/g, '下单截止日').replace(/最晚下单/g, '下单截止')
      .replace(/最晚/g, '不晚于').replace(/最接近/g, '更贴近').replace(/最少/g, '较少').replace(/最久/g, '居首')
      .replace(/承诺/g, '约定').replace(/必须/g, '须')
      .replace(/刀具/g, '刃具').replace(/刀片/g, '铣刃');
  }
  function deepTX(o) {
    if (typeof o === 'string') return TX(o);
    if (!o || typeof o !== 'object') return o;
    if (Object.prototype.toString.call(o) === '[object Array]') return o.map(deepTX);
    var out = {}, k;
    for (k in o) if (Object.prototype.hasOwnProperty.call(o, k)) out[k] = deepTX(o[k]);
    return out;
  }

  /* ---------- 数据 ---------- */
  function sectorOf(slug) {
    var hit = null;
    (DATA.industries.sectors || []).forEach(function (s) { (s.industries || []).forEach(function (i) { if (i.slug === slug) hit = s.key; }); });
    return hit;
  }
  function archeOf(slug) { var sec = sectorOf(slug); return (sec && DATA.m10.archetypes.map[sec]) || 'make'; }
  function V() { return M.data.vocab; }
  function loadArche(a) {
    M.arche = a;
    var base = deepTX(clone(DATA.m10.samples[a]));
    base.vocab = deepTX(clone(DATA.m10.archetypes.vocab[a]));
    if (M.name) base.company = M.name;
    if (M.company && M.company.systems) {
      var sys = M.company.systems;
      base.sources.forEach(function (s) {
        if (s.id === 'erp' || s.id === 'oms' || s.id === 'pm' || s.id === 'crm') s.mode = sys.indexOf('erp') >= 0 || sys.indexOf('crm') >= 0 ? 'direct' : 'import';
        if (s.id === 'mes') s.mode = sys.indexOf('mes') >= 0 ? 'direct' : 'import';
      });
    }
    M.data = base; M.focus = null; M.filter = null; M.insert = { req: null, sim: null, pick: null }; M.pos = []; M.told = null;
    recompute();
  }
  function recompute() {
    M.S = K.schedule(M.data);
    M.plan = K.purchasePlan(M.data, M.S);
    M.daily = K.daily(M.data, M.S, M.plan);
  }
  function commit(data, msg) { M.data = data; recompute(); draw(); if (msg && M.frame) P.toast(M.frame.body, msg); }
  /* 屏上的「重算 / 刷新」：按同一份数据重跑排程，再把这一屏的时间轴从头放一遍 */
  function recalc() { recompute(); M.told = null; draw(); }
  function fmtN(n) { return P.fmtN(n); }
  function dayLabel(d) { return K.short(M.data, d); }
  function col(cls, kids) { return h('div', { class: cls, style: 'display:flex;flex-direction:column;gap:16px' }, kids); }

  /* ---------- 叙事件：滚动数字 · 接入带 · 结论横幅 ---------- */
  function cnt(to, o) {
    o = o || {};
    var dec = o.dec || 0;
    return h('b', { class: 'm10-cnt num', 'data-to': String(to), 'data-dec': String(dec), 'data-suf': o.suf || '' }, [dec ? (0).toFixed(dec) : '0']);
  }
  function resetCounts(scope) {
    if (!scope) return;
    Array.prototype.forEach.call(scope.querySelectorAll('.m10-cnt'), function (e) {
      var dec = +e.getAttribute('data-dec') || 0;
      e.textContent = dec ? (0).toFixed(dec) : '0';
    });
  }
  function runCounts(scope, ms) {
    if (!scope) return;
    Array.prototype.forEach.call(scope.querySelectorAll('.m10-cnt'), function (e) {
      anim().count(e, parseFloat(e.getAttribute('data-to')) || 0, { decimals: +e.getAttribute('data-dec') || 0, unit: e.getAttribute('data-suf') || '', ms: ms || 900 });
    });
  }
  function vd(text) { return h('div', { class: 'c12 m10-say off' }, [h('span', { class: 'ic' }, ['AI']), h('b', {}, [text])]); }
  function flowBar(o) {
    var srcWrap = h('div', { class: 'src' }, o.src.map(function (s) { return h('div', { class: 's' }, [h('b', {}, [s[0]]), h('span', {}, [s[1]])]); }));
    var hub = h('div', { class: 'hub' }, [h('span', { class: 'an-live' }), h('b', {}, [o.hub])]);
    var out = h('div', { class: 'out' }, [h('b', {}, [o.out[0]]), h('span', {}, [o.out[1]])]);
    var el = h('div', { class: 'c12 m10-flow' }, [srcWrap, h('span', { class: 'pipe an-pipe' }), hub, h('span', { class: 'pipe an-pipe' }), out, h('span', { class: 'sp' }),
      P.btn(o.btn, { cls: 'sm', onClick: function () { if (o.onClick) o.onClick(); else if (M.replay) M.replay(); } })]);
    el.hub = hub; el.out = out;
    el.srcs = Array.prototype.slice.call(srcWrap.children);
    return el;
  }
  /* 三拍：接入 0–0.8s · 展开 0.8–2.3s · 结论 2.3–2.9s
     进屏走全程；屏内动作（执行处置、生成采购单、换单）只走后两拍的短版 */
  function story(o) {
    function run(full) {
      var A = anim(), t0 = full ? 820 : 0, tv = full ? 2300 : 660;
      A.stopAll();
      var rises = (o.rise || []).filter(Boolean);
      rises.forEach(function (n) { n.style.opacity = '0'; });
      if (full) resetCounts(o.work);
      if (o.verdict) { o.verdict.classList.add('off'); o.verdict.classList.remove('an-verdict'); }
      if (o.paths && o.paths.length) A.drawSvg(o.paths, full ? 950 : 620, t0 + 60);
      if (o.bars && o.bars.length) A.grow(o.bars, { stagger: full ? 46 : 24, ms: full ? 720 : 460, delay: t0 + 20 });
      if (o.rows && o.rows.length) A.stream(o.rows, { stagger: full ? 66 : 30, delay: t0 });
      var T = A.timeline();
      if (full) {
        T.at(0, function () { if (o.src && o.src.length) A.rise(o.src, { stagger: 55, from: 'left', ms: 380 }); });
        T.at(190, function () { if (o.from && o.to) A.packet(o.from, o.to, { count: 3, ms: 600, gap: 105, label: o.label }); });
        T.at(540, function () { if (o.to) A.scan(o.to, { ms: 880 }); if (o.scan) A.scan(o.scan, { ms: 1150 }); });
        T.at(670, function () { if (o.to && o.tail) A.packet(o.to, o.tail, { count: 2, ms: 520, gap: 95 }); });
      }
      T.at(t0, function () {
        runCounts(o.work, full ? 900 : 540);
        if (rises.length) A.rise(rises, { stagger: full ? 68 : 30, ms: full ? 440 : 320 });
      });
      T.at(tv, function () {
        if (o.verdict) { o.verdict.classList.remove('off'); o.verdict.classList.add('an-verdict'); }
        if (o.focus) A.pulse(o.focus, { ms: 1400, scroll: false });
      });
      T.play();
    }
    var first = M.told !== M.step;
    M.told = M.step;
    M.replay = function () { run(true); };
    run(first);
  }
  function uniq(list, key) { var seen = {}, out = []; (list || []).forEach(function (x) { var k = key ? key(x) : x; if (seen[k]) return; seen[k] = 1; out.push(x); }); return out; }
  function tomorrowList() { return uniq(M.daily.tomorrow, function (t) { return TX(t.text); }); }
  function nodes(scope, sel) { return scope ? Array.prototype.slice.call(scope.querySelectorAll(sel)) : []; }
  function trs(el, n) { var l = el ? Array.prototype.slice.call(el.querySelectorAll('tbody tr')) : []; return n ? l.slice(0, n) : l; }
  /* 给行 / 卡片标上业务 id，内核的 {type:'focus'|'open', ref} 就能找到它 */
  function tagRefs(tbl, rows, textOf, refOf) {
    trs(tbl).forEach(function (tr) {
      var t = tr.textContent, i, s2;
      for (i = 0; i < rows.length; i++) { s2 = textOf(rows[i]); if (s2 && t.indexOf(s2) >= 0) { tr.setAttribute('data-ref', refOf(rows[i])); return; } }
    });
  }
  function workEl() { return M.frame ? M.frame.work : null; }
  function rowOf(scope, txt) {
    var list = scope ? scope.querySelectorAll('.pd-table tbody tr') : [], i;
    for (i = 0; i < list.length; i++) if (list[i].textContent.indexOf(txt) >= 0) return list[i];
    return null;
  }
  function focusSel(sel, ms) {
    setTimeout(function () { var el = workEl() && workEl().querySelector(sel); if (el) anim().pulse(el, { ms: 2200, scroll: true }); }, ms || 140);
  }
  function srcCells() {
    return (M.data.sources || []).map(function (s) { return [cut(s.name, 6), fmtN(s.rows) + ' 条']; });
  }
  /* 7 天平均负荷曲线（各产线当日 pct 取平均），用于「画出来」的那根线 */
  function loadPath(w, hgt) {
    var S = M.S, n = 7, pts = [], i, j, sum, cnt2;
    for (i = 0; i < n; i++) {
      sum = 0; cnt2 = 0;
      for (j = 0; j < S.lines.length; j++) { var c = S.lines[j].days[i]; if (c && !c.rest) { sum += c.pct; cnt2++; } }
      pts.push(cnt2 ? Math.round(sum / cnt2) : 0);
    }
    var max = Math.max(100, Math.max.apply(null, pts));
    var sx = function (k) { return 2 + k * (w - 4) / (n - 1); };
    var sy = function (v) { return hgt - 3 - v * (hgt - 8) / max; };
    var d = pts.map(function (p, k) { return (k ? 'L' : 'M') + sx(k).toFixed(1) + ' ' + sy(p).toFixed(1); }).join(' ');
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 ' + w + ' ' + hgt); s.setAttribute('class', 'm10-curve'); s.setAttribute('preserveAspectRatio', 'none');
    var base = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    base.setAttribute('x1', 2); base.setAttribute('x2', w - 2); base.setAttribute('y1', sy(100)); base.setAttribute('y2', sy(100)); base.setAttribute('class', 'full');
    var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', d); p.setAttribute('class', 'ln');
    s.appendChild(base); s.appendChild(p);
    s.path = p; s.pts = pts;
    return s;
  }

  /* ---------- 生命周期 ---------- */
  /* 现场引导：每一屏箭头该指哪个按钮（按钮文字前缀匹配）。'next' = 本屏是总览，直接指屏底「下一步」。
     不靠「猜本屏第一个主按钮」，那样总览屏会指到角落里一张卡的侧向操作上去。 */
  var GUIDE_AIM = { connect: '进入订单交付指挥室', room: 'next', order: '执行', insert: '按方案', stock: '生成', daily: '发送到微信' };

  function mount(root, step, shell) {
    sh = shell; $root = root; h = sh.h; DATA = sh.DATA; P = window.DGG.pui; K = window.DGG.coreM10;
    P.init(sh);
    var c = sh.getCompany();
    if (!M.data) { M.company = c; M.name = c ? c.name : null; loadArche(c ? archeOf(c.industry) : archeOf(sh.displayIndustryDefault())); }
    M.step = step || (M.charged && M.lastStep ? M.lastStep : 'connect');
    if (['connect', 'room', 'order', 'insert', 'stock', 'daily'].indexOf(M.step) < 0) M.step = 'connect';
    draw();
  }
  function unmount() { M.replay = null; }
  function onCompany(c) {
    M.company = c; M.name = c ? c.name : null; M.charged = false; M.lastStep = null;
    loadArche(c ? archeOf(c.industry) : archeOf(sh.displayIndustryDefault()));
    if (M.step !== 'connect') setStep('connect'); else draw();
  }
  function onIndustry(slug) {
    if (M.step !== 'connect' || !slug) return;
    var a = archeOf(slug); if (a !== M.arche) { loadArche(a); draw(); }
  }
  function setStep(s) { M.step = s; M.lastStep = s; sh.go('m10', s); }

  /* ---------- 框架 ---------- */
  function draw() {
    sh.clear($root);
    var v = V(), k = M.S.kpi;
    var c = M.company;
    var meta = c ? [sh.industryNameOf(c.industry), sh.optText('size', c.size)].filter(Boolean).join(' · ') : ARCHE[M.arche].name;
    var tabs = [
      { key: 'connect', label: '接入' }, { key: 'room', label: v.room, badge: k.late || 0 }, { key: 'order', label: v.order + '下钻' },
      { key: 'insert', label: v.insert }, { key: 'stock', label: v.materials, badge: M.plan.summary.short || 0 }, { key: 'daily', label: v.daily }
    ];
    var F = P.frame({ mark: 'ERP', accent: ACCENT, modules: P.navModules('m10'),
      crumbs: ['AI ERP', tabs.filter(function (t) { return t.key === M.step; })[0].label], company: { name: M.data.company, meta: meta },
      tabs: tabs, active: M.step, guideAim: GUIDE_AIM[M.step],
      chat: { id: 'm10', name: 'AI ERP', step: M.step, onGo: setStep },
      onTab: function (key) { if (key === 'room' && !M.charged) enterRoom(); else setStep(key); } });
    M.frame = F; $root.appendChild(F.root);
    if (M.step === 'room' && !M.charged) { M.charged = true; sh.charge(K.CREDITS); }
    ({ connect: screenConnect, room: screenRoom, order: screenOrder, insert: screenInsert, stock: screenStock, daily: screenDaily })[M.step](F.work);
  }
  function enterRoom() { setStep('room'); }

  /* ---------- 屏 1：接入 ---------- */
  function screenConnect(work) {
    var v = V(), d = M.data, S = M.S, k = S.kpi;
    work.classList.add('m10-connect');
    var g = h('div', { class: 'pd-grid m10-g' });
    var fb = flowBar({ src: srcCells(), hub: v.due + '倒推', out: [k.open + ' / ' + k.late, v.orders + ' / 延期'], btn: '重新同步', onClick: recalc });
    g.appendChild(fb);
    var kpiRow = h('div', { class: 'c12' }, [P.kpis([
      { label: v.orders, value: cnt(k.open), unit: v.counter, sub: '完工 ' + k.done },
      { label: '延期', value: cnt(k.late), unit: v.counter, tone: 'late', sub: '合计晚 ' + k.lateDaysTotal + ' 天' },
      { label: '风险', value: cnt(k.risk), unit: v.counter, tone: 'risk', sub: '余量不足 / 等料' },
      { label: v.material + '缺口', value: cnt(M.plan.summary.short), unit: '项', tone: M.plan.summary.short ? 'late' : 'ok', sub: '今日须下单 ' + M.plan.items.filter(function (x) { return x.suggestQty > 0 && x.latestOrderDay <= 0; }).length + ' 项' },
      { label: v.line, value: cnt(d.lines.length), unit: '条', sub: '窗口 ' + d.horizon + ' 天' }
    ])]);
    g.appendChild(kpiRow);
    var worst = S.orders.filter(function (o) { return o.status === 'late'; }).sort(function (a, b) { return b.lateDays - a.lateDays; })[0];
    var say = vd(worst ? k.open + ' ' + v.counter + v.orders + '，' + k.late + ' ' + v.counter + '已延期合计 ' + k.lateDaysTotal + ' 天，' + worst.id + ' 晚 ' + worst.lateDays + ' 天。'
      : k.open + ' ' + v.counter + v.orders + '全部按期，按期率 ' + k.onTimeRate + '%。');
    g.appendChild(say);

    /* 企业 + 业态 */
    var nameIn = h('input', { type: 'text', value: d.company, oninput: function (e) { M.name = e.target.value; d.company = e.target.value; var co = M.frame.root.querySelector('.pd-top .co span:nth-child(2)'); if (co) co.textContent = e.target.value; } });
    var arche = h('div', { class: 'arche' });
    Object.keys(ARCHE).forEach(function (a) {
      arche.appendChild(h('button', { class: a === M.arche ? 'on' : '', onclick: function () { if (a !== M.arche) { loadArche(a); draw(); } } }, [ARCHE[a].name]));
    });
    g.appendChild(P.card({ cls: 'c4', title: '企业', body: [h('div', { class: 'pd-form' }, [
      h('div', { class: 'pd-field' }, [h('label', {}, ['企业名称']), nameIn]),
      h('div', { class: 'pd-field' }, [h('label', {}, ['行业']), h('div', { style: 'font-weight:700' }, [M.company ? sh.industryNameOf(M.company.industry) + (M.company.size ? ' · ' + sh.optText('size', M.company.size) : '') : sh.industryNameOf(sh.displayIndustryDefault())])]),
      h('div', { class: 'pd-field' }, [h('label', {}, ['业态原型']), arche])
    ])] }));

    /* 数据源：4 列 */
    var stbl = P.table({ compact: true, cols: [
      { key: 'name', label: '来源' },
      { key: 'mode', label: '方式', render: function (r) { return P.chip(r.mode === 'direct' ? 'ok' : 'watch', r.mode === 'direct' ? '系统直连' : '表格导入'); } },
      { key: 'lastSync', label: '同步', render: function (r) { return r.lastSync.slice(5); } },
      { key: 'rows', label: '条数', align: 'r', render: function (r) { return fmtN(r.rows); } }
    ], rows: d.sources });
    tagRefs(stbl, d.sources, function (r) { return r.name; }, function (r) { return r.id; });
    g.appendChild(P.card({ cls: 'c4', title: '数据源', sub: d.sources.length + ' 个', tight: true, body: [stbl] }));

    /* 已开通能力 */
    var caps = h('div', { class: 'm10-cap' });
    CAPS.forEach(function (n, i) {
      caps.appendChild(h('div', { class: 'r' }, [h('span', { class: 'ic' }, ['0' + (i + 1)]), h('span', { class: 't' }, [n]), P.chip('ok', '已开通')]));
    });
    g.appendChild(P.card({ cls: 'c4', title: '已开通能力', sub: '4 项', body: [caps] }));

    g.appendChild(h('div', { class: 'c12 go' }, [
      h('div', {}, [h('div', { class: 't' }, [v.room]), h('div', { class: 's' }, ['延期 ' + k.late + ' · 风险 ' + k.risk])]),
      h('div', { class: 'sp' }),
      h('div', { class: 'cr' }, [h('b', { class: 'num' }, [String(K.CREDITS)]), ' 积分 / 次']),
      P.btn('进入' + v.room, { cls: 'primary big', onClick: enterRoom })
    ]));
    work.appendChild(g);
    story({ work: work, src: fb.srcs, from: fb.srcs[0], to: fb.hub, tail: fb.out, label: fmtN(d.sources.reduce(function (a, s) { return a + s.rows; }, 0)) + ' 条',
      rows: trs(stbl), rise: nodes(work, '.m10-cap .r').concat(nodes(work, '.go')), verdict: say, focus: kpiRow.querySelectorAll('.pd-kpi')[1] });
  }

  /* ---------- 屏 2：指挥室 ---------- */
  function statusChip(o) { return P.chip(o.status, o.status === 'late' ? '延期 ' + o.lateDays + ' 天' : P.STATUS[o.status]); }
  function causeText(o) { if (o.status === 'done') return '已完工'; if (o.status === 'late') return K.CAUSES[o.cause].label; if (o.status === 'risk') return { tight: '余量不足', unordered: '未下单', waiting: '等料' }[o.riskReason] || '风险'; return '按期'; }
  function orderCols() {
    var v = V();
    return [
      { key: 'id', label: '单号', sort: true, w: '150px', render: function (r) { return h('span', {}, [h('b', { class: 'id' }, [r.id]), h('span', { class: 'sub' }, [PRIO[r.priority] || ''])]); } },
      { key: 'customer', label: v.customer, sort: true, render: function (r) { return cut(r.customer, 14); } },
      { key: 'dueDay', label: v.due, sort: true, align: 'c', w: '64px', render: function (r) { return r.dueLabel; } },
      { key: 'finishDay', label: v.finish, sort: true, align: 'c', w: '76px', render: function (r) { return h('span', { class: r.lateDays > 0 ? 'neg' : '' }, [r.finishLabel]); } },
      { key: 'status', label: '状态', w: '104px', sort: function (r) { return { late: 0, risk: 1, ok: 2, handled: 3, done: 4 }[r.status]; }, render: statusChip },
      { key: 'kitRate', label: '齐套率', w: '124px', sort: true, render: function (r) { return P.bar(r.kitRate * 100, r.kitRate >= 1 ? 'ok' : r.kitRate >= 0.5 ? 'risk' : 'late'); } }
    ];
  }
  function openOrder(id) { M.focus = id; setStep('order'); }
  function screenRoom(work) {
    var v = V(), S = M.S, k = S.kpi, plan = M.plan;
    var g = h('div', { class: 'pd-grid m10-g' });
    var fb = flowBar({ src: srcCells(), hub: '排程引擎', out: [k.onTimeRate + '%', '按期率'], btn: '重排', onClick: recalc });
    g.appendChild(fb);
    var filt = function (f) { return function () { M.filter = M.filter === f ? null : f; draw(); }; };
    var kpiRow = h('div', { class: 'c12' }, [P.kpis([
      { label: v.orders, value: cnt(k.open), unit: v.counter, sub: '完工 ' + k.done, onClick: filt(null), active: M.filter == null },
      { label: '按期率', value: cnt(k.onTimeRate), unit: '%', tone: k.onTimeRate >= 90 ? 'ok' : k.onTimeRate >= 70 ? 'risk' : 'late', sub: '按期 ' + (k.open - k.late) + ' ' + v.counter },
      { label: '延期', value: cnt(k.late), unit: v.counter, tone: 'late', sub: '合计晚 ' + k.lateDaysTotal + ' 天', onClick: filt('late'), active: M.filter === 'late' },
      { label: '风险', value: cnt(k.risk), unit: v.counter, tone: 'risk', sub: '余量不足 / 等料', onClick: filt('risk'), active: M.filter === 'risk' },
      { label: v.material + '缺口', value: cnt(plan.summary.short), unit: '项', tone: plan.summary.short ? 'late' : 'ok', sub: '待下单 ' + plan.summary.buy + ' 项', onClick: function () { setStep('stock'); } },
      { label: '7 日' + v.lines, value: cnt(k.load7), unit: '%', tone: k.overLines ? 'risk' : 'accent', sub: k.overLines ? k.overLines + ' 条满负荷' : '无满负荷' }
    ])]);
    g.appendChild(kpiRow);
    var over = S.lines.filter(function (L) { return L.status === 'over'; });
    var worst = S.orders.filter(function (o) { return o.status === 'late'; }).sort(function (a, b) { return b.lateDays - a.lateDays; })[0];
    var say = vd((worst ? k.late + ' ' + v.counter + '延期合计晚 ' + k.lateDaysTotal + ' 天，' + worst.id + ' 晚 ' + worst.lateDays + ' 天' : '在手' + v.orders + '全部按期')
      + (over.length ? '；' + over[0].name + ' 负荷 ' + over[0].load7 + '%。' : '。'));
    g.appendChild(say);

    var rows = S.orders.filter(function (o) { return !M.filter || o.status === M.filter; });
    var tbl = P.table({ cols: orderCols(), rows: rows, sortKey: 'status', onRow: function (r) { openOrder(r.id); }, rowKey: function (r) { return r.id; } });
    tagRefs(tbl, rows, function (r) { return r.id; }, function (r) { return r.id; });
    var left = P.card({ cls: 'c8', title: v.orders + '全景', sub: rows.length + ' ' + v.counter + (M.filter ? ' · 已筛选' : '') + ' · 点行下钻', tight: true,
      body: [h('div', { class: 'pd-scroll m10-sc7' }, [tbl])],
      extra: [P.btn(v.insert, { cls: 'sm', onClick: function () { setStep('insert'); } }), P.btn(v.daily, { cls: 'sm', onClick: function () { setStep('daily'); } })] });
    g.appendChild(left);

    var curve = loadPath(240, 34);
    var days7 = S.days.slice(0, 7);
    var heat = P.heat({ days: days7, wd: true, labelW: '104px', rows: S.lines.map(function (L) { return { label: L.name, cells: L.days.slice(0, 7).map(function (c) { return { pct: c.pct, rest: c.rest, ot: c.ot > 0, title: L.name + ' ' + c.label + ' ' + c.used + '/' + c.cap + ' h' }; }) }; }) });
    nodes(heat, '.lbl').forEach(function (el, i) { if (S.lines[i]) el.setAttribute('data-ref', S.lines[i].id); });
    var shorts = plan.items.filter(function (x) { return x.urgency === 'short' || x.urgency === 'safety'; });
    var shortShow = shorts.slice(0, 3);
    var list = h('div', { class: 'm10-short' });
    shortShow.forEach(function (x) {
      list.appendChild(h('button', { class: 'r ' + (x.urgency === 'short' ? 'late' : 'risk'), 'data-ref': x.id, onclick: function () { setStep('stock'); } }, [
        h('span', { class: 'd' }), h('span', { class: 't' }, [x.name]),
        h('span', { class: 'sv num' }, [fmtN(x.stock) + ' / ' + fmtN(x.onOrder)]),
        h('b', { class: 'num' }, [fmtN(x.suggestQty) + ' ' + x.unit]),
        h('span', { class: 'x' + (x.overdue ? ' neg' : '') }, [x.latestOrderLabel])
      ]));
    });
    if (shorts.length > shortShow.length) list.appendChild(h('div', { class: 'rest' }, ['还有 ' + (shorts.length - shortShow.length) + ' 项 · 预计 ' + fmtN(shorts.slice(shortShow.length).reduce(function (a, x) { return a + (x.amount || 0); }, 0)) + ' 元']));
    if (!shorts.length) list.appendChild(P.empty('库存与在途够用'));
    var right = col('c4', [
      P.card({ title: v.lines, sub: '7 天 · %', extra: [curve], tight: true, body: [heat] }),
      P.card({ title: v.material + '缺口', sub: plan.summary.buy + ' 项待下单 · 库存 / 在途', body: [list],
        extra: [P.btn('去下单', { cls: 'sm', onClick: function () { setStep('stock'); } })] })
    ]);
    g.appendChild(right);
    work.appendChild(g);
    story({ work: work, src: fb.srcs, from: fb.srcs[0], to: fb.hub, tail: fb.out, label: S.orders.length + ' ' + v.counter,
      rows: trs(tbl, 8), bars: nodes(work, '.pd-table .pd-bar .trk i'), paths: [curve.path], scan: left,
      rise: nodes(work, '.m10-short .r').concat(nodes(work, '.m10-short .rest')), verdict: say, focus: kpiRow.querySelectorAll('.pd-kpi')[2] });
  }
  function logList(log) {
    var el = h('div', { class: 'm10-log' });
    log.forEach(function (l) { el.appendChild(h('div', { class: 'l' }, [h('span', { class: 'n' }, [String(l.seq)]), h('b', {}, [TX(l.label) + (l.orderId ? ' ' + l.orderId : '')]), h('span', {}, [TX(l.detail) + (l.cost ? ' · 预计 ' + fmtN(l.cost) + ' 元' : '')])])); });
    return el;
  }

  /* ---------- 屏 3：订单下钻 ---------- */
  function actionRow(o, a) {
    var v = V(), e = a.effect;
    return h('div', { class: 'm10-act' + (a.rank === 1 && a.advised ? ' best' : '') }, [
      h('div', { class: 't' }, [h('span', { class: 'rk' }, [String(a.rank)]), h('b', {}, [a.label]), h('span', { class: 'tg' }, [cut(a.targetName, 12)])]),
      P.btn('执行', { cls: a.rank === 1 && a.advised ? 'primary sm' : 'sm', onClick: function () { var p = clone(a.params); p.cost = a.cost; commit(K.applyAction(M.data, o.id, a.key, p), '已' + a.label + ' · ' + v.room + '已重排'); } }),
      h('div', { class: 'e' }, [
        h('span', {}, [v.finish + ' ', h('b', {}, [e.finishBefore]), ' → ', h('b', { class: e.meetsDue ? 'good' : e.gain > 0 ? '' : 'bad' }, [e.finishAfter])]),
        h('span', {}, [e.meetsDue ? h('b', { class: 'good' }, ['赶上' + v.due]) : e.gain > 0 ? h('b', {}, ['追回 ' + e.gain + ' 天']) : e.gain < 0 ? h('b', { class: 'bad' }, ['反而晚 ' + (-e.gain) + ' 天']) : h('b', {}, ['无改善'])]),
        h('span', {}, ['拖累 ', h('b', { class: e.newlyLate ? 'bad' : '' }, [e.affected + ' ' + v.counter])]),
        h('span', {}, ['预计 ', h('b', {}, [a.cost ? fmtN(a.cost) + ' 元' : '0 元'])])
      ])
    ]);
  }
  function screenOrder(work) {
    var v = V(), S = M.S;
    if (!M.focus || !S.byId[M.focus]) { var f0 = S.orders.filter(function (o) { return o.status === 'late'; })[0] || S.orders.filter(function (o) { return o.status === 'risk'; })[0] || S.orders[0]; M.focus = f0.id; }
    var o = S.byId[M.focus];
    var alerts = S.orders.filter(function (x) { return x.status === 'late' || x.status === 'risk'; });
    var idx = alerts.map(function (x) { return x.id; }).indexOf(o.id);
    var g = h('div', { class: 'pd-grid m10-g' });
    var fb = flowBar({ src: [[cut(o.productName, 6), fmtN(o.qty) + ' ' + v.qtyUnit], [v.ops, o.opsTotal + ' 道'], ['齐套', Math.round(o.kitRate * 100) + '%']],
      hub: o.id, out: [o.finishLabel, v.finish], btn: '重算' + v.due, onClick: recalc });
    g.appendChild(fb);

    var facts = [
      { k: v.due, v: o.dueLabel },
      { k: v.finish, v: o.finishLabel, tone: o.lateDays > 0 ? 'late' : o.status === 'risk' ? 'risk' : 'ok' },
      { k: '余量', v: o.slack == null ? '—' : (o.slack >= 0 ? '+' : '') + o.slack + ' 天', tone: o.slack < 0 ? 'late' : o.slack < 1 ? 'risk' : 'ok' },
      { k: '齐套率', v: cnt(Math.round(o.kitRate * 100), { suf: '%' }), tone: o.kitRate >= 1 ? 'ok' : 'risk' },
      { k: v.progress, v: cnt(o.progressPct, { suf: '%' }) },
      { k: '剩余工时', v: cnt(o.remainHours, { dec: 1, suf: ' h' }) }
    ];
    var head = P.card({ cls: 'c12', accent: true, body: [h('div', { class: 'm10-head' }, [
      h('div', {}, [
        h('div', { class: 'id' }, [o.id, statusChip(o), P.chip('accent', PRIO[o.priority] || '', true), o.handled ? P.chip('handled', '已处置 ' + o.actions.length + ' 项') : null]),
        h('div', { class: 'sub' }, [cut(o.customer, 16) + ' · ' + o.productName + ' × ' + fmtN(o.qty) + ' ' + v.qtyUnit]),
        h('div', { class: 'facts' }, facts.map(function (f) { return h('div', { class: 'f' }, [h('div', { class: 'k' }, [f.k]), h('div', { class: 'v num ' + (f.tone || '') }, [f.v])]); }))
      ]),
      h('div', { class: 'btns' }, [
        P.btn('← ' + v.room, { onClick: function () { setStep('room'); } }),
        alerts.length > 1 ? P.btn('下一' + v.counter + ' →', { onClick: function () { M.focus = alerts[(idx + 1) % alerts.length].id; draw(); } }) : null,
        P.btn(v.insert, { onClick: function () { setStep('insert'); } })
      ])
    ])] });
    g.appendChild(head);

    var best0 = o.status === 'done' ? null : K.actions(M.data, S, o.id)[0];
    var say = vd(o.status === 'done' ? o.id + ' 已完工，等待发运。'
      : best0 ? o.id + ' ' + (o.lateDays > 0 ? '晚 ' + o.lateDays + ' 天' : causeText(o)) + '；' + best0.label + ' ' + best0.targetName + '，' + v.finish + ' ' + best0.effect.finishBefore + ' → ' + best0.effect.finishAfter + '，预计 ' + fmtN(best0.cost) + ' 元。'
        : o.id + ' ' + v.finish + ' ' + o.finishLabel + '，无需处置。');
    g.appendChild(say);

    var span = Math.max(10, Math.min(S.days.length, Math.max(o.dueDay, o.finishDay == null ? 0 : o.finishDay) + 3));
    var days = S.days.slice(0, span);
    var grows = o.ops.map(function (op) {
      if (op.done) return { label: op.op + (op.part ? ' · ' + op.part : ''), sub: op.lineName, note: '已完成', bars: [] };
      var bars = [];
      if (op.waitMaterial > 0 && op.naturalF != null) bars.push({ s: op.naturalF, e: op.matReady, tone: 'waitmat', label: '等料 ' + op.waitMaterial + ' 天', title: dayLabel(op.matReady) + ' 齐备' });
      if (op.waitCapacity > 0 && op.earliestF != null && op.startF != null) bars.push({ s: op.earliestF, e: op.startF, tone: 'waitcap', label: '排队 ' + op.waitCapacity + ' 天', title: '前面 ' + op.queueAhead + ' 段' });
      if (op.startF != null) bars.push({ s: op.startF, e: op.endF, tone: op.inProgress ? 'prog' : (op.endDay > o.dueDay ? 'late' : op.rerouted ? 'hand' : 'plan'), label: (op.inProgress ? Math.round(op.prog * 100) + '% · ' : '') + op.remain + ' h', title: op.startLabel + ' → ' + op.endLabel });
      return { label: op.op + (op.part ? ' · ' + op.part : ''), sub: op.lineName + (op.rerouted ? ' · 已调线' : ''), bars: bars, note: op.startF == null ? '超出窗口' : null };
    });
    var gantt = P.gantt({ days: days, rows: grows, todayIdx: 0, dayW: span > 16 ? 42 : 54, marks: o.dueDay < span ? [{ d: o.dueDay, label: v.due + ' ' + o.dueLabel }] : [] });
    var legend = h('div', { class: 'pd-legend', style: 'margin-top:10px' }, [
      h('span', {}, [h('i', { style: 'background:#E8862B' }), '计划']), h('span', {}, [h('i', { style: 'background:#9A4F0E' }), '在制']),
      h('span', {}, [h('i', { style: 'background:#D9483B' }), '超' + v.due]), h('span', {}, [h('i', { style: 'background:#FDF3E1;border:1px dashed #E8A33D' }), '等料']),
      h('span', {}, [h('i', { style: 'background:#EEF1F6;border:1px dashed #98A2B8' }), '排队'])
    ]);
    var ganttCard = P.card({ title: v.ops, sub: o.opsDone + ' / ' + o.opsTotal + ' 道 · 窗口 ' + days.length + ' 天', body: [gantt, legend] });

    var ex = K.explain(S, o.id);
    var acts = o.status === 'done' ? [] : K.actions(M.data, S, o.id);
    var actsEl = h('div', { class: 'm10-acts' });
    (o.actions || []).forEach(function (a) { actsEl.appendChild(h('div', { class: 'm10-act done' }, [h('div', { class: 't' }, [h('span', { class: 'rk' }, ['✓']), h('b', {}, [a.label]), h('span', { class: 'tg' }, [cut(TX(a.detail), 18)])]), h('span', { class: 'dn' }, ['已执行'])])); });
    acts.slice(0, 3).forEach(function (a) { actsEl.appendChild(actionRow(o, a)); });
    if (!acts.length && !(o.actions || []).length) actsEl.appendChild(P.empty(o.status === 'done' ? '等待发运' : '无需处置'));
    var tone = o.status === 'late' ? 'late' : o.status === 'risk' ? 'risk' : o.status === 'done' ? 'done' : 'ok';
    var judgeCard = P.card({ title: 'AI 判断', sub: ex.label, body: [h('div', { class: 'm10-judge', 'data-ref': o.id }, [
      h('div', { class: 'vd ' + tone }, [P.chip(tone, ex.label), h('span', {}, [o.status === 'late' ? v.finish + ' ' + o.finishLabel + '，晚 ' + o.lateDays + ' 天' : o.status === 'risk' ? causeText(o) + ' · ' + v.finish + ' ' + o.finishLabel : v.finish + ' ' + o.finishLabel])]),
      h('div', { class: 'why' }, [cut(TX(ex.reasons[0] || ''), 40)]),
      actsEl
    ])] });

    var mats = [];
    o.ops.forEach(function (op) { (op.mat || []).forEach(function (m) { mats.push(m); }); });
    var matEl = h('div', { class: 'm10-mat' });
    mats.slice(0, 4).forEach(function (m) {
      var pct = m.need > 0 ? Math.max(4, Math.min(100, Math.round(100 * (m.need - (m.short || 0)) / m.need))) : 100;
      matEl.appendChild(h('div', { class: 'row', 'data-ref': m.material }, [
        h('span', { class: 't' }, [m.name]),
        m.ready === 0 ? P.chip('ok', '齐备') : m.assumed ? P.chip('late', '缺 ' + fmtN(m.short) + ' ' + m.unit) : P.chip('risk', m.readyLabel + ' 到'),
        P.bar(pct, m.ready === 0 ? 'ok' : m.assumed ? 'late' : 'risk', fmtN(m.need) + ' ' + m.unit)
      ]));
    });
    if (!mats.length) matEl.appendChild(P.empty('无待领' + v.material));
    g.appendChild(col('c8', [ganttCard, P.card({ title: '齐套', sub: Math.round(o.kitRate * 100) + '%', body: [matEl] })]));
    g.appendChild(col('c4', [judgeCard]));
    work.appendChild(g);
    story({ work: work, src: fb.srcs, from: fb.srcs[0], to: fb.hub, tail: fb.out, label: o.remainHours + ' h', scan: ganttCard,
      bars: nodes(work, '.m10-mat .pd-bar .trk i'), rise: nodes(work, '.pd-gantt').concat(nodes(work, '.m10-act')),
      verdict: say, focus: actsEl.querySelector('.m10-act:not(.done)') || actsEl.querySelector('.m10-act') });
  }

  /* ---------- 屏 4：插单模拟 ---------- */
  function screenInsert(work) {
    var v = V(), S = M.S, d = M.data;
    work.classList.add('m10-insert');
    if (!M.insert.req) M.insert.req = clone(d.insertDraft || d.insertPresets[0]);
    var req = M.insert.req;
    if (!M.insert.sim) { M.insert.sim = K.simulateInsert(d, req); M.insert.pick = M.insert.sim.recommend; }
    var sim = M.insert.sim;
    var dueIdx = K.dayIdx(d, req.due);
    var g = h('div', { class: 'pd-grid m10-g' });
    var fb = flowBar({ src: [[cut(req.customer, 6), fmtN(req.qty) + ' ' + v.qtyUnit], [v.due, K.short(d, dueIdx)], [v.orders, S.kpi.open + ' ' + v.counter]],
      hub: '三策略重排', out: ['方案 ' + sim.recommend, 'AI 推荐'], btn: '重新模拟',
      onClick: function () { M.insert.sim = K.simulateInsert(d, req); M.insert.pick = M.insert.sim.recommend; M.told = null; draw(); } });
    g.appendChild(fb);
    var rec = sim.options.filter(function (x) { return x.key === sim.recommend; })[0];
    var say = vd('方案 ' + rec.key + ' ' + rec.name + '：' + v.finish + ' ' + rec.finishLabel + '，' + (rec.meetsDue ? '按期' : '晚 ' + rec.lateDays + ' 天')
      + '，拖累 ' + rec.affected + ' ' + v.counter + '、转延期 ' + rec.newlyLate + ' ' + v.counter + '，预计 ' + fmtN(rec.cost) + ' 元。');
    g.appendChild(say);

    var prodSel = h('select', { onchange: function (e) { req.product = e.target.value; M.insert.sim = null; draw(); } });
    d.products.forEach(function (p) { prodSel.appendChild(h('option', { value: p.id, selected: p.id === req.product }, [p.name])); });
    var dueSel = h('select', { onchange: function (e) { req.due = e.target.value; M.insert.sim = null; draw(); } });
    for (var i = 1; i <= 20; i++) { var ds = K.dateOf(d, i); dueSel.appendChild(h('option', { value: ds, selected: ds === req.due }, [K.short(d, i) + ' 周' + ['日', '一', '二', '三', '四', '五', '六'][K.weekday(d, i)] + (K.isRest(d, i) ? '（休）' : '')])); }
    var custIn = h('input', { type: 'text', value: req.customer, oninput: function (e) { req.customer = e.target.value; } });
    var qtyIn = h('input', { type: 'number', value: req.qty, min: '1', onchange: function (e) { req.qty = Math.max(1, +e.target.value || 0); M.insert.sim = null; draw(); } });
    var presets = h('div', { class: 'presets' });
    d.insertPresets.forEach(function (p) {
      var pn = d.products.filter(function (x) { return x.id === p.product; })[0];
      presets.appendChild(h('button', { onclick: function () { M.insert.req = clone(p); M.insert.sim = null; M.insert.pick = null; draw(); } }, [cut(p.customer, 10) + ' · ' + (pn ? pn.name : p.product) + ' × ' + fmtN(p.qty)]));
    });
    var draftCard = P.card({ cls: 'c4', title: v.insertNoun, body: [h('div', { class: 'pd-form' }, [
      h('div', { class: 'pd-field' }, [h('label', {}, [v.customer]), custIn]),
      h('div', { class: 'pd-field' }, [h('label', {}, [v.product]), prodSel]),
      h('div', { class: 'pd-field' }, [h('label', {}, [v.qty + '（' + v.qtyUnit + '）']), qtyIn]),
      h('div', { class: 'pd-field' }, [h('label', {}, [v.due]), dueSel]),
      h('div', { class: 'pd-field' }, [h('label', {}, ['常用']), presets])
    ])] });
    draftCard.setAttribute('data-ref', 'insert-draft');     /* 摄入订单表后草稿落在这张卡上，高亮按它定位 */
    g.appendChild(draftCard);

    var opts = sim.options.map(function (op) {
      return { key: op.key, name: op.name, recommended: op.key === sim.recommend,
        headline: { big: op.finishLabel, tone: op.meetsDue ? 'ok' : 'late', sub: op.meetsDue ? '按期' : '晚 ' + op.lateDays + ' 天' },
        rows: [{ k: '拖累', v: op.affected + ' ' + v.counter, tone: op.affected ? 'bad' : 'good' }, { k: '转延期', v: op.newlyLate + ' ' + v.counter, tone: op.newlyLate ? 'bad' : 'good' }, { k: '后移', v: op.delayDaysTotal + ' 天' }, { k: '预计加班费', v: op.cost ? fmtN(op.cost) + ' 元' : '0 元' }],
        notes: op.notes && op.notes.length ? TX(op.notes[0]) : null };
    });
    var cmp = P.compare({ options: opts, active: M.insert.pick, onPick: function (kk) { M.insert.pick = kk; draw(); } });
    nodes(cmp, '.pd-option').forEach(function (el, i) { if (sim.options[i]) el.setAttribute('data-ref', sim.options[i].key); });
    var pick = sim.options.filter(function (x) { return x.key === M.insert.pick; })[0];
    var affected = pick.rows.filter(function (r) { return r.delta !== 0; });
    var affTbl = P.table({ compact: true, cols: [
      { key: 'id', label: '单号', render: function (r) { return h('b', { class: 'id' }, [r.id]); } },
      { key: 'customer', label: v.customer, render: function (r) { return cut(r.customer, 12); } },
      { key: 'before', label: '前', align: 'c' },
      { key: 'after', label: '后', align: 'c', render: function (r) { return h('span', { class: r.delta > 0 ? 'neg' : 'pos' }, [r.after]); } },
      { key: 'delta', label: '变化', align: 'r', sort: true, render: function (r) { return h('span', { class: r.delta > 0 ? 'neg' : 'pos' }, [(r.delta > 0 ? '+' : '') + r.delta + ' 天']); } },
      { key: 'st', label: '状态', render: function (r) { return r.turnsLate ? P.chip('late', '转延期') : r.turnsOk ? P.chip('ok', '转按期') : P.chip(r.statusAfter, P.STATUS[r.statusAfter]); } }
    ], rows: affected, sortKey: 'delta', sortDir: 'desc', empty: '不影响在手' + v.order });
    tagRefs(affTbl, affected, function (r) { return r.id; }, function (r) { return r.id; });
    var S1 = sim._S[pick.key];
    var loadRows = S.lines.map(function (L, ii) { var L1 = S1.lines[ii]; return { name: L.name, a: L.load7, b: L1.load7, ot: L1.overtimeHours }; }).filter(function (r) { return r.a || r.b; });
    var loadEl = h('div', { class: 'm10-load' }, loadRows.map(function (r) {
      return h('div', { class: 'r' }, [h('span', { class: 't' }, [r.name]), P.bar(Math.min(100, r.b), r.b >= 100 ? 'late' : r.b >= 85 ? 'risk' : 'ok', r.a + '% → ' + r.b + '%')]);
    }));
    var why = h('div', { class: 'pd-why m10-why' }, ['推荐 ' + sim.recommend + '：' + TX(sim.reason) + '。']);
    var cmpCard = P.card({ cls: 'c8', title: '方案对比', sub: fmtN(req.qty) + ' ' + v.qtyUnit + ' · ' + v.due + ' ' + K.short(d, dueIdx), body: [cmp, why] });
    var detCard = P.card({ cls: 'c8', title: '方案 ' + pick.key + ' · ' + pick.name, sub: '受影响 ' + affected.length + ' ' + v.counter, tight: true,
      body: [h('div', { class: 'pd-grid', style: 'margin:0' }, [
        h('div', { class: 'c7' }, [h('div', { class: 'pd-scroll m10-sc5' }, [affTbl])]),
        h('div', { class: 'c5' }, [h('div', { class: 'pd-scroll m10-sc5' }, [loadEl])])
      ])],
      foot: [P.btn('按方案 ' + pick.key + ' 落单', { cls: 'primary', onClick: function () {
        var nd = K.applyInsert(d, req, pick.key); delete nd.insertDraft; delete nd.insertPick;
        M.insert = { req: null, sim: null, pick: null }; M.focus = pick.orderId;
        commit(nd, '已落单 ' + pick.orderId + '（' + pick.name + '）· ' + v.room + '已重排'); setStep('room');
      } })] });
    var right = col('c8', [cmpCard, detCard]);
    g.appendChild(right);
    work.appendChild(g);
    story({ work: work, src: fb.srcs, from: fb.srcs[0], to: fb.hub, tail: fb.out, label: fmtN(req.qty) + ' ' + v.qtyUnit, scan: cmpCard,
      rows: trs(affTbl, 6), bars: nodes(work, '.m10-load .pd-bar .trk i'), rise: nodes(work, '.pd-option'),
      verdict: say, focus: cmp.querySelector('.pd-option.on') || cmp.querySelector('.pd-option') });
  }

  /* ---------- 屏 5：物料与库存 ---------- */
  function screenStock(work) {
    var v = V(), plan = M.plan, sm = plan.summary, d = M.data;
    var g = h('div', { class: 'pd-grid m10-g' });
    var fb = flowBar({ src: [['库存', plan.items.length + ' 种'], ['在途', d.materials.filter(function (m) { return m.onOrder.length; }).length + ' 种'], ['排程需求', M.S.kpi.open + ' ' + v.counter]],
      hub: '倒推缺口', out: [sm.buy + ' 项', fmtN(sm.amount) + ' 元'], btn: '重算缺口', onClick: recalc });
    g.appendChild(fb);
    var urgentToday = plan.items.filter(function (x) { return x.suggestQty > 0 && x.latestOrderDay <= 0; });
    var kpiRow = h('div', { class: 'c12' }, [P.kpis([
      { label: '缺口', value: cnt(sm.short), unit: '项', tone: sm.short ? 'late' : 'ok', sub: '库存与在途不够' },
      { label: '低于安全库存', value: cnt(sm.safety), unit: '项', tone: sm.safety ? 'risk' : 'ok', sub: '在途回补 ' + sm.watch + ' 项' },
      { label: '建议下单', value: cnt(sm.buy), unit: '项', tone: 'accent', sub: '预计 ' + fmtN(sm.amount) + ' 元' },
      { label: '已过下单截止', value: cnt(sm.overdue), unit: '项', tone: sm.overdue ? 'late' : 'ok', sub: '须与' + v.supplier + '协商' },
      { label: '呆滞', value: cnt(sm.slow), unit: '项', tone: sm.slow ? 'risk' : 'ok', sub: '占用 ' + fmtN(sm.slowCapital) + ' 元', onClick: function () { openSlow(); } }
    ])]);
    g.appendChild(kpiRow);
    var top = plan.items.filter(function (x) { return x.urgency === 'short'; })[0] || plan.items.filter(function (x) { return x.suggestQty > 0; })[0] || plan.items[0];
    var driver = top && top.drivers.length ? top.drivers[0].split(' ')[0] : null;
    var say = vd(top ? top.name + ' 库存 ' + fmtN(top.stock) + ' ' + top.unit + '、在途 ' + fmtN(top.onOrder) + ' ' + top.unit + '，排程需 ' + fmtN(top.demand) + ' ' + top.unit + '、安全库存 ' + fmtN(top.safety) + ' ' + top.unit
      + (top.suggestQty > 0 ? '，建议下单 ' + fmtN(top.suggestQty) + ' ' + top.unit + '，下单截止 ' + top.latestOrderLabel + (driver ? '；' + driver + ' 等它开工。' : '。') : '，库存与在途够用。') : '库存与在途覆盖排程内需求。');
    g.appendChild(say);

    var urg = { short: 0, safety: 1, watch: 2, ok: 3 };
    var tbl = P.table({ cols: [
      { key: 'name', label: v.material, sort: true, render: function (r) { return h('span', {}, [h('b', {}, [r.name]), h('span', { class: 'sub' }, [r.supplier || '—'])]); } },
      { key: 'urgency', label: '状态', w: '132px', sort: function (r) { return urg[r.urgency]; }, render: function (r) { return P.chip(r.urgency === 'short' ? 'late' : r.urgency === 'safety' ? 'risk' : r.urgency === 'watch' ? 'watch' : 'ok', r.urgency === 'short' ? '缺口 ' + r.shortLabel : r.urgency === 'safety' ? '低于安全库存' : r.urgency === 'watch' ? '在途回补' : '正常'); } },
      { key: 'stock', label: '库存 / 在途', align: 'r', sort: true, render: function (r) { return h('span', {}, [h('b', { class: r.stock < r.safety ? 'neg' : '' }, [fmtN(r.stock)]), ' / ' + fmtN(r.onOrder)]); } },
      { key: 'demand', label: '排程需求', align: 'r', sort: true, render: function (r) { return r.demand ? fmtN(r.demand) : '—'; } },
      { key: 'suggestQty', label: '建议下单', align: 'r', sort: true, render: function (r) { return r.suggestQty ? h('b', {}, [fmtN(r.suggestQty) + ' ' + r.unit]) : '—'; } },
      { key: 'latestOrderDay', label: '下单截止', align: 'c', w: '92px', sort: true, render: function (r) { return r.suggestQty ? h('span', { class: r.overdue ? 'neg' : '' }, [r.latestOrderLabel + (r.overdue ? ' · 已过' : '')]) : '—'; } }
    ], rows: plan.items, sortKey: 'urgency', onRow: function (r) { openMaterial(r); }, rowKey: function (r) { return r.id; } });
    tagRefs(tbl, plan.items, function (r) { return r.name; }, function (r) { return r.id; });
    var left = P.card({ cls: 'c8', title: v.materials, sub: plan.items.length + ' 种 · 点行看走势', tight: true, body: [h('div', { class: 'pd-scroll m10-sc7' }, [tbl])] });
    g.appendChild(left);

    var sp = top ? P.spark({ curve: top.curve, safety: top.safety, days: M.S.days, height: 72 }) : null;
    var poShow = 2;
    var po = h('div', { class: 'm10-po' });
    plan.po.slice(0, poShow).forEach(function (p) {
      var sup = h('div', { class: 'sup', 'data-ref': p.supplier || '' }, [h('div', { class: 't' }, [h('span', {}, [p.supplier || v.supplier]), h('span', { class: 'num' }, [fmtN(p.amount) + ' 元'])])]);
      p.lines.slice(0, 2).forEach(function (l) { sup.appendChild(h('div', { class: 'ln' }, [h('span', {}, [l.name]), h('span', { class: 'num' }, [h('b', {}, [fmtN(l.suggestQty) + ' ' + l.unit]), ' · ' + l.leadDays + ' 天到'])])); });
      po.appendChild(sup);
    });
    if (plan.po.length > poShow) po.appendChild(h('div', { class: 'rest' }, ['还有 ' + (plan.po.length - poShow) + ' 张 · 预计 ' + fmtN(plan.po.slice(poShow).reduce(function (a, p) { return a + p.amount; }, 0)) + ' 元']));
    if (!plan.po.length) po.appendChild(P.empty('无需下单'));
    var right = col('c4', [
      top ? P.card({ title: top.name, sub: top.spec, body: [sp] }) : null,
      P.card({ title: '采购单草稿', sub: plan.po.length + ' 张 · 预计 ' + fmtN(sm.amount) + ' 元', body: [po],
        foot: plan.po.length ? [P.btn('生成 ' + plan.po.length + ' 张采购单', { cls: 'primary', onClick: function () { var r = K.applyPurchase(d, plan); M.pos = M.pos.concat(r.pos); commit(r.data, '已生成 ' + r.pos.length + ' 张采购单 · ' + v.room + '已重排'); } })] : null })
    ].filter(Boolean));
    g.appendChild(right);
    work.appendChild(g);
    story({ work: work, src: fb.srcs, from: fb.srcs[0], to: fb.hub, tail: fb.out, label: plan.items.length + ' 种', scan: left,
      rows: trs(tbl, 8), paths: sp ? nodes(sp, 'path.ln') : [], rise: nodes(work, '.m10-po .sup').concat(nodes(work, '.m10-po .rest')),
      verdict: say, focus: top ? rowOf(work, top.name) : null });
  }
  function openSlow() {
    var plan = M.plan;
    var tbl = P.table({ compact: true, cols: [
      { key: 'name', label: '物料' }, { key: 'stock', label: '库存', align: 'r', render: function (r) { return fmtN(r.stock) + ' ' + r.unit; } },
      { key: 'daysCover', label: '可用天数', align: 'r', render: function (r) { return r.daysCover > 999 ? '999+' : r.daysCover; } },
      { key: 'capital', label: '占用', align: 'r', render: function (r) { return fmtN(r.capital) + ' 元'; } }
    ], rows: plan.slow, empty: '无呆滞' });
    P.drawer(M.frame.body, { title: '呆滞', sub: plan.slow.length + ' 项 · ' + fmtN(plan.summary.slowCapital) + ' 元', body: [tbl] });
  }
  function openMaterial(r) {
    var v = V(), d = M.data;
    var body = [
      P.spark({ curve: r.curve, safety: r.safety, days: M.S.days }),
      P.kv([['库存', fmtN(r.stock) + ' ' + r.unit], ['安全库存', fmtN(r.safety) + ' ' + r.unit], ['在途', r.arrivals.length ? r.arrivals.map(function (a) { return a.po + ' ' + a.label + ' 到 ' + fmtN(a.qty) + (a.expedited ? '（已催）' : ''); }).join('；') : '无'],
        ['排程需求', fmtN(r.demand) + ' ' + r.unit], ['提前期', r.leadDays + ' 天'], ['起订量', fmtN(r.moq) + ' ' + r.unit], [v.supplier, r.supplier || '—'], ['单价', r.unitCost ? r.unitCost + ' 元' : '—'], ['可用天数', r.daysCover != null ? r.daysCover + ' 天' : '—']]),
      h('div', { class: 'pd-why' }, [TX(r.reason)]),
      r.drivers.length ? h('ul', { style: 'margin:0;padding-left:18px;display:grid;gap:4px' }, r.drivers.map(function (t) { return h('li', {}, [t]); })) : null
    ];
    var acts = [P.btn('关闭', { onClick: function () { dr.close(); } })];
    if (r.suggestQty > 0) acts.unshift(P.btn('只下这一项：' + fmtN(r.suggestQty) + ' ' + r.unit, { cls: 'primary', onClick: function () { var res = K.applyPurchase(d, M.plan, [r.id]); M.pos = M.pos.concat(res.pos); dr.close(); commit(res.data, '已生成采购单 ' + res.pos[0].po + ' · ' + r.name); } }));
    var dr = P.drawer(M.frame.body, { title: r.name, sub: r.spec + ' · ' + (r.urgency === 'short' ? '缺口 ' + r.shortLabel : r.urgency === 'safety' ? '低于安全库存' : r.urgency === 'watch' ? '在途回补' : '正常'), body: body, actions: acts });
    return dr;
  }

  /* ---------- 屏 6：交付日报 ---------- */
  function screenDaily(work) {
    var v = V(), D = M.daily, k = D.kpi;
    work.classList.add('m10-daily');
    var g = h('div', { class: 'pd-grid m10-g' });
    var fb = flowBar({ src: [[v.room, k.open + ' ' + v.counter], ['今日交付', D.deliveries.length + ' ' + v.counter], ['风险与延期', D.risks.length + ' ' + v.counter]],
      hub: '生成' + v.daily, out: [D.date.slice(5).replace('-', '.'), '周' + D.weekday], btn: '重新生成', onClick: recalc });
    g.appendChild(fb);
    var okToday = D.deliveries.filter(function (x) { return x.ok; }).length;
    var tom = tomorrowList();
    var tomN = function (kk) { return tom.filter(function (t) { return t.kind === kk; }).length; };
    var tomBits = [];
    if (tomN('start')) tomBits.push('开工 ' + tomN('start') + ' 条');
    if (tomN('po')) tomBits.push(v.material + '待下单 ' + tomN('po') + ' 项');
    if (!tomBits.length && tomN('due')) tomBits.push('到期 ' + tomN('due') + ' ' + v.counter);
    if (!tomBits.length && tomN('arrival')) tomBits.push('到货 ' + tomN('arrival') + ' 项');
    var say = vd('今日 ' + okToday + ' ' + v.counter + '可交付；'
      + (tom.length ? '明日提醒 ' + tom.length + ' 条' + (tomBits.length ? '，' + tomBits.join('、') : '') + '。' : '明日无到期、开工与到货事项。'));
    g.appendChild(say);

    var doc = h('div', { class: 'pd-doc c8' });
    doc.appendChild(h('div', { class: 'title' }, [v.daily, h('span', { class: 'd' }, [D.date.replace(/-/g, '.') + ' 周' + D.weekday])]));
    doc.appendChild(h('div', { class: 'kp' }, [
      h('div', { class: 'b' }, [h('div', { class: 'k' }, [v.orders]), h('div', { class: 'v num' }, [cnt(k.open), ' ' + v.counter])]),
      h('div', { class: 'b' }, [h('div', { class: 'k' }, ['按期率']), h('div', { class: 'v num ' + (k.onTimeRate >= 90 ? 'ok' : k.onTimeRate >= 70 ? 'risk' : 'late') }, [cnt(k.onTimeRate, { suf: '%' })])]),
      h('div', { class: 'b' }, [h('div', { class: 'k' }, ['延期']), h('div', { class: 'v num late' }, [cnt(k.late), ' ' + v.counter])]),
      h('div', { class: 'b' }, [h('div', { class: 'k' }, ['风险']), h('div', { class: 'v num risk' }, [cnt(k.risk), ' ' + v.counter])])
    ]));
    var sec = function (title, body) { return h('div', { class: 'sec' }, [h('h4', {}, [title]), body]); };
    var delTbl = D.deliveries.length ? P.table({ compact: true, cols: [
      { key: 'id', label: '单号', render: function (r) { return h('b', { class: 'id' }, [r.id]); } },
      { key: 'customer', label: v.customer, render: function (r) { return cut(r.customer, 14); } },
      { key: 'productName', label: v.product, render: function (r) { return r.productName + ' × ' + fmtN(r.qty); } },
      { key: 'st', label: '状态', render: function (r) { return r.ok ? P.chip('done', r.status === 'done' ? '已完工待发运' : '可交付') : P.chip('late', '延至 ' + r.finishLabel); } }
    ], rows: D.deliveries }) : P.empty('今日无到期' + v.order);
    if (D.deliveries.length) tagRefs(delTbl, D.deliveries, function (r) { return r.id; }, function (r) { return r.id; });
    doc.appendChild(sec('今日交付', delTbl));
    var riskTbl = D.risks.length ? P.table({ compact: true, cols: [
      { key: 'id', label: '单号', render: function (r) { return h('b', { class: 'id' }, [r.id]); } },
      { key: 'customer', label: v.customer, render: function (r) { return cut(r.customer, 12); } },
      { key: 'dueLabel', label: v.due, align: 'c' },
      { key: 'finishLabel', label: v.finish, align: 'c', render: function (r) { return h('span', { class: r.lateDays > 0 ? 'neg' : '' }, [r.finishLabel]); } },
      { key: 'causeLabel', label: '判断', render: function (r) { return r.status === 'late' ? r.causeLabel + ' · 晚 ' + r.lateDays + ' 天' : '风险'; } },
      { key: 'hd', label: '处置', render: function (r) { return r.handled ? P.chip('handled', r.actions.map(function (a) { return a.label; }).join('、')) : P.chip('watch', '待处置'); } }
    ], rows: D.risks }) : P.empty('无风险' + v.order);
    if (D.risks.length) tagRefs(riskTbl, D.risks, function (r) { return r.id; }, function (r) { return r.id; });
    doc.appendChild(sec('风险' + v.order, h('div', { class: 'pd-scroll m10-sc5' }, [riskTbl])));
    if (M.data.log.length) doc.appendChild(sec('今日处置 · ' + M.data.log.length + ' 项', h('div', { class: 'pd-scroll m10-sc3' }, [logList(M.data.log)])));
    /* 小节标题带总数与分组，横幅上的两个数字在这里都能对上；正文先露开工 */
    var tomHead = '明日提醒 · 共 ' + tom.length + ' 条'
      + [['start', '开工'], ['po', '待下单'], ['due', '到期'], ['arrival', '到货']].filter(function (kk) { return tomN(kk[0]); })
        .map(function (kk) { return ' · ' + kk[1] + ' ' + tomN(kk[0]); }).join('');
    var tomShow = ['start', 'po', 'due', 'arrival'].reduce(function (a, kk) { return a.concat(tom.filter(function (t) { return t.kind === kk; })); }, []).slice(0, 3);
    doc.appendChild(sec(tom.length ? tomHead : '明日提醒', tom.length ? h('ul', {}, tomShow.map(function (t) { return h('li', {}, [TX(t.text)]); })) : P.empty('明日无事项')));
    g.appendChild(doc);

    var who = h('div', { class: 'who' });
    [v.handler, '车间主任', '总经理', '采购主管'].forEach(function (w2, i) { who.appendChild(h('button', { class: i === M.who ? 'on' : '', onclick: function () { M.who = i; draw(); } }, [w2])); });
    var lines = h('div', { class: 'm10-load' }, D.lines.map(function (L) {
      return h('div', { class: 'r' }, [h('span', { class: 't' }, [L.name]), P.bar(Math.min(100, L.load7), L.status === 'over' ? 'late' : L.status === 'tight' ? 'risk' : 'ok', L.load7 + '%')]);
    }));
    var right = col('c4', [
      P.card({ title: '发送', sub: '微信 · 文本版', body: [h('div', { class: 'pd-field' }, [h('label', {}, ['收件人']), who])],
        foot: [P.btn('发送到微信', { cls: 'primary', onClick: function () { sh.setQrReady(true); sh.showWeChat(); } }),
          P.btn('查看文本', { onClick: function () { P.drawer(M.frame.body, { title: v.daily, sub: D.date.replace(/-/g, '.') + ' 周' + D.weekday, body: [h('div', { class: 'pd-pre' }, [TX(D.text)])] }); } })] }),
      P.card({ title: v.lines, sub: '7 天 · %', body: [lines] })
    ]);
    g.appendChild(right);
    work.appendChild(g);
    story({ work: work, src: fb.srcs, from: fb.srcs[0], to: fb.hub, tail: fb.out, label: v.daily, scan: doc,
      rows: trs(doc, 10), bars: nodes(lines, '.pd-bar .trk i'), rise: nodes(doc, '.sec'),
      verdict: say, focus: doc.querySelector('.kp') });
  }

  /* ================= 对话坞：取上下文 + 落地动作 =================
     开场发现、快捷问句、问答与文档摄入全在内核（DGG.coreM10 与 skill 同一份），
     本文件只做两件事：把当前屏的上下文交出去，把内核返回的声明式动作落到页面上。 */
  var STEPS = ['connect', 'room', 'order', 'insert', 'stock', 'daily'];

  /* 取上下文：屏上的选中态（看哪一张 / 加急单草稿 / 选中方案）随数据一起交给内核 */
  function chatCtx() {
    var d = {}, k;
    for (k in M.data) if (Object.prototype.hasOwnProperty.call(M.data, k)) d[k] = M.data[k];
    if (M.focus) d.focus = M.focus;
    if (M.insert.req) d.insertDraft = M.insert.req;
    if (M.insert.pick) d.insertPick = M.insert.pick;
    return { data: d, lib: null, result: { S: M.S, plan: M.plan, daily: M.daily } };
  }

  /* 按业务 id 找页面上那一条：先认 data-ref，重绘或排序过的行退回按文本找 */
  function refEl(ref) {
    var w = workEl(), s = String(ref == null ? '' : ref);
    if (!w || !s) return null;
    return w.querySelector('[data-ref="' + s + '"]') || rowOf(w, s);
  }
  function pulseRef(ref, ms) {
    setTimeout(function () { var el = refEl(ref); if (el) anim().pulse(el, { ms: 2200, scroll: true }); }, ms || 140);
  }
  /* 这条业务记录住在哪一屏 */
  function homeOf(ref) {
    var s = String(ref == null ? '' : ref);
    if (!s) return null;
    /* 摄入回来的两个固定位置：草稿卡在插单屏、导入批次行在接入屏。
     * 这两条记录在高亮那一刻可能还没落库（动作在高亮之后才重放），所以按屏名直接给。 */
    if (s === 'insert-draft') return 'insert';
    if (s === 'doc-import') return 'connect';
    if (M.S.byId[s]) return M.step === 'daily' ? 'daily' : 'room';
    if (M.plan.items.filter(function (x) { return x.id === s; }).length) return 'stock';
    if (M.plan.po.filter(function (x) { return x.supplier === s; }).length) return 'stock';
    if (M.S.lines.filter(function (x) { return x.id === s; }).length) return 'room';
    if (M.data.sources.filter(function (x) { return x.id === s; }).length) return 'connect';
    return null;
  }
  function doFocus(ref, api) {
    var el = refEl(ref);
    if (el) { api.focus(el); return true; }
    var to = homeOf(ref);
    if (!to) return false;
    if (M.step !== to) setStep(to); else draw();
    pulseRef(ref, 700);
    return true;
  }
  function openPanel(a) {
    if (a.panel === 'material') {
      if (!M.plan.items.filter(function (x) { return x.id === a.ref; }).length) return false;
      var open = function () { var it = M.plan.items.filter(function (x) { return x.id === a.ref; })[0]; if (it) openMaterial(it); };
      if (M.step !== 'stock') { setStep('stock'); setTimeout(open, 420); } else open();
      return true;
    }
    if (a.panel === 'slow') {
      if (!M.plan.slow.length) return false;
      if (M.step !== 'stock') { setStep('stock'); setTimeout(openSlow, 420); } else openSlow();
      return true;
    }
    if (a.panel === 'wechat') { sh.setQrReady(true); sh.showWeChat(); return true; }
    return false;
  }
  function applyAct(a) {
    var input = a.input || {}, v = V();
    if (a.action === 'apply-action') {
      if (!M.S.byId[input.orderId] || !input.key) return false;
      M.focus = input.orderId;
      if (M.step !== 'order') setStep('order');
      commit(K.applyAction(M.data, input.orderId, input.key, input.params), '已' + ((v.actions || {})[input.key] || '处置') + ' · ' + v.room + '已重排');
      return true;
    }
    if (a.action === 'apply-insert') {
      var req = M.insert.req || input.req;
      if (!req || !input.strategy) return false;
      var sim = M.insert.sim || K.simulateInsert(M.data, req);
      var op = sim.options.filter(function (x) { return x.key === input.strategy; })[0];
      if (!op) return false;
      var nd = K.applyInsert(M.data, req, input.strategy);
      delete nd.insertDraft; delete nd.insertPick;
      M.insert = { req: null, sim: null, pick: null }; M.focus = op.orderId;
      commit(nd, '已落单 ' + op.orderId + '（' + op.name + '）· ' + v.room + '已重排');
      setStep('room');
      return true;
    }
    if (a.action === 'apply-purchase') {
      if (!M.plan.po.length) return false;
      var r = K.applyPurchase(M.data, M.plan, input.ids && input.ids.length ? input.ids : null);
      if (!r.pos.length) return false;
      M.pos = M.pos.concat(r.pos);
      if (M.step !== 'stock') setStep('stock');
      commit(r.data, '已生成 ' + r.pos.length + ' 张采购单 · ' + v.room + '已重排');
      return true;
    }
    return false;
  }
  /* 文档摄入：内核只给新数据副本（SPEC §12 不许 apply 指回 ingest 自己），并进页面由宿主做 */
  function takeDoc(doc, step) {
    var c = chatCtx();
    var res = K.ingest(doc, step, c.data, c.lib, c.result);
    if (!res || !res.data) return res;
    var nd = res.data, ref = res.ref;
    return { text: res.text, blocks: res.blocks, act: function () {
      M.data = nd; recompute();
      if (nd.insertDraft) {                                 /* 订单表：草稿填进插单模拟，按三策略重排 */
        M.insert = { req: clone(nd.insertDraft), sim: null, pick: nd.insertPick || null };
        if (M.step !== 'insert') setStep('insert'); else { M.told = null; draw(); }
        focusSel('.pd-option.on', 900);
        return;
      }
      var to = homeOf(ref) || 'connect';
      if (M.step !== to) setStep(to); else draw();
      pulseRef(ref, 700);
    } };
  }
  function setPath(a) {
    if (a.path === 'focus') {
      if (!M.S.byId[a.value]) return false;
      M.focus = a.value;
      if (M.step !== 'order') setStep('order'); else draw();
      return true;
    }
    if (a.path === 'filter') {
      if (a.value != null && ['late', 'risk', 'ok', 'handled', 'done'].indexOf(a.value) < 0) return false;
      M.filter = a.value || null;
      if (M.step !== 'room') setStep('room'); else draw();
      var first = M.S.orders.filter(function (o) { return !M.filter || o.status === M.filter; })
        .sort(function (x, y) { return (y.lateDays || 0) - (x.lateDays || 0); })[0];
      if (first) pulseRef(first.id, 900);
      return true;
    }
    if (a.path === 'insert.pick') {
      if (['A', 'B', 'C'].indexOf(a.value) < 0) return false;
      M.insert.pick = a.value;
      if (M.step !== 'insert') setStep('insert'); else draw();
      focusSel('.pd-option.on', 700);
      return true;
    }
    return false;
  }

  window.DGG.chatBrain('m10', {
    kernel: window.DGG.coreM10,
    ctx: chatCtx,
    onDoc: takeDoc,
    act: function (a, api) {
      if (!a || !a.type || !M.S) return false;
      if (a.type === 'goto') {
        if (STEPS.indexOf(a.step) < 0) return false;
        if (a.step !== M.step) setStep(a.step);
        return true;
      }
      if (a.type === 'focus') return doFocus(a.ref, api);
      if (a.type === 'open') return openPanel(a);
      if (a.type === 'apply') return applyAct(a);
      if (a.type === 'set') return setPath(a);
      return false;                                         /* 不认识的动作交给通用兜底 */
    }
  });

  window.DGG = window.DGG || {};
  window.DGG.registerModule('m10', { mount: mount, unmount: unmount, onCompany: onCompany, onIndustry: onIndustry });
})();
