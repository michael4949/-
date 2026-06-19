// Sprint 6 · 3 个新 Agent 预设响应
//   #19 alert.cause-explainer  预警归因
//   #20 alert.noise-filter     预警噪声过滤
//   #23 cost.cost-predictor    成本预测
import { ALERT_EVENTS, type AlertEvent } from './alerts';
import { WORK_ORDERS } from './workOrders';

/* =========================================================================
 * Agent #19  alert.cause-explainer  ——  预警归因
 * ========================================================================= */
export interface AlertCauseExplainOutput {
  type: 'alert-cause';
  alertId: string;
  alertTitle: string;
  alertType: string;
  causes: Array<{
    category: string;
    detail: string;
    severity: 'high' | 'medium' | 'low';
  }>;
  recommendations: string[];
  /** 复发模式：过去 30 天该类预警发生次数 */
  recurrence: { past30days: number; pattern: string };
}

const CAUSE_TEMPLATES: Record<string, Omit<AlertCauseExplainOutput, 'type' | 'alertId' | 'alertTitle' | 'alertType'>> = {
  缺料: {
    causes: [
      { category: '采购侧',   detail: '采购订单 PO-2026-201 因供应商质检不合格延期 3 天',     severity: 'high' },
      { category: '安全库存', detail: '该料安全库存设置过低（当前 0.5 天，建议 1.5 天）',   severity: 'medium' },
    ],
    recommendations: [
      '紧急联系供应商或启用替代供应商',
      '调整该料安全库存参数至 1.5 天',
      '关注上游 WO-2026-1239 进度，可释放部分预留批次',
    ],
    recurrence: { past30days: 8, pattern: '每周 1-2 次，集中在月中（采购批次到货前 3-5 天）' },
  },
  延期: {
    causes: [
      { category: '上游延期', detail: '上游 WO-2026-1238 工单延期 12 小时影响开工',           severity: 'high' },
      { category: '物料因素', detail: '关键物料 QA 蓝色漆液周转 0.8 天（建议 ≥ 2 天）',       severity: 'medium' },
    ],
    recommendations: [
      '协调上游工单加紧完工',
      '考虑临时切换替代漆液批次',
      '复核 OTD 算法权重，提升此类工单优先级',
    ],
    recurrence: { past30days: 12, pattern: '主要集中在交期前 24 小时内的工单链路' },
  },
  产能: {
    causes: [
      { category: '排产分布', detail: '本周 28 张 QA 工单集中排到 #8 漆包机，未充分分散到 #9/#11', severity: 'high' },
      { category: '换型成本', detail: '若分散到其他机台，换型成本 +90 分钟/次 × 12 次',         severity: 'medium' },
    ],
    recommendations: [
      '使用 Agent #15 生成缓解方案（迁移 12 张工单到 #9）',
      '考虑增加 #8 漆包机一个夜班（产能 +33%）',
      '复核换型矩阵，可能降低跨工单换型时间',
    ],
    recurrence: { past30days: 6, pattern: '#8 漆包机高负荷为持续性问题，建议长期产线均衡' },
  },
  损耗: {
    causes: [
      { category: '原料批次', detail: '本批次铜杆含氧量 215ppm（基线 180ppm）',               severity: 'high' },
      { category: '设备状态', detail: '漆包机 #3 第 2 涂漆头压力偏低（0.42MPa vs 标准 0.45+）', severity: 'medium' },
      { category: '操作班组', detail: 'B 班组（夜班）历史均值偏高 0.05pp',                     severity: 'low' },
    ],
    recommendations: [
      '对 LB-2024-09-A 批次铜杆进行复检',
      '安排漆包机 #3 涂漆头近期校准',
      '持续观察 B 班组损耗，必要时加强培训',
    ],
    recurrence: { past30days: 4, pattern: '损耗超标多与含氧量偏高的铜杆批次相关' },
  },
  设备: {
    causes: [
      { category: '保养周期', detail: '该设备距上次保养 850 小时（建议 720 小时）',           severity: 'high' },
      { category: '运行参数', detail: '近 24 小时压力/振动数据均处于标准上限附近',           severity: 'medium' },
    ],
    recommendations: [
      '安排即时停机检查涂漆头与轴承',
      '准备备件以缩短维修窗口',
      '考虑将该设备运行参数加入实时监控',
    ],
    recurrence: { past30days: 5, pattern: '类似故障在保养周期延长 > 100 小时时出现概率显著上升' },
  },
  质量: {
    causes: [
      { category: '抽检数据', detail: '近 7 天该班组返工率 3.2%（车间均值 1.5%）',           severity: 'high' },
      { category: '工艺参数', detail: '退火温度波动 ±8°C（标准 ±5°C）',                     severity: 'medium' },
    ],
    recommendations: [
      '复核退火炉温度控制系统',
      '加强班组工艺培训',
      '阶段性提升抽检频率',
    ],
    recurrence: { past30days: 3, pattern: '夜班质量问题高于日班约 60%' },
  },
};

