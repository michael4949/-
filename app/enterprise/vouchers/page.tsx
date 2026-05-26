import { getStore } from "@/lib/data/store";
import { getDemoEnterprise } from "@/lib/data/personas";
import { VOUCHER_TYPES } from "@/lib/constants";
import { formatNumber, formatToken, formatCurrency, formatPercent, formatDate, relativeTime } from "@/lib/utils";
import { Tag } from "@/components/ui/Tag";
import { KpiCard } from "@/components/ui/KpiCard";
import Link from "next/link";
import { Wallet, PlusCircle, Cpu, Coins, Database, BookOpen, ChevronRight, History } from "lucide-react";

export default function MyVouchersPage() {
  const s = getStore();
  const me = getDemoEnterprise();
  const myV = s.vouchers.filter((v) => v.enterpriseId === me.id);

  const byType = VOUCHER_TYPES.map((vt) => {
    const arr = myV.filter((v) => v.type === vt.code);
    return {
      ...vt,
      count: arr.length,
      total: arr.reduce((s, v) => s + v.amount, 0),
      used: arr.reduce((s, v) => s + v.amountUsed, 0),
      remaining: arr.reduce((s, v) => s + v.amountRemaining, 0),
    };
  });

  const colorMap: Record<string, "blue" | "purple" | "cyan" | "green" | "amber"> = {
    TOKEN: "blue",
    COMPUTE: "purple",
    MODEL: "cyan",
    DATA: "green",
    CORPUS: "amber",
  };

  const iconMap: Record<string, React.ReactNode> = {
    TOKEN: <Wallet className="w-5 h-5" />,
    COMPUTE: <Cpu className="w-5 h-5" />,
    MODEL: <Coins className="w-5 h-5" />,
    DATA: <Database className="w-5 h-5" />,
    CORPUS: <BookOpen className="w-5 h-5" />,
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">我的券包</h1>
          <p className="text-sm text-slate-500 mt-1">{me.name} · 共持有 {myV.length} 张券</p>
        </div>
        <Link href="/enterprise/apply" className="btn-primary">
          <PlusCircle className="w-4 h-4" />申请新券
        </Link>
      </div>

      {/* 五券汇总 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        {byType.map((t) => (
          <div key={t.code} className="gov-card">
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded flex items-center justify-center bg-blue-50 text-blue-600">
                  {iconMap[t.code]}
                </div>
                <Tag color={colorMap[t.code]}>{t.count} 张</Tag>
              </div>
              <div className="text-xs text-slate-500">{t.name}</div>
              <div className="kpi-value mt-1 text-slate-800">{t.code === "TOKEN" ? formatToken(t.remaining) : formatNumber(t.remaining)}</div>
              <div className="text-[10px] text-slate-500 mt-1 digital">剩余 / 总额 {t.code === "TOKEN" ? formatToken(t.total) : formatNumber(t.total)}</div>
              <div className="progress-bar mt-2"><div className="progress-bar-fill" style={{ width: `${(t.used / Math.max(1, t.total)) * 100}%` }} /></div>
            </div>
          </div>
        ))}
      </div>

      {/* 券明细列表 */}
      <div className="gov-card">
        <div className="gov-card-header flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">券明细</h2>
          <div className="flex items-center gap-1 text-xs">
            <Tag color="green" dot>生效 {myV.filter((v) => v.status === "ACTIVE").length}</Tag>
            <Tag color="amber" dot>耗尽 {myV.filter((v) => v.status === "EXHAUSTED").length}</Tag>
            <Tag color="slate" dot>过期 {myV.filter((v) => v.status === "EXPIRED").length}</Tag>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="gov-table">
            <thead>
              <tr>
                <th>券号</th>
                <th>类型</th>
                <th>批次</th>
                <th>额度</th>
                <th>已用</th>
                <th>剩余</th>
                <th>规则</th>
                <th>状态</th>
                <th>发放</th>
                <th>到期</th>
                <th className="text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {myV.map((v) => {
                const vt = VOUCHER_TYPES.find((t) => t.code === v.type);
                return (
                  <tr key={v.id}>
                    <td className="font-mono text-xs">{v.id}</td>
                    <td><Tag color={colorMap[v.type]}>{vt?.name}</Tag></td>
                    <td className="font-mono text-xs">{v.batchCode}</td>
                    <td className="digital">{v.type === "TOKEN" ? formatToken(v.amount) : formatNumber(v.amount)} {v.unit}</td>
                    <td className="digital text-slate-500">{v.type === "TOKEN" ? formatToken(v.amountUsed) : formatNumber(v.amountUsed)}</td>
                    <td className="digital text-slate-800 font-medium">{v.type === "TOKEN" ? formatToken(v.amountRemaining) : formatNumber(v.amountRemaining)}</td>
                    <td><Tag color={v.rule === "PUBLIC" ? "green" : v.rule === "APPLY" ? "blue" : "purple"}>{v.rule === "PUBLIC" ? "普惠" : v.rule === "APPLY" ? "申请" : "行业"}</Tag></td>
                    <td><Tag color={v.status === "ACTIVE" ? "green" : v.status === "EXHAUSTED" ? "amber" : "slate"} dot>{v.status === "ACTIVE" ? "生效" : v.status === "EXHAUSTED" ? "耗尽" : v.status === "EXPIRED" ? "过期" : "冻结"}</Tag></td>
                    <td className="text-xs text-slate-500">{formatDate(v.issuedAt)}</td>
                    <td className="text-xs text-slate-500">{formatDate(v.expireAt)}</td>
                    <td className="text-right">
                      <button className="text-blue-600 text-xs hover:underline flex items-center gap-0.5 ml-auto">
                        <History className="w-3 h-3" />核销
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
