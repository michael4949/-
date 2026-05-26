import { getStore } from "@/lib/data/store";
import { getDemoProvider } from "@/lib/data/personas";
import { formatNumber, formatToken, formatCurrency, formatPercent } from "@/lib/utils";
import { Tag } from "@/components/ui/Tag";
import { KpiCard } from "@/components/ui/KpiCard";
import { Receipt, Download, CheckCircle2, Clock, Wallet, FileText } from "lucide-react";

export default function ProviderSettlementPage() {
  const s = getStore();
  const provider = getDemoProvider();
  const myModels = s.models.filter((m) => m.vendor === provider.vendor);

  // 生成最近 6 个月的对账单
  const bills = Array.from({ length: 6 }).map((_, i) => {
    const m = new Date();
    m.setMonth(m.getMonth() - i);
    const tokens = Math.floor(myModels.reduce((s, mm) => s + mm.monthTokens, 0) * (0.8 + Math.random() * 0.4));
    const revenue = Math.floor(tokens / 1_000_000 * (myModels[0].priceIn * 0.6 + myModels[0].priceOut * 0.4));
    return {
      period: `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`,
      tokens,
      calls: Math.floor(tokens / 2200),
      revenue,
      voucherRatio: 0.82 + Math.random() * 0.13,
      status: i === 0 ? "PENDING" : "PAID",
    };
  });

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">对账结算</h1>
          <p className="text-sm text-slate-500 mt-1">月度账单 · 政府结算 · 历史核对</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary"><Download className="w-4 h-4" />导出 Excel</button>
          <button className="btn-primary"><FileText className="w-4 h-4" />申请提前结算</button>
        </div>
      </div>

      {/* 当期账单 */}
      <div className="gov-card bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <Tag color="amber">本月账单</Tag>
              <div className="text-xs text-slate-500 mt-2">账期：2026 年 05 月</div>
              <div className="text-3xl font-semibold digital text-slate-900 mt-1">{formatCurrency(bills[0].revenue)}</div>
              <div className="text-sm text-slate-500 mt-1">含 Token 券抵扣 {formatPercent(bills[0].voucherRatio)}</div>
            </div>
            <div className="text-right">
              <Tag color="amber" dot>待结算</Tag>
              <div className="text-xs text-slate-500 mt-2">预计 06 月 8 日结算</div>
              <button className="btn-primary mt-3"><CheckCircle2 className="w-4 h-4" />核对账单</button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-purple-200">
            <div>
              <div className="text-xs text-slate-500">调用次数</div>
              <div className="text-base font-semibold digital text-slate-800 mt-1">{formatNumber(bills[0].calls)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Token 量</div>
              <div className="text-base font-semibold digital text-slate-800 mt-1">{formatToken(bills[0].tokens)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">服务客户数</div>
              <div className="text-base font-semibold digital text-slate-800 mt-1">2,348</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">活跃模型</div>
              <div className="text-base font-semibold digital text-slate-800 mt-1">{myModels.length}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="本年累计营收" value={formatCurrency(bills.reduce((s, b) => s + b.revenue, 0))} accent="#7e22ce" icon={<Wallet className="w-4 h-4" />} />
        <KpiCard label="已结算金额" value={formatCurrency(bills.filter((b) => b.status === "PAID").reduce((s, b) => s + b.revenue, 0))} accent="#047857" icon={<CheckCircle2 className="w-4 h-4" />} />
        <KpiCard label="待结算" value={formatCurrency(bills[0].revenue)} accent="#ea580c" icon={<Clock className="w-4 h-4" />} />
        <KpiCard label="平均回款周期" value="6.4" unit="天" accent="#0891b2" />
      </div>

      <div className="gov-card">
        <div className="gov-card-header"><h2 className="font-semibold text-slate-900">账单历史</h2></div>
        <div className="overflow-x-auto">
          <table className="gov-table">
            <thead>
              <tr>
                <th>账期</th>
                <th>调用次数</th>
                <th>Token 量</th>
                <th>毛收入</th>
                <th>券抵扣占比</th>
                <th>结算状态</th>
                <th>结算时间</th>
                <th className="text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {bills.map((b) => (
                <tr key={b.period}>
                  <td className="font-mono text-sm">{b.period}</td>
                  <td className="digital">{formatNumber(b.calls)}</td>
                  <td className="digital">{formatToken(b.tokens)}</td>
                  <td className="digital text-slate-800 font-medium">{formatCurrency(b.revenue)}</td>
                  <td className="digital">{formatPercent(b.voucherRatio)}</td>
                  <td><Tag color={b.status === "PAID" ? "green" : "amber"} dot>{b.status === "PAID" ? "已结算" : "待结算"}</Tag></td>
                  <td className="text-xs text-slate-500">{b.status === "PAID" ? `${b.period}-08` : "—"}</td>
                  <td className="text-right">
                    <button className="text-blue-600 text-xs hover:underline">查看明细</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
