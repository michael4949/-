# -*- coding: utf-8 -*-
"""参赛 PPT 公共库：严格基于客户《附件3-2 申报 PPT 模板》原件（python-pptx 在模板文件上直接改）。
骨架：保留封面 / 知识产权声明 / 五张目录页 / 汇报完毕页与全部版式、母版、logo、配色、字体；
删除五张"内容要点"页，由各产品脚本按要点逐条新增内容页（模板 仅标题 版式）；
内容页只用模板色（#002060 / #2E5495 / #003679 / #CDCDCD / #F2F2F2）与 微软雅黑。
用法：见 gen_ppt_banzu_tpl.py / gen_ppt_peilian_tpl.py。"""
import os
from PIL import Image
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.chart.data import CategoryChartData
from pptx.enum.chart import XL_CHART_TYPE, XL_LABEL_POSITION
from pptx.oxml.ns import qn
from lxml import etree

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NAVY, BLUE, DBLUE, GRAY, LIGHT, INK, MUTE, WHITE, LINE = '002060', '2E5495', '003679', 'CDCDCD', 'F2F2F2', '262626', '595959', 'FFFFFF', 'BFBFBF'
FONT = '微软雅黑'
rgb = lambda h: RGBColor.from_string(h)

# ---------- 文字 ----------
def set_font(run, size=None, bold=None, color=None, latin=FONT, italic=None):
    f = run.font
    if size: f.size = Pt(size)
    if bold is not None: f.bold = bold
    if italic is not None: f.italic = italic
    if color: f.color.rgb = rgb(color)
    f.name = latin
    rPr = run._r.get_or_add_rPr(); rPr.set('lang', 'zh-CN'); rPr.set('altLang', 'en-US')
    for tag in ('a:ea', 'a:cs'):
        el = rPr.find(qn(tag))
        if el is None: el = etree.SubElement(rPr, qn(tag))
        el.set('typeface', FONT)

def para(tf, text, size=12, bold=False, color=INK, align=None, first=False, bullet=False, space=None, lsp=None, latin=FONT):
    p = tf.paragraphs[0] if first else tf.add_paragraph()
    if align: p.alignment = align
    if lsp: p.line_spacing = lsp
    if space is not None: p.space_after = Pt(space)
    runs = text if isinstance(text, list) else [(text, {})]
    for t, o in runs:
        r = p.add_run(); r.text = t
        set_font(r, o.get('size', size), o.get('bold', bold), o.get('color', color), o.get('latin', latin))
    if bullet:
        pPr = p._p.get_or_add_pPr(); pPr.set('marL', '228600'); pPr.set('indent', '-228600')
        bf = etree.SubElement(pPr, qn('a:buFont')); bf.set('typeface', 'Arial')
        bc = etree.SubElement(pPr, qn('a:buChar')); bc.set('char', '•')
    return p

def tb(s, x, y, w, h, text, size=12, bold=False, color=INK, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, lsp=None, margin=0.05, wrap=True):
    box = s.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = box.text_frame; tf.word_wrap = wrap; tf.vertical_anchor = anchor
    tf.margin_left = tf.margin_right = Inches(margin); tf.margin_top = tf.margin_bottom = Inches(0.03)
    lines = text if isinstance(text, list) else [text]
    for i, t in enumerate(lines):
        if isinstance(t, dict): para(tf, t['t'], t.get('size', size), t.get('bold', bold), t.get('color', color), align, i == 0, t.get('bullet', False), t.get('space'), lsp)
        else: para(tf, t, size, bold, color, align, i == 0, False, None, lsp)
    return box

def rect(s, x, y, w, h, fill=LIGHT, line=None, shape=MSO_SHAPE.RECTANGLE, lw=0.75):
    r = s.shapes.add_shape(shape, Inches(x), Inches(y), Inches(w), Inches(h))
    r.shadow.inherit = False
    if fill: r.fill.solid(); r.fill.fore_color.rgb = rgb(fill)
    else: r.fill.background()
    if line: r.line.color.rgb = rgb(line); r.line.width = Pt(lw)
    else: r.line.fill.background()
    r.text_frame.text = ''
    return r

