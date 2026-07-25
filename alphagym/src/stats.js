/**
 * 统计基础件。全部为纯函数，无依赖，浏览器 / Node 通用。
 *
 * 这里每一个函数都会直接影响报告里对用户说的话，所以宁可写慢一点也要写对：
 * 分位数用线性插值（type-7，和 numpy/R 默认一致），p 值一律用 +1 修正。
 */

export function mean(xs) {
  if (xs.length === 0) return NaN;
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}

/** 样本标准差（n-1） */
export function std(xs) {
  const n = xs.length;
  if (n < 2) return NaN;
  const m = mean(xs);
  let s = 0;
  for (const x of xs) { const d = x - m; s += d * d; }
  return Math.sqrt(s / (n - 1));
}

/** 样本偏度（无偏调整） */
export function skewness(xs) {
  const n = xs.length;
  if (n < 3) return 0;
  const m = mean(xs), sd = std(xs);
  if (!(sd > 0)) return 0;
  let s = 0;
  for (const x of xs) s += Math.pow((x - m) / sd, 3);
  return (n / ((n - 1) * (n - 2))) * s;
}

/** 样本峰度（非超额，正态 ≈ 3） */
export function kurtosis(xs) {
  const n = xs.length;
  if (n < 4) return 3;
  const m = mean(xs), sd = std(xs);
  if (!(sd > 0)) return 3;
  let s = 0;
  for (const x of xs) s += Math.pow((x - m) / sd, 4);
  const g2 = (n * (n + 1) / ((n - 1) * (n - 2) * (n - 3))) * s
    - (3 * (n - 1) * (n - 1)) / ((n - 2) * (n - 3));
  return g2 + 3;
}

/**
 * 分位数，type-7 线性插值（与 numpy.percentile / R quantile 默认一致）。
 * @param {number[]} sorted 已升序排列
 * @param {number} q 0..1
 */
export function quantileSorted(sorted, q) {
  const n = sorted.length;
  if (n === 0) return NaN;
  if (n === 1) return sorted[0];
  const pos = (n - 1) * Math.min(1, Math.max(0, q));
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (pos - lo) * (sorted[hi] - sorted[lo]);
}

export function quantile(xs, q) {
  return quantileSorted([...xs].sort((a, b) => a - b), q);
}

/**
 * 经验百分位：观测值在样本分布中的位置（0..1）。
 * 用「小于 + 一半等于」的中点法处理并列，避免离散分布上系统性高估。
 */
export function percentileOf(sample, obs) {
  let less = 0, eq = 0;
  for (const v of sample) {
    if (v < obs) less++;
    else if (v === obs) eq++;
  }
  return (less + 0.5 * eq) / sample.length;
}

/**
 * 蒙特卡洛 / 置换检验的单尾 p 值，带 +1 修正。
 *
 * 为什么必须 +1：不加修正时，B 次抽样里一次都没超过观测值就会报 p=0，
 * 那是在宣称「绝无可能」——而实际上你只是没抽到。加 1 后最小 p 为 1/(B+1)，
 * 诚实地反映了抽样次数带来的分辨率上限。（Phipson & Smyth, 2010）
 *
 * @param {number[]} nullSample 原假设下的统计量样本
 * @param {number} obs 观测统计量
 * @param {'greater'|'less'|'two-sided'} side
 */
export function pValue(nullSample, obs, side = 'greater') {
  const B = nullSample.length;
  if (B === 0) return NaN;
  if (side === 'two-sided') {
    const p1 = pValue(nullSample, obs, 'greater');
    const p2 = pValue(nullSample, obs, 'less');
    return Math.min(1, 2 * Math.min(p1, p2));
  }
  let cnt = 0;
  for (const v of nullSample) {
    if (side === 'greater' ? v >= obs : v <= obs) cnt++;
  }
  return (1 + cnt) / (B + 1);
}

/**
 * Holm–Bonferroni 逐步降序校正，控制族错误率 (FWER)。
 *
 * 为什么必须做：报告同时检验 4 个决策维度。即便用户毫无技能，
 * 「至少有一个维度 p ≤ 0.05」的概率是 1-0.95⁴ ≈ 19%，而不是 5%。
 * 不校正的话，每五个无技能用户里就有一个会被告知「你的仓位管理明显优于随机」——
 * 系统在批量制造虚假的能力认证。
 *
 * 选 Holm 而非 Bonferroni：同样严格控制 FWER，但检验力更高，
 * 不会把真实存在的弱优势一并抹掉。
 *
 * @param {number[]} ps 原始 p 值
 * @returns {number[]} 同序返回校正后的 p 值（已保证单调不减）
 */
