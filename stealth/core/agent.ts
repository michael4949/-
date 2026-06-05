/**
 * 「飞机隐身涂装材料配比智能体」对外门面。
 * 暴露频段预设、一键设计、以及把设计决策翻译成人话的推理说明。
 */
import { designCoating } from "./optimizer";
import { MATERIALS } from "./materials";
import type { CoatingDesign, DesignRequirement } from "./types";

/** 雷达常用频段预设（GHz） */
export const BANDS: { id: string; label: string; f0: number; f1: number; note: string }[] = [
  { id: "L", label: "L 波段", f0: 1, f1: 2, note: "预警/对空搜索，波长大、需厚涂层" },
  { id: "S", label: "S 波段", f0: 2, f1: 4, note: "对空监视、气象雷达" },
  { id: "C", label: "C 波段", f0: 4, f1: 8, note: "多用途、部分火控" },
  { id: "X", label: "X 波段", f0: 8, f1: 12, note: "机载火控/导弹导引头主力，隐身最关注" },
  { id: "Ku", label: "Ku 波段", f0: 12, f1: 18, note: "高分辨成像、末制导" },
  { id: "X-Ku", label: "X–Ku 宽带", f0: 8, f1: 18, note: "覆盖主流火控+末制导的宽带需求" },
];

export const DEFAULT_REQUIREMENT: DesignRequirement = {
  bandLabel: "X", fStartGHz: 8, fEndGHz: 12,
  maxThickness: 3.0, maxArealMass: 6.0, maxLayers: 3, weightPriority: 0.5,
};

export interface AgentResult {
  best: CoatingDesign;
  alternatives: CoatingDesign[];
  rationale: string[];   // 智能体的设计推理（中文要点）
  requirement: DesignRequirement;
}

/** 运行智能体：输入需求 → 输出最优配方 + 备选 + 推理说明 */
export function runAgent(req: DesignRequirement): AgentResult {
  const { best, alternatives } = designCoating(req);
  return { best, alternatives, rationale: explain(best, req), requirement: req };
}

/** 把最终方案的工程取舍翻译成人类可读的推理要点 */
function explain(d: CoatingDesign, req: DesignRequirement): string[] {
  const r: string[] = [];
  r.push(`目标 ${req.bandLabel} 波段 ${req.fStartGHz}–${req.fEndGHz} GHz，限厚 ≤ ${req.maxThickness} mm、限面密度 ≤ ${req.maxArealMass} kg/m²。`);
  r.push(`比选 Dallenbach 单层 / 双层梯度 / 三层宽带后，「${d.template}」综合评分最高，故选定。`);

  // 逐层（top→bottom）解释角色
  d.layers.forEach((l, i) => {
    const f = MATERIALS[l.fillerId], m = MATERIALS[l.matrixId];
    const role = f.role === "magnetic" ? "磁损耗" : "介电损耗";
    const pos = i === 0 ? "最外吸波层（先做阻抗匹配，让波尽量进入）"
      : i === d.layers.length - 1 ? "最内层（贴金属，承担主要损耗）" : "中间过渡层";
    r.push(`第${i + 1}层·${pos}：${f.name}（${role}）填于${m.name}，体积分数 ${(l.volFrac * 100).toFixed(0)}%、厚 ${l.thickness.toFixed(2)} mm。`);
  });

  r.push(`性能：带内最深吸收 ${d.minRL.toFixed(1)} dB，最差 ${d.worstRL.toFixed(1)} dB，−10 dB（90%吸收）带宽 ${d.bandwidth10.toFixed(1)} GHz。`);
  r.push(`代价：总厚 ${d.totalThickness.toFixed(2)} mm，面密度 ${d.arealMass.toFixed(2)} kg/m²${d.arealMass > req.maxArealMass ? "（超限！）" : ""}。`);
  if (d.worstRL > -10) r.push(`提示：此约束下未能全带 ≤ −10 dB；可放宽厚度/面密度，或缩窄目标频带。`);
  r.push(`最外覆 0.08 mm 天蓝面漆（${d.camouflage.pigments.map((p) => p.name).join(" + ")}），低损耗近似电磁透明，不破坏吸波。`);
  return r;
}

export type { CoatingDesign, DesignRequirement } from "./types";
