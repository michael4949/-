// v2.2.2 · 库存锁定 AI 操作状态
//   - resolvedConflicts: 已应用 AI 调解方案的冲突 ID
//   - releasedLockIds: 因调解被释放/转移的锁定记录 ID
//   ★ v2.2.3：锁定健康度监测改为可交互
//   - unlockedOverdueIds: AI 已释放的超期锁定（"超期未开工"KPI -1/笔）
//   - refreshedFlappingIds: AI 已稳定的频繁解锁记录（不再 flapping）
import { create } from 'zustand';

interface InventoryOpsState {
  resolvedConflicts: Set<string>;
  releasedLockIds: Set<string>;
  unlockedOverdueIds: Set<string>;
  refreshedFlappingIds: Set<string>;
  applyMediation: (conflictId: string, releasedWoIds: string[]) => void;
  unlockOverdue: (lockId: string) => void;
  refreshFlapping: (lockId: string) => void;
  /** 批量释放所有超期 */
  batchUnlockOverdue: (lockIds: string[]) => void;
  /** 批量稳定所有 flapping */
  batchRefreshFlapping: (lockIds: string[]) => void;
}

export const useInventoryOpsStore = create<InventoryOpsState>((set) => ({
  resolvedConflicts: new Set(),
  releasedLockIds: new Set(),
  unlockedOverdueIds: new Set(),
  refreshedFlappingIds: new Set(),
  applyMediation: (conflictId, releasedWoIds) => set((s) => {
    const conflicts = new Set(s.resolvedConflicts); conflicts.add(conflictId);
    const releases = new Set(s.releasedLockIds);
    releasedWoIds.forEach((id) => releases.add(id));
    return { resolvedConflicts: conflicts, releasedLockIds: releases };
  }),
  unlockOverdue: (lockId) => set((s) => {
    const next = new Set(s.unlockedOverdueIds); next.add(lockId);
    return { unlockedOverdueIds: next };
  }),
  refreshFlapping: (lockId) => set((s) => {
    const next = new Set(s.refreshedFlappingIds); next.add(lockId);
    return { refreshedFlappingIds: next };
  }),
  batchUnlockOverdue: (lockIds) => set((s) => {
    const next = new Set(s.unlockedOverdueIds);
    lockIds.forEach((id) => next.add(id));
    return { unlockedOverdueIds: next };
  }),
  batchRefreshFlapping: (lockIds) => set((s) => {
    const next = new Set(s.refreshedFlappingIds);
    lockIds.forEach((id) => next.add(id));
    return { refreshedFlappingIds: next };
  }),
}));
