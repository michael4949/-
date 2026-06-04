import React, { useMemo } from "react";
import {
  ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, PieChart, Pie, Cell,
} from "recharts";
import {
  Wallet, ClipboardList, ShieldAlert, Sparkles, Bot, ArrowUpRight,
  TrendingDown, Receipt, AlertTriangle, ChevronRight, Zap, Building2,
} from "lucide-react";
import {
  risks, savings, taxTrend, entityTaxBurden, taxKindColor,
  entityById, fmtCNYWan, fmtCNY, fmtPct, PERIOD, PERIOD_LABEL, GROUP_NAME, DUE_DATE, daysUntil,
} from "../../data/mockData";
import { ViewId, Filing } from "../../types";
import { Card, SectionTitle, IconBox, StatusBadge, RiskBadge, ProgressBar, Badge, cx } from "./ui";

const TONE_BY: Record<string, string> = { brand: "#3358F4", violet: "#6D5EF6", teal: "#0FB5BA", danger: "#E23D5B", warning: "#E08600", success: "#0FA968" };

const Kpi: React.FC<{
  tone: "brand" | "violet" | "teal" | "danger" | "warning" | "success";
  icon: React.ElementType; label: string; value: React.ReactNode; sub: React.ReactNode; onClick?: () => void;
}> = ({ tone, icon: Icon, label, value, sub, onClick }) => (
  <button onClick={onClick}
    className="text-left bg-white rounded-xl2 border border-line shadow-card p-4 hover:shadow-soft hover:-translate-y-0.5 transition-all group">
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold text-ink-muted">{label}</span>
      <IconBox tone={tone as any} size={32}><Icon className="w-4 h-4" /></IconBox>
    </div>
    <div className="mt-2.5 text-[26px] font-extrabold text-ink tnum leading-none">{value}</div>
    <div className="mt-2 text-xs text-ink-muted flex items-center gap-1">{sub}</div>
  </button>
);

