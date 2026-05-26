import { getStore } from "@/lib/data/store";
import { COMPUTE_CENTER_TYPES, CHIPS, DISTRICTS, CITY_NAME } from "@/lib/constants";
import { formatNumber, formatPercent, formatCurrency, relativeTime } from "@/lib/utils";
import { Tag } from "@/components/ui/Tag";
import { KpiCard } from "@/components/ui/KpiCard";
import { CityMap } from "@/components/map/CityMap";
import { GovDonut } from "@/components/charts/GovDonut";
import { ServerCog, Cpu, Zap, Activity, Leaf, Map as MapIcon, Plus, RefreshCw, ChevronRight, Layers, Power, AlertTriangle } from "lucide-react";

export default function GovComputePage() {
  const s = getStore();
  const { computeCenters, scheduleLogs, districtUsage } = s;

  const totalCards = computeCenters.reduce((s, c) => s + c.totalCards, 0);
  const totalTflops = computeCenters.reduce((s, c) => s + c.totalTflops, 0);
  const totalPower = computeCenters.reduce((s, c) => s + c.power, 0);
  const avgUtil = computeCenters.reduce((s, c) => s + c.utilization * c.totalCards, 0) / totalCards;
  const avgPue = computeCenters.reduce((s, c) => s + c.pue, 0) / computeCenters.length;
  const onlineCount = computeCenters.filter((c) => c.status === "ONLINE").length;
  const greenAvg = computeCenters.reduce((s, c) => s + c.greenRatio, 0) / computeCenters.length;

  // 芯片分布
  const chipCount: Record<string, number> = {};
  computeCenters.forEach((c) => c.chips.forEach((ch) => (chipCount[ch.code] = (chipCount[ch.code] || 0) + ch.count)));
  const chipDist = Object.entries(chipCount)
    .map(([code, count]) => {
      const chip = CHIPS.find((c) => c.code === code)!;
      return {
        name: chip.name,
        value: count,
        color: chip.isDomestic ? "#f97316" : "#3b82f6",
        isDomestic: chip.isDomestic,
        vendor: chip.vendor,
      };
    })
    .sort((a, b) => b.value - a.value);

  const domesticRatio = chipDist.filter((c) => c.isDomestic).reduce((s, c) => s + c.value, 0) / totalCards;

  // 中心类型分布
  const typeDist = COMPUTE_CENTER_TYPES.map((t) => ({
    name: t.name,
    value: computeCenters.filter((c) => c.type === t.code).length,
    color: t.color,
  }));

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">算力一张图</h1>
          <p className="text-sm text-slate-500 mt-1">{CITY_NAME}{computeCenters.length} 个智算 / 超算 / 通算中心 · 一体化调度</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary"><RefreshCw className="w-4 h-4" />刷新调度策略</button>
          <button className="btn-primary"><Plus className="w-4 h-4" />新增中心接入</button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <KpiCard label="算力中心" value={String(computeCenters.length)} unit="个" trend={0.083} trendLabel="月增" icon={<ServerCog className="w-4 h-4" />} accent="#2563eb" />
        <KpiCard label="算力卡总数" value={formatNumber(totalCards)} icon={<Cpu className="w-4 h-4" />} accent="#0891b2" />
        <KpiCard label="峰值算力" value={(totalTflops / 1000).toFixed(1)} unit="PF" trend={0.124} trendLabel="季增" icon={<Zap className="w-4 h-4" />} accent="#7e22ce" />
        <KpiCard label="平均利用率" value={formatPercent(avgUtil)} trend={0.018} trendLabel="周变" icon={<Activity className="w-4 h-4" />} accent="#047857" />
        <KpiCard label="平均 PUE" value={avgPue.toFixed(2)} trend={-0.04} trendLabel="月降" icon={<Power className="w-4 h-4" />} accent="#ea580c" />
        <KpiCard label="国产化率" value={formatPercent(domesticRatio)} trend={0.067} trendLabel="季增" icon={<Layers className="w-4 h-4" />} accent="#dc2626" />
      </div>

      {/* 地图 + 侧栏 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 gov-card overflow-hidden">
          <div className="gov-card-header flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapIcon className="w-4 h-4 text-blue-600" />
              <h2 className="font-semibold text-slate-900">城市算力一张图</h2>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <button className="px-2 py-1 rounded bg-slate-100 text-slate-700 font-medium">智算</button>
              <button className="px-2 py-1 rounded text-slate-500 hover:bg-slate-50">超算</button>
              <button className="px-2 py-1 rounded text-slate-500 hover:bg-slate-50">通算</button>
              <span className="text-slate-300 mx-1">|</span>
              <button className="px-2 py-1 rounded text-slate-500 hover:bg-slate-50">显示链路</button>
            </div>
          </div>
          <div className="bg-screen relative h-[480px]">
            <CityMap centers={computeCenters} districts={districtUsage} />
          </div>
        </div>

        <div className="space-y-4">
          <div className="gov-card">
            <div className="gov-card-header"><h2 className="font-semibold text-slate-900">中心类型分布</h2></div>
            <div className="gov-card-body"><GovDonut data={typeDist} height={170} formatType="number" /></div>
          </div>

          <div className="gov-card">
            <div className="gov-card-header">
              <h2 className="font-semibold text-slate-900">芯片国产化构成</h2>
              <p className="text-xs text-slate-500 mt-0.5">国产 vs 国际</p>
            </div>
            <div className="px-5 py-3 space-y-2">
              {chipDist.slice(0, 6).map((c) => (
                <div key={c.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-slate-700">
                      <span className="w-2 h-2 rounded-sm" style={{ background: c.color }} />
                      {c.name}
                      {c.isDomestic && <Tag color="amber">国产</Tag>}
                    </span>
                    <span className="digital text-slate-700 font-medium">{formatNumber(c.value)}</span>
                  </div>
                  <div className="progress-bar"><div className="progress-bar-fill" style={{ width: `${(c.value / chipDist[0].value) * 100}%`, background: c.color }} /></div>
                </div>
              ))}
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">国产化率</span>
                <span className="text-base digital font-semibold text-orange-600">{formatPercent(domesticRatio)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 算力中心列表 */}
      <div className="gov-card">
        <div className="gov-card-header flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">算力中心列表</h2>
            <p className="text-xs text-slate-500 mt-0.5">{onlineCount}/{computeCenters.length} 在线 · 平均绿色能源占比 {formatPercent(greenAvg)}</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="gov-table">
            <thead>
              <tr>
                <th>编号</th>
                <th>中心名称</th>
                <th>类型</th>
                <th>提供商</th>
                <th>所在区</th>
                <th>主要芯片</th>
                <th>总卡数</th>
                <th>峰值算力</th>
                <th>利用率</th>
                <th>PUE</th>
                <th>绿色能源</th>
                <th>价格</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {computeCenters.map((c) => {
                const t = COMPUTE_CENTER_TYPES.find((x) => x.code === c.type);
                const dis = DISTRICTS.find((d) => d.code === c.districtCode);
                const mainChip = c.chips[0];
                const chip = CHIPS.find((x) => x.code === mainChip.code);
                const utilColor = c.utilization > 0.85 ? "#dc2626" : c.utilization > 0.7 ? "#ea580c" : c.utilization > 0.5 ? "#2563eb" : "#10b981";
                return (
                  <tr key={c.id}>
                    <td className="font-mono text-xs text-slate-500">{c.id}</td>
                    <td className="font-medium text-slate-800">{c.name}</td>
                    <td><Tag color={c.type === "INTEL" ? "cyan" : c.type === "SUPER" ? "purple" : "green"}>{t?.name}</Tag></td>
                    <td className="text-sm text-slate-600">{c.vendor}</td>
                    <td className="text-sm text-slate-600">{dis?.name}</td>
                    <td>
                      <div className="text-sm text-slate-800">{chip?.name}</div>
                      <div className="text-[10px] text-slate-400">{formatNumber(mainChip.count)} 卡 {c.chips.length > 1 && `+ ${c.chips.length - 1} 类`}</div>
                    </td>
                    <td className="digital text-slate-800 font-medium">{formatNumber(c.totalCards)}</td>
                    <td className="digital text-slate-700">{(c.totalTflops / 1000).toFixed(1)} PF</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-14 progress-bar"><div className="progress-bar-fill" style={{ width: `${c.utilization * 100}%`, background: utilColor }} /></div>
                        <span className="digital text-xs text-slate-700 font-medium w-10">{(c.utilization * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="digital text-slate-600">{c.pue}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <Leaf className="w-3 h-3 text-emerald-500" />
                        <span className="digital text-xs text-emerald-700">{formatPercent(c.greenRatio, 0)}</span>
                      </div>
                    </td>
                    <td className="digital text-slate-600">¥ {c.priceUnit}/卡时</td>
                    <td>
                      <Tag color={c.status === "ONLINE" ? "green" : c.status === "DEGRADED" ? "amber" : "red"} dot>
                        {c.status === "ONLINE" ? "在线" : c.status === "DEGRADED" ? "降级" : c.status === "MAINTENANCE" ? "维护中" : "离线"}
                      </Tag>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 调度日志 */}
      <div className="gov-card">
        <div className="gov-card-header flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">智能调度日志</h2>
            <p className="text-xs text-slate-500 mt-0.5">近 72 小时跨中心调度记录 · 总 {scheduleLogs.length} 条</p>
          </div>
          <button className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
            完整日志 <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="gov-table">
            <thead>
              <tr>
                <th>时间</th>
                <th>任务编号</th>
                <th>企业</th>
                <th>场景</th>
                <th>需求 / 分配</th>
                <th>芯片偏好</th>
                <th>路由</th>
                <th>调度依据</th>
                <th>时长</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {scheduleLogs.slice(0, 16).map((l) => (
                <tr key={l.id}>
                  <td className="text-xs text-slate-500">{relativeTime(l.ts)}</td>
                  <td className="font-mono text-xs">{l.taskCode}</td>
                  <td className="font-medium text-slate-800 max-w-[180px] truncate">{l.enterpriseName}</td>
                  <td className="text-sm text-slate-600">{l.scenario}</td>
                  <td className="digital">{l.cardsRequested} → <span className={l.routed ? "text-emerald-700 font-medium" : "text-amber-700 font-medium"}>{l.cardsAllocated}</span></td>
                  <td className="text-xs"><Tag color="slate">{l.chipPref.toUpperCase()}</Tag></td>
                  <td className="text-sm">
                    {l.routed ? <Tag color="green">本地</Tag> : <Tag color="purple">跨中心</Tag>}
                    <span className="ml-1 text-xs text-slate-500">{l.fromCenter}</span>
                  </td>
                  <td className="text-xs text-slate-600">{l.reason}</td>
                  <td className="digital text-xs">{l.durationMin} 分</td>
                  <td>
                    <Tag color={l.status === "DONE" ? "green" : l.status === "RUNNING" ? "blue" : l.status === "FAILED" ? "red" : l.status === "PREEMPTED" ? "amber" : "slate"} dot>
                      {l.status === "DONE" ? "已完成" : l.status === "RUNNING" ? "运行中" : l.status === "QUEUED" ? "排队中" : l.status === "PREEMPTED" ? "已抢占" : "失败"}
                    </Tag>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
