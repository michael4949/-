import Link from "next/link";
import { getStore } from "@/lib/data/store";
import { CITY_NAME, INDUSTRIES, MATURITY_LEVELS } from "@/lib/constants";
import { formatNumber, formatToken, formatPercent, formatCurrency } from "@/lib/utils";
import { ScreenPanel } from "@/components/ui/ScreenPanel";
import { ScreenLine } from "@/components/charts/ScreenLine";
import { ScreenBar } from "@/components/charts/ScreenBar";
import { ScreenDonut } from "@/components/charts/ScreenDonut";
import { CityMap } from "@/components/map/CityMap";
import { Clock } from "@/components/ui/LiveTicker";
import { ScheduleTicker } from "@/components/screen/ScheduleTicker";
import { AlertTicker } from "@/components/screen/AlertTicker";
import { IndustryScenarioMatrix } from "@/components/screen/IndustryScenarioMatrix";
import { ValueTicker } from "@/components/screen/ValueTicker";
import { BenchmarkCarousel } from "@/components/screen/BenchmarkCarousel";
import { ScreenTabs } from "./ScreenTabs";
import {
  ArrowLeft,
  Cpu,
  Sparkles,
  Zap,
  AlertTriangle,
  Activity,
  Wallet,
  Users,
  Clock as ClockIcon,
  TrendingUp,
  Coins,
  Layers,
  Award,
} from "lucide-react";

export default function ScreenPage() {
  const s = getStore();

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
            <span className="text-[10px] text-cyan-300/60 tracking-[0.25em]">CITY AI · VALUE · COMPUTE · LIVE</span>
          </div>
        </div>
        <div className="flex-1" />
        <Clock />
      </header>

      <ScreenTabs industryView={<IndustryView />} computeView={<ComputeView />} />
    </div>
  );
}

/* =====================================================
 * 视图一：产业价值（默认 Tab）
 * ===================================================== */
