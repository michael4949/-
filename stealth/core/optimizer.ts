/**
 * 隐身涂层配比智能体的「大脑」。
 *
 * 它按真实雷达吸波材料（RAM）工程范式生成候选结构，再用差分进化优化每层的
 * 填料体积分数与厚度，最后按「全带达标 + 深吸收 + 宽带 − 厚度/面密度/成本」综合评分择优：
 *   · Dallenbach 单层      —— 最薄最轻，窄带强吸收
 *   · 双层阻抗梯度          —— 外层弱损耗匹配、内层强磁损耗，展宽
 *   · 三层梯度宽带          —— 介电→磁损耗逐级过渡，X~Ku 宽带
 * 顶部再统一覆盖一层薄「天蓝面漆」（低损耗、近似电磁透明）完成伪装。
 */
import { cx, C } from "./complex";
import { compositeProps, reflectionLoss, spectrum, bandwidthBelow, C0 } from "./physics";
import { MATERIALS } from "./materials";
import { differentialEvolution } from "./de";
import { designCamouflage } from "./camouflage";
import type { CoatingDesign, DesignRequirement, ResolvedLayer, SpectrumPoint } from "./types";

/** 薄天蓝面漆层：聚氨酯 + 非导电颜料，低损耗、厚度薄，对吸波影响可忽略 */
const TOPCOAT = { eps: cx(4.2, -0.05) as C, mu: cx(1, 0) as C, thickness: 0.08, density: 1.45 };

interface LayerCfg { matrixId: string; fillerId: string; volFrac: number; thickness: number; }

/** 把一组层配置解析为带 ε/μ/密度/面密度 的层（不含面漆） */
function resolve(cfgs: LayerCfg[]): ResolvedLayer[] {
  return cfgs.map((c) => {
    const { eps, mu, density } = compositeProps(MATERIALS[c.matrixId], MATERIALS[c.fillerId], c.volFrac);
    return { ...c, eps, mu, density, arealMass: density * c.thickness };
  });
}

/** 给一套吸波层（已含面漆于最外）算 RL 频谱与各项指标，并按需求打综合分 */
function scoreResolved(
  absorber: ResolvedLayer[], req: DesignRequirement, nPts: number,
): { spectrum: SpectrumPoint[]; score: number; minRL: number; worstRL: number;
     bandwidth10: number; totalThickness: number; arealMass: number; relativeCost: number } {
  // 最外加面漆层一起参与电磁计算（top→bottom，面漆在最前）
  const stack = [TOPCOAT, ...absorber.map((l) => ({ eps: l.eps, mu: l.mu, thickness: l.thickness }))];
  const spec = spectrum(stack, req.fStartGHz, req.fEndGHz, nPts);

  const rls = spec.map((p) => p.rl);
  const minRL = Math.min(...rls);
  const worstRL = Math.max(...rls);
  const bandwidth10 = bandwidthBelow(spec, -10);
  const totalThickness = TOPCOAT.thickness + absorber.reduce((a, l) => a + l.thickness, 0);
  const arealMass = TOPCOAT.density * TOPCOAT.thickness + absorber.reduce((a, l) => a + l.arealMass, 0);
  const relativeCost = absorber.reduce(
    (a, l) => a + MATERIALS[l.fillerId].cost * l.volFrac * l.thickness, 0,
  );

  const wp = req.weightPriority;
  // 吸收是任务本身，必须主导评分；重量/厚度/成本只作次级权衡。
  const cover = Math.max(0, -worstRL);                 // 带边吸收深度 dB（≥0）
  let score = 0;
  score += Math.min(cover, 25) * 4.0;                  // 全带覆盖（主驱动，封顶 +100）
  score += bandwidth10 * 2.0;                          // −10dB 带宽越宽越好
  score += Math.min(-minRL, 40) * 0.3;                 // 峰值再深一点点加分（封顶 +12）
  score -= worstRL > -10 ? (worstRL + 10) * 2 : 0;     // 未达全带 −10dB 的渐进惩罚
  score += worstRL <= -10 ? 8 : 0;                     // 全带 90% 吸收达标的额外奖励
  score -= arealMass * (0.8 + 3 * wp);                 // 越轻越好（航空核心约束，次级）
  score -= totalThickness * (0.4 + 0.8 * wp);          // 越薄越好
  score -= relativeCost * (0.3 + 0.8 * wp);            // 成本
  if (totalThickness > req.maxThickness) score -= (totalThickness - req.maxThickness) * 80; // 硬约束
  if (arealMass > req.maxArealMass) score -= (arealMass - req.maxArealMass) * 80;

  return { spectrum: spec, score, minRL, worstRL, bandwidth10, totalThickness, arealMass, relativeCost };
}

/** 设计范式：每个槽位（top→bottom）给定基体与候选填料 */
interface Template {
  name: string;
  slots: { matrixId: string; fillers: string[] }[];
}

