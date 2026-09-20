/* AI获客 · 画像 脚本 线索 一次出（六屏）
 * 接入 → 获客驾驶舱 → 客户画像 → 话术脚本 → 线索池 → 跟进与周报
 * 全部计算走 DGG.coreM4（与 skill 同一份内核）；画像权重 / 脚本采用 / 分派 / 计划都写回同一份数据
 * 纯预制、断网可用；不用任何存储 API
 */
(function () {
  'use strict';
  var sh, $root, h, DATA, P, K, LIB;
  var ACCENT = window.DGG.PALETTE.m4;
  var CAPS = [['客户画像', '成交客户反推 · 三个典型细分 · 权重可调'], ['话术脚本', '细分 × 渠道 × 阶段 · 换一版 · 采用后带入跟进'], ['线索池', '匹配画像 + 行为信号打分 · 逐条解释 · 一键分派'], ['跟进与周报', '本周日程 · 逾期 · 成交预测 · 发送到微信']];
  var GRADE = { A: 'late', B: 'risk', C: 'handled', D: 'done' };
  var CH = [['phone', '电话'], ['wechat', '微信首触'], ['fair', '展会现场'], ['mail', '邮件']];
  var ST = [['first', '首触'], ['follow', '二次跟进'], ['quote', '报价后'], ['wake', '沉睡唤醒']];
  var M = { step: 'connect', arche: null, data: null, R: null, lead: null, filter: null, scr: { segId: null, channel: 'phone', stage: 'first', variant: 0 }, charged: false, name: null, company: null, frame: null, who: 0 };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function sectorOf(slug) { var hit = null; (DATA.industries.sectors || []).forEach(function (s) { (s.industries || []).forEach(function (i) { if (i.slug === slug) hit = s.key; }); }); return hit; }
  function archeOf(slug) { var sec = sectorOf(slug); var a = (sec && DATA.m10.archetypes.map[sec]) || 'make'; if (a === 'project') a = 'service'; return DATA.m4.samples[a] ? a : 'make'; }
  function loadArche(a) {
    M.arche = a;
    var base = K.ensure(DATA.m4.samples[a]);
    if (M.name) base.company = M.name;
    if (M.company && M.company.systems) { var sys = M.company.systems; base.sources.forEach(function (s) { if (s.id === 'crm') s.mode = sys.indexOf('crm') >= 0 ? 'direct' : 'import'; if (s.id === 'erp' || s.id === 'oms') s.mode = sys.indexOf('erp') >= 0 || sys.indexOf('shop') >= 0 ? 'direct' : 'import'; }); }
    M.data = base; M.lead = null; M.filter = null; M.scr = { segId: null, channel: 'phone', stage: 'first', variant: 0 };
    recompute();
  }
  function recompute() { M.R = K.run(M.data, LIB); }
  function commit(data, msg) { M.data = data; recompute(); draw(); if (msg && M.frame) P.toast(M.frame.body, msg); }
  function fmtN(n) { return P.fmtN(n); }
  function W(n) { return K.fmtW(n); }
  function focusSeg() { return M.R.profile.segments.filter(function (s) { return s.id === M.R.profile.focus; })[0]; }

  function mount(root, step, shell) {
    sh = shell; $root = root; h = sh.h; DATA = sh.DATA; P = window.DGG.pui; K = window.DGG.coreM4;
    LIB = { channels: DATA.m4.channels, signals: DATA.m4.signals, stages: DATA.m4.stages, scripts: DATA.m4.scripts, pains: DATA.m4.pains };
    P.init(sh);
    var c = sh.getCompany();
    if (!M.data) { M.company = c; M.name = c ? c.name : null; loadArche(c ? archeOf(c.industry) : archeOf(sh.displayIndustryDefault())); }
    M.step = step || 'connect';
    if (['connect', 'board', 'profile', 'script', 'leads', 'plan'].indexOf(M.step) < 0) M.step = 'connect';
    draw();
  }
  function unmount() { }
  function onCompany(c) { M.company = c; M.name = c ? c.name : null; M.charged = false; loadArche(c ? archeOf(c.industry) : archeOf(sh.displayIndustryDefault())); if (M.step !== 'connect') setStep('connect'); else draw(); }
  function onIndustry(slug) { if (M.step !== 'connect' || !slug) return; var a = archeOf(slug); if (a !== M.arche) { loadArche(a); draw(); } }
  function setStep(s) { M.step = s; sh.go('m4', s); }

  function draw() {
    sh.clear($root);
    var R = M.R, c = M.company, k = R.kpi;
    var meta = c ? [sh.industryNameOf(c.industry), sh.optText('size', c.size)].filter(Boolean).join(' · ') : M.data.prod;
    var tabs = [{ key: 'connect', label: '接入' }, { key: 'board', label: '获客驾驶舱' }, { key: 'profile', label: '客户画像' }, { key: 'script', label: '话术脚本' }, { key: 'leads', label: '线索池', badge: k.unassigned || 0 }, { key: 'plan', label: '跟进与周报', badge: k.overdue || 0 }];
    var F = P.frame({ mark: '获客', accent: ACCENT, modules: P.navModules('m4'), crumbs: ['AI获客', tabs.filter(function (t) { return t.key === M.step; })[0].label], company: { name: M.data.company, meta: meta }, tabs: tabs, active: M.step, chat: { id: 'm4', name: 'AI获客', step: M.step, onGo: setStep },
      onTab: function (key) { if (key === 'board' && !M.charged) enterBoard(); else setStep(key); } });
    M.frame = F; $root.appendChild(F.root);
    if (M.step === 'board' && !M.charged) { M.charged = true; sh.charge(K.CREDITS); }
    ({ connect: screenConnect, board: screenBoard, profile: screenProfile, script: screenScript, leads: screenLeads, plan: screenPlan })[M.step](F.work);
  }
  function enterBoard() { setStep('board'); }
  function col(cls, kids) { return h('div', { class: cls, style: 'display:flex;flex-direction:column;gap:16px' }, kids); }
  function gradeChip(g) { return P.chip(GRADE[g], g + ' 级'); }
  function logList(log) { var el = h('div', { class: 'm4-log' }); log.forEach(function (l) { el.appendChild(h('div', { class: 'l' }, [h('span', { class: 'n' }, [String(l.seq)]), h('b', {}, [l.label]), h('span', {}, [l.detail])])); }); return el; }

  /* ---------- 屏 1 ---------- */
  function screenConnect(work) {
    var d = M.data;
    work.classList.add('m4-connect');
    var g = h('div', { class: 'pd-grid' });
    var nameIn = h('input', { type: 'text', value: d.company, oninput: function (e) { M.name = e.target.value; d.company = e.target.value; var co = M.frame.root.querySelector('.pd-top .co span:nth-child(2)'); if (co) co.textContent = e.target.value; } });
    g.appendChild(P.card({ cls: 'c4', title: '企业', body: [h('div', { class: 'pd-form' }, [
      h('div', { class: 'pd-field' }, [h('label', {}, ['企业名称']), nameIn]),
      h('div', { class: 'pd-field' }, [h('label', {}, ['行业']), h('div', { style: 'font-weight:600' }, [M.company ? sh.industryNameOf(M.company.industry) + (M.company.size ? ' · ' + sh.optText('size', M.company.size) : '') : sh.industryNameOf(sh.displayIndustryDefault())])]),
      h('div', { class: 'pd-field' }, [h('label', {}, ['主打产品 / 服务']), h('div', { style: 'font-weight:600' }, [d.prod])]),
      h('div', { class: 'pd-field' }, [h('label', {}, ['已有数据']), h('div', { style: 'font-weight:600' }, ['成交客户 ' + d.deals.length + ' 家 · 线索 ' + d.leads.length + ' 条 · 销售 ' + d.teams.length + ' 组'])])
    ])] }));
    var caps = h('div'); CAPS.forEach(function (c, i) { caps.appendChild(h('div', { class: 'cap-row' }, [h('span', { class: 'ic' }, ['0' + (i + 1)]), h('div', {}, [h('div', { class: 't' }, [c[0]]), h('div', { class: 's' }, [c[1]])]), P.chip('ok', '已开通')])); });
    g.appendChild(P.card({ cls: 'c4', title: '已开通能力', sub: '4 项', body: [caps], foot: ['画像、脚本、线索一次出，跟进闭环写回同一份数据'] }));
    var srcs = h('div'); d.sources.forEach(function (s) { srcs.appendChild(h('div', { class: 'src-row' }, [h('div', {}, [h('div', { class: 't' }, [s.name]), h('div', { class: 's' }, ['同步 ' + s.lastSync + ' · ' + fmtN(s.rows) + ' 条'])]), P.chip(s.mode === 'direct' ? 'ok' : 'watch', s.mode === 'direct' ? '系统直连' : '表格导入'), h('span', { class: 'pd-dot ' + (s.mode === 'direct' ? 'ok' : 'risk') })])); });
    g.appendChild(P.card({ cls: 'c4', title: '数据源', sub: d.sources.length + ' 个', body: [srcs], foot: ['线索来源：' + LIB.channels.channels.map(function (c) { return c.name; }).join('、')] }));
    g.appendChild(h('div', { class: 'c12 go' }, [h('div', {}, [h('div', { class: 't' }, ['获客驾驶舱']), h('div', { class: 's' }, ['线索 ' + M.R.kpi.leads + ' 条 · A 级 ' + M.R.kpi.gradeA + ' · 未分派 ' + M.R.kpi.unassigned + ' · 逾期 ' + M.R.kpi.overdue])]), h('div', { class: 'sp' }), h('div', { class: 'cr' }, [h('b', { class: 'num' }, [String(K.CREDITS)]), ' 积分 / 次']), P.btn('进入获客驾驶舱', { cls: 'primary big', onClick: enterBoard })]));
    work.appendChild(g);
  }

  /* ---------- 屏 2 ---------- */
  function screenBoard(work) {
    var R = M.R, k = R.kpi, d = M.data, seg = focusSeg();
    var g = h('div', { class: 'pd-grid' });
    g.appendChild(h('div', { class: 'c12' }, [P.kpis([
      { label: '在手线索', value: k.leads, unit: '条', sub: '本周新增 ' + k.newWeek, onClick: function () { M.filter = null; setStep('leads'); } },
      { label: 'A 级线索', value: k.gradeA, unit: '条', tone: 'late', sub: 'B 级 ' + k.gradeB, onClick: function () { M.filter = 'A'; setStep('leads'); } },
      { label: '跟进中', value: k.following, unit: '条', tone: 'accent', sub: '已分派且已联系' },
      { label: '未分派', value: k.unassigned, unit: '条', tone: k.unassigned ? 'risk' : 'ok', sub: '点开一键分派', onClick: function () { M.filter = 'unassigned'; setStep('leads'); } },
      { label: '逾期未跟进', value: k.overdue, unit: '条', tone: k.overdue ? 'late' : 'ok', sub: '超过等级对应节奏', onClick: function () { M.filter = 'overdue'; setStep('leads'); } },
      { label: '本月成交', value: k.wonMonth, unit: '单', tone: 'ok', sub: '近 90 天 ' + k.deals90 + ' 单' },
      { label: '成交预测', value: W(k.expected), sub: '管道 ' + W(k.pipeline) + ' · 按阶段加权', tone: 'accent', onClick: function () { setStep('plan'); } },
      { label: '单条线索成本', value: fmtN(k.costPerLead), unit: '元', sub: '近 30 天 · 全渠道' }
    ])]));
    g.appendChild(P.card({ cls: 'c5', title: '获客漏斗', sub: '线索 → 成交 · 括号为到下一级转化率', body: [P.funnel({ stages: R.funnel.stages.map(function (s) { return { name: s.name, count: s.count, rate: s.rate }; }) })], foot: ['商机转化率 ' + k.conversion + '% · 平均成交周期 ' + k.avgCycle + ' 天'] }));
    var ctbl = P.table({ compact: true, cols: [
      { key: 'name', label: '渠道', render: function (c) { return h('span', {}, [h('b', {}, [c.name]), h('span', { class: 'sub' }, [c.kind])]); } },
      { key: 'leads', label: '线索', align: 'r', sort: true }, { key: 'gradeA', label: 'A 级', align: 'r', sort: true },
      { key: 'costPerLead', label: '元 / 条', align: 'r', sort: true, render: function (c) { return c.costPerLead != null ? fmtN(c.costPerLead) : '—'; } },
      { key: 'deals12', label: '近 12 月成交', align: 'r', sort: true, render: function (c) { return c.deals12 + ' 单 · ' + W(c.dealAmount); } },
      { key: 'costPerDeal', label: '元 / 单', align: 'r', sort: true, render: function (c) { return c.costPerDeal != null ? fmtN(c.costPerDeal) : '—'; } }
    ], rows: R.funnel.channels });
    g.appendChild(P.card({ cls: 'c7', title: '渠道', sub: '线索来源与投入产出', tight: true, body: [ctbl] }));
    g.appendChild(P.card({ cls: 'c4', title: '重点画像', sub: seg.name, body: [P.kv([['规模', seg.sizeLabel], ['区域', seg.region], ['客单价', W(seg.amount)], ['成交周期', seg.cycle + ' 天'], ['复购率', Math.round(seg.repeat * 100) + '%'], ['占成交价值', Math.round(seg.share * 100) + '%']]), h('div', { class: 'pd-legend', style: 'margin-top:10px' }, seg.pains.slice(0, 3).map(function (p) { return P.chip('accent', p.tag, true); }))], foot: [P.btn('看画像', { cls: 'sm', onClick: function () { setStep('profile'); } }), P.btn('出脚本', { cls: 'sm', onClick: function () { setStep('script'); } })] }));
    var today = R.plan.days[0], items = R.plan.items.slice(0, 8), list = h('div', { class: 'pd-list' });
    items.forEach(function (it) { list.appendChild(P.item({ tone: GRADE[it.grade], icon: it.grade, title: it.leadId + ' · ' + it.name, sub: it.actionLabel + ' · ' + it.ownerName + (it.script ? ' · 脚本 ' + it.script : '') + (it.overdue ? ' · 逾期' : ''), right: K.short(it.date), rightSub: W(it.amountEst), onClick: function () { M.lead = it.leadId; setStep('leads'); } })); });
    if (!items.length) list.appendChild(P.empty('本周暂无跟进安排'));
    g.appendChild(P.card({ cls: 'c8', title: '本周待跟进', sub: R.plan.items.length + ' 次 · ' + today.label + ' 起', body: [list], extra: [P.btn('全部', { cls: 'sm', onClick: function () { setStep('plan'); } })] }));
    if (d.log.length) g.appendChild(P.card({ cls: 'c12', title: '本周动作', sub: d.log.length + ' 条', body: [logList(d.log.slice(-6).reverse())] }));
    work.appendChild(g);
  }

  /* ---------- 屏 3 ---------- */
  function screenProfile(work) {
    var R = M.R, Pf = R.profile, d = M.data, seg = focusSeg();
    var g = h('div', { class: 'pd-grid' });
    g.appendChild(h('div', { class: 'c12' }, [P.kpis([
      { label: '成交客户', value: Pf.dealCount, unit: '家', sub: '近 12 个月 · ' + W(Pf.totalAmount) },
      { label: '平均客单', value: W(Pf.avgAmount), sub: '年采购额' }, { label: '平均成交周期', value: Pf.avgCycle, unit: '天' }, { label: '复购率', value: Math.round(Pf.repeatRate * 100), unit: '%', tone: 'ok' },
      { label: '重点细分', value: seg.id, sub: seg.name, tone: 'accent' }, { label: '匹配此画像的 A 级线索', value: R.leads.filter(function (l) { return l.grade === 'A' && l.stage !== 'won'; }).length, unit: '条', tone: 'late' }
    ])]));
    // 细分卡
    var cards = h('div', { class: 'm4-segs' });
    Pf.segments.forEach(function (s) {
      cards.appendChild(h('button', { class: 'seg' + (s.id === Pf.focus ? ' on' : ''), onclick: function () { if (s.id !== Pf.focus) commit(K.setFocus(d, s.id), '重点细分切换为 ' + s.name + ' · 线索评分已重算'); } }, [
        h('div', { class: 'hd' }, [h('span', { class: 'id' }, [s.id]), h('span', { class: 'nm' }, [s.name]), s.id === Pf.focus ? P.chip('accent', '重点') : null]),
        h('div', { class: 'segkv' }, [h('span', {}, [s.count + ' 家 · 占 ' + Math.round(s.share * 100) + '% 价值']), h('span', {}, [s.sizeLabel + ' · ' + s.region]), h('span', {}, ['客单 ' + W(s.amount) + ' · ' + s.cycle + ' 天 · 复购 ' + Math.round(s.repeat * 100) + '%'])]),
        h('div', { class: 'tags' }, s.pains.slice(0, 3).map(function (p) { return P.chip('watch', p.tag, true); }))
      ]));
    });
    g.appendChild(P.card({ cls: 'c12', title: '三个典型细分', sub: '按（行业大类 × 决策人）的加权成交价值排序 · 点卡片切换重点', body: [cards] }));
    // 分布 + 权重
    var distEl = h('div', { class: 'm4-dist' });
    K.DIMS.forEach(function (dim) {
      var rows = Pf.dist[dim].rows.slice(0, 5).map(function (r) { return { label: r.label, value: r.weighted, share: r.share, hi: seg.vals[dim] && seg.vals[dim][r.value] >= 0.3 }; });
      var w = d.weights[dim] != null ? d.weights[dim] : 1;
      distEl.appendChild(h('div', { class: 'dim' }, [
        h('div', { class: 'h' }, [h('b', {}, [K.DIM_LABEL[dim]]), h('span', { class: 'w num' }, ['权重 ' + Math.round(Pf.weights[dim] * 100) + '%']), h('span', { class: 'adj' }, [[0.5, '×0.5'], [1, '×1'], [1.5, '×1.5'], [2, '×2']].map(function (o) { return h('button', { class: w === o[0] ? 'on' : '', onclick: function () { commit(K.setWeight(d, dim, o[0]), K.DIM_LABEL[dim] + '权重 ' + o[1] + ' · 线索评分已重算'); } }, [o[1]]); }))]),
        P.dist({ rows: rows })
      ]));
    });
    g.appendChild(P.card({ cls: 'c7', title: '成交客户长什么样', sub: '按客单价 × 复购加权的价值占比 · 高亮为重点细分的取值 · 权重按分布集中度得出，可调', body: [distEl] }));
    // 焦点细分详情
    var right = col('c5', []);
    right.appendChild(P.card({ title: seg.id + ' ' + seg.name, sub: seg.sectorName + ' · ' + seg.role, accent: true, body: [
      P.kv([['行业', seg.industries.join('、')], ['规模', seg.sizeLabel], ['区域', seg.region], ['客单价', W(seg.amount)], ['成交周期', seg.cycle + ' 天'], ['复购率', Math.round(seg.repeat * 100) + '%']]),
      h('div', { style: 'margin-top:12px;font-weight:700' }, ['他们的痛点']), h('ul', { class: 'm4-ul' }, seg.pains.map(function (p) { return h('li', {}, [h('b', {}, [p.tag]), ' ' + p.text]); })),
      h('div', { style: 'margin-top:10px;font-weight:700' }, ['我们的买点']), h('ul', { class: 'm4-ul' }, seg.offers.map(function (o) { return h('li', {}, [o.text]); })),
      h('div', { style: 'margin-top:10px;font-weight:700' }, ['最像的成交客户']), P.table({ compact: true, cols: [{ key: 'customer', label: '客户' }, { key: 'amount', label: '年采购额', align: 'r', render: function (x) { return W(x.amount); } }, { key: 'cycleDays', label: '周期', align: 'r', render: function (x) { return x.cycleDays + ' 天'; } }, { key: 'channel', label: '来源', render: function (x) { return K.CHANNEL_NAME[x.channel]; } }], rows: seg.topDeals })
    ], foot: [P.btn('按此画像出脚本', { cls: 'primary sm', onClick: function () { M.scr.segId = seg.id; setStep('script'); } }), P.btn('看匹配线索', { cls: 'sm', onClick: function () { M.filter = 'A'; setStep('leads'); } })] }));
    g.appendChild(right);
    work.appendChild(g);
  }

  /* ---------- 屏 4 ---------- */
  function screenScript(work) {
    var R = M.R, Pf = R.profile, d = M.data;
    if (!M.scr.segId) M.scr.segId = Pf.focus;
    var sc = K.script(d, Pf, LIB, M.scr);
    work.classList.add('m4-script');
    var g = h('div', { class: 'pd-grid' });
    var chips = function (label, opts, key, onPick) { return h('div', { class: 'pd-field' }, [h('label', {}, [label]), h('div', { class: 'chips' }, opts.map(function (o) { return h('button', { class: M.scr[key] === o[0] ? 'on' : '', onclick: function () { M.scr[key] = o[0]; M.scr.variant = 0; draw(); } }, [o[1]]); }))]); };
    g.appendChild(P.card({ cls: 'c4', title: '选择', sub: '细分 × 渠道 × 阶段', body: [h('div', { class: 'pd-form' }, [
      chips('客户细分', Pf.segments.map(function (s) { return [s.id, s.id + ' ' + s.name]; }), 'segId'),
      chips('触达渠道', CH, 'channel'), chips('阶段', ST, 'stage'),
      h('div', { class: 'pd-field' }, [h('label', {}, ['版本']), h('div', { class: 'chips' }, [h('button', { class: M.scr.variant === 0 ? 'on' : '', onclick: function () { M.scr.variant = 0; draw(); } }, ['第 1 版']), h('button', { class: M.scr.variant === 1 ? 'on' : '', onclick: function () { M.scr.variant = 1; draw(); } }, ['第 2 版']), P.btn('换一版', { cls: 'sm', onClick: function () { M.scr.variant = (M.scr.variant + 1) % 2; draw(); } })])])
    ])], foot: [sc.adopted ? P.chip('ok', '已采用') : P.btn('采用此版', { cls: 'primary', onClick: function () { commit(K.adoptScript(d, sc.key, sc.variant), '已采用：' + sc.segName + ' · ' + sc.channelName + ' · ' + sc.stageName + ' 第 ' + (sc.variant + 1) + ' 版，跟进任务已带上'); } }), P.btn('发送到微信', { onClick: function () { sh.setQrReady(true); sh.showWeChat(); } })] }));
    var doc = h('div', { class: 'pd-doc' });
    doc.appendChild(h('div', { class: 'title' }, [sc.segName, h('span', { class: 'd' }, [sc.channelName + ' · ' + sc.stageName + ' · 第 ' + (sc.variant + 1) + ' 版 · ' + sc.words + ' 字'])]));
    sc.sections.forEach(function (s) { doc.appendChild(h('div', { class: 'sec' }, [h('h4', {}, [s.title]), h('p', { class: 'm4-p' }, [s.text])])); });
    doc.appendChild(h('div', { class: 'sec' }, [h('h4', {}, ['异议应答']), h('div', { class: 'm4-obj' }, sc.objections.map(function (o) { return h('div', { class: 'o' }, [h('div', { class: 'q' }, ['「' + o.q + '」']), h('div', { class: 'a' }, [o.a])]); }))]));
    g.appendChild(h('div', { class: 'c8' }, [doc]));
    work.appendChild(g);
  }

  /* ---------- 屏 5 ---------- */
  function screenLeads(work) {
    var R = M.R, d = M.data, rows = R.leads.filter(function (l) { return l.stage !== 'won'; });
    var f = M.filter;
    var shown = rows.filter(function (l) { return f === 'A' ? l.grade === 'A' : f === 'unassigned' ? !l.owner && !l.dormant : f === 'overdue' ? l.overdue && l.owner : f === 'dormant' ? l.dormant : f === 'B' ? l.grade === 'B' : true; });
    if (!M.lead || !R.byId[M.lead]) M.lead = (shown[0] || rows[0]).id;
    var L = R.byId[M.lead];
    var g = h('div', { class: 'pd-grid' });
    var filt = function (key) { return function () { M.filter = M.filter === key ? null : key; draw(); }; };
    g.appendChild(h('div', { class: 'c12' }, [P.kpis([
      { label: '在手线索', value: rows.length, unit: '条', onClick: filt(null), active: !f }, { label: 'A 级', value: rows.filter(function (l) { return l.grade === 'A'; }).length, unit: '条', tone: 'late', onClick: filt('A'), active: f === 'A' },
      { label: 'B 级', value: rows.filter(function (l) { return l.grade === 'B'; }).length, unit: '条', tone: 'risk', onClick: filt('B'), active: f === 'B' }, { label: '未分派', value: R.kpi.unassigned, unit: '条', tone: 'risk', onClick: filt('unassigned'), active: f === 'unassigned' },
      { label: '逾期', value: R.kpi.overdue, unit: '条', tone: 'late', onClick: filt('overdue'), active: f === 'overdue' }, { label: '沉睡', value: R.kpi.dormant, unit: '条', onClick: filt('dormant'), active: f === 'dormant' }
    ])]));
    var tbl = P.table({ cols: [
      { key: 'id', label: '代号', render: function (l) { return h('span', {}, [h('b', { class: 'id' }, [l.id]), h('span', { class: 'sub' }, [l.channelName])]); } },
      { key: 'industry', label: '线索', sort: true, render: function (l) { return h('span', {}, [l.industry, h('span', { class: 'sub' }, [l.region + ' · ' + l.sizeLabel + ' · ' + l.role])]); } },
      { key: 'total', label: '分值', align: 'r', sort: true, sortDesc: true, render: function (l) { return P.bar(l.total, GRADE[l.grade], l.total + ''); } },
      { key: 'grade', label: '意向', sort: true, render: function (l) { return gradeChip(l.grade); } },
      { key: 'stageIdx', label: '阶段', sort: true, render: function (l) { return l.stageName; } },
      { key: 'lastAge', label: '最近动作', sort: true, render: function (l) { return h('span', { class: l.overdue ? 'neg' : '' }, [l.lastAction ? K.short(l.lastAction.date) + ' · ' + l.lastAge + ' 天前' : '无']); } },
      { key: 'ownerName', label: '负责', render: function (l) { return l.ownerName || h('span', { style: 'color:var(--t-risk);font-weight:700' }, ['待分派']); } },
      { key: 'action', label: '下一步', render: function (l) { return h('span', {}, [l.actionLabel, l.dormant ? P.chip('done', '沉睡') : l.overdue ? P.chip('late', '逾期') : l.planned ? P.chip('handled', '已排') : null]); } }
    ], rows: shown, sortKey: 'total', sortDir: 'desc', rowKey: function (l) { return l.id; }, activeKey: M.lead, onRow: function (l) { M.lead = l.id; draw(); } });
    g.appendChild(P.card({ cls: 'c8', title: '线索池', sub: shown.length + ' 条' + (f ? ' · 已筛选' : '') + ' · 按分值排序 · 点一条看判断', tight: true, body: [h('div', { class: 'pd-scroll', style: 'max-height:600px' }, [tbl])], extra: [R.kpi.unassigned ? P.btn('一键分派 ' + R.kpi.unassigned + ' 条', { cls: 'primary sm', onClick: function () { M.filter = null; commit(K.assignAll(d, LIB), '已按行业熟悉度与负载分派，本周计划已更新'); } }) : null] }));
    // 焦点
    var ex = K.explain(L, R.profile, d, LIB);
    var rec = K.recommendTeam(L, R.teams);
    var acts = h('div', { class: 'pd-actions' });
    if (L.stage !== 'won') {
      if (!L.owner) acts.appendChild(h('div', { class: 'pd-action best' }, [h('div', { class: 't' }, [h('span', { class: 'rank' }, ['1']), '分派给 ' + (rec ? rec.name : '—')]), P.btn('分派', { cls: 'primary sm', disabled: !rec, onClick: function () { commit(K.assign(d, L.id, rec.id), L.id + ' 已分派给 ' + rec.name); } }), h('div', { class: 'd' }, [rec ? (rec.sectors.indexOf(L.sector) >= 0 ? '熟悉该行业' : '有空位') + ' · 当前负载 ' + rec.load + '/' + rec.cap : '各组已满'])]));
      if (L.owner && !L.planned && !L.dormant) acts.appendChild(h('div', { class: 'pd-action' + (L.owner ? ' best' : '') }, [h('div', { class: 't' }, [h('span', { class: 'rank' }, [L.owner ? '1' : '2']), '加入本周计划 · ' + L.actionLabel]), P.btn('加入', { cls: 'primary sm', onClick: function () { commit(K.addPlan(d, L.id), L.id + ' 已加入本周计划'); } }), h('div', { class: 'd' }, ['按 ' + L.grade + ' 级 ' + L.dueDays + ' 天节奏排入 ' + (L.ownerName || '') + ' 的日程'])]));
      acts.appendChild(h('div', { class: 'pd-action' }, [h('div', { class: 't' }, [h('span', { class: 'rank' }, ['·']), '记录跟进并推进到下一阶段']), P.btn('记录', { cls: 'sm', onClick: function () { commit(K.advance(d, L.id, L.actionLabel + ' · 已完成'), L.id + ' 已推进到下一阶段'); } }), h('div', { class: 'd' }, ['当前 ' + L.stageName + ' → 下一阶段，最近动作更新为今天'])]));
      if (!L.dormant) acts.appendChild(h('div', { class: 'pd-action' }, [h('div', { class: 't' }, [h('span', { class: 'rank' }, ['·']), '标记沉睡']), P.btn('标记', { cls: 'sm', onClick: function () { commit(K.markDormant(d, L.id), L.id + ' 已标记沉睡，转入唤醒队列'); } }), h('div', { class: 'd' }, ['退出本周计划，按沉睡唤醒脚本定期触达'])]));
    }
    var right = col('c4', [P.card({ title: L.id, sub: L.name + ' · ' + L.role, accent: true, body: [
      h('div', { class: 'm4-lhead' }, [gradeChip(L.grade), h('span', { class: 'm' }, [h('b', { class: 'num' }, [String(L.total)]), h('span', {}, ['综合'])]), h('span', { class: 'm' }, [h('b', { class: 'num' }, [String(L.match)]), h('span', {}, ['匹配'])]), h('span', { class: 'm' }, [h('b', { class: 'num' }, [String(L.signal)]), h('span', {}, ['信号'])]), h('span', { class: 'm' }, [h('b', { class: 'num' }, [W(L.amountEst)]), h('span', {}, ['预计金额'])])]),
      P.judge({ verdict: { tone: L.dormant ? 'done' : L.overdue ? 'late' : GRADE[L.grade] === 'late' ? 'ok' : 'risk', chip: L.actionLabel, text: L.dormant ? '已 ' + L.lastAge + ' 天无动作，按沉睡唤醒处理' : L.overdue ? '距上次动作 ' + L.lastAge + ' 天，超过节奏' : L.grade + ' 级 · ' + L.stageName + ' · ' + L.actionLabel }, seen: ex.seen, reasons: ex.reasons, actionsEl: acts, actionsTitle: '建议动作' })
    ] })]);
    g.appendChild(right);
    work.appendChild(g);
  }

  /* ---------- 屏 6 ---------- */
  function screenPlan(work) {
    var R = M.R, pl = R.plan, fc = R.forecast, d = M.data;
    work.classList.add('m4-plan');
    var g = h('div', { class: 'pd-grid' });
    g.appendChild(h('div', { class: 'c12' }, [P.kpis([
      { label: '本周跟进', value: pl.items.length, unit: '次', tone: 'accent', sub: pl.byTeam.filter(function (t) { return t.count; }).map(function (t) { return t.name + ' ' + t.count; }).join(' · ') },
      { label: '逾期待补', value: pl.overdue.length, unit: '条', tone: pl.overdue.length ? 'late' : 'ok' }, { label: '未分派', value: pl.unassigned.length, unit: '条', tone: pl.unassigned.length ? 'risk' : 'ok', onClick: function () { M.filter = 'unassigned'; setStep('leads'); } },
      { label: '成交预测', value: W(fc.expected), sub: '管道 ' + W(fc.pipeline) + ' · 约 ' + fc.expectedDeals + ' 单', tone: 'ok' }, { label: '在手商机', value: fc.count, unit: '条' }
    ])]));
    var days = h('div', { class: 'days' });
    pl.days.forEach(function (day) {
      var list = h('div', { class: 'list' });
      day.items.forEach(function (it) { list.appendChild(h('button', { class: 'it', onclick: function () { M.lead = it.leadId; setStep('leads'); } }, [h('div', { class: 'h' }, [gradeChip(it.grade), h('b', {}, [it.leadId])]), h('div', { class: 'n' }, [it.name]), h('div', { class: 's' }, [it.actionLabel + ' · ' + it.ownerName + (it.script ? ' · ' + it.script : '') + (it.overdue ? ' · 逾期' : '')])])); });
      if (!day.items.length) list.appendChild(P.empty('无安排'));
      days.appendChild(h('div', { class: 'day' }, [h('div', { class: 'dh' }, [h('b', {}, [day.label]), h('span', {}, [day.items.length + ' 次'])]), list]));
    });
    g.appendChild(P.card({ cls: 'c8', title: '本周跟进日程', sub: '今天起 5 个工作日 · 每组每天不超过 5 条 · 点卡片看线索', body: [days] }));
    var right = col('c4', []);
    var ov = h('div', { class: 'pd-list' });
    pl.overdue.slice(0, 6).forEach(function (l) { ov.appendChild(P.item({ tone: 'late', icon: l.lastAge + '天', title: l.id + ' · ' + l.industry, sub: l.actionLabel + ' · ' + l.ownerName, right: l.grade + ' 级', rightSub: W(l.amountEst), onClick: function () { M.lead = l.id; setStep('leads'); } })); });
    if (!pl.overdue.length) ov.appendChild(P.empty('没有逾期'));
    right.appendChild(P.card({ title: '逾期待补', sub: pl.overdue.length + ' 条', body: [ov] }));
    right.appendChild(P.card({ title: '各组负载', sub: '在手 / 上限', body: [h('div', { style: 'display:grid;gap:8px' }, R.teams.map(function (t) { return h('div', { style: 'display:flex;justify-content:space-between;align-items:center;gap:10px' }, [h('span', {}, [t.name, h('span', { class: 'sub', style: 'display:block;color:var(--pd-sub);font-size:12px' }, [t.sectors.map(function (x) { return (LIB.pains[x] || {}).name || x; }).join(' · ')])]), P.bar(100 * t.load / t.cap, t.load / t.cap > 0.9 ? 'late' : t.load / t.cap > 0.7 ? 'risk' : 'ok', t.load + ' / ' + t.cap)]); }))] }));
    g.appendChild(right);
    var fcTbl = P.table({ compact: true, cols: [{ key: 'name', label: '阶段' }, { key: 'count', label: '条数', align: 'r' }, { key: 'pipeline', label: '管道金额', align: 'r', render: function (r) { return W(r.pipeline); } }, { key: 'expected', label: '加权预测', align: 'r', render: function (r) { return h('b', {}, [W(r.expected)]); } }], rows: fc.byStage });
    var teamTbl = P.table({ compact: true, cols: [{ key: 'name', label: '小组' }, { key: 'count', label: '在手', align: 'r' }, { key: 'pipeline', label: '管道', align: 'r', render: function (r) { return W(r.pipeline); } }, { key: 'expected', label: '加权预测', align: 'r', render: function (r) { return h('b', {}, [W(r.expected)]); } }], rows: fc.byTeam });
    g.appendChild(P.card({ cls: 'c4', title: '成交预测 · 按阶段', sub: '阶段概率 × 预计金额', tight: true, body: [fcTbl] }));
    g.appendChild(P.card({ cls: 'c4', title: '成交预测 · 按小组', tight: true, body: [teamTbl] }));
    var who = h('div', { class: 'who' });
    ['销售负责人', '总经理', '各组组长'].forEach(function (w, i) { who.appendChild(h('button', { class: i === M.who ? 'on' : '', onclick: function () { M.who = i; draw(); } }, [w])); });
    g.appendChild(P.card({ cls: 'c4', title: '获客周报', sub: K.short(d.weekStart) + ' 周 · 微信文本版', body: [h('div', { class: 'pd-field' }, [h('label', {}, ['收件人']), who]), h('div', { class: 'pd-pre', style: 'margin-top:10px;max-height:300px;overflow:auto' }, [R.report.text])], foot: [P.btn('发送到微信', { cls: 'primary', onClick: function () { sh.setQrReady(true); sh.showWeChat(); } }), P.btn('回到驾驶舱', { onClick: function () { setStep('board'); } })] }));
    work.appendChild(g);
  }

  window.DGG = window.DGG || {};
  window.DGG.registerModule('m4', { mount: mount, unmount: unmount, onCompany: onCompany, onIndustry: onIndustry });
})();
