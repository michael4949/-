/** Deterministic seeded RNG (mulberry32) so every demo render is identical. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const fmtWan = (n: number) => `${n.toLocaleString('zh-CN', { maximumFractionDigits: 0 })} 万`;
export const fmtYi = (n: number) => `${(n / 10000).toFixed(2)} 亿`;
export const pct = (n: number, d = 1) => `${(n * 100).toFixed(d)}%`;
