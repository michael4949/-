"use client";

import { LiveTicker } from "@/components/ui/LiveTicker";
import type { AlertItem } from "@/lib/types";

export function AlertTicker({ alerts }: { alerts: AlertItem[] }) {
  return (
    <LiveTicker
      items={alerts}
      rowHeight={42}
      speed={28}
      itemKey={(a) => a.id}
      renderItem={(a) => (
        <div className="flex items-start gap-2 px-1 py-1 text-[11px] border-b border-cyan-500/10">
          <span
            className={
              a.level === "CRITICAL"
                ? "text-rose-400 animate-pulse"
                : a.level === "WARN"
                  ? "text-amber-400"
                  : "text-cyan-400"
            }
          >
            ●
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-cyan-100 truncate">{a.title}</div>
            <div className="text-cyan-300/50 text-[10px] truncate">{a.detail}</div>
          </div>
        </div>
      )}
    />
  );
}
