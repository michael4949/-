import React from "react";
import type { ResolvedLayer } from "../core/types";
import { MATERIALS } from "../core/materials";

interface Props {
  layers: ResolvedLayer[];          // 外→内
  paintRGB: [number, number, number];
  topcoatThickness: number;         // mm
}

/** 涂层横截面：入射雷达波 → 天蓝面漆 → 吸波层(外匹配/内损耗) → 金属机体 */
const LayerStack: React.FC<Props> = ({ layers, paintRGB, topcoatThickness }) => {
  const W = 360, H = 300, x0 = 20, wBar = 210;
  const metalH = 34;
  // 所有涂层（含面漆）按厚度比例分配高度，但每层至少 26px 以容纳标签
  const all = [
    { name: "天蓝面漆", sub: "伪装层", t: topcoatThickness, fill: `rgb(${paintRGB.join(",")})`, role: "paint" as const },
    ...layers.map((l) => {
      const f = MATERIALS[l.fillerId];
      return {
        name: f.name, sub: `${(l.volFrac * 100).toFixed(0)}vol% / ${MATERIALS[l.matrixId].name}`,
        t: l.thickness, role: f.role, fill: f.role === "magnetic" ? "url(#mag)" : "url(#die)",
      };
    }),
  ];
  const totalT = all.reduce((a, l) => a + l.t, 0);
  const avail = H - metalH - 30;
  const minH = 26;
  const extra = Math.max(0, avail - all.length * minH);
  let y = 20;
  const bands = all.map((l) => {
    const h = minH + (extra * l.t) / totalT;
    const band = { ...l, y, h };
    y += h;
    return band;
  });
  const metalY = y;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: H }}>
      <defs>
        <linearGradient id="mag" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fb923c" /><stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <linearGradient id="die" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#a78bfa" /><stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        <pattern id="metal" width="8" height="8" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
          <rect width="8" height="8" fill="#94a3b8" /><line x1="0" y1="0" x2="0" y2="8" stroke="#64748b" strokeWidth="3" />
        </pattern>
        <marker id="arrow" markerWidth="9" markerHeight="9" refX="6" refY="4.5" orient="auto">
          <path d="M0,0 L9,4.5 L0,9 Z" fill="#0ea5e9" />
        </marker>
      </defs>

      {/* 入射雷达波 */}
      <text x={x0} y={12} fontSize="11" fill="#0284c7">入射雷达波 ↓</text>
      {[0, 1, 2].map((i) => (
        <line key={i} x1={x0 + 6 + i * 26} y1={2} x2={x0 + 6 + i * 26} y2={bands[0].y - 2}
          stroke="#0ea5e9" strokeWidth="2" markerEnd="url(#arrow)" opacity={0.8} />
      ))}

      {/* 各涂层 */}
      {bands.map((b, i) => (
        <g key={i}>
          <rect x={x0} y={b.y} width={wBar} height={b.h - 3} rx={3} fill={b.fill}
            stroke="rgba(255,255,255,0.6)" strokeWidth={1} />
          <text x={x0 + 10} y={b.y + (b.h - 3) / 2 - 2} fontSize="12" fontWeight={600}
            fill={b.role === "paint" ? "#0c4a6e" : "#1e293b"}>{b.name}</text>
          <text x={x0 + 10} y={b.y + (b.h - 3) / 2 + 12} fontSize="9.5"
            fill={b.role === "paint" ? "#0c4a6e" : "#334155"} opacity={0.85}>{b.sub}</text>
          {/* 厚度标注 */}
          <text x={x0 + wBar + 8} y={b.y + (b.h - 3) / 2 + 3} fontSize="11" fill="#475569">
            {b.t.toFixed(2)} mm
          </text>
        </g>
      ))}

      {/* 金属机体 */}
      <rect x={x0} y={metalY} width={wBar} height={metalH} rx={3} fill="url(#metal)" />
      <text x={x0 + wBar / 2} y={metalY + metalH / 2 + 4} fontSize="12" fontWeight={700}
        fill="#1e293b" textAnchor="middle">金属机体（PEC 背衬）</text>
    </svg>
  );
};

export default LayerStack;
