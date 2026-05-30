import { getClient, IMAGE_MODEL } from "./genai";
import { Scene, AspectRatio } from "../types";

/** 把 AI 生成的图片解码为 ImageBitmap，供 canvas 绘制。失败返回 null（回退到渐变背景）。 */
async function bytesToBitmap(b64: string): Promise<ImageBitmap | null> {
  try {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const blob = new Blob([bytes], { type: "image/jpeg" });
    return await createImageBitmap(blob);
  } catch {
    return null;
  }
}

function imagenAspect(a: AspectRatio): string {
  if (a === "9:16") return "9:16";
  if (a === "16:9") return "16:9";
  return "1:1";
}

/**
 * 为每个场景生成一张 AI 背景图（电影感、无文字）。
 * 任何失败都返回 null，渲染器会自动用渐变背景兜底。
 */
export async function generateSceneImages(
  scenes: Scene[],
  aspect: AspectRatio,
  onProgress?: (done: number, total: number) => void
): Promise<(ImageBitmap | null)[]> {
  const ai = getClient();
  const results: (ImageBitmap | null)[] = [];
  for (let i = 0; i < scenes.length; i++) {
    const s = scenes[i];
    let bmp: ImageBitmap | null = null;
    try {
      const prompt = `Cinematic, high-quality vertical background image representing the concept of "${s.bgKeyword}". Mood: bold, modern, eye-catching, social media. Abstract or atmospheric, NO text, NO words, NO letters, dramatic lighting, depth.`;
      const res = await ai.models.generateImages({
        model: IMAGE_MODEL,
        prompt,
        config: { numberOfImages: 1, aspectRatio: imagenAspect(aspect) } as Record<string, unknown>,
      });
      const img = res.generatedImages?.[0]?.image?.imageBytes;
      if (img) bmp = await bytesToBitmap(img);
    } catch (e) {
      console.warn("配图生成失败，使用渐变兜底：", e);
    }
    results.push(bmp);
    onProgress?.(i + 1, scenes.length);
  }
  return results;
}
