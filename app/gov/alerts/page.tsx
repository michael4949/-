import { getStore } from "@/lib/data/store";
import { formatNumber, formatDate, relativeTime, formatDateTime } from "@/lib/utils";
import { Tag } from "@/components/ui/Tag";
import { KpiCard } from "@/components/ui/KpiCard";
import { AlertTriangle, Bell, Activity, ShieldAlert, Wallet, Cpu, FileText, Check } from "lucide-react";

export default function GovAlertsPage() {
  const s = getStore();
  const { alerts } = s;

  const critical = alerts.filter((a) => a.level === "CRITICAL").length;
  const warn = alerts.filter((a) => a.level === "WARN").length;
  const unacked = alerts.filter((a) => !a.acked).length;

  const catColor: Record<string, "blue" | "purple" | "red" | "amber" | "green"> = {
    USAGE: "blue",
    COMPUTE: "purple",
    VOUCHER: "amber",
    SECURITY: "red",
    POLICY: "green",
  };

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
          <h1 className="text-2xl font-semibold text-slate-900">风险告警中心</h1>
          <p className="text-sm text-slate-500 mt-1">用量异常 / 算力异常 / 券务异常 / 安全审计 / 政策提醒</p>
        </div>
        <button className="btn-primary"><Check className="w-4 h-4" />全部已读</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="总告警" value={String(alerts.length)} icon={<Bell className="w-4 h-4" />} accent="#2563eb" />
        <KpiCard label="未处理" value={String(unacked)} icon={<AlertTriangle className="w-4 h-4" />} accent="#dc2626" />
        <KpiCard label="紧急" value={String(critical)} icon={<AlertTriangle className="w-4 h-4" />} accent="#f43f5e" />
        <KpiCard label="警告" value={String(warn)} accent="#f59e0b" />
        <KpiCard label="本日新增" value={String(Math.floor(alerts.length / 7))} accent="#0891b2" />
      </div>

      {/* 分类统计 */}
      <div className="gov-card">
        <div className="gov-card-header"><h2 className="font-semibold text-slate-900">按分类统计</h2></div>
        <div className="px-5 py-3 grid grid-cols-2 md:grid-cols-5 gap-3">
          {["USAGE", "COMPUTE", "VOUCHER", "SECURITY", "POLICY"].map((cat) => {
            const c = alerts.filter((a) => a.category === cat).length;
            const colorMap: Record<string, string> = { USAGE: "#3b82f6", COMPUTE: "#a855f7", VOUCHER: "#f59e0b", SECURITY: "#dc2626", POLICY: "#10b981" };
            const nameMap: Record<string, string> = { USAGE: "用量异常", COMPUTE: "算力异常", VOUCHER: "券务异常", SECURITY: "安全审计", POLICY: "政策提醒" };
            return (
              <div key={cat} className="p-3 rounded border border-slate-200 flex items-center gap-3" style={{ borderColor: colorMap[cat] + "30" }}>
                <div className="w-10 h-10 rounded flex items-center justify-center" style={{ background: colorMap[cat] + "15", color: colorMap[cat] }}>
                  {catIcon[cat]}
                </div>
                <div>
                  <div className="text-xs text-slate-500">{nameMap[cat]}</div>
                  <div className="text-2xl font-semibold text-slate-900 digital">{c}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 告警列表 */}
      <div className="gov-card">
        <div className="gov-card-header flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">告警时间线</h2>
          <div className="flex items-center gap-1 text-xs">
            <button className="px-2 py-1 rounded bg-slate-100 text-slate-700">全部</button>
            <button className="px-2 py-1 rounded text-slate-500 hover:bg-slate-50">紧急</button>
            <button className="px-2 py-1 rounded text-slate-500 hover:bg-slate-50">警告</button>
            <button className="px-2 py-1 rounded text-slate-500 hover:bg-slate-50">信息</button>
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {alerts.map((a) => (
            <div key={a.id} className={`px-5 py-3.5 hover:bg-slate-50/40 ${!a.acked ? "bg-amber-50/20" : ""}`}>
              <div className="flex items-start gap-3">
                <div
                  className={`w-9 h-9 rounded flex items-center justify-center flex-shrink-0 ${
                    a.level === "CRITICAL" ? "bg-red-100 text-red-600" : a.level === "WARN" ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"
                  }`}
                >
                  {catIcon[a.category]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Tag color={a.level === "CRITICAL" ? "red" : a.level === "WARN" ? "amber" : "blue"} dot>
                      {a.level === "CRITICAL" ? "紧急" : a.level === "WARN" ? "警告" : "信息"}
                    </Tag>
                    <Tag color={catColor[a.category]}>
                      {{ USAGE: "用量", COMPUTE: "算力", VOUCHER: "券务", SECURITY: "安全", POLICY: "政策" }[a.category]}
                    </Tag>
                    {!a.acked && <Tag color="red">未处理</Tag>}
                    <span className="text-xs text-slate-400 ml-auto">{formatDateTime(a.ts)} · {relativeTime(a.ts)}</span>
                  </div>
                  <div className="font-medium text-slate-900 text-sm">{a.title}</div>
                  <div className="text-sm text-slate-600 mt-1 leading-relaxed">{a.detail}</div>
                  {a.related && <div className="text-xs text-slate-400 mt-1">关联: {a.related}</div>}
                </div>
                <div className="flex items-center gap-1">
                  {!a.acked && (
                    <button className="text-xs text-blue-600 px-2 py-1 hover:bg-blue-50 rounded">处理</button>
                  )}
                  <button className="text-xs text-slate-500 px-2 py-1 hover:bg-slate-100 rounded">详情</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
