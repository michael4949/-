/**
 * 行为偏差检测器。
 *
 * 这是「AI 教练」唯一能真正站住脚的地方 —— 因为这里没有 AI。
 * 每一条都是从交易记录里**直接算出来的确定性指标**，可复现、可争辩、可验证。
 * 大模型的作用只是把这些数字翻译成人话（见 src/report.js 的契约），
 * 它不参与判断，也就无法幻觉。
 *
 * 所有指标都返回 { key, label, value, n, severity, evidence }：
 *   severity ∈ {'none','mild','notable','severe','insufficient'}
 *   n 是该指标实际依据的样本量 —— 样本不足时一律给 'insufficient'，
 *   绝不在 5 笔交易上宣称用户「有报复性交易倾向」。
 */

import { mean, quantile } from './stats.js';

const MIN_N = 8; // 低于此样本量的行为结论不予输出

/**
 * 单侧分级：只有**朝着有害方向**的偏离才计为问题。
 *
 * ⚠️ 这里踩过一个真实的坑，值得留着。
 * 早期版本写的是 `Math.abs(value)`，于是处置效应比值 0.34 和 1.66 被同等对待。
 * 但这两者含义完全相反：
 *   比值 > 1 = 亏了扛着、赚了就跑 —— 处置效应，要改；
 *   比值 < 1 = 亏了快砍、赚了拿住 —— 截断亏损让利润奔跑，是教科书级的好习惯。
 * 结果是一个纪律优秀的趋势跟踪者被系统报成「处置效应：明显」。
 *
 * **一个把好行为标成毛病的指标，比没有这个指标更糟** —— 它会主动把用户往错误方向纠。
 * 所以分级一律单侧，反向偏离明确表扬。
 */
function gradeOneSided(value, thresholds) {
  if (value <= 0) return 'none';
  if (value >= thresholds[2]) return 'severe';
  if (value >= thresholds[1]) return 'notable';
  if (value >= thresholds[0]) return 'mild';
  return 'none';
}

/**
 * 处置效应：过早止盈、过久扛亏。
 * 指标 = 亏损单平均持仓时长 / 盈利单平均持仓时长。
 * > 1 表示亏了拿得更久 —— 经典的 Shefrin & Statman (1985) 处置效应。
 */
export function dispositionEffect(rows) {
  const wins = rows.filter(r => r.net > 0), losses = rows.filter(r => r.net < 0);
  if (wins.length < 3 || losses.length < 3) {
    return { key: 'disposition', label: '处置效应（截断盈利 / 扛住亏损）', value: NaN, n: rows.length, severity: 'insufficient', evidence: '盈亏两侧各需至少 3 笔' };
  }
  const hw = mean(wins.map(r => r.holdBars)), hl = mean(losses.map(r => r.holdBars));
  const ratio = hw > 0 ? hl / hw : NaN;
  const favourable = ratio < 0.85;
  return {
    key: 'disposition',
    kind: favourable ? 'strength' : 'problem',
    label: favourable ? '持仓纪律（截断亏损 / 让利润奔跑）' : '处置效应（截断盈利 / 扛住亏损）',
    value: ratio,
    n: rows.length,
    severity: rows.length < MIN_N ? 'insufficient' : gradeOneSided(ratio - 1, [0.25, 0.6, 1.2]),
    evidence: `亏损单平均持仓 ${hl.toFixed(1)} 根，盈利单 ${hw.toFixed(1)} 根，比值 ${ratio.toFixed(2)}`
      + (favourable ? ' —— 亏损砍得比盈利快，方向正确' : ''),
  };
}

/**
 * 报复性交易：亏损之后立刻加码。
 * 指标 = 紧随亏损单之后那笔的平均仓位 / 紧随盈利单之后那笔的平均仓位。
 */
export function revengeTrading(rows) {
  const afterLoss = [], afterWin = [];
  for (let i = 1; i < rows.length; i++) {
    (rows[i - 1].net < 0 ? afterLoss : afterWin).push(rows[i].size);
  }
  if (afterLoss.length < 3 || afterWin.length < 3) {
    return { key: 'revenge', label: '报复性交易（亏损后加码）', value: NaN, n: rows.length, severity: 'insufficient', evidence: '亏损后 / 盈利后各需至少 3 笔' };
  }
  const ml = mean(afterLoss), mw = mean(afterWin);
  const ratio = mw > 0 ? ml / mw : NaN;
  const favourable = ratio < 0.9;
  return {
    key: 'revenge',
    kind: favourable ? 'strength' : 'problem',
    label: favourable ? '亏损后仓位控制' : '报复性交易（亏损后加码）',
    value: ratio,
    n: rows.length,
    severity: rows.length < MIN_N ? 'insufficient' : gradeOneSided(ratio - 1, [0.15, 0.4, 0.8]),
    evidence: `亏损后下一笔均仓 ${ml.toFixed(2)}，盈利后 ${mw.toFixed(2)}，比值 ${ratio.toFixed(2)}`
      + (favourable ? ' —— 亏损后主动减码，未见报复性交易' : ''),
  };
}