function IndustryView() {
  const s = getStore();
  const { scenarioStats, industryScenarioMatrix, benchmarkCases, valueEvents, valueKpi, kpi, computeCenters } = s;

  // 算力简况（作为第 6 个 KPI）
  const totalCards = computeCenters.reduce((s, c) => s + c.totalCards, 0);
  const avgUtil = computeCenters.reduce((s, c) => s + c.utilization * c.totalCards, 0) / Math.max(1, totalCards);

  // 场景使用时长 TOP10（按 totalHoursSaved）
  const topByHours = scenarioStats
    .slice()
    .sort((a, b) => b.totalHoursSaved - a.totalHoursSaved)
    .slice(0, 10)
    .map((sc) => ({ label: sc.name, value: sc.totalHoursSaved, color: sc.color }));

  // 降本增效 TOP10（按 totalCostSaved）
  const topByCost = scenarioStats
    .slice()
    .sort((a, b) => b.totalCostSaved - a.totalCostSaved)
    .slice(0, 10)
    .map((sc) => ({ label: sc.name, value: sc.totalCostSaved, color: sc.color }));

  // 黑马场景（按月度增长）
  const blackHorses = scenarioStats
    .slice()
    .sort((a, b) => b.monthlyGrowth - a.monthlyGrowth)
    .slice(0, 6);

  // 90 天主要场景调用趋势（TOP 6 场景叠加）
  const top6 = scenarioStats.slice().sort((a, b) => b.totalCalls - a.totalCalls).slice(0, 6);
  const trendData = Array.from({ length: 90 }, (_, i) => {
    const idx = 365 - 90 + i;
    const d = new Date();
    d.setDate(d.getDate() - (89 - i));
    const point: any = { date: `${d.getMonth() + 1}-${String(d.getDate()).padStart(2, "0")}` };
    // 主线：所有场景累计调用
    let total = 0;
    scenarioStats.forEach((sc) => {
      total += sc.dailyCalls[idx] || 0;
    });
    point.value = total;
    return point;
  });

  // 行业渗透率：每行业的平均场景渗透率（取该行业相关场景的均值）
  const industryPenetration = INDUSTRIES.map((ind) => {
    const cells = industryScenarioMatrix.filter((c) => c.industryCode === ind.code);
    const relevant = cells.filter((c) => c.penetration > 0.1);
    const avg = relevant.length > 0 ? relevant.reduce((s, c) => s + c.penetration, 0) / relevant.length : 0;
    return { label: ind.name, value: Math.round(avg * 100), color: ind.color };
  }).sort((a, b) => b.value - a.value);

  // 成熟度分布：按场景数
  const maturityDist = MATURITY_LEVELS.map((m) => ({
    label: m.name,
    value: scenarioStats.filter((sc) => sc.maturity === m.code).length,
    color: m.color,
  }));

  return (
    <div className="relative px-3 pt-3 pb-3 h-[calc(100vh-60px)] flex flex-col gap-3">
      {/* 顶部 6 KPI 价值条 */}
      <div className="grid grid-cols-6 gap-3 flex-shrink-0">
        <ValueKpi label="累计降本增效" value={formatCurrency(valueKpi.totalCostSavedYTD)} trend={0.382} icon={<Coins className="w-4 h-4" />} color="#22d3ee" big />
        <ValueKpi label="累计释放工时" value={formatNumber(valueKpi.totalHoursSavedYTD)} unit="小时" trend={0.293} icon={<ClockIcon className="w-4 h-4" />} color="#10b981" />
        <ValueKpi label="在用 AI 场景" value={String(valueKpi.activeScenarios)} unit="个" trend={0.067} icon={<Layers className="w-4 h-4" />} color="#a855f7" />
        <ValueKpi label="受益企业" value={formatNumber(valueKpi.benefitedEnterprises)} unit="家" trend={0.124} icon={<Users className="w-4 h-4" />} color="#3b82f6" />
        <ValueKpi label="今日 AI 调用" value={formatNumber(kpi.yesterdayCalls)} trend={0.092} icon={<Activity className="w-4 h-4" />} color="#f59e0b" />
        <ValueKpi label="算力利用率" value={(avgUtil * 100).toFixed(1)} unit="%" trend={0.018} icon={<Cpu className="w-4 h-4" />} color="#ec4899" />
      </div>

      {/* 主体 3 列 */}
      <div className="flex-1 grid grid-cols-12 gap-3 min-h-0">
        {/* 左列 */}
        <div className="col-span-3 flex flex-col gap-3 min-h-0">
          <ScreenPanel title="场景使用时长 TOP 10" extra="累计释放工时" className="flex-1 min-h-0">
            <ScreenBar data={topByHours} horizontal formatType="number" />
          </ScreenPanel>
          <ScreenPanel title="降本增效 TOP 10" extra="累计节省金额" className="flex-1 min-h-0">
            <ScreenBar data={topByCost} horizontal formatType="currency" />
          </ScreenPanel>
          <ScreenPanel title="黑马场景 · 月环比增速" className="flex-1 min-h-0">
            <div className="h-full overflow-y-auto scrollbar-thin pr-1">
              {blackHorses.map((sc, i) => (
                <div key={sc.code} className="flex items-center gap-2 py-1.5 border-b border-cyan-500/10 last:border-0">
                  <span className="w-5 text-[10px] digital text-cyan-300/55">{i + 1}</span>
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: sc.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-cyan-100 truncate">{sc.name}</div>
                    <div className="text-[9px] text-cyan-300/55">企业 {sc.enterprises}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] digital font-semibold text-emerald-300">▲ {(sc.monthlyGrowth * 100).toFixed(0)}%</div>
                    <div className="text-[9px] text-cyan-300/55">{({ mature: "成熟", scaling: "规模化", pilot: "试点", emerging: "新兴" }[sc.maturity])}</div>
                  </div>
                </div>
              ))}
            </div>
          </ScreenPanel>
        </div>

        {/* 中央 */}
        <div className="col-span-6 flex flex-col gap-3 min-h-0">
          <ScreenPanel
            title="行业 × 场景 价值热力矩阵"
            extra={`${INDUSTRIES.length} 行业 × ${scenarioStats.length} 场景 · 点击格子下钻`}
            className="flex-[2] min-h-0"
            bodyClass="p-0"
          >
            <IndustryScenarioMatrix
              matrix={industryScenarioMatrix}
              industries={INDUSTRIES.map((i) => ({ code: i.code, name: i.name, color: i.color }))}
              scenarios={scenarioStats.map((s) => ({ code: s.code, name: s.name, color: s.color }))}
            />
          </ScreenPanel>
          <ScreenPanel title="主要场景 90 天调用趋势" className="h-[180px] flex-shrink-0">
            <ScreenLine data={trendData} color="#22d3ee" formatType="number" />
          </ScreenPanel>
        </div>

        {/* 右列 */}
        <div className="col-span-3 flex flex-col gap-3 min-h-0">
          <ScreenPanel
            title="标杆企业案例"
            extra={`${benchmarkCases.length} 个 · 自动轮播`}
            className="flex-[2] min-h-0"
            bodyClass="p-0"
          >
            <BenchmarkCarousel cases={benchmarkCases} />
          </ScreenPanel>
          <ScreenPanel title="行业 AI 渗透率" extra="平均覆盖" className="flex-1 min-h-0">
            <ScreenBar data={industryPenetration} horizontal formatType="percent" />
          </ScreenPanel>
          <ScreenPanel title="场景成熟度分布" extra="按场景数" className="h-[150px] flex-shrink-0">
            <ScreenDonut
              data={maturityDist}
              total={scenarioStats.length}
              totalLabel="场景"
            />
          </ScreenPanel>
          <ScreenPanel title="实时场景价值流水" extra="每分钟更新" className="flex-1 min-h-0">
            <ValueTicker events={valueEvents.slice(0, 40)} />
          </ScreenPanel>
        </div>
      </div>
    </div>
  );
}

