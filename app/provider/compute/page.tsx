import { getStore } from "@/lib/data/store";
import { getDemoProvider } from "@/lib/data/personas";
import { COMPUTE_CENTER_TYPES, CHIPS, DISTRICTS } from "@/lib/constants";
import { formatNumber, formatPercent, formatCurrency } from "@/lib/utils";
import { Tag } from "@/components/ui/Tag";
import { KpiCard } from "@/components/ui/KpiCard";
import { ServerCog, Cpu, Zap, Leaf, Power, Plus } from "lucide-react";

export default function ProviderComputePage() {
  const s = getStore();
  const provider = getDemoProvider();
  // 虚构：让此 provider 持有部分中心
  const myCenters = s.computeCenters.filter((_, i) => i % 6 === 1).slice(0, 3);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">算力资源</h1>
          <p className="text-sm text-slate-500 mt-1">作为算力提供商，您接入平台的算力中心 {myCenters.length} 个</p>
        </div>
        <button className="btn-primary"><Plus className="w-4 h-4" />接入新中心</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="算力中心" value={String(myCenters.length)} icon={<ServerCog className="w-4 h-4" />} accent="#7e22ce" />
        <KpiCard label="总卡数" value={formatNumber(myCenters.reduce((s, c) => s + c.totalCards, 0))} icon={<Cpu className="w-4 h-4" />} accent="#0891b2" />
        <KpiCard label="峰值算力" value={(myCenters.reduce((s, c) => s + c.totalTflops, 0) / 1000).toFixed(1)} unit="PF" accent="#dc2626" />
        <KpiCard label="平均利用率" value={formatPercent(myCenters.reduce((s, c) => s + c.utilization, 0) / myCenters.length)} accent="#047857" />
        <KpiCard label="本月营收" value={formatCurrency(myCenters.reduce((s, c) => s + c.totalCards * c.utilization * 24 * 30 * c.priceUnit, 0))} accent="#ea580c" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {myCenters.map((c) => {
          const ccType = COMPUTE_CENTER_TYPES.find((x) => x.code === c.type);
          const dis = DISTRICTS.find((x) => x.code === c.districtCode);
          return (
            <div key={c.id} className="gov-card">
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Tag color={c.type === "INTEL" ? "cyan" : c.type === "SUPER" ? "purple" : "green"}>{ccType?.name}</Tag>
                      <Tag color={c.status === "ONLINE" ? "green" : "amber"} dot>{c.status === "ONLINE" ? "在线" : c.status}</Tag>
                    </div>
                    <div className="font-medium text-slate-900">{c.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{dis?.name} · {c.address.slice(c.address.indexOf("路"))}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-slate-50 rounded p-2">
                    <div className="text-[10px] text-slate-500">总卡数</div>
                    <div className="text-sm font-medium digital">{formatNumber(c.totalCards)}</div>
                  </div>
                  <div className="bg-slate-50 rounded p-2">
                    <div className="text-[10px] text-slate-500">峰值</div>
                    <div className="text-sm font-medium digital">{(c.totalTflops / 1000).toFixed(1)} PF</div>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-500">实时利用率</span>
                    <span className="digital font-medium text-slate-800">{formatPercent(c.utilization)}</span>
                  </div>
                  <div className="progress-bar"><div className="progress-bar-fill" style={{ width: `${c.utilization * 100}%`, background: c.utilization > 0.85 ? "#dc2626" : "#7e22ce" }} /></div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div className="flex items-center gap-1.5 text-slate-600"><Power className="w-3 h-3 text-amber-500" />PUE {c.pue}</div>
                  <div className="flex items-center gap-1.5 text-slate-600"><Leaf className="w-3 h-3 text-emerald-500" />绿电 {formatPercent(c.greenRatio, 0)}</div>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-1">
                  <div className="text-[10px] text-slate-500 mb-1">芯片构成</div>
                  {c.chips.map((ch) => {
                    const chip = CHIPS.find((x) => x.code === ch.code);
                    return (
                      <div key={ch.code} className="flex items-center justify-between text-xs">
                        <span className="text-slate-700">{chip?.name} {chip?.isDomestic && <Tag color="amber">国产</Tag>}</span>
                        <span className="digital text-slate-600">{formatNumber(ch.count)} 卡</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
