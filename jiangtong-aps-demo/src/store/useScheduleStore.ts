// §9 智能排产页状态
import { create } from 'zustand';
import type { Workshop, GanttView, ScheduleKPI, AlgorithmWeights } from '../types/schedule';
import { DEFAULT_WEIGHTS } from '../types/schedule';
import { INITIAL_KPI, GANTT_START } from '../mock/scheduleData';
import { WORK_ORDERS, PENDING_WOS } from '../mock/workOrders';
import type { WorkOrder } from '../types/workOrder';
import { PRODUCTS } from '../mock/products';
import type { InsertScheme, AnomalyOptimization, StrandingScheme, StrandingConfigOutput } from '../mock/agentResponses';

function overlap(a: { s: number; e: number }, b: { s: number; e: number }) {
  return !(a.e <= b.s || a.s >= b.e);
}

interface ScheduleState {
  workshop: Workshop;
  view: GanttView;
  weights: AlgorithmWeights;
  kpi: ScheduleKPI;
  pending: WorkOrder[];
  scheduled: WorkOrder[];
  selectedId: string | null;
  flashIds: string[];
  // ===== Sprint 2 新增 =====
  insertContext: { customer: string; product: string; quantity: number; dueDate: string; text: string } | null;
  // ===== v2.2.2 新增（真正系统联动） =====
  /** 已下发至 MES 的工单 ID（甘特图显示 🔒 锁标） */
  dispatchedIds: Set<string>;
  /** 排产模拟模式：开启时甘特图覆盖紫色 hatched 模拟层 */
  simulateMode: boolean;
  /** 演示约束冲突时标红闪烁的工单 ID */
  conflictHighlightIds: string[];
  /** 历史 KPI 序列（KPI 对比按钮用到）—— 每次重排/重算追加一条 */
  kpiHistory: Array<{ at: Date; label: string; otd: number; changeoverLoss: number; utilization: number; wipValue: number }>;
  // ===== actions =====
  setWorkshop: (w: Workshop) => void;
  setView: (v: GanttView) => void;
  setWeights: (w: Partial<AlgorithmWeights>) => void;
  applyWeights: () => Promise<void>;
  select: (id: string | null) => void;
  moveOrder: (id: string, newResourceId: string, newStartMs: number) => { ok: boolean; conflictWith?: string };
  schedulePending: (id: string, resourceId: string, startMs: number) => { ok: boolean; conflictWith?: string };
  unschedule: (id: string) => void;
  flash: (ids: string[], durationMs?: number) => void;
  setInsertContext: (text: string) => void;
  applyInsertScheme: (scheme: InsertScheme, customer: string, product: string, quantity: number) => string;
  applyAnomalyMerge: (a: AnomalyOptimization) => void;
  applyStrandingConfig: (workOrderId: string, scheme: StrandingScheme, output: StrandingConfigOutput) => void;
  aiFindBestSlot: (woId: string, preferResourceId: string) => { resourceId: string; startMs: number; resourceName: string } | null;
  // ===== v2.2.2 新增 actions =====
  /** 真正重新排产：算法重排一部分（≈ 20% 的 scheduled）+ 重算 KPI + 写历史 */
  reSchedule: () => Promise<{ moved: number; newKpi: ScheduleKPI }>;
  /** 下发计划：把所有 scheduled 标记为 dispatched */
  dispatchAll: () => number;
  /** 演示约束冲突：标红 + 闪烁某些工单 */
  triggerConflictDemo: (ids: string[]) => void;
  clearConflictHighlight: () => void;
  setSimulateMode: (v: boolean) => void;
  // ===== v2.2.4 #6 一键应用矩阵修正 =====
  /** 应用矩阵历史复盘建议：换型损失 -0.4pp + 触发 20% 工单微调 */
  applyMatrixCorrection: () => Promise<{ corrected: number; coLossBefore: number; coLossAfter: number }>;
  matrixCorrectionApplied: boolean;
}

