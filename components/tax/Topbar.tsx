import React, { useState } from "react";
import { Search, Bell, ChevronDown, CalendarClock, Building2, Check, Bot } from "lucide-react";
import { entities, PERIOD_LABEL, DUE_DATE, daysUntil, GROUP_NAME } from "../../data/mockData";
import { ViewId } from "../../types";
import { cx } from "./ui";

const Topbar: React.FC<{
  scope: string;
  setScope: (id: string) => void;
  onNav: (v: ViewId) => void;
}> = ({ scope, setScope, onNav }) => {
  const [open, setOpen] = useState(false);
  const left = daysUntil(DUE_DATE);
  const current = scope === "all" ? `${GROUP_NAME}（全部主体）` : entities.find((e) => e.id === scope)?.name;

  return (
    <header className="h-16 sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-line flex items-center gap-4 px-6">
      {/* 主体选择 */}
      <div className="relative">
        <button onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2.5 pl-2.5 pr-3 py-1.5 rounded-xl border border-line hover:border-brand/40 hover:bg-page transition-colors">
          <div className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-brand" />
          </div>
          <div className="text-left leading-tight">
            <div className="text-[13px] font-bold text-ink max-w-[200px] truncate">{current}</div>
            <div className="text-[10px] text-ink-muted">所属期 {PERIOD_LABEL}</div>
          </div>
          <ChevronDown className={cx("w-4 h-4 text-ink-muted transition-transform", open && "rotate-180")} />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute left-0 mt-2 w-72 bg-white rounded-xl border border-line shadow-pop z-20 p-1.5 animate-fadeup">
              <div className="px-2.5 py-1.5 text-[10px] font-semibold text-ink-faint tracking-wider">纳税主体范围</div>
              {[{ id: "all", name: `${GROUP_NAME}（全部主体）`, sub: "6 家法人主体合并视图" },
                ...entities.map((e) => ({ id: e.id, name: e.name, sub: `${e.region} · ${e.vatType}` }))].map((o) => (
                <button key={o.id} onClick={() => { setScope(o.id); setOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-page text-left">
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-ink truncate">{o.name}</div>
                    <div className="text-[11px] text-ink-muted truncate">{o.sub}</div>
                  </div>
                  {scope === o.id && <Check className="w-4 h-4 text-brand" />}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 搜索 */}
      <div className="hidden lg:flex items-center gap-2 flex-1 max-w-md px-3 py-2 rounded-xl bg-page border border-transparent focus-within:border-brand/30">
        <Search className="w-4 h-4 text-ink-faint" />
        <input placeholder="搜索申报事项、发票、政策、风险…"
          className="bg-transparent outline-none text-sm flex-1 placeholder:text-ink-faint" />
      </div>

      <div className="flex-1 lg:hidden" />

      {/* 申报倒计时 */}
      <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-warning-soft text-warning">
        <CalendarClock className="w-4 h-4" />
        <span className="text-xs font-semibold">距申报截止 <b className="tnum">{left}</b> 天</span>
      </div>

      {/* 启动智能体 */}
      <button onClick={() => onNav("agent")}
        className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-brand hover:bg-brand-600 text-white text-sm font-semibold shadow-soft transition-colors">
        <Bot className="w-4 h-4" /> <span className="hidden md:inline">启动</span>自动申报
      </button>

      {/* 通知 */}
      <button className="relative w-9 h-9 rounded-xl hover:bg-page flex items-center justify-center text-ink-soft">
        <Bell className="w-[18px] h-[18px]" />
        <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-danger ring-2 ring-white" />
      </button>

      {/* 用户 */}
      <div className="flex items-center gap-2.5 pl-3 border-l border-line">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand to-teal2 flex items-center justify-center text-white text-xs font-bold">王</div>
        <div className="leading-tight hidden md:block">
          <div className="text-[13px] font-semibold text-ink">王浩</div>
          <div className="text-[10px] text-ink-muted">集团税务经理</div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
