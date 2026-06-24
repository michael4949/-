"""生成《启光教研 AI 系统 · 数据完备度访谈问卷》Word 文档。

排版思路:
- 主色 朱红 #C8102E(贴合启光"光"意向)+ 深邃藏蓝 #1A2B4A(AI 科技感)+ 暖金 #C8A464(质感点缀)
- 封面:大面积色块 + 装饰线 + AI 字符 + 致客户落款
- 章节标题:大号编号 + 章名 + 副标题 + 装饰线
- 问题项:序号 + 问题文字 + 灰底"提示与答题示例"小卡片
- 表格:深蓝表头 + 米白斑马纹
- 页眉页脚:细线 + 品牌信息
- 字体:微软雅黑 / Microsoft YaHei,中文教辅圈通用
"""

from __future__ import annotations

from docx import Document
from docx.shared import Pt, Cm, RGBColor, Emu, Mm
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.enum.table import WD_ALIGN_VERTICAL, WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement


# =============================================================================
# 配色与字体常量
# =============================================================================

RED = "C8102E"        # 启光朱红 — 主色
RED_DEEP = "8E0A20"   # 深红 — 阴影
BLUE = "1A2B4A"       # 深邃藏蓝 — 辅色,AI 科技感
BLUE_BRIGHT = "2D4A7C"  # 亮蓝 — 强调
GOLD = "C8A464"       # 暖金 — 质感点缀
BG_WARM = "F5F3EE"    # 米白 — 温润底色
BG_COOL = "F0F3F8"    # 冷白 — 表格交替
TEXT = "2C2C2C"       # 主文字
TEXT_SOFT = "5A5A5A"  # 次文字
LINE = "DDD8CE"       # 浅分隔线
LINE_DARK = "B0A797"  # 深分隔线

FONT_CN = "微软雅黑"
FONT_EN = "Calibri"


# =============================================================================
# 工具函数:字体、底色、边框、间距
# =============================================================================

def set_run(run, *, size=11, bold=False, italic=False, color=None, name=None):
    """统一设置一段文字的字体属性,包含中文 east-asia 字体绑定。"""
    name = name or FONT_CN
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.italic = italic
    if color:
        run.font.color.rgb = RGBColor.from_string(color)
    run.font.name = name
    rpr = run._element.get_or_add_rPr()
    rfonts = rpr.find(qn("w:rFonts"))
    if rfonts is None:
        rfonts = OxmlElement("w:rFonts")
        rpr.insert(0, rfonts)
    rfonts.set(qn("w:eastAsia"), name)
    rfonts.set(qn("w:ascii"), name)
    rfonts.set(qn("w:hAnsi"), name)


def shade_paragraph(p, hex_color):
    """给段落加底色。"""
    pPr = p._element.get_or_add_pPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hex_color)
    pPr.append(shd)


def border_paragraph(p, *, top=None, bottom=None, left=None, right=None):
    """给段落加边框。每条边接受 dict(sz/color/space/val/'val')。"""
    pPr = p._element.get_or_add_pPr()
    pBdr = pPr.find(qn("w:pBdr"))
    if pBdr is None:
        pBdr = OxmlElement("w:pBdr")
        pPr.append(pBdr)
    for side, cfg in [("top", top), ("bottom", bottom), ("left", left), ("right", right)]:
        if not cfg:
            continue
        el = OxmlElement(f"w:{side}")
        el.set(qn("w:val"), cfg.get("val", "single"))
        el.set(qn("w:sz"), str(cfg.get("sz", 8)))
        el.set(qn("w:space"), str(cfg.get("space", 4)))
        el.set(qn("w:color"), cfg.get("color", "000000"))
        pBdr.append(el)


def shade_cell(cell, hex_color):
    """表格单元格底色。"""
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hex_color)
    tcPr.append(shd)


def set_cell_border(cell, *, top=None, bottom=None, left=None, right=None):
    """表格单元格边框。"""
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = tcPr.find(qn("w:tcBorders"))
    if tcBorders is None:
        tcBorders = OxmlElement("w:tcBorders")
        tcPr.append(tcBorders)
    for side, cfg in [("top", top), ("bottom", bottom), ("left", left), ("right", right)]:
        if cfg is None:
            continue
        el = OxmlElement(f"w:{side}")
        el.set(qn("w:val"), cfg.get("val", "single"))
        el.set(qn("w:sz"), str(cfg.get("sz", 4)))
        el.set(qn("w:space"), "0")
        el.set(qn("w:color"), cfg.get("color", "999999"))
        existing = tcBorders.find(qn(f"w:{side}"))
        if existing is not None:
            tcBorders.remove(existing)
        tcBorders.append(el)


def set_spacing(p, *, before=0, after=0, line=1.4):
    """段落上下距离与行距(line 是倍数)。"""
    pf = p.paragraph_format
    pf.space_before = Pt(before)
    pf.space_after = Pt(after)
    pf.line_spacing = line


def add_page_break(doc):
    p = doc.add_paragraph()
    p.add_run().add_break(WD_BREAK.PAGE)


# =============================================================================
# 页面与样式初始化
# =============================================================================

def init_document():
    doc = Document()
    section = doc.sections[0]
    # A4 纸张
    section.page_width = Cm(21.0)
    section.page_height = Cm(29.7)
    section.top_margin = Cm(2.4)
    section.bottom_margin = Cm(2.4)
    section.left_margin = Cm(2.4)
    section.right_margin = Cm(2.4)
    section.header_distance = Cm(1.2)
    section.footer_distance = Cm(1.2)

    # 默认 Normal 样式
    normal = doc.styles["Normal"]
    normal.font.name = FONT_CN
    normal.font.size = Pt(11)
    normal.font.color.rgb = RGBColor.from_string(TEXT)
    rpr = normal.element.get_or_add_rPr()
    rfonts = rpr.find(qn("w:rFonts"))
    if rfonts is None:
        rfonts = OxmlElement("w:rFonts")
        rpr.insert(0, rfonts)
    rfonts.set(qn("w:eastAsia"), FONT_CN)
    rfonts.set(qn("w:ascii"), FONT_CN)
    rfonts.set(qn("w:hAnsi"), FONT_CN)
    return doc


