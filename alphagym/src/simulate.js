/**
 * 合成交易者 —— 用于校准测试与演示。
 *
 * 这些不是产品功能，是**验证工具**：
 *   - 无技能交易者：用来检验引擎在原假设下的 p 值是否服从均匀分布。
 *     这是整套系统唯一的生死线 —— p 值若不校准，所谓「第 87 分位」就是玄学。
 *   - 单项技能交易者：分别只在方向 / 入场 / 出场 / 仓位上作弊（偷看未来），
 *     用来检验四个零模型是否各自只对自己负责的那一维度有反应。
 *     这验证的是「归因」真的归到了正确的地方，而不是四个数字一起动。
 */

import { placeIntervals } from './nulls.js';

/** 从几何分布抽持仓时长，贴近真实交易者「多数短、偶尔长」的分布形态 */
function drawDurations(rng, K, meanDur) {
  const p = 1 / Math.max(1.0001, meanDur);
  const out = [];
  for (let i = 0; i < K; i++) {
    let d = 1;
    while (rng.next() > p && d < meanDur * 8) d++;
    out.push(d);
  }
  return out;
}

const SIZES = [1, 1, 2, 2, 3];

/**
 * 无技能交易者：时点、方向、仓位全随机。
 * 它产生的交易记录，送进引擎后应当得到 Uniform(0,1) 的 p 值。
 */
export function randomTrader(rng, n, { K = 30, meanDur = 12 } = {}) {
  const durs = drawDurations(rng, K, meanDur);
  const entries = placeIntervals(rng, n, durs);
  if (!entries) return null;
  return entries.map((e, i) => ({
    entry: e, exit: e + durs[i],
    dir: rng.next() < 0.5 ? 1 : -1,
    size: rng.pick(SIZES),
  }));
}

/**
 * 只有方向技能：时点与无技能者同分布，但以概率 skill 猜对多空。
 * 预期：Null-B（方向）显著，Null-A（入场时机）不应显著。
 */
export function directionSkillTrader(rng, bars, { K = 30, meanDur = 12, skill = 0.65 } = {}) {
  const base = randomTrader(rng, bars.length, { K, meanDur });
  if (!base) return null;
  return base.map(t => {
    const truth = bars[t.exit].o >= bars[t.entry].o ? 1 : -1;
    return { ...t, dir: rng.next() < skill ? truth : /** @type {1|-1} */ (-truth) };
  });
}

/**
 * 只有入场时机技能：方向固定为多，但从若干候选入场点里挑「后续走得最好」的那个。
 * 预期：Null-A（入场时机）显著，Null-B（方向）因为方向全一致而无从体现优势。
 */
export function entrySkillTrader(rng, bars, { K = 30, meanDur = 12, candidates = 6 } = {}) {
  const n = bars.length;
  const base = randomTrader(rng, n, { K, meanDur });
  if (!base) return null;
  const out = [];
  let cursor = 0;
  for (const t of base) {
    const dur = t.exit - t.entry;
    // 在「上一笔结束」到「原入场点 + 一段余量」之间挑最优起点，保持不重叠
    const lo = Math.max(cursor, 0);
    const hi = Math.min(n - 1 - dur, t.entry + dur);
    if (hi <= lo) { out.push({ ...t, entry: lo, exit: lo + dur }); cursor = lo + dur; continue; }
    let bestE = lo, bestGain = -Infinity;
    for (let c = 0; c < candidates; c++) {
      const e = lo + rng.int(hi - lo + 1);
      const gain = bars[e + dur].o - bars[e].o;
      if (gain > bestGain) { bestGain = gain; bestE = e; }
    }
    out.push({ entry: bestE, exit: bestE + dur, dir: 1, size: t.size });
    cursor = bestE + dur;
  }
  return out.sort((a, b) => a.entry - b.entry);
}

/**
 * 只有仓位技能：时点方向随机，但在「事后看更赚」的交易上压更大的仓。
 * 预期：Null-D（仓位）显著。
 */
export function sizingSkillTrader(rng, bars, { K = 30, meanDur = 12 } = {}) {
  const base = randomTrader(rng, bars.length, { K, meanDur });
  if (!base) return null;
  const scored = base.map(t => ({
    t, gain: t.dir * (bars[t.exit].o - bars[t.entry].o),
  })).sort((a, b) => a.gain - b.gain);
  // 收益由低到高，依次分配由小到大的仓位
  const sizes = [...base.map(x => x.size)].sort((a, b) => a - b);
  scored.forEach((s, i) => { s.t = { ...s.t, size: sizes[i] }; });
  return scored.map(s => s.t).sort((a, b) => a.entry - b.entry);
}

/**
 * 只有出场技能：入场随机，但在可行窗口内挑一个更好的离场点。
 * 预期：Null-C（出场时机）显著。
 */
export function exitSkillTrader(rng, bars, { K = 30, meanDur = 12, candidates = 6 } = {}) {
  const n = bars.length;
  const base = randomTrader(rng, n, { K, meanDur });
  if (!base) return null;
  const src = [...base].sort((a, b) => a.entry - b.entry);
  return src.map((t, i) => {
    const upper = i < src.length - 1 ? src[i + 1].entry : n - 1;
    if (upper <= t.entry + 1) return t;
    let bestX = t.exit, bestGain = -Infinity;
    for (let c = 0; c < candidates; c++) {
      const x = t.entry + 1 + rng.int(upper - t.entry);
      const gain = t.dir * (bars[x].o - bars[t.entry].o);
      if (gain > bestGain) { bestGain = gain; bestX = x; }
    }
    return { ...t, exit: bestX };
  });
}