const Dashboard: React.FC<{
  scope: string;
  filings: Filing[];
  onNav: (v: ViewId) => void;
  onOpenFiling: (id: string) => void;
}> = ({ scope, filings, onNav, onOpenFiling }) => {
  const cur = useMemo(
    () => filings.filter((f) => f.period === PERIOD && (scope === "all" || f.entityId === scope)),
    [scope, filings]
  );
  const payableTotal = cur.reduce((s, f) => s + f.payable, 0);
  const pending = cur.filter((f) => f.status !== "已申报" && f.status !== "已缴款");
  const scopedRisks = risks.filter((r) => scope === "all" || r.entityId === scope);
  const scopedSavings = savings.filter((s) => scope === "all" || s.entityId === scope);
  const savingTotal = scopedSavings.reduce((s, v) => s + v.estSaving, 0);
  const riskHigh = scopedRisks.filter((r) => r.level === "high").length;

  const byKind = useMemo(() => {
    const m: Record<string, number> = {};
    for (const f of cur) m[f.taxKind] = (m[f.taxKind] || 0) + f.payable;
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  }, [cur]);

  const todo = pending
    .slice()
    .sort((a, b) => ({ 待审批: 0, 待复核: 1, AI已生成: 2, 可申报: 3, 待采集: 4 } as any)[a.status] - ({ 待审批: 0, 待复核: 1, AI已生成: 2, 可申报: 3, 待采集: 4 } as any)[b.status])
    .slice(0, 5);

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-xl2 text-white p-6 md:p-7 shadow-soft"
        style={{ background: "linear-gradient(118deg,#2544D4 0%,#3358F4 44%,#6D5EF6 100%)" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(680px 260px at 86% -30%, rgba(255,255,255,.28), transparent 72%)" }} />
        <div className="absolute -right-10 -top-12 w-52 h-52 rounded-full bg-white/10" />
        <div className="absolute right-28 -bottom-20 w-44 h-44 rounded-full bg-white/10" />
        <div className="relative flex flex-col lg:flex-row lg:items-center gap-5">
          <div className="flex-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white/15 rounded-full px-2.5 py-1 mb-3">
              <Zap className="w-3.5 h-3.5" /> {PERIOD_LABEL}所属期 · 申报征期进行中
            </div>
            <h2 className="text-2xl font-extrabold leading-tight">王浩，本期还有 <span className="underline decoration-white/40 decoration-2 underline-offset-4">{pending.length} 项</span>申报待处理</h2>
            <p className="text-white/80 text-sm mt-1.5">
              智能体已完成全集团数据归集与制表，距申报截止 <b className="tnum">{daysUntil(DUE_DATE)}</b> 天（{DUE_DATE}）。点一下，让它把剩下的活干完。
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-4">
              <button onClick={() => onNav("agent")}
                className="inline-flex items-center gap-2 bg-white text-brand font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-white/90 transition-colors shadow-soft">
                <Bot className="w-4 h-4" /> 启动 AI 自动申报
              </button>
              <button onClick={() => onNav("filings")}
                className="inline-flex items-center gap-1.5 text-white/90 hover:text-white font-semibold text-sm px-3 py-2.5 rounded-xl hover:bg-white/10 transition-colors">
                查看申报工作台 <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          {/* 迷你概览 */}
          <div className="grid grid-cols-3 gap-3 lg:w-[360px]">
            {[
              { k: "应纳税额", v: fmtCNYWan(payableTotal) },
              { k: "可优化", v: fmtCNYWan(savingTotal) },
              { k: "合规度", v: "86 分" },
            ].map((x) => (
              <div key={x.k} className="bg-white/15 border border-white/15 rounded-xl px-3 py-3 backdrop-blur-sm">
                <div className="text-[11px] text-white/70">{x.k}</div>
                <div className="text-lg font-extrabold tnum mt-0.5">{x.v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* KPI 行 */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Kpi tone="brand" icon={Wallet} label="本期应纳税额" value={fmtCNYWan(payableTotal)} onClick={() => onNav("filings")}
          sub={<><TrendingDown className="w-3.5 h-3.5 text-success" /> <span className="text-success font-semibold">环比 -6.8%</span> · 全税种合计</>} />
        <Kpi tone="warning" icon={ClipboardList} label="待申报事项" value={<>{pending.length}<span className="text-ink-faint text-lg">/{cur.length}</span></>} onClick={() => onNav("filings")}
          sub={<>截止 {DUE_DATE} · 距今 {daysUntil(DUE_DATE)} 天</>} />
        <Kpi tone="danger" icon={ShieldAlert} label="风险预警" value={scopedRisks.length} onClick={() => onNav("risk")}
          sub={<><span className="text-danger font-semibold">{riskHigh} 高</span> · {scopedRisks.length - riskHigh} 中</>} />
        <Kpi tone="success" icon={Sparkles} label="可节税 / 退税" value={fmtCNYWan(savingTotal)} onClick={() => onNav("saving")}
          sub={<>{scopedSavings.length} 项机会 · 研发加计领衔</>} />
        <Kpi tone="violet" icon={Bot} label="智能体自动化率" value="96%" onClick={() => onNav("agent")}
          sub={<>AI 已自动制表 23 张</>} />
      </div>

      {/* 图表行 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card className="xl:col-span-2">
          <SectionTitle title="近 6 个月税额与税负趋势" sub="按税种堆叠（万元）· 折线为集团综合税负率"
            right={<div className="flex items-center gap-3 text-[11px] text-ink-muted">
              {[["增值税", taxKindColor.增值税及附加], ["企业所得税", taxKindColor.企业所得税], ["个人所得税", taxKindColor.个人所得税], ["附加及其他", "#AEB6C6"]].map(([l, c]) => (
                <span key={l} className="inline-flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-sm" style={{ background: c as string }} />{l}</span>
              ))}
            </div>} />
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={taxTrend} margin={{ top: 6, right: 8, left: -8, bottom: 0 }}>
                <defs>
                  {[["g1", "#3358F4"], ["g2", "#6D5EF6"], ["g3", "#0FB5BA"], ["g4", "#AEB6C6"]].map(([id, c]) => (
                    <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={c} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={c} stopOpacity={0.04} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF0F5" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#8A93A6" }} axisLine={false} tickLine={false} tickFormatter={(m) => m.slice(5) + "月"} />
                <YAxis tick={{ fontSize: 11, fill: "#8A93A6" }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#E08600" }} axisLine={false} tickLine={false} unit="%" domain={[0, 12]} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E9ECF3", boxShadow: "0 16px 48px rgba(15,23,41,.14)", fontSize: 12 }} />
                <Area type="monotone" dataKey="增值税" stackId="1" stroke="#3358F4" strokeWidth={2} fill="url(#g1)" />
                <Area type="monotone" dataKey="企业所得税" stackId="1" stroke="#6D5EF6" strokeWidth={2} fill="url(#g2)" />
                <Area type="monotone" dataKey="个人所得税" stackId="1" stroke="#0FB5BA" strokeWidth={2} fill="url(#g3)" />
                <Area type="monotone" dataKey="附加及其他" stackId="1" stroke="#AEB6C6" strokeWidth={2} fill="url(#g4)" />
                <Line yAxisId="right" type="monotone" dataKey="税负率" stroke="#E08600" strokeWidth={2.4} dot={{ r: 3, fill: "#E08600" }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* 税种占比 */}
        <Card>
          <SectionTitle title="本期税额结构" sub={`${PERIOD_LABEL} · ${scope === "all" ? "全集团" : entityById(scope).shortName}`} />
          <div className="relative" style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byKind} dataKey="value" nameKey="name" innerRadius={62} outerRadius={88} paddingAngle={2} stroke="none">
                  {byKind.map((d) => <Cell key={d.name} fill={taxKindColor[d.name] || "#8A93A6"} />)}
                </Pie>
                <Tooltip formatter={(v: number) => fmtCNY(v)} contentStyle={{ borderRadius: 12, border: "1px solid #E9ECF3", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="text-[11px] text-ink-muted">应纳税额</div>
              <div className="text-xl font-extrabold text-ink tnum">{fmtCNYWan(payableTotal)}</div>
            </div>
          </div>
          <div className="mt-3 space-y-1.5">
            {byKind.sort((a, b) => b.value - a.value).map((d) => (
              <div key={d.name} className="flex items-center gap-2 text-xs">
                <i className="w-2.5 h-2.5 rounded-sm" style={{ background: taxKindColor[d.name] || "#8A93A6" }} />
                <span className="text-ink-soft flex-1">{d.name}</span>
                <span className="font-semibold text-ink tnum">{fmtCNYWan(d.value)}</span>
                <span className="text-ink-faint tnum w-10 text-right">{fmtPct((d.value / payableTotal) * 100)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 待办 + 主体税负 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* 待办申报 */}
        <Card className="xl:col-span-2">
          <SectionTitle title="待处理申报" sub="按紧急度排序 · 点击查看税表与溯源"
            right={<button onClick={() => onNav("filings")} className="text-xs font-semibold text-brand hover:text-brand-600 inline-flex items-center gap-1">全部 {pending.length} 项<ChevronRight className="w-3.5 h-3.5" /></button>} />
          <div className="space-y-2">
            {todo.map((f) => (
              <button key={f.id} onClick={() => onOpenFiling(f.id)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-line hover:border-brand/40 hover:bg-page transition-colors text-left">
                <IconBox tone="slate" size={36}><Receipt className="w-4 h-4" /></IconBox>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-ink truncate">{entityById(f.entityId).shortName} · {f.taxKind}</div>
                  <div className="text-[11px] text-ink-muted truncate">{f.formName}</div>
                </div>
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-bold text-ink tnum">{fmtCNY(f.payable)}</div>
                  <div className="text-[10px] text-ink-muted">应纳税额</div>
                </div>
                {f.risk !== "none" && f.risk !== "low" && <RiskBadge level={f.risk} />}
                <StatusBadge status={f.status} />
                <ChevronRight className="w-4 h-4 text-ink-faint" />
              </button>
            ))}
          </div>
        </Card>

        {/* 各主体税负 */}
        <Card>
          <SectionTitle title="各主体增值税税负率" sub="对比行业预警线 · 偏离即预警" icon={<IconBox tone="violet" size={30}><Building2 className="w-4 h-4" /></IconBox>} />
          <div className="space-y-3.5 mt-1">
            {entityTaxBurden.map((e) => {
              const danger = e.rate < e.warn;
              const pct = (e.rate / 10) * 100;
              const warnPct = (e.warn / 10) * 100;
              return (
                <div key={e.name}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-ink-soft font-medium">{e.name}</span>
                    <span className={cx("font-bold tnum", danger ? "text-danger" : "text-ink")}>{fmtPct(e.rate)}</span>
                  </div>
                  <div className="relative h-2 rounded-full bg-page">
                    <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${pct}%`, background: danger ? "#E23D5B" : "#3358F4" }} />
                    <div className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 bg-ink/40 rounded" style={{ left: `${warnPct}%` }} title={`预警线 ${e.warn}%`} />
                  </div>
                </div>
              );
            })}
            <div className="flex items-center gap-2 text-[11px] text-ink-muted pt-1">
              <span className="inline-flex items-center gap-1"><i className="w-2 h-3 bg-ink/40 rounded" />预警线</span>
              <span className="inline-flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-sm bg-danger" />低于预警（关注）</span>
            </div>
          </div>
        </Card>
      </div>

      {/* 风险 + 机会 概览 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <SectionTitle title="重点风险" sub="金税四期智能体扫描" icon={<IconBox tone="danger" size={30}><AlertTriangle className="w-4 h-4" /></IconBox>}
            right={<button onClick={() => onNav("risk")} className="text-xs font-semibold text-danger hover:opacity-80 inline-flex items-center gap-1">风险中心<ChevronRight className="w-3.5 h-3.5" /></button>} />
          <div className="space-y-2.5">
            {scopedRisks.filter((r) => r.level === "high").concat(scopedRisks.filter((r) => r.level === "mid")).slice(0, 3).map((r) => (
              <div key={r.id} className="flex items-start gap-3 p-3 rounded-xl bg-page">
                <RiskBadge level={r.level} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-ink">{r.title}</div>
                  <div className="text-[11px] text-ink-muted truncate">{entityById(r.entityId).shortName} · {r.rule}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <SectionTitle title="节税机会" sub="政策匹配 · 已量化收益" icon={<IconBox tone="success" size={30}><Sparkles className="w-4 h-4" /></IconBox>}
            right={<button onClick={() => onNav("saving")} className="text-xs font-semibold text-success hover:opacity-80 inline-flex items-center gap-1">节税优化<ChevronRight className="w-3.5 h-3.5" /></button>} />
          <div className="space-y-2.5">
            {scopedSavings.slice().sort((a, b) => b.estSaving - a.estSaving).slice(0, 3).map((s) => (
              <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-page">
                <Badge tone="success">{s.category}</Badge>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-ink truncate">{s.title}</div>
                  <div className="text-[11px] text-ink-muted">{entityById(s.entityId).shortName}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-extrabold text-success tnum flex items-center gap-0.5"><ArrowUpRight className="w-3.5 h-3.5" />{fmtCNYWan(s.estSaving)}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