def add_header_footer(doc):
    section = doc.sections[0]
    # 页眉
    header = section.header
    hp = header.paragraphs[0]
    hp.alignment = WD_ALIGN_PARAGRAPH.LEFT
    r1 = hp.add_run("启光教研 AI 系统")
    set_run(r1, size=9, bold=True, color=RED)
    r2 = hp.add_run("    数据完备度访谈问卷")
    set_run(r2, size=9, color=TEXT_SOFT)
    border_paragraph(hp, bottom={"sz": 6, "color": LINE_DARK})

    # 页脚 — 品牌带
    footer = section.footer
    fp = footer.paragraphs[0]
    fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = fp.add_run("◆  机密 · 仅供项目报价测算使用  ◆")
    set_run(r, size=8, color=TEXT_SOFT)
    border_paragraph(fp, top={"sz": 6, "color": LINE_DARK})


# =============================================================================
# 封面页
# =============================================================================

def add_cover(doc):
    # 顶部 AI 装饰带
    p = doc.add_paragraph()
    set_spacing(p, before=24, after=4)
    r = p.add_run(
        "▲△▼▽◇◆◇◆◇◆◇◆◇◆◇◆◇◆◇◆◇◆◇◆◇◆◇◆◇◆◇◆◇◆◇◆◇"
    )
    set_run(r, size=10, color=GOLD)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER

    # 副标 EN
    p = doc.add_paragraph()
    set_spacing(p, before=18, after=2)
    r = p.add_run("QIGUANG  ·  AI  ·  EDUCATION  INTELLIGENCE")
    set_run(r, size=10, bold=True, color=BLUE, name=FONT_EN)
    r.font.color.rgb = RGBColor.from_string(BLUE)
    # 字间距通过 OXML 设置
    rPr = r._element.get_or_add_rPr()
    spacing = OxmlElement("w:spacing")
    spacing.set(qn("w:val"), "120")
    rPr.append(spacing)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER

    # 主标题
    p = doc.add_paragraph()
    set_spacing(p, before=20, after=8)
    r = p.add_run("启光教研 AI 系统")
    set_run(r, size=36, bold=True, color=RED)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER

    p = doc.add_paragraph()
    set_spacing(p, before=0, after=20)
    r = p.add_run("数据完备度  ·  访谈问卷")
    set_run(r, size=22, color=BLUE)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER

    # 分隔线 + 中段说明
    p = doc.add_paragraph()
    set_spacing(p, before=18, after=10)
    border_paragraph(p, top={"sz": 18, "color": RED})
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER

    p = doc.add_paragraph()
    set_spacing(p, before=6, after=18, line=1.6)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("FOR  PROJECT  SCOPING  &  PRICING  ESTIMATE")
    set_run(r, size=9, color=GOLD, name=FONT_EN)
    rPr = r._element.get_or_add_rPr()
    spacing = OxmlElement("w:spacing")
    spacing.set(qn("w:val"), "60")
    rPr.append(spacing)

    p = doc.add_paragraph()
    set_spacing(p, before=2, after=24, line=1.8)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run(
        "本问卷旨在协助贵单位与我方共同盘点【数据资产现状】,\n"
        "为后续 AI 智能体系统的研发工作量、交付周期与报价测算\n"
        "提供准确的事实依据。请协助逐项填写,无需估算可如实标注。"
    )
    set_run(r, size=11, color=TEXT_SOFT)

    # 致客户信息表
    tbl = doc.add_table(rows=4, cols=2)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    rows_data = [
        ("致 / TO", "河北启光教育科技有限公司  研发与教研中心"),
        ("项目 / PROJECT", "命题教辅研发智能体  ·  数据资产盘点"),
        ("编号 / NO.", "QG-AI-DAQ-2025-001"),
        ("日期 / DATE", "                                                "),
    ]
    for i, (k, v) in enumerate(rows_data):
        c1, c2 = tbl.rows[i].cells
        c1.width = Cm(4.5)
        c2.width = Cm(11)
        p1 = c1.paragraphs[0]
        set_spacing(p1, before=4, after=4)
        r = p1.add_run(k)
        set_run(r, size=10, bold=True, color=BLUE)
        p2 = c2.paragraphs[0]
        set_spacing(p2, before=4, after=4)
        r = p2.add_run(v)
        set_run(r, size=11, color=TEXT)
        # 单元格边框,只留底边
        for cell in (c1, c2):
            set_cell_border(cell,
                top={"val": "nil"},
                left={"val": "nil"},
                right={"val": "nil"},
                bottom={"val": "single", "sz": "4", "color": LINE},
            )

    # 底部品牌区
    for _ in range(2):
        p = doc.add_paragraph()
        set_spacing(p, before=6, after=2)

    p = doc.add_paragraph()
    set_spacing(p, before=36, after=4)
    border_paragraph(p, top={"sz": 18, "color": BLUE})
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER

    p = doc.add_paragraph()
    set_spacing(p, before=6, after=4)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("◆  POWERED  BY  AI  RESEARCH  PARTNER  ◆")
    set_run(r, size=9, bold=True, color=GOLD, name=FONT_EN)

    p = doc.add_paragraph()
    set_spacing(p, before=2, after=4)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("◢ ◤  Neural  ·  Knowledge  ·  Pedagogy  ·  Engineering  ◥ ◣")
    set_run(r, size=9, color=TEXT_SOFT, name=FONT_EN)

    add_page_break(doc)


# =============================================================================
# 前言页
# =============================================================================

