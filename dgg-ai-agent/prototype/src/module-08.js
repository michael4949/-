/* AI流程提效 · 生产部门的生产环节（六屏）
 * 接入（报工核验）→ 工序流看板（约束识别 · 在制预测 · 异常预警）→ 工序诊断（时间损失 · 标准工时校准 · 按瓶颈节拍投料）
 * → 改善预演（换型合批 · 四方案调 AI ERP 排程引擎重算）→ 执行与派工（明日派工 · 保养窗口 · 报工看板 · 技能矩阵）→ 提效周报（增效账 · 效果核验 · 发微信）
 * 全部计算走 DGG.coreM8（与 skill 同一份内核，排程引擎依赖注入 DGG.coreM10）；每个动作都写回同一份数据副本
 * 纯预制、断网可用；不用任何存储 API
 */
(function () {
  'use strict';
  var sh, $root, h, DATA, P, K, LIB;
  var ACCENT = window.DGG.PALETTE.m8;
  var CAP_DESC = { 0: '六条规则逐条核对，只标记不改数', 1: '负荷最高的线为约束，瓶颈前在制按前道产出逐日推 7 天', 2: '六条规则各命中一条根因并指到岗位', 3: '计划时间 → 有效时间，可用率 × 性能率', 4: '按 12 周中位数与稳定性判定过期标准', 5: '缓冲上限反推明日允许投放量', 6: '按相似度枚举顺序，交期约束下换型最少', 7: '四个方案在排程引擎上重算', 8: '技能矩阵 + 加班上限，缺口由多能工补', 9: '到期与停机趋势，排进负荷最低班次', 10: '每次采纳按小时入账，周报自动生成' };
  var STATUS_TONE = { ok: 'ok', tight: 'risk', over: 'late' };
  var LOT_COLORS = ['#1F7A5A', '#3B5BDB', '#C2255C', '#E8862B', '#6B3FD6', '#0B8FA8'];
  var M = { step: 'connect', arche: null, data: null, R: null, line: null, lossScope: 'week', params: {}, pick: null, charged: false, name: null, company: null, frame: null, lastStep: null, who: 0 };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function sectorOf(slug) { var hit = null; (DATA.industries.sectors || []).forEach(function (s) { (s.industries || []).forEach(function (i) { if (i.slug === slug) hit = s.key; }); }); return hit; }
  function archeOf(slug) { var sec = sectorOf(slug); var a = (sec && DATA.m10.archetypes.map[sec]) || 'make'; if (a === 'project') a = 'service'; return DATA.m8.samples[a] ? a : 'make'; }
  function loadArche(a) {
    M.arche = a;
    var sample = DATA.m8.samples[a], base = K.ensure(sample);
    if (M.name && M.name !== sample.company) base.company = M.name;
    if (M.company && M.company.systems) { var sys = M.company.systems; base.sources.forEach(function (s) { if (s.id === 'report' || s.id === 'route') s.mode = sys.indexOf('mes') >= 0 || sys.indexOf('erp') >= 0 ? 'direct' : 'import'; }); }
    M.data = base; M.line = null; M.params = {}; M.pick = null;
    recompute();
  }
  function recompute() { M.R = K.run(M.data, LIB); }
  function commit(data, msg) { M.data = data; recompute(); draw(); if (msg && M.frame) P.toast(M.frame.body, msg); }
  function fmtN(n) { return P.fmtN(n); }
  function HH(x) { return K.fmtH(x); }
  function V() { return M.R.vocab; }
  function T(text, extra) { return K.t(M.data, LIB, text, extra); }
  function col(cls, kids) { return h('div', { class: cls, style: 'display:flex;flex-direction:column;gap:16px' }, kids); }
  function lotColor(product) { var ps = M.R.es.products.map(function (p) { return p.id; }); return LOT_COLORS[Math.max(0, ps.indexOf(product)) % LOT_COLORS.length]; }
  function unitOf() { return V().unit; }
  function lineName(id) { var L = M.R.es.lines.filter(function (l) { return l.id === id; })[0]; return L ? L.name : id; }

  function mount(root, step, shell) {
    sh = shell; $root = root; h = sh.h; DATA = sh.DATA; P = window.DGG.pui; K = window.DGG.coreM8;
    LIB = { vocab: DATA.m8.vocab, rules: DATA.m8.rules, improveLib: DATA.m8.improveLib, erpSamples: DATA.m10.samples, erp: window.DGG.coreM10 };
    P.init(sh);
    var c = sh.getCompany();
    if (!M.data) { M.company = c; M.name = c ? c.name : null; loadArche(c ? archeOf(c.industry) : archeOf(sh.displayIndustryDefault())); }
    M.step = step || (M.charged && M.lastStep ? M.lastStep : 'connect');
    if (['connect', 'board', 'diag', 'improve', 'exec', 'report'].indexOf(M.step) < 0) M.step = 'connect';
    draw();
  }
  function unmount() { }
  function onCompany(c) { M.company = c; M.name = c ? c.name : null; M.charged = false; M.lastStep = null; loadArche(c ? archeOf(c.industry) : archeOf(sh.displayIndustryDefault())); if (M.step !== 'connect') setStep('connect'); else draw(); }
  function onIndustry(slug) { if (M.step !== 'connect' || !slug) return; var a = archeOf(slug); if (a !== M.arche) { loadArche(a); draw(); } }
  function setStep(s) { M.step = s; M.lastStep = s; sh.go('m8', s); }
  function enterBoard() { if (M.R.verify.pending) M.data = K.confirmAllReports(M.data, LIB); setStep('board'); }

  function draw() {
    sh.clear($root);
    recompute();
    var R = M.R, k = R.kpi, v = V(), c = M.company;
    var meta = c ? [sh.industryNameOf(c.industry), sh.optText('size', c.size)].filter(Boolean).join(' · ') : '';
    var tabs = [{ key: 'connect', label: '接入', badge: k.reportsPending || 0 }, { key: 'board', label: v.flowName + '看板', badge: k.alertsOpen || 0 }, { key: 'diag', label: v.op + '诊断', badge: k.stdExpired || 0 }, { key: 'improve', label: '改善预演' }, { key: 'exec', label: '执行与' + v.dispatch.replace('单', ''), badge: k.maintDue || 0 }, { key: 'report', label: '提效周报' }];
    var F = P.frame({ mark: '提效', accent: ACCENT, modules: P.navModules('m8'), crumbs: ['AI流程提效', tabs.filter(function (t) { return t.key === M.step; })[0].label], company: { name: M.data.company, meta: meta + (meta ? ' · ' : '') + v.dept + ' · ' + K.short(M.data.weekStart) + ' 起本周' }, tabs: tabs, active: M.step, chat: { id: 'm8', name: 'AI流程提效', step: M.step, onGo: setStep },
      onTab: function (key) { if (key !== 'connect' && !M.charged) enterBoard(); else setStep(key); } });
    M.frame = F; $root.appendChild(F.root);
    if (M.step !== 'connect' && !M.charged) { M.charged = true; sh.charge(K.CREDITS); }
    if (M.step !== 'connect' && M.step !== 'board') { var row = F.root.querySelector('.pd-top .row'); if (row) row.appendChild(h('span', { class: 'm8-counter' }, ['本周 AI 建议预计节省 ', h('b', { class: 'num' }, [String(k.savedH)]), ' h'])); }
    ({ connect: screenConnect, board: screenBoard, diag: screenDiag, improve: screenImprove, exec: screenExec, report: screenReport })[M.step](F.work);
  }

  /* ---------- 屏 1 接入 · 报工核验 ---------- */
  function screenConnect(work) {
    var d = M.data, R = M.R, k = R.kpi, v = V();
    work.classList.add('m8-connect');
    var g = h('div', { class: 'pd-grid' });
    var nameIn = h('input', { type: 'text', value: d.company, oninput: function (e) { M.name = e.target.value; d.company = e.target.value; var co = M.frame.root.querySelector('.pd-top .co span:nth-child(2)'); if (co) co.textContent = e.target.value; } });
    var srcs = h('div'); d.sources.forEach(function (s) { srcs.appendChild(h('div', { class: 'src-row' }, [h('div', {}, [h('div', { class: 't' }, [s.name]), h('div', { class: 's' }, ['同步 ' + s.lastSync + ' · ' + fmtN(s.rows) + ' 条'])]), P.chip(s.mode === 'direct' ? 'ok' : 'watch', s.mode === 'direct' ? '系统直连' : '表格导入'), h('span', { class: 'pd-dot ' + (s.mode === 'direct' ? 'ok' : 'risk') })])); });
    g.appendChild(P.card({ cls: 'c4', title: v.dept + '数据源', sub: d.sources.length + ' 个', body: [h('div', { class: 'pd-form' }, [h('div', { class: 'pd-field' }, [h('label', {}, ['企业名称']), nameIn]), h('div', { class: 'pd-field' }, [h('label', {}, ['行业']), h('div', { style: 'font-weight:600' }, [M.company ? sh.industryNameOf(M.company.industry) + (M.company.size ? ' · ' + sh.optText('size', M.company.size) : '') : sh.industryNameOf(sh.displayIndustryDefault())])])]), h('div', { style: 'margin-top:8px' }, [srcs])], foot: [v.lines + ' ' + k.lines + ' · ' + v.op + ' ' + R.skills.ops.length + ' · 在产' + v.lots + ' ' + k.lots + ' · 本周' + v.report + ' ' + k.reportsTotal + ' 条'] }));
    // 报工核验
    var vr = R.verify, rows = vr.rows;
    var tbl = P.table({ compact: true, cols: [
      { key: 'kindName', label: '问题', w: '84px', render: function (r) { return P.chip(r.resolved ? 'ok' : 'risk', r.kindName); } },
      { key: 'reportId', label: v.report, w: '96px', render: function (r) { return r.reportId || '—'; } },
      { key: 'line', label: v.line + ' / ' + v.op, render: function (r) { return lineName(r.line) + ' · ' + r.op + (r.emp ? ' · ' + r.emp : ''); } },
      { key: 'text', label: '核对结果' },
      { key: 'suggest', label: 'AI 建议值' },
      { key: 'act', label: '', w: '70px', align: 'right', render: function (r) { return r.resolved ? P.chip('ok', '已确认', true) : P.btn('确认', { cls: 'sm', onClick: function () { commit(K.confirmReport(M.data, LIB, r.id), r.kindName + ' ' + (r.reportId || '') + ' 已按建议值确认'); } }); } }
    ], rows: rows, empty: '本周' + v.report + '全部通过核验' });
    g.appendChild(P.card({ cls: 'c8', title: v.report + '核验', sub: '本周 ' + vr.total + ' 条 · 待核验 ' + vr.pending + ' 条 · 六条规则逐条核对，只标记不改数，' + v.roles.foreman + '确认', extra: vr.pending ? P.btn('全部按建议确认', { cls: 'sm', onClick: function () { commit(K.confirmAllReports(M.data, LIB), vr.pending + ' 条已确认 · 后续计算只用核验过的记录'); } }) : null, body: [tbl], foot: ['规则：单件工时偏离标准超 30% · 排班在岗却漏报 · 同' + v.lot + '同' + v.op + '同班次重复 · 本道累计超过前道完工 · 同人时段重叠 · 单人总时长超班时'] }));
    // 产线概况 + 已开通能力
    var lt = P.table({ compact: true, cols: [{ key: 'name', label: v.line }, { key: 'ops', label: v.op, render: function (r) { return r.ops.join(' / '); } }, { key: 'crew', label: '每班人数', align: 'right' }, { key: 'capHoursPerDay', label: '日可用', align: 'right', render: function (r) { return r.capHoursPerDay + ' h'; } }, { key: 'load7', label: '未来 7 天负荷', align: 'right', render: function (r) { return P.chip(STATUS_TONE[r.status], r.load7 + '%'); } }], rows: R.S.lines });
    g.appendChild(P.card({ cls: 'c6', title: v.lines + '概况', sub: k.lines + ' 条 · ' + k.products + ' 种' + (M.arche === 'service' ? '服务项目' : M.arche === 'flow' ? '商品' : '产品') + ' · 工艺路线与标准工时来自 AI ERP', body: [lt], foot: ['首轮排程：' + v.bottleneck + ' ' + R.bottleneck.line.name + ' · 未来 7 天负荷 ' + R.bottleneck.load7 + '% · ' + v.queue + ' ' + R.bottleneck.queueDays + ' 天'] }));
    var caps = h('div'); v.caps.forEach(function (c, i) { caps.appendChild(h('div', { class: 'cap-row' }, [h('span', { class: 'ic' }, [String(i + 1).length < 2 ? '0' + (i + 1) : String(i + 1)]), h('div', {}, [h('div', { class: 't' }, [c]), h('div', { class: 's', style: 'color:var(--pd-sub);font-size:12px' }, [CAP_DESC[i] || ''])]), P.chip('ok', '已开通')])); });
    g.appendChild(P.card({ cls: 'c6', title: '已开通 AI 能力', sub: v.caps.length + ' 项 · 全部为规则与算法，离线可算', body: [caps] }));
    g.appendChild(h('div', { class: 'c12 go' }, [h('div', {}, [h('div', { class: 't' }, [v.flowName + '看板']), h('div', { class: 's' }, ['核验 ' + vr.pending + ' 条' + v.report + '后进入 · ' + v.bottleneck + ' ' + R.bottleneck.line.name + ' · 异常预警 ' + k.alertsTotal + ' 起 · 标准工时待校准 ' + k.stdExpired + ' 项'])]), h('div', { class: 'sp' }), h('div', { class: 'cr' }, [h('b', { class: 'num' }, [String(K.CREDITS)]), ' 积分 / 次']), P.btn(vr.pending ? '核验并进入' + v.flowName + '看板' : '进入' + v.flowName + '看板', { cls: 'primary big', onClick: enterBoard })]));
    work.appendChild(g);
  }

  /* ---------- 屏 2 工序流看板 ---------- */
  function stageCard(f) {
    var B = M.R.bottleneck, v = V();
    var lines = h('div', { class: 'ln' }); f.lines.forEach(function (l) { lines.appendChild(h('span', { class: l.status === 'over' ? 'over' : l.status === 'tight' ? 'tight' : '' }, [l.name + ' ' + l.load7 + '%'])); });
    var isLongest = !B.sameLine && f.lines.some(function (l) { return l.id === B.longestQueue.id; });
    return h('button', { class: 'stg' + (f.isConstraint ? ' con' : ''), onclick: function () { openStage(f); } }, [
      h('div', { class: 'h' }, [f.name, h('span', { class: 'sp' }), f.isConstraint ? P.chip('late', '约束') : null, isLongest ? P.chip('risk', '排队最长') : null]),
      lines,
      h('div', { class: 'r' }, [h('span', {}, ['标准 / 实际']), h('b', { class: f.devPct > 10 ? 'neg' : '' }, [f.stdText + ' / ' + f.actText])]),
      h('div', { class: 'r' }, [h('span', {}, [v.wip]), h('b', {}, [fmtN(f.wipUnits) + ' ' + v.unit])]),
      h('div', { class: 'r' }, [h('span', {}, ['本周' + v.wait]), h('b', { class: f.waitH > 4 ? 'neg' : '' }, [HH(f.waitH)])]),
      h('div', { class: 'r' }, [h('span', {}, [v.fpy]), h('b', { class: f.fpy != null && f.fpy < 95 ? 'neg' : '' }, [f.fpy != null ? f.fpy + '%' : '—'])]),
      h('div', { class: 'r' }, [h('span', {}, ['可用率']), h('span', { style: 'flex:1;margin-left:8px' }, [P.bar(f.availability || 0, f.availability != null && f.availability < 70 ? 'late' : 'ok')])])
    ]);
  }
  function openStage(f) {
    var R = M.R, B = R.bottleneck, v = V(), lineIds = f.lines.map(function (l) { return l.id; });
    var isC = f.isConstraint, q = K.queueDaysOf(R.S, lineIds);
    var acts = h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' }, [
      P.btn(isC ? '设为本周改善对象' : '看' + v.op + '诊断', { cls: 'primary sm', onClick: function () { M.line = isC ? B.line.id : f.lines[0].id; M.data.focus = M.line; dr.close(); setStep('diag'); } }),
      isC && !M.data.releasePlan ? P.btn('按' + v.bottleneck + '节拍' + v.release, { cls: 'sm', onClick: function () { dr.close(); commit(K.applyRelease(M.data, LIB), v.release + '计划已下发 ' + R.buffer.release.line.name + ' ' + v.roles.foreman); } }) : null,
      isC ? P.btn('去改善预演', { cls: 'sm', onClick: function () { dr.close(); setStep('improve'); } }) : null
    ]);
    var seen = ['未来 7 天负荷 ' + f.load7 + '%（' + f.lines.map(function (l) { return l.name + ' ' + l.load7 + '%'; }).join('、') + '）', v.queue + ' ' + q + ' 天', '本周' + v.report + ' ' + fmtN(f.qty) + ' ' + v.unit + '，' + v.fpy + ' ' + (f.fpy != null ? f.fpy + '%' : '—'), '标准 ' + f.stdText + '，实际 ' + f.actText + '（' + (f.devPct > 0 ? '+' : '') + f.devPct + '%）'];
    if (isC) seen.push('瓶颈前' + v.wip + ' 今日 ' + fmtN(B.wip.today.units) + ' ' + v.unit + ' → 明日 ' + fmtN(B.wip.tomorrow.units) + ' ' + v.unit + '（上限 ' + fmtN(B.wip.maxUnits) + '）');
    var reasons = isC ? ['负荷在全线最高，' + v.queue + '最长，满足约束定义', '前道日产出高于本线日产出，' + v.wip + '每日净增，' + (B.wip.overDay ? B.wip.overDay.label + ' 超过缓冲上限' : '缓冲在上限内'), '本线每释放 1 h ≈ ' + fmtN(B.unitPerHour) + ' ' + v.unit + '，是全线产出的分母'] : ['负荷 ' + f.load7 + '%，不是约束；给这一线加人或加班对全线产出无效', '关注它对' + v.bottleneck + '的供给节奏与' + v.wait + '时长'];
    var dr = P.drawer(M.frame.body, { title: f.name + (isC ? ' · ' + v.bottleneck : ''), sub: f.lines.map(function (l) { return l.name; }).join(' / '), body: [P.judge({ verdict: { tone: isC ? 'late' : 'ok', chip: isC ? '约束' : '非约束', text: isC ? '本周改善对象' : '按' + v.bottleneck + '节拍供给' }, seen: seen, reasons: reasons, actionsEl: acts, actionsTitle: '建议动作' })] });
  }
  function screenBoard(work) {
    var R = M.R, k = R.kpi, B = R.bottleneck, v = V(), d = M.data;
    work.classList.add('m8-board');
    var g = h('div', { class: 'pd-grid' });
    g.appendChild(h('div', { class: 'c12' }, [P.kpis([
      { label: v.bottleneck + '负荷', value: k.load7, unit: '%', tone: k.load7 >= 100 ? 'late' : k.load7 >= 85 ? 'risk' : 'ok', sub: B.line.name + ' · 未来 7 天', onClick: function () { openStage(R.flow.filter(function (f) { return f.isConstraint; })[0]); } },
      { label: v.queue, value: k.queueDays, unit: '天', tone: k.queueDays > 7 ? 'late' : 'ok', sub: B.sameLine ? v.bottleneck + '前' : '排队最长 ' + B.longestQueue.name + ' ' + B.longestQueue.days + ' 天' },
      { label: '有效利用率', value: k.effUtil, unit: '%', tone: k.effUtil < 70 ? 'risk' : 'ok', sub: B.line.name + ' · 可用率 × 性能率', onClick: function () { setStep('diag'); } },
      { label: v.wip + '天数', value: k.wipDays, unit: '天', tone: B.wip.tomorrow.hours >= B.wip.maxHours ? 'late' : 'ok', sub: '明日 ' + B.wipDaysTomorrow + ' 天 · 上限 ' + B.wip.capDays + ' 天' },
      { label: v.fpy, value: k.fpy, unit: '%', tone: k.fpy < 95 ? 'risk' : 'ok', sub: '12 周基线' },
      { label: '本周加班', value: k.otHours, unit: 'h', tone: k.otHours > 60 ? 'risk' : 'ok', sub: '超限 ' + R.dispatch.overLimit + ' 人', onClick: function () { setStep('exec'); } }
    ])]));
    var flow = h('div', { class: 'm8-flow' }); R.flow.forEach(function (f) { flow.appendChild(stageCard(f)); });
    g.appendChild(P.card({ cls: 'c12', title: v.flowName, sub: k.stages + ' 道' + v.op + ' · 负荷最高的线为约束 · 点任一格看 AI 判断', body: [flow], foot: ['负荷平衡率 ' + B.balanceRate + '% · ' + v.bottleneck + '每释放 1 h ≈ ' + fmtN(B.unitPerHour) + ' ' + v.unit] }));
    var labels = B.wip.curve.map(function (c) { return c.label; });
    g.appendChild(P.card({ cls: 'c6', title: '瓶颈前' + v.wip, sub: '未来 7 天 · 上限 ' + B.wip.maxHours + ' h', body: [P.lineChart({ labels: labels, series: [{ values: B.wip.curve.map(function (c) { return d.releasePlan ? Math.min(c.hours, B.wip.maxHours) : c.hours; }), color: ACCENT.pa, fmt: function (x) { return x + ' h'; } }, { values: B.wip.curve.map(function () { return B.wip.maxHours; }), color: '#D9483B', fmt: function (x) { return x + ' h'; } }], height: 170, width: 640, every: 1 })], foot: [d.releasePlan ? h('span', {}, [v.release + '计划已下发 · 封顶在上限 ' + B.wip.maxHours + ' h']) : h('span', {}, ['明日 ' + B.wip.tomorrow.hours + ' h（' + fmtN(B.wip.tomorrow.units) + ' ' + v.unit + '）' + (B.wip.tomorrow.hours >= B.wip.maxHours ? ' · 超限' : '')]), !d.releasePlan ? P.btn('去' + v.release, { cls: 'sm', onClick: function () { setStep('diag'); } }) : null] }));
    var al = h('div', { class: 'pd-list' });
    R.alerts.forEach(function (a) { al.appendChild(P.item({ tone: a.status === 'open' ? 'late' : a.status === 'doing' ? 'handled' : 'done', icon: { wip: '在', wait: '等', quality: '质', speed: '速', down: '停', plan: '节' }[a.kind] || '!', title: a.ruleName + (a.machine ? ' · ' + a.machine : ''), sub: a.text + ' · 根因：' + a.cause + ' · ' + a.roleName, right: a.status === 'open' ? P.btn('处置', { cls: 'sm', onClick: function () { commit(K.handleException(M.data, LIB, a.id), a.id + ' ' + a.action + ' · ' + a.roleName + (a.savedH ? ' · 预计回收 ' + a.savedH + ' h' : '')); } }) : P.chip(a.status === 'doing' ? 'handled' : 'done', a.statusName), rightSub: a.savedH ? '预计 ' + a.savedH + ' h' : '' })); });
    if (!R.alerts.length) al.appendChild(P.empty('本周无异常'));
    g.appendChild(P.card({ cls: 'c6', title: '异常预警', sub: '待处置 ' + k.alertsOpen + ' · 六条规则 · 根因指到岗位', body: [al] }));
    // 负荷热力
    var days = R.S.lines[0].days.slice(0, 7).map(function (x) { return { label: x.label, rest: x.rest, wd: K.short(x.date) ? '' : '' }; });
    var maint = {}; d.maintenance.forEach(function (m) { maint[m.line + '|' + m.d] = m.machine; });
    var rows = R.S.lines.map(function (l) { return { label: l.name, cells: l.days.slice(0, 7).map(function (x, i) { return { pct: x.pct, rest: x.rest, ot: x.ot > 0, title: l.name + ' ' + x.label + ' ' + x.used + ' / ' + x.cap + ' h' + (maint[l.id + '|' + i] ? ' · ' + v.maint + ' ' + maint[l.id + '|' + i] : '') }; }) }; });
    g.appendChild(P.card({ cls: 'c8', title: v.lines + '负荷 · 未来 7 天', sub: '来自 AI ERP 排程 · 采纳派工与' + v.maint + '后同步', body: [P.heat({ days: days, rows: rows, labelW: '150px' })] }));
    g.appendChild(P.card({ cls: 'c4', title: '本周动作', sub: d.log.length + ' 条', body: [P.log(d.log, { limit: 8, empty: '尚无动作 · 从' + v.op + '诊断开始' })] }));
    work.appendChild(g);
  }

  /* ---------- 屏 3 工序诊断 ---------- */
  function screenDiag(work) {
    var R = M.R, d = M.data, v = V(), B = R.bottleneck;
    work.classList.add('m8-diag');
    var lineId = M.line || d.focus || B.line.id;
    var loss = K.lossWaterfall(d, LIB, lineId, M.lossScope, R.sequence.savedHPerDay);
    var g = h('div', { class: 'pd-grid' });
    var lines = h('div', { class: 'lines' }); R.S.lines.forEach(function (l) { lines.appendChild(h('button', { class: l.id === lineId ? 'on' : '', onclick: function () { M.line = l.id; draw(); } }, [l.name + (l.id === B.line.id ? ' · 约束' : '')])); });
    var scope = h('div', { class: 'lines' }, [h('button', { class: M.lossScope === 'week' ? 'on' : '', onclick: function () { M.lossScope = 'week'; draw(); } }, ['本周']), h('button', { class: M.lossScope === 'day' ? 'on' : '', onclick: function () { M.lossScope = 'day'; draw(); } }, ['今日'])]);
    g.appendChild(P.card({ cls: 'c12', tight: true, body: [h('div', { style: 'display:flex;gap:16px;align-items:center;flex-wrap:wrap;padding:10px 14px' }, [h('span', { style: 'font-weight:700;color:var(--pd-sub)' }, [v.line]), lines, h('span', { style: 'flex:1' }), scope])] }));
    var left = col('c7', []);
    left.appendChild(P.card({ title: '时间损失 · ' + loss.line.name, sub: '每日 ' + loss.start.value + ' h 计划' + v.run + '时间 → ' + v.cutting + ' ' + loss.end.value + ' h · 点柱子看记录', body: [P.waterfall({ start: loss.start, end: loss.end, items: loss.items, fmt: function (x) { return x + ' h'; }, axisFmt: function (x) { return Math.round(x) + ''; }, width: 700, height: 240, onPick: function (id) { openLoss(id, loss, lineId); } }), h('div', { style: 'margin-top:10px' }, [P.kv([['可用率', loss.availability + '%'], ['性能率', loss.performance + '%'], ['有效利用率', loss.effUtil + '%'], ['首要损失', loss.primary ? loss.primary.label + ' ' + Math.abs(loss.primary.value) + ' h/日' : '—'], ['可回收', HH(loss.recoverable.total) + '/日（' + v.setup + '合批 ' + loss.recoverable.setup + ' + ' + v.firstPieceCheck + '前移 ' + loss.recoverable.firstPiece + '）']])])], foot: ['有效利用率 12 周：' + loss.weekly.map(function (w) { return w.effUtil; }).join(' → ') + '%'] }));
    left.appendChild(P.card({ title: v.wait + '原因', sub: '本周 · 每日小时', body: [P.dist({ rows: loss.waitDist.map(function (w) { return { label: w.label, value: w.value, text: w.value + ' h', hi: w.hi }; }) })], foot: [v.waitReasons[2] + '可由' + v.firstPieceCheck + '前移回收 80% · ' + v.waitReasons[0] + '只显示不折算'] }));
    g.appendChild(left);
    var right = col('c5', []);
    var acts = h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' }, [
      P.btn('锁定改善点：' + (loss.primary ? loss.primary.label : v.setup), { cls: 'primary sm', onClick: function () { M.data.focus = lineId; M.data.focusLoss = loss.primary ? loss.primary.id : 'setup'; setStep('improve'); } }),
      P.btn('去改善预演', { cls: 'sm', onClick: function () { setStep('improve'); } })
    ]);
    right.appendChild(P.judge({ verdict: { tone: loss.effUtil < 70 ? 'late' : 'ok', chip: '有效利用率 ' + loss.effUtil + '%', text: loss.primary ? '首要损失 ' + loss.primary.label + '，每日可回收 ' + loss.recoverable.total + ' h' : '损失在可控范围' }, seen: ['12 周按线时间损失（计划、' + v.setup + '、' + v.down + '、' + v.wait + '、速度、' + v.rework + '）', '本周 ' + fmtN(R.verify.total) + ' 条已核验' + v.report, '标准工时 ' + R.calibration.length + ' 项的 12 周中位数与四分位距'], reasons: [loss.primary ? loss.primary.label + ' 占计划时间 ' + Math.round(100 * Math.abs(loss.primary.value) / loss.start.value) + '%，是首要损失' : '各项损失均低于 10%', R.sequence.savedHPerDay > 0 ? v.setup + '合批可省 ' + R.sequence.savedHPerDay + ' h/日（' + R.sequence.before.changeovers + ' 次 → ' + R.sequence.after.changeovers + ' 次）' : v.setup + '顺序已是最优', R.kpi.stdExpired ? R.kpi.stdExpired + ' 项标准工时过期，排程按旧标准会把计划排得过满' : '标准工时与实际一致'], actionsEl: acts, actionsTitle: '建议动作' }));
    var b = R.buffer, pct = Math.min(100, 100 * b.hours / (b.max * 1.6)), limPct = 100 / 1.6;
    right.appendChild(P.card({ title: v.bottleneck + '缓冲 · ' + b.line.name, sub: '明日 ' + b.hours + ' h · 上限 ' + b.max + ' h（' + b.capDays + ' 天）', extra: P.chip(b.status === 'over' || b.status === 'red' ? 'late' : b.status === 'yellow' ? 'risk' : 'ok', b.statusName), body: [h('div', { class: 'm8-gauge' }, [h('div', { class: 'trk' }, [h('i', { class: b.status, style: 'width:' + pct + '%' }), h('span', { class: 'lim', style: 'left:' + limPct + '%' })]), h('div', { class: 'lb' }, [h('span', {}, ['今日 ' + b.today + ' h']), h('span', {}, ['上限 ' + b.max + ' h']), h('span', {}, [fmtN(b.units) + ' ' + v.unit])])]), h('div', { style: 'margin-top:10px' }, [P.kv([['明日允许' + v.release, fmtN(b.release.allowedUnits) + ' ' + v.unit], [b.release.line.name + '明日计划', b.release.before + ' → ' + b.release.after + ' h'], ['暂缓' + v.lots, b.release.heldLots.length ? b.release.heldLots.map(function (l) { return l.id + '（交期 ' + l.dueDay + ' 天）'; }).join('、') : '无'], [v.wip + '天数', b.wipDays.before + ' → ' + b.wipDays.after + ' 天'], ['释放人时', HH(b.release.freedHours) + '/日 · ' + b.release.line.name]])])], foot: [d.releasePlan ? P.chip('ok', v.release + '计划已下发 ' + K.short(d.releasePlan.date)) : P.btn('按' + v.bottleneck + '节拍' + v.release, { cls: 'primary', onClick: function () { commit(K.applyRelease(M.data, LIB), b.release.line.name + ' ' + K.short(b.release.date) + ' 计划 ' + b.release.before + ' → ' + b.release.after + ' h · 已下发' + v.roles.foreman); }, disabled: b.release.freedHours <= 0 && !b.release.heldLots.length })] }));
    g.appendChild(right);
    // 标准工时校准
    var ct = P.table({ compact: true, cols: [
      { key: 'productName', label: M.arche === 'service' ? '服务项目' : '产品' }, { key: 'op', label: v.op }, { key: 'std', label: '标准', align: 'right', render: function (r) { return r.std + ' h/' + v.unit; } }, { key: 'median', label: '12 周中位', align: 'right', render: function (r) { return r.median + ' h/' + v.unit; } },
      { key: 'dev', label: '偏差', align: 'right', sort: true, render: function (r) { return h('b', { class: 'num', style: Math.abs(r.dev) >= 15 ? 'color:var(--t-late)' : '' }, [(r.dev > 0 ? '+' : '') + r.dev + '%']); } }, { key: 'n', label: '批次', align: 'right' }, { key: 'stable', label: '稳定性', render: function (r) { return r.stable ? '稳定' : '波动'; } },
      { key: 'status', label: '状态', render: function (r) { return r.adopted ? P.chip('ok', '已采纳') : P.chip(r.status === 'expired' ? 'late' : 'done', r.statusName + (r.status === 'expired' ? ' · ' + r.direction : '')); } },
      { key: 'suggest', label: 'AI 建议', align: 'right', render: function (r) { return r.suggest && !r.adopted ? h('span', {}, [r.suggest + ' h ', P.btn('采纳', { cls: 'sm', onClick: function () { commit(K.adoptStd(M.data, LIB, r.product, r.op), r.productName + ' ' + r.op + ' 标准工时 ' + r.std + ' → ' + r.suggest + ' h · ' + v.roles.eng + '复核后同步'); } })]) : (r.adopted ? r.suggest + ' h' : '—'); } }
    ], rows: R.calibration.slice(0, 10), empty: '无' });
    g.appendChild(P.card({ cls: 'c12', title: '标准工时校准', sub: '过期 ' + R.kpi.stdExpired + ' 项 · |偏差| ≥ 15% 且稳定（批次 ≥ 8、四分位距 / 中位 < 25%）才判过期 · 采纳后排程与在制预测重算', body: [ct] }));
    work.appendChild(g);
  }
  function openLoss(id, loss, lineId) {
    var d = M.data, v = V(), reps = d.reports.filter(function (r) { return r.line === lineId && r.date >= d.weekStart; });
    var body, title;
    if (id === 'setup') { var rows = reps.filter(function (r) { return r.setupMin > 0; }); title = v.setup + '记录 · ' + loss.line.name; body = [P.kv([['本周' + v.setup, rows.length + ' 次 · 平均 ' + (rows.length ? Math.round(rows.reduce(function (a, r) { return a + r.setupMin; }, 0) / rows.length) : 0) + ' min'], ['合批后', R_().sequence.before.changeovers + ' 次 → ' + R_().sequence.after.changeovers + ' 次 · 省 ' + R_().sequence.savedHPerDay + ' h/日']]), P.table({ compact: true, cols: [{ key: 'date', label: '日期', render: function (r) { return K.short(r.date) + ' ' + (r.shift === 'A' ? v.shiftA : v.shiftB); } }, { key: 'machine', label: v.machine }, { key: 'order', label: v.lot }, { key: 'product', label: '产品' }, { key: 'setupMin', label: v.setup, align: 'right', render: function (r) { return r.setupMin + ' min'; } }, { key: 'firstPieceOk', label: v.firstPieceCheck, render: function (r) { return r.firstPieceOk ? '已确认' : P.chip('late', '缺失'); } }], rows: rows })]; }
    else if (id.indexOf('wait:') === 0) { var reason = id.slice(5); var rows2 = reps.filter(function (r) { return r.waitMin > 0 && r.waitReason === reason; }); title = reason + '记录 · ' + loss.line.name; body = [P.table({ compact: true, cols: [{ key: 'date', label: '日期', render: function (r) { return K.short(r.date); } }, { key: 'order', label: v.lot }, { key: 'op', label: v.op }, { key: 'emp', label: 'E-编号' }, { key: 'waitMin', label: v.wait, align: 'right', render: function (r) { return r.waitMin + ' min'; } }], rows: rows2, empty: '无记录' })]; }
    else if (id === 'down') { var ms = d.machines.filter(function (m) { return m.line === lineId; }); title = v.down + '记录 · ' + loss.line.name; var ev = []; ms.forEach(function (m) { (m.downEvents || []).forEach(function (e) { ev.push({ machine: m.id, date: e.date, min: e.toMin - e.fromMin, reason: e.reason }); }); }); body = [P.table({ compact: true, cols: [{ key: 'machine', label: v.machine }, { key: 'date', label: '日期', render: function (r) { return K.short(r.date); } }, { key: 'min', label: '时长', align: 'right', render: function (r) { return r.min + ' min'; } }, { key: 'reason', label: '原因' }], rows: ev, empty: '本周无' + v.down })]; }
    else { title = loss.line.name; var lw = d.lossWeekly.filter(function (x) { return x.line === lineId; }); body = [P.table({ compact: true, cols: [{ key: 'week', label: '周', render: function (r) { return K.short(r.week); } }, { key: 'setupMin', label: v.setup, align: 'right', render: function (r) { return Math.round(r.setupMin / 60) + ' h'; } }, { key: 'downMin', label: v.down, align: 'right', render: function (r) { return Math.round(r.downMin / 60) + ' h'; } }, { key: 'speedMin', label: v.speed, align: 'right', render: function (r) { return Math.round(r.speedMin / 60) + ' h'; } }, { key: 'reworkMin', label: v.rework, align: 'right', render: function (r) { return Math.round(r.reworkMin / 60) + ' h'; } }], rows: lw })]; }
    var dr = P.drawer(M.frame.body, { title: title, body: body, actions: [P.btn('锁定改善点：' + (id === 'setup' ? v.setup : id.indexOf('wait:') === 0 ? id.slice(5) : v.down), { cls: 'primary', onClick: function () { M.data.focus = lineId; M.data.focusLoss = id; dr.close(); setStep('improve'); } })] });
  }
  function R_() { return M.R; }

  /* ---------- 屏 4 改善预演 ---------- */
  function paramsOf() { var p = {}; Object.keys(M.params).forEach(function (k) { p[k] = M.params[k]; }); return p; }
  function seqStrip(seqIds, cost, label) {
    var d = M.data, v = V(), byId = {}; d.jobsToday.forEach(function (j) { byId[j.id] = j; });
    var strip = h('div', { class: 'strip' }), total = 0; seqIds.forEach(function (id) { total += byId[id].qty; });
    seqIds.forEach(function (id, i) { var j = byId[id]; if (i) { var c = K.seqCost(d, [byId[seqIds[i - 1]], j], cost.factor).minutes; strip.appendChild(h('span', { class: 'gap ' + (c >= d.setupMatrix.diffFixture * cost.factor ? 'big' : c >= d.setupMatrix.sameFixture * cost.factor ? '' : 'small'), style: 'flex:0 0 ' + Math.max(18, c * 1.2) + 'px', title: v.setup + ' ' + c + ' min' }, [String(c)])); } strip.appendChild(h('span', { class: 'lot', style: 'flex:' + Math.max(1, j.qty) + ' 1 0;background:' + lotColor(j.product), title: j.id + ' · ' + j.product + ' · ' + fmtN(j.qty) + ' ' + v.unit + ' · ' + j.fixture + ' / ' + j.program }, [j.product])); });
    return h('div', { class: 'row' }, [h('span', { class: 'lb' }, [label]), strip]);
  }
  function screenImprove(work) {
    var R = M.R, d = M.data, v = V(), pv = K.preview(d, LIB, null, paramsOf(), R), base = pv.base.metrics, cards = R.improveCards;
    work.classList.add('m8-improve');
    var g = h('div', { class: 'pd-grid' });
    if (!M.pick) M.pick = pv.recommended;
    var fmtDelta = function (a, b, unit, goodDown) { var dlt = Math.round((a - b) * 10) / 10; return { text: b + ' → ' + a + (unit || ''), tone: dlt === 0 ? '' : ((goodDown ? dlt < 0 : dlt > 0) ? 'good' : 'bad') }; };
    var opts = pv.cards.map(function (c) { var m = c.result.metrics; return { key: c.key, name: c.name, recommended: c.recommended, headline: { big: m.queueDays + ' 天', sub: v.queue + '（现 ' + base.queueDays + ' 天）', tone: m.queueDays < base.queueDays ? 'good' : '' }, rows: [{ k: v.bottleneck + '负荷', v: base.load + '% → ' + m.load + '%' }, { k: v.capacity, v: fmtN(base.weeklyUnits) + ' → ' + fmtN(m.weeklyUnits) + ' ' + v.unit, tone: m.weeklyUnits > base.weeklyUnits ? 'good' : '' }, { k: v.flowDays, v: pv.base.flowDays + ' → ' + c.result.flowDays + ' 天' }, { k: '加班', v: base.otHours + ' → ' + m.otHours + ' h/周', tone: m.otHours > 0 ? 'bad' : '' }, c.key === 'D' ? { k: '费用', v: fmtN(c.result.cost) + ' 元 · 预计', tone: 'bad' } : { k: '责任岗位', v: c.roleName }], notes: c.result.notes.join('；') }; });
    var cm = pv.combo.result.metrics;
    opts.push({ key: '组合', name: 'A + B + C', headline: { big: cm.queueDays + ' 天', sub: v.queue + '（现 ' + base.queueDays + ' 天）', tone: 'good' }, rows: [{ k: v.bottleneck + '负荷', v: base.load + '% → ' + cm.load + '%' }, { k: v.capacity, v: fmtN(base.weeklyUnits) + ' → ' + fmtN(cm.weeklyUnits) + ' ' + v.unit, tone: 'good' }, { k: v.flowDays, v: pv.base.flowDays + ' → ' + pv.combo.result.flowDays + ' 天' }, { k: '加班', v: base.otHours + ' → ' + cm.otHours + ' h/周' }, { k: '责任岗位', v: v.roles.eng + ' · ' + v.roles.foreman + ' · ' + v.roles.lead }], notes: pv.combo.result.notes.join('；') });
    g.appendChild(P.card({ cls: 'c12', title: '改善方案预演', sub: '四个方案在 AI ERP 排程引擎上重算 · 指标只用' + v.op + '口径 · AI 推荐 = 不加班优先，' + v.queue + '最短', body: [P.compare({ options: opts, active: M.pick, onPick: function (key) { M.pick = key; draw(); } })] }));
    // 参数
    var pm = h('div', { class: 'm8-params' });
    cards.forEach(function (c) { c.params.forEach(function (p) { var cur = M.params[p.key] != null ? M.params[p.key] : p.default; var lab = h('label', {}, [c.key + ' · ' + p.label, h('b', { class: 'num' }, [cur + ' ' + p.unit])]); pm.appendChild(h('div', { class: 'pm' }, [lab, h('input', { type: 'range', min: String(p.min), max: String(p.max), step: String(p.step), value: String(cur), oninput: function (e) { M.params[p.key] = parseFloat(e.target.value); lab.querySelector('b').textContent = e.target.value + ' ' + p.unit; }, onchange: function () { draw(); } }), h('div', { class: 'mm' }, [h('span', {}, [p.min + ' ' + p.unit]), h('span', {}, [p.max + ' ' + p.unit])])])); }); });
    var keys = M.pick === '组合' ? pv.combo.keys : [M.pick];
    g.appendChild(P.card({ cls: 'c4', title: '参数', sub: '拖动后重算 · 立项写入项目台账', body: [pm], foot: [P.btn('立项 ' + (M.pick === '组合' ? 'A + B + C' : M.pick), { cls: 'primary', onClick: function () { var nd = K.commitProject(M.data, LIB, keys, paramsOf()), np = nd.projects[nd.projects.length - 1]; commit(nd, '已立项 ' + np.id + ' · ' + np.owner + ' · 目标 ' + v.queue + ' ≤ ' + np.target.queueDays + ' 天 · 预计 ' + np.baseline.queueDays + ' → ' + np.expected.queueDays + ' 天'); }, disabled: d.projects.some(function (p) { return p.keys.join() === keys.slice().sort().join(); }) })] }));
    // 换型顺序
    var q = K.sequenceJobs(d, LIB, M.params.setupMin), cost = { factor: q.factor };
    var seq = h('div', { class: 'm8-seq' }, [seqStrip(q.before.seq, cost, '当前顺序'), seqStrip(d.jobSeq ? d.jobSeq.seq : q.after.seq, cost, d.jobSeq ? '已下发' : 'AI 重排')]);
    var legend = h('div', { class: 'legend' }); R.es.products.forEach(function (p) { if (d.jobsToday.some(function (j) { return j.product === p.id; })) legend.appendChild(h('span', {}, [h('i', { style: 'background:' + lotColor(p.id) }), p.id + ' ' + p.name + ' · ' + (d.fixtures[p.id] ? d.fixtures[p.id].fixture + ' / ' + d.fixtures[p.id].program : '')])); }); seq.appendChild(legend);
    var st = P.table({ compact: true, cols: [{ key: 'seq', label: '序', w: '40px', align: 'right' }, { key: 'id', label: v.lot }, { key: 'order', label: '来源' }, { key: 'product', label: '产品' }, { key: 'qty', label: '数量', align: 'right', render: function (r) { return fmtN(r.qty); } }, { key: 'dueDay', label: '交期', align: 'right', render: function (r) { return r.dueDay + ' 天'; } }, { key: 'fixture', label: v.tooling + ' / ' + v.program, render: function (r) { return r.fixture + ' / ' + r.program; } }, { key: 'setupMin', label: v.setup, align: 'right', render: function (r) { return r.setupMin ? r.setupMin + ' min · ' + r.kind : '—'; } }], rows: q.after.rows });
    g.appendChild(P.card({ cls: 'c8', title: v.setup + '合批 · ' + R.bottleneck.line.name + ' 今日 ' + d.jobsToday.length + ' 个' + v.lot, sub: '按' + v.tooling + '与' + v.program + '相似度枚举顺序 · 交期 ≤ 1 天的' + v.lot + '保持在前半段 · ' + v.setup + ' ' + q.before.changeovers + ' 次 ' + K.r1(q.before.minutes / 60) + ' h → ' + q.after.changeovers + ' 次 ' + K.r1(q.after.minutes / 60) + ' h', extra: d.jobSeq ? P.chip('ok', '顺序表已下发 · 省 ' + d.jobSeq.savedHPerDay + ' h/日') : P.btn('AI 重排今日顺序', { cls: 'primary sm', onClick: function () { commit(K.applySequence(M.data, LIB, M.params.setupMin), v.setup + ' ' + q.before.changeovers + ' 次 → ' + q.after.changeovers + ' 次 · 省 ' + q.savedHPerDay + ' h/日 · 顺序表已下发' + v.roles.foreman); } }), body: [seq, h('div', { style: 'margin-top:12px' }, [P.kv([[v.setup + '次数', q.before.changeovers + ' → ' + q.after.changeovers], [v.setup + '时间', K.r1(q.before.minutes / 60) + ' → ' + K.r1(q.after.minutes / 60) + ' h/日'], ['节省', q.savedHPerDay + ' h/日 ≈ ' + fmtN(Math.round(q.savedHPerDay / (R.bottleneck.hpu || 1))) + ' ' + v.unit + '/日'], ['停机' + v.setup, q.steps.internal + ' min'], ['不停机准备', q.steps.external + ' min'], ['交期约束', q.dueOk ? '满足' : '未满足']])]), h('div', { style: 'margin-top:12px' }, [st])] }));
    // 项目台账
    var pt = P.table({ compact: true, cols: [{ key: 'id', label: '编号' }, { key: 'name', label: '方案' }, { key: 'owner', label: '责任岗位' }, { key: 'target', label: '目标', render: function (p) { return v.queue + ' ≤ ' + p.target.queueDays + ' 天'; } }, { key: 'expected', label: '预计', render: function (p) { return p.baseline.queueDays + ' → ' + p.expected.queueDays + ' 天'; } }, { key: 'status', label: '状态', render: function (p) { return P.chip(p.status === 'executing' ? 'handled' : 'watch', p.status === 'executing' ? '执行中' : '观察中'); } }], rows: d.projects, empty: '尚无立项 · 选中方案后点「立项」' });
    g.appendChild(P.card({ cls: 'c12', title: '改善项目台账', sub: d.projects.length + ' 项', body: [pt], foot: [d.projects.length ? P.btn('去执行与派工', { cls: 'sm', onClick: function () { setStep('exec'); } }) : null] }));
    work.appendChild(g);
  }

  /* ---------- 屏 5 执行与派工 ---------- */
  function screenExec(work) {
    var R = M.R, d = M.data, v = V(), dp = R.dispatch;
    work.classList.add('m8-exec');
    var g = h('div', { class: 'pd-grid' });
    var left = col('c7', []);
    // 项目节点
    var pj = h('div', { style: 'display:grid;gap:12px' });
    d.projects.forEach(function (p) {
      var ms = h('div', { class: 'm8-ms' });
      p.milestones.forEach(function (m, i) { var st = m.status === 'done' ? 'done' : (i === 0 || p.milestones[i - 1].status === 'done') ? 'doing' : ''; ms.appendChild(h('div', { class: 'm ' + st }, [h('span', { class: 'i' }, [m.status === 'done' ? '✓' : String(i + 1)]), h('span', { class: 't' }, [m.title, h('span', { class: 'o' }, [m.owner])]), h('span', { class: 'due' }, [K.short(m.due) + ' 前']), m.status === 'done' ? P.chip('ok', '已完成', true) : (st === 'doing' ? P.btn('完成', { cls: 'sm', onClick: function () { commit(K.setMilestone(M.data, LIB, p.id, i, 'done'), p.id + ' 节点完成 · ' + m.title); } }) : h('span'))])); });
      pj.appendChild(h('div', {}, [h('div', { style: 'display:flex;gap:8px;align-items:center;margin-bottom:8px;flex-wrap:wrap' }, [h('b', {}, [p.id]), h('span', {}, [p.name]), P.chip(p.status === 'executing' ? 'handled' : 'watch', p.status === 'executing' ? '执行中' : '观察中'), h('span', { style: 'color:var(--pd-sub);font-size:12px' }, [p.owner + ' · 目标 ' + v.queue + ' ≤ ' + p.target.queueDays + ' 天 · 预计 ' + p.expected.queueDays + ' 天'])]), ms]));
    });
    if (!d.projects.length) pj.appendChild(P.empty('尚无改善项目 · 在改善预演里立项'));
    left.appendChild(P.card({ title: '改善项目台账', sub: d.projects.length + ' 项 · 节点按天排期', body: [pj], foot: [!d.projects.length ? P.btn('去改善预演', { cls: 'sm', onClick: function () { setStep('improve'); } }) : null] }));
    // 派工
    var dt = P.table({ compact: true, cols: [{ key: 'lineName', label: v.line }, { key: 'shift', label: '班次' }, { key: 'station', label: '工位' }, { key: 'emp', label: 'E-编号' }, { key: 'level', label: '技能', align: 'right', render: function (r) { return r.level + ' 级'; } }, { key: 'overtimeH', label: '本月加班', align: 'right', render: function (r) { return h('span', { style: r.overtimeH > d.otCap.month ? 'color:var(--t-late);font-weight:700' : '' }, [r.overtimeH + ' h']); } }, { key: 'flag', label: '', render: function (r) { return r.support ? P.chip('handled', v.support + ' · 来自' + r.home) : r.assist ? P.chip('watch', v.assist) : ''; } }], rows: dp.rows, rowClass: function (r) { return r.support ? 'on' : ''; } });
    left.appendChild(P.card({ title: '明日' + v.dispatch + ' ' + dp.id, sub: K.short(dp.date) + ' · 技能 2 级以上优先，加班少者优先，' + v.support + '来自低负荷' + v.line + '，超限人员不排加班', extra: d.dispatch ? P.chip('ok', '已下发 ' + v.roles.foreman) : P.btn('生成明日' + v.dispatch, { cls: 'primary sm', onClick: function () { commit(K.applyDispatch(M.data, LIB), v.dispatch + ' ' + dp.id + ' 已下发 · ' + dp.filled + ' 人 · ' + v.support + ' ' + dp.support + ' 人' + (dp.otWeek.delta < 0 ? ' · 本周加班 ' + dp.otWeek.before + ' → ' + dp.otWeek.after + ' h' : '')); } }), body: [P.kpis([{ label: '需人', value: dp.need }, { label: '已派', value: dp.filled, tone: 'ok' }, { label: v.support, value: dp.support, tone: dp.support ? 'handled' : '' }, { label: '未覆盖', value: dp.unmet.reduce(function (a, u) { return a + u.missing; }, 0), tone: dp.unmet.length ? 'late' : 'ok' }, { label: '超限不排加班', value: dp.overLimitNoOt, unit: '人' }, { label: '本周加班', value: dp.otWeek.after, unit: 'h', tone: dp.otWeek.delta < 0 ? 'ok' : '', sub: dp.otWeek.delta < 0 ? '原 ' + dp.otWeek.before + ' h · ' + v.support + '替代' : '与上周持平' }]), h('div', { style: 'margin-top:12px;max-height:360px;overflow:auto' }, [dt])], foot: [dp.secondShift ? h('span', {}, [lineName(d.spare.line) + ' ' + v.secondShift + '由 ' + dp.supportEmps.join('、') + ' ' + v.support]) : h('span', {}, ['立项含「' + T('{cardB}') + '」后，' + lineName(d.spare.line) + '的' + v.secondShift + '会出现在这里'])] }));
    g.appendChild(left);
    var right = col('c5', []);
    var hit = h('div', { class: 'm8-hit' }); R.planHit.forEach(function (p) { hit.appendChild(h('div', { class: 'r' }, [h('span', { class: 'lb', title: p.lineName }, [p.lineName]), P.bar(Math.min(100, p.pct), p.behind ? 'late' : 'ok', p.pct + '%'), h('span', { class: 'v' }, [fmtN(p.actual) + ' / ' + fmtN(p.target)])])); });
    right.appendChild(P.card({ title: v.report + '看板 · 今日' + v.shiftA, sub: '前 4 小时累计对计划 · 落后 15% 标红', body: [hit], foot: [R.planHit.filter(function (p) { return p.behind; }).length ? R.planHit.filter(function (p) { return p.behind; }).map(function (p) { return p.lineName; }).join('、') + ' 落后，已进异常预警' : '各线按计划推进'] }));
    var mt = h('div', { class: 'pd-list' }); R.maintenance.forEach(function (m) { mt.appendChild(P.item({ tone: m.scheduled ? 'done' : 'risk', icon: '保', title: m.machine + ' · ' + m.lineName, sub: m.reasons.join(' · ') + (m.window ? ' · 建议窗口 ' + m.window.label + '（负荷 ' + m.window.pct + '%）· ' + m.minutes + ' min · ' + m.role : ''), right: m.scheduled ? P.chip('done', '已排 ' + K.short(m.scheduledAt)) : P.btn('排入窗口', { cls: 'sm', onClick: function () { commit(K.scheduleMaint(M.data, LIB, m.machine), m.machine + ' ' + v.maint + '排入 ' + m.window.label + ' · ' + m.role); }, disabled: !m.window }) })); });
    if (!R.maintenance.length) mt.appendChild(P.empty('无到期' + v.maint));
    right.appendChild(P.card({ title: v.maint + '窗口', sub: '到期 ' + R.kpi.maintDue + ' · 排进未来 7 天负荷最低的班次，' + v.bottleneck + '避开缓冲高位日', body: [mt] }));
    var sk = h('div', { class: 'm8-skill' }); R.skills.coverage.forEach(function (c) { sk.appendChild(h('div', { class: 'c' + (c.single ? ' single' : '') }, [h('div', { class: 't' }, [c.op, c.single ? P.chip('risk', '单点') : P.chip('ok', '充足')]), h('div', { style: 'color:var(--pd-sub);font-size:12px' }, ['2 级以上 ' + c.qualified + ' 人 · 每日需 ' + c.need + ' 人 · 覆盖度 ' + c.ratio])])); });
    var pairs = h('div', { class: 'pd-list', style: 'margin-top:10px' }); R.skills.pairs.forEach(function (p) { pairs.appendChild(P.item({ tone: p.added ? 'done' : 'accent', icon: '教', title: p.trainee + ' 由 ' + p.mentor + ' 带教 ' + p.op, sub: '派工时排为' + v.assist + ' · 目标 2 级', right: p.added ? P.chip('done', '本周带教') : P.btn('加入本周带教', { cls: 'sm', onClick: function () { commit(K.addTraining(M.data, LIB, p.trainee, p.op), p.trainee + ' 加入本周带教 · ' + p.op); } }) })); });
    right.appendChild(P.card({ title: '技能矩阵', sub: '由 12 周' + v.report + '算出 0–3 级 · 覆盖度 < 1.5 为单点', body: [sk, R.skills.pairs.length ? pairs : null] }));
    var al = h('div', { class: 'pd-list' }); R.alerts.forEach(function (a) { al.appendChild(P.item({ tone: a.status === 'open' ? 'late' : a.status === 'doing' ? 'handled' : 'done', icon: '!', title: a.ruleName + (a.machine ? ' · ' + a.machine : ''), sub: a.action + ' · ' + a.roleName, right: a.status === 'open' ? P.btn('处置', { cls: 'sm', onClick: function () { commit(K.handleException(M.data, LIB, a.id), a.id + ' ' + a.action + ' · ' + a.roleName); } }) : P.chip(a.status === 'doing' ? 'handled' : 'done', a.statusName) })); });
    right.appendChild(P.card({ title: '异常处置', sub: '待处置 ' + R.kpi.alertsOpen + ' / ' + R.alerts.length, body: [al] }));
    g.appendChild(right);
    work.appendChild(g);
  }

  /* ---------- 屏 6 提效周报 ---------- */
  function screenReport(work) {
    var R = M.R, d = M.data, v = V(), L = R.ledger, W = R.weekly;
    work.classList.add('m8-report');
    var g = h('div', { class: 'pd-grid' });
    g.appendChild(h('div', { class: 'c12' }, [P.kpis([
      { label: '本周 AI 建议预计节省', value: R.kpi.savedH, unit: 'h', tone: 'ok', sub: v.bottleneck + '工时 ' + L.totals.bottleneckH + ' h · 其他 ' + L.totals.nonBottleneckH + ' h' },
      { label: '折算' + v.output, value: fmtN(L.totals.units), unit: v.unit, sub: '按' + v.bottleneck + '单件工时折算 · 预计' },
      { label: '加班减少', value: L.totals.otH, unit: 'h', tone: L.totals.otH ? 'ok' : '', sub: '本周 ' + W.current.otHours + ' h → ' + R.dispatch.otWeek.after + ' h' },
      { label: v.flowDays, value: R.committed && R.committed.flowDays != null ? R.committed.flowDays : W.current.flowDays, unit: '天', sub: R.committed ? '立项前 ' + W.current.flowDays + ' 天 · 预计' : '本周 · 未立项' },
      { label: v.queue, value: R.committed ? R.committed.metrics.queueDays : R.metrics.queueDays, unit: '天', tone: R.committed ? 'ok' : '', sub: R.committed ? '立项前 ' + R.metrics.queueDays + ' 天 · 预计' : '本周' }
    ])]));
    var left = col('c7', []);
    var wfItems = L.byKind.map(function (k) { return { id: k.kind, label: k.label, value: k.value }; });
    var lt = P.table({ compact: true, cols: [{ key: 'kindName', label: '类别', w: '64px', render: function (r) { return P.chip('handled', r.kindName, true); } }, { key: 'action', label: '采纳的建议' }, { key: 'role', label: '责任岗位' }, { key: 'savedH', label: '节省', align: 'right', render: function (r) { return r.savedH + ' h/周'; } }, { key: 'units', label: '折算', align: 'right', render: function (r) { return r.kind === 'ot' ? '加班 −' + r.savedH + ' h' : r.isBottleneck ? fmtN(r.units) + ' ' + v.unit : '非约束工时'; } }, { key: 'basis', label: '依据' }], rows: L.rows, empty: '本周尚无采纳记录 · 每采纳一条 AI 建议在这里入账' });
    left.appendChild(P.card({ title: '增效账', sub: L.rows.length + ' 条 · 按小时入账，' + v.bottleneck + '工时折算' + v.unit + '，全部预计', body: [wfItems.length ? P.waterfall({ start: { label: '本周', value: 0 }, end: { label: '合计', value: K.r1(L.totals.bottleneckH + L.totals.nonBottleneckH) }, items: wfItems, fmt: function (x) { return x + ' h'; }, axisFmt: function (x) { return Math.round(x) + ''; }, width: 700, height: 200 }) : null, h('div', { style: 'margin-top:10px' }, [lt])] }));
    var labels = W.series.map(function (s) { return s.label; });
    left.appendChild(P.card({ title: '12 周趋势', sub: '有效利用率（%）与本周加班（h）', body: [P.lineChart({ labels: labels, series: [{ values: W.series.map(function (s) { return s.effUtil; }), color: ACCENT.pa, fmt: function (x) { return x + '%'; } }, { values: W.series.map(function (s) { return s.otHours; }), color: '#E8862B', fmt: function (x) { return x + ' h'; }, right: true, bar: true }], height: 190, width: 700, right: true, every: 2 })], foot: [v.flowDays + ' 12 周：' + W.series[0].flowDays + ' → ' + W.series[W.series.length - 1].flowDays + ' 天' + (R.committed && R.committed.flowDays != null ? ' → 预计 ' + R.committed.flowDays + ' 天' : '')] }));
    var cmp = P.table({ compact: true, cols: [{ key: 'k', label: '指标' }, { key: 'before', label: '改善前', align: 'right' }, { key: 'after', label: '改善后（预计）', align: 'right' }], rows: W.compare });
    var vf = P.table({ compact: true, cols: [{ key: 'id', label: '项目' }, { key: 'name', label: '方案' }, { key: 'target', label: '目标' }, { key: 'expected', label: '预计', align: 'right' }, { key: 'actual', label: '实际', align: 'right' }, { key: 'due', label: '核验日', render: function (r) { return K.short(r.due); } }, { key: 'statusName', label: '状态', render: function (r) { return P.chip(r.status === 'ok' ? 'ok' : r.status === 'miss' ? 'late' : 'watch', r.statusName); } }], rows: W.verify, empty: '尚无立项' });
    left.appendChild(P.card({ title: '效果核验', sub: '达标 = 实际达到目标且连续两周 · 节点未完成为观察中', body: [cmp, h('div', { style: 'margin-top:12px' }, [vf])] }));
    g.appendChild(left);
    var right = col('c5', []);
    var who = h('div', { class: 'who' }); W.recipients.forEach(function (r) { who.appendChild(h('span', {}, [r])); });
    right.appendChild(P.card({ title: v.dept + '提效周报', sub: K.short(d.weekStart) + ' 周 · 微信文本版', body: [h('div', { class: 'pd-field' }, [h('label', {}, ['收件人']), who]), h('div', { class: 'pd-pre', style: 'margin-top:10px;max-height:420px;overflow:auto' }, [W.text])], foot: [P.btn('发送到微信', { cls: 'primary', onClick: function () { sh.setQrReady(true); sh.showWeChat(); } }), P.btn('回到看板', { onClick: function () { setStep('board'); } })] }));
    right.appendChild(P.card({ title: '本周动作', sub: d.log.length + ' 条', body: [P.log(d.log, { limit: 12, empty: '尚无动作' })] }));
    g.appendChild(right);
    work.appendChild(g);
  }

  window.DGG.registerModule('m8', { mount: mount, unmount: unmount, onCompany: onCompany, onIndustry: onIndustry });
})();
