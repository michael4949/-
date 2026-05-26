import { getStore } from "@/lib/data/store";
import { getDemoEnterprise } from "@/lib/data/personas";
import { VOUCHER_TYPES, INDUSTRIES, DISTRICTS } from "@/lib/constants";
import { formatNumber, formatCurrency, formatDate, relativeTime } from "@/lib/utils";
import { Tag } from "@/components/ui/Tag";
import { Wallet, Cpu, Coins, Database, BookOpen, FileText, Upload, ChevronRight, CheckCircle2, Clock, XCircle, Edit3 } from "lucide-react";

export default function ApplyVoucherPage() {
  const s = getStore();
  const me = getDemoEnterprise();
  const ind = INDUSTRIES.find((i) => i.code === me.industryCode);
  const dis = DISTRICTS.find((d) => d.code === me.districtCode);
  const myApps = s.voucherApps.filter((a) => a.enterpriseId === me.id);
  const matchingPolicies = s.policies.filter((p) => p.industryTargets.includes(me.industryCode)).slice(0, 3);

  const iconMap: Record<string, React.ReactNode> = {
    TOKEN: <Wallet className="w-6 h-6" />,
    COMPUTE: <Cpu className="w-6 h-6" />,
    MODEL: <Coins className="w-6 h-6" />,
    DATA: <Database className="w-6 h-6" />,
    CORPUS: <BookOpen className="w-6 h-6" />,
  };

  const statusMeta: Record<string, { color: "amber" | "green" | "red" | "purple"; icon: React.ReactNode; label: string }> = {
    PENDING: { color: "amber", icon: <Clock className="w-3 h-3" />, label: "待审批" },
    APPROVED: { color: "green", icon: <CheckCircle2 className="w-3 h-3" />, label: "已通过" },
    REJECTED: { color: "red", icon: <XCircle className="w-3 h-3" />, label: "已拒绝" },
    REVISION: { color: "purple", icon: <Edit3 className="w-3 h-3" />, label: "需补正" },
  };

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">申请用券</h1>
        <p className="text-sm text-slate-500 mt-1">五券一体 · 申请 → 审批 → 发放 → 使用 全流程线上化</p>
      </div>

      {/* 选择券种 */}
      <div>
        <div className="text-xs text-slate-500 mb-3 font-medium tracking-wider uppercase">第一步：选择申请券种</div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {VOUCHER_TYPES.map((t) => (
            <button key={t.code} className="gov-card hover:border-blue-300 hover:shadow-md transition-all text-left p-4 cursor-pointer group">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded bg-blue-100 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition">
                  {iconMap[t.code]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-800 text-sm">{t.name}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 truncate-2 leading-relaxed">{t.desc}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 申请表单 + 政策推荐 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 gov-card">
          <div className="gov-card-header"><h2 className="font-semibold text-slate-900">第二步：填写申请信息</h2></div>
          <div className="gov-card-body space-y-4">
            {/* 自动带入企业信息 */}
            <div className="bg-blue-50/40 border border-blue-200/50 rounded p-3">
              <div className="text-xs text-blue-700 font-medium mb-2">企业信息（已自动带入，无需手动填写）</div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-[10px] text-slate-500">企业名称</div>
                  <div className="text-slate-800 font-medium">{me.name}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">统一社会信用代码</div>
                  <div className="text-slate-800 font-mono text-xs">{me.uscc}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">所属行业</div>
                  <div className="text-slate-800">{ind?.name}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">区县</div>
                  <div className="text-slate-800">{dis?.name}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="申请券种">
                <select className="w-full px-3 py-2 rounded border border-slate-200 text-sm bg-white focus:outline-none focus:border-blue-400">
                  <option>Token 券</option>
                  <option>算力券</option>
                  <option>模型券</option>
                </select>
              </Field>
              <Field label="申请额度">
                <div className="flex items-center gap-2">
                  <input type="text" placeholder="例如：100" className="flex-1 px-3 py-2 rounded border border-slate-200 text-sm focus:outline-none focus:border-blue-400 digital" defaultValue="500" />
                  <span className="text-sm text-slate-500">万 Token</span>
                </div>
              </Field>
            </div>

            <Field label="应用场景">
              <select className="w-full px-3 py-2 rounded border border-slate-200 text-sm bg-white focus:outline-none focus:border-blue-400">
                <option>智能客服升级</option>
                <option>工业 AI 质检</option>
                <option>AI 知识库建设</option>
                <option>智能调度优化</option>
                <option>代码智能补全</option>
              </select>
            </Field>

            <Field label="使用计划与申请理由">
              <textarea
                className="w-full px-3 py-2 rounded border border-slate-200 text-sm focus:outline-none focus:border-blue-400 leading-relaxed"
                rows={5}
                defaultValue={`${me.name}计划将大模型能力深度集成至本公司核心生产质检流程，预计可降低人工质检成本 30%、缩短发现到处置时间 60%。本次申请用于支撑前 3 个月的试点上线及小规模推广，已与多家服务商完成技术对接。`}
              />
            </Field>

            <Field label="附件材料">
              <div className="border border-dashed border-slate-300 rounded p-4 bg-slate-50/50">
                <div className="flex flex-wrap gap-2 mb-2">
                  <FileChip name="营业执照.pdf" />
                  <FileChip name="高新企业证书.pdf" />
                  <FileChip name="AI 应用计划书.pdf" />
                  <FileChip name="服务商对接证明.pdf" />
                </div>
                <button className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
                  <Upload className="w-3.5 h-3.5" />
                  上传更多附件
                </button>
              </div>
            </Field>

            <Field label="关联政策（推荐自动匹配）">
              <div className="space-y-2">
                {matchingPolicies.map((p, i) => (
                  <label key={p.id} className="flex items-start gap-2 p-3 border border-slate-200 rounded cursor-pointer hover:bg-slate-50">
                    <input type="radio" name="policy" defaultChecked={i === 0} className="mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-800">{p.title}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
                        <span className="font-mono">{p.code}</span>
                        <span>· {p.issuer}</span>
                        <span>· 预算 {formatCurrency(p.budget)}</span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </Field>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <div className="text-xs text-slate-500">
                提交后将进入区/市两级审批流程，预计 1-3 个工作日完成审核。
              </div>
              <div className="flex items-center gap-2">
                <button className="btn-secondary">保存草稿</button>
                <button className="btn-primary"><FileText className="w-4 h-4" />提交申请</button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* 历史申请 */}
          <div className="gov-card">
            <div className="gov-card-header"><h2 className="font-semibold text-slate-900">我的申请历史</h2></div>
            <div className="divide-y divide-slate-100">
              {myApps.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-slate-500">暂无历史申请</div>
              ) : (
                myApps.slice(0, 5).map((a) => {
                  const m = statusMeta[a.status];
                  return (
                    <div key={a.id} className="px-5 py-3">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-mono text-[10px] text-slate-500">{a.applicationCode}</span>
                        <Tag color={m.color}>{m.icon}{m.label}</Tag>
                      </div>
                      <div className="text-sm text-slate-800 truncate">{a.scenario}</div>
                      <div className="text-[10px] text-slate-500 mt-1 digital">
                        {formatNumber(a.requestedAmount)} {a.unit} · {relativeTime(a.submittedAt)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 帮助 */}
          <div className="gov-card">
            <div className="gov-card-header"><h2 className="font-semibold text-slate-900">填写指引</h2></div>
            <div className="px-5 py-3 space-y-3 text-sm text-slate-600">
              <Tip num={1}>选择最贴近实际场景的应用方向，系统将自动匹配合适的政策与配套预算。</Tip>
              <Tip num={2}>申请理由需明确"业务价值 + 预期效果 + 量化指标"，通过率显著更高。</Tip>
              <Tip num={3}>"专精特新""高新技术企业"等资质会自动加分，可叠加享受 1.2x 额度。</Tip>
              <Tip num={4}>同一企业每月可累计申请不超过 5 单，建议合并相同场景需求。</Tip>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-slate-600 mb-1.5 block font-medium">
        {label} <span className="text-red-500">*</span>
      </label>
      {children}
    </div>
  );
}

function FileChip({ name }: { name: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded text-xs text-slate-700">
      <FileText className="w-3 h-3 text-blue-500" />
      {name}
      <button className="text-slate-400 hover:text-red-500 ml-1">×</button>
    </div>
  );
}

function Tip({ num, children }: { num: number; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">{num}</span>
      <div className="text-xs leading-relaxed">{children}</div>
    </div>
  );
}
