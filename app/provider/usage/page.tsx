import { getStore } from "@/lib/data/store";
import { getDemoProvider } from "@/lib/data/personas";
import { INDUSTRIES } from "@/lib/constants";
import { formatNumber, formatToken, formatCurrency, formatPercent } from "@/lib/utils";
import { Tag } from "@/components/ui/Tag";
import { KpiCard } from "@/components/ui/KpiCard";
import { GovLine } from "@/components/charts/GovLine";
import { GovDonut } from "@/components/charts/GovDonut";
import { Activity, Zap, Users, Download } from "lucide-react";

export default function ProviderUsagePage() {
  const s = getStore();
  const provider = getDemoProvider();
  const myModels = s.models.filter((m) => m.vendor === provider.vendor);
  const totalCalls = myModels.reduce((s, m) => s + m.totalCalls, 0);

  const daily = s.cityDaily.slice(-90).map((p) => ({
    date: p.date.slice(5),
    calls: Math.floor(p.calls * 0.18 * (0.9 + Math.random() * 0.2)),
    tokens: Math.floor(p.tokens * 0.18),
  }));

  // 按行业拆分（虚构）
  const byIndustry = INDUSTRIES.map((ind, i) => ({
    name: ind.name,
    value: Math.floor(totalCalls * (i === 0 ? 0.22 : i === 1 ? 0.18 : 0.6 / (INDUSTRIES.length - 2))),
    color: ind.color,
  })).sort((a, b) => b.value - a.value);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">调用统计</h1>
          <p className="text-sm text-slate-500 mt-1">面向 {provider.vendor} 旗下所有模型的调用、客户与营收数据</p>
        </div>
        <button className="btn-secondary"><Download className="w-4 h-4" />导出报表</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="本月调用" value={formatNumber(myModels.reduce((s, m) => s + m.monthCalls, 0))} trend={0.142} trendLabel="月增" icon={<Activity className="w-4 h-4" />} accent="#7e22ce" />
        <KpiCard label="本月 Token" value={formatToken(myModels.reduce((s, m) => s + m.monthTokens, 0))} icon={<Zap className="w-4 h-4" />} accent="#0891b2" />
        <KpiCard label="活跃客户" value={formatNumber(Math.floor(myModels[0].totalCalls / 12000))} icon={<Users className="w-4 h-4" />} accent="#2563eb" />
        <KpiCard label="客户留存率" value="92.3%" trend={0.038} trendLabel="月增" accent="#047857" />
      </div>

      <div className="gov-card">
        <div className="gov-card-header"><h2 className="font-semibold text-slate-900">近 90 日调用与 Token 走势</h2></div>
        <div className="gov-card-body">
          <GovLine
            data={daily}
            xKey="date"
            series={[
              { key: "calls", name: "调用次数", color: "#a855f7", type: "area" },
              { key: "tokens", name: "Token 量", color: "#ec4899" },
            ]}
            formatType="number"
            height={300}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="gov-card">
          <div className="gov-card-header"><h2 className="font-semibold text-slate-900">行业客户分布</h2></div>
          <div className="gov-card-body"><GovDonut data={byIndustry} height={280} formatType="number" /></div>
        </div>

        <div className="gov-card">
          <div className="gov-card-header"><h2 className="font-semibold text-slate-900">本月模型调用对比</h2></div>
          <div className="px-5 py-3">
            {myModels.map((m) => {
              const max = Math.max(...myModels.map((x) => x.monthCalls));
              return (
                <div key={m.code} className="py-2 border-b border-slate-50 last:border-0">
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="font-medium text-slate-800">{m.name}</span>
                    <span className="digital text-slate-700">{formatNumber(m.monthCalls)}</span>
                  </div>
                  <div className="progress-bar"><div className="progress-bar-fill" style={{ width: `${(m.monthCalls / max) * 100}%`, background: "#a855f7" }} /></div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
