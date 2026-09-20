/* AI法务 · 合同 设立 知产 三件事（六屏 · 动画叙事）
 * 接入 → 法务驾驶舱 → 合同审查 → 新设主体 → 知识产权 → 台账与提醒
 * 计算全部走 DGG.coreM7（与 skill 同一份内核）；采纳修订 / 确认设立 / 续展与申请清单都写回同一份数据
 * 每屏三拍：接入 0–0.8s（来源亮起、数据包飞向处理块）· 展开 0.8–2.2s（数字滚、线条画、条形长、表格流）
 *          · 结论 2.2–3.0s（一句话结论推上来，脉冲聚焦支撑它的那一行）；屏上的重算按钮重播时间轴
 * 纯预制、断网可用；不用任何存储 API
 */
(function () {
  'use strict';
  var sh, $root, h, DATA, P, K, LIB;
  var ACCENT = window.DGG.PALETTE.m7;
  var CAPS = ['合同审查', '新设主体', '知识产权', '台账与提醒'];
  var LV = { high: 'late', mid: 'risk', low: 'ok' }, LV_NAME = { high: '高风险', mid: '中风险', low: '低风险' };
  var SEV = { high: 'late', mid: 'risk', low: 'watch' }, SEV_NAME = { high: '高', mid: '中', low: '低' };
  var IPK = { trademark: 'accent', patent: 'handled', software: 'done', domain: 'watch' };
  var TYPES = [['subsidiary', '子公司'], ['branch', '分公司'], ['newco', '新公司']];
  var PRESETS = [[70, 30], [60, 40], [51, 49], [50, 50]];
  var KINDS = [['contract', '合同与节点'], ['license', '证照'], ['ip', '知产'], ['setup', '设立']];
  var M = { step: 'connect', arche: null, data: null, R: null, contract: null, filter: null, regKind: null, charged: false, name: null, company: null, frame: null, who: 0, told: null, replay: null, docN: 0 };

  function anim() { return window.DGG.anim; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function sectorOf(slug) { var hit = null; (DATA.industries.sectors || []).forEach(function (s) { (s.industries || []).forEach(function (i) { if (i.slug === slug) hit = s.key; }); }); return hit; }
  function archeOf(slug) { var sec = sectorOf(slug); var a = (sec && DATA.m10.archetypes.map[sec]) || 'make'; if (a === 'project') a = 'service'; return DATA.m7.samples[a] ? a : 'make'; }
  function loadArche(a) {
    M.arche = a;
    var sample = DATA.m7.samples[a], base = K.ensure(sample);
    if (M.name && M.name !== sample.company) {
      base.company = M.name;
      var stem = M.name.replace(/(股份)?有限(责任)?公司$/, '');
      base.setup.name = base.setup.name.indexOf(sample.company) >= 0 ? base.setup.name.split(sample.company).join(M.name) : stem + '（华南）有限公司';
      (base.setup.shares || []).forEach(function (s) { if (s.holder === sample.company) s.holder = M.name; });
    }
    if (M.company && M.company.systems) { var sys = M.company.systems; base.sources.forEach(function (s) { if (s.id === 'oa') s.mode = sys.indexOf('oa') >= 0 ? 'direct' : 'import'; if (s.id === 'erp' || s.id === 'oms') s.mode = sys.indexOf('erp') >= 0 || sys.indexOf('shop') >= 0 ? 'direct' : 'import'; if (s.id === 'crm') s.mode = sys.indexOf('crm') >= 0 ? 'direct' : 'import'; }); }
    M.data = base; M.contract = null; M.filter = null; M.regKind = null; M.docN = 0;
    recompute();
  }
  function recompute() { M.R = K.run(M.data, LIB); }
  function commit(data, msg) { M.data = data; recompute(); draw(); if (msg && M.frame) P.toast(M.frame.body, msg); }
  function fmtN(n) { return P.fmtN(n); }
  function W(n) { return K.fmtW(n); }
  function short(s) { return K.short(s); }
  function dsh(s) { return !s ? '' : (String(s).slice(0, 4) === M.data.today.slice(0, 4) ? K.short(s) : String(s)); }
  function cut(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n) + '…' : s; }
  function ipT(a) { return cut(String(a && a.title || ''), 16); }
  /* 日历格子只有 ~70px：剥掉合同号、括号补语与专利「一种」前缀，近似商标只留名字加事由 */
  function calT(t) {
    var s = String(t || '').replace(/^HT-\d{4}-\d{3}\s*/, '');
    var m = s.match(/^近似商标「(.+?)」/);
    if (m) return '「' + cut(m[1], 6) + '」异议';
    s = s.replace(/^一种/, '').replace(/（[^）]*）/g, '').trim();
    return cut(s, 12);
  }
  function soft(s) { return String(s || '').split('最容易').join('容易').split('最短').join('较短').split('最长').join('较长').split('最近').join('近期'); }
  function softL(list) { return (list || []).map(soft); }
  function pad2(n) { return String(+n).length < 2 ? '0' + (+n) : String(+n); }

  /* ---------- 动画件 ---------- */
  function cnt(to, o) {
    o = o || {};
    var dec = o.dec || 0;
    return h('b', { class: 'm7-cnt num', 'data-to': String(to), 'data-dec': String(dec), 'data-suf': o.suf || '' }, [dec ? (0).toFixed(dec) : '0']);
  }
  function cw(n) { return Math.abs(n) >= 10000 ? cnt(Math.round(n / 1000) / 10, { dec: 1, suf: ' 万元' }) : cnt(Math.round(n), { suf: ' 元' }); }
  function runCounts(scope, ms) {
    if (!scope) return;
    Array.prototype.forEach.call(scope.querySelectorAll('.m7-cnt'), function (e) {
      anim().count(e, parseFloat(e.getAttribute('data-to')) || 0, { decimals: +e.getAttribute('data-dec') || 0, unit: e.getAttribute('data-suf') || '', ms: ms || 900 });
    });
  }
  function vd(text) { return h('div', { class: 'm7-say off' }, [h('span', { class: 'ic' }, ['AI']), h('b', {}, [text])]); }
  function grid() { return h('div', { class: 'pd-grid m7-g' }); }
  function nodes(scope, sel) { return scope ? Array.prototype.slice.call(scope.querySelectorAll(sel)) : []; }
  function trs(el) { return el ? Array.prototype.slice.call(el.querySelectorAll('tbody tr')) : []; }
  function workEl() { return M.frame ? M.frame.work : null; }
  function rowOf(scope, txt) {
    var list = scope ? scope.querySelectorAll('.pd-table tbody tr, .pd-item, .m7-classes .cl, .m7-lines .ln') : [], i;
    for (i = 0; i < list.length; i++) if (list[i].textContent.indexOf(txt) >= 0) return list[i];
    return null;
  }
  function refocus(txt, ms) { setTimeout(function () { var el = rowOf(workEl(), txt); if (el) anim().pulse(el, { ms: 2200, scroll: true }); }, ms || 90); }

  function flowBar(o) {
    var srcWrap = h('div', { class: 'src' }, o.src.map(function (s) { return h('div', { class: 's' }, [h('b', {}, [s[0]]), h('span', {}, [s[1] || ''])]); }));
    var hub = h('div', { class: 'hub' }, [h('span', { class: 'an-live' }), h('b', {}, [o.hub])]);
    var out = h('div', { class: 'out' }, [h('b', {}, [o.out[0]]), h('span', {}, [o.out[1] || ''])]);
    var el = h('div', { class: 'c12 m7-flow' }, [srcWrap, h('span', { class: 'pipe an-pipe' }), hub, h('span', { class: 'pipe an-pipe' }), out, h('span', { class: 'sp' }),
      P.btn(o.btn, { cls: 'sm', onClick: function () { if (M.replay) M.replay(); } })]);
    el.srcWrap = srcWrap; el.hub = hub; el.out = out;
    el.srcs = Array.prototype.slice.call(srcWrap.children);
    return el;
  }
  /* SVG 条形从 0 长出来（甘特用） */
  function growBars(svgEl, ms) {
    var A = anim(), list = nodes(svgEl, 'rect[rx="4"]');
    if (!list.length || A.reduced) return;
    var ws = list.map(function (r) { return +r.getAttribute('width') || 0; }), n = list.length, span = 0.55;
    list.forEach(function (r) { r.setAttribute('width', '0.01'); });
    A.run(ms || 900, function (k) {
      list.forEach(function (r, i) {
        var t0 = (i / Math.max(1, n)) * (1 - span), kk = Math.max(0, Math.min(1, (k - t0) / span));
        r.setAttribute('width', String(Math.max(0.01, ws[i] * A.easeOut(kk))));
      });
    }, function () { list.forEach(function (r, i) { r.setAttribute('width', String(ws[i])); }); });
  }
  /* 三拍：接入 0–0.8s · 展开 0.8–2.2s · 结论 2.2–3.0s
     进屏走全程；屏内点一下（选行、采纳修订）只走后两拍的短版，免得反复重放 */
  function story(o) {
    function run(full) {
      var A = anim(), t0 = full ? 840 : 0, tv = full ? 2280 : 700;
      A.stopAll();
      var rises = (o.rise || []).filter(Boolean);
      rises.forEach(function (n) { n.style.opacity = '0'; });
      if (o.verdict) { o.verdict.classList.add('off'); o.verdict.classList.remove('an-verdict'); }
      if (o.paths && o.paths.length) A.drawSvg(o.paths, full ? 960 : 620, t0 + 40);
      if (o.bars && o.bars.length) A.grow(o.bars, { stagger: full ? 55 : 30, ms: full ? 760 : 520, delay: t0 + 20 });
      if (o.rows && o.rows.length) A.stream(o.rows, { stagger: full ? 70 : 34, delay: t0 });
      var T = A.timeline();
      if (full) {
        T.at(0, function () { if (o.src && o.src.length) A.rise(o.src, { stagger: 55, from: 'left', ms: 400 }); });
        T.at(200, function () { if (o.from && o.to) A.packet(o.from, o.to, { count: 3, ms: 620, gap: 110, label: o.label }); });
        T.at(560, function () { if (o.to) A.scan(o.to, { ms: 900 }); if (o.scan) A.scan(o.scan, { ms: 1200 }); });
      }
      T.at(t0, function () {
        runCounts(o.work, full ? 900 : 560);
        if (o.ring) A.ring(o.ring.el, o.ring.pct, { ms: full ? 900 : 560 });
        if (o.gantt) growBars(o.gantt, full ? 900 : 560);
        if (rises.length) A.rise(rises, { stagger: full ? 75 : 34, ms: full ? 460 : 340 });
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

  /* ---------- 取数小工具 ---------- */
  function srcShort(name) { return String(name).split(' · ')[0]; }
  function srcChips() { return M.data.sources.map(function (s) { return [srcShort(s.name), fmtN(s.rows) + ' 条']; }); }
  function topContract() { return M.R.contracts[0]; }
  function curContract() {
    var R = M.R;
    if (!M.contract || !R.byId[M.contract]) M.contract = (R.contracts[0] || {}).id;
    return R.byId[M.contract];
  }
  function missingOf(c) { return c.findings.filter(function (f) { return f.kind === 'missing'; }); }
  function urgentIp() { return M.R.ip.assets.filter(function (a) { return a.urgent; }); }
  function coreGap() { return M.R.ip.gaps.filter(function (g) { return g.tier === 'core'; })[0] || M.R.ip.gaps[0]; }
  function licSoon() { return M.R.licenses.filter(function (l) { return l.state !== 'ok'; }).sort(function (a, b) { return (a.daysLeft == null ? 9999 : a.daysLeft) - (b.daysLeft == null ? 9999 : b.daysLeft); })[0]; }
  function licOkPct() { var l = M.R.licenses; return l.length ? Math.round(100 * l.filter(function (x) { return x.state === 'ok'; }).length / l.length) : 100; }
  function nextItem() { var reg = M.R.register; return reg.overdue[0] || reg.due30[0] || reg.items[0]; }
  function kindCount(key) { var c = M.R.register.counts; return key === 'contract' ? c.contract : key === 'license' ? c.license : key === 'ip' ? c.ip : c.setup; }

  function mount(root, step, shell) {
    sh = shell; $root = root; h = sh.h; DATA = sh.DATA; P = window.DGG.pui; K = window.DGG.coreM7;
    LIB = { contractRules: DATA.m7.contractRules, setupRules: DATA.m7.setupRules, ipClasses: DATA.m7.ipClasses };
    P.init(sh);
    var c = sh.getCompany();
    if (!M.data) { M.company = c; M.name = c ? c.name : null; loadArche(c ? archeOf(c.industry) : archeOf(sh.displayIndustryDefault())); }
    M.step = step || 'connect';
    if (['connect', 'board', 'contracts', 'setup', 'ip', 'register'].indexOf(M.step) < 0) M.step = 'connect';
    draw();
  }
  function unmount() { M.told = null; M.replay = null; }
  function onCompany(c) { M.company = c; M.name = c ? c.name : null; M.charged = false; loadArche(c ? archeOf(c.industry) : archeOf(sh.displayIndustryDefault())); if (M.step !== 'connect') setStep('connect'); else draw(); }
  function onIndustry(slug) { if (M.step !== 'connect' || !slug) return; var a = archeOf(slug); if (a !== M.arche) { loadArche(a); draw(); } }
  function setStep(s) { M.step = s; sh.go('m7', s); }

  function draw() {
    sh.clear($root);
    var R = M.R, c = M.company, k = R.kpi;
    var meta = c ? [sh.industryNameOf(c.industry), sh.optText('size', c.size)].filter(Boolean).join(' · ') : '';
    var tabs = [{ key: 'connect', label: '接入' }, { key: 'board', label: '法务驾驶舱' }, { key: 'contracts', label: '合同审查', badge: k.highRisk || 0 }, { key: 'setup', label: '新设主体' }, { key: 'ip', label: '知识产权', badge: k.ipUrgent || 0 }, { key: 'register', label: '台账与提醒', badge: k.overdue || 0 }];
    var F = P.frame({ mark: '法务', accent: ACCENT, modules: P.navModules('m7'), crumbs: ['AI法务', tabs.filter(function (t) { return t.key === M.step; })[0].label], company: { name: M.data.company, meta: meta }, tabs: tabs, active: M.step, chat: { id: 'm7', name: 'AI法务', step: M.step, onGo: setStep },
      onTab: function (key) { if (key === 'board' && !M.charged) enterBoard(); else setStep(key); } });
    M.frame = F; $root.appendChild(F.root);
    if (M.step === 'board' && !M.charged) { M.charged = true; sh.charge(K.CREDITS); }
    ({ connect: screenConnect, board: screenBoard, contracts: screenContracts, setup: screenSetup, ip: screenIp, register: screenRegister })[M.step](F.work);
  }
  function enterBoard() { setStep('board'); }
  function col(cls, kids) { return h('div', { class: cls, style: 'display:flex;flex-direction:column;gap:12px' }, kids); }
  function levelChip(lv) { return P.chip(LV[lv], LV_NAME[lv]); }
  function sevChip(s) { return P.chip(SEV[s], SEV_NAME[s]); }
  function logList(log) { var el = h('div', { class: 'm7-log' }); log.forEach(function (l) { el.appendChild(h('div', { class: 'l' }, [h('span', { class: 'n' }, [String(l.seq)]), h('b', {}, [l.label]), h('span', {}, [l.detail])])); }); return el; }
  function ipCount(d) { return d.ip.trademarks.length + d.ip.patents.length + d.ip.software.length + (d.ip.domains || []).length; }
  function regGroup(it) { return it.kind === 'milestone' ? 'contract' : it.kind; }
  function openLicense(l) {
    P.drawer(M.frame.body, { title: l.name, sub: l.issuer + (l.no ? ' · ' + l.no : ''), body: [
      P.kv([['状态', l.stateName], ['到期', l.expiry ? l.expiry + '（' + l.daysLeft + ' 天）' : '长期有效'], ['发证机关', l.issuer]]),
      h('div', { class: 'pd-pre', style: 'margin-top:8px' }, ['到期前 60 天启动换证：准备近期检测报告与整改记录，向 ' + l.issuer + ' 提交延续申请；换证期间原证继续有效。'])
    ], actions: [P.btn('发送提醒到微信', { cls: 'primary', onClick: function () { sh.setQrReady(true); sh.showWeChat(); } })] });
  }
  function jump(it) {
    if (it.kind === 'contract' || it.kind === 'milestone') { M.contract = it.ref; setStep('contracts'); }
    else if (it.kind === 'ip') setStep('ip');
    else if (it.kind === 'setup') setStep('setup');
    else if (it.kind === 'license') { var l = M.R.licenses.filter(function (x) { return x.id === it.ref; })[0]; if (l) openLicense(l); }
  }

  /* ---------- 小图形 ---------- */
  function weekLine(weeks) {
    var S = P.svg, n = weeks.length, Wd = 340, Ht = 78, pT = 10, pB = 20, pL = 8, pR = 8;
    var vals = weeks.map(function (w) { return w.items.length; });
    var max = Math.max(1, Math.max.apply(null, vals));
    var sx = function (i) { return pL + i * (Wd - pL - pR) / Math.max(1, n - 1); };
    var sy = function (v) { return pT + (max - v) * (Ht - pT - pB) / max; };
    var s = S('svg', { class: 'm7-wl', viewBox: '0 0 ' + Wd + ' ' + Ht, preserveAspectRatio: 'xMidYMid meet' });
    s.appendChild(S('line', { x1: pL, y1: Ht - pB, x2: Wd - pR, y2: Ht - pB, stroke: '#E4E9F2' }));
    var d = vals.map(function (v, i) { return (i ? 'L' : 'M') + sx(i).toFixed(1) + ' ' + sy(v).toFixed(1); }).join(' ');
    var path = S('path', { class: 'ln', d: d, fill: 'none', stroke: 'var(--pa)', 'stroke-width': 2.4, 'stroke-linejoin': 'round' });
    s.appendChild(path);
    vals.forEach(function (v, i) { if (v) s.appendChild(S('circle', { cx: sx(i), cy: sy(v), r: 3, fill: v >= max ? 'var(--pa-ink)' : 'var(--pa)' })); });
    [0, Math.floor(n / 2), n - 1].forEach(function (i) { s.appendChild(S('text', { x: sx(i), y: Ht - 6, 'text-anchor': i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle', class: 'ax' }, [weeks[i].label])); });
    s.paths = [path];
    return s;
  }
  function ringSvg(pct) {
    var S = P.svg, r = 42;
    var s = S('svg', { class: 'm7-ring', viewBox: '0 0 108 108' });
    s.appendChild(S('circle', { cx: 54, cy: 54, r: r, fill: 'none', stroke: '#EDF0F6', 'stroke-width': 11 }));
    var c = S('circle', { cx: 54, cy: 54, r: r, fill: 'none', stroke: 'var(--pa)', 'stroke-width': 11, 'stroke-linecap': 'round', transform: 'rotate(-90 54 54)' });
    s.appendChild(c);
    s.appendChild(S('text', { x: 54, y: 61, 'text-anchor': 'middle', class: 'v' }, [pct + '%']));
    s.ring = c;
    return s;
  }
  function kindBars(counts) {
    var el = h('div', { class: 'm7-kinds' }), ks = KINDS.filter(function (x) { return counts[x[0]]; }), max = Math.max(1, Math.max.apply(null, ks.map(function (x) { return counts[x[0]]; })));
    ks.forEach(function (x) {
      var v = counts[x[0]] || 0;
      el.appendChild(h('div', { class: 'kb' }, [h('span', { class: 'l' }, [x[1]]), P.bar(Math.round(100 * v / max), v ? undefined : 'done', String(v))]));
    });
    return el;
  }

  /* ---------- 屏 1 · 接入 ---------- */
  function screenConnect(work) {
    var d = M.data, R = M.R, k = R.kpi, pf = d.profile;
    work.classList.add('m7-connect');
    var g = grid();
    var F = flowBar({ src: srcChips(), hub: 'AI法务', out: ['合同 ' + k.contracts + ' 份', '高风险 ' + k.highRisk + ' 份'], btn: '重新接入' });
    g.appendChild(F);
    var nameIn = h('input', { type: 'text', value: d.company, oninput: function (e) { M.name = e.target.value; d.company = e.target.value; var co = M.frame.root.querySelector('.pd-top .co span:nth-child(2)'); if (co) co.textContent = e.target.value; } });
    var cCo = P.card({ cls: 'c4', title: '企业', body: [h('div', { class: 'pd-form' }, [
      h('div', { class: 'pd-field' }, [h('label', {}, ['名称']), nameIn]),
      h('div', { class: 'pd-field' }, [h('label', {}, ['行业']), h('div', { style: 'font-weight:600' }, [M.company ? sh.industryNameOf(M.company.industry) + (M.company.size ? ' · ' + sh.optText('size', M.company.size) : '') : sh.industryNameOf(sh.displayIndustryDefault())])]),
      h('div', { class: 'pd-field' }, [h('label', {}, ['注册资本']), h('div', { style: 'font-weight:600' }, [W(pf.capital) + (pf.province ? ' · ' + pf.province : '') + (pf.founded ? ' · ' + pf.founded.slice(0, 4) : '')])])
    ])] });
    g.appendChild(cCo);
    var caps = h('div', { class: 'm7-caps' });
    CAPS.forEach(function (c, i) { caps.appendChild(h('div', { class: 'cap-row' }, [h('span', { class: 'ic' }, ['0' + (i + 1)]), h('div', { class: 't' }, [c]), P.chip('ok', '已开通')])); });
    var cCap = P.card({ cls: 'c4', title: '能力', sub: CAPS.length + ' 项', body: [caps] });
    g.appendChild(cCap);
    var srcs = h('div');
    d.sources.forEach(function (s) { srcs.appendChild(h('div', { class: 'src-row' }, [h('div', {}, [h('div', { class: 't' }, [s.name]), h('div', { class: 's' }, [s.lastSync + ' · ' + fmtN(s.rows) + ' 条'])]), P.chip(s.mode === 'direct' ? 'ok' : 'watch', s.mode === 'direct' ? '系统直连' : '表格导入'), h('span', { class: 'pd-dot ' + (s.mode === 'direct' ? 'ok' : 'risk') })])); });
    var cSrc = P.card({ cls: 'c4', title: '数据源', sub: d.sources.length + ' 个', body: [srcs] });
    g.appendChild(cSrc);
    var say = vd('合同 ' + k.contracts + ' 份里 ' + k.highRisk + ' 份高风险；30 天内到期 ' + k.due30 + ' 项，知产待办 ' + k.ipUrgent + ' 项。');
    g.appendChild(h('div', { class: 'c12' }, [say]));
    var nums = h('div', { class: 'nums' }, [
      h('div', { class: 'n' }, [cnt(k.contracts), h('span', {}, ['合同 · 份'])]),
      h('div', { class: 'n' }, [cnt(k.highRisk), h('span', {}, ['高风险 · 份'])]),
      h('div', { class: 'n' }, [cnt(k.due30), h('span', {}, ['30 天内 · 项'])]),
      h('div', { class: 'n' }, [cnt(ipCount(d)), h('span', {}, ['知产 · 项'])])
    ]);
    g.appendChild(h('div', { class: 'c12 go' }, [
      nums,
      h('div', { class: 'sp' }), h('div', { class: 'cr' }, [h('b', { class: 'num' }, [String(K.CREDITS)]), ' 积分 / 次']),
      P.btn('进入法务驾驶舱', { cls: 'primary big', onClick: enterBoard })
    ]));
    work.appendChild(g);
    var rows = Array.prototype.slice.call(srcs.children);
    story({ work: work, src: F.srcs, from: F.srcWrap, to: F.hub, label: fmtN(d.sources.reduce(function (t, s) { return t + s.rows; }, 0)) + ' 条',
      rise: [cCo, cCap, cSrc].concat(rows), verdict: say, focus: nums.children[1] || rows[0] });
  }

  /* ---------- 屏 2 · 法务驾驶舱 ---------- */
  function screenBoard(work) {
    var R = M.R, k = R.kpi, d = M.data, S = R.setup, reg = R.register;
    work.classList.add('m7-board');
    var g = grid();
    var F = flowBar({ src: [['合同', k.contracts + ' 份'], ['证照', k.licTotal + ' 项'], ['知产', k.ipAssets + ' 项'], ['设立', S.steps.length + ' 节点']], hub: '法务驾驶舱',
      out: ['高风险 ' + k.highRisk + ' 份', '30 天内 ' + k.due30 + ' 项'], btn: '刷新看板' });
    g.appendChild(F);
    var kpiEl = P.kpis([
      { label: '合规分', value: cnt(k.compliance), tone: k.compliance >= 80 ? 'ok' : k.compliance >= 60 ? 'risk' : 'late', sub: '合同 ' + k.avgScore + ' · 证照 ' + licOkPct() },
      { label: '合同', value: cnt(k.contracts), unit: '份', sub: '审查中 ' + k.inReview, onClick: function () { M.filter = null; setStep('contracts'); } },
      { label: '高风险合同', value: cnt(k.highRisk), unit: '份', tone: k.highRisk ? 'late' : 'ok', sub: '待处理 ' + k.findingsOpen + ' 处', onClick: function () { M.filter = 'high'; setStep('contracts'); } },
      { label: '30 天内到期', value: cnt(k.due30), unit: '项', tone: k.due30 ? 'risk' : 'ok', sub: k.overdue ? '逾期 ' + k.overdue + ' 项' : '无逾期', onClick: function () { M.regKind = null; setStep('register'); } },
      { label: '知产待办', value: cnt(k.ipUrgent), unit: '项', tone: k.ipUrgent ? 'risk' : 'ok', sub: k.ipAssets + ' 项资产', onClick: function () { setStep('ip'); } },
      { label: '商标布局覆盖', value: cnt(k.coverage), unit: '%', tone: k.coverage >= 70 ? 'ok' : 'risk', sub: '缺口 ' + k.ipGaps + ' 类', onClick: function () { setStep('ip'); } }
    ]);
    g.appendChild(h('div', { class: 'c12' }, [kpiEl]));
    var kpiCards = Array.prototype.slice.call(kpiEl.children);
    var low = [['合同', k.avgScore], ['证照', licOkPct()], ['商标布局', k.coverage]].sort(function (a, b) { return a[1] - b[1]; })[0];
    var say = vd('合规分 ' + k.compliance + '：合同 ' + k.avgScore + ' · 证照 ' + licOkPct() + ' · 商标布局 ' + k.coverage + '，' + low[0] + '这项拖低了合规分。');
    g.appendChild(h('div', { class: 'c12' }, [say]));
    var tbl = P.table({ compact: true, cols: [
      { key: 'id', label: '合同', render: function (c) { return h('span', {}, [h('b', { class: 'id' }, [c.id]), h('span', { class: 'sub' }, [cut(c.title, 12)])]); } },
      { key: 'party', label: '相对方', render: function (c) { return h('span', {}, [cut(c.party, 12), h('span', { class: 'sub' }, [c.typeName])]); } },
      { key: 'score', label: '风险分', align: 'r', sort: true, render: function (c) { return P.bar(c.score, LV[c.level], c.score + ''); } },
      { key: 'level', label: '等级', render: function (c) { return levelChip(c.level); } },
      { key: 'findings', label: '问题', render: function (c) { return h('span', {}, [h('span', { class: c.review.counts.high ? 'neg' : '' }, ['高 ' + c.review.counts.high]), ' 中 ' + c.review.counts.mid]); } }
    ], rows: R.contracts.slice(0, 5), rowKey: function (c) { return c.id; }, onRow: function (c) { M.contract = c.id; M.filter = null; setStep('contracts'); } });
    var cTop = P.card({ cls: 'c7', title: '合同风险榜', sub: '5 份', tight: true, body: [tbl], extra: [P.btn('全部 ' + k.contracts + ' 份', { cls: 'sm', onClick: function () { M.filter = null; setStep('contracts'); } })] });
    g.appendChild(cTop);
    var todo = h('div', { class: 'pd-list' });
    reg.overdue.concat(reg.due30).slice(0, 4).forEach(function (it) { todo.appendChild(P.item({ tone: it.tone === 'accent' ? 'accent' : it.tone, icon: P.KIND_ICON[it.kind], title: cut(it.title, 18), sub: it.kindName, right: it.label, rightSub: it.daysLeft < 0 ? '逾期 ' + (-it.daysLeft) + ' 天' : it.daysLeft === 0 ? '今天' : it.daysLeft + ' 天', onClick: function () { jump(it); } })); });
    if (!reg.overdue.length && !reg.due30.length) todo.appendChild(P.empty('30 天内无到期事项'));
    var cTodo = P.card({ cls: 'c5', title: '近 30 天待办', sub: '逾期 ' + reg.counts.overdue + ' · 30 天内 ' + reg.counts.due30, body: [todo], extra: [P.btn('台账', { cls: 'sm', onClick: function () { M.regKind = null; setStep('register'); } })] });
    g.appendChild(cTodo);
    var wl = weekLine(reg.weeks);
    var cW = P.card({ cls: 'c4', title: '90 天到期节奏', sub: reg.counts.total + ' 项', body: [wl, kindBars(reg.counts)] });
    g.appendChild(cW);
    var lic = h('div', { class: 'pd-list' });
    R.licenses.slice().sort(function (a, b) { return (a.daysLeft == null ? 9999 : a.daysLeft) - (b.daysLeft == null ? 9999 : b.daysLeft); }).slice(0, 3).forEach(function (l) { lic.appendChild(P.item({ tone: l.state === 'ok' ? 'ok' : l.state === 'due' ? 'risk' : 'late', icon: '证', title: cut(l.name, 14), sub: l.issuer, right: l.expiry ? dsh(l.expiry) : '长期', rightSub: l.state === 'ok' ? (l.expiry ? l.daysLeft + ' 天' : '') : l.stateName, onClick: function () { openLicense(l); } })); });
    var cLic = P.card({ cls: 'c4', title: '证照', sub: k.licTotal + ' 项 · 待办 ' + k.licDue, body: [lic] });
    g.appendChild(cLic);
    var cSet = P.card({ cls: 'c4', title: '新设主体', sub: S.typeName.replace(/（.*/, ''), accent: true, body: [
      P.kv([['名称', S.name], ['工期', S.totalDays + ' 天 · ' + short(S.startDate) + ' → ' + short(S.endDate)], ['股权', S.equity ? S.equity.holders.map(function (x) { return x.pct + '%'; }).join(' / ') + ' · ' + S.equity.control : '总公司全资']]),
      h('div', { style: 'margin-top:10px' }, [S.confirmed ? P.chip('ok', '已确认') : P.chip('watch', '待确认')])
    ], foot: [P.btn('看方案', { cls: 'sm', onClick: function () { setStep('setup'); } }), S.confirmed ? null : P.btn('确认方案', { cls: 'primary sm', onClick: function () { commit(K.confirmSetup(d, LIB), '方案已确认，' + S.steps.length + ' 个节点已进台账'); } })] });
    g.appendChild(cSet);
    if (d.log.length) g.appendChild(P.card({ cls: 'c12', title: '本期动作', sub: d.log.length + ' 条', body: [logList(d.log.slice(-4).reverse())] }));
    work.appendChild(g);
    var rows = trs(tbl);
    /* 结论落在哪一项，脉冲就打在哪一项的支撑数据上 */
    var lowEl = low[0] === '商标布局' ? kpiCards[5] : low[0] === '证照' ? (nodes(cLic, '.pd-item')[0] || kpiCards[0]) : rows[0];
    story({ work: work, src: F.srcs, from: F.srcWrap, to: F.hub, label: reg.counts.total + ' 项',
      rise: [cTop, cTodo, cW, cLic, cSet], rows: rows, paths: wl.paths, bars: nodes(cW, '.m7-kinds .pd-bar i'),
      verdict: say, focus: lowEl || rows[0] });
  }

  /* ---------- 屏 3 · 合同审查 ---------- */
  function screenContracts(work) {
    var R = M.R, d = M.data, rows = R.contracts, f = M.filter, CR = LIB.contractRules;
    work.classList.add('m7-contracts');
    var shown = rows.filter(function (c) { return f === 'high' ? c.level === 'high' : f === 'mid' ? c.level === 'mid' : f === 'revised' ? c.revisions.length > 0 : true; });
    if (!M.contract || !R.byId[M.contract]) M.contract = (shown[0] || rows[0]).id;
    var C = R.byId[M.contract], raw = d.contracts.filter(function (x) { return x.id === C.id; })[0];
    var g = grid();
    var oa = d.sources.filter(function (s) { return s.id === 'oa'; })[0] || d.sources[0];
    var F = flowBar({ src: [[srcShort(oa.name), fmtN(oa.rows) + ' 条'], ['合同台账', rows.length + ' 份'], ['审查规则', CR.risks.length + ' 条']], hub: '合同审查',
      out: ['高风险 ' + R.kpi.highRisk + ' 份', '待处理 ' + R.kpi.findingsOpen + ' 处'], btn: '重新审查' });
    g.appendChild(F);
    var filt = function (key) { return function () { M.filter = M.filter === key ? null : key; draw(); }; };
    var cnt2 = function (lv) { return rows.filter(function (c) { return c.level === lv; }).length; };
    g.appendChild(h('div', { class: 'c12' }, [P.kpis([
      { label: '合同', value: cnt(rows.length), unit: '份', onClick: filt(null), active: !f },
      { label: '高风险', value: cnt(cnt2('high')), unit: '份', tone: 'late', onClick: filt('high'), active: f === 'high' },
      { label: '中风险', value: cnt(cnt2('mid')), unit: '份', tone: 'risk', onClick: filt('mid'), active: f === 'mid' },
      { label: '待处理问题', value: cnt(R.kpi.findingsOpen), unit: '处', tone: 'accent', sub: '平均 ' + R.kpi.avgScore + ' 分' },
      { label: '已修订', value: cnt(rows.filter(function (c) { return c.revisions.length; }).length), unit: '份', tone: 'accent', sub: '采纳 ' + R.kpi.revised + ' 处', onClick: filt('revised'), active: f === 'revised' }
    ])]));
    var miss = missingOf(C);
    var say = vd(C.id + ' 风险分 ' + C.score + '：' + (miss.length ? '缺「' + miss.slice(0, 2).map(function (x) { return x.clauseTitle; }).join('」「') + '」' + (miss.length > 2 ? '等 ' : '') + miss.length + ' 项必备条款' : C.findings.length ? C.findings[0].clauseTitle + ' 等 ' + C.findings.length + ' 处待改' : '无待改条款') + '，' + dsh(C.end) + ' 到期。');
    g.appendChild(h('div', { class: 'c12' }, [say]));
    var tbl = P.table({ compact: true, cols: [
      { key: 'id', label: '合同', render: function (c) { return h('span', {}, [h('b', { class: 'id' }, [c.id]), h('span', { class: 'sub' }, [cut(c.title, 12)])]); } },
      { key: 'party', label: '相对方', sort: true, render: function (c) { return h('span', {}, [cut(c.party, 12), h('span', { class: 'sub' }, [c.typeName])]); } },
      { key: 'amount', label: '金额', align: 'r', sort: true, render: function (c) { return c.amount ? W(c.amount) : '—'; } },
      { key: 'score', label: '风险分', align: 'r', sort: true, render: function (c) { return P.bar(c.score, LV[c.level], c.score + ''); } },
      { key: 'level', label: '等级', render: function (c) { return levelChip(c.level); } },
      { key: 'endDays', label: '到期', align: 'r', sort: true, render: function (c) { return h('span', {}, [dsh(c.end), h('span', { class: 'sub' }, [c.endDays + ' 天'])]); } }
    ], rows: shown, sortKey: 'score', sortDir: 'asc', rowKey: function (c) { return c.id; }, activeKey: M.contract, onRow: function (c) { M.contract = c.id; draw(); } });
    var hiAll = rows.reduce(function (t, c) { return t + c.review.counts.high; }, 0);
    var cList = P.card({ cls: 'c7', title: '合同台账', sub: shown.length + ' 份' + (f ? ' · 已筛选' : ''), tight: true,
      body: [h('div', { class: 'pd-scroll m7-tbl' }, [tbl])],
      extra: [hiAll ? P.btn('采纳高风险修订 ' + hiAll + ' 处', { cls: 'primary sm', onClick: function () { doAllHigh(); } }) : null] });
    g.appendChild(cList);
    var fl = h('div', { class: 'm7-findings' });
    C.findings.forEach(function (x) {
      fl.appendChild(h('div', { class: 'f ' + x.severity }, [
        h('div', { class: 'h' }, [sevChip(x.severity), h('span', {}, [(x.clauseNo ? '第 ' + x.clauseNo + ' 条 ' : '缺 ') + x.clauseTitle]), h('span', { class: 'sp' }),
          x.fix ? P.btn('采纳', { cls: 'primary sm', onClick: function () { commit(K.applyFix(d, C.id, x.id, LIB), C.id + ' 已' + (x.fix.mode === 'insert' ? '新增' : '修订') + '「' + x.fix.title + '」，风险分已重算'); } }) : null]),
        h('div', { class: 'issue' }, [cut(soft(x.issue), 34)])
      ]));
    });
    var revEl = null;
    if (C.revisions.length) { revEl = h('div', { class: 'm7-rev' }); C.revisions.forEach(function (r) { revEl.appendChild(h('div', { class: 'r' }, [P.chip('handled', r.mode === 'insert' ? '新增' : '修订'), h('b', {}, ['第 ' + r.clauseNo + ' 条 ' + r.title])])); }); }
    var openOpinion = function () { var op = K.opinion(raw, C.review, LIB); P.drawer(M.frame.body, { title: '审查意见 · ' + C.id, sub: C.title + ' · ' + C.party, body: [h('div', { class: 'pd-pre' }, [soft(op.text)])], actions: [P.btn('发送到微信', { cls: 'primary', onClick: function () { sh.setQrReady(true); sh.showWeChat(); } })] }); };
    var openClauses = function () {
      var list = h('div', { class: 'm7-clauses' });
      C.clauses.forEach(function (k) { list.appendChild(h('div', { class: 'k' + (k.revised ? ' rev' : '') }, [h('div', { class: 'h' }, [h('span', { class: 'no' }, [k.no]), h('span', {}, [k.title]), h('span', { class: 'sp' }), k.inserted ? P.chip('handled', '新增') : k.revised ? P.chip('handled', '已修订') : null]), k.before ? h('div', { class: 'tx before' }, [k.before]) : null, h('div', { class: 'tx' + (k.revised ? ' after' : '') }, [k.text])])); });
      P.drawer(M.frame.body, { title: C.id + ' 条款全文', sub: C.title + ' · ' + C.clauses.length + ' 条' + (C.revisions.length ? ' · 已修订 ' + C.revisions.length + ' 处' : ''), body: [list], actions: [P.btn('审查意见', { onClick: openOpinion }), P.btn('发送到微信', { cls: 'primary', onClick: function () { sh.setQrReady(true); sh.showWeChat(); } })] });
    };
    var cFocus = P.card({ title: C.id + ' ' + cut(C.title, 14), sub: C.party + ' · ' + C.typeName + ' · ' + C.roleName, accent: true, body: [
      h('div', { class: 'm7-chead' }, [levelChip(C.level),
        h('span', { class: 'm' }, [h('b', { class: 'num score ' + LV[C.level] }, [cnt(C.score)]), h('span', {}, ['风险分'])]),
        h('span', { class: 'm' }, [h('b', { class: 'num' }, [cnt(C.findings.length)]), h('span', {}, ['待处理'])]),
        h('span', { class: 'm' }, [h('b', { class: 'num' }, [C.amount ? W(C.amount) : '—']), h('span', {}, ['金额'])]),
        h('span', { class: 'm' }, [h('b', { class: 'num' }, [dsh(C.start) + ' 至 ' + dsh(C.end)]), h('span', {}, ['期限'])])]),
      C.findings.length ? fl : P.judge({ verdict: { tone: 'ok', chip: '可签署', text: '未发现需要修订的条款' } }),
      revEl ? h('div', { class: 'm7-sub' }, ['已采纳修订 ' + C.revisions.length + ' 处']) : null, revEl
    ], foot: [P.btn('审查意见', { cls: 'primary sm', onClick: openOpinion }), P.btn('条款全文 ' + C.clauses.length + ' 条', { cls: 'sm', onClick: openClauses })] });
    g.appendChild(col('c5', [cFocus]));
    work.appendChild(g);
    var rws = trs(tbl), hit = rws.filter(function (r) { return r.textContent.indexOf(C.id) >= 0; })[0];
    story({ work: work, src: F.srcs, from: F.srcWrap, to: F.hub, label: rows.length + ' 份', scan: cFocus,
      rise: [cList, cFocus].concat(nodes(fl, '.f')), rows: rws, bars: nodes(tbl, '.pd-bar i'),
      verdict: say, focus: hit || rws[0] });
  }
  function doAllHigh() {
    var cur = M.data, n = 0;
    M.R.contracts.forEach(function (c) { c.findings.filter(function (x) { return x.severity === 'high' && x.fix; }).forEach(function (x) { cur = K.applyFix(cur, c.id, x.id, LIB); n++; }); });
    M.filter = null;
    commit(cur, '已采纳 ' + n + ' 处高风险修订，风险分已重算');
  }

  /* ---------- 屏 4 · 新设主体 ---------- */
  function screenSetup(work) {
    var R = M.R, d = M.data, S = R.setup, E = LIB.setupRules, s = d.setup;
    work.classList.add('m7-setup');
    var patch = function (p, msg) { commit(K.updateSetup(d, p), msg || '方案已更新，待确认'); };
    var g = grid();
    var licDays = (S.licenses || []).map(function (n) { return (E.licenses[n] || {}).days || 0; });
    var licMax = licDays.length ? Math.max.apply(null, licDays) : 0;
    var F = flowBar({ src: [['主体类型', S.typeName.replace(/（.*/, '')], ['注册资本', S.capital ? W(S.capital) : '不设'], ['股权', S.equity ? S.equity.holders.map(function (x) { return x.pct; }).join(' / ') : '全资'], ['许可', (S.licenses || []).length + ' 项']],
      hub: '设立方案', out: [S.totalDays + ' 天', short(S.startDate) + ' → ' + short(S.endDate)], btn: '重排流程' });
    g.appendChild(F);
    g.appendChild(h('div', { class: 'c12' }, [P.kpis([
      { label: '办理总天数', value: cnt(S.totalDays), unit: '天', tone: 'accent', sub: short(S.startDate) + ' 启动' },
      { label: '节点', value: cnt(S.steps.length), unit: '个', sub: S.licenses.length ? S.licenses.length + ' 项许可并行' : '登记流程' },
      { label: '材料', value: cnt(S.materials.length), unit: '项' },
      { label: '预计费用', value: cnt(S.fees.total), unit: '元', sub: '刻章 ' + fmtN(S.fees.seal) + ' · 代办 ' + fmtN(S.fees.agency) },
      { label: '控制', value: S.equity ? S.equity.control : '总公司全资', tone: S.equity ? (S.equity.deadlock ? 'late' : S.equity.control === '绝对控制' ? 'ok' : S.equity.control === '无控制方' ? 'late' : 'risk') : 'ok', sub: S.equity ? '控股股东 ' + Math.round(S.equity.top * 100) + '%' : '' },
      { label: '方案状态', value: S.confirmed ? '已确认' : '待确认', tone: S.confirmed ? 'ok' : 'risk', sub: S.confirmed ? '节点已进台账' : '' }
    ])]));
    var sayTxt = S.equity
      ? S.equity.holders[0].pct + ' / ' + S.equity.holders.slice(1).map(function (x) { return x.pct; }).join(' / ') + ' 为' + S.equity.control + (licMax ? '；' + S.licenses[0] + ' ' + licMax + ' 天压在关键路径上' : '') + '，全程 ' + S.totalDays + ' 天。'
      : S.typeName.replace(/（.*/, '') + '不设注册资本，' + S.steps.length + ' 个节点 ' + S.totalDays + ' 天，' + short(S.endDate) + ' 完成。';
    var say = vd(sayTxt);
    g.appendChild(h('div', { class: 'c12' }, [say]));
    var typeChips = h('div', { class: 'chips' }, TYPES.map(function (t) { return h('button', { class: s.type === t[0] ? 'on' : '', onclick: function () { if (s.type !== t[0]) patch({ type: t[0] }, '主体类型改为' + t[1] + '，流程已重排'); } }, [t[1]]); }));
    var startFld = h('div', { class: 'pd-field' + (s.type !== 'branch' ? ' half' : '') }, [h('label', {}, ['启动日期']), h('input', { type: 'text', value: s.startDate || d.today, onchange: function (e) { if (/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)) patch({ startDate: e.target.value }); else draw(); } })]);
    var form = [h('div', { class: 'pd-field' }, [h('label', {}, ['主体类型']), typeChips]),
      h('div', { class: 'pd-field half' }, [h('label', {}, ['名称']), h('input', { type: 'text', value: s.name, onchange: function (e) { patch({ name: e.target.value }); } })]),
      h('div', { class: 'pd-field half' }, [h('label', {}, ['地区']), h('input', { type: 'text', value: s.region || '', onchange: function (e) { patch({ region: e.target.value }); } })])];
    if (s.type !== 'branch') {
      form.push(h('div', { class: 'pd-field half' }, [h('label', {}, ['注册资本（元）']), h('input', { type: 'number', value: s.capital || 0, onchange: function (e) { patch({ capital: +e.target.value || 0 }); } })]));
      form.push(startFld);
      var shares = s.shares && s.shares.length ? s.shares : [{ holder: d.company, pct: 100 }];
      var sh2 = h('div');
      shares.forEach(function (x, i) { sh2.appendChild(h('div', { class: 'share' }, [h('input', { type: 'text', value: x.holder, onchange: function (e) { var n = clone(shares); n[i].holder = e.target.value; patch({ shares: n }); } }), h('input', { type: 'number', value: x.pct, min: 0, max: 100, onchange: function (e) { var n = clone(shares); n[i].pct = +e.target.value || 0; patch({ shares: n }); } })])); });
      var pre = h('div', { class: 'presets' }, PRESETS.map(function (p) { var on = shares.length >= 2 && shares[0].pct === p[0] && shares[1].pct === p[1]; return h('button', { class: on ? 'on' : '', onclick: function () { setShares(p); } }, [p[0] + ' / ' + p[1]]); }));
      form.push(h('div', { class: 'pd-field' }, [h('label', {}, ['股权结构（%）']), sh2, pre, S.equity && !S.equity.totalOk ? h('div', { class: 'hint', style: 'color:var(--t-late)' }, ['合计 ' + S.equity.total + '%，应为 100%']) : null]));
    }
    var licChips = h('div', { class: 'chips' }, Object.keys(E.licenses).map(function (n) { var on = (s.licenses || []).indexOf(n) >= 0; return h('button', { class: on ? 'on' : '', onclick: function () { var l = (s.licenses || []).slice(); if (on) l.splice(l.indexOf(n), 1); else l.push(n); patch({ licenses: l }, on ? '已移除' + n : '已加入' + n + '，约 ' + E.licenses[n].days + ' 天并行办理'); } }, [n]); }));
    form.push(h('div', { class: 'pd-field' }, [h('label', {}, ['许可']), licChips]));
    if (s.type === 'branch') form.push(startFld);
    var cIn = P.card({ cls: 'c5', title: '方案输入', body: [h('div', { class: 'pd-form' }, form)], foot: [S.confirmed ? P.chip('ok', '已确认') : P.btn('确认方案', { cls: 'primary', onClick: function () { commit(K.confirmSetup(d, LIB), '方案已确认，' + S.steps.length + ' 个节点已进台账'); } }), P.btn('看台账', { cls: 'sm', onClick: function () { M.regKind = 'setup'; setStep('register'); } })] });
    g.appendChild(cIn);
    var cEq, holderBars = [];
    if (S.equity) {
      var eq = S.equity, holders = h('div', { class: 'm7-holders' });
      eq.holders.forEach(function (x, i) { holders.appendChild(h('div', { class: 'hr' }, [h('span', { class: 'n' }, [cut(x.holder, 16), h('span', { class: 'sub' }, [i === 0 ? '控股股东' : x.platform ? '员工持股平台' : '其他股东'])]), P.bar(x.pct, i === 0 ? (eq.deadlock ? 'late' : 'ok') : x.pct >= E.equity.veto * 100 ? 'risk' : undefined, x.pct + '%')])); });
      var lines = h('div', { class: 'm7-lines' });
      eq.lines.forEach(function (l) { lines.appendChild(h('div', { class: 'ln' + (l.met ? ' met' : '') }, [P.chip(l.met ? (l.key === 'veto' ? 'risk' : 'ok') : 'done', l.met ? '达到' : '未达'), h('span', { class: 'l' }, [l.label + ' · ' + l.pct + '%'])])); });
      cEq = P.card({ title: '股权控制线', sub: eq.control + (eq.deadlock ? ' · 两方各半' : ''), body: [
        eq.deadlock ? P.judge({ verdict: { tone: 'late', chip: '僵局', text: soft(E.equity.notes.deadlock) } }) : null,
        h('div', { style: eq.deadlock ? 'margin-top:12px' : '' }, [holders]), lines
      ], extra: [P.btn('章程要点 ' + eq.charter.length + ' 条', { cls: 'sm', onClick: function () { P.drawer(M.frame.body, { title: '章程要点', sub: eq.control + ' · ' + eq.holders.map(function (x) { return x.pct + '%'; }).join(' / '), body: [h('ul', { class: 'm7-ul' }, eq.charter.map(function (t) { return h('li', {}, [soft(t)]); }))] }); } })] });
      holderBars = nodes(holders, '.pd-bar i');
    } else {
      cEq = P.card({ title: '主体说明', sub: S.typeName, body: [P.judge({ verdict: { tone: 'ok', chip: '总公司全资', text: soft(S.typeDesc) }, reasons: S.risks.map(function (r) { return soft(r.text); }) })] });
    }
    var offset = K.days(d.weekStart, S.startDate), nWeeks = Math.ceil((offset + S.totalDays) / 7) + 1;
    var weeks = []; for (var w = 0; w < nWeeks; w++) weeks.push({ label: short(K.dateOf(d.weekStart, w * 7)) });
    var rowsG = S.steps.map(function (st, i) { return { label: st.order + '. ' + st.title, sub: st.days + ' 天 · ' + st.materials.length + ' 项材料', bars: [{ s: (offset + st.startDay) / 7, e: (offset + st.endDay) / 7, tone: st.kind === 'license' ? 'waitmat' : i % 2 ? 'plan' : 'prog', label: st.days + ' 天', title: st.title + ' ' + st.start + ' → ' + st.end }] }; });
    var gn = P.gantt({ days: weeks, rows: rowsG, labelW: 210, dayW: 72, rowH: 32, todayIdx: K.days(d.weekStart, d.today) / 7, marks: [{ d: (offset + S.totalDays) / 7 - 1, label: '完成 ' + short(S.endDate), color: '#22A06B' }] });
    var mats = P.table({ compact: true, cols: [{ key: 'step', label: '节点' }, { key: 'item', label: '材料', cls: 'w320' }], rows: S.materials });
    var risks = h('div', { class: 'm7-risks' }); S.risks.forEach(function (r) { risks.appendChild(h('div', { class: 'r' }, [sevChip(r.severity), h('span', {}, [soft(r.text)])])); });
    if (!S.risks.length) risks.appendChild(P.empty('无风险提示'));
    var cGn = P.card({ title: '办理时间线', sub: '按周', body: [gn], extra: [
      P.btn('材料清单 ' + S.materials.length + ' 项', { cls: 'sm', onClick: function () { P.drawer(M.frame.body, { title: '材料清单', sub: S.materials.length + ' 项 · 按节点', body: [h('div', { class: 'pd-scroll', style: 'max-height:460px' }, [mats])] }); } }),
      S.risks.length ? P.btn('风险提示 ' + S.risks.length + ' 条', { cls: 'sm', onClick: function () { P.drawer(M.frame.body, { title: '风险提示', sub: S.typeName + ' · ' + S.region, body: [risks] }); } }) : null
    ] });
    g.appendChild(col('c7', [cEq, cGn]));
    work.appendChild(g);
    var lineEls = nodes(cEq, '.m7-lines .ln');
    story({ work: work, src: F.srcs, from: F.srcWrap, to: F.hub, label: S.steps.length + ' 节点', scan: cGn,
      rise: [cIn, cEq, cGn].concat(lineEls), bars: holderBars, gantt: gn,
      verdict: say, focus: lineEls.filter(function (x) { return x.className.indexOf('met') >= 0; })[0] || lineEls[0] });
  }
  function setShares(p) {
    var s = M.data.setup, shares = s.shares && s.shares.length ? s.shares : [{ holder: M.data.company, pct: 100 }];
    var n = clone(shares);
    if (n.length < 2) n.push({ holder: '合作方', pct: 0 });
    n[0].pct = p[0]; n[1].pct = p[1];
    for (var j = 2; j < n.length; j++) n[j].pct = 0;
    commit(K.updateSetup(M.data, { shares: n }), '股权改为 ' + p[0] + ' / ' + p[1] + '，控制线已重算');
  }

  /* ---------- 屏 5 · 知识产权 ---------- */
  function screenIp(work) {
    var R = M.R, d = M.data, I = R.ip, IC = LIB.ipClasses, map = IC.byIndustry[d.profile.industry] || IC.byIndustry.default;
    work.classList.add('m7-ip');
    var g = grid();
    var F = flowBar({ src: [['商标', I.counts.trademarks + ' 件'], ['专利', I.counts.patents + ' 件'], ['软著', I.counts.software + ' 件'], ['域名', (d.ip.domains || []).length + ' 个']],
      hub: '知产核期', out: ['待办 ' + I.counts.urgent + ' 项', '覆盖 ' + I.coverage + '%'], btn: '重新核期' });
    g.appendChild(F);
    g.appendChild(h('div', { class: 'c12' }, [P.kpis([
      { label: '知产资产', value: cnt(I.counts.total), unit: '项', sub: '商标 ' + I.counts.trademarks + ' · 专利 ' + I.counts.patents },
      { label: '待续展 / 缴费', value: cnt(I.counts.urgent), unit: '项', tone: I.counts.urgent ? 'risk' : 'ok', sub: '60 天内' },
      { label: '商标布局覆盖', value: cnt(I.coverage), unit: '%', tone: I.coverage >= 70 ? 'ok' : 'risk', sub: I.covered.length + ' / ' + (map.core.length + map.extend.length) + ' 类' },
      { label: '布局缺口', value: cnt(I.counts.gaps), unit: '类', tone: I.counts.coreGaps ? 'late' : I.counts.gaps ? 'risk' : 'ok', sub: '核心类 ' + I.counts.coreGaps },
      { label: '待办预计', value: cw(urgentIp().reduce(function (t, x) { return t + x.fee; }, 0)), tone: 'accent', sub: '清单内 ' + fmtN(I.renewFee + I.applyFee) + ' 元' },
      { label: '近似与线索', value: cnt(I.similar.length + I.leads.length), unit: '条', tone: I.similar.length || I.leads.length ? 'risk' : 'ok', sub: '近似 ' + I.similar.length + ' · 线索 ' + I.leads.length }
    ])]));
    var u0 = urgentIp()[0], gp = coreGap();
    var say = vd((u0 ? ipT(u0) + ' ' + u0.dueLabel + ' ' + u0.daysLeft + ' 天后到期，预计 ' + fmtN(u0.fee) + ' 元' : '60 天内无续展与缴费') + (gp ? '；第 ' + gp.cls + ' 类' + gp.name + '是' + (gp.tier === 'core' ? '核心' : '延伸') + '缺口。' : '。'));
    g.appendChild(h('div', { class: 'c12' }, [say]));
    var tbl = P.table({ compact: true, cols: [
      { key: 'kindName', label: '类型', render: function (a) { return P.chip(IPK[a.kind], a.kindName, true); } },
      { key: 'title', label: '名称', sort: true, render: function (a) { return h('span', {}, [cut(a.title, 16), h('span', { class: 'sub' }, [a.kind === 'trademark' ? a.regNo : a.kind === 'patent' ? '申请 ' + a.appDate : a.kind === 'software' ? '登记 ' + a.regDate : '域名'])]); } },
      { key: 'due', label: '到期', render: function (a) { return a.due ? h('span', {}, [dsh(a.due), h('span', { class: 'sub' }, [a.dueLabel])]) : h('span', { class: 'sub' }, [a.dueLabel]); } },
      { key: 'daysLeft', label: '剩余', align: 'r', sort: function (a) { return a.daysLeft == null ? 99999 : a.daysLeft; }, render: function (a) { return a.daysLeft == null ? '—' : h('span', { class: a.daysLeft <= 60 ? 'neg' : '' }, [a.daysLeft + ' 天']); } },
      { key: 'status', label: '状态', render: function (a) { return P.chip(a.status === '有效' ? 'ok' : a.status === '可续展' ? 'risk' : 'late', a.status); } },
      { key: 'listed', label: '清单', render: function (a) { return a.listed ? P.chip('handled', '已列入') : a.action ? P.btn(a.action + ' ' + fmtN(a.fee), { cls: 'sm', onClick: function (e) { e.stopPropagation(); commit(K.toggleRenew(d, a.id), a.title + ' 已加入清单'); } }) : ''; } }
    ], rows: I.assets, sortKey: 'daysLeft', sortDir: 'asc', rowKey: function (a) { return a.id; }, empty: '暂无知产资产' });
    var cTbl = P.card({ title: '资产到期表', sub: I.counts.total + ' 项', tight: true, body: [h('div', { class: 'pd-scroll m7-tbl' }, [tbl])] });
    var have = {}; d.ip.trademarks.forEach(function (t) { t.classes.forEach(function (c) { have[c] = (have[c] || []).concat([t.name]); }); });
    var cls = h('div', { class: 'm7-classes' });
    map.core.concat(map.extend).forEach(function (c) {
      var tier = map.core.indexOf(c) >= 0 ? 'core' : 'extend', gap = I.gaps.filter(function (x) { return x.cls === c; })[0];
      cls.appendChild(h('div', { class: 'cl ' + (have[c] ? 'have' : 'gap-' + tier) }, [
        h('span', { class: 'no' }, [c]), h('span', { class: 'nm' }, [(IC.classNames[c] || c), h('span', { class: 'sub' }, [tier === 'core' ? '核心' : '延伸'])]),
        have[c] ? P.chip('ok', have[c].length > 1 ? cut(have[c][0], 6) + ' +' + (have[c].length - 1) : cut(have[c][0], 7)) : gap && gap.listed ? P.chip('handled', '已列入') : P.btn('申请', { cls: 'sm', onClick: function () { commit(K.toggleApply(d, c), '第 ' + c + ' 类已加入申请清单，预计 ' + fmtN(gap.fee) + ' 元'); } })
      ]));
    });
    var rg = ringSvg(I.coverage);
    var cLay = P.card({ title: '商标布局', sub: I.covered.length + ' / ' + (map.core.length + map.extend.length) + ' 类', body: [h('div', { class: 'm7-cover' }, [rg, h('div', { class: 'm7-classes-wrap' }, [cls])])] });
    var sim = h('div', { class: 'pd-list' });
    I.similar.slice(0, 2).forEach(function (s) { sim.appendChild(P.item({ tone: s.deadline ? (s.daysLeft <= 30 ? 'late' : 'risk') : 'accent', icon: '近', title: '「' + s.name + '」第 ' + s.classes.join('、') + ' 类', sub: s.holder + ' · 相似 ' + Math.round(s.similarity * 100) + '% · ' + s.status, right: s.action, rightSub: s.deadline ? dsh(s.deadline) + ' 前 · ' + s.daysLeft + ' 天' : '' })); });
    I.leads.slice(0, 1).forEach(function (l) { sim.appendChild(P.item({ tone: 'risk', icon: '侵', title: l.where + ' · ' + cut(l.product, 12), sub: '相似 ' + Math.round(l.similarity * 100) + '% · 发现 ' + short(l.found), right: l.action })); });
    if (!I.similar.length && !I.leads.length) sim.appendChild(P.empty('无近似商标与侵权线索'));
    var cSim = P.card({ title: '近似与侵权线索', sub: I.similar.length + ' 件 · ' + I.leads.length + ' 条', body: [sim] });
    var renewItems = I.assets.filter(function (a) { return a.listed; }), applyItems = I.gaps.filter(function (x) { return x.listed; });
    var l1 = h('div', { class: 'pd-list' }); renewItems.forEach(function (a) { l1.appendChild(P.item({ tone: 'hand', icon: P.KIND_ICON.ip, title: cut(a.title, 16), sub: a.action + ' · ' + dsh(a.due), right: fmtN(a.fee) + ' 元', onClick: function () { commit(K.toggleRenew(d, a.id), a.title + ' 已移出清单'); } })); }); if (!renewItems.length) l1.appendChild(P.empty('从到期表加入'));
    var l2 = h('div', { class: 'pd-list' }); applyItems.forEach(function (x) { l2.appendChild(P.item({ tone: 'hand', icon: x.cls, title: '第 ' + x.cls + ' 类 ' + x.name, sub: x.tier === 'core' ? '核心类' : '延伸类', right: fmtN(x.fee) + ' 元', onClick: function () { commit(K.toggleApply(d, x.cls), '第 ' + x.cls + ' 类已移出清单'); } })); }); if (!applyItems.length) l2.appendChild(P.empty('从商标布局加入'));
    var cLst = P.card({ title: '续展 / 申请清单', sub: '预计 ' + fmtN(I.renewFee + I.applyFee) + ' 元', body: [h('div', { class: 'm7-lists' }, [h('div', {}, [h('div', { class: 'h' }, ['续展 / 缴费 ' + renewItems.length + ' 项', h('span', {}, [fmtN(I.renewFee) + ' 元'])]), l1]), h('div', {}, [h('div', { class: 'h' }, ['商标申请 ' + applyItems.length + ' 类', h('span', {}, [fmtN(I.applyFee) + ' 元'])]), l2])])],
      foot: [P.btn('委托单发送到微信', { cls: 'primary sm', disabled: !renewItems.length && !applyItems.length, onClick: function () { sh.setQrReady(true); sh.showWeChat(); } })] });
    g.appendChild(col('c7', [cTbl, cSim]));
    g.appendChild(col('c5', [cLay, cLst]));
    work.appendChild(g);
    var rws = trs(tbl), hit = u0 ? rws.filter(function (r) { return r.textContent.indexOf(ipT(u0)) >= 0; })[0] : null;
    story({ work: work, src: F.srcs, from: F.srcWrap, to: F.hub, label: I.counts.total + ' 项',
      rise: [cTbl, cLay, cSim, cLst].concat(nodes(cls, '.cl')), rows: rws, ring: { el: rg.ring, pct: I.coverage },
      verdict: say, focus: hit || rws[0] });
  }

  /* ---------- 屏 6 · 台账与提醒 ---------- */
  function screenRegister(work) {
    var R = M.R, d = M.data, reg = R.register, kf = M.regKind;
    work.classList.add('m7-register');
    var pass = function (it) { return !kf || regGroup(it) === kf; };
    var items = reg.items.filter(pass);
    var weeks = reg.weeks.map(function (w) { return { w: w.w, start: w.start, end: w.end, label: w.label, items: w.items.filter(pass).map(function (it) { return Object.assign({}, it, { tone: it.listed ? 'handled' : it.tone, title: calT(it.title) }); }) }; });
    var g = grid();
    var filt = function (key) { return function () { M.regKind = M.regKind === key ? null : key; draw(); }; };
    var F = flowBar({ src: KINDS.map(function (x) { return [x[1], kindCount(x[0]) + ' 项']; }), hub: '90 天台账',
      out: ['逾期 ' + reg.counts.overdue + ' 项', '30 天内 ' + reg.counts.due30 + ' 项'], btn: '刷新台账' });
    g.appendChild(F);
    var kpiList = [
      { label: '90 天台账', value: cnt(reg.counts.total), unit: '项', onClick: filt(null), active: !kf },
      { label: '逾期', value: cnt(reg.counts.overdue), unit: '项', tone: reg.counts.overdue ? 'late' : 'ok' },
      { label: '30 天内', value: cnt(reg.counts.due30), unit: '项', tone: reg.counts.due30 ? 'risk' : 'ok' },
      { label: '合同与节点', value: cnt(reg.counts.contract), unit: '项', onClick: filt('contract'), active: kf === 'contract' },
      { label: '证照到期', value: cnt(reg.counts.license), unit: '项', onClick: filt('license'), active: kf === 'license' },
      { label: '知产到期', value: cnt(reg.counts.ip), unit: '项', onClick: filt('ip'), active: kf === 'ip' }
    ];
    if (reg.counts.setup) kpiList.push({ label: '设立节点', value: cnt(reg.counts.setup), unit: '项', tone: 'accent', onClick: filt('setup'), active: kf === 'setup' });
    g.appendChild(h('div', { class: 'c12' }, [P.kpis(kpiList)]));
    var nx = nextItem();
    var say = vd(reg.counts.overdue
      ? reg.overdue[0].title + ' 逾期 ' + (-reg.overdue[0].daysLeft) + ' 天；30 天内还有 ' + reg.counts.due30 + ' 项。'
      : nx ? '下一项 ' + short(nx.date) + ' ' + nx.title + '；30 天内共 ' + reg.counts.due30 + ' 项。' : '90 天内无到期事项。');
    g.appendChild(h('div', { class: 'c12' }, [say]));
    var legend = h('div', { class: 'legend' }, [['contract', '合同到期'], ['milestone', '履约节点'], ['license', '证照'], ['ip', '知产'], ['setup', '设立']].map(function (x) { return h('span', {}, [h('i', {}, [P.KIND_ICON[x[0]]]), x[1]]); }));
    var cal = P.weekGrid({ weeks: weeks, today: d.today, maxItems: 2, onItem: jump });
    var cCal = P.card({ cls: 'c8', title: '90 天日历', sub: '13 周 · ' + items.length + ' 项' + (kf ? ' · 已筛选' : ''), tight: true, body: [h('div', { class: 'pd-scroll m7-cal' }, [cal])], foot: [legend] });
    g.appendChild(cCal);
    var right = col('c4', []);
    var due = h('div', { class: 'pd-list' });
    reg.overdue.concat(reg.due30).filter(pass).slice(0, 4).forEach(function (it) { due.appendChild(P.item({ tone: it.listed ? 'hand' : it.tone === 'accent' ? 'accent' : it.tone, icon: P.KIND_ICON[it.kind], title: cut(it.title, 18), sub: it.kindName, right: it.label, rightSub: it.daysLeft < 0 ? '逾期 ' + (-it.daysLeft) + ' 天' : it.daysLeft === 0 ? '今天' : it.daysLeft + ' 天', onClick: function () { jump(it); } })); });
    if (!due.children.length) due.appendChild(P.empty('30 天内无到期事项'));
    var cDue = P.card({ title: '逾期与 30 天内', sub: '逾期 ' + reg.counts.overdue + ' · 30 天内 ' + reg.counts.due30, body: [due] });
    right.appendChild(cDue);
    var who = h('div', { class: 'who' });
    ['总经理', '财务负责人', '法务专员'].forEach(function (w, i) { who.appendChild(h('button', { class: i === M.who ? 'on' : '', onclick: function () { M.who = i; draw(); } }, [w])); });
    var rep = R.report;
    var cRep = P.card({ title: '法务月报', sub: d.today.slice(0, 7).replace('-', ' 年 ') + ' 月', body: [
      h('div', { class: 'pd-field' }, [h('label', {}, ['收件人']), who]),
      h('div', { class: 'm7-rep' }, rep.lines.slice(1, 3).map(function (t) { return h('div', { class: 'l' }, [cut(soft(t), 40)]); }))
    ], foot: [P.btn('全文 ' + rep.lines.length + ' 行', { cls: 'sm', onClick: function () { P.drawer(M.frame.body, { title: '法务月报', sub: d.company + ' · ' + d.today.slice(0, 7).replace('-', ' 年 ') + ' 月', body: [h('div', { class: 'pd-pre' }, [soft(rep.text)])], actions: [P.btn('发送到微信', { cls: 'primary', onClick: function () { sh.setQrReady(true); sh.showWeChat(); } })] }); } }),
      P.btn('发送到微信', { cls: 'primary sm', onClick: function () { sh.setQrReady(true); sh.showWeChat(); } })] });
    right.appendChild(cRep);
    if (d.log.length) right.appendChild(P.card({ title: '本期动作', sub: d.log.length + ' 条', body: [logList(d.log.slice(-3).reverse())] }));
    g.appendChild(right);
    work.appendChild(g);
    var cells = nodes(cal, '.day.has');
    var items2 = nodes(due, '.pd-item');
    story({ work: work, src: F.srcs, from: F.srcWrap, to: F.hub, label: reg.counts.total + ' 项', scan: cCal,
      rise: [cCal, cDue, cRep].concat(cells.slice(0, 12)).concat(items2), verdict: say, focus: items2[0] });
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
  function kvb(pairs) { var g = h('div', { class: 'kv' }); pairs.forEach(function (p) { g.appendChild(h('span', {}, [String(p[0])])); g.appendChild(h('span', {}, [String(p[1])])); }); return g; }
  function tagsb(list) { return h('div', { class: 'tags' }, list.map(function (t) { return h('span', {}, [String(t)]); })); }
  function has(q, arr) { for (var i = 0; i < arr.length; i++) if (q.indexOf(arr[i]) >= 0) return true; return false; }

  function opener(step) {
    var R = M.R; if (!R) return null;
    var k = R.kpi, d = M.data, reg = R.register, I = R.ip, S = R.setup;
    if (step === 'connect') {
      var dir = d.sources.filter(function (s) { return s.mode === 'direct'; }).length;
      return d.sources.length + ' 个来源已接入（直连 ' + dir + ' 个）：合同 ' + k.contracts + ' 份、证照 ' + k.licTotal + ' 项、知产 ' + k.ipAssets + ' 项，其中高风险合同 ' + k.highRisk + ' 份。';
    }
    if (step === 'board') {
      var t = topContract(), ls = licSoon();
      return '合规分 ' + k.compliance + '；' + t.id + ' 风险分 ' + t.score + '，' + dsh(t.end) + ' 到期' + (ls && ls.daysLeft != null ? '；' + ls.name + ' ' + ls.stateName : '') + '。';
    }
    if (step === 'contracts') {
      var C = curContract(), ms = missingOf(C);
      return C.id + ' ' + C.party + '：风险分 ' + C.score + '，' + (ms.length ? '缺「' + ms.map(function (x) { return x.clauseTitle; }).join('」「') + '」' : C.findings.length + ' 处待改') + '，高 ' + C.review.counts.high + ' 中 ' + C.review.counts.mid + '。';
    }
    if (step === 'setup') {
      var lic = (S.licenses || [])[0], ld = lic ? (LIB.setupRules.licenses[lic] || {}).days : 0;
      return S.equity
        ? '股权 ' + S.equity.holders.map(function (x) { return x.pct + '%'; }).join(' / ') + ' 落在' + S.equity.control + '；' + (ld ? lic + ' ' + ld + ' 天与登记并行，' : '') + '全程 ' + S.totalDays + ' 天，' + short(S.endDate) + ' 完成。'
        : S.typeName + ' ' + S.name + '：' + S.steps.length + ' 个节点 ' + S.totalDays + ' 天，' + short(S.endDate) + ' 完成，预计费用 ' + fmtN(S.fees.total) + ' 元。';
    }
    if (step === 'ip') {
      var u = urgentIp()[0], gp = coreGap();
      return (u ? ipT(u) + ' ' + u.dueLabel + ' 还有 ' + u.daysLeft + ' 天，预计 ' + fmtN(u.fee) + ' 元' : '60 天内无续展与缴费') + '；商标覆盖 ' + I.coverage + '%，缺口 ' + I.counts.gaps + ' 类' + (gp ? '，第 ' + gp.cls + ' 类' + gp.name + '属' + (gp.tier === 'core' ? '核心' : '延伸') + '类' : '') + '。';
    }
    if (step === 'register') {
      if (reg.counts.overdue) { var o = reg.overdue[0]; return o.kindName + '「' + o.title + '」逾期 ' + (-o.daysLeft) + ' 天；30 天内还有 ' + reg.counts.due30 + ' 项，其中证照 ' + reg.counts.license + ' 项。'; }
      var nx = nextItem();
      return nx ? '下一项 ' + short(nx.date) + ' ' + nx.title + '（' + nx.daysLeft + ' 天后）；90 天台账共 ' + reg.counts.total + ' 项。' : '90 天内无到期事项。';
    }
    return null;
  }
  function suggest(step) {
    if (step === 'connect') return ['接了哪几个来源', '高风险合同有几份', '进法务驾驶舱'];
    if (step === 'board') return ['哪份合同风险高', '合规分是怎么算的', '30 天内要办什么', '先处理哪一件'];
    if (step === 'contracts') return ['缺哪些必备条款', '为什么判高风险', '采纳全部高风险修订', '账期超过 90 天的是哪份'];
    if (step === 'setup') return ['为什么要 ' + (M.R ? M.R.setup.totalDays : 41) + ' 天', '股权够控股吗', '改成 51 / 49 会怎样', '要花多少钱'];
    if (step === 'ip') return ['哪几项快到期', '缺口类别为什么要补', '近似商标怎么办', '把快到期的加入清单'];
    if (step === 'register') return ['有没有逾期', '只看证照', '月报写了什么', '哪一周事项密集'];
    return null;
  }

  function answer(q, step) {
    if (!M.R) return null;
    q = String(q || '');
    var R = M.R, k = R.kpi, d = M.data, I = R.ip, S = R.setup, reg = R.register, w = workEl(), m, i;

    /* 点名某份合同 */
    m = q.match(/HT[-\s]?(\d{4})[-\s]?(\d{3})/i);
    if (m) {
      var cid = 'HT-' + m[1] + '-' + m[2];
      var cc = R.byId[cid];
      if (cc) return { text: cc.id + ' ' + cc.title + '（' + cc.party + ' · ' + cc.typeName + ' · ' + cc.roleName + '）：风险分 ' + cc.score + '，' + LV_NAME[cc.level] + '，高 ' + cc.review.counts.high + ' 中 ' + cc.review.counts.mid + ' 低 ' + cc.review.counts.low + '，' + dsh(cc.start) + ' 至 ' + dsh(cc.end) + '（' + cc.endDays + ' 天）。',
        blocks: [mini(['等级', '条款', '问题'], cc.findings.slice(0, 4).map(function (f) { return [SEV_NAME[f.severity], cut(f.clauseTitle, 8), cut(soft(f.issue), 16)]; }))],
        act: function () { M.contract = cid; M.filter = null; if (step === 'contracts') { draw(); refocus(cid); } else setStep('contracts'); } };
    }
    /* 点名某项知产 */
    m = q.match(/(TM|ZL|RZ|DM)[-\s]?0?(\d{1,2})/i);
    if (m) {
      var pre = m[1].toUpperCase(), aid = pre + '-' + (pre === 'DM' ? String(+m[2]) : pad2(m[2]));
      var aa = I.assets.filter(function (x) { return x.id === aid; })[0];
      if (aa) return { text: aa.id + ' ' + aa.title + '（' + aa.kindName + '）：' + (aa.due ? aa.dueLabel + ' ' + aa.due + '，还有 ' + aa.daysLeft + ' 天' : aa.dueLabel) + '，状态' + aa.status + (aa.action ? '，动作' + aa.action + '，预计 ' + fmtN(aa.fee) + ' 元' : '') + '。',
        act: aa.action ? function () { if (step !== 'ip') { setStep('ip'); return; } commit(K.toggleRenew(d, aa.id), aa.title + (aa.listed ? ' 已移出清单' : ' 已加入清单')); refocus(aipT(a), 260); }
          : function () { if (step !== 'ip') setStep('ip'); else refocus(aipT(a)); } };
    }
    /* 点名某个商标类别 */
    m = q.match(/第\s*(\d{1,2})\s*类/);
    if (m) {
      var cls = pad2(m[1]);
      var gpx = I.gaps.filter(function (x) { return x.cls === cls; })[0];
      var IC = LIB.ipClasses, mp = IC.byIndustry[d.profile.industry] || IC.byIndustry.default;
      if (gpx) return { text: '第 ' + cls + ' 类' + gpx.name + '（' + (gpx.tier === 'core' ? '核心类' : '延伸类') + '）尚未注册：' + gpx.reason + '。申请预计 ' + fmtN(gpx.fee) + ' 元。',
        act: function () { if (step !== 'ip') { setStep('ip'); return; } commit(K.toggleApply(d, cls), '第 ' + cls + ' 类' + (gpx.listed ? '已移出申请清单' : '已加入申请清单')); refocus('第 ' + cls + ' 类', 260); } };
      var own = d.ip.trademarks.filter(function (t) { return t.classes.indexOf(cls) >= 0; });
      if (own.length) return { text: '第 ' + cls + ' 类' + (IC.classNames[cls] || '') + '已注册：' + own.map(function (t) { return t.name + '（' + t.regNo + '，注册 ' + t.regDate + '）'; }).join('；') + '。',
        focus: step === 'ip' ? rowOf(w, '第 ' + cls + ' 类') : null };
      if (mp.core.concat(mp.extend).indexOf(cls) < 0) return { text: '第 ' + cls + ' 类不在本行业应覆盖的 ' + (mp.core.length + mp.extend.length) + ' 个类别里，核心类是第 ' + mp.core.join('、') + ' 类。' };
    }
    /* 点名某张证照 */
    var lic = R.licenses.filter(function (l) { return q.indexOf(l.name) >= 0 || (l.name.length > 4 && q.indexOf(l.name.slice(0, 4)) >= 0); })[0];
    if (lic) return { text: lic.name + '（' + lic.issuer + (lic.no ? ' · ' + lic.no : '') + '）：' + lic.stateName + (lic.expiry ? '，到期 ' + lic.expiry : '') + '。到期前 60 天启动换证，换证期间原证继续有效。',
      act: function () { openLicense(lic); } };
    /* 换屏 */
    if (has(q, ['进法务驾驶舱', '驾驶舱', '开始审查', '开始分析'])) return { text: '合规分 ' + k.compliance + '，合同 ' + k.contracts + ' 份、高风险 ' + k.highRisk + ' 份，30 天内到期 ' + k.due30 + ' 项。',
      act: function () { if (!M.charged) enterBoard(); else setStep('board'); } };

    if (step === 'connect') {
      if (has(q, ['来源', '直连', '接了', '同步', '导入', '几个'])) {
        var dir = d.sources.filter(function (s) { return s.mode === 'direct'; });
        return { text: '共 ' + d.sources.length + ' 个来源，系统直连 ' + dir.length + ' 个，其余表格导入，合计 ' + fmtN(d.sources.reduce(function (t, s) { return t + s.rows; }, 0)) + ' 条。',
          blocks: [mini(['来源', '方式', '条数'], d.sources.map(function (s) { return [srcShort(s.name), s.mode === 'direct' ? '直连' : '导入', fmtN(s.rows)]; }))] };
      }
      if (has(q, ['高风险', '几份', '合同'])) return { text: '合同 ' + k.contracts + ' 份：高风险 ' + k.highRisk + ' 份、中风险 ' + k.midRisk + ' 份，待处理 ' + k.findingsOpen + ' 处，平均风险分 ' + k.avgScore + '。',
        blocks: [mini(['合同', '相对方', '风险分'], R.contracts.slice(0, 4).map(function (c) { return [c.id, cut(c.party, 10), c.score]; }))],
        act: function () { M.filter = 'high'; setStep('contracts'); } };
      if (has(q, ['能力', '开通', '能做'])) return { text: '已开通 ' + CAPS.length + ' 项：' + CAPS.join('、') + '。' };
      if (has(q, ['注册资本', '主体', '成立', '行业'])) return { text: d.company + '：' + sh.industryNameOf(d.profile.industry) + '，注册资本 ' + W(d.profile.capital) + (d.profile.province ? '，' + d.profile.province : '') + (d.profile.founded ? '，成立 ' + d.profile.founded.slice(0, 4) + ' 年' : '') + '。' };
    }

    if (step === 'board') {
      if (has(q, ['合规分', '怎么算', '为什么低'])) return { text: '合规分 ' + k.compliance + ' = 合同平均风险分 ' + k.avgScore + ' × 40% + 证照有效率 ' + licOkPct() + '% × 30% + 商标布局覆盖 ' + k.coverage + '% × 30%。',
        blocks: [kvb([['合同 40%', k.avgScore], ['证照 30%', licOkPct() + '%'], ['商标布局 30%', k.coverage + '%'], ['合规分', k.compliance]])] };
      if (has(q, ['风险高', '哪份', '哪几份', '高风险'])) {
        var hi = R.contracts.filter(function (c) { return c.level === 'high'; });
        return { text: hi.length ? '高风险 ' + hi.length + ' 份：' + hi.map(function (c) { return c.id + ' ' + c.party + '（' + c.score + ' 分）'; }).join('；') + '。' : '当前无高风险合同，中风险 ' + k.midRisk + ' 份。',
          blocks: [mini(['合同', '相对方', '风险分', '高'], hi.map(function (c) { return [c.id, cut(c.party, 10), c.score, c.review.counts.high]; }))],
          act: function () { M.filter = 'high'; setStep('contracts'); } };
      }
      if (has(q, ['30 天', '待办', '要办', '到期'])) return { text: '30 天内 ' + reg.counts.due30 + ' 项' + (reg.counts.overdue ? '，另有逾期 ' + reg.counts.overdue + ' 项' : '') + '：合同与节点 ' + reg.counts.contract + '、证照 ' + reg.counts.license + '、知产 ' + reg.counts.ip + '。',
        blocks: [mini(['日期', '事项', '剩余'], reg.overdue.concat(reg.due30).slice(0, 5).map(function (it) { return [it.label, cut(it.title, 14), it.daysLeft < 0 ? '逾期 ' + (-it.daysLeft) : it.daysLeft + ' 天']; }))],
        act: function () { M.regKind = null; setStep('register'); } };
      if (has(q, ['先处理', '优先', '哪一件', '怎么办', '建议'])) {
        var t0 = topContract(), u0 = urgentIp()[0], o0 = reg.overdue[0];
        return { text: '先看三件：' + (o0 ? o0.title + ' 已逾期 ' + (-o0.daysLeft) + ' 天；' : '') + t0.id + ' 风险分 ' + t0.score + '，' + (missingOf(t0).length ? '缺 ' + missingOf(t0).length + ' 项必备条款' : t0.findings.length + ' 处待改') + '；' + (u0 ? ipT(u0) + ' ' + u0.dueLabel + ' 还有 ' + u0.daysLeft + ' 天' : '知产无近期到期') + '。',
          act: function () { M.contract = t0.id; M.filter = null; setStep('contracts'); } };
      }
      if (has(q, ['证照', '换证'])) { var l0 = licSoon();
        return { text: '证照 ' + k.licTotal + ' 项，待办 ' + k.licDue + ' 项' + (l0 ? '：' + l0.name + ' ' + l0.stateName + '（' + l0.issuer + '）' : '') + '。',
          blocks: [mini(['证照', '发证机关', '到期'], R.licenses.map(function (l) { return [cut(l.name, 12), cut(l.issuer, 10), l.expiry ? short(l.expiry) : '长期']; }))],
          act: l0 ? function () { openLicense(l0); } : null };
      }
      if (has(q, ['知产', '商标', '专利', '覆盖'])) return { text: '知产 ' + k.ipAssets + ' 项，待续展 / 缴费 ' + k.ipUrgent + ' 项；商标布局覆盖 ' + k.coverage + '%，缺口 ' + k.ipGaps + ' 类（核心类 ' + I.counts.coreGaps + '）。',
        act: function () { setStep('ip'); } };
    }

    if (step === 'contracts') {
      var C = curContract();
      if (has(q, ['缺', '必备条款', '少了'])) {
        var ms = missingOf(C);
        return { text: ms.length ? C.id + ' 缺 ' + ms.length + ' 项必备条款：' + ms.map(function (x) { return '「' + x.clauseTitle + '」' + SEV_NAME[x.severity] + '风险'; }).join('、') + '。采纳后按模板新增，风险分随之重算。'
          : C.id + ' 必备条款齐全，剩下 ' + C.findings.length + ' 处是条款内容的风险项。',
          blocks: ms.length ? [mini(['条款', '等级', '处理'], ms.map(function (x) { return [x.clauseTitle, SEV_NAME[x.severity], x.fix ? '新增' : '人工核对']; }))] : null,
          focus: rowOf(w, C.id) };
      }
      if (has(q, ['为什么', '凭什么', '依据', '判高', '判'])) {
        var Wt = LIB.contractRules.weights, L = LIB.contractRules.levels;
        return { text: C.id + ' 风险分 ' + C.score + '：满分 100，高风险每处扣 ' + Wt.high + '、中风险 ' + Wt.mid + '、低风险 ' + Wt.low + '；本份高 ' + C.review.counts.high + ' 中 ' + C.review.counts.mid + ' 低 ' + C.review.counts.low + '，扣 ' + (100 - C.score) + ' 分。低于 ' + L.mid + ' 判高风险。\n首要一处：' + C.findings[0].clauseTitle + '——' + soft(C.findings[0].issue) + '。依据：' + cut(soft(C.findings[0].basis), 46) + '。',
          blocks: [mini(['等级', '处数', '扣分'], [['高', C.review.counts.high, C.review.counts.high * Wt.high], ['中', C.review.counts.mid, C.review.counts.mid * Wt.mid], ['低', C.review.counts.low, C.review.counts.low * Wt.low]])],
          focus: rowOf(w, C.id) };
      }
      if (has(q, ['采纳', '改过来', '按建议', '修订'])) {
        var hiAll = R.contracts.reduce(function (t, c) { return t + c.review.counts.high; }, 0);
        if (has(q, ['全部', '所有', '高风险'])) {
          if (!hiAll) return { text: '当前没有待采纳的高风险修订，已采纳 ' + k.revised + ' 处。' };
          return { text: '采纳全部高风险修订 ' + hiAll + ' 处：按条款模板新增或改写，' + R.contracts.filter(function (c) { return c.review.counts.high; }).map(function (c) { return c.id; }).join('、') + ' 的风险分一起重算。',
            act: function () { doAllHigh(); } };
        }
        var f0 = C.findings.filter(function (x) { return x.fix; })[0];
        if (!f0) return { text: C.id + ' 没有可直接采纳的修订，剩下的要人工核对原件。' };
        return { text: C.id + ' ' + (f0.fix.mode === 'insert' ? '新增' : '修订') + '「' + f0.fix.title + '」：' + cut(f0.fix.text, 52) + '。采纳后风险分重算。',
          act: function () { commit(K.applyFix(d, C.id, f0.id, LIB), C.id + ' 已' + (f0.fix.mode === 'insert' ? '新增' : '修订') + '「' + f0.fix.title + '」'); refocus(C.id, 260); } };
      }
      if (has(q, ['账期', '90 天', '付款', '回款'])) {
        var long = [];
        R.contracts.forEach(function (c) { c.findings.forEach(function (f) { if (f.id === 'C01') long.push([c.id, cut(c.party, 10), f.issue.replace(/[^0-9]*(\d+).*/, '$1') + ' 天']); }); });
        return { text: long.length ? '账期超过 90 天的有 ' + long.length + ' 份：' + long.map(function (x) { return x[0] + '（' + x[2] + '）'; }).join('、') + '，我方为供方时资金占用与坏账风险高。' : '没有账期超过 90 天的销售合同。',
          blocks: long.length ? [mini(['合同', '相对方', '账期'], long)] : null };
      }
      if (has(q, ['金额', '多少钱', '合计'])) {
        var tot = R.contracts.reduce(function (t, c) { return t + (c.amount || 0); }, 0);
        return { text: '在册合同金额合计 ' + W(tot) + '，其中高风险 ' + W(R.contracts.filter(function (c) { return c.level === 'high'; }).reduce(function (t, c) { return t + (c.amount || 0); }, 0)) + '。',
          blocks: [mini(['合同', '金额', '等级'], R.contracts.slice().sort(function (a, b) { return (b.amount || 0) - (a.amount || 0); }).slice(0, 4).map(function (c) { return [c.id, c.amount ? W(c.amount) : '—', LV_NAME[c.level]]; }))] };
      }
      if (has(q, ['意见', '发给', '微信'])) { var raw0 = d.contracts.filter(function (x) { return x.id === C.id; })[0];
        return { text: softL(K.opinion(raw0, C.review, LIB).lines.slice(0, 4)).join('\n') };
      }
    }

    if (step === 'setup') {
      if (has(q, ['多少天', '为什么', '几天', '工期', '天数'])) {
        var lp = S.steps.filter(function (x) { return x.kind === 'license'; });
        return { text: '全程 ' + S.totalDays + ' 天：' + S.steps.length + ' 个节点，' + short(S.startDate) + ' 启动、' + short(S.endDate) + ' 完成' + (lp.length ? '；' + lp.map(function (x) { return x.title + ' ' + x.days + ' 天'; }).join('、') + '与登记并行办理' : '') + '。',
          blocks: [mini(['节点', '天数'], S.steps.slice(0, 6).map(function (x) { return [x.order + '. ' + cut(x.title, 10), x.days + ' 天']; }))] };
      }
      if (has(q, ['51', '49', '改成', '换成', '60', '50 / 50'])) {
        var pk = PRESETS.filter(function (p) { return q.indexOf(String(p[0])) >= 0 && q.indexOf(String(p[1])) >= 0; })[0] || [51, 49];
        var nd = K.updateSetup(M.data, (function () { var sp = M.data.setup.shares || [{ holder: M.data.company, pct: 100 }]; var n2 = clone(sp); if (n2.length < 2) n2.push({ holder: '合作方', pct: 0 }); n2[0].pct = pk[0]; n2[1].pct = pk[1]; return { shares: n2 }; })());
        var eq2 = K.run(nd, LIB).setup.equity;
        return { text: '改成 ' + pk[0] + ' / ' + pk[1] + '：落在' + eq2.control + (eq2.deadlock ? '，两方各半形成僵局' : '') + '；' + eq2.lines.map(function (l) { return l.label + (l.met ? ' 达到' : ' 未达'); }).join('、') + '。已按这个比例重算。',
          act: function () { setShares(pk); } };
      }
      if (has(q, ['控股', '控制', '够吗', '股权'])) {
        if (!S.equity) return { text: S.typeName + '不设股权，由总公司全资，' + S.typeDesc + '。' };
        return { text: '股权 ' + S.equity.holders.map(function (x) { return cut(x.holder, 10) + ' ' + x.pct + '%'; }).join(' / ')+ '：控股股东 ' + Math.round(S.equity.top * 100) + '%，落在' + S.equity.control + '。' + S.equity.lines.map(function (l) { return l.label + ' ' + l.pct + '% ' + (l.met ? '达到' : '未达'); }).join('；') + '。',
          blocks: [mini(['控制线', '门槛', '判断'], S.equity.lines.map(function (l) { return [l.label.replace(/线.*/, '线'), l.pct + '%', l.met ? '达到' : '未达']; }))],
          focus: rowOf(w, S.equity.lines[0].label) };
      }
      if (has(q, ['多少钱', '费用', '花'])) return { text: '预计费用 ' + fmtN(S.fees.total) + ' 元：刻章 ' + fmtN(S.fees.seal) + ' 元、代办 ' + fmtN(S.fees.agency) + ' 元。' + S.fees.note + '。' };
      if (has(q, ['材料', '要交什么', '清单'])) return { text: '材料合计 ' + S.materials.length + ' 项，按节点分摊。',
        blocks: [mini(['节点', '材料'], S.materials.slice(0, 6).map(function (x) { return [cut(x.step, 10), cut(x.item, 14)]; }))] };
      if (has(q, ['许可', '排污', '经营范围'])) return { text: (S.licenses || []).length ? '涉及许可 ' + S.licenses.join('、') + '，约 ' + S.licenses.map(function (n) { return (LIB.setupRules.licenses[n] || {}).days; }).join(' / ') + ' 天，与登记并行；取得许可前不得开展相应业务。' : '当前方案不涉及前置或后置许可。' };
      if (has(q, ['确认', '进台账'])) return { text: S.confirmed ? '方案已确认，' + S.steps.length + ' 个节点已进 90 天台账。' : '确认后 ' + S.steps.length + ' 个节点按日期进 90 天台账。',
        act: S.confirmed ? null : function () { commit(K.confirmSetup(M.data, LIB), '方案已确认，' + S.steps.length + ' 个节点已进台账'); } };
    }

    if (step === 'ip') {
      if (has(q, ['加入清单', '加进清单', '都加', '一起加'])) {
        var pend = urgentIp().filter(function (a) { return !a.listed && a.action; });
        if (!pend.length) return { text: '待续展 / 缴费的都已在清单里，预计 ' + fmtN(I.renewFee) + ' 元。' };
        return { text: '把 ' + pend.length + ' 项加入清单：' + pend.map(function (a) { return ipT(a); }).join('、') + '，预计合计 ' + fmtN(pend.reduce(function (t, a) { return t + a.fee; }, 0)) + ' 元。',
          act: function () { var cur = M.data; pend.forEach(function (a) { cur = K.toggleRenew(cur, a.id); }); commit(cur, pend.length + ' 项已加入续展 / 缴费清单'); } };
      }
      if (has(q, ['快到期', '到期', '几项', '续展', '年费'])) {
        var us = urgentIp();
        return { text: us.length ? '60 天内 ' + us.length + ' 项：' + us.map(function (a) { return ipT(a) + ' ' + a.dueLabel + ' ' + a.daysLeft + ' 天'; }).join('；') + '，预计合计 ' + fmtN(us.reduce(function (t, a) { return t + a.fee; }, 0)) + ' 元。' : '60 天内没有需要续展或缴费的资产。',
          blocks: [mini(['资产', '事项', '剩余', '预计'], us.map(function (a) { return [cut(ipT(a), 12), a.dueLabel, a.daysLeft + ' 天', fmtN(a.fee)]; }))],
          focus: us.length ? rowOf(w, ipT(us[0])) : null };
      }
      if (has(q, ['缺口', '为什么要补', '补哪几类', '布局'])) {
        return { text: '应覆盖 ' + (I.covered.length + I.gaps.length) + ' 类，已覆盖 ' + I.covered.length + ' 类（' + I.coverage + '%），缺 ' + I.gaps.length + ' 类，核心类 ' + I.counts.coreGaps + ' 类。' + (coreGap() ? '第 ' + coreGap().cls + ' 类' + coreGap().name + '：' + coreGap().reason + '。' : ''),
          blocks: [mini(['类别', '核心 / 延伸', '预计'], I.gaps.map(function (x) { return ['第 ' + x.cls + ' 类 ' + x.name, x.tier === 'core' ? '核心' : '延伸', fmtN(x.fee)]; }))],
          focus: coreGap() ? rowOf(w, '第 ' + coreGap().cls + ' 类') : null };
      }
      if (has(q, ['近似', '异议', '侵权', '线索', '怎么办'])) {
        if (!I.similar.length && !I.leads.length) return { text: '当前无近似商标与侵权线索。' };
        return { text: I.similar.map(function (s) { return '「' + s.name + '」第 ' + s.classes.join('、') + ' 类（' + s.holder + '，相似 ' + Math.round(s.similarity * 100) + '%）' + s.status + (s.deadline ? '，' + s.deadline + ' 前' + s.action + '，还有 ' + s.daysLeft + ' 天' : '，' + s.action); }).join('；') + (I.leads.length ? '。侵权线索 ' + I.leads.length + ' 条：' + I.leads.map(function (l) { return l.where + ' ' + l.action; }).join('；') : '') + '。',
          blocks: [tagsb(I.leads.map(function (l) { return cut(l.where + ' · ' + l.note, 20); }))] };
      }
      if (has(q, ['多少钱', '费用', '合计', '预计'])) return { text: '续展 / 缴费清单 ' + I.renewCount + ' 项预计 ' + fmtN(I.renewFee) + ' 元，商标申请清单 ' + I.applyCount + ' 类预计 ' + fmtN(I.applyFee) + ' 元，合计 ' + fmtN(I.renewFee + I.applyFee) + ' 元（官费加预计代理费）。' };
    }

    if (step === 'register') {
      if (has(q, ['逾期', '过期', '超了'])) return { text: reg.counts.overdue ? '逾期 ' + reg.counts.overdue + ' 项：' + reg.overdue.map(function (it) { return it.title + '（' + it.kindName + '，' + (-it.daysLeft) + ' 天）'; }).join('；') + '。' : '当前没有逾期事项，30 天内 ' + reg.counts.due30 + ' 项。',
        act: reg.counts.overdue ? function () { jump(reg.overdue[0]); } : null };
      if (has(q, ['只看', '筛', '过滤'])) {
        var key = q.indexOf('证照') >= 0 ? 'license' : q.indexOf('知产') >= 0 || q.indexOf('商标') >= 0 || q.indexOf('专利') >= 0 ? 'ip' : q.indexOf('设立') >= 0 ? 'setup' : q.indexOf('合同') >= 0 ? 'contract' : null;
        if (key) { var nm = KINDS.filter(function (x) { return x[0] === key; })[0][1];
          return { text: '只看' + nm + '：' + kindCount(key) + ' 项。', act: function () { M.regKind = key; draw(); } }; }
      }
      if (has(q, ['哪一周', '哪周', '事多', '密集', '集中'])) {
        var top = reg.weeks.slice().sort(function (a, b) { return b.items.length - a.items.length; })[0];
        return { text: '第 ' + (top.w + 1) + ' 周（' + top.start + ' 起）事项 ' + top.items.length + ' 项：' + top.items.slice(0, 3).map(function (it) { return short(it.date) + ' ' + cut(it.title, 14); }).join('；') + '。',
          blocks: [mini(['日期', '事项', '类型'], top.items.slice(0, 5).map(function (it) { return [it.label, cut(it.title, 14), it.kindName]; }))] };
      }
      if (has(q, ['月报', '报告', '写了什么', '发给'])) return { text: softL(R.report.lines.slice(1, 4)).join('\n'),
        blocks: [tagsb(R.report.todo.slice(0, 3).map(function (t) { return cut(soft(t), 20); }))] };
      if (has(q, ['30 天', '近期', '要办'])) return { text: '30 天内 ' + reg.counts.due30 + ' 项：合同与节点 ' + reg.counts.contract + '、证照 ' + reg.counts.license + '、知产 ' + reg.counts.ip + (reg.counts.setup ? '、设立 ' + reg.counts.setup : '') + '。',
        blocks: [mini(['日期', '事项', '剩余'], reg.due30.slice(0, 6).map(function (it) { return [it.label, cut(it.title, 14), it.daysLeft + ' 天']; }))] };
    }
    return null;
  }

  /* ================= 文档 ================= */
  var CTYPE = [[/采购/, 'purchase', 'buy'], [/设备/, 'equipment', 'buy'], [/销售|供货|订货/, 'sale', 'supply'], [/借款|贷款/, 'loan', 'borrower'],
    [/租赁/, 'lease', 'lessee'], [/加工|承揽/, 'processing', 'orderer'], [/保密|NDA/i, 'nda', 'disclosing'], [/劳动/, 'labor', 'employer'],
    [/代理/, 'agency', 'principal'], [/软件/, 'software', 'client'], [/服务/, 'service', 'client'], [/框架/, 'framework', 'buy']];
  var CLAUSE_MAP = [
    [/质量标准|技术协议|封样|质量要求/, 'quality', '质量标准'],
    [/质保|保修|warranty/i, 'warranty', '质保期'],
    [/验收|异议期/, 'acceptance', '验收与异议期'],
    [/交付|交货|delivery|发货/i, 'delivery', '交付期限'],
    [/违约|penalty|赔偿责任/i, 'liability', '违约责任'],
    [/合同金额|价款|付款|支付|amount|payment/i, 'payment', '合同金额与付款'],
    [/争议|管辖|仲裁|诉讼/, 'dispute', '争议解决'],
    [/保密/, 'confidentiality', '保密'],
    [/知识产权|图纸|著作权|专利权/, 'ip', '知识产权归属'],
    [/不可抗力/, 'force', '不可抗力'],
    [/标的|品名|规格型号/, 'subject', '标的']
  ];
  function num0(s) { var v = parseFloat(String(s == null ? '' : s).replace(/[,，\s元%]/g, '')); return isNaN(v) ? null : v; }
  function lines0(doc) {
    var ls = (doc.paragraphs && doc.paragraphs.length ? doc.paragraphs : String(doc.text || '').split(/[\n\r]+/));
    return ls.map(function (x) { return String(x).replace(/\s+/g, ' ').trim(); }).filter(function (x) { return x.length > 1; });
  }
  function docContract(doc) {
    var txt = String(doc.text || '').replace(/\s+/g, ' '), ls = lines0(doc), CR = LIB.contractRules, d0 = M.data, i;
    var mAmt = txt.match(/(?:合同金额|金额|价款|总价)[^0-9]{0,8}([\d][\d,，.]*)\s*元/) || txt.match(/(?:CNY|RMB|人民币)\s*([\d][\d,.]*)/i) || txt.match(/Amount[^0-9]{0,10}([\d][\d,.]*)/i);
    var total = mAmt ? num0(mAmt[1]) : null;
    if (!total) return null;
    var mTax = txt.match(/含税\s*(\d{1,2})\s*%/) || txt.match(/Tax\s*(\d{1,2})\s*%/i);
    var mDue = txt.match(/(?:交付|交货|delivery)[^0-9]{0,12}(20\d{2})\s*[年\-\.]\s*(\d{1,2})\s*[月\-\.]\s*(\d{1,2})/i);
    var due = mDue ? mDue[1] + '-' + pad2(mDue[2]) + '-' + pad2(mDue[3]) : null;
    var mCap = txt.match(/(?:累计)?不超过[^0-9]{0,10}(\d{1,3}(?:\.\d+)?)\s*%/) || txt.match(/cap\s*(\d{1,3}(?:\.\d+)?)\s*%/i);
    var capPct = mCap ? parseFloat(mCap[1]) : null;
    var mWar = txt.match(/质保期?\s*(\d{1,2})\s*个?月/) || txt.match(/保修\s*(\d{1,2})\s*个?月/) || txt.match(/warranty[^0-9]{0,8}(\d{1,2})/i);
    var warMonths = mWar ? +mWar[1] : null;
    /* 付款表：期次 / 比例 / 金额 */
    var payTbl = null, adv = null;
    (doc.tables || []).forEach(function (t) { if (!payTbl && t.length > 1 && String(t[0].join('')).match(/比例|金额|期次|款/)) payTbl = t; });
    if (payTbl) { var r1 = payTbl[1] || [], pc = r1.filter(function (x) { return /%/.test(String(x)); })[0]; if (pc) adv = num0(pc) / 100; }
    if (adv == null) { var mAdv = txt.match(/(?:首付|预付)[^0-9]{0,6}(\d{1,3})\s*%/); if (mAdv) adv = +mAdv[1] / 100; }
    /* 条款拆解 */
    var seen = {}, clauses = [];
    ls.forEach(function (ln) {
      if (clauses.length >= 12 || /^(甲方|乙方|双方|供方|需方|出租方|承租方|From|To)[：:\s]/.test(ln)) return;
      var hit = null;
      CLAUSE_MAP.forEach(function (mp) { if (!hit && mp[0].test(ln) && !seen[mp[1]]) hit = mp; });
      if (!hit) return;
      seen[hit[1]] = 1;
      var params = {};
      if (hit[1] === 'payment') { params.termDays = 0; params.advanceRatio = adv == null ? 0 : adv; }
      if (hit[1] === 'delivery') params.latePenalty = /违约|penalty|逾期/i.test(txt);
      if (hit[1] === 'liability') params.capMultiple = capPct == null ? null : capPct / 100;
      if (hit[1] === 'warranty') params.months = warMonths == null ? 12 : warMonths;
      if (hit[1] === 'acceptance') params.objectionDays = 15;
      if (hit[1] === 'quality') params.standard = '文档约定';
      if (hit[1] === 'dispute') params.venue = /乙方所在地|对方所在地/.test(ln) ? 'counterparty' : 'ours';
      clauses.push({ no: String(clauses.length + 1), type: hit[1], title: hit[2], text: cut(ln, 96), params: params });
    });
    if (!clauses.length) return null;
    /* 抬头与相对方 */
    var title = ls[0] && ls[0].length <= 24 ? ls[0] : '导入合同';
    var mParty = txt.match(/乙方[：:]\s*([^\s　，,；;甲]+)/) || txt.match(/供方[：:]\s*([^\s　，,；;]+)/);
    var party = mParty ? mParty[1].replace(/(股份)?有限(责任)?公司$/, '').replace(/公司$/, '') : '文档相对方';
    var tp = 'purchase', role = 'buy';
    for (i = 0; i < CTYPE.length; i++) { if (CTYPE[i][0].test(title) || CTYPE[i][0].test(txt.slice(0, 90))) { tp = CTYPE[i][1]; role = CTYPE[i][2]; break; } }
    var end = due || K.dateOf(d0.today, 365);
    M.docN++;
    var id = 'HT-DOC-' + pad2(M.docN);
    var cObj = { id: id, type: tp, role: role, title: title, party: party, amount: Math.round(total), signed: d0.today, start: d0.today, end: end,
      status: '审查中', milestones: due ? [{ date: due, text: '交付期限' }] : [], clauses: clauses, revisions: [] };
    var rv = K.reviewContract(cObj, LIB);
    var miss = rv.findings.filter(function (f) { return f.kind === 'missing'; });
    var L = window.DGG.docparse.label(doc.kind);
    var lines = [L + '《' + doc.name + '》读完：' + title + '，相对方 ' + party + '，金额 ' + fmtN(total) + ' 元' + (mTax ? '（含税 ' + mTax[1] + '%）' : '') + (due ? '，交付 ' + due : '') + (capPct != null ? '，违约金上限 ' + capPct + '%' : '') + (warMonths ? '，质保 ' + warMonths + ' 个月' : '') + '。'];
    lines.push('按' + (CR.types[tp] || tp) + '必备条款逐项核对：文档里读到 ' + clauses.length + ' 条（' + clauses.map(function (c) { return c.title; }).join('、') + '）' + (miss.length ? '，缺 ' + miss.length + ' 项：' + miss.map(function (x) { return '「' + x.clauseTitle + '」'; }).join('') : '，必备条款齐全') + '。');
    lines.push('风险分 ' + rv.score + '（' + LV_NAME[rv.level] + '）：高 ' + rv.counts.high + ' 中 ' + rv.counts.mid + ' 低 ' + rv.counts.low + '。已进合同台账 ' + id + '，' + (due ? '交付期限 ' + due + ' 一并进 90 天台账。' : '到期日按一年计。'));
    var kvl = [['金额', fmtN(total) + ' 元']];
    if (mTax) kvl.push(['税率', mTax[1] + '%']);
    if (due) kvl.push(['交付期限', due]);
    if (adv != null) kvl.push(['首期比例', Math.round(adv * 100) + '%']);
    if (capPct != null) kvl.push(['违约金上限', capPct + '%']);
    kvl.push(['风险分', rv.score + ' · ' + LV_NAME[rv.level]]);
    var blocks = [kvb(kvl)];
    if (payTbl) blocks.push(mini(payTbl[0].slice(0, 3), payTbl.slice(1, 4).map(function (r) { return r.slice(0, 3); })));
    if (miss.length) blocks.push(tagsb(miss.map(function (x) { return '缺 ' + x.clauseTitle; })));
    return { text: lines.join('\n'), blocks: blocks,
      act: function () {
        var nd = K.ensure(M.data);
        nd.contracts.push(clone(cObj));
        nd.log.push({ seq: nd.log.length + 1, kind: 'contract', label: '文档进台账', detail: id + ' ' + title + '，' + fmtN(total) + ' 元，风险分 ' + rv.score + '，缺 ' + miss.length + ' 项必备条款' });
        M.contract = id; M.filter = null;
        if (M.step === 'contracts') { commit(nd, id + ' 已进合同台账，风险分 ' + rv.score); refocus(id, 300); }
        else { M.data = nd; recompute(); setStep('contracts'); }
      } };
  }
  function docSheet(doc) {
    var s0 = (doc.sheets || [])[0];
    if (!s0 || !s0.rows.length) return null;
    var head = (s0.rows[0] || []).map(function (x) { return String(x).trim(); });
    var body = s0.rows.slice(1).filter(function (r) { return String(r[0] || '').trim(); });
    var iId = -1, iParty = -1, iAmt = -1, iEnd = -1;
    head.forEach(function (x, i) {
      if (iId < 0 && /合同编号|合同号|编号/.test(x)) iId = i;
      if (iParty < 0 && /相对方|对方|客户|供应商|乙方/.test(x)) iParty = i;
      if (iAmt < 0 && /金额|价款|总价/.test(x)) iAmt = i;
      if (iEnd < 0 && /到期|结束|终止/.test(x)) iEnd = i;
    });
    if (iId >= 0 && iParty >= 0) {
      return { text: 'Excel《' + doc.name + '》读完：' + doc.sheets.length + ' 张表、' + body.length + ' 行合同，表头 ' + head.slice(0, 6).join(' / ') + '。\n台账里已有 ' + M.R.contracts.length + ' 份，导入的 ' + body.length + ' 行按合同编号比对后并入。',
        blocks: [mini(head.slice(0, 4), body.slice(0, 4).map(function (r) { return r.slice(0, 4); }))],
        act: function () { M.filter = null; if (M.step !== 'contracts') setStep('contracts'); } };
    }
    return { text: 'Excel《' + doc.name + '》读完：' + doc.sheets.length + ' 张表、' + body.length + ' 行，表头 ' + head.slice(0, 6).join(' / ') + '。\n这张表没有合同编号与相对方两列，进不了合同台账；合同台账要的列是 合同编号 / 相对方 / 类型 / 金额 / 起止日期 / 状态。' + (/科目/.test(head.join('')) ? '\n表头是科目口径，属于账务数据，法务这边不动。' : ''),
      blocks: [mini(head.slice(0, 4), body.slice(0, 4).map(function (r) { return r.slice(0, 4); }))] };
  }
  function docSlides(doc) {
    var titles = (doc.slides || []).map(function (s) { return s.title || ''; }).filter(Boolean);
    var txt = String(doc.text || '').replace(/\s+/g, ' ');
    var hits = [];
    [[/合同/, '合同'], [/商标/, '商标'], [/专利/, '专利'], [/许可|资质|证照/, '证照'], [/子公司|分公司|设立/, '设立'], [/诉讼|仲裁|纠纷/, '争议']].forEach(function (x) { if (x[0].test(txt)) hits.push(x[1]); });
    var dates = (txt.match(/20\d{2}\s*[年\-]\s*\d{1,2}\s*[月\-]?\s*\d{0,2}/g) || []).slice(0, 3);
    var lines = ['PPT《' + doc.name + '》读完：' + doc.slides.length + ' 页，首页「' + (titles[0] || '—') + '」' + (titles[1] ? '，第 2 页「' + titles[1] + '」' : '') + '。'];
    lines.push(hits.length ? '正文里出现法务口径：' + hits.join('、') + '，可以对上台账核；' : '正文没有合同、知产、证照、设立这几类法务口径，台账不动；');
    lines.push('台账现状：合同 ' + M.R.kpi.contracts + ' 份（高风险 ' + M.R.kpi.highRisk + '）、证照 ' + M.R.kpi.licTotal + ' 项、知产 ' + M.R.kpi.ipAssets + ' 项' + (dates.length ? '；文档提到的日期 ' + dates.join('、') : '') + '。');
    return { text: lines.join('\n'), blocks: [tagsb(titles.slice(0, 4))],
      act: function () { P.drawer(M.frame.body, { title: doc.name, sub: 'PPT · ' + doc.slides.length + ' 页 · ' + doc.sizeText, body: [h('div', { class: 'pd-pre' }, [(doc.slides || []).map(function (s) { return '第 ' + s.no + ' 页 ' + (s.title || '') + '\n' + s.lines.join('\n'); }).join('\n\n')])] }); } };
  }
  function docMail(doc) {
    var ml = doc.mail || {}, txt = String(doc.text || '').replace(/\s+/g, ' ');
    var wan = (txt.match(/([\d][\d,.]*)\s*万元/g) || []);
    var buys = M.R.contracts.filter(function (c) { return c.role === 'buy' || c.roleName.indexOf('买方') >= 0 || c.roleName.indexOf('定作') >= 0; });
    var tot = buys.reduce(function (t, c) { return t + (c.amount || 0); }, 0);
    var lines = ['邮件《' + (ml.subject || doc.name) + '》读完：发件 ' + (ml.from || '—') + '，' + (ml.date || '') + (wan.length ? '，正文金额 ' + wan.join('、') : '') + '。'];
    if (wan.length) lines.push('对上合同台账：我方为买方 / 定作方的合同 ' + buys.length + ' 份，金额合计 ' + W(tot) + '，其中 30 天内有履约节点的 ' + M.R.register.due30.filter(function (it) { return it.kind === 'milestone'; }).length + ' 项。');
    else lines.push('正文没读到金额，合同台账不动。');
    lines.push('附件 ' + ((ml.attaches || []).length) + ' 个；' + (M.R.register.counts.overdue ? '台账里已有逾期 ' + M.R.register.counts.overdue + ' 项，先处理那一项。' : '台账里暂无逾期项。'));
    return { text: lines.join('\n'), blocks: [kvb([['发件', ml.from || '—'], ['主题', cut(ml.subject || '—', 16)], ['日期', ml.date || '—']]),
      buys.length ? mini(['合同', '相对方', '金额'], buys.slice(0, 4).map(function (c) { return [c.id, cut(c.party, 10), c.amount ? W(c.amount) : '—']; })) : null],
      act: function () { M.filter = null; M.contract = (buys[0] || M.R.contracts[0]).id; if (M.step === 'contracts') { draw(); refocus(M.contract); } else setStep('contracts'); } };
  }
  function onDoc(doc) {
    if (!doc || !doc.ok || !M.R) return null;
    if (doc.kind === 'excel') return docSheet(doc);
    if (doc.kind === 'ppt') return docSlides(doc);
    if (doc.kind === 'eml') return docMail(doc);
    var c = docContract(doc);
    if (c) return c;
    var ls = lines0(doc);
    return { text: window.DGG.docparse.label(doc.kind) + '《' + doc.name + '》读完：' + ls.length + ' 段。没读到合同金额，进不了审查；审查要的是金额、交付期限、付款方式、违约责任这几项。\n开头：' + cut(ls[0] || '—', 40),
      blocks: [tagsb(ls.slice(0, 4).map(function (x) { return cut(x, 16); }))] };
  }

  window.DGG.chatBrain('m7', {
    opener: function (step) { return opener(step); },
    suggest: function (step) { return suggest(step); },
    answer: function (q, step) { return answer(q, step); },
    onDoc: function (doc, step) { return onDoc(doc, step); }
  });

  window.DGG = window.DGG || {};
  window.DGG.registerModule('m7', { mount: mount, unmount: unmount, onCompany: onCompany, onIndustry: onIndustry });
})();
