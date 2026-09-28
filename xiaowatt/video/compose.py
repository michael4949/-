"""合成画面：录屏帧 + 镜头推拉 + 红框 + 光标与点击涟漪 + 章节标签 + 字幕 → out/video_only.mp4（1920x1080 30fps）
   用法：python3 compose.py [起秒 止秒]（给出区间只渲染预览片段 out/preview.mp4）"""
import json, bisect, os, sys, subprocess, math
from multiprocessing import Pool
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.dirname(os.path.abspath(__file__))
FF = '/usr/local/bin/ffmpeg'
FONT = '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc'
OW, OH, FPS = 1920, 1080, 30
W, H, DSF = 1440, 810, 2
plan = json.load(open(f'{ROOT}/plan.json'))
TOTAL, XF = plan['total'], plan['xf']


def ease(k): k = min(1, max(0, k)); return 4 * k ** 3 if k < .5 else 1 - (-2 * k + 2) ** 3 / 2
def ease_out(k): k = min(1, max(0, k)); return 1 - (1 - k) ** 3


class Run:
    def __init__(self, r):
        self.r, self.start, self.end = r, r['start'], r['end']
        d = f"{ROOT}/frames/{r['id']}"
        self.dir = d
        idx = json.load(open(f'{d}/index.json'))
        self.ft = [x['t'] for x in idx]; self.ff = [x['f'] for x in idx]
        ev = json.load(open(f'{d}/events.json'))
        self.moves = [e for e in ev if e['type'] == 'move']
        self.clicks = [e for e in ev if e['type'] == 'click']
        c0 = next((e for e in ev if e['type'] == 'cursor'), {'at': [720, 470], 'show': False})
        self.cur0, self.show_cursor = c0['at'], c0.get('show', False)
        self.cams = [e for e in ev if e['type'] == 'cam']
        self.boxes = {}
        for e in ev:
            if e['type'] == 'box': self.boxes[e['id']] = {'on': e['t'], 'off': min(e['until'], self.end - self.start + 0.6), 'pts': [(e['t'], e['rect'])]}
            elif e['type'] == 'boxmove' and e['id'] in self.boxes: self.boxes[e['id']]['pts'].append((e['t'], e['rect']))
            elif e['type'] == 'boxoff' and e['id'] in self.boxes: self.boxes[e['id']]['off'] = min(self.boxes[e['id']]['off'], e['t'])

    def frame_file(self, lt):
        i = bisect.bisect_right(self.ft, lt) - 1
        return f'{self.dir}/{self.ff[max(0, i)]}'

    def view_for(self, rect, z):
        if rect is None: return (0.0, 0.0, float(W), float(H))
        x, y, w, h = rect
        z = max(1.0, min(z, W / (w * 1.08 + 1), H / (h * 1.08 + 1)))
        vw, vh = W / z, H / z
        cx, cy = x + w / 2, y + h / 2
        return (min(max(cx - vw / 2, 0), W - vw), min(max(cy - vh / 2, 0), H - vh), vw, vh)

    def view(self, lt):
        v = (0.0, 0.0, float(W), float(H)); prev = v
        for c in self.cams:
            if c['t'] > lt: break
            prev = v; tgt = self.view_for(c['rect'], c.get('z', 1.4))
            k = ease((lt - c['t']) / 0.9)
            v = tuple(p + (q - p) * k for p, q in zip(v, tgt))
            if k >= 1: v = tgt
        return v

    def cursor(self, lt):
        p = self.cur0
        for m in self.moves:
            if m['t'] > lt: break
            k = (lt - m['t']) / m['dur']
            if k >= 1: p = m['to']
            else: e = ease(k); p = [m['from'][0] + (m['to'][0] - m['from'][0]) * e, m['from'][1] + (m['to'][1] - m['from'][1]) * e]
        return p

    def box_rects(self, lt):
        out = []
        for b in self.boxes.values():
            if not (b['on'] <= lt <= b['off']): continue
            pts = b['pts']; i = bisect.bisect_right([p[0] for p in pts], lt) - 1
            r = pts[i][1]
            if i + 1 < len(pts) and pts[i + 1][0] - pts[i][0] < 0.4:   # 滚动中：线性插值
                t0, r0 = pts[i]; t1, r1 = pts[i + 1]; k = (lt - t0) / max(1e-3, t1 - t0)
                r = [a + (c - a) * k for a, c in zip(r0, r1)]
            out.append((r, lt - b['on'], b['off'] - lt))
        return out


