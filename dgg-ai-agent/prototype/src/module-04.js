/* AI获客 · 六屏动画叙事（接入 → 获客驾驶舱 → 客户画像 → 话术脚本 → 线索池 → 跟进与周报）
 * 每屏三拍：接入（左侧源亮 → 数据包飞向处理块 → 处理块扫描）
 *           展开（KPI 数字滚 / 条形生长 / 明细逐行流入）
 *           结论（一句话结论推上来 + 聚焦支撑它的那一行）
 * 计算全部走 DGG.coreM4（与 skill 同一份内核）；对话大脑登记在 DGG.chatBrain('m4')
 * 纯预制、断网可用；不用任何存储 API
 */
(function () {
  'use strict';
  var sh, $root, h, DATA, P, K, LIB, A;
  var ACCENT = window.DGG.PALETTE.m4;
  var GRADE = { A: 'late', B: 'risk', C: 'handled', D: 'done' };
  var CH = [['phone', '电话'], ['wechat', '微信首触'], ['fair', '展会现场'], ['mail', '邮件']];
  var ST = [['first', '首触'], ['follow', '二次跟进'], ['quote', '报价后'], ['wake', '沉睡唤醒']];
  var M = {
    step: 'connect', arche: null, data: null, R: null, lead: null, filter: null,
    scr: { segId: null, channel: 'phone', stage: 'first', variant: 0 },
    charged: false, name: null, company: null, frame: null, who: 0,
    anim: true, play: null, seq: 0
  };

  /* ---------- 小工具 ---------- */
  function msOf(s) { var p = String(s).slice(0, 10).split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2]); }
  function ageDays(ts) { return Math.round((msOf(M.data.today) - msOf(ts)) / 86400000); }
  function fmtN(n) { return P.fmtN(n); }
  function W(n) { return K.fmtW(n); }
  function focusSeg() { return M.R.profile.segments.filter(function (s) { return s.id === M.R.profile.focus; })[0]; }
  function sectorOf(slug) { var hit = null; (DATA.industries.sectors || []).forEach(function (s) { (s.industries || []).forEach(function (i) { if (i.slug === slug) hit = s.key; }); }); return hit; }
  function archeOf(slug) { var sec = sectorOf(slug); var a = (sec && DATA.m10.archetypes.map[sec]) || 'make'; if (a === 'project') a = 'service'; return DATA.m4.samples[a] ? a : 'make'; }
  function openLeads() { return M.R.leads.filter(function (l) { return l.stage !== 'won' && !l.dormant; }); }
  function work() { return M.frame ? M.frame.work : null; }
  function q(sel) { var w = work(); return w ? w.querySelector(sel) : null; }
  function qa(sel) { var w = work(); return w ? Array.prototype.slice.call(w.querySelectorAll(sel)) : []; }
  function rowOf(id) {
    var trs = qa('.pd-table tbody tr'), i;
    for (i = 0; i < trs.length; i++) if (trs[i].textContent.indexOf(id) >= 0) return trs[i];
    return null;
  }

  function loadArche(a) {
    M.arche = a;
    var base = K.ensure(DATA.m4.samples[a]);
    if (M.name) base.company = M.name;
    if (M.company && M.company.systems) {
      var sys = M.company.systems;
      base.sources.forEach(function (s) {
        if (s.id === 'crm') s.mode = sys.indexOf('crm') >= 0 ? 'direct' : 'import';
        if (s.id === 'erp' || s.id === 'oms') s.mode = sys.indexOf('erp') >= 0 || sys.indexOf('shop') >= 0 ? 'direct' : 'import';
      });
    }
    M.data = base; M.lead = null; M.filter = null;
    M.scr = { segId: null, channel: 'phone', stage: 'first', variant: 0 };
    recompute();
  }
  function recompute() { M.R = K.run(M.data, LIB); }
  function commit(data, msg) { M.data = data; recompute(); draw(); if (msg && M.frame) P.toast(M.frame.body, msg); }
  function still() { M.anim = false; draw(); M.anim = true; }

  function mount(root, step, shell) {
    sh = shell; $root = root; h = sh.h; DATA = sh.DATA; P = window.DGG.pui; K = window.DGG.coreM4; A = window.DGG.anim;
    LIB = { channels: DATA.m4.channels, signals: DATA.m4.signals, stages: DATA.m4.stages, scripts: DATA.m4.scripts, pains: DATA.m4.pains };
    P.init(sh);
    var c = sh.getCompany();
    if (!M.data) { M.company = c; M.name = c ? c.name : null; loadArche(c ? archeOf(c.industry) : archeOf(sh.displayIndustryDefault())); }
    M.step = step || 'connect';
    if (['connect', 'board', 'profile', 'script', 'leads', 'plan'].indexOf(M.step) < 0) M.step = 'connect';
    draw();
  }
  function unmount() { }
  function onCompany(c) {
    M.company = c; M.name = c ? c.name : null; M.charged = false;
    loadArche(c ? archeOf(c.industry) : archeOf(sh.displayIndustryDefault()));
    if (M.step !== 'connect') setStep('connect'); else draw();
  }
  function onIndustry(slug) { if (M.step !== 'connect' || !slug) return; var a = archeOf(slug); if (a !== M.arche) { loadArche(a); draw(); } }
  function setStep(s) { M.step = s; sh.go('m4', s); }
  function enterBoard() { setStep('board'); }

  /* ---------- 动画部件 ---------- */
  function vbar(text, tone) {
    var e = h('div', { class: 'm4-vd' + (tone ? ' ' + tone : '') }, [h('span', { class: 'ic' }, ['AI']), h('b', {}, [text])]);
    e.style.visibility = 'hidden';
    return e;
  }
  function vshow(e) {
    if (!e) return;
    e.style.visibility = '';
    e.classList.remove('an-verdict');
    void e.offsetWidth;
    e.classList.add('an-verdict');
  }
  function nspan(txt) { return h('span', { class: 'num' }, [String(txt)]); }
  function countTo(el, to, ms, dec) { if (el) A.count(el, to, { ms: ms || 820, decimals: dec || 0 }); }
  function countW(el, to, ms) {
    if (!el) return;
    if (Math.abs(to) >= 10000) A.count(el, to / 10000, { ms: ms || 820, decimals: 1, unit: ' 万元' });
    else A.count(el, to, { ms: ms || 820, unit: ' 元' });
  }
  function fly(from, to, opt) {
    opt = opt || {};
    opt.host = M.frame ? M.frame.body : null;
    return A.packet(from, to, opt);
  }
  /* 起手先把终态清零，否则观众先看见结果再看见动画 */
  function armBars(list) {
    var out = Array.prototype.slice.call(list || []);
    out.forEach(function (el) {
      if (!el) return;
      if (el.getAttribute('data-to') == null) el.setAttribute('data-to', String(parseFloat(el.style.width) || 0));
      el.style.width = '0%';
    });
    return out;
  }
  function armNums(list) { (list || []).forEach(function (x) { if (x.el) x.el.textContent = x.w ? '0.0 万元' : '0'; }); return list; }
  function armRows(list) { var out = Array.prototype.slice.call(list || []); out.forEach(function (tr) { if (tr) tr.classList.add('an-row-wait'); }); return out; }
  function armRise(list) { var out = Array.prototype.slice.call(list || []); out.forEach(function (el) { if (el) el.style.opacity = '0'; }); return out; }
  function replay(label) {
    return P.btn(label, { cls: 'sm', onClick: function () { A.stopAll(); if (M.play) M.play(); } });
  }

  /* ---------- 页框 ---------- */
  function draw() {
    sh.clear($root);
    var R = M.R, c = M.company, k = R.kpi;
    var meta = c ? [sh.industryNameOf(c.industry), sh.optText('size', c.size)].filter(Boolean).join(' · ') : M.data.prod;
    var tabs = [{ key: 'connect', label: '接入' }, { key: 'board', label: '获客驾驶舱' }, { key: 'profile', label: '客户画像' },
      { key: 'script', label: '话术脚本' }, { key: 'leads', label: '线索池', badge: k.unassigned || 0 }, { key: 'plan', label: '跟进与周报', badge: k.overdue || 0 }];
    var F = P.frame({
      mark: '获客', accent: ACCENT, modules: P.navModules('m4'),
      crumbs: ['AI获客', tabs.filter(function (t) { return t.key === M.step; })[0].label],
      company: { name: M.data.company, meta: meta }, tabs: tabs, active: M.step,
      chat: { id: 'm4', name: 'AI获客', step: M.step, onGo: setStep },
      onTab: function (key) { if (key === 'board' && !M.charged) enterBoard(); else setStep(key); }
    });
    M.frame = F; $root.appendChild(F.root);
    if (M.step === 'board' && !M.charged) { M.charged = true; sh.charge(K.CREDITS); }
    M.play = null;
    ({ connect: screenConnect, board: screenBoard, profile: screenProfile, script: screenScript, leads: screenLeads, plan: screenPlan })[M.step](F.work);
    if (M.play) {
      if (M.anim) M.play();
      else { A.stopAll(); qa('.m4-vd').forEach(function (e) { e.style.visibility = ''; }); }
    }
  }
  function col(cls, kids) { return h('div', { class: cls, style: 'display:flex;flex-direction:column;gap:16px' }, kids); }
  function gradeChip(g) { return P.chip(GRADE[g], g + ' 级'); }

  /* ================= 屏 1 · 接入 ================= */
  function screenConnect(work) {
    var d = M.data, R = M.R, k = R.kpi;
    work.classList.add('m4-connect');
    var g = h('div', { class: 'pd-grid' });

    var maxRows = Math.max.apply(null, d.sources.map(function (s) { return s.rows; }));
    var total = d.sources.reduce(function (t, s) { return t + s.rows; }, 0);
    var srcEls = [], bars = [], stale = null, staleEl = null;
    var srcCol = h('div', { class: 'fcol src' }, [h('div', { class: 'ft' }, ['数据源'])]);
    d.sources.forEach(function (s) {
      var age = ageDays(s.lastSync);
      if (!stale || age > stale.age) { stale = { name: s.name, age: age, sync: s.lastSync }; }
      var bar = h('i', { 'data-to': String(Math.round(100 * s.rows / maxRows)) });
      var row = h('div', { class: 'srow' + (s.mode === 'direct' ? ' on' : '') }, [
        h('div', { class: 'm' }, [h('div', { class: 't' }, [s.name]), h('div', { class: 'trk' }, [bar])]),
        h('div', { class: 'r' }, [h('b', { class: 'num' }, [fmtN(s.rows)]), h('span', {}, [s.lastSync.slice(5, 10)])]),
        s.mode === 'direct' ? h('span', { class: 'an-live' }) : h('span', { class: 'imp' }, ['导入'])
      ]);
      bars.push(bar); srcEls.push(row); srcCol.appendChild(row);
      if (stale && stale.name === s.name) staleEl = row;
    });
    d.sources.forEach(function (s, i) { if (s.name === stale.name) staleEl = srcEls[i]; });

    var engNum = nspan('0');
    var eng = h('div', { class: 'eng' }, [
      h('div', { class: 'et' }, ['归集 · 去重 · 评分']),
      h('div', { class: 'en' }, [engNum, h('span', { class: 'u' }, ['条'])])
    ]);
    var midCol = h('div', { class: 'fmid' }, [h('span', { class: 'lnk an-pipe' }), eng, h('span', { class: 'lnk an-pipe' })]);

    var outs = [
      { n: R.profile.segments.length, t: '典型细分' },
      { n: k.leads, t: '在手线索' },
      { n: k.gradeA, t: 'A 级' },
      { n: R.plan.items.length, t: '本周跟进' }
    ];
    var outEls = [], outNums = [];
    var outCol = h('div', { class: 'fcol out' }, [h('div', { class: 'ft' }, ['产出'])]);
    outs.forEach(function (o) {
      var sp = nspan(String(o.n));
      var e = h('div', { class: 'orow' }, [h('b', {}, [sp]), h('span', {}, [o.t])]);
      outNums.push({ el: sp, to: o.n }); outEls.push(e); outCol.appendChild(e);
    });

    var flow = h('div', { class: 'm4-flow' }, [srcCol, midCol, outCol]);
    var vd = vbar(stale.name + ' 停在 ' + stale.sync.slice(5, 10) + '，已 ' + stale.age + ' 天没同步', stale.age >= 3 ? 'warn' : '');
    g.appendChild(P.card({ cls: 'c8', title: '数据接入', sub: d.sources.length + ' 个源 · ' + fmtN(total) + ' 条', extra: [replay('重新归集')], body: [flow, vd] }));

    var nameIn = h('input', {
      type: 'text', value: d.company,
      oninput: function (e) {
        M.name = e.target.value; d.company = e.target.value;
        var co = M.frame.root.querySelector('.pd-top .co span:nth-child(2)');
        if (co) co.textContent = e.target.value;
      }
    });
    var form = h('div', { class: 'pd-form' }, [
      h('div', { class: 'pd-field' }, [h('label', {}, ['企业名称']), nameIn]),
      h('div', { class: 'pd-field' }, [h('label', {}, ['行业']), h('div', { class: 'vv' }, [M.company ? sh.industryNameOf(M.company.industry) + (M.company.size ? ' · ' + sh.optText('size', M.company.size) : '') : sh.industryNameOf(sh.displayIndustryDefault())])]),
      h('div', { class: 'pd-field' }, [h('label', {}, ['主打产品']), h('div', { class: 'vv' }, [d.prod])]),
      h('div', { class: 'pd-field' }, [h('label', {}, ['已有数据']), h('div', { class: 'm4-facts' }, [
        ['成交客户', d.deals.length, '家'], ['线索', d.leads.length, '条'], ['销售', d.teams.length, '组']
      ].map(function (x) {
        return h('div', { class: 'f' }, [h('b', { class: 'num' }, [String(x[1]), h('i', {}, [x[2]])]), h('span', {}, [x[0]])]);
      }))])
    ]);
    g.appendChild(P.card({
      cls: 'c4', title: '企业', body: [form],
      foot: [h('span', { class: 'cr' }, [h('b', { class: 'num' }, [String(K.CREDITS)]), ' 积分 / 次']), h('span', { style: 'flex:1' }), P.btn('进入获客驾驶舱', { cls: 'primary', onClick: enterBoard })]
    }));
    work.appendChild(g);

    M.play = function () {
      armBars(bars); armNums(outNums.concat([{ el: engNum }])); armRise(srcEls.concat(outEls));
      var t = A.timeline();
      t.at(0, function () { A.rise(srcEls, { stagger: 70, ms: 420, from: 'left' }); });
      t.at(260, function () { A.grow(bars, { ms: 620, stagger: 60 }); });
      t.at(300, function () { fly(srcCol, eng, { count: 4, ms: 680, gap: 110, label: fmtN(total) + ' 条' }); });
      t.at(620, function () { A.scan(eng, { ms: 1200 }); });
      t.at(820, function () { countTo(engNum, total, 900); });
      t.at(1250, function () { fly(eng, outCol, { count: 3, ms: 640, gap: 110 }); });
      t.at(1420, function () { A.rise(outEls, { stagger: 90, ms: 400 }); outNums.forEach(function (o) { countTo(o.el, o.to, 820); }); });
      t.at(2350, function () { vshow(vd); A.pulse(staleEl, { scroll: false }); });
      t.play();
    };
  }

  /* ================= 屏 2 · 获客驾驶舱 ================= */
  function screenBoard(work) {
    var R = M.R, k = R.kpi, seg = focusSeg();
    work.classList.add('m4-board');
    var g = h('div', { class: 'pd-grid' });
    var ns = [];
    function kv(v) { var s = nspan(v); return s; }
    var n1 = kv(k.leads), n2 = kv(k.gradeA), n3 = kv(k.unassigned), n4 = kv(k.overdue), n5 = kv(W(k.expected)), n6 = kv(fmtN(k.costPerLead));
    ns.push({ el: n1, to: k.leads }, { el: n2, to: k.gradeA }, { el: n3, to: k.unassigned }, { el: n4, to: k.overdue }, { el: n5, to: k.expected, w: 1 }, { el: n6, to: k.costPerLead });
    var kpiRow = h('div', { class: 'c12' }, [P.kpis([
      { label: '在手线索', value: n1, unit: '条', sub: '本周新增 ' + k.newWeek, onClick: function () { M.filter = null; setStep('leads'); } },
      { label: 'A 级线索', value: n2, unit: '条', tone: 'late', sub: 'B 级 ' + k.gradeB, onClick: function () { M.filter = 'A'; setStep('leads'); } },
      { label: '未分派', value: n3, unit: '条', tone: k.unassigned ? 'risk' : 'ok', onClick: function () { M.filter = 'unassigned'; setStep('leads'); } },
      { label: '逾期未跟进', value: n4, unit: '条', tone: k.overdue ? 'late' : 'ok', onClick: function () { M.filter = 'overdue'; setStep('leads'); } },
      { label: '成交预测', value: n5, tone: 'accent', sub: '管道 ' + W(k.pipeline), onClick: function () { setStep('plan'); } },
      { label: '单条线索成本', value: n6, unit: '元', sub: '近 30 天' }
    ])]);
    g.appendChild(kpiRow);

    var paid = R.funnel.channels.filter(function (c) { return c.costPerLead != null && c.costPerLead > 0; }).slice().sort(function (a, b) { return b.costPerLead - a.costPerLead; });
    var hi = paid[0], lo = paid[paid.length - 1];
    var ratio = hi && lo && lo.costPerLead ? (hi.costPerLead / lo.costPerLead).toFixed(1) : '—';
    var vd = vbar(hi && lo ? hi.name + ' ' + fmtN(hi.costPerLead) + ' 元/条，' + lo.name + ' ' + fmtN(lo.costPerLead) + ' 元/条，差 ' + ratio + ' 倍'
      : '在手 ' + k.leads + ' 条，A 级 ' + k.gradeA + ' 条');
    g.appendChild(h('div', { class: 'c12' }, [vd]));

    var fn = P.funnel({ stages: R.funnel.stages.map(function (s) { return { name: s.name, count: s.count, rate: s.rate }; }) });
    var fnCard = P.card({ cls: 'c5', title: '获客漏斗', sub: '转化率 ' + k.conversion + '% · 周期 ' + k.avgCycle + ' 天', body: [fn], extra: [replay('刷新')] });
    g.appendChild(fnCard);

    var ctbl = P.table({
      compact: true, cols: [
        { key: 'name', label: '渠道', render: function (c) { return h('span', {}, [h('b', {}, [c.name]), h('i', { class: 'kd' }, [c.kind])]); } },
        { key: 'leads', label: '线索', align: 'r', sort: true },
        { key: 'gradeA', label: 'A 级', align: 'r', sort: true },
        { key: 'costPerLead', label: '元 / 条', align: 'r', sort: true, render: function (c) { return c.costPerLead ? fmtN(c.costPerLead) : '无投放'; } },
        { key: 'deals12', label: '近 12 月成交', align: 'r', sort: true, render: function (c) { return c.deals12 + ' 单 · ' + W(c.dealAmount); } }
      ], rows: R.funnel.channels
    });
    var chCard = P.card({ cls: 'c7', title: '渠道', tight: true, body: [ctbl] });
    g.appendChild(chCard);

    var items = R.plan.items.slice(0, 3), list = h('div', { class: 'pd-list' });
    items.forEach(function (it) {
      list.appendChild(P.item({
        tone: GRADE[it.grade], icon: it.grade, title: it.leadId + ' · ' + it.name.split(' · ')[0],
        sub: it.actionLabel + ' · ' + it.ownerName + (it.overdue ? ' · 逾期' : ''),
        right: K.short(it.date), rightSub: W(it.amountEst),
        onClick: function () { M.lead = it.leadId; setStep('leads'); }
      }));
    });
    if (!items.length) list.appendChild(P.empty('本周无跟进安排'));
    g.appendChild(P.card({ cls: 'c6', title: '本周待跟进', sub: R.plan.items.length + ' 次', body: [list], extra: [P.btn('全部', { cls: 'sm', onClick: function () { setStep('plan'); } })] }));

    g.appendChild(P.card({
      cls: 'c6', title: '重点画像', sub: seg.id + ' · ' + seg.name,
      body: [P.kv([['客单价', W(seg.amount)], ['成交周期', seg.cycle + ' 天'], ['复购率', Math.round(seg.repeat * 100) + '%'], ['占成交价值', Math.round(seg.share * 100) + '%']]),
        h('div', { class: 'pd-legend', style: 'margin-top:10px;display:flex;gap:6px;flex-wrap:wrap' }, seg.pains.slice(0, 3).map(function (p) { return P.chip('accent', p.tag, true); }))],
      foot: [P.btn('看画像', { cls: 'sm', onClick: function () { setStep('profile'); } }), P.btn('出脚本', { cls: 'sm', onClick: function () { setStep('script'); } })]
    }));
    work.appendChild(g);

    M.play = function () {
      var kpis = qa('.pd-kpi'), fnBars = armBars(fnCard.querySelectorAll('.pd-funnel .trk i')), trs = armRows(chCard.querySelectorAll('tbody tr'));
      armNums(ns); armRise(kpis.concat(qa('.pd-list .pd-item')));
      var hiRow = null;
      Array.prototype.forEach.call(trs, function (tr) { if (hi && tr.textContent.indexOf(hi.name) >= 0) hiRow = tr; });
      var t = A.timeline();
      t.at(0, function () { A.rise(kpis, { stagger: 55, ms: 400, from: 'left' }); });
      t.at(280, function () { fly(kpis[0], fnCard, { count: 3, ms: 660, gap: 110, label: k.leads + ' 条' }); });
      t.at(620, function () { A.scan(fnCard, { ms: 1200 }); });
      t.at(820, function () { ns.forEach(function (x) { if (x.w) countW(x.el, x.to, 820); else countTo(x.el, x.to, 820); }); });
      t.at(900, function () { A.grow(fnBars, { ms: 720, stagger: 90 }); });
      t.at(1150, function () { A.stream(trs, { stagger: 80 }); });
      t.at(1500, function () { A.rise(qa('.pd-list .pd-item'), { stagger: 70, ms: 380 }); });
      t.at(2300, function () { vshow(vd); if (hiRow) A.pulse(hiRow, { scroll: false }); });
      t.play();
    };
  }

  /* ================= 屏 3 · 客户画像 ================= */
  function screenProfile(work) {
    var R = M.R, Pf = R.profile, d = M.data, seg = focusSeg();
    var g = h('div', { class: 'pd-grid' });
    var a1 = nspan(String(Pf.dealCount)), a2 = nspan(W(Pf.avgAmount)), a3 = nspan(String(Pf.avgCycle)), a4 = nspan(String(Math.round(Pf.repeatRate * 100)));
    g.appendChild(h('div', { class: 'c12' }, [P.kpis([
      { label: '成交客户', value: a1, unit: '家', sub: '近 12 个月 · ' + W(Pf.totalAmount) },
      { label: '平均客单', value: a2 },
      { label: '平均成交周期', value: a3, unit: '天' },
      { label: '复购率', value: a4, unit: '%', tone: 'ok' }
    ])]));

    var vd = vbar(seg.id + ' ' + seg.name + ' ' + seg.count + ' 家，占成交价值 ' + Math.round(seg.share * 100) + '%');
    g.appendChild(h('div', { class: 'c12' }, [vd]));

    var cards = h('div', { class: 'm4-segs' }), segEls = [], segBars = [], focusCard = null;
    Pf.segments.forEach(function (s) {
      var bar = h('i', { 'data-to': String(Math.round(s.share * 100)) });
      var sp = nspan(String(Math.round(s.share * 100)));
      var b = h('button', {
        class: 'seg' + (s.id === Pf.focus ? ' on' : ''),
        onclick: function () { if (s.id !== Pf.focus) commit(K.setFocus(d, s.id), '重点细分切换为 ' + s.name + '，线索评分已重算'); }
      }, [
        h('div', { class: 'hd' }, [h('span', { class: 'id' }, [s.id]), h('span', { class: 'nm' }, [s.name]), s.id === Pf.focus ? P.chip('accent', '重点') : null]),
        h('div', { class: 'big' }, [h('b', {}, [sp, h('span', { class: 'u' }, ['%'])]), h('span', {}, ['成交价值 · ' + s.count + ' 家'])]),
        h('div', { class: 'trk' }, [bar]),
        h('div', { class: 'segkv' }, ['客单 ' + W(s.amount) + ' · ' + s.cycle + ' 天 · 复购 ' + Math.round(s.repeat * 100) + '%']),
        h('div', { class: 'tags' }, s.pains.slice(0, 3).map(function (p) { return P.chip('watch', p.tag, true); }))
      ]);
      segBars.push({ bar: bar, num: sp, to: Math.round(s.share * 100) });
      segEls.push(b);
      if (s.id === Pf.focus) focusCard = b;
      cards.appendChild(b);
    });
    var segCard = P.card({ cls: 'c12', title: '三个典型细分', sub: '行业大类 × 决策人', body: [cards], extra: [replay('重算画像')] });
    g.appendChild(segCard);

    var distEl = h('div', { class: 'm4-dist' }), topRow = null, topDim = null;
    K.DIMS.forEach(function (dim) {
      var rows = Pf.dist[dim].rows.slice(0, 3).map(function (r) { return { label: r.label, value: r.weighted, share: r.share, hi: seg.vals[dim] && seg.vals[dim][r.value] >= 0.3 }; });
      var w = d.weights[dim] != null ? d.weights[dim] : 1;
      var box = P.dist({ rows: rows });
      distEl.appendChild(h('div', { class: 'dim' }, [
        h('div', { class: 'h' }, [h('b', {}, [K.DIM_LABEL[dim]]), h('span', { class: 'w num' }, ['权重 ' + Math.round(Pf.weights[dim] * 100) + '%']),
          h('span', { class: 'adj' }, [[0.5, '×0.5'], [1, '×1'], [1.5, '×1.5'], [2, '×2']].map(function (o) {
            return h('button', { class: w === o[0] ? 'on' : '', onclick: function () { commit(K.setWeight(d, dim, o[0]), K.DIM_LABEL[dim] + '权重 ' + o[1] + '，线索评分已重算'); } }, [o[1]]);
          }))]),
        box
      ]));
      if (!topDim || Pf.weights[dim] > Pf.weights[topDim]) { topDim = dim; topRow = box.querySelector('.row'); }
    });
    var distCard = P.card({ cls: 'c7', title: '成交客户长什么样', sub: '按客单价 × 复购加权', body: [distEl] });
    g.appendChild(distCard);

    var right = P.card({
      cls: 'c5', title: seg.id + ' ' + seg.name, sub: seg.sectorName + ' · ' + seg.role, accent: true, body: [
        P.kv([['行业', seg.industries.join('、')], ['规模', seg.sizeLabel], ['区域', seg.region], ['客单价', W(seg.amount)]]),
        h('div', { class: 'm4-sh' }, ['相似成交客户']),
        P.table({
          compact: true, cols: [
            { key: 'customer', label: '客户' },
            { key: 'amount', label: '年采购额', align: 'r', render: function (x) { return W(x.amount); } },
            { key: 'cycleDays', label: '周期', align: 'r', render: function (x) { return x.cycleDays + ' 天'; } },
            { key: 'channel', label: '来源', render: function (x) { return K.CHANNEL_NAME[x.channel]; } }
          ], rows: seg.topDeals.slice(0, 2)
        })
      ],
      foot: [P.btn('按此画像出脚本', { cls: 'primary sm', onClick: function () { M.scr.segId = seg.id; setStep('script'); } }),
        P.btn('看匹配线索', { cls: 'sm', onClick: function () { M.filter = 'A'; setStep('leads'); } })]
    });
    g.appendChild(right);
    work.appendChild(g);

    M.play = function () {
      var kpis = qa('.pd-kpi'), distBars = armBars(distCard.querySelectorAll('.pd-dist .trk i')), trs = armRows(right.querySelectorAll('tbody tr'));
      armBars(segBars.map(function (s) { return s.bar; }));
      armNums([{ el: a1 }, { el: a2, w: 1 }, { el: a3 }, { el: a4 }].concat(segBars.map(function (s) { return { el: s.num }; })));
      armRise(kpis.concat(segEls));
      var t = A.timeline();
      t.at(0, function () { A.rise(segEls, { stagger: 90, ms: 420, from: 'left' }); A.rise(kpis, { stagger: 55, ms: 380 }); });
      t.at(320, function () { fly(focusCard || segCard, distCard, { count: 3, ms: 660, gap: 110, label: Pf.dealCount + ' 家' }); });
      t.at(660, function () { A.scan(distCard, { ms: 1200 }); });
      t.at(820, function () {
        countTo(a1, Pf.dealCount, 820); countW(a2, Pf.avgAmount, 820); countTo(a3, Pf.avgCycle, 820); countTo(a4, Math.round(Pf.repeatRate * 100), 820);
        segBars.forEach(function (s) { A.grow([s.bar], { ms: 700 }); countTo(s.num, s.to, 700); });
      });
      t.at(1050, function () { A.grow(distBars, { ms: 700, stagger: 55 }); });
      t.at(1500, function () { A.stream(trs, { stagger: 90 }); });
      t.at(2300, function () { vshow(vd); A.pulse(focusCard, { scroll: false }); if (topRow) A.pulse(topRow, { scroll: false }); });
      t.play();
    };
  }

  /* ================= 屏 4 · 话术脚本 ================= */
  function screenScript(work) {
    var R = M.R, Pf = R.profile, d = M.data;
    if (!M.scr.segId) M.scr.segId = Pf.focus;
    var sc = K.script(d, Pf, LIB, M.scr);
    work.classList.add('m4-script');
    var g = h('div', { class: 'pd-grid' });

    var longest = sc.sections.slice().sort(function (a, b) { return b.text.length - a.text.length; })[0];
    var secs = Math.round(sc.words / 5);
    var vd = vbar(sc.words + ' 字 · 口播约 ' + secs + ' 秒；' + longest.title + '段 ' + longest.text.length + ' 字占 ' + Math.round(100 * longest.text.length / sc.words) + '%');
    g.appendChild(h('div', { class: 'c12' }, [vd]));

    var chips = function (label, opts, key) {
      return h('div', { class: 'pd-field' }, [h('label', {}, [label]), h('div', { class: 'chips' }, opts.map(function (o) {
        return h('button', { class: M.scr[key] === o[0] ? 'on' : '', onclick: function () { M.scr[key] = o[0]; M.scr.variant = 0; draw(); } }, [o[1]]);
      }))]);
    };
    var maxLen = longest.text.length, lenBars = [];
    var lenBox = h('div', { class: 'm4-len' });
    sc.sections.forEach(function (s) {
      var bar = h('i', { 'data-to': String(Math.round(100 * s.text.length / maxLen)) });
      lenBars.push(bar);
      lenBox.appendChild(h('div', { class: 'lr' }, [h('span', { class: 'l' }, [s.title]), h('span', { class: 'trk' }, [bar]), h('span', { class: 'n num' }, [s.text.length + ' 字'])]));
    });
    var pickCard = P.card({
      cls: 'c4', title: '选择', body: [h('div', { class: 'pd-form' }, [
        chips('客户细分', Pf.segments.map(function (s) { return [s.id, s.id + ' ' + s.name.split(' · ')[1] || s.id]; }), 'segId'),
        chips('触达渠道', CH, 'channel'), chips('阶段', ST, 'stage'),
        h('div', { class: 'pd-field' }, [h('label', {}, ['版本']), h('div', { class: 'chips' }, [
          h('button', { class: M.scr.variant === 0 ? 'on' : '', onclick: function () { M.scr.variant = 0; draw(); } }, ['第 1 版']),
          h('button', { class: M.scr.variant === 1 ? 'on' : '', onclick: function () { M.scr.variant = 1; draw(); } }, ['第 2 版'])
        ])]),
        h('div', { class: 'pd-field' }, [h('label', {}, ['各段字数']), lenBox])
      ])],
      foot: [sc.adopted ? P.chip('ok', '已采用') : P.btn('采用此版', { cls: 'primary sm', onClick: function () { commit(K.adoptScript(d, sc.key, sc.variant), '已采用 ' + sc.segName + ' · ' + sc.channelName + ' · ' + sc.stageName + ' 第 ' + (sc.variant + 1) + ' 版'); } }),
        P.btn('发送到微信', { cls: 'sm', onClick: function () { sh.setQrReady(true); sh.showWeChat(); } })]
    });
    g.appendChild(pickCard);

    var doc = h('div', { class: 'pd-doc' }), secEls = [], longEl = null, wordsSpan = nspan('0');
    doc.appendChild(h('div', { class: 'title' }, [sc.segName, h('span', { class: 'd' }, [sc.channelName + ' · ' + sc.stageName + ' · 第 ' + (sc.variant + 1) + ' 版 · ', wordsSpan, ' 字'])]));
    sc.sections.forEach(function (s) {
      var e = h('div', { class: 'sec' }, [h('h4', {}, [s.title]), h('p', { class: 'm4-p' }, [s.text])]);
      secEls.push(e); doc.appendChild(e);
      if (s.title === longest.title) longEl = e;
    });
    var objBox = h('div', { class: 'm4-obj' }, sc.objections.slice(0, 1).map(function (o) {
      return h('div', { class: 'o' }, [h('div', { class: 'q' }, ['「' + o.q + '」']), h('div', { class: 'a' }, [o.a])]);
    }));
    doc.appendChild(h('div', { class: 'sec' }, [h('h4', {}, ['异议应答']), objBox]));
    var docCard = P.card({ cls: 'c8', title: '脚本', sub: sc.channelName + ' · ' + sc.stageName, tight: true, extra: [replay('重新生成')], body: [h('div', { class: 'pd-scroll m4-docbox' }, [doc])] });
    g.appendChild(docCard);
    work.appendChild(g);

    M.play = function () {
      armBars(lenBars); armNums([{ el: wordsSpan }]);
      armRise(qa('.pd-field').concat(secEls).concat(Array.prototype.slice.call(objBox.querySelectorAll('.o'))));
      var t = A.timeline();
      t.at(0, function () { A.rise(qa('.pd-field'), { stagger: 70, ms: 400, from: 'left' }); });
      t.at(300, function () { fly(pickCard, docCard, { count: 3, ms: 680, gap: 110, label: sc.segName.split(' · ')[1] || sc.segId }); });
      t.at(640, function () { A.scan(docCard, { ms: 1200 }); });
      t.at(860, function () { countTo(wordsSpan, sc.words, 860); A.grow(lenBars, { ms: 700, stagger: 70 }); });
      t.at(1000, function () { A.rise(secEls, { stagger: 130, ms: 420 }); });
      t.at(1700, function () { A.rise(objBox.querySelectorAll('.o'), { stagger: 110, ms: 380 }); });
      t.at(2400, function () { vshow(vd); A.pulse(longEl, { scroll: false }); });
      t.play();
    };
  }

  /* ================= 屏 5 · 线索池 ================= */
  function screenLeads(work) {
    var R = M.R, d = M.data, rows = R.leads.filter(function (l) { return l.stage !== 'won'; });
    work.classList.add('m4-leads');
    var f = M.filter;
    var shown = rows.filter(function (l) {
      return f === 'A' ? l.grade === 'A' : f === 'unassigned' ? !l.owner && !l.dormant : f === 'overdue' ? l.overdue && l.owner
        : f === 'dormant' ? l.dormant : f === 'B' ? l.grade === 'B' : true;
    });
    if (!M.lead || !R.byId[M.lead]) M.lead = (shown[0] || rows[0]).id;
    var L = R.byId[M.lead];
    var g = h('div', { class: 'pd-grid' });
    var filt = function (key) { return function () { M.filter = M.filter === key ? null : key; still(); }; };
    var gA = rows.filter(function (l) { return l.grade === 'A'; }).length, gB = rows.filter(function (l) { return l.grade === 'B'; }).length;
    var b1 = nspan(String(rows.length)), b2 = nspan(String(gA)), b3 = nspan(String(gB)), b4 = nspan(String(R.kpi.unassigned)), b5 = nspan(String(R.kpi.overdue)), b6 = nspan(String(R.kpi.dormant));
    g.appendChild(h('div', { class: 'c12' }, [P.kpis([
      { label: '在手线索', value: b1, unit: '条', onClick: filt(null), active: !f },
      { label: 'A 级', value: b2, unit: '条', tone: 'late', onClick: filt('A'), active: f === 'A' },
      { label: 'B 级', value: b3, unit: '条', tone: 'risk', onClick: filt('B'), active: f === 'B' },
      { label: '未分派', value: b4, unit: '条', tone: 'risk', onClick: filt('unassigned'), active: f === 'unassigned' },
      { label: '逾期', value: b5, unit: '条', tone: 'late', onClick: filt('overdue'), active: f === 'overdue' },
      { label: '沉睡', value: b6, unit: '条', onClick: filt('dormant'), active: f === 'dormant' }
    ])]));

    var top = shown[0] || rows[0];
    var sig = top.signalParts.slice(0, 2).map(function (p) { return p.name; }).join(' + ') || '暂无信号';
    var vd = vbar(top.id + ' ' + top.total + ' 分：' + sig + '，' + top.grade + ' 级 · ' + top.actionLabel);
    g.appendChild(h('div', { class: 'c12' }, [vd]));

    var tbl = P.table({
      cols: [
        { key: 'id', label: '代号', render: function (l) { return h('span', {}, [h('b', { class: 'id' }, [l.id]), h('span', { class: 'sub' }, [l.channelName + ' · ' + l.stageName])]); } },
        { key: 'industry', label: '线索', sort: true, render: function (l) { return h('span', {}, [l.industry, h('span', { class: 'sub' }, [l.region + ' · ' + l.sizeLabel + ' · ' + l.role])]); } },
        { key: 'total', label: '分值', align: 'r', sort: true, sortDesc: true, render: function (l) { return P.bar(l.total, GRADE[l.grade], l.total + ''); } },
        { key: 'grade', label: '意向', sort: true, render: function (l) { return gradeChip(l.grade); } },
        { key: 'ownerName', label: '负责', render: function (l) { return l.ownerName || h('span', { class: 'todo' }, ['待分派']); } },
        { key: 'action', label: '下一步', render: function (l) { return h('span', {}, [l.actionLabel, h('span', { class: 'sub' }, [l.lastAction ? K.short(l.lastAction.date) + ' · ' + l.lastAge + ' 天前' : '尚无跟进']), l.dormant ? P.chip('done', '沉睡') : l.overdue ? P.chip('late', '逾期') : l.planned ? P.chip('handled', '已排') : null]); } }
      ],
      rows: shown, sortKey: 'total', sortDir: 'desc', rowKey: function (l) { return l.id; }, activeKey: M.lead,
      onRow: function (l) { M.lead = l.id; still(); }
    });
    var poolCard = P.card({
      cls: 'c8', title: '线索池', sub: shown.length + ' 条' + (f ? ' · 已筛选' : ''), tight: true,
      body: [h('div', { class: 'pd-scroll m4-pool' }, [tbl])],
      extra: [replay('重新评分'), R.kpi.unassigned ? P.btn('一键分派 ' + R.kpi.unassigned + ' 条', { cls: 'primary sm', onClick: function () { M.filter = null; commit(K.assignAll(d, LIB), '已按行业熟悉度与负载分派，本周计划已更新'); } }) : null]
    });
    g.appendChild(poolCard);

    var okParts = L.parts.filter(function (p) { return p.share >= 30; });
    var seenLines = [
      L.channelName + ' · 建档 ' + K.short(L.createdAt) + ' · ' + L.stageName + ' · ' + (L.ownerName || '未分派'),
      L.signalParts.length ? L.signalParts.slice(0, 2).map(function (p) { return p.name + ' ' + K.short(p.date); }).join('、') : '暂无行为信号'
    ];
    var reasonLines = [
      '匹配 ' + L.match + ' 分 · ' + (okParts.length ? okParts.slice(0, 3).map(function (p) { return p.label; }).join('、') + ' 一致' : '各维度都偏离'),
      '信号 ' + L.signal + ' 分 · ' + (L.signalParts.slice(0, 2).map(function (p) { return p.name + ' ' + p.score; }).join('、') || '无'),
      '综合 ' + L.total + ' 分 → ' + L.grade + ' 级 · ' + (L.dormant ? '已 ' + L.lastAge + ' 天无动作' : L.overdue ? '超 ' + L.dueDays + ' 天节奏' : '节奏正常')
    ];
    var rec = K.recommendTeam(L, R.teams);
    var acts = h('div', { class: 'pd-actions' });
    if (L.stage !== 'won') {
      if (!L.owner) acts.appendChild(h('div', { class: 'pd-action best' }, [
        h('div', { class: 't' }, [h('span', { class: 'rank' }, ['1']), '分派给 ' + (rec ? rec.name : '—')]),
        P.btn('分派', { cls: 'primary sm', disabled: !rec, onClick: function () { commit(K.assign(d, L.id, rec.id), L.id + ' 已分派给 ' + rec.name); } }),
        h('div', { class: 'd' }, [rec ? (rec.sectors.indexOf(L.sector) >= 0 ? '熟悉该行业' : '有空位') + ' · 负载 ' + rec.load + '/' + rec.cap : '各组已满'])
      ]));
      if (L.owner && !L.planned && !L.dormant) acts.appendChild(h('div', { class: 'pd-action best' }, [
        h('div', { class: 't' }, [h('span', { class: 'rank' }, ['1']), '加入本周计划 · ' + L.actionLabel]),
        P.btn('加入', { cls: 'primary sm', onClick: function () { commit(K.addPlan(d, L.id), L.id + ' 已加入本周计划'); } }),
        h('div', { class: 'd' }, [L.grade + ' 级 ' + L.dueDays + ' 天节奏 · ' + (L.ownerName || '')])
      ]));
      acts.appendChild(h('div', { class: 'pd-action' }, [
        h('div', { class: 't' }, [h('span', { class: 'rank' }, ['·']), '记录跟进并推进阶段']),
        P.btn('记录', { cls: 'sm', onClick: function () { commit(K.advance(d, L.id, L.actionLabel + ' · 已完成'), L.id + ' 已推进到下一阶段'); } }),
        h('div', { class: 'd' }, [L.stageName + ' → 下一阶段'])
      ]));
    }
    var judgeCard = P.card({
      cls: 'c4', title: L.id, sub: L.industry + ' · ' + L.role, accent: true, body: [
        h('div', { class: 'm4-lhead' }, [gradeChip(L.grade),
          h('span', { class: 'm' }, [h('b', { class: 'num' }, [String(L.total)]), h('span', {}, ['综合'])]),
          h('span', { class: 'm' }, [h('b', { class: 'num' }, [String(L.match)]), h('span', {}, ['匹配'])]),
          h('span', { class: 'm' }, [h('b', { class: 'num' }, [String(L.signal)]), h('span', {}, ['信号'])]),
          h('span', { class: 'm' }, [h('b', { class: 'num' }, [W(L.amountEst)]), h('span', {}, ['预计金额'])])]),
        P.judge({
          verdict: { tone: L.dormant ? 'done' : L.overdue ? 'late' : GRADE[L.grade] === 'late' ? 'ok' : 'risk', chip: L.actionLabel,
            text: L.dormant ? '已 ' + L.lastAge + ' 天无动作' : L.overdue ? '距上次动作 ' + L.lastAge + ' 天，超过节奏' : L.grade + ' 级 · ' + L.stageName },
          seen: seenLines, reasons: reasonLines, actionsEl: acts, actionsTitle: '建议动作'
        })
      ]
    });
    g.appendChild(judgeCard);
    work.appendChild(g);

    M.play = function () {
      /* 只对首屏可见的几行做流入：没被 stream 收尾的行会一直留在隐藏态 */
      var kpis = qa('.pd-kpi');
      var trs = armRows(Array.prototype.slice.call(poolCard.querySelectorAll('tbody tr'), 0, 9));
      var bars = armBars(Array.prototype.slice.call(poolCard.querySelectorAll('tbody .pd-bar .trk i'), 0, 9));
      armNums([{ el: b1 }, { el: b2 }, { el: b3 }, { el: b4 }, { el: b5 }, { el: b6 }]);
      var judgeParts = Array.prototype.slice.call(judgeCard.querySelectorAll('.m4-lhead, .pd-judge > *'));
      armRise(kpis.concat(judgeParts));
      var t = A.timeline();
      t.at(0, function () { A.rise(kpis, { stagger: 55, ms: 400, from: 'left' }); });
      t.at(280, function () { fly(kpis[0], poolCard, { count: 3, ms: 660, gap: 110, label: shown.length + ' 条' }); });
      t.at(620, function () { A.scan(poolCard, { ms: 1200 }); });
      t.at(820, function () {
        countTo(b1, rows.length, 820); countTo(b2, gA, 820); countTo(b3, gB, 820);
        countTo(b4, R.kpi.unassigned, 820); countTo(b5, R.kpi.overdue, 820); countTo(b6, R.kpi.dormant, 820);
      });
      t.at(900, function () { A.stream(trs, { stagger: 70 }); A.grow(bars, { ms: 620, stagger: 60 }); });
      t.at(1400, function () { A.rise(judgeParts, { stagger: 100, ms: 400 }); });
      t.at(2350, function () { vshow(vd); A.pulse(rowOf(top.id), { scroll: false }); });
      t.play();
    };
  }

  /* ================= 屏 6 · 跟进与周报 ================= */
  function screenPlan(work) {
    var R = M.R, pl = R.plan, fc = R.forecast, d = M.data;
    work.classList.add('m4-plan');
    var g = h('div', { class: 'pd-grid' });
    var c1 = nspan(String(pl.items.length)), c2 = nspan(String(pl.overdue.length)), c3 = nspan(String(pl.unassigned.length)), c4 = nspan(W(fc.expected)), c5 = nspan(String(fc.count));
    g.appendChild(h('div', { class: 'c12' }, [P.kpis([
      { label: '本周跟进', value: c1, unit: '次', tone: 'accent' },
      { label: '逾期待补', value: c2, unit: '条', tone: pl.overdue.length ? 'late' : 'ok' },
      { label: '未分派', value: c3, unit: '条', tone: pl.unassigned.length ? 'risk' : 'ok', onClick: function () { M.filter = 'unassigned'; setStep('leads'); } },
      { label: '成交预测', value: c4, tone: 'ok', sub: '约 ' + fc.expectedDeals + ' 单' },
      { label: '在手商机', value: c5, unit: '条', sub: '管道 ' + W(fc.pipeline) }
    ])]));

    var busy = pl.days.slice().sort(function (a, b) { return b.items.length - a.items.length; })[0];
    var byTeam = {}; pl.overdue.forEach(function (l) { if (l.ownerName) byTeam[l.ownerName] = (byTeam[l.ownerName] || 0) + 1; });
    var worst = Object.keys(byTeam).sort(function (a, b) { return byTeam[b] - byTeam[a]; })[0];
    var vd = vbar(pl.items.length + ' 次跟进，' + busy.label + ' 排了 ' + busy.items.length + ' 次；逾期 ' + pl.overdue.length + ' 条'
      + (worst ? '里 ' + worst + ' 占 ' + byTeam[worst] + ' 条' : ''), pl.overdue.length ? 'warn' : '');
    g.appendChild(h('div', { class: 'c12' }, [vd]));

    var days = h('div', { class: 'days' }), dayItems = [], busyEl = null;
    pl.days.forEach(function (day) {
      var list = h('div', { class: 'list' });
      day.items.slice(0, 4).forEach(function (it) {
        var b = h('button', { class: 'it' + (it.overdue ? ' late' : ''), onclick: function () { M.lead = it.leadId; setStep('leads'); } }, [
          h('div', { class: 'h' }, [h('b', {}, [it.leadId]), h('span', { class: 'g ' + GRADE[it.grade] }, [it.grade])]),
          h('div', { class: 'n' }, [it.ownerName + ' · ' + it.name.split(' · ')[0]])
        ]);
        dayItems.push(b); list.appendChild(b);
      });
      if (day.items.length > 4) list.appendChild(h('div', { class: 'more' }, ['还有 ' + (day.items.length - 4) + ' 条']));
      if (!day.items.length) list.appendChild(P.empty('无安排'));
      var col = h('div', { class: 'day' }, [h('div', { class: 'dh' }, [h('b', {}, [day.label]), h('span', {}, [day.items.length + ' 次'])]), list]);
      if (day.label === busy.label) busyEl = col;
      days.appendChild(col);
    });
    var planCard = P.card({ cls: 'c8', title: '本周跟进日程', sub: '今天起 5 个工作日', body: [days], extra: [replay('重排本周')] });
    g.appendChild(planCard);

    var ov = h('div', { class: 'pd-list' }), ovHit = [];
    var ovSorted = pl.overdue.slice().sort(function (a, b) {
      var av = a.ownerName === worst ? 0 : 1, bv = b.ownerName === worst ? 0 : 1;
      return av - bv || b.lastAge - a.lastAge;
    });
    ovSorted.slice(0, 4).forEach(function (l) {
      var row = P.item({
        tone: 'late', icon: l.lastAge + '天', title: l.id + ' · ' + l.industry, sub: l.actionLabel + ' · ' + l.ownerName,
        right: l.grade + ' 级', rightSub: W(l.amountEst), onClick: function () { M.lead = l.id; setStep('leads'); }
      });
      if (worst && l.ownerName === worst) ovHit.push(row);
      ov.appendChild(row);
    });
    if (!pl.overdue.length) ov.appendChild(P.empty('没有逾期'));
    var ovCard = P.card({ cls: 'c4', title: '逾期待补', sub: pl.overdue.length + ' 条', body: [ov] });
    g.appendChild(ovCard);
    var loadBars = [];
    g.appendChild(P.card({
      cls: 'c4', title: '各组负载', sub: '在手 / 上限', body: [h('div', { class: 'm4-load' }, R.teams.map(function (t) {
        var bar = P.bar(100 * t.load / t.cap, t.load / t.cap > 0.9 ? 'late' : t.load / t.cap > 0.7 ? 'risk' : 'ok', t.load + ' / ' + t.cap);
        loadBars.push(bar.querySelector('.trk i'));
        return h('div', { class: 'lr' }, [h('span', {}, [t.name]), bar]);
      }))]
    }));

    var fcTbl = P.table({
      compact: true, cols: [
        { key: 'name', label: '阶段' }, { key: 'count', label: '条数', align: 'r' },
        { key: 'pipeline', label: '管道', align: 'r', render: function (r) { return W(r.pipeline); } },
        { key: 'expected', label: '加权预测', align: 'r', render: function (r) { return h('b', {}, [W(r.expected)]); } }
      ], rows: fc.byStage
    });
    var fcCard = P.card({ cls: 'c4', title: '成交预测 · 按阶段', tight: true, body: [fcTbl] });
    g.appendChild(fcCard);

    var who = h('div', { class: 'who' });
    ['销售负责人', '总经理', '各组组长'].forEach(function (w, i) {
      who.appendChild(h('button', { class: i === M.who ? 'on' : '', onclick: function () { M.who = i; still(); } }, [w]));
    });
    g.appendChild(P.card({
      cls: 'c4', title: '获客周报', sub: K.short(d.weekStart) + ' 周 · 微信文本版',
      body: [h('div', { class: 'pd-field' }, [h('label', {}, ['收件人']), who]),
        h('div', { class: 'pd-pre m4-rep' }, [R.report.lines.slice(0, 3).join('\n')])],
      foot: [P.btn('看全文', { cls: 'sm', onClick: openReport }), P.btn('发送到微信', { cls: 'primary sm', onClick: function () { sh.setQrReady(true); sh.showWeChat(); } })]
    }));
    work.appendChild(g);

    M.play = function () {
      var kpis = qa('.pd-kpi'), trs = armRows(fcCard.querySelectorAll('tbody tr'));
      armBars(loadBars);
      armNums([{ el: c1 }, { el: c2 }, { el: c3 }, { el: c4, w: 1 }, { el: c5 }]);
      armRise(kpis.concat(dayItems).concat(Array.prototype.slice.call(ovCard.querySelectorAll('.pd-item'))));
      var t = A.timeline();
      t.at(0, function () { A.rise(kpis, { stagger: 55, ms: 400, from: 'left' }); });
      t.at(280, function () { fly(kpis[0], planCard, { count: 3, ms: 660, gap: 110, label: pl.items.length + ' 次' }); });
      t.at(620, function () { A.scan(planCard, { ms: 1200 }); });
      t.at(820, function () {
        countTo(c1, pl.items.length, 820); countTo(c2, pl.overdue.length, 820); countTo(c3, pl.unassigned.length, 820);
        countW(c4, fc.expected, 820); countTo(c5, fc.count, 820);
      });
      t.at(900, function () { A.rise(dayItems, { stagger: 55, ms: 380 }); });
      t.at(1250, function () { A.grow(loadBars, { ms: 700, stagger: 70 }); A.stream(trs, { stagger: 80 }); });
      t.at(1550, function () { A.rise(ovCard.querySelectorAll('.pd-item'), { stagger: 70, ms: 380 }); });
      t.at(2400, function () {
        vshow(vd); A.pulse(busyEl, { scroll: false });
        (ovHit.length ? ovHit : [ovCard]).forEach(function (e) { A.pulse(e, { scroll: false }); });
      });
      t.play();
    };
  }

  function openReport() {
    P.drawer(M.frame.body, {
      title: '获客周报', sub: K.short(M.data.weekStart) + ' 周 · ' + M.data.company,
      body: [h('div', { class: 'pd-pre' }, [M.R.report.text])],
      actions: [P.btn('发送到微信', { cls: 'primary', onClick: function () { sh.setQrReady(true); sh.showWeChat(); } })]
    });
  }
  function openLog() {
    var d = M.data;
    P.drawer(M.frame.body, {
      title: '本周动作', sub: d.log.length + ' 条',
      body: [d.log.length ? P.log(d.log, { limit: 20 }) : P.empty('还没有动作')]
    });
  }
  function openSheet(title, head, rows) {
    P.drawer(M.frame.body, {
      title: title, sub: rows.length + ' 行 · ' + head.length + ' 列',
      body: [P.table({ compact: true, cols: head.map(function (hd, i) { return { key: 'c' + i, label: hd || '第 ' + (i + 1) + ' 列' }; }),
        rows: rows.map(function (r) { var o = {}; head.forEach(function (_, i) { o['c' + i] = r[i] == null ? '' : String(r[i]); }); return o; }) })]
    });
  }

  /* ================= 对话大脑 ================= */
  function mini(head, rows) {
    var t = h('table', { class: 'mini' }), tr = h('tr'), tb = h('tbody');
    head.forEach(function (x) { tr.appendChild(h('th', {}, [String(x)])); });
    t.appendChild(h('thead', {}, [tr]));
    rows.forEach(function (r) { var x = h('tr'); r.forEach(function (c) { x.appendChild(h('td', {}, [String(c)])); }); tb.appendChild(x); });
    t.appendChild(tb);
    return t;
  }
  function kvb(pairs) { var g = h('div', { class: 'kv' }); pairs.forEach(function (p) { g.appendChild(h('span', {}, [String(p[0])])); g.appendChild(h('span', {}, [String(p[1])])); }); return g; }
  function tagsb(list) { var g = h('div', { class: 'tags' }); list.forEach(function (t) { g.appendChild(h('span', {}, [String(t)])); }); return g; }
  function hit(q, words) { for (var i = 0; i < words.length; i++) if (q.indexOf(words[i]) >= 0) return true; return false; }

  function chanRank() {
    return M.R.funnel.channels.filter(function (c) { return c.costPerLead != null && c.costPerLead > 0; }).slice().sort(function (a, b) { return a.costPerLead - b.costPerLead; });
  }
  function staleSource() {
    var best = null;
    M.data.sources.forEach(function (s) { var a = ageDays(s.lastSync); if (!best || a > best.age) best = { s: s, age: a }; });
    return best;
  }

  window.DGG.chatBrain('m4', {
    opener: function (step) {
      var R = M.R, k = R.kpi, seg = focusSeg();
      if (step === 'connect') {
        var st = staleSource();
        return st.s.name + ' 停在 ' + st.s.lastSync.slice(5, 10) + '，已 ' + st.age + ' 天没同步；其余 ' + (M.data.sources.length - 1) + ' 个源今天都刷过。';
      }
      if (step === 'board') {
        var r = chanRank();
        if (!r.length) return '在手 ' + k.leads + ' 条，A 级 ' + k.gradeA + ' 条，未分派 ' + k.unassigned + ' 条。';
        var lo = r[0], hi = r[r.length - 1];
        return hi.name + ' ' + fmtN(hi.costPerLead) + ' 元一条，' + lo.name + ' ' + fmtN(lo.costPerLead) + ' 元一条，差 ' + (hi.costPerLead / lo.costPerLead).toFixed(1) + ' 倍。';
      }
      if (step === 'profile') {
        return seg.id + ' ' + seg.name + ' 只有 ' + seg.count + ' 家，却占成交价值 ' + Math.round(seg.share * 100) + '%，客单 ' + W(seg.amount) + '。';
      }
      if (step === 'script') {
        var sc = K.script(M.data, R.profile, LIB, M.scr);
        var lg = sc.sections.slice().sort(function (a, b) { return b.text.length - a.text.length; })[0];
        return '这版 ' + sc.words + ' 字，口播约 ' + Math.round(sc.words / 5) + ' 秒；' + lg.title + '段 ' + lg.text.length + ' 字，占 ' + Math.round(100 * lg.text.length / sc.words) + '%。';
      }
      if (step === 'leads') {
        var top = R.leads.filter(function (l) { return l.stage !== 'won'; })[0];
        return top.id + ' ' + top.total + ' 分排在前面：' + (top.signalParts.slice(0, 2).map(function (p) { return p.name + ' ' + p.score + ' 分'; }).join('、') || '暂无行为信号') + '，' + top.grade + ' 级。';
      }
      var pl = R.plan;
      var busy = pl.days.slice().sort(function (a, b) { return b.items.length - a.items.length; })[0];
      return '本周排了 ' + pl.items.length + ' 次跟进，' + busy.label + ' 一天 ' + busy.items.length + ' 次；逾期 ' + pl.overdue.length + ' 条还没补。';
    },

    suggest: function (step) {
      if (step === 'connect') return ['哪个源同步落后', '一共归集了多少条', '直连和导入各几个', '线索里有几条 A 级'];
      if (step === 'board') return ['哪个渠道单条便宜', '未分派的 23 条怎么办'.replace('23', String(M.R.kpi.unassigned)), '成交预测怎么算的', '逾期为什么有 ' + M.R.kpi.overdue + ' 条'];
      if (step === 'profile') return ['行业权重为什么高', 'S2 和 S1 差在哪', '把区域权重调低', '匹配这个画像的线索'];
      if (step === 'script') return ['换成微信怎么说', '报价后那版给我', '异议怎么答', '这版多少字'];
      if (step === 'leads') return ['为什么它分这么高', '未分派的有哪几条', '逾期的是哪几条', '这条分派给谁'];
      return ['逾期的是哪几条', '哪个组排得满', '成交预测多少', '周报里写了什么'];
    },

    answer: function (qq, step) {
      var R = M.R, k = R.kpi, d = M.data, Pf = R.profile, seg = focusSeg();
      var s = String(qq || '').trim();
      if (!s) return null;

      /* ---- 数据源 / 接入 ---- */
      if (hit(s, ['同步', '落后', '几天没', '数据源', '源'])) {
        var st = staleSource();
        var el = null;
        qa('.m4-flow .srow').forEach(function (r) { if (r.textContent.indexOf(st.s.name) >= 0) el = r; });
        return {
          text: st.s.name + ' 停在 ' + st.s.lastSync + '，已 ' + st.age + ' 天。其余源今天都同步过。',
          blocks: [mini(['源', '同步', '条数'], d.sources.map(function (x) { return [x.name, x.lastSync.slice(5, 10), fmtN(x.rows)]; }))],
          focus: el
        };
      }
      if (hit(s, ['归集', '多少条', '总共', '一共'])) {
        var tot = d.sources.reduce(function (t, x) { return t + x.rows; }, 0);
        return { text: d.sources.length + ' 个源共 ' + fmtN(tot) + ' 条，归集后在手线索 ' + k.leads + ' 条，A 级 ' + k.gradeA + ' 条。' };
      }
      if (hit(s, ['直连', '导入'])) {
        var dir = d.sources.filter(function (x) { return x.mode === 'direct'; });
        return {
          text: '系统直连 ' + dir.length + ' 个，表格导入 ' + (d.sources.length - dir.length) + ' 个。',
          blocks: [tagsb(d.sources.map(function (x) { return x.name.split(' · ')[0] + (x.mode === 'direct' ? ' 直连' : ' 导入'); }))]
        };
      }

      /* ---- 渠道成本 ---- */
      if (hit(s, ['渠道', '便宜', '划算', '成本', '元一条', '元/条'])) {
        var r = chanRank();
        if (!r.length) return null;
        var lo = r[0], hi2 = r[r.length - 1];
        return {
          text: lo.name + ' ' + fmtN(lo.costPerLead) + ' 元一条，' + hi2.name + ' ' + fmtN(hi2.costPerLead) + ' 元一条。'
            + hi2.name + ' 贵，但近 12 月带来 ' + hi2.deals12 + ' 单 ' + W(hi2.dealAmount) + '，单均成交成本 ' + fmtN(hi2.costPerDeal) + ' 元。',
          blocks: [mini(['渠道', '元/条', '元/单'], r.map(function (c) { return [c.name, fmtN(c.costPerLead), c.costPerDeal != null ? fmtN(c.costPerDeal) : '—']; }))],
          focus: rowOf(lo.name)
        };
      }

      /* ---- 未分派 → 换屏 + 筛选（改页面） ---- */
      if (hit(s, ['未分派', '没分派', '待分派'])) {
        var un = R.leads.filter(function (l) { return !l.owner && l.stage !== 'won' && !l.dormant; });
        return {
          text: '未分派 ' + un.length + ' 条，A 级 ' + un.filter(function (l) { return l.grade === 'A'; }).length
            + ' 条、B 级 ' + un.filter(function (l) { return l.grade === 'B'; }).length + ' 条。各组还空 '
            + R.teams.reduce(function (t, x) { return t + x.free; }, 0) + ' 个位，按行业熟悉度可一次分完。已切到线索池并筛出未分派。',
          act: function () { M.filter = 'unassigned'; if (M.step !== 'leads') setStep('leads'); else still(); }
        };
      }

      /* ---- 逾期 → 换屏 + 筛选（改页面） ---- */
      if (hit(s, ['逾期', '超时', '没跟进'])) {
        var ov = R.plan.overdue;
        return {
          text: '逾期 ' + ov.length + ' 条：' + ov.slice(0, 3).map(function (l) { return l.id + ' 已 ' + l.lastAge + ' 天'; }).join('、')
            + '。按等级节奏 A 级 3 天、B 级 5 天，超过就算逾期。已切到线索池并筛出逾期。',
          blocks: [mini(['代号', '天数', '负责'], ov.slice(0, 5).map(function (l) { return [l.id, l.lastAge + ' 天', l.ownerName || '—']; }))],
          act: function () { M.filter = 'overdue'; if (M.step !== 'leads') setStep('leads'); else still(); }
        };
      }

      /* ---- 等级分布：A/B/C/D 各几条 ---- */
      if (hit(s, ['A 级', 'A级', '几条 A', '等级', '级分布'])) {
        var pool2 = R.leads.filter(function (l) { return l.stage !== 'won'; });
        var byGrade = function (g) { return pool2.filter(function (l) { return l.grade === g; }); };
        var unA = byGrade('A').filter(function (l) { return !l.owner; }).length;
        return {
          text: '在手 ' + pool2.length + ' 条里 A 级 ' + byGrade('A').length + ' 条、B 级 ' + byGrade('B').length + ' 条、C 级 '
            + byGrade('C').length + ' 条、D 级 ' + byGrade('D').length + ' 条。A 级按 ' + LIB.stages.followUpDays.A + ' 天节奏跟，'
            + (unA ? '其中 ' + unA + ' 条还没分派。' : '已全部分派。'),
          blocks: [mini(['意向', '条数', '预计金额'], ['A', 'B', 'C', 'D'].map(function (g) {
            var ls = byGrade(g);
            return [g + ' 级', ls.length + ' 条', W(ls.reduce(function (t, l) { return t + l.amountEst; }, 0))];
          }))]
        };
      }

      /* ---- 成交预测 ---- */
      if (hit(s, ['预测', '管道', '能成多少', '预计成交'])) {
        return {
          text: '在手 ' + R.forecast.count + ' 条、管道 ' + W(R.forecast.pipeline) + '，按阶段概率加权 ' + W(R.forecast.expected) + '，约 ' + R.forecast.expectedDeals + ' 单。',
          blocks: [mini(['阶段', '条数', '加权'], R.forecast.byStage.map(function (x) { return [x.name, x.count, W(x.expected)]; }))]
        };
      }

      /* ---- 改参数并重算（改页面）：要排在「解释权重」前面，否则被它先接走 ---- */
      if (hit(s, ['调低', '调高', '降权', '加权', '提高']) || (hit(s, ['区域', '行业大类', '规模', '决策人']) && hit(s, ['调', '改']))) {
        var dim2 = 'region';
        K.DIMS.forEach(function (x) { if (s.indexOf(K.DIM_LABEL[x]) >= 0) dim2 = x; });
        if (s.indexOf('行业') >= 0) dim2 = 'sector';
        var mul = hit(s, ['调高', '加权', '提高']) ? 1.5 : 0.5;
        return {
          text: K.DIM_LABEL[dim2] + '按 ×' + mul + ' 重算：权重从 ' + Math.round(Pf.weights[dim2] * 100) + '% 起变，'
            + openLeads().length + ' 条在手商机的匹配分跟着动，A 级条数可能变。正在重算。',
          act: function () {
            var nd = K.setWeight(M.data, dim2, mul);
            if (M.step !== 'profile') { M.data = nd; recompute(); setStep('profile'); }
            else commit(nd, K.DIM_LABEL[dim2] + '权重 ×' + mul + '，线索评分已重算');
          }
        };
      }

      /* ---- 画像权重 ---- */
      if (hit(s, ['权重', '为什么高', '怎么定的'])) {
        var dim = null;
        K.DIMS.forEach(function (x) { if (s.indexOf(K.DIM_LABEL[x]) >= 0 || (x === 'sector' && s.indexOf('行业') >= 0) || (x === 'region' && s.indexOf('区域') >= 0)) dim = x; });
        if (!dim) dim = K.DIMS.slice().sort(function (a, b) { return Pf.weights[b] - Pf.weights[a]; })[0];
        var rows = Pf.dist[dim].rows;
        return {
          text: K.DIM_LABEL[dim] + '权重 ' + Math.round(Pf.weights[dim] * 100) + '%：' + rows[0].label + ' 一家占 ' + Math.round(rows[0].share * 100)
            + '%，分布越集中越能预测成交，所以权重给得高。' + (rows[1] ? '第二是 ' + rows[1].label + ' ' + Math.round(rows[1].share * 100) + '%。' : ''),
          blocks: [mini([K.DIM_LABEL[dim], '占成交价值'], rows.slice(0, 4).map(function (x) { return [x.label, Math.round(x.share * 100) + '%']; }))],
          focus: q('.m4-dist .dim .pd-dist .row')
        };
      }
      /* ---- 匹配线索 → 换屏（改页面） ---- */
      if (hit(s, ['匹配', '像这个画像', '哪些线索'])) {
        var ms = R.leads.filter(function (l) { return l.grade === 'A' && l.stage !== 'won'; });
        return {
          text: '匹配 ' + seg.id + ' 且 A 级的有 ' + ms.length + ' 条：' + ms.slice(0, 3).map(function (l) { return l.id + ' ' + l.total + ' 分'; }).join('、') + '。已切到线索池筛 A 级。',
          act: function () { M.filter = 'A'; if (M.step !== 'leads') setStep('leads'); else still(); }
        };
      }

      /* ---- 细分对比 ---- */
      if (/S[123]/.test(s) || hit(s, ['细分', '画像'])) {
        var ids = (s.match(/S[123]/g) || []).slice(0, 2);
        if (ids.length >= 2) {
          var x1 = Pf.segments.filter(function (z) { return z.id === ids[0]; })[0], x2 = Pf.segments.filter(function (z) { return z.id === ids[1]; })[0];
          if (x1 && x2) return {
            text: x1.id + ' 客单 ' + W(x1.amount) + '、周期 ' + x1.cycle + ' 天、复购 ' + Math.round(x1.repeat * 100) + '%；'
              + x2.id + ' 客单 ' + W(x2.amount) + '、周期 ' + x2.cycle + ' 天、复购 ' + Math.round(x2.repeat * 100) + '%。'
              + (x1.amount > x2.amount ? x1.id : x2.id) + ' 客单更高，' + (x1.cycle < x2.cycle ? x1.id : x2.id) + ' 成得更快。',
            blocks: [mini(['', x1.id, x2.id], [['家数', x1.count, x2.count], ['客单', W(x1.amount), W(x2.amount)], ['周期', x1.cycle + ' 天', x2.cycle + ' 天'], ['占价值', Math.round(x1.share * 100) + '%', Math.round(x2.share * 100) + '%']])]
          };
        }
        var one = ids.length ? Pf.segments.filter(function (z) { return z.id === ids[0]; })[0] : seg;
        if (one) return {
          text: one.id + ' ' + one.name + '：' + one.count + ' 家，占成交价值 ' + Math.round(one.share * 100) + '%，客单 ' + W(one.amount) + '，周期 ' + one.cycle + ' 天，复购 ' + Math.round(one.repeat * 100) + '%。',
          blocks: [tagsb(one.pains.map(function (p) { return p.tag; }))]
        };
      }

      /* ---- 脚本：换渠道 / 换阶段（改页面） ---- */
      if (hit(s, ['微信', '电话', '展会现场', '邮件']) && (step === 'script' || hit(s, ['脚本', '话术', '怎么说']))) {
        var ch = s.indexOf('微信') >= 0 ? 'wechat' : s.indexOf('展会') >= 0 ? 'fair' : s.indexOf('邮件') >= 0 ? 'mail' : 'phone';
        var chn = CH.filter(function (c) { return c[0] === ch; })[0][1];
        var sc2 = K.script(d, Pf, LIB, { segId: M.scr.segId || Pf.focus, channel: ch, stage: M.scr.stage, variant: M.scr.variant });
        return {
          text: chn + '版开场：' + sc2.sections[0].text + '\n全篇 ' + sc2.words + ' 字。已把脚本屏切到 ' + chn + '。',
          act: function () { M.scr.channel = ch; M.scr.variant = 0; if (M.step !== 'script') setStep('script'); else draw(); }
        };
      }
      if (hit(s, ['报价后', '二次跟进', '首触', '沉睡'])) {
        var stg = s.indexOf('报价') >= 0 ? 'quote' : s.indexOf('二次') >= 0 ? 'follow' : s.indexOf('沉睡') >= 0 ? 'wake' : 'first';
        var stn = ST.filter(function (c) { return c[0] === stg; })[0][1];
        var sc3 = K.script(d, Pf, LIB, { segId: M.scr.segId || Pf.focus, channel: M.scr.channel, stage: stg, variant: M.scr.variant });
        return {
          text: stn + '版：' + sc3.sections[0].text + '\n行动段：' + sc3.sections[4].text,
          act: function () { M.scr.stage = stg; M.scr.variant = 0; if (M.step !== 'script') setStep('script'); else draw(); }
        };
      }
      if (hit(s, ['异议', '嫌贵', '怎么答', '回绝'])) {
        var sc4 = K.script(d, Pf, LIB, M.scr);
        return {
          text: sc4.objections.slice(0, 2).map(function (o) { return '「' + o.q + '」→ ' + o.a; }).join('\n')
        };
      }
      if (hit(s, ['多少字', '几个字', '口播', '念多久'])) {
        var sc5 = K.script(d, Pf, LIB, M.scr);
        return {
          text: '全篇 ' + sc5.words + ' 字，口播约 ' + Math.round(sc5.words / 5) + ' 秒。',
          blocks: [mini(['段', '字数'], sc5.sections.map(function (x) { return [x.title, x.text.length]; }))]
        };
      }

      /* ---- 单条线索：为什么这个分 ---- */
      var idm = s.match(/L-\d{4}-\d{4}/);
      if (idm && R.byId[idm[0]]) {
        var L2 = R.byId[idm[0]];
        return {
          text: L2.id + ' 综合 ' + L2.total + ' 分 = 匹配 ' + L2.match + ' × ' + Math.round(LIB.stages.weights.match * 100) + '% + 信号 ' + L2.signal + ' × ' + Math.round(LIB.stages.weights.signal * 100) + '%，'
            + L2.grade + ' 级 · ' + L2.stageName + ' · ' + (L2.ownerName || '未分派') + '。',
          blocks: [kvb([['行业', L2.industry], ['区域', L2.region], ['规模', L2.sizeLabel], ['职务', L2.role], ['预计金额', W(L2.amountEst)], ['上次动作', L2.lastAction ? K.short(L2.lastAction.date) : '无']])],
          act: function () { M.lead = L2.id; M.filter = null; if (M.step !== 'leads') setStep('leads'); else still(); }
        };
      }
      if (hit(s, ['为什么', '凭什么', '怎么打的分', '分这么高', '分高'])) {
        var L3 = R.byId[M.lead] || R.leads[0];
        var ok3 = L3.parts.filter(function (p) { return p.share >= 30; });
        return {
          text: L3.id + ' 综合 ' + L3.total + ' 分 = 匹配 ' + L3.match + ' × ' + Math.round(LIB.stages.weights.match * 100)
            + '% + 信号 ' + L3.signal + ' × ' + Math.round(LIB.stages.weights.signal * 100) + '%。\n匹配高在 '
            + (ok3.length ? ok3.map(function (p) { return p.label + ' ' + p.value; }).join('、') + ' 都落在重点细分里' : '没有维度落在重点细分里')
            + '；信号来自 ' + (L3.signalParts.slice(0, 2).map(function (p) { return p.name + ' ' + p.score + ' 分'; }).join('、') || '无'),
          blocks: [mini(['维度', '该细分占比', '权重'], L3.parts.map(function (p) { return [p.label, p.share + '%', p.weight + '%']; }))],
          focus: rowOf(L3.id)
        };
      }
      if (hit(s, ['分派给谁', '给谁', '谁来跟', '推荐'])) {
        var L4 = R.byId[M.lead] || R.leads[0];
        var rec2 = K.recommendTeam(L4, R.teams);
        if (!rec2) return { text: '各组都满了，先把沉睡线索清一清再分。' };
        var own4 = R.teams.filter(function (t) { return t.id === L4.owner; })[0];
        if (own4) return {
          text: L4.id + ' 已经在 ' + own4.name + ' 手上，负载 ' + own4.load + '/' + own4.cap + '。要转的话 ' + rec2.name
            + ' 合适：' + (rec2.sectors.indexOf(L4.sector) >= 0 ? '熟悉该行业' : '有空位') + '，负载 ' + rec2.load + '/' + rec2.cap + '。',
          blocks: [mini(['小组', '在手', '上限'], R.teams.map(function (t) { return [t.name, t.load, t.cap]; }))],
          act: function () { M.lead = L4.id; if (M.step !== 'leads') setStep('leads'); else still(); }
        };
        return {
          text: L4.id + ' 建议给 ' + rec2.name + '：' + (rec2.sectors.indexOf(L4.sector) >= 0 ? '熟悉该行业' : '有空位') + '，当前负载 ' + rec2.load + '/' + rec2.cap + '。',
          blocks: [mini(['小组', '在手', '上限'], R.teams.map(function (t) { return [t.name, t.load, t.cap]; }))],
          act: function () { M.lead = L4.id; if (M.step !== 'leads') setStep('leads'); else still(); }
        };
      }

      /* ---- 计划 / 负载 / 周报 ---- */
      if (hit(s, ['排得满', '负载', '哪个组', '忙'])) {
        var t2 = R.teams.slice().sort(function (a, b) { return (b.load / b.cap) - (a.load / a.cap); })[0];
        return {
          text: t2.name + ' 在手 ' + t2.load + '/' + t2.cap + '，占用 ' + Math.round(100 * t2.load / t2.cap) + '%。本周跟进 '
            + (R.plan.byTeam.filter(function (x) { return x.id === t2.id; })[0] || {}).count + ' 次。',
          blocks: [mini(['小组', '在手/上限', '本周', '加权预测'], R.teams.map(function (x) {
            var fc2 = R.forecast.byTeam.filter(function (y) { return y.id === x.id; })[0] || {};
            return [x.name, x.load + '/' + x.cap, (R.plan.byTeam.filter(function (y) { return y.id === x.id; })[0] || {}).count || 0, W(fc2.expected || 0)];
          }))]
        };
      }
      /* ---- 被瘦身掉的两个 KPI：跟进中 / 本月成交 ---- */
      if (hit(s, ['跟进中', '在跟', '本月成交', '成交了几单', '近 90 天', '近90天'])) {
        return {
          text: '跟进中 ' + k.following + ' 条（已分派且已联系）；本月成交 ' + k.wonMonth + ' 单，近 90 天 ' + k.deals90
            + ' 单；商机转化率 ' + k.conversion + '%，平均成交周期 ' + k.avgCycle + ' 天。'
        };
      }
      if (hit(s, ['周报', '发给谁', '写了什么'])) {
        return {
          text: R.report.lines.slice(0, 3).join('\n') + '\n全文已打开。',
          act: function () { if (M.step !== 'plan') setStep('plan'); setTimeout(openReport, M.step === 'plan' ? 0 : 600); }
        };
      }
      if (hit(s, ['动作', '做了什么', '日志'])) {
        if (!d.log.length) return { text: '本周还没有动作记录。分派、加入计划、记录跟进都会写进这里。' };
        return { text: '本周 ' + d.log.length + ' 条动作：' + d.log.slice(-3).map(function (l) { return l.label; }).join('、') + '。已打开全部。', act: openLog };
      }
      return null;
    },

    onDoc: function (doc) {
      if (!doc.ok) return { text: doc.name + ' 没读出内容：' + (doc.note || '格式不支持') };
      if (doc.kind === 'word' || doc.kind === 'pdf') return docContract(doc);
      if (doc.kind === 'excel') return docSheet(doc);
      if (doc.kind === 'eml') return docMail(doc);
      if (doc.kind === 'ppt') return docSlides(doc);
      return docPlain(doc);
    }
  });

  /* ---------- 文档：合同 / 报价单 → 金额回填到最接近的在手线索 ---------- */
  function moneyList(text) {
    var out = [], m, re = /([0-9][0-9,]*(?:\.[0-9]+)?)\s*(万元|元)/g;
    while ((m = re.exec(text))) {
      var v = parseFloat(m[1].replace(/,/g, ''));
      if (isNaN(v)) continue;
      out.push(m[2] === '万元' ? v * 10000 : v);
    }
    return out.sort(function (a, b) { return b - a; });
  }
  function dateIn(text) {
    var m = /(20\d{2})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/.exec(text);
    if (m) return m[1] + '-' + String(+m[2]).padStart(2, '0') + '-' + String(+m[3]).padStart(2, '0');
    m = /(20\d{2})-(\d{1,2})-(\d{1,2})/.exec(text);
    return m ? m[1] + '-' + String(+m[2]).padStart(2, '0') + '-' + String(+m[3]).padStart(2, '0') : null;
  }
  function docContract(doc) {
    var text = doc.text || '';
    var money = moneyList(text), amount = money[0] || null;
    var due = dateIn(text);
    var warr = (/质保期?\s*(\d+)\s*个月/.exec(text) || [])[1];
    var mine = text.indexOf(M.data.company) >= 0 || (M.data.co && text.indexOf(M.data.co) >= 0);
    var kv = [];
    if (amount) kv.push(['合同金额', W(amount)]);
    if (due) kv.push(['交付期限', due]);
    if (warr) kv.push(['质保', warr + ' 个月']);
    if (doc.tables.length) kv.push(['付款期次', (doc.tables[0].length - 1) + ' 期']);
    kv.push(['条款', doc.paragraphs.length + ' 段']);

    if (!amount) {
      return {
        text: doc.name + ' 读完 ' + doc.paragraphs.length + ' 段、' + doc.tables.length + ' 张表，没有抽到金额，没法回填。开头是「' + (doc.paragraphs[0] || '').slice(0, 24) + '」。',
        blocks: [kvb(kv)]
      };
    }
    var pool = openLeads();
    var best = null;
    pool.forEach(function (l) { var gap = Math.abs(l.amountEst - amount); if (!best || gap < best.gap) best = { l: l, gap: gap }; });
    var tbl = doc.tables[0] || null;
    var blocks = [kvb(kv)];
    if (tbl && tbl.length > 1) blocks.push(mini(tbl[0].slice(0, 3), tbl.slice(1, 4).map(function (r) { return r.slice(0, 3); })));
    if (!best) return { text: doc.name + '：合同金额 ' + W(amount) + (due ? '、交付期限 ' + due : '') + '。在手线索里没有可对应的条目。', blocks: blocks };

    var l = best.l, old = l.amountEst;
    var txt = doc.name + '：合同金额 ' + fmtN(amount) + ' 元' + (due ? '、交付期限 ' + due : '') + (warr ? '、质保 ' + warr + ' 个月' : '')
      + (mine ? '，甲方就是本企业' : '') + '。\n在手 ' + pool.length + ' 条里 ' + l.id + '（' + l.industry + '）预计 ' + W(old) + ' 与它差 ' + W(best.gap)
      + '，已按合同金额回填并记一次跟进。';
    return {
      text: txt, blocks: blocks,
      act: function () {
        var nd = K.logAction(M.data, l.id, '合同金额 ' + fmtN(amount) + ' 元回填' + (due ? ' · 交付 ' + due : ''));
        var row = nd.leads.filter(function (x) { return x.id === l.id; })[0];
        if (row) { row.amountEst = amount; if (due) row.note = '交付期限 ' + due; }
        M.lead = l.id; M.filter = null;
        if (M.step !== 'leads') { M.data = nd; recompute(); setStep('leads'); }
        else commit(nd, l.id + ' 预计金额已回填为 ' + W(amount));
        setTimeout(function () { var tr = rowOf(l.id); if (tr) A.pulse(tr); }, 900);
      }
    };
  }

  /* ---------- 文档：表格 → 线索表导入 ---------- */
  var COLMAP = [
    { key: 'industry', words: ['企业', '公司', '客户', '厂商', '单位'] },
    { key: 'sector', words: ['行业'] },
    { key: 'region', words: ['区域', '地区', '省份', '城市'] },
    { key: 'size', words: ['规模', '人数'] },
    { key: 'role', words: ['职务', '岗位', '角色', '决策人'] },
    { key: 'channel', words: ['来源', '渠道'] },
    { key: 'amountEst', words: ['金额', '预算', '预计', '年采购'] }
  ];
  function docSheet(doc) {
    var sheet = (doc.sheets || [])[0];
    if (!sheet || !sheet.rows.length) return { text: doc.name + ' 里没有可读的工作表。' };
    var head = sheet.rows[0].map(function (x) { return String(x == null ? '' : x).trim(); });
    var body = sheet.rows.slice(1).filter(function (r) { return r.join('').trim().length; });
    var map = {};
    COLMAP.forEach(function (c) {
      head.forEach(function (hd, i) { if (map[c.key] == null && c.words.some(function (w) { return hd.indexOf(w) >= 0; })) map[c.key] = i; });
    });
    var keys = Object.keys(map);
    var blocks = [kvb([['工作表', sheet.name], ['行', body.length], ['列', head.length]]),
      mini(head.slice(0, 4), body.slice(0, 3).map(function (r) { return r.slice(0, 4).map(function (c) { return c == null ? '' : String(c); }); }))];
    if (map.industry == null && map.sector == null) {
      return {
        text: doc.name + '《' + sheet.name + '》' + body.length + ' 行 × ' + head.length + ' 列，列名是：' + head.join(' / ')
          + '。里面没有企业、行业、区域这类线索字段，没有入池。全表已打开。',
        blocks: blocks,
        act: function () { openSheet(sheet.name, head, body.slice(0, 20)); }
      };
    }
    var made = body.slice(0, 8).map(function (r, i) {
      return {
        name: String(r[map.industry != null ? map.industry : map.sector] || '').trim(),
        region: map.region != null ? String(r[map.region] || '') : '',
        role: map.role != null ? String(r[map.role] || '') : '',
        amount: map.amountEst != null ? parseFloat(String(r[map.amountEst]).replace(/[^0-9.]/g, '')) || 0 : 0
      };
    }).filter(function (x) { return x.name; });
    return {
      text: doc.name + '《' + sheet.name + '》' + body.length + ' 行，认出 ' + keys.length + ' 个线索字段（' + keys.map(function (x) { return head[map[x]]; }).join('、')
        + '），前 ' + made.length + ' 行可以入池。全表已打开。',
      blocks: [mini(['企业', '区域', '预计金额'], made.slice(0, 4).map(function (x) { return [x.name, x.region || '—', x.amount ? fmtN(x.amount) : '—']; }))],
      act: function () { openSheet(sheet.name, head, body.slice(0, 20)); }
    };
  }

  /* ---------- 文档：来函 → 建档 ---------- */
  function docMail(doc) {
    var m = doc.mail || {};
    var money = moneyList(doc.text || ''), due = dateIn(doc.text || '');
    var from = String(m.from || '').replace(/<[^>]*>/g, '').trim() || '来函方';
    var kv = [['发件', from], ['主题', m.subject || '—'], ['日期', (m.date || '').slice(0, 24)]];
    if (money[0]) kv.push(['正文金额', W(money[0])]);
    if (due) kv.push(['期限', due]);
    var pool = openLeads(), best = null;
    if (money[0]) pool.forEach(function (l) { var gap = Math.abs(l.amountEst - money[0]); if (!best || gap < best.gap) best = { l: l, gap: gap }; });
    var txt = '来函《' + (m.subject || doc.name) + '》，发件 ' + from + '，' + (m.date || '').slice(0, 16) + '。'
      + (money[0] ? '正文里抽到 ' + W(money[0]) + (money[1] ? '、' + W(money[1]) : '') : '正文没有金额')
      + (due ? '，期限 ' + due : '') + '。';
    if (!best) return { text: txt, blocks: [kvb(kv)] };
    return {
      text: txt + '\n在手线索里 ' + best.l.id + '（' + best.l.industry + '）预计 ' + W(best.l.amountEst) + ' 与它接近，已记一次来函跟进。',
      blocks: [kvb(kv)],
      act: function () {
        var nd = K.logAction(M.data, best.l.id, '来函「' + (m.subject || doc.name) + '」' + (money[0] ? ' · ' + fmtN(money[0]) + ' 元' : ''));
        M.lead = best.l.id; M.filter = null;
        if (M.step !== 'leads') { M.data = nd; recompute(); setStep('leads'); }
        else commit(nd, best.l.id + ' 已记一次来函跟进');
        setTimeout(function () { var tr = rowOf(best.l.id); if (tr) A.pulse(tr); }, 900);
      }
    };
  }

  /* ---------- 文档：幻灯片 → 指标对照 ---------- */
  function docSlides(doc) {
    var lines = [];
    (doc.slides || []).forEach(function (s) { lines = lines.concat(s.lines || []); if (s.title) lines.push(s.title); });
    var nums = lines.filter(function (x) { return /\d/.test(x); }).slice(0, 5);
    var k = M.R.kpi;
    var deal = lines.filter(function (x) { return x.indexOf('成交') >= 0 || x.indexOf('新客') >= 0; })[0];
    return {
      text: doc.name + ' 共 ' + doc.slides.length + ' 页，第 1 页「' + ((doc.slides[0] || {}).title || '—') + '」。'
        + (deal ? '里面写着「' + deal + '」；' : '') + '本模块口径：近 90 天成交 ' + k.deals90 + ' 单，本月 ' + k.wonMonth + ' 单，在手 ' + k.leads + ' 条。',
      blocks: [mini(['幻灯片里的数'], nums.map(function (x) { return [x]; }))]
    };
  }
  function docPlain(doc) {
    var lines = (doc.text || '').split(/\r?\n/).filter(function (x) { return x.trim(); });
    return {
      text: doc.name + ' 共 ' + lines.length + ' 行。开头是「' + (lines[0] || '').slice(0, 30) + '」。没有识别到线索字段，没有入池。',
      blocks: [mini(['前几行'], lines.slice(0, 3).map(function (x) { return [x.slice(0, 26)]; }))]
    };
  }

  window.DGG = window.DGG || {};
  window.DGG.registerModule('m4', { mount: mount, unmount: unmount, onCompany: onCompany, onIndustry: onIndustry });
})();