def add_preface(doc):
    # 章顶 AI 横饰
    add_section_top_strip(doc, label="PREFACE  ·  前  言")

    p = doc.add_paragraph()
    set_spacing(p, before=12, after=10, line=1.8)
    r = p.add_run("致启光研发与教研同仁:")
    set_run(r, size=14, bold=True, color=RED)

    paragraphs = [
        "在前期的方案沟通中,贵单位对【启光教研 AI 系统】展现出了清晰的战略判断与落地意愿——这正是项目能成功的第一前提。",
        "我方在沟通中亦同步了一个关键事实:AI 智能体的能力上限,本质上由【训练数据的完备度】决定。同一套架构,在不同质量的数据资产之上,产出的成卷质量会有数量级的差异。",
        "贵单位的数据资产涵盖了纸质教材、Word 教研稿、Excel 数据表、扫描型 PDF、图片、视频等多种形态。每一种形态从【原始素材】走到【可被大模型理解的结构化语料】之间,都有一段不可省略的工程链路——OCR 识别 / 数据标注 / 数据清洗 / 数据治理 / 结构化转换 / 向量化入库——而每一段链路所需的人力与时间,直接取决于原始数据的【量、质、组织度、合规性】。",
        "为给出一份既负责又精准的报价,我方拟通过本问卷与贵单位共同完成一次完整的【数据资产盘点】。问卷分为 7 个主章节与 1 个附录,预计填写时间约 45–60 分钟,可由教研负责人牵头,IT/信息化负责人协同完成。",
        "本问卷所获信息仅用于本项目的工作量测算与报价测算,我方将严格保密。",
    ]
    for text in paragraphs:
        p = doc.add_paragraph()
        set_spacing(p, before=4, after=8, line=1.85)
        r = p.add_run(text)
        set_run(r, size=11, color=TEXT)
        p.paragraph_format.first_line_indent = Pt(24)

    # 落款
    p = doc.add_paragraph()
    set_spacing(p, before=24, after=4, line=1.6)
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    r = p.add_run("AI  研发与交付团队")
    set_run(r, size=11, color=BLUE, bold=True)

    p = doc.add_paragraph()
    set_spacing(p, before=0, after=0)
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    r = p.add_run("二〇二六年    月    日")
    set_run(r, size=10, color=TEXT_SOFT)

    add_page_break(doc)


# =============================================================================
# 章节顶部装饰条 & 章节标题
# =============================================================================

def add_section_top_strip(doc, *, label):
    """每章顶部的英文装饰横带。"""
    p = doc.add_paragraph()
    set_spacing(p, before=0, after=2)
    r = p.add_run(label)
    set_run(r, size=9, bold=True, color=GOLD, name=FONT_EN)
    rPr = r._element.get_or_add_rPr()
    spacing = OxmlElement("w:spacing")
    spacing.set(qn("w:val"), "120")
    rPr.append(spacing)
    border_paragraph(p,
        top={"sz": 4, "color": LINE_DARK},
        bottom={"sz": 4, "color": LINE_DARK},
    )

    pPr = p._element.get_or_add_pPr()
    sh = OxmlElement("w:shd")
    sh.set(qn("w:val"), "clear")
    sh.set(qn("w:color"), "auto")
    sh.set(qn("w:fill"), BG_WARM)
    pPr.append(sh)


def add_chapter_title(doc, num, cn_title, en_subtitle, intent):
    """章节封面式标题:大编号 + 中文标题 + 英文副标 + 灰底意图说明。"""
    # 顶部空
    p = doc.add_paragraph()
    set_spacing(p, before=14, after=0)

    # 大编号 + 主标题(表格 1 行 2 列实现左右布局)
    tbl = doc.add_table(rows=1, cols=2)
    tbl.autofit = False
    c1, c2 = tbl.rows[0].cells
    c1.width = Cm(3.6)
    c2.width = Cm(12.4)
    for cell in (c1, c2):
        set_cell_border(cell,
            top={"val": "nil"}, left={"val": "nil"},
            right={"val": "nil"}, bottom={"val": "nil"},
        )

    # 大编号
    p1 = c1.paragraphs[0]
    p1.alignment = WD_ALIGN_PARAGRAPH.LEFT
    set_spacing(p1, before=0, after=0)
    r = p1.add_run(f"{num:02d}")
    set_run(r, size=56, bold=True, color=RED, name=FONT_EN)

    # 标题与副标
    p2 = c2.paragraphs[0]
    set_spacing(p2, before=14, after=4, line=1.0)
    r = p2.add_run(cn_title)
    set_run(r, size=20, bold=True, color=BLUE)
    p3 = c2.add_paragraph()
    set_spacing(p3, before=0, after=0)
    r = p3.add_run(en_subtitle)
    set_run(r, size=10, color=GOLD, name=FONT_EN)
    rPr = r._element.get_or_add_rPr()
    spacing = OxmlElement("w:spacing")
    spacing.set(qn("w:val"), "80")
    rPr.append(spacing)

    # 分隔
    p = doc.add_paragraph()
    set_spacing(p, before=6, after=10)
    border_paragraph(p, bottom={"sz": 12, "color": RED})

    # 章意图(灰底卡片)
    add_intent_box(doc, intent)


def add_intent_box(doc, text):
    """章节意图:灰底圆角矩形(用单格表格实现)。"""
    tbl = doc.add_table(rows=1, cols=1)
    tbl.autofit = False
    cell = tbl.rows[0].cells[0]
    cell.width = Cm(16)
    shade_cell(cell, BG_WARM)
    set_cell_border(cell,
        top={"val": "single", "sz": "4", "color": GOLD},
        left={"val": "single", "sz": "24", "color": GOLD},
        bottom={"val": "single", "sz": "4", "color": GOLD},
        right={"val": "single", "sz": "4", "color": GOLD},
    )
    p = cell.paragraphs[0]
    set_spacing(p, before=4, after=4, line=1.7)
    r = p.add_run("⬢ 本章用途    ")
    set_run(r, size=10, bold=True, color=GOLD)
    r = p.add_run(text)
    set_run(r, size=10, color=TEXT)

    # 章节意图后留白
    p = doc.add_paragraph()
    set_spacing(p, before=4, after=4)


def add_subsection(doc, num, title):
    """子节标题:数字色块 + 文字。"""
    p = doc.add_paragraph()
    set_spacing(p, before=14, after=6)
    r = p.add_run(f"  {num}  ")
    set_run(r, size=11, bold=True, color="FFFFFF")
    # 色块底色用 run 的 highlight 不行,用段落底色但只染开头不可能。
    # 改方案:用单格表格小色块
    # 实际更简洁的做法 — 直接用 run 串:用 ▌ 装饰 + 加粗标题
    p.clear()
    r = p.add_run("▌ ")
    set_run(r, size=15, bold=True, color=RED)
    r = p.add_run(f"{num}  ")
    set_run(r, size=13, bold=True, color=RED)
    r = p.add_run(title)
    set_run(r, size=13, bold=True, color=BLUE)


