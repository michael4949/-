import React, { useEffect, useRef, useState } from "react";
import {
  PlugZap, DatabaseZap, ScanLine, Calculator, Scale, FileSpreadsheet,
  ShieldAlert, Sparkles, BadgeCheck, Bot, Play, RotateCcw, Check, Loader2,
  ArrowRight, Terminal, Cpu, CircleDot, Layers, Clock,
} from "lucide-react";
import { agentStepsTemplate, fmtCNYWan, currentFilings, GROUP_NAME, PERIOD_LABEL, entities } from "../../data/mockData";
import { AgentStep, ViewId } from "../../types";
import { Card, IconBox, Badge, cx } from "./ui";

const ICONS: Record<string, React.ElementType> = {
  PlugZap, DatabaseZap, ScanLine, Calculator, Scale, FileSpreadsheet, ShieldAlert, Sparkles, BadgeCheck,
};

const clone = (): AgentStep[] => agentStepsTemplate.map((s) => ({ ...s, status: "pending" }));

const AutoFileAgent: React.FC<{ scope: string; onNav: (v: ViewId) => void }> = ({ scope, onNav }) => {
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [active, setActive] = useState(-1);
  const [steps, setSteps] = useState<AgentStep[]>(clone);
  const [logs, setLogs] = useState<string[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const logRef = useRef<HTMLDivElement>(null);

  const scopeLabel = scope === "all" ? `${GROUP_NAME} · 全部 ${entities.length} 家主体` : entities.find((e) => e.id === scope)?.name;
  const payable = currentFilings().reduce((s, f) => s + f.payable, 0);

  const start = () => {
    setSteps(clone());
    setLogs([`〔${new Date().toLocaleTimeString("zh-CN")}〕智能体启动 · 范围：${scopeLabel} · 所属期 ${PERIOD_LABEL}`]);
    setElapsed(0);
    setPhase("running");
    setActive(0);
  };

  // 步骤推进
  useEffect(() => {
    if (phase !== "running") return;
    if (active < 0) return;
    if (active >= agentStepsTemplate.length) {
      setPhase("done");
      setLogs((l) => [...l, "〔完成〕全部环节执行完毕，已生成审批单，等待人工确认 ✓"]);
      return;
    }
    const tpl = agentStepsTemplate[active];
    setSteps((s) => s.map((x, i) => (i === active ? { ...x, status: "active" } : x)));
    setLogs((l) => [...l, `▶ ${tpl.title} …`]);
    const t = setTimeout(() => {
      setSteps((s) => s.map((x, i) => (i === active ? { ...x, status: "done" } : x)));
      setLogs((l) => [...l, `✓ ${tpl.title}${tpl.metrics ? " · " + tpl.metrics.map((m) => m.value).join(" / ") : ""}`]);
      setActive((a) => a + 1);
    }, tpl.durationMs);
    return () => clearTimeout(t);
  }, [phase, active]);

  // 计时
  useEffect(() => {
    if (phase !== "running") return;
    const id = setInterval(() => setElapsed((e) => e + 0.1), 100);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => { logRef.current?.scrollTo({ top: 1e9 }); }, [logs]);

  const doneCount = steps.filter((s) => s.status === "done").length;
  const progress = Math.round((doneCount / steps.length) * 100);

  const outputs = [
    { id: "connect", label: "数据源接入", value: "4 / 4" },
    { id: "gather", label: "归集凭证 / 发票", value: "14,233 / 14,654" },
    { id: "invoice", label: "发票验真匹配率", value: "98.6%" },
    { id: "forms", label: "生成税表", value: "23 张" },
    { id: "risk", label: "识别风险", value: "5 项" },
    { id: "saving", label: "节税 / 退税机会", value: "¥ 5,300 万" },
  ];
  const isDoneStep = (id: string) => steps.find((s) => s.id === id)?.status === "done";

  return (
    <div className="space-y-5">
      {/* 头部说明 */}
      <Card className="relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-gradient-to-br from-brand-50 to-transparent rounded-full -mr-20 -mt-20" />
        <div className="relative flex flex-col lg:flex-row lg:items-center gap-5">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand to-violet2 flex items-center justify-center shadow-soft relative">
                <Bot className="w-6 h-6 text-white" />
                {phase === "running" && <span className="absolute inset-0 rounded-2xl animate-pulseRing" />}
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-ink flex items-center gap-2">AI 自动申报智能体 <Badge tone="violet">Autopilot</Badge></h2>
                <p className="text-sm text-ink-muted mt-0.5">连接数据 → 归集测算 → 生成税表 → 风险体检 → 等你一键确认。<b className="text-ink-soft">每一步都可追溯。</b></p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <Badge tone="slate" dot><Layers className="w-3.5 h-3.5" />{scopeLabel}</Badge>
              <Badge tone="slate" dot><Clock className="w-3.5 h-3.5" />所属期 {PERIOD_LABEL}</Badge>
              <Badge tone="slate" dot>增值税及附加 · 个税 · 印花税</Badge>
            </div>
          </div>
          <div className="lg:w-[260px]">
            {phase === "idle" && (
              <button onClick={start}
                className="w-full inline-flex items-center justify-center gap-2 bg-brand hover:bg-brand-600 text-white font-bold py-3.5 rounded-xl shadow-soft transition-colors">
                <Play className="w-5 h-5" /> 启动自动申报
              </button>
            )}
            {phase === "running" && (
              <div className="w-full inline-flex items-center justify-center gap-2 bg-brand/10 text-brand font-bold py-3.5 rounded-xl">
                <Loader2 className="w-5 h-5 animate-spin" /> 智能体运行中…
              </div>
            )}
            {phase === "done" && (
              <button onClick={start}
                className="w-full inline-flex items-center justify-center gap-2 bg-white border border-line hover:border-brand/40 text-ink font-bold py-3.5 rounded-xl transition-colors">
                <RotateCcw className="w-5 h-5" /> 重新运行
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* 完成总结 */}
      {phase === "done" && (
        <div className="rounded-xl2 bg-gradient-to-br from-success/10 to-teal2-soft border border-success/30 p-5 animate-fadeup">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-success flex items-center justify-center shrink-0 shadow-soft">
              <Check className="w-7 h-7 text-white" strokeWidth={3} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-extrabold text-ink">自动申报准备完成 · 等待人工审批</h3>
              <p className="text-sm text-ink-soft mt-0.5">用时 {elapsed.toFixed(1)} 秒，完成 {GROUP_NAME} 全集团本期税务归集、测算与制表，已生成审批单。</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                {[["生成税表", "23 张"], ["应纳税额", fmtCNYWan(payable)], ["发现风险", "5 项 · 2 高"], ["可优化", "¥ 5,300 万"]].map(([k, v]) => (
                  <div key={k} className="bg-white rounded-xl border border-line p-3">
                    <div className="text-[11px] text-ink-muted">{k}</div>
                    <div className="text-lg font-extrabold text-ink tnum mt-0.5">{v}</div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                <button onClick={() => onNav("filings")} className="inline-flex items-center gap-1.5 bg-brand hover:bg-brand-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
                  前往审批并申报 <ArrowRight className="w-4 h-4" />
                </button>
                <button onClick={() => onNav("risk")} className="inline-flex items-center gap-1.5 bg-white border border-line hover:border-danger/40 text-danger text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
                  <ShieldAlert className="w-4 h-4" /> 先处置 2 项高风险
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* 时间线 */}
        <div className="xl:col-span-2">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-ink flex items-center gap-2"><Cpu className="w-4 h-4 text-brand" /> 执行时间线</h3>
              <span className="text-xs text-ink-muted">{doneCount} / {steps.length} 环节</span>
            </div>
            <div className="relative">
              {/* 竖线 */}
              <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-line" />
              <div className="space-y-1">
                {steps.map((s) => {
                  const Icon = ICONS[s.icon] || CircleDot;
                  const open = s.status !== "pending";
                  return (
                    <div key={s.id} className="relative flex gap-3 py-2">
                      {/* 节点 */}
                      <div className={cx(
                        "relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 transition-all",
                        s.status === "done" ? "bg-success border-success text-white" :
                        s.status === "active" ? "bg-brand border-brand text-white" :
                        "bg-white border-line text-ink-faint"
                      )}>
                        {s.status === "done" ? <Check className="w-5 h-5" strokeWidth={3} />
                          : s.status === "active" ? <Loader2 className="w-5 h-5 animate-spin" />
                          : <Icon className="w-[18px] h-[18px]" />}
                        {s.status === "active" && <span className="absolute inset-0 rounded-full animate-pulseRing" />}
                      </div>
                      {/* 内容 */}
                      <div className={cx("flex-1 min-w-0 rounded-xl border px-4 py-3 transition-all",
                        s.status === "active" ? "border-brand/40 bg-brand-50/50 shadow-card" :
                        s.status === "done" ? "border-line bg-white" : "border-transparent")}>
                        <div className="flex items-center gap-2">
                          <Icon className={cx("w-4 h-4", s.status === "pending" ? "text-ink-faint" : "text-brand")} />
                          <span className={cx("font-bold text-sm", s.status === "pending" ? "text-ink-faint" : "text-ink")}>{s.title}</span>
                          {s.status === "active" && <Badge tone="brand">进行中</Badge>}
                        </div>
                        <p className={cx("text-xs mt-0.5", s.status === "pending" ? "text-ink-faint" : "text-ink-muted")}>{s.desc}</p>
                        {open && (
                          <div className="mt-2.5 animate-fadeup">
                            <ul className="space-y-1">
                              {s.detail.map((d, i) => (
                                <li key={i} className="text-xs text-ink-soft flex items-start gap-1.5">
                                  <span className="text-brand mt-0.5">·</span><span>{d}</span>
                                </li>
                              ))}
                            </ul>
                            {s.metrics && (
                              <div className="flex flex-wrap gap-2 mt-2.5">
                                {s.metrics.map((m) => (
                                  <span key={m.label} className="inline-flex items-center gap-1.5 text-[11px] bg-white border border-line rounded-lg px-2 py-1">
                                    <span className="text-ink-muted">{m.label}</span>
                                    <b className="text-ink tnum">{m.value}</b>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>

        {/* 实时工作台 */}
        <div className="space-y-5">
          <Card>
            <h3 className="font-bold text-ink mb-3 flex items-center gap-2"><Cpu className="w-4 h-4 text-violet2" /> 实时状态</h3>
            {/* 进度环 */}
            <div className="flex items-center gap-4">
              <div className="relative w-[88px] h-[88px]">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#EEF0F5" strokeWidth="10" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#3358F4" strokeWidth="10" strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 42} strokeDashoffset={2 * Math.PI * 42 * (1 - progress / 100)}
                    style={{ transition: "stroke-dashoffset .6s ease" }} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-extrabold text-ink tnum">{progress}%</span>
                </div>
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between text-sm"><span className="text-ink-muted">状态</span>
                  <span className={cx("font-bold", phase === "done" ? "text-success" : phase === "running" ? "text-brand" : "text-ink-muted")}>
                    {phase === "idle" ? "待启动" : phase === "running" ? "运行中" : "已完成"}</span></div>
                <div className="flex items-center justify-between text-sm"><span className="text-ink-muted">用时</span><span className="font-bold text-ink tnum">{elapsed.toFixed(1)}s</span></div>
                <div className="flex items-center justify-between text-sm"><span className="text-ink-muted">环节</span><span className="font-bold text-ink tnum">{doneCount}/{steps.length}</span></div>
              </div>
            </div>
            {/* 关键产出 */}
            <div className="mt-4 space-y-2">
              {outputs.map((o) => {
                const ok = isDoneStep(o.id);
                return (
                  <div key={o.id} className="flex items-center gap-2 text-sm">
                    <span className={cx("w-4 h-4 rounded-full flex items-center justify-center", ok ? "bg-success text-white" : "bg-page text-ink-faint")}>
                      {ok ? <Check className="w-3 h-3" strokeWidth={3} /> : <CircleDot className="w-3 h-3" />}
                    </span>
                    <span className={cx("flex-1", ok ? "text-ink-soft" : "text-ink-faint")}>{o.label}</span>
                    <span className={cx("font-semibold tnum", ok ? "text-ink" : "text-ink-faint")}>{ok ? o.value : "—"}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* 日志 */}
          <Card pad={false}>
            <div className="px-4 py-2.5 border-b border-line flex items-center gap-2">
              <Terminal className="w-4 h-4 text-ink-muted" /><span className="text-sm font-bold text-ink">工作日志</span>
              {phase === "running" && <span className="ml-auto w-2 h-2 rounded-full bg-success animate-pulse" />}
            </div>
            <div ref={logRef} className="p-3 h-[220px] overflow-y-auto no-scrollbar space-y-1 font-mono text-[11px] leading-relaxed">
              {logs.length === 0 && <div className="text-ink-faint">点击「启动自动申报」开始执行…</div>}
              {logs.map((l, i) => (
                <div key={i} className={cx("animate-fadeup", l.startsWith("✓") ? "text-success" : l.startsWith("▶") ? "text-brand" : l.startsWith("〔完成〕") ? "text-success font-bold" : "text-ink-muted")}>{l}</div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AutoFileAgent;
