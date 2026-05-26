import { getStore } from "@/lib/data/store";
import { INDUSTRIES, DISTRICTS } from "@/lib/constants";
import { formatNumber, formatToken, formatCurrency, formatDate } from "@/lib/utils";
import { Tag } from "@/components/ui/Tag";
import { KpiCard } from "@/components/ui/KpiCard";
import { Sparkline } from "@/components/ui/Sparkline";
import { Users, Search, Filter, Star, ChevronRight } from "lucide-react";

export default function ProviderCustomersPage() {
  const s = getStore();
  // 模拟服务商的客户列表：取 50 家用量较高的企业
  const customers = s.enterprises.slice().sort((a, b) => b.yearlyTokens - a.yearlyTokens).slice(0, 40);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">客户企业</h1>
          <p className="text-sm text-slate-500 mt-1">在使用您旗下模型的企业 · TOP {customers.length} 客户</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary"><Filter className="w-4 h-4" />筛选</button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="客户总数" value={formatNumber(customers.length * 8)} icon={<Users className="w-4 h-4" />} accent="#7e22ce" />
        <KpiCard label="本月活跃" value={formatNumber(customers.length * 6)} accent="#0891b2" />
        <KpiCard label="新增客户" value="+128" accent="#047857" />
        <KpiCard label="客户满意度" value="4.81" unit="/ 5.0" accent="#ea580c" />
      </div>

      <div className="gov-card">
        <div className="px-5 py-3 flex items-center gap-3 border-b border-slate-100">
          <span className="text-sm font-medium text-slate-700">客户列表</span>
          <div className="flex-1" />
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input type="text" placeholder="企业名称" className="pl-8 pr-3 py-1.5 text-sm bg-slate-100 rounded w-[240px] focus:outline-none focus:bg-white" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="gov-table">
            <thead>
              <tr>
                <th>客户企业</th>
                <th>行业</th>
                <th>区县</th>
                <th>本年调用量</th>
                <th>主要使用模型</th>
                <th>30 日趋势</th>
                <th>评分</th>
                <th className="text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((e, i) => {
                const ind = INDUSTRIES.find((x) => x.code === e.industryCode);
                const dis = DISTRICTS.find((x) => x.code === e.districtCode);
                const trend = Array.from({ length: 14 }, (_, k) => 0.5 + 0.4 * Math.sin(k * 0.4 + i * 0.3) + Math.random() * 0.3);
                return (
                  <tr key={e.id}>
                    <td className="font-medium text-slate-800 max-w-[280px] truncate">{e.name}</td>
                    <td><Tag color="blue"><span style={{ color: ind?.color }}>●</span><span className="ml-1">{ind?.name}</span></Tag></td>
                    <td className="text-sm text-slate-600">{dis?.name}</td>
                    <td className="digital">{formatToken(e.yearlyTokens)}</td>
                    <td className="text-sm text-slate-600">DeepSeek-V3 / R1</td>
                    <td><Sparkline data={trend} color={ind?.color} /></td>
                    <td><div className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-500 fill-amber-500" /><span className="digital text-sm">{e.rating}</span></div></td>
                    <td className="text-right">
                      <button className="text-blue-600 text-xs hover:underline flex items-center gap-0.5 ml-auto">画像 <ChevronRight className="w-3 h-3" /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
