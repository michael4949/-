/* AI法务 · 合同 设立 知产 三件事（六屏）
 * 接入 → 法务驾驶舱 → 合同审查 → 新设主体 → 知识产权 → 台账与提醒
 * 全部计算走 DGG.coreM7（与 skill 同一份内核）；采纳修订 / 确认设立 / 续展与申请清单都写回同一份数据
 * 纯预制、断网可用；不用任何存储 API
 */
(function () {
  'use strict';
  var sh, $root, h, DATA, P, K, LIB;
  var ACCENT = window.DGG.PALETTE.m7;
  var CAPS = [['合同审查', '必备条款缺失 · 风险条款 · 修订建议 · 审查意见'], ['新设主体', '子公司 / 分公司 / 新公司 · 流程时间线 · 股权控制线'], ['知识产权', '商标专利到期与年费 · 布局缺口 · 近似与侵权线索'], ['台账与提醒', '合同 证照 知产 设立一本台账 · 90 天日历 · 月报到微信']];
  var LV = { high: 'late', mid: 'risk', low: 'ok' }, LV_NAME = { high: '高风险', mid: '中风险', low: '低风险' };
  var SEV = { high: 'late', mid: 'risk', low: 'watch' }, SEV_NAME = { high: '高', mid: '中', low: '低' };
  var IPK = { trademark: 'accent', patent: 'handled', software: 'done', domain: 'watch' };
  var TYPES = [['subsidiary', '子公司'], ['branch', '分公司'], ['newco', '新公司']];
  var PRESETS = [[70, 30], [60, 40], [51, 49], [50, 50]];
  var M = { step: 'connect', arche: null, data: null, R: null, contract: null, filter: null, regKind: null, charged: false, name: null, company: null, frame: null, who: 0 };

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
    M.data = base; M.contract = null; M.filter = null; M.regKind = null;
    recompute();
  }
  function recompute() { M.R = K.run(M.data, LIB); }
  function commit(data, msg) { M.data = data; recompute(); draw(); if (msg && M.frame) P.toast(M.frame.body, msg); }
  function fmtN(n) { return P.fmtN(n); }
  function W(n) { return K.fmtW(n); }
  function short(s) { return K.short(s); }

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
  function unmount() { }
  function onCompany(c) { M.company = c; M.name = c ? c.name : null; M.charged = false; loadArche(c ? archeOf(c.industry) : archeOf(sh.displayIndustryDefault())); if (M.step !== 'connect') setStep('connect'); else draw(); }
  function onIndustry(slug) { if (M.step !== 'connect' || !slug) return; var a = archeOf(slug); if (a !== M.arche) { loadArche(a); draw(); } }
  function setStep(s) { M.step = s; sh.go('m7', s); }

  function draw() {
    sh.clear($root);
    var R = M.R, c = M.company, k = R.kpi;
    var meta = c ? [sh.industryNameOf(c.industry), sh.optText('size', c.size)].filter(Boolean).join(' · ') : (LIB.ipClasses.byIndustry[M.data.profile.industry] ? '' : '');
    var tabs = [{ key: 'connect', label: '接入' }, { key: 'board', label: '法务驾驶舱' }, { key: 'contracts', label: '合同审查', badge: k.highRisk || 0 }, { key: 'setup', label: '新设主体' }, { key: 'ip', label: '知识产权', badge: k.ipUrgent || 0 }, { key: 'register', label: '台账与提醒', badge: k.overdue || 0 }];
    var F = P.frame({ mark: '法务', accent: ACCENT, modules: P.navModules('m7'), crumbs: ['AI法务', tabs.filter(function (t) { return t.key === M.step; })[0].label], company: { name: M.data.company, meta: meta }, tabs: tabs, active: M.step, chat: { id: 'm7', name: 'AI法务', step: M.step, onGo: setStep },
      onTab: function (key) { if (key === 'board' && !M.charged) enterBoard(); else setStep(key); } });
    M.frame = F; $root.appendChild(F.root);
    if (M.step === 'board' && !M.charged) { M.charged = true; sh.charge(K.CREDITS); }
    ({ connect: screenConnect, board: screenBoard, contracts: screenContracts, setup: screenSetup, ip: screenIp, register: screenRegister })[M.step](F.work);
  }
  function enterBoard() { setStep('board'); }
  function col(cls, kids) { return h('div', { class: cls, style: 'display:flex;flex-direction:column;gap:16px' }, kids); }
  function levelChip(lv) { return P.chip(LV[lv], LV_NAME[lv]); }
  function sevChip(s) { return P.chip(SEV[s], SEV_NAME[s] + '风险'); }
  function logList(log) { var el = h('div', { class: 'm7-log' }); log.forEach(function (l) { el.appendChild(h('div', { class: 'l' }, [h('span', { class: 'n' }, [String(l.seq)]), h('b', {}, [l.label]), h('span', {}, [l.detail])])); }); return el; }
  function ipCount(d) { return d.ip.trademarks.length + d.ip.patents.length + d.ip.software.length + (d.ip.domains || []).length; }
  function regGroup(it) { return it.kind === 'milestone' ? 'contract' : it.kind; }
  function jump(it) {
    if (it.kind === 'contract' || it.kind === 'milestone') { M.contract = it.ref; setStep('contracts'); }
    else if (it.kind === 'ip') setStep('ip');
    else if (it.kind === 'setup') setStep('setup');
    else if (it.kind === 'license') {
      var l = M.R.licenses.filter(function (x) { return x.id === it.ref; })[0]; if (!l) return;
      P.drawer(M.frame.body, { title: l.name, sub: l.issuer + (l.no ? ' · ' + l.no : ''), body: [P.kv([['状态', l.stateName], ['到期', l.expiry ? l.expiry + '（' + l.daysLeft + ' 天）' : '长期有效'], ['发证机关', l.issuer]]), h('div', { class: 'pd-pre', style: 'margin-top:8px' }, ['到期前 60 天启动换证：准备近期检测报告与整改记录，向 ' + l.issuer + ' 提交延续申请；换证期间原证继续有效。'])], actions: [P.btn('发送提醒到微信', { cls: 'primary', onClick: function () { sh.setQrReady(true); sh.showWeChat(); } })] });
    }
  }

  /* ---------- 屏 1 ---------- */
  function screenConnect(work) {
    var d = M.data, R = M.R, k = R.kpi, pf = d.profile, CR = LIB.contractRules;
    work.classList.add('m7-connect');
    var g = h('div', { class: 'pd-grid' });
    var nameIn = h('input', { type: 'text', value: d.company, oninput: function (e) { M.name = e.target.value; d.company = e.target.value; var co = M.frame.root.querySelector('.pd-top .co span:nth-child(2)'); if (co) co.textContent = e.target.value; } });
    g.appendChild(P.card({ cls: 'c4', title: '企业', body: [h('div', { class: 'pd-form' }, [
      h('div', { class: 'pd-field' }, [h('label', {}, ['企业名称']), nameIn]),
      h('div', { class: 'pd-field' }, [h('label', {}, ['行业']), h('div', { style: 'font-weight:600' }, [M.company ? sh.industryNameOf(M.company.industry) + (M.company.size ? ' · ' + sh.optText('size', M.company.size) : '') : sh.industryNameOf(sh.displayIndustryDefault())])]),
      h('div', { class: 'pd-field' }, [h('label', {}, ['主体信息']), h('div', { style: 'font-weight:600' }, [(pf.founded ? '成立 ' + pf.founded.slice(0, 4) + ' 年 · ' : '') + '注册资本 ' + W(pf.capital) + (pf.province ? ' · ' + pf.province : '')])]),
      h('div', { class: 'pd-field' }, [h('label', {}, ['已有数据']), h('div', { style: 'font-weight:600' }, ['合同 ' + d.contracts.length + ' 份 · 证照 ' + d.licenses.length + ' 项 · 知产 ' + ipCount(d) + ' 项'])])
    ])] }));
    var caps = h('div'); CAPS.forEach(function (c, i) { caps.appendChild(h('div', { class: 'cap-row' }, [h('span', { class: 'ic' }, ['0' + (i + 1)]), h('div', {}, [h('div', { class: 't' }, [c[0]]), h('div', { class: 's' }, [c[1]])]), P.chip('ok', '已开通')])); });
    g.appendChild(P.card({ cls: 'c4', title: '已开通能力', sub: '4 项', body: [caps], foot: ['合同、设立、知产三件事，全部进同一本台账'] }));
    var srcs = h('div'); d.sources.forEach(function (s) { srcs.appendChild(h('div', { class: 'src-row' }, [h('div', {}, [h('div', { class: 't' }, [s.name]), h('div', { class: 's' }, ['同步 ' + s.lastSync + ' · ' + fmtN(s.rows) + ' 条'])]), P.chip(s.mode === 'direct' ? 'ok' : 'watch', s.mode === 'direct' ? '系统直连' : '表格导入'), h('span', { class: 'pd-dot ' + (s.mode === 'direct' ? 'ok' : 'risk') })])); });
    g.appendChild(P.card({ cls: 'c4', title: '数据源', sub: d.sources.length + ' 个', body: [srcs], foot: ['审查规则 ' + CR.risks.length + ' 条 · 条款模板 ' + Object.keys(CR.templates).length + ' 个 · 覆盖 ' + Object.keys(CR.types).length + ' 类合同'] }));
    g.appendChild(h('div', { class: 'c12 go' }, [h('div', {}, [h('div', { class: 't' }, ['法务驾驶舱']), h('div', { class: 's' }, ['合同 ' + k.contracts + ' 份 · 高风险 ' + k.highRisk + ' · 30 天内到期 ' + k.due30 + ' 项 · 待续展 / 缴费 ' + k.ipUrgent + ' 项'])]), h('div', { class: 'sp' }), h('div', { class: 'cr' }, [h('b', { class: 'num' }, [String(K.CREDITS)]), ' 积分 / 次']), P.btn('进入法务驾驶舱', { cls: 'primary big', onClick: enterBoard })]));
    work.appendChild(g);
  }

  /* ---------- 屏 2 ---------- */
  function screenBoard(work) {
    var R = M.R, k = R.kpi, d = M.data, S = R.setup, reg = R.register;
    work.classList.add('m7-board');
    var g = h('div', { class: 'pd-grid' });
    g.appendChild(h('div', { class: 'c12' }, [P.kpis([
      { label: '合规分', value: k.compliance, tone: k.compliance >= 80 ? 'ok' : k.compliance >= 60 ? 'risk' : 'late', sub: '合同 40% · 证照 30% · 商标布局 30%' },
      { label: '合同', value: k.contracts, unit: '份', sub: '审查中 ' + k.inReview + ' · 平均风险分 ' + k.avgScore, onClick: function () { M.filter = null; setStep('contracts'); } },
      { label: '高风险合同', value: k.highRisk, unit: '份', tone: k.highRisk ? 'late' : 'ok', sub: '中风险 ' + k.midRisk, onClick: function () { M.filter = 'high'; setStep('contracts'); } },
      { label: '待处理问题', value: k.findingsOpen, unit: '处', tone: 'accent', sub: '已采纳修订 ' + k.revised + ' 处', onClick: function () { M.filter = null; setStep('contracts'); } },
      { label: '30 天内到期', value: k.due30, unit: '项', tone: k.due30 ? 'risk' : 'ok', sub: k.overdue ? '逾期 ' + k.overdue + ' 项' : '无逾期', onClick: function () { M.regKind = null; setStep('register'); } },
      { label: '证照待办', value: k.licDue, unit: '项', tone: k.licDue ? 'risk' : 'ok', sub: '共 ' + k.licTotal + ' 项' },
      { label: '知产待续展 / 缴费', value: k.ipUrgent, unit: '项', tone: k.ipUrgent ? 'risk' : 'ok', sub: '共 ' + k.ipAssets + ' 项资产', onClick: function () { setStep('ip'); } },
      { label: '商标布局覆盖', value: k.coverage, unit: '%', tone: k.coverage >= 70 ? 'ok' : 'risk', sub: '缺口 ' + k.ipGaps + ' 类', onClick: function () { setStep('ip'); } }
    ])]));
    var tbl = P.table({ compact: true, cols: [
      { key: 'id', label: '合同', render: function (c) { return h('span', {}, [h('b', { class: 'id' }, [c.id]), h('span', { class: 'sub' }, [c.title])]); } },
      { key: 'party', label: '相对方', render: function (c) { return h('span', {}, [c.party, h('span', { class: 'sub' }, [c.typeName + ' · ' + c.roleName])]); } },
      { key: 'score', label: '风险分', align: 'r', sort: true, render: function (c) { return P.bar(c.score, LV[c.level], c.score + ''); } },
      { key: 'level', label: '等级', render: function (c) { return levelChip(c.level); } },
      { key: 'findings', label: '问题', render: function (c) { return h('span', {}, [h('span', { class: c.review.counts.high ? 'neg' : '' }, ['高 ' + c.review.counts.high]), ' · 中 ' + c.review.counts.mid + ' · 低 ' + c.review.counts.low]); } },
      { key: 'status', label: '状态', render: function (c) { return P.chip(c.status === '审查中' ? 'watch' : 'ok', c.status); } }
    ], rows: R.contracts.slice(0, 6), rowKey: function (c) { return c.id; }, onRow: function (c) { M.contract = c.id; M.filter = null; setStep('contracts'); } });
    g.appendChild(P.card({ cls: 'c7', title: '合同风险榜', sub: '风险分最低的 6 份 · 点一行看逐条审查', tight: true, body: [tbl], extra: [P.btn('全部合同', { cls: 'sm', onClick: function () { M.filter = null; setStep('contracts'); } })] }));
    var right = col('c5', []);
    var lic = h('div', { class: 'pd-list' });
    R.licenses.slice().sort(function (a, b) { return (a.daysLeft == null ? 9999 : a.daysLeft) - (b.daysLeft == null ? 9999 : b.daysLeft); }).slice(0, 4).forEach(function (l) { lic.appendChild(P.item({ tone: l.state === 'ok' ? 'ok' : l.state === 'due' ? 'risk' : 'late', icon: '证', title: l.name, sub: l.issuer + (l.no ? ' · ' + l.no : ''), right: l.expiry ? short(l.expiry) : '长期', rightSub: l.state === 'ok' ? (l.expiry ? l.daysLeft + ' 天' : '') : l.stateName, onClick: function () { jump({ kind: 'license', ref: l.id }); } })); });
    right.appendChild(P.card({ title: '证照', sub: k.licTotal + ' 项 · 按到期先后 · 到期前 60 天提醒', body: [lic], extra: [P.btn('台账', { cls: 'sm', onClick: function () { M.regKind = 'license'; setStep('register'); } })] }));
    var ipl = h('div', { class: 'pd-list' });
    R.ip.assets.filter(function (a) { return a.urgent; }).slice(0, 3).forEach(function (a) { ipl.appendChild(P.item({ tone: a.listed ? 'hand' : a.daysLeft <= 30 ? 'late' : 'risk', icon: '知', title: a.title, sub: a.kindName + ' · ' + a.dueLabel + ' · ' + a.action, right: short(a.due), rightSub: a.listed ? '已列入清单' : a.daysLeft + ' 天 · ' + fmtN(a.fee) + ' 元', onClick: function () { setStep('ip'); } })); });
    if (!R.ip.assets.some(function (a) { return a.urgent; })) ipl.appendChild(P.empty('近 60 天无需续展或缴费'));
    right.appendChild(P.card({ title: '知产待办', sub: '续展 / 年费 / 域名', body: [ipl] }));
    g.appendChild(right);
    var todo = h('div', { class: 'pd-list' });
    reg.overdue.concat(reg.due30).slice(0, 6).forEach(function (it) { todo.appendChild(P.item({ tone: it.tone === 'accent' ? 'accent' : it.tone === 'ok' ? 'ok' : it.tone, icon: P.KIND_ICON[it.kind], title: it.title, sub: it.kindName + ' · ' + it.sub, right: it.label, rightSub: it.daysLeft < 0 ? '逾期 ' + (-it.daysLeft) + ' 天' : it.daysLeft === 0 ? '今天' : it.daysLeft + ' 天后', onClick: function () { jump(it); } })); });
    if (!reg.overdue.length && !reg.due30.length) todo.appendChild(P.empty('30 天内无到期事项'));
    g.appendChild(P.card({ cls: 'c7', title: '近 30 天待办', sub: '逾期 ' + reg.counts.overdue + ' · 30 天内 ' + reg.counts.due30 + ' · 合同 证照 知产 设立', body: [todo], extra: [P.btn('全部台账', { cls: 'sm', onClick: function () { M.regKind = null; setStep('register'); } })] }));
    g.appendChild(P.card({ cls: 'c5', title: '新设主体', sub: S.typeName, accent: true, body: [
      P.kv([['名称', S.name], ['地区', S.region], ['注册资本', S.capital ? W(S.capital) : null], ['启动', short(S.startDate)], ['预计完成', short(S.endDate) + ' · ' + S.totalDays + ' 天 · ' + S.steps.length + ' 个节点'], ['股权', S.equity ? S.equity.holders.map(function (x) { return x.holder + ' ' + x.pct + '%'; }).join(' / ') + ' · ' + S.equity.control : '总公司全资'], ['许可', S.licenses.length ? S.licenses.join('、') : '不涉及']]),
      h('div', { style: 'margin-top:10px' }, [S.confirmed ? P.chip('ok', '方案已确认 · 节点已进台账') : P.chip('watch', '方案待确认')])
    ], foot: [P.btn('看方案', { cls: 'sm', onClick: function () { setStep('setup'); } }), S.confirmed ? null : P.btn('确认方案', { cls: 'primary sm', onClick: function () { commit(K.confirmSetup(d, LIB), '方案已确认，' + S.steps.length + ' 个节点已进台账'); } })] }));
    if (d.log.length) g.appendChild(P.card({ cls: 'c12', title: '本期动作', sub: d.log.length + ' 条', body: [logList(d.log.slice(-6).reverse())] }));
    work.appendChild(g);
  }

  /* ---------- 屏 3 ---------- */
  function screenContracts(work) {
    var R = M.R, d = M.data, rows = R.contracts, f = M.filter;
    work.classList.add('m7-contracts');
    var shown = rows.filter(function (c) { return f === 'high' ? c.level === 'high' : f === 'mid' ? c.level === 'mid' : f === 'low' ? c.level === 'low' : f === 'review' ? c.status === '审查中' : f === 'revised' ? c.revisions.length > 0 : true; });
    if (!M.contract || !R.byId[M.contract]) M.contract = (shown[0] || rows[0]).id;
    var C = R.byId[M.contract], raw = d.contracts.filter(function (x) { return x.id === C.id; })[0];
    var g = h('div', { class: 'pd-grid' });
    var filt = function (key) { return function () { M.filter = M.filter === key ? null : key; draw(); }; };
    var cnt = function (lv) { return rows.filter(function (c) { return c.level === lv; }).length; };
    g.appendChild(h('div', { class: 'c12' }, [P.kpis([
      { label: '合同', value: rows.length, unit: '份', onClick: filt(null), active: !f }, { label: '高风险', value: cnt('high'), unit: '份', tone: 'late', onClick: filt('high'), active: f === 'high' },
      { label: '中风险', value: cnt('mid'), unit: '份', tone: 'risk', onClick: filt('mid'), active: f === 'mid' }, { label: '低风险', value: cnt('low'), unit: '份', tone: 'ok', onClick: filt('low'), active: f === 'low' },
      { label: '审查中', value: rows.filter(function (c) { return c.status === '审查中'; }).length, unit: '份', onClick: filt('review'), active: f === 'review' },
      { label: '已修订', value: rows.filter(function (c) { return c.revisions.length; }).length, unit: '份', tone: 'accent', sub: '采纳 ' + R.kpi.revised + ' 处', onClick: filt('revised'), active: f === 'revised' }
    ])]));
    var tbl = P.table({ compact: true, cols: [
      { key: 'id', label: '合同', render: function (c) { return h('span', {}, [h('b', { class: 'id' }, [c.id]), h('span', { class: 'sub' }, [c.title])]); } },
      { key: 'party', label: '相对方', sort: true, render: function (c) { return h('span', {}, [c.party, h('span', { class: 'sub' }, [c.typeName + ' · ' + c.roleName.replace('我方为', '')])]); } },
      { key: 'amount', label: '金额', align: 'r', sort: true, render: function (c) { return c.amount ? W(c.amount) : '—'; } },
      { key: 'score', label: '风险分', align: 'r', sort: true, render: function (c) { return P.bar(c.score, LV[c.level], c.score + ''); } },
      { key: 'level', label: '等级', render: function (c) { return levelChip(c.level); } },
      { key: 'findings', label: '问题', render: function (c) { return h('span', {}, [h('span', { class: c.review.counts.high ? 'neg' : '' }, ['高 ' + c.review.counts.high]), ' 中 ' + c.review.counts.mid + ' 低 ' + c.review.counts.low]); } },
      { key: 'endDays', label: '到期', align: 'r', sort: true, render: function (c) { return h('span', {}, [short(c.end), h('span', { class: 'sub' }, [c.endDays + ' 天'])]); } },
      { key: 'status', label: '状态', render: function (c) { return h('span', {}, [P.chip(c.status === '审查中' ? 'watch' : 'ok', c.status), c.revisions.length ? P.chip('handled', '修订 ' + c.revisions.length) : null]); } }
    ], rows: shown, sortKey: 'score', sortDir: 'asc', rowKey: function (c) { return c.id; }, activeKey: M.contract, onRow: function (c) { M.contract = c.id; draw(); } });
    var hiAll = rows.reduce(function (t, c) { return t + c.review.counts.high; }, 0);
    g.appendChild(P.card({ cls: 'c7', title: '合同台账', sub: shown.length + ' 份' + (f ? ' · 已筛选' : '') + ' · 按风险分排序 · 点一行看逐条审查', tight: true, body: [h('div', { class: 'pd-scroll', style: 'max-height:640px' }, [tbl])], extra: [hiAll ? P.btn('采纳全部高风险修订 ' + hiAll + ' 处', { cls: 'primary sm', onClick: function () { var cur = d; rows.forEach(function (c) { c.findings.filter(function (x) { return x.severity === 'high'; }).forEach(function (x) { cur = K.applyFix(cur, c.id, x.id, LIB); }); }); M.filter = null; commit(cur, '已采纳 ' + hiAll + ' 处高风险修订，风险分已重算'); } }) : null] }));
    // 焦点合同
    var fl = h('div', { class: 'm7-findings' });
    C.findings.forEach(function (x) {
      fl.appendChild(h('div', { class: 'f ' + x.severity }, [
        h('div', { class: 'h' }, [sevChip(x.severity), h('span', {}, [(x.clauseNo ? '第 ' + x.clauseNo + ' 条 ' : '缺少 ') + x.clauseTitle]), h('span', { class: 'sp' }), P.chip(x.kind === 'missing' ? 'late' : 'watch', x.kind === 'missing' ? '缺失' : x.id, true)]),
        h('div', { class: 'issue' }, [x.issue]),
        h('div', { class: 'basis' }, ['依据：' + x.basis]),
        x.fix ? h('div', { class: 'fix' }, [h('span', {}, [h('span', { class: 'lb' }, [x.fix.mode === 'insert' ? '新增' : '修订为']), x.fix.text]), P.btn('采纳', { cls: 'primary sm', onClick: function () { commit(K.applyFix(d, C.id, x.id, LIB), C.id + ' 已' + (x.fix.mode === 'insert' ? '新增' : '修订') + '「' + x.fix.title + '」，风险分已重算'); } })]) : null
      ]));
    });
    var revEl = null;
    if (C.revisions.length) { revEl = h('div', { class: 'm7-rev' }); C.revisions.forEach(function (r) { revEl.appendChild(h('div', { class: 'r' }, [P.chip('handled', r.mode === 'insert' ? '新增' : '修订'), h('b', {}, ['第 ' + r.clauseNo + ' 条 ' + r.title]), h('span', {}, [r.findingId])])); }); }
    var openOpinion = function () { var op = K.opinion(raw, C.review, LIB); P.drawer(M.frame.body, { title: '审查意见 · ' + C.id, sub: C.title + ' · ' + C.party, body: [h('div', { class: 'pd-pre' }, [op.text])], actions: [P.btn('发送到微信', { cls: 'primary', onClick: function () { sh.setQrReady(true); sh.showWeChat(); } })] }); };
    var openClauses = function () {
      var list = h('div', { class: 'm7-clauses' });
      C.clauses.forEach(function (k) { list.appendChild(h('div', { class: 'k' + (k.revised ? ' rev' : '') }, [h('div', { class: 'h' }, [h('span', { class: 'no' }, [k.no]), h('span', {}, [k.title]), h('span', { class: 'sp' }), k.inserted ? P.chip('handled', '新增') : k.revised ? P.chip('handled', '已修订') : null]), k.before ? h('div', { class: 'tx before' }, [k.before]) : null, h('div', { class: 'tx' + (k.revised ? ' after' : '') }, [k.text])])); });
      P.drawer(M.frame.body, { title: C.id + ' 条款全文', sub: C.title + ' · ' + C.clauses.length + ' 条' + (C.revisions.length ? ' · 已修订 ' + C.revisions.length + ' 处' : ''), body: [list], actions: [P.btn('审查意见', { onClick: function () { openOpinion(); } }), P.btn('发送到微信', { cls: 'primary', onClick: function () { sh.setQrReady(true); sh.showWeChat(); } })] });
    };
    var right = col('c5', [P.card({ title: C.id + ' ' + C.title, sub: C.party + ' · ' + C.typeName + ' · ' + C.roleName, accent: true, body: [
      h('div', { class: 'm7-chead' }, [levelChip(C.level), h('span', { class: 'm' }, [h('b', { class: 'num score ' + LV[C.level] }, [String(C.score)]), h('span', {}, ['风险分'])]), h('span', { class: 'm' }, [h('b', { class: 'num' }, [String(C.findings.length)]), h('span', {}, ['待处理'])]), h('span', { class: 'm' }, [h('b', { class: 'num' }, [C.amount ? W(C.amount) : '—']), h('span', {}, ['金额'])]), h('span', { class: 'm' }, [h('b', { class: 'num' }, [short(C.start) + ' 至 ' + short(C.end)]), h('span', {}, ['期限'])])]),
      C.findings.length ? fl : P.judge({ verdict: { tone: 'ok', chip: '可签署', text: '未发现需要修订的条款，可按现稿签署' } }),
      revEl ? h('div', { style: 'margin-top:12px;font-weight:700' }, ['已采纳修订 ' + C.revisions.length + ' 处']) : null, revEl
    ], foot: [P.btn('审查意见', { cls: 'primary sm', onClick: openOpinion }), P.btn('条款全文', { cls: 'sm', onClick: openClauses }), C.milestones.length ? h('span', {}, ['履约节点 ' + C.milestones.map(function (m) { return short(m.date) + ' ' + m.text; }).join('；')]) : null] })]);
    g.appendChild(right);
    work.appendChild(g);
  }

  /* ---------- 屏 4 ---------- */
  function screenSetup(work) {
    var R = M.R, d = M.data, S = R.setup, E = LIB.setupRules, s = d.setup;
    work.classList.add('m7-setup');
    var patch = function (p, msg) { commit(K.updateSetup(d, p), msg || '方案已更新，待确认'); };
    var g = h('div', { class: 'pd-grid' });
    g.appendChild(h('div', { class: 'c12' }, [P.kpis([
      { label: '办理总天数', value: S.totalDays, unit: '天', tone: 'accent', sub: short(S.startDate) + ' 启动 → ' + short(S.endDate) + ' 完成' },
      { label: '节点', value: S.steps.length, unit: '个', sub: S.licenses.length ? S.licenses.length + ' 项许可并行办理' : '登记流程' },
      { label: '材料', value: S.materials.length, unit: '项' },
      { label: '控制', value: S.equity ? S.equity.control : '总公司全资', tone: S.equity ? (S.equity.deadlock ? 'late' : S.equity.control === '绝对控制' ? 'ok' : S.equity.control === '无控制方' ? 'late' : 'risk') : 'ok', sub: S.equity ? '第一大股东 ' + Math.round(S.equity.top * 100) + '%' : S.typeDesc },
      { label: '预计费用', value: fmtN(S.fees.total), unit: '元', sub: S.fees.note },
      { label: '方案状态', value: S.confirmed ? '已确认' : '待确认', tone: S.confirmed ? 'ok' : 'risk', sub: S.confirmed ? S.steps.length + ' 个节点已进台账' : '确认后节点进台账' }
    ])]));
    // 输入
    var typeChips = h('div', { class: 'chips' }, TYPES.map(function (t) { return h('button', { class: s.type === t[0] ? 'on' : '', onclick: function () { if (s.type !== t[0]) patch({ type: t[0] }, '主体类型改为' + t[1] + '，流程已重排'); } }, [t[1]]); }));
    var form = [h('div', { class: 'pd-field' }, [h('label', {}, ['主体类型']), typeChips, h('div', { class: 'hint' }, [S.typeDesc])]),
      h('div', { class: 'pd-field' }, [h('label', {}, ['名称']), h('input', { type: 'text', value: s.name, onchange: function (e) { patch({ name: e.target.value }); } })]),
      h('div', { class: 'pd-field' }, [h('label', {}, ['地区']), h('input', { type: 'text', value: s.region || '', onchange: function (e) { patch({ region: e.target.value }); } })])];
    if (s.type !== 'branch') {
      form.push(h('div', { class: 'pd-field' }, [h('label', {}, ['注册资本（元）']), h('input', { type: 'number', value: s.capital || 0, onchange: function (e) { patch({ capital: +e.target.value || 0 }); } })]));
      var shares = s.shares && s.shares.length ? s.shares : [{ holder: d.company, pct: 100 }];
      var sh2 = h('div');
      shares.forEach(function (x, i) { sh2.appendChild(h('div', { class: 'share' }, [h('input', { type: 'text', value: x.holder, onchange: function (e) { var n = clone(shares); n[i].holder = e.target.value; patch({ shares: n }); } }), h('input', { type: 'number', value: x.pct, min: 0, max: 100, onchange: function (e) { var n = clone(shares); n[i].pct = +e.target.value || 0; patch({ shares: n }); } })])); });
      var pre = h('div', { class: 'presets' }, PRESETS.map(function (p) { var on = shares.length >= 2 && shares[0].pct === p[0] && shares[1].pct === p[1]; return h('button', { class: on ? 'on' : '', onclick: function () { var n = clone(shares); if (n.length < 2) n.push({ holder: '合作方', pct: 0 }); n[0].pct = p[0]; n[1].pct = p[1]; for (var j = 2; j < n.length; j++) n[j].pct = 0; patch({ shares: n }, '股权结构改为 ' + p[0] + ' / ' + p[1] + '，控制线已重算'); } }, [p[0] + ' / ' + p[1]]); }));
      form.push(h('div', { class: 'pd-field' }, [h('label', {}, ['股权结构（%）']), sh2, pre, S.equity && !S.equity.totalOk ? h('div', { class: 'hint', style: 'color:var(--t-late)' }, ['合计 ' + S.equity.total + '%，应为 100%']) : null]));
    }
    var licChips = h('div', { class: 'chips' }, Object.keys(E.licenses).map(function (n) { var on = (s.licenses || []).indexOf(n) >= 0; return h('button', { class: on ? 'on' : '', onclick: function () { var l = (s.licenses || []).slice(); if (on) l.splice(l.indexOf(n), 1); else l.push(n); patch({ licenses: l }, on ? '已移除' + n : '已加入' + n + '，约 ' + E.licenses[n].days + ' 天并行办理'); } }, [n]); }));
    form.push(h('div', { class: 'pd-field' }, [h('label', {}, ['经营范围涉及的许可']), licChips]));
    form.push(h('div', { class: 'pd-field' }, [h('label', {}, ['启动日期']), h('input', { type: 'text', value: s.startDate || d.today, onchange: function (e) { if (/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)) patch({ startDate: e.target.value }); else draw(); } })]));
    if (s.reason) form.push(h('div', { class: 'pd-field' }, [h('label', {}, ['设立理由']), h('div', { class: 'reason' }, [s.reason])]));
    g.appendChild(P.card({ cls: 'c4', title: '方案输入', sub: '改一项，时间线与控制线即时重算', body: [h('div', { class: 'pd-form' }, form)], foot: [S.confirmed ? P.chip('ok', '已确认') : P.btn('确认方案', { cls: 'primary', onClick: function () { commit(K.confirmSetup(d, LIB), '方案已确认，' + S.steps.length + ' 个节点已进台账'); } }), P.btn('看台账', { cls: 'sm', onClick: function () { M.regKind = 'setup'; setStep('register'); } })] }));
    var right = col('c8', []);
    // 股权控制线
    if (S.equity) {
      var eq = S.equity, holders = h('div', { class: 'm7-holders' });
      eq.holders.forEach(function (x, i) { holders.appendChild(h('div', { class: 'hr' }, [h('span', { class: 'n' }, [x.holder, h('span', { class: 'sub' }, [i === 0 ? '第一大股东' : i === 1 ? '第二大股东' : '其他股东', x.platform ? ' · 员工持股平台' : ''])]), P.bar(x.pct, i === 0 ? (eq.deadlock ? 'late' : 'ok') : x.pct >= E.equity.veto * 100 ? 'risk' : undefined, x.pct + '%')])); });
      var lines = h('div', { class: 'm7-lines' });
      eq.lines.forEach(function (l) { lines.appendChild(h('div', { class: 'ln' + (l.met ? ' met' : '') }, [P.chip(l.met ? (l.key === 'veto' ? 'risk' : 'ok') : 'done', l.met ? (l.key === 'veto' ? (l.holder || '') + ' 达到' : '达到') : '未达'), h('span', { class: 'l' }, [l.label + ' · ' + l.pct + '%']), h('span', { class: 't' }, [l.text])])); });
      right.appendChild(P.card({ title: '股权控制线', sub: eq.control + (eq.deadlock ? ' · 两方各半' : ''), body: [
        eq.deadlock ? P.judge({ verdict: { tone: 'late', chip: '僵局', text: E.equity.notes.deadlock } }) : null,
        h('div', { style: eq.deadlock ? 'margin-top:12px' : '' }, [holders]), lines,
        h('div', { style: 'margin-top:12px;font-weight:700' }, ['章程要点']), h('ul', { class: 'm7-ul' }, eq.charter.map(function (t) { return h('li', {}, [t]); }))
      ] }));
    } else {
      right.appendChild(P.card({ title: '主体说明', sub: S.typeName, body: [P.judge({ verdict: { tone: 'ok', chip: '总公司全资', text: S.typeDesc }, reasons: S.risks.map(function (r) { return r.text; }) })] }));
    }
    // 时间线（周为单位）
    var offset = K.days(d.weekStart, S.startDate), nWeeks = Math.ceil((offset + S.totalDays) / 7) + 1;
    var weeks = []; for (var w = 0; w < nWeeks; w++) weeks.push({ label: short(K.dateOf(d.weekStart, w * 7)) });
    var rowsG = S.steps.map(function (st, i) { return { label: st.order + '. ' + st.title, sub: st.days + ' 天 · ' + st.materials.length + ' 项材料' + (st.note ? ' · ' + st.note : ''), bars: [{ s: (offset + st.startDay) / 7, e: (offset + st.endDay) / 7, tone: st.kind === 'license' ? 'waitmat' : i % 2 ? 'plan' : 'prog', label: st.days + ' 天', title: st.title + ' ' + st.start + ' → ' + st.end }] }; });
    right.appendChild(P.card({ title: '办理时间线', sub: short(S.startDate) + ' 启动 · ' + S.totalDays + ' 天 · 许可与登记并行 · 横轴按周', body: [P.gantt({ days: weeks, rows: rowsG, labelW: 190, dayW: 64, rowH: 34, todayIdx: K.days(d.weekStart, d.today) / 7, marks: [{ d: (offset + S.totalDays) / 7 - 1, label: '完成 ' + short(S.endDate), color: '#22A06B' }] })] }));
    var risks = h('div', { class: 'm7-risks' }); S.risks.forEach(function (r) { risks.appendChild(h('div', { class: 'r' }, [sevChip(r.severity), h('span', {}, [r.text])])); });
    if (!S.risks.length) risks.appendChild(P.empty('无风险提示'));
    var mats = P.table({ compact: true, cols: [{ key: 'step', label: '节点' }, { key: 'item', label: '材料', cls: 'w320' }], rows: S.materials });
    right.appendChild(h('div', { class: 'pd-grid' }, [
      P.card({ cls: 'c6', title: '风险提示', sub: S.risks.length + ' 条', body: [risks], foot: ['费用：刻章 ' + fmtN(S.fees.seal) + ' 元 · 代办 ' + fmtN(S.fees.agency) + ' 元 · ' + S.fees.note] }),
      P.card({ cls: 'c6', title: '材料清单', sub: S.materials.length + ' 项 · 按节点', tight: true, body: [h('div', { class: 'pd-scroll', style: 'max-height:260px' }, [mats])] })
    ]));
    g.appendChild(right);
    work.appendChild(g);
  }

  /* ---------- 屏 5 ---------- */
  function screenIp(work) {
    var R = M.R, d = M.data, I = R.ip, IC = LIB.ipClasses, map = IC.byIndustry[d.profile.industry] || IC.byIndustry.default;
    work.classList.add('m7-ip');
    var g = h('div', { class: 'pd-grid' });
    g.appendChild(h('div', { class: 'c12' }, [P.kpis([
      { label: '知产资产', value: I.counts.total, unit: '项', sub: '商标 ' + I.counts.trademarks + ' · 专利 ' + I.counts.patents + ' · 软著 ' + I.counts.software + ' · 域名 ' + (d.ip.domains || []).length },
      { label: '待续展 / 缴费', value: I.counts.urgent, unit: '项', tone: I.counts.urgent ? 'risk' : 'ok', sub: '60 天内到期' },
      { label: '商标布局覆盖', value: I.coverage, unit: '%', tone: I.coverage >= 70 ? 'ok' : 'risk', sub: '应覆盖 ' + (map.core.length + map.extend.length) + ' 类 · 已覆盖 ' + I.covered.length + ' 类' },
      { label: '布局缺口', value: I.counts.gaps, unit: '类', tone: I.counts.coreGaps ? 'late' : I.counts.gaps ? 'risk' : 'ok', sub: '核心类 ' + I.counts.coreGaps },
      { label: '续展清单', value: I.renewCount, unit: '项', tone: 'accent', sub: '预计 ' + fmtN(I.renewFee) + ' 元' },
      { label: '申请清单', value: I.applyCount, unit: '类', tone: 'accent', sub: '预计 ' + fmtN(I.applyFee) + ' 元' },
      { label: '近似商标', value: I.similar.length, unit: '件', tone: I.similar.some(function (s) { return s.deadline; }) ? 'late' : 'risk' },
      { label: '侵权线索', value: I.leads.length, unit: '条', tone: I.leads.length ? 'risk' : 'ok' }
    ])]));
    var tbl = P.table({ cols: [
      { key: 'kindName', label: '类型', render: function (a) { return P.chip(IPK[a.kind], a.kindName, true); } },
      { key: 'title', label: '名称', sort: true, render: function (a) { return h('span', {}, [a.title, h('span', { class: 'sub' }, [a.kind === 'trademark' ? a.regNo + ' · 注册 ' + a.regDate : a.kind === 'patent' ? '申请 ' + a.appDate + (a.grantDate ? ' · 授权 ' + a.grantDate : '') : a.kind === 'software' ? '登记 ' + a.regDate : '域名'])]); } },
      { key: 'due', label: '到期 / 缴费', render: function (a) { return a.due ? h('span', {}, [short(a.due), h('span', { class: 'sub' }, [a.dueLabel])]) : h('span', { class: 'sub' }, [a.dueLabel]); } },
      { key: 'daysLeft', label: '剩余', align: 'r', sort: true, render: function (a) { return a.daysLeft == null ? '—' : h('span', { class: a.daysLeft <= 60 ? 'neg' : '' }, [a.daysLeft + ' 天']); } },
      { key: 'status', label: '状态', render: function (a) { return P.chip(a.status === '有效' ? 'ok' : a.status === '可续展' ? 'risk' : 'late', a.status); } },
      { key: 'action', label: '动作', render: function (a) { return a.action ? h('span', {}, [a.action, h('span', { class: 'sub' }, ['预计 ' + fmtN(a.fee) + ' 元'])]) : '—'; } },
      { key: 'listed', label: '清单', render: function (a) { return a.listed ? P.chip('handled', '已列入') : a.action ? P.btn('加入清单', { cls: 'sm', onClick: function (e) { e.stopPropagation(); commit(K.toggleRenew(d, a.id), a.title + ' 已加入续展 / 缴费清单'); } }) : ''; } }
    ], rows: I.assets, sortKey: 'daysLeft', sortDir: 'asc', rowKey: function (a) { return a.id; }, empty: '暂无知产资产' });
    g.appendChild(P.card({ cls: 'c7', title: '资产到期表', sub: I.counts.total + ' 项 · 按剩余天数排序 · 商标 10 年续展 · 专利按申请日逐年年费', tight: true, body: [h('div', { class: 'pd-scroll', style: 'max-height:520px' }, [tbl])] }));
    var right = col('c5', []);
    var have = {}; d.ip.trademarks.forEach(function (t) { t.classes.forEach(function (c) { have[c] = (have[c] || []).concat([t.name]); }); });
    var cls = h('div', { class: 'm7-classes' });
    map.core.concat(map.extend).forEach(function (c) {
      var tier = map.core.indexOf(c) >= 0 ? 'core' : 'extend', gap = I.gaps.filter(function (x) { return x.cls === c; })[0];
      cls.appendChild(h('div', { class: 'cl ' + (have[c] ? 'have' : 'gap-' + tier) }, [
        h('span', { class: 'no' }, [c]), h('span', { class: 'nm' }, [(IC.classNames[c] || c) + ' · ' + (tier === 'core' ? '核心' : '延伸')]),
        have[c] ? P.chip('ok', have[c].join('、')) : gap && gap.listed ? P.chip('handled', '已列入申请') : P.btn('加入申请', { cls: 'sm', onClick: function () { commit(K.toggleApply(d, c), '第 ' + c + ' 类已加入申请清单，预计 ' + fmtN(gap.fee) + ' 元'); } }),
        h('span', { class: 'why' }, [map.reasons[c] || ''])
      ]));
    });
    right.appendChild(P.card({ title: '商标布局', sub: '按行业应覆盖的类别 · 覆盖 ' + I.coverage + '%', body: [P.bar(I.coverage, I.coverage >= 70 ? 'ok' : 'risk', I.covered.length + ' / ' + (map.core.length + map.extend.length) + ' 类'), h('div', { style: 'margin-top:10px' }, [cls])] }));
    var sim = h('div', { class: 'pd-list' });
    I.similar.forEach(function (s) { sim.appendChild(P.item({ tone: s.deadline ? (s.daysLeft <= 30 ? 'late' : 'risk') : 'accent', icon: '近', title: '「' + s.name + '」第 ' + s.classes.join('、') + ' 类 · ' + s.classNames.join('、'), sub: s.holder + ' · 相似度 ' + Math.round(s.similarity * 100) + '% · ' + s.status + ' · ' + s.note, right: s.action, rightSub: s.deadline ? short(s.deadline) + ' 前 · ' + s.daysLeft + ' 天' : '' })); });
    I.leads.forEach(function (l) { sim.appendChild(P.item({ tone: 'risk', icon: '侵', title: l.where + ' · ' + l.product, sub: l.note + ' · 发现 ' + l.found + ' · 相似度 ' + Math.round(l.similarity * 100) + '%', right: l.action })); });
    if (!I.similar.length && !I.leads.length) sim.appendChild(P.empty('无近似商标与侵权线索'));
    right.appendChild(P.card({ title: '近似商标与侵权线索', sub: I.similar.length + ' 件 · ' + I.leads.length + ' 条', body: [sim] }));
    g.appendChild(right);
    var renewItems = I.assets.filter(function (a) { return a.listed; }), applyItems = I.gaps.filter(function (x) { return x.listed; });
    var l1 = h('div', { class: 'pd-list' }); renewItems.forEach(function (a) { l1.appendChild(P.item({ tone: 'hand', icon: P.KIND_ICON.ip, title: a.title, sub: a.kindName + ' · ' + a.action + ' · ' + a.dueLabel + ' ' + short(a.due), right: fmtN(a.fee) + ' 元', onClick: function () { commit(K.toggleRenew(d, a.id), a.title + ' 已移出清单'); } })); }); if (!renewItems.length) l1.appendChild(P.empty('从到期表加入'));
    var l2 = h('div', { class: 'pd-list' }); applyItems.forEach(function (x) { l2.appendChild(P.item({ tone: 'hand', icon: x.cls, title: '第 ' + x.cls + ' 类 ' + x.name, sub: (x.tier === 'core' ? '核心类' : '延伸类') + ' · ' + x.reason, right: fmtN(x.fee) + ' 元', onClick: function () { commit(K.toggleApply(d, x.cls), '第 ' + x.cls + ' 类已移出清单'); } })); }); if (!applyItems.length) l2.appendChild(P.empty('从商标布局加入'));
    g.appendChild(P.card({ cls: 'c12', title: '续展 / 申请清单', sub: '点条目移出 · 费用为官费加预计代理费', body: [h('div', { class: 'm7-lists' }, [h('div', {}, [h('div', { class: 'h' }, ['续展 / 缴费 ' + renewItems.length + ' 项', h('span', {}, ['预计 ' + fmtN(I.renewFee) + ' 元'])]), l1]), h('div', {}, [h('div', { class: 'h' }, ['商标申请 ' + applyItems.length + ' 类', h('span', {}, ['预计 ' + fmtN(I.applyFee) + ' 元'])]), l2])])], foot: [h('b', {}, ['合计预计 ' + fmtN(I.renewFee + I.applyFee) + ' 元']), P.btn('委托单发送到微信', { cls: 'primary sm', disabled: !renewItems.length && !applyItems.length, onClick: function () { sh.setQrReady(true); sh.showWeChat(); } })] }));
    work.appendChild(g);
  }

  /* ---------- 屏 6 ---------- */
  function screenRegister(work) {
    var R = M.R, d = M.data, reg = R.register, kf = M.regKind;
    work.classList.add('m7-register');
    var pass = function (it) { return !kf || regGroup(it) === kf; };
    var items = reg.items.filter(pass);
    var weeks = reg.weeks.map(function (w) { return { w: w.w, start: w.start, end: w.end, label: w.label, items: w.items.filter(pass).map(function (it) { return Object.assign({}, it, { tone: it.listed ? 'handled' : it.tone }); }) }; });
    var g = h('div', { class: 'pd-grid' });
    var filt = function (key) { return function () { M.regKind = M.regKind === key ? null : key; draw(); }; };
    g.appendChild(h('div', { class: 'c12' }, [P.kpis([
      { label: '90 天台账', value: reg.counts.total, unit: '项', onClick: filt(null), active: !kf },
      { label: '逾期', value: reg.counts.overdue, unit: '项', tone: reg.counts.overdue ? 'late' : 'ok' }, { label: '30 天内', value: reg.counts.due30, unit: '项', tone: reg.counts.due30 ? 'risk' : 'ok' },
      { label: '合同到期与节点', value: reg.counts.contract, unit: '项', onClick: filt('contract'), active: kf === 'contract' }, { label: '证照到期', value: reg.counts.license, unit: '项', onClick: filt('license'), active: kf === 'license' },
      { label: '知产到期', value: reg.counts.ip, unit: '项', onClick: filt('ip'), active: kf === 'ip' }, { label: '设立节点', value: reg.counts.setup, unit: '项', tone: 'accent', sub: R.setup.confirmed ? '方案已确认' : '确认方案后进台账', onClick: filt('setup'), active: kf === 'setup' }
    ])]));
    var legend = h('div', { class: 'legend' }, [['contract', '合同到期'], ['milestone', '履约节点'], ['license', '证照到期'], ['ip', '知产到期'], ['setup', '设立节点']].map(function (x) { return h('span', {}, [h('i', {}, [P.KIND_ICON[x[0]]]), x[1]]); }).concat([h('span', { style: 'margin-left:auto' }, [P.chip('late', '逾期'), ' ', P.chip('risk', '临近'), ' ', P.chip('ok', '正常'), ' ', P.chip('handled', '已列清单')])]));
    g.appendChild(P.card({ cls: 'c8', title: '90 天日历', sub: short(d.weekStart) + ' 起 13 周 · ' + items.length + ' 项' + (kf ? ' · 已筛选' : '') + ' · 点条目看详情', body: [P.weekGrid({ weeks: weeks, today: d.today, maxItems: 2, onItem: jump })], foot: [legend] }));
    var right = col('c4', []);
    var due = h('div', { class: 'pd-list' });
    reg.overdue.concat(reg.due30).filter(pass).slice(0, 9).forEach(function (it) { due.appendChild(P.item({ tone: it.listed ? 'hand' : it.tone === 'accent' ? 'accent' : it.tone, icon: P.KIND_ICON[it.kind], title: it.title, sub: it.kindName + ' · ' + it.sub, right: it.label, rightSub: it.daysLeft < 0 ? '逾期 ' + (-it.daysLeft) + ' 天' : it.daysLeft === 0 ? '今天' : it.daysLeft + ' 天后', onClick: function () { jump(it); } })); });
    if (!reg.overdue.length && !reg.due30.length) due.appendChild(P.empty('30 天内无到期事项'));
    right.appendChild(P.card({ title: '逾期与 30 天内', sub: '逾期 ' + reg.counts.overdue + ' · 30 天内 ' + reg.counts.due30, body: [due] }));
    var who = h('div', { class: 'who' });
    ['总经理', '财务负责人', '法务专员'].forEach(function (w, i) { who.appendChild(h('button', { class: i === M.who ? 'on' : '', onclick: function () { M.who = i; draw(); } }, [w])); });
    right.appendChild(P.card({ title: '法务月报', sub: d.today.slice(0, 7).replace('-', ' 年 ') + ' 月 · 微信文本版', body: [h('div', { class: 'pd-field' }, [h('label', {}, ['收件人']), who]), h('div', { class: 'pd-pre', style: 'margin-top:10px;max-height:300px;overflow:auto' }, [R.report.text])], foot: [P.btn('发送到微信', { cls: 'primary', onClick: function () { sh.setQrReady(true); sh.showWeChat(); } }), P.btn('回到驾驶舱', { onClick: function () { setStep('board'); } })] }));
    g.appendChild(right);
    work.appendChild(g);
  }

  window.DGG = window.DGG || {};
  window.DGG.registerModule('m7', { mount: mount, unmount: unmount, onCompany: onCompany, onIndustry: onIndustry });
})();
