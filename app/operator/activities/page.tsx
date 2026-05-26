import { Tag } from "@/components/ui/Tag";
import { KpiCard } from "@/components/ui/KpiCard";
import { Megaphone, Plus, Eye, Users, TrendingUp, Calendar } from "lucide-react";

const activities = [
  { name: "5 月：AI 进园区计划", status: "进行中", color: "blue", desc: "覆盖滨海开发区、高新区等 8 个产业园，组织 32 场企业对接会", views: 86200, signup: 1238, roi: "1:7.8", deadline: "2026-05-31" },
  { name: "工业大模型应用大赛", status: "进行中", color: "purple", desc: "36 支队伍报名，奖金池 200 万元，5 个赛道齐头并进", views: 124800, signup: 432, roi: "1:12.3", deadline: "2026-06-18" },
  { name: "中小企业 AI 普惠月", status: "筹备", color: "amber", desc: "6 月启动，与本市数据局联合，重点扶持微型企业", views: 12800, signup: 0, roi: "—", deadline: "2026-06-01" },
  { name: "DeepSeek 模型实战训练营", status: "已结束", color: "slate", desc: "为期 3 天的深度培训，156 人完成认证", views: 28400, signup: 156, roi: "1:5.2", deadline: "2026-04-22" },
  { name: "AI 政企对话日", status: "进行中", color: "green", desc: "市委市政府联合招商，邀请头部模型厂商座谈", views: 8200, signup: 24, roi: "战略合作", deadline: "2026-05-30" },
  { name: "智能制造 AI 论坛", status: "筹备", color: "amber", desc: "邀请 50 家制造业代表 + 15 家服务商", views: 6800, signup: 28, roi: "—", deadline: "2026-06-15" },
];

export default function ActivitiesPage() {
  return (
    <div className="p-6 space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">运营活动</h1>
          <p className="text-sm text-slate-500 mt-1">城市级 AI 推广活动 · 政企联动 · 拉新促活</p>
        </div>
        <button className="btn-primary"><Plus className="w-4 h-4" />创建新活动</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="进行中活动" value="3" icon={<Megaphone className="w-4 h-4" />} accent="#0891b2" />
        <KpiCard label="本月触达" value="266K" icon={<Eye className="w-4 h-4" />} accent="#7e22ce" />
        <KpiCard label="本月报名" value="1850" icon={<Users className="w-4 h-4" />} accent="#047857" />
        <KpiCard label="平均 ROI" value="1:8.4" icon={<TrendingUp className="w-4 h-4" />} accent="#ea580c" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {activities.map((a) => (
          <div key={a.name} className="gov-card">
            <div className="p-5">
              <div className="flex items-start gap-3 mb-3">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-white bg-gradient-to-br ${a.color === "blue" ? "from-blue-500 to-cyan-500" : a.color === "purple" ? "from-purple-500 to-pink-500" : a.color === "amber" ? "from-amber-500 to-orange-500" : a.color === "green" ? "from-emerald-500 to-teal-500" : "from-slate-400 to-slate-500"}`}>
                  <Megaphone className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Tag color={a.color as any} dot>{a.status}</Tag>
                  </div>
                  <h3 className="font-semibold text-slate-900">{a.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{a.desc}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-center">
                <div>
                  <div className="text-[10px] text-slate-500 flex items-center justify-center gap-0.5"><Eye className="w-3 h-3" />曝光</div>
                  <div className="text-sm font-semibold digital mt-0.5">{a.views.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 flex items-center justify-center gap-0.5"><Users className="w-3 h-3" />报名</div>
                  <div className="text-sm font-semibold digital mt-0.5">{a.signup.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 flex items-center justify-center gap-0.5"><TrendingUp className="w-3 h-3" />ROI</div>
                  <div className="text-sm font-semibold digital mt-0.5 text-emerald-700">{a.roi}</div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-xs">
                <span className="text-slate-500 flex items-center gap-1"><Calendar className="w-3 h-3" />{a.deadline}</span>
                <button className="text-blue-600 hover:underline font-medium">运营详情</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
