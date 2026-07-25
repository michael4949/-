/**
 * 反事实基准引擎 —— 对外的唯一入口。
 *
 * 输入：一段行情 + 一串交易记录 + 合约规格
 * 输出：一份**结构化报告对象**（不是文本）
 *
 * 「输出结构化对象而非文本」是刻意的架构决策，也是这套系统与市面上
 * 「AI 交易复盘」产品的根本分野：
 *
 *   本引擎负责**计算事实**，大模型只负责**翻译事实**。
 *   LLM 拿到的是这份 JSON，不是 K 线图。它无从编造，因为它没有原始数据，
 *   只有已经算好的数字。这样既杜绝幻觉，也让「AI 给的结论」可以被逐条追溯到
 *   某个 p 值或某个指标 —— 出了争议能查账。
 *
 *   同时这也划出了合规边界：报告全部是对用户**历史行为的描述性归因**，
 *   不含任何对未来价格的预测或买卖建议。
 */

import { makeRng } from './rng.js';
import { normalizeBars } from './bars.js';
import { makeContext, evalTrades, totalROf, equityCurveR, isNonOverlapping, ZERO_COST } from './trades.js';
import { NULL_MODELS } from './nulls.js';
import { runBenchmarks } from './benchmarks.js';
import { detectBehaviors } from './behavior.js';
import {
  mean, std, skewness, kurtosis, quantile, percentileOf, pValue, pValueStdErr,
  probabilisticSharpe, requiredSampleSize, bootstrapMeanCi, holmAdjust,
} from './stats.js';

export const ENGINE_VERSION = '0.1.0';

/** 样本量低于此值时，任何「你有/没有优势」的结论都不成立，只报事实不下判断 */
const MIN_TRADES_FOR_VERDICT = 20;

/**
 * @param {Object} opts
 * @param {import('./bars.js').Bar[]} opts.bars
 * @param {import('./trades.js').Trade[]} opts.trades
 * @param {import('./trades.js').Instrument} [opts.instrument]
 * @param {number} [opts.seed] 随机种子；同 seed 必得同结果
 * @param {number} [opts.iterations] 每个零模型的蒙特卡洛次数
 */
