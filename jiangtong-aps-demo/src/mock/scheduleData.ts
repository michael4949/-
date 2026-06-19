// §9 排产数据：当前 KPI / 默认权重 / 时间轴常量
import type { ScheduleKPI } from '../types/schedule';

export const INITIAL_KPI: ScheduleKPI = {
  otd: 91.3,
  changeoverLoss: 12.6,
  utilization: 78.4,
  wipValue: 1_200_000,
};

// 甘特图时间窗口起点（基线日 08:00），未来 7 天 = 7 * 24 = 168 小时
import { NOW } from './workOrders';

export const GANTT_START = (() => {
  const d = new Date(NOW); d.setHours(8, 0, 0, 0);
  return d;
})();

export const GANTT_DAYS = 7;
export const HOUR_WIDTH_WEEK = 12;  // 周视图每小时 12px → 一天 288px → 7 天 2016px
export const HOUR_WIDTH_DAY = 50;   // 日视图每小时 50px
