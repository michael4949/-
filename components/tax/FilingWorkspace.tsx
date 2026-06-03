import React, { useMemo, useState } from "react";
import {
  X, Search, FileSpreadsheet, ShieldCheck, Send, CheckCircle2, Eye,
  ChevronRight, Sparkles, Building2, AlertTriangle, Wallet, History,
  Database, FileCheck2, Stamp, BadgeCheck, Banknote,
} from "lucide-react";
import {
  entityById, fmtCNY, fmtCNYWan, PERIOD_LABEL, taxKindColor,
} from "../../data/mockData";
import { Filing, FilingStatus, FilingLine, TaxKind } from "../../types";
import { Card, StatusBadge, RiskBadge, ProgressBar, Badge, IconBox, cx } from "./ui";

const KINDS: TaxKind[] = ["增值税及附加", "企业所得税", "个人所得税", "印花税"];
const STATUSES: FilingStatus[] = ["待采集", "AI已生成", "待复核", "待审批", "可申报", "已申报", "已缴款"];

const stageIndex = (s: FilingStatus): number =>
  ({ 待采集: 0, AI已生成: 1, 待复核: 1, 待审批: 2, 可申报: 3, 已申报: 4, 已缴款: 4 } as Record<FilingStatus, number>)[s];

const nextAction = (s: FilingStatus): { label: string; to: FilingStatus; who: string; icon: React.ElementType } | null => {
  switch (s) {
    case "AI已生成":
    case "待复核": return { label: "复核通过 · 提交审批", to: "待审批", who: "李静（税务专员）", icon: FileCheck2 };
    case "待审批": return { label: "审批通过", to: "可申报", who: "王浩（税务经理）", icon: BadgeCheck };
    case "可申报": return { label: "一键申报至电子税务局", to: "已申报", who: "王浩（税务经理）", icon: Send };
    case "已申报": return { label: "确认扣款完成", to: "已缴款", who: "电子税务局", icon: Banknote };
    default: return null;
  }
};

const LINE_STYLE: Record<string, string> = {
  out: "text-ink", in: "text-teal2", calc: "text-ink-soft italic", sub: "text-ink-muted pl-4", result: "",
};

