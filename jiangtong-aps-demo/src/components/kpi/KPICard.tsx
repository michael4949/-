import { useNavigate } from 'react-router-dom';
import type { KPI } from '../../types/dashboard';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Props { kpi: KPI }
export default function KPICard({ kpi }: Props) {
  const nav = useNavigate();
  const clickable = !!kpi.drilldownRoute;
  return (
    <div
      onClick={() => clickable && nav(kpi.drilldownRoute!)}
      className={`kpi-card ${clickable ? 'cursor-pointer hover:border-brand/60 hover:shadow-md' : ''}`}
    >
      <div className="flex items-center gap-1.5 text-[11.5px] text-ink-dim">
        <span>{kpi.icon}</span>
        <span>{kpi.label}</span>
      </div>
      <div className="text-[22px] font-bold tracking-tight tabular-nums leading-tight">
        {kpi.value}
      </div>
      {kpi.delta && (
        <div className={`flex items-center gap-1 text-[11px] font-semibold tabular-nums
                         ${kpi.delta.isGood ? 'text-ok' : 'text-danger'}`}>
          {kpi.delta.direction === 'up' ? <TrendingUp size={11} />
           : kpi.delta.direction === 'down' ? <TrendingDown size={11} />
           : <Minus size={11} />}
          <span>{kpi.delta.text}</span>
        </div>
      )}
    </div>
  );
}
