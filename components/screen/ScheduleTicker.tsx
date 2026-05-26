"use client";

import { LiveTicker } from "@/components/ui/LiveTicker";
import type { ScheduleLog } from "@/lib/types";

export function ScheduleTicker({ logs }: { logs: ScheduleLog[] }) {
  return (
    <LiveTicker
      items={logs}
      rowHeight={42}
      speed={32}
      itemKey={(l) => l.id}
      renderItem={(log) => (
        <div className="flex items-center gap-2 px-1 py-1 text-[11px] border-b border-cyan-500/10 hover:bg-cyan-500/5">
          <span
            className={
              log.status === "DONE"
                ? "text-emerald-400"
                : log.status === "RUNNING"
                  ? "text-cyan-400 animate-pulse"
                  : log.status === "FAILED"
                    ? "text-rose-400"
                    : log.status === "PREEMPTED"
                      ? "text-amber-400"
                      : "text-slate-400"
            }
          >
            ●
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-cyan-100 truncate">{log.enterpriseName}</div>
            <div className="text-cyan-300/55 text-[10px] truncate">
              {log.scenario} · {log.cardsAllocated} 卡 · {log.chipPref.toUpperCase()}
            </div>
          </div>
          <div className="text-right text-[10px] text-cyan-200/65">
            <div>{log.fromCenter}</div>
            <div className="text-cyan-300/45">{log.routed ? "本地" : "跨中心"}</div>
          </div>
        </div>
      )}
    />
  );
}
