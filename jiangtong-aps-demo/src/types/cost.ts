// §7.1 + §10 成本类型
export interface CostKPI {
  totalCost: number;                  // 元
  avgUnitCost: number;                // 元/吨
  copperLossRate: number;             // %
  copperLossRateBaseline: number;     // % 基线
  scrapRecoveryValue: number;         // 元
  scrapRecoveryRate: number;          // % 相当于成本回补
}

export interface CopperFlowStage {
  name: string;                       // 拉丝 / 漆包
  inputTons: number;
  outputTons: number;
  loss: number;                       // 损耗（吨）
  scrapRecovery: number;              // 边角料回收（吨）
}

export interface CopperFlowData {
  copperInput: number;                // 2735t
  stages: CopperFlowStage[];          // [拉丝, 漆包]
  finishedOutput: number;             // 2650t
  scrapValue: number;                 // ¥1.42M
  closureError: {
    theoretical: number;              // -85
    actual: number;                   // -73
    recovery: number;                 // -61
    netLoss: number;                  // -12
    netLossRate: number;              // 0.44 (%)
  };
}

export interface WorkOrderCostRow {
  workOrderId: string;
  customer: string;
  productName: string;
  unitCost: number;                   // 元/吨
  lossRate: number;                   // %
  baselineLossRate: number;           // 30天均值
  copperInputKg?: number;
  quantityKg: number;
  // §6.2.4 演示重点工单关联批次
  batchId?: string;
}

export interface CostPageData {
  period: { from: string; to: string; label: string };
  kpi: CostKPI;
  copperFlow: CopperFlowData;
  workOrderLedger: WorkOrderCostRow[];
}

// Agent #4 损耗诊断 输出
export interface LossDiagnosticOutput {
  type: 'loss-diagnostic';
  workOrder: string;
  customer: string;
  productName: string;
  actualLoss: number;
  baseline: number;
  deviation: number;                  // pp
  rootCauses: Array<{
    factor: '原料批次' | '设备状态' | '操作班组';
    detail: string;
    severity: 'high' | 'medium' | 'low';
    related?: { kind: 'batch' | 'machine' | 'team'; value: string };
  }>;
  recommendation: string[];
}
