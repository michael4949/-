// §7.1 AI 统一类型
export type AITouchpoint = 'copilot' | 'card' | 'button' | 'inline-hint';

export type AgentId =
  | 'schedule.insert-assistant'
  | 'schedule.scheme-explainer'
  | 'schedule.anomaly-observer'
  | 'schedule.stranding-config-assistant'   // v2.1 新增 · 铜绞线配股助手
  | 'cost.loss-diagnostic'
  | 'cost.analysis-assistant'
  // ===== Sprint 4 新增 8 个 =====
  | 'schedule-rule.matrix-generator'        // #5 换型矩阵生成
  | 'schedule-rule.history-reviewer'        // #6 矩阵历史复盘
  | 'constraint.implicit-miner'             // #7 隐性约束挖掘
  | 'constraint.conflict-explainer'         // #18 约束冲突解释器
  | 'workorder.bom-generator'               // #8 样品工单 BOM
  | 'workorder.anomaly-detector'            // #9 异常工单识别
  | 'material.shortage-root-cause'          // #10 缺料根因
  | 'material.shortage-predictor'           // #11 齐套风险预测
  // ===== Sprint 5 新增 6 个 =====
  | 'inventory.conflict-mediator'           // #12 抢料冲突调解
  | 'inventory.health-monitor'              // #13 锁定健康度监测
  | 'capacity.bottleneck-predictor'         // #14 瓶颈预测
  | 'capacity.mitigation-generator'         // #15 缓解建议生成
  | 'gantt.natural-search'                  // #16 甘特图智能搜索
  | 'gantt.drag-suggestion';                // #17 拖拽建议

export interface AIInsight {
  id: string;
  severity: 'warning' | 'info' | 'success';
  agentSource: AgentId | string;
  message: string;
  primaryAction: { label: string; route: string };
  dismissible: boolean;
  generatedAt: Date;
}

export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  attachments?: Array<{
    type:
      | 'scheme'
      | 'workorder'
      | 'kpi'
      | 'chart'
      | 'cost-answer'
      | 'stranding-config'
      // Sprint 4 新增 attachment 类型
      | 'matrix-draft'
      | 'bom-draft'
      | 'shortage-root-cause'
      // Sprint 5 新增 attachment 类型
      | 'conflict-mediation'
      | 'mitigation-plan'
      | 'gantt-search';
    data: unknown;
  }>;
  timestamp: Date;
}

export interface GanttAIHint {
  id: string;
  resourceId: string;
  type: 'idle' | 'overload' | 'optimization' | 'conflict';
  message: string;
  actionLabel?: string;
  actionPayload?: unknown;
}
