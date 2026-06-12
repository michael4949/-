import Anthropic from "@anthropic-ai/sdk";

/**
 * 标书工作流的大脑：Claude Fable 5（Anthropic 最强的公开模型）浏览器直连。
 *
 *  - 全部阶段统一使用 claude-fable-5，按任务用 output_config.effort 控制思考力度
 *    （解析/大纲/审查 high；批量撰写默认 medium，可选 high）。
 *  - Fable 5 思考永远开启：不传 thinking 参数；也不接受 temperature 等采样参数。
 *  - 全部调用走流式（单次长输出可能跑数分钟，非流式会超时），finalMessage() 收尾。
 *  - 结构化抽取用 output_config.format 的 JSON Schema 强约束。
 *  - 写作类调用把稳定共享上下文放进 system 并打 cache_control：几百次调用的
 *    输入大头按 0.1× 缓存价计费。
 *  - 429/5xx/网络错误按 2s/4s/8s/16s 退避重试（用 SDK 类型化异常判断）。
 */

export const BID_MODEL = "claude-fable-5";

const LS_KEY = "anthropic_api_key";

export function getStoredKey(): string {
  try { return localStorage.getItem(LS_KEY) || ""; } catch { return ""; }
}

export function setStoredKey(k: string): void {
  try {
    if (k.trim()) localStorage.setItem(LS_KEY, k.trim());
    else localStorage.removeItem(LS_KEY);
  } catch { /* ignore */ }
}

/** 构建期注入的密钥（本地 .env.local）。公开托管/独立 HTML 时为空，由用户在页面填入。 */
export function envKey(): string {
  return (process.env.ANTHROPIC_API_KEY || "") as string;
}

export function resolveKey(): string {
  return getStoredKey() || envKey();
}

function getClient(): Anthropic {
  const key = resolveKey();
  if (!key) {
    throw new Error("还没有设置 Anthropic API Key。请在首页填入你的密钥（console.anthropic.com → API Keys）。");
  }
  // 浏览器直连：密钥只存在用户本机，由用户自己持有与计费
  return new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true, maxRetries: 0 });
}

export type Effort = "low" | "medium" | "high";

export interface GenOptions {
  prompt: string;
  /** 稳定共享上下文（写作规范/项目信息/事实表）：放 system 并缓存，跨调用按 0.1× 计费 */
  system?: string;
  effort?: Effort;
  maxOutputTokens?: number; // 注意：Fable 5 的思考 token 也计入此上限，需留余量
  jsonSchema?: Record<string, unknown>;
  signal?: AbortSignal;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => { clearTimeout(t); reject(new DOMException("已取消", "AbortError")); }, { once: true });
  });
}

function isRetryable(e: unknown): boolean {
  if (e instanceof Anthropic.RateLimitError) return true;
  if (e instanceof Anthropic.InternalServerError) return true;
  if (e instanceof Anthropic.APIConnectionError) return true;
  return e instanceof Anthropic.APIError && typeof e.status === "number" && e.status >= 500;
}

function toFriendlyError(e: unknown): Error {
  if (e instanceof Anthropic.AuthenticationError) {
    return new Error("Anthropic API Key 无效或已失效，请检查（应以 sk-ant- 开头）。");
  }
  if (e instanceof Anthropic.RateLimitError) {
    return new Error("已达到 Anthropic 账户的速率限制（429）。可降低并发，或稍后用「继续生成」从断点续跑。");
  }
  if (e instanceof Anthropic.PermissionDeniedError) {
    return new Error("该 API Key 无权访问 claude-fable-5（403）。请确认账户已开通该模型并有余额。");
  }
  return e instanceof Error ? e : new Error(String(e));
}

export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException("已取消", "AbortError");
}

export async function genText(opts: GenOptions): Promise<string> {
  const client = getClient();
  const backoffs = [2000, 4000, 8000, 16000];

  const outputConfig: Record<string, unknown> = {};
  if (opts.effort) outputConfig.effort = opts.effort;
  if (opts.jsonSchema) outputConfig.format = { type: "json_schema", schema: opts.jsonSchema };

  const params = {
    model: BID_MODEL,
    max_tokens: opts.maxOutputTokens ?? 16000,
    ...(Object.keys(outputConfig).length ? { output_config: outputConfig } : {}),
    ...(opts.system
      ? { system: [{ type: "text" as const, text: opts.system, cache_control: { type: "ephemeral" as const } }] }
      : {}),
    messages: [{ role: "user" as const, content: opts.prompt }],
  };

  let lastErr: unknown;
  for (let attempt = 0; attempt <= backoffs.length; attempt++) {
    throwIfAborted(opts.signal);
    try {
      // 长输出必须流式，避免 HTTP 超时；Fable 5 单次请求可能思考+写作数分钟
      const stream = client.messages.stream(params as Parameters<typeof client.messages.stream>[0], { signal: opts.signal });
      const message = await stream.finalMessage();

      if (message.stop_reason === "refusal") {
        throw new Error("该请求被 Claude 安全策略拒绝（refusal）。请检查招标文件内容后重试，必要时删去无关的敏感段落。");
      }
      const text = message.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("")
        .trim();
      if (!text) throw new Error("模型返回为空");
      return text;
    } catch (e) {
      if (opts.signal?.aborted) throw new DOMException("已取消", "AbortError");
      lastErr = e;
      if (attempt < backoffs.length && isRetryable(e)) {
        await sleep(backoffs[attempt], opts.signal);
        continue;
      }
      throw toFriendlyError(e);
    }
  }
  throw toFriendlyError(lastErr);
}

/** 容错 JSON 解析（截取第一个 { 到最后一个 }；结构化输出下通常直接可解析） */
function parseJsonLoose<T>(text: string): T {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1)) as T;
    }
    throw new Error("模型返回的内容无法解析为 JSON。");
  }
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
