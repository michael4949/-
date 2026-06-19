// Sprint 5 · 甘特图高亮 store（#16 自然语言搜索匹配的工单 ID）
import { create } from 'zustand';

interface GanttHighlightState {
  ids: Set<string>;
  setIds: (ids: string[]) => void;
  clear: () => void;
}

export const useGanttHighlightStore = create<GanttHighlightState>((set) => ({
  ids: new Set(),
  setIds: (ids) => set({ ids: new Set(ids) }),
  clear: () => set({ ids: new Set() }),
}));
