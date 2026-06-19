import { useNavigate } from 'react-router-dom';
import type { WorkshopLoad } from '../../types/dashboard';

export default function WorkshopStatus({ items }: { items: WorkshopLoad[] }) {
  const nav = useNavigate();
  return (
    <div>
      <ul className="space-y-3 mb-3">
        {items.map((w) => {
          const heatHi = w.percent >= 80 ? 'bg-ok' : w.percent >= 65 ? 'bg-warn' : 'bg-danger';
          return (
            <li key={w.workshop} className="flex items-center gap-4">
              <div className="w-24 text-[12.5px] text-ink flex-none">{w.workshop}</div>
              <div className="text-[11px] text-ink-faint flex-none w-16">{w.totalLines} 条</div>
              <div className="flex-1 h-2 rounded-full bg-bg overflow-hidden">
                <div className={`h-full rounded-full ${heatHi}`} style={{ width: `${w.percent}%` }} />
              </div>
              <div className="w-14 text-right text-[12px] font-semibold tabular-nums">{w.percent}%</div>
              <div className="text-[11px] text-ink-faint flex-none w-12">在产</div>
            </li>
          );
        })}
      </ul>
      <button onClick={() => nav('/schedule')} className="btn w-full">查看实时甘特图 →</button>
    </div>
  );
}
