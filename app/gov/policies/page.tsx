import { getStore } from "@/lib/data/store";
import { INDUSTRIES, POLICY_TAGS } from "@/lib/constants";
import { formatNumber, formatCurrency, formatDate, relativeTime } from "@/lib/utils";
import { Tag } from "@/components/ui/Tag";
import { KpiCard } from "@/components/ui/KpiCard";
import { FileText, Plus, Filter, Search, Eye, ChevronRight, Calendar } from "lucide-react";

export default function GovPoliciesPage() {
  const s = getStore();
  const { policies } = s;
  const active = policies.filter((p) => p.status === "ACTIVE").length;
  const totalViews = policies.reduce((s, p) => s + p.views, 0);
  const totalBudget = policies.reduce((s, p) => s + p.budget, 0);
  const linkedBatches = policies.filter((p) => p.voucherBatch).length;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">政策中心</h1>
          <p className="text-sm text-slate-500 mt-1">发布 · 解读 · 配套预算 · 券批次联动</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary"><Filter className="w-4 h-4" />筛选</button>
          <button className="btn-primary"><Plus className="w-4 h-4" />新建政策</button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="生效政策" value={String(active)} unit={`/ ${policies.length}`} icon={<FileText className="w-4 h-4" />} accent="#2563eb" />
        <KpiCard label="累计阅读量" value={formatNumber(totalViews)} icon={<Eye className="w-4 h-4" />} accent="#0891b2" />
        <KpiCard label="配套预算" value={formatCurrency(totalBudget)} accent="#7e22ce" />
        <KpiCard label="联动券批次" value={String(linkedBatches)} unit="批" accent="#047857" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 最新政策 */}
        <div className="lg:col-span-2 gov-card">
          <div className="gov-card-header flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">最新政策</h2>
              <p className="text-xs text-slate-500 mt-0.5">支持产业链方向 · 重点企业精准滴灌</p>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input type="text" placeholder="政策标题 / 编号" className="pl-8 pr-3 py-1.5 text-sm bg-slate-100 rounded w-[220px] focus:outline-none focus:bg-white" />
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {policies.slice(0, 12).map((p) => (
              <div key={p.id} className="px-5 py-4 hover:bg-slate-50/50">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center flex-shrink-0 text-xs font-medium">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Tag color={p.level === "市" ? "blue" : p.level === "国家" ? "red" : "purple"}>{p.level}级</Tag>
                      <Tag color="slate">{p.category}</Tag>
                      <Tag color={p.status === "ACTIVE" ? "green" : "slate"} dot>
                        {p.status === "ACTIVE" ? "生效中" : "已过期"}
                      </Tag>
                    </div>
                    <div className="text-base font-semibold text-slate-900 leading-snug">{p.title}</div>
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                      <span className="font-mono">{p.code}</span>
                      <span>· {p.issuer}</span>
                      <span>· {formatDate(p.publishedAt)}</span>
                      <span>· <Eye className="w-3 h-3 inline mr-0.5" />{formatNumber(p.views)}</span>
                    </div>
                    <p className="text-sm text-slate-600 mt-2 leading-relaxed line-clamp-2">{p.summary}</p>
                    <div className="mt-2 flex items-center gap-1 flex-wrap">
                      {p.tags.map((t) => (
                        <Tag key={t} color="cyan">{t}</Tag>
                      ))}
                      <span className="ml-auto text-xs text-slate-500 flex items-center gap-1">
                        预算 <span className="digital text-slate-800 font-medium">{formatCurrency(p.budget)}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="gov-card">
            <div className="gov-card-header"><h2 className="font-semibold text-slate-900">行业受惠分布</h2></div>
            <div className="px-5 py-3">
              {INDUSTRIES.map((ind) => {
                const cnt = policies.filter((p) => p.industryTargets.includes(ind.code)).length;
                const max = INDUSTRIES.length;
                return (
                  <div key={ind.code} className="flex items-center gap-2 py-1.5">
                    <span className="w-2 h-2 rounded-sm" style={{ background: ind.color }} />
                    <span className="text-sm text-slate-700 flex-1">{ind.name}</span>
                    <div className="w-20 progress-bar"><div className="progress-bar-fill" style={{ width: `${(cnt / Math.max(1, policies.length / 2)) * 100}%`, background: ind.color }} /></div>
                    <span className="text-sm digital text-slate-700 font-medium w-7 text-right">{cnt}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="gov-card">
            <div className="gov-card-header"><h2 className="font-semibold text-slate-900">热门政策标签</h2></div>
            <div className="px-5 py-3 flex flex-wrap gap-2">
              {POLICY_TAGS.map((t, i) => (
                <Tag key={t} color={["blue", "purple", "cyan", "green", "amber", "red"][i % 6] as any}>
                  {t}
                  <span className="ml-1 digital opacity-70">{Math.floor(Math.random() * 20 + 3)}</span>
                </Tag>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
