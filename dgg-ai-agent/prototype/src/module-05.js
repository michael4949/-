/* AI人力官 · 接入 / 人力驾驶舱 / 招聘 · JD 与简历 / 面试与录用 / 用工合规 / 成本与编制（六屏）
 * 每屏三拍：来源块亮起 → 数据包进处理块 → 数字滚动、图形画出、明细流入 → 一句结论推上来
 * 计算全部走 DGG.coreM5（与 skill 同一份内核）；发布 / 初筛 / 面试 / 评分 / offer / 整改 / 采纳方案都写回同一份数据
 * 纯预制、断网可用；不用任何存储 API
 */
(function () {
  'use strict';
  var sh, $root, h, DATA, P, K, LIB;
  var ACCENT = window.DGG.PALETTE.m5;
  var CAPS = [['招聘 · JD 与简历', 'JD · 简历打分'], ['面试与录用', '题库 · 评分 · 定薪'], ['用工合规', '12 条规则 · 人事日历'], ['成本与编制', '成本结构 · 三方案']];
  var GRADE = { A: 'ok', B: 'handled', C: 'risk', D: 'done' }, GRADE_NAME = { A: 'A 级', B: 'B 级', C: 'C 级', D: '不满足' };
  var STAGE_TONE = { new: 'watch', screened: 'handled', interview: 'accent', done: 'risk', offer: 'ok', hired: 'ok', rejected: 'done' };
  var SEV = { high: 'late', mid: 'risk', low: 'watch' }, SEV_NAME = { high: '高', mid: '中', low: '低' };
  var STATUS_TONE = { open: 'late', handled: 'ok', planned: 'handled', clear: 'done' }, STATUS_NAME = { open: '待处理', handled: '已整改', planned: '已进台账', clear: '无问题' };
  var M = { step: 'connect', arche: null, data: null, R: null, need: null, cand: null, filter: null, jdVariant: 'site', icand: null, scores: {}, rule: null, calKind: null, plan: null, charged: false, name: null, company: null, frame: null, who: 0, replay: null, told: null };

  function anim() { return window.DGG.anim; }
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
  function mon() { return +M.data.overtimeMonth.slice(5); }
  function cut(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n) + '…' : s; }

  /* ---------- 动画件 ---------- */
  function cnt(to, o) {
    o = o || {};
    var dec = o.dec || 0;
    return h('b', { class: 'm5-cnt num', 'data-to': String(to), 'data-dec': String(dec), 'data-suf': o.suf || '' }, [dec ? (0).toFixed(dec) : '0']);
  }
  function cw(n) { return Math.abs(n) >= 10000 ? cnt(Math.round(n / 1000) / 10, { dec: 1, suf: ' 万元' }) : cnt(Math.round(n), { suf: ' 元' }); }
  function cw0(n) { return Math.abs(n) >= 1000000 ? cnt(Math.round(n / 10000), { suf: ' 万元' }) : cw(n); }
  function runCounts(scope, ms) {
    Array.prototype.forEach.call(scope.querySelectorAll('.m5-cnt'), function (e) {
      anim().count(e, parseFloat(e.getAttribute('data-to')) || 0, { decimals: +e.getAttribute('data-dec') || 0, unit: e.getAttribute('data-suf') || '', ms: ms || 900 });
    });
  }
  function vd(text) { return h('div', { class: 'm5-say off' }, [h('span', { class: 'ic' }, ['AI']), h('b', {}, [text])]); }
  function grid() { return h('div', { class: 'pd-grid m5-g' }); }
  function flowBar(o) {
    var srcWrap = h('div', { class: 'src' }, o.src.map(function (s) { return h('div', { class: 's' }, [h('b', {}, [s[0]]), h('span', {}, [s[1]])]); }));
    var hub = h('div', { class: 'hub' }, [h('span', { class: 'an-live' }), h('b', {}, [o.hub])]);
    var out = h('div', { class: 'out' }, [h('b', {}, [o.out[0]]), h('span', {}, [o.out[1]])]);
    var el = h('div', { class: 'c12 m5-flow' }, [srcWrap, h('span', { class: 'pipe an-pipe' }), hub, h('span', { class: 'pipe an-pipe' }), out, h('span', { class: 'sp' }),
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
    var first = M.told !== M.step;
    M.told = M.step;
    M.replay = function () { run(true); };
    run(first);
  }
  function bars(work, sel) { return Array.prototype.slice.call(work.querySelectorAll(sel)); }
  function trs(el) { return el ? Array.prototype.slice.call(el.querySelectorAll('tbody tr')) : []; }
  function refocus(txt, ms) {
    setTimeout(function () { var el = rowOf(workEl(), txt); if (el) anim().pulse(el, { ms: 2200, scroll: true }); }, ms || 80);
  }
  function rowOf(scope, txt) {
    var list = scope.querySelectorAll('.pd-table tbody tr'), i;
    for (i = 0; i < list.length; i++) if (list[i].textContent.indexOf(txt) >= 0) return list[i];
    return null;
  }

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
  function unmount() { M.replay = null; }
  function onCompany(c) { M.company = c; M.name = c ? c.name : null; M.charged = false; loadArche(c ? archeOf(c.industry) : archeOf(sh.displayIndustryDefault())); if (M.step !== 'connect') setStep('connect'); else draw(); }
  function onIndustry(slug) { if (M.step !== 'connect' || !slug) return; var a = archeOf(slug); if (a !== M.arche) { loadArche(a); draw(); } }
  function setStep(s) { M.step = s; sh.go('m5', s); }

  function draw() {
    sh.clear($root);
    M.replay = null;
    var R = M.R, c = M.company, k = R.kpi;
    var meta = c ? [sh.industryNameOf(c.industry), sh.optText('size', c.size)].filter(Boolean).join(' · ') : '';
    var tabs = [{ key: 'connect', label: '接入' }, { key: 'board', label: '人力驾驶舱' }, { key: 'recruit', label: '招聘 · JD 与简历', badge: k.candidates ? R.candidates.filter(function (x) { return x.stage === 'new' && x.grade !== 'D'; }).length : 0 }, { key: 'interview', label: '面试与录用', badge: k.interviewing || 0 }, { key: 'compliance', label: '用工合规', badge: k.complianceOpen || 0 }, { key: 'cost', label: '成本与编制' }];
    var F = P.frame({ mark: '人力', accent: ACCENT, modules: P.navModules('m5'), crumbs: ['AI人力官', tabs.filter(function (t) { return t.key === M.step; })[0].label], company: { name: M.data.company, meta: meta }, tabs: tabs, active: M.step, chat: { id: 'm5', name: 'AI人力官', step: M.step, onGo: setStep },
      onTab: function (key) { if (key === 'board' && !M.charged) enterBoard(); else setStep(key); } });
    M.frame = F; $root.appendChild(F.root);
    if (M.step === 'board' && !M.charged) { M.charged = true; sh.charge(K.CREDITS); }
    ({ connect: screenConnect, board: screenBoard, recruit: screenRecruit, interview: screenInterview, compliance: screenCompliance, cost: screenCost })[M.step](F.work);
  }
  function enterBoard() { setStep('board'); }
  function col(cls, kids) { return h('div', { class: cls, style: 'display:flex;flex-direction:column;gap:16px' }, kids); }
  function gradeChip(g) { return P.chip(GRADE[g], GRADE_NAME[g]); }
  function stageChip(c) { return P.chip(STAGE_TONE[c.stage] || 'watch', c.stageName); }
  function sevChip(s) { return P.chip(SEV[s], SEV_NAME[s] + '风险'); }
  function needBlock(n, on, onClick, full) {
    if (!on && !full) return h('button', { class: 'nd slim', onclick: onClick }, [
      h('div', { class: 'hd' }, [h('span', {}, [n.title]), h('span', { class: 'sp' }), h('span', { class: 'n' }, [n.count + ' 人 · 候选 ' + n.active]), P.chip(n.status === 'published' ? 'ok' : 'watch', n.status === 'published' ? '已发布' : '未发布')])
    ]);
    return h('button', { class: 'nd' + (on ? ' on' : ''), onclick: onClick }, [
      h('div', { class: 'hd' }, [h('span', {}, [n.title]), h('span', { class: 'sp' }), P.chip(n.status === 'published' ? 'ok' : 'watch', n.status === 'published' ? '已发布' : '未发布')]),
      h('div', { class: 'kv' }, [h('span', {}, [n.count + ' 人 · ' + n.deptName]), h('span', {}, ['到岗 ' + short(n.dueDate) + '（' + n.dueDays + ' 天）']), h('span', {}, [fmtN(n.band[0]) + '–' + fmtN(n.band[1]) + ' 元'])]),
      h('div', { class: 'm5-stages' }, [['new', '新简历'], ['screened', '初筛'], ['interview', '面试'], ['done', '完成'], ['offer', 'offer']].map(function (s) { return h('span', { class: 'st' + (n.stages[s[0]] ? ' has' : '') }, [h('b', {}, [String(n.stages[s[0]])]), s[1]]); }))
    ]);
  }
  function currentNeed() { var R = M.R; if (!M.need || !R.needs.some(function (n) { return n.id === M.need; })) M.need = R.needs[0].id; return R.needs.filter(function (n) { return n.id === M.need; })[0]; }
  function topDept() { var l = M.R.org.byDept.slice().sort(function (a, b) { return (b.overtimeOver - a.overtimeOver) || (b.vacancy - a.vacancy); }); return l[0]; }
  function topRule() { var o = M.R.compliance.open; return o.length ? o[0] : M.R.compliance.items[0]; }
  function topCand() { var n = currentNeed(); var l = M.R.candidates.filter(function (c) { return c.needId === n.id && c.stage !== 'rejected'; }); return l[0]; }

  /* ---------- 屏 1 · 接入 ---------- */
  function screenConnect(work) {
    var d = M.data, R = M.R, k = R.kpi, pf = d.profile, C = R.cost;
    work.classList.add('m5-connect');
    var g = grid();
    var F = flowBar({ src: [['花名册', k.headcount + ' 人'], ['工资表', mon() + ' 月'], ['考勤', mon() + ' 月'], ['简历', d.candidates.length + ' 份']], hub: 'AI人力官', out: ['已开通 4 项', '岗位库 ' + Object.keys(LIB.jobs.jobs).length + ' 个'], btn: '重新同步' });
    g.appendChild(F);
    var nameIn = h('input', { type: 'text', value: d.company, oninput: function (e) { M.name = e.target.value; d.company = e.target.value; var co = M.frame.root.querySelector('.pd-top .co span:nth-child(2)'); if (co) co.textContent = e.target.value; } });
    var cCo = P.card({ cls: 'c4', title: '企业', body: [h('div', { class: 'pd-form' }, [
      h('div', { class: 'pd-field' }, [h('label', {}, ['企业名称']), nameIn]),
      h('div', { class: 'pd-field' }, [h('label', {}, ['行业']), h('div', { style: 'font-weight:600' }, [M.company ? sh.industryNameOf(M.company.industry) + (M.company.size ? ' · ' + sh.optText('size', M.company.size) : '') : sh.industryNameOf(sh.displayIndustryDefault())])]),
      h('div', { class: 'pd-field' }, [h('label', {}, ['组织']), h('div', { style: 'font-weight:600' }, [h('span', { class: 'm5-big' }, [cnt(k.headcount)]), ' / ' + k.budget + ' 人 · ' + d.departments.length + ' 个部门 · ' + pf.city])]),
      h('div', { class: 'pd-field' }, [h('label', {}, ['工资与基数']), h('div', { style: 'font-weight:600' }, [W(C.wages) + ' / 月 · 基数 ' + W(C.socialBase) + ' / 月'])])
    ])] });
    g.appendChild(cCo);
    var srcs = h('div');
    d.sources.forEach(function (s) { srcs.appendChild(h('div', { class: 'src-row' }, [h('div', {}, [h('div', { class: 't' }, [s.name]), h('div', { class: 's' }, [s.lastSync + ' · ' + fmtN(s.rows) + ' 条'])]), P.chip(s.mode === 'direct' ? 'ok' : 'watch', s.mode === 'direct' ? '系统直连' : '表格导入'), h('span', { class: 'pd-dot ' + (s.mode === 'direct' ? 'ok' : 'risk') })])); });
    var cSrc = P.card({ cls: 'c4', title: '数据源', sub: d.sources.length + ' 个', body: [srcs] });
    g.appendChild(cSrc);
    var caps = h('div');
    CAPS.forEach(function (c, i) { caps.appendChild(h('div', { class: 'cap-row' }, [h('span', { class: 'ic' }, ['0' + (i + 1)]), h('div', {}, [h('div', { class: 't' }, [c[0]]), h('div', { class: 's' }, [c[1]])]), P.chip('ok', '已开通')])); });
    var cCap = P.card({ cls: 'c4', title: '已开通能力', sub: '4 项', body: [caps] });
    g.appendChild(cCap);
    var say = vd('社保申报基数 ' + W(C.socialBase) + ' / 月，工资表 ' + W(C.wages) + ' / 月，差 ' + W(C.wages - C.socialBase) + '。');
    g.appendChild(h('div', { class: 'c12' }, [say]));
    g.appendChild(h('div', { class: 'c12 go' }, [h('div', {}, [h('div', { class: 't' }, ['人力驾驶舱']), h('div', { class: 's' }, ['在编 ' + k.headcount + ' / 编制 ' + k.budget + ' · 在招 ' + k.needCount + ' 人 · 合规待处理 ' + k.complianceOpen + ' 项 · 30 天内到期 ' + k.due30 + ' 项'])]), h('div', { class: 'sp' }), h('div', { class: 'cr' }, [h('b', { class: 'num' }, [String(K.CREDITS)]), ' 积分 / 次']), P.btn('进入人力驾驶舱', { cls: 'primary big', onClick: enterBoard })]));
    work.appendChild(g);
    var rows = Array.prototype.slice.call(srcs.children);
    story({ work: work, src: F.srcs, from: F.srcWrap, to: F.hub, label: fmtN(k.headcount) + ' 条', rise: [cCo, cSrc, cCap].concat(rows), verdict: say, focus: rows[rows.length - 1] });
  }

  /* ---------- 屏 2 · 人力驾驶舱 ---------- */
  function screenBoard(work) {
    var R = M.R, k = R.kpi, d = M.data, O = R.org, comp = R.compliance;
    work.classList.add('m5-board');
    var g = grid();
    var F = flowBar({ src: [['花名册', k.headcount + ' 人'], ['工资表', mon() + ' 月'], ['考勤', mon() + ' 月'], ['需求单', k.needs + ' 张']], hub: '人力驾驶舱', out: ['待处理 ' + k.complianceOpen + ' 项', '影响预计 ' + W(k.complianceImpact)], btn: '刷新看板' });
    g.appendChild(F);
    g.appendChild(h('div', { class: 'c12' }, [P.kpis([
      { label: '在编 / 编制', value: cnt(k.headcount), unit: '/ ' + k.budget, sub: '缺编 ' + k.vacancy + ' · 派遣 ' + O.dispatch, tone: k.vacancy ? 'risk' : 'ok' },
      { label: '在招', value: cnt(k.needCount), unit: '人', tone: 'accent', sub: k.needs + ' 张需求单', onClick: function () { M.filter = null; setStep('recruit'); } },
      { label: '候选人', value: cnt(k.candidates), unit: '人', sub: 'A 级 ' + k.gradeA + ' · 面试 ' + k.interviewing, onClick: function () { M.filter = 'A'; setStep('recruit'); } },
      { label: '近 12 月离职率', value: cnt(k.turnover), unit: '%', tone: k.turnover > k.turnoverBench + 3 ? 'late' : k.turnover > k.turnoverBench ? 'risk' : 'ok', sub: '参考 ' + k.turnoverBench + '% · ' + O.leavers12 + ' 人' },
      { label: '用工成本占收入', value: cnt(k.laborShare, { dec: 1 }), unit: '%', tone: k.laborShare > k.laborBench[1] ? 'risk' : 'ok', sub: '参考 ' + k.laborBench[0] + '–' + k.laborBench[1] + '% · 年化 ' + W0(k.annualCost), onClick: function () { setStep('cost'); } },
      { label: '合规待处理', value: cnt(k.complianceOpen), unit: '项', tone: k.complianceHigh ? 'late' : k.complianceOpen ? 'risk' : 'ok', sub: '高 ' + k.complianceHigh + ' · 影响预计 ' + W(k.complianceImpact), onClick: function () { M.rule = null; setStep('compliance'); } }
    ])]));
    var dep = topDept();
    var say = vd(dep.name + '缺编 ' + dep.vacancy + ' 人、' + dep.overtimeOver + ' 人 ' + mon() + ' 月加班超 36 小时；合规待处理 ' + k.complianceOpen + ' 项，影响预计 ' + W(k.complianceImpact) + '。');
    g.appendChild(h('div', { class: 'c12' }, [say]));
    var tbl = P.table({ compact: true, cols: [
      { key: 'name', label: '部门', render: function (x) { return h('b', {}, [x.name]); } },
      { key: 'headcount', label: '在编', align: 'r', sort: true },
      { key: 'vacancy', label: '缺编', align: 'r', sort: true, sortDesc: true, render: function (x) { return h('span', { class: x.vacancy > 0 ? 'neg' : '' }, [String(x.vacancy)]); } },
      { key: 'turnover', label: '离职 12 月', align: 'r', sort: true, render: function (x) { return x.leavers12 + ' 人 · ' + x.turnover + '%'; } },
      { key: 'overtimeOver', label: '加班超限', align: 'r', sort: true, render: function (x) { return x.overtimeOver ? h('span', { class: 'neg' }, [x.overtimeOver + ' 人']) : '—'; } },
      { key: 'needs', label: '在招', align: 'r', render: function (x) { return x.needs ? P.chip('accent', x.needs + ' 人') : '—'; } }
    ], rows: O.byDept, rowKey: function (x) { return x.id; } });
    var cDept = P.card({ cls: 'c7', title: '部门盘点', sub: d.departments.length + ' 个 · 平均工资 ' + fmtN(O.avgWage) + ' 元', tight: true, body: [h('div', { class: 'pd-scroll', style: 'max-height:250px' }, [tbl])] });
    g.appendChild(cDept);
    var needs = h('div', { class: 'm5-needs' });
    R.needs.forEach(function (n) { needs.appendChild(needBlock(n, false, function () { M.need = n.id; M.filter = null; setStep('recruit'); }, true)); });
    var cNeed = P.card({ cls: 'c5', title: '招聘进度', sub: k.needs + ' 张 · ' + k.needCount + ' 人', body: [needs] });
    g.appendChild(cNeed);
    var risks = h('div', { class: 'pd-list' });
    comp.open.slice(0, 5).forEach(function (i) { risks.appendChild(P.item({ tone: SEV[i.severity] === 'watch' ? 'hand' : SEV[i.severity], icon: i.id.slice(1), title: i.name, sub: i.cat, right: i.count + ' 人', rightSub: '预计 ' + W(i.impact), onClick: function () { M.rule = i.id; setStep('compliance'); } })); });
    if (!comp.open.length) risks.appendChild(P.empty('无待处理合规问题'));
    var cRisk = P.card({ cls: 'c4', title: '合规风险榜', sub: '待处理 ' + comp.counts.open + ' 项', body: [risks], extra: [P.btn('全部', { cls: 'sm', onClick: function () { M.rule = null; setStep('compliance'); } })] });
    g.appendChild(cRisk);
    var lc = P.lineChart({ labels: O.leaversByMonth.map(function (x) { return x.label; }), series: [{ values: O.leaversByMonth.map(function (x) { return x.count; }), color: '#D9483B', fmt: function (v) { return v + ' 人'; } }], height: 118, width: 420 });
    var cLeave = P.card({ cls: 'c4', title: '离职', sub: '近 12 个月 ' + O.leavers12 + ' 人', body: [lc, P.dist({ rows: O.reasons.slice(0, 4).map(function (x) { return { label: x.label, value: x.value, text: x.value + ' 人' }; }) })] });
    g.appendChild(cLeave);
    var cTen = P.card({ cls: 'c4', title: '司龄', sub: '平均 ' + O.avgTenure + ' 年', body: [P.dist({ rows: O.tenure.map(function (x) { return { label: x.label, value: x.value, text: x.value + ' 人', hi: x.label === '1 年以内' }; }) })] });
    g.appendChild(cTen);
    work.appendChild(g);
    story({ work: work, src: F.srcs, from: F.srcWrap, to: F.hub, label: fmtN(k.headcount) + ' 条',
      rise: [cDept, cNeed, cRisk, cLeave, cTen].concat(Array.prototype.slice.call(needs.children)),
      rows: trs(tbl), bars: bars(work, '.pd-dist .trk i'), paths: bars(work, '.pd-line path'),
      verdict: say, focus: rowOf(work, dep.name) });
  }

  /* ---------- 屏 3 · 招聘 · JD 与简历 ---------- */
  function jdDrawer(J) {
    var doc = h('div', { class: 'pd-doc m5-jd' });
    doc.appendChild(h('div', { class: 'title' }, [J.title, h('span', { class: 'd' }, [J.variantName + ' · ' + J.words + ' 字'])]));
    J.sections.forEach(function (s) { doc.appendChild(h('div', { class: 'sec' }, [h('h4', {}, [s.title]), s.lines.length > 1 ? h('ol', {}, s.lines.map(function (l) { return h('li', {}, [l]); })) : h('p', { class: 'm5-p' }, [s.lines[0]])])); });
    P.drawer(M.frame.body, { title: J.title, sub: J.variantName + ' · ' + J.words + ' 字', body: [doc], actions: [P.btn('发送到微信', { cls: 'primary', onClick: function () { sh.setQrReady(true); sh.showWeChat(); } })] });
  }
  function screenRecruit(work) {
    var R = M.R, d = M.data, n = currentNeed(), f = M.filter;
    work.classList.add('m5-recruit');
    var all = R.candidates.filter(function (c) { return c.needId === n.id; });
    var shown = all.filter(function (c) { return f === 'A' ? c.grade === 'A' : f === 'new' ? c.stage === 'new' : f === 'interview' ? c.stage === 'interview' || c.stage === 'done' : f === 'offer' ? c.stage === 'offer' : f === 'fail' ? c.grade === 'D' : c.stage !== 'rejected'; });
    if (!M.cand || !shown.some(function (c) { return c.id === M.cand; })) M.cand = (shown[0] || all[0]).id;
    var C = R.byId[M.cand];
    var g = grid();
    var F = flowBar({ src: [['需求单', R.needs.length + ' 张'], ['岗位库', Object.keys(LIB.jobs.jobs).length + ' 个'], ['简历', d.candidates.length + ' 份']], hub: 'JD 与打分', out: [n.title + ' ' + all.length + ' 份', 'A 级 ' + all.filter(function (c) { return c.grade === 'A' && c.stage !== 'rejected'; }).length + ' 人'], btn: '重新打分' });
    g.appendChild(F);
    var filt = function (key) { return function () { M.filter = M.filter === key ? null : key; draw(); }; };
    g.appendChild(h('div', { class: 'c12' }, [P.kpis([
      { label: '需求单', value: cnt(R.needs.length), unit: '张', sub: R.kpi.needCount + ' 人 · 已发布 ' + R.kpi.published },
      { label: n.title + ' 候选', value: cnt(all.filter(function (c) { return c.stage !== 'rejected'; }).length), unit: '人', onClick: filt(null), active: !f },
      { label: 'A 级', value: cnt(all.filter(function (c) { return c.grade === 'A' && c.stage !== 'rejected'; }).length), unit: '人', tone: 'ok', onClick: filt('A'), active: f === 'A' },
      { label: '待初筛', value: cnt(all.filter(function (c) { return c.stage === 'new'; }).length), unit: '人', tone: 'risk', onClick: filt('new'), active: f === 'new' },
      { label: '面试中', value: cnt(all.filter(function (c) { return c.stage === 'interview' || c.stage === 'done'; }).length), unit: '人', tone: 'accent', onClick: filt('interview'), active: f === 'interview' },
      { label: '不满足硬条件', value: cnt(all.filter(function (c) { return c.grade === 'D'; }).length), unit: '人', onClick: filt('fail'), active: f === 'fail' }
    ])]));
    var top = all.filter(function (c) { return c.stage !== 'rejected'; })[0] || all[0];
    var say = vd(n.title + ' ' + n.count + ' 人 · ' + short(n.dueDate) + ' 到岗，候选 ' + all.filter(function (c) { return c.stage !== 'rejected'; }).length + ' 人 / A 级 ' + all.filter(function (c) { return c.grade === 'A' && c.stage !== 'rejected'; }).length + '；' + top.id + ' 匹配 ' + top.total + ' 分，期望 ' + fmtN(top.expected) + ' 元在带内。');
    g.appendChild(h('div', { class: 'c12' }, [say]));
    var needs = h('div', { class: 'm5-needs' });
    R.needs.forEach(function (x) { needs.appendChild(needBlock(x, x.id === n.id, function () { M.need = x.id; M.cand = null; M.filter = null; draw(); })); });
    var cNeed = P.card({ cls: 'c4', title: '需求单', body: [needs] });
    g.appendChild(cNeed);
    var J = K.jd(d, n.id, LIB, M.jdVariant);
    var lab = function (arr) { return (arr || []).map(function (k2) { return LIB.jobs.skills[k2] || LIB.jobs.certs[k2] || k2; }); };
    var JB = LIB.jobs.jobs[n.job] || {};
    var jc = h('div', { class: 'm5-jdc' }, [
      h('div', { class: 't' }, [J.title, h('span', { class: 'd' }, [fmtN(J.band[0]) + '–' + fmtN(J.band[1]) + ' 元 / 月'])]),
      h('div', { class: 'meta' }, [n.deptName + ' · ' + (JB.shift || '标准工时') + ' · 到岗 ' + short(n.dueDate) + '（' + n.dueDays + ' 天）']),
      h('div', { class: 'ln' }, [h('i', {}, ['职责']), h('span', {}, [cut((J.sections[1] && J.sections[1].lines[0]) || '', 30)])]),
      h('div', { class: 'ln' }, [h('i', {}, ['要求']), h('span', {}, [(LIB.jobs.edu[JB.edu] || '') + '及以上 · ' + JB.yearsMin + ' 年以上经验'])]),
      h('div', { class: 'ln' }, [h('i', {}, ['待遇']), h('span', {}, [cut((J.sections[J.sections.length - 2] || J.sections[0]).lines[0], 30)])]),
      h('div', { class: 'ln' }, [h('i', {}, ['技能']), h('div', { class: 'pd-legend' }, lab(JB.must).concat(lab(JB.nice)).map(function (t) { return P.chip('accent', t, true); }))])
    ]);
    var vchips = h('div', { class: 'chips' }, LIB.jdBlocks.variants.map(function (v) { return h('button', { class: M.jdVariant === v.key ? 'on' : '', onclick: function () { M.jdVariant = v.key; draw(); } }, [v.name]); }));
    var cJd = P.card({ cls: 'c8', title: 'JD', sub: J.variantName + ' · ' + J.words + ' 字' + (J.published ? ' · 已发布 ' + short(J.publishedAt) : ''), extra: [vchips], body: [jc], foot: [
      J.published && J.publishedVariant === M.jdVariant ? P.chip('ok', '已发布 · ' + J.variantName) : P.btn('发布' + J.variantName, { cls: 'primary sm', onClick: function () { commit(K.publish(d, n.id, M.jdVariant, LIB), n.title + ' JD 已发布（' + J.variantName + '）'); } }),
      P.btn('查看全文', { cls: 'sm', onClick: function () { jdDrawer(J); } }),
      P.btn('发送到微信', { cls: 'sm', onClick: function () { sh.setQrReady(true); sh.showWeChat(); } })] });
    g.appendChild(cJd);
    var tbl = P.table({ compact: true, cols: [
      { key: 'id', label: '候选人', render: function (c) { return h('span', {}, [h('b', { class: 'id' }, [c.id]), h('span', { class: 'sub' }, [c.sourceName])]); } },
      { key: 'total', label: '匹配分', align: 'r', sort: true, sortDesc: true, render: function (c) { return P.bar(c.total, c.grade === 'A' ? 'ok' : c.grade === 'B' ? undefined : c.grade === 'C' ? 'risk' : 'late', c.total + ''); } },
      { key: 'grade', label: '等级', render: function (c) { return gradeChip(c.grade); } },
      { key: 'years', label: '学历 · 经验', sort: true, render: function (c) { return c.eduName + ' · ' + c.years + ' 年'; } },
      { key: 'expected', label: '期望', align: 'r', sort: true, render: function (c) { return h('span', { class: c.expected > n.band[1] ? 'neg' : '' }, [fmtN(c.expected)]); } },
      { key: 'stageIdx', label: '阶段', sort: true, render: function (c) { return stageChip(c); } }
    ], rows: shown, sortKey: 'total', sortDir: 'desc', rowKey: function (c) { return c.id; }, activeKey: M.cand, onRow: function (c) { M.cand = c.id; draw(); }, empty: '此筛选下没有候选人' });
    var cTbl = P.card({ cls: 'c7', title: '候选人 · ' + n.title, sub: shown.length + ' 人' + (f ? ' · 已筛选' : ''), tight: true, body: [h('div', { class: 'pd-scroll', style: 'max-height:330px' }, [tbl])] });
    g.appendChild(cTbl);
    var s = C.score, acts = h('div', { class: 'pd-actions' });
    if (C.stage === 'new') {
      if (C.grade !== 'D') acts.appendChild(h('div', { class: 'pd-action best' }, [h('div', { class: 't' }, [h('span', { class: 'rank' }, ['1']), '通过初筛']), P.btn('通过', { cls: 'primary sm', onClick: function () { commit(K.pass(d, C.id), C.id + ' 已通过初筛'); } }), h('div', { class: 'd' }, ['进入面试安排队列'])]));
      acts.appendChild(h('div', { class: 'pd-action' + (C.grade === 'D' ? ' best' : '') }, [h('div', { class: 't' }, [h('span', { class: 'rank' }, [C.grade === 'D' ? '1' : '2']), '淘汰']), P.btn('淘汰', { cls: (C.grade === 'D' ? 'primary ' : '') + 'sm', onClick: function () { commit(K.reject(d, C.id), C.id + ' 已淘汰，入人才库'); } }), h('div', { class: 'd' }, [C.grade === 'D' ? s.gates[0] : '匹配分 ' + C.total])]));
    } else if (C.stage === 'screened') {
      acts.appendChild(h('div', { class: 'pd-action best' }, [h('div', { class: 't' }, [h('span', { class: 'rank' }, ['1']), '安排面试 · ' + short(K.dateOf(d.today, 3))]), P.btn('安排', { cls: 'primary sm', onClick: function () { commit(K.schedule(d, C.id, K.dateOf(d.today, 3)), C.id + ' 面试已安排在 ' + short(K.dateOf(d.today, 3))); } }), h('div', { class: 'd' }, ['面试官：' + K.interviewKit(d, C, LIB).interviewers.join('、')])]));
    } else if (C.stage === 'interview' || C.stage === 'done') {
      acts.appendChild(h('div', { class: 'pd-action best' }, [h('div', { class: 't' }, [h('span', { class: 'rank' }, ['1']), C.stage === 'interview' ? '面试 ' + short(C.interviewDate) : '综合 ' + C.interview.avg + ' 分 · ' + C.interview.verdictName]), P.btn('去面试屏', { cls: 'primary sm', onClick: function () { M.icand = C.id; setStep('interview'); } }), h('div', { class: 'd' }, ['题库与评分表在面试屏'])]));
    } else if (C.stage === 'offer') {
      acts.appendChild(h('div', { class: 'pd-action' }, [h('div', { class: 't' }, [h('span', { class: 'rank' }, ['·']), 'offer 已发 · 月薪 ' + fmtN(C.offer.salary) + ' 元']), P.chip('ok', '待入职'), h('div', { class: 'd' }, ['入职当天签合同、办参保'])]));
    } else acts.appendChild(h('div', { class: 'pd-action' }, [h('div', { class: 't' }, [h('span', { class: 'rank' }, ['·']), '已淘汰']), P.chip('done', '人才库'), h('div', { class: 'd' }, [''])]));
    var cCand = P.card({ title: C.id + ' · ' + C.jobTitle, sub: C.sourceName + ' · ' + C.eduName + ' · ' + C.years + ' 年', accent: true, body: [
      h('div', { class: 'm5-chead' }, [gradeChip(C.grade), stageChip(C), h('span', { class: 'm' }, [h('b', { class: 'num' }, [String(C.total)]), h('span', {}, ['匹配分'])]), h('span', { class: 'm' }, [h('b', { class: 'num' }, [fmtN(C.expected)]), h('span', {}, ['期望月薪'])]), h('span', { class: 'm' }, [h('b', { class: 'num' }, [C.availableDays + ' 天']), h('span', {}, ['到岗'])])]),
      P.judge({ verdict: { tone: C.grade === 'A' ? 'ok' : C.grade === 'D' ? 'late' : 'risk', chip: GRADE_NAME[C.grade], text: C.action + ' · ' + s.reasons[0] }, seen: s.seen.slice(0, 2), reasons: s.reasons.slice(0, 3), actionsEl: acts, actionsTitle: '建议动作' })
    ] });
    g.appendChild(col('c5', [cCand]));
    work.appendChild(g);
    story({ work: work, src: Array.prototype.slice.call(needs.children), from: cNeed, to: cJd, label: n.title,
      rise: [cTbl, cCand], rows: trs(tbl), bars: bars(work, '.pd-bar .trk i'),
      verdict: say, focus: rowOf(work, top.id) });
  }

  /* ---------- 屏 4 · 面试与录用 ---------- */
  function kitDrawer(kit, C) {
    var qs = h('div', { class: 'm5-qs' });
    kit.sets.forEach(function (set) {
      var ab = h('div', { class: 'ab' }, [h('div', { class: 'h' }, [h('span', {}, [set.label]), h('span', { class: 'w' }, ['权重 ' + Math.round(set.weight * 100) + '%'])])]);
      set.questions.forEach(function (q) { ab.appendChild(h('div', { class: 'q' }, [h('div', { class: 't' }, [q.q]), h('div', { class: 'p' }, [q.probe]), h('div', { class: 'an' }, [['1', q.anchors['1']], ['3', q.anchors['3']], ['5', q.anchors['5']]].map(function (a) { return h('span', {}, [h('b', {}, [a[0] + ' 分']), a[1]]); }))])); });
      qs.appendChild(ab);
    });
    P.drawer(M.frame.body, { title: '题库与评分锚点 · ' + C.id, sub: C.jobTitle + ' · 面试官 ' + kit.interviewers.join('、'), body: [qs] });
  }
  function screenInterview(work) {
    var R = M.R, d = M.data;
    work.classList.add('m5-interview');
    var list = R.candidates.filter(function (c) { return ['interview', 'done', 'offer'].indexOf(c.stage) >= 0; }).sort(function (a, b) { return (a.interviewDate || '').localeCompare(b.interviewDate || '') || a.id.localeCompare(b.id); });
    if (!M.icand || !list.some(function (c) { return c.id === M.icand; })) M.icand = list.length ? list[0].id : null;
    var C = M.icand ? R.byId[M.icand] : null;
    var done = R.candidates.filter(function (c) { return c.scores; });
    var g = grid();
    var F = flowBar({ src: [['面试安排', list.length + ' 人'], ['题库', LIB.jobs.abilities.length + ' 项'], ['薪酬带', '按岗位库']], hub: '评分与定薪', out: ['已评分 ' + done.length + ' 人', '建议录用 ' + done.filter(function (c) { return c.interview.verdict === 'hire'; }).length + ' 人'], btn: '重算录用建议' });
    g.appendChild(F);
    g.appendChild(h('div', { class: 'c12' }, [P.kpis([
      { label: '待面试', value: cnt(R.kpi.interviewing), unit: '人', tone: 'accent' },
      { label: '已完成评分', value: cnt(done.length), unit: '人' },
      { label: '建议录用', value: cnt(done.filter(function (c) { return c.interview.verdict === 'hire'; }).length), unit: '人', tone: 'ok' },
      { label: '备选', value: cnt(done.filter(function (c) { return c.interview.verdict === 'backup'; }).length), unit: '人', tone: 'risk' },
      { label: '已发 offer', value: cnt(R.kpi.offers), unit: '人', tone: 'ok' },
      { label: '平均评分', value: done.length ? cnt(Math.round(10 * done.reduce(function (t, c) { return t + c.interview.avg; }, 0) / done.length) / 10, { dec: 1 }) : '—', sub: '满分 5 · ≥ 4.0 录用' }
    ])]));
    var rdone = done.filter(function (c) { return c.stage === 'done'; })[0] || done[0];
    var say = rdone ? vd(rdone.id + ' 综合 ' + rdone.interview.avg + ' 分 · ' + rdone.interview.verdictName + '，' + rdone.interview.lowest + ' ' + rdone.interview.lowestScore + ' 分偏低，建议定薪 ' + fmtN(rdone.interview.suggested) + ' 元 / 月。')
      : vd('待面试 ' + R.kpi.interviewing + ' 人，四项打分后出录用建议与定薪。');
    g.appendChild(h('div', { class: 'c12' }, [say]));
    var il = h('div', { class: 'pd-list' });
    list.forEach(function (c) { il.appendChild(P.item({ tone: c.stage === 'offer' ? 'ok' : c.stage === 'done' ? 'risk' : 'accent', icon: c.grade, title: c.id + ' · ' + c.jobTitle, sub: (c.interviewDate ? short(c.interviewDate) + ' · ' : '') + c.stageName, right: c.interview ? c.interview.avg + ' 分' : '待评', rightSub: c.offer ? fmtN(c.offer.salary) + ' 元' : '', onClick: function () { M.icand = c.id; M.scores = {}; draw(); } })); });
    if (!list.length) il.appendChild(P.empty('还没有面试安排'));
    var cList = P.card({ cls: 'c4', title: '面试安排', sub: list.length + ' 人', body: [il] });
    g.appendChild(cList);
    if (!C) { work.appendChild(g); story({ work: work, src: F.srcs, from: F.srcWrap, to: F.hub, rise: [cList], verdict: say }); return; }
    var kit = K.interviewKit(d, C, LIB);
    var sc = C.scores ? C.scores : M.scores;
    var qs = h('div', { class: 'm5-qc' });
    kit.sets.forEach(function (set) {
      var pick = h('span', { class: 'pick' }, [1, 2, 3, 4, 5].map(function (v) { return h('button', { class: sc[set.key] === v ? 'on' : '', disabled: !!C.scores, onclick: function () { M.scores[set.key] = v; draw(); } }, [String(v)]); }));
      qs.appendChild(h('div', { class: 'r' }, [
        h('div', { class: 'lb' }, [h('b', {}, [set.label]), h('span', {}, [Math.round(set.weight * 100) + '%']), h('span', { class: 'wbar' }, [h('i', { 'data-to': String(Math.round(set.weight * 250)) })])]),
        h('div', { class: 'q' }, [cut((set.questions[0] || {}).q || '', 34)]),
        pick
      ]));
    });
    var ready = ['pro', 'coop', 'stable', 'value'].every(function (k2) { return M.scores[k2]; });
    var right = col('c8', []), cRes = null;
    if (C.interview) {
      var r = C.interview;
      var acts = h('div', { class: 'pd-actions' });
      if (C.stage === 'done') acts.appendChild(h('div', { class: 'pd-action best' }, [h('div', { class: 't' }, [h('span', { class: 'rank' }, ['1']), r.verdict === 'hire' ? '发 offer · 月薪 ' + fmtN(r.suggested) + ' 元' : r.verdict === 'backup' ? '列为备选' : '不建议录用']), r.verdict === 'no' ? P.btn('淘汰', { cls: 'sm', onClick: function () { commit(K.reject(d, C.id), C.id + ' 已淘汰'); } }) : P.btn(r.verdict === 'hire' ? '发 offer' : '仍发 offer', { cls: (r.verdict === 'hire' ? 'primary ' : '') + 'sm', onClick: function () { commit(K.offer(d, C.id, r.suggested, LIB), C.id + ' offer 已发，月薪 ' + fmtN(r.suggested) + ' 元'); } }), h('div', { class: 'd' }, [r.lowest + ' ' + r.lowestScore + ' 分' + (r.verdict === 'hire' ? '，入职后重点带教' : '，是主要顾虑')])]));
      else if (C.stage === 'offer') acts.appendChild(h('div', { class: 'pd-action' }, [h('div', { class: 't' }, [h('span', { class: 'rank' }, ['·']), 'offer 已发 · 月薪 ' + fmtN(C.offer.salary) + ' 元 · ' + short(C.offer.date)]), P.chip('ok', '待入职'), h('div', { class: 'd' }, ['入职当天签合同、办参保'])]));
      cRes = P.card({ title: '评分结果与录用建议', sub: C.id + ' · ' + C.jobTitle, accent: true, body: [h('div', { class: 'm5-result' }, [
        h('div', {}, [P.radar({ axes: r.radar.map(function (x) { return { key: x.key, label: x.label }; }), values: r.radar.map(function (x) { return x.value; }), max: 5, size: 240 })]),
        h('div', { class: 'm5-vd' }, [h('div', { class: 'big' }, [cnt(r.avg, { dec: 2 }), h('span', {}, ['/ 5']), P.chip(r.verdict === 'hire' ? 'ok' : r.verdict === 'backup' ? 'risk' : 'late', r.verdictName)]),
          P.kv([['薪酬带', fmtN(r.band[0]) + '–' + fmtN(r.band[1]) + ' 元'], ['内部中位', fmtN(r.median) + ' 元'], ['候选人期望', fmtN(C.expected) + ' 元'], ['建议定薪', h('b', { class: 'num', style: 'color:var(--pa);font-size:16px' }, [fmtN(r.suggested) + ' 元 / 月'])]]),
          h('ul', { class: 'm5-ul' }, r.notes.slice(2, 3).map(function (t) { return h('li', {}, [t]); })), acts])
      ])] });
      right.appendChild(cRes);
    }
    var cQs = P.card({ title: '评分表 · ' + C.id, sub: '面试官 ' + kit.interviewers.join('、') + (C.interviewDate ? ' · ' + short(C.interviewDate) : ''), body: [qs], extra: [P.btn('题库全文', { cls: 'sm', onClick: function () { kitDrawer(kit, C); } })], foot: [
      C.scores ? P.chip('ok', '评分已录入 · 综合 ' + C.interview.avg + ' 分') : P.btn('录入评分', { cls: 'primary', disabled: !ready, onClick: function () { var s2 = clone(M.scores); M.scores = {}; commit(K.score(d, C.id, s2, LIB), C.id + ' 评分已录入'); } })] });
    right.appendChild(cQs);
    g.appendChild(right);
    work.appendChild(g);
    var poly = bars(work, '.pd-radar polygon');
    story({ work: work, src: Array.prototype.slice.call(il.children).slice(0, 5), from: cList, to: cRes || cQs, label: C.id,
      rise: [cQs].concat(Array.prototype.slice.call(qs.children)), bars: bars(work, '.m5-qc .wbar i'), paths: poly.slice(-1),
      verdict: say, focus: cRes ? cRes.querySelector('.pd-kv') : null });
  }

  /* ---------- 屏 5 · 用工合规 ---------- */
  function screenCompliance(work) {
    var R = M.R, d = M.data, comp = R.compliance, cal = R.calendar;
    work.classList.add('m5-compliance');
    if (!M.rule || !comp.items.some(function (i) { return i.id === M.rule; })) M.rule = (comp.open[0] || comp.items[0]).id;
    var I = comp.items.filter(function (i) { return i.id === M.rule; })[0];
    var g = grid();
    var F = flowBar({ src: [['花名册', R.kpi.headcount + ' 人'], ['工资表', mon() + ' 月'], ['考勤', mon() + ' 月'], ['社保申报表', R.kpi.headcount + ' 条']], hub: '12 条规则核对', out: ['待处理 ' + comp.counts.open + ' 项', '影响预计 ' + W(comp.impact)], btn: '重新核对' });
    g.appendChild(F);
    g.appendChild(h('div', { class: 'c12' }, [P.kpis([
      { label: '待处理', value: cnt(comp.counts.open), unit: '项', tone: comp.counts.high ? 'late' : comp.counts.open ? 'risk' : 'ok', sub: '高 ' + comp.counts.high + ' · 中 ' + comp.counts.mid + ' · 低 ' + comp.counts.low },
      { label: '影响预计', value: cw(comp.impact), tone: comp.impact ? 'late' : 'ok', sub: '补缴、赔偿与差额' },
      { label: '社保基数占工资', value: cnt(comp.socialBaseRatio), unit: '%', tone: comp.socialBaseRatio < 100 ? 'risk' : 'ok' },
      { label: '加班超 36 小时', value: cnt(comp.overtimeOver), unit: '人', tone: comp.overtimeOver ? 'risk' : 'ok', sub: mon() + ' 月考勤' },
      { label: '60 天内到期合同', value: cnt(comp.contractsDue60), unit: '份', tone: comp.contractsDue60 ? 'risk' : 'ok' },
      { label: '已处置', value: cnt(comp.counts.handled), unit: '项', tone: 'ok', sub: '无问题 ' + comp.counts.clear + ' 项' }
    ])]));
    var tr0 = topRule(), share = comp.impact ? Math.round(100 * tr0.impact / comp.impact) : 0;
    var say = vd(tr0.id + ' ' + tr0.name + '：' + tr0.count + ' 人，影响预计 ' + W(tr0.impact) + '，占待处理的 ' + share + '%，先处理这一条。');
    g.appendChild(h('div', { class: 'c12' }, [say]));
    var mx = Math.max.apply(null, comp.items.map(function (i) { return i.impact; })) || 1;
    var tbl = P.table({ compact: true, cols: [
      { key: 'id', label: '规则', cls: 'm5-rl', render: function (i) { return h('span', {}, [h('b', { class: 'id' }, [i.id]), h('span', { class: 'sub' }, [i.name])]); } },
      { key: 'severity', label: '严重度', render: function (i) { return P.chip(SEV[i.severity], SEV_NAME[i.severity]); } },
      { key: 'count', label: '涉及', align: 'r', sort: true, render: function (i) { return i.count ? i.count + ' 人' : '—'; } },
      { key: 'impact', label: '影响预计', align: 'r', cls: 'm5-im', sort: true, sortDesc: true, render: function (i) { return i.impact ? h('span', {}, [h('b', { class: i.status === 'open' ? 'neg' : '' }, [W(i.impact)]), h('span', { class: 'm5-mb' }, [h('i', { 'data-to': String(Math.max(10, Math.round(100 * Math.sqrt(i.impact / mx)))) })])]) : '—'; } },
      { key: 'action', label: '动作', render: function (i) { return i.status === 'open' ? P.btn(i.action.label, { cls: 'sm', onClick: function (e) { e.stopPropagation(); M.rule = i.id; commit(K.resolve(d, i.id, LIB), i.id + ' ' + i.action.label); } }) : P.chip(STATUS_TONE[i.status], STATUS_NAME[i.status]); } }
    ], rows: comp.items, rowKey: function (i) { return i.id; }, activeKey: M.rule, onRow: function (i) { M.rule = i.id; draw(); } });
    var cTbl = P.card({ cls: 'c7', title: '规则核对', sub: LIB.complianceRules.rules.length + ' 条 · 待处理 ' + comp.counts.open + ' 项', tight: true, body: [h('div', { class: 'pd-scroll', style: 'max-height:290px' }, [tbl])] });
    g.appendChild(cTbl);
    var aff = h('div', { class: 'm5-aff' });
    I.affected.slice(0, 5).forEach(function (a) { aff.appendChild(h('div', { class: 'a' }, [h('b', {}, [a.id]), h('span', { class: 'd' }, [h('span', { class: 'j' }, [a.job + ' · ' + a.dept]), a.detail]), h('span', { class: 'num' }, [a.amount ? fmtN(a.amount) + ' 元' : ''])])); });
    var acts = h('div', { class: 'pd-actions' });
    if (I.status === 'open') acts.appendChild(h('div', { class: 'pd-action best' }, [h('div', { class: 't' }, [h('span', { class: 'rank' }, ['1']), I.action.label]), P.btn(I.mode === 'fix' ? '执行并写回' : '进台账', { cls: 'primary sm', onClick: function () { commit(K.resolve(d, I.id, LIB), I.id + ' ' + I.action.label); } }), h('div', { class: 'd' }, [I.action.desc])]));
    else acts.appendChild(h('div', { class: 'pd-action' }, [h('div', { class: 't' }, [h('span', { class: 'rank' }, ['·']), I.action.label]), P.chip(STATUS_TONE[I.status], STATUS_NAME[I.status]), h('div', { class: 'd' }, [I.status === 'clear' ? '本次核对未命中' : I.action.desc])]));
    var cDet = P.card({ title: I.id + ' ' + I.name, sub: I.cat + ' · ' + I.law, accent: true, extra: I.affected.length > 5 ? [P.btn('全部 ' + I.count + ' 人', { cls: 'sm', onClick: function () { affDrawer(I); } })] : null, body: [
      P.judge({ verdict: { tone: I.status !== 'open' ? 'ok' : SEV[I.severity] === 'watch' ? 'risk' : SEV[I.severity], chip: I.status === 'open' ? SEV_NAME[I.severity] + '风险' : STATUS_NAME[I.status], text: I.desc }, seen: ['涉及 ' + I.count + ' 人 · 影响预计 ' + W(I.impact), '口径：' + I.impactNote], reasons: I.affected.length ? I.affected.slice(0, 3).map(function (a) { return a.id + ' ' + a.job + '：' + a.detail; }) : ['本次核对未命中'], actionsEl: acts, actionsTitle: '整改' }),
      I.affected.length ? h('div', { class: 'm5-sub' }, ['涉及员工 ' + I.count + ' 人']) : null, I.affected.length ? aff : null
    ] });
    g.appendChild(col('c5', [cDet]));
    var kf = M.calKind, pass = function (it) { return !kf || it.kind === kf; };
    var weeks = cal.weeks.map(function (w) { return { w: w.w, start: w.start, end: w.end, label: w.label, items: w.items.filter(pass) }; });
    var kinds = [['contract', '合同到期'], ['probation', '试用期届满'], ['need', '到岗期限'], ['interview', '面试'], ['leave', '哺乳期结束']];
    var kchips = h('div', { class: 'chips' }, [h('button', { class: !kf ? 'on' : '', onclick: function () { M.calKind = null; draw(); } }, ['全部 ' + cal.counts.total])].concat(kinds.filter(function (x) { return cal.items.some(function (i) { return i.kind === x[0]; }); }).map(function (x) { return h('button', { class: kf === x[0] ? 'on' : '', onclick: function () { M.calKind = M.calKind === x[0] ? null : x[0]; draw(); } }, [x[1] + ' ' + cal.items.filter(function (i) { return i.kind === x[0]; }).length]); })));
    var cCal = P.card({ cls: 'c12', title: '90 天人事日历', sub: short(d.weekStart) + ' 起 13 周 · 30 天内 ' + cal.due30.length + ' 项', extra: [kchips], body: [P.weekGrid({ weeks: weeks, today: d.today, maxItems: 2, onItem: function (it) { if (it.kind === 'interview') { M.icand = it.ref; setStep('interview'); } else if (it.kind === 'need') { M.need = it.ref; setStep('recruit'); } else { M.rule = it.kind === 'contract' ? 'H02' : it.kind === 'leave' ? 'H10' : 'H03'; draw(); } } })] });
    g.appendChild(cCal);
    work.appendChild(g);
    story({ work: work, src: F.srcs, from: F.srcWrap, to: cTbl, label: R.kpi.headcount + ' 人',
      rise: [cDet, cCal].concat(Array.prototype.slice.call(aff.children)), rows: trs(tbl), bars: bars(work, '.m5-mb i'),
      verdict: say, focus: rowOf(work, tr0.id) });
  }
  function affDrawer(I) {
    var aff = h('div', { class: 'm5-aff' });
    I.affected.forEach(function (a) { aff.appendChild(h('div', { class: 'a' }, [h('b', {}, [a.id]), h('span', { class: 'd' }, [h('span', { class: 'j' }, [a.job + ' · ' + a.dept]), a.detail]), h('span', { class: 'num' }, [a.amount ? fmtN(a.amount) + ' 元' : ''])])); });
    P.drawer(M.frame.body, { title: I.id + ' ' + I.name, sub: I.count + ' 人 · 影响预计 ' + W(I.impact) + ' · ' + I.law, body: [aff] });
  }

  /* ---------- 屏 6 · 成本与编制 ---------- */
  function monthDrawer(Pn, S) {
    var mt = P.table({ compact: true, cols: [{ key: 'label', label: '月份' }, { key: 'headcount', label: '在编', align: 'r' }, { key: 'cost', label: '用工成本', align: 'r', render: function (r) { return W(r.cost); } }, { key: 'delta', label: '较现状', align: 'r', render: function (r) { return h('span', { class: r.delta > 0 ? 'neg' : r.delta < 0 ? 'pos' : '' }, [(r.delta >= 0 ? '+' : '−') + W(Math.abs(r.delta))]); } }], rows: Pn.months.map(function (m, i) { return { label: S.labels[i], headcount: m.headcount, cost: m.cost, delta: m.cost - S.base[i].cost }; }) });
    P.drawer(M.frame.body, { title: '方案 ' + Pn.key + ' 逐月明细', sub: Pn.name + ' · 12 个月预计 ' + W(Pn.total12), body: [mt] });
  }
  function reportDrawer(R) {
    P.drawer(M.frame.body, { title: '人力月报', sub: M.data.today.slice(0, 7).replace('-', ' 年 ') + ' 月 · ' + M.data.company, body: [h('div', { class: 'pd-pre' }, [R.report.text])], actions: [P.btn('发送到微信', { cls: 'primary', onClick: function () { sh.setQrReady(true); sh.showWeChat(); } })] });
  }
  function screenCost(work) {
    var R = M.R, d = M.data, C = R.cost, S = R.sim, k = R.kpi;
    work.classList.add('m5-cost');
    if (!M.plan) M.plan = d.plan || 'B';
    var Pn = S.plans.filter(function (p) { return p.key === M.plan; })[0];
    var g = grid();
    var F = flowBar({ src: [['工资', W(C.wages)], ['社保', W(C.social)], ['公积金', W(C.fund)], ['福利', W(C.welfare)]], hub: '成本模型', out: ['月 ' + W(C.monthly), '占收入 ' + C.share + '%'], btn: '重算成本' });
    g.appendChild(F);
    g.appendChild(h('div', { class: 'c12' }, [P.kpis([
      { label: '月用工成本', value: cw(C.monthly), sub: '工资 + 社保 + 公积金 + 福利' },
      { label: '年化用工成本', value: cw0(C.annual), sub: '含招聘、培训、流失' },
      { label: '占收入', value: cnt(C.share, { dec: 1 }), unit: '%', tone: C.share > C.bench[1] ? 'risk' : 'ok', sub: '参考 ' + C.bench[0] + '–' + C.bench[1] + '%' },
      { label: '人均成本', value: cw(C.perCapitaCost), sub: '年化 ÷ 在编' },
      { label: '人均产值', value: cw(C.perCapitaRevenue), tone: 'accent' },
      { label: '社保基数差', value: cw(S.socialDelta), unit: '/ 月', tone: S.socialDelta ? 'risk' : 'ok', sub: S.socialDelta ? '按实际工资申报后' : '申报基数等于工资口径' }
    ])]));
    var say = vd('方案 ' + Pn.key + ' 12 个月预计 ' + W(Pn.total12) + '，较现状 ' + (Pn.delta >= 0 ? '+' : '−') + W(Math.abs(Pn.delta)) + '；' + (S.socialDelta > 0 ? '社保基数到位每月多 ' + W(S.socialDelta) : '社保基数已按实际工资申报到位') + '。');
    g.appendChild(h('div', { class: 'c12' }, [say]));
    var cStr = P.card({ cls: 'c5', title: '成本结构', sub: '年化 ' + W(C.annual), body: [P.dist({ rows: C.structure.map(function (x) { return { label: x.label, value: x.value, text: W(x.value), hi: x.label === '工资' }; }) }), h('div', { style: 'margin-top:10px' }, [P.kv([['社保单位费率', Math.round(C.rates.social * 1000) / 10 + '%'], ['公积金单位费率', Math.round(C.rates.fund * 100) + '%'], ['社保基数合计', W(C.socialBase) + ' / 月'], ['工资合计', W(C.wages) + ' / 月']])])] });
    g.appendChild(cStr);
    var colors = { base: '#98A2B8', A: '#4974F6', B: '#0B8FA8', C: '#E8A33D' };
    var lc = P.lineChart({ labels: S.labels, right: true, series: [{ values: S.base.map(function () { return 0; }), color: colors.base, fmt: function () { return '现状'; } }].concat(S.plans.map(function (p) { return { values: p.months.map(function (m, i) { return Math.round((m.cost - S.base[i].cost) / 1000) / 10; }), color: colors[p.key], fmt: function (v) { return (v >= 0 ? '+' : '−') + Math.abs(v) + ' 万'; } }; })), height: 230, width: 900 });
    var cLine = P.card({ cls: 'c7', title: '12 个月用工成本走势', sub: '较现状差额 · 万元 / 月', body: [lc, h('div', { class: 'pd-legend', style: 'margin-top:8px' }, [h('span', {}, [h('i', { style: 'background:' + colors.base }), '现状'])].concat(S.plans.map(function (p) { return h('span', {}, [h('i', { style: 'background:' + colors[p.key] }), p.key + ' ' + p.name]); })))] });
    g.appendChild(cLine);
    var cmp = P.compare({ active: M.plan, onPick: function (key) { M.plan = key; draw(); }, options: S.plans.map(function (p) { return { key: p.key, name: p.name, recommended: p.recommended, headline: { big: W(p.total12), sub: (p.delta >= 0 ? '+' : '−') + W(Math.abs(p.delta)) + ' 较现状', tone: p.key === 'C' ? 'ok' : '' }, rows: [{ k: '期末在编', v: p.endHeadcount + ' 人' }, { k: '新增招聘', v: p.hires + ' 人' }, { k: '缺编', v: p.vacancyAfter + ' 人', tone: p.vacancyAfter > 0 ? 'bad' : 'good' }, { k: '用工占收入', v: p.share + '%' }, { k: '人均产值', v: W(p.perCapitaRevenue) }], notes: planNote(p) }; }) });
    var cCmp = P.card({ cls: 'c12', title: '编制三方案', sub: '12 个月预计', extra: [P.btn('逐月明细', { cls: 'sm', onClick: function () { monthDrawer(Pn, S); } })], body: [cmp], foot: [
      d.plan === M.plan ? P.chip('ok', '已采纳 ' + M.plan) : P.btn('采纳方案 ' + M.plan, { cls: 'primary', onClick: function () { commit(K.adoptPlan(d, M.plan, LIB), '已采纳方案 ' + M.plan + '，月报已更新'); } })] });
    g.appendChild(cCmp);
    var who = h('div', { class: 'who' });
    ['总经理', '财务负责人', '各部门负责人'].forEach(function (w, i) { who.appendChild(h('button', { class: i === M.who ? 'on' : '', onclick: function () { M.who = i; draw(); } }, [w])); });
    var cRep = P.card({ cls: 'c12', title: '人力月报', sub: d.today.slice(0, 7).replace('-', ' 年 ') + ' 月 · 微信文本版', extra: [who], body: [h('div', { class: 'pd-pre' }, [R.report.lines.slice(0, 3).join('\n')])], foot: [P.btn('全文', { cls: 'sm', onClick: function () { reportDrawer(R); } }), P.btn('发送到微信', { cls: 'primary', onClick: function () { sh.setQrReady(true); sh.showWeChat(); } }), P.btn('回到驾驶舱', { onClick: function () { setStep('board'); } })] });
    g.appendChild(cRep);
    work.appendChild(g);
    var opts = Array.prototype.slice.call(cmp.children);
    story({ work: work, src: F.srcs, from: F.srcWrap, to: cStr, label: W(C.monthly),
      rise: [cLine, cCmp, cRep].concat(opts), rows: [], bars: bars(work, '.pd-dist .trk i'), paths: bars(work, '.pd-line path'),
      verdict: say, focus: opts[['A', 'B', 'C'].indexOf(M.plan)] || null });
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
  function workEl() { return M.frame ? M.frame.work : null; }

  function opener(step) {
    if (!M.R) return null;
    var R = M.R, k = R.kpi, C = R.cost, comp = R.compliance;
    if (step === 'connect') return '社保申报表的基数合计 ' + W(C.socialBase) + ' / 月，工资表 ' + W(C.wages) + ' / 月，差 ' + W(C.wages - C.socialBase) + '，这块按实际工资申报要补。';
    if (step === 'board') { var dp = topDept(); return dp.name + ' 在编 ' + dp.headcount + ' 人、缺编 ' + dp.vacancy + ' 人，' + dp.overtimeOver + ' 人上月加班超 36 小时，缺编与加班是同一件事。'; }
    if (step === 'recruit') { var n = currentNeed(), t = topCand(); return n.title + ' 还有 ' + n.dueDays + ' 天到岗期限，候选 ' + n.active + ' 人里 A 级 ' + n.gradeA + ' 人；' + t.id + ' 匹配 ' + t.total + ' 分，期望 ' + fmtN(t.expected) + ' 元。'; }
    if (step === 'interview') {
      var dn = R.candidates.filter(function (c) { return c.scores; });
      if (!dn.length) return '待面试 ' + k.interviewing + ' 人，四项打分录入后出录用建议与定薪。';
      var c0 = dn[0];
      return c0.id + ' 综合 ' + c0.interview.avg + ' 分，' + c0.interview.lowest + ' 只有 ' + c0.interview.lowestScore + ' 分；建议定薪 ' + fmtN(c0.interview.suggested) + ' 元，正好卡在候选人期望上。';
    }
    if (step === 'compliance') { var t2 = topRule(); return t2.id + ' ' + t2.name + ' 涉及 ' + t2.count + ' 人，影响预计 ' + W(t2.impact) + '，占 ' + comp.counts.open + ' 项待处理影响的 ' + Math.round(100 * t2.impact / (comp.impact || 1)) + '%。'; }
    if (step === 'cost') {
      var cs = '用工成本占收入 ' + C.share + '%，高于同行参考 ' + C.bench[0] + '–' + C.bench[1] + '%';
      if (R.sim.socialDelta > 0) return cs + '；社保基数补到位每月多 ' + W(R.sim.socialDelta) + '，一年 ' + W(R.sim.socialDelta * 12) + '。';
      var h5o = comp.items.filter(function (x) { return x.id === 'H05'; })[0];
      return '社保基数已按实际工资申报到位' + (h5o && h5o.status !== 'open' ? '，' + h5o.id + ' 敞口已关闭' : '') + '；' + cs + '。';
    }
    return null;
  }
  function suggest(step) {
    if (step === 'connect') return ['哪些数据是直连的', '社保基数和工资差多少', '进人力驾驶舱'];
    if (step === 'board') return ['哪个部门缺编多', '离职为什么高', '加班超限多少人', '先处理哪一项'];
    if (step === 'recruit') return ['A 级候选人有几个', '把 A 级筛出来', '谁不满足硬条件', '薪酬带多少'];
    if (step === 'interview') return ['建议定薪多少', '为什么是这个分', '谁还没评分', '发 offer'];
    if (step === 'compliance') return ['H05 影响多少钱', '先处理哪一条', '按实际工资调基数', '30 天内到期几项'];
    if (step === 'cost') return ['方案 B 贵多少', '社保基数补齐要多少', '采纳方案 B', '看逐月明细'];
    return null;
  }

  function answer(q, step) {
    if (!M.R) return null;
    q = String(q || '');
    var R = M.R, k = R.kpi, C = R.cost, comp = R.compliance, w = workEl();
    var i, m;
    /* 点名某条规则 */
    m = q.match(/H\s*0?(\d{1,2})/i);
    if (m) {
      var rid = 'H' + (m[1].length < 2 ? '0' + m[1] : m[1]);
      var it = comp.items.filter(function (x) { return x.id === rid; })[0];
      if (it) return { text: it.id + ' ' + it.name + '：' + STATUS_NAME[it.status] + '，涉及 ' + it.count + ' 人，影响预计 ' + W(it.impact) + '。依据 ' + it.law + '；口径 ' + it.impactNote + '。',
        blocks: it.affected.length ? [mini(['员工', '情况', '金额'], it.affected.slice(0, 4).map(function (a) { return [a.id, cut(a.detail, 16), a.amount ? fmtN(a.amount) + ' 元' : '—']; }))] : null,
        focus: step === 'compliance' ? rowOf(w, it.id) : null,
        act: step === 'compliance' ? (M.rule === it.id ? null : function () { M.rule = it.id; draw(); refocus(it.id); }) : function () { M.rule = it.id; setStep('compliance'); } };
    }
    /* 点名某个候选人 */
    m = q.match(/C-?\s?(\d{4})-?(\d{3})/i);
    if (m) {
      var cid = 'C-' + m[1] + '-' + m[2], cc = R.byId[cid];
      if (cc) {
        var blocks = [kvb([['匹配分', cc.total + ' · ' + GRADE_NAME[cc.grade]], ['学历 · 经验', cc.eduName + ' · ' + cc.years + ' 年'], ['期望', fmtN(cc.expected) + ' 元'], ['到岗', cc.availableDays + ' 天']])];
        return { text: cc.id + ' ' + cc.jobTitle + '：' + cc.score.reasons.slice(0, 2).join('；') + '。当前 ' + cc.stageName + '，建议' + cc.action + '。', blocks: blocks,
          focus: step === 'recruit' ? rowOf(w, cid) : null,
          act: step === 'recruit' && M.cand === cid ? null : function () { M.cand = cid; M.need = cc.needId; if (step === 'recruit') { draw(); refocus(cid); } else setStep('recruit'); } };
      }
    }
    /* 换屏 */
    if (has(q, ['进人力驾驶舱', '驾驶舱', '开始分析'])) return { text: '在编 ' + k.headcount + ' / 编制 ' + k.budget + '，合规待处理 ' + k.complianceOpen + ' 项，影响预计 ' + W(k.complianceImpact) + '。', act: function () { if (!M.charged) enterBoard(); else setStep('board'); } };

    if (step === 'connect') {
      if (has(q, ['直连', '数据源', '同步', '导入'])) {
        var dir = M.data.sources.filter(function (s) { return s.mode === 'direct'; });
        return { text: '共 ' + M.data.sources.length + ' 个来源，系统直连 ' + dir.length + ' 个，其余表格导入。', blocks: [mini(['来源', '方式', '条数'], M.data.sources.map(function (s) { return [cut(s.name, 10), s.mode === 'direct' ? '直连' : '导入', fmtN(s.rows)]; }))] };
      }
      if (has(q, ['社保', '基数', '差多少'])) return { text: '社保申报基数合计 ' + W(C.socialBase) + ' / 月，工资表 ' + W(C.wages) + ' / 月，差 ' + W(C.wages - C.socialBase) + '，基数只有工资的 ' + comp.socialBaseRatio + '%。', blocks: [kvb([['基数合计', W(C.socialBase) + ' / 月'], ['工资合计', W(C.wages) + ' / 月'], ['差额', W(C.wages - C.socialBase) + ' / 月']])] };
      if (has(q, ['能力', '开通', '能做'])) return { text: '已开通 4 项：' + CAPS.map(function (c) { return c[0]; }).join('、') + '。' };
      if (has(q, ['多少人', '在编', '编制'])) return { text: '在编 ' + k.headcount + ' 人 / 编制 ' + k.budget + '，缺编 ' + k.vacancy + '；' + M.data.departments.length + ' 个部门。' };
    }
    if (step === 'board') {
      if (has(q, ['缺编', '哪个部门', '部门'])) {
        var vac = R.org.byDept.filter(function (x) { return x.vacancy > 0; }).sort(function (a, b) { return b.vacancy - a.vacancy; });
        return { text: '缺编 ' + k.vacancy + ' 人，集中在 ' + vac.map(function (x) { return x.name + ' ' + x.vacancy + ' 人'; }).join('、') + '。', blocks: [mini(['部门', '在编', '缺编'], vac.map(function (x) { return [x.name, x.headcount, x.vacancy]; }))], focus: rowOf(w, vac[0].name) };
      }
      if (has(q, ['离职', '流失', '为什么高'])) {
        var rs = R.org.reasons.slice(0, 3);
        return { text: '近 12 个月离职 ' + R.org.leavers12 + ' 人、离职率 ' + k.turnover + '%，行业参考 ' + k.turnoverBench + '%。原因前三：' + rs.map(function (x) { return x.label + ' ' + x.value + ' 人'; }).join('、') + '。' };
      }
      if (has(q, ['加班', '超限', '工时'])) {
        var ot = R.org.byDept.filter(function (x) { return x.overtimeOver > 0; });
        return { text: mon() + ' 月加班超 36 小时 ' + comp.overtimeOver + ' 人，全在 ' + ot.map(function (x) { return x.name; }).join('、') + '；加班费敞口预计 ' + W(R.sim.otPremium) + ' / 月。', focus: ot.length ? rowOf(w, ot[0].name) : null };
      }
      if (has(q, ['先处理', '建议', '哪一项', '怎么办'])) {
        var t3 = topRule();
        return { text: '先处理 ' + t3.id + ' ' + t3.name + '：' + t3.count + ' 人，影响预计 ' + W(t3.impact) + '。整改动作是' + t3.action.label + '。', act: function () { M.rule = t3.id; setStep('compliance'); } };
      }
      if (has(q, ['在招', '招聘', '需求单'])) return { text: '在招 ' + k.needCount + ' 人 / ' + k.needs + ' 张需求单，候选 ' + k.candidates + ' 人、A 级 ' + k.gradeA + '。', blocks: [mini(['岗位', '人数', '到岗'], R.needs.map(function (n) { return [n.title, n.count, short(n.dueDate)]; }))], act: function () { M.filter = null; setStep('recruit'); } };
      if (has(q, ['成本', '占收入', '人均'])) return { text: '用工成本占收入 ' + C.share + '%（参考 ' + C.bench[0] + '–' + C.bench[1] + '%），年化 ' + W0(C.annual) + '，人均产值 ' + W(C.perCapitaRevenue) + '。', act: function () { setStep('cost'); } };
    }
    if (step === 'recruit') {
      var n2 = currentNeed(), all2 = R.candidates.filter(function (c) { return c.needId === n2.id; });
      if (has(q, ['A 级', 'A级', '筛出', '好的候选'])) {
        var as = all2.filter(function (c) { return c.grade === 'A' && c.stage !== 'rejected'; });
        return { text: n2.title + ' A 级 ' + as.length + ' 人：' + as.slice(0, 4).map(function (c) { return c.id + ' ' + c.total + ' 分'; }).join('、') + '。已按 A 级筛这一屏。',
          blocks: [mini(['候选人', '匹配分', '期望'], as.slice(0, 5).map(function (c) { return [c.id, c.total, fmtN(c.expected)]; }))],
          act: function () { M.filter = 'A'; draw(); if (as.length) refocus(as[0].id); } };
      }
      if (has(q, ['不满足', '淘汰', '硬条件', '不合格'])) {
        var ds = all2.filter(function (c) { return c.grade === 'D'; });
        if (!ds.length) return { text: n2.title + ' 本批没有不满足硬条件的候选人。' };
        return { text: '不满足硬条件 ' + ds.length + ' 人。' + ds[0].id + '：' + ds[0].score.gates.join('；') + '。', blocks: [mini(['候选人', '卡在哪'], ds.slice(0, 4).map(function (c) { return [c.id, cut(c.score.gates[0], 18)]; }))], act: function () { M.filter = 'fail'; draw(); refocus(ds[0].id); } };
      }
      if (has(q, ['薪酬带', '多少钱', '工资', '期望'])) return { text: n2.title + ' 薪酬带 ' + fmtN(n2.band[0]) + '–' + fmtN(n2.band[1]) + ' 元 / 月；候选人期望中位 ' + fmtN(all2.map(function (c) { return c.expected; }).sort(function (a, b) { return a - b; })[Math.floor(all2.length / 2)]) + ' 元。' };
      if (has(q, ['怎么打分', '打分', '匹配分', '怎么算'])) return { text: '匹配分 = 技能 35% + 经验 20% + 行业 15% + 稳定性 15% + 薪酬 10% + 通勤 5%；学历、经验、必备技能、证书、到岗日期任一不过直接判不满足。' };
      if (has(q, ['JD', 'jd', '职位描述'])) return { text: n2.title + ' JD ' + K.jd(M.data, n2.id, LIB, M.jdVariant).words + ' 字，' + (n2.status === 'published' ? '已发布' : '未发布') + '。全文在 JD 卡的「查看全文」里。', act: function () { jdDrawer(K.jd(M.data, n2.id, LIB, M.jdVariant)); } };
      if (has(q, ['下一步', '怎么办', '建议', '为什么'])) { var cf = R.byId[M.cand]; return { text: cf.id + ' 当前 ' + cf.stageName + '，建议' + cf.action + '：' + cf.score.reasons[0] + '。', focus: rowOf(w, cf.id) }; }
    }
    if (step === 'interview') {
      var dn2 = R.candidates.filter(function (c) { return c.scores; });
      var cur = M.icand ? R.byId[M.icand] : null;
      if (has(q, ['定薪', '多少钱', '工资', 'offer 定'])) {
        var cx = (cur && cur.interview) ? cur : dn2[0];
        if (!cx) return { text: '还没有评分记录，四项打分后才有定薪建议。' };
        var r2 = cx.interview;
        return { text: cx.id + ' 建议定薪 ' + fmtN(r2.suggested) + ' 元 / 月：薪酬带 ' + fmtN(r2.band[0]) + '–' + fmtN(r2.band[1]) + '，内部中位 ' + fmtN(r2.median) + '，候选人期望 ' + fmtN(cx.expected) + '，综合 ' + r2.avg + ' 分在中位上' + (r2.avg >= 3.5 ? '浮' : '调') + '。', blocks: [kvb([['薪酬带', fmtN(r2.band[0]) + '–' + fmtN(r2.band[1])], ['内部中位', fmtN(r2.median)], ['期望', fmtN(cx.expected)], ['建议定薪', fmtN(r2.suggested)]])] };
      }
      if (has(q, ['没评', '待评', '谁还'])) {
        var wait = R.candidates.filter(function (c) { return c.stage === 'interview'; });
        return { text: '待评 ' + wait.length + ' 人：' + wait.map(function (c) { return c.id + ' ' + short(c.interviewDate); }).join('、') + '。' };
      }
      if (has(q, ['为什么', '这个分', '评分', '几分'])) {
        var cy = (cur && cur.interview) ? cur : dn2[0];
        if (!cy) return { text: '这一屏还没有评分结果。' };
        return { text: cy.id + ' 综合 ' + cy.interview.avg + ' 分（' + cy.interview.verdictName + '）：' + cy.interview.radar.map(function (x) { return x.label + ' ' + x.value + ' 分 × ' + Math.round(x.weight * 100) + '%'; }).join('，') + '。', blocks: [mini(['能力', '分', '权重'], cy.interview.radar.map(function (x) { return [x.label, x.value, Math.round(x.weight * 100) + '%']; }))] };
      }
      if (has(q, ['发 offer', '发offer', '录用', '要不要'])) {
        var cz = R.candidates.filter(function (c) { return c.stage === 'done' && c.interview && c.interview.verdict === 'hire'; })[0];
        if (!cz) return { text: '当前没有处在「面试完成 · 建议录用」的候选人。' };
        return { text: cz.id + ' 综合 ' + cz.interview.avg + ' 分，建议录用，月薪 ' + fmtN(cz.interview.suggested) + ' 元；已按这个数发 offer。', act: function () { M.icand = cz.id; commit(K.offer(M.data, cz.id, cz.interview.suggested, LIB), cz.id + ' offer 已发，月薪 ' + fmtN(cz.interview.suggested) + ' 元'); } };
      }
      if (has(q, ['题', '问什么', '题库'])) { var kit2 = cur ? K.interviewKit(M.data, cur, LIB) : null; if (kit2) return { text: cur.jobTitle + ' 四项能力共 ' + kit2.sets.reduce(function (t, s) { return t + s.questions.length; }, 0) + ' 道题，按 1 / 3 / 5 分锚点打分；面试官 ' + kit2.interviewers.join('、') + '。', act: function () { kitDrawer(kit2, cur); } }; }
    }
    if (step === 'compliance') {
      if (has(q, ['先处理', '哪一条', '最急', '怎么办', '建议'])) {
        var t4 = topRule();
        return { text: '先处理 ' + t4.id + ' ' + t4.name + '：' + t4.count + ' 人，影响预计 ' + W(t4.impact) + '，' + SEV_NAME[t4.severity] + '风险。动作是' + t4.action.label + '。', focus: rowOf(w, t4.id), act: M.rule === t4.id ? null : function () { M.rule = t4.id; draw(); refocus(t4.id); } };
      }
      if (has(q, ['调基数', '按实际工资', '整改', '执行'])) {
        var h05 = comp.items.filter(function (x) { return x.id === 'H05'; })[0];
        if (!h05 || h05.status !== 'open') return { text: 'H05 已处置，社保基数占工资 ' + comp.socialBaseRatio + '%。' };
        return { text: 'H05 按实际工资调整基数：' + h05.count + ' 人写回花名册，年补缴敞口 ' + W(h05.impact) + ' 关闭，每月社保多 ' + W(R.sim.socialDelta) + '。已执行。', act: function () { M.rule = 'H05'; commit(K.resolve(M.data, 'H05', LIB), 'H05 按实际工资调整基数，已写回花名册'); } };
      }
      if (has(q, ['影响', '多少钱', '金额'])) return { text: '待处理 ' + comp.counts.open + ' 项，影响预计合计 ' + W(comp.impact) + '。前三：' + comp.open.slice(0, 3).map(function (x) { return x.id + ' ' + W(x.impact); }).join('、') + '。', blocks: [mini(['规则', '涉及', '影响预计'], comp.open.slice(0, 5).map(function (x) { return [x.id + ' ' + cut(x.name, 8), x.count + ' 人', W(x.impact)]; }))] };
      if (has(q, ['到期', '日历', '30 天', '30天'])) {
        var cal2 = R.calendar;
        return { text: '30 天内 ' + cal2.due30.length + ' 项：合同到期 ' + cal2.due30.filter(function (x) { return x.kind === 'contract'; }).length + '、试用期届满 ' + cal2.due30.filter(function (x) { return x.kind === 'probation'; }).length + '、面试 ' + cal2.due30.filter(function (x) { return x.kind === 'interview'; }).length + '。接下来：' + cal2.items.slice(0, 3).map(function (x) { return short(x.date) + ' ' + x.kindName; }).join('、') + '。' };
      }
      if (has(q, ['派遣'])) return { text: '派遣 ' + R.org.dispatch + ' 人，占 ' + comp.dispatchRatio + '%，上限 10%。' };
    }
    if (step === 'cost') {
      var S2 = R.sim;
      m = q.match(/方案\s*([ABC])|([ABC])\s*方案/i);
      if (has(q, ['采纳', '就按', '定了'])) {
        var ak = m ? (m[1] || m[2]).toUpperCase() : M.plan;
        var ap = S2.plans.filter(function (p) { return p.key === ak; })[0] || Pn2();
        return { text: '已采纳方案 ' + ap.key + '，12 个月预计 ' + W(ap.total12) + '，月报按这个口径出。', act: function () { M.plan = ap.key; commit(K.adoptPlan(M.data, ap.key, LIB), '已采纳方案 ' + ap.key + '，月报已更新'); } };
      }
      if (m) {
        var pk = (m[1] || m[2]).toUpperCase(), pp = S2.plans.filter(function (p) { return p.key === pk; })[0];
        return { text: '方案 ' + pp.key + ' ' + pp.name + '：12 个月预计 ' + W(pp.total12) + '，较现状 ' + (pp.delta >= 0 ? '+' : '−') + W(Math.abs(pp.delta)) + '；期末在编 ' + pp.endHeadcount + ' 人，缺编 ' + pp.vacancyAfter + '，用工占收入 ' + pp.share + '%。' + planNote(pp) + '。',
          blocks: [kvb([['12 个月预计', W(pp.total12)], ['较现状', (pp.delta >= 0 ? '+' : '−') + W(Math.abs(pp.delta))], ['期末在编', pp.endHeadcount + ' 人'], ['用工占收入', pp.share + '%']])],
          act: function () { M.plan = pk; draw(); } };
      }
      if (has(q, ['逐月', '明细', '每个月'])) return { text: '方案 ' + M.plan + ' 逐月明细已打开：12 个月在编与用工成本，以及较现状差额。', act: function () { monthDrawer(Pn2(), S2); } };
      if (has(q, ['社保', '基数', '补齐'])) {
        var h5c = comp.items.filter(function (x) { return x.id === 'H05'; })[0];
        if (S2.socialDelta <= 0) return { text: '社保基数已补齐，当前申报基数等于工资口径，无待补差额' + (h5c && h5c.status !== 'open' ? '；' + h5c.id + ' ' + STATUS_NAME[h5c.status] + '，补缴敞口已关闭' : '') + '。' };
        return { text: '按实际工资申报后每月多 ' + W(S2.socialDelta) + '，12 个月 ' + W(S2.socialDelta * 12) + '；同时关闭 H05 的补缴敞口 ' + W((h5c || {}).impact || 0) + '。' };
      }
      if (has(q, ['人均', '产值', '成本结构', '结构'])) return { text: '人均成本 ' + W(C.perCapitaCost) + ' / 年，人均产值 ' + W(C.perCapitaRevenue) + '；年化结构：' + C.structure.slice(0, 4).map(function (x) { return x.label + ' ' + W(x.value); }).join('、') + '。', blocks: [mini(['项', '年化'], C.structure.map(function (x) { return [x.label, W(x.value)]; }))] };
      if (has(q, ['月报', '发', '微信'])) return { text: '人力月报 ' + R.report.lines.length + ' 段，收件人 ' + ['总经理', '财务负责人', '各部门负责人'][M.who] + '。全文已打开。', act: function () { reportDrawer(R); } };
    }
    return null;
  }
  function Pn2() { return M.R.sim.plans.filter(function (p) { return p.key === M.plan; })[0] || M.R.sim.plans[1]; }
  function planNote(p) {
    var R = M.R, h5 = R.compliance.items.filter(function (x) { return x.id === 'H05'; })[0];
    if (!h5 || h5.status === 'open' || R.sim.socialDelta > 0 || p.key === 'B') return p.compliance;
    if (p.key === 'C') return '社保基数已按实际工资申报到位' + (R.compliance.counts.open ? '；其余 ' + R.compliance.counts.open + ' 项待处理敞口不变' : '');
    return '社保基数已按实际工资申报到位，' + h5.id + ' 敞口已关闭';
  }

  /* ---------- 上传文档 ---------- */
  function medianOf(arr) { if (!arr.length) return 0; var s = arr.slice().sort(function (a, b) { return a - b; }); return s[Math.floor(s.length / 2)]; }
  function docResume(doc, txt) {
    var d = M.data, n = currentNeed(), J = LIB.jobs.jobs[n.job] || {};
    var edu = /硕士|研究生/.test(txt) ? 'master' : /本科|学士/.test(txt) ? 'bachelor' : /大专|专科/.test(txt) ? 'college' : 'secondary';
    var ym = txt.match(/(\d{1,2})\s*年[^。；,，]{0,8}(经验|工作|从业)/), years = ym ? +ym[1] : 0;
    var em = txt.match(/期望[^0-9]{0,10}([\d,]{4,8})/), expected = em ? +em[1].replace(/,/g, '') : 0;
    var skills = Object.keys(LIB.jobs.skills).filter(function (kk) { return txt.indexOf(LIB.jobs.skills[kk]) >= 0; });
    var certs = Object.keys(LIB.jobs.certs || {}).filter(function (kk) { return txt.indexOf(LIB.jobs.certs[kk]) >= 0; });
    var pool = d.candidates;
    var cand = { id: 'C-' + d.today.slice(2, 4) + d.today.slice(5, 7) + '-' + (900 + pool.length), needId: n.id, stage: 'new', source: 'site', certs: certs, industries: [], scores: null, offer: null,
      edu: edu, years: years, skills: skills, lastTenureMonths: medianOf(pool.map(function (c) { return c.lastTenureMonths; })), jobs5y: medianOf(pool.map(function (c) { return c.jobs5y; })),
      expected: expected || Math.round((n.band[0] + n.band[1]) / 2), availableDays: medianOf(pool.map(function (c) { return c.availableDays; })), distanceKm: medianOf(pool.map(function (c) { return c.distanceKm; })), age: medianOf(pool.map(function (c) { return c.age; })) };
    var s = K.screenOne(d, cand, LIB);
    var lines = ['Word《' + doc.name + '》按 ' + n.title + ' 的口径打分：' + s.total + ' 分 · ' + GRADE_NAME[s.grade] + '。',
      '读到：' + (LIB.jobs.edu[edu] || edu) + ' · ' + years + ' 年经验 · 技能 ' + skills.length + ' 项' + (expected ? ' · 期望 ' + fmtN(expected) + ' 元' : '') + '。',
      s.reasons.slice(0, 2).join('；') + '。'];
    if (!expected || !years) lines.push('简历没写明的项（' + [years ? null : '工作年限', expected ? null : '期望薪资'].filter(Boolean).join('、') + '）按本批候选中位代入。');
    lines.push('已加进 ' + n.title + ' 候选人表。');
    return { text: lines.join('\n'),
      blocks: [kvb([['学历', LIB.jobs.edu[edu] || edu], ['经验', years + ' 年'], ['技能命中', s.mustHit + '/' + (J.must || []).length], ['匹配分', s.total + ' · ' + GRADE_NAME[s.grade]]]), skills.length ? tagsb(skills.map(function (kk) { return LIB.jobs.skills[kk]; })) : null],
      act: function () {
        var d2 = K.ensure(M.data);
        d2.candidates.push(cand);
        d2.log.push({ seq: d2.log.length + 1, kind: 'recruit', label: '简历入池', detail: cand.id + ' 由《' + doc.name + '》解析 · ' + s.total + ' 分' });
        M.need = n.id; M.cand = cand.id; M.filter = null;
        if (M.step !== 'recruit') { M.data = d2; recompute(); setStep('recruit'); }
        else commit(d2, cand.id + ' 已加进候选人表 · ' + s.total + ' 分');
      } };
  }
  function docContract(doc, txt, paras) {
    var MUST = [['合同期限', /合同期限|劳动合同期限|固定期限|无固定期限/], ['工作内容与工作地点', /工作内容|工作地点|工作岗位|岗位职责/],
      ['工作时间与休息休假', /工作时间|休息休假|工时制|综合计算工时/], ['劳动报酬', /劳动报酬|工资标准|月工资|薪酬待遇|计件单价/],
      ['社会保险', /社会保险|五险|社保|工伤保险/], ['劳动保护与职业危害防护', /劳动保护|劳动条件|职业危害|防护用品/]];
    var hits = MUST.map(function (x) { return { name: x[0], ok: x[1].test(txt) }; });
    var miss = hits.filter(function (x) { return !x.ok; });
    var clauses = paras.filter(function (p) { return /^第[一二三四五六七八九十百]+条/.test(String(p).trim()); }).map(function (p) { return String(p).trim(); });
    var money = (txt.match(/[\d][\d,]{4,}\s*元/g) || []);
    var dates = (txt.match(/\d{4}\s*年\s*\d{1,2}\s*月(\s*\d{1,2}\s*日)?/g) || []);
    var penalty = /违约金|万分之|逾期.{0,6}(交付|付款|违约)/.test(txt);
    var lines = [(doc.kind === 'pdf' ? 'PDF' : 'Word') + '《' + doc.name + '》读完：条款 ' + clauses.length + ' 条' + ((doc.tables || []).length ? '、表 ' + doc.tables.length + ' 张' : '') + '，' + (doc.stats && doc.stats['字数'] ? doc.stats['字数'] + ' 字' : '')];
    lines.push('按劳动合同必备条款核对：命中 ' + (MUST.length - miss.length) + '/' + MUST.length + (miss.length ? '，缺' + miss.map(function (x) { return x.name; }).join('、') : ''));
    if (penalty) lines.push('文本里约定了逾期违约金；劳动合同只有培训服务期与竞业限制两种情形可以约定违约金，这条搬不过来');
    lines.push(miss.length === MUST.length ? '判定：商务合同文本，走不了用工合规这一套' : '判定：可按劳动合同继续核对，缺项补齐后入库');
    var kv = [];
    if (money.length) kv.push(['金额', money[0]]);
    if (dates.length) kv.push(['日期', dates[0]]);
    kv.push(['段落', (doc.paragraphs || []).length]);
    kv.push(['表格', (doc.tables || []).length + ' 张']);
    return { text: lines.join('。\n') + '。',
      blocks: [mini(['必备条款', '核对'], hits.map(function (x) { return [x.name, x.ok ? '有' : '缺']; })), clauses.length ? tagsb(clauses.slice(0, 4).map(function (c) { return cut(c, 12); })) : null, kvb(kv)],
      focus: M.step === 'compliance' ? rowOf(workEl(), 'H01') : null,
      act: function () {
        var body = [kvb(kv), mini(['必备条款', '核对'], hits.map(function (x) { return [x.name, x.ok ? '有' : '缺']; }))];
        var ul = h('ul', { class: 'm5-ul' }, clauses.map(function (c) { return h('li', {}, [c]); }));
        if (clauses.length) body.push(h('div', {}, [h('div', { class: 'm5-sub' }, ['读到的条款 ' + clauses.length + ' 条']), ul]));
        (doc.tables || []).slice(0, 1).forEach(function (t) { body.push(mini(t[0], t.slice(1))); });
        P.drawer(M.frame.body, { title: '文档核对 · ' + doc.name, sub: '劳动合同必备条款 ' + (MUST.length - miss.length) + '/' + MUST.length + ' · ' + doc.sizeText, body: body });
      } };
  }
  function docSheet(doc) {
    var s0 = (doc.sheets || [])[0];
    if (!s0 || !s0.rows.length) return null;
    var head = (s0.rows[0] || []).map(String);
    var MAP = [['工号', /工号|员工编号|人员编号/], ['岗位', /岗位|职务|工种/], ['工资', /工资|月薪|应发|薪酬/], ['社保基数', /缴费基数|社保基数|基数/], ['工时', /加班|工时|出勤/], ['入职日期', /入职|到岗|合同起/]];
    var hit = MAP.map(function (m) { return { name: m[0], ok: head.some(function (x) { return m[1].test(x); }) }; });
    var got = hit.filter(function (x) { return x.ok; });
    var rows = s0.rows.length - 1;
    var lines = ['Excel《' + doc.name + '》读完：' + doc.sheets.length + ' 张表、' + rows + ' 行数据，表头 ' + head.slice(0, 6).join(' / ')];
    if (got.length >= 3) {
      lines.push('命中花名册字段 ' + got.length + '/' + MAP.length + '：' + got.map(function (x) { return x.name; }).join('、') + '，可以进逐人核对');
    } else {
      lines.push('花名册字段命中 ' + got.length + '/' + MAP.length + '，这份表进不了逐人核对；核对要的列是 ' + MAP.map(function (x) { return x[0]; }).join(' / '));
      var pay = s0.rows.slice(1).filter(function (r) { return /职工薪酬|工资|社保|公积金/.test(r.join('')); });
      lines.push(pay.length ? '表里有 ' + pay.length + ' 行职工薪酬类科目，可与用工成本对一对' : '表里也没有职工薪酬类科目');
    }
    return { text: lines.join('。\n') + '。',
      blocks: [mini(['需要的列', '本表'], hit.map(function (x) { return [x.name, x.ok ? '有' : '无']; }))],
      act: function () {
        P.drawer(M.frame.body, { title: '表格解析 · ' + doc.name, sub: s0.name + ' · ' + rows + ' 行 × ' + head.length + ' 列 · ' + doc.sizeText,
          body: [mini(head, s0.rows.slice(1, 9)), mini(['需要的列', '本表'], hit.map(function (x) { return [x.name, x.ok ? '有' : '无']; }))] });
      } };
  }
  function docSlides(doc) {
    var txt = (doc.text || '').replace(/\s+/g, ' ');
    var m = txt.match(/收入[^0-9]{0,6}([\d,.]+)\s*万元/);
    var titles = (doc.slides || []).map(function (s) { return s.title || ''; }).filter(Boolean);
    if (!m) return { text: 'PPT《' + doc.name + '》读完：' + doc.slides.length + ' 页，标题「' + (titles[0] || '—') + '」。没读到收入口径，人力这边的人均产值不动。', blocks: [tagsb(titles.slice(0, 4))] };
    var rev = Math.round(parseFloat(m[1].replace(/,/g, '')) * 10000);
    var d = M.data, hc = d.employees.length;
    var before = M.R.cost, oldRev = d.profile.revenue12;
    var perNew = Math.round(rev / hc), shareNew = Math.round(1000 * before.annual / rev) / 10;
    return { text: 'PPT《' + doc.name + '》读到收入 ' + m[1] + ' 万元（' + (titles[0] || doc.slides[0].title) + '）。\n按这个口径重算：人均产值 ' + W(perNew) + '（原 ' + W(before.perCapitaRevenue) + '），用工成本占收入 ' + shareNew + '%（原 ' + before.share + '%）。\n已把收入口径改成文档里的数，六屏一起重算。',
      blocks: [kvb([['文档收入', m[1] + ' 万元'], ['原口径', W0(oldRev)], ['人均产值', W(perNew)], ['占收入', shareNew + '%']]), tagsb(titles.slice(0, 3))],
      act: function () {
        var d2 = K.ensure(M.data);
        d2.profile.revenue12 = rev;
        d2.log.push({ seq: d2.log.length + 1, kind: 'plan', label: '收入口径改按文档', detail: '《' + doc.name + '》' + m[1] + ' 万元 · 人均产值 ' + W(perNew) });
        if (M.step !== 'cost') { M.data = d2; recompute(); setStep('cost'); }
        else commit(d2, '收入口径已按《' + doc.name + '》重算');
      } };
  }
  function docMail(doc) {
    var ml = doc.mail || {}, txt = (doc.text || '').replace(/\s+/g, ' ');
    var money = (txt.match(/[\d][\d,.]{2,}\s*万元|[\d][\d,]{4,}\s*元/g) || []);
    var hr = /入职|离职|转正|调岗|加班|年假|社保|工资条|试用期/.test(txt);
    var lines = ['邮件《' + (ml.subject || doc.name) + '》读完：发件 ' + (ml.from || '—') + '，' + (ml.date || '') + '，正文 ' + (doc.stats && doc.stats['正文行'] ? doc.stats['正文行'] + ' 行' : '') + (money.length ? '，金额 ' + money.join('、') : '')];
    lines.push(hr ? '命中人事事项，已留到本屏待办' : '没有人事事项（入转调离 / 工时 / 假期 / 社保 / 薪酬），这一屏不动');
    return { text: lines.join('。\n') + '。',
      blocks: [kvb([['发件', ml.from || '—'], ['主题', cut(ml.subject || '—', 14)], ['日期', ml.date || '—'], ['附件', (ml.attaches || []).length + ' 个']])],
      act: function () { P.drawer(M.frame.body, { title: ml.subject || doc.name, sub: (ml.from || '—') + ' · ' + (ml.date || '') + ' · ' + doc.sizeText, body: [h('div', { class: 'pd-pre' }, [doc.text || ''])] }); } };
  }
  function onDoc(doc) {
    if (!doc || !doc.ok || !M.R) return null;
    var txt = (doc.text || '').replace(/\s+/g, ' ');
    if (doc.kind === 'word' || doc.kind === 'pdf' || doc.kind === 'text') {
      var rk = ['求职', '简历', '工作经历', '教育背景', '期望薪', '项目经验', '自我评价', '应聘'].filter(function (k2) { return txt.indexOf(k2) >= 0; });
      if (rk.length >= 2) return docResume(doc, txt);
      return docContract(doc, txt, (doc.paragraphs || []));
    }
    if (doc.kind === 'excel') return docSheet(doc);
    if (doc.kind === 'ppt') return docSlides(doc);
    if (doc.kind === 'eml') return docMail(doc);
    return null;
  }

  window.DGG.chatBrain('m5', {
    opener: function (step) { return opener(step); },
    suggest: function (step) { return suggest(step); },
    answer: function (q, step) { return answer(q, step); },
    onDoc: function (doc, step) { return onDoc(doc, step); }
  });

  window.DGG = window.DGG || {};
  window.DGG.registerModule('m5', { mount: mount, unmount: unmount, onCompany: onCompany, onIndustry: onIndustry });
})();
