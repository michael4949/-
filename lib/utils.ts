import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number, digits = 0): string {
  if (n >= 1e8) return (n / 1e8).toFixed(digits || 2) + "亿";
  if (n >= 1e4) return (n / 1e4).toFixed(digits || 2) + "万";
  if (n >= 1000) return n.toLocaleString("zh-CN");
  return n.toFixed(digits);
}

export function formatToken(n: number): string {
  if (n >= 1e12) return (n / 1e12).toFixed(2) + "T";
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toString();
}

export function formatCurrency(n: number): string {
  if (n >= 1e8) return "¥" + (n / 1e8).toFixed(2) + "亿";
  if (n >= 1e4) return "¥" + (n / 1e4).toFixed(2) + "万";
  return "¥" + n.toLocaleString("zh-CN", { maximumFractionDigits: 0 });
}

export function formatPercent(n: number, digits = 1): string {
  return (n * 100).toFixed(digits) + "%";
}

export function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function formatDateTime(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return `${formatDate(date)} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function relativeTime(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "刚刚";
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小时前`;
  const dd = Math.floor(h / 24);
  if (dd < 30) return `${dd} 天前`;
  return formatDate(date);
}
