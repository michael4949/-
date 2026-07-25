/**
 * 归因矩阵：让「只在某一个维度上作弊」的合成交易者跑过全部零模型，
 * 看每个零模型是否只对自己负责的维度有反应。
 *
 * 这检验的是产品的核心承诺 ——「告诉你该练哪一块」。
 * 如果四个数字总是一起动，那这个承诺就是假的，必须如实告知而不是包装掉。
 *
 * 用法: node tools/attribution_matrix.js [replications]
 */
import { makeRng } from '../src/rng.js';
import { makeContext, A_SHARE } from '../src/trades.js';
import { GOOG } from '../src/fixture.js';
import { runSingleNull } from '../test/_harness.js';
import { NULL_MODELS } from '../src/nulls.js';
import { quantile } from '../src/stats.js';
import {
  randomTrader, directionSkillTrader, entrySkillTrader,
  exitSkillTrader, sizingSkillTrader,
} from '../src/simulate.js';

const REPS = Number(process.argv[2] || 200);
const ITERS = 400;
const { bars } = GOOG();
const ctx = makeContext(bars, A_SHARE);
const n = bars.length;

const TRADERS = {
  '无技能':      (rng) => randomTrader(rng, n, { K: 30, meanDur: 12 }),
  '方向技能':    (rng) => directionSkillTrader(rng, bars, { K: 30, meanDur: 12, skill: 0.68 }),
  '入场技能':    (rng) => entrySkillTrader(rng, bars, { K: 30, meanDur: 12, candidates: 8 }),
  '出场技能':    (rng) => exitSkillTrader(rng, bars, { K: 30, meanDur: 12, candidates: 8 }),
  '仓位技能':    (rng) => sizingSkillTrader(rng, bars, { K: 30, meanDur: 12 }),
};

const NULL_KEYS = Object.keys(NULL_MODELS);
const W = 16;

console.log(`真实行情 GOOG 日线 ${n} 根 | 每格 ${REPS} 次复制 × ${ITERS} 次蒙特卡洛\n`);

for (const metric of ['medianP', 'detectRate', 'medianZ']) {
  const title = {
    medianP: 'p 值中位数（越小 = 该维度检出优势越强）',
    detectRate: '检出率 P(p ≤ 0.05)（无技能行应 ≈ 0.05）',
    medianZ: '标准化效应量 Z 中位数（越大 = 优势越强）',
  }[metric];
  console.log(`\n【${title}】`);
  console.log('交易者'.padEnd(12) + NULL_KEYS.map(k => k.padStart(W)).join(''));
  console.log('─'.repeat(12 + W * NULL_KEYS.length));

  for (const [tname, gen] of Object.entries(TRADERS)) {
    const cells = [];
    for (const key of NULL_KEYS) {
      const ps = [], zs = [];
      for (let m = 0; m < REPS; m++) {
        const trades = gen(makeRng(2000 + m * 6151));
        if (!trades) continue;
        const r = runSingleNull(ctx, trades, key, makeRng(900000 + m * 15485863), ITERS);
        if (!r) continue;
        ps.push(r.p); zs.push(r.effectZ);
      }
      if (ps.length === 0) { cells.push('—'); continue; }
      const v = metric === 'medianP' ? quantile(ps, 0.5)
        : metric === 'detectRate' ? ps.filter(p => p <= 0.05).length / ps.length
          : quantile(zs, 0.5);
      cells.push(v.toFixed(3));
    }
    console.log(tname.padEnd(12) + cells.map(c => c.padStart(W)).join(''));
  }
}

console.log('\n判读要点：');
console.log('  · 对角线（技能维度 vs 对应零模型）应当明显强于同行其它格。');
console.log('  · 非对角线不为零是**预期之内**的：各维度随机化互不正交，技能会跨维度泄漏。');
console.log('  · 因此报告只能说「哪一维度最弱」的相对排序，不能说「收益 = A + B + C」的可加分解。');
