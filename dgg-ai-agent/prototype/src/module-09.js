/* AI决策 · 指标 归因 方案 审批（六屏）
 * 接入 → 决策驾驶舱 → 指标归因 → 方案预演 → 审批 → 执行与复盘
 * 全部计算走 DGG.coreM9（与 skill 同一份内核）；发起审批 / 批准 / 驳回 / 节点更新都写回同一份数据
 * 指标从 AI CFO / AI ERP / AI获客 / AI人力官 / AI法务 的样本取数；纯预制、断网可用；不用任何存储 API
 */
(function () {
  'use strict';
  var sh, $root, h, DATA, P, K, LIB;
  var ACCENT = { pa: '#C2255C', soft: '#FBE7EE', ink: '#8E1A44' };
  var CAPS = [['指标树', '31 个节点 · 六组 · 与预算或上期比给红黄绿'], ['指标归因', '连环替代法拆到驱动因子 · 证据卡指回对应模块'], ['方案预演', '按根因两到三个方案 · 参数可调 · 12 个月走势与净效益'], ['审批与复盘', '会签意见 · 总经理终批 · 决议编号 · 节点跟踪 · 复盘']];
  var STATUS_TONE = { ok: 'ok', watch: 'risk', risk: 'late' };
  var OP_TONE = { agree: 'ok', cond: 'risk', object: 'late' };
  var AP_TONE = { pending: 'watch', approved: 'ok', rejected: 'done' }, AP_NAME = { pending: '待终批', approved: '已批准', rejected: '已驳回' };
  var SRC_SHORT = { m4: '获客', m5: '人力官', m6: 'CFO', m7: '法务', m10: 'ERP' }, GROUP_ICON = { profit: '利', cash: '现', delivery: '交', growth: '客', people: '人', compliance: '合' };
  var SCREEN = { m6: { risks: 'risk', statements: 'recon', reconcile: 'recon', cash: 'cash', board: 'board' }, m10: { board: 'room', materials: 'stock', orders: 'order' }, m4: { board: 'board', leads: 'leads' }, m5: { board: 'board', compliance: 'compliance', recruit: 'recruit' }, m7: { contracts: 'contracts' } };
  var M = { step: 'connect', arche: null, data: null, R: null, metric: 'profit', basis: 'prev', factor: null, cause: null, params: {}, option: null, approval: null, decision: null, comment: '', charged: false, name: null, company: null, frame: null, who: 0 };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function sectorOf(slug) { var hit = null; (DATA.industries.sectors || []).forEach(function (s) { (s.industries || []).forEach(function (i) { if (i.slug === slug) hit = s.key; }); }); return hit; }
  function archeOf(slug) { var sec = sectorOf(slug); var a = (sec && DATA.m10.archetypes.map[sec]) || 'make'; if (a === 'project') a = 'service'; return DATA.m9.samples[a] ? a : 'make'; }
  function loadArche(a) {
    M.arche = a;
    var sample = DATA.m9.samples[a], base = K.ensure(sample);
    if (M.name && M.name !== sample.company) base.company = M.name;
    M.data = base; M.metric = 'profit'; M.basis = 'prev'; M.factor = null; M.cause = null; M.params = {}; M.option = null; M.approval = null; M.decision = null; M.comment = '';
    recompute();
  }
  function recompute() { M.R = K.run(M.data, LIB, { metric: M.metric, basis: M.basis }); }
  function commit(data, msg) { M.data = data; recompute(); draw(); if (msg && M.frame) P.toast(M.frame.body, msg); }
  function fmtN(n) { return P.fmtN(n); }
  function W(n) { return K.fmtW(n); }
  function short(s) { return K.short(s); }
  function W0(n) { return Math.abs(n) >= 1000000 ? fmtN(Math.round(n / 10000)) + ' 万元' : K.fmtW(n); }

  function mount(root, step, shell) {
    sh = shell; $root = root; h = sh.h; DATA = sh.DATA; P = window.DGG.pui; K = window.DGG.coreM9;
    LIB = { metricTree: DATA.m9.metricTree, evidence: DATA.m9.evidence, playbooks: DATA.m9.playbooks, approvalRules: DATA.m9.approvalRules };
    P.init(sh);
    var c = sh.getCompany();
    if (!M.data) { M.company = c; M.name = c ? c.name : null; loadArche(c ? archeOf(c.industry) : archeOf(sh.displayIndustryDefault())); }
    M.step = step || 'connect';
    if (['connect', 'board', 'attr', 'options', 'approval', 'execute'].indexOf(M.step) < 0) M.step = 'connect';
    draw();
  }
  function unmount() { }
  function onCompany(c) { M.company = c; M.name = c ? c.name : null; M.charged = false; loadArche(c ? archeOf(c.industry) : archeOf(sh.displayIndustryDefault())); if (M.step !== 'connect') setStep('connect'); else draw(); }
  function onIndustry(slug) { if (M.step !== 'connect' || !slug) return; var a = archeOf(slug); if (a !== M.arche) { loadArche(a); draw(); } }
  function setStep(s) { M.step = s; sh.go('m9', s); }

  function draw() {
    sh.clear($root);
    recompute();
    var R = M.R, c = M.company, k = R.kpi;
    var meta = c ? [sh.industryNameOf(c.industry), sh.optText('size', c.size)].filter(Boolean).join(' · ') : '';
    var tabs = [{ key: 'connect', label: '接入' }, { key: 'board', label: '决策驾驶舱', badge: k.risk || 0 }, { key: 'attr', label: '指标归因' }, { key: 'options', label: '方案预演' }, { key: 'approval', label: '审批', badge: k.pending || 0 }, { key: 'execute', label: '执行与复盘', badge: k.overdueMilestones || 0 }];
    var F = P.frame({ mark: '决策', accent: ACCENT, modules: P.navModules('m9'), crumbs: ['AI决策', tabs.filter(function (t) { return t.key === M.step; })[0].label], company: { name: M.data.company, meta: meta + (meta ? ' · ' : '') + M.data.period.replace('-', ' 年 ') + ' 月账期' }, tabs: tabs, active: M.step, onTab: function (key) { if (key === 'board' && !M.charged) enterBoard(); else setStep(key); } });
    M.frame = F; $root.appendChild(F.root);
    if (M.step === 'board' && !M.charged) { M.charged = true; sh.charge(K.CREDITS); }
    ({ connect: screenConnect, board: screenBoard, attr: screenAttr, options: screenOptions, approval: screenApproval, execute: screenExecute })[M.step](F.work);
  }
  function enterBoard() { setStep('board'); }
  function col(cls, kids) { return h('div', { class: cls, style: 'display:flex;flex-direction:column;gap:16px' }, kids); }
  function stChip(st) { return P.chip(STATUS_TONE[st], K.STATUS_NAME[st]); }
  function logList(log) { var el = h('div', { class: 'm9-log' }); log.forEach(function (l) { el.appendChild(h('div', { class: 'l' }, [h('span', { class: 'n' }, [String(l.seq)]), h('b', {}, [l.label]), h('span', {}, [l.detail])])); }); return el; }
  function goModule(mod, screen) { var st = (SCREEN[mod] || {})[screen] || 'board'; sh.go(mod, st); }
  function rootCause() { return M.R.attribution.rootCause; }
  function focusFactor() { var A = M.R.attribution; if (!M.factor || !A.leaves.some(function (x) { return x.id === M.factor; })) M.factor = A.rootCause ? A.rootCause.id : (A.leaves[0] || {}).id; return A.leaves.filter(function (x) { return x.id === M.factor; })[0]; }

  /* ---------- 屏 1 ---------- */
  function screenConnect(work) {
    var d = M.data, R = M.R, k = R.kpi;
    work.classList.add('m9-connect');
    var g = h('div', { class: 'pd-grid' });
    var nameIn = h('input', { type: 'text', value: d.company, oninput: function (e) { M.name = e.target.value; d.company = e.target.value; var co = M.frame.root.querySelector('.pd-top .co span:nth-child(2)'); if (co) co.textContent = e.target.value; } });
    g.appendChild(P.card({ cls: 'c4', title: '企业', body: [h('div', { class: 'pd-form' }, [
      h('div', { class: 'pd-field' }, [h('label', {}, ['企业名称']), nameIn]),
      h('div', { class: 'pd-field' }, [h('label', {}, ['行业']), h('div', { style: 'font-weight:600' }, [M.company ? sh.industryNameOf(M.company.industry) + (M.company.size ? ' · ' + sh.optText('size', M.company.size) : '') : sh.industryNameOf(sh.displayIndustryDefault())])]),
      h('div', { class: 'pd-field' }, [h('label', {}, ['本期']), h('div', { style: 'font-weight:600' }, [d.period.replace('-', ' 年 ') + ' 月账期 · 指标序列 ' + d.months.length + ' 个月 · 预算 ' + d.budgetYear + ' 年'])]),
      h('div', { class: 'pd-field' }, [h('label', {}, ['已有数据']), h('div', { style: 'font-weight:600' }, ['指标 ' + LIB.metricTree.nodes.length + ' 个节点 · ' + LIB.metricTree.groups.length + ' 组 · 决议台账 ' + d.decisions.length + ' 项'])])
    ])] }));
    var caps = h('div'); CAPS.forEach(function (c, i) { caps.appendChild(h('div', { class: 'cap-row' }, [h('span', { class: 'ic' }, ['0' + (i + 1)]), h('div', {}, [h('div', { class: 't' }, [c[0]]), h('div', { class: 's' }, [c[1]])]), P.chip('ok', '已开通')])); });
    g.appendChild(P.card({ cls: 'c4', title: '已开通能力', sub: '4 项', body: [caps], foot: ['指标、归因、方案、审批写在同一份数据上，复盘按下一期指标'] }));
    var srcs = h('div'); d.sources.forEach(function (s) { srcs.appendChild(h('div', { class: 'src-row' }, [h('div', {}, [h('div', { class: 't' }, [s.name]), h('div', { class: 's' }, ['同步 ' + s.lastSync + ' · ' + fmtN(s.rows) + ' 条'])]), P.chip(s.mode === 'direct' ? 'ok' : 'watch', s.mode === 'direct' ? '模块直连' : '表格导入'), h('span', { class: 'pd-dot ' + (s.mode === 'direct' ? 'ok' : 'risk') })])); });
    g.appendChild(P.card({ cls: 'c4', title: '数据源', sub: d.sources.length + ' 个模块', body: [srcs], foot: ['方案库 ' + Object.keys(LIB.playbooks.causes).length + ' 个根因 · 会签规则 ' + LIB.approvalRules.signers.length + ' 位'] }));
    g.appendChild(h('div', { class: 'c12 go' }, [h('div', {}, [h('div', { class: 't' }, ['决策驾驶舱']), h('div', { class: 's' }, ['经营利润 ' + W(k.profit) + '（较上期 ' + K.fmtSigned(k.profitDelta, W) + '）· 风险指标 ' + k.risk + ' · 待批 ' + k.pending + ' · 执行中决议 ' + k.executing])]), h('div', { class: 'sp' }), h('div', { class: 'cr' }, [h('b', { class: 'num' }, [String(K.CREDITS)]), ' 积分 / 次']), P.btn('进入决策驾驶舱', { cls: 'primary big', onClick: enterBoard })]));
    work.appendChild(g);
  }

  /* ---------- 屏 2 ---------- */
  function screenBoard(work) {
    var R = M.R, k = R.kpi, d = M.data, T = R.tree, A = R.attribution, N = T.nodes;
    work.classList.add('m9-board');
    var g = h('div', { class: 'pd-grid' });
    var kv = function (id) { return N[id]; };
    g.appendChild(h('div', { class: 'c12' }, [P.kpis([
      { label: '经营利润', value: W(k.profit), tone: STATUS_TONE[N.profit.status] === 'late' ? 'late' : STATUS_TONE[N.profit.status], sub: '较上期 ' + N.profit.deltaText + (N.profit.budget != null ? ' · 预算 ' + N.profit.budgetText : ''), onClick: function () { M.metric = 'profit'; setStep('attr'); } },
      { label: '收入', value: W(k.rev), tone: STATUS_TONE[N.rev.status], sub: '较上期 ' + K.fmtSigned(Math.round(k.revDeltaPct * 1000) / 10, function (x) { return x + '%'; }) + (N.rev.budget != null ? ' · 预算 ' + N.rev.budgetText : ''), onClick: function () { M.metric = 'rev'; setStep('attr'); } },
      { label: '毛利率', value: N.gm.curText, tone: STATUS_TONE[N.gm.status], sub: '上期 ' + N.gm.prevText + (N.gm.budget != null ? ' · 预算 ' + N.gm.budgetText : ''), onClick: function () { M.metric = 'gm'; setStep('attr'); } },
      { label: '现金周期', value: Math.round(k.ccc), unit: '天', tone: STATUS_TONE[N.ccc.status], sub: (N.ccc.budget != null ? '预算 ' + N.ccc.budgetText + ' · ' : '') + '回款 ' + N.dso.curText, onClick: function () { M.metric = 'ccc'; setStep('attr'); } },
      { label: '准时交付率', value: N.onTimeRate.curText, tone: STATUS_TONE[N.onTimeRate.status], sub: '延期 ' + N.lateOrders.curText + (N.onTimeRate.budget != null ? ' · 预算 ' + N.onTimeRate.budgetText : '') },
      { label: '新客成交', value: k.deals, unit: '单', tone: STATUS_TONE[N.deals.status], sub: '线索 ' + N.leads.curText + ' · 转化 ' + N.winRate.curText },
      { label: '人均产值', value: W(k.perCapitaRevenue), tone: STATUS_TONE[N.perCapitaRevenue.status], sub: '在编 ' + N.headcount.curText + ' · 离职率 ' + N.turnover.curText },
      { label: '合规敞口', value: W(k.complianceExposure), tone: STATUS_TONE[N.complianceExposure.status], sub: '高风险合同 ' + N.highRiskContracts.curText }
    ])]));
    // 指标树
    var tree = h('div', { class: 'm9-tree' });
    T.groups.forEach(function (grp) {
      var root = N[grp.root];
      var el = h('div', { class: 'grp' }, [h('div', { class: 'gh' }, [grp.name, h('span', { class: 'sp' }), stChip(root.status)])]);
      var row = function (n, cls) {
        var attributable = LIB.metricTree.attributable.indexOf(n.id) >= 0;
        var dev = n.budget != null ? n.devBudget : n.delta, devText = n.budget != null ? '较预算 ' + n.devBudgetText : '较上期 ' + n.deltaText;
        var bad = n.good === 'up' ? dev < 0 : n.good === 'down' ? dev > 0 : false;
        return h('button', { class: 'nd click ' + cls, onclick: function () { if (attributable) { M.metric = n.id; M.factor = null; } else { M.metric = grp.root === n.id ? n.id : (LIB.metricTree.attributable.indexOf(grp.root) >= 0 ? grp.root : 'profit'); M.factor = n.id; } setStep('attr'); } }, [
          h('span', { class: 'n', title: n.name + ' · ' + n.sourceName + (n.explain ? ' · ' + n.explain : '') }, [h('span', { class: 'dot ' + n.status }), n.name, h('span', { class: 'src' }, [SRC_SHORT[n.source] || n.sourceName])]), h('span', { class: 'v num' }, [n.curText]), h('span', { class: 'd num' + (bad ? ' neg' : dev === 0 ? '' : ' pos') }, [devText])
        ]);
      };
      el.appendChild(row(root, 'root'));
      grp.nodes.filter(function (n) { return n.id !== grp.root; }).forEach(function (n) { el.appendChild(row(n, 'sub')); });
      tree.appendChild(el);
    });
    g.appendChild(P.card({ cls: 'c8', title: '指标树', sub: LIB.metricTree.nodes.length + ' 个节点 · 六组 · 与预算比，无预算的与上期比 · 点节点看归因', body: [tree] }));
    var right = col('c4', []);
    var devs = h('div', { class: 'pd-list' });
    Object.keys(N).filter(function (id) { return N[id].status !== 'ok'; }).sort(function (a, b) { return (N[a].status === 'risk' ? 0 : 1) - (N[b].status === 'risk' ? 0 : 1); }).slice(0, 7).forEach(function (id) { var n = N[id]; devs.appendChild(P.item({ tone: STATUS_TONE[n.status] === 'late' ? 'late' : 'risk', icon: GROUP_ICON[n.group] || '·', title: n.name + ' ' + n.curText, sub: n.explain || n.sourceName, right: n.budget != null ? n.devBudgetText : n.deltaText, rightSub: n.budget != null ? '较预算' : '较上期', onClick: function () { if (LIB.metricTree.attributable.indexOf(id) >= 0) { M.metric = id; M.factor = null; } else { var grp = LIB.metricTree.groups.filter(function (x) { return x.key === n.group; })[0]; M.metric = LIB.metricTree.attributable.indexOf(grp.root) >= 0 ? grp.root : 'profit'; M.factor = id; } setStep('attr'); } })); });
    if (!devs.childNodes.length) devs.appendChild(P.empty('全部指标在容差内'));
    right.appendChild(P.card({ title: '本期偏差榜', sub: '风险 ' + T.counts.risk + ' · 关注 ' + T.counts.watch, body: [devs] }));
    var ds = h('div', { class: 'pd-list' });
    d.approvals.filter(function (a) { return a.status === 'pending'; }).forEach(function (a) { ds.appendChild(P.item({ tone: 'risk', icon: '批', title: a.id + ' ' + a.option.name, sub: '待终批 · 会签 ' + a.opinions.map(function (o) { return o.opinionName; }).join(' / '), right: K.fmtSigned(a.totals.netBenefit, W), rightSub: '12 个月净效益', onClick: function () { M.approval = a.id; setStep('approval'); } })); });
    R.decisions.filter(function (x) { return x.status === 'executing'; }).forEach(function (x) { ds.appendChild(P.item({ tone: x.overdue.length ? 'late' : 'accent', icon: '议', title: x.id + ' ' + x.title, sub: (x.next ? '下一节点 ' + short(x.next.due) + ' ' + x.next.title : '全部完成') + (x.overdue.length ? ' · 逾期 ' + x.overdue.length : ''), right: x.progress + '%', rightSub: x.done + ' / ' + x.total + ' 节点', onClick: function () { M.decision = x.id; setStep('execute'); } })); });
    right.appendChild(P.card({ title: '决策状态', sub: '待批 ' + k.pending + ' · 执行中 ' + k.executing + ' · 已完成 ' + k.doneDecisions, body: [ds], foot: [A.rootCause ? h('span', {}, ['本期主因：' + A.rootCause.name + '（' + A.rootCause.factorText + '）']) : null, P.btn('去归因', { cls: 'sm', onClick: function () { setStep('attr'); } })] }));
    g.appendChild(right);
    if (d.log.length) g.appendChild(P.card({ cls: 'c12', title: '本期动作', sub: d.log.length + ' 条', body: [logList(d.log.slice(-6).reverse())] }));
    work.appendChild(g);
  }

  /* ---------- 屏 3 ---------- */
  function screenAttr(work) {
    var R = M.R, d = M.data, A = R.attribution, N = R.tree.nodes, F = focusFactor();
    work.classList.add('m9-attr');
    var g = h('div', { class: 'pd-grid' });
    var mchips = h('div', { class: 'chips' }, LIB.metricTree.attributable.map(function (id) { return h('button', { class: M.metric === id ? 'on' : '', onclick: function () { M.metric = id; M.factor = null; draw(); } }, [N[id].name]); }));
    var bchips = h('div', { class: 'chips' }, ['prev', 'avg3'].map(function (b) { return h('button', { class: M.basis === b ? 'on' : '', onclick: function () { M.basis = b; draw(); } }, [K.BASIS_NAME[b]]); }));
    g.appendChild(h('div', { class: 'c12' }, [P.kpis([
      { label: A.name + ' · ' + A.basisName, value: A.toText, tone: A.delta === 0 ? 'ok' : (N[A.metric].good === 'down' ? A.delta > 0 : A.delta < 0) ? 'late' : 'ok', sub: '基期 ' + A.fromText + ' → 本期，' + A.deltaText },
      { label: '主因', value: A.rootCause ? A.rootCause.name : '—', tone: 'accent', sub: A.rootCause ? A.rootCause.factorText : '各因子在容差内' },
      { label: '主因贡献', value: A.rootCause ? A.rootCause.valueText : '—', tone: 'late', sub: A.rootCause && A.rootCause.adjText ? A.rootCause.adjText : '剔除一次性项后判定' },
      { label: '不利因子', value: A.hurts.length, unit: '个', sub: '共 ' + A.leaves.length + ' 个因子参与' },
      { label: '有利因子', value: A.leaves.filter(function (x) { return !x.hurt && Math.abs(x.value) > 1; }).length, unit: '个', tone: 'ok' },
      { label: '校验', value: '通过', tone: 'ok', sub: '贡献之和 = 变动' }
    ])]));
    var wfItems = A.leaves.slice(0, 8).map(function (x) { return { id: x.id, label: x.name, value: x.value }; });
    var rest = A.leaves.slice(8); if (rest.length) wfItems.push({ id: null, label: '其他', value: rest.reduce(function (t, x) { return t + x.value; }, 0) });
    var unit = N[A.metric].unit, fmt = unit === '元' ? function (v) { return Math.abs(v) >= 10000 ? (Math.round(v / 1000) / 10) + ' 万' : fmtN(v); } : unit === '%' ? function (v) { return (Math.round(v * 1000) / 10) + '%'; } : unit === '天' ? function (v) { return Math.round(v * 10) / 10 + ' 天'; } : function (v) { return fmtN(v); };
    var axisFmt = unit === '元' ? function (v) { return Math.round(v / 10000) + '万'; } : unit === '%' ? function (v) { return Math.round(v * 100) + '%'; } : function (v) { return Math.round(v) + ''; };
    g.appendChild(P.card({ cls: 'c7', title: '贡献瀑布', sub: A.basisName + ' · ' + A.fromText + ' → ' + A.toText + ' · 点柱子看证据', body: [h('div', { class: 'ctl', style: 'margin-bottom:10px' }, [h('span', { class: 'lb' }, ['指标']), mchips, h('span', { class: 'lb' }, ['基期']), bchips]), P.waterfall({ start: { label: '基期', value: A.from }, end: { label: '本期', value: A.to }, items: wfItems, fmt: fmt, axisFmt: axisFmt, active: M.factor, onPick: function (id) { M.factor = id; draw(); }, width: 860, height: 280 })], foot: [A.method] }));
    var tbl = P.table({ compact: true, cols: [
      { key: 'name', label: '因子', render: function (x) { return h('span', {}, [h('b', {}, [x.name]), h('span', { class: 'sub' }, [x.pathNames.slice(1, -1).join(' › ') || '直接']) ]); } },
      { key: 'factorText', label: '因子变动', render: function (x) { return x.factorText; } },
      { key: 'value', label: '贡献', align: 'r', sort: true, sortDesc: true, render: function (x) { return h('span', { class: x.hurt ? 'neg' : 'pos' }, [x.valueText]); } },
      { key: 'share', label: '占比', align: 'r', render: function (x) { return Math.round(x.share * 100) + '%'; } },
      { key: 'sourceName', label: '来源' }
    ], rows: A.leaves, rowKey: function (x) { return x.id; }, activeKey: M.factor, onRow: function (x) { M.factor = x.id; draw(); } });
    g.appendChild(P.card({ cls: 'c5', title: '因子表', sub: A.leaves.length + ' 个因子 · 红为不利', tight: true, body: [h('div', { class: 'pd-scroll', style: 'max-height:360px' }, [tbl])] }));
    // 证据与判断
    var ev = K.evidence(d, LIB, F.id, F.direction);
    var evl = h('div', { class: 'm9-ev' });
    ev.forEach(function (e) { evl.appendChild(h('div', { class: 'ev' }, [h('div', { class: 'h' }, [P.chip('accent', e.moduleName, true), e.title]), P.btn('去看', { cls: 'sm', onClick: function () { goModule(e.module, e.screen); } }), h('div', { class: 'd' }, [e.detail]), h('div', { class: 'r' }, [e.ref])])); });
    g.appendChild(P.card({ cls: 'c7', title: '证据 · ' + F.name, sub: F.factorText + ' · ' + ev.length + ' 张证据卡 · 点「去看」进对应模块', body: [evl] }));
    var acts = h('div', { class: 'pd-actions' });
    var pk = K.playbookKey(LIB, F.id);
    acts.appendChild(h('div', { class: 'pd-action best' }, [h('div', { class: 't' }, [h('span', { class: 'rank' }, ['1']), '锁定「' + F.name + '」为根因并预演方案']), P.btn('预演方案', { cls: 'primary sm', disabled: !pk, onClick: function () { M.cause = F.id; M.option = null; setStep('options'); } }), h('div', { class: 'd' }, [pk ? '方案库有 ' + LIB.playbooks.causes[pk].options.length + ' 个方案' + (pk !== F.id ? '（按 ' + N[pk].name + ' 取）' : '') : '方案库暂无对应方案'])]));
    if (A.rootCause && A.rootCause.id !== F.id) acts.appendChild(h('div', { class: 'pd-action' }, [h('div', { class: 't' }, [h('span', { class: 'rank' }, ['2']), '回到 AI 判断的主因 ' + A.rootCause.name]), P.btn('切换', { cls: 'sm', onClick: function () { M.factor = A.rootCause.id; draw(); } }), h('div', { class: 'd' }, [A.rootCause.factorText])]));
    g.appendChild(P.card({ cls: 'c5', title: 'AI 判断', sub: '主因 = 剔除一次性项后对指标伤害最大的因子', accent: true, body: [P.judge({ verdict: { tone: F.hurt ? 'late' : 'ok', chip: F.hurt ? '不利' : '有利', text: F.name + ' ' + F.factorText + '，贡献 ' + F.valueText + (F.adjText ? '（' + F.adjText + '）' : '') }, seen: [A.name + ' ' + A.basisName + '：' + A.fromText + ' → ' + A.toText, '路径：' + F.pathNames.join(' › '), '数据来自 ' + F.sourceName], reasons: ev.map(function (e) { return e.title + '：' + e.detail; }), actionsEl: acts, actionsTitle: '下一步' })] }));
    work.appendChild(g);
  }

  /* ---------- 屏 4 ---------- */
  function screenOptions(work) {
    var R = M.R, d = M.data, A = R.attribution, N = R.tree.nodes;
    work.classList.add('m9-options');
    var causes = []; if (A.rootCause) causes.push(A.rootCause.id); A.hurts.forEach(function (x) { if (causes.indexOf(x.id) < 0 && K.playbookKey(LIB, x.id)) causes.push(x.id); });
    if (!M.cause || !K.playbookKey(LIB, M.cause)) M.cause = causes[0] || 'orders';
    if (causes.indexOf(M.cause) < 0) causes.unshift(M.cause);
    var S = K.simulateAll(d, LIB, M.cause, M.params[M.cause] || {});
    if (!M.option || !S.sims.some(function (s) { return s.option.key === M.option; })) M.option = S.recommended;
    var sim = S.sims.filter(function (s) { return s.option.key === M.option; })[0], opt = sim.option;
    var existing = d.approvals.filter(function (a) { return a.causeId === M.cause && a.option.key === M.option && a.status !== 'rejected'; })[0];
    var g = h('div', { class: 'pd-grid' });
    var cchips = h('div', { class: 'chips' }, causes.slice(0, 6).map(function (id) { return h('button', { class: M.cause === id ? 'on' : '', onclick: function () { M.cause = id; M.option = null; draw(); } }, [N[id].name]); }));
    g.appendChild(h('div', { class: 'c12' }, [P.kpis([
      { label: '根因', value: N[M.cause].name, tone: 'accent', sub: S.causeName + (K.playbookKey(LIB, M.cause) !== M.cause ? ' · 方案按 ' + N[K.playbookKey(LIB, M.cause)].name + ' 取' : '') },
      { label: '方案', value: S.sims.length, unit: '个', sub: 'AI 推荐 ' + S.recommended },
      { label: '推荐方案净效益', value: K.fmtSigned(S.sims.filter(function (s) { return s.recommended; })[0].totals.netBenefit, W), tone: 'ok', sub: '12 个月利润增量 − 投入' },
      { label: '当前方案', value: opt.key + ' ' + opt.name, sub: '责任 ' + opt.owner + ' · 见效 ' + opt.leadMonths + ' 个月' },
      { label: '当前方案净效益', value: K.fmtSigned(sim.totals.netBenefit, W), tone: sim.totals.netBenefit >= 0 ? 'ok' : 'late', sub: '现金 ' + K.fmtSigned(sim.totals.cashDelta12, W) },
      { label: '期末毛利率', value: (Math.round(sim.totals.gmEnd * 1000) / 10) + '%', sub: '现状 ' + (Math.round(sim.totals.gmBase * 1000) / 10) + '% · 准时率 ' + Math.round(sim.totals.onTimeEnd * 100) + '%' }
    ])]));
    // 参数
    var pm = h('div', { class: 'm9-params' });
    opt.params.forEach(function (p) {
      var cur = sim.params[p.key];
      var inp = h('input', { type: 'range', min: p.min, max: p.max, step: p.step, value: cur, onchange: function (e) { M.params[M.cause] = M.params[M.cause] || {}; M.params[M.cause][opt.key] = M.params[M.cause][opt.key] || {}; M.params[M.cause][opt.key][p.key] = +e.target.value; draw(); } });
      pm.appendChild(h('div', { class: 'pm' }, [h('label', {}, [p.label, h('b', { class: 'num' }, [cur + ' ' + p.unit])]), inp, h('div', { class: 'mm' }, [h('span', {}, [p.min + ' ' + p.unit]), h('span', {}, [p.max + ' ' + p.unit])])]));
    });
    g.appendChild(P.card({ cls: 'c4', title: '方案 ' + opt.key + ' · 参数', sub: opt.name, body: [h('div', { style: 'margin-bottom:12px;line-height:1.55' }, [opt.desc]), pm, h('div', { class: 'm9-opt-meta', style: 'margin-top:14px' }, [h('div', { class: 'r' }, [h('span', {}, ['责任人']), h('b', {}, [opt.owner])]), h('div', { class: 'r' }, [h('span', {}, ['一次性投入']), h('b', {}, [opt.invest ? W(opt.invest) + '（预计）' : '无'])]), h('div', { class: 'r' }, [h('span', {}, ['见效周期']), h('b', {}, [opt.leadMonths + ' 个月'])]), h('div', { class: 'r' }, [h('span', {}, ['风险']), P.chip(opt.risk === 'low' ? 'ok' : opt.risk === 'mid' ? 'risk' : 'late', { low: '低', mid: '中', high: '高' }[opt.risk])]), h('div', { class: 'r' }, [h('span', {}, ['执行节点']), h('b', {}, [opt.milestones.length + ' 个'])])]), opt.note ? h('div', { style: 'margin-top:10px;color:var(--pd-sub);font-size:12.5px;line-height:1.5' }, [opt.note]) : null], foot: [existing ? P.chip(existing.status === 'approved' ? 'ok' : 'watch', existing.id + ' ' + AP_NAME[existing.status]) : P.btn('发起审批', { cls: 'primary', onClick: function () { var d2 = K.submit(d, LIB, M.cause, opt.key, sim.params); M.approval = d2.approvals[d2.approvals.length - 1].id; M.data = d2; recompute(); setStep('approval'); } }), existing && existing.status === 'approved' ? P.btn('看决议', { cls: 'sm', onClick: function () { M.decision = existing.decisionId; setStep('execute'); } }) : null] }));
    var colors = { A: '#4974F6', B: '#C2255C', C: '#E8A33D' };
    var right = col('c8', []);
    right.appendChild(P.card({ title: '12 个月经营利润走势', sub: '现状按近三月均值持平 · 各方案按参数与见效期爬坡 · 万元 / 月', body: [P.lineChart({ labels: sim.labels.map(function (l) { return (+l.slice(5)) + '月'; }), right: true, series: [{ values: sim.base.map(function (m) { return Math.round(m.profit / 1000) / 10; }), color: '#98A2B8', fmt: function (v) { return v + ' 万'; } }].concat(S.sims.map(function (s) { return { values: s.months.map(function (m) { return Math.round(m.profitNet / 1000) / 10; }), color: colors[s.option.key], fmt: function (v) { return v + ' 万'; } }; })), height: 220, width: 900 }), h('div', { class: 'pd-legend', style: 'margin-top:8px' }, [h('span', {}, [h('i', { style: 'background:#98A2B8' }), '现状'])].concat(S.sims.map(function (s) { return h('span', {}, [h('i', { style: 'background:' + colors[s.option.key] }), s.option.key + ' ' + s.option.name]); })))] }));
    right.appendChild(P.card({ title: '方案对比', sub: '净效益 = 12 个月利润增量 − 投入 · 推荐 = 净效益 × 风险系数最高', body: [P.compare({ active: M.option, onPick: function (key) { M.option = key; draw(); }, options: S.sims.map(function (s) { var T = s.totals; return { key: s.option.key, name: s.option.name, recommended: s.recommended, headline: { big: K.fmtSigned(T.netBenefit, W), sub: '12 个月净效益', tone: T.netBenefit >= 0 ? 'ok' : 'late' }, rows: [{ k: '利润增量', v: K.fmtSigned(T.profitDelta12, W), tone: T.profitDelta12 >= 0 ? 'good' : 'bad' }, { k: '现金影响', v: K.fmtSigned(T.cashDelta12, W), tone: T.cashDelta12 >= 0 ? 'good' : 'bad' }, { k: '期末毛利率', v: (Math.round(T.gmEnd * 1000) / 10) + '%' }, { k: '期末准时率', v: Math.round(T.onTimeEnd * 100) + '%' }, { k: '投入', v: s.option.invest ? W(s.option.invest) : '无' }, { k: '见效 · 风险', v: s.option.leadMonths + ' 个月 · ' + { low: '低', mid: '中', high: '高' }[s.option.risk] }], notes: s.option.desc }; }) })] }));
    g.appendChild(right);
    work.appendChild(g);
  }

  /* ---------- 屏 5 ---------- */
  function screenApproval(work) {
    var R = M.R, d = M.data, k = R.kpi, list = d.approvals.slice().reverse();
    work.classList.add('m9-approval');
    if (!M.approval || !list.some(function (a) { return a.id === M.approval; })) M.approval = list.length ? (list.filter(function (a) { return a.status === 'pending'; })[0] || list[0]).id : null;
    var ap = M.approval ? list.filter(function (a) { return a.id === M.approval; })[0] : null;
    var g = h('div', { class: 'pd-grid' });
    g.appendChild(h('div', { class: 'c12' }, [P.kpis([
      { label: '待终批', value: k.pending, unit: '单', tone: k.pending ? 'risk' : 'ok' }, { label: '本期批准', value: k.approved, unit: '单', tone: 'ok' }, { label: '驳回', value: d.approvals.filter(function (a) { return a.status === 'rejected'; }).length, unit: '单' },
      { label: '会签反对', value: d.approvals.filter(function (a) { return a.status === 'pending'; }).reduce(function (t, a) { return t + a.objections; }, 0), unit: '条', tone: 'late', sub: '待批单里的反对意见' }, { label: '有条件同意', value: d.approvals.filter(function (a) { return a.status === 'pending'; }).reduce(function (t, a) { return t + a.conditions; }, 0), unit: '条', tone: 'risk' },
      { label: '终批人', value: LIB.approvalRules.final.role, sub: '会签 ' + LIB.approvalRules.signers.map(function (s) { return s.role; }).join(' / ') }
    ])]));
    var ll = h('div', { class: 'pd-list' });
    list.forEach(function (a) { ll.appendChild(P.item({ tone: AP_TONE[a.status] === 'watch' ? 'risk' : AP_TONE[a.status] === 'ok' ? 'ok' : 'hand', icon: a.option.key, title: a.id + ' ' + a.option.name, sub: '根因 ' + a.causeName + ' · ' + short(a.submittedAt) + ' 发起 · ' + AP_NAME[a.status], right: K.fmtSigned(a.totals.netBenefit, W), rightSub: a.objections ? '反对 ' + a.objections : a.conditions ? '有条件 ' + a.conditions : '会签一致同意', onClick: function () { M.approval = a.id; M.comment = ''; draw(); } })); });
    if (!list.length) ll.appendChild(P.empty('还没有审批单，先在方案预演里发起'));
    g.appendChild(P.card({ cls: 'c4', title: '审批单', sub: list.length + ' 单', body: [ll], foot: [P.btn('去方案预演', { cls: 'sm', onClick: function () { setStep('options'); } })] }));
    if (!ap) { work.appendChild(g); return; }
    var T = ap.totals;
    var sign = h('div', { class: 'm9-sign' });
    ap.opinions.forEach(function (o) { sign.appendChild(h('div', { class: 's ' + o.opinion }, [h('span', { class: 'role' }, [o.role]), P.chip(OP_TONE[o.opinion], o.opinionName), h('span', { class: 'tx' }, [o.text])])); });
    var ta = h('textarea', { placeholder: '批复意见（可空）', oninput: function (e) { M.comment = e.target.value; } }); ta.value = M.comment || '';
    var final = ap.status === 'pending' ? h('div', { class: 'm9-final' }, [h('div', { class: 't' }, [LIB.approvalRules.final.role + ' 终批', ap.objections ? P.chip('late', '有 ' + ap.objections + ' 条反对，需要说明') : ap.conditions ? P.chip('risk', '有 ' + ap.conditions + ' 条条件') : P.chip('ok', '会签一致同意')]), ta, h('div', { class: 'btns' }, [P.btn('批准并形成决议', { cls: 'primary', onClick: function () { var d2 = K.approve(d, LIB, ap.id, M.comment); M.decision = d2.decisions[0].id; M.comment = ''; M.data = d2; recompute(); setStep('execute'); P.toast(M.frame.body, ap.id + ' 已批准，决议 ' + d2.decisions[0].id + ' 已进台账'); } }), P.btn('驳回', { cls: 'danger', onClick: function () { var c = M.comment; M.comment = ''; commit(K.reject(d, LIB, ap.id, c), ap.id + ' 已驳回'); } })])]) : h('div', { class: 'm9-final' }, [h('div', { class: 't' }, [LIB.approvalRules.final.role + ' 终批', P.chip(AP_TONE[ap.status] === 'watch' ? 'risk' : AP_TONE[ap.status], AP_NAME[ap.status] + ' ' + short(ap.decidedAt))]), h('div', {}, [ap.comment ? '批复：' + ap.comment : '未填批复意见']), ap.decisionId ? h('div', {}, [P.btn('看决议 ' + ap.decisionId, { cls: 'sm', onClick: function () { M.decision = ap.decisionId; setStep('execute'); } })]) : null]);
    g.appendChild(col('c8', [P.card({ title: '审批单 ' + ap.id + ' · ' + ap.option.name, sub: '根因 ' + ap.causeName + ' · ' + short(ap.submittedAt) + ' 发起', accent: true, body: [
      P.kv([['方案', ap.option.key + ' ' + ap.option.name + '：' + ap.option.desc], ['参数', ap.paramText], ['责任人', ap.option.owner], ['一次性投入', ap.option.invest ? W(ap.option.invest) + '（预计）' : '无'], ['12 个月利润增量', K.fmtSigned(T.profitDelta12, W)], ['12 个月净效益', h('b', { style: 'color:var(--pa)' }, [K.fmtSigned(T.netBenefit, W)])], ['现金影响', K.fmtSigned(T.cashDelta12, W)], ['期末毛利率 / 准时率', (Math.round(T.gmEnd * 1000) / 10) + '% / ' + Math.round(T.onTimeEnd * 100) + '%'], ['见效 · 风险', ap.option.leadMonths + ' 个月 · ' + { low: '低', mid: '中', high: '高' }[ap.option.risk]], ['执行节点', ap.option.milestones.map(function (m) { return m.title; }).join('；')]]),
      h('div', { style: 'margin:14px 0 8px;font-weight:700' }, ['会签意见']), sign,
      h('div', { style: 'margin:14px 0 8px;font-weight:700' }, ['终批']), final
    ] })]));
    work.appendChild(g);
  }

  /* ---------- 屏 6 ---------- */
  function screenExecute(work) {
    var R = M.R, d = M.data, k = R.kpi, dec = R.decisions;
    work.classList.add('m9-exec');
    if (!M.decision || !dec.some(function (x) { return x.id === M.decision; })) M.decision = dec.length ? dec[0].id : null;
    var D = M.decision ? dec.filter(function (x) { return x.id === M.decision; })[0] : null;
    var g = h('div', { class: 'pd-grid' });
    g.appendChild(h('div', { class: 'c12' }, [P.kpis([
      { label: '决议', value: dec.length, unit: '项', sub: '执行中 ' + k.executing + ' · 已完成 ' + k.doneDecisions }, { label: '逾期节点', value: k.overdueMilestones, unit: '个', tone: k.overdueMilestones ? 'late' : 'ok' },
      { label: '复盘未达标', value: k.missedReviews, unit: '项', tone: k.missedReviews ? 'risk' : 'ok', sub: '目标线与实际线偏差' }, { label: '本期新决议', value: dec.filter(function (x) { return x.approvedAt === d.today; }).length, unit: '项', tone: 'accent' },
      { label: '在途投入', value: W0(dec.filter(function (x) { return x.status === 'executing'; }).reduce(function (t, x) { return t + (x.invest || 0); }, 0)), sub: '执行中决议的预计投入' }
    ])]));
    var tbl = P.table({ compact: true, cols: [
      { key: 'id', label: '决议', render: function (x) { return h('span', {}, [h('b', { class: 'id' }, [x.id]), h('span', { class: 'sub' }, [x.title])]); } },
      { key: 'causeName', label: '根因', render: function (x) { return h('span', {}, [x.causeName, h('span', { class: 'sub' }, [x.owner])]); } },
      { key: 'approvedAt', label: '批准', sort: true, render: function (x) { return short(x.approvedAt); } },
      { key: 'progress', label: '进度', align: 'r', sort: true, render: function (x) { return P.bar(x.progress, x.status === 'done' ? 'ok' : x.overdue.length ? 'late' : undefined, x.done + '/' + x.total); } },
      { key: 'status', label: '状态', render: function (x) { return h('span', {}, [P.chip(x.status === 'done' ? 'ok' : x.overdue.length ? 'late' : 'accent', x.statusName), x.review ? P.chip(x.review.result === 'miss' ? 'risk' : 'ok', x.review.result === 'miss' ? '复盘未达标' : '复盘达标') : null]); } },
      { key: 'next', label: '下一节点', render: function (x) { return x.next ? short(x.next.due) + ' ' + x.next.title : '—'; } }
    ], rows: dec, rowKey: function (x) { return x.id; }, activeKey: M.decision, onRow: function (x) { M.decision = x.id; draw(); } });
    g.appendChild(P.card({ cls: 'c7', title: '决议台账', sub: dec.length + ' 项 · 点一行看节点与跟踪', tight: true, body: [tbl] }));
    var right = col('c5', []);
    if (D) {
      var ms = h('div', { class: 'm9-ms' });
      D.milestones.forEach(function (m, i) { var late = m.status !== 'done' && K.days(d.today, m.due) < 0; ms.appendChild(h('div', { class: 'm ' + m.status + (late ? ' late' : '') }, [h('span', { class: 'i' }, [m.status === 'done' ? '✓' : String(i + 1)]), h('span', { class: 't' }, [m.title, h('span', { class: 'o' }, [m.owner || ''])]), h('span', { class: 'due' }, [short(m.due) + (late ? ' · 逾期 ' + (-K.days(d.today, m.due)) + ' 天' : '')]), m.status === 'doing' ? P.btn('完成', { cls: 'primary sm', onClick: function () { commit(K.setMilestone(d, D.id, i, 'done'), D.id + ' 节点完成：' + m.title); } }) : m.status === 'todo' ? P.btn('开始', { cls: 'sm', onClick: function () { commit(K.setMilestone(d, D.id, i, 'doing'), D.id + ' 节点开始：' + m.title); } }) : P.chip('ok', '完成')])); });
      var trackEl = null;
      if (D.tracking) {
        var tr = D.tracking, N = R.tree.nodes[tr.metric], unitFmt = N && N.unit === '%' ? function (v) { return (Math.round(v * 1000) / 10) + '%'; } : N && N.unit === '元' ? function (v) { return (Math.round(v / 1000) / 10) + ' 万'; } : function (v) { return Math.round(v * 10) / 10; };
        var series = [{ values: tr.target.map(function (v) { return N && N.unit === '%' ? Math.round(v * 1000) / 10 : N && N.unit === '元' ? Math.round(v / 1000) / 10 : v; }), color: '#98A2B8', fmt: function (v) { return v + (N && N.unit === '%' ? '%' : N && N.unit === '元' ? ' 万' : ''); } }];
        if (tr.actual.length) series.push({ values: tr.actual.map(function (v) { return N && N.unit === '%' ? Math.round(v * 1000) / 10 : N && N.unit === '元' ? Math.round(v / 1000) / 10 : v; }), color: tr.onTrack ? '#22A06B' : '#D9483B', fmt: function (v) { return v + (N && N.unit === '%' ? '%' : N && N.unit === '元' ? ' 万' : ''); } });
        trackEl = h('div', {}, [P.lineChart({ labels: tr.months.map(function (l) { return (+l.slice(5)) + '月'; }), right: true, series: series, height: 150, width: 460 }), h('div', { class: 'pd-legend', style: 'margin-top:6px' }, [h('span', {}, [h('i', { style: 'background:#98A2B8' }), '目标 ' + tr.metricName]), tr.actual.length ? h('span', {}, [h('i', { style: 'background:' + (tr.onTrack ? '#22A06B' : '#D9483B') }), '实际 · 最近偏差 ' + tr.varianceText[tr.varianceText.length - 1]]) : h('span', {}, ['实际值从下一期账期起记录'])])]);
      }
      right.appendChild(P.card({ title: D.id + ' ' + D.title, sub: '根因 ' + D.causeName + ' · 责任 ' + D.owner + ' · ' + short(D.approvedAt) + ' 批准 · ' + D.ageDays + ' 天', accent: true, body: [
        P.kv([['预期', D.expected], ['投入', D.invest ? W(D.invest) + '（预计）' : '无'], ['进度', D.done + ' / ' + D.total + ' 节点 · ' + D.progress + '%'], D.comment ? ['批复', D.comment] : ['', null]]),
        h('div', { style: 'margin:12px 0 8px;font-weight:700' }, ['执行节点']), ms,
        trackEl ? h('div', { style: 'margin:14px 0 8px;font-weight:700' }, ['指标跟踪 · ' + D.tracking.metricName]) : null, trackEl,
        D.review ? h('div', { style: 'margin:14px 0 8px;font-weight:700' }, ['复盘 · ' + short(D.review.reviewedAt)]) : null, D.review ? h('div', { class: 'm9-review' + (D.review.result === 'hit' ? ' hit' : '') }, [D.review.text]) : null
      ] }));
    }
    var who = h('div', { class: 'who' });
    ['总经理', '经营班子', '各会签负责人'].forEach(function (w, i) { who.appendChild(h('button', { class: i === M.who ? 'on' : '', onclick: function () { M.who = i; draw(); } }, [w])); });
    right.appendChild(P.card({ title: '决策月报', sub: d.period.replace('-', ' 年 ') + ' 月 · 微信文本版', body: [h('div', { class: 'pd-field' }, [h('label', {}, ['收件人']), who]), h('div', { class: 'pd-pre', style: 'margin-top:10px;max-height:280px;overflow:auto' }, [R.report.text])], foot: [P.btn('发送到微信', { cls: 'primary', onClick: function () { sh.setQrReady(true); sh.showWeChat(); } }), P.btn('回到驾驶舱', { onClick: function () { setStep('board'); } })] }));
    g.appendChild(right);
    work.appendChild(g);
  }

  window.DGG = window.DGG || {};
  window.DGG.registerModule('m9', { mount: mount, unmount: unmount, onCompany: onCompany, onIndustry: onIndustry });
})();
