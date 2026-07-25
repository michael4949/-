/**
 * 归因有效性测试 —— 检验产品的核心承诺「告诉你该练哪一块」是否成立。
 *
 * 做法：造出只在**单一维度**上作弊的合成交易者（其余维度完全随机），
 * 看引擎的四个维度里，是不是恰好那一个的效应量最大。
 * 如果不是，「该练哪一块」就是瞎猜，必须推翻重做而不是包装措辞。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../src/rng.js';
import { makeContext, A_SHARE } from '../src/trades.js';
import { GOOG } from '../src/fixture.js';
import { quantile } from '../src/stats.js';
import { runSingleNull } from './_harness.js';
import {
  randomTrader, directionSkillTrader, entrySkillTrader,
  exitSkillTrader, sizingSkillTrader,
} from '../src/simulate.js';

const REPS = 60;
const ITERS = 300;
const DIMS = ['entryTiming', 'direction', 'exitTiming', 'sizing'];

const { bars } = GOOG();
const ctx = makeContext(bars, A_SHARE);
const n = bars.length;

/** 返回 {nullKey: {medianZ, detectRate}} */
function profile(genTrader) {
  const out = {};
  for (const key of [...DIMS, 'behaviorMatched']) {
    const zs = [], ps = [];
    for (let m = 0; m < REPS; m++) {
      const trades = genTrader(makeRng(2000 + m * 6151));
      if (!trades) continue;
      const r = runSingleNull(ctx, trades, key, makeRng(900000 + m * 15485863), ITERS);
      if (!r) continue;
      zs.push(r.effectZ); ps.push(r.p);
    }
    out[key] = zs.length
      ? { medianZ: quantile(zs, 0.5), detectRate: ps.filter(p => p <= 0.05).length / ps.length, n: zs.length }
      : { medianZ: NaN, detectRate: NaN, n: 0 };
  }
  return out;
}

function argmaxDim(prof) {
  let best = null, bestZ = -Infinity;
  for (const d of DIMS) {
    if (prof[d].n > 0 && prof[d].medianZ > bestZ) { bestZ = prof[d].medianZ; best = d; }
  }
  return best;
}

function show(name, prof) {
  const cells = [...DIMS, 'behaviorMatched']
    .map(d => `${d}=${prof[d].n ? prof[d].medianZ.toFixed(2) : '—'}`).join('  ');
  console.log(`  [${name}] ${cells}`);
}

test('无技能交易者：所有维度都检不出优势', () => {
  const prof = profile(rng => randomTrader(rng, n, { K: 30, meanDur: 12 }));
  show('无技能', prof);
  for (const d of [...DIMS, 'behaviorMatched']) {
    assert.ok(Math.abs(prof[d].medianZ) < 0.5,
      `${d} 在无技能交易者上出现了非零效应 Z=${prof[d].medianZ.toFixed(3)}`);
    assert.ok(prof[d].detectRate <= 0.15,
      `${d} 在无技能交易者上误报率过高: ${prof[d].detectRate.toFixed(3)}`);
  }
});

test('方向技能 → 方向维度效应最强', () => {
  const prof = profile(rng => directionSkillTrader(rng, bars, { K: 30, meanDur: 12, skill: 0.68 }));
  show('方向技能', prof);
  assert.equal(argmaxDim(prof), 'direction');
});

test('入场技能 → 入场时机维度效应最强', () => {
  const prof = profile(rng => entrySkillTrader(rng, bars, { K: 30, meanDur: 12, candidates: 8 }));
  show('入场技能', prof);
  assert.equal(argmaxDim(prof), 'entryTiming');
  // 全程做多，方向维度应当自动退化为「无从评估」而不是给出高分
  assert.ok(prof.direction.n === 0 || prof.direction.medianZ < prof.entryTiming.medianZ);
});

test('出场技能 → 出场时机维度效应最强', () => {
  const prof = profile(rng => exitSkillTrader(rng, bars, { K: 30, meanDur: 12, candidates: 8 }));
  show('出场技能', prof);
  assert.equal(argmaxDim(prof), 'exitTiming');
});

test('仓位技能 → 仓位维度效应最强，且其余维度基本不受影响', () => {
  const prof = profile(rng => sizingSkillTrader(rng, bars, { K: 30, meanDur: 12 }));
  show('仓位技能', prof);
  assert.equal(argmaxDim(prof), 'sizing');
  // 仓位是四个维度里最正交的一个：只改仓位不应把入场/出场维度带起来太多
  assert.ok(prof.sizing.medianZ > 2 * prof.entryTiming.medianZ,
    `仓位维度未能显著区别于入场维度: ${prof.sizing.medianZ.toFixed(2)} vs ${prof.entryTiming.medianZ.toFixed(2)}`);
});
