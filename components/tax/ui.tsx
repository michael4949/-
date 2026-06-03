import React from "react";
import { FilingStatus } from "../../types";

export const cx = (...c: (string | false | null | undefined)[]) =>
  c.filter(Boolean).join(" ");

// ---------------------------------------------------------------------
//  卡片容器
// ---------------------------------------------------------------------
export const Card: React.FC<{ className?: string; children: React.ReactNode; pad?: boolean }> = ({
  className, children, pad = true,
}) => (
  <div className={cx("bg-white rounded-xl2 border border-line shadow-card", pad && "p-5", className)}>
    {children}
  </div>
);

export const SectionTitle: React.FC<{ title: string; sub?: string; right?: React.ReactNode; icon?: React.ReactNode }> = ({
  title, sub, right, icon,
}) => (
  <div className="flex items-end justify-between gap-3 mb-4">
    <div className="flex items-center gap-2.5 min-w-0">
      {icon}
      <div className="min-w-0">
        <h3 className="text-[15px] font-bold text-ink leading-tight">{title}</h3>
        {sub && <p className="text-xs text-ink-muted mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
    {right}
  </div>
);

// ---------------------------------------------------------------------
//  彩色图标盒
// ---------------------------------------------------------------------
const TONES: Record<string, string> = {
  brand: "bg-brand-50 text-brand",
  violet: "bg-violet2-soft text-violet2",
  teal: "bg-teal2-soft text-teal2",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  slate: "bg-page text-ink-soft",
};
export const IconBox: React.FC<{ tone?: keyof typeof TONES; children: React.ReactNode; size?: number; className?: string }> = ({
  tone = "brand", children, size = 40, className,
}) => (
  <div className={cx("rounded-xl flex items-center justify-center shrink-0", TONES[tone], className)}
    style={{ width: size, height: size }}>
    {children}
  </div>
);

// ---------------------------------------------------------------------
//  通用徽标
// ---------------------------------------------------------------------
export const Badge: React.FC<{ tone?: keyof typeof TONES; children: React.ReactNode; className?: string; dot?: boolean }> = ({
  tone = "slate", children, className, dot,
}) => (
  <span className={cx("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold", TONES[tone], className)}>
    {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />}
    {children}
  </span>
);

// ---------------------------------------------------------------------
//  申报状态徽标
// ---------------------------------------------------------------------
const STATUS_TONE: Record<FilingStatus, keyof typeof TONES> = {
  待采集: "slate",
  AI已生成: "violet",
  待复核: "warning",
  待审批: "brand",
  可申报: "teal",
  已申报: "success",
  已缴款: "success",
};
export const StatusBadge: React.FC<{ status: FilingStatus }> = ({ status }) => (
  <Badge tone={STATUS_TONE[status]} dot>{status}</Badge>
);

// ---------------------------------------------------------------------
//  风险等级徽标
// ---------------------------------------------------------------------
export const RiskBadge: React.FC<{ level: "high" | "mid" | "low" | "none" }> = ({ level }) => {
  if (level === "none") return <span className="text-ink-faint text-xs">—</span>;
  const map = { high: ["danger", "高风险"], mid: ["warning", "中风险"], low: ["teal", "低风险"] } as const;
  const [tone, label] = map[level];
  return <Badge tone={tone as keyof typeof TONES}>{label}</Badge>;
};

// ---------------------------------------------------------------------
//  进度条
// ---------------------------------------------------------------------
export const ProgressBar: React.FC<{ value: number; tone?: string; className?: string; height?: number }> = ({
  value, tone = "#3358F4", className, height = 6,
}) => (
  <div className={cx("w-full rounded-full bg-page overflow-hidden", className)} style={{ height }}>
    <div className="h-full rounded-full transition-all duration-700"
      style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: tone }} />
  </div>
);

// ---------------------------------------------------------------------
//  趋势小箭头
// ---------------------------------------------------------------------
export const Delta: React.FC<{ value: number; suffix?: string; goodIsUp?: boolean }> = ({
  value, suffix = "%", goodIsUp = false,
}) => {
  const up = value >= 0;
  const good = goodIsUp ? up : !up;
  return (
    <span className={cx("inline-flex items-center gap-0.5 text-xs font-semibold", good ? "text-success" : "text-danger")}>
      {up ? "▲" : "▼"} {Math.abs(value)}{suffix}
    </span>
  );
};
