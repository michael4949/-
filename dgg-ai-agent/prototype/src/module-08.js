/* AI流程提效 · 生产部门的生产环节（六屏）
 * 接入（报工核验）→ 工序流看板 → 工序诊断 → 改善预演 → 执行与派工 → 提效周报
 * 每屏三拍：接入（来源亮起、数据包飞向处理块）→ 展开（数字滚、路径画、条形长、行流入）→ 结论（一句话横幅 + 聚焦）
 * 计算全部走 DGG.coreM8（排程引擎依赖注入 DGG.coreM10）；对话坞的开场、问句、问答、文档摄入也走同一份内核
 * （screens / brief / suggest / ask / ingest），本文件在 DGG.chatBrain('m8') 上只登记 ctx（取上下文）与 act（把声明式动作落到页面）
 * 纯预制、断网可用；不用任何存储 API
 */
(function () {
  'use strict';
  var sh, $root, h, DATA, P, K, LIB;
  var ACCENT = window.DGG.PALETTE.m8;
  var STATUS_TONE = { ok: 'ok', tight: 'risk', over: 'late' };
  var LOT_COLORS = ['#1F7A5A', '#3B5BDB', '#C2255C', '#E8862B', '#6B3FD6', '#0B8FA8'];
  var M = { step: 'connect', arche: null, data: null, R: null, line: null, lossScope: 'week', params: {}, pick: null, charged: false, name: null, company: null, frame: null, lastStep: null, who: 0, replay: null, told: null, hint: null };

  function anim() { return window.DGG.anim; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function sectorOf(slug) { var hit = null; (DATA.industries.sectors || []).forEach(function (s) { (s.industries || []).forEach(function (i) { if (i.slug === slug) hit = s.key; }); }); return hit; }
  function archeOf(slug) { var sec = sectorOf(slug); var a = (sec && DATA.m10.archetypes.map[sec]) || 'make'; if (a === 'project') a = 'service'; return DATA.m8.samples[a] ? a : 'make'; }
  function loadArche(a) {
    M.arche = a;
    var sample = DATA.m8.samples[a], base = K.ensure(sample);
    if (M.name && M.name !== sample.company) base.company = M.name;
    if (M.company && M.company.systems) { var sys = M.company.systems; base.sources.forEach(function (s) { if (s.id === 'report' || s.id === 'route') s.mode = sys.indexOf('mes') >= 0 || sys.indexOf('erp') >= 0 ? 'direct' : 'import'; }); }
    M.data = base; M.line = null; M.params = {}; M.pick = null; M.told = null;
    recompute();
  }
  function recompute() { M.R = K.run(M.data, LIB); }
  function commit(data, msg) { M.data = data; recompute(); draw(); if (msg && M.frame) P.toast(M.frame.body, msg); }
  function fmtN(n) { return P.fmtN(n); }
  function HH(x) { return K.fmtH(x); }
  function V() { return M.R.vocab; }
  function T(text, extra) { return K.t(M.data, LIB, text, extra); }
  function col(cls, kids) { return h('div', { class: cls, style: 'display:flex;flex-direction:column;gap:16px' }, kids); }
  function lotColor(product) { var ps = M.R.es.products.map(function (p) { return p.id; }); return LOT_COLORS[Math.max(0, ps.indexOf(product)) % LOT_COLORS.length]; }
  function lineName(id) { var L = M.R.es.lines.filter(function (l) { return l.id === id; })[0]; return L ? L.name : id; }
  function cut(s, n) { s = String(s == null ? '' : s); return s.length > n ? s.slice(0, n) + '…' : s; }
  function pct1(x) { return Math.round(x * 10) / 10; }

  /* ---------- 叙事件：滚动数字 · 接入带 · 结论横幅 ---------- */
  function cnt(to, o) {
    o = o || {};
    var dec = o.dec || 0;
    return h('b', { class: 'm8-cnt num', 'data-to': String(to), 'data-dec': String(dec), 'data-suf': o.suf || '' }, [dec ? (0).toFixed(dec) : '0']);
  }
  function resetCounts(scope) {
    if (!scope) return;
    Array.prototype.forEach.call(scope.querySelectorAll('.m8-cnt'), function (e) {
      var dec = +e.getAttribute('data-dec') || 0;
      e.textContent = dec ? (0).toFixed(dec) : '0';
    });
  }
  function runCounts(scope, ms) {
    if (!scope) return;
    Array.prototype.forEach.call(scope.querySelectorAll('.m8-cnt'), function (e) {
      anim().count(e, parseFloat(e.getAttribute('data-to')) || 0, { decimals: +e.getAttribute('data-dec') || 0, unit: e.getAttribute('data-suf') || '', ms: ms || 900 });
    });
  }
  function vd(text) { return h('div', { class: 'c12 m8-say off' }, [h('span', { class: 'ic' }, ['AI']), h('b', {}, [text])]); }
  function flowBar(o) {
    var srcWrap = h('div', { class: 'src' }, o.src.map(function (s) { return h('div', { class: 's' }, [h('b', {}, [s[0]]), h('span', {}, [s[1]])]); }));
    var hub = h('div', { class: 'hub' }, [h('span', { class: 'an-live' }), h('b', {}, [o.hub])]);
    var out = h('div', { class: 'out' }, [h('b', {}, [o.out[0]]), h('span', {}, [o.out[1]])]);
    var el = h('div', { class: 'c12 m8-flowbar' }, [srcWrap, h('span', { class: 'pipe an-pipe' }), hub, h('span', { class: 'pipe an-pipe' }), out, h('span', { class: 'sp' }),
      P.btn(o.btn, { cls: 'sm', onClick: function () { if (M.replay) M.replay(); } })]);
    el.hub = hub; el.out = out;
    el.srcs = Array.prototype.slice.call(srcWrap.children);
    return el;
  }
  /* 三拍：接入 0–0.8s · 展开 0.8–2.3s · 结论 2.3–2.9s
     进屏走全程；屏内动作（确认、采纳、换线）只走后两拍的短版，免得反复重放 */
  function story(o) {
    function run(full) {
      var A = anim(), t0 = full ? 820 : 0, tv = full ? 2300 : 680;
      A.stopAll();
      var rises = (o.rise || []).filter(Boolean);
      rises.forEach(function (n) { n.style.opacity = '0'; });
      if (full) resetCounts(o.work);
      if (o.verdict) { o.verdict.classList.add('off'); o.verdict.classList.remove('an-verdict'); }
      if (o.paths && o.paths.length) A.drawSvg(o.paths, full ? 900 : 600, t0 + 40);
      if (o.bars && o.bars.length) A.grow(o.bars, { stagger: full ? 50 : 26, ms: full ? 720 : 480, delay: t0 + 20 });
      if (o.rows && o.rows.length) A.stream(o.rows, { stagger: full ? 68 : 32, delay: t0 });
      var T2 = A.timeline();
      if (full) {
        T2.at(0, function () { if (o.src && o.src.length) A.rise(o.src, { stagger: 55, from: 'left', ms: 380 }); });
        T2.at(180, function () { if (o.from && o.to) A.packet(o.from, o.to, { count: 3, ms: 600, gap: 105, label: o.label }); });
        T2.at(540, function () { if (o.to) A.scan(o.to, { ms: 880 }); if (o.scan) A.scan(o.scan, { ms: 1150 }); });
        T2.at(660, function () { if (o.to && o.tail) A.packet(o.to, o.tail, { count: 2, ms: 520, gap: 95 }); });
      }
      T2.at(t0, function () {
        if (o.dots && o.dots.length) A.rise(o.dots, { stagger: 24, ms: 300, from: 'none' });
        runCounts(o.work, full ? 900 : 540);
        if (rises.length) A.rise(rises, { stagger: full ? 70 : 32, ms: full ? 440 : 320 });
      });
      T2.at(tv, function () {
        if (o.verdict) { o.verdict.classList.remove('off'); o.verdict.classList.add('an-verdict'); }
        if (o.focus) A.pulse(o.focus, { ms: 1300, scroll: false });
      });
      T2.play();
    }
    var first = M.told !== M.step;
    M.told = M.step;
    M.replay = function () { run(true); };
    run(first);
  }
  function nodes(scope, sel) { return scope ? Array.prototype.slice.call(scope.querySelectorAll(sel)) : []; }
  function trs(el) { return el ? Array.prototype.slice.call(el.querySelectorAll('tbody tr')) : []; }
  /* 给行与卡片标上业务 id，内核的 {type:'focus'|'open', ref} 就能找到它 */
  function tagRefs(tbl, rows, textOf, refOf) {
    trs(tbl).forEach(function (tr) {
      var t = tr.textContent, i, s2;
      for (i = 0; i < rows.length; i++) { s2 = textOf(rows[i]); if (s2 && t.indexOf(s2) >= 0) { tr.setAttribute('data-ref', refOf(rows[i])); return; } }
    });
  }
  function tagItems(list, rows, refOf) {
    var items = nodes(list, '.pd-item');
    items.forEach(function (el, i) { if (rows[i]) el.setAttribute('data-ref', refOf(rows[i])); });
  }
  function workEl() { return M.frame ? M.frame.work : null; }
  function rowOf(scope, txt) {
    var list = scope ? scope.querySelectorAll('.pd-table tbody tr') : [], i;
    for (i = 0; i < list.length; i++) if (list[i].textContent.indexOf(txt) >= 0) return list[i];
    return null;
  }
  function refocus(txt, ms) {
    setTimeout(function () { var el = rowOf(workEl(), txt); if (el) anim().pulse(el, { ms: 2200, scroll: true }); }, ms || 120);
  }
  function focusSel(sel, ms) {
    setTimeout(function () { var el = workEl() && workEl().querySelector(sel); if (el) anim().pulse(el, { ms: 2200, scroll: true }); }, ms || 120);
  }
  function srcAt(i, alt) { var s2 = (M.data.sources || [])[i]; return s2 || { name: alt, rows: 0 }; }
  function scroller(el, maxH) { return h('div', { class: 'm8-sc', style: 'max-height:' + maxH + 'px' }, [el]); }

  function mount(root, step, shell) {
    sh = shell; $root = root; h = sh.h; DATA = sh.DATA; P = window.DGG.pui; K = window.DGG.coreM8;
    LIB = { vocab: DATA.m8.vocab, rules: DATA.m8.rules, improveLib: DATA.m8.improveLib, erpSamples: DATA.m10.samples, erp: window.DGG.coreM10 };
    P.init(sh);
    var c = sh.getCompany();
    if (!M.data) { M.company = c; M.name = c ? c.name : null; loadArche(c ? archeOf(c.industry) : archeOf(sh.displayIndustryDefault())); }
    M.step = step || (M.charged && M.lastStep ? M.lastStep : 'connect');
    if (['connect', 'board', 'diag', 'improve', 'exec', 'report'].indexOf(M.step) < 0) M.step = 'connect';
    draw();
  }
  function unmount() { M.replay = null; }
  function onCompany(c) { M.company = c; M.name = c ? c.name : null; M.charged = false; M.lastStep = null; loadArche(c ? archeOf(c.industry) : archeOf(sh.displayIndustryDefault())); if (M.step !== 'connect') setStep('connect'); else draw(); }
  function onIndustry(slug) { if (M.step !== 'connect' || !slug) return; var a = archeOf(slug); if (a !== M.arche) { loadArche(a); draw(); } }
  function setStep(s) { M.step = s; M.lastStep = s; sh.go('m8', s); }
  function enterBoard() { if (M.R.verify.pending) M.data = K.confirmAllReports(M.data, LIB); setStep('board'); }

  function draw() {
    sh.clear($root);
    recompute();
    var R = M.R, k = R.kpi, v = V(), c = M.company;
    var meta = c ? [sh.industryNameOf(c.industry), sh.optText('size', c.size)].filter(Boolean).join(' · ') : '';
    var tabs = [{ key: 'connect', label: '接入', badge: k.reportsPending || 0 }, { key: 'board', label: v.flowName + '看板', badge: k.alertsOpen || 0 }, { key: 'diag', label: v.op + '诊断', badge: k.stdExpired || 0 }, { key: 'improve', label: '改善预演' }, { key: 'exec', label: '执行与' + v.dispatch.replace('单', ''), badge: k.maintDue || 0 }, { key: 'report', label: '提效周报' }];
    var F = P.frame({ mark: '提效', accent: ACCENT, modules: P.navModules('m8'), crumbs: ['AI流程提效', tabs.filter(function (t) { return t.key === M.step; })[0].label], company: { name: M.data.company, meta: meta + (meta ? ' · ' : '') + v.dept + ' · ' + K.short(M.data.weekStart) + ' 起本周' }, tabs: tabs, active: M.step, chat: { id: 'm8', name: 'AI流程提效', step: M.step, onGo: setStep },
      onTab: function (key) { if (key !== 'connect' && !M.charged) enterBoard(); else setStep(key); } });
    M.frame = F; $root.appendChild(F.root);
    if (M.step !== 'connect' && !M.charged) { M.charged = true; sh.charge(K.CREDITS); }
    /* 还没采纳任何改善时 savedH = 0，顶栏不挂「预计节省 0 h」这种空计数 */
    if (M.step !== 'connect' && M.step !== 'board' && k.savedH > 0) { var row = F.root.querySelector('.pd-top .row'); if (row) row.appendChild(h('span', { class: 'm8-counter' }, ['本周 AI 建议预计节省 ', h('b', { class: 'num' }, [String(k.savedH)]), ' h'])); }
    ({ connect: screenConnect, board: screenBoard, diag: screenDiag, improve: screenImprove, exec: screenExec, report: screenReport })[M.step](F.work);
  }

  /* ---------- 屏 1 接入 · 报工核验 ---------- */
  function screenConnect(work) {
    var d = M.data, R = M.R, k = R.kpi, v = V(), vr = R.verify;
    work.classList.add('m8-connect');
    var g = h('div', { class: 'pd-grid m8-g' });
    var fb = flowBar({ src: d.sources.map(function (s) { return [cut(s.name, 5), fmtN(s.rows) + ' 条']; }), hub: v.report + '核验',
      out: [(vr.total - vr.pending) + ' / ' + vr.total, '已核验'], btn: '重新核验' });
    g.appendChild(fb);
    var kpiRow = h('div', { class: 'c12' }, [P.kpis([
      { label: '本周' + v.report, value: cnt(vr.total), unit: '条', sub: K.short(d.weekStart) + ' 起' },
      { label: '待核验', value: cnt(vr.pending), unit: '条', tone: vr.pending ? 'late' : 'ok', sub: '六条规则' },
      { label: v.lines, value: cnt(k.lines), unit: '条', sub: v.op + ' ' + k.stages + ' 道' },
      { label: '在产' + v.lots, value: cnt(k.lots), unit: '个', sub: k.products + ' 种' },
      { label: v.bottleneck, value: cnt(k.load7), unit: '%', tone: k.load7 >= 100 ? 'late' : 'ok', sub: R.bottleneck.line.name }
    ])]);
    g.appendChild(kpiRow);
    var top = vr.rows.filter(function (r) { return !r.resolved; })[0];
    var sayT = vr.total + ' 条' + v.report + '，' + vr.pending + ' 条待核验';
    if (vr.pending) {
      var kinds = {}; vr.rows.forEach(function (r) { if (!r.resolved) kinds[r.kindName] = (kinds[r.kindName] || 0) + 1; });
      sayT += '：' + Object.keys(kinds).map(function (x) { return x + ' ' + kinds[x] + ' 条'; }).join('、') + '。';
    } else { sayT = vr.total + ' 条' + v.report + '全部通过核验，可以进' + v.flowName + '看板。'; }
    var say = vd(sayT);
    g.appendChild(say);
    /* 核验表：6 列，默认 6 行，其余在滚动区 */
    var tbl = P.table({ compact: true, cols: [
      { key: 'kindName', label: '问题', w: '86px', render: function (r) { return P.chip(r.resolved ? 'ok' : 'risk', r.kindName); } },
      { key: 'reportId', label: v.report, w: '104px', render: function (r) { return r.reportId || '—'; } },
      { key: 'line', label: v.line + ' / ' + v.op, render: function (r) { return lineName(r.line) + ' · ' + r.op; } },
      { key: 'text', label: '核对结果' },
      { key: 'suggest', label: 'AI 建议值' },
      { key: 'act', label: '', w: '72px', align: 'right', render: function (r) { return r.resolved ? P.chip('ok', '已确认', true) : P.btn('确认', { cls: 'sm', onClick: function () { commit(K.confirmReport(M.data, LIB, r.id), r.kindName + ' ' + (r.reportId || '') + ' 已按建议值确认'); } }); } }
    ], rows: vr.rows });
    tagRefs(tbl, vr.rows, function (r) { return r.reportId || r.text; }, function (r) { return r.reportId || r.id; });
    var vcard = P.card({ cls: 'c8', title: v.report + '核验', sub: '待核验 ' + vr.pending + ' 条',
      extra: vr.pending ? P.btn('全部按建议确认', { cls: 'sm', onClick: function () { commit(K.confirmAllReports(M.data, LIB), vr.pending + ' 条已确认'); } }) : null,
      body: [scroller(tbl, 318)] });
    g.appendChild(vcard);
    var nameIn = h('input', { type: 'text', value: d.company, oninput: function (e) { M.name = e.target.value; d.company = e.target.value; var co = M.frame.root.querySelector('.pd-top .co span:nth-child(2)'); if (co) co.textContent = e.target.value; } });
    var srcs = h('div');
    d.sources.forEach(function (s) { srcs.appendChild(h('div', { class: 'src-row', 'data-ref': s.id }, [h('div', {}, [h('div', { class: 't' }, [s.name]), h('div', { class: 's' }, [s.lastSync + ' · ' + fmtN(s.rows) + ' 条'])]), P.chip(s.mode === 'direct' ? 'ok' : 'watch', s.mode === 'direct' ? '系统直连' : '表格导入'), h('span', { class: 'pd-dot ' + (s.mode === 'direct' ? 'ok' : 'risk') })])); });
    g.appendChild(P.card({ cls: 'c4', title: v.dept + '数据源', sub: d.sources.length + ' 个',
      body: [h('div', { class: 'pd-form' }, [h('div', { class: 'pd-field' }, [h('label', {}, ['企业名称']), nameIn]), h('div', { class: 'pd-field' }, [h('label', {}, ['行业']), h('div', { style: 'font-weight:600' }, [M.company ? sh.industryNameOf(M.company.industry) + (M.company.size ? ' · ' + sh.optText('size', M.company.size) : '') : sh.industryNameOf(sh.displayIndustryDefault())])])]), h('div', { style: 'margin-top:8px' }, [srcs])] }));
    g.appendChild(h('div', { class: 'c12 go' }, [
      h('div', {}, [h('div', { class: 't' }, [v.flowName + '看板']), h('div', { class: 's' }, [v.bottleneck + ' ' + R.bottleneck.line.name + ' · ' + v.queue + ' ' + R.bottleneck.queueDays + ' 天 · 异常 ' + k.alertsTotal + ' 起'])]),
      h('div', { class: 'sp' }), h('div', { class: 'cr' }, [h('b', { class: 'num' }, [String(K.CREDITS)]), ' 积分 / 次']),
      P.btn(vr.pending ? '核验并进入' + v.flowName + '看板' : '进入' + v.flowName + '看板', { cls: 'primary big', onClick: enterBoard })]));
    work.appendChild(g);
    story({ work: work, src: fb.srcs, from: fb.srcs[1], to: fb.hub, tail: fb.out, label: v.report + ' ' + vr.total + ' 条',
      scan: vcard, verdict: say, rise: [vcard, work.querySelector('.go')], rows: trs(tbl).slice(0, 7),
      focus: top ? rowOf(work, top.reportId || top.kindName) : null });
  }

  /* ---------- 屏 2 工序流看板 ---------- */
  function stageCard(f) {
    var v = V();
    var lines = h('div', { class: 'ln' });
    f.lines.forEach(function (l) { lines.appendChild(h('span', { class: l.status === 'over' ? 'over' : l.status === 'tight' ? 'tight' : '' }, [l.name])); });
    return h('button', { class: 'stg' + (f.isConstraint ? ' con' : ''), onclick: function () { openStage(f); } }, [
      h('div', { class: 'h' }, [f.name, h('span', { class: 'sp' }), f.isConstraint ? P.chip('late', '约束') : null]),
      lines,
      h('div', { class: 'ld' }, [h('span', { class: 'trk' }, [h('i', { class: f.load7 >= 100 ? 'over' : f.load7 >= 85 ? 'tight' : '', style: 'width:' + Math.min(100, f.load7) + '%' })]), h('b', {}, [f.load7 + '%'])]),
      h('div', { class: 'r' }, [cnt(f.wipUnits, { suf: ' ' + v.unit }), h('span', { class: f.waitH > 4 ? 'neg' : '' }, [HH(f.waitH)])])
    ]);
  }
  function openStage(f) {
    var R = M.R, B = R.bottleneck, v = V(), lineIds = f.lines.map(function (l) { return l.id; });
    var isC = f.isConstraint, q = K.queueDaysOf(R.S, lineIds);
    var acts = h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' }, [
      P.btn(isC ? '设为本周改善对象' : '看' + v.op + '诊断', { cls: 'primary sm', onClick: function () { M.line = isC ? B.line.id : f.lines[0].id; M.data.focus = M.line; dr.close(); setStep('diag'); } }),
      isC && !M.data.releasePlan ? P.btn('按' + v.bottleneck + '节拍' + v.release, { cls: 'sm', onClick: function () { dr.close(); commit(K.applyRelease(M.data, LIB), v.release + '计划已下发 ' + R.buffer.release.line.name + ' ' + v.roles.foreman); } }) : null,
      isC ? P.btn('去改善预演', { cls: 'sm', onClick: function () { dr.close(); setStep('improve'); } }) : null
    ]);
    var seen = ['未来 7 天负荷 ' + f.load7 + '%（' + f.lines.map(function (l) { return l.name + ' ' + l.load7 + '%'; }).join('、') + '）', v.queue + ' ' + q + ' 天',
      '本周' + v.report + ' ' + fmtN(f.qty) + ' ' + v.unit + '，' + v.fpy + ' ' + (f.fpy != null ? f.fpy + '%' : '—'),
      '标准 ' + f.stdText + '，实际 ' + f.actText + '（' + (f.devPct > 0 ? '+' : '') + f.devPct + '%）',
      v.wip + ' ' + fmtN(f.wipUnits) + ' ' + v.unit + '，本周' + v.wait + ' ' + HH(f.waitH) + '，可用率 ' + (f.availability != null ? f.availability + '%' : '—')];
    if (isC) seen.push('瓶颈前' + v.wip + ' 今日 ' + fmtN(B.wip.today.units) + ' ' + v.unit + ' → 明日 ' + fmtN(B.wip.tomorrow.units) + ' ' + v.unit + '（上限 ' + fmtN(B.wip.maxUnits) + '）');
    var reasons = isC ? ['负荷在全线居前，' + v.queue + ' ' + q + ' 天，满足约束定义',
      '前道日产出高于本线日产出，' + v.wip + '每日净增，' + (B.wip.overDay ? B.wip.overDay.label + ' 超过缓冲上限' : '缓冲在上限内'),
      '本线每释放 1 h ≈ ' + fmtN(B.unitPerHour) + ' ' + v.unit + '，是全线产出的分母']
      : ['负荷 ' + f.load7 + '%，非约束；给这一线加人或加班对全线产出无效', '关注它对' + v.bottleneck + '的供给节奏与' + v.wait + '时长'];
    var dr = P.drawer(M.frame.body, { title: f.name + (isC ? ' · ' + v.bottleneck : ''), sub: f.lines.map(function (l) { return l.name; }).join(' / '), body: [P.judge({ verdict: { tone: isC ? 'late' : 'ok', chip: isC ? '约束' : '非约束', text: isC ? '本周改善对象' : '按' + v.bottleneck + '节拍供给' }, seen: seen, reasons: reasons, actionsEl: acts, actionsTitle: '建议动作' })] });
  }
  function screenBoard(work) {
    var R = M.R, k = R.kpi, B = R.bottleneck, v = V(), d = M.data;
    work.classList.add('m8-board');
    var g = h('div', { class: 'pd-grid m8-g' });
    var fb = flowBar({ src: [[cut(v.report, 5), fmtN(k.reportsTotal) + ' 条'], [cut(srcAt(0, '工艺路线').name, 5), srcAt(0, '工艺路线').rows + ' 条'], [cut(srcAt(3, '班组排班').name, 5), srcAt(3, '班组排班').rows + ' 条']],
      hub: '约束识别', out: [B.line.name, v.bottleneck], btn: '刷新看板' });
    g.appendChild(fb);
    g.appendChild(h('div', { class: 'c12' }, [P.kpis([
      { label: v.bottleneck + '负荷', value: cnt(k.load7), unit: '%', tone: k.load7 >= 100 ? 'late' : k.load7 >= 85 ? 'risk' : 'ok', sub: B.line.name, onClick: function () { openStage(R.flow.filter(function (f) { return f.isConstraint; })[0]); } },
      { label: v.queue, value: cnt(k.queueDays, { dec: k.queueDays % 1 ? 1 : 0 }), unit: '天', tone: k.queueDays > 7 ? 'late' : 'ok' },
      { label: '有效利用率', value: cnt(k.effUtil), unit: '%', tone: k.effUtil < 70 ? 'risk' : 'ok', sub: '可用率 × 性能率', onClick: function () { setStep('diag'); } },
      { label: v.wip + '天数', value: cnt(k.wipDays, { dec: 1 }), unit: '天', tone: B.wip.tomorrow.hours >= B.wip.maxHours ? 'late' : 'ok', sub: '明日 ' + B.wipDaysTomorrow + ' 天' },
      { label: v.fpy, value: cnt(k.fpy, { dec: 1 }), unit: '%', tone: k.fpy < 97 ? 'risk' : 'ok', sub: '12 周基线' },
      { label: '本周加班', value: cnt(k.otHours), unit: 'h', tone: k.otHours ? 'risk' : 'ok', sub: '超限 ' + R.dispatch.overLimitNoOt + ' 人', onClick: function () { setStep('exec'); } }
    ])]));
    var say = vd(v.bottleneck + '在 ' + B.line.name + '，负荷 ' + k.load7 + '%，' + v.queue + ' ' + k.queueDays + ' 天；每释放 1 h ≈ ' + fmtN(B.unitPerHour) + ' ' + v.unit + '。');
    g.appendChild(say);
    var flow = h('div', { class: 'm8-flow' });
    R.flow.forEach(function (f) { var el = stageCard(f); el.setAttribute('data-ref', f.lines[0].id); flow.appendChild(el); });
    var conEl = null;
    var fcard = P.card({ cls: 'c12', title: v.flowName, sub: k.stages + ' 道' + v.op, body: [flow, h('div', { class: 'm8-legend' }, ['负荷 · ' + v.wip + ' · ' + v.wait])] });
    g.appendChild(fcard);
    var labels = B.wip.curve.map(function (c) { return c.label; });
    var chart = P.lineChart({ labels: labels, series: [{ values: B.wip.curve.map(function (c) { return d.releasePlan ? Math.min(c.hours, B.wip.maxHours) : c.hours; }), color: ACCENT.pa, fmt: function (x) { return x + ' h'; } }, { values: B.wip.curve.map(function () { return B.wip.maxHours; }), color: '#D9483B', fmt: function (x) { return x + ' h'; } }], height: 176, width: 640, every: 1, right: true });
    g.appendChild(P.card({ cls: 'c6', title: '瓶颈前' + v.wip, sub: '上限 ' + B.wip.maxHours + ' h',
      extra: d.releasePlan ? P.chip('ok', '已下发') : P.btn('去' + v.release, { cls: 'sm', onClick: function () { setStep('diag'); } }),
      body: [chart] }));
    var at = P.table({ compact: true, cols: [
      { key: 'ruleName', label: '规则', render: function (a) { return h('span', {}, [P.chip(a.status === 'open' ? 'late' : a.status === 'doing' ? 'handled' : 'done', { wip: '在', wait: '等', quality: '质', speed: '速', down: '停', plan: '节' }[a.kind] || '!'), ' ' + a.ruleName]); } },
      { key: 'cause', label: '根因' },
      { key: 'roleName', label: '岗位', w: '68px' },
      { key: 'savedH', label: '预计', w: '52px', align: 'right', render: function (a) { return a.savedH ? a.savedH + ' h' : '—'; } },
      { key: 'act', label: '', w: '62px', align: 'right', render: function (a) { return a.status === 'open' ? P.btn('处置', { cls: 'sm', onClick: function () { commit(K.handleException(M.data, LIB, a.id), a.id + ' ' + a.action + ' · ' + a.roleName + (a.savedH ? ' · 预计回收 ' + a.savedH + ' h' : '')); } }) : P.chip(a.status === 'doing' ? 'handled' : 'done', a.statusName); } }
    ], rows: R.alerts, empty: '本周无异常' });
    tagRefs(at, R.alerts, function (a) { return a.ruleName + a.cause; }, function (a) { return a.id; });
    var acard = P.card({ cls: 'c6', title: '异常预警', sub: '待处置 ' + k.alertsOpen, body: [scroller(at, 214)] });
    g.appendChild(acard);
    work.appendChild(g);
    conEl = flow.querySelector('.stg.con');
    story({ work: work, src: fb.srcs, from: fb.srcs[0], to: fb.hub, tail: fb.out, label: v.report + ' ' + k.reportsTotal + ' 条',
      scan: fcard, verdict: say, rise: nodes(flow, '.stg').concat([acard]), bars: nodes(flow, '.ld .trk i'),
      paths: nodes(chart, 'path'), rows: trs(at).slice(0, 6), dots: nodes(chart, 'circle'), focus: conEl });
  }

  /* ---------- 屏 3 工序诊断 ---------- */
  function screenDiag(work) {
    var R = M.R, d = M.data, v = V(), B = R.bottleneck;
    work.classList.add('m8-diag');
    var lineId = M.line || d.focus || B.line.id;
    var loss = K.lossWaterfall(d, LIB, lineId, M.lossScope, R.sequence.savedHPerDay);
    var g = h('div', { class: 'pd-grid m8-g' });
    var fb = flowBar({ src: [['12 周损失', d.lossWeekly.filter(function (x) { return x.line === lineId; }).length + ' 周'], [cut(v.report, 5), R.verify.total + ' 条'], [cut(srcAt(2, v.machine + '运行').name, 5), srcAt(2, v.machine + '运行').rows + ' 条']],
      hub: '时间损失', out: [loss.effUtil + '%', '有效利用率'], btn: '重算损失' });
    g.appendChild(fb);
    var lines = h('div', { class: 'lines' });
    R.S.lines.forEach(function (l) { lines.appendChild(h('button', { class: l.id === lineId ? 'on' : '', onclick: function () { M.line = l.id; draw(); } }, [l.name + (l.id === B.line.id ? ' · 约束' : '')])); });
    var scope = h('div', { class: 'lines' }, [h('button', { class: M.lossScope === 'week' ? 'on' : '', onclick: function () { M.lossScope = 'week'; draw(); } }, ['本周']), h('button', { class: M.lossScope === 'day' ? 'on' : '', onclick: function () { M.lossScope = 'day'; draw(); } }, ['今日'])]);
    g.appendChild(P.card({ cls: 'c12', tight: true, body: [h('div', { style: 'display:flex;gap:16px;align-items:center;flex-wrap:wrap;padding:10px 14px' }, [h('span', { style: 'font-weight:700;color:var(--pd-sub)' }, [v.line]), lines, h('span', { style: 'flex:1' }), scope])] }));
    g.appendChild(h('div', { class: 'c12' }, [P.kpis([
      { label: '计划' + v.run, value: cnt(loss.start.value, { dec: loss.start.value % 1 ? 1 : 0 }), unit: 'h', sub: '每日' },
      { label: v.cutting, value: cnt(loss.end.value, { dec: 1 }), unit: 'h', tone: 'ok', sub: '每日' },
      { label: '可用率', value: cnt(loss.availability), unit: '%', tone: loss.availability < 75 ? 'risk' : 'ok' },
      { label: '性能率', value: cnt(loss.performance), unit: '%', tone: 'ok' },
      { label: '有效利用率', value: cnt(loss.effUtil), unit: '%', tone: loss.effUtil < 70 ? 'late' : 'ok' },
      { label: '可回收', value: cnt(loss.recoverable.total, { dec: 1 }), unit: 'h', tone: 'ok', sub: '每日' }
    ])]));
    var say = vd(loss.line.name + ' 每日 ' + loss.start.value + ' h 计划' + v.run + '，' + v.cutting + '剩 ' + loss.end.value + ' h；'
      + (loss.primary ? loss.primary.label + ' ' + Math.abs(loss.primary.value) + ' h 居首，每日可回收 ' + loss.recoverable.total + ' h。' : '各项损失都在 10% 以内。'));
    g.appendChild(say);
    var wf = P.waterfall({ start: loss.start, end: loss.end, items: loss.items, fmt: function (x) { return x + ' h'; }, axisFmt: function (x) { return Math.round(x) + ''; }, width: 700, height: 236, onPick: function (id) { openLoss(id, loss, lineId); } });
    var lcard = P.card({ cls: 'c7', title: '时间损失 · ' + loss.line.name, sub: M.lossScope === 'week' ? '本周' : '今日', body: [wf] });
    g.appendChild(lcard);
    var b = R.buffer, gp = Math.min(100, 100 * b.hours / (b.max * 1.6)), limPct = 100 / 1.6;
    var gauge = h('div', { class: 'm8-gauge' }, [h('div', { class: 'trk' }, [h('i', { class: b.status, style: 'width:' + gp + '%' }), h('span', { class: 'lim', style: 'left:' + limPct + '%' })]),
      h('div', { class: 'lb' }, [h('span', {}, ['今日 ' + b.today + ' h']), h('span', {}, ['上限 ' + b.max + ' h']), h('span', {}, [fmtN(b.units) + ' ' + v.unit])])]);
    var bcard = P.card({ cls: 'c5', title: v.bottleneck + '缓冲 · ' + b.line.name, sub: '明日 ' + b.hours + ' h', extra: P.chip(b.status === 'over' || b.status === 'red' ? 'late' : b.status === 'yellow' ? 'risk' : 'ok', b.statusName),
      body: [gauge, h('div', { style: 'margin-top:10px' }, [P.kv([
        ['明日允许' + v.release, fmtN(b.release.allowedUnits) + ' ' + v.unit],
        [b.release.line.name + '明日计划', b.release.before + ' → ' + b.release.after + ' h'],
        ['暂缓' + v.lots, b.release.heldLots.length ? b.release.heldLots.map(function (l) { return l.id + '（交期 ' + l.dueDay + ' 天）'; }).join('、') : '无'],
        [v.wip + '天数', b.wipDays.before + ' → ' + b.wipDays.after + ' 天'],
        ['释放人时', HH(b.release.freedHours) + '/日']])])],
      foot: [d.releasePlan ? P.chip('ok', v.release + '计划已下发 ' + K.short(d.releasePlan.date)) : P.btn('按' + v.bottleneck + '节拍' + v.release, { cls: 'primary', onClick: function () { commit(K.applyRelease(M.data, LIB), b.release.line.name + ' ' + K.short(b.release.date) + ' 计划 ' + b.release.before + ' → ' + b.release.after + ' h · 已下发' + v.roles.foreman); }, disabled: b.release.freedHours <= 0 && !b.release.heldLots.length })] });
    g.appendChild(bcard);
    /* 标准工时校准：6 列、默认 6 行 */
    var cal = R.calibration.slice().sort(function (a, b2) { return Math.abs(b2.dev) - Math.abs(a.dev); });
    var ct = P.table({ compact: true, cols: [
      { key: 'productName', label: M.arche === 'service' ? '服务项目' : '产品', render: function (r) { return cut(r.productName, 12); } },
      { key: 'op', label: v.op },
      { key: 'std', label: '标准', align: 'right', render: function (r) { return r.std + ' h/' + v.unit; } },
      { key: 'median', label: '12 周中位', align: 'right', render: function (r) { return r.median + ' h/' + v.unit; } },
      { key: 'dev', label: '偏差', align: 'right', sort: true, render: function (r) { return h('b', { class: 'num', style: Math.abs(r.dev) >= 15 ? 'color:var(--t-late)' : '' }, [(r.dev > 0 ? '+' : '') + r.dev + '%']); } },
      { key: 'suggest', label: 'AI 建议', align: 'right', render: function (r) { return r.adopted ? P.chip('ok', '已采纳 ' + r.suggest) : (r.suggest ? h('span', {}, [r.suggest + ' h ', P.btn('采纳', { cls: 'sm', onClick: function () { commit(K.adoptStd(M.data, LIB, r.product, r.op), r.productName + ' ' + r.op + ' 标准工时 ' + r.std + ' → ' + r.suggest + ' h · ' + v.roles.eng + '复核后同步'); } })]) : P.chip('done', r.statusName)); } }
    ], rows: cal });
    tagRefs(ct, cal, function (r) { return cut(r.productName, 12) + r.op; }, function (r) { return 'ST-' + r.product + '|' + r.op; });
    g.appendChild(P.card({ cls: 'c12', title: '标准工时校准', sub: '过期 ' + R.kpi.stdExpired + ' 项', body: [scroller(ct, 250)] }));
    work.appendChild(g);
    var primaryBar = null;
    if (loss.primary) { nodes(wf, 'g.bar').forEach(function (n, i) { if (loss.items[i - 1] && loss.items[i - 1].id === loss.primary.id) primaryBar = n; }); }
    story({ work: work, src: fb.srcs, from: fb.srcs[0], to: fb.hub, tail: fb.out, label: v.down + ' + ' + v.setup,
      scan: lcard, verdict: say, rise: nodes(wf, 'g.bar').concat([bcard]), bars: nodes(gauge, '.trk i'),
      rows: trs(ct).slice(0, 6), focus: primaryBar });
  }
  function openLoss(id, loss, lineId) {
    var d = M.data, v = V(), reps = d.reports.filter(function (r) { return r.line === lineId && r.date >= d.weekStart; });
    var body, title;
    if (id === 'setup') { var rows = reps.filter(function (r) { return r.setupMin > 0; }); title = v.setup + '记录 · ' + loss.line.name; body = [P.kv([['本周' + v.setup, rows.length + ' 次 · 平均 ' + (rows.length ? Math.round(rows.reduce(function (a, r) { return a + r.setupMin; }, 0) / rows.length) : 0) + ' min'], ['合批后', M.R.sequence.before.changeovers + ' 次 → ' + M.R.sequence.after.changeovers + ' 次 · 省 ' + M.R.sequence.savedHPerDay + ' h/日']]), P.table({ compact: true, cols: [{ key: 'date', label: '日期', render: function (r) { return K.short(r.date) + ' ' + (r.shift === 'A' ? v.shiftA : v.shiftB); } }, { key: 'machine', label: v.machine }, { key: 'order', label: v.lot }, { key: 'product', label: '产品' }, { key: 'setupMin', label: v.setup, align: 'right', render: function (r) { return r.setupMin + ' min'; } }, { key: 'firstPieceOk', label: v.firstPieceCheck, render: function (r) { return r.firstPieceOk ? '已确认' : P.chip('late', '缺失'); } }], rows: rows })]; }
    else if (id.indexOf('wait:') === 0) { var reason = id.slice(5); var rows2 = reps.filter(function (r) { return r.waitMin > 0 && r.waitReason === reason; }); title = reason + '记录 · ' + loss.line.name; body = [P.table({ compact: true, cols: [{ key: 'date', label: '日期', render: function (r) { return K.short(r.date); } }, { key: 'order', label: v.lot }, { key: 'op', label: v.op }, { key: 'emp', label: 'E-编号' }, { key: 'waitMin', label: v.wait, align: 'right', render: function (r) { return r.waitMin + ' min'; } }], rows: rows2, empty: '无记录' })]; }
    else if (id === 'down') { var ms = d.machines.filter(function (m) { return m.line === lineId; }); title = v.down + '记录 · ' + loss.line.name; var ev = []; ms.forEach(function (m) { (m.downEvents || []).forEach(function (e) { ev.push({ machine: m.id, date: e.date, min: e.toMin - e.fromMin, reason: e.reason }); }); }); body = [P.table({ compact: true, cols: [{ key: 'machine', label: v.machine }, { key: 'date', label: '日期', render: function (r) { return K.short(r.date); } }, { key: 'min', label: '时长', align: 'right', render: function (r) { return r.min + ' min'; } }, { key: 'reason', label: '原因' }], rows: ev, empty: '本周无' + v.down })]; }
    else { title = loss.line.name; var lw = d.lossWeekly.filter(function (x) { return x.line === lineId; }); body = [P.table({ compact: true, cols: [{ key: 'week', label: '周', render: function (r) { return K.short(r.week); } }, { key: 'setupMin', label: v.setup, align: 'right', render: function (r) { return Math.round(r.setupMin / 60) + ' h'; } }, { key: 'downMin', label: v.down, align: 'right', render: function (r) { return Math.round(r.downMin / 60) + ' h'; } }, { key: 'speedMin', label: v.speed, align: 'right', render: function (r) { return Math.round(r.speedMin / 60) + ' h'; } }, { key: 'reworkMin', label: v.rework, align: 'right', render: function (r) { return Math.round(r.reworkMin / 60) + ' h'; } }], rows: lw })]; }
    var dr = P.drawer(M.frame.body, { title: title, body: body, actions: [P.btn('锁定改善点：' + (id === 'setup' ? v.setup : id.indexOf('wait:') === 0 ? id.slice(5) : v.down), { cls: 'primary', onClick: function () { M.data.focus = lineId; M.data.focusLoss = id; dr.close(); setStep('improve'); } })] });
  }

  /* ---------- 屏 4 改善预演 ---------- */
  function paramsOf() { var p = {}; Object.keys(M.params).forEach(function (k) { p[k] = M.params[k]; }); return p; }
  function seqStrip(seqIds, cost, label) {
    var d = M.data, v = V(), byId = {}; d.jobsToday.forEach(function (j) { byId[j.id] = j; });
    var strip = h('div', { class: 'strip' });
    seqIds.forEach(function (id, i) {
      var j = byId[id];
      if (i) { var c = K.seqCost(d, [byId[seqIds[i - 1]], j], cost.factor).minutes; strip.appendChild(h('span', { class: 'gap ' + (c >= d.setupMatrix.diffFixture * cost.factor ? 'big' : c >= d.setupMatrix.sameFixture * cost.factor ? '' : 'small'), style: 'flex:0 0 ' + Math.max(18, c * 1.2) + 'px', title: v.setup + ' ' + c + ' min' }, [String(c)])); }
      strip.appendChild(h('span', { class: 'lot', style: 'flex:' + Math.max(1, j.qty) + ' 1 0;background:' + lotColor(j.product), title: j.id + ' · ' + j.product + ' · ' + fmtN(j.qty) + ' ' + v.unit + ' · ' + j.fixture + ' / ' + j.program }, [j.product]));
    });
    return h('div', { class: 'row' }, [h('span', { class: 'lb' }, [label]), strip]);
  }
  function screenImprove(work) {
    var R = M.R, d = M.data, v = V(), pv = K.preview(d, LIB, null, paramsOf(), R), base = pv.base.metrics;
    work.classList.add('m8-improve');
    var g = h('div', { class: 'pd-grid m8-g' });
    if (!M.pick) M.pick = pv.recommended;
    var fb = flowBar({ src: [['今日' + v.lot, d.jobsToday.length + ' 个'], ['技能矩阵', R.skills.ops.length + ' ' + v.op], ['加班上限', d.otCap.month + ' h/月']],
      hub: 'AI ERP 排程', out: ['方案 ' + pv.recommended, 'AI 推荐'], btn: '重新预演' });
    g.appendChild(fb);
    var opts = pv.cards.map(function (c) {
      var m = c.result.metrics;
      return { key: c.key, name: c.name, recommended: c.recommended, headline: { big: cnt(m.queueDays, { dec: m.queueDays % 1 ? 1 : 0, suf: ' 天' }), sub: v.queue + '（现 ' + base.queueDays + ' 天）', tone: m.queueDays < base.queueDays ? 'good' : '' },
        rows: [{ k: v.bottleneck + '负荷', v: base.load + '% → ' + m.load + '%' },
          { k: v.capacity, v: fmtN(base.weeklyUnits) + ' → ' + fmtN(m.weeklyUnits), tone: m.weeklyUnits > base.weeklyUnits ? 'good' : '' },
          { k: '加班', v: base.otHours + ' → ' + m.otHours + ' h/周', tone: m.otHours > 0 ? 'bad' : '' },
          c.key === 'D' ? { k: '费用', v: fmtN(c.result.cost) + ' 元 · 预计', tone: 'bad' } : { k: '责任岗位', v: c.roleName }] };
    });
    var cm = pv.combo.result.metrics;
    opts.push({ key: '组合', name: 'A + B + C', headline: { big: cnt(cm.queueDays, { dec: cm.queueDays % 1 ? 1 : 0, suf: ' 天' }), sub: v.queue + '（现 ' + base.queueDays + ' 天）', tone: 'good' },
      rows: [{ k: v.bottleneck + '负荷', v: base.load + '% → ' + cm.load + '%' }, { k: v.capacity, v: fmtN(base.weeklyUnits) + ' → ' + fmtN(cm.weeklyUnits), tone: 'good' }, { k: '加班', v: base.otHours + ' → ' + cm.otHours + ' h/周' }, { k: '责任岗位', v: v.roles.eng + ' · ' + v.roles.foreman }] });
    var cmp = P.compare({ options: opts, active: M.pick, onPick: function (key) { M.pick = key; draw(); } });
    var ccard = P.card({ cls: 'c12', title: '改善方案预演', sub: '4 个方案 + 组合', body: [cmp] });
    g.appendChild(ccard);
    var rec = pv.cards.filter(function (c) { return c.key === pv.recommended; })[0], rm = rec.result.metrics;
    var say = vd('推荐 ' + rec.key + ' ' + rec.name + '：' + v.queue + ' ' + base.queueDays + ' → ' + rm.queueDays + ' 天，' + v.capacity + ' +' + fmtN(rm.weeklyUnits - base.weeklyUnits) + ' ' + v.unit + '，加班 ' + rm.otHours + ' h。');
    g.appendChild(say);
    var q = K.sequenceJobs(d, LIB, M.params.setupMin), cost = { factor: q.factor };
    var seq = h('div', { class: 'm8-seq' }, [seqStrip(q.before.seq, cost, '当前顺序'), seqStrip(d.jobSeq ? d.jobSeq.seq : q.after.seq, cost, d.jobSeq ? '已下发' : 'AI 重排')]);
    var legend = h('div', { class: 'legend' });
    R.es.products.forEach(function (p) { if (d.jobsToday.some(function (j) { return j.product === p.id; })) legend.appendChild(h('span', {}, [h('i', { style: 'background:' + lotColor(p.id) }), p.id + ' ' + cut(p.name, 10)])); });
    seq.appendChild(legend);
    var st = P.table({ compact: true, cols: [
      { key: 'seq', label: '序', w: '40px', align: 'right' }, { key: 'id', label: v.lot }, { key: 'product', label: '产品' },
      { key: 'qty', label: '数量', align: 'right', render: function (r) { return fmtN(r.qty); } },
      { key: 'dueDay', label: '交期', align: 'right', render: function (r) { return r.dueDay + ' 天'; } },
      { key: 'setupMin', label: v.setup, align: 'right', render: function (r) { return r.setupMin ? r.setupMin + ' min · ' + r.kind : '—'; } }
    ], rows: q.after.rows });
    tagRefs(st, q.after.rows, function (r) { return r.id; }, function (r) { return r.id; });
    g.appendChild(P.card({ cls: 'c8', title: v.setup + '合批 · ' + R.bottleneck.line.name, sub: q.before.changeovers + ' 次 → ' + q.after.changeovers + ' 次',
      extra: d.jobSeq ? P.chip('ok', '已下发 · 省 ' + d.jobSeq.savedHPerDay + ' h/日') : P.btn('AI 重排今日顺序', { cls: 'primary sm', onClick: function () { commit(K.applySequence(M.data, LIB, M.params.setupMin), v.setup + ' ' + q.before.changeovers + ' 次 → ' + q.after.changeovers + ' 次 · 省 ' + q.savedHPerDay + ' h/日 · 顺序表已下发' + v.roles.foreman); } }),
      body: [seq, h('div', { style: 'margin-top:12px' }, [P.kv([[v.setup + '时间', K.r1(q.before.minutes / 60) + ' → ' + K.r1(q.after.minutes / 60) + ' h/日'], ['节省', q.savedHPerDay + ' h/日 ≈ ' + fmtN(Math.round(q.savedHPerDay / (R.bottleneck.hpu || 1))) + ' ' + v.unit + '/日'], ['停机' + v.setup, q.steps.internal + ' min'], ['不停机准备', q.steps.external + ' min'], ['交期约束', q.dueOk ? '满足' : '未满足']])]), h('div', { style: 'margin-top:12px' }, [scroller(st, 232)])] }));
    var pm = h('div', { class: 'm8-params' });
    R.improveCards.forEach(function (c) {
      c.params.forEach(function (p) {
        var cur = M.params[p.key] != null ? M.params[p.key] : p.default;
        if (cur == null && p.key === 'setupMin') cur = p.max;
        var lab = h('label', {}, [c.key + ' · ' + p.label, h('b', { class: 'num' }, [cur + ' ' + p.unit])]);
        pm.appendChild(h('div', { class: 'pm', 'data-k': p.key }, [lab, h('input', { type: 'range', min: String(p.min), max: String(p.max), step: String(p.step), value: String(cur), oninput: function (e) { M.params[p.key] = parseFloat(e.target.value); lab.querySelector('b').textContent = e.target.value + ' ' + p.unit; }, onchange: function () { draw(); } }), h('div', { class: 'mm' }, [h('span', {}, [p.min + ' ' + p.unit]), h('span', {}, [p.max + ' ' + p.unit])])]));
      });
    });
    var keys = M.pick === '组合' ? pv.combo.keys : [M.pick];
    g.appendChild(P.card({ cls: 'c4', title: '参数', sub: '拖动后重算', body: [pm],
      foot: [P.btn('立项 ' + (M.pick === '组合' ? 'A + B + C' : M.pick), { cls: 'primary', onClick: function () { var nd = K.commitProject(M.data, LIB, keys, paramsOf()), np = nd.projects[nd.projects.length - 1]; commit(nd, '已立项 ' + np.id + ' · ' + np.owner + ' · 目标 ' + v.queue + ' ≤ ' + np.target.queueDays + ' 天'); }, disabled: d.projects.some(function (p) { return p.keys.join() === keys.slice().sort().join(); }) })] }));
    if (d.projects.length) {
      var pt = P.table({ compact: true, cols: [{ key: 'id', label: '编号' }, { key: 'name', label: '方案' }, { key: 'owner', label: '责任岗位' }, { key: 'target', label: '目标', render: function (p) { return v.queue + ' ≤ ' + p.target.queueDays + ' 天'; } }, { key: 'expected', label: '预计', render: function (p) { return p.baseline.queueDays + ' → ' + p.expected.queueDays + ' 天'; } }, { key: 'status', label: '状态', render: function (p) { return P.chip(p.status === 'executing' ? 'handled' : 'watch', p.status === 'executing' ? '执行中' : '观察中'); } }], rows: d.projects });
      g.appendChild(P.card({ cls: 'c12', title: '改善项目台账', sub: d.projects.length + ' 项', body: [pt], foot: [P.btn('去执行与' + v.dispatch.replace('单', ''), { cls: 'sm', onClick: function () { setStep('exec'); } })] }));
    }
    work.appendChild(g);
    var recEl = nodes(cmp, '.pd-option')[['A', 'B', 'C', 'D'].indexOf(pv.recommended)] || nodes(cmp, '.pd-option')[0];
    story({ work: work, src: fb.srcs, from: fb.srcs[0], to: fb.hub, tail: fb.out, label: d.jobsToday.length + ' 个' + v.lot,
      scan: ccard, verdict: say, rise: nodes(cmp, '.pd-option').concat(nodes(work, '.m8-seq .row')),
      rows: trs(st).slice(0, 6), focus: recEl });
  }

  /* ---------- 屏 5 执行与派工 ---------- */
  function screenExec(work) {
    var R = M.R, d = M.data, v = V(), dp = R.dispatch;
    work.classList.add('m8-exec');
    var g = h('div', { class: 'pd-grid m8-g' });
    var fb = flowBar({ src: [['技能矩阵', R.skills.ops.length + ' ' + v.op], ['加班上限', d.otCap.month + ' h/月'], [v.lines + '负荷', R.S.lines.length + ' 条']],
      hub: v.dispatch + '排程', out: [dp.id, '明日 ' + K.short(dp.date)], btn: '重排' });
    g.appendChild(fb);
    g.appendChild(h('div', { class: 'c12' }, [P.kpis([
      { label: '需人', value: cnt(dp.need), unit: '人' },
      { label: '已派', value: cnt(dp.filled), unit: '人', tone: 'ok' },
      { label: v.support, value: cnt(dp.support), unit: '人', tone: dp.support ? 'handled' : '' },
      { label: '未覆盖', value: cnt(dp.unmet.reduce(function (a, u) { return a + u.missing; }, 0)), unit: '人', tone: dp.unmet.length ? 'late' : 'ok' },
      { label: '到加班上限', value: cnt(dp.overLimitNoOt), unit: '人', tone: dp.overLimitNoOt ? 'risk' : 'ok' },
      { label: '本周加班', value: cnt(dp.otWeek.after), unit: 'h', tone: dp.otWeek.delta < 0 ? 'ok' : '', sub: dp.otWeek.delta < 0 ? '原 ' + dp.otWeek.before + ' h' : '与上周持平' }
    ])]));
    var say = vd('明日 ' + dp.need + ' 个工位已排 ' + dp.filled + ' 人，' + v.support + ' ' + dp.support + ' 人；' + dp.overLimitNoOt + ' 人到加班上限，不再排加班。');
    g.appendChild(say);
    var dt = P.table({ compact: true, cols: [
      { key: 'lineName', label: v.line, render: function (r) { return r.support ? h('span', {}, [r.lineName, ' ', P.chip('handled', v.support)]) : r.lineName; } },
      { key: 'shift', label: '班次' }, { key: 'station', label: '工位' }, { key: 'emp', label: 'E-编号' },
      { key: 'level', label: '技能', align: 'right', render: function (r) { return r.level + ' 级'; } },
      { key: 'overtimeH', label: '本月加班', align: 'right', render: function (r) { return h('span', { style: r.overtimeH > d.otCap.month ? 'color:var(--t-late);font-weight:700' : '' }, [r.overtimeH + ' h']); } }
    ], rows: dp.rows, rowClass: function (r) { return r.support ? 'on' : ''; } });
    tagRefs(dt, dp.rows, function (r) { return r.emp; }, function (r) { return r.emp; });
    g.appendChild(P.card({ cls: 'c7', title: '明日' + v.dispatch + ' ' + dp.id, sub: K.short(dp.date),
      extra: d.dispatch ? P.chip('ok', '已下发 ' + v.roles.foreman) : P.btn('生成明日' + v.dispatch, { cls: 'primary sm', onClick: function () { commit(K.applyDispatch(M.data, LIB), v.dispatch + ' ' + dp.id + ' 已下发 · ' + dp.filled + ' 人 · ' + v.support + ' ' + dp.support + ' 人'); } }),
      body: [scroller(dt, 300)] }));
    var right = col('c5', []);
    var hit = h('div', { class: 'm8-hit' });
    R.planHit.forEach(function (p) { hit.appendChild(h('div', { class: 'r' }, [h('span', { class: 'lb', title: p.lineName }, [p.lineName]), P.bar(Math.min(100, p.pct), p.behind ? 'late' : 'ok', p.pct + '%'), h('span', { class: 'v' }, [fmtN(p.actual) + ' / ' + fmtN(p.target)])])); });
    right.appendChild(P.card({ title: v.report + '看板 · ' + v.shiftA, sub: '前 4 小时', body: [hit] }));
    var mt = h('div', { class: 'pd-list' });
    R.maintenance.forEach(function (m) { mt.appendChild(P.item({ tone: m.scheduled ? 'done' : 'risk', icon: '保', title: m.machine + ' · ' + m.lineName, sub: cut(m.reasons[0], 18) + (m.window ? ' · ' + m.window.label : ''), right: m.scheduled ? P.chip('done', '已排 ' + K.short(m.scheduledAt)) : P.btn('排入窗口', { cls: 'sm', onClick: function () { commit(K.scheduleMaint(M.data, LIB, m.machine), m.machine + ' ' + v.maint + '排入 ' + m.window.label + ' · ' + m.role); }, disabled: !m.window }), rightSub: m.savedH ? '预计 ' + m.savedH + ' h' : '' })); });
    tagItems(mt, R.maintenance, function (m) { return m.machine; });
    if (!R.maintenance.length) mt.appendChild(P.empty('无到期' + v.maint));
    right.appendChild(P.card({ title: v.maint + '窗口', sub: '到期 ' + R.kpi.maintDue, body: [mt] }));
    g.appendChild(right);
    var sk = h('div', { class: 'm8-skill' });
    R.skills.coverage.forEach(function (c) {
      sk.appendChild(h('div', { class: 'c' + (c.single ? ' single' : '') }, [
        h('div', { class: 't' }, [c.op, c.single ? P.chip('risk', '单点') : P.chip('ok', '充足')]),
        h('div', { class: 'ld' }, [h('span', { class: 'trk' }, [h('i', { class: c.single ? 'single' : '', style: 'width:' + Math.min(100, Math.round((c.ratio || 0) / 2.5 * 100)) + '%' })]), h('b', {}, [(c.ratio == null ? '—' : c.ratio)])]),
        h('div', { class: 'n' }, [c.qualified + ' / ' + c.need + ' 人'])
      ]));
    });
    var pairs = h('div', { class: 'pd-list', style: 'margin-top:10px' });
    R.skills.pairs.forEach(function (p) { pairs.appendChild(P.item({ tone: p.added ? 'done' : 'accent', icon: '教', title: p.trainee + ' · ' + p.mentor + ' 带教 ' + p.op, sub: v.assist + ' · 目标 2 级', right: p.added ? P.chip('done', '本周带教') : P.btn('加入带教', { cls: 'sm', onClick: function () { commit(K.addTraining(M.data, LIB, p.trainee, p.op), p.trainee + ' 加入本周带教 · ' + p.op); } }) })); });
    tagItems(pairs, R.skills.pairs, function (p) { return p.trainee; });
    g.appendChild(P.card({ cls: 'c7', title: '技能矩阵', sub: '2 级以上 / 每日需', body: [sk, R.skills.pairs.length ? pairs : null] }));
    if (d.projects.length) {
      var pj = h('div', { style: 'display:grid;gap:12px' });
      d.projects.forEach(function (p) {
        var ms = h('div', { class: 'm8-ms' });
        p.milestones.forEach(function (m, i) { var st2 = m.status === 'done' ? 'done' : (i === 0 || p.milestones[i - 1].status === 'done') ? 'doing' : ''; ms.appendChild(h('div', { class: 'm ' + st2 }, [h('span', { class: 'i' }, [m.status === 'done' ? '✓' : String(i + 1)]), h('span', { class: 't' }, [m.title, h('span', { class: 'o' }, [m.owner])]), h('span', { class: 'due' }, [K.short(m.due) + ' 前']), m.status === 'done' ? P.chip('ok', '已完成', true) : (st2 === 'doing' ? P.btn('完成', { cls: 'sm', onClick: function () { commit(K.setMilestone(M.data, LIB, p.id, i, 'done'), p.id + ' 节点完成 · ' + m.title); } }) : h('span'))])); });
        pj.appendChild(h('div', {}, [h('div', { style: 'display:flex;gap:8px;align-items:center;margin-bottom:8px;flex-wrap:wrap' }, [h('b', {}, [p.id]), h('span', {}, [p.name]), P.chip(p.status === 'executing' ? 'handled' : 'watch', p.status === 'executing' ? '执行中' : '观察中'), h('span', { style: 'color:var(--pd-sub);font-size:12px' }, [p.owner + ' · 目标 ' + v.queue + ' ≤ ' + p.target.queueDays + ' 天'])]), ms]));
      });
      g.appendChild(P.card({ cls: 'c5', title: '改善项目节点', sub: d.projects.length + ' 项', body: [pj] }));
    }
    work.appendChild(g);
    story({ work: work, src: fb.srcs, from: fb.srcs[0], to: fb.hub, tail: fb.out, label: dp.need + ' 个工位',
      scan: work.querySelector('.m8-hit') ? work.querySelector('.m8-hit').closest('.pd-card') : null, verdict: say,
      rise: nodes(sk, '.c').concat(nodes(mt, '.pd-item')), bars: nodes(work, '.m8-hit .pd-bar .trk i').concat(nodes(sk, '.ld .trk i')),
      rows: trs(dt).slice(0, 7), focus: work.querySelectorAll('.pd-kpi')[4] });
  }

  /* ---------- 屏 6 提效周报 ---------- */
  function screenReport(work) {
    var R = M.R, d = M.data, v = V(), L = R.ledger, W = R.weekly;
    work.classList.add('m8-report');
    var g = h('div', { class: 'pd-grid m8-g' });
    var fb = flowBar({ src: [['采纳记录', L.rows.length + ' 条'], ['12 周指标', W.series.length + ' 周'], ['本周动作', d.log.length + ' 条']],
      hub: '增效账', out: [K.short(d.weekStart) + ' 周', '提效周报'], btn: '重算周报' });
    g.appendChild(fb);
    g.appendChild(h('div', { class: 'c12' }, [P.kpis([
      { label: '预计节省', value: cnt(R.kpi.savedH, { dec: R.kpi.savedH % 1 ? 1 : 0 }), unit: 'h', tone: 'ok', sub: v.bottleneck + ' ' + L.totals.bottleneckH + ' h' },
      { label: '折算' + v.output, value: cnt(L.totals.units), unit: v.unit, sub: '预计' },
      { label: '加班减少', value: cnt(L.totals.otH), unit: 'h', tone: L.totals.otH ? 'ok' : '', sub: '本周 ' + W.current.otHours + ' h' },
      { label: v.flowDays, value: cnt(R.committed && R.committed.flowDays != null ? R.committed.flowDays : W.current.flowDays, { dec: 1 }), unit: '天', sub: R.committed ? '立项前 ' + W.current.flowDays + ' 天' : '本周' },
      { label: v.queue, value: cnt(R.committed ? R.committed.metrics.queueDays : R.metrics.queueDays, { dec: 1 }), unit: '天', tone: R.committed ? 'ok' : '', sub: R.committed ? '立项前 ' + R.metrics.queueDays + ' 天' : '本周' }
    ])]));
    var e0 = W.series[0], e1 = W.series[W.series.length - 1];
    var say = vd(L.rows.length
      ? ('本周采纳 ' + L.rows.length + ' 条，预计省 ' + R.kpi.savedH + ' h，折算 ' + fmtN(L.totals.units) + ' ' + v.unit + '。')
      : ('本周尚无采纳记录；有效利用率 12 周 ' + e0.effUtil + '% → ' + e1.effUtil + '%，' + v.flowDays + ' ' + e0.flowDays + ' → ' + e1.flowDays + ' 天。'));
    g.appendChild(say);
    var labels = W.series.map(function (s) { return s.label; });
    var chart = P.lineChart({ labels: labels, series: [{ values: W.series.map(function (s) { return s.effUtil; }), color: ACCENT.pa, fmt: function (x) { return x + '%'; } }, { values: W.series.map(function (s) { return s.otHours; }), color: '#E8862B', fmt: function (x) { return x + ' h'; }, right: true, bar: true }], height: 196, width: 700, right: true, every: 2 });
    var tcard = P.card({ cls: 'c7', title: '12 周趋势', sub: '有效利用率 · 加班', body: [chart] });
    g.appendChild(tcard);
    var who = h('div', { class: 'who' });
    W.recipients.forEach(function (r) { who.appendChild(h('span', {}, [r])); });
    g.appendChild(P.card({ cls: 'c5', title: v.dept + '提效周报', sub: K.short(d.weekStart) + ' 周',
      body: [h('div', { class: 'pd-field' }, [h('label', {}, ['收件人']), who]), h('div', { class: 'pd-pre m8-rep' }, [W.text])],
      foot: [P.btn('发送到微信', { cls: 'primary', onClick: function () { sh.setQrReady(true); sh.showWeChat(); } }), P.btn('回到看板', { onClick: function () { setStep('board'); } })] }));
    var wfItems = L.byKind.map(function (k) { return { id: k.kind, label: k.label, value: k.value }; });
    var lt = P.table({ compact: true, cols: [
      { key: 'kindName', label: '类别', w: '70px', render: function (r) { return P.chip('handled', r.kindName, true); } },
      { key: 'action', label: '采纳的建议', render: function (r) { return cut(r.action, 22); } },
      { key: 'role', label: '责任岗位' },
      { key: 'savedH', label: '节省', align: 'right', render: function (r) { return r.savedH + ' h/周'; } },
      { key: 'units', label: '折算', align: 'right', render: function (r) { return r.kind === 'ot' ? '加班 −' + r.savedH + ' h' : r.isBottleneck ? fmtN(r.units) + ' ' + v.unit : '非约束工时'; } },
      { key: 'basis', label: '依据', render: function (r) { return cut(r.basis, 18); } }
    ], rows: L.rows, empty: '本周尚无采纳记录' });
    g.appendChild(P.card({ cls: 'c7', title: '增效账', sub: L.rows.length + ' 条',
      body: [wfItems.length ? P.waterfall({ start: { label: '本周', value: 0 }, end: { label: '合计', value: K.r1(L.totals.bottleneckH + L.totals.nonBottleneckH) }, items: wfItems, fmt: function (x) { return x + ' h'; }, axisFmt: function (x) { return Math.round(x) + ''; }, width: 700, height: 190 }) : null, scroller(lt, 220)] }));
    g.appendChild(P.card({ cls: 'c5', title: '本周动作', sub: d.log.length + ' 条', body: [P.log(d.log, { limit: 8, empty: '尚无动作' })] }));
    if (d.projects.length) {
      var vf = P.table({ compact: true, cols: [{ key: 'id', label: '项目' }, { key: 'name', label: '方案' }, { key: 'target', label: '目标' }, { key: 'expected', label: '预计', align: 'right' }, { key: 'actual', label: '实际', align: 'right' }, { key: 'statusName', label: '状态', render: function (r) { return P.chip(r.status === 'ok' ? 'ok' : r.status === 'miss' ? 'late' : 'watch', r.statusName); } }], rows: W.verify });
      g.appendChild(P.card({ cls: 'c12', title: '效果核验', sub: d.projects.length + ' 项', body: [vf] }));
    }
    work.appendChild(g);
    story({ work: work, src: fb.srcs, from: fb.srcs[0], to: fb.hub, tail: fb.out, label: '12 周指标',
      scan: tcard, verdict: say, rise: nodes(work, '.m8-rep, .who'), paths: nodes(chart, 'path'), dots: nodes(chart, 'circle'),
      rows: trs(lt).slice(0, 6), focus: work.querySelectorAll('.pd-kpi')[0] });
  }

  /* ================= 对话坞 · 内核大脑的落地 =================
     开场发现、快捷问句、问答、文档摄入全部走 DGG.coreM8 的 screens / brief / suggest / ask / ingest
     （与 skill 内核同一份实现）。这一段只做两件事：把当前上下文交出去，把内核返回的声明式动作落到页面上。 */
  function refEl(ref) {
    var w = workEl(), s = String(ref == null ? '' : ref), el, list, i, L;
    if (!w || !s) return null;
    el = w.querySelector('[data-ref="' + s + '"]');
    if (el) return el;
    if (s.slice(0, 3) === 'ST-') return rowOf(w, s.split('|')[1] || s);     /* 标准工时行：退回按工序找 */
    L = M.R.es.lines.filter(function (l) { return l.id === s; })[0];
    if (L) {                                                               /* 产线 id：找工序流上那一格 */
      list = w.querySelectorAll('.m8-flow .stg');
      for (i = 0; i < list.length; i++) if (list[i].textContent.indexOf(L.name) >= 0) return list[i];
      return rowOf(w, L.name);
    }
    return rowOf(w, s);                                                    /* 重绘或排序过的行，退回按文本找 */
  }
  function refocus(ref, ms) { setTimeout(function () { var el = refEl(ref); if (el) anim().pulse(el, { ms: 2200, scroll: true }); }, ms || 120); }
  function docBody(list) {
    var out = [];
    (list || []).forEach(function (b) {
      if (b && b.type === 'text') { out.push(h('div', { class: 'pd-pre', style: 'max-height:320px;overflow:auto' }, [String(b.text == null ? '' : b.text)])); return; }
      var n = window.DGG.chat.block(b);
      if (n) out.push(n);
    });
    return out;
  }
  /* 文档摄入的写回：内核已经算好新数据副本，这里只管进对应的屏、提示与高亮 */
  function commitDoc(next) {
    var added = next.sources.filter(function (s) { return s.id === 'doc-import'; })[0];
    var last = next.log[next.log.length - 1], to = added ? 'connect' : 'report', same = M.step === to;
    if (same) commit(next, last ? last.label + ' · ' + last.detail : null);
    else { M.data = next; recompute(); setStep(to); }
    if (added) refocus('doc-import', same ? 300 : 900);
    else focusSel('.pd-log', same ? 300 : 900);
  }
  function openPanel(a) {
    var R = M.R, s = a.ref, to = { verify: 'connect', alert: 'board', calib: 'diag', job: 'improve', roster: 'exec', maint: 'exec' }[a.panel];
    if (to) {
      if (M.step !== to) { setStep(to); refocus(s, 900); } else refocus(s);
      return true;
    }
    if (a.panel === 'stage') {
      var f = R.flow.filter(function (x) { return x.lines.some(function (l) { return l.id === s; }); })[0];
      if (!f) return false;
      if (M.step !== 'board') setStep('board');
      openStage(f);
      return true;
    }
    if (a.panel === 'wechat') { sh.setQrReady(true); sh.showWeChat(); return true; }
    if (a.panel === 'doc') { P.drawer(M.frame.body, { title: a.title || a.ref, sub: a.sub, body: docBody(a.blocks) }); return true; }
    return false;
  }
  function applyAction(a) {
    var input = a.input || {}, R = M.R, v = V();
    if (a.action === 'confirm-report') {
      var row = R.verify.rows.filter(function (x) { return x.id === input.id; })[0];
      if (!row || row.resolved) return false;
      if (M.step !== 'connect') setStep('connect');
      commit(K.confirmReport(M.data, LIB, row.id), row.kindName + ' ' + (row.reportId || '') + ' 已按建议值确认');
      refocus(row.reportId || row.id, 260);
      return true;
    }
    if (a.action === 'confirm-all-reports') { enterBoard(); return true; }
    if (a.action === 'handle-exception') {
      var ex = R.alerts.filter(function (x) { return x.id === input.id; })[0];
      if (!ex || ex.status !== 'open') return false;
      if (M.step !== 'board') setStep('board');
      commit(K.handleException(M.data, LIB, ex.id), ex.id + ' ' + ex.action + ' · ' + ex.roleName + (ex.savedH ? ' · 预计回收 ' + ex.savedH + ' h' : ''));
      refocus(ex.id, 260);
      return true;
    }
    if (a.action === 'adopt-std') {
      var c = R.calibration.filter(function (x) { return x.product === input.product && x.op === input.op; })[0];
      if (!c || c.status !== 'expired' || c.adopted) return false;
      if (M.step !== 'diag') setStep('diag');
      commit(K.adoptStd(M.data, LIB, c.product, c.op), c.productName + ' ' + c.op + ' 标准工时 ' + c.std + ' → ' + c.suggest + ' h · ' + v.roles.eng + '复核后同步');
      refocus('ST-' + c.product + '|' + c.op, 260);
      return true;
    }
    if (a.action === 'apply-release') {
      if (M.data.releasePlan) return false;
      var b = R.buffer;
      if (M.step !== 'diag') setStep('diag');
      commit(K.applyRelease(M.data, LIB), b.release.line.name + ' ' + K.short(b.release.date) + ' 计划 ' + b.release.before + ' → ' + b.release.after + ' h · 已下发' + v.roles.foreman);
      focusSel('.m8-gauge', 300);
      return true;
    }
    if (a.action === 'apply-sequence') {
      if (M.data.jobSeq) return false;
      var q = R.sequence;
      if (M.step !== 'improve') setStep('improve');
      commit(K.applySequence(M.data, LIB, M.params.setupMin), v.setup + ' ' + q.before.changeovers + ' 次 → ' + q.after.changeovers + ' 次 · 省 ' + q.savedHPerDay + ' h/日 · 顺序表已下发' + v.roles.foreman);
      focusSel('.m8-seq', 300);
      return true;
    }
    if (a.action === 'commit-project') {
      var keys = (input.keys && input.keys.length ? input.keys.slice() : [M.pick || R.preview.recommended]);
      if (keys.length === 1 && keys[0] === '组合') keys = R.preview.combo.keys.slice();
      if (M.data.projects.some(function (p) { return p.keys.join() === keys.slice().sort().join(); })) return false;
      if (M.step !== 'improve') setStep('improve');
      M.pick = keys.length > 1 ? '组合' : keys[0];
      var nd = K.commitProject(M.data, LIB, keys, paramsOf()), np = nd.projects[nd.projects.length - 1];
      if (!np) return false;
      commit(nd, '已立项 ' + np.id + ' · ' + np.owner + ' · 目标 ' + v.queue + ' ≤ ' + np.target.queueDays + ' 天');
      return true;
    }
    if (a.action === 'add-training') {
      var p0 = R.skills.pairs.filter(function (x) { return x.trainee === input.trainee && x.op === input.op; })[0];
      if (!p0 || p0.added) return false;
      if (M.step !== 'exec') setStep('exec');
      commit(K.addTraining(M.data, LIB, p0.trainee, p0.op), p0.trainee + ' 加入本周带教 · ' + p0.op);
      refocus(p0.trainee, 260);
      return true;
    }
    if (a.action === 'schedule-maint') {
      var mt = R.maintenance.filter(function (x) { return x.machine === input.machine; })[0];
      if (!mt || mt.scheduled || !mt.window) return false;
      if (M.step !== 'exec') setStep('exec');
      commit(K.scheduleMaint(M.data, LIB, mt.machine), mt.machine + ' ' + v.maint + '排入 ' + mt.window.label + ' · ' + mt.role);
      refocus(mt.machine, 260);
      return true;
    }
    if (a.action === 'apply-dispatch') {
      if (M.data.dispatch) return false;
      var dp = R.dispatch;
      if (M.step !== 'exec') setStep('exec');
      commit(K.applyDispatch(M.data, LIB), v.dispatch + ' ' + dp.id + ' 已下发 · ' + dp.filled + ' 人 · ' + v.support + ' ' + dp.support + ' 人');
      return true;
    }
    return false;
  }
  /* 文档摄入：内核只给新数据副本（SPEC §12 不许 apply 指回 ingest 自己），并进页面由宿主做 */
  function takeDoc(doc, step) {
    var r = K.ingest(doc, step, M.data, LIB, M.R);
    if (!r || !r.data) return r;
    var nd = r.data;
    return { text: r.text, blocks: r.blocks, act: function () { commitDoc(nd); } };
  }
  function setParam(a) {
    if (a.path === 'line') {
      if (!M.R.S.lines.some(function (l) { return l.id === a.value; })) return false;
      M.line = a.value;
      var nd = K.ensure(M.data); nd.focus = a.value; M.data = nd; recompute();
      if (M.step !== 'diag') setStep('diag'); else draw();
      return true;
    }
    if (a.path === 'pick') {
      if (['A', 'B', 'C', 'D', '组合'].indexOf(a.value) < 0) return false;
      M.pick = a.value;
      if (M.step !== 'improve') setStep('improve'); else draw();
      focusSel('.pd-option.on', 300);
      return true;
    }
    if (a.path === 'params.setupMin') {
      var mv = Number(a.value);
      if (!(mv > 0)) return false;
      M.params.setupMin = mv; M.pick = 'A';
      if (M.step !== 'improve') setStep('improve'); else draw();
      focusSel('.m8-params .pm', 700);
      return true;
    }
    return false;
  }

  window.DGG.chatBrain('m8', {
    kernel: window.DGG.coreM8,
    ctx: function () { return { data: M.data, lib: LIB, result: M.R }; },
    onDoc: takeDoc,
    act: function (a, api) {
      if (!a || !a.type || !M.R) return false;
      if (a.type === 'focus') { var el = refEl(a.ref); if (!el) return false; api.focus(el); return true; }
      if (a.type === 'open') return openPanel(a);
      if (a.type === 'apply') return applyAction(a);
      if (a.type === 'set') return setParam(a);
      return false;                                        /* goto 与不认识的动作交给通用兜底 */
    }
  });

  window.DGG.registerModule('m8', { mount: mount, unmount: unmount, onCompany: onCompany, onIndustry: onIndustry });
})();
