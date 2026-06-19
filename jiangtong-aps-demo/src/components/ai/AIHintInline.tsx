import type { GanttAIHint } from '../../types/ai';
// §11.4 甘特图行末浮现紫色文字 + 🤖 图标 + 可点击
// Sprint 1 仅占位，Sprint 2 由 schedule.anomaly-observer 接管
interface Props { hint: GanttAIHint; onClick?: () => void }
export default function AIHintInline({ hint, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-ai bg-ai-bg
                 border border-ai/30 rounded-md px-1.5 py-0.5 hover:bg-ai hover:text-white transition-colors"
      title={hint.message}
    >
      🤖 {hint.message}
    </button>
  );
}
