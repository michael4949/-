// §11.5 AIExplainModal —— 全局单例（Agent #2 / #3 共用）
import { X, Sparkles, Loader2 } from 'lucide-react';
import { useExplainStore } from '../../store/useExplainStore';

export default function AIExplainModal() {
  const { open, loading, title, content, primaryAction, close } = useExplainStore();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center px-4" onClick={close}>
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[620px] max-h-[82vh] bg-card border border-line rounded-xl shadow-card flex flex-col overflow-hidden animate-modal-in"
      >
        <div className="h-1 bg-gradient-to-r from-ai via-purple-500 to-pink-400" />
        <div className="flex items-center gap-2 px-5 py-3 border-b border-line">
          <span className="ai-chip">
            <Sparkles size={11} /> AI 生成
          </span>
          <h3 className="text-[14px] font-semibold">{title}</h3>
          <button
            onClick={close}
            className="ml-auto w-8 h-8 rounded-md hover:bg-bg flex items-center justify-center text-ink-faint"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 text-[13px] leading-7 text-ink-dim">
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-12 text-ai">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-[13.5px] font-medium">AI 思考中…</span>
            </div>
          ) : content}
        </div>
        {primaryAction && !loading && (
          <div className="p-3 border-t border-line bg-panel2 flex justify-end gap-2">
            <button onClick={close} className="btn">忽略</button>
            <button onClick={primaryAction.onClick} className="btn btn-ai">{primaryAction.label}</button>
          </div>
        )}
      </div>
    </div>
  );
}
