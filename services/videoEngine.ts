import { Muxer, ArrayBufferTarget } from "mp4-muxer";
import { VideoPlan, SceneAudio, VideoOptions, RenderResult, SubtitleCue, ThemeId } from "../types";
import { buildSceneCues, toSrt } from "./subtitles";
import { drawTechFrame } from "./template";

// ----------------------------- 视觉主题 -----------------------------
interface Theme { a: string; b: string; accent: string; ink: string; }
const THEMES: Record<ThemeId, Theme> = {
  midnight: { a: "#0b1026", b: "#1d2b64", accent: "#ffd34e", ink: "#ffffff" },
  sunset:   { a: "#2b1055", b: "#7597de", accent: "#ff7e5f", ink: "#ffffff" },
  ocean:    { a: "#0f2027", b: "#2c5364", accent: "#00e5ff", ink: "#ffffff" },
  mono:     { a: "#111111", b: "#2b2b2b", accent: "#fef08a", ink: "#ffffff" },
  candy:    { a: "#3a0ca3", b: "#f72585", accent: "#ffe066", ink: "#ffffff" },
};

const FPS = 30;
const GAP = 0.28;          // 场景间停顿（秒）
const TAIL = 0.4;          // 片尾留白
const AUDIO_RATE = 24000;  // 统一音频采样率

// ----------------------------- 工具函数 -----------------------------
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const easeOut = (x: number) => 1 - Math.pow(1 - clamp(x, 0, 1), 3);
const easeInOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const ch of text) {
    if (ch === "\n") { lines.push(line); line = ""; continue; }
    if (ctx.measureText(line + ch).width > maxWidth && line) { lines.push(line); line = ch; }
    else line += ch;
  }
  if (line) lines.push(line);
  return lines;
}

function dims(aspect: VideoOptions["aspect"]): { w: number; h: number } {
  if (aspect === "16:9") return { w: 1920, h: 1080 };
  if (aspect === "1:1") return { w: 1080, h: 1080 };
  return { w: 1080, h: 1920 };
}

// ----------------------------- 音频装配 -----------------------------
function resampleTo(pcm: Float32Array, from: number, to: number): Float32Array {
  if (from === to) return pcm;
  const ratio = to / from;
  const out = new Float32Array(Math.round(pcm.length * ratio));
  for (let i = 0; i < out.length; i++) {
    const src = i / ratio;
    const i0 = Math.floor(src);
    const i1 = Math.min(pcm.length - 1, i0 + 1);
    const f = src - i0;
    out[i] = pcm[i0] * (1 - f) + pcm[i1] * f;
  }
  return out;
}

/** 轻量背景音乐床：缓慢演化的和声 pad（无版权风险），整体音量很低。 */
function synthBgm(length: number, rate: number): Float32Array {
  const out = new Float32Array(length);
  const root = 130.81; // C3
  const partials = [1, 1.5, 2, 2.5];
  for (let i = 0; i < length; i++) {
    const t = i / rate;
    const lfo = 0.5 + 0.5 * Math.sin(2 * Math.PI * 0.07 * t);
    let s = 0;
    for (let p = 0; p < partials.length; p++) {
      s += Math.sin(2 * Math.PI * root * partials[p] * t) * (1 / (p + 2));
    }
    out[i] = s * 0.05 * lfo;
  }
  // 头尾淡入淡出
  const fade = Math.min(rate * 1.5, length / 2) | 0;
  for (let i = 0; i < fade; i++) { out[i] *= i / fade; out[length - 1 - i] *= i / fade; }
  return out;
}

interface Timeline {
  totalSec: number;
  windows: { id: number; start: number; dur: number }[];
  cues: SubtitleCue[];
  master: Float32Array; // 24kHz mono
}

