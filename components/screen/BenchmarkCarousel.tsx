"use client";

import { useEffect, useState } from "react";
import type { BenchmarkCase } from "@/lib/types";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { TrendingUp, Sparkles, Quote } from "lucide-react";

export function BenchmarkCarousel({ cases }: { cases: BenchmarkCase[] }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (cases.length === 0) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % cases.length), 5500);
    return () => clearInterval(t);
  }, [cases.length]);

  if (cases.length === 0) return null;
  const c = cases[idx];

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex flex-col p-3 min-h-0" key={c.id}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.scenarioColor }} />
            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: c.scenarioColor + "30", color: c.scenarioColor }}>{c.scenarioName}</span>
            <span className="text-[10px] text-cyan-200/55">·</span>
            <span className="text-[10px] text-cyan-200/65 truncate">{c.industryName}</span>
          </div>
          <span className="text-[10px] text-cyan-300/45 font-mono flex-shrink-0">{idx + 1}/{cases.length}</span>
        </div>

        <div className="text-sm font-semibold text-white truncate mb-3">{c.enterpriseName}</div>

        <div className="space-y-2 mb-3">
          <div className="bg-rose-500/10 border border-rose-500/25 rounded p-2">
            <div className="text-[9px] text-rose-300/85 mb-0.5 tracking-wider">BEFORE</div>
            <div className="text-[11px] text-rose-100/95 leading-snug">{c.beforeMetric}</div>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/25 rounded p-2">
            <div className="text-[9px] text-emerald-300/85 mb-0.5 tracking-wider flex items-center gap-1">
              AFTER <Sparkles className="w-2.5 h-2.5" />
            </div>
            <div className="text-[11px] text-emerald-100/95 leading-snug">{c.afterMetric}</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5 mb-2">
          <div className="bg-cyan-500/10 rounded p-1.5 text-center border border-cyan-500/20">
            <div className="text-[9px] text-cyan-200/65">效率</div>
            <div className="digital text-[13px] font-semibold text-cyan-200 mt-0.5">+{c.efficiencyGain}%</div>
          </div>
          <div className="bg-amber-500/10 rounded p-1.5 text-center border border-amber-500/20">
            <div className="text-[9px] text-amber-200/65">月省</div>
            <div className="digital text-[13px] font-semibold text-amber-200 mt-0.5">{formatCurrency(c.costSavedMonthly)}</div>
          </div>
          <div className="bg-purple-500/10 rounded p-1.5 text-center border border-purple-500/20">
            <div className="text-[9px] text-purple-200/65">ROI</div>
            <div className="digital text-[13px] font-semibold text-purple-200 mt-0.5">{c.roi}x</div>
          </div>
        </div>

        <div className="flex items-start gap-1.5 text-[10px] text-cyan-100/65 leading-relaxed italic">
          <Quote className="w-3 h-3 mt-0.5 flex-shrink-0 text-cyan-400/55" />
          <span className="line-clamp-2">{c.testimonial}</span>
        </div>
      </div>

      {/* 进度指示 */}
      <div className="px-3 pb-2 flex items-center gap-1">
        {cases.map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            className={`h-0.5 transition-all ${i === idx ? "bg-cyan-300 flex-[2]" : "bg-cyan-500/25 flex-1 hover:bg-cyan-400/45"}`}
          />
        ))}
      </div>
    </div>
  );
}
