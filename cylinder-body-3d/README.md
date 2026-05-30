# 气缸体 3D 模型 / Cylinder body — drawing S1-2505

由二维铸造/加工工程图纸（`气缸体`, 图号 **S1‑2505**, 材料 **ZG08Cr19Ni9**, 比例 1:5,
共 2 张）反求出的**三维实体模型**，含内部水腔/气腔、剖视图、爆炸图与一个可离线运行的
**交互式三维查看器**。

> ⚠️ **还原/示意模型**：外形、主要孔系、法兰、螺栓圈、端口与内部腔体拓扑均按图纸尺寸建立；
> 但阶梯止口、铸造圆角、ISO 公差 (H7/F9) 与部分腰形水道做了简化。逐项对照见
> [`DIMENSION_CHECK.md`](DIMENSION_CHECK.md)。用于可视化/评审/装配占位/询价，暂不可直接用于最终加工。

## 🖱️ 先看这个：交互式查看器
**`cylinder_body_viewer.html`** —— 双击用浏览器打开即可（**单文件、内嵌模型与 three.js，完全离线**）。
- 拖动 = 自由旋转任意角度 · 滚轮/双指 = 缩放 · 右键拖动 = 平移
- 「⟳ 自动旋转」开关 · 「⟲ 复位视角」
- **剖切轴 X/Y/Z + 位置滑块** = 实时剖切，查看内部水腔/气腔
- 「线框 / 网格」切换

## 这是什么
一台**八角形铸造气缸体**（多缸布置、带水冷腔）。结构（与 A‑A 剖一致）：
中央 **Φ490 H7 主/轴承孔**贯通整个 900 长度，外为八角壳体，二者由 **4 条 45° 斜筋**相连，
斜筋之间形成 **4 个腔室**（上=进气、下=排气、左右=侧口）即水套/气腔；4 个气缸法兰位于端面 45° 角部。

| 特征 | 尺寸 (mm) | 来源 |
|------|-----------|------|
| 总长（主轴向 X） | 900 | B‑B / C‑C |
| 八角截面对边 (Y, Z) | 765 | 主视图 / B‑B |
| 中央主孔 | Φ490 H7 通孔，端面 Φ520 止口 | B‑B |
| 中央法兰螺栓圈 | Φ590，24×孔 | 主视图 |
| 4 气缸法兰（每端面，45°） | 8×螺栓 / 孔 | 主视图 / A‑A |
| 顶进气 (+Z) / 底排气 (−Z) / 侧口 (±Y) | Φ370 / — / 2‑M20 | 主视图 |
| 外壳壁厚 / 端壁厚 | 18 / 42 | B‑B / C‑C |
| 水压试验 | 0.6 MPa / 30 min 不渗漏 | 技术要求 |

包络 ≈ **900 × 825 × 827 mm**，模型体积 ≈ **0.125 m³**（挖空水腔后，watertight 单一实体）。

## 文件清单

| 文件 | 用途 |
|------|------|
| **`cylinder_body_viewer.html`** | ⭐ 离线交互查看器（旋转/缩放/自动旋转/实时剖切） |
| `cylinder_body.step` | CAD 通用 B‑rep 实体（SolidWorks / UG / CATIA / Creo / FreeCAD） |
| `cylinder_body.stl` | 网格（3D 打印 / 网格分析） |
| `cylinder_body.glb` | Web / AR 格式（查看器内嵌的就是它） |
| `cylinder_body_section_half.stl` / `_quarter.stl` | 半剖 / 四分之一剖实体（剖视用） |
| `viewer.html` | 轻量查看器（用 model‑viewer，需联网加载脚本） |
| `views/` | 渲染图：等轴测、端面、顶面、**剖视**、**爆炸**、对比图 |
| `DIMENSION_CHECK.md` | **模型↔图纸逐项尺寸核对表** |
| `build_model.py` | 参数化建模（CadQuery）：本体+水腔+剖切实体 |
| `render_all.py` | 高质量渲染（纯 numpy 软件渲染，含剖视/爆炸）+ 导出 GLB |
| `render_views.py` | 基础多视角渲染 |
| `build_viewer.py` | 组装离线交互 HTML（内联 three.js + base64 GLB） |

### views/ 渲染图
| 图 | 说明 |
|---|---|
| `iso_front_quarter.png` / `iso_rear_quarter.png` / `iso_3.png` | 等轴测 |
| `end_face.png` / `top.png` | 端面 / 顶面 |
| `section_half_iso.png` | **半剖**（清晰显示中央毂 + 上下水腔） |
| `section_quarter_iso.png` / `section_BB.png` | 四分之一剖 / 正剖 |
| `exploded.png` | **爆炸图**（本体 + 代表性盖板） |
| `contact_sheet.png` | 四图总览 |

## 重新生成
```bash
pip install cadquery numpy trimesh pillow
python build_model.py     # 本体 + 水腔 + 剖切实体  -> *.step / *.stl
python render_all.py      # 渲染 + 导出 glb         -> views/*.png, *.glb
python build_viewer.py    # 组装离线交互页面        -> cylinder_body_viewer.html
```
几何参数集中在 `build_model.py` 顶部（总长、壁厚、毂径、各孔径、螺栓等），按需修改重建。

## 坐标约定
- **X** = 主孔轴向（总长 900），两端为八角形端面。
- **Y, Z** = 八角形截面所在平面，对边 765。原点在几何中心。
