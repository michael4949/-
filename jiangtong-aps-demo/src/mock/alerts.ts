// Sprint 6 · 异常预警事件列表
export type AlertType = '缺料' | '延期' | '产能' | '损耗' | '质量' | '设备';
export type AlertLevel = 'urgent' | 'important' | 'info';
export type AlertStatus = 'unhandled' | 'handling' | 'resolved' | 'ignored';

export interface AlertEvent {
  id: string;
  at: Date;
  type: AlertType;
  level: AlertLevel;
  title: string;
  source?: string;     // 关联工单/产线
  status: AlertStatus;
}

const NOW = new Date('2026-07-15T14:30:00');

function offsetMin(min: number): Date {
  return new Date(NOW.getTime() - min * 60_000);
}

export const ALERT_EVENTS: AlertEvent[] = [
  // 紧急 3 条
  { id: 'AL-001', at: offsetMin(7),   type: '缺料', level: 'urgent',    title: 'WO-2026-1240 铜杆 LB-2026-07-A 不足 0.5t',  source: 'WO-2026-1240', status: 'unhandled' },
  { id: 'AL-002', at: offsetMin(34),  type: '设备', level: 'urgent',    title: '漆包机 #3 涂漆头压力偏低（0.42MPa，标准 0.45+）', source: '漆包机 #3',   status: 'unhandled' },
  { id: 'AL-003', at: offsetMin(58),  type: '缺料', level: 'urgent',    title: 'WO-2026-1248 锡液 TIN-2607 已锁完',         source: 'WO-2026-1248', status: 'unhandled' },

  // 重要 12 条
  { id: 'AL-004', at: offsetMin(12),  type: '延期', level: 'important', title: 'WO-2026-1235 预计延期 1.5 天',              source: 'WO-2026-1235', status: 'unhandled' },
  { id: 'AL-005', at: offsetMin(45),  type: '产能', level: 'important', title: '漆包机 #8 未来 7 天负荷预测 95%',           source: '漆包机 #8',   status: 'unhandled' },
  { id: 'AL-006', at: offsetMin(72),  type: '延期', level: 'important', title: 'WO-2026-1268 上游工单延期影响开工',        source: 'WO-2026-1268', status: 'unhandled' },
  { id: 'AL-007', at: offsetMin(95),  type: '产能', level: 'important', title: '中拉机 #12 排队工单 12 张 / 38 吨',         source: '中拉机 #12', status: 'unhandled' },
  { id: 'AL-008', at: offsetMin(118), type: '缺料', level: 'important', title: 'QA 蓝色漆液周转 0.8 天（建议 ≥ 2 天）',     source: 'QA 蓝色漆液',  status: 'unhandled' },
  { id: 'AL-009', at: offsetMin(140), type: '质量', level: 'important', title: 'WO-2026-1221 客退批次抽检不合格率 1.8%',    source: 'WO-2026-1221', status: 'unhandled' },
  { id: 'AL-010', at: offsetMin(180), type: '延期', level: 'important', title: 'WO-2026-1255 模具 LM-0.5-08 寿命不足',     source: 'WO-2026-1255', status: 'unhandled' },
  { id: 'AL-011', at: offsetMin(220), type: '损耗', level: 'important', title: '漆包车间昨日损耗 0.22%（基线 0.18%）',     source: '漆包车间',    status: 'handling'  },
  { id: 'AL-012', at: offsetMin(245), type: '延期', level: 'important', title: 'WO-2026-1278 铜杆批次在途延期 1 天',       source: 'WO-2026-1278', status: 'handling'  },
  { id: 'AL-013', at: offsetMin(290), type: '设备', level: 'important', title: '中拉机 #14 振动传感器报警',                source: '中拉机 #14',  status: 'unhandled' },
  { id: 'AL-014', at: offsetMin(330), type: '产能', level: 'important', title: '绞线车间利用率周环比下降 6.2pp',           source: '绞线车间',    status: 'unhandled' },
  { id: 'AL-015', at: offsetMin(388), type: '质量', level: 'important', title: 'B 班组 0.5mm QY 工单返工率高于均值',       source: 'B 班组',     status: 'unhandled' },

  // 提示 3 条（也包含历史 noise 候选）
  { id: 'AL-016', at: offsetMin(88),  type: '损耗', level: 'info',      title: 'WO-2026-1230 损耗超基线 0.3pp',            source: 'WO-2026-1230', status: 'unhandled' },
  { id: 'AL-017', at: offsetMin(150), type: '设备', level: 'info',      title: '漆包机 #14 电耗周环比 +3.1%',              source: '漆包机 #14', status: 'unhandled' },
  { id: 'AL-018', at: offsetMin(420), type: '损耗', level: 'info',      title: '拉丝车间润滑油月消耗 +4.5%',                source: '拉丝车间',    status: 'unhandled' },

  // 本周已处理 / 已忽略（共 ~10 条，用于"本周已处理"计数）
  { id: 'AL-019', at: offsetMin(720),  type: '缺料', level: 'urgent',    title: 'WO-2026-1198 铜杆已紧急调拨',              source: 'WO-2026-1198', status: 'resolved' },
  { id: 'AL-020', at: offsetMin(1080), type: '延期', level: 'important', title: 'WO-2026-1180 已加急排产',                  source: 'WO-2026-1180', status: 'resolved' },
  { id: 'AL-021', at: offsetMin(1620), type: '损耗', level: 'info',      title: 'WO-2026-1175 损耗已恢复正常',              source: 'WO-2026-1175', status: 'resolved' },
  { id: 'AL-022', at: offsetMin(2100), type: '设备', level: 'info',      title: '漆包机 #5 已完成保养',                     source: '漆包机 #5',  status: 'resolved' },
  { id: 'AL-023', at: offsetMin(2640), type: '产能', level: 'info',      title: '#9 漆包机临时增加夜班已恢复',              source: '漆包机 #9',  status: 'resolved' },
  { id: 'AL-024', at: offsetMin(3180), type: '质量', level: 'info',      title: 'C 班组 0.3mm 工单返工已闭环',              source: 'C 班组',     status: 'resolved' },
];