export function analyzeSession({
  bars: rawBars,
  trades,
  instrument = ZERO_COST,
  seed = 20260725,
  iterations = 2000,
  atrPeriod = 14,
} = {}) {
  const bars = normalizeBars(rawBars);
  const n = bars.length;
  // 基准仓位：用户仓位的中位数。R 的定义依赖它，且必须在整轮内固定，
  // 否则仓位维度会被约掉（详见 trades.js 中 rUnit 的注释）。
  const refSize = trades.length ? Math.max(1e-9, quantile(trades.map(t => t.size), 0.5)) : 1;
  const ctx = makeContext(bars, instrument, { atrPeriod, refSize });
  const rng = makeRng(seed);

  const evaluated = evalTrades(ctx, trades);
  const obsR = evaluated.totalR;
  const K = evaluated.count;
  const { equity, maxDrawdownR } = equityCurveR(evaluated.rows);

  const caveats = [];
  if (K === 0) {
    return emptyReport({ seed, iterations, instrument, bars, reason: '本轮没有有效交易记录' });
  }
  if (!isNonOverlapping(evaluated.rows)) {
    caveats.push('检测到重叠持仓。当前零模型按「同一时刻至多一笔持仓」构造，重叠会削弱对照的可比性，归因结论请谨慎使用。');
  }

  // ── 逐维度随机化检验 ────────────────────────────────────────────────
  const attribution = [];
  let headline = null;

  for (const spec of Object.values(NULL_MODELS)) {
    const sample = [];
    let failures = 0;
    for (let b = 0; b < iterations; b++) {
      const cf = spec.gen(rng, evaluated.rows, n);
      if (!cf) { failures++; continue; }
      sample.push(totalROf(ctx, cf));
    }

    if (sample.length < Math.max(50, iterations * 0.1)) {
      const entry = {
        key: spec.key, label: spec.label, dimension: spec.dimension, question: spec.question,
        available: false,
        reason: spec.key === 'sizing'
          ? '所有交易仓位相同 —— 你没有做过仓位决策，该维度无从评估（任何重排都得到同一结果）'
          : spec.key === 'direction'
            ? '所有交易方向相同 —— 你没有做过多空选择，该维度无从评估。本轮收益中属于市场方向的部分，请看「买入持有」基准。'
            : '行情长度不足以在不重叠前提下重新安放这些交易',
      };
      if (spec.key === 'behaviorMatched') headline = entry; else attribution.push(entry);
      continue;
    }

    const sorted = [...sample].sort((a, b) => a - b);
    const p = pValue(sample, obsR, 'greater');
    const pct = percentileOf(sample, obsR);
    const nullMedian = quantile(sorted, 0.5);
    const nullSd = std(sample);

    const entry = {
      key: spec.key,
      label: spec.label,
      dimension: spec.dimension,
      question: spec.question,
      available: true,
      observedR: obsR,
      nullMedianR: nullMedian,
      nullP05R: quantile(sorted, 0.05),
      nullP95R: quantile(sorted, 0.95),
      edgeR: obsR - nullMedian,
      // 标准化效应量：以零模型自身的波动为尺度，跨维度可比
      effectZ: nullSd > 0 ? (obsR - nullMedian) / nullSd : 0,
      percentile: pct,
      pValue: p,
      pValueStdErr: pValueStdErr(p, sample.length),
      iterationsUsed: sample.length,
      iterationsFailed: failures,
    };

    if (spec.key === 'behaviorMatched') headline = entry; else attribution.push(entry);
  }

  // ── 多重比较校正 ────────────────────────────────────────────────────
  // 同时检验 4 个维度，不校正的话「至少一个显著」的概率约 19% 而非 5%。
  // 这个假阳性在实测中真的出现过：一个完全无技能的合成交易者被报成
  //「仓位管理明显优于随机 p=0.016」。系统绝不能批量发放这种虚假认证。
  const availAttr = attribution.filter(a => a.available);
  const adj = holmAdjust(availAttr.map(a => a.pValue));
  availAttr.forEach((a, i) => { a.pValueAdjusted = adj[i]; });
  if (availAttr.length > 1) {
    caveats.push(`维度归因同时做了 ${availAttr.length} 次检验，已用 Holm–Bonferroni 校正族错误率。判读请以校正后 p 值为准；未校正的 p 值仅供参考。`);
  }

  // 归因维度按「边际贡献」排序，最拖后腿的排最前 —— 报告要先说该练什么
  const ranked = [...availAttr].sort((a, b) => a.edgeR - b.edgeR);

  // ── 单笔层面的统计量 ────────────────────────────────────────────────
  const rs = evaluated.rSeries;
  const mR = mean(rs), sR = std(rs);
  const perTradeSharpe = sR > 0 ? mR / sR : 0;
  const psr = probabilisticSharpe(perTradeSharpe, K, skewness(rs), kurtosis(rs), 0);
  const ci = bootstrapMeanCi(rng, rs, 2000, 0.95);
  const need = requiredSampleSize(perTradeSharpe, 0.05, 0.8);

  // ── 参照基准 ────────────────────────────────────────────────────────
  const benchmarks = runBenchmarks(ctx, evaluated.rows);

  // ── 行为偏差 ────────────────────────────────────────────────────────
  const behavior = detectBehaviors(evaluated, bars);

  // ── 机器生成的免责与局限 ────────────────────────────────────────────
  if (K < MIN_TRADES_FOR_VERDICT) {
    caveats.push(`仅 ${K} 笔交易。这个样本量下无法区分技能与运气，本报告只陈述事实，不对「你是否具备优势」下结论。`);
  }
  if (Number.isFinite(need) && need > K) {
    caveats.push(`按当前每笔收益的信噪比，约需 ${need} 笔样本才能在 95% 置信度下判定优势是否真实，目前还差 ${need - K} 笔。`);
  }
  caveats.push('四个维度的边际贡献**不可相加**。各维度的随机化互不正交（改变入场时机会同时改变出场时机的价值），因此不存在「总收益 = 方向 + 时机 + 仓位」这样的分解。');
  caveats.push('全部结论仅针对本段行情。同一套决策在不同品种、不同行情状态下的表现需要独立评估，切勿外推。');
  caveats.push('本报告是对历史交易行为的描述性统计，不含对未来价格的任何预测，也不构成投资建议。');

  return {
    meta: {
      engineVersion: ENGINE_VERSION,
      seed, iterations, atrPeriod,
      generatedAt: new Date().toISOString(),
      instrument: { ...instrument },
      barCount: n,
      barRange: n ? { from: bars[0].t, to: bars[n - 1].t } : null,
      reproducible: true,
    },
    observed: {
      trades: K,
      totalR: obsR,
      netCurrency: evaluated.net,
      grossCurrency: evaluated.gross,
      costCurrency: evaluated.cost,
      avgR: evaluated.avgR,
      winRate: evaluated.winRate,
      profitFactor: evaluated.profitFactor,
      maxDrawdownR,
      equityCurveR: equity,
      perTradeSharpe,
      probabilisticSharpe: psr,
      avgRCi95: ci,
    },
    headline,
    attribution,
    weakestDimension: ranked.length ? ranked[0].dimension : null,
    strongestDimension: ranked.length ? ranked[ranked.length - 1].dimension : null,
    benchmarks,
    power: {
      effectSizePerTrade: perTradeSharpe,
      currentTrades: K,
      requiredTrades: need,
      shortfall: Number.isFinite(need) ? Math.max(0, need - K) : Infinity,
    },
    behavior,
    verdict: makeVerdict(headline, K, psr),
    caveats,
  };
}

