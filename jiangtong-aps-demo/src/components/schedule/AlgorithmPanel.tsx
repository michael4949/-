// §9.1 算法决策面板：权重 4 项 + 应用+重排 + 当前 KPI
import { useState } from 'react';
import { useScheduleStore } from '../../store/useScheduleStore';
import { Sparkles, Loader2 } from 'lucide-react';
import { fmtMoney, fmtPct } from '../../utils/format';

const WEIGHT_FIELDS: { key: keyof ReturnType<typeof useScheduleStore.getState>['weights']; label: string }[] = [
  { key: 'otd',           label: 'OTD' },
  { key: 'minChangeover', label: '换型最小' },
  { key: 'utilization',   label: '利用率' },
  { key: 'minWIP',        label: '在制最小' },
];

export default function AlgorithmPanel() {
  const weights = useScheduleStore((s) => s.weights);
  const setW = useScheduleStore((s) => s.setWeights);
  const applyW = useScheduleStore((s) => s.applyWeights);
  const kpi = useScheduleStore((s) => s.kpi);
  const [busy, setBusy] = useState(false);

  const total = weights.otd + weights.minChangeover + weights.utilization + weights.minWIP;

  async function onApply() {
    setBusy(true);
    await applyW();
    setBusy(false);
  }

  return (
    <div className="bg-card border border-line rounded-xl p-4">
      <div className="flex items-center mb-3">
        <span className="text-[13px] font-semibold">算法决策面板</span>
        <span className="ml-3 text-[11px] text-ink-faint">目标权重（合计 {total}）</span>
        <div className="ml-auto flex gap-2">
          <button onClick={onApply} disabled={busy} className="btn btn-primary">
            {busy ? <Loader2 size={13} className="animate-spin" /> : '✓'} 应用+重排
          </button>
          <button disabled className="btn btn-ai opacity-60 cursor-not-allowed" title="Sprint 2 启用">
            <Sparkles size={12} /> 对比 A/B/C 方案
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {WEIGHT_FIELDS.map((f) => (
          <div key={f.key}>
            <div className="flex items-baseline mb-1.5">
              <span className="text-[11.5px] text-ink-dim">{f.label}</span>
              <span className="ml-auto text-[12px] font-bold tabular-nums text-brand">{weights[f.key]}%</span>
            </div>
            <input
              type="range" min={0} max={100} step={5}
              value={weights[f.key]}
              onChange={(e) => setW({ [f.key]: Number(e.target.value) } as any)}
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
      </div>
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
