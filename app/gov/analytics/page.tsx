import { getStore } from "@/lib/data/store";
import { INDUSTRIES, DISTRICTS } from "@/lib/constants";
import { formatNumber, formatToken, formatCurrency, formatPercent } from "@/lib/utils";
import { Tag } from "@/components/ui/Tag";
import { KpiCard } from "@/components/ui/KpiCard";
import { GovLine } from "@/components/charts/GovLine";
import { GovDonut } from "@/components/charts/GovDonut";
import { BarChart3, Download, Filter, ArrowUpRight, Activity, Layers } from "lucide-react";

export default function GovAnalyticsPage() {
  const s = getStore();
  const { cityDaily, industryUsage, districtUsage, modelUsage, industryDaily } = s;

  const last90 = cityDaily.slice(-90).map((p) => ({
    date: p.date.slice(5),
    tokens: p.tokens,
    calls: p.calls,
    cost: p.cost,
    active: p.active,
  }));

  // 行业 × 月度热力（取近 6 个月）
  const monthlyByIndustry: { month: string; [k: string]: any }[] = [];
  const months = ["6M前", "5M前", "4M前", "3M前", "上月", "本月"];
  for (let i = 0; i < 6; i++) {
    const row: any = { month: months[i] };
    INDUSTRIES.forEach((ind, idx) => {
      const start = Math.floor((30 * (5 - i)) + (30 - (5 - i) * 4));
      const end = start + 30;
      const slice = industryDaily[ind.code].slice(-end, -start || undefined);
      row[ind.code] = slice.reduce((s, v) => s + v, 0);
    });
    monthlyByIndustry.push(row);
  }

  // 行业近 90 天趋势（叠加）
  const indTrend = cityDaily.slice(-90).map((p, idx) => {
    const row: any = { date: p.date.slice(5) };
    INDUSTRIES.forEach((ind) => {
      row[ind.code] = industryDaily[ind.code].at(-90 + idx) || 0;
    });
    return row;
  });

  // 排行
  const topIndustries = [...industryUsage].sort((a, b) => b.tokens - a.tokens);
  const topDistricts = [...districtUsage].sort((a, b) => b.tokens - a.tokens);
  const topModels = [...modelUsage].sort((a, b) => b.tokens - a.tokens);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">BI 分析中心</h1>
          <p className="text-sm text-slate-500 mt-1">多维下钻 · 趋势分析 · 增长归因 · 报表导出</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary"><Filter className="w-4 h-4" />维度筛选</button>
          <button className="btn-primary"><Download className="w-4 h-4" />导出报表</button>
        </div>
      </div>

      {/* 维度切换 */}
      <div className="gov-card">
        <div className="px-5 py-3 flex items-center gap-2 border-b border-slate-100 text-sm">
          <Layers className="w-4 h-4 text-slate-400" />
          <span className="font-medium text-slate-700">分析维度</span>
          <div className="flex items-center gap-1 ml-3">
            {["全市", "按行业", "按区县", "按模型", "按企业规模"].map((d, i) => (
              <button key={d} className={`px-3 py-1 rounded text-xs ${i === 1 ? "bg-blue-50 text-blue-700 font-medium ring-1 ring-blue-200" : "text-slate-500 hover:bg-slate-50"}`}>
                {d}
              </button>
            ))}
          </div>
          <span className="text-slate-300 mx-2">|</span>
          <span className="font-medium text-slate-700">时间窗口</span>
          <div className="flex items-center gap-1 ml-2">
            {["7天", "30天", "90天", "12月", "本年", "自定义"].map((t, i) => (
              <button key={t} className={`px-3 py-1 rounded text-xs ${i === 2 ? "bg-slate-100 text-slate-700 font-medium" : "text-slate-500 hover:bg-slate-50"}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="gov-card-body">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 mb-4">
            <KpiCard label="本期 Token 消耗" value={formatToken(last90.reduce((s, p) => s + p.tokens, 0))} trend={0.382} trendLabel="同比" accent="#2563eb" />
            <KpiCard label="本期调用次数" value={formatNumber(last90.reduce((s, p) => s + p.calls, 0))} trend={0.241} trendLabel="同比" accent="#0891b2" />
            <KpiCard label="本期补贴金额" value={formatCurrency(last90.reduce((s, p) => s + p.cost, 0))} trend={0.295} trendLabel="同比" accent="#7e22ce" />
            <KpiCard label="峰值活跃企业" value={formatNumber(Math.max(...last90.map((p) => p.active)))} trend={0.082} trendLabel="月增" accent="#047857" />
          </div>
          <GovLine
            data={indTrend}
            xKey="date"
            series={INDUSTRIES.slice(0, 6).map((ind) => ({ key: ind.code, name: ind.name, color: ind.color }))}
            formatType="token"
            height={320}
          />
        </div>
      </div>

      {/* 行业月度热力卡 */}
      <div className="gov-card">
        <div className="gov-card-header">
          <h2 className="font-semibold text-slate-900">行业 × 月度 Token 消耗</h2>
          <p className="text-xs text-slate-500 mt-0.5">深色 = 消耗高 · 鼠标悬停查看精确数值</p>
        </div>
        <div className="px-5 py-3 overflow-x-auto">
          <table className="text-sm w-full">
            <thead>
              <tr>
                <th className="text-left text-xs text-slate-500 font-medium pb-2 pr-4">行业</th>
                {monthlyByIndustry.map((row) => (
                  <th key={row.month} className="text-center text-xs text-slate-500 font-medium pb-2 px-1">{row.month}</th>
                ))}
                <th className="text-right text-xs text-slate-500 font-medium pb-2 pl-3">同比</th>
              </tr>
            </thead>
            <tbody>
              {INDUSTRIES.map((ind) => {
                const values = monthlyByIndustry.map((m) => m[ind.code]);
                const max = Math.max(...values, 1);
                const cur = values[values.length - 1];
                const prev = values[values.length - 2];
                const yoy = prev > 0 ? (cur - prev) / prev : 0;
                return (
                  <tr key={ind.code}>
                    <td className="py-1.5 pr-4 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-sm" style={{ background: ind.color }} />
                      <span className="text-slate-700">{ind.name}</span>
                    </td>
                    {values.map((v, i) => {
                      const intensity = v / max;
                      return (
                        <td key={i} className="px-1 py-1.5">
                          <div
                            className="h-8 rounded flex items-center justify-center text-[10px] font-medium digital relative group"
                            style={{
                              background: `rgba(37, 99, 235, ${0.06 + intensity * 0.78})`,
                              color: intensity > 0.5 ? "white" : "#475569",
                            }}
                            title={formatToken(v)}
                          >
                            {formatToken(v)}
                          </div>
                        </td>
                      );
                    })}
                    <td className="text-right pl-3 digital text-sm" style={{ color: yoy > 0 ? "#10b981" : yoy < 0 ? "#ef4444" : "#64748b" }}>
                      {yoy > 0 ? "▲" : "▼"} {(yoy * 100).toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 三联排行 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <RankCard title="行业 TOP 8" items={topIndustries.slice(0, 8).map((u) => ({ name: u.industryName, value: u.tokens, color: u.color, sub: `${u.enterprises} 家 · ${u.growth > 0 ? "▲" : "▼"} ${(Math.abs(u.growth) * 100).toFixed(1)}%` }))} />
        <RankCard title="区县 TOP 8" items={topDistricts.slice(0, 8).map((u, i) => ({ name: u.districtName, value: u.tokens, color: ["#3b82f6", "#22d3ee", "#a855f7"][i % 3], sub: `${u.enterprises} 家 · ${u.level}` }))} />
        <RankCard title="模型 TOP 8" items={topModels.slice(0, 8).map((u, i) => ({ name: u.modelName, value: u.tokens, color: ["#3b82f6", "#22d3ee", "#a855f7"][i % 3], sub: u.vendor }))} />
      </div>
    </div>
  );
}

function RankCard({ title, items }: { title: string; items: { name: string; value: number; color: string; sub?: string }[] }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="gov-card">
      <div className="gov-card-header">
        <h2 className="font-semibold text-slate-900">{title}</h2>
      </div>
      <div className="px-5 py-3">
        {items.map((it, i) => (
          <div key={it.name} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
            <span className="w-5 text-xs digital text-slate-400">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-slate-800 font-medium truncate">{it.name}</span>
                <span className="text-sm digital text-slate-700 font-medium">{formatToken(it.value)}</span>
              </div>
              {it.sub && <div className="text-[10px] text-slate-400 mt-0.5">{it.sub}</div>}
              <div className="progress-bar mt-1.5"><div className="progress-bar-fill" style={{ width: `${(it.value / max) * 100}%`, background: it.color }} /></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
