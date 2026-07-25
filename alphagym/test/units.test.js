/** 基础不变量与数值正确性 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRng, randomComposition } from '../src/rng.js';
import {
  normalCdf, normalInv, quantile, pValue, percentileOf,
  probabilisticSharpe, requiredSampleSize, mean, std,
} from '../src/stats.js';
import { atr, normalizeBars } from '../src/bars.js';
import { makeContext, evalTrades, totalROf, isNonOverlapping, A_SHARE } from '../src/trades.js';
import { placeIntervals } from '../src/nulls.js';
import { analyzeSession } from '../src/engine.js';
import { randomTrader } from '../src/simulate.js';
import { GOOG } from '../src/fixture.js';

test('normalCdf / normalInv 互为反函数且精度达标', () => {
  for (const x of [-3, -1.96, -1, -0.5, 0, 0.5, 1, 1.645, 1.96, 3]) {
    const p = normalCdf(x);
    assert.ok(Math.abs(normalInv(p) - x) < 1e-4, `x=${x} 往返误差过大`);
  }
  assert.ok(Math.abs(normalCdf(0) - 0.5) < 1e-9);
  assert.ok(Math.abs(normalCdf(1.959964) - 0.975) < 1e-6);
  assert.ok(Math.abs(normalInv(0.975) - 1.959964) < 1e-5);
});

test('quantile 与 numpy/R 的 type-7 插值一致', () => {
  const xs = [1, 2, 3, 4];
  assert.equal(quantile(xs, 0), 1);
  assert.equal(quantile(xs, 1), 4);
  assert.ok(Math.abs(quantile(xs, 0.5) - 2.5) < 1e-12);
  assert.ok(Math.abs(quantile(xs, 0.25) - 1.75) < 1e-12);
});

test('p 值永远大于 0（+1 修正生效）', () => {
  const nul = new Array(1000).fill(0);
  const p = pValue(nul, 999, 'greater');
  assert.ok(p > 0, 'p 值不允许为 0 —— 那是在宣称「绝无可能」');
  assert.ok(Math.abs(p - 1 / 1001) < 1e-12);
});

test('percentileOf 用中点法处理并列', () => {
  assert.equal(percentileOf([1, 2, 3, 4], 2.5), 0.5);
  assert.equal(percentileOf([1, 1, 1, 1], 1), 0.5);  // 全并列 → 恰好中位
});

test('PSR 随样本量增大而增大（同样的夏普，样本越多越可信）', () => {
  const a = probabilisticSharpe(0.3, 20, 0, 3);
  const b = probabilisticSharpe(0.3, 200, 0, 3);
  assert.ok(b > a, `PSR 未随样本量提升: n=20 → ${a.toFixed(3)}, n=200 → ${b.toFixed(3)}`);
  assert.ok(probabilisticSharpe(0, 100, 0, 3) > 0.49 && probabilisticSharpe(0, 100, 0, 3) < 0.51);
});

test('所需样本量随效应量减小而增大', () => {
  assert.ok(requiredSampleSize(0.1) > requiredSampleSize(0.3));
  assert.equal(requiredSampleSize(0), Infinity);
  // 经典结果：单尾 α=0.05、power=0.8 时 n ≈ 6.18/d²
  assert.ok(Math.abs(requiredSampleSize(0.5) - Math.ceil(6.18 / 0.25)) <= 1);
});

test('randomComposition 总和恒等于目标值且非负', () => {
  const rng = makeRng(11);
  for (let i = 0; i < 500; i++) {
    const k = 1 + rng.int(8), s = rng.int(40);
    const c = randomComposition(rng, k, s);
    assert.equal(c.length, k);
    assert.equal(c.reduce((a, b) => a + b, 0), s);
    assert.ok(c.every(v => v >= 0));
  }
});

test('placeIntervals 产出的区间永不重叠且不越界', () => {
  const rng = makeRng(13);
  for (let i = 0; i < 300; i++) {
    const n = 200 + rng.int(300);
    const durs = Array.from({ length: 5 + rng.int(20) }, () => 1 + rng.int(15));
    const entries = placeIntervals(rng, n, durs);
    if (!entries) continue;
    for (let j = 0; j < entries.length; j++) {
      assert.ok(entries[j] >= 0);
      assert.ok(entries[j] + durs[j] <= n - 1, '区间越过了序列末端');
      if (j > 0) assert.ok(entries[j] >= entries[j - 1] + durs[j - 1], '区间重叠');
    }
  }
});

test('ATR 恒为正，避免 R 单位除零', () => {
  const { bars } = GOOG();
  const a = atr(bars, 14);
  assert.equal(a.length, bars.length);
  for (let i = 0; i < a.length; i++) assert.ok(a[i] > 0, `ATR[${i}] = ${a[i]}`);
});

test('normalizeBars 拒绝高低价矛盾的脏数据', () => {
  assert.throws(() => normalizeBars([{ t: 0, o: 10, h: 9, l: 8, c: 10, v: 1 }]), /矛盾/);
  assert.throws(() => normalizeBars([{ t: 0, o: 10, h: 12, l: 8, c: NaN, v: 1 }]), /非有限/);
  assert.throws(() => normalizeBars([
    { t: 5, o: 10, h: 12, l: 8, c: 10, v: 1 },
    { t: 1, o: 10, h: 12, l: 8, c: 10, v: 1 },
  ]), /倒序/);
});

test('totalROf 与完整 evalTrades 结果一致（快慢路径不能算出两个答案）', () => {
  const { bars } = GOOG();
  const rng = makeRng(31);
  const trades = randomTrader(rng, bars.length, { K: 40, meanDur: 15 });
  const ctx = makeContext(bars, A_SHARE, { refSize: 2 });
  const slow = evalTrades(ctx, trades).totalR;
  const fast = totalROf(ctx, trades);
  assert.ok(Math.abs(slow - fast) < 1e-9, `快慢路径不一致: ${slow} vs ${fast}`);
});

test('R 倍数对仓位敏感（仓位维度必须可观测）', () => {
  const { bars } = GOOG();
  const ctx = makeContext(bars, A_SHARE, { refSize: 1 });
  const one = totalROf(ctx, [{ entry: 100, exit: 130, dir: 1, size: 1 }]);
  const three = totalROf(ctx, [{ entry: 100, exit: 130, dir: 1, size: 3 }]);
  // 这是曾经的真实 bug：R 单位若用每笔自己的仓位，两者会完全相等，
  // 仓位管理在数学上变得不可观测。此断言是那个 bug 的回归防线。
  assert.ok(Math.abs(three - 3 * one) < 1e-6,
    `R 应正比于仓位: size=1 → ${one.toFixed(4)}, size=3 → ${three.toFixed(4)}`);
  assert.ok(Math.abs(three - one) > 1e-6, 'R 对仓位完全不敏感 —— 仓位归因将失效');
});

test('同一 seed 必产出逐字节相同的报告（成绩要可复现、可申诉）', () => {
  const { bars } = GOOG();
  const trades = randomTrader(makeRng(77), bars.length, { K: 25, meanDur: 10 });
  const opts = { bars, trades, instrument: A_SHARE, seed: 12345, iterations: 200 };
  const a = analyzeSession(opts);
  const b = analyzeSession(opts);
  const strip = (r) => JSON.stringify({ ...r, meta: { ...r.meta, generatedAt: null } });
  assert.equal(strip(a), strip(b));

  const c = analyzeSession({ ...opts, seed: 99999 });
  assert.notEqual(strip(a), strip(c), '不同 seed 却得到完全相同的结果，随机化可能失效');
});

test('无交易时返回结构完整的空报告而不是崩溃', () => {
  const { bars } = GOOG();
  const r = analyzeSession({ bars, trades: [], instrument: A_SHARE, iterations: 50 });
  assert.equal(r.observed, null);
  assert.equal(r.verdict.level, 'unknown');
  assert.ok(r.caveats.length > 0);
});

test('全同方向 / 全同仓位时，对应维度诚实地报告「无从评估」', () => {
  const { bars } = GOOG();
  const rng = makeRng(53);
  const base = randomTrader(rng, bars.length, { K: 25, meanDur: 10 });
  const flat = base.map(t => ({ ...t, dir: 1, size: 2 }));  // 全做多、全同仓
  const r = analyzeSession({ bars, trades: flat, instrument: A_SHARE, iterations: 200 });

  const dir = r.attribution.find(a => a.key === 'direction');
  const size = r.attribution.find(a => a.key === 'sizing');
  assert.equal(dir.available, false, '全做多却给出了方向维度评分 —— 那是在把 beta 当 alpha');
  assert.equal(size.available, false, '全同仓位却给出了仓位维度评分');
  assert.match(dir.reason, /没有做过多空选择/);
});

test('样本量不足时，结论必须是「无法判断」而不是恭维', () => {
  const { bars } = GOOG();
  const few = [
    { entry: 100, exit: 120, dir: 1, size: 1 },
    { entry: 200, exit: 230, dir: 1, size: 2 },
    { entry: 400, exit: 410, dir: -1, size: 1 },
  ];
  const r = analyzeSession({ bars, trades: few, instrument: A_SHARE, iterations: 300 });
  assert.equal(r.verdict.level, 'insufficient');
  assert.ok(r.caveats.some(c => c.includes('无法区分技能与运气')));
});
