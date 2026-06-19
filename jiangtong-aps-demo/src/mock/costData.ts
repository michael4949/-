// §10 成本核算页 mock 数据
import type { CostPageData, WorkOrderCostRow } from '../types/cost';
import { COMPLETED_WOS, IN_PROGRESS_WOS } from './workOrders';
import { mulberry32 } from './seed';

const rnd = mulberry32(20260715 + 99);

// ============ 工单成本台账 ============
function genLedger(): WorkOrderCostRow[] {
  const list: WorkOrderCostRow[] = [];

  // §6.2.4 / §8.1 特殊工单：WO-2024-1234（损耗超均值 0.30pp 的演示标的）
  list.push({
    workOrderId: 'WO-2024-1234',
    customer: '华翔电机',
    productName: 'QA-0.5mm 红色',
    unitCost: 31_420,
    lossRate: 0.48,
    baselineLossRate: 0.18,
    quantityKg: 500,
    copperInputKg: 502.4,
    batchId: 'LB-2024-09-A',
  });

  // 其余 50 行：从 in-progress + completed 中抽样
  const pool = [...IN_PROGRESS_WOS, ...COMPLETED_WOS].slice(0, 300);
  for (let i = 0; i < 49; i++) {
    const wo = pool[Math.floor(rnd() * pool.length)];
    const baseline = +(0.16 + rnd() * 0.05).toFixed(2);     // 0.16-0.21
    // 大多正常 0.10-0.25 ；个别偏高
    const isAnomaly = rnd() < 0.08;
    const lossRate = isAnomaly
      ? +(baseline + 0.10 + rnd() * 0.20).toFixed(2)
      : +(baseline + (rnd() - 0.5) * 0.06).toFixed(2);
    list.push({
      workOrderId: wo.id,
      customer: wo.customer,
      productName: wo.productName,
      unitCost: 28_000 + Math.floor(rnd() * 8_000),
      lossRate,
      baselineLossRate: baseline,
      quantityKg: wo.quantity,
    });
  }
  return list;
}

export const COST_DATA: CostPageData = {
  period: { from: '2026-07-01', to: '2026-07-31', label: '本月' },
  kpi: {
    totalCost: 85_400_000,                // ¥85.4M
    avgUnitCost: 31_250,                  // ¥/吨
    copperLossRate: 0.18,
    copperLossRateBaseline: 0.20,
    scrapRecoveryValue: 1_420_000,        // ¥1.42M
    scrapRecoveryRate: 1.66,              // %
  },
  copperFlow: {
    copperInput: 2735,
    stages: [
      { name: '拉丝', inputTons: 2735, outputTons: 2675, loss: 32, scrapRecovery: 28 },
      { name: '漆包', inputTons: 2675, outputTons: 2601, loss: 41, scrapRecovery: 33 },
    ],
    finishedOutput: 2650,
    scrapValue: 1_420_000,
    closureError: {
      theoretical: -85,                   // 32+41=73 损耗 + 12 净损 ≈ 85（按理论计）
      actual: -73,                        // 实际损耗 32+41
      recovery: -61,                      // 28+33
      netLoss: -12,                       // 净
      netLossRate: 0.44,
    },
  },
  workOrderLedger: genLedger(),
};