/* =====================================================
 * 视图二：算力调度（原大屏内容完整保留）
 * ===================================================== */
function ComputeView() {
  const s = getStore();
  const { kpi, cityDaily, hourly, industryUsage, modelUsage, districtUsage, computeCenters, scheduleLogs, alerts } = s;

  const trendData = cityDaily.slice(-90).map((p) => ({ date: p.date.slice(5), value: p.tokens }));

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
    <div className="relative p-3 h-[calc(100vh-60px)] grid grid-cols-12 gap-3">
      {/* 左列 */}
      <div className="col-span-3 flex flex-col gap-3 min-h-0">
        <ScreenPanel title="算力资源池总览" className="flex-shrink-0">
          <div className="grid grid-cols-2 gap-2">
            <SmallKpi label="算力中心" value={String(computeCenters.length)} unit="个" accent="#22d3ee" />
            <SmallKpi label="在线节点" value={String(onlineCenters)} unit={`/${computeCenters.length}`} accent="#10b981" />
            <SmallKpi label="总卡数" value={formatNumber(totalCards)} accent="#a855f7" />
            <SmallKpi label="总算力" value={(totalTflops / 1000).toFixed(1)} unit="PF" accent="#f59e0b" />
          </div>
        </ScreenPanel>

        <ScreenPanel title="算力中心 TOP 10" extra="按总卡数" className="flex-1 min-h-0">
          <ScreenBar
            data={computeCenters
              .slice()
              .sort((a, b) => b.totalCards - a.totalCards)
              .slice(0, 10)
              .map((c) => ({ label: c.name.slice(0, 8), value: c.totalCards, color: c.type === "INTEL" ? "#22d3ee" : c.type === "SUPER" ? "#a855f7" : "#10b981" }))}
            horizontal
            formatType="number"
          />
        </ScreenPanel>

        <ScreenPanel title="调度日志流" extra="实时" className="flex-1 min-h-0">
          <ScheduleTicker logs={tickerLogs} />
        </ScreenPanel>
      </div>

      {/* 中央 */}
      <div className="col-span-6 flex flex-col gap-3 min-h-0">
        <div className="grid grid-cols-4 gap-3">
          <BigKpi label="今日 Token 消耗" value={formatToken(kpi.yesterdayTokens)} trend={0.143} color="#22d3ee" icon={<Zap className="w-4 h-4" />} />
          <BigKpi label="今日 调用次数" value={formatNumber(kpi.yesterdayCalls)} trend={0.092} color="#a855f7" icon={<Activity className="w-4 h-4" />} />
          <BigKpi label="今日 补贴抵扣" value={formatCurrency(kpi.yesterdayCost)} trend={0.117} color="#f59e0b" icon={<Wallet className="w-4 h-4" />} />
          <BigKpi label="本年累计补贴" value={formatCurrency(kpi.ytdSubsidy)} trend={0.382} color="#10b981" icon={<Coins className="w-4 h-4" />} />
        </div>

        <ScreenPanel title={`${CITY_NAME}算力一张图`} extra={`${computeCenters.length} 中心 · ${formatNumber(totalCards)} 卡 · 实时调度`} className="flex-1 min-h-0">
          <div className="h-full">
            <CityMap centers={computeCenters} districts={districtUsage} />
          </div>
        </ScreenPanel>

        <ScreenPanel title="近 90 天 Token 消耗趋势" className="h-[180px] flex-shrink-0">
          <ScreenLine data={trendData} color="#22d3ee" formatType="token" />
        </ScreenPanel>
      </div>

      {/* 右列 */}
      <div className="col-span-3 flex flex-col gap-3 min-h-0">
        <ScreenPanel title="行业 Token 分布" className="flex-1 min-h-0">
          <ScreenDonut data={industryDonut} totalLabel="年度总量" />
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
  );
}

