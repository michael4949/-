// §7.2 工单数据规模
//   总 3000 张：未来 7 天已排 280 + 待排 142 + 在制 286 + 完工 ~2292
//   ★ 修复（v2.2.1）：按 45/38/17 权重均衡分布 enameling/drawing/stranding，让 3 个车间都有数据
import { mulberry32, pickOne, pickWeighted, intRange } from './seed';
import { CUSTOMERS } from './customers';
import { PRODUCTS, type Product } from './products';
import { RESOURCES } from './productLines';
import type { WorkOrder, WorkOrderStatus, Priority } from '../types/workOrder';
import type { Resource, Workshop } from '../types/schedule';

// 基准时间：2026-07-15 09:24（CLAUDE.md §8.1）
export const NOW = new Date('2026-07-15T09:24:00');

const PRIORITIES: { v: Priority; w: number }[] = [
  { v: 'urgent', w: 0.06 }, { v: 'important', w: 0.18 }, { v: 'normal', w: 0.76 },
];

// ★ 车间权重：按 RESOURCES 数量比例近似（18:24:8 → 45:38:17）
const WORKSHOP_WEIGHTS: { v: Workshop; w: number }[] = [
  { v: 'enameling', w: 0.45 },
  { v: 'drawing',   w: 0.38 },
  { v: 'stranding', w: 0.17 },
];

const ROUTE_BY_WORKSHOP: Record<Workshop, Array<WorkOrder['routeId']>> = {
  enameling: ['P1'],
  drawing:   ['P2', 'P4', 'P5'],
  stranding: ['P3'],
};

/** ★ 按车间挑产品：先选车间，再在该车间的合规产品池里挑 */
function pickProductByWorkshop(ws: Workshop, rnd: () => number): Product {
  const routes = ROUTE_BY_WORKSHOP[ws];
  const pool = PRODUCTS.filter((p) => routes.includes(p.routeId));
  return pickOne(pool, rnd) ?? PRODUCTS[0];
}

function resourcesOf(ws: Workshop): Resource[] {
  return RESOURCES.filter((r) => r.workshop === ws);
}

function compatibleResource(p: Product, resources: Resource[]): Resource {
  // 简单工艺路径 → 车间映射
  let pool: Resource[];
  if (p.routeId === 'P1') pool = resources.filter((r) => r.workshop === 'enameling');
  else if (p.routeId === 'P3') pool = resources.filter((r) => r.workshop === 'stranding');
  else pool = resources.filter((r) => r.workshop === 'drawing');
  return pool[Math.floor(Math.random() * pool.length)] ?? resources[0];
}

function fmtId(n: number) {
  return `WO-2026-${String(n).padStart(4, '0')}`;
}