/**
 * 交易摩擦占比：手续费与滑点吃掉了多少毛利。
 * 这是「过度交易」最不容争辩的证据 —— 不需要谈心态，直接看钱。
 */
export function frictionDrag(summary) {
  const grossAbs = Math.abs(summary.gross);
  const ratio = grossAbs > 0 ? summary.cost / grossAbs : NaN;
  return {
    key: 'friction',
    label: '交易摩擦占毛利比',
    value: ratio,
    n: summary.count,
    kind: 'problem',
    severity: summary.count < MIN_N ? 'insufficient' : gradeOneSided(ratio, [0.15, 0.3, 0.5]),
    evidence: `毛利 ${summary.gross.toFixed(0)}，成本 ${summary.cost.toFixed(0)}，占比 ${(ratio * 100).toFixed(1)}%`,
  };
}

/**
 * 止损纪律：亏损单 MAE（最大浮亏，单位 R）的离散程度。
 * 有纪律的交易者，亏损单的 MAE 会紧密聚集在止损位附近；
 * 没纪律的，左尾会拖得很长。用 P90/P50 之比刻画。
 */
export function stopDiscipline(rows) {
  const maes = rows.filter(r => r.net < 0).map(r => Math.abs(r.mae));
  if (maes.length < 5) {
    return { key: 'stop', label: '止损纪律（亏损单浮亏离散度）', value: NaN, n: maes.length, severity: 'insufficient', evidence: '需至少 5 笔亏损单' };
  }
  const p50 = quantile(maes, 0.5), p90 = quantile(maes, 0.9);
  const ratio = p50 > 0 ? p90 / p50 : NaN;
  return {
    key: 'stop',
    label: '止损纪律（亏损单浮亏离散度）',
    value: ratio,
    n: maes.length,
    kind: 'problem',
    severity: gradeOneSided(ratio - 1, [0.8, 1.5, 2.5]),
    evidence: `亏损单最大浮亏 中位数 ${p50.toFixed(2)}R，P90 ${p90.toFixed(2)}R，比值 ${ratio.toFixed(2)}`,
  };
}

/**
 * 追涨杀跌：入场前 N 根的动量方向，与开仓方向的一致率。
 * 显著高于 50% = 追随动量；显著低于 = 抄底摸顶。
 * 两者本身都不是错，但和盈亏交叉看就能定位问题。
 */
export function momentumChasing(rows, bars, lookback = 5) {
  let agree = 0, valid = 0;
  for (const r of rows) {
    const j = r.entry - 1;
    if (j - lookback < 0) continue;
    const mom = bars[j].c - bars[j - lookback].c;
    if (mom === 0) continue;
    valid++;
    if (Math.sign(mom) === r.dir) agree++;
  }
  if (valid < MIN_N) {
    return { key: 'momentum', label: '动量偏好（顺势 / 逆势）', value: NaN, n: valid, severity: 'insufficient', evidence: `可判定样本仅 ${valid} 笔` };
  }
  const rate = agree / valid;
  return {
    key: 'momentum',
    label: '动量偏好（顺势 / 逆势）',
    value: rate,
    n: valid,
    // 顺势与逆势本身都不是错，这是**画像**不是问题：一个趋势跟踪者顺动量开仓是设计如此。
    // 强行给它打「严重」标签，等于劝一个纪律良好的趋势交易者去改掉自己的策略。
    kind: 'profile',
    severity: 'none',
    evidence: `${valid} 笔中 ${agree} 笔顺前 ${lookback} 根动量方向开仓（${(rate * 100).toFixed(0)}%）`,
  };
}

/**
 * 保本平仓（breakeven-itis）：出场价紧贴入场价的交易占比。
 * 浮盈回吐到成本价就慌忙平掉，是新手最常见、也最贵的习惯之一。
 */
export function breakevenBias(rows) {
  if (rows.length < MIN_N) {
    return { key: 'breakeven', label: '保本平仓倾向', value: NaN, n: rows.length, severity: 'insufficient', evidence: '样本不足' };
  }
  // 有过 ≥0.5R 浮盈，最终却以 |R| < 0.15 收场的交易
  const gaveBack = rows.filter(r => r.mfe >= 0.5 && Math.abs(r.r) < 0.15).length;
  const rate = gaveBack / rows.length;
  return {
    key: 'breakeven',
    label: '保本平仓倾向（浮盈回吐后平推）',
    value: rate,
    n: rows.length,
    kind: 'problem',
    severity: gradeOneSided(rate, [0.12, 0.22, 0.35]),
    evidence: `${rows.length} 笔中 ${gaveBack} 笔曾有 ≥0.5R 浮盈却以近乎平推收场（${(rate * 100).toFixed(0)}%）`,
  };
}

export function detectBehaviors(evaluated, bars) {
  const { rows } = evaluated;
  return [
    dispositionEffect(rows),
    revengeTrading(rows),
    stopDiscipline(rows),
    momentumChasing(rows, bars),
    breakevenBias(rows),
    frictionDrag(evaluated),
  ];
}
