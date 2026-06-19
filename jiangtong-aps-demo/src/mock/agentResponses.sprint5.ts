// Sprint 5 · 6 个新 Agent 预设响应
//   #12 inventory.conflict-mediator  抢料冲突调解
//   #13 inventory.health-monitor     锁定健康度监测
//   #14 capacity.bottleneck-predictor 瓶颈预测
//   #15 capacity.mitigation-generator 缓解建议生成
//   #16 gantt.natural-search          甘特图智能搜索
//   #17 gantt.drag-suggestion         拖拽建议

import { INVENTORY_CONFLICTS, type InventoryConflict } from './inventoryConflicts';
import { LOCK_KPI } from './lockRecords';
import { BOTTLENECKS, CAPACITY_KPI } from './capacityData';
import { WORK_ORDERS } from './workOrders';
import { RESOURCES } from './productLines';

/* =========================================================================
 * Agent #12  inventory.conflict-mediator  ——  抢料冲突调解
 * ========================================================================= */
export interface ConflictMediationOutput {
  type: 'conflict-mediation';
  conflictId: string;
  conflict: InventoryConflict;
  allocations: Array<{
    workOrderId: string;
    customer: string;
    allocated: number;
    unit: string;
    rationale: string;
    /** 是否使用替代批次 */
    altBatch?: string;
  }>;
  /** 全局收益 */
  benefit: string;
}

export function buildConflictMediation(input: { conflictId?: string }): ConflictMediationOutput {
  const conflictId = input.conflictId || INVENTORY_CONFLICTS[0].id;
  const conflict = INVENTORY_CONFLICTS.find((c) => c.id === conflictId) || INVENTORY_CONFLICTS[0];

  // 简易分配算法：紧急 > 重要 > 普通，紧急客户全额，剩余按交期分配
  const sorted = [...conflict.competitors].sort((a, b) => {
    const p: Record<string, number> = { urgent: 0, important: 1, normal: 2 };
    if (a.priority !== b.priority) return p[a.priority] - p[b.priority];
    return a.dueDate.localeCompare(b.dueDate);
  });

  let remaining = conflict.available;
  const allocations: ConflictMediationOutput['allocations'] = [];
  for (let i = 0; i < sorted.length; i++) {
    const c = sorted[i];
    const give = Math.min(remaining, c.required);
    if (give > 0) {
      allocations.push({
        workOrderId: c.workOrderId,
        customer: c.customer,
        allocated: +give.toFixed(2),
        unit: conflict.unit,
        rationale: i === 0
          ? `${c.priority === 'urgent' ? '紧急工单' : '高优先级'}，交期 ${c.dueDate}，客户 ${c.customer}，优先分配`
          : `分配余量 ${(give).toFixed(2)}${conflict.unit}（${(give / c.required * 100).toFixed(0)}% 需求）`,
      });
      remaining -= give;
    } else {
      // 缺口工单：建议替代批次
      const altBatchName = conflict.materialKind === 'copper-rod' ? 'LB-2026-07-B'
                        : conflict.materialKind === 'paint' ? '同色异批次 + 调色'
                        : '紧急采购 PO-2026-302';
      allocations.push({
        workOrderId: c.workOrderId,
        customer: c.customer,
        allocated: 0,
        unit: conflict.unit,
        rationale: `本批次已用尽，建议使用替代批次 ${altBatchName}（24h 内到货）`,
        altBatch: altBatchName,
      });
    }
  }
  return {
    type: 'conflict-mediation',
    conflictId: conflict.id,
    conflict,
    allocations,
    benefit: `按本方案分配后，所有紧急工单全额满足；${allocations.filter((a) => a.altBatch).length} 张工单需切换替代批次，整体延期影响 < 8 小时。`,
  };
}

/* =========================================================================
 * Agent #13  inventory.health-monitor  ——  锁定健康度监测
 * ========================================================================= */
export interface HealthMonitorOutput {
  type: 'health-monitor';
  summary: string;
  groups: Array<{
    kind: 'overdue' | 'flapping';
    label: string;
    count: number;
    description: string;
  }>;
  runAt: string;
}

