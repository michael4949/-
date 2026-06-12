import React, { useEffect, useRef, useState } from "react";
import { Clapperboard, FileText, History, X } from "lucide-react";
import { BidOptions, BidRunState, BidStage, BidStageId, CompanyProfile, OutlineNode, WriteProgress } from "./bidTypes";
import { initialStages, newRunState, runPrepare, runProduce } from "./services/bid/workflow";
import { deleteRun, loadLatestRun, saveRun } from "./services/bid/store";
import { flattenLeaves } from "./services/bid/budget";
import BidInputForm from "./components/bid/BidInputForm";
import OutlineReview from "./components/bid/OutlineReview";
import GenerationDashboard from "./components/bid/GenerationDashboard";
import BidResultView from "./components/bid/BidResultView";

type View = "input" | "prepare" | "outline" | "produce" | "result";

/** 独立单文件版（standalone/ 下的 html）会在加载前置入此标记，用于隐藏仓库内的互链 */
declare global { interface Window { __BID_STANDALONE__?: boolean } }
const isStandalone = typeof window !== "undefined" && !!window.__BID_STANDALONE__;

const doneCount = (r: BidRunState): number =>
  Object.values(r.sections).filter((s) => s.status === "done").length;

const BidApp: React.FC = () => {
  const [view, setView] = useState<View>("input");
  const [stages, setStages] = useState<BidStage[]>(initialStages());
  const [log, setLog] = useState<string[]>([]);
  const [progress, setProgress] = useState<WriteProgress | null>(null);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [artifact, setArtifact] = useState<{ blob: Blob; fileName: string } | null>(null);
  const [resumable, setResumable] = useState<BidRunState | null>(null);

  const stateRef = useRef<BidRunState | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    void loadLatestRun().then((r) => r && setResumable(r));
  }, []);

  const addLog = (m: string) => setLog((l) => [...l, m]);
  const setStage = (id: BidStageId, status: BidStage["status"], detail?: string) =>
    setStages((ss) => ss.map((s) => (s.id === id ? { ...s, status, detail: detail ?? s.detail } : s)));
  const failActive = () => setStages((ss) => ss.map((s) => (s.status === "active" ? { ...s, status: "error" } : s)));
  const events = { onStage: setStage, onLog: addLog, onProgress: setProgress };

  const isAbort = (e: unknown) => e instanceof DOMException && e.name === "AbortError";

  // —— 第一段：解析 + 大纲 ——
  const handleSubmit = async (tenderText: string, company: CompanyProfile, options: BidOptions) => {
    const state = newRunState(tenderText, company, options);
    stateRef.current = state;
    setStages(initialStages()); setLog([]); setError(null); setProgress(null); setBusy(true);
    setView("prepare");
    abortRef.current = new AbortController();
    try {
      await runPrepare(state, tenderText, events, abortRef.current.signal);
      setView("outline");
    } catch (e) {
      if (!isAbort(e)) { setError(e instanceof Error ? e.message : "解析失败，请重试。"); failActive(); }
    } finally {
      setBusy(false);
    }
  };

  // —— 第二段：撰写 → 审查 → 排版（可暂停/断点续跑） ——
  const startProduce = async () => {
    const state = stateRef.current;
    if (!state) return;
    setPaused(false); setError(null);
    abortRef.current = new AbortController();
    try {
      const art = await runProduce(state, events, abortRef.current.signal);
      setArtifact(art);
      setView("result");
    } catch (e) {
      if (isAbort(e)) {
        setPaused(true);
        addLog("已暂停。已完成的小节均已保存。");
      } else {
        setError(e instanceof Error ? e.message : "生成中断。");
        setPaused(true);
        failActive();
      }
    }
  };

  const handleOutlineConfirm = async (outline: OutlineNode[]) => {
    const state = stateRef.current;
    if (!state) return;
    state.outline = outline;
    await saveRun(state);
    setView("produce");
    void startProduce();
  };

  // —— 断点恢复 ——
  const resume = (r: BidRunState) => {
    stateRef.current = r;
    setResumable(null); setLog([]); setError(null);
    const st = initialStages();
    st[0].status = "done";
    if (r.outline) st[1].status = "done";
    setStages(st);
    if (r.stage === "outline-review" && r.outline) {
      setView("outline");
    } else if (r.outline) {
      addLog(`从断点恢复：已完成 ${doneCount(r)}/${flattenLeaves(r.outline).length} 个小节。点「继续生成」接着跑。`);
      setPaused(true);
      setView("produce");
    } else {
      setView("input");
    }
  };

  const restart = async () => {
    abortRef.current?.abort();
    if (stateRef.current) await deleteRun(stateRef.current.id);
    stateRef.current = null;
    setView("input"); setStages(initialStages()); setLog([]); setProgress(null);
    setArtifact(null); setError(null); setPaused(false);
    void loadLatestRun().then((r) => r && setResumable(r));
  };

  const discardResumable = async () => {
    if (resumable) await deleteRun(resumable.id);
    setResumable(null);
  };

  return (
    <div className="min-h-screen text-white relative overflow-hidden" style={{ background: "radial-gradient(1200px 600px at 50% -10%, #0c2030 0%, #0a0e1a 55%, #05070d 100%)" }}>
      <nav className="relative z-10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => view !== "produce" && void restart()}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center">
            <FileText className="w-5 h-5 text-black" />
          </div>
          <span className="font-bold tracking-tight">标书智能工厂</span>
        </div>
        {!isStandalone && (
          <a href="./index.html" className="flex items-center gap-1.5 text-white/40 hover:text-white/80 text-xs transition">
            <Clapperboard className="w-3.5 h-3.5" /> AI 爆款工厂（视频）
          </a>
        )}
      </nav>

      <main className="relative z-10 py-8 md:py-10 flex flex-col items-center">
        {view === "input" && (
          <>
            {resumable && (
              <div className="w-full max-w-3xl mx-auto px-4 mb-5">
                <div className="flex items-center gap-3 bg-sky-400/10 border border-sky-400/30 rounded-2xl px-4 py-3">
                  <History className="w-5 h-5 text-sky-300 shrink-0" />
                  <div className="flex-1 text-sm text-white/80">
                    检测到未完成的标书任务{resumable.tender?.projectName ? `《${resumable.tender.projectName}》` : ""}（已完成 {doneCount(resumable)} 个小节）
                  </div>
                  <button onClick={() => resume(resumable)} className="bg-sky-400 text-black text-xs font-bold rounded-lg px-3 py-1.5 hover:shadow transition shrink-0">继续</button>
                  <button onClick={() => void discardResumable()} className="text-white/40 hover:text-white/70 shrink-0" title="放弃"><X className="w-4 h-4" /></button>
                </div>
              </div>
            )}
            <BidInputForm onSubmit={(t, c, o) => void handleSubmit(t, c, o)} disabled={busy} />
          </>
        )}

        {view === "prepare" && (
          <GenerationDashboard
            stages={stages.slice(0, 2)} progress={null} log={log} paused={false}
            onPause={() => abortRef.current?.abort()} onResume={() => {}} error={error}
          />
        )}
        {view === "prepare" && error && (
          <button onClick={() => setView("input")} className="mt-4 text-white/50 underline text-sm">返回修改输入</button>
        )}

        {view === "outline" && stateRef.current?.outline && (
          <OutlineReview
            outline={stateRef.current.outline}
            options={stateRef.current.options}
            onConfirm={(o) => void handleOutlineConfirm(o)}
            onBack={() => setView("input")}
          />
        )}

        {view === "produce" && (
          <GenerationDashboard
            stages={stages} progress={progress} log={log} paused={paused}
            onPause={() => abortRef.current?.abort()}
            onResume={() => void startProduce()}
            error={error}
          />
        )}

        {view === "result" && stateRef.current && artifact && (
          <BidResultView state={stateRef.current} artifact={artifact} onRestart={() => void restart()} />
        )}
      </main>

      <footer className="relative z-10 text-center text-white/25 text-xs py-6 px-4">
        全程在你的浏览器本地完成 · 内容由 Claude Fable 5 生成，提交前须人工审校并对真实性负责 · 断点自动保存在本机
      </footer>
    </div>
  );
};

export default BidApp;
