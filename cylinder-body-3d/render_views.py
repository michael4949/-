"""
Pure-numpy software z-buffer renderer -> crisp shaded preview PNGs.
No OpenGL / display required (works headless). Reads cylinder_body.stl.

Run:  python render_views.py     ->  views/*.png
Requires: numpy, trimesh, pillow
"""
import math, numpy as np, trimesh, os
from PIL import Image

os.makedirs("views", exist_ok=True)
m = trimesh.load("cylinder_body.stl")
V = np.asarray(m.vertices, float); F = np.asarray(m.faces); FN = np.asarray(m.face_normals, float)
ctr = V.mean(0); ext = V.max(0)-V.min(0)

def cam_basis(elev, azim):
    e, a = math.radians(elev), math.radians(azim)
    d = np.array([math.cos(e)*math.cos(a), math.cos(e)*math.sin(a), math.sin(e)])
    r = np.cross(d, np.array([0, 0, 1.0])); r /= np.linalg.norm(r)
    u = np.cross(r, d); u /= np.linalg.norm(u)
    return d, r, u

def render(fname, elev, azim, OUT=1000, SS=2, base=(0.66, 0.70, 0.76)):
    W = H = OUT*SS
    d, r, u = cam_basis(elev, azim)
    P = V-ctr; sx = P.dot(r); sy = P.dot(u); sz = P.dot(-d)
    span = max(ext)*1.10; scale = (W*0.94)/span
    px = W/2+sx*scale; py = H/2-sy*scale; Z = sz
    vis = FN.dot(-d) > 0.0
    faces = F[vis]; fn = FN[vis]
    key = -d+0.5*u+0.4*r; key /= np.linalg.norm(key)
    fill = -d-0.6*u-0.3*r; fill /= np.linalg.norm(fill)
    inten = 0.24 + 0.62*np.clip(fn.dot(key), 0, 1) + 0.16*np.clip(fn.dot(fill), 0, 1)
    fcol = np.clip(inten[:, None]*np.array(base), 0, 1)
    zbuf = np.full((H, W), -1e18); img = np.ones((H, W, 3))*np.array([0.97, 0.975, 0.99])
    X0 = px[faces]; Y0 = py[faces]; ZZ = Z[faces]
    for i in range(len(faces)):
        x0, x1, x2 = X0[i]; y0, y1, y2 = Y0[i]; z0, z1, z2 = ZZ[i]
        minx = int(max(0, math.floor(min(x0, x1, x2)))); maxx = int(min(W-1, math.ceil(max(x0, x1, x2))))
        miny = int(max(0, math.floor(min(y0, y1, y2)))); maxy = int(min(H-1, math.ceil(max(y0, y1, y2))))
        if minx > maxx or miny > maxy: continue
        area = (x1-x0)*(y2-y0)-(x2-x0)*(y1-y0)
        if abs(area) < 1e-9: continue
        gx, gy = np.meshgrid(np.arange(minx, maxx+1), np.arange(miny, maxy+1))
        w0 = ((x1-x0)*(gy-y0)-(y1-y0)*(gx-x0))/area
        w1 = ((x2-x1)*(gy-y1)-(y2-y1)*(gx-x1))/area
        w2 = 1.0-w0-w1
        inside = (w0 >= 0) & (w1 >= 0) & (w2 >= 0)
        if not inside.any(): continue
        zz = w0*z2+w1*z0+w2*z1
        sub = zbuf[miny:maxy+1, minx:maxx+1]; upd = inside & (zz > sub)
        if not upd.any(): continue
        sub[upd] = zz[upd]; img[miny:maxy+1, minx:maxx+1][upd] = fcol[i]
    out = (np.clip(img, 0, 1)*255).astype(np.uint8)
    im = Image.fromarray(out)
    if SS > 1: im = im.resize((OUT, OUT), Image.LANCZOS)
    im.save(fname); print("  saved", fname)

render("views/iso_front_quarter.png", 26, -54)
render("views/iso_rear_quarter.png",  20, 126)
render("views/iso_3.png",             30, 214)
render("views/end_face.png",           3, 0.5)
render("views/top.png",               88, -90)
print("done")
