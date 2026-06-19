// §7.1 + §8.3 工作台数据契约
import type { AIInsight } from './ai';

export interface KPI {
  id: string;
  icon: string;                          // emoji
  label: string;
  value: string;
  delta?: { direction: 'up' | 'down' | 'flat'; isGood: boolean; text: string };
  drilldownRoute?: string;
  hint?: string;
}

export interface TodoItem {
  id: string;
  severity: 'urgent' | 'normal' | 'info'; // 红/黄/绿
  label: string;
  count: number;
  route?: string;
}

export interface AlertItem {
  id: string;
  type: '缺料' | '延期' | '产能' | '损耗';
  count: number;
}

export interface WorkshopLoad {
  workshop: '漆包车间' | '拉丝车间' | '绞线车间';
  totalLines: number;
  activeLines: number;
  percent: number;
}

export interface DashboardData {
  user: { name: string; role: string };
  context: { date: string; weekday: string; time: string; workshop: string; activeMachines: number };
  aiInsights: AIInsight[];
  kpis: KPI[];
  todos: TodoItem[];
  alerts: AlertItem[];
  workshopStatus: WorkshopLoad[];
}
