import React, { useState } from "react";
import {
  ShieldAlert, ShieldCheck, AlertTriangle, Lightbulb, Check, X,
  ArrowUpRight, FileWarning, TrendingDown,
} from "lucide-react";
import { risks as RISKS, entityById, fmtCNY, entityTaxBurden, fmtPct } from "../../data/mockData";
import { RiskItem } from "../../types";
import { Card, SectionTitle, IconBox, RiskBadge, Badge, cx } from "./ui";

const LEVEL: Record<string, { tone: any; label: string }> = {
  high: { tone: "danger", label: "高风险" }, mid: { tone: "warning", label: "中风险" }, low: { tone: "teal", label: "低风险" },
};

const RiskCenter: React.FC<{ scope: string }> = ({ scope }) => {
  const [items, setItems] = useState<RiskItem[]>(RISKS);
  const list = items.filter((r) => scope === "all" || r.entityId === scope);
  const high = list.filter((r) => r.level === "high").length;
  const mid = list.filter((r) => r.level === "mid").length;
  const open = list.filter((r) => r.status === "待处理").length;

  const setStatus = (id: string, status: RiskItem["status"]) =>
    setItems((s) => s.map((r) => (r.id === id ? { ...r, status } : r)));

  return (
    <div className="space-y-5">
      {/* 概览 */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="lg:col-span-1 bg-gradient-to-br from-[#0F1729] to-[#27324B] text-white border-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-white/80"><ShieldCheck className="w-4 h-4" /> 金税四期合规度</div>
          <div className="flex items-end gap-1 mt-2"><span className="text-4xl font-extrabold tnum">86</span><span className="text-white/50 mb-1.5">/ 100</span></div>
          <div className="mt-3 h-2 rounded-full bg-white/15 overflow-hidden"><div className="h-full bg-gradient-to-r from-teal2 to-success rounded-full" style={{ width: "86%" }} /></div>
          <div className="text-[11px] text-white/55 mt-2">较上月 ▲ 4 分 · 处置 {open} 项后预计可达 92 分</div>
        </Card>
        {[
          { tone: "danger", icon: AlertTriangle, label: "高风险", value: high, sub: "建议优先处置" },
          { tone: "warning", icon: ShieldAlert, label: "中风险", value: mid, sub: "限期关注" },
          { tone: "brand", icon: FileWarning, label: "待处理", value: open, sub: `共 ${list.length} 项预警` },
        ].map((k) => (
          <Card key={k.label}>
            <div className="flex items-center justify-between"><span className="text-xs font-semibold text-ink-muted">{k.label}</span><IconBox tone={k.tone as any} size={32}><k.icon className="w-4 h-4" /></IconBox></div>
            <div className="text-[28px] font-extrabold text-ink tnum mt-2 leading-none">{k.value}</div>
            <div className="text-xs text-ink-muted mt-2">{k.sub}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* 风险列表 */}
        <div className="xl:col-span-2 space-y-3">
          {list.map((r) => {
            const e = entityById(r.entityId);
            const handled = r.status !== "待处理";
            return (
              <Card key={r.id} className={cx("transition-opacity", handled && "opacity-60")}>
                <div className="flex items-start gap-3">
                  <IconBox tone={LEVEL[r.level].tone} size={40}><AlertTriangle className="w-5 h-5" /></IconBox>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <RiskBadge level={r.level} />
                      <h4 className="font-bold text-ink">{r.title}</h4>
                      {r.status === "已采纳" && <Badge tone="success"><Check className="w-3 h-3" />已采纳</Badge>}
                      {r.status === "已忽略" && <Badge tone="slate">已忽略</Badge>}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-ink-muted">
                      <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-ink-faint" />{e.shortName}</span>
                      <span>·</span><span>{r.rule}</span>
                      {r.amount ? <><span>·</span><span className="text-danger font-semibold">涉及 {fmtCNY(r.amount)}</span></> : null}
                    </div>
                    <p className="text-sm text-ink-soft mt-2 leading-relaxed">{r.detail}</p>
                    <div className="mt-3 flex items-start gap-2 bg-brand-50/60 rounded-xl p-3">
                      <Lightbulb className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                      <div className="text-xs text-ink-soft"><b className="text-brand">智能体建议：</b>{r.suggestion}</div>
                    </div>
                    {!handled && (
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => setStatus(r.id, "已采纳")} className="inline-flex items-center gap-1.5 bg-brand hover:bg-brand-600 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"><Check className="w-3.5 h-3.5" /> 采纳建议</button>
                        <button onClick={() => setStatus(r.id, "已忽略")} className="inline-flex items-center gap-1.5 bg-white border border-line hover:bg-page text-ink-muted text-xs font-semibold px-3 py-2 rounded-lg transition-colors"><X className="w-3.5 h-3.5" /> 忽略</button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
          {!list.length && <Card><div className="text-center text-ink-muted py-10">该范围下暂无风险预警 🎉</div></Card>}
        </div>

        {/* 税负率体检 */}
        <Card>
          <SectionTitle title="增值税税负率体检" sub="对比行业预警线" icon={<IconBox tone="violet" size={30}><TrendingDown className="w-4 h-4" /></IconBox>} />
          <div className="space-y-3.5">
            {entityTaxBurden.map((e) => {
              const danger = e.rate < e.warn;
              return (
                <div key={e.name}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-ink-soft font-medium">{e.name}</span>
                    <span className="flex items-center gap-1.5">
                      <span className={cx("font-bold tnum", danger ? "text-danger" : "text-ink")}>{fmtPct(e.rate)}</span>
                      <span className="text-ink-faint">/ 预警 {fmtPct(e.warn)}</span>
                    </span>
                  </div>
                  <div className="relative h-2 rounded-full bg-page">
                    <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${(e.rate / 10) * 100}%`, background: danger ? "#E23D5B" : "#3358F4" }} />
                    <div className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 bg-ink/40 rounded" style={{ left: `${(e.warn / 10) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 p-3 rounded-xl bg-danger-soft text-xs text-ink-soft flex gap-2">
            <AlertTriangle className="w-4 h-4 text-danger shrink-0" /> XXX销售税负率 1.3% 显著低于行业预警线，建议优先核查进销项合理性。
          </div>
        </Card>
      </div>
    </div>
  );
};

export default RiskCenter;