def add_question(doc, num, question, hints=None, choices=None, fill_lines=2):
    """单个问题项:左侧序号 + 问题 + (可选)提示 + (可选)选项 + 答题留白横线。"""
    # 问题
    p = doc.add_paragraph()
    set_spacing(p, before=8, after=4, line=1.7)
    r = p.add_run(f"问题 {num:02d}    ")
    set_run(r, size=10, bold=True, color=GOLD)
    r = p.add_run(question)
    set_run(r, size=11, color=TEXT)

    # 提示
    if hints:
        for hint in hints:
            p = doc.add_paragraph()
            set_spacing(p, before=0, after=2, line=1.5)
            p.paragraph_format.left_indent = Cm(0.8)
            r = p.add_run("◇ ")
            set_run(r, size=10, color=BLUE_BRIGHT)
            r = p.add_run(hint)
            set_run(r, size=10, italic=True, color=TEXT_SOFT)

    # 选项
    if choices:
        for choice in choices:
            p = doc.add_paragraph()
            set_spacing(p, before=0, after=2, line=1.5)
            p.paragraph_format.left_indent = Cm(0.8)
            r = p.add_run("□ ")
            set_run(r, size=11, color=BLUE)
            r = p.add_run(choice)
            set_run(r, size=10, color=TEXT)

    # 答题留白横线
    for _ in range(fill_lines):
        p = doc.add_paragraph()
        set_spacing(p, before=8, after=4)
        border_paragraph(p, bottom={"val": "dotted", "sz": 6, "color": LINE_DARK})

    # 问题之间留白
    p = doc.add_paragraph()
    set_spacing(p, before=2, after=2)


def add_data_table(doc, headers, rows):
    """带表头色块 + 斑马纹的数据表。"""
    tbl = doc.add_table(rows=len(rows) + 1, cols=len(headers))
    tbl.autofit = False

    # 表头
    for j, h in enumerate(headers):
        cell = tbl.rows[0].cells[j]
        shade_cell(cell, BLUE)
        set_cell_border(cell,
            top={"val": "single", "sz": "4", "color": BLUE},
            bottom={"val": "single", "sz": "4", "color": BLUE},
            left={"val": "single", "sz": "4", "color": BLUE},
            right={"val": "single", "sz": "4", "color": BLUE},
        )
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        set_spacing(p, before=2, after=2)
        r = p.add_run(h)
        set_run(r, size=10, bold=True, color="FFFFFF")
        cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER

    # 内容
    for i, row in enumerate(rows):
        for j, v in enumerate(row):
            cell = tbl.rows[i + 1].cells[j]
            shade_cell(cell, BG_WARM if i % 2 == 0 else "FFFFFF")
            set_cell_border(cell,
                top={"val": "single", "sz": "2", "color": LINE},
                bottom={"val": "single", "sz": "2", "color": LINE},
                left={"val": "single", "sz": "2", "color": LINE},
                right={"val": "single", "sz": "2", "color": LINE},
            )
            p = cell.paragraphs[0]
            set_spacing(p, before=3, after=3, line=1.4)
            r = p.add_run(v)
            set_run(r, size=10, color=TEXT)
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER


# =============================================================================
# 章节具体内容
# =============================================================================

def chapter_01(doc):
    add_section_top_strip(doc, label="CHAPTER  01  ·  DATA  LANDSCAPE")
    add_chapter_title(doc, 1, "数据全景盘点",
        "Inventory of the data assets across formats, locations and timespan",
        "厘清贵单位现有数据资产的【总量、形态、分布、时间跨度】,这是工时核算的最重要锚点——AI 工程的工作量,一半以上由此决定。")

    add_subsection(doc, "1.1", "总规模与形态分布")
    add_question(doc, 1,
        "贵单位目前累积的数据资产,可否分别按以下口径估算总体量?",
        hints=[
            "无需精确,数量级即可。例如纸质资料用【箱 / 米】估;电子文档用【GB】估。",
            "若分散在多人手里,请由教研负责人统筹大致汇总。",
        ],
        fill_lines=0,
    )
    add_data_table(doc,
        headers=["数据形态", "大致规模(请填)", "存放主要位置"],
        rows=[
            ["纸质教材 / 试卷 / 手稿", "                                    ", "                          "],
            ["Word 文档(.doc / .docx)", "                                    ", "                          "],
            ["Excel 表格(题库 / 数据)", "                                    ", "                          "],
            ["PDF(原生型,可复制文本)", "                                    ", "                          "],
            ["PDF(扫描型,本质是图片)", "                                    ", "                          "],
            ["图片(JPG / PNG)", "                                    ", "                          "],
            ["视频(MP4 / 其他)", "                                    ", "                          "],
            ["音频 / 录音(如有)", "                                    ", "                          "],
        ],
    )
    p = doc.add_paragraph()
    set_spacing(p, before=10, after=4)

    add_question(doc, 2,
        "上述数据资产中,你认为目前【真正具备 AI 训练价值】的核心子集大约占多少比例?",
        hints=[
            "例如:历史模拟卷、教研评语、专家课件等高密度知识资产。",
            "另一部分:重复采购的公开教辅、过期文件、个人作业稿等可剔除部分。",
        ],
    )

    add_subsection(doc, "1.2", "数据分散位置")
    add_question(doc, 3,
        "数据目前分散在哪些位置?请勾选所有适用项,并简要说明各位置占比。",
        choices=[
            "公司 NAS / 内部服务器(占比约 ___ %)",
            "公司私有云 / 内网共享盘(占比约 ___ %)",
            "个人办公电脑硬盘(占比约 ___ %)",
            "移动硬盘 / U 盘 / 老旧光盘(占比约 ___ %)",
            "公网云盘:钉钉 / 企业微信 / 飞书 / 百度 等(占比约 ___ %)",
            "兼职专家个人手中(尚未回收)",
            "印刷厂 / 外包合作方处",
            "其他:_____________________",
        ],
        fill_lines=0,
    )

    add_subsection(doc, "1.3", "存量与增量")
    add_question(doc, 4,
        "数据的时间跨度?最早可追溯到哪一年?完整保留到今天的数据占多大比例?",
        fill_lines=2,
    )
    add_question(doc, 5,
        "每月 / 每学期新增数据量大约多少?哪种形态(纸质 / Word / PDF / 图片)是主要增量来源?",
        hints=["这一项直接关系到是【一次性数据治理】还是【需要持续运营】。"],
        fill_lines=2,
    )
    add_question(doc, 6,
        "目前是否对存量数据做过任何形式的【数字化】 / 【索引建库】 / 【知识图谱】工作?若有,完成到什么程度?",
        fill_lines=3,
    )

    add_page_break(doc)


