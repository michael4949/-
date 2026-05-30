import { GoogleGenAI } from "@google/genai";

/**
 * 统一的 Gemini 客户端工厂 + 模型常量。
 * Key 通过 vite.config.ts 注入到 process.env.API_KEY / GEMINI_API_KEY。
 */
export function getClient(): GoogleGenAI {
  const key = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error(
      "缺少 Gemini API Key。请在项目根目录创建 .env.local 并写入：GEMINI_API_KEY=你的密钥，然后重启 npm run dev。"
    );
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
