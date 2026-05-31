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

export type CursorRegion = "tl" | "tc" | "tr" | "cl" | "cc" | "cr" | "bl" | "bc" | "br";
// 九宫格 → 画面内归一化落点（鼠标指向“正在讲的那个元素”）
const REGION_XY: Record<CursorRegion, [number, number]> = {
  tl: [0.22, 0.20], tc: [0.50, 0.17], tr: [0.78, 0.20],
  cl: [0.20, 0.50], cc: [0.50, 0.50], cr: [0.80, 0.50],
  bl: [0.22, 0.80], bc: [0.50, 0.83], br: [0.78, 0.80],
};
type Frame = { x: number; y: number; w: number; visH: number };
const regionPoint = (r: CursorRegion, f: Frame) => {
  const [rx, ry] = REGION_XY[r] || REGION_XY.cc;
  return { x: f.x + rx * f.w, y: f.y + ry * f.visH };
};

interface ShotState {
  img: Bitmap | null;
  p: number;             // 本镜进度 0..1
  region: CursorRegion;  // 鼠标本镜要指的元素位置
  prevRegion: CursorRegion;
  scrollBias: number;    // 0..1：随分镜推进自上而下翻页（早镜看顶部、晚镜看下面）
  seed: number;
}

/** 中部：取景框内画截图（按分镜滚动/缩放）+ 指向语义区域的模拟鼠标。 */
function drawShotScene(ctx: Ctx, W: number, H: number, s: ShotState) {
  const top = H * TEMPLATE.shotTopRatio;
  const fh = H * TEMPLATE.shotHeightRatio;
  ctx.fillStyle = "#05070d"; ctx.fillRect(0, top - 10, W, fh + 20);

  if (!s.img) {
    const g = ctx.createLinearGradient(0, top, W, top + fh);
    g.addColorStop(0, "#0b1026"); g.addColorStop(1, "#1d2b64");
    ctx.fillStyle = g; ctx.fillRect(0, top, W, fh);
    return;
  }
  const img = s.img, bt = clamp(s.p, 0, 1);
  const pad = W * 0.04, boxW = W - pad * 2, x = pad, y = top;
  const fit = boxW / img.width;
  const dispH = img.height * fit;
  const visH = Math.min(dispH, fh);
  const rad = Math.round(W * 0.028);
  const frame: Frame = { x, y, w: boxW, visH };

  // 翻页滚动：基准位置随分镜自上而下，镜内再轻微下滑（像在边讲边滚）
  const scrollMax = Math.max(0, dispH - fh);
  const base = clamp(s.scrollBias, 0, 1) * scrollMax;
  const pan = (mulberry32(s.seed * 131 + 9)() - 0.3) * fh * 0.5;
  const scroll = clamp(base + pan * easeInOut(bt), 0, scrollMax);

  // 切镜“咔”一下的轻微放大回弹（前 8%）
  const z = 1 + 0.04 * (1 - clamp(bt / 0.08, 0, 1));
  const dw = boxW * z, dh = dispH * z;
  const dx = x - (dw - boxW) / 2, dy = y - scroll - (dh - dispH) / 2;

  ctx.save();
  roundRect(ctx, x, y, boxW, visH, rad); ctx.clip();
  ctx.fillStyle = "#ffffff"; ctx.fillRect(x, y, boxW, visH);
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();

  ctx.lineWidth = Math.max(2, W * 0.003);
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  roundRect(ctx, x, y, boxW, visH, rad); ctx.stroke();

  // —— 模拟鼠标：从上一镜元素平滑移动到本镜元素，到位后点击 ——
  const cur = regionPoint(s.region, frame);
  const prev = regionPoint(s.prevRegion, frame);
  const moveP = easeInOut(clamp(bt / 0.5, 0, 1));
  const cx = lerp(prev.x, cur.x, moveP);
  const cy = lerp(prev.y, cur.y, moveP);
  const cScale = (W * 0.05) / 17;

  // 到位后点击涟漪（0.52→0.95）
  if (bt >= 0.52 && bt <= 0.97) drawClick(ctx, cur.x, cur.y, (bt - 0.52) / 0.45, W * 0.06);
  drawCursor(ctx, cx, cy, cScale, bt >= 0.52 && bt < 0.62);
}

/** 自适应字号：让文本在 maxW 宽、maxLines 行内放下。 */
function fitFont(ctx: Ctx, text: string, maxW: number, maxLines: number, startPx: number, weight: string, family: string) {
  let px = startPx;
  while (px > 16) {
    ctx.font = `${weight} ${px}px ${family}`;
    if (wrapByWidth(ctx, text, maxW).length <= maxLines) break;
    px -= 4;
  }
  ctx.font = `${weight} ${px}px ${family}`;
  return { px, lines: wrapByWidth(ctx, text, maxW).slice(0, maxLines) };
}

