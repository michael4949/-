"""
Parametric 3D reconstruction of the cast cylinder body (气缸体, drawing S1-2505).

Representative model rebuilt from the 2D casting/inquiry drawing (sheets 1-2,
sections B-B / C-C / A-A). External envelope, main bores, flanges, bolt circles,
ports AND the internal water/gas chambers (water jacket) are modelled; exact ISO
tolerances and minor cast details are simplified.

Architecture (matches A-A section):
  * Octagonal prism body, X = main axis, length 900, octagon 765 across flats.
  * Central Phi490 H7 main / crank bore (through) inside a solid hub sleeve.
  * 4 cylinder flanges on the 45-deg corners of each end face (blind Phi130 bores).
  * INTERNAL: 4 chambers (top/bottom/left/right) between the hub and the outer
    shell, separated by 4 diagonal (45-deg) ribs that carry the cylinders.
    Top chamber <- intake, bottom <- exhaust, sides <- side ports.
  * Top intake (+Z), bottom exhaust (-Z), side ports (+/-Y).

Robust boolean recipe: bosses embedded + fused sequentially to one solid; every
cut tool subtracted one at a time (OCC compound booleans are unreliable here).

Run:  python build_model.py
Outputs: cylinder_body.step / .stl  and  cylinder_body_section_half.stl /
         cylinder_body_section_quarter.stl
Requires: cadquery
"""
import math
import cadquery as cq
from cadquery import Vector, Solid

# ---- master parameters (mm) -------------------------------------------------
LX   = 900.0; HALF = 382.5; CH = 185.0
R_MAIN = 245.0                   # Phi490 main bore (through)
R_CB1  = 260.0; D_CB1 = 38.0     # Phi520 bearing register at each end
EMB    = 6.0                     # boss embed depth
# internal cavity
WALL   = 18.0                    # outer shell wall thickness
ENDWALL= 42.0                    # end-face wall thickness
HUB_R  = 265.0                   # solid hub radius around the main bore
CW     = 188.0                   # chamber half-width (sets the 45-deg rib gap)

cut_tools, boss_tools, cavity_tools = [], [], []
def cyl(r, h, base, axis): return Solid.makeCylinder(r, h, Vector(*base), Vector(*axis))
def box(dx, dy, dz, corner): return Solid.makeBox(dx, dy, dz, Vector(*corner))

def boss(r, h, base, axis):
    a = Vector(*axis).normalized()
    boss_tools.append(cyl(r, h+EMB, (base[0]-a.x*EMB, base[1]-a.y*EMB, base[2]-a.z*EMB), (a.x, a.y, a.z)))

def octagon(half, ch):
    return [( half-ch, half), (-half+ch, half), (-half, half-ch), (-half, -half+ch),
            (-half+ch, -half), ( half-ch, -half), ( half, -half+ch), ( half, half-ch)]

# ---- 1) octagonal prism body ------------------------------------------------
body = (cq.Workplane("YZ").polyline(octagon(HALF, CH)).close()
        .extrude(LX).translate((-LX/2, 0, 0)).val())

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

# 3) top intake (+Z), bottom exhaust (-Z), side ports (+/-Y)  -- bores stop in
#    the hub wall so they open into the chambers, not into the main bore.
flange((0, 0, HALF),  (0, 0, 1),  225, 32, 185, 159, 200, 16, 12, 36, math.radians(11.25))
flange((0, 0, -HALF), (0, 0, -1), 160, 30, 105, 157, 128, 8, 11, 32)
for sy in (1, -1):
    flange((0, sy*HALF, 0), (0, sy, 0), 158, 30, 92, 157, 126, 8, 10, 30)

# 4) central end flanges (raised ring + Phi590 bolt circle, 24 holes)
for sx in (1, -1):
    xf = sx*LX/2
    boss(272, 10, (xf, 0, 0), (sx, 0, 0))
    for i in range(24):
        ang = 2*math.pi*i/24
        cut_tools.append(cyl(13, 70, (xf+sx*20, 295*math.cos(ang), 295*math.sin(ang)), (-sx, 0, 0)))

# 5) four cylinder flanges per end face (blind bores), seated in the 45-deg corners
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

# ---- 6) INTERNAL CHAMBERS (water jacket) ------------------------------------
# inner hollow octagon (inset by WALL, shortened by ENDWALL at both ends)
Li = LX - 2*ENDWALL
inner = (cq.Workplane("YZ").polyline(octagon(HALF-WALL, CH-WALL)).close()
         .extrude(Li).translate((-Li/2, 0, 0)).val())
hub = cyl(HUB_R, LX+4, (-LX/2-2, 0, 0), (1, 0, 0))     # solid sleeve around main bore
# four chambers: big slab in each axis direction, clipped to the inner octagon,
# with the hub removed -> a curved jacket cap; gaps at 45 deg form the ribs.
S = 3000.0
slabs = {
    "top":    box(Li, 2*CW, S, (-Li/2, -CW, 0)),          # +Z
    "bottom": box(Li, 2*CW, S, (-Li/2, -CW, -S)),         # -Z
    "right":  box(Li, S, 2*CW, (-Li/2, 0, -CW)),          # +Y
    "left":   box(Li, S, 2*CW, (-Li/2, -S, -CW)),         # -Y
}
for sl in slabs.values():
    cavity_tools.append(sl.intersect(inner).cut(hub))

# ---- booleans ---------------------------------------------------------------
def nb(s): return len(s.Solids())
print("bosses:", len(boss_tools), " cut:", len(cut_tools), " chambers:", len(cavity_tools))
for bo in boss_tools:
    body = body.fuse(bo)
print("after fuse solids:", nb(body))
for t in cut_tools:
    body = body.cut(t)
for c in cavity_tools:
    body = body.cut(c)
print("after cut solids:", nb(body))
b = body.BoundingBox(); print("FINAL bbox  X%.1f Y%.1f Z%.1f" % (b.xlen, b.ylen, b.zlen))

# ---- export -----------------------------------------------------------------
wp = cq.Workplane(obj=body)
cq.exporters.export(wp, "cylinder_body.step")
cq.exporters.export(wp, "cylinder_body.stl", tolerance=0.25, angularTolerance=0.12)

# section solids for cut-away renders
half = body.cut(box(S, S, S, (-S/2, 0, -S/2)))                       # keep Y<=0
cq.exporters.export(cq.Workplane(obj=half), "cylinder_body_section_half.stl",
                    tolerance=0.25, angularTolerance=0.12)
quarter = half.cut(box(S, S, S, (0, -S, -S/2)))                      # keep X<=0, Y<=0
cq.exporters.export(cq.Workplane(obj=quarter), "cylinder_body_section_quarter.stl",
                    tolerance=0.25, angularTolerance=0.12)
print("exported STEP + STL + section halves")
