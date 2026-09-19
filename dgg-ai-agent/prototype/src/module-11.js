/* AI软件开发 · 一句需求变可点页面（六屏）
 * 接入（需求句解析 · 主数据关联）→ 生成应用（页面逐条点亮 · 手机同步渲染 · 推荐字段写回）→ 试用（三角色走单 · PC 看板联动）
 * → 测试与产物（用例逐行执行 · 权限矩阵 · 数据字典 / 接口 / 主数据关联）→ 发布（发布前检查 · 流水 · 屏内二维码）→ 迭代交付（追加需求 → 六种变更 → V1.1.0 · 交付清单 · 发微信）
 * 全部计算走 DGG.coreM11（与 skill 同一份内核）；每个动作都写回同一份数据副本；纯预制、断网可用；不用任何存储 API
 */
(function () {
  'use strict';
  var sh, $root, h, DATA, P, K, LIB;
  var ACCENT = window.DGG.PALETTE.m11;
  var STEPS = ['connect', 'build', 'try', 'test', 'ship', 'iterate'];
  var TYPE_LABEL = { object: '业务对象', role: '角色', action: '动作', channel: '渠道', field: '字段', qty: '时限', time: '时限', stat: '统计', delta: '变更' };
  var RULES = ['G-01 对象按词典正向最长匹配打分，并列取先出现的', 'G-02 字段来自对象库，需求句里命中的可选字段一并加入，否定词移除', 'G-03 模板由对象决定，动作序列与模板签名的最长公共子序列作证据', 'G-04 渠道固定 微信扫码 H5 · PC 后台', 'G-05 角色槽位按业态默认岗位填，句中角色词按其后的动作绑定槽位'];
  var M = { step: 'connect', arche: null, data: null, R: null, charged: false, name: null, company: null, frame: null, lastStep: null, role: null, page: null, rowId: null, formVals: null, formErr: null, revealed: {}, timers: [], deltaText: '', drawer: null, pipeStage: null };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function sectorOf(slug) { var hit = null; (DATA.industries.sectors || []).forEach(function (s) { (s.industries || []).forEach(function (i) { if (i.slug === slug) hit = s.key; }); }); return hit; }
  function archeOf(slug) { var sec = sectorOf(slug); var a = (sec && DATA.m10.archetypes.map[sec]) || 'make'; if (a === 'project') a = 'service'; return DATA.m11.samples[a] ? a : 'make'; }
  function loadArche(a) {
    M.arche = a;
    var sample = DATA.m11.samples[a], base = K.ensure(sample);
    if (M.name && M.name !== sample.company) base.company = M.name;
    if (M.company && M.company.systems) base.systems = M.company.systems.slice();
    M.data = base; M.role = null; M.page = null; M.rowId = null; M.formVals = null; M.formErr = null; M.revealed = {}; M.deltaText = '';
    recompute();
  }
  function recompute() { M.R = K.run(M.data, LIB); }
  function commit(data, msg) { M.data = data; recompute(); draw(); if (msg && M.frame) P.toast(M.frame.body, msg); }
  function later(fn, ms) { var t = setTimeout(fn, ms); M.timers.push(t); }
  function clearTimers() { M.timers.forEach(function (t) { clearTimeout(t); }); M.timers = []; }
  function col(cls, kids) { return h('div', { class: cls, style: 'display:flex;flex-direction:column;gap:16px' }, kids); }
  function spec() { return M.R.spec; }
  function rt() { return M.data.state.rt; }
  function tone(status) { var tpl = K.tplOf(LIB, spec().flow.key); return (tpl.statusTone || {})[status] || 'handled'; }
  function statusChip(status) { return P.chip(tone(status), K.stateLabel(spec(), status)); }
  function roleOf(slot) { return K.roleOfSlot(spec(), slot); }
  function actor(slot, alt) { return K.actorOf(spec(), slot, !!alt, LIB); }
  function rolesNonAdmin() { return spec().roles.filter(function (r) { return !r.admin; }); }
  function fmtN(n) { return P.fmtN(n); }
  function waited(min) { return K.fmtDur(Math.max(0, min)); }
  function rowTitle(row) { var s = spec(), f = s.fields.filter(function (x) { return !x.at && x.type !== 'member' && x.type !== 'photo'; }); var a = f[0] ? row.values[f[0].key] : '', b = f[1] ? row.values[f[1].key] : ''; return [a, b].filter(function (x) { return x != null && x !== ''; }).map(String).join(' · '); }
  function qrHtml(text, cell) { try { if (typeof qrcode !== 'function') return ''; var q = qrcode(0, 'M'); q.addData(text); q.make(); return q.createSvgTag({ cellSize: cell || 3, margin: 0, scalable: true }); } catch (e) { return ''; } }

  function mount(root, step, shell) {
    sh = shell; $root = root; h = sh.h; DATA = sh.DATA; P = window.DGG.pui; K = window.DGG.coreM11;
    LIB = { lexicon: DATA.m11.lexicon, objects: DATA.m11.objects, flows: DATA.m11.flows, roles: DATA.m11.roles, components: DATA.m11.components, presets: DATA.m11.presets, tests: DATA.m11.tests, deltas: DATA.m11.deltas, integrations: DATA.m11.integrations, erpSamples: DATA.m10.samples, procSamples: DATA.m8.samples, hrSamples: DATA.m5.samples, qrBase: sh.CFG.wechatUrl };
    P.init(sh);
    var c = sh.getCompany();
    if (!M.data) { M.company = c; M.name = c ? c.name : null; loadArche(c ? archeOf(c.industry) : archeOf(sh.displayIndustryDefault())); }
    M.step = step || (M.charged && M.lastStep ? M.lastStep : 'connect');
    if (STEPS.indexOf(M.step) < 0) M.step = 'connect';
    if (M.step !== 'connect' && !M.data.state.spec) M.data = K.generate(M.data, LIB);
    draw();
  }
  function unmount() { clearTimers(); }
  function onCompany(c) { M.company = c; M.name = c ? c.name : null; M.charged = false; M.lastStep = null; loadArche(c ? archeOf(c.industry) : archeOf(sh.displayIndustryDefault())); if (M.step !== 'connect') setStep('connect'); else draw(); }
  function onIndustry(slug) { if (M.step !== 'connect' || !slug) return; var a = archeOf(slug); if (a !== M.arche) { loadArche(a); draw(); } }
  function setStep(s) { M.step = s; M.lastStep = s; sh.go('m11', s); }
  function enterBuild() { if (!M.data.state.spec) M.data = K.generate(M.data, LIB); setStep('build'); }

  function draw() {
    clearTimers();
    sh.clear($root);
    recompute();
    var R = M.R, k = R.kpi, c = M.company, s = R.spec;
    var meta = c ? [sh.industryNameOf(c.industry), sh.optText('size', c.size)].filter(Boolean).join(' · ') : '';
    var tabs = [{ key: 'connect', label: '接入' }, { key: 'build', label: '生成应用', badge: s ? k.pages : 0 }, { key: 'try', label: '试用', badge: s ? R.stats.open : 0 }, { key: 'test', label: '测试与产物', badge: s ? k.failed : 0 }, { key: 'ship', label: '发布', badge: s ? (R.checklist.total - R.checklist.passed) : 0 }, { key: 'iterate', label: '迭代交付', badge: s ? k.changes : 0 }];
    var F = P.frame({ mark: '开发', accent: ACCENT, modules: P.navModules('m11'), crumbs: ['AI软件开发', tabs.filter(function (t) { return t.key === M.step; })[0].label], company: { name: M.data.company, meta: meta + (meta ? ' · ' : '') + (s ? s.title + ' ' + s.id : '一句需求变可点页面') }, tabs: tabs, active: M.step, onTab: function (key) { if (key !== 'connect' && !M.charged) { enterBuild(); if (key !== 'build') setStep(key); } else setStep(key); } });
    M.frame = F; $root.appendChild(F.root);
    if (M.step !== 'connect' && !M.charged) { M.charged = true; sh.charge(K.CREDITS); }
    if (s) { var row = F.root.querySelector('.pd-top .row'); if (row) row.appendChild(h('span', { class: 'm11-tags' }, [h('span', {}, [s.reqNo + ' ' + (s.status === 'confirmed' ? '已确认' : '已识别')]), h('span', {}, [s.specNo + ' ' + s.specVer]), h('span', { class: 'mute' }, [s.id + ' ' + s.version + (R.env === 'live' ? ' 正式' : ' 测试')])])); }
    ({ connect: screenConnect, build: screenBuild, try: screenTry, test: screenTest, ship: screenShip, iterate: screenIterate })[M.step](F.work);
  }

  /* ---------- 手机框渲染器 ---------- */
  function phone(o) {
    var s = spec(), clockMin = rt() ? rt().clock : K.CLOCK0;
    var el = h('div', { class: 'm11-phone' }, [
      h('div', { class: 'bar' }, [h('span', {}, [K.fmtMin(clockMin)]), h('span', {}, ['●●● ᯤ ▮'])]),
      h('div', { class: 'nav' }, [o.back ? h('span', { class: 'back', onclick: o.back }, ['‹']) : null, h('span', {}, [o.title || s.title]), h('span', { class: 'ver' }, [o.ver || (s.id + ' ' + s.version)])]),
      h('div', { class: 'body' }, [].concat(o.body || [])),
      o.tabs && o.tabs.length ? h('div', { class: 'tabs' }, o.tabs.map(function (t) { return h('button', { class: t.on ? 'on' : '', onclick: t.onClick }, [h('span', { class: 'ic' }, [t.icon || '·']), t.badge ? h('span', { class: 'bd' }, [String(t.badge)]) : null, t.label]); })) : null
    ]);
    if (o.toast) el.appendChild(h('div', { class: 'toast' }, [o.toast]));
    return el;
  }
  function phoneWrap(inner, scale) { var sc = scale || 0.86; return h('div', { class: 'm11-phone-wrap', style: 'height:' + Math.round(667 * sc + 8) + 'px' }, [h('div', { style: 'transform:scale(' + sc + ');transform-origin:top center' }, [inner])]); }
  function fieldControl(f, val, err, isNew) {
    var s = spec(), ctl;
    var v = val == null ? '' : val;
    if (f.type === 'member' && f.auto) ctl = h('div', { class: 'auto' }, ['自动带入 · ' + (v || (actor(M.role || 'submitter') || {}).id)]);
    else if (f.type === 'photo') ctl = h('div', { class: 'photo', 'data-key': f.key, 'data-val': String(v === '' ? 0 : v) }, [h('span', { class: 'ic' }, ['📷']), (Number(v) > 0 ? '已拍 ' + v + ' 张' : '拍照上传') + ' · 最多 ' + (f.max || 3) + ' 张']);
    else if (f.type === 'select') ctl = h('select', { 'data-key': f.key }, [h('option', { value: '' }, ['请选择'])].concat((f.options || []).map(function (op) { return h('option', { value: op, selected: op === v }, [op]); })));
    else if (f.type === 'ref' || (f.type === 'member' && !f.auto)) { var tb = K.refTable(LIB, s.arche, f.ref || 'employees'), rows = tb ? tb.rows.slice(0, 40) : []; ctl = h('select', { 'data-key': f.key }, [h('option', { value: '' }, ['请选择 · ' + (tb ? tb.name : '')])].concat(rows.map(function (r) { return h('option', { value: r.label, selected: r.label === v || r.id === v }, [r.label]); }))); }
    else if (f.type === 'textarea') ctl = h('textarea', { 'data-key': f.key }, [String(v)]);
    else if (f.type === 'rating') ctl = h('div', { class: 'stars', 'data-key': f.key, 'data-val': String(v || 5) }, [1, 2, 3, 4, 5].map(function (i) { return h('span', { class: i <= (Number(v) || 5) ? '' : 'off' }, ['★']); }));
    else ctl = h('input', { type: 'text', 'data-key': f.key, value: String(v), placeholder: f.type === 'money' ? '元（预计）' : f.type === 'number' ? '数字' : f.type === 'date' ? '2026-09-17' : f.type === 'datetime' ? '2026-09-17 09:00' : '' });
    return h('div', { class: 'fld' + (err ? ' bad' : '') + (isNew ? ' new' : '') }, [h('label', {}, [f.label, f.required ? h('b', {}, ['*']) : null]), ctl, err ? h('div', { class: 'err' }, [err]) : null]);
  }
  function readForm(container) {
    var vals = {};
    container.querySelectorAll('[data-key]').forEach(function (el) { var k = el.getAttribute('data-key'); if (el.hasAttribute('data-val')) vals[k] = Number(el.getAttribute('data-val')); else vals[k] = el.value; });
    return vals;
  }
  function formPage(o) {
    var s = spec(), fields = o.fields || K.formFields(s), vals = o.values || {}, errs = {};
    (o.errors || []).forEach(function (e) { errs[e.field] = e.msg; });
    var body = h('div', { class: 'card' }, [h('div', { class: 'ttl' }, [o.title || s.title]), h('div', { class: 'sub' }, [o.sub || ('提交后进入 ' + K.stateLabel(s, K.initialState(s)) + (s.transitions[0] && s.transitions[0].sla ? ' · ' + s.transitions[0].action + '约定 ' + s.transitions[0].sla + ' 小时' : ''))])].concat(fields.map(function (f) { return fieldControl(f, vals[f.key], errs[f.key], o.newKeys && o.newKeys.indexOf(f.key) >= 0); })).concat([o.onSubmit ? h('button', { class: 'btn', onclick: function () { o.onSubmit(readForm(body)); } }, [o.submitText || '提交']) : null]));
    return body;
  }
  function rowsPage(o) {
    var s = spec(), list = o.rows || [];
    if (!list.length) return [h('div', { class: 'card' }, [h('div', { class: 'sub', style: 'text-align:center;padding:20px 0' }, [o.empty || '暂无记录'])])];
    return list.map(function (r) {
      var flag = o.flags ? o.flags[r.id] : null, ov = o.overdue ? o.overdue[r.id] : null;
      return h('div', { class: 'row' + (M.rowId === r.id ? ' on' : ''), onclick: o.onPick ? function () { o.onPick(r); } : null }, [
        h('div', { class: 't' }, [h('span', {}, [rowTitle(r)]), r.createdAt >= rt().clock - 30 && r.status === K.initialState(s) ? h('span', { class: 'new' }, ['新']) : null, flag ? h('span', { class: 'flag' }, [flag]) : null]),
        h('div', { class: 's' }, [r.id + ' · ' + r.createdBy.id + ' · ' + K.fmtMin(r.createdAt) + (ov ? ' · ' + ov : '')]),
        h('div', { class: 'r' }, [statusChip(r.status), h('span', {}, [r.status === K.initialState(s) ? '已等待 ' + waited(rt().clock - r.createdAt) : (r.assignee || '')])])
      ]);
    });
  }
  function detailPage(row, o) {
    var s = spec(), a = M.role ? actor(M.role) : null;
    var kv = h('div', { class: 'kv' });
    s.fields.forEach(function (f) { var v = row.values[f.key]; if (v == null || v === '' || (f.type === 'photo' && !(v > 0))) return; kv.appendChild(h('span', { class: 'k' }, [f.label])); kv.appendChild(h('span', { class: 'v' }, [f.type === 'photo' ? '已拍 ' + v + ' 张' : f.type === 'money' ? fmtN(v) + ' 元' : String(v)])); });
    var trail = h('div', { class: 'trail' });
    s.states.forEach(function (st, i) { var hh = row.history.filter(function (x) { return x.to === st.key; })[0]; var done = !!hh, on = row.status === st.key; trail.appendChild(h('div', { class: 'n' + (done && !on ? ' done' : on ? ' on' : '') }, [h('i', {}, [String(i + 1)]), h('span', {}, [st.label + (hh ? ' · ' + hh.role + ' ' + hh.by : '')]), h('span', { class: 'w' }, [hh ? K.fmtMin(hh.atMin) : ''])])); });
    var acts = h('div', { class: 'acts' });
    var trs = a ? s.transitions.filter(function (t) { return t.from === row.status && t.by.indexOf(a.slot) >= 0 && (t.scope !== 'assignee' || !row.assignee || row.assignee === a.id); }) : [];
    var seen = {};
    trs.forEach(function (t) { if (seen[t.actionEn]) return; seen[t.actionEn] = 1; var stage = K.stageFields(s, t.actionEn).filter(function (f) { return !(f.type === 'member' && f.auto); }); var sv = Object.assign(K.exampleValues(s, stage, LIB, 0), presetStage(t.actionEn)); var box = h('div', { class: 'card', style: 'padding:0;gap:6px' }, stage.map(function (f) { return fieldControl(f, sv[f.key], (M.formErr && M.formErr.action === t.actionEn && M.formErr.map[f.key]) || null); })); acts.appendChild(box); acts.appendChild(h('button', { class: 'btn' + (t.to === K.initialState(s) ? ' sec' : ''), onclick: function () { o.onAction(t, Object.assign({}, sv, readForm(box))); } }, [t.action])); });
    return [h('div', { class: 'card' }, [h('div', { class: 'ttl' }, [row.id]), h('div', { style: 'display:flex;gap:8px;align-items:center' }, [statusChip(row.status), h('span', { class: 'sub' }, ['版本 ' + row.version + ' · ' + (row.assignee ? '处理人 ' + row.assignee : '未接单')])]), kv]), h('div', { class: 'card' }, [h('div', { class: 'ttl' }, ['流转记录']), trail]), trs.length ? h('div', { class: 'card' }, [h('div', { class: 'ttl' }, ['当前可做']), acts]) : null];
  }
  function presetStage(actionEn) { var p = K.presetFor(LIB, spec().arche, spec().objectKey); if (!p) return {}; var v = {}; if (actionEn === 'assign' && p.assignValues) Object.assign(v, p.assignValues); if (p.completeValues) Object.keys(p.completeValues).forEach(function (k) { var f = spec().fields.filter(function (x) { return x.key === k; })[0]; if (f && f.at === actionEn) v[k] = p.completeValues[k]; }); return v; }
  function boardMini() {
    var st = M.R.stats, s = spec(), max = Math.max.apply(null, st.byStatus.map(function (x) { return x.n; })) || 1;
    var dist = h('div', { class: 'dist' }); st.byStatus.forEach(function (x) { dist.appendChild(h('div', { class: 'd' }, [h('span', {}, [x.label]), h('span', { class: 'trk' }, [h('i', { class: tone(x.key), style: 'width:' + Math.round(100 * x.n / max) + '%' })]), h('b', {}, [String(x.n)])])); });
    var groups = st.statGroups.map(function (g) { var mx = Math.max.apply(null, g.groups.map(function (x) { return g.metric === 'statDuration' ? (x.avgMin || 0) : g.metric === 'statRating' ? (x.avgRating || 0) : x.n; })) || 1; var d2 = h('div', { class: 'dist' }); g.groups.forEach(function (x) { var val = g.metric === 'statDuration' ? (x.avgMin || 0) : g.metric === 'statRating' ? (x.avgRating || 0) : x.n; d2.appendChild(h('div', { class: 'd' }, [h('span', {}, [x.key]), h('span', { class: 'trk' }, [h('i', { style: 'width:' + Math.round(100 * val / mx) + '%' })]), h('b', {}, [g.metric === 'statDuration' ? K.fmtDur(val) : String(val)])])); }); return h('div', { class: 'card' }, [h('div', { class: 'ttl' }, ['按' + g.byLabel + '统计' + g.metricLabel]), d2]); });
    return [h('div', { class: 'kpis' }, [h('div', { class: 'k' }, [h('b', {}, [String(st.todayNew)]), h('span', {}, ['今日' + s.verb])]), h('div', { class: 'k' + (st.open ? ' late' : '') }, [h('b', {}, [String(st.open)]), h('span', {}, [K.stateLabel(s, K.initialState(s))])]), h('div', { class: 'k' + (st.overdueN ? ' late' : ' ok') }, [h('b', {}, [String(st.overdueN)]), h('span', {}, ['超时'])])]), h('div', { class: 'card' }, [h('div', { class: 'ttl' }, ['状态分布']), dist])].concat(groups);
  }
  function adminPage() { var s = spec(); return [h('div', { class: 'card' }, [h('div', { class: 'ttl' }, ['应用管理 · ' + s.id]), h('div', { class: 'kv' }, [h('span', { class: 'k' }, ['版本']), h('span', { class: 'v' }, [s.version + ' · ' + s.specNo + ' ' + s.specVer]), h('span', { class: 'k' }, ['角色']), h('span', { class: 'v' }, [s.roles.map(function (r) { return r.title; }).join(' · ')]), h('span', { class: 'k' }, ['字段']), h('span', { class: 'v' }, [s.fields.length + ' 个']), h('span', { class: 'k' }, ['流程']), h('span', { class: 'v' }, [s.states.map(function (x) { return x.label; }).join(' → ')]), h('span', { class: 'k' }, ['通知']), h('span', { class: 'v' }, [s.notifyChannel])])])]; }
  function ratePage(row, onSubmit) { var s = spec(), fields = K.stageFields(s, 'rate'); var vals = K.exampleValues(s, fields, LIB, 0); var box = h('div', { class: 'card' }, [h('div', { class: 'ttl' }, ['评价 ' + (row ? row.id : '')]), h('div', { class: 'sub' }, [row ? rowTitle(row) : '已完成的' + s.short + '可评价'])].concat(fields.map(function (f) { return fieldControl(f, vals[f.key]); })).concat([onSubmit ? h('button', { class: 'btn', onclick: function () { onSubmit(readForm(box)); } }, ['提交评价']) : null])); return [box]; }
  function entryPage(env) { var s = spec(), txt = M.R.qrText, svg = qrHtml(txt, 3); return [h('div', { class: 'entry' }, [h('div', { class: 'qr', html: svg || '<div class="txt">H5 链接 ' + txt + '</div>' }), h('div', { class: 'apn' }, [s.title]), P.chip(env === 'live' ? 'ok' : 'watch', s.version + (env === 'live' ? ' 正式' : ' 测试')), h('div', { class: 'cap' }, ['微信扫码打开 · ' + (env === 'live' ? '正式环境' : '测试环境')]), h('div', { class: 'cap' }, [s.channels.map(function (c) { return c.name; }).join(' · ')])])]; }
  function renderPage(key, o) {
    var s = spec(), pg = s.pages.filter(function (p) { return p.key === key; })[0] || s.pages[0];
    o = o || {};
    if (pg.kind === 'form') return phone({ title: pg.name, body: [formPage({ values: o.values, errors: o.errors, onSubmit: o.onSubmit, newKeys: o.newKeys })], tabs: o.tabs });
    if (pg.kind === 'mine' || pg.kind === 'list') return phone({ title: pg.name, body: rowsPage({ rows: o.rows || [], onPick: o.onPick, empty: o.empty, flags: o.flags, overdue: o.overdue }), tabs: o.tabs });
    if (pg.kind === 'detail') return phone({ title: pg.name, back: o.back, body: o.row ? detailPage(o.row, { onAction: o.onAction }) : [h('div', { class: 'card' }, [h('div', { class: 'sub' }, ['从待办里点开一条'])])], tabs: o.tabs });
    if (pg.kind === 'board') return phone({ title: pg.name, body: boardMini(), tabs: o.tabs });
    if (pg.kind === 'admin') return phone({ title: pg.name, body: adminPage(), tabs: o.tabs });
    if (pg.kind === 'rate') return phone({ title: pg.name, body: ratePage(o.row, o.onSubmit), tabs: o.tabs });
    return phone({ title: pg.name, body: [], tabs: o.tabs });
  }

  /* ---------- 屏 1 接入 ---------- */
  function chip(cls, k, v, hits) { return h('span', { class: 'm11-chip ' + cls }, [h('span', { class: 'k' }, [k]), h('span', { class: 'v' }, [v]), h('span', { class: 'h' }, [hits && hits.length ? '命中「' + hits.join('」「') + '」' : '按业态默认'])]); }
  function parseChips(pr) {
    var box = h('div', { class: 'm11-chips' });
    box.appendChild(chip('obj', TYPE_LABEL.object, pr.objectName, pr.objectHits));
    pr.roles.forEach(function (r) { box.appendChild(chip('role', TYPE_LABEL.role, r.title + (r.emp ? ' ' + r.emp : ''), r.hit ? [pr.evidence.filter(function (e) { return e.type === 'role' && e.canon === r.hit; }).map(function (e) { return e.surface; })[0] || r.hit] : null)); });
    box.appendChild(chip('flow', '流程模板', pr.flowName + (pr.flowModeName ? ' · ' + pr.flowModeName : ''), pr.evidence.filter(function (e) { return e.type === 'action'; }).map(function (e) { return e.surface; }).slice(0, 4)));
    pr.channels.forEach(function (c) { box.appendChild(chip('', TYPE_LABEL.channel, c.name, c.hits)); });
    pr.extraFields.forEach(function (k) { var f = K.objOf(LIB, pr.object).optional.filter(function (x) { return x.key === k; })[0]; if (f) box.appendChild(chip('field', '加字段', f.label, pr.evidence.filter(function (e) { return e.type === 'field' && e.key === k; }).map(function (e) { return e.surface; }))); });
    if (pr.sla) box.appendChild(chip('field', TYPE_LABEL.time, '约定时效 ' + pr.sla.n + ' ' + pr.sla.unit, pr.evidence.filter(function (e) { return e.type === 'time' || e.type === 'qty'; }).map(function (e) { return e.surface; })));
    return box;
  }
  function screenConnect(work) {
    var R = M.R, d = M.data, pr = R.parsed, pv = R.preview;
    work.classList.add('m11-connect');
    var g = h('div', { class: 'pd-grid' });
    var nameIn = h('input', { type: 'text', value: d.company, oninput: function (e) { M.name = e.target.value; d.company = e.target.value; var co = M.frame.root.querySelector('.pd-top .co span:nth-child(2)'); if (co) co.textContent = e.target.value; } });
    var srcs = h('div');
    ['machines', 'employees', 'customers'].forEach(function (k) { var s = R.refs[k]; if (!s) return; srcs.appendChild(h('div', { class: 'src-row' }, [h('div', {}, [h('div', { class: 't' }, [s.name + ' ' + fmtN(s.count) + ' ' + s.unit]), h('div', { class: 's' }, ['来自 ' + s.system + ' · 同步 ' + s.syncAt]), h('div', { class: 'ids' }, [s.sample.join(' · ') + (s.count > s.sample.length ? ' …' : '')])]), P.chip(s.mode === 'direct' ? 'ok' : 'watch', s.mode === 'direct' ? '系统直连' : '表格导入'), h('span', { class: 'pd-dot ' + (s.mode === 'direct' ? 'ok' : 'risk') })])); });
    g.appendChild(P.card({ cls: 'c4', title: '企业与主数据', sub: '本应用会关联的主数据 · 只引用不复制', body: [h('div', { class: 'pd-form' }, [h('div', { class: 'pd-field' }, [h('label', {}, ['企业名称']), nameIn]), h('div', { class: 'pd-field' }, [h('label', {}, ['行业']), h('div', { style: 'font-weight:600' }, [M.company ? sh.industryNameOf(M.company.industry) + (M.company.size ? ' · ' + sh.optText('size', M.company.size) : '') : sh.industryNameOf(sh.displayIndustryDefault())])])]), h('div', { style: 'margin-top:8px' }, [srcs])], foot: ['渠道 ' + pr.channels.map(function (c) { return c.name; }).join(' · ') + ' · 通知 ' + LIB.components.texts.notifyChannel] }));
    // 需求
    var req = h('div', { class: 'm11-req' });
    var list = h('div', { class: 'pd-list' });
    R.presets.forEach(function (p) { var it = P.item({ tone: p.active ? 'accent' : 'hand', icon: String(p.index + 1), title: p.text, sub: p.objectName + ' · ' + p.flowName, right: '预计 ' + p.summary.pages + ' 页 · ' + p.summary.fields + ' 字段', rightSub: p.summary.roles + ' 角色 · ' + p.summary.states + ' 节点', onClick: function () { M.data = K.pickPreset(M.data, LIB, p.index); recompute(); draw(); } }); if (p.active) it.classList.add('on'); list.appendChild(it); });
    req.appendChild(list);
    var chipsBox = h('div'), goBox = h('div', { class: 'c12' }), metaBox = h('div', { class: 'meta' });
    var ta = h('textarea', { class: 'm11-ta', oninput: function (e) { M.data = K.setText(M.data, LIB, e.target.value); recompute(); refresh(); } }, [R.text]);
    req.appendChild(ta);
    function refresh() {
      var Rr = M.R, p = Rr.parsed, v = Rr.preview;
      sh.clear(chipsBox);
      if (p.mode === 'fallback') chipsBox.appendChild(h('div', { class: 'm11-note', style: 'margin-bottom:8px' }, ['未识别到业务对象，已按最接近的需求「' + Rr.presets[p.preset].text + '」解析']));
      chipsBox.appendChild(parseChips(p));
      sh.clear(metaBox); metaBox.appendChild(h('span', {}, ['需求解析单 ' + K.IDS.req])); metaBox.appendChild(P.chip('ok', '已识别', true)); metaBox.appendChild(h('span', {}, ['命中 ' + p.hits + ' 词 · 未识别 ' + p.unknown]));
      sh.clear(goBox);
      goBox.appendChild(h('div', { class: 'm11-go' }, [h('div', {}, [h('div', { class: 't' }, [p.objectName + ' · ' + v.pages + ' 页 · ' + v.fields + ' 字段 · ' + v.roles + ' 角色 · ' + v.states + ' 节点']), h('div', { class: 's' }, [p.flowName + (p.flowModeName ? '（' + p.flowModeName + '）' : '') + ' · 接口 ' + v.apis + ' · 用例 ' + v.tests + ' · 渠道 ' + p.channels.map(function (c) { return c.name; }).join(' + ')])]), h('div', { class: 'sp' }), h('div', { class: 'cr' }, [h('b', { class: 'num' }, [String(K.CREDITS)]), ' 积分 / 次']), P.btn('生成应用', { cls: 'primary big', onClick: enterBuild })]));
    }
    req.appendChild(chipsBox); req.appendChild(metaBox);
    refresh();
    g.appendChild(P.card({ cls: 'c8', title: '一句需求', sub: '选一条或直接改词 · 词典解析，屏上只回显命中词', body: [req], foot: ['对象库 ' + K.objectsFor(LIB, M.arche).length + ' 种业务对象 · 三类流程模板 · 追加需求认六种变更'] }));
    g.appendChild(goBox);
    work.appendChild(g);
  }

  /* ---------- 屏 2 生成应用 ---------- */
  function judgeDrawer() {
    var R = M.R, s = spec(), pr = R.parsed, obj = K.objOf(LIB, s.objectKey);
    var seen = ['需求句命中 ' + pr.hits + ' 词 · 未识别 ' + pr.unknown + '（' + pr.evidence.map(function (e) { return e.surface; }).slice(0, 8).join('、') + '）', '对象库 ' + obj.name + ' ' + obj.fields.length + ' 字段 · 可选 ' + obj.optional.length, '流程模板 ' + pr.flowName + (pr.flowModeName ? '（' + pr.flowModeName + '）' : '') + ' · 签名匹配 ' + pr.lcs[0].lcs + ' 个动作'].concat(s.integrations.map(function (i) { return i.name + ' ' + i.rows + ' ' + i.unit + '（' + i.system + '）'; }));
    var ev = P.table({ compact: true, cols: [{ key: 'type', label: '类型', w: '70px', render: function (r) { return TYPE_LABEL[r.type] || r.type; } }, { key: 'surface', label: '识别词' }, { key: 'canon', label: '映射', render: function (r) { return r.canon + (r.slot ? ' · ' + r.slot : '') + (r.neg ? ' · 否定' : ''); } }], rows: pr.evidence });
    var ft = P.table({ compact: true, cols: [{ key: 'label', label: '字段' }, { key: 'type', label: '类型', render: function (r) { return LIB.components.controls[r.type].name; } }, { key: 'required', label: '必填', render: function (r) { return r.required ? '是' : ''; } }, { key: 'rule', label: '校验', render: function (r) { return r.len ? '≤ ' + r.len + ' 字' : r.min != null || r.max != null ? (r.min != null ? r.min : '') + '–' + (r.max != null ? r.max : '') : r.options ? r.options.length + ' 选 1' : r.ref ? '主数据' : r.at ? '在「' + (s.transitions.filter(function (t) { return t.actionEn === r.at; })[0] || { action: r.at }).action + '」时填' : ''; } }, { key: 'source', label: '来源' }], rows: s.fields });
    P.drawer(M.frame.body, { title: '怎么生成的', sub: s.reqNo + ' → ' + s.specNo + ' ' + s.specVer + ' → ' + s.id, body: [P.judge({ verdict: { tone: 'ok', chip: '已生成', text: s.title + ' · ' + s.pages.length + ' 页 · ' + s.fields.length + ' 字段' }, seen: seen, reasons: RULES }), h('div', { class: 'pd-card' }, [h('div', { class: 'hd' }, [h('div', { class: 't' }, ['需求解析单 ' + s.reqNo])]), h('div', { class: 'bd tight' }, [ev])]), h('div', { class: 'pd-card' }, [h('div', { class: 'hd' }, [h('div', { class: 't' }, ['字段设计表 · 应用规格 ' + s.specNo + ' ' + s.specVer])]), h('div', { class: 'bd tight' }, [ft])])] });
  }
  function screenBuild(work) {
    var R = M.R, s = spec(), k = R.kpi;
    work.classList.add('m11-build');
    var g = h('div', { class: 'pd-grid' });
    g.appendChild(h('div', { class: 'c12' }, [P.kpis([{ label: '页面', value: k.pages, unit: '页', tone: 'accent', sub: '手机 ' + R.pages.filter(function (p) { return p.device === 'phone'; }).length + ' · PC ' + R.pages.filter(function (p) { return p.device === 'pc'; }).length }, { label: '字段', value: k.fields, unit: '个', sub: '必填 ' + s.fields.filter(function (f) { return f.required; }).length }, { label: '角色', value: k.roles, unit: '个', sub: rolesNonAdmin().map(function (r) { return r.title; }).join(' · ') }, { label: '流程节点', value: k.states, unit: '个', sub: s.transitions.length + ' 条流转' }, { label: '接口', value: k.apis, unit: '个', sub: 'REST · 需要角色' }, { label: '用例', value: k.tests, unit: '条', sub: '自动生成 · 可执行', onClick: function () { setStep('test'); } }])]));
    var left = col('c5', []), right = col('c7', []);
    var pagesBox = h('div', { class: 'pd-list m11-pages' }), items = [];
    var revealed = !!M.revealed.build;
    if (!M.page) M.page = 'form';
    R.pages.forEach(function (p, i) { var it = P.item({ tone: p.device === 'phone' ? 'accent' : 'hand', icon: p.device === 'phone' ? '机' : 'PC', title: p.n + ' ' + p.name, sub: p.deviceName + ' · ' + p.roles.join(' / ') + (p.fieldCount ? ' · ' + p.fieldCount + ' 字段' : '') + (p.actions.length ? ' · ' + p.actions.map(function (a) { return a.action; }).join(' / ') : ''), right: p.kindName, onClick: function () { M.page = p.key; pagesBox.querySelectorAll('.pd-item').forEach(function (x) { x.classList.remove('on'); }); it.classList.add('on'); drawPhone(); } }); if (!revealed) it.classList.add('m11-pending'); if (p.key === M.page) it.classList.add('on'); items.push(it); pagesBox.appendChild(it); });
    var steps = P.steps({ compact: true, items: s.states.map(function (st) { var tr = s.transitions.filter(function (t) { return t.to === st.key; })[0]; return { label: st.label, sub: tr ? tr.action + ' · ' + K.roleTitle(s, tr.by[0]) + (tr.sla ? ' · ' + tr.sla + 'h' : '') : '提交人提交', state: st.initial ? 'on' : st.terminal ? 'done' : 'todo' }; }) });
    var rec = h('div', { class: 'm11-rec' }); R.recommended.forEach(function (f) { rec.appendChild(h('button', { onclick: function () { M.revealed.build = true; M.page = f.at ? 'detail' : 'form'; M.newKey = f.key; commit(K.addField(M.data, LIB, f.key), spec().specNo + ' ' + spec().specVer + ' · 新增字段 ' + f.label + ' · 用例 ' + M.R.kpi.tests + ' 条'); } }, ['+ ' + f.label])); });
    left.appendChild(P.card({ title: '页面清单', sub: s.pages.length + ' 页 · 点任一页在手机里看', body: [pagesBox], foot: [h('span', {}, ['流程 ' + s.states.map(function (x) { return x.label; }).join(' → ')])] }));
    left.appendChild(P.card({ title: '流程节点', sub: s.flow.name + (s.flow.modeName ? ' · ' + s.flow.modeName : '') + ' · ' + s.transitions.length + ' 条流转', body: [steps] }));
    left.appendChild(P.card({ title: '推荐字段', sub: R.recommended.length ? '对象库里还有 ' + R.recommended.length + ' 个常用字段 · 点一下写进表单、数据字典与用例' : '常用字段已全部加入', body: [rec] }));
    var phoneBox = h('div');
    function drawPhone() { sh.clear(phoneBox); var vals = null, nk = M.newKey ? [M.newKey] : null; phoneBox.appendChild(phoneWrap(renderPage(M.page, { values: vals, newKeys: nk, rows: M.page === 'list' ? K.query(spec(), rt(), actor('handler'), 'list') : M.page === 'mine' ? K.query(spec(), rt(), actor('submitter'), 'mine') : [], row: M.page === 'detail' ? rt().rows.filter(function (r) { return r.status !== K.initialState(spec()); })[0] : null, onAction: function () { }, tabs: null }), 0.84)); }
    drawPhone();
    right.appendChild(P.card({ title: '手机 · ' + s.channels[0].name, sub: '375 × 667 · 随页面清单点亮同步渲染', extra: P.btn('怎么生成的', { cls: 'sm', onClick: judgeDrawer }), body: [phoneBox], foot: [s.reqNo + ' 已确认 · ' + s.specNo + ' ' + s.specVer + ' 草稿 · ' + s.id + ' 预览'] }));
    g.appendChild(left); g.appendChild(right);
    work.appendChild(g);
    if (!revealed) {
      sh.holdIdle(true);
      var done = function () { M.revealed.build = true; items.forEach(function (it) { it.classList.remove('m11-pending'); }); sh.holdIdle(false); };
      items.forEach(function (it, i) { later(function () { it.classList.remove('m11-pending'); it.classList.add('m11-lit'); M.page = R.pages[i].key; items.forEach(function (x) { x.classList.remove('on'); }); it.classList.add('on'); drawPhone(); if (i === items.length - 1) { M.page = 'form'; items.forEach(function (x) { x.classList.remove('on'); }); items[0].classList.add('on'); drawPhone(); done(); } }, 300 * (i + 1)); });
      var once = function () { work.removeEventListener('click', once); if (!M.revealed.build) { clearTimers(); M.page = 'form'; items.forEach(function (x) { x.classList.remove('on'); }); items[0].classList.add('on'); drawPhone(); done(); } };
      work.addEventListener('click', once);
    }
    M.newKey = null;
  }

  /* ---------- 屏 3 试用 ---------- */
  function roleTabs(slot, onGo) {
    var s = spec(), r = roleOf(slot), perms = M.R.perms, tabs = [];
    var add = function (key, label, icon, badge) { if (!s.pages.some(function (p) { return p.key === key; })) return; tabs.push({ key: key, label: label, icon: icon, badge: badge || 0, on: M.page === key, onClick: function () { M.page = key; onGo(); } }); };
    if (slot === 'submitter') { add('form', '提交', '＋'); add('mine', '我的', '≡', K.query(s, rt(), actor(slot), 'mine').length); add('rate', '评价', '★'); }
    else if (slot === 'lead') { add('board', '看板', '▦'); }
    else { add(slot === 'handler2' && s.pages.some(function (p) { return p.key === 'list2'; }) ? 'list2' : 'list', '待办', '≡', K.query(s, rt(), actor(slot), 'list').length); add('detail', '详情', '☰'); if (K.can(perms, r.key, 'board', '查看')) add('board', '看板', '▦'); }
    return tabs;
  }
  function screenTry(work) {
    var R = M.R, s = spec(), st = R.stats;
    work.classList.add('m11-try');
    if (!M.role) M.role = 'submitter';
    var g = h('div', { class: 'pd-grid' });
    var stepsEl = P.steps({ compact: true, items: R.script.map(function (sc, i) { return { label: sc.n + ' ' + sc.label, sub: sc.actor.title + (sc.actor.emp ? ' ' + sc.actor.emp : ''), state: i < R.scriptStep ? 'done' : i === R.scriptStep ? 'on' : 'todo', tag: i < R.scriptStep && R.scriptId ? R.scriptId : null }; }) });
    var doNext = function () { var step = R.script[R.scriptStep]; if (!step) return; M.role = step.actor.slot; M.formErr = null; var d = K.nextScript(M.data, LIB); var lr = d.state.lastResult; if (!lr || !lr.ok) { P.toast(M.frame.body, lr ? lr.error : '脚本已走完'); return; } M.rowId = lr.id; M.page = step.kind === 'submit' ? 'mine' : 'detail'; commit(d, lr.msg); };
    g.appendChild(P.card({ cls: 'c12', title: '走单脚本', sub: '三步走完 ' + s.states.map(function (x) { return x.label; }).join(' → ') + ' · 也可以在手机上手动填、手动切角色', extra: P.btn(R.scriptStep >= R.script.length ? '脚本已走完' : '下一步 · ' + R.script[R.scriptStep].label, { cls: 'primary', disabled: R.scriptStep >= R.script.length, onClick: doNext }), body: [stepsEl] }));
    var left = col('c5', []), right = col('c7', []);
    var seg = h('div', { class: 'm11-seg' });
    rolesNonAdmin().forEach(function (r) {
      var slot = r.slots.indexOf('lead') >= 0 && r.slots.length === 1 ? 'lead' : r.slots[0], a = actor(slot);
      var badge = slot === 'submitter' ? null : r.slots.indexOf('lead') >= 0 && r.slots.length === 1 ? { n: st.doing, cls: 'ok', t: '处理中' } : { n: K.query(s, rt(), a, 'list').filter(function (x) { return s.transitions.some(function (t) { return t.from === x.status && t.by.indexOf(slot) >= 0; }); }).length, cls: '', t: '待办' };
      seg.appendChild(h('button', { class: M.role === slot ? 'on' : '', onclick: function () { M.role = slot; M.page = null; M.rowId = null; M.formErr = null; draw(); } }, [h('span', { class: 'k' }, [r.label]), h('span', { class: 't' }, [r.title + (a && a.emp ? ' ' + a.emp : a && a.external ? ' ' + a.id : '')]), badge && badge.n ? h('span', { class: 'bd ' + badge.cls }, [badge.t + ' ' + badge.n]) : null]));
    });
    var phoneBox = h('div');
    function drawPhone() {
      sh.clear(phoneBox);
      var slot = M.role, a = actor(slot), el;
      if (!M.page) M.page = slot === 'submitter' ? (M.R.scriptStep === 0 ? 'form' : 'mine') : slot === 'lead' ? 'board' : (slot === 'handler2' && spec().pages.some(function (p) { return p.key === 'list2'; }) ? 'list2' : 'list');
      var tabs = roleTabs(slot, drawPhone);
      if (M.page === 'form') { var vals = M.formVals || (M.R.scriptStep === 0 ? M.R.script[0].values : K.exampleValues(spec(), K.formFields(spec()), LIB, 1)); el = renderPage('form', { values: vals, errors: M.formErr ? M.formErr.list : null, tabs: tabs, onSubmit: function (v) { M.formVals = v; var d = K.submitRow(M.data, LIB, 'submitter', v); var lr = d.state.lastResult; if (!lr.ok) { M.formErr = { list: lr.errors || [{ field: '', msg: lr.error }] }; drawPhone(); return; } M.formErr = null; M.formVals = null; M.rowId = lr.id; M.page = 'mine'; commit(d, lr.msg); } }); }
      else if (M.page === 'mine') el = renderPage('mine', { rows: K.query(spec(), rt(), a, 'mine').slice().reverse(), tabs: tabs, onPick: function (r) { M.rowId = r.id; if (spec().pages.some(function (p) { return p.key === 'rate'; }) && spec().states.filter(function (x) { return x.key === r.status; })[0].terminal && r.status !== 'rated') { M.page = 'rate'; } drawPhone(); } });
      else if (M.page === 'rate') { var rows = K.query(spec(), rt(), a, 'mine').filter(function (r) { return spec().transitions.some(function (t) { return t.from === r.status && t.actionEn === 'rate'; }); }); var row = rows.filter(function (r) { return r.id === M.rowId; })[0] || rows[0]; el = renderPage('rate', { row: row, tabs: tabs, onSubmit: row ? function (v) { var d = K.doTransition(M.data, LIB, 'submitter', row.id, 'rate', v); var lr = d.state.lastResult; if (!lr.ok) { P.toast(M.frame.body, lr.error); return; } M.page = 'mine'; commit(d, lr.msg); } : null }); }
      else if (M.page === 'list' || M.page === 'list2') { var ov = {}; M.R.stats.overdue.forEach(function (o) { ov[o.id] = o.text; }); var fl = {}; M.R.stats.flagged.forEach(function (f) { fl[f.id] = f.text; }); var lr2 = K.query(spec(), rt(), a, 'list').slice().sort(function (x, y) { var ix = spec().states.map(function (z) { return z.key; }); return ix.indexOf(x.status) - ix.indexOf(y.status) || x.createdAt - y.createdAt; }); el = renderPage(M.page, { rows: lr2, tabs: tabs, overdue: ov, flags: fl, empty: '没有待办', onPick: function (r) { M.rowId = r.id; M.page = 'detail'; M.formErr = null; drawPhone(); } }); }
      else if (M.page === 'detail') { var row2 = rt().rows.filter(function (r) { return r.id === M.rowId; })[0] || K.query(spec(), rt(), a, 'list')[0]; el = renderPage('detail', { row: row2, tabs: tabs, back: function () { M.page = slot === 'handler2' && spec().pages.some(function (p) { return p.key === 'list2'; }) ? 'list2' : 'list'; drawPhone(); }, onAction: function (t, v) { var d = K.doTransition(M.data, LIB, slot, row2.id, t.actionEn, v); var lr = d.state.lastResult; if (!lr.ok) { M.formErr = { action: t.actionEn, map: (lr.errors || []).reduce(function (m, e) { m[e.field] = e.msg; return m; }, {}) }; if (!lr.errors || !lr.errors.length) P.toast(M.frame.body, lr.error); drawPhone(); return; } M.formErr = null; commit(d, lr.msg); } }); }
      else el = renderPage(M.page, { tabs: tabs });
      phoneBox.appendChild(phoneWrap(el, 0.84));
    }
    drawPhone();
    left.appendChild(P.card({ title: '手机 · 按角色试用', sub: '角色条切视角 · 角标即待办', body: [seg, h('div', { style: 'margin-top:12px' }, [phoneBox])], foot: ['沙箱时钟 ' + st.clockText + ' · 每个动作 +' + K.STEP_MIN + ' 分'] }));
    // PC 看板
    var urgentF = s.fields.filter(function (f) { return f.type === 'select' && (f.key === 'urgency' || f.key === 'level'); })[0];
    var hot = rt().rows.filter(function (r) { return st.overdue.some(function (o) { return o.id === r.id; }) || (urgentF && ['紧急', '停机', '高', '重大', '严重'].indexOf(r.values[urgentF.key]) >= 0 && !s.states.filter(function (x) { return x.key === r.status; })[0].terminal); });
    if (!hot.length) hot = rt().rows.filter(function (r) { return r.status === K.initialState(s); });
    var ovMap = {}; st.overdue.forEach(function (o) { ovMap[o.id] = o; });
    var tbl = P.table({ compact: true, cols: [{ key: 'id', label: '编号', w: '110px', render: function (r) { return h('b', { class: 'id' }, [r.id]); } }, { key: 'sum', label: s.short, render: function (r) { return rowTitle(r); } }, { key: 'status', label: '状态', w: '84px', render: function (r) { return statusChip(r.status); } }, { key: 'assignee', label: '处理人', w: '80px', render: function (r) { return r.assignee || '—'; } }, { key: 'w', label: '已等待', align: 'right', w: '110px', render: function (r) { return ovMap[r.id] ? h('span', { class: 'neg' }, [waited(rt().clock - r.createdAt)]) : (s.states.filter(function (x) { return x.key === r.status; })[0].terminal ? '—' : waited(rt().clock - r.createdAt)); } }], rows: hot.slice(0, 6), rowKey: function (r) { return r.id; }, activeKey: M.rowId, empty: '没有超时或紧急的' + s.short });
    var hist = []; rt().rows.forEach(function (r) { r.history.forEach(function (x) { hist.push({ at: x.atMin, role: x.role, action: x.action, id: r.id, to: K.stateLabel(s, x.to) }); }); }); hist.sort(function (a, b) { return b.at - a.at; });
    var logs = hist.slice(0, 8).map(function (l, i) { return { seq: hist.length - i, label: l.role + ' ' + l.action, detail: l.id + ' → ' + l.to + ' · ' + K.fmtMin(l.at) }; });
    var pc = h('div', { class: 'm11-pc' }, [h('div', { class: 'chrome' }, [h('i'), h('i'), h('i'), h('span', { class: 'url' }, [LIB.qrBase + '/' + s.table + '/board']), h('span', {}, [K.roleTitle(s, 'lead')])]), h('div', { class: 'bd' }, [
      P.kpis([{ label: '今日' + s.verb, value: st.todayNew, unit: '单', sub: '记录 ' + st.total }, { label: K.stateLabel(s, K.initialState(s)), value: st.open, unit: '单', tone: st.open > 2 ? 'risk' : 'ok' }, { label: '处理中', value: st.doing, unit: '单' }, { label: '已完成', value: st.done, unit: '单', tone: 'ok', sub: '今日 ' + st.todayDone }, { label: '平均' + st.acceptLabel, value: st.avgAcceptMin == null ? '—' : st.avgAcceptMin, unit: '分', tone: st.slaHours && st.avgAcceptMin > st.slaHours * 60 ? 'late' : 'ok', sub: st.slaHours ? '约定 ' + st.slaHours + ' 小时' : '' }, { label: '超时', value: st.overdueN, unit: '单', tone: st.overdueN ? 'late' : 'ok' }]),
      h('div', { class: 'pd-grid' }, [h('div', { class: 'c5' }, [P.card({ title: '状态分布', tight: false, body: [P.dist({ rows: st.byStatus.map(function (x) { return { label: x.label, value: x.n, text: String(x.n), hi: x.key === K.initialState(s) }; }) })] })]), h('div', { class: 'c7' }, [P.card({ title: '超时与紧急', sub: hot.length + ' 单', tight: true, body: [tbl] })])]),
      P.card({ title: '动作日志', sub: hist.length + ' 条 · 沙箱时刻 · 近 8 条', body: [P.log(logs, { reverse: false, empty: '还没有动作' })] })
    ])]);
    right.appendChild(P.card({ title: s.pages.filter(function (p) { return p.kind === 'board'; })[0].name + ' · PC', sub: K.roleTitle(s, 'lead') + '视角 · 手机每个动作这里立刻变', body: [pc] }));
    g.appendChild(left); g.appendChild(right);
    work.appendChild(g);
  }

  /* ---------- 屏 4 测试与产物 ---------- */
  function matrixEl() {
    var R = M.R, s = spec(), pm = R.perms, ops = pm.ops, abbr = { '查看': '查', '新建': '建', '编辑': '编', '流转': '转', '导出': '出', '配置': '配' };
    var tb = h('table', { class: 'm11-matrix' });
    tb.appendChild(h('thead', {}, [h('tr', {}, [h('th', {}, ['角色 · 数据范围'])].concat(pm.pages.map(function (p) { return h('th', { class: 'pg' }, [p.name]); })))]));
    var body = h('tbody');
    pm.rows.forEach(function (r) { body.appendChild(h('tr', {}, [h('td', { class: 'role' }, [r.title, h('span', { class: 's' }, [r.scope])])].concat(pm.pages.map(function (p) { var set = r.pages[p.key] || []; if (!set.length) return h('td', { class: 'none' }, ['—']); return h('td', {}, [h('span', { class: 'ops' }, set.map(function (o) { var isNew = M.newPerm && M.newPerm.role === r.role && M.newPerm.page === p.key && M.newPerm.op === o; return h('i', { class: isNew ? 'new' : 'on', title: o }, [abbr[o] || o]); }))]); })))); });
    tb.appendChild(body);
    return tb;
  }
  function dictDrawer() { var R = M.R, sc = R.schema; P.drawer(M.frame.body, { title: '数据字典 · ' + sc.table, sub: sc.name + ' · ' + sc.columns.length + ' 列 · ' + sc.indexes.length + ' 个索引', body: [P.table({ compact: true, cols: [{ key: 'label', label: '字段' }, { key: 'col', label: '列名' }, { key: 'type', label: '类型' }, { key: 'required', label: '必填', render: function (r) { return r.required ? '是' : ''; } }, { key: 'unique', label: '唯一', render: function (r) { return r.unique ? '是' : ''; } }, { key: 'example', label: '例值', render: function (r) { return String(r.example == null ? '' : r.example); } }, { key: 'source', label: '来源' }], rows: sc.columns }), h('div', { class: 'pd-kv' }, sc.indexes.reduce(function (acc, ix) { return acc.concat([h('span', { class: 'k' }, [ix.name]), h('span', { class: 'v' }, [(ix.unique ? '唯一 ' : '') + ix.cols.join(', ')])]); }, []))] }); }
  function apiDrawer() {
    var R = M.R, s = spec(), row0 = rt().rows[0], detail = h('div');
    var tbl = P.table({ compact: true, cols: [{ key: 'id', label: '编号', w: '64px' }, { key: 'name', label: '接口' }, { key: 'method', label: '方法', w: '54px', render: function (r) { return P.chip(r.method === 'GET' ? 'ok' : 'handled', r.method, true); } }, { key: 'path', label: '路径' }, { key: 'roles', label: '需要角色', render: function (r) { return r.roles.join(' / '); } }], rows: R.apis, rowKey: function (r) { return r.id; }, onRow: function (r) { sh.clear(detail); var body = {}; (r.body || []).forEach(function (k) { var f = s.fields.filter(function (x) { return x.key === k; })[0]; body[k] = row0 && row0.values[k] != null ? row0.values[k] : k === 'expected_version' ? 1 : f ? K.exampleOf(f, LIB, s, 0) : ''; }); var resp = r.method === 'GET' && r.path.indexOf('stats') >= 0 ? { total: R.stats.total, byStatus: R.stats.byStatus.map(function (x) { return { status: x.key, n: x.n }; }) } : row0 ? { id: row0.id, status: row0.status, version: row0.version } : { id: s.prefix + '-2609-001', status: K.initialState(s), version: 1 }; detail.appendChild(h('div', { class: 'pd-card' }, [h('div', { class: 'hd' }, [h('div', { class: 't' }, [r.id + ' ' + r.name]), h('div', { class: 's' }, [r.method + ' ' + r.path])]), h('div', { class: 'bd' }, [h('div', { class: 'pd-kv' }, [h('span', { class: 'k' }, ['需要角色']), h('span', { class: 'v' }, [r.roles.join(' / ')]), h('span', { class: 'k' }, [r.method === 'GET' ? '查询参数' : '请求体']), h('span', { class: 'v' }, [h('div', { class: 'pd-pre' }, [JSON.stringify(r.method === 'GET' ? (r.query || []).reduce(function (m, k) { m[k] = ''; return m; }, {}) : body, null, 1)])]), h('span', { class: 'k' }, ['响应示例']), h('span', { class: 'v' }, [h('div', { class: 'pd-pre' }, [JSON.stringify(resp, null, 1)])])])])])); } });
    P.drawer(M.frame.body, { title: '接口清单', sub: R.apis.length + ' 个 · 点一行看请求 / 响应示例 · 需要角色来自权限矩阵', body: [tbl, detail] });
  }
  function refDrawer() { var s = spec(); var list = h('div', { class: 'pd-list' }); s.integrations.forEach(function (i) { list.appendChild(P.item({ tone: i.mode === 'direct' ? 'ok' : 'risk', icon: i.mode === 'direct' ? '直' : '导', title: i.fields.join(' / ') + ' ↔ ' + i.name, sub: i.system + ' · ' + i.rows + ' ' + i.unit + ' · 同步 ' + i.syncAt, right: i.mode === 'direct' ? '系统直连' : '表格导入' })); }); s.fields.filter(function (f) { return f.type === 'money'; }).forEach(function (f) { list.appendChild(P.item({ tone: 'hand', icon: '账', title: f.label + ' → 费用科目', sub: '只读 · 不回写', right: '预计' })); }); P.drawer(M.frame.body, { title: '主数据关联', sub: s.integrations.length + ' 项 · 只引用不复制', body: [list] }); }
  function screenTest(work) {
    var R = M.R, s = spec(), tr = R.testResult, k = R.kpi;
    work.classList.add('m11-test');
    var g = h('div', { class: 'pd-grid' });
    g.appendChild(h('div', { class: 'c12' }, [P.kpis([{ label: '用例', value: tr.total, unit: '条', tone: 'accent', sub: tr.byKind.map(function (b) { return b.kindName + ' ' + b.n; }).join(' · ') }, { label: '通过', value: tr.passed, unit: '条', tone: 'ok', sub: '通过率 ' + tr.passRate + '%' }, { label: '失败', value: tr.failed, unit: '条', tone: tr.failed ? 'late' : 'ok', sub: '警告 ' + tr.warnings.length }, { label: '越权拦截', value: tr.roleBlocked, unit: '次', sub: '无权调用一律拒绝' }, { label: '数据表', value: 1, unit: '表', sub: k.fields + ' 字段 · ' + R.schema.indexes.length + ' 索引', onClick: dictDrawer }, { label: '接口', value: k.apis, unit: '个', sub: '需要角色已标注', onClick: apiDrawer }])]));
    var left = col('c7', []), right = col('c5', []);
    var revealed = !!M.revealed.test;
    var tbl = P.table({ compact: true, cols: [{ key: 'id', label: '编号', w: '64px' }, { key: 'kindName', label: '分组', w: '78px', render: function (r) { return P.chip('handled', r.kindName, true); } }, { key: 'name', label: '用例' }, { key: 'expect', label: '预期' }, { key: 'actual', label: '实际' }, { key: 'pass', label: '结果', w: '84px', align: 'right', render: function (r) { return h('span', { class: 'res' }, [P.chip(r.pass ? 'ok' : 'late', r.pass ? '通过' : '失败')]); } }], rows: tr.rows, rowClass: function () { return revealed ? '' : 'hide'; } });
    var wrap = h('div', { class: 'm11-tests' }, [tbl]);
    left.appendChild(P.card({ title: '测试报告 CS-' + (M.data.state.testRuns < 10 ? '00' : '0') + M.data.state.testRuns, sub: '在预埋 ' + R.stats.total + ' 条记录的副本上逐条真实执行 · 每条用例从干净副本开始', extra: P.btn('再跑一遍', { cls: 'sm', onClick: function () { M.revealed.test = false; commit(K.runAllTests(M.data, LIB), M.data.state.lastResult.msg); } }), tight: true, body: [wrap], foot: [tr.warnings.length ? '警告 ' + tr.warnings.map(function (w) { return w.id + ' ' + w.text; }).join('；') : '无警告'] }));
    var sg = R.suggestion;
    var sugg = sg ? h('div', { class: 'm11-sugg' }, [h('div', { class: 't' }, [P.chip(sg.done ? 'ok' : 'risk', sg.done ? '已采纳' : 'AI 建议', true), sg.done ? sg.roleTitle + '已可查看' + sg.pageName : sg.text]), sg.done ? P.chip('ok', '已更新', true) : P.btn('采纳', { cls: 'primary sm', onClick: function () { M.revealed.test = true; M.newPerm = { role: sg.role, page: sg.page, op: sg.op }; M.newTestFrom = tr.total; commit(K.grantPermission(M.data, LIB, sg.role, sg.page, sg.op), '权限矩阵已更新 · 规格 ' + M.R.spec.specVer + ' · 用例 ' + M.R.testResult.total + ' 条'); } }), h('div', { class: 'd' }, [sg.reason])]) : null;
    right.appendChild(P.card({ title: '权限矩阵', sub: s.roles.length + ' 角色 × ' + s.pages.length + ' 页 · 查 建 编 转 出 配', tight: true, body: [h('div', { style: 'padding:8px 10px;overflow:auto' }, [matrixEl()]), sugg ? h('div', { style: 'padding:0 12px 12px' }, [sugg]) : null] }));
    var prods = h('div', { class: 'pd-list' });
    prods.appendChild(P.item({ tone: 'accent', icon: '表', title: '数据字典 ' + R.schema.table, sub: R.schema.columns.length + ' 列 · ' + R.schema.indexes.length + ' 索引 · 来源逐列标注', right: '查看', onClick: dictDrawer }));
    prods.appendChild(P.item({ tone: 'accent', icon: 'API', title: '接口清单', sub: R.apis.length + ' 个 · ' + R.apis.filter(function (a) { return a.method === 'POST'; }).length + ' 写 ' + R.apis.filter(function (a) { return a.method === 'GET'; }).length + ' 读 · 需要角色', right: '查看', onClick: apiDrawer }));
    prods.appendChild(P.item({ tone: 'accent', icon: '联', title: '主数据关联', sub: s.integrations.map(function (i) { return i.name + ' ' + i.rows + ' ' + i.unit; }).join(' · '), right: '查看', onClick: refDrawer }));
    right.appendChild(P.card({ title: '产物', sub: '每项都随规格版本同步', body: [prods] }));
    g.appendChild(left); g.appendChild(right);
    work.appendChild(g);
    var rows = wrap.querySelectorAll('tbody tr');
    if (!revealed) {
      sh.holdIdle(true);
      rows.forEach(function (r, i) { later(function () { r.classList.remove('hide'); r.classList.add('show'); if (i === rows.length - 1) { M.revealed.test = true; sh.holdIdle(false); } }, 80 * (i + 1)); });
      if (!rows.length) sh.holdIdle(false);
    } else if (M.newTestFrom != null) { rows.forEach(function (r, i) { if (i >= M.newTestFrom) { r.classList.add('hide'); later(function () { r.classList.remove('hide'); r.classList.add('show'); }, 200); } }); M.newTestFrom = null; }
    M.newPerm = null;
  }

  /* ---------- 屏 5 发布 ---------- */
  function screenShip(work) {
    var R = M.R, s = spec(), ck = R.checklist, env = R.env, last = R.releases[R.releases.length - 1];
    work.classList.add('m11-ship');
    var g = h('div', { class: 'pd-grid' });
    var left = col('c5', []), right = col('c7', []);
    var phoneBox = h('div', {}, [phoneWrap(phone({ title: '扫码入口', ver: s.version, body: entryPage(env) }), 0.84)]);
    left.appendChild(P.card({ title: '手机 · 扫码入口', sub: '二维码内容 = 平台地址 + 应用与版本参数', body: [phoneBox], foot: [R.qrText] }));
    var checks = h('div', { class: 'm11-checks' }); ck.items.forEach(function (c) { checks.appendChild(h('span', { class: 'c' + (c.ok ? '' : ' bad') }, [c.ok ? '✓' : '✗', c.label, h('span', { class: 'd' }, ['· ' + c.detail])])); });
    var stage = M.pipeStage != null ? M.pipeStage : null;
    var pipeItems = R.pipeline.map(function (p, i) { var st = p.state; if (stage != null) st = i < stage ? 'done' : i === stage ? 'on' : 'todo'; return { label: p.label, sub: i === 2 ? '用例 ' + R.testResult.passed + ' / ' + R.testResult.total : i === 1 ? (R.releases[0] ? R.releases[0].at : '') : i === 3 && last && last.env === 'prod' ? last.at : '', state: st }; });
    var pipe = P.steps({ items: pipeItems });
    var kv = P.kv([['应用', s.title + ' ' + s.id], ['版本', s.version + ' · ' + s.specNo + ' ' + s.specVer], ['渠道', s.channels.map(function (c) { return c.name; }).join(' · ')], ['发布人', LIB.roles.admin], ['发布说明', last ? last.note : ''], ['适用范围', rolesNonAdmin().map(function (r) { return r.title; }).join(' · ')], ['通知', s.notifyChannel]]);
    var btn = P.btn(env === 'live' ? s.version + ' 已上线' : '发布到正式环境', { cls: 'primary', disabled: !ck.all || env === 'live', onClick: function () {
      var d = K.publish(M.data, LIB), lr = d.state.lastResult; if (!lr.ok) { P.toast(M.frame.body, lr.error); return; }
      sh.holdIdle(true); var i = 2; M.pipeStage = 2;
      var tick = function () { M.pipeStage = i; var np = P.steps({ items: R.pipeline.map(function (p, j) { return { label: p.label, sub: pipeItems[j].sub, state: j < i ? 'done' : j === i ? 'on' : 'todo' }; }) }); pipe.parentNode.replaceChild(np, pipe); pipe = np; i++; if (i <= 5) later(tick, 400); else { M.pipeStage = null; sh.holdIdle(false); commit(d, lr.msg); } };
      tick();
    } });
    var rel = P.table({ compact: true, cols: [{ key: 'id', label: '编号', w: '70px' }, { key: 'version', label: '版本', w: '70px' }, { key: 'envName', label: '环境', render: function (r) { return P.chip(r.env === 'prod' ? 'ok' : 'watch', r.envName); } }, { key: 'publisher', label: '发布人' }, { key: 'at', label: '时间' }, { key: 'status', label: '状态', render: function (r) { return r.status + (r.smoke ? ' · 冒烟 ' + r.smoke : ''); } }], rows: R.releases });
    right.appendChild(P.card({ title: '发布 · 发布记录', sub: '发布前检查 ' + ck.passed + ' / ' + ck.total + ' · ' + (env === 'live' ? '正式环境 已上线' : '测试环境 已发布 · 正式环境 待发布'), extra: btn, body: [h('div', { class: 'pd-field' }, [h('label', {}, ['发布前检查']), checks]), h('div', { class: 'pd-field', style: 'margin-top:12px' }, [h('label', {}, ['发布流水']), pipe]), h('div', { style: 'margin-top:12px' }, [kv])], foot: [h('div', { style: 'width:100%' }, [rel])] }));
    g.appendChild(left); g.appendChild(right);
    work.appendChild(g);
  }

  /* ---------- 屏 6 迭代交付 ---------- */
  function screenIterate(work) {
    var R = M.R, s = spec(), fus = R.followUps, ch = R.changes, last = ch[ch.length - 1];
    work.classList.add('m11-iterate');
    var g = h('div', { class: 'pd-grid' });
    var list = h('div', { class: 'pd-list m11-follow' }), items = [];
    var ta = h('textarea', { class: 'm11-ta', placeholder: '写一句追加需求，或点上面的例子', oninput: function (e) { M.deltaText = e.target.value; refreshNote(); } }, [M.deltaText || '']);
    var note = h('div'), genBtn;
    function refreshNote() { sh.clear(note); var txt = M.deltaText || ''; if (!txt) return; var pv = K.previewDelta(spec(), txt, LIB); if (pv.delta.mode === 'fallback') note.appendChild(h('div', { class: 'm11-note' }, ['未识别的变更，已按最接近的追加需求「' + K.followUpsOf(LIB, M.arche)[pv.delta.preset].text + '」解析'])); else note.appendChild(h('div', { class: 'm11-chips' }, pv.delta.ops.map(function (o) { return chip(o.type === 'addField' ? 'field' : o.type === 'addState' ? 'flow' : '', '变更', K.deltaText(o, LIB), o.exists ? ['已存在'] : null); }))); }
    fus.forEach(function (f) { var it = P.item({ tone: f.applied ? 'ok' : 'accent', icon: String(f.index + 1), title: f.text, sub: f.types.map(function (t) { return LIB.deltas.types.filter(function (x) { return x.key === t; })[0].name; }).join(' · '), right: f.applied ? '已生成' : ['+' + f.pages + ' 页面', '+' + f.fields + ' 字段', '+' + f.states + ' 节点', '+' + f.tests + ' 用例'].filter(function (x) { return x.charAt(1) !== '0'; }).join(' ') || '无变化', rightSub: f.applied ? '' : '+' + f.apis + ' 接口', onClick: function () { M.deltaText = f.text; ta.value = f.text; items.forEach(function (x) { x.classList.remove('on'); }); it.classList.add('on'); refreshNote(); } }); if (M.deltaText === f.text) it.classList.add('on'); items.push(it); list.appendChild(it); });
    genBtn = P.btn('生成 ' + K.bump(s.version, 'minor'), { cls: 'primary', onClick: function () { var txt = M.deltaText || (fus[0] ? fus[0].text : ''); if (!txt) return; var d = K.applyDelta(M.data, LIB, txt), lr = d.state.lastResult; if (!lr.ok) { P.toast(M.frame.body, lr.error); return; } M.deltaText = ''; M.revealed.test = false; commit(d, lr.msg); } });
    refreshNote();
    g.appendChild(P.card({ cls: 'c12', title: '追加需求', sub: '只认六种变更：新增节点 · 新增字段 · 看板维度 · 提醒规则 · 校验 · 角色 · 存量数据不动', extra: genBtn, body: [h('div', { class: 'pd-grid' }, [h('div', { class: 'c7' }, [list]), h('div', { class: 'c5' }, [ta, h('div', { style: 'margin-top:8px' }, [note])])])] }));
    var left = col('c5', []), right = col('c7', []);
    // 手机：直接落在新页面
    var el;
    if (last && last.items.some(function (i) { return i.type === 'addState' && s.pages.some(function (p) { return p.kind === 'rate'; }); })) { var rows = rt().rows.filter(function (r) { return s.transitions.some(function (t) { return t.from === r.status && t.actionEn === 'rate'; }); }); el = renderPage('rate', { row: rows[0], tabs: roleTabs('submitter', function () { }) }); }
    else if (last && last.items.some(function (i) { return i.type === 'addStat'; })) el = renderPage('board', { tabs: roleTabs('lead', function () { }) });
    else if (last && last.items.some(function (i) { return i.type === 'addRule'; })) { var fl = {}; R.stats.flagged.forEach(function (f) { fl[f.id] = f.text; }); var ov = {}; R.stats.overdue.forEach(function (o) { ov[o.id] = o.text; }); el = renderPage('list', { rows: K.query(s, rt(), actor('handler'), 'list'), flags: fl, overdue: ov, tabs: roleTabs('handler', function () { }) }); }
    else { var nk = last ? last.items.filter(function (i) { return i.type === 'addField' || i.type === 'addValidation'; }).map(function (i) { return i.content; }) : []; el = renderPage('form', { values: K.exampleValues(s, K.formFields(s), LIB, 0), newKeys: s.fields.filter(function (f) { return f.source === '需求追加' || nk.some(function (c) { return c.indexOf(f.label) >= 0; }); }).map(function (f) { return f.key; }), tabs: roleTabs('submitter', function () { }) }); }
    left.appendChild(P.card({ title: '手机 · ' + (last ? last.to + ' 新页面' : s.version), sub: last ? '追加变更后手机直接落在改动处' : '生成新版本后这里直接落在新页面', body: [phoneWrap(el, 0.84)] }));
    if (last && R.diff) {
      var a = R.diff.before, b = R.diff.after;
      var rowsOf = function (x, old) { return [{ k: '页面', v: x.pages + (old ? '' : '') }, { k: '字段', v: String(x.fields) }, { k: '流程节点', v: String(x.states) }, { k: '接口', v: String(x.apis) }, { k: '用例', v: String(x.tests) }, { k: '旧用例回归', v: old ? '—' : last.oldPassed + ' / ' + last.oldTests, tone: old ? '' : 'ok' }]; };
      var cmp = P.compare({ options: [{ key: 'A', name: last.from + ' · 当前线上', headline: { big: a.pages + ' 页', sub: a.fields + ' 字段' }, rows: rowsOf(a, true) }, { key: 'B', name: last.to + ' · 新版本', recommended: true, headline: { big: b.pages + ' 页', sub: b.fields + ' 字段', tone: 'ok' }, rows: rowsOf(b, false), notes: '用例 ' + last.passed + ' / ' + last.tests + ' 通过 · ' + (R.env === 'live' ? '已上线' : '待发布') }], active: 'B' });
      cmp.style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';
      var bt = P.table({ compact: true, cols: [{ key: 'n', label: '#', w: '32px' }, { key: 'typeName', label: '类型', w: '92px', render: function (r) { return P.chip('handled', r.typeName, true); } }, { key: 'content', label: '内容' }, { key: 'pages', label: '影响页面', render: function (r) { return r.pages.join(' · ') || '—'; } }, { key: 'apis', label: '新增接口', render: function (r) { return r.apis.length ? r.apis.map(function (p) { return p.replace('/api/', ''); }).join(' · ') : '—'; } }, { key: 'tests', label: '用例', align: 'right', render: function (r) { return '+' + r.tests; } }], rows: last.items });
      right.appendChild(P.card({ title: last.from + ' → ' + last.to, sub: '变更清单 ' + last.id + ' · ' + last.items.length + ' 项', body: [cmp, h('div', { style: 'margin-top:12px' }, [bt]), h('div', { style: 'margin-top:12px' }, [P.kv([['存量数据', last.stock.rows + ' 条 · 新字段置空'], ['可补填', last.stock.newFields.length ? last.stock.fillable + ' 条' + last.stock.terminalLabel + '的可补' + last.stock.newFields.join(' / ') : '无新字段'], ['旧用例', last.oldPassed + ' / ' + last.oldTests + ' 仍通过']])])] }));
    } else right.appendChild(P.card({ title: '版本对比', sub: '追加需求生成新版本后，这里出现两版对比与变更清单', body: [P.empty('选一条追加需求，或直接写一句 · 点「生成 ' + K.bump(s.version, 'minor') + '」')] }));
    g.appendChild(left); g.appendChild(right);
    // 交付栏
    var dv = h('div', { class: 'm11-deliver' });
    R.deliverables.forEach(function (x) { dv.appendChild(h('span', { class: 'dv' }, [h('span', { class: 't' }, [x.name + ' ' + x.no]), h('span', { class: 's' }, [x.count + ' · ', h('b', {}, [x.status])])])); });
    dv.appendChild(h('span', { class: 'sp' }));
    dv.appendChild(P.btn('交付报告', { onClick: function () { var rp = M.R.report; var who = h('div', { class: 'who', style: 'display:flex;gap:6px;flex-wrap:wrap' }); rp.recipients.split(' · ').forEach(function (r) { who.appendChild(P.chip('handled', r, true)); }); P.drawer(M.frame.body, { title: '交付报告 ' + rp.no, sub: '微信文本版', body: [h('div', { class: 'pd-field' }, [h('label', {}, ['收件人']), who]), h('div', { class: 'pd-pre', style: 'margin-top:10px' }, [rp.text])] }); } }));
    dv.appendChild(P.btn(M.data.state.sent ? '再发一次' : '发送到微信', { cls: 'primary', onClick: function () { M.data = K.sendReport(M.data, LIB); recompute(); sh.setQrReady(true); sh.showWeChat(); draw(); P.toast(M.frame.body, '交付报告已发送 · ' + M.R.report.recipients); } }));
    g.appendChild(P.card({ cls: 'c12', title: '交付', sub: R.deliverables.length + ' 项产物全部已生成 · 随版本自动更新', body: [dv] }));
    work.appendChild(g);
  }

  window.DGG.registerModule('m11', { mount: mount, unmount: unmount, onCompany: onCompany, onIndustry: onIndustry });
})();
