import { cn } from "@/lib/utils";

type TagColor = "blue" | "green" | "amber" | "red" | "slate" | "purple" | "cyan";

const colorMap: Record<TagColor, string> = {
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  slate: "bg-slate-100 text-slate-600 ring-slate-200",
  purple: "bg-purple-50 text-purple-700 ring-purple-200",
  cyan: "bg-cyan-50 text-cyan-700 ring-cyan-200",
};

export function Tag({
  color = "slate",
  children,
  className,
  dot,
}: {
  color?: TagColor;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded font-medium ring-1 ring-inset",
        colorMap[color],
        className,
      )}
    >
      {dot && <span className={cn("w-1.5 h-1.5 rounded-full", `bg-${color}-500`)} />}
      {children}
    </span>
  );
}
