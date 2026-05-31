/**
 * “科技解说”模板（对标爆款样板）。纯 canvas 绘制，不依赖任何浏览器全局，
 * 因此既能在浏览器引擎里用，也能在 Node(@napi-rs/canvas) 里渲染预览来校验。
 *
 * 三层固定结构：
 *   ┌─ 顶部横幅：模糊暗底 + 衬线红棕大标题（全程固定的钩子）
 *   ├─ 中部：真实网页截图（取景框）。每 ~2s 切一个“镜头”：换图/翻页滚动，
 *   │        并有一个模拟鼠标光标移动 + 点击（涟漪），复刻“真人操作网页”的感觉
 *   ├─ 字幕带：白色粗黑体 + 黑描边（逐句）
 *   └─ 底部：二进制 0/1 暗纹（科技质感）
 */

// 兼容浏览器与 napi 的 2D 上下文（只用两者都支持的 API）
type Ctx = CanvasRenderingContext2D;
type Bitmap = { width: number; height: number } & CanvasImageSource;

export const TEMPLATE = {
  titleFill: "#cf5a44",      // 红棕/赤陶
  titleStroke: "rgba(0,0,0,0.82)",
  subFill: "#ffffff",
  subStroke: "rgba(0,0,0,0.9)",
  clickColor: "#ff6a4d",     // 点击涟漪
  bannerHeightRatio: 0.185,  // 顶部横幅高度
  shotTopRatio: 0.205,       // 截图区起点
  shotHeightRatio: 0.46,     // 截图区高度
  subtitleYRatio: 0.735,     // 字幕中心
  matrixTopRatio: 0.78,      // 底部暗纹起点
  beatSec: 2.0,              // 每个镜头时长（≈每2秒切一次画面）
  serif: '"Noto Serif SC","Songti SC",serif',
  sans: '"Noto Sans SC","PingFang SC",sans-serif',
};

export const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeInOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const mulberry32 = (a: number) => () => {
  a |= 0; a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function wrapByWidth(ctx: Ctx, text: string, maxWidth: number): string[] {
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

/** 顶部固定横幅：模糊暗底（近似“人群”）+ 衬线红棕双行标题。 */
export function drawTopBanner(ctx: Ctx, W: number, H: number, title: string, serif = TEMPLATE.serif) {
  const bh = H * TEMPLATE.bannerHeightRatio;
  const g = ctx.createLinearGradient(0, 0, 0, bh);
  g.addColorStop(0, "#0a0a0c"); g.addColorStop(1, "#17141a");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, bh);
  for (let i = 0; i < 7; i++) {
    const bx = (W / 7) * (i + 0.5) + Math.sin(i * 1.7) * 30;
    const by = bh * 0.42 + Math.cos(i * 2.1) * 18;
    const r = bh * (0.34 + 0.1 * Math.sin(i));
    const rg = ctx.createRadialGradient(bx, by, 0, bx, by, r);
    rg.addColorStop(0, "rgba(120,120,130,0.16)"); rg.addColorStop(1, "rgba(120,120,130,0)");
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, bh);
  }
  ctx.fillStyle = "rgba(255,255,255,0.06)"; ctx.fillRect(0, bh - 2, W, 2);

  const fontSize = Math.round(W * 0.072);
  ctx.font = `700 ${fontSize}px ${serif}`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const lines = wrapByWidth(ctx, title, W * 0.9).slice(0, 2);
  const lh = fontSize * 1.18;
  const baseY = bh * 0.6;
  lines.forEach((ln, i) => {
    const y = baseY - ((lines.length - 1) * lh) / 2 + i * lh;
    ctx.lineJoin = "round"; ctx.lineWidth = fontSize * 0.13;
    ctx.strokeStyle = TEMPLATE.titleStroke; ctx.strokeText(ln, W / 2, y);
    ctx.fillStyle = TEMPLATE.titleFill; ctx.fillText(ln, W / 2, y);
  });
}

