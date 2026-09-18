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

  var VERSION = '1.0.0';
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

  return {
    VERSION: VERSION, MODULE_NAME: MODULE_NAME, CREDITS: CREDITS, STAGES: STAGES, STAGE_NAME: STAGE_NAME, SEV_LABEL: SEV_LABEL,
    ensure: ensure, run: run, org: org, jd: jd, publish: publish, screenOne: screenOne, candidates: candidates, pass: pass, reject: reject, schedule: schedule, score: score, offer: offer,
    interviewKit: interviewKit, interviewResult: interviewResult, compliance: compliance, resolve: resolve, calendar: calendar, cost: cost, simulate: simulate, adoptPlan: adoptPlan, band: band,
    fmtN: fmtN, fmtW: fmtW, short: short, days: days, dateOf: dateOf, addMonths: addMonths
  };
});
