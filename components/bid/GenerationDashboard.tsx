import React from "react";
import { AlertCircle, Check, Circle, Loader2, Pause, Play } from "lucide-react";
import { BidStage, WriteProgress } from "../../bidTypes";

interface Props {
  stages: BidStage[];
  progress: WriteProgress | null;
  log: string[];
  paused: boolean;
  onPause: () => void;
  onResume: () => void;
  error?: string | null;
}

/** 生成驾驶舱：工作流阶段 + 撰写进度（页数/字数/并发小节）+ 暂停续跑 */
const GenerationDashboard: React.FC<Props> = ({ stages, progress, log, paused, onPause, onResume, error }) => {
  const p = progress;
  const ratio = p ? Math.min(1, p.totalChars / Math.max(1, p.targetChars)) : 0;
  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      <h2 className="text-2xl font-black text-white text-center mb-6">正在生成投标文件…</h2>

      <div className="space-y-2.5 mb-5">
        {stages.map((s) => (
          <div key={s.id} className={`flex items-start gap-3 rounded-xl px-4 py-3 border transition ${s.status === "active" ? "bg-sky-400/10 border-sky-400/40" : "bg-white/5 border-white/10"}`}>
            <div className="mt-0.5">
              {s.status === "done" && <Check className="w-5 h-5 text-emerald-400" />}
              {s.status === "active" && <Loader2 className="w-5 h-5 text-sky-400 animate-spin" />}
              {s.status === "pending" && <Circle className="w-5 h-5 text-white/25" />}
              {s.status === "error" && <AlertCircle className="w-5 h-5 text-red-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-semibold ${s.status === "pending" ? "text-white/40" : "text-white"}`}>{s.label}</div>
              {s.detail && <div className="text-white/50 text-xs mt-0.5 truncate">{s.detail}</div>}
            </div>
          </div>
        ))}
      </div>

      {p && (
        <div className="bg-white/5 border border-white/15 rounded-2xl p-4 mb-4">
          <div className="grid grid-cols-4 text-center mb-3">
            <div><div className="text-sky-300 font-black text-xl">≈{p.estPages}</div><div className="text-white/40 text-xs">预计页数 / {p.targetPages}</div></div>
            <div><div className="text-white font-black text-xl">{(p.totalChars / 10000).toFixed(1)}万</div><div className="text-white/40 text-xs">已写字数</div></div>
            <div><div className="text-white font-black text-xl">{p.doneLeaves}/{p.totalLeaves}</div><div className="text-white/40 text-xs">已完成小节</div></div>
            <div><div className="text-white font-black text-xl">{p.calls}</div><div className="text-white/40 text-xs">模型调用</div></div>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-sky-400 to-blue-500 transition-all" style={{ width: `${Math.round(ratio * 100)}%` }} />
          </div>
          {p.activeTitles.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {p.activeTitles.slice(0, 4).map((t) => (
                <span key={t} className="inline-flex items-center gap-1 bg-sky-400/10 border border-sky-400/30 text-sky-200 text-xs rounded-full px-2.5 py-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> {t}
                </span>
              ))}
            </div>
          )}
          <div className="mt-3 flex justify-center">
            {paused ? (
              <button onClick={onResume} className="flex items-center gap-1.5 bg-sky-400 text-black font-bold text-sm rounded-xl px-5 py-2 hover:shadow-lg transition"><Play className="w-4 h-4" /> 继续生成</button>
            ) : (
              <button onClick={onPause} className="flex items-center gap-1.5 border border-white/20 text-white/70 text-sm rounded-xl px-5 py-2 hover:bg-white/5 transition"><Pause className="w-4 h-4" /> 暂停（已完成的小节不会丢）</button>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 text-red-200 rounded-xl px-4 py-3 text-sm mb-4">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>{error}<div className="text-red-300/70 text-xs mt-1">已完成的内容已保存，点「继续生成」从断点续跑。</div></div>
        </div>
      )}

      {log.length > 0 && (
        <div className="bg-black/30 border border-white/10 rounded-xl p-4 max-h-44 overflow-y-auto font-mono text-xs text-white/50 space-y-1">
          {log.slice(-10).map((l, i) => <div key={i}>· {l}</div>)}
        </div>
      )}
      <div className="text-center text-white/30 text-xs mt-4">生成期间请保持本页面打开；中途关闭/刷新后可从断点继续。</div>
    </div>
  );
};

export default GenerationDashboard;
