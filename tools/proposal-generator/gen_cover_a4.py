
# -*- coding: utf-8 -*-
"""A4 竖版整页封面 + 封底（金融 + AI）"""
import os, math, random
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = HERE + "/img"; os.makedirs(OUT, exist_ok=True)
FONT = "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc"
def F(s): return ImageFont.truetype(FONT, s)

W, H = 1240, 1754           # A4 @150dpi

def hgrad(w, h, stops):
    xs = np.linspace(0, 1, w); cols = np.zeros((w, 3)); n = len(stops) - 1
    for i, x in enumerate(xs):
        seg = min(int(x * n), n - 1); t = x * n - seg
        a, b = stops[seg], stops[seg + 1]
        cols[i] = [a[k] + (b[k] - a[k]) * t for k in range(3)]
    return np.tile(cols[None, :, :], (h, 1, 1))

def rmask(w, h, r):
    m = Image.new("L", (w * 4, h * 4), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, w * 4 - 1, h * 4 - 1], radius=r * 4, fill=255)
    return m.resize((w, h), Image.LANCZOS)

def background():
    ys = np.linspace(0, 1, H)[:, None]; xs = np.linspace(0, 1, W)[None, :]
    arr = np.dstack([8 + 22 * ys + 6 * xs, 18 + 30 * ys + 12 * xs, 44 + 62 * ys + 34 * xs])
    glow = np.clip(1 - np.sqrt(((ys - 0.26) * 1.25) ** 2 + ((xs - 0.72) * 0.9) ** 2) / 0.58, 0, 1) ** 2.2
    arr[:, :, 1] += glow * 78; arr[:, :, 2] += glow * 118
    glow2 = np.clip(1 - np.sqrt(((ys - 0.82) * 1.3) ** 2 + ((xs - 0.22) * 0.9) ** 2) / 0.50, 0, 1) ** 2.3
    arr[:, :, 0] += glow2 * 52; arr[:, :, 2] += glow2 * 46
    img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGB").convert("RGBA")
    d = ImageDraw.Draw(img, "RGBA")

    # 透视网格
    for i in range(30):
        y = int(H * 0.70 + (i ** 1.9) * 1.4)
        if y > H: break
        d.line([(0, y), (W, y)], fill=(0, 212, 255, max(5, 40 - i * 2)), width=1)
    for i in range(-20, 21):
        d.line([(W // 2 + i * 40, H), (W // 2 + i * 170, int(H * 0.70))],
               fill=(0, 212, 255, 18), width=1)

    # 神经网络
    random.seed(20260727)
    nodes = [(random.randint(40, W - 40), random.randint(50, int(H * 0.80))) for _ in range(52)]
    for i, a in enumerate(nodes):
        for b in nodes[i + 1:]:
            dd = math.dist(a, b)
            if dd < 175:
                d.line([a, b], fill=(0, 245, 212, int(42 * (1 - dd / 175))), width=1)
    for n in nodes:
        r = random.choice([2, 3, 3, 4])
        d.ellipse([n[0] - r * 3, n[1] - r * 3, n[0] + r * 3, n[1] + r * 3], fill=(0, 212, 255, 24))
        d.ellipse([n[0] - r, n[1] - r, n[0] + r, n[1] + r], fill=(0, 212, 255, 195))

    # K线
    random.seed(31)
    py = int(H * 0.30); poly = []
    for i in range(34):
        px = 60 + i * 34
        py = max(int(H * 0.13), min(int(H * 0.36), py - random.randint(-22, 28) - i * 2))
        poly.append((px, py))
    for i in range(len(poly) - 1):
        d.line([poly[i], poly[i + 1]], fill=(201, 169, 97, 150), width=3)
    for i, p in enumerate(poly):
        if i % 3 == 0:
            hh = random.randint(12, 34)
            c = (0, 245, 212, 125) if i % 6 == 0 else (236, 72, 153, 115)
            d.line([(p[0], p[1] - hh), (p[0], p[1] + hh)], fill=c, width=2)
            d.rectangle([p[0] - 4, p[1] - hh // 2, p[0] + 4, p[1] + hh // 3], fill=c)
    return img.filter(ImageFilter.SMOOTH)

def scrim(img, center=0.50, strength=205):
    a = np.zeros((H, W, 4), dtype=np.uint8)
    yv = np.linspace(0, 1, H)[:, None]
    al = 108 + (strength - 108) * np.clip(1 - np.abs(yv - center) / 0.44, 0, 1) ** 1.15
    a[:, :, 3] = np.tile(al, (1, W)).astype(np.uint8)
    a[:, :, 0:3] = np.array([5, 11, 27], dtype=np.uint8)
    return Image.alpha_composite(img, Image.fromarray(a, "RGBA"))

def panel(img, x0, y0, x1, y1, stops, radius=20, glow=(0, 212, 255, 125)):
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle([x0, y0 + 12, x1, y1 + 12], radius=radius, fill=(0, 0, 0, 160))
    img = Image.alpha_composite(img, sh.filter(ImageFilter.GaussianBlur(20)))
    pw, ph = x1 - x0, y1 - y0
    arr = hgrad(pw, ph, stops)
    yy = np.linspace(0, 1, ph)[:, None]
    sh2 = np.where(yy < 0.44, 1.0 + 0.28 * np.clip(1 - yy / 0.44, 0, 1) ** 1.5,
                   1.0 - 0.22 * np.clip((yy - 0.44) / 0.56, 0, 1) ** 1.3)
    arr = np.clip(arr * sh2[:, :, None], 0, 255)
    arr = np.clip(arr + (np.clip(1 - yy / 0.06, 0, 1) ** 2 * 88)[:, :, None], 0, 255)
    p = Image.fromarray(arr.astype(np.uint8), "RGB").convert("RGBA")
    p.putalpha(rmask(pw, ph, radius))
    img.paste(p, (x0, y0), p)
    ImageDraw.Draw(img, "RGBA").rounded_rectangle([x0, y0, x1, y1], radius=radius, outline=glow, width=2)
    return img

def ctext(d, y, s, font, fill, sha=155):
    bb = d.textbbox((0, 0), s, font=font)
    x = (W - (bb[2] - bb[0])) // 2
    d.text((x + 2, y + 2), s, font=font, fill=(0, 0, 0, sha))
    d.text((x, y), s, font=font, fill=fill)

# ═════════ 封面 ═════════
def cover():
    img = scrim(background(), 0.44, 212)
    img = panel(img, 92, 470, W - 92, 1128,
                [(8, 24, 58), (16, 46, 100), (34, 28, 96), (62, 26, 90)])
    d = ImageDraw.Draw(img, "RGBA")

    # 顶部彩条
    tb = hgrad(W - 212, 11, [(0, 212, 255), (0, 245, 212), (201, 169, 97), (168, 85, 247), (236, 72, 153)])
    t = Image.fromarray(tb.astype(np.uint8), "RGB").convert("RGBA")
    t.putalpha(rmask(W - 212, 11, 5)); img.paste(t, (106, 496), t)
    d = ImageDraw.Draw(img, "RGBA")

    ctext(d, 92,  "AI  INVESTMENT  RESEARCH  PLATFORM", F(25), (120, 165, 210, 215))
    d.rounded_rectangle([470, 140, W - 470, 143], radius=1, fill=(201, 169, 97, 170))

    ctext(d, 545, "AI 智能投研平台", F(78), (0, 212, 255, 255))
    ctext(d, 660, "对标  TryQuant · BigQuant · i问财", F(33), (232, 200, 126, 240))
    d.rounded_rectangle([250, 730, W - 250, 733], radius=1, fill=(201, 169, 97, 160))
    ctext(d, 776, "深度调研 · 复刻路径 · 超越方案", F(54), (255, 255, 255, 255))
    ctext(d, 872, "境内 A股版   ＋   境外 港美股 / 加密版", F(35), (0, 245, 212, 245))
    ctext(d, 968, "商 务 技 术 方 案 与 模 块 报 价 书", F(33), (208, 224, 246, 232))
    ctext(d, 1048,"（本方案不含交易执行模块）", F(25), (150, 178, 212, 215))

    # 底部信息卡
    img = panel(img, 150, 1272, W - 150, 1520, [(11, 25, 52), (16, 34, 70), (20, 30, 66)],
                radius=14, glow=(201, 169, 97, 110))
    d = ImageDraw.Draw(img, "RGBA")
    rows = [("委 托 方", "【甲方名称】"), ("承 制 方", "【乙方名称】"), ("版　　本", "V1.0    |    2026 年 7 月")]
    for i, (k, v) in enumerate(rows):
        yy = 1312 + i * 66
        d.text((214, yy), k, font=F(27), fill=(140, 170, 206, 235))
        d.rounded_rectangle([352, yy + 4, 355, yy + 32], radius=1, fill=(201, 169, 97, 150))
        d.text((388, yy), v, font=F(27), fill=(235, 243, 252, 245))

    ctext(d, 1596, "— 机 密 · 仅 供 评 估 使 用 · 未 经 许 可 不 得 外 传 —", F(23), (112, 140, 178, 210))
    img.convert("RGB").save(f"{OUT}/cover_a4.png", quality=96)
    print("  ✓ cover_a4.png")

# ═════════ 封底 ═════════
def back():
    img = scrim(background(), 0.50, 195)
    img = panel(img, 130, 640, W - 130, 1010,
                [(8, 24, 58), (14, 40, 88), (30, 26, 88)], radius=18)
    d = ImageDraw.Draw(img, "RGBA")
    tb = hgrad(W - 288, 10, [(0, 212, 255), (0, 245, 212), (201, 169, 97), (168, 85, 247)])
    t = Image.fromarray(tb.astype(np.uint8), "RGB").convert("RGBA")
    t.putalpha(rmask(W - 288, 10, 5)); img.paste(t, (144, 664), t)
    d = ImageDraw.Draw(img, "RGBA")
    ctext(d, 716, "感 谢 评 阅", F(56), (255, 255, 255, 255))
    ctext(d, 812, "期待与【甲方名称】共同构建", F(31), (0, 245, 212, 240))
    ctext(d, 872, "下一代 AI 投研基础设施", F(31), (0, 245, 212, 240))
    d.rounded_rectangle([420, 940, W - 420, 943], radius=1, fill=(201, 169, 97, 160))
    ctext(d, 1120, "【乙方名称】", F(34), (232, 200, 126, 240))
    ctext(d, 1186, "联系人 / 电话 / 邮箱：【待填】", F(25), (150, 178, 212, 220))
    ctext(d, 1560, "— 本文件为商业秘密，未经书面许可不得复制或披露 —", F(22), (110, 138, 176, 205))
    img.convert("RGB").save(f"{OUT}/back_a4.png", quality=96)
    print("  ✓ back_a4.png")

if __name__ == "__main__":
    cover(); back(); print("完成")
