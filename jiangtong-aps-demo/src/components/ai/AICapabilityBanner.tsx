// ★ v2.2.1 · AI 能力概览 Banner（不可关闭）
//   解决用户反馈"另外的智能体智能在哪我没看出来"——在每个 Sprint 4-6 页面顶部
//   持久展示本页接入的 AI Agent 列表与触点说明
//   ★ v2.2.5：增加 generator 类型（一键批量应用），observer 类型已弃用（所有原观察式都升级了）
import { Sparkles } from 'lucide-react';

interface Capability {
  num: number;
  name: string;
  touchpoint: string;
  /** 触点 emoji / 颜色 */
  type: 'observer' | 'button' | 'modal' | 'copilot' | 'generator';
}

interface Props {
  capabilities: Capability[];
}

const TYPE_BADGE: Record<Capability['type'], { bg: string; text: string; label: string }> = {
  observer:  { bg: 'bg-info/15',  text: 'text-info',  label: '观察式' },
  button:    { bg: 'bg-ok/15',    text: 'text-ok',    label: '✨ 按钮' },
  modal:     { bg: 'bg-warn/15',  text: 'text-warn',  label: '解释 Modal' },
  copilot:   { bg: 'bg-ai/15',    text: 'text-ai',    label: '对话' },
  generator: { bg: 'bg-ai/15',    text: 'text-ai',    label: '✨ 一键应用' },
};

export default function AICapabilityBanner({ capabilities }: Props) {
  return (
    <div className="card-base p-3 border-l-4 border-ai bg-ai-bg/30">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-ai">
          <Sparkles size={13} />本页 AI 能力（{capabilities.length} 个 Agent 在运行）
        </div>
        <span className="text-[11px] text-ink-faint ml-1">· 触点列表如下，鼠标悬停查看用途</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {capabilities.map((c) => {
          const t = TYPE_BADGE[c.type];
          return (
            <div
              key={c.num}
              title={`Agent #${c.num} · ${c.touchpoint}`}
              className="inline-flex items-center gap-1.5 bg-card border border-line rounded-md px-2 py-1 text-[11px] hover:border-ai cursor-help transition-colors"
            >
              <span className="text-ink-faint font-mono">#{c.num}</span>
              <span className="text-ink font-medium">{c.name}</span>
              <span className={`tag ${t.bg} ${t.text}`}>{t.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
