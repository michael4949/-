// v2.2.2 · 产能负荷分析 AI 操作状态
//   - appliedMitigations: 已应用的缓解方案（按 bottleneckResourceId）
//   - resolvedBottlenecks: 已解除瓶颈的资源 ID
//   ★ v2.2.4：加 batchApplyAllBottlenecks（#14 一键全部应用 AI 推荐方案 A）
import { create } from 'zustand';

interface CapacityOpsState {
  /** key = resourceId, value = appliedPlanId */
  appliedMitigations: Map<string, 'A' | 'B' | 'C'>;
  resolvedBottlenecks: Set<string>;
  applyMitigation: (resourceId: string, planId: 'A' | 'B' | 'C') => void;
  batchApplyAllBottlenecks: (resourceIds: string[]) => void;
}

export const useCapacityOpsStore = create<CapacityOpsState>((set) => ({
  appliedMitigations: new Map(),
  resolvedBottlenecks: new Set(),
  applyMitigation: (resourceId, planId) => set((s) => {
    const m = new Map(s.appliedMitigations); m.set(resourceId, planId);
    const r = new Set(s.resolvedBottlenecks); r.add(resourceId);
    return { appliedMitigations: m, resolvedBottlenecks: r };
  }),
  batchApplyAllBottlenecks: (resourceIds) => set((s) => {
    const m = new Map(s.appliedMitigations);
    const r = new Set(s.resolvedBottlenecks);
    resourceIds.forEach((id) => { m.set(id, 'A'); r.add(id); });
    return { appliedMitigations: m, resolvedBottlenecks: r };
  }),
}));
