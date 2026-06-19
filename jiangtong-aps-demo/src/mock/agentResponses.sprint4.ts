// Sprint 4 · 8 个新 Agent 预设响应
//   #5 换型矩阵生成 · #6 矩阵历史复盘 · #7 隐性约束挖掘 · #18 约束冲突解释器
//   #8 样品工单 BOM · #9 异常工单识别
//   #10 缺料根因 · #11 齐套风险预测

/* =========================================================================
 * Agent #5  schedule-rule.matrix-generator  ——  换型矩阵生成助手
 * ========================================================================= */
export interface MatrixCell {
  /** 单元格说明（同漆同径=0）*/
  reason: string;
  value: number; // 分钟
}
export interface MatrixDraftOutput {
  type: 'matrix-draft';
  /** N×N 矩阵的维度标签（例 ["QA-0.5mm", "QA-0.3mm", "QZ-0.5mm", ...]）*/
  dimensions: string[];
  /** 行 i → 列 j 的换型时间 */
  cells: MatrixCell[][];
  /** 推理依据：哪些规则被采用 */
  reasoning: string[];
  /** 与上一版本的差异统计 */
  diffStats: { kept: number; changed: number; added: number };
}

export function buildMatrixDraft(): MatrixDraftOutput {
  const dims = ['QA-0.50mm', 'QA-0.30mm', 'QZ-0.50mm', 'QZ-0.30mm', 'QY-0.50mm', 'QY-0.30mm'];
  const cells: MatrixCell[][] = dims.map((row, i) =>
    dims.map((col, j) => {
      if (i === j) return { value: 0, reason: '同规格无需换型' };
      const sameType = row.split('-')[0] === col.split('-')[0];
      const sameDia = row.split('-')[1] === col.split('-')[1];
      if (sameType && !sameDia) return { value: 25, reason: '同漆种换线径，仅调拉拔模具' };
      if (!sameType && sameDia) return { value: 90, reason: '换漆种需清洗涂漆头与浸渍槽' };
      return { value: 105, reason: '漆种与线径全变，需清洗 + 模具更换' };
    }),
  );
  return {
    type: 'matrix-draft',
    dimensions: dims,
    cells,
    reasoning: [
      '基于过去 30 天 1,824 次换型实际耗时（中位数）',
      '同漆种换径 → 平均 25 分钟（标准差 ±4）',
      '换漆种 → 必须清洗，最短 90 分钟（含 30 分钟温度恢复）',
      '同时换漆种+线径 → 105 分钟（重叠操作但温度恢复不可压缩）',
      '本草稿与现有矩阵 5 处偏差超 20%，建议人工复核确认',
    ],
    diffStats: { kept: 18, changed: 5, added: 0 },
  };
}

/* =========================================================================
 * Agent #6  schedule-rule.history-reviewer  ——  矩阵历史复盘
 * ========================================================================= */
export interface HistoryReviewOutput {
  type: 'history-review';
  /** 偏差大于阈值的换型组合 */
  deviations: Array<{
    from: string;
    to: string;
    matrixValue: number;
    actualMedian: number;
    actualP90: number;
    sampleCount: number;
    suggestedValue: number;
  }>;
  /** 周报概览 */
  summary: string;
  /** 矩阵运行时机 */
  runAt: string;
}

export const HISTORY_REVIEW: HistoryReviewOutput = {
  type: 'history-review',
  summary: '过去一周 1,824 次换型实际耗时与矩阵对比：5 处偏差超 20%，3 处建议下调，2 处建议上调。',
  runAt: '2026-07-14 02:00 自动运行',
  deviations: [
    { from: 'QA-0.30mm', to: 'QA-0.20mm', matrixValue: 30, actualMedian: 22, actualP90: 28, sampleCount: 38, suggestedValue: 25 },
    { from: 'QZ-0.50mm', to: 'QZ-0.30mm', matrixValue: 30, actualMedian: 24, actualP90: 30, sampleCount: 27, suggestedValue: 25 },
    { from: 'QA-0.50mm', to: 'QY-0.50mm', matrixValue: 90, actualMedian: 112, actualP90: 130, sampleCount: 14, suggestedValue: 110 },
    { from: 'QY-0.30mm', to: 'QA-0.30mm', matrixValue: 90, actualMedian: 108, actualP90: 125, sampleCount: 12, suggestedValue: 105 },
    { from: 'QA-0.50mm', to: 'QZ-0.30mm', matrixValue: 105, actualMedian: 82, actualP90: 98, sampleCount: 19, suggestedValue: 90 },
  ],
};

