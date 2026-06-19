import { X, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
// §11.5 居中 Modal + 顶部紫色渐变条 + "✨ AI 生成" 小标
// Sprint 1 仅外壳，Sprint 2/3 注入内容
interface Props {
  open: boolean;
  title: string;
  content: string | ReactNode;
  primaryAction?: { label: string; onClick: () => void };
  onClose: () => void;
}
export default function AIExplainModal({ open, title, content, primaryAction, onClose }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[560px] max-h-[80vh] bg-card border border-line rounded-xl shadow-card flex flex-col overflow-hidden"
      >
        <div className="h-1 bg-gradient-to-r from-ai via-purple-500 to-pink-400" />
        <div className="flex items-center gap-2 px-5 py-3 border-b border-line">
          <span className="ai-chip">
            <Sparkles size={11} /> AI 生成
          </span>
          <h3 className="text-[14px] font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="ml-auto w-8 h-8 rounded-md hover:bg-bg flex items-center justify-center text-ink-faint"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 text-[13px] leading-7 text-ink-dim">
          {typeof content === 'string' ? <p className="whitespace-pre-wrap">{content}</p> : content}
        </div>
        {primaryAction && (
          <div className="p-3 border-t border-line bg-panel2 flex justify-end gap-2">
            <button onClick={onClose} className="btn">关闭</button>
            <button onClick={primaryAction.onClick} className="btn btn-ai">{primaryAction.label}</button>
          </div>
        )}
      </div>
    </div>
  );
}
