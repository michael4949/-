// §6 五个 Agent 的预设响应
import type { WorkOrder } from '../types/workOrder';
import type { LossDiagnosticOutput } from '../types/cost';

/* ============ Agent #1: schedule.insert-assistant ============ */
export interface InsertScheme {
  id: 'A' | 'B' | 'C';
  label: string;
  resourceIds: string[];
  start: Date;
  durationMs: number;
  impact: {
    affectedOrders: number;
    affectedOrderIds: string[];
    otdDelta: string;
    changeoverDelta: string;
  };
  recommended: boolean;
  reason?: string;
}
export interface InsertEvalOutput {
  type: 'insert-evaluation';
  request: { customer: string; product: string; quantity: number; dueDate: string; rawText: string };
  schemes: InsertScheme[];
}
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
export function buildInsertEvaluation(input: { text: string }): InsertEvalOutput {
  const req = parseInsertText(input.text);
  const base = new Date('2026-07-17T14:00:00').getTime();
  const HR = 3_600_000;
  return {
    type: 'insert-evaluation', request: req,
    schemes: [
      { id: 'A', label: '方案 A：排到 漆包机 #2', resourceIds: ['R-EN-02'],
        start: new Date(base), durationMs: 4 * HR,
        impact: { affectedOrders: 5, affectedOrderIds: [], otdDelta: '-0.8pp', changeoverDelta: '+45min' },
        recommended: false, reason: '#2 机当前空档较多但要顶替已有 QA-0.5mm 工单，换型耗时较大' },
      { id: 'B', label: '方案 B：排到 漆包机 #4', resourceIds: ['R-EN-04'],
        start: new Date(base + 2 * HR), durationMs: 4 * HR,
        impact: { affectedOrders: 2, affectedOrderIds: [], otdDelta: '-0.5pp', changeoverDelta: '+15min' },
        recommended: true, reason: '影响最小，且 #4 机当前正在生产同漆种工单，换型仅需 15 分钟' },
      { id: 'C', label: '方案 C：拆分到 #2 + #4', resourceIds: ['R-EN-02', 'R-EN-04'],
        start: new Date(base + HR), durationMs: 3 * HR,
        impact: { affectedOrders: 3, affectedOrderIds: [], otdDelta: '-0.6pp', changeoverDelta: '+30min' },
        recommended: false, reason: '平摊到两台机以保守交期，但增加协调成本' },
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
  const bufferHours = Math.max(0, Math.round((wo.dueDate.getTime() - end.getTime()) / 3_600_000));
  return {
    type: 'scheme-explanation',
    workOrder: { id: wo.id, product: wo.productName, resource: resourceName, window: `${startStr} ~ ${endStr}`, quantity: wo.quantity },
    sections: [
      { title: '换型最优', body: `${resourceName} 前一工单与本工单同漆种（${wo.productName.split('-')[0]}），仅需换色 / 调线径，换型约 30 分钟，远低于跨漆种切换的 90 分钟。` },
      { title: '交期匹配', body: `工单交期 ${dueStr}，计划完工 ${endStr}，留有 ${bufferHours <= 0 ? '少量' : Math.ceil(bufferHours / 24)} 天缓冲，可应对小幅偏差。` },
      { title: '优先级权重', body: '当前算法权重 OTD 30% / 换型最小 25% / 利用率 25% / 在制最小 20%。综合评分本方案得分最高（87.4），优于次优 12.6 分。' },
      { title: '备选方案', body: '备选为同车间另一台机的相邻时段，但前序工单为不同漆种，需换漆 + 清洗约 90 分钟，综合评分次之（74.8）。如需对比可在算法面板启用「A/B/C 方案」。' },
    ],
  };
}

/* ============ Agent #3: schedule.anomaly-observer ============ */
export interface AnomalyOptimization {
  type: 'anomaly-optimization';
  resource: string;
  resourceId: string;
  idle: number;
  affectedWorkOrders: Array<{ id: string; product: string; quantity: number; quantityKg: number }>;
  savedHours: number;
  utilizationBefore: number;
  utilizationAfter: number;
  kpiBefore: number;
  kpiAfter: number;
}
export const ANOMALY_OPT: AnomalyOptimization = {
  type: 'anomaly-optimization',
  resource: '漆包机 #3', resourceId: 'R-EN-03', idle: 30,
  affectedWorkOrders: [
    { id: 'WO-2026-1240', product: 'QA-0.3mm 蓝色', quantity: 200, quantityKg: 200 },
    { id: 'WO-2026-1242', product: 'QA-0.3mm 蓝色', quantity: 350, quantityKg: 350 },
    { id: 'WO-2026-1245', product: 'QA-0.3mm 蓝色', quantity: 180, quantityKg: 180 },
  ],
  savedHours: 2.5, utilizationBefore: 70, utilizationAfter: 88,
  kpiBefore: 12.6, kpiAfter: 10.4,
};

/* ============ Agent #4: cost.loss-diagnostic ============ */
export function buildLossDiagnostic(input: { workOrderId: string }): LossDiagnosticOutput {
  const woId = input.workOrderId || 'WO-2024-1234';
  // §6.2.4 原文：固定演示对象 WO-2024-1234（其他工单也走这同一模版，仅 ID 替换）
  return {
    type: 'loss-diagnostic',
    workOrder: woId,
    customer: '华翔电机',
    productName: 'QA-0.5mm 红色',
    actualLoss: 0.48,
    baseline: 0.18,
    deviation: 0.30,
    rootCauses: [
      {
        factor: '原料批次',
        detail: '本工单使用铜杆批次 LB-2024-09-A，含氧量 215ppm（基线 180ppm）',
        severity: 'high',
        related: { kind: 'batch', value: 'LB-2024-09-A' },
      },
      {
        factor: '设备状态',
        detail: '漆包机 #3 第 2 涂漆头压力偏低（0.42MPa，标准 0.45-0.50MPa）',
        severity: 'medium',
        related: { kind: 'machine', value: '漆包机 #3' },
      },
      {
        factor: '操作班组',
        detail: '本工单由 B 班组（夜班）生产，夜班损耗历史均值偏高 0.05pp',
        severity: 'low',
        related: { kind: 'team', value: 'B 班组（夜班）' },
      },
    ],
    recommendation: [
      '对 LB-2024-09-A 批次铜杆进行复检；',
      '漆包机 #3 涂漆头近期校准；',
      '不直接调整班组安排，持续观察。',
    ],
  };
}

/* ============ Agent #5: cost.analysis-assistant ============ */
export type CostAnswerAttachment =
  | { type: 'table'; columns: string[]; rows: Array<(string | number)[]> }
  | { type: 'bar'; title?: string; items: Array<{ name: string; value: number; color?: string }>; valueLabel?: string }
  | { type: 'pie'; title?: string; items: Array<{ name: string; value: number; color?: string }> }
  | { type: 'line'; title?: string; series: Array<{ name: string; data: number[]; color?: string }>; xLabels: string[]; valueLabel?: string }
  | { type: 'workorders'; items: Array<{ id: string; product: string; status: string; tag: 'completed' | 'in-progress' }> };

export interface CostAnswerOutput {
  type: 'cost-answer';
  matchedKey: string;
  text: string;
  attachments: CostAnswerAttachment[];
  followup?: string[];
}

const LOW_MARGIN: CostAnswerOutput = {
  type: 'cost-answer',
  matchedKey: 'low-margin',
  text: '本月（2026-07）毛利率最低的 5 家客户如下。其中**东方电气**因 QA-0.3mm 镀漆订单为多但价格承压，毛利率 8.2%，建议销售复核报价或调整结构。',
  attachments: [
    { type: 'bar', title: '客户毛利率（%）',
      items: [
        { name: '东方电气', value: 8.2, color: '#EF4444' },
        { name: '远东电缆', value: 9.1, color: '#F59E0B' },
        { name: '宝胜股份', value: 9.8, color: '#F59E0B' },
        { name: '长城电工', value: 10.4, color: '#10B981' },
        { name: '德力西',  value: 11.2, color: '#10B981' },
      ],
      valueLabel: '%',
    },
    { type: 'table',
      columns: ['客户', '订单数', '收入(万元)', '毛利率', '同比'],
      rows: [
        ['东方电气', 18, 642, '8.2%',  '-1.4pp'],
        ['远东电缆', 22, 514, '9.1%',  '-0.8pp'],
        ['宝胜股份', 16, 488, '9.8%',  '-0.3pp'],
        ['长城电工', 12, 326, '10.4%', '+0.2pp'],
        ['德力西',  15, 358, '11.2%', '+0.5pp'],
      ],
    },
  ],
  followup: ['LB-2024-09-A 批次还用在哪些工单？', '本月各产线的成本对比'],
};

const COPPER_MONTH_COMPARE: CostAnswerOutput = {
  type: 'cost-answer',
  matchedKey: 'copper-month-compare',
  text: '**漆包车间 3 月份铜耗为什么比 2 月份高？** 综合三方面原因：\n1. **铜价上行**：3 月 LME 铜价均价 +1.2%，材料端成本被动抬高；\n2. **订单结构变化**：QY 漆种占比由 2 月 14% → 3 月 22%，QY 单耗高于 QA 约 0.05pp；\n3. **批次损耗偏高**：3 月 9 日起进入车间的 **LB-2024-09-A** 铜杆批次含氧量偏高，相关工单平均多耗 0.12pp。',
  attachments: [
    { type: 'line', title: '漆包车间月铜耗损耗率（%）',
      xLabels: ['1 月', '2 月', '3 月', '4 月', '5 月', '6 月', '7 月'],
      series: [
        { name: '损耗率', data: [0.21, 0.19, 0.25, 0.22, 0.20, 0.19, 0.18], color: '#7C3AED' },
        { name: '基线',  data: [0.20, 0.20, 0.20, 0.20, 0.20, 0.20, 0.20], color: '#9CA3AF' },
      ],
      valueLabel: '%',
    },
  ],
  followup: ['LB-2024-09-A 批次还用在哪些工单？', 'WO-2024-1234 的成本构成'],
};

const WO_COST: CostAnswerOutput = {
  type: 'cost-answer',
  matchedKey: 'workorder-cost',
  text: '**WO-2024-1234**（QA-0.5mm 红色 · 华翔电机 · 500kg）成本构成：直接铜材占 76.4%，能源占 8.1%，人工占 6.3%，漆耗+辅料占 6.8%，制造费用 2.4%。单位成本 ¥31,420/吨，**较基线偏高 0.6%**。',
  attachments: [
    { type: 'pie', title: 'WO-2024-1234 成本构成',
      items: [
        { name: '直接铜材', value: 76.4, color: '#FF6B35' },
        { name: '能源',     value: 8.1,  color: '#3B82F6' },
        { name: '人工',     value: 6.3,  color: '#10B981' },
        { name: '漆耗+辅料', value: 6.8,  color: '#7C3AED' },
        { name: '制造费用', value: 2.4,  color: '#9CA3AF' },
      ],
    },
    { type: 'table',
      columns: ['项目', '金额(元)', '占比', '基线占比'],
      rows: [
        ['直接铜材',  12_005, '76.4%', '75.8%'],
        ['能源',       1_273,  '8.1%',  '8.0%'],
        ['人工',         990,  '6.3%',  '6.5%'],
        ['漆耗+辅料',  1_068,  '6.8%',  '7.2%'],
        ['制造费用',     377,  '2.4%',  '2.5%'],
      ],
    },
  ],
  followup: ['LB-2024-09-A 批次还用在哪些工单？'],
};

const LINE_COST_COMPARE: CostAnswerOutput = {
  type: 'cost-answer',
  matchedKey: 'line-cost-compare',
  text: '本月 18 条漆包机的单位成本对比如下。**#3 机**单位成本最高（¥32,180/吨），主因是承担了较多 QY 漆种与 LB-2024-09-A 批次工单；**#11 机**最低（¥30,420/吨）。差距 ¥1,760，约 5.5%。',
  attachments: [
    { type: 'bar', title: '漆包车间各产线单位成本（元/吨）',
      items: Array.from({ length: 18 }).map((_, i) => {
        const id = i + 1;
        const base = 30_500 + Math.floor(Math.sin(i * 0.9) * 600);
        // #3 特别高
        const value = id === 3 ? 32_180 : id === 11 ? 30_420 : base + (i % 3) * 80;
        return {
          name: `#${id}`,
          value,
          color: id === 3 ? '#EF4444' : id === 11 ? '#10B981' : '#3B82F6',
        };
      }),
      valueLabel: '元/吨',
    },
  ],
  followup: ['#3 机为什么单位成本最高？'],
};

const BATCH_TRACE: CostAnswerOutput = {
  type: 'cost-answer',
  matchedKey: 'batch-trace',
  text: '**LB-2024-09-A** 批次铜杆共使用在 **8 张工单**上，其中 5 张已完工、3 张在制。建议立即对在制 3 张工单加强检验，并对未使用部分进行复检。',
  attachments: [
    { type: 'workorders',
      items: [
        { id: 'WO-2024-1234', product: 'QA-0.5mm 红色',  status: '已完工', tag: 'completed' },
        { id: 'WO-2024-1198', product: 'QA-0.5mm 蓝色',  status: '已完工', tag: 'completed' },
        { id: 'WO-2024-1205', product: 'QA-0.5mm 黄色',  status: '已完工', tag: 'completed' },
        { id: 'WO-2024-1221', product: 'QA-0.3mm 红色',  status: '已完工', tag: 'completed' },
        { id: 'WO-2024-1229', product: 'QA-0.5mm 红色',  status: '已完工', tag: 'completed' },
        { id: 'WO-2026-1352', product: 'QA-0.5mm 红色',  status: '在制',   tag: 'in-progress' },
        { id: 'WO-2026-1374', product: 'QA-0.3mm 蓝色',  status: '在制',   tag: 'in-progress' },
        { id: 'WO-2026-1389', product: 'QA-0.5mm 透明',  status: '在制',   tag: 'in-progress' },
      ],
    },
  ],
};

const DEFAULT_FOLLOWUPS = [
  '哪些客户的订单毛利最低？',
  '漆包车间 3 月份的铜耗为什么比 2 月份高？',
  'WO-2024-1234 的成本构成',
  '本月各产线的成本对比',
];

export function answerCostQuery(input: { text: string }): CostAnswerOutput {
  const t = input.text;
  if (/LB[-\s]?2024[-\s]?09[-\s]?A|批次.*工单|工单.*批次/i.test(t)) return BATCH_TRACE;
  if (/毛利|低|客户|哪些客户/.test(t))                              return LOW_MARGIN;
  if (/3\s*月|2\s*月|月份|铜耗.*高|铜耗.*为何/.test(t))             return COPPER_MONTH_COMPARE;
  if (/WO[-\s]?2024[-\s]?1234|成本构成|构成/i.test(t))              return WO_COST;
  if (/产线|18\s*条|漆包机|各产线|对比/.test(t))                    return LINE_COST_COMPARE;
  return {
    type: 'cost-answer',
    matchedKey: 'fallback',
    text: '我可以帮您分析本月成本相关问题，建议您试试以下问题：',
    attachments: [],
    followup: DEFAULT_FOLLOWUPS,
  };
}

/* ============ 注册表 ============ */
export const AGENT_RESPONSES: Record<string, unknown> = {
  'schedule.insert-assistant': (input: { text: string }) => buildInsertEvaluation(input),
  'schedule.scheme-explainer': null,              // 由 mockApi 直接调用 buildSchemeExplanation
  'schedule.anomaly-observer': ANOMALY_OPT,
  'cost.loss-diagnostic':     (input: { workOrderId: string }) => buildLossDiagnostic(input),
  'cost.analysis-assistant':  (input: { text: string }) => answerCostQuery(input),
};
