import { X, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { AIInsight } from '../../types/ai';

interface Props {
  insight: AIInsight;
  onDismiss?: (id: string) => void;
}
// §11.2 紫色左边框 + 浅紫背景 + emoji + 一句话 + 主操作 + 关闭
export default function AIInsightCard({ insight, onDismiss }: Props) {
  const nav = useNavigate();
  return (
    <div className="ai-insight gap-3 group">
      <div className="flex-1 text-[13px] leading-6 text-ink font-medium">
        {insight.message}
      </div>
      <button
        onClick={() => nav(insight.primaryAction.route)}
        className="btn btn-ai btn-sm flex-none"
      >
        {insight.primaryAction.label}
        <ArrowRight size={12} />
      </button>
      {insight.dismissible && onDismiss && (
        <button
          onClick={() => onDismiss(insight.id)}
          className="flex-none w-7 h-7 rounded-md text-ink-faint hover:bg-ai-soft hover:text-ai flex items-center justify-center"
          title="忽略"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
