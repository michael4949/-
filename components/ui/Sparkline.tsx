"use client";
interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: boolean;
}

export function Sparkline({ data, width = 80, height = 24, color = "#3b82f6", fill = true }: SparklineProps) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = width / Math.max(1, data.length - 1);
  const pts = data.map((v, i) => [i * step, height - ((v - min) / range) * (height - 2) - 1]);
  const d = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join("");
  const dArea = d + ` L${(pts.length - 1) * step},${height} L0,${height} Z`;
  return (
    <svg width={width} height={height} className="overflow-visible">
      {fill && (
        <path
          d={dArea}
          fill={color}
          opacity={0.15}
        />
      )}
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} />
    </svg>
  );
}
