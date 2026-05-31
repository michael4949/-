import React, { useState } from "react";
import { Link2, Sparkles, Loader2, Settings2, Wand2, KeyRound, Check } from "lucide-react";
import { VideoOptions, ThemeId, AspectRatio } from "../../types";
import { VOICES } from "../../services/ttsService";
import { getStoredKey, setStoredKey, envKey } from "../../services/genai";

interface Props {
  onSubmit: (input: string, options: VideoOptions) => void;
  isLoading: boolean;
}

const THEMES: { id: ThemeId; label: string; from: string; to: string }[] = [
  { id: "midnight", label: "午夜蓝", from: "#0b1026", to: "#1d2b64" },
  { id: "sunset", label: "落日橙", from: "#2b1055", to: "#ff7e5f" },
  { id: "ocean", label: "深海青", from: "#0f2027", to: "#2c5364" },
  { id: "candy", label: "糖果紫", from: "#3a0ca3", to: "#f72585" },
  { id: "mono", label: "高级黑", from: "#111111", to: "#2b2b2b" },
];

const STYLES = ["兴奋有感染力，像跟朋友安利", "悬念解说，娓娓道来", "犀利毒舌，直击痛点", "知识科普，沉稳专业"];

const InputForm: React.FC<Props> = ({ onSubmit, isLoading }) => {
  const [input, setInput] = useState("");
  const [showAdv, setShowAdv] = useState(false);
  const [apiKey, setApiKey] = useState(getStoredKey());
  const needKey = !envKey(); // 构建期没有密钥（公开托管）时，让用户自填
  const onKey = (v: string) => { setApiKey(v); setStoredKey(v); };
  const [opt, setOpt] = useState<VideoOptions>({
    durationTarget: 35,
    voiceName: "Charon",
    voiceStyleHint: STYLES[0],
    useAiImages: false,
    bgm: false,
    aspect: "9:16",
    theme: "midnight",
    brand: "",
    template: "tech",
  });

  const set = <K extends keyof VideoOptions>(k: K, v: VideoOptions[K]) => setOpt((o) => ({ ...o, [k]: v }));

  const ready = !!input.trim() && (!needKey || !!apiKey.trim());
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (ready && !isLoading) onSubmit(input.trim(), opt);
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white/80 text-xs mb-4 border border-white/10">
          <Wand2 className="w-3.5 h-3.5" /> 网页内容 → 抖音爆款视频
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-white mb-3 tracking-tight">
          一条链接，<span className="text-amber-400">自动成片</span>
        </h1>
        <p className="text-white/60 text-base">
          粘贴网页链接，AI 自动<span className="text-amber-300">截取网页真实画面</span>＋读全文写爆款脚本、中文配音＋字幕，导出可直接发抖音的竖屏视频。
        </p>
      </div>

      {needKey && (
        <div className="mb-4 bg-white/5 border border-white/15 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <KeyRound className="w-4 h-4 text-amber-400" />
            <span className="text-white/80 text-sm font-medium">先填入你的 Gemini API Key</span>
            {apiKey && <span className="ml-auto flex items-center gap-1 text-emerald-400 text-xs"><Check className="w-3.5 h-3.5" /> 已保存到本机</span>}
          </div>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => onKey(e.target.value)}
            placeholder="粘贴你的 Gemini API Key（仅保存在你浏览器本地，不会上传）"
            className="w-full bg-black/30 border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/35 focus:outline-none focus:border-amber-400/60 font-mono"
          />
          <div className="text-white/40 text-xs mt-2">
            免费获取：<a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="text-amber-300 underline">aistudio.google.com/apikey</a>
            ，密钥只存在你本地浏览器，刷新仍在。
          </div>
        </div>
      )}

      <form onSubmit={submit} className="space-y-4">
        <div className="relative">
          <div className="absolute top-3.5 left-4 text-white/40">
            <Link2 className="w-5 h-5" />
          </div>
          <textarea
            className="w-full bg-white/5 border border-white/15 rounded-2xl pl-12 pr-4 py-3.5 text-white placeholder-white/35 focus:outline-none focus:border-amber-400/60 focus:bg-white/10 transition resize-none min-h-[120px]"
            placeholder="粘贴网页链接（可多个，AI 会读全文 + 页内链接）&#10;或直接粘贴一段文字内容…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
          />
        </div>

        {/* 时长 + 音色 快捷区 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/5 border border-white/15 rounded-xl px-4 py-3">
            <label className="text-white/50 text-xs">时长 · {opt.durationTarget}s</label>
            <input
              type="range" min={20} max={90} step={5} value={opt.durationTarget}
              onChange={(e) => set("durationTarget", Number(e.target.value))}
              disabled={isLoading}
              className="w-full mt-2 accent-amber-400"
            />
          </div>
          <div className="bg-white/5 border border-white/15 rounded-xl px-4 py-2.5">
            <label className="text-white/50 text-xs">配音音色</label>
            <select
              value={opt.voiceName}
              onChange={(e) => set("voiceName", e.target.value)}
              disabled={isLoading}
              className="w-full mt-1.5 bg-transparent text-white text-sm focus:outline-none [&>option]:text-black"
            >
              {VOICES.map((v) => <option key={v.name} value={v.name}>{v.label}</option>)}
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowAdv((s) => !s)}
          className="flex items-center gap-1.5 text-white/50 hover:text-white/80 text-sm transition"
        >
          <Settings2 className="w-4 h-4" /> {showAdv ? "收起" : "更多设置"}（风格 / 主题 / 画幅 / AI 配图）
        </button>

        {showAdv && (
          <div className="space-y-4 bg-white/5 border border-white/10 rounded-2xl p-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div>
              <label className="text-white/50 text-xs block mb-2">解说风格</label>
              <div className="flex flex-wrap gap-2">
                {STYLES.map((s) => (
                  <button key={s} type="button" onClick={() => set("voiceStyleHint", s)}
                    className={`px-3 py-1.5 rounded-full text-xs border transition ${opt.voiceStyleHint === s ? "bg-amber-400 text-black border-amber-400" : "bg-white/5 text-white/70 border-white/15 hover:border-white/40"}`}>
                    {s.split("，")[0]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-white/50 text-xs block mb-2">视觉主题</label>
              <div className="flex flex-wrap gap-2">
                {THEMES.map((t) => (
                  <button key={t.id} type="button" onClick={() => set("theme", t.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border transition ${opt.theme === t.id ? "border-amber-400 text-white" : "border-white/15 text-white/60 hover:border-white/40"}`}>
                    <span className="w-4 h-4 rounded-full" style={{ background: `linear-gradient(135deg, ${t.from}, ${t.to})` }} />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-white/50 text-xs block mb-2">画幅</label>
                <div className="flex gap-2">
                  {(["9:16", "1:1", "16:9"] as AspectRatio[]).map((a) => (
                    <button key={a} type="button" onClick={() => set("aspect", a)}
                      className={`px-3 py-1.5 rounded-lg text-xs border transition ${opt.aspect === a ? "bg-white/15 border-amber-400 text-white" : "border-white/15 text-white/60"}`}>
                      {a}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-white/50 text-xs block mb-2">账号水印（选填）</label>
                <input type="text" value={opt.brand} placeholder="你的抖音号"
                  onChange={(e) => set("brand", e.target.value)}
                  className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-1.5 text-white text-sm placeholder-white/30 focus:outline-none focus:border-amber-400/60" />
              </div>
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-white/70 text-sm cursor-pointer">
                <input type="checkbox" checked={opt.useAiImages} onChange={(e) => set("useAiImages", e.target.checked)} className="accent-amber-400 w-4 h-4" />
                AI 配图兜底（网页没图时才用，更慢）
              </label>
              <label className="flex items-center gap-2 text-white/70 text-sm cursor-pointer">
                <input type="checkbox" checked={opt.bgm} onChange={(e) => set("bgm", e.target.checked)} className="accent-amber-400 w-4 h-4" />
                背景音乐床
              </label>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !ready}
          className={`w-full rounded-2xl py-4 font-bold text-base flex items-center justify-center gap-2 transition ${isLoading || !ready ? "bg-white/10 text-white/40 cursor-not-allowed" : "bg-gradient-to-r from-amber-400 to-orange-500 text-black hover:shadow-xl hover:shadow-amber-500/20 hover:-translate-y-0.5"}`}
        >
          {isLoading ? <><Loader2 className="w-5 h-5 animate-spin" /> 生成中…</> : <><Sparkles className="w-5 h-5" /> 一键生成视频</>}
        </button>
      </form>

      <div className="mt-5 text-center text-white/35 text-xs">
        试试：
        <button type="button" onClick={() => setInput("https://github.com/trending")} className="underline decoration-dotted hover:text-white/60 mx-1">GitHub Trending</button>
        ·
        <button type="button" onClick={() => setInput("https://en.wikipedia.org/wiki/Large_language_model")} className="underline decoration-dotted hover:text-white/60 mx-1">维基百科·大模型</button>
      </div>
    </div>
  );
};

export default InputForm;