export function holmAdjust(ps) {
  const m = ps.length;
  if (m === 0) return [];
  const idx = ps.map((p, i) => [p, i]).sort((a, b) => a[0] - b[0]);
  const adj = new Array(m);
  let running = 0;
  for (let k = 0; k < m; k++) {
    const [p, i] = idx[k];
    running = Math.max(running, Math.min(1, (m - k) * p));  // 强制单调
    adj[i] = running;
  }
  return adj;
}

/** 蒙特卡洛 p 值自身的标准误 —— 用来判断「跑 2000 次够不够」 */
export function pValueStdErr(p, B) {
  return Math.sqrt(Math.max(0, p * (1 - p)) / B);
}

/** 标准正态 CDF。Abramowitz–Stegun 26.2.17，绝对误差 < 7.5e-8 */
export function normalCdf(x) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014327 * Math.exp(-x * x / 2);
  const p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 +
    t * (-1.821255978 + t * 1.330274429))));
  return x >= 0 ? 1 - p : p;
}

/** 标准正态分位函数。Acklam 有理逼近，相对误差 < 1.15e-9 */
export function normalInv(p) {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02,
    1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02,
    6.680131188771972e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00,
    -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00,
    3.754408661907416e+00];
  const pl = 0.02425, ph = 1 - pl;
  let q, r;
  if (p < pl) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > ph) {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  q = p - 0.5; r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
    (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

/**
 * 概率夏普比率 PSR —— 「真实夏普 > 基准」的概率。
 * Bailey & López de Prado (2012)。相比裸夏普，它把样本量、偏度、峰度都算进去了：
 * 同样是 1.5 的夏普，20 笔样本和 200 笔样本的可信度天差地别，PSR 会如实反映。
 *
 * @param {number} sr 观测夏普（与 returns 同频，未年化）
 * @param {number} n 样本数
 * @param {number} skew 偏度
 * @param {number} kurt 峰度（非超额）
 * @param {number} srBenchmark 基准夏普，默认 0
 */
export function probabilisticSharpe(sr, n, skew, kurt, srBenchmark = 0) {
  if (!(n > 1) || !Number.isFinite(sr)) return NaN;
  const denom = Math.sqrt(Math.max(1e-12, 1 - skew * sr + ((kurt - 1) / 4) * sr * sr));
  return normalCdf(((sr - srBenchmark) * Math.sqrt(n - 1)) / denom);
}

/**
 * 达到统计显著所需的最小样本量。
 * 单尾检验，效应量 d = 每笔平均收益 / 每笔收益标准差。
 * n ≈ (z_{1-α} + z_{1-β})² / d²
 */
export function requiredSampleSize(effectSize, alpha = 0.05, power = 0.8) {
  const d = Math.abs(effectSize);
  if (!(d > 1e-9)) return Infinity;
  const z = normalInv(1 - alpha) + normalInv(power);
  return Math.ceil((z * z) / (d * d));
}

/** 均值的自助法置信区间 */
export function bootstrapMeanCi(rng, xs, iters = 2000, level = 0.95) {
  const n = xs.length;
  if (n < 2) return { lo: NaN, hi: NaN };
  const means = new Float64Array(iters);
  for (let b = 0; b < iters; b++) {
    let s = 0;
    for (let i = 0; i < n; i++) s += xs[rng.int(n)];
    means[b] = s / n;
  }
  const sorted = Array.from(means).sort((a, b) => a - b);
  const a = (1 - level) / 2;
  return { lo: quantileSorted(sorted, a), hi: quantileSorted(sorted, 1 - a) };
}

/** 单样本 Kolmogorov–Smirnov 统计量，检验样本是否服从 Uniform(0,1)。用于校准测试。 */
export function ksUniform(xs) {
  const n = xs.length;
  if (n === 0) return { d: NaN, p: NaN };
  const s = [...xs].sort((a, b) => a - b);
  let d = 0;
  for (let i = 0; i < n; i++) {
    d = Math.max(d, (i + 1) / n - s[i], s[i] - i / n);
  }
  // Kolmogorov 分布的渐近尾概率
  const lam = (Math.sqrt(n) + 0.12 + 0.11 / Math.sqrt(n)) * d;
  let p = 0;
  for (let k = 1; k <= 100; k++) p += 2 * Math.pow(-1, k - 1) * Math.exp(-2 * k * k * lam * lam);
  return { d, p: Math.min(1, Math.max(0, p)) };
}

export function sum(xs) { let s = 0; for (const x of xs) s += x; return s; }
export function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