/* =========================================================================
 * Agent #7  constraint.implicit-miner  ——  隐性约束挖掘（占位响应）
 * ========================================================================= */
export interface ImplicitConstraintOutput {
  type: 'implicit-constraint';
  candidates: Array<{
    id: string;
    statement: string;
    evidence: string;
    confidence: number; // 0-1
    affectedOrders: number;
  }>;
}

export const IMPLICIT_CONSTRAINTS: ImplicitConstraintOutput = {
  type: 'implicit-constraint',
  candidates: [
    {
      id: 'IC-001',
      statement: '漆包车间湿度 > 55% 时 0.08mm 微细线失败率显著升高（>3pp）',
      evidence: '过去 60 天数据：高湿日次品率 5.2%，低湿日次品率 1.9%；样本数 142',
      confidence: 0.86,
      affectedOrders: 28,
    },
    {
      id: 'IC-002',
      statement: '夜班生产 QY 漆种工单时返工率约为日班 1.6 倍',
      evidence: '夜班 QY 工单 53 单返工 9 次，日班 78 单返工 8 次',
      confidence: 0.71,
      affectedOrders: 12,
    },
    {
      id: 'IC-003',
      statement: '模具 LM-0.5-08 在累计运转超 300 公里时 0.5mm 工单尺寸偏差超标',
      evidence: '该模具 12 次记录中 7 次发生在 >300 公里区间',
      confidence: 0.79,
      affectedOrders: 4,
    },
  ],
};

/* =========================================================================
 * Agent #18  constraint.conflict-explainer  ——  约束冲突解释器
 * ========================================================================= */
export interface ConflictResolution {
  id: 'A' | 'B' | 'C';
  label: string;
  detail: string;
  cost: string;
  recommended: boolean;
}
export interface ConflictExplainOutput {
  type: 'conflict-explain';
  workOrderId: string;
  conflictReason: string;
  conflictDetail: string;
  resolutions: ConflictResolution[];
}

export function buildConflictExplain(input: { workOrderId?: string }): ConflictExplainOutput {
  const id = input.workOrderId || 'WO-2026-1248';
  return {
    type: 'conflict-explain',
    workOrderId: id,
    conflictReason: '模具寿命不足',
    conflictDetail: `工单 ${id} 计划使用 0.5mm 拉拔模具 LM-0.5-08，但该模具剩余寿命 200 公里，本工单需要 350 公里。同时备用模具 LM-0.5-09 已被 WO-2026-1255 锁定到 2026-07-22。`,
    resolutions: [
      {
        id: 'A',
        label: '方案 A：换装备用模具 LM-0.5-09（剩余 800 公里）',
        detail: '需协调 WO-2026-1255 将模具释放半天，或申请新模具 LM-0.5-10 加紧加工',
        cost: '影响 1 张工单 · 协调耗时约 0.5 天',
        recommended: true,
      },
      {
        id: 'B',
        label: '方案 B：推迟到模具维护后（2026-07-20）',
        detail: '等待 LM-0.5-08 修磨完成（含淬火 12 小时）',
        cost: '本工单延期 5 天，OTD -0.6pp',
        recommended: false,
      },
      {
        id: 'C',
        label: '方案 C：拆分为两张工单（200 公里 + 150 公里）',
        detail: '第一段用 LM-0.5-08（剩余 200 公里），第二段排到模具维修后',
        cost: '产生额外换型 90 分钟 + 协调成本',
        recommended: false,
      },
    ],
  };
}

