// §6 Agent 预设响应（Sprint 0-3 含 Agent #1-4 / #21-22；新增 17 个见 agentResponses.sprint4/5/6.ts）
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

// ★ v2.2.1：多机异常提示（Agent #3 在多车间识别的可优化点）
//   GanttChart 会按当前车间显示对应行末的 Inline Hint
export interface AnomalyHint {
  resourceId: string;
  message: string;
  /** 点击后弹 Modal 复用 ANOMALY_OPT 的 explain，但展示不同的资源名与优化点 */
  detail: {
    title: string;
    summary: string;
    affected: Array<{ id: string; product: string; quantity: number }>;
    savedHours: number;
    metricFrom: string;
    metricTo: string;
  };
}

export const ANOMALY_HINTS: AnomalyHint[] = [
  // ===== 漆包车间 6 台异常 =====
  {
    resourceId: 'R-EN-03',
    message: '闲置 30%, 可优化',
    detail: {
      title: '漆包机 #3 · 排产可优化',
      summary: '未来 3 天闲置率约 30%，建议合并 3 张同规格 QA-0.3mm 工单连续生产',
      affected: ANOMALY_OPT.affectedWorkOrders,
      savedHours: 2.5,
      metricFrom: '利用率 70% / 换型损失 12.6%',
      metricTo: '利用率 88% / 换型损失 10.4%',
    },
  },
  {
    resourceId: 'R-EN-05',
    message: '换型偏高, 可合并',
    detail: {
      title: '漆包机 #5 · 换型频次偏高',
      summary: '近 7 天换型 18 次（基线 10 次），建议合并 4 张 QZ 漆种工单减少跨色切换',
      affected: [
        { id: 'WO-2026-1310', product: 'QZ-0.45mm 红色', quantity: 420 },
        { id: 'WO-2026-1314', product: 'QZ-0.45mm 蓝色', quantity: 380 },
        { id: 'WO-2026-1318', product: 'QZ-0.45mm 黄色', quantity: 360 },
      ],
      savedHours: 2.0,
      metricFrom: '换型 18 次 / 损失 14.2%',
      metricTo: '换型 12 次 / 损失 10.8%',
    },
  },
  {
    resourceId: 'R-EN-08',
    message: '过载 95%, 建议分流',
    detail: {
      title: '漆包机 #8 · 排产过载预警',
      summary: '未来 7 天负荷 95%，待排队 28 张 / 142 吨，建议迁移 12 张同规格工单至 #9 机',
      affected: [
        { id: 'WO-2026-1268', product: 'QA-0.5mm 红色', quantity: 500 },
        { id: 'WO-2026-1272', product: 'QA-0.5mm 红色', quantity: 480 },
        { id: 'WO-2026-1289', product: 'QA-0.5mm 黄色', quantity: 620 },
      ],
      savedHours: 6.0,
      metricFrom: '负荷 95% / 排队 28 张',
      metricTo: '负荷 78% / 排队 16 张',
    },
  },
  {
    resourceId: 'R-EN-11',
    message: '单耗最低, 可承接',
    detail: {
      title: '漆包机 #11 · 单位成本最低',
      summary: '本月单位成本 ¥30,420/吨（基线 ¥30,600），可优先承接高毛利工单',
      affected: [
        { id: 'WO-2026-1351', product: 'QA-0.5mm 红色', quantity: 800 },
        { id: 'WO-2026-1356', product: 'QA-0.5mm 红色', quantity: 720 },
      ],
      savedHours: 0,
      metricFrom: '单耗 ¥30,420/吨',
      metricTo: '可承担额外 28 吨高毛利订单',
    },
  },
  {
    resourceId: 'R-EN-14',
    message: '保养超期, 待检',
    detail: {
      title: '漆包机 #14 · 设备保养超期',
      summary: '距上次保养 850 小时（标准 720 小时），建议本周三 22:00 停机保养',
      affected: [
        { id: 'WO-2026-1372', product: 'QY-0.31mm 红色', quantity: 320 },
      ],
      savedHours: 0,
      metricFrom: '保养超期 130 小时',
      metricTo: '建议本周三停机 6h 保养',
    },
  },
  {
    resourceId: 'R-EN-17',
    message: '空档可填, 推荐承接',
    detail: {
      title: '漆包机 #17 · 空档时间充裕',
      summary: '未来 3 天空档 18 小时，可承接待排池中 4 张 QA-0.13mm 工单',
      affected: [
        { id: 'WO-2026-1395', product: 'QA-0.13mm 透明', quantity: 380 },
        { id: 'WO-2026-1402', product: 'QA-0.13mm 红色', quantity: 410 },
      ],
      savedHours: 1.2,
      metricFrom: '利用率 58% / 空档 18h',
      metricTo: '利用率 80% / 空档 4h',
    },
  },
  // ===== 拉丝车间 2 台异常 =====
  {
    resourceId: 'R-DR-12',
    message: '排队偏多, 可调',
    detail: {
      title: '中拉机 #12 · 排队偏多',
      summary: '排队工单 12 张共 38 吨，建议分流 6 张至 #14 中拉机（空档 35%）',
      affected: [
        { id: 'WO-2026-1294', product: '拉丝半成品 Φ1.2mm', quantity: 1200 },
        { id: 'WO-2026-1301', product: '拉丝半成品 Φ1.4mm', quantity: 1100 },
      ],
      savedHours: 4.5,
      metricFrom: '排队 12 张 / 38 吨',
      metricTo: '排队 6 张 / 18 吨',
    },
  },
  {
    resourceId: 'R-DR-20',
    message: '振动偏高, 建议查',
    detail: {
      title: '小拉机 #20 · 振动传感器报警',
      summary: '振动值 4.2 mm/s（警戒线 3.5），建议立即停机检查轴承与拉拔模具',
      affected: [
        { id: 'WO-2026-1418', product: '拉丝半成品 Φ0.45mm', quantity: 280 },
      ],
      savedHours: 0,
      metricFrom: '振动 4.2 mm/s（超警戒）',
      metricTo: '需即时停机检查',
    },
  },
  // ===== 绞线车间 2 台异常 =====
  {
    resourceId: 'R-ST-02',
    message: '空档 25%, 可合并',
    detail: {
      title: '绞线机 #2 · 空档可合并',
      summary: '未来 5 天空档率 25%，建议合并 4 张 19 股配股工单连续生产',
      affected: [
        { id: 'WO-2026-STR01', product: '19 股 ×Φ0.5mm 镀锡铜绞线', quantity: 500 },
        { id: 'WO-2026-1325',  product: '19 股 ×Φ0.4mm 铜绞线',     quantity: 480 },
      ],
      savedHours: 1.8,
      metricFrom: '利用率 65% / 空档 25%',
      metricTo: '利用率 86% / 空档 4%',
    },
  },
  {
    resourceId: 'R-ST-06',
    message: '股型变更频繁',
    detail: {
      title: '绞线机 #6 · 股型变更频繁',
      summary: '近 7 天股型切换 9 次（基线 4 次），建议合并 7 股工单与 19 股工单错峰',
      affected: [
        { id: 'WO-2026-1441', product: '7 股 ×Φ0.3mm 铜绞线',  quantity: 360 },
        { id: 'WO-2026-1448', product: '7 股 ×Φ0.4mm 铜绞线',  quantity: 420 },
      ],
      savedHours: 1.5,
      metricFrom: '股型切换 9 次',
      metricTo: '股型切换 5 次',
    },
  },
];

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

