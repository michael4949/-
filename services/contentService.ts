import { getClient, TEXT_MODEL, parseJsonLoose } from "./genai";
import { SourceMaterial, GroundingSource } from "../types";

const URL_RE = /https?:\/\/[^\s)]+/gi;

export function extractUrls(input: string): string[] {
  return Array.from(new Set(input.match(URL_RE) || []));
}

/**
 * 读取用户输入：
 *  - 若包含链接：用 Gemini 的 urlContext 工具完整读取网页正文，并follow页面内的关键子链接；
 *    再配合 googleSearch 补充背景。
 *  - 若是纯文字：直接结构化整理。
 * 返回结构化“原料”，绝不编造。
 */
export async function extractContent(
  input: string,
  onLog?: (msg: string) => void
): Promise<SourceMaterial> {
  const ai = getClient();
  const urls = extractUrls(input);

  const hasUrls = urls.length > 0;
  onLog?.(hasUrls ? `发现 ${urls.length} 个链接，正在完整读取网页内容…` : "正在整理你粘贴的文字内容…");

  const prompt = `你是一个严谨、细致的内容分析助手。请完整阅读下面用户提供的材料，提取**真实**信息，**绝不编造**。

${hasUrls
      ? `用户提供了网页链接。请使用 url 阅读能力**完整读取**这些页面的正文，并在合理范围内**顺着页面里的关键子链接**（例如文章正文里引用的链接、文档的子页面）继续读取，以获得完整背景。
需要读取的链接：
${urls.map((u) => `- ${u}`).join("\n")}

用户原文（可能还含有补充说明）：
"""${input.slice(0, 4000)}"""`
      : `用户直接粘贴了文字内容，请基于它来整理：
"""${input.slice(0, 12000)}"""`}

请输出**一个 JSON 对象**（仅 JSON，不要多余文字），字段如下：
{
  "title": "内容标题（中文，凝练）",
  "summary": "3-5 句话的中文摘要，说清这是什么、核心是什么",
  "keyPoints": ["8-15 条关键信息点（中文），尽量具体，包含数据/名称/亮点"],
  "fullText": "尽可能完整、有条理的中文正文整理（可以较长，保留关键事实与细节）",
  "links": [{"title":"子链接标题","uri":"你实际读取过的页内关键链接URL"}]
}`;

  const config: Record<string, unknown> = {};
  if (hasUrls) {
    // urlContext 让模型抓取链接正文；googleSearch 补充背景。两者均不允许 responseSchema。
    config.tools = [{ urlContext: {} }, { googleSearch: {} }];
  } else {
    config.temperature = 0.4;
  }

  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: prompt,
    config,
  });

  const text = response.text;
  if (!text) throw new Error("未能读取到内容，请检查链接是否可公开访问。");

  const parsed = parseJsonLoose<Partial<SourceMaterial>>(text);

  // 收集 grounding 来源
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const sources: GroundingSource[] = chunks
    .map((c) => (c.web ? { title: c.web.title || "网络来源", uri: c.web.uri || "#" } : null))
    .filter((s): s is GroundingSource => !!s);
  const uniqueSources = Array.from(new Map(sources.map((s) => [s.uri, s])).values());

  const material: SourceMaterial = {
    title: parsed.title?.trim() || "未命名内容",
    summary: parsed.summary?.trim() || "",
    keyPoints: (parsed.keyPoints || []).filter(Boolean),
    fullText: parsed.fullText?.trim() || input,
    links: (parsed.links || []).filter((l) => l && l.uri),
    sources: uniqueSources,
  };

  if (!material.summary && !material.keyPoints.length) {
    throw new Error("内容解析为空，可能是页面需要登录或为动态加载。可尝试直接粘贴正文。");
  }

  onLog?.(`已读取：《${material.title}》，提炼出 ${material.keyPoints.length} 个要点。`);
  return material;
}
