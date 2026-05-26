import { getStore } from "@/lib/data/store";
import { getDemoEnterprise } from "@/lib/data/personas";
import { INDUSTRIES } from "@/lib/constants";
import { formatNumber, formatCurrency, relativeTime } from "@/lib/utils";
import { Tag } from "@/components/ui/Tag";
import { HeartHandshake, Plus, MessageSquare, Users, Send } from "lucide-react";

export default function MatchingPage() {
  const s = getStore();
  const me = getDemoEnterprise();
  const open = s.matches.filter((m) => m.status === "OPEN" && m.industryCode === me.industryCode);
  const mine = s.matches.filter((m) => m.enterpriseId === me.id);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">需求撮合</h1>
          <p className="text-sm text-slate-500 mt-1">发布 AI 需求 → 平台智能匹配 → 服务商响应 → 在线沟通</p>
        </div>
        <button className="btn-primary"><Plus className="w-4 h-4" />发布新需求</button>
      </div>

      {/* 发布表单 */}
      <div className="gov-card">
        <div className="gov-card-header"><h2 className="font-semibold text-slate-900">快速发布需求</h2></div>
        <div className="gov-card-body space-y-3">
          <input type="text" placeholder="需求标题，例如：寻找工业 AI 质检解决方案" className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:border-blue-400" />
          <textarea placeholder="详细描述（业务背景、希望达到的效果、可用资源……）" className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:border-blue-400" rows={3} />
          <div className="grid grid-cols-3 gap-3">
            <select className="px-3 py-2 border border-slate-200 rounded text-sm bg-white focus:outline-none focus:border-blue-400">
              <option>预算范围：5-20 万</option>
              <option>预算范围：20-50 万</option>
              <option>预算范围：50-200 万</option>
            </select>
            <select className="px-3 py-2 border border-slate-200 rounded text-sm bg-white focus:outline-none focus:border-blue-400">
              <option>启动时间：2 周内</option>
              <option>启动时间：1 个月内</option>
              <option>启动时间：可协商</option>
            </select>
            <select className="px-3 py-2 border border-slate-200 rounded text-sm bg-white focus:outline-none focus:border-blue-400">
              <option>可用：Token 券 + 算力券</option>
              <option>可用：仅 Token 券</option>
              <option>不使用券，全自费</option>
            </select>
          </div>
          <div className="flex items-center gap-2 justify-end pt-2 border-t border-slate-100">
            <button className="btn-secondary">保存草稿</button>
            <button className="btn-primary"><Send className="w-4 h-4" />发布需求</button>
          </div>
        </div>
      </div>

      {/* 我的需求 */}
      <div className="gov-card">
        <div className="gov-card-header"><h2 className="font-semibold text-slate-900">我发布的需求 ({mine.length})</h2></div>
        <div className="divide-y divide-slate-100">
          {mine.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-slate-500">暂未发布过需求 · 试试上方表单</div>
          ) : (
            mine.map((m) => (
              <div key={m.id} className="px-5 py-3.5 hover:bg-slate-50/50">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                    <HeartHandshake className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Tag color={m.status === "OPEN" ? "blue" : m.status === "MATCHED" ? "green" : "slate"} dot>
                        {m.status === "OPEN" ? "进行中" : m.status === "MATCHED" ? "已匹配" : "已关闭"}
                      </Tag>
                      <span className="text-xs text-slate-500">{relativeTime(m.postedAt)}</span>
                    </div>
                    <div className="font-medium text-slate-800">{m.title}</div>
                    <div className="text-xs text-slate-500 mt-1">{m.description}</div>
                    <div className="flex items-center gap-3 mt-2 text-xs">
                      <span className="text-slate-500">预算 <span className="digital text-slate-800 font-medium">{formatCurrency(m.budget)}</span></span>
                      <span className="text-slate-500"><Users className="w-3 h-3 inline mr-0.5" />{m.offers} 家响应</span>
                      <button className="ml-auto text-blue-600 hover:underline flex items-center gap-1"><MessageSquare className="w-3 h-3" />沟通中</button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 同行业进行中需求 */}
      <div className="gov-card">
        <div className="gov-card-header">
          <h2 className="font-semibold text-slate-900">同行业进行中的需求</h2>
          <p className="text-xs text-slate-500 mt-0.5">{INDUSTRIES.find((i) => i.code === me.industryCode)?.name}行业 · {open.length} 条</p>
        </div>
        <div className="divide-y divide-slate-100">
          {open.slice(0, 6).map((m) => (
            <div key={m.id} className="px-5 py-3 flex items-center gap-3">
              <Tag color="green" dot>OPEN</Tag>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-slate-800 truncate">{m.title}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{m.enterpriseName} · {relativeTime(m.postedAt)} · 预算 {formatCurrency(m.budget)}</div>
              </div>
              <span className="text-xs text-slate-500">{m.offers} 家响应</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
