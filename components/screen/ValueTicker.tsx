"use client";

import { LiveTicker } from "@/components/ui/LiveTicker";
import type { ScenarioValueEvent } from "@/lib/types";

export function ValueTicker({ events }: { events: ScenarioValueEvent[] }) {
  return (
    <LiveTicker
      items={events}
      rowHeight={48}
      speed={26}
      itemKey={(e) => e.id}
      renderItem={(e) => (
        <div className="flex items-start gap-2 px-1 py-1 text-[11px] border-b border-cyan-500/10 hover:bg-cyan-500/5">
          <span className="text-emerald-400 mt-0.5">●</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-cyan-100 truncate font-medium">{e.enterpriseName}</span>
              <span className="text-[9px] text-cyan-300/55 px-1 rounded bg-cyan-500/10">{e.scenarioName}</span>
            </div>
            <div className="text-cyan-300/65 text-[10px] truncate mt-0.5">{e.action}</div>
            <div className="text-emerald-300 text-[10px] truncate font-medium">→ {e.valueDelta}</div>
          </div>
        </div>
      )}
    />
  );
}
