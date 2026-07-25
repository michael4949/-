/** 测试公用件：单独跑某一个零模型，拿到它的 p 值与效应量 */
import { makeContext, evalTrades, totalROf } from '../src/trades.js';
import { NULL_MODELS } from '../src/nulls.js';
import { pValue, percentileOf, quantile, std } from '../src/stats.js';

export function runSingleNull(ctx, trades, nullKey, rng, iterations) {
  const spec = NULL_MODELS[nullKey];
  const evaluated = evalTrades(ctx, trades);
  const obs = evaluated.totalR;
  const sample = [];
  for (let b = 0; b < iterations; b++) {
    const cf = spec.gen(rng, evaluated.rows, ctx.n);
    if (!cf) continue;
    sample.push(totalROf(ctx, cf));
  }
  if (sample.length < iterations * 0.5) return null;
  const sd = std(sample);
  const med = quantile(sample, 0.5);
  return {
    obs,
    p: pValue(sample, obs, 'greater'),
    percentile: percentileOf(sample, obs),
    edgeR: obs - med,
    effectZ: sd > 0 ? (obs - med) / sd : 0,
  };
}

export { makeContext };
