/**
 * 交易记录的估值：盈亏、成本、R 倍数、MAE/MFE。
 *
 * 这个模块是反事实引擎的「结算所」—— 用户的真实交易和蒙特卡洛生成的
 * 反事实交易，**必须走完全相同的一套结算逻辑**，否则比较就不成立。
 * 这是很多回测/评分系统出错的地方：真实成交用真实成交价，对照组用理想价，
 * 于是对照组天然吃亏，用户被系统性高估。
 */

import { atr } from './bars.js';

/** @typedef {import('./bars.js').Bar} Bar */

/**
 * @typedef {Object} Trade
 * @property {number} entry 入场成交的 K 线索引
 * @property {number} exit  出场成交的 K 线索引（必须 > entry）
 * @property {1|-1} dir     1 = 多头, -1 = 空头
 * @property {number} size  手数 / 股数
 */

/**
 * 合约规格与成本模型。默认值是「零成本」，仅用于单元测试；
 * 真实使用必须传入交易所实际费率，否则所有结论都会系统性偏乐观。
 * @typedef {Object} Instrument
 * @property {string} symbol
 * @property {number} multiplier     合约乘数（股票为 1，IF 为 300）
 * @property {number} tickSize       最小变动价位
 * @property {number} feeRate        按成交金额比例收取的费用（双边各收一次）
 * @property {number} feePerUnit     按手数固定收取的费用（双边各收一次）
 * @property {number} slippageTicks  单边滑点，以 tick 计
 */

/** @type {Instrument} */
export const ZERO_COST = {
  symbol: 'TEST', multiplier: 1, tickSize: 0.01,
  feeRate: 0, feePerUnit: 0, slippageTicks: 0,
};

/** 沪深 A 股近似成本：佣金万 2.5 双边 + 印花税千 1 卖出单边。这里简化为双边各万 3.5。 */
export const A_SHARE = {
  symbol: 'A股', multiplier: 1, tickSize: 0.01,
  feeRate: 0.00035, feePerUnit: 0, slippageTicks: 1,
};

/** 沪深 300 股指期货 IF 近似成本 */
export const IF_FUTURES = {
  symbol: 'IF', multiplier: 300, tickSize: 0.2,
  feeRate: 0.000023, feePerUnit: 0, slippageTicks: 1,
};

/**
 * 上下文：把每次结算都要用到的派生量算一次，避免蒙特卡洛里反复计算 ATR。
 * 2000 次 × 30 笔交易 = 6 万次结算，ATR 只算一次和算 6 万次差着两个数量级。
 */
export function makeContext(bars, instrument = ZERO_COST, { atrPeriod = 14, refSize = 1 } = {}) {
  return {
    bars, instrument, atrSeries: atr(bars, atrPeriod), n: bars.length,
    refSize: refSize > 0 ? refSize : 1,
  };
}

/** 成交价：一律取 open（见 bars.js 顶部关于无未来函数的说明） */
function fillPrice(bars, i) { return bars[i].o; }

/**
 * 单笔交易结算。
 * @returns {{gross:number, cost:number, net:number, r:number, rUnit:number,
 *            mae:number, mfe:number, holdBars:number, valid:boolean}}
 */
export function evalTrade(ctx, trade) {
  const { bars, instrument: ins, atrSeries } = ctx;
  const { entry, exit, dir, size } = trade;
  if (!(exit > entry) || entry < 0 || exit >= bars.length) {
    return { gross: 0, cost: 0, net: 0, r: 0, rUnit: 0, mae: 0, mfe: 0, holdBars: 0, valid: false };
  }
  const pin = fillPrice(bars, entry);
  const pout = fillPrice(bars, exit);
  const notionalUnit = size * ins.multiplier;

  const gross = dir * (pout - pin) * notionalUnit;
  const slip = 2 * ins.slippageTicks * ins.tickSize * notionalUnit;
  const fee = ins.feeRate * (pin + pout) * notionalUnit + 2 * ins.feePerUnit * size;
  const cost = slip + fee;
  const net = gross - cost;

  // R 单位 = 入场时 1 倍 ATR × **基准仓位**的名义价值。
  //
  // ⚠️ 这里的 refSize 必须是全局固定值，绝不能用这笔交易自己的 size。
  // 早期版本用了 size，结果是灾难性的：net 正比于 size，rUnit 也正比于 size，
  // 两者相除**把仓位完全约掉了** —— 重仓和轻仓的 R 倍数一模一样，
  // 仓位管理这一整个维度在数学上变得不可观测，仓位归因退化成浮点噪声。
  // 这个 bug 是被 test/calibration.test.js 的均匀性检验抓出来的，
  // 而不是被任何一次「跑一下看看好不好看」抓出来的。
  const rUnit = atrSeries[entry] * ctx.refSize * ins.multiplier;
  const r = rUnit > 0 ? net / rUnit : 0;

  // MAE/MFE：持仓期间最大浮亏 / 最大浮盈，用来区分「拿不住」和「不止损」
  let worst = 0, best = 0;
  for (let i = entry; i <= exit; i++) {
    const favorable = dir === 1 ? (bars[i].h - pin) : (pin - bars[i].l);
    const adverse = dir === 1 ? (bars[i].l - pin) : (pin - bars[i].h);
    if (favorable > best) best = favorable;
    if (adverse < worst) worst = adverse;
  }

  return {
    gross, cost, net, r, rUnit,
    mae: rUnit > 0 ? (worst * notionalUnit) / rUnit : 0,
    mfe: rUnit > 0 ? (best * notionalUnit) / rUnit : 0,
    holdBars: exit - entry,
    valid: true,
  };
}

