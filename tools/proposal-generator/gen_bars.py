
# -*- coding: utf-8 -*-
"""生成 3D 彩色凸浮标题栏 + 封面主视觉（金融 + AI 色系）"""
import os, math, random
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUT = os.path.dirname(os.path.abspath(__file__)) + "/img"
os.makedirs(OUT, exist_ok=True)
FONT = "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc"

def F(sz):
    return ImageFont.truetype(FONT, sz)

# ---------- 金融 + AI 主色板 ----------
PAL = {
    "navy":    (10, 31, 68),
    "midnight":(15, 37, 87),
    "space":   (11, 17, 32),
    "cyan":    (0, 212, 255),
    "teal":    (0, 245, 212),
    "gold":    (201, 169, 97),
    "gold_lt": (240, 217, 152),
    "violet":  (108, 74, 182),
    "purple":  (168, 85, 247),
    "magenta": (236, 72, 153),
    "blue":    (37, 99, 235),
    "sky":     (56, 189, 248),
    "emerald": (16, 185, 129),
    "amber":   (245, 158, 11),
}

def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

def hgrad(w, h, stops):
    """水平多段渐变 -> numpy array (h,w,3)"""
    xs = np.linspace(0, 1, w)
    cols = np.zeros((w, 3))
    n = len(stops) - 1
    for i, x in enumerate(xs):
        seg = min(int(x * n), n - 1)
        t = (x * n) - seg
        cols[i] = lerp(stops[seg], stops[seg + 1], t)
    return np.tile(cols[None, :, :], (h, 1, 1))

def rounded_mask(w, h, r):
    m = Image.new("L", (w * 4, h * 4), 0)
    d = ImageDraw.Draw(m)
    d.rounded_rectangle([0, 0, w * 4 - 1, h * 4 - 1], radius=r * 4, fill=255)
    return m.resize((w, h), Image.LANCZOS)


