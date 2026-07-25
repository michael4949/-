/**
 * 多周期重采样测试。
 *
 * 核心要守住的是「大周期不能泄露未来」：小周期推进到周三时，
 * 周线图上那根未完成的 K 线只能包含周一到周三的信息。
 * 这一条错了，多周期训练就变成了开卷考试。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { resample, resampledUpTo } from '../src/bars.js';
import { SP500 } from '../src/fixture.js';

const { bars } = SP500();

test('重采样保持 OHLC 语义', () => {
  const { bars: w } = resample(bars, 5);
  assert.equal(w.length, Math.ceil(bars.length / 5));
  for (let i = 0; i < 50; i++) {
    const chunk = bars.slice(i * 5, i * 5 + 5);
    if (!chunk.length) break;
    assert.equal(w[i].o, chunk[0].o, '开盘价应取第一根');
    assert.equal(w[i].c, chunk[chunk.length - 1].c, '收盘价应取最后一根');
    assert.equal(w[i].h, Math.max(...chunk.map(b => b.h)), '最高价应取区间最大');
    assert.equal(w[i].l, Math.min(...chunk.map(b => b.l)), '最低价应取区间最小');
    assert.ok(Math.abs(w[i].v - chunk.reduce((a, b) => a + b.v, 0)) < 1e-6, '成交量应累加');
  }
});

test('截至游标的大周期不含任何未来信息', () => {
  const factor = 5;
  for (const cursor of [7, 23, 100, 501]) {
    const up = resampledUpTo(bars, factor, cursor);
    const last = up[up.length - 1];
    const startIdx = (up.length - 1) * factor;
    const seen = bars.slice(startIdx, cursor + 1);
    assert.equal(last.h, Math.max(...seen.map(b => b.h)),
      `游标 ${cursor}：未完成周线的最高价泄露了未来`);
    assert.equal(last.c, bars[cursor].c, '未完成周线的收盘价应等于当前小周期收盘价');
    // 只要再多看一根，最高价就可能变——证明确实没提前看
    const next = resampledUpTo(bars, factor, cursor + 1);
    assert.ok(next.length >= up.length);
  }
});

test('未完成的大周期 K 线会随小周期推进而生长', () => {
  const factor = 5, base = 200;
  const a = resampledUpTo(bars, factor, base);
  const b = resampledUpTo(bars, factor, base + 1);
  const la = a[a.length - 1], lb = b[b.length - 1];
  if (a.length === b.length) {
    assert.ok(lb.h >= la.h - 1e-9 && lb.l <= la.l + 1e-9, '同一根周线的高低点只应扩张不应收缩');
  }
});

test('factor=1 时退化为原序列', () => {
  const up = resampledUpTo(bars, 1, 30);
  assert.equal(up.length, 31);
  assert.deepEqual(up[30], bars[30]);
});