def label(s, x, y, w, h, text, fill=BLUE, color=WHITE, size=13, bold=True, align=PP_ALIGN.CENTER, shape=MSO_SHAPE.RECTANGLE):
    r = rect(s, x, y, w, h, fill, None, shape)
    tf = r.text_frame; tf.word_wrap = True; tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    tf.margin_left = tf.margin_right = Inches(0.06); tf.margin_top = tf.margin_bottom = Inches(0.02)
    para(tf, text, size, bold, color, align, True)
    return r

def pic(s, path, x, y, w=None, h=None, border=LINE):
    im = Image.open(path); ar = im.height / im.width
    if w is None: w = h / ar
    if h is None: h = w * ar
    p = s.shapes.add_picture(path, Inches(x), Inches(y), Inches(w), Inches(h))
    if border: p.line.color.rgb = rgb(border); p.line.width = Pt(0.75)
    return w, h

def circle(s, x, y, d, text, fill=BLUE, size=14):
    return label(s, x, y, d, d, text, fill, WHITE, size, True, PP_ALIGN.CENTER, MSO_SHAPE.OVAL)

# ---------- 页面骨架（照模板内容页：标题占位符 + 粗体小标题） ----------
def sec(prs, layout, title, sub, note=''):
    s = prs.slides.add_slide(layout)
    t = s.shapes.title
    t.left, t.top, t.width, t.height = Emu(55002), Emu(181637), Emu(8138082), Emu(418058)
    tf = t.text_frame; tf.text = ''
    para(tf, title, 24, True, NAVY, None, True)
    if sub:
        rect(s, 0.35, 1.02, 0.1, 0.3, NAVY)
        tb(s, 0.52, 0.95, 11.5, 0.45, sub, 18, True, INK, anchor=MSO_ANCHOR.MIDDLE)
    if note: s.notes_slide.notes_text_frame.text = note
    return s

def card(s, x, y, w, h, title, body, size=11.5, hh=0.42, fill=LIGHT, tsize=13):
    label(s, x, y, w, hh, title, BLUE, WHITE, tsize)
    rect(s, x, y + hh, w, h - hh, fill, LINE)
    tb(s, x + 0.08, y + hh + 0.08, w - 0.16, h - hh - 0.16, body if isinstance(body, list) else [body], size, False, INK, lsp=1.15, margin=0.08)

def numrow(s, x, y, w, h, n, title, body, size=11.5, d=0.5):
    rect(s, x, y, w, h, LIGHT, LINE)
    circle(s, x + 0.15, y + (h - d) / 2, d, str(n), BLUE, 14)
    tb(s, x + 0.15 + d + 0.15, y + 0.06, w - d - 0.45, 0.32, title, 13, True, NAVY, anchor=MSO_ANCHOR.MIDDLE)
    tb(s, x + 0.15 + d + 0.15, y + 0.38, w - d - 0.45, h - 0.42, body, size, False, INK, lsp=1.12)

def stat(s, x, y, w, h, num, unit, lab, desc, nsize=36):
    rect(s, x, y, w, h, LIGHT, LINE); rect(s, x, y, w, 0.08, BLUE)
    b = s.shapes.add_textbox(Inches(x + 0.15), Inches(y + 0.2), Inches(w - 0.3), Inches(0.8)); tf = b.text_frame; tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    para(tf, [(num, {'size': nsize, 'bold': True, 'color': BLUE, 'latin': 'Arial'}), ('  ' + unit, {'size': 13, 'bold': True, 'color': NAVY})], first=True)
    tb(s, x + 0.15, y + 1.05, w - 0.3, 0.4, lab, 13, True, INK, anchor=MSO_ANCHOR.MIDDLE)
    tb(s, x + 0.15, y + 1.45, w - 0.3, h - 1.55, desc, 10.5, False, MUTE, lsp=1.12)

