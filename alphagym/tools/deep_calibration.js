/**
 * 深度校准测量：用远高于日常测试的复制次数，把每个零模型的真实一类错误率钉死。
 * 结果写进 docs/CALIBRATION.md，作为对外披露的已知属性。
 *
 * 用法: node tools/deep_calibration.js [replications] [iterations]
 */
import { makeRng } from '../src/rng.js';
import { makeContext, A_SHARE } from '../src/trades.js';
import { randomTrader } from '../src/simulate.js';
import { ksUniform, mean, quantile } from '../src/stats.js';
import { GOOG } from '../src/fixture.js';
import { runSingleNull } from '../test/_harness.js';
import { NULL_MODELS } from '../src/nulls.js';

const REPS = Number(process.argv[2] || 1000);
const ITERS = Number(process.argv[3] || 500);

const { bars } = GOOG();
const ctx = makeContext(bars, A_SHARE);

console.log(`真实行情: GOOG 日线 ${bars.length} 根 | 复制 ${REPS} | 每次蒙特卡洛 ${ITERS}\n`);
console.log('零模型              n      均值    P(p≤.01)  P(p≤.05)  P(p≤.10)  P(p≤.20)   KS-D    KS-p');
console.log('─'.repeat(96));

const rows = [];
for (const key of Object.keys(NULL_MODELS)) {
  const ps = [];
  for (let m = 0; m < REPS; m++) {
    const trades = randomTrader(makeRng(1000 + m * 7919), bars.length, { K: 30, meanDur: 12 });
    if (!trades) continue;
    const r = runSingleNull(ctx, trades, key, makeRng(500000 + m * 104729), ITERS);
    if (r) ps.push(r.p);
  }
  const rate = (a) => ps.filter(p => p <= a).length / ps.length;
  const ks = ksUniform(ps);
  const row = {
    key, n: ps.length, mean: mean(ps),
    r01: rate(0.01), r05: rate(0.05), r10: rate(0.10), r20: rate(0.20),
    ksD: ks.d, ksP: ks.p,
  };
  rows.push(row);
  console.log(
    `${key.padEnd(18)} ${String(row.n).padStart(5)}  ${row.mean.toFixed(3)}    `
    + `${row.r01.toFixed(3)}     ${row.r05.toFixed(3)}     ${row.r10.toFixed(3)}     ${row.r20.toFixed(3)}   `
    + `${row.ksD.toFixed(4)}  ${row.ksP.toFixed(3)}`
  );
}

// 二项 95% 区间，用来判断偏离是否统计显著
const ci = (p, n) => {
  const se = Math.sqrt(p * (1 - p) / n);
  return [Math.max(0, p - 1.96 * se), p + 1.96 * se];
};
const n = rows[0]?.n || REPS;
console.log('\n名义值的二项 95% 区间 (n=' + n + '):');
for (const a of [0.01, 0.05, 0.10, 0.20]) {
  const [lo, hi] = ci(a, n);
  console.log(`  名义 ${a.toFixed(2)} → [${lo.toFixed(3)}, ${hi.toFixed(3)}]`);
}
console.log('\n判读：落在区间内 = 校准良好；高于上界 = 反保守（会高估用户能力，危险）；低于下界 = 保守（会埋没能力，安全但迟钝）。');
