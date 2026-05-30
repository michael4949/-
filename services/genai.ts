import { GoogleGenAI } from "@google/genai";

/**
 * 统一的 Gemini 客户端工厂 + 模型常量 + API Key 管理。
 *
 * Key 来源优先级：
 *  1) 用户在网页里填写、保存在浏览器 localStorage 的密钥（公开托管时用这个，密钥不进代码）；
 *  2) 构建期通过 vite.config.ts 注入的 process.env（本地 .env.local 或 AI Studio 环境）。
 */
const LS_KEY = "gemini_api_key";

export function getStoredKey(): string {
  try { return localStorage.getItem(LS_KEY) || ""; } catch { return ""; }
}

export function setStoredKey(k: string): void {
  try {
    if (k.trim()) localStorage.setItem(LS_KEY, k.trim());
    else localStorage.removeItem(LS_KEY);
  } catch { /* ignore */ }
}

/** 构建期注入的密钥（本地开发 / AI Studio）。公开静态托管时通常为空。 */
export function envKey(): string {
  return (process.env.API_KEY || process.env.GEMINI_API_KEY || "") as string;
}

export function resolveKey(): string {
  return getStoredKey() || envKey();
}

export function hasKey(): boolean {
  return !!resolveKey();
}

export function getClient(): GoogleGenAI {
  const key = resolveKey();
  if (!key) {
    throw new Error("还没有设置 Gemini API Key。请在首页输入框上方填入你的密钥（免费获取：aistudio.google.com/apikey）。");
  }
  return new GoogleGenAI({ apiKey: key });
}

export const TEXT_MODEL = "gemini-2.5-flash";
// 中文配音（文本转语音）。如该预览模型不可用，可改为 "gemini-2.5-pro-preview-tts"。
export const TTS_MODEL = "gemini-2.5-flash-preview-tts";
export const IMAGE_MODEL = "imagen-3.0-generate-002";

/** 去掉模型有时会包裹的 ```json ``` 代码块。 */
export function stripCodeFences(text: string): string {
  return text.replace(/```json/gi, "").replace(/```/g, "").trim();
}

/** 把可能带噪声的文本解析为 JSON（容错：截取第一个 { 到最后一个 }）。 */
export function parseJsonLoose<T>(text: string): T {
  const cleaned = stripCodeFences(text);
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
