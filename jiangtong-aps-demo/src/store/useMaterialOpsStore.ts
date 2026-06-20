// v2.2.2 · 物料齐套页 AI 操作状态
//   - preparedIds: 已应用 AI 准备建议的缺料工单（从风险列表移除，齐套率上升）
import { create } from 'zustand';

interface MaterialOpsState {
  preparedIds: Set<string>;
  prepareItem: (id: string) => void;
}

export const useMaterialOpsStore = create<MaterialOpsState>((set) => ({
  preparedIds: new Set(),
  prepareItem: (id) => set((s) => {
    const next = new Set(s.preparedIds); next.add(id);
    return { preparedIds: next };
  }),
}));