export const ALERT_TYPE_COLOR: Record<AlertType, { tag: string; dot: string }> = {
  缺料: { tag: 'bg-warn/15 text-warn',    dot: 'bg-warn' },
  延期: { tag: 'bg-danger/15 text-danger', dot: 'bg-danger' },
  产能: { tag: 'bg-info/15 text-info',    dot: 'bg-info' },
  损耗: { tag: 'bg-ai/15 text-ai',        dot: 'bg-ai' },
  质量: { tag: 'bg-emerald-50 text-ok',   dot: 'bg-ok' },
  设备: { tag: 'bg-amber-50 text-amber-700', dot: 'bg-amber-700' },
};

export const ALERT_LEVEL_LABEL: Record<AlertLevel, string> = {
  urgent: '紧急',
  important: '重要',
  info: '提示',
};

export const ALERT_LEVEL_COLOR: Record<AlertLevel, string> = {
  urgent: 'text-danger',
  important: 'text-warn',
  info: 'text-info',
};

export const ALERT_STATUS_LABEL: Record<AlertStatus, string> = {
  unhandled: '未处理',
  handling:  '处理中',
  resolved:  '已处理',
  ignored:   '已忽略',
};

export const ALERT_KPI = {
  unhandled: ALERT_EVENTS.filter((a) => a.status === 'unhandled').length,
  urgent:    ALERT_EVENTS.filter((a) => a.level === 'urgent' && a.status === 'unhandled').length,
  important: ALERT_EVENTS.filter((a) => a.level === 'important' && a.status === 'unhandled').length,
  info:      ALERT_EVENTS.filter((a) => a.level === 'info' && a.status === 'unhandled').length,
  resolvedWeek: ALERT_EVENTS.filter((a) => a.status === 'resolved').length + 41, // mock + 已闭环历史
};
