import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Plane, Layers, Loader2, Sparkles, Ruler, Scale, Gauge, Info, ChevronDown, Cpu,
} from "lucide-react";
import SpectrumChart from "./ui/SpectrumChart";
import LayerStack from "./ui/LayerStack";
import CamouflageCard from "./ui/CamouflageCard";
import { skyColor } from "./core/color";
import { BANDS, DEFAULT_REQUIREMENT, type AgentResult } from "./core/agent";
import { MATERIALS } from "./core/materials";
import type { CoatingDesign, DesignRequirement } from "./core/types";

interface WorkerMsg { ok: boolean; result?: AgentResult; error?: string }

// 用物理算出的真实天空色构造「模拟天空」的页面背景渐变
const sky = skyColor();
const adj = (c: number[], k: number) => c.map((v) => Math.round(Math.min(255, Math.max(0, v * k))));
const SKY_BG = `radial-gradient(1100px 520px at 78% -8%, rgba(255,250,235,0.85), rgba(255,255,255,0) 60%),
  linear-gradient(180deg, rgb(${adj(sky, 0.62).join(",")}) 0%, rgb(${sky.join(",")}) 42%, rgb(${adj(sky, 1.16).join(",")}) 100%)`;

const App: React.FC = () => {
  const [req, setReq] = useState<DesignRequirement>(DEFAULT_REQUIREMENT);
  const [res, setRes] = useState<AgentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAlts, setShowAlts] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const w = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    w.onmessage = (e: MessageEvent<WorkerMsg>) => {
      setLoading(false);
      const msg = e.data;
      if (!msg.ok || !msg.result) { setError(msg.error ?? "计算失败"); return; }
      setRes(msg.result);
      setError(null);
    };
    w.onerror = () => { setLoading(false); setError("计算线程出错，请重试。"); };
    workerRef.current = w;
    return () => w.terminate();
  }, []);

  const run = (r: DesignRequirement) => { setLoading(true); setError(null); workerRef.current?.postMessage(r); };
  useEffect(() => { run(DEFAULT_REQUIREMENT); /* 首屏自动出一版方案 */ }, []); // eslint-disable-line

  const setBand = (b: typeof BANDS[number]) =>
    setReq((p) => ({ ...p, bandLabel: b.id, fStartGHz: b.f0, fEndGHz: b.f1 }));

  const d = res?.best;
  const ok10 = d ? d.worstRL <= -10 : false;

  return (
    <div className="min-h-screen text-slate-800" style={{ background: SKY_BG, backgroundAttachment: "fixed" }}>
      {/* 顶栏 */}
      <header className="px-5 md:px-8 pt-6 pb-3 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/70 backdrop-blur flex items-center justify-center shadow-sm ring-1 ring-white/60">
            <Plane className="w-6 h-6 text-sky-600" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-800">飞机隐身涂装配比智能体</h1>
            <p className="text-xs md:text-sm text-slate-600/90">真实电磁物理 · 雷达吸波材料配比寻优 · 天蓝伪装配色（模拟天空）</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 md:px-8 pb-12 grid lg:grid-cols-[330px_1fr] gap-5">
        {/* ===== 左：设计需求 ===== */}
        <aside className="lg:sticky lg:top-5 self-start space-y-4 bg-white/75 backdrop-blur-md rounded-2xl p-5 ring-1 ring-white/60 shadow-lg">
          <div className="flex items-center gap-2 font-semibold text-slate-700">
            <Sparkles className="w-4 h-4 text-sky-600" /> 设计需求
          </div>

          <Field icon={<Gauge className="w-3.5 h-3.5" />} label="目标雷达频段">
            <div className="grid grid-cols-3 gap-1.5">
              {BANDS.map((b) => (
                <button key={b.id} title={b.note} onClick={() => setBand(b)}
                  className={`py-1.5 rounded-lg text-xs font-medium transition ${req.bandLabel === b.id
                    ? "bg-sky-500 text-white shadow" : "bg-white/70 text-slate-600 hover:bg-sky-100"}`}>
                  {b.label.replace(" 波段", "")}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {BANDS.find((b) => b.id === req.bandLabel)?.note} · {req.fStartGHz}–{req.fEndGHz} GHz
            </p>
          </Field>

          <Slider icon={<Ruler className="w-3.5 h-3.5" />} label="最大总厚度" value={req.maxThickness}
            min={0.5} max={6} step={0.1} unit="mm"
            onChange={(v) => setReq((p) => ({ ...p, maxThickness: v }))} />

          <Slider icon={<Scale className="w-3.5 h-3.5" />} label="最大面密度（重量约束）" value={req.maxArealMass}
            min={1} max={12} step={0.5} unit="kg/m²"
            onChange={(v) => setReq((p) => ({ ...p, maxArealMass: v }))} />

          <Field icon={<Layers className="w-3.5 h-3.5" />} label="最多层数">
            <div className="flex gap-1.5">
              {[1, 2, 3].map((n) => (
                <button key={n} onClick={() => setReq((p) => ({ ...p, maxLayers: n }))}
                  className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition ${req.maxLayers === n
                    ? "bg-sky-500 text-white shadow" : "bg-white/70 text-slate-600 hover:bg-sky-100"}`}>{n} 层</button>
              ))}
            </div>
          </Field>

          <Slider label="设计取向：吸收性能 ↔ 轻量化" value={req.weightPriority}
            min={0} max={1} step={0.05} unit=""
            fmt={(v) => v < 0.33 ? "重性能" : v > 0.66 ? "重轻量" : "均衡"}
            onChange={(v) => setReq((p) => ({ ...p, weightPriority: v }))} />

          <button onClick={() => run(req)} disabled={loading}
            className="w-full py-2.5 rounded-xl font-semibold text-white shadow-md transition
              bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 disabled:opacity-60 flex items-center justify-center gap-2">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> 智能体计算中…</>
                     : <><Cpu className="w-4 h-4" /> 开始智能配比</>}
          </button>

          <p className="text-[10px] text-slate-400 leading-relaxed flex gap-1">
            <Info className="w-3 h-3 shrink-0 mt-0.5" />
            基于公开文献的材料代表值与经典电磁理论的<b>教学/科研仿真</b>，非机密或实测配方。
          </p>
        </aside>

        {/* ===== 右：结果 ===== */}
        <section className="space-y-5">
          {error && <div className="bg-rose-50 text-rose-700 rounded-xl px-4 py-3 text-sm ring-1 ring-rose-100">{error}</div>}

          {!d && loading && (
            <div className="h-64 grid place-items-center bg-white/60 backdrop-blur rounded-2xl">
              <div className="flex items-center gap-2 text-slate-500"><Loader2 className="w-5 h-5 animate-spin" /> 正在求解最优配方…</div>
            </div>
          )}

          {d && (
            <>
              {/* 指标行 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MetricCard label="最深吸收 (min RL)" value={`${d.minRL.toFixed(1)} dB`} accent />
                <MetricCard label="−10dB 带宽" value={`${d.bandwidth10.toFixed(1)} GHz`} sub={ok10 ? "全带达标 ✓" : "部分达标"} good={ok10} />
                <MetricCard label="总厚度" value={`${d.totalThickness.toFixed(2)} mm`} />
                <MetricCard label="面密度" value={`${d.arealMass.toFixed(2)} kg/m²`} good={d.arealMass <= req.maxArealMass} />
              </div>

              {/* 频谱图 */}
              <Card title={`反射损耗频谱 · ${d.template}`} right={<span className="text-xs text-slate-400">阴影=目标频带</span>}>
                <SpectrumChart data={d.wideSpectrum} band={[req.fStartGHz, req.fEndGHz]} />
              </Card>

              {/* 剖面 + 伪装 */}
              <div className="grid md:grid-cols-2 gap-5">
                <Card title="涂层结构剖面">
                  <LayerStack layers={d.layers} paintRGB={d.camouflage.paintRGB} topcoatThickness={0.08} />
                </Card>
                <Card title="">
                  <CamouflageCard cam={d.camouflage} />
                </Card>
              </div>

              {/* 配方表 */}
              <Card title="逐层配方（外 → 内）">
                <RecipeTable design={d} />
              </Card>

              {/* 智能体推理 */}
              <Card title="智能体推理">
                <ul className="space-y-1.5">
                  {res!.rationale.map((line, i) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-600 leading-relaxed">
                      <span className="text-sky-400 mt-0.5">▸</span><span>{line}</span>
                    </li>
                  ))}
                </ul>
              </Card>

              {/* 备选方案 */}
              {res!.alternatives.length > 0 && (
                <div className="bg-white/70 backdrop-blur rounded-2xl ring-1 ring-white/60 shadow">
                  <button onClick={() => setShowAlts((s) => !s)}
                    className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-slate-700">
                    比选的备选方案（{res!.alternatives.length}）
                    <ChevronDown className={`w-4 h-4 transition ${showAlts ? "rotate-180" : ""}`} />
                  </button>
                  {showAlts && (
                    <div className="px-5 pb-4 grid sm:grid-cols-2 gap-3">
                      {res!.alternatives.map((a, i) => (
                        <div key={i} className="rounded-xl bg-sky-50/60 p-3 text-sm ring-1 ring-sky-100">
                          <div className="font-semibold text-slate-700">{a.template}</div>
                          <div className="text-xs text-slate-500 mt-1 grid grid-cols-2 gap-y-0.5">
                            <span>min RL：{a.minRL.toFixed(1)} dB</span>
                            <span>带宽：{a.bandwidth10.toFixed(1)} GHz</span>
                            <span>厚度：{a.totalThickness.toFixed(2)} mm</span>
                            <span>面密度：{a.arealMass.toFixed(2)} kg/m²</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      </main>

      <footer className="text-center text-[11px] text-slate-500/80 pb-8 px-4">
        教学/科研仿真 · 物理引擎基于传输线理论 + 有效介质理论 + 瑞利散射，材料参数取自公开文献代表值 · 不含任何机密或实测配方
      </footer>
    </div>
  );
};

// ===== 小组件 =====
const Field: React.FC<{ icon?: React.ReactNode; label: string; children: React.ReactNode }> = ({ icon, label, children }) => (
  <div>
    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-1.5">{icon}{label}</div>
    {children}
  </div>
);

const Slider: React.FC<{
  icon?: React.ReactNode; label: string; value: number; min: number; max: number; step: number;
  unit: string; onChange: (v: number) => void; fmt?: (v: number) => string;
}> = ({ icon, label, value, min, max, step, unit, onChange, fmt }) => (
  <Field icon={icon} label={label}>
    <div className="flex items-center gap-3">
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 accent-sky-500" />
      <span className="w-20 text-right text-sm font-semibold text-sky-700">
        {fmt ? fmt(value) : `${value}${unit ? " " + unit : ""}`}
      </span>
    </div>
  </Field>
);

const Card: React.FC<{ title: string; right?: React.ReactNode; children: React.ReactNode }> = ({ title, right, children }) => (
  <div className="bg-white/80 backdrop-blur-md rounded-2xl p-5 ring-1 ring-white/60 shadow-lg">
    {title && (
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-slate-700">{title}</h3>{right}
      </div>
    )}
    {children}
  </div>
);

const MetricCard: React.FC<{ label: string; value: string; sub?: string; accent?: boolean; good?: boolean }> = ({ label, value, sub, accent, good }) => (
  <div className="bg-white/80 backdrop-blur-md rounded-2xl px-4 py-3 ring-1 ring-white/60 shadow">
    <div className={`text-xl font-extrabold ${accent ? "text-sky-600" : good ? "text-emerald-600" : "text-slate-800"}`}>{value}</div>
    <div className="text-[11px] text-slate-500 mt-0.5">{label}</div>
    {sub && <div className={`text-[10px] mt-0.5 ${good ? "text-emerald-500" : "text-amber-500"}`}>{sub}</div>}
  </div>
);

const RecipeTable: React.FC<{ design: CoatingDesign }> = ({ design }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
          <th className="py-2 pr-2">层</th><th className="pr-2">填料</th><th className="pr-2">基体</th>
          <th className="pr-2">体积%</th><th className="pr-2">厚度</th><th className="pr-2">ε (复)</th>
          <th className="pr-2">μ (复)</th><th>面密度</th>
        </tr>
      </thead>
      <tbody>
        <tr className="border-b border-slate-50 bg-sky-50/40">
          <td className="py-2 pr-2 font-medium text-sky-700">面漆</td>
          <td className="pr-2 text-slate-600" colSpan={2}>天蓝伪装层（非导电颜料）</td>
          <td className="pr-2 text-slate-400">—</td><td className="pr-2">0.08 mm</td>
          <td className="pr-2 text-slate-400">~4.2</td><td className="pr-2 text-slate-400">1.0</td><td className="text-slate-500">0.12</td>
        </tr>
        {design.layers.map((l, i) => {
          const f = MATERIALS[l.fillerId], m = MATERIALS[l.matrixId];
          return (
            <tr key={i} className="border-b border-slate-50">
              <td className="py-2 pr-2 font-medium text-slate-600">L{i + 1}</td>
              <td className="pr-2">
                <span className="font-medium text-slate-700">{f.name}</span>
                <span className={`ml-1 text-[10px] px-1 rounded ${f.role === "magnetic" ? "bg-amber-100 text-amber-700" : "bg-violet-100 text-violet-700"}`}>
                  {f.role === "magnetic" ? "磁损耗" : "介电损耗"}
                </span>
              </td>
              <td className="pr-2 text-slate-600">{m.name}</td>
              <td className="pr-2 text-slate-700">{(l.volFrac * 100).toFixed(0)}%</td>
              <td className="pr-2 text-slate-700">{l.thickness.toFixed(2)} mm</td>
              <td className="pr-2 text-slate-500 text-xs">{l.eps.re.toFixed(1)}{l.eps.im <= 0 ? "" : "+"}{l.eps.im.toFixed(1)}j</td>
              <td className="pr-2 text-slate-500 text-xs">{l.mu.re.toFixed(2)}{l.mu.im <= 0 ? "" : "+"}{l.mu.im.toFixed(2)}j</td>
              <td className="text-slate-600">{l.arealMass.toFixed(2)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

export default App;