/* =========================================================================
 * Agent #8  workorder.bom-generator  ——  样品工单 BOM 生成
 * ========================================================================= */
export interface BOMItem {
  category: 'main' | 'aux';
  material: string;
  spec: string;
  qty: number;
  unit: string;
  note?: string;
}
export interface BOMRouteStep {
  step: number;
  process: string;
  resource: string;
  durationMin: number;
}
export interface BOMSuggestionOutput {
  type: 'bom-suggestion';
  workOrderId: string;
  productName: string;
  basedOnSimilar: string[];
  bom: BOMItem[];
  route: BOMRouteStep[];
  reasoning: string;
}

export function buildBOMSuggestion(input: { workOrderId?: string }): BOMSuggestionOutput {
  const id = input.workOrderId || 'WO-SAMPLE-2026-001';
  // 根据样品 ID 路由到不同模板
  if (id === 'WO-SAMPLE-2026-002') {
    return {
      type: 'bom-suggestion',
      workOrderId: id,
      productName: '0.18mm 白金双镀（样品）',
      basedOnSimilar: ['QA-0.18-标准镀锡', 'TIN-0.18mm 加厚'],
      bom: [
        { category: 'main', material: '裸铜杆',     spec: 'Φ8.0mm（含氧 ≤ 200ppm）', qty: 56, unit: 'kg' },
        { category: 'main', material: '镀锡液',     spec: 'Sn 99.9%',                 qty: 12, unit: 'kg' },
        { category: 'main', material: '镀铂底层液', spec: 'Pt 0.5g/L 镀液（新增）',    qty: 8,  unit: 'L', note: '需新增供应商' },
        { category: 'aux',  material: '拉丝油',     spec: 'SL-7',                     qty: 4,  unit: 'L' },
        { category: 'aux',  material: '回火气',     spec: 'N₂ 99.99%',                qty: 3,  unit: 'm³' },
      ],
      route: [
        { step: 1, process: '粗拉', resource: '大拉机 #2',  durationMin: 90 },
        { step: 2, process: '中拉', resource: '中拉机 #6',  durationMin: 75 },
        { step: 3, process: '退火 + 镀锡', resource: '镀锡线 #3', durationMin: 110 },
        { step: 4, process: '镀铂底层（新工序）', resource: '小试线', durationMin: 60, },
        { step: 5, process: '检验', resource: 'QC-2', durationMin: 30 },
      ],
      reasoning: '该样品要求白金双镀（铂+锡），目前产线无现成方案。BOM 草稿基于"先镀铂再镀锡"工艺路径，参考同径标准镀锡工单工艺参数。镀铂液需新增采购，建议与工艺部门确认厚度规格。',
    };
  }
  // 默认：粉色 QXY 漆包样品
  return {
    type: 'bom-suggestion',
    workOrderId: id,
    productName: 'QXY-0.06mm 粉色（新色样品）',
    basedOnSimilar: ['QXY-0.06mm 红色', 'QXY-0.08mm 红色'],
    bom: [
      { category: 'main', material: '裸铜杆',         spec: 'Φ8.0mm（含氧 ≤ 180ppm）', qty: 92, unit: 'kg' },
      { category: 'main', material: 'QXY 漆液',       spec: '聚酰胺-酰亚胺 · 粉色（专配）', qty: 24, unit: 'kg', note: '需调配' },
      { category: 'main', material: '色浆',           spec: '永固红 + 钛白 · 比例待定', qty: 1.2, unit: 'kg', note: '需打样比对' },
      { category: 'aux',  material: '拉丝油',         spec: 'SL-7', qty: 4, unit: 'L' },
      { category: 'aux',  material: '退火气',         spec: 'N₂ + H₂ 95/5', qty: 8, unit: 'm³' },
      { category: 'aux',  material: '清洁剂',         spec: '异丙醇 99.5%', qty: 3, unit: 'L' },
    ],
    route: [
      { step: 1, process: '粗拉',             resource: '大拉机 #1',  durationMin: 80 },
      { step: 2, process: '中拉',             resource: '中拉机 #4',  durationMin: 70 },
      { step: 3, process: '小拉至 0.06mm',    resource: '小拉机 #19', durationMin: 110 },
      { step: 4, process: '退火 + 涂漆（QXY 粉色 · 小试）', resource: '漆包机 #14', durationMin: 95 },
      { step: 5, process: '检验 + 色差比对',   resource: 'QC-1',       durationMin: 30 },
    ],
    reasoning: '该样品为 QXY 漆种新颜色。色浆需基于 QXY 红色配方调整，建议先做 50kg 小试验证色差与漆膜附着力，达标后再排量产工单。新颜色漆液库存为 0，需提前向漆液车间申请配制。',
  };
}

