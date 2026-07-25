/**
 * K 线序列与其派生量。
 *
 * 关键约定（整个引擎都依赖它，改动前务必想清楚）：
 *   - bars 是**按时间升序**的数组，索引 i 即「第 i 根 K 线」。
 *   - 成交价一律取自 bar 的 open 字段，即 `fillRule: 'open'`。
 *     含义是：交易者在第 i-1 根收盘时做出决策，在第 i 根开盘成交。
 *     这样**结构上就不可能出现未来函数** —— 决策时点永远看不到成交那根 K 线的任何信息。
 *     （demo 版本用 close 成交，等于允许用当根收盘价决策再用同一价格成交，是隐性未来函数。）
 */

/** @typedef {{t:number,o:number,h:number,l:number,c:number,v:number}} Bar */

/** 校验并规范化 K 线数组，尽早暴露脏数据而不是让它污染统计结果。 */
export function normalizeBars(raw) {
  const bars = [];
  for (let i = 0; i < raw.length; i++) {
    const b = raw[i];
    const o = +b.o, h = +b.h, l = +b.l, c = +b.c;
    if (![o, h, l, c].every(Number.isFinite)) {
      throw new Error(`bar[${i}] 含非有限价格: ${JSON.stringify(b)}`);
    }
    if (h < Math.max(o, c) - 1e-9 || l > Math.min(o, c) + 1e-9) {
      throw new Error(`bar[${i}] 高低价与开收价矛盾: h=${h} l=${l} o=${o} c=${c}`);
    }
    bars.push({ t: +b.t || i, o, h, l, c, v: +b.v || 0 });
  }
  for (let i = 1; i < bars.length; i++) {
    if (bars[i].t < bars[i - 1].t) throw new Error(`bar[${i}] 时间倒序，请先按时间升序排序`);
  }
  return bars;
}

/**
 * 真实波幅 ATR。
 *
 * 为什么整个引擎用 ATR 而不是百分比来度量收益：
 * 交易者的「一次判断」在不同品种、不同波动率环境下，绝对盈亏差几个数量级。
 * 用 ATR 归一化后（即 R 倍数），螺纹钢和茅台的一笔交易才可比，
 * 用户跨月、跨品种的能力曲线才有意义。
 *
 * @returns {Float64Array} 长度同 bars；前 period 根用递增窗口的均值填充
 */
export function atr(bars, period = 14) {
  const n = bars.length;
  const out = new Float64Array(n);
  if (n === 0) return out;
  const tr = new Float64Array(n);
  tr[0] = bars[0].h - bars[0].l;
  for (let i = 1; i < n; i++) {
    const pc = bars[i - 1].c;
    tr[i] = Math.max(bars[i].h - bars[i].l, Math.abs(bars[i].h - pc), Math.abs(bars[i].l - pc));
  }
  // Wilder 平滑；前 period 根用简单均值预热，避免开头出现 0 导致 R 除零
  let acc = 0;
  for (let i = 0; i < n; i++) {
    if (i < period) {
      acc += tr[i];
      out[i] = acc / (i + 1);
    } else {
      out[i] = (out[i - 1] * (period - 1) + tr[i]) / period;
    }
    if (!(out[i] > 0)) out[i] = i > 0 ? out[i - 1] : 1e-9;
  }
  return out;
}

/** 收盘价对数收益 */
export function logReturns(bars) {
  const out = new Float64Array(Math.max(0, bars.length - 1));
  for (let i = 1; i < bars.length; i++) out[i - 1] = Math.log(bars[i].c / bars[i - 1].c);
  return out;
}

/**
 * 简易行情状态标注（趋势 / 震荡 / 高波动）。
 * 这是自适应出题（IRT 分维度能力估计）的前置标签，也用于报告里的分场景归因。
 * 刻意保持规则简单可解释 —— 用户要能看懂「为什么这段被判为震荡」。
 */
export function regimeLabels(bars, { window = 20, atrPeriod = 14 } = {}) {
  const n = bars.length;
  const a = atr(bars, atrPeriod);
  const labels = new Array(n).fill('unknown');
  const atrSorted = Array.from(a).sort((x, y) => x - y);
  const hiVolCut = atrSorted[Math.floor(atrSorted.length * 0.7)] ?? Infinity;

  for (let i = window; i < n; i++) {
    const start = bars[i - window].c, end = bars[i].c;
    // 净位移 / 路径长度 —— 效率比，接近 1 是单边趋势，接近 0 是来回震荡
    let path = 0;
    for (let k = i - window + 1; k <= i; k++) path += Math.abs(bars[k].c - bars[k - 1].c);
    const efficiency = path > 0 ? Math.abs(end - start) / path : 0;
    const highVol = a[i] >= hiVolCut;
    if (efficiency >= 0.35) labels[i] = end >= start ? 'trend_up' : 'trend_down';
    else labels[i] = highVol ? 'choppy_volatile' : 'range';
  }
  return labels;
}

/** 便捷：从 {t,o,h,l,c,v} 的列式数组构造 bars */
export function barsFromColumns({ t, o, h, l, c, v }) {
  const n = c.length;
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = { t: t ? t[i] : i, o: o[i], h: h[i], l: l[i], c: c[i], v: v ? v[i] : 0 };
  }
  return normalizeBars(out);
}

/**
 * 重采样到更大周期。
 *
 * 这是「多周期同步步进」的基础：交易者在真实盘面上不会只看一个周期，
 * 大周期定方向、小周期找入场点。只给单周期的训练，练的是一个不存在的场景。
 *
 * 关键约束：**返回的每一根大周期 K 线，都必须标出它由哪些小周期 K 线合成**，
 * 这样回放时才能做到「小周期推进到第 i 根，大周期只显示已经完成的部分」——
 * 否则大周期图会提前泄露未来（比如周一就画出了整根周线的最高价）。
 *
 * @param {Bar[]} bars 小周期 K 线
 * @param {number} factor 合成倍数（如日线→周线用 5）
 * @returns {{bars: Bar[], srcEnd: number[]}} srcEnd[i] = 第 i 根大周期对应的小周期结束索引
 */
export function resample(bars, factor) {
  if (!(factor > 1)) return { bars: bars.slice(), srcEnd: bars.map((_, i) => i) };
  const out = [], srcEnd = [];
  for (let i = 0; i < bars.length; i += factor) {
    const chunk = bars.slice(i, Math.min(i + factor, bars.length));
    if (!chunk.length) break;
    let h = -Infinity, l = Infinity, v = 0;
    for (const b of chunk) { h = Math.max(h, b.h); l = Math.min(l, b.l); v += b.v; }
    out.push({ t: chunk[0].t, o: chunk[0].o, h, l, c: chunk[chunk.length - 1].c, v });
    srcEnd.push(i + chunk.length - 1);
  }
  return { bars: out, srcEnd };
}

/**
 * 在不泄露未来的前提下，取截至小周期第 cursor 根为止的大周期 K 线。
 * 最后一根是**未完成**的（用已出现的部分合成），这正是真实盘面上看到的样子。
 */
export function resampledUpTo(bars, factor, cursor) {
  if (!(factor > 1)) return bars.slice(0, cursor + 1);
  const out = [];
  for (let i = 0; i <= cursor; i += factor) {
    const end = Math.min(i + factor - 1, cursor);
    let h = -Infinity, l = Infinity, v = 0;
    for (let k = i; k <= end; k++) { h = Math.max(h, bars[k].h); l = Math.min(l, bars[k].l); v += bars[k].v; }
    out.push({ t: bars[i].t, o: bars[i].o, h, l, c: bars[end].c, v });
  }
  return out;
}
