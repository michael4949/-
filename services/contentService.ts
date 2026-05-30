import { Type, Schema } from "@google/genai";
import { getClient, TEXT_MODEL, parseJsonLoose } from "./genai";
import { SourceMaterial, GroundingSource } from "../types";

const URL_RE = /https?:\/\/[^\s)]+/gi;

export function extractUrls(input: string): string[] {
  return Array.from(new Set(input.match(URL_RE) || []));
}

const materialSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "内容标题（中文，凝练）" },
    summary: { type: Type.STRING, description: "3-5 句话中文摘要" },
    keyPoints: { type: Type.ARRAY, items: { type: Type.STRING }, description: "8-15 条中文关键信息点" },
    fullText: { type: Type.STRING, description: "有条理的中文正文整理" },
    images: { type: Type.ARRAY, items: { type: Type.STRING }, description: "页面真实配图的 http 直链" },
  },
  required: ["title", "summary", "keyPoints", "fullText"],
};

const IMG_RE = /https?:\/\/[^\s)"'\]]+\.(?:png|jpe?g|webp|gif|avif)(?:\?[^\s)"'\]]*)?/gi;

/** 用 r.jina.ai 直接抓取网页正文（Markdown）。可靠、带 CORS、能处理 JS 渲染页。 */
async function fetchPageText(url: string, timeoutMs = 45000): Promise<string> {
  const target = `https://r.jina.ai/${url}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(target, {
      signal: ctrl.signal,
      headers: { "X-Return-Format": "markdown" },
    });
    if (!res.ok) throw new Error(`抓取返回 ${res.status}`);
    const text = await res.text();
    if (!text || text.trim().length < 80) throw new Error("正文过短");
    return text;
  } finally {
    clearTimeout(timer);
  }
}

/** 备用：经 allorigins 取原始 HTML，再粗清洗为文本。 */
async function fetchViaProxy(url: string, timeoutMs = 30000): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`代理返回 ${res.status}`);
    const html = await res.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (text.length < 80) throw new Error("正文过短");
    // 顺带从原始 HTML 里抠图片
    const imgs = (html.match(IMG_RE) || []).join("\n");
    return `${text}\n\n${imgs}`;
  } finally {
    clearTimeout(timer);
  }
}

/** 把抓到的纯文本用 JSON 模式结构化（有 schema → JSON 必合法）。 */
async function structure(rawText: string, hintUrl?: string): Promise<Partial<SourceMaterial>> {
  const ai = getClient();
  const prompt = `下面是从${hintUrl ? `网页(${hintUrl})` : "用户输入"}抓取到的真实内容。请把它整理成结构化字段。**只基于给定内容，不要编造**。用简体中文。
内容：
"""${rawText.slice(0, 16000)}"""`;
  try {
    const res = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: { responseMimeType: "application/json", responseSchema: materialSchema, temperature: 0.3 },
    });
    return parseJsonLoose<Partial<SourceMaterial>>(res.text || "{}");
  } catch (e) {
    console.warn("结构化失败，使用降级整理：", e);
    const lines = rawText.split(/\n+/).map((l) => l.replace(/^[#\-*\d.>\s]+/, "").trim()).filter((l) => l.length > 1);
    return {
      title: lines[0]?.slice(0, 40) || "未命名内容",
      summary: lines.slice(1, 4).join(" ").slice(0, 200),
      keyPoints: lines.slice(1, 14),
      fullText: rawText.slice(0, 8000),
      images: [],
    };
  }
}

/** 纯文字输入（无链接）时，直接用 Gemini 结构化。 */
async function structurePlainText(input: string): Promise<Partial<SourceMaterial>> {
  return structure(input);
}

/**
 * 读取用户输入 → 结构化“原料”。
 *  - 有链接：用 r.jina.ai（失败再用代理）抓**真实网页正文**，再结构化。
 *    所有链接都抓不到 → 明确报错，绝不拿“打不开”当内容硬生成。
 *  - 纯文字：直接结构化。
 */
export async function extractContent(
  input: string,
  onLog?: (msg: string) => void
): Promise<SourceMaterial> {
  const urls = extractUrls(input);
  const hasUrls = urls.length > 0;

  // —— 纯文字 ——
  if (!hasUrls) {
    onLog?.("正在整理你粘贴的文字内容…");
    const parsed = await structurePlainText(input);
    const material = finalize(parsed, input, [], []);
    if (!material.summary && !material.keyPoints.length) {
      throw new Error("内容为空，请粘贴更完整的文字或换一个链接。");
    }
    onLog?.(`已整理：《${material.title}》，提炼出 ${material.keyPoints.length} 个要点。`);
    return material;
  }

  // —— 有链接：逐个真实抓取 ——
  onLog?.(`发现 ${urls.length} 个链接，正在抓取网页正文…`);
  const pages: { url: string; text: string }[] = [];
  const failed: string[] = [];
  for (const url of urls.slice(0, 4)) {
    let text = "";
    try {
      onLog?.(`读取：${url}`);
      text = await fetchPageText(url);
    } catch (e1) {
      try {
        onLog?.(`主通道失败，尝试备用通道：${url}`);
        text = await fetchViaProxy(url);
      } catch (e2) {
        console.warn("两条通道都失败：", url, e1, e2);
        failed.push(url);
        continue;
      }
    }
    pages.push({ url, text });
    onLog?.(`✓ 已抓到正文（${text.length} 字）`);
  }

  // 关键：一个都没抓到 → 明确报错，不硬生成
  if (!pages.length) {
    throw new Error(
      `无法读取该网页内容（${failed.join("、")}）。可能是需要登录、有反爬限制或地区限制。\n建议：换一个公开可访问的链接，或直接把正文复制粘贴进来。`
    );
  }

  const combined = pages.map((p) => `# 来源：${p.url}\n${p.text}`).join("\n\n---\n\n");
  onLog?.("正在结构化整理抓到的正文…");
  const parsed = await structure(combined, pages[0].url);

  // 图片：结构化产出 + 从抓到的原文里正则补充
  const rawImgs = (combined.match(IMG_RE) || []);
  const parsedImgs = ((parsed as { images?: string[] }).images || []).filter((u) => /^https?:\/\//.test(u));

  const material = finalize(parsed, combined, urls, [...parsedImgs, ...rawImgs]);
  if (failed.length) onLog?.(`（注意：${failed.length} 个链接没读到，已用成功读取的内容）`);
  onLog?.(`已读取：《${material.title}》，提炼出 ${material.keyPoints.length} 个要点，待截图网页 ${material.pageUrls.length} 个。`);
  return material;
}

function finalize(
  parsed: Partial<SourceMaterial>,
  fallbackText: string,
  pageUrls: string[],
  images: string[]
): SourceMaterial {
  // 过滤掉明显是图标/像素图的小图（无法判断尺寸，先按常见关键词剔除）
  const cleanImgs = Array.from(new Set(images))
    .filter((u) => /^https?:\/\//.test(u))
    .filter((u) => !/sprite|icon|logo-?\d|favicon|1x1|pixel|avatar|emoji/i.test(u));
  return {
    title: parsed.title?.trim() || "未命名内容",
    summary: parsed.summary?.trim() || "",
    keyPoints: (parsed.keyPoints || []).filter(Boolean),
    fullText: parsed.fullText?.trim() || fallbackText.slice(0, 8000),
    links: [],
    sources: pageUrls.map((u) => ({ title: u, uri: u } as GroundingSource)),
    pageUrls: Array.from(new Set(pageUrls)).slice(0, 5),
    images: cleanImgs.slice(0, 10),
  };
}
