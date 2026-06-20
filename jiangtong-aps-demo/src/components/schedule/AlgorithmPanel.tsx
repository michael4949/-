// §9.1 算法决策面板：权重 4 项 + 应用+重排 + 当前 KPI
//   ★ v2.2.1：加用途说明 + 启用「A/B/C 方案对比」（3 套预设权重的 KPI 预测对比）
//   ★ v2.2.3：「应用+重排」与「采用此方案」都真正调用 reSchedule()
//             → 甘特图上 20% 工单被实际重新调度（flash 闪烁）+ KPI 实时变化 + KPI 历史新增一行
import { useState } from 'react';
import { useScheduleStore } from '../../store/useScheduleStore';
import { Sparkles, Loader2, Info, X, Crown, Check } from 'lucide-react';
import { fmtMoney, fmtPct } from '../../utils/format';
import type { AlgorithmWeights } from '../../types/schedule';

const WEIGHT_FIELDS: { key: keyof AlgorithmWeights; label: string; hint: string }[] = [
  { key: 'otd',           label: 'OTD',         hint: '交期达成率优先 · 权重高时算法会优先保证按时交付' },
  { key: 'minChangeover', label: '换型最小',     hint: '换型损失最小 · 权重高时算法会合并同规格工单减少换型' },
  { key: 'utilization',   label: '利用率',       hint: '产线饱和度优先 · 权重高时算法会让机台尽量不空闲' },
  { key: 'minWIP',        label: '在制最小',     hint: '在制库存最小 · 权重高时算法会推迟非紧急工单减少占用' },
];

// 3 套典型策略预设
interface Preset {
  id: 'A' | 'B' | 'C';
  label: string;
  detail: string;
  weights: AlgorithmWeights;
  /** 预测 KPI 变化（vs 当前基线） */
  predict: { otd: string; changeover: string; util: string; wip: string };
  recommended?: boolean;
}

const PRESETS: Preset[] = [
  {
    id: 'A',
    label: '方案 A：交期优先',
    detail: 'OTD 50% · 换型 15% · 利用率 20% · 在制 15%。适用客户对交期敏感、销售压力大的场景',
    weights: { otd: 50, minChangeover: 15, utilization: 20, minWIP: 15 },
    predict: { otd: '↑ 2.4pp', changeover: '↑ 1.8pp', util: '↓ 0.5pp', wip: '+ ¥80万' },
  },
  {
    id: 'B',
    label: '方案 B：均衡（默认）',
    detail: 'OTD 30% · 换型 25% · 利用率 25% · 在制 20%。综合最稳，适用日常排产',
    weights: { otd: 30, minChangeover: 25, utilization: 25, minWIP: 20 },
    predict: { otd: '基线', changeover: '基线', util: '基线', wip: '基线' },
    recommended: true,
  },
  {
    id: 'C',
    label: '方案 C：利用率优先',
    detail: 'OTD 20% · 换型 25% · 利用率 40% · 在制 15%。适用产能瓶颈期，需挤出产线时间',
    weights: { otd: 20, minChangeover: 25, utilization: 40, minWIP: 15 },
    predict: { otd: '↓ 1.2pp', changeover: '↓ 0.4pp', util: '↑ 3.6pp', wip: '+ ¥120万' },
  },
];