def chapter_02(doc):
    add_section_top_strip(doc, label="CHAPTER  02  ·  DATA  QUALITY")
    add_chapter_title(doc, 2, "数据质量与可用性",
        "Granular assessment of OCR feasibility, document hygiene and parse-ability",
        "评估每类数据被 AI 真正利用前需要多少前置加工——OCR 难度、手写比例、公式呈现方式、扫描型 PDF 占比,直接决定数据治理阶段的人力投入。")

    add_subsection(doc, "2.1", "纸质资料")
    add_question(doc, 7,
        "纸质资料中,以下各类的大致占比?(三项合计 100%)",
        choices=[
            "清晰印刷品(可直接机器扫描+OCR)— 约 ___ %",
            "老师手写稿 / 批注(需人工识别或专项 OCR)— 约 ___ %",
            "复印多次造成的模糊件 / 残缺件(需人工补抄)— 约 ___ %",
        ],
        fill_lines=0,
    )
    add_question(doc, 8,
        "纸质资料中是否大量包含【数学公式、化学方程式、几何图形、电路图、表格】?其中手写比例多少?",
        hints=["公式与图形的 OCR 比纯文本贵 3–8 倍,客观题与主观题的处理难度也截然不同。"],
        fill_lines=3,
    )
    add_question(doc, 9,
        "纸质资料的物理保存状态如何?是否存在霉变、装订过紧、纸张发黄等影响扫描质量的情况?",
        fill_lines=2,
    )

    add_subsection(doc, "2.2", "电子文档")
    add_question(doc, 10,
        "Word / Excel 文件是否有【统一命名规范】?是否有目录分类?能否举一两个真实的文件名做样例?",
        hints=["命名规范决定数据清洗阶段是【一行脚本】还是【一人一周】。"],
        fill_lines=3,
    )
    add_question(doc, 11,
        "Word 文档内的数学 / 化学公式是用什么方式呈现的?",
        choices=[
            "Word 公式编辑器(MathType / 原生公式)— AI 可直接解析",
            "图片插入(把公式截图贴进来)— 需 OCR 二次识别",
            "文字描述(如 x 平方加 y)— 需符号化",
            "混合,以上都有",
        ],
        fill_lines=0,
    )
    add_question(doc, 12,
        "贵单位的 PDF 文件中,【扫描型(本质是图片)】与【原生型(文本可复制)】的大致比例?",
        hints=["扫描型 PDF 的处理工时通常是原生型 PDF 的 5–10 倍。"],
        fill_lines=2,
    )

    add_subsection(doc, "2.3", "图片与视频")
    add_question(doc, 13,
        "图片资料主要是什么内容?分辨率大致多少?是否带标准命名?",
        choices=[
            "几何 / 物理 / 化学题示意图",
            "学生答题卡照片",
            "老师板书 / 课件截图",
            "教研活动现场照",
            "其他:_____________________",
        ],
        fill_lines=2,
    )
    add_question(doc, 14,
        "视频资料主要是什么内容?是否有字幕、讲稿或时间戳目录配套?",
        choices=[
            "上课实录(几小时 / 节)",
            "专家讲座 / 教研培训",
            "教研会议录像",
            "短视频(对外宣传)",
            "其他:_____________________",
        ],
        fill_lines=2,
    )

    add_subsection(doc, "2.4", "数据组织度")
    add_question(doc, 15,
        "在不依靠搜索的前提下,贵单位的老师能在 5 分钟内找到 3 年前某次具体联考的全部数据吗?这能反映你们目前的数据组织程度。",
        fill_lines=2,
    )
    add_question(doc, 16,
        "数据中是否有大量【重复样本】(同一份卷子多人各存一份)?估计冗余率多少?",
        fill_lines=2,
    )

    add_page_break(doc)


def chapter_03(doc):
    add_section_top_strip(doc, label="CHAPTER  03  ·  TACIT  KNOWLEDGE")
    add_chapter_title(doc, 3, "知识体系沉淀度",
        "Mapping the explicit-vs-tacit ratio of editorial expertise",
        "命题、审稿、教研培训等核心业务的【隐性知识】到底有多少已被文字化、流程化、可被 AI 学习?这一比例决定 prompt 工程与示例数据准备的工作量。")

    add_subsection(doc, "3.1", "命题工作的方法论显性化")
    add_question(doc, 17,
        "贵单位是否存在成文的【命题规范】 / 【教研标准】 / 【审稿手册】?可否提供 1–2 份样例供我方判断显性化程度?",
        hints=["若已成文 → prompt 工程量减半;若全在专家脑子里 → 需做大量访谈与样本回归。"],
        fill_lines=3,
    )
    add_question(doc, 18,
        "请用一段话描述贵单位顶尖命题专家【出一道试题】的真实流程(从需求到定稿),越细越好。",
        fill_lines=5,
    )
    add_question(doc, 19,
        "不同学科 / 不同专家之间,命题风格是否有显著差异?差异主要体现在哪些维度?",
        hints=["如:情境包装重 vs 题干简练、计算量大 vs 思维量大、传统型 vs 创新型 等。"],
        fill_lines=3,
    )

    add_subsection(doc, "3.2", "专家经验的留存形态")
    add_question(doc, 20,
        "贵单位约有十几位资深教研老师,每位老师手中的经验数据(Word 为主)大约规模如何?",
        hints=["请按【份数 / GB / 万字】口径估算。可分老师列举。"],
        fill_lines=4,
    )
    add_question(doc, 21,
        "这些经验文档是【系统整理过的精华】,还是【随手写的工作笔记】?是否有目录与摘要?",
        fill_lines=3,
    )
    add_question(doc, 22,
        "老师们的命题经验目前是否已发生过【自然传承】?是新人独立摸索,还是有完整的师徒制?",
        fill_lines=3,
    )

    add_subsection(doc, "3.3", "招牌产品资产")
    add_question(doc, 23,
        "贵单位的招牌品牌【启光中考】系列,是否已建立结构化的【题库】 / 【知识点图谱】 / 【难度区分度数据库】?数据规模如何?",
        fill_lines=3,
    )
    add_question(doc, 24,
        "近三年的客户学校联考成绩、阅卷答题数据是否完整保留?数据维度有哪些?(分数 / 知识点掌握率 / 学生作答详情等)",
        fill_lines=3,
    )

    add_page_break(doc)


