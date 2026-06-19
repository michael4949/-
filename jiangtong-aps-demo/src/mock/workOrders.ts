// §7.2 工单数据规模
//   总 3000 张：未来 7 天已排 200-400 + 待排 142 + 在制 286 + 其余完工(过去 30 天 + 未来计划)
import { mulberry32, pickOne, pickWeighted, intRange } from './seed';
import { CUSTOMERS } from './customers';
import { PRODUCTS, type Product } from './products';
import { RESOURCES } from './productLines';
import type { WorkOrder, WorkOrderStatus, Priority } from '../types/workOrder';
import type { Resource } from '../types/schedule';

// 基准时间：2026-07-15 09:24（CLAUDE.md §8.1）
export const NOW = new Date('2026-07-15T09:24:00');

const PRIORITIES: { v: Priority; w: number }[] = [
  { v: 'urgent', w: 0.06 }, { v: 'important', w: 0.18 }, { v: 'normal', w: 0.76 },
];

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

  // ====== 1) 未来 7 天已排产 280 张（200-400 之间，按工艺/产线分布）======
  const scheduledCount = 280;
  // 给每个产线在未来 7 天先填充时段
  const occupancy: Map<string, Array<{ start: number; end: number }>> = new Map();
  RESOURCES.forEach((r) => occupancy.set(r.id, []));

  for (let i = 0; i < scheduledCount; i++) {
    const p = pickOne(PRODUCTS, rnd);
    const compat = (() => {
      const pool = p.routeId === 'P1' ? RESOURCES.filter((r) => r.workshop === 'enameling')
                  : p.routeId === 'P3' ? RESOURCES.filter((r) => r.workshop === 'stranding')
                  : RESOURCES.filter((r) => r.workshop === 'drawing');
      // 随机轮转
      return pool[(i + Math.floor(rnd() * pool.length)) % pool.length];
    })();
    // 在该机台找一个空段
    const slots = occupancy.get(compat.id)!;
    const durHours = 2 + Math.floor(rnd() * 6); // 2-7 小时
    // 最早从今天 08:00 开始（基线 = NOW 当日 08:00）
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

    // 部分在制（开始时间 < NOW）
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

  // ====== 2) 待排池 142 张（pending）======
  for (let i = 0; i < 142; i++) {
    const p = pickOne(PRODUCTS, rnd);
    const cust = pickOne(CUSTOMERS, rnd);
    // 交期：未来 3-12 天
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

  // ====== 3) 在制工单的剩余（in-progress 总 286 张，已生成约 100；再补 ~190 张过去几天开工的）======
  // 简化：从已生成的 scheduled 中再补一些"刚开工"，最终 in-progress 数 ≈ 286
  // 这里我们再生成 190 张过去 1-2 天开工、未来几小时完工的
  for (let i = 0; i < 190; i++) {
    const p = pickOne(PRODUCTS, rnd);
    const compat = (() => {
      const pool = p.routeId === 'P1' ? RESOURCES.filter((r) => r.workshop === 'enameling')
                  : p.routeId === 'P3' ? RESOURCES.filter((r) => r.workshop === 'stranding')
                  : RESOURCES.filter((r) => r.workshop === 'drawing');
      return pickOne(pool, rnd);
    })();
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
    const p = pickOne(PRODUCTS, rnd);
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
