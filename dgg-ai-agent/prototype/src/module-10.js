/* AI ERP · 订单交付指挥室（六屏）
 * 接入 → 指挥室 → 订单下钻 → 插单模拟 → 物料与库存 → 交付日报
 * 全部计算走 DGG.coreM10（与 skill 同一份内核）；第 3/4/5 屏的动作都写回同一份数据，指挥室随之刷新
 * 纯预制、断网可用；不用任何存储 API
 */
(function () {
  'use strict';
  var sh, $root, h, DATA, P, K;
  var ACCENT = { pa: '#E8862B', soft: '#FDF1E6', ink: '#9A4F0E' };
  var CAP_NAMES = ['订单交付预警', '智能排产与插单模拟', '库存与安全库存预警', '交付日报'];
  var CAP_DESC = { '订单交付预警': '交期倒推 · 延期归因 · 处置预演', '智能排产与插单模拟': '产线日历排程 · 加急单三方案对比', '库存与安全库存预警': '库存走势 · 缺口倒推 · 采购单草稿', '交付日报': '今日交付 · 风险 · 明日提醒 · 发送到微信' };
  var ARCHE = { make: { name: '制造型', desc: '生产订单 · 工序 · 产线 · 物料' }, flow: { name: '流通型', desc: '订单 · 履约环节 · 作业区 · 商品' }, project: { name: '项目型', desc: '项目 · 节点 · 班组 · 资源' }, service: { name: '服务型', desc: '服务单 · 环节 · 小组 · 资源' } };
  var PRIO = { 0: '插单', 1: '重点', 2: '普通', 3: '备货', 9: '排队' };
  var M = { step: 'connect', arche: null, data: null, S: null, plan: null, daily: null, focus: null, filter: null, charged: false, name: null, company: null, insert: { req: null, sim: null, pick: null }, who: 0, frame: null, pos: [] };

  /* ---------- 数据 ---------- */
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function sectorOf(slug) {
    var hit = null;
    (DATA.industries.sectors || []).forEach(function (s) { (s.industries || []).forEach(function (i) { if (i.slug === slug) hit = s.key; }); });
    return hit;
  }
  function archeOf(slug) { var sec = sectorOf(slug); return (sec && DATA.m10.archetypes.map[sec]) || 'make'; }
  function V() { return M.data.vocab; }
  function loadArche(a) {
    M.arche = a;
    var base = clone(DATA.m10.samples[a]);
    base.vocab = DATA.m10.archetypes.vocab[a];
    if (M.name) base.company = M.name;
    // 数据源接入方式跟企业画像走：填了对应系统就直连，否则表格导入
    if (M.company && M.company.systems) {
      var sys = M.company.systems;
      base.sources.forEach(function (s) {
        if (s.id === 'erp' || s.id === 'oms' || s.id === 'pm' || s.id === 'crm') s.mode = sys.indexOf('erp') >= 0 || sys.indexOf('crm') >= 0 ? 'direct' : 'import';
        if (s.id === 'mes') s.mode = sys.indexOf('mes') >= 0 ? 'direct' : 'import';
      });
    }
    M.data = base; M.focus = null; M.filter = null; M.insert = { req: null, sim: null, pick: null }; M.pos = [];
    recompute();
  }
  function recompute() {
    M.S = K.schedule(M.data);
    M.plan = K.purchasePlan(M.data, M.S);
    M.daily = K.daily(M.data, M.S, M.plan);
  }
  function commit(data, msg) { M.data = data; recompute(); draw(); if (msg && M.frame) P.toast(M.frame.body, msg); }
  function fmtN(n) { return P.fmtN(n); }
  function dayLabel(d) { return K.short(M.data, d); }

  /* ---------- 生命周期 ---------- */
  function mount(root, step, shell) {
    sh = shell; $root = root; h = sh.h; DATA = sh.DATA; P = window.DGG.pui; K = window.DGG.coreM10;
    P.init(sh);
    var c = sh.getCompany();
    if (!M.data) { M.company = c; M.name = c ? c.name : null; loadArche(c ? archeOf(c.industry) : archeOf(sh.displayIndustryDefault())); }
    M.step = step || 'connect';
    if (['connect', 'room', 'order', 'insert', 'stock', 'daily'].indexOf(M.step) < 0) M.step = 'connect';
    draw();
  }
  function unmount() { }
  function onCompany(c) {
    M.company = c; M.name = c ? c.name : null; M.charged = false;
    loadArche(c ? archeOf(c.industry) : archeOf(sh.displayIndustryDefault()));
    if (M.step !== 'connect') setStep('connect'); else draw();
  }
  function onIndustry(slug) {
    if (M.step !== 'connect' || !slug) return;
    var a = archeOf(slug); if (a !== M.arche) { loadArche(a); draw(); }
  }
  function setStep(s) { M.step = s; sh.go('m10', s); }

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
      tabs: tabs, active: M.step, onTab: function (key) { if (key === 'room' && !M.charged) enterRoom(); else setStep(key); } });
    M.frame = F; $root.appendChild(F.root);
    if (M.step === 'room' && !M.charged) { M.charged = true; sh.charge(K.CREDITS); }
    ({ connect: screenConnect, room: screenRoom, order: screenOrder, insert: screenInsert, stock: screenStock, daily: screenDaily })[M.step](F.work);
  }
  function enterRoom() { setStep('room'); }

  /* ---------- 屏 1：接入 ---------- */
  function screenConnect(work) {
    var v = V(), d = M.data;
    work.classList.add('m10-connect');
    var g = h('div', { class: 'pd-grid' });
    // 企业
    var nameIn = h('input', { type: 'text', value: d.company, placeholder: '企业名称', oninput: function (e) { M.name = e.target.value; d.company = e.target.value; var co = M.frame.root.querySelector('.pd-top .co span:nth-child(2)'); if (co) co.textContent = e.target.value; } });
    var arche = h('div', { class: 'arche' });
    Object.keys(ARCHE).forEach(function (a) {
      arche.appendChild(h('button', { class: a === M.arche ? 'on' : '', onclick: function () { if (a !== M.arche) { loadArche(a); draw(); } } }, [h('span', { class: 't' }, [ARCHE[a].name]), h('span', { class: 's' }, [ARCHE[a].desc])]));
    });
    g.appendChild(P.card({ cls: 'c4', title: '企业', body: [h('div', { class: 'pd-form' }, [
      h('div', { class: 'pd-field' }, [h('label', {}, ['企业名称']), nameIn]),
      h('div', { class: 'pd-field' }, [h('label', {}, ['行业']), h('div', { style: 'font-weight:600' }, [M.company ? sh.industryNameOf(M.company.industry) + (M.company.size ? ' · ' + sh.optText('size', M.company.size) : '') : sh.industryNameOf(sh.displayIndustryDefault())])]),
      h('div', { class: 'pd-field' }, [h('label', {}, ['业态原型']), arche, h('div', { class: 'hint' }, ['按行业大类匹配，可切换'])])
    ])] }));
    // 已开通能力
    var caps = h('div');
    CAP_NAMES.forEach(function (n, i) {
      caps.appendChild(h('div', { class: 'cap-row' }, [h('span', { class: 'ic' }, ['0' + (i + 1)]), h('div', {}, [h('div', { class: 't' }, [n]), h('div', { class: 's' }, [CAP_DESC[n]])]), P.chip('ok', '已开通')]));
    });
    var sec = M.company ? sectorOf(M.company.industry) : sectorOf(sh.displayIndustryDefault());
    var m2sc = sec && DATA.m2.sectors[sec] ? DATA.m2.sectors[sec].scenes.filter(function (s) { return s.module === 'AI ERP'; }) : [];
    g.appendChild(P.card({ cls: 'c4', title: '已开通能力', sub: '4 项', body: [caps], foot: m2sc.length ? ['场景库对应：' + m2sc.map(function (s) { return s.name; }).join('、')] : null }));
    // 数据源
    var srcs = h('div');
    d.sources.forEach(function (s) {
      srcs.appendChild(h('div', { class: 'src-row' }, [h('div', {}, [h('div', { class: 't' }, [s.name]), h('div', { class: 's' }, ['同步 ' + s.lastSync + ' · ' + s.rows + ' 条'])]), P.chip(s.mode === 'direct' ? 'ok' : 'watch', s.mode === 'direct' ? '系统直连' : '表格导入'), h('span', { class: 'pd-dot ' + (s.mode === 'direct' ? 'ok' : 'risk') })]));
    });
    g.appendChild(P.card({ cls: 'c4', title: '数据源', sub: d.sources.length + ' 个', body: [srcs], foot: ['排程窗口 ' + d.horizon + ' 天 · 今日 ' + d.today.replace(/-/g, '.') + ' · ' + (d.workday.restWeekdays || []).length + ' 天/周休息'] }));
    // 进入
    g.appendChild(h('div', { class: 'c12 go' }, [
      h('div', {}, [h('div', { class: 't' }, [v.room]), h('div', { class: 's' }, [v.orders + ' ' + M.S.kpi.open + ' ' + v.counter + ' · ' + v.lines.replace('负荷', '') + ' ' + d.lines.length + ' 条 · ' + v.materials.replace('与库存', '').replace('与人天', '').replace('与排期', '') + ' ' + d.materials.length + ' 种'])]),
      h('div', { class: 'sp' }),
      h('div', { class: 'cr' }, [h('b', { class: 'num' }, [String(K.CREDITS)]), ' 积分 / 次']),
      P.btn('进入' + v.room, { cls: 'primary big', onClick: enterRoom })
    ]));
    work.appendChild(g);
  }

  /* ---------- 屏 2：指挥室 ---------- */
  function statusChip(o) { return P.chip(o.status, o.status === 'late' ? '延期 ' + o.lateDays + ' 天' : P.STATUS[o.status]); }
  function causeText(o) { if (o.status === 'done') return '已完工'; if (o.status === 'late') return K.CAUSES[o.cause].label; if (o.status === 'risk') return { tight: '余量不足', unordered: '物料未下单', waiting: '等料' }[o.riskReason] || '风险'; return '按期'; }
  function orderCols() {
    var v = V();
    return [
      { key: 'id', label: '单号', sort: true, render: function (r) { return h('span', {}, [h('b', { class: 'id' }, [r.id]), h('span', { class: 'sub' }, [PRIO[r.priority] || ''])]); } },
      { key: 'customer', label: v.customer, sort: true },
      { key: 'productName', label: v.product, sort: true, render: function (r) { return h('span', {}, [r.productName, h('span', { class: 'sub' }, [fmtN(r.qty) + ' ' + v.qtyUnit])]); } },
      { key: 'dueDay', label: v.due, sort: true, align: 'c', render: function (r) { return r.dueLabel; } },
      { key: 'finishDay', label: v.finish, sort: true, align: 'c', render: function (r) { return h('span', { class: r.lateDays > 0 ? 'neg' : '' }, [r.finishLabel]); } },
      { key: 'status', label: '状态', sort: function (r) { return { late: 0, risk: 1, ok: 2, handled: 3, done: 4 }[r.status]; }, render: statusChip },
      { key: 'cause', label: '判断', render: causeText },
      { key: 'kitRate', label: '齐套率', sort: true, render: function (r) { return P.bar(r.kitRate * 100, r.kitRate >= 1 ? 'ok' : r.kitRate >= 0.5 ? 'risk' : 'late'); } },
      { key: 'currentOp', label: '当前' + v.op, render: function (r) { return r.currentOp ? h('span', {}, [r.currentOp, h('span', { class: 'sub' }, [r.currentLine])]) : '—'; } }
    ];
  }
  function openOrder(id) { M.focus = id; setStep('order'); }
  function screenRoom(work) {
    var v = V(), S = M.S, k = S.kpi, plan = M.plan;
    var g = h('div', { class: 'pd-grid' });
    var filt = function (f) { return function () { M.filter = M.filter === f ? null : f; draw(); }; };
    g.appendChild(h('div', { class: 'c12' }, [P.kpis([
      { label: v.orders, value: k.open, unit: v.counter, sub: '已完工待发运 ' + k.done, onClick: filt(null), active: M.filter == null },
      { label: '按期率', value: k.onTimeRate, unit: '%', tone: k.onTimeRate >= 90 ? 'ok' : k.onTimeRate >= 70 ? 'risk' : 'late', sub: '按期 ' + (k.open - k.late) + ' ' + v.counter },
      { label: '延期', value: k.late, unit: v.counter, tone: 'late', sub: '合计晚 ' + k.lateDaysTotal + ' 天', onClick: filt('late'), active: M.filter === 'late' },
      { label: '风险', value: k.risk, unit: v.counter, tone: 'risk', sub: '余量不足 / 等料 / 未下单', onClick: filt('risk'), active: M.filter === 'risk' },
      { label: '今日处置', value: M.data.log.length, unit: '项', tone: 'accent', sub: k.handled ? '已处置' + v.order + ' ' + k.handled + ' ' + v.counter : '尚无处置记录', onClick: filt('handled'), active: M.filter === 'handled' },
      { label: v.material + '缺口', value: plan.summary.short, unit: '项', tone: plan.summary.short ? 'late' : 'ok', sub: '低于安全库存 ' + plan.summary.safety + ' 项', onClick: function () { setStep('stock'); } },
      { label: '7 日' + v.lines, value: k.load7, unit: '%', tone: k.overLines ? 'risk' : 'accent', sub: k.overLines ? k.overLines + ' 条满负荷' : '无满负荷' },
      { label: '今日交付', value: k.dueToday, unit: v.counter, sub: M.daily.deliveries.filter(function (x) { return !x.ok; }).length ? M.daily.deliveries.filter(function (x) { return !x.ok; }).length + ' ' + v.counter + '交不出' : '全部可交' }
    ])]));
    // 订单全景
    var rows = S.orders.filter(function (o) { return !M.filter || o.status === M.filter; });
    var tbl = P.table({ cols: orderCols(), rows: rows, sortKey: 'dueDay', onRow: function (r) { openOrder(r.id); }, rowKey: function (r) { return r.id; } });
    g.appendChild(P.card({ cls: 'c8', title: v.orders + '全景', sub: rows.length + ' ' + v.counter + (M.filter ? ' · 已筛选' : '') + ' · 点击' + v.order + '下钻', tight: true, body: [h('div', { class: 'pd-scroll', style: 'max-height:520px' }, [tbl])],
      extra: [P.btn(v.insert, { cls: 'sm', onClick: function () { setStep('insert'); } }), P.btn(v.daily, { cls: 'sm', onClick: function () { setStep('daily'); } })] }));
    // 预警榜 + 处置
    var alerts = S.orders.filter(function (o) { return o.status === 'late' || o.status === 'risk'; }).sort(function (a, b) { return (a.status === 'late' ? 0 : 1) - (b.status === 'late' ? 0 : 1) || a.dueDay - b.dueDay; });
    var list = h('div', { class: 'pd-list' });
    alerts.slice(0, 7).forEach(function (o) {
      list.appendChild(P.item({ tone: o.status, icon: o.status === 'late' ? '晚' + o.lateDays : '险', title: o.id + ' · ' + o.customer, sub: causeText(o) + ' · ' + (o.currentOp ? '当前' + o.currentOp : '') + (o.handled ? ' · 已处置' : ''), right: o.dueLabel, rightSub: v.finish + ' ' + o.finishLabel, onClick: function () { openOrder(o.id); } }));
    });
    if (!alerts.length) list.appendChild(P.empty('没有延期或风险' + v.order));
    var right = h('div', { class: 'c4', style: 'display:flex;flex-direction:column;gap:16px' });
    right.appendChild(P.card({ title: '交付预警榜', sub: alerts.length + ' ' + v.counter, body: [list] }));
    if (M.data.log.length) right.appendChild(P.card({ title: '今日处置', sub: M.data.log.length + ' 条', body: [logList(M.data.log.slice(-5).reverse())] }));
    g.appendChild(right);
    // 物料缺口
    var short = plan.items.filter(function (x) { return x.urgency === 'short' || x.urgency === 'safety'; }).slice(0, 6);
    var mtbl = P.table({ compact: true, cols: [
      { key: 'name', label: v.material, render: function (r) { return h('span', {}, [h('b', {}, [r.name]), h('span', { class: 'sub' }, [r.supplier])]); } },
      { key: 'urgency', label: '状态', render: function (r) { return P.chip(r.urgency === 'short' ? 'late' : 'risk', r.urgency === 'short' ? '缺口 ' + r.shortLabel : '安全库存 ' + r.safetyLabel); } },
      { key: 'stock', label: '库存 / 在途', align: 'r', render: function (r) { return fmtN(r.stock) + ' / ' + fmtN(r.onOrder) + ' ' + r.unit; } },
      { key: 'suggestQty', label: '建议', align: 'r', render: function (r) { return fmtN(r.suggestQty) + ' ' + r.unit; } },
      { key: 'latestOrderLabel', label: '最晚下单', align: 'c', render: function (r) { return h('span', { class: r.overdue ? 'neg' : '' }, [r.latestOrderLabel || '—']); } }
    ], rows: short, onRow: function () { setStep('stock'); }, empty: '库存与在途可覆盖排程内需求' });
    g.appendChild(P.card({ cls: 'c7', title: v.material + '缺口', sub: '按排程倒推 · ' + plan.summary.buy + ' 项待下单', tight: true, body: [mtbl], extra: [P.btn('查看' + v.purchase, { cls: 'sm', onClick: function () { setStep('stock'); } })] }));
    // 产线负荷
    var days7 = S.days.slice(0, 7);
    var heat = P.heat({ days: days7, wd: true, rows: S.lines.map(function (L) { return { label: L.name, cells: L.days.slice(0, 7).map(function (c) { return { pct: c.pct, rest: c.rest, ot: c.ot > 0, title: L.name + ' ' + c.label + ' ' + c.used + '/' + c.cap + ' h' }; }) }; }) });
    var over = S.lines.filter(function (L) { return L.status !== 'ok'; });
    g.appendChild(P.card({ cls: 'c5', title: v.lines, sub: '未来 7 天 · 负荷 %', body: [heat, h('div', { class: 'pd-legend', style: 'margin-top:10px' }, [h('span', {}, [h('i', { style: 'background:#9DBAF0' }), '< 50']), h('span', {}, [h('i', { style: 'background:#4974F6' }), '50–85']), h('span', {}, [h('i', { style: 'background:#E8A33D' }), '85–100']), h('span', {}, [h('i', { style: 'background:#D9483B' }), '满负荷']), h('span', {}, [h('i', { style: 'box-shadow:inset 0 0 0 2px #7C3AED;background:#fff' }), '含加班'])])],
      foot: [over.length ? '瓶颈：' + over.map(function (L) { return L.name + ' ' + L.load7 + '%'; }).join(' · ') : '未来 7 天没有满负荷' + v.line] }));
    work.appendChild(g);
  }
  function logList(log) {
    var el = h('div', { class: 'm10-log' });
    log.forEach(function (l) { el.appendChild(h('div', { class: 'l' }, [h('span', { class: 'n' }, [String(l.seq)]), h('b', {}, [l.label + (l.orderId ? ' ' + l.orderId : '')]), h('span', {}, [l.detail + (l.cost ? ' · ' + fmtN(l.cost) + ' 元' : '')])])); });
    return el;
  }

  /* ---------- 屏 3：订单下钻 ---------- */
  function screenOrder(work) {
    var v = V(), S = M.S;
    if (!M.focus || !S.byId[M.focus]) { var first = S.orders.filter(function (o) { return o.status === 'late'; })[0] || S.orders.filter(function (o) { return o.status === 'risk'; })[0] || S.orders[0]; M.focus = first.id; }
    var o = S.byId[M.focus];
    var alerts = S.orders.filter(function (x) { return x.status === 'late' || x.status === 'risk'; });
    var idx = alerts.map(function (x) { return x.id; }).indexOf(o.id);
    var g = h('div', { class: 'pd-grid' });
    // 头部
    var facts = [
      { k: v.due, v: o.dueLabel + (o.originalDue ? '（原 ' + dayLabel(K.dayIdx(M.data, o.originalDue)) + '）' : '') },
      { k: v.finish, v: o.finishLabel, tone: o.lateDays > 0 ? 'late' : o.status === 'risk' ? 'risk' : 'ok' },
      { k: '交期余量', v: o.slack == null ? '—' : (o.slack >= 0 ? '+' : '') + o.slack + ' 天', tone: o.slack < 0 ? 'late' : o.slack < 1 ? 'risk' : 'ok' },
      { k: '齐套率', v: Math.round(o.kitRate * 100) + '%', tone: o.kitRate >= 1 ? 'ok' : 'risk' },
      { k: v.progress, v: o.opsDone + ' / ' + o.opsTotal + ' 道 · ' + o.progressPct + '%' },
      { k: '剩余工时', v: o.remainHours + ' h' }
    ];
    g.appendChild(P.card({ cls: 'c12', accent: true, body: [h('div', { class: 'm10-head' }, [
      h('div', {}, [
        h('div', { class: 'id' }, [o.id, statusChip(o), P.chip('accent', PRIO[o.priority] || '', true), o.handled ? P.chip('handled', '已处置 ' + o.actions.length + ' 项') : null]),
        h('div', { class: 'sub' }, [o.customer + ' · ' + o.productName + ' × ' + fmtN(o.qty) + ' ' + v.qtyUnit + ' · 接单 ' + o.received.slice(5).replace('-', '-')]),
        h('div', { class: 'facts' }, facts.map(function (f) { return h('div', { class: 'f' }, [h('div', { class: 'k' }, [f.k]), h('div', { class: 'v num ' + (f.tone || '') }, [f.v])]); }))
      ]),
      h('div', { class: 'btns' }, [
        P.btn('← ' + v.room, { onClick: function () { setStep('room'); } }),
        alerts.length > 1 ? P.btn('下一' + v.counter + '预警 →', { onClick: function () { M.focus = alerts[(idx + 1) % alerts.length].id; draw(); } }) : null,
        P.btn(v.insert, { onClick: function () { setStep('insert'); } })
      ])
    ])] }));
    // 甘特
    var days = S.days;
    var rows = o.ops.map(function(op) {
      var bars = [];
      if (op.done) return { label: op.op + (op.part ? ' · ' + op.part : ''), sub: op.lineName, note: '已完成', bars: [] };
      if (op.waitMaterial > 0 && op.naturalF != null) bars.push({ s: op.naturalF, e: op.matReady, tone: 'waitmat', label: '等料 ' + op.waitMaterial + ' 天', title: '物料齐备 ' + dayLabel(op.matReady) });
      if (op.waitCapacity > 0 && op.earliestF != null && op.startF != null) bars.push({ s: op.earliestF, e: op.startF, tone: 'waitcap', label: '排队 ' + op.waitCapacity + ' 天', title: '前面 ' + op.queueAhead + ' 段活' });
      if (op.startF != null) bars.push({ s: op.startF, e: op.endF, tone: op.inProgress ? 'prog' : (op.endDay > o.dueDay ? 'late' : op.rerouted ? 'hand' : 'plan'), label: (op.inProgress ? '在制 ' + Math.round(op.prog * 100) + '% · ' : '') + op.remain + ' h', title: op.startLabel + ' → ' + op.endLabel });
      return { label: op.op + (op.part ? ' · ' + op.part : ''), sub: op.lineName + (op.rerouted ? '（已调线）' : ''), bars: bars, note: op.startF == null ? '超出排程窗口' : null };
    });
    var gantt = P.gantt({ days: days, rows: rows, todayIdx: 0, marks: [{ d: o.dueDay, label: v.due + ' ' + o.dueLabel }] });
    var opsTbl = P.table({ compact: true, cols: [
      { key: 'op', label: v.op, render: function (r) { return h('b', {}, [r.op + (r.part ? ' · ' + r.part : '')]); } },
      { key: 'lineName', label: v.line, render: function (r) { return r.lineName + (r.rerouted ? ' · 已调线' : ''); } },
      { key: 'st', label: '状态', render: function (r) { return r.done ? P.chip('done', '已完成') : r.inProgress ? P.chip('accent', '在制 ' + Math.round(r.prog * 100) + '%') : P.chip('watch', '待开工'); } },
      { key: 'startLabel', label: '开工', align: 'c', render: function (r) { return r.done ? '—' : r.startLabel || '—'; } },
      { key: 'endLabel', label: '完工', align: 'c', render: function (r) { return r.done ? '—' : h('span', { class: r.endDay != null && r.endDay > o.dueDay ? 'neg' : '' }, [r.endLabel || '—']); } },
      { key: 'remain', label: '剩余工时', align: 'r', render: function (r) { return r.done ? '—' : r.remain + ' h'; } },
      { key: 'waitMaterial', label: '等料', align: 'r', render: function (r) { return r.waitMaterial > 0 ? h('span', { class: 'neg' }, [r.waitMaterial + ' 天']) : '—'; } },
      { key: 'waitCapacity', label: '排队', align: 'r', render: function (r) { return r.waitCapacity > 0 ? h('span', { class: 'neg' }, [r.waitCapacity + ' 天（前 ' + r.queueAhead + ' 段）']) : '—'; } }
    ], rows: o.ops });
    g.appendChild(P.card({ cls: 'c8', title: v.ops + '甘特', sub: '窗口 ' + days.length + ' 天 · 休息日灰底', body: [gantt, h('div', { class: 'pd-legend', style: 'margin:8px 0 12px' }, [h('span', {}, [h('i', { style: 'background:#E8862B' }), '计划']), h('span', {}, [h('i', { style: 'background:#9A4F0E' }), '在制']), h('span', {}, [h('i', { style: 'background:#D9483B' }), '超过' + v.due]), h('span', {}, [h('i', { style: 'background:#4974F6' }), '已调线']), h('span', {}, [h('i', { style: 'background:#FDF3E1;border:1px dashed #E8A33D' }), '等料']), h('span', {}, [h('i', { style: 'background:#EEF1F6;border:1px dashed #98A2B8' }), '排队'])]), h('div', { class: 'm10-ops' }, [opsTbl])] }));
    // AI 判断 + 处置
    var ex = K.explain(S, o.id);
    var acts = o.status === 'done' ? [] : K.actions(M.data, S, o.id);
    var actsEl = h('div', { class: 'pd-actions' });
    (o.actions || []).forEach(function (a) { actsEl.appendChild(h('div', { class: 'pd-action' }, [h('div', { class: 't' }, [h('span', { class: 'rank' }, ['✓']), a.label]), h('span', { class: 'done' }, ['已执行']), h('div', { class: 'd' }, [a.detail])])); });
    acts.forEach(function (a) {
      actsEl.appendChild(P.action({ rank: a.rank, label: a.label, target: a.targetName, desc: a.desc, costNote: a.costNote, cost: a.cost, effect: a.effect, best: a.rank === 1 && a.advised,
        onRun: function () { var p = clone(a.params); p.cost = a.cost; commit(K.applyAction(M.data, o.id, a.key, p), '已' + a.label + '：' + a.desc + ' · ' + v.room + '已更新'); } }));
    });
    if (!acts.length && !(o.actions || []).length) actsEl.appendChild(P.empty(o.status === 'done' ? '等待发运' : '无需处置'));
    var tone = o.status === 'late' ? 'late' : o.status === 'risk' ? 'risk' : o.status === 'done' ? 'done' : 'ok';
    var right = h('div', { class: 'c4', style: 'display:flex;flex-direction:column;gap:16px' });
    right.appendChild(P.card({ title: 'AI 判断', sub: ex.label, body: [P.judge({ verdict: { tone: tone, chip: ex.label, text: o.status === 'late' ? v.finish + ' ' + o.finishLabel + '，晚 ' + o.lateDays + ' 天' : o.status === 'risk' ? causeText(o) + '，' + v.finish + ' ' + o.finishLabel : v.finish + ' ' + o.finishLabel }, seen: ex.seen, reasons: ex.reasons, actionsEl: actsEl, actionsTitle: '建议动作 · 每项都已在副本上重排预演' })] }));
    // 齐套
    var mats = [];
    o.ops.forEach(function (op) { (op.mat || []).forEach(function (m) { mats.push({ op: op.op, m: m }); }); });
    var matEl = h('div', { class: 'm10-mat' });
    mats.forEach(function (x) {
      var m = x.m;
      matEl.appendChild(h('div', { class: 'row' }, [h('span', { class: 't' }, [m.name]), m.ready === 0 ? P.chip('ok', '齐备') : m.assumed ? P.chip('late', '缺 ' + fmtN(m.short) + ' ' + m.unit) : P.chip('risk', '在途 ' + m.readyLabel),
        h('span', { class: 's' }, ['「' + x.op + '」需 ' + fmtN(m.need) + ' ' + m.unit + ' · 库存分配 ' + fmtN(m.fromStock) + (m.fromPO.length ? ' · ' + m.fromPO.map(function (p) { return p.po + ' ' + dayLabel(p.eta) + ' 到 ' + fmtN(p.qty); }).join('、') : '') + (m.assumed ? ' · 按今日下单推算 ' + m.readyLabel + ' 齐备' : '')])]));
    });
    if (!mats.length) matEl.appendChild(P.empty('无待领' + v.material));
    right.appendChild(P.card({ title: '齐套', sub: Math.round(o.kitRate * 100) + '%', body: [matEl] }));
    g.appendChild(right);
    work.appendChild(g);
  }

  /* ---------- 屏 4：插单模拟 ---------- */
  function screenInsert(work) {
    var v = V(), S = M.S, d = M.data;
    work.classList.add('m10-insert');
    if (!M.insert.req) M.insert.req = clone(d.insertPresets[0]);
    var req = M.insert.req;
    var g = h('div', { class: 'pd-grid' });
    // 表单
    var prodSel = h('select', { onchange: function (e) { req.product = e.target.value; M.insert.sim = null; } });
    d.products.forEach(function (p) { prodSel.appendChild(h('option', { value: p.id, selected: p.id === req.product }, [p.name])); });
    var dueSel = h('select', { onchange: function (e) { req.due = e.target.value; M.insert.sim = null; } });
    for (var i = 1; i <= 20; i++) { var ds = K.dateOf(d, i); dueSel.appendChild(h('option', { value: ds, selected: ds === req.due }, [K.short(d, i) + ' 周' + ['日', '一', '二', '三', '四', '五', '六'][K.weekday(d, i)] + (K.isRest(d, i) ? '（休）' : '')])); }
    var custIn = h('input', { type: 'text', value: req.customer, oninput: function (e) { req.customer = e.target.value; M.insert.sim = null; } });
    var qtyIn = h('input', { type: 'number', value: req.qty, min: '1', oninput: function (e) { req.qty = Math.max(1, +e.target.value || 0); M.insert.sim = null; } });
    var presets = h('div', { class: 'presets' });
    d.insertPresets.forEach(function (p) {
      var pn = d.products.filter(function (x) { return x.id === p.product; })[0];
      presets.appendChild(h('button', { onclick: function () { M.insert.req = clone(p); M.insert.sim = null; M.insert.pick = null; draw(); } }, [p.customer + ' · ' + (pn ? pn.name : p.product) + ' × ' + fmtN(p.qty) + ' · ' + v.due + ' ' + K.short(d, K.dayIdx(d, p.due)) + (p.note ? ' · ' + p.note : '')]));
    });
    var runBtn = P.btn('模拟三种方案', { cls: 'primary big', onClick: function () { M.insert.sim = K.simulateInsert(d, req); M.insert.pick = M.insert.sim.recommend; draw(); } });
    g.appendChild(P.card({ cls: 'c4', title: v.insertNoun, sub: '按三种策略各排一遍', body: [h('div', { class: 'pd-form' }, [
      h('div', { class: 'pd-field' }, [h('label', {}, [v.customer]), custIn]),
      h('div', { class: 'pd-field' }, [h('label', {}, [v.product]), prodSel]),
      h('div', { class: 'pd-field' }, [h('label', {}, [v.qty + '（' + v.qtyUnit + '）']), qtyIn]),
      h('div', { class: 'pd-field' }, [h('label', {}, [v.due]), dueSel]),
      h('div', { class: 'pd-field' }, [h('label', {}, ['常用']), presets]),
      runBtn
    ])], foot: ['三个方案：A ' + v.strategies.A + ' · B ' + v.strategies.B + ' · C ' + v.strategies.C] }));
    var right = h('div', { class: 'c8', style: 'display:flex;flex-direction:column;gap:16px' });
    var sim = M.insert.sim;
    if (!sim) {
      right.appendChild(P.card({ title: '方案对比', body: [P.empty('填好' + v.insertNoun + '后模拟')] }));
      right.appendChild(P.card({ title: '当前' + v.lines, sub: '未来 7 天', body: [P.heat({ days: S.days.slice(0, 7), wd: true, rows: S.lines.map(function (L) { return { label: L.name, cells: L.days.slice(0, 7).map(function (c) { return { pct: c.pct, rest: c.rest, ot: c.ot > 0 }; }) }; }) })] }));
    } else {
      var dueIdx = K.dayIdx(d, req.due);
      var opts = sim.options.map(function (op) {
        return { key: op.key, name: op.name, recommended: op.key === sim.recommend,
          headline: { big: op.finishLabel, tone: op.meetsDue ? 'ok' : 'late', sub: op.meetsDue ? '按期' : '晚 ' + op.lateDays + ' 天' },
          rows: [{ k: '拖累' + v.orders, v: op.affected + ' ' + v.counter, tone: op.affected ? 'bad' : 'good' }, { k: '转为延期', v: op.newlyLate + ' ' + v.counter, tone: op.newlyLate ? 'bad' : 'good' }, { k: '合计后移', v: op.delayDaysTotal + ' 天' }, { k: '加班费', v: op.cost ? fmtN(op.cost) + ' 元' : '0 元' }],
          notes: op.notes.length ? op.notes.join('；') : (op.key === 'A' ? '置顶排在所有在手' + v.order + '之前' : op.key === 'B' ? '排在所有在手' + v.order + '之后，不动现有排程' : '') };
      });
      right.appendChild(P.card({ title: '方案对比', sub: req.customer + ' · ' + fmtN(req.qty) + ' ' + v.qtyUnit + ' · ' + v.due + ' ' + K.short(d, dueIdx), body: [
        P.compare({ options: opts, active: M.insert.pick, onPick: function (k) { M.insert.pick = k; draw(); } }),
        h('div', { class: 'reason', style: 'margin-top:14px' }, [h('span', { class: 'tag' }, ['AI 推荐 ' + sim.recommend]), h('span', {}, [sim.reason])])
      ] }));
      var pick = sim.options.filter(function (x) { return x.key === M.insert.pick; })[0];
      var S1 = sim._S[pick.key];
      var newO = S1.byId[pick.orderId];
      var rows = newO.ops.map(function (op) { return { label: op.op + (op.part ? ' · ' + op.part : ''), sub: op.lineName, bars: [op.waitMaterial > 0 && op.naturalF != null ? { s: op.naturalF, e: op.matReady, tone: 'waitmat', label: '等料' } : null, op.waitCapacity > 0 && op.earliestF != null ? { s: op.earliestF, e: op.startF, tone: 'waitcap', label: '排队' } : null, op.startF != null ? { s: op.startF, e: op.endF, tone: op.part === 'B' ? 'partB' : (op.endDay > dueIdx ? 'late' : 'plan'), label: op.remain + ' h' } : null].filter(Boolean) }; });
      var affected = pick.rows.filter(function (r) { return r.delta !== 0; });
      var affTbl = P.table({ compact: true, cols: [
        { key: 'id', label: '单号', render: function (r) { return h('b', { class: 'id' }, [r.id]); } }, { key: 'customer', label: v.customer },
        { key: 'before', label: '处置前', align: 'c' }, { key: 'after', label: '处置后', align: 'c', render: function (r) { return h('span', { class: r.delta > 0 ? 'neg' : 'pos' }, [r.after]); } },
        { key: 'delta', label: '变化', align: 'r', sort: true, render: function (r) { return h('span', { class: r.delta > 0 ? 'neg' : 'pos' }, [(r.delta > 0 ? '+' : '') + r.delta + ' 天']); } },
        { key: 'st', label: '状态', render: function (r) { return r.turnsLate ? P.chip('late', '转为延期') : r.turnsOk ? P.chip('ok', '转为按期') : P.chip(r.statusAfter, P.STATUS[r.statusAfter]); } }
      ], rows: affected, sortKey: 'delta', sortDir: 'desc', empty: '不影响任何在手' + v.order });
      var loadRows = S.lines.map(function (L, i) { var L1 = S1.lines[i]; return { name: L.name, a: L.load7, b: L1.load7, ot: L1.overtimeHours }; });
      var loadTbl = P.table({ compact: true, cols: [{ key: 'name', label: v.line }, { key: 'a', label: '当前', align: 'r', render: function (r) { return r.a + '%'; } }, { key: 'b', label: '方案 ' + pick.key, align: 'r', render: function (r) { return h('span', { class: r.b > r.a ? 'neg' : '' }, [r.b + '%' + (r.ot ? ' · 加班 ' + r.ot + ' h' : '')]); } }], rows: loadRows });
      right.appendChild(P.card({ title: '方案 ' + pick.key + ' · ' + pick.name, sub: pick.orderId + ' 的' + v.ops + ' · 受影响' + v.orders + ' · ' + v.lines, body: [
        P.gantt({ days: S.days, rows: rows, todayIdx: 0, marks: [{ d: dueIdx, label: v.due + ' ' + K.short(d, dueIdx) }] }),
        h('div', { class: 'pd-grid', style: 'margin-top:14px' }, [h('div', { class: 'c7' }, [h('div', { style: 'font-weight:700;margin-bottom:6px' }, ['受影响' + v.orders + ' ' + affected.length + ' ' + v.counter]), affTbl]), h('div', { class: 'c5' }, [h('div', { style: 'font-weight:700;margin-bottom:6px' }, ['7 日' + v.lines]), loadTbl])])
      ], foot: [P.btn('按方案 ' + pick.key + ' 落单', { cls: 'primary', onClick: function () { var nd = K.applyInsert(d, req, pick.key); M.insert = { req: null, sim: null, pick: null }; M.focus = pick.orderId; commit(nd, '已落单 ' + pick.orderId + '（' + pick.name + '）· ' + v.room + '已重排'); setStep('room'); } }), h('span', {}, ['落单后所有在手' + v.order + '按新排程刷新'])] }));
    }
    g.appendChild(right);
    work.appendChild(g);
  }

  /* ---------- 屏 5：物料与库存 ---------- */
  function screenStock(work) {
    var v = V(), plan = M.plan, sm = plan.summary, d = M.data;
    var g = h('div', { class: 'pd-grid' });
    g.appendChild(h('div', { class: 'c12' }, [P.kpis([
      { label: '缺口', value: sm.short, unit: '项', tone: sm.short ? 'late' : 'ok', sub: '排程内库存与在途覆盖不了' },
      { label: '低于安全库存', value: sm.safety, unit: '项', tone: sm.safety ? 'risk' : 'ok', sub: '在途回补中 ' + sm.watch + ' 项' },
      { label: '建议下单', value: sm.buy, unit: '项', tone: 'accent', sub: '合计 ' + fmtN(sm.amount) + ' 元' },
      { label: '已错过最晚下单日', value: sm.overdue, unit: '项', tone: sm.overdue ? 'late' : 'ok', sub: '需与' + v.supplier + '协商加急' },
      { label: '呆滞', value: sm.slow, unit: '项', tone: sm.slow ? 'risk' : 'ok', sub: '占用 ' + fmtN(sm.slowCapital) + ' 元' },
      { label: v.materials.replace('与库存', '').replace('与人天', '').replace('与排期', '') + '总数', value: d.materials.length, unit: '种', sub: '在途 ' + d.materials.filter(function (m) { return m.onOrder.length; }).length + ' 种' }
    ])]));
    var urg = { short: 0, safety: 1, watch: 2, ok: 3 };
    var tbl = P.table({ cols: [
      { key: 'name', label: v.material, sort: true, render: function (r) { return h('span', {}, [h('b', {}, [r.name]), h('span', { class: 'sub' }, [r.spec + (r.supplier ? ' · ' + r.supplier : '')])]); } },
      { key: 'urgency', label: '状态', sort: function (r) { return urg[r.urgency]; }, render: function (r) { return P.chip(r.urgency === 'short' ? 'late' : r.urgency === 'safety' ? 'risk' : r.urgency === 'watch' ? 'watch' : 'ok', r.urgency === 'short' ? '缺口 ' + r.shortLabel : r.urgency === 'safety' ? '安全库存 ' + r.safetyLabel : r.urgency === 'watch' ? '在途回补' : '正常'); } },
      { key: 'stock', label: '库存', align: 'r', sort: true, render: function (r) { return h('span', { class: r.stock < r.safety ? 'neg' : '' }, [fmtN(r.stock) + ' ' + r.unit]); } },
      { key: 'safety', label: '安全库存', align: 'r', render: function (r) { return fmtN(r.safety); } },
      { key: 'onOrder', label: '在途', align: 'r', sort: true, render: function (r) { return r.onOrder ? fmtN(r.onOrder) : '—'; } },
      { key: 'demand', label: '排程需求', align: 'r', sort: true, render: function (r) { return r.demand ? fmtN(r.demand) : '—'; } },
      { key: 'suggestQty', label: '建议下单', align: 'r', sort: true, render: function (r) { return r.suggestQty ? h('b', {}, [fmtN(r.suggestQty) + ' ' + r.unit]) : '—'; } },
      { key: 'latestOrderDay', label: '最晚下单', align: 'c', sort: true, render: function (r) { return r.suggestQty ? h('span', { class: r.overdue ? 'neg' : '' }, [r.latestOrderLabel + (r.overdue ? ' · 已晚' : '')]) : '—'; } },
      { key: 'amount', label: '金额', align: 'r', sort: true, render: function (r) { return r.amount ? fmtN(r.amount) + ' 元' : '—'; } }
    ], rows: plan.items, sortKey: 'urgency', onRow: function (r) { openMaterial(r); } });
    g.appendChild(P.card({ cls: 'c8', title: v.materials, sub: plan.items.length + ' 种 · 按紧急度排序 · 点击看库存走势', tight: true, body: [h('div', { class: 'pd-scroll', style: 'max-height:560px' }, [tbl])] }));
    var right = h('div', { class: 'c4', style: 'display:flex;flex-direction:column;gap:16px' });
    // 采购单草稿
    var po = h('div', { class: 'm10-po', style: 'display:grid;gap:10px' });
    plan.po.forEach(function (p) {
      var sup = h('div', { class: 'sup' }, [h('div', { class: 't' }, [h('span', {}, [p.supplier || v.supplier]), h('span', { class: 'num' }, [fmtN(p.amount) + ' 元'])])]);
      p.lines.forEach(function (l) { sup.appendChild(h('div', { class: 'ln' }, [h('span', {}, [l.name]), h('span', { class: 'num' }, [h('b', {}, [fmtN(l.suggestQty) + ' ' + l.unit]), ' · ' + l.leadDays + ' 天到'])])); });
      po.appendChild(sup);
    });
    if (!plan.po.length) po.appendChild(P.empty('当前没有需要下单的' + v.material));
    right.appendChild(P.card({ title: '采购单草稿', sub: plan.po.length + ' 张 · ' + fmtN(sm.amount) + ' 元', body: [po], foot: plan.po.length ? [P.btn('生成 ' + plan.po.length + ' 张采购单', { cls: 'primary', onClick: function () { var r = K.applyPurchase(d, plan); M.pos = M.pos.concat(r.pos); commit(r.data, '已生成 ' + r.pos.length + ' 张采购单 · 在途已更新，' + v.room + '已重排'); } }), h('span', {}, ['生成后计入在途，' + v.orders + '按到货日重排'])] : null }));
    if (M.pos.length) right.appendChild(P.card({ title: '今日已生成', sub: M.pos.length + ' 张', body: [h('div', { class: 'pd-list' }, M.pos.map(function (p) { return P.item({ tone: 'hand', icon: 'PO', title: p.po + ' · ' + p.supplier, sub: p.lines.map(function (l) { return l.name + ' ' + fmtN(l.qty) + ' ' + l.unit; }).join('、'), right: fmtN(p.amount) + ' 元', rightSub: '到货 ' + dayLabel(K.dayIdx(d, p.lines[0].eta)) }); }))] }));
    // 呆滞
    var slow = h('div', { class: 'pd-list' });
    plan.slow.forEach(function (x) { slow.appendChild(P.item({ tone: 'risk', icon: x.daysCover > 999 ? '999+' : String(x.daysCover), title: x.name, sub: '库存 ' + fmtN(x.stock) + ' ' + x.unit + ' · 排程内无需求', right: fmtN(x.capital) + ' 元', rightSub: '占用资金' })); });
    if (!plan.slow.length) slow.appendChild(P.empty('无呆滞'));
    right.appendChild(P.card({ title: '呆滞', sub: '可用天数 > 90 · ' + fmtN(sm.slowCapital) + ' 元', body: [slow] }));
    g.appendChild(right);
    work.appendChild(g);
  }
  function openMaterial(r) {
    var v = V(), d = M.data;
    var body = [
      P.spark({ curve: r.curve, safety: r.safety, days: M.S.days }),
      P.kv([['库存', fmtN(r.stock) + ' ' + r.unit], ['安全库存', fmtN(r.safety) + ' ' + r.unit], ['在途', r.arrivals.length ? r.arrivals.map(function (a) { return a.po + ' ' + a.label + ' 到 ' + fmtN(a.qty) + (a.expedited ? '（已催）' : ''); }).join('；') : '无'], ['排程需求', fmtN(r.demand) + ' ' + r.unit], ['提前期', r.leadDays + ' 天'], ['起订量', fmtN(r.moq) + ' ' + r.unit], [v.supplier, r.supplier || '—'], ['单价', r.unitCost ? r.unitCost + ' 元' : '—'], ['可用天数', r.daysCover != null ? r.daysCover + ' 天' : '—']]),
      h('div', {}, [h('div', { style: 'font-weight:700;margin-bottom:6px' }, ['判断']), h('div', { style: 'line-height:1.6' }, [r.reason])]),
      r.drivers.length ? h('div', {}, [h('div', { style: 'font-weight:700;margin-bottom:6px' }, ['需求来源']), h('ul', { style: 'margin:0;padding-left:18px;display:grid;gap:4px' }, r.drivers.map(function (t) { return h('li', {}, [t]); }))]) : null
    ];
    var acts = [P.btn('关闭', { onClick: function () { dr.close(); } })];
    if (r.suggestQty > 0) acts.unshift(P.btn('只下这一项：' + fmtN(r.suggestQty) + ' ' + r.unit, { cls: 'primary', onClick: function () { var res = K.applyPurchase(d, M.plan, [r.id]); M.pos = M.pos.concat(res.pos); dr.close(); commit(res.data, '已生成采购单 ' + res.pos[0].po + ' · ' + r.name + ' ' + fmtN(r.suggestQty) + ' ' + r.unit); } }));
    var dr = P.drawer(M.frame.body, { title: r.name, sub: r.spec + ' · ' + (r.urgency === 'short' ? '缺口 ' + r.shortLabel : r.urgency === 'safety' ? r.safetyLabel + ' 起低于安全库存' : r.urgency === 'watch' ? '在途回补' : '正常'), body: body, actions: acts });
  }

  /* ---------- 屏 6：交付日报 ---------- */
  function screenDaily(work) {
    var v = V(), D = M.daily, S = M.S, k = D.kpi;
    work.classList.add('m10-daily');
    var g = h('div', { class: 'pd-grid' });
    var doc = h('div', { class: 'pd-doc c8' });
    doc.appendChild(h('div', { class: 'title' }, [v.daily, h('span', { class: 'd' }, [D.date.replace(/-/g, '.') + ' 周' + D.weekday + ' · ' + M.data.company])]));
    doc.appendChild(h('div', { class: 'kp' }, [
      h('div', { class: 'b' }, [h('div', { class: 'k' }, [v.orders]), h('div', { class: 'v num' }, [k.open + ' ' + v.counter])]),
      h('div', { class: 'b' }, [h('div', { class: 'k' }, ['按期率']), h('div', { class: 'v num ' + (k.onTimeRate >= 90 ? 'ok' : k.onTimeRate >= 70 ? 'risk' : 'late') }, [k.onTimeRate + '%'])]),
      h('div', { class: 'b' }, [h('div', { class: 'k' }, ['延期 / 风险']), h('div', { class: 'v num late' }, [k.late + ' / ' + k.risk])]),
      h('div', { class: 'b' }, [h('div', { class: 'k' }, ['今日处置']), h('div', { class: 'v num' }, [M.data.log.length + ' 项'])])
    ]));
    var sec = function (title, body) { return h('div', { class: 'sec' }, [h('h4', {}, [title]), body]); };
    doc.appendChild(sec('今日交付', D.deliveries.length ? P.table({ compact: true, cols: [{ key: 'id', label: '单号', render: function (r) { return h('b', { class: 'id' }, [r.id]); } }, { key: 'customer', label: v.customer }, { key: 'productName', label: v.product, render: function (r) { return r.productName + ' × ' + fmtN(r.qty); } }, { key: 'st', label: '状态', render: function (r) { return r.ok ? P.chip('done', r.status === 'done' ? '已完工待发运' : '可交付') : P.chip('late', '延至 ' + r.finishLabel); } }], rows: D.deliveries }) : P.empty('今日无到期' + v.order)));
    doc.appendChild(sec('风险' + v.order, D.risks.length ? P.table({ compact: true, cols: [{ key: 'id', label: '单号', render: function (r) { return h('b', { class: 'id' }, [r.id]); } }, { key: 'customer', label: v.customer }, { key: 'dueLabel', label: v.due, align: 'c' }, { key: 'finishLabel', label: v.finish, align: 'c', render: function (r) { return h('span', { class: r.lateDays > 0 ? 'neg' : '' }, [r.finishLabel]); } }, { key: 'causeLabel', label: '判断', render: function (r) { return r.status === 'late' ? r.causeLabel + ' · 晚 ' + r.lateDays + ' 天' : '风险'; } }, { key: 'h', label: '处置', render: function (r) { return r.handled ? P.chip('handled', r.actions.map(function (a) { return a.label; }).join('、')) : P.chip('watch', '待处置'); } }], rows: D.risks }) : P.empty('无风险' + v.order)));
    doc.appendChild(sec('今日处置', M.data.log.length ? logList(M.data.log) : P.empty('今日尚无处置记录')));
    doc.appendChild(sec('明日提醒', D.tomorrow.length ? h('ul', {}, D.tomorrow.map(function (t) { return h('li', {}, [t.text]); })) : P.empty('明日无到期、开工与到货事项')));
    doc.appendChild(sec(v.lines, h('div', { style: 'display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 20px' }, D.lines.map(function (L) { return h('div', { style: 'display:flex;justify-content:space-between;gap:10px;align-items:center' }, [h('span', {}, [L.name]), P.bar(L.load7, L.status === 'over' ? 'late' : L.status === 'tight' ? 'risk' : 'ok', L.load7 + '%' + (L.overtimeHours ? ' · 加班 ' + L.overtimeHours + ' h' : ''))]); }))));
    g.appendChild(doc);
    var right = h('div', { class: 'c4', style: 'display:flex;flex-direction:column;gap:16px' });
    var who = h('div', { class: 'who' });
    [v.handler, '车间主任', '总经理', '采购主管'].forEach(function (w, i) { who.appendChild(h('button', { class: i === M.who ? 'on' : '', onclick: function () { M.who = i; draw(); } }, [w])); });
    right.appendChild(P.card({ title: '发送', sub: '微信 · 文本版', body: [h('div', { class: 'pd-field' }, [h('label', {}, ['收件人']), who]), h('div', { class: 'pd-pre', style: 'margin-top:10px' }, [D.text])],
      foot: [P.btn('发送到微信', { cls: 'primary', onClick: function () { sh.setQrReady(true); sh.showWeChat(); } }), P.btn('回到' + v.room, { onClick: function () { setStep('room'); } })] }));
    g.appendChild(right);
    work.appendChild(g);
  }

  window.DGG = window.DGG || {};
  window.DGG.registerModule('m10', { mount: mount, unmount: unmount, onCompany: onCompany, onIndustry: onIndustry });
})();
