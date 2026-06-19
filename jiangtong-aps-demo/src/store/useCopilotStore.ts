// §11.1 + §6 Copilot 行为：消息流 / 上下文 / 调用 Agent / 渲染富消息
import { create } from 'zustand';
import type { CopilotMessage, AgentId } from '../types/ai';

interface CopilotState {
  open: boolean;
  // 当前页 context → 绑定具体 Agent
  contextRoute: string;
  contextAgent: AgentId | null;
  messages: CopilotMessage[];
  thinking: boolean;
  // actions
  toggle: () => void;
  setOpen: (v: boolean) => void;
  setContext: (route: string) => void;
  pushMessage: (m: CopilotMessage) => void;
  setThinking: (v: boolean) => void;
  reset: () => void;
}

function routeToAgent(route: string): AgentId | null {
  // 兼容 BrowserRouter 与 HashRouter；统一从 route 字符串中查找
  if (/schedule/.test(route)) return 'schedule.insert-assistant';
  if (/cost/.test(route))     return 'cost.analysis-assistant';
  return null;
}

export const useCopilotStore = create<CopilotState>((set) => ({
  open: false,
  contextRoute: '/',
  contextAgent: null,
  messages: [],
  thinking: false,
  toggle: () => set((s) => ({ open: !s.open })),
  setOpen: (v) => set({ open: v }),
  setContext: (route) => set({ contextRoute: route, contextAgent: routeToAgent(route) }),
  pushMessage: (m) => set((s) => ({ messages: [...s.messages, m] })),
  setThinking: (v) => set({ thinking: v }),
  reset: () => set({ messages: [], thinking: false }),
}));
