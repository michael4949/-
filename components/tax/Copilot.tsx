import React, { useEffect, useRef, useState } from "react";
import { Sparkles, X, Send, Bot, User, MessageSquare } from "lucide-react";
import {
  filings, risks, savings, invoiceStats, entityById,
  fmtCNY, fmtCNYWan, DUE_DATE, daysUntil, PERIOD, PERIOD_LABEL,
} from "../../data/mockData";
import { ChatMessage } from "../../types";
import { cx } from "./ui";

const SUGGESTIONS = [
  "本期增值税为什么这么多？",
  "还有哪些没申报？",
  "有哪些节税机会？",
  "XXX销售有什么风险？",
];

function respond(qRaw: string): ChatMessage {
  const q = qRaw.trim();
  const cur = filings.filter((f) => f.period === PERIOD);
  const pending = cur.filter((f) => f.status !== "已申报" && f.status !== "已缴款");

  if (/增值税|为什么|销项|进项/.test(q)) {
    return {
      role: "bot",
      text: "集团总部本期「增值税及附加」应纳 ¥5,779,200，由销项与进项轧差形成。已自动按数电发票勾稽，每一行都可在申报工作台溯源：",
      rich: [
        { label: "销项税额（销项 8,421 份）", value: "¥8,640,000" },
        { label: "减：已认证可抵扣进项", value: "−¥3,600,000" },
        { label: "加：异常发票进项转出", value: "+¥120,000" },
        { label: "应纳增值税额", value: "¥5,160,000" },
        { label: "附加税费（城建+教育+地方 12%）", value: "¥619,200" },
        { label: "本期应补税额合计", value: "¥5,779,200" },
      ],
    };
  }
  if (/没报|未申报|还有|待申报|哪些没|剩|待处理/.test(q)) {
    return {
      role: "bot",
      text: `本期（${PERIOD_LABEL}）还有 ${pending.length} 项待处理，距申报截止 ${daysUntil(DUE_DATE)} 天。最需要先看的几项：`,
      rich: pending.slice(0, 4).map((f) => ({ label: `${entityById(f.entityId).shortName} · ${f.taxKind}`, value: f.status })),
    };
  }
  if (/节税|优化|退税|省钱|加计|留抵/.test(q)) {
    const total = savings.reduce((s, v) => s + v.estSaving, 0);
    return {
      role: "bot",
      text: `共扫描到 ${fmtCNYWan(total)} 可优化空间，已按收益排序。可立即申请的前几项：`,
      rich: savings.slice().sort((a, b) => b.estSaving - a.estSaving).slice(0, 3)
        .map((s) => ({ label: `${s.title}（${entityById(s.entityId).shortName}）`, value: fmtCNYWan(s.estSaving) })),
    };
  }
  if (/风险|预警|稽查|金税|销售|税负/.test(q)) {
    const high = risks.filter((r) => r.level === "high");
    return {
      role: "bot",
      text: `当前 ${risks.length} 项风险预警（${high.length} 高 ${risks.length - high.length} 中）。最高优先级：XXX销售增值税税负率 1.3%，低于行业预警线 3.5%；另有 12 份异常进项发票需转出 ¥120,000。建议先处置这两项。`,
      rich: high.map((r) => ({ label: `${entityById(r.entityId).shortName} · ${r.title}`, value: "高风险" })),
    };
  }
  if (/发票|异常|认证|抵扣/.test(q)) {
    return {
      role: "bot",
      text: `本期销项 ${invoiceStats.outputCount.toLocaleString()} 份、进项 ${invoiceStats.inputCount.toLocaleString()} 份，数电占比 ${invoiceStats.digitalRatio}%。其中 ${invoiceStats.inputAbnormal} 份来自异常注销纳税人，智能体已建议进项转出 ${fmtCNY(120000)} 并在申报表预置。`,
    };
  }
  if (/截止|什么时候|时间|征期|多久/.test(q)) {
    return { role: "bot", text: `本期申报截止 ${DUE_DATE}，距今 ${daysUntil(DUE_DATE)} 天。智能体已完成全部归集与制表，你只需审批后一键申报。` };
  }
  if (/流程|怎么|如何|步骤|自动/.test(q)) {
    return { role: "bot", text: "自动申报分 9 步：连接数据源 → 归集数据 → 发票验真匹配 → 分税种测算 → 纳税调整与优惠 → 生成税表 → 风险体检 → 节税扫描 → 生成审批单。前 8 步全自动，最后由你审批确认，全程可溯源、可留痕。点左侧「AI 自动申报」即可启动。" };
  }
  if (/你好|hi|hello|在吗|您好/.test(q)) {
    return { role: "bot", text: "你好，我是税擎智能副驾 👋 我了解 XXX集团本期全部税务数据，可以帮你解读税额、查待办、找节税、评风险。试试点下面的问题。" };
  }
  return {
    role: "bot",
    text: "我可以帮你：① 解读任一税种的测算与构成；② 查看待申报与申报进度；③ 扫描节税/退税机会；④ 评估金税四期风险；⑤ 分析发票进销项。换个说法或点下面的快捷问题试试～",
  };
}

