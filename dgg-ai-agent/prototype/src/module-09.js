/* AI决策 · 指标 归因 方案 审批（六屏）
 * 接入 → 决策驾驶舱 → 指标归因 → 方案预演 → 审批 → 执行与复盘
 * 每屏三拍：接入（来源亮起、数据包飞向指标树）→ 展开（数字滚、瀑布画、条形长、行流入）→ 结论（一句话横幅 + 聚焦）
 * 计算全部走 DGG.coreM9（与 skill 同一份内核）；对话大脑登记在 DGG.chatBrain('m9')
 * 指标从 AI CFO / AI ERP / AI获客 / AI人力官 / AI法务 取数；纯预制、断网可用；不用任何存储 API
 */
(function () {
  'use strict';
  var sh, $root, h, DATA, P, K, LIB;
  var ACCENT = window.DGG.PALETTE.m9;
  var STATUS_TONE = { ok: 'ok', watch: 'risk', risk: 'late' };
  var OP_TONE = { agree: 'ok', cond: 'risk', object: 'late' };
  var AP_TONE = { pending: 'watch', approved: 'ok', rejected: 'done' }, AP_NAME = { pending: '待终批', approved: '已批准', rejected: '已驳回' };
  var GROUP_ICON = { profit: '利', cash: '现', delivery: '交', growth: '客', people: '人', compliance: '合' };
  var RISK_NAME = { low: '低', mid: '中', high: '高' };
  var SCREEN = { m6: { risks: 'risk', statements: 'recon', reconcile: 'recon', cash: 'cash', board: 'board' }, m10: { board: 'room', materials: 'stock', orders: 'order' }, m4: { board: 'board', leads: 'leads' }, m5: { board: 'board', compliance: 'compliance', recruit: 'recruit' }, m7: { contracts: 'contracts' } };
  var M = { step: 'connect', arche: null, data: null, R: null, metric: 'profit', basis: 'prev', factor: null, cause: null, params: {}, option: null, approval: null, decision: null, comment: '', charged: false, name: null, company: null, frame: null, who: 0, told: null, replay: null };

  function anim() { return window.DGG.anim; }
  function sectorOf(slug) { var hit = null; (DATA.industries.sectors || []).forEach(function (s) { (s.industries || []).forEach(function (i) { if (i.slug === slug) hit = s.key; }); }); return hit; }
  function archeOf(slug) { var sec = sectorOf(slug); var a = (sec && DATA.m10.archetypes.map[sec]) || 'make'; if (a === 'project') a = 'service'; return DATA.m9.samples[a] ? a : 'make'; }
  function loadArche(a) {
    M.arche = a;
    var sample = DATA.m9.samples[a], base = K.ensure(sample);
    if (M.name && M.name !== sample.company) base.company = M.name;
    M.data = base; M.metric = 'profit'; M.basis = 'prev'; M.factor = null; M.cause = null; M.params = {}; M.option = null; M.approval = null; M.decision = null; M.comment = ''; M.told = null;
    recompute();
  }
  /* 屏上选的根因 / 方案 / 参数一并交给内核（run 收进 result.selection），对话答的数与屏上的一致 */
  function recompute() { M.R = K.run(M.data, LIB, { metric: M.metric, basis: M.basis, cause: M.cause, option: M.option, params: M.cause ? M.params[M.cause] : null }); }
  function commit(data, msg) { M.data = data; recompute(); draw(); if (msg && M.frame) P.toast(M.frame.body, msg); }
  function fmtN(n) { return P.fmtN(n); }
  function W(n) { return K.fmtW(n); }
  function short(s) { return K.short(s); }
  function W0(n) { return Math.abs(n) >= 1000000 ? fmtN(Math.round(n / 10000)) + ' 万元' : K.fmtW(n); }
  function cut(s, n) { s = String(s == null ? '' : s); return s.length > n ? s.slice(0, n) + '…' : s; }
  function col(cls, kids) { return h('div', { class: cls, style: 'display:flex;flex-direction:column;gap:16px' }, kids); }
  function stChip(st) { return P.chip(STATUS_TONE[st], K.STATUS_NAME[st]); }
  function goModule(mod, screen) { var st = (SCREEN[mod] || {})[screen] || 'board'; sh.go(mod, st); }
  function srcName(s) { return String(s.name || '').split(' · ')[0]; }
  function workEl() { return M.frame ? M.frame.work : null; }
  function nodeList(scope, sel) { return scope ? Array.prototype.slice.call(scope.querySelectorAll(sel)) : []; }
  function trs(el) { return el ? Array.prototype.slice.call(el.querySelectorAll('tbody tr')) : []; }
  /* 给行与卡片标上业务 id，内核的 {type:'focus'|'open', ref} 就能找到它 */
  function tagRef(el, ref) { if (el && el.setAttribute) el.setAttribute('data-ref', ref); return el; }
  function tagRows(tbl, rows, textOf, refOf) {
    trs(tbl).forEach(function (tr) {
      var t = tr.textContent, i, s;
      for (i = 0; i < rows.length; i++) { s = textOf(rows[i]); if (s && t.indexOf(s) >= 0) { tr.setAttribute('data-ref', refOf(rows[i])); return; } }
    });
  }
  function rowOf(scope, txt) {
    var list = scope ? scope.querySelectorAll('.pd-table tbody tr, .pd-item, .m9-tile, .m9-sign .s, .m9-ms .m') : [], i;
    for (i = 0; i < list.length; i++) if (list[i].textContent.indexOf(txt) >= 0) return list[i];
    return null;
  }
  function focusSel(sel, ms) { setTimeout(function () { var w = workEl(), el = w && w.querySelector(sel); if (el) anim().pulse(el, { ms: 2200, scroll: true }); }, ms || 140); }

  /* ---------- 叙事件：滚动数字 · 接入带 · 结论横幅 ---------- */
  function cnt(to, o) {
    o = o || {};
    var dec = o.dec || 0;
    return h('b', { class: 'm9-cnt num', 'data-to': String(to), 'data-dec': String(dec), 'data-suf': o.suf || '' }, [dec ? (0).toFixed(dec) : '0']);
  }
  function resetCounts(scope) {
    if (!scope) return;
    Array.prototype.forEach.call(scope.querySelectorAll('.m9-cnt'), function (e) {
      var dec = +e.getAttribute('data-dec') || 0;
      e.textContent = dec ? (0).toFixed(dec) : '0';
    });
  }
  function runCounts(scope, ms) {
    if (!scope) return;
    Array.prototype.forEach.call(scope.querySelectorAll('.m9-cnt'), function (e) {
      anim().count(e, parseFloat(e.getAttribute('data-to')) || 0, { decimals: +e.getAttribute('data-dec') || 0, unit: e.getAttribute('data-suf') || '', ms: ms || 900 });
    });
  }
  function vd(text) { return h('div', { class: 'c12 m9-say off' }, [h('span', { class: 'ic' }, ['AI']), h('b', {}, [text])]); }
  function flowBar(o) {
    var srcWrap = h('div', { class: 'src' }, o.src.map(function (s) { return h('div', { class: 's' }, [h('b', {}, [s[0]]), h('span', {}, [s[1]])]); }));
    var hub = h('div', { class: 'hub' }, [h('span', { class: 'an-live' }), h('b', {}, [o.hub])]);
    var out = h('div', { class: 'out' }, [h('b', {}, [o.out[0]]), h('span', {}, [o.out[1]])]);
    var el = h('div', { class: 'c12 m9-flowbar' }, [srcWrap, h('span', { class: 'pipe an-pipe' }), hub, h('span', { class: 'pipe an-pipe' }), out, h('span', { class: 'sp' }),
      P.btn(o.btn, { cls: 'sm', onClick: function () { if (M.replay) M.replay(); } })]);
    el.hub = hub; el.out = out;
    el.srcs = Array.prototype.slice.call(srcWrap.children);
    return el;
  }
  /* 三拍：接入 0–0.8s · 展开 0.8–2.3s · 结论 2.3–2.9s
     进屏走全程；屏内动作（换指标、调参数、批准）只走后两拍的短版，免得反复重放 */
  function story(o) {
    function run(full) {
      var A = anim(), t0 = full ? 820 : 0, tv = full ? 2280 : 680;
      A.stopAll();
      var rises = (o.rise || []).filter(Boolean);
      rises.forEach(function (n) { n.style.opacity = '0'; });
      if (full) resetCounts(o.work);
      if (o.verdict) { o.verdict.classList.add('off'); o.verdict.classList.remove('an-verdict'); }
      if (o.paths && o.paths.length) A.drawSvg(o.paths, full ? 900 : 600, t0 + 60);
      if (o.bars && o.bars.length) A.grow(o.bars, { stagger: full ? 55 : 26, ms: full ? 720 : 480, delay: t0 + 20 });
      if (o.rows && o.rows.length) A.stream(o.rows, { stagger: full ? 70 : 32, delay: t0 });
      var T = A.timeline();
      if (full) {
        T.at(0, function () { if (o.src && o.src.length) A.rise(o.src, { stagger: 55, from: 'left', ms: 380 }); });
        T.at(190, function () { if (o.from && o.to) A.packet(o.from, o.to, { count: 3, ms: 600, gap: 105, arc: 20, label: o.label }); });
        T.at(540, function () { if (o.to) A.scan(o.to, { ms: 880 }); if (o.scan) A.scan(o.scan, { ms: 1150 }); });
        T.at(680, function () { if (o.to && o.tail) A.packet(o.to, o.tail, { count: 2, ms: 520, gap: 95, arc: 20 }); });
      }
      T.at(t0, function () {
        if (o.pop && o.pop.length) A.rise(o.pop, { stagger: full ? 46 : 22, ms: full ? 380 : 280 });
        if (o.dots && o.dots.length) A.rise(o.dots, { stagger: full ? 10 : 5, ms: full ? 300 : 200, from: 'none' });
        runCounts(o.work, full ? 940 : 560);
        if (rises.length) A.rise(rises, { stagger: full ? 70 : 32, ms: full ? 440 : 320 });
      });
      T.at(tv, function () {
        if (o.verdict) { o.verdict.classList.remove('off'); o.verdict.classList.add('an-verdict'); }
        if (o.focus) A.pulse(o.focus, { ms: 1300, scroll: false });
      });
      T.play();
    }
    var first = M.told !== M.step;
    M.told = M.step;
    M.replay = function () { run(true); };
    run(first);
  }

  /* ---------- 指标取数小工具 ---------- */
  function cntOf(n) {
    if (n.unit === '元') { var w = n.cur / 10000; return { el: cnt(Math.round(w * 10) / 10, { dec: Math.abs(w) >= 1000 ? 0 : 1 }), unit: '万元' }; }
    if (n.unit === '%') return { el: cnt(Math.round(n.cur * 1000) / 10, { dec: 1 }), unit: '%' };
    if (n.unit === '天') return { el: cnt(Math.round(n.cur)), unit: '天' };
    return { el: cnt(Math.round(n.cur)), unit: n.unit };
  }
  function devOf(n) {
    if (n.budget != null) return { v: n.devBudget, text: '较预算 ' + n.devBudgetText };
    return { v: n.delta, text: '较上期 ' + n.deltaText };
  }
  function isBad(n) { var d = devOf(n).v; return n.good === 'up' ? d < 0 : n.good === 'down' ? d > 0 : false; }
  function tilePct(n) {
    var ref = n.budget != null ? n.budget : n.prev;
    if (!ref || !n.cur) return 60;
    var r = n.good === 'down' ? ref / n.cur : n.cur / ref;
    if (!isFinite(r) || r < 0) r = 0;
    return Math.max(6, Math.min(100, Math.round(r * 100)));
  }
  function focusFactor() { var A = M.R.attribution; if (!M.factor || !A.leaves.some(function (x) { return x.id === M.factor; })) M.factor = A.rootCause ? A.rootCause.id : (A.leaves[0] || {}).id; return A.leaves.filter(function (x) { return x.id === M.factor; })[0]; }
  function attrOf(id) { return LIB.metricTree.attributable.indexOf(id) >= 0; }
  function pickMetric(n) {
    if (attrOf(n.id)) { M.metric = n.id; M.factor = null; return; }
    var grp = LIB.metricTree.groups.filter(function (x) { return x.key === n.group; })[0];
    M.metric = grp && attrOf(grp.root) ? grp.root : 'profit'; M.factor = n.id;
  }
  function riskNodes() {
    var N = M.R.tree.nodes;
    return Object.keys(N).filter(function (id) { return N[id].status !== 'ok'; }).sort(function (a, b) {
      var ra = N[a].status === 'risk' ? 0 : 1, rb = N[b].status === 'risk' ? 0 : 1;
      if (ra !== rb) return ra - rb;
      return Math.abs(devOf(N[b]).v || 0) - Math.abs(devOf(N[a]).v || 0);
    }).map(function (id) { return N[id]; });
  }

  /* 方案库里两条旧文案的叫法与排程口径对不上，取一份副本按现叫法改过来；参数键、金额、见效月份都不动 */
  var PB_RENAME = [['设最低起订量', '设起订量'], ['承诺交期', '排程交期'], ['按排程承诺', '按排程下发']];
  var PB_LIB = null;
  function playbookLib(pb) {
    if (PB_LIB) return PB_LIB;
    var s = JSON.stringify(pb);
    PB_RENAME.forEach(function (w) { s = s.split(w[0]).join(w[1]); });
    PB_LIB = JSON.parse(s);
    return PB_LIB;
  }

  /* 现场引导：每一屏箭头该指哪个按钮（按钮文字前缀匹配）。'next' = 本屏是总览，直接指屏底「下一步」。
     不靠「猜本屏第一个主按钮」，那样总览屏会指到角落里一张卡的侧向操作上去。 */
  var GUIDE_AIM = { connect: '进入决策驾驶舱', board: 'next', attr: '预演方案', options: '发起审批', approval: '发起审批', execute: '发送到微信' };

  function mount(root, step, shell) {
    sh = shell; $root = root; h = sh.h; DATA = sh.DATA; P = window.DGG.pui; K = window.DGG.coreM9;
    LIB = { metricTree: DATA.m9.metricTree, evidence: DATA.m9.evidence, playbooks: playbookLib(DATA.m9.playbooks), approvalRules: DATA.m9.approvalRules };
    P.init(sh);
    var c = sh.getCompany();
    if (!M.data) { M.company = c; M.name = c ? c.name : null; loadArche(c ? archeOf(c.industry) : archeOf(sh.displayIndustryDefault())); }
    M.step = step || 'connect';
    if (['connect', 'board', 'attr', 'options', 'approval', 'execute'].indexOf(M.step) < 0) M.step = 'connect';
    M.told = null;
    draw();
  }
  function unmount() { M.replay = null; }
  function onCompany(c) { M.company = c; M.name = c ? c.name : null; M.charged = false; loadArche(c ? archeOf(c.industry) : archeOf(sh.displayIndustryDefault())); if (M.step !== 'connect') setStep('connect'); else draw(); }
  function onIndustry(slug) { if (M.step !== 'connect' || !slug) return; var a = archeOf(slug); if (a !== M.arche) { loadArche(a); draw(); } }
  function setStep(s) { M.step = s; sh.go('m9', s); }
  function enterBoard() { setStep('board'); }

  function draw() {
    sh.clear($root);
    recompute();
    var R = M.R, c = M.company, k = R.kpi;
    var meta = c ? [sh.industryNameOf(c.industry), sh.optText('size', c.size)].filter(Boolean).join(' · ') : '';
    var tabs = [{ key: 'connect', label: '接入' }, { key: 'board', label: '决策驾驶舱', badge: k.risk || 0 }, { key: 'attr', label: '指标归因' }, { key: 'options', label: '方案预演' }, { key: 'approval', label: '审批', badge: k.pending || 0 }, { key: 'execute', label: '执行与复盘', badge: k.overdueMilestones || 0 }];
    var F = P.frame({ mark: '决策', accent: ACCENT, modules: P.navModules('m9'), crumbs: ['AI决策', tabs.filter(function (t) { return t.key === M.step; })[0].label], company: { name: M.data.company, meta: meta + (meta ? ' · ' : '') + M.data.period.replace('-', ' 年 ') + ' 月账期' }, tabs: tabs, active: M.step, guideAim: GUIDE_AIM[M.step],
      chat: { id: 'm9', name: 'AI决策', step: M.step, onGo: setStep },
      onTab: function (key) { if (key === 'board' && !M.charged) enterBoard(); else setStep(key); } });
    M.frame = F; $root.appendChild(F.root);
    if (M.step === 'board' && !M.charged) { M.charged = true; sh.charge(K.CREDITS); }
    ({ connect: screenConnect, board: screenBoard, attr: screenAttr, options: screenOptions, approval: screenApproval, execute: screenExecute })[M.step](F.work);
  }

  /* ---------- 屏 1 接入 ---------- */
  function screenConnect(work) {
    var d = M.data, R = M.R, k = R.kpi, T = R.tree;
    work.classList.add('m9-connect');
    var g = h('div', { class: 'pd-grid' });
    var rows = d.sources.reduce(function (t, s) { return t + s.rows; }, 0);
    var fb = flowBar({ src: d.sources.map(function (s) { return [srcName(s), fmtN(s.rows) + ' 条']; }),
      hub: '指标对账', out: [LIB.metricTree.nodes.length + ' 节点', '风险 ' + T.counts.risk], btn: '重新对账' });
    g.appendChild(fb);
    g.appendChild(h('div', { class: 'c12' }, [P.kpis([
      { label: '指标节点', value: cnt(LIB.metricTree.nodes.length), unit: '个', sub: d.period + ' 账期' },
      { label: '风险', value: cnt(T.counts.risk), unit: '项', tone: T.counts.risk ? 'late' : 'ok', sub: '容差外' },
      { label: '关注', value: cnt(T.counts.watch), unit: '项', tone: 'risk', sub: '贴着容差' },
      { label: '数据源', value: cnt(d.sources.length), unit: '个', sub: fmtN(rows) + ' 条' },
      { label: '决议台账', value: cnt(d.decisions.length), unit: '项', tone: 'accent', sub: '执行中 ' + k.executing }
    ])]));
    var reds = riskNodes().filter(function (n) { return n.status === 'risk'; }).slice(0, 3).map(function (n) { return n.name; });
    var say = vd(T.counts.risk ? T.counts.risk + ' 项指标亮红：' + reds.join('、') + '；' + T.counts.watch + ' 项贴着容差。' : '31 个指标节点全部在容差内。');
    g.appendChild(say);
    var tbl = P.table({ compact: true, cols: [
      { key: 'name', label: '模块', render: function (s) { return h('span', {}, [h('b', {}, [srcName(s)]), h('span', { class: 'sub' }, [String(s.name).split(' · ')[1] || ''])]); } },
      { key: 'mode', label: '接入', w: '110px', render: function (s) { return P.chip(s.mode === 'direct' ? 'ok' : 'watch', s.mode === 'direct' ? '模块直连' : '表格导入'); } },
      { key: 'lastSync', label: '同步', w: '160px' },
      { key: 'rows', label: '条数', align: 'r', sort: true, render: function (s) { return fmtN(s.rows) + ' 条'; } }
    ], rows: d.sources });
    tagRows(tbl, d.sources, srcName, function (x) { return x.id; });
    var scard = P.card({ cls: 'c8', title: '数据源', sub: d.sources.length + ' 个模块', tight: true, body: [tbl] });
    g.appendChild(scard);
    var nameIn = h('input', { type: 'text', value: d.company, oninput: function (e) { M.name = e.target.value; d.company = e.target.value; var co = M.frame.root.querySelector('.pd-top .co span:nth-child(2)'); if (co) co.textContent = e.target.value; } });
    var ccard = P.card({ cls: 'c4', title: '企业', body: [h('div', { class: 'pd-form' }, [
      h('div', { class: 'pd-field' }, [h('label', {}, ['企业名称']), nameIn]),
      h('div', { class: 'pd-field' }, [h('label', {}, ['行业']), h('div', { style: 'font-weight:600' }, [M.company ? sh.industryNameOf(M.company.industry) + (M.company.size ? ' · ' + sh.optText('size', M.company.size) : '') : sh.industryNameOf(sh.displayIndustryDefault())])]),
      h('div', { class: 'pd-field' }, [h('label', {}, ['账期']), h('div', { style: 'font-weight:600' }, [d.period.replace('-', ' 年 ') + ' 月 · 序列 ' + d.months.length + ' 个月'])])
    ])] });
    g.appendChild(ccard);
    var go = h('div', { class: 'c12 go' }, [
      h('div', {}, [h('div', { class: 't' }, ['决策驾驶舱']), h('div', { class: 's' }, ['经营利润 ' + W(k.profit) + ' · 较上期 ' + K.fmtSigned(k.profitDelta, W) + ' · 风险 ' + T.counts.risk + ' · 执行中 ' + k.executing])]),
      h('div', { class: 'sp' }), h('div', { class: 'cr' }, [h('b', { class: 'num' }, [String(K.CREDITS)]), ' 积分 / 次']),
      P.btn('进入决策驾驶舱', { cls: 'primary big', onClick: enterBoard })]);
    g.appendChild(go);
    work.appendChild(g);
    story({ work: work, src: fb.srcs, from: fb.srcs[0], to: fb.hub, tail: fb.out, label: fmtN(rows) + ' 条',
      scan: scard, verdict: say, rise: [scard, ccard, go], rows: trs(tbl),
      focus: work.querySelector('.pd-kpi.late') });
  }

  /* ---------- 屏 2 决策驾驶舱 ---------- */
  function openGroup(grp) {
    var N = M.R.tree.nodes;
    var tbl = P.table({ compact: true, cols: [
      { key: 'name', label: '指标' },
      { key: 'curText', label: '本期', align: 'r' },
      { key: 'dev', label: '偏差', align: 'r', render: function (n) { return h('span', { class: isBad(n) ? 'neg' : 'pos' }, [devOf(n).text]); } },
      { key: 'status', label: '状态', w: '76px', render: function (n) { return stChip(n.status); } },
      { key: 'sourceName', label: '来源', w: '92px' }
    ], rows: grp.nodes, onRow: function (n) { pickMetric(n); setStep('attr'); } });
    P.drawer(M.frame.body, { title: grp.name + ' · ' + grp.nodes.length + ' 个指标', sub: M.data.period + ' 账期 · ' + N[grp.root].name + ' ' + N[grp.root].curText,
      body: [tbl], actions: [P.btn('去归因', { cls: 'primary', onClick: function () { pickMetric(N[grp.root]); setStep('attr'); } })] });
  }
  function screenBoard(work) {
    var R = M.R, k = R.kpi, d = M.data, T = R.tree, A = R.attribution, N = T.nodes;
    work.classList.add('m9-board');
    var g = h('div', { class: 'pd-grid' });
    var fb = flowBar({ src: d.sources.map(function (s) { return [srcName(s), fmtN(s.rows) + ' 条']; }),
      hub: '指标树 ' + LIB.metricTree.nodes.length + ' 节点', out: ['风险 ' + T.counts.risk, '关注 ' + T.counts.watch], btn: '重算指标' });
    g.appendChild(fb);
    function goAttr(id) { return function () { M.metric = attrOf(id) ? id : 'profit'; M.factor = attrOf(id) ? null : id; setStep('attr'); }; }
    g.appendChild(h('div', { class: 'c12' }, [P.kpis([
      { label: '经营利润', value: cnt(Math.round(k.profit / 1000) / 10, { dec: 1 }), unit: '万元', tone: STATUS_TONE[N.profit.status], sub: devOf(N.profit).text, onClick: goAttr('profit') },
      { label: '收入', value: cnt(Math.round(k.rev / 10000)), unit: '万元', tone: STATUS_TONE[N.rev.status], sub: devOf(N.rev).text, onClick: goAttr('rev') },
      { label: '毛利率', value: cnt(Math.round(k.gm * 1000) / 10, { dec: 1 }), unit: '%', tone: STATUS_TONE[N.gm.status], sub: devOf(N.gm).text, onClick: goAttr('gm') },
      { label: '现金周期', value: cnt(Math.round(k.ccc)), unit: '天', tone: STATUS_TONE[N.ccc.status], sub: '回款 ' + N.dso.curText, onClick: goAttr('ccc') },
      { label: '准时交付率', value: cnt(Math.round(k.onTimeRate * 1000) / 10, { dec: 1 }), unit: '%', tone: STATUS_TONE[N.onTimeRate.status], sub: '延期 ' + N.lateOrders.curText },
      { label: '合规敞口', value: cnt(Math.round(k.complianceExposure / 1000) / 10, { dec: 1 }), unit: '万元', tone: STATUS_TONE[N.complianceExposure.status], sub: '高风险合同 ' + N.highRiskContracts.curText }
    ])]));
    var say = vd('经营利润 ' + W(k.profit) + '，较上期 ' + K.fmtSigned(k.profitDelta, W) + (A.rootCause ? '，主因 ' + A.rootCause.name + ' ' + A.rootCause.valueText : '') + '。');
    g.appendChild(say);
    /* 指标树压成六张组瓦片：一个大数字 + 一个趋势符号 + 一根达成条；点开抽屉看全组明细 */
    var tiles = h('div', { class: 'm9-tiles' });
    T.groups.forEach(function (grp) {
      var root = N[grp.root], c = cntOf(root), dv = devOf(root), bad = isBad(root);
      var off = grp.nodes.filter(function (n) { return n.status !== 'ok'; }).length;
      var tgt = d.docTargets && d.docTargets[grp.root];
      tiles.appendChild(h('button', { class: 'm9-tile ' + root.status, 'data-ref': root.id, onclick: function () { openGroup(grp); } }, [
        h('div', { class: 'h' }, [h('b', {}, [grp.name]), h('span', { class: 'sp' }), stChip(root.status)]),
        h('div', { class: 'v' }, [c.el, h('span', { class: 'u' }, [c.unit]), h('span', { class: 'ar ' + (bad ? 'neg' : 'pos') }, [dv.v === 0 ? '→' : (dv.v > 0 ? '↑' : '↓')])]),
        h('div', { class: 'd' }, [h('span', { class: bad ? 'neg' : 'pos' }, [dv.text]), h('span', { class: 'nm' }, [root.name])]),
        h('div', { class: 'trk' }, [h('i', { 'data-to': String(tilePct(root)), class: root.status })]),
        h('div', { class: 'f' }, [grp.nodes.length + ' 项', h('span', { class: 'sp' }), h('span', {}, [off ? '容差外 ' + off : '全部达标']), tgt ? h('b', { class: 'tg' }, ['目标 ' + tgt.text]) : null])
      ]));
    });
    g.appendChild(P.card({ cls: 'c8', title: '指标树', sub: LIB.metricTree.nodes.length + ' 节点 · 点组看明细', body: [tiles] }));
    var right = col('c4', []);
    var devs = h('div', { class: 'pd-list' });
    riskNodes().slice(0, 5).forEach(function (n) {
      devs.appendChild(tagRef(P.item({ tone: STATUS_TONE[n.status] === 'late' ? 'late' : 'risk', icon: GROUP_ICON[n.group] || '·', title: n.name + ' ' + n.curText, sub: n.sourceName, right: devOf(n).text.replace(/^较\S{2}\s/, ''), rightSub: n.budget != null ? '较预算' : '较上期', onClick: function () { pickMetric(n); setStep('attr'); } }), n.id));
    });
    if (!devs.childNodes.length) devs.appendChild(P.empty('全部指标在容差内'));
    var dcard = P.card({ title: '偏差榜', sub: '容差外 ' + (T.counts.risk + T.counts.watch) + ' 项', body: [devs] });
    right.appendChild(dcard);
    var ds = h('div', { class: 'pd-list' });
    d.approvals.filter(function (a) { return a.status === 'pending'; }).forEach(function (a) { ds.appendChild(tagRef(P.item({ tone: 'risk', icon: '批', title: a.id + ' ' + a.option.name, sub: '根因 ' + a.causeName, right: K.fmtSigned(a.totals.netBenefit, W), rightSub: '净效益', onClick: function () { M.approval = a.id; setStep('approval'); } }), a.id)); });
    R.decisions.filter(function (x) { return x.status === 'executing'; }).slice(0, 3).forEach(function (x) { ds.appendChild(tagRef(P.item({ tone: x.overdue.length ? 'late' : 'accent', icon: '议', title: x.id + ' ' + cut(x.title, 12), sub: x.next ? short(x.next.due) + ' ' + cut(x.next.title, 10) : '节点已完成', right: x.progress + '%', rightSub: x.done + ' / ' + x.total, onClick: function () { M.decision = x.id; setStep('execute'); } }), x.id)); });
    if (!ds.childNodes.length) ds.appendChild(P.empty('台账里没有在途决议'));
    right.appendChild(P.card({ title: '决策状态', sub: '待批 ' + k.pending + ' · 执行中 ' + k.executing, body: [ds], foot: [P.btn('去归因', { cls: 'sm', onClick: function () { setStep('attr'); } })] }));
    g.appendChild(right);
    work.appendChild(g);
    story({ work: work, src: fb.srcs, from: fb.srcs[2], to: fb.hub, tail: fb.out, label: LIB.metricTree.nodes.length + ' 个节点',
      scan: dcard, verdict: say, pop: nodeList(work, '.m9-tile'), bars: nodeList(work, '.m9-tile .trk i'),
      rows: nodeList(work, '.pd-list .pd-item'), rise: [dcard], focus: work.querySelector('.m9-tile') });
  }

  /* ---------- 屏 3 指标归因 ---------- */
  function screenAttr(work) {
    var R = M.R, d = M.data, A = R.attribution, N = R.tree.nodes, F = focusFactor();
    work.classList.add('m9-attr');
    var g = h('div', { class: 'pd-grid' });
    var bySrc = {};
    A.leaves.forEach(function (x) { bySrc[x.sourceName] = (bySrc[x.sourceName] || 0) + 1; });
    var fb = flowBar({ src: Object.keys(bySrc).slice(0, 4).map(function (s) { return [s, bySrc[s] + ' 个因子']; }),
      hub: '连环替代', out: [A.rootCause ? A.rootCause.name : '—', A.rootCause ? A.rootCause.valueText : '在容差内'], btn: '重新归因' });
    g.appendChild(fb);
    g.appendChild(h('div', { class: 'c12' }, [P.kpis([
      { label: A.name + ' · 本期', value: cnt(Math.round(A.to / 1000) / 10, { dec: 1 }), unit: '万元', sub: '基期 ' + A.fromText },
      { label: '变动', value: A.deltaText, tone: A.delta === 0 ? 'ok' : (N[A.metric].good === 'down' ? A.delta > 0 : A.delta < 0) ? 'late' : 'ok', sub: A.basisName },
      { label: '主因', value: A.rootCause ? A.rootCause.name : '—', tone: 'accent', sub: A.rootCause ? A.rootCause.factorText : '因子都在容差内' },
      { label: '主因贡献', value: A.rootCause ? A.rootCause.valueText : '—', tone: 'late', sub: A.rootCause ? '占变动 ' + Math.round(Math.abs(A.rootCause.share) * 100) + '%' : '' }
    ])]));
    var say = vd((F === A.rootCause ? '主因 ' : '') + F.name + ' ' + F.factorText + '，贡献 ' + F.valueText + '。');
    g.appendChild(say);
    var mchips = h('div', { class: 'chips' }, LIB.metricTree.attributable.map(function (id) { return h('button', { class: M.metric === id ? 'on' : '', onclick: function () { M.metric = id; M.factor = null; draw(); } }, [N[id].name]); }));
    var bchips = h('div', { class: 'chips' }, ['prev', 'avg3'].map(function (b) { return h('button', { class: M.basis === b ? 'on' : '', onclick: function () { M.basis = b; draw(); } }, [K.BASIS_NAME[b]]); }));
    var wfItems = A.leaves.slice(0, 7).map(function (x) { return { id: x.id, label: x.name, value: x.value }; });
    var rest = A.leaves.slice(7); if (rest.length) wfItems.push({ id: null, label: '其他', value: rest.reduce(function (t, x) { return t + x.value; }, 0) });
    var unit = N[A.metric].unit;
    var fmt = unit === '元' ? function (v) { return Math.abs(v) >= 10000 ? (Math.round(v / 1000) / 10) + ' 万' : fmtN(v); } : unit === '%' ? function (v) { return (Math.round(v * 1000) / 10) + '%'; } : unit === '天' ? function (v) { return Math.round(v * 10) / 10 + ' 天'; } : function (v) { return fmtN(v); };
    var axisFmt = unit === '元' ? function (v) { return Math.round(v / 10000) + '万'; } : unit === '%' ? function (v) { return Math.round(v * 100) + '%'; } : function (v) { return Math.round(v) + ''; };
    var wf = P.waterfall({ start: { label: '基期', value: A.from }, end: { label: '本期', value: A.to }, items: wfItems, fmt: fmt, axisFmt: axisFmt, active: M.factor, onPick: function (id) { if (id) { M.factor = id; draw(); } }, width: 880, height: 268 });
    g.appendChild(P.card({ cls: 'c7', title: '贡献瀑布', sub: A.fromText + ' → ' + A.toText, body: [h('div', { class: 'ctl', style: 'margin-bottom:10px' }, [mchips, bchips]), wf] }));
    var tbl = P.table({ compact: true, cols: [
      { key: 'name', label: '因子' },
      { key: 'factorText', label: '因子变动' },
      { key: 'value', label: '贡献', align: 'r', sort: true, sortDesc: true, render: function (x) { return h('span', { class: x.hurt ? 'neg' : 'pos' }, [x.valueText]); } },
      { key: 'sourceName', label: '来源', w: '92px' }
    ], rows: A.leaves, rowKey: function (x) { return x.id; }, activeKey: M.factor, onRow: function (x) { M.factor = x.id; draw(); } });
    tagRows(tbl, A.leaves, function (x) { return x.name; }, function (x) { return x.id; });
    var fcard = P.card({ cls: 'c5', title: '因子表', sub: A.leaves.length + ' 个因子', tight: true, body: [h('div', { class: 'm9-sc', style: 'max-height:296px' }, [tbl])] });
    g.appendChild(fcard);
    /* 证据只留标题与来源，细节问对话坞 */
    var ev = K.evidence(d, LIB, F.id, F.direction);
    var evl = h('div', { class: 'm9-ev' });
    ev.slice(0, 3).forEach(function (e) {
      evl.appendChild(h('div', { class: 'ev' }, [P.chip('accent', e.moduleName, true), h('b', {}, [e.title]), h('span', { class: 'sp' }), P.btn('去看', { cls: 'sm', onClick: function () { goModule(e.module, e.screen); } })]));
    });
    if (!ev.length) evl.appendChild(P.empty('这个因子没有证据卡'));
    var acts = h('div', { class: 'pd-actions' });
    var pk = K.playbookKey(LIB, F.id);
    acts.appendChild(h('div', { class: 'pd-action best' }, [h('div', { class: 't' }, [h('span', { class: 'rank' }, ['1']), '锁定 ' + F.name + ' 预演方案']),
      P.btn('预演方案', { cls: 'primary sm', disabled: !pk, onClick: function () { M.cause = F.id; M.option = null; setStep('options'); } }),
      h('div', { class: 'd' }, [pk ? '方案库 ' + LIB.playbooks.causes[pk].options.length + ' 个方案' : '方案库还没有对应方案'])]));
    if (A.rootCause && A.rootCause.id !== F.id) acts.appendChild(h('div', { class: 'pd-action' }, [h('div', { class: 't' }, [h('span', { class: 'rank' }, ['2']), '回到主因 ' + A.rootCause.name]),
      P.btn('切换', { cls: 'sm', onClick: function () { M.factor = A.rootCause.id; draw(); } }), h('div', { class: 'd' }, [A.rootCause.factorText])]));
    var jcard = P.card({ cls: 'c12', title: 'AI 判断 · ' + F.name, sub: '剔除一次性项后判定', accent: true, body: [evl, acts] });
    g.appendChild(jcard);
    work.appendChild(g);
    story({ work: work, src: fb.srcs, from: fb.srcs[0], to: fb.hub, tail: fb.out, label: A.leaves.length + ' 个因子',
      scan: fcard, verdict: say, pop: nodeList(work, '.pd-waterfall g.bar'), paths: nodeList(work, '.pd-waterfall line[stroke-dasharray]'),
      rows: trs(tbl), rise: [jcard], focus: rowOf(work, F.name) });
  }

  /* ---------- 屏 4 方案预演 ---------- */
  function causeList() {
    var A = M.R.attribution, causes = [];
    if (A.rootCause && K.playbookKey(LIB, A.rootCause.id)) causes.push(A.rootCause.id);
    A.hurts.forEach(function (x) { if (causes.indexOf(x.id) < 0 && K.playbookKey(LIB, x.id)) causes.push(x.id); });
    return causes;
  }
  function simNow() {
    var d = M.data, causes = causeList();
    if (!M.cause || !K.playbookKey(LIB, M.cause)) M.cause = causes[0] || 'orders';
    var S = K.simulateAll(d, LIB, M.cause, M.params[M.cause] || {});
    if (!S.sims.length) return null;
    if (!M.option || !S.sims.some(function (s) { return s.option.key === M.option; })) M.option = S.recommended;
    return { S: S, sim: S.sims.filter(function (s) { return s.option.key === M.option; })[0] };
  }
  function screenOptions(work) {
    var d = M.data, N = M.R.tree.nodes, now = simNow();
    work.classList.add('m9-options');
    var g = h('div', { class: 'pd-grid' });
    if (!now) { g.appendChild(P.card({ cls: 'c12', title: '方案预演', body: [P.empty('方案库还没有对应方案')] })); work.appendChild(g); return; }
    var S = now.S, sim = now.sim, opt = sim.option, T = sim.totals;
    var existing = d.approvals.filter(function (a) { return a.causeId === M.cause && a.option.key === M.option && a.status !== 'rejected'; })[0];
    var causes = causeList(); if (causes.indexOf(M.cause) < 0) causes.unshift(M.cause);
    var fb = flowBar({ src: [['根因', N[M.cause].name], ['方案库', S.sims.length + ' 个方案'], ['参数', sim.option.params.length + ' 项']],
      hub: '12 个月预演', out: [K.fmtSigned(T.netBenefit, W), '净效益'], btn: '重新预演' });
    g.appendChild(fb);
    g.appendChild(h('div', { class: 'c12' }, [P.kpis([
      { label: '当前方案', value: opt.key, tone: 'accent', sub: cut(opt.name, 14) },
      { label: '12 个月净效益', value: cnt(Math.round(T.netBenefit / 1000) / 10, { dec: 1 }), unit: '万元', tone: T.netBenefit >= 0 ? 'ok' : 'late', sub: '利润增量减投入' },
      { label: '一次性投入', value: opt.invest ? W(opt.invest) : '无', sub: opt.invest ? '预计' : '不占用现金' },
      { label: '见效', value: cnt(opt.leadMonths), unit: '个月', sub: '风险 ' + RISK_NAME[opt.risk] },
      { label: '期末毛利率', value: cnt(Math.round(T.gmEnd * 1000) / 10, { dec: 1 }), unit: '%', sub: '现状 ' + (Math.round(T.gmBase * 1000) / 10) + '%' },
      { label: '期末准时率', value: cnt(Math.round(T.onTimeEnd * 100)), unit: '%', sub: '现状 ' + Math.round(T.onTimeBase * 100) + '%' }
    ])]));
    var say = vd('方案 ' + opt.key + ' ' + opt.name + '：12 个月净效益 ' + K.fmtSigned(T.netBenefit, W) + '，投入 ' + (opt.invest ? W(opt.invest) + '（预计）' : '无') + '。');
    g.appendChild(say);
    var colors = { A: '#4974F6', B: '#C2255C', C: '#E8A33D' };
    /* 累计净效益：逐月把「方案利润减现状利润」攒起来，投入在见效月一次性扣掉，末月落到净效益 */
    var cum = function (s) { var t = 0; return s.months.map(function (m, i) { t += m.profitNet - s.base[i].profit; return Math.round(t / 1000) / 10; }); };
    var line = P.lineChart({ labels: sim.labels.map(function (l) { return (+l.slice(5)) + '月'; }), right: true,
      series: [{ values: sim.base.map(function () { return 0; }), color: '#98A2B8', fmt: function (v) { return v + ' 万'; } }].concat(S.sims.map(function (s) { return { values: cum(s), color: colors[s.option.key], fmt: function (v) { return v + ' 万'; } }; })),
      height: 226, width: 900 });
    var lcard = P.card({ cls: 'c8', title: '累计净效益', sub: '万元 · 12 个月', body: [line,
      h('div', { class: 'pd-legend', style: 'margin-top:8px' }, [h('span', {}, [h('i', { style: 'background:#98A2B8' }), '现状'])].concat(S.sims.map(function (s) { return h('span', {}, [h('i', { style: 'background:' + colors[s.option.key] }), s.option.key]); })))] });
    g.appendChild(lcard);
    var cchips = h('div', { class: 'chips', style: 'margin-bottom:10px' }, causes.slice(0, 5).map(function (id) { return h('button', { class: M.cause === id ? 'on' : '', onclick: function () { M.cause = id; M.option = null; draw(); } }, [N[id].name]); }));
    var pm = h('div', { class: 'm9-params' });
    opt.params.forEach(function (p) {
      var cur = sim.params[p.key];
      var inp = h('input', { type: 'range', min: p.min, max: p.max, step: p.step, value: cur, oninput: function (e) { setParam(p.key, +e.target.value); } });
      pm.appendChild(h('div', { class: 'pm' }, [h('label', {}, [p.label, h('b', { class: 'num' }, [cur + ' ' + p.unit])]), inp, h('div', { class: 'mm' }, [h('span', {}, [p.min + ' ' + p.unit]), h('span', {}, [p.max + ' ' + p.unit])])]));
    });
    var pcard = P.card({ cls: 'c4', title: '方案 ' + opt.key + ' · 参数', sub: cut(opt.name, 16),
      body: [cchips, pm, h('div', { class: 'm9-opt-meta', style: 'margin-top:14px' }, [
        h('div', { class: 'r' }, [h('span', {}, ['责任']), h('b', {}, [opt.owner])]),
        h('div', { class: 'r' }, [h('span', {}, ['现金影响']), h('b', { class: T.cashDelta12 >= 0 ? 'pos' : 'neg' }, [K.fmtSigned(T.cashDelta12, W)])]),
        h('div', { class: 'r' }, [h('span', {}, ['执行节点']), h('b', {}, [opt.milestones.length + ' 个'])])
      ])],
      foot: [existing ? P.chip(existing.status === 'approved' ? 'ok' : 'watch', existing.id + ' ' + AP_NAME[existing.status]) : P.btn('发起审批', { cls: 'primary', onClick: function () { submitNow(); } }),
        existing && existing.status === 'approved' ? P.btn('看决议', { cls: 'sm', onClick: function () { M.decision = existing.decisionId; setStep('execute'); } }) : existing ? P.btn('看审批单', { cls: 'sm', onClick: function () { M.approval = existing.id; setStep('approval'); } }) : null] });
    g.appendChild(pcard);
    var cmp = P.compare({ active: M.option, onPick: function (key) { M.option = key; draw(); }, options: S.sims.map(function (s) {
      var Z = s.totals;
      return { key: s.option.key, name: s.option.name, recommended: s.recommended,
        headline: { big: K.fmtSigned(Z.netBenefit, W), sub: '12 个月净效益', tone: Z.netBenefit >= 0 ? 'ok' : 'late' },
        rows: [{ k: '利润增量', v: K.fmtSigned(Z.profitDelta12, W), tone: Z.profitDelta12 >= 0 ? 'good' : 'bad' },
          { k: '现金影响', v: K.fmtSigned(Z.cashDelta12, W), tone: Z.cashDelta12 >= 0 ? 'good' : 'bad' },
          { k: '期末毛利率', v: (Math.round(Z.gmEnd * 1000) / 10) + '%' },
          { k: '期末准时率', v: Math.round(Z.onTimeEnd * 100) + '%' },
          { k: '投入', v: s.option.invest ? W(s.option.invest) + '（预计）' : '无' },
          { k: '见效 · 风险', v: s.option.leadMonths + ' 个月 · ' + RISK_NAME[s.option.risk] }] };
    }) });
    g.appendChild(P.card({ cls: 'c12', title: '方案对比', sub: S.sims.length + ' 个方案', body: [cmp] }));
    work.appendChild(g);
    story({ work: work, src: fb.srcs, from: fb.srcs[1], to: fb.hub, tail: fb.out, label: opt.key + ' ' + cut(opt.name, 8),
      scan: lcard, verdict: say, paths: nodeList(work, '.pd-line path'), dots: nodeList(work, '.pd-line circle'), pop: nodeList(work, '.pd-option'),
      rise: [pcard], focus: work.querySelector('.pd-option.on') });
  }
  function setParam(key, v) {
    M.params[M.cause] = M.params[M.cause] || {};
    M.params[M.cause][M.option] = M.params[M.cause][M.option] || {};
    M.params[M.cause][M.option][key] = v;
    draw();
  }
  function submitNow() {
    var now = simNow(); if (!now) return;
    var d2 = K.submit(M.data, LIB, M.cause, M.option, now.sim.params);
    M.approval = d2.approvals[d2.approvals.length - 1].id;
    M.data = d2; recompute(); setStep('approval');
  }
  /* 台账里还没有单子时说「批准」：发起与终批一次走完，落单 + 转决议 */
  function submitAndApprove() {
    var now = simNow(); if (!now) return;
    var d2 = K.submit(M.data, LIB, M.cause, M.option, now.sim.params);
    var ap = d2.approvals[d2.approvals.length - 1];
    var d3 = K.approve(d2, LIB, ap.id, '');
    M.approval = ap.id;
    if (d3.decisions.length) M.decision = d3.decisions[0].id;
    M.data = d3; recompute(); setStep('execute');
  }

  /* ---------- 屏 5 审批 ---------- */
  function draftOf() {
    var d = M.data, A = M.R.attribution;
    var cause = M.cause && K.playbookKey(LIB, M.cause) ? M.cause : (A.rootCause && K.playbookKey(LIB, A.rootCause.id) ? A.rootCause.id : null);
    if (!cause) return null;
    var S = K.simulateAll(d, LIB, cause, M.params[cause] || {});
    var key = M.option && S.sims.some(function (s) { return s.option.key === M.option; }) ? M.option : S.recommended;
    var sim = S.sims.filter(function (s) { return s.option.key === key; })[0];
    if (!sim) return null;
    return { cause: cause, causeName: S.causeName, sim: sim, opinions: K.opinions(LIB, sim, d.facts) };
  }
  function screenApproval(work) {
    var R = M.R, d = M.data, k = R.kpi, list = d.approvals.slice().reverse(), N = R.tree.nodes;
    work.classList.add('m9-approval');
    if (!M.approval || !list.some(function (a) { return a.id === M.approval; })) M.approval = list.length ? (list.filter(function (a) { return a.status === 'pending'; })[0] || list[0]).id : null;
    var ap = M.approval ? list.filter(function (a) { return a.id === M.approval; })[0] : null;
    var dr = ap ? null : draftOf();
    var ops = ap ? ap.opinions : dr ? dr.opinions : [];
    var T = ap ? ap.totals : dr ? dr.sim.totals : null;
    var opt = ap ? ap.option : dr ? dr.sim.option : null;
    var agree = ops.filter(function (o) { return o.opinion === 'agree'; }).length;
    var obj = ops.filter(function (o) { return o.opinion === 'object'; }).length;
    var cond = ops.filter(function (o) { return o.opinion === 'cond'; }).length;
    var g = h('div', { class: 'pd-grid' });
    var fb = flowBar({ src: [['预演结果', T ? K.fmtSigned(T.netBenefit, W) : '—'], ['会签规则', LIB.approvalRules.signers.length + ' 位'], ['终批', LIB.approvalRules.final.role]],
      hub: '会签核算', out: [ap ? AP_NAME[ap.status] : dr ? '拟稿 1' : '台账为空', ap ? ap.id : dr ? opt.key + ' ' + cut(opt.name, 8) : '—'], btn: '重新核签' });
    g.appendChild(fb);
    g.appendChild(h('div', { class: 'c12' }, [P.kpis([
      { label: '待终批', value: cnt(k.pending), unit: '单', tone: k.pending ? 'risk' : 'ok', sub: dr ? '拟稿 1 份' : '会签已出' },
      { label: '本期批准', value: cnt(k.approved), unit: '单', tone: 'ok', sub: '已进台账' },
      { label: '会签同意', value: cnt(agree), unit: '位', tone: 'ok', sub: '共 ' + LIB.approvalRules.signers.length + ' 位' },
      { label: '反对 · 有条件', value: obj + ' · ' + cond, tone: obj ? 'late' : cond ? 'risk' : 'ok', sub: obj ? '要说明理由' : cond ? '带条件执行' : '无异议' },
      { label: '终批人', value: LIB.approvalRules.final.role, tone: 'accent', sub: '一人终批' }
    ])]));
    var say = vd(ap
      ? ap.id + ' 会签 ' + agree + ' 位同意' + (obj ? '、' + obj + ' 位反对' : cond ? '、' + cond + ' 位有条件' : '') + '，净效益 ' + K.fmtSigned(T.netBenefit, W) + '，' + (ap.status === 'pending' ? '待 ' + LIB.approvalRules.final.role + ' 终批' : AP_NAME[ap.status]) + '。'
      : dr ? '拟稿 ' + opt.key + ' ' + opt.name + '：会签预判 ' + agree + ' 位同意，净效益 ' + K.fmtSigned(T.netBenefit, W) + '，可发起审批。'
        : '台账里还没有审批单，先在方案预演里发起。');
    g.appendChild(say);
    var ll = h('div', { class: 'pd-list' });
    list.forEach(function (a) { ll.appendChild(tagRef(P.item({ tone: AP_TONE[a.status] === 'watch' ? 'risk' : AP_TONE[a.status] === 'ok' ? 'ok' : 'hand', icon: a.option.key, title: a.id + ' ' + cut(a.option.name, 12), sub: a.causeName + ' · ' + short(a.submittedAt), right: K.fmtSigned(a.totals.netBenefit, W), rightSub: AP_NAME[a.status], onClick: function () { M.approval = a.id; M.comment = ''; draw(); } }), a.id)); });
    if (dr) ll.appendChild(P.item({ tone: 'accent', icon: opt.key, title: '拟稿 ' + cut(opt.name, 12), sub: dr.causeName, right: K.fmtSigned(T.netBenefit, W), rightSub: '待发起' }));
    if (!list.length && !dr) ll.appendChild(P.empty('台账为空'));
    var lcard = P.card({ cls: 'c4', title: '审批台账', sub: list.length + ' 单', body: [ll], foot: [P.btn('去方案预演', { cls: 'sm', onClick: function () { setStep('options'); } })] });
    g.appendChild(lcard);
    if (!ap && !dr) { work.appendChild(g); story({ work: work, src: fb.srcs, from: fb.srcs[0], to: fb.hub, tail: fb.out, verdict: say, rise: [lcard] }); return; }
    var sign = h('div', { class: 'm9-sign' });
    ops.forEach(function (o) { sign.appendChild(h('div', { class: 's ' + o.opinion }, [h('span', { class: 'role' }, [o.role]), P.chip(OP_TONE[o.opinion], o.opinionName), h('span', { class: 'tx' }, [o.text])])); });
    var kvRows = [['方案', opt.key + ' ' + opt.name], ['参数', ap ? ap.paramText : dr.sim.option.params.map(function (x) { return x.label + ' ' + dr.sim.params[x.key] + ' ' + x.unit; }).join(' · ')],
      ['责任', opt.owner], ['一次性投入', opt.invest ? W(opt.invest) + '（预计）' : '无'],
      ['12 个月净效益', h('b', { style: 'color:var(--pa)' }, [K.fmtSigned(T.netBenefit, W)])],
      ['现金影响 · 见效', K.fmtSigned(T.cashDelta12, W) + ' · ' + opt.leadMonths + ' 个月']];
    var final;
    if (ap && ap.status === 'pending') {
      var ta = h('textarea', { placeholder: '批复意见（可空）', oninput: function (e) { M.comment = e.target.value; } }); ta.value = M.comment || '';
      final = h('div', { class: 'm9-final' }, [h('div', { class: 't' }, [LIB.approvalRules.final.role + ' 终批', obj ? P.chip('late', obj + ' 位反对') : cond ? P.chip('risk', cond + ' 位有条件') : P.chip('ok', '会签一致')]), ta,
        h('div', { class: 'btns' }, [
          P.btn('批准并形成决议', { cls: 'primary', onClick: function () { var d2 = K.approve(d, LIB, ap.id, M.comment); M.decision = d2.decisions[0].id; M.comment = ''; M.data = d2; recompute(); setStep('execute'); P.toast(M.frame.body, ap.id + ' 已批准 · 决议 ' + d2.decisions[0].id); } }),
          P.btn('驳回', { cls: 'danger', onClick: function () { var c2 = M.comment; M.comment = ''; commit(K.reject(d, LIB, ap.id, c2), ap.id + ' 已驳回'); } })])]);
    } else if (ap) {
      final = h('div', { class: 'm9-final' }, [h('div', { class: 't' }, [LIB.approvalRules.final.role + ' 终批', P.chip(AP_TONE[ap.status] === 'watch' ? 'risk' : AP_TONE[ap.status], AP_NAME[ap.status] + ' ' + short(ap.decidedAt))]),
        h('div', {}, [ap.comment ? '批复：' + ap.comment : '批复未填']),
        ap.decisionId ? h('div', {}, [P.btn('看决议 ' + ap.decisionId, { cls: 'sm', onClick: function () { M.decision = ap.decisionId; setStep('execute'); } })]) : null]);
    } else {
      final = h('div', { class: 'm9-final' }, [h('div', { class: 't' }, ['发起审批', obj ? P.chip('late', obj + ' 位反对') : cond ? P.chip('risk', cond + ' 位有条件') : P.chip('ok', '会签预判一致')]),
        h('div', {}, ['发起后进 ' + LIB.approvalRules.final.role + ' 终批队列']),
        h('div', { class: 'btns' }, [P.btn('发起审批', { cls: 'primary', onClick: function () { M.cause = dr.cause; M.option = dr.sim.option.key; submitNow(); } }),
          P.btn('改参数', { onClick: function () { M.cause = dr.cause; M.option = dr.sim.option.key; setStep('options'); } })])]);
    }
    var dcard = P.card({ cls: 'c8', title: (ap ? ap.id : '拟稿') + ' · ' + opt.name, sub: '根因 ' + (ap ? ap.causeName : dr.causeName), accent: true, body: [
      P.kv(kvRows), h('div', { class: 'm9-h' }, ['会签意见']), sign, h('div', { class: 'm9-h' }, [ap ? '终批' : '下一步']), final
    ] });
    g.appendChild(dcard);
    work.appendChild(g);
    story({ work: work, src: fb.srcs, from: fb.srcs[0], to: fb.hub, tail: fb.out, label: opt.key + ' ' + cut(opt.name, 8),
      scan: dcard, verdict: say, rows: nodeList(work, '.m9-sign .s').concat(nodeList(work, '.pd-list .pd-item')),
      rise: [lcard], focus: work.querySelector('.m9-final') });
  }

  /* ---------- 屏 6 执行与复盘 ---------- */
  function reportDrawer() {
    P.drawer(M.frame.body, { title: '决策月报 · ' + M.data.period.replace('-', ' 年 ') + ' 月', sub: '微信文本版',
      body: [h('div', { class: 'pd-pre' }, [M.R.report.text])],
      actions: [P.btn('发送到微信', { cls: 'primary', onClick: function () { sh.setQrReady(true); sh.showWeChat(); } })] });
  }
  function screenExecute(work) {
    var R = M.R, d = M.data, k = R.kpi, dec = R.decisions;
    work.classList.add('m9-exec');
    if (!M.decision || !dec.some(function (x) { return x.id === M.decision; })) {
      var pref = dec.filter(function (x) { return x.review && x.review.result === 'miss'; })[0] || dec.filter(function (x) { return x.overdue.length; })[0] || dec.filter(function (x) { return x.status === 'executing'; })[0] || dec[0];
      M.decision = pref ? pref.id : null;
    }
    var D = M.decision ? dec.filter(function (x) { return x.id === M.decision; })[0] : null;
    var g = h('div', { class: 'pd-grid' });
    var fb = flowBar({ src: dec.slice(0, 4).map(function (x) { return [x.id, x.progress + '%']; }),
      hub: '节点跟踪', out: ['逾期 ' + k.overdueMilestones, '复盘未达标 ' + k.missedReviews], btn: '刷新进度' });
    g.appendChild(fb);
    g.appendChild(h('div', { class: 'c12' }, [P.kpis([
      { label: '决议', value: cnt(dec.length), unit: '项', sub: '已完成 ' + k.doneDecisions },
      { label: '执行中', value: cnt(k.executing), unit: '项', tone: 'accent', sub: '节点跟踪中' },
      { label: '逾期节点', value: cnt(k.overdueMilestones), unit: '个', tone: k.overdueMilestones ? 'late' : 'ok', sub: k.overdueMilestones ? '要催办' : '按期推进' },
      { label: '复盘未达标', value: cnt(k.missedReviews), unit: '项', tone: k.missedReviews ? 'risk' : 'ok', sub: '目标线对实际线' },
      { label: '在途投入', value: W0(dec.filter(function (x) { return x.status === 'executing'; }).reduce(function (t, x) { return t + (x.invest || 0); }, 0)), sub: '预计' }
    ])]));
    var say = vd(!D ? '台账里还没有决议。'
      : D.review && D.review.result === 'miss' ? D.id + ' 复盘未达标：' + cut(String(D.review.text).split('；')[0], 40) + '。'
        : D.overdue.length ? D.id + ' 有 ' + D.overdue.length + ' 个节点逾期，责任 ' + D.owner + '。'
          : D.next ? D.id + ' 进度 ' + D.progress + '%，下一节点 ' + short(D.next.due) + ' ' + D.next.title + '。'
            : D.id + ' 节点全部完成，等下一期指标复盘。');
    g.appendChild(say);
    var tbl = P.table({ compact: true, cols: [
      { key: 'id', label: '决议', render: function (x) { return h('span', {}, [h('b', { class: 'id' }, [x.id]), h('span', { class: 'sub' }, [cut(x.title, 16)])]); } },
      { key: 'causeName', label: '根因', render: function (x) { return h('span', {}, [x.causeName, h('span', { class: 'sub' }, [x.owner])]); } },
      { key: 'progress', label: '进度', align: 'r', sort: true, render: function (x) { return P.bar(x.progress, x.status === 'done' ? 'ok' : x.overdue.length ? 'late' : undefined, x.done + '/' + x.total); } },
      { key: 'status', label: '状态', render: function (x) { return h('span', {}, [P.chip(x.status === 'done' ? 'ok' : x.overdue.length ? 'late' : 'accent', x.statusName), x.review ? P.chip(x.review.result === 'miss' ? 'risk' : 'ok', x.review.result === 'miss' ? '复盘未达标' : '复盘达标') : null]); } },
      { key: 'next', label: '下一节点', render: function (x) { return x.next ? short(x.next.due) + ' ' + cut(x.next.title, 12) : '—'; } }
    ], rows: dec, rowKey: function (x) { return x.id; }, activeKey: M.decision, onRow: function (x) { M.decision = x.id; draw(); } });
    tagRows(tbl, dec, function (x) { return x.id; }, function (x) { return x.id; });
    var tcard = P.card({ cls: 'c7', title: '决议台账', sub: dec.length + ' 项 · 点行看节点', tight: true, body: [tbl] });
    g.appendChild(tcard);
    var right = col('c5', []);
    var dcard = null;
    if (D) {
      var ms = h('div', { class: 'm9-ms' });
      D.milestones.forEach(function (m, i) {
        var late = m.status !== 'done' && K.days(d.today, m.due) < 0;
        ms.appendChild(h('div', { class: 'm ' + m.status + (late ? ' late' : '') }, [
          h('span', { class: 'i' }, [m.status === 'done' ? '✓' : String(i + 1)]),
          h('span', { class: 't' }, [m.title, h('span', { class: 'o' }, [m.owner || ''])]),
          h('span', { class: 'due' }, [short(m.due) + (late ? ' · 逾期 ' + (-K.days(d.today, m.due)) + ' 天' : '')]),
          m.status === 'doing' ? P.btn('完成', { cls: 'primary sm', onClick: function () { commit(K.setMilestone(d, D.id, i, 'done'), D.id + ' 节点完成'); } })
            : m.status === 'todo' ? P.btn('开始', { cls: 'sm', onClick: function () { commit(K.setMilestone(d, D.id, i, 'doing'), D.id + ' 节点开始'); } })
              : P.chip('ok', '完成')]));
      });
      var trackEl = null;
      if (D.tracking) {
        var tr = D.tracking, TN = R.tree.nodes[tr.metric];
        /* 目标与实际两条线挨得太近，图上读不出走向；本期目标 / 实际 / 差三个数直接摆出来，
           折线改画「实际减目标」的差距，从达标线 0 起画，缺口一个月比一个月深就看得见 */
        var conv = function (v) { return TN && TN.unit === '%' ? Math.round(v * 1000) / 10 : TN && TN.unit === '元' ? Math.round(v / 1000) / 10 : Math.round(v * 10) / 10; };
        var gsuf = TN && TN.unit === '%' ? ' 个点' : TN && TN.unit === '元' ? ' 万' : TN && TN.unit === '天' ? ' 天' : '';
        var ni = tr.actual.length - 1, tone = tr.onTrack ? '#22A06B' : '#D9483B';
        var gaps = tr.variance.map(conv);
        var num = function (lbl, val, cls) { return h('div', { class: 'n' }, [h('span', {}, [lbl]), h('b', { class: cls || '' }, [val])]); };
        var nums = h('div', { class: 'm9-track' }, [
          num('目标', ni >= 0 ? tr.targetText[ni] : tr.targetText[0]),
          num('实际', ni >= 0 ? tr.actualText[ni] : '下一期入账', ni >= 0 ? (tr.onTrack ? 'pos' : 'neg') : ''),
          num('差', ni >= 0 ? tr.varianceText[ni] : '—', ni >= 0 ? (tr.onTrack ? 'pos' : 'neg') : '')
        ]);
        var gline = gaps.length > 1 ? P.lineChart({ labels: tr.months.slice(0, gaps.length).map(function (l) { return (+l.slice(5)) + '月'; }), right: true, height: 118, width: 460,
          series: [{ values: gaps.map(function () { return 0; }), color: '#98A2B8', fmt: function () { return '0'; } },
            { values: gaps, color: tone, fmt: function (v) { return v + gsuf; } }] }) : null;
        trackEl = h('div', {}, [nums, gline,
          h('div', { class: 'pd-legend', style: 'margin-top:6px' }, [h('span', {}, [h('i', { style: 'background:#98A2B8' }), '达标线']),
            ni >= 0 ? h('span', {}, [h('i', { style: 'background:' + tone }), '与目标的差距 ' + tr.varianceText[ni]]) : h('span', {}, ['实际值下一期入账'])])]);
      }
      dcard = P.card({ title: D.id + ' ' + D.title, sub: D.owner + ' · ' + short(D.approvedAt) + ' 批准 · ' + D.ageDays + ' 天', accent: true, body: [
        P.kv([['投入', D.invest ? W(D.invest) + '（预计）' : '无'], ['进度', D.done + ' / ' + D.total + ' 节点']]),
        h('div', { class: 'm9-h' }, ['执行节点']), ms,
        trackEl ? h('div', { class: 'm9-h' }, ['指标跟踪 · ' + D.tracking.metricName]) : null, trackEl,
        D.review ? h('div', { class: 'm9-h' }, ['复盘 · ' + short(D.review.reviewedAt)]) : null,
        D.review ? h('div', { class: 'm9-review' + (D.review.result === 'hit' ? ' hit' : '') }, [D.review.text]) : null
      ] });
      right.appendChild(dcard);
    }
    var who = h('div', { class: 'who' });
    ['总经理', '经营班子', '各会签负责人'].forEach(function (w2, i) { who.appendChild(h('button', { class: i === M.who ? 'on' : '', onclick: function () { M.who = i; draw(); } }, [w2])); });
    var rcard = P.card({ title: '决策月报', sub: d.period.replace('-', ' 年 ') + ' 月 · 微信文本版', body: [h('div', { class: 'pd-field' }, [h('label', {}, ['收件人']), who])],
      foot: [P.btn('看全文', { cls: 'sm', onClick: reportDrawer }), P.btn('发送到微信', { cls: 'primary', onClick: function () { sh.setQrReady(true); sh.showWeChat(); } }), P.btn('回驾驶舱', { onClick: function () { setStep('board'); } })] });
    right.appendChild(rcard);
    g.appendChild(right);
    work.appendChild(g);
    story({ work: work, src: fb.srcs, from: fb.srcs[0], to: fb.hub, tail: fb.out, label: dec.length + ' 项决议',
      scan: tcard, verdict: say, paths: nodeList(work, '.pd-line path'), dots: nodeList(work, '.pd-line circle'), pop: nodeList(work, '.m9-ms .m'),
      rows: trs(tbl), rise: [rcard], focus: work.querySelector('.m9-review') || rowOf(work, M.decision) });
  }

  /* ================= 对话坞 · 内核大脑的落地 =================
     开场发现、快捷问句、问答、文档摄入全部走 DGG.coreM9 的 screens / brief / suggest / ask / ingest
     （与 skill 内核同一份实现）。这一段只做两件事：把当前上下文交出去，把内核返回的声明式动作落到页面上。 */
  function refEl(ref) {
    var w = workEl();
    if (!w || ref == null) return null;
    var el = w.querySelector('[data-ref="' + String(ref) + '"]');
    if (el) return el;
    var n = M.R.tree.nodes[ref];
    return rowOf(w, n ? n.name : String(ref));             /* 表头排序后重绘过的行，退回按文本找 */
  }
  function refocus(ref, ms) { setTimeout(function () { var el = refEl(ref); if (el) anim().pulse(el, { ms: 2200, scroll: true }); }, ms || 140); }
  /* 一条业务 id 归哪一屏：不在当前屏先换屏，重绘完再高亮 */
  function stepOfRef(ref) {
    var R = M.R;
    if (R.decisions.some(function (x) { return x.id === ref; })) return 'execute';
    if (M.data.approvals.some(function (x) { return x.id === ref; })) return 'approval';
    if (M.data.sources.some(function (s) { return s.id === ref; })) return 'connect';
    if (M.step === 'attr' && R.attribution.leaves.some(function (x) { return x.id === ref; })) return 'attr';
    if (R.tree.nodes[ref]) return 'board';
    return null;
  }
  function doFocus(ref) {
    var st = stepOfRef(ref);
    if (!st) return false;
    if (M.step !== st) { setStep(st); refocus(ref, 620); return true; }
    var el = refEl(ref);
    if (!el) return false;
    anim().pulse(el, { ms: 2200, scroll: true });
    return true;
  }
  function openPanel(a) {
    var R = M.R;
    if (a.panel === 'group') {
      var grp = R.tree.groups.filter(function (x) { return x.key === a.ref || x.root === a.ref; })[0];
      if (!grp) return false;
      if (M.step !== 'board') { setStep('board'); setTimeout(function () { var g2 = M.R.tree.groups.filter(function (x) { return x.key === grp.key; })[0]; if (g2) openGroup(g2); }, 420); }
      else openGroup(grp);
      return true;
    }
    if (a.panel === 'evidence') {
      if (!R.attribution.leaves.some(function (x) { return x.id === a.ref; })) return false;
      M.factor = a.ref;
      if (M.step !== 'attr') setStep('attr'); else draw();
      focusSel('.m9-ev', 900);
      return true;
    }
    if (a.panel === 'review') {
      var dc = R.decisions.filter(function (x) { return x.id === a.ref; })[0];
      if (!dc || !dc.review) return false;
      M.decision = dc.id;
      if (M.step !== 'execute') setStep('execute'); else draw();
      focusSel('.m9-review', 900);
      return true;
    }
    if (a.panel === 'report') {
      if (M.step !== 'execute') { setStep('execute'); setTimeout(reportDrawer, 460); }
      else reportDrawer();
      return true;
    }
    return false;
  }
  /* 写回类动作：发起审批 / 终批成决议 / 文档并入，都是内核算好新副本这边接住 */
  function applyAction(a) {
    var input = a.input || {};
    if (a.action === 'submit' || (a.action === 'approve' && !input.approvalId)) {
      if (!input.cause || !input.option || !K.playbookKey(LIB, input.cause)) return false;
      var d2 = K.submit(M.data, LIB, input.cause, input.option, input.params);
      var ap = d2.approvals[d2.approvals.length - 1];
      if (!ap) return false;
      M.cause = input.cause; M.option = input.option; M.approval = ap.id;
      if (a.action === 'submit') { M.data = d2; recompute(); setStep('approval'); return true; }
      var d3 = K.approve(d2, LIB, ap.id, '');
      if (d3.decisions.length) M.decision = d3.decisions[0].id;
      M.data = d3; recompute(); setStep('execute');
      return true;
    }
    if (a.action === 'approve') {
      var cur = M.data.approvals.filter(function (x) { return x.id === input.approvalId && x.status === 'pending'; })[0];
      if (!cur) return false;
      var d4 = K.approve(M.data, LIB, cur.id, '');
      M.approval = cur.id;
      if (d4.decisions.length) M.decision = d4.decisions[0].id;
      M.data = d4; recompute(); setStep('execute');
      return true;
    }
    return false;
  }
  /* 文档摄入：内核只给新数据副本（不吐 act —— apply 不许指回 ingest 自己），并进页面这件事由平台做。
     等回答打完再并，免得重绘把正在打字的气泡冲掉。 */
  function takeDoc(doc, step) {
    var r = K.ingest(doc, step, M.data, LIB, M.R);
    if (!r) return null;
    if (!r.data) return { text: r.text, blocks: r.blocks, ref: r.ref };
    var nd = r.data, ref = r.ref;
    var to = ref && M.R.tree.nodes[ref] ? 'board' : 'connect';        /* 对上指标的落驾驶舱，只记批次的落接入屏 */
    return { text: r.text, blocks: r.blocks, act: function () {
      M.data = nd; recompute();
      if (M.step !== to) setStep(to); else draw();
      if (ref) refocus(ref, 620);
    } };
  }
  /* 改一个参数后重算：指标 / 因子 / 基期 / 方案参数 */
  function setPath(a) {
    var R = M.R, p = String(a.path || '');
    if (p === 'metric') {
      var n = R.tree.nodes[a.value];
      if (!n) return false;
      pickMetric(n);
      if (M.step !== 'attr') setStep('attr'); else draw();
      refocus(a.value, 900);
      return true;
    }
    if (p === 'factor') {
      if (!R.attribution.leaves.some(function (x) { return x.id === a.value; })) return false;
      M.factor = a.value;
      if (M.step !== 'attr') setStep('attr'); else draw();
      refocus(a.value, 900);
      return true;
    }
    if (p === 'basis') {
      if (['prev', 'avg3'].indexOf(a.value) < 0) return false;
      M.basis = a.value;
      if (M.step !== 'attr') setStep('attr'); else draw();
      return true;
    }
    if (p.slice(0, 7) === 'params.') {
      var seg = p.slice(7).split('.');
      if (seg.length !== 3 || !K.playbookKey(LIB, seg[0])) return false;
      M.cause = seg[0]; M.option = seg[1];
      M.params[seg[0]] = M.params[seg[0]] || {};
      M.params[seg[0]][seg[1]] = M.params[seg[0]][seg[1]] || {};
      M.params[seg[0]][seg[1]][seg[2]] = a.value;
      if (M.step !== 'options') setStep('options'); else draw();
      focusSel('.m9-params', 900);
      return true;
    }
    return false;
  }

  window.DGG.chatBrain('m9', {
    kernel: window.DGG.coreM9,
    ctx: function () { return { data: M.data, lib: LIB, result: M.R }; },
    onDoc: takeDoc,
    act: function (a) {
      if (!a || !a.type || !M.R) return false;
      if (a.type === 'goto') {
        if (['connect', 'board', 'attr', 'options', 'approval', 'execute'].indexOf(a.step) < 0) return false;
        setStep(a.step);
        return true;
      }
      if (a.type === 'focus') return doFocus(a.ref);
      if (a.type === 'open') return openPanel(a);
      if (a.type === 'apply') return applyAction(a);
      if (a.type === 'set') return setPath(a);
      return false;                                        /* 不认识的动作交给通用兜底 */
    }
  });

  window.DGG = window.DGG || {};
  window.DGG.registerModule('m9', { mount: mount, unmount: unmount, onCompany: onCompany, onIndustry: onIndustry });
})();
