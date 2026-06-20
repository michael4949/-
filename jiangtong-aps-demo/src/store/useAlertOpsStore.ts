// v2.2.2 · 异常预警 AI 操作状态
//   - downgradedTypes: 已应用 #20 噪声过滤的预警类型 + 等级（key = "type:level"）
//   - dismissedIds: 已被 AI 过滤掉的预警 ID
//   - explainedIds: 已查看 AI 归因报告的预警 ID
import { create } from 'zustand';
import type { AlertType, AlertLevel } from '../mock/alerts';

interface AlertOpsState {
  downgradedKeys: Set<string>; // e.g. "设备:info"
  dismissedIds: Set<string>;
  explainedIds: Set<string>;
  applyNoiseFilter: (type: AlertType, level: AlertLevel) => void;
  dismissAlert: (id: string) => void;
  markExplained: (id: string) => void;
}

export const useAlertOpsStore = create<AlertOpsState>((set) => ({
  downgradedKeys: new Set(),
  dismissedIds: new Set(),
  explainedIds: new Set(),
  applyNoiseFilter: (type, level) => set((s) => {
    const next = new Set(s.downgradedKeys);
    next.add(`${type}:${level}`);
    return { downgradedKeys: next };
  }),
  dismissAlert: (id) => set((s) => {
    const next = new Set(s.dismissedIds); next.add(id);
    return { dismissedIds: next };
  }),
  markExplained: (id) => set((s) => {
    const next = new Set(s.explainedIds); next.add(id);
    return { explainedIds: next };
  }),
}));