function reCalcKPI(scheduled: WorkOrder[], baseKpi: ScheduleKPI): ScheduleKPI {
  const byRes = new Map<string, WorkOrder[]>();
  for (const w of scheduled) {
    if (!w.scheduledResourceId || !w.scheduledStart) continue;
    if (!byRes.has(w.scheduledResourceId)) byRes.set(w.scheduledResourceId, []);
    byRes.get(w.scheduledResourceId)!.push(w);
  }
  let changeovers = 0, totalSlots = 0;
  for (const arr of byRes.values()) {
    arr.sort((a, b) => a.scheduledStart!.getTime() - b.scheduledStart!.getTime());
    for (let i = 1; i < arr.length; i++) {
      totalSlots++;
      const pPrev = PRODUCTS.find((p) => p.code === arr[i - 1].productCode);
      const pCur  = PRODUCTS.find((p) => p.code === arr[i].productCode);
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
  insertContext: null,
  // v2.2.2 新增
  dispatchedIds: new Set<string>(),
  simulateMode: false,
  conflictHighlightIds: [],
  matrixCorrectionApplied: false,
  kpiHistory: [
    { at: new Date('2026-07-09T18:00:00'), label: '7/09', otd: 89.5, changeoverLoss: 13.8, utilization: 76.2, wipValue: 1_100_000 },
    { at: new Date('2026-07-10T18:00:00'), label: '7/10', otd: 90.1, changeoverLoss: 13.4, utilization: 76.8, wipValue: 1_120_000 },
    { at: new Date('2026-07-11T18:00:00'), label: '7/11', otd: 90.2, changeoverLoss: 13.1, utilization: 77.0, wipValue: 1_150_000 },
    { at: new Date('2026-07-12T18:00:00'), label: '7/12', otd: 90.7, changeoverLoss: 12.9, utilization: 77.5, wipValue: 1_180_000 },
    { at: new Date('2026-07-13T18:00:00'), label: '7/13', otd: 91.0, changeoverLoss: 12.8, utilization: 77.9, wipValue: 1_190_000 },
    { at: new Date('2026-07-14T18:00:00'), label: '7/14', otd: 91.2, changeoverLoss: 12.7, utilization: 78.1, wipValue: 1_200_000 },
    { at: new Date('2026-07-15T09:24:00'), label: '7/15', otd: INITIAL_KPI.otd, changeoverLoss: INITIAL_KPI.changeoverLoss, utilization: INITIAL_KPI.utilization, wipValue: INITIAL_KPI.wipValue },
  ],

  setWorkshop: (workshop) => set({ workshop }),
  setView: (view) => set({ view }),
  setWeights: (w) => set((s) => ({ weights: { ...s.weights, ...w } })),

  applyWeights: async () => {
    await new Promise((r) => setTimeout(r, 1200));
    const s = get();
    set({ kpi: reCalcKPI(s.scheduled, s.kpi) });
  },

  select: (id) => set({ selectedId: id }),

  flash: (ids, durationMs = 3000) => {
    set({ flashIds: ids });
    setTimeout(() => set((st) => ({ flashIds: st.flashIds.filter((x) => !ids.includes(x)) })), durationMs);
  },

  moveOrder: (id, newResourceId, newStartMs) => {
    const s = get();
    const target = s.scheduled.find((w) => w.id === id);
    if (!target?.scheduledStart || !target?.scheduledEnd) return { ok: false };
    const dur = target.scheduledEnd.getTime() - target.scheduledStart.getTime();
    const newEnd = newStartMs + dur;
    const sameRow = s.scheduled.filter((w) => w.id !== id && w.scheduledResourceId === newResourceId && w.scheduledStart && w.scheduledEnd);
    for (const o of sameRow) {
      if (overlap({ s: newStartMs, e: newEnd }, { s: o.scheduledStart!.getTime(), e: o.scheduledEnd!.getTime() }))
        return { ok: false, conflictWith: o.id };
    }
    const updated = s.scheduled.map((w) => w.id === id
      ? { ...w, scheduledResourceId: newResourceId, scheduledStart: new Date(newStartMs), scheduledEnd: new Date(newEnd) }
      : w);
    set({ scheduled: updated, kpi: reCalcKPI(updated, s.kpi) });
    get().flash([id], 1800);
    return { ok: true };
  },

  schedulePending: (id, resourceId, startMs) => {
    const s = get();
    const wo = s.pending.find((w) => w.id === id);
    if (!wo) return { ok: false };
    const durMs = (2 + Math.random() * 4) * 3_600_000;
    const newEnd = startMs + durMs;
    const sameRow = s.scheduled.filter((w) => w.scheduledResourceId === resourceId && w.scheduledStart && w.scheduledEnd);
    for (const o of sameRow) {
      if (overlap({ s: startMs, e: newEnd }, { s: o.scheduledStart!.getTime(), e: o.scheduledEnd!.getTime() }))
        return { ok: false, conflictWith: o.id };
    }
    const newWo: WorkOrder = {
      ...wo, status: 'scheduled', scheduledResourceId: resourceId,
      scheduledStart: new Date(startMs), scheduledEnd: new Date(newEnd),
    };
    const scheduled = [...s.scheduled, newWo];
    set({
      scheduled,
      pending: s.pending.filter((w) => w.id !== id),
      kpi: reCalcKPI(scheduled, s.kpi),
    });
    get().flash([id], 1800);
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

  /* ============ Sprint 2 ============ */

  setInsertContext: (text) => {
    // 只存原文 + 简单解析，方案数据由 Copilot 调用 mockAIInvoke 时通过 agentResponses 生成
    set({ insertContext: { customer: '华翔电机', product: 'QA-0.08mm 红色', quantity: 500, dueDate: '下周二 2026-07-21', text } });
  },

  applyInsertScheme: (scheme, customer, product, quantity) => {
    const s = get();
    // 1) 创建"急单"工单（紧急优先级），按方案 schemes 数据落位
    const id = `XW-${Date.now().toString().slice(-6)}`;
    const startMs = scheme.start.getTime();
    const endMs = startMs + scheme.durationMs;
    const resourceId = scheme.resourceIds[0];                  // 简化：方案 C 取首台，演示足够
    const dueDate = new Date('2026-07-21T18:00:00');
    const colorCode = '#EF4444';                               // 急单显眼红
    const newWo: WorkOrder = {
      id, productCode: 'QA-0.08-红色', productName: product,
      productCategory: 'enameled',
      quantity, dueDate, customer,
      priority: 'urgent', status: 'scheduled',
      routeId: 'P1',
      scheduledResourceId: resourceId,
      scheduledStart: new Date(startMs),
      scheduledEnd: new Date(endMs),
      colorCode,
    };
    // 2) 受影响工单：方案影响的若干工单顺序后推（仅闪烁演示，不真实推移；简化）
    const sameRow = s.scheduled
      .filter((w) => w.scheduledResourceId === resourceId && w.scheduledStart && w.scheduledStart.getTime() >= startMs)
      .sort((a, b) => a.scheduledStart!.getTime() - b.scheduledStart!.getTime())
      .slice(0, scheme.impact.affectedOrders);
    const offsetMs = scheme.durationMs;
    const updated = s.scheduled.map((w) => {
      if (!sameRow.includes(w)) return w;
      return { ...w, scheduledStart: new Date(w.scheduledStart!.getTime() + offsetMs),
                     scheduledEnd:   new Date(w.scheduledEnd!.getTime() + offsetMs) };
    });
    const finalScheduled = [...updated, newWo];
    const affectedIds = [id, ...sameRow.map((w) => w.id)];
    set({
      scheduled: finalScheduled,
      kpi: reCalcKPI(finalScheduled, s.kpi),
      selectedId: id,
    });
    // 高亮闪烁 3 秒（§6.2.1）
    get().flash(affectedIds, 3000);
    return id;
  },

  applyAnomalyMerge: (a) => {
    const s = get();
    // 3 张 QA-0.3mm 蓝色工单 → 合并到漆包机 #3 连续排
    // 数据池里的待排+已排都可能没刚好对应这 3 个 ID，简化：直接选 3 个 in-scheduled 同漆种工单
    const candidates = s.scheduled
      .filter((w) => w.productCategory === 'enameled' && w.scheduledResourceId !== a.resourceId)
      .slice(0, 3);
    if (candidates.length === 0) return;
    const baseStart = new Date('2026-07-15T14:00:00').getTime();
    let cursor = baseStart;
    const HR = 3_600_000;
    const updated = s.scheduled.map((w) => {
      const idx = candidates.findIndex((c) => c.id === w.id);
      if (idx < 0) return w;
      const dur = Math.max(2 * HR, (candidates[idx].scheduledEnd!.getTime() - candidates[idx].scheduledStart!.getTime()));
      const newW = {
        ...w,
        productName: a.affectedWorkOrders[idx]?.product ?? w.productName,
        scheduledResourceId: a.resourceId,
        scheduledStart: new Date(cursor),
        scheduledEnd: new Date(cursor + dur),
      };
      cursor += dur;
      return newW;
    });
    // 直接把 KPI 换型损失改为方案 KPI（§6.2.3 12.6→10.4）
    set({
      scheduled: updated,
      kpi: { ...s.kpi, changeoverLoss: a.kpiAfter },
      workshop: 'enameling',
    });
    get().flash(candidates.map((c) => c.id), 3000);
  },

  applyStrandingConfig: (workOrderId, scheme, output) => {
    const s = get();
    // 1) 若是待排池中的工单 → 取出排到绞线机；2) 若是新建（Copilot 路径）→ 直接生成
    const existing = s.pending.find((w) => w.id === workOrderId);
    // 选一台绞线机：R-ST-01 ~ R-ST-08
    const resourceId = 'R-ST-' + String(1 + Math.floor(Math.random() * 8)).padStart(2, '0');
    // 起始时间：基线日 14:00（落在甘特周视图内）
    const baseStart = new Date('2026-07-15T14:00:00').getTime();
    // 时长：按数量估算（500kg ≈ 4 小时）
    const HR = 3_600_000;
    const durMs = Math.max(2 * HR, Math.round((output.request.quantity / 500) * 4 * HR));
    // 找一段空档
    const sameRow = s.scheduled
      .filter((w) => w.scheduledResourceId === resourceId && w.scheduledStart && w.scheduledEnd)
      .sort((a, b) => a.scheduledStart!.getTime() - b.scheduledStart!.getTime());
    let start = baseStart;
    for (const o of sameRow) {
      if (start + durMs <= o.scheduledStart!.getTime()) break;
      if (start < o.scheduledEnd!.getTime()) start = o.scheduledEnd!.getTime() + 15 * 60_000;
    }
    const end = start + durMs;
    // 方案配色：A=紫推荐 / B=橙新拉 / C=青多源
    const color = scheme.id === 'A' ? '#7C3AED' : scheme.id === 'B' ? '#FF6B35' : '#0EA5E9';
    const newWo: WorkOrder = {
      id: workOrderId,
      productCode: 'STR-' + output.request.strandDiameter + 'x' + output.request.totalStrands + (output.request.plating === 'tin' ? '-TIN' : ''),
      productName: `${output.request.totalStrands} 股 ×Φ${output.request.strandDiameter}mm ${output.request.plating === 'tin' ? '镀锡' : output.request.plating === 'enameled' ? '漆包' : ''}铜绞线`,
      productCategory: 'stranded',
      quantity: output.request.quantity,
      dueDate: new Date(output.request.dueDate),
      customer: output.request.customer,
      priority: existing?.priority ?? 'important',
      status: 'scheduled',
      routeId: existing?.routeId ?? 'P3',
      scheduledResourceId: resourceId,
      scheduledStart: new Date(start),
      scheduledEnd: new Date(end),
      colorCode: color,
    };
    const scheduledNext = [...s.scheduled, newWo];
    set({
      scheduled: scheduledNext,
      pending: s.pending.filter((w) => w.id !== workOrderId),
      // 切到绞线车间以便用户看到刚排上去的工单
      workshop: 'stranding',
      selectedId: workOrderId,
      kpi: reCalcKPI(scheduledNext, s.kpi),
    });
    get().flash([workOrderId], 3000);
  },

  aiFindBestSlot: (woId, preferResourceId) => {
    const s = get();
    const wo = s.scheduled.find((w) => w.id === woId);
    if (!wo?.scheduledStart || !wo?.scheduledEnd) return null;
    const durMs = wo.scheduledEnd.getTime() - wo.scheduledStart.getTime();
    // 优先在原行向后扫；不行再换同车间相邻机台
    const resources = Array.from(new Set(s.scheduled
      .filter((w) => w.scheduledResourceId)
      .map((w) => w.scheduledResourceId!)))
      .filter((id) => id.startsWith(preferResourceId.slice(0, 4))); // 同车间
    // 先把首选机台放最前
    const sorted = [preferResourceId, ...resources.filter((r) => r !== preferResourceId)];
    for (const resId of sorted) {
      const row = s.scheduled.filter((w) => w.id !== woId && w.scheduledResourceId === resId).sort((a, b) => a.scheduledStart!.getTime() - b.scheduledStart!.getTime());
      let cursor = wo.scheduledStart.getTime();
      for (let i = 0; i < row.length; i++) {
        const next = row[i];
        if (cursor + durMs <= next.scheduledStart!.getTime()) {
          return { resourceId: resId, startMs: cursor, resourceName: resId };
        }
        cursor = next.scheduledEnd!.getTime() + 15 * 60 * 1000; // 15 min buffer
      }
      // 末尾
      return { resourceId: resId, startMs: cursor, resourceName: resId };
    }
    return null;
  },

  /* ============ v2.2.2 真正系统联动 actions ============ */

  // 真正重排：随机重排 ≈ 20% 的 scheduled（移到同车间另一台机或换时段）+ 重算 KPI + 写历史
  reSchedule: async () => {
    await new Promise((r) => setTimeout(r, 1200));
    const s = get();
    const reorderable = s.scheduled.filter((w) =>
      w.scheduledStart && w.scheduledStart.getTime() > Date.now() && !s.dispatchedIds.has(w.id),
    );
    // 选 20% 重排
    const targetCount = Math.max(8, Math.floor(reorderable.length * 0.2));
    const indices = new Set<number>();
    let n = 0;
    while (indices.size < targetCount && n < targetCount * 6) {
      indices.add(Math.floor(Math.random() * reorderable.length));
      n++;
    }
    const targets = [...indices].map((i) => reorderable[i]).filter(Boolean);
    const targetIds = new Set(targets.map((w) => w.id));

    // 同车间的资源池
    const byWorkshop = (resId: string | undefined) => {
      if (!resId) return [] as string[];
      if (resId.startsWith('R-EN')) return ['R-EN-01','R-EN-02','R-EN-04','R-EN-05','R-EN-06','R-EN-09','R-EN-10','R-EN-11','R-EN-12','R-EN-13'];
      if (resId.startsWith('R-DR')) return ['R-DR-01','R-DR-02','R-DR-03','R-DR-04','R-DR-05','R-DR-13','R-DR-14','R-DR-15','R-DR-16'];
      return ['R-ST-01','R-ST-02','R-ST-03','R-ST-04','R-ST-05','R-ST-06'];
    };
    const updated = s.scheduled.map((w) => {
      if (!targetIds.has(w.id) || !w.scheduledStart || !w.scheduledEnd) return w;
      const pool = byWorkshop(w.scheduledResourceId);
      const newResId = pool[Math.floor(Math.random() * pool.length)];
      // 时间也漂移 ±2 小时（落在合法时段内）
      const offset = Math.floor((Math.random() * 4 - 2)) * 60 * 60_000;
      return {
        ...w,
        scheduledResourceId: newResId,
        scheduledStart: new Date(w.scheduledStart.getTime() + offset),
        scheduledEnd:   new Date(w.scheduledEnd.getTime() + offset),
      };
    });
    const newKpi = reCalcKPI(updated, s.kpi);
    // 写 KPI 历史
    const histLast = s.kpiHistory[s.kpiHistory.length - 1];
    const newHist = [...s.kpiHistory];
    const at = new Date();
    if (histLast && Math.abs(at.getTime() - histLast.at.getTime()) < 60_000) {
      newHist[newHist.length - 1] = { at, label: histLast.label + '*', ...newKpi };
    } else {
      newHist.push({ at, label: `${at.getHours()}:${String(at.getMinutes()).padStart(2,'0')}`, ...newKpi });
    }
    set({
      scheduled: updated,
      kpi: newKpi,
      kpiHistory: newHist,
    });
    get().flash([...targetIds], 2500);
    return { moved: targets.length, newKpi };
  },

  dispatchAll: () => {
    const s = get();
    const targetIds = s.scheduled.filter((w) => !s.dispatchedIds.has(w.id)).map((w) => w.id);
    const next = new Set(s.dispatchedIds);
    targetIds.forEach((id) => next.add(id));
    set({ dispatchedIds: next });
    return targetIds.length;
  },

  triggerConflictDemo: (ids) => {
    set({ conflictHighlightIds: ids });
    get().flash(ids, 4500);
  },
  clearConflictHighlight: () => set({ conflictHighlightIds: [] }),

  setSimulateMode: (v) => set({ simulateMode: v }),

  // ★ v2.2.4 #6 一键应用矩阵修正：换型损失下降 0.4pp + KPI 写历史 + 部分工单闪烁
  applyMatrixCorrection: async () => {
    await new Promise((r) => setTimeout(r, 1000));
    const s = get();
    const coBefore = s.kpi.changeoverLoss;
    const coAfter = +Math.max(8, coBefore - 0.4).toFixed(1);
    // 选 30 张同漆种工单闪烁（模拟矩阵修正后被重新评分）
    const flashTargets = s.scheduled
      .filter((w) => w.productCategory === 'enameled' && w.scheduledStart && w.scheduledStart.getTime() > Date.now())
      .slice(0, 30)
      .map((w) => w.id);
    const newKpi: ScheduleKPI = {
      ...s.kpi,
      changeoverLoss: coAfter,
      otd: +(s.kpi.otd + 0.4).toFixed(1),
    };
    const at = new Date();
    set({
      matrixCorrectionApplied: true,
      kpi: newKpi,
      kpiHistory: [...s.kpiHistory, {
        at, label: `${at.getHours()}:${String(at.getMinutes()).padStart(2,'0')}*`, ...newKpi,
      }],
    });
    get().flash(flashTargets, 3000);
    return { corrected: flashTargets.length, coLossBefore: coBefore, coLossAfter: coAfter };
  },
}));

export { GANTT_START };
