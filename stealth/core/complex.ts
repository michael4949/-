/**
 * 轻量复数运算库 —— 雷达吸波材料（RAM）的电磁计算全部建立在复介电常数
 * ε = ε' − jε'' 与复磁导率 μ = μ' − jμ'' 之上，JS 没有原生复数，这里自带一套。
 *
 * 约定：时间因子取 e^{+jωt}，无源有耗介质满足 ε'' ≥ 0、μ'' ≥ 0
 * （即虚部为负：{re: ε', im: −ε''}）。所有分支选择都遵循该约定。
 */

export interface C {
  re: number;
  im: number;
}

export const cx = (re: number, im = 0): C => ({ re, im });

export const add = (a: C, b: C): C => ({ re: a.re + b.re, im: a.im + b.im });
export const sub = (a: C, b: C): C => ({ re: a.re - b.re, im: a.im - b.im });
export const neg = (a: C): C => ({ re: -a.re, im: -a.im });
export const conj = (a: C): C => ({ re: a.re, im: -a.im });
export const scale = (a: C, k: number): C => ({ re: a.re * k, im: a.im * k });

export const mul = (a: C, b: C): C => ({
  re: a.re * b.re - a.im * b.im,
  im: a.re * b.im + a.im * b.re,
});

export const abs2 = (a: C): number => a.re * a.re + a.im * a.im;
export const abs = (a: C): number => Math.hypot(a.re, a.im);

export const div = (a: C, b: C): C => {
  const d = abs2(b);
  return {
    re: (a.re * b.re + a.im * b.im) / d,
    im: (a.im * b.re - a.re * b.im) / d,
  };
};

/** 复指数 e^z = e^{re}(cos im + j sin im) */
export const exp = (z: C): C => {
  const r = Math.exp(z.re);
  return { re: r * Math.cos(z.im), im: r * Math.sin(z.im) };
};

/**
 * 主值平方根（实部 ≥ 0 的分支）。用于本征阻抗 √(μ/ε) 与传播常数 √(με)。
 */
export const sqrt = (z: C): C => {
  if (z.re === 0 && z.im === 0) return { re: 0, im: 0 };
  const r = Math.hypot(z.re, z.im);
  const re = Math.sqrt((r + z.re) / 2);
  const im = Math.sqrt((r - z.re) / 2) * (z.im < 0 ? -1 : 1);
  return { re, im };
};

/**
 * 双曲正切，使用数值稳定的实数分解：
 *   tanh(x+jy) = [sinh(2x) + j sin(2y)] / [cosh(2x) + cos(2y)]
 * 对很厚 / 很有耗的层（|x| 很大）会饱和到 ±1，做一次保护避免溢出。
 */
export const tanh = (z: C): C => {
  const x = z.re;
  const y = z.im;
  if (Math.abs(x) > 20) return { re: x > 0 ? 1 : -1, im: 0 };
  const denom = Math.cosh(2 * x) + Math.cos(2 * y);
  return {
    re: Math.sinh(2 * x) / denom,
    im: Math.sin(2 * y) / denom,
  };
};

/** 20·log10|z|，反射损耗（dB）用 */
export const db20 = (z: C): number => 20 * Math.log10(Math.max(abs(z), 1e-12));
