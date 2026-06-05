/**
 * 色彩科学引擎 —— 用真实物理算出「天空的颜色」，作为隐身面漆的伪装目标。
 *
 * 链路：太阳黑体谱(5778K) × 瑞利散射(∝1/λ⁴) ⇒ 天空光谱
 *      ⇒ CIE 1931 配色函数积分 ⇒ XYZ ⇒ sRGB。
 * 这就是「天空为何是蓝的」的标准解释，所以算出的底色「无限接近真实天空」。
 */

export type RGB = [number, number, number];
export type Lab = [number, number, number];

/**
 * CIE 1931 配色函数的解析近似（Wyman, Sloan & Shirley 2013，多瓣高斯拟合）。
 * 紧凑且与查表值高度吻合，免去内嵌大表。λ 单位 nm。
 */
function gauss(x: number, mu: number, s1: number, s2: number): number {
  const t = (x - mu) * (x < mu ? 1 / s1 : 1 / s2);
  return Math.exp(-0.5 * t * t);
}
function cieX(l: number): number {
  return 1.056 * gauss(l, 599.8, 37.9, 31.0)
       + 0.362 * gauss(l, 442.0, 16.0, 26.7)
       - 0.065 * gauss(l, 501.1, 20.4, 26.2);
}
function cieY(l: number): number {
  return 0.821 * gauss(l, 568.8, 46.9, 40.5)
       + 0.286 * gauss(l, 530.9, 16.3, 31.1);
}
function cieZ(l: number): number {
  return 1.217 * gauss(l, 437.0, 11.8, 36.0)
       + 0.681 * gauss(l, 459.0, 26.0, 13.8);
}

/** 普朗克黑体相对辐射（去掉常数），λ 单位 m，T 单位 K */
function planck(lambdaM: number, T: number): number {
  const c2 = 0.014387769; // 第二辐射常数 hc/k (m·K)
  return 1 / (Math.pow(lambdaM, 5) * (Math.exp(c2 / (lambdaM * T)) - 1));
}

/** 线性 sRGB → 伽马编码 0–255 */
function gammaEncode(c: number): number {
  c = Math.min(1, Math.max(0, c));
  const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return Math.round(v * 255);
}

/**
 * 计算晴空天顶色：太阳黑体谱(sunTempK) × 散射，在可见光 380–730nm 积分到 XYZ 再转 sRGB。
 *
 * 散射 = 瑞利(∝1/λ⁴) + 气溶胶项(波长近似无关)。纯单次散射瑞利会偏紫且过饱和，
 * 真实天空因气溶胶(米氏)与多次散射叠加了一层近似中性的「空气光」，更偏青、更去饱和——
 * aerosol 即该比例（默认 0.45），让结果无限接近肉眼所见的晴空蓝。
 */
export function skyColor(
  sunTempK = 5778, aerosol = 0.6, lMin = 415, lMax = 700, lum = 0.62,
): RGB {
  const lRef = 550e-9;
  const airlight = aerosol / Math.pow(lRef, 4); // 与 550nm 处瑞利同量级的中性空气光
  // 深紫(<~415nm)被臭氧/大气吸收且人眼不敏感，截断后天空由纯瑞利的偏紫转为真实的偏青天蓝
  let X = 0, Y = 0, Z = 0;
  for (let l = lMin; l <= lMax; l += 5) {
    const lambdaM = l * 1e-9;
    const scatter = 1 / Math.pow(lambdaM, 4) + airlight; // 瑞利 + 气溶胶
    const sky = planck(lambdaM, sunTempK) * scatter;     // 天空辐亮度（相对）
    X += sky * cieX(l);
    Y += sky * cieY(l);
    Z += sky * cieZ(l);
  }
  // 按亮度归一（而非强行拉满某一通道），让色度自然落位、不人为过饱和
  const s = lum / Y;
  X *= s; Y *= s; Z *= s;
  let r =  3.2406 * X - 1.5372 * Y - 0.4986 * Z;
  let g = -0.9689 * X + 1.8758 * Y + 0.0415 * Z;
  let b =  0.0557 * X - 0.2040 * Y + 1.0570 * Z;
  // 防削顶：等比压到最大通道 0.96，保色度不失真
  const mx = Math.max(r, g, b, 1e-6);
  if (mx > 0.96) { const k = 0.96 / mx; r *= k; g *= k; b *= k; }
  return [gammaEncode(r), gammaEncode(g), gammaEncode(b)];
}

// ===== sRGB ↔ Lab，用于计算色差 ΔE =====
export function srgbToLinear(c: number): number {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
export function linearToSrgb(c: number): number {
  return gammaEncode(c);
}

export function rgbToLab([r, g, b]: RGB): Lab {
  const R = srgbToLinear(r), G = srgbToLinear(g), B = srgbToLinear(b);
  let X = 0.4124 * R + 0.3576 * G + 0.1805 * B;
  let Y = 0.2126 * R + 0.7152 * G + 0.0722 * B;
  let Z = 0.0193 * R + 0.1192 * G + 0.9505 * B;
  X /= 0.95047; Y /= 1.0; Z /= 1.08883; // D65 白点归一化
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(X), fy = f(Y), fz = f(Z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** CIE76 色差 ΔE（≈2 以下肉眼难辨，≈1 几乎完美） */
export function deltaE76(a: RGB, b: RGB): number {
  const [l1, a1, b1] = rgbToLab(a);
  const [l2, a2, b2] = rgbToLab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}
