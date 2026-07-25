/**
 * ══════════════════════════════════════════════════════════════════
 *  校准测试 —— 这套系统唯一的生死线
 * ══════════════════════════════════════════════════════════════════
 *
 * 产品对用户说的是「你处在第 87 分位，p=0.04」。这句话要成立，
 * 唯一的前提是：**当用户其实毫无技能时，p 值必须服从 Uniform(0,1)**。
 *
 * 如果 p 值分布偏左，系统会把大量运气好的用户判定为「有优势」——
 * 那就是在系统性地恭维用户，是收费的算命。
 * 如果偏右，则会埋没真有能力的人。
 *
 * 所以这个测试不是「跑通了吗」，而是「这个产品有没有资格存在」。
 * 它跑在**真实 GOOG 日线**上（含 2008 年崩盘），而不是随机游走 ——
 * 真实数据的跳空、波动率聚集和肥尾，正是最容易让随机化检验失效的地方。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../src/rng.js';
import { makeContext } from '../src/trades.js';
import { randomTrader } from '../src/simulate.js';
import { ksUniform, mean, quantile } from '../src/stats.js';
import { A_SHARE } from '../src/trades.js';
import { GOOG } from '../src/fixture.js';
import { runSingleNull } from './_harness.js';

const REPLICATIONS = 300;   // 独立的「无技能交易者」个数
const ITERATIONS = 500;     // 每人的蒙特卡洛次数

function calibrationRun(nullKey, traderOpts = {}) {
  const { bars } = GOOG();
  const ctx = makeContext(bars, A_SHARE);
  const ps = [];
  for (let m = 0; m < REPLICATIONS; m++) {
    // 每次复制用不同 seed，保证 300 个交易者相互独立
    const genRng = makeRng(1000 + m * 7919);
    const trades = randomTrader(genRng, bars.length, { K: 30, meanDur: 12, ...traderOpts });
    if (!trades) continue;
    const mcRng = makeRng(500000 + m * 104729);
    const r = runSingleNull(ctx, trades, nullKey, mcRng, ITERATIONS);
    if (r) ps.push(r.p);
  }
  return ps;
}

function report(name, ps) {
  const ks = ksUniform(ps);
  const rate05 = ps.filter(p => p <= 0.05).length / ps.length;
  const rate10 = ps.filter(p => p <= 0.10).length / ps.length;
  const rate50 = ps.filter(p => p <= 0.50).length / ps.length;
  console.log(
    `\n  [${name}] n=${ps.length}\n`
    + `    均值 ${mean(ps).toFixed(3)} (期望 0.500)   中位数 ${quantile(ps, 0.5).toFixed(3)} (期望 0.500)\n`
    + `    P(p≤0.05) = ${rate05.toFixed(3)} (期望 0.050)\n`
    + `    P(p≤0.10) = ${rate10.toFixed(3)} (期望 0.100)\n`
    + `    P(p≤0.50) = ${rate50.toFixed(3)} (期望 0.500)\n`
    + `    KS 统计量 D = ${ks.d.toFixed(4)}, p = ${ks.p.toFixed(3)}`
  );
  return { ks, rate05, rate10 };
}

test('Null-0 行为匹配随机交易者：无技能时 p 值服从均匀分布', () => {
  const ps = calibrationRun('behaviorMatched');
  const { ks, rate05 } = report('behaviorMatched', ps);

  assert.ok(ps.length >= 250, `有效复制数过少: ${ps.length}`);
  // 不能拒绝均匀性。阈值取 0.01 而非 0.05，避免测试本身频繁假阳性。
  assert.ok(ks.p > 0.01, `p 值分布显著偏离均匀 (KS p=${ks.p.toFixed(4)})`);
  // 300 次复制下，真实 5% 的二项 95% 区间约为 [0.028, 0.081]，这里放宽到 [0.02, 0.10]
  assert.ok(rate05 >= 0.02 && rate05 <= 0.10,
    `一类错误率失控: P(p≤0.05)=${rate05.toFixed(3)}，应接近 0.05`);
  assert.ok(Math.abs(mean(ps) - 0.5) < 0.07, `p 值均值 ${mean(ps).toFixed(3)} 偏离 0.5 过多`);
});

test('Null-A 入场时机：无技能时 p 值服从均匀分布', () => {
  const ps = calibrationRun('entryTiming');
  const { ks, rate05 } = report('entryTiming', ps);
  assert.ok(ks.p > 0.01, `p 值分布显著偏离均匀 (KS p=${ks.p.toFixed(4)})`);
  assert.ok(rate05 >= 0.02 && rate05 <= 0.10, `一类错误率失控: ${rate05.toFixed(3)}`);
});

test('Null-B 方向：无技能时 p 值服从均匀分布', () => {
  const ps = calibrationRun('direction');
  const { ks, rate05 } = report('direction', ps);
  assert.ok(ks.p > 0.01, `p 值分布显著偏离均匀 (KS p=${ks.p.toFixed(4)})`);
  assert.ok(rate05 >= 0.02 && rate05 <= 0.10, `一类错误率失控: ${rate05.toFixed(3)}`);
});

test('Null-C 出场时机：无技能时 p 值服从均匀分布', () => {
  const ps = calibrationRun('exitTiming');
  const { ks, rate05 } = report('exitTiming', ps);
  assert.ok(ks.p > 0.01, `p 值分布显著偏离均匀 (KS p=${ks.p.toFixed(4)})`);
  assert.ok(rate05 >= 0.02 && rate05 <= 0.10, `一类错误率失控: ${rate05.toFixed(3)}`);
});

test('Null-D 仓位：无技能时 p 值服从均匀分布', () => {
  const ps = calibrationRun('sizing');
  const { ks, rate05 } = report('sizing', ps);
  assert.ok(ks.p > 0.01, `p 值分布显著偏离均匀 (KS p=${ks.p.toFixed(4)})`);
  assert.ok(rate05 >= 0.02 && rate05 <= 0.10, `一类错误率失控: ${rate05.toFixed(3)}`);
});
