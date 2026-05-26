import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string;
  unit?: string;
  trend?: number; // -1 to 1
  trendLabel?: string;
  icon?: React.ReactNode;
  variant?: "gov" | "screen";
  className?: string;
  accent?: string; // accent color
}

export function KpiCard({
  label,
  value,
  unit,
  trend,
  trendLabel,
  icon,
  variant = "gov",
  className,
  accent = "#3b82f6",
}: KpiCardProps) {
  if (variant === "screen") {
    return (
      <div
        className={cn(
          "relative bg-[rgba(15,23,42,0.5)] border border-cyan-500/20 rounded-md p-3 overflow-hidden",
          className,
        )}
      >
        <div className="text-xs text-cyan-100/70 mb-1 flex items-center gap-1.5">
          {icon}
          {label}
        </div>
        <div className="flex items-baseline gap-1">
          <span className="digital text-2xl font-semibold text-white tracking-tight">{value}</span>
          {unit && <span className="text-xs text-cyan-200/60 ml-1">{unit}</span>}
        </div>
        {trend !== undefined && (
          <div
            className={cn(
              "text-[10px] mt-1 digital",
              trend > 0 ? "text-emerald-400" : trend < 0 ? "text-rose-400" : "text-slate-400",
            )}
          >
            {trend > 0 ? "▲" : trend < 0 ? "▼" : "—"} {Math.abs(trend * 100).toFixed(1)}%
            {trendLabel && <span className="text-cyan-200/40 ml-1">{trendLabel}</span>}
          </div>
        )}
        <div
          className="absolute top-0 right-0 w-12 h-12 opacity-20 blur-xl"
          style={{ background: accent }}
        />
      </div>
    );
  }
  return (
    <div className={cn("gov-card", className)}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs text-slate-500 font-medium">{label}</div>
          {icon && <div className="text-slate-400">{icon}</div>}
        </div>
        <div className="flex items-baseline gap-1">
          <span className="kpi-value text-slate-900" style={{ color: accent }}>
            {value}
          </span>
          {unit && <span className="text-xs text-slate-500 ml-1">{unit}</span>}
        </div>
        {trend !== undefined && (
          <div className="text-xs mt-2 flex items-center gap-2">
            <span
              className={cn(
                "digital font-medium",
                trend > 0 ? "text-emerald-600" : trend < 0 ? "text-rose-600" : "text-slate-500",
              )}
            >
              {trend > 0 ? "↑" : trend < 0 ? "↓" : "—"} {Math.abs(trend * 100).toFixed(1)}%
            </span>
            {trendLabel && <span className="text-slate-500">{trendLabel}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
