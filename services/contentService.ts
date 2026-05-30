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

/** 判断抓回来的文本是不是“垃圾/错误页”，而不是真正的网页正文。 */
function looksLikeGarbage(text: string): boolean {
  const t = text.trim();
  if (t.length < 120) return true;
  const head = t.slice(0, 400).toLowerCase();
  // jina 的使用说明/限流页、各类错误页特征
  const bad = [
    "[usage 1]", "your_url", "r.jina.ai/your_url",
    "rate limit", "too many requests", "402 payment",
    "page not found", "404 not found", "<title>404",
    "access denied", "are you a robot", "captcha",
    "enable javascript to", "checking your browser",
  ];
  if (bad.some((b) => head.includes(b))) return true;
  // 纯说明页通常没有任何中文/句子，且极短
  return false;
}

/** 把 HTML 粗清洗为可读文本，并附上图片直链。 */
function htmlToText(html: string): string {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6])\s*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
  const imgs = (html.match(IMG_RE) || []).join("\n");
  return imgs ? `${text}\n\n${imgs}` : text;
}

/** 通道① 直接 fetch 原网页（很多站点带 CORS，可直连，最快最准）。 */
async function fetchDirect(url: string, timeoutMs = 25000): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, mode: "cors", redirect: "follow" });
    if (!res.ok) throw new Error(`直连返回 ${res.status}`);
    const ctype = res.headers.get("content-type") || "";
    const body = await res.text();
    const text = /html/i.test(ctype) || /<\/?[a-z]/i.test(body.slice(0, 200)) ? htmlToText(body) : body;
    if (looksLikeGarbage(text)) throw new Error("直连内容无效");
    return text;
  } finally {
    clearTimeout(timer);
  }
}

/** 通道② r.jina.ai 抓正文（处理 JS 渲染页），并校验不是垃圾返回。 */
async function fetchPageText(url: string, timeoutMs = 45000): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, {
      signal: ctrl.signal,
      headers: { "X-Return-Format": "markdown", "Accept": "text/plain" },
    });
    if (!res.ok) throw new Error(`抓取返回 ${res.status}`);
    const text = await res.text();
    if (looksLikeGarbage(text)) throw new Error("jina 返回的是说明/错误页，非正文");
    return text;
  } finally {
    clearTimeout(timer);
  }
}

/** 通道③ allorigins 代理取原始 HTML 再清洗。 */
async function fetchViaProxy(url: string, timeoutMs = 30000): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`代理返回 ${res.status}`);
    const html = await res.text();
    const text = htmlToText(html);
    if (looksLikeGarbage(text)) throw new Error("代理内容无效");
    return text;
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
    onLog?.(`读取：${url}`);
    // 三通道依次尝试：直连 → jina → 代理；每个都会校验“不是垃圾/错误页”
    const channels: { name: string; fn: () => Promise<string> }[] = [
      { name: "直连", fn: () => fetchDirect(url) },
      { name: "正文服务", fn: () => fetchPageText(url) },
      { name: "代理", fn: () => fetchViaProxy(url) },
    ];
    let text = "";
    const errs: string[] = [];
    for (const ch of channels) {
      try {
        text = await ch.fn();
        if (text) { onLog?.(`✓ 已抓到正文（${ch.name}，${text.length} 字）`); break; }
      } catch (e) {
        errs.push(`${ch.name}:${e instanceof Error ? e.message : e}`);
        text = "";
      }
    }
    if (text) pages.push({ url, text });
    else { console.warn("全部通道失败：", url, errs); failed.push(url); }
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
