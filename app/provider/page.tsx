import { getStore } from "@/lib/data/store";
import { getDemoProvider } from "@/lib/data/personas";
import { formatNumber, formatToken, formatCurrency, formatPercent, relativeTime } from "@/lib/utils";
import { Tag } from "@/components/ui/Tag";
import { KpiCard } from "@/components/ui/KpiCard";
import { GovLine } from "@/components/charts/GovLine";
import { GovDonut } from "@/components/charts/GovDonut";
import { Cpu, Activity, Coins, TrendingUp, Star, Users, Sparkles, ChevronRight, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function ProviderHomePage() {
  const s = getStore();
  const provider = getDemoProvider();
  const myModels = s.models.filter((m) => m.vendor === provider.vendor);
  const totalCalls = myModels.reduce((s, m) => s + m.totalCalls, 0);
  const totalTokens = myModels.reduce((s, m) => s + m.totalTokens, 0);
  const totalRevenue = myModels.reduce((s, m) => s + m.totalRevenue, 0);
  const monthRevenue = myModels.reduce((s, m) => s + Math.floor(m.totalRevenue / 12), 0);
  const avgRating = myModels.reduce((sum, m) => sum + m.rating, 0) / Math.max(1, myModels.length);

  const daily = s.cityDaily.slice(-30).map((p) => ({
    date: p.date.slice(5),
    calls: Math.floor(p.calls * 0.18),
    revenue: Math.floor(p.cost * 0.15),
  }));

  const modelDist = myModels.map((m, i) => ({
    name: m.name,
    value: m.totalTokens,
    color: ["#3b82f6", "#22d3ee", "#a855f7"][i % 3],
  }));

  return (
    <div className="p-6 space-y-5">
      {/* Welcome */}
      <div className="bg-gradient-to-br from-purple-700 via-pink-700 to-rose-700 rounded-xl p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="relative">
          <div className="flex items-center gap-3 text-sm text-pink-100/80 mb-2">
            <Sparkles className="w-4 h-4" />
            <span>欢迎，{provider.contact}</span>
          </div>
          <h1 className="text-2xl font-semibold">{provider.vendor} · AI 服务商工作台</h1>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <Tag color="purple"><Cpu className="w-3 h-3 mr-0.5" />入驻模型 {myModels.length} 款</Tag>
            <Tag color="purple"><Star className="w-3 h-3 mr-0.5" />平均评分 {avgRating.toFixed(2)}</Tag>
            <Tag color="purple">已服务城市 23 个</Tag>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="累计调用" value={formatNumber(totalCalls)} trend={0.142} trendLabel="月增" icon={<Activity className="w-4 h-4" />} accent="#7e22ce" />
        <KpiCard label="累计 Token" value={formatToken(totalTokens)} accent="#0891b2" />
        <KpiCard label="累计营收" value={formatCurrency(totalRevenue)} trend={0.183} trendLabel="同比" icon={<Coins className="w-4 h-4" />} accent="#dc2626" />
        <KpiCard label="本月预计营收" value={formatCurrency(monthRevenue)} icon={<TrendingUp className="w-4 h-4" />} accent="#047857" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 gov-card">
          <div className="gov-card-header"><h2 className="font-semibold text-slate-900">近 30 日调用与营收</h2></div>
          <div className="gov-card-body">
            <GovLine
              data={daily}
              xKey="date"
              series={[
                { key: "calls", name: "调用次数", color: "#a855f7", type: "area" },
                { key: "revenue", name: "营收 (元)", color: "#ec4899" },
              ]}
              formatType="number"
              height={280}
            />
          </div>
        </div>
        <div className="gov-card">
          <div className="gov-card-header"><h2 className="font-semibold text-slate-900">模型营收占比</h2></div>
          <div className="gov-card-body"><GovDonut data={modelDist} height={280} formatType="token" /></div>
        </div>
      </div>

      {/* 我的模型 */}
      <div className="gov-card">
        <div className="gov-card-header flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">我的模型</h2>
          <Link href="/provider/models" className="text-xs text-blue-600 hover:underline flex items-center">管理 <ChevronRight className="w-3 h-3" /></Link>
        </div>
        <div className="overflow-x-auto">
          <table className="gov-table">
            <thead>
              <tr>
                <th>模型</th>
                <th>类型</th>
                <th>价格</th>
                <th>本月调用</th>
                <th>本月 Token</th>
                <th>P99 延迟</th>
                <th>可用性</th>
                <th>评分</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {myModels.map((m) => (
                <tr key={m.code}>
                  <td className="font-medium text-slate-800">{m.name}</td>
                  <td><Tag color="purple">{m.type}</Tag></td>
                  <td className="digital text-sm">入 {m.priceIn} · 出 {m.priceOut} 元/M</td>
                  <td className="digital">{formatNumber(m.monthCalls)}</td>
                  <td className="digital">{formatToken(m.monthTokens)}</td>
                  <td className={`digital ${m.latency < 800 ? "text-emerald-600" : m.latency < 1200 ? "text-amber-600" : "text-rose-600"}`}>{m.latency} ms</td>
                  <td className="digital">{formatPercent(m.availability, 2)}</td>
                  <td className="flex items-center gap-0.5"><Star className="w-3 h-3 text-amber-500 fill-amber-500" /><span className="digital text-sm">{m.rating}</span></td>
                  <td><Tag color={m.status === "LIVE" ? "green" : "amber"} dot>{m.status === "LIVE" ? "在线" : "测试"}</Tag></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 通知 */}
      <div className="gov-card">
        <div className="gov-card-header flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-500" />
          <h2 className="font-semibold text-slate-900">平台通知</h2>
        </div>
        <div className="divide-y divide-slate-100">
          <div className="px-5 py-3 flex items-start gap-3 hover:bg-slate-50/40">
            <Tag color="amber">结算</Tag>
            <div className="flex-1 text-sm text-slate-700">2026 年 04 月账期对账已就绪，<a className="text-blue-600 hover:underline">查看账单</a></div>
            <span className="text-xs text-slate-400">2 小时前</span>
          </div>
          <div className="px-5 py-3 flex items-start gap-3 hover:bg-slate-50/40">
            <Tag color="green">入驻</Tag>
            <div className="flex-1 text-sm text-slate-700">您新接入的 <strong>DeepSeek-R1-Lite</strong> 已通过测试，正式上架</div>
            <span className="text-xs text-slate-400">昨天</span>
          </div>
          <div className="px-5 py-3 flex items-start gap-3 hover:bg-slate-50/40">
            <Tag color="blue">商务</Tag>
            <div className="flex-1 text-sm text-slate-700">滨海市经信委希望对接 1 场行业大模型应用沙龙，<a className="text-blue-600 hover:underline">查看详情</a></div>
            <span className="text-xs text-slate-400">3 天前</span>
          </div>
        </div>
      </div>
    </div>
  );
}