/* =========================================================================
 * Agent #9  workorder.anomaly-detector  ——  异常工单识别
 * ========================================================================= */
export interface WorkOrderAnomalyOutput {
  type: 'workorder-anomaly';
  summary: string;
  groups: Array<{
    kind: 'frequent-change' | 'long-idle';
    label: string;
    count: number;
    description: string;
  }>;
  runAt: string;
}

export const WORK_ORDER_ANOMALY_OUTPUT: WorkOrderAnomalyOutput = {
  type: 'workorder-anomaly',
  summary: '检测到 12 张工单状态异常',
  runAt: '2026-07-14 22:00 自动运行',
  groups: [
    {
      kind: 'frequent-change',
      label: '频繁变更（超 5 次）',
      count: 8,
      description: '该类工单数量/交期/优先级反复调整，可能反映客户需求不稳定或销售-计划沟通不顺',
    },
    {
      kind: 'long-idle',
      label: '长期未开工（超 30 天）',
      count: 4,
      description: '工单创建后长期未排产开工，可能因物料未到或客户暂缓',
    },
  ],
};

/* =========================================================================
 * Agent #10  material.shortage-root-cause  ——  缺料根因分析
 * ========================================================================= */
export interface ShortageRootCauseOutput {
  type: 'shortage-root-cause';
  workOrderId: string;
  customer: string;
  missingMaterial: string;
  factors: Array<{
    category: '上游因素' | '调度因素' | '采购因素' | '安全库存';
    detail: string;
    severity: 'high' | 'medium' | 'low';
  }>;
  recommendation: string;
  downstreamImpact: Array<{ workOrderId: string; product: string; delayHours: number }>;
}

export function buildShortageRootCause(input: { workOrderId?: string }): ShortageRootCauseOutput {
  const id = input.workOrderId || 'WO-2026-1240';
  // 简化：按 ID 选择 mock 模板
  if (id === 'WO-2026-1242') {
    return {
      type: 'shortage-root-cause',
      workOrderId: id,
      customer: '海尔智家',
      missingMaterial: 'QA 漆液 · 蓝色（80kg 缺口）',
      factors: [
        { category: '上游因素', detail: '上游 WO-2026-1238 工单延期 12 小时，预留漆液未及时释放', severity: 'high' },
        { category: '安全库存', detail: 'QA 蓝色漆液周转天数 0.8 天（建议 2 天）',                 severity: 'medium' },
      ],
      recommendation: '① 紧急协调上游 WO-2026-1238 释放 50kg 预留漆液；② 调高 QA 蓝色漆液安全库存至 2 天周转',
      downstreamImpact: [
        { workOrderId: 'WO-2026-1244', product: 'QA-0.3mm 蓝色', delayHours: 6 },
        { workOrderId: 'WO-2026-1247', product: 'QA-0.5mm 蓝色', delayHours: 10 },
      ],
    };
  }
  return {
    type: 'shortage-root-cause',
    workOrderId: id,
    customer: '华翔电机',
    missingMaterial: 'Φ8.0mm 铜杆 LB-2026-07-A（500kg 缺口）',
    factors: [
      { category: '采购因素', detail: '关联采购订单 PO-2026-201 因供应商质检不合格延期 3 天',     severity: 'high' },
      { category: '调度因素', detail: '上游 WO-2026-1239 工单延期 8 小时影响铜杆释放',           severity: 'medium' },
      { category: '安全库存', detail: 'LB-2026-07-A 批次安全库存设置 0.5 天（建议 1.5 天）',     severity: 'medium' },
    ],
    recommendation: '① 紧急联系供应商或启用替代批次 LB-2026-07-B；② 调整该料安全库存参数至 1.5 天；③ 关注上游 WO-2026-1239 进度',
    downstreamImpact: [
      { workOrderId: 'WO-2026-1259', product: 'QA-0.95mm 红色', delayHours: 14 },
      { workOrderId: 'WO-2026-1268', product: 'QA-0.5mm 红色',  delayHours: 8 },
      { workOrderId: 'WO-2026-1272', product: 'QA-0.71mm 红色', delayHours: 12 },
    ],
  };
}

