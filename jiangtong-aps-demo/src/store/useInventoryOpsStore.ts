// v2.2.2 · 库存锁定 AI 操作状态
//   - resolvedConflicts: 已应用 AI 调解方案的冲突 ID
//   - releasedLockIds: 因调解被释放/转移的锁定记录 ID
import { create } from 'zustand';

interface InventoryOpsState {
  resolvedConflicts: Set<string>;
  releasedLockIds: Set<string>;
  applyMediation: (conflictId: string, releasedWoIds: string[]) => void;
}

export const useInventoryOpsStore = create<InventoryOpsState>((set) => ({
  resolvedConflicts: new Set(),
  releasedLockIds: new Set(),
  applyMediation: (conflictId, releasedWoIds) => set((s) => {
    const conflicts = new Set(s.resolvedConflicts); conflicts.add(conflictId);
    const releases = new Set(s.releasedLockIds);
    releasedWoIds.forEach((id) => releases.add(id));
    return { resolvedConflicts: conflicts, releasedLockIds: releases };
  }),
}));
