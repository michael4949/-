import { getClient, TTS_MODEL } from "./genai";
import { VideoPlan, SceneAudio } from "../types";

/** Gemini 预置中文友好音色（用户可在 UI 选择）。 */
export const VOICES: { name: string; label: string }[] = [
  { name: "Kore", label: "Kore · 沉稳女声" },
  { name: "Puck", label: "Puck · 活力男声" },
  { name: "Charon", label: "Charon · 磁性男声" },
  { name: "Aoede", label: "Aoede · 清亮女声" },
  { name: "Fenrir", label: "Fenrir · 浑厚男声" },
  { name: "Leda", label: "Leda · 温柔女声" },
];

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** 16-bit 小端 PCM → Float32 [-1,1]。 */
function pcm16ToFloat32(bytes: Uint8Array): Float32Array {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const n = Math.floor(bytes.byteLength / 2);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = view.getInt16(i * 2, true) / 32768;
  return out;
}

function rateFromMime(mime?: string): number {
  const m = mime?.match(/rate=(\d+)/i);
  return m ? parseInt(m[1], 10) : 24000;
}

/** 估算静音占位时长（TTS 失败时兜底，按 ~4.2 字/秒）。 */
function silentFallback(text: string, sampleRate = 24000): { pcm: Float32Array; sampleRate: number } {
  const sec = Math.max(1.2, text.replace(/\s/g, "").length / 4.2);
  return { pcm: new Float32Array(Math.round(sec * sampleRate)), sampleRate };
}

async function synthOne(
  text: string,
  voiceName: string,
  styleHint: string
): Promise<{ pcm: Float32Array; sampleRate: number; estimated: boolean }> {
  const ai = getClient();
  const prompt = `${styleHint ? styleHint + "，请用这种语气朗读：" : "请朗读："}${text}`;
  try {
    const res = await ai.models.generateContent({
      model: TTS_MODEL,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
      } as Record<string, unknown>,
    });
    const part = res.candidates?.[0]?.content?.parts?.find((p) => (p as { inlineData?: unknown }).inlineData);
    const inline = (part as { inlineData?: { data?: string; mimeType?: string } } | undefined)?.inlineData;
    if (!inline?.data) throw new Error("no audio");
    const bytes = base64ToBytes(inline.data);
    return { pcm: pcm16ToFloat32(bytes), sampleRate: rateFromMime(inline.mimeType), estimated: false };
  } catch (e) {
    console.warn("TTS 失败，使用静音占位：", e);
    return { ...silentFallback(text), estimated: true };
  }
}

/**
 * 逐镜合成配音。串行执行以保证顺序、降低限流风险。
 * 任一镜失败则用静音占位，保证整条视频仍能渲染。
 */
export async function synthesizeScenes(
  plan: VideoPlan,
  onProgress?: (done: number, total: number, estimated: boolean) => void
): Promise<SceneAudio[]> {
  const out: SceneAudio[] = [];
  const total = plan.scenes.length;
  for (let i = 0; i < total; i++) {
    const s = plan.scenes[i];
    const r = await synthOne(s.narration, plan.voiceName, plan.voiceStyleHint);
    out.push({
      sceneId: s.id,
      pcm: r.pcm,
      sampleRate: r.sampleRate,
      durationSec: r.pcm.length / r.sampleRate,
      estimated: r.estimated,
    });
    onProgress?.(i + 1, total, r.estimated);
  }
  return out;
}
