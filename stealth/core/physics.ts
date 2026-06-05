/**
 * 吸波物理引擎 —— 全部基于公开的经典电磁理论：
 *   1) 有效介质理论（Maxwell–Garnett / Bruggeman）：由填料体积分数算复合材料 ε、μ；
 *   2) 金属背衬多层传输线模型：算反射损耗 RL(f)。
 *
 * 这套公式正是 RAM 学术界设计 Dallenbach/Jaumann/梯度吸波层的标准工具，
 * 因此结果「无限接近真实」——尤其是厚度造成的 1/4 波长干涉吸收峰会自然涌现。
 */
import {
  C, cx, add, sub, mul, div, scale, sqrt, tanh, abs, db20,
} from "./complex";
import type { Material, ResolvedLayer, SpectrumPoint } from "./types";
import { MATERIALS } from "./materials";

export const C0 = 2.99792458e8; // 真空光速 m/s

export type MixingRule = "mg" | "bruggeman";

/**
 * Maxwell–Garnett 混合：稀疏/中等填充下的经典近似。
 *   (ε_eff − ε_m)/(ε_eff + 2ε_m) = f·(ε_f − ε_m)/(ε_f + 2ε_m)
 */
export function maxwellGarnett(epsM: C, epsF: C, f: number): C {
  const num = sub(epsF, epsM);
  const den = add(epsF, scale(epsM, 2));
  const beta = scale(div(num, den), f);              // β = f·(εf−εm)/(εf+2εm)
  const top = add(cx(1, 0), scale(beta, 2));         // 1 + 2β
  const bot = sub(cx(1, 0), beta);                   // 1 − β
  return mul(epsM, div(top, bot));                   // εm·(1+2β)/(1−β)
}

/**
 * Bruggeman 对称混合：高填充 / 近渗流时更准（隐式自洽，解二次方程）。
 *   2x² − [(3f−1)εf + (2−3f)εm]·x − εf·εm = 0
 * 选取「实部>0、虚部≤0（无源有耗）」的物理根。
 */
export function bruggeman(epsM: C, epsF: C, f: number): C {
  const b = add(scale(epsF, 3 * f - 1), scale(epsM, 2 - 3 * f)); // (3f−1)εf+(2−3f)εm
  const disc = sqrt(add(mul(b, b), scale(mul(epsF, epsM), 8)));  // √(b²+8εfεm)
  const r1 = scale(add(b, disc), 0.25);
  const r2 = scale(sub(b, disc), 0.25);
  const ok = (z: C) => z.re > 0 && z.im <= 1e-9;
  if (ok(r1) && !ok(r2)) return r1;
  if (ok(r2) && !ok(r1)) return r2;
  // 两根都「合法」或都不合法时，取实部为正且虚部更负（更耗散、更接近物理）的一支
  return r1.re >= r2.re ? r1 : r2;
}

function mix(epsM: C, epsF: C, f: number, rule: MixingRule): C {
  return rule === "bruggeman" ? bruggeman(epsM, epsF, f) : maxwellGarnett(epsM, epsF, f);
}

/** 由「基体 + 填料 + 体积分数」解算复合材料的 ε、μ、密度 */
export function compositeProps(
  matrix: Material,
  filler: Material,
  volFrac: number,
  rule: MixingRule = "bruggeman",
): { eps: C; mu: C; density: number } {
  const eps = mix(matrix.eps, filler.eps, volFrac, rule);
  // 非磁性填料（μ≈1）直接走介电混合即可；磁性填料同样用混合公式估 μ_eff
  const mu = filler.mu.re === 1 && filler.mu.im === 0
    ? cx(1, 0)
    : mix(matrix.mu, filler.mu, volFrac, rule);
  const density = volFrac * filler.density + (1 - volFrac) * matrix.density;
  return { eps, mu, density };
}

/**
 * 单层传输线阻抗变换：已知朝金属一侧的归一化负载阻抗 zLoad，
 * 求该层外表面的归一化输入阻抗。
 *   η = √(μ/ε)，  γd = j·k0·d·√(με)，
 *   z_in = η·(zLoad + η·tanh(γd)) / (η + zLoad·tanh(γd))
 * 阻抗均以自由空间波阻抗 η0(=377Ω) 归一化（故金属背衬 zLoad=0）。
 */
export function layerInputImpedance(
  zLoad: C, eps: C, mu: C, thicknessMM: number, freqHz: number,
): C {
  const d = thicknessMM * 1e-3;            // mm → m
  const k0 = (2 * Math.PI * freqHz) / C0;
  const eta = sqrt(div(mu, eps));          // 归一化本征阻抗 √(μ/ε)
  const s = sqrt(mul(mu, eps));            // √(με)
  const arg: C = { re: -k0 * d * s.im, im: k0 * d * s.re }; // j·k0·d·√(με)
  const t = tanh(arg);
  const num = add(zLoad, mul(eta, t));
  const den = add(eta, mul(zLoad, t));
  return mul(eta, div(num, den));
}

/**
 * 金属背衬多层堆叠的反射损耗 RL(dB)。
 * layers 顺序为「最外层(迎波) → 最内层(贴金属)」。
 * 从金属侧 z=0 出发，向外逐层做阻抗变换，最后算表面反射系数。
 */
export function reflectionLoss(
  layers: { eps: C; mu: C; thickness: number }[],
  freqHz: number,
): number {
  let z: C = cx(0, 0); // 理想金属背衬（PEC）
  for (let i = layers.length - 1; i >= 0; i--) {
    z = layerInputImpedance(z, layers[i].eps, layers[i].mu, layers[i].thickness, freqHz);
  }
  const gamma = div(sub(z, cx(1, 0)), add(z, cx(1, 0))); // Γ=(z−1)/(z+1)
  return db20(gamma);
}

/** 在 [fStart,fEnd] GHz 上采样 n 点的 RL 频谱 */
export function spectrum(
  layers: { eps: C; mu: C; thickness: number }[],
  fStartGHz: number, fEndGHz: number, n = 81,
): SpectrumPoint[] {
  const out: SpectrumPoint[] = [];
  for (let i = 0; i < n; i++) {
    const fGHz = fStartGHz + ((fEndGHz - fStartGHz) * i) / (n - 1);
    out.push({ freqGHz: fGHz, rl: reflectionLoss(layers, fGHz * 1e9) });
  }
  return out;
}

/** 把求解后的层数组转成带 ε/μ/密度/面密度 的 ResolvedLayer */
export function resolveLayers(
  raw: { matrixId: string; fillerId: string; volFrac: number; thickness: number }[],
  rule: MixingRule = "bruggeman",
): ResolvedLayer[] {
  return raw.map((l) => {
    const matrix = MATERIALS[l.matrixId];
    const filler = MATERIALS[l.fillerId];
    const { eps, mu, density } = compositeProps(matrix, filler, l.volFrac, rule);
    // 面密度 kg/m² = 密度(g/cm³=1000 kg/m³) × 厚度(mm=1e-3 m) = density × thickness
    const arealMass = density * l.thickness;
    return { ...l, eps, mu, density, arealMass };
  });
}

/** −10 dB（90% 吸收）带宽，单位 GHz */
export function bandwidthBelow(spec: SpectrumPoint[], thresholdDb = -10): number {
  if (spec.length < 2) return 0;
  const step = spec[1].freqGHz - spec[0].freqGHz;
  let count = 0;
  for (const p of spec) if (p.rl <= thresholdDb) count++;
  return count * step;
}