def chapter_04(doc):
    add_section_top_strip(doc, label="CHAPTER  04  ·  COMPLIANCE")
    add_chapter_title(doc, 4, "数据合规与权属",
        "Copyright, PII and data-residency considerations",
        "AI 训练数据的合规风险与脱敏成本,是看不见但绕不开的一块投入。本章把红线扯清楚,避免后期发现问题再返工。")

    add_subsection(doc, "4.1", "版权与使用权")
    add_question(doc, 25,
        "数据中各类来源的占比?",
        choices=[
            "贵单位 100% 自有版权(自研命题 / 自制教辅) — 约 ___ %",
            "合作院校 / 兼职专家提供(签了协议) — 约 ___ %",
            "客户学校提供(联考数据 / 阅卷结果) — 约 ___ %",
            "公开渠道(教育部 / 各地考试院真题) — 约 ___ %",
            "其他第三方资料(其他出版社教辅、网络下载) — 约 ___ %",
        ],
        fill_lines=0,
    )
    add_question(doc, 26,
        "合作专家与贵单位签订的协议中,是否明确包含【数据可用于 AI 训练】的条款?如未明确,需要补签的难度如何?",
        fill_lines=3,
    )

    add_subsection(doc, "4.2", "个人隐私与敏感信息")
    add_question(doc, 27,
        "数据中是否含有学生信息(姓名 / 学号 / 班级 / 成绩 / 答题照片)?涉及多大比例的样本?",
        fill_lines=3,
    )
    add_question(doc, 28,
        "数据中是否含有客户学校的【内部信息】(教师姓名、学校排名、内部考试卷)?是否需要在训练前脱敏?",
        fill_lines=3,
    )
    add_question(doc, 29,
        "是否存在【政治敏感】或【舆情风险】内容(旧版政治题 / 历史题 / 涉外内容)?是否需要预筛?",
        fill_lines=3,
    )

    add_subsection(doc, "4.3", "数据出域与存储")
    add_question(doc, 30,
        "贵单位对 AI 系统的部署位置有何要求?",
        choices=[
            "公有云(阿里云 / 腾讯云,数据可出贵单位)",
            "私有云(部署在我方或第三方机房)",
            "贵单位自有机房(数据不出贵单位内网)",
            "贵单位内部专网(更严:不出物理楼栋)",
            "其他:_____________________",
        ],
        fill_lines=0,
    )
    add_question(doc, 31,
        "是否需要使用【国产化】基础设施(华为 / 麒麟 / 华为云 / 国产数据库等)?是否有强制要求?",
        fill_lines=2,
    )

    add_page_break(doc)


def chapter_05(doc):
    add_section_top_strip(doc, label="CHAPTER  05  ·  CAPABILITY  AMBITION")
    add_chapter_title(doc, 5, "智能体能力期望",
        "Prioritization of agent capabilities and success criteria",
        "确认贵单位最希望先上线的智能体能力,以及【替代率】期望——这决定首期模型精度阈值、所需训练数据量与验收标准。")

    add_subsection(doc, "5.1", "Agent 能力优先级")
    add_question(doc, 32,
        "在 Demo 中展示的 6 个核心 Agent,请按上线优先级排序(1 为最先,5–6 为远期)。",
        choices=[
            "① 命题策划官:把命题需求转为整卷蓝图              — 优先级:____",
            "② 真题分析师:抽取本省真题命题特征              — 优先级:____",
            "③ 命题执笔:原创命题(支持反馈迭代)            — 优先级:____",
            "④ 解析撰写:撰写答案与详细解析                  — 优先级:____",
            "⑤ 质检审核:6 维度评估难度 / 区分度 / 政治安全 — 优先级:____",
            "⑥ 主审定稿:整卷整体平衡审查                    — 优先级:____",
        ],
        fill_lines=0,
    )
    add_question(doc, 33,
        "除上述 6 个外,是否还有特别希望加入的能力?",
        choices=[
            "□ 配图绘制:自动生成几何 / 电路 / 统计图(SVG)",
            "□ 数据分析:学校联考成绩多维度分析",
            "□ 备考教练 Copilot:给教师备课用",
            "□ 学情诊断:针对学生群体的薄弱知识点定位",
            "□ 教研培训助手:辅助新教师成长",
            "□ 其他:_____________________",
        ],
        fill_lines=2,
    )

    add_subsection(doc, "5.2", "替代率与质量阈值")
    add_question(doc, 34,
        "AI 系统投产后,对【命题工作量】的替代率期望是?",
        choices=[
            "30% — AI 起草 + 老师精修(保守)",
            "60% — AI 主导 + 老师把关(主流目标)",
            "80%+ — AI 主导,老师只审最关键节点(激进)",
            "暂未明确,需要看试点效果",
        ],
        fill_lines=0,
    )
    add_question(doc, 35,
        "AI 产出的题目【质量阈值】如何评判?能否给一份现有题目让我方评估当前实际质量水平,作为对标基准?",
        fill_lines=3,
    )

    add_subsection(doc, "5.3", "使用人群与对外卖点")
    add_question(doc, 36,
        "上线初期面向的使用人群?(请选择主要用户)",
        choices=[
            "内部专职研发团队(60–70 人)",
            "兼职命题专家(1000+ 人)",
            "对接客户学校的教研老师",
            "客户学校的学生(C 端)",
            "其他:_____________________",
        ],
        fill_lines=0,
    )
    add_question(doc, 37,
        "上线后,贵单位希望对外重点强调的【商业卖点】是什么?(可多选并排序)",
        choices=[
            "出卷速度提升(原 X 天 / 套 → AI 后 Y 小时 / 套)",
            "命题质量上限拉高(更稳定 / 更原创 / 更适配本省)",
            "服务客单价提升(加 AI 诊断报告等增值)",
            "客户续约率提升",
            "成本下降(减少兼职稿费支出)",
            "其他:_____________________",
        ],
        fill_lines=2,
    )

    add_page_break(doc)


