/**
 * 报告呈现层，两个出口：
 *   renderText()    → 人读的纯文本报告
 *   toLlmPayload()  → 喂给大模型的**结构化事实包** + 硬约束系统提示
 *
 * ── 关于 LLM 的边界，这是全项目最重要的一条工程纪律 ──
 *
 * 大模型在这里只做一件事：把已经算好的数字翻译成人话。
 * 它拿不到 K 线，拿不到原始成交记录，只拿到一份 JSON。
 * 因此它**没有能力**编造一个不存在的形态、一段不存在的行情、一个没算过的结论 ——
 * 不是靠提示词恳求它别幻觉，而是靠信息隔离让幻觉在物理上无从发生。
 *
 * 附带的两个好处：
 *   1. 可审计：报告里每句话都能追溯到 payload 里的某个字段。出了争议能查账。
 *   2. 可合规：输出全部是对历史行为的描述性归因，结构上就不包含价格预测和买卖建议。
 */

const pct = (v) => `${(v * 100).toFixed(1)}%`;
const sgn = (v, d = 2) => `${v >= 0 ? '+' : ''}${v.toFixed(d)}`;

const SEVERITY_LABEL = {
  none: '正常', mild: '轻微', notable: '明显', severe: '严重', insufficient: '样本不足',
};

export function renderText(report) {
  if (!report.observed) return `【无法生成报告】${report.verdict.text}`;
  const L = [];
  const { observed: o, headline: h, meta } = report;

  L.push('═'.repeat(72));
  L.push('  交易能力评估报告 · 反事实基准');
  L.push(`  ${meta.instrument.symbol} · ${meta.barCount} 根 K 线 · ${o.trades} 笔交易`);
  L.push(`  引擎 v${meta.engineVersion} · seed=${meta.seed} · 蒙特卡洛 ${meta.iterations} 次 · 结果可复现`);
  L.push('═'.repeat(72));

  L.push('\n【本轮成绩】');
  L.push(`  净收益        ${sgn(o.totalR)} R   (${sgn(o.netCurrency, 0)} 元，已扣 ${o.costCurrency.toFixed(0)} 元成本)`);
  L.push(`  胜率          ${pct(o.winRate)}        盈亏比 ${Number.isFinite(o.profitFactor) ? o.profitFactor.toFixed(2) : '—'}`);
  L.push(`  每笔均值      ${sgn(o.avgR)} R   (95% 置信区间 ${sgn(o.avgRCi95.lo)} ~ ${sgn(o.avgRCi95.hi)} R)`);
  L.push(`  最大回撤      ${o.maxDrawdownR.toFixed(2)} R`);
  L.push(`  每笔夏普      ${o.perTradeSharpe.toFixed(3)}      夏普为正的概率 ${pct(o.probabilisticSharpe)}`);

  if (h && h.available) {
    L.push('\n【这是技能还是运气】');
    L.push(`  对照组：${h.label} —— ${h.question}`);
    L.push(`  你          ${sgn(h.observedR)} R`);
    L.push(`  对照组中位  ${sgn(h.nullMedianR)} R      (5%~95% 区间 ${sgn(h.nullP05R)} ~ ${sgn(h.nullP95R)} R)`);
    L.push(`  你的位置    第 ${(h.percentile * 100).toFixed(0)} 百分位`);
    L.push(`  p 值        ${h.pValue.toFixed(4)}  ± ${h.pValueStdErr.toFixed(4)} (蒙特卡洛误差)`);
    L.push(`\n  → ${report.verdict.text}`);
  }

  const avail = report.attribution.filter(a => a.available);
  if (avail.length) {
    L.push('\n【四个决策维度，哪一块在拖后腿】');
    L.push('  维度        边际贡献      效应量Z   原始p   校正p    判读');
    L.push('  ' + '─'.repeat(70));
    const sorted = [...avail].sort((a, b) => a.edgeR - b.edgeR);
    for (const a of sorted) {
      const pa = a.pValueAdjusted ?? a.pValue;   // 判读一律以校正后 p 值为准
      const verdict = pa <= 0.05 ? '明显优于随机'
        : pa <= 0.2 ? '略优，未达显著'
          : a.percentile < 0.35 ? '劣于随机 ← 优先训练' : '与随机无异';
      L.push(`  ${a.label.padEnd(10)}  ${sgn(a.edgeR).padStart(8)} R   ${sgn(a.effectZ).padStart(6)}  ${a.pValue.toFixed(3)}   ${pa.toFixed(3)}   ${verdict}`);
    }
  }
  const unavail = report.attribution.filter(a => !a.available);
  for (const a of unavail) L.push(`  ${a.label.padEnd(10)}  无从评估 —— ${a.reason}`);

  if (report.benchmarks.length) {
    L.push('\n【参照标尺】');
    for (const b of report.benchmarks) {
      L.push(`  ${b.label.padEnd(22)} ${sgn(b.totalR).padStart(9)} R   (${b.count} 笔)`);
    }
    L.push(`  ${'你'.padEnd(22)} ${sgn(o.totalR).padStart(9)} R   (${o.trades} 笔)`);
  }

  const p = report.power;
  L.push('\n【还需要多少样本才能下结论】');
  L.push(`  当前 ${p.currentTrades} 笔，每笔效应量 ${p.effectSizePerTrade.toFixed(3)}`);
  L.push(Number.isFinite(p.requiredTrades)
    ? `  在 95% 置信度、80% 检验力下需要约 ${p.requiredTrades} 笔，还差 ${p.shortfall} 笔`
    : '  当前效应量约等于零，无论积累多少样本都无法证明存在优势');

  const bh = report.behavior.filter(b => b.severity !== 'insufficient' && b.severity !== 'none');
  if (bh.length) {
    L.push('\n【行为特征】（全部由交易记录直接计算，不含模型推测）');
    for (const b of bh) L.push(`  [${SEVERITY_LABEL[b.severity]}] ${b.label}：${b.evidence}`);
  }

  L.push('\n【必须知道的局限】');
  report.caveats.forEach((c, i) => L.push(`  ${i + 1}. ${c}`));
  L.push('═'.repeat(72));
  return L.join('\n');
}

