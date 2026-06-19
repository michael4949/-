// Sprint 5 · 库存锁定记录（156 笔）
//   每条：工单 + 物料批次 + 数量 + 锁定时间 + 状态（健康 / 超期 / 频繁解锁）
import { WORK_ORDERS, NOW } from './workOrders';
import { MATERIAL_BATCHES, type MaterialBatch } from './materialBatches';

export type LockHealth = 'healthy' | 'overdue' | 'flapping';

export interface LockRecord {
  id: string;
  workOrderId: string;
  customer: string;
  materialBatchId: string;
  materialKind: MaterialBatch['kind'];
  materialSpec: string;
  quantity: number;
  unit: MaterialBatch['unit'];
  /** 价值（元） */
  value: number;
  lockedAt: Date;
  /** 距今天数 */
  daysSinceLocked: number;
  health: LockHealth;
  /** 频繁解锁次数（flapping 时 >= 3） */
  reLockCount?: number;
}

const NOW_MS = NOW.getTime();

function makeRecord(idx: number, woId: string, customer: string, batch: MaterialBatch, qty: number, daysAgo: number, health: LockHealth, reLockCount?: number): LockRecord {
  const lockedAt = new Date(NOW_MS - daysAgo * 86_400_000);
  const unitPriceMap: Record<MaterialBatch['kind'], number> = {
    'copper-rod': 70_000,  // ¥/t
    paint: 65,             // ¥/kg
    tin: 280_000,          // ¥/t
    lubricant: 12,         // ¥/L
  };
  const unitPrice = unitPriceMap[batch.kind];
  const factor = batch.unit === 't' ? 1 : batch.unit === 'kg' ? 0.001 : 0.001;
  const value = Math.round(qty * unitPrice * factor);
  return {
    id: `LK-${String(idx).padStart(4, '0')}`,
    workOrderId: woId,
    customer,
    materialBatchId: batch.id,
    materialKind: batch.kind,
    materialSpec: batch.spec,
    quantity: qty,
    unit: batch.unit,
    value,
    lockedAt,
    daysSinceLocked: daysAgo,
    health,
    reLockCount,
  };
}

function build(): LockRecord[] {
  const list: LockRecord[] = [];
  let idx = 1;

  // ===== 关键演示数据：5 条 overdue（用于看板和 KPI） =====
  const overdueDemo: Array<[string, MaterialBatch['kind'], string, number, number]> = [
    ['WO-2026-1234', 'copper-rod', 'LB-2026-07-A', 1.2, 16],
    ['WO-2026-1198', 'copper-rod', 'LB-2026-07-A', 0.8, 18],
    ['WO-2026-1242', 'paint',      'QA-BLUE-2607', 0.08, 15],
    ['WO-2026-1248', 'tin',        'TIN-INGOT-26-08', 0.4, 17],
    ['WO-2026-1255', 'copper-rod', 'LB-2026-07-C', 1.5, 20],
  ];
  for (const [woId, kind, batchId, qty, days] of overdueDemo) {
    const wo = WORK_ORDERS.find((w) => w.id === woId);
    const batch = MATERIAL_BATCHES.find((b) => b.id === batchId);
    if (wo && batch) {
      list.push(makeRecord(idx++, woId, wo.customer, batch, qty, days, 'overdue'));
    }
  }

  // ===== 关键演示数据：3 条 flapping（频繁解锁重锁） =====
  const flappingDemo: Array<[string, string, number, number, number]> = [
    ['WO-2026-1260', 'LB-2026-07-B', 0.6, 5, 5],
    ['WO-2026-1265', 'QZ-BLUE-2607', 0.05, 3, 4],
    ['WO-2026-1271', 'QA-RED-2607',  0.03, 4, 3],
  ];
  for (const [woId, batchId, qty, days, reCount] of flappingDemo) {
    const wo = WORK_ORDERS.find((w) => w.id === woId);
    const batch = MATERIAL_BATCHES.find((b) => b.id === batchId);
    if (wo && batch) {
      list.push(makeRecord(idx++, woId, wo.customer, batch, qty, days, 'flapping', reCount));
    }
  }

  // ===== 健康记录：补足 ~150 条 =====
  // 抓在制/已排工单 + 随机分配铜杆/漆液/锡液批次
  const scheduledOrInProgress = WORK_ORDERS.filter((w) => w.status === 'scheduled' || w.status === 'in-progress').slice(0, 160);
  const copperBatches = MATERIAL_BATCHES.filter((b) => b.kind === 'copper-rod');
  const paintBatches = MATERIAL_BATCHES.filter((b) => b.kind === 'paint');
  const tinBatches = MATERIAL_BATCHES.filter((b) => b.kind === 'tin');

  for (const wo of scheduledOrInProgress) {
    if (list.length >= 156) break;
    // 主料：根据 routeId 选铜杆 + 配料
    const main = copperBatches[(idx + 1) % copperBatches.length];
    const days = Math.floor((NOW_MS - (wo.scheduledStart?.getTime() ?? NOW_MS)) / 86_400_000);
    const daysAbs = Math.max(0, Math.min(13, days));
    const woQty = wo.quantity;
    // 铜杆：约工单数量的 1.05 倍
    list.push(makeRecord(idx++, wo.id, wo.customer, main, +(woQty / 1000 * 1.05).toFixed(2), daysAbs, 'healthy'));

    // 第二种料（视产品类别）
    if (list.length < 156) {
      if (wo.productCategory === 'enameled') {
        const p = paintBatches[(idx + 2) % paintBatches.length];
        list.push(makeRecord(idx++, wo.id, wo.customer, p, +(woQty * 0.05).toFixed(0), daysAbs, 'healthy'));
      } else if (wo.productCategory === 'tinned') {
        const t = tinBatches[0];
        list.push(makeRecord(idx++, wo.id, wo.customer, t, +(woQty * 0.02 / 1000).toFixed(2), daysAbs, 'healthy'));
      }
    }
  }

  return list.slice(0, 156);
}

export const LOCK_RECORDS: LockRecord[] = build();

export const LOCK_HEALTH_LABEL: Record<LockHealth, string> = {
  healthy: '健康',
  overdue: '超期',
  flapping: '频繁解锁',
};

export const LOCK_KPI = {
  total: LOCK_RECORDS.length,
  totalValue: LOCK_RECORDS.reduce((s, r) => s + r.value, 0),
  overdue: LOCK_RECORDS.filter((r) => r.health === 'overdue').length,
  flapping: LOCK_RECORDS.filter((r) => r.health === 'flapping').length,
};
