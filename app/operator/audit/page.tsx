import { getStore } from "@/lib/data/store";
import { INDUSTRIES, DISTRICTS, VOUCHER_TYPES } from "@/lib/constants";
import { formatNumber, formatToken, relativeTime } from "@/lib/utils";
import { Tag } from "@/components/ui/Tag";
import { KpiCard } from "@/components/ui/KpiCard";
import { Check, X, Edit3, Search, ClipboardCheck, FileText } from "lucide-react";

export default function OperatorAuditPage() {
  const s = getStore();
  const pending = s.voucherApps.filter((a) => a.status === "PENDING");

  // 新入驻企业（最近 30 天）
  const newEnts = s.enterprises.filter((e) => {
    const d = new Date(e.certifiedAt || e.registeredAt);
    const days = (Date.now() - d.getTime()) / 86400000;
    return days < 30;
  }).slice(0, 12);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">审核中心</h1>
          <p className="text-sm text-slate-500 mt-1">企业入驻审核 + 券申请初审 · 运营前置过滤</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="券申请待审" value={String(pending.length)} icon={<ClipboardCheck className="w-4 h-4" />} accent="#ea580c" />
        <KpiCard label="新入驻待审" value="42" icon={<FileText className="w-4 h-4" />} accent="#0891b2" />
        <KpiCard label="本月通过率" value="87.5%" accent="#047857" />
        <KpiCard label="平均审核时长" value="6.2" unit="小时" accent="#7e22ce" />
      </div>

      {/* 券申请 */}
      <div className="gov-card">
        <div className="gov-card-header flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">券申请初审</h2>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input type="text" placeholder="搜索企业 / 申请号" className="pl-8 pr-3 py-1.5 text-sm bg-slate-100 rounded w-[240px] focus:outline-none focus:bg-white" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="gov-table">
            <thead>
              <tr>
                <th>申请编号</th>
                <th>企业</th>
                <th>行业 / 区县</th>
                <th>券类型 / 金额</th>
                <th>场景</th>
                <th>风险评估</th>
                <th>提交时间</th>
                <th className="text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {pending.slice(0, 16).map((a) => {
                const ind = INDUSTRIES.find((x) => x.code === a.industryCode);
                const dis = DISTRICTS.find((x) => x.code === a.districtCode);
                const vt = VOUCHER_TYPES.find((x) => x.code === a.voucherType);
                const risk = ["低", "低", "中", "低"][Math.floor(Math.random() * 4)];
                return (
                  <tr key={a.id}>
                    <td className="font-mono text-xs">{a.applicationCode}</td>
                    <td className="font-medium text-slate-800 max-w-[200px] truncate">{a.enterpriseName}</td>
                    <td className="text-xs"><span style={{ color: ind?.color }}>●</span> {ind?.name} / {dis?.name}</td>
                    <td>
                      <Tag color="blue">{vt?.name}</Tag>
                      <span className="ml-2 digital text-sm">{a.voucherType === "TOKEN" ? formatToken(a.requestedAmount) : formatNumber(a.requestedAmount)} {a.unit}</span>
                    </td>
                    <td className="text-sm text-slate-600 max-w-[140px] truncate">{a.scenario}</td>
                    <td><Tag color={risk === "低" ? "green" : "amber"} dot>{risk}风险</Tag></td>
                    <td className="text-xs text-slate-500">{relativeTime(a.submittedAt)}</td>
                    <td className="text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <button className="text-emerald-600 hover:bg-emerald-50 p-1 rounded"><Check className="w-3.5 h-3.5" /></button>
                        <button className="text-amber-600 hover:bg-amber-50 p-1 rounded"><Edit3 className="w-3.5 h-3.5" /></button>
                        <button className="text-rose-600 hover:bg-rose-50 p-1 rounded"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 新企业入驻 */}
      <div className="gov-card">
        <div className="gov-card-header"><h2 className="font-semibold text-slate-900">最新入驻企业（待资质核验）</h2></div>
        <div className="overflow-x-auto">
          <table className="gov-table">
            <thead>
              <tr>
                <th>企业</th>
                <th>统一信用代码</th>
                <th>行业</th>
                <th>规模</th>
                <th>资质标签</th>
                <th>入驻时间</th>
                <th className="text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {newEnts.map((e) => {
                const ind = INDUSTRIES.find((x) => x.code === e.industryCode);
                return (
                  <tr key={e.id}>
                    <td className="font-medium text-slate-800 max-w-[260px] truncate">{e.name}</td>
                    <td className="font-mono text-xs">{e.uscc}</td>
                    <td><Tag color="blue"><span style={{ color: ind?.color }}>●</span><span className="ml-1">{ind?.name}</span></Tag></td>
                    <td>{e.scale}</td>
                    <td>
                      {e.isHighTech && <Tag color="purple">高新</Tag>}
                      {e.isSpecialized && <Tag color="amber">专精特新</Tag>}
                    </td>
                    <td className="text-xs text-slate-500">{relativeTime(e.certifiedAt || e.registeredAt)}</td>
                    <td className="text-right">
                      <button className="text-blue-600 text-xs hover:underline">核验</button>
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
