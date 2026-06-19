// §11.1 + §6 Copilot 行为
import { create } from 'zustand';
import type { CopilotMessage, AgentId } from '../types/ai';

interface CopilotState {
  open: boolean;
  contextRoute: string;
  contextAgent: AgentId | null;
  messages: CopilotMessage[];
  thinking: boolean;
  /** 由外部注入的待发送问题（如 Agent #4 报告中点击关联数据） */
  pendingQuestion: string | null;
  // actions
  toggle: () => void;
  setOpen: (v: boolean) => void;
  setContext: (route: string) => void;
  pushMessage: (m: CopilotMessage) => void;
  setThinking: (v: boolean) => void;
  reset: () => void;
  injectQuestion: (q: string) => void;     // 打开抽屉 + 写入待发送
  consumeQuestion: () => string | null;     // 取出并清空
}

function routeToAgent(route: string): AgentId | null {
  if (/schedule/.test(route)) return 'schedule.insert-assistant';
  if (/cost/.test(route))     return 'cost.analysis-assistant';
  return null;
}

export const useCopilotStore = create<CopilotState>((set, get) => ({
  open: false,
  contextRoute: '/',
  contextAgent: null,
  messages: [],
  thinking: false,
  pendingQuestion: null,
  toggle: () => set((s) => ({ open: !s.open })),
  setOpen: (v) => set({ open: v }),
  setContext: (route) => set({ contextRoute: route, contextAgent: routeToAgent(route) }),
  pushMessage: (m) => set((s) => ({ messages: [...s.messages, m] })),
  setThinking: (v) => set({ thinking: v }),
  reset: () => set({ messages: [], thinking: false }),
  injectQuestion: (q) => set({ open: true, pendingQuestion: q }),
  consumeQuestion: () => {
    const q = get().pendingQuestion;
    if (q) set({ pendingQuestion: null });
    return q;
  },
}));
