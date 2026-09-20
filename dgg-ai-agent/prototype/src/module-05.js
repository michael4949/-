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
  var STEPS = ['connect', 'board', 'recruit', 'interview', 'compliance', 'cost'];
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
  /* 给表格行标上业务 id，内核的 {type:'focus'|'open', ref} 就能找到这一行 */
  function tagRefs(tbl, rows, textOf, refOf) {
    trs(tbl).forEach(function (tr) {
      var t = tr.textContent, i, s2;
      for (i = 0; i < rows.length; i++) { s2 = textOf(rows[i]); if (s2 && t.indexOf(s2) >= 0) { tr.setAttribute('data-ref', refOf ? refOf(rows[i]) : s2); return; } }
    });
  }
  function tagRef(el, ref) { if (el && el.setAttribute) el.setAttribute('data-ref', ref); return el; }
  function rowOf(scope, txt) {
    if (!scope) return null;
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
    if (STEPS.indexOf(M.step) < 0) M.step = 'connect';
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
  function needBlock(n, on, onClick, full) {
    if (!on && !full) return h('button', { class: 'nd slim', 'data-ref': n.id, onclick: onClick }, [
      h('div', { class: 'hd' }, [h('span', {}, [n.title]), h('span', { class: 'sp' }), h('span', { class: 'n' }, [n.count + ' 人 · 候选 ' + n.active]), P.chip(n.status === 'published' ? 'ok' : 'watch', n.status === 'published' ? '已发布' : '未发布')])
    ]);
    return h('button', { class: 'nd' + (on ? ' on' : ''), 'data-ref': n.id, onclick: onClick }, [
      h('div', { class: 'hd' }, [h('span', {}, [n.title]), h('span', { class: 'sp' }), P.chip(n.status === 'published' ? 'ok' : 'watch', n.status === 'published' ? '已发布' : '未发布')]),
      h('div', { class: 'kv' }, [h('span', {}, [n.count + ' 人 · ' + n.deptName]), h('span', {}, ['到岗 ' + short(n.dueDate) + '（' + n.dueDays + ' 天）']), h('span', {}, [fmtN(n.band[0]) + '–' + fmtN(n.band[1]) + ' 元'])]),
      h('div', { class: 'm5-stages' }, [['new', '新简历'], ['screened', '初筛'], ['interview', '面试'], ['done', '完成'], ['offer', 'offer']].map(function (s) { return h('span', { class: 'st' + (n.stages[s[0]] ? ' has' : '') }, [h('b', {}, [String(n.stages[s[0]])]), s[1]]); }))
    ]);
  }
  function currentNeed() { var R = M.R; if (!M.need || !R.needs.some(function (n) { return n.id === M.need; })) M.need = R.needs[0].id; return R.needs.filter(function (n) { return n.id === M.need; })[0]; }
  function topDept() { var l = M.R.org.byDept.slice().sort(function (a, b) { return (b.overtimeOver - a.overtimeOver) || (b.vacancy - a.vacancy); }); return l[0]; }
  function topRule() { var o = M.R.compliance.open; return o.length ? o[0] : M.R.compliance.items[0]; }

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
    tagRefs(tbl, O.byDept, function (x) { return x.name; }, function (x) { return x.id; });
    var cDept = P.card({ cls: 'c7', title: '部门盘点', sub: d.departments.length + ' 个 · 平均工资 ' + fmtN(O.avgWage) + ' 元', tight: true, body: [h('div', { class: 'pd-scroll', style: 'max-height:250px' }, [tbl])] });
    g.appendChild(cDept);
    var needs = h('div', { class: 'm5-needs' });
    R.needs.forEach(function (n) { needs.appendChild(needBlock(n, false, function () { M.need = n.id; M.filter = null; setStep('recruit'); }, true)); });
    var cNeed = P.card({ cls: 'c5', title: '招聘进度', sub: k.needs + ' 张 · ' + k.needCount + ' 人', body: [needs] });
    g.appendChild(cNeed);
    var risks = h('div', { class: 'pd-list' });
    comp.open.slice(0, 5).forEach(function (i) { risks.appendChild(tagRef(P.item({ tone: SEV[i.severity] === 'watch' ? 'hand' : SEV[i.severity], icon: i.id.slice(1), title: i.name, sub: i.cat, right: i.count + ' 人', rightSub: '预计 ' + W(i.impact), onClick: function () { M.rule = i.id; setStep('compliance'); } }), i.id)); });
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
    tagRefs(tbl, shown, function (c) { return c.id; });
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
    list.forEach(function (c) { il.appendChild(tagRef(P.item({ tone: c.stage === 'offer' ? 'ok' : c.stage === 'done' ? 'risk' : 'accent', icon: c.grade, title: c.id + ' · ' + c.jobTitle, sub: (c.interviewDate ? short(c.interviewDate) + ' · ' : '') + c.stageName, right: c.interview ? c.interview.avg + ' 分' : '待评', rightSub: c.offer ? fmtN(c.offer.salary) + ' 元' : '', onClick: function () { M.icand = c.id; M.scores = {}; draw(); } }), c.id)); });
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
    tagRefs(tbl, comp.items, function (i) { return i.id; });
    var cTbl = P.card({ cls: 'c7', title: '规则核对', sub: LIB.complianceRules.rules.length + ' 条 · 待处理 ' + comp.counts.open + ' 项', tight: true, body: [h('div', { class: 'pd-scroll', style: 'max-height:290px' }, [tbl])] });
    g.appendChild(cTbl);
    var aff = h('div', { class: 'm5-aff' });
    I.affected.slice(0, 5).forEach(function (a) { aff.appendChild(h('div', { class: 'a', 'data-ref': a.id }, [h('b', {}, [a.id]), h('span', { class: 'd' }, [h('span', { class: 'j' }, [a.job + ' · ' + a.dept]), a.detail]), h('span', { class: 'num' }, [a.amount ? fmtN(a.amount) + ' 元' : ''])])); });
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
    I.affected.forEach(function (a) { aff.appendChild(h('div', { class: 'a', 'data-ref': a.id }, [h('b', {}, [a.id]), h('span', { class: 'd' }, [h('span', { class: 'j' }, [a.job + ' · ' + a.dept]), a.detail]), h('span', { class: 'num' }, [a.amount ? fmtN(a.amount) + ' 元' : ''])])); });
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
    var cmp = P.compare({ active: M.plan, onPick: function (key) { M.plan = key; draw(); }, options: S.plans.map(function (p) { return { key: p.key, name: p.name, recommended: p.recommended, headline: { big: W(p.total12), sub: (p.delta >= 0 ? '+' : '−') + W(Math.abs(p.delta)) + ' 较现状', tone: p.key === 'C' ? 'ok' : '' }, rows: [{ k: '期末在编', v: p.endHeadcount + ' 人' }, { k: '新增招聘', v: p.hires + ' 人' }, { k: '缺编', v: p.vacancyAfter + ' 人', tone: p.vacancyAfter > 0 ? 'bad' : 'good' }, { k: '用工占收入', v: p.share + '%' }, { k: '人均产值', v: W(p.perCapitaRevenue) }], notes: K.planNote(R, p) }; }) });
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

  /* ================= 对话坞 · 内核大脑的落地 =================
     问答、开场发现、快捷问句、文档摄入全部走 DGG.coreM5 的 screens / brief / suggest / ask / ingest
     （与 skill 内核同一份实现）。这一段只做两件事：把当前上下文交出去，把内核返回的声明式动作落到页面上。 */
  function workEl() { return M.frame ? M.frame.work : null; }
  /* 选中态跟着数据一起交出去：内核只认入参 data 上的 focus，页面选了哪一条，回答就说哪一条。
     用浅副本挂上去，M.data 本身不动；取不到的字段留空，内核自己退回默认。 */
  function ctxData() {
    var d = {}, k;
    for (k in M.data) if (Object.prototype.hasOwnProperty.call(M.data, k)) d[k] = M.data[k];
    d.focus = { need: M.need, cand: M.cand, icand: M.icand, rule: M.rule, plan: M.plan, jdVariant: M.jdVariant, who: M.who };
    return d;
  }
  function refEl(ref) {
    var w = workEl();
    if (!w || ref == null) return null;
    var el = w.querySelector('[data-ref="' + String(ref) + '"]');
    if (el) return el;
    var dp = M.data.departments.filter(function (x) { return x.id === ref; })[0];
    return rowOf(w, dp ? dp.name : String(ref));            /* 表头排序后重绘过的行，退回按文本找 */
  }
  function refocus(ref, ms) { setTimeout(function () { var el = refEl(ref); if (el) anim().pulse(el, { ms: 2200, scroll: true }); }, ms || 80); }
  function refocusTop(sel) { setTimeout(function () { var w = workEl(); var tr = w && w.querySelector(sel); if (tr) anim().pulse(tr, { ms: 2200, scroll: true }); }, 80); }
  function docBody(list) {
    var out = [];
    (list || []).forEach(function (b) {
      if (b && b.type === 'text') { out.push(h('div', { class: 'pd-pre' }, [String(b.text == null ? '' : b.text)])); return; }
      var n = window.DGG.chat.block(b);
      if (n) out.push(n);
    });
    return out;
  }
  /* 文档摄入的写回：内核已经算好新数据副本，这里只管换屏、选中与提示 */
  function commitDoc(next) {
    if (next.focus) delete next.focus;                   /* 选中态只在调用时挂一次，不留在业务数据里 */
    var had = {};
    M.data.candidates.forEach(function (c) { had[c.id] = 1; });
    var added = next.candidates.filter(function (c) { return !had[c.id]; })[0];
    var revChanged = next.profile.revenue12 !== M.data.profile.revenue12;
    var last = next.log[next.log.length - 1];
    if (added) { M.need = added.needId; M.cand = added.id; M.filter = null; }
    if ((added && M.step !== 'recruit') || (!added && revChanged && M.step !== 'cost')) {
      M.data = next; recompute(); setStep(added ? 'recruit' : 'cost');
      return;
    }
    commit(next, last ? last.label + ' · ' + last.detail : null);
    if (added) refocus(added.id);
  }
  function openPanel(a) {
    var R = M.R;
    if (a.panel === 'rule') {
      if (!R.compliance.items.some(function (i) { return i.id === a.ref; })) return false;
      M.rule = a.ref;
      if (M.step !== 'compliance') setStep('compliance');
      else { draw(); refocus(a.ref); }
      return true;
    }
    if (a.panel === 'candidate') {
      var cc = R.byId[a.ref];
      if (!cc) return false;
      M.cand = cc.id; M.need = cc.needId; M.filter = null;
      if (M.step !== 'recruit') setStep('recruit');
      else { draw(); refocus(cc.id); }
      return true;
    }
    if (a.panel === 'jd') {
      var n = R.needs.filter(function (x) { return x.id === a.ref; })[0];
      if (!n) return false;
      if (M.need !== n.id) { M.need = n.id; M.cand = null; if (M.step === 'recruit') draw(); }
      jdDrawer(K.jd(M.data, n.id, LIB, M.jdVariant));
      return true;
    }
    if (a.panel === 'kit') {
      var c = R.byId[a.ref];
      if (!c) return false;
      M.icand = c.id;
      kitDrawer(K.interviewKit(M.data, c, LIB), c);
      return true;
    }
    if (a.panel === 'months') {
      var pn = R.sim.plans.filter(function (x) { return x.key === (a.ref || M.plan); })[0];
      if (!pn) return false;
      M.plan = pn.key; monthDrawer(pn, R.sim);
      return true;
    }
    if (a.panel === 'report') { reportDrawer(R); return true; }
    if (a.panel === 'doc') { P.drawer(M.frame.body, { title: a.title || a.ref, sub: a.sub, body: docBody(a.blocks) }); return true; }
    return false;
  }
  function applyAction(a) {
    var input = a.input || {};
    if (a.action === 'resolve-compliance') {
      var it = M.R.compliance.items.filter(function (i) { return i.id === input.rule; })[0];
      if (!it || it.status !== 'open') return false;
      M.rule = it.id;
      commit(K.resolve(M.data, it.id, LIB), it.id + ' ' + it.action.label);
      return true;
    }
    if (a.action === 'make-offer') {
      var c = M.R.byId[input.id];
      if (!c) return false;
      M.icand = c.id;
      commit(K.offer(M.data, c.id, input.salary, LIB), c.id + ' offer 已发，月薪 ' + fmtN(input.salary) + ' 元');
      return true;
    }
    if (a.action === 'adopt-plan') {
      if (!M.R.sim.plans.some(function (p) { return p.key === input.key; })) return false;
      M.plan = input.key;
      commit(K.adoptPlan(M.data, input.key, LIB), '已采纳方案 ' + input.key + '，月报已更新');
      return true;
    }
    return false;
  }
  /* 文档摄入：内核只给新数据副本（SPEC §12 不许 apply 指回 ingest 自己），并进页面由宿主做 */
  function takeDoc(doc, step) {
    var r = K.ingest(doc, step, ctxData(), LIB, M.R);            /* 与气泡里那次摄入同一个选中态 */
    if (!r || !r.data) return r;
    var nd = r.data;
    return { text: r.text, blocks: r.blocks, act: function () { commitDoc(nd); } };
  }
  function setParam(a) {
    if (a.path === 'filter') { M.filter = a.value; draw(); refocusTop('.pd-table tbody tr[data-ref^="C-"]'); return true; }
    if (a.path === 'plan') {
      if (!M.R.sim.plans.some(function (p) { return p.key === a.value; })) return false;
      M.plan = a.value; draw();
      return true;
    }
    return false;
  }

  window.DGG.chatBrain('m5', {
    kernel: window.DGG.coreM5,
    ctx: function () { return { data: ctxData(), lib: LIB, result: M.R }; },
    onDoc: takeDoc,
    act: function (a, api) {
      if (!a || !a.type || !M.R) return false;
      if (a.type === 'goto') {
        if (STEPS.indexOf(a.step) < 0) return false;
        if (a.step === 'recruit') M.filter = null;
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
  window.DGG.registerModule('m5', { mount: mount, unmount: unmount, onCompany: onCompany, onIndustry: onIndustry });
})();
