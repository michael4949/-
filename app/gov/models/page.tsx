import { getStore } from "@/lib/data/store";
import { formatNumber, formatToken, formatCurrency, formatPercent } from "@/lib/utils";
import { Tag } from "@/components/ui/Tag";
import { KpiCard } from "@/components/ui/KpiCard";
import { GovDonut } from "@/components/charts/GovDonut";
import { Cpu, Activity, Gauge, ShieldCheck, Plus, Filter, Search, Star } from "lucide-react";

export default function GovModelsPage() {
  const s = getStore();
  const { models, modelUsage } = s;

  const live = models.filter((m) => m.status === "LIVE").length;
  const domestic = models.filter((m) => m.isDomestic).length;
  const totalCalls = models.reduce((s, m) => s + m.totalCalls, 0);
  const totalTokens = models.reduce((s, m) => s + m.totalTokens, 0);
  const totalRevenue = models.reduce((s, m) => s + m.totalRevenue, 0);

  const vendorDist = Object.entries(
    models.reduce<Record<string, number>>((acc, m) => {
      acc[m.vendor] = (acc[m.vendor] || 0) + m.totalTokens;
      return acc;
    }, {}),
  )
    .map(([name, value], i) => ({ name, value, color: ["#3b82f6", "#22d3ee", "#a855f7", "#10b981", "#f59e0b", "#ec4899", "#facc15", "#06b6d4", "#8b5cf6", "#f43f5e", "#84cc16", "#ef4444"][i % 12] }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">模型注册表</h1>
          <p className="text-sm text-slate-500 mt-1">Model Hub 多模型聚合 · 统一接入 · 统一计费 · 统一观测</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary"><Filter className="w-4 h-4" />筛选</button>
          <button className="btn-primary"><Plus className="w-4 h-4" />接入新模型</button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="入驻模型" value={String(models.length)} unit="款" icon={<Cpu className="w-4 h-4" />} accent="#2563eb" />
        <KpiCard label="在线" value={`${live}/${models.length}`} accent="#047857" />
        <KpiCard label="国产模型" value={`${domestic}/${models.length}`} icon={<ShieldCheck className="w-4 h-4" />} accent="#dc2626" />
        <KpiCard label="累计调用" value={formatNumber(totalCalls)} icon={<Activity className="w-4 h-4" />} accent="#7e22ce" />
        <KpiCard label="累计 Token" value={formatToken(totalTokens)} accent="#0891b2" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 gov-card">
          <div className="gov-card-header flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">模型注册列表</h2>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input type="text" placeholder="模型名称 / 厂商" className="pl-8 pr-3 py-1.5 text-sm bg-slate-100 border border-transparent rounded w-[200px] focus:outline-none focus:bg-white focus:border-slate-300" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="gov-table">
              <thead>
                <tr>
                  <th>模型</th>
                  <th>厂商</th>
                  <th>类型</th>
                  <th>价格 (元/M Token)</th>
                  <th>上下文</th>
                  <th>RPS</th>
                  <th>P99 延迟</th>
                  <th>可用性</th>
                  <th>评分</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                {models.map((m) => (
                  <tr key={m.code}>
                    <td>
                      <div className="font-medium text-slate-800">{m.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{m.code}</div>
                    </td>
                    <td className="text-sm text-slate-600">{m.vendor}</td>
                    <td>
                      <Tag color="blue">{m.type}</Tag>
                      {m.isDomestic && <Tag color="amber" className="ml-1">国产</Tag>}
                    </td>
                    <td className="digital text-sm text-slate-700">
                      入 <span className="font-medium">{m.priceIn}</span> · 出 <span className="font-medium">{m.priceOut}</span>
                    </td>
                    <td className="digital text-sm text-slate-700">{(m.ctx / 1000).toFixed(0)} K</td>
                    <td className="digital text-sm text-slate-700">{m.rps}</td>
                    <td className={`digital text-sm font-medium ${m.latency < 800 ? "text-emerald-600" : m.latency < 1200 ? "text-amber-600" : "text-rose-600"}`}>{m.latency} ms</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-12 progress-bar"><div className="progress-bar-fill" style={{ width: `${m.availability * 100}%`, background: m.availability > 0.99 ? "#10b981" : m.availability > 0.97 ? "#f59e0b" : "#ef4444" }} /></div>
                        <span className="digital text-xs text-slate-700">{formatPercent(m.availability, 2)}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1 text-xs">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                        <span className="digital font-medium">{m.rating}</span>
                      </div>
                    </td>
                    <td>
                      <Tag color={m.status === "LIVE" ? "green" : m.status === "BETA" ? "amber" : "slate"} dot>
                        {m.status === "LIVE" ? "在线" : m.status === "BETA" ? "测试" : "下线"}
                      </Tag>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="gov-card">
          <div className="gov-card-header"><h2 className="font-semibold text-slate-900">厂商市场份额</h2></div>
          <div className="gov-card-body"><GovDonut data={vendorDist} height={400} formatType="token" /></div>
        </div>
      </div>

      {/* 调用 TOP */}
      <div className="gov-card">
        <div className="gov-card-header"><h2 className="font-semibold text-slate-900">模型调用排行</h2></div>
        <div className="gov-card-body grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
          {modelUsage.slice(0, 10).map((m, i) => (
            <div key={m.modelCode} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
              <div className={`w-7 h-7 rounded text-white text-xs flex items-center justify-center font-semibold flex-shrink-0 ${i < 3 ? "bg-gradient-to-br from-amber-400 to-orange-500" : "bg-slate-400"}`}>
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-800">{m.modelName}</div>
                <div className="text-[10px] text-slate-400">{m.vendor}</div>
              </div>
              <div className="text-right">
                <div className="text-sm digital text-slate-800 font-medium">{formatToken(m.tokens)}</div>
                <div className="text-[10px] text-slate-400">{formatNumber(m.calls)} 次 · {formatPercent(m.share)}</div>
              </div>
              <div className="w-20 hidden md:block">
                <div className="progress-bar"><div className="progress-bar-fill" style={{ width: `${m.share * 100 / modelUsage[0].share}%`, background: ["#3b82f6", "#22d3ee", "#a855f7"][i % 3] }} /></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