function genWorkOrders(): WorkOrder[] {
  const rnd = mulberry32(20260715);
  const list: WorkOrder[] = [];
  let nextId = 1000;

  // ====== 1) 未来 7 天已排产 280 张（按车间权重均衡分布）======
  const scheduledCount = 280;
  const occupancy: Map<string, Array<{ start: number; end: number }>> = new Map();
  RESOURCES.forEach((r) => occupancy.set(r.id, []));

  for (let i = 0; i < scheduledCount; i++) {
    // ★ 先按车间权重选车间，再选产品
    const ws = pickWeighted(WORKSHOP_WEIGHTS, rnd);
    const p = pickProductByWorkshop(ws, rnd);
    const pool = resourcesOf(ws);
    const compat = pool[(i + Math.floor(rnd() * pool.length)) % pool.length];
    const slots = occupancy.get(compat.id)!;
    const durHours = 2 + Math.floor(rnd() * 6); // 2-7 小时
    const dayStart = new Date(NOW); dayStart.setHours(8, 0, 0, 0);
    let startMin = Math.floor(rnd() * (7 * 24 * 60 - durHours * 60));
    let attempts = 0;
    while (attempts < 50) {
      const endMin = startMin + durHours * 60;
      const conflict = slots.some((s) => !(endMin <= s.start || startMin >= s.end));
      if (!conflict) break;
      startMin = Math.floor(rnd() * (7 * 24 * 60 - durHours * 60));
      attempts++;
    }
    const endMin = startMin + durHours * 60;
    slots.push({ start: startMin, end: endMin });

    const start = new Date(dayStart.getTime() + startMin * 60_000);
    const end = new Date(dayStart.getTime() + endMin * 60_000);
    const status: WorkOrderStatus = start < NOW ? 'in-progress' : 'scheduled';

    const cust = pickOne(CUSTOMERS, rnd);
    const prio = pickWeighted(PRIORITIES, rnd);
    list.push({
      id: fmtId(nextId++),
      productCode: p.code,
      productName: p.name,
      productCategory: p.category,
      quantity: p.unitWeightKg + intRange(-100, 200, rnd),
      dueDate: new Date(end.getTime() + (1 + intRange(0, 4, rnd)) * 86_400_000),
      customer: cust.name,
      priority: prio,
      status,
      routeId: p.routeId,
      scheduledStart: start,
      scheduledEnd: end,
      scheduledResourceId: compat.id,
      colorCode: p.colorCode,
    });
  }

  // ====== 2) 待排池 142 张（同样按车间权重均衡）======
  for (let i = 0; i < 142; i++) {
    const ws = pickWeighted(WORKSHOP_WEIGHTS, rnd);
    const p = pickProductByWorkshop(ws, rnd);
    const cust = pickOne(CUSTOMERS, rnd);
    const dueDate = new Date(NOW.getTime() + (3 + Math.floor(rnd() * 10)) * 86_400_000);
    list.push({
      id: fmtId(nextId++),
      productCode: p.code,
      productName: p.name,
      productCategory: p.category,
      quantity: p.unitWeightKg + intRange(-150, 250, rnd),
      dueDate,
      customer: cust.name,
      priority: pickWeighted(PRIORITIES, rnd),
      status: 'pending',
      routeId: p.routeId,
      colorCode: p.colorCode,
    });
  }

  // ====== 3) 在制工单补 190 张（按车间权重均衡）======
  for (let i = 0; i < 190; i++) {
    const ws = pickWeighted(WORKSHOP_WEIGHTS, rnd);
    const p = pickProductByWorkshop(ws, rnd);
    const pool = resourcesOf(ws);
    const compat = pickOne(pool, rnd);
    const start = new Date(NOW.getTime() - (1 + Math.floor(rnd() * 36)) * 3_600_000);
    const end = new Date(start.getTime() + (2 + Math.floor(rnd() * 8)) * 3_600_000);
    const cust = pickOne(CUSTOMERS, rnd);
    list.push({
      id: fmtId(nextId++),
      productCode: p.code,
      productName: p.name,
      productCategory: p.category,
      quantity: p.unitWeightKg + intRange(-100, 200, rnd),
      dueDate: new Date(end.getTime() + (1 + intRange(0, 4, rnd)) * 86_400_000),
      customer: cust.name,
      priority: pickWeighted(PRIORITIES, rnd),
      status: 'in-progress',
      routeId: p.routeId,
      scheduledStart: start,
      scheduledEnd: end,
      scheduledResourceId: compat.id,
      colorCode: p.colorCode,
    });
  }

  // ====== 4) 已完工 ~2388 张（凑足 3000）======
  const remain = 3000 - list.length;
  for (let i = 0; i < remain; i++) {
    const ws = pickWeighted(WORKSHOP_WEIGHTS, rnd);
    const p = pickProductByWorkshop(ws, rnd);
    const compat = compatibleResource(p, RESOURCES);
    const daysAgo = 1 + Math.floor(rnd() * 60);
    const start = new Date(NOW.getTime() - daysAgo * 86_400_000);
    const end = new Date(start.getTime() + (2 + Math.floor(rnd() * 8)) * 3_600_000);
    const cust = pickOne(CUSTOMERS, rnd);
    list.push({
      id: fmtId(nextId++),
      productCode: p.code,
      productName: p.name,
      productCategory: p.category,
      quantity: p.unitWeightKg + intRange(-100, 200, rnd),
      dueDate: new Date(end.getTime() + (1 + intRange(0, 4, rnd)) * 86_400_000),
      customer: cust.name,
      priority: pickWeighted(PRIORITIES, rnd),
      status: 'completed',
      routeId: p.routeId,
      scheduledStart: start,
      scheduledEnd: end,
      scheduledResourceId: compat.id,
      colorCode: p.colorCode,
    });
  }

  return list;
}

export const WORK_ORDERS: WorkOrder[] = genWorkOrders();

// ====== v2.1 演示标的：铜绞线配股 ======
// 东方电气 · 500kg 19 股 0.5mm 镀锡铜绞线 · 交期 +7 天
const STRANDING_DEMO_WO: WorkOrder = {
  id: 'WO-2026-STR01',
  productCode: 'STR-0.5x19-TIN',
  productName: '19 股 ×Φ0.5mm 镀锡铜绞线',
  productCategory: 'stranded',
  quantity: 500,
  dueDate: new Date(NOW.getTime() + 7 * 86_400_000),
  customer: '东方电气',
  priority: 'important',
  status: 'pending',
  routeId: 'P3',                   // 项目内 stranded=P3（与文档 §6.2.6 "P4" 等义，见 v2.1 注脚 D2）
  colorCode: '#A16207',
};
WORK_ORDERS.unshift(STRANDING_DEMO_WO);

// 便捷选择器
export const PENDING_WOS = WORK_ORDERS.filter((w) => w.status === 'pending');
export const SCHEDULED_WOS = WORK_ORDERS.filter((w) => w.status === 'scheduled' || w.status === 'in-progress');
export const IN_PROGRESS_WOS = WORK_ORDERS.filter((w) => w.status === 'in-progress');
export const COMPLETED_WOS = WORK_ORDERS.filter((w) => w.status === 'completed');

// 给特定客户的工单数（首页 KPI 用得到）
export function todayDeliveries(): { done: number; planned: number } {
  const start = new Date(NOW); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setDate(end.getDate() + 1);
  const planned = WORK_ORDERS.filter((w) => w.dueDate >= start && w.dueDate < end).length;
  const done = Math.round(planned * 0.84);
  return { done, planned };
}
