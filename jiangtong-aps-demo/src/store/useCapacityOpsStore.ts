// v2.2.2 · 产能负荷分析 AI 操作状态
//   - appliedMitigations: 已应用的缓解方案（按 bottleneckResourceId）
//   - resolvedBottlenecks: 已解除瓶颈的资源 ID
import { create } from 'zustand';

interface CapacityOpsState {
  /** key = resourceId, value = appliedPlanId */
  appliedMitigations: Map<string, 'A' | 'B' | 'C'>;
  resolvedBottlenecks: Set<string>;
  applyMitigation: (resourceId: string, planId: 'A' | 'B' | 'C') => void;
}

export const useCapacityOpsStore = create<CapacityOpsState>((set) => ({
  appliedMitigations: new Map(),
  resolvedBottlenecks: new Set(),
  applyMitigation: (resourceId, planId) => set((s) => {
    const m = new Map(s.appliedMitigations); m.set(resourceId, planId);
    const r = new Set(s.resolvedBottlenecks); r.add(resourceId);
    return { appliedMitigations: m, resolvedBottlenecks: r };
  }),
}));
