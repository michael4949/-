/* AI人力官 · JD 简历 面试 合规 成本（六屏）
 * 接入 → 人力驾驶舱 → 招聘 · JD 与简历 → 面试与录用 → 用工合规 → 成本与编制
 * 全部计算走 DGG.coreM5（与 skill 同一份内核）；发布 / 初筛 / 面试 / 评分 / offer / 整改 / 采纳方案都写回同一份数据
 * 纯预制、断网可用；不用任何存储 API
 */
(function () {
  'use strict';
  var sh, $root, h, DATA, P, K, LIB;
  var ACCENT = window.DGG.PALETTE.m5;
  var CAPS = [['招聘 · JD 与简历', '需求单出 JD 两版 · 简历硬门槛与匹配打分 · 逐条解释'], ['面试与录用', '结构化题库 · 四维评分雷达 · 录用建议与 offer 定薪'], ['用工合规', '12 条规则逐人核对 · 影响金额 · 整改写回 · 90 天人事日历'], ['成本与编制', '用工成本结构 · 12 个月三方案对比 · 月报到微信']];
  var GRADE = { A: 'ok', B: 'handled', C: 'risk', D: 'done' }, GRADE_NAME = { A: 'A 级', B: 'B 级', C: 'C 级', D: '不满足' };
  var STAGE_TONE = { new: 'watch', screened: 'handled', interview: 'accent', done: 'risk', offer: 'ok', hired: 'ok', rejected: 'done' };
  var SEV = { high: 'late', mid: 'risk', low: 'watch' }, SEV_NAME = { high: '高', mid: '中', low: '低' };
  var STATUS_TONE = { open: 'late', handled: 'ok', planned: 'handled', clear: 'done' }, STATUS_NAME = { open: '待处理', handled: '已整改', planned: '已进台账', clear: '无问题' };
  var M = { step: 'connect', arche: null, data: null, R: null, need: null, cand: null, filter: null, jdVariant: 'site', icand: null, scores: {}, rule: null, calKind: null, plan: null, charged: false, name: null, company: null, frame: null, who: 0 };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function sectorOf(slug) { var hit = null; (DATA.industries.sectors || []).forEach(function (s) { (s.industries || []).forEach(function (i) { if (i.slug === slug) hit = s.key; }); }); return hit; }
  function archeOf(slug) { var sec = sectorOf(slug); var a = (sec && DATA.m10.archetypes.map[sec]) || 'make'; if (a === 'project') a = 'service'; return DATA.m5.samples[a] ? a : 'make'; }
  function loadArche(a) {
    M.arche = a;
    var sample = DATA.m5.samples[a], base = K.ensure(sample);
    if (M.name && M.name !== sample.company) base.company = M.name;
    if (M.company && M.company.systems) { var sys = M.company.systems; base.sources.forEach(function (s) { if (s.id === 'hr') s.mode = sys.indexOf('hr') >= 0 ? 'direct' : 'import'; if (s.id === 'attendance') s.mode = sys.indexOf('hr') >= 0 || sys.indexOf('oa') >= 0 ? 'direct' : 'import'; }); }
    M.data = base; M.need = null; M.cand = null; M.filter = null; M.icand = null; M.scores = {}; M.rule = null; M.calKind = null; M.plan = null; M.jdVariant = 'site';
    recompute();
  }
  function recompute() { M.R = K.run(M.data, LIB); }
  function commit(data, msg) { M.data = data; recompute(); draw(); if (msg && M.frame) P.toast(M.frame.body, msg); }
  function fmtN(n) { return P.fmtN(n); }
  function W(n) { return K.fmtW(n); }
  function W0(n) { return Math.abs(n) >= 1000000 ? fmtN(Math.round(n / 10000)) + ' 万元' : K.fmtW(n); }
  function short(s) { return K.short(s); }

  function mount(root, step, shell) {
    sh = shell; $root = root; h = sh.h; DATA = sh.DATA; P = window.DGG.pui; K = window.DGG.coreM5;
    LIB = { jobs: DATA.m5.jobs, jdBlocks: DATA.m5.jdBlocks, questions: DATA.m5.questions, complianceRules: DATA.m5.complianceRules, costParams: DATA.m5.costParams };
    P.init(sh);
    var c = sh.getCompany();
    if (!M.data) { M.company = c; M.name = c ? c.name : null; loadArche(c ? archeOf(c.industry) : archeOf(sh.displayIndustryDefault())); }
    M.step = step || 'connect';
    if (['connect', 'board', 'recruit', 'interview', 'compliance', 'cost'].indexOf(M.step) < 0) M.step = 'connect';
    draw();
  }
  function unmount() { }
  function onCompany(c) { M.company = c; M.name = c ? c.name : null; M.charged = false; loadArche(c ? archeOf(c.industry) : archeOf(sh.displayIndustryDefault())); if (M.step !== 'connect') setStep('connect'); else draw(); }
  function onIndustry(slug) { if (M.step !== 'connect' || !slug) return; var a = archeOf(slug); if (a !== M.arche) { loadArche(a); draw(); } }
  function setStep(s) { M.step = s; sh.go('m5', s); }

  function draw() {
    sh.clear($root);
    var R = M.R, c = M.company, k = R.kpi;
    var meta = c ? [sh.industryNameOf(c.industry), sh.optText('size', c.size)].filter(Boolean).join(' · ') : '';
    var tabs = [{ key: 'connect', label: '接入' }, { key: 'board', label: '人力驾驶舱' }, { key: 'recruit', label: '招聘 · JD 与简历', badge: k.candidates ? R.candidates.filter(function (x) { return x.stage === 'new' && x.grade !== 'D'; }).length : 0 }, { key: 'interview', label: '面试与录用', badge: k.interviewing || 0 }, { key: 'compliance', label: '用工合规', badge: k.complianceOpen || 0 }, { key: 'cost', label: '成本与编制' }];
    var F = P.frame({ mark: '人力', accent: ACCENT, modules: P.navModules('m5'), crumbs: ['AI人力官', tabs.filter(function (t) { return t.key === M.step; })[0].label], company: { name: M.data.company, meta: meta }, tabs: tabs, active: M.step, onTab: function (key) { if (key === 'board' && !M.charged) enterBoard(); else setStep(key); } });
    M.frame = F; $root.appendChild(F.root);
    if (M.step === 'board' && !M.charged) { M.charged = true; sh.charge(K.CREDITS); }
    ({ connect: screenConnect, board: screenBoard, recruit: screenRecruit, interview: screenInterview, compliance: screenCompliance, cost: screenCost })[M.step](F.work);
  }
  function enterBoard() { setStep('board'); }
  function col(cls, kids) { return h('div', { class: cls, style: 'display:flex;flex-direction:column;gap:16px' }, kids); }
  function gradeChip(g) { return P.chip(GRADE[g], GRADE_NAME[g]); }
  function stageChip(c) { return P.chip(STAGE_TONE[c.stage] || 'watch', c.stageName); }
  function sevChip(s) { return P.chip(SEV[s], SEV_NAME[s] + '风险'); }
  function logList(log) { var el = h('div', { class: 'm5-log' }); log.forEach(function (l) { el.appendChild(h('div', { class: 'l' }, [h('span', { class: 'n' }, [String(l.seq)]), h('b', {}, [l.label]), h('span', {}, [l.detail])])); }); return el; }
  function needBlock(n, on, onClick) {
    return h('button', { class: 'nd' + (on ? ' on' : ''), onclick: onClick }, [
      h('div', { class: 'hd' }, [h('span', {}, [n.title]), h('span', { class: 'sp' }), P.chip(n.status === 'published' ? 'ok' : 'watch', n.status === 'published' ? '已发布' : '未发布')]),
      h('div', { class: 'kv' }, [h('span', {}, [n.count + ' 人 · ' + n.deptName]), h('span', {}, ['到岗 ' + short(n.dueDate) + '（' + n.dueDays + ' 天）']), h('span', {}, ['薪酬带 ' + fmtN(n.band[0]) + '–' + fmtN(n.band[1])]), h('span', {}, ['候选 ' + n.active + ' · A 级 ' + n.gradeA])]),
      h('div', { class: 'm5-stages' }, [['new', '新简历'], ['screened', '初筛'], ['interview', '面试'], ['done', '完成'], ['offer', 'offer']].map(function (s) { return h('span', { class: 'st' + (n.stages[s[0]] ? ' has' : '') }, [h('b', {}, [String(n.stages[s[0]])]), s[1]]); }))
    ]);
  }
  function currentNeed() { var R = M.R; if (!M.need || !R.needs.some(function (n) { return n.id === M.need; })) M.need = R.needs[0].id; return R.needs.filter(function (n) { return n.id === M.need; })[0]; }

  /* ---------- 屏 1 ---------- */
  function screenConnect(work) {
    var d = M.data, R = M.R, k = R.kpi, pf = d.profile;
    work.classList.add('m5-connect');
    var g = h('div', { class: 'pd-grid' });
    var nameIn = h('input', { type: 'text', value: d.company, oninput: function (e) { M.name = e.target.value; d.company = e.target.value; var co = M.frame.root.querySelector('.pd-top .co span:nth-child(2)'); if (co) co.textContent = e.target.value; } });
    g.appendChild(P.card({ cls: 'c4', title: '企业', body: [h('div', { class: 'pd-form' }, [
      h('div', { class: 'pd-field' }, [h('label', {}, ['企业名称']), nameIn]),
      h('div', { class: 'pd-field' }, [h('label', {}, ['行业']), h('div', { style: 'font-weight:600' }, [M.company ? sh.industryNameOf(M.company.industry) + (M.company.size ? ' · ' + sh.optText('size', M.company.size) : '') : sh.industryNameOf(sh.displayIndustryDefault())])]),
      h('div', { class: 'pd-field' }, [h('label', {}, ['组织']), h('div', { style: 'font-weight:600' }, ['在编 ' + k.headcount + ' 人 · ' + d.departments.length + ' 个部门 · 编制 ' + k.budget + ' · ' + pf.city])]),
      h('div', { class: 'pd-field' }, [h('label', {}, ['已有数据']), h('div', { style: 'font-weight:600' }, ['花名册 ' + k.headcount + ' 人 · 工资表与考勤 ' + (+d.overtimeMonth.slice(5)) + ' 月 · 简历 ' + d.candidates.length + ' 份 · 需求单 ' + d.needs.length + ' 张'])])
    ])] }));
    var caps = h('div'); CAPS.forEach(function (c, i) { caps.appendChild(h('div', { class: 'cap-row' }, [h('span', { class: 'ic' }, ['0' + (i + 1)]), h('div', {}, [h('div', { class: 't' }, [c[0]]), h('div', { class: 's' }, [c[1]])]), P.chip('ok', '已开通')])); });
    g.appendChild(P.card({ cls: 'c4', title: '已开通能力', sub: '4 项', body: [caps], foot: ['从要招人到人到岗、用工不踩线、成本看得清，写在同一份数据上'] }));
    var srcs = h('div'); d.sources.forEach(function (s) { srcs.appendChild(h('div', { class: 'src-row' }, [h('div', {}, [h('div', { class: 't' }, [s.name]), h('div', { class: 's' }, ['同步 ' + s.lastSync + ' · ' + fmtN(s.rows) + ' 条'])]), P.chip(s.mode === 'direct' ? 'ok' : 'watch', s.mode === 'direct' ? '系统直连' : '表格导入'), h('span', { class: 'pd-dot ' + (s.mode === 'direct' ? 'ok' : 'risk') })])); });
    g.appendChild(P.card({ cls: 'c4', title: '数据源', sub: d.sources.length + ' 个', body: [srcs], foot: ['岗位库 ' + Object.keys(LIB.jobs.jobs).length + ' 个岗位 · 合规规则 ' + LIB.complianceRules.rules.length + ' 条 · 题库按岗位族 × 四项能力'] }));
    g.appendChild(h('div', { class: 'c12 go' }, [h('div', {}, [h('div', { class: 't' }, ['人力驾驶舱']), h('div', { class: 's' }, ['在编 ' + k.headcount + ' / 编制 ' + k.budget + ' · 在招 ' + k.needCount + ' 人 · 合规待处理 ' + k.complianceOpen + ' 项 · 30 天内到期 ' + k.due30 + ' 项'])]), h('div', { class: 'sp' }), h('div', { class: 'cr' }, [h('b', { class: 'num' }, [String(K.CREDITS)]), ' 积分 / 次']), P.btn('进入人力驾驶舱', { cls: 'primary big', onClick: enterBoard })]));
    work.appendChild(g);
  }

  /* ---------- 屏 2 ---------- */
  function screenBoard(work) {
    var R = M.R, k = R.kpi, d = M.data, O = R.org, comp = R.compliance;
    work.classList.add('m5-board');
    var g = h('div', { class: 'pd-grid' });
    g.appendChild(h('div', { class: 'c12' }, [P.kpis([
      { label: '在编 / 编制', value: k.headcount, unit: '/ ' + k.budget, sub: '缺编 ' + k.vacancy + ' · 派遣 ' + O.dispatch + ' 人', tone: k.vacancy ? 'risk' : 'ok' },
      { label: '在招', value: k.needCount, unit: '人', tone: 'accent', sub: k.needs + ' 张需求单 · 已发布 ' + k.published, onClick: function () { M.filter = null; setStep('recruit'); } },
      { label: '候选人', value: k.candidates, unit: '人', sub: 'A 级 ' + k.gradeA + ' · 面试中 ' + k.interviewing + ' · offer ' + k.offers, onClick: function () { M.filter = 'A'; setStep('recruit'); } },
      { label: '近 12 月离职率', value: k.turnover, unit: '%', tone: k.turnover > k.turnoverBench + 3 ? 'late' : k.turnover > k.turnoverBench ? 'risk' : 'ok', sub: '行业参考 ' + k.turnoverBench + '% · 离职 ' + O.leavers12 + ' 人' },
      { label: '人均产值', value: W(k.perCapitaRevenue), sub: '近 12 个月收入 ÷ 在编' },
      { label: '用工成本占收入', value: k.laborShare, unit: '%', tone: k.laborShare > k.laborBench[1] ? 'risk' : 'ok', sub: '参考 ' + k.laborBench[0] + '–' + k.laborBench[1] + '% · 年化 ' + W0(k.annualCost), onClick: function () { setStep('cost'); } },
      { label: '合规待处理', value: k.complianceOpen, unit: '项', tone: k.complianceHigh ? 'late' : k.complianceOpen ? 'risk' : 'ok', sub: '高风险 ' + k.complianceHigh + ' · 影响预计 ' + W(k.complianceImpact), onClick: function () { M.rule = null; setStep('compliance'); } },
      { label: '30 天内到期', value: k.due30, unit: '项', tone: k.due30 ? 'risk' : 'ok', sub: '合同 · 试用期 · 到岗期限 · 面试', onClick: function () { M.calKind = null; setStep('compliance'); } }
    ])]));
    var tbl = P.table({ compact: true, cols: [
      { key: 'name', label: '部门', render: function (x) { return h('b', {}, [x.name]); } },
      { key: 'headcount', label: '在编', align: 'r', sort: true }, { key: 'budget', label: '编制', align: 'r' },
      { key: 'vacancy', label: '缺编', align: 'r', sort: true, render: function (x) { return h('span', { class: x.vacancy > 0 ? 'neg' : '' }, [String(x.vacancy)]); } },
      { key: 'avgWage', label: '平均工资', align: 'r', sort: true, render: function (x) { return fmtN(x.avgWage); } },
      { key: 'turnover', label: '离职 12 月', align: 'r', sort: true, render: function (x) { return x.leavers12 + ' 人 · ' + x.turnover + '%'; } },
      { key: 'overtimeOver', label: '加班超限', align: 'r', sort: true, render: function (x) { return x.overtimeOver ? h('span', { class: 'neg' }, [x.overtimeOver + ' 人']) : '—'; } },
      { key: 'needs', label: '在招', align: 'r', render: function (x) { return x.needs ? P.chip('accent', x.needs + ' 人') : '—'; } }
    ], rows: O.byDept, rowKey: function (x) { return x.id; } });
    g.appendChild(P.card({ cls: 'c7', title: '部门盘点', sub: d.departments.length + ' 个部门 · 平均司龄 ' + O.avgTenure + ' 年 · 平均工资 ' + fmtN(O.avgWage) + ' 元', tight: true, body: [tbl] }));
    var needs = h('div', { class: 'm5-needs' }); R.needs.forEach(function (n) { needs.appendChild(needBlock(n, false, function () { M.need = n.id; M.filter = null; setStep('recruit'); })); });
    g.appendChild(P.card({ cls: 'c5', title: '招聘进度', sub: k.needs + ' 张需求单 · 点一张看 JD 与候选人', body: [needs] }));
    var risks = h('div', { class: 'pd-list' });
    comp.open.slice(0, 5).forEach(function (i) { risks.appendChild(P.item({ tone: SEV[i.severity] === 'watch' ? 'hand' : SEV[i.severity], icon: i.id.slice(1), title: i.name, sub: i.cat + ' · ' + i.law, right: i.count + ' 人', rightSub: '预计 ' + W(i.impact), onClick: function () { M.rule = i.id; setStep('compliance'); } })); });
    if (!comp.open.length) risks.appendChild(P.empty('无待处理合规问题'));
    g.appendChild(P.card({ cls: 'c4', title: '合规风险榜', sub: '待处理 ' + comp.counts.open + ' 项 · 按严重度与影响', body: [risks], extra: [P.btn('全部', { cls: 'sm', onClick: function () { M.rule = null; setStep('compliance'); } })] }));
    g.appendChild(P.card({ cls: 'c4', title: '人员结构', sub: '司龄 · 年龄', body: [h('div', { style: 'font-weight:700;margin-bottom:6px' }, ['司龄']), P.dist({ rows: O.tenure.map(function (x) { return { label: x.label, value: x.value, text: x.value + ' 人', hi: x.label === '1 年以内' }; }) }), h('div', { style: 'font-weight:700;margin:10px 0 6px' }, ['年龄']), P.dist({ rows: O.age.map(function (x) { return { label: x.label, value: x.value, text: x.value + ' 人' }; }) })] }));
    g.appendChild(P.card({ cls: 'c4', title: '离职', sub: '近 12 个月 ' + O.leavers12 + ' 人 · 按月与原因', body: [P.lineChart({ labels: O.leaversByMonth.map(function (x) { return x.label; }), series: [{ values: O.leaversByMonth.map(function (x) { return x.count; }), color: '#D9483B', bar: true }], height: 120, width: 420 }), P.dist({ rows: O.reasons.map(function (x) { return { label: x.label, value: x.value, text: x.value + ' 人' }; }) })] }));
    if (d.log.length) g.appendChild(P.card({ cls: 'c12', title: '本期动作', sub: d.log.length + ' 条', body: [logList(d.log.slice(-6).reverse())] }));
    work.appendChild(g);
  }

  /* ---------- 屏 3 ---------- */
  function screenRecruit(work) {
    var R = M.R, d = M.data, n = currentNeed(), f = M.filter;
    work.classList.add('m5-recruit');
    var all = R.candidates.filter(function (c) { return c.needId === n.id; });
    var shown = all.filter(function (c) { return f === 'A' ? c.grade === 'A' : f === 'new' ? c.stage === 'new' : f === 'interview' ? c.stage === 'interview' || c.stage === 'done' : f === 'offer' ? c.stage === 'offer' : f === 'fail' ? c.grade === 'D' : c.stage !== 'rejected'; });
    if (!M.cand || !shown.some(function (c) { return c.id === M.cand; })) M.cand = (shown[0] || all[0]).id;
    var C = R.byId[M.cand];
    var g = h('div', { class: 'pd-grid' });
    var filt = function (key) { return function () { M.filter = M.filter === key ? null : key; draw(); }; };
    g.appendChild(h('div', { class: 'c12' }, [P.kpis([
      { label: '需求单', value: R.needs.length, unit: '张', sub: R.kpi.needCount + ' 人 · 已发布 ' + R.kpi.published },
      { label: n.title + ' 候选', value: all.filter(function (c) { return c.stage !== 'rejected'; }).length, unit: '人', onClick: filt(null), active: !f },
      { label: 'A 级', value: all.filter(function (c) { return c.grade === 'A' && c.stage !== 'rejected'; }).length, unit: '人', tone: 'ok', onClick: filt('A'), active: f === 'A' },
      { label: '待初筛', value: all.filter(function (c) { return c.stage === 'new'; }).length, unit: '人', tone: 'risk', onClick: filt('new'), active: f === 'new' },
      { label: '面试中', value: all.filter(function (c) { return c.stage === 'interview' || c.stage === 'done'; }).length, unit: '人', tone: 'accent', onClick: filt('interview'), active: f === 'interview' },
      { label: '已发 offer', value: all.filter(function (c) { return c.stage === 'offer'; }).length, unit: '人', onClick: filt('offer'), active: f === 'offer' },
      { label: '不满足硬条件', value: all.filter(function (c) { return c.grade === 'D'; }).length, unit: '人', onClick: filt('fail'), active: f === 'fail' }
    ])]));
    var needs = h('div', { class: 'm5-needs' }); R.needs.forEach(function (x) { needs.appendChild(needBlock(x, x.id === n.id, function () { M.need = x.id; M.cand = null; M.filter = null; draw(); })); });
    g.appendChild(P.card({ cls: 'c4', title: '需求单', sub: '点一张切换', body: [needs], foot: [h('span', {}, ['原因：' + n.reason])] }));
    var J = K.jd(d, n.id, LIB, M.jdVariant);
    var doc = h('div', { class: 'pd-doc m5-jd' });
    doc.appendChild(h('div', { class: 'title' }, [J.title, h('span', { class: 'd' }, [J.variantName + ' · ' + J.words + ' 字' + (J.published ? ' · 已发布 ' + short(J.publishedAt) : '')])]));
    J.sections.forEach(function (s) { doc.appendChild(h('div', { class: 'sec' }, [h('h4', {}, [s.title]), s.lines.length > 1 ? h('ol', {}, s.lines.map(function (l) { return h('li', {}, [l]); })) : h('p', { class: 'm5-p' }, [s.lines[0]])])); });
    var vchips = h('div', { class: 'chips' }, LIB.jdBlocks.variants.map(function (v) { return h('button', { class: M.jdVariant === v.key ? 'on' : '', onclick: function () { M.jdVariant = v.key; draw(); } }, [v.name]); }));
    g.appendChild(P.card({ cls: 'c8', title: 'JD', sub: n.title + ' · 由岗位库与企业信息拼装 · 薪酬带按地区与企业工资水平换算', extra: [vchips], body: [doc], foot: [J.published && J.publishedVariant === M.jdVariant ? P.chip('ok', '已发布 · ' + J.variantName) : P.btn('发布' + J.variantName, { cls: 'primary sm', onClick: function () { commit(K.publish(d, n.id, M.jdVariant, LIB), n.title + ' JD 已发布（' + J.variantName + '），候选人按此薪酬带打分'); } }), P.btn('发送到微信', { cls: 'sm', onClick: function () { sh.setQrReady(true); sh.showWeChat(); } })] }));
    var tbl = P.table({ compact: true, cols: [
      { key: 'id', label: '候选人', render: function (c) { return h('span', {}, [h('b', { class: 'id' }, [c.id]), h('span', { class: 'sub' }, [c.sourceName])]); } },
      { key: 'total', label: '匹配分', align: 'r', sort: true, sortDesc: true, render: function (c) { return P.bar(c.total, c.grade === 'A' ? 'ok' : c.grade === 'B' ? undefined : c.grade === 'C' ? 'risk' : 'late', c.total + ''); } },
      { key: 'grade', label: '等级', render: function (c) { return gradeChip(c.grade); } },
      { key: 'years', label: '学历 · 经验', sort: true, render: function (c) { return c.eduName + ' · ' + c.years + ' 年'; } },
      { key: 'skills', label: '技能', render: function (c) { return '必备 ' + c.score.mustHit + '/' + (LIB.jobs.jobs[c.jobTitle] ? '' : '') + (K.run ? (LIB.jobs.jobs[n.job].must || []).length : 0) + ' · 加分 ' + c.score.niceHit; } },
      { key: 'expected', label: '期望', align: 'r', sort: true, render: function (c) { return h('span', { class: c.expected > n.band[1] ? 'neg' : '' }, [fmtN(c.expected)]); } },
      { key: 'availableDays', label: '到岗', align: 'r', sort: true, render: function (c) { return c.availableDays + ' 天'; } },
      { key: 'stageIdx', label: '阶段', sort: true, render: function (c) { return stageChip(c); } },
      { key: 'action', label: '下一步' }
    ], rows: shown, sortKey: 'total', sortDir: 'desc', rowKey: function (c) { return c.id; }, activeKey: M.cand, onRow: function (c) { M.cand = c.id; draw(); }, empty: '此筛选下没有候选人' });
    g.appendChild(P.card({ cls: 'c7', title: '候选人 · ' + n.title, sub: shown.length + ' 人' + (f ? ' · 已筛选' : '') + ' · 匹配分 = 技能 35% + 经验 20% + 行业 15% + 稳定性 15% + 薪酬 10% + 通勤 5% · 点一行看判断', tight: true, body: [h('div', { class: 'pd-scroll', style: 'max-height:520px' }, [tbl])] }));
    // 焦点候选人
    var s = C.score, acts = h('div', { class: 'pd-actions' });
    if (C.stage === 'new') {
      if (C.grade !== 'D') acts.appendChild(h('div', { class: 'pd-action best' }, [h('div', { class: 't' }, [h('span', { class: 'rank' }, ['1']), '通过初筛']), P.btn('通过', { cls: 'primary sm', onClick: function () { commit(K.pass(d, C.id), C.id + ' 已通过初筛'); } }), h('div', { class: 'd' }, ['进入面试安排队列，用人部门确认时间'])]));
      acts.appendChild(h('div', { class: 'pd-action' + (C.grade === 'D' ? ' best' : '') }, [h('div', { class: 't' }, [h('span', { class: 'rank' }, [C.grade === 'D' ? '1' : '2']), '淘汰']), P.btn('淘汰', { cls: (C.grade === 'D' ? 'primary ' : '') + 'sm', onClick: function () { commit(K.reject(d, C.id), C.id + ' 已淘汰，入人才库'); } }), h('div', { class: 'd' }, [C.grade === 'D' ? '不满足硬条件：' + s.gates.join('；') : '匹配分 ' + C.total + '，低于本批候选'])]));
    } else if (C.stage === 'screened') {
      acts.appendChild(h('div', { class: 'pd-action best' }, [h('div', { class: 't' }, [h('span', { class: 'rank' }, ['1']), '安排面试 · ' + short(K.dateOf(d.today, 3))]), P.btn('安排', { cls: 'primary sm', onClick: function () { commit(K.schedule(d, C.id, K.dateOf(d.today, 3)), C.id + ' 面试已安排在 ' + short(K.dateOf(d.today, 3)) + '，已进日历'); } }), h('div', { class: 'd' }, ['面试官：' + K.interviewKit(d, C, LIB).interviewers.join('、')])]));
      acts.appendChild(h('div', { class: 'pd-action' }, [h('div', { class: 't' }, [h('span', { class: 'rank' }, ['2']), '淘汰']), P.btn('淘汰', { cls: 'sm', onClick: function () { commit(K.reject(d, C.id), C.id + ' 已淘汰'); } }), h('div', { class: 'd' }, ['入人才库，同岗位再招时优先联系'])]));
    } else if (C.stage === 'interview' || C.stage === 'done') {
      acts.appendChild(h('div', { class: 'pd-action best' }, [h('div', { class: 't' }, [h('span', { class: 'rank' }, ['1']), C.stage === 'interview' ? '面试 ' + short(C.interviewDate) + ' · 录入评分' : '综合 ' + C.interview.avg + ' 分 · ' + C.interview.verdictName]), P.btn('去面试屏', { cls: 'primary sm', onClick: function () { M.icand = C.id; setStep('interview'); } }), h('div', { class: 'd' }, [C.stage === 'interview' ? '结构化题库与评分表在面试屏' : '录用建议与 offer 定薪在面试屏'])]));
    } else if (C.stage === 'offer') {
      acts.appendChild(h('div', { class: 'pd-action' }, [h('div', { class: 't' }, [h('span', { class: 'rank' }, ['·']), '已发 offer · 月薪 ' + fmtN(C.offer.salary) + ' 元']), P.chip('ok', '待入职'), h('div', { class: 'd' }, ['入职前办理：合同签订、参保、试用期按法定上限约定'])]));
    } else acts.appendChild(h('div', { class: 'pd-action' }, [h('div', { class: 't' }, [h('span', { class: 'rank' }, ['·']), '已淘汰']), P.chip('done', '人才库'), h('div', { class: 'd' }, [''])]));
    var right = col('c5', [P.card({ title: C.id + ' · ' + C.jobTitle, sub: C.sourceName + ' · ' + C.eduName + ' · ' + C.years + ' 年 · ' + C.age + ' 岁', accent: true, body: [
      h('div', { class: 'm5-chead' }, [gradeChip(C.grade), stageChip(C), h('span', { class: 'm' }, [h('b', { class: 'num' }, [String(C.total)]), h('span', {}, ['匹配分'])]), h('span', { class: 'm' }, [h('b', { class: 'num' }, [fmtN(C.expected)]), h('span', {}, ['期望月薪'])]), h('span', { class: 'm' }, [h('b', { class: 'num' }, [C.availableDays + ' 天']), h('span', {}, ['到岗'])])]),
      h('div', { class: 'pd-legend', style: 'margin-bottom:10px' }, C.skillNames.map(function (t) { return P.chip('accent', t, true); })),
      P.judge({ verdict: { tone: C.grade === 'A' ? 'ok' : C.grade === 'D' ? 'late' : 'risk', chip: GRADE_NAME[C.grade], text: C.action + ' · ' + s.reasons[0] }, seen: s.seen, reasons: s.reasons, actionsEl: acts, actionsTitle: '建议动作' })
    ] })]);
    g.appendChild(right);
    work.appendChild(g);
  }

  /* ---------- 屏 4 ---------- */
  function screenInterview(work) {
    var R = M.R, d = M.data;
    work.classList.add('m5-interview');
    var list = R.candidates.filter(function (c) { return ['interview', 'done', 'offer'].indexOf(c.stage) >= 0; }).sort(function (a, b) { return (a.interviewDate || '').localeCompare(b.interviewDate || '') || a.id.localeCompare(b.id); });
    if (!M.icand || !list.some(function (c) { return c.id === M.icand; })) M.icand = list.length ? list[0].id : null;
    var C = M.icand ? R.byId[M.icand] : null;
    var done = R.candidates.filter(function (c) { return c.scores; });
    var g = h('div', { class: 'pd-grid' });
    g.appendChild(h('div', { class: 'c12' }, [P.kpis([
      { label: '待面试', value: R.kpi.interviewing, unit: '人', tone: 'accent' }, { label: '已完成评分', value: done.length, unit: '人' },
      { label: '建议录用', value: done.filter(function (c) { return c.interview.verdict === 'hire'; }).length, unit: '人', tone: 'ok' }, { label: '备选', value: done.filter(function (c) { return c.interview.verdict === 'backup'; }).length, unit: '人', tone: 'risk' },
      { label: '已发 offer', value: R.kpi.offers, unit: '人', tone: 'ok' }, { label: '平均评分', value: done.length ? (Math.round(10 * done.reduce(function (t, c) { return t + c.interview.avg; }, 0) / done.length) / 10) : '—', sub: '满分 5 · ≥ 4.0 建议录用 · ≥ 3.2 备选' }
    ])]));
    var il = h('div', { class: 'pd-list' });
    list.forEach(function (c) { il.appendChild(P.item({ tone: c.stage === 'offer' ? 'ok' : c.stage === 'done' ? 'risk' : 'accent', icon: c.grade, title: c.id + ' · ' + c.jobTitle, sub: (c.interviewDate ? short(c.interviewDate) + ' · ' : '') + c.stageName + (c.interview ? ' · ' + c.interview.verdictName : ''), right: c.interview ? c.interview.avg + ' 分' : '待评', rightSub: c.offer ? fmtN(c.offer.salary) + ' 元' : '', onClick: function () { M.icand = c.id; M.scores = {}; draw(); } })); });
    if (!list.length) il.appendChild(P.empty('还没有面试安排，先在招聘屏通过初筛并安排面试'));
    g.appendChild(P.card({ cls: 'c4', title: '面试安排', sub: list.length + ' 人 · 按日期', body: [il] }));
    if (!C) { work.appendChild(g); return; }
    var kit = K.interviewKit(d, C, LIB), right = col('c8', []);
    var sc = C.scores ? C.scores : M.scores;
    var qs = h('div', { class: 'm5-qs' });
    kit.sets.forEach(function (set) {
      var pick = h('span', { class: 'pick' }, [1, 2, 3, 4, 5].map(function (v) { return h('button', { class: sc[set.key] === v ? 'on' : '', disabled: !!C.scores, onclick: function () { M.scores[set.key] = v; draw(); } }, [String(v)]); }));
      var ab = h('div', { class: 'ab' }, [h('div', { class: 'h' }, [h('span', {}, [set.label]), h('span', { class: 'w' }, ['权重 ' + Math.round(set.weight * 100) + '%']), h('span', { class: 'sp' }), h('span', { class: 'w' }, ['评分']), pick])]);
      set.questions.forEach(function (q) { ab.appendChild(h('div', { class: 'q' }, [h('div', { class: 't' }, [q.q]), h('div', { class: 'p' }, [q.probe]), h('div', { class: 'an' }, [['1', q.anchors['1']], ['3', q.anchors['3']], ['5', q.anchors['5']]].map(function (a) { return h('span', {}, [h('b', {}, [a[0] + ' 分']), a[1]]); }))])); });
      qs.appendChild(ab);
    });
    var ready = ['pro', 'coop', 'stable', 'value'].every(function (k) { return M.scores[k]; });
    if (C.interview) {
      var r = C.interview;
      var acts = h('div', { class: 'pd-actions' });
      if (C.stage === 'done') { acts.appendChild(h('div', { class: 'pd-action best' }, [h('div', { class: 't' }, [h('span', { class: 'rank' }, ['1']), r.verdict === 'hire' ? '发 offer · 月薪 ' + fmtN(r.suggested) + ' 元' : r.verdict === 'backup' ? '列为备选，视其他候选人再定' : '不建议录用']), r.verdict === 'no' ? P.btn('淘汰', { cls: 'sm', onClick: function () { commit(K.reject(d, C.id), C.id + ' 已淘汰'); } }) : P.btn(r.verdict === 'hire' ? '发 offer' : '仍发 offer', { cls: (r.verdict === 'hire' ? 'primary ' : '') + 'sm', onClick: function () { commit(K.offer(d, C.id, r.suggested, LIB), C.id + ' offer 已发，月薪 ' + fmtN(r.suggested) + ' 元'); } }), h('div', { class: 'd' }, [r.lowest + ' 得分最低（' + r.lowestScore + ' 分）' + (r.verdict === 'hire' ? '，入职后重点带教' : '，是主要顾虑')])])); }
      else if (C.stage === 'offer') acts.appendChild(h('div', { class: 'pd-action' }, [h('div', { class: 't' }, [h('span', { class: 'rank' }, ['·']), 'offer 已发 · 月薪 ' + fmtN(C.offer.salary) + ' 元 · ' + short(C.offer.date)]), P.chip('ok', '待入职'), h('div', { class: 'd' }, ['入职当天签合同、办参保；试用期按合同期限对应的法定上限'])]));
      right.appendChild(P.card({ title: '评分结果与录用建议', sub: '按岗位族权重加权 · 定薪在薪酬带内、不低于期望、按评分在内部同岗位中位上浮或下调', accent: true, body: [h('div', { class: 'm5-result' }, [
        h('div', {}, [P.radar({ axes: r.radar.map(function (x) { return { key: x.key, label: x.label }; }), values: r.radar.map(function (x) { return x.value; }), max: 5, size: 240 })]),
        h('div', { class: 'm5-vd' }, [h('div', { class: 'big' }, [h('b', { class: 'num' }, [String(r.avg)]), h('span', {}, ['/ 5 · ' + r.radar.map(function (x) { return x.label + ' ' + x.value; }).join(' · ')]), P.chip(r.verdict === 'hire' ? 'ok' : r.verdict === 'backup' ? 'risk' : 'late', r.verdictName)]),
          P.kv([['薪酬带', fmtN(r.band[0]) + '–' + fmtN(r.band[1]) + ' 元'], ['内部中位', fmtN(r.median) + ' 元'], ['候选人期望', fmtN(C.expected) + ' 元'], ['建议定薪', h('b', { class: 'num', style: 'color:var(--pa);font-size:16px' }, [fmtN(r.suggested) + ' 元 / 月'])]]),
          h('ul', { class: 'm5-ul' }, r.notes.map(function (t) { return h('li', {}, [t]); })), acts])
      ])] }));
    }
    right.appendChild(P.card({ title: '结构化题库与评分表 · ' + C.id + ' ' + C.jobTitle, sub: '面试官：' + kit.interviewers.join('、') + ' · 每项 1–5 分，按锚点打分 · ' + (C.interviewDate ? '面试 ' + short(C.interviewDate) : ''), body: [qs], foot: [C.scores ? P.chip('ok', '评分已录入 · 综合 ' + C.interview.avg + ' 分') : P.btn('录入评分', { cls: 'primary', disabled: !ready, onClick: function () { var s2 = clone(M.scores); M.scores = {}; commit(K.score(d, C.id, s2, LIB), C.id + ' 评分已录入，录用建议已生成'); } }), C.scores ? null : h('span', {}, [ready ? '四项已打分，可录入' : '四项都打分后可录入'])] }));
    g.appendChild(right);
    work.appendChild(g);
  }

  /* ---------- 屏 5 ---------- */
  function screenCompliance(work) {
    var R = M.R, d = M.data, comp = R.compliance, cal = R.calendar;
    work.classList.add('m5-compliance');
    if (!M.rule || !comp.items.some(function (i) { return i.id === M.rule; })) M.rule = (comp.open[0] || comp.items[0]).id;
    var I = comp.items.filter(function (i) { return i.id === M.rule; })[0];
    var g = h('div', { class: 'pd-grid' });
    g.appendChild(h('div', { class: 'c12' }, [P.kpis([
      { label: '待处理', value: comp.counts.open, unit: '项', tone: comp.counts.high ? 'late' : comp.counts.open ? 'risk' : 'ok', sub: '高 ' + comp.counts.high + ' · 中 ' + comp.counts.mid + ' · 低 ' + comp.counts.low },
      { label: '影响预计', value: W(comp.impact), tone: comp.impact ? 'late' : 'ok', sub: '补缴、赔偿与差额合计' },
      { label: '社保基数占工资', value: comp.socialBaseRatio, unit: '%', tone: comp.socialBaseRatio < 100 ? 'risk' : 'ok', sub: '与 AI CFO 风险 K10 同一口径' },
      { label: '加班超 36 小时', value: comp.overtimeOver, unit: '人', tone: comp.overtimeOver ? 'risk' : 'ok', sub: (+d.overtimeMonth.slice(5)) + ' 月考勤' },
      { label: '60 天内到期合同', value: comp.contractsDue60, unit: '份', tone: comp.contractsDue60 ? 'risk' : 'ok' },
      { label: '派遣占比', value: comp.dispatchRatio, unit: '%', tone: comp.dispatchRatio > 10 ? 'late' : 'ok', sub: '上限 10%' },
      { label: '已处置', value: comp.counts.handled, unit: '项', tone: 'ok', sub: '无问题 ' + comp.counts.clear + ' 项' }
    ])]));
    var tbl = P.table({ compact: true, cols: [
      { key: 'id', label: '规则', render: function (i) { return h('span', {}, [h('b', { class: 'id' }, [i.id + ' ' + i.name]), h('span', { class: 'sub' }, [i.cat + ' · ' + i.law])]); } },
      { key: 'severity', label: '严重度', render: function (i) { return sevChip(i.severity); } },
      { key: 'count', label: '涉及', align: 'r', sort: true, render: function (i) { return i.count ? i.count + ' 人' : '—'; } },
      { key: 'impact', label: '影响预计', align: 'r', sort: true, render: function (i) { return i.impact ? h('b', { class: i.status === 'open' ? 'neg' : '' }, [W(i.impact)]) : '—'; } },
      { key: 'status', label: '状态', render: function (i) { return P.chip(STATUS_TONE[i.status], STATUS_NAME[i.status] + (i.resolvedAt ? ' ' + short(i.resolvedAt) : '')); } },
      { key: 'action', label: '动作', render: function (i) { return i.status === 'open' ? P.btn(i.action.label, { cls: 'sm', onClick: function (e) { e.stopPropagation(); M.rule = i.id; commit(K.resolve(d, i.id, LIB), i.id + ' ' + i.action.label + (i.mode === 'fix' ? '，已写回花名册' : '，已进台账')); } }) : h('span', { class: 'sub' }, [i.action.label]); } }
    ], rows: comp.items, rowKey: function (i) { return i.id; }, activeKey: M.rule, onRow: function (i) { M.rule = i.id; draw(); } });
    g.appendChild(P.card({ cls: 'c7', title: '规则核对', sub: LIB.complianceRules.rules.length + ' 条 · 逐人核对花名册、工资表、考勤与社保申报表 · 点一行看涉及员工', tight: true, body: [tbl] }));
    var aff = h('div', { class: 'm5-aff' });
    I.affected.slice(0, 8).forEach(function (a) { aff.appendChild(h('div', { class: 'a' }, [h('b', {}, [a.id]), h('span', { class: 'd' }, [h('span', { class: 'j' }, [a.job + ' · ' + a.dept]), a.detail]), h('span', { class: 'num' }, [a.amount ? fmtN(a.amount) + ' 元' : ''])])); });
    if (I.affected.length > 8) aff.appendChild(h('div', { style: 'color:var(--pd-sub);font-size:12px' }, ['还有 ' + (I.affected.length - 8) + ' 人']));
    var acts = h('div', { class: 'pd-actions' });
    if (I.status === 'open') acts.appendChild(h('div', { class: 'pd-action best' }, [h('div', { class: 't' }, [h('span', { class: 'rank' }, ['1']), I.action.label]), P.btn(I.mode === 'fix' ? '执行并写回' : '进台账', { cls: 'primary sm', onClick: function () { commit(K.resolve(d, I.id, LIB), I.id + ' ' + I.action.label + (I.mode === 'fix' ? '，已写回花名册' : '，已进台账')); } }), h('div', { class: 'd' }, [I.action.desc])]));
    else acts.appendChild(h('div', { class: 'pd-action' }, [h('div', { class: 't' }, [h('span', { class: 'rank' }, ['·']), I.action.label]), P.chip(STATUS_TONE[I.status], STATUS_NAME[I.status]), h('div', { class: 'd' }, [I.status === 'clear' ? '本次核对未发现问题' : I.action.desc])]));
    g.appendChild(col('c5', [P.card({ title: I.id + ' ' + I.name, sub: I.cat + ' · ' + I.law, accent: true, body: [
      P.judge({ verdict: { tone: I.status !== 'open' ? 'ok' : SEV[I.severity] === 'watch' ? 'risk' : SEV[I.severity], chip: I.status === 'open' ? SEV_NAME[I.severity] + '风险' : STATUS_NAME[I.status], text: I.desc }, seen: ['涉及 ' + I.count + ' 人 · 影响预计 ' + W(I.impact), '口径：' + I.impactNote, '依据：' + I.law], reasons: I.affected.length ? I.affected.slice(0, 3).map(function (a) { return a.id + ' ' + a.job + '：' + a.detail; }) : ['本次核对未命中'], actionsEl: acts, actionsTitle: '整改' }),
      I.affected.length ? h('div', { style: 'margin-top:12px;font-weight:700' }, ['涉及员工 ' + I.count + ' 人']) : null, I.affected.length ? aff : null
    ] })]));
    // 日历
    var kf = M.calKind, pass = function (it) { return !kf || it.kind === kf; };
    var weeks = cal.weeks.map(function (w) { return { w: w.w, start: w.start, end: w.end, label: w.label, items: w.items.filter(pass) }; });
    var kinds = [['contract', '合同到期'], ['probation', '试用期届满'], ['need', '到岗期限'], ['interview', '面试'], ['leave', '哺乳期结束']];
    var kchips = h('div', { class: 'chips' }, [h('button', { class: !kf ? 'on' : '', onclick: function () { M.calKind = null; draw(); } }, ['全部 ' + cal.counts.total])].concat(kinds.filter(function (x) { return cal.items.some(function (i) { return i.kind === x[0]; }); }).map(function (x) { return h('button', { class: kf === x[0] ? 'on' : '', onclick: function () { M.calKind = M.calKind === x[0] ? null : x[0]; draw(); } }, [x[1] + ' ' + cal.items.filter(function (i) { return i.kind === x[0]; }).length]); })));
    var legend = h('div', { class: 'legend' }, kinds.map(function (x) { return h('span', {}, [h('i', {}, [P.KIND_ICON[x[0]]]), x[1]]); }).concat([h('span', { style: 'margin-left:auto' }, [P.chip('late', '逾期'), ' ', P.chip('risk', '临近'), ' ', P.chip('ok', '正常'), ' ', P.chip('accent', '到岗'), ' ', P.chip('handled', '面试')])]));
    g.appendChild(P.card({ cls: 'c12', title: '90 天人事日历', sub: short(d.weekStart) + ' 起 13 周 · 30 天内 ' + cal.due30.length + ' 项' + (cal.overdue.length ? ' · 逾期 ' + cal.overdue.length + ' 项' : ''), extra: [kchips], body: [P.weekGrid({ weeks: weeks, today: d.today, maxItems: 2, onItem: function (it) { if (it.kind === 'interview') { M.icand = it.ref; setStep('interview'); } else if (it.kind === 'need') { M.need = it.ref; setStep('recruit'); } else { M.rule = it.kind === 'contract' ? 'H02' : it.kind === 'leave' ? 'H10' : 'H03'; draw(); } } })], foot: [legend] }));
    work.appendChild(g);
  }

  /* ---------- 屏 6 ---------- */
  function screenCost(work) {
    var R = M.R, d = M.data, C = R.cost, S = R.sim, k = R.kpi;
    work.classList.add('m5-cost');
    if (!M.plan) M.plan = d.plan || 'B';
    var Pn = S.plans.filter(function (p) { return p.key === M.plan; })[0];
    var g = h('div', { class: 'pd-grid' });
    g.appendChild(h('div', { class: 'c12' }, [P.kpis([
      { label: '月用工成本', value: W(C.monthly), sub: '工资 + 社保 + 公积金 + 福利' }, { label: '年化用工成本', value: W0(C.annual), sub: '含招聘、培训、流失' },
      { label: '占收入', value: C.share, unit: '%', tone: C.share > C.bench[1] ? 'risk' : 'ok', sub: '参考 ' + C.bench[0] + '–' + C.bench[1] + '%' },
      { label: '人均成本', value: W(C.perCapitaCost), sub: '年化 ÷ 在编' }, { label: '人均产值', value: W(C.perCapitaRevenue), tone: 'accent' },
      { label: '社保基数差', value: W(S.socialDelta), unit: '/ 月', tone: S.socialDelta ? 'risk' : 'ok', sub: S.socialDelta ? '按实际工资申报后每月增加' : '基数已按实际工资' },
      { label: '招聘与培训', value: W(C.recruiting + C.training), sub: '近 12 个月 ' + C.hires12 + ' 人入职' }, { label: '流失成本', value: W(C.turnoverCost), sub: '离职 ' + d.leavers.length + ' 人 × 1 个月工资' }
    ])]));
    g.appendChild(P.card({ cls: 'c5', title: '成本结构', sub: '年化 ' + W(C.annual), body: [P.dist({ rows: C.structure.map(function (x) { return { label: x.label, value: x.value, text: W(x.value), hi: x.label === '工资' }; }) }), h('div', { style: 'margin-top:10px' }, [P.kv([['社保单位费率', Math.round(C.rates.social * 1000) / 10 + '%'], ['公积金单位费率', Math.round(C.rates.fund * 100) + '%'], ['社保基数合计', W(C.socialBase) + ' / 月'], ['工资合计', W(C.wages) + ' / 月']])])] }));
    var colors = { base: '#98A2B8', A: '#4974F6', B: '#0B8FA8', C: '#E8A33D' };
    g.appendChild(P.card({ cls: 'c7', title: '12 个月用工成本走势', sub: '三方案较现状的差额 · 万元 / 月 · 现状每月 ' + W(C.monthly) + ' · 一次性招聘培训计入到岗当月', body: [P.lineChart({ labels: S.labels, right: true, series: [{ values: S.base.map(function () { return 0; }), color: colors.base, fmt: function () { return '现状'; } }].concat(S.plans.map(function (p) { return { values: p.months.map(function (m, i) { return Math.round((m.cost - S.base[i].cost) / 1000) / 10; }), color: colors[p.key], fmt: function (v) { return (v >= 0 ? '+' : '−') + Math.abs(v) + ' 万'; } }; })), height: 230, width: 900 }), h('div', { class: 'pd-legend', style: 'margin-top:8px' }, [h('span', {}, [h('i', { style: 'background:' + colors.base }), '现状'])].concat(S.plans.map(function (p) { return h('span', {}, [h('i', { style: 'background:' + colors[p.key] }), p.key + ' ' + p.name]); })))] }));
    g.appendChild(P.card({ cls: 'c12', title: '编制三方案', sub: '12 个月用工成本 · 点方案看逐月明细 · 采纳后进月报', body: [P.compare({ active: M.plan, onPick: function (key) { M.plan = key; draw(); }, options: S.plans.map(function (p) { return { key: p.key, name: p.name, recommended: p.recommended, headline: { big: W(p.total12), sub: (p.delta >= 0 ? '+' : '−') + W(Math.abs(p.delta)) + ' 较现状', tone: p.key === 'C' ? 'ok' : '' }, rows: [{ k: '期末在编', v: p.endHeadcount + ' 人' }, { k: '新增招聘', v: p.hires + ' 人' }, { k: '缺编', v: p.vacancyAfter + ' 人', tone: p.vacancyAfter > 0 ? 'bad' : 'good' }, { k: '用工占收入', v: p.share + '%' }, { k: '人均产值', v: W(p.perCapitaRevenue) }, { k: '加班超限', v: p.overtime.split('，')[0].slice(0, 14), tone: p.key === 'C' ? 'bad' : 'good' }], notes: p.compliance + '。' + p.notes.join('；') }; }) })], foot: [d.plan === M.plan ? P.chip('ok', '已采纳 ' + M.plan) : P.btn('采纳方案 ' + M.plan, { cls: 'primary', onClick: function () { commit(K.adoptPlan(d, M.plan, LIB), '已采纳方案 ' + M.plan + '，月报已更新'); } }), h('span', {}, [Pn.risk === 'low' ? '风险低：缺编与合规一并处理' : Pn.risk === 'mid' ? '风险中：社保基数敞口仍在' : '风险高：加班超限与缺编持续，交付延期风险'])] }));
    var mt = P.table({ compact: true, cols: [{ key: 'label', label: '月份' }, { key: 'headcount', label: '在编', align: 'r' }, { key: 'cost', label: '用工成本', align: 'r', render: function (r) { return W(r.cost); } }, { key: 'delta', label: '较现状', align: 'r', render: function (r) { return h('span', { class: r.delta > 0 ? 'neg' : r.delta < 0 ? 'pos' : '' }, [(r.delta >= 0 ? '+' : '−') + W(Math.abs(r.delta))]); } }], rows: Pn.months.map(function (m, i) { return { label: S.labels[i], headcount: m.headcount, cost: m.cost, delta: m.cost - S.base[i].cost }; }) });
    g.appendChild(P.card({ cls: 'c8', title: '方案 ' + Pn.key + ' 逐月明细', sub: Pn.name + ' · ' + Pn.desc, tight: true, body: [h('div', { class: 'pd-scroll', style: 'max-height:380px' }, [mt])] }));
    var who = h('div', { class: 'who' });
    ['总经理', '财务负责人', '各部门负责人'].forEach(function (w, i) { who.appendChild(h('button', { class: i === M.who ? 'on' : '', onclick: function () { M.who = i; draw(); } }, [w])); });
    g.appendChild(P.card({ cls: 'c4', title: '人力月报', sub: d.today.slice(0, 7).replace('-', ' 年 ') + ' 月 · 微信文本版', body: [h('div', { class: 'pd-field' }, [h('label', {}, ['收件人']), who]), h('div', { class: 'pd-pre', style: 'margin-top:10px;max-height:300px;overflow:auto' }, [R.report.text])], foot: [P.btn('发送到微信', { cls: 'primary', onClick: function () { sh.setQrReady(true); sh.showWeChat(); } }), P.btn('回到驾驶舱', { onClick: function () { setStep('board'); } })] }));
    work.appendChild(g);
  }

  window.DGG = window.DGG || {};
  window.DGG.registerModule('m5', { mount: mount, unmount: unmount, onCompany: onCompany, onIndustry: onIndustry });
})();
