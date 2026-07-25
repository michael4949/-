/**
 * 参照基准（benchmarks）—— 与零模型的区别要说清楚：
 *
 *   零模型（nulls.js）回答的是「这个成绩能不能用运气解释」，给出 p 值；
 *   参照基准回答的是「这个成绩放在天花板和地板之间的什么位置」，给出标尺。
 *
 * 两者缺一不可。只有 p 值，用户不知道自己离「做得好」还有多远；
 * 只有标尺，用户不知道差距是不是噪音。
 */

import { evalTrades } from './trades.js';
import { quantile } from './stats.js';

/** 空仓：什么都不做。地板。 */
export function benchFlat() {
  return { trades: [], label: '空仓不交易' };
}

/** 买入持有：第一根开盘买进，最后一根开盘卖出。 */
export function benchBuyHold(n, size) {
  if (n < 2) return { trades: [], label: '买入持有' };
  return { trades: [{ entry: 0, exit: n - 1, dir: 1, size }], label: '买入持有' };
}

/**
 * 双均线趋势跟踪：一个「不动脑子但有纪律」的机械策略。
 * 它存在的意义是给用户一个扎心的参照 —— 如果连它都打不过，
 * 说明用户投入的全部盘感和精力，还不如一条写死的规则。
 */
export function benchTrendFollow(bars, size, { fast = 10, slow = 30 } = {}) {
  const n = bars.length;
  const trades = [];
  if (n < slow + 2) return { trades, label: `双均线 ${fast}/${slow}` };

  const ma = (p, i) => {
    let s = 0;
    for (let k = i - p + 1; k <= i; k++) s += bars[k].c;
    return s / p;
  };

  let pos = 0, entryIdx = -1;
  for (let i = slow; i < n - 1; i++) {
    const f = ma(fast, i), sl = ma(slow, i);
    const want = f > sl ? 1 : -1;
    if (pos === 0) { pos = want; entryIdx = i + 1; }        // 收盘判断，下一根开盘成交
    else if (want !== pos) {
      trades.push({ entry: entryIdx, exit: i + 1, dir: pos, size });
      pos = want; entryIdx = i + 1;
    }
  }
  if (pos !== 0 && entryIdx >= 0 && entryIdx < n - 1) {
    trades.push({ entry: entryIdx, exit: n - 1, dir: pos, size });
  }
  return { trades, label: `双均线 ${fast}/${slow}` };
}

/**
 * 完美后见之明上界：**已知全部未来价格**时，最多 K 笔不重叠交易（可多可空）
 * 在扣除同样手续费与滑点后能赚到的最大金额。这是理论天花板。
 *
 * 算法：经典「最多 K 次交易」动态规划的多空扩展版。
 * 朴素写法枚举 (j, i) 是 O(K·n²)，n=5000 时不可接受；
 * 注意到成本对 p_i、p_j 都是线性的，可把内层 max 拆成两个可增量维护的前缀最大值，
 * 降到 **O(K·n)**。这是这个功能能做进实时报告的关键。
 *
 * ⚠️ DP 最大化的是「金额」而非「R 倍数」（R 的归一化因子依赖入场位置，会破坏线性结构）。
 *    因此返回的是「金额最优方案，再换算成 R」，与逐笔 R 最优略有差别。报告中已注明。
 */
export function benchHindsight(bars, instrument, size, K) {
  const n = bars.length;
  const label = `完美后见之明（≤${K} 笔）`;
  if (n < 2 || K < 1) return { trades: [], label };

  const mult = size * instrument.multiplier;
  const fr = instrument.feeRate;
  const fixedCost = 2 * instrument.slippageTicks * instrument.tickSize * mult
    + 2 * instrument.feePerUnit * size;

  const p = new Float64Array(n);
  for (let i = 0; i < n; i++) p[i] = bars[i].o;

  const NEG = -Infinity;
  let prev = new Float64Array(n).fill(0);   // dp[k-1][*]
  let cur = new Float64Array(n);
  // 回溯信息：每个 (k,i) 记录是「不在 i 结束交易」还是「某笔 j→i」
  const fromJ = [], fromDir = [];

  for (let k = 1; k <= K; k++) {
    const pj = new Int32Array(n).fill(-1);
    const pd = new Int8Array(n).fill(0);
    let bestLong = NEG, bestLongJ = -1;    // max_j ( dp[k-1][j] - mult*p_j*(1+fr) )
    let bestShort = NEG, bestShortJ = -1;  // max_j ( dp[k-1][j] + mult*p_j*(1-fr) )
    cur[0] = prev[0];
    // j = 0 作为候选
    bestLong = prev[0] - mult * p[0] * (1 + fr); bestLongJ = 0;
    bestShort = prev[0] + mult * p[0] * (1 - fr); bestShortJ = 0;

    for (let i = 1; i < n; i++) {
      const carry = cur[i - 1];
      const longVal = bestLong + mult * p[i] * (1 - fr) - fixedCost;
      const shortVal = bestShort - mult * p[i] * (1 + fr) - fixedCost;
      let best = carry, bj = -1, bd = 0;
      if (longVal > best) { best = longVal; bj = bestLongJ; bd = 1; }
      if (shortVal > best) { best = shortVal; bj = bestShortJ; bd = -1; }
      cur[i] = best; pj[i] = bj; pd[i] = bd;

      const cl = prev[i] - mult * p[i] * (1 + fr);
      if (cl > bestLong) { bestLong = cl; bestLongJ = i; }
      const cs = prev[i] + mult * p[i] * (1 - fr);
      if (cs > bestShort) { bestShort = cs; bestShortJ = i; }
    }
    fromJ.push(pj); fromDir.push(pd);
    const t = prev; prev = cur; cur = t;   // prev 现在是 dp[k][*]
  }

  // 回溯：从 (K, n-1) 往回走
  const trades = [];
  let k = K, i = n - 1;
  while (k >= 1 && i >= 0) {
    const pj = fromJ[k - 1], pd = fromDir[k - 1];
    if (pj[i] === -1) { i--; continue; }               // 这根没有交易结束
    trades.push({ entry: pj[i], exit: i, dir: pd[i], size });
    // 回到状态 dp[k-1][j]：j 即本笔的入场根。递推式允许「上一笔在 j 收、本笔在 j 开」
    // （同一根上反手），所以这里回到 j 而不是 j-1 —— 写成 j-1 会与前向递推不一致，
    // 让回溯出的方案劣于 DP 实际算出的最优值。由 test/hindsight.test.js 的暴力对拍守住。
    i = pj[i];
    k--;
  }
  trades.reverse();
  return { trades, label };
}

/** 用户仓位的中位数 —— 让所有基准与用户的资金规模可比 */
export function medianSize(trades) {
  if (trades.length === 0) return 1;
  return Math.max(1e-9, quantile(trades.map(t => t.size), 0.5));
}

/** 一次性算出全部参照基准 */
export function runBenchmarks(ctx, userTrades) {
  const { bars, instrument, n } = ctx;
  const size = medianSize(userTrades);
  const K = Math.max(1, userTrades.length);

  const specs = [
    benchFlat(),
    benchBuyHold(n, size),
    benchTrendFollow(bars, size),
    benchHindsight(bars, instrument, size, K),
  ];

  return specs.map(s => {
    const ev = evalTrades(ctx, s.trades);
    return {
      label: s.label,
      count: ev.count,
      totalR: ev.totalR,
      net: ev.net,
      winRate: ev.winRate,
    };
  });
}
