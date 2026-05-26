import { getStore } from "@/lib/data/store";
import { formatNumber, formatToken, formatCurrency, formatPercent, formatDate } from "@/lib/utils";
import { Tag } from "@/components/ui/Tag";
import { KpiCard } from "@/components/ui/KpiCard";
import { GovLine } from "@/components/charts/GovLine";
import { Receipt, Download, CheckCircle2, AlertCircle, FileText, Wallet, Building2 } from "lucide-react";

export default function GovSettlementPage() {
  const s = getStore();
  const { models, computeCenters, cityDaily, vouchers, kpi } = s;

  // 模拟服务商账单
  const vendorBills = [
    ...models.map((m) => ({
      type: "model",
      vendor: m.vendor,
      name: m.name,
      period: "2026-04",
      tokens: m.monthTokens,
      callCount: m.monthCalls,
      amount: Math.floor((m.monthTokens / 1_000_000) * (m.priceIn * 0.6 + m.priceOut * 0.4)),
      status: Math.random() > 0.2 ? "PAID" : "PENDING",
    })),
    ...computeCenters.slice(0, 12).map((c) => ({
      type: "compute",
      vendor: c.vendor,
      name: c.name,
      period: "2026-04",
      tokens: 0,
      callCount: Math.floor(c.totalCards * c.utilization * 24 * 30),
      amount: Math.floor(c.totalCards * c.utilization * 24 * 30 * c.priceUnit),
      status: Math.random() > 0.25 ? "PAID" : "PENDING",
    })),
  ];

  const totalAmount = vendorBills.reduce((s, b) => s + b.amount, 0);
  const paid = vendorBills.filter((b) => b.status === "PAID").reduce((s, b) => s + b.amount, 0);
  const pending = totalAmount - paid;
  const lastMonth = cityDaily.slice(-30).map((p) => ({
    date: p.date.slice(5),
    cost: p.cost,
  }));

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">政企对账与结算</h1>
          <p className="text-sm text-slate-500 mt-1">2026 年 04 月账期 · 服务商账单核对 · 政府结算</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary"><FileText className="w-4 h-4" />对账报告</button>
          <button className="btn-secondary"><Download className="w-4 h-4" />导出 Excel</button>
          <button className="btn-primary"><CheckCircle2 className="w-4 h-4" />批量结算</button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="本月应付总额" value={formatCurrency(totalAmount)} icon={<Wallet className="w-4 h-4" />} accent="#2563eb" />
        <KpiCard label="已结算" value={formatCurrency(paid)} unit={`(${formatPercent(paid / totalAmount)})`} icon={<CheckCircle2 className="w-4 h-4" />} accent="#047857" />
        <KpiCard label="待结算" value={formatCurrency(pending)} icon={<AlertCircle className="w-4 h-4" />} accent="#ea580c" />
        <KpiCard label="服务商家数" value={String(new Set(vendorBills.map((b) => b.vendor)).size)} unit="家" icon={<Building2 className="w-4 h-4" />} accent="#7e22ce" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 gov-card">
          <div className="gov-card-header">
            <h2 className="font-semibold text-slate-900">近 30 日补贴抵扣金额</h2>
            <p className="text-xs text-slate-500 mt-0.5">每日企业通过券抵扣的实际消费</p>
          </div>
          <div className="gov-card-body">
            <GovLine data={lastMonth} xKey="date" series={[{ key: "cost", name: "抵扣金额", color: "#2563eb", type: "area" }]} formatType="currency" height={260} />
          </div>
        </div>

        <div className="gov-card">
          <div className="gov-card-header"><h2 className="font-semibold text-slate-900">结算状态</h2></div>
          <div className="px-5 py-3 space-y-3">
            <StatusRow label="已结算" count={vendorBills.filter((b) => b.status === "PAID").length} amount={paid} color="emerald" />
            <StatusRow label="待结算" count={vendorBills.filter((b) => b.status === "PENDING").length} amount={pending} color="amber" />
            <div className="pt-3 mt-3 border-t border-slate-100">
              <div className="text-xs text-slate-500 mb-2">结算进度</div>
              <div className="progress-bar"><div className="progress-bar-fill" style={{ width: `${(paid / totalAmount) * 100}%`, background: "#10b981" }} /></div>
              <div className="flex items-center justify-between mt-2 text-xs">
                <span className="text-slate-500">{formatCurrency(paid)} / {formatCurrency(totalAmount)}</span>
                <span className="digital font-medium text-emerald-700">{formatPercent(paid / totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 服务商账单列表 */}
      <div className="gov-card">
        <div className="gov-card-header flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">服务商账单</h2>
            <p className="text-xs text-slate-500 mt-0.5">显示前 20 条 · 共 {vendorBills.length} 条</p>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <Tag color="green" dot>已结算 {vendorBills.filter((b) => b.status === "PAID").length}</Tag>
            <Tag color="amber" dot>待结算 {vendorBills.filter((b) => b.status === "PENDING").length}</Tag>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="gov-table">
            <thead>
              <tr>
                <th>账期</th>
                <th>服务商</th>
                <th>项目</th>
                <th>类型</th>
                <th>计量</th>
                <th>金额</th>
                <th>状态</th>
                <th className="text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {vendorBills.slice(0, 20).map((b, i) => (
                <tr key={i}>
                  <td className="font-mono text-xs">{b.period}</td>
                  <td className="font-medium text-slate-800">{b.vendor}</td>
                  <td className="text-sm text-slate-700">{b.name}</td>
                  <td><Tag color={b.type === "model" ? "blue" : "purple"}>{b.type === "model" ? "模型调用" : "算力租用"}</Tag></td>
                  <td className="digital text-sm text-slate-700">
                    {b.type === "model" ? <>{formatToken(b.tokens)} · {formatNumber(b.callCount)} 次</> : <>{formatNumber(b.callCount)} 卡时</>}
                  </td>
                  <td className="digital text-sm text-slate-800 font-medium">{formatCurrency(b.amount)}</td>
                  <td>
                    <Tag color={b.status === "PAID" ? "green" : "amber"} dot>{b.status === "PAID" ? "已结算" : "待结算"}</Tag>
                  </td>
                  <td className="text-right">
                    {b.status === "PAID" ? (
                      <button className="text-slate-500 text-xs hover:text-slate-700">凭证</button>
                    ) : (
                      <button className="text-blue-600 text-xs hover:underline">立即结算</button>
                    )}
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

function StatusRow({ label, count, amount, color }: { label: string; count: number; amount: number; color: string }) {
  return (
    <div className="flex items-center justify-between p-2 rounded" style={{ background: color === "emerald" ? "#f0fdf4" : "#fffbeb" }}>
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full bg-${color}-500`} />
        <span className="text-sm text-slate-700">{label}</span>
        <span className="text-xs text-slate-500 digital">{count} 笔</span>
      </div>
      <span className="digital text-sm font-medium text-slate-800">{formatCurrency(amount)}</span>
    </div>
  );
}
