import React from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ReferenceArea,
} from "recharts";
import type { SpectrumPoint } from "../core/types";

interface Props {
  data: SpectrumPoint[];      // 宽带频谱
  band: [number, number];     // 目标频带 [f0,f1] GHz
}

/** 反射损耗 RL(dB) vs 频率 —— 隐身性能的核心曲线。越低越好；≤−10dB=90%吸收。 */
const SpectrumChart: React.FC<Props> = ({ data, band }) => {
  const minRL = Math.min(...data.map((d) => d.rl));
  const yMin = Math.min(-30, Math.floor(minRL / 10) * 10);
  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: -8 }}>
          <defs>
            <linearGradient id="rlStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#0ea5e9" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.5} />
          {/* 目标频带阴影（recharts v3 类型偏严，用 spread 旁路） */}
          <ReferenceArea {...({ x1: band[0], x2: band[1], fill: "#38bdf8", fillOpacity: 0.12 } as any)} />
          <XAxis
            dataKey="freqGHz" type="number" domain={[data[0]?.freqGHz ?? 1, data.at(-1)?.freqGHz ?? 18]}
            tickFormatter={(v) => `${v}`} ticks={[2, 4, 6, 8, 10, 12, 14, 16, 18]}
            stroke="#475569" fontSize={12}
            label={{ value: "频率 GHz", position: "insideBottomRight", offset: -2, fontSize: 11, fill: "#64748b" }}
          />
          <YAxis
            domain={[yMin, 0]} stroke="#475569" fontSize={12} width={44}
            label={{ value: "RL dB", angle: -90, position: "insideLeft", fontSize: 11, fill: "#64748b" }}
          />
          {/* 90% / 99% 吸收参考线 */}
          <ReferenceLine y={-10} stroke="#16a34a" strokeDasharray="5 4"
            label={{ value: "−10dB · 90%吸收", position: "right", fontSize: 10, fill: "#16a34a" }} />
          <ReferenceLine y={-20} stroke="#0d9488" strokeDasharray="2 4"
            label={{ value: "−20dB · 99%", position: "right", fontSize: 10, fill: "#0d9488" }} />
          <Tooltip
            formatter={(v: number) => [`${v.toFixed(1)} dB`, "反射损耗"]}
            labelFormatter={(l) => `${Number(l).toFixed(2)} GHz`}
            contentStyle={{ borderRadius: 12, border: "1px solid #bae6fd", fontSize: 12 }}
          />
          <Line type="monotone" dataKey="rl" stroke="url(#rlStroke)" strokeWidth={2.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SpectrumChart;
