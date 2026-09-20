/* AI CFO · 财务副驾驶（六屏）
 * 接入 → 财务驾驶舱 → 三表勾稽 → 风险预警 → 现金预测 → 政策与月报
 * 每屏三拍：来源块亮起、数据包进处理块 → 数字滚动 / 图形画出 / 明细流入 → 一句结论推上来
 * 计算全部走 DGG.coreM6（与 skill 同一份内核）；调整分录 / 风险处置 / 现金方案 / 政策清单写回同一份账套，各屏随之重算
 * 纯预制、断网可用；不用任何存储 API
 */
(function () {
  'use strict';
  var sh, $root, h, DATA, P, K, LIB;
  var ACCENT = window.DGG.PALETTE.m6;
  var CAPS = [['三表勾稽', '14 条关系 · 下钻到单据'], ['风险预警', '10 条规则 · 概率 × 影响'], ['现金预测', '13 周日历 · 补缺三方案'], ['政策匹配', '12 项条件核对']];
  var LEVEL = { high: ['late', '高'], mid: ['risk', '中'], low: ['done', '低'] };
  var STAT = { ok: ['ok', '正常'], warn: ['risk', '差异'], bad: ['late', '异常'], na: ['done', '不适用'] };
  var PSTAT = { ok: ['ok', '满足'], pending: ['risk', '待补材料'], no: ['done', '不符'] };
  var SRC = { finance: '科目余额', bank: '银行流水', invoice: '发票数据', erp: 'ERP 库存', payroll: '工资社保' };
  var KIND_T = { ar: '回款', order: '订单', recur: '预计', ap: '应付', fixed: '固定', loan: '贷款', other: '其他' };
  var KIND_C = { ar: 'ok', order: 'ok', recur: 'watch', ap: 'late', fixed: 'risk', loan: 'handled', other: 'accent' };
  var M = { step: 'connect', arche: null, data: null, R: null, co: null, rule: null, risk: null, week: null, charged: false, name: null, company: null, frame: null, who: 0, replay: null, told: null, tb: null };

  function anim() { return window.DGG.anim; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function sectorOf(slug) { var hit = null; (DATA.industries.sectors || []).forEach(function (s) { (s.industries || []).forEach(function (i) { if (i.slug === slug) hit = s.key; }); }); return hit; }
  function archeOf(slug) { var sec = sectorOf(slug); var a = (sec && DATA.m10.archetypes.map[sec]) || 'make'; if (a === 'project') a = 'service'; return DATA.m6.samples[a] ? a : 'make'; }
  function loadArche(a) {
    M.arche = a;
    var base = K.ensure(DATA.m6.samples[a]);
    if (M.name) base.company = M.name;
    if (M.company && M.company.systems) {
      var sys = M.company.systems;
      base.sources.forEach(function (s) { if (s.id === 'finance') s.mode = sys.indexOf('finance') >= 0 ? 'direct' : 'import'; if (s.id === 'erp') s.mode = sys.indexOf('erp') >= 0 ? 'direct' : 'import'; });
    }
    M.data = base; M.rule = null; M.risk = null; M.week = null; M.tb = null;
    recompute();
  }
  function recompute() { M.R = K.run(M.data, LIB); M.co = K.cashOptions(M.data, LIB); }
  function commit(data, msg) { M.data = data; recompute(); draw(); if (msg && M.frame) P.toast(M.frame.body, msg); }
  function fmtN(n) { return P.fmtN(n); }
  /* 六屏只用 U+2212 一种减号：K.fmtW 与 anim.count 的默认实现都走 ASCII 短横，这里统一换成长横 */
  function neg(s) { return String(s).replace(/-/g, '−'); }
  /* 整段文本里只换负号，不碰 2026-09-17、K-017、SO-2607 这类带短横的编号与日期 */
  function negText(s) { return String(s == null ? '' : s).replace(/(^|[^0-9A-Za-z])-(?=[0-9.])/g, '$1−'); }
  /* 共用件画的坐标轴文字仍走 ASCII 负号，挂到屏上之后统一刷一遍 */
  function negSvg(root) {
    if (!root) return;
    Array.prototype.forEach.call(root.querySelectorAll('svg text'), function (t) {
      var a = t.textContent;
      if (a.indexOf('-') < 0) return;
      var b = negText(a);
      if (b !== a) t.textContent = b;
    });
  }
  function W(n) { return neg(K.fmtW(n)); }
  function cut(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n) + '…' : s; }

  /* ---------- 动画件 ---------- */
  function cnt(to, o) {
    o = o || {};
    var dec = o.dec || 0;
    return h('b', { class: 'm6-cnt num', 'data-to': String(to), 'data-dec': String(dec), 'data-suf': o.suf || '' }, [dec ? (0).toFixed(dec) : '0']);
  }
  /* 金额 KPI：单位单独一格，窄卡片里不会把「万元」折到第二行 */
  function amt(node, unit) { return h('span', { class: 'm6-amt' }, [node, h('span', { class: 'u' }, [unit])]); }
  function cw(n) { return Math.abs(n) >= 10000 ? amt(cnt(Math.round(n / 1000) / 10, { dec: 1 }), '万元') : amt(cnt(Math.round(n)), '元'); }
  function runCounts(scope, ms) {
    if (!scope) return;
    var A = anim();
    Array.prototype.forEach.call(scope.querySelectorAll('.m6-cnt'), function (e) {
      var dec = +e.getAttribute('data-dec') || 0;
      A.count(e, parseFloat(e.getAttribute('data-to')) || 0, { decimals: dec, unit: e.getAttribute('data-suf') || '', ms: ms || 900, fmt: function (v) { return neg(A.fmt(v, dec)); } });
    });
  }
  function vd(text) { return h('div', { class: 'm6-say off' }, [h('span', { class: 'ic' }, ['AI']), h('b', {}, [text])]); }
  function grid() { return h('div', { class: 'pd-grid m6-g' }); }
  function flowBar(o) {
    var srcWrap = h('div', { class: 'src' }, o.src.map(function (s) { return h('div', { class: 's' }, [h('b', {}, [s[0]]), h('span', {}, [s[1]])]); }));
    var hub = h('div', { class: 'hub' }, [h('span', { class: 'an-live' }), h('b', {}, [o.hub])]);
    var out = h('div', { class: 'out' }, [h('b', {}, [o.out[0]]), h('span', {}, [o.out[1]])]);
    var el = h('div', { class: 'c12 m6-flow' }, [srcWrap, h('span', { class: 'pipe an-pipe' }), hub, h('span', { class: 'pipe an-pipe' }), out, h('span', { class: 'sp' }),
      P.btn(o.btn, { cls: 'sm', onClick: function () { if (M.replay) M.replay(); } })]);
    el.srcWrap = srcWrap; el.hub = hub; el.out = out;
    el.srcs = Array.prototype.slice.call(srcWrap.children);
    return el;
  }
  /* 三拍：接入 0–0.8s · 展开 0.8–2.2s · 结论 2.2–2.9s
     进屏走全程；屏内点一下（选行、执行动作）只走后两拍的短版，免得反复重放 */
  function story(o) {
    function run(full) {
      var A = anim(), t0 = full ? 840 : 0, tv = full ? 2260 : 700;
      A.stopAll();
      var rises = (o.rise || []).filter(Boolean);
      rises.forEach(function (n) { n.style.opacity = '0'; });
      if (o.verdict) { o.verdict.classList.add('off'); o.verdict.classList.remove('an-verdict'); }
      if (o.paths && o.paths.length) A.drawSvg(o.paths, full ? 940 : 620, t0 + 40);
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
        if (rises.length) A.rise(rises, { stagger: full ? 75 : 34, ms: full ? 460 : 340 });
      });
      T.at(tv, function () {
        if (o.verdict) { o.verdict.classList.remove('off'); o.verdict.classList.add('an-verdict'); }
        if (o.focus) A.pulse(o.focus, { ms: 1300, scroll: false });
      });
      T.play();
    }
    negSvg(o.work);
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
    setTimeout(function () { var el = rowOf(workEl(), txt); if (el) anim().pulse(el, { ms: 2200, scroll: true }); }, ms || 80);
  }

  /* ---------- 取数小工具 ---------- */
  function lastBS() { var st = M.R.statements; return st.bs[st.bs.length - 1]; }
  function lastPL() { var st = M.R.statements; return st.pl[st.pl.length - 1]; }
  function lastCF() { var st = M.R.statements; return st.cf[st.cf.length - 1]; }
  function badRows() { return M.R.reconcile.rows.filter(function (r) { return r.status === 'bad'; }); }
  function topRisk() { return M.R.risks.rows[0]; }
  function curRule() {
    var rec = M.R.reconcile;
    if (!M.rule || !rec.rows.filter(function (r) { return r.id === M.rule; }).length) { var b = badRows()[0]; M.rule = b ? b.id : rec.rows[0].id; }
    return rec.rows.filter(function (r) { return r.id === M.rule; })[0];
  }
  function curRisk() {
    var rk = M.R.risks;
    if (!M.risk || !rk.rows.filter(function (r) { return r.id === M.risk; }).length) M.risk = rk.rows[0].id;
    return rk.rows.filter(function (r) { return r.id === M.risk; })[0];
  }
  function curWeek() {
    var f = M.R.forecast;
    if (M.week == null || M.week >= f.weeks.length) M.week = f.gapWeeks.length ? f.gapWeeks[0] : f.minWeek;
    return f.weeks[M.week];
  }
  function rv(r) { return r.unit === '元' ? W(r.value) : neg(r.value) + r.unit; }
  function rband(r) { return r.unit === '元' ? W(r.band[0]) + ' – ' + W(r.band[1]) : neg(r.band[0]) + '–' + neg(r.band[1]) + r.unit; }
  function gapText() {
    var f = M.R.forecast;
    return f.gap ? '第 ' + (f.minWeek + 1) + ' 周现金 ' + W(f.minEnding) + '，低于安全线 ' + W(f.gap) : '13 周低点 ' + W(f.minEnding) + '，在安全线以上';
  }
  /* 勾稽屏的结论横幅：说的永远是当前选中的那一条，和焦点卡、脉冲对得上 */
  function reconSay(row, rec) {
    var tail = '；本期 ' + rec.counts.bad + ' 处异常。';
    if (row.status === 'na') return row.id + ' ' + row.name + '：本企业无此科目' + tail;
    var head = row.id + ' ' + row.name + '：差 ' + W(Math.abs(row.diff));
    if (row.fixed) return head + '，已生成调整分录、落回容差内' + tail;
    if (row.status === 'bad') return head + '，超出容差 ' + fmtN(row.tol) + ' 元' + tail;
    return head + '，在容差 ' + fmtN(row.tol) + ' 元内' + tail;
  }

  /* ---------- 生命周期 ---------- */
  function mount(root, step, shell) {
    sh = shell; $root = root; h = sh.h; DATA = sh.DATA; P = window.DGG.pui; K = window.DGG.coreM6;
    LIB = { rules: DATA.m6.rules, riskRules: DATA.m6.riskRules, benchmarks: DATA.m6.benchmarks, policies: DATA.m6.policies };
    P.init(sh);
    var c = sh.getCompany();
    if (!M.data) { M.company = c; M.name = c ? c.name : null; loadArche(c ? archeOf(c.industry) : archeOf(sh.displayIndustryDefault())); }
    M.step = step || 'connect';
    if (['connect', 'board', 'recon', 'risk', 'cash', 'policy'].indexOf(M.step) < 0) M.step = 'connect';
    draw();
  }
  function unmount() { M.replay = null; }
  function onCompany(c) { M.company = c; M.name = c ? c.name : null; M.charged = false; loadArche(c ? archeOf(c.industry) : archeOf(sh.displayIndustryDefault())); if (M.step !== 'connect') setStep('connect'); else draw(); }
  function onIndustry(slug) { if (M.step !== 'connect' || !slug) return; var a = archeOf(slug); if (a !== M.arche) { loadArche(a); draw(); } }
  function setStep(s) { M.step = s; sh.go('m6', s); }

  /* ---------- 框架 ---------- */
  function draw() {
    sh.clear($root);
    M.replay = null;
    var R = M.R, c = M.company;
    var meta = c ? [sh.industryNameOf(c.industry), sh.optText('size', c.size)].filter(Boolean).join(' · ') : M.data.period.replace('-', ' 年 ') + ' 月账';
    var tabs = [
      { key: 'connect', label: '接入' }, { key: 'board', label: '财务驾驶舱' }, { key: 'recon', label: '三表勾稽', badge: R.reconcile.counts.bad || 0 },
      { key: 'risk', label: '风险预警', badge: R.risks.counts.high || 0 }, { key: 'cash', label: '现金预测', badge: R.forecast.gap > 0 ? '缺' : 0 }, { key: 'policy', label: '政策与月报' }
    ];
    var F = P.frame({ mark: 'CFO', accent: ACCENT, modules: P.navModules('m6'),
      crumbs: ['AI CFO', tabs.filter(function (t) { return t.key === M.step; })[0].label], company: { name: M.data.company, meta: meta },
      tabs: tabs, active: M.step, chat: { id: 'm6', name: 'AI CFO', step: M.step, onGo: setStep },
      onTab: function (key) { if (key === 'board' && !M.charged) enterBoard(); else setStep(key); } });
    M.frame = F; $root.appendChild(F.root);
    if (M.step === 'board' && !M.charged) { M.charged = true; sh.charge(K.CREDITS); }
    ({ connect: screenConnect, board: screenBoard, recon: screenRecon, risk: screenRisk, cash: screenCash, policy: screenPolicy })[M.step](F.work);
  }
  function enterBoard() { setStep('board'); }
  function col(cls, kids) { return h('div', { class: cls, style: 'display:flex;flex-direction:column;gap:16px' }, kids); }
  function srcChips(n) {
    var d = M.data;
    return d.sources.slice(0, n || 5).map(function (s) { return [SRC[s.id] || s.name, fmtN(s.rows) + ' 条']; });
  }

  /* ---------- 屏 1：接入 ---------- */
  function screenConnect(work) {
    var d = M.data, R = M.R, rec = R.reconcile, m = rec.metrics;
    work.classList.add('m6-connect');
    var g = grid();
    var F = flowBar({ src: srcChips(5), hub: 'AI CFO', out: ['已开通 4 项', '勾稽 ' + LIB.rules.rules.length + ' 条 · 政策 ' + LIB.policies.policies.length + ' 项'], btn: '重新同步' });
    g.appendChild(F);
    var nameIn = h('input', { type: 'text', value: d.company, oninput: function (e) { M.name = e.target.value; d.company = e.target.value; var co = M.frame.root.querySelector('.pd-top .co span:nth-child(2)'); if (co) co.textContent = e.target.value; } });
    var cCo = P.card({ cls: 'c4', title: '企业', body: [h('div', { class: 'pd-form' }, [
      h('div', { class: 'pd-field' }, [h('label', {}, ['企业名称']), nameIn]),
      h('div', { class: 'pd-field' }, [h('label', {}, ['行业']), h('div', { style: 'font-weight:600' }, [M.company ? sh.industryNameOf(M.company.industry) + (M.company.size ? ' · ' + sh.optText('size', M.company.size) : '') : sh.industryNameOf(sh.displayIndustryDefault())])]),
      h('div', { class: 'pd-field' }, [h('label', {}, ['账期']), h('div', { style: 'font-weight:600' }, [d.period.replace('-', ' 年 ') + ' 月 · 近 12 期'])]),
      h('div', { class: 'pd-field' }, [h('label', {}, ['纳税身份']), h('div', { style: 'font-weight:600' }, ['一般纳税人 · 增值税 ' + Math.round(d.vatRate * 100) + '% · 所得税 ' + Math.round(d.citRate * 100) + '%'])])
    ])] });
    g.appendChild(cCo);
    var srcs = h('div');
    d.sources.forEach(function (s) { srcs.appendChild(h('div', { class: 'src-row' }, [h('div', {}, [h('div', { class: 't' }, [s.name]), h('div', { class: 's' }, [s.lastSync + ' · ' + fmtN(s.rows) + ' 条'])]), P.chip(s.mode === 'direct' ? 'ok' : 'watch', s.mode === 'direct' ? '系统直连' : '表格导入'), h('span', { class: 'pd-dot ' + (s.mode === 'direct' ? 'ok' : 'risk') })])); });
    var cSrc = P.card({ cls: 'c4', title: '账套来源', sub: d.sources.length + ' 个', body: [srcs] });
    g.appendChild(cSrc);
    var caps = h('div');
    CAPS.forEach(function (c, i) { caps.appendChild(h('div', { class: 'cap-row' }, [h('span', { class: 'ic' }, ['0' + (i + 1)]), h('div', {}, [h('div', { class: 't' }, [c[0]]), h('div', { class: 's' }, [c[1]])]), P.chip('ok', '已开通')])); });
    var cCap = P.card({ cls: 'c4', title: '已开通能力', sub: '4 项', body: [caps] });
    g.appendChild(cCap);
    var dif = m.bankBalance - m.cashLedger;
    var say = vd('银行对账单 ' + W(m.bankBalance) + '，账面货币资金 ' + W(m.cashLedger) + '，差 ' + W(Math.abs(dif)) + '。');
    g.appendChild(h('div', { class: 'c12' }, [say]));
    g.appendChild(h('div', { class: 'c12 go' }, [
      h('div', {}, [h('div', { class: 't' }, ['财务驾驶舱']), h('div', { class: 's' }, ['本期收入 ' + W(R.kpi.rev) + ' · 勾稽异常 ' + rec.counts.bad + ' 处 · 高风险 ' + R.risks.counts.high + ' 项 · ' + gapText()])]),
      h('div', { class: 'sp' }), h('div', { class: 'cr' }, [h('b', { class: 'num' }, [String(K.CREDITS)]), ' 积分 / 次']),
      P.btn('进入财务驾驶舱', { cls: 'primary big', onClick: enterBoard })
    ]));
    work.appendChild(g);
    var rows = Array.prototype.slice.call(srcs.children);
    story({ work: work, src: F.srcs, from: F.srcWrap, to: F.hub, label: fmtN(d.sources.reduce(function (t, s) { return t + s.rows; }, 0)) + ' 条',
      rise: [cCo, cSrc, cCap].concat(rows), verdict: say, focus: rows[1] });
  }

  /* ---------- 屏 2：驾驶舱 ---------- */
  function screenBoard(work) {
    var R = M.R, k = R.kpi, st = R.statements, d = M.data, rec = R.reconcile, rk = R.risks, f = R.forecast, po = R.policies;
    work.classList.add('m6-board');
    var g = grid();
    var F = flowBar({ src: srcChips(4), hub: '财务驾驶舱', out: ['勾稽异常 ' + rec.counts.bad + ' 处', '高风险 ' + rk.counts.high + ' 项'], btn: '刷新看板' });
    g.appendChild(F);
    g.appendChild(h('div', { class: 'c12' }, [P.kpis([
      { label: '本期收入', value: cw(k.rev), sub: '环比 ' + (k.revMoM >= 0 ? '+' : '') + neg(k.revMoM) + '%', tone: k.revMoM < 0 ? 'risk' : 'ok' },
      { label: '毛利率', value: cnt(k.gm, { dec: 1 }), unit: '%', sub: '上期 ' + k.gmPrev + '%', tone: k.gm < k.gmPrev ? 'risk' : 'ok' },
      { label: '经营现金流', value: cw(k.cfo), tone: k.cfo < 0 ? 'late' : 'ok', sub: '净利润 ' + W(k.netProfit) },
      { label: '账户余额', value: cw(k.cash), sub: '可用 ' + k.cashMonths + ' 个月刚性支出', tone: k.cashMonths < 1 ? 'late' : k.cashMonths < 3 ? 'risk' : 'ok' },
      { label: '勾稽异常', value: cnt(k.anomaliesBad), unit: '处', sub: '已调整 ' + k.fixed + ' 笔', tone: k.anomaliesBad ? 'late' : 'ok', onClick: function () { setStep('recon'); } },
      { label: '政策可享', value: cw(k.policyAmount), sub: k.policyOk + ' 项 · 预计', tone: 'accent', onClick: function () { setStep('policy'); } }
    ])]));
    var say = vd(gapText() + '；勾稽异常 ' + rec.counts.bad + ' 处，高风险 ' + rk.counts.high + ' 项。');
    g.appendChild(h('div', { class: 'c12' }, [say]));
    var labels = st.pl.map(function (p) { return p.label; });
    var lc = P.lineChart({ labels: labels, right: true, series: [
      { name: '收入', values: st.pl.map(function (p) { return Math.round(p.rev / 10000); }), color: '#0E9F6E', bar: true },
      { name: '毛利率', values: st.pl.map(function (p) { return Math.round(p.gm * 1000) / 10; }), color: '#E8862B', right: true, fmt: function (v) { return neg(v) + '%'; } }
    ] });
    var cTrend = P.card({ cls: 'c8', title: '收入与毛利率', sub: '近 12 期 · 收入柱（万元）· 毛利率线（%）', body: [lc] });
    g.appendChild(cTrend);
    var rl = h('div', { class: 'pd-list' });
    rk.rows.filter(function (r) { return r.level !== 'low'; }).slice(0, 4).forEach(function (r) { rl.appendChild(P.item({ tone: LEVEL[r.level][0], icon: LEVEL[r.level][1], title: r.name, sub: '指标 ' + rv(r) + ' · 参考 ' + rband(r), right: W(r.impact), rightSub: '概率 ' + Math.round(r.prob * 100) + '%', onClick: function () { M.risk = r.id; setStep('risk'); } })); });
    if (!rl.children.length) rl.appendChild(P.empty('无中高风险'));
    var cRisk = P.card({ cls: 'c4', title: '风险榜', sub: '高 ' + rk.counts.high + ' · 中 ' + rk.counts.mid + ' · 已处置 ' + rk.counts.handled, body: [rl], extra: [P.btn('矩阵', { cls: 'sm', onClick: function () { setStep('risk'); } })] });
    g.appendChild(cRisk);
    var cc = P.cashChart({ weeks: f.weeks, opening: f.opening, safety: f.safety, minWeek: f.minWeek, height: 220, onWeek: function (i) { M.week = i; setStep('cash'); } });
    var cCash = P.card({ cls: 'c8', title: '13 周现金', sub: '期初 ' + W(f.opening) + ' · ' + gapText(), body: [cc], foot: [P.btn('看补缺方案', { cls: 'sm', onClick: function () { setStep('cash'); } })] });
    g.appendChild(cCash);
    var list = h('div', { class: 'pd-list' });
    badRows().slice(0, 4).forEach(function (r) { list.appendChild(P.item({ tone: 'late', icon: r.id, title: r.name, sub: r.pair, right: W(Math.abs(r.diff)), rightSub: '差异', onClick: function () { M.rule = r.id; setStep('recon'); } })); });
    if (!badRows().length) list.appendChild(P.empty(LIB.rules.rules.length + ' 条勾稽关系全部正常'));
    var cRec = P.card({ cls: 'c4', title: '三表勾稽', sub: rec.counts.ok + ' 正常 · ' + rec.counts.bad + ' 异常 · 已调整 ' + rec.counts.fixed, body: [list], extra: [P.btn('全部', { cls: 'sm', onClick: function () { setStep('recon'); } })] });
    g.appendChild(cRec);
    if (d.log.length) g.appendChild(P.card({ cls: 'c12', title: '本期处置', sub: d.log.length + ' 条', body: [logList(d.log.slice(-4).reverse())] }));
    work.appendChild(g);
    story({ work: work, src: F.srcs, from: F.srcWrap, to: F.hub, label: W(k.rev),
      rise: [cTrend, cRisk, cCash, cRec].concat(Array.prototype.slice.call(rl.children)).concat(Array.prototype.slice.call(list.children)),
      paths: nodes(work, '.pd-line path').concat(nodes(work, '.pd-cash path')),
      verdict: say, focus: work.querySelectorAll('.pd-kpi')[3], scan: cc });
  }
  function logList(log) {
    var el = h('div', { class: 'm6-log' });
    log.forEach(function (l) { el.appendChild(h('div', { class: 'l' }, [h('span', { class: 'n' }, [String(l.seq)]), h('b', {}, [l.label]), h('span', {}, [negText(cut(l.detail, 46)) + (l.amount ? ' · ' + fmtN(l.amount) + ' 元' : '')])])); });
    return el;
  }

  /* ---------- 屏 3：三表勾稽 ---------- */
  function stmtMap() {
    var S = P.svg, st = M.R.statements, rec = M.R.reconcile;
    var p = lastPL(), b = lastBS(), c = lastCF();
    var W0 = 640, H0 = 176;
    var s = S('svg', { class: 'm6-map', viewBox: '0 0 ' + W0 + ' ' + H0, preserveAspectRatio: 'xMinYMin meet' });
    var box = [
      { x: 8, t: '利润表', k: '净利润', v: p.netProfit, key: '利润表' },
      { x: 228, t: '资产负债表', k: '资产总计', v: b.assets, key: '资产负债表' },
      { x: 448, t: '现金流量表', k: '经营现金流', v: c.cfo, key: '现金流量表' }
    ];
    var bw = 184, bh = 84, by = 18;
    s.appendChild(S('path', { d: 'M192 60 L228 60', fill: 'none', stroke: 'var(--pa)', 'stroke-width': 2, 'marker-end': '' }));
    s.appendChild(S('path', { d: 'M412 60 L448 60', fill: 'none', stroke: 'var(--pa)', 'stroke-width': 2 }));
    s.appendChild(S('path', { d: 'M540 102 C540 150 100 150 100 102', fill: 'none', stroke: 'var(--pa)', 'stroke-width': 2, 'stroke-dasharray': '' }));
    box.forEach(function (o) {
      var n = rec.rows.filter(function (r) { return r.pair.indexOf(o.key) >= 0 && r.status === 'bad'; }).length;
      var tone = n ? '#D9483B' : '#22A06B';
      s.appendChild(S('rect', { x: o.x, y: by, width: bw, height: bh, rx: 12, fill: '#fff', stroke: tone, 'stroke-width': 2 }));
      s.appendChild(S('text', { x: o.x + 14, y: by + 24, class: 'bt' }, [o.t]));
      s.appendChild(S('text', { x: o.x + bw - 14, y: by + 24, 'text-anchor': 'end', class: 'bn', fill: tone }, [n ? n + ' 处异常' : '正常']));
      s.appendChild(S('text', { x: o.x + 14, y: by + 50, class: 'bk' }, [o.k]));
      s.appendChild(S('text', { x: o.x + 14, y: by + 72, class: 'bv m6-cnt', 'data-to': String(Math.round(o.v / 1000) / 10), 'data-dec': '1', 'data-suf': ' 万元' }, ['0.0']));
    });
    s.appendChild(S('text', { x: 210, y: 50, 'text-anchor': 'middle', class: 'el' }, ['R02']));
    s.appendChild(S('text', { x: 430, y: 50, 'text-anchor': 'middle', class: 'el' }, ['R14']));
    s.appendChild(S('text', { x: 320, y: 158, 'text-anchor': 'middle', class: 'el' }, ['R06 · 间接法 ↔ 直接法']));
    return s;
  }
  function screenRecon(work) {
    var R = M.R, rec = R.reconcile, d = M.data;
    work.classList.add('m6-recon');
    var row = curRule();
    var g = grid();
    var F = flowBar({ src: [['账面', fmtN(d.sources[0].rows) + ' 条'], ['银行流水', fmtN(d.sources[1].rows) + ' 条'], ['发票数据', fmtN(d.sources[2].rows) + ' 条'], ['ERP · 台账', fmtN(d.sources[3].rows) + ' 条']], hub: '勾稽引擎 · ' + rec.rows.length + ' 条', out: ['异常 ' + rec.counts.bad + ' 处', '已调整 ' + rec.counts.fixed + ' 笔'], btn: '重新勾稽' });
    g.appendChild(F);
    g.appendChild(h('div', { class: 'c12' }, [P.kpis([
      { label: '勾稽关系', value: cnt(rec.rows.length), unit: '条' },
      { label: '正常', value: cnt(rec.counts.ok), unit: '条', tone: 'ok' },
      { label: '异常', value: cnt(rec.counts.bad), unit: '条', tone: rec.counts.bad ? 'late' : 'ok' },
      { label: '已调整', value: cnt(rec.counts.fixed), unit: '笔', tone: 'accent' },
      { label: '资产总计', value: cw(rec.metrics.assets), sub: '负债 ' + W(rec.metrics.liabilities) + ' · 权益 ' + W(rec.metrics.equity) }
    ])]));
    var bads = badRows();
    var say = vd(reconSay(row, rec));
    g.appendChild(h('div', { class: 'c12' }, [say]));
    var tbl = P.table({ cols: [
      { key: 'id', label: '编号', render: function (r) { return h('b', { class: 'id' }, [r.id]); } },
      { key: 'name', label: '勾稽关系', cls: 'm6-rl', render: function (r) { return h('span', {}, [h('b', {}, [r.name]), h('span', { class: 'sub' }, [r.pair])]); } },
      { key: 'diff', label: '差异', align: 'r', sort: function (r) { return Math.abs(r.diff); }, sortDesc: true, render: function (r) { return r.status === 'na' ? '—' : h('span', { class: r.status === 'bad' ? 'neg' : '' }, [fmtN(r.diff)]); } },
      { key: 'status', label: '判断', sort: function (r) { return { bad: 0, warn: 1, ok: 2, na: 3 }[r.status]; }, render: function (r) { return h('span', {}, [P.chip(STAT[r.status][0], STAT[r.status][1]), r.fixed ? P.chip('handled', '已调整') : null]); } }
    ], rows: rec.rows, sortKey: 'status', rowKey: function (r) { return r.id; }, activeKey: M.rule, onRow: function (r) { M.rule = r.id; draw(); } });
    var cTbl = P.card({ title: '勾稽关系', sub: rec.rows.length + ' 条', tight: true, body: [h('div', { class: 'pd-scroll m6-sc', style: 'max-height:296px' }, [tbl])] });
    /* 三表关系图放在左栏第一张：1920×1080 不滚动也看得全，两条直连箭头与回流弧线的第三拍不落在折线以下 */
    var cMap = P.card({ title: '三表关系', sub: d.period.replace('-', ' 年 ') + ' 月', body: [stmtMap()] });
    g.appendChild(col('c6', [cMap, cTbl]));
    var right = col('c6', []);
    var facts = h('div', { class: 'pd-kv' }, [
      h('span', { class: 'k' }, [row.lhsLabel || '本期数']), h('span', { class: 'v num' }, [row.status === 'na' ? '—' : fmtN(row.lhs) + ' 元']),
      h('span', { class: 'k' }, [row.rhsLabel || '勾稽值']), h('span', { class: 'v num' }, [row.status === 'na' ? '—' : fmtN(row.rhs) + ' 元']),
      h('span', { class: 'k' }, ['差异 / 容差']), h('span', { class: 'v num ' + (row.status === 'bad' ? 'neg' : '') }, [row.status === 'na' ? '—' : fmtN(row.diff) + ' / ' + fmtN(row.tol) + ' 元'])
    ]);
    var drillEl = null, drillRows = [];
    if (row.drill && row.drill.type === 'table') {
      var dcols = row.drill.cols.slice(0, 6);
      drillEl = P.table({ compact: true, cols: dcols.map(function (c, i) { return { key: 'c' + i, label: c, align: /金额|差异|原值|月折旧|本金|ERP|账面/.test(c) ? 'r' : '' }; }), rows: row.drill.rows.map(function (r) { var o = {}; r.forEach(function (v, i) { o['c' + i] = v; }); return o; }) });
      drillRows = trs(drillEl);
    } else if (row.drill) drillEl = P.kv(row.drill.rows);
    var actEl = h('div', { class: 'pd-actions' });
    if (row.fixed) { var adj = d.adjustments.filter(function (a) { return a.rule === row.id; })[0]; actEl.appendChild(h('div', { class: 'pd-action' }, [h('div', { class: 't' }, [h('span', { class: 'rank' }, ['✓']), adj.label]), h('span', { class: 'done' }, ['已执行']), h('div', { class: 'd' }, [adj.entry.map(function (e) { return e.join(' '); }).join('；')])])); }
    else if (row.fix) actEl.appendChild(h('div', { class: 'pd-action best' }, [h('div', { class: 't' }, [h('span', { class: 'rank' }, ['1']), row.fix.label, h('span', { style: 'color:var(--pd-sub);font-weight:500' }, ['· ' + fmtN(row.fix.amount) + ' 元'])]), P.btn('按建议调整', { cls: 'primary sm', onClick: function () { doFix(row.id); } }), h('div', { class: 'd' }, [h('div', { class: 'm6-entry' }, row.fix.entry.map(function (e) { return h('div', {}, [h('span', { class: e[0] === '借' ? 'dr' : 'cr' }, [e[0]]), h('span', {}, [e[1]]), h('b', { class: 'num' }, [e[2]])]); }))])]));
    else if (row.status === 'bad' || row.status === 'warn') actEl.appendChild(h('div', { class: 'pd-action' }, [h('div', { class: 't' }, [h('span', { class: 'rank' }, ['1']), '核实原始凭证']), h('span'), h('div', { class: 'd' }, ['差异在容差之外'])]));
    else actEl.appendChild(P.empty('无需处理'));
    var tone = row.status === 'bad' ? 'late' : row.status === 'warn' ? 'risk' : row.status === 'na' ? 'done' : 'ok';
    var cFocus = P.card({ title: row.id + ' ' + row.name, sub: row.pair, accent: true, body: [facts,
      drillEl ? h('div', { style: 'margin-top:12px' }, [h('div', { class: 'm6-sub' }, [row.drill.title]), h('div', { class: 'pd-scroll m6-sc', style: 'max-height:196px' }, [drillEl])]) : null,
      P.judge({ verdict: { tone: tone, chip: STAT[row.status][1], text: row.status === 'na' ? '本企业无此科目' : row.explain }, actionsEl: actEl, actionsTitle: '建议动作' })] });
    right.appendChild(cFocus);
    g.appendChild(right);
    var cTb = null;
    if (M.tb) {
      var tb = M.tb;
      var tbTbl = P.table({ compact: true, cols: [
        { key: 'name', label: '科目' }, { key: 'doc', label: '导入期末', align: 'r', render: function (r) { return fmtN(r.doc); } },
        { key: 'book', label: '账面', align: 'r', render: function (r) { return fmtN(r.book); } },
        { key: 'diff', label: '差异', align: 'r', render: function (r) { return h('span', { class: Math.abs(r.diff) > 1 ? 'neg' : '' }, [fmtN(r.diff)]); } }
      ], rows: tb.rows });
      cTb = P.card({ cls: 'c12', title: '导入科目余额', sub: tb.name + ' · ' + tb.rows.length + ' 个科目 · 逐行借贷 ' + (tb.balanced ? '平' : '不平'), tight: true, body: [tbTbl] });
      g.appendChild(cTb);
    }
    work.appendChild(g);
    story({ work: work, src: F.srcs, from: F.srcWrap, to: F.hub, label: rec.rows.length + ' 条关系',
      rise: [cMap, cTbl, cFocus, cTb], rows: trs(tbl).concat(drillRows).concat(cTb ? trs(cTb) : []),
      paths: nodes(work, '.m6-map path'), verdict: say, focus: rowOf(work, row.id), scan: cFocus });
  }
  function doFix(id) {
    var row = M.R.reconcile.rows.filter(function (r) { return r.id === id; })[0];
    if (!row || !row.fix) return;
    commit(K.applyFix(M.data, id, LIB), '已生成调整分录：' + row.fix.label + ' ' + fmtN(row.fix.amount) + ' 元，待会计复核 · 三表已重算');
    refocus(id, 120);
  }

  /* ---------- 屏 4：风险预警 ---------- */
  function screenRisk(work) {
    var R = M.R, rk = R.risks, d = M.data;
    work.classList.add('m6-risk');
    var row = curRisk();
    var g = grid();
    var F = flowBar({ src: [['应收台账', rk.aging.length + ' 笔'], ['应付台账', d.cash.apItems.length + ' 笔'], ['借款合同', d.external.loans.length + ' 笔'], ['工资社保', d.external.payroll.headcount + ' 人']], hub: '风险规则 ' + rk.rows.length + ' 条', out: ['高 ' + rk.counts.high + ' · 中 ' + rk.counts.mid, '已处置 ' + rk.counts.handled + ' 项'], btn: '重新评估' });
    g.appendChild(F);
    g.appendChild(h('div', { class: 'c12' }, [P.kpis([
      { label: '高风险', value: cnt(rk.counts.high), unit: '项', tone: rk.counts.high ? 'late' : 'ok' },
      { label: '中风险', value: cnt(rk.counts.mid), unit: '项', tone: 'risk' },
      { label: '已处置', value: cnt(rk.counts.handled), unit: '项', tone: 'accent' },
      { label: '应收逾期', value: cw(rk.arOverdue), sub: '90 天以上 ' + W(rk.arOverdue90), tone: 'risk' },
      { label: '现金可用', value: cnt(rk.cashMonths, { dec: 1 }), unit: '月', sub: '月均刚性支出 ' + W(rk.fixedOut), tone: rk.cashMonths < 1 ? 'late' : rk.cashMonths < 3 ? 'risk' : 'ok' }
    ])]));
    /* 横幅说的就是当前选中的这条，和矩阵 / 焦点卡的脉冲永远落在同一行 */
    var say = vd(row.id + ' ' + row.name + '：概率 ' + Math.round(row.prob * 100) + '%，影响 ' + W(row.impact) + '，指标 ' + rv(row) + '（参考 ' + rband(row) + '）' + (row.handled.length ? '，已处置 ' + row.handled.length + ' 项。' : '。'));
    g.appendChild(h('div', { class: 'c12' }, [say]));
    var tbl = P.table({ cols: [
      { key: 'name', label: '风险', cls: 'm6-rl', render: function (r) { return h('span', {}, [h('b', {}, [r.id + ' ' + r.name]), h('span', { class: 'sub' }, [r.handled.length ? '已处置 · ' + r.cat : r.cat])]); } },
      { key: 'value', label: '指标', align: 'r', render: function (r) { return h('span', {}, [h('b', { class: r.inBand ? '' : 'neg' }, [rv(r)]), h('span', { class: 'sub' }, ['参考 ' + rband(r)])]); } },
      { key: 'prob', label: '概率', align: 'r', sort: true, sortDesc: true, render: function (r) { return P.bar(r.prob * 100, r.level === 'high' ? 'late' : r.level === 'mid' ? 'risk' : 'ok', Math.round(r.prob * 100) + '%'); } },
      { key: 'impact', label: '影响', align: 'r', sort: true, render: function (r) { return W(r.impact); } },
      { key: 'level', label: '等级', sort: function (r) { return { high: 0, mid: 1, low: 2 }[r.level]; }, render: function (r) { return P.chip(LEVEL[r.level][0], LEVEL[r.level][1]); } }
    ], rows: rk.rows, rowKey: function (r) { return r.id; }, activeKey: M.risk, onRow: function (r) { M.risk = r.id; draw(); } });
    /* 清单排在矩阵之前：概率条长出来的那一拍在 1920×1080 上不滚动也看得见 */
    var cTbl = P.card({ cls: 'c12', title: '风险清单', sub: rk.rows.length + ' 条 · 按 概率 × 影响 排序', tight: true, body: [h('div', { class: 'pd-scroll m6-sc', style: 'max-height:200px' }, [tbl])] });
    g.appendChild(cTbl);
    var mx = P.matrix({ points: rk.rows.map(function (r) { return { id: r.id, short: r.id.replace('K', ''), label: r.name, prob: r.prob, impact: r.impact, level: r.level, handled: r.handled.length > 0, onClick: function () { M.risk = r.id; draw(); } }; }) });
    var cMx = P.card({ cls: 'c6', title: '风险矩阵', sub: '横轴概率 · 纵轴影响', body: [mx, h('div', { class: 'pd-legend', style: 'margin-top:8px' }, [h('span', {}, [h('i', { style: 'background:#D9483B' }), '高']), h('span', {}, [h('i', { style: 'background:#E8A33D' }), '中']), h('span', {}, [h('i', { style: 'background:#7C8799' }), '低']), h('span', {}, [h('i', { style: 'background:#fff;border:2px solid #E8A33D' }), '已处置'])])] });
    g.appendChild(cMx);
    var actEl = h('div', { class: 'pd-actions' });
    row.handled.forEach(function (a) { actEl.appendChild(h('div', { class: 'pd-action' }, [h('div', { class: 't' }, [h('span', { class: 'rank' }, ['✓']), a.label]), h('span', { class: 'done' }, ['已执行']), h('div', { class: 'd' }, [cut(a.detail, 40)])])); });
    row.actions.forEach(function (a, i) {
      if (row.handled.filter(function (x) { return x.key === a.key; }).length) return;
      var best = i === 0 && row.level !== 'low';
      actEl.appendChild(h('div', { class: 'pd-action' + (best ? ' best' : '') }, [h('div', { class: 't' }, [h('span', { class: 'rank' }, [String(i + 1)]), a.label]),
        P.btn(a.key === 'gotoCash' ? '去看' : '执行', { cls: best ? 'primary sm' : 'sm', onClick: function () { doRiskAct(row.id, a.key); } }),
        best ? h('div', { class: 'd' }, [cut(a.desc, 40)]) : null]));
    });
    var bandText = row.dir === 'high' ? '不高于 ' + (row.unit === '元' ? W(row.band[1]) : neg(row.band[1]) + row.unit) : '不低于 ' + (row.unit === '元' ? W(row.band[0]) : neg(row.band[0]) + row.unit);
    var cFocus = P.card({ title: row.id + ' ' + row.name, sub: row.cat, accent: true, body: [
      h('div', { class: 'm6-riskhead' }, [P.chip(LEVEL[row.level][0], LEVEL[row.level][1] + '风险'),
        h('span', { class: 'm' }, [h('b', { class: 'num' }, [rv(row)]), h('span', {}, [row.metricLabel + ' · 参考 ' + bandText])]),
        h('span', { class: 'm' }, [h('b', { class: 'num' }, [Math.round(row.prob * 100) + '%']), h('span', {}, ['发生概率'])]),
        h('span', { class: 'm' }, [h('b', { class: 'num' }, [W(row.impact)]), h('span', {}, ['影响 · ' + row.impactNote])])]),
      P.judge({ seen: row.evidence.slice(0, 3), actionsEl: actEl, actionsTitle: '处置动作' })
    ] });
    g.appendChild(col('c6', [cFocus]));
    work.appendChild(g);
    story({ work: work, src: F.srcs, from: F.srcWrap, to: F.hub, label: rk.rows.length + ' 条规则',
      rise: [cTbl, cMx, cFocus], rows: trs(tbl), bars: nodes(work, '.pd-bar .trk i'),
      verdict: say, focus: rowOf(work, row.id), scan: cFocus });
  }
  function doRiskAct(id, key) {
    var row = M.R.risks.rows.filter(function (r) { return r.id === id; })[0];
    if (!row) return;
    if (key === 'gotoCash') { M.week = null; setStep('cash'); return; }
    var a = row.actions.filter(function (x) { return x.key === key; })[0];
    commit(K.applyRiskAction(M.data, id, key, LIB), '已' + (a ? a.label : '处置') + ' · ' + row.name + '重新评估，现金预测与月报已更新');
    refocus(id, 120);
  }

  /* ---------- 屏 5：现金预测 ---------- */
  function screenCash(work) {
    var R = M.R, f = R.forecast, co = M.co, d = M.data, sc = d.cashScenario;
    work.classList.add('m6-cash');
    var wk = curWeek();
    var g = grid();
    var F = flowBar({ src: [['应收', d.cash.arItems.length + ' 笔'], ['在产订单', d.cash.orders.length + ' 张'], ['应付', d.cash.apItems.length + ' 笔'], ['固定支出 · 贷款', d.cash.fixed.length + ' 项']], hub: '13 周现金预测', out: [f.gap ? '缺口 ' + W(f.gap) : '无缺口周', '安全线 ' + W(f.safety)], btn: '重算 13 周' });
    g.appendChild(F);
    g.appendChild(h('div', { class: 'c12' }, [P.kpis([
      { label: '期初（银行余额）', value: cw(f.opening) },
      { label: '13 周低点', value: cw(f.minEnding), sub: '第 ' + (f.minWeek + 1) + ' 周 · ' + f.weeks[f.minWeek].label + ' 起', tone: f.minEnding < f.safety ? 'late' : 'ok' },
      { label: '低于安全线', value: cw(f.gap), sub: f.gapWeeks.length ? f.gapWeeks.length + ' 周缺口' : '无缺口周', tone: f.gap ? 'late' : 'ok' },
      { label: '流入合计', value: cnt(Math.round(f.inflow / 10000)), unit: '万元', tone: 'ok' },
      { label: '流出合计', value: cnt(Math.round(f.outflow / 10000)), unit: '万元', tone: 'risk' },
      { label: '13 周末', value: cw(f.ending), tone: f.ending < f.safety ? 'late' : 'ok' }
    ])]));
    var pick = co.options.filter(function (o) { return o.key === co.recommend; })[0];
    var say = vd(f.gap ? '第 ' + (f.minWeek + 1) + ' 周 ' + W(f.minEnding) + '，缺口 ' + W(f.gap) + '；方案 ' + pick.key + ' ' + pick.name + '把低点拉回 ' + W(pick.minEnding) + '。'
      : '13 周低点 ' + W(f.minEnding) + '（第 ' + (f.minWeek + 1) + ' 周），高于安全线 ' + W(f.minEnding - f.safety) + '。');
    g.appendChild(h('div', { class: 'c12' }, [say]));
    var toggles = [['collectAhead', '催收提前'], ['delayAP', '延付供应商'], ['rushOrder', '加急订单回款'], ['refinance', '短贷置换'], ['payCritical', '优先付关键供应商']];
    var tg = h('div', { class: 'pd-field' }, [h('label', {}, ['情景开关']), h('div', { class: 'chips' }, toggles.map(function (t) {
      return h('button', { class: sc[t[0]] ? 'on' : '', onclick: function () { toggleScenario(t[0]); } }, [t[1]]);
    }).concat([h('button', { class: sc.loanDraw ? 'on' : '', onclick: function () { toggleLoan(); } }, ['授信提款 100 万'])]))]);
    var cc = P.cashChart({ weeks: f.weeks, opening: f.opening, safety: f.safety, minWeek: f.minWeek, active: M.week, height: 200, onWeek: function (i) { M.week = i; draw(); } });
    var cChart = P.card({ cls: 'c8', title: '13 周现金日历', sub: '柱：周流入 / 流出 · 线：周末余额', body: [cc, h('div', { style: 'margin-top:12px' }, [tg])] });
    g.appendChild(cChart);
    var items = h('div', { class: 'm6-items' });
    wk.items.slice(0, 6).forEach(function (it) { items.appendChild(itemRow(it)); });
    var restWrap = h('div', { class: 'm6-items' });
    wk.items.slice(6).forEach(function (it) { restWrap.appendChild(itemRow(it)); });
    if (!wk.items.length) items.appendChild(P.empty('本周无收付'));
    var cWk = P.card({ cls: 'c4', title: '第 ' + (M.week + 1) + ' 周 · ' + wk.label + ' 起', sub: '期初 ' + W(wk.opening) + ' → 期末 ' + W(wk.ending),
      body: [h('div', { class: 'm6-wk' }, [
          h('span', {}, ['流入 ', h('b', { class: 'num', style: 'color:var(--t-ok)' }, [fmtN(wk.inflow) + ' 元'])]),
          h('span', {}, ['流出 ', h('b', { class: 'num', style: 'color:var(--t-late)' }, [fmtN(wk.outflow) + ' 元'])]),
          h('span', {}, ['净额 ', h('b', { class: 'num' }, [fmtN(wk.net) + ' 元'])])
        ]),
        items, wk.items.length > 6 ? h('div', { class: 'pd-scroll m6-sc', style: 'max-height:88px;margin-top:6px' }, [restWrap]) : null] });
    g.appendChild(cWk);
    var opts = co.options.map(function (o) { return { key: o.key, name: o.name, recommended: o.key === co.recommend,
      headline: { big: W(o.minEnding), tone: o.clears ? 'ok' : 'late', sub: o.clears ? '回到安全线以上' : '仍差 ' + W(o.gap) },
      rows: [{ k: '缺口周', v: o.gapWeeks + ' 周', tone: o.gapWeeks ? 'bad' : 'good' }, { k: '资金成本', v: o.cost ? fmtN(o.cost) + ' 元' : '0 元' }, { k: '13 周末', v: W(o.ending) }, { k: '副作用', v: o.side }] }; });
    var cOpt = P.card({ cls: 'c12', title: '补缺方案', sub: f.gap ? '缺口 ' + W(f.gap) : '无缺口 · 三个方案给的是余量', body: [P.compare({ options: opts, active: co.recommend, onPick: function (k2) { doCash(k2); } }),
      h('div', { class: 'm6-reason' }, [h('span', { class: 'tag' }, ['AI 推荐 ' + co.recommend]), h('span', {}, [pick.name + '后 13 周低点 ' + W(pick.minEnding) + (pick.cost ? '，利息 ' + fmtN(pick.cost) + ' 元' : '，不增加资金成本') + '；' + pick.side])])],
      foot: [P.btn('按方案 ' + co.recommend + ' 执行', { cls: 'primary', onClick: function () { doCash(co.recommend); } })] });
    g.appendChild(cOpt);
    work.appendChild(g);
    story({ work: work, src: F.srcs, from: F.srcWrap, to: F.hub, label: f.weeks.length + ' 周',
      rise: [cChart, cWk, cOpt], rows: Array.prototype.slice.call(items.children),
      paths: nodes(work, '.pd-cash path'), verdict: say, focus: work.querySelectorAll('.pd-kpi')[1], scan: cWk });
  }
  function itemRow(it) {
    return h('div', { class: 'it' }, [P.chip(KIND_C[it.kind] || 'watch', KIND_T[it.kind] || it.kind, true), h('span', { class: 'l' }, [it.label]), h('b', { class: 'num ' + (it.amount < 0 ? 'neg' : 'pos') }, [(it.amount < 0 ? '−' : '+') + fmtN(Math.abs(it.amount))])]);
  }
  function toggleScenario(key) {
    var nd = clone(M.data);
    nd.cashScenario[key] = !nd.cashScenario[key];
    M.data = nd; recompute(); draw();
  }
  function toggleLoan() {
    var f = M.R.forecast, nd = clone(M.data);
    if (nd.cashScenario.loanDraw) { delete nd.cashScenario.loanDraw; delete nd.cashScenario.loanDrawWeek; }
    else { nd.cashScenario.loanDraw = 1000000; nd.cashScenario.loanDrawWeek = Math.max(0, (f.gapWeeks[0] != null ? f.gapWeeks[0] : f.minWeek) - 1); }
    M.data = nd; recompute(); draw();
  }
  function doCash(key) {
    var o = M.co.options.filter(function (x) { return x.key === key; })[0];
    commit(K.applyCashOption(M.data, key, LIB), '已执行现金方案 ' + key + ' · ' + (o ? o.name : '') + ' · 驾驶舱与月报已更新');
  }
  /* 「够不够」这类疑问句只测算、只把方案卡点亮；「执行 / 按方案 X」才写回本期处置 */
  function askRun(q) { return has(q, ['执行', '就按', '按方案', '照方案', '用方案', '采用', '落实', '写回', '照这个', '选这个']); }
  function pulseOption(key) {
    var w = workEl();
    if (!w) return;
    var list = w.querySelectorAll('.pd-compare .pd-option'), i, kk;
    for (i = 0; i < list.length; i++) { kk = list[i].querySelector('.key'); if (kk && kk.textContent === key) { anim().pulse(list[i], { ms: 2200, scroll: true }); return; } }
  }
  function cashOption(i, q) {
    var o = M.co.options[i];
    var other = M.co.options.filter(function (x) { return x.clears && x.key !== o.key; })[0];
    var addon = o.clears || !other ? '' : '，补平要叠加方案 ' + other.key + ' ' + other.name;
    if (askRun(q)) return { text: '已按方案 ' + o.key + ' ' + o.name + '执行：13 周低点 ' + W(o.minEnding) + (o.clears ? '，回到安全线以上。' : '，仍差 ' + W(o.gap) + addon + '。'),
      act: function () { doCash(o.key); } };
    return { text: '方案 ' + o.key + ' ' + o.name + '：13 周低点 ' + W(o.minEnding) + '，' + (o.clears ? '回到安全线以上' : '仍差 ' + W(o.gap) + '，单靠这一条补不平' + addon) + '；' + (o.cost ? '利息 ' + fmtN(o.cost) + ' 元' : '不增加资金成本') + '，' + o.side + '。这一步只做测算，本期处置未动。',
      act: function () { pulseOption(o.key); } };
  }

  /* ---------- 屏 6：政策与月报 ---------- */
  function screenPolicy(work) {
    var R = M.R, po = R.policies, rep = R.report, d = M.data;
    work.classList.add('m6-policy');
    var g = grid();
    var F = flowBar({ src: [['账套', '近 12 期'], ['研发台账', W(po.env.rdExp12)], ['工资社保', d.external.payroll.headcount + ' 人'], ['企业画像', po.env.employees + ' 人']], hub: '政策 ' + po.rows.length + ' 项', out: ['可享 ' + po.counts.ok + ' 项', '预计 ' + W(po.amountOk)], btn: '重新核对' });
    g.appendChild(F);
    g.appendChild(h('div', { class: 'c12' }, [P.kpis([
      { label: '可享', value: cnt(po.counts.ok), unit: '项', tone: 'ok', sub: '预计 ' + W(po.amountOk) },
      { label: '待补材料', value: cnt(po.counts.pending), unit: '项', tone: 'risk', sub: '预计 ' + W(po.amountPending) },
      { label: '已加入清单', value: cnt(po.counts.listed), unit: '项', tone: 'accent', sub: '预计 ' + W(po.amountListed) },
      { label: '研发费用占比', value: cnt(Math.round(po.env.rdShare * 10) / 10, { dec: 1 }), unit: '%', sub: '近 12 期 ' + W(po.env.rdExp12) },
      { label: '应纳税所得额', value: cw(po.env.taxable12), sub: '加计扣除后 · 近 12 期' }
    ])]));
    var okRows = po.rows.filter(function (p) { return p.status === 'ok'; }).sort(function (a, b) { return b.amount - a.amount; });
    var say = vd(okRows.length ? '可享 ' + po.counts.ok + ' 项预计 ' + W(po.amountOk) + '，其中' + okRows[0].name + '预计 ' + W(okRows[0].amount) + '；待补材料 ' + po.counts.pending + ' 项。'
      : '按账套与画像核对，' + po.rows.length + ' 项政策暂无可享项，待补材料 ' + po.counts.pending + ' 项。');
    g.appendChild(h('div', { class: 'c12' }, [say]));
    var tbl = P.table({ cols: [
      { key: 'name', label: '政策', cls: 'm6-rl', render: function (p) { return h('span', {}, [h('b', {}, [p.name]), h('span', { class: 'sub' }, [p.level])]); } },
      { key: 'status', label: '核对', sort: function (p) { return { ok: 0, pending: 1, no: 2 }[p.status]; }, render: function (p) { return P.chip(PSTAT[p.status][0], PSTAT[p.status][1]); } },
      { key: 'amount', label: '预计金额', align: 'r', sort: true, sortDesc: true, render: function (p) { return p.amount ? h('span', {}, [h('b', {}, [fmtN(p.amount) + ' 元']), p.deferred ? h('span', { class: 'sub' }, ['递延']) : null]) : '—'; } },
      { key: 'window', label: '申报窗口', render: function (p) { return h('span', { title: p.window }, [cut(p.window, 12)]); } },
      { key: 'listed', label: '申报清单', align: 'c', render: function (p) { return p.status === 'no' ? '—' : P.btn(p.listed ? '已加入' : '加入', { cls: 'sm' + (p.listed ? ' primary' : ''), onClick: function (e) { e.stopPropagation(); doPolicy(p.id); } }); } }
    ], rows: po.rows, sortKey: 'status', rowKey: function (p) { return p.id; }, onRow: function (p) { openPolicy(p); } });
    var cTbl = P.card({ cls: 'c8', title: '政策匹配', sub: po.rows.length + ' 项 · 金额为预计', tight: true, body: [h('div', { class: 'pd-scroll m6-sc', style: 'max-height:300px' }, [tbl])] });
    g.appendChild(cTbl);
    var listed = po.rows.filter(function (p) { return p.listed; });
    var ll = h('div', { class: 'pd-list' });
    listed.forEach(function (p) { ll.appendChild(P.item({ tone: 'ok', icon: '✓', title: p.name, sub: p.window, right: W(p.amount), rightSub: p.deferred ? '递延' : '预计', onClick: function () { openPolicy(p); } })); });
    if (!listed.length) ll.appendChild(P.empty('清单为空'));
    var cList = P.card({ title: '申报清单', sub: listed.length + ' 项 · ' + W(po.amountListed), body: [ll] });
    var who = h('div', { class: 'who' });
    ['总经理', '财务负责人', '出纳', '税务专员'].forEach(function (w, i) { who.appendChild(h('button', { class: i === M.who ? 'on' : '', onclick: function () { M.who = i; draw(); } }, [w])); });
    var cRep = P.card({ title: '财务月报', sub: d.period.replace('-', ' 年 ') + ' 月 · 微信文本版', body: [h('div', { class: 'pd-field' }, [h('label', {}, ['收件人']), who]), h('div', { class: 'pd-pre m6-rep' }, [negText(rep.text)])],
      foot: [P.btn('发送到微信', { cls: 'primary', onClick: function () { sh.setQrReady(true); sh.showWeChat(); } }), P.btn('回到驾驶舱', { onClick: function () { setStep('board'); } })] });
    g.appendChild(col('c4', [cList, cRep]));
    work.appendChild(g);
    story({ work: work, src: F.srcs, from: F.srcWrap, to: F.hub, label: po.rows.length + ' 项政策',
      rise: [cTbl, cList, cRep], rows: trs(tbl).concat(Array.prototype.slice.call(ll.children)),
      verdict: say, focus: okRows.length ? rowOf(work, okRows[0].name) : null, scan: cRep });
  }
  function doPolicy(id) {
    var p = M.R.policies.rows.filter(function (x) { return x.id === id; })[0];
    commit(K.togglePolicy(M.data, id), (p && p.listed ? '已移出申报清单：' : '已加入申报清单：') + (p ? p.name : ''));
    if (p) refocus(p.name, 120);
  }
  function openPolicy(p) {
    var body = [P.kv([['核对', PSTAT[p.status][1]], ['条件', p.condText], ['依据', p.reason], ['预计金额', p.amount ? fmtN(p.amount) + ' 元' + (p.deferred ? '（递延）' : '') : '—'], ['申报窗口', p.window], ['级别', p.level]]),
      h('div', {}, [h('div', { class: 'm6-sub' }, ['所需材料']), h('ul', { class: 'm6-ul' }, p.need.map(function (t) { return h('li', {}, [t]); }))])];
    var acts = [P.btn('关闭', { onClick: function () { dr.close(); } })];
    if (p.status !== 'no') acts.unshift(P.btn(p.listed ? '移出申报清单' : '加入申报清单', { cls: 'primary', onClick: function () { dr.close(); doPolicy(p.id); } }));
    var dr = P.drawer(M.frame.body, { title: p.name, sub: p.level + ' · ' + PSTAT[p.status][1], body: body, actions: acts });
    return dr;
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
  /* 问句里点名了哪一项：按名字的二元组命中数打分，命中 2 组以上才算 */
  function byNameHit(q, list) {
    var best = null, bestN = 0;
    list.forEach(function (x) {
      var nm = String(x.name || ''), n = 0, i;
      for (i = 0; i + 1 < nm.length; i++) if (q.indexOf(nm.substr(i, 2)) >= 0) n++;
      if (n > bestN) { bestN = n; best = x; }
    });
    return bestN >= 2 ? { row: best, n: bestN } : null;
  }
  function byName(q, list) { var r = byNameHit(q, list); return r ? r.row : null; }

  function opener(step) {
    if (!M.R) return null;
    var R = M.R, k = R.kpi, rec = R.reconcile, rk = R.risks, f = R.forecast, po = R.policies, m = rec.metrics;
    if (step === 'connect') return '银行对账单余额 ' + W(m.bankBalance) + '，账面货币资金 ' + W(m.cashLedger) + '，差 ' + W(Math.abs(m.bankBalance - m.cashLedger)) + '，这笔要在勾稽里落账。';
    if (step === 'board') return gapText() + '；本期收入 ' + W(k.rev) + '（环比 ' + (k.revMoM >= 0 ? '+' : '') + neg(k.revMoM) + '%），经营现金流 ' + W(k.cfo) + '。';
    if (step === 'recon') {
      var b = badRows();
      if (!b.length) return rec.rows.length + ' 条勾稽关系全部在容差内，本期无需调整。';
      var r3 = rec.rows.filter(function (r) { return r.id === 'R03' && r.status !== 'ok'; })[0], r7 = rec.rows.filter(function (r) { return r.id === 'R07' && r.status !== 'ok'; })[0];
      if (r3 && r7) return '一笔到账货款 ' + W(Math.abs(r3.diff)) + '没入账，同时抬高应收、压低账面现金，R03 与 R07 是同一件事。';
      return b[0].id + ' ' + b[0].name + '差 ' + W(Math.abs(b[0].diff)) + '，容差 ' + fmtN(b[0].tol) + ' 元，' + b.length + ' 处异常里数额居前。';
    }
    if (step === 'risk') { var t = rk.rows[0]; return t.id + ' ' + t.name + '：概率 ' + Math.round(t.prob * 100) + '%，影响 ' + W(t.impact) + '；指标 ' + rv(t) + '，参考 ' + rband(t) + '。'; }
    if (step === 'cash') {
      var pick = M.co.options.filter(function (o) { return o.key === M.co.recommend; })[0];
      if (f.gap) return '第 ' + (f.minWeek + 1) + ' 周现金 ' + W(f.minEnding) + '，缺口 ' + W(f.gap) + '，' + f.gapWeeks.length + ' 周低于安全线；方案 ' + pick.key + ' ' + pick.name + '能拉回 ' + W(pick.minEnding) + '。';
      return '13 周低点 ' + W(f.minEnding) + '（第 ' + (f.minWeek + 1) + ' 周），高于安全线 ' + W(f.minEnding - f.safety) + '，窗口内无缺口周。';
    }
    if (step === 'policy') {
      var ok = po.rows.filter(function (p) { return p.status === 'ok'; }).sort(function (a, b2) { return b2.amount - a.amount; });
      if (!ok.length) return po.rows.length + ' 项政策按账套核对后暂无可享项，待补材料 ' + po.counts.pending + ' 项。';
      return '可享 ' + po.counts.ok + ' 项预计 ' + W(po.amountOk) + '，其中' + ok[0].name + '预计 ' + W(ok[0].amount) + '；待补材料 ' + po.counts.pending + ' 项。';
    }
    return null;
  }
  function suggest(step) {
    if (step === 'connect') return ['哪些来源是直连的', '账面和银行差多少', '进财务驾驶舱'];
    if (step === 'board') return ['哪一周现金吃紧', '毛利率为什么降', '勾稽异常有几处', '先处理哪一件'];
    if (step === 'recon') return ['哪几条异常', 'R03 为什么差', '按建议调整', '看银行未达账项'];
    if (step === 'risk') return ['高风险有哪几项', 'K09 依据是什么', '影响一共多少钱', '处置这一条'];
    if (step === 'cash') return ['缺口多少', '哪一周吃紧', '催收够不够', '授信提款能补上吗'];
    if (step === 'policy') return ['可享多少钱', '待补什么材料', '加入研发费用加计扣除', '月报说了什么'];
    return null;
  }

  function answer(q, step) {
    if (!M.R) return null;
    q = String(q || '');
    var R = M.R, k = R.kpi, rec = R.reconcile, rk = R.risks, f = R.forecast, po = R.policies, w = workEl();
    var m, i;

    /* 点名某条勾稽关系 */
    m = q.match(/R\s*0?(\d{1,2})/i);
    if (m) {
      var rid = 'R' + (m[1].length < 2 ? '0' + m[1] : m[1]);
      var rr = rec.rows.filter(function (x) { return x.id === rid; })[0];
      if (rr) return { text: rr.id + ' ' + rr.name + '（' + rr.pair + '）：' + (rr.status === 'na' ? '本企业无此科目。' : rr.lhsLabel + ' ' + fmtN(rr.lhs) + ' 元，' + rr.rhsLabel + ' ' + fmtN(rr.rhs) + ' 元，差 ' + fmtN(rr.diff) + ' 元，容差 ' + fmtN(rr.tol) + ' 元。' + rr.explain + '。'),
        blocks: [kvb([['判断', STAT[rr.status][1]], ['差异', fmtN(rr.diff) + ' 元'], ['建议', rr.fixed ? '已调整' : rr.fix ? rr.fix.label + ' ' + fmtN(rr.fix.amount) + ' 元' : '核实原始凭证']])],
        focus: step === 'recon' ? rowOf(w, rid) : null,
        act: step === 'recon' ? (M.rule === rid ? null : function () { M.rule = rid; draw(); refocus(rid); }) : function () { M.rule = rid; setStep('recon'); } };
    }
    /* 点名某条风险 */
    m = q.match(/K\s*0?(\d{1,2})/i);
    if (m) {
      var kid = 'K' + (m[1].length < 2 ? '0' + m[1] : m[1]);
      var kr = rk.rows.filter(function (x) { return x.id === kid; })[0];
      if (kr) return { text: kr.id + ' ' + kr.name + '：' + kr.metricLabel + ' ' + rv(kr) + '，参考 ' + rband(kr) + '，概率 ' + Math.round(kr.prob * 100) + '%，影响 ' + W(kr.impact) + '（' + kr.impactNote + '）。\n' + kr.evidence[0] + '。',
        blocks: [tagsb(kr.evidence.slice(1, 4).map(function (e) { return cut(e, 22); }))],
        focus: step === 'risk' ? rowOf(w, kid) : null,
        act: step === 'risk' ? (M.risk === kid ? null : function () { M.risk = kid; draw(); refocus(kid); }) : function () { M.risk = kid; setStep('risk'); } };
    }
    /* 点名某项政策 */
    m = q.match(/P\s*0?(\d{1,2})/i);
    if (m) {
      var pid = 'P' + (m[1].length < 2 ? '0' + m[1] : m[1]);
      var pr = po.rows.filter(function (x) { return x.id === pid; })[0];
      if (pr) return { text: pr.name + '（' + pr.level + '）：' + PSTAT[pr.status][1] + '。' + pr.reason + '。' + (pr.amount ? '预计 ' + W(pr.amount) + '，申报窗口 ' + pr.window + '。' : ''),
        blocks: [tagsb(pr.need.slice(0, 3))],
        act: function () { if (step !== 'policy') { setStep('policy'); setTimeout(function () { openPolicy(M.R.policies.rows.filter(function (x) { return x.id === pid; })[0]); }, 420); } else openPolicy(pr); } };
    }
    /* 点名某一周 */
    m = q.match(/第\s*(\d{1,2})\s*周/);
    if (m) {
      var wi = Math.max(0, Math.min(f.weeks.length - 1, (+m[1]) - 1)), ww = f.weeks[wi];
      return { text: '第 ' + (wi + 1) + ' 周（' + ww.label + ' 起）：期初 ' + W(ww.opening) + '，流入 ' + W(ww.inflow) + '，流出 ' + W(ww.outflow) + '，周末 ' + W(ww.ending) + (ww.ending < f.safety ? '，低于安全线 ' + W(f.safety - ww.ending) + '。' : '。'),
        blocks: [mini(['项目', '金额'], ww.items.slice(0, 4).map(function (it) { return [cut(it.label, 16), (it.amount < 0 ? '−' : '+') + fmtN(Math.abs(it.amount))]; }))],
        act: function () { M.week = wi; if (step === 'cash') draw(); else setStep('cash'); } };
    }
    /* 换屏 */
    if (has(q, ['进财务驾驶舱', '驾驶舱', '开始分析'])) return { text: '本期收入 ' + W(k.rev) + '，勾稽异常 ' + rec.counts.bad + ' 处，高风险 ' + rk.counts.high + ' 项，' + gapText() + '。', act: function () { if (!M.charged) enterBoard(); else setStep('board'); } };

    if (step === 'connect') {
      if (has(q, ['直连', '来源', '同步', '导入', '几个'])) {
        var dir = M.data.sources.filter(function (s) { return s.mode === 'direct'; });
        return { text: '共 ' + M.data.sources.length + ' 个来源，系统直连 ' + dir.length + ' 个，其余表格导入；合计 ' + fmtN(M.data.sources.reduce(function (t, s) { return t + s.rows; }, 0)) + ' 条。',
          blocks: [mini(['来源', '方式', '条数'], M.data.sources.map(function (s) { return [SRC[s.id] || cut(s.name, 8), s.mode === 'direct' ? '直连' : '导入', fmtN(s.rows)]; }))] };
      }
      if (has(q, ['差多少', '对账单', '银行', '货币资金'])) {
        var mm = rec.metrics;
        return { text: '银行对账单 ' + fmtN(mm.bankBalance) + ' 元，账面货币资金 ' + fmtN(mm.cashLedger) + ' 元，差 ' + fmtN(mm.bankBalance - mm.cashLedger) + ' 元，落在 R07。',
          blocks: [kvb([['对账单余额', fmtN(mm.bankBalance) + ' 元'], ['账面货币资金', fmtN(mm.cashLedger) + ' 元'], ['差额', fmtN(mm.bankBalance - mm.cashLedger) + ' 元']])],
          act: function () { M.rule = 'R07'; setStep('recon'); } };
      }
      if (has(q, ['能力', '开通', '能做'])) return { text: '已开通 4 项：' + CAPS.map(function (c) { return c[0]; }).join('、') + '。' };
      if (has(q, ['账期', '几期', '期间'])) return { text: '账期 ' + M.data.period.replace('-', ' 年 ') + ' 月，取近 12 期科目余额与流量；' + M.data.ledger.months[0].replace('-', '.') + ' 至 ' + M.data.period.replace('-', '.') + '。' };
    }

    if (step === 'board') {
      if (has(q, ['最紧', '吃紧', '哪一周', '缺口', '现金'])) return { text: gapText() + (f.gapWeeks.length ? '，缺口周：' + f.gapWeeks.map(function (x) { return '第 ' + (x + 1) + ' 周'; }).join('、') : '') + '。',
        blocks: [mini(['周', '周末余额'], f.weeks.slice(0, 6).map(function (x, idx) { return ['第 ' + (idx + 1) + ' 周', fmtN(x.ending)]; }))],
        act: function () { M.week = f.gapWeeks.length ? f.gapWeeks[0] : f.minWeek; setStep('cash'); } };
      if (has(q, ['毛利', '为什么降', '收入'])) {
        var pl = R.statements.pl, l3 = pl.slice(-3);
        return { text: '本期收入 ' + W(k.rev) + '，环比 ' + (k.revMoM >= 0 ? '+' : '') + neg(k.revMoM) + '%；毛利率 ' + k.gm + '%，上期 ' + k.gmPrev + '%。近三期 ' + l3.map(function (p) { return (Math.round(p.gm * 1000) / 10) + '%'; }).join(' → ') + '。',
          blocks: [mini(['期间', '收入', '毛利率'], l3.map(function (p) { return [p.label, fmtN(Math.round(p.rev / 10000)) + ' 万', (Math.round(p.gm * 1000) / 10) + '%']; }))] };
      }
      if (has(q, ['异常', '勾稽', '几处'])) return { text: '勾稽 ' + rec.rows.length + ' 条，异常 ' + rec.counts.bad + ' 处、正常 ' + rec.counts.ok + ' 条，已调整 ' + rec.counts.fixed + ' 笔。',
        blocks: [mini(['编号', '关系', '差异'], badRows().slice(0, 5).map(function (r) { return [r.id, cut(r.name, 10), fmtN(r.diff)]; }))],
        act: function () { setStep('recon'); } };
      if (has(q, ['先处理', '建议', '哪一件', '怎么办', '优先'])) {
        var t2 = topRisk(), b2 = badRows()[0];
        return { text: '先看 ' + t2.id + ' ' + t2.name + '：概率 ' + Math.round(t2.prob * 100) + '%、影响 ' + W(t2.impact) + '，动作是' + t2.actions[0].label + '；勾稽这边先调 ' + (b2 ? b2.id + ' ' + b2.name : '无') + '。',
          act: function () { M.risk = t2.id; setStep('risk'); } };
      }
      if (has(q, ['风险', '高风险'])) return { text: '高 ' + rk.counts.high + ' 项、中 ' + rk.counts.mid + ' 项、已处置 ' + rk.counts.handled + ' 项；影响合计 ' + W(rk.rows.reduce(function (t, r) { return t + r.impact; }, 0)) + '。',
        blocks: [mini(['编号', '风险', '影响'], rk.rows.slice(0, 5).map(function (r) { return [r.id, cut(r.name, 8), W(r.impact)]; }))], act: function () { setStep('risk'); } };
      if (has(q, ['政策', '可享', '退税'])) return { text: '可享 ' + po.counts.ok + ' 项预计 ' + W(po.amountOk) + '，待补材料 ' + po.counts.pending + ' 项。', act: function () { setStep('policy'); } };
    }

    if (step === 'recon') {
      var cur = curRule();
      if (has(q, ['哪几条', '哪些异常', '异常', '几处'])) return { text: rec.counts.bad + ' 处异常：' + badRows().map(function (r) { return r.id + ' ' + r.name + ' 差 ' + fmtN(r.diff) + ' 元'; }).join('；') + '。',
        blocks: [mini(['编号', '关系', '差异'], badRows().map(function (r) { return [r.id, cut(r.name, 10), fmtN(r.diff)]; }))],
        focus: badRows().length ? rowOf(w, badRows()[0].id) : null };
      if (has(q, ['为什么', '怎么回事', '原因', '依据'])) return { text: cur.id + ' ' + cur.name + '：' + cur.lhsLabel + ' ' + fmtN(cur.lhs) + ' 元，' + cur.rhsLabel + ' ' + fmtN(cur.rhs) + ' 元。' + cur.explain + '。' + (rec.reasons.filter(function (t) { return t.indexOf('同源') >= 0; }).length && (cur.id === 'R03' || cur.id === 'R07') ? '\n' + rec.reasons.filter(function (t) { return t.indexOf('同源') >= 0; })[0] + '。' : ''),
        focus: rowOf(w, cur.id) };
      if (has(q, ['调整', '分录', '按建议', '改过来', '落账'])) {
        if (cur.fixed) return { text: cur.id + ' 已生成调整分录，待会计复核。' };
        if (!cur.fix) return { text: cur.id + ' ' + cur.name + '没有可自动生成的分录，需要会计核对原始凭证。' };
        return { text: '已按建议生成分录：' + cur.fix.label + ' ' + fmtN(cur.fix.amount) + ' 元。' + cur.fix.entry.map(function (e) { return e.join(' '); }).join('；') + '，三表与月报已重算。',
          blocks: [mini(['方向', '科目', '金额'], cur.fix.entry)],
          act: function () { doFix(cur.id); } };
      }
      if (has(q, ['下钻', '明细', '未达', '单据', '看看'])) {
        if (!cur.drill) return null;
        var dr2 = cur.drill;
        return { text: cur.id + ' 下钻：' + dr2.title + '，' + (dr2.type === 'table' ? dr2.rows.length + ' 条。' : (dr2.rows.length + ' 项。')),
          blocks: [dr2.type === 'table' ? mini(dr2.cols.slice(0, 4), dr2.rows.slice(0, 5).map(function (r) { return r.slice(0, 4); })) : mini(['项目', '金额'], dr2.rows)],
          focus: rowOf(w, cur.id) };
      }
      var nn = byName(q, rec.rows);
      if (nn) return { text: nn.id + ' ' + nn.name + '：' + (nn.status === 'na' ? '本企业无此科目。' : nn.lhsLabel + ' ' + fmtN(nn.lhs) + ' 元，' + nn.rhsLabel + ' ' + fmtN(nn.rhs) + ' 元，差 ' + fmtN(nn.diff) + ' 元，' + STAT[nn.status][1] + '。' + nn.explain + '。'),
        focus: rowOf(w, nn.id), act: M.rule === nn.id ? null : function () { M.rule = nn.id; draw(); refocus(nn.id); } };
      if (has(q, ['资产', '负债', '权益', '平不平'])) return { text: '资产总计 ' + fmtN(rec.metrics.assets) + ' 元 = 负债 ' + fmtN(rec.metrics.liabilities) + ' 元 + 所有者权益 ' + fmtN(rec.metrics.equity) + ' 元，R01 ' + STAT[rec.rows[0].status][1] + '。' };
    }

    if (step === 'risk') {
      var cr = curRisk();
      if (has(q, ['高风险', '哪几项', '哪些风险'])) {
        var hi = rk.rows.filter(function (r) { return r.level === 'high'; });
        return { text: hi.length ? '高风险 ' + hi.length + ' 项：' + hi.map(function (r) { return r.id + ' ' + r.name + '（概率 ' + Math.round(r.prob * 100) + '%、影响 ' + W(r.impact) + '）'; }).join('；') + '。' : '当前无高风险项，中风险 ' + rk.counts.mid + ' 项。',
          blocks: [mini(['编号', '风险', '概率', '影响'], rk.rows.slice(0, 5).map(function (r) { return [r.id, cut(r.name, 8), Math.round(r.prob * 100) + '%', W(r.impact)]; }))],
          focus: hi.length ? rowOf(w, hi[0].id) : null };
      }
      if (has(q, ['一共', '合计', '多少钱', '影响'])) return { text: '影响金额合计 ' + W(rk.rows.reduce(function (t, r) { return t + r.impact; }, 0)) + '，高风险占 ' + W(rk.rows.filter(function (r) { return r.level === 'high'; }).reduce(function (t, r) { return t + r.impact; }, 0)) + '；应收逾期 ' + W(rk.arOverdue) + '，其中 90 天以上 ' + W(rk.arOverdue90) + '。' };
      if (has(q, ['依据', '证据', '为什么', '怎么算'])) return { text: cr.id + ' ' + cr.name + '：' + cr.metricLabel + ' ' + rv(cr) + '，参考 ' + rband(cr) + (cr.inBand ? '，在参考带内，按影响金额列入关注。' : '，超出参考带。') + '\n' + cr.evidence.slice(0, 2).join('；') + '。',
        focus: rowOf(w, cr.id) };
      if (has(q, ['处置', '怎么办', '执行', '动作'])) {
        var todo = cr.actions.filter(function (a) { return !cr.handled.filter(function (x) { return x.key === a.key; }).length; });
        if (!todo.length) return { text: cr.id + ' ' + cr.name + ' 的处置动作都已执行，概率已下调到 ' + Math.round(cr.prob * 100) + '%。' };
        var a0 = todo[0];
        return { text: '按 ' + cr.id + ' ' + cr.name + ' 执行「' + a0.label + '」：' + a0.desc + '。执行后概率下调，现金预测与月报一起重算。',
          act: function () { doRiskAct(cr.id, a0.key); } };
      }
      var nr = byName(q, rk.rows);
      if (nr && !has(q, ['逾期', '应收'])) return { text: nr.id + ' ' + nr.name + '：' + nr.metricLabel + ' ' + rv(nr) + '，参考 ' + rband(nr) + '，概率 ' + Math.round(nr.prob * 100) + '%，影响 ' + W(nr.impact) + '。\n' + nr.evidence[0] + '。',
        focus: rowOf(w, nr.id), act: M.risk === nr.id ? null : function () { M.risk = nr.id; draw(); refocus(nr.id); } };
      if (has(q, ['逾期', '应收', '客户'])) {
        var over = rk.aging.filter(function (a) { return a.overdueDays > 0; }).sort(function (a, b3) { return b3.overdueDays - a.overdueDays; });
        return { text: '应收逾期 ' + W(rk.arOverdue) + '，90 天以上 ' + W(rk.arOverdue90) + '；逾期 ' + over.length + ' 笔。',
          blocks: [mini(['单号', '客户', '金额', '逾期'], over.slice(0, 4).map(function (a) { return [a.id, cut(a.customer, 12), fmtN(a.amount), a.overdueDays + ' 天']; }))],
          act: function () { M.risk = 'K01'; draw(); refocus('K01'); } };
      }
    }

    if (step === 'cash') {
      var wkc = curWeek();
      if (has(q, ['缺口', '差多少', '多少钱'])) return { text: f.gap ? '缺口 ' + W(f.gap) + '：13 周低点第 ' + (f.minWeek + 1) + ' 周 ' + W(f.minEnding) + '，安全线 ' + W(f.safety) + '，' + f.gapWeeks.length + ' 周低于安全线。' : '窗口内无缺口周，13 周低点 ' + W(f.minEnding) + '，高于安全线 ' + W(f.minEnding - f.safety) + '。',
        focus: w ? w.querySelectorAll('.pd-kpi')[2] : null };
      if (has(q, ['最紧', '吃紧', '哪一周', '哪周'])) return { text: '第 ' + (f.minWeek + 1) + ' 周（' + f.weeks[f.minWeek].label + ' 起）吃紧，周末 ' + W(f.minEnding) + '；当周流出 ' + W(f.weeks[f.minWeek].outflow) + '。',
        blocks: [mini(['项目', '金额'], f.weeks[f.minWeek].items.slice(0, 4).map(function (it) { return [cut(it.label, 16), (it.amount < 0 ? '−' : '+') + fmtN(Math.abs(it.amount))]; }))],
        act: function () { M.week = f.minWeek; draw(); } };
      if (has(q, ['催收', '方案 A', '方案A'])) return cashOption(0, q);
      if (has(q, ['延付', '方案 B', '方案B'])) return cashOption(1, q);
      if (has(q, ['授信', '提款', '100 万', '100万'])) {
        var lw = Math.max(0, (f.gapWeeks[0] != null ? f.gapWeeks[0] : f.minWeek) - 1);
        var f2 = K.forecast(M.data, { loanDraw: 1000000, loanDrawWeek: lw });
        var ic = Math.round(1000000 * M.data.cash.creditLine.rate / 12 * 3);
        return { text: '授信提款 100 万元（第 ' + (lw + 1) + ' 周提用）后：13 周低点 ' + W(f2.minEnding) + (f2.gap ? '，仍差 ' + W(f2.gap) : '，回到安全线以上') + '；按 ' + (M.data.cash.creditLine.rate * 100).toFixed(1) + '% 年化、用满三个月算利息 ' + fmtN(ic) + ' 元。已把这个开关打开重算。',
          act: function () { if (!M.data.cashScenario.loanDraw) toggleLoan(); else draw(); } };
      }
      if (has(q, ['融资', '方案 C', '方案C', '贷款', '额度'])) {
        var oc = M.co.options[2], runC = askRun(q);
        return { text: '方案 C ' + oc.name + '：' + M.data.cash.creditLine.bank + '授信额度 ' + W(M.data.cash.creditLine.limit) + '，按缺口提用 ' + W(oc.scenario.loanDraw) + '（第 ' + (oc.scenario.loanDrawWeek + 1) + ' 周），13 周低点 ' + W(oc.minEnding) + '，利息 ' + fmtN(oc.cost) + ' 元。' + (runC ? '已写回本期处置。' : '本期处置未动。'),
          act: runC ? function () { doCash('C'); } : function () { pulseOption('C'); } };
      }
      if (has(q, ['推荐', '选哪个', '哪个方案', '怎么办'])) { var pk = M.co.options.filter(function (o) { return o.key === M.co.recommend; })[0];
        return { text: '推荐方案 ' + pk.key + ' ' + pk.name + '：13 周低点 ' + W(pk.minEnding) + (pk.cost ? '，利息 ' + fmtN(pk.cost) + ' 元' : '，不增加资金成本') + '；' + pk.side + '。',
          blocks: [mini(['方案', '低点', '缺口周', '成本'], M.co.options.map(function (o) { return [o.key + ' ' + o.name, W(o.minEnding), o.gapWeeks + ' 周', o.cost ? fmtN(o.cost) : '0']; }))],
          act: function () { doCash(M.co.recommend); } }; }
      if (has(q, ['本周', '这一周', '明细', '收付'])) return { text: '第 ' + (M.week + 1) + ' 周流入 ' + W(wkc.inflow) + '、流出 ' + W(wkc.outflow) + '、净额 ' + W(wkc.net) + '，' + wkc.items.length + ' 笔。',
        blocks: [mini(['项目', '金额'], wkc.items.slice(0, 5).map(function (it) { return [cut(it.label, 16), (it.amount < 0 ? '−' : '+') + fmtN(Math.abs(it.amount))]; }))] };
    }

    if (step === 'policy') {
      if (has(q, ['多少钱', '可享', '合计', '预计'])) return { text: '可享 ' + po.counts.ok + ' 项预计 ' + W(po.amountOk) + '，待补材料 ' + po.counts.pending + ' 项预计 ' + W(po.amountPending) + '，已加入清单 ' + po.counts.listed + ' 项。',
        blocks: [mini(['政策', '核对', '预计金额'], po.rows.filter(function (p) { return p.status !== 'no'; }).slice(0, 5).map(function (p) { return [cut(p.name, 10), PSTAT[p.status][1], p.amount ? fmtN(p.amount) : '—']; }))] };
      if (has(q, ['待补', '材料', '缺什么'])) {
        var pend = po.rows.filter(function (p) { return p.status === 'pending'; });
        return { text: pend.length ? '待补材料 ' + pend.length + ' 项：' + pend.map(function (p) { return p.name + '（补 ' + p.need[0] + '）'; }).join('；') + '。' : '没有待补材料的政策。',
          blocks: pend.length ? [mini(['政策', '需补', '窗口'], pend.map(function (p) { return [cut(p.name, 10), cut(p.need[0], 10), p.window]; }))] : null,
          focus: pend.length ? rowOf(w, pend[0].name) : null };
      }
      if (has(q, ['加入', '清单', '申报'])) {
        var cand = po.rows.filter(function (p) { return p.status === 'ok' && !p.listed; }).sort(function (a, b4) { return b4.amount - a.amount; });
        var target = byName(q, po.rows) || cand[0];
        if (!target) return { text: '可享政策都已在申报清单里，合计预计 ' + W(po.amountListed) + '。' };
        return { text: (target.listed ? '已把' : '已把') + target.name + (target.listed ? '移出' : '加入') + '申报清单，预计 ' + W(target.amount) + '；材料要 ' + target.need.slice(0, 2).join('、') + '。',
          act: function () { doPolicy(target.id); } };
      }
      var np = byName(q, po.rows);
      if (np) return { text: np.name + '（' + np.level + '）：' + PSTAT[np.status][1] + '。' + np.reason + '。' + (np.amount ? '预计 ' + W(np.amount) + '，申报窗口 ' + np.window + '。' : ''),
        blocks: [tagsb(np.need.slice(0, 3))], focus: rowOf(w, np.name), act: function () { openPolicy(np); } };
      if (has(q, ['月报', '报告', '说了什么', '发给'])) return { text: negText(R.report.lines.slice(1, 4).join('\n')),
        blocks: [tagsb(R.report.todo.slice(0, 3).map(function (t) { return cut(t, 18); }))] };
      if (has(q, ['研发', '加计'])) return { text: '近 12 期研发费用 ' + W(po.env.rdExp12) + '，占收入 ' + Math.round(po.env.rdShare * 10) / 10 + '%；按 100% 加计扣除，预计 ' + W((po.rows.filter(function (p) { return p.id === 'P02'; })[0] || { amount: 0 }).amount) + '。' };
    }

    /* 全局：点名字问某一条勾稽关系 / 某一项风险 / 某一项政策，不在本屏也能答并跳过去 */
    var gl = [byNameHit(q, rec.rows), byNameHit(q, rk.rows), byNameHit(q, po.rows)], gi = -1, gn = 0;
    for (i = 0; i < 3; i++) if (gl[i] && gl[i].n > gn) { gn = gl[i].n; gi = i; }
    if (gi === 0) {
      var gr = gl[0].row;
      return { text: gr.id + ' ' + gr.name + '（' + gr.pair + '）：' + (gr.status === 'na' ? '本企业无此科目。' : gr.lhsLabel + ' ' + fmtN(gr.lhs) + ' 元，' + gr.rhsLabel + ' ' + fmtN(gr.rhs) + ' 元，差 ' + fmtN(gr.diff) + ' 元，' + STAT[gr.status][1] + '。' + gr.explain + '。'),
        blocks: [kvb([['判断', STAT[gr.status][1]], ['差异', fmtN(gr.diff) + ' 元'], ['建议', gr.fixed ? '已调整' : gr.fix ? gr.fix.label + ' ' + fmtN(gr.fix.amount) + ' 元' : '核实原始凭证']])],
        focus: step === 'recon' ? rowOf(w, gr.id) : null,
        act: step === 'recon' ? (M.rule === gr.id ? null : function () { M.rule = gr.id; draw(); refocus(gr.id); }) : function () { M.rule = gr.id; setStep('recon'); } };
    }
    if (gi === 1) {
      var gk = gl[1].row;
      return { text: gk.id + ' ' + gk.name + '：' + gk.metricLabel + ' ' + rv(gk) + '，参考 ' + rband(gk) + '，概率 ' + Math.round(gk.prob * 100) + '%，影响 ' + W(gk.impact) + '（' + gk.impactNote + '）。\n' + gk.evidence[0] + '。',
        blocks: [tagsb(gk.evidence.slice(1, 4).map(function (e) { return cut(e, 22); }))],
        focus: step === 'risk' ? rowOf(w, gk.id) : null,
        act: step === 'risk' ? (M.risk === gk.id ? null : function () { M.risk = gk.id; draw(); refocus(gk.id); }) : function () { M.risk = gk.id; setStep('risk'); } };
    }
    if (gi === 2) {
      var gp = gl[2].row;
      return { text: gp.name + '（' + gp.level + '）：' + PSTAT[gp.status][1] + '。' + gp.reason + '。' + (gp.amount ? '预计 ' + W(gp.amount) + '，申报窗口 ' + gp.window + '。' : ''),
        blocks: [tagsb(gp.need.slice(0, 3))],
        focus: step === 'policy' ? rowOf(w, gp.name) : null,
        act: step === 'policy' ? function () { openPolicy(gp); } : function () { setStep('policy'); refocus(gp.name, 460); } };
    }
    return null;
  }

  /* ---------- 文档 ---------- */
  function pick(head, res) {
    var i, j;
    for (j = 0; j < res.length; j++) for (i = 0; i < head.length; i++) if (res[j].test(head[i])) return i;
    return -1;
  }
  function numOf(s) { var v = parseFloat(String(s == null ? '' : s).replace(/[,，\s元]/g, '')); return isNaN(v) ? null : v; }
  var TBMAP = [
    [/库存现金|银行存款|货币资金|其他货币/, 'cash', '货币资金'],
    [/应收账款/, 'ar', '应收账款'],
    [/库存商品|原材料|在产品|发出商品|存货/, 'inventory', '存货'],
    [/预付账款/, 'prepaid', '预付账款'],
    [/应付账款/, 'ap', '应付账款'],
    [/应付职工薪酬/, 'wagesPayable', '应付职工薪酬'],
    [/应交税费/, 'taxesPayable', '应交税费'],
    [/短期借款/, 'shortLoan', '短期借款'],
    [/长期借款/, 'longLoan', '长期借款']
  ];
  function docTrialBalance(doc) {
    var s0 = (doc.sheets || [])[0];
    if (!s0 || s0.rows.length < 2) return null;
    var head = (s0.rows[0] || []).map(function (x) { return String(x).trim(); });
    var iName = pick(head, [/科目名称/, /科目$/, /名称/]);
    var iEnd = pick(head, [/期末余额/, /期末/, /余额$/]);
    var iBeg = pick(head, [/期初余额/, /期初/]);
    var iDr = pick(head, [/本期借方|借方发生|借方/]);
    var iCr = pick(head, [/本期贷方|贷方发生|贷方/]);
    if (iName < 0 || iEnd < 0) return null;
    var body = s0.rows.slice(1).filter(function (r) { return String(r[iName] || '').trim(); });
    if (!body.length) return null;
    var b = lastBS(), agg = {}, checked = 0, off = [];
    body.forEach(function (r) {
      var name = String(r[iName]).trim(), end = numOf(r[iEnd]);
      if (end == null) return;
      if (iBeg >= 0 && iDr >= 0 && iCr >= 0) {
        var bg = numOf(r[iBeg]), dr = numOf(r[iDr]), cr = numOf(r[iCr]);
        if (bg != null && dr != null && cr != null) {
          checked++;
          if (Math.abs(bg + dr - cr - end) > 1 && Math.abs(bg - dr + cr - end) > 1) off.push(name);
        }
      }
      TBMAP.forEach(function (mp) { if (mp[0].test(name)) { agg[mp[1]] = agg[mp[1]] || { key: mp[1], name: mp[2], doc: 0, items: [] }; agg[mp[1]].doc += end; agg[mp[1]].items.push(name); } });
    });
    var rows = Object.keys(agg).map(function (k2) { var a = agg[k2]; a.book = b[k2] || 0; a.diff = a.doc - a.book; return a; });
    if (!rows.length) return null;
    rows.sort(function (x, y) { return Math.abs(y.diff) - Math.abs(x.diff); });
    var top = rows[0];
    var lines = ['Excel《' + doc.name + '》读完：' + doc.sheets.length + ' 张表、' + body.length + ' 行科目，表头 ' + head.slice(0, 6).join(' / ') + '。'];
    if (checked) lines.push('逐行核对期初 ± 本期发生额 = 期末：' + checked + ' 行' + (off.length ? '，' + off.join('、') + ' 不平' : '全部相等') + '。');
    lines.push('与账面逐科目比对：' + rows.map(function (r) { return r.name + ' 导入 ' + fmtN(r.doc) + '、账面 ' + fmtN(r.book) + '、差 ' + fmtN(r.diff); }).slice(0, 3).join('；') + '。');
    lines.push('差额居前的是' + top.name + ' ' + fmtN(top.diff) + ' 元；这张表覆盖 ' + rows.length + ' 个科目，其余 ' + M.R.reconcile.rows.length + ' 条勾稽关系仍按原账面核对。');
    return { text: lines.join('\n'),
      blocks: [mini(['科目', '导入期末', '账面', '差异'], rows.map(function (r) { return [r.name, fmtN(r.doc), fmtN(r.book), fmtN(r.diff)]; }))],
      act: function () {
        M.tb = { name: s0.name, rows: rows, balanced: !off.length, checked: checked, file: doc.name };
        M.rule = 'R07';
        if (M.step === 'recon') { draw(); refocus('R07'); } else setStep('recon');
      } };
  }
  /* 付款期次：先读付款表，再退到正文的「首付 30%」；税率不当付款比例用 */
  function payFirst(doc, txt, total) {
    var tabs = doc.tables || [], i, j;
    for (i = 0; i < tabs.length; i++) for (j = 0; j < tabs[i].length; j++) {
      var r = (tabs[i][j] || []).map(function (x) { return String(x).trim(); });
      if (!/首付|首期|预付|定金|签约/.test(r[0] || '')) continue;
      var pct = null, amt = null;
      r.forEach(function (c) {
        var mp = c.match(/^(\d{1,3})\s*%$/);
        if (mp) { pct = +mp[1]; return; }
        var v = numOf(c);
        if (v != null && v >= 1000) amt = v;
      });
      if (amt || pct) return { amount: amt || Math.round(total * pct / 100), pct: pct, from: r[0] };
    }
    var m2 = txt.match(/(?:首付|首期|预付|定金)[^0-9]{0,6}(\d{1,3})\s*%/);
    if (m2) return { amount: Math.round(total * (+m2[1]) / 100), pct: +m2[1], from: '首付' };
    return null;
  }
  function docContract(doc, txt) {
    var amt = txt.match(/(?:合同金额|金额|价款|总价)[^0-9]{0,8}([\d][\d,，.]*)\s*元/) || txt.match(/(?:CNY|RMB|人民币)\s*([\d][\d,.]*)/i);
    var money = (txt.match(/[\d][\d,]{4,}(?:\.\d+)?\s*元/g) || []);
    var vat = txt.match(/含税\s*(\d{1,2})\s*%/) || txt.match(/Tax\s*(\d{1,2})\s*%/i);
    var due = txt.match(/(20\d{2})\s*[年\-]\s*(\d{1,2})\s*[月\-]\s*(\d{1,2})/);
    var total = amt ? numOf(amt[1]) : (money.length ? numOf(money[0]) : null);
    if (!total) return null;
    var pay = payFirst(doc, txt, total);
    var dueStr = due ? due[1] + '-' + String(+due[2]).padStart(2, '0') + '-' + String(+due[3]).padStart(2, '0') : null;
    var rate = vat ? +vat[1] : 13;
    var b = lastBS();
    var lines = [(doc.kind === 'pdf' ? 'PDF' : 'Word') + '《' + doc.name + '》读完：合同金额 ' + fmtN(total) + ' 元' + (vat ? '（含税 ' + vat[1] + '%）' : '') + (dueStr ? '，交付期限 ' + dueStr : '') + '。'];
    if (pay) lines.push(pay.from + ' ' + (pay.pct ? pay.pct + '% · ' : '') + fmtN(pay.amount) + ' 元，已按 2026-09-30 到期排进 13 周现金预测。');
    else lines.push('没读到付款期次，现金预测不动；下面只做账面比对。');
    lines.push('账面应付账款 ' + fmtN(b.ap) + ' 元，这笔合同占 ' + (Math.round(1000 * total / Math.max(1, b.ap)) / 10) + '%；不含税 ' + fmtN(Math.round(total / (1 + rate / 100))) + ' 元计入采购成本。');
    var kv = [['合同金额', fmtN(total) + ' 元']];
    if (vat) kv.push(['税率', vat[1] + '%']);
    if (dueStr) kv.push(['交付期限', dueStr]);
    if (pay) kv.push([pay.from, fmtN(pay.amount) + ' 元']);
    kv.push(['账面应付', fmtN(b.ap) + ' 元']);
    return { text: lines.join('\n'), blocks: [kvb(kv), money.length ? tagsb(money.slice(0, 4)) : null],
      act: function () {
        if (!pay) {
          P.drawer(M.frame.body, { title: '合同解析 · ' + doc.name, sub: fmtN(total) + ' 元 · ' + doc.sizeText,
            body: [kvb(kv), h('div', { class: 'pd-pre' }, [(doc.text || '').slice(0, 600)])] });
          return;
        }
        var nd = K.ensure(M.data);
        nd.cash.apItems.push({ id: 'AP-DOC1', supplier: '合同乙方', amount: pay.amount, due: '2026-09-30', critical: false });
        nd.log.push({ seq: nd.log.length + 1, kind: 'cash', label: '合同首期进预测', detail: '《' + doc.name + '》合同金额 ' + fmtN(total) + ' 元，' + pay.from + ' ' + fmtN(pay.amount) + ' 元按 2026-09-30 到期', amount: pay.amount });
        M.week = null;
        if (M.step === 'cash') commit(nd, '合同' + pay.from + ' ' + fmtN(pay.amount) + ' 元已进 13 周现金预测');
        else { M.data = nd; recompute(); setStep('cash'); }
      } };
  }
  function docSlides(doc) {
    var txt = (doc.text || '').replace(/\s+/g, ' ');
    var titles = (doc.slides || []).map(function (s) { return s.title || ''; }).filter(Boolean);
    var mRev = txt.match(/收入[^0-9]{0,6}([\d,.]+)\s*万元/);
    var mGm = txt.match(/毛利率[^0-9]{0,4}([\d.]+)\s*%/);
    var mDso = txt.match(/(?:应收账款周转|周转)[^0-9]{0,4}(\d+)\s*天/);
    var k = M.R.kpi, st = M.R.statements;
    var rev12 = st.pl.reduce(function (t, p) { return t + p.rev; }, 0);
    if (!mRev && !mGm) return { text: 'PPT《' + doc.name + '》读完：' + doc.slides.length + ' 页，标题「' + (titles[0] || '—') + '」。没读到收入或毛利率口径，账面数字不动。', blocks: [tagsb(titles.slice(0, 4))] };
    var lines = ['PPT《' + doc.name + '》读完：' + doc.slides.length + ' 页，首页「' + (titles[0] || '—') + '」。'];
    var kv = [];
    if (mRev) { var rev = Math.round(parseFloat(mRev[1].replace(/,/g, '')) * 10000); lines.push('文档收入 ' + mRev[1] + ' 万元，账面近 12 期 ' + W(rev12) + '，差 ' + W(rev - rev12) + '。'); kv.push(['文档收入', mRev[1] + ' 万元'], ['账面 12 期', W(rev12)]); }
    if (mGm) { lines.push('文档毛利率 ' + mGm[1] + '%，账面本期 ' + k.gm + '%，差 ' + neg(Math.round((parseFloat(mGm[1]) - k.gm) * 10) / 10) + ' 个百分点。'); kv.push(['文档毛利率', mGm[1] + '%'], ['账面毛利率', k.gm + '%']); }
    if (mDso) { var dso = Math.round(365 * lastBS().ar / Math.max(1, rev12)); lines.push('文档应收周转 ' + mDso[1] + ' 天，按账面应收与 12 期收入算 ' + dso + ' 天。'); kv.push(['文档周转', mDso[1] + ' 天'], ['账面周转', dso + ' 天']); }
    return { text: lines.join('\n'), blocks: [kvb(kv), tagsb(titles.slice(0, 3))],
      act: function () { if (M.step !== 'board') setStep('board'); else { draw(); setTimeout(function () { var el = workEl().querySelectorAll('.pd-kpi')[1]; if (el) anim().pulse(el, { ms: 2200, scroll: true }); }, 120); } } };
  }
  function docMail(doc) {
    var ml = doc.mail || {}, txt = (doc.text || '').replace(/\s+/g, ' ');
    var wan = (txt.match(/([\d][\d,.]*)\s*万元/g) || []);
    var mAp = txt.match(/应付账款[^0-9]{0,6}([\d,.]+)\s*万元/);
    var mOver = txt.match(/(?:过期|逾期)[^0-9]{0,6}([\d,.]+)\s*万元/);
    var b = lastBS(), rk = M.R.risks;
    var k08 = rk.rows.filter(function (r) { return r.id === 'K08'; })[0];
    var lines = ['邮件《' + (ml.subject || doc.name) + '》读完：发件 ' + (ml.from || '—') + '，' + (ml.date || '') + (wan.length ? '，金额 ' + wan.join('、') : '') + '。'];
    var kv = [['发件', ml.from || '—'], ['主题', cut(ml.subject || '—', 14)], ['日期', ml.date || '—']];
    if (mAp) { var ap = Math.round(parseFloat(mAp[1].replace(/,/g, '')) * 10000); lines.push('邮件里本期应付 ' + mAp[1] + ' 万元，账面应付账款 ' + W(b.ap) + '，差 ' + W(b.ap - ap) + '。'); kv.push(['邮件应付', mAp[1] + ' 万元'], ['账面应付', W(b.ap)]); }
    if (mOver) { var ov = Math.round(parseFloat(mOver[1].replace(/,/g, '')) * 10000); lines.push('邮件里过期 ' + mOver[1] + ' 万元，K08 应付逾期口径 ' + W(k08 ? k08.value : 0) + '，差 ' + W((k08 ? k08.value : 0) - ov) + '。'); kv.push(['邮件过期', mOver[1] + ' 万元'], ['K08 逾期', W(k08 ? k08.value : 0)]); }
    if (!mAp && !mOver) lines.push('没读到应付或逾期金额，风险这一屏不动。');
    return { text: lines.join('\n'), blocks: [kvb(kv)],
      act: function () {
        if (!mAp && !mOver) { P.drawer(M.frame.body, { title: ml.subject || doc.name, sub: (ml.from || '—') + ' · ' + (ml.date || '') + ' · ' + doc.sizeText, body: [h('div', { class: 'pd-pre' }, [doc.text || ''])] }); return; }
        M.risk = 'K08';
        if (M.step === 'risk') { draw(); refocus('K08'); } else setStep('risk');
      } };
  }
  function onDoc(doc) {
    if (!doc || !doc.ok || !M.R) return null;
    var txt = (doc.text || '').replace(/\s+/g, ' ');
    if (doc.kind === 'excel') { var r = docTrialBalance(doc); if (r) return r; }
    if (doc.kind === 'ppt') return docSlides(doc);
    if (doc.kind === 'eml') return docMail(doc);
    if (doc.kind === 'word' || doc.kind === 'pdf' || doc.kind === 'text') { var c = docContract(doc, txt); if (c) return c; }
    if (doc.kind === 'excel') {
      var s0 = (doc.sheets || [])[0];
      return { text: 'Excel《' + doc.name + '》读完：' + doc.sheets.length + ' 张表、' + (s0 ? s0.rows.length : 0) + ' 行，表头 ' + ((s0 && s0.rows[0]) || []).slice(0, 6).join(' / ') + '。\n没有科目名称与期末余额两列，进不了逐科目核对；核对要的列是 科目编码 / 科目名称 / 期初余额 / 本期借方 / 本期贷方 / 期末余额。',
        blocks: s0 ? [mini(s0.rows[0].slice(0, 4), s0.rows.slice(1, 5).map(function (r) { return r.slice(0, 4); }))] : null };
    }
    return null;
  }

  window.DGG.chatBrain('m6', {
    opener: function (step) { return opener(step); },
    suggest: function (step) { return suggest(step); },
    answer: function (q, step) { return answer(q, step); },
    onDoc: function (doc, step) { return onDoc(doc, step); }
  });

  window.DGG = window.DGG || {};
  window.DGG.registerModule('m6', { mount: mount, unmount: unmount, onCompany: onCompany, onIndustry: onIndustry });
})();