def table(s, x, y, w, cols, rows, rh=0.5, hh=0.42, size=10.5, widths=None, first_bold=True):
    n, m = len(rows) + 1, len(cols)
    shp = s.shapes.add_table(n, m, Inches(x), Inches(y), Inches(w), Inches(hh + rh * len(rows)))
    tbl = shp.table
    tblPr = tbl._tbl.tblPr
    for a in ('bandRow', 'firstRow'): tblPr.set(a, '0')
    st = tblPr.find(qn('a:tableStyleId'))
    if st is None: st = etree.SubElement(tblPr, qn('a:tableStyleId'))
    st.text = '{2D5ABB26-0587-4C30-8999-92F81FD0307C}'
    widths = widths or [w / m] * m
    for j, cw in enumerate(widths): tbl.columns[j].width = Inches(cw)
    tbl.rows[0].height = Inches(hh)
    for i in range(1, n): tbl.rows[i].height = Inches(rh)
    def cell(i, j, text, fill, color, bold, sz):
        c = tbl.cell(i, j); c.fill.solid(); c.fill.fore_color.rgb = rgb(fill)
        c.margin_left = c.margin_right = Inches(0.08); c.margin_top = c.margin_bottom = Inches(0.04); c.vertical_anchor = MSO_ANCHOR.MIDDLE
        tf = c.text_frame; tf.word_wrap = True; tf.text = ''
        para(tf, text, sz, bold, color, None, True, lsp=1.08)
        tcPr = c._tc.get_or_add_tcPr()
        for tag in ('a:lnL', 'a:lnR', 'a:lnT', 'a:lnB'):
            ln = etree.SubElement(tcPr, qn(tag)); ln.set('w', '6350')
            sf = etree.SubElement(ln, qn('a:solidFill')); clr = etree.SubElement(sf, qn('a:srgbClr')); clr.set('val', 'FFFFFF' if i == 0 else LINE)
        fillel = tcPr.find(qn('a:solidFill'))
        if fillel is not None: tcPr.remove(fillel); tcPr.append(fillel)
    for j, c in enumerate(cols): cell(0, j, c, BLUE, WHITE, True, size + 0.5)
    for i, r in enumerate(rows):
        for j, t in enumerate(r): cell(i + 1, j, t, LIGHT if i % 2 == 0 else WHITE, INK, first_bold and j == 0, size)
    return tbl

def chevron_flow(s, x, y, w, h, items, size=12):
    g = 0.06; cw = (w - g * (len(items) - 1)) / len(items)
    for i, t in enumerate(items):
        label(s, x + i * (cw + g), y, cw, h, t, BLUE if i % 2 == 0 else DBLUE, WHITE, size, True, PP_ALIGN.CENTER, MSO_SHAPE.PENTAGON if i == 0 else MSO_SHAPE.CHEVRON)

def bar_chart(s, x, y, w, h, title, cats, vals, fmt='0"%"', vmax=100):
    cd = CategoryChartData(); cd.categories = cats; cd.add_series(title, vals)
    rect(s, x, y, w, h, WHITE, LINE)
    gf = s.shapes.add_chart(XL_CHART_TYPE.COLUMN_CLUSTERED, Inches(x + 0.1), Inches(y + 0.05), Inches(w - 0.2), Inches(h - 0.1), cd); ch = gf.chart
    ch.has_legend = False; ch.has_title = True; ch.chart_title.text_frame.text = title
    set_font(ch.chart_title.text_frame.paragraphs[0].runs[0], 12, True, NAVY)
    pl = ch.plots[0]; pl.gap_width = 80; pl.has_data_labels = True; dl = pl.data_labels; dl.number_format = fmt; dl.number_format_is_linked = False; dl.position = XL_LABEL_POSITION.OUTSIDE_END; dl.font.size = Pt(10); dl.font.color.rgb = rgb(INK)
    ser = pl.series[0]; ser.format.fill.solid(); ser.format.fill.fore_color.rgb = rgb(BLUE)
    ca = ch.category_axis; ca.tick_labels.font.size = Pt(10); ca.tick_labels.font.color.rgb = rgb(INK); ca.format.line.color.rgb = rgb(LINE)
    va = ch.value_axis; va.maximum_scale = vmax; va.minimum_scale = 0; va.tick_labels.font.size = Pt(9); va.tick_labels.font.color.rgb = rgb(MUTE); va.has_major_gridlines = True; va.major_gridlines.format.line.color.rgb = rgb('E0E0E0'); va.format.line.fill.background()
    return ch