const Copilot: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<ChatMessage[]>([
    { role: "bot", text: "你好，我是税擎智能副驾 👋 我了解 XXX集团本期全部税务数据。问我任何税务问题，或点下面的快捷问题。" },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bodyRef.current?.scrollTo({ top: 1e9, behavior: "smooth" }); }, [msgs, typing, open]);

  const ask = (text: string) => {
    if (!text.trim() || typing) return;
    setMsgs((m) => [...m, { role: "user", text }]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      setMsgs((m) => [...m, respond(text)]);
      setTyping(false);
    }, 700 + Math.random() * 500);
  };

  return (
    <>
      {/* 浮动按钮 */}
      {!open && (
        <button onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 group flex items-center gap-2.5 bg-gradient-to-br from-brand to-violet2 text-white pl-3 pr-4 py-3 rounded-2xl shadow-pop hover:scale-105 transition-transform">
          <div className="relative"><Bot className="w-6 h-6" /><span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-success rounded-full ring-2 ring-white" /></div>
          <span className="font-bold text-sm">智能副驾</span>
        </button>
      )}

      {/* 面板 */}
      {open && (
        <div className="fixed bottom-6 right-6 z-40 w-[min(380px,calc(100vw-3rem))] h-[600px] max-h-[calc(100vh-3rem)] bg-white rounded-2xl shadow-pop border border-line flex flex-col overflow-hidden animate-fadeup">
          {/* 头 */}
          <div className="bg-gradient-to-br from-brand to-violet2 text-white px-4 py-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center"><Sparkles className="w-5 h-5" /></div>
            <div className="flex-1">
              <div className="font-bold text-sm">税擎 · 智能税务副驾</div>
              <div className="text-[11px] text-white/75 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-success rounded-full" /> 已接入本期税务数据</div>
            </div>
            <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-lg hover:bg-white/15 flex items-center justify-center"><X className="w-5 h-5" /></button>
          </div>

          {/* 消息 */}
          <div ref={bodyRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-page">
            {msgs.map((m, i) => (
              <div key={i} className={cx("flex gap-2", m.role === "user" ? "flex-row-reverse" : "")}>
                <div className={cx("w-7 h-7 rounded-lg shrink-0 flex items-center justify-center", m.role === "user" ? "bg-ink text-white" : "bg-gradient-to-br from-brand to-violet2 text-white")}>
                  {m.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div className={cx("max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed", m.role === "user" ? "bg-brand text-white rounded-tr-sm" : "bg-white border border-line text-ink-soft rounded-tl-sm")}>
                  {m.text}
                  {m.rich && (
                    <div className="mt-2 space-y-1 bg-page rounded-xl p-2.5">
                      {m.rich.map((r, j) => (
                        <div key={j} className="flex items-center justify-between gap-3 text-xs">
                          <span className="text-ink-muted">{r.label}</span>
                          <span className="font-bold text-ink tnum whitespace-nowrap">{r.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand to-violet2 text-white flex items-center justify-center"><Bot className="w-4 h-4" /></div>
                <div className="bg-white border border-line rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1">
                  {[0, 1, 2].map((i) => <span key={i} className="w-1.5 h-1.5 bg-ink-faint rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                </div>
              </div>
            )}
          </div>

          {/* 快捷问题 */}
          <div className="px-3 pt-2 flex gap-1.5 flex-wrap border-t border-line bg-white">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => ask(s)} disabled={typing}
                className="text-[11px] text-brand bg-brand-50 hover:bg-brand-100 rounded-full px-2.5 py-1 font-medium transition-colors disabled:opacity-50">{s}</button>
            ))}
          </div>

          {/* 输入 */}
          <form onSubmit={(e) => { e.preventDefault(); ask(input); }} className="p-3 bg-white flex items-center gap-2">
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="问问本期税务情况…"
              className="flex-1 bg-page rounded-xl px-3.5 py-2.5 text-sm outline-none placeholder:text-ink-faint" />
            <button type="submit" disabled={!input.trim() || typing}
              className="w-10 h-10 rounded-xl bg-brand hover:bg-brand-600 text-white flex items-center justify-center disabled:opacity-40 transition-colors">
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default Copilot;
