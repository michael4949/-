import Link from "next/link";
import { getStore } from "@/lib/data/store";
import { CITY_NAME, INDUSTRIES, MODELS } from "@/lib/constants";
import { formatNumber, formatToken, formatPercent, formatCurrency } from "@/lib/utils";
import { ScreenPanel } from "@/components/ui/ScreenPanel";
import { KpiCard } from "@/components/ui/KpiCard";
import { ScreenLine } from "@/components/charts/ScreenLine";
import { ScreenBar } from "@/components/charts/ScreenBar";
import { ScreenDonut } from "@/components/charts/ScreenDonut";
import { CityMap } from "@/components/map/CityMap";
import { Clock } from "@/components/ui/LiveTicker";
import { ScheduleTicker } from "@/components/screen/ScheduleTicker";
import { AlertTicker } from "@/components/screen/AlertTicker";
import { ArrowLeft, Cpu, Sparkles, Zap, AlertTriangle, Activity, Database, Wallet, Users } from "lucide-react";

export default function ScreenPage() {
  const s = getStore();
  const { kpi, cityDaily, hourly, industryUsage, modelUsage, districtUsage, computeCenters, scheduleLogs, alerts } = s;

  const trendData = cityDaily.slice(-90).map((p) => ({ date: p.date.slice(5), value: p.tokens }));
  const hourlyData = hourly.map((h) => ({ label: String(h.hour).padStart(2, "0"), value: h.tokens }));

  const industryDonut = industryUsage.slice().sort((a, b) => b.tokens - a.tokens).map((u) => ({
    label: u.industryName,
    value: u.tokens,
    color: u.color,
  }));

  const districtBar = districtUsage
    .slice()
    .sort((a, b) => b.tokens - a.tokens)
    .slice(0, 8)
    .map((d) => ({
      label: d.districtName,
      value: d.tokens,
      color: "#22d3ee",
    }));

  const modelBar = modelUsage.slice(0, 10).map((m, i) => ({
    label: m.modelName,
    value: m.tokens,
    color: ["#22d3ee", "#3b82f6", "#a855f7", "#ec4899", "#f59e0b", "#10b981", "#facc15", "#06b6d4", "#8b5cf6", "#f43f5e"][i],
  }));

  const tickerLogs = scheduleLogs.slice(0, 50);
  const tickerAlerts = alerts.slice(0, 30);

  const totalCards = computeCenters.reduce((s, c) => s + c.totalCards, 0);
  const onlineCenters = computeCenters.filter((c) => c.status === "ONLINE").length;
  const avgUtil = computeCenters.reduce((s, c) => s + c.utilization * c.totalCards, 0) / totalCards;
  const totalTflops = computeCenters.reduce((sum, c) => sum + c.totalTflops, 0);

  return (
    <div className="min-h-screen bg-screen text-cyan-50 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-50 pointer-events-none" />
      {/* 顶栏 */}
      <header className="relative h-[60px] flex items-center px-6 border-b border-cyan-500/15 bg-gradient-to-r from-slate-950/80 via-blue-950/40 to-slate-950/80">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-cyan-300/70 hover:text-cyan-300 transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="w-9 h-9 bg-gradient-to-br from-cyan-500 to-blue-700 rounded-md flex items-center justify-center shadow-lg shadow-cyan-500/30">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-white tracking-wider text-base">{CITY_NAME}城市 AI 运行驾驶舱</span>
            <span className="text-[10px] text-cyan-300/60 tracking-[0.25em]">CITY AI · TOKEN · COMPUTE · LIVE</span>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center gap-12">
          <HeaderStat label="今日 Token" value={formatToken(kpi.yesterdayTokens)} icon={<Zap className="w-3.5 h-3.5" />} color="#22d3ee" />
          <HeaderStat label="今日调用" value={formatNumber(kpi.yesterdayCalls)} icon={<Activity className="w-3.5 h-3.5" />} color="#a855f7" />
          <HeaderStat label="算力利用率" value={(avgUtil * 100).toFixed(1) + "%"} icon={<Cpu className="w-3.5 h-3.5" />} color="#10b981" />
          <HeaderStat label="活跃企业" value={formatNumber(kpi.monthlyActiveEnterprises)} icon={<Users className="w-3.5 h-3.5" />} color="#f59e0b" />
          <HeaderStat label="待处理告警" value={formatNumber(alerts.filter((a) => !a.acked).length)} icon={<AlertTriangle className="w-3.5 h-3.5" />} color="#f43f5e" />
        </div>
        <Clock />
      </header>

      {/* 主体 12 列网格 */}
      <div className="relative p-3 h-[calc(100vh-60px)] grid grid-cols-12 gap-3">
        {/* 左列 */}
        <div className="col-span-3 flex flex-col gap-3 min-h-0">
          <ScreenPanel title="算力资源池总览" className="flex-shrink-0">
            <div className="grid grid-cols-2 gap-2">
              <KpiCard variant="screen" label="算力中心" value={String(computeCenters.length)} unit="个" accent="#22d3ee" trend={0.083} trendLabel="月增" />
              <KpiCard variant="screen" label="在线节点" value={String(onlineCenters)} unit={`/${computeCenters.length}`} accent="#10b981" />
              <KpiCard variant="screen" label="总卡数" value={formatNumber(totalCards)} accent="#a855f7" />
              <KpiCard variant="screen" label="总算力" value={(totalTflops / 1000).toFixed(1)} unit="PF" accent="#f59e0b" />
            </div>
          </ScreenPanel>

          <ScreenPanel title="算力中心 TOP 10" extra="按总卡数" className="flex-1 min-h-0">
            <div className="h-full">
              <ScreenBar
                data={computeCenters
                  .slice()
                  .sort((a, b) => b.totalCards - a.totalCards)
                  .slice(0, 10)
                  .map((c) => ({ label: c.name.slice(0, 8), value: c.totalCards, color: c.type === "INTEL" ? "#22d3ee" : c.type === "SUPER" ? "#a855f7" : "#10b981" }))}
                horizontal
                formatType="number"
              />
            </div>
          </ScreenPanel>

          <ScreenPanel title="调度日志流" extra="实时" className="flex-1 min-h-0">
            <ScheduleTicker logs={tickerLogs} />
          </ScreenPanel>
        </div>

        {/* 中央列 */}
        <div className="col-span-6 flex flex-col gap-3 min-h-0">
          {/* 顶部 KPI 4 卡 */}
          <div className="grid grid-cols-4 gap-3">
            <BigKpi label="今日 Token 消耗" value={formatToken(kpi.yesterdayTokens)} trend={0.143} color="#22d3ee" icon={<Zap className="w-4 h-4" />} />
            <BigKpi label="今日 调用次数" value={formatNumber(kpi.yesterdayCalls)} trend={0.092} color="#a855f7" icon={<Activity className="w-4 h-4" />} />
            <BigKpi label="今日 补贴抵扣" value={formatCurrency(kpi.yesterdayCost)} trend={0.117} color="#f59e0b" icon={<Wallet className="w-4 h-4" />} />
            <BigKpi label="本年累计补贴" value={formatCurrency(kpi.ytdSubsidy)} trend={0.382} color="#10b981" icon={<Database className="w-4 h-4" />} />
          </div>

          {/* 城市地图 */}
          <ScreenPanel title={`${CITY_NAME}算力一张图`} extra={`${computeCenters.length} 中心 · ${formatNumber(totalCards)} 卡 · 实时调度`} className="flex-1 min-h-0">
            <div className="h-full">
              <CityMap centers={computeCenters} districts={districtUsage} />
            </div>
          </ScreenPanel>

          {/* 趋势 */}
          <ScreenPanel title="近 90 天 Token 消耗趋势" className="h-[180px] flex-shrink-0">
            <ScreenLine data={trendData} color="#22d3ee" formatType="token" />
          </ScreenPanel>
        </div>

        {/* 右列 */}
        <div className="col-span-3 flex flex-col gap-3 min-h-0">
          <ScreenPanel title="行业 Token 分布" className="flex-1 min-h-0">
            <div className="grid grid-cols-3 gap-1 h-full">
              <div className="col-span-2">
                <ScreenDonut data={industryDonut} totalLabel="年度总量" />
              </div>
              <div className="space-y-1.5 text-[10px] overflow-auto scrollbar-thin">
                {industryDonut.map((d) => (
                  <div key={d.label} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 flex-shrink-0" style={{ background: d.color }} />
                    <span className="text-cyan-100/80 truncate flex-1">{d.label}</span>
                    <span className="digital text-cyan-300 font-medium">{formatPercent(d.value / industryDonut.reduce((s, x) => s + x.value, 0))}</span>
                  </div>
                ))}
              </div>
            </div>
          </ScreenPanel>

          <ScreenPanel title="区县 Token TOP 8" className="flex-1 min-h-0">
            <ScreenBar data={districtBar} horizontal formatType="token" />
          </ScreenPanel>

          <ScreenPanel title="模型调用 TOP 10" className="flex-1 min-h-0">
            <ScreenBar data={modelBar} horizontal formatType="token" />
          </ScreenPanel>

          <ScreenPanel title="风险告警" extra="未处理" className="flex-1 min-h-0">
            <AlertTicker alerts={tickerAlerts} />
          </ScreenPanel>
        </div>
      </div>
    </div>
  );
}