/* ============ Agent #6: schedule.stranding-config-assistant (v2.1) ============ */
//   铜绞线配股助手：同总股数硬约束下，给出"用余料 / 全新拉 / 多源拼合"三种配股方案
//   客户原话需求（铜锐陈总 6.18 会议）：把老师傅"7+12 还是 5+5+5+4"的经验做成显性多目标优化
export interface StrandingSource {
  /** 来源类别（用于色块可视化）：bin=完工余料 / stock=库存半成品 / new=新拉 */
  kind: 'bin' | 'stock' | 'new';
  /** 来源描述：例 "WO-1230 完工余料" */
  from: string;
  strands: number;        // 股数
  diameter: number;       // mm
}
export interface StrandingScheme {
  id: 'A' | 'B' | 'C';
  label: string;
  composition: StrandingSource[];
  cost: number;             // 总成本（元）
  costSaving?: number;      // 相对方案 B 的节省（负值=节省）
  qualityRating: 1 | 2 | 3 | 4 | 5;
  schedulingFit: 1 | 2 | 3 | 4 | 5;
  recommended?: boolean;
  reason: string;
}
export interface StrandingConfigOutput {
  type: 'stranding-config';
  request: {
    workOrderId?: string;
    customer: string;
    totalStrands: number;
    strandDiameter: number;
    plating: 'tin' | 'bare' | 'enameled';
    quantity: number;            // kg
    dueDate: string;
    rawText: string;
  };
  schemes: StrandingScheme[];
  decisionFactors: string;
}

