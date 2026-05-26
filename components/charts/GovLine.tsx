"use client";

import { Area, AreaChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatNumber, formatToken, formatCurrency, formatPercent } from "@/lib/utils";

type FmtKey = "token" | "number" | "currency" | "percent";
const fmtMap: Record<FmtKey, (v: number) => string> = {
  token: formatToken,
  number: formatNumber,
  currency: formatCurrency,
  percent: formatPercent,
};

interface GovLineProps {
  data: any[];
  xKey: string;
  series: { key: string; name: string; color: string; type?: "line" | "area" }[];
  formatType?: FmtKey;
  height?: number;
}

export function GovLine({ data, xKey, series, formatType = "number", height = 280 }: GovLineProps) {
  const formatter = fmtMap[formatType];
  const hasArea = series.some((s) => s.type === "area");
  return (
    <ResponsiveContainer width="100%" height={height}>
      {hasArea ? (
        <AreaChart data={data} margin={{ top: 6, right: 12, left: 0, bottom: 0 }}>
          <defs>
            {series.map((s) => (
              <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey={xKey}
            tick={{ fill: "#64748b", fontSize: 11 }}
            axisLine={{ stroke: "#cbd5e1" }}
            tickLine={false}
            interval={Math.floor(data.length / 8) || 0}
          />
          <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={formatter} width={50} />
          <Tooltip
            contentStyle={{ background: "white", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 12 }}
            formatter={(v: number) => formatter(v)}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 6 }} iconSize={8} />
          {series.map((s) =>
            s.type === "area" ? (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={s.color}
                fill={`url(#grad-${s.key})`}
                strokeWidth={2}
              />
            ) : (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={s.color}
                fill="none"
                strokeWidth={2}
              />
            ),
          )}
        </AreaChart>
      ) : (
        <LineChart data={data} margin={{ top: 6, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey={xKey} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={{ stroke: "#cbd5e1" }} tickLine={false} interval={Math.floor(data.length / 8) || 0} />
          <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={formatter} width={50} />
          <Tooltip contentStyle={{ background: "white", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 12 }} formatter={(v: number) => formatter(v)} />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 6 }} iconSize={8} />
          {series.map((s) => (
            <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2} dot={false} />
          ))}
        </LineChart>
      )}
    </ResponsiveContainer>
  );
}
