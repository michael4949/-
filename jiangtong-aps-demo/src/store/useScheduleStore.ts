// §9 智能排产页状态：当前车间 / 视图 / 选中工单 / KPI / 权重 / 工单(全量+变更补丁)
import { create } from 'zustand';
import type { Workshop, GanttView, ScheduleKPI, AlgorithmWeights } from '../types/schedule';
import { DEFAULT_WEIGHTS } from '../types/schedule';
import { INITIAL_KPI, GANTT_START } from '../mock/scheduleData';
import { WORK_ORDERS, PENDING_WOS } from '../mock/workOrders';
import type { WorkOrder } from '../types/workOrder';
import { PRODUCTS } from '../mock/products';

// 一行内是否区间冲突（左闭右开）
function overlap(a: { s: number; e: number }, b: { s: number; e: number }) {
  return !(a.e <= b.s || a.s >= b.e);
}

interface ScheduleState {
  workshop: Workshop;
  view: GanttView;
  weights: AlgorithmWeights;
  kpi: ScheduleKPI;
  pending: WorkOrder[];
  scheduled: WorkOrder[]; // scheduled + in-progress
  selectedId: string | null;
  // 高亮闪烁（拖拽冲突 / 应用方案后）
  flashIds: string[];
  // actions
  setWorkshop: (w: Workshop) => void;
  setView: (v: GanttView) => void;
  setWeights: (w: Partial<AlgorithmWeights>) => void;
  applyWeights: () => Promise<void>; // mock 重排（1-1.5s）+ KPI 重算
  select: (id: string | null) => void;
  moveOrder: (id: string, newResourceId: string, newStartMs: number) => { ok: boolean; conflictWith?: string };
  schedulePending: (id: string, resourceId: string, startMs: number) => { ok: boolean; conflictWith?: string };
  unschedule: (id: string) => void;
}

function reCalcKPI(scheduled: WorkOrder[], baseKpi: ScheduleKPI): ScheduleKPI {
  // 简单 mock：换型损失 = 同机台相邻工单 sigKey 不同的次数 / 当日总工单 × 系数；其余微调
  const byRes = new Map<string, WorkOrder[]>();
  for (const w of scheduled) {
    if (!w.scheduledResourceId || !w.scheduledStart) continue;
    if (!byRes.has(w.scheduledResourceId)) byRes.set(w.scheduledResourceId, []);
    byRes.get(w.scheduledResourceId)!.push(w);
  }
  let changeovers = 0;
  let totalSlots = 0;
  for (const arr of byRes.values()) {
    arr.sort((a, b) => a.scheduledStart!.getTime() - b.scheduledStart!.getTime());
    for (let i = 1; i < arr.length; i++) {
      totalSlots++;
      const pPrev = PRODUCTS.find((p) => p.code === arr[i - 1].productCode);
      const pCur = PRODUCTS.find((p) => p.code === arr[i].productCode);
      if (pPrev && pCur && pPrev.sigKey !== pCur.sigKey) changeovers++;
    }
  }
  const changeoverLoss = totalSlots === 0 ? baseKpi.changeoverLoss : Math.max(2, (changeovers / Math.max(1, totalSlots)) * 20);
  return {
    ...baseKpi,
    changeoverLoss: +changeoverLoss.toFixed(1),
    utilization: +(baseKpi.utilization + (Math.random() * 1.6 - 0.8)).toFixed(1),
    otd: +(baseKpi.otd + (Math.random() * 0.8 - 0.4)).toFixed(1),
  };
}

const initScheduled = WORK_ORDERS.filter((w) => w.status === 'scheduled' || w.status === 'in-progress');

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  workshop: 'enameling',
  view: 'week',
  weights: { ...DEFAULT_WEIGHTS },
  kpi: { ...INITIAL_KPI },
  pending: [...PENDING_WOS],
  scheduled: [...initScheduled],
  selectedId: null,
  flashIds: [],

  setWorkshop: (workshop) => set({ workshop }),
  setView: (view) => set({ view }),
  setWeights: (w) => set((s) => ({ weights: { ...s.weights, ...w } })),

  applyWeights: async () => {
    await new Promise((r) => setTimeout(r, 1200));
    const s = get();
    set({ kpi: reCalcKPI(s.scheduled, s.kpi) });
  },

  select: (id) => set({ selectedId: id }),

  moveOrder: (id, newResourceId, newStartMs) => {
    const s = get();
    const target = s.scheduled.find((w) => w.id === id);
    if (!target?.scheduledStart || !target?.scheduledEnd) return { ok: false };
    const dur = target.scheduledEnd.getTime() - target.scheduledStart.getTime();
    const newEnd = newStartMs + dur;
    // 同行冲突检测
    const sameRow = s.scheduled.filter((w) => w.id !== id && w.scheduledResourceId === newResourceId && w.scheduledStart && w.scheduledEnd);
    for (const o of sameRow) {
      if (overlap(
        { s: newStartMs, e: newEnd },
        { s: o.scheduledStart!.getTime(), e: o.scheduledEnd!.getTime() },
      )) return { ok: false, conflictWith: o.id };
    }
    // 落位
    const updated = s.scheduled.map((w) => w.id === id
      ? { ...w, scheduledResourceId: newResourceId, scheduledStart: new Date(newStartMs), scheduledEnd: new Date(newEnd) }
      : w);
    set({ scheduled: updated, kpi: reCalcKPI(updated, s.kpi), flashIds: [id] });
    setTimeout(() => set((st) => ({ flashIds: st.flashIds.filter((x) => x !== id) })), 1800);
    return { ok: true };
  },

  schedulePending: (id, resourceId, startMs) => {
    const s = get();
    const wo = s.pending.find((w) => w.id === id);
    if (!wo) return { ok: false };
    // 估时长（按产品权重 + 速率）：简单按 3 小时
    const durMs = (2 + Math.random() * 4) * 3_600_000;
    const newEnd = startMs + durMs;
    const sameRow = s.scheduled.filter((w) => w.scheduledResourceId === resourceId && w.scheduledStart && w.scheduledEnd);
    for (const o of sameRow) {
      if (overlap(
        { s: startMs, e: newEnd },
        { s: o.scheduledStart!.getTime(), e: o.scheduledEnd!.getTime() },
      )) return { ok: false, conflictWith: o.id };
    }
    const scheduled = [...s.scheduled, {
      ...wo, status: 'scheduled' as const, scheduledResourceId: resourceId,
      scheduledStart: new Date(startMs), scheduledEnd: new Date(newEnd),
    }];
    set({
      scheduled,
      pending: s.pending.filter((w) => w.id !== id),
      flashIds: [id],
      kpi: reCalcKPI(scheduled, s.kpi),
    });
    setTimeout(() => set((st) => ({ flashIds: st.flashIds.filter((x) => x !== id) })), 1800);
    return { ok: true };
  },

  unschedule: (id) => {
    const s = get();
    const wo = s.scheduled.find((w) => w.id === id);
    if (!wo) return;
    set({
      scheduled: s.scheduled.filter((w) => w.id !== id),
      pending: [{ ...wo, status: 'pending', scheduledResourceId: undefined, scheduledStart: undefined, scheduledEnd: undefined }, ...s.pending],
    });
  },
}));

export { GANTT_START };
