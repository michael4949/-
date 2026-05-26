import { getStore } from "@/lib/data/store";
import { getDemoEnterprise } from "@/lib/data/personas";
import { INDUSTRIES, APP_SCENARIOS } from "@/lib/constants";
import { formatNumber } from "@/lib/utils";
import { Tag } from "@/components/ui/Tag";
import { Star, Search, Download, ShoppingCart } from "lucide-react";

export default function MarketPage() {
  const s = getStore();
  const me = getDemoEnterprise();
  const myApps = s.apps.filter((a) => a.status === "LIVE");
  const matching = s.apps.filter((a) => a.industries.includes(me.industryCode) && a.status === "LIVE");

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">应用市场</h1>
          <p className="text-sm text-slate-500 mt-1">{myApps.length} 款上架应用 · {matching.length} 款匹配您的行业</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input type="text" placeholder="搜索应用..." className="pl-8 pr-3 py-1.5 text-sm bg-slate-100 rounded w-[260px] focus:outline-none focus:bg-white" />
          </div>
        </div>
      </div>

      {/* 分类筛选 */}
      <div className="gov-card">
        <div className="px-5 py-3 flex flex-wrap items-center gap-2 border-b border-slate-100">
          <span className="text-xs text-slate-500 font-medium mr-2">应用场景：</span>
          <button className="px-3 py-1 rounded bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200 text-xs font-medium">全部</button>
          {APP_SCENARIOS.map((sc) => (
            <button key={sc.code} className="px-3 py-1 rounded text-xs text-slate-600 hover:bg-slate-50">{sc.name}</button>
          ))}
        </div>
        <div className="px-5 py-3 flex flex-wrap items-center gap-2 border-b border-slate-100">
          <span className="text-xs text-slate-500 font-medium mr-2">付费方式：</span>
          <button className="px-3 py-1 rounded text-xs text-slate-600 hover:bg-slate-50">全部</button>
          <button className="px-3 py-1 rounded text-xs text-slate-600 hover:bg-slate-50">免费</button>
          <button className="px-3 py-1 rounded text-xs text-slate-600 hover:bg-slate-50">支持券抵扣</button>
          <button className="px-3 py-1 rounded text-xs text-slate-600 hover:bg-slate-50">试用</button>
          <button className="px-3 py-1 rounded text-xs text-slate-600 hover:bg-slate-50">付费</button>
        </div>
      </div>

      {/* 推荐 */}
      <div>
        <div className="text-sm text-slate-700 font-medium mb-3">⭐ 为您的行业推荐</div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {matching.slice(0, 4).map((app) => (
            <AppCard key={app.id} app={app} highlight />
          ))}
        </div>
      </div>

      {/* 全部 */}
      <div>
        <div className="text-sm text-slate-700 font-medium mb-3">全部应用</div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {myApps.slice(0, 24).map((app) => (
            <AppCard key={app.id} app={app} />
          ))}
        </div>
      </div>
    </div>
  );
}

function AppCard({ app, highlight }: { app: any; highlight?: boolean }) {
  return (
    <div className={`bg-white rounded-lg border ${highlight ? "border-amber-300 ring-1 ring-amber-200/50" : "border-slate-200"} hover:shadow-lg transition-all p-4 group cursor-pointer`}>
      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-semibold text-lg flex-shrink-0" style={{ background: app.cover }}>
          {app.name.slice(0, 1)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-slate-800 truncate">{app.name}</div>
          <div className="text-[10px] text-slate-500">{app.vendor}</div>
          <div className="flex items-center gap-0.5 mt-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={`w-2.5 h-2.5 ${i < Math.floor(app.rating) ? "text-amber-500 fill-amber-500" : "text-slate-200 fill-slate-200"}`} />
            ))}
            <span className="text-[10px] text-slate-500 ml-1 digital">{app.rating}</span>
            <span className="text-[10px] text-slate-400 ml-1">({formatNumber(app.reviews)})</span>
          </div>
        </div>
      </div>
      <div className="text-xs text-slate-600 leading-relaxed truncate-2 mb-3 min-h-[2.5rem]">{app.description}</div>
      <div className="flex items-center gap-1 mb-3 flex-wrap">
        {app.tags.slice(0, 3).map((t: string) => (
          <Tag key={t} color="slate">{t}</Tag>
        ))}
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <div className="flex items-center gap-1 text-[10px] text-slate-500">
          <Download className="w-3 h-3" />
          {formatNumber(app.installs)}
        </div>
        <Tag color={app.priceType === "FREE" ? "green" : app.priceType === "VOUCHER" ? "purple" : app.priceType === "TRIAL" ? "amber" : "blue"}>
          {app.priceType === "FREE" ? "免费" : app.priceType === "VOUCHER" ? "支持券抵扣" : app.priceType === "TRIAL" ? "可试用" : `¥${app.price}/月`}
        </Tag>
        <button className="text-cyan-600 text-xs hover:underline flex items-center gap-1 font-medium">
          <ShoppingCart className="w-3 h-3" />
          安装
        </button>
      </div>
    </div>
  );
}