/** 底部二进制 0/1 暗纹。 */
export function drawBottomMatrix(ctx: Ctx, W: number, H: number, t: number, seed = 1) {
  const top = H * TEMPLATE.matrixTopRatio;
  const h = H - top;
  ctx.fillStyle = "#000000"; ctx.fillRect(0, top, W, h);
  const cols = 16, rows = 6;
  const cw = W / cols, chH = h / rows;
  const fs = Math.round(chH * 0.62);
  ctx.font = `${fs}px "Courier New",monospace`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const n = Math.sin((c * 12.9898 + r * 78.233 + seed) * 43758.5453);
      const bit = (n - Math.floor(n)) > 0.5 ? "1" : "0";
      const tw = 0.5 + 0.5 * Math.sin(t * 1.5 + c * 0.7 + r * 1.3);
      const alpha = 0.05 + 0.22 * tw * (r < 2 ? 1 : 0.5);
      ctx.fillStyle = `rgba(180,190,200,${alpha.toFixed(3)})`;
      ctx.fillText(bit, c * cw + cw / 2, top + r * chH + chH / 2);
    }
  }
  const g = ctx.createLinearGradient(0, top - H * 0.04, 0, top + h * 0.3);
  g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,0.9)");
  ctx.fillStyle = g; ctx.fillRect(0, top - H * 0.04, W, h * 0.34 + H * 0.04);
}

/** 字幕带：白色粗黑体 + 黑描边，居中。 */
export function drawSubtitleBand(ctx: Ctx, W: number, H: number, text: string, sans = TEMPLATE.sans) {
  if (!text) return;
  const fs = Math.round(W * 0.058);
  ctx.font = `800 ${fs}px ${sans}`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const lines = wrapByWidth(ctx, text, W * 0.9).slice(0, 2);
  const lh = fs * 1.25;
  const cy = H * TEMPLATE.subtitleYRatio;
  lines.forEach((ln, i) => {
    const y = cy - ((lines.length - 1) * lh) / 2 + i * lh;
    ctx.lineJoin = "round"; ctx.lineWidth = fs * 0.2;
    ctx.strokeStyle = TEMPLATE.subStroke; ctx.strokeText(ln, W / 2, y);
    ctx.fillStyle = TEMPLATE.subFill; ctx.fillText(ln, W / 2, y);
  });
}

/** 经典箭头鼠标光标（白填充 + 深描边 + 投影），尖端在 (x,y)。 */
export function drawCursor(ctx: Ctx, x: number, y: number, scale: number, pressed = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale * (pressed ? 0.88 : 1), scale * (pressed ? 0.88 : 1));
  ctx.shadowColor = "rgba(0,0,0,0.45)"; ctx.shadowBlur = 6; ctx.shadowOffsetX = 1; ctx.shadowOffsetY = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(0, 17); ctx.lineTo(4.2, 12.8); ctx.lineTo(7.0, 18.6);
  ctx.lineTo(9.4, 17.5); ctx.lineTo(6.6, 11.9); ctx.lineTo(11.6, 11.9); ctx.closePath();
  ctx.fillStyle = "#ffffff"; ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.lineWidth = 1.5; ctx.strokeStyle = "#111111"; ctx.stroke();
  ctx.restore();
}

