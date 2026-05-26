import { getStore } from "@/lib/data/store";
import { formatDateTime, relativeTime } from "@/lib/utils";
import { Tag } from "@/components/ui/Tag";
import { KpiCard } from "@/components/ui/KpiCard";
import { Bell, AlertTriangle, ShieldAlert, Activity, Wallet, Cpu, FileText, Check } from "lucide-react";

export default function OperatorAlertsPage() {
  const s = getStore();

  const catIcon: Record<string, React.ReactNode> = {
    USAGE: <Activity className="w-4 h-4" />,
    COMPUTE: <Cpu className="w-4 h-4" />,
    VOUCHER: <Wallet className="w-4 h-4" />,
    SECURITY: <ShieldAlert className="w-4 h-4" />,
    POLICY: <FileText className="w-4 h-4" />,
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">系统告警</h1>
          <p className="text-sm text-slate-500 mt-1">运维监控 · 异常处置 · 升级流转</p>
        </div>
        <button className="btn-primary"><Check className="w-4 h-4" />标记全部已处理</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="总告警" value={String(s.alerts.length)} icon={<Bell className="w-4 h-4" />} accent="#0891b2" />
        <KpiCard label="未处理" value={String(s.alerts.filter((a) => !a.acked).length)} icon={<AlertTriangle className="w-4 h-4" />} accent="#dc2626" />
        <KpiCard label="紧急" value={String(s.alerts.filter((a) => a.level === "CRITICAL").length)} accent="#f43f5e" />
        <KpiCard label="处理中" value={String(Math.floor(s.alerts.length * 0.18))} accent="#7e22ce" />
        <KpiCard label="平均响应" value="4.2" unit="分钟" accent="#047857" />
      </div>

      <div className="gov-card">
        <div className="gov-card-header"><h2 className="font-semibold text-slate-900">告警工单</h2></div>
        <div className="divide-y divide-slate-100">
          {s.alerts.map((a) => (
            <div key={a.id} className={`px-5 py-3 ${!a.acked ? "bg-amber-50/30" : ""}`}>
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded flex items-center justify-center flex-shrink-0 ${a.level === "CRITICAL" ? "bg-red-100 text-red-600" : a.level === "WARN" ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"}`}>
                  {catIcon[a.category]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Tag color={a.level === "CRITICAL" ? "red" : a.level === "WARN" ? "amber" : "blue"} dot>{a.level === "CRITICAL" ? "紧急" : a.level === "WARN" ? "警告" : "信息"}</Tag>
                    <Tag color="slate">{{ USAGE: "用量", COMPUTE: "算力", VOUCHER: "券务", SECURITY: "安全", POLICY: "政策" }[a.category]}</Tag>
                    {!a.acked && <Tag color="red">待处理</Tag>}
                    <span className="text-xs text-slate-400 ml-auto">{relativeTime(a.ts)}</span>
                  </div>
                  <div className="text-sm font-medium text-slate-900">{a.title}</div>
                  <div className="text-sm text-slate-600 mt-1 leading-relaxed">{a.detail}</div>
                  <div className="flex items-center gap-3 mt-2 text-xs">
                    {a.related && <span className="text-slate-500">关联：{a.related}</span>}
                    {!a.acked && (
                      <div className="ml-auto flex items-center gap-2">
                        <button className="text-xs text-amber-700 hover:underline">升级</button>
                        <button className="text-xs text-blue-700 hover:underline">分派</button>
                        <button className="text-xs text-emerald-700 hover:underline">处置</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
