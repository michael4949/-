// Sprint 4 · 工单变更日志（详情抽屉用）
//   对 30-50 张代表性工单生成 3-8 条变更
import { WORK_ORDERS } from './workOrders';
import { WORK_ORDER_ANOMALIES } from './workOrderAnomalies';

export type ChangeKind = 'create' | 'qty-change' | 'due-change' | 'priority-change' | 'split' | 'merge' | 'cancel' | 'reschedule';

export interface ChangeLogEntry {
  at: Date;
  kind: ChangeKind;
  operator: string;
  message: string;
}

const OPS = ['张工', '李工', '王工', '赵工', '钱工'];
const BASE = new Date('2026-07-15T00:00:00').getTime();

function genFor(wo: { id: string }, count: number): ChangeLogEntry[] {
  const log: ChangeLogEntry[] = [];
  // 倒序生成（最新在前）
  for (let i = 0; i < count; i++) {
    const at = new Date(BASE - i * (1.5 + (i % 3) * 0.5) * 86_400_000);
    const op = OPS[(wo.id.charCodeAt(wo.id.length - 1) + i) % OPS.length];
    const cycle: ChangeKind[] = ['qty-change', 'due-change', 'priority-change', 'reschedule', 'qty-change'];
    const kind: ChangeKind = i === count - 1 ? 'create' : cycle[i % cycle.length];
    log.push({
      at,
      kind,
      operator: op,
      message: messageOf(kind, i),
    });
  }
  return log;
}

function messageOf(kind: ChangeKind, idx: number): string {
  switch (kind) {
    case 'create':
      return '工单创建（来自销售订单 SO-2026-' + (1200 + idx) + '）';
    case 'qty-change':
      return `数量从 ${500 - idx * 20}kg 调整为 ${550 + idx * 15}kg`;
    case 'due-change':
      return `交期推迟 ${1 + idx} 天（客户要求）`;
    case 'priority-change':
      return idx % 2 === 0 ? '优先级 普通 → 紧急（销售部）' : '优先级 重要 → 普通';
    case 'reschedule':
      return '重新排产（算法重算）';
    case 'split':
      return `拆分为 2 张子工单`;
    case 'merge':
      return '合并自 WO-2026-' + (1100 + idx);
    case 'cancel':
      return '工单取消';
  }
}

// 对前 50 张代表工单 + 全部异常工单生成日志
const TARGET_IDS = new Set<string>([
  ...WORK_ORDERS.slice(0, 50).map((w) => w.id),
  ...WORK_ORDER_ANOMALIES.map((a) => a.workOrderId),
]);

export const CHANGE_LOG: Record<string, ChangeLogEntry[]> = {};
for (const id of TARGET_IDS) {
  const ano = WORK_ORDER_ANOMALIES.find((a) => a.workOrderId === id);
  const count = ano?.kind === 'frequent-change' ? 6 + (id.charCodeAt(id.length - 1) % 3) : 2 + (id.charCodeAt(id.length - 1) % 3);
  CHANGE_LOG[id] = genFor({ id }, count);
}

export function getChangeLog(workOrderId: string): ChangeLogEntry[] {
  return CHANGE_LOG[workOrderId] ?? [
    { at: new Date(BASE - 86_400_000), kind: 'create', operator: '张工', message: '工单创建' },
  ];
}

export const CHANGE_KIND_LABEL: Record<ChangeKind, string> = {
  create: '创建',
  'qty-change': '数量变更',
  'due-change': '交期变更',
  'priority-change': '优先级变更',
  split: '拆分',
  merge: '合并',
  cancel: '取消',
  reschedule: '重排',
};
