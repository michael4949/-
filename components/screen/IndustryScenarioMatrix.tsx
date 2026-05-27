"use client";

import { useMemo, useState } from "react";
import type { IndustryScenarioCell, MaturityLevel } from "@/lib/types";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";

const MATURITY_LABEL: Record<MaturityLevel, string> = {
  mature: "成熟",
  scaling: "规模化",
  pilot: "试点",
  emerging: "新兴",
};

const MATURITY_COLOR: Record<MaturityLevel, string> = {
  mature: "#10b981",
  scaling: "#3b82f6",
  pilot: "#f59e0b",
  emerging: "#a855f7",
};

interface MatrixProps {
  matrix: IndustryScenarioCell[];
  industries: { code: string; name: string; color: string }[];
  scenarios: { code: string; name: string; color: string }[];
}

export function IndustryScenarioMatrix({ matrix, industries, scenarios }: MatrixProps) {
  const [hover, setHover] = useState<IndustryScenarioCell | null>(null);
  const [selected, setSelected] = useState<IndustryScenarioCell | null>(null);

  const cellMap = useMemo(() => {
    const m = new Map<string, IndustryScenarioCell>();
    matrix.forEach((c) => m.set(c.industryCode + "::" + c.scenarioCode, c));
    return m;
  }, [matrix]);

  const detail = selected || hover;

  return (
    <div className="h-full flex flex-col">
      {/* 热力图主体 */}
      <div className="flex-1 min-h-0 overflow-auto scrollbar-thin">
        <div className="min-w-fit">
          {/* 顶部场景标签行 */}
          <div className="flex sticky top-0 z-10 bg-[rgba(2,8,23,0.95)] backdrop-blur-sm">
            <div className="w-[88px] flex-shrink-0 border-b border-r border-cyan-500/15" />
            {scenarios.map((sc) => (
              <div
                key={sc.code}
                className="w-[64px] flex-shrink-0 border-b border-r border-cyan-500/15 px-1 py-2 text-center"
                title={sc.name}
              >
                <div
                  className="text-[10px] font-medium leading-tight truncate"
                  style={{ color: sc.color }}
                >
                  {sc.name}
                </div>
              </div>
            ))}
          </div>

          {/* 行：每行一个行业 */}
          {industries.map((ind) => (
            <div key={ind.code} className="flex">
              <div className="w-[88px] flex-shrink-0 border-b border-r border-cyan-500/15 px-2 py-2 flex items-center gap-1.5 sticky left-0 bg-[rgba(2,8,23,0.95)] z-[5]">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: ind.color }} />
                <span className="text-[11px] text-cyan-100/85 truncate">{ind.name}</span>
              </div>
              {scenarios.map((sc) => {
                const cell = cellMap.get(ind.code + "::" + sc.code);
                if (!cell) {
                  return <div key={sc.code} className="w-[64px] h-[42px] flex-shrink-0 border-b border-r border-cyan-500/10" />;
                }
                const intensity = cell.heat / 100;
                const isHi = (selected || hover)?.industryCode === ind.code && (selected || hover)?.scenarioCode === sc.code;
                return (
                  <button
                    key={sc.code}
                    onMouseEnter={() => setHover(cell)}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => setSelected((cur) => (cur === cell ? null : cell))}
                    className={`w-[64px] h-[42px] flex-shrink-0 border-b border-r border-cyan-500/10 relative transition-all ${isHi ? "ring-2 ring-cyan-300 ring-inset z-[3]" : ""}`}
                    style={{
                      background: `rgba(34, 211, 238, ${0.04 + intensity * 0.75})`,
                    }}
                  >
                    {/* 主指标：渗透率 */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-[10px] digital font-semibold" style={{ color: intensity > 0.5 ? "white" : "#cffafe" }}>
                        {(cell.penetration * 100).toFixed(0)}%
                      </span>
                      <span className="text-[8px] text-cyan-100/55 leading-none mt-0.5">
                        {cell.enterprises}
                      </span>
                    </div>
                    {/* 成熟度标签（小色块） */}
                    <span
                      className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full"
                      style={{ background: MATURITY_COLOR[cell.maturity] }}
                    />
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* 图例条 */}
      <div className="border-t border-cyan-500/15 px-3 py-2 flex items-center gap-3 text-[10px] text-cyan-200/70">
        <span>渗透率：</span>
        <div className="flex items-center gap-1">
          <div className="w-4 h-3 rounded-sm" style={{ background: "rgba(34, 211, 238, 0.08)" }} />
          <span>低</span>
          <div className="w-4 h-3 rounded-sm" style={{ background: "rgba(34, 211, 238, 0.45)" }} />
          <span>中</span>
          <div className="w-4 h-3 rounded-sm" style={{ background: "rgba(34, 211, 238, 0.78)" }} />
          <span>高</span>
        </div>
        <span className="ml-3">成熟度：</span>
        {(["mature", "scaling", "pilot", "emerging"] as MaturityLevel[]).map((m) => (
          <span key={m} className="inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: MATURITY_COLOR[m] }} />
            <span>{MATURITY_LABEL[m]}</span>
          </span>
        ))}
        <span className="ml-auto text-cyan-300/55">悬停查看详情，点击锁定下钻</span>
      </div>

      {/* 下钻浮层 */}
      {detail && (
        <div className="absolute right-3 top-12 w-[280px] z-20 bg-slate-950/95 backdrop-blur-sm border border-cyan-400/35 rounded-md p-3 shadow-2xl shadow-cyan-500/15">
          <div className="text-xs text-cyan-300/55 mb-1">{detail.industryName} × </div>
          <div className="text-base font-semibold text-white">{detail.scenarioName}</div>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: MATURITY_COLOR[detail.maturity] + "30", color: MATURITY_COLOR[detail.maturity] }}>
              {MATURITY_LABEL[detail.maturity]}
            </span>
            <span className="text-[10px] text-cyan-200/55 ml-2">综合热度 <span className="digital font-medium text-cyan-300">{detail.heat}</span></span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <Cell label="渗透率" value={formatPercent(detail.penetration)} color="#22d3ee" />
            <Cell label="使用企业" value={formatNumber(detail.enterprises)} color="#a855f7" />
            <Cell label="效率提升" value={formatPercent(detail.efficiencyGain)} color="#10b981" />
            <Cell label="累计降本" value={formatCurrency(detail.costSaved)} color="#f59e0b" />
          </div>

          {selected && (
            <div className="mt-3 pt-2 border-t border-cyan-500/15 text-[10px] text-cyan-300/65 flex items-center justify-between">
              <span>已锁定</span>
              <button onClick={() => setSelected(null)} className="text-cyan-300 hover:text-white">关闭 ✕</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Cell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-cyan-500/8 rounded p-2 border border-cyan-500/15">
      <div className="text-[10px] text-cyan-200/65">{label}</div>
      <div className="text-sm digital font-semibold mt-0.5" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
