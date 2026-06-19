// §6 五个 Agent 的预设响应（Sprint 2 仅 3 个排产 Agent；Sprint 3 注入剩余 2 个）
import type { WorkOrder } from '../types/workOrder';

/* ============ Agent #1: schedule.insert-assistant ============ */
export interface InsertScheme {
  id: 'A' | 'B' | 'C';
  label: string;
  resourceIds: string[];          // 应用方案时要操作的机台
  start: Date;                    // 急单计划开工
  durationMs: number;             // 急单时长
  impact: {
    affectedOrders: number;       // 受影响工单数（动画用）
    affectedOrderIds: string[];   // 高亮闪烁的工单 IDs
    otdDelta: string;             // 例 "-0.5pp"
    changeoverDelta: string;      // 例 "+15min"
  };
  recommended: boolean;
  reason?: string;
}
export interface InsertEvalOutput {
  type: 'insert-evaluation';
  request: { customer: string; product: string; quantity: number; dueDate: string; rawText: string };
  schemes: InsertScheme[];
}

/** 简易"NLU"：从自然语言中解析客户/产品/数量/交期 */
export function parseInsertText(text: string) {
  const customer =
    /华翔/.test(text) ? '华翔电机'
    : /海尔/.test(text) ? '海尔智家'
    : /格力/.test(text) ? '格力电器'
    : /美的/.test(text) ? '美的集团'
    : /比亚迪/.test(text) ? '比亚迪'
    : /宁德/.test(text) ? '宁德时代'
    : /卧龙/.test(text) ? '卧龙电气'
    : /立讯/.test(text) ? '立讯精密'
    : '华翔电机';
  const qtyM = text.match(/(\d+)\s*kg/);
  const quantity = qtyM ? Number(qtyM[1]) : 500;
  const prodM = text.match(/(QA|QZ|QY|QXY)[-\s]?(\d?\.?\d+)\s*mm/i);
  const product = prodM ? `${prodM[1].toUpperCase()}-${prodM[2]}mm 红色` : 'QA-0.08mm 红色';
  const dueDate =
    /(周二|下周二|周三|下周三|周一|下周一|周四|下周四|周五|下周五)/.test(text)
      ? '下周二（2026-07-21）'
      : '2026-07-21';
  return { customer, product, quantity, dueDate, rawText: text };
}

/** Agent #1 主响应工厂 */
export function buildInsertEvaluation(input: { text: string }): InsertEvalOutput {
  const req = parseInsertText(input.text);
  // 固定生成 3 方案；resourceIds 用真实 ID（漆包车间 #2 / #4）
  const base = new Date('2026-07-17T14:00:00').getTime();
  const HR = 3_600_000;
  return {
    type: 'insert-evaluation',
    request: req,
    schemes: [
      {
        id: 'A', label: '方案 A：排到 漆包机 #2',
        resourceIds: ['R-EN-02'],
        start: new Date(base),
        durationMs: 4 * HR,
        impact: { affectedOrders: 5, affectedOrderIds: [], otdDelta: '-0.8pp', changeoverDelta: '+45min' },
        recommended: false,
        reason: '#2 机当前空档较多但要顶替已有 QA-0.5mm 工单，换型耗时较大',
      },
      {
        id: 'B', label: '方案 B：排到 漆包机 #4',
        resourceIds: ['R-EN-04'],
        start: new Date(base + 2 * HR),
        durationMs: 4 * HR,
        impact: { affectedOrders: 2, affectedOrderIds: [], otdDelta: '-0.5pp', changeoverDelta: '+15min' },
        recommended: true,
        reason: '影响最小，且 #4 机当前正在生产同漆种工单，换型仅需 15 分钟',
      },
      {
        id: 'C', label: '方案 C：拆分到 #2 + #4',
        resourceIds: ['R-EN-02', 'R-EN-04'],
        start: new Date(base + HR),
        durationMs: 3 * HR,
        impact: { affectedOrders: 3, affectedOrderIds: [], otdDelta: '-0.6pp', changeoverDelta: '+30min' },
        recommended: false,
        reason: '平摊到两台机以保守交期，但增加协调成本',
      },
    ],
  };
}

