// Sprint 5 · 产能负荷分析数据（车间×14 天 热力图 + 瓶颈列表）
import { RESOURCES } from './productLines';
import type { Resource } from '../types/schedule';

export interface CapacityCell {
  resourceId: string;
  date: string;       // YYYY-MM-DD
  dayOffset: number;  // 0-13
  utilization: number; // 0-100 (%)
  level: 'green' | 'amber' | 'red' | 'idle'; // <70 / 70-90 / >90 / <40
}

const DAYS = 14;
const START_DATE = new Date('2026-07-15');

// 用确定性伪随机：基于 resourceIndex + dayOffset，生成 utilization
function hash(a: number, b: number): number {
  let h = (a * 2654435761 + b * 40503) >>> 0;
  h = ((h << 13) | (h >>> 19)) >>> 0;
  return (h % 1000) / 1000;
}

function buildHeatmap(): CapacityCell[] {
  const cells: CapacityCell[] = [];
  RESOURCES.forEach((r, ri) => {
    for (let day = 0; day < DAYS; day++) {
      const d = new Date(START_DATE.getTime() + day * 86_400_000);
      const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      // 基线：漆包 75-90 / 拉丝 60-80 / 绞线 50-70
      const base = r.workshop === 'enameling' ? 82 : r.workshop === 'drawing' ? 70 : 60;
      const noise = (hash(ri, day) - 0.5) * 40;
      // #8 漆包机连续 7 天 90-98（瓶颈）
      let util: number;
      if (r.id === 'R-EN-08' && day < 7) {
        util = 90 + Math.round(hash(ri, day) * 8);
      // #12 中拉机（R-DR-12）连续 3 天高负荷
      } else if (r.id === 'R-DR-12' && day >= 2 && day < 5) {
        util = 88 + Math.round(hash(ri, day) * 6);
      // 5 条空闲产线（#15-18 漆包 + #24 拉丝）
      } else if (['R-EN-15', 'R-EN-16', 'R-EN-17', 'R-EN-18', 'R-DR-24'].includes(r.id)) {
        util = 25 + Math.round(hash(ri, day) * 20);
      } else {
        util = Math.max(20, Math.min(98, Math.round(base + noise)));
      }
      const level: CapacityCell['level'] =
        util < 40 ? 'idle' :
        util < 70 ? 'green' :
        util < 90 ? 'amber' :
        'red';
      cells.push({ resourceId: r.id, date, dayOffset: day, utilization: util, level });
    }
  });
  return cells;
}

export const CAPACITY_HEATMAP: CapacityCell[] = buildHeatmap();

export function cellsOf(resourceId: string): CapacityCell[] {
  return CAPACITY_HEATMAP.filter((c) => c.resourceId === resourceId).sort((a, b) => a.dayOffset - b.dayOffset);
}

export function heatmapDates(): { dayOffset: number; date: string; label: string }[] {
  const result: { dayOffset: number; date: string; label: string }[] = [];
  for (let i = 0; i < DAYS; i++) {
    const d = new Date(START_DATE.getTime() + i * 86_400_000);
    result.push({
      dayOffset: i,
      date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      label: `${d.getMonth() + 1}/${d.getDate()}`,
    });
  }
  return result;
}

// ===== KPI 汇总 =====
export const CAPACITY_KPI = (() => {
  // 整体利用率：第 0 天所有产线的平均
  const day0Cells = CAPACITY_HEATMAP.filter((c) => c.dayOffset === 0);
  const overall = day0Cells.reduce((s, c) => s + c.utilization, 0) / day0Cells.length;
  // 瓶颈数：未来 7 天内连续超 90% >= 3 天的产线
  const bottlenecks = RESOURCES.filter((r) => {
    const cs = cellsOf(r.id).slice(0, 7);
    let streak = 0; let maxStreak = 0;
    for (const c of cs) {
      if (c.utilization >= 90) { streak++; maxStreak = Math.max(maxStreak, streak); }
      else streak = 0;
    }
    return maxStreak >= 3;
  });
  // 空闲产线：未来 7 天均值 < 40%
  const idle = RESOURCES.filter((r) => {
    const cs = cellsOf(r.id).slice(0, 7);
    return cs.reduce((s, c) => s + c.utilization, 0) / cs.length < 40;
  });
  // 过载产线：未来 7 天均值 > 88%
  const overloaded = RESOURCES.filter((r) => {
    const cs = cellsOf(r.id).slice(0, 7);
    return cs.reduce((s, c) => s + c.utilization, 0) / cs.length > 88;
  });
  return {
    overall: Math.round(overall * 10) / 10,
    bottleneckCount: bottlenecks.length,
    idleCount: idle.length,
    overloadedCount: overloaded.length,
    bottleneckResources: bottlenecks,
  };
})();

// ===== 瓶颈列表 =====
export interface Bottleneck {
  resourceId: string;
  resourceName: string;
  workshop: string;
  /** 严重度：1-3 */
  severity: 1 | 2 | 3;
  /** 连续过载天数 */
  durationDays: number;
  /** 影响工单数 */
  affectedOrders: number;
  /** 待排队总量（吨） */
  queuedTons: number;
  /** 预计开始延期日期 */
  expectedDelayFrom: string;
}

export const BOTTLENECKS: Bottleneck[] = [
  {
    resourceId: 'R-EN-08',
    resourceName: '漆包机 #8',
    workshop: '漆包车间',
    severity: 3,
    durationDays: 7,
    affectedOrders: 28,
    queuedTons: 142,
    expectedDelayFrom: '2026-07-17',
  },
  {
    resourceId: 'R-DR-12',
    resourceName: '中拉机 #12',
    workshop: '拉丝车间',
    severity: 2,
    durationDays: 3,
    affectedOrders: 12,
    queuedTons: 38,
    expectedDelayFrom: '2026-07-17',
  },
];

export function getResource(id: string): Resource | undefined {
  return RESOURCES.find((r) => r.id === id);
}
