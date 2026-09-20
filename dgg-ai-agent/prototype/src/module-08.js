/* AI流程提效 · 生产部门的生产环节（六屏）
 * 接入（报工核验）→ 工序流看板 → 工序诊断 → 改善预演 → 执行与派工 → 提效周报
 * 每屏三拍：接入（来源亮起、数据包飞向处理块）→ 展开（数字滚、路径画、条形长、行流入）→ 结论（一句话横幅 + 聚焦）
 * 计算全部走 DGG.coreM8（排程引擎依赖注入 DGG.coreM10）；对话大脑登记在 DGG.chatBrain('m8')
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
    var vcard = P.card({ cls: 'c8', title: v.report + '核验', sub: '待核验 ' + vr.pending + ' 条',
      extra: vr.pending ? P.btn('全部按建议确认', { cls: 'sm', onClick: function () { commit(K.confirmAllReports(M.data, LIB), vr.pending + ' 条已确认'); } }) : null,
      body: [scroller(tbl, 318)] });
    g.appendChild(vcard);
    var nameIn = h('input', { type: 'text', value: d.company, oninput: function (e) { M.name = e.target.value; d.company = e.target.value; var co = M.frame.root.querySelector('.pd-top .co span:nth-child(2)'); if (co) co.textContent = e.target.value; } });
    var srcs = h('div');
    d.sources.forEach(function (s) { srcs.appendChild(h('div', { class: 'src-row' }, [h('div', {}, [h('div', { class: 't' }, [s.name]), h('div', { class: 's' }, [s.lastSync + ' · ' + fmtN(s.rows) + ' 条'])]), P.chip(s.mode === 'direct' ? 'ok' : 'watch', s.mode === 'direct' ? '系统直连' : '表格导入'), h('span', { class: 'pd-dot ' + (s.mode === 'direct' ? 'ok' : 'risk') })])); });
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
    R.flow.forEach(function (f) { flow.appendChild(stageCard(f)); });
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
    g.appendChild(P.card({ cls: 'c7', title: '明日' + v.dispatch + ' ' + dp.id, sub: K.short(dp.date),
      extra: d.dispatch ? P.chip('ok', '已下发 ' + v.roles.foreman) : P.btn('生成明日' + v.dispatch, { cls: 'primary sm', onClick: function () { commit(K.applyDispatch(M.data, LIB), v.dispatch + ' ' + dp.id + ' 已下发 · ' + dp.filled + ' 人 · ' + v.support + ' ' + dp.support + ' 人'); } }),
      body: [scroller(dt, 300)] }));
    var right = col('c5', []);
    var hit = h('div', { class: 'm8-hit' });
    R.planHit.forEach(function (p) { hit.appendChild(h('div', { class: 'r' }, [h('span', { class: 'lb', title: p.lineName }, [p.lineName]), P.bar(Math.min(100, p.pct), p.behind ? 'late' : 'ok', p.pct + '%'), h('span', { class: 'v' }, [fmtN(p.actual) + ' / ' + fmtN(p.target)])])); });
    right.appendChild(P.card({ title: v.report + '看板 · ' + v.shiftA, sub: '前 4 小时', body: [hit] }));
    var mt = h('div', { class: 'pd-list' });
    R.maintenance.forEach(function (m) { mt.appendChild(P.item({ tone: m.scheduled ? 'done' : 'risk', icon: '保', title: m.machine + ' · ' + m.lineName, sub: cut(m.reasons[0], 18) + (m.window ? ' · ' + m.window.label : ''), right: m.scheduled ? P.chip('done', '已排 ' + K.short(m.scheduledAt)) : P.btn('排入窗口', { cls: 'sm', onClick: function () { commit(K.scheduleMaint(M.data, LIB, m.machine), m.machine + ' ' + v.maint + '排入 ' + m.window.label + ' · ' + m.role); }, disabled: !m.window }), rightSub: m.savedH ? '预计 ' + m.savedH + ' h' : '' })); });
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

  /* ================= 对话大脑 ================= */
  function mini(head, rows) {
    var t = h('table', { class: 'mini' });
    if (head) t.appendChild(h('thead', {}, [h('tr', {}, head.map(function (x) { return h('th', {}, [String(x)]); }))]));
    var tb = h('tbody');
    rows.forEach(function (r) { tb.appendChild(h('tr', {}, r.map(function (x) { return h('td', {}, [String(x)]); }))); });
    t.appendChild(tb);
    return t;
  }
  function kvb(pairs) { var g2 = h('div', { class: 'kv' }); pairs.forEach(function (p) { g2.appendChild(h('span', {}, [String(p[0])])); g2.appendChild(h('span', {}, [String(p[1])])); }); return g2; }
  function tagsb(list) { return h('div', { class: 'tags' }, list.map(function (t) { return h('span', {}, [String(t)]); })); }
  function has(q, arr) { for (var i = 0; i < arr.length; i++) if (q.indexOf(arr[i]) >= 0) return true; return false; }
  function lossNow() { return K.lossWaterfall(M.data, LIB, M.line || M.data.focus || M.R.bottleneck.line.id, M.lossScope, M.R.sequence.savedHPerDay); }

  function opener(step) {
    if (!M.R) return null;
    var R = M.R, k = R.kpi, v = V(), B = R.bottleneck, vr = R.verify;
    if (step === 'connect') {
      if (!vr.pending) return '本周 ' + vr.total + ' 条' + v.report + '全部过核验，' + v.bottleneck + ' ' + B.line.name + ' 负荷 ' + k.load7 + '%。';
      var t0 = vr.rows.filter(function (r) { return !r.resolved; })[0];
      return '本周 ' + vr.total + ' 条' + v.report + '里 ' + vr.pending + ' 条没过核验，' + t0.kindName + '这条：' + t0.suggest + '。';
    }
    if (step === 'board') {
      var a0 = R.alerts.filter(function (a) { return a.status === 'open'; })[0];
      return v.bottleneck + '在 ' + B.line.name + '，未来 7 天负荷 ' + k.load7 + '%，' + v.queue + ' ' + k.queueDays + ' 天'
        + (a0 ? '；' + a0.ruleName + '这条待处置：' + a0.text + '。' : '。');
    }
    if (step === 'diag') {
      var l = lossNow();
      return l.line.name + ' 每日 ' + l.start.value + ' h 计划' + v.run + '，' + v.cutting + '只剩 ' + l.end.value + ' h；'
        + (l.primary ? l.primary.label + '每日吃掉 ' + Math.abs(l.primary.value) + ' h，占 ' + Math.round(100 * Math.abs(l.primary.value) / l.start.value) + '%。' : '各项损失都低于 10%。');
    }
    if (step === 'improve') {
      var pv = K.preview(M.data, LIB, null, paramsOf(), R), rec = pv.cards.filter(function (c) { return c.key === pv.recommended; })[0];
      return '方案 ' + rec.key + ' ' + rec.name + ' 把' + v.queue + '从 ' + pv.base.metrics.queueDays + ' 天压到 ' + rec.result.metrics.queueDays + ' 天，不加班，' + v.capacity + '多 ' + fmtN(rec.result.metrics.weeklyUnits - pv.base.metrics.weeklyUnits) + ' ' + v.unit + '。';
    }
    if (step === 'exec') {
      var dp = R.dispatch;
      return '明日 ' + dp.need + ' 个工位已排 ' + dp.filled + ' 人，' + v.support + ' ' + dp.support + ' 人；' + dp.overLimitNoOt + ' 人本月加班到 ' + M.data.otCap.month + ' h 上限，不再排加班。';
    }
    if (step === 'report') {
      var W = R.weekly, s0 = W.series[0], s1 = W.series[W.series.length - 1];
      if (R.ledger.rows.length) return '本周采纳 ' + R.ledger.rows.length + ' 条建议，预计省 ' + k.savedH + ' h，折算 ' + fmtN(R.ledger.totals.units) + ' ' + v.unit + '。';
      return '有效利用率 12 周从 ' + s0.effUtil + '% 走到 ' + s1.effUtil + '%，' + v.flowDays + ' ' + s0.flowDays + ' → ' + s1.flowDays + ' 天；增效账本周还是空的。';
    }
    return null;
  }
  function suggest(step) {
    var v = M.R ? V() : null;
    if (!v) return null;
    if (step === 'connect') return ['待核验有几条', '漏报这条怎么补', '哪些来源是直连的', '全部确认并进看板'];
    if (step === 'board') return ['为什么是 ' + M.R.bottleneck.line.name, v.queue + '多少天', '先处置哪一条异常', '在制品会超限吗'];
    if (step === 'diag') return ['时间都花在哪', '换型能省多少', '标准工时哪几项过期', '按节拍' + v.release];
    if (step === 'improve') return ['哪个方案好', 'B 方案要几个人', '换型合批省多少', '把换型时间调到 30 分钟'];
    if (step === 'exec') return ['明日缺人吗', '谁在加班上限上', '哪条线落后了', '铣削为什么是单点'];
    if (step === 'report') return ['本周省了多少', '有效利用率走势', '周报发给谁', '回看板'];
    return null;
  }

  function answer(q, step) {
    if (!M.R) return null;
    q = String(q || '');
    var R = M.R, k = R.kpi, v = V(), B = R.bottleneck, vr = R.verify, w = workEl(), m, i;

    /* —— 点名某条报工 / 异常 / 批次 / 员工 / 设备 —— */
    m = q.match(/RP-?\s*([\d-]{4,})/i);
    if (m) {
      var rid = 'RP-' + m[1].replace(/^-+/, '');
      var vrow = vr.rows.filter(function (x) { return x.reportId === rid; })[0];
      if (vrow) return { text: rid + '：' + vrow.kindName + '。' + vrow.text + '。AI 建议 ' + vrow.suggest + '。' + (vrow.resolved ? '已确认。' : ''),
        blocks: [kvb([[v.line, lineName(vrow.line)], [v.op, vrow.op], ['E-编号', vrow.emp || '—'], ['状态', vrow.resolved ? '已确认' : '待核验']])],
        focus: step === 'connect' ? rowOf(w, rid) : null,
        act: step === 'connect' ? null : function () { setStep('connect'); refocus(rid, 900); } };
      var rep = M.data.reports.filter(function (x) { return x.id === rid; })[0];
      if (rep) return { text: rid + '：' + K.short(rep.date) + ' ' + (rep.shift === 'A' ? v.shiftA : v.shiftB) + '，' + lineName(rep.line) + ' ' + rep.op + '，' + rep.emp + '，' + fmtN(rep.qtyGood) + ' ' + v.unit + '，' + v.setup + ' ' + rep.setupMin + ' min，' + v.wait + ' ' + rep.waitMin + ' min。这条已过核验。' };
    }
    m = q.match(/EX-?\s*([\d-]{4,})/i);
    if (m) {
      var aid = 'EX-' + m[1].replace(/^-+/, '');
      var al = R.alerts.filter(function (x) { return x.id === aid; })[0];
      if (al) return { text: al.id + ' ' + al.ruleName + '：' + al.text + '。根因 ' + al.cause + '，动作 ' + al.action + '，' + al.roleName + '负责' + (al.savedH ? '，预计回收 ' + al.savedH + ' h' : '') + '。',
        act: function () { if (step !== 'board') setStep('board'); if (al.status === 'open') commit(K.handleException(M.data, LIB, al.id), al.id + ' ' + al.action + ' · ' + al.roleName); } };
    }
    m = q.match(/(B-\d{4}-\d{2})/i);
    if (m) {
      var jid = m[1].toUpperCase(), jr = K.sequenceJobs(M.data, LIB, M.params.setupMin).after.rows.filter(function (x) { return x.id === jid; })[0];
      if (jr) return { text: jid + '：' + jr.product + '，' + fmtN(jr.qty) + ' ' + v.unit + '，交期 ' + jr.dueDay + ' 天，AI 重排后排第 ' + jr.seq + '，' + v.setup + ' ' + (jr.setupMin || 0) + ' min（' + jr.kind + '）。',
        act: function () { if (step !== 'improve') { setStep('improve'); refocus(jid, 900); } else refocus(jid); } };
    }
    m = q.match(/(E-\d{3})/i);
    if (m) {
      var eid = m[1].toUpperCase(), er = R.dispatch.rows.filter(function (x) { return x.emp === eid; })[0];
      var emp = M.data.employees.filter(function (x) { return x.id === eid; })[0];
      if (er) return { text: eid + '：明日排 ' + er.lineName + ' ' + er.shift + ' ' + er.station + '，技能 ' + er.level + ' 级，本月加班 ' + er.overtimeH + ' h' + (er.overtimeH >= M.data.otCap.month ? '，已到上限，不再排加班' : '') + (er.support ? '，' + v.support + '自 ' + er.home : '') + '。',
        act: function () { if (step !== 'exec') { setStep('exec'); refocus(eid, 900); } else refocus(eid); } };
      if (emp) return { text: eid + '：' + emp.job + '，本月加班 ' + emp.overtimeH + ' h，明日未进' + v.dispatch + '。' };
    }
    m = q.match(/([A-Z]{2,4}-\d{2})/);
    if (m) {
      var mid = m[1].toUpperCase(), mt2 = R.maintenance.filter(function (x) { return x.machine === mid; })[0];
      if (mt2) return { text: mid + '（' + mt2.lineName + '）：' + mt2.reasons.join('；') + '。建议排进 ' + (mt2.window ? mt2.window.label + '，负荷 ' + mt2.window.pct + '%，' + mt2.minutes + ' min，' + mt2.role : '负荷低的班次') + '。',
        act: function () { if (step !== 'exec') setStep('exec'); if (!mt2.scheduled && mt2.window) commit(K.scheduleMaint(M.data, LIB, mid), mid + ' ' + v.maint + '排入 ' + mt2.window.label + ' · ' + mt2.role); } };
    }
    /* —— 为什么是约束（六屏都答，排在点名产线之前） —— */
    if (has(q, ['为什么', '凭什么', '怎么定']) && has(q, ['约束', '瓶颈', B.line.name, '它'])) {
      var con0 = R.flow.filter(function (f) { return f.isConstraint; })[0];
      return { text: B.line.name + ' 未来 7 天负荷 ' + B.load7 + '%，' + v.queue + ' ' + B.queueDays + ' 天，在全线居前；它每释放 1 h ≈ ' + fmtN(B.unitPerHour) + ' ' + v.unit + '，是全线产出的分母。负荷平衡率 ' + B.balanceRate + '%。',
        blocks: [mini([v.op, '负荷', v.wip], R.flow.map(function (f) { return [cut(f.name, 6), f.load7 + '%', fmtN(f.wipUnits)]; }))],
        act: function () { if (step !== 'board') setStep('board'); else if (con0) openStage(con0); } };
    }
    /* —— 点名某条产线 / 工序 —— */
    var lineHit = null;
    R.S.lines.forEach(function (l) { if (q.indexOf(l.name) >= 0) lineHit = l; });
    if (lineHit) {
      var st3 = R.flow.filter(function (f) { return f.lines.some(function (l) { return l.id === lineHit.id; }); })[0];
      var qd = K.queueDaysOf(R.S, [lineHit.id]);
      return { text: lineHit.name + '：未来 7 天负荷 ' + lineHit.load7 + '%，' + v.queue + ' ' + qd + ' 天' + (lineHit.id === B.line.id ? '，是本周' + v.bottleneck : '，非约束') + (st3 ? '；' + v.op + ' ' + st3.name + '，标准 ' + st3.stdText + '，实际 ' + st3.actText : '') + '。',
        act: function () { M.line = lineHit.id; M.data.focus = lineHit.id; if (step !== 'diag') setStep('diag'); else draw(); } };
    }
    /* —— 方案 —— */
    m = q.match(/方案\s*([ABCD])|^([ABCD])\s*方案|([ABCD])\s*(?:方案|选项)/i);
    if (m) {
      var key = (m[1] || m[2] || m[3]).toUpperCase();
      var pv2 = K.preview(M.data, LIB, null, paramsOf(), R), cd = pv2.cards.filter(function (c) { return c.key === key; })[0];
      if (cd) return { text: key + ' ' + cd.name + '：' + v.queue + ' ' + pv2.base.metrics.queueDays + ' → ' + cd.result.metrics.queueDays + ' 天，' + v.capacity + ' ' + fmtN(pv2.base.metrics.weeklyUnits) + ' → ' + fmtN(cd.result.metrics.weeklyUnits) + ' ' + v.unit + '，加班 ' + cd.result.metrics.otHours + ' h/周' + (cd.result.cost ? '，费用 ' + fmtN(cd.result.cost) + ' 元 · 预计' : '') + '。责任岗位 ' + cd.roleName + '。',
        blocks: [tagsb(cd.result.notes.slice(0, 2).map(function (x) { return cut(x, 24); }))],
        act: function () { M.pick = key; if (step !== 'improve') setStep('improve'); else { draw(); focusSel('.pd-option.on'); } } };
    }
    /* —— 调参数 —— */
    m = q.match(/(?:换型|切换|账套切换|波次切换)[^0-9]{0,8}(\d{1,3})\s*(?:分钟|min|分)/i);
    if (m) {
      var mv = Math.max(10, Math.min(45, Math.round(parseFloat(m[1]) / 5) * 5));
      var pv3 = K.preview(M.data, LIB, null, { setupMin: mv }, R), ca = pv3.cards.filter(function (c) { return c.key === 'A'; })[0];
      return { text: '停机' + v.setup + '时间按 ' + mv + ' min 重算：A ' + ca.name + ' 的' + v.queue + ' ' + pv3.base.metrics.queueDays + ' → ' + ca.result.metrics.queueDays + ' 天，' + v.capacity + ' ' + fmtN(ca.result.metrics.weeklyUnits) + ' ' + v.unit + '。参数已改好。',
        act: function () { M.params.setupMin = mv; M.pick = 'A'; if (step !== 'improve') setStep('improve'); else { draw(); focusSel('.m8-params .pm'); } } };
    }

    if (step === 'connect') {
      if (has(q, ['待核验', '几条', '没过', '核验'])) return { text: '本周 ' + vr.total + ' 条' + v.report + '，待核验 ' + vr.pending + ' 条：' + vr.rows.filter(function (r) { return !r.resolved; }).map(function (r) { return r.kindName; }).join('、') + '。',
        blocks: [mini(['问题', v.report, 'AI 建议值'], vr.rows.slice(0, 5).map(function (r) { return [r.kindName, r.reportId || '—', cut(r.suggest, 14)]; }))],
        focus: rowOf(w, vr.rows[0] ? (vr.rows[0].reportId || vr.rows[0].kindName) : '') };
      if (has(q, ['漏报', '补', '怎么补'])) {
        var ms2 = vr.rows.filter(function (r) { return r.kind === 'missing'; })[0];
        if (ms2) return { text: ms2.text + '。AI 建议：' + ms2.suggest + '。确认后只补这一条，其余不动。', focus: rowOf(w, ms2.kindName),
          act: function () { commit(K.confirmReport(M.data, LIB, ms2.id), ms2.kindName + ' 已按建议值确认'); } };
      }
      if (has(q, ['直连', '来源', '导入', '同步'])) {
        var dir = M.data.sources.filter(function (s) { return s.mode === 'direct'; });
        return { text: M.data.sources.length + ' 个来源，系统直连 ' + dir.length + ' 个，其余表格导入；合计 ' + fmtN(M.data.sources.reduce(function (t, s) { return t + s.rows; }, 0)) + ' 条。',
          blocks: [mini(['来源', '方式', '条数'], M.data.sources.map(function (s) { return [cut(s.name, 6), s.mode === 'direct' ? '直连' : '导入', fmtN(s.rows)]; }))] };
      }
      if (has(q, ['全部确认', '进看板', '开始', '进入'])) return { text: '确认 ' + vr.pending + ' 条后进' + v.flowName + '看板：' + v.bottleneck + ' ' + B.line.name + '，负荷 ' + k.load7 + '%，' + v.queue + ' ' + k.queueDays + ' 天。', act: enterBoard };
    }

    if (step === 'board') {
      if (has(q, ['排队', '等待', '多少天'])) return { text: v.queue + ' ' + k.queueDays + ' 天（' + v.bottleneck + ' ' + B.line.name + ' 前）；' + v.flowDays + ' ' + R.weekly.current.flowDays + ' 天。',
        focus: w ? w.querySelectorAll('.pd-kpi')[1] : null };
      if (has(q, ['异常', '处置', '先处理', '哪一条'])) {
        var op0 = R.alerts.filter(function (a) { return a.status === 'open'; }).sort(function (a, b) { return (b.savedH || 0) - (a.savedH || 0); })[0];
        if (!op0) return { text: '本周 ' + R.alerts.length + ' 起异常已全部处置。' };
        return { text: '先处置 ' + op0.id + ' ' + op0.ruleName + '：' + op0.text + '。根因 ' + op0.cause + '，' + op0.roleName + ' ' + op0.action + (op0.savedH ? '，预计回收 ' + op0.savedH + ' h' : '') + '。',
          blocks: [mini(['规则', '根因', '预计'], R.alerts.filter(function (a) { return a.status === 'open'; }).slice(0, 4).map(function (a) { return [cut(a.ruleName, 8), cut(a.cause, 10), (a.savedH || 0) + ' h']; }))],
          act: function () { commit(K.handleException(M.data, LIB, op0.id), op0.id + ' ' + op0.action + ' · ' + op0.roleName); } };
      }
      if (has(q, ['在制', '超限', '缓冲', '投料', '释放'])) {
        var b2 = R.buffer;
        return { text: '瓶颈前' + v.wip + '今日 ' + b2.today + ' h、明日 ' + b2.hours + ' h，上限 ' + b2.max + ' h（' + b2.capDays + ' 天）' + (b2.hours >= b2.max ? '，明日超限' : '，在上限内') + '。按节拍' + v.release + '后 ' + b2.release.line.name + ' 明日计划 ' + b2.release.before + ' → ' + b2.release.after + ' h。',
          act: function () { setStep('diag'); focusSel('.m8-gauge', 900); } };
      }
      if (has(q, ['合格率', '质量'])) return { text: v.fpy + ' ' + k.fpy + '%，12 周基线 ' + R.weekly.current.fpy + '%。' + (R.alerts.filter(function (a) { return a.kind === 'quality'; })[0] ? R.alerts.filter(function (a) { return a.kind === 'quality'; })[0].text + '。' : '') };
      if (has(q, ['加班'])) return { text: '本周加班 ' + k.otHours + ' h，' + R.dispatch.overLimitNoOt + ' 人本月已到 ' + M.data.otCap.month + ' h 上限。', act: function () { setStep('exec'); } };
    }

    if (step === 'diag') {
      var l2 = lossNow();
      if (has(q, ['时间', '花在', '损失', '构成'])) return { text: l2.line.name + ' 每日 ' + l2.start.value + ' h 计划' + v.run + '，' + v.cutting + ' ' + l2.end.value + ' h。' + l2.items.slice(0, 4).map(function (x) { return x.label + ' ' + Math.abs(x.value) + ' h'; }).join('，') + '。可用率 ' + l2.availability + '%，性能率 ' + l2.performance + '%。',
        blocks: [mini(['项', 'h/日'], l2.items.map(function (x) { return [x.label, Math.abs(x.value)]; }))] };
      if (has(q, ['换型', '合批', '能省'])) return { text: v.setup + ' ' + R.sequence.before.changeovers + ' 次 ' + K.r1(R.sequence.before.minutes / 60) + ' h/日，合批后 ' + R.sequence.after.changeovers + ' 次 ' + K.r1(R.sequence.after.minutes / 60) + ' h/日，省 ' + R.sequence.savedHPerDay + ' h/日 ≈ ' + fmtN(Math.round(R.sequence.savedHPerDay / (B.hpu || 1))) + ' ' + v.unit + '/日。',
        act: function () { setStep('improve'); focusSel('.m8-seq', 900); } };
      if (has(q, ['标准工时', '过期', '校准'])) {
        var ex = R.calibration.filter(function (c) { return c.status === 'expired' && !c.adopted; });
        if (!ex.length) return { text: '标准工时与 12 周中位一致，暂无过期项。' };
        return { text: ex.length + ' 项标准工时过期：' + ex.map(function (c) { return c.productName + ' ' + c.op + ' ' + c.std + ' → ' + c.suggest + ' h（' + (c.dev > 0 ? '+' : '') + c.dev + '%）'; }).join('；') + '。采纳后排程与在制预测重算。',
          blocks: [mini(['产品', v.op, '偏差'], ex.map(function (c) { return [cut(c.productName, 8), c.op, (c.dev > 0 ? '+' : '') + c.dev + '%']; }))],
          focus: rowOf(w, ex[0].op),
          act: function () { commit(K.adoptStd(M.data, LIB, ex[0].product, ex[0].op), ex[0].productName + ' ' + ex[0].op + ' 标准工时 ' + ex[0].std + ' → ' + ex[0].suggest + ' h'); } };
      }
      if (has(q, ['投料', '节拍', '释放', '缓冲'])) {
        var b3 = R.buffer;
        return { text: '明日允许' + v.release + ' ' + fmtN(b3.release.allowedUnits) + ' ' + v.unit + '，' + b3.release.line.name + ' 计划 ' + b3.release.before + ' → ' + b3.release.after + ' h，' + v.wip + '天数 ' + b3.wipDays.before + ' → ' + b3.wipDays.after + ' 天，释放人时 ' + HH(b3.release.freedHours) + '/日。',
          act: M.data.releasePlan ? null : function () { commit(K.applyRelease(M.data, LIB), b3.release.line.name + ' ' + K.short(b3.release.date) + ' 计划 ' + b3.release.before + ' → ' + b3.release.after + ' h · 已下发' + v.roles.foreman); } };
      }
      if (has(q, ['等待', '等料', '等检'])) return { text: v.wait + '构成：' + l2.waitDist.map(function (x) { return x.label + ' ' + x.value + ' h'; }).join('，') + '。' + v.waitReasons[2] + '可由' + v.firstPieceCheck + '前移回收 80%。' };
      if (has(q, ['利用率', '可用率', '性能率'])) return { text: '可用率 ' + l2.availability + '%，性能率 ' + l2.performance + '%，有效利用率 ' + l2.effUtil + '%；12 周 ' + l2.weekly[0].effUtil + '% → ' + l2.weekly[l2.weekly.length - 1].effUtil + '%。' };
    }

    if (step === 'improve') {
      var pv4 = K.preview(M.data, LIB, null, paramsOf(), R);
      if (has(q, ['哪个方案', '推荐', '选哪', '好'])) {
        var rc = pv4.cards.filter(function (c) { return c.key === pv4.recommended; })[0];
        return { text: '推荐 ' + rc.key + ' ' + rc.name + '：' + v.queue + ' ' + pv4.base.metrics.queueDays + ' → ' + rc.result.metrics.queueDays + ' 天，加班 ' + rc.result.metrics.otHours + ' h/周，费用 0。组合 A+B+C 能到 ' + pv4.combo.result.metrics.queueDays + ' 天。',
          blocks: [mini(['方案', v.queue, '加班'], pv4.cards.map(function (c) { return [c.key, c.result.metrics.queueDays + ' 天', c.result.metrics.otHours + ' h']; }))],
          act: function () { M.pick = pv4.recommended; draw(); focusSel('.pd-option.on'); } };
      }
      if (has(q, ['几个人', '支援', '多能工'])) {
        var cb = pv4.cards.filter(function (c) { return c.key === 'B'; })[0];
        return { text: cb.name + '：' + cb.result.notes.join('；') + '。责任岗位 ' + cb.roleName + '，' + v.queue + ' ' + pv4.base.metrics.queueDays + ' → ' + cb.result.metrics.queueDays + ' 天。',
          act: function () { M.pick = 'B'; draw(); focusSel('.pd-option.on'); } };
      }
      if (has(q, ['换型', '合批', '顺序'])) {
        var q4 = K.sequenceJobs(M.data, LIB, M.params.setupMin);
        return { text: v.setup + ' ' + q4.before.changeovers + ' 次 ' + K.r1(q4.before.minutes / 60) + ' h → ' + q4.after.changeovers + ' 次 ' + K.r1(q4.after.minutes / 60) + ' h，省 ' + q4.savedHPerDay + ' h/日；交期约束' + (q4.dueOk ? '满足' : '未满足') + '。',
          blocks: [mini(['序', v.lot, v.setup], q4.after.rows.slice(0, 5).map(function (r) { return [r.seq, r.id, (r.setupMin || 0) + ' min']; }))],
          act: M.data.jobSeq ? null : function () { commit(K.applySequence(M.data, LIB, M.params.setupMin), v.setup + ' ' + q4.before.changeovers + ' 次 → ' + q4.after.changeovers + ' 次 · 省 ' + q4.savedHPerDay + ' h/日'); } };
      }
      if (has(q, ['立项', '落地', '执行'])) {
        var kk = M.pick === '组合' ? pv4.combo.keys : [M.pick];
        return { text: '立项 ' + kk.join(' + ') + '，节点按天排期，进执行与' + v.dispatch.replace('单', '') + '跟踪。',
          act: function () { var nd = K.commitProject(M.data, LIB, kk, paramsOf()), np = nd.projects[nd.projects.length - 1]; commit(nd, '已立项 ' + np.id + ' · ' + np.owner); } };
      }
    }

    if (step === 'exec') {
      var dp2 = R.dispatch;
      if (has(q, ['缺人', '未覆盖', '够不够', '需人'])) return { text: '明日需 ' + dp2.need + ' 人，已派 ' + dp2.filled + ' 人，' + v.support + ' ' + dp2.support + ' 人' + (dp2.supportEmps.length ? '（' + dp2.supportEmps.join('、') + '）' : '') + '，未覆盖 ' + dp2.unmet.reduce(function (a, u) { return a + u.missing; }, 0) + ' 人。',
        focus: w ? w.querySelectorAll('.pd-kpi')[3] : null };
      if (has(q, ['加班上限', '上限', '谁在加班', '超限'])) {
        var over = dp2.rows.filter(function (r) { return r.overtimeH >= M.data.otCap.month; });
        return { text: dp2.overLimitNoOt + ' 人本月加班到 ' + M.data.otCap.month + ' h 上限，明日不排加班；本周加班 ' + dp2.otWeek.before + ' → ' + dp2.otWeek.after + ' h。',
          blocks: over.length ? [mini(['E-编号', v.line, '本月加班'], over.slice(0, 5).map(function (r) { return [r.emp, cut(r.lineName, 8), r.overtimeH + ' h']; }))] : null,
          focus: over.length ? rowOf(w, over[0].emp) : null };
      }
      if (has(q, ['落后', '看板', '达成', '计划'])) {
        var bh = R.planHit.filter(function (p) { return p.behind; });
        if (!bh.length) return { text: '各线按计划推进，' + R.planHit.map(function (p) { return p.lineName + ' ' + p.pct + '%'; }).join('，') + '。' };
        return { text: bh.map(function (p) { return p.lineName + ' ' + p.pct + '%（' + fmtN(p.actual) + ' / ' + fmtN(p.target) + '）'; }).join('；') + ' 落后，已进异常预警。',
          blocks: [mini([v.line, '达成', '实际/计划'], R.planHit.map(function (p) { return [cut(p.lineName, 8), p.pct + '%', fmtN(p.actual) + '/' + fmtN(p.target)]; }))],
          focus: w ? w.querySelector('.m8-hit') : null };
      }
      if (has(q, ['单点', '技能', '带教', '矩阵'])) {
        var sg = R.skills.coverage.filter(function (c) { return c.single; });
        return { text: sg.length + ' 个' + v.op + '是单点：' + sg.map(function (c) { return c.op + '（2 级以上 ' + c.qualified + ' 人 / 每日需 ' + c.need + ' 人，覆盖度 ' + c.ratio + '）'; }).join('；') + '。覆盖度低于 1.5 算单点。',
          blocks: R.skills.pairs.length ? [tagsb(R.skills.pairs.map(function (p) { return p.trainee + ' 由 ' + p.mentor + ' 带教 ' + p.op; }))] : null,
          act: R.skills.pairs.length && !R.skills.pairs[0].added ? function () { var p0 = R.skills.pairs[0]; commit(K.addTraining(M.data, LIB, p0.trainee, p0.op), p0.trainee + ' 加入本周带教 · ' + p0.op); } : null };
      }
      if (has(q, ['保养', '到期', '窗口'])) {
        var md = R.maintenance.filter(function (x) { return !x.scheduled; });
        if (!md.length) return { text: v.maint + '已全部排入窗口。' };
        return { text: md.length + ' 台到期：' + md.map(function (x) { return x.machine + '（' + cut(x.reasons[0], 16) + '）'; }).join('；') + '。建议窗口 ' + (md[0].window ? md[0].window.label : '—') + '。',
          act: md[0].window ? function () { commit(K.scheduleMaint(M.data, LIB, md[0].machine), md[0].machine + ' ' + v.maint + '排入 ' + md[0].window.label + ' · ' + md[0].role); } : null };
      }
      if (has(q, ['下发', '生成', '派工'])) return { text: v.dispatch + ' ' + dp2.id + '：' + dp2.filled + ' 人，' + v.support + ' ' + dp2.support + ' 人，未覆盖 ' + dp2.unmet.length + '。',
        act: M.data.dispatch ? null : function () { commit(K.applyDispatch(M.data, LIB), v.dispatch + ' ' + dp2.id + ' 已下发 · ' + dp2.filled + ' 人'); } };
    }

    if (step === 'report') {
      var W2 = R.weekly, L2 = R.ledger;
      if (has(q, ['省了', '多少', '增效', '节省'])) {
        if (!L2.rows.length) return { text: '本周还没有采纳记录，增效账是空的。每采纳一条 AI 建议按小时入账，' + v.bottleneck + '工时再折算' + v.unit + '。',
          act: function () { setStep('board'); } };
        return { text: '本周采纳 ' + L2.rows.length + ' 条，预计省 ' + R.kpi.savedH + ' h（' + v.bottleneck + ' ' + L2.totals.bottleneckH + ' h、其他 ' + L2.totals.nonBottleneckH + ' h），折算 ' + fmtN(L2.totals.units) + ' ' + v.unit + '，加班少 ' + L2.totals.otH + ' h。',
          blocks: [mini(['类别', '节省'], L2.byKind.map(function (x) { return [x.label, x.value + ' h']; }))] };
      }
      if (has(q, ['走势', '趋势', '12 周', '利用率'])) return { text: '有效利用率 12 周 ' + W2.series[0].effUtil + '% → ' + W2.series[W2.series.length - 1].effUtil + '%；' + v.flowDays + ' ' + W2.series[0].flowDays + ' → ' + W2.series[W2.series.length - 1].flowDays + ' 天；加班 ' + W2.series[0].otHours + ' → ' + W2.series[W2.series.length - 1].otHours + ' h。',
        blocks: [mini(['周', '利用率', '加班'], W2.series.slice(-4).map(function (s) { return [s.label, s.effUtil + '%', s.otHours + ' h']; }))] };
      if (has(q, ['发给谁', '收件', '微信', '发送'])) return { text: '收件人：' + W2.recipients.join('、') + '。周报是微信文本版，扫码接收。',
        act: function () { sh.setQrReady(true); sh.showWeChat(); } };
      if (has(q, ['回看板', '看板'])) return { text: v.bottleneck + ' ' + B.line.name + '，负荷 ' + k.load7 + '%，' + v.queue + ' ' + k.queueDays + ' 天。', act: function () { setStep('board'); } };
    }

    /* —— 跨屏通用指标 —— */
    if (has(q, ['负荷'])) return { text: v.bottleneck + ' ' + B.line.name + ' 未来 7 天负荷 ' + k.load7 + '%，负荷平衡率 ' + B.balanceRate + '%。',
      blocks: [mini([v.line, '负荷'], R.S.lines.map(function (l) { return [cut(l.name, 10), l.load7 + '%']; }))] };
    if (has(q, ['产能', '产出'])) return { text: v.capacity + ' ' + fmtN(k.weeklyUnits) + ' ' + v.unit + '；' + v.bottleneck + '每释放 1 h ≈ ' + fmtN(B.unitPerHour) + ' ' + v.unit + '。' };
    if (has(q, ['标准工时', '过期', '校准'])) {
      var ex2 = R.calibration.filter(function (c) { return c.status === 'expired' && !c.adopted; });
      if (!ex2.length) return { text: '标准工时与 12 周中位一致，暂无过期项。', act: function () { if (step !== 'diag') setStep('diag'); } };
      return { text: ex2.length + ' 项标准工时过期：' + ex2.map(function (c) { return c.productName + ' ' + c.op + ' ' + c.std + ' → ' + c.suggest + ' h（' + (c.dev > 0 ? '+' : '') + c.dev + '%）'; }).join('；') + '。',
        blocks: [mini(['产品', v.op, '偏差'], ex2.map(function (c) { return [cut(c.productName, 8), c.op, (c.dev > 0 ? '+' : '') + c.dev + '%']; }))],
        act: function () { if (step !== 'diag') { setStep('diag'); refocus(ex2[0].op, 900); } else refocus(ex2[0].op); } };
    }
    if (has(q, ['换型', '合批', '损失', '时间都'])) {
      var l3 = lossNow();
      return { text: v.setup + ' ' + R.sequence.before.changeovers + ' 次 ' + K.r1(R.sequence.before.minutes / 60) + ' h/日 → 合批后 ' + R.sequence.after.changeovers + ' 次 ' + K.r1(R.sequence.after.minutes / 60) + ' h/日，省 ' + R.sequence.savedHPerDay + ' h/日；' + l3.line.name + ' 每日 ' + l3.start.value + ' h 计划' + v.run + '，' + v.cutting + ' ' + l3.end.value + ' h。',
        blocks: [mini(['项', 'h/日'], l3.items.slice(0, 5).map(function (x) { return [x.label, Math.abs(x.value)]; }))],
        act: function () { if (step !== 'diag') setStep('diag'); } };
    }
    if (has(q, ['怎么办', '先做', '建议', '下一步'])) {
      var op1 = R.alerts.filter(function (a) { return a.status === 'open'; }).sort(function (a, b) { return (b.savedH || 0) - (a.savedH || 0); })[0];
      var pv5 = K.preview(M.data, LIB, null, paramsOf(), R), rc2 = pv5.cards.filter(function (c) { return c.key === pv5.recommended; })[0];
      return { text: '先处置 ' + (op1 ? op1.ruleName + '（' + op1.roleName + '，预计 ' + (op1.savedH || 0) + ' h）' : '无待处置异常') + '；本周改善做 ' + rc2.key + ' ' + rc2.name + '，' + v.queue + ' ' + pv5.base.metrics.queueDays + ' → ' + rc2.result.metrics.queueDays + ' 天。',
        act: function () { setStep('improve'); } };
    }
    return null;
  }

  /* ---------- 文档：报工表 / 复盘 PPT / 工艺与合同 / 邮件 ---------- */
  function colsOf(head) {
    var map = {};
    (head || []).forEach(function (x, i) {
      var s = String(x || '');
      if (map.lot == null && /工单|批次|订单|波次|户次|任务/.test(s)) map.lot = i;
      if (map.op == null && /工序|环节|工位|岗位/.test(s)) map.op = i;
      if (map.emp == null && /员工|工号|人员|操作者/.test(s)) map.emp = i;
      if (map.min == null && /工时|时长|分钟|用时/.test(s)) map.min = i;
      if (map.qty == null && /数量|产量|合格|件数|完成/.test(s)) map.qty = i;
      if (map.date == null && /日期|时间|班次/.test(s)) map.date = i;
    });
    return map;
  }
  function addSource(doc, rows, note) {
    var nd = K.ensure(M.data);
    nd.sources = nd.sources.filter(function (s) { return s.id !== 'doc-import'; });
    nd.sources.push({ id: 'doc-import', name: cut(doc.name, 18), mode: 'import', lastSync: nd.today + ' 14:20', rows: rows });
    nd.log.push({ seq: nd.log.length + 1, kind: 'verify', label: '导入' + cut(doc.name, 14), detail: note });
    M.data = nd; recompute();
  }
  function docExcel(doc) {
    var v = V(), s0 = (doc.sheets || [])[0];
    if (!s0 || !s0.rows.length) return { text: 'Excel《' + doc.name + '》读完，没有可用的数据行。' };
    var head = s0.rows[0], body = s0.rows.slice(1).filter(function (r) { return r.join('').trim(); });
    var map = colsOf(head);
    if (map.lot != null && (map.min != null || map.qty != null)) {
      /* 真·报工表：按六条规则里能离线核的三条核一遍 */
      var seen = {}, dup = [], zero = [], noEmp = [], qty = 0, mins = 0;
      body.forEach(function (r, i) {
        var key = [r[map.lot], map.op != null ? r[map.op] : '', map.date != null ? r[map.date] : ''].join('|');
        if (seen[key]) dup.push(i + 2); else seen[key] = 1;
        var qv = map.qty != null ? parseFloat(String(r[map.qty]).replace(/,/g, '')) : 0;
        var mv = map.min != null ? parseFloat(String(r[map.min]).replace(/,/g, '')) : 0;
        if (map.qty != null && !(qv > 0)) zero.push(i + 2);
        if (map.emp != null && !String(r[map.emp] || '').trim()) noEmp.push(i + 2);
        qty += qv > 0 ? qv : 0; mins += mv > 0 ? mv : 0;
      });
      var bad = dup.length + zero.length + noEmp.length;
      addSource(doc, body.length, body.length + ' 行' + v.report + '，核出 ' + bad + ' 条待核验');
      return { text: 'Excel《' + doc.name + '》读完：《' + s0.name + '》' + body.length + ' 行、' + head.length + ' 列。'
        + '合计 ' + fmtN(Math.round(qty)) + ' ' + v.unit + '、' + fmtN(Math.round(mins)) + ' min。\n'
        + '核验：重复 ' + dup.length + ' 条、数量为零 ' + zero.length + ' 条、缺 E-编号 ' + noEmp.length + ' 条，共 ' + bad + ' 条要班组长确认。已登记为导入批次。',
        blocks: [mini(head.slice(0, 4).map(function (x) { return cut(x, 6); }), body.slice(0, 3).map(function (r) { return r.slice(0, 4).map(function (x) { return cut(x, 10); }); }))],
        act: function () { if (M.step !== 'connect') setStep('connect'); else draw(); focusSel('.src-row:last-child', 700); } };
    }
    /* 不是报工表：把真读到的列和行数说清楚，登记为导入批次 */
    var nums = [];
    body.forEach(function (r) { r.forEach(function (x) { var n = parseFloat(String(x).replace(/,/g, '')); if (!isNaN(n) && Math.abs(n) > 999) nums.push(n); }); });
    var big = nums.length ? Math.max.apply(null, nums) : 0;
    addSource(doc, body.length, '《' + s0.name + '》' + body.length + ' 行，列不含' + v.report + '字段，不参与核验');
    return { text: 'Excel《' + doc.name + '》读完：' + doc.sheets.length + ' 张表，《' + s0.name + '》' + body.length + ' 行 ' + head.length + ' 列。\n'
      + '列是 ' + head.slice(0, 6).map(function (x) { return cut(x, 8); }).join(' / ') + (nums.length ? '，数值列里数额居前的一笔 ' + fmtN(big) : '') + '。\n'
      + v.report + '核验要 ' + [v.lot, v.op, 'E-编号', '工时', '数量', '日期'].join(' / ') + ' 这几列，这张表里没有，核验不动数。已按 ' + body.length + ' 行登记为导入批次。',
      blocks: [mini(head.slice(0, 4).map(function (x) { return cut(x, 6); }), body.slice(0, 3).map(function (r) { return r.slice(0, 4).map(function (x) { return cut(x, 10); }); }))],
      act: function () { if (M.step !== 'connect') setStep('connect'); else draw(); focusSel('.src-row:last-child', 700); } };
  }
  function docSlides(doc) {
    var v = V(), R = M.R, txt = (doc.text || '').replace(/\s+/g, ' ');
    var titles = (doc.slides || []).map(function (s) { return s.title || ''; }).filter(Boolean);
    var mSet = txt.match(/(?:换型|切换|账套切换|波次切换)[^0-9]{0,8}(\d{1,3}(?:\.\d+)?)\s*(?:分钟|min|分)/i);
    var mHit = txt.match(/(?:准时率|达成率|通过率|合格率)[^0-9]{0,6}(\d{1,3}(?:\.\d+)?)\s*%/);
    var lines = ['PPT《' + doc.name + '》读完：' + doc.slides.length + ' 页，第 1 页「' + (titles[0] || '—') + '」' + (titles[1] ? '、第 2 页「' + titles[1] + '」' : '') + '。'];
    var kv = [], setMin = null;
    if (mSet) {
      setMin = Math.max(10, Math.min(45, Math.round(parseFloat(mSet[1]) / 5) * 5));
      var cur = M.params.setupMin != null ? M.params.setupMin : M.data.setupMatrix.diffFixture;
      var pv = K.preview(M.data, LIB, null, { setupMin: setMin }, R), ca = pv.cards.filter(function (c) { return c.key === 'A'; })[0];
      lines.push('文档里的' + v.setup + '时间 ' + mSet[1] + ' 分钟，当前停机' + v.setup + ' ' + cur + ' min，差 ' + Math.round(cur - parseFloat(mSet[1])) + ' min。');
      lines.push('按 ' + setMin + ' min 重算：A ' + ca.name + ' 的' + v.queue + ' ' + pv.base.metrics.queueDays + ' → ' + ca.result.metrics.queueDays + ' 天，' + v.capacity + ' ' + fmtN(pv.base.metrics.weeklyUnits) + ' → ' + fmtN(ca.result.metrics.weeklyUnits) + ' ' + v.unit + '。参数已改成 ' + setMin + ' min。');
      kv.push(['文档' + v.setup, mSet[1] + ' min'], ['当前停机' + v.setup, cur + ' min'], ['重算' + v.queue, ca.result.metrics.queueDays + ' 天']);
    }
    if (mHit) {
      var avg = R.planHit.length ? Math.round(R.planHit.reduce(function (a, p) { return a + p.pct; }, 0) / R.planHit.length) : 0;
      var bh = R.planHit.filter(function (p) { return p.behind; });
      lines.push('文档目标准时率 ' + mHit[1] + '%，今日' + v.shiftA + '前 4 小时计划达成 ' + avg + '%' + (bh.length ? '，' + bh[0].lineName + ' ' + bh[0].pct + '% 落后' : '') + '。');
      kv.push(['文档目标', mHit[1] + '%'], ['今日达成', avg + '%']);
    }
    if (!mSet && !mHit) {
      lines.push('没读到' + v.setup + '时间或准时率口径，' + v.dept + '这边的参数不动。');
      return { text: lines.join('\n'), blocks: [tagsb(titles.slice(0, 3))] };
    }
    return { text: lines.join('\n'), blocks: [kvb(kv), tagsb(titles.slice(0, 2))],
      act: function () {
        if (setMin != null) { M.params.setupMin = setMin; M.pick = 'A'; }
        if (M.step !== 'improve') setStep('improve'); else draw();
        focusSel('.m8-params .pm', 700);
      } };
  }
  function docWord(doc, txt) {
    var v = V(), R = M.R;
    var mStd = txt.match(/(?:标准工时|单件工时|节拍)[^0-9]{0,8}(\d+(?:\.\d+)?)\s*(?:h|小时|分钟|min|秒|s)/i);
    var mSet = txt.match(/(?:换型|切换)[^0-9]{0,8}(\d{1,3})\s*(?:分钟|min|分)/i);
    var mDue = txt.match(/(20\d{2})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
    var money = (txt.match(/[\d][\d,]*\s*元/g) || []).slice(0, 3);
    var lines = [(doc.kind === 'pdf' ? 'PDF' : 'Word') + '《' + doc.name + '》读完：' + (doc.paragraphs.length || 1) + ' 段'
      + (doc.tables && doc.tables.length ? '、' + doc.tables.length + ' 张表' : '') + '。'];
    var kv = [];
    if (mSet) { var sm = Math.max(10, Math.min(45, Math.round(parseFloat(mSet[1]) / 5) * 5)); kv.push(['文档' + v.setup, mSet[1] + ' min']); lines.push('文档写的' + v.setup + ' ' + mSet[1] + ' 分钟，已按 ' + sm + ' min 改参数重算。'); M.params.setupMin = sm; }
    if (mStd) { kv.push(['文档工时', mStd[0]]); lines.push('文档工时口径 ' + mStd[0] + '，当前' + v.bottleneck + '单件 ' + R.bottleneck.hpu + ' h/' + v.unit + '。'); }
    if (mDue) {
      var due = mDue[1] + '-' + ('0' + mDue[2]).slice(-2) + '-' + ('0' + mDue[3]).slice(-2);
      var days = Math.round((Date.parse(due) - Date.parse(M.data.today)) / 86400000);
      var need = Math.round((R.weekly.current.flowDays + R.metrics.queueDays) * 10) / 10;
      lines.push('交付期限 ' + due + '，距 ' + M.data.today + ' 还有 ' + days + ' 天；当前' + v.flowDays + ' ' + R.weekly.current.flowDays + ' 天 + ' + v.queue + ' ' + R.metrics.queueDays + ' 天 = ' + need + ' 天，' + (days > need ? '排得下。' : '排不下，要先把' + v.queue + '压下来。'));
      kv.push(['交付期限', due], ['剩余', days + ' 天'], ['当前需要', need + ' 天']);
    }
    if (money.length) kv.push(['金额', money[0]]);
    if (!mSet && !mStd && !mDue) {
      lines.push('没读到工时、' + v.setup + '时间或交付期限，' + v.dept + '这边不动数。');
      return { text: lines.join('\n'), blocks: [tagsb((doc.paragraphs || []).slice(0, 3).map(function (p) { return cut(p, 16); }))] };
    }
    return { text: lines.join('\n'), blocks: [kvb(kv)],
      act: function () {
        if (mSet) { M.pick = 'A'; if (M.step !== 'improve') setStep('improve'); else draw(); focusSel('.m8-params .pm', 700); return; }
        P.drawer(M.frame.body, { title: cut(doc.name, 24), sub: doc.sizeText + ' · ' + (doc.paragraphs.length || 1) + ' 段',
          body: [kvb(kv), h('div', { class: 'pd-pre', style: 'max-height:320px;overflow:auto' }, [(doc.text || '').slice(0, 900)])] });
      } };
  }
  function docMail(doc) {
    var v = V(), R = M.R, ml = doc.mail || {}, txt = (doc.text || '').replace(/\s+/g, ' ');
    var mDown = txt.match(/(?:停机|故障|异常|待料|延期)/);
    var mMin = txt.match(/(\d{1,4})\s*(?:分钟|min)/);
    var lines = ['邮件《' + (ml.subject || doc.name) + '》读完：发件 ' + (ml.from || '—') + '，' + (ml.date || '') + '。'];
    var kv = [['发件', ml.from || '—'], ['主题', cut(ml.subject || '—', 16)], ['日期', ml.date || '—']];
    if (mDown) {
      lines.push('正文里提到「' + mDown[0] + '」' + (mMin ? '、' + mMin[1] + ' 分钟' : '') + '，本周异常预警已有 ' + R.alerts.length + ' 起、待处置 ' + R.kpi.alertsOpen + ' 起，这一条按' + v.down + '口径记进本周动作。');
      var nd = K.ensure(M.data);
      nd.log.push({ seq: nd.log.length + 1, kind: 'exception', label: '邮件：' + cut(ml.subject || doc.name, 12), detail: (ml.from || '') + ' ' + (ml.date || '') + ' · ' + mDown[0] + (mMin ? ' ' + mMin[1] + ' min' : '') });
      M.data = nd; recompute();
      return { text: lines.join('\n'), blocks: [kvb(kv)], act: function () { if (M.step !== 'report') setStep('report'); else draw(); focusSel('.pd-log', 700); } };
    }
    lines.push('正文没有' + v.down + '、异常或交期内容，' + v.dept + '这六屏不动数。');
    return { text: lines.join('\n'), blocks: [kvb(kv), h('div', { class: 'tags' }, (ml.attaches || []).slice(0, 3).map(function (a) { return h('span', {}, [cut(a, 14)]); }))] };
  }
  function onDoc(doc) {
    if (!doc || !doc.ok || !M.R) return null;
    var txt = (doc.text || '').replace(/\s+/g, ' ');
    if (doc.kind === 'excel') return docExcel(doc);
    if (doc.kind === 'ppt') return docSlides(doc);
    if (doc.kind === 'eml') return docMail(doc);
    if (doc.kind === 'word' || doc.kind === 'pdf' || doc.kind === 'text') return docWord(doc, txt);
    return null;
  }

  window.DGG.chatBrain('m8', {
    opener: function (step) { return opener(step); },
    suggest: function (step) { return suggest(step); },
    answer: function (q, step) { return answer(q, step); },
    onDoc: function (doc, step) { return onDoc(doc, step); }
  });

  window.DGG.registerModule('m8', { mount: mount, unmount: unmount, onCompany: onCompany, onIndustry: onIndustry });
})();