def title_bar(text, kicker, stops, fname, w=1900, h=190):
    """整条 3D 彩色凸浮标题栏"""
    PAD = 26                     # 外部阴影留白
    W, H = w, h + PAD * 2
    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))

    bw, bh = w - PAD * 2, h
    # --- 水平彩色渐变 ---
    arr = hgrad(bw, bh, stops)

    # --- 垂直明暗渐变：上亮下暗 => 凸起感（温和，避免糊成黑）---
    ys = np.linspace(0, 1, bh)[:, None]
    up = 1.0 + 0.30 * np.clip(1 - ys / 0.46, 0, 1) ** 1.5
    dn = 1.0 - 0.20 * np.clip((ys - 0.46) / 0.54, 0, 1) ** 1.25
    shade = np.where(ys < 0.46, up, dn)
    arr = np.clip(arr * shade[:, :, None], 0, 255)

    # --- 顶部高光带（凸面反光）---
    hl = np.clip((1 - ys / 0.16), 0, 1) ** 1.7 * 78
    arr = np.clip(arr + hl[:, :, None], 0, 255)
    # --- 底部暗边（投影转折）---
    lo = np.clip((ys - 0.86) / 0.14, 0, 1) ** 1.6 * 42
    arr = np.clip(arr - lo[:, :, None], 0, 255)

    bar = Image.fromarray(arr.astype(np.uint8), "RGB").convert("RGBA")
    mask = rounded_mask(bw, bh, 16)
    bar.putalpha(mask)

    # --- 细网格纹理（数据感）---
    tex = Image.new("RGBA", (bw, bh), (0, 0, 0, 0))
    td = ImageDraw.Draw(tex)
    for gx in range(0, bw, 26):
        td.line([(gx, 0), (gx, bh)], fill=(255, 255, 255, 9), width=1)
    for gy in range(0, bh, 26):
        td.line([(0, gy), (bw, gy)], fill=(255, 255, 255, 7), width=1)
    tex.putalpha(Image.composite(tex.split()[3], Image.new("L", (bw, bh), 0), mask))
    bar = Image.alpha_composite(bar, tex)

    # --- 外部投影 ---
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sh)
    sd.rounded_rectangle([PAD, PAD + 9, PAD + bw, PAD + bh + 9], radius=16,
                         fill=(4, 10, 24, 150))
    sh = sh.filter(ImageFilter.GaussianBlur(11))
    canvas = Image.alpha_composite(canvas, sh)
    canvas.paste(bar, (PAD, PAD), bar)

    d = ImageDraw.Draw(canvas, "RGBA")
    # --- 明确的凸起棱线：顶部亮边 / 底部暗边 ---
    d.line([(PAD + 17, PAD + 2), (PAD + bw - 17, PAD + 2)], fill=(255, 255, 255, 205), width=3)
    d.line([(PAD + 17, PAD + bh - 2), (PAD + bw - 17, PAD + bh - 2)], fill=(0, 0, 0, 120), width=3)

    # --- 左侧竖向亮条（AI 强调）---
    d.rounded_rectangle([PAD + 30, PAD + 34, PAD + 38, PAD + bh - 34],
                        radius=4, fill=(255, 255, 255, 225))

    # --- 文本 ---
    tx = PAD + 66
    if kicker:
        fk = F(30)
        d.text((tx + 2, PAD + 34 + 2), kicker, font=fk, fill=(4, 12, 30, 120))
        d.text((tx, PAD + 34), kicker, font=fk, fill=(255, 255, 255, 205))
        ty = PAD + 78
    else:
        ty = PAD + int(bh / 2) - 32
    ft = F(60)
    d.text((tx + 3, ty + 3), text, font=ft, fill=(4, 12, 30, 135))
    d.text((tx, ty), text, font=ft, fill=(255, 255, 255, 255))

    # --- 右侧装饰：迷你K线 + 神经节点 ---
    rx = PAD + bw - 250
    random.seed(len(text) * 7 + 3)
    base = PAD + bh // 2
    for i in range(9):
        x = rx + i * 17
        hh = random.randint(12, 40)
        d.line([(x, base - hh), (x, base + hh)], fill=(255, 255, 255, 90), width=2)
        d.rectangle([x - 4, base - hh // 2, x + 4, base + hh // 3],
                    fill=(255, 255, 255, 135))
    nx = PAD + bw - 92
    pts = [(nx, base - 34), (nx + 42, base - 12), (nx + 6, base + 16), (nx + 46, base + 34)]
    for i in range(len(pts)):
        for j in range(i + 1, len(pts)):
            d.line([pts[i], pts[j]], fill=(255, 255, 255, 65), width=1)
    for p in pts:
        d.ellipse([p[0] - 5, p[1] - 5, p[0] + 5, p[1] + 5], fill=(255, 255, 255, 215))

    canvas.convert("RGB").save(f"{OUT}/{fname}", quality=96)
    print("  ✓", fname)


# ================= 封面主视觉 =================
def cover(fname="cover.png", W=1800, H=1000):
    ys = np.linspace(0, 1, H)[:, None]
    xs = np.linspace(0, 1, W)[None, :]
    r = (10 + 26 * ys + 8 * xs)
    g = (20 + 34 * ys + 14 * xs)
    b = (48 + 70 * ys + 40 * xs)
    arr = np.dstack([r, g, b])
    # 径向光晕
    cy, cx = 0.34, 0.70
    dist = np.sqrt(((ys - cy) * 1.5) ** 2 + ((xs - cx) * 0.85) ** 2)
    glow = np.clip(1 - dist / 0.62, 0, 1) ** 2.1
    arr[:, :, 0] += glow * 6
    arr[:, :, 1] += glow * 92
    arr[:, :, 2] += glow * 135
    img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGB").convert("RGBA")
    d = ImageDraw.Draw(img, "RGBA")

    # --- 网格地平线 ---
    for i in range(26):
        y = int(H * 0.60 + (i ** 1.85) * 1.7)
        if y > H: break
        d.line([(0, y), (W, y)], fill=(0, 212, 255, max(6, 46 - i * 2)), width=1)
    for i in range(-22, 23):
        d.line([(W // 2 + i * 46, H), (W // 2 + i * 200, int(H * 0.60))],
               fill=(0, 212, 255, 20), width=1)

    # --- 神经网络节点层 ---
    random.seed(20260727)
    nodes = [(random.randint(60, W - 60), random.randint(60, int(H * 0.72))) for _ in range(46)]
    for i, a in enumerate(nodes):
        for bp in nodes[i + 1:]:
            dd = math.dist(a, bp)
            if dd < 210:
                al = int(48 * (1 - dd / 210))
                d.line([a, bp], fill=(0, 245, 212, al), width=1)
    for n in nodes:
        rr = random.choice([2, 3, 3, 4])
        d.ellipse([n[0] - rr, n[1] - rr, n[0] + rr, n[1] + rr], fill=(0, 212, 255, 190))
        d.ellipse([n[0] - rr * 3, n[1] - rr * 3, n[0] + rr * 3, n[1] + rr * 3],
                  fill=(0, 212, 255, 26))

    # --- K线走势（金色）---
    random.seed(88)
    px, py = 90, int(H * 0.55)
    poly = []
    for i in range(40):
        px2 = 90 + i * 26
        py2 = py - random.randint(-26, 34) - i * 3
        py2 = max(int(H * 0.20), min(int(H * 0.66), py2))
        poly.append((px2, py2))
        py = py2
    for i in range(len(poly) - 1):
        d.line([poly[i], poly[i + 1]], fill=(201, 169, 97, 165), width=3)
    for i, p in enumerate(poly):
        if i % 3 == 0:
            hh = random.randint(14, 40)
            col = (0, 245, 212, 130) if i % 6 == 0 else (236, 72, 153, 120)
            d.line([(p[0], p[1] - hh), (p[0], p[1] + hh)], fill=col, width=2)
            d.rectangle([p[0] - 5, p[1] - hh // 2, p[0] + 5, p[1] + hh // 3], fill=col)

    img = img.filter(ImageFilter.SMOOTH)

    # --- 全局暗化蒙版：让文字从背景图形中脱离出来 ---
    scrim = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sarr = np.zeros((H, W, 4), dtype=np.uint8)
    yv = np.linspace(0, 1, H)[:, None]
    # 中部最暗（文字区），上下略透
    a = 120 + 95 * np.clip(1 - np.abs(yv - 0.50) / 0.46, 0, 1) ** 1.2
    sarr[:, :, 3] = np.tile(a, (1, W)).astype(np.uint8)
    sarr[:, :, 0:3] = np.array([6, 12, 30], dtype=np.uint8)
    img = Image.alpha_composite(img, Image.fromarray(sarr, "RGBA"))
    d = ImageDraw.Draw(img, "RGBA")

    # --- 中央 3D 凸浮标题板 ---
    bx0, by0, bx1, by1 = 132, 236, W - 132, 792
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle([bx0, by0 + 14, bx1, by1 + 14], radius=22,
                                         fill=(0, 0, 0, 165))
    img = Image.alpha_composite(img, sh.filter(ImageFilter.GaussianBlur(24)))
    d = ImageDraw.Draw(img, "RGBA")

    pw, ph = bx1 - bx0, by1 - by0
    parr = hgrad(pw, ph, [(8, 24, 58), (16, 44, 96), (30, 26, 92), (58, 24, 86)])
    yy = np.linspace(0, 1, ph)[:, None]
    psh = np.where(yy < 0.45, 1.0 + 0.30 * (1 - yy / 0.45) ** 1.5,
                   1.0 - 0.26 * ((yy - 0.45) / 0.55) ** 1.3)
    parr = np.clip(parr * psh[:, :, None], 0, 255)
    parr = np.clip(parr + (np.clip(1 - yy / 0.07, 0, 1) ** 2 * 95)[:, :, None], 0, 255)
    panel = Image.fromarray(parr.astype(np.uint8), "RGB").convert("RGBA")
    panel.putalpha(rounded_mask(pw, ph, 22))
    img.paste(panel, (bx0, by0), panel)
    d = ImageDraw.Draw(img, "RGBA")
    d.rounded_rectangle([bx0, by0, bx1, by1], radius=22, outline=(0, 212, 255, 130), width=2)

    # 顶部彩色凸条
    tb = hgrad(pw - 60, 12, [PAL["cyan"], PAL["teal"], PAL["gold"], PAL["purple"], PAL["magenta"]])
    tbi = Image.fromarray(tb.astype(np.uint8), "RGB").convert("RGBA")
    tbi.putalpha(rounded_mask(pw - 60, 12, 6))
    img.paste(tbi, (bx0 + 30, by0 + 26), tbi)
    d = ImageDraw.Draw(img, "RGBA")

    def ctext(txt, y, font, fill, sh_a=150):
        bb = d.textbbox((0, 0), txt, font=font)
        x = (W - (bb[2] - bb[0])) // 2
        d.text((x + 3, y + 3), txt, font=font, fill=(0, 0, 0, sh_a))
        d.text((x, y), txt, font=font, fill=fill)

    ctext("AI 智能投研平台", 292, F(76), (0, 212, 255, 255))
    ctext("对标  TryQuant · BigQuant · i问财", 400, F(37), (226, 199, 132, 240))
    d.rounded_rectangle([bx0 + 250, 470, bx1 - 250, 474], radius=2, fill=(201, 169, 97, 175))
    ctext("深度调研 · 复刻路径 · 超越方案", 512, F(62), (255, 255, 255, 255))
    ctext("境内 A股版  ＋  境外 港美股 / 加密版", 612, F(40), (0, 245, 212, 245))
    ctext("商 务 技 术 方 案 与 模 块 报 价 书", 706, F(35), (206, 222, 245, 230))

    ctext("V1.0    |    2026 年 7 月", 846, F(32), (162, 186, 218, 240))
    ctext("— 机 密 · 仅 供 评 估 使 用 —", 912, F(27), (122, 146, 182, 215))

    img.convert("RGB").save(f"{OUT}/{fname}", quality=96)
    print("  ✓", fname)


if __name__ == "__main__":
    print("生成 3D 凸浮标题栏…")
    C = PAL
    bars = [
        ("01", "EXECUTIVE SUMMARY",      "方案总览与核心结论",      [C["navy"], C["blue"], C["cyan"]],            "bar01.png"),
        ("02", "PRODUCT TEARDOWN",       "深度调研：TryQuant 全解剖",[C["midnight"], C["violet"], C["purple"]],   "bar02.png"),
        ("03", "MARKET OPPORTUNITY",     "市场机会与能力缺口判断",  [C["navy"], C["teal"], C["cyan"]],            "bar03.png"),
        ("04", "REPLICATION",            "复刻路径：对标能力还原",  [C["midnight"], C["blue"], C["sky"]],         "bar04.png"),
        ("05", "DIFFERENTIATION",        "超越方案：四大差异化引擎",[C["navy"], C["violet"], C["magenta"]],       "bar05.png"),
        ("06", "ARCHITECTURE",           "技术架构与双版本设计",    [C["space"], C["blue"], C["teal"]],           "bar06.png"),
        ("07", "COMMERCIAL QUOTATION",   "模块化报价方案",          [C["navy"], C["gold"], C["gold_lt"]],         "bar07.png"),
        ("08", "DELIVERY PLAN",          "交付计划与里程碑",        [C["midnight"], C["emerald"], C["teal"]],     "bar08.png"),
        ("09", "RISK MANAGEMENT",        "风险控制与产品边界",      [C["navy"], C["amber"], C["gold_lt"]],        "bar09.png"),
        ("10", "APPENDIX",               "附录与交付清单",          [C["space"], C["violet"], C["sky"]],          "bar10.png"),
    ]
    for num, kicker, title, stops, fn in bars:
        title_bar(title, f"{num}  {kicker}", stops, fn)
    print("完成 →", OUT)
