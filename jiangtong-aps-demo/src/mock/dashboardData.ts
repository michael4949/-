// §8 工作台首页数据组装（KPI/Insight Card/待办/异常预警/产线状态）
//   Sprint 4 扩展：Insight Card 从 3 张 → 6 张（追加 #6 #9 #11）
import type { DashboardData } from '../types/dashboard';
import type { AIInsight } from '../types/ai';
import {
  PENDING_WOS, IN_PROGRESS_WOS, todayDeliveries, NOW,
} from './workOrders';
import { RESOURCES } from './productLines';
import { ANOMALY_STATS } from './workOrderAnomalies';
import { SHORTAGE_PREDICTOR } from './agentResponses.sprint4';

const td = todayDeliveries();
const urgentCount = PENDING_WOS.filter((w) => w.priority === 'urgent').length;

// §8.1 / §6.2 6 张 AI Insight Card（Sprint 0-3 原 3 张 + Sprint 4 新 3 张，Cap 6 张）
const insights: AIInsight[] = [
  // 原 Sprint 1-3 三张（保留）
  {
    id: 'ins-material',
    severity: 'warning',
    agentSource: 'mock.material-kit',
    message: '⚠️  3 张工单存在齐套风险，建议优先处理',
    primaryAction: { label: '查看', route: '/material-check' },
    dismissible: true,
    generatedAt: NOW,
  },
  {
    id: 'ins-anomaly',
    severity: 'info',
    agentSource: 'schedule.anomaly-observer',
    message: '✨  漆包车间排产可优化，预计节省 4.2 小时换型',
    primaryAction: { label: '查看方案', route: '/schedule' },
    dismissible: true,
    generatedAt: NOW,
  },
  {
    id: 'ins-loss',
    severity: 'warning',
    agentSource: 'cost.loss-diagnostic',
    message: '💰  工单 WO-2024-1234 实际损耗超 30 天均值 0.3%',
    primaryAction: { label: '启动诊断', route: '/cost' },
    dismissible: true,
    generatedAt: NOW,
  },
  // ===== Sprint 4 新增 =====
  {
    id: 'ins-wo-anomaly',
    severity: 'warning',
    agentSource: 'workorder.anomaly-detector',
    message: `🤖  检测到 ${ANOMALY_STATS.total} 张工单状态异常（${ANOMALY_STATS.frequentChange} 张频繁变更 / ${ANOMALY_STATS.longIdle} 张长期未开工）`,
    primaryAction: { label: '查看工单', route: '/work-orders' },
    dismissible: true,
    generatedAt: NOW,
  },
  {
    id: 'ins-shortage-predict',
    severity: 'warning',
    agentSource: 'material.shortage-predictor',
    message: `📦  ${SHORTAGE_PREDICTOR.summary}（${SHORTAGE_PREDICTOR.risks.filter((r) => r.riskLevel === 'high').length} 张高风险）`,
    primaryAction: { label: '查看清单', route: '/material-check' },
    dismissible: true,
    generatedAt: NOW,
  },
  {
    id: 'ins-matrix-history',
    severity: 'info',
    agentSource: 'schedule-rule.history-reviewer',
    message: '🔁  本周发现 5 处换型时间偏差超 20%，AI 建议修正矩阵',
    primaryAction: { label: '查看对比', route: '/schedule' },
    dismissible: true,
    generatedAt: NOW,
  },
];

const dashboard: DashboardData = {
  user: { name: '张工', role: '计划员' },
  context: {
    date: '2026-07-15',
    weekday: '周二',
    time: '09:24',
    workshop: '漆包车间',
    activeMachines: 38,
  },
  aiInsights: insights,
  kpis: [
    { id: 'k-pending',    icon: '📋', label: '待排工单',  value: String(PENDING_WOS.length), drilldownRoute: '/schedule' },
    { id: 'k-wip',        icon: '⚡', label: '在制',     value: String(IN_PROGRESS_WOS.length) },
    { id: 'k-delivery',   icon: '📦', label: '今日交付',  value: `${td.done}/${td.planned}` },
    { id: 'k-otd',        icon: '🎯', label: 'OTD',     value: '91.3%', delta: { direction: 'up', isGood: true, text: '↑ 1.2pp' }, drilldownRoute: '/schedule' },
    { id: 'k-co-loss',    icon: '⏱', label: '换型损失', value: '12.6%', delta: { direction: 'down', isGood: true, text: '↓ 0.8pp' }, drilldownRoute: '/schedule' },
    { id: 'k-util',       icon: '📊', label: '利用率',   value: '78.4%' },
    { id: 'k-cost',       icon: '💰', label: '日成本',   value: '¥2.85M' },
    { id: 'k-loss',       icon: '🔥', label: '铜耗损耗', value: '0.18%', delta: { direction: 'down', isGood: true, text: '↓ 0.02pp' }, drilldownRoute: '/cost' },
  ],
  todos: [
    { id: 't1', severity: 'urgent', label: '紧急工单',    count: Math.max(5, urgentCount), route: '/work-orders' },
    { id: 't2', severity: 'normal', label: '待确认变更',  count: 8, route: '/work-orders' },
    { id: 't3', severity: 'info',   label: '计划待下发',  count: 12, route: '/schedule' },
  ],
  alerts: [
    { id: 'a1', type: '缺料', count: 3 },
    { id: 'a2', type: '延期', count: 7 },
    { id: 'a3', type: '产能', count: 2 },
    { id: 'a4', type: '损耗', count: 1 },
  ],
  workshopStatus: (['enameling','drawing','stranding'] as const).map((ws) => {
    const lines = RESOURCES.filter((r) => r.workshop === ws);
    const total = lines.length;
    const active = ws === 'enameling' ? Math.round(total * 0.72)
                : ws === 'drawing'   ? Math.round(total * 0.82)
                : Math.round(total * 0.62);
    const wsName = ws === 'enameling' ? '漆包车间' : ws === 'drawing' ? '拉丝车间' : '绞线车间';
    return { workshop: wsName, totalLines: total, activeLines: active, percent: Math.round((active / total) * 100) };
  }),
};

export const DASHBOARD_DATA = dashboard;
