/**
 * 相似行情检索测试。
 *
 * 形态检索最常见的「假成功」是：返回的最相似片段其实就是查询自身，
 * 或是它右移一两根的邻居。看上去 99% 匹配，实际什么信息都没有。
 * 这里专门把这条堵死。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { encode, buildIndex, search, forwardStats, findSimilar } from '../src/similar.js';
import { allDatasets } from '../src/fixture.js';

const DS = allDatasets();
const INDEX = buildIndex(DS, { window: 60, stride: 4, dim: 24, horizon: 20 });

test('索引覆盖全部品种，规模合理', () => {
  assert.ok(INDEX.size > 2000, `索引只有 ${INDEX.size} 条，太少`);
  const syms = new Set(INDEX.meta.map(m => m.symbol));
  assert.deepEqual([...syms].sort(), Object.keys(DS).sort());
});

test('编码与价格绝对水平无关：整体缩放不改变形态向量', () => {
  const bars = DS.SPX.bars;
  const a = encode(bars, 500, 60, 24);
  const scaled = bars.map(b => ({ ...b, o: b.o * 7.3, h: b.h * 7.3, l: b.l * 7.3, c: b.c * 7.3 }));
  const b = encode(scaled, 500, 60, 24);
  for (let i = 0; i < a.length; i++) {
    assert.ok(Math.abs(a[i] - b[i]) < 1e-9,
      `第 ${i} 维在价格缩放后变了：${a[i]} vs ${b[i]} —— 检索到的会是价位而不是形态`);
  }
});

test('编码后 z-score 性质成立（均值≈0，标准差≈1）', () => {
  const v = encode(DS.SPX.bars, 1000, 60, 24);
  const mean = v.reduce((a, b) => a + b, 0) / v.length;
  assert.ok(Math.abs(mean) < 0.2, `均值 ${mean} 偏离 0 过多`);
  let sd = 0;
  for (const x of v) sd += (x - mean) ** 2;
  sd = Math.sqrt(sd / v.length);
  assert.ok(sd > 0.5 && sd < 1.5, `标准差 ${sd} 不在合理范围`);
});

test('走势完全走平的窗口无法编码（没有形态可言）', () => {
  const flat = Array.from({ length: 100 }, (_, i) => ({ t: i * 86400000, o: 10, h: 10, l: 10, c: 10, v: 1 }));
  assert.equal(encode(flat, 80, 60, 24), null);
});

test('检索结果不包含查询自身及其邻居 —— 形态检索最常见的假成功', () => {
  const sym = 'SPX', end = 2000;
  const r = findSimilar(DS, sym, end, INDEX, { k: 10 });
  assert.ok(r.ok);
  for (const m of r.matches) {
    if (m.symbol !== sym) continue;
    assert.ok(Math.abs(m.end - end) >= INDEX.window,
      `返回了自身附近的窗口（相距 ${Math.abs(m.end - end)} 根 < 窗口 ${INDEX.window}），这是自欺`);
  }
});

test('相似度单调：距离越小相似度越高，且落在 0~1', () => {
  const r = findSimilar(DS, 'SPX', 3000, INDEX, { k: 12 });
  assert.ok(r.ok);
  for (let i = 1; i < r.matches.length; i++) {
    assert.ok(r.matches[i].distance >= r.matches[i - 1].distance - 1e-12, '结果未按距离升序');
    assert.ok(r.matches[i].similarity <= r.matches[i - 1].similarity + 1e-12, '相似度与距离不单调');
  }
  for (const m of r.matches) {
    assert.ok(m.similarity >= 0 && m.similarity <= 1, `相似度越界: ${m.similarity}`);
  }
});

test('检索确实有效：相似片段的距离显著小于随机片段', () => {
  const r = findSimilar(DS, 'SPX', 2500, INDEX, { k: 10 });
  assert.ok(r.ok);
  const bestAvg = r.matches.slice(0, 5).reduce((a, m) => a + m.distance, 0) / 5;

  // 随机取 200 个片段作对照
  const vec = encode(DS.SPX.bars, 2500, INDEX.window, INDEX.dim);
  let randSum = 0;
  for (let i = 0; i < 200; i++) {
    const j = Math.floor((i * 7919) % INDEX.vectors.length);
    let d = 0;
    for (let k = 0; k < INDEX.dim; k++) { const x = vec[k] - INDEX.vectors[j][k]; d += x * x; }
    randSum += Math.sqrt(d);
  }
  const randAvg = randSum / 200;
  assert.ok(bestAvg < randAvg * 0.5,
    `检索没有实质效果：最相似 5 条平均距离 ${bestAvg.toFixed(3)}，随机片段 ${randAvg.toFixed(3)}`);
});

test('输出的是条件分布而不是方向结论', () => {
  const r = findSimilar(DS, 'SPX', 2500, INDEX, { k: 30 });
  assert.ok(r.ok);
  const s = r.stats;
  assert.ok(s.n > 0);
  // 必须给出完整分布，而不只是一个均值
  for (const key of ['upRate', 'mean', 'median', 'p05', 'p25', 'p75', 'p95', 'worst', 'best']) {
    assert.ok(Number.isFinite(s[key]), `分布缺少 ${key} —— 只给方向不给分布就是在做预测`);
  }
  assert.ok(s.upRate >= 0 && s.upRate <= 1);
  assert.ok(s.p05 <= s.median && s.median <= s.p95, '分位数顺序错误');
  assert.ok(s.worst <= s.p05 && s.best >= s.p95);
  // 结果对象里不该出现任何方向性字段
  assert.equal(s.direction, undefined);
  assert.equal(s.forecast, undefined);
  assert.equal(s.signal, undefined);
});

test('跨品种检索：能从其它品种找到形态相似的片段', () => {
  const r = findSimilar(DS, 'GOOG', 1200, INDEX, { k: 20 });
  assert.ok(r.ok);
  const others = r.matches.filter(m => m.symbol !== 'GOOG');
  assert.ok(others.length > 0,
    '20 条最相似片段全部来自同一品种 —— 归一化可能没生效，检索到的是价位而非形态');
});

test('同样的输入永远给同样的结果', () => {
  const a = findSimilar(DS, 'SPX', 1800, INDEX, { k: 8 });
  const b = findSimilar(DS, 'SPX', 1800, INDEX, { k: 8 });
  assert.deepEqual(a.matches.map(m => [m.symbol, m.end]), b.matches.map(m => [m.symbol, m.end]));
  assert.equal(a.stats.median, b.stats.median);
});
