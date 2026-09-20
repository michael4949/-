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
  /* 给行与卡片标上业务 id，内核的 {type:'focus'|'open', ref} 就能找到它 */
  function tagRef(el, ref) { if (el && el.setAttribute) el.setAttribute('data-ref', ref); return el; }
  function tagRefs(tbl, rows, textOf, refOf) {
    trs(tbl).forEach(function (tr) {
      var t = tr.textContent, i, s2;
      for (i = 0; i < rows.length; i++) { s2 = textOf(rows[i]); if (s2 && t.indexOf(s2) >= 0) { tr.setAttribute('data-ref', refOf(rows[i])); return; } }
    });
  }
  function workEl() { return M.frame ? M.frame.work : null; }
  function rowOf(scope, txt) {
    var list = scope ? scope.querySelectorAll('.pd-table tbody tr, .pd-item, .m7-classes .cl, .m7-lines .ln') : [], i;
    for (i = 0; i < list.length; i++) if (list[i].textContent.indexOf(txt) >= 0) return list[i];
    return null;
  }

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
    LIB = { contractRules: DATA.m7.contractRules, setupRules: DATA.m7.setupRules, ipClasses: DATA.m7.ipClasses, industries: DATA.industries };
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
    tagRefs(tbl, R.contracts, function (c) { return c.id; }, function (c) { return c.id; });
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
    R.licenses.slice().sort(function (a, b) { return (a.daysLeft == null ? 9999 : a.daysLeft) - (b.daysLeft == null ? 9999 : b.daysLeft); }).slice(0, 3).forEach(function (l) { lic.appendChild(tagRef(P.item({ tone: l.state === 'ok' ? 'ok' : l.state === 'due' ? 'risk' : 'late', icon: '证', title: cut(l.name, 14), sub: l.issuer, right: l.expiry ? dsh(l.expiry) : '长期', rightSub: l.state === 'ok' ? (l.expiry ? l.daysLeft + ' 天' : '') : l.stateName, onClick: function () { openLicense(l); } }), l.id)); });
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
    tagRefs(tbl, shown, function (c) { return c.id; }, function (c) { return c.id; });
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
      eq.lines.forEach(function (l) { lines.appendChild(h('div', { class: 'ln' + (l.met ? ' met' : ''), 'data-ref': 'EQ-' + l.key }, [P.chip(l.met ? (l.key === 'veto' ? 'risk' : 'ok') : 'done', l.met ? '达到' : '未达'), h('span', { class: 'l' }, [l.label + ' · ' + l.pct + '%'])])); });
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
    tagRefs(tbl, I.assets, function (a) { return ipT(a); }, function (a) { return a.id; });
    var cTbl = P.card({ title: '资产到期表', sub: I.counts.total + ' 项', tight: true, body: [h('div', { class: 'pd-scroll m7-tbl' }, [tbl])] });
    var have = {}; d.ip.trademarks.forEach(function (t) { t.classes.forEach(function (c) { have[c] = (have[c] || []).concat([t.name]); }); });
    var cls = h('div', { class: 'm7-classes' });
    map.core.concat(map.extend).forEach(function (c) {
      var tier = map.core.indexOf(c) >= 0 ? 'core' : 'extend', gap = I.gaps.filter(function (x) { return x.cls === c; })[0];
      cls.appendChild(h('div', { class: 'cl ' + (have[c] ? 'have' : 'gap-' + tier), 'data-ref': 'CLS-' + c }, [
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

  /* ================= 对话坞 · 内核大脑的落地 =================
     问答、开场发现、快捷问句、文档摄入全部走 DGG.coreM7 的 screens / brief / suggest / ask / ingest
     （与 skill 内核同一份实现）。这一段只做两件事：把当前上下文交出去，把内核返回的声明式动作落到页面上。 */
  function refEl(ref) {
    var w = workEl();
    if (!w || ref == null) return null;
    var el = w.querySelector('[data-ref="' + String(ref) + '"]');
    if (el) return el;
    if (String(ref).slice(0, 4) === 'CLS-') return rowOf(w, '第 ' + String(ref).slice(4) + ' 类');
    var a = M.R.ip.assets.filter(function (x) { return x.id === ref; })[0];
    return rowOf(w, a ? ipT(a) : String(ref));          /* 表头排序后重绘过的行，退回按文本找 */
  }
  function refocus(ref, ms) { setTimeout(function () { var el = refEl(ref); if (el) anim().pulse(el, { ms: 2200, scroll: true }); }, ms || 90); }
  function docBody(list) {
    var out = [];
    (list || []).forEach(function (b) {
      if (b && b.type === 'text') { out.push(h('div', { class: 'pd-pre' }, [String(b.text == null ? '' : b.text)])); return; }
      var n = window.DGG.chat.block(b);
      if (n) out.push(n);
    });
    return out;
  }
  /* 文档摄入的写回：内核已经算好新数据副本，这里只管进合同屏、选中与提示 */
  function commitDoc(next) {
    var had = {};
    M.data.contracts.forEach(function (c) { had[c.id] = 1; });
    var added = next.contracts.filter(function (c) { return !had[c.id]; })[0];
    M.data = next; recompute();
    if (!added) { draw(); return; }
    M.contract = added.id; M.filter = null;
    if (M.step !== 'contracts') { setStep('contracts'); return; }
    draw();
    if (M.frame) P.toast(M.frame.body, added.id + ' 已进合同台账，风险分 ' + M.R.byId[added.id].score);
    refocus(added.id, 300);
  }
  function openPanel(a) {
    var R = M.R;
    if (a.panel === 'contract') {
      if (!R.byId[a.ref]) return false;
      M.contract = a.ref; M.filter = null;
      if (M.step !== 'contracts') setStep('contracts');
      else { draw(); refocus(a.ref); }
      return true;
    }
    if (a.panel === 'ip') {
      if (!R.ip.assets.some(function (x) { return x.id === a.ref; })) return false;
      if (M.step !== 'ip') setStep('ip');
      else refocus(a.ref);
      return true;
    }
    if (a.panel === 'license') {
      var l = R.licenses.filter(function (x) { return x.id === a.ref; })[0];
      if (!l) return false;
      openLicense(l);
      return true;
    }
    if (a.panel === 'opinion') {
      var c = R.byId[a.ref], raw = c ? M.data.contracts.filter(function (x) { return x.id === c.id; })[0] : null;
      if (!raw) return false;
      var op = K.opinion(raw, c.review, LIB);
      P.drawer(M.frame.body, { title: '审查意见 · ' + c.id, sub: c.title + ' · ' + c.party, body: [h('div', { class: 'pd-pre' }, [soft(op.text)])],
        actions: [P.btn('发送到微信', { cls: 'primary', onClick: function () { sh.setQrReady(true); sh.showWeChat(); } })] });
      return true;
    }
    if (a.panel === 'doc') { P.drawer(M.frame.body, { title: a.title || a.ref, sub: a.sub, body: docBody(a.blocks) }); return true; }
    return false;
  }
  function applyAction(a) {
    var input = a.input || {};
    if (a.action === 'applyFix') {
      var c = M.R.byId[input.contractId];
      if (!c || !c.findings.some(function (f) { return f.id === input.findingId && f.fix; })) return false;
      var f = c.findings.filter(function (x) { return x.id === input.findingId; })[0];
      M.contract = c.id; M.filter = null;
      commit(K.applyFix(M.data, c.id, f.id, LIB), c.id + ' 已' + (f.fix.mode === 'insert' ? '新增' : '修订') + '「' + f.fix.title + '」');
      refocus(c.id, 260);
      return true;
    }
    if (a.action === 'applyAllHigh') {
      if (!M.R.contracts.some(function (c) { return c.review.counts.high; })) return false;
      doAllHigh();
      return true;
    }
    if (a.action === 'toggleRenew') {
      var ids = input.ids || (input.id ? [input.id] : []);
      ids = ids.filter(function (id) { return M.R.ip.assets.some(function (x) { return x.id === id; }); });
      if (!ids.length) return false;
      var cur = M.data;
      ids.forEach(function (id) { cur = K.toggleRenew(cur, id); });
      var one = M.R.ip.assets.filter(function (x) { return x.id === ids[0]; })[0];
      commit(cur, ids.length > 1 ? ids.length + ' 项已加入续展 / 缴费清单' : one.title + (one.listed ? ' 已移出清单' : ' 已加入清单'));
      refocus(ids[0], 260);
      return true;
    }
    if (a.action === 'toggleApply') {
      var gp = M.R.ip.gaps.filter(function (x) { return x.cls === input.cls; })[0];
      if (!gp) return false;
      commit(K.toggleApply(M.data, gp.cls), '第 ' + gp.cls + ' 类' + (gp.listed ? '已移出申请清单' : '已加入申请清单'));
      refocus('CLS-' + gp.cls, 260);
      return true;
    }
    if (a.action === 'confirmSetup') {
      if (M.R.setup.confirmed) return false;
      commit(K.confirmSetup(M.data, LIB), '方案已确认，' + M.R.setup.steps.length + ' 个节点已进台账');
      return true;
    }
    if (a.action === 'ingest') {
      var r = K.ingest(input.doc, M.step, M.data, LIB, M.R);
      if (!r || !r.data) return false;
      commitDoc(r.data);
      return true;
    }
    return false;
  }
  function setParam(a) {
    if (a.path === 'filter') {
      M.filter = a.value || null;
      if (M.step !== 'contracts') setStep('contracts');
      else draw();
      return true;
    }
    if (a.path === 'regKind') {
      M.regKind = a.value || null;
      if (M.step !== 'register') setStep('register');
      else draw();
      return true;
    }
    if (a.path === 'setup.shares') {
      if (!a.value || a.value.length < 2 || !M.R.setup.equity) return false;
      setShares(a.value);
      return true;
    }
    return false;
  }

  window.DGG.chatBrain('m7', {
    kernel: window.DGG.coreM7,
    ctx: function () { return { data: M.data, lib: LIB, result: M.R }; },
    act: function (a, api) {
      if (!a || !a.type || !M.R) return false;
      if (a.type === 'goto') {
        if (['connect', 'board', 'contracts', 'setup', 'ip', 'register'].indexOf(a.step) < 0) return false;
        setStep(a.step);
        return true;
      }
      if (a.type === 'focus') { var el = refEl(a.ref); if (!el) return false; api.focus(el); return true; }
      if (a.type === 'open') return openPanel(a);
      if (a.type === 'apply') return applyAction(a);
      if (a.type === 'set') return setParam(a);
      return false;                                        /* 不认识的动作交给通用兜底 */
    }
  });

  window.DGG = window.DGG || {};
  window.DGG.registerModule('m7', { mount: mount, unmount: unmount, onCompany: onCompany, onIndustry: onIndustry });
})();
