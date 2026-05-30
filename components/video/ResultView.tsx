import React, { useState } from "react";
import { Download, Copy, Check, RotateCcw, Subtitles, Sparkles, Info } from "lucide-react";
import { RenderResult, VideoPlan, SourceMaterial } from "../../types";

interface Props {
  result: RenderResult;
  plan: VideoPlan;
  material: SourceMaterial | null;
  onRestart: () => void;
}

function download(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
}

const ResultView: React.FC<Props> = ({ result, plan, material, onRestart }) => {
  const [copied, setCopied] = useState<string | null>(null);
  const safeName = (plan.title || "video").replace(/[\\/:*?"<>|\s]+/g, "_").slice(0, 40);

  const caption = plan.douyinCaption || plan.title;
  const fullCaption = `${caption}\n${plan.hashtags.map((h) => "#" + h).join(" ")}`;

  const copy = async (text: string, key: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 1600); }
    catch { /* ignore */ }
  };

  const downloadSrt = () => {
    const url = URL.createObjectURL(new Blob([result.srt], { type: "text/plain;charset=utf-8" }));
    download(url, `${safeName}.srt`);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4">
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 text-xs mb-3 border border-emerald-500/30">
          <Sparkles className="w-3.5 h-3.5" /> 视频已生成 · {result.durationSec.toFixed(1)}s · {result.ext.toUpperCase()}
        </div>
        <h2 className="text-2xl font-black text-white">{plan.title}</h2>
      </div>

      <div className="grid md:grid-cols-2 gap-6 items-start">
        {/* 播放器 */}
        <div className="flex justify-center">
          <div className="rounded-3xl overflow-hidden border-4 border-white/10 shadow-2xl bg-black max-w-[300px] w-full">
            <video src={result.url} controls playsInline className="w-full block" />
          </div>
        </div>

        {/* 操作区 */}
        <div className="space-y-3">
          <button onClick={() => download(result.url, `${safeName}.${result.ext}`)}
            className="w-full rounded-xl py-3.5 font-bold flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 to-orange-500 text-black hover:-translate-y-0.5 transition">
            <Download className="w-5 h-5" /> 下载视频（.{result.ext}）
          </button>

          <button onClick={downloadSrt}
            className="w-full rounded-xl py-3 font-semibold flex items-center justify-center gap-2 bg-white/10 text-white border border-white/15 hover:bg-white/15 transition">
            <Subtitles className="w-4 h-4" /> 下载字幕文件（.srt）
          </button>

          {result.ext === "webm" && (
            <div className="flex gap-2 text-amber-200/80 text-xs bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>当前浏览器导出为 WebM。抖音更推荐 MP4：用 Chrome/Edge 打开本页可直接导出 MP4，或用任意工具把 WebM 转成 MP4 再上传。</span>
            </div>
          )}

          {/* 抖音文案 */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/50 text-xs">抖音文案（点一下复制）</span>
              <button onClick={() => copy(fullCaption, "cap")} className="text-amber-300 text-xs flex items-center gap-1 hover:text-amber-200">
                {copied === "cap" ? <><Check className="w-3.5 h-3.5" /> 已复制</> : <><Copy className="w-3.5 h-3.5" /> 复制</>}
              </button>
            </div>
            <p className="text-white/80 text-sm whitespace-pre-wrap leading-relaxed">{fullCaption}</p>
          </div>
        </div>
      </div>

      {material && material.sources.length > 0 && (
        <div className="mt-8 text-center">
          <div className="text-white/30 text-xs mb-2">内容来源</div>
          <div className="flex flex-wrap justify-center gap-2">
            {material.sources.slice(0, 6).map((s, i) => (
              <a key={i} href={s.uri} target="_blank" rel="noreferrer"
                className="text-white/50 hover:text-white/80 text-xs underline decoration-dotted max-w-[200px] truncate">
                {s.title}
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="text-center mt-8">
        <button onClick={onRestart} className="inline-flex items-center gap-2 text-white/60 hover:text-white text-sm">
          <RotateCcw className="w-4 h-4" /> 再做一条
        </button>
      </div>
    </div>
  );
};

export default ResultView;
