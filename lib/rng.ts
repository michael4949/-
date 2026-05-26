// 可重复的种子随机数生成（mulberry32）
export function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type RNG = () => number;

export function pick<T>(rng: RNG, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

export function pickWeighted<T>(rng: RNG, items: readonly { item: T; weight: number }[]): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = rng() * total;
  for (const it of items) {
    r -= it.weight;
    if (r <= 0) return it.item;
  }
  return items[items.length - 1].item;
}

export function randInt(rng: RNG, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function randFloat(rng: RNG, min: number, max: number): number {
  return rng() * (max - min) + min;
}

// 正态分布（Box-Muller）
export function randNormal(rng: RNG, mean = 0, std = 1): number {
  const u1 = Math.max(rng(), 1e-9);
  const u2 = rng();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * std;
}

// 季节性日内规律：早晨低，工作时段高，凌晨低
export function diurnalFactor(hour: number): number {
  // hour: 0-23
  const peak = 14; // 下午 2 点峰值
  const dist = Math.min(Math.abs(hour - peak), 24 - Math.abs(hour - peak));
  return 0.4 + 0.6 * Math.cos((dist / 12) * Math.PI) ** 2;
}

// 周内规律：工作日高，周末低
export function weeklyFactor(dayOfWeek: number): number {
  // 0=Sun ... 6=Sat
  if (dayOfWeek === 0 || dayOfWeek === 6) return 0.6;
  return 1.0;
}
