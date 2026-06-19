// Sprint 6 · 23 个 Agent 治理元数据（用于 /settings AI Agent 治理 Tab）
//   分类、触点、所属页、运行状态、今日触发次数、采纳率
export type AgentCategory = '对话式' | '观察式' | '解释器' | '生成器';

export interface AgentMeta {
  /** 1-23 */
  number: number;
  id: string;
  name: string;
  category: AgentCategory;
  touchpoint: string;
  page: string;
  status: 'active' | 'paused';
  /** 今日触发次数 */
  todayTriggers: number;
  /** 采纳率（0-1） */
  adoptionRate: number;
  /** 在哪个 Sprint 实现 */
  sprint: number;
}

export const AGENT_REGISTRY: AgentMeta[] = [
  // Sprint 2-3 已实现
  { number: 1,  id: 'schedule.insert-assistant',           name: '紧急插单助手',     category: '对话式', touchpoint: 'Copilot',    page: '/schedule',       status: 'active', todayTriggers: 7,  adoptionRate: 0.81, sprint: 2 },
  { number: 2,  id: 'schedule.scheme-explainer',           name: '排产方案解释器',   category: '解释器', touchpoint: '✨ Modal',   page: '/schedule',       status: 'active', todayTriggers: 4,  adoptionRate: 0.92, sprint: 2 },
  { number: 3,  id: 'schedule.anomaly-observer',           name: '异常排产识别',     category: '观察式', touchpoint: 'Insight + Inline', page: '/dashboard, /schedule', status: 'active', todayTriggers: 12, adoptionRate: 0.68, sprint: 2 },
  { number: 4,  id: 'schedule.stranding-config-assistant', name: '铜绞线配股助手',   category: '对话式', touchpoint: 'Copilot + ✨', page: '/schedule',     status: 'active', todayTriggers: 3,  adoptionRate: 0.83, sprint: 3 },
  { number: 21, id: 'cost.loss-diagnostic',                name: '损耗异常诊断',     category: '解释器', touchpoint: '✨ + Copilot', page: '/cost',         status: 'active', todayTriggers: 2,  adoptionRate: 0.85, sprint: 3 },
  { number: 22, id: 'cost.analysis-assistant',             name: '成本分析助手',     category: '对话式', touchpoint: 'Copilot',    page: '/cost',           status: 'active', todayTriggers: 6,  adoptionRate: 0.74, sprint: 3 },

  // Sprint 4 已实现
  { number: 5,  id: 'schedule-rule.matrix-generator',      name: '换型矩阵生成助手', category: '生成器', touchpoint: '✨ Modal',   page: '/schedule',       status: 'active', todayTriggers: 2,  adoptionRate: 0.65, sprint: 4 },
  { number: 6,  id: 'schedule-rule.history-reviewer',      name: '矩阵历史复盘',     category: '观察式', touchpoint: 'Insight',    page: '/dashboard, /schedule', status: 'active', todayTriggers: 1, adoptionRate: 0.70, sprint: 4 },
  { number: 7,  id: 'constraint.implicit-miner',           name: '隐性约束挖掘',     category: '观察式', touchpoint: 'AI 治理',    page: '/settings',       status: 'active', todayTriggers: 1,  adoptionRate: 0.62, sprint: 4 },
  { number: 8,  id: 'workorder.bom-generator',             name: '样品工单 BOM 生成', category: '生成器', touchpoint: '✨ Modal',   page: '/work-orders',    status: 'active', todayTriggers: 5,  adoptionRate: 0.78, sprint: 4 },
  { number: 9,  id: 'workorder.anomaly-detector',          name: '异常工单识别',     category: '观察式', touchpoint: 'Insight',    page: '/dashboard, /work-orders', status: 'active', todayTriggers: 4, adoptionRate: 0.66, sprint: 4 },
  { number: 10, id: 'material.shortage-root-cause',        name: '缺料根因分析',     category: '解释器', touchpoint: '✨ + Copilot', page: '/material-check', status: 'active', todayTriggers: 8, adoptionRate: 0.82, sprint: 4 },
  { number: 11, id: 'material.shortage-predictor',         name: '齐套风险预测',     category: '观察式', touchpoint: 'Insight',    page: '/dashboard, /material-check', status: 'active', todayTriggers: 1, adoptionRate: 0.71, sprint: 4 },
  { number: 18, id: 'constraint.conflict-explainer',       name: '约束冲突解释器',   category: '解释器', touchpoint: '自动 Modal', page: '/schedule',       status: 'active', todayTriggers: 3,  adoptionRate: 0.79, sprint: 4 },

  // Sprint 5 已实现
  { number: 12, id: 'inventory.conflict-mediator',         name: '抢料冲突调解',     category: '生成器', touchpoint: '✨ Modal',   page: '/inventory-lock', status: 'active', todayTriggers: 5,  adoptionRate: 0.77, sprint: 5 },
  { number: 13, id: 'inventory.health-monitor',            name: '锁定健康度监测',   category: '观察式', touchpoint: 'Insight',    page: '/inventory-lock', status: 'active', todayTriggers: 1,  adoptionRate: 0.64, sprint: 5 },
  { number: 14, id: 'capacity.bottleneck-predictor',       name: '瓶颈预测',         category: '观察式', touchpoint: 'Insight',    page: '/capacity',       status: 'active', todayTriggers: 1,  adoptionRate: 0.69, sprint: 5 },
  { number: 15, id: 'capacity.mitigation-generator',       name: '缓解建议生成',     category: '生成器', touchpoint: '✨ Modal',   page: '/capacity',       status: 'active', todayTriggers: 4,  adoptionRate: 0.71, sprint: 5 },
  { number: 16, id: 'gantt.natural-search',                name: '甘特图智能搜索',   category: '对话式', touchpoint: 'Copilot',    page: '/schedule',       status: 'active', todayTriggers: 9,  adoptionRate: 0.73, sprint: 5 },
  { number: 17, id: 'gantt.drag-suggestion',               name: '拖拽建议',         category: '生成器', touchpoint: '悬浮提示',   page: '/schedule',       status: 'active', todayTriggers: 21, adoptionRate: 0.58, sprint: 5 },

  // Sprint 6 新增
  { number: 19, id: 'alert.cause-explainer',               name: '预警归因 Agent',   category: '解释器', touchpoint: '✨ Modal',   page: '/alerts',         status: 'active', todayTriggers: 3,  adoptionRate: 0.84, sprint: 6 },
  { number: 20, id: 'alert.noise-filter',                  name: '预警噪声过滤',     category: '观察式', touchpoint: 'AI 治理',    page: '/settings',       status: 'active', todayTriggers: 1,  adoptionRate: 0.70, sprint: 6 },
  { number: 23, id: 'cost.cost-predictor',                 name: '成本预测',         category: '生成器', touchpoint: '✨ Modal',   page: '/cost, /schedule', status: 'active', todayTriggers: 6,  adoptionRate: 0.76, sprint: 6 },
];