export function buildAlertCauseExplain(input: { alertId: string }): AlertCauseExplainOutput {
  const alert = ALERT_EVENTS.find((a) => a.id === input.alertId) || ALERT_EVENTS[0];
  const tmpl = CAUSE_TEMPLATES[alert.type] || CAUSE_TEMPLATES['缺料'];
  return {
    type: 'alert-cause',
    alertId: alert.id,
    alertTitle: alert.title,
    alertType: alert.type,
    ...tmpl,
  };
}

/* =========================================================================
 * Agent #20  alert.noise-filter  ——  预警噪声过滤
 * ========================================================================= */
export interface NoiseFilterCandidate {
  id: string;
  alertType: string;
  exampleTitle: string;
  /** 过去 30 天该类预警发生次数 */
  past30count: number;
  /** 过去 30 天响应率（被处理 / 总数） */
  responseRate: number;
  suggestedAction: 'downgrade' | 'suppress' | 'merge';
  reasoning: string;
}

export interface NoiseFilterOutput {
  type: 'noise-filter';
  summary: string;
  candidates: NoiseFilterCandidate[];
  runAt: string;
}

export const NOISE_FILTER: NoiseFilterOutput = {
  type: 'noise-filter',
  summary: '基于过去 30 天预警响应数据分析，建议降级 / 抑制 8 条低价值预警',
  runAt: '2026-07-14 03:00 自动运行',
  candidates: [
    {
      id: 'NF-001',
      alertType: '设备',
      exampleTitle: '漆包机 #14 电耗周环比 +3.1%',
      past30count: 22,
      responseRate: 0.05,
      suggestedAction: 'downgrade',
      reasoning: '电耗轻微波动（< 5%）属于正常运行范围，过去 30 天 22 次告警仅 1 次被处理',
    },
    {
      id: 'NF-002',
      alertType: '损耗',
      exampleTitle: '拉丝车间润滑油月消耗 +4.5%',
      past30count: 8,
      responseRate: 0.13,
      suggestedAction: 'downgrade',
      reasoning: '润滑油消耗在 ±5% 内波动属正常，建议从"提示"降为"信息"',
    },
    {
      id: 'NF-003',
      alertType: '设备',
      exampleTitle: '中拉机振动传感器轻微报警（< 警戒线 80%）',
      past30count: 18,
      responseRate: 0.11,
      suggestedAction: 'merge',
      reasoning: '同一台机多次低水位振动告警建议合并为单日 1 条摘要',
    },
    {
      id: 'NF-004',
      alertType: '产能',
      exampleTitle: '#X 机利用率周环比下降 < 5pp',
      past30count: 15,
      responseRate: 0.06,
      suggestedAction: 'downgrade',
      reasoning: '利用率波动 5pp 内通常为订单结构变化所致，无需立即处置',
    },
    {
      id: 'NF-005',
      alertType: '损耗',
      exampleTitle: 'WO 单工单损耗超基线 0.1-0.2pp',
      past30count: 27,
      responseRate: 0.18,
      suggestedAction: 'downgrade',
      reasoning: '0.2pp 以内为单工单常规波动，建议提高基线阈值到 0.3pp',
    },
    {
      id: 'NF-006',
      alertType: '缺料',
      exampleTitle: '辅料库存低位预警（拉丝油 < 1000L）',
      past30count: 11,
      responseRate: 0.27,
      suggestedAction: 'merge',
      reasoning: '辅料安全库存预警建议合并为周报，不阻塞排产',
    },
    {
      id: 'NF-007',
      alertType: '质量',
      exampleTitle: '日抽检合格率 99.2% 低于 99.5%',
      past30count: 6,
      responseRate: 0.50,
      suggestedAction: 'downgrade',
      reasoning: '99% 以上合格率属于优秀范围，建议仅在 < 98% 时升级',
    },
    {
      id: 'NF-008',
      alertType: '延期',
      exampleTitle: '工单预计延期 < 2 小时',
      past30count: 14,
      responseRate: 0.21,
      suggestedAction: 'suppress',
      reasoning: '< 2 小时延期通常可在生产中自然吸收，无需人工干预',
    },
  ],
};

