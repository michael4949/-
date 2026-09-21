/*
 * 企业AI投入ROI测算器 · 内核
 * 输入：企业画像 + 拟实施的场景组合（可多选，每个场景各带自己的收益参数）+ 投入方案
 * 计算：企业级三个科目 —— 投入归集 / 收益合并 / 24 期现金流与回收期
 *       另出实施波次、逐场景贡献、三档情景、敏感度、口径来源与置信度
 * 测算单元是企业一次立项的整批场景，不是单个场景。组合与单场景相加的差别有五处：
 *   账号跨场景复用、系统接口只对接一次、配置能力可复用、诊断与数据整理只做一次、
 *   同类效益杠杆跨场景去重。逐项都在报告里单列，可追溯。
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

  var VERSION = '2.1.1';
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
      if (has(pl, 'seats') && !(pl.seats >= 1 && pl.seats <= 60)) e.push({ field: 'plan.seats', msg: '套数需为 1–60' });
      if (has(pl, 'diagnosisDays') && !(pl.diagnosisDays >= 0 && pl.diagnosisDays <= 5)) e.push({ field: 'plan.diagnosisDays', msg: '入企诊断天数需为 0–5' });
      if (has(pl, 'privateDeploy')) {
        var pk = data.constants.prices.privateDeploy.map(function (x) { return x.key; });
        if (pk.indexOf(pl.privateDeploy) < 0) e.push({ field: 'plan.privateDeploy', msg: '私域部署需为 ' + pk.join(' / ') + '，DM 口径只有这两个锚点' });
      }
      if (has(pl, 'customBudget') && pl.customBudget < 0) e.push({ field: 'plan.customBudget', msg: '另议项预算不能为负' });
      if (!has(pl, 'setupPeople') || !(pl.setupPeople >= 1 && pl.setupPeople <= 10)) e.push({ field: 'plan.setupPeople', msg: '推进人数需为 1–10' });
      if (!has(pl, 'setupSalary') || !(pl.setupSalary >= 2000 && pl.setupSalary <= 60000)) e.push({ field: 'plan.setupSalary', msg: '推进人月薪需为 2000–60000' });
      if (has(pl, 'waveSize') && !(pl.waveSize >= 1 && pl.waveSize <= 6)) e.push({ field: 'plan.waveSize', msg: '每批场景数需为 1–6' });
    }
    var sc = (input && input.scenes) || null;
    if (sc != null) {
      if (!Array.isArray(sc)) e.push({ field: 'scenes', msg: '场景组合需为数组' });
      else {
        if (sc.length > 12) e.push({ field: 'scenes', msg: '单次测算最多 12 个场景；超出时建议分两次立项' });
        sc.forEach(function (x, i) {
          if (!x || typeof x !== 'object') { e.push({ field: 'scenes[' + i + ']', msg: '场景条目需为对象' }); return; }
          if (has(x, 'sceneId') && !findScene(data, x.sceneId)) e.push({ field: 'scenes[' + i + '].sceneId', msg: '场景「' + x.sceneId + '」不在场景库内' });
          if (x.gain != null && typeof x.gain !== 'object') e.push({ field: 'scenes[' + i + '].gain', msg: '收益参数需为对象' });
        });
        var ids = sc.map(function (x) { return x && x.sceneId; }).filter(Boolean);
        if (ids.length !== ids.filter(function (v, i) { return ids.indexOf(v) === i; }).length) e.push({ field: 'scenes', msg: '场景不可重复选择' });
      }
    }
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

    var C = data.constants, LV = data.levers, BM = data.benchmarks, RT = data.reportText, IP = data.investmentProfile;
    var p = input.profile, plan = input.plan;
    var src = {};
    function mark(k, s) { src[k] = s; }

    var sector = sectorOfIndustry(data, p.industry);
    var szKey = has(p, 'size') ? p.size : null;

    // ---- 企业营收：投入核验与收益封顶两处都要用 ----
    var revenueAnnual = null;
    var REV = { lt5m: 3000000, '5m_20m': 12000000, '20m_100m': 50000000, '100m_500m': 250000000, gt500m: 800000000 };
    if (has(p, 'revenue') && REV[p.revenue] != null) { revenueAnnual = REV[p.revenue]; mark('revenueAnnual', 'profile'); }

    // ================= 一、场景组合 =================
    // 本模块测算的是企业一次立项的整批场景，不是单个场景。
    // 组合带来的差别有三处：账号跨场景复用、系统接口只对接一次、配置能力可复用。
    var GENERIC = {
      id: null, name: '通用轻量场景', stage: '通用', user: '业务岗', replaces: '手工整理与查找',
      module: 'AI流程提效', metric: '', roiBasis: '按沟通与查找工时下降折算', weeks: 4,
      cost: '轻', value: 3, dataDeps: [], firstStep: '先把这件事目前的做法写下来，标出最花时间的一步', precondition: ''
    };
    var picked = (input.scenes || []).filter(function (x) { return x && has(x, 'sceneId'); });
    var generic = picked.length === 0;
    var rawScenes = generic
      ? [{ def: GENERIC, gain: (input.scenes && input.scenes[0] && input.scenes[0].gain) || {}, levers: ['hours'] }]
      : picked.map(function (x) {
        var s = findScene(data, x.sceneId);
        var def = s ? {
          id: s.id, name: s.name, stage: s.stage, user: s.user, replaces: s.replaces, module: s.module,
          metric: s.metric, roiBasis: s.roiBasis, weeks: s.weeks, cost: s.cost, value: s.value,
          dataDeps: s.dataDeps || [], firstStep: s.firstStep, precondition: s.precondition
        } : GENERIC;
        return { def: def, gain: x.gain || {}, levers: (s && data.sceneLevers.map[s.id]) || ['hours'] };
      });

    // 实施顺序：价值分级降序、上线周期升序。价值高、见效快的先上，让前面的场景替后面的承担投入。
    var ordered = rawScenes.slice().sort(function (a, b) {
      return (b.def.value - a.def.value) || (a.def.weeks - b.def.weeks) || String(a.def.id).localeCompare(String(b.def.id));
    });
    var dsMult = BM.setupWeeksBuffer.values[plan.dataState] || BM.setupWeeksBuffer.fallback;
    if (!has(plan, 'dataState')) mark('dataState', 'default');
    var waveSize = has(plan, 'waveSize') ? plan.waveSize : IP.waveSize.value;
    // waveSize 是实施节奏的选择，不是一项待补齐的企业数据，故不计入参数来源与可信度

    var waves = [], accWeek = 0;
    for (var wi = 0; wi < ordered.length; wi += waveSize) {
      var group = ordered.slice(wi, wi + waveSize);
      var wWeeks = r1(Math.max.apply(null, group.map(function (x) { return x.def.weeks; })) * dsMult);
      var startWeek = r1(accWeek);
      accWeek = r1(accWeek + wWeeks);
      var startMonth = Math.max(1, Math.ceil(accWeek / 4.345));   // 该批完成后的当期起算效益
      waves.push({ no: waves.length + 1, weeks: wWeeks, startWeek: startWeek, endWeek: accWeek,
                   startMonth: startMonth, sceneIds: group.map(function (x) { return x.def.id; }),
                   sceneNames: group.map(function (x) { return x.def.name; }) });
      group.forEach(function (x) { x.wave = waves.length; x.startMonth = startMonth; });
    }
    var totalWeeks = r1(accWeek);

    // ================= 二、投入（企业级归集） =================
    var priceOf = {};
    C.prices.subscription.forEach(function (t) { priceOf[t.key] = t; });
    var tier = priceOf[plan.tier];

    // 账号数：一个账号可用全部已开通场景，故按覆盖人数最多的场景全额 + 其余按复用系数
    function seatsOfScene(def) {
      var row = (szKey && IP.seats.values[szKey]) || IP.seats.fallback;
      return row[def.cost] || row['中'] || 6;
    }
    var seatList = ordered.map(function (x) { return { name: x.def.name, seats: seatsOfScene(x.def) }; })
      .sort(function (a, b) { return b.seats - a.seats; });
    var seatOv = IP.seatOverlap.value;
    var seatsRef = Math.max(1, Math.ceil(seatList[0].seats + sum(seatList.slice(1).map(function (x) { return x.seats; })) * seatOv));
    var seats = has(plan, 'seats') ? plan.seats : seatsRef;
    mark('seats', has(plan, 'seats') ? 'user' : 'benchmark');
    var subYear = tier.yearly * seats;

    // 诊断天数按场景数量分档：诊断覆盖整批场景，不按场景逐个计列
    var nS = ordered.length;
    var diagKey = nS <= 2 ? '1_2' : (nS <= 5 ? '3_5' : '6_plus');
    var diagDays = has(plan, 'diagnosisDays') ? plan.diagnosisDays
      : (IP.diagnosisDays.values[diagKey] != null ? IP.diagnosisDays.values[diagKey] : IP.diagnosisDays.fallback);
    mark('diagnosisDays', has(plan, 'diagnosisDays') ? 'user' : 'benchmark');
    var diagnosis = diagDays * C.prices.diagnosisPerDay;

    var pd = null;
    if (has(plan, 'privateDeploy')) C.prices.privateDeploy.forEach(function (x) { if (x.key === plan.privateDeploy) pd = x; });
    var pdYear = pd ? pd.yearly : 0;    // 按一套部署计，不乘账号数：DM 口径为 12800–33800 的区间端点

    // 另议项四科目 —— 多场景的协同效应全部落在这里
    var sysOwned = (p.systems || []).slice();
    var depUnion = [];
    ordered.forEach(function (x) { (x.def.dataDeps || []).forEach(function (d) { if (depUnion.indexOf(d) < 0) depUnion.push(d); }); });
    var hitSystems = depUnion.filter(function (s) { return sysOwned.indexOf(s) >= 0; });
    var intUnit = (szKey && IP.integration.values[szKey]) || IP.integration.fallback;
    var integration = r0(hitSystems.length * intUnit);

    var devFactor = (szKey && IP.customDev.sizeFactor[szKey]) || IP.customDev.fallbackFactor;
    var decay = IP.customDev.reuseDecay;
    var devRanked = ordered.slice().sort(function (a, b) {
      return (IP.customDev.base[b.def.cost] || 0) - (IP.customDev.base[a.def.cost] || 0);
    });
    var devPerScene = devRanked.map(function (x, i) {
      var base = IP.customDev.base[x.def.cost] != null ? IP.customDev.base[x.def.cost] : IP.customDev.base['中'];
      return { id: x.def.id, name: x.def.name, cost: x.def.cost, base: base, rank: i + 1,
               factor: r2(Math.pow(decay, i)), amount: r0(base * devFactor * Math.pow(decay, i)) };
    });
    var customDev = sum(devPerScene.map(function (x) { return x.amount; }));

    var coachUnit = (szKey && IP.coaching.values[szKey]) || IP.coaching.fallback;
    var coaching = r0(totalWeeks * coachUnit);

    var prepBase = (szKey && IP.dataPrep.base[szKey]) || IP.dataPrep.fallbackBase;
    var prepFactor = IP.dataPrep.stateFactor[plan.dataState] != null ? IP.dataPrep.stateFactor[plan.dataState] : IP.dataPrep.fallbackFactor;
    var dataPrep = r0(prepBase * prepFactor);

    var customRef = [
      { key: 'integration', name: '系统对接', amount: integration,
        detail: hitSystems.length ? hitSystems.length + ' 个在用系统接口 × ' + intUnit + ' 元' : '本组合无在用系统依赖',
        basis: '全部 ' + nS + ' 个场景的数据依赖取并集后与企业在用系统求交集，同一系统只对接一次' },
      { key: 'customDev', name: '定制开发与配置', amount: customDev,
        detail: nS + ' 个场景按 ' + devPerScene.map(function (x) { return x.factor; }).join(' / ') + ' 递减计列，规模系数 ' + devFactor,
        basis: '业务规则引擎、表单与报表框架、权限模型可跨场景复用，故按金额降序逐个乘以 ' + decay + ' 的幂' },
      { key: 'coaching', name: '落地陪跑', amount: coaching,
        detail: '总工期 ' + totalWeeks + ' 周 × ' + coachUnit + ' 元 / 周',
        basis: '按分批上线的总工期逐周计列，含配置陪同、使用培训、试运行期问题响应与效益数据复盘' },
      { key: 'dataPrep', name: '历史数据整理', amount: dataPrep,
        detail: '规模基数 ' + prepBase + ' 元 × 数据现状系数 ' + prepFactor,
        basis: '全企业一次性投入，不随场景数量增加：整理的是同一批业务台账' }
    ].filter(function (x) { return x.amount > 0; });
    var customRefTotal = sum(customRef.map(function (x) { return x.amount; }));
    var custom = has(plan, 'customBudget') ? r0(plan.customBudget) : customRefTotal;
    mark('customBudget', has(plan, 'customBudget') ? 'user' : 'benchmark');
    var customScale = customRefTotal > 0 ? custom / customRefTotal : 0;
    var customItems = customRef.map(function (x) {
      return { key: x.key, name: x.name, detail: x.detail, basis: x.basis, refAmount: x.amount, amount: r0(x.amount * customScale) };
    });
    if (customItems.length) {
      var drift = custom - sum(customItems.map(function (x) { return x.amount; }));
      customItems[0].amount = r0(customItems[0].amount + drift);
    }

    var setupHours = r0(totalWeeks * 5 * 2 * plan.setupPeople);
    var setupHourly = hourly(plan.setupSalary, C);
    var setupLabor = r0(setupHours * setupHourly);
    var runHoursMonthly = r0(4 * plan.setupPeople * Math.min(3, Math.max(1, Math.ceil(nS / 2))));
    var runLaborMonthly = r0(runHoursMonthly * setupHourly);

    var cashItems = [];
    cashItems.push({ key: 'sub', name: tier.name + '订阅',
      detail: (tier.yearly ? tier.yearly + ' 元 / 套年 × ' + seats + ' 套（' + nS + ' 个场景共用）' : '0 元开通，按次消耗积分'),
      amount: subYear, yearly: true });
    if (diagnosis) cashItems.push({ key: 'diag', name: C.prices.diagnosisName,
      detail: C.prices.diagnosisPerDay + ' 元 × ' + diagDays + ' 天，覆盖全部 ' + nS + ' 个场景', amount: diagnosis, yearly: false });
    if (pdYear) cashItems.push({ key: 'pd', name: pd.name,
      detail: pd.yearly + ' 元 / 套年，按一套部署计列（区间 ' + C.prices.privateDeploy[0].yearly + ' 至 ' + C.prices.privateDeploy[1].yearly + ' 元，本次取' + (plan.privateDeploy === 'base' ? '下限' : '上限') + '）',
      amount: pdYear, yearly: true });
    if (custom) cashItems.push({ key: 'custom', name: '另议项合计',
      detail: customItems.length ? customItems.length + ' 个科目，明细见逐项表' : '按企业填报预算计列', amount: custom, yearly: false });
    var cashOnce = sum(cashItems.filter(function (x) { return !x.yearly; }).map(function (x) { return x.amount; }));
    var cashYearly = sum(cashItems.filter(function (x) { return x.yearly; }).map(function (x) { return x.amount; }));
    var cashYear1 = cashOnce + cashYearly;

    var laborItems = [
      { key: 'setup', name: '上线期内部工时投入', detail: plan.setupPeople + ' 人 × 总工期 ' + totalWeeks + ' 周 × 每天 2 小时', hours: setupHours, amount: setupLabor },
      { key: 'run', name: '上线后每月维护工时', detail: plan.setupPeople + ' 人 × 每月 ' + r0(runHoursMonthly / plan.setupPeople) + ' 小时（' + nS + ' 个场景）', hours: runHoursMonthly, amount: runLaborMonthly, monthly: true }
    ];
    var laborYear1 = setupLabor + runLaborMonthly * 12;

    // ================= 三、收益（逐场景建模，跨场景去重） =================
    // 两层折减，各有各的理由，缺一个都会把企业级收益算高：
    //   场景内 —— 同一个场景命中多条杠杆时，不同路径指向的往往是同一笔损失；
    //   跨场景 —— 同一类杠杆在多个场景命中时，节约的是同一批人的同一段时间、同一笔返工成本。
    var gAll = {};
    ordered.forEach(function (x) {
      Object.keys(x.gain).forEach(function (k) { if (has(x.gain, k)) { gAll[k] = x.gain[k]; mark(k, 'user'); } });
    });
    var needSalary = ordered.some(function (x) { return x.levers.indexOf('hours') >= 0; });
    var needMargin = ordered.some(function (x) { return x.levers.some(function (k) { return k === 'revenue' || k === 'output'; }); });

    var missing = [];
    ordered.forEach(function (x) {
      var g = {};
      Object.keys(x.gain).forEach(function (k) { if (has(x.gain, k)) g[k] = x.gain[k]; });
      if (x.levers.indexOf('hours') >= 0 && !has(g, 'opsSalary')) {
        g.opsSalary = BM.opsSalary.values[p.size] || BM.opsSalary.fallback;
        if (src.opsSalary !== 'user') mark('opsSalary', 'profile');
      }
      if (x.levers.some(function (k) { return k === 'revenue' || k === 'output'; }) && !has(g, 'grossMargin')) {
        g.grossMargin = BM.grossMargin.values[p.customers] || BM.grossMargin.fallback;
        if (src.grossMargin !== 'user') mark('grossMargin', 'profile');
      }
      var raw = x.levers.map(function (k) { return leverAmount(k, g, C, LV); }).filter(Boolean);
      raw.forEach(function (lv) {
        lv.missing.forEach(function (f) {
          if (!missing.some(function (m) { return m.field === f && m.sceneId === x.def.id; })) {
            var fd = null; lv.def.fields.forEach(function (ff) { if (ff.key === f) fd = ff; });
            missing.push({ sceneId: x.def.id, sceneName: x.def.name, lever: lv.name, field: f,
                           label: fd ? fd.label : f, unit: fd ? fd.unit : '',
                           impact: lv.def.cash ? 'high' : 'mid',
                           how: '向' + (x.def.user || '业务负责人') + '确认后填入' });
          }
        });
      });
      // 场景内：按测算金额降序，最高全额，其余按 overlapDiscount
      var usable = raw.filter(function (lv) { return !lv.missing.length && lv.monthly > 0; })
        .sort(function (a, b) { return (b.monthly - a.monthly) || LEVER_ORDER.indexOf(a.key) - LEVER_ORDER.indexOf(b.key); });
      usable.forEach(function (lv, i) {
        lv.inSceneWeight = i === 0 ? 1 : C.overlapDiscount;
        lv.inScene = r0(lv.monthly * lv.inSceneWeight);
      });
      x.vf = C.caps.valueFactor[String(x.def.value)] || 1;
      usable.forEach(function (lv) { lv.afterValue = r0(lv.inScene * x.vf); });
      x.levItems = usable;
      x.rawMonthly = sum(usable.map(function (lv) { return lv.inScene; }));
      x.afterValue = sum(usable.map(function (lv) { return lv.afterValue; }));
      x.noData = usable.length === 0;
    });

    // 跨场景：同一杠杆在多个场景命中时，按金额降序，最高全额、其余按 overlapDiscount
    var flat = [];
    ordered.forEach(function (x) {
      x.levItems.forEach(function (lv) {
        flat.push({ sceneId: x.def.id, sceneName: x.def.name, key: lv.key, name: lv.name, cash: lv.cash,
                    cut: lv.cut, cutNote: lv.cutNote, basis: lv.basis, money: lv.money,
                    monthly: lv.monthly, inSceneWeight: lv.inSceneWeight, inScene: lv.inScene,
                    valueFactor: x.vf, afterValue: lv.afterValue });
      });
    });
    var groups = [];
    LEVER_ORDER.forEach(function (k) {
      var items = flat.filter(function (f) { return f.key === k; })
        .sort(function (a, b) { return b.afterValue - a.afterValue; });
      if (!items.length) return;
      items.forEach(function (f, i) {
        f.crossWeight = i === 0 ? 1 : C.overlapDiscount;
        f.counted = r0(f.afterValue * f.crossWeight);
      });
      groups.push({ key: k, name: items[0].name, cash: items[0].cash, scenes: items.length,
                    gross: sum(items.map(function (f) { return f.afterValue; })),
                    counted: sum(items.map(function (f) { return f.counted; })),
                    items: items.map(function (f) {
                      return { sceneId: f.sceneId, sceneName: f.sceneName, afterValue: f.afterValue,
                               crossWeight: f.crossWeight, counted: f.counted };
                    }) });
    });
    var rawMonthly = sum(flat.map(function (f) { return f.afterValue; }));
    var afterCross = sum(flat.map(function (f) { return f.counted; }));

    var capMonthly = revenueAnnual ? r0(revenueAnnual * C.caps.revenueShare / 12) : null;
    var capped = capMonthly != null && afterCross > capMonthly;
    var fullMonthly = capped ? capMonthly : afterCross;
    var capScale = afterCross > 0 ? fullMonthly / afterCross : 0;

    flat.forEach(function (f) { f.final = r0(f.counted * capScale); });
    var cashMonthly = sum(flat.filter(function (f) { return f.cash; }).map(function (f) { return f.final; }));
    var hoursMonthly = sum(flat.filter(function (f) { return !f.cash; }).map(function (f) { return f.final; }));

    // 逐场景的最终贡献（封顶后）
    ordered.forEach(function (x) {
      var mine = flat.filter(function (f) { return f.sceneId === x.def.id; });
      x.cashMonthly = sum(mine.filter(function (f) { return f.cash; }).map(function (f) { return f.final; }));
      x.hoursMonthly = sum(mine.filter(function (f) { return !f.cash; }).map(function (f) { return f.final; }));
      x.finalMonthly = x.cashMonthly + x.hoursMonthly;
    });

    var insufficient = flat.length === 0;

    // ================= 四、24 期现金流（企业级，逐场景按自己的上线波次爬坡） =================
    function flowFor(bMul, cMul, withHours) {
      var rows = [], cum = 0, payMonth = null, reCross = null, wasPos = false;
      for (var m = 1; m <= C.horizonMonths; m++) {
        var ben = 0;
        ordered.forEach(function (x) {
          if (m < x.startMonth) return;
          var age = m - x.startMonth + 1;
          var bi = age <= C.rampMonths.length ? C.rampMonths[age - 1] : 1;
          var per = withHours ? (x.cashMonthly + x.hoursMonthly) : x.cashMonthly;
          ben += per * bi * bMul;
        });
        ben = r0(ben);
        var out = 0;
        if (m === 1) out += r0((cashOnce + cashYearly) * cMul);
        else if (m === 13) out += r0(cashYearly * cMul);
        var net = ben - out;
        cum += net;
        // ramp 在组合口径下是「已上线场景的加权释放比例」：当期收益 ÷ 全部场景满额收益
        var fullAll = sum(ordered.map(function (x) { return withHours ? (x.cashMonthly + x.hoursMonthly) : x.cashMonthly; })) * bMul;
        rows.push({ m: m, benefit: ben, cost: out, net: net, cum: cum,
                    ramp: fullAll > 0 ? r2(ben / fullAll) : 0,
                    live: ordered.filter(function (x) { return m >= x.startMonth; }).length });
        if (cum > 0 && payMonth === null) { payMonth = m; wasPos = true; }
        else if (wasPos && cum <= 0 && payMonth !== null && reCross === null && m > payMonth) { reCross = 'down'; }
        else if (reCross === 'down' && cum > 0) { reCross = m; }
      }
      return { rows: rows, payback: payMonth, reCross: typeof reCross === 'number' ? reCross : null, cum12: rows[11].cum, cum24: rows[23].cum };
    }
    var flow = insufficient ? null : flowFor(1, 1, false);
    var flowAll = insufficient ? null : flowFor(1, 1, true);

    function roiOf(f) {
      if (!f) return null;
      var inv12 = cashYear1, inv24 = cashYear1 + cashYearly;
      var v12 = inv12 > 0 ? r1((f.cum12 / inv12) * 100) : null;
      var meaningful = v12 != null && v12 <= 500;
      return {
        roi12: v12, roi24: inv24 > 0 ? r1((f.cum24 / inv24) * 100) : null,
        inv12: inv12, inv24: inv24, meaningful: meaningful,
        note: meaningful ? ''
          : (v12 == null
            ? '本次首年现金投入为 0 元，投报率的分母不成立，该指标不予出具，请以回收期与累计净额作为判断依据。'
            : '本次首年现金投入仅 ' + r0(inv12) + ' 元，比率指标的分母过小，投报率已不具备参考意义，建议以回收期作为主要判断依据。')
      };
    }
    var roi = roiOf(flow);

    var scenarios = C.scenarios.map(function (s) {
      var f = insufficient ? null : flowFor(s.benefit, s.cost, false);
      var rr = roiOf(f);
      return { key: s.key, name: s.name, desc: s.desc, benefitMul: s.benefit, costMul: s.cost,
               payback: f ? f.payback : null, cum12: f ? f.cum12 : null, cum24: f ? f.cum24 : null,
               roi12: rr ? rr.roi12 : null, monthlyBenefit: r0(cashMonthly * s.benefit), cashYear1: r0(cashYear1 * s.cost) };
    });

    // ================= 五、敏感度：逐项 ±20%，看转正期次挪几期 =================
    var sensHours = flow == null && flowAll != null;
    function flowCustom(once2, yearly2, bMul) {
      var o2 = once2 == null ? cashOnce : once2, y2 = yearly2 == null ? cashYearly : yearly2;
      var rows = [], cum = 0, pay = null;
      for (var m = 1; m <= C.horizonMonths; m++) {
        var ben = 0;
        ordered.forEach(function (x) {
          if (m < x.startMonth) return;
          var age = m - x.startMonth + 1;
          var bi = age <= C.rampMonths.length ? C.rampMonths[age - 1] : 1;
          var per = sensHours ? (x.cashMonthly + x.hoursMonthly) : x.cashMonthly;
          ben += per * bi * (bMul == null ? 1 : bMul);
        });
        var out = m === 1 ? o2 + y2 : (m === 13 ? y2 : 0);
        cum += r0(ben) - out;
        rows.push(cum);
        if (cum > 0 && pay === null) pay = m;
      }
      return pay;
    }
    function flowRamp(shift) {
      var rows = [], cum = 0, pay = null;
      for (var m = 1; m <= C.horizonMonths; m++) {
        var ben = 0;
        ordered.forEach(function (x) {
          var st = Math.max(1, x.startMonth + shift);
          if (m < st) return;
          var age = m - st + 1;
          var bi = age <= C.rampMonths.length ? C.rampMonths[age - 1] : 1;
          var per = sensHours ? (x.cashMonthly + x.hoursMonthly) : x.cashMonthly;
          ben += per * bi;
        });
        var out = m === 1 ? cashOnce + cashYearly : (m === 13 ? cashYearly : 0);
        cum += r0(ben) - out;
        if (cum > 0 && pay === null) pay = m;
      }
      return pay;
    }
    var baseline = flow ? flow.payback : (flowAll ? flowAll.payback : null);
    var sensitivity = insufficient ? [] : SENS_ORDER.map(function (k) {
      var lo = null, hi = null, label = '', note = '';
      if (k === 'benefitCut') {
        label = '效益折减系数'; note = '工具对各项损失的实际改善幅度';
        lo = flowCustom(null, null, 0.8); hi = flowCustom(null, null, 1.2);
      } else if (k === 'customBudget') {
        label = '另议项预算'; note = '系统对接与定制开发的实际报价';
        lo = flowCustom(cashOnce - custom + r0(custom * 1.2), null, null);
        hi = flowCustom(cashOnce - custom + r0(custom * 0.8), null, null);
      } else if (k === 'seats') {
        label = '订阅账号数'; note = '实际开通使用的账号数量';
        lo = flowCustom(cashOnce, r0(cashYearly + tier.yearly * Math.round(seats * 0.2)), null);
        hi = flowCustom(cashOnce, r0(cashYearly - tier.yearly * Math.round(seats * 0.2)), null);
      } else if (k === 'setupCost') {
        label = '上线期一次性支出'; note = '诊断与配置环节的实际发生额';
        lo = flowCustom(r0(cashOnce * 1.2), null, null); hi = flowCustom(r0(cashOnce * 0.8), null, null);
      } else if (k === 'rampSpeed') {
        label = '上线节奏'; note = '各批场景的实际上线时点';
        lo = flowRamp(1); hi = flowRamp(-1);
      }
      var H = C.horizonMonths + 1;
      var a = lo == null ? H : lo, b2 = hi == null ? H : hi;
      return { key: k, label: label, note: note, low: lo, high: hi,
               lowText: lo == null ? '期内未转正' : '第 ' + lo + ' 个月', highText: hi == null ? '期内未转正' : '第 ' + hi + ' 个月',
               base: baseline, spread: Math.abs(a - b2) };
    });

    // ================= 六、置信度 =================
    var conf = C.confidence.start;
    var refKeys = Object.keys(src).filter(function (k) { return src[k] === 'profile' || src[k] === 'benchmark'; });
    refKeys.forEach(function (k) { conf -= (src[k] === 'profile' ? C.confidence.penalty.profile : C.confidence.penalty['default']) / 2; });
    if (!has(plan, 'customBudget')) conf -= C.confidence.penalty.noCustomBudget / 2;
    if (generic) conf -= C.confidence.penalty.genericScene;
    missing.forEach(function () { conf -= C.confidence.penalty['default']; });
    conf = clamp(r0(conf), 0, 100);
    var band = C.confidence.bands.filter(function (b3) { return conf >= b3.min; })[0];

    // ================= 七、投入合理性核验（企业级） =================
    var shareBand = IP.revenueShare;
    var revShare = revenueAnnual ? cashYear1 / revenueAnnual : null;
    var shareVerdict = revShare == null ? 'unknown'
      : (revShare < shareBand.low ? 'low' : (revShare > shareBand.high ? 'high' : 'in'));
    var shareText = revShare == null
      ? '企业营业收入区间未知，本项核验未启用。'
      : (shareVerdict === 'in'
        ? '本次 ' + nS + ' 个场景的首年现金支出合计占营业收入 ' + r2(revShare * 100) + '%，落在企业级常见区间 '
          + r2(shareBand.low * 100) + '% 至 ' + r2(shareBand.high * 100) + '% 之内，投入总额与企业体量匹配。'
        : (shareVerdict === 'low'
          ? '首年现金支出占营业收入 ' + r2(revShare * 100) + '%，低于企业级常见区间下限 ' + r2(shareBand.low * 100)
            + '%。该情形通常意味着系统对接或落地陪跑未计列，或本次场景组合偏小，据此得出的回收期会系统性偏短。'
          : '首年现金支出占营业收入 ' + r2(revShare * 100) + '%，高于企业级常见区间上限 ' + r2(shareBand.high * 100)
            + '%。建议减少首批场景数量，把价值分级较低的场景放到第二批，分两次立项。'));

    var onceShare = r0(cashOnce / (cashYear1 || 1) * 100);

    // ================= 八、结论（陈述计算事实，不作承诺） =================
    var pc = flow ? flow.payback : null, pa = flowAll ? flowAll.payback : null;
    var headline, verdict;
    var sceneNames = ordered.map(function (x) { return x.def.name; }).join('、');
    if (insufficient) {
      headline = '收益端关键参数缺失，本次仅出具投入侧测算';
      verdict = '本次拟实施 ' + nS + ' 个场景，首年现金支出 ' + r0(cashYear1) + ' 元。'
        + '收益端尚缺 ' + missing.length + ' 项关键参数，缺口清单见数据缺口一章。'
        + '在参数补齐前不出具回收期结论，投入侧科目与金额不受影响，可直接用于预算编制。';
    } else if (pc != null) {
      headline = '按本次参数测算，' + nS + ' 个场景合计的累计净现金流于第 ' + pc + ' 期转正';
      verdict = '本次组合含 ' + sceneNames + '，分 ' + waves.length + ' 批上线，总工期 ' + totalWeeks + ' 周。'
        + '首年现金支出 ' + r0(cashYear1) + ' 元，其中一次性支出占 ' + onceShare + '%；'
        + '全部场景效益释放满额后月度现金收益合计 ' + r0(cashMonthly) + ' 元，计入分批上线与过渡期爬坡后，累计净额于第 ' + pc + ' 期由负转正。'
        + '保守档对应第 ' + (scenarios[0].payback || (C.horizonMonths + ' 期以后')) + '，为决策建议的基准值。'
        + (hoursMonthly > 0 ? '另有人工工时节约折合 ' + r0(hoursMonthly) + ' 元/月，属非现金科目，未计入上述口径。' : '');
    } else if (pa != null) {
      headline = '本组合效益以人工工时节约为主，现金口径 ' + C.horizonMonths + ' 期内不转正';
      verdict = '现金口径月度收益合计 ' + r0(cashMonthly) + ' 元，' + C.horizonMonths + ' 期累计净额 ' + r0(flow.cum24) + ' 元，期内不转正。'
        + '若将人工工时节约 ' + r0(hoursMonthly) + ' 元/月一并确认，累计净额于第 ' + pa + ' 期转正——'
        + '该口径成立的前提是释放工时被重新配置至产出性岗位，在未发生人员结构调整的情形下不宜作为决策依据。'
        + '建议在组合中补入现金效益明确的场景，由其承担投入的回收。';
    } else if (cashMonthly === 0 && hoursMonthly > 0) {
      headline = '本组合不产生可确认的现金效益，不宜按此范围立项';
      verdict = '所选 ' + nS + ' 个场景命中的效益杠杆全部为人工工时节约，折合 ' + r0(hoursMonthly) + ' 元/月，属非现金科目；'
        + '现金口径月度收益为 0，故 ' + C.horizonMonths + ' 期内累计净现金流不可能转正。'
        + '该结论不表示这些场景没有价值，而在于其价值无法在现金口径下确认：'
        + '建议在组合中补入差错与返工损失下降、成交转化提升一类现金效益明确的场景，由其承担投入的回收。';
    } else {
      headline = '按本次参数测算，' + C.horizonMonths + ' 期内累计净额未转正';
      verdict = '现金口径月度收益合计 ' + r0(cashMonthly) + ' 元，含非现金科目 ' + r0(cashMonthly + hoursMonthly) + ' 元，'
        + '两种口径于测算期内均未转正。投入端一次性支出占首年现金支出的 ' + onceShare + '%'
        + (revShare != null ? '，首年现金支出占营业收入 ' + r2(revShare * 100) + '%' : '') + '。'
        + '建议减少首批场景数量，优先实施价值分级最高的 ' + Math.max(1, Math.ceil(nS / 2)) + ' 个，其余放入第二批。';
    }

    // ================= 九、输出 =================
    var keyNumbers = [
      { k: '场景数', v: nS, unit: '个', s: '分 ' + waves.length + ' 批上线，总工期 ' + totalWeeks + ' 周' },
      { k: '首年现金支出', v: r0(cashYear1), unit: '元', s: '含订阅、诊断与一次性支出' },
      { k: '月度现金收益', v: r0(cashMonthly), unit: '元', s: '全部场景满额释放后合计' },
      { k: '回收期', v: pc == null ? null : pc, unit: '期', s: '现金口径 · 中性档', wide: true },
      { k: '首年累计净额', v: flow ? r0(flow.cum12) : null, unit: '元', s: '现金口径，第 12 期末' },
      { k: '非现金效益', v: r0(hoursMonthly), unit: '元/月', s: '人工工时节约，不计入回收期' },
      { k: '参数可信度', v: conf, unit: '分', s: band.name }
    ];
    var topScene = ordered.slice().sort(function (a, b) { return b.cashMonthly - a.cashMonthly; })[0];
    var quickView = [
      { q: '测算范围', a: nS + ' 个场景',
        text: sceneNames + '。按价值分级降序、上线周期升序排出实施顺序，分 ' + waves.length + ' 批推进，总工期 ' + totalWeeks + ' 周。' },
      { q: '投入总额', a: r0(cashYear1) + ' 元',
        text: '首年现金支出，' + tier.name + ' ' + seats + ' 套（' + nS + ' 个场景共用账号）'
          + (custom ? '，含另议项 ' + custom + ' 元' : '，未计列另议项') + '；次年起续费 ' + cashYearly + ' 元。' },
      { q: '投入结构', a: cashItems[0].name,
        text: cashItems.map(function (x) { return x.name + ' ' + x.amount + ' 元'; }).join('；') + '。一次性支出占比 ' + onceShare + '%。' },
      { q: '效益来源', a: topScene ? topScene.def.name : '参数不足',
        text: topScene ? '现金效益贡献最高的是「' + topScene.def.name + '」，月度 ' + r0(topScene.cashMonthly) + ' 元，占全组合的 '
          + (cashMonthly ? r0(topScene.cashMonthly / cashMonthly * 100) : 0) + '%。共命中 ' + groups.length + ' 类效益杠杆。' : '收益端参数尚未填报。' },
      { q: '月度收益', a: r0(cashMonthly) + ' 元',
        text: '现金口径，全部场景满额释放后合计。另有非现金科目 ' + r0(hoursMonthly) + ' 元/月未计入。' },
      { q: '回收期', a: pc == null ? '期内未转正' : '第 ' + pc + ' 期',
        text: '现金口径，中性档' + (scenarios[0].payback ? '；保守档第 ' + scenarios[0].payback + '。' : '；保守档期内未转正。') },
      { q: '参数可信度', a: band.name + '（' + conf + ' 分）', text: band.desc }
    ];

    var out = {
      ok: true,
      meta: { module: MODULE_NAME, credits: CREDITS, version: VERSION, horizon: C.horizonMonths },
      profile: p,
      portfolio: {
        count: nS, generic: generic, totalWeeks: totalWeeks, waveSize: waveSize,
        waves: waves,
        scenes: ordered.map(function (x) {
          return {
            id: x.def.id, name: x.def.name, stage: x.def.stage, user: x.def.user, replaces: x.def.replaces,
            module: x.def.module, metric: x.def.metric, roiBasis: x.def.roiBasis, weeks: x.def.weeks,
            cost: x.def.cost, value: x.def.value, dataDeps: x.def.dataDeps, firstStep: x.def.firstStep,
            precondition: x.def.precondition, levers: x.levers, wave: x.wave, startMonth: x.startMonth,
            valueFactor: x.vf, rawMonthly: x.rawMonthly, afterValue: x.afterValue,
            cashMonthly: x.cashMonthly, hoursMonthly: x.hoursMonthly, finalMonthly: x.finalMonthly,
            noData: x.noData,
            share: cashMonthly ? r1(x.cashMonthly / cashMonthly * 100) : 0
          };
        }),
        seatDetail: seatList, seatOverlap: seatOv, seatsRef: seatsRef,
        devPerScene: devPerScene, depUnion: depUnion
      },
      sector: sector,
      plan: { tier: plan.tier, tierName: tier.name, seats: seats, diagnosisDays: diagDays,
              privateDeploy: has(plan, 'privateDeploy') ? plan.privateDeploy : null,
              customBudget: custom, dataState: plan.dataState, setupPeople: plan.setupPeople,
              setupSalary: plan.setupSalary, waveSize: waveSize },
      invest: {
        cashItems: cashItems, cashOnce: cashOnce, cashYearly: cashYearly, cashYear1: cashYear1,
        customItems: customItems, customRefTotal: customRefTotal, customOverridden: has(plan, 'customBudget'),
        laborItems: laborItems, laborYear1: laborYear1, setupHours: setupHours, setupHourly: setupHourly,
        setupWeeks: totalWeeks, dataStateMult: dsMult, dataPrepFactor: prepFactor, runLaborMonthly: runLaborMonthly,
        tierName: tier.name, seats: seats, seatsSource: has(plan, 'seats') ? 'user' : 'benchmark',
        diagnosisDays: diagDays, hitSystems: hitSystems, integrationUnit: intUnit,
        revenueShare: revShare == null ? null : r2(revShare * 100),
        shareBandLow: r2(shareBand.low * 100), shareBandHigh: r2(shareBand.high * 100),
        shareVerdict: shareVerdict, shareText: shareText,
        total12: cashYear1, totalNote: '回收期按现金口径测算；内部工时投入单列，不参与回收期计算'
      },
      benefit: {
        groups: groups, items: flat,
        rawMonthly: r0(rawMonthly), afterCross: r0(afterCross),
        capMonthly: capMonthly, capped: capped, fullMonthly: r0(fullMonthly),
        cashMonthly: r0(cashMonthly), hoursMonthly: r0(hoursMonthly),
        crossDiscount: r0(rawMonthly - afterCross),
        note: '人工工时节约列为非现金科目，不参与回收期测算'
      },
      flow: flow ? flow.rows : [], flowAll: flowAll ? flowAll.rows : [],
      payback: pc, paybackAll: pa,
      paybackBasis: pc != null ? 'cash' : (pa != null ? 'all' : 'none'),
      sensitivityBasis: sensHours ? 'all' : 'cash',
      reCross: flow ? flow.reCross : null,
      roi: roi || { roi12: null, roi24: null, inv12: cashYear1, inv24: cashYear1 + cashYearly, meaningful: false, note: '收益端参数缺失，投报率不予出具。' },
      scenarios: scenarios, sensitivity: sensitivity,
      missing: missing, insufficient: insufficient,
      inputSource: src,
      confidence: { score: conf, band: band.key, name: band.name, desc: band.desc },
      capped: capped, capMonthly: capMonthly, revenueAnnual: revenueAnnual,
      keyNumbers: keyNumbers, quickView: quickView,
      verdict: { headline: headline, text: verdict },
      roles: RT.roles.items, retrigger: RT.retrigger.items,
      summaryText: headline,
      render: [
        { type: 'portfolio', source: 'portfolio' },
        { type: 'three-accounts', source: 'keyNumbers' },
        { type: 'cost-ledger', source: 'invest' },
        { type: 'benefit-ledger', source: 'benefit' },
        { type: 'scene-contribution', source: 'portfolio.scenes' },
        { type: 'wave-gantt', source: 'portfolio.waves' },
        { type: 'cashflow-bars', source: 'flow' },
        { type: 'payback-curve', source: 'flow' },
        { type: 'scenario-band', source: 'scenarios' },
        { type: 'tornado', source: 'sensitivity' },
        { type: 'roles', source: 'roles' }
      ]
    };
    return out;
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
