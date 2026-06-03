import React, { useMemo, useState } from "react";
import { filings as INITIAL, PERIOD } from "./data/mockData";
import { Filing, FilingStatus, ViewId } from "./types";
import Sidebar from "./components/tax/Sidebar";
import Topbar from "./components/tax/Topbar";
import Dashboard from "./components/tax/Dashboard";
import AutoFileAgent from "./components/tax/AutoFileAgent";
import FilingWorkspace from "./components/tax/FilingWorkspace";
import RiskCenter from "./components/tax/RiskCenter";
import OptimizationCenter from "./components/tax/OptimizationCenter";
import InvoiceCenter from "./components/tax/InvoiceCenter";
import Copilot from "./components/tax/Copilot";

const ACTION_TEXT: Record<string, string> = {
  待审批: "复核通过，提交审批",
  可申报: "审批通过",
  已申报: "审批通过并一键申报至电子税务局",
  已缴款: "扣款成功，缴款完成",
};

const VIEW_META: Partial<Record<ViewId, { title: string; sub: string }>> = {
  filings: { title: "申报工作台", sub: "全集团申报事项 · 制单 → 复核 → 审批 → 申报，全程可溯源、可留痕" },
  risk: { title: "风险中心", sub: "金税四期风险扫描 · 税负率体检 · 智能体处置建议" },
  saving: { title: "节税优化", sub: "政策智能匹配 · 加计扣除 / 留抵退税 / 税率优惠，已量化收益" },
  invoice: { title: "发票中心", sub: "数电发票进销项 · 验真匹配 · 认证抵扣 · 异常处置" },
};

const App: React.FC = () => {
  const [view, setView] = useState<ViewId>("dashboard");
  const [scope, setScope] = useState<string>("all");
  const [filings, setFilings] = useState<Filing[]>(INITIAL);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const pending = useMemo(
    () => filings.filter((f) => f.period === PERIOD && f.status !== "已申报" && f.status !== "已缴款").length,
    [filings]
  );

  const onAct = (id: string, to: FilingStatus, who: string) => {
    const at = "2026-06-03 " + new Date().toTimeString().slice(0, 5);
    setFilings((fs) =>
      fs.map((f) =>
        f.id === id
          ? { ...f, status: to, updatedAt: at, audit: [...f.audit, { at, who, action: ACTION_TEXT[to] || `状态更新为 ${to}` }] }
          : f
      )
    );
  };

  const openFiling = (id: string) => { setSelectedId(id); setView("filings"); };

  const meta = VIEW_META[view];

  return (
    <div className="min-h-screen bg-page flex">
      <Sidebar view={view} onNav={setView} pending={pending} riskHigh={2} />

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar scope={scope} setScope={setScope} onNav={setView} />

        <main className="flex-1 px-6 py-6 max-w-[1400px] w-full mx-auto">
          {meta && (
            <div className="mb-5">
              <h1 className="text-xl font-extrabold text-ink">{meta.title}</h1>
              <p className="text-sm text-ink-muted mt-0.5">{meta.sub}</p>
            </div>
          )}

          {view === "dashboard" && <Dashboard scope={scope} filings={filings} onNav={setView} onOpenFiling={openFiling} />}
          {view === "agent" && <AutoFileAgent scope={scope} onNav={setView} />}
          {view === "filings" && (
            <FilingWorkspace scope={scope} filings={filings} selectedId={selectedId} setSelectedId={setSelectedId} onAct={onAct} />
          )}
          {view === "risk" && <RiskCenter scope={scope} />}
          {view === "saving" && <OptimizationCenter scope={scope} />}
          {view === "invoice" && <InvoiceCenter />}
        </main>

        <footer className="text-center text-ink-faint text-[11px] py-5 px-4 border-t border-line">
          税擎 TaxPilot · AI 税务自动申报中枢 · 演示环境，数据为虚构样例 · 申报前请由税务负责人复核确认
        </footer>
      </div>

      <Copilot />
    </div>
  );
};

export default App;