function HeaderStat({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded flex items-center justify-center" style={{ background: color + "20", color }}>
        {icon}
      </div>
      <div>
        <div className="text-[10px] text-cyan-300/55">{label}</div>
        <div className="digital text-base font-semibold" style={{ color }}>
          {value}
        </div>
      </div>
    </div>
  );
}

function BigKpi({
  label,
  value,
  trend,
  color,
  icon,
}: {
  label: string;
  value: string;
  trend: number;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="screen-panel p-3 relative overflow-hidden">
      <i className="corner-tl" />
      <i className="corner-tr" />
      <i className="corner-bl" />
      <i className="corner-br" />
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-[11px] text-cyan-200/70">{label}</div>
        <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: color + "25", color }}>
          {icon}
        </div>
      </div>
      <div className="digital font-semibold tracking-tight text-2xl" style={{ color }}>
        {value}
      </div>
      <div className="text-[10px] mt-1 flex items-center gap-1">
        <span className={trend > 0 ? "text-emerald-400" : "text-rose-400"}>
          {trend > 0 ? "▲" : "▼"} {Math.abs(trend * 100).toFixed(1)}%
        </span>
        <span className="text-cyan-300/40">同比</span>
      </div>
      <div
        className="absolute -bottom-4 -right-4 w-20 h-20 opacity-10 blur-2xl"
        style={{ background: color }}
      />
    </div>
  );
}
