/* AI CFO · 财务副驾驶（六屏）
 * 接入 → 财务驾驶舱 → 三表勾稽 → 风险预警 → 现金预测 → 政策与月报
 * 全部计算走 DGG.coreM6（与 skill 同一份内核）；调整分录 / 风险处置 / 现金方案 / 政策清单都写回同一份账套，各屏随之重算
 * 纯预制、断网可用；不用任何存储 API
 */
(function () {
  'use strict';
  var sh, $root, h, DATA, P, K, LIB;
  var ACCENT = window.DGG.PALETTE.m6;
  var CAPS = [['三表勾稽', '14 条勾稽关系 · 下钻到单据 · 调整分录'], ['风险预警', '10 条规则 · 概率 × 影响矩阵 · 处置写回'], ['现金预测', '13 周现金日历 · 情景开关 · 缺口三方案'], ['政策匹配', '12 项政策条件核对 · 预计金额 · 申报清单']];
  var LEVEL = { high: ['late', '高'], mid: ['risk', '中'], low: ['done', '低'] };
  var STAT = { ok: ['ok', '正常'], warn: ['risk', '差异'], bad: ['late', '异常'], na: ['done', '不适用'] };
  var PSTAT = { ok: ['ok', '满足'], pending: ['risk', '待补材料'], no: ['done', '不符'] };
  var M = { step: 'connect', arche: null, data: null, R: null, co: null, rule: null, risk: null, week: null, charged: false, name: null, company: null, frame: null, who: 0 };

  /* ---------- 数据 ---------- */
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
    M.data = base; M.rule = null; M.risk = null; M.week = null;
    recompute();
  }
  function recompute() { M.R = K.run(M.data, LIB); M.co = K.cashOptions(M.data, LIB); }
  function commit(data, msg) { M.data = data; recompute(); draw(); if (msg && M.frame) P.toast(M.frame.body, msg); }
  function fmtN(n) { return P.fmtN(n); }
  function W(n) { return K.fmtW(n); }
  function pct(n) { return n + '%'; }

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
  function unmount() { }
  function onCompany(c) { M.company = c; M.name = c ? c.name : null; M.charged = false; loadArche(c ? archeOf(c.industry) : archeOf(sh.displayIndustryDefault())); if (M.step !== 'connect') setStep('connect'); else draw(); }
  function onIndustry(slug) { if (M.step !== 'connect' || !slug) return; var a = archeOf(slug); if (a !== M.arche) { loadArche(a); draw(); } }
  function setStep(s) { M.step = s; sh.go('m6', s); }

  /* ---------- 框架 ---------- */
  function draw() {
    sh.clear($root);
    var R = M.R, c = M.company;
    var meta = c ? [sh.industryNameOf(c.industry), sh.optText('size', c.size)].filter(Boolean).join(' · ') : M.data.period.replace('-', ' 年 ') + ' 月账';
    var tabs = [
      { key: 'connect', label: '接入' }, { key: 'board', label: '财务驾驶舱' }, { key: 'recon', label: '三表勾稽', badge: R.reconcile.counts.bad || 0 },
      { key: 'risk', label: '风险预警', badge: R.risks.counts.high || 0 }, { key: 'cash', label: '现金预测', badge: R.forecast.gap > 0 ? '缺' : 0 }, { key: 'policy', label: '政策与月报' }
    ];
    var F = P.frame({ mark: 'CFO', accent: ACCENT, modules: P.navModules('m6'),
      crumbs: ['AI CFO', tabs.filter(function (t) { return t.key === M.step; })[0].label], company: { name: M.data.company, meta: meta },
      tabs: tabs, active: M.step, onTab: function (key) { if (key === 'board' && !M.charged) enterBoard(); else setStep(key); } });
    M.frame = F; $root.appendChild(F.root);
    if (M.step === 'board' && !M.charged) { M.charged = true; sh.charge(K.CREDITS); }
    ({ connect: screenConnect, board: screenBoard, recon: screenRecon, risk: screenRisk, cash: screenCash, policy: screenPolicy })[M.step](F.work);
  }
  function enterBoard() { setStep('board'); }
  function col(cls, kids) { return h('div', { class: cls, style: 'display:flex;flex-direction:column;gap:16px' }, kids); }

  /* ---------- 屏 1：接入 ---------- */
  function screenConnect(work) {
    var d = M.data;
    work.classList.add('m6-connect');
    var g = h('div', { class: 'pd-grid' });
    var nameIn = h('input', { type: 'text', value: d.company, oninput: function (e) { M.name = e.target.value; d.company = e.target.value; var co = M.frame.root.querySelector('.pd-top .co span:nth-child(2)'); if (co) co.textContent = e.target.value; } });
    g.appendChild(P.card({ cls: 'c4', title: '企业', body: [h('div', { class: 'pd-form' }, [
      h('div', { class: 'pd-field' }, [h('label', {}, ['企业名称']), nameIn]),
      h('div', { class: 'pd-field' }, [h('label', {}, ['行业']), h('div', { style: 'font-weight:600' }, [M.company ? sh.industryNameOf(M.company.industry) + (M.company.size ? ' · ' + sh.optText('size', M.company.size) : '') : sh.industryNameOf(sh.displayIndustryDefault())])]),
      h('div', { class: 'pd-field' }, [h('label', {}, ['账期']), h('div', { style: 'font-weight:600' }, [d.period.replace('-', ' 年 ') + ' 月 · 近 12 期 · ' + d.ledger.months[0].replace('-', '.') + ' 至 ' + d.period.replace('-', '.')])]),
      h('div', { class: 'pd-field' }, [h('label', {}, ['纳税身份']), h('div', { style: 'font-weight:600' }, ['一般纳税人 · 增值税 ' + Math.round(d.vatRate * 100) + '% · 企业所得税 ' + Math.round(d.citRate * 100) + '%'])]),
      h('div', { class: 'pd-field' }, [h('label', {}, ['在册人数']), h('div', { style: 'font-weight:600' }, [d.profile.employees + ' 人' + (d.profile.rdStaff ? ' · 研发 ' + d.profile.rdStaff + ' 人' : '')])])
    ])] }));
    var caps = h('div');
    CAPS.forEach(function (c, i) { caps.appendChild(h('div', { class: 'cap-row' }, [h('span', { class: 'ic' }, ['0' + (i + 1)]), h('div', {}, [h('div', { class: 't' }, [c[0]]), h('div', { class: 's' }, [c[1]])]), P.chip('ok', '已开通')])); });
    g.appendChild(P.card({ cls: 'c4', title: '已开通能力', sub: '4 项', body: [caps], foot: ['进入驾驶舱后各屏动作写回同一份账，月报随之更新'] }));
    var srcs = h('div');
    d.sources.forEach(function (s) { srcs.appendChild(h('div', { class: 'src-row' }, [h('div', {}, [h('div', { class: 't' }, [s.name]), h('div', { class: 's' }, ['同步 ' + s.lastSync + ' · ' + fmtN(s.rows) + ' 条'])]), P.chip(s.mode === 'direct' ? 'ok' : 'watch', s.mode === 'direct' ? '系统直连' : '表格导入'), h('span', { class: 'pd-dot ' + (s.mode === 'direct' ? 'ok' : 'risk') })])); });
    g.appendChild(P.card({ cls: 'c4', title: '账套来源', sub: d.sources.length + ' 个', body: [srcs], foot: ['勾稽以账面为一方、外部来源为另一方；来源越全，能核的关系越多'] }));
    g.appendChild(h('div', { class: 'c12 go' }, [
      h('div', {}, [h('div', { class: 't' }, ['财务驾驶舱']), h('div', { class: 's' }, ['本期收入 ' + W(M.R.kpi.rev) + ' · 勾稽 ' + LIB.rules.rules.length + ' 条 · 风险规则 ' + LIB.riskRules.rules.length + ' 条 · 政策 ' + LIB.policies.policies.length + ' 项'])]),
      h('div', { class: 'sp' }), h('div', { class: 'cr' }, [h('b', { class: 'num' }, [String(K.CREDITS)]), ' 积分 / 次']),
      P.btn('进入财务驾驶舱', { cls: 'primary big', onClick: enterBoard })
    ]));
    work.appendChild(g);
  }

  /* ---------- 屏 2：驾驶舱 ---------- */
  function screenBoard(work) {
    var R = M.R, k = R.kpi, st = R.statements, d = M.data;
    var g = h('div', { class: 'pd-grid' });
    g.appendChild(h('div', { class: 'c12' }, [P.kpis([
      { label: '本期收入', value: W(k.rev), sub: '环比 ' + (k.revMoM >= 0 ? '+' : '') + k.revMoM + '%', tone: k.revMoM < 0 ? 'risk' : 'ok' },
      { label: '毛利率', value: k.gm, unit: '%', sub: '上期 ' + k.gmPrev + '%', tone: k.gm < k.gmPrev ? 'risk' : 'ok' },
      { label: '净利润', value: W(k.netProfit), sub: '净利率 ' + k.nm + '%' },
      { label: '经营现金流', value: W(k.cfo), tone: k.cfo < 0 ? 'late' : 'ok', sub: '间接法 · 本期' },
      { label: '账户余额', value: W(k.cash), sub: '可用 ' + k.cashMonths + ' 个月刚性支出', tone: k.cashMonths < 1 ? 'late' : k.cashMonths < 3 ? 'risk' : 'ok' },
      { label: '应收逾期', value: W(k.arOverdue), sub: '90 天以上 ' + W(k.arOverdue90), tone: k.arOverdue90 > 0 ? 'risk' : 'ok', onClick: function () { M.risk = 'K01'; setStep('risk'); } },
      { label: '勾稽异常', value: k.anomaliesBad, unit: '处', sub: '已调整 ' + k.fixed + ' 笔', tone: k.anomaliesBad ? 'late' : 'ok', onClick: function () { setStep('recon'); } },
      { label: '政策可享', value: W(k.policyAmount), sub: k.policyOk + ' 项 · 预计', tone: 'accent', onClick: function () { setStep('policy'); } }
    ])]));
    // 趋势
    var labels = st.pl.map(function (p) { return p.label; });
    g.appendChild(P.card({ cls: 'c8', title: '近 12 期收入与毛利率', sub: '收入（万元）· 毛利率（%）', body: [P.lineChart({ labels: labels, right: true, series: [
      { name: '收入', values: st.pl.map(function (p) { return Math.round(p.rev / 10000); }), color: '#0E9F6E', bar: true },
      { name: '毛利率', values: st.pl.map(function (p) { return Math.round(p.gm * 1000) / 10; }), color: '#E8862B', right: true, fmt: function (v) { return v + '%'; } }
    ] })], foot: [h('span', {}, [h('i', { class: 'pd-dot ok' }), '收入柱']), h('span', {}, [h('i', { class: 'pd-dot', style: 'background:#E8862B' }), '毛利率线（右轴）']), '近三期毛利率 ' + st.pl.slice(-3).map(function (p) { return (Math.round(p.gm * 1000) / 10) + '%'; }).join(' → ')] }));
    // 勾稽状态
    var rec = R.reconcile;
    var bad = rec.rows.filter(function (r) { return r.status === 'bad'; });
    var list = h('div', { class: 'pd-list' });
    bad.slice(0, 4).forEach(function (r) { list.appendChild(P.item({ tone: 'late', icon: r.id, title: r.name, sub: r.explain, right: W(Math.abs(r.diff)), rightSub: '差异', onClick: function () { M.rule = r.id; setStep('recon'); } })); });
    if (!bad.length) list.appendChild(P.empty('14 条勾稽关系全部正常'));
    g.appendChild(P.card({ cls: 'c4', title: '三表勾稽', sub: rec.counts.ok + ' 正常 · ' + rec.counts.warn + ' 差异 · ' + rec.counts.bad + ' 异常', body: [h('div', { class: 'm6-stmts' }, [['利润表', rec.rows.filter(function (r) { return r.pair.indexOf('利润表') >= 0 && r.status === 'bad'; }).length], ['资产负债表', rec.rows.filter(function (r) { return r.pair.indexOf('资产负债表') >= 0 && r.status === 'bad'; }).length], ['现金流量表', rec.rows.filter(function (r) { return r.pair.indexOf('现金流量表') >= 0 && r.status === 'bad'; }).length]].map(function (x) { return h('span', { class: 'st' }, [h('b', {}, [x[0]]), P.chip(x[1] ? 'late' : 'ok', x[1] ? x[1] + ' 处异常' : '正常')]); })), list], extra: [P.btn('全部', { cls: 'sm', onClick: function () { setStep('recon'); } })] }));
    // 风险榜
    var rk = R.risks, rl = h('div', { class: 'pd-list' });
    rk.rows.filter(function (r) { return r.level !== 'low'; }).slice(0, 5).forEach(function (r) { rl.appendChild(P.item({ tone: LEVEL[r.level][0], icon: LEVEL[r.level][1], title: r.name, sub: r.metricLabel + ' ' + r.value + r.unit + ' · 参考 ' + r.band.join('–') + r.unit + (r.handled.length ? ' · 已处置' : ''), right: W(r.impact), rightSub: '概率 ' + Math.round(r.prob * 100) + '%', onClick: function () { M.risk = r.id; setStep('risk'); } })); });
    g.appendChild(P.card({ cls: 'c4', title: '风险榜', sub: '高 ' + rk.counts.high + ' · 中 ' + rk.counts.mid + ' · 已处置 ' + rk.counts.handled, body: [rl], extra: [P.btn('矩阵', { cls: 'sm', onClick: function () { setStep('risk'); } })] }));
    // 现金缩略
    var f = R.forecast;
    g.appendChild(P.card({ cls: 'c8', title: '13 周现金', sub: '期初 ' + W(f.opening) + ' · 最低 第 ' + (f.minWeek + 1) + ' 周 ' + W(f.minEnding) + (f.gap ? ' · 低于安全线 ' + W(f.gap) : ' · 在安全线以上'), body: [P.cashChart({ weeks: f.weeks, opening: f.opening, safety: f.safety, minWeek: f.minWeek, height: 220, onWeek: function (i) { M.week = i; setStep('cash'); } })], foot: [f.gap ? h('span', { style: 'color:var(--t-late);font-weight:700' }, ['缺口周：' + f.gapWeeks.map(function (w) { return '第 ' + (w + 1) + ' 周'; }).join('、')]) : h('span', {}, ['无缺口周']), h('span', {}, ['AI 推荐 ' + M.co.recommend + ' · ' + M.co.options.filter(function (o) { return o.key === M.co.recommend; })[0].name]), P.btn('看方案', { cls: 'sm', onClick: function () { setStep('cash'); } })] }));
    // 政策摘要 + 处置
    var po = R.policies, pl = h('div', { class: 'pd-list' });
    po.rows.filter(function (p) { return p.status !== 'no'; }).slice(0, 5).forEach(function (p) { pl.appendChild(P.item({ tone: p.status === 'ok' ? 'ok' : 'risk', icon: p.status === 'ok' ? '✓' : '补', title: p.name, sub: p.reason, right: W(p.amount), rightSub: p.listed ? '已加入清单' : '预计', onClick: function () { setStep('policy'); } })); });
    var right = col('c4', [P.card({ title: '政策匹配', sub: '可享 ' + po.counts.ok + ' 项 ' + W(po.amountOk) + ' · 待补 ' + po.counts.pending + ' 项', body: [pl], extra: [P.btn('清单', { cls: 'sm', onClick: function () { setStep('policy'); } })] })]);
    if (d.log.length) right.appendChild(P.card({ title: '本期处置', sub: d.log.length + ' 条', body: [logList(d.log.slice(-5).reverse())] }));
    g.appendChild(right);
    work.appendChild(g);
  }
  function logList(log) {
    var el = h('div', { class: 'm6-log' });
    log.forEach(function (l) { el.appendChild(h('div', { class: 'l' }, [h('span', { class: 'n' }, [String(l.seq)]), h('b', {}, [l.label]), h('span', {}, [l.detail + (l.amount ? ' · ' + fmtN(l.amount) + ' 元' : '')])])); });
    return el;
  }

  /* ---------- 屏 3：三表勾稽 ---------- */
  function screenRecon(work) {
    var R = M.R, rec = R.reconcile, st = R.statements, d = M.data, P0 = d.ledger.months.length - 1;
    if (!M.rule) { var fb = rec.rows.filter(function (r) { return r.status === 'bad'; })[0]; M.rule = fb ? fb.id : rec.rows[0].id; }
    var row = rec.rows.filter(function (r) { return r.id === M.rule; })[0];
    var g = h('div', { class: 'pd-grid' });
    g.appendChild(h('div', { class: 'c12' }, [P.kpis([
      { label: '勾稽关系', value: rec.rows.length, unit: '条', sub: '账面 ↔ 银行 / ERP / 发票 / 台账 / 合同' },
      { label: '正常', value: rec.counts.ok, unit: '条', tone: 'ok' }, { label: '差异', value: rec.counts.warn, unit: '条', tone: 'risk', sub: '3 倍容差内' },
      { label: '异常', value: rec.counts.bad, unit: '条', tone: rec.counts.bad ? 'late' : 'ok', sub: '超过 3 倍容差' }, { label: '已调整', value: rec.counts.fixed, unit: '笔', tone: 'accent', sub: '待会计复核' },
      { label: '本期资产总计', value: W(rec.metrics.assets), sub: '负债 ' + W(rec.metrics.liabilities) + ' · 权益 ' + W(rec.metrics.equity) }
    ])]));
    var tbl = P.table({ cols: [
      { key: 'id', label: '编号', render: function (r) { return h('b', { class: 'id' }, [r.id]); } },
      { key: 'name', label: '勾稽关系', render: function (r) { return h('span', {}, [h('b', {}, [r.name]), h('span', { class: 'sub' }, [r.pair])]); } },
      { key: 'lhs', label: '本期数', align: 'r', render: function (r) { return r.status === 'na' ? '—' : fmtN(r.lhs); } },
      { key: 'rhs', label: '勾稽值', align: 'r', render: function (r) { return r.status === 'na' ? '—' : fmtN(r.rhs); } },
      { key: 'diff', label: '差异', align: 'r', sort: function (r) { return Math.abs(r.diff); }, render: function (r) { return r.status === 'na' ? '—' : h('span', { class: r.status === 'bad' ? 'neg' : '' }, [fmtN(r.diff)]); } },
      { key: 'status', label: '判断', sort: function (r) { return { bad: 0, warn: 1, ok: 2, na: 3 }[r.status]; }, render: function (r) { return h('span', {}, [P.chip(STAT[r.status][0], STAT[r.status][1]), r.fixed ? P.chip('handled', '已调整') : null]); } }
    ], rows: rec.rows, rowKey: function (r) { return r.id; }, activeKey: M.rule, onRow: function (r) { M.rule = r.id; draw(); } });
    g.appendChild(P.card({ cls: 'c7', title: '勾稽关系', sub: '点一条看下钻与判断', tight: true, body: [h('div', { class: 'pd-scroll', style: 'max-height:560px' }, [tbl])] }));
    // 焦点
    var right = col('c5', []);
    var facts = h('div', { class: 'pd-kv' }, [h('span', { class: 'k' }, [row.lhsLabel || '本期数']), h('span', { class: 'v num' }, [row.status === 'na' ? '—' : fmtN(row.lhs) + ' 元']), h('span', { class: 'k' }, [row.rhsLabel || '勾稽值']), h('span', { class: 'v num' }, [row.status === 'na' ? '—' : fmtN(row.rhs) + ' 元']), h('span', { class: 'k' }, ['差异 / 容差']), h('span', { class: 'v num ' + (row.status === 'bad' ? 'neg' : '') }, [row.status === 'na' ? '—' : fmtN(row.diff) + ' / ' + fmtN(row.tol) + ' 元'])]);
    var drillEl = null;
    if (row.drill && row.drill.type === 'table') drillEl = P.table({ compact: true, cols: row.drill.cols.map(function (c, i) { return { key: 'c' + i, label: c, align: /金额|差异|原值|月折旧|本金|ERP|账面/.test(c) ? 'r' : '' }; }), rows: row.drill.rows.map(function (r) { var o = {}; r.forEach(function (v, i) { o['c' + i] = v; }); return o; }) });
    else if (row.drill) drillEl = P.kv(row.drill.rows);
    var actEl = h('div', { class: 'pd-actions' });
    if (row.fixed) { var adj = d.adjustments.filter(function (a) { return a.rule === row.id; })[0]; actEl.appendChild(h('div', { class: 'pd-action' }, [h('div', { class: 't' }, [h('span', { class: 'rank' }, ['✓']), adj.label]), h('span', { class: 'done' }, ['已执行']), h('div', { class: 'd' }, [adj.entry.map(function (e) { return e.join(' '); }).join('；') + '，待会计复核'])])); }
    else if (row.fix) actEl.appendChild(h('div', { class: 'pd-action best' }, [h('div', { class: 't' }, [h('span', { class: 'rank' }, ['1']), row.fix.label, h('span', { style: 'color:var(--pd-sub);font-weight:500' }, ['· ' + fmtN(row.fix.amount) + ' 元'])]), P.btn('按建议调整', { cls: 'primary sm', onClick: function () { commit(K.applyFix(d, row.id, LIB), '已生成调整分录：' + row.fix.label + ' ' + fmtN(row.fix.amount) + ' 元，待会计复核 · 三表已重算'); } }), h('div', { class: 'd' }, [h('div', { class: 'm6-entry' }, row.fix.entry.map(function (e) { return h('div', {}, [h('span', { class: e[0] === '借' ? 'dr' : 'cr' }, [e[0]]), h('span', {}, [e[1]]), h('b', { class: 'num' }, [e[2]])]); })), row.fix.note ? h('div', { style: 'margin-top:6px' }, [row.fix.note]) : null])]));
    else if (row.status === 'bad' || row.status === 'warn') actEl.appendChild(h('div', { class: 'pd-action' }, [h('div', { class: 't' }, [h('span', { class: 'rank' }, ['1']), '核实凭证']), h('span'), h('div', { class: 'd' }, ['差异在容差之外，需要会计核对原始凭证后判断'])]));
    else actEl.appendChild(P.empty('无需处理'));
    var tone = row.status === 'bad' ? 'late' : row.status === 'warn' ? 'risk' : row.status === 'na' ? 'done' : 'ok';
    right.appendChild(P.card({ title: row.id + ' ' + row.name, sub: row.pair, accent: true, body: [facts, drillEl ? h('div', { style: 'margin-top:12px' }, [h('div', { style: 'font-weight:700;margin-bottom:6px' }, [row.drill.title]), drillEl]) : null] }));
    right.appendChild(P.card({ title: 'AI 判断', sub: STAT[row.status][1], body: [P.judge({ verdict: { tone: tone, chip: STAT[row.status][1], text: row.status === 'na' ? '本企业无此科目' : row.explain }, seen: rec.seen, reasons: [row.explain].concat(rec.reasons.filter(function (t) { return t.indexOf('同源') >= 0 && (row.id === 'R03' || row.id === 'R07'); })), actionsEl: actEl, actionsTitle: '建议动作 · 分录已按本期数字填好' })] }));
    g.appendChild(right);
    // 三表快照
    var p = st.pl[P0], b = st.bs[P0 + 1], c = st.cf[P0];
    var snap = function (title, rows) { return P.card({ title: title, sub: d.period.replace('-', '.') , body: [P.kv(rows.map(function (r) { return [r[0], fmtN(r[1])]; }))] }); };
    g.appendChild(h('div', { class: 'c4' }, [snap('利润表', [['营业收入', p.rev], ['营业成本', p.cogs], ['毛利', p.gross], ['销售费用', p.sellExp], ['管理费用', p.adminExp], ['研发费用', p.rdExp], ['财务费用', p.finExp], ['利润总额', p.ebt], ['所得税费用', p.incomeTax], ['净利润', p.netProfit]])]));
    g.appendChild(h('div', { class: 'c4' }, [snap('资产负债表', [['货币资金', b.cash], ['应收账款', b.ar], ['存货', b.inventory], ['预付账款', b.prepaid], ['固定资产净值', b.fixedNet], ['资产总计', b.assets], ['应付账款', b.ap], ['应付职工薪酬', b.wagesPayable], ['应交税费', b.taxesPayable], ['短期借款', b.shortLoan], ['长期借款', b.longLoan], ['所有者权益', b.equity]])]));
    g.appendChild(h('div', { class: 'c4' }, [snap('现金流量表（间接法）', [['净利润', c.netProfit], ['折旧', c.dep], ['应收账款变动', -c.dAR], ['存货变动', -c.dInv], ['应付账款变动', c.dAP], ['经营活动现金流', c.cfo], ['投资活动现金流', c.cfi], ['筹资活动现金流', c.cff], ['现金净增加额', c.net], ['货币资金变动', c.dCash]])]));
    work.appendChild(g);
  }

  /* ---------- 屏 4：风险预警 ---------- */
  function screenRisk(work) {
    var R = M.R, rk = R.risks, d = M.data;
    if (!M.risk || !rk.rows.filter(function (r) { return r.id === M.risk; }).length) M.risk = rk.rows[0].id;
    var row = rk.rows.filter(function (r) { return r.id === M.risk; })[0];
    var g = h('div', { class: 'pd-grid' });
    g.appendChild(h('div', { class: 'c12' }, [P.kpis([
      { label: '高风险', value: rk.counts.high, unit: '项', tone: rk.counts.high ? 'late' : 'ok' }, { label: '中风险', value: rk.counts.mid, unit: '项', tone: 'risk' }, { label: '低风险', value: rk.counts.low, unit: '项' },
      { label: '已处置', value: rk.counts.handled, unit: '项', tone: 'accent' }, { label: '应收逾期', value: W(rk.arOverdue), sub: '90 天以上 ' + W(rk.arOverdue90), tone: 'risk' },
      { label: '现金可用', value: rk.cashMonths, unit: '月', sub: '月均刚性支出 ' + W(rk.fixedOut), tone: rk.cashMonths < 1 ? 'late' : rk.cashMonths < 3 ? 'risk' : 'ok' }
    ])]));
    g.appendChild(P.card({ cls: 'c6', title: '风险矩阵', sub: '横轴发生概率 · 纵轴影响金额 · 点圆点看证据', body: [P.matrix({ points: rk.rows.map(function (r) { return { id: r.id, short: r.id.replace('K', ''), label: r.name, prob: r.prob, impact: r.impact, level: r.level, handled: r.handled.length > 0, onClick: function () { M.risk = r.id; draw(); } }; }) }), h('div', { class: 'pd-legend', style: 'margin-top:8px' }, [h('span', {}, [h('i', { style: 'background:#D9483B' }), '高']), h('span', {}, [h('i', { style: 'background:#E8A33D' }), '中']), h('span', {}, [h('i', { style: 'background:#7C8799' }), '低']), h('span', {}, [h('i', { style: 'background:#fff;border:2px solid #E8A33D' }), '已处置'])])] }));
    var actEl = h('div', { class: 'pd-actions' });
    row.handled.forEach(function (a) { actEl.appendChild(h('div', { class: 'pd-action' }, [h('div', { class: 't' }, [h('span', { class: 'rank' }, ['✓']), a.label]), h('span', { class: 'done' }, ['已执行']), h('div', { class: 'd' }, [a.detail])])); });
    row.actions.forEach(function (a, i) {
      var done = row.handled.filter(function (x) { return x.key === a.key; }).length > 0;
      if (done) return;
      actEl.appendChild(h('div', { class: 'pd-action' + (i === 0 && row.level !== 'low' ? ' best' : '') }, [h('div', { class: 't' }, [h('span', { class: 'rank' }, [String(i + 1)]), a.label]), P.btn(a.key === 'gotoCash' ? '去看' : '执行', { cls: i === 0 && row.level !== 'low' ? 'primary sm' : 'sm', onClick: function () { if (a.key === 'gotoCash') { setStep('cash'); return; } commit(K.applyRiskAction(d, row.id, a.key, LIB), '已' + a.label + ' · ' + row.name + '重新评估，现金预测与月报已更新'); } }), h('div', { class: 'd' }, [a.desc])]));
    });
    var bandText = row.dir === 'high' ? '不高于 ' + row.band[1] + row.unit : '不低于 ' + row.band[0] + row.unit;
    g.appendChild(col('c6', [P.card({ title: row.name, sub: row.cat, accent: true, body: [
      h('div', { class: 'm6-riskhead' }, [P.chip(LEVEL[row.level][0], LEVEL[row.level][1] + '风险'), h('span', { class: 'm' }, [h('b', { class: 'num' }, [row.value + row.unit]), h('span', {}, [row.metricLabel + ' · 参考 ' + bandText])]), h('span', { class: 'm' }, [h('b', { class: 'num' }, [Math.round(row.prob * 100) + '%']), h('span', {}, ['发生概率'])]), h('span', { class: 'm' }, [h('b', { class: 'num' }, [W(row.impact)]), h('span', {}, ['影响 · ' + row.impactNote])])]),
      P.judge({ seen: row.evidence, reasons: [row.inBand ? '指标在参考带内，按影响金额列入关注' : row.metricLabel + ' ' + row.value + row.unit + '，超出参考带（' + bandText + '）' + (row.handled.length ? '；已处置 ' + row.handled.length + ' 项，概率下调' : '')], actionsEl: actEl, actionsTitle: '处置动作 · 执行后写回现金预测与月报' })
    ] })]));
    var tbl = P.table({ cols: [
      { key: 'name', label: '风险', render: function (r) { return h('span', {}, [h('b', {}, [r.id + ' ' + r.name]), h('span', { class: 'sub' }, [r.cat])]); } },
      { key: 'value', label: '指标', align: 'r', render: function (r) { return h('span', {}, [h('b', { class: r.inBand ? '' : 'neg' }, [r.value + r.unit]), h('span', { class: 'sub' }, [r.metricLabel])]); } },
      { key: 'band', label: '参考带', align: 'c', render: function (r) { return r.band.join('–') + r.unit; } },
      { key: 'prob', label: '概率', align: 'r', sort: true, render: function (r) { return P.bar(r.prob * 100, r.level === 'high' ? 'late' : r.level === 'mid' ? 'risk' : 'ok', Math.round(r.prob * 100) + '%'); } },
      { key: 'impact', label: '影响', align: 'r', sort: true, render: function (r) { return W(r.impact); } },
      { key: 'level', label: '等级', sort: function (r) { return { high: 0, mid: 1, low: 2 }[r.level]; }, render: function (r) { return P.chip(LEVEL[r.level][0], LEVEL[r.level][1]); } },
      { key: 'h', label: '处置', render: function (r) { return r.handled.length ? P.chip('handled', r.handled.map(function (a) { return a.label; }).join('、')) : h('span', { style: 'color:var(--pd-mute)' }, ['—']); } }
    ], rows: rk.rows, rowKey: function (r) { return r.id; }, activeKey: M.risk, onRow: function (r) { M.risk = r.id; draw(); } });
    g.appendChild(P.card({ cls: 'c12', title: '风险清单', sub: rk.rows.length + ' 条规则 · 按 概率 × 影响 排序', tight: true, body: [tbl] }));
    work.appendChild(g);
  }

  /* ---------- 屏 5：现金预测 ---------- */
  function screenCash(work) {
    var R = M.R, f = R.forecast, co = M.co, d = M.data, sc = d.cashScenario;
    if (M.week == null || M.week >= f.weeks.length) M.week = f.gapWeeks.length ? f.gapWeeks[0] : f.minWeek;
    var wk = f.weeks[M.week];
    var g = h('div', { class: 'pd-grid' });
    g.appendChild(h('div', { class: 'c12' }, [P.kpis([
      { label: '期初（银行余额）', value: W(f.opening) }, { label: '13 周最低', value: W(f.minEnding), sub: '第 ' + (f.minWeek + 1) + ' 周 · ' + f.weeks[f.minWeek].label + ' 起', tone: f.minEnding < f.safety ? 'late' : 'ok' },
      { label: '低于安全线', value: W(f.gap), sub: f.gapWeeks.length ? f.gapWeeks.length + ' 周 · 安全线 ' + W(f.safety) : '无缺口周 · 安全线 ' + W(f.safety), tone: f.gap ? 'late' : 'ok' },
      { label: '流入合计', value: W(f.inflow), tone: 'ok', sub: '回款 + 在产订单 + 后续交付' }, { label: '流出合计', value: W(f.outflow), tone: 'risk', sub: '应付 + 工资税费 + 贷款 + 新采购' }, { label: '13 周末', value: W(f.ending), tone: f.ending < f.safety ? 'late' : 'ok' }
    ])]));
    var toggles = [['collectAhead', '催收提前'], ['delayAP', '延付供应商'], ['rushOrder', '加急订单回款'], ['refinance', '短贷置换'], ['payCritical', '优先付关键供应商']];
    var tg = h('div', { class: 'pd-field' }, [h('label', {}, ['情景开关 · 拨动即重算']), h('div', { class: 'chips' }, toggles.map(function (t) { return h('button', { class: sc[t[0]] ? 'on' : '', onclick: function () { var nd = clone(d); nd.cashScenario[t[0]] = !nd.cashScenario[t[0]]; M.data = nd; recompute(); draw(); } }, [t[1]]); }).concat([h('button', { class: sc.loanDraw ? 'on' : '', onclick: function () { var nd = clone(d); if (nd.cashScenario.loanDraw) { delete nd.cashScenario.loanDraw; delete nd.cashScenario.loanDrawWeek; } else { nd.cashScenario.loanDraw = 1000000; nd.cashScenario.loanDrawWeek = Math.max(0, (f.gapWeeks[0] != null ? f.gapWeeks[0] : f.minWeek) - 1); } M.data = nd; recompute(); draw(); } }, ['授信提款 100 万'])])) ]);
    g.appendChild(P.card({ cls: 'c8', title: '13 周现金日历', sub: '柱：周流入 / 流出 · 线：周末余额 · 红底：低于安全线 · 点周看明细', body: [P.cashChart({ weeks: f.weeks, opening: f.opening, safety: f.safety, minWeek: f.minWeek, active: M.week, onWeek: function (i) { M.week = i; draw(); } }), h('div', { style: 'margin-top:12px' }, [tg])] }));
    var items = h('div', { class: 'm6-items' });
    wk.items.forEach(function (it) { items.appendChild(h('div', { class: 'it' }, [P.chip({ ar: 'ok', order: 'ok', recur: 'watch', ap: 'late', fixed: 'risk', loan: 'handled', other: 'accent' }[it.kind] || 'watch', { ar: '回款', order: '订单', recur: '预计', ap: '应付', fixed: '固定', loan: '贷款', other: '其他' }[it.kind] || it.kind, true), h('span', { class: 'l' }, [it.label]), h('b', { class: 'num ' + (it.amount < 0 ? 'neg' : 'pos') }, [(it.amount < 0 ? '−' : '+') + fmtN(Math.abs(it.amount))])])); });
    if (!wk.items.length) items.appendChild(P.empty('本周无收付'));
    g.appendChild(P.card({ cls: 'c4', title: '第 ' + (M.week + 1) + ' 周 · ' + wk.label + ' 起', sub: '期初 ' + W(wk.opening) + ' → 期末 ' + W(wk.ending), body: [h('div', { class: 'pd-kv', style: 'margin-bottom:10px' }, [h('span', { class: 'k' }, ['流入']), h('span', { class: 'v num', style: 'color:var(--t-ok)' }, [fmtN(wk.inflow) + ' 元']), h('span', { class: 'k' }, ['流出']), h('span', { class: 'v num', style: 'color:var(--t-late)' }, [fmtN(wk.outflow) + ' 元']), h('span', { class: 'k' }, ['净额']), h('span', { class: 'v num' }, [fmtN(wk.net) + ' 元'])]), h('div', { class: 'pd-scroll', style: 'max-height:380px' }, [items])] }));
    // 三方案
    var opts = co.options.map(function (o) { return { key: o.key, name: o.name, recommended: o.key === co.recommend, headline: { big: W(o.minEnding), tone: o.clears ? 'ok' : 'late', sub: o.clears ? '最低点回到安全线以上' : '仍低于安全线 ' + W(o.gap) }, rows: [{ k: '缺口周', v: o.gapWeeks + ' 周', tone: o.gapWeeks ? 'bad' : 'good' }, { k: '资金成本', v: o.cost ? fmtN(o.cost) + ' 元' : '0 元' }, { k: '13 周末', v: W(o.ending) }, { k: '副作用', v: o.side }], notes: o.desc }; });
    g.appendChild(P.card({ cls: 'c12', title: '补缺方案', sub: f.gap ? '当前缺口 ' + W(f.gap) + ' · 三个方案各在副本上重算' : '当前无缺口 · 三个方案给的是余量', body: [P.compare({ options: opts, active: co.recommend }), h('div', { class: 'm6-reason' }, [h('span', { class: 'tag' }, ['AI 推荐 ' + co.recommend]), h('span', {}, [co.reason])])],
      foot: [P.btn('按方案 ' + co.recommend + ' 执行', { cls: 'primary', onClick: function () { commit(K.applyCashOption(d, co.recommend, LIB), '已执行现金方案 ' + co.recommend + ' · 驾驶舱与月报已更新'); } }), h('span', {}, ['执行后计入本期处置，情景开关同步打开'])] }));
    work.appendChild(g);
  }

  /* ---------- 屏 6：政策与月报 ---------- */
  function screenPolicy(work) {
    var R = M.R, po = R.policies, rep = R.report, d = M.data;
    work.classList.add('m6-policy');
    var g = h('div', { class: 'pd-grid' });
    g.appendChild(h('div', { class: 'c12' }, [P.kpis([
      { label: '可享', value: po.counts.ok, unit: '项', tone: 'ok', sub: '预计 ' + W(po.amountOk) }, { label: '待补材料', value: po.counts.pending, unit: '项', tone: 'risk', sub: '预计 ' + W(po.amountPending) },
      { label: '不符', value: po.counts.no, unit: '项' }, { label: '已加入申报清单', value: po.counts.listed, unit: '项', tone: 'accent', sub: '预计 ' + W(po.amountListed) },
      { label: '研发费用占比', value: Math.round(po.env.rdShare * 10) / 10, unit: '%', sub: '近 12 期 ' + W(po.env.rdExp12) }, { label: '应纳税所得额', value: W(po.env.taxable12), sub: '研发加计扣除后 · 近 12 期' }
    ])]));
    var tbl = P.table({ cols: [
      { key: 'name', label: '政策', render: function (p) { return h('span', {}, [h('b', {}, [p.name]), h('span', { class: 'sub' }, [p.level + ' · ' + p.condText])]); } },
      { key: 'status', label: '核对', sort: function (p) { return { ok: 0, pending: 1, no: 2 }[p.status]; }, render: function (p) { return P.chip(PSTAT[p.status][0], PSTAT[p.status][1]); } },
      { key: 'amount', label: '预计金额', align: 'r', sort: true, render: function (p) { return p.amount ? h('span', {}, [h('b', {}, [fmtN(p.amount) + ' 元']), p.deferred ? h('span', { class: 'sub' }, ['递延']) : null]) : '—'; } },
      { key: 'reason', label: '依据 · 申报窗口', cls: 'w320', render: function (p) { return h('span', {}, [p.reason, h('span', { class: 'sub' }, [p.window])]); } },
      { key: 'listed', label: '申报清单', align: 'c', render: function (p) { return p.status === 'no' ? '—' : P.btn(p.listed ? '已加入' : '加入', { cls: 'sm' + (p.listed ? ' primary' : ''), onClick: function (e) { e.stopPropagation(); commit(K.togglePolicy(d, p.id), (p.listed ? '已移出申报清单：' : '已加入申报清单：') + p.name); } }); } }
    ], rows: po.rows, sortKey: 'status', onRow: function (p) { openPolicy(p); } });
    g.appendChild(P.card({ cls: 'c8', title: '政策匹配', sub: po.rows.length + ' 项 · 按企业画像与账套核对 · 金额为预计，以申报口径为准', tight: true, body: [h('div', { class: 'pd-scroll', style: 'max-height:520px' }, [tbl])] }));
    var listed = po.rows.filter(function (p) { return p.listed; });
    var ll = h('div', { class: 'pd-list' });
    listed.forEach(function (p) { ll.appendChild(P.item({ tone: 'ok', icon: '✓', title: p.name, sub: p.window, right: W(p.amount), rightSub: p.deferred ? '递延' : '预计' })); });
    if (!listed.length) ll.appendChild(P.empty('从左表把可享政策加入清单'));
    var right = col('c4', [P.card({ title: '申报清单', sub: listed.length + ' 项 · ' + W(po.amountListed), body: [ll], foot: listed.length ? ['材料：' + listed.map(function (p) { return p.need[0]; }).filter(function (v, i, a) { return a.indexOf(v) === i; }).slice(0, 3).join('、')] : null })]);
    var who = h('div', { class: 'who' });
    ['总经理', '财务负责人', '出纳', '税务专员'].forEach(function (w, i) { who.appendChild(h('button', { class: i === M.who ? 'on' : '', onclick: function () { M.who = i; draw(); } }, [w])); });
    right.appendChild(P.card({ title: '财务月报', sub: d.period.replace('-', ' 年 ') + ' 月 · 微信文本版', body: [h('div', { class: 'pd-field' }, [h('label', {}, ['收件人']), who]), h('div', { class: 'pd-pre', style: 'margin-top:10px' }, [rep.text])], foot: [P.btn('发送到微信', { cls: 'primary', onClick: function () { sh.setQrReady(true); sh.showWeChat(); } }), P.btn('回到驾驶舱', { onClick: function () { setStep('board'); } })] }));
    g.appendChild(right);
    work.appendChild(g);
  }
  function openPolicy(p) {
    var body = [P.kv([['核对', PSTAT[p.status][1]], ['条件', p.condText], ['依据', p.reason], ['预计金额', p.amount ? fmtN(p.amount) + ' 元' + (p.deferred ? '（递延）' : '') : '—'], ['申报窗口', p.window], ['级别', p.level]]), h('div', {}, [h('div', { style: 'font-weight:700;margin-bottom:6px' }, ['所需材料']), h('ul', { style: 'margin:0;padding-left:18px;display:grid;gap:4px' }, p.need.map(function (t) { return h('li', {}, [t]); }))])];
    var acts = [P.btn('关闭', { onClick: function () { dr.close(); } })];
    if (p.status !== 'no') acts.unshift(P.btn(p.listed ? '移出申报清单' : '加入申报清单', { cls: 'primary', onClick: function () { dr.close(); commit(K.togglePolicy(M.data, p.id), (p.listed ? '已移出申报清单：' : '已加入申报清单：') + p.name); } }));
    var dr = P.drawer(M.frame.body, { title: p.name, sub: p.level + ' · ' + PSTAT[p.status][1], body: body, actions: acts });
  }

  window.DGG = window.DGG || {};
  window.DGG.registerModule('m6', { mount: mount, unmount: unmount, onCompany: onCompany, onIndustry: onIndustry });
})();
