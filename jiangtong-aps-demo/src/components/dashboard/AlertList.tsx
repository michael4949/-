import { useNavigate } from 'react-router-dom';
import type { AlertItem } from '../../types/dashboard';

const COLOR: Record<AlertItem['type'], string> = {
  缺料: 'text-warn',
  延期: 'text-danger',
  产能: 'text-info',
  损耗: 'text-ai',
};

export default function AlertList({ items }: { items: AlertItem[] }) {
  const nav = useNavigate();
  const total = items.reduce((s, x) => s + x.count, 0);
  return (
    <div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {items.map((a) => (
          <div key={a.id} className="flex items-center gap-2 px-3 py-2 rounded-md bg-panel2">
            <span className="text-[12px] text-ink-dim">{a.type}</span>
            <span className={`ml-auto text-[14px] font-bold tabular-nums ${COLOR[a.type]}`}>{a.count}</span>
          </div>
        ))}
      </div>
      <button onClick={() => nav('/alerts')}
              className="w-full btn">前往处置中心（共 {total} 条）→</button>
    </div>
  );
}
