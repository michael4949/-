// 稳定的伪随机 (Mulberry32)，保证 Mock 数据每次刷新一致
export function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6D2B79F5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickOne<T>(arr: readonly T[], rnd: () => number): T {
  return arr[Math.floor(rnd() * arr.length)];
}

export function pickWeighted<T>(items: { v: T; w: number }[], rnd: () => number): T {
  const total = items.reduce((s, x) => s + x.w, 0);
  let r = rnd() * total;
  for (const it of items) { r -= it.w; if (r <= 0) return it.v; }
  return items[items.length - 1].v;
}

export function intRange(min: number, max: number, rnd: () => number) {
  return Math.floor(min + rnd() * (max - min + 1));
}
