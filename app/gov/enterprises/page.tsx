import { getStore } from "@/lib/data/store";
import { INDUSTRIES, DISTRICTS, ENTERPRISE_SCALES } from "@/lib/constants";
import { formatNumber, formatToken, formatCurrency, formatPercent, formatDate } from "@/lib/utils";
import { Tag } from "@/components/ui/Tag";
import { KpiCard } from "@/components/ui/KpiCard";
import { Sparkline } from "@/components/ui/Sparkline";
import { GovDonut } from "@/components/charts/GovDonut";
import { Filter, Search, Download, Building2, BadgeCheck, Sparkles, Star, ShieldCheck, ChevronRight, MapPin } from "lucide-react";

export default function GovEnterprisesPage() {
  const s = getStore();
  const { enterprises } = s;

  const certified = enterprises.filter((e) => e.certified).length;
  const highTech = enterprises.filter((e) => e.isHighTech).length;
  const specialized = enterprises.filter((e) => e.isSpecialized).length;
  const monthActive = enterprises.filter((e) => e.monthlyTokens > 100000).length;

  // 按行业分布
  const indDist = INDUSTRIES.map((i) => ({
    name: i.name,
    value: enterprises.filter((e) => e.industryCode === i.code).length,
    color: i.color,
  }));

  // 按规模分布
  const scaleDist = ENTERPRISE_SCALES.map((sc) => ({
    name: sc.name + "企业",
    value: enterprises.filter((e) => e.scale === sc.code).length,
    color: { MICRO: "#94a3b8", SMALL: "#3b82f6", MED: "#a855f7", LARGE: "#f43f5e" }[sc.code as string]!,
  }));

  // 按区县分布 TOP 8
  const disDist = DISTRICTS.map((d) => ({
    name: d.name,
    value: enterprises.filter((e) => e.districtCode === d.code).length,
    color: "#3b82f6",
  })).sort((a, b) => b.value - a.value).slice(0, 8);

  const list = enterprises
    .slice()
    .sort((a, b) => b.yearlyTokens - a.yearlyTokens)
    .slice(0, 30);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">企业管理</h1>
          <p className="text-sm text-slate-500 mt-1">入驻 · 认证 · 资质 · 用量 · 画像</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary"><Download className="w-4 h-4" />导出 CSV</button>
          <button className="btn-primary"><BadgeCheck className="w-4 h-4" />批量认证</button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="入驻企业" value={formatNumber(enterprises.length)} trend={0.082} trendLabel="月增" icon={<Building2 className="w-4 h-4" />} accent="#2563eb" />
        <KpiCard label="已认证" value={formatNumber(certified)} unit={`(${formatPercent(certified / enterprises.length)})`} icon={<BadgeCheck className="w-4 h-4" />} accent="#0891b2" />
        <KpiCard label="月活企业" value={formatNumber(monthActive)} icon={<Sparkles className="w-4 h-4" />} accent="#7e22ce" />
        <KpiCard label="高新技术" value={formatNumber(highTech)} icon={<ShieldCheck className="w-4 h-4" />} accent="#047857" />
        <KpiCard label="专精特新" value={formatNumber(specialized)} icon={<Star className="w-4 h-4" />} accent="#ea580c" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="gov-card">
          <div className="gov-card-header"><h2 className="font-semibold text-slate-900">行业分布</h2></div>
          <div className="gov-card-body"><GovDonut data={indDist} height={260} formatType="number" /></div>
        </div>
        <div className="gov-card">
          <div className="gov-card-header"><h2 className="font-semibold text-slate-900">规模分布</h2></div>
          <div className="gov-card-body"><GovDonut data={scaleDist} height={260} formatType="number" /></div>
        </div>
        <div className="gov-card">
          <div className="gov-card-header"><h2 className="font-semibold text-slate-900">区县分布 TOP 8</h2></div>
          <div className="px-5 py-3">
            {disDist.map((d, i) => (
              <div key={d.name} className="flex items-center gap-2 py-1.5">
                <span className="text-xs digital text-slate-400 w-4">{i + 1}</span>
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-sm text-slate-700 flex-1">{d.name}</span>
                <div className="w-20 progress-bar"><div className="progress-bar-fill" style={{ width: `${(d.value / disDist[0].value) * 100}%` }} /></div>
                <span className="text-sm digital text-slate-700 font-medium w-12 text-right">{formatNumber(d.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 列表 */}
      <div className="gov-card">
        <div className="px-5 py-3 flex items-center gap-3 border-b border-slate-100">
          <span className="text-sm font-medium text-slate-700">企业列表</span>
          <span className="text-xs text-slate-400">前 30 名 · 共 {formatNumber(enterprises.length)} 家</span>
          <div className="flex-1" />
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input type="text" placeholder="企业名称 / 统一社会信用代码" className="pl-8 pr-3 py-1.5 text-sm bg-slate-100 border border-transparent rounded w-[280px] focus:outline-none focus:bg-white focus:border-slate-300" />
          </div>
          <button className="text-xs text-slate-600 px-2 py-1 rounded hover:bg-slate-100 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            筛选
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="gov-table">
            <thead>
              <tr>
                <th>企业</th>
                <th>统一信用代码</th>
                <th>行业</th>
                <th>规模</th>
                <th>区县</th>
                <th>资质</th>
                <th>本年 Token</th>
                <th>本年支出</th>
                <th>趋势</th>
                <th>评级</th>
                <th className="text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {list.map((e, i) => {
                const ind = INDUSTRIES.find((x) => x.code === e.industryCode);
                const dis = DISTRICTS.find((x) => x.code === e.districtCode);
                const sc = ENTERPRISE_SCALES.find((x) => x.code === e.scale);
                const trend = Array.from({ length: 14 }, (_, k) => 0.5 + 0.5 * Math.sin(k * 0.4 + i * 0.6) + Math.random() * 0.3);
                return (
                  <tr key={e.id}>
                    <td>
                      <div className="font-medium text-slate-800 max-w-[260px] truncate">{e.name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                        <span>👤 {e.contact}</span>
                        <span>· {e.employees} 人</span>
                      </div>
                    </td>
                    <td className="font-mono text-[10px] text-slate-500">{e.uscc}</td>
                    <td>
                      <Tag color="blue">
                        <span style={{ color: ind?.color }}>●</span>
                        <span className="ml-1">{ind?.name}</span>
                      </Tag>
                    </td>
                    <td><Tag color="slate">{sc?.name}</Tag></td>
                    <td className="text-sm text-slate-600">{dis?.name}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        {e.certified && <Tag color="green">已认证</Tag>}
                        {e.isHighTech && <Tag color="purple">高新</Tag>}
                        {e.isSpecialized && <Tag color="amber">专精特新</Tag>}
                      </div>
                    </td>
                    <td className="digital text-slate-800 font-medium">{formatToken(e.yearlyTokens)}</td>
                    <td className="digital text-slate-600">{formatCurrency(e.yearlyCost)}</td>
                    <td><Sparkline data={trend} color={ind?.color} /></td>
                    <td>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`w-3 h-3 ${i < Math.floor(e.rating) ? "text-amber-500 fill-amber-500" : "text-slate-200 fill-slate-200"}`} />
                        ))}
                        <span className="text-xs text-slate-500 ml-1 digital">{e.rating.toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="text-right">
                      <button className="text-blue-600 text-xs hover:underline flex items-center gap-0.5">
                        画像 <ChevronRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>共 {formatNumber(enterprises.length)} 家，每页 30 家</div>
          <div className="flex items-center gap-1">
            <button className="px-2 py-1 rounded hover:bg-slate-100">‹ 上一页</button>
            <button className="px-2 py-1 rounded bg-slate-100 text-slate-900 font-medium">1</button>
            <button className="px-2 py-1 rounded hover:bg-slate-100">2</button>
            <button className="px-2 py-1 rounded hover:bg-slate-100">3</button>
            <span className="px-1">...</span>
            <button className="px-2 py-1 rounded hover:bg-slate-100">{Math.ceil(enterprises.length / 30)}</button>
            <button className="px-2 py-1 rounded hover:bg-slate-100">下一页 ›</button>
          </div>
        </div>
      </div>
    </div>
  );
}