/** 点击涟漪：扩散圆环 + 中心点，p:0→1。 */
export function drawClick(ctx: Ctx, x: number, y: number, p: number, R: number) {
  ctx.save();
  const r = R * (0.22 + 0.78 * easeInOut(p));
  ctx.globalAlpha = (1 - p) * 0.9;
  ctx.lineWidth = Math.max(2, R * 0.09);
  ctx.strokeStyle = TEMPLATE.clickColor;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = (1 - p) * 0.5;
  ctx.fillStyle = TEMPLATE.clickColor;
  ctx.beginPath(); ctx.arc(x, y, R * 0.17, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

type Frame = { x: number; y: number; w: number; visH: number };
/** 每个镜头的鼠标落点 + 是否点击，按镜头序号确定（可复现）。 */
function beatTarget(i: number, seed: number, f: Frame) {
  const rng = mulberry32(seed * 131 + i * 977 + 7);
  const x = f.x + (0.12 + 0.76 * rng()) * f.w;
  const y = f.y + (0.14 + 0.62 * rng()) * f.visH;
  const click = rng() > 0.32;
  return { x, y, click };
}

/** 中部：取景框内画截图（带每镜的滚动/缩放）+ 模拟鼠标。 */
function drawShotWithCursor(ctx: Ctx, W: number, H: number, shots: Bitmap[], t: number, seed: number) {
  const top = H * TEMPLATE.shotTopRatio;
  const fh = H * TEMPLATE.shotHeightRatio;
  ctx.fillStyle = "#05070d"; ctx.fillRect(0, top - 10, W, fh + 20);

  if (!shots.length) {
    const g = ctx.createLinearGradient(0, top, W, top + fh);
    g.addColorStop(0, "#0b1026"); g.addColorStop(1, "#1d2b64");
    ctx.fillStyle = g; ctx.fillRect(0, top, W, fh);
    return;
  }

  const beat = Math.floor(t / TEMPLATE.beatSec);
  const bt = (t - beat * TEMPLATE.beatSec) / TEMPLATE.beatSec; // 0..1
  const img = shots[beat % shots.length];

  const pad = W * 0.04;
  const boxW = W - pad * 2;
  const x = pad, y = top;
  const fit = boxW / img.width;
  const dispH = img.height * fit;
  const visH = Math.min(dispH, fh);
  const rad = Math.round(W * 0.028);
  const frame: Frame = { x, y, w: boxW, visH };

  // 翻页滚动（同一张长图，每镜滚到不同位置 → 画面更丰富）
  const scrollMax = Math.max(0, dispH - fh);
  const sr = mulberry32(seed * 977 + beat * 131 + 3);
  const sFrom = sr() * scrollMax;
  const sTo = clamp(sFrom + (sr() - 0.35) * fh * 1.1, 0, scrollMax);
  const scroll = lerp(sFrom, sTo, easeInOut(bt));

  // 切镜“咔”一下的轻微放大回弹（前 0.14s）
  const z = 1 + 0.04 * (1 - clamp(bt / 0.14, 0, 1));
  const dw = boxW * z, dh = dispH * z;
  const dx = x - (dw - boxW) / 2, dy = y - scroll - (dh - dispH) / 2;

  ctx.save();
  roundRect(ctx, x, y, boxW, visH, rad);
  ctx.clip();
  ctx.fillStyle = "#ffffff"; ctx.fillRect(x, y, boxW, visH);
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();

  ctx.lineWidth = Math.max(2, W * 0.003);
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  roundRect(ctx, x, y, boxW, visH, rad); ctx.stroke();

  // —— 模拟鼠标：从上一镜落点平滑移动到本镜落点，到位后点击 ——
  const cur = beatTarget(beat, seed, frame);
  const prev = beatTarget(beat - 1, seed, frame);
  const moveP = easeInOut(clamp(bt / 0.5, 0, 1));
  const cx = lerp(prev.x, cur.x, moveP);
  const cy = lerp(prev.y, cur.y, moveP);
  const cScale = (W * 0.05) / 17;

  // 点击涟漪（到位后 0.5→0.92）
  if (cur.click && bt >= 0.5 && bt <= 0.95) {
    drawClick(ctx, cur.x, cur.y, (bt - 0.5) / 0.45, W * 0.06);
  }
  const pressed = cur.click && bt >= 0.5 && bt < 0.6;
  drawCursor(ctx, cx, cy, cScale, pressed);
}

/** 一帧完整模板（tech）。t 为全局时间秒。 */
export function drawTechFrame(
  ctx: Ctx, W: number, H: number,
  state: { bannerTitle: string; shots: Bitmap[]; subtitle: string; t: number; seed: number },
  fonts = { serif: TEMPLATE.serif, sans: TEMPLATE.sans }
) {
  ctx.fillStyle = "#05070d"; ctx.fillRect(0, 0, W, H);
  drawShotWithCursor(ctx, W, H, state.shots, state.t, state.seed);
  drawBottomMatrix(ctx, W, H, state.t, state.seed + 1);
  drawTopBanner(ctx, W, H, state.bannerTitle, fonts.serif);
  drawSubtitleBand(ctx, W, H, state.subtitle, fonts.sans);
}