function buildTimeline(plan: VideoPlan, audios: SceneAudio[], bgm: boolean): Timeline {
  const byId = new Map(audios.map((a) => [a.sceneId, a]));
  const windows: Timeline["windows"] = [];
  const cues: SubtitleCue[] = [];
  let cursor = 0;
  for (const s of plan.scenes) {
    const a = byId.get(s.id);
    const dur = a ? Math.max(0.8, a.durationSec) : 2;
    windows.push({ id: s.id, start: cursor, dur });
    cues.push(...buildSceneCues(s.narration, cursor, cursor + dur));
    cursor += dur + GAP;
  }
  const totalSec = Math.max(1, cursor - GAP + TAIL);
  const master = new Float32Array(Math.ceil(totalSec * AUDIO_RATE));
  // 放入各镜配音
  plan.scenes.forEach((s, i) => {
    const a = byId.get(s.id);
    if (!a) return;
    const pcm = resampleTo(a.pcm, a.sampleRate, AUDIO_RATE);
    const off = Math.round(windows[i].start * AUDIO_RATE);
    master.set(pcm.subarray(0, Math.min(pcm.length, master.length - off)), off);
  });
  // 叠加 BGM
  if (bgm) {
    const bed = synthBgm(master.length, AUDIO_RATE);
    for (let i = 0; i < master.length; i++) master[i] = clamp(master[i] + bed[i], -1, 1);
  }
  return { totalSec, windows, cues, master };
}

// ----------------------------- 画面绘制 -----------------------------
interface Visual { bitmap: ImageBitmap; kind: 'screenshot' | 'image'; }

/** 先铺一层主题渐变作为底（截图“包含”模式留边时用得到）。 */
function paintGradient(ctx: CanvasRenderingContext2D, W: number, H: number, theme: Theme, seed: number, t: number) {
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, theme.a);
  g.addColorStop(1, theme.b);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 3; i++) {
    const ph = seed + i * 2.2;
    const bx = W * (0.5 + 0.42 * Math.sin(t * 0.18 + ph));
    const by = H * (0.4 + 0.4 * Math.cos(t * 0.14 + ph * 1.3));
    const r = Math.min(W, H) * (0.45 + 0.1 * Math.sin(t * 0.2 + i));
    const rg = ctx.createRadialGradient(bx, by, 0, bx, by, r);
    const col = i % 2 ? theme.accent : theme.ink;
    rg.addColorStop(0, col + "26");
    rg.addColorStop(1, col + "00");
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, W, H);
  }
}

function drawBackground(
  ctx: CanvasRenderingContext2D, W: number, H: number, theme: Theme,
  seed: number, vis: Visual | null, p: number, t: number
) {
  if (vis) {
    const img = vis.bitmap;
    const iw = img.width, ih = img.height;

    if (vis.kind === "screenshot") {
      // 网页截图：用“包含”铺满上 70% 区域，完整可读；缓慢竖向滚动模拟“浏览网页”。
      paintGradient(ctx, W, H, theme, seed, t);
      const frameTop = H * 0.10;
      const frameH = H * 0.62;          // 文字区留在下方
      const fit = Math.min(W / iw, frameH / ih);
      const dispW = iw * fit, dispH = ih * fit;
      const dx = (W - dispW) / 2;
      // 长截图：随时间向上滚动；普通图：居中
      const overflow = Math.max(0, ih * fit - frameH);
      const scrollExtra = ih * fit > frameH ? overflow * easeInOut(clamp(p, 0, 1)) : 0;
      const dyBase = frameTop + (frameH - Math.min(dispH, frameH)) / 2;
      // 用裁剪把内容限制在取景框内
      ctx.save();
      ctx.beginPath();
      const rad = Math.round(W * 0.03);
      roundRect(ctx, dx, frameTop, dispW, Math.min(dispH, frameH), rad);
      ctx.clip();
      // 白底（网页截图常带白边，避免透出渐变突兀）
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(dx, frameTop, dispW, Math.min(dispH, frameH));
      ctx.drawImage(img, 0, 0, iw, ih, dx, dyBase - scrollExtra, dispW, dispH);
      ctx.restore();
      // 取景框描边 + 轻微阴影感
      ctx.lineWidth = Math.max(2, W * 0.004);
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      roundRect(ctx, dx, frameTop, dispW, Math.min(dispH, frameH), Math.round(W * 0.03));
      ctx.stroke();
      // 底部加深，保证字幕/CTA 可读
      const sg = ctx.createLinearGradient(0, H * 0.6, 0, H);
      sg.addColorStop(0, "rgba(0,0,0,0)");
      sg.addColorStop(1, "rgba(0,0,0,0.78)");
      ctx.fillStyle = sg;
      ctx.fillRect(0, H * 0.6, W, H * 0.4);
      return;
    }

    // 真实配图：Ken Burns“覆盖”铺满全屏 + 压暗
    const scale = 1.06 + 0.12 * easeInOut(p);
    const cover = Math.max(W / iw, H / ih) * scale;
    const dw = iw * cover, dh = ih * cover;
    const dx = (W - dw) / 2 + Math.sin(seed) * 30 * p;
    const dy = (H - dh) / 2 - 40 * p;
    ctx.drawImage(img, dx, dy, dw, dh);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "rgba(0,0,0,0.45)");
    g.addColorStop(0.5, "rgba(0,0,0,0.28)");
    g.addColorStop(1, "rgba(0,0,0,0.78)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    return;
  }
  // 渐变 + 漂浮光斑
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, theme.a);
  g.addColorStop(1, theme.b);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const blobs = 3;
  for (let i = 0; i < blobs; i++) {
    const ph = seed + i * 2.2;
    const bx = W * (0.5 + 0.42 * Math.sin(t * 0.18 + ph));
    const by = H * (0.4 + 0.4 * Math.cos(t * 0.14 + ph * 1.3));
    const r = Math.min(W, H) * (0.45 + 0.1 * Math.sin(t * 0.2 + i));
    const rg = ctx.createRadialGradient(bx, by, 0, bx, by, r);
    const col = i % 2 ? theme.accent : theme.ink;
    rg.addColorStop(0, col + "26");
    rg.addColorStop(1, col + "00");
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, W, H);
  }
  // 暗角
  const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

