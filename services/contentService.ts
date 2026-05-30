import { Type, Schema } from "@google/genai";
import { getClient, TEXT_MODEL, parseJsonLoose } from "./genai";
import { SourceMaterial, GroundingSource } from "../types";

const URL_RE = /https?:\/\/[^\s)]+/gi;

export function extractUrls(input: string): string[] {
  return Array.from(new Set(input.match(URL_RE) || []));
}

// 结构化“原料”的 JSON Schema —— 仅在第二步（无工具）使用，保证 JSON 一定合法。
const materialSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "内容标题（中文，凝练）" },
    summary: { type: Type.STRING, description: "3-5 句话中文摘要" },
    keyPoints: { type: Type.ARRAY, items: { type: Type.STRING }, description: "8-15 条中文关键信息点" },
    fullText: { type: Type.STRING, description: "有条理的中文正文整理" },
    links: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: { title: { type: Type.STRING }, uri: { type: Type.STRING } },
        required: ["uri"],
      },
    },
    images: { type: Type.ARRAY, items: { type: Type.STRING }, description: "页面真实配图的 http 直链" },
  },
  required: ["title", "summary", "keyPoints", "fullText"],
};

/** 第一步：带工具读取网页 / 整理文字，输出**纯文本/Markdown**（不要求 JSON，避免解析失败）。 */
async function readRaw(
  input: string,
  urls: string[],
  onLog?: (msg: string) => void
): Promise<{ rawText: string; sources: GroundingSource[]; images: string[] }> {
  const ai = getClient();
  const hasUrls = urls.length > 0;

  const prompt = hasUrls
    ? `请使用网页阅读能力**完整读取**下面的链接正文，并在合理范围内顺着页面里的关键子链接继续读，以获得完整背景。**只陈述页面里的真实信息，绝不编造。**

需要读取的链接：
${urls.map((u) => `- ${u}`).join("\n")}

用户补充说明（如有）：
"""${input.slice(0, 3000)}"""

请用**中文**、以清晰的**纯文本/Markdown**输出（不要输出 JSON）：
1. 标题
2. 一段摘要
3. 关键信息点（尽量多、具体，带数据/名称）
4. 正文要点整理
5. 如果正文里有图片，请在最后用「图片：<完整URL>」逐行列出你看到的真实配图直链。`
    : `请把下面用户粘贴的文字整理成清晰的**中文**纯文本/Markdown（标题、摘要、关键信息点、正文要点）。只基于原文，不要编造，不要输出 JSON：
"""${input.slice(0, 12000)}"""`;

  const config: Record<string, unknown> = {};
  if (hasUrls) {
    // 工具模式：不能用 responseSchema，所以这一步只取纯文本。
    config.tools = [{ urlContext: {} }, { googleSearch: {} }];
  } else {
    config.temperature = 0.4;
  }

  const response = await ai.models.generateContent({ model: TEXT_MODEL, contents: prompt, config });
  const rawText = response.text || "";
  if (!rawText.trim()) {
    throw new Error("未能读取到内容，可能是页面需要登录或为动态加载。可尝试直接粘贴正文。");
  }

  // grounding 来源
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const sources: GroundingSource[] = chunks
    .map((c) => (c.web ? { title: c.web.title || "网络来源", uri: c.web.uri || "#" } : null))
    .filter((s): s is GroundingSource => !!s);
  const uniqueSources = Array.from(new Map(sources.map((s) => [s.uri, s])).values());

  // 从纯文本里直接捞图片直链（「图片：URL」或裸 URL）
  const imgMatches = rawText.match(/https?:\/\/[^\s)"']+\.(?:png|jpe?g|webp|gif|avif)(?:\?[^\s)"']*)?/gi) || [];

  onLog?.(hasUrls ? "网页已读取，正在结构化整理…" : "文字已读取，正在结构化整理…");
  return { rawText, sources: uniqueSources, images: Array.from(new Set(imgMatches)) };
}

/** 第二步：把纯文本**用 JSON 模式**结构化（有 schema，JSON 必然合法）。 */
async function structure(rawText: string): Promise<Partial<SourceMaterial>> {
  const ai = getClient();
  const prompt = `把下面这段已读取好的内容，整理成结构化字段。**只基于给定内容，不要编造**。用简体中文。
内容：
"""${rawText.slice(0, 14000)}"""`;
  try {
    const res = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: { responseMimeType: "application/json", responseSchema: materialSchema, temperature: 0.3 },
    });
    return parseJsonLoose<Partial<SourceMaterial>>(res.text || "{}");
  } catch (e) {
    // 兜底：即便结构化失败，也用纯文本拼出最低可用的“原料”，绝不让整条流程崩。
    console.warn("结构化失败，使用降级整理：", e);
    const lines = rawText.split(/\n+/).map((l) => l.replace(/^[#\-*\d.\s]+/, "").trim()).filter(Boolean);
    return {
      title: lines[0]?.slice(0, 40) || "未命名内容",
      summary: lines.slice(1, 4).join(" ").slice(0, 200),
      keyPoints: lines.slice(1, 14),
      fullText: rawText,
      links: [],
      images: [],
    };
  }
}

/**
 * 读取用户输入 → 结构化“原料”。两步走，杜绝“工具模式下 JSON 解析失败”。
 */
export async function extractContent(
  input: string,
  onLog?: (msg: string) => void
): Promise<SourceMaterial> {
  const urls = extractUrls(input);
  const hasUrls = urls.length > 0;
  onLog?.(hasUrls ? `发现 ${urls.length} 个链接，正在完整读取网页内容…` : "正在整理你粘贴的文字内容…");

  const { rawText, sources, images: rawImages } = await readRaw(input, urls, onLog);
  const parsed = await structure(rawText);

  const groundingUrls = sources.map((s) => s.uri).filter((u) => /^https?:\/\//.test(u));
  const parsedImages = ((parsed as { images?: string[] }).images || []).filter((u) => /^https?:\/\//.test(u));
  const allImages = Array.from(new Set([...parsedImages, ...rawImages])).filter((u) => /^https?:\/\//.test(u));

  const material: SourceMaterial = {
    title: parsed.title?.trim() || "未命名内容",
    summary: parsed.summary?.trim() || "",
    keyPoints: (parsed.keyPoints || []).filter(Boolean),
    fullText: parsed.fullText?.trim() || rawText,
    links: (parsed.links || []).filter((l) => l && l.uri),
    sources,
    // 截图目标：优先用户原始链接；没有则退而用 grounding 里出现的页面
    pageUrls: Array.from(new Set([...urls, ...(urls.length ? [] : groundingUrls)])).slice(0, 5),
    images: allImages.slice(0, 8),
  };

  if (!material.summary && !material.keyPoints.length && !material.fullText.trim()) {
    throw new Error("内容解析为空，可能是页面需要登录或为动态加载。可尝试直接粘贴正文。");
  }

  onLog?.(`已读取：《${material.title}》，提炼出 ${material.keyPoints.length} 个要点${material.pageUrls.length ? `，待截图网页 ${material.pageUrls.length} 个` : ""}。`);
  return material;
}
