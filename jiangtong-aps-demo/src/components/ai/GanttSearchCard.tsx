// Agent #16 甘特图智能搜索结果卡（Copilot 内嵌）
import { Eye, EyeOff } from 'lucide-react';
import { useScheduleStore } from '../../store/useScheduleStore';
import type { GanttSearchOutput } from '../../mock/agentResponses.sprint5';

interface Props {
  data: GanttSearchOutput;
  onClearHighlight: () => void;
}

export default function GanttSearchCard({ data, onClearHighlight }: Props) {
  const select = useScheduleStore((s) => s.select);

  return (
    <div className="rounded-lg border border-ai/30 bg-ai-bg/40 p-2.5 space-y-2">
      <div className="flex items-center gap-2">
        <Eye size={12} className="text-ai" />
        <span className="text-[11.5px] text-ai font-semibold">
          匹配 {data.matched.length} 张 · 已在甘特图中高亮
        </span>
        <button
          onClick={onClearHighlight}
          className="ml-auto text-[10.5px] text-ink-faint hover:text-ai inline-flex items-center gap-0.5"
        >
          <EyeOff size={10} />清除高亮
        </button>
      </div>
      <div className="space-y-1">
        {data.matched.map((m) => (
          <button
            key={m.id}
            onClick={() => select(m.id)}
            className="block w-full text-left bg-card border border-line rounded-md px-2 py-1.5 hover:border-ai transition-colors"
          >
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-mono text-[10.5px] text-ink">{m.id}</span>
              <span className="text-[10.5px] text-ink-dim truncate">{m.product}</span>
            </div>
            <div className="text-[10.5px] text-ink-faint">
              {m.resource} · {m.window}
            </div>
            <div className="text-[10.5px] text-ai mt-0.5">▸ {m.reason}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
