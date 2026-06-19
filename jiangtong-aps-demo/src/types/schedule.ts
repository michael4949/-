import type { WorkOrder } from './workOrder';

// §7.1 排产相关类型
export type Workshop = 'enameling' | 'drawing' | 'stranding';

export interface Resource {
  id: string;
  name: string;                // "漆包机 #1"
  workshop: Workshop;
  workshopName: string;
  /** 当前在该机台上正在生产的产品规格（决定换型成本基础） */
  currentSpec?: string;
}

export interface ScheduledOrder extends WorkOrder {
  scheduledStart: Date;
  scheduledEnd: Date;
  scheduledResourceId: string;
}

export interface ScheduleKPI {
  otd: number;                 // 91.3
  changeoverLoss: number;      // 12.6 (%)
  utilization: number;         // 78.4 (%)
  wipValue: number;            // 1200000 (¥)
}

export interface AlgorithmWeights {
  otd: number;                 // 0-100
  minChangeover: number;
  utilization: number;
  minWIP: number;
}

export const DEFAULT_WEIGHTS: AlgorithmWeights = {
  otd: 30,
  minChangeover: 25,
  utilization: 25,
  minWIP: 20,
};

export const WORKSHOP_LABEL: Record<Workshop, string> = {
  enameling: '漆包车间',
  drawing: '拉丝车间',
  stranding: '绞线车间',
};

export type GanttView = 'week' | 'day';
