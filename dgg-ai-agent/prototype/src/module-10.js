/* AI ERP · 订单交付指挥室（六屏）
 * 接入 → 指挥室 → 订单下钻 → 插单模拟 → 物料与库存 → 交付日报
 * 每屏三拍：接入（来源亮起、数据包飞向排程引擎）→ 展开（数字滚、路径画、条形长、行流入）→ 结论（一句话横幅 + 聚焦）
 * 全部计算走 DGG.coreM10（与 skill 同一份内核）；对话大脑登记在 DGG.chatBrain('m10')
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
  function workEl() { return M.frame ? M.frame.work : null; }
  function rowOf(scope, txt) {
    var list = scope ? scope.querySelectorAll('.pd-table tbody tr') : [], i;
    for (i = 0; i < list.length; i++) if (list[i].textContent.indexOf(txt) >= 0) return list[i];
    return null;
  }
  function refocus(txt, ms) {
    setTimeout(function () { var el = rowOf(workEl(), txt); if (el) anim().pulse(el, { ms: 2200, scroll: true }); }, ms || 140);
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
      tabs: tabs, active: M.step, chat: { id: 'm10', name: 'AI ERP', step: M.step, onGo: setStep },
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
    var left = P.card({ cls: 'c8', title: v.orders + '全景', sub: rows.length + ' ' + v.counter + (M.filter ? ' · 已筛选' : '') + ' · 点行下钻', tight: true,
      body: [h('div', { class: 'pd-scroll m10-sc7' }, [tbl])],
      extra: [P.btn(v.insert, { cls: 'sm', onClick: function () { setStep('insert'); } }), P.btn(v.daily, { cls: 'sm', onClick: function () { setStep('daily'); } })] });
    g.appendChild(left);

    var curve = loadPath(240, 34);
    var days7 = S.days.slice(0, 7);
    var heat = P.heat({ days: days7, wd: true, labelW: '104px', rows: S.lines.map(function (L) { return { label: L.name, cells: L.days.slice(0, 7).map(function (c) { return { pct: c.pct, rest: c.rest, ot: c.ot > 0, title: L.name + ' ' + c.label + ' ' + c.used + '/' + c.cap + ' h' }; }) }; }) });
    var shorts = plan.items.filter(function (x) { return x.urgency === 'short' || x.urgency === 'safety'; });
    var shortShow = shorts.slice(0, 3);
    var list = h('div', { class: 'm10-short' });
    shortShow.forEach(function (x) {
      list.appendChild(h('button', { class: 'r ' + (x.urgency === 'short' ? 'late' : 'risk'), onclick: function () { setStep('stock'); } }, [
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
    var judgeCard = P.card({ title: 'AI 判断', sub: ex.label, body: [h('div', { class: 'm10-judge' }, [
      h('div', { class: 'vd ' + tone }, [P.chip(tone, ex.label), h('span', {}, [o.status === 'late' ? v.finish + ' ' + o.finishLabel + '，晚 ' + o.lateDays + ' 天' : o.status === 'risk' ? causeText(o) + ' · ' + v.finish + ' ' + o.finishLabel : v.finish + ' ' + o.finishLabel])]),
      h('div', { class: 'why' }, [cut(TX(ex.reasons[0] || ''), 40)]),
      actsEl
    ])] });

    var mats = [];
    o.ops.forEach(function (op) { (op.mat || []).forEach(function (m) { mats.push(m); }); });
    var matEl = h('div', { class: 'm10-mat' });
    mats.slice(0, 4).forEach(function (m) {
      var pct = m.need > 0 ? Math.max(4, Math.min(100, Math.round(100 * (m.need - (m.short || 0)) / m.need))) : 100;
      matEl.appendChild(h('div', { class: 'row' }, [
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
    if (!M.insert.req) M.insert.req = clone(d.insertPresets[0]);
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
    g.appendChild(P.card({ cls: 'c4', title: v.insertNoun, body: [h('div', { class: 'pd-form' }, [
      h('div', { class: 'pd-field' }, [h('label', {}, [v.customer]), custIn]),
      h('div', { class: 'pd-field' }, [h('label', {}, [v.product]), prodSel]),
      h('div', { class: 'pd-field' }, [h('label', {}, [v.qty + '（' + v.qtyUnit + '）']), qtyIn]),
      h('div', { class: 'pd-field' }, [h('label', {}, [v.due]), dueSel]),
      h('div', { class: 'pd-field' }, [h('label', {}, ['常用']), presets])
    ])] }));

    var opts = sim.options.map(function (op) {
      return { key: op.key, name: op.name, recommended: op.key === sim.recommend,
        headline: { big: op.finishLabel, tone: op.meetsDue ? 'ok' : 'late', sub: op.meetsDue ? '按期' : '晚 ' + op.lateDays + ' 天' },
        rows: [{ k: '拖累', v: op.affected + ' ' + v.counter, tone: op.affected ? 'bad' : 'good' }, { k: '转延期', v: op.newlyLate + ' ' + v.counter, tone: op.newlyLate ? 'bad' : 'good' }, { k: '后移', v: op.delayDaysTotal + ' 天' }, { k: '预计加班费', v: op.cost ? fmtN(op.cost) + ' 元' : '0 元' }],
        notes: op.notes && op.notes.length ? TX(op.notes[0]) : null };
    });
    var cmp = P.compare({ options: opts, active: M.insert.pick, onPick: function (kk) { M.insert.pick = kk; draw(); } });
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
        var nd = K.applyInsert(d, req, pick.key); M.insert = { req: null, sim: null, pick: null }; M.focus = pick.orderId;
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
    var left = P.card({ cls: 'c8', title: v.materials, sub: plan.items.length + ' 种 · 点行看走势', tight: true, body: [h('div', { class: 'pd-scroll m10-sc7' }, [tbl])] });
    g.appendChild(left);

    var sp = top ? P.spark({ curve: top.curve, safety: top.safety, days: M.S.days, height: 72 }) : null;
    var poShow = 2;
    var po = h('div', { class: 'm10-po' });
    plan.po.slice(0, poShow).forEach(function (p) {
      var sup = h('div', { class: 'sup' }, [h('div', { class: 't' }, [h('span', {}, [p.supplier || v.supplier]), h('span', { class: 'num' }, [fmtN(p.amount) + ' 元'])])]);
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
    doc.appendChild(sec('今日交付', delTbl));
    var riskTbl = D.risks.length ? P.table({ compact: true, cols: [
      { key: 'id', label: '单号', render: function (r) { return h('b', { class: 'id' }, [r.id]); } },
      { key: 'customer', label: v.customer, render: function (r) { return cut(r.customer, 12); } },
      { key: 'dueLabel', label: v.due, align: 'c' },
      { key: 'finishLabel', label: v.finish, align: 'c', render: function (r) { return h('span', { class: r.lateDays > 0 ? 'neg' : '' }, [r.finishLabel]); } },
      { key: 'causeLabel', label: '判断', render: function (r) { return r.status === 'late' ? r.causeLabel + ' · 晚 ' + r.lateDays + ' 天' : '风险'; } },
      { key: 'hd', label: '处置', render: function (r) { return r.handled ? P.chip('handled', r.actions.map(function (a) { return a.label; }).join('、')) : P.chip('watch', '待处置'); } }
    ], rows: D.risks }) : P.empty('无风险' + v.order);
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

  /* ================= 对话大脑 ================= */
  function mini(head, rows) {
    var t = h('table', { class: 'mini' });
    var tr = h('tr'); head.forEach(function (x) { tr.appendChild(h('th', {}, [String(x)])); });
    t.appendChild(tr);
    rows.slice(0, 6).forEach(function (r) { var q = h('tr'); r.forEach(function (x) { q.appendChild(h('td', {}, [String(x)])); }); t.appendChild(q); });
    return t;
  }
  function kvb(pairs) { var g = h('div', { class: 'kv' }); pairs.forEach(function (p) { g.appendChild(h('span', { class: 'k' }, [String(p[0])])); g.appendChild(h('span', { class: 'v' }, [String(p[1])])); }); return g; }
  function tagsb(list) { return h('div', { class: 'tags' }, list.filter(Boolean).map(function (x) { return h('span', {}, [String(x)]); })); }
  function has(q, list) { for (var i = 0; i < list.length; i++) if (q.indexOf(list[i]) >= 0) return true; return false; }
  function lateOrders() { return M.S.orders.filter(function (o) { return o.status === 'late'; }).sort(function (a, b) { return b.lateDays - a.lateDays; }); }
  function riskOrders() { return M.S.orders.filter(function (o) { return o.status === 'risk'; }); }
  function findOrder(q) {
    var hit = null;
    M.S.orders.forEach(function (o) { if (q.indexOf(o.id) >= 0 || q.indexOf(o.id.slice(-4)) >= 0) hit = o; });
    if (!hit) M.S.orders.forEach(function (o) { var c = o.customer.split(' · ')[0]; if (c && q.indexOf(c) >= 0) hit = o; });
    return hit;
  }
  function findMaterial(q) {
    var hit = null;
    M.plan.items.forEach(function (m) { if (q.indexOf(m.name) >= 0) hit = m; });
    if (!hit) M.plan.items.forEach(function (m) { if (m.name.length > 3 && q.indexOf(m.name.slice(0, 3)) >= 0) hit = m; });
    return hit;
  }

  function opener(step) {
    var v = V(), S = M.S, k = S.kpi, plan = M.plan, D = M.daily;
    var worst = lateOrders()[0];
    if (step === 'connect') {
      var total = M.data.sources.reduce(function (a, s) { return a + s.rows; }, 0);
      return M.data.sources.length + ' 个来源今早同步 ' + fmtN(total) + ' 条，' + k.open + ' ' + v.counter + v.orders + '里 ' + k.late + ' ' + v.counter + '已延期，合计晚 ' + k.lateDaysTotal + ' 天。';
    }
    if (step === 'room') {
      var over = S.lines.filter(function (L) { return L.status === 'over'; });
      return '按期率 ' + k.onTimeRate + '%' + (worst ? '，' + worst.id + ' 晚 ' + worst.lateDays + ' 天，延期天数居首' : '') + (over.length ? '；' + over.map(function (L) { return L.name + ' ' + L.load7 + '%'; }).join('、') + ' 已满负荷。' : '。');
    }
    if (step === 'order') {
      var o = S.byId[M.focus] || worst || S.orders[0];
      var acts = o.status === 'done' ? [] : K.actions(M.data, S, o.id);
      return o.id + ' ' + (o.lateDays > 0 ? '晚 ' + o.lateDays + ' 天' : causeText(o)) + '，卡在' + (o.currentOp ? '「' + o.currentOp + '」' + o.currentLine : v.ops)
        + (acts[0] ? '；' + acts[0].label + ' ' + acts[0].targetName + ' 可到 ' + acts[0].effect.finishAfter + '，预计 ' + fmtN(acts[0].cost) + ' 元。' : '。');
    }
    if (step === 'insert') {
      if (!M.insert.sim) return v.insertNoun + '填好就能按三种策略各排一遍。';
      var sim = M.insert.sim, rec = sim.options.filter(function (x) { return x.key === sim.recommend; })[0];
      return M.insert.req.customer + ' 加急 ' + fmtN(M.insert.req.qty) + ' ' + v.qtyUnit + '：方案 ' + rec.key + ' ' + rec.name + ' ' + rec.finishLabel + ' 完工，拖累 ' + rec.affected + ' ' + v.counter + '，预计 ' + fmtN(rec.cost) + ' 元。';
    }
    if (step === 'stock') {
      var t0 = plan.items.filter(function (x) { return x.urgency === 'short'; })[0] || plan.items[0];
      return t0.name + ' 库存 ' + fmtN(t0.stock) + '、在途 ' + fmtN(t0.onOrder) + '，排程需 ' + fmtN(t0.demand) + ' ' + t0.unit + '、安全库存 ' + fmtN(t0.safety) + ' ' + t0.unit + '，下单截止 ' + t0.latestOrderLabel + '；' + plan.summary.buy + ' 项待下单预计 ' + fmtN(plan.summary.amount) + ' 元。';
    }
    if (step === 'daily') {
      var mustBuy = plan.items.filter(function (x) { return x.suggestQty > 0 && x.latestOrderDay <= 0; }).length;
      return '今日 ' + D.deliveries.filter(function (x) { return x.ok; }).length + ' ' + v.counter + '可交付；风险与延期 ' + D.risks.length + ' ' + v.counter + '（延期 ' + D.kpi.late + ' ' + v.counter + '、风险 ' + D.kpi.risk + ' ' + v.counter + '）；' + mustBuy + ' 项' + v.material + '今日须下单。';
    }
    return null;
  }

  function suggest(step) {
    var v = V();
    if (step === 'connect') return ['延期的是哪几' + v.counter, '数据源都通了吗', '为什么会延期', '直接进' + v.room];
    if (step === 'room') return ['按期率为什么只有 ' + M.S.kpi.onTimeRate + '%', '哪条' + v.line + '满负荷', '先处理哪一' + v.counter, v.material + '缺口在哪'];
    if (step === 'order') return ['为什么晚', '加班要花多少', '调线行不行', '换下一' + v.counter];
    if (step === 'insert') return ['三个方案差在哪', '哪些' + v.order + '被拖累', '按 C 排要多少钱', '就按推荐落单'];
    if (step === 'stock') return ['今天哪几项要下单', '采购单一共多少钱', '呆滞占了多少钱', '生成采购单'];
    if (step === 'daily') return ['今天能交几' + v.counter, '明天要注意什么', '风险' + v.order + '有哪些', '发给谁'];
    return null;
  }

  function answer(q, step) {
    if (!M.S) return null;
    var v = V(), S = M.S, k = S.kpi, plan = M.plan, D = M.daily, w = workEl();
    q = String(q || '');

    /* —— 点名某一张单 —— */
    var oq = findOrder(q);
    if (oq && !has(q, ['物料', '库存'])) {
      var acts0 = oq.status === 'done' ? [] : K.actions(M.data, S, oq.id);
      var txt = oq.id + ' ' + cut(oq.customer, 14) + ' · ' + oq.productName + ' × ' + fmtN(oq.qty) + ' ' + v.qtyUnit + '\n'
        + v.due + ' ' + oq.dueLabel + '，' + v.finish + ' ' + oq.finishLabel + (oq.lateDays > 0 ? '，晚 ' + oq.lateDays + ' 天' : '，余量 ' + oq.slack + ' 天')
        + '；齐套 ' + Math.round(oq.kitRate * 100) + '%，' + (oq.currentOp ? '当前「' + oq.currentOp + '」在 ' + oq.currentLine : '全部完工') + '。';
      if (acts0[0]) txt += '\n建议' + acts0[0].label + ' ' + acts0[0].targetName + '：' + v.finish + ' ' + acts0[0].effect.finishBefore + ' → ' + acts0[0].effect.finishAfter + '，预计 ' + fmtN(acts0[0].cost) + ' 元。';
      return { text: txt, act: function () { M.focus = oq.id; if (step !== 'order') setStep('order'); else draw(); } };
    }

    /* —— 点名某一种物料 —— */
    var mq = findMaterial(q);
    if (mq) {
      return { text: mq.name + '：库存 ' + fmtN(mq.stock) + ' ' + mq.unit + '、安全库存 ' + fmtN(mq.safety) + '、在途 ' + fmtN(mq.onOrder) + '，排程需 ' + fmtN(mq.demand) + ' ' + mq.unit + '。\n'
        + (mq.suggestQty ? '建议下单 ' + fmtN(mq.suggestQty) + ' ' + mq.unit + '（' + mq.supplier + '，提前期 ' + mq.leadDays + ' 天），下单截止 ' + mq.latestOrderLabel + '，预计 ' + fmtN(mq.amount) + ' 元。' : '排程内无需补单。'),
        blocks: mq.drivers.length ? [tagsb(mq.drivers.slice(0, 3))] : null,
        act: function () { if (step !== 'stock') { setStep('stock'); setTimeout(function () { openMaterial(mq); }, 420); } else openMaterial(mq); } };
    }

    if (has(q, ['数据源', '来源', '同步', '接入', '通了'])) {
      return { text: M.data.sources.map(function (s) { return s.name + ' ' + (s.mode === 'direct' ? '系统直连' : '表格导入') + ' ' + fmtN(s.rows) + ' 条 · ' + s.lastSync.slice(5); }).join('\n'),
        act: function () { if (step !== 'connect') setStep('connect'); focusSel('.pd-table', 600); } };
    }
    if (has(q, ['进指挥室', '进入', '开始', '直接进'])) return { text: v.room + '按' + v.due + '倒推排了一遍，' + k.late + ' ' + v.counter + '延期、' + k.risk + ' ' + v.counter + '风险。', act: function () { if (!M.charged) enterRoom(); else setStep('room'); } };

    /* 屏内问句先由本屏分支接：站在订单下钻屏问「为什么晚」，答的是这一张单，不跳走 */
    if (step === 'order') {
      var o = S.byId[M.focus] || lateOrders()[0] || S.orders[0];
      var ex = K.explain(S, o.id), acts = o.status === 'done' ? [] : K.actions(M.data, S, o.id);
      if (has(q, ['为什么', '原因', '怎么回事', '卡在'])) {
        return { text: o.id + ' ' + ex.label + '：' + TX(ex.reasons[0]) + '。\n' + TX(ex.seen[0]),
          blocks: [kvb([[v.due, o.dueLabel], [v.finish, o.finishLabel], ['余量', o.slack + ' 天'], ['齐套', Math.round(o.kitRate * 100) + '%']])],
          focus: w ? w.querySelector('.m10-judge') : null };
      }
      if (has(q, ['加班'])) {
        var ot = acts.filter(function (a) { return a.key === 'overtime'; })[0];
        if (!ot) return { text: '这一' + v.counter + '排不出加班收益，换调线或改期更划算。' };
        return { text: ot.targetName + ' 加班 3 h/日，' + v.finish + ' ' + ot.effect.finishBefore + ' → ' + ot.effect.finishAfter + '，'
          + (ot.effect.meetsDue ? '赶上' + v.due : '追回 ' + ot.effect.gain + ' 天') + '，拖累 ' + ot.effect.affected + ' ' + v.counter + '，预计 ' + fmtN(ot.cost) + ' 元。\n已按这个方案执行，' + v.room + '重排。',
          act: function () { var p = clone(ot.params); p.cost = ot.cost; commit(K.applyAction(M.data, o.id, 'overtime', p), '已加班 · ' + ot.targetName); } };
      }
      if (has(q, ['调线', '换线', '换条'])) {
        var rr = acts.filter(function (a) { return a.key === 'reroute'; })[0];
        if (!rr) return { text: '这道' + v.op + '没有可替代' + v.line + '，调线走不通。' };
        return { text: TX(rr.desc) + '：' + v.finish + ' ' + rr.effect.finishBefore + ' → ' + rr.effect.finishAfter
          + (rr.effect.gain > 0 ? '，追回 ' + rr.effect.gain + ' 天，不花钱。已按这个方案执行。' : rr.effect.gain < 0 ? '，反而晚 ' + (-rr.effect.gain) + ' 天，不建议动。' : '，没改善，不建议动。'),
          act: rr.effect.gain > 0 ? function () { var p = clone(rr.params); p.cost = 0; commit(K.applyAction(M.data, o.id, 'reroute', p), '已调线 · ' + rr.targetName); } : null };
      }
      if (has(q, ['改期', '改约', '跟客户'])) {
        var rs = acts.filter(function (a) { return a.key === 'reschedule'; })[0];
        if (!rs) return { text: '这一' + v.counter + '不需要改期。' };
        return { text: TX(rs.desc) + '：改完不再算延期，不动其他' + v.orders + '的排程，不花钱。\n已按这个方案执行。',
          act: function () { var p = clone(rs.params); p.cost = 0; commit(K.applyAction(M.data, o.id, 'reschedule', p), '已改期 · ' + cut(rs.targetName, 12)); } };
      }
      if (has(q, ['齐套', '物料', '缺料', '领料'])) {
        var mats = [];
        o.ops.forEach(function (op) { (op.mat || []).forEach(function (m) { mats.push(m); }); });
        if (!mats.length) return { text: '这一' + v.counter + '没有待领' + v.material + '，齐套 100%。' };
        return { text: '齐套 ' + Math.round(o.kitRate * 100) + '%：' + mats.map(function (m) { return m.name + ' 需 ' + fmtN(m.need) + ' ' + m.unit + (m.ready === 0 ? ' 齐备' : m.assumed ? ' 缺 ' + fmtN(m.short) : ' ' + m.readyLabel + ' 到'); }).join('；') + '。',
          focus: w ? w.querySelector('.m10-mat') : null };
      }
      if (has(q, ['下一', '换一', '别的'])) {
        var al = S.orders.filter(function (x) { return x.status === 'late' || x.status === 'risk'; });
        var i2 = al.map(function (x) { return x.id; }).indexOf(o.id), nx = al[(i2 + 1) % al.length];
        return { text: nx.id + ' ' + causeText(nx) + '，' + v.finish + ' ' + nx.finishLabel + (nx.lateDays > 0 ? '，晚 ' + nx.lateDays + ' 天' : '') + '。',
          act: function () { M.focus = nx.id; draw(); } };
      }
    }

    if (has(q, ['为什么']) && has(q, ['延期', '晚', '按期'])) {
      var L0 = lateOrders();
      if (!L0.length) return { text: '在手 ' + k.open + ' ' + v.counter + '全部按期，按期率 ' + k.onTimeRate + '%。' };
      var by = {};
      L0.forEach(function (o) { var c = K.CAUSES[o.cause].label; by[c] = (by[c] || 0) + 1; });
      var ov = S.lines.filter(function (L2) { return L2.status === 'over'; });
      return { text: '延期 ' + L0.length + ' ' + v.counter + '的归因：' + Object.keys(by).map(function (c) { return c + ' ' + by[c] + ' ' + v.counter; }).join('、') + '。\n'
        + (ov.length ? ov.map(function (L2) { return L2.name; }).join('、') + ' 未来 7 天负荷 ' + ov[0].load7 + '%，' + v.op + '排队等' + v.line + '；' : '')
        + '齐套率低于 100% 的有 ' + S.orders.filter(function (o) { return o.status !== 'done' && o.kitRate < 1; }).length + ' ' + v.counter + '。',
        blocks: [mini(['单号', '归因', '晚'], L0.map(function (o) { return [o.id.slice(-4), K.CAUSES[o.cause].label, o.lateDays + ' 天']; }))],
        act: function () { if (step !== 'room') setStep('room'); M.filter = 'late'; draw(); refocus(L0[0].id, 900); } };
    }
    if (has(q, ['延期', '晚了', '迟', '按期率', '准时'])) {
      var L = lateOrders();
      if (!L.length) return { text: '在手 ' + k.open + ' ' + v.counter + '全部按期，按期率 ' + k.onTimeRate + '%。' };
      return { text: '按期率 ' + k.onTimeRate + '%：' + k.open + ' ' + v.counter + '在手，' + k.late + ' ' + v.counter + '延期合计 ' + k.lateDaysTotal + ' 天。\n'
        + L.map(function (o) { return o.id + ' ' + K.CAUSES[o.cause].label + ' 晚 ' + o.lateDays + ' 天'; }).join('；') + '。',
        blocks: [mini(['单号', v.due, v.finish, '晚'], L.map(function (o) { return [o.id.slice(-4), o.dueLabel, o.finishLabel, o.lateDays + ' 天']; }))],
        act: function () { if (step !== 'room') setStep('room'); M.filter = 'late'; draw(); refocus(L[0].id, 900); } };
    }
    if (has(q, ['风险', '要小心', '会不会'])) {
      /* 日报屏的「风险与延期」是延期 + 风险的合集，屏上与气泡里取同一份 */
      if (step === 'daily') {
        if (!D.risks.length) return { text: v.daily + '里没有延期或风险' + v.order + '。' };
        return { text: v.daily + '「风险与延期」' + D.risks.length + ' ' + v.counter + '：延期 ' + k.late + ' ' + v.counter + '、风险 ' + k.risk + ' ' + v.counter + '。\n'
          + D.risks.map(function (r) { return r.id + ' ' + r.causeLabel + (r.lateDays > 0 ? ' 晚 ' + r.lateDays + ' 天' : '') + (r.handled ? '（已处置）' : ''); }).join('；') + '。',
          blocks: [mini(['单号', '判断', v.finish], D.risks.map(function (r) { return [r.id.slice(-4), r.causeLabel, r.finishLabel]; }))],
          focus: w ? w.querySelector('.pd-doc .m10-sc5') : null };
      }
      var R = riskOrders();
      if (!R.length) return { text: '当前没有风险' + v.order + '。' };
      return { text: R.length + ' ' + v.counter + '风险：' + R.map(function (o) { return o.id + ' ' + causeText(o) + '（余量 ' + o.slack + ' 天）'; }).join('；') + '。',
        blocks: [mini(['单号', '判断', '余量'], R.map(function (o) { return [o.id.slice(-4), causeText(o), o.slack + ' 天']; }))],
        act: step === 'daily' ? null : function () { if (step !== 'room') setStep('room'); M.filter = 'risk'; draw(); } };
    }
    if (has(q, [v.line, '负荷', '瓶颈', '满负荷', '产能'])) {
      var over = S.lines.filter(function (L2) { return L2.status !== 'ok'; });
      return { text: '7 日平均负荷 ' + k.load7 + '%' + (over.length ? '；' + over.map(function (L2) { return L2.name + ' ' + L2.load7 + '%'; }).join('、') + '。' : '，没有满负荷' + v.line + '。'),
        blocks: [mini([v.line, '负荷'], S.lines.map(function (L2) { return [cut(L2.name, 8), L2.load7 + '%']; }))],
        act: function () { if (step !== 'room') setStep('room'); focusSel('.pd-heat', 700); } };
    }
    if (has(q, ['先处理', '先做', '怎么办', '下一步', '建议'])) {
      var L3 = lateOrders(), o3 = L3[0] || riskOrders()[0];
      if (!o3) return { text: '在手' + v.orders + '按期，先把 ' + plan.summary.buy + ' 项采购单下掉。', act: function () { setStep('stock'); } };
      var a3 = K.actions(M.data, S, o3.id)[0];
      return { text: '先看 ' + o3.id + '（' + K.CAUSES[o3.cause].label + '，晚 ' + o3.lateDays + ' 天）'
        + (a3 ? '：' + a3.label + ' ' + a3.targetName + '，' + v.finish + ' ' + a3.effect.finishBefore + ' → ' + a3.effect.finishAfter + '，拖累 ' + a3.effect.affected + ' ' + v.counter + '，预计 ' + fmtN(a3.cost) + ' 元。' : '。'),
        act: function () { M.focus = o3.id; setStep('order'); } };
    }

    if (step === 'insert' && M.insert.sim) {
      var sim = M.insert.sim, rec = sim.options.filter(function (x) { return x.key === sim.recommend; })[0];
      var pick = sim.options.filter(function (x) { return x.key === M.insert.pick; })[0] || rec;
      if (has(q, ['落单', '就按', '执行', '下单'])) {
        var use = has(q, ['推荐']) ? rec : pick;
        return { text: '按方案 ' + use.key + '（' + use.name + '）落单，' + v.finish + ' ' + use.finishLabel + '；落单后' + v.orders + '按新排程刷新。',
          act: function () { var nd = K.applyInsert(M.data, M.insert.req, use.key); var oid = use.orderId; M.insert = { req: null, sim: null, pick: null }; M.focus = oid; commit(nd, '已落单 ' + oid + ' · ' + v.room + '已重排'); setStep('room'); } };
      }
      if (has(q, ['差在哪', '三个方案', '对比', '哪个好', '推荐'])) {
        return { text: sim.options.map(function (op) { return op.key + ' ' + op.name + ' ' + op.finishLabel + (op.meetsDue ? ' 按期' : ' 晚 ' + op.lateDays + ' 天') + '，拖累 ' + op.affected + ' ' + v.counter + '，预计 ' + fmtN(op.cost) + ' 元'; }).join('\n') + '。\nAI 推荐 ' + sim.recommend + '：' + TX(sim.reason) + '。',
          blocks: [mini(['方案', v.finish, '拖累', '费用'], sim.options.map(function (op) { return [op.key, op.finishLabel, op.affected + ' ' + v.counter, fmtN(op.cost)]; }))],
          act: function () { M.insert.pick = sim.recommend; draw(); focusSel('.pd-option.on', 700); } };
      }
      if (has(q, ['拖累', '影响', '谁被', '哪些'])) {
        var aff = pick.rows.filter(function (r) { return r.delta > 0; });
        if (!aff.length) return { text: '方案 ' + pick.key + ' 不推后任何在手' + v.order + '。' };
        return { text: '方案 ' + pick.key + ' 推后 ' + aff.length + ' ' + v.counter + '：' + aff.map(function (r) { return r.id + ' ' + r.before + ' → ' + r.after + '（+' + r.delta + ' 天）'; }).join('；') + '，转延期 ' + pick.newlyLate + ' ' + v.counter + '。',
          blocks: [mini(['单号', '前', '后'], aff.map(function (r) { return [r.id.slice(-4), r.before, r.after]; }))],
          focus: w ? w.querySelector('.pd-table') : null };
      }
      if (has(q, ['C', '加班', '多少钱', '费用'])) {
        var C = sim.options.filter(function (x) { return x.key === 'C'; })[0];
        return { text: '方案 C ' + C.name + '：' + v.finish + ' ' + C.finishLabel + '，拖累 ' + C.affected + ' ' + v.counter + '，预计加班费 ' + fmtN(C.cost) + ' 元。'
          + (C.notes.length ? '\n' + TX(C.notes.join('；')) + '。' : ''),
          act: function () { M.insert.pick = 'C'; draw(); focusSel('.pd-option.on', 700); } };
      }
    }

    if (step === 'stock' || has(q, ['采购', '下单', '缺口', '呆滞', '库存'])) {
      if (has(q, ['呆滞', '占用', '压着'])) {
        if (!plan.slow.length) return { text: '没有呆滞' + v.material + '。' };
        return { text: '呆滞 ' + plan.slow.length + ' 项占用 ' + fmtN(plan.summary.slowCapital) + ' 元：' + plan.slow.map(function (x) { return x.name + ' ' + fmtN(x.stock) + ' ' + x.unit + '（' + fmtN(x.capital) + ' 元）'; }).join('；') + '。',
          act: function () { if (step !== 'stock') setStep('stock'); setTimeout(openSlow, 420); } };
      }
      if (has(q, ['今天', '今日', '要下单', '来不及', '截止'])) {
        var today = plan.items.filter(function (x) { return x.suggestQty > 0 && x.latestOrderDay <= 0; });
        if (!today.length) return { text: '今日没有到下单截止的' + v.material + '。' };
        return { text: today.length + ' 项今日到截止：' + today.map(function (x) { return x.name + ' ' + fmtN(x.suggestQty) + ' ' + x.unit + (x.overdue ? '（已过）' : ''); }).join('；') + '，合计预计 ' + fmtN(today.reduce(function (a, x) { return a + x.amount; }, 0)) + ' 元。',
          blocks: [mini([v.material, '建议', '截止'], today.map(function (x) { return [cut(x.name, 7), fmtN(x.suggestQty) + ' ' + x.unit, x.latestOrderLabel]; }))],
          act: function () { if (step !== 'stock') setStep('stock'); refocus(today[0].name, 900); } };
      }
      if (has(q, ['多少钱', '总共', '一共', '金额'])) {
        return { text: plan.po.length + ' 张采购单、' + plan.summary.buy + ' 项，预计 ' + fmtN(plan.summary.amount) + ' 元：' + plan.po.map(function (p) { return p.supplier + ' ' + fmtN(p.amount) + ' 元'; }).join('；') + '。',
          blocks: [mini([v.supplier, '金额'], plan.po.map(function (p) { return [cut(p.supplier, 8), fmtN(p.amount) + ' 元']; }))],
          act: function () { if (step !== 'stock') setStep('stock'); focusSel('.m10-po', 700); } };
      }
      if (has(q, ['生成', '下掉', '开单'])) {
        if (!plan.po.length) return { text: '当前没有需要下单的' + v.material + '。' };
        return { text: '生成 ' + plan.po.length + ' 张采购单，预计 ' + fmtN(plan.summary.amount) + ' 元；计入在途后' + v.orders + '按到货日重排。',
          act: function () { var r = K.applyPurchase(M.data, plan); M.pos = M.pos.concat(r.pos); if (step !== 'stock') setStep('stock'); commit(r.data, '已生成 ' + r.pos.length + ' 张采购单'); } };
      }
      if (has(q, ['缺口', '缺料', '不够'])) {
        var sh2 = plan.items.filter(function (x) { return x.urgency === 'short' || x.urgency === 'safety'; });
        return { text: '缺口 ' + plan.summary.short + ' 项、低于安全库存 ' + plan.summary.safety + ' 项：' + sh2.slice(0, 4).map(function (x) { return x.name + ' 库存 ' + fmtN(x.stock) + ' / 需 ' + fmtN(x.demand) + ' ' + x.unit; }).join('；') + '。',
          blocks: [mini([v.material, '库存', '需求'], sh2.slice(0, 5).map(function (x) { return [cut(x.name, 7), fmtN(x.stock), fmtN(x.demand)]; }))],
          act: function () { if (step !== 'stock') setStep('stock'); } };
      }
    }

    if (step === 'daily' || has(q, ['日报', '今天能交', '明天', '发给谁'])) {
      if (has(q, ['发给谁', '收件', '微信', '发送'])) {
        return { text: '收件人：' + [v.handler, '车间主任', '总经理', '采购主管'].join('、')+ '。' + v.daily + '是微信文本版，扫码接收。',
          act: function () { sh.setQrReady(true); sh.showWeChat(); } };
      }
      if (has(q, ['今天能交', '今日交付', '几' + v.counter, '交几'])) {
        if (!D.deliveries.length) return { text: '今日没有到期' + v.order + '。' };
        return { text: D.deliveries.map(function (x) { return x.id + ' ' + cut(x.customer, 12) + ' ' + (x.ok ? '可交付' : '延至 ' + x.finishLabel); }).join('\n') + '。',
          act: function () { if (step !== 'daily') setStep('daily'); focusSel('.pd-doc .sec', 700); } };
      }
      if (has(q, ['明天', '明日', '注意'])) {
        if (!D.tomorrow.length) return { text: '明日无到期、开工与到货事项。' };
        return { text: tomorrowList().slice(0, 6).map(function (t) { return TX(t.text); }).join('\n'),
          act: function () { if (step !== 'daily') setStep('daily'); focusSel('.pd-doc ul', 700); } };
      }
    }

    if (has(q, ['插单', '加急', '模拟'])) {
      return { text: v.insertNoun + '按三种策略各排一遍：' + v.strategies.A + ' / ' + v.strategies.B + ' / ' + v.strategies.C + '，逐' + v.counter + '对比受影响的在手' + v.order + '与代价。',
        act: function () { setStep('insert'); } };
    }
    if (has(q, ['多少' + v.counter, '在手', '几' + v.counter])) {
      return { text: '在手 ' + k.open + ' ' + v.counter + '：按期 ' + (k.open - k.late) + '、风险 ' + k.risk + '、延期 ' + k.late + '；已完工待发运 ' + k.done + ' ' + v.counter + '。' };
    }
    return null;
  }

  /* ---------- 文档：订单表排产 / 科目余额对账 / 采购合同 / 邮件 ---------- */
  function colsOf(head) {
    var map = {};
    (head || []).forEach(function (x, i) {
      var s = String(x || '');
      if (map.id == null && /单号|订单|编号|工单/.test(s)) map.id = i;
      if (map.cust == null && /客户|甲方|收货|买方/.test(s)) map.cust = i;
      if (map.prod == null && /产品|品名|物料名|规格|型号|商品/.test(s)) map.prod = i;
      if (map.qty == null && /数量|件数|台数|订量/.test(s)) map.qty = i;
      if (map.due == null && /交期|交付|到期|需求日|完成日/.test(s)) map.due = i;
      if (map.acc == null && /科目/.test(s)) map.acc = i;
      if (map.end == null && /期末/.test(s)) map.end = i;
      if (map.dr == null && /借方/.test(s)) map.dr = i;
      if (map.cr == null && /贷方/.test(s)) map.cr = i;
    });
    return map;
  }
  function numOf(x) { var n = parseFloat(String(x == null ? '' : x).replace(/[,，\s元]/g, '')); return isNaN(n) ? 0 : n; }
  var CN = { '零': 0, '一': 1, '二': 2, '两': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10 };
  function cnNum(t) {
    t = String(t || '').trim();
    if (/^[\d.]+$/.test(t)) return parseFloat(t);
    if (CN[t] != null) return CN[t];
    var m = /^十([一二三四五六七八九])$/.exec(t); if (m) return 10 + CN[m[1]];
    var m2 = /^([一二三四五六七八九])十([一二三四五六七八九])?$/.exec(t); if (m2) return CN[m2[1]] * 10 + (m2[2] ? CN[m2[2]] : 0);
    return NaN;
  }
  function addSource(doc, rows, note) {
    var nd = clone(M.data);
    nd.sources = nd.sources.filter(function (s) { return s.id !== 'doc-import'; });
    nd.sources.push({ id: 'doc-import', name: cut(doc.name, 16), mode: 'import', lastSync: nd.today + ' 14:20', rows: rows });
    M.data = nd; recompute();
    return note;
  }
  function docExcel(doc) {
    var v = V(), s0 = (doc.sheets || [])[0];
    if (!s0 || !s0.rows.length) return { text: 'Excel《' + doc.name + '》读完，没有可用数据行。' };
    var head = s0.rows[0], body = s0.rows.slice(1).filter(function (r) { return r.join('').trim(); });
    var map = colsOf(head);

    /* 1) 订单表 → 真的排一遍产 */
    if (map.qty != null && (map.due != null || map.prod != null) && (map.id != null || map.cust != null)) {
      var r0 = body[0] || [];
      var qty = Math.max(1, Math.round(numOf(r0[map.qty])));
      var prod = M.data.products[0];
      if (map.prod != null) {
        var pn = String(r0[map.prod] || '');
        M.data.products.forEach(function (p) { if (pn && (p.name.indexOf(pn) >= 0 || pn.indexOf(p.name.slice(0, 4)) >= 0)) prod = p; });
      }
      var dueDay = 7, dueRaw = map.due != null ? String(r0[map.due] || '') : '';
      var md = dueRaw.match(/(\d{4})\D(\d{1,2})\D(\d{1,2})/);
      if (md) { var dd = K.dayIdx(M.data, md[1] + '-' + ('0' + md[2]).slice(-2) + '-' + ('0' + md[3]).slice(-2)); if (dd >= 1 && dd <= 20) dueDay = dd; }
      var req = { customer: cut(map.cust != null ? String(r0[map.cust] || '') : (map.id != null ? String(r0[map.id]) : ''), 16) || 'K-040 · 导入', product: prod.id, qty: qty, due: K.dateOf(M.data, dueDay) };
      var sim = K.simulateInsert(M.data, req), rec = sim.options.filter(function (x) { return x.key === sim.recommend; })[0];
      addSource(doc, body.length, '');
      M.insert = { req: req, sim: sim, pick: sim.recommend };
      return { text: 'Excel《' + doc.name + '》读完：《' + s0.name + '》' + body.length + ' 行 ' + head.length + ' 列。\n'
        + '按第 1 行排产：' + req.customer + ' · ' + prod.name + ' × ' + fmtN(qty) + ' ' + v.qtyUnit + '，' + v.due + ' ' + K.short(M.data, dueDay) + '。\n'
        + '三种策略各排一遍：' + sim.options.map(function (op) { return op.key + ' ' + op.finishLabel + '（拖累 ' + op.affected + '，' + fmtN(op.cost) + ' 元）'; }).join('，') + '；推荐 ' + rec.key + '。已填进' + v.insert + '。',
        blocks: [mini(head.slice(0, 4).map(function (x) { return cut(x, 6); }), body.slice(0, 3).map(function (r) { return r.slice(0, 4).map(function (x) { return cut(x, 10); }); }))],
        act: function () { setStep('insert'); focusSel('.pd-option.on', 900); } };
    }

    /* 2) 科目余额表 → 与库存、应付口径对一遍 */
    if (map.acc != null && (map.end != null || map.dr != null)) {
      var pick = function (re) { for (var i = 0; i < body.length; i++) { if (re.test(body[i].join('|'))) return body[i]; } return null; };
      var gr = pick(/库存商品|产成品/), ap = pick(/应付账款/), ar = pick(/应收账款/);
      var matCap = M.data.materials.reduce(function (a, m) { return a + (m.stock || 0) * (m.unitCost || 0); }, 0);
      var lines = ['Excel《' + doc.name + '》读完：《' + s0.name + '》' + body.length + ' 行，列是 ' + head.slice(0, 6).map(function (x) { return cut(x, 6); }).join(' / ') + '。'];
      var kv = [];
      var cell = function (row, i) { return row && i != null && row[i] != null && String(row[i]).trim() !== '' ? numOf(row[i]) : null; };
      if (gr) {
        var endV = cell(gr, map.end), d1 = cell(gr, map.dr) || 0, c1 = cell(gr, map.cr) || 0;
        lines.push('库存商品' + (endV != null ? '期末 ' + fmtN(endV) + ' 元，' : '') + '本期借 ' + fmtN(d1) + ' / 贷 ' + fmtN(c1) + '，净增 ' + fmtN(d1 - c1) + ' 元；本模块' + v.material + '库存按单价折 ' + fmtN(matCap) + ' 元，其中呆滞 ' + M.plan.slow.length + ' 项占 ' + fmtN(M.plan.summary.slowCapital) + ' 元。');
        if (endV != null) kv.push(['库存商品期末', fmtN(endV) + ' 元']);
        kv.push([v.material + '折价', fmtN(matCap) + ' 元'], ['呆滞占用', fmtN(M.plan.summary.slowCapital) + ' 元']);
      }
      if (ap) {
        var apEnd = cell(ap, map.end), apCr = cell(ap, map.cr);
        lines.push('应付账款' + (apEnd != null ? '期末 ' + fmtN(apEnd) + ' 元' : '本期贷方 ' + fmtN(apCr || 0) + ' 元（这张表没有期末格）') + '；本模块 ' + M.plan.summary.buy + ' 项采购单草稿预计 ' + fmtN(M.plan.summary.amount) + ' 元，落单后应付增 ' + fmtN(M.plan.summary.amount) + ' 元。');
        kv.push([apEnd != null ? '应付账款期末' : '应付账款本期贷方', fmtN(apEnd != null ? apEnd : (apCr || 0)) + ' 元'], ['采购单草稿', fmtN(M.plan.summary.amount) + ' 元']);
      }
      if (ar && cell(ar, map.end) != null) kv.push(['应收账款期末', fmtN(cell(ar, map.end)) + ' 元']);
      lines.push('这张表没有' + v.order + '与' + v.due + '列，排程不动数；已登记为导入批次。');
      addSource(doc, body.length, '');
      return { text: lines.join('\n'), blocks: [kvb(kv)],
        act: function () { if (M.step !== 'stock') setStep('stock'); focusSel('.m10-po', 800); } };
    }

    /* 3) 其他表：把真读到的列与行数说清楚 */
    addSource(doc, body.length, '');
    return { text: 'Excel《' + doc.name + '》读完：' + doc.sheets.length + ' 张表，《' + s0.name + '》' + body.length + ' 行 ' + head.length + ' 列。\n'
      + '列是 ' + head.slice(0, 6).map(function (x) { return cut(x, 8); }).join(' / ') + '。\n'
      + '排产要 ' + ['单号', v.customer, v.product, v.qty, v.due].join(' / ') + ' 这几列，这张表里没有，排程不动数。已按 ' + body.length + ' 行登记为导入批次。',
      blocks: [mini(head.slice(0, 4).map(function (x) { return cut(x, 6); }), body.slice(0, 3).map(function (r) { return r.slice(0, 4).map(function (x) { return cut(x, 10); }); }))],
      act: function () { if (M.step !== 'connect') setStep('connect'); else draw(); focusSel('.pd-table tbody tr:last-child', 700); } };
  }
  function docWord(doc, txt) {
    var v = V(), k = M.S.kpi;
    var mAmt = txt.match(/(?:合同)?金额[^0-9]{0,8}([\d,]+(?:\.\d+)?)\s*元/) || txt.match(/人民币\s*([\d,]+(?:\.\d+)?)\s*元/);
    var mDue = txt.match(/(20\d{2})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
    var mPen = txt.match(/万分之\s*([\d.]+|[零一二三四五六七八九十]{1,3})/);
    var mCap = txt.match(/不超过[^0-9]{0,10}([\d.]+)\s*%/);
    var mB = txt.match(/乙方[：:\s]*([^\s　,，。；]{3,20})/);
    var lines = [(doc.kind === 'pdf' ? 'PDF' : 'Word') + '《' + doc.name + '》读完：' + (doc.paragraphs.length || 1) + ' 段'
      + (doc.tables && doc.tables.length ? '、' + doc.tables.length + ' 张表' : '') + '。'];
    var kv = [];
    if (mB) { lines.push('乙方 ' + mB[1] + '。'); kv.push(['乙方', cut(mB[1], 14)]); }
    if (mAmt) kv.push(['合同金额', mAmt[1] + ' 元']);
    if (mDue) {
      var due = mDue[1] + '-' + ('0' + mDue[2]).slice(-2) + '-' + ('0' + mDue[3]).slice(-2);
      var days = Math.round((Date.parse(due) - Date.parse(M.data.today)) / 86400000);
      lines.push('交付期限 ' + due + '，距 ' + M.data.today + ' 还有 ' + days + ' 天；排程窗口 ' + M.data.horizon + ' 天，落在窗口' + (days <= M.data.horizon ? '内' : '外') + '。');
      kv.push(['交付期限', due], ['剩余', days + ' 天']);
    }
    if (mPen && mAmt && !isNaN(cnNum(mPen[1]))) {
      var amt = numOf(mAmt[1]), pen = cnNum(mPen[1]), rate = pen / 10000;
      var fee = Math.round(amt * rate * k.lateDaysTotal);
      var capV = mCap ? Math.round(amt * parseFloat(mCap[1]) / 100) : null;
      lines.push('逾期口径按日万分之 ' + pen + (mCap ? '、累计不超 ' + mCap[1] + '%' : '') + '：套当前延期合计 ' + k.lateDaysTotal + ' 天，'
        + fmtN(amt) + ' × ' + pen + '‱ × ' + k.lateDaysTotal + ' = 预计 ' + fmtN(fee) + ' 元'
        + (capV != null ? '，' + (fee >= capV ? '已到 ' + fmtN(capV) + ' 元上限。' : '未到 ' + fmtN(capV) + ' 元上限。') : '。'));
      kv.push(['逾期口径', '日万分之 ' + pen], ['延期合计', k.lateDaysTotal + ' 天'], ['预计违约金', fmtN(fee) + ' 元']);
    }
    if (!mAmt && !mDue && !mPen) {
      lines.push('没读到金额、交付期限或逾期口径，排程这边不动数。');
      return { text: lines.join('\n'), blocks: [tagsb((doc.paragraphs || []).slice(0, 3).map(function (p) { return cut(p, 16); }))] };
    }
    lines.push('延期' + v.orders + ' ' + k.late + ' ' + v.counter + '：' + lateOrders().slice(0, 3).map(function (o) { return o.id + ' 晚 ' + o.lateDays + ' 天'; }).join('、') + '。');
    return { text: lines.join('\n'), blocks: [kvb(kv)],
      act: function () { if (M.step !== 'room') setStep('room'); M.filter = 'late'; draw(); refocus(lateOrders()[0] ? lateOrders()[0].id : '', 900); } };
  }
  function docSlides(doc) {
    var v = V(), k = M.S.kpi, txt = (doc.text || '').replace(/\s+/g, ' ');
    var titles = (doc.slides || []).map(function (s) { return s.title || ''; }).filter(Boolean);
    var mHit = txt.match(/(?:准时率|按期率|达成率)[^0-9]{0,6}(\d{1,3}(?:\.\d+)?)\s*%/);
    var lines = ['PPT《' + doc.name + '》读完：' + doc.slides.length + ' 页，第 1 页「' + (titles[0] || '—') + '」' + (titles[1] ? '、第 2 页「' + titles[1] + '」' : '') + '。'];
    if (!mHit) {
      lines.push('没读到按期率口径，排程这边不动数。');
      return { text: lines.join('\n'), blocks: [tagsb(titles.slice(0, 3))] };
    }
    var target = parseFloat(mHit[1]);
    var need = Math.ceil(k.open * target / 100);
    var gap = Math.max(0, need - (k.open - k.late));
    lines.push('文档目标按期率 ' + target + '%，当前 ' + k.onTimeRate + '%；' + k.open + ' ' + v.counter + '在手要按期 ' + need + ' ' + v.counter + '，现在 ' + (k.open - k.late) + ' ' + v.counter + '，差 ' + gap + ' ' + v.counter + '。');
    if (gap) lines.push('按延期天数排，先救 ' + lateOrders().slice(0, gap).map(function (o) { return o.id + '（晚 ' + o.lateDays + ' 天）'; }).join('、') + '。');
    return { text: lines.join('\n'), blocks: [kvb([['文档目标', target + '%'], ['当前按期率', k.onTimeRate + '%'], ['要补', gap + ' ' + v.counter]]), tagsb(titles.slice(0, 2))],
      act: function () { if (M.step !== 'room') setStep('room'); M.filter = 'late'; draw(); refocus(lateOrders()[0] ? lateOrders()[0].id : '', 900); } };
  }
  function docMail(doc) {
    var v = V(), ml = doc.mail || {}, txt = (doc.text || '').replace(/\s+/g, ' ');
    var mWan = txt.match(/([\d.]+)\s*万元/);
    var mDay = txt.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
    var kv = [['发件', cut(ml.from || '—', 16)], ['主题', cut(ml.subject || '—', 16)], ['日期', ml.date || '—']];
    var lines = ['邮件《' + (ml.subject || doc.name) + '》读完：发件 ' + (ml.from || '—') + '，' + (ml.date || '') + '。'];
    if (mWan) {
      var amt = Math.round(parseFloat(mWan[1]) * 10000);
      lines.push('正文提到 ' + mWan[1] + ' 万元付款' + (mDay ? '、' + mDay[1] + ' 月 ' + mDay[2] + ' 日前审批' : '') + '；本模块采购单草稿 ' + M.plan.summary.buy + ' 项预计 ' + fmtN(M.plan.summary.amount) + ' 元，占其中 ' + (amt ? Math.round(1000 * M.plan.summary.amount / amt) / 10 : 0) + '%。');
      kv.push(['邮件金额', fmtN(amt) + ' 元'], ['采购单草稿', fmtN(M.plan.summary.amount) + ' 元']);
      return { text: lines.join('\n'), blocks: [kvb(kv)], act: function () { if (M.step !== 'stock') setStep('stock'); else draw(); focusSel('.m10-po', 800); } };
    }
    lines.push('正文没有' + v.order + '、' + v.due + '或采购金额，排程这边不动数。');
    return { text: lines.join('\n'), blocks: [kvb(kv), tagsb((ml.attaches || []).slice(0, 3).map(function (a) { return cut(a, 14); }))] };
  }
  function onDoc(doc) {
    if (!doc || !doc.ok || !M.S) return null;
    var txt = (doc.text || '').replace(/\s+/g, ' ');
    if (doc.kind === 'excel') return docExcel(doc);
    if (doc.kind === 'ppt') return docSlides(doc);
    if (doc.kind === 'eml') return docMail(doc);
    if (doc.kind === 'word' || doc.kind === 'pdf' || doc.kind === 'text') return docWord(doc, txt);
    return null;
  }

  window.DGG.chatBrain('m10', {
    opener: function (step) { return TX(opener(step)); },
    suggest: function (step) { return suggest(step); },
    answer: function (q, step) { return answer(q, step); },
    onDoc: function (doc, step) { return onDoc(doc, step); }
  });

  window.DGG = window.DGG || {};
  window.DGG.registerModule('m10', { mount: mount, unmount: unmount, onCompany: onCompany, onIndustry: onIndustry });
})();
