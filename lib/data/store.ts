import { generateAll, type DataStore } from "./generator";

let _store: DataStore | null = null;
let _genStart = 0;
let _genDuration = 0;

// 全局单例，server 启动时初始化
export function getStore(): DataStore {
  if (!_store) {
    _genStart = Date.now();
    _store = generateAll();
    _genDuration = Date.now() - _genStart;
    if (typeof process !== "undefined") {
      console.log(`[CityAI] 数据生成完成: 用时 ${_genDuration} ms`);
    }
  }
  return _store;
}

export function getGenMeta() {
  return { generatedAtMs: _genStart, durationMs: _genDuration };
}

export function resetStore() {
  _store = null;
}