function drawProgress(ctx: CanvasRenderingContext2D, W: number, theme: Theme, n: number, idx: number, segP: number) {
  const margin = 56, y = 70, gap = 10;
  const seg = (W - margin * 2 - gap * (n - 1)) / n;
  for (let i = 0; i < n; i++) {
    const x = margin + i * (seg + gap);
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    roundRect(ctx, x, y, seg, 7, 3.5); ctx.fill();
    const fill = i < idx ? 1 : i === idx ? clamp(segP, 0, 1) : 0;
    if (fill > 0) {
      ctx.fillStyle = theme.accent;
      roundRect(ctx, x, y, seg * fill, 7, 3.5); ctx.fill();
    }
  }
}

function drawSubtitle(ctx: CanvasRenderingContext2D, W: number, H: number, text: string) {
  if (!text) return;
  const fontSize = Math.round(W * 0.052);
  ctx.font = `800 ${fontSize}px "Noto Sans SC", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const lines = wrapText(ctx, text, W * 0.82);
  const lh = fontSize * 1.28;
  const baseY = H * 0.82;
  // 背景条
  let maxW = 0;
  lines.forEach((l) => (maxW = Math.max(maxW, ctx.measureText(l).width)));
  const padX = 34, padY = 18;
  const bgW = Math.min(W * 0.92, maxW + padX * 2);
  const bgH = lines.length * lh + padY * 2;
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  roundRect(ctx, (W - bgW) / 2, baseY - bgH / 2, bgW, bgH, 22); ctx.fill();
  // 文字（描边 + 填充）
  lines.forEach((l, i) => {
    const y = baseY - ((lines.length - 1) * lh) / 2 + i * lh;
    ctx.lineJoin = "round";
    ctx.lineWidth = fontSize * 0.16;
    ctx.strokeStyle = "rgba(0,0,0,0.85)";
    ctx.strokeText(l, W / 2, y);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(l, W / 2, y);
  });
}

function drawScene(
  ctx: CanvasRenderingContext2D, W: number, H: number, theme: Theme,
  scene: { role: string; caption: string; bullets: string[]; emphasis: string },
  p: number, isHook: boolean, isCta: boolean,
  plan: VideoPlan
) {
  const introY = (1 - easeOut(p / 0.35)) * 60; // 入场上移
  const alpha = easeOut(p / 0.3);

  // 强调小标签（body）
  if (!isHook && !isCta && scene.emphasis) {
    ctx.globalAlpha = alpha;
    ctx.font = `700 ${Math.round(W * 0.04)}px "Noto Sans SC", sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const tw = ctx.measureText(scene.emphasis).width;
    const pillW = tw + 48, pillH = W * 0.072;
    const py = H * 0.3 - introY;
    ctx.fillStyle = theme.accent;
    roundRect(ctx, (W - pillW) / 2, py - pillH / 2, pillW, pillH, pillH / 2); ctx.fill();
    ctx.fillStyle = "#10131f";
    ctx.fillText(scene.emphasis, W / 2, py);
    ctx.globalAlpha = 1;
  }

  // 大标题
  const capSize = Math.round(W * (isHook ? 0.105 : 0.088));
  ctx.font = `900 ${capSize}px "Noto Sans SC", sans-serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const capLines = wrapText(ctx, scene.caption, W * 0.84).slice(0, 4);
  const lh = capSize * 1.18;
  const centerY = (isHook ? H * 0.46 : H * 0.42) - introY;
  ctx.globalAlpha = alpha;
  capLines.forEach((l, i) => {
    const y = centerY - ((capLines.length - 1) * lh) / 2 + i * lh;
    const scl = 0.96 + 0.04 * easeOut(p / 0.3);
    ctx.save();
    ctx.translate(W / 2, y); ctx.scale(scl, scl);
    ctx.lineJoin = "round"; ctx.lineWidth = capSize * 0.14;
    ctx.strokeStyle = "rgba(0,0,0,0.55)"; ctx.strokeText(l, 0, 0);
    ctx.fillStyle = theme.ink; ctx.fillText(l, 0, 0);
    ctx.restore();
  });
  // 标题下的强调下划线
  if (capLines.length) {
    const uy = centerY + ((capLines.length - 1) * lh) / 2 + lh * 0.62;
    const uw = W * 0.18 * easeOut(p / 0.4);
    ctx.fillStyle = theme.accent;
    roundRect(ctx, W / 2 - uw / 2, uy, uw, 9, 4.5); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // 要点列表（body）
  if (!isHook && !isCta && scene.bullets.length) {
    const bs = Math.round(W * 0.046);
    ctx.font = `600 ${bs}px "Noto Sans SC", sans-serif`;
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    const startY = H * 0.56;
    scene.bullets.slice(0, 3).forEach((b, i) => {
      const ba = easeOut((p - 0.15 - i * 0.12) / 0.3);
      if (ba <= 0) return;
      ctx.globalAlpha = ba;
      const y = startY + i * bs * 1.9 + (1 - ba) * 24;
      ctx.fillStyle = theme.accent;
      ctx.beginPath(); ctx.arc(W * 0.13, y, bs * 0.22, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = theme.ink;
      const lines = wrapText(ctx, b, W * 0.7);
      ctx.fillText(lines[0] + (lines.length > 1 ? "…" : ""), W * 0.18, y);
      ctx.globalAlpha = 1;
    });
  }

  // 钩子提示
  if (isHook) {
    const a = 0.5 + 0.5 * Math.sin(p * Math.PI * 4);
    ctx.globalAlpha = 0.85 * a;
    ctx.font = `700 ${Math.round(W * 0.045)}px "Noto Sans SC", sans-serif`;
    ctx.fillStyle = theme.accent; ctx.textAlign = "center";
    ctx.fillText("↓ 看完你就懂了", W / 2, H * 0.66);
    ctx.globalAlpha = 1;
  }

  // CTA：点赞/关注 + 话题
  if (isCta) {
    const cy = H * 0.6;
    ctx.font = `800 ${Math.round(W * 0.05)}px "Noto Sans SC", sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const pulse = 1 + 0.06 * Math.sin(p * Math.PI * 6);
    ctx.save(); ctx.translate(W / 2, cy); ctx.scale(pulse, pulse);
    ctx.fillStyle = theme.accent;
    roundRect(ctx, -W * 0.34, -W * 0.06, W * 0.68, W * 0.12, W * 0.06); ctx.fill();
    ctx.fillStyle = "#10131f";
    ctx.fillText("👍 点赞  ⭐ 收藏  ➕ 关注", 0, 2);
    ctx.restore();
    // 话题
    if (plan.hashtags.length) {
      ctx.font = `600 ${Math.round(W * 0.038)}px "Noto Sans SC", sans-serif`;
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      const tags = plan.hashtags.slice(0, 4).map((h) => "#" + h).join("  ");
      ctx.fillText(tags, W / 2, cy + W * 0.13);
    }
  }
}