// 审批流四阶段
const FlowStepper: React.FC<{ status: FilingStatus }> = ({ status }) => {
  const cur = stageIndex(status);
  const final = status === "已申报" || status === "已缴款";
  const stages = [
    { label: "智能体制单", icon: Sparkles },
    { label: "专员复核", icon: FileCheck2 },
    { label: "经理审批", icon: BadgeCheck },
    { label: "申报缴款", icon: Send },
  ];
  return (
    <div className="flex items-center">
      {stages.map((st, i) => {
        const done = i < cur || final;
        const active = i === cur && !final;
        return (
          <React.Fragment key={i}>
            <div className="flex flex-col items-center gap-1.5 w-[68px]">
              <div className={cx("w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all",
                done ? "bg-success border-success text-white" : active ? "bg-brand border-brand text-white" : "bg-white border-line text-ink-faint")}>
                {done ? <CheckCircle2 className="w-5 h-5" /> : <st.icon className="w-[18px] h-[18px]" />}
              </div>
              <span className={cx("text-[10px] text-center leading-tight", done || active ? "text-ink font-semibold" : "text-ink-faint")}>{st.label}</span>
            </div>
            {i < stages.length - 1 && <div className={cx("flex-1 h-0.5 -mt-5 rounded", i < cur || final ? "bg-success" : "bg-line")} />}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// 税表抽屉
const FilingDrawer: React.FC<{
  filing: Filing; onClose: () => void; onAct: (id: string, to: FilingStatus, who: string) => void;
}> = ({ filing, onClose, onAct }) => {
  const e = entityById(filing.entityId);
  const act = nextAction(filing.status);
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm animate-fadeup" onClick={onClose} />
      <div className="relative w-full max-w-[560px] h-full bg-page shadow-pop overflow-y-auto"
        style={{ animation: "fadeup .3s both" }}>
        {/* 头 */}
        <div className="sticky top-0 z-10 bg-white border-b border-line px-5 py-4 flex items-start gap-3">
          <IconBox tone="brand" size={42}><FileSpreadsheet className="w-5 h-5" /></IconBox>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-ink">{filing.formName}</h3>
              <StatusBadge status={filing.status} />
            </div>
            <p className="text-xs text-ink-muted mt-0.5">{e.name} · 所属期 {filing.period === "2026-05" ? PERIOD_LABEL : filing.period} · 截止 {filing.dueDate}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-page flex items-center justify-center text-ink-muted"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* 应纳税额 + 风险 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl border border-line p-4">
              <div className="text-xs text-ink-muted flex items-center gap-1"><Wallet className="w-3.5 h-3.5" /> 本期应纳税额</div>
              <div className="text-2xl font-extrabold text-ink tnum mt-1">{fmtCNY(filing.payable)}</div>
            </div>
            <div className="bg-white rounded-xl border border-line p-4">
              <div className="text-xs text-ink-muted flex items-center gap-1"><Database className="w-3.5 h-3.5" /> 数据完整度</div>
              <div className="flex items-center gap-2 mt-2.5">
                <ProgressBar value={filing.completeness} tone={filing.completeness >= 100 ? "#0FA968" : "#E08600"} />
                <span className="text-sm font-bold text-ink tnum">{filing.completeness}%</span>
              </div>
              <div className="mt-2">{filing.risk !== "none" ? <RiskBadge level={filing.risk} /> : <span className="text-xs text-success font-semibold">✓ 无异常</span>}</div>
            </div>
          </div>

          {/* 审批流 */}
          <div className="bg-white rounded-xl border border-line p-4">
            <div className="text-xs font-semibold text-ink-muted mb-3">审批流 · 人在环路</div>
            <FlowStepper status={filing.status} />
          </div>

          {/* 税表明细（可溯源）*/}
          <div className="bg-white rounded-xl border border-line overflow-hidden">
            <div className="px-4 py-2.5 border-b border-line flex items-center justify-between">
              <span className="text-sm font-bold text-ink">申报表明细</span>
              <Badge tone="violet"><Sparkles className="w-3 h-3" /> AI 自动填列</Badge>
            </div>
            <div className="divide-y divide-line">
              {filing.lines.map((ln, i) => (
                <div key={i} className={cx("px-4 py-2.5", ln.kind === "result" && "bg-brand-50")}>
                  <div className="flex items-center justify-between gap-3">
                    <span className={cx("text-sm", ln.kind === "result" ? "font-bold text-ink" : LINE_STYLE[ln.kind || "out"])}>{ln.label}</span>
                    <span className={cx("text-sm tnum tabular-nums", ln.kind === "result" ? "font-extrabold text-brand text-base" : ln.kind === "in" ? "text-teal2 font-semibold" : "font-semibold text-ink")}>
                      {ln.kind === "in" ? "−" : ""}{fmtCNY(ln.value)}
                    </span>
                  </div>
                  {(ln.source || ln.note) && (
                    <div className="mt-1 flex items-start gap-1.5">
                      {ln.source && <span className="text-[10px] text-ink-muted inline-flex items-center gap-1 bg-page rounded px-1.5 py-0.5"><History className="w-3 h-3" />溯源：{ln.source}</span>}
                      {ln.note && <span className="text-[10px] text-ink-muted">{ln.note}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 审计留痕 */}
          <div className="bg-white rounded-xl border border-line p-4">
            <div className="text-xs font-semibold text-ink-muted mb-3 flex items-center gap-1"><History className="w-3.5 h-3.5" /> 审计留痕</div>
            <div className="space-y-3">
              {filing.audit.map((a, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={cx("w-2.5 h-2.5 rounded-full mt-1", a.who === "AI智能体" ? "bg-violet2" : a.who === "电子税务局" ? "bg-success" : "bg-brand")} />
                    {i < filing.audit.length - 1 && <div className="w-0.5 flex-1 bg-line my-1" />}
                  </div>
                  <div className="pb-1">
                    <div className="text-xs text-ink"><b>{a.who}</b> {a.action}</div>
                    <div className="text-[10px] text-ink-faint mt-0.5">{a.at}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 操作条 */}
        <div className="sticky bottom-0 bg-white border-t border-line px-5 py-3.5 flex items-center gap-3">
          <div className="flex-1 text-xs text-ink-muted">
            {filing.status === "已缴款" ? "✓ 已申报并完成缴款" : act ? `下一步由 ${act.who} 操作` : "等待二季度账务结账后自动测算"}
          </div>
          {act && (
            <button onClick={() => onAct(filing.id, act.to, act.who)}
              className={cx("inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-white transition-colors",
                act.to === "已申报" ? "bg-success hover:opacity-90" : "bg-brand hover:bg-brand-600")}>
              <act.icon className="w-4 h-4" /> {act.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const FilingWorkspace: React.FC<{
  scope: string;
  filings: Filing[];
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  onAct: (id: string, to: FilingStatus, who: string) => void;
}> = ({ scope, filings, selectedId, setSelectedId, onAct }) => {
  const [kind, setKind] = useState<TaxKind | "all">("all");
  const [status, setStatus] = useState<FilingStatus | "all">("all");
  const [q, setQ] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const list = useMemo(() => filings.filter((f) =>
    (scope === "all" || f.entityId === scope) &&
    (kind === "all" || f.taxKind === kind) &&
    (status === "all" || f.status === status) &&
    (q === "" || entityById(f.entityId).name.includes(q) || f.formName.includes(q) || f.taxKind.includes(q))
  ), [filings, scope, kind, status, q]);

  const fileable = list.filter((f) => f.status === "可申报");
  const reviewable = list.filter((f) => f.status === "AI已生成" || f.status === "待复核");

  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2600); };
  const handleAct = (id: string, to: FilingStatus, who: string) => {
    onAct(id, to, who);
    if (to === "已申报") flash("✓ 已申报至电子税务局");
    else if (to === "待审批") flash("✓ 已提交审批");
    else if (to === "可申报") flash("✓ 审批通过");
  };
  const batch = (from: FilingStatus[], to: FilingStatus, who: string, msg: string) => {
    list.filter((f) => from.includes(f.status)).forEach((f) => onAct(f.id, to, who));
    flash(msg);
  };

  const selected = filings.find((f) => f.id === selectedId) || null;

  return (
    <div className="space-y-4">
      {/* 操作栏 */}
      <Card pad={false}>
        <div className="p-4 flex flex-wrap items-center gap-3 border-b border-line">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-page flex-1 min-w-[200px] max-w-xs">
            <Search className="w-4 h-4 text-ink-faint" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索主体 / 税种 / 申报表"
              className="bg-transparent outline-none text-sm flex-1 placeholder:text-ink-faint" />
          </div>
          <select value={kind} onChange={(e) => setKind(e.target.value as any)} className="text-sm bg-white border border-line rounded-xl px-3 py-2 text-ink-soft outline-none">
            <option value="all">全部税种</option>
            {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="text-sm bg-white border border-line rounded-xl px-3 py-2 text-ink-soft outline-none">
            <option value="all">全部状态</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="flex-1" />
          <button disabled={!reviewable.length} onClick={() => batch(["AI已生成", "待复核"], "待审批", "李静（税务专员）", "✓ 已批量提交审批")}
            className={cx("inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-xl transition-colors",
              reviewable.length ? "bg-white border border-line hover:border-brand/40 text-ink" : "bg-page text-ink-faint cursor-not-allowed")}>
            <FileCheck2 className="w-4 h-4" /> 批量复核 ({reviewable.length})
          </button>
          <button disabled={!fileable.length} onClick={() => batch(["可申报"], "已申报", "王浩（税务经理）", `✓ 已一键申报 ${fileable.length} 项`)}
            className={cx("inline-flex items-center gap-1.5 text-sm font-semibold px-3.5 py-2 rounded-xl transition-colors",
              fileable.length ? "bg-brand hover:bg-brand-600 text-white shadow-soft" : "bg-page text-ink-faint cursor-not-allowed")}>
            <Send className="w-4 h-4" /> 一键申报 ({fileable.length})
          </button>
        </div>

        {/* 表格 */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-muted border-b border-line">
                <th className="font-medium px-4 py-3">纳税主体 / 税种</th>
                <th className="font-medium px-3 py-3">所属期</th>
                <th className="font-medium px-3 py-3 text-right">应纳税额</th>
                <th className="font-medium px-3 py-3 w-32">数据完整度</th>
                <th className="font-medium px-3 py-3">风险</th>
                <th className="font-medium px-3 py-3">状态</th>
                <th className="font-medium px-3 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {list.map((f) => {
                const e = entityById(f.entityId);
                return (
                  <tr key={f.id} onClick={() => setSelectedId(f.id)}
                    className="border-b border-line last:border-0 hover:bg-page cursor-pointer transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-1.5 h-8 rounded-full" style={{ background: taxKindColor[f.taxKind] || "#8A93A6" }} />
                        <div>
                          <div className="font-semibold text-ink">{e.shortName} · {f.taxKind}</div>
                          <div className="text-[11px] text-ink-muted">{f.formName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-ink-soft text-xs whitespace-nowrap">{f.period === "2026-05" ? PERIOD_LABEL : f.period}</td>
                    <td className="px-3 py-3 text-right font-bold text-ink tnum whitespace-nowrap">{fmtCNY(f.payable)}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2"><ProgressBar value={f.completeness} tone={f.completeness >= 100 ? "#0FA968" : "#E08600"} /><span className="text-xs text-ink-muted tnum">{f.completeness}%</span></div>
                    </td>
                    <td className="px-3 py-3"><RiskBadge level={f.risk} /></td>
                    <td className="px-3 py-3"><StatusBadge status={f.status} /></td>
                    <td className="px-3 py-3 text-right"><ChevronRight className="w-4 h-4 text-ink-faint inline" /></td>
                  </tr>
                );
              })}
              {!list.length && <tr><td colSpan={7} className="text-center text-ink-muted py-12">没有符合条件的申报事项</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      {selected && <FilingDrawer filing={selected} onClose={() => setSelectedId(null)} onAct={handleAct} />}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-ink text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-pop animate-fadeup flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-success" /> {toast}
        </div>
      )}
    </div>
  );
};

export default FilingWorkspace;