/** 简易 NLU：从自然语言中解析配股需求 */
function parseStrandingText(text: string) {
  // 股数：支持 "19 股" / "19股" / "x19"
  const totalStrands = (() => {
    const m = text.match(/(\d{1,2})\s*股/);
    if (m) return Number(m[1]);
    const m2 = text.match(/[x×]\s*(\d{1,2})/i);
    return m2 ? Number(m2[1]) : 19;
  })();
  // 单丝直径
  const dia = text.match(/(\d?\.\d{1,2})\s*mm/);
  const strandDiameter = dia ? Number(dia[1]) : 0.5;
  // 客户
  const customer =
    /东方电气/.test(text) ? '东方电气'
    : /远东/.test(text) ? '远东电缆'
    : /宝胜/.test(text) ? '宝胜股份'
    : /上海电气/.test(text) ? '上海电气'
    : /华翔/.test(text) ? '华翔电机'
    : '东方电气';
  // 数量
  const qty = text.match(/(\d+)\s*kg/);
  const quantity = qty ? Number(qty[1]) : 500;
  // 镀层
  const plating: 'tin' | 'bare' | 'enameled' =
    /镀锡|tin/i.test(text) ? 'tin'
    : /漆包|enamel/i.test(text) ? 'enameled'
    : 'bare';
  return {
    customer, totalStrands, strandDiameter, plating, quantity,
    dueDate: '2026-07-22',
    rawText: text,
  };
}

