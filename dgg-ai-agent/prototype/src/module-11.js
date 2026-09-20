/* AI软件开发 · 一句需求变可点页面（六屏）
 * 接入（需求句解析 · 主数据关联）→ 生成应用（页面逐条点亮 · 手机同步渲染 · 推荐字段写回）→ 试用（三角色走单 · PC 看板联动）
 * → 测试与产物（用例逐行执行 · 权限矩阵 · 数据字典 / 接口 / 主数据关联）→ 发布（发布前检查 · 流水 · 屏内二维码）→ 迭代交付（追加需求 → 六种变更 → V1.1.0 · 交付清单 · 发微信）
 * 全部计算走 DGG.coreM11（与 skill 同一份内核）；每个动作都写回同一份数据副本；纯预制、断网可用；不用任何存储 API
 * 对话与文档摄入也在同一份内核里（screens / brief / suggest / ask / ingest），本文件在 DGG.chatBrain('m11') 上只登记
 * ctx（交出当前数据）与 act（把内核给的声明式动作 goto / focus / open / apply / set 落到这六屏上）
 */
(function () {
  'use strict';
  var sh, $root, h, DATA, P, K, LIB;
  var ACCENT = window.DGG.PALETTE.m11;
  var STEPS = ['connect', 'build', 'try', 'test', 'ship', 'iterate'];
  var TYPE_LABEL = { object: '业务对象', role: '角色', action: '动作', channel: '渠道', field: '字段', qty: '时限', time: '时限', stat: '统计', delta: '变更' };
  var M = { step: 'connect', arche: null, data: null, R: null, charged: false, name: null, company: null, frame: null, lastStep: null, role: null, page: null, rowId: null, formVals: null, formErr: null, timers: [], deltaText: '', drawer: null, pipeStage: null, told: null, replay: null, newKey: null, newPerm: null };

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
  /* ---------- 叙事件：滚动数字 · 接入带 · 结论横幅 ---------- */
  function A() { return window.DGG.anim; }
  function nodes(scope, sel) { return scope ? Array.prototype.slice.call(scope.querySelectorAll(sel)) : []; }
  function trs(el, n) { var l = el ? Array.prototype.slice.call(el.querySelectorAll('tbody tr')) : []; return n ? l.slice(0, n) : l; }
  /* 给表格行标上业务 id，内核的 {type:'focus', ref} 就能找到它 */
  function tagRefs(tbl, rows, refOf) { trs(tbl).forEach(function (tr, i) { if (rows[i]) tr.setAttribute('data-ref', refOf(rows[i])); }); }
  function workEl() { return M.frame ? M.frame.work : null; }
  function cnt(to, o) { o = o || {}; var dec = o.dec || 0; return h('b', { class: 'm11-cnt num', 'data-to': String(to), 'data-dec': String(dec), 'data-suf': o.suf || '' }, [dec ? (0).toFixed(dec) : '0']); }
  function resetCounts(scope) { nodes(scope, '.m11-cnt').forEach(function (e) { var d = +e.getAttribute('data-dec') || 0; e.textContent = d ? (0).toFixed(d) : '0'; }); }
  function runCounts(scope, ms) { nodes(scope, '.m11-cnt').forEach(function (e) { A().count(e, parseFloat(e.getAttribute('data-to')) || 0, { decimals: +e.getAttribute('data-dec') || 0, unit: e.getAttribute('data-suf') || '', ms: ms || 900 }); }); }
  function vd(text, extra) { return h('div', { class: 'c12 m11-say off' }, [h('span', { class: 'ic' }, ['AI']), h('b', {}, [].concat(text)), h('span', { class: 'sp' })].concat(extra || [])); }
  function flowBar(o) {
    var srcWrap = h('div', { class: 'src' }, o.src.map(function (x) { return h('div', { class: 's' + (x[2] ? ' ' + x[2] : '') }, [h('b', {}, [x[0]]), h('span', {}, [x[1]])]); }));
    var hub = h('div', { class: 'hub' }, [h('span', { class: 'an-live' }), h('b', {}, [o.hub])]);
    var out = h('div', { class: 'out' });
    var el = h('div', { class: 'c12 m11-flow' }, [srcWrap, h('span', { class: 'pipe an-pipe' }), hub, h('span', { class: 'pipe an-pipe' }), out, h('span', { class: 'sp' }),
      P.btn(o.btn, { cls: 'sm', onClick: function () { if (o.onClick) o.onClick(); else if (M.replay) M.replay(); } })].concat(o.extra || []));
    el.hub = hub; el.out = out; el.srcs = Array.prototype.slice.call(srcWrap.children);
    el.setOut = function (big, sub) { sh.clear(out); out.appendChild(h('b', {}, [].concat(big))); out.appendChild(h('span', {}, [].concat(sub))); };
    el.setOut(o.out[0], o.out[1]);
    return el;
  }
  /* 三拍：接入 0–0.8s（来源亮 · 数据包飞 · 处理块扫描）· 展开 0.8–2.3s（数字滚 · 条形长 · 行流入）· 结论 2.3–2.9s */
  function story(o) {
    function run(full) {
      var An = A(), t0 = full ? 820 : 0, tv = full ? 2300 : 640;
      An.stopAll();
      var rises = (o.rise || []).filter(Boolean);
      rises.forEach(function (n) { n.style.opacity = '0'; });
      if (full) resetCounts(o.work);
      if (o.verdict) { o.verdict.classList.add('off'); o.verdict.classList.remove('an-verdict'); }
      if (o.bars && o.bars.length) An.grow(o.bars, { stagger: full ? 44 : 22, ms: full ? 720 : 460, delay: t0 + 20 });
      if (o.rows && o.rows.length) An.stream(o.rows, { stagger: full ? 64 : 30, delay: t0 });
      if (o.paths && o.paths.length) An.drawSvg(o.paths, full ? 900 : 600, t0 + 60);
      var T = An.timeline();
      if (full) {
        T.at(0, function () { if (o.src && o.src.length) An.rise(o.src, { stagger: 55, from: 'left', ms: 380 }); });
        T.at(190, function () { if (o.from && o.to) An.packet(o.from, o.to, { count: 3, ms: 600, gap: 105, arc: 12, label: o.label }); });
        T.at(540, function () { if (o.to) An.scan(o.to, { ms: 880 }); if (o.scan) An.scan(o.scan, { ms: 1150 }); });
        T.at(680, function () { if (o.to && o.tail) An.packet(o.to, o.tail, { count: 2, ms: 520, gap: 95, arc: 12 }); });
      }
      T.at(t0, function () {
        runCounts(o.work, full ? 900 : 400);
        if (rises.length) An.rise(rises, { stagger: full ? 62 : 28, ms: full ? 440 : 320 });
        if (o.beat2) o.beat2(full);
      });
      T.at(tv, function () {
        if (o.verdict) { o.verdict.classList.remove('off'); o.verdict.classList.add('an-verdict'); }
        if (o.focus) An.pulse(o.focus, { ms: 1500, scroll: false });
      });
      T.play();
    }
    var first = M.told !== M.step;
    M.told = M.step;
    M.replay = function () { run(true); };
    run(first);
  }
  /* 屏上的「重算 / 刷新」：按同一份数据重跑一遍，再把这一屏的时间轴从头放一遍 */
  function recalc() { recompute(); M.told = null; draw(); }
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
  function unmount() { clearTimers(); M.told = null; M.replay = null; }
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
    var F = P.frame({ mark: '开发', accent: ACCENT, modules: P.navModules('m11'), crumbs: ['AI软件开发', tabs.filter(function (t) { return t.key === M.step; })[0].label], company: { name: M.data.company, meta: meta + (meta ? ' · ' : '') + (s ? s.title + ' ' + s.id : '一句需求变可点页面') }, tabs: tabs, active: M.step, chat: { id: 'm11', name: 'AI软件开发', step: M.step, onGo: setStep },
      onTab: function (key) { if (key !== 'connect' && !M.charged) { enterBuild(); if (key !== 'build') setStep(key); } else setStep(key); } });
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
    else if (f.type === 'photo') ctl = h('div', { class: 'photo', 'data-key': f.key, 'data-val': String(v === '' ? 0 : v) }, [h('span', { class: 'ic' }, ['📷']), (Number(v) > 0 ? '已拍 ' + v + ' 张' : '拍照上传') + ' · 上限 ' + (f.max || 3) + ' 张']);
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
      return h('div', { class: 'row' + (M.rowId === r.id ? ' on' : ''), 'data-ref': r.id, onclick: o.onPick ? function () { o.onPick(r); } : null }, [
        h('div', { class: 't' }, [h('span', {}, [rowTitle(r)]), r.createdAt >= rt().clock - 30 && r.status === K.initialState(s) ? h('span', { class: 'new' }, ['新']) : null, flag ? h('span', { class: 'flag' }, [flag]) : null]),
        h('div', { class: 's' }, [r.id + ' · ' + r.createdBy.id + ' · ' + K.fmtMin(r.createdAt) + (ov ? ' · ' + ov : '')]),
        h('div', { class: 'r' }, [statusChip(r.status), h('span', {}, [r.status === K.initialState(s) ? '已等待 ' + waited(rt().clock - r.createdAt) : (r.assignee || '')])])
      ]);
    });
  }
  function detailPage(row, o) {
    o = o || {};
    var s = spec(), a = o.as ? actor(o.as, o.alt) : (M.role ? actor(M.role) : null);
    var isNew = function (key) { return !!(o.newKeys && o.newKeys.indexOf(key) >= 0); };
    var kv = h('div', { class: 'kv' });
    s.fields.forEach(function (f) { var v = row.values[f.key]; if (v == null || v === '' || (f.type === 'photo' && !(v > 0))) return; kv.appendChild(h('span', { class: 'k' }, [f.label])); kv.appendChild(h('span', { class: 'v' }, [f.type === 'photo' ? '已拍 ' + v + ' 张' : f.type === 'money' ? fmtN(v) + ' 元' : String(v)])); });
    var trail = h('div', { class: 'trail' });
    s.states.forEach(function (st, i) { var hh = row.history.filter(function (x) { return x.to === st.key; })[0]; var done = !!hh, on = row.status === st.key; trail.appendChild(h('div', { class: 'n' + (done && !on ? ' done' : on ? ' on' : '') }, [h('i', {}, [String(i + 1)]), h('span', {}, [st.label + (hh ? ' · ' + hh.role + ' ' + hh.by : '')]), h('span', { class: 'w' }, [hh ? K.fmtMin(hh.atMin) : ''])])); });
    var acts = h('div', { class: 'acts' });
    var trs = a ? s.transitions.filter(function (t) { return t.from === row.status && t.by.indexOf(a.slot) >= 0 && (t.scope !== 'assignee' || !row.assignee || row.assignee === a.id); }) : [];
    var seen = {};
    trs.forEach(function (t) { if (seen[t.actionEn]) return; seen[t.actionEn] = 1; var stage = K.stageFields(s, t.actionEn).filter(function (f) { return !(f.type === 'member' && f.auto); }); var sv = Object.assign(K.exampleValues(s, stage, LIB, 0), presetStage(t.actionEn)); var box = h('div', { class: 'card', style: 'padding:0;gap:6px' }, stage.map(function (f) { return fieldControl(f, sv[f.key], (M.formErr && M.formErr.action === t.actionEn && M.formErr.map[f.key]) || null, isNew(f.key)); })); acts.appendChild(box); acts.appendChild(h('button', { class: 'btn' + (t.to === K.initialState(s) ? ' sec' : ''), onclick: function () { o.onAction(t, Object.assign({}, sv, readForm(box))); } }, [t.action])); });
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
    if (pg.kind === 'detail') return phone({ title: pg.name, back: o.back, body: o.row ? detailPage(o.row, { onAction: o.onAction, newKeys: o.newKeys, as: o.as, alt: o.alt }) : [h('div', { class: 'card' }, [h('div', { class: 'sub' }, ['从待办里点开一条'])])], tabs: o.tabs });
    if (pg.kind === 'board') return phone({ title: pg.name, body: boardMini(), tabs: o.tabs });
    if (pg.kind === 'admin') return phone({ title: pg.name, body: adminPage(), tabs: o.tabs });
    if (pg.kind === 'rate') return phone({ title: pg.name, body: ratePage(o.row, o.onSubmit), tabs: o.tabs });
    return phone({ title: pg.name, body: [], tabs: o.tabs });
  }

  /* 详情预览：挑一条当前真有动作可做的记录与对应角色；新字段在哪一步填，就落在那一步的表单上 */
  function detailPreview(newKey) {
    var s = spec(), rows = (rt() ? rt().rows : []), hit = null, want = null;
    if (newKey) { var nf = s.fields.filter(function (f) { return f.key === newKey; })[0]; want = nf ? nf.at : null; }
    function scan(stage) {
      s.transitions.forEach(function (t) {
        if (hit || (stage && t.actionEn !== stage)) return;
        t.by.forEach(function (slot) {
          [false, true].forEach(function (alt) {
            if (hit) return;
            var a = actor(slot, alt); if (!a) return;
            rows.forEach(function (r) {
              if (hit || r.status !== t.from) return;
              if (t.scope === 'assignee' && r.assignee && r.assignee !== a.id) return;
              hit = { row: r, as: slot, alt: alt };
            });
          });
        });
      });
    }
    if (want) scan(want);
    if (!hit) scan(null);
    if (!hit) hit = { row: rows.filter(function (r) { return r.status !== K.initialState(s); })[0] || rows[0] || null, as: null, alt: false };
    return hit;
  }

  /* ---------- 屏 1 接入 ---------- */
  function chip(cls, k, v, hits) { return h('span', { class: 'm11-chip ' + cls }, [h('span', { class: 'k' }, [k]), h('span', { class: 'v' }, [v]), hits && hits.length ? h('span', { class: 'h' }, ['「' + hits.slice(0, 2).join('」「') + '」']) : null]); }
  function parseChips(pr) {
    var box = h('div', { class: 'm11-chips' });
    box.appendChild(chip('obj', TYPE_LABEL.object, pr.objectName, pr.objectHits));
    pr.roles.forEach(function (r) { box.appendChild(chip('role', TYPE_LABEL.role, r.title + (r.emp ? ' ' + r.emp : ''), r.hit ? [pr.evidence.filter(function (e) { return e.type === 'role' && e.canon === r.hit; }).map(function (e) { return e.surface; })[0] || r.hit] : null)); });
    box.appendChild(chip('flow', '流程模板', pr.flowName + (pr.flowModeName ? ' · ' + pr.flowModeName : ''), pr.evidence.filter(function (e) { return e.type === 'action'; }).map(function (e) { return e.surface; }).slice(0, 3)));
    pr.channels.forEach(function (c) { box.appendChild(chip('', TYPE_LABEL.channel, c.name, c.hits)); });
    pr.extraFields.forEach(function (k) { var f = K.objOf(LIB, pr.object).optional.filter(function (x) { return x.key === k; })[0]; if (f) box.appendChild(chip('field', '加字段', f.label, pr.evidence.filter(function (e) { return e.type === 'field' && e.key === k; }).map(function (e) { return e.surface; }))); });
    if (pr.sla) box.appendChild(chip('field', TYPE_LABEL.time, '约定 ' + pr.sla.n + ' ' + pr.sla.unit, pr.evidence.filter(function (e) { return e.type === 'time' || e.type === 'qty'; }).map(function (e) { return e.surface; })));
    return box;
  }
  function connectLine(p, v) { return p.objectName + ' ' + v.pages + ' 页 ' + v.fields + ' 字段 ' + v.roles + ' 角色 ' + v.states + ' 节点，命中 ' + p.hits + ' 词、未识别 ' + p.unknown + '。'; }
  function screenConnect(work) {
    var R = M.R, d = M.data, pr = R.parsed, pv0 = R.preview || R.kpi;
    work.classList.add('m11-connect');
    var g = h('div', { class: 'pd-grid' });
    var refKeys = ['machines', 'employees', 'customers'].filter(function (k) { return R.refs[k]; });
    var total = refKeys.reduce(function (a, k) { return a + R.refs[k].count; }, 0);
    var fb = flowBar({ src: refKeys.map(function (k) { return [R.refs[k].name, fmtN(R.refs[k].count) + ' ' + R.refs[k].unit]; }),
      hub: '需求句解析', out: [pr.objectName, [cnt(pv0.pages, { suf: ' 页' }), ' · ', cnt(pv0.fields, { suf: ' 字段' })]],
      btn: '重新解析', onClick: recalc });
    g.appendChild(fb);
    var nameIn = h('input', { type: 'text', value: d.company, oninput: function (e) { M.name = e.target.value; d.company = e.target.value; var co = M.frame.root.querySelector('.pd-top .co span:nth-child(2)'); if (co) co.textContent = e.target.value; } });
    var srcs = h('div');
    refKeys.forEach(function (k) {
      var x = R.refs[k];
      srcs.appendChild(h('div', { class: 'src-row' }, [
        h('div', {}, [h('div', { class: 't' }, [x.name + ' ' + fmtN(x.count) + ' ' + x.unit]), h('div', { class: 's' }, [x.system + ' · ' + x.syncAt]), h('div', { class: 'ids' }, [x.sample.slice(0, 4).join(' · ')])]),
        P.chip(x.mode === 'direct' ? 'ok' : 'watch', x.mode === 'direct' ? '系统直连' : '表格导入'),
        h('span', { class: 'pd-dot ' + (x.mode === 'direct' ? 'ok' : 'risk') })]));
    });
    var conn = [h('div', { class: 'pd-form' }, [h('div', { class: 'pd-field' }, [h('label', {}, ['企业名称']), nameIn]), h('div', { class: 'pd-field' }, [h('label', {}, ['行业']), h('div', { style: 'font-weight:600' }, [M.company ? sh.industryNameOf(M.company.industry) + (M.company.size ? ' · ' + sh.optText('size', M.company.size) : '') : sh.industryNameOf(sh.displayIndustryDefault())])])]), h('div', { style: 'margin-top:8px' }, [srcs])];
    var req = h('div', { class: 'm11-req' }), list = h('div', { class: 'pd-list' });
    R.presets.forEach(function (p) {
      var it = P.item({ tone: p.active ? 'accent' : 'hand', icon: String(p.index + 1), title: p.text, sub: p.objectName + ' · ' + p.flowName, right: p.summary.pages + ' 页 · ' + p.summary.fields + ' 字段', rightSub: p.summary.roles + ' 角色 · ' + p.summary.states + ' 节点',
        onClick: function () { M.told = null; M.data = K.pickPreset(M.data, LIB, p.index); recompute(); draw(); } });
      if (p.active) it.classList.add('on');
      list.appendChild(it);
    });
    req.appendChild(list);
    var chipsBox = h('div'), metaBox = h('div', { class: 'meta' });
    var ta = h('textarea', { class: 'm11-ta', oninput: function (e) { M.data = K.setText(M.data, LIB, e.target.value); recompute(); refresh(true); } }, [R.text]);
    req.appendChild(ta); req.appendChild(chipsBox); req.appendChild(metaBox);
    var sayT = h('b', {});
    var say = h('div', { class: 'c12 m11-say m11-go off' }, [h('span', { class: 'ic' }, ['AI']), sayT, h('span', { class: 'sp' }),
      h('span', { class: 'cr' }, [h('b', { class: 'num' }, [String(K.CREDITS)]), ' 积分 / 次']), P.btn('生成应用', { cls: 'primary big', onClick: enterBuild })]);
    function refresh(live) {
      var Rr = M.R, p = Rr.parsed, v = Rr.preview || Rr.kpi;
      sh.clear(chipsBox);
      if (p.mode === 'fallback') chipsBox.appendChild(h('div', { class: 'm11-note', style: 'margin-bottom:8px' }, ['未识别到业务对象，按相近的一条解析']));
      chipsBox.appendChild(parseChips(p));
      sh.clear(metaBox);
      metaBox.appendChild(h('span', {}, ['需求解析单 ' + K.IDS.req]));
      metaBox.appendChild(P.chip('ok', '已识别', true));
      metaBox.appendChild(h('span', {}, ['命中 ' + p.hits + ' 词 · 未识别 ' + p.unknown]));
      sayT.textContent = connectLine(p, v);
      if (live) { fb.setOut(p.objectName, v.pages + ' 页 · ' + v.fields + ' 字段'); }
    }
    refresh(false);
    g.appendChild(say);
    g.appendChild(P.card({ cls: 'c4', title: '企业与主数据', body: conn }));
    g.appendChild(P.card({ cls: 'c8', title: '一句需求', body: [req] }));
    work.appendChild(g);
    story({ work: work, src: fb.srcs, from: fb.srcs[0], to: fb.hub, tail: fb.out, label: fmtN(total) + ' 条',
      rise: nodes(work, '.src-row').concat(nodes(work, '.m11-req .pd-item')).concat(nodes(work, '.m11-chip')),
      verdict: say, focus: work.querySelector('.m11-chip.obj') });
  }
  /* ---------- 屏 2 生成应用 ---------- */
  function judgeDrawer() {
    var R = M.R, s = spec(), pr = R.parsed, obj = K.objOf(LIB, s.objectKey);
    var seen = ['需求句命中 ' + pr.hits + ' 词 · 未识别 ' + pr.unknown + '（' + pr.evidence.map(function (e) { return e.surface; }).slice(0, 8).join('、') + '）', '对象库 ' + obj.name + ' ' + obj.fields.length + ' 字段 · 可选 ' + obj.optional.length, '流程模板 ' + pr.flowName + (pr.flowModeName ? '（' + pr.flowModeName + '）' : '') + ' · 签名匹配 ' + pr.lcs[0].lcs + ' 个动作'].concat(s.integrations.map(function (i) { return i.name + ' ' + i.rows + ' ' + i.unit + '（' + i.system + '）'; }));
    var ev = P.table({ compact: true, cols: [{ key: 'type', label: '类型', w: '70px', render: function (r) { return TYPE_LABEL[r.type] || r.type; } }, { key: 'surface', label: '识别词' }, { key: 'canon', label: '映射', render: function (r) { return r.canon + (r.slot ? ' · ' + r.slot : '') + (r.neg ? ' · 否定' : ''); } }], rows: pr.evidence });
    var ft = P.table({ compact: true, cols: [{ key: 'label', label: '字段' }, { key: 'type', label: '类型', render: function (r) { return LIB.components.controls[r.type].name; } }, { key: 'required', label: '必填', render: function (r) { return r.required ? '是' : ''; } }, { key: 'rule', label: '校验', render: function (r) { return r.len ? '≤ ' + r.len + ' 字' : r.min != null || r.max != null ? (r.min != null ? r.min : '') + '–' + (r.max != null ? r.max : '') : r.options ? r.options.length + ' 选 1' : r.ref ? '主数据' : r.at ? '在「' + (s.transitions.filter(function (t) { return t.actionEn === r.at; })[0] || { action: r.at }).action + '」时填' : ''; } }, { key: 'source', label: '来源' }], rows: s.fields });
    P.drawer(M.frame.body, { title: '怎么生成的', sub: s.reqNo + ' → ' + s.specNo + ' ' + s.specVer + ' → ' + s.id, body: [P.judge({ verdict: { tone: 'ok', chip: '已生成', text: s.title + ' · ' + s.pages.length + ' 页 · ' + s.fields.length + ' 字段' }, seen: seen, reasons: K.RULES }), h('div', { class: 'pd-card' }, [h('div', { class: 'hd' }, [h('div', { class: 't' }, ['需求解析单 ' + s.reqNo])]), h('div', { class: 'bd tight' }, [ev])]), h('div', { class: 'pd-card' }, [h('div', { class: 'hd' }, [h('div', { class: 't' }, ['字段设计表 · 应用规格 ' + s.specNo + ' ' + s.specVer])]), h('div', { class: 'bd tight' }, [ft])])] });
  }
  function addRecField(f) {
    M.page = f.at ? 'detail' : 'form'; M.newKey = f.key;
    M.data = K.addField(M.data, LIB, f.key); recompute(); draw();
    if (M.frame) P.toast(M.frame.body, spec().specNo + ' ' + spec().specVer + ' · 新增字段 ' + f.label + ' · 用例 ' + M.R.kpi.tests + ' 条');
  }
  function screenBuild(work) {
    var R = M.R, s = spec(), k = R.kpi;
    work.classList.add('m11-build');
    var phoneN = R.pages.filter(function (p) { return p.device === 'phone'; }).length, pcN = R.pages.length - phoneN;
    var reqN = s.fields.filter(function (f) { return f.required; }).length;
    var g = h('div', { class: 'pd-grid' });
    var fb = flowBar({ src: [[s.reqNo, R.parsed.hits + ' 词'], [K.objOf(LIB, s.objectKey).name, s.fields.length + ' 字段'], [s.flow.name, s.states.length + ' 节点']],
      hub: s.specNo + ' ' + s.specVer, out: [s.id + ' ' + s.version, [cnt(k.pages, { suf: ' 页' }), ' · ', cnt(k.fields, { suf: ' 字段' })]],
      btn: '刷新预览', onClick: recalc });
    g.appendChild(fb);
    var say = vd('手机 ' + phoneN + ' 页、PC ' + pcN + ' 页；' + k.fields + ' 字段里必填 ' + reqN + '，接口 ' + k.apis + ' 个、用例 ' + k.tests + ' 条随规格一起生成。');
    g.appendChild(say);
    var kpiRow = h('div', { class: 'c12' }, [P.kpis([
      { label: '页面', value: cnt(k.pages), unit: '页', tone: 'accent' },
      { label: '字段', value: cnt(k.fields), unit: '个' },
      { label: '角色', value: cnt(k.roles), unit: '个' },
      { label: '流程节点', value: cnt(k.states), unit: '个' },
      { label: '接口', value: cnt(k.apis), unit: '个' },
      { label: '用例', value: cnt(k.tests), unit: '条', onClick: function () { setStep('test'); } }])]);
    g.appendChild(kpiRow);
    var left = col('c7', []), right = col('c5', []);
    var pagesBox = h('div', { class: 'pd-list m11-pages' }), items = [];
    if (!M.page) M.page = 'form';
    R.pages.forEach(function (p) {
      var it = P.item({ tone: p.device === 'phone' ? 'accent' : 'hand', icon: p.device === 'phone' ? '机' : 'PC', title: p.n + ' ' + p.name, sub: p.deviceName + ' · ' + p.roles.join(' / ') + (p.fieldCount ? ' · ' + p.fieldCount + ' 字段' : ''), right: p.kindName,
        onClick: function () { clearTimers(); M.page = p.key; items.forEach(function (x) { x.classList.remove('on'); }); it.classList.add('on'); drawPhone(); } });
      if (p.key === M.page) it.classList.add('on');
      items.push(it); pagesBox.appendChild(it);
    });
    var rec = h('div', { class: 'm11-rec' });
    R.recommended.forEach(function (f) { rec.appendChild(h('button', { onclick: function () { addRecField(f); } }, ['+ ' + f.label])); });
    left.appendChild(P.card({ title: '页面清单', sub: s.states.map(function (x) { return x.label; }).join(' → '), body: [pagesBox], foot: R.recommended.length ? [h('div', { style: 'width:100%;display:flex;gap:10px;align-items:center;flex-wrap:wrap' }, [h('span', { style: 'color:var(--pd-sub)' }, ['推荐字段']), rec])] : null }));
    var phoneBox = h('div');
    function drawPhone() {
      sh.clear(phoneBox);
      var nk = M.newKey ? [M.newKey] : null;
      var dv = M.page === 'detail' ? detailPreview(M.newKey) : null;
      phoneBox.appendChild(phoneWrap(renderPage(M.page, { newKeys: nk,
        rows: M.page === 'list' ? K.query(spec(), rt(), actor('handler'), 'list') : M.page === 'mine' ? K.query(spec(), rt(), actor('submitter'), 'mine') : [],
        row: dv ? dv.row : null, as: dv ? dv.as : null, alt: dv ? dv.alt : false, onAction: function () { }, tabs: null }), 0.685));
    }
    drawPhone();
    right.appendChild(P.card({ title: '手机 · ' + s.channels[0].name, extra: P.btn('怎么生成的', { cls: 'sm', onClick: judgeDrawer }), body: [phoneBox] }));
    g.appendChild(left); g.appendChild(right);
    work.appendChild(g);
    function revealPages() {
      items.forEach(function (it, i) {
        later(function () {
          items.forEach(function (x) { x.classList.remove('on'); });
          it.classList.add('on'); M.page = R.pages[i].key; drawPhone();
          if (i === items.length - 1) later(function () { items.forEach(function (x) { x.classList.remove('on'); }); items[0].classList.add('on'); M.page = R.pages[0].key; drawPhone(); }, 240); }, 120 * i);
      });
    }
    story({ work: work, src: fb.srcs, from: fb.srcs[0], to: fb.hub, tail: fb.out, label: s.specNo, scan: phoneBox,
      rise: nodes(work, '.m11-pages .pd-item').concat(nodes(work, '.m11-rec button')),
      verdict: say, focus: kpiRow.querySelectorAll('.pd-kpi')[0],
      beat2: function (full) { if (full) revealPages(); } });
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
    var openLabel = K.stateLabel(s, K.initialState(s));
    var g = h('div', { class: 'pd-grid' });
    var nextBtn = P.btn(R.scriptStep >= R.script.length ? '脚本已走完' : '下一步 · ' + R.script[R.scriptStep].label, { cls: 'primary sm', disabled: R.scriptStep >= R.script.length, onClick: doNextScript });
    var fb = flowBar({ src: R.script.map(function (sc, i) { return [sc.actor.title + (sc.actor.emp ? ' ' + sc.actor.emp : ''), sc.label, i < R.scriptStep ? 'done' : i === R.scriptStep ? 'on' : '']; }),
      hub: '沙箱 ' + st.clockText, out: [s.short + ' ' + st.total + ' 条', [cnt(st.open, { suf: ' ' + openLabel }), ' · ', cnt(st.overdueN, { suf: ' 超时' })]],
      btn: '刷新看板', onClick: recalc, extra: [nextBtn] });
    g.appendChild(fb);
    var ov0 = st.overdue[0], ovRow = ov0 ? rt().rows.filter(function (r) { return r.id === ov0.id; })[0] : null;
    var say = vd(ov0 ? (ov0.id + ' 已等 ' + waited(rt().clock - (ovRow ? ovRow.createdAt : rt().clock)) + '，' + ov0.text + '；' + openLabel + '还有 ' + st.open + ' 单。')
      : (openLabel + ' ' + st.open + ' 单，平均' + st.acceptLabel + ' ' + (st.avgAcceptMin == null ? '—' : st.avgAcceptMin + ' 分') + '，没有超时单。'));
    g.appendChild(say);
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
      phoneBox.appendChild(phoneWrap(el, 0.68));
    }
    drawPhone();
    left.appendChild(P.card({ title: '手机 · 按角色试用', sub: s.states.map(function (x) { return x.label; }).join(' → '), body: [seg, h('div', { style: 'margin-top:10px' }, [phoneBox])] }));
    var urgentF = s.fields.filter(function (f) { return f.type === 'select' && (f.key === 'urgency' || f.key === 'level'); })[0];
    var hot = rt().rows.filter(function (r) { return st.overdue.some(function (o) { return o.id === r.id; }) || (urgentF && ['紧急', '停机', '高', '重大', '严重'].indexOf(r.values[urgentF.key]) >= 0 && !s.states.filter(function (x) { return x.key === r.status; })[0].terminal); });
    if (!hot.length) hot = rt().rows.filter(function (r) { return r.status === K.initialState(s); });
    var ovMap = {}; st.overdue.forEach(function (o) { ovMap[o.id] = o; });
    var tbl = P.table({ compact: true, cols: [{ key: 'id', label: '编号', w: '104px', render: function (r) { return h('b', { class: 'id' }, [r.id]); } }, { key: 'sum', label: s.short, render: function (r) { return rowTitle(r); } }, { key: 'status', label: '状态', w: '78px', render: function (r) { return statusChip(r.status); } }, { key: 'assignee', label: '处理人', w: '68px', render: function (r) { return r.assignee || '—'; } }, { key: 'w', label: '已等待', align: 'right', w: '92px', render: function (r) { return ovMap[r.id] ? h('span', { class: 'neg' }, [waited(rt().clock - r.createdAt)]) : (s.states.filter(function (x) { return x.key === r.status; })[0].terminal ? '—' : waited(rt().clock - r.createdAt)); } }], rows: hot.slice(0, 4), rowKey: function (r) { return r.id; }, activeKey: M.rowId, empty: '没有超时或紧急的' + s.short });
    tagRefs(tbl, hot.slice(0, 4), function (r) { return r.id; });
    var hist = []; rt().rows.forEach(function (r) { r.history.forEach(function (x) { hist.push({ at: x.atMin, role: x.role, action: x.action, id: r.id, to: K.stateLabel(s, x.to) }); }); }); hist.sort(function (a, b) { return b.at - a.at; });
    var pcKpis = P.kpis([{ label: '今日' + s.verb, value: st.todayNew, unit: '单', sub: '记录 ' + st.total }, { label: openLabel, value: st.open, unit: '单', tone: st.open > 2 ? 'risk' : 'ok', sub: '处理中 ' + st.doing }, { label: '处理中', value: st.doing, unit: '单', sub: '在办' }, { label: '已完成', value: st.done, unit: '单', tone: 'ok', sub: '今日 ' + st.todayDone }, { label: '平均' + st.acceptLabel, value: st.avgAcceptMin == null ? '—' : st.avgAcceptMin, unit: '分', tone: st.slaHours && st.avgAcceptMin > st.slaHours * 60 ? 'late' : 'ok', sub: st.slaHours ? '约定 ' + st.slaHours + ' 小时' : '' }, { label: '超时', value: st.overdueN, unit: '单', tone: st.overdueN ? 'late' : 'ok', sub: '约定内 ' + (st.total - st.overdueN) }]);
    var distEl = P.dist({ rows: st.byStatus.map(function (x) { return { label: x.label, value: x.n, text: String(x.n), hi: x.key === K.initialState(s) }; }) });
    var pc = h('div', { class: 'm11-pc' }, [h('div', { class: 'chrome' }, [h('i'), h('i'), h('i'), h('span', { class: 'url' }, [LIB.qrBase + '/' + s.table + '/board']), h('span', {}, [K.roleTitle(s, 'lead')])]), h('div', { class: 'bd' }, [
      pcKpis,
      h('div', { class: 'pd-grid' }, [h('div', { class: 'c4' }, [P.card({ title: '状态分布', tight: false, body: [distEl] })]), h('div', { class: 'c8' }, [P.card({ title: '超时与紧急', sub: hot.length + ' 单', tight: true, body: [tbl] })])])
    ])]);
    right.appendChild(P.card({ title: s.pages.filter(function (p) { return p.kind === 'board'; })[0].name + ' · PC', sub: K.roleTitle(s, 'lead') + '视角', body: [pc], foot: [hist.length + ' 条动作 · ' + (hist[0] ? hist[0].role + ' ' + hist[0].action + ' ' + hist[0].id + ' → ' + hist[0].to + ' · ' + K.fmtMin(hist[0].at) : '还没有动作')] }));
    g.appendChild(left); g.appendChild(right);
    work.appendChild(g);
    story({ work: work, src: fb.srcs, from: phoneBox, to: fb.hub, tail: pc, label: s.short, scan: pc,
      bars: nodes(work, '.pd-dist .trk i').concat(nodes(work, '.m11-phone .dist .trk i')),
      rows: trs(tbl), rise: nodes(work, '.m11-seg button').concat(nodes(work, '.m11-pc .pd-kpi')),
      verdict: say, focus: ov0 ? rowOf(work, ov0.id) : null });
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
  function dictDrawer() { var R = M.R, sc = R.schema; P.drawer(M.frame.body, { title: '数据字典 · ' + sc.table, sub: sc.name + ' · ' + sc.columns.length + ' 列 · ' + sc.indexes.length + ' 个索引', body: [P.table({ compact: true, cols: [{ key: 'label', label: '字段' }, { key: 'col', label: '列名' }, { key: 'type', label: '类型' }, { key: 'required', label: '必填', render: function (r) { return r.required ? '是' : ''; } }, { key: 'unique', label: '唯一', render: function (r) { return r.unique ? '是' : ''; } }, { key: 'example', label: '取值', render: function (r) { return String(r.example == null ? '' : r.example); } }, { key: 'source', label: '来源' }], rows: sc.columns }), h('div', { class: 'pd-kv' }, sc.indexes.reduce(function (acc, ix) { return acc.concat([h('span', { class: 'k' }, [ix.name]), h('span', { class: 'v' }, [(ix.unique ? '唯一 ' : '') + ix.cols.join(', ')])]); }, []))] }); }
  function apiDrawer() {
    var R = M.R, s = spec(), row0 = rt().rows[0], detail = h('div');
    var tbl = P.table({ compact: true, cols: [{ key: 'id', label: '编号', w: '64px' }, { key: 'name', label: '接口' }, { key: 'method', label: '方法', w: '54px', render: function (r) { return P.chip(r.method === 'GET' ? 'ok' : 'handled', r.method, true); } }, { key: 'path', label: '路径' }, { key: 'roles', label: '需要角色', render: function (r) { return r.roles.join(' / '); } }], rows: R.apis, rowKey: function (r) { return r.id; }, onRow: function (r) { sh.clear(detail); var body = {}; (r.body || []).forEach(function (k) { var f = s.fields.filter(function (x) { return x.key === k; })[0]; body[k] = row0 && row0.values[k] != null ? row0.values[k] : k === 'expected_version' ? 1 : f ? K.exampleOf(f, LIB, s, 0) : ''; }); var resp = r.method === 'GET' && r.path.indexOf('stats') >= 0 ? { total: R.stats.total, byStatus: R.stats.byStatus.map(function (x) { return { status: x.key, n: x.n }; }) } : row0 ? { id: row0.id, status: row0.status, version: row0.version } : { id: s.prefix + '-2609-001', status: K.initialState(s), version: 1 }; detail.appendChild(h('div', { class: 'pd-card' }, [h('div', { class: 'hd' }, [h('div', { class: 't' }, [r.id + ' ' + r.name]), h('div', { class: 's' }, [r.method + ' ' + r.path])]), h('div', { class: 'bd' }, [h('div', { class: 'pd-kv' }, [h('span', { class: 'k' }, ['需要角色']), h('span', { class: 'v' }, [r.roles.join(' / ')]), h('span', { class: 'k' }, [r.method === 'GET' ? '查询参数' : '请求体']), h('span', { class: 'v' }, [h('div', { class: 'pd-pre' }, [JSON.stringify(r.method === 'GET' ? (r.query || []).reduce(function (m, k) { m[k] = ''; return m; }, {}) : body, null, 1)])]), h('span', { class: 'k' }, ['响应']), h('span', { class: 'v' }, [h('div', { class: 'pd-pre' }, [JSON.stringify(resp, null, 1)])])])])])); } });
    P.drawer(M.frame.body, { title: '接口清单', sub: R.apis.length + ' 个 · 点一行看请求与响应', body: [tbl, detail] });
  }
  function refDrawer() { var s = spec(); var list = h('div', { class: 'pd-list' }); s.integrations.forEach(function (i) { list.appendChild(P.item({ tone: i.mode === 'direct' ? 'ok' : 'risk', icon: i.mode === 'direct' ? '直' : '导', title: i.fields.join(' / ') + ' ↔ ' + i.name, sub: i.system + ' · ' + i.rows + ' ' + i.unit + ' · 同步 ' + i.syncAt, right: i.mode === 'direct' ? '系统直连' : '表格导入' })); }); s.fields.filter(function (f) { return f.type === 'money'; }).forEach(function (f) { list.appendChild(P.item({ tone: 'hand', icon: '账', title: f.label + ' → 费用科目', sub: '只读 · 不回写', right: '预计' })); }); P.drawer(M.frame.body, { title: '主数据关联', sub: s.integrations.length + ' 项 · 只引用不复制', body: [list] }); }
  function rerunTests() { M.told = null; var d = K.runAllTests(M.data, LIB); commit(d, d.state.lastResult.msg); }
  function screenTest(work) {
    var R = M.R, s = spec(), tr = R.testResult, k = R.kpi;
    work.classList.add('m11-test');
    var runNo = 'CS-' + (M.data.state.testRuns < 10 ? '00' : '0') + M.data.state.testRuns;
    var g = h('div', { class: 'pd-grid' });
    var fb = flowBar({ src: [[s.specNo + ' ' + s.specVer, s.fields.length + ' 字段'], ['预埋记录', R.stats.total + ' 条'], ['权限矩阵', R.perms.rows.length + ' 角色 × ' + R.perms.pages.length + ' 页']],
      hub: '用例执行 ' + runNo, out: ['通过 ' + tr.passed + ' / ' + tr.total, [cnt(tr.roleBlocked, { suf: ' 次越权拦截' })]],
      btn: '再跑一遍', onClick: rerunTests });
    g.appendChild(fb);
    var sg = R.suggestion;
    var say = vd(tr.passed + ' / ' + tr.total + ' 通过、越权拦截 ' + tr.roleBlocked + ' 次；' + (sg ? (sg.done ? sg.roleTitle + '已可查看' + sg.pageName + '。' : sg.text + '。') : (tr.warnings[0] ? tr.warnings[0].text + '。' : '没有待办项。')));
    g.appendChild(say);
    var kpiRow = h('div', { class: 'c12' }, [P.kpis([
      { label: '用例', value: cnt(tr.total), unit: '条', tone: 'accent', sub: tr.byKind.slice(0, 3).map(function (b) { return b.kindName + ' ' + b.n; }).join(' · ') },
      { label: '通过', value: cnt(tr.passed), unit: '条', tone: 'ok', sub: '通过率 ' + tr.passRate + '%' },
      { label: '失败', value: cnt(tr.failed), unit: '条', tone: tr.failed ? 'late' : 'ok', sub: '警告 ' + tr.warnings.length },
      { label: '越权拦截', value: cnt(tr.roleBlocked), unit: '次' },
      { label: '数据表', value: 1, unit: '表', sub: R.schema.columns.length + ' 列 · ' + R.schema.indexes.length + ' 索引', onClick: dictDrawer },
      { label: '接口', value: cnt(k.apis), unit: '个', sub: 'REST', onClick: apiDrawer }])]);
    g.appendChild(kpiRow);
    var left = col('c7', []), right = col('c5', []);
    var tbl = P.table({ compact: true, cols: [{ key: 'id', label: '编号', w: '62px' }, { key: 'name', label: '用例', render: function (r) { return h('span', {}, [h('b', { class: 'kd' }, [r.kindName]), ' ' + r.name]); } }, { key: 'expect', label: '预期' }, { key: 'actual', label: '实际', w: '116px', render: function (r) { return r.actual === r.expect ? '同预期' : r.actual; } }, { key: 'pass', label: '结果', w: '80px', align: 'right', render: function (r) { return h('span', { class: 'res' }, [P.chip(r.pass ? 'ok' : 'late', r.pass ? '通过' : '失败')]); } }], rows: tr.rows });
    tagRefs(tbl, tr.rows, function (r) { return r.id; });
    var wrap = h('div', { class: 'm11-tests' }, [h('div', { class: 'sc' }, [tbl])]);
    left.appendChild(P.card({ title: '测试报告 ' + runNo, sub: tr.passed + ' / ' + tr.total + ' 通过', extra: P.btn('再跑一遍', { cls: 'sm', onClick: rerunTests }), tight: true, body: [wrap], foot: [tr.warnings.length ? tr.warnings.map(function (w) { return w.id + ' ' + w.text; }).join('；') : '无警告'] }));
    var sugg = sg ? h('div', { class: 'm11-sugg' }, [h('div', { class: 't' }, [P.chip(sg.done ? 'ok' : 'risk', sg.done ? '已采纳' : 'AI 建议', true), sg.done ? sg.roleTitle + '已可查看' + sg.pageName : sg.text]), sg.done ? P.chip('ok', '已更新', true) : P.btn('采纳', { cls: 'primary sm', onClick: function () { adoptSuggestion(); } }), h('div', { class: 'd' }, [sg.reason])]) : null;
    right.appendChild(P.card({ title: '权限矩阵', sub: s.roles.length + ' 角色 × ' + s.pages.length + ' 页', tight: true, body: [h('div', { style: 'padding:8px 10px;overflow:auto;max-height:312px' }, [matrixEl()]), sugg ? h('div', { style: 'padding:0 12px 12px' }, [sugg]) : null] }));
    var prods = h('div', { class: 'pd-list m11-prods' }, [
      P.item({ tone: 'accent', icon: '表', title: '数据字典', sub: R.schema.table + ' · ' + R.schema.columns.length + ' 列 ' + R.schema.indexes.length + ' 索引', right: '查看', onClick: dictDrawer }),
      P.item({ tone: 'accent', icon: 'API', title: '接口清单', sub: R.apis.length + ' 个 · ' + R.apis.filter(function (a) { return a.method === 'POST'; }).length + ' 写 ' + R.apis.filter(function (a) { return a.method === 'GET'; }).length + ' 读', right: '查看', onClick: apiDrawer }),
      P.item({ tone: 'accent', icon: '联', title: '主数据关联', sub: s.integrations.length + ' 项 · ' + s.integrations.map(function (i) { return i.name; }).join(' · '), right: '查看', onClick: refDrawer })]);
    left.appendChild(P.card({ title: '产物', tight: true, body: [h('div', { style: 'padding:10px 12px' }, [prods])] }));
    g.appendChild(left); g.appendChild(right);
    work.appendChild(g);
    story({ work: work, src: fb.srcs, from: fb.srcs[0], to: fb.hub, tail: fb.out, label: runNo, scan: wrap,
      rows: trs(wrap, 7), rise: nodes(work, '.m11-matrix tbody tr').concat(nodes(prods, '.pd-item')),
      verdict: say, focus: sugg || kpiRow.querySelectorAll('.pd-kpi')[1] });
    M.newPerm = null;
  }
  function adoptSuggestion() {
    var sg = M.R.suggestion; if (!sg || sg.done) return;
    M.newPerm = { role: sg.role, page: sg.page, op: sg.op };
    var d = K.grantPermission(M.data, LIB, sg.role, sg.page, sg.op);
    commit(d, '权限矩阵已更新 · ' + d.state.spec.specNo + ' ' + d.state.spec.specVer);
  }

  /* ---------- 屏 5 发布 ---------- */
  function screenShip(work) {
    var R = M.R, s = spec(), ck = R.checklist, env = R.env, last = R.releases[R.releases.length - 1];
    work.classList.add('m11-ship');
    var g = h('div', { class: 'pd-grid' });
    var fb = flowBar({ src: [['发布前检查', ck.passed + ' / ' + ck.total], ['用例', R.testResult.passed + ' / ' + R.testResult.total], ['主数据', s.integrations.length + ' 项']],
      hub: '发布流水', out: [s.version, [cnt(R.releases.length, { suf: ' 次发布' }), ' · ', env === 'live' ? '正式环境' : '测试环境']],
      btn: '重新检查', onClick: recalc });
    g.appendChild(fb);
    var say = vd(env === 'live' ? (s.version + ' 已上线，冒烟 ' + ((last && last.smoke) || (R.testResult.passed + ' / ' + R.testResult.total)) + '，扫码即用。')
      : ('发布前检查 ' + ck.passed + ' / ' + ck.total + ' 全通过，' + s.version + ' 可发正式环境。'));
    g.appendChild(say);
    var left = col('c5', []), right = col('c7', []);
    var phoneBox = h('div', {}, [phoneWrap(phone({ title: '扫码入口', ver: s.version, body: entryPage(env) }), 0.78)]);
    left.appendChild(P.card({ title: '手机 · 扫码入口', body: [phoneBox], foot: [R.qrText] }));
    var checks = h('div', { class: 'm11-checks' });
    ck.items.forEach(function (c) { checks.appendChild(h('span', { class: 'c' + (c.ok ? '' : ' bad') }, [c.ok ? '✓' : '✗', c.label, h('span', { class: 'd' }, ['· ' + c.detail])])); });
    var stage = M.pipeStage != null ? M.pipeStage : null;
    var pipeItems = R.pipeline.map(function (p, i) { var st = p.state; if (stage != null) st = i < stage ? 'done' : i === stage ? 'on' : 'todo'; return { label: p.label, sub: i === 2 ? '用例 ' + R.testResult.passed + ' / ' + R.testResult.total : i === 1 ? (R.releases[0] ? R.releases[0].at : '') : i === 3 && last && last.env === 'prod' ? last.at : '', state: st }; });
    var pipe = P.steps({ items: pipeItems });
    var kv = P.kv([['应用', s.title + ' ' + s.id], ['版本', s.version + ' · ' + s.specNo + ' ' + s.specVer], ['渠道', s.channels.map(function (c) { return c.name; }).join(' · ')], ['适用范围', rolesNonAdmin().map(function (r) { return r.title; }).join(' · ')]]);
    var btn = P.btn(env === 'live' ? s.version + ' 已上线' : '发布到正式环境', { cls: 'primary', disabled: !ck.all || env === 'live', onClick: function () {
      var d = K.publish(M.data, LIB), lr = d.state.lastResult; if (!lr.ok) { P.toast(M.frame.body, lr.error); return; }
      var i = 2; M.pipeStage = 2;
      var tick = function () { M.pipeStage = i; var np = P.steps({ items: R.pipeline.map(function (p, j) { return { label: p.label, sub: pipeItems[j].sub, state: j < i ? 'done' : j === i ? 'on' : 'todo' }; }) }); pipe.parentNode.replaceChild(np, pipe); pipe = np; i++; if (i <= 5) later(tick, 400); else { M.pipeStage = null; commit(d, lr.msg); } };
      tick();
    } });
    var rel = P.table({ compact: true, cols: [{ key: 'id', label: '编号', w: '70px' }, { key: 'version', label: '版本', w: '70px' }, { key: 'envName', label: '环境', render: function (r) { return P.chip(r.env === 'prod' ? 'ok' : 'watch', r.envName); } }, { key: 'publisher', label: '发布人' }, { key: 'at', label: '时间' }, { key: 'status', label: '状态', render: function (r) { return r.status + (r.smoke ? ' · 冒烟 ' + r.smoke : ''); } }], rows: R.releases });
    right.appendChild(P.card({ title: '发布 · 发布记录', sub: ck.passed + ' / ' + ck.total + ' 通过', extra: btn, body: [h('div', { class: 'pd-field' }, [h('label', {}, ['发布前检查']), checks]), h('div', { class: 'pd-field', style: 'margin-top:12px' }, [h('label', {}, ['发布流水']), pipe]), h('div', { style: 'margin-top:12px' }, [kv])], foot: [h('div', { style: 'width:100%' }, [rel])] }));
    g.appendChild(left); g.appendChild(right);
    work.appendChild(g);
    story({ work: work, src: fb.srcs, from: fb.srcs[0], to: fb.hub, tail: phoneBox, label: s.version, scan: phoneBox,
      rows: trs(rel), rise: nodes(work, '.m11-checks .c').concat(nodes(work, '.pd-steps .st')).concat(nodes(work, '.pd-kv > span')),
      verdict: say, focus: btn });
  }

  /* ---------- 屏 6 迭代交付 ---------- */
  function genDelta(text) {
    var txt = text || M.deltaText || (M.R.followUps[0] ? M.R.followUps[0].text : '');
    if (!txt) return;
    var d = K.applyDelta(M.data, LIB, txt), lr = d.state.lastResult;
    if (!lr.ok) { P.toast(M.frame.body, lr.error); return; }
    M.deltaText = ''; commit(d, lr.msg);
  }
  function screenIterate(work) {
    var R = M.R, s = spec(), fus = R.followUps, ch = R.changes, last = ch[ch.length - 1];
    work.classList.add('m11-iterate');
    var next = K.bump(s.version, 'minor');
    var big = fus.slice().sort(function (a, b) { return (b.pages + b.fields + b.states + b.tests) - (a.pages + a.fields + a.states + a.tests); })[0];
    var g = h('div', { class: 'pd-grid' });
    var fb = flowBar({ src: [[s.version + ' 线上', s.pages.length + ' 页 ' + s.fields.length + ' 字段'], ['追加需求', fus.length + ' 条'], ['变更类型', LIB.deltas.types.length + ' 种']],
      hub: '差异编译', out: [last ? last.to : next, last && R.diff ? [cnt(R.diff.after.pages - R.diff.before.pages, { suf: ' 页' }), ' · ', cnt(R.diff.after.fields - R.diff.before.fields, { suf: ' 字段' })] : (big ? [cnt(big.pages, { suf: ' 页' }), ' · ', cnt(big.fields, { suf: ' 字段' })] : ['待生成'])],
      btn: '重新比对', onClick: recalc });
    g.appendChild(fb);
    var say = vd(last ? (last.from + ' → ' + last.to + '：' + last.items.length + ' 项变更，存量 ' + last.stock.rows + ' 条不动，旧用例 ' + last.oldPassed + ' / ' + last.oldTests + ' 仍通过。')
      : (fus.length + ' 条追加需求待生成' + (big ? '，改动大的一条 +' + big.pages + ' 页 ' + big.fields + ' 字段 ' + big.tests + ' 用例' : '') + '。'));
    g.appendChild(say);
    var list = h('div', { class: 'pd-list m11-follow' }), items = [];
    var ta = h('textarea', { class: 'm11-ta', placeholder: '追加一句需求', oninput: function (e) { M.deltaText = e.target.value; refreshNote(); } }, [M.deltaText || '']);
    var note = h('div');
    function refreshNote() {
      sh.clear(note); var txt = M.deltaText || ''; if (!txt) return;
      var pv = K.previewDelta(spec(), txt, LIB);
      if (pv.delta.mode === 'fallback') note.appendChild(h('div', { class: 'm11-note' }, ['未识别的变更，按相近的一条解析']));
      else note.appendChild(h('div', { class: 'm11-chips' }, pv.delta.ops.map(function (o) { return chip(o.type === 'addField' ? 'field' : o.type === 'addState' ? 'flow' : '', '变更', K.deltaText(o, LIB), o.exists ? ['已存在'] : null); })));
    }
    fus.forEach(function (f) {
      var it = P.item({ tone: f.applied ? 'ok' : 'accent', icon: String(f.index + 1), title: f.text, sub: f.types.map(function (t) { return LIB.deltas.types.filter(function (x) { return x.key === t; })[0].name; }).join(' · ') + ' · ' + (['+' + f.pages + ' 页', '+' + f.fields + ' 字段', '+' + f.states + ' 节点', '+' + f.tests + ' 用例', '+' + f.apis + ' 接口'].filter(function (x) { return x.charAt(1) !== '0'; }).join(' ') || '无变化'), right: f.applied ? '已生成' : '',
        onClick: function () { M.deltaText = f.text; ta.value = f.text; items.forEach(function (x) { x.classList.remove('on'); }); it.classList.add('on'); refreshNote(); } });
      if (M.deltaText === f.text) it.classList.add('on');
      items.push(it); list.appendChild(it);
    });
    refreshNote();
    var left = col('c5', []), right = col('c7', []);
    g.appendChild(P.card({ cls: 'c5', title: '追加需求', sub: LIB.deltas.types.length + ' 种变更 · 存量数据不动', extra: P.btn('生成 ' + next, { cls: 'primary sm', onClick: function () { genDelta(); } }), body: [list, ta, note] }));
    var el;
    if (last && last.items.some(function (i) { return i.type === 'addState' && s.pages.some(function (p) { return p.kind === 'rate'; }); })) { var rows = rt().rows.filter(function (r) { return s.transitions.some(function (t) { return t.from === r.status && t.actionEn === 'rate'; }); }); el = renderPage('rate', { row: rows[0], tabs: roleTabs('submitter', function () { }) }); }
    else if (last && last.items.some(function (i) { return i.type === 'addStat'; })) el = renderPage('board', { tabs: roleTabs('lead', function () { }) });
    else if (last && last.items.some(function (i) { return i.type === 'addRule'; })) { var fl = {}; R.stats.flagged.forEach(function (f) { fl[f.id] = f.text; }); var ov = {}; R.stats.overdue.forEach(function (o) { ov[o.id] = o.text; }); el = renderPage('list', { rows: K.query(s, rt(), actor('handler'), 'list'), flags: fl, overdue: ov, tabs: roleTabs('handler', function () { }) }); }
    else { var nk = last ? last.items.filter(function (i) { return i.type === 'addField' || i.type === 'addValidation'; }).map(function (i) { return i.content; }) : []; el = renderPage('form', { values: K.exampleValues(s, K.formFields(s), LIB, 0), newKeys: s.fields.filter(function (f) { return f.source === '需求追加' || nk.some(function (c) { return c.indexOf(f.label) >= 0; }); }).map(function (f) { return f.key; }), tabs: roleTabs('submitter', function () { }) }); }
    var phoneBox = h('div', {}, [phoneWrap(el, 0.645)]);
    left.appendChild(P.card({ title: '手机 · ' + (last ? last.to : s.version), body: [phoneBox] }));
    var cmpEl = null, bt = null;
    if (last && R.diff) {
      var a = R.diff.before, b = R.diff.after;
      var rowsOf = function (x, old) { return [{ k: '页面', v: String(x.pages) }, { k: '字段', v: String(x.fields) }, { k: '流程节点', v: String(x.states) }, { k: '接口', v: String(x.apis) }, { k: '用例', v: String(x.tests) }, { k: '旧用例回归', v: old ? '—' : last.oldPassed + ' / ' + last.oldTests, tone: old ? '' : 'ok' }]; };
      cmpEl = P.compare({ options: [{ key: 'A', name: last.from + ' · 当前线上', headline: { big: a.pages + ' 页', sub: a.fields + ' 字段' }, rows: rowsOf(a, true) }, { key: 'B', name: last.to + ' · 新版本', recommended: true, headline: { big: b.pages + ' 页', sub: b.fields + ' 字段', tone: 'ok' }, rows: rowsOf(b, false), notes: '用例 ' + last.passed + ' / ' + last.tests + ' 通过 · ' + (R.env === 'live' ? '已上线' : '待发布') }], active: 'B' });
      cmpEl.style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';
      bt = P.table({ compact: true, cols: [{ key: 'n', label: '#', w: '26px' }, { key: 'typeName', label: '类型', w: '76px', render: function (r) { return P.chip('handled', r.typeName, true); } }, { key: 'content', label: '变更 · 影响页面', render: function (r) { return h('span', {}, [h('b', {}, [String(r.content).replace(r.typeName + ' ', '')]), h('span', { class: 'pg' }, [(r.pages.join(' · ') || '不涉及页面') + (r.apis.length ? ' · 接口 +' + r.apis.length : '')])]); } }, { key: 'tests', label: '用例', w: '52px', align: 'right', render: function (r) { return r.tests ? '+' + r.tests : '—'; } }], rows: last.items.slice(0, 6) });
      right.appendChild(P.card({ title: last.from + ' → ' + last.to, sub: '变更清单 ' + last.id + ' · ' + last.items.length + ' 项', body: [cmpEl, h('div', { class: 'm11-chg' }, [bt]), h('div', { style: 'margin-top:10px' }, [P.kv([['存量数据', last.stock.rows + ' 条 · 新字段置空'], ['可补填', last.stock.newFields.length ? last.stock.fillable + ' 条' + last.stock.terminalLabel + '的可补' + last.stock.newFields.join(' / ') : '无新字段'], ['旧用例', last.oldPassed + ' / ' + last.oldTests + ' 仍通过']])])] }));
    } else right.appendChild(P.card({ title: '版本对比', body: [P.empty('选一条追加需求，或写一句 · 点「生成 ' + next + '」')] }));
    g.appendChild(h('div', { class: 'c7 pd-grid' }, [left, right]));
    var dv = h('div', { class: 'm11-deliver' });
    R.deliverables.forEach(function (x) { dv.appendChild(h('span', { class: 'dv' }, [h('span', { class: 't' }, [x.name]), h('span', { class: 's' }, [x.count])])); });
    dv.appendChild(h('span', { class: 'sp' }));
    dv.appendChild(P.btn('交付报告', { onClick: reportDrawer }));
    dv.appendChild(P.btn(M.data.state.sent ? '再发一次' : '发送到微信', { cls: 'primary', onClick: function () { M.data = K.sendReport(M.data, LIB); recompute(); sh.setQrReady(true); sh.showWeChat(); draw(); P.toast(M.frame.body, '交付报告已发送 · ' + M.R.report.recipients); } }));
    dv.insertBefore(h('span', { class: 'lb' }, ['交付 ' + R.deliverables.length + ' 项']), dv.firstChild);
    g.appendChild(h('div', { class: 'c12 m11-bar' }, [dv]));
    work.appendChild(g);
    story({ work: work, src: fb.srcs, from: fb.srcs[0], to: fb.hub, tail: phoneBox, label: next, scan: phoneBox,
      rows: bt ? trs(bt) : [], rise: nodes(work, '.m11-follow .pd-item').concat(nodes(work, '.m11-deliver .dv')).concat(cmpEl ? nodes(work, '.pd-option') : []),
      verdict: say, focus: cmpEl ? (cmpEl.querySelector('.pd-option.on') || cmpEl.querySelector('.pd-option')) : (items[big ? big.index : 0] || null) });
  }
  function reportDrawer() {
    var rp = M.R.report, who = h('div', { class: 'who', style: 'display:flex;gap:6px;flex-wrap:wrap' });
    rp.recipients.split(' · ').forEach(function (r) { who.appendChild(P.chip('handled', r, true)); });
    P.drawer(M.frame.body, { title: '交付报告 ' + rp.no, sub: '微信文本版', body: [h('div', { class: 'pd-field' }, [h('label', {}, ['收件人']), who]), h('div', { class: 'pd-pre', style: 'margin-top:10px' }, [rp.text])] });
  }
  /* ================= 对话坞 · 取上下文 + 落地动作 =================
     问答与文档摄入全在内核（DGG.coreM11 的 screens / brief / suggest / ask / ingest），
     本文件只做两件事：ctx() 把当前数据交出去，act() 把内核给的声明式动作落到这六屏上。 */
  function rowOf(scope, txt) { var list = scope ? scope.querySelectorAll('.pd-table tbody tr') : [], i; for (i = 0; i < list.length; i++) if (list[i].textContent.indexOf(txt) >= 0) return list[i]; return null; }
  function refEl(ref) { var w = workEl(), s = String(ref == null ? '' : ref); if (!w || !s) return null; return w.querySelector('[data-ref="' + s + '"]') || rowOf(w, s); }
  function focusSel(sel, ms) { later(function () { var w = workEl(), el = w && w.querySelector(sel); if (el) A().pulse(el, { ms: 2200, scroll: true }); }, ms || 180); }
  function refocus(ref, ms) { later(function () { var el = refEl(ref); if (el) A().pulse(el, { ms: 2200, scroll: true }); }, ms || 180); }
  function goStep(step, after, ms) { if (M.step !== step) setStep(step); if (after) later(after, ms || 520); }
  function openRow(id) { var rows = rt() ? rt().rows : []; var hit = null; rows.forEach(function (r) { if (id === r.id) hit = r; }); return hit; }
  function doNextScript() {
    if (!M.data.state.spec) return false;
    var stp = M.R.script[M.R.scriptStep]; if (!stp) return false;
    M.role = stp.actor.slot; M.formErr = null;
    var d = K.nextScript(M.data, LIB), lr = d.state.lastResult;
    if (!lr || !lr.ok) { if (M.frame) P.toast(M.frame.body, lr ? lr.error : '脚本已走完'); return false; }
    M.rowId = lr.id; M.page = stp.kind === 'submit' ? 'mine' : 'detail';
    M.data = d; recompute();
    if (M.step !== 'try') setStep('try'); else draw();
    if (M.frame) P.toast(M.frame.body, lr.msg);
    return true;
  }
  /* {type:'focus', ref} 上的业务 id：记录编号 → 试用屏那一行，用例编号 → 测试屏那一行 */
  function focusRef(ref) {
    var id = String(ref == null ? '' : ref);
    if (!id) return false;
    if (/^TC-\d/.test(id)) { if (M.step !== 'test') { setStep('test'); refocus(id, 620); } else refocus(id); return true; }
    if (openRow(id)) {
      M.rowId = id;
      if (M.step !== 'try') { M.role = 'lead'; M.page = 'board'; setStep('try'); refocus(id, 620); } else refocus(id);
      return true;
    }
    var el = refEl(id); if (!el) return false;
    A().pulse(el, { ms: 2200, scroll: true });
    return true;
  }
  function docBody(list) {
    var out = [];
    (list || []).forEach(function (b) {
      if (b && b.type === 'text') { out.push(h('div', { class: 'pd-pre', style: 'max-height:320px;overflow:auto' }, [String(b.text == null ? '' : b.text)])); return; }
      var n = window.DGG.chat.block(b);
      if (n) out.push(n);
    });
    return out;
  }
  function openPanel(a) {
    var p = a.panel;
    if (p === 'parse') { goStep('connect', function () { focusSel('.m11-chips', 0); }); return true; }
    if (p === 'source') { goStep('connect', function () { focusSel('.src-row', 0); }); return true; }
    if (p === 'preview') { goStep('connect', function () { focusSel('.m11-flow .out', 0); }); return true; }
    if (p === 'pages') { goStep('build', function () { focusSel('.m11-pages', 0); }); return true; }
    if (p === 'page') { if (a.ref) M.page = String(a.ref); goStep('build', function () { focusSel('.m11-phone', 0); }); return true; }
    if (p === 'judge') { goStep('build', judgeDrawer); return true; }
    if (p === 'board') { goStep('try', function () { focusSel('.pd-dist', 0); }); return true; }
    if (p === 'perf') { goStep('try', function () { focusSel('.m11-pc .pd-kpis', 0); }); return true; }
    if (p === 'matrix') { goStep('test', function () { focusSel('.m11-matrix', 0); }); return true; }
    if (p === 'sugg') { goStep('test', function () { focusSel('.m11-sugg', 0); }); return true; }
    if (p === 'tests') { goStep('test', function () { focusSel('.m11-tests', 0); }); return true; }
    if (p === 'dict') { goStep('test', dictDrawer); return true; }
    if (p === 'api') { goStep('test', apiDrawer); return true; }
    if (p === 'entry') { goStep('ship', function () { focusSel('.m11-phone .entry', 0); }); return true; }
    if (p === 'checks') { goStep('ship', function () { focusSel('.m11-checks', 0); }); return true; }
    if (p === 'stock') { goStep('iterate', function () { focusSel('.pd-kv', 0); }); return true; }
    if (p === 'follow') { goStep('iterate', function () { focusSel('.m11-follow', 0); }); return true; }
    if (p === 'change') { goStep('iterate', function () { focusSel('.pd-table', 0); }); return true; }
    if (p === 'report') { goStep('iterate', reportDrawer); return true; }
    if (p === 'doc') { P.drawer(M.frame.body, { title: a.title || String(a.ref || '文档'), sub: a.sub, body: docBody(a.blocks) }); return true; }
    return false;
  }
  function applyAction(a) {
    var input = a.input || {}, R = M.R;
    if (a.action === 'generate') { if (M.data.state.spec) return false; enterBuild(); return true; }
    if (a.action === 'addField') {
      var f = (R.recommended || []).filter(function (x) { return x.key === input.key; })[0];
      if (!f) return false;
      if (M.step !== 'build') setStep('build');
      addRecField(f);
      later(function () { focusSel('.m11-phone .fld.new', 0); }, 700);
      return true;
    }
    if (a.action === 'grantPermission') {
      var sg = R.suggestion;
      if (!sg || sg.done || sg.role !== input.role || sg.page !== input.page) return false;
      if (M.step !== 'test') setStep('test');
      adoptSuggestion();
      later(function () { focusSel('.m11-sugg', 0); }, 700);
      return true;
    }
    if (a.action === 'nextScript') return doNextScript();
    if (a.action === 'publish') {
      if (!R.spec || R.env === 'live' || !R.checklist.all) return false;
      var hit = function () { var b = workEl() && workEl().querySelector('.pd-card .x .pd-btn'); if (b && !b.disabled) b.click(); };
      if (M.step !== 'ship') { setStep('ship'); later(hit, 620); } else hit();
      return true;
    }
    if (a.action === 'applyDelta') {
      if (!input.text) return false;
      if (M.step !== 'iterate') setStep('iterate');
      genDelta(input.text);
      later(function () { focusSel('.pd-option.on', 0); }, 800);
      return true;
    }
    return false;
  }
  function setParam(a) {
    if (a.path === 'state.text') {
      var txt = String(a.value == null ? '' : a.value); if (!txt) return false;
      M.told = null; M.data = K.setText(M.data, LIB, txt); recompute();
      if (M.step !== 'connect') setStep('connect'); else draw();
      later(function () { focusSel('.m11-chips', 0); }, 620);
      return true;
    }
    if (a.path === 'state.delta') {
      if (!M.data.state.spec) return false;
      M.told = null; M.deltaText = String(a.value == null ? '' : a.value);
      if (M.step !== 'iterate') setStep('iterate'); else draw();
      later(function () { focusSel('.m11-note, .m11-chips', 0); }, 620);
      return true;
    }
    if (a.path === 'state.presetIndex') {
      var i = a.value | 0;
      M.told = null; M.data = K.pickPreset(M.data, LIB, i); recompute();
      if (M.step !== 'connect') setStep('connect'); else draw();
      later(function () { focusSel('.m11-chips', 0); }, 620);
      return true;
    }
    return false;
  }

  window.DGG.chatBrain('m11', {
    kernel: window.DGG.coreM11,
    ctx: function () { return { data: M.data, lib: LIB, result: M.R }; },
    act: function (a) {
      if (!a || !a.type || !M.R) return false;
      if (a.type === 'focus') return focusRef(a.ref);
      if (a.type === 'open') return openPanel(a);
      if (a.type === 'apply') return applyAction(a);
      if (a.type === 'set') return setParam(a);
      return false;                                      /* goto 与不认识的动作交给通用兜底 */
    }
  });
  window.DGG.registerModule('m11', { mount: mount, unmount: unmount, onCompany: onCompany, onIndustry: onIndustry });
})();
