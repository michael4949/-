// Sprint 4 · 异常工单标记（#9 workorder.anomaly-detector）
//   12 张：8 张"频繁变更超 5 次" + 4 张"长期未开工超 30 天"
import { WORK_ORDERS } from './workOrders';

export type AnomalyKind = 'frequent-change' | 'long-idle';

export interface WorkOrderAnomaly {
  workOrderId: string;
  kind: AnomalyKind;
  detail: string;
  severity: 'high' | 'medium' | 'low';
  detectedAt: Date;
}

// 选取真实工单 ID 进行标记，保证演示一致性
const PICK_FREQUENT = WORK_ORDERS.filter((w) => w.status === 'in-progress' || w.status === 'scheduled').slice(20, 28);
const PICK_IDLE = WORK_ORDERS.filter((w) => w.status === 'pending').slice(0, 4);

export const WORK_ORDER_ANOMALIES: WorkOrderAnomaly[] = [
  ...PICK_FREQUENT.map((w, i): WorkOrderAnomaly => ({
    workOrderId: w.id,
    kind: 'frequent-change',
    detail: `近 30 天发生 ${6 + (i % 3)} 次变更（数量/交期反复调整）`,
    severity: i < 3 ? 'high' : 'medium',
    detectedAt: new Date('2026-07-14T22:00:00'),
  })),
  ...PICK_IDLE.map((w, i): WorkOrderAnomaly => ({
    workOrderId: w.id,
    kind: 'long-idle',
    detail: `创建已 ${32 + i * 4} 天，仍未排产开工`,
    severity: i < 2 ? 'high' : 'low',
    detectedAt: new Date('2026-07-14T22:00:00'),
  })),
];

export function getAnomaly(workOrderId: string): WorkOrderAnomaly | undefined {
  return WORK_ORDER_ANOMALIES.find((a) => a.workOrderId === workOrderId);
}

export const ANOMALY_STATS = {
  total: WORK_ORDER_ANOMALIES.length,
  frequentChange: WORK_ORDER_ANOMALIES.filter((a) => a.kind === 'frequent-change').length,
  longIdle: WORK_ORDER_ANOMALIES.filter((a) => a.kind === 'long-idle').length,
};
