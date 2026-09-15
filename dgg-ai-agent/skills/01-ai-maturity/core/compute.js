/*
 * 企业AI成熟度评估 · 能力内核 v2
 * ------------------------------------------------------------
 * 纯函数：无 DOM、无网络、无时间、无随机。Node 与浏览器共用同一份文件。
 *
 *   compute(input, data)               → Result（完整报告数据，可直接渲染 / 打印）
 *   buildPrompt(result, data)          → string（LLM 润色提示词，只润色近期三件事）
 *   mergePolish(result, llmText, lint) → Result
 *
 * input:
 *   { profile: { name?, industry, size, revenue, province, years, ownership, customers, systems[], itStaff, branches?, overseas?, role? },
 *     answers: [0–3 × 36] }
 * data:
 *   { fields, provinces, industries, dimensions, questions, levels, diagnostics, benchmark, actions, scenes, risks, reportText, promptTemplate }
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.DGG = root.DGG || {}; root.DGG.maturity = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VERSION = '2.0.0';
  var MODULE_NAME = '企业AI成熟度评估';
  var CREDITS = 20;
  var SIZE_ORDER = ['1_20', '21_50', '51_100', '101_300', '300_plus'];
  var PHASES = [
    { key: 'p1', name: '第 1–3 个月', title: '打基础', months: [1, 3] },
    { key: 'p2', name: '第 4–6 个月', title: '见成效', months: [4, 6] },
    { key: 'p3', name: '第 7–12 个月', title: '扩规模', months: [7, 12] }
  ];

  // ---------- 工具 ----------
  function pct(s, m) { return m ? Math.round(s / m * 1000) / 10 : 0; }
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
  function erf(x) { // Abramowitz-Stegun 7.1.26
    var s = x < 0 ? -1 : 1; x = Math.abs(x);
    var t = 1 / (1 + 0.3275911 * x);
    var y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return s * y;
  }
  function normCdf(z) { return 0.5 * (1 + erf(z / Math.SQRT2)); }
  function optText(fields, key, v) {
    var f = fields.filter(function (x) { return x.key === key; })[0];
    if (!f || !f.options) return v == null ? '' : String(v);
    var o = f.options.filter(function (x) { return x.v === v; })[0];
    return o ? o.t : (v == null ? '' : String(v));
  }
  function findIndustry(ind, slug) {
    for (var i = 0; i < ind.sectors.length; i++) {
      var s = ind.sectors[i];
      for (var j = 0; j < s.industries.length; j++) if (s.industries[j].slug === slug) return { sector: s, industry: s.industries[j] };
    }
    return null;
  }
  function findBand(benchmark, slug, size) {
    var key = slug + '-' + size;
    if (benchmark[key]) return { cell: benchmark[key], key: key, basis: 'exact' };
    var idx = SIZE_ORDER.indexOf(size);
    for (var d = 1; d < SIZE_ORDER.length; d++) {
      var c = [idx - d, idx + d];
      for (var j = 0; j < c.length; j++) {
        if (c[j] < 0 || c[j] >= SIZE_ORDER.length) continue;
        var k2 = slug + '-' + SIZE_ORDER[c[j]];
        if (benchmark[k2]) return { cell: benchmark[k2], key: k2, basis: 'nearest-size' };
      }
    }
    return { cell: null, key: key, basis: 'none' };
  }
  function levelOf(p, levels) {
    var hit = levels[0];
    levels.forEach(function (l) { if (p >= l.minPct) hit = l; });
    return hit;
  }
  function bandOf(score, bands) {
    if (score <= bands.low[1]) return 'low';
    if (score <= bands.mid[1]) return 'mid';
    return 'high';
  }
  function pick(list, dimKey, levelCode) {
    var exact = list.filter(function (t) { return t.dimension === dimKey && t.level === levelCode; });
    if (exact.length) return exact;
    return list.filter(function (t) { return t.dimension === dimKey; });
  }

  // ---------- 校验 ----------
  function validate(input, data) {
    var errs = [];
    if (!input || typeof input !== 'object') return ['input 缺失'];
    var p = input.profile || {};
    data.fields.forEach(function (f) {
      if (!f.required) return;
      var v = p[f.key];
      if (f.type === 'multi') { if (!Array.isArray(v) || !v.length) errs.push('profile.' + f.key + ' 缺失'); }
      else if (!v) errs.push('profile.' + f.key + ' 缺失');
    });
    if (p.industry && !findIndustry(data.industries, p.industry)) errs.push('profile.industry 无效');
    if (Array.isArray(p.systems) && p.systems.indexOf('none') >= 0 && p.systems.length > 1) errs.push('profile.systems 选「无」时不能再选其他系统');
    var n = data.questions.length, a = input.answers;
    if (!Array.isArray(a) || a.length !== n) errs.push('answers 需为 ' + n + ' 项');
    else a.forEach(function (v, i) { if (!(v === 0 || v === 1 || v === 2 || v === 3)) errs.push('answers[' + i + '] 需为 0–3'); });
    return errs;
  }

  // ---------- 主计算 ----------
  function compute(input, data) {
    var errors = validate(input, data);
    if (errors.length) return { ok: false, errors: errors };
    var p = input.profile, a = input.answers, F = data.fields;
    var name = (p.name && String(p.name).trim()) || '本企业';
    var ind = findIndustry(data.industries, p.industry);
    var systems = Array.isArray(p.systems) ? p.systems.slice() : [];
    var has = function (s) { return systems.indexOf(s) >= 0; };

    // 企业画像
    var profile = {
      name: name,
      industry: p.industry, industryName: ind.industry.name,
      sector: ind.sector.key, sectorName: ind.sector.name,
      size: p.size, sizeName: optText(F, 'size', p.size),
      revenue: p.revenue, revenueName: optText(F, 'revenue', p.revenue),
      province: p.province,
      years: p.years, yearsName: optText(F, 'years', p.years),
      ownership: p.ownership, ownershipName: optText(F, 'ownership', p.ownership),
      customers: p.customers, customersName: optText(F, 'customers', p.customers),
      systems: systems, systemsName: systems.map(function (s) { return optText(F, 'systems', s); }),
      itStaff: p.itStaff, itStaffName: optText(F, 'itStaff', p.itStaff),
      branches: p.branches || null, branchesName: p.branches ? optText(F, 'branches', p.branches) : '',
      overseas: p.overseas || 'no', overseasName: optText(F, 'overseas', p.overseas || 'no'),
      role: p.role || null, roleName: p.role ? optText(F, 'role', p.role) : ''
    };
    profile.tags = [
      profile.sectorName + ' · ' + profile.industryName,
      profile.sizeName, profile.revenueName, profile.ownershipName, profile.customersName,
      has('none') ? '无业务系统' : '已有 ' + profile.systemsName.join(' / '),
      profile.itStaff === 'none' ? '无数字化专职' : '数字化专职 ' + profile.itStaffName
    ].concat(profile.branches && profile.branches !== 'single' ? [profile.branchesName + '分支'] : [])
     .concat(profile.overseas === 'yes' ? ['有海外业务'] : []);
    profile.portrait = name + '是一家位于' + profile.province + '的' + profile.industryName + '企业，' + profile.ownershipName + '，成立 ' + profile.yearsName + '，' +
      profile.sizeName + '，上年营收 ' + profile.revenueName + '，主要面向' + profile.customersName + '。' +
      (has('none') ? '目前没有业务系统，' : '现有系统：' + profile.systemsName.join('、') + '，') +
      (profile.itStaff === 'none' ? '没有数字化专职人员。' : '数字化专职人员 ' + profile.itStaffName + '。');

    // 逐题
    var answers = data.questions.map(function (q, i) {
      return { id: q.id, dimension: q.dimension, sub: q.sub, text: q.text, optionIndex: a[i], optionText: q.options[a[i]], score: a[i], max: 3, explain: q.explain };
    });

    // 子维度 → 维度
    var bm = findBand(data.benchmark, p.industry, p.size);
    var subdims = [], dims = [];
    data.dimensions.forEach(function (d) {
      var subs = d.subdims.map(function (s) {
        var qs = answers.filter(function (x) { return x.sub === s.key; });
        var sc = qs.reduce(function (t, x) { return t + x.score; }, 0), mx = qs.length * 3;
        var band = bandOf(sc, data.diagnostics.bands);
        var sd = { key: s.key, dimension: d.key, dimensionName: d.name, name: s.name, desc: s.desc, score: sc, max: mx, pct: pct(sc, mx), band: band, bandName: { low: '待加强', mid: '基本具备', high: '已建立' }[band], diagnosis: data.diagnostics.items[s.key][band], questions: qs.map(function (x) { return x.id; }) };
        subdims.push(sd); return sd;
      });
      var sc = subs.reduce(function (t, s) { return t + s.score; }, 0), mx = subs.reduce(function (t, s) { return t + s.max; }, 0);
      var dp = pct(sc, mx);
      var band = bm.cell ? bm.cell.bands[d.key] : null;
      var position = !band ? 'unknown' : (dp < band[0] ? 'below' : (dp > band[1] ? 'above' : 'within'));
      var dl = levelOf(dp, data.levels);
      var weakest = subs.slice().sort(function (x, y) { return x.pct - y.pct; })[0];
      var strongest = subs.slice().sort(function (x, y) { return y.pct - x.pct; })[0];
      var posText = { above: '高于同行参考带', within: '处于同行参考带内', below: '低于同行参考带', unknown: '' }[position];
      dims.push({
        key: d.key, name: d.name, color: d.color, desc: d.desc,
        score: sc, max: mx, pct: dp, band: band ? band.slice() : null, bandMid: band ? Math.round((band[0] + band[1]) / 2) : null,
        position: position, positionName: posText, level: { code: dl.code, name: dl.name },
        subdims: subs, weakest: weakest.key, strongest: strongest.key,
        recommendations: pick(data.actions, d.key, dl.code).slice(0, 2).map(function (t) { return { id: t.id, title: t.title, why: t.why, steps: t.steps.slice(), owner: t.owner, deliverable: t.deliverable, weeks: t.weeks, cost: t.cost, kpi: t.kpi, service: t.service, module: t.module }; }),
        summary: d.name + '维度得分 ' + sc + ' / ' + mx + '（' + dp + '%），' + (posText ? posText + '（参考 ' + band[0] + '%–' + band[1] + '%）。' : '') +
          '三个子维度中「' + strongest.name + '」相对最好（' + strongest.score + '/' + strongest.max + '），「' + weakest.name + '」最需要补（' + weakest.score + '/' + weakest.max + '）。' + weakest.diagnosis
      });
    });

    // 总分与等级
    var total = dims.reduce(function (t, d) { return t + d.score; }, 0), max = dims.reduce(function (t, d) { return t + d.max; }, 0);
    var tp = pct(total, max);
    var level = levelOf(tp, data.levels);
    var li = data.levels.indexOf(level);
    var next = li < data.levels.length - 1 ? data.levels[li + 1] : null;
    var gapPct = next ? Math.round((next.minPct - tp) * 10) / 10 : 0;
    var gapPts = next ? Math.max(1, Math.ceil(next.minPct / 100 * max - total)) : 0;

    // 同行分布与百分位（估算）
    var percentile = null, distribution = null;
    if (bm.cell) {
      var z = (tp - bm.cell.mean) / bm.cell.sd;
      percentile = clamp(Math.round(normCdf(z) * 100), 1, 99);
      distribution = { mean: bm.cell.mean, sd: bm.cell.sd };
    }
    var positions = { above: 0, within: 0, below: 0, unknown: 0 };
    dims.forEach(function (d) { positions[d.position]++; });

    // 优势与短板
    var bySub = subdims.slice().sort(function (x, y) { return (y.pct - x.pct) || (x.key < y.key ? -1 : 1); });
    var strengths = bySub.slice(0, 3);
    var weaknesses = bySub.slice().reverse().slice(0, 3);
    var dimRank = dims.slice().sort(function (x, y) {
      var rx = x.band ? x.pct - x.band[0] : x.pct, ry = y.band ? y.pct - y.band[0] : y.pct;
      return (rx - ry) || (x.pct - y.pct);
    });
    var weakDims = dimRank.slice(0, 3), strongDims = dimRank.slice(3);

    // 升级行动：每个维度按「该维度自身等级」取模板；弱三维两条（阶段 1、2），强三维一条（阶段 3）
    function mk(t, dim, phase, order) {
      return { order: order, phase: phase.key, phaseName: phase.name, phaseTitle: phase.title, dimension: dim.key, dimensionName: dim.name, color: dim.color,
        id: t.id, title: t.title, why: t.why, steps: t.steps.slice(), owner: t.owner, deliverable: t.deliverable, weeks: t.weeks, cost: t.cost, kpi: t.kpi, service: t.service, module: t.module, source: 'template' };
    }
    var actions = [], n = 1;
    weakDims.forEach(function (d) { var t = pick(data.actions, d.key, d.level.code); if (t[0]) actions.push(mk(t[0], d, PHASES[0], n++)); });
    weakDims.forEach(function (d) { var t = pick(data.actions, d.key, d.level.code); if (t[1]) actions.push(mk(t[1], d, PHASES[1], n++)); });
    strongDims.forEach(function (d) { var t = pick(data.actions, d.key, d.level.code); if (t[0]) actions.push(mk(t[0], d, PHASES[2], n++)); });
    var roadmap = PHASES.map(function (ph) {
      var list = actions.filter(function (x) { return x.phase === ph.key; });
      return { key: ph.key, name: ph.name, title: ph.title, months: ph.months, actions: list.map(function (x) { return x.order; }),
        milestone: ph.key === 'p1' ? '三个短板维度各完成一项基础动作，指标基线建立' : ph.key === 'p2' ? '短板维度出现可衡量的改善，首个场景稳定运行' : '优势维度扩展，进入 ' + (next ? next.code + ' ' + next.name : level.code + ' ' + level.name) + ' 级的条件基本具备' };
    });
    var top3 = actions.slice(0, 3);

    // 90 天清单
    var weekLabels = ['第 1–4 周', '第 5–8 周', '第 9–12 周'];
    var checklist = [];
    top3.forEach(function (x) { x.steps.forEach(function (s, i) { checklist.push({ week: weekLabels[i], weekIndex: i, action: x.order, dimensionName: x.dimensionName, color: x.color, item: s, owner: x.owner }); }); });
    checklist.sort(function (x, y) { return (x.weekIndex - y.weekIndex) || (x.action - y.action); });

    // 场景推荐
    var weakKeys = weakDims.map(function (d) { return d.key; });
    var scenes = data.scenes.filter(function (s) { return s.sector === profile.sector; }).map(function (s) {
      var deps = s.dataDeps || [];
      var present = deps.filter(function (d) { return has(d); });
      var dataFit = deps.length ? 1 + 4 * present.length / deps.length : 5;
      var boost = s.dims.filter(function (d) { return weakKeys.indexOf(d) >= 0; }).length;
      var score = Math.round((s.value * 0.4 + (6 - s.difficulty) * 0.25 + dataFit * 0.35 + Math.min(boost, 2) * 0.3) * 10) / 10;
      var missing = deps.filter(function (d) { return !has(d); }).map(function (d) { return optText(F, 'systems', d); });
      return { id: s.id, name: s.name, stage: s.stage, value: s.value, difficulty: s.difficulty, desc: s.desc, firstStep: s.firstStep, module: s.module,
        dims: s.dims, score: score, dataFit: Math.round(dataFit * 10) / 10,
        dataNote: !deps.length ? '无需接入业务系统' : (missing.length ? '需先补齐：' + missing.join('、') : '数据条件已具备'),
        why: (boost ? '拉动短板维度「' + s.dims.filter(function (d) { return weakKeys.indexOf(d) >= 0; }).map(function (k) { return dims.filter(function (d) { return d.key === k; })[0].name; }).join('、') + '」；' : '') + (missing.length ? '数据条件待补' : '数据条件具备') + '，价值 ' + s.value + ' / 难度 ' + s.difficulty };
    }).sort(function (x, y) { return y.score - x.score; });
    scenes.forEach(function (s, i) { s.rank = i + 1; });

    // 投入档
    var q27 = answers.filter(function (x) { return x.id === 'q27'; })[0].score;
    var tierKey = ['零', '轻', '中', '重'][q27];
    var tier = data.reportText.investment.tiers.filter(function (t) { return t.key === tierKey; })[0];
    var investment = { tier: tierKey, name: tier.name, range: tier.range, desc: tier.desc, fit: tier.fit,
      rationale: '按可接受投入区间「' + answers[26].optionText + '」与当前 ' + level.code + ' 级判断，首个 12 个月以「' + tier.name + '」档推进最稳妥。',
      tiers: data.reportText.investment.tiers, note: data.reportText.investment.note };

    // 风险
    var subMap = {}; subdims.forEach(function (s) { subMap[s.key] = s; });
    var risks = data.risks.filter(function (r) {
      var w = r.when;
      if (w.sub) return subMap[w.sub] && subMap[w.sub].band === w.band;
      if (w.profile) return (w.profile === 'sector' ? profile.sector : profile[w.profile]) === w.value;
      return false;
    }).map(function (r) { return { id: r.id, level: r.level, title: r.title, text: r.text }; })
      .sort(function (x, y) { return ['高', '中', '提示'].indexOf(x.level) - ['高', '中', '提示'].indexOf(y.level); });

    // 答案分布
    var dist = [0, 0, 0, 0]; answers.forEach(function (x) { dist[x.score]++; });

    // 关键数字与摘要
    var keyNumbers = [
      { k: '综合得分', v: tp + '%', sub: total + ' / ' + max },
      { k: '成熟度等级', v: level.code, sub: level.name },
      { k: '同行位置', v: percentile != null ? '超过 ' + percentile + '%' : '—', sub: '同行业同规模企业' },
      { k: '高于参考带', v: String(positions.above), sub: '个维度' },
      { k: '低于参考带', v: String(positions.below), sub: '个维度' },
      { k: '待加强子维度', v: String(subdims.filter(function (s) { return s.band === 'low'; }).length), sub: '共 18 项' }
    ];
    var summary = {
      position: name + '的企业 AI 成熟度综合得分 ' + tp + '%（' + total + ' / ' + max + '），处于 ' + level.code + ' ' + level.name + ' 级：' + level.verdict + '。' +
        (percentile != null ? '在' + profile.industryName + '、' + profile.sizeName + '的同行中，估算超过 ' + percentile + '% 的企业。' : ''),
      dims: '六个维度中，' + positions.above + ' 个高于同行参考带，' + positions.within + ' 个在参考带内，' + positions.below + ' 个低于参考带。' +
        '最强的是「' + dimRank[dimRank.length - 1].name + '」（' + dimRank[dimRank.length - 1].pct + '%），最需要补的是「' + weakDims[0].name + '」（' + weakDims[0].pct + '%）。',
      subs: '十八个子维度中，「' + strengths[0].name + '」「' + strengths[1].name + '」「' + strengths[2].name + '」已经建立；' +
        '「' + weaknesses[0].name + '」「' + weaknesses[1].name + '」「' + weaknesses[2].name + '」需要优先加强。',
      next: (next ? '距 ' + next.code + ' ' + next.name + ' 级还差 ' + gapPts + ' 分。' : '已处于最高等级。') +
        '未来三个月建议先做三件事：' + top3.map(function (x, i) { return (i + 1) + '）' + x.title; }).join('；') + '。'
    };
    var summaryText = summary.position + summary.dims + summary.subs + summary.next;

    // 结论速览：六个问题，六句回答（报告首图）
    var strongest = dimRank[dimRank.length - 1];
    var subMap2 = {}; subdims.forEach(function (s) { subMap2[s.key] = s; });
    var firstSentence = function (t) { return String(t || '').split('。')[0] + '。'; };
    var quickView = [
      { n: 1, q: '处在什么阶段？', a: level.code + ' ' + level.name + ' 级', text: level.verdict + '。综合得分 ' + tp + '%，' + (next ? '距 ' + next.code + ' ' + next.name + ' 级还差 ' + gapPts + ' 分。' : '已处于最高等级。'), tone: 'cyan' },
      { n: 2, q: '同行里在哪？', a: percentile != null ? '超过 ' + percentile + '% 同行' : '参考带待补', text: positions.above + ' 个维度高于参考带，' + positions.within + ' 个在带内，' + positions.below + ' 个低于参考带。', tone: 'purple' },
      { n: 3, q: '最强在哪？', a: strongest.name + '维度 ' + strongest.pct + '%', text: '「' + subMap2[strongest.strongest].name + '」已建立：' + firstSentence(subMap2[strongest.strongest].diagnosis), tone: 'orange' },
      { n: 4, q: '短板在哪？', a: weakDims[0].name + '维度 ' + weakDims[0].pct + '%', text: '「' + subMap2[weakDims[0].weakest].name + '」待加强：' + firstSentence(subMap2[weakDims[0].weakest].diagnosis), tone: 'blue' },
      { n: 5, q: '先做什么？', a: top3[0].title, text: top3[0].why + ' 负责人：' + top3[0].owner + '，' + top3[0].weeks + ' 周，' + top3[0].cost + '投入。', tone: 'green' },
      { n: 6, q: '投多少？', a: tier.name + ' · ' + tier.range, text: tier.desc, tone: 'navy' }
    ];
    var verdict = {
      label: '总体判断',
      headline: '处于 ' + level.code + ' ' + level.name + ' 级，先补' + weakDims[0].name + '与' + weakDims[1].name + '，以「' + tier.name + '」起步' + (next ? '，12 个月内具备进入 ' + next.code + ' 级的条件' : '，持续巩固经营级能力'),
      text: level.desc,
      score: tp, scoreLabel: '成熟度综合得分'
    };
    // 优先方向：六维按短板顺序标 优先 / 次批 / 保持
    var directions = dimRank.map(function (d, i) {
      var w = subMap2[d.weakest], s = subMap2[d.strongest];
      var tag = i < 2 ? '优先' : (i < 4 ? '次批' : '保持');
      return { dimension: d.key, name: d.name + '维度', pct: d.pct, position: d.position, tag: tag, order: i < 2 ? 1 : (i < 4 ? 2 : 3), color: d.color,
        reason: (d.positionName ? d.positionName + '（' + d.pct + '%）；' : d.pct + '%；') + (tag === '保持' ? '「' + s.name + '」' + s.bandName + '，' + firstSentence(s.diagnosis) : '「' + w.name + '」' + w.bandName + '，' + firstSentence(w.diagnosis)) };
    });

    return {
      quickView: quickView, verdict: verdict, directions: directions,
      ok: true,
      meta: { module: MODULE_NAME, credits: CREDITS, version: VERSION, questionCount: data.questions.length },
      profile: profile,
      answers: answers,
      subdims: subdims,
      dimensions: dims,
      total: total, max: max, pct: tp,
      level: { code: level.code, name: level.name, verdict: level.verdict, desc: level.desc, traits: level.traits, focus: level.focus, typical: level.typical, minPct: level.minPct },
      levels: data.levels.map(function (l) { return { code: l.code, name: l.name, minPct: l.minPct }; }),
      nextLevel: next ? { code: next.code, name: next.name, minPct: next.minPct, gapPct: gapPct, gapPts: gapPts, focus: next.focus } : null,
      percentile: percentile, distribution: distribution,
      benchmark: { key: bm.key, basis: bm.basis },
      positions: positions,
      strengths: strengths.map(function (s) { return s.key; }),
      weaknesses: weaknesses.map(function (s) { return s.key; }),
      weakDims: weakDims.map(function (d) { return d.key; }),
      strongDims: strongDims.map(function (d) { return d.key; }),
      actions: actions,
      roadmap: roadmap,
      checklist: checklist,
      scenes: scenes,
      investment: investment,
      risks: risks,
      answerDistribution: dist,
      sectorInsight: { name: profile.sectorName, insight: ind.sector.insight, aiFocus: ind.sector.aiFocus },
      keyNumbers: keyNumbers,
      summary: summary,
      summaryText: summaryText,
      render: [
        { type: 'summary', source: 'summary' }, { type: 'radar', source: 'dimensions', band: !!bm.cell },
        { type: 'level-scale', source: 'level' }, { type: 'distribution', source: 'distribution' },
        { type: 'dimension-detail', source: 'dimensions' }, { type: 'ranked-bars', source: 'subdims' },
        { type: 'roadmap', source: 'roadmap' }, { type: 'action-list', source: 'actions' },
        { type: 'scene-matrix', source: 'scenes' }, { type: 'risk-list', source: 'risks' }, { type: 'checklist', source: 'checklist' }
      ]
    };
  }

  // ---------- LLM 润色（可选、≤1 处、8 秒、失败即模板；只润色近期三件事的标题与理由） ----------
  function buildPrompt(result, data) {
    var tpl = data.promptTemplate || '';
    var top3 = result.actions.slice(0, 3);
    var map = {
      'company.name': result.profile.name, 'company.industryName': result.profile.industryName, 'company.sizeName': result.profile.sizeName, 'company.yearsName': result.profile.yearsName,
      'level.code': result.level.code, 'level.name': result.level.name, 'total': String(result.total), 'max': String(result.max),
      'dimensionsLine': result.dimensions.map(function (d) { return d.name + ' ' + d.pct + '%' + (d.band ? '（同行 ' + d.band[0] + '–' + d.band[1] + '%）' : ''); }).join('，'),
      'nextLevel.code': result.nextLevel ? result.nextLevel.code : result.level.code, 'nextLevel.name': result.nextLevel ? result.nextLevel.name : result.level.name,
      'nextLevel.gap': result.nextLevel ? String(result.nextLevel.gapPts) : '0',
      'actionsBlock': top3.map(function (x) { return x.order + '. [' + x.dimensionName + '] ' + x.title + '：' + x.why + '（对应服务：' + x.service + '；可先试：' + x.module + '）'; }).join('\n')
    };
    return tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, function (_, k) { return map[k] != null ? map[k] : ''; });
  }
  function stripFence(t) { return String(t || '').replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim(); }
  function mergePolish(result, llmText, lint) {
    var out = JSON.parse(JSON.stringify(result));
    var parsed; try { parsed = JSON.parse(stripFence(llmText)); } catch (e) { return out; }
    var list = parsed && Array.isArray(parsed.actions) ? parsed.actions : null;
    if (!list || list.length !== 3) return out;
    var ok = list.every(function (p) {
      var t = String(p.title || '').trim(), x = String(p.text || '').trim();
      return t && x && t.length <= 14 && x.length <= 60 && !(lint && (lint(t) || lint(x)));
    });
    if (!ok) return out;
    list.forEach(function (p, i) { out.actions[i].title = String(p.title).trim(); out.actions[i].why = String(p.text).trim(); out.actions[i].source = 'llm'; });
    return out;
  }

  return { VERSION: VERSION, MODULE_NAME: MODULE_NAME, CREDITS: CREDITS, PHASES: PHASES, validate: validate, compute: compute, buildPrompt: buildPrompt, mergePolish: mergePolish };
});
