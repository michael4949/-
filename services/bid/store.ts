import { BidRunState } from "../../bidTypes";

/**
 * 任务断点存储（IndexedDB）：每写完一个小节就落盘，
 * 关页/断网/限流中断后回到页面可从断点继续，不浪费已生成内容。
 */

const DB_NAME = "bid-factory";
const STORE = "runs";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        t.oncomplete = () => db.close();
      })
  );
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pendingState: BidRunState | null = null;

/** 节流保存（800ms 合并一次写盘，避免高频小节完成时反复序列化） */
export function saveRunThrottled(state: BidRunState): void {
  pendingState = state;
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    const s = pendingState;
    pendingState = null;
    if (s) void saveRun(s);
  }, 800);
}

export async function saveRun(state: BidRunState): Promise<void> {
  state.updatedAt = Date.now();
  // structuredClone 去掉 React 状态里可能混入的不可序列化引用
  await tx("readwrite", (s) => s.put(structuredClone(state)));
}

export async function loadLatestRun(): Promise<BidRunState | null> {
  try {
    const all = await tx<BidRunState[]>("readonly", (s) => s.getAll() as IDBRequest<BidRunState[]>);
    const unfinished = (all || []).filter((r) => r.stage !== "done").sort((a, b) => b.updatedAt - a.updatedAt);
    return unfinished[0] || null;
  } catch {
    return null;
  }
}

export async function deleteRun(id: string): Promise<void> {
  try { await tx("readwrite", (s) => s.delete(id)); } catch { /* ignore */ }
}