/** 中部信息卡通用底板（科技暗卡 + 角标），返回内容区矩形。 */
function cardPanel(ctx: Ctx, W: number, H: number, enter: number) {
  const top = H * TEMPLATE.shotTopRatio, fh = H * TEMPLATE.shotHeightRatio;
  const pad = W * 0.04, x = pad, y = top, w = W - pad * 2, h = fh;
  ctx.fillStyle = "#05070d"; ctx.fillRect(0, y - 10, W, h + 20);
  // 入场缩放
  const s = 0.96 + 0.04 * enter;
  ctx.save();
  ctx.globalAlpha = enter;
  ctx.translate(x + w / 2, y + h / 2); ctx.scale(s, s); ctx.translate(-(x + w / 2), -(y + h / 2));
  const rad = Math.round(W * 0.028);
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, "#0e1424"); g.addColorStop(1, "#171f37");
  roundRect(ctx, x, y, w, h, rad); ctx.fillStyle = g; ctx.fill();
  // 边框 + 四角科技角标
  ctx.lineWidth = Math.max(2, W * 0.003); ctx.strokeStyle = "rgba(207,90,68,0.55)";
  roundRect(ctx, x, y, w, h, rad); ctx.stroke();
  const t = W * 0.05;
  ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = Math.max(2, W * 0.004);
  const corner = (cx: number, cy: number, sx: number, sy: number) => {
    ctx.beginPath(); ctx.moveTo(cx, cy + sy * t); ctx.lineTo(cx, cy); ctx.lineTo(cx + sx * t, cy); ctx.stroke();
  };
  corner(x + 14, y + 14, 1, 1); corner(x + w - 14, y + 14, -1, 1);
  corner(x + 14, y + h - 14, 1, -1); corner(x + w - 14, y + h - 14, -1, -1);
  return { x, y, w, h, cx: x + w / 2, cy: y + h / 2 };
}

/** 数据卡：超大数字/关键词 + 标签。 */
function drawStatCard(ctx: Ctx, W: number, H: number, value: string, label: string, enter: number, sans: string) {
  const r = cardPanel(ctx, W, H, enter);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const maxLines = value.includes("\n") ? 2 : 1;
  const fit = fitFont(ctx, value, r.w * 0.86, maxLines, Math.round(W * 0.17), "900", sans);
  const lh = fit.px * 1.06;
  const blockH = fit.lines.length * lh;
  const vy = r.cy - r.h * 0.07;  // 数字块中心略偏上
  fit.lines.forEach((ln, i) => {
    const y = vy - (blockH - lh) / 2 + i * lh;
    ctx.lineJoin = "round"; ctx.lineWidth = fit.px * 0.06; ctx.strokeStyle = "rgba(0,0,0,0.5)"; ctx.strokeText(ln, r.cx, y);
    ctx.fillStyle = "#ffffff"; ctx.fillText(ln, r.cx, y);
  });
  // 数字块下方：强调横线 + 标签
  const uy = vy + blockH / 2 + r.h * 0.07;
  ctx.fillStyle = TEMPLATE.titleFill;
  ctx.fillRect(r.cx - r.w * 0.15, uy, r.w * 0.3, Math.max(3, W * 0.005));
  if (label) {
    const lf = fitFont(ctx, label, r.w * 0.86, 2, Math.round(W * 0.05), "700", sans);
    ctx.fillStyle = "rgba(255,255,255,0.78)";
    lf.lines.forEach((ln, i) => ctx.fillText(ln, r.cx, uy + W * 0.055 + i * lf.px * 1.2));
  }
  ctx.restore();
}

