import type { CostKPI } from '../../types/cost';
import { fmtMoney, fmtPct } from '../../utils/format';
import { TrendingDown } from 'lucide-react';

export default function CostKPICards({ kpi }: { kpi: CostKPI }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card icon="💰" label="本月总成本"  value={fmtMoney(kpi.totalCost)} />
      <Card icon="📈" label="平均单位成本" value={`¥${kpi.avgUnitCost.toLocaleString()}/吨`} />
      <Card icon="🔥" label="铜耗损耗率" value={fmtPct(kpi.copperLossRate, 2)}
            footer={
              <span className="text-ok inline-flex items-center gap-1 text-[11px] font-semibold">
                <TrendingDown size={11} />基线 {fmtPct(kpi.copperLossRateBaseline, 2)}
              </span>
            } />
      <Card icon="♻️" label="废料回收价值" value={fmtMoney(kpi.scrapRecoveryValue)}
            footer={
              <span className="text-ai text-[11px] font-semibold">
                相当于成本回补 {fmtPct(kpi.scrapRecoveryRate, 2)}
              </span>
            } />
    </div>
  );
}

function Card({ icon, label, value, footer }: { icon: string; label: string; value: string; footer?: React.ReactNode }) {
  return (
    <div className="kpi-card">
      <div className="flex items-center gap-1.5 text-[12px] text-ink-dim">
        <span>{icon}</span><span>{label}</span>
      </div>
      <div className="text-[24px] font-bold tracking-tight tabular-nums leading-tight">{value}</div>
      {footer && <div>{footer}</div>}
    </div>
  );
}