export const HEALTH_MONITOR: HealthMonitorOutput = {
  type: 'health-monitor',
  summary: `检测到 ${LOCK_KPI.overdue + LOCK_KPI.flapping} 笔锁定健康问题`,
  runAt: '2026-07-15 06:00 自动运行',
  groups: [
    {
      kind: 'overdue',
      label: '锁定超 14 天未开工',
      count: LOCK_KPI.overdue,
      description: '该类锁定长期占用库存，建议检查是否需要释放并重新分配',
    },
    {
      kind: 'flapping',
      label: '频繁解锁重锁（30 天内 ≥3 次）',
      count: LOCK_KPI.flapping,
      description: '锁定状态反复变化可能反映计划频繁调整或物料分配冲突',
    },
  ],
};

/* =========================================================================
 * Agent #14  capacity.bottleneck-predictor  ——  瓶颈预测
 * ========================================================================= */
export interface BottleneckPredictorOutput {
  type: 'bottleneck-predictor';
  summary: string;
  bottlenecks: typeof BOTTLENECKS;
  runAt: string;
}

export const BOTTLENECK_PREDICTOR: BottleneckPredictorOutput = {
  type: 'bottleneck-predictor',
  summary: `未来 7 天预测 ${BOTTLENECKS.length} 处瓶颈，影响共 ${BOTTLENECKS.reduce((s, b) => s + b.affectedOrders, 0)} 张工单`,
  bottlenecks: BOTTLENECKS,
  runAt: '2026-07-15 07:00 自动运行',
};

/* =========================================================================
 * Agent #15  capacity.mitigation-generator  ——  缓解建议生成
 * ========================================================================= */
export interface MitigationPlan {
  id: 'A' | 'B' | 'C';
  label: string;
  detail: string;
  /** 关键指标变化 */
  metrics: Array<{ key: string; before: string; after: string; isGood: boolean }>;
  /** 代价 */
  cost: string;
  recommended: boolean;
}
export interface MitigationGeneratorOutput {
  type: 'mitigation-plan';
  resourceName: string;
  bottleneckSummary: string;
  plans: MitigationPlan[];
}

export function buildMitigationPlans(input: { resourceId?: string }): MitigationGeneratorOutput {
  const resId = input.resourceId || 'R-EN-08';
  const bn = BOTTLENECKS.find((b) => b.resourceId === resId) || BOTTLENECKS[0];

  if (bn.resourceId === 'R-EN-08') {
    return {
      type: 'mitigation-plan',
      resourceName: bn.resourceName,
      bottleneckSummary: `${bn.resourceName} 未来 ${bn.durationDays} 天预测连续过载，待排队 ${bn.affectedOrders} 张工单共 ${bn.queuedTons} 吨`,
      plans: [
        {
          id: 'A',
          label: '方案 A：#8 漆包机增加一个夜班',
          detail: '本周二至本周四 22:00-06:00 加排夜班，需调度 4 名操作工 + 1 名班长',
          metrics: [
            { key: '产能', before: '142 吨/周', after: '189 吨/周', isGood: true },
            { key: '排队工单', before: '28 张', after: '8 张', isGood: true },
            { key: '人力成本', before: '¥0', after: '+¥3.6 万', isGood: false },
            { key: '设备折旧', before: '常规', after: '+8%', isGood: false },
          ],
          cost: '人力 +¥3.6 万 / 设备折旧 +8%',
          recommended: true,
        },
        {
          id: 'B',
          label: '方案 B：迁移 12 张同规格工单至 #9 漆包机',
          detail: '将待排队中 12 张 QA-0.5mm 工单迁移到 #9 机（当前空档 30%），统一换型一次',
          metrics: [
            { key: '排队工单', before: '28 张', after: '16 张', isGood: true },
            { key: '换型损失', before: '12.6%', after: '13.8%', isGood: false },
            { key: 'OTD',     before: '91.3%', after: '90.8%', isGood: false },
          ],
          cost: '交期 +6 小时 / 换型 +1.2pp',
          recommended: false,
        },
        {
          id: 'C',
          label: '方案 C：推迟 5 张非紧急工单至下周',
          detail: '识别出 5 张可推迟工单（普通优先级 + 交期宽松），整体后推 3 天',
          metrics: [
            { key: '排队工单', before: '28 张', after: '23 张', isGood: true },
            { key: '产能压力', before: '过载', after: '正常', isGood: true },
            { key: 'OTD',     before: '91.3%', after: '90.1%', isGood: false },
            { key: '客户满意度', before: '中', after: '需沟通',  isGood: false },
          ],
          cost: 'OTD -1.2pp / 需销售确认',
          recommended: false,
        },
      ],
    };
  }
  // 默认（中拉 #12）：
  return {
    type: 'mitigation-plan',
    resourceName: bn.resourceName,
    bottleneckSummary: `${bn.resourceName} 未来 ${bn.durationDays} 天预测过载`,
    plans: [
      {
        id: 'A',
        label: '方案 A：分流至 #14 中拉机',
        detail: '将 6 张可分流工单迁移到 #14 中拉机（当前利用率 65%）',
        metrics: [
          { key: '排队工单', before: '12 张', after: '6 张', isGood: true },
          { key: 'OTD',     before: '91%', after: '90.5%', isGood: false },
        ],
        cost: '换型 +30 分钟',
        recommended: true,
      },
      {
        id: 'B',
        label: '方案 B：错峰运行（夜班 +2h）',
        detail: '夜班延长 2 小时（共 10 小时）',
        metrics: [
          { key: '产能', before: '基准', after: '+12%', isGood: true },
          { key: '人力成本', before: '¥0', after: '+¥1.2 万', isGood: false },
        ],
        cost: '人力 +¥1.2 万',
        recommended: false,
      },
      {
        id: 'C',
        label: '方案 C：推迟 3 张工单',
        detail: '推迟 3 张普通优先级工单',
        metrics: [
          { key: 'OTD', before: '91%', after: '90%', isGood: false },
        ],
        cost: 'OTD -1pp',
        recommended: false,
      },
    ],
  };
}

