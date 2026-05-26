import { getStore } from "@/lib/data/store";
import { INDUSTRIES } from "@/lib/constants";
import { formatNumber, formatCurrency, relativeTime } from "@/lib/utils";
import { Tag } from "@/components/ui/Tag";
import { KpiCard } from "@/components/ui/KpiCard";
import { HeartHandshake, Sparkles, MessageSquare, Users, CheckCircle2 } from "lucide-react";

export default function MatchPage() {
  const s = getStore();
  const open = s.matches.filter((m) => m.status === "OPEN");
  const matched = s.matches.filter((m) => m.status === "MATCHED");

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">需求撮合中心</h1>
        <p className="text-sm text-slate-500 mt-1">企业需求 ↔ 服务商精准撮合 · AI 智能匹配</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="撮合中" value={String(open.length)} unit="条" icon={<HeartHandshake className="w-4 h-4" />} accent="#0891b2" />
        <KpiCard label="本月成交" value={String(matched.length)} unit="条" icon={<CheckCircle2 className="w-4 h-4" />} accent="#047857" />
        <KpiCard label="平均撮合时长" value="3.6" unit="天" accent="#7e22ce" />
        <KpiCard label="成功率" value="68.4%" accent="#ea580c" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="gov-card">
          <div className="gov-card-header flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">撮合中需求</h2>
            <button className="text-xs text-purple-600 hover:underline flex items-center gap-1"><Sparkles className="w-3 h-3" />AI 智能匹配</button>
          </div>
          <div className="divide-y divide-slate-100">
            {open.slice(0, 10).map((m) => {
              const ind = INDUSTRIES.find((x) => x.code === m.industryCode);
              return (
                <div key={m.id} className="px-5 py-3 hover:bg-slate-50/50">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                      <HeartHandshake className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Tag color="green" dot>OPEN</Tag>
                        <Tag color="blue"><span style={{ color: ind?.color }}>●</span><span className="ml-1">{ind?.name}</span></Tag>
                        <span className="text-xs text-slate-500 ml-auto">{relativeTime(m.postedAt)}</span>
                      </div>
                      <div className="font-medium text-slate-800 text-sm truncate">{m.title}</div>
                      <div className="text-xs text-slate-500 mt-1">{m.enterpriseName} · 预算 {formatCurrency(m.budget)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs digital text-slate-700 font-medium">{m.offers}</div>
                      <div className="text-[10px] text-slate-500">家响应</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="gov-card">
          <div className="gov-card-header"><h2 className="font-semibold text-slate-900">推荐服务商（按需求方向）</h2></div>
          <div className="px-5 py-3 space-y-3">
            {["智云科技", "九州 AI", "蓝海智能", "百川数智", "中科云脑", "海创智链"].map((v, i) => (
              <div key={v} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded">
                <div className="w-9 h-9 rounded bg-gradient-to-br from-purple-500 to-pink-600 text-white flex items-center justify-center text-xs font-semibold">{v.slice(0, 2)}</div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-800">{v}</div>
                  <div className="text-[10px] text-slate-500">擅长：智能制造 / 工业 AI · 服务过 {200 + i * 30} 家</div>
                </div>
                <div className="text-right">
                  <div className="text-xs digital font-medium text-emerald-700">{96 - i}% 匹配</div>
                  <button className="text-[10px] text-blue-600 hover:underline">推送对接</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