/* ============ Agent #2: schedule.scheme-explainer ============ */
export interface SchemeExplanation {
  type: 'scheme-explanation';
  workOrder: { id: string; product: string; resource: string; window: string; quantity: number };
  sections: Array<{ title: string; body: string }>;
}
export function buildSchemeExplanation(args: { wo: WorkOrder; resourceName: string }): SchemeExplanation {
  const { wo, resourceName } = args;
  const start = wo.scheduledStart!;
  const end = wo.scheduledEnd!;
  const startStr = `${start.getMonth() + 1}-${String(start.getDate()).padStart(2,'0')} ${String(start.getHours()).padStart(2,'0')}:${String(start.getMinutes()).padStart(2,'0')}`;
  const endStr = `${end.getMonth() + 1}-${String(end.getDate()).padStart(2,'0')} ${String(end.getHours()).padStart(2,'0')}:${String(end.getMinutes()).padStart(2,'0')}`;
  const dueStr = `${wo.dueDate.getMonth() + 1}-${String(wo.dueDate.getDate()).padStart(2,'0')}`;
  // 估算缓冲
  const bufferHours = Math.max(0, Math.round((wo.dueDate.getTime() - end.getTime()) / 3_600_000));
  return {
    type: 'scheme-explanation',
    workOrder: { id: wo.id, product: wo.productName, resource: resourceName, window: `${startStr} ~ ${endStr}`, quantity: wo.quantity },
    sections: [
      {
        title: '换型最优',
        body: `${resourceName} 前一工单与本工单同漆种（${wo.productName.split('-')[0]}），仅需换色 / 调线径，换型约 30 分钟，远低于跨漆种切换的 90 分钟。`,
      },
      {
        title: '交期匹配',
        body: `工单交期 ${dueStr}，计划完工 ${endStr}，留有 ${bufferHours <= 0 ? '少量' : Math.ceil(bufferHours / 24)} 天缓冲，可应对小幅偏差。`,
      },
      {
        title: '优先级权重',
        body: '当前算法权重 OTD 30% / 换型最小 25% / 利用率 25% / 在制最小 20%。综合评分本方案得分最高（87.4），优于次优 12.6 分。',
      },
      {
        title: '备选方案',
        body: '备选为同车间另一台机的相邻时段，但前序工单为不同漆种，需换漆 + 清洗约 90 分钟，综合评分次之（74.8）。如需对比可在算法面板启用「A/B/C 方案」。',
      },
    ],
  };
}

/* ============ Agent #3: schedule.anomaly-observer ============ */
export interface AnomalyOptimization {
  type: 'anomaly-optimization';
  resource: string;
  resourceId: string;
  idle: number;            // %
  affectedWorkOrders: Array<{ id: string; product: string; quantity: number; quantityKg: number }>;
  savedHours: number;
  utilizationBefore: number;
  utilizationAfter: number;
  kpiBefore: number;       // changeoverLoss before
  kpiAfter: number;        // changeoverLoss after
}
export const ANOMALY_OPT: AnomalyOptimization = {
  type: 'anomaly-optimization',
  resource: '漆包机 #3',
  resourceId: 'R-EN-03',
  idle: 30,
  affectedWorkOrders: [
    { id: 'WO-2026-1240', product: 'QA-0.3mm 蓝色', quantity: 200, quantityKg: 200 },
    { id: 'WO-2026-1242', product: 'QA-0.3mm 蓝色', quantity: 350, quantityKg: 350 },
    { id: 'WO-2026-1245', product: 'QA-0.3mm 蓝色', quantity: 180, quantityKg: 180 },
  ],
  savedHours: 2.5,
  utilizationBefore: 70,
  utilizationAfter: 88,
  kpiBefore: 12.6,
  kpiAfter: 10.4,
};

/* ============ 注册表 ============ */
export const AGENT_RESPONSES: Record<string, unknown> = {
  'schedule.insert-assistant': (input: { text: string }) => buildInsertEvaluation(input),
  'schedule.scheme-explainer': null,            // 由 mockApi 直接调用 buildSchemeExplanation，需要工单上下文
  'schedule.anomaly-observer': ANOMALY_OPT,
  // Sprint 3:
  // 'cost.loss-diagnostic': ...
  // 'cost.analysis-assistant': ...
};
