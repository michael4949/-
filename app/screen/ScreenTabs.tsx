"use client";

import { useState } from "react";
import { TrendingUp, Cpu } from "lucide-react";

export function ScreenTabs({
  industryView,
  computeView,
}: {
  industryView: React.ReactNode;
  computeView: React.ReactNode;
}) {
  const [tab, setTab] = useState<"industry" | "compute">("industry");

  return (
    <>
      {/* Tab Switcher 嵌入 header 中央 */}
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 bg-slate-950/70 backdrop-blur border border-cyan-500/25 rounded-md p-0.5 shadow-lg shadow-cyan-500/10">
        <button
          onClick={() => setTab("industry")}
          className={`px-4 py-1.5 text-xs rounded font-medium tracking-wider flex items-center gap-1.5 transition-all ${
            tab === "industry"
              ? "bg-gradient-to-r from-cyan-500/30 to-blue-500/30 text-cyan-200 shadow-inner"
              : "text-cyan-300/55 hover:text-cyan-200 hover:bg-cyan-500/10"
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          产业价值
        </button>
        <button
          onClick={() => setTab("compute")}
          className={`px-4 py-1.5 text-xs rounded font-medium tracking-wider flex items-center gap-1.5 transition-all ${
            tab === "compute"
              ? "bg-gradient-to-r from-purple-500/30 to-pink-500/30 text-purple-200 shadow-inner"
              : "text-cyan-300/55 hover:text-cyan-200 hover:bg-cyan-500/10"
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          算力调度
        </button>
      </div>

      {/* 视图按当前 tab 显示/隐藏（双视图均已 SSR，切换零延迟） */}
      <div style={{ display: tab === "industry" ? "block" : "none" }}>{industryView}</div>
      <div style={{ display: tab === "compute" ? "block" : "none" }}>{computeView}</div>
    </>
  );
}