def chapter_06(doc):
    add_section_top_strip(doc, label="CHAPTER  06  ·  COLLABORATION")
    add_chapter_title(doc, 6, "配合度与项目节奏",
        "Internal commitment and project cadence expectations",
        "AI 项目的成败 60% 由【客户配合度】决定。本章对齐内部资源投入、数据交付节奏、里程碑预期与预算区间,确保方案落地不悬空。")

    add_subsection(doc, "6.1", "内部专家投入")
    add_question(doc, 38,
        "贵单位能否指派 1–2 名【熟悉业务+具有决策权】的项目对接人?",
        fill_lines=2,
    )
    add_question(doc, 39,
        "教研团队中,有多少位专家能够【全程深度参与】到训练数据准备、prompt 调优、效果验证?每位专家预计投入多少时间?",
        hints=["专家访谈 + 数据标注若由客户教研团队承担,周期可压缩 30–50%。"],
        fill_lines=3,
    )

    add_subsection(doc, "6.2", "数据交付节奏")
    add_question(doc, 40,
        "数据交付节奏倾向?",
        choices=[
            "一次性交付全部数据(集中治理,周期长但 ROI 高)",
            "分批交付(先核心学科 → 再扩展)",
            "滚动交付(边训练边补数据,持续迭代)",
        ],
        fill_lines=2,
    )
    add_question(doc, 41,
        "若分批交付,贵单位希望从哪个学科 / 哪个产品线开始?为什么?",
        fill_lines=3,
    )

    add_subsection(doc, "6.3", "项目里程碑")
    add_question(doc, 42,
        "贵单位期望的项目时间节点?",
        choices=[
            "MVP(最小可用版本)上线:____ 个月内",
            "正式投产(全学科全功能):____ 个月内",
            "覆盖全部研发与教研团队:____ 个月内",
        ],
        fill_lines=0,
    )
    add_question(doc, 43,
        "是否有具体的外部节点(如下一轮中考备考季、上级单位检查、年度发布)需要对齐?",
        fill_lines=2,
    )

    add_subsection(doc, "6.4", "预算区间")
    add_question(doc, 44,
        "贵单位对项目首期投入的预算区间?(仅作方案颗粒度参考,我方将分档给出对应方案。)",
        choices=[
            "□ 50–100 万",
            "□ 100–300 万",
            "□ 300–500 万",
            "□ 500–1000 万",
            "□ 1000 万以上",
            "□ 暂无明确数字,希望看到方案与 ROI 测算后再定",
        ],
        fill_lines=0,
    )
    add_question(doc, 45,
        "贵单位倾向的合作模式?",
        choices=[
            "一次性项目交付(包结果)",
            "里程碑分期付款",
            "年费订阅 + 服务",
            "联合研发 / 利益共享",
            "其他:_____________________",
        ],
        fill_lines=2,
    )

    add_page_break(doc)


def chapter_07(doc):
    add_section_top_strip(doc, label="CHAPTER  07  ·  IT  INTEGRATION")
    add_chapter_title(doc, 7, "现有系统与对接",
        "IT inventory and integration touchpoints",
        "评估现有 IT 基础与对接成本——是【从零搭建】还是【与现有系统对接】,直接决定集成阶段工时与后期运维成本。")

    add_subsection(doc, "7.1", "现有核心信息系统")
    add_question(doc, 46,
        "贵单位目前在使用的核心信息系统?请勾选,并简要说明哪些需要本项目对接。",
        choices=[
            "OA / 协同办公(钉钉 / 企微 / 飞书 / 自研)",
            "题库系统(自研 / 第三方)",
            "网阅 / 阅卷系统",
            "教研管理系统",
            "ERP / 财务系统",
            "印刷外协系统",
            "其他:_____________________",
        ],
        fill_lines=3,
    )

    add_subsection(doc, "7.2", "数据库与 IT 资源")
    add_question(doc, 47,
        "现有题库 / 业务数据库使用的技术栈?",
        choices=[
            "MySQL / PostgreSQL",
            "SQL Server / Oracle",
            "国产数据库(达梦 / 人大金仓 / OceanBase 等)",
            "NoSQL(MongoDB / Elasticsearch 等)",
            "其他:_____________________",
        ],
        fill_lines=2,
    )
    add_question(doc, 48,
        "贵单位是否有专职 IT 团队?规模多少?是否能配合做接口对接 / 部署 / 运维?",
        fill_lines=3,
    )

    add_subsection(doc, "7.3", "部署环境与终端")
    add_question(doc, 49,
        "AI 系统的算力承载方式倾向?",
        choices=[
            "调用公有云 LLM API(OpenAI / 通义 / 文心 / 智谱 等)",
            "私有云部署开源模型(Llama / Qwen 等)",
            "贵单位本地 GPU 服务器(纯私有部署)",
            "混合(关键流程本地 + 其余调 API)",
        ],
        fill_lines=2,
    )
    add_question(doc, 50,
        "终端使用环境?哪些设备需要被支持?",
        choices=[
            "Windows PC(主流)",
            "Mac",
            "iPad / Android Pad",
            "手机(微信小程序 / H5)",
            "其他:_____________________",
        ],
        fill_lines=2,
    )

    add_page_break(doc)


# =============================================================================
# 附录:工作量核算模型预览
# =============================================================================

