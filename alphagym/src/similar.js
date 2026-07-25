/**
 * 相似历史行情检索。
 *
 * ── 它输出什么，以及为什么这很重要 ──
 *
 * 输出**不是**「后市看涨」这样的结论，而是一个**条件分布**：
 *
 *     命中 87 个形态相似的历史片段，它们之后 20 根 K 线：
 *     上涨占 54%，涨幅中位数 +0.8%，但 5% 分位是 −4.2%
 *
 * 这个差别是刻意的，有两层理由：
 *   1. **诚实**：历史相似不蕴含未来相同。给分布是它能支撑的最强结论，给方向不是。
 *   2. **合规**：分布是对历史的描述性统计，方向结论是对未来的预测。
 *      后者在国内需要投顾资质，前者不需要。
 *
 * ── 编码方式 ──
 *
 * 窗口 → 对数收益 → 累积成形态曲线 → z-score 标准化 → PAA 降维。
 * 标准化这一步很关键：它让「茅台涨 10%」和「螺纹涨 10%」落在同一个空间里，
 * 检索到的是**形态**而不是**价位**。
 */

/** 分段聚合近似：把长度 n 的序列压成长度 dim 的均值序列 */
function paa(arr, dim) {
  const out = new Float64Array(dim);
  const n = arr.length;
  for (let i = 0; i < dim; i++) {
    const lo = Math.floor(i * n / dim), hi = Math.max(lo + 1, Math.floor((i + 1) * n / dim));
    let s = 0;
    for (let k = lo; k < hi; k++) s += arr[k];
    out[i] = s / (hi - lo);
  }
  return out;
}

/**
 * 把一段 K 线编码成形态向量。
 * @param {Array} bars
 * @param {number} end   窗口结束索引（含）
 * @param {number} window 窗口长度
 * @param {number} dim   目标维度
 * @returns {Float64Array|null}
 */
export function encode(bars, end, window, dim) {
  const start = end - window + 1;
  if (start < 1 || end >= bars.length) return null;

  // 累积对数收益 → 形态曲线（与绝对价位无关）
  const curve = new Float64Array(window);
  let acc = 0;
  for (let i = 0; i < window; i++) {
    const j = start + i;
    const pc = bars[j - 1].c;
    if (!(pc > 0) || !(bars[j].c > 0)) return null;
    acc += Math.log(bars[j].c / pc);
    curve[i] = acc;
  }

  // z-score：抹掉整体涨跌幅度与波动率，只留形状
  let mean = 0;
  for (const v of curve) mean += v;
  mean /= window;
  let sd = 0;
  for (const v of curve) sd += (v - mean) ** 2;
  sd = Math.sqrt(sd / window);
  if (!(sd > 1e-12)) return null;      // 完全走平的窗口没有形态可言

  const z = new Float64Array(window);
  for (let i = 0; i < window; i++) z[i] = (curve[i] - mean) / sd;
  return paa(z, dim);
}

/**
 * 为全部数据集建立检索索引。
 * @param {Object} datasets { symbol: {bars, display} }
 */
export function buildIndex(datasets, { window = 60, stride = 2, dim = 24, horizon = 20 } = {}) {
  const vectors = [];
  const meta = [];
  for (const [sym, ds] of Object.entries(datasets)) {
    const bars = ds.bars;
    for (let end = window; end + horizon < bars.length; end += stride) {
      const v = encode(bars, end, window, dim);
      if (!v) continue;
      vectors.push(v);
      meta.push({ symbol: sym, display: ds.display || sym, end, t: bars[end].t });
    }
  }
  return { vectors, meta, window, dim, horizon, size: meta.length };
}

/** 欧氏距离平方 */
function dist2(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; s += d * d; }
  return s;
}

/**
 * 检索最相似的历史片段。
 * @param {Float64Array} query 形态向量
 * @param {Object} index buildIndex 的产物
 * @param {Object} opts
 * @param {{symbol:string, end:number}} [opts.exclude] 排除查询自身附近的窗口，
 *        否则返回的最相似片段永远是它自己 —— 这是形态检索最常见的假成功。
 */
export function search(query, index, { k = 8, exclude = null, excludeGap = null } = {}) {
  const gap = excludeGap ?? index.window;
  const scored = [];
  for (let i = 0; i < index.vectors.length; i++) {
    const m = index.meta[i];
    if (exclude && m.symbol === exclude.symbol && Math.abs(m.end - exclude.end) < gap) continue;
    scored.push({ i, d: dist2(query, index.vectors[i]) });
  }
  scored.sort((a, b) => a.d - b.d);

  // 相似度：把距离映射到 0~1。dim 维 z-score 向量的距离平方上界约为 4·dim，
  // 用它做归一化，得到一个可解释、单调、且不同 dim 之间可比的分数。
  const scale = 4 * index.dim;
  return scored.slice(0, k).map(s => ({
    ...index.meta[s.i],
    distance: Math.sqrt(s.d),
    similarity: Math.max(0, 1 - Math.sqrt(s.d / scale)),
  }));
}

/** 分位数（线性插值，与 stats.js 口径一致） */
function q(sorted, p) {
  if (!sorted.length) return NaN;
  const pos = (sorted.length - 1) * p;
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  return lo === hi ? sorted[lo] : sorted[lo] + (pos - lo) * (sorted[hi] - sorted[lo]);
}

/**
 * 命中片段之后的走势分布。**这是本模块的最终产物** —— 分布，不是结论。
 */
export function forwardStats(matches, datasets, horizon = 20) {
  const rets = [];
  for (const m of matches) {
    const bars = datasets[m.symbol]?.bars;
    if (!bars) continue;
    const a = bars[m.end], b = bars[m.end + horizon];
    if (!a || !b || !(a.c > 0)) continue;
    rets.push((b.c - a.c) / a.c);
  }
  if (!rets.length) return null;
  const s = [...rets].sort((x, y) => x - y);
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  return {
    n: rets.length,
    horizon,
    upRate: rets.filter(r => r > 0).length / rets.length,
    mean,
    median: q(s, 0.5),
    p05: q(s, 0.05),
    p25: q(s, 0.25),
    p75: q(s, 0.75),
    p95: q(s, 0.95),
    worst: s[0],
    best: s[s.length - 1],
    returns: rets,
  };
}

/**
 * 一步到位：给定当前窗口，返回相似片段 + 它们之后的走势分布。
 */
export function findSimilar(datasets, symbol, end, index, { k = 8 } = {}) {
  const bars = datasets[symbol]?.bars;
  if (!bars) return { ok: false, reason: `没有 ${symbol} 的数据` };
  const vec = encode(bars, end, index.window, index.dim);
  if (!vec) return { ok: false, reason: '当前窗口无法编码（数据不足或走势完全走平）' };
  const matches = search(vec, index, { k, exclude: { symbol, end } });
  if (!matches.length) return { ok: false, reason: '索引中没有可比较的片段' };
  return {
    ok: true,
    query: { symbol, end, t: bars[end].t, window: index.window },
    matches,
    stats: forwardStats(matches, datasets, index.horizon),
  };
}
