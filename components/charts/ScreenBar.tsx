"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatToken, formatNumber, formatCurrency } from "@/lib/utils";

type FmtKey = "token" | "number" | "currency" | "percent";

const fmtMap: Record<FmtKey, (v: number) => string> = {
  token: formatToken,
  number: formatNumber,
  currency: formatCurrency,
  percent: (v) => (v * 100).toFixed(1) + "%",
};

interface ScreenBarProps {
  data: { label: string; value: number; color?: string }[];
  horizontal?: boolean;
  defaultColor?: string;
  formatType?: FmtKey;
}

export function ScreenBar({ data, horizontal, defaultColor = "#22d3ee", formatType = "token" }: ScreenBarProps) {
  const formatter = fmtMap[formatType];
  if (horizontal) {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 14, left: 4, bottom: 0 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="label"
            width={80}
            tick={{ fill: "rgba(180, 220, 255, 0.75)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(56, 189, 248, 0.08)" }}
            contentStyle={{
              background: "rgba(2, 8, 23, 0.95)",
              border: "1px solid rgba(56, 189, 248, 0.4)",
              borderRadius: 4,
              fontSize: 12,
              color: "#e0f2fe",
            }}
            formatter={(v: number) => formatter(v)}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.color || defaultColor} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
        <XAxis dataKey="label" tick={{ fill: "rgba(180, 220, 255, 0.6)", fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: "rgba(180, 220, 255, 0.6)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={formatter} width={42} />
        <Tooltip
          cursor={{ fill: "rgba(56, 189, 248, 0.08)" }}
          contentStyle={{
            background: "rgba(2, 8, 23, 0.95)",
            border: "1px solid rgba(56, 189, 248, 0.4)",
            borderRadius: 4,
            fontSize: 12,
            color: "#e0f2fe",
          }}
          formatter={(v: number) => formatter(v)}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.color || defaultColor} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
