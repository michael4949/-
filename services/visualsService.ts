import { VisualAsset, AspectRatio } from "../types";

/**
 * 抓取“网页真实画面”作为视频素材：
 *  1) 用 Microlink 对每个链接做整页/首屏截图，并提取页面的 og:image、正文图；
 *  2) 全部经 images.weserv.nl 代理，拿到带 CORS 头的图片，解码成 ImageBitmap，
 *     这样 canvas 才能 drawImage 且导出时不会被“污染”(tainted)。
 *
 * 任意一步失败都安全降级（该来源跳过），绝不阻断成片。
 */

const MICROLINK = "https://api.microlink.io/";
const WESERV = "https://images.weserv.nl/";

/** 经 weserv 代理，得到带 CORS 的图片地址；w 控制最大宽度，避免超大图。 */
function proxied(rawUrl: string, w = 1080): string {
  // weserv 要求去掉协议头并整体编码
  const noProto = rawUrl.replace(/^https?:\/\//i, "");
  return `${WESERV}?url=${encodeURIComponent(noProto)}&w=${w}&output=jpg&q=82`;
}

async function loadBitmap(url: string, timeoutMs = 25000): Promise<ImageBitmap | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, { signal: ctrl.signal, mode: "cors" });
    clearTimeout(timer);
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.size || !/^image\//.test(blob.type)) return null;
    return await createImageBitmap(blob);
  } catch {
    return null;
  }
}

function viewportFor(aspect: AspectRatio): { w: number; h: number } {
  if (aspect === "16:9") return { w: 1280, h: 720 };
  if (aspect === "1:1") return { w: 1000, h: 1000 };
  return { w: 412, h: 732 }; // 9:16 手机视口，截图更像“刷到的网页”
}

/** 向 Microlink 要一个链接的截图直链 + 页面图片。 */
async function microlinkOf(
  pageUrl: string,
  aspect: AspectRatio
): Promise<{ screenshot?: string; images: string[] }> {
  const vp = viewportFor(aspect);
  const q = new URLSearchParams({
    url: pageUrl,
    screenshot: "true",
    meta: "true",
    "viewport.width": String(vp.w),
    "viewport.height": String(vp.h),
    "viewport.deviceScaleFactor": "2",
  });
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30000);
    const res = await fetch(`${MICROLINK}?${q.toString()}`, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return { images: [] };
    const json = await res.json();
    const data = json?.data || {};
    const images: string[] = [];
    const og = data.image?.url || data.logo?.url;
    if (data.image?.url) images.push(data.image.url);
    if (data.logo?.url && data.logo.url !== data.image?.url) images.push(data.logo.url);
    void og;
    return { screenshot: data.screenshot?.url, images };
  } catch {
    return { images: [] };
  }
}

export interface CollectInput {
  pageUrls: string[];
  images: string[];     // 内容服务已抓到的页面图片
  aspect: AspectRatio;
  maxScreenshots?: number;
  maxImages?: number;
}

/**
 * 收集真实画面：优先网页截图，其次页面配图。返回已解码、可直接绘制的位图列表。
 */
export async function collectVisuals(
  input: CollectInput,
  onLog?: (msg: string) => void
): Promise<VisualAsset[]> {
  const { pageUrls, aspect } = input;
  const maxShots = input.maxScreenshots ?? 4;
  const maxImgs = input.maxImages ?? 6;

  const assets: VisualAsset[] = [];
  const seen = new Set<string>();

  // 1) 网页截图（最重要——这是“实拍”感的来源）
  const urls = pageUrls.slice(0, maxShots);
  const extraImages: string[] = [...input.images];
  if (urls.length) onLog?.(`正在截取 ${urls.length} 个网页的真实画面…`);

  const shotResults = await Promise.all(urls.map((u) => microlinkOf(u, aspect)));
  for (const r of shotResults) {
    if (r.screenshot && !seen.has(r.screenshot)) {
      seen.add(r.screenshot);
      const bmp = await loadBitmap(proxied(r.screenshot, 1080));
      if (bmp) {
        assets.push({ kind: "screenshot", url: r.screenshot, bitmap: bmp, w: bmp.width, h: bmp.height });
        onLog?.(`✓ 截到网页画面（${bmp.width}×${bmp.height}）`);
      }
    }
    for (const im of r.images) if (!extraImages.includes(im)) extraImages.push(im);
  }

  // 2) 页面配图（og:image / 正文图）
  const imgList = Array.from(new Set(extraImages)).filter((u) => /^https?:\/\//.test(u)).slice(0, maxImgs);
  if (imgList.length) onLog?.(`正在抓取页面里的 ${imgList.length} 张配图…`);
  for (const im of imgList) {
    if (seen.has(im)) continue;
    seen.add(im);
    const bmp = await loadBitmap(proxied(im, 1080));
    // 跳过过小的图标
    if (bmp && bmp.width >= 240 && bmp.height >= 160) {
      assets.push({ kind: "image", url: im, bitmap: bmp, w: bmp.width, h: bmp.height });
    }
  }

  onLog?.(`真实画面素材就绪：${assets.filter(a => a.kind === "screenshot").length} 张截图 + ${assets.filter(a => a.kind === "image").length} 张配图。`);
  return assets;
}

/**
 * 给每个场景分配一张真实画面：
 *  - hook / cta 优先用整页截图（信息量大、识别度高）；
 *  - body 轮流用配图，没有配图就退回截图；
 *  - 完全没有真实素材时返回 null（引擎回退到渐变背景）。
 */
export function assignVisualsToScenes(
  assets: VisualAsset[],
  sceneCount: number,
  roles: ("hook" | "body" | "cta")[]
): (VisualAsset | null)[] {
  const shots = assets.filter((a) => a.kind === "screenshot");
  const imgs = assets.filter((a) => a.kind === "image");
  if (!assets.length) return new Array(sceneCount).fill(null);

  const out: (VisualAsset | null)[] = [];
  let si = 0, ii = 0;
  for (let i = 0; i < sceneCount; i++) {
    const role = roles[i] || "body";
    let pick: VisualAsset | null = null;
    if (role === "hook" || role === "cta") {
      pick = shots[si % Math.max(1, shots.length)] || imgs[ii % Math.max(1, imgs.length)] || null;
      if (shots.length) si++;
    } else {
      // body：先用配图，轮完再用截图
      if (imgs.length) { pick = imgs[ii % imgs.length]; ii++; }
      else if (shots.length) { pick = shots[si % shots.length]; si++; }
    }
    out.push(pick || assets[i % assets.length] || null);
  }
  return out;
}
