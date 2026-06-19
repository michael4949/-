import { useNavigate } from 'react-router-dom';
import type { TodoItem } from '../../types/dashboard';

const SEV_CLR: Record<TodoItem['severity'], { dot: string; tag: string }> = {
  urgent: { dot: 'bg-danger', tag: 'text-danger' },
  normal: { dot: 'bg-warn',   tag: 'text-warn' },
  info:   { dot: 'bg-ok',     tag: 'text-ok' },
};
export default function TodoList({ items }: { items: TodoItem[] }) {
  const nav = useNavigate();
  return (
    <ul className="space-y-2">
      {items.map((t) => (
        <li key={t.id}
            onClick={() => t.route && nav(t.route)}
            className="flex items-center gap-3 px-3 py-2 rounded-md bg-panel2 hover:bg-bg cursor-pointer transition-colors">
          <span className={`w-2 h-2 rounded-full ${SEV_CLR[t.severity].dot}`} />
          <span className="text-[12.5px] text-ink flex-1">{t.label}</span>
          <span className={`text-[13px] font-bold tabular-nums ${SEV_CLR[t.severity].tag}`}>{t.count}</span>
          <span className="text-ink-faint text-[11px]">张</span>
        </li>
      ))}
    </ul>
  );
}
