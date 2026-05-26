"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatToken, formatNumber, formatCurrency } from "@/lib/utils";

type FmtKey = "token" | "number" | "currency";
const fmtMap: Record<FmtKey, (v: number) => string> = {
  token: formatToken,
  number: formatNumber,
  currency: formatCurrency,
};

interface ScreenLineProps {
  data: { date?: string; label?: string; value: number; value2?: number }[];
  color?: string;
  color2?: string;
  formatType?: FmtKey;
  xKey?: string;
  showAxis?: boolean;
}

export function ScreenLine({
  data,
  color = "#22d3ee",
  color2,
  formatType = "token",
  xKey = "date",
  showAxis = true,
}: ScreenLineProps) {
  const formatter = fmtMap[formatType];
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 6, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="screenLineFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
          {color2 && (
            <linearGradient id="screenLineFill2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color2} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color2} stopOpacity={0.02} />
            </linearGradient>
          )}
        </defs>
        <CartesianGrid strokeDasharray="3 6" stroke="rgba(56, 189, 248, 0.08)" vertical={false} />
        {showAxis && (
          <>
            <XAxis
              dataKey={xKey}
              tick={{ fill: "rgba(180, 220, 255, 0.55)", fontSize: 10 }}
              axisLine={{ stroke: "rgba(56, 189, 248, 0.15)" }}
              tickLine={false}
              interval={Math.floor(data.length / 6)}
            />
            <YAxis
              tick={{ fill: "rgba(180, 220, 255, 0.55)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={formatter}
              width={40}
            />
          </>
        )}
        <Tooltip
          contentStyle={{
            background: "rgba(2, 8, 23, 0.95)",
            border: "1px solid rgba(56, 189, 248, 0.4)",
            borderRadius: 4,
            fontSize: 12,
            color: "#e0f2fe",
          }}
          labelStyle={{ color: "#22d3ee" }}
          formatter={(v: number) => formatter(v)}
        />
        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={1.8} fill="url(#screenLineFill)" />
        {color2 && data[0]?.value2 !== undefined && (
          <Area
            type="monotone"
            dataKey="value2"
            stroke={color2}
            strokeWidth={1.5}
            fill="url(#screenLineFill2)"
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}
