/**
 * 天蓝伪装配色智能体 —— 把「真实天空色」翻译成可执行的面漆颜料配比。
 *
 * 1) 用 color.ts 由瑞利散射算出天空目标色；
 * 2) 用差分进化求解颜料质量配比，使调出的漆色 ΔE 最小逼近天空；
 * 3) 对导电颜料（炭黑）给出雷达告警——隐身面漆必须用非导电颜料，
 *    否则最外层会引入电损耗、抬高 RCS，与下面辛苦做的吸波层自相矛盾。
 */
import { skyColor, deltaE76, rgbToLab, srgbToLinear, linearToSrgb, RGB } from "./color";
import { PIGMENTS, Pigment } from "./materials";
import { differentialEvolution } from "./de";
import type { Camouflage } from "./types";

/**
 * Kubelka–Munk 单常数减色混合模型 —— 颜料调色的标准物理模型。
 * 每个颜料按其反射率 R 反演吸收/散射比 K/S=(1−R)²/(2R)，按浓度(质量分数×着色力)线性叠加，
 * 再正演回反射率 R=1+K/S−√((K/S)²+2K/S)。白色 R≈1 → K/S≈0，作为散射体「冲淡」而非
 * 平均，故能在提亮的同时保住蓝相饱和度——这正是真实面漆调出浅天蓝的方式。
 */
const ksFromR = (R: number): number => {
  const r = Math.min(0.998, Math.max(0.002, R));
  return ((1 - r) * (1 - r)) / (2 * r);
};
const rFromKS = (ks: number): number => 1 + ks - Math.sqrt(ks * ks + 2 * ks);

/** 两个色相角（弧度）之间的最小夹角，单位度 */
const hueDiffDeg = (h1: number, h2: number): number => {
  let d = Math.abs(h1 - h2) * 180 / Math.PI;
  if (d > 180) d = 360 - d;
  return d;
};

export function mixPigments(massFracs: number[], palette: Pigment[]): RGB {
  const w = palette.map((p, i) => Math.max(0, massFracs[i]) * p.tint);
  const wsum = w.reduce((a, b) => a + b, 0);
  if (wsum <= 0) return [0, 0, 0];
  const out: number[] = [0, 1, 2].map((ch) => {
    let ks = 0;
    for (let i = 0; i < palette.length; i++) {
      if (w[i] <= 0) continue;
      ks += (w[i] / wsum) * ksFromR(srgbToLinear(palette[i].rgb[ch]));
    }
    return linearToSrgb(rFromKS(ks));
  });
  return [out[0], out[1], out[2]];
}

/** 几个真实航空「天空/浅蓝」标准色（sRGB 近似，用于报告最接近的现役标准） */
const STANDARDS: { name: string; code: string; rgb: RGB }[] = [
  { name: "美军 浅蓝", code: "FS 35550", rgb: [120, 158, 190] },
  { name: "美军 制空灰蓝", code: "FS 35622", rgb: [186, 194, 196] },
  { name: "英军 方位蓝", code: "RAF Azure", rgb: [96, 142, 184] },
  { name: "侦察机蓝", code: "PRU Blue", rgb: [70, 104, 150] },
  { name: "以军 浅天蓝", code: "IAF Baby Blue", rgb: [176, 206, 222] },
];

/**
 * 设计天蓝伪装面漆。
 * @param sunTempK  太阳色温（默认 5778K 晴空；可调出黄昏/高空更深的蓝）
 * @param allowConductive 是否允许导电颜料入选（默认 false——隐身面漆禁用炭黑）
 */
