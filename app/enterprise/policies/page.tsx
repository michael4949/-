import { getStore } from "@/lib/data/store";
import { getDemoEnterprise } from "@/lib/data/personas";
import { INDUSTRIES } from "@/lib/constants";
import { formatNumber, formatCurrency, formatDate, relativeTime } from "@/lib/utils";
import { Tag } from "@/components/ui/Tag";
import { FileText, Search, Eye, Sparkles, BadgeCheck } from "lucide-react";

export default function MyPoliciesPage() {
  const s = getStore();
  const me = getDemoEnterprise();
  const matching = s.policies.filter((p) => p.industryTargets.includes(me.industryCode));
  const others = s.policies.filter((p) => !p.industryTargets.includes(me.industryCode)).slice(0, 6);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">为您匹配的政策</h1>
          <p className="text-sm text-slate-500 mt-1">基于您的行业、规模、资质智能匹配 · 共 {matching.length} 条精准命中</p>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input type="text" placeholder="搜索政策" className="pl-8 pr-3 py-1.5 text-sm bg-slate-100 rounded w-[260px] focus:outline-none focus:bg-white" />
        </div>
      </div>

      {/* 推荐匹配 */}
      <div className="bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-200/60 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-cyan-600" />
          <span className="font-medium text-cyan-900">AI 精准匹配</span>
          <Tag color="cyan"><BadgeCheck className="w-3 h-3 mr-0.5" />高匹配</Tag>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {matching.slice(0, 4).map((p) => (
            <div key={p.id} className="bg-white rounded p-4 border border-cyan-200/50 hover:shadow-md transition-all">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded bg-cyan-100 text-cyan-600 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Tag color="blue">{p.level}级</Tag>
                    <Tag color="green" dot>生效中</Tag>
                    <Tag color="amber">匹配度 {85 + Math.floor(Math.random() * 14)}%</Tag>
                  </div>
                  <div className="font-medium text-slate-900">{p.title}</div>
                  <div className="text-xs text-slate-500 mt-1">{p.issuer} · 预算 {formatCurrency(p.budget)}</div>
                  <div className="text-sm text-slate-600 mt-2 leading-relaxed line-clamp-2">{p.summary}</div>
                  <div className="flex items-center gap-2 mt-3">
                    {p.tags.slice(0, 3).map((t) => <Tag key={t} color="purple">{t}</Tag>)}
                    <button className="ml-auto text-xs text-cyan-700 hover:underline font-medium">立即申请券</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 其它政策 */}
      <div className="gov-card">
        <div className="gov-card-header"><h2 className="font-semibold text-slate-900">其它相关政策</h2></div>
        <div className="divide-y divide-slate-100">
          {others.map((p) => (
            <div key={p.id} className="px-5 py-3.5 hover:bg-slate-50/50 flex items-start gap-3">
              <FileText className="w-4 h-4 text-slate-400 mt-1 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Tag color="slate">{p.level}级</Tag>
                  <Tag color="slate">{p.category}</Tag>
                </div>
                <div className="text-sm font-medium text-slate-800 mt-1">{p.title}</div>
                <div className="text-xs text-slate-500 mt-0.5">{p.issuer} · {formatDate(p.publishedAt)} · <Eye className="w-3 h-3 inline" /> {formatNumber(p.views)}</div>
              </div>
              <button className="text-xs text-blue-600 hover:underline">查看</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
