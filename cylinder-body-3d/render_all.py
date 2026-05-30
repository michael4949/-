"""
High-quality headless renders (pure numpy z-buffer, Blinn-Phong + supersampling):
  * full model isometrics, end face, top
  * half / quarter cut-away sections (reveal the internal chambers)
  * an exploded assembly (body + representative bolt-on covers)
Also (re)exports cylinder_body.glb for the web viewer.
Requires: numpy, trimesh, pillow
"""
import math, numpy as np, trimesh
from PIL import Image

OUTDIR = "views"
import os; os.makedirs(OUTDIR, exist_ok=True)

STEEL  = (0.66, 0.70, 0.76)
BRASS  = (0.80, 0.66, 0.36)
COPPER = (0.78, 0.52, 0.40)

def cam(elev, azim):
    e, a = math.radians(elev), math.radians(azim)
    d = np.array([math.cos(e)*math.cos(a), math.cos(e)*math.sin(a), math.sin(e)]); d/=np.linalg.norm(d)
    r = np.cross(d, [0, 0, 1.0]); r/=np.linalg.norm(r)
    u = np.cross(r, d); u/=np.linalg.norm(u)
    return d, r, u

def load(path):
    m = trimesh.load(path)
    return [np.asarray(m.vertices, float), np.asarray(m.faces), np.asarray(m.face_normals, float)]

def disc(radius, thick, center, axis, color):
    m = trimesh.creation.cylinder(radius=radius, height=thick, sections=72)
    T = trimesh.geometry.align_vectors([0, 0, 1], np.asarray(axis, float))
    m.apply_transform(T); m.apply_translation(center)
    return [np.asarray(m.vertices, float), np.asarray(m.faces), np.asarray(m.face_normals, float), color]

def render(parts, fname, elev, azim, OUT=1000, SS=2, cull=True, zoom=1.0, bg=(0.965, 0.972, 0.985)):
    """parts: list of [V,F,FN] or [V,F,FN,color]; default colour STEEL."""
    W = H = OUT*SS
    d, r, u = cam(elev, azim)
    view = -d
    Tx = []; Ty = []; Tz = []; Tc = []         # per-triangle screen coords, depth, shaded colour
    allpts = []
    for p in parts:
        V, F, FN = p[0], p[1], p[2]; color = np.array(p[3] if len(p) > 3 else STEEL)
        n = FN if not cull else FN
        sx = V.dot(r); sy = V.dot(u); sz = V.dot(-d)
        if cull:
            vis = FN.dot(view) > 0.0
            F2 = F[vis]; N2 = FN[vis]
        else:
            F2 = F; N2 = FN
        # Blinn-Phong
        key = (-d + 0.55*u + 0.45*r); key /= np.linalg.norm(key)
        fill = (-d - 0.7*u - 0.2*r); fill /= np.linalg.norm(fill)
        diff = 0.22 + 0.60*np.clip(N2.dot(key), 0, 1) + 0.16*np.clip(N2.dot(fill), 0, 1)
        hvec = key + view; hvec /= np.linalg.norm(hvec)
        spec = np.power(np.clip(N2.dot(hvec), 0, 1), 28) * 0.5
        col = np.clip(diff[:, None]*color + spec[:, None], 0, 1)
        Tx.append(sx[F2]); Ty.append(sy[F2]); Tz.append(sz[F2]); Tc.append(col)
        allpts.append(V)
    Tx = np.concatenate(Tx); Ty = np.concatenate(Ty); Tz = np.concatenate(Tz); Tc = np.concatenate(Tc)
    P = np.concatenate(allpts); ctr = P.mean(0); ext = P.max(0)-P.min(0)
    cx = ctr.dot(r); cy = ctr.dot(u)
    sc = (W*0.94*zoom)/(max(ext)*1.14)
    px = W/2 + (Tx-cx)*sc; py = H/2 - (Ty-cy)*sc
    zb = np.full((H, W), -1e18); img = np.ones((H, W, 3))*np.array(bg)
    for i in range(len(Tx)):
        x0, x1, x2 = px[i]; y0, y1, y2 = py[i]; z0, z1, z2 = Tz[i]
        mnx = int(max(0, math.floor(min(x0, x1, x2)))); mxx = int(min(W-1, math.ceil(max(x0, x1, x2))))
        mny = int(max(0, math.floor(min(y0, y1, y2)))); mxy = int(min(H-1, math.ceil(max(y0, y1, y2))))
        if mnx > mxx or mny > mxy: continue
        ar = (x1-x0)*(y2-y0)-(x2-x0)*(y1-y0)
        if abs(ar) < 1e-9: continue
        gx, gy = np.meshgrid(np.arange(mnx, mxx+1), np.arange(mny, mxy+1))
        w0 = ((x1-x0)*(gy-y0)-(y1-y0)*(gx-x0))/ar
        w1 = ((x2-x1)*(gy-y1)-(y2-y1)*(gx-x1))/ar
        w2 = 1-w0-w1
        ins = (w0 >= 0) & (w1 >= 0) & (w2 >= 0)
        if not ins.any(): continue
        zz = w0*z2+w1*z0+w2*z1
        sub = zb[mny:mxy+1, mnx:mxx+1]; up = ins & (zz > sub)
        if not up.any(): continue
        sub[up] = zz[up]; img[mny:mxy+1, mnx:mxx+1][up] = Tc[i]
    im = Image.fromarray((np.clip(img, 0, 1)*255).astype(np.uint8))
    if SS > 1: im = im.resize((OUT, OUT), Image.LANCZOS)
    im.save(f"{OUTDIR}/{fname}"); print("  ", fname)

