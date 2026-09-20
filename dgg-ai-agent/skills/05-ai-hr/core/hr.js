/*
 * AI人力官 · 内核
 * 输入：一家企业的花名册（逐人：岗位、合同、工资、社保基数、工时、假期）、近 12 个月离职、招聘需求单与结构化简历 + 岗位库 / JD 段落块 / 面试题库 / 合规规则 / 成本参数
 * 计算：组织盘点 → JD 拼装 → 简历硬门槛与加权匹配打分（逐条解释）→ 结构化面试评分、录用建议与 offer 定薪 → 用工合规逐条核对（涉及人数、影响金额、整改动作）
 *       → 用工成本结构与 12 个月三方案编制对比 → 90 天人事日历 → KPI 与月报
 * 发布 JD、初筛、安排面试、录入评分、发 offer、合规整改、采纳方案都写进同一份数据副本，各屏按副本重算。
 * 确定性、离线、无网络。UMD：Node 与浏览器共用。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.DGG = root.DGG || {}; root.DGG.coreM5 = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VERSION = '1.2.0';
  var MODULE_NAME = 'AI人力官';
  var CREDITS = 30;
  var DAY = 86400000;
  var STAGES = [['new', '新简历'], ['screened', '初筛通过'], ['interview', '面试安排'], ['done', '面试完成'], ['offer', '已发 offer'], ['hired', '已入职'], ['rejected', '已淘汰']];
  var STAGE_NAME = {}; STAGES.forEach(function (s) { STAGE_NAME[s[0]] = s[1]; });
  var STAGE_IDX = {}; STAGES.forEach(function (s, i) { STAGE_IDX[s[0]] = i; });
  var RELATED = { mfg: ['auto', 'energy', 'other'], trade: ['logi', 'tech'], prof: ['fin', 'other'] };
  var SEV_LABEL = { high: '高', mid: '中', low: '低' };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function r0(n) { return Math.round(n); }
  function r100(n) { return Math.round(n / 100) * 100; }
  function sum(a) { return a.reduce(function (t, x) { return t + x; }, 0); }
  function fmtN(n) { return (n < 0 ? '−' : '') + String(Math.abs(Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function fmtW(n) { return Math.abs(n) >= 10000 ? (Math.round(n / 1000) / 10) + ' 万元' : fmtN(n) + ' 元'; }
  function ms(s) { var p = s.split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2]); }
  function dateOf(base, d) { var t = new Date(ms(base) + d * DAY); return t.getUTCFullYear() + '-' + String(t.getUTCMonth() + 1).padStart(2, '0') + '-' + String(t.getUTCDate()).padStart(2, '0'); }
  function addMonths(s, m) { var p = s.split('-'); var mm = +p[1] - 1 + m; var yy = +p[0] + Math.floor(mm / 12); mm = ((mm % 12) + 12) % 12; return yy + '-' + String(mm + 1).padStart(2, '0') + '-' + (p[2] || '01'); }
  function short(s) { var p = s.split('-'); return (+p[1]) + '-' + (+p[2]); }
  function days(a, b) { return Math.round((ms(b) - ms(a)) / DAY); }
  function monthsBetween(a, b) { var pa = a.split('-'), pb = b.split('-'); return (+pb[0] - +pa[0]) * 12 + (+pb[1] - +pa[1]) + (+pb[2] >= +pa[2] ? 0 : -1); }
  function median(arr) { if (!arr.length) return 0; var s = arr.slice().sort(function (a, b) { return a - b; }); var m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
  function fill(t, ctx) { return String(t).replace(/\{(\w+)\}/g, function (_, k) { return ctx[k] != null ? ctx[k] : ''; }); }

  function ensure(raw) {
    var d = clone(raw);
    d.resolved = d.resolved || {}; d.log = d.log || []; d.plan = d.plan || null;
    d.candidates.forEach(function (c) { c.stage = c.stage || 'new'; c.scores = c.scores || null; c.offer = c.offer || null; c.certs = c.certs || []; c.industries = c.industries || []; c.skills = c.skills || []; });
    d.needs.forEach(function (n) { n.status = n.status || 'open'; });
    return d;
  }
  function region(d, lib) { return lib.costParams.regions[d.profile.province] || lib.costParams.regions['浙江']; }
  function jobOf(lib, key) { return lib.jobs.jobs[key] || { title: key, family: 'func', band: [5000, 8000] }; }
  function band(d, jobKey, lib) { var J = jobOf(lib, jobKey), f = (region(d, lib).bandFactor || 1) * (d.profile.wageIndex || 1); return [r100(J.band[0] * f), r100(J.band[1] * f)]; }
  function deptName(d, id) { var x = d.departments.filter(function (q) { return q.id === id; })[0]; return x ? x.name : id; }

  /* ---------------- 组织盘点 ---------------- */
  function org(d, lib) {
    var emps = d.employees, hc = emps.length, today = d.today;
    var byDept = d.departments.map(function (dp) {
      var list = emps.filter(function (e) { return e.dept === dp.id; }); var lv = d.leavers.filter(function (l) { return l.dept === dp.id; });
      return { id: dp.id, name: dp.name, headcount: list.length, budget: dp.budget, vacancy: dp.budget - list.length, avgWage: list.length ? r0(sum(list.map(function (e) { return e.wage; })) / list.length) : 0, leavers12: lv.length, turnover: list.length ? r0(100 * lv.length / list.length) : 0, overtimeOver: list.filter(function (e) { return e.overtimeH > lib.complianceRules.overtimeMonthlyMax; }).length, needs: d.needs.filter(function (n) { return n.dept === dp.id; }).reduce(function (t, n) { return t + n.count; }, 0) };
    });
    var budget = sum(d.departments.map(function (x) { return x.budget; }));
    var bucket = function (v, edges, labels) { for (var i = 0; i < edges.length; i++) if (v < edges[i]) return labels[i]; return labels[labels.length - 1]; };
    var tenureLabels = ['1 年以内', '1–3 年', '3–5 年', '5–10 年', '10 年以上'], ageLabels = ['30 岁以下', '30–40 岁', '40–50 岁', '50 岁以上'];
    var tenure = {}, age = {}, edu = {}, family = {};
    tenureLabels.forEach(function (l) { tenure[l] = 0; }); ageLabels.forEach(function (l) { age[l] = 0; });
    emps.forEach(function (e) {
      var ty = days(e.hireDate, today) / 365.25; tenure[bucket(ty, [1, 3, 5, 10], tenureLabels)]++;
      age[bucket(2026 - e.birthYear, [30, 40, 50], ageLabels)]++;
      edu[lib.jobs.edu[e.edu] || e.edu] = (edu[lib.jobs.edu[e.edu] || e.edu] || 0) + 1;
      family[e.family] = (family[e.family] || 0) + 1;
    });
    var reasons = {}; d.leavers.forEach(function (l) { reasons[l.reason] = (reasons[l.reason] || 0) + 1; });
    var months = []; for (var i = 11; i >= 0; i--) months.push(addMonths(today.slice(0, 7) + '-01', -i).slice(0, 7));
    var leaversByMonth = months.map(function (m) { return { month: m, label: (+m.slice(5)) + '月', count: d.leavers.filter(function (l) { return l.date.slice(0, 7) === m; }).length }; });
    var hires12 = emps.filter(function (e) { return days(e.hireDate, today) <= 365; }).length;
    var turnover = r0(100 * d.leavers.length / hc);
    var bench = lib.costParams.benchmarks.turnover[d.sector] || 20;
    var dispatch = emps.filter(function (e) { return e.dispatch; }).length;
    var wageByJob = {}; emps.forEach(function (e) { (wageByJob[e.job] = wageByJob[e.job] || []).push(e.wage); });
    var jobStats = {}; Object.keys(wageByJob).forEach(function (j) { var a = wageByJob[j]; jobStats[j] = { count: a.length, median: median(a), min: Math.min.apply(null, a), max: Math.max.apply(null, a) }; });
    return { headcount: hc, budget: budget, vacancy: budget - hc, byDept: byDept, tenure: tenureLabels.map(function (l) { return { label: l, value: tenure[l] }; }), age: ageLabels.map(function (l) { return { label: l, value: age[l] }; }), edu: Object.keys(edu).map(function (k) { return { label: k, value: edu[k] }; }), family: Object.keys(family).map(function (k) { return { key: k, label: lib.jobs.families[k], value: family[k] }; }), turnover: turnover, turnoverBench: bench, leavers12: d.leavers.length, hires12: hires12, leaversByMonth: leaversByMonth, reasons: Object.keys(reasons).map(function (k) { return { label: k, value: reasons[k] }; }).sort(function (a, b) { return b.value - a.value; }), dispatch: dispatch, dispatchRatio: r0(1000 * dispatch / hc) / 10, avgWage: r0(sum(emps.map(function (e) { return e.wage; })) / hc), avgTenure: r0(10 * sum(emps.map(function (e) { return days(e.hireDate, today) / 365.25; })) / hc) / 10, female: emps.filter(function (e) { return e.gender === 'F'; }).length, jobStats: jobStats, perCapitaRevenue: r0(d.profile.revenue12 / hc) };
  }

  /* ---------------- JD ---------------- */
  function jd(d, needId, lib, variant) {
    var n = d.needs.filter(function (x) { return x.id === needId; })[0]; if (!n) return null;
    var J = jobOf(lib, n.job), B = lib.jdBlocks, fam = J.family, v = variant || 'site';
    var bd = band(d, n.job, lib), P = d.profile;
    var ctx = { company: d.company, founded: P.founded, product: P.product, headcount: d.employees.length, lines: P.lines, customers: P.customers, region: P.region, techCount: d.employees.filter(function (e) { return e.family === 'tech'; }).length, reason: n.reason, title: J.title, count: n.count, city: P.city, shift: J.shift || '标准工时', dueDate: short(n.dueDate), referralBonus: fmtN(lib.costParams.referralBonus[fam]) };
    var labels = function (arr) { return (arr || []).map(function (k) { return lib.jobs.skills[k] || lib.jobs.certs[k] || k; }); };
    var duties = (J.duties || []).map(function (t) { return fill(t, ctx); });
    var reqs = [(lib.jobs.edu[J.edu] || '') + '及以上学历', J.yearsMin + ' 年以上' + J.title + '或相关岗位经验', '熟悉' + labels(J.must).join('、')];
    if (J.certs && J.certs.length) reqs.push('持有' + labels(J.certs).join('、'));
    if (J.nice && J.nice.length) reqs.push('加分：' + labels(J.nice).join('、'));
    var pay = ['月薪 ' + fmtN(bd[0]) + '–' + fmtN(bd[1]) + ' 元，按能力定薪'].concat(B.benefits.common, B.benefits[fam] || []);
    var sections, title = J.title + '（' + n.count + ' 人）';
    if (v === 'poster') {
      sections = [
        { title: '我们在找', lines: [fill('{company} · {title} {count} 人 · {city}', ctx)] },
        { title: '做什么', lines: duties.slice(0, 3) },
        { title: '要求', lines: reqs.slice(0, 2) },
        { title: '待遇', lines: [pay[0], '五险一金 · ' + (B.benefits[fam] || []).slice(0, 2).join(' · ')] },
        { title: '内推', lines: [fill(B.posterTail, ctx)] }
      ];
    } else {
      sections = [
        { title: '公司与岗位', lines: [fill(B.intro[fam] || B.intro.func, ctx)] },
        { title: '岗位职责', lines: duties.concat((B.dutiesCommon[fam] || []).map(function (t) { return fill(t, ctx); })) },
        { title: '任职要求', lines: reqs.concat(B.plus[fam] || []) },
        { title: '薪酬福利', lines: pay },
        { title: '工作地点与时间', lines: [fill(B.workplace, ctx)] }
      ];
    }
    var text = title + '\n' + sections.map(function (s) { return '【' + s.title + '】\n' + s.lines.map(function (l, i) { return (s.lines.length > 1 ? (i + 1) + '. ' : '') + l; }).join('\n'); }).join('\n');
    var vn = (B.variants.filter(function (x) { return x.key === v; })[0] || {}).name || v;
    return { needId: n.id, job: n.job, title: title, jobTitle: J.title, variant: v, variantName: vn, sections: sections, text: text, words: text.replace(/\s/g, '').length, band: bd, published: n.status === 'published', publishedVariant: n.publishedVariant, publishedAt: n.publishedAt };
  }
  function publish(raw, needId, variant, lib) { var d = ensure(raw); var n = d.needs.filter(function (x) { return x.id === needId; })[0]; if (!n) return d; n.status = 'published'; n.publishedVariant = variant || 'site'; n.publishedAt = d.today; var vn = ((lib.jdBlocks.variants.filter(function (x) { return x.key === n.publishedVariant; })[0]) || {}).name || n.publishedVariant; d.log.push({ seq: d.log.length + 1, kind: 'recruit', label: '发布 JD', detail: n.id + ' ' + jobOf(lib, n.job).title + ' ' + n.count + ' 人 · ' + vn }); return d; }

  /* ---------------- 简历打分 ---------------- */
  function screenOne(d, c, lib) {
    var n = d.needs.filter(function (x) { return x.id === c.needId; })[0]; var J = jobOf(lib, n.job), W = lib.jobs.screenWeights, G = lib.jobs.grades;
    var bd = band(d, n.job, lib), labels = function (arr) { return (arr || []).map(function (k) { return lib.jobs.skills[k] || lib.jobs.certs[k] || k; }); };
    var gates = [];
    if ((lib.jobs.eduRank[c.edu] || 0) < (lib.jobs.eduRank[J.edu] || 0)) gates.push('学历 ' + (lib.jobs.edu[c.edu] || c.edu) + '，要求 ' + lib.jobs.edu[J.edu] + ' 及以上');
    if (c.years < J.yearsMin) gates.push('经验 ' + c.years + ' 年，要求 ' + J.yearsMin + ' 年以上');
    var mustMiss = (J.must || []).filter(function (k) { return c.skills.indexOf(k) < 0; }); if (mustMiss.length) gates.push('缺必备技能：' + labels(mustMiss).join('、'));
    var certMiss = (J.certs || []).filter(function (k) { return c.certs.indexOf(k) < 0; }); if (certMiss.length) gates.push('缺证书：' + labels(certMiss).join('、'));
    var dueIn = days(d.today, n.dueDate); if (c.availableDays > dueIn) gates.push('到岗 ' + c.availableDays + ' 天，晚于需求日期 ' + short(n.dueDate));
    var mustHit = (J.must || []).length - mustMiss.length, niceHit = (J.nice || []).filter(function (k) { return c.skills.indexOf(k) >= 0; }).length;
    var skills = r0(100 * ((J.must || []).length ? mustHit / J.must.length * 0.65 : 0.65) + 100 * ((J.nice || []).length ? niceHit / J.nice.length * 0.35 : 0.35));
    var years = c.years >= J.yearsMin ? Math.min(100, 55 + (c.years - J.yearsMin) * 8) : Math.max(0, 55 - (J.yearsMin - c.years) * 25);
    var industry = c.industries.indexOf(d.sector) >= 0 ? 100 : c.industries.some(function (x) { return (RELATED[d.sector] || []).indexOf(x) >= 0; }) ? 60 : 20;
    var stability = Math.max(0, (c.lastTenureMonths >= 48 ? 100 : c.lastTenureMonths >= 36 ? 90 : c.lastTenureMonths >= 24 ? 75 : c.lastTenureMonths >= 12 ? 55 : 35) - 15 * Math.max(0, c.jobs5y - 2));
    var salary = c.expected <= bd[1] ? (c.expected >= bd[0] ? 100 : 90) : Math.max(0, r0(100 - (c.expected - bd[1]) / bd[1] * 400));
    var commute = c.distanceKm <= 15 ? 100 : c.distanceKm <= 30 ? 70 : 40;
    var dims = { skills: skills, years: years, industry: industry, stability: stability, salary: salary, commute: commute };
    var total = r0(sum(Object.keys(W).map(function (k) { return W[k] * dims[k]; })));
    var grade = gates.length ? 'D' : total >= G.A ? 'A' : total >= G.B ? 'B' : 'C';
    var seen = ['学历 ' + (lib.jobs.edu[c.edu] || c.edu) + ' · 经验 ' + c.years + ' 年 · 技能 ' + c.skills.length + ' 项' + (c.certs.length ? ' · 证书 ' + labels(c.certs).join('、') : ''), '最近一段 ' + c.lastTenureMonths + ' 个月 · 5 年内 ' + c.jobs5y + ' 份工作 · 行业 ' + (c.industries.length ? c.industries.join('、') : '无'), '期望 ' + fmtN(c.expected) + ' 元 · 薪酬带 ' + fmtN(bd[0]) + '–' + fmtN(bd[1]), '到岗 ' + c.availableDays + ' 天 · 通勤 ' + (c.distanceKm ? c.distanceKm + ' 公里' : '驻地') + ' · 来源 ' + (lib.jobs.sources[c.source] || c.source)];
    var reasons = [];
    reasons.push('必备技能 ' + mustHit + '/' + (J.must || []).length + ' 命中，加分项 ' + niceHit + '/' + (J.nice || []).length + (niceHit ? '（' + labels((J.nice || []).filter(function (k) { return c.skills.indexOf(k) >= 0; })).join('、') + '）' : ''));
    reasons.push(c.years >= J.yearsMin ? '经验 ' + c.years + ' 年，高出门槛 ' + (c.years - J.yearsMin) + ' 年' : '经验不足门槛 ' + (J.yearsMin - c.years) + ' 年');
    reasons.push(stability >= 75 ? '稳定：最近一段 ' + c.lastTenureMonths + ' 个月' : stability >= 55 ? '稳定性一般：最近一段 ' + c.lastTenureMonths + ' 个月' : '跳动较多：最近一段 ' + c.lastTenureMonths + ' 个月，5 年 ' + c.jobs5y + ' 份工作');
    if (salary < 100) reasons.push('期望 ' + fmtN(c.expected) + ' 元' + (c.expected > bd[1] ? '高于薪酬带上限 ' + fmtN(bd[1]) : '低于薪酬带下限'));
    if (industry < 100) reasons.push(industry === 60 ? '相关行业经验，非同行' : '无同行业经验');
    gates.forEach(function (g) { reasons.push('不满足硬条件：' + g); });
    return { total: total, grade: grade, dims: dims, gates: gates, seen: seen, reasons: reasons.slice(0, 5), band: bd, mustHit: mustHit, niceHit: niceHit };
  }
  function candidates(d, lib) {
    var rows = d.candidates.map(function (c) {
      var n = d.needs.filter(function (x) { return x.id === c.needId; })[0]; var J = jobOf(lib, n.job); var s = screenOne(d, c, lib);
      var action = c.stage === 'new' ? (s.grade === 'D' ? '淘汰' : '通过初筛') : c.stage === 'screened' ? '安排面试' : c.stage === 'interview' ? '录入评分' : c.stage === 'done' ? '录用决定' : c.stage === 'offer' ? '待入职' : c.stage === 'hired' ? '已入职' : '已淘汰';
      return Object.assign({}, c, { jobTitle: J.title, family: J.family, needTitle: J.title, stageName: STAGE_NAME[c.stage], stageIdx: STAGE_IDX[c.stage], sourceName: lib.jobs.sources[c.source] || c.source, eduName: lib.jobs.edu[c.edu] || c.edu, skillNames: c.skills.map(function (k) { return lib.jobs.skills[k] || k; }), score: s, total: s.total, grade: s.grade, action: action, interview: c.scores ? interviewResult(d, c, lib) : null });
    });
    rows.sort(function (a, b) { return b.total - a.total; });
    return rows;
  }
  function pass(raw, id) { return setStage(raw, id, 'screened', '通过初筛'); }
  function reject(raw, id) { return setStage(raw, id, 'rejected', '淘汰'); }
  function schedule(raw, id, date) { var d = setStage(raw, id, 'interview', '安排面试'); var c = d.candidates.filter(function (x) { return x.id === id; })[0]; if (c) { c.interviewDate = date || dateOf(d.today, 3); d.log[d.log.length - 1].detail += ' · ' + short(c.interviewDate); } return d; }
  function setStage(raw, id, stage, label) { var d = ensure(raw); var c = d.candidates.filter(function (x) { return x.id === id; })[0]; if (!c) return d; c.stage = stage; d.log.push({ seq: d.log.length + 1, kind: 'recruit', label: label, detail: c.id + ' → ' + STAGE_NAME[stage] }); return d; }
  function score(raw, id, scores, lib) { var d = ensure(raw); var c = d.candidates.filter(function (x) { return x.id === id; })[0]; if (!c) return d; c.scores = { pro: +scores.pro, coop: +scores.coop, stable: +scores.stable, value: +scores.value }; c.stage = 'done'; var r = interviewResult(d, c, lib); d.log.push({ seq: d.log.length + 1, kind: 'recruit', label: '录入面试评分', detail: c.id + ' 综合 ' + r.avg + ' 分 · ' + r.verdictName }); return d; }
  function offer(raw, id, salary, lib) { var d = ensure(raw); var c = d.candidates.filter(function (x) { return x.id === id; })[0]; if (!c) return d; var r = interviewResult(d, c, lib); c.offer = { salary: salary || r.suggested, date: d.today }; c.stage = 'offer'; d.log.push({ seq: d.log.length + 1, kind: 'recruit', label: '发 offer', detail: c.id + ' 月薪 ' + fmtN(c.offer.salary) + ' 元' }); return d; }

  /* ---------------- 面试 ---------------- */
  function interviewKit(d, c, lib) {
    var n = d.needs.filter(function (x) { return x.id === c.needId; })[0]; var J = jobOf(lib, n.job), fam = J.family, Q = lib.questions;
    var sets = lib.jobs.abilities.map(function (a) { return { key: a.key, label: a.label, weight: lib.jobs.abilityWeights[fam][a.key], questions: a.key === 'pro' ? (J.proQuestions || []) : (Q[a.key][fam] || []) }; });
    return { sets: sets, interviewers: lib.jobs.interviewers[fam] || ['部门负责人', '人事专员'], jobTitle: J.title, family: fam };
  }
  function interviewResult(d, c, lib) {
    var n = d.needs.filter(function (x) { return x.id === c.needId; })[0]; var J = jobOf(lib, n.job), Wt = lib.jobs.abilityWeights[J.family], V = lib.jobs.hireVerdict;
    var s = c.scores || { pro: 0, coop: 0, stable: 0, value: 0 };
    var avg = Math.round(100 * sum(Object.keys(Wt).map(function (k) { return Wt[k] * (s[k] || 0); }))) / 100;
    var verdict = avg >= V.hire ? 'hire' : avg >= V.backup ? 'backup' : 'no';
    var bd = band(d, n.job, lib); var st = org(d, lib).jobStats[n.job]; var med = st ? st.median : (bd[0] + bd[1]) / 2;
    var suggested = Math.min(bd[1], Math.max(bd[0], r100(Math.max(c.expected, med * (1 + (avg - 3.5) * 0.1)))));
    var notes = [];
    notes.push('内部同岗位 ' + (st ? st.count + ' 人，中位 ' + fmtN(med) + ' 元' : '无在职人员，取薪酬带中位 ' + fmtN(med) + ' 元'));
    notes.push('薪酬带 ' + fmtN(bd[0]) + '–' + fmtN(bd[1]) + ' 元 · 候选人期望 ' + fmtN(c.expected) + ' 元' + (c.expected > bd[1] ? '，高于上限 ' + fmtN(c.expected - bd[1]) + ' 元' : ''));
    notes.push('按综合评分 ' + avg + ' 分在中位基础上' + (avg >= 3.5 ? '上浮' : '下调') + ' ' + Math.abs(r0((avg - 3.5) * 10)) + '%，取薪酬带内并不低于期望');
    var lowest = Object.keys(s).sort(function (a, b) { return s[a] - s[b]; })[0];
    return { avg: avg, verdict: verdict, verdictName: { hire: '建议录用', backup: '备选', no: '不建议录用' }[verdict], suggested: suggested, band: bd, median: med, notes: notes, radar: lib.jobs.abilities.map(function (a) { return { key: a.key, label: a.label, value: s[a.key] || 0, weight: Wt[a.key] }; }), lowest: lib.jobs.abilities.filter(function (a) { return a.key === lowest; })[0].label, lowestScore: s[lowest] };
  }

  /* ---------------- 用工合规 ---------------- */
  function allowedProbation(years, lib) { var P = lib.complianceRules.probationMax; return years < 1 ? P.lt1y : years < 3 ? P.lt3y : P.ge3y; }
  function compliance(d, lib) {
    var CR = lib.complianceRules, RG = region(d, lib), today = d.today, emps = d.employees, hc = emps.length;
    var title = function (e) { return jobOf(lib, e.job).title; };
    var mk = function (e, detail, amount) { return { id: e.id, job: title(e), dept: deptName(d, e.dept), detail: detail, amount: r0(amount || 0) }; };
    var checks = {
      H01: function () { return emps.filter(function (e) { return !e.contract.signed && days(e.hireDate, today) > 30; }).map(function (e) { var m = Math.min(11, Math.max(1, monthsBetween(e.hireDate, today))); return mk(e, '入职 ' + short(e.hireDate) + '，' + days(e.hireDate, today) + ' 天未签', e.wage * m); }); },
      H02: function () { return emps.filter(function (e) { return e.status === 'active' && !e.dispatch && days(today, e.contract.end) >= 0 && days(today, e.contract.end) <= 60; }).map(function (e) { return mk(e, '合同 ' + short(e.contract.end) + ' 到期，' + days(today, e.contract.end) + ' 天', e.wage); }); },
      H03: function () { return emps.filter(function (e) { return e.contract.probationMonths > allowedProbation(e.contract.years, lib); }).map(function (e) { var al = allowedProbation(e.contract.years, lib); return mk(e, e.contract.years + ' 年合同约定试用期 ' + e.contract.probationMonths + ' 个月，上限 ' + al + ' 个月', (e.contract.probationMonths - al) * e.wage); }); },
      H04: function () { return emps.filter(function (e) { return e.contract.noncompete && !e.contract.noncompeteComp; }).map(function (e) { return mk(e, '有竞业限制条款，未约定补偿', e.wage * 0.3 * 12); }); },
      H05: function () { return emps.filter(function (e) { return e.socialBase < e.wage; }).map(function (e) { return mk(e, '基数 ' + fmtN(e.socialBase) + '，工资 ' + fmtN(e.wage), (e.wage - e.socialBase) * RG.socialEmployer * 12); }); },
      H06: function () { return emps.filter(function (e) { return e.overtimeH > CR.overtimeMonthlyMax; }).map(function (e) { return mk(e, d.overtimeMonth.slice(5) + ' 月加班 ' + e.overtimeH + ' 小时', (e.overtimeH - CR.overtimeMonthlyMax) * e.wage / 174 * 1.5); }); },
      H07: function () { return emps.filter(function (e) { return e.annualDue > 0 && (e.annualDue - e.annualUsed) > e.annualDue * 0.6; }).map(function (e) { return mk(e, '应休 ' + e.annualDue + ' 天，已休 ' + e.annualUsed + ' 天', (e.annualDue - e.annualUsed) * e.wage / 21.75 * 2); }); },
      H08: function () { var dl = emps.filter(function (e) { return e.dispatch; }); var over = dl.length - Math.floor(hc * CR.dispatchMaxRatio); if (over <= 0) return []; return dl.slice(0, over).map(function (e) { return mk(e, '派遣 ' + dl.length + ' 人占 ' + (r0(1000 * dl.length / hc) / 10) + '%，超出 ' + over + ' 人', e.wage * 0.06 * 12); }); },
      H09: function () { var need = hc * CR.disabledRatio, have = emps.filter(function (e) { return e.disabled; }).length; if (have >= need) return []; var gap = Math.round((need - have) * 100) / 100; return [{ id: '—', job: '全公司', dept: '—', detail: '在职 ' + hc + ' 人应安排 ' + (Math.round(need * 100) / 100) + ' 人，已安排 ' + have + ' 人，差额 ' + gap + ' 人', amount: r0(gap * RG.avgAnnualWagePrev) }]; },
      H10: function () { return emps.filter(function (e) { return e.status === 'maternity' && e.leaveEnd && days(e.contract.end, e.leaveEnd) > 0; }).map(function (e) { return mk(e, '合同 ' + short(e.contract.end) + ' 到期，哺乳期至 ' + short(e.leaveEnd), 2 * Math.max(1, Math.ceil(days(e.hireDate, today) / 365)) * e.wage); }); },
      H11: function () { return emps.filter(function (e) { return !e.injuryInsured && days(e.hireDate, today) > 30; }).map(function (e) { return mk(e, '入职 ' + days(e.hireDate, today) + ' 天未参保', 60000); }); },
      H12: function () { if (d.profile.hotAllowancePaid) return []; return emps.filter(function (e) { return (d.profile.hotJobsDepts || []).indexOf(e.dept) >= 0; }).map(function (e) { return mk(e, '六至九月未发放', RG.hotAllowance * CR.hotMonths); }); }
    };
    var items = CR.rules.map(function (r) {
      var res = d.resolved[r.id], affected = checks[r.id] ? checks[r.id]() : [];
      if (res && res.status !== 'planned') affected = [];
      var impact = sum(affected.map(function (a) { return a.amount; }));
      return { id: r.id, name: r.name, cat: r.cat, severity: r.severity, law: r.law, desc: r.desc, impactNote: r.impactNote, mode: r.mode, action: r.action, affected: affected, count: affected.length, impact: impact, status: res ? (res.status || 'handled') : affected.length ? 'open' : 'clear', resolvedAt: res ? res.date : null };
    });
    var order = { high: 0, mid: 1, low: 2 };
    items.sort(function (a, b) { return (a.status === 'open' ? 0 : 1) - (b.status === 'open' ? 0 : 1) || order[a.severity] - order[b.severity] || b.impact - a.impact; });
    var open = items.filter(function (i) { return i.status === 'open'; });
    var socialBase = sum(emps.map(function (e) { return e.socialBase; })), gross = sum(emps.map(function (e) { return e.wage; }));
    return { items: items, open: open, counts: { open: open.length, high: open.filter(function (i) { return i.severity === 'high'; }).length, mid: open.filter(function (i) { return i.severity === 'mid'; }).length, low: open.filter(function (i) { return i.severity === 'low'; }).length, handled: items.filter(function (i) { return i.status !== 'open' && i.status !== 'clear'; }).length, clear: items.filter(function (i) { return i.status === 'clear'; }).length }, impact: sum(open.map(function (i) { return i.impact; })), socialBaseRatio: r0(100 * socialBase / gross), overtimeOver: emps.filter(function (e) { return e.overtimeH > CR.overtimeMonthlyMax; }).length, contractsDue60: emps.filter(function (e) { return !e.dispatch && days(today, e.contract.end) >= 0 && days(today, e.contract.end) <= 60; }).length, dispatchRatio: r0(1000 * emps.filter(function (e) { return e.dispatch; }).length / hc) / 10 };
  }
  function resolve(raw, ruleId, lib) {
    var d = ensure(raw); var r = lib.complianceRules.rules.filter(function (x) { return x.id === ruleId; })[0]; if (!r || d.resolved[ruleId]) return d;
    var before = compliance(d, lib).items.filter(function (i) { return i.id === ruleId; })[0];
    var ids = {}; before.affected.forEach(function (a) { ids[a.id] = true; });
    var hit = d.employees.filter(function (e) { return ids[e.id]; });
    if (r.mode === 'fix') {
      if (ruleId === 'H01') hit.forEach(function (e) { e.contract.signed = true; e.contract.start = e.hireDate; });
      if (ruleId === 'H03') hit.forEach(function (e) { e.contract.probationMonths = allowedProbation(e.contract.years, lib); });
      if (ruleId === 'H04') hit.forEach(function (e) { e.contract.noncompeteComp = true; });
      if (ruleId === 'H05') hit.forEach(function (e) { e.socialBase = e.wage; });
      if (ruleId === 'H08') hit.forEach(function (e) { e.dispatch = false; e.contract.type = 'fixed'; });
      if (ruleId === 'H10') hit.forEach(function (e) { e.contract.end = e.leaveEnd; });
      if (ruleId === 'H11') hit.forEach(function (e) { e.injuryInsured = true; });
      if (ruleId === 'H12') d.profile.hotAllowancePaid = true;
    }
    d.resolved[ruleId] = { date: d.today, status: r.mode === 'fix' ? 'handled' : 'planned', action: r.action.label, count: before.count, impact: before.impact };
    d.log.push({ seq: d.log.length + 1, kind: 'compliance', label: r.action.label, detail: r.id + ' ' + r.name + ' · ' + before.count + ' 人 · 影响 ' + fmtW(before.impact) + (r.mode === 'fix' ? ' · 已写回花名册' : ' · 已进台账') });
    return d;
  }

  /* ---------------- 日历 ---------------- */
  function calendar(d, lib) {
    var items = [], today = d.today;
    d.employees.forEach(function (e) {
      var ce = days(today, e.contract.end); if (!e.dispatch && ce >= -7 && ce <= 90) items.push({ date: e.contract.end, kind: 'contract', kindName: '合同到期', title: e.id + ' ' + jobOf(lib, e.job).title, sub: deptName(d, e.dept) + (e.status === 'maternity' ? ' · 三期内，应顺延' : ''), tone: ce < 0 ? 'late' : ce <= 30 ? 'risk' : 'ok', ref: e.id });
      var pe = addMonths(e.contract.start, e.contract.probationMonths); var pd = days(today, pe); if (pd >= 0 && pd <= 90 && days(e.hireDate, today) < 200) items.push({ date: pe, kind: 'probation', kindName: '试用期届满', title: e.id + ' ' + jobOf(lib, e.job).title, sub: deptName(d, e.dept) + ' · 转正评估', tone: pd <= 14 ? 'risk' : 'ok', ref: e.id });
      if (e.status === 'maternity' && e.leaveEnd && days(today, e.leaveEnd) <= 90 && days(today, e.leaveEnd) >= 0) items.push({ date: e.leaveEnd, kind: 'leave', kindName: '哺乳期结束', title: e.id + ' ' + jobOf(lib, e.job).title, sub: deptName(d, e.dept), tone: 'ok', ref: e.id });
    });
    d.needs.forEach(function (n) { var dd = days(today, n.dueDate); if (dd >= -7 && dd <= 90) items.push({ date: n.dueDate, kind: 'need', kindName: '到岗期限', title: n.id + ' ' + jobOf(lib, n.job).title + ' ' + n.count + ' 人', sub: deptName(d, n.dept), tone: dd <= 14 ? 'risk' : 'accent', ref: n.id }); });
    d.candidates.forEach(function (c) { if (c.stage === 'interview' && c.interviewDate) { var dd = days(today, c.interviewDate); if (dd >= -7 && dd <= 90) items.push({ date: c.interviewDate, kind: 'interview', kindName: '面试', title: c.id + ' ' + jobOf(lib, d.needs.filter(function (n) { return n.id === c.needId; })[0].job).title, sub: '面试安排', tone: dd < 0 ? 'late' : 'handled', ref: c.id }); } });
    items.forEach(function (it) { it.daysLeft = days(today, it.date); it.label = short(it.date); });
    items.sort(function (a, b) { return ms(a.date) - ms(b.date); });
    var weeks = []; for (var w = 0; w < 13; w++) { var s0 = dateOf(d.weekStart, w * 7); weeks.push({ w: w, start: s0, end: dateOf(d.weekStart, w * 7 + 6), label: short(s0), items: [] }); }
    items.forEach(function (it) { var w = Math.floor(days(d.weekStart, it.date) / 7); if (w >= 0 && w < 13) weeks[w].items.push(it); });
    return { items: items, weeks: weeks, overdue: items.filter(function (i) { return i.daysLeft < 0; }), due30: items.filter(function (i) { return i.daysLeft >= 0 && i.daysLeft <= 30; }), counts: { total: items.length, contract: items.filter(function (i) { return i.kind === 'contract'; }).length, probation: items.filter(function (i) { return i.kind === 'probation'; }).length, need: items.filter(function (i) { return i.kind === 'need'; }).length, interview: items.filter(function (i) { return i.kind === 'interview'; }).length } };
  }

  /* ---------------- 成本与编制 ---------------- */
  function cost(d, lib, O) {
    var RG = region(d, lib), CP = lib.costParams, emps = d.employees, hc = emps.length;
    var wages = sum(emps.map(function (e) { return e.wage; })), base = sum(emps.map(function (e) { return e.socialBase; }));
    var social = r0(base * RG.socialEmployer), fund = r0(base * RG.fundEmployer), welfare = hc * CP.welfarePerCapita;
    var monthly = wages + social + fund + welfare;
    var hires = emps.filter(function (e) { return days(e.hireDate, d.today) <= 365; });
    var recruiting = sum(hires.map(function (e) { return CP.recruitingCost[e.family] || 0; })), training = sum(hires.map(function (e) { return CP.trainingCost[e.family] || 0; }));
    var turnoverCost = r0(d.leavers.length * (wages / hc) * CP.turnoverCostMonths);
    var annual = monthly * 12 + recruiting + training + turnoverCost;
    var share = r0(1000 * annual / d.profile.revenue12) / 10, bench = CP.benchmarks.laborShare[d.sector] || [20, 40];
    return { monthly: monthly, wages: wages, social: social, fund: fund, welfare: welfare, socialBase: base, annual: annual, recruiting: recruiting, training: training, turnoverCost: turnoverCost, share: share, bench: bench, perCapitaCost: r0(annual / hc), perCapitaRevenue: r0(d.profile.revenue12 / hc), structure: [{ label: '工资', value: wages * 12 }, { label: '社保（单位）', value: social * 12 }, { label: '公积金（单位）', value: fund * 12 }, { label: '福利', value: welfare * 12 }, { label: '招聘与培训', value: recruiting + training }, { label: '流失成本', value: turnoverCost }], hires12: hires.length, rates: { social: RG.socialEmployer, fund: RG.fundEmployer } };
  }
  function simulate(d, lib, C, comp) {
    var RG = region(d, lib), CP = lib.costParams, hc = d.employees.length, avgWage = C.wages / hc;
    var loaded = 1 + RG.socialEmployer + RG.fundEmployer;
    var m0 = addMonths(d.today.slice(0, 7) + '-01', 1);
    var labels = []; for (var i = 0; i < 12; i++) labels.push((+addMonths(m0, i).slice(5, 7)) + '月');
    var socialDelta = r0(sum(d.employees.map(function (e) { return Math.max(0, e.wage - e.socialBase); })) * RG.socialEmployer);
    var needCost = d.needs.map(function (n) { var bd = band(d, n.job, lib), J = jobOf(lib, n.job); var mid = (bd[0] + bd[1]) / 2; return { need: n, monthly: r0(n.count * (mid * loaded + CP.welfarePerCapita)), oneOff: n.count * ((CP.recruitingCost[J.family] || 0) + (CP.trainingCost[J.family] || 0)), startIdx: Math.max(0, monthsBetween(m0, n.dueDate)), count: n.count, title: J.title }; });
    var otPremium = r0(sum(d.employees.filter(function (e) { return e.overtimeH > lib.complianceRules.overtimeMonthlyMax; }).map(function (e) { return (e.overtimeH - lib.complianceRules.overtimeMonthlyMax) * e.wage / 174 * 1.5; })));
    function series(fn) { var out = []; for (var i = 0; i < 12; i++) out.push(fn(i)); return out; }
    var base = series(function () { return { cost: C.monthly, headcount: hc }; });
    var A = series(function (i) { var add = 0, one = 0, h = hc; needCost.forEach(function (x) { if (i >= x.startIdx) { add += x.monthly; h += x.count; } if (i === x.startIdx) one += x.oneOff; }); return { cost: C.monthly + add + one, headcount: h }; });
    var B = A.map(function (m) { return { cost: m.cost + socialDelta, headcount: m.headcount }; });
    var leaveRate = CP.naturalTurnoverMonthly, transfer = 2;
    var Cc = series(function (i) { var left = Math.min(Math.round(hc * leaveRate * Math.min(i + 1, 6)), 15); var h = hc - left; var one = i === 0 ? transfer * (CP.trainingCost.tech || 3000) : 0; return { cost: r0(C.monthly - left * (avgWage * loaded + CP.welfarePerCapita) + otPremium + one), headcount: h }; });
    var mkPlan = function (key, ser, extra) { var P = CP.plans.filter(function (p) { return p.key === key; })[0]; var total = sum(ser.map(function (m) { return m.cost; })), baseTotal = sum(base.map(function (m) { return m.cost; })); var endHc = ser[11].headcount; var annual = total + C.recruiting + C.training + C.turnoverCost; return Object.assign({ key: key, name: P.name, desc: P.desc, months: ser, total12: total, delta: total - baseTotal, endHeadcount: endHc, hires: extra.hires, share: r0(1000 * annual / d.profile.revenue12) / 10, perCapitaRevenue: r0(d.profile.revenue12 / endHc), perCapitaCost: r0(annual / endHc), recommended: key === 'B', adopted: d.plan === key }, extra); };
    var totalNeeds = sum(d.needs.map(function (n) { return n.count; }));
    var h05 = comp.items.filter(function (x) { return x.id === 'H05'; })[0];
    var plans = [
      mkPlan('A', A, { hires: totalNeeds, vacancyAfter: sum(d.departments.map(function (x) { return x.budget; })) - hc - totalNeeds, overtime: '到岗后 CNC 等超限岗位回落到 36 小时内', compliance: 'H05 社保基数问题仍在，年敞口 ' + fmtW(socialDelta * 12), notes: ['按薪酬带中位定薪，' + needCost.map(function (x) { return x.title + ' ' + x.count + ' 人 ' + labels[x.startIdx] + '到岗'; }).join('；'), '一次性招聘与培训 ' + fmtW(sum(needCost.map(function (x) { return x.oneOff; })))], risk: 'mid' }),
      mkPlan('B', B, { hires: totalNeeds, vacancyAfter: sum(d.departments.map(function (x) { return x.budget; })) - hc - totalNeeds, overtime: '到岗后超限岗位回落到 36 小时内', compliance: '社保基数按实际工资申报，H05 与 AI CFO 的 K10 一并关闭', notes: ['在 A 的基础上每月社保多 ' + fmtW(socialDelta) + '，12 个月 ' + fmtW(socialDelta * 12), h05 && h05.status === 'open' ? '关闭 ' + fmtW(h05.impact) + ' 的补缴与滞纳金敞口' : '基数已调整，本方案与 A 成本相同'], risk: 'low' }),
      mkPlan('C', Cc, { hires: 0, vacancyAfter: sum(d.departments.map(function (x) { return x.budget; })) - Cc[11].headcount, overtime: '超限持续，每月加班费敞口约 ' + fmtW(otPremium), compliance: 'H05、H06 都不处理，敞口不变', notes: ['六个月内自然流失不补员，预计减少 ' + (hc - Cc[11].headcount) + ' 人', '装配线转岗 ' + transfer + ' 人培训后补 CNC，到岗慢一个季度'], risk: 'high' })
    ];
    return { labels: labels, base: base, plans: plans, socialDelta: socialDelta, otPremium: otPremium, adopted: d.plan };
  }
  function adoptPlan(raw, key, lib) { var d = ensure(raw); d.plan = key; var P = lib.costParams.plans.filter(function (p) { return p.key === key; })[0]; d.log.push({ seq: d.log.length + 1, kind: 'plan', label: '采纳编制方案', detail: key + ' ' + (P ? P.name : '') }); return d; }

  /* ---------------- KPI 与月报 ---------------- */
  function kpi(d, O, cands, comp, cal, C, sim) {
    var open = cands.filter(function (c) { return ['rejected', 'hired'].indexOf(c.stage) < 0; });
    return { headcount: O.headcount, budget: O.budget, vacancy: O.vacancy, needs: d.needs.length, needCount: sum(d.needs.map(function (n) { return n.count; })), published: d.needs.filter(function (n) { return n.status === 'published'; }).length, candidates: open.length, gradeA: open.filter(function (c) { return c.grade === 'A'; }).length, interviewing: cands.filter(function (c) { return c.stage === 'interview'; }).length, offers: cands.filter(function (c) { return c.stage === 'offer'; }).length, turnover: O.turnover, turnoverBench: O.turnoverBench, perCapitaRevenue: O.perCapitaRevenue, laborShare: C.share, laborBench: C.bench, monthlyCost: C.monthly, annualCost: C.annual, complianceOpen: comp.counts.open, complianceHigh: comp.counts.high, complianceImpact: comp.impact, socialBaseRatio: comp.socialBaseRatio, overtimeOver: comp.overtimeOver, contractsDue60: comp.contractsDue60, due30: cal.due30.length, plan: d.plan };
  }
  function report(d, O, cands, comp, cal, C, sim, k, lib) {
    var lines = ['【人力月报】' + d.today.slice(0, 7).replace('-', ' 年 ') + ' 月 · ' + d.company];
    lines.push('在编 ' + k.headcount + ' 人 / 编制 ' + k.budget + '，缺编 ' + k.vacancy + ' · 近 12 个月离职率 ' + k.turnover + '%（行业参考 ' + k.turnoverBench + '%）· 人均产值 ' + fmtW(k.perCapitaRevenue) + ' · 用工成本占收入 ' + k.laborShare + '%（参考 ' + k.laborBench[0] + '–' + k.laborBench[1] + '%）');
    lines.push('招聘：需求单 ' + k.needs + ' 张 ' + k.needCount + ' 人 · 已发布 ' + k.published + ' · 候选人 ' + k.candidates + '（A 级 ' + k.gradeA + '）· 面试中 ' + k.interviewing + ' · 已发 offer ' + k.offers + '；' + d.needs.map(function (n) { var cs = cands.filter(function (c) { return c.needId === n.id && ['rejected'].indexOf(c.stage) < 0; }); return jobOf(lib, n.job).title + ' ' + n.count + ' 人 ' + short(n.dueDate) + ' 前，候选 ' + cs.length + ' 人'; }).join('；'));
    var open = comp.open;
    lines.push('合规：待处理 ' + k.complianceOpen + ' 项（高 ' + comp.counts.high + '）· 影响预计 ' + fmtW(k.complianceImpact) + ' · 已处置 ' + comp.counts.handled + ' 项' + (open.length ? '；' + open.slice(0, 4).map(function (i) { return i.id + ' ' + i.name + '（' + i.count + ' 人，' + fmtW(i.impact) + '）'; }).join('；') : ''));
    lines.push('社保基数占工资 ' + k.socialBaseRatio + '% · 上月加班超 36 小时 ' + k.overtimeOver + ' 人 · 60 天内到期合同 ' + k.contractsDue60 + ' 份 · 派遣占比 ' + comp.dispatchRatio + '%');
    lines.push('成本：月用工成本 ' + fmtW(C.monthly) + '（工资 ' + fmtW(C.wages) + ' · 社保 ' + fmtW(C.social) + ' · 公积金 ' + fmtW(C.fund) + ' · 福利 ' + fmtW(C.welfare) + '）· 年化 ' + fmtW(C.annual) + ' · 人均成本 ' + fmtW(C.perCapitaCost));
    var P = sim.plans.filter(function (p) { return p.key === (d.plan || 'B'); })[0];
    lines.push('编制方案：' + (d.plan ? '已采纳 ' : '建议 ') + P.key + ' ' + P.name + '，12 个月用工成本 ' + fmtW(P.total12) + '（较现状 ' + (P.delta >= 0 ? '+' : '−') + fmtW(Math.abs(P.delta)) + '）· 期末 ' + P.endHeadcount + ' 人 · ' + P.compliance);
    lines.push('90 天日历 ' + cal.counts.total + ' 项：30 天内 ' + cal.due30.length + ' 项' + (cal.overdue.length ? ' · 逾期 ' + cal.overdue.length + ' 项' : '') + '；最近：' + cal.items.slice(0, 4).map(function (i) { return short(i.date) + ' ' + i.kindName + ' ' + i.title; }).join('；'));
    if (d.log.length) lines.push('本期处置：' + d.log.map(function (l) { return l.label; }).join('；'));
    var todo = [];
    comp.open.filter(function (i) { return i.severity === 'high'; }).slice(0, 2).forEach(function (i) { todo.push(i.action.label + '（' + i.id + '，' + i.count + ' 人）'); });
    d.needs.filter(function (n) { return n.status !== 'published'; }).slice(0, 2).forEach(function (n) { todo.push('发布 ' + jobOf(lib, n.job).title + ' JD'); });
    cands.filter(function (c) { return c.stage === 'done' && c.interview && c.interview.verdict === 'hire'; }).slice(0, 2).forEach(function (c) { todo.push(c.id + ' 建议录用，待发 offer'); });
    if (todo.length) lines.push('待办：' + todo.join('；'));
    return { lines: lines, text: lines.join('\n'), todo: todo };
  }
  function run(raw, lib) {
    var d = ensure(raw);
    var O = org(d, lib), cands = candidates(d, lib), comp = compliance(d, lib), cal = calendar(d, lib), C = cost(d, lib, O), sim = simulate(d, lib, C, comp);
    var needs = d.needs.map(function (n) { var J = jobOf(lib, n.job); var cs = cands.filter(function (c) { return c.needId === n.id; }); var st = {}; STAGES.forEach(function (s) { st[s[0]] = cs.filter(function (c) { return c.stage === s[0]; }).length; }); return Object.assign({}, n, { title: J.title, family: J.family, deptName: deptName(d, n.dept), band: band(d, n.job, lib), dueDays: days(d.today, n.dueDate), candidates: cs.length, active: cs.filter(function (c) { return c.stage !== 'rejected'; }).length, gradeA: cs.filter(function (c) { return c.grade === 'A' && c.stage !== 'rejected'; }).length, stages: st, jd: jd(d, n.id, lib, n.publishedVariant || 'site') }); });
    var k = kpi(d, O, cands, comp, cal, C, sim);
    var byId = {}; cands.forEach(function (c) { byId[c.id] = c; });
    return { version: VERSION, data: d, org: O, needs: needs, candidates: cands, byId: byId, compliance: comp, calendar: cal, cost: C, sim: sim, kpi: k, report: report(d, O, cands, comp, cal, C, sim, k, lib) };
  }

  /* ---------------- 对话与文档摄入 ----------------
     screens / brief / suggest / ask / ingest 五个导出：纯函数，只认入参，不碰 DOM、window、时钟与随机数。
     result 是 run(data, lib) 的结果，可选：传了就用，没传自己算一次。答不上返回 null，不编数。
     回答里的 blocks 是平台中立的纯数据（kv / table / tags / text），act 是声明式动作（goto / focus / open / apply / set）。 */
  var SCREENS = [['connect', '接入'], ['board', '人力驾驶舱'], ['recruit', '招聘 · JD 与简历'], ['interview', '面试与录用'], ['compliance', '用工合规'], ['cost', '成本与编制']];
  var GRADE_NAME = { A: 'A 级', B: 'B 级', C: 'C 级', D: '不满足' };
  var STATUS_NAME = { open: '待处理', handled: '已整改', planned: '已进台账', clear: '无问题' };
  var REPORT_TO = ['总经理', '财务负责人', '各部门负责人'];
  var RESUME_HINTS = ['求职', '简历', '工作经历', '教育背景', '期望薪', '项目经验', '自我评价', '应聘'];
  var CONTRACT_MUST = [['合同期限', /合同期限|劳动合同期限|固定期限|无固定期限/], ['工作内容与工作地点', /工作内容|工作地点|工作岗位|岗位职责/],
    ['工作时间与休息休假', /工作时间|休息休假|工时制|综合计算工时/], ['劳动报酬', /劳动报酬|工资标准|月工资|薪酬待遇|计件单价/],
    ['社会保险', /社会保险|五险|社保|工伤保险/], ['劳动保护与职业危害防护', /劳动保护|劳动条件|职业危害|防护用品/]];
  var ROSTER_COLS = [['工号', /工号|员工编号|人员编号/], ['岗位', /岗位|职务|工种/], ['工资', /工资|月薪|应发|薪酬/],
    ['社保基数', /缴费基数|社保基数|基数/], ['工时', /加班|工时|出勤/], ['入职日期', /入职|到岗|合同起/]];

  function screens() { return SCREENS.map(function (s) { return { key: s[0], label: s[1] }; }); }
  function ctxOf(data, lib, result) { return (result && result.kpi && result.data && result.sim) ? result : run(data, lib); }
  function w0(n) { return Math.abs(n) >= 1000000 ? fmtN(Math.round(n / 10000)) + ' 万元' : fmtW(n); }
  function cut(s, n) { s = String(s == null ? '' : s); return s.length > n ? s.slice(0, n) + '…' : s; }
  function has(q, arr) { for (var i = 0; i < arr.length; i++) if (q.indexOf(arr[i]) >= 0) return true; return false; }
  function otMonth(d) { return +d.overtimeMonth.slice(5); }
  function pick(arr) { var s = arr.slice().sort(function (a, b) { return a - b; }); return s.length ? s[Math.floor(s.length / 2)] : 0; }
  function kvB(rows) { return { type: 'kv', rows: rows }; }
  function tableB(head, rows) { return { type: 'table', head: head, rows: rows }; }
  function tagsB(items) { return { type: 'tags', items: items }; }
  function textB(t) { return { type: 'text', text: t }; }
  function firstNeed(R) { return R.needs[0]; }
  function needCands(R, n) { return R.candidates.filter(function (c) { return c.needId === n.id; }); }
  function topCand(R, n) { var l = needCands(R, n); return l.filter(function (c) { return c.stage !== 'rejected'; })[0] || l[0]; }
  function topDept(R) { return R.org.byDept.slice().sort(function (a, b) { return (b.overtimeOver - a.overtimeOver) || (b.vacancy - a.vacancy); })[0]; }
  function topRule(R) { return R.compliance.open.length ? R.compliance.open[0] : R.compliance.items[0]; }
  function scoredCands(R) { return R.candidates.filter(function (c) { return c.scores; }); }
  function interviewList(R) { return R.candidates.filter(function (c) { return ['interview', 'done', 'offer'].indexOf(c.stage) >= 0; }).sort(function (a, b) { return (a.interviewDate || '').localeCompare(b.interviewDate || '') || a.id.localeCompare(b.id); }); }
  function currentPlan(R) { var key = R.data.plan || 'B'; return R.sim.plans.filter(function (p) { return p.key === key; })[0] || R.sim.plans[1]; }
  function planNote(result, p) {
    var h5 = result.compliance.items.filter(function (x) { return x.id === 'H05'; })[0];
    if (!h5 || h5.status === 'open' || result.sim.socialDelta > 0 || p.key === 'B') return p.compliance;
    if (p.key === 'C') return '社保基数已按实际工资申报到位' + (result.compliance.counts.open ? '；其余 ' + result.compliance.counts.open + ' 项待处理敞口不变' : '');
    return '社保基数已按实际工资申报到位，' + h5.id + ' 敞口已关闭';
  }

  /* 开场发现：进这一屏先说一条从数据里算出来的话 */
  function brief(step, data, lib, result) {
    var R = ctxOf(data, lib, result), d = R.data, k = R.kpi, C = R.cost, comp = R.compliance;
    if (step === 'connect') return '社保申报表的基数合计 ' + fmtW(C.socialBase) + ' / 月，工资表 ' + fmtW(C.wages) + ' / 月，差 ' + fmtW(C.wages - C.socialBase) + '，这块按实际工资申报要补。';
    if (step === 'board') { var dp = topDept(R); return dp.name + ' 在编 ' + dp.headcount + ' 人、缺编 ' + dp.vacancy + ' 人，' + dp.overtimeOver + ' 人上月加班超 ' + lib.complianceRules.overtimeMonthlyMax + ' 小时，缺编与加班是同一件事。'; }
    if (step === 'recruit') { var n = firstNeed(R), t = topCand(R, n); return n.title + ' 还有 ' + n.dueDays + ' 天到岗期限，候选 ' + n.active + ' 人里 A 级 ' + n.gradeA + ' 人；' + t.id + ' 匹配 ' + t.total + ' 分，期望 ' + fmtN(t.expected) + ' 元。'; }
    if (step === 'interview') {
      var dn = scoredCands(R);
      if (!dn.length) return '待面试 ' + k.interviewing + ' 人，四项打分录入后出录用建议与定薪。';
      var c0 = dn[0];
      return c0.id + ' 综合 ' + c0.interview.avg + ' 分，' + c0.interview.lowest + ' 只有 ' + c0.interview.lowestScore + ' 分；建议定薪 ' + fmtN(c0.interview.suggested) + ' 元，正好卡在候选人期望上。';
    }
    if (step === 'compliance') { var t2 = topRule(R); return t2.id + ' ' + t2.name + ' 涉及 ' + t2.count + ' 人，影响预计 ' + fmtW(t2.impact) + '，占 ' + comp.counts.open + ' 项待处理影响的 ' + Math.round(100 * t2.impact / (comp.impact || 1)) + '%。'; }
    if (step === 'cost') {
      var cs = '用工成本占收入 ' + C.share + '%，高于同行参考 ' + C.bench[0] + '–' + C.bench[1] + '%';
      if (R.sim.socialDelta > 0) return cs + '；社保基数补到位每月多 ' + fmtW(R.sim.socialDelta) + '，一年 ' + fmtW(R.sim.socialDelta * 12) + '。';
      var h5 = comp.items.filter(function (x) { return x.id === 'H05'; })[0];
      return '社保基数已按实际工资申报到位' + (h5 && h5.status !== 'open' ? '，' + h5.id + ' 敞口已关闭' : '') + '；' + cs + '。';
    }
    return null;
  }

  /* 快捷问句：每屏 2–4 条，条条都能被 ask 答上 */
  function suggest(step, data, lib, result) {
    if (step === 'connect') return ['哪些数据是直连的', '社保基数和工资差多少', '进人力驾驶舱'];
    if (step === 'board') return ['哪个部门缺编多', '离职为什么高', '加班超限多少人', '先处理哪一项'];
    if (step === 'recruit') return ['A 级候选人有几个', '把 A 级筛出来', '谁不满足硬条件', '薪酬带多少'];
    if (step === 'interview') return ['建议定薪多少', '为什么是这个分', '谁还没评分', '发 offer'];
    if (step === 'compliance') return ['H05 影响多少钱', '先处理哪一条', '按实际工资调基数', '30 天内到期几项'];
    if (step === 'cost') return ['方案 B 贵多少', '社保基数补齐要多少', '采纳方案 B', '看逐月明细'];
    return [];
  }

  /* 问答：认得的问法逐条作答，答不上返回 null 交给平台兜底 */
  function ask(question, step, data, lib, result) {
    var R = ctxOf(data, lib, result), d = R.data, k = R.kpi, C = R.cost, comp = R.compliance, S = R.sim;
    var q = String(question == null ? '' : question), m, i;
    /* 点名某条规则 */
    m = q.match(/H\s*0?(\d{1,2})/i);
    if (m) {
      var rid = 'H' + (m[1].length < 2 ? '0' + m[1] : m[1]);
      var it = comp.items.filter(function (x) { return x.id === rid; })[0];
      if (it) return { text: it.id + ' ' + it.name + '：' + STATUS_NAME[it.status] + '，涉及 ' + it.count + ' 人，影响预计 ' + fmtW(it.impact) + '。依据 ' + it.law + '；口径 ' + it.impactNote + '。',
        blocks: it.affected.length ? [tableB(['员工', '情况', '金额'], it.affected.slice(0, 4).map(function (a) { return [a.id, cut(a.detail, 16), a.amount ? fmtN(a.amount) + ' 元' : '—']; }))] : null,
        ref: it.id, act: { type: 'open', panel: 'rule', ref: it.id } };
    }
    /* 点名某个候选人 */
    m = q.match(/C-?\s?(\d{4})-?(\d{3})/i);
    if (m) {
      var cid = 'C-' + m[1] + '-' + m[2], cc = R.byId[cid];
      if (cc) return { text: cc.id + ' ' + cc.jobTitle + '：' + cc.score.reasons.slice(0, 2).join('；') + '。当前 ' + cc.stageName + '，建议' + cc.action + '。',
        blocks: [kvB([['匹配分', cc.total + ' · ' + GRADE_NAME[cc.grade]], ['学历 · 经验', cc.eduName + ' · ' + cc.years + ' 年'], ['期望', fmtN(cc.expected) + ' 元'], ['到岗', cc.availableDays + ' 天']])],
        ref: cc.id, act: { type: 'open', panel: 'candidate', ref: cc.id } };
    }
    /* 换屏 */
    if (has(q, ['进人力驾驶舱', '驾驶舱', '开始分析'])) return { text: '在编 ' + k.headcount + ' / 编制 ' + k.budget + '，合规待处理 ' + k.complianceOpen + ' 项，影响预计 ' + fmtW(k.complianceImpact) + '。', act: { type: 'goto', step: 'board' } };

    if (step === 'connect') {
      if (has(q, ['直连', '数据源', '同步', '导入'])) {
        var dir = d.sources.filter(function (s) { return s.mode === 'direct'; });
        return { text: '共 ' + d.sources.length + ' 个来源，系统直连 ' + dir.length + ' 个，其余表格导入。', blocks: [tableB(['来源', '方式', '条数'], d.sources.map(function (s) { return [cut(s.name, 10), s.mode === 'direct' ? '直连' : '导入', fmtN(s.rows)]; }))] };
      }
      if (has(q, ['社保', '基数', '差多少'])) return { text: '社保申报基数合计 ' + fmtW(C.socialBase) + ' / 月，工资表 ' + fmtW(C.wages) + ' / 月，差 ' + fmtW(C.wages - C.socialBase) + '，基数只有工资的 ' + comp.socialBaseRatio + '%。', blocks: [kvB([['基数合计', fmtW(C.socialBase) + ' / 月'], ['工资合计', fmtW(C.wages) + ' / 月'], ['差额', fmtW(C.wages - C.socialBase) + ' / 月']])] };
      if (has(q, ['能力', '开通', '能做'])) return { text: '已开通 4 项：' + SCREENS.slice(2).map(function (s) { return s[1]; }).join('、') + '。' };
      if (has(q, ['多少人', '在编', '编制'])) return { text: '在编 ' + k.headcount + ' 人 / 编制 ' + k.budget + '，缺编 ' + k.vacancy + '；' + d.departments.length + ' 个部门。' };
    }
    if (step === 'board') {
      if (has(q, ['缺编', '哪个部门', '部门'])) {
        var vac = R.org.byDept.filter(function (x) { return x.vacancy > 0; }).sort(function (a, b) { return b.vacancy - a.vacancy; });
        if (vac.length) return { text: '缺编 ' + k.vacancy + ' 人，集中在 ' + vac.map(function (x) { return x.name + ' ' + x.vacancy + ' 人'; }).join('、') + '。', blocks: [tableB(['部门', '在编', '缺编'], vac.map(function (x) { return [x.name, x.headcount, x.vacancy]; }))], ref: vac[0].id, act: { type: 'focus', ref: vac[0].id } };
        return { text: '各部门都按编制配齐，无缺编。' };
      }
      if (has(q, ['离职', '流失', '为什么高'])) {
        var rs = R.org.reasons.slice(0, 3);
        return { text: '近 12 个月离职 ' + R.org.leavers12 + ' 人、离职率 ' + k.turnover + '%，行业参考 ' + k.turnoverBench + '%。原因前三：' + rs.map(function (x) { return x.label + ' ' + x.value + ' 人'; }).join('、') + '。' };
      }
      if (has(q, ['加班', '超限', '工时'])) {
        var ot = R.org.byDept.filter(function (x) { return x.overtimeOver > 0; });
        return { text: otMonth(d) + ' 月加班超 ' + lib.complianceRules.overtimeMonthlyMax + ' 小时 ' + comp.overtimeOver + ' 人，全在 ' + ot.map(function (x) { return x.name; }).join('、') + '；加班费敞口预计 ' + fmtW(S.otPremium) + ' / 月。', ref: ot.length ? ot[0].id : null, act: ot.length ? { type: 'focus', ref: ot[0].id } : null };
      }
      if (has(q, ['先处理', '建议', '哪一项', '怎么办'])) {
        var t3 = topRule(R);
        return { text: '先处理 ' + t3.id + ' ' + t3.name + '：' + t3.count + ' 人，影响预计 ' + fmtW(t3.impact) + '。整改动作是' + t3.action.label + '。', act: { type: 'open', panel: 'rule', ref: t3.id } };
      }
      if (has(q, ['在招', '招聘', '需求单'])) return { text: '在招 ' + k.needCount + ' 人 / ' + k.needs + ' 张需求单，候选 ' + k.candidates + ' 人、A 级 ' + k.gradeA + '。', blocks: [tableB(['岗位', '人数', '到岗'], R.needs.map(function (n) { return [n.title, n.count, short(n.dueDate)]; }))], act: { type: 'goto', step: 'recruit' } };
      if (has(q, ['成本', '占收入', '人均'])) return { text: '用工成本占收入 ' + C.share + '%（参考 ' + C.bench[0] + '–' + C.bench[1] + '%），年化 ' + w0(C.annual) + '，人均产值 ' + fmtW(C.perCapitaRevenue) + '。', act: { type: 'goto', step: 'cost' } };
    }
    if (step === 'recruit') {
      var n2 = firstNeed(R), all2 = needCands(R, n2);
      if (has(q, ['A 级', 'A级', '筛出', '好的候选'])) {
        var as = all2.filter(function (c) { return c.grade === 'A' && c.stage !== 'rejected'; });
        return { text: n2.title + ' A 级 ' + as.length + ' 人：' + as.slice(0, 4).map(function (c) { return c.id + ' ' + c.total + ' 分'; }).join('、') + '。已按 A 级筛这一屏。',
          blocks: [tableB(['候选人', '匹配分', '期望'], as.slice(0, 5).map(function (c) { return [c.id, c.total, fmtN(c.expected)]; }))],
          act: { type: 'set', path: 'filter', value: 'A' } };
      }
      if (has(q, ['不满足', '淘汰', '硬条件', '不合格'])) {
        var ds = all2.filter(function (c) { return c.grade === 'D'; });
        if (!ds.length) return { text: n2.title + ' 本批没有不满足硬条件的候选人。' };
        return { text: '不满足硬条件 ' + ds.length + ' 人。' + ds[0].id + '：' + ds[0].score.gates.join('；') + '。', blocks: [tableB(['候选人', '卡在哪'], ds.slice(0, 4).map(function (c) { return [c.id, cut(c.score.gates[0], 18)]; }))], act: { type: 'set', path: 'filter', value: 'fail' } };
      }
      if (has(q, ['薪酬带', '多少钱', '工资', '期望'])) return { text: n2.title + ' 薪酬带 ' + fmtN(n2.band[0]) + '–' + fmtN(n2.band[1]) + ' 元 / 月；候选人期望中位 ' + fmtN(pick(all2.map(function (c) { return c.expected; }))) + ' 元。' };
      if (has(q, ['怎么打分', '打分', '匹配分', '怎么算'])) return { text: '匹配分 = 技能 ' + Math.round(lib.jobs.screenWeights.skills * 100) + '% + 经验 ' + Math.round(lib.jobs.screenWeights.years * 100) + '% + 行业 ' + Math.round(lib.jobs.screenWeights.industry * 100) + '% + 稳定性 ' + Math.round(lib.jobs.screenWeights.stability * 100) + '% + 薪酬 ' + Math.round(lib.jobs.screenWeights.salary * 100) + '% + 通勤 ' + Math.round(lib.jobs.screenWeights.commute * 100) + '%；学历、经验、必备技能、证书、到岗日期任一不过直接判不满足。' };
      if (has(q, ['JD', 'jd', '职位描述'])) return { text: n2.title + ' JD ' + n2.jd.words + ' 字，' + (n2.status === 'published' ? '已发布' : '未发布') + '。全文已打开。', act: { type: 'open', panel: 'jd', ref: n2.id } };
      if (has(q, ['下一步', '怎么办', '建议', '为什么'])) { var cf = topCand(R, n2); return { text: cf.id + ' 当前 ' + cf.stageName + '，建议' + cf.action + '：' + cf.score.reasons[0] + '。', ref: cf.id, act: { type: 'focus', ref: cf.id } }; }
    }
    if (step === 'interview') {
      var dn2 = scoredCands(R), cur = interviewList(R)[0] || null;
      if (has(q, ['定薪', '多少钱', '工资', 'offer 定'])) {
        var cx = (cur && cur.interview) ? cur : dn2[0];
        if (!cx) return { text: '还没有评分记录，四项打分后才有定薪建议。' };
        var r2 = cx.interview;
        return { text: cx.id + ' 建议定薪 ' + fmtN(r2.suggested) + ' 元 / 月：薪酬带 ' + fmtN(r2.band[0]) + '–' + fmtN(r2.band[1]) + '，内部中位 ' + fmtN(r2.median) + '，候选人期望 ' + fmtN(cx.expected) + '，综合 ' + r2.avg + ' 分在中位上' + (r2.avg >= 3.5 ? '浮' : '调') + '。',
          blocks: [kvB([['薪酬带', fmtN(r2.band[0]) + '–' + fmtN(r2.band[1])], ['内部中位', fmtN(r2.median)], ['期望', fmtN(cx.expected)], ['建议定薪', fmtN(r2.suggested)]])], ref: cx.id };
      }
      if (has(q, ['没评', '待评', '谁还'])) {
        var wait = R.candidates.filter(function (c) { return c.stage === 'interview'; });
        if (!wait.length) return { text: '没有待评分的候选人，面试安排里的都已录入评分。' };
        return { text: '待评 ' + wait.length + ' 人：' + wait.map(function (c) { return c.id + ' ' + short(c.interviewDate); }).join('、') + '。', ref: wait[0].id };
      }
      if (has(q, ['为什么', '这个分', '评分', '几分'])) {
        var cy = (cur && cur.interview) ? cur : dn2[0];
        if (!cy) return { text: '这一屏还没有评分结果。' };
        return { text: cy.id + ' 综合 ' + cy.interview.avg + ' 分（' + cy.interview.verdictName + '）：' + cy.interview.radar.map(function (x) { return x.label + ' ' + x.value + ' 分 × ' + Math.round(x.weight * 100) + '%'; }).join('，') + '。',
          blocks: [tableB(['能力', '分', '权重'], cy.interview.radar.map(function (x) { return [x.label, x.value, Math.round(x.weight * 100) + '%']; }))], ref: cy.id };
      }
      if (has(q, ['发 offer', '发offer', '录用', '要不要'])) {
        var cz = R.candidates.filter(function (c) { return c.stage === 'done' && c.interview && c.interview.verdict === 'hire'; })[0];
        if (!cz) return { text: '当前没有处在「面试完成 · 建议录用」的候选人。' };
        return { text: cz.id + ' 综合 ' + cz.interview.avg + ' 分，建议录用，月薪 ' + fmtN(cz.interview.suggested) + ' 元；已按这个数发 offer。', act: { type: 'apply', action: 'offer', input: { id: cz.id, salary: cz.interview.suggested } } };
      }
      if (has(q, ['题', '问什么', '题库'])) {
        if (!cur) return { text: '还没有面试安排，安排后才有题库与评分表。' };
        var kit2 = interviewKit(d, cur, lib);
        return { text: cur.jobTitle + ' 四项能力共 ' + kit2.sets.reduce(function (t, s) { return t + s.questions.length; }, 0) + ' 道题，按 1 / 3 / 5 分锚点打分；面试官 ' + kit2.interviewers.join('、') + '。', act: { type: 'open', panel: 'kit', ref: cur.id } };
      }
    }
    if (step === 'compliance') {
      if (has(q, ['先处理', '哪一条', '最急', '怎么办', '建议'])) {
        var t4 = topRule(R);
        return { text: '先处理 ' + t4.id + ' ' + t4.name + '：' + t4.count + ' 人，影响预计 ' + fmtW(t4.impact) + '，' + SEV_LABEL[t4.severity] + '风险。动作是' + t4.action.label + '。', ref: t4.id, act: { type: 'open', panel: 'rule', ref: t4.id } };
      }
      if (has(q, ['调基数', '按实际工资', '整改', '执行'])) {
        var h05 = comp.items.filter(function (x) { return x.id === 'H05'; })[0];
        if (!h05 || h05.status !== 'open') return { text: 'H05 已处置，社保基数占工资 ' + comp.socialBaseRatio + '%。' };
        return { text: 'H05 按实际工资调整基数：' + h05.count + ' 人写回花名册，年补缴敞口 ' + fmtW(h05.impact) + ' 关闭，每月社保多 ' + fmtW(S.socialDelta) + '。已执行。', act: { type: 'apply', action: 'resolve', input: { rule: 'H05' } } };
      }
      if (has(q, ['影响', '多少钱', '金额'])) return { text: '待处理 ' + comp.counts.open + ' 项，影响预计合计 ' + fmtW(comp.impact) + '。前三：' + comp.open.slice(0, 3).map(function (x) { return x.id + ' ' + fmtW(x.impact); }).join('、') + '。', blocks: [tableB(['规则', '涉及', '影响预计'], comp.open.slice(0, 5).map(function (x) { return [x.id + ' ' + cut(x.name, 8), x.count + ' 人', fmtW(x.impact)]; }))] };
      if (has(q, ['到期', '日历', '30 天', '30天'])) {
        var cal2 = R.calendar;
        return { text: '30 天内 ' + cal2.due30.length + ' 项：合同到期 ' + cal2.due30.filter(function (x) { return x.kind === 'contract'; }).length + '、试用期届满 ' + cal2.due30.filter(function (x) { return x.kind === 'probation'; }).length + '、面试 ' + cal2.due30.filter(function (x) { return x.kind === 'interview'; }).length + '。接下来：' + cal2.items.slice(0, 3).map(function (x) { return short(x.date) + ' ' + x.kindName; }).join('、') + '。' };
      }
      if (has(q, ['派遣'])) return { text: '派遣 ' + R.org.dispatch + ' 人，占 ' + comp.dispatchRatio + '%，上限 ' + Math.round(lib.complianceRules.dispatchMaxRatio * 100) + '%。' };
    }
    if (step === 'cost') {
      m = q.match(/方案\s*([ABC])|([ABC])\s*方案/i);
      if (has(q, ['采纳', '就按', '定了'])) {
        var ak = m ? (m[1] || m[2]).toUpperCase() : null;
        var ap = (ak && S.plans.filter(function (p) { return p.key === ak; })[0]) || currentPlan(R);
        return { text: '已采纳方案 ' + ap.key + '，12 个月预计 ' + fmtW(ap.total12) + '，月报按这个口径出。', act: { type: 'apply', action: 'adoptPlan', input: { key: ap.key } } };
      }
      if (m) {
        var pk = (m[1] || m[2]).toUpperCase(), pp = S.plans.filter(function (p) { return p.key === pk; })[0];
        if (pp) return { text: '方案 ' + pp.key + ' ' + pp.name + '：12 个月预计 ' + fmtW(pp.total12) + '，较现状 ' + (pp.delta >= 0 ? '+' : '−') + fmtW(Math.abs(pp.delta)) + '；期末在编 ' + pp.endHeadcount + ' 人，缺编 ' + pp.vacancyAfter + '，用工占收入 ' + pp.share + '%。' + planNote(R, pp) + '。',
          blocks: [kvB([['12 个月预计', fmtW(pp.total12)], ['较现状', (pp.delta >= 0 ? '+' : '−') + fmtW(Math.abs(pp.delta))], ['期末在编', pp.endHeadcount + ' 人'], ['用工占收入', pp.share + '%']])],
          act: { type: 'set', path: 'plan', value: pp.key } };
      }
      if (has(q, ['逐月', '明细', '每个月'])) { var cp = currentPlan(R); return { text: '方案 ' + cp.key + ' 逐月明细已打开：12 个月在编与用工成本，以及较现状差额。', act: { type: 'open', panel: 'months', ref: cp.key } }; }
      if (has(q, ['社保', '基数', '补齐'])) {
        var h5c = comp.items.filter(function (x) { return x.id === 'H05'; })[0];
        if (S.socialDelta <= 0) return { text: '社保基数已补齐，当前申报基数等于工资口径，无待补差额' + (h5c && h5c.status !== 'open' ? '；' + h5c.id + ' ' + STATUS_NAME[h5c.status] + '，补缴敞口已关闭' : '') + '。' };
        return { text: '按实际工资申报后每月多 ' + fmtW(S.socialDelta) + '，12 个月 ' + fmtW(S.socialDelta * 12) + '；同时关闭 H05 的补缴敞口 ' + fmtW((h5c || {}).impact || 0) + '。' };
      }
      if (has(q, ['人均', '产值', '成本结构', '结构'])) return { text: '人均成本 ' + fmtW(C.perCapitaCost) + ' / 年，人均产值 ' + fmtW(C.perCapitaRevenue) + '；年化结构：' + C.structure.slice(0, 4).map(function (x) { return x.label + ' ' + fmtW(x.value); }).join('、') + '。', blocks: [tableB(['项', '年化'], C.structure.map(function (x) { return [x.label, fmtW(x.value)]; }))] };
      if (has(q, ['月报', '发', '微信'])) return { text: '人力月报 ' + R.report.lines.length + ' 段，收件人 ' + REPORT_TO[0] + '。全文已打开。', act: { type: 'open', panel: 'report' } };
    }
    return null;
  }

  /* 文档摄入：简历 → 打分入池；劳动合同 → 必备条款核对；花名册 / 工资表 → 字段核对；经营 PPT → 收入口径；邮件 → 人事事项 */
  function ingestResume(doc, text, R, lib) {
    var d = R.data, n = firstNeed(R), J = jobOf(lib, n.job);
    var edu = /硕士|研究生/.test(text) ? 'master' : /本科|学士/.test(text) ? 'bachelor' : /大专|专科/.test(text) ? 'college' : 'secondary';
    var ym = text.match(/(\d{1,2})\s*年[^。；,，]{0,8}(经验|工作|从业)/), years = ym ? +ym[1] : 0;
    var em = text.match(/期望[^0-9]{0,10}([\d,]{4,8})/), expected = em ? +em[1].replace(/,/g, '') : 0;
    var skills = Object.keys(lib.jobs.skills).filter(function (kk) { return text.indexOf(lib.jobs.skills[kk]) >= 0; });
    var certs = Object.keys(lib.jobs.certs || {}).filter(function (kk) { return text.indexOf(lib.jobs.certs[kk]) >= 0; });
    var pool = d.candidates, mid = function (f) { return pick(pool.map(f)); };
    var cand = { id: 'C-' + d.today.slice(2, 4) + d.today.slice(5, 7) + '-' + (900 + pool.length), needId: n.id, stage: 'new', source: 'site', certs: certs, industries: [], scores: null, offer: null,
      edu: edu, years: years, skills: skills, lastTenureMonths: mid(function (c) { return c.lastTenureMonths; }), jobs5y: mid(function (c) { return c.jobs5y; }),
      expected: expected || r0((n.band[0] + n.band[1]) / 2), availableDays: mid(function (c) { return c.availableDays; }), distanceKm: mid(function (c) { return c.distanceKm; }), age: mid(function (c) { return c.age; }) };
    var s = screenOne(d, cand, lib), kind = doc.kind === 'pdf' ? 'PDF' : doc.kind === 'text' ? '文本' : 'Word';
    var lines = [kind + '《' + doc.name + '》按 ' + n.title + ' 的口径打分：' + s.total + ' 分 · ' + GRADE_NAME[s.grade] + '。',
      '读到：' + (lib.jobs.edu[edu] || edu) + ' · ' + years + ' 年经验 · 技能 ' + skills.length + ' 项' + (expected ? ' · 期望 ' + fmtN(expected) + ' 元' : '') + '。',
      s.reasons.slice(0, 2).join('；') + '。'];
    if (!expected || !years) lines.push('简历没写明的项（' + [years ? null : '工作年限', expected ? null : '期望薪资'].filter(Boolean).join('、') + '）按本批候选中位代入。');
    lines.push('已加进 ' + n.title + ' 候选人表。');
    var d2 = ensure(d);
    d2.candidates.push(clone(cand));
    d2.log.push({ seq: d2.log.length + 1, kind: 'recruit', label: '简历入池', detail: cand.id + ' 由《' + doc.name + '》解析 · ' + s.total + ' 分' });
    return { text: lines.join('\n'),
      blocks: [kvB([['学历', lib.jobs.edu[edu] || edu], ['经验', years + ' 年'], ['技能命中', s.mustHit + '/' + (J.must || []).length], ['匹配分', s.total + ' · ' + GRADE_NAME[s.grade]]])].concat(skills.length ? [tagsB(skills.map(function (kk) { return lib.jobs.skills[kk]; }))] : []),
      data: d2, act: { type: 'apply', action: 'ingest', input: { doc: doc } } };
  }
  function ingestContract(doc, text, R, step) {
    var hits = CONTRACT_MUST.map(function (x) { return { name: x[0], ok: x[1].test(text) }; });
    var miss = hits.filter(function (x) { return !x.ok; });
    var clauses = (doc.paragraphs || []).filter(function (p) { return /^第[一二三四五六七八九十百]+条/.test(String(p).trim()); }).map(function (p) { return String(p).trim(); });
    var money = (text.match(/[\d][\d,]{4,}\s*元/g) || []), dates = (text.match(/\d{4}\s*年\s*\d{1,2}\s*月(\s*\d{1,2}\s*日)?/g) || []);
    var penalty = /违约金|万分之|逾期.{0,6}(交付|付款|违约)/.test(text);
    var lines = [(doc.kind === 'pdf' ? 'PDF' : 'Word') + '《' + doc.name + '》读完：条款 ' + clauses.length + ' 条' + ((doc.tables || []).length ? '、表 ' + doc.tables.length + ' 张' : '') + '，' + (doc.stats && doc.stats['字数'] ? doc.stats['字数'] + ' 字' : '')];
    lines.push('按劳动合同必备条款核对：命中 ' + (CONTRACT_MUST.length - miss.length) + '/' + CONTRACT_MUST.length + (miss.length ? '，缺' + miss.map(function (x) { return x.name; }).join('、') : ''));
    if (penalty) lines.push('文本里约定了逾期违约金；劳动合同只有培训服务期与竞业限制两种情形可以约定违约金，这条搬不过来');
    lines.push(miss.length === CONTRACT_MUST.length ? '判定：商务合同文本，走不了用工合规这一套' : '判定：可按劳动合同继续核对，缺项补齐后入库');
    var rows = [];
    if (money.length) rows.push(['金额', money[0]]);
    if (dates.length) rows.push(['日期', dates[0]]);
    rows.push(['段落', (doc.paragraphs || []).length]);
    rows.push(['表格', (doc.tables || []).length + ' 张']);
    var checkB = tableB(['必备条款', '核对'], hits.map(function (x) { return [x.name, x.ok ? '有' : '缺']; }));
    var panel = [kvB(rows), checkB];
    if (clauses.length) panel.push(tableB(['读到的条款 · ' + clauses.length + ' 条'], clauses.map(function (c) { return [c]; })));
    (doc.tables || []).slice(0, 1).forEach(function (t) { if (t.length) panel.push(tableB(t[0], t.slice(1))); });
    return { text: lines.join('。\n') + '。',
      blocks: [checkB].concat(clauses.length ? [tagsB(clauses.slice(0, 4).map(function (c) { return cut(c, 12); }))] : []).concat([kvB(rows)]),
      ref: step === 'compliance' ? 'H01' : null,
      act: { type: 'open', panel: 'doc', ref: doc.name, title: '文档核对 · ' + doc.name, sub: '劳动合同必备条款 ' + (CONTRACT_MUST.length - miss.length) + '/' + CONTRACT_MUST.length + ' · ' + doc.sizeText, blocks: panel } };
  }
  function ingestSheet(doc) {
    var s0 = (doc.sheets || [])[0];
    if (!s0 || !s0.rows.length) return null;
    var head = (s0.rows[0] || []).map(String);
    var hit = ROSTER_COLS.map(function (mp) { return { name: mp[0], ok: head.some(function (x) { return mp[1].test(x); }) }; });
    var got = hit.filter(function (x) { return x.ok; });
    var rows = s0.rows.length - 1;
    var lines = ['Excel《' + doc.name + '》读完：' + doc.sheets.length + ' 张表、' + rows + ' 行数据，表头 ' + head.slice(0, 6).join(' / ')];
    if (got.length >= 3) lines.push('命中花名册字段 ' + got.length + '/' + ROSTER_COLS.length + '：' + got.map(function (x) { return x.name; }).join('、') + '，可以进逐人核对');
    else {
      lines.push('花名册字段命中 ' + got.length + '/' + ROSTER_COLS.length + '，这份表进不了逐人核对；核对要的列是 ' + ROSTER_COLS.map(function (x) { return x[0]; }).join(' / '));
      var pay = s0.rows.slice(1).filter(function (r) { return /职工薪酬|工资|社保|公积金/.test(r.join('')); });
      lines.push(pay.length ? '表里有 ' + pay.length + ' 行职工薪酬类科目，可与用工成本对一对' : '表里也没有职工薪酬类科目');
    }
    var needB = tableB(['需要的列', '本表'], hit.map(function (x) { return [x.name, x.ok ? '有' : '无']; }));
    return { text: lines.join('。\n') + '。', blocks: [needB],
      act: { type: 'open', panel: 'doc', ref: doc.name, title: '表格解析 · ' + doc.name, sub: s0.name + ' · ' + rows + ' 行 × ' + head.length + ' 列 · ' + doc.sizeText, blocks: [tableB(head, s0.rows.slice(1, 9)), needB] } };
  }
  function ingestSlides(doc, R) {
    var text = (doc.text || '').replace(/\s+/g, ' ');
    var m = text.match(/收入[^0-9]{0,6}([\d,.]+)\s*万元/);
    var titles = (doc.slides || []).map(function (s) { return s.title || ''; }).filter(Boolean);
    if (!m) return { text: 'PPT《' + doc.name + '》读完：' + (doc.slides || []).length + ' 页，标题「' + (titles[0] || '—') + '」。没读到收入口径，人力这边的人均产值不动。', blocks: [tagsB(titles.slice(0, 4))] };
    var rev = Math.round(parseFloat(m[1].replace(/,/g, '')) * 10000);
    var d = R.data, hc = d.employees.length, before = R.cost, oldRev = d.profile.revenue12;
    var perNew = r0(rev / hc), shareNew = r0(1000 * before.annual / rev) / 10;
    var d2 = ensure(d);
    d2.profile.revenue12 = rev;
    d2.log.push({ seq: d2.log.length + 1, kind: 'plan', label: '收入口径改按文档', detail: '《' + doc.name + '》' + m[1] + ' 万元 · 人均产值 ' + fmtW(perNew) });
    return { text: 'PPT《' + doc.name + '》读到收入 ' + m[1] + ' 万元（' + (titles[0] || (doc.slides[0] || {}).title || '—') + '）。\n按这个口径重算：人均产值 ' + fmtW(perNew) + '（原 ' + fmtW(before.perCapitaRevenue) + '），用工成本占收入 ' + shareNew + '%（原 ' + before.share + '%）。\n已把收入口径改成文档里的数，六屏一起重算。',
      blocks: [kvB([['文档收入', m[1] + ' 万元'], ['原口径', w0(oldRev)], ['人均产值', fmtW(perNew)], ['占收入', shareNew + '%']]), tagsB(titles.slice(0, 3))],
      data: d2, act: { type: 'apply', action: 'ingest', input: { doc: doc } } };
  }
  function ingestMail(doc) {
    var ml = doc.mail || {}, text = (doc.text || '').replace(/\s+/g, ' ');
    var money = (text.match(/[\d][\d,.]{2,}\s*万元|[\d][\d,]{4,}\s*元/g) || []);
    var hr = /入职|离职|转正|调岗|加班|年假|社保|工资条|试用期/.test(text);
    var lines = ['邮件《' + (ml.subject || doc.name) + '》读完：发件 ' + (ml.from || '—') + '，' + (ml.date || '') + '，正文 ' + (doc.stats && doc.stats['正文行'] ? doc.stats['正文行'] + ' 行' : '') + (money.length ? '，金额 ' + money.join('、') : '')];
    lines.push(hr ? '命中人事事项，已留到本屏待办' : '没有人事事项（入转调离 / 工时 / 假期 / 社保 / 薪酬），这一屏不动');
    return { text: lines.join('。\n') + '。',
      blocks: [kvB([['发件', ml.from || '—'], ['主题', cut(ml.subject || '—', 14)], ['日期', ml.date || '—'], ['附件', (ml.attaches || []).length + ' 个']])],
      act: { type: 'open', panel: 'doc', ref: doc.name, title: ml.subject || doc.name, sub: (ml.from || '—') + ' · ' + (ml.date || '') + ' · ' + doc.sizeText, blocks: [textB(doc.text || '')] } };
  }
  function ingest(doc, step, data, lib, result) {
    if (!doc || !doc.ok) return null;
    var R = ctxOf(data, lib, result), text = (doc.text || '').replace(/\s+/g, ' ');
    if (doc.kind === 'word' || doc.kind === 'pdf' || doc.kind === 'text') {
      var rk = RESUME_HINTS.filter(function (w) { return text.indexOf(w) >= 0; });
      if (rk.length >= 2) return ingestResume(doc, text, R, lib);
      return ingestContract(doc, text, R, step);
    }
    if (doc.kind === 'excel') return ingestSheet(doc);
    if (doc.kind === 'ppt') return ingestSlides(doc, R);
    if (doc.kind === 'eml') return ingestMail(doc);
    return null;
  }

  return {
    VERSION: VERSION, MODULE_NAME: MODULE_NAME, CREDITS: CREDITS, STAGES: STAGES, STAGE_NAME: STAGE_NAME, SEV_LABEL: SEV_LABEL,
    ensure: ensure, run: run, org: org, jd: jd, publish: publish, screenOne: screenOne, candidates: candidates, pass: pass, reject: reject, schedule: schedule, score: score, offer: offer,
    interviewKit: interviewKit, interviewResult: interviewResult, compliance: compliance, resolve: resolve, calendar: calendar, cost: cost, simulate: simulate, adoptPlan: adoptPlan, band: band,
    screens: screens, brief: brief, suggest: suggest, ask: ask, ingest: ingest,
    GRADE_NAME: GRADE_NAME, STATUS_NAME: STATUS_NAME, planNote: planNote,
    fmtN: fmtN, fmtW: fmtW, short: short, days: days, dateOf: dateOf, addMonths: addMonths
  };
});
