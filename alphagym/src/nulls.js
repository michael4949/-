/**
 * 反事实零模型（null models）—— 整个系统的理论核心。
 *
 * ── 为什么不能用「随机交易」当基准 ──
 * 天真的做法是：让程序随机瞎做一堆交易，比一比。这是错的。
 * 如果用户做了 20 笔、平均持仓 30 根 K 线，而对照组做了 200 笔，
 * 那么两者的差异里混进了**交易频率和手续费**，根本不是判断力的差异。
 * 得出的「你战胜了 87% 的随机交易者」毫无意义。
 *
 * ── 正确的做法：行为匹配的条件随机化 ──
 * 对照组必须复制用户的交易习惯（笔数、持仓时长分布、多空比例、仓位分布），
 * 只随机化**被检验的那一个决策维度**。这样两组之间唯一的差别就是那个维度，
 * 差异才能被归因。这在统计上叫条件随机化检验（conditional randomization test），
 * 用户的真实交易恰好是该随机化分布中的一个样本点，所以 p 值是**精确**的，
 * 不依赖任何正态性假设。
 *
 * ── 一个副产品 ──
 * 逐维度做一遍，就自然得到了「入场时机 / 方向 / 出场时机 / 仓位」四项能力的
 * 独立评估。换句话说：**决策点归因不是另一个功能，它就是这套检验的输出。**
 *
 * ⚠️ 诚实声明：四项的效应量**不是可加分解**。各维度的随机化互不正交
 * （比如改了入场时机，出场时机的价值也会变）。报告里必须写成
 * 「相对各自反事实的边际贡献」，绝不能写成「总收益 = 方向 + 时机 + ...」。
 */

import { randomComposition } from './rng.js';

/** @typedef {import('./trades.js').Trade} Trade */

/**
 * 在 n 根 K 线上随机放置 K 段互不重叠、时长为 durations 的区间。
 *
 * 均匀性来自 stars-and-bars：把「总空隙」S 均匀分配到 K+1 个间隔中，
 * 每种合法排列被抽到的概率相同 —— 这正是「入场时机无信息」这一原假设的精确刻画。
 *
 * @returns {number[]|null} 每段的起始索引；空间不足时返回 null
 */
export function placeIntervals(rng, n, durations) {
  const K = durations.length;
  if (K === 0) return [];
  let total = 0;
  for (const d of durations) total += d;
  const slack = n - 1 - total;
  if (slack < 0) return null; // 交易时长总和超出行情长度，无法在不重叠前提下安放

  const gaps = randomComposition(rng, K + 1, slack);
  const entries = new Array(K);
  let cur = gaps[0];
  for (let i = 0; i < K; i++) {
    entries[i] = cur;
    cur += durations[i] + gaps[i + 1];
  }
  return entries;
}

const dursOf = (ts) => ts.map(t => t.exit - t.entry);
const sortByEntry = (ts) => [...ts].sort((a, b) => a.entry - b.entry);

/**
 * Null-0 「行为匹配随机交易者」—— 报告头条用的那个基准。
 *
 * 保留：笔数、持仓时长的多重集、多空比例、仓位的多重集。
 * 随机化：入场时点，以及「哪个时长/方向/仓位配给哪一笔」。
 *
 * 直白说：一只**养成了和你一模一样交易习惯、但完全没有判断力的猴子**。
 * 你打不过它，说明你这一轮的盈利来自行情本身或运气，不来自判断。
 */
export function nullBehaviorMatched(rng, trades, n) {
  const src = sortByEntry(trades);
  const durs = rng.shuffle(dursOf(src));
  const dirs = rng.shuffle(src.map(t => t.dir));
  const sizes = rng.shuffle(src.map(t => t.size));
  const entries = placeIntervals(rng, n, durs);
  if (!entries) return null;
  return entries.map((e, i) => ({ entry: e, exit: e + durs[i], dir: dirs[i], size: sizes[i] }));
}

/**
 * Null-A 「入场时机」
 * 保留：每一笔自身的时长、方向、仓位，以及它们的先后次序。
 * 随机化：仅入场时点。
 * → 回答「你选的进场点，比随机撞进去强吗」。
 */
export function nullEntryTiming(rng, trades, n) {
  const src = sortByEntry(trades);
  const durs = dursOf(src);
  const entries = placeIntervals(rng, n, durs);
  if (!entries) return null;
  return entries.map((e, i) => ({
    entry: e, exit: e + durs[i], dir: src[i].dir, size: src[i].size,
  }));
}

/**
 * Null-B 「方向」
 * 保留：入场点、出场点、仓位（即完全相同的持仓时段），以及多空的**数量配比**。
 * 随机化：把多空标签在各笔之间重新排列（精确置换检验）。
 * → 回答「你把『做多』这个标签，贴到了该贴的那些交易上吗」。
 *
 * ⚠️ 这里有一个刻意的设计选择，值得写下来。
 * 直觉做法是「每笔独立以 1/2 概率翻转多空」。那样做有个严重后果：
 * 一个**全程只做多**的交易者，随机翻转后收益会被摧毁，
 * 于是系统会报告「你的方向判断极其出色」—— 可他根本没有做过任何方向选择，
 * 赚到的是市场本身的上行漂移。这是在把 beta 当成 alpha 发给用户。
 *
 * 改用置换检验后，全同方向的情况下任何排列都得到相同结果，检验自动退化，
 * 系统会诚实地报告「方向维度无从评估」。这正是应该说的话。
 */