# --------------------------------------------------------------------------- #
full = load("cylinder_body.stl")
half = load("cylinder_body_section_half.stl")
quart = load("cylinder_body_section_quarter.stl")

print("full model:")
render([full], "iso_front_quarter.png", 26, -54, SS=3)
render([full], "iso_rear_quarter.png",  20, 126, SS=3)
render([full], "iso_3.png",             30, 214)
render([full], "end_face.png",           3, 0.5, SS=3)
render([full], "top.png",               88, -90)

print("sections:")
render([half],  "section_half_iso.png",  20, -58, SS=3, cull=False)
render([half],  "section_BB.png",         0,  90, SS=3, cull=False)   # look at the Y=0 cut plane
render([quart], "section_quarter_iso.png", 26, -46, SS=3, cull=False)

print("exploded assembly:")
LX, HALF, off = 900.0, 382.5, 232.0
ex = [full]
for sx in (1, -1):
    ex.append(disc(300, 26, (sx*(LX/2+170), 0, 0), (1, 0, 0), BRASS))         # central bearing cover
    for (sy, sz) in [(1, 1), (-1, 1), (-1, -1), (1, -1)]:
        ex.append(disc(96, 20, (sx*(LX/2+320), sy*off, sz*off), (1, 0, 0), COPPER))  # cylinder head
ex.append(disc(210, 22, (0, 0, HALF+180), (0, 0, 1), BRASS))                  # intake cover
ex.append(disc(150, 22, (0, 0, -(HALF+180)), (0, 0, 1), BRASS))              # exhaust cover
for sy in (1, -1):
    ex.append(disc(150, 22, (0, sy*(HALF+180), 0), (0, 1, 0), BRASS))        # side covers
render(ex, "exploded.png", 24, -52, SS=3, zoom=0.86, cull=True)

# contact sheet
imgs = [Image.open(f"{OUTDIR}/{n}") for n in
        ["iso_front_quarter.png", "section_half_iso.png", "exploded.png", "section_BB.png"]]
w, h = imgs[0].size; s = Image.new("RGB", (w*2, h*2), "white")
for i, im in enumerate(imgs): s.paste(im.resize((w, h)), ((i % 2)*w, (i//2)*h))
s.resize((1400, 1400), Image.LANCZOS).save(f"{OUTDIR}/contact_sheet.png")
print("contact sheet done")

# (re)export GLB for the web viewer
m = trimesh.load("cylinder_body.stl")
m.export("cylinder_body.glb")
print("glb exported")
