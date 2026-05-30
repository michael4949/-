import React, { useState } from "react";
import { Clapperboard, AlertCircle } from "lucide-react";
import { VideoOptions, SourceMaterial, VideoPlan, RenderResult, StageState, VisualAsset } from "./types";
import { extractContent } from "./services/contentService";
import { writeViralScript } from "./services/scriptService";
import { synthesizeScenes } from "./services/ttsService";
import { generateSceneImages } from "./services/imageService";
import { collectVisuals, assignVisualsToScenes } from "./services/visualsService";
import { renderVideo } from "./services/videoEngine";
import InputForm from "./components/video/InputForm";
import StageProgress from "./components/video/StageProgress";
import ScriptReview from "./components/video/ScriptReview";
import ResultView from "./components/video/ResultView";

type View = "input" | "stages" | "review" | "result";

const App: React.FC = () => {
  const [view, setView] = useState<View>("input");
  const [options, setOptions] = useState<VideoOptions | null>(null);
  const [material, setMaterial] = useState<SourceMaterial | null>(null);
  const [plan, setPlan] = useState<VideoPlan | null>(null);
  const [result, setResult] = useState<RenderResult | null>(null);
  const [stages, setStages] = useState<StageState[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [renderRatio, setRenderRatio] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const addLog = (m: string) => setLog((l) => [...l, m]);
  const setStage = (id: StageState["id"], patch: Partial<StageState>) =>
    setStages((ss) => ss.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const failActive = () => setStages((ss) => ss.map((s) => (s.status === "active" ? { ...s, status: "error" } : s)));

  // 阶段 A：读取内容 → 写脚本
  const handleSubmit = async (input: string, opts: VideoOptions) => {
    setOptions(opts); setError(null); setLog([]); setResult(null);
    setStages([
      { id: "read", label: "读取网页 / 文字内容", status: "active" },
      { id: "script", label: "撰写抖音爆款脚本", status: "pending" },
    ]);
    setView("stages");
    try {
      const mat = await extractContent(input, addLog);
      setMaterial(mat);
      setStage("read", { status: "done", detail: `《${mat.title}》· ${mat.keyPoints.length} 个要点` });
      setStage("script", { status: "active" });
      const p = await writeViralScript(mat, opts, addLog);
      setPlan(p);
      setStage("script", { status: "done", detail: `${p.scenes.length} 镜` });
      setView("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "出错了，请重试。");
      failActive();
    }
  };

  // 阶段 B：配音 → 截取网页真实画面 →（AI配图兜底）→ 渲染导出
  const handleRender = async () => {
    if (!plan || !options || !material) return;
    setError(null); setLog([]); setRenderRatio(0);
    const st: StageState[] = [
      { id: "voice", label: "合成中文配音", status: "active" },
      { id: "images", label: "截取网页真实画面", status: "pending" },
      { id: "render", label: "渲染并导出视频", status: "pending" },
    ];
    setStages(st);
    setView("stages");
    try {
      const audios = await synthesizeScenes(plan, (done, total, est) =>
        setStage("voice", { detail: `${done}/${total} 段${est ? "（含静音占位）" : ""}` })
      );
      setStage("voice", { status: "done", detail: `${audios.length} 段` });

      // —— 关键：抓取网页实拍截图 + 页面真实配图，作为画面主体 ——
      setStage("images", { status: "active" });
      const roles = plan.scenes.map((s) => s.role);
      let perScene: (VisualAsset | null)[] = plan.scenes.map(() => null);
      try {
        const assets = await collectVisuals(
          { pageUrls: material.pageUrls, images: material.images, aspect: options.aspect, bodyText: material.fullText },
          addLog
        );
        if (assets.length) {
          perScene = assignVisualsToScenes(assets, plan.scenes.length, roles);
          const shots = assets.filter((a) => a.kind === "screenshot").length;
          setStage("images", { status: "done", detail: `${shots} 张网页截图 + ${assets.length - shots} 张配图` });
        } else {
          setStage("images", { status: "done", detail: "未取到网页画面，使用动效背景" });
        }
      } catch (e) {
        console.warn(e);
        setStage("images", { status: "done", detail: "网页画面抓取失败，使用动效背景" });
      }

      // 可选：对仍没有真实画面的场景，用 AI 配图补位
      if (options.useAiImages && perScene.some((v) => !v)) {
        addLog("为缺画面的场景生成 AI 配图…");
        const aiBmps = await generateSceneImages(plan.scenes, options.aspect);
        perScene = perScene.map((v, i) =>
          v || (aiBmps[i] ? { kind: "image" as const, url: "ai", bitmap: aiBmps[i]!, w: aiBmps[i]!.width, h: aiBmps[i]!.height } : null)
        );
      }

      setStage("render", { status: "active" });
      const res = await renderVideo(plan, audios, perScene, options, (ratio, note) => {
        setRenderRatio(ratio);
        if (note) setStage("render", { detail: note });
      });
      setResult(res);
      setStage("render", { status: "done", detail: `${res.ext.toUpperCase()} · ${res.durationSec.toFixed(1)}s` });
      setView("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "渲染失败，请重试。");
      failActive();
    }
  };

  const restart = () => {
    if (result?.url) URL.revokeObjectURL(result.url);
    setResult(null); setPlan(null); setMaterial(null); setError(null); setLog([]);
    setView("input");
  };

  return (
    <div className="min-h-screen text-white relative overflow-hidden" style={{ background: "radial-gradient(1200px 600px at 50% -10%, #1e293b 0%, #0a0e1a 55%, #05070d 100%)" }}>
      {/* 顶栏 */}
      <nav className="relative z-10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={restart}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <Clapperboard className="w-5 h-5 text-black" />
          </div>
          <span className="font-bold tracking-tight">AI 爆款工厂</span>
        </div>
        <span className="text-white/30 text-xs hidden sm:block">链接 → 中文配音竖屏视频</span>
      </nav>

      <main className="relative z-10 py-8 md:py-12 flex flex-col items-center">
        {error && (
          <div className="w-full max-w-xl mx-auto px-4 mb-6">
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 text-red-200 rounded-xl px-4 py-3 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div>{error}</div>
                <button onClick={() => (view === "stages" && plan ? setView("review") : setView("input"))}
                  className="mt-1 underline text-red-300 hover:text-red-200">返回</button>
              </div>
            </div>
          </div>
        )}

        {view === "input" && <InputForm onSubmit={handleSubmit} isLoading={false} />}
        {view === "stages" && <StageProgress stages={stages} log={log} renderRatio={renderRatio} />}
        {view === "review" && plan && (
          <ScriptReview plan={plan} onChange={setPlan} onConfirm={handleRender} onBack={() => setView("input")} />
        )}
        {view === "result" && result && plan && (
          <ResultView result={result} plan={plan} material={material} onRestart={restart} />
        )}
      </main>

      <footer className="relative z-10 text-center text-white/25 text-xs py-6 px-4">
        全程在你的浏览器本地完成 · 内容由 Gemini 读取与生成，请自行核对事实后再发布 · 推荐 Chrome / Edge 导出 MP4
      </footer>
    </div>
  );
};

export default App;
