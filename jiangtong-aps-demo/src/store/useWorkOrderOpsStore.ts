// v2.2.2 · 工单管理页 AI 操作状态
//   - markedAnalyzed: 用户已查看 AI 异常分析的工单（异常 KPI 中减除）
//   - bomGenerated:   样品工单已生成并保存 BOM
//   ★ v2.2.4：加 batchMarkAnalyzed（Dashboard #9 一键处置全部）
import { create } from 'zustand';

interface WorkOrderOpsState {
  markedAnalyzed: Set<string>;
  bomGenerated: Set<string>;
  markAnalyzed: (id: string) => void;
  setBOMGenerated: (id: string) => void;
  batchMarkAnalyzed: (ids: string[]) => void;
}

export const useWorkOrderOpsStore = create<WorkOrderOpsState>((set) => ({
  markedAnalyzed: new Set(),
  bomGenerated: new Set(),
  markAnalyzed: (id) => set((s) => {
    const next = new Set(s.markedAnalyzed); next.add(id);
    return { markedAnalyzed: next };
  }),
  setBOMGenerated: (id) => set((s) => {
    const next = new Set(s.bomGenerated); next.add(id);
    return { bomGenerated: next };
  }),
  batchMarkAnalyzed: (ids) => set((s) => {
    const next = new Set(s.markedAnalyzed);
    ids.forEach((id) => next.add(id));
    return { markedAnalyzed: next };
  }),
}));
