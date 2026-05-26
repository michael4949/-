"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

interface TickerProps<T> {
  items: T[];
  renderItem: (item: T, idx: number) => React.ReactNode;
  speed?: number;
  className?: string;
  itemKey?: (item: T) => string;
  rowHeight?: number;
}

export function LiveTicker<T>({ items, renderItem, speed = 60, className, itemKey, rowHeight = 32 }: TickerProps<T>) {
  const doubled = useMemo(() => [...items, ...items], [items]);
  if (items.length === 0) return null;
  const totalHeight = items.length * rowHeight;
  const duration = totalHeight / speed;

  return (
    <div className={cn("relative overflow-hidden h-full", className)}>
      <div
        className="absolute inset-x-0"
        style={{
          animation: `marquee ${duration}s linear infinite`,
        }}
      >
        {doubled.map((item, i) => (
          <div key={`${itemKey ? itemKey(item) : ""}-${i}`} style={{ height: rowHeight }}>
            {renderItem(item, i % items.length)}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Clock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!now) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
  return (
    <div className="flex items-center gap-2 text-cyan-200/85">
      <span className="text-xs">
        {now.getFullYear()}-{pad(now.getMonth() + 1)}-{pad(now.getDate())} 周{weekdays[now.getDay()]}
      </span>
      <span className="digital text-base font-medium">
        {pad(now.getHours())}:{pad(now.getMinutes())}:<span className="text-cyan-400">{pad(now.getSeconds())}</span>
      </span>
    </div>
  );
}
