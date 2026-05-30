"""
Parametric 3D reconstruction of the cast cylinder body (气缸体, drawing S1-2505).

Representative model rebuilt from the 2D casting/inquiry drawing (sheets 1-2,
sections B-B / C-C / A-A). External envelope, main bores, flanges, bolt circles
and ports are faithful to the dimensions read off the drawing; internal cored
water/gas chambers and exact ISO tolerances are simplified.

  * Octagonal prism body, ~900 long, octagon 765 across flats.
  * Main bore axis = X: central Phi490 H7 main / crank bore, through, with a
    Phi520 bearing register at each octagonal end face.
  * Four cylinder flanges on the 45-degree corners of each end face.
  * Top intake flange (+Z, 总进气), bottom exhaust flange (-Z, 总排气),
    side ports (+/-Y).

Robust boolean recipe: bosses are embedded into the body and fused sequentially
to a single solid; every cut tool is then subtracted one at a time (OpenCascade
compound booleans on many overlapping tools are not reliable -> non-manifold).

Run:  python build_model.py      ->  cylinder_body.step , cylinder_body.stl
Requires: cadquery  (pip install cadquery)
"""
import math
import cadquery as cq
from cadquery import Vector, Solid, Compound

# ---- master parameters (mm) -------------------------------------------------
LX   = 900.0; HALF = 382.5; CH = 185.0
R_MAIN = 245.0                  # Phi490 main bore (through)
R_CB1  = 260.0; D_CB1 = 38.0    # Phi520 bearing register at each end
EMB    = 6.0                    # boss embed depth (avoids coincident faces)

cut_tools, boss_tools = [], []
def cyl(r, h, base, axis): return Solid.makeCylinder(r, h, Vector(*base), Vector(*axis))

def boss(r, h, base, axis):
    a = Vector(*axis).normalized()
    b = (base[0]-a.x*EMB, base[1]-a.y*EMB, base[2]-a.z*EMB)
    boss_tools.append(cyl(r, h+EMB, b, (a.x, a.y, a.z)))

# ---- 1) octagonal prism body ------------------------------------------------
pts = [( HALF-CH, HALF), (-HALF+CH, HALF), (-HALF, HALF-CH), (-HALF, -HALF+CH),
       (-HALF+CH, -HALF), ( HALF-CH, -HALF), ( HALF, -HALF+CH), ( HALF, HALF-CH)]
body = (cq.Workplane("YZ").polyline(pts).close().extrude(LX).translate((-LX/2, 0, 0)).val())

# ---- 2) main bore + end bearing register ------------------------------------
cut_tools.append(cyl(R_MAIN, LX+6, (-LX/2-3, 0, 0), (1, 0, 0)))
for sx in (1, -1):
    cut_tools.append(cyl(R_CB1, D_CB1+1, (sx*LX/2, 0, 0), (-sx, 0, 0)))

# ---- generic round flange (boss + bore + bolt circle) -----------------------
def flange(base, axis, boss_r, boss_h, bore_r, bore_d, bc_r, n, bolt_r, bolt_d, phase=0.0):
    a = Vector(*axis).normalized()
    boss(boss_r, boss_h, base, (a.x, a.y, a.z))
    top = (base[0]+a.x*boss_h, base[1]+a.y*boss_h, base[2]+a.z*boss_h)
    cut_tools.append(cyl(bore_r, bore_d, top, (-a.x, -a.y, -a.z)))
    ref = (0, 0, 1) if abs(a.z) < 0.9 else (1, 0, 0)
    u = a.cross(Vector(*ref)).normalized(); v = a.cross(u).normalized()
    for i in range(n):
        ang = phase + 2*math.pi*i/n
        c = (u.multiply(math.cos(ang)) + v.multiply(math.sin(ang))).multiply(bc_r)
        p = (top[0]+c.x+a.x*2, top[1]+c.y+a.y*2, top[2]+c.z+a.z*2)
        cut_tools.append(cyl(bolt_r, bolt_d+boss_h+4, p, (-a.x, -a.y, -a.z)))

# 3) top intake (+Z), bottom exhaust (-Z), side ports (+/-Y)
flange((0, 0, HALF),  (0, 0, 1),  225, 32, 185, HALF+50, 200, 16, 12, 36, math.radians(11.25))
flange((0, 0, -HALF), (0, 0, -1), 160, 30, 105, HALF+50, 128, 8, 11, 32)
for sy in (1, -1):
    flange((0, sy*HALF, 0), (0, sy, 0), 158, 30, 92, HALF+50, 126, 8, 10, 30)

# 4) central end flanges (raised ring + Phi590 bolt circle, 24 holes)
for sx in (1, -1):
    xf = sx*LX/2
    boss(272, 10, (xf, 0, 0), (sx, 0, 0))
    for i in range(24):
        ang = 2*math.pi*i/24
        cut_tools.append(cyl(13, 70, (xf+sx*20, 295*math.cos(ang), 295*math.sin(ang)), (-sx, 0, 0)))

# 5) four cylinder flanges on each end face (8 total), seated in the corners so
#    their bores clear the central Phi490 bore
off = 232.0
for sx in (1, -1):
    xf = sx*LX/2
    for (sy, sz) in [(1, 1), (-1, 1), (-1, -1), (1, -1)]:
        cy, cz = sy*off, sz*off
        boss(100, 12, (xf, cy, cz), (sx, 0, 0))
        cut_tools.append(cyl(80, 16, (xf+sx*12, cy, cz), (-sx, 0, 0)))    # Phi160 spotface
        cut_tools.append(cyl(65, 240, (xf+sx*12, cy, cz), (-sx, 0, 0)))   # Phi130 cylinder bore
        for i in range(8):
            ang = math.radians(22.5) + 2*math.pi*i/8
            cut_tools.append(cyl(9, 52, (xf+sx*16, cy+72*math.cos(ang), cz+72*math.sin(ang)), (-sx, 0, 0)))

# ---- booleans ---------------------------------------------------------------
def nb(s): return len(s.Solids())
print("bosses:", len(boss_tools), " cut tools:", len(cut_tools))
for bo in boss_tools:
    body = body.fuse(bo)
print("after fuse solids:", nb(body))
for t in cut_tools:
    body = body.cut(t)
print("after cut solids:", nb(body))
b = body.BoundingBox(); print("FINAL bbox  X%.1f Y%.1f Z%.1f" % (b.xlen, b.ylen, b.zlen))

wp = cq.Workplane(obj=body)
cq.exporters.export(wp, "cylinder_body.step")
cq.exporters.export(wp, "cylinder_body.stl", tolerance=0.25, angularTolerance=0.12)
print("exported cylinder_body.step + cylinder_body.stl")