/**
 * 结论生成。刻意写得保守：
 * 宁可说「样本不足以判断」，也不说「你很有天赋」。
 * 一个训练系统一旦开始恭维用户，它就变成了娱乐产品。
 */
function makeVerdict(headline, K, psr) {
  if (!headline || !headline.available) {
    return { level: 'unknown', text: '无法构造有效对照，本轮不给出技能判断。' };
  }
  const { pValue: p, percentile } = headline;
  const pctText = `${(percentile * 100).toFixed(0)}%`;

  if (K < MIN_TRADES_FOR_VERDICT) {
    return {
      level: 'insufficient',
      text: `本轮位于行为匹配随机交易者分布的第 ${pctText} 分位（p=${p.toFixed(3)}）。但仅 ${K} 笔交易，`
        + `这个结果**还不能区分技能与运气** —— 同样的分位，一只猴子每 ${(1 / Math.max(p, 1e-9)).toFixed(0)} 次里也能撞出一回。`,
    };
  }
  if (p <= 0.01) {
    return { level: 'strong', text: `位于第 ${pctText} 分位，p=${p.toFixed(3)}。在 ${K} 笔样本上，用运气解释这个结果的可能性很低。` };
  }
  if (p <= 0.05) {
    return { level: 'moderate', text: `位于第 ${pctText} 分位，p=${p.toFixed(3)}。达到常规显著性门槛，但 ${K} 笔仍属小样本，建议继续累积后复核。` };
  }
  if (p <= 0.2) {
    return { level: 'weak', text: `位于第 ${pctText} 分位，p=${p.toFixed(3)}。方向是好的，但尚不足以排除运气。` };
  }
  if (percentile < 0.5) {
    return { level: 'negative', text: `位于第 ${pctText} 分位，p=${p.toFixed(3)}。这一轮你**没有跑赢**一只复制了你交易习惯的随机交易者。` };
  }
  return { level: 'none', text: `位于第 ${pctText} 分位，p=${p.toFixed(3)}。与随机交易无法区分。` };
}

function emptyReport({ seed, iterations, instrument, bars, reason }) {
  return {
    meta: {
      engineVersion: ENGINE_VERSION, seed, iterations,
      generatedAt: new Date().toISOString(),
      instrument: { ...instrument }, barCount: bars.length, reproducible: true,
    },
    observed: null, headline: null, attribution: [], benchmarks: [], behavior: [],
    verdict: { level: 'unknown', text: reason },
    caveats: [reason],
  };
}
