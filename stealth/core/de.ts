/**
 * 通用差分进化（Differential Evolution, DE/rand/1/bin）全局优化器。
 * 隐身配比是连续、多峰、带约束的反问题，DE 不需要梯度、抗局部最优，
 * 在浏览器里几百毫秒即可收敛——既用于吸波层配比寻优，也用于伪装颜料调色。
 */

export interface DEOptions {
  lower: number[];          // 各维下界
  upper: number[];          // 各维上界
  fn: (x: number[]) => number; // 目标函数（最小化）
  pop?: number;             // 种群规模
  gens?: number;            // 迭代代数
  F?: number;               // 缩放因子
  CR?: number;              // 交叉概率
  seed?: number;            // 随机种子（可复现）
}

export interface DEResult {
  x: number[];
  fx: number;
}

/** 线性同余伪随机，给定种子可复现 */
function makeRng(seed: number) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function differentialEvolution(opts: DEOptions): DEResult {
  const { lower, upper, fn } = opts;
  const dim = lower.length;
  const pop = opts.pop ?? Math.min(60, 12 + dim * 8);
  const gens = opts.gens ?? 80;
  const F = opts.F ?? 0.7;
  const CR = opts.CR ?? 0.9;
  const rng = makeRng(opts.seed ?? 12345);

  const clamp = (v: number, i: number) => Math.min(upper[i], Math.max(lower[i], v));

  // 初始化种群
  const X: number[][] = [];
  const fX: number[] = [];
  for (let i = 0; i < pop; i++) {
    const x = lower.map((lo, d) => lo + rng() * (upper[d] - lo));
    X.push(x);
    fX.push(fn(x));
  }

  let bestIdx = 0;
  for (let i = 1; i < pop; i++) if (fX[i] < fX[bestIdx]) bestIdx = i;

  for (let g = 0; g < gens; g++) {
    for (let i = 0; i < pop; i++) {
      // 选 3 个互异个体
      let a = i, b = i, c = i;
      while (a === i) a = (rng() * pop) | 0;
      while (b === i || b === a) b = (rng() * pop) | 0;
      while (c === i || c === a || c === b) c = (rng() * pop) | 0;

      const R = (rng() * dim) | 0; // 保证至少一维交叉
      const trial = X[i].slice();
      for (let d = 0; d < dim; d++) {
        if (rng() < CR || d === R) {
          trial[d] = clamp(X[a][d] + F * (X[b][d] - X[c][d]), d);
        }
      }
      const ft = fn(trial);
      if (ft <= fX[i]) {
        X[i] = trial;
        fX[i] = ft;
        if (ft < fX[bestIdx]) bestIdx = i;
      }
    }
  }
  return { x: X[bestIdx], fx: fX[bestIdx] };
}
