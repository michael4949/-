import React from "react";
import { Palette, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { Camouflage } from "../core/types";

const rgbStr = (c: [number, number, number]) => `rgb(${c[0]},${c[1]},${c[2]})`;
const hex = (c: [number, number, number]) =>
  "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();

/** 天蓝伪装配色：真实天空色 ↔ 可调漆色 对比 + 颜料配方 + 雷达告警 */
const CamouflageCard: React.FC<{ cam: Camouflage }> = ({ cam }) => {
  const good = cam.hueMatchDeg < 3;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-slate-700 font-semibold">
        <Palette className="w-4 h-4 text-sky-600" /> 天蓝伪装配色（模拟天空）
      </div>

      {/* 天空 vs 涂料 双色板 */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "真实天空色", desc: "瑞利散射计算", c: cam.skyRGB },
          { label: "隐身面漆色", desc: "颜料调配", c: cam.paintRGB },
        ].map((s) => (
          <div key={s.label} className="rounded-xl overflow-hidden border border-sky-100 shadow-sm">
            <div className="h-20" style={{ background: rgbStr(s.c) }} />
            <div className="px-3 py-2 bg-white">
              <div className="text-xs font-semibold text-slate-700">{s.label}</div>
              <div className="text-[11px] text-slate-400">{s.desc} · {hex(s.c)}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 匹配指标 */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <Metric label="色相吻合" value={`${cam.hueMatchDeg.toFixed(1)}°`} good={good} />
        <Metric label="彩度差" value={cam.chromaGap.toFixed(1)} />
        <Metric label="最接近标准" value={cam.nearestStandard.code} small />
      </div>

      {/* 颜料配比 */}
      <div>
        <div className="text-xs font-semibold text-slate-600 mb-1.5">颜料质量配比</div>
        <div className="space-y-1.5">
          {cam.pigments.map((p) => (
            <div key={p.id} className="flex items-center gap-2">
              <div className="w-28 shrink-0 text-[11px] text-slate-600 truncate" title={p.name}>{p.name}</div>
              <div className="flex-1 h-3.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-500"
                  style={{ width: `${Math.max(2, p.massFrac * 100)}%` }} />
              </div>
              <div className="w-10 text-right text-[11px] font-medium text-slate-700">{(p.massFrac * 100).toFixed(0)}%</div>
            </div>
          ))}
        </div>
      </div>

      {/* 告警 / 说明 */}
      <div className="space-y-1.5">
        {cam.warnings.map((w, i) => {
          const danger = w.startsWith("⚠");
          return (
            <div key={i} className={`flex items-start gap-1.5 text-[11px] leading-relaxed rounded-lg px-2.5 py-1.5
              ${danger ? "bg-amber-50 text-amber-700" : "bg-sky-50 text-sky-800"}`}>
              {danger ? <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      : <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-sky-500" />}
              <span>{w.replace(/^⚠\s*/, "")}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Metric: React.FC<{ label: string; value: string; good?: boolean; small?: boolean }> = ({ label, value, good, small }) => (
  <div className="rounded-lg bg-white border border-sky-100 py-2">
    <div className={`font-bold ${small ? "text-sm" : "text-lg"} ${good ? "text-emerald-600" : "text-slate-800"}`}>{value}</div>
    <div className="text-[10px] text-slate-400">{label}</div>
  </div>
);

export default CamouflageCard;
