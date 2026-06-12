import React, { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, FileDown, FileWarning, Loader2, RefreshCw, RotateCcw } from "lucide-react";
import { BidRunState, OutlineNode } from "../../bidTypes";
import { headingNo, LAYOUTS } from "../../services/bid/budget";
import { renderToBlob } from "../../services/bid/docxRender";

interface Props {
  state: BidRunState;
  artifact: { blob: Blob; fileName: string };
  onRestart: () => void;
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

function toMarkdown(state: BidRunState): string {
  const lines: string[] = [`# ${state.tender?.projectName || ""} 投标文件\n`];
  const walk = (nodes: OutlineNode[], depth: number) => {
    nodes.forEach((n, i) => {
      lines.push(`${"#".repeat(Math.min(6, depth + 2))} ${headingNo(n.level, i + 1)}${n.title}\n`);
      if (!n.children.length) {
        const c = state.sections[n.id]?.content;
        if (c) lines.push(c + "\n");
      } else walk(n.children, depth + 1);
    });
  };
  walk(state.outline || [], 0);
  return lines.join("\n");
}

const ISSUE_STYLE: Record<string, { icon: React.ReactNode; cls: string }> = {
  placeholder: { icon: <FileWarning className="w-4 h-4" />, cls: "text-red-300 border-red-400/30 bg-red-500/10" },
  uncovered: { icon: <AlertTriangle className="w-4 h-4" />, cls: "text-red-300 border-red-400/30 bg-red-500/10" },
  short: { icon: <AlertTriangle className="w-4 h-4" />, cls: "text-amber-300 border-amber-400/30 bg-amber-500/10" },
  manual: { icon: <CheckCircle2 className="w-4 h-4" />, cls: "text-sky-300 border-sky-400/30 bg-sky-500/10" },
};

const BidResultView: React.FC<Props> = ({ state, artifact, onRestart }) => {
  const [current, setCurrent] = useState(artifact);
  const [reRendering, setReRendering] = useState(false);
  const stats = state.stats;
  const issues = useMemo(() => (state.issues || []).filter((i) => !i.fixed), [state.issues]);
  const otherLayout = state.options.layout === "gbGov" ? "general" : "gbGov";

  const reRender = async () => {
    setReRendering(true);
    try {
      state.options.layout = otherLayout;
      setCurrent(await renderToBlob(state));
    } finally {
      setReRendering(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      <div className="text-center mb-6">
        <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
        <h2 className="text-2xl font-black text-white">投标文件已生成</h2>
        <p className="text-white/50 text-sm mt-1">《{state.tender?.projectName}》</p>
      </div>

      {stats && (
        <div className="grid grid-cols-4 text-center bg-white/5 border border-white/15 rounded-2xl px-4 py-4 mb-4">
          <div><div className="text-sky-300 font-black text-2xl">≈{stats.estPages}</div><div className="text-white/40 text-xs">页（按板式估算）</div></div>
          <div><div className="text-white font-black text-2xl">{(stats.chars / 10000).toFixed(1)}万</div><div className="text-white/40 text-xs">总字数</div></div>
          <div><div className="text-white font-black text-2xl">{stats.calls}</div><div className="text-white/40 text-xs">模型调用</div></div>
          <div><div className="text-white font-black text-2xl">{Math.round(stats.ms / 60000)}</div><div className="text-white/40 text-xs">分钟</div></div>
        </div>
      )}

      <button onClick={() => downloadBlob(current.blob, current.fileName)}
        className="w-full rounded-2xl py-4 font-bold text-base flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-400 to-teal-500 text-black hover:shadow-xl hover:shadow-emerald-500/20 transition mb-3">
        <Download className="w-5 h-5" /> 下载 Word 投标文件（{current.fileName}）
      </button>
      <div className="text-white/40 text-xs text-center mb-4">
        当前板式：{LAYOUTS[state.options.layout].label} · 在 Word/WPS 中打开时按提示<b>「更新域」</b>即可生成带页码的目录
      </div>

      <div className="flex gap-2 mb-5">
        <button onClick={() => downloadBlob(new Blob([toMarkdown(state)], { type: "text/markdown" }), "投标文件全文备份.md")}
          className="flex-1 flex items-center justify-center gap-1.5 border border-white/15 text-white/70 text-sm rounded-xl px-3 py-2.5 hover:bg-white/5 transition">
          <FileDown className="w-4 h-4" /> 全文 Markdown 备份
        </button>
        <button onClick={() => downloadBlob(new Blob([JSON.stringify({ tender: state.tender, outline: state.outline }, null, 2)], { type: "application/json" }), "解析与大纲.json")}
          className="flex-1 flex items-center justify-center gap-1.5 border border-white/15 text-white/70 text-sm rounded-xl px-3 py-2.5 hover:bg-white/5 transition">
          <FileDown className="w-4 h-4" /> 解析结果 + 大纲
        </button>
        <button onClick={() => void reRender()} disabled={reRendering}
          className="flex-1 flex items-center justify-center gap-1.5 border border-white/15 text-white/70 text-sm rounded-xl px-3 py-2.5 hover:bg-white/5 transition">
          {reRendering ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} 换{LAYOUTS[otherLayout].label.slice(0, 5)}重排
        </button>
      </div>

      {issues.length > 0 && (
        <div className="mb-5">
          <div className="text-white/70 text-sm font-medium mb-2">提交前请人工核实（{issues.length} 项）：</div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {issues.map((i, idx) => {
              const s = ISSUE_STYLE[i.type] || ISSUE_STYLE.manual;
              return (
                <div key={idx} className={`flex items-start gap-2 border rounded-xl px-3 py-2 text-xs ${s.cls}`}>
                  <span className="mt-0.5 shrink-0">{s.icon}</span>
                  <span>{i.detail}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-amber-500/10 border border-amber-400/30 text-amber-200/90 rounded-xl px-4 py-3 text-xs leading-relaxed mb-5">
        <b>合规提醒：</b>本文件由 AI 按招标文件要求生成，仅为编制底稿。提交前必须：①逐章人工审校，重点核对报价、工期、资质响应；
        ②替换/附上真实的证照、业绩合同、人员证书扫描件；③按招标文件要求签字盖章、装订；④自行对投标内容的真实性与合法性负责。
      </div>

      <button onClick={onRestart} className="w-full flex items-center justify-center gap-1.5 text-white/50 hover:text-white/80 text-sm py-2 transition">
        <RotateCcw className="w-4 h-4" /> 开始新的标书
      </button>
    </div>
  );
};

export default BidResultView;