export function buildStrandingConfig(input: { text?: string; workOrderId?: string; customer?: string; totalStrands?: number; strandDiameter?: number; plating?: 'tin' | 'bare' | 'enameled'; quantity?: number }): StrandingConfigOutput {
  // 入参兼容：来自工单详情按钮（带 workOrderId/规格直传）或来自 Copilot 自然语言
  let req: StrandingConfigOutput['request'];
  if (input.workOrderId) {
    req = {
      workOrderId: input.workOrderId,
      customer: input.customer ?? '东方电气',
      totalStrands: input.totalStrands ?? 19,
      strandDiameter: input.strandDiameter ?? 0.5,
      plating: input.plating ?? 'tin',
      quantity: input.quantity ?? 500,
      dueDate: '2026-07-22',
      rawText: '',
    };
  } else {
    req = parseStrandingText(input.text ?? '');
  }
  const N = req.totalStrands;
  const D = req.strandDiameter;

  // 三种方案：A 余料+库存（7+12 / 推荐） · B 全新拉 · C 多源拼合
  // 拆分股数（按 N 比例近似匹配补丁文档示例）
  const a1 = Math.max(2, Math.round(N * 0.37));      // 余料占比 ≈ 37%
  const a2 = N - a1;
  const c1 = Math.max(2, Math.floor(N * 0.27));
  const c2 = Math.max(2, Math.floor(N * 0.27));
  const c3 = Math.max(2, Math.floor(N * 0.27));
  const c4 = N - c1 - c2 - c3;

  // 单股基础成本（mock：直径 × 数量的简化估）
  const unitStrandCost = 18000 / 19;   // 以 19 股 ¥18,000 为基准
  const costB = Math.round(unitStrandCost * N * 1.10 * (req.quantity / 500));   // 全新拉 +10%
  const costA = Math.round(unitStrandCost * N * 1.02 * (req.quantity / 500));   // 余料 +2%
  const costC = Math.round(unitStrandCost * N * 1.01 * (req.quantity / 500));   // 多源拼合 +1% 但质量差

  return {
    type: 'stranding-config',
    request: req,
    schemes: [
      {
        id: 'A',
        label: `方案 A：${a1}+${a2} 配股（库存余料优先）★ 推荐`,
        composition: [
          { kind: 'bin',   from: 'WO-2026-1230 完工余料', strands: a1, diameter: D },
          { kind: 'stock', from: `库存 ${D}mm 半成品`,     strands: a2, diameter: D },
        ],
        cost: costA,
        costSaving: costA - costB,                // 负值
        qualityRating: 4,
        schedulingFit: 5,
        recommended: true,
        reason: `充分利用 WO-2026-1230 完工后的 ${a1} 股余料，避免新起拉成本；库存半成品就绪可立即开绞`,
      },
      {
        id: 'B',
        label: `方案 B：${N}×${D}mm 全新拉`,
        composition: [
          { kind: 'new', from: `新拉 ${D}mm 单批`, strands: N, diameter: D },
        ],
        cost: costB,
        qualityRating: 5,
        schedulingFit: 3,
        reason: '单源拉丝直径偏差最小、质量最稳，但需新起拉约 4 小时，挤占当前 #5 中拉机时段',
      },
      {
        id: 'C',
        label: `方案 C：${c1}+${c2}+${c3}+${c4} 多源拼合`,
        composition: [
          { kind: 'bin',   from: 'WO-2026-1230 完工余料', strands: c1, diameter: D },
          { kind: 'bin',   from: 'WO-2026-1232 完工余料', strands: c2, diameter: D },
          { kind: 'stock', from: `库存 ${D}mm 半成品`,     strands: c3, diameter: D },
          { kind: 'new',   from: `新拉 ${D}mm 短批`,       strands: c4, diameter: D },
        ],
        cost: costC,
        qualityRating: 3,
        schedulingFit: 4,
        reason: '成本最低但 4 源拼合存直径偏差风险（±5μm），需加强成品 SPC 抽检',
      },
    ],
    decisionFactors: `该订单交期 ${req.dueDate}（${Math.round((new Date(req.dueDate).getTime() - new Date('2026-07-15').getTime()) / 86400000)} 天后），客户对质量要求中等。推荐方案 A 平衡成本与质量；若以质量为先选 B，若以成本为先选 C 但需加强抽检。`,
  };
}

/* ============ 注册表 ============ */
export const AGENT_RESPONSES: Record<string, unknown> = {
  'schedule.insert-assistant': (input: { text: string }) => buildInsertEvaluation(input),
  'schedule.scheme-explainer': null,              // 由 mockApi 直接调用 buildSchemeExplanation
  'schedule.anomaly-observer': ANOMALY_OPT,
  'schedule.stranding-config-assistant': (input: { text?: string; workOrderId?: string; customer?: string; totalStrands?: number; strandDiameter?: number; plating?: 'tin' | 'bare' | 'enameled'; quantity?: number }) => buildStrandingConfig(input),
  'cost.loss-diagnostic':     (input: { workOrderId: string }) => buildLossDiagnostic(input),
  'cost.analysis-assistant':  (input: { text: string }) => answerCostQuery(input),
};
