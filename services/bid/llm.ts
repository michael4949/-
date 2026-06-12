import { Schema } from "@google/genai";
import { getClient, parseJsonLoose } from "../genai";

/**
 * 标书工作流的统一 Gemini 调用入口：
 *  - 海量正文撰写用 flash（快、限额高）；招标文件解析与大纲用 pro（更准）。
 *  - 429/5xx/网络错误自动按 2s/4s/8s/16s 退避重试；支持 AbortSignal 取消。
 */
export const BID_FAST_MODEL = "gemini-2.5-flash";
export const BID_SMART_MODEL = "gemini-2.5-pro";

export interface GenOptions {
  model: string;
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
  jsonSchema?: Schema;
  signal?: AbortSignal;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => { clearTimeout(t); reject(new DOMException("已取消", "AbortError")); }, { once: true });
  });
}

function isRetryable(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return /429|RESOURCE_EXHAUSTED|quota|rate|5\d\d|INTERNAL|UNAVAILABLE|timeout|network|fetch/i.test(msg);
}

export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException("已取消", "AbortError");
}

export async function genText(opts: GenOptions): Promise<string> {
  const ai = getClient();
  const backoffs = [2000, 4000, 8000, 16000];
  let lastErr: unknown;
  for (let attempt = 0; attempt <= backoffs.length; attempt++) {
    throwIfAborted(opts.signal);
    try {
      const response = await ai.models.generateContent({
        model: opts.model,
        contents: opts.prompt,
        config: {
          temperature: opts.temperature ?? 0.6,
          maxOutputTokens: opts.maxOutputTokens ?? 8192,
          abortSignal: opts.signal,
          // 2.5 系列的 maxOutputTokens 含思考 token：批量撰写（flash）关闭思考，
          // 输出预算全部留给正文，也更快更省；pro 保留默认思考以保证解析/大纲质量。
          ...(opts.model.includes("flash") ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
          ...(opts.jsonSchema
            ? { responseMimeType: "application/json", responseSchema: opts.jsonSchema }
            : {}),
        },
      });
      const text = (response.text || "").trim();
      if (!text) throw new Error("模型返回为空");
      return text;
    } catch (e) {
      if (opts.signal?.aborted) throw e;
      lastErr = e;
      if (attempt < backoffs.length && isRetryable(e)) {
        await sleep(backoffs[attempt], opts.signal);
        continue;
      }
      throw e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

export async function genJson<T>(opts: GenOptions): Promise<T> {
  const text = await genText(opts);
  return parseJsonLoose<T>(text);
}

/** 简单并发池：以固定并发度执行任务，任一任务抛错则整体快速失败 */
export async function runPool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>,
  signal?: AbortSignal
): Promise<void> {
  let next = 0;
  let failed: unknown = null;
  const lanes = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (next < items.length && !failed) {
      throwIfAborted(signal);
      const i = next++;
      try {
        await worker(items[i], i);
      } catch (e) {
        failed = e;
      }
    }
  });
  await Promise.all(lanes);
  if (failed) throw failed;
}
