// v2.2.2 · 成本核算 AI 操作状态
//   - acceptedPredictions: 已采纳的成本预测 (workOrderId set)
//   - optimizationAdjustments: 已采纳的优化建议产生的 KPI 调整
import { create } from 'zustand';

interface CostAdjustment {
  /** 损耗率调整 pp */
  lossDelta: number;
  /** 单位成本调整 ¥/吨 */
  unitCostDelta: number;
  /** 描述 */
  note: string;
}

interface CostOpsState {
  acceptedPredictions: Set<string>;
  adjustments: CostAdjustment[];
  /** 累计损耗变化（pp） */
  lossAdjustmentTotal: number;
  acceptPrediction: (id: string) => void;
  acceptOptimization: (adj: CostAdjustment) => void;
}

export const useCostOpsStore = create<CostOpsState>((set, get) => ({
  acceptedPredictions: new Set(),
  adjustments: [],
  lossAdjustmentTotal: 0,
  acceptPrediction: (id) => set((s) => {
    const next = new Set(s.acceptedPredictions); next.add(id);
    return { acceptedPredictions: next };
  }),
  acceptOptimization: (adj) => set((s) => ({
    adjustments: [...s.adjustments, adj],
    lossAdjustmentTotal: s.lossAdjustmentTotal + adj.lossDelta,
  })),
}));
