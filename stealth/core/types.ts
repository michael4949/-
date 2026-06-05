import type { C } from "./complex";

/** 材料在电磁/吸波体系中的角色 */
export type MaterialRole = "magnetic" | "dielectric" | "matrix" | "transparent";

/**
 * 一种吸波填料 / 基体的本征电磁参数。
 * 数值为 X 波段（~10 GHz）附近的「公开文献代表值」（数量级正确，用于教学/科研仿真），
 * 并非任何机密或某型号实测配方。复介电常数/磁导率按 {re: ε', im: −ε''} 存储。
 */
export interface Material {
  id: string;
  name: string;       // 中文名
  nameEn: string;
  role: MaterialRole;
  eps: C;             // 本征复相对介电常数 ε = ε' − jε''
  mu: C;              // 本征复相对磁导率 μ = μ' − jμ''
  density: number;    // 密度 g/cm³
  maxVolFrac: number; // 在基体中可达的最大体积分数（工艺/渗流限制）
  cost: number;       // 相对成本（无量纲，1≈廉价，10≈昂贵）
  note: string;       // 角色/特性说明
  radarSafePigment?: boolean; // 仅颜料相关：是否对雷达「友好」（非导电）
}

/** 单层涂层（求解前的设计变量已固化为具体数值） */
export interface Layer {
  matrixId: string;
  fillerId: string;
  volFrac: number;     // 填料体积分数 0–1
  thickness: number;   // 厚度，单位 mm
}

/** 求解后带电磁参数与密度的层 */
export interface ResolvedLayer extends Layer {
  eps: C;
  mu: C;
  density: number;     // 该层复合材料密度 g/cm³
  arealMass: number;   // 该层面密度 kg/m²
}

/** 频谱采样点 */
export interface SpectrumPoint {
  freqGHz: number;
  rl: number;          // 反射损耗 dB（越负越好，≤ −10 dB 视为有效吸收）
}

/** 一套完整的隐身涂层方案（吸波堆叠 + 性能 + 伪装配色） */
export interface CoatingDesign {
  layers: ResolvedLayer[];
  spectrum: SpectrumPoint[];      // 目标频带内的频谱（驱动指标）
  wideSpectrum: SpectrumPoint[];  // 1–18 GHz 宽带频谱（仅供绘图看吸收谷全貌）
  minRL: number;            // 频带内最优反射损耗 dB
  worstRL: number;          // 频带内最差反射损耗 dB（决定是否全带达标）
  bandwidth10: number;      // RL ≤ −10 dB 的带宽 GHz
  totalThickness: number;   // mm
  arealMass: number;        // kg/m²
  relativeCost: number;     // 相对成本
  score: number;            // 综合评分（越高越好）
  template: string;         // 设计范式名（如 "Dallenbach 单层" / "三层梯度"）
  camouflage: Camouflage;   // 顶层天蓝伪装配色
}

/** 顶层「天蓝」伪装配色方案 */
export interface Camouflage {
  skyRGB: [number, number, number];      // 由瑞利散射算出的真实天空色（明亮饱和）
  paintRGB: [number, number, number];    // 配出的浅天蓝涂料色（色相对齐、尽量明亮）
  hueMatchDeg: number;                   // 与天空的「色相角」偏差（°），伪装核心指标（越小越好）
  chromaGap: number;                     // 彩度差 |C*_sky − C*_paint|（被动反照率上限导致，无法消除）
  deltaE: number;                        // 与天空色的完整 CIE76 色差（含亮度差，仅供参考）
  pigments: { id: string; name: string; nameEn: string; massFrac: number; radarSafe: boolean }[];
  nearestStandard: { name: string; code: string; deltaE: number };
  warnings: string[];
}

/** 用户/调用方对智能体提出的设计需求 */
export interface DesignRequirement {
  bandLabel: string;     // 频段标签，如 "X"
  fStartGHz: number;     // 目标频带起
  fEndGHz: number;       // 目标频带止
  maxThickness: number;  // 最大允许总厚 mm
  maxArealMass: number;  // 最大允许面密度 kg/m²
  maxLayers: number;     // 最多层数 1–3
  /** 0 = 纯追求吸收性能；1 = 在达标前提下尽量轻、薄、省 */
  weightPriority: number;
}
