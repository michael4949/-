// Sprint 4 · 缺料工单清单（10-15 张）
//   每条：工单 ID（来自 WORK_ORDERS） + 缺料项 + 当前缺口数量 + 预计齐套日期
import { PENDING_WOS } from './workOrders';

export interface ShortageItem {
  workOrderId: string;
  customer: string;
  productName: string;
  missingMaterials: Array<{ batchId?: string; spec: string; gap: number; unit: 'kg' | 't' | 'L' }>;
  /** 预计齐套日期 */
  estimatedReadyDate: string;
  /** 严重度（影响排产难度） */
  severity: 'high' | 'medium' | 'low';
  /** 上游因素：相关采购订单 / 工单 */
  upstreamCause?: string;
}

const NAMED: ShortageItem[] = [
  {
    workOrderId: 'WO-2026-1240',
    customer: '华翔电机',
    productName: 'QA-0.5mm 红色',
    missingMaterials: [{ batchId: 'LB-2026-07-A', spec: 'Φ8.0mm 铜杆', gap: 0.5, unit: 't' }],
    estimatedReadyDate: '2026-07-19',
    severity: 'high',
    upstreamCause: '采购订单 PO-2026-201 延期 3 天（供应商质检不合格）',
  },
  {
    workOrderId: 'WO-2026-1242',
    customer: '海尔智家',
    productName: 'QA-0.3mm 蓝色',
    missingMaterials: [{ batchId: 'QA-BLUE-2607', spec: 'QA 漆液 · 蓝色', gap: 80, unit: 'kg' }],
    estimatedReadyDate: '2026-07-20',
    severity: 'high',
    upstreamCause: '上游 WO-2026-1238 工单延期 12 小时',
  },
  {
    workOrderId: 'WO-2026-1248',
    customer: '比亚迪',
    productName: 'TIN-0.40mm 标准镀锡',
    missingMaterials: [{ batchId: 'TIN-INGOT-26-08', spec: '锡锭 99.9%', gap: 0.2, unit: 't' }],
    estimatedReadyDate: '2026-07-18',
    severity: 'high',
    upstreamCause: '锡锭安全库存设置过低（当前 0.5 天，建议 1.5 天）',
  },
  {
    workOrderId: 'WO-2026-1251',
    customer: '格力电器',
    productName: 'QY-0.21mm 黑色',
    missingMaterials: [{ spec: 'Φ8.0mm 铜杆（指定批次）', gap: 0.3, unit: 't' }],
    estimatedReadyDate: '2026-07-19',
    severity: 'medium',
  },
  {
    workOrderId: 'WO-2026-1259',
    customer: '远东电缆',
    productName: 'QA-0.95mm 红色',
    missingMaterials: [{ batchId: 'LB-2026-07-A', spec: 'Φ8.0mm 铜杆', gap: 1.2, unit: 't' }],
    estimatedReadyDate: '2026-07-21',
    severity: 'medium',
    upstreamCause: '与 WO-2026-1240 共享同一批次',
  },
  {
    workOrderId: 'WO-2026-1265',
    customer: '宝胜股份',
    productName: 'QZ-0.51mm 蓝色',
    missingMaterials: [{ spec: 'QZ 漆液 · 蓝色', gap: 50, unit: 'kg' }],
    estimatedReadyDate: '2026-07-18',
    severity: 'low',
  },
  {
    workOrderId: 'WO-2026-1271',
    customer: '正泰电器',
    productName: 'QA-0.18mm 透明',
    missingMaterials: [{ spec: 'QA 漆液 · 透明', gap: 30, unit: 'kg' }],
    estimatedReadyDate: '2026-07-17',
    severity: 'low',
  },
  {
    workOrderId: 'WO-2026-1278',
    customer: '上海电气',
    productName: 'QA-0.71mm 黄色',
    missingMaterials: [{ batchId: 'LB-2026-08-A', spec: 'Φ8.0mm 铜杆（在途）', gap: 0.8, unit: 't' }],
    estimatedReadyDate: '2026-07-19',
    severity: 'medium',
  },
];

// 用待排池工单补足到 12 张
const EXTRA: ShortageItem[] = PENDING_WOS.slice(20, 24).map((wo, i): ShortageItem => ({
  workOrderId: wo.id,
  customer: wo.customer,
  productName: wo.productName,
  missingMaterials: [
    { spec: i % 2 === 0 ? 'Φ8.0mm 铜杆' : 'QA 漆液 · 红色', gap: 0.4 + i * 0.1, unit: i % 2 === 0 ? 't' : 'kg' },
  ],
  estimatedReadyDate: `2026-07-${20 + i}`,
  severity: 'low',
}));

export const SHORTAGE_LIST: ShortageItem[] = [...NAMED, ...EXTRA];

export function getShortage(workOrderId: string): ShortageItem | undefined {
  return SHORTAGE_LIST.find((s) => s.workOrderId === workOrderId);
}

export const SHORTAGE_KPI = {
  total: SHORTAGE_LIST.length,
  high: SHORTAGE_LIST.filter((s) => s.severity === 'high').length,
  medium: SHORTAGE_LIST.filter((s) => s.severity === 'medium').length,
  low: SHORTAGE_LIST.filter((s) => s.severity === 'low').length,
  /** 齐套率（模拟值） */
  kittingRate: 87.3,
};

// 未来 7 天齐套时间轴：每日齐套程度 0-100
export const KITTING_TIMELINE: Array<{ date: string; level: 'green' | 'amber' | 'red'; percent: number; risk: number }> = [
  { date: '7/15', level: 'green', percent: 92, risk: 1 },
  { date: '7/16', level: 'green', percent: 90, risk: 2 },
  { date: '7/17', level: 'amber', percent: 78, risk: 4 },
  { date: '7/18', level: 'amber', percent: 75, risk: 5 },
  { date: '7/19', level: 'red',   percent: 62, risk: 8 },
  { date: '7/20', level: 'red',   percent: 58, risk: 8 },
  { date: '7/21', level: 'red',   percent: 60, risk: 6 },
];
