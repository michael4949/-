// Sprint 5 · 库存锁定冲突看板（5 条抢料冲突）
//   每条：多工单争同一批次 + 各自需求量 + 总缺口
export interface InventoryConflict {
  id: string;
  materialBatchId: string;
  materialKind: 'copper-rod' | 'paint' | 'tin' | 'lubricant';
  materialSpec: string;
  available: number;
  unit: 't' | 'kg' | 'L';
  competitors: Array<{
    workOrderId: string;
    customer: string;
    priority: 'urgent' | 'important' | 'normal';
    required: number;
    dueDate: string;
  }>;
  /** 总需求 - 可用 */
  gap: number;
  severity: 'high' | 'medium' | 'low';
}

export const INVENTORY_CONFLICTS: InventoryConflict[] = [
  {
    id: 'CFL-001',
    materialBatchId: 'LB-2026-07-A',
    materialKind: 'copper-rod',
    materialSpec: 'Φ8.0mm 铜杆',
    available: 2.3,
    unit: 't',
    competitors: [
      { workOrderId: 'WO-2026-1234', customer: '华翔电机', priority: 'urgent',    required: 1.2, dueDate: '2026-07-18' },
      { workOrderId: 'WO-2026-1240', customer: '华翔电机', priority: 'important', required: 0.5, dueDate: '2026-07-19' },
      { workOrderId: 'WO-2026-1259', customer: '远东电缆', priority: 'normal',    required: 1.2, dueDate: '2026-07-21' },
    ],
    gap: 0.6,
    severity: 'high',
  },
  {
    id: 'CFL-002',
    materialBatchId: 'QA-BLUE-2607',
    materialKind: 'paint',
    materialSpec: 'QA 漆液 · 蓝色',
    available: 0,
    unit: 'kg',
    competitors: [
      { workOrderId: 'WO-2026-1242', customer: '海尔智家', priority: 'urgent',    required: 80,  dueDate: '2026-07-20' },
      { workOrderId: 'WO-2026-1247', customer: '海尔智家', priority: 'important', required: 60,  dueDate: '2026-07-22' },
    ],
    gap: 140,
    severity: 'high',
  },
  {
    id: 'CFL-003',
    materialBatchId: 'TIN-INGOT-26-08',
    materialKind: 'tin',
    materialSpec: '锡锭 99.9%',
    available: 0.4,
    unit: 't',
    competitors: [
      { workOrderId: 'WO-2026-1248', customer: '比亚迪',     priority: 'urgent',    required: 0.3, dueDate: '2026-07-18' },
      { workOrderId: 'WO-2026-1252', customer: '宁德时代',   priority: 'important', required: 0.25, dueDate: '2026-07-20' },
    ],
    gap: 0.15,
    severity: 'medium',
  },
  {
    id: 'CFL-004',
    materialBatchId: 'LB-2026-07-C',
    materialKind: 'copper-rod',
    materialSpec: 'Φ12.5mm 铜杆',
    available: 5.6,
    unit: 't',
    competitors: [
      { workOrderId: 'WO-2026-1278', customer: '上海电气', priority: 'important', required: 0.8, dueDate: '2026-07-19' },
      { workOrderId: 'WO-2026-1283', customer: '正泰电器', priority: 'normal',    required: 0.7, dueDate: '2026-07-21' },
    ],
    gap: 0,
    severity: 'low',
  },
  {
    id: 'CFL-005',
    materialBatchId: 'QXY-PNK-001',
    materialKind: 'paint',
    materialSpec: 'QXY 聚酰胺 · 粉色',
    available: 80,
    unit: 'kg',
    competitors: [
      { workOrderId: 'WO-SAMPLE-2026-001', customer: '立讯精密', priority: 'important', required: 24, dueDate: '2026-07-25' },
      { workOrderId: 'WO-2026-1318',       customer: '立讯精密', priority: 'normal',    required: 36, dueDate: '2026-07-26' },
    ],
    gap: 0,
    severity: 'low',
  },
];
