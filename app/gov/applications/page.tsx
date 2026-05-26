import { getStore } from "@/lib/data/store";
import { VOUCHER_TYPES, INDUSTRIES, DISTRICTS } from "@/lib/constants";
import { formatNumber, formatToken, formatPercent, formatDate, relativeTime } from "@/lib/utils";
import { Tag } from "@/components/ui/Tag";
import { KpiCard } from "@/components/ui/KpiCard";
import { Check, X, Edit3, FileText, Filter, Search, Calendar, Clock, ClipboardCheck, AlertCircle } from "lucide-react";

export default function GovApplicationsPage() {
  const s = getStore();
  const { voucherApps, policies, enterprises } = s;

  const pending = voucherApps.filter((a) => a.status === "PENDING");
  const approved = voucherApps.filter((a) => a.status === "APPROVED").length;
  const rejected = voucherApps.filter((a) => a.status === "REJECTED").length;
  const revision = voucherApps.filter((a) => a.status === "REVISION").length;
  const total = voucherApps.length;
  const approvalRate = approved / Math.max(1, approved + rejected);

  const statusMeta: Record<string, { color: "amber" | "green" | "red" | "purple"; label: string }> = {
    PENDING: { color: "amber", label: "待审批" },
    APPROVED: { color: "green", label: "已通过" },
    REJECTED: { color: "red", label: "已拒绝" },
    REVISION: { color: "purple", label: "需补正" },
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">券申请审批</h1>
          <p className="text-sm text-slate-500 mt-1">企业 Token 券 / 算力券 / 模型券 申请审批工作台</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary"><FileText className="w-4 h-4" />模板管理</button>
          <button className="btn-primary"><Check className="w-4 h-4" />批量审批</button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="待审批" value={String(pending.length)} unit="件" accent="#ea580c" icon={<Clock className="w-4 h-4" />} />
        <KpiCard label="本年累计申请" value={String(total)} unit="件" accent="#2563eb" icon={<FileText className="w-4 h-4" />} />
        <KpiCard label="通过率" value={formatPercent(approvalRate)} trend={0.034} trendLabel="月增" accent="#047857" />
        <KpiCard label="平均审批时长" value="1.4" unit="工作日" trend={-0.18} trendLabel="月变" accent="#7e22ce" />
        <KpiCard label="需补正" value={String(revision)} unit="件" accent="#dc2626" icon={<AlertCircle className="w-4 h-4" />} />
      </div>

      {/* 筛选条 */}
      <div className="gov-card">
        <div className="px-5 py-3 flex items-center gap-3 border-b border-slate-100">
          <div className="flex items-center gap-1.5 mr-2">
            <ClipboardCheck className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-700">申请列表</span>
            <span className="text-xs text-slate-400">显示前 30 条 · 共 {voucherApps.length} 件</span>
          </div>
          <div className="flex-1" />
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input type="text" placeholder="搜索企业 / 申请编号" className="pl-8 pr-3 py-1.5 text-sm bg-slate-100 border border-transparent rounded w-[220px] focus:outline-none focus:bg-white focus:border-slate-300" />
          </div>
          <button className="text-xs text-slate-600 px-2 py-1 rounded hover:bg-slate-100 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            筛选
          </button>
          <div className="flex items-center gap-1 ml-2 text-xs">
            <Tag color="amber" dot>待审批 {pending.length}</Tag>
            <Tag color="green" dot>已通过 {approved}</Tag>
            <Tag color="red" dot>已拒绝 {rejected}</Tag>
            <Tag color="purple" dot>需补正 {revision}</Tag>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="gov-table">
            <thead>
              <tr>
                <th className="w-10"><input type="checkbox" className="rounded" /></th>
                <th>申请编号</th>
                <th>企业</th>
                <th>行业 / 区县</th>
                <th>券类型</th>
                <th>申请金额</th>
                <th>场景</th>
                <th>状态</th>
                <th>提交</th>
                <th className="text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {voucherApps.slice(0, 30).map((a) => {
                const ind = INDUSTRIES.find((x) => x.code === a.industryCode);
                const dis = DISTRICTS.find((x) => x.code === a.districtCode);
                const vt = VOUCHER_TYPES.find((x) => x.code === a.voucherType);
                return (
                  <tr key={a.id} className={a.status === "PENDING" ? "bg-amber-50/30" : ""}>
                    <td><input type="checkbox" className="rounded" /></td>
                    <td className="font-mono text-xs text-slate-500">{a.applicationCode}</td>
                    <td className="font-medium text-slate-800 max-w-[200px] truncate">{a.enterpriseName}</td>
                    <td>
                      <div className="text-xs text-slate-600 flex items-center gap-1.5">
                        <span style={{ color: ind?.color }}>●</span>
                        <span>{ind?.name}</span>
                        <span className="text-slate-300">/</span>
                        <span>{dis?.name}</span>
                      </div>
                    </td>
                    <td><Tag color={a.voucherType === "TOKEN" ? "blue" : a.voucherType === "COMPUTE" ? "purple" : a.voucherType === "MODEL" ? "cyan" : a.voucherType === "DATA" ? "green" : "amber"}>{vt?.name}</Tag></td>
                    <td className="digital text-slate-700 font-medium">
                      {a.voucherType === "TOKEN" ? formatToken(a.requestedAmount) : formatNumber(a.requestedAmount)} {a.unit}
                      {a.approvedAmount && a.approvedAmount !== a.requestedAmount && (
                        <div className="text-[10px] text-emerald-600">批 {a.voucherType === "TOKEN" ? formatToken(a.approvedAmount) : formatNumber(a.approvedAmount)}</div>
                      )}
                    </td>
                    <td className="text-xs text-slate-600 max-w-[140px] truncate">{a.scenario}</td>
                    <td><Tag color={statusMeta[a.status].color} dot>{statusMeta[a.status].label}</Tag></td>
                    <td className="text-xs text-slate-500">{relativeTime(a.submittedAt)}</td>
                    <td className="text-right">
                      {a.status === "PENDING" ? (
                        <div className="flex items-center gap-1 justify-end">
                          <button className="text-emerald-600 hover:bg-emerald-50 p-1 rounded" title="通过"><Check className="w-3.5 h-3.5" /></button>
                          <button className="text-rose-600 hover:bg-rose-50 p-1 rounded" title="拒绝"><X className="w-3.5 h-3.5" /></button>
                          <button className="text-amber-600 hover:bg-amber-50 p-1 rounded" title="退回补正"><Edit3 className="w-3.5 h-3.5" /></button>
                          <button className="text-blue-600 text-xs hover:underline ml-1">详情</button>
                        </div>
                      ) : (
                        <button className="text-blue-600 text-xs hover:underline">查看</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>共 {voucherApps.length} 条，每页 30 条</div>
          <div className="flex items-center gap-1">
            <button className="px-2 py-1 rounded hover:bg-slate-100">‹ 上一页</button>
            <button className="px-2 py-1 rounded bg-slate-100 text-slate-900 font-medium">1</button>
            <button className="px-2 py-1 rounded hover:bg-slate-100">2</button>
            <button className="px-2 py-1 rounded hover:bg-slate-100">3</button>
            <span className="px-1">...</span>
            <button className="px-2 py-1 rounded hover:bg-slate-100">{Math.ceil(voucherApps.length / 30)}</button>
            <button className="px-2 py-1 rounded hover:bg-slate-100">下一页 ›</button>
          </div>
        </div>
      </div>

      {/* 详情预览（示例：最新待审申请） */}
      {pending[0] && (
        <div className="gov-card">
          <div className="gov-card-header flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">详情预览</h2>
              <p className="text-xs text-slate-500 mt-0.5">点击列表行可展开完整审批界面</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <Tag color="amber" dot>待审批</Tag>
              <span className="text-slate-400">|</span>
              <span className="text-slate-500">提交于 {relativeTime(pending[0].submittedAt)}</span>
            </div>
          </div>
          <div className="gov-card-body grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div>
                <div className="text-xs text-slate-500 mb-1">企业信息</div>
                <div className="text-lg font-semibold text-slate-900">{pending[0].enterpriseName}</div>
                <div className="text-xs text-slate-500 mt-1">
                  {INDUSTRIES.find((i) => i.code === pending[0].industryCode)?.name} ·
                  {DISTRICTS.find((d) => d.code === pending[0].districtCode)?.name} ·
                  规模: {pending[0].scale}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-slate-500 mb-1">申请券种</div>
                  <div className="flex items-center gap-2">
                    <Tag color={pending[0].voucherType === "TOKEN" ? "blue" : "purple"}>
                      {VOUCHER_TYPES.find((v) => v.code === pending[0].voucherType)?.name}
                    </Tag>
                    <span className="digital text-lg font-semibold text-slate-800">
                      {pending[0].voucherType === "TOKEN" ? formatToken(pending[0].requestedAmount) : formatNumber(pending[0].requestedAmount)} {pending[0].unit}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">应用场景</div>
                  <div className="text-sm text-slate-800">{pending[0].scenario}</div>
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">申请理由</div>
                <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-3 rounded">{pending[0].reason}</p>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-2">附件</div>
                <div className="flex items-center gap-2 flex-wrap">
                  {pending[0].attachments.map((f) => (
                    <a key={f} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded text-xs text-slate-700 cursor-pointer">
                      <FileText className="w-3 h-3" />
                      {f}
                    </a>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="text-xs text-slate-500 mb-1">关联政策</div>
              {pending[0].policyId && (() => {
                const pol = policies.find((p) => p.id === pending[0].policyId);
                return pol ? (
                  <div className="bg-blue-50 border border-blue-200 rounded p-3">
                    <div className="text-xs text-blue-600 font-mono">{pol.code}</div>
                    <div className="text-sm font-medium text-slate-800 mt-1">{pol.title}</div>
                    <div className="text-xs text-slate-500 mt-1">配套预算 {formatNumber(pol.budget)} 元</div>
                  </div>
                ) : null;
              })()}

              <div className="text-xs text-slate-500 mb-1 mt-4">审批操作</div>
              <div className="space-y-2">
                <button className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm font-medium flex items-center justify-center gap-2">
                  <Check className="w-4 h-4" />
                  通过申请（按申请额）
                </button>
                <button className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium flex items-center justify-center gap-2">
                  <Check className="w-4 h-4" />
                  通过申请（按 70%）
                </button>
                <button className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded text-sm font-medium flex items-center justify-center gap-2">
                  <Edit3 className="w-4 h-4" />
                  退回补正
                </button>
                <button className="w-full py-2 bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 rounded text-sm font-medium flex items-center justify-center gap-2">
                  <X className="w-4 h-4" />
                  拒绝申请
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
