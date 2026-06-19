// §7.1 AI 统一类型
export type AITouchpoint = 'copilot' | 'card' | 'button' | 'inline-hint';

export type AgentId =
  | 'schedule.insert-assistant'
  | 'schedule.scheme-explainer'
  | 'schedule.anomaly-observer'
  | 'schedule.stranding-config-assistant'   // v2.1 新增 · 铜绞线配股助手
  | 'cost.loss-diagnostic'
  | 'cost.analysis-assistant';

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
  attachments?: Array<{ type: 'scheme' | 'workorder' | 'kpi' | 'chart' | 'cost-answer' | 'stranding-config'; data: unknown }>;
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