/* =====================================================
 * 共用小组件
 * ===================================================== */
function ValueKpi({
  label,
  value,
  unit,
  trend,
  icon,
  color,
  big,
}: {
  label: string;
  value: string;
  unit?: string;
  trend?: number;
  icon: React.ReactNode;
  color: string;
  big?: boolean;
}) {
  return (
    <div className="screen-panel p-3 relative overflow-hidden">
      <i className="corner-tl" />
      <i className="corner-tr" />
      <i className="corner-bl" />
      <i className="corner-br" />
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-[11px] text-cyan-200/70 truncate">{label}</div>
        <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0" style={{ background: color + "25", color }}>
          {icon}
        </div>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`digital font-semibold tracking-tight ${big ? "text-2xl" : "text-xl"}`} style={{ color }}>
          {value}
        </span>
        {unit && <span className="text-[11px] text-cyan-200/55">{unit}</span>}
      </div>
      {trend !== undefined && (
        <div className="text-[10px] mt-1 flex items-center gap-1">
          <span className={trend > 0 ? "text-emerald-400" : "text-rose-400"}>
            {trend > 0 ? "▲" : "▼"} {Math.abs(trend * 100).toFixed(1)}%
          </span>
          <span className="text-cyan-300/40">同比</span>
        </div>
      )}
      <div className="absolute -bottom-4 -right-4 w-20 h-20 opacity-10 blur-2xl" style={{ background: color }} />
    </div>
  );
}

function SmallKpi({ label, value, unit, accent }: { label: string; value: string; unit?: string; accent: string }) {
  return (
    <div className="bg-cyan-500/8 border border-cyan-500/15 rounded p-2">
      <div className="text-[10px] text-cyan-200/65">{label}</div>
      <div className="flex items-baseline gap-1 mt-0.5">
        <span className="digital text-lg font-semibold" style={{ color: accent }}>{value}</span>
        {unit && <span className="text-[10px] text-cyan-200/55">{unit}</span>}
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
      <div className="absolute -bottom-4 -right-4 w-20 h-20 opacity-10 blur-2xl" style={{ background: color }} />
    </div>
  );
}