/**
 * 批量结算。返回逐笔明细与汇总。
 * 汇总里的 totalR 是整个反事实引擎的**核心统计量** —— 所有 p 值都基于它。
 */
export function evalTrades(ctx, trades) {
  const rows = [];
  let net = 0, gross = 0, cost = 0, totalR = 0, wins = 0, losses = 0;
  let grossWin = 0, grossLoss = 0;
  for (const t of trades) {
    const e = evalTrade(ctx, t);
    if (!e.valid) continue;
    rows.push({ ...t, ...e });
    net += e.net; gross += e.gross; cost += e.cost; totalR += e.r;
    if (e.net > 0) { wins++; grossWin += e.net; }
    else if (e.net < 0) { losses++; grossLoss += -e.net; }
  }
  const k = rows.length;
  return {
    rows,
    count: k,
    net, gross, cost, totalR,
    avgR: k ? totalR / k : 0,
    winRate: k ? wins / k : 0,
    profitFactor: grossLoss > 0 ? grossWin / grossLoss : (grossWin > 0 ? Infinity : 0),
    rSeries: rows.map(r => r.r),
  };
}

/**
 * 快速路径：只算总 R，跳过 MAE/MFE 的逐根扫描。
 *
 * 蒙特卡洛要跑 5 个零模型 × 2000 次 × K 笔，MAE/MFE 的内层循环会让耗时增长一个数量级，
 * 而零模型只需要总 R 这一个统计量。真实交易才走完整的 evalTrades。
 */
export function totalROf(ctx, trades) {
  const { bars, instrument: ins, atrSeries } = ctx;
  const n = bars.length;
  let total = 0;
  for (let i = 0; i < trades.length; i++) {
    const { entry, exit, dir, size } = trades[i];
    if (!(exit > entry) || entry < 0 || exit >= n) continue;
    const pin = bars[entry].o, pout = bars[exit].o;
    const unit = size * ins.multiplier;
    const net = dir * (pout - pin) * unit
      - 2 * ins.slippageTicks * ins.tickSize * unit
      - ins.feeRate * (pin + pout) * unit
      - 2 * ins.feePerUnit * size;
    const rUnit = atrSeries[entry] * ctx.refSize * ins.multiplier;
    if (rUnit > 0) total += net / rUnit;
  }
  return total;
}

/**
 * 权益曲线（按笔累计，单位 R）与最大回撤。
 * 按笔而非按 bar —— 因为我们评价的是「决策序列」，不是「持仓市值波动」。
 */
export function equityCurveR(rows) {
  const eq = [0];
  let peak = 0, maxDd = 0;
  for (const r of rows) {
    const v = eq[eq.length - 1] + r.r;
    eq.push(v);
    if (v > peak) peak = v;
    if (peak - v > maxDd) maxDd = peak - v;
  }
  return { equity: eq, maxDrawdownR: maxDd };
}

/** 交易是否两两不重叠（用于校验反事实生成器没有制造出用户从未有过的同时持仓） */
export function isNonOverlapping(trades) {
  const s = [...trades].sort((a, b) => a.entry - b.entry);
  for (let i = 1; i < s.length; i++) if (s[i].entry < s[i - 1].exit) return false;
  return true;
}