/** 金句卡：衬线大字引语 + 出处标签。 */
function drawQuoteCard(ctx: Ctx, W: number, H: number, text: string, label: string, enter: number, serif: string, sans: string) {
  const r = cardPanel(ctx, W, H, enter);
  // 大引号
  ctx.fillStyle = "rgba(207,90,68,0.85)";
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  ctx.font = `900 ${Math.round(W * 0.16)}px Georgia, ${serif}`;
  ctx.fillText("“", r.x + r.w * 0.06, r.y + r.h * 0.34);
  // 引语
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const fit = fitFont(ctx, text, r.w * 0.82, 3, Math.round(W * 0.082), "700", serif);
  const lh = fit.px * 1.22;
  const ty = r.cy - (label ? r.h * 0.05 : 0);
  fit.lines.forEach((ln, i) => {
    const y = ty - ((fit.lines.length - 1) * lh) / 2 + i * lh;
    ctx.fillStyle = "#ffffff"; ctx.fillText(ln, r.cx, y);
  });
  if (label) {
    const lf = fitFont(ctx, label, r.w * 0.8, 2, Math.round(W * 0.044), "600", sans);
    ctx.fillStyle = "rgba(207,90,68,0.9)";
    const ly = ty + (fit.lines.length * lh) / 2 + W * 0.05;
    lf.lines.forEach((ln, i) => ctx.fillText(ln, r.cx, ly + i * lf.px * 1.2));
  }
  ctx.restore();
}

/** 流程卡：几个芯片用箭头串起 + 标签（讲机制/步骤）。 */
function drawFlowCard(ctx: Ctx, W: number, H: number, steps: string[], label: string, enter: number, sans: string) {
  const r = cardPanel(ctx, W, H, enter);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const n = Math.min(steps.length, 4);
  const chipH = r.h * 0.13, gap = r.h * 0.055;
  const totalH = n * chipH + (n - 1) * gap;
  let y = r.cy - totalH / 2 + chipH / 2 - (label ? r.h * 0.04 : 0);
  for (let i = 0; i < n; i++) {
    const fit = fitFont(ctx, steps[i], r.w * 0.7, 1, Math.round(W * 0.05), "700", sans);
    const cw = Math.min(r.w * 0.8, ctx.measureText(steps[i]).width + W * 0.08);
    roundRect(ctx, r.cx - cw / 2, y - chipH / 2, cw, chipH, chipH / 2);
    ctx.fillStyle = i === n - 1 ? "rgba(207,90,68,0.9)" : "rgba(255,255,255,0.1)"; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = "rgba(255,255,255,0.25)"; roundRect(ctx, r.cx - cw / 2, y - chipH / 2, cw, chipH, chipH / 2); ctx.stroke();
    ctx.fillStyle = "#ffffff"; ctx.font = `700 ${fit.px}px ${sans}`; ctx.fillText(steps[i], r.cx, y);
    if (i < n - 1) { ctx.fillStyle = "rgba(207,90,68,0.9)"; ctx.font = `900 ${Math.round(W * 0.045)}px ${sans}`; ctx.fillText("▼", r.cx, y + chipH / 2 + gap / 2); }
    y += chipH + gap;
  }
  if (label) {
    ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.font = `600 ${Math.round(W * 0.044)}px ${sans}`;
    ctx.fillText(label, r.cx, r.y + r.h - W * 0.05);
  }
  ctx.restore();
}

export type VisualKind = "shot" | "stat" | "quote" | "flow";

/** 一帧完整模板（tech），由当前分镜驱动：图卡讲要义、截图作证据。 */
export function drawTechFrame(
  ctx: Ctx, W: number, H: number,
  state: {
    bannerTitle: string; subtitle: string; t: number; sceneProgress: number; seed: number;
    visualKind?: VisualKind;
    shot?: Bitmap | null; region?: CursorRegion; prevRegion?: CursorRegion; scrollBias?: number;
    card?: { value?: string; label?: string; text?: string; steps?: string[] };
  },
  fonts = { serif: TEMPLATE.serif, sans: TEMPLATE.sans }
) {
  ctx.fillStyle = "#05070d"; ctx.fillRect(0, 0, W, H);
  const enter = clamp(state.sceneProgress / 0.18, 0, 1);
  const c = state.card || {};
  const kind = state.visualKind || "shot";
  if (kind === "stat") drawStatCard(ctx, W, H, c.value || "", c.label || "", enter, fonts.sans);
  else if (kind === "quote") drawQuoteCard(ctx, W, H, c.text || c.value || "", c.label || "", enter, fonts.serif, fonts.sans);
  else if (kind === "flow") drawFlowCard(ctx, W, H, c.steps || [], c.label || "", enter, fonts.sans);
  else drawShotScene(ctx, W, H, {
    img: state.shot || null, p: state.sceneProgress,
    region: state.region || "cc", prevRegion: state.prevRegion || "cc",
    scrollBias: state.scrollBias ?? 0, seed: state.seed,
  });
  drawBottomMatrix(ctx, W, H, state.t, state.seed + 1);
  drawTopBanner(ctx, W, H, state.bannerTitle, fonts.serif);
  drawSubtitleBand(ctx, W, H, state.subtitle, fonts.sans);
}
