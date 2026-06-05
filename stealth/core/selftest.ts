/**
 * 物理引擎自检：用已知的电磁学结论校验实现是否「物理正确」。
 * 运行：npx tsx stealth/core/selftest.ts
 */
import { cx, abs } from "./complex";
import {
  C0, maxwellGarnett, bruggeman, compositeProps, reflectionLoss, spectrum,
} from "./physics";
import { MATERIALS } from "./materials";

let pass = 0, fail = 0;
const ok = (name: string, cond: boolean, extra = "") => {
  (cond ? pass++ : fail++);
  console.log(`${cond ? "✅" : "❌"} ${name}${extra ? "  — " + extra : ""}`);
};

// 1) 裸金属（无涂层）应全反射，RL ≈ 0 dB
{
  const rl = reflectionLoss([], 10e9);
  ok("裸金属全反射 RL≈0dB", Math.abs(rl) < 1e-6, `RL=${rl.toFixed(3)}dB`);
}

// 2) 无源有耗涂层在全频带必须 RL ≤ 0（不能「放大」反射）
{
  const { eps, mu } = compositeProps(MATERIALS.epoxy, MATERIALS.cip, 0.4);
  const spec = spectrum([{ eps, mu, thickness: 2.0 }], 2, 18, 161);
  const maxRL = Math.max(...spec.map((p) => p.rl));
  ok("无源被动性 RL≤0", maxRL <= 1e-6, `最大 RL=${maxRL.toFixed(4)}dB`);
}

// 3) Dallenbach 单层应出现明显吸收谷（< −10 dB）
{
  const { eps, mu } = compositeProps(MATERIALS.epoxy, MATERIALS.cip, 0.45);
  const spec = spectrum([{ eps, mu, thickness: 1.8 }], 2, 18, 321);
  const minRL = Math.min(...spec.map((p) => p.rl));
  const fmin = spec.reduce((a, b) => (b.rl < a.rl ? b : a)).freqGHz;
  ok("Dallenbach 出现吸收谷<−10dB", minRL < -10, `谷值 ${minRL.toFixed(1)}dB @ ${fmin.toFixed(2)}GHz`);
}

// 4) 1/4 波长定律：厚度加倍 → 基波谐振频率约减半
//    （厚层会有 λ/4、3λ/4… 多阶谷，全局最小可能落在高阶谷上，故须取「最低频的基波谷」）
{
  const { eps, mu } = compositeProps(MATERIALS.epoxy, MATERIALS.cip, 0.4);
  const fundamentalDip = (d: number) => {
    const spec = spectrum([{ eps, mu, thickness: d }], 0.5, 18, 1401);
    for (let i = 1; i < spec.length - 1; i++) {
      if (spec[i].rl < -5 && spec[i].rl < spec[i - 1].rl && spec[i].rl <= spec[i + 1].rl) {
        return spec[i].freqGHz; // 自低频向上扫到的第一个明显局部极小 = 基波
      }
    }
    return spec.reduce((a, b) => (b.rl < a.rl ? b : a)).freqGHz;
  };
  const f1 = fundamentalDip(2.0), f2 = fundamentalDip(4.0);
  const ratio = f1 / f2; // 期望 ≈ 2
  ok("1/4波长定律 厚度×2→基波谷频÷2", Math.abs(ratio - 2) < 0.3,
    `f(2mm)=${f1.toFixed(2)} f(4mm)=${f2.toFixed(2)} 比=${ratio.toFixed(2)}`);
}

// 5) 完美阻抗匹配（μ=ε、足够损耗）→ 极深吸收谷
{
  const eps = cx(10, -10), mu = cx(10, -10); // η=√(μ/ε)=1 → 与自由空间匹配
  const spec = spectrum([{ eps, mu, thickness: 3 }], 2, 18, 321);
  const minRL = Math.min(...spec.map((p) => p.rl));
  ok("阻抗匹配层产生深吸收谷<−25dB", minRL < -25, `谷值 ${minRL.toFixed(1)}dB`);
}

// 6) EMT 端点 / 物理性
{
  const e0 = maxwellGarnett(MATERIALS.epoxy.eps, MATERIALS.cip.eps, 0);
  ok("MG f=0 还原基体", abs({ re: e0.re - 3.6, im: e0.im + 0.04 }) < 1e-6,
    `ε=${e0.re.toFixed(2)}${e0.im.toFixed(2)}j`);
  const eb = bruggeman(MATERIALS.epoxy.eps, MATERIALS.mwcnt.eps, 0.1);
  ok("Bruggeman 物理根 (ε'>0, ε''>0)", eb.re > 0 && eb.im < 0,
    `ε=${eb.re.toFixed(2)}${eb.im.toFixed(2)}j`);
  // 高填充碳管：介电常数与损耗应显著高于纯基体
  ok("填料抬升损耗", eb.re > 3.6 && -eb.im > 0.04, `ε''=${(-eb.im).toFixed(2)}`);
}

console.log(`\n=== ${pass} 通过 / ${fail} 失败 ===`);
process.exit(fail ? 1 : 0);
