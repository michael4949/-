import { create } from 'zustand';
import type { CopilotMessage, AgentId } from '../types/ai';

interface CopilotState {
  open: boolean;
  // 当前页 context → 绑定具体 Agent
  contextRoute: string;
  contextAgent: AgentId | null;
  messages: CopilotMessage[];
  // actions
  toggle: () => void;
  setOpen: (v: boolean) => void;
  setContext: (route: string) => void;
  pushMessage: (m: CopilotMessage) => void;
  reset: () => void;
}

function routeToAgent(route: string): AgentId | null {
  if (route.startsWith('/schedule')) return 'schedule.insert-assistant';
  if (route.startsWith('/cost')) return 'cost.analysis-assistant';
  return null;
}

export const useCopilotStore = create<CopilotState>((set) => ({
  open: false,
  contextRoute: '/',
  contextAgent: null,
  messages: [],
  toggle: () => set((s) => ({ open: !s.open })),
  setOpen: (v) => set({ open: v }),
  setContext: (route) => set({ contextRoute: route, contextAgent: routeToAgent(route) }),
  pushMessage: (m) => set((s) => ({ messages: [...s.messages, m] })),
  reset: () => set({ messages: [] }),
}));
