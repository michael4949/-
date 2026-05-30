import React from "react";
import { Check, Loader2, Circle, AlertCircle } from "lucide-react";
import { StageState } from "../../types";

interface Props {
  stages: StageState[];
  log: string[];
  renderRatio?: number;
}

const StageProgress: React.FC<Props> = ({ stages, log, renderRatio }) => {
  return (
    <div className="w-full max-w-xl mx-auto px-4">
      <h2 className="text-2xl font-black text-white text-center mb-8">正在生成你的爆款视频…</h2>
      <div className="space-y-3">
        {stages.map((s) => (
          <div key={s.id} className={`flex items-start gap-3 rounded-xl px-4 py-3 border transition ${s.status === "active" ? "bg-amber-400/10 border-amber-400/40" : "bg-white/5 border-white/10"}`}>
            <div className="mt-0.5">
              {s.status === "done" && <Check className="w-5 h-5 text-emerald-400" />}
              {s.status === "active" && <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />}
              {s.status === "pending" && <Circle className="w-5 h-5 text-white/25" />}
              {s.status === "error" && <AlertCircle className="w-5 h-5 text-red-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className={`font-semibold ${s.status === "pending" ? "text-white/40" : "text-white"}`}>{s.label}</div>
              {s.detail && <div className="text-white/50 text-sm mt-0.5 truncate">{s.detail}</div>}
              {s.id === "render" && s.status === "active" && typeof renderRatio === "number" && (
                <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 transition-all" style={{ width: `${Math.round(renderRatio * 100)}%` }} />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {log.length > 0 && (
        <div className="mt-6 bg-black/30 border border-white/10 rounded-xl p-4 max-h-40 overflow-y-auto font-mono text-xs text-white/50 space-y-1">
          {log.slice(-8).map((l, i) => <div key={i}>· {l}</div>)}
        </div>
      )}
    </div>
  );
};

export default StageProgress;