def walk(shapes):
    for sh in shapes:
        if sh.shape_type == 6: yield from walk(sh.shapes)
        else: yield sh

# ---------- 模板骨架：打开 / 封面 / 结尾 / 收尾 ----------
def open_template(tpl):
    prs = Presentation(tpl)
    S = list(prs.slides)
    parts = dict(cover=S[0], decl=S[1], toc=[S[2], S[4], S[6], S[8], S[10]], outline=[S[3], S[5], S[7], S[9], S[11]], thanks=S[12])
    lay = prs.slide_layouts[2]  # 仅标题：标题占位符 + 蓝线 + logo + 页码
    return prs, lay, parts

def fill_cover(cover, title, subtitle, team, unit, date, note=''):
    for sh in list(cover.shapes):
        t = sh.text_frame.text if sh.has_text_frame else ''
        if '模板仅供参考' in t: sh._element.getparent().remove(sh._element)
        elif '请输入您的成果名称' in t:
            sh.top = Inches(3.72); sh.height = Inches(1.3)
            tf = sh.text_frame; p0 = tf.paragraphs[0]
            for r in p0.runs[1:]: r._r.getparent().remove(r._r)
            p0.runs[0].text = title; set_font(p0.runs[0], 48, True, '2C4E8F')
            p1 = tf.add_paragraph(); p1.alignment = PP_ALIGN.CENTER
            r = p1.add_run(); r.text = subtitle; set_font(r, 24, True, '2C4E8F')
        elif '请输入您的团队名称' in t:
            for r in sh.text_frame.paragraphs[0].runs: r.text = ''
            sh.text_frame.paragraphs[0].runs[0].text = team
        elif 'XX' in t and '单位' in t:
            ps = sh.text_frame.paragraphs
            for p in ps:
                for r in p.runs: r.text = ''
            ps[0].runs[0].text = unit
            if len(ps) > 1: ps[1].runs[0].text = date
    if note: cover.notes_slide.notes_text_frame.text = note

def fill_thanks(thanks, team, reporter='（填写姓名）', time='2026 年 10 月', note='谢谢各位评委。'):
    for sh in walk(thanks.shapes):
        if not sh.has_text_frame: continue
        txt = sh.text_frame.text
        runs = [r for p in sh.text_frame.paragraphs for r in p.runs]
        if '请输入您的团队名称' in txt:
            for r in runs:
                if r.text == '请输入您的团队名称': r.text = team
        elif '汇报人' in txt:
            for r in runs:
                if r.text.strip() == 'XXX': r.text = reporter
        elif '时间' in txt:
            done = False
            for r in runs:
                if r.text.startswith('时间'): continue
                if not done: r.text = time; done = True
                else: r.text = ''
        if '汇报人' in txt or '时间' in txt: sh.text_frame.word_wrap = False
    thanks.notes_slide.notes_text_frame.text = note

def finish(prs, parts, new, out):
    """删除模板的五张要点页，按“目录 → 本段内容页”重排并保存。new = {0: [slides], …, 4: [slides]}"""
    sldIdLst = prs.slides._sldIdLst
    id_of = {}
    for sid in list(sldIdLst): id_of[prs.part.related_part(sid.rId)] = sid
    def sid(slide): return id_of[slide.part]
    for o in parts['outline']:
        e = sid(o); prs.part.drop_rel(e.rId); sldIdLst.remove(e)
    order = [sid(parts['cover']), sid(parts['decl'])]
    for k in range(5):
        order.append(sid(parts['toc'][k])); order += [sid(x) for x in new[k]]
    order.append(sid(parts['thanks']))
    for e in list(sldIdLst): sldIdLst.remove(e)
    for e in order: sldIdLst.append(e)
    prs.save(out); print('ok', out, len(order), 'slides')