/**
 * 大模型只能看到这份 payload。刻意剥掉了 K 线、逐笔明细和权益曲线 ——
 * 给得越少，能编的越少。
 */
export function toLlmPayload(report) {
  if (!report.observed) return { ok: false, reason: report.verdict.text };
  const o = report.observed;
  return {
    ok: true,
    engine: { version: report.meta.engineVersion, seed: report.meta.seed, iterations: report.meta.iterations },
    instrument: report.meta.instrument.symbol,
    performance: {
      trades: o.trades,
      totalR: round(o.totalR), avgR: round(o.avgR),
      winRate: round(o.winRate, 3), profitFactor: round(o.profitFactor),
      maxDrawdownR: round(o.maxDrawdownR),
      avgRCi95: [round(o.avgRCi95.lo), round(o.avgRCi95.hi)],
      perTradeSharpe: round(o.perTradeSharpe, 3),
      probabilisticSharpe: round(o.probabilisticSharpe, 3),
    },
    skillVsLuck: report.headline?.available ? {
      percentile: round(report.headline.percentile, 3),
      pValue: round(report.headline.pValue, 4),
      nullMedianR: round(report.headline.nullMedianR),
      edgeR: round(report.headline.edgeR),
      verdictLevel: report.verdict.level,
      verdictText: report.verdict.text,
    } : { available: false },
    dimensions: report.attribution.map(a => a.available ? {
      dimension: a.dimension, available: true,
      edgeR: round(a.edgeR), effectZ: round(a.effectZ, 2),
      pValue: round(a.pValue, 4),
      pValueAdjusted: round(a.pValueAdjusted ?? a.pValue, 4),
      percentile: round(a.percentile, 3),
    } : { dimension: a.dimension, available: false, reason: a.reason }),
    weakestDimension: report.weakestDimension,
    strongestDimension: report.strongestDimension,
    benchmarks: report.benchmarks.map(b => ({ label: b.label, totalR: round(b.totalR), trades: b.count })),
    power: {
      currentTrades: report.power.currentTrades,
      requiredTrades: Number.isFinite(report.power.requiredTrades) ? report.power.requiredTrades : null,
      shortfall: Number.isFinite(report.power.shortfall) ? report.power.shortfall : null,
    },
    behavior: report.behavior
      .filter(b => b.severity !== 'insufficient')
      .map(b => ({ key: b.key, label: b.label, severity: b.severity, value: round(b.value, 3), evidence: b.evidence })),
    caveats: report.caveats,
  };
}

function round(v, d = 2) {
  if (!Number.isFinite(v)) return null;
  const m = 10 ** d;
  return Math.round(v * m) / m;
}

/**
 * 配套的系统提示。约束写得很硬，因为这是把「AI 教练」从算命拉回工程的最后一道闸。
 */
export const LLM_SYSTEM_PROMPT = `你是交易训练系统的复盘教练。你会收到一份 JSON，里面是引擎对用户本轮交易**已经计算完成**的统计结果。

硬性规则（违反其中任何一条即为失职）：
1. 只使用 JSON 里出现过的数字。禁止引入任何 JSON 中不存在的数值、品种、日期、形态名称或行情描述。
2. 你没有看到 K 线，也没有看到逐笔记录。不要描述行情走势，不要点评具体某一笔交易的"形态"。
3. 禁止预测未来价格，禁止给出买卖建议，禁止暗示按你的话去做能盈利。
4. 当 skillVsLuck.verdictLevel 为 insufficient 时，必须明确告诉用户"样本量不足以判断能力"，不得因为收益为正就给出鼓励性的能力评价。
5. 当某个 dimension 的 available 为 false，必须转述其 reason，不得为该维度编造评价。
6. caveats 数组中的内容必须在回复中体现，不得省略。
7. p 值的含义是"在没有能力的前提下，出现这么好成绩的概率"，不是"你有能力的概率"。不得混淆这两者。
8. 维度归因一律引用 pValueAdjusted（多重比较校正后）。不得用未校正的 pValue 宣称某维度显著。

任务：基于这些事实，写一段 200-400 字的复盘，回答三个问题——
  (a) 这一轮的成绩，有多少能用运气解释；
  (b) 四个决策维度里，哪一块最该优先训练，依据是哪个数字；
  (c) 下一轮训练的具体建议（只能是训练动作，不能是交易动作）。
语气直接、不恭维、不煽情。用户是来变强的，不是来被夸的。`;
