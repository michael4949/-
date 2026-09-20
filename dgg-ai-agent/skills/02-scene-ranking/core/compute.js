/*
 * 企业AI高价值场景排序 · 内核
 * 输入：企业画像 + 勾选痛点（带严重度）+ 现状条件 + 可选权重
 * 计算：本行业 13 个场景各出四维得分与总分 → 排序 → 三步走组合 → 数据补齐清单 → 12 个月排期
 * 评分公式（DM 定稿）：总分 = 痛点强度 × 0.35 + 数据可得 × 0.30 + 见效周期 × 0.20 + (6 − 实施门槛) × 0.15
 * 确定性、离线、无网络。UMD：Node 与浏览器共用。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.DGG = root.DGG || {}; root.DGG.coreM2 = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VERSION = '1.1.0';
  var MODULE_NAME = '企业AI高价值场景排序';
  var CREDITS = 20;
  var SYSTEMS = ['erp', 'finance', 'crm', 'oa', 'mes', 'shop', 'hr'];
  var PHASES = [
    { key: 'p1', months: [1, 3],  take: 1 },
    { key: 'p2', months: [4, 8],  take: 2 },
    { key: 'p3', months: [9, 12], take: 2 }
  ];
  var COST_ORDER = ['零', '轻', '中', '重'];

  // ---------- 工具 ----------
  function r1(n) { return Math.round(n * 10) / 10; }
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
  function uniq(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); }
  function optText(fields, key, v) {
    var f = fields.filter(function (x) { return x.key === key; })[0];
    if (!f || !f.options) return v == null ? '' : String(v);
    var o = f.options.filter(function (x) { return x.v === v; })[0];
    return o ? o.t : (v == null ? '' : String(v));
  }
  function condOpt(conditions, key, v) {
    var f = conditions.fields.filter(function (x) { return x.key === key; })[0];
    if (!f) return null;
    return f.options.filter(function (o) { return o.v === v; })[0] || null;
  }
  function findIndustry(ind, slug) {
    for (var i = 0; i < ind.sectors.length; i++) {
      var s = ind.sectors[i];
      for (var j = 0; j < s.industries.length; j++) if (s.industries[j].slug === slug) return { sector: s, industry: s.industries[j] };
    }
    return null;
  }
  function first(t) { return String(t || '').split('。')[0] + '。'; }

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
    if (Array.isArray(p.systems) && p.systems.indexOf('none') >= 0 && p.systems.length > 1) errs.push('profile.systems 选「无」时不能再选其他系统');
    var ind = p.industry ? findIndustry(data.industries, p.industry) : null;
    if (p.industry && !ind) errs.push('profile.industry 无效');
    var sec = ind && data.sectors[ind.sector.key];
    if (ind && !sec) errs.push('行业大类 ' + ind.sector.key + ' 没有场景库');

    var rng = data.conditions.painRange;
    var picks = input.pains;
    if (!Array.isArray(picks) || picks.length < rng.min || picks.length > rng.max) errs.push('pains 需为 ' + rng.min + '–' + rng.max + ' 项');
    else if (sec) {
      var ids = sec.pains.map(function (x) { return x.id; });
      picks.forEach(function (x, i) {
        if (!x || ids.indexOf(x.id) < 0) errs.push('pains[' + i + '].id 不在本行业痛点库中');
        else if (!(x.severity >= 1 && x.severity <= 5 && x.severity === Math.round(x.severity))) errs.push('pains[' + i + '].severity 需为 1–5');
      });
      if (uniq(picks.map(function (x) { return x && x.id; })).length !== picks.length) errs.push('pains 存在重复项');
    }
    var c = input.conditions || {};
    data.conditions.fields.forEach(function (f) {
      if (!f.required) return;
      if (!condOpt(data.conditions, f.key, c[f.key])) errs.push('conditions.' + f.key + ' 缺失或无效');
    });
    if (input.weights) {
      var sum = 0, ok = true;
      ['pain', 'data', 'cycle', 'barrier'].forEach(function (k) {
        var v = input.weights[k];
        if (typeof v !== 'number' || v < 0 || v > 1) ok = false; else sum += v;
      });
      if (!ok) errs.push('weights 四项需为 0–1 的数值');
      else if (sum <= 0) errs.push('weights 之和需大于 0');
    }
    return errs;
  }

  // ---------- 主计算 ----------
  function compute(input, data) {
    var errors = validate(input, data);
    if (errors.length) return { ok: false, errors: errors };

    var p = input.profile, F = data.fields;
    var ind = findIndustry(data.industries, p.industry);
    var sec = data.sectors[ind.sector.key];
    var systems = Array.isArray(p.systems) ? p.systems.slice() : [];
    var has = function (s) { return systems.indexOf(s) >= 0; };
    var name = (p.name && String(p.name).trim()) || '本企业';
    var RT = data.reportText;

    // --- 企业画像 ---
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
      profile.sectorName + ' · ' + profile.industryName, profile.sizeName, profile.revenueName,
      profile.ownershipName, profile.customersName,
      has('none') ? '无业务系统' : '已有 ' + profile.systemsName.join(' / '),
      profile.itStaff === 'none' ? '无数字化专职' : '数字化专职 ' + profile.itStaffName
    ].concat(profile.branches && profile.branches !== 'single' ? [profile.branchesName + '分支'] : [])
     .concat(profile.overseas === 'yes' ? ['有海外业务'] : []);
    profile.portrait = name + '是一家位于' + profile.province + '的' + profile.industryName + '企业，' + profile.ownershipName +
      '，成立 ' + profile.yearsName + '，' + profile.sizeName + '，上年营收 ' + profile.revenueName + '，主要面向' + profile.customersName +
      '。现有系统：' + (has('none') ? '无' : profile.systemsName.join('、')) + '，数字化专职人员 ' + profile.itStaffName + '。';

    // --- 痛点画像 ---
    var painMap = {}; sec.pains.forEach(function (x) { painMap[x.id] = x; });
    var groupMap = {}; data.conditions.groups.forEach(function (g) { groupMap[g.key] = g; });
    var sevNames = data.conditions.painRange.severityNames;
    var pains = input.pains.map(function (x) {
      var d = painMap[x.id], g = groupMap[d.group];
      return { id: d.id, group: d.group, groupName: g.name, color: g.color, tag: d.tag, text: d.text, hint: d.hint,
        severity: x.severity, severityName: sevNames[x.severity] };
    }).sort(function (a, b) { return (b.severity - a.severity) || (a.id < b.id ? -1 : 1); });
    var sevByTag = {}; pains.forEach(function (x) { sevByTag[x.tag] = x.severity; });
    var painTotal = pains.reduce(function (t, x) { return t + x.severity; }, 0);
    var painProfile = {
      count: pains.length, severityTotal: painTotal, severityAvg: r1(painTotal / pains.length),
      groups: data.conditions.groups.map(function (g) {
        var list = pains.filter(function (x) { return x.group === g.key; });
        var s = list.reduce(function (t, x) { return t + x.severity; }, 0);
        return { key: g.key, name: g.name, color: g.color, desc: g.desc, count: list.length, severity: s,
          pct: painTotal ? Math.round(s / painTotal * 100) : 0, tags: list.map(function (x) { return x.tag; }) };
      }),
      top: pains.slice(0, 3).map(function (x) { return { tag: x.tag, text: x.text, severity: x.severity, groupName: x.groupName, color: x.color }; }),
      focus: null, focusText: ''
    };
    var gRank = painProfile.groups.slice().sort(function (a, b) { return b.severity - a.severity; });
    painProfile.focus = gRank[0].key;
    painProfile.focusText = '所选 ' + pains.length + ' 项痛点集中在「' + gRank[0].name + '」（' + gRank[0].count + ' 项，严重度合计 ' + gRank[0].severity +
      '），其次是「' + gRank[1].name + '」（' + gRank[1].count + ' 项）。严重度最高的是「' + pains[0].text + '」。';

    // --- 现状条件 ---
    var ci = input.conditions;
    var oData = condOpt(data.conditions, 'dataState', ci.dataState);
    var oObj = condOpt(data.conditions, 'objective', ci.objective);
    var oWin = condOpt(data.conditions, 'window', ci.window);
    var oCap = condOpt(data.conditions, 'capacity', ci.capacity);
    var conditions = {
      dataState: ci.dataState, dataStateName: oData.t, dataStateNote: oData.note,
      objective: ci.objective, objectiveName: oObj.t,
      window: ci.window, windowName: oWin.t, windowNote: oWin.note,
      capacity: ci.capacity, capacityName: oCap.t, capacityNote: oCap.note
    };

    // --- 权重 ---
    var axesDef = data.axes.items;
    var wIn = input.weights || null;
    var raw = {};
    axesDef.forEach(function (a) { raw[a.key] = wIn ? wIn[a.key] : a.weight; });
    var wSum = axesDef.reduce(function (t, a) { return t + raw[a.key]; }, 0);
    var W = {}; axesDef.forEach(function (a) { W[a.key] = raw[a.key] / wSum; });
    var presetHit = data.axes.presets.filter(function (ps) {
      return axesDef.every(function (a) { return Math.abs(ps.weights[a.key] - W[a.key]) < 0.005; });
    })[0];
    var weights = { pain: r1(W.pain * 100) / 100, data: r1(W.data * 100) / 100, cycle: r1(W.cycle * 100) / 100, barrier: r1(W.barrier * 100) / 100,
      preset: presetHit ? presetHit.key : 'custom', presetName: presetHit ? presetHit.name : '自定义权重' };
    var axes = axesDef.map(function (a) {
      return { key: a.key, name: a.name, weight: weights[a.key], color: a.color, invert: !!a.invert, desc: a.desc, how: a.how, scale: a.scale };
    });

    // --- 逐场景评分 ---
    var objKeywords = oObj.keywords || [];
    var scenes = sec.scenes.map(function (s) {
      // 痛点强度
      var hit = s.painTags.filter(function (t) { return sevByTag[t] != null; });
      var got = hit.reduce(function (t, x) { return t + sevByTag[x]; }, 0);
      var maxGot = s.painTags.length * 5;
      var ratio = maxGot ? got / maxGot : 0;
      var painScore = ratio <= 0 ? 1 : ratio <= 0.25 ? 2 : ratio <= 0.5 ? 3 : ratio <= 0.8 ? 4 : 5;
      var painWhy = hit.length
        ? '命中所选痛点「' + hit.join('」「') + '」，严重度合计 ' + got + ' / ' + maxGot
        : '未命中本次勾选的痛点，该场景对应「' + s.painTags.join('」「') + '」';

      // 数据可得
      var deps = s.dataDeps || [];
      var present = deps.filter(function (d) { return has(d); });
      var missing = deps.filter(function (d) { return !has(d); });
      var dataBase, dataWhy;
      if (!deps.length) { dataBase = 5; dataWhy = '无需接入业务系统，整理现有资料即可起步'; }
      else if (!present.length) { dataBase = 1; dataWhy = '关键数据源缺失：' + missing.map(function (d) { return optText(F, 'systems', d); }).join('、'); }
      else if (!missing.length) { dataBase = 5; dataWhy = '所需数据源均已具备：' + present.map(function (d) { return optText(F, 'systems', d); }).join('、'); }
      else { dataBase = present.length / deps.length >= 0.5 ? 4 : 3; dataWhy = '已有 ' + present.map(function (d) { return optText(F, 'systems', d); }).join('、') + '，仍需补齐 ' + missing.map(function (d) { return optText(F, 'systems', d); }).join('、'); }
      var dataScore = dataBase;
      if (deps.length && dataBase > 1) { dataScore = clamp(r1(dataBase + oData.adj), 1, 5); if (oData.adj) dataWhy += '；' + oData.t + '，按数据存放现状调整 ' + (oData.adj > 0 ? '+' : '') + oData.adj + ' 分'; }

      // 见效周期
      var cycleScore = s.cycle, cycleWhy = '场景库预设见效速度 ' + s.cycle + ' / 5，上线约 ' + s.weeks + ' 周';
      if (oWin.fast > 0 && s.cycle < 4) { cycleScore = clamp(s.cycle - oWin.fast, 1, 5); cycleWhy += '；期望 ' + oWin.t + '见效，长周期场景下调 ' + oWin.fast + ' 分'; }
      else if (oWin.fast < 0 && s.cycle <= 2) { cycleScore = clamp(r1(s.cycle - oWin.fast), 1, 5); cycleWhy += '；可接受 ' + oWin.t + '的周期，长周期场景回调 ' + (-oWin.fast) + ' 分'; }

      // 实施门槛
      var barrierScore = clamp(r1(s.barrier + oCap.adj), 1, 5);
      var barrierWhy = '场景库预设门槛 ' + s.barrier + ' / 5' + (oCap.adj ? '；' + oCap.t + '，调整 ' + (oCap.adj > 0 ? '+' : '') + oCap.adj + ' 分' : '');

      var total = painScore * W.pain + dataScore * W.data + cycleScore * W.cycle + (6 - barrierScore) * W.barrier;
      var score = r1(total / 5 * 100);
      var fitObjective = objKeywords.some(function (k) { return (s.roiBasis + s.metric + s.replaces + s.name).indexOf(k) >= 0; });

      return { id: s.id, name: s.name, stage: s.stage, user: s.user, replaces: s.replaces,
        painTags: s.painTags.slice(), hitTags: hit, dataDeps: deps.slice(), dataList: s.dataList.slice(),
        presentSystems: present.map(function (d) { return optText(F, 'systems', d); }),
        missingSystems: missing, missingSystemsName: missing.map(function (d) { return optText(F, 'systems', d); }),
        value: s.value, cost: s.cost, weeks: s.weeks, module: s.module,
        metric: s.metric, firstStep: s.firstStep, precondition: s.precondition, roiBasis: s.roiBasis,
        axis: { pain: painScore, data: dataScore, cycle: cycleScore, barrier: barrierScore },
        why: { pain: painWhy, data: dataWhy, cycle: cycleWhy, barrier: barrierWhy },
        contrib: { pain: r1(painScore * W.pain / 5 * 100), data: r1(dataScore * W.data / 5 * 100),
                   cycle: r1(cycleScore * W.cycle / 5 * 100), barrier: r1((6 - barrierScore) * W.barrier / 5 * 100) },
        total: r1(total), score: score,
        blocked: deps.length > 0 && present.length === 0,
        fitObjective: fitObjective, startable: dataScore >= 3 && barrierScore <= 4 };
    });

    scenes.sort(function (a, b) {
      return (b.score - a.score) || ((b.fitObjective ? 1 : 0) - (a.fitObjective ? 1 : 0)) || (b.value - a.value) || (a.id < b.id ? -1 : 1);
    });
    scenes.forEach(function (s, i) {
      s.rank = i + 1;
      var lead = s.blocked ? '条件补齐后可进入候选' : s.rank <= 3 ? '排在前列' : s.rank <= 8 ? '进入候选' : '本轮暂不启动';
      s.reason = lead + '：' + (s.hitTags.length ? '正面命中「' + s.hitTags.join('」「') + '」' : '与所选痛点关联较弱') +
        '，' + (s.blocked ? '关键数据源缺失（' + s.missingSystemsName.join('、') + '）' : '数据可得 ' + s.axis.data + ' / 5') +
        '，见效 ' + s.axis.cycle + ' / 5，门槛 ' + s.axis.barrier + ' / 5。';
    });

    var ranked = scenes.slice(0, 8);
    var rest = scenes.slice(8);
    var blocked = scenes.filter(function (s) { return s.blocked; });
    var excluded = rest.map(function (s) {
      return { id: s.id, name: s.name, rank: s.rank, score: s.score, module: s.module,
        reason: s.blocked ? '关键数据源缺失：' + s.missingSystemsName.join('、') + '，补齐后重新评估'
          : !s.hitTags.length ? '与本次勾选的痛点关联较弱，痛点强度 ' + s.axis.pain + ' / 5'
          : s.axis.barrier >= 4 ? '实施门槛 ' + s.axis.barrier + ' / 5，建议在前两批沉淀出数据与做法后启动'
          : '综合得分 ' + s.score + ' 分，排在候选之后' };
    });

    // --- 三步走组合 ---
    var used = {}, combo = [];
    function takeBy(n, pred) {
      var out = [];
      scenes.forEach(function (s) { if (out.length < n && !used[s.id] && pred(s)) { used[s.id] = 1; out.push(s); } });
      return out;
    }
    PHASES.forEach(function (ph) {
      var t = RT.comboText[ph.key];
      var list = ph.key === 'p3'
        ? takeBy(ph.take, function (s) { return s.blocked && s.value >= 4; }).concat([])
        : takeBy(ph.take, function (s) { return s.startable; });
      if (list.length < ph.take) list = list.concat(takeBy(ph.take - list.length, function () { return true; }));
      var costs = list.map(function (s) { return s.cost; });
      var topCost = COST_ORDER[Math.max.apply(null, costs.map(function (c) { return COST_ORDER.indexOf(c); }).concat([0]))];
      combo.push({ key: ph.key, name: t.name, title: t.title, desc: t.desc, months: ph.months,
        scenes: list.map(function (s) { return { id: s.id, rank: s.rank, name: s.name, score: s.score, module: s.module, cost: s.cost, weeks: s.weeks, metric: s.metric, firstStep: s.firstStep, blocked: s.blocked }; }),
        cost: topCost, weeks: list.reduce(function (t2, s) { return Math.max(t2, s.weeks); }, 0),
        milestone: ph.key === 'p1' ? '第一个场景稳定运行，做法与数据口径固定下来'
          : ph.key === 'p2' ? '两个场景的改善出现在经营报表上，形成可复制的推进方式'
          : '条件补齐的场景进入评估，AI 覆盖到第二条业务线' });
    });
    var top1 = scenes.filter(function (s) { return s.id === combo[0].scenes[0].id; })[0];

    // --- 数据就绪度 ---
    var need = {};
    scenes.forEach(function (s) { s.dataDeps.forEach(function (d) { (need[d] = need[d] || []).push(s.name); }); });
    var matrix = scenes.map(function (s) {
      return { id: s.id, name: s.name, rank: s.rank,
        cells: SYSTEMS.map(function (sys) { return s.dataDeps.indexOf(sys) < 0 ? 0 : (has(sys) ? 2 : 1); }) };
    });
    var missingList = Object.keys(need).filter(function (d) { return !has(d); }).map(function (d) {
      var blockedNames = scenes.filter(function (s) { return s.missingSystems.indexOf(d) >= 0; });
      return { system: d, name: optText(F, 'systems', d), unlock: blockedNames.length,
        scenes: blockedNames.map(function (s) { return s.name; }),
        bestRank: Math.min.apply(null, blockedNames.map(function (s) { return s.rank; })),
        note: '补齐后 ' + blockedNames.length + ' 个场景的数据可得分从 1 分回到可评估区间' };
    }).sort(function (a, b) { return (b.unlock - a.unlock) || (a.bestRank - b.bestRank); });
    var depTotal = scenes.reduce(function (t, s) { return t + s.dataDeps.length; }, 0);
    var depGot = scenes.reduce(function (t, s) { return t + s.dataDeps.filter(function (d) { return has(d); }).length; }, 0);
    var readyPct = depTotal ? Math.round(depGot / depTotal * 100) : 100;
    var readiness = {
      systems: SYSTEMS.map(function (sys) { return { key: sys, name: optText(F, 'systems', sys), has: has(sys), need: (need[sys] || []).length }; }),
      matrix: matrix, missing: missingList, pct: readyPct,
      level: readyPct >= 70 ? '数据条件良好' : readyPct >= 40 ? '数据条件部分具备' : '数据条件待补齐',
      zeroDep: scenes.filter(function (s) { return !s.dataDeps.length; }).length,
      text: '本行业 ' + scenes.length + ' 个场景共提出 ' + depTotal + ' 项数据源需求，当前已具备 ' + depGot + ' 项（' + readyPct + '%）。' +
        (missingList.length ? '补齐「' + missingList[0].name + '」可解锁 ' + missingList[0].unlock + ' 个场景。' : '所需数据源均已具备。') +
        '另有 ' + scenes.filter(function (s) { return !s.dataDeps.length; }).length + ' 个场景无需接入业务系统，整理现有资料即可起步。'
    };

    // --- 筛选漏斗 ---
    var hitCount = scenes.filter(function (s) { return s.hitTags.length; }).length;
    var okCount = scenes.filter(function (s) { return !s.blocked; }).length;
    var funnel = [
      { key: 'lib',    label: '场景库全量',     count: data.libTotal || scenes.length, note: '按行业大类整理的候选场景' },
      { key: 'sector', label: profile.sectorName, count: scenes.length, note: '匹配到贵司所属行业大类' },
      { key: 'pain',   label: '命中所选痛点',   count: hitCount, note: '与本次勾选的 ' + pains.length + ' 项痛点有交集' },
      { key: 'data',   label: '数据条件具备',   count: okCount, note: '关键数据源现在就能拿到' },
      { key: 'rank',   label: '进入排序表',     count: ranked.length, note: '按四维总分取前 ' + ranked.length + ' 个' },
      { key: 'start',  label: '首批启动',       count: combo[0].scenes.length, note: '第 1–3 个月先做这一个' }
    ];

    // --- 痛点组 → 场景 → 模块（桑基） ---
    var sankeyScenes = ranked.slice(0, 6);
    var modules = uniq(sankeyScenes.map(function (s) { return s.module; }));
    var sankey = {
      groups: painProfile.groups.filter(function (g) { return g.count; }),
      scenes: sankeyScenes.map(function (s) { return { id: s.id, name: s.name, rank: s.rank, score: s.score, module: s.module }; }),
      modules: modules.map(function (m) { return { name: m, count: sankeyScenes.filter(function (s) { return s.module === m; }).length }; }),
      links: sankeyScenes.map(function (s) {
        var gs = uniq(s.hitTags.map(function (t) { return (pains.filter(function (x) { return x.tag === t; })[0] || {}).group; }).filter(Boolean));
        return { scene: s.id, groups: gs.length ? gs : [painProfile.focus], module: s.module, weight: s.score };
      })
    };

    // --- 排期 ---
    var roadmap = combo.map(function (c) {
      return { key: c.key, name: c.name, title: c.title, months: c.months, milestone: c.milestone,
        bars: c.scenes.map(function (s) { return { name: s.name, weeks: s.weeks, cost: s.cost, module: s.module, blocked: s.blocked }; }) };
    });

    // --- 投入 ---
    var startCosts = combo[0].scenes.concat(combo[1].scenes).map(function (s) { return s.cost; });
    var tierKey = COST_ORDER[Math.max.apply(null, startCosts.map(function (c) { return COST_ORDER.indexOf(c); }))];
    var tier = RT.investment.tiers.filter(function (t) { return t.key === tierKey; })[0];
    var investment = {
      tier: tierKey, name: tier.name, range: tier.range, desc: tier.desc, fit: tier.fit,
      tiers: RT.investment.tiers, note: RT.investment.note, roiNote: RT.investment.roiNote,
      rationale: '前两批共 ' + (combo[0].scenes.length + combo[1].scenes.length) + ' 个场景中，投入档最高的一档为「' + tier.name + '」（' + tier.range + '）。' +
        '按 ' + conditions.capacityName + '、期望 ' + conditions.windowName + '见效的条件，建议以这一档规划第一年预算。',
      byScene: ranked.map(function (s) { return { name: s.name, cost: s.cost, range: RT.investment.tiers.filter(function (t) { return t.key === s.cost; })[0].range, weeks: s.weeks, roiBasis: s.roiBasis }; })
    };

    // --- 三档推进情景 ---
    var tierRange = function (k) { return RT.investment.tiers.filter(function (t) { return t.key === k; })[0].range; };
    var comboCost = function (list) { return COST_ORDER[Math.max.apply(null, list.map(function (x) { return COST_ORDER.indexOf(x.cost); }).concat([0]))]; };
    var pickN = function (n) { var out = [], i = 0; combo.forEach(function (c) { c.scenes.forEach(function (x) { if (out.length < n) out.push(x); }); }); return out; };
    var scenarios = RT.scenarios.items.map(function (t, i) {
      var list = pickN([1, 3, 5][i]);
      var ck = comboCost(list);
      return { key: t.key, name: t.name, sub: t.sub, desc: t.desc, scope: t.scope, effort: t.effort, expect: t.expect, risk: t.risk,
        count: list.length, scenes: list.map(function (x) { return x.name; }), cost: ck, range: tierRange(ck),
        weeks: list.reduce(function (a, x) { return a + x.weeks; }, 0),
        modules: uniq(list.map(function (x) { return x.module; })),
        metrics: list.map(function (x) { var f = scenes.filter(function (y) { return y.id === x.id; })[0]; return { name: x.name, metric: f ? f.metric : '' }; }) };
    });

    // --- 角色分工 ---
    var roles = RT.roles.items.map(function (r) {
      var who = r.who;
      if (r.key === 'biz') who = top1.user + '（首批场景）';
      if (r.key === 'data') who = profile.itStaff === 'none' ? '暂无专职，建议由熟悉' + (has('none') ? '现有台账' : profile.systemsName[0]) + '的同事兼任' : r.who + '（现有 ' + profile.itStaffName + '）';
      return { key: r.key, name: r.name, who: who, duty: r.duty, time: r.time };
    });

    // --- 何时重跑 ---
    var retrigger = RT.retrigger.items.map(function (x) {
      var extra = '';
      if (x.when === '补齐了一个业务系统' && missingList.length) extra = '本次缺 ' + missingList.map(function (m) { return m.name; }).join('、') + '，其中「' + missingList[0].name + '」影响 ' + missingList[0].unlock + ' 个场景。';
      if (x.when === '首批场景上线并稳定运行') extra = '首批为「' + top1.name + '」，约 ' + top1.weeks + ' 周。';
      return { when: x.when, why: x.why, extra: extra };
    });

    // --- 90 天清单 ---
    var checklist = [];
    var wk = ['第 1–2 周', '第 3–4 周', '第 5–8 周', '第 9–12 周'];
    checklist.push({ week: wk[0], item: top1.firstStep, owner: top1.user, scene: top1.name, kind: '起步' });
    checklist.push({ week: wk[0], item: '把所需数据清单交给对应岗位：' + top1.dataList[0], owner: top1.user, scene: top1.name, kind: '数据' });
    checklist.push({ week: wk[1], item: top1.precondition, owner: top1.user, scene: top1.name, kind: '前置' });
    checklist.push({ week: wk[1], item: '整理' + top1.dataList[1] + '与' + top1.dataList[2] + '，确认口径一致', owner: top1.user, scene: top1.name, kind: '数据' });
    checklist.push({ week: wk[2], item: '在「' + top1.module + '」里配置该场景并试运行两周', owner: top1.user, scene: top1.name, kind: '上线' });
    checklist.push({ week: wk[2], item: '记录使用前后的对比：' + top1.metric, owner: top1.user, scene: top1.name, kind: '验收' });
    combo[1].scenes.forEach(function (s) {
      checklist.push({ week: wk[3], item: s.firstStep, owner: (scenes.filter(function (x) { return x.id === s.id; })[0] || {}).user || '', scene: s.name, kind: '准备' });
    });
    if (missingList.length) checklist.push({ week: wk[3], item: '评估补齐「' + missingList[0].name + '」，它关系到 ' + missingList[0].unlock + ' 个场景', owner: '数字化负责人', scene: '数据补齐', kind: '数据' });
    checklist.forEach(function (x, i) { x.no = i + 1; });

    // --- 风险与前置 ---
    var risks = [];
    if (conditions.dataState === 'paper') risks.push({ level: '高', title: '数据以纸质与手工记录为主', text: '所选场景中依赖业务系统的部分需要先完成电子化。建议第一批只做无需接入系统的场景，同时把纸质单据的录入方式定下来。' });
    if (conditions.dataState === 'scattered') risks.push({ level: '中', title: '数据分散在多个系统', text: '跨系统取数需要先对齐客户、物料与订单的主数据编码。建议第一批选单一系统内即可完成的场景。' });
    if (has('none')) risks.push({ level: '高', title: '暂无业务系统', text: '依赖系统取数的场景本轮数据可得均为 1 分。建议从整理现有资料即可起步的场景做起，用两到三个月沉淀出第一批可用数据。' });
    if (conditions.capacity === 'none') risks.push({ level: '中', title: '暂无专人推进', text: '建议指定一名业务骨干牵头，每周固定半天推进。同时启动多个场景会让进度都停在半途。' });
    if (missingList.length) risks.push({ level: '中', title: '关键数据源缺失 ' + missingList.length + ' 项', text: '缺少' + missingList.map(function (m) { return m.name; }).join('、') + '，影响 ' + blocked.length + ' 个场景。补齐顺序建议按解锁场景数排：' + missingList.map(function (m) { return m.name + '（' + m.unlock + ' 个）'; }).join('、') + '。' });
    if (conditions.window === 'm3' && combo[0].scenes[0] && combo[0].scenes[0].weeks > 8) risks.push({ level: '提示', title: '首批场景的周期与期望窗口存在差距', text: '首批场景上线约需 ' + combo[0].scenes[0].weeks + ' 周。若要在 3 个月内看到结果，可先取该场景中数据整理与试运行的部分做阶段验收。' });
    if (profile.itStaff === 'none' && investment.tier === '重') risks.push({ level: '中', title: '投入档与数字化人员配置存在差距', text: '「' + investment.name + '」档需要有人对接系统与数据。建议先以轻量场景验证价值，再评估是否配置专职。' });
    if (!risks.length) risks.push({ level: '提示', title: '本次作答未触发风险提示', text: '痛点、数据条件与人员投入相互匹配，按三步走的节奏推进即可。' });

    // --- 关键数字与结论 ---
    var keyNumbers = [
      { k: '候选场景', v: String(scenes.length), sub: profile.sectorName + '场景库' },
      { k: '进入排序', v: String(ranked.length), sub: '按四维总分排序' },
      { k: '首选场景', v: top1.name, sub: top1.score + ' 分 · 排名第 ' + top1.rank, wide: true },
      { k: '数据就绪', v: readyPct + '%', sub: readiness.level },
      { k: '起步投入', v: investment.range, sub: investment.name },
      { k: '首批见效', v: top1.weeks + ' 周', sub: '上线周期' }
    ];
    var verdict = {
      label: '排序结论',
      headline: '先做「' + top1.name + '」，' + top1.weeks + ' 周上线，' + (top1.cost === '零' ? '零投入起步' : '投入 ' + RT.investment.tiers.filter(function (t) { return t.key === top1.cost; })[0].range) +
        '，对应' + top1.module + '模块',
      text: top1.reason,
      score: top1.score, scoreLabel: '综合得分'
    };
    var quickView = [
      { n: 1, q: '先做哪一个？', a: top1.name, text: top1.stage + '环节，给' + top1.user + '用，替代' + top1.replaces + '。', tone: 'cyan' },
      { n: 2, q: '为什么是它？', a: top1.score + ' 分 · 四维均衡', text: '痛点强度 ' + top1.axis.pain + '、数据可得 ' + top1.axis.data + '、见效周期 ' + top1.axis.cycle + '、实施门槛 ' + top1.axis.barrier + '（计分取反）。' + first(top1.why.pain), tone: 'purple' },
      { n: 3, q: '数据够不够？', a: readiness.level + ' ' + readyPct + '%', text: readiness.missing.length ? '补齐「' + readiness.missing[0].name + '」可解锁 ' + readiness.missing[0].unlock + ' 个场景；首选场景所需数据' + (top1.missingSystems.length ? '尚需补齐' : '现在就能拿到') + '。' : '所选场景所需数据均已具备。', tone: 'blue' },
      { n: 4, q: '多久见效？', a: top1.weeks + ' 周上线', text: top1.metric + '。第一步：' + top1.firstStep + '。', tone: 'green' },
      { n: 5, q: '投多少？', a: investment.name + ' · ' + investment.range, text: investment.desc, tone: 'navy' },
      { n: 6, q: '接下来做什么？', a: combo[1].scenes.map(function (s) { return s.name; }).join(' · '), text: '第 4–8 个月并行推进，' + combo[1].milestone + '。', tone: 'orange' }
    ];
    var summary = {
      position: name + '所属' + profile.sectorName + '，本次从 ' + scenes.length + ' 个候选场景中排出优先级。' +
        '所选 ' + pains.length + ' 项痛点集中在「' + gRank[0].name + '」，数据就绪度 ' + readyPct + '%（' + readiness.level + '）。',
      top: '排在第一的是「' + top1.name + '」，综合得分 ' + top1.score + ' 分：' + top1.stage + '环节，给' + top1.user + '用，替代' + top1.replaces + '，预期' + top1.metric + '。',
      combo: '三步走：第 1–3 个月先做「' + combo[0].scenes.map(function (s) { return s.name; }).join('」「') + '」；第 4–8 个月并行「' + combo[1].scenes.map(function (s) { return s.name; }).join('」「') + '」；' +
        '第 9–12 个月储备「' + combo[2].scenes.map(function (s) { return s.name; }).join('」「') + '」。',
      next: '第一步：' + top1.firstStep + '。' + (missingList.length ? '同时评估补齐「' + missingList[0].name + '」，它关系到 ' + missingList[0].unlock + ' 个场景。' : '所需数据均已具备，可直接进入配置。')
    };
    var summaryText = summary.position + summary.top + summary.combo + summary.next;

    return {
      ok: true,
      meta: { module: MODULE_NAME, credits: CREDITS, version: VERSION, sceneCount: scenes.length, painCount: sec.pains.length },
      profile: profile,
      pains: pains, painProfile: painProfile,
      conditions: conditions,
      weights: weights, axes: axes, formula: data.axes.formula,
      scenes: scenes, ranked: ranked, blocked: blocked.map(function (s) { return { id: s.id, name: s.name, rank: s.rank, value: s.value, missing: s.missingSystemsName, module: s.module }; }), excluded: excluded,
      top1: { id: top1.id, name: top1.name, stage: top1.stage, user: top1.user, replaces: top1.replaces, score: top1.score, rank: top1.rank,
        axis: top1.axis, why: top1.why, contrib: top1.contrib, metric: top1.metric, firstStep: top1.firstStep, precondition: top1.precondition,
        dataList: top1.dataList, dataDeps: top1.dataDeps, missingSystemsName: top1.missingSystemsName, module: top1.module, cost: top1.cost, weeks: top1.weeks, roiBasis: top1.roiBasis,
        painTags: top1.painTags, hitTags: top1.hitTags, reason: top1.reason },
      combo: combo, roadmap: roadmap, readiness: readiness, funnel: funnel, sankey: sankey,
      scenarios: scenarios, scenarioNote: RT.scenarios.note, roles: roles, retrigger: retrigger,
      painLibrary: sec.pains.map(function (x) { var pk = pains.filter(function (y) { return y.id === x.id; })[0]; return { id: x.id, group: x.group, groupName: groupMap[x.group].name, color: groupMap[x.group].color, tag: x.tag, text: x.text, hint: x.hint, picked: !!pk, severity: pk ? pk.severity : 0 }; }),
      investment: investment, checklist: checklist, risks: risks,
      sectorInsight: { name: ind.sector.name, insight: ind.sector.insight, aiFocus: ind.sector.aiFocus },
      keyNumbers: keyNumbers, quickView: quickView, verdict: verdict, summary: summary, summaryText: summaryText,
      render: [
        { type: 'summary', source: 'summary' }, { type: 'rank-table', source: 'ranked' },
        { type: 'bubble-matrix', source: 'scenes' }, { type: 'axis-bars', source: 'axes' },
        { type: 'funnel', source: 'funnel' }, { type: 'sankey', source: 'sankey' },
        { type: 'scene-card', source: 'top1' }, { type: 'heatmap', source: 'readiness' },
        { type: 'gantt', source: 'roadmap' }, { type: 'invest-tiers', source: 'investment' },
        { type: 'risk-list', source: 'risks' }, { type: 'checklist', source: 'checklist' }
      ]
    };
  }

  // ---------- LLM 润色（可选、≤1 处、8 秒、失败即模板；只润色前三个场景的「为什么排这里」） ----------
  function buildPrompt(result, data) {
    var tpl = data.promptTemplate || '';
    var top3 = result.ranked.slice(0, 3);
    var map = {
      'company.name': result.profile.name, 'company.industryName': result.profile.industryName,
      'company.sizeName': result.profile.sizeName, 'company.sectorName': result.profile.sectorName,
      'painsLine': result.pains.map(function (x) { return x.text + '（严重度 ' + x.severity + '）'; }).join('；'),
      'conditionsLine': [result.conditions.dataStateName, result.conditions.objectiveName, result.conditions.windowName + '见效', result.conditions.capacityName].join('，'),
      'weightsLine': result.axes.map(function (a) { return a.name + ' ' + Math.round(a.weight * 100) + '%'; }).join('，'),
      'scenesBlock': top3.map(function (s) {
        return s.rank + '. ' + s.name + '（' + s.score + ' 分）：痛点强度 ' + s.axis.pain + '、数据可得 ' + s.axis.data + '、见效周期 ' + s.axis.cycle + '、实施门槛 ' + s.axis.barrier +
          '；' + s.stage + '环节，给' + s.user + '用，替代' + s.replaces + '；预期' + s.metric;
      }).join('\n')
    };
    return tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, function (_, k) { return map[k] != null ? map[k] : ''; });
  }
  function stripFence(t) { return String(t || '').replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim(); }
  function mergePolish(result, llmText, lint) {
    var out = JSON.parse(JSON.stringify(result));
    var parsed; try { parsed = JSON.parse(stripFence(llmText)); } catch (e) { return out; }
    var list = parsed && Array.isArray(parsed.scenes) ? parsed.scenes : null;
    if (!list || list.length !== 3) return out;
    var ok = list.every(function (x) {
      var t = String(x.reason || '').trim();
      return t && t.length <= 80 && !(lint && lint(t));
    });
    if (!ok) return out;
    list.forEach(function (x, i) {
      out.ranked[i].reason = String(x.reason).trim(); out.ranked[i].source = 'llm';
      var hit = out.scenes.filter(function (s) { return s.id === out.ranked[i].id; })[0];
      if (hit) { hit.reason = out.ranked[i].reason; hit.source = 'llm'; }
      if (i === 0) { out.top1.reason = out.ranked[0].reason; out.verdict.text = out.ranked[0].reason; }
    });
    return out;
  }

  return { VERSION: VERSION, MODULE_NAME: MODULE_NAME, CREDITS: CREDITS, PHASES: PHASES, validate: validate, compute: compute, buildPrompt: buildPrompt, mergePolish: mergePolish };
});
