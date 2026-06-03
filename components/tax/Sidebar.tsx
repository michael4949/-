import React from "react";
import {
  LayoutDashboard, Bot, FileSpreadsheet, ShieldAlert, Sparkles,
  ReceiptText, Settings, ChevronRight, ShieldCheck,
} from "lucide-react";
import { ViewId } from "../../types";
import { cx } from "./ui";

const NAV: { id: ViewId; label: string; icon: React.ElementType; badge?: string }[] = [
  { id: "dashboard", label: "税务驾驶舱", icon: LayoutDashboard },
  { id: "agent", label: "AI 自动申报", icon: Bot, badge: "核心" },
  { id: "filings", label: "申报工作台", icon: FileSpreadsheet },
  { id: "risk", label: "风险中心", icon: ShieldAlert },
  { id: "saving", label: "节税优化", icon: Sparkles },
  { id: "invoice", label: "发票中心", icon: ReceiptText },
];

const Sidebar: React.FC<{
  view: ViewId;
  onNav: (v: ViewId) => void;
  pending: number;
  riskHigh: number;
}> = ({ view, onNav, pending, riskHigh }) => {
  const counts: Partial<Record<ViewId, number>> = { filings: pending, risk: riskHigh };
  return (
    <aside className="w-[244px] shrink-0 h-screen sticky top-0 bg-white border-r border-line flex flex-col">
      {/* Logo */}
      <div className="px-5 h-16 flex items-center gap-2.5 border-b border-line">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand to-violet2 flex items-center justify-center shadow-soft">
          <ShieldCheck className="w-5 h-5 text-white" strokeWidth={2.4} />
        </div>
        <div className="leading-tight">
          <div className="font-extrabold text-ink tracking-tight">税擎 <span className="text-brand">TaxPilot</span></div>
          <div className="text-[10px] text-ink-muted">AI 税务自动申报中枢</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto no-scrollbar">
        <div className="px-2 text-[10px] font-semibold text-ink-faint tracking-wider mb-1">工作区</div>
        {NAV.map((n) => {
          const active = view === n.id;
          const c = counts[n.id];
          return (
            <button key={n.id} onClick={() => onNav(n.id)}
              className={cx(
                "w-full group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                active ? "bg-brand text-white shadow-soft" : "text-ink-soft hover:bg-page"
              )}>
              <n.icon className={cx("w-[18px] h-[18px]", active ? "text-white" : "text-ink-muted group-hover:text-brand")} strokeWidth={2.1} />
              <span className="flex-1 text-left">{n.label}</span>
              {n.badge && !active && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-violet2-soft text-violet2">{n.badge}</span>
              )}
              {c ? (
                <span className={cx("text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center",
                  active ? "bg-white/25 text-white" : n.id === "risk" ? "bg-danger text-white" : "bg-brand-50 text-brand")}>
                  {c}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      {/* 合规卡片 */}
      <div className="px-3 pb-3">
        <div className="rounded-xl bg-gradient-to-br from-[#0F1729] to-[#27324B] p-4 text-white relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-20 h-20 rounded-full bg-white/5" />
          <div className="flex items-center gap-2 text-xs font-semibold text-white/80">
            <ShieldCheck className="w-4 h-4" /> 金税四期合规
          </div>
          <div className="mt-2 flex items-end gap-1">
            <span className="text-3xl font-extrabold tnum">86</span>
            <span className="text-white/50 text-sm mb-1">/ 100 分</span>
          </div>
          <div className="mt-1 text-[11px] text-white/55">较上月 ▲ 4 分 · 风险可控</div>
        </div>
      </div>

      <button className="px-5 h-12 border-t border-line flex items-center gap-2.5 text-sm text-ink-muted hover:text-ink hover:bg-page transition-colors">
        <Settings className="w-[18px] h-[18px]" /> 数据源与设置 <ChevronRight className="w-4 h-4 ml-auto" />
      </button>
    </aside>
  );
};

export default Sidebar;