// 按类别汇总（用于治理 Tab 顶部 4 张卡）
export interface CategoryStat {
  category: AgentCategory;
  total: number;
  active: number;
  todayTriggers: number;
  /** 加权平均采纳率 */
  avgAdoption: number;
}

export const CATEGORY_STATS: CategoryStat[] = (['对话式', '观察式', '解释器', '生成器'] as const).map((cat) => {
  const list = AGENT_REGISTRY.filter((a) => a.category === cat);
  const total = list.length;
  const active = list.filter((a) => a.status === 'active').length;
  const todayTriggers = list.reduce((s, a) => s + a.todayTriggers, 0);
  const totalTr = list.reduce((s, a) => s + a.todayTriggers, 0) || 1;
  const avgAdoption = list.reduce((s, a) => s + a.adoptionRate * a.todayTriggers, 0) / totalTr;
  return { category: cat, total, active, todayTriggers, avgAdoption };
});

// Agent 日志条目（mock 12 条）
export interface AgentLogEntry {
  at: Date;
  agentNumber: number;
  agentName: string;
  user: string;
  action: 'trigger' | 'adopt' | 'reject' | 'dismiss';
  result: string;
}

export const AGENT_LOGS: AgentLogEntry[] = [
  { at: new Date('2026-07-15T14:23:00'), agentNumber: 19, agentName: '预警归因 Agent',     user: '张工',   action: 'trigger', result: '为 WO-2026-1240 缺料预警生成归因报告' },
  { at: new Date('2026-07-15T13:45:00'), agentNumber: 1,  agentName: '紧急插单助手',       user: '张工',   action: 'adopt',   result: '采纳方案 B（华翔电机 500kg QA-0.08mm）' },
  { at: new Date('2026-07-15T12:30:00'), agentNumber: 12, agentName: '抢料冲突调解',       user: '李工',   action: 'adopt',   result: '采纳 CFL-001 分配方案（铜杆 LB-2026-07-A）' },
  { at: new Date('2026-07-15T11:50:00'), agentNumber: 23, agentName: '成本预测',           user: '王工',   action: 'trigger', result: '预测 WO-SAMPLE-2026-001 单位成本 ¥31,250/吨' },
  { at: new Date('2026-07-15T11:18:00'), agentNumber: 8,  agentName: '样品工单 BOM 生成',  user: '李工',   action: 'adopt',   result: 'BOM 草稿已保存，工艺部门复核中' },
  { at: new Date('2026-07-15T10:42:00'), agentNumber: 10, agentName: '缺料根因分析',       user: '张工',   action: 'trigger', result: '为 WO-2026-1240 生成 3 个根因因素 + 处置建议' },
  { at: new Date('2026-07-15T10:25:00'), agentNumber: 15, agentName: '缓解建议生成',       user: '赵工',   action: 'reject',  result: '驳回方案 C（推迟工单需销售确认）' },
  { at: new Date('2026-07-15T09:38:00'), agentNumber: 5,  agentName: '换型矩阵生成助手',   user: '张工',   action: 'adopt',   result: '应用矩阵草稿，5 处偏差已修正' },
  { at: new Date('2026-07-15T09:12:00'), agentNumber: 16, agentName: '甘特图智能搜索',     user: '张工',   action: 'trigger', result: '查询"未来 3 天可能延期的高优先级工单"，6 条匹配' },
  { at: new Date('2026-07-15T08:55:00'), agentNumber: 3,  agentName: '异常排产识别',       user: '张工',   action: 'adopt',   result: '采纳漆包机 #3 闲置优化建议' },
  { at: new Date('2026-07-15T08:30:00'), agentNumber: 21, agentName: '损耗异常诊断',       user: '王工',   action: 'trigger', result: '为 WO-2024-1234 启动损耗诊断' },
  { at: new Date('2026-07-15T08:10:00'), agentNumber: 11, agentName: '齐套风险预测',       user: '李工',   action: 'dismiss', result: '忽略今日齐套风险提示' },
];
