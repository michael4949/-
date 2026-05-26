import { getStore } from "@/lib/data/store";
import { formatNumber } from "@/lib/utils";
import { Tag } from "@/components/ui/Tag";
import { KpiCard } from "@/components/ui/KpiCard";
import { Plus, Edit3, BarChart3, Star, Store, Download } from "lucide-react";

export default function ProviderAppsPage() {
  const s = getStore();
  // 虚构：让此服务商有几个上架的应用
  const myApps = s.apps.slice(0, 6);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">我的应用</h1>
          <p className="text-sm text-slate-500 mt-1">在应用市场上架的 {myApps.length} 款解决方案</p>
        </div>
        <button className="btn-primary"><Plus className="w-4 h-4" />上架新应用</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="已上架" value={String(myApps.filter((a) => a.status === "LIVE").length)} unit={`/${myApps.length}`} icon={<Store className="w-4 h-4" />} accent="#7e22ce" />
        <KpiCard label="累计安装" value={formatNumber(myApps.reduce((s, a) => s + a.installs, 0))} icon={<Download className="w-4 h-4" />} accent="#0891b2" />
        <KpiCard label="累计评价" value={formatNumber(myApps.reduce((s, a) => s + a.reviews, 0))} icon={<Star className="w-4 h-4" />} accent="#ea580c" />
        <KpiCard label="平均评分" value={(myApps.reduce((s, a) => s + a.rating, 0) / myApps.length).toFixed(2)} accent="#dc2626" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {myApps.map((app) => (
          <div key={app.id} className="gov-card">
            <div className="p-5">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 rounded flex items-center justify-center text-white font-semibold" style={{ background: app.cover }}>
                  {app.name.slice(0, 1)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-800">{app.name}</div>
                  <div className="text-[10px] text-slate-500">{app.category}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <Tag color={app.status === "LIVE" ? "green" : app.status === "PENDING" ? "amber" : "slate"} dot>
                      {app.status === "LIVE" ? "上架" : app.status === "PENDING" ? "审核中" : "草稿"}
                    </Tag>
                    <Tag color="purple">{app.priceType === "FREE" ? "免费" : app.priceType === "VOUCHER" ? "可用券" : app.priceType === "TRIAL" ? "试用" : "付费"}</Tag>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="text-center bg-slate-50 rounded p-2">
                  <div className="text-[10px] text-slate-500">安装</div>
                  <div className="text-sm font-medium digital">{formatNumber(app.installs)}</div>
                </div>
                <div className="text-center bg-slate-50 rounded p-2">
                  <div className="text-[10px] text-slate-500">评价</div>
                  <div className="text-sm font-medium digital">{formatNumber(app.reviews)}</div>
                </div>
                <div className="text-center bg-slate-50 rounded p-2">
                  <div className="text-[10px] text-slate-500">评分</div>
                  <div className="text-sm font-medium digital flex items-center justify-center gap-0.5">
                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    {app.rating}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 pt-3 border-t border-slate-100">
                <button className="flex-1 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-sm rounded flex items-center justify-center gap-1">
                  <BarChart3 className="w-3 h-3" />数据
                </button>
                <button className="flex-1 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-sm rounded flex items-center justify-center gap-1">
                  <Edit3 className="w-3 h-3" />编辑
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
