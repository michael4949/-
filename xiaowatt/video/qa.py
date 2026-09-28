"""质检：按给定时间点渲染成片画面，拼成缩略图网格。用法：python3 qa.py out.png t1 t2 …  或  python3 qa.py out.png from:to:step"""
import sys
from PIL import Image, ImageDraw, ImageFont
import compose

out, args = sys.argv[1], sys.argv[2:]
ts = []
for a in args:
    if ':' in a: a0, a1, st = map(float, a.split(':')); x = a0
    else: ts.append(float(a)); continue
    while x < a1: ts.append(round(x, 2)); x += st
cols = 3; tw, th = 640, 360
grid = Image.new('RGB', (cols * tw, ((len(ts) + cols - 1) // cols) * (th + 22)), (30, 30, 30))
f = ImageFont.truetype(compose.FONT, 18); d = ImageDraw.Draw(grid)
for i, t in enumerate(ts):
    im = compose.render(t).resize((tw, th), Image.LANCZOS)
    x, y = (i % cols) * tw, (i // cols) * (th + 22)
    grid.paste(im, (x, y + 22))
    seg = max((s for s in compose.plan['segments'] if s['start'] <= t), key=lambda s: s['start'])
    d.text((x + 6, y + 2), f"{t:.1f}s  {seg['id']}", font=f, fill=(255, 220, 90))
grid.save(out)
print(out, len(ts))
