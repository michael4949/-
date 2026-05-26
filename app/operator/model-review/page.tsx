import { getStore } from "@/lib/data/store";
import { formatToken, formatPercent, formatDate } from "@/lib/utils";
import { Tag } from "@/components/ui/Tag";
import { Check, X, AlertTriangle, ShieldCheck, FileSearch, Cpu, Activity, Zap } from "lucide-react";

export default function ModelReviewPage() {
  const s = getStore();
  const reviewing = s.models.filter((m) => m.status === "BETA").slice(0, 5);

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">模型上架审核</h1>
        <p className="text-sm text-slate-500 mt-1">合规审核 · 安全测试 · 性能基线 · 全部通过方可上架</p>
      </div>

      <div className="space-y-4">
        {reviewing.map((m) => (
          <div key={m.code} className="gov-card">
            <div className="p-5">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
                  {m.name.split('-')[0].slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-slate-900">{m.name}</h3>
                    <Tag color="amber" dot>审核中</Tag>
                    <Tag color="purple">{m.type}</Tag>
                  </div>
                  <div className="text-sm text-slate-500">{m.vendor} · 提交于 {formatDate(m.enrolledAt)}</div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
                    <CheckItem title="资质合规" status="pass" detail="备案号 已核验" />
                    <CheckItem title="安全测试" status="pass" detail="红队 1124 个 case 通过" />
                    <CheckItem title="性能基线" status="pending" detail={`P99 ${m.latency}ms`} />
                    <CheckItem title="价格透明" status="pass" detail={`入 ${m.priceIn} · 出 ${m.priceOut}`} />
                    <CheckItem title="文档完备" status="warn" detail="缺少 RAG 示例" />
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2">
                    <button className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1"><FileSearch className="w-3.5 h-3.5" />查看完整报告</button>
                    <div className="flex-1" />
                    <button className="px-3 py-1.5 text-xs text-rose-700 bg-white border border-rose-200 hover:bg-rose-50 rounded flex items-center gap-1"><X className="w-3.5 h-3.5" />拒绝</button>
                    <button className="px-3 py-1.5 text-xs text-amber-700 bg-white border border-amber-200 hover:bg-amber-50 rounded flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" />退回补充</button>
                    <button className="px-3 py-1.5 text-xs text-white bg-emerald-600 hover:bg-emerald-700 rounded flex items-center gap-1"><Check className="w-3.5 h-3.5" />通过上架</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CheckItem({ title, status, detail }: { title: string; status: "pass" | "pending" | "warn"; detail: string }) {
  const cfg = {
    pass: { color: "emerald", icon: <Check className="w-4 h-4" />, label: "已通过" },
    pending: { color: "blue", icon: <Activity className="w-4 h-4" />, label: "测试中" },
    warn: { color: "amber", icon: <AlertTriangle className="w-4 h-4" />, label: "待处理" },
  }[status];
  return (
    <div className={`p-2.5 rounded border bg-${cfg.color}-50/40 border-${cfg.color}-200`}>
      <div className={`flex items-center gap-1.5 text-${cfg.color}-700 mb-1`}>
        {cfg.icon}
        <span className="text-xs font-medium">{title}</span>
      </div>
      <div className="text-[10px] text-slate-600">{detail}</div>
    </div>
  );
}
