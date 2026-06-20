// v2.2.4 · Dashboard 用的「可交互 Insight Card」
//   不同于普通 AIInsightCard 仅"跳转"的行为，本卡片为每个观察式 Agent 提供「立即应用」按钮
//   点击后系统真状态变化（写入 ops store）+ 卡片自身转变为"已应用 ✓"
import { useState } from 'react';
import { Sparkles, Check, ArrowRight, Loader2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface ActionableInsightProps {
  id: string;
  agentNumber: number;
  agentName: string;
  message: string;
  /** 主操作 */
  primaryAction: {
    label: string;
    /** 主操作执行函数，返回执行结果文案（异步） */
    apply: () => Promise<string>;
  };
  /** 次操作（去详情页） */
  secondaryAction?: { label: string; route: string };
  onDismiss?: () => void;
}

export default function ActionableInsightCard({
  id, agentNumber, agentName, message, primaryAction, secondaryAction, onDismiss,
}: ActionableInsightProps) {
  const [state, setState] = useState<'pending' | 'applying' | 'applied'>('pending');
  const [resultMsg, setResultMsg] = useState<string>('');
  const nav = useNavigate();

  async function onApply() {
    setState('applying');
    const msg = await primaryAction.apply();
    setResultMsg(msg);
    setState('applied');
  }

  return (
    <div className={`flex items-start gap-3 rounded-lg border-l-4 px-4 py-3 transition-all
                    ${state === 'applied' ? 'border-ok bg-ok/8' : 'border-ai bg-ai-bg/60'}`}>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-ai px-1.5 py-0.5 rounded bg-ai/15">
            Agent #{agentNumber} · {agentName}
          </span>
          {state === 'applied' && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-ok px-1.5 py-0.5 rounded bg-ok/15">
              ✓ 已应用
            </span>
          )}
        </div>
        <div className="text-[13px] leading-6 text-ink font-medium">
          {state === 'applied' ? resultMsg : message}
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-none">
        {state === 'pending' && (
          <>
            {secondaryAction && (
              <button
                onClick={() => nav(secondaryAction.route)}
                className="btn btn-sm"
              >{secondaryAction.label}</button>
            )}
            <button
              onClick={onApply}
              className="btn btn-sm btn-ai"
            >
              <Sparkles size={11} />{primaryAction.label}
            </button>
          </>
        )}
        {state === 'applying' && (
          <button disabled className="btn btn-sm btn-ai">
            <Loader2 size={11} className="animate-spin" />应用中…
          </button>
        )}
        {state === 'applied' && secondaryAction && (
          <button
            onClick={() => nav(secondaryAction.route)}
            className="btn btn-sm bg-ok text-white border-ok hover:bg-ok hover:text-white"
          >
            <Check size={11} />{secondaryAction.label} <ArrowRight size={11} />
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="w-7 h-7 rounded-md text-ink-faint hover:bg-ai-soft hover:text-ai flex items-center justify-center"
            title="忽略"
          ><X size={14} /></button>
        )}
      </div>
    </div>
  );
}