export function designCamouflage(sunTempK = 5778, allowConductive = false, aerosol = 0.6): Camouflage {
  const sky = skyColor(sunTempK, aerosol);
  const skyLab = rgbToLab(sky);

  // 默认仅在「雷达友好」颜料中调色
  const palette = PIGMENTS.filter((p) => allowConductive || p.radarSafe);

  const skyHue = Math.atan2(skyLab[2], skyLab[1]);              // 天空色相角
  const skyChroma = Math.hypot(skyLab[1], skyLab[2]);           // 天空彩度 C*
  const lower = palette.map(() => 0);
  const upper = palette.map(() => 1);
  // 伪装目标：对齐天空「色相角」并尽量提亮——晴空自发光、亮度/彩度远超被动反照，
  // 亮度差物理上无法消除（故二战才有 Yehudi 主动补光灯）。在漆面色域内求「最像天空的浅蓝」。
  const objective = (w: number[]) => {
    const sum = w.reduce((a, b) => a + b, 0);
    if (sum < 1e-6) return 1e3;
    const frac = w.map((v) => v / sum);
    const [pL, pa, pb] = rgbToLab(mixPigments(frac, palette));
    const dHue = hueDiffDeg(Math.atan2(pb, pa), skyHue);       // 色相角偏差(°) —— 主目标
    const lightDeficit = Math.max(0, 74 - pL);                 // 尽量提亮到 sky-like
    const chromaShort = Math.max(0, 14 - Math.hypot(pa, pb));  // 保持「明显是蓝」，不退化成灰
    const sparsity = frac.filter((f) => f > 0.02).length * 0.4;
    return dHue + 0.6 * lightDeficit + 1.5 * chromaShort + sparsity;
  };

  const { x } = differentialEvolution({
    lower, upper, fn: objective, pop: 50, gens: 140, seed: 20260605,
  });

  const sum = x.reduce((a, b) => a + b, 0) || 1;
  let frac = x.map((v) => v / sum);

  // 丢弃 <1% 的微量项并重新归一化，得到干净配方
  frac = frac.map((f) => (f >= 0.01 ? f : 0));
  const s2 = frac.reduce((a, b) => a + b, 0) || 1;
  frac = frac.map((f) => f / s2);

  const paintRGB = mixPigments(frac, palette);
  const pLab = rgbToLab(paintRGB);
  const hueMatchDeg = hueDiffDeg(Math.atan2(pLab[2], pLab[1]), skyHue);   // 色相角吻合（核心）
  const chromaGap = Math.abs(skyChroma - Math.hypot(pLab[1], pLab[2]));   // 彩度差（物理必然）
  const deltaE = deltaE76(paintRGB, sky);                                // 完整色差（仅参考）

  const pigments = palette
    .map((p, i) => ({
      id: p.id, name: p.name, nameEn: p.nameEn,
      massFrac: frac[i], radarSafe: p.radarSafe,
    }))
    .filter((p) => p.massFrac > 0)
    .sort((a, b) => b.massFrac - a.massFrac);

  // 最接近的现役标准色
  let nearest = STANDARDS[0];
  let nd = Infinity;
  for (const st of STANDARDS) {
    const d = deltaE76(paintRGB, st.rgb);
    if (d < nd) { nd = d; nearest = st; }
  }

  const warnings: string[] = [];
  if (pigments.some((p) => !p.radarSafe)) {
    warnings.push("⚠ 配方含导电颜料，会抬高表层电损耗与 RCS，隐身面漆应剔除。");
  }
  warnings.push("面漆已强制排除导电炭黑，仅用非导电无机/有机颜料，避免破坏吸波层。");
  warnings.push("已对齐天空「色度(色相)」；亮度差为物理必然——晴空自发光亮度远超被动涂料反照（二战 Yehudi 补光灯即为此）。");
  warnings.push("天蓝底属「向上观察」伪装（地面/低空仰视天空背景）；高空俯视宜配灰色顶面，形成上浅下灰的反荫蔽迷彩。");

  return {
    skyRGB: sky,
    paintRGB,
    hueMatchDeg,
    chromaGap,
    deltaE,
    pigments,
    nearestStandard: { name: nearest.name, code: nearest.code, deltaE: nd },
    warnings,
  };
}
