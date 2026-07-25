/**
 * 确定性随机数发生器。
 *
 * 为什么不用 Math.random：整个反事实引擎的结论（p 值、百分位）必须**可复现、可审计**。
 * 同一份交易记录 + 同一个 seed，任何人在任何机器上跑出的报告必须逐字节一致 ——
 * 否则一旦用于排行榜或机构选拔，成绩就无法申诉。
 */

/** xoshiro128** —— 比 mulberry32 周期更长、低位随机性更好，仍然只有 128 位状态。 */
export function makeRng(seed = 0x9e3779b9) {
  // 用 splitmix32 把单个 seed 铺开成 4 个状态字，避免相邻 seed 产生相关序列
  let s = seed >>> 0;
  const splitmix = () => {
    s = (s + 0x9e3779b9) >>> 0;
    let z = s;
    z = Math.imul(z ^ (z >>> 16), 0x21f0aaad) >>> 0;
    z = Math.imul(z ^ (z >>> 15), 0x735a2d97) >>> 0;
    return (z ^ (z >>> 15)) >>> 0;
  };
  let a = splitmix(), b = splitmix(), c = splitmix(), d = splitmix();
  if ((a | b | c | d) === 0) a = 1;

  /** @returns {number} [0,1) */
  const next = () => {
    const t = Math.imul(b, 5);
    const r = (((t << 7) | (t >>> 25)) >>> 0);
    const result = Math.imul(r, 9) >>> 0;
    const bb = b << 9;
    c ^= a; d ^= b; b ^= c; a ^= d; c ^= bb;
    d = ((d << 11) | (d >>> 21)) >>> 0;
    // 取高 24 位映射到 [0,1)，避免低位偏差
    return (result >>> 8) / 0x1000000;
  };

  return {
    next,
    /** [0, n) 上的均匀整数 */
    int(n) { return Math.floor(next() * n); },
    /** 标准正态，Box–Muller（缓存第二个值） */
    normal: (() => {
      let cached = null;
      return () => {
        if (cached !== null) { const v = cached; cached = null; return v; }
        let u = 0, v = 0;
        while (u === 0) u = next();
        while (v === 0) v = next();
        const mag = Math.sqrt(-2 * Math.log(u));
        cached = mag * Math.sin(2 * Math.PI * v);
        return mag * Math.cos(2 * Math.PI * v);
      };
    })(),
    /** 原地 Fisher–Yates 洗牌 */
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
      }
      return arr;
    },
    /** 从数组中有放回抽样一个元素 */
    pick(arr) { return arr[Math.floor(next() * arr.length)]; },
  };
}

/**
 * 把 K 个非负整数间隔均匀地分配总量 S（stars-and-bars 的连续松弛）。
 * 用于在时间轴上随机放置固定时长的交易而不重叠。
 * @returns {number[]} 长度 k 的非负整数数组，和为 s
 */
export function randomComposition(rng, k, s) {
  if (k <= 0) return [];
  if (s <= 0) return new Array(k).fill(0);
  if (k === 1) return [s];

  // 严格均匀的整数 stars-and-bars：
  // 从 {1..s+k-1} 中**不放回**地抽 k-1 个位置作为隔板，排序后相邻隔板之间的
  // 空位数即为各部分的大小。这在 C(s+k-1, k-1) 种组合上是精确均匀的。
  //
  // 早期版本用「连续均匀切点 + 向下取整 + 随机补余」，看起来差不多，
  // 实际上会给某些组合更高的概率。后果直接体现在校准测试上：
  // Null-A（入场时机）的 p 值分布出现了可检出的偏离（KS p≈0.01）。
  // 零模型的抽样分布只要不是严格均匀，p 值就不再是 p 值。
  const need = k - 1;
  const range = s + k - 1;
  const picked = new Set();
  if (need * 2 < range) {
    while (picked.size < need) picked.add(1 + rng.int(range));
  } else {
    // 需要抽的比例太高时，改用部分 Fisher–Yates，避免拒绝采样退化
    const pool = new Array(range);
    for (let i = 0; i < range; i++) pool[i] = i + 1;
    for (let i = 0; i < need; i++) {
      const j = i + rng.int(range - i);
      const t = pool[i]; pool[i] = pool[j]; pool[j] = t;
      picked.add(pool[i]);
    }
  }
  const bars = [...picked].sort((a, b) => a - b);

  const out = new Array(k);
  let prev = 0;
  for (let i = 0; i < need; i++) {
    out[i] = bars[i] - prev - 1;
    prev = bars[i];
  }
  out[k - 1] = range - prev;
  return out;
}
