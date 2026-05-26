"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatToken, formatPercent } from "@/lib/utils";

export interface DonutItem {
  label: string;
  value: number;
  color: string;
}

export function ScreenDonut({ data, total, totalLabel }: { data: DonutItem[]; total?: number; totalLabel?: string }) {
  const sum = total ?? data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="relative h-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            innerRadius="55%"
            outerRadius="80%"
            paddingAngle={2}
            stroke="rgba(2, 8, 23, 0.8)"
            strokeWidth={2}
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "rgba(2, 8, 23, 0.95)",
              border: "1px solid rgba(56, 189, 248, 0.4)",
              borderRadius: 4,
              fontSize: 12,
              color: "#e0f2fe",
            }}
            formatter={(v: number, n: string) => [`${formatToken(v)} (${formatPercent(v / sum)})`, n]}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
        <div className="text-[10px] text-cyan-200/60 mb-0.5">{totalLabel || "总量"}</div>
        <div className="text-xl font-semibold text-cyan-300 digital">{formatToken(sum)}</div>
      </div>
    </div>
  );
}
