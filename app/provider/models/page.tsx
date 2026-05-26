import { getStore } from "@/lib/data/store";
import { getDemoProvider } from "@/lib/data/personas";
import { formatNumber, formatToken, formatCurrency, formatPercent, formatDate } from "@/lib/utils";
import { Tag } from "@/components/ui/Tag";
import { KpiCard } from "@/components/ui/KpiCard";
import { Plus, Edit3, BarChart3, Star, Cpu, Activity, Settings, FileText } from "lucide-react";

export default function MyModelsPage() {
  const s = getStore();
  const provider = getDemoProvider();
  const myModels = s.models.filter((m) => m.vendor === provider.vendor);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">我的模型</h1>
          <p className="text-sm text-slate-500 mt-1">{provider.vendor} · 已接入 {myModels.length} 款模型</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary"><FileText className="w-4 h-4" />合规报告</button>
          <button className="btn-primary"><Plus className="w-4 h-4" />接入新模型</button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="已上架" value={`${myModels.filter((m) => m.status === "LIVE").length}/${myModels.length}`} icon={<Cpu className="w-4 h-4" />} accent="#7e22ce" />
        <KpiCard label="累计调用" value={formatNumber(myModels.reduce((s, m) => s + m.totalCalls, 0))} icon={<Activity className="w-4 h-4" />} accent="#0891b2" />
        <KpiCard label="累计 Token" value={formatToken(myModels.reduce((s, m) => s + m.totalTokens, 0))} accent="#2563eb" />
        <KpiCard label="累计营收" value={formatCurrency(myModels.reduce((s, m) => s + m.totalRevenue, 0))} accent="#dc2626" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {myModels.map((m) => (
          <div key={m.code} className="gov-card">
            <div className="p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded bg-gradient-to-br from-purple-500 to-pink-600 text-white flex items-center justify-center font-bold">
                  {m.name.split('-')[0].slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900">{m.name}</div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">{m.code}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <Tag color={m.status === "LIVE" ? "green" : "amber"} dot>{m.status === "LIVE" ? "上架" : "测试"}</Tag>
                    <Tag color="purple">{m.type}</Tag>
                  </div>
                </div>
                <button className="text-slate-400 hover:text-slate-700"><Settings className="w-4 h-4" /></button>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <Stat label="本月调用" value={formatNumber(m.monthCalls)} />
                <Stat label="本月 Token" value={formatToken(m.monthTokens)} />
                <Stat label="平均 P99" value={`${m.latency} ms`} color={m.latency < 800 ? "emerald" : "amber"} />
                <Stat label="可用性" value={formatPercent(m.availability, 2)} />
              </div>

              <div className="bg-purple-50/40 rounded p-2.5 mb-3">
                <div className="text-[10px] text-slate-500 mb-1">定价</div>
                <div className="text-xs digital">
                  输入 <span className="font-medium text-slate-800">¥{m.priceIn}/M</span> ·
                  输出 <span className="font-medium text-slate-800">¥{m.priceOut}/M</span> ·
                  ctx <span className="font-medium text-slate-800">{(m.ctx / 1000).toFixed(0)}K</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span className="font-medium digital">{m.rating}</span>
                  <span className="text-slate-400">· {formatNumber(m.totalCalls / 1000).slice(0, -1)}K+ 客户</span>
                </div>
                <button className="text-purple-600 hover:underline flex items-center gap-1 font-medium">
                  <BarChart3 className="w-3 h-3" />详细
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* 接入新模型卡 */}
        <div className="bg-slate-50/50 border-2 border-dashed border-slate-300 rounded-lg p-5 flex flex-col items-center justify-center text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50/30 hover:text-purple-600 text-slate-500">
          <Plus className="w-8 h-8 mb-2" />
          <div className="text-sm font-medium">接入新模型</div>
          <div className="text-xs mt-1">填写元数据 → 提交合规审核 → 自动上架</div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color = "slate" }: { label: string; value: string; color?: "emerald" | "amber" | "slate" }) {
  const colorMap = { emerald: "text-emerald-600", amber: "text-amber-600", slate: "text-slate-800" };
  return (
    <div className="bg-slate-50 rounded p-2">
      <div className="text-[10px] text-slate-500">{label}</div>
      <div className={`text-sm font-medium digital mt-0.5 ${colorMap[color]}`}>{value}</div>
    </div>
  );
}
