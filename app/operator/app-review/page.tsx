import { getStore } from "@/lib/data/store";
import { formatNumber, formatDate } from "@/lib/utils";
import { Tag } from "@/components/ui/Tag";
import { Check, X, AlertTriangle, Star, Eye } from "lucide-react";

export default function AppReviewPage() {
  const s = getStore();
  const pending = s.apps.filter((a) => a.status === "PENDING").slice(0, 12);

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">应用上架审核</h1>
        <p className="text-sm text-slate-500 mt-1">应用市场质量把关 · 标准化审核流程</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {pending.map((app) => (
          <div key={app.id} className="gov-card">
            <div className="p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-semibold" style={{ background: app.cover }}>
                  {app.name.slice(0, 1)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-semibold text-slate-900">{app.name}</h3>
                    <Tag color="amber" dot>审核中</Tag>
                  </div>
                  <div className="text-xs text-slate-500">{app.vendor} · {app.category} · 提交于 {formatDate(app.publishedAt)}</div>
                </div>
              </div>

              <div className="text-sm text-slate-600 leading-relaxed mb-3 line-clamp-2">{app.description}</div>

              <div className="flex items-center gap-1 mb-4 flex-wrap">
                {app.tags.map((t: string) => <Tag key={t} color="slate">{t}</Tag>)}
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                <ChecklistItem label="内容合规" pass />
                <ChecklistItem label="资质完备" pass />
                <ChecklistItem label="演示视频" pending />
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                <button className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1"><Eye className="w-3.5 h-3.5" />详情</button>
                <div className="flex-1" />
                <button className="px-3 py-1.5 text-xs text-rose-700 bg-white border border-rose-200 hover:bg-rose-50 rounded"><X className="w-3.5 h-3.5 inline mr-1" />拒绝</button>
                <button className="px-3 py-1.5 text-xs text-amber-700 bg-white border border-amber-200 hover:bg-amber-50 rounded"><AlertTriangle className="w-3.5 h-3.5 inline mr-1" />补正</button>
                <button className="px-3 py-1.5 text-xs text-white bg-emerald-600 hover:bg-emerald-700 rounded"><Check className="w-3.5 h-3.5 inline mr-1" />上架</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChecklistItem({ label, pass, pending }: { label: string; pass?: boolean; pending?: boolean }) {
  return (
    <div className="flex items-center gap-1.5 p-2 rounded bg-slate-50">
      <span className={`w-1.5 h-1.5 rounded-full ${pass ? "bg-emerald-500" : pending ? "bg-amber-500 animate-pulse" : "bg-rose-500"}`} />
      <span className="text-xs text-slate-700">{label}</span>
    </div>
  );
}
