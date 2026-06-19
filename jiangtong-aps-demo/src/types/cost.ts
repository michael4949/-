// §7.1 成本类型（Sprint 3 用，Sprint 1 仅定义）
export interface WorkOrderCost {
  workOrderId: string;
  materialCost: number;
  laborCost: number;
  manufacturingCost: number;
  scrapRecovery: number;
  totalCost: number;
  unitCost: number;
  copperInput: number;
  finishedOutput: number;
  scrapOutput: number;
  lossRate: number;
  baselineLossRate: number;
}

export interface CostKPI {
  totalCost: number;
  copperLossRate: number;
  scrapRecoveryValue: number;
  avgUnitCost: number;
}