export function nullDirection(rng, trades) {
  const dirs = trades.map(t => t.dir);
  if (dirs.every(d => d === dirs[0])) return null;  // 全多或全空 → 无方向决策可评
  const shuffled = rng.shuffle([...dirs]);
  return trades.map((t, i) => ({ ...t, dir: shuffled[i] }));
}

/**
 * Null-C 「出场时机」
 * 保留：入场点、方向、仓位。
 * 随机化：在**不与下一笔重叠**的可行窗口内均匀重抽出场点。
 * → 回答「你选的离场点，比在同样窗口里随便找一天平掉强吗」。
 *
 * 用「可行窗口内均匀重抽」而不是「打乱持仓时长」，是为了严格保持不重叠：
 * 打乱时长会制造出用户从未有过的同时持仓，那样对照组和用户就不可比了。
 * 用户的真实出场点必然落在该窗口内，因此这仍是一个精确的条件随机化检验。
 */
export function nullExitTiming(rng, trades, n) {
  const src = sortByEntry(trades);
  const K = src.length;

  // 每笔的可行窗口上界（不与下一笔重叠）
  const maxDur = src.map((t, i) => (i < K - 1 ? src[i + 1].entry : n - 1) - t.entry);

  // ── 为什么是「可行置换」而不是「重抽」 ────────────────────────────────
  // 这里前后改过两版，两版都被校准测试打回来了，值得记下来：
  //
  //   v1「在可行窗口内均匀抽出场点」：真实持仓时长高度偏短（近似几何分布），
  //      均匀抽会把对照组系统性拉长。P(p≤0.05) 冲到 0.100，是名义值两倍。
  //   v2「从用户自己的时长分布**有放回**重抽」：风格保住了，但多重集没保住 ——
  //      对照组每次的总持仓时间在波动，零分布被撑宽，仍然反保守
  //      （P(p≤0.05)=0.067，P(p≤0.10)=0.132，双双越过二项 95% 上界）。
  //   v3（当前）：**保持时长多重集不变**，只重新分配「哪次持有多久」。
  //      总暴露时间恒定，对照组与用户在风格上完全同构，差异只剩「配对方式」。
  //
  // 两次都偏在高估用户能力的方向。这类偏差不会让 demo 变难看，只会让用户高兴 ——
  // 所以它只可能被统计检验抓出来，永远不会被「跑一下看看」抓出来。
  const order = src.map((_, i) => i).sort((a, b) => maxDur[a] - maxDur[b]);
  const avail = src.map(t => t.exit - t.entry).sort((a, b) => a - b);

  const assigned = new Array(K);
  for (const i of order) {
    // 二分找出可用时长中 ≤ maxDur[i] 的个数
    let lo = 0, hi = avail.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (avail[mid] <= maxDur[i]) lo = mid + 1; else hi = mid; }
    // 窗口最紧的先挑，理论上总有可行项；真出现无解就退让到最短的那个
    const idx = lo > 0 ? rng.int(lo) : 0;
    assigned[i] = avail[idx];
    avail.splice(idx, 1);
  }

  return src.map((t, i) => ({
    ...t,
    exit: t.entry + Math.max(1, Math.min(assigned[i], maxDur[i])),
  }));
}

/**
 * Null-D 「仓位」
 * 保留：全部入场点、出场点、方向。
 * 随机化：把仓位在各笔之间重新排列（精确置换检验）。
 * → 回答「你在更有把握的机会上下更重的手了吗」。
 *
 * 若所有仓位相同，检验退化（任何排列结果一致），此时返回 null，
 * 报告里必须标注「无法评估」而不是伪造一个 p 值。
 */
export function nullSizing(rng, trades) {
  const sizes = trades.map(t => t.size);
  const allSame = sizes.every(s => s === sizes[0]);
  if (allSame) return null;
  const shuffled = rng.shuffle([...sizes]);
  return trades.map((t, i) => ({ ...t, size: shuffled[i] }));
}

/** 零模型注册表：名称 → 生成器 + 面向用户的解释 */
export const NULL_MODELS = {
  behaviorMatched: {
    key: 'behaviorMatched',
    label: '行为匹配随机交易者',
    dimension: '综合',
    question: '一只交易习惯和你完全一样、但毫无判断力的猴子，能做到多少？',
    gen: (rng, trades, n) => nullBehaviorMatched(rng, trades, n),
  },
  entryTiming: {
    key: 'entryTiming',
    label: '入场时机',
    dimension: '入场时机',
    question: '你选的进场点，比随机撞进去强吗？',
    gen: (rng, trades, n) => nullEntryTiming(rng, trades, n),
  },
  direction: {
    key: 'direction',
    label: '方向判断',
    dimension: '方向',
    question: '你判断的多空方向，比抛硬币强吗？',
    gen: (rng, trades) => nullDirection(rng, trades),
  },
  exitTiming: {
    key: 'exitTiming',
    label: '出场时机',
    dimension: '出场时机',
    question: '你选的离场点，比在同样窗口里随便平掉强吗？',
    gen: (rng, trades, n) => nullExitTiming(rng, trades, n),
  },
  sizing: {
    key: 'sizing',
    label: '仓位管理',
    dimension: '仓位',
    question: '你在更有把握的机会上下更重的手了吗？',
    gen: (rng, trades) => nullSizing(rng, trades),
  },
};
