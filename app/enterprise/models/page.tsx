import { getStore } from "@/lib/data/store";
import { getDemoEnterprise } from "@/lib/data/personas";
import { MODELS, MODEL_USE_CASES } from "@/lib/constants";
import { formatNumber, formatToken, formatPercent } from "@/lib/utils";
import { Tag } from "@/components/ui/Tag";
import { Cpu, Activity, Star, Code, Send, ChevronRight, Search, Filter, Sparkles, Zap } from "lucide-react";

export default function ModelHubPage() {
  const s = getStore();
  const me = getDemoEnterprise();
  const { models } = s;

  const cats = [
    { name: "全部", count: models.length, active: true },
    { name: "通用", count: models.filter((m) => m.type === "通用").length },
    { name: "推理", count: models.filter((m) => m.type === "推理").length },
    { name: "长文本", count: models.filter((m) => m.type === "长文本").length },
    { name: "国产", count: models.filter((m) => m.isDomestic).length },
  ];

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Model Hub · 大模型聚合</h1>
          <p className="text-sm text-slate-500 mt-1">{models.length} 款主流大模型统一接入 · 同一 API · 同一计费 · 同一观测</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary"><Code className="w-4 h-4" />API 文档</button>
          <button className="btn-primary"><Sparkles className="w-4 h-4" />打开 Playground</button>
        </div>
      </div>

      {/* Playground 提示 */}
      <div className="bg-gradient-to-br from-purple-600 via-pink-600 to-rose-600 rounded-xl p-5 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3" />
        <div className="relative flex items-center justify-between">
          <div>
            <div className="text-xs text-white/80 mb-1 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" /> 一站式 Playground
            </div>
            <div className="text-xl font-semibold">同一 SDK 调用全部模型，券自动抵扣</div>
            <div className="text-sm text-white/80 mt-1">已为本企业预置 Token 券额度 {formatToken(50000000)}，可直接发起调用</div>
          </div>
          <div className="space-y-1.5 text-xs font-mono bg-black/30 rounded p-3 backdrop-blur">
            <div className="text-white/60"># 滨海统一调用 SDK</div>
            <div><span className="text-cyan-300">from</span> binhai_ai <span className="text-cyan-300">import</span> client</div>
            <div>resp = client.chat(<span className="text-amber-300">"deepseek-v3"</span>, msgs)</div>
            <div className="text-white/60"># 自动选择最优 + 抵扣 Token 券</div>
          </div>
        </div>
      </div>

      {/* 筛选 */}
      <div className="gov-card">
        <div className="px-5 py-3 flex items-center gap-3 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input type="text" placeholder="搜索模型名称或厂商" className="pl-8 pr-3 py-1.5 text-sm bg-slate-100 border border-transparent rounded w-[260px] focus:outline-none focus:bg-white focus:border-slate-300" />
          </div>
          <div className="flex items-center gap-1 ml-2">
            {cats.map((c) => (
              <button key={c.name} className={`px-3 py-1 rounded text-xs ${c.active ? "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200 font-medium" : "text-slate-500 hover:bg-slate-50"}`}>
                {c.name} <span className="opacity-60">({c.count})</span>
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <div className="text-xs text-slate-500">按调用量排序</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-5">
          {models.map((m) => (
            <div key={m.code} className="border border-slate-200 rounded-lg hover:border-cyan-300 hover:shadow-md transition-all p-4 group">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-11 h-11 rounded bg-gradient-to-br from-cyan-500 to-blue-600 text-white flex items-center justify-center flex-shrink-0">
                  <Cpu className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-800 truncate">{m.name}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{m.vendor}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <Tag color={m.type === "推理" ? "purple" : m.type === "长文本" ? "amber" : "blue"}>{m.type}</Tag>
                    {m.isDomestic && <Tag color="red">国产</Tag>}
                    <Tag color={m.status === "LIVE" ? "green" : "amber"} dot>{m.status === "LIVE" ? "在线" : "测试"}</Tag>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-0.5 justify-end">
                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    <span className="digital text-xs font-medium">{m.rating}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">P99 {m.latency}ms</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div className="bg-slate-50 rounded p-2">
                  <div className="text-[10px] text-slate-500">价格 · 元/M Token</div>
                  <div className="digital text-slate-800 font-medium">入 {m.priceIn} · 出 {m.priceOut}</div>
                </div>
                <div className="bg-slate-50 rounded p-2">
                  <div className="text-[10px] text-slate-500">上下文窗口</div>
                  <div className="digital text-slate-800 font-medium">{(m.ctx / 1000).toFixed(0)} K</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 mb-3">
                {MODEL_USE_CASES.slice(0, 5).map((uc) => (
                  <span key={uc} className="text-[10px] text-slate-500 bg-slate-100 px-1.5 rounded">{uc}</span>
                ))}
              </div>

              <div className="flex items-center gap-1.5 pt-3 border-t border-slate-100">
                <button className="flex-1 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white text-xs rounded font-medium flex items-center justify-center gap-1">
                  <Send className="w-3 h-3" />
                  试用
                </button>
                <button className="flex-1 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs rounded font-medium flex items-center justify-center gap-1">
                  <Code className="w-3 h-3" />
                  API
                </button>
                <button className="py-1.5 px-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 text-xs rounded">
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