def appendix(doc):
    add_section_top_strip(doc, label="APPENDIX  ·  COSTING  MODEL")
    add_chapter_title(doc, 0, "工作量核算模型预览",
        "How we translate data status into a transparent quote",
        "本附录展示我方将如何把问卷结果换算为工作量与报价——非最终报价,仅为方法说明,帮助贵单位理解每一笔投入花在何处。")

    add_subsection(doc, "A.1", "六大工作量科目")

    add_data_table(doc,
        headers=["工作量科目", "核算口径(示意)", "影响因素"],
        rows=[
            ["数据治理(OCR / 清洗 / 结构化)", "每 1000 页纸 ≈ X 人天", "扫描型 PDF / 手写比例 / 公式比例"],
            ["专家访谈与方法论提取", "每位专家 ≈ X 人天", "命题规范成文程度 / 配合时间"],
            ["训练数据标注(题目 / 答案 / 知识点)", "每 1000 题 ≈ X 人天", "题型复杂度 / 主观题比例"],
            ["Prompt 工程与多 Agent 编排", "每个 Agent ≈ X 人周", "业务方法论复杂度 / 反馈迭代轮次"],
            ["大模型微调与评测", "每轮 ≈ X 人周 + 算力费", "数据规模 / 模型规格 / 指标精度"],
            ["系统集成与对接(API / 网阅 / 题库)", "每个接入点 ≈ X 人周", "现有系统标准化程度"],
        ],
    )
    p = doc.add_paragraph()
    set_spacing(p, before=8, after=8)

    add_subsection(doc, "A.2", "三档方案预览")
    add_data_table(doc,
        headers=["方案档", "覆盖能力", "适用预算"],
        rows=[
            ["铂金档", "完整 6 Agent + 配图 + 数据分析 + 培训 + 网阅集成 + 国产化部署", "500 万以上"],
            ["黄金档", "完整 6 Agent + 配图 + 数据分析 + 私有云部署", "200 - 500 万"],
            ["银档(MVP)", "命题执笔 + 解析 + 质检 三个核心 Agent + 公有云 API", "80 - 200 万"],
        ],
    )
    p = doc.add_paragraph()
    set_spacing(p, before=10, after=10)

    add_subsection(doc, "A.3", "项目周期参考")
    add_data_table(doc,
        headers=["阶段", "周期", "里程碑产出"],
        rows=[
            ["①  数据资产盘点与治理", "4–8 周", "可被 AI 读取的结构化语料库 V1"],
            ["②  Agent 训练与 prompt 调优", "6–10 周", "MVP 智能体内测版,通过教研评审"],
            ["③  系统集成与试点上线", "4–6 周", "对接现有题库 / 网阅,小范围内测"],
            ["④  全量上线与持续运营", "持续", "性能监控 / 数据扩充 / 模型迭代"],
        ],
    )

    p = doc.add_paragraph()
    set_spacing(p, before=16, after=4, line=1.7)
    border_paragraph(p, top={"sz": 18, "color": GOLD})

    p = doc.add_paragraph()
    set_spacing(p, before=8, after=4)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("⬢  让看不见的工作变得可计量  ⬢")
    set_run(r, size=11, bold=True, color=GOLD)

    p = doc.add_paragraph()
    set_spacing(p, before=2, after=4)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("MAKE  THE  INVISIBLE  WORK  MEASURABLE")
    set_run(r, size=9, color=GOLD, name=FONT_EN)
    rPr = r._element.get_or_add_rPr()
    sp = OxmlElement("w:spacing")
    sp.set(qn("w:val"), "100")
    rPr.append(sp)


# =============================================================================
# 末页:签字与回执
# =============================================================================

def back_cover(doc):
    add_page_break(doc)
    add_section_top_strip(doc, label="ACKNOWLEDGEMENT  ·  问卷回执")

    p = doc.add_paragraph()
    set_spacing(p, before=24, after=12, line=1.85)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("感  谢  贵  单  位  的  共  同  完  成")
    set_run(r, size=24, bold=True, color=RED)
    rPr = r._element.get_or_add_rPr()
    sp = OxmlElement("w:spacing")
    sp.set(qn("w:val"), "200")
    rPr.append(sp)

    p = doc.add_paragraph()
    set_spacing(p, before=6, after=24, line=1.8)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("THANK  YOU  FOR  THE  PARTNERSHIP")
    set_run(r, size=10, color=GOLD, name=FONT_EN)
    rPr = r._element.get_or_add_rPr()
    sp = OxmlElement("w:spacing")
    sp.set(qn("w:val"), "180")
    rPr.append(sp)

    p = doc.add_paragraph()
    set_spacing(p, before=8, after=10, line=1.85)
    r = p.add_run(
        "本问卷的填写结果将作为我方制定【最终交付方案】与【正式商务报价】的事实依据。"
        "我方将在收到回执后 5 个工作日内,出具一份《数据完备度评估报告》及"
        "一份基于贵单位真实数据状况的【三档分级报价】供贵单位决策。"
    )
    set_run(r, size=11, color=TEXT)
    p.paragraph_format.first_line_indent = Pt(24)

    # 签字栏
    p = doc.add_paragraph()
    set_spacing(p, before=32, after=8)

    tbl = doc.add_table(rows=2, cols=2)
    tbl.autofit = False
    titles = [
        ("贵方填写人 / 职位", "贵方负责人签字"),
        ("我方对接人 / 职位", "我方负责人签字"),
    ]
    for i, (left, right) in enumerate(titles):
        cl, cr = tbl.rows[i].cells
        cl.width = Cm(8)
        cr.width = Cm(8)
        for cell, text in [(cl, left), (cr, right)]:
            shade_cell(cell, BG_WARM)
            set_cell_border(cell,
                top={"val": "single", "sz": "4", "color": LINE},
                bottom={"val": "single", "sz": "4", "color": LINE},
                left={"val": "single", "sz": "4", "color": LINE},
                right={"val": "single", "sz": "4", "color": LINE},
            )
            p = cell.paragraphs[0]
            set_spacing(p, before=4, after=2)
            r = p.add_run(text)
            set_run(r, size=10, bold=True, color=BLUE)
            # 添加空行用于签字
            for _ in range(3):
                cell.add_paragraph()

    # 底部 AI 装饰带
    for _ in range(2):
        p = doc.add_paragraph()
        set_spacing(p, before=8, after=2)

    p = doc.add_paragraph()
    set_spacing(p, before=14, after=4)
    border_paragraph(p, top={"sz": 18, "color": BLUE})

    p = doc.add_paragraph()
    set_spacing(p, before=6, after=2)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("◢ ◤   QIGUANG   ·   AI   ·   PARTNERSHIP   ◥ ◣")
    set_run(r, size=10, bold=True, color=GOLD, name=FONT_EN)
    rPr = r._element.get_or_add_rPr()
    sp = OxmlElement("w:spacing")
    sp.set(qn("w:val"), "150")
    rPr.append(sp)

    p = doc.add_paragraph()
    set_spacing(p, before=2, after=2)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("▲△▼▽◇◆◇◆◇◆◇◆◇◆◇◆◇◆◇◆◇◆◇◆◇◆◇◆◇◆")
    set_run(r, size=10, color=GOLD)


# =============================================================================
# 主流程
# =============================================================================

def main():
    doc = init_document()
    add_header_footer(doc)
    add_cover(doc)
    add_preface(doc)
    chapter_01(doc)
    chapter_02(doc)
    chapter_03(doc)
    chapter_04(doc)
    chapter_05(doc)
    chapter_06(doc)
    chapter_07(doc)
    appendix(doc)
    back_cover(doc)

    out = "qiguang_agent/outputs/启光教研AI系统_数据完备度访谈问卷.docx"
    import os
    os.makedirs(os.path.dirname(out), exist_ok=True)
    doc.save(out)
    print(f"OK -> {out}")


if __name__ == "__main__":
    main()