function drawBrand(ctx: CanvasRenderingContext2D, W: number, H: number, brand: string) {
  if (!brand) return;
  ctx.font = `600 ${Math.round(W * 0.032)}px "Noto Sans SC", sans-serif`;
  ctx.textAlign = "right"; ctx.textBaseline = "bottom";
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.fillText("@" + brand, W - 40, H - 28);
}

// ----------------------------- 主流程 -----------------------------
export async function renderVideo(
  plan: VideoPlan,
  audios: SceneAudio[],
  visuals: (Visual | null)[],
  options: VideoOptions,
  onProgress?: (ratio: number, note?: string) => void
): Promise<RenderResult> {
  // 确保中文字体已加载，避免画布渲染成方框
  try {
    const fonts = (document as { fonts?: { load: (f: string) => Promise<unknown>; ready: Promise<unknown> } }).fonts;
    if (fonts) {
      await Promise.all([
        fonts.load(`900 100px "Noto Sans SC"`),
        fonts.load(`800 60px "Noto Sans SC"`),
        fonts.load(`700 80px "Noto Serif SC"`),  // 顶部横幅衬线标题
      ]);
      await fonts.ready;
    }
  } catch { /* 忽略 */ }

  const { w: W, h: H } = dims(options.aspect);
  const theme = THEMES[options.theme] || THEMES.midnight;
  const tl = buildTimeline(plan, audios, options.bgm);
  const totalFrames = Math.ceil(tl.totalSec * FPS);

  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.textBaseline = "middle";

  const sceneSeeds = plan.scenes.map((s) => (hashStr(s.bgKeyword + s.id) % 1000) / 159);

  const isTech = options.template === "tech";
  // tech 模板：把所有截图（其次配图）汇总成镜头池，每 ~2s 切一张
  const techShots: ImageBitmap[] = (() => {
    if (!isTech) return [];
    const seen = new Set<ImageBitmap>();
    const screens: ImageBitmap[] = [], others: ImageBitmap[] = [];
    for (const v of visuals) {
      if (!v || seen.has(v.bitmap)) continue;
      seen.add(v.bitmap);
      (v.kind === "screenshot" ? screens : others).push(v.bitmap);
    }
    return [...screens, ...others];
  })();

  const drawAt = (t: number) => {
    // 找到当前场景
    let idx = 0;
    for (let i = 0; i < tl.windows.length; i++) {
      if (t >= tl.windows[i].start) idx = i; else break;
    }
    const win = tl.windows[idx];
    const scene = plan.scenes[idx];
    const p = clamp((t - win.start) / win.dur, 0, 1.2);
    const cue = tl.cues.find((c) => t >= c.start && t < c.end);

    if (isTech) {
      // 科技解说模板：图卡讲要义 + 真实截图作证据 + 顶部钩子横幅 + 白字幕 + 底部二进制暗纹
      const n = plan.scenes.length;
      // shot 镜用真实截图；卡片镜不需要图。截图按"shot 镜序"轮换，保证证据画面有变化
      const shotIdx = plan.scenes.slice(0, idx + 1).filter((s) => (s.visualKind ?? "shot") === "shot").length - 1;
      const shotBmp = techShots.length ? techShots[Math.max(0, shotIdx) % techShots.length] : (visuals[idx]?.bitmap ?? null);
      drawTechFrame(ctx, W, H, {
        bannerTitle: plan.bannerTitle || plan.title,
        subtitle: cue?.text || "",
        sceneProgress: clamp(p, 0, 1),
        seed: idx + 1,
        t,
        visualKind: scene.visualKind || "shot",
        shot: shotBmp,
        region: scene.cursorRegion,
        prevRegion: plan.scenes[idx - 1]?.cursorRegion,
        scrollBias: n > 1 ? idx / (n - 1) : 0,
        card: { value: scene.cardValue, label: scene.cardLabel, text: scene.cardText, steps: scene.cardSteps },
      });
      if (options.brand) drawBrand(ctx, W, H, options.brand);
      return;
    }

    drawBackground(ctx, W, H, theme, sceneSeeds[idx], visuals[idx] || null, clamp(p, 0, 1), t);
    drawProgress(ctx, W, theme, plan.scenes.length, idx, p);
    drawScene(ctx, W, H, theme, scene, clamp(p, 0, 1), scene.role === "hook", scene.role === "cta", plan);
    drawSubtitle(ctx, W, H, cue?.text || "");
    drawBrand(ctx, W, H, options.brand);
  };

  const srt = toSrt(tl.cues);

  // 优先 WebCodecs → 真·MP4；不支持则回退 MediaRecorder → WebM
  const canWebCodecs = typeof (globalThis as Record<string, unknown>).VideoEncoder !== "undefined"
    && typeof (globalThis as Record<string, unknown>).AudioEncoder !== "undefined";

  if (canWebCodecs) {
    try {
      const blob = await encodeMP4(canvas, drawAt, tl, W, H, totalFrames, onProgress);
      const url = URL.createObjectURL(blob);
      return { blob, url, mime: "video/mp4", ext: "mp4", srt, durationSec: tl.totalSec };
    } catch (e) {
      console.warn("WebCodecs 编码失败，回退到 WebM：", e);
    }
  }
  const blob = await encodeWebM(canvas, drawAt, tl, onProgress);
  const url = URL.createObjectURL(blob);
  return { blob, url, mime: blob.type || "video/webm", ext: "webm", srt, durationSec: tl.totalSec };
}