/* =========================================================================
 * Agent #16  gantt.natural-search  ——  甘特图智能搜索
 * ========================================================================= */
export interface GanttSearchOutput {
  type: 'gantt-search';
  query: string;
  intent: 'delay-risk' | 'urgent' | 'specific-product' | 'specific-customer' | 'specific-batch' | 'fallback';
  summary: string;
  matchedWorkOrderIds: string[];
  /** 简表给 Copilot 展示 */
  matched: Array<{ id: string; product: string; resource: string; window: string; reason: string }>;
}

export function buildGanttSearch(input: { text: string }): GanttSearchOutput {
  const t = input.text.toLowerCase();
  const intent: GanttSearchOutput['intent'] =
    /延期|高优先级.*延|可能.*延期|延期.*风险/.test(t) ? 'delay-risk' :
    /紧急/.test(t) ? 'urgent' :
    /QA|QZ|QY|镀锡|绞线/i.test(input.text) ? 'specific-product' :
    /华翔|海尔|比亚迪|格力|美的|宁德|远东|宝胜|东方|上海/.test(input.text) ? 'specific-customer' :
    /LB-|批次/i.test(input.text) ? 'specific-batch' :
    'fallback';

  // 根据意图选取工单
  let pool = WORK_ORDERS.filter((w) => w.scheduledStart && w.scheduledStart.getTime() > Date.now() - 14 * 86_400_000);
  if (intent === 'delay-risk') {
    // 优先级高 + 未来 3 天交期 + scheduled
    pool = pool.filter((w) => w.priority !== 'normal' && (w.status === 'scheduled' || w.status === 'pending'));
  } else if (intent === 'urgent') {
    pool = pool.filter((w) => w.priority === 'urgent');
  } else if (intent === 'specific-customer') {
    const customers = ['华翔', '海尔', '比亚迪', '格力', '美的', '宁德', '远东', '宝胜', '东方', '上海'];
    const matched = customers.find((c) => input.text.includes(c));
    if (matched) pool = pool.filter((w) => w.customer.includes(matched));
  } else if (intent === 'specific-product') {
    const types = ['QA', 'QZ', 'QY', '镀锡', '绞线'];
    const matched = types.find((tp) => input.text.toUpperCase().includes(tp));
    if (matched) pool = pool.filter((w) => w.productName.toUpperCase().includes(matched));
  }

  // 取前 6 张
  const top6 = pool.slice(0, 6);
  const matched = top6.map((w) => {
    const res = RESOURCES.find((r) => r.id === w.scheduledResourceId);
    const fmt = (d: Date | undefined) => d ? `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : '-';
    const reason =
      intent === 'delay-risk' ? `${w.priority === 'urgent' ? '紧急' : '重要'}工单，交期临近，建议优先关注` :
      intent === 'urgent'     ? '紧急工单' :
      intent === 'specific-customer' ? '匹配客户筛选条件' :
      intent === 'specific-product'  ? '匹配产品规格筛选' :
      '匹配查询条件';
    return {
      id: w.id,
      product: w.productName,
      resource: res?.name ?? w.scheduledResourceId ?? '-',
      window: `${fmt(w.scheduledStart)} ~ ${fmt(w.scheduledEnd)}`,
      reason,
    };
  });

  const summary =
    intent === 'fallback'
      ? `没有完全匹配的工单。试试这些查询："找出未来 3 天可能延期的高优先级工单"、"查找华翔电机的所有工单"、"高亮 LB-2026-07-A 批次"。`
      : `已找到 ${matched.length} 张匹配工单，已在甘特图中高亮（紫色边框）`;

  return {
    type: 'gantt-search',
    query: input.text,
    intent,
    summary,
    matchedWorkOrderIds: top6.map((w) => w.id),
    matched,
  };
}

/* =========================================================================
 * Agent #17  gantt.drag-suggestion  ——  拖拽建议
 * ========================================================================= */
export interface DragSuggestionOutput {
  type: 'drag-suggestion';
  workOrderId: string;
  recommendedResource: { id: string; name: string; reason: string };
}

export function buildDragSuggestion(input: { workOrderId: string }): DragSuggestionOutput {
  const wo = WORK_ORDERS.find((w) => w.id === input.workOrderId);
  if (!wo) {
    return {
      type: 'drag-suggestion',
      workOrderId: input.workOrderId,
      recommendedResource: { id: 'R-EN-08', name: '漆包机 #8', reason: '基于规格匹配' },
    };
  }
  // 根据产品类型选推荐资源
  let recId: string;
  let reason: string;
  if (wo.productCategory === 'enameled') {
    // 拉力线径选 #8（同规格连续）或 #4（同漆种）
    const dia = wo.productName.match(/(\d?\.\d+)\s*mm/);
    const d = dia ? Number(dia[1]) : 0.5;
    recId = d < 0.3 ? 'R-EN-04' : 'R-EN-08';
    reason = d < 0.3
      ? '细线径建议排到 #4 机（同漆种连续生产）'
      : '该工单更适合排到 #8 机（剩余寿命匹配 / 同规格连续生产）';
  } else if (wo.productCategory === 'tinned') {
    recId = 'R-DR-08';
    reason = '镀锡工单建议排到中拉机 #8（同工艺路径）';
  } else if (wo.productCategory === 'stranded') {
    recId = 'R-ST-02';
    reason = '绞线工单建议排到绞线机 #2（当前空档最大）';
  } else {
    recId = 'R-DR-12';
    reason = '建议排到中拉机 #12';
  }
  const res = RESOURCES.find((r) => r.id === recId);
  return {
    type: 'drag-suggestion',
    workOrderId: wo.id,
    recommendedResource: { id: recId, name: res?.name ?? recId, reason },
  };
}

/* =========================================================================
 * 注册表（Sprint 5 增量）
 * ========================================================================= */
export const SPRINT5_AGENT_RESPONSES: Record<string, unknown> = {
  'inventory.conflict-mediator':    (input: { conflictId?: string }) => buildConflictMediation(input),
  'inventory.health-monitor':       HEALTH_MONITOR,
  'capacity.bottleneck-predictor':  BOTTLENECK_PREDICTOR,
  'capacity.mitigation-generator':  (input: { resourceId?: string }) => buildMitigationPlans(input),
  'gantt.natural-search':           (input: { text: string }) => buildGanttSearch(input),
  'gantt.drag-suggestion':          (input: { workOrderId: string }) => buildDragSuggestion(input),
};
