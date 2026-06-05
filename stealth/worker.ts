/// <reference lib="webworker" />
/**
 * 把隐身配比智能体放进 Web Worker：DE 全局寻优要算几千次多层反射损耗，
 * 在主线程会卡住界面，这里后台计算、算完回传，UI 全程保持流畅。
 */
import { runAgent } from "./core/agent";
import type { DesignRequirement } from "./core/types";

self.onmessage = (e: MessageEvent<DesignRequirement>) => {
  try {
    const result = runAgent(e.data);
    (self as unknown as Worker).postMessage({ ok: true, result });
  } catch (err) {
    (self as unknown as Worker).postMessage({ ok: false, error: String(err) });
  }
};
