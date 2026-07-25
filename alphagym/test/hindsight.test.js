/**
 * 完美后见之明上界的正确性：O(K·n) 动态规划 vs 暴力枚举对拍。
 *
 * 这个基准是报告里的「天花板」。它一旦算错（尤其是算小了），
 * 用户会以为自己离最优很近，从而低估提升空间 —— 一个让人自我感觉良好的 bug。
 * 所以必须用暴力枚举在小规模上逐一对拍，而不是「看着差不多」。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { benchHindsight } from '../src/benchmarks.js';
import { makeContext, evalTrades, ZERO_COST } from '../src/trades.js';
import { makeRng } from '../src/rng.js';
import { GOOG } from '../src/fixture.js';

/** 暴力：枚举全部「≤K 笔、互不重叠（允许同一根上反手）」的方案，取最大净收益 */
function bruteForce(bars, ins, size, K) {
  const n = bars.length;
  const p = bars.map(b => b.o);
  const mult = size * ins.multiplier;
  const fixed = 2 * ins.slippageTicks * ins.tickSize * mult + 2 * ins.feePerUnit * size;
  const profit = (i, j, dir) =>
    dir * (p[j] - p[i]) * mult - ins.feeRate * (p[i] + p[j]) * mult - fixed;

  let best = 0;
  const rec = (start, k, acc) => {
    if (acc > best) best = acc;
    if (k === 0) return;
    for (let i = start; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        for (const dir of [1, -1]) {
          rec(j, k - 1, acc + profit(i, j, dir));
        }
      }
    }
  };
  rec(0, K, 0);
  return best;
}

function netOf(bars, ins, trades, size) {
  const ctx = makeContext(bars, ins, { refSize: size });
  return evalTrades(ctx, trades).net;
}

test('DP 与暴力枚举在小规模上完全一致（无成本）', () => {
  const rng = makeRng(7);
  for (let trial = 0; trial < 12; trial++) {
    const n = 8 + rng.int(5);
    const bars = [];
    let px = 100;
    for (let i = 0; i < n; i++) {
      px = Math.max(1, px + (rng.next() - 0.5) * 8);
      bars.push({ t: i, o: px, h: px + 1, l: px - 1, c: px, v: 1 });
    }
    for (const K of [1, 2, 3]) {
      const { trades } = benchHindsight(bars, ZERO_COST, 1, K);
      const dp = netOf(bars, ZERO_COST, trades, 1);
      const bf = bruteForce(bars, ZERO_COST, 1, K);
      assert.ok(Math.abs(dp - bf) < 1e-6,
        `trial=${trial} n=${n} K=${K}: DP=${dp.toFixed(6)} 暴力=${bf.toFixed(6)}`);
      assert.ok(trades.length <= K, `回溯出的交易数 ${trades.length} 超过上限 ${K}`);
    }
  }
});

test('DP 与暴力枚举在小规模上完全一致（含手续费与滑点）', () => {
  const rng = makeRng(99);
  const ins = { symbol: 'T', multiplier: 10, tickSize: 0.5, feeRate: 0.0004, feePerUnit: 1, slippageTicks: 1 };
  for (let trial = 0; trial < 10; trial++) {
    const n = 8 + rng.int(4);
    const bars = [];
    let px = 200;
    for (let i = 0; i < n; i++) {
      px = Math.max(1, px + (rng.next() - 0.5) * 12);
      bars.push({ t: i, o: px, h: px + 2, l: px - 2, c: px, v: 1 });
    }
    for (const K of [1, 2, 3]) {
      const { trades } = benchHindsight(bars, ins, 2, K);
      const dp = netOf(bars, ins, trades, 2);
      const bf = bruteForce(bars, ins, 2, K);
      assert.ok(Math.abs(dp - bf) < 1e-6,
        `trial=${trial} K=${K}: DP=${dp.toFixed(6)} 暴力=${bf.toFixed(6)}`);
    }
  }
});

test('后见之明确实是上界：任何交易者都不可能超过它', () => {
  const { bars } = GOOG();
  const ins = { symbol: 'GOOG', multiplier: 1, tickSize: 0.01, feeRate: 0.0003, feePerUnit: 0, slippageTicks: 1 };
  const K = 20;
  const { trades } = benchHindsight(bars, ins, 1, K);
  const hindsightNet = netOf(bars, ins, trades, 1);

  const rng = makeRng(4242);
  for (let m = 0; m < 200; m++) {
    const rnd = [];
    let cursor = 0;
    for (let i = 0; i < K && cursor < bars.length - 2; i++) {
      const e = cursor + rng.int(Math.max(1, Math.floor((bars.length - cursor) / (K - i + 1))));
      const x = Math.min(bars.length - 1, e + 1 + rng.int(40));
      if (x <= e) break;
      rnd.push({ entry: e, exit: x, dir: rng.next() < 0.5 ? 1 : -1, size: 1 });
      cursor = x;
    }
    const net = netOf(bars, ins, rnd, 1);
    assert.ok(net <= hindsightNet + 1e-6,
      `第 ${m} 次随机方案 ${net.toFixed(2)} 超过了后见之明上界 ${hindsightNet.toFixed(2)}`);
  }
});

test('后见之明在真实行情上随 K 单调不减', () => {
  const { bars } = GOOG();
  const ins = { symbol: 'GOOG', multiplier: 1, tickSize: 0.01, feeRate: 0.0003, feePerUnit: 0, slippageTicks: 1 };
  let prev = -Infinity;
  for (const K of [1, 2, 5, 10, 20, 40]) {
    const { trades } = benchHindsight(bars, ins, 1, K);
    const net = netOf(bars, ins, trades, 1);
    assert.ok(net >= prev - 1e-6, `K=${K} 的上界 ${net.toFixed(2)} 反而低于 K 更小时的 ${prev.toFixed(2)}`);
    prev = net;
  }
});
