/** 端到端验证：跑一遍智能体，打印 X 波段方案与天蓝伪装。运行：npx tsx stealth/core/e2e.ts */
import { runAgent, BANDS } from "./agent";
import { skyColor } from "./color";

const t0 = Date.now();
const band = BANDS.find((b) => b.id === "X")!;
const res = runAgent({
  bandLabel: band.id, fStartGHz: band.f0, fEndGHz: band.f1,
  maxThickness: 3.0, maxArealMass: 6.0, maxLayers: 3, weightPriority: 0.5,
});
const ms = Date.now() - t0;

console.log(`\n智能体耗时 ${ms} ms`);
console.log(`\n=== 天空真实色（瑞利散射） sRGB = ${skyColor().join(",")} ===`);

const d = res.best;
console.log(`\n最优范式：${d.template}  | 综合分 ${d.score.toFixed(1)}`);
console.log("推理：");
res.rationale.forEach((line) => console.log("  · " + line));

console.log("\n层结构（外→内）：");
d.layers.forEach((l, i) =>
  console.log(`  L${i + 1}: filler=${l.fillerId} vol=${(l.volFrac * 100).toFixed(0)}% d=${l.thickness.toFixed(2)}mm`
    + `  ε=${l.eps.re.toFixed(1)}${l.eps.im.toFixed(1)}j μ=${l.mu.re.toFixed(2)}${l.mu.im.toFixed(2)}j ρ=${l.density.toFixed(2)}`));

console.log(`\n指标: minRL=${d.minRL.toFixed(1)}dB worstRL=${d.worstRL.toFixed(1)}dB BW(-10dB)=${d.bandwidth10.toFixed(1)}GHz`
  + ` 厚=${d.totalThickness.toFixed(2)}mm 面密度=${d.arealMass.toFixed(2)}kg/m²`);

console.log(`\n伪装: 天空色=${d.camouflage.skyRGB.join(",")} 漆色=${d.camouflage.paintRGB.join(",")} 色相吻合Δh=${d.camouflage.hueMatchDeg.toFixed(1)}° 彩度差=${d.camouflage.chromaGap.toFixed(1)} 完整ΔE=${d.camouflage.deltaE.toFixed(2)}`);
console.log("  颜料配比: " + d.camouflage.pigments.map((p) => `${p.name} ${(p.massFrac * 100).toFixed(0)}%`).join(" / "));
console.log(`  最接近标准: ${d.camouflage.nearestStandard.name}(${d.camouflage.nearestStandard.code}) ΔE=${d.camouflage.nearestStandard.deltaE.toFixed(1)}`);

console.log(`\n备选方案数: ${res.alternatives.length}`);
res.alternatives.forEach((a) =>
  console.log(`  - ${a.template}: 分${a.score.toFixed(1)} minRL=${a.minRL.toFixed(1)} 厚=${a.totalThickness.toFixed(2)}mm 面密度=${a.arealMass.toFixed(2)}`));