/* =========================================================================
 * Agent #11  material.shortage-predictor  ——  齐套风险预测
 * ========================================================================= */
export interface ShortagePredictorOutput {
  type: 'shortage-predictor';
  summary: string;
  risks: Array<{
    workOrderId: string;
    customer: string;
    product: string;
    expectedShortDate: string;
    riskLevel: 'high' | 'medium' | 'low';
  }>;
  runAt: string;
}

export const SHORTAGE_PREDICTOR: ShortagePredictorOutput = {
  type: 'shortage-predictor',
  summary: '未来 3 天预计 8 张工单存在齐套风险',
  runAt: '2026-07-15 08:00 自动运行',
  risks: [
    { workOrderId: 'WO-2026-1240', customer: '华翔电机', product: 'QA-0.5mm 红色',  expectedShortDate: '2026-07-19', riskLevel: 'high' },
    { workOrderId: 'WO-2026-1242', customer: '海尔智家', product: 'QA-0.3mm 蓝色',  expectedShortDate: '2026-07-20', riskLevel: 'high' },
    { workOrderId: 'WO-2026-1248', customer: '比亚迪',   product: 'TIN-0.40mm',    expectedShortDate: '2026-07-18', riskLevel: 'high' },
    { workOrderId: 'WO-2026-1251', customer: '格力电器', product: 'QY-0.21mm 黑',  expectedShortDate: '2026-07-19', riskLevel: 'medium' },
    { workOrderId: 'WO-2026-1259', customer: '远东电缆', product: 'QA-0.95mm 红',  expectedShortDate: '2026-07-21', riskLevel: 'medium' },
    { workOrderId: 'WO-2026-1265', customer: '宝胜股份', product: 'QZ-0.51mm 蓝',  expectedShortDate: '2026-07-18', riskLevel: 'low' },
    { workOrderId: 'WO-2026-1271', customer: '正泰电器', product: 'QA-0.18mm 透',  expectedShortDate: '2026-07-17', riskLevel: 'low' },
    { workOrderId: 'WO-2026-1278', customer: '上海电气', product: 'QA-0.71mm 黄',  expectedShortDate: '2026-07-19', riskLevel: 'medium' },
  ],
};

/* =========================================================================
 * 注册表（Sprint 4 增量）
 * ========================================================================= */
export const SPRINT4_AGENT_RESPONSES: Record<string, unknown> = {
  'schedule-rule.matrix-generator':   () => buildMatrixDraft(),
  'schedule-rule.history-reviewer':   HISTORY_REVIEW,
  'constraint.implicit-miner':        IMPLICIT_CONSTRAINTS,
  'constraint.conflict-explainer':    (input: { workOrderId?: string }) => buildConflictExplain(input),
  'workorder.bom-generator':          (input: { workOrderId?: string }) => buildBOMSuggestion(input),
  'workorder.anomaly-detector':       WORK_ORDER_ANOMALY_OUTPUT,
  'material.shortage-root-cause':     (input: { workOrderId?: string }) => buildShortageRootCause(input),
  'material.shortage-predictor':      SHORTAGE_PREDICTOR,
};
