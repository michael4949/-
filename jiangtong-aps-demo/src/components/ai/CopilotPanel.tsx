import { Sparkles, X, Send } from 'lucide-react';
import { useCopilotStore } from '../../store/useCopilotStore';

// §11.1 Copilot 全局组件外壳（Sprint 0 仅外壳；Sprint 2/3 填充 Agent 行为）
export default function CopilotPanel() {
  const { open, toggle, setOpen, contextAgent } = useCopilotStore();

  return (
    <>
      {/* 悬浮按钮 */}
      {!open && (
        <button
          onClick={toggle}
          className="fixed right-6 bottom-6 z-[9999] h-12 px-4 rounded-full
                     bg-gradient-to-br from-ai to-purple-500 text-white font-semibold text-[13px]
                     shadow-fab hover:shadow-[0_14px_40px_rgba(124,58,237,0.4)]
                     transition-all flex items-center gap-2"
          title="排产助手 · AI"
        >
          <Sparkles size={16} />
          <span>AI 助手</span>
        </button>
      )}

      {/* 右抽屉 */}
      <aside
        className={`fixed top-0 right-0 h-screen w-[420px] z-[9999] bg-card border-l border-line
                    shadow-[-10px_0_40px_rgba(17,24,39,0.10)]
                    transform transition-transform duration-300
                    ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* 头部 */}
        <div className="h-14 px-4 flex items-center gap-3 border-b border-line bg-panel2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-ai to-purple-500
                          flex items-center justify-center text-white">
            <Sparkles size={15} />
          </div>
          <div className="leading-tight">
            <div className="text-[14px] font-semibold">排产助手</div>
            <div className="text-[10.5px] text-ink-faint">
              {contextAgent ? `已绑定 · ${contextAgent}` : '当前页未绑定 Agent · 仅演示'}
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="ml-auto w-8 h-8 rounded-lg hover:bg-bg flex items-center justify-center text-ink-dim"
            title="关闭"
          >
            <X size={16} />
          </button>
        </div>

        {/* 消息区（Sprint 0 占位） */}
        <div className="h-[calc(100vh-14rem)] overflow-y-auto px-4 py-4 space-y-3 bg-bg">
          <div className="text-[12.5px] text-ink-dim leading-7 border border-dashed border-line rounded-lg px-4 py-3 bg-card">
            您好，我是排产助手 ✨ <br />
            Sprint 0 仅完成外壳。智能体行为将在 Sprint 2/3 落地：
            <ul className="mt-2 space-y-1 list-disc pl-5 text-ink-faint text-[12px]">
              <li>智能排产页 → 紧急插单 / 排产解释 / 异常识别</li>
              <li>成本核算页 → 损耗诊断 / 成本分析</li>
            </ul>
          </div>
        </div>

        {/* 底部输入 */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-line p-3 bg-card">
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            <button className="ai-chip cursor-pointer hover:bg-ai-soft">急单怎么排</button>
            <button className="ai-chip cursor-pointer hover:bg-ai-soft">解释当前方案</button>
            <button className="ai-chip cursor-pointer hover:bg-ai-soft">本月成本分析</button>
          </div>
          <div className="flex items-center gap-2">
            <input
              disabled
              placeholder="向排产助手提问…（Sprint 2 启用）"
              className="flex-1 h-9 px-3 rounded-lg bg-panel2 border border-line text-[12.5px]
                         placeholder:text-ink-faint outline-none focus:border-ai focus:ring-2 focus:ring-ai/20"
            />
            <button className="w-9 h-9 rounded-lg bg-gradient-to-br from-ai to-purple-500 text-white
                               flex items-center justify-center opacity-50 cursor-not-allowed">
              <Send size={14} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
