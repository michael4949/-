/*
 * 企业AI投入ROI测算器 · 内核
 * 输入：企业画像 + 选定场景 + 投入方案 + 收益端实际经营数字
 * 计算：三个科目 —— 投入构成 / 收益构成 / 24 期现金流与回收期
 *       另出三档情景、敏感度、口径来源与置信度
 * 口径纪律：
 *   · 价格全部取自 DM 定稿宣传单，不取区间中间值，不造单子上没有的价。
 *   · 主杠杆的核心数字一律不给默认值——缺了就明说算不准，不替客户编。
 *   · 人工工时节约列为非现金科目，不计入回收期测算。
 *   · 多条杠杆命中时按各自算出的金额排序，与场景描述的行文顺序无关。
 * 确定性、离线、无网络。UMD：Node 与浏览器共用。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.DGG = root.DGG || {}; root.DGG.coreM3 = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VERSION = '1.1.0';
  var MODULE_NAME = '企业AI投入ROI测算器';
  var CREDITS = 20;
  var LEVER_ORDER = ['hours', 'error', 'revenue', 'margin', 'cash', 'spend', 'output'];
  var SENS_ORDER = ['benefitCut', 'customBudget', 'seats', 'setupCost', 'rampSpeed'];

  function r0(n) { return Math.round(n); }
  function r1(n) { return Math.round(n * 10) / 10; }
  function r2(n) { return Math.round(n * 100) / 100; }
  function r4(n) { return Math.round(n * 10000) / 10000; }
  function clamp(n, lo, hi) { return n < lo ? lo : n > hi ? hi : n; }
  function sum(a) { return a.reduce(function (t, x) { return t + x; }, 0); }
  function has(o, k) { return o != null && Object.prototype.hasOwnProperty.call(o, k) && o[k] != null && o[k] !== ''; }

  /* ---------------- 校验 ---------------- */
  function validate(input, data) {
    var e = [];
    var p = (input && input.profile) || null;
    if (!p) e.push({ field: 'profile', msg: '缺少企业画像' });
    else {
      if (!has(p, 'industry')) e.push({ field: 'profile.industry', msg: '缺少行业' });
      else if (!findIndustry(data.industries, p.industry)) e.push({ field: 'profile.industry', msg: '行业「' + p.industry + '」不在表内' });
      if (!has(p, 'name')) e.push({ field: 'profile.name', msg: '缺少企业名称' });
    }
    var pl = (input && input.plan) || null;
    if (!pl) e.push({ field: 'plan', msg: '缺少投入方案' });
    else {
      var tiers = data.constants.prices.subscription.map(function (t) { return t.key; });
      if (!has(pl, 'tier') || tiers.indexOf(pl.tier) < 0) e.push({ field: 'plan.tier', msg: '版本需为 ' + tiers.join(' / ') });
      if (!has(pl, 'seats') || !(pl.seats >= 1 && pl.seats <= 50)) e.push({ field: 'plan.seats', msg: '套数需为 1–50' });
      if (!has(pl, 'diagnosisDays') || !(pl.diagnosisDays >= 0 && pl.diagnosisDays <= 3)) e.push({ field: 'plan.diagnosisDays', msg: '入企诊断天数需为 0–3' });
      if (has(pl, 'privateDeploy')) {
        var pk = data.constants.prices.privateDeploy.map(function (x) { return x.key; });
        if (pk.indexOf(pl.privateDeploy) < 0) e.push({ field: 'plan.privateDeploy', msg: '私域部署需为 ' + pk.join(' / ') + '，DM 口径只有这两个锚点' });
      }
      if (has(pl, 'customBudget') && pl.customBudget < 0) e.push({ field: 'plan.customBudget', msg: '另议项预算不能为负' });
      if (!has(pl, 'setupPeople') || !(pl.setupPeople >= 1 && pl.setupPeople <= 10)) e.push({ field: 'plan.setupPeople', msg: '推进人数需为 1–10' });
      if (!has(pl, 'setupSalary') || !(pl.setupSalary >= 2000 && pl.setupSalary <= 60000)) e.push({ field: 'plan.setupSalary', msg: '推进人月薪需为 2000–60000' });
    }
    if (input && input.gain != null && typeof input.gain !== 'object') e.push({ field: 'gain', msg: '收益端需为对象' });
    return e;
  }

  /* ---------------- 场景解析 ---------------- */
  function findScene(data, sceneId) {
    var found = null;
    Object.keys(data.sectors).forEach(function (k) {
      (data.sectors[k].scenes || []).forEach(function (s) { if (s.id === sceneId) found = s; });
    });
    return found;
  }
  function findIndustry(table, slug) {
    var hit = null;
    (table.sectors || []).forEach(function (s) {
      (s.industries || []).forEach(function (it) { if (it.slug === slug) hit = { sector: s, industry: it }; });
    });
    return hit;
  }
  function sectorOfIndustry(data, industry) {
    var f = findIndustry(data.industries, industry);
    var k = f ? f.sector.key : null;
    return k && data.sectors[k] ? k : 'other';
  }

  /* ---------------- 收益杠杆 ---------------- */
  function hourly(salary, C) {
    return r2(salary * C.work.laborBurden / (C.work.daysPerMonth * C.work.hoursPerDay));
  }

  // 每条杠杆各自算自己的月收益；缺字段就返回 missing，绝不拿默认值顶上
  function leverAmount(key, gain, C, LV) {
    var def = null;
    LV.items.forEach(function (x) { if (x.key === key) def = x; });
    if (!def) return null;
    var need = def.fields.map(function (f) { return f.key; });
    var missing = need.filter(function (k) { return !has(gain, k); });
    if (missing.length) return { key: key, name: def.name, monthly: 0, missing: missing, def: def };
    var m = 0, basis = '';
    if (key === 'hours') {
      var hr = hourly(gain.opsSalary, C);
      m = gain.opsPeople * gain.opsHoursPerDay * def.cut * C.work.daysPerMonth * hr;
      basis = gain.opsPeople + ' 人 × 每天 ' + gain.opsHoursPerDay + ' 小时 × 折减 ' + Math.round(def.cut * 100) + '% × ' + C.work.daysPerMonth + ' 天 × 时薪 ' + hr + ' 元';
    } else if (key === 'error') {
      m = gain.errorFreqMonthly * gain.errorCostPerCase * def.cut;
      basis = '每月 ' + gain.errorFreqMonthly + ' 次 × 单次 ' + r0(gain.errorCostPerCase) + ' 元 × 折减 ' + Math.round(def.cut * 100) + '%';
    } else if (key === 'revenue') {
      m = gain.dealsMonthly * def.cut * gain.dealValue * gain.grossMargin;
      basis = '每月 ' + gain.dealsMonthly + ' 单 × 提升 ' + Math.round(def.cut * 100) + '% × 单均 ' + r0(gain.dealValue) + ' 元 × 毛利率 ' + Math.round(gain.grossMargin * 100) + '%';
    } else if (key === 'margin') {
      m = gain.relatedRevenueMonthly * def.cut;
      basis = '月营业额 ' + r0(gain.relatedRevenueMonthly) + ' 元 × 毛利修正 ' + r1(def.cut * 100) + ' 个百分点';
    } else if (key === 'cash') {
      m = gain.tiedCapital * def.cut * def.rate / 12;
      basis = '占用 ' + r0(gain.tiedCapital) + ' 元 × 下降 ' + Math.round(def.cut * 100) + '% × 年资金成本 ' + Math.round(def.rate * 100) + '% ÷ 12';
    } else if (key === 'spend') {
      m = gain.spendAnnual / 12 * def.cut;
      basis = '年开支 ' + r0(gain.spendAnnual) + ' 元 ÷ 12 × 下降 ' + Math.round(def.cut * 100) + '%';
    } else if (key === 'output') {
      m = gain.lostOutputMonthly * def.cut * gain.grossMargin;
      basis = '每月耽误 ' + r0(gain.lostOutputMonthly) + ' 元产值 × 挽回 ' + Math.round(def.cut * 100) + '% × 毛利率 ' + Math.round(gain.grossMargin * 100) + '%';
    }
    return { key: key, name: def.name, en: def.en, money: def.money, monthly: r0(m), basis: basis, cash: def.cash, cut: def.cut, cutNote: def.cutNote, missing: [], def: def };
  }

  /* ---------------- 主计算 ---------------- */
  function compute(input, data) {
    var errs = validate(input, data);
    if (errs.length) return { ok: false, errors: errs };

    var C = data.constants, LV = data.levers, BM = data.benchmarks, RT = data.reportText;
    var p = input.profile, plan = input.plan, gain = input.gain || {};
    var src = {};                                  // 口径来源
    function mark(k, s) { src[k] = s; }

    // ---- 场景 ----
    var sector = sectorOfIndustry(data, p.industry);
    var scene = plan.sceneId ? findScene(data, plan.sceneId) : null;
    var generic = !scene;
    var sceneView = scene ? {
      id: scene.id, name: scene.name, stage: scene.stage, user: scene.user, replaces: scene.replaces,
      module: scene.module, metric: scene.metric, roiBasis: scene.roiBasis, weeks: scene.weeks,
      cost: scene.cost, value: scene.value, dataDeps: scene.dataDeps || [], firstStep: scene.firstStep, precondition: scene.precondition
    } : {
      id: null, name: '通用轻量场景', stage: '通用', user: '业务岗', replaces: '手工整理与查找',
      module: 'AI流程提效', metric: '', roiBasis: '按沟通与查找工时下降折算', weeks: 4,
      cost: '轻', value: 3, dataDeps: [], firstStep: '先把这件事目前的做法写下来，标出最花时间的一步', precondition: ''
    };
    var levers = (scene && data.sceneLevers.map[scene.id]) || ['hours'];

    // ---- 第一笔账：投入 ----
    var priceOf = {};
    C.prices.subscription.forEach(function (t) { priceOf[t.key] = t; });
    var tier = priceOf[plan.tier];
    var subYear = tier.yearly * plan.seats;
    var diagnosis = plan.diagnosisDays * C.prices.diagnosisPerDay;
    var pd = null;
    if (has(plan, 'privateDeploy')) C.prices.privateDeploy.forEach(function (x) { if (x.key === plan.privateDeploy) pd = x; });
    var pdYear = pd ? pd.yearly * plan.seats : 0;
    var custom = has(plan, 'customBudget') ? r0(plan.customBudget) : 0;
    if (!has(plan, 'customBudget')) mark('customBudget', 'default');

    var dsMult = BM.setupWeeksBuffer.values[plan.dataState] || BM.setupWeeksBuffer.fallback;
    if (!has(plan, 'dataState')) mark('dataState', 'default');
    var setupWeeks = r1(sceneView.weeks * dsMult);
    var setupHours = r0(setupWeeks * 5 * 2 * plan.setupPeople);          // 上线期每人每天约 2 小时
    var setupHourly = hourly(plan.setupSalary, C);
    var setupLabor = r0(setupHours * setupHourly);
    var runHoursMonthly = r0(4 * plan.setupPeople);                       // 上线后每月维护约 4 小时/人
    var runLaborMonthly = r0(runHoursMonthly * setupHourly);

    var cashItems = [];
    cashItems.push({ key: 'sub', name: tier.name + '订阅', detail: (tier.yearly ? tier.yearly + ' 元 / 套年 × ' + plan.seats + ' 套' : '0 元开通，按次消耗积分'), amount: subYear, yearly: true });
    if (diagnosis) cashItems.push({ key: 'diag', name: C.prices.diagnosisName, detail: C.prices.diagnosisPerDay + ' 元 × ' + plan.diagnosisDays + ' 天', amount: diagnosis, yearly: false });
    if (pdYear) cashItems.push({ key: 'pd', name: pd.name, detail: pd.yearly + ' 元 / 套年 × ' + plan.seats + ' 套', amount: pdYear, yearly: true });
    if (custom) cashItems.push({ key: 'custom', name: '另议项（系统对接 / 定制 / 陪跑）', detail: '按贵司填写的预算计入', amount: custom, yearly: false });
    var cashOnce = sum(cashItems.filter(function (x) { return !x.yearly; }).map(function (x) { return x.amount; }));
    var cashYearly = sum(cashItems.filter(function (x) { return x.yearly; }).map(function (x) { return x.amount; }));
    var cashYear1 = cashOnce + cashYearly;

    var laborItems = [
      { key: 'setup', name: '上线期内部工时投入', detail: plan.setupPeople + ' 人 × 约 ' + setupWeeks + ' 周 × 每天 2 小时', hours: setupHours, amount: setupLabor },
      { key: 'run', name: '上线后每月维护工时', detail: plan.setupPeople + ' 人 × 每月 4 小时', hours: runHoursMonthly, amount: runLaborMonthly, monthly: true }
    ];
    var laborYear1 = setupLabor + runLaborMonthly * 12;

    var invest = {
      cashItems: cashItems, cashOnce: cashOnce, cashYearly: cashYearly, cashYear1: cashYear1,
      laborItems: laborItems, laborYear1: laborYear1, setupHours: setupHours, setupHourly: setupHourly,
      setupWeeks: setupWeeks, dataStateMult: dsMult, runLaborMonthly: runLaborMonthly,
      tierName: tier.name, seats: plan.seats,
      total12: cashYear1, totalNote: '回收期按现金口径测算；内部工时投入单列，不参与回收期计算'
    };

    // ---- 第二笔账：收益 ----
    // 参考值只补两项，且只在该项不是主杠杆核心量时
    var g = {};
    Object.keys(gain).forEach(function (k) { if (has(gain, k)) { g[k] = gain[k]; mark(k, 'user'); } });
    if (levers.indexOf('hours') >= 0 && !has(g, 'opsSalary')) {
      g.opsSalary = BM.opsSalary.values[p.size] || BM.opsSalary.fallback; mark('opsSalary', 'profile');
    }
    var needMargin = levers.some(function (k) { return k === 'revenue' || k === 'output'; });
    if (needMargin && !has(g, 'grossMargin')) {
      g.grossMargin = BM.grossMargin.values[p.customers] || BM.grossMargin.fallback; mark('grossMargin', 'profile');
    }

    var raw = levers.map(function (k) { return leverAmount(k, g, C, LV); }).filter(Boolean);
    var missing = [];
    raw.forEach(function (x) {
      (x.missing || []).forEach(function (f) {
        var lab = '';
        x.def.fields.forEach(function (ff) { if (ff.key === f) lab = ff.label + (ff.unit ? '（' + ff.unit + '）' : ''); });
        missing.push({ lever: x.key, leverName: x.name, field: f, label: lab, why: '算「' + x.name + '」这一项少不了它' });
      });
    });
    var usable = raw.filter(function (x) { return !x.missing.length && x.monthly > 0; });
    // 按算出的金额从大到小排序 —— 与场景描述的行文顺序无关
    usable.sort(function (a, b) { return (b.monthly - a.monthly) || (LEVER_ORDER.indexOf(a.key) - LEVER_ORDER.indexOf(b.key)); });
    usable.forEach(function (x, i) {
      x.rank = i + 1;
      x.weight = i === 0 ? 1 : C.overlapDiscount;
      x.counted = r0(x.monthly * x.weight);
      x.discounted = i > 0;
    });

    var rawMonthly = sum(usable.map(function (x) { return x.counted; }));
    // 封顶：场景价值折一次 + 年营收 6% 封顶
    var vf = C.caps.valueFactor[String(sceneView.value)] || 1;
    var afterValue = r0(rawMonthly * vf);
    var revenueAnnual = null;
    var REV = { lt5m: 3000000, '5m_20m': 12000000, '20m_100m': 50000000, '100m_500m': 250000000, gt500m: 800000000 };
    if (has(p, 'revenue') && REV[p.revenue] != null) { revenueAnnual = REV[p.revenue]; mark('revenueAnnual', 'profile'); }
    var capMonthly = revenueAnnual ? r0(revenueAnnual * C.caps.revenueShare / 12) : null;
    var capped = capMonthly != null && afterValue > capMonthly;
    var fullMonthly = capped ? capMonthly : afterValue;

    var cashMonthly = 0, hoursMonthly = 0;
    usable.forEach(function (x) {
      var share = rawMonthly > 0 ? x.counted / rawMonthly : 0;
      var part = r0(fullMonthly * share);
      x.final = part;
      if (x.cash) cashMonthly += part; else hoursMonthly += part;
    });
    var benefit = {
      levers: usable.map(function (x) {
        return { key: x.key, name: x.name, en: x.en, money: x.money, monthly: x.monthly, weight: x.weight,
                 discounted: x.discounted, final: x.final, basis: x.basis, cash: x.cash, cut: x.cut, cutNote: x.cutNote, rank: x.rank };
      }),
      rawMonthly: rawMonthly, valueFactor: vf, afterValue: afterValue,
      capMonthly: capMonthly, capped: capped, fullMonthly: fullMonthly,
      cashMonthly: cashMonthly, hoursMonthly: hoursMonthly,
      cashYear1: 0, note: '人工工时节约列为非现金科目，不参与回收期测算'
    };

    // ---- 是否算得准 ----
    var insufficient = usable.length === 0;

    // ---- 第三项：24 期现金流（现金口径）----
    function flowFor(bMul, cMul, withHours) {
      var perMonth = withHours ? (cashMonthly + hoursMonthly) : cashMonthly;
      var rows = [], cum = 0, payMonth = null, reCross = null, wasPos = false;
      for (var m = 1; m <= C.horizonMonths; m++) {
        var bi = m <= C.rampMonths.length ? C.rampMonths[m - 1] : 1;
        var ben = r0(perMonth * bi * bMul);
        var out = 0;
        if (m === 1) out += r0((cashOnce + cashYearly) * cMul);
        else if (m === 13) out += r0(cashYearly * cMul);
        var net = ben - out;
        cum += net;
        rows.push({ m: m, benefit: ben, cost: out, net: net, cum: cum, ramp: r2(bi) });
        if (cum > 0 && payMonth === null) { payMonth = m; wasPos = true; }
        else if (wasPos && cum <= 0 && payMonth !== null && reCross === null && m > payMonth) { reCross = 'down'; }
        else if (reCross === 'down' && cum > 0) { reCross = m; }
      }
      return { rows: rows, payback: payMonth, reCross: typeof reCross === 'number' ? reCross : null, cum12: rows[11].cum, cum24: rows[23].cum };
    }
    var flow = insufficient ? null : flowFor(1, 1, false);        // 现金口径：主数字
    var flowAll = insufficient ? null : flowFor(1, 1, true);       // 综合口径：含工时折算，作第二行

    // 投入基数极小时，投报率会呈现数百个百分点的数值：计算无误，但比率指标已失去参考意义。
    // 照实给出数值，同时标注 meaningful=false，报告改以回收期作为主指标。
    function roiOf(f) {
      if (!f) return null;
      var inv12 = cashYear1, inv24 = cashYear1 + cashYearly;
      var v12 = inv12 > 0 ? r1((f.cum12 / inv12) * 100) : null;
      var meaningful = !(v12 != null && v12 > 500);
      return {
        roi12: v12,
        roi24: inv24 > 0 ? r1((f.cum24 / inv24) * 100) : null,
        inv12: inv12, inv24: inv24,
        meaningful: meaningful,
        note: meaningful ? '' : '本次首年现金投入仅 ' + r0(inv12) + ' 元，比率指标的分母过小，投报率已不具备参考意义，建议以回收期作为主要判断依据。'
      };
    }
    var roi = roiOf(flow);

    // ---- 三档情景 ----
    var scenarios = C.scenarios.map(function (s) {
      var f = insufficient ? null : flowFor(s.benefit, s.cost, false);
      var rr = roiOf(f);
      return { key: s.key, name: s.name, desc: s.desc, benefitMul: s.benefit, costMul: s.cost,
               payback: f ? f.payback : null, cum12: f ? f.cum12 : null, cum24: f ? f.cum24 : null,
               roi12: rr ? rr.roi12 : null, monthlyBenefit: r0(cashMonthly * s.benefit), cashYear1: r0(cashYear1 * s.cost) };
    });

    // ---- 敏感度：逐项 ±20%，看回本月挪几个月 ----
    var sens = [];
    var sensBasis = (flow && flow.payback != null) ? 'cash' : 'all';
    var sensHours = sensBasis === 'all';
    if (!insufficient) {
      var base = sensHours ? (flowAll && flowAll.payback) : flow.payback;
      SENS_ORDER.forEach(function (k) {
        var lo = null, hi = null, label = '', note = '';
        if (k === 'benefitCut') {
          label = '效益折减系数'; note = '工具对该项损失的实际改善幅度';
          lo = flowFor(0.8, 1, sensHours).payback; hi = flowFor(1.2, 1, sensHours).payback;
        } else if (k === 'customBudget') {
          label = '另议项预算'; note = '系统对接与定制开发的实际报价';
          lo = flowCustom(cashOnce - custom + r0(custom * 0.8), null, sensHours);
          hi = flowCustom(cashOnce - custom + r0(custom * 1.2), null, sensHours);
        } else if (k === 'seats') {
          label = '订阅套数'; note = '实际开通使用的账号数量';
          lo = flowCustom(cashOnce, r0(cashYearly * 0.8), sensHours); hi = flowCustom(cashOnce, r0(cashYearly * 1.2), sensHours);
        } else if (k === 'setupCost') {
          label = '上线期一次性支出'; note = '诊断与配置环节的实际发生额';
          lo = flowCustom(r0(cashOnce * 0.8), null, sensHours); hi = flowCustom(r0(cashOnce * 1.2), null, sensHours);
        } else if (k === 'rampSpeed') {
          label = '效益释放节奏'; note = '过渡期达到满额效能所需的期数';
          lo = flowRamp([0.5, 0.85, 1], sensHours); hi = flowRamp([0.2, 0.5, 0.85], sensHours);
        }
        // 算不出回本的那一侧按「超过 24 个月」记，不能当成 0 跨度
        var BEYOND = C.horizonMonths + 1;
        var loV = lo == null ? BEYOND : lo, hiV = hi == null ? BEYOND : hi;
        var spread = Math.abs(hiV - loV);
        sens.push({ key: k, label: label, note: note, low: lo, high: hi,
                    lowText: lo == null ? '超过 ' + C.horizonMonths + ' 个月' : '第 ' + lo + ' 个月',
                    highText: hi == null ? '超过 ' + C.horizonMonths + ' 个月' : '第 ' + hi + ' 个月',
                    base: base, spread: r1(spread) });
      });
      sens.sort(function (a, b) { return (b.spread - a.spread) || (SENS_ORDER.indexOf(a.key) - SENS_ORDER.indexOf(b.key)); });
    }
    function flowCustom(once, yearly, withHours) {
      var per = withHours ? (cashMonthly + hoursMonthly) : cashMonthly;
      var o = once, y = yearly == null ? cashYearly : yearly, cum = 0, pay = null;
      for (var m = 1; m <= C.horizonMonths; m++) {
        var bi = m <= C.rampMonths.length ? C.rampMonths[m - 1] : 1;
        var out = m === 1 ? o + y : (m === 13 ? y : 0);
        cum += r0(per * bi) - out;
        if (cum > 0 && pay === null) pay = m;
      }
      return pay;
    }
    function flowRamp(rp, withHours) {
      var per = withHours ? (cashMonthly + hoursMonthly) : cashMonthly;
      var cum = 0, pay = null;
      for (var m = 1; m <= C.horizonMonths; m++) {
        var bi = m <= rp.length ? rp[m - 1] : 1;
        var out = m === 1 ? cashOnce + cashYearly : (m === 13 ? cashYearly : 0);
        cum += r0(per * bi) - out;
        if (cum > 0 && pay === null) pay = m;
      }
      return pay;
    }

    // ---- 置信度 ----
    var conf = C.confidence.start;
    Object.keys(src).forEach(function (k) {
      if (src[k] === 'default') conf -= C.confidence.penalty.default;
      else if (src[k] === 'profile') conf -= C.confidence.penalty.profile;
    });
    if (!custom && (sceneView.cost === '中' || sceneView.cost === '重')) conf -= C.confidence.penalty.noCustomBudget;
    if (generic) conf -= C.confidence.penalty.genericScene;
    conf = clamp(conf, 0, 100);
    var band = C.confidence.bands.filter(function (b) { return conf >= b.min; })[0];

    // ---- 结论（陈述计算事实，不作承诺）----
    var verdict, headline;
    var pc = flow ? flow.payback : null;
    var pa = flowAll ? flowAll.payback : null;
    var onceShare = Math.round(cashOnce / (cashYear1 || 1) * 100);
    if (insufficient) {
      headline = '收益科目参数不足，本次仅出具投入侧测算';
      verdict = '收益端尚缺 ' + missing.length + ' 项关键参数。' + r0(cashYear1) + ' 元的投入测算已按合同价目逐项计列，可直接用于预算审议；'
        + '回收期需在参数补齐后重新测算。缺口清单及补齐路径见正文。';
    } else if (pc != null) {
      headline = '按本次参数测算，累计净现金流于第 ' + pc + ' 期转正';
      verdict = '首年现金支出 ' + r0(cashYear1) + ' 元，其中一次性支出占 ' + onceShare + '%；'
        + '效益释放满额后月度现金收益 ' + r0(cashMonthly) + ' 元，计入过渡期爬坡后，累计净额于第 ' + pc + ' 期由负转正。'
        + '保守档对应第 ' + (scenarios[0].payback || '24 期以后') + '，为决策建议的基准值。'
        + (hoursMonthly > 0 ? '另有人工工时节约折合 ' + r0(hoursMonthly) + ' 元/月，属非现金科目，未计入上述口径。' : '');
    } else if (pa != null) {
      headline = '本场景效益以人工工时节约为主，现金口径 24 期内不转正';
      verdict = '现金口径月度收益 ' + r0(cashMonthly) + ' 元，24 期累计净额 ' + r0(flow.cum24) + ' 元，期内不转正。'
        + '若将人工工时节约 ' + r0(hoursMonthly) + ' 元/月一并确认，累计净额于第 ' + pa + ' 期转正——'
        + '该口径成立的前提是释放工时被重新配置至产出性岗位，在未发生人员结构调整的情形下不宜作为决策依据。';
    } else {
      headline = '按本次参数测算，24 期内累计净额未转正';
      verdict = '现金口径月度收益 ' + r0(cashMonthly) + ' 元，含非现金科目合计 ' + r0(cashMonthly + hoursMonthly) + ' 元，'
        + '两种口径于测算期内均未转正。主要成因为投入端一次性支出占比达 ' + onceShare + '%。'
        + '建议重新审议另议项预算，或选择投入档位更低的场景优先实施。';
    }

    var keyNumbers = [
      { k: '首年现金支出', v: r0(cashYear1), unit: '元', s: '含订阅与一次性支出' },
      { k: '月度现金收益', v: r0(cashMonthly), unit: '元', s: '效益释放满额后' },
      { k: '回收期', v: pc, unit: '期', s: pc ? '现金口径 · 中性档' : '现金口径 24 期内未转正', wide: true },
      { k: '首年累计净额', v: flow ? r0(flow.cum12) : null, unit: '元', s: '现金口径，第 12 期末' },
      { k: '含非现金口径', v: pa, unit: '期', s: pa ? '并计人工工时节约' : '该口径亦未转正' },
      { k: '非现金效益', v: r0(hoursMonthly), unit: '元/月', s: '人工工时节约，不计入回收期' },
      { k: '参数可信度', v: conf, unit: '分', s: band.name }
    ];

    var quickView = [
      { q: '投入总额', a: r0(cashYear1) + ' 元',
        text: '首年现金支出，' + invest.tierName + ' ' + plan.seats + ' 套' + (custom ? '，含另议项 ' + custom + ' 元' : '，未计列另议项') + '；次年起续费 ' + cashYearly + ' 元。' },
      { q: '投入结构', a: cashItems[0].name,
        text: cashItems.map(function (x) { return x.name + ' ' + x.amount + ' 元'; }).join('；') + '。一次性支出占比 ' + onceShare + '%。' },
      { q: '效益来源', a: usable.length ? usable[0].name : '参数不足',
        text: usable.length ? '本场景命中 ' + usable.length + ' 项效益杠杆：' + usable.map(function (x) { return x.name; }).join('、') + '；折算口径为「' + sceneView.roiBasis + '」。' : '收益科目关键参数未填报，无法建模。' },
      { q: '月度收益', a: r0(cashMonthly) + ' 元',
        text: '现金口径，效益释放满额后。' + (hoursMonthly > 0 ? '另有非现金科目 ' + r0(hoursMonthly) + ' 元/月未计入。' : '本场景无非现金科目。') },
      { q: '回收期', a: pc ? '第 ' + pc + ' 期' : (pa ? '第 ' + pa + ' 期（含非现金）' : '期内未转正'),
        text: pc ? '现金口径，中性档；保守档第 ' + (scenarios[0].payback || '24 期以后') + '。' : (pa ? '现金口径 24 期内不转正；并计人工工时节约后为第 ' + pa + ' 期。' : '两种口径于 24 期测算期内均未转正。') },
      { q: '参数可信度', a: band.name + '（' + conf + ' 分）', text: band.desc }
    ];
    var roles = RT.roles.items.map(function (x) { return { key: x.key, name: x.name, who: x.who, duty: x.duty, time: x.time }; });
    var retrigger = RT.retrigger.items.map(function (x) { return { when: x.when, why: x.why }; });

    return {
      ok: true,
      meta: { module: MODULE_NAME, credits: CREDITS, version: VERSION, horizon: C.horizonMonths },
      profile: p,
      scene: sceneView, sceneBasis: generic ? 'generic' : 'library', sector: sector,
      levers: levers,
      plan: { tier: plan.tier, tierName: tier.name, seats: plan.seats, diagnosisDays: plan.diagnosisDays,
              privateDeploy: plan.privateDeploy || null, customBudget: custom, dataState: plan.dataState || null,
              setupPeople: plan.setupPeople, setupSalary: plan.setupSalary },
      invest: invest,
      benefit: benefit,
      flow: flow ? flow.rows : [],
      flowAll: flowAll ? flowAll.rows : [],
      payback: pc,
      paybackAll: pa,
      paybackBasis: pc != null ? 'cash' : (pa != null ? 'hours' : 'none'),
      sensitivityBasis: sensBasis,
      reCross: flow ? flow.reCross : null,
      roi: roi,
      scenarios: scenarios,
      sensitivity: sens,
      missing: missing,
      insufficient: insufficient,
      inputSource: src,
      confidence: { score: conf, band: band.key, name: band.name, desc: band.desc },
      capped: capped, capMonthly: capMonthly, revenueAnnual: revenueAnnual,
      keyNumbers: keyNumbers, quickView: quickView,
      verdict: { headline: headline, text: verdict },
      roles: roles, retrigger: retrigger,
      summaryText: verdict,
      render: [
        { type: 'three-accounts', source: 'keyNumbers' },
        { type: 'cost-ledger', source: 'invest' },
        { type: 'benefit-ledger', source: 'benefit' },
        { type: 'cashflow-bars', source: 'flow' },
        { type: 'payback-curve', source: 'flow' },
        { type: 'scenario-band', source: 'scenarios' },
        { type: 'tornado', source: 'sensitivity' },
        { type: 'roles', source: 'roles' }
      ]
    };
  }

  function buildPrompt(out, tpl) {
    return tpl.replace('{verdict}', out.verdict.headline)
      .replace('{costLine}', out.quickView[0].text)
      .replace('{gainLine}', out.quickView[2].text);
  }
  function mergePolish(out, polished) {
    if (!polished) return out;
    if (polished.verdict) out.verdict.headline = polished.verdict;
    return out;
  }

  return { VERSION: VERSION, MODULE_NAME: MODULE_NAME, CREDITS: CREDITS, LEVER_ORDER: LEVER_ORDER, validate: validate, compute: compute, buildPrompt: buildPrompt, mergePolish: mergePolish };
});
