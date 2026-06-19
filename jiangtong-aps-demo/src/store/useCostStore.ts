// 成本页跨页通信（工作台 Insight Card 点击 → 自动触发诊断）
import { create } from 'zustand';

interface CostState {
  pendingDiagnoseWoId: string | null;
  setPendingDiagnoseWoId: (id: string | null) => void;
}

export const useCostStore = create<CostState>((set) => ({
  pendingDiagnoseWoId: null,
  setPendingDiagnoseWoId: (id) => set({ pendingDiagnoseWoId: id }),
}));
