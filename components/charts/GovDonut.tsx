"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatNumber, formatToken, formatCurrency, formatPercent } from "@/lib/utils";

type FmtKey = "token" | "number" | "currency";
const fmtMap: Record<FmtKey, (v: number) => string> = {
  token: formatToken,
  number: formatNumber,
  currency: formatCurrency,
};

interface DonutData {
  name: string;
  value: number;
  color: string;
}

export function GovDonut({ data, height = 260, formatType = "number" }: { data: DonutData[]; height?: number; formatType?: FmtKey }) {
  const formatter = fmtMap[formatType];
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="grid grid-cols-2 gap-2 items-center h-full">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={data} dataKey="value" innerRadius="55%" outerRadius="85%" paddingAngle={2} stroke="white" strokeWidth={2}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Pie>
          <Tooltip formatter={(v: number, n: string) => [`${formatter(v)} (${formatPercent(v / total)})`, n]} contentStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-1.5 pr-2 max-h-full overflow-auto scrollbar-thin text-xs">
        {data.map((d) => (
          <div key={d.name} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: d.color }} />
              <span className="truncate text-slate-600">{d.name}</span>
            </div>
            <span className="digital text-slate-700 font-medium tabular-nums">{formatPercent(d.value / total)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