RUNS = [Run(r) for r in plan['runs'] if os.path.exists(f"{ROOT}/frames/{r['id']}/index.json")]

# ---- 预渲染：光标、字幕、章节标签 ----
def make_cursor(hgt):
    S = 8; pts = [(0, 0), (0, 17), (4.2, 13.2), (7.2, 20), (9.8, 18.9), (6.9, 12.3), (12.2, 12.2)]
    im = Image.new('RGBA', (15 * S, 23 * S), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    P = [(x * S + 1.5 * S, y * S + 1.2 * S) for x, y in pts]
    sh = Image.new('RGBA', im.size, (0, 0, 0, 0)); ImageDraw.Draw(sh).polygon([(x + S, y + 1.4 * S) for x, y in P], fill=(0, 0, 0, 110))
    im = Image.alpha_composite(sh.filter(ImageFilter.GaussianBlur(S * 0.9)), im); d = ImageDraw.Draw(im)
    d.polygon(P, fill=(20, 20, 20, 255)); inner = [(x, y) for x, y in P]
    d.line(P + [P[0]], fill=(20, 20, 20, 255), width=int(S * 1.6), joint='curve')
    cx = sum(x for x, y in P) / len(P); cy = sum(y for x, y in P) / len(P)
    d.polygon([(cx + (x - cx) * 0.8, cy + (y - cy) * 0.8) for x, y in inner], fill=(255, 255, 255, 255))
    scale = hgt / (23 * S)
    return im.resize((max(1, int(im.width * scale)), max(1, int(im.height * scale))), Image.LANCZOS), (1.5 * S * scale, 1.2 * S * scale)

CURSORS = {}
def cursor_img(size):
    k = int(round(size))
    if k not in CURSORS: CURSORS[k] = make_cursor(k)
    return CURSORS[k]

FSUB = ImageFont.truetype(FONT, 46)
def make_sub(text):
    pad = 12; bb = FSUB.getbbox(text, stroke_width=4)
    w, h = bb[2] - bb[0] + pad * 2, bb[3] - bb[1] + pad * 2
    base = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    sh = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(sh).text((pad - bb[0] + 2, pad - bb[1] + 3), text, font=FSUB, fill=(0, 0, 0, 150), stroke_width=5, stroke_fill=(0, 0, 0, 150))
    base = Image.alpha_composite(base, sh.filter(ImageFilter.GaussianBlur(3)))
    ImageDraw.Draw(base).text((pad - bb[0], pad - bb[1]), text, font=FSUB, fill=(255, 255, 255, 255), stroke_width=4, stroke_fill=(10, 10, 10, 255))
    return base
SUBS = plan['subs']; SUB_T = [s[0] for s in SUBS]; SUB_IMG = {}

FCH = ImageFont.truetype(FONT, 34)
def make_pill(text):
    bb = FCH.getbbox(text); tw, th = bb[2] - bb[0], bb[3] - bb[1]
    w, h = tw + 96, 68; M = 16
    im = Image.new('RGBA', (w + 2 * M, h + 2 * M), (0, 0, 0, 0))
    sh = Image.new('RGBA', im.size, (0, 0, 0, 0)); ImageDraw.Draw(sh).rounded_rectangle((M, M + 5, M + w, M + h + 5), 34, fill=(0, 30, 90, 120))
    im = Image.alpha_composite(im, sh.filter(ImageFilter.GaussianBlur(7)))
    grad = Image.new('RGBA', (w, h))
    for x in range(w):
        k = x / w; c = (int(18 + 20 * k), int(96 + 90 * k), int(222 + 25 * k), 245)
        ImageDraw.Draw(grad).line([(x, 0), (x, h)], fill=c)
    mask = Image.new('L', (w, h), 0); ImageDraw.Draw(mask).rounded_rectangle((0, 0, w - 1, h - 1), 34, fill=255)
    im.paste(grad, (M, M), mask)
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((M, M, M + w - 1, M + h - 1), 34, outline=(180, 230, 255, 200), width=2)
    d.ellipse((M + 26, M + h / 2 - 7, M + 40, M + h / 2 + 7), fill=(127, 227, 255, 255))
    d.text((M + 58 - bb[0], M + (h - th) / 2 - bb[1]), text, font=FCH, fill=(255, 255, 255, 255))
    return im
CHAPS = [(s['start'] + 0.1, s['chapter']) for s in plan['segments'] if s.get('chapter')]
PILL = {}

def fade_mul(im, a):
    if a >= 0.999: return im
    im = im.copy(); im.putalpha(im.getchannel('A').point(lambda v: int(v * a))); return im

# ---- 单帧渲染 ----
_cache = {}
def base_frame(run, lt):
    f = run.frame_file(lt); v = run.view(lt) if run.r['scene'] == 'banzu' else (0.0, 0.0, float(W), float(H))
    key = (f, tuple(round(x, 2) for x in v))
    if _cache.get('k') == key: return _cache['im'].copy(), v
    if _cache.get('f') != f: _cache['src'] = Image.open(f).convert('RGB'); _cache['f'] = f
    src = _cache['src']; sx = src.width / W
    box = (v[0] * sx, v[1] * sx, (v[0] + v[2]) * sx, (v[1] + v[3]) * sx)
    im = src.resize((OW, OH), Image.LANCZOS if v[2] > 1439 else Image.BICUBIC, box=box, reducing_gap=None)
    _cache['k'], _cache['im'] = key, im
    return im.copy(), v


def draw_run(run, t):
    lt = t - run.start
    im, v = base_frame(run, lt)
    s = OW / v[2]
    to_o = lambda x, y: ((x - v[0]) * s, (y - v[1]) * s)
    boxes = run.box_rects(lt)
    rip = [c for c in run.clicks if 0 <= lt - c['t'] < 0.6]
    if boxes or rip:
        ov = Image.new('RGBA', (OW, OH), (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
        for r, age, left in boxes:
            a = min(1, age / 0.22, max(0, left) / 0.25)
            grow = 16 * (1 - ease_out(age / 0.35))
            x0, y0 = to_o(r[0] - 5, r[1] - 5); x1, y1 = to_o(r[0] + r[2] + 5, r[1] + r[3] + 5)
            x0, y0, x1, y1 = x0 - grow, y0 - grow, x1 + grow, y1 + grow
            x0, y0 = max(x0, 3), max(y0, 3); x1, y1 = min(x1, OW - 4), min(y1, OH - 4)
            if x1 - x0 < 8 or y1 - y0 < 8: continue
            d.rounded_rectangle((x0 - 2, y0 - 2, x1 + 2, y1 + 2), 10, outline=(255, 60, 60, int(70 * a)), width=8)
            d.rounded_rectangle((x0, y0, x1, y1), 8, outline=(255, 38, 38, int(255 * a)), width=4)
        for c in rip:
            k = (lt - c['t']) / 0.6; cx, cy = to_o(*c['at']); R = (10 + 34 * ease_out(k)) * s / 1.333
            d.ellipse((cx - R, cy - R, cx + R, cy + R), outline=(255, 176, 32, int(230 * (1 - k))), width=4)
            r2 = R * 0.55; d.ellipse((cx - r2, cy - r2, cx + r2, cy + r2), fill=(255, 196, 64, int(90 * (1 - k))))
        im = Image.alpha_composite(im.convert('RGBA'), ov).convert('RGB')
    if run.show_cursor:
        px, py = run.cursor(lt)
        press = any(0 <= lt - c['t'] < 0.16 for c in run.clicks)
        cimg, (hx, hy) = cursor_img(22 * s * (0.88 if press else 1))
        ox, oy = to_o(px, py)
        im.paste(cimg, (int(ox - hx), int(oy - hy)), cimg)
    return im


def render(t):
    cur = max((r for r in RUNS if r.start <= t + 1e-6), key=lambda r: r.start)
    im = draw_run(cur, t)
    k = (t - cur.start) / XF
    prev = [r for r in RUNS if abs(r.end - cur.start) < 1e-3]
    if k < 1 and prev and cur is not RUNS[0]:
        pim = draw_run(prev[0], t)
        im = Image.blend(pim, im, ease(k))
    # 章节标签
    for cs, name in CHAPS:
        if cs <= t < cs + 4.6:
            if name not in PILL: PILL[name] = make_pill(name)
            p = PILL[name]; age = t - cs
            a = min(1, age / 0.35, (cs + 4.6 - t) / 0.45); dy = -26 * (1 - ease_out(age / 0.4))
            x = int(866 - p.width / 2); y = int(10 + dy)
            q = fade_mul(p, a); im.paste(q, (x, y), q)
    # 字幕
    i = bisect.bisect_right(SUB_T, t) - 1
    if i >= 0 and SUBS[i][0] <= t < SUBS[i][1]:
        a, b, txt = SUBS[i]
        if i not in SUB_IMG: SUB_IMG[i] = make_sub(txt)
        sim = SUB_IMG[i]; al = min(1, (t - a) / 0.12, (b - t) / 0.12)
        q = fade_mul(sim, al); im.paste(q, (int((OW - sim.width) / 2), OH - 58 - sim.height), q)
    # 片头淡入、片尾淡出
    fa = min(1, t / 0.7, max(0, TOTAL - t) / 1.4)
    if fa < 1: im = Image.blend(Image.new('RGB', (OW, OH)), im, fa)
    return im


def worker(args):
    k, f0, f1, out = args
    p = subprocess.Popen([FF, '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{OW}x{OH}', '-r', str(FPS), '-i', '-',
                          '-c:v', 'libx264', '-preset', 'fast', '-crf', '17', '-pix_fmt', 'yuv420p', '-threads', '2', '-g', '60', out], stdin=subprocess.PIPE)
    for fi in range(f0, f1):
        p.stdin.write(render(fi / FPS).tobytes())
        if k == 0 and (fi - f0) % 300 == 0: print(f'  worker0 {fi - f0}/{f1 - f0}', flush=True)
    p.stdin.close(); p.wait()
    return out


if __name__ == '__main__':
    os.makedirs(f'{ROOT}/out', exist_ok=True)
    if len(sys.argv) == 3:
        a, b = float(sys.argv[1]), float(sys.argv[2])
        worker((0, int(a * FPS), int(b * FPS), f'{ROOT}/out/preview.mp4')); print('preview ok'); sys.exit()
    N = int(round(TOTAL * FPS)); K = 4
    cuts = [N * i // K for i in range(K + 1)]
    jobs = [(i, cuts[i], cuts[i + 1], f'{ROOT}/out/part{i}.mp4') for i in range(K)]
    with Pool(K) as pool: parts = pool.map(worker, jobs)
    open(f'{ROOT}/out/parts.txt', 'w').write(''.join(f"file '{p}'\n" for p in parts))
    subprocess.run([FF, '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', f'{ROOT}/out/parts.txt', '-c', 'copy', f'{ROOT}/out/video_only.mp4'], check=True)
    print('video_only.mp4', N, 'frames')