/* =========================================================================
 * Agent #23  cost.cost-predictor  ——  成本预测
 * ========================================================================= */
export interface CostPredictorOutput {
  type: 'cost-predict';
  workOrderId: string;
  productName: string;
  customer: string;
  quantity: number;
  prediction: {
    unitCostPerTon: number;       // ¥/吨
    grossMarginPct: number;       // 毛利率 %
    totalRevenue: number;         // 总收入（元）
    totalCost: number;            // 总成本（元）
  };
  components: Array<{ name: string; value: number; pct: number; color: string }>;
  factors: Array<{ key: string; value: string; note?: string }>;
  /** 敏感性分析 */
  sensitivity: Array<{ factor: string; impact: string; isPositive: boolean }>;
}

export function buildCostPredictor(input: { workOrderId?: string }): CostPredictorOutput {
  const id = input.workOrderId || 'WO-2026-1234';
  const wo = WORK_ORDERS.find((w) => w.id === id);
  // 主基准：QA-0.5mm 红色 单位成本 ¥31,250/吨
  const unitCost = wo?.productCategory === 'stranded' ? 33_800
                : wo?.productCategory === 'tinned' ? 32_500
                : wo?.productCategory === 'enameled' ? 31_250
                : 30_800;
  const quantity = wo?.quantity ?? 500;
  const totalCost = Math.round(unitCost * (quantity / 1000));
  const margin = wo?.productCategory === 'stranded' ? 10.5
              : wo?.productCategory === 'tinned' ? 11.4
              : 12.3;
  const totalRevenue = Math.round(totalCost / (1 - margin / 100));

  return {
    type: 'cost-predict',
    workOrderId: id,
    productName: wo?.productName ?? 'QA-0.5mm 红色',
    customer: wo?.customer ?? '华翔电机',
    quantity,
    prediction: {
      unitCostPerTon: unitCost,
      grossMarginPct: margin,
      totalRevenue,
      totalCost,
    },
    components: [
      { name: '直接铜材', value: Math.round(unitCost * 0.764 * quantity / 1000), pct: 76.4, color: '#FF6B35' },
      { name: '能源',     value: Math.round(unitCost * 0.081 * quantity / 1000), pct: 8.1,  color: '#3B82F6' },
      { name: '漆耗+辅料', value: Math.round(unitCost * 0.068 * quantity / 1000), pct: 6.8, color: '#7C3AED' },
      { name: '人工',     value: Math.round(unitCost * 0.063 * quantity / 1000), pct: 6.3,  color: '#10B981' },
      { name: '制造费用', value: Math.round(unitCost * 0.024 * quantity / 1000), pct: 2.4,  color: '#9CA3AF' },
    ],
    factors: [
      { key: '当前铜价',     value: '¥70,200/吨',           note: 'LME 2026-07-15 收盘' },
      { key: '加工费定额',   value: '¥6,800/吨',            note: '该规格基准' },
      { key: '损耗率预估',   value: '0.18%',                note: '基于历史 30 天均值' },
      { key: '关联批次',     value: 'LB-2026-07-B 铜杆',    note: '含氧 ≤ 180ppm' },
      { key: '工艺路径',     value: 'P1 漆包',              note: '5 步：粗拉 → 中拉 → 小拉 → 涂漆 → 检验' },
    ],
    sensitivity: [
      { factor: '铜价每涨 1%',         impact: '单位成本 +0.8% / 毛利率 -0.7pp', isPositive: false },
      { factor: '损耗率从 0.18% → 0.30%', impact: '单位成本 +0.4% / 毛利率 -0.35pp', isPositive: false },
      { factor: '能源单价 -2%',        impact: '单位成本 -0.16% / 毛利率 +0.14pp', isPositive: true  },
      { factor: '良品率 +1pp',         impact: '单位成本 -1.0% / 毛利率 +0.88pp', isPositive: true  },
    ],
  };
}

/* =========================================================================
 * 注册表（Sprint 6 增量）
 * ========================================================================= */
export const SPRINT6_AGENT_RESPONSES: Record<string, unknown> = {
  'alert.cause-explainer': (input: { alertId: string }) => buildAlertCauseExplain(input),
  'alert.noise-filter':    NOISE_FILTER,
  'cost.cost-predictor':   (input: { workOrderId?: string }) => buildCostPredictor(input),
};
