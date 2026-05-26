import { getStore } from "@/lib/data/store";
import { CITY_NAME, INDUSTRIES, DISTRICTS } from "@/lib/constants";
import { formatNumber, formatToken, formatCurrency, formatPercent, relativeTime } from "@/lib/utils";
import { KpiCard } from "@/components/ui/KpiCard";
import { Tag } from "@/components/ui/Tag";
import { Sparkline } from "@/components/ui/Sparkline";
import { GovLine } from "@/components/charts/GovLine";
import { GovDonut } from "@/components/charts/GovDonut";
import Link from "next/link";
import {
  Wallet,
  Building2,
  Cpu,
  Activity,
  TrendingUp,
  ArrowUpRight,
  Receipt,
  AlertTriangle,
  Sparkles,
  Users,
  ServerCog,
  ChevronRight,
} from "lucide-react";

export default function GovOverviewPage() {
  const s = getStore();
  const { kpi, cityDaily, industryUsage, districtUsage, modelUsage, computeCenters, voucherApps, alerts } = s;

  const last90 = cityDaily.slice(-90);
  const yesterday = cityDaily[cityDaily.length - 1];
  const dayBefore = cityDaily[cityDaily.length - 2];
  const dayTrend = (yesterday.tokens - dayBefore.tokens) / dayBefore.tokens;

  const last90Trend = last90.map((p) => ({ date: p.date.slice(5), tokens: p.tokens, calls: p.calls, cost: p.cost, active: p.active }));

  const pendingApps = voucherApps.filter((a) => a.status === "PENDING").slice(0, 8);
  const criticalAlerts = alerts.filter((a) => a.level === "CRITICAL" && !a.acked).slice(0, 5);
  const topEnterprises = s.enterprises
    .slice()
    .sort((a, b) => b.yearlyTokens - a.yearlyTokens)
    .slice(0, 10);

  const totalCards = computeCenters.reduce((s, c) => s + c.totalCards, 0);
  const avgUtil = computeCenters.reduce((acc, c) => acc + c.utilization * c.totalCards, 0) / totalCards;

  const industryDonutData = industryUsage.map((u) => ({ name: u.industryName, value: u.tokens, color: u.color }));
  const districtList = districtUsage.slice().sort((a, b) => b.tokens - a.tokens);

  return (
    <div className="p-6 space-y-5">
      {/* Page header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{CITY_NAME}AI 运营概览驾驶舱</h1>
          <p className="text-sm text-slate-500 mt-1">截至 {yesterday.date} · 数据已实时校对</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/screen" className="btn-secondary">
            <Sparkles className="w-4 h-4" />
            城市运行大屏
          </Link>
          <button className="btn-primary">
            <Receipt className="w-4 h-4" />
            导出月度报告
          </button>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <KpiCard
          label="今日 Token 消耗"
          value={formatToken(yesterday.tokens)}
          trend={dayTrend}
          trendLabel="环比"
          icon={<Activity className="w-4 h-4" />}
          accent="#2563eb"
        />
        <KpiCard
          label="本年累计补贴"
          value={formatCurrency(kpi.ytdSubsidy)}
          trend={kpi.industryGrowth}
          trendLabel="同比"
          icon={<Wallet className="w-4 h-4" />}
          accent="#0891b2"
        />
        <KpiCard label="在管企业" value={formatNumber(kpi.totalEnterprises)} trend={0.082} trendLabel="月增" icon={<Building2 className="w-4 h-4" />} accent="#7e22ce" />
        <KpiCard label="月活跃企业" value={formatNumber(kpi.monthlyActiveEnterprises)} trend={0.124} trendLabel="月增" icon={<Users className="w-4 h-4" />} accent="#047857" />
        <KpiCard label="算力卡总数" value={formatNumber(totalCards)} unit="张" trend={0.057} trendLabel="季增" icon={<Cpu className="w-4 h-4" />} accent="#ea580c" />
        <KpiCard label="算力利用率" value={(avgUtil * 100).toFixed(1) + "%"} trend={0.018} trendLabel="周变" icon={<ServerCog className="w-4 h-4" />} accent="#dc2626" />
      </div>

      {/* Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 gov-card">
          <div className="gov-card-header flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">近 90 天关键指标走势</h2>
              <p className="text-xs text-slate-500 mt-0.5">Token 消耗 · 补贴金额 · 活跃企业</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <button className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 font-medium">90 天</button>
              <button className="px-2.5 py-1 rounded text-slate-500 hover:bg-slate-50">30 天</button>
              <button className="px-2.5 py-1 rounded text-slate-500 hover:bg-slate-50">7 天</button>
            </div>
          </div>
          <div className="gov-card-body">
            <GovLine
              data={last90Trend}
              xKey="date"
              series={[
                { key: "tokens", name: "Token 消耗", color: "#2563eb", type: "area" },
                { key: "cost", name: "补贴金额 (元)", color: "#0891b2" },
                { key: "active", name: "活跃企业", color: "#7e22ce" },
              ]}
              formatType="number"
              height={300}
            />
          </div>
        </div>

        <div className="gov-card">
          <div className="gov-card-header">
            <h2 className="font-semibold text-slate-900">行业 Token 分布</h2>
            <p className="text-xs text-slate-500 mt-0.5">按消耗量排名</p>
          </div>
          <div className="gov-card-body">
            <GovDonut data={industryDonutData} height={290} formatType="token" />
          </div>
        </div>
      </div>

      {/* 区县 + 模型 + 算力 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 区县排行 */}
        <div className="gov-card">
          <div className="gov-card-header flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">区县活跃度</h2>
            <Link href="/gov/analytics" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              详细分析 <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="px-5 py-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-slate-100">
                  <th className="text-left py-2 font-medium">区县</th>
                  <th className="text-right font-medium">企业</th>
                  <th className="text-right font-medium">Token</th>
                  <th className="text-right font-medium">占比</th>
                </tr>
              </thead>
              <tbody>
                {districtList.slice(0, 8).map((d, i) => {
                  const total = districtList.reduce((s, x) => s + x.tokens, 0);
                  return (
                    <tr key={d.districtCode} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="py-2 text-slate-700 flex items-center gap-2">
                        <span className="w-5 h-5 rounded text-[10px] flex items-center justify-center digital font-medium" style={{ background: ["#2563eb20", "#0891b220", "#7e22ce20"][Math.min(i, 2)] + (i < 3 ? "" : "10"), color: ["#2563eb", "#0891b2", "#7e22ce"][Math.min(i, 2)] || "#64748b" }}>
                          {i + 1}
                        </span>
                        {d.districtName}
                        <Tag color="slate">{d.level}</Tag>
                      </td>
                      <td className="text-right digital text-slate-600">{formatNumber(d.enterprises)}</td>
                      <td className="text-right digital text-slate-700 font-medium">{formatToken(d.tokens)}</td>
                      <td className="text-right">
                        <div className="inline-flex items-center gap-2 justify-end w-full">
                          <div className="w-12 progress-bar">
                            <div className="progress-bar-fill" style={{ width: `${(d.tokens / districtList[0].tokens) * 100}%` }} />
                          </div>
                          <span className="digital text-xs text-slate-500 w-10 text-right">{formatPercent(d.tokens / total)}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 模型 TOP */}
        <div className="gov-card">
          <div className="gov-card-header flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">模型调用排行</h2>
            <Link href="/gov/models" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              模型注册表 <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="px-5 py-3">
            {modelUsage.slice(0, 8).map((m, i) => (
              <div key={m.modelCode} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                <div className="w-7 h-7 rounded bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs flex items-center justify-center font-semibold flex-shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-800 truncate font-medium">{m.modelName}</div>
                  <div className="text-[10px] text-slate-400">{m.vendor}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm digital text-slate-800 font-medium">{formatToken(m.tokens)}</div>
                  <div className="text-[10px] text-slate-400">{formatPercent(m.share)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 算力中心 */}
        <div className="gov-card">
          <div className="gov-card-header flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">重点算力中心</h2>
            <Link href="/gov/compute" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              算力一张图 <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="px-5 py-3 space-y-2.5">
            {computeCenters.slice(0, 6).map((c) => (
              <div key={c.id} className="flex items-center gap-3 py-1.5">
                <div className={`w-2 h-2 rounded-full ${c.status === "ONLINE" ? "bg-emerald-500" : c.status === "DEGRADED" ? "bg-amber-500" : "bg-rose-500"}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-800 truncate font-medium">{c.name}</div>
                  <div className="text-[10px] text-slate-400">{c.vendor} · {formatNumber(c.totalCards)} 卡</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm digital font-medium text-slate-800">{(c.utilization * 100).toFixed(0)}%</div>
                  <div className="w-16 progress-bar mt-1">
                    <div className="progress-bar-fill" style={{ width: `${c.utilization * 100}%`, background: c.utilization > 0.85 ? "#dc2626" : c.utilization > 0.7 ? "#ea580c" : "#2563eb" }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 待审 + 重点企业 + 告警 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 待审申请 */}
        <div className="gov-card">
          <div className="gov-card-header flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">待审申请</h2>
              <p className="text-xs text-slate-500 mt-0.5">需要您批阅 · 累计 {voucherApps.filter((a) => a.status === "PENDING").length} 件</p>
            </div>
            <Link href="/gov/applications" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              批量处理 <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {pendingApps.map((a) => (
              <div key={a.id} className="px-5 py-3 hover:bg-slate-50/50">
                <div className="flex items-start justify-between mb-1">
                  <div className="font-medium text-sm text-slate-800 truncate flex-1 pr-2">{a.enterpriseName}</div>
                  <Tag color={a.voucherType === "TOKEN" ? "blue" : a.voucherType === "COMPUTE" ? "purple" : "cyan"}>
                    {a.voucherType === "TOKEN" ? "Token 券" : a.voucherType === "COMPUTE" ? "算力券" : a.voucherType === "MODEL" ? "模型券" : a.voucherType === "DATA" ? "数据券" : "语料券"}
                  </Tag>
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-2">
                  <span>{a.scenario}</span>
                  <span>·</span>
                  <span className="digital">{formatNumber(a.requestedAmount)} {a.unit}</span>
                  <span>·</span>
                  <span>{relativeTime(a.submittedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 重点企业用量 TOP */}
        <div className="gov-card">
          <div className="gov-card-header flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">企业用量 TOP 10</h2>
            <Link href="/gov/enterprises" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              全部企业 <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {topEnterprises.map((e, i) => {
              const indMeta = INDUSTRIES.find((x) => x.code === e.industryCode);
              // 生成一个小型走势数据
              const trend = Array.from({ length: 14 }, (_, k) => 0.7 + 0.6 * Math.sin(k * 0.5 + i) + Math.random() * 0.3);
              return (
                <div key={e.id} className="px-5 py-2.5 hover:bg-slate-50/50">
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm digital font-medium text-slate-400 w-5">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">{e.name}</div>
                      <div className="text-[10px] text-slate-400">
                        <span style={{ color: indMeta?.color }}>● </span>
                        {indMeta?.name} · {e.scale}
                      </div>
                    </div>
                    <div className="hidden sm:block">
                      <Sparkline data={trend} color={indMeta?.color || "#3b82f6"} />
                    </div>
                    <div className="text-right">
                      <div className="text-sm digital font-medium text-slate-800">{formatToken(e.yearlyTokens)}</div>
                      <div className="text-[10px] text-emerald-600 digital">▲ {(Math.random() * 30 + 5).toFixed(1)}%</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 重大告警 */}
        <div className="gov-card">
          <div className="gov-card-header flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <h2 className="font-semibold text-slate-900">重大告警</h2>
            </div>
            <Link href="/gov/alerts" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              告警中心 <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {criticalAlerts.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-slate-500">暂无重大告警</div>
            ) : (
              criticalAlerts.map((a) => (
                <div key={a.id} className="px-5 py-3 hover:bg-slate-50/50">
                  <div className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 mt-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">{a.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5 truncate-2">{a.detail}</div>
                      <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
                        <Tag color="red">CRITICAL</Tag>
                        <span>{relativeTime(a.ts)}</span>
                        {a.related && <span>· {a.related}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
            {[...alerts.filter((a) => a.level === "WARN" && !a.acked)].slice(0, 3).map((a) => (
              <div key={a.id} className="px-5 py-3 hover:bg-slate-50/50">
                <div className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 mt-2 rounded-full bg-amber-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-800 truncate">{a.title}</div>
                    <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
                      <Tag color="amber">WARN</Tag>
                      <span>{relativeTime(a.ts)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