const TEMPLATES: Template[] = [
  {
    name: "Dallenbach 单层",
    slots: [{ matrixId: "pu", fillers: ["cip", "sendust", "nizn", "bam", "mwcnt", "cb"] }],
  },
  {
    name: "双层阻抗梯度",
    slots: [
      { matrixId: "pu", fillers: ["cb", "sic", "pani", "mwcnt"] },   // 外：弱损耗匹配
      { matrixId: "epoxy", fillers: ["cip", "sendust", "nizn"] },    // 内：强磁损耗贴金属
    ],
  },
  {
    name: "三层梯度宽带",
    slots: [
      { matrixId: "pu", fillers: ["sic", "pani"] },                  // 外：低 ε 匹配
      { matrixId: "epoxy", fillers: ["mwcnt", "rgo", "cb"] },        // 中：介电损耗
      { matrixId: "epoxy", fillers: ["cip", "sendust"] },            // 内：磁损耗
    ],
  },
];

/** 在某范式 + 某组填料选择下，用 DE 优化各层(体积分数, 厚度)，返回最佳配置与得分 */
function optimizeChoice(
  template: Template, fillerIds: string[], req: DesignRequirement,
): { cfgs: LayerCfg[]; metrics: ReturnType<typeof scoreResolved> } {
  const L = template.slots.length;
  // 变量布局：[volFrac_0..L-1, thickness_0..L-1]
  const lower: number[] = [];
  const upper: number[] = [];
  for (let i = 0; i < L; i++) lower.push(0.03), upper.push(MATERIALS[fillerIds[i]].maxVolFrac);
  for (let i = 0; i < L; i++) lower.push(0.05), upper.push(Math.min(req.maxThickness, 5));

  const build = (x: number[]): LayerCfg[] =>
    template.slots.map((s, i) => ({
      matrixId: s.matrixId, fillerId: fillerIds[i],
      volFrac: x[i], thickness: x[L + i],
    }));

  const fn = (x: number[]) => -scoreResolved(resolve(build(x)), req, 21).score; // 寻优时用 21 点提速
  const { x } = differentialEvolution({
    lower, upper, fn, pop: Math.min(48, 16 + L * 10), gens: 70, seed: 7 + L,
  });

  const cfgs = build(x);
  const metrics = scoreResolved(resolve(cfgs), req, 81); // 最终用 81 点精算
  return { cfgs, metrics };
}

/** 笛卡尔积，但限制每个范式最多尝试的组合数，保证浏览器内秒级响应 */
function combos(slots: Template["slots"], cap: number): string[][] {
  let out: string[][] = [[]];
  for (const s of slots) {
    const next: string[][] = [];
    for (const prev of out) for (const f of s.fillers) next.push([...prev, f]);
    out = next;
  }
  // 多层时组合爆炸，做下采样（保留分布均匀的前 cap 个）
  if (out.length <= cap) return out;
  const step = out.length / cap;
  const picked: string[][] = [];
  for (let i = 0; i < cap; i++) picked.push(out[Math.floor(i * step)]);
  return picked;
}

/** 把一组配置 + 指标 + 伪装 组装成对外的 CoatingDesign */
function assemble(
  cfgs: LayerCfg[], metrics: ReturnType<typeof scoreResolved>, template: string,
  camouflage: CoatingDesign["camouflage"],
): CoatingDesign {
  const layers = resolve(cfgs);
  const stack = [TOPCOAT, ...layers.map((l) => ({ eps: l.eps, mu: l.mu, thickness: l.thickness }))];
  return {
    layers,
    spectrum: metrics.spectrum,
    wideSpectrum: spectrum(stack, 1, 18, 101), // 宽带频谱供绘图

    minRL: metrics.minRL, worstRL: metrics.worstRL, bandwidth10: metrics.bandwidth10,
    totalThickness: metrics.totalThickness, arealMass: metrics.arealMass,
    relativeCost: metrics.relativeCost, score: metrics.score, template, camouflage,
  };
}

/**
 * 智能体主入口：根据需求设计隐身涂层。
 * 返回综合最优方案（best）与若干备选（alternatives），并附天蓝伪装配色。
 */
export function designCoating(req: DesignRequirement): { best: CoatingDesign; alternatives: CoatingDesign[] } {
  const camouflage = designCamouflage();
  const candidates: CoatingDesign[] = [];

  for (const tpl of TEMPLATES) {
    if (tpl.slots.length > req.maxLayers) continue; // 尊重最大层数约束
    const cap = tpl.slots.length === 1 ? 99 : tpl.slots.length === 2 ? 12 : 8;
    let bestForTpl: CoatingDesign | null = null;
    for (const fillerIds of combos(tpl.slots, cap)) {
      const { cfgs, metrics } = optimizeChoice(tpl, fillerIds, req);
      const design = assemble(cfgs, metrics, tpl.name, camouflage);
      if (!bestForTpl || design.score > bestForTpl.score) bestForTpl = design;
    }
    if (bestForTpl) candidates.push(bestForTpl);
  }

  candidates.sort((a, b) => b.score - a.score);
  return { best: candidates[0], alternatives: candidates.slice(1) };
}

export { TOPCOAT };
