// Sprint 4 · 样品工单（供 #8 BOM 生成器演示）
//   样品工单 = 新规格、新颜色、新工艺，没有现成 BOM
import { WORK_ORDERS, NOW } from './workOrders';
import { CHANGE_LOG } from './workOrderChangeLog';
import type { WorkOrder } from '../types/workOrder';

const SAMPLE_WOS: WorkOrder[] = [
  {
    id: 'WO-SAMPLE-2026-001',
    productCode: 'QXY-0.06-PINK',
    productName: 'QXY-0.06mm 粉色（新色样品）',
    productCategory: 'enameled',
    quantity: 80,
    dueDate: new Date(NOW.getTime() + 10 * 86_400_000),
    customer: '立讯精密',
    priority: 'important',
    status: 'pending',
    routeId: 'P1',
    colorCode: '#EC4899',
  },
  {
    id: 'WO-SAMPLE-2026-002',
    productCode: 'TIN-0.18-PT',
    productName: '0.18mm 白金双镀（样品）',
    productCategory: 'tinned',
    quantity: 50,
    dueDate: new Date(NOW.getTime() + 12 * 86_400_000),
    customer: '安费诺',
    priority: 'important',
    status: 'pending',
    routeId: 'P2',
    colorCode: '#94A3B8',
  },
];

// 注入到 WORK_ORDERS 全局列表头部（确保列表能找到）
for (const w of SAMPLE_WOS) {
  if (!WORK_ORDERS.find((x) => x.id === w.id)) {
    WORK_ORDERS.unshift(w);
  }
}

// 为样品工单补 2 条变更日志（创建 + 工艺评审）
for (const w of SAMPLE_WOS) {
  CHANGE_LOG[w.id] = [
    { at: new Date('2026-07-13T10:30:00'), kind: 'qty-change', operator: '李工', message: `数量从 50kg 调整为 ${w.quantity}kg（工艺评审建议）` },
    { at: new Date('2026-07-12T09:00:00'), kind: 'create',     operator: '张工', message: `样品工单创建（销售订单 SO-2026-${w.id.slice(-3)}，需 ${w.customer} 工艺确认）` },
  ];
}

export const SAMPLE_WORK_ORDER_IDS = SAMPLE_WOS.map((w) => w.id);

export function isSample(workOrderId: string): boolean {
  return workOrderId.startsWith('WO-SAMPLE-');
}
