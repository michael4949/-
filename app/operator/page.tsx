import { getStore } from "@/lib/data/store";
import { getDemoOperator } from "@/lib/data/personas";
import { formatNumber, formatCurrency, relativeTime } from "@/lib/utils";
import { Tag } from "@/components/ui/Tag";
import { KpiCard } from "@/components/ui/KpiCard";
import { GovLine } from "@/components/charts/GovLine";
import Link from "next/link";
import { ClipboardCheck, HeartHandshake, AlertTriangle, Activity, Sparkles, ChevronRight, Cpu, Store, Megaphone } from "lucide-react";

export default function OperatorHomePage() {
  const s = getStore();
  const op = getDemoOperator();

  const pending = s.voucherApps.filter((a) => a.status === "PENDING");
  const openMatches = s.matches.filter((m) => m.status === "OPEN");
  const unacked = s.alerts.filter((a) => !a.acked);

  const operationStats = s.cityDaily.slice(-30).map((p) => ({
    date: p.date.slice(5),
    enterprises: p.active,
    applications: Math.floor(Math.random() * 30 + 25),
  }));

  return (
    <div className="p-6 space-y-5">
      <div className="bg-gradient-to-br from-emerald-700 via-teal-700 to-cyan-800 rounded-xl p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="relative">
          <div className="flex items-center gap-3 text-sm text-emerald-100/80 mb-2">
            <Sparkles className="w-4 h-4" />
            <span>欢迎，{op.name}（{op.role}）</span>
          </div>
          <h1 className="text-2xl font-semibold">{op.team} · 运营工作台</h1>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <Tag color="green">本日待处理 {pending.length + openMatches.length + unacked.length} 项</Tag>
            <Tag color="green">本月新入驻 {Math.floor(s.enterprises.length * 0.08)} 家</Tag>
            <Tag color="green">服务工单完成率 96.4%</Tag>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="待审申请" value={String(pending.length)} unit="件" icon={<ClipboardCheck className="w-4 h-4" />} accent="#ea580c" />
        <KpiCard label="撮合中需求" value={String(openMatches.length)} unit="条" icon={<HeartHandshake className="w-4 h-4" />} accent="#0891b2" />
        <KpiCard label="待处理告警" value={String(unacked.length)} unit="条" icon={<AlertTriangle className="w-4 h-4" />} accent="#dc2626" />
        <KpiCard label="本月活动" value="4" unit="场" icon={<Megaphone className="w-4 h-4" />} accent="#047857" />
      </div>

      {/* 快捷入口 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link href="/operator/audit" className="bg-white rounded-lg border border-slate-200 p-4 hover:border-emerald-300 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-2">
            <ClipboardCheck className="w-5 h-5 text-emerald-600" />
            <Tag color="red">{pending.length}</Tag>
          </div>
          <div className="text-sm font-medium text-slate-800">券申请审核</div>
          <div className="text-xs text-slate-500 mt-1">协助审批通道</div>
        </Link>
        <Link href="/operator/model-review" className="bg-white rounded-lg border border-slate-200 p-4 hover:border-emerald-300 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-2">
            <Cpu className="w-5 h-5 text-purple-600" />
            <Tag color="amber">3</Tag>
          </div>
          <div className="text-sm font-medium text-slate-800">模型上架审核</div>
          <div className="text-xs text-slate-500 mt-1">合规 / 安全 / 性能</div>
        </Link>
        <Link href="/operator/app-review" className="bg-white rounded-lg border border-slate-200 p-4 hover:border-emerald-300 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-2">
            <Store className="w-5 h-5 text-amber-600" />
            <Tag color="amber">{s.apps.filter((a) => a.status === "PENDING").length}</Tag>
          </div>
          <div className="text-sm font-medium text-slate-800">应用上架审核</div>
          <div className="text-xs text-slate-500 mt-1">应用市场质量把关</div>
        </Link>
        <Link href="/operator/match" className="bg-white rounded-lg border border-slate-200 p-4 hover:border-emerald-300 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-2">
            <HeartHandshake className="w-5 h-5 text-cyan-600" />
            <Tag color="blue">{openMatches.length}</Tag>
          </div>
          <div className="text-sm font-medium text-slate-800">需求撮合</div>
          <div className="text-xs text-slate-500 mt-1">智能匹配服务商</div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 gov-card">
          <div className="gov-card-header"><h2 className="font-semibold text-slate-900">近 30 日运营指标</h2></div>
          <div className="gov-card-body">
            <GovLine
              data={operationStats}
              xKey="date"
              series={[
                { key: "enterprises", name: "日活企业", color: "#10b981", type: "area" },
                { key: "applications", name: "申请单数", color: "#0891b2" },
              ]}
              formatType="number"
              height={280}
            />
          </div>
        </div>

        <div className="gov-card">
          <div className="gov-card-header flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">最新待审申请</h2>
            <Link href="/operator/audit" className="text-xs text-blue-600 hover:underline flex items-center">全部 <ChevronRight className="w-3 h-3" /></Link>
          </div>
          <div className="divide-y divide-slate-100">
            {pending.slice(0, 6).map((a) => (
              <div key={a.id} className="px-5 py-2.5 hover:bg-slate-50/50">
                <div className="text-sm font-medium text-slate-800 truncate">{a.enterpriseName}</div>
                <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                  <Tag color="amber">{a.voucherType}</Tag>
                  <span>{relativeTime(a.submittedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 运营活动 */}
      <div className="gov-card">
        <div className="gov-card-header flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">进行中的运营活动</h2>
          <Link href="/operator/activities" className="text-xs text-blue-600 hover:underline flex items-center">全部活动 <ChevronRight className="w-3 h-3" /></Link>
        </div>
        <div className="px-5 py-3 grid grid-cols-1 md:grid-cols-3 gap-3">
          <ActivityCard title="5 月：AI 进园区计划" tag="进行中" subtitle="覆盖 8 个产业园，预计触达 1200 家企业" days="还剩 12 天" color="cyan" />
          <ActivityCard title="工业大模型应用大赛" tag="进行中" subtitle="36 支队伍报名，奖金池 200 万" days="还剩 23 天" color="purple" />
          <ActivityCard title="中小企业 AI 普惠月" tag="筹备" subtitle="6 月启动 · 重点扶持微型企业" days="预热阶段" color="amber" />
        </div>
      </div>
    </div>
  );
}

function ActivityCard({ title, tag, subtitle, days, color }: { title: string; tag: string; subtitle: string; days: string; color: "cyan" | "purple" | "amber" }) {
  return (
    <div className="p-4 rounded border" style={{ borderColor: { cyan: "#67e8f9", purple: "#ddd6fe", amber: "#fde68a" }[color], background: { cyan: "#ecfeff", purple: "#faf5ff", amber: "#fffbeb" }[color] }}>
      <Tag color={color}>{tag}</Tag>
      <div className="mt-2 font-medium text-slate-900">{title}</div>
      <div className="text-xs text-slate-600 mt-1">{subtitle}</div>
      <div className="text-xs text-slate-500 mt-2 flex items-center justify-between">
        <span>{days}</span>
        <button className="text-blue-600 hover:underline">管理</button>
      </div>
    </div>
  );
}