// ---- WebCodecs MP4 ----
async function pickAvc(W: number, H: number, bitrate: number): Promise<string | null> {
  const VE = (globalThis as Record<string, any>).VideoEncoder;
  for (const codec of ["avc1.640028", "avc1.4d0028", "avc1.42e028", "avc1.42001f"]) {
    try {
      const s = await VE.isConfigSupported({ codec, width: W, height: H, bitrate, framerate: FPS });
      if (s?.supported) return codec;
    } catch { /* try next */ }
  }
  return null;
}

async function encodeMP4(
  canvas: HTMLCanvasElement, drawAt: (t: number) => void, tl: Timeline,
  W: number, H: number, totalFrames: number, onProgress?: (r: number, n?: string) => void
): Promise<Blob> {
  const G = globalThis as Record<string, any>;
  const bitrate = Math.round(W * H * FPS * 0.07);
  const codec = await pickAvc(W, H, bitrate);
  if (!codec) throw new Error("无可用的 H.264 编码器");

  const aacSupported = await G.AudioEncoder.isConfigSupported({
    codec: "mp4a.40.2", numberOfChannels: 1, sampleRate: AUDIO_RATE, bitrate: 128000,
  }).then((s: any) => s?.supported).catch(() => false);
  if (!aacSupported) throw new Error("无可用的 AAC 编码器");

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: "avc", width: W, height: H },
    audio: { codec: "aac", numberOfChannels: 1, sampleRate: AUDIO_RATE },
    fastStart: "in-memory",
  });

  const videoEncoder = new G.VideoEncoder({
    output: (chunk: any, meta: any) => muxer.addVideoChunk(chunk, meta),
    error: (e: any) => console.error("video encoder:", e),
  });
  videoEncoder.configure({ codec, width: W, height: H, bitrate, framerate: FPS });

  const audioEncoder = new G.AudioEncoder({
    output: (chunk: any, meta: any) => muxer.addAudioChunk(chunk, meta),
    error: (e: any) => console.error("audio encoder:", e),
  });
  audioEncoder.configure({ codec: "mp4a.40.2", numberOfChannels: 1, sampleRate: AUDIO_RATE, bitrate: 128000 });

  // 视频帧
  const frameDur = Math.round(1e6 / FPS);
  for (let i = 0; i < totalFrames; i++) {
    const t = i / FPS;
    drawAt(t);
    const frame = new G.VideoFrame(canvas, { timestamp: Math.round(t * 1e6), duration: frameDur });
    videoEncoder.encode(frame, { keyFrame: i % (FPS * 2) === 0 });
    frame.close();
    if (videoEncoder.encodeQueueSize > 8) {
      while (videoEncoder.encodeQueueSize > 4) await new Promise((r) => setTimeout(r, 1));
    }
    if (i % 6 === 0) onProgress?.(0.05 + 0.9 * (i / totalFrames), `渲染画面 ${i}/${totalFrames} 帧`);
  }

  // 音频帧（分块）
  const master = tl.master;
  const chunk = 4800; // 0.2s
  for (let off = 0; off < master.length; off += chunk) {
    const n = Math.min(chunk, master.length - off);
    const data = master.subarray(off, off + n);
    const audioData = new G.AudioData({
      format: "f32-planar", sampleRate: AUDIO_RATE, numberOfFrames: n, numberOfChannels: 1,
      timestamp: Math.round((off / AUDIO_RATE) * 1e6), data,
    });
    audioEncoder.encode(audioData);
    audioData.close();
    if (audioEncoder.encodeQueueSize > 8) {
      while (audioEncoder.encodeQueueSize > 4) await new Promise((r) => setTimeout(r, 1));
    }
  }

  onProgress?.(0.97, "封装 MP4…");
  await videoEncoder.flush();
  await audioEncoder.flush();
  muxer.finalize();
  const { buffer } = muxer.target as ArrayBufferTarget;
  onProgress?.(1, "完成");
  return new Blob([buffer], { type: "video/mp4" });
}

