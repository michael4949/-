/**
 * 财务数据引擎 —— 财务选股 · 财报时光机
 *
 * ══ 这个模块唯一重要的东西：披露日 ══
 *
 * 财务数据和行情数据有个根本区别：**它不是在报告期当天就存在的**。
 * 2023 年年报的报告期末是 2023-12-31，但它要到 2024 年 4 月底才公布。
 * 如果你拿 2023 年报去解释 2024 年 1 月的股价，那是拿一份当时**根本不存在**
 * 的文件在做决策 —— 这是回测里最经典、最隐蔽、也最致命的未来函数。
 * 它不报错、不崩溃，只会让你的策略在历史上表现得好得不真实。
 *
 * 所以这里所有查询都走同一个入口 `visibleAt(code, asOfTs)`，
 * 它只返回 `disclTs <= asOfTs` 的报告。没有第二条路径能绕过它。
 * test/fundamentals.test.js 里有一条断言专门盯这件事。
 *
 * ══ 关于数据来源 ══
 * 当前接的是 tools/gen_demo_data.py 合成的演示数据（带 synthetic 标记）。
 * 接真实数据源时，只要产出同样 schema 的 JSON，这一层一行都不用改。
 */

/** 财报字段顺序，与 gen_demo_data.py 的 REPORT_FIELDS 严格一致 */
export const REPORT_FIELDS = [
  'period', 'endTs', 'disclTs', 'revenue', 'netProfit',
  'equity', 'assets', 'liabilities', 'cashFlow', 'shares',
];

/** 把数组行还原成对象 */
export function toReport(row) {
  const o = {};
  REPORT_FIELDS.forEach((k, i) => { o[k] = row[i]; });
  return o;
}

/**
 * 某一时刻**看得见**的所有报告。
 *
 * 这是整个模块的唯一数据入口。asOfTs 之后才披露的报告一律不返回 ——
 * 不是过滤掉展示，是根本拿不到，让越界在架构上不可能。
 */
export function visibleAt(fund, code, asOfTs = Infinity) {
  const item = fund[code];
  if (!item) return [];
  return item.reports
    .map(toReport)
    .filter(r => r.disclTs <= asOfTs)
    .sort((a, b) => a.endTs - b.endTs);
}

/** 最近一期已披露的报告 */
export function latestAt(fund, code, asOfTs = Infinity) {
  const rs = visibleAt(fund, code, asOfTs);
  return rs.length ? rs[rs.length - 1] : null;
}

/**
 * 计算某时刻的财务指标。
 *
 * TTM（最近四个季度滚动）而不是单季，因为单季受季节性影响太大：
 * 白酒的四季度收入天然比一季度高，拿单季同比会得出一堆假信号。
 */
export function metricsAt(fund, code, asOfTs = Infinity, price = null) {
  const rs = visibleAt(fund, code, asOfTs);
  if (!rs.length) return null;
  const last = rs[rs.length - 1];
  const ttm = rs.slice(-4);
  const ttmRevenue = ttm.reduce((a, r) => a + r.revenue, 0);
  const ttmProfit = ttm.reduce((a, r) => a + r.netProfit, 0);
  const ttmCash = ttm.reduce((a, r) => a + r.cashFlow, 0);

  // 同比：拿去年同期的四季滚动比，需要至少八期
  let revYoY = null, profitYoY = null;
  if (rs.length >= 8) {
    const prev = rs.slice(-8, -4);
    const pRev = prev.reduce((a, r) => a + r.revenue, 0);
    const pProfit = prev.reduce((a, r) => a + r.netProfit, 0);
    if (pRev > 0) revYoY = ttmRevenue / pRev - 1;
    // 由亏转盈或由盈转亏时，同比增速没有意义，返回 null 而不是一个巨大的数
    if (pProfit > 0 && ttmProfit > 0) profitYoY = ttmProfit / pProfit - 1;
  }

  const eps = last.shares > 0 ? ttmProfit / last.shares : null;
  const bps = last.shares > 0 ? last.equity / last.shares : null;

  return {
    code,
    period: last.period,
    endTs: last.endTs,
    disclTs: last.disclTs,
    quarters: rs.length,

    revenue: ttmRevenue,
    netProfit: ttmProfit,
    cashFlow: ttmCash,
    equity: last.equity,
    assets: last.assets,
    liabilities: last.liabilities,
    shares: last.shares,

    roe: last.equity > 0 ? ttmProfit / last.equity : null,
    netMargin: ttmRevenue > 0 ? ttmProfit / ttmRevenue : null,
    debtRatio: last.assets > 0 ? last.liabilities / last.assets : null,
    // 现金流对净利的覆盖：长期低于 1 说明利润没有真金白银支撑
    cashCover: ttmProfit !== 0 ? ttmCash / ttmProfit : null,
    revYoY, profitYoY,
    eps, bps,
    pe: (price != null && eps > 0) ? price / eps : null,
    pb: (price != null && bps > 0) ? price / bps : null,
  };
}

/** 财务选股可用的字段 */
export const FUND_FIELDS = {
  roe:       { label: 'ROE（TTM）', unit: '%', pct: true, better: 'high' },
  netMargin: { label: '净利率', unit: '%', pct: true, better: 'high' },
  revYoY:    { label: '营收同比', unit: '%', pct: true, better: 'high' },
  profitYoY: { label: '净利同比', unit: '%', pct: true, better: 'high' },
  debtRatio: { label: '资产负债率', unit: '%', pct: true, better: 'low' },
  cashCover: { label: '现金流／净利', unit: '倍', pct: false, better: 'high' },
  pe:        { label: '市盈率 PE', unit: '倍', pct: false, better: 'low' },
  pb:        { label: '市净率 PB', unit: '倍', pct: false, better: 'low' },
  netProfit: { label: '净利润（TTM）', unit: '万元', pct: false, better: 'high' },
  revenue:   { label: '营业收入（TTM）', unit: '万元', pct: false, better: 'high' },
};

