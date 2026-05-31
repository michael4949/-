import React from "react";
import { Film, ArrowLeft, Clapperboard } from "lucide-react";
import { VideoPlan, Scene } from "../../types";

interface Props {
  plan: VideoPlan;
  onChange: (plan: VideoPlan) => void;
  onConfirm: () => void;
  onBack: () => void;
}

const roleLabel: Record<Scene["role"], string> = { hook: "钩子", body: "正文", cta: "结尾CTA" };
const visualLabel: Record<string, string> = { stat: "📊 数据卡", quote: "💬 金句卡", flow: "🔀 流程卡", shot: "真实截图" };
const roleColor: Record<Scene["role"], string> = {
  hook: "bg-rose-500/20 text-rose-300 border-rose-500/30",
  body: "bg-sky-500/20 text-sky-300 border-sky-500/30",
  cta: "bg-amber-500/20 text-amber-300 border-amber-500/30",
};

const ScriptReview: React.FC<Props> = ({ plan, onChange, onConfirm, onBack }) => {
  const estChars = plan.scenes.reduce((a, s) => a + s.narration.replace(/\s/g, "").length, 0);
  const estSec = Math.round(estChars / 4.5);

  const setScene = (id: number, patch: Partial<Scene>) =>
    onChange({ ...plan, scenes: plan.scenes.map((s) => (s.id === id ? { ...s, ...patch } : s)) });

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      <div className="flex items-center justify-between mb-5">
        <button onClick={onBack} className="flex items-center gap-1.5 text-white/50 hover:text-white text-sm">
          <ArrowLeft className="w-4 h-4" /> 重来
        </button>
        <div className="text-white/40 text-xs">预计 ≈ {estSec}s · {plan.scenes.length} 镜 · {estChars} 字</div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
        <label className="text-white/40 text-xs">视频标题</label>
        <input value={plan.title} onChange={(e) => onChange({ ...plan, title: e.target.value })}
          className="w-full bg-transparent text-white text-xl font-bold focus:outline-none mt-1" />
        <label className="text-white/40 text-xs mt-3 block">顶部横幅大标题（全程固定在画面顶部，可手改 · 用回车换行）</label>
        <textarea value={plan.bannerTitle} onChange={(e) => onChange({ ...plan, bannerTitle: e.target.value })}
          placeholder="顶部固定钩子标题"
          className="w-full bg-transparent text-[#e07a5f] text-lg font-bold focus:outline-none mt-1 resize-none border-b border-white/10 pb-1" rows={2} />
        <div className="flex flex-wrap gap-1.5 mt-2">
          {plan.hashtags.map((h, i) => <span key={i} className="text-amber-300 text-xs">#{h}</span>)}
        </div>
      </div>

      {(plan.angle || (plan.nuggets && plan.nuggets.length > 0)) && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 mb-4">
          <div className="text-emerald-300/80 text-xs font-semibold mb-1.5">📌 选题与含金量（先想透内容，再做视频）</div>
          {plan.angle && <p className="text-white/70 text-sm mb-1"><span className="text-white/40">角度：</span>{plan.angle}</p>}
          {plan.audience && <p className="text-white/70 text-sm mb-2"><span className="text-white/40">观众：</span>{plan.audience}</p>}
          {plan.nuggets && plan.nuggets.length > 0 && (
            <ul className="space-y-1">
              {plan.nuggets.map((n, i) => (
                <li key={i} className="text-white/80 text-sm flex gap-1.5">
                  <span className="text-emerald-400">▸</span>
                  <span><b>{n.point}</b>{n.evidence && <span className="text-white/35"> · 依据：{n.evidence}</span>}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="space-y-3 max-h-[46vh] overflow-y-auto pr-1">
        {plan.scenes.map((s, i) => (
          <div key={s.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-white/30 text-xs font-mono">#{i + 1}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] border ${roleColor[s.role]}`}>{roleLabel[s.role]}</span>
              {s.visualKind && s.visualKind !== "shot" && (
                <span className="px-2 py-0.5 rounded-full text-[10px] border bg-violet-500/15 text-violet-300 border-violet-500/30">
                  {visualLabel[s.visualKind]}
                </span>
              )}
              {s.visualKind === "shot" && (
                <span className="px-2 py-0.5 rounded-full text-[10px] border bg-white/5 text-white/45 border-white/15">真实截图</span>
              )}
            </div>
            <input value={s.caption} onChange={(e) => setScene(s.id, { caption: e.target.value })}
              placeholder="屏幕大字"
              className="w-full bg-transparent text-white font-bold text-lg focus:outline-none mb-1.5 border-b border-white/10 pb-1" />
            <textarea value={s.narration} onChange={(e) => setScene(s.id, { narration: e.target.value })}
              placeholder="口播文案（也是字幕）"
              className="w-full bg-transparent text-white/70 text-sm focus:outline-none resize-none" rows={Math.max(2, Math.ceil(s.narration.length / 28))} />
            {(s.cardValue || s.cardText || (s.cardSteps && s.cardSteps.length > 0)) && (
              <div className="text-white/45 text-xs mt-1.5">
                🎴 画面卡：<span className="text-violet-200/80">{s.cardValue || s.cardText || (s.cardSteps || []).join(" → ")}</span>
                {s.cardLabel && <span className="text-white/30"> · {s.cardLabel}</span>}
              </div>
            )}
            {s.visualKind === "shot" && s.cursorHint && (
              <div className="text-white/35 text-xs mt-1.5 flex items-center gap-1">
                🖱 鼠标指向：<span className="text-sky-300/70">{s.cursorHint}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 mt-5 text-white/40 text-xs">
        <Film className="w-3.5 h-3.5" /> 可直接修改任意文案，满意后再生成。配音与渲染都在你本地浏览器完成。
      </div>

      <button onClick={onConfirm}
        className="w-full mt-3 rounded-2xl py-4 font-bold flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 to-orange-500 text-black hover:shadow-xl hover:shadow-amber-500/20 hover:-translate-y-0.5 transition">
        <Clapperboard className="w-5 h-5" /> 配音并渲染成视频
      </button>
    </div>
  );
};

export default ScriptReview;