// ---- MediaRecorder WebM 回退（实时录制） ----
function pickWebmMime(): string {
  const MR = (globalThis as Record<string, any>).MediaRecorder;
  for (const m of ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"]) {
    if (MR?.isTypeSupported?.(m)) return m;
  }
  return "video/webm";
}

async function encodeWebM(
  canvas: HTMLCanvasElement, drawAt: (t: number) => void, tl: Timeline,
  onProgress?: (r: number, n?: string) => void
): Promise<Blob> {
  const AC = (globalThis as Record<string, any>).AudioContext || (globalThis as Record<string, any>).webkitAudioContext;
  const ac = new AC();
  const buf = ac.createBuffer(1, tl.master.length, AUDIO_RATE);
  buf.copyToChannel(tl.master, 0);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const dest = ac.createMediaStreamDestination();
  src.connect(dest);

  const stream = (canvas as any).captureStream(FPS) as MediaStream;
  dest.stream.getAudioTracks().forEach((tr) => stream.addTrack(tr));

  const MR = (globalThis as Record<string, any>).MediaRecorder;
  const rec = new MR(stream, { mimeType: pickWebmMime(), videoBitsPerSecond: 6_000_000 });
  const chunks: BlobPart[] = [];
  rec.ondataavailable = (e: any) => { if (e.data.size) chunks.push(e.data); };

  const done = new Promise<Blob>((resolve) => {
    rec.onstop = () => resolve(new Blob(chunks, { type: rec.mimeType || "video/webm" }));
  });

  if (ac.state === "suspended") await ac.resume();
  rec.start(100);
  src.start();
  const startT = performance.now();
  await new Promise<void>((resolve) => {
    const loop = () => {
      const t = (performance.now() - startT) / 1000;
      if (t >= tl.totalSec) { resolve(); return; }
      drawAt(t);
      onProgress?.(0.05 + 0.9 * (t / tl.totalSec), `实时录制 ${t.toFixed(1)}/${tl.totalSec.toFixed(1)}s`);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
  rec.stop();
  try { src.stop(); ac.close(); } catch { /* ignore */ }
  onProgress?.(1, "完成");
  return done;
}