/**
 * 财务选股。
 *
 * @param asOfTs 选股时点。**必须传**，而且必须严格生效 ——
 *               这是「用当时看得见的报表选股」和「用今天的报表选历史股」的分界线。
 */
export function screenFundamentals(fund, priceOf, rules, asOfTs, opts = {}) {
  const rows = [];
  let skipped = 0;
  for (const code of Object.keys(fund)) {
    const px = priceOf ? priceOf(code, asOfTs) : null;
    const m = metricsAt(fund, code, asOfTs, px);
    if (!m) { skipped++; continue; }
    let pass = true;
    for (const r of rules) {
      const v = m[r.field];
      if (v == null || !Number.isFinite(v)) { pass = false; break; }
      if (r.op === '>=' ? !(v >= r.value) : !(v <= r.value)) { pass = false; break; }
    }
    if (!pass) continue;
    rows.push({ ...m, display: fund[code].display, sector: fund[code].sector, price: px });
  }
  const sortBy = opts.sortBy || 'roe';
  const desc = opts.desc !== false;
  rows.sort((a, b) => {
    const x = a[sortBy] ?? -Infinity, y = b[sortBy] ?? -Infinity;
    return desc ? y - x : x - y;
  });
  return { rows, total: rows.length, skipped, asOfTs, universe: Object.keys(fund).length };
}

/**
 * 财报时光机：回到某一天，只看得见那天之前已经披露的东西。
 *
 * 返回三块：
 *   · asOf 那天看得见的最新报表与指标
 *   · 当时还没公布、但已经在路上的下一期（只给报告期和预计披露日，不给数字）
 *   · 之后真实发生了什么（价格走势）—— 这一块只在「揭晓」时才取
 */
export function timeMachine(fund, code, asOfTs, bars = null) {
  const item = fund[code];
  if (!item) return { ok: false, reason: `没有 ${code} 的财务数据` };

  const all = item.reports.map(toReport).sort((a, b) => a.endTs - b.endTs);
  const seen = all.filter(r => r.disclTs <= asOfTs);
  const pending = all.filter(r => r.disclTs > asOfTs);

  const px = bars ? priceAt(bars, asOfTs) : null;
  const m = metricsAt(fund, code, asOfTs, px);

  return {
    ok: true,
    code, display: item.display, sector: item.sector,
    asOfTs,
    price: px,
    metrics: m,
    seen,
    // 下一期只暴露「什么时候会公布」，绝不提前给数字
    next: pending.length ? {
      period: pending[0].period,
      endTs: pending[0].endTs,
      disclTs: pending[0].disclTs,
      daysAway: Math.round((pending[0].disclTs - asOfTs) / 86400000),
    } : null,
    // 揭晓用：下一期的实际数字 + 披露后的股价反应
    reveal: pending.length ? {
      report: pending[0],
      metricsAfter: metricsAt(fund, code, pending[0].disclTs,
        bars ? priceAt(bars, pending[0].disclTs) : null),
      priceAfter: bars ? priceAt(bars, pending[0].disclTs) : null,
    } : null,
  };
}

/** 取某时刻之前最后一根 K 线的收盘价 */
export function priceAt(bars, ts) {
  let lo = 0, hi = bars.length - 1, ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (bars[mid].t <= ts) { ans = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return ans >= 0 ? bars[ans].c : null;
}

/**
 * 选股组合之后的表现。
 * 用来回答「按这套财务条件选出来的股票，后面到底涨没涨」——
 * 这是财务选股演示里唯一有说服力的那个数字。
 */
export function forwardReturn(codes, barsOf, fromTs, days = 120) {
  const out = [];
  for (const code of codes) {
    const bars = barsOf(code);
    if (!bars || !bars.length) continue;
    let i = -1;
    for (let k = 0; k < bars.length; k++) if (bars[k].t <= fromTs) i = k; else break;
    if (i < 0 || i + days >= bars.length) continue;
    const a = bars[i].c, b = bars[i + days].c;
    if (a > 0) out.push({ code, ret: b / a - 1 });
  }
  if (!out.length) return null;
  const rets = out.map(x => x.ret).sort((a, b) => a - b);
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  return {
    n: rets.length,
    mean,
    median: rets[rets.length >> 1],
    best: rets[rets.length - 1],
    worst: rets[0],
    upRate: rets.filter(r => r > 0).length / rets.length,
    detail: out,
  };
}

/** 内置选股方案，同时也是给用户的写法示范 */
export const FUND_PRESETS = [
  { name: '高 ROE 稳健', desc: 'ROE 超过 10%，负债率低于 68%',
    rules: [{ field: 'roe', op: '>=', value: 0.10 }, { field: 'debtRatio', op: '<=', value: 0.68 }] },
  { name: '成长股', desc: '营收同比超 20%，且净利同比超 20%',
    rules: [{ field: 'revYoY', op: '>=', value: 0.20 }, { field: 'profitYoY', op: '>=', value: 0.20 }] },
  { name: '低估值', desc: 'PE 低于 20 倍，PB 低于 3 倍',
    rules: [{ field: 'pe', op: '<=', value: 20 }, { field: 'pb', op: '<=', value: 3 }] },
  { name: '利润有现金支撑', desc: '现金流／净利大于 0.8，净利率超 10%',
    rules: [{ field: 'cashCover', op: '>=', value: 0.8 }, { field: 'netMargin', op: '>=', value: 0.10 }] },
  { name: '高杠杆预警', desc: '资产负债率超过 70%',
    rules: [{ field: 'debtRatio', op: '>=', value: 0.70 }] },
];
