"use client";

import { useMemo, useState } from "react";
import { DISTRICTS, COMPUTE_CENTER_TYPES } from "@/lib/constants";
import type { ComputeCenter, DistrictUsage } from "@/lib/types";
import { formatNumber, formatToken } from "@/lib/utils";

interface CityMapProps {
  centers: ComputeCenter[];
  districts: DistrictUsage[];
  showLinks?: boolean;
}

// 地图坐标系：把 lat/lng 投影到 SVG viewBox
const VB_W = 800;
const VB_H = 520;

function project(lat: number, lng: number) {
  // 简单线性映射，针对滨海市（虚构）lng 121.20-121.65, lat 31.00-31.45
  const x = ((lng - 121.18) / (121.68 - 121.18)) * (VB_W - 80) + 40;
  const y = ((31.5 - lat) / (31.5 - 30.95)) * (VB_H - 80) + 40;
  return { x, y };
}

const typeColor: Record<string, string> = {
  INTEL: "#22d3ee",
  SUPER: "#a855f7",
  GENER: "#10b981",
};

export function CityMap({ centers, districts, showLinks = true }: CityMapProps) {
  const [hover, setHover] = useState<{ id: string; x: number; y: number; data: ComputeCenter } | null>(null);

  // 区县点
  const districtPoints = useMemo(
    () =>
      DISTRICTS.map((d) => {
        const usage = districts.find((u) => u.districtCode === d.code);
        const pos = project(d.lat, d.lng);
        return { ...d, ...pos, tokens: usage?.tokens || 0, enterprises: usage?.enterprises || 0 };
      }),
    [districts],
  );

  const computePoints = useMemo(
    () =>
      centers.map((c) => {
        const pos = project(c.lat, c.lng);
        return { ...c, ...pos };
      }),
    [centers],
  );

  const maxTokens = Math.max(...districtPoints.map((d) => d.tokens), 1);

  // 调度连线：随机挑选几对 INTEL/SUPER 中心之间连线
  const links = useMemo(() => {
    if (!showLinks) return [];
    const intels = computePoints.filter((c) => c.type === "INTEL" || c.type === "SUPER").slice(0, 10);
    const arr: { x1: number; y1: number; x2: number; y2: number; id: string }[] = [];
    for (let i = 0; i < intels.length; i++) {
      for (let j = i + 1; j < intels.length; j++) {
        const a = intels[i];
        const b = intels[j];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist < 280 && Math.random() > 0.55) {
          arr.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, id: `${a.id}-${b.id}` });
        }
      }
    }
    return arr;
  }, [computePoints, showLinks]);

  return (
    <div className="relative h-full w-full">
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <radialGradient id="cityGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="riverFlow" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0c4a6e" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#0e7490" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#0c4a6e" stopOpacity="0.4" />
          </linearGradient>
          <filter id="pulse">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>

        {/* 网格 */}
        <g stroke="rgba(56, 189, 248, 0.06)" strokeWidth="0.5">
          {Array.from({ length: 16 }).map((_, i) => (
            <line key={`v-${i}`} x1={(i + 1) * (VB_W / 16)} y1="0" x2={(i + 1) * (VB_W / 16)} y2={VB_H} />
          ))}
          {Array.from({ length: 10 }).map((_, i) => (
            <line key={`h-${i}`} y1={(i + 1) * (VB_H / 10)} x1="0" y2={(i + 1) * (VB_H / 10)} x2={VB_W} />
          ))}
        </g>

        {/* 海岸线 + 河流（装饰） */}
        <path
          d={`M ${VB_W - 40} 60 Q ${VB_W - 100} ${VB_H * 0.4} ${VB_W - 60} ${VB_H * 0.6} T ${VB_W - 30} ${VB_H - 40}`}
          fill="none"
          stroke="url(#riverFlow)"
          strokeWidth="20"
          strokeLinecap="round"
          opacity="0.5"
        />
        <path
          d={`M 60 ${VB_H * 0.25} Q ${VB_W * 0.3} ${VB_H * 0.45} ${VB_W * 0.5} ${VB_H * 0.5} T ${VB_W * 0.8} ${VB_H * 0.65}`}
          fill="none"
          stroke="rgba(34, 211, 238, 0.18)"
          strokeWidth="3"
          strokeDasharray="2 4"
        />

        {/* 区县背景区域（伪边界） */}
        {districtPoints.map((d) => {
          const r = 40 + (d.tokens / maxTokens) * 50;
          return (
            <g key={d.code}>
              <circle cx={d.x} cy={d.y} r={r * 1.4} fill="url(#cityGlow)" />
              <circle
                cx={d.x}
                cy={d.y}
                r={r}
                fill="rgba(30, 64, 175, 0.08)"
                stroke="rgba(56, 189, 248, 0.25)"
                strokeWidth="0.5"
                strokeDasharray="2 3"
              />
            </g>
          );
        })}

        {/* 调度链路 */}
        {links.map((l) => (
          <g key={l.id}>
            <line
              x1={l.x1}
              y1={l.y1}
              x2={l.x2}
              y2={l.y2}
              stroke="rgba(168, 85, 247, 0.35)"
              strokeWidth="0.8"
              strokeDasharray="4 4"
            />
            <circle r="2" fill="#a855f7">
              <animateMotion dur={`${4 + Math.random() * 3}s`} repeatCount="indefinite">
                <mpath />
              </animateMotion>
              <animate attributeName="opacity" values="0;1;1;0" dur={`${4 + Math.random() * 3}s`} repeatCount="indefinite" />
            </circle>
          </g>
        ))}

        {/* 区县标签 */}
        {districtPoints.map((d) => (
          <g key={d.code + "-label"}>
            <text
              x={d.x}
              y={d.y - 6}
              textAnchor="middle"
              fontSize="11"
              fill="rgba(180, 220, 255, 0.85)"
              fontWeight="500"
            >
              {d.name}
            </text>
            <text x={d.x} y={d.y + 8} textAnchor="middle" fontSize="9" fill="rgba(180, 220, 255, 0.55)" className="digital">
              {formatToken(d.tokens)}
            </text>
            <text x={d.x} y={d.y + 19} textAnchor="middle" fontSize="8" fill="rgba(168, 85, 247, 0.7)">
              企业 {formatNumber(d.enterprises)}
            </text>
          </g>
        ))}

        {/* 算力中心 */}
        {computePoints.map((c) => {
          const sz = Math.min(8, 4 + Math.log10(c.totalCards));
          const color = typeColor[c.type] || "#22d3ee";
          return (
            <g
              key={c.id}
              onMouseEnter={() => setHover({ id: c.id, x: c.x, y: c.y, data: c })}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: "pointer" }}
            >
              <circle cx={c.x} cy={c.y} r={sz * 2.5} fill={color} opacity="0.15" filter="url(#pulse)">
                <animate attributeName="r" values={`${sz * 2.2};${sz * 3.5};${sz * 2.2}`} dur="2.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.2;0.05;0.2" dur="2.5s" repeatCount="indefinite" />
              </circle>
              <circle cx={c.x} cy={c.y} r={sz} fill={color} stroke="white" strokeWidth="0.8" />
              {c.type === "SUPER" && (
                <path
                  d={`M ${c.x} ${c.y - sz - 4} L ${c.x + 3} ${c.y - sz - 1} L ${c.x - 3} ${c.y - sz - 1} Z`}
                  fill="#facc15"
                />
              )}
            </g>
          );
        })}

        {/* 城市名 */}
        <text x="30" y="40" fontSize="22" fontWeight="600" fill="rgba(56, 189, 248, 0.9)">
          BINHAI
        </text>
        <text x="30" y="58" fontSize="11" fill="rgba(180, 220, 255, 0.5)" letterSpacing="2">
          滨海市算力一张图
        </text>

        {/* 图例 */}
        <g transform={`translate(${VB_W - 170}, ${VB_H - 90})`}>
          <rect width="160" height="80" fill="rgba(2, 8, 23, 0.65)" stroke="rgba(56, 189, 248, 0.25)" rx="3" />
          <text x="10" y="18" fontSize="10" fill="rgba(180, 220, 255, 0.7)" fontWeight="500">
            算力中心类型
          </text>
          {COMPUTE_CENTER_TYPES.map((t, i) => (
            <g key={t.code} transform={`translate(12, ${28 + i * 16})`}>
              <circle cx="6" cy="6" r="4" fill={typeColor[t.code]} stroke="white" strokeWidth="0.5" />
              <text x="18" y="9" fontSize="10" fill="rgba(180, 220, 255, 0.85)">
                {t.name}
              </text>
              <text
                x="148"
                y="9"
                textAnchor="end"
                fontSize="10"
                fill="rgba(180, 220, 255, 0.6)"
                className="digital"
              >
                {centers.filter((c) => c.type === t.code).length}
              </text>
            </g>
          ))}
        </g>
      </svg>

      {/* 悬浮信息卡 */}
      {hover && (
        <div
          className="absolute pointer-events-none bg-slate-950/95 border border-cyan-500/40 rounded p-2 text-xs text-cyan-100 shadow-lg shadow-cyan-500/20 min-w-[180px]"
          style={{
            left: `${(hover.x / VB_W) * 100}%`,
            top: `${(hover.y / VB_H) * 100}%`,
            transform: "translate(-50%, -110%)",
          }}
        >
          <div className="font-medium text-white">{hover.data.name}</div>
          <div className="text-cyan-300/70 text-[10px] mt-0.5">
            {COMPUTE_CENTER_TYPES.find((t) => t.code === hover.data.type)?.name} · {hover.data.vendor}
          </div>
          <div className="mt-1.5 grid grid-cols-2 gap-1 text-[10px]">
            <div>
              <div className="text-cyan-300/60">总卡数</div>
              <div className="digital text-cyan-200 font-medium">{formatNumber(hover.data.totalCards)}</div>
            </div>
            <div>
              <div className="text-cyan-300/60">利用率</div>
              <div className="digital text-emerald-300 font-medium">{(hover.data.utilization * 100).toFixed(1)}%</div>
            </div>
            <div>
              <div className="text-cyan-300/60">峰值算力</div>
              <div className="digital text-purple-300 font-medium">{(hover.data.totalTflops / 1000).toFixed(1)} PF</div>
            </div>
            <div>
              <div className="text-cyan-300/60">PUE</div>
              <div className="digital text-amber-300 font-medium">{hover.data.pue}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