export default function AlgorithmPanel() {
  const weights = useScheduleStore((s) => s.weights);
  const setW = useScheduleStore((s) => s.setWeights);
  const reSchedule = useScheduleStore((s) => s.reSchedule);
  const kpi = useScheduleStore((s) => s.kpi);
  const [busy, setBusy] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [appliedPreset, setAppliedPreset] = useState<'A' | 'B' | 'C' | null>(null);
  /** 重排后局部 Toast：告知用户实际系统变化 */
  const [lastApply, setLastApply] = useState<{ moved: number; otd: number; co: number; util: number } | null>(null);

  const total = weights.otd + weights.minChangeover + weights.utilization + weights.minWIP;

  // ★ v2.2.3 真正系统联动：调用 reSchedule() 而非仅 KPI 重算
  async function onApply() {
    setBusy(true);
    const r = await reSchedule();
    setBusy(false);
    setLastApply({ moved: r.moved, otd: r.newKpi.otd, co: r.newKpi.changeoverLoss, util: r.newKpi.utilization });
    setTimeout(() => setLastApply(null), 6000);
  }

  function onPickPreset(p: Preset) {
    setW(p.weights);
    setAppliedPreset(p.id);
    setCompareOpen(false);
    onApply();   // 真正应用 → 甘特图重排 + KPI 变化
  }

  return (
    <div className="bg-card border border-line rounded-xl p-4">
      <div className="flex items-center mb-3">
        <span className="text-[13px] font-semibold">算法决策面板</span>
        <button
          onClick={() => setHelpOpen((v) => !v)}
          className="ml-1.5 w-5 h-5 rounded-full text-ink-faint hover:bg-bg flex items-center justify-center"
          title="什么是算法决策面板？"
        >
          <Info size={12} />
        </button>
        <span className="ml-3 text-[11px] text-ink-faint">目标权重（合计 {total}）</span>
        <div className="ml-auto flex gap-2">
          <button onClick={onApply} disabled={busy} className="btn btn-primary">
            {busy ? <Loader2 size={13} className="animate-spin" /> : '✓'} 应用+重排
          </button>
          <button onClick={() => setCompareOpen(true)} className="btn btn-ai">
            <Sparkles size={12} /> 对比 A/B/C 方案
          </button>
        </div>
      </div>

      {helpOpen && (
        <div className="mb-3 rounded-md bg-ai-bg/40 border-l-4 border-ai px-3 py-2 text-[12px] text-ink-dim leading-relaxed">
          <b className="text-ai">用途：</b>调整下方 4 项权重 → 排产算法基于您的偏好重新评分 → 影响 OTD（交期）/ 换型损失 / 利用率 / 在制库存 等 KPI。
          <br />
          <b className="text-ai">建议：</b>不确定怎么设权重时，点右上「<Sparkles size={10} className="inline mb-0.5" /> 对比 A/B/C 方案」让 AI 帮您比较 3 套典型预设。
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {WEIGHT_FIELDS.map((f) => (
          <div key={f.key} title={f.hint}>
            <div className="flex items-baseline mb-1.5">
              <span className="text-[11.5px] text-ink-dim">{f.label}</span>
              <span className="ml-auto text-[12px] font-bold tabular-nums text-brand">{weights[f.key]}%</span>
            </div>
            <input
              type="range" min={0} max={100} step={5}
              value={weights[f.key]}
              onChange={(e) => setW({ [f.key]: Number(e.target.value) } as Partial<AlgorithmWeights>)}
              className="w-full accent-brand"
            />
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-line flex flex-wrap gap-x-6 gap-y-1.5">
        <KpiPill label="当前 OTD"     value={fmtPct(kpi.otd)} />
        <KpiPill label="换型损失"    value={fmtPct(kpi.changeoverLoss)} />
        <KpiPill label="利用率"      value={fmtPct(kpi.utilization)} />
        <KpiPill label="在制"        value={fmtMoney(kpi.wipValue)} />
        {appliedPreset && (
          <span className="ml-auto text-[11px] text-ai font-semibold">
            <Check size={10} className="inline mb-0.5" /> 已采用预设方案 {appliedPreset}
          </span>
        )}
      </div>

      {/* ★ v2.2.3 重排结果实时回显（替代之前的"无反应"） */}
      {lastApply && (
        <div className="mt-2 rounded-md bg-ok/10 border-l-4 border-ok px-3 py-2 text-[11.5px] text-ok flex items-center gap-2 animate-modal-in">
          <Check size={12} className="flex-none" />
          <span>
            <b>✓ 已重排 {lastApply.moved} 张工单</b> · 甘特图上对应工单条紫色闪烁 · OTD {fmtPct(lastApply.otd)} · 换型 {fmtPct(lastApply.co)} · 利用率 {fmtPct(lastApply.util)}
            <span className="ml-2 text-ink-faint">(刚才的指标已写入 KPI 对比表，点「KPI 对比」可见)</span>
          </span>
        </div>
      )}

      {/* A/B/C 方案对比 Modal */}
      {compareOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center px-4" onClick={() => setCompareOpen(false)}>
          <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" />
          <div onClick={(e) => e.stopPropagation()}
               className="relative w-full max-w-[900px] max-h-[88vh] bg-card border border-line rounded-xl shadow-card flex flex-col overflow-hidden animate-modal-in">
            <div className="h-1 bg-gradient-to-r from-ai via-purple-500 to-pink-400" />
            <div className="flex items-center gap-2 px-5 py-3 border-b border-line">
              <span className="ai-chip"><Sparkles size={11} />AI 推演</span>
              <h3 className="text-[14px] font-semibold">3 套权重预设 · KPI 对比预测</h3>
              <button onClick={() => setCompareOpen(false)} className="ml-auto w-8 h-8 rounded-md hover:bg-bg flex items-center justify-center text-ink-faint">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="rounded-md bg-panel2 px-4 py-2.5 text-[12.5px] leading-relaxed mb-4">
                AI 基于历史 60 天工单数据 + 当前在排订单结构，预测每套权重方案对 4 项 KPI 的影响。选择采用后将自动应用并触发重排。
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {PRESETS.map((p) => (
                  <div key={p.id}
                       className={`relative rounded-lg border p-3
                                   ${p.recommended ? 'border-ai shadow-[0_0_0_1px_rgba(124,58,237,0.2)]' : 'border-line'}
                                   ${appliedPreset === p.id ? 'ring-2 ring-ok ring-offset-1 ring-offset-card' : ''}`}>
                    {p.recommended && (
                      <span className="absolute -top-2.5 right-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-white bg-ai rounded px-1.5 py-0.5">
                        <Crown size={10} /> AI 推荐
                      </span>
                    )}
                    <div className="text-[13px] font-semibold mb-1.5">{p.label}</div>
                    <div className="text-[11.5px] text-ink-dim mb-3 leading-relaxed">{p.detail}</div>
                    <div className="space-y-1 text-[11.5px] mb-3">
                      <KpiRow label="OTD"     value={p.predict.otd} />
                      <KpiRow label="换型损失" value={p.predict.changeover} />
                      <KpiRow label="利用率"   value={p.predict.util} />
                      <KpiRow label="在制"     value={p.predict.wip} />
                    </div>
                    <button onClick={() => onPickPreset(p)}
                            disabled={appliedPreset === p.id}
                            className={`btn btn-sm w-full justify-center
                                        ${appliedPreset === p.id ? 'bg-ok text-white border-ok hover:bg-ok hover:text-white' : 'btn-ai'}`}>
                      {appliedPreset === p.id ? <><Check size={12} />已采用</> : '采用此方案'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-[12px] text-ink-dim">
      {label} <b className="ml-1 text-ink font-semibold tabular-nums">{value}</b>
    </div>
  );
}

function KpiRow({ label, value }: { label: string; value: string }) {
  const isBase = value === '基线';
  const isUp = value.startsWith('↑') || value.startsWith('+');
  const cls = isBase ? 'text-ink-dim' : isUp && (label === 'OTD' || label === '利用率') ? 'text-ok'
            : isUp ? 'text-warn'
            : 'text-ok';
  return (
    <div className="flex items-baseline">
      <span className="text-ink-faint">{label}</span>
      <span className={`ml-auto font-semibold tabular-nums ${cls}`}>{value}</span>
    </div>
  );
}
