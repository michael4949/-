# -*- coding: utf-8 -*-
"""参赛 PPT · 高效班组管理助手 —— 严格基于客户《附件3-2 申报 PPT 模板》原件制作。
用法：python3 gen_ppt_banzu_tpl.py <模板.pptx>
做法：在模板文件上直接改——保留封面 / 知识产权声明 / 五张目录页 / 汇报完毕页与全部版式、母版、logo、配色、字体；
删除五张“内容要点”页，按其要点逐条新增内容页（模板 仅标题 版式：标题占位符 + 蓝线 + logo + 页码）；
内容页只用模板色：标题 #002060、主蓝 #2E5495、深蓝 #003679、灰 #CDCDCD / #F2F2F2，字体 微软雅黑。
站位结构与申报书 V2.0 一致（开篇讲公司为什么要做，结尾价值定位呼应）。"""
import os, sys, copy
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
SHOT = lambda n: os.path.join(ROOT, 'banzu', 'shots', 'vis', 'sb_%s.png' % n)
DIAG = lambda n: os.path.join(ROOT, 'banzu', 'diagrams', 'out', '高效班组管理助手_%s.png' % n)
OUT = os.path.join(ROOT, 'docs', '正式交付物', '申报PPT_高效班组管理助手_班组数字画像与班组长AI助手_V3.0.pptx')

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

def stat(s, x, y, w, h, num, unit, lab, desc):
    rect(s, x, y, w, h, LIGHT, LINE); rect(s, x, y, w, 0.08, BLUE)
    b = s.shapes.add_textbox(Inches(x + 0.15), Inches(y + 0.2), Inches(w - 0.3), Inches(0.8)); tf = b.text_frame; tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    para(tf, [(num, {'size': 36, 'bold': True, 'color': BLUE, 'latin': 'Arial'}), ('  ' + unit, {'size': 13, 'bold': True, 'color': NAVY})], first=True)
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
        # tcPr 子元素顺序：lnL lnR lnT lnB ... solidFill —— 把 fill 移到边框之后
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

# ---------- 主流程 ----------
def main(tpl):
    prs = Presentation(tpl)
    S = list(prs.slides)
    cover, decl, toc = S[0], S[1], [S[2], S[4], S[6], S[8], S[10]]
    outline = [S[3], S[5], S[7], S[9], S[11]]; thanks = S[12]
    lay = prs.slide_layouts[2]  # 仅标题：标题占位符 + 蓝线 + logo + 页码

    # 封面：成果名称 / 团队名称 / 单位 / 日期；删除红字提示
    for sh in list(cover.shapes):
        t = sh.text_frame.text if sh.has_text_frame else ''
        if '模板仅供参考' in t: sh._element.getparent().remove(sh._element)
        elif '请输入您的成果名称' in t:
            sh.top = Inches(3.72); sh.height = Inches(1.3)
            tf = sh.text_frame; p0 = tf.paragraphs[0]
            for r in p0.runs[1:]: r._r.getparent().remove(r._r)
            p0.runs[0].text = '高效班组管理助手'; set_font(p0.runs[0], 48, True, '2C4E8F')
            p1 = tf.add_paragraph(); p1.alignment = PP_ALIGN.CENTER
            r = p1.add_run(); r.text = '班组数字画像与班组长AI助手'; set_font(r, 24, True, '2C4E8F')
        elif '请输入您的团队名称' in t:
            for r in sh.text_frame.paragraphs[0].runs: r.text = ''
            sh.text_frame.paragraphs[0].runs[0].text = '高效班组管理助手项目组'
        elif 'XX' in t and '单位' in t:
            ps = sh.text_frame.paragraphs
            for p in ps:
                for r in p.runs: r.text = ''
            ps[0].runs[0].text = '深圳供电局有限公司'
            if len(ps) > 1: ps[1].runs[0].text = '二〇二六年十月'
    cover.notes_slide.notes_text_frame.text = '各位评委好。我们申报的成果是「高效班组管理助手」：班组数字画像与班组长AI助手，应用场景在光明供电局配网资产部的三个班组。'

    # 结尾页（汇报人 / 时间在组合形状里，递归遍历）
    def walk(shapes):
        for sh in shapes:
            if sh.shape_type == 6: yield from walk(sh.shapes)
            else: yield sh
    for sh in walk(thanks.shapes):
        if not sh.has_text_frame: continue
        txt = sh.text_frame.text
        runs = [r for p in sh.text_frame.paragraphs for r in p.runs]
        if '请输入您的团队名称' in txt:
            for r in runs:
                if r.text == '请输入您的团队名称': r.text = '高效班组管理助手项目组'
        elif '汇报人' in txt:
            for r in runs:
                if r.text.strip() == 'XXX': r.text = '（填写姓名）'
        elif '时间' in txt:
            done = False
            for r in runs:
                if r.text.startswith('时间'): continue
                if not done: r.text = '2026 年 10 月'; done = True
                else: r.text = ''
        if '汇报人' in txt or '时间' in txt: sh.text_frame.word_wrap = False
    thanks.notes_slide.notes_text_frame.text = '谢谢各位评委。'

    new = {0: [], 1: [], 2: [], 3: [], 4: []}
    # ================= 一、成果介绍 =================
    T1 = '一、成果介绍'
    s = sec(prs, lay, T1, '应用介绍 · 业务需求来源及需求内容', '先讲公司为什么要做：各系统已经各自数字化，但在班组这一级数据仍然分散，班组长靠查数、抄数、汇编做判断。转型落到基层的标志，是班组长在一屏画像上做判断。')
    new[0].append(s)
    for i, (t, b) in enumerate([
        ('班组是最基层的生产组织', '电网企业各项管理要求最终落地的地方。班组强则公司强，班组层是数字化转型的最后一公里。'),
        ('系统已数字化，班组层仍分散', '南方电网公司持续推进数字化转型与数字电网建设，人资系统、工分制考核、OMS、OCS、电网管理平台、党建系统已各自数字化，到班组这一级仍是一本本台账。'),
        ('班组长靠查数、抄数、汇编', '派工看证书、授权、工时、冲突；考评看履职证据与工作量；星级对照标准找差距。逐系统查看后手工汇编，依据难留痕。'),
        ('转型落到基层的标志', '班组长不再抄数，而是在一屏画像上做判断；部门对所辖班组的队伍状态有统一视图。')]):
        card(s, 0.35 + i * 3.2, 1.5, 3.03, 2.45, t, b, 12)
    label(s, 0.35, 4.2, 1.5, 0.45, '需求内容', NAVY)
    for i, t in enumerate(['班组整体画像', '班员画像与作业授权认证', '派工推荐与审票', '绩效系数与激励分配', '关怀提醒与风险处置', '部门考核指标与班长绩效']):
        label(s, 1.95 + i * 1.84, 4.2, 1.76, 0.45, t, LIGHT, INK, 11, False)
    label(s, 0.35, 4.85, 1.5, 0.45, '需求来源', NAVY)
    tb(s, 1.95, 4.8, 11.0, 0.6, '光明供电局配网资产部三个班组的现场调研与六份客户材料；《星级班组评价标准》；《技能类岗位胜任能力评价作业授权认证表》；2026 年度员工业绩责任书；工分制考核办法；配网自动化运行周报。', 11.5, anchor=MSO_ANCHOR.MIDDLE, lsp=1.15)
    rect(s, 0.35, 5.6, 12.63, 1.1, LIGHT, LINE)
    tb(s, 0.5, 5.65, 12.3, 1.0, [{'t': '需求本质', 'bold': True, 'color': NAVY, 'size': 12.5}, {'t': '数据分散在系统与台账之间，班组这一级没有一屏画像，判断与依据分离。班组长要“派得准、带得好、评得公、管得住”，部门要“看得全、督得到、配得动”，今天全靠逐个系统、逐本台账查看后手工汇编。', 'size': 11.5}], lsp=1.15, anchor=MSO_ANCHOR.MIDDLE)

    s = sec(prs, lay, T1, '应用介绍 · 适用的业务场景和目标用户', '应用场景是光明供电局配网资产部三个班组 31 人；两类用户共用一个数据底座：班组长端 12 页、管理者端 9 页，小瓦特 AI 助手贯穿两端。')
    new[0].append(s)
    card(s, 0.35, 1.5, 4.3, 1.35, '业务场景', '光明供电局配网资产部 · 配电自动化班 / 试验班 / 配电运维一班 · 31 人。演示数据按班组真实业务框架脱敏构建。', 11.5)
    card(s, 0.35, 3.0, 4.3, 1.7, '目标用户一：班组长', '12 个功能页，按“班组整体 → 人员情况 → 日常业务”故事线组织：班组画像；班员画像、授权认证、培养与梯队、绩效与激励、关怀与文化、分析参谋；今日工作台、用工安排、知识库、台账中心、问小瓦特。', 11)
    card(s, 0.35, 4.85, 4.3, 1.5, '目标用户二：部门管理者', '9 个功能页，“业务指标 + 队伍管理”两条主线：考核指标、班组横向对比；团队画像总览、班长绩效、人员总览、班组结构对比、团队风险画像、员工关怀、分析参谋。', 11)
    tb(s, 0.35, 6.45, 4.3, 0.4, '共用十七张台账的数据底座；小瓦特 AI 助手贯穿两端；管理者的每个动作落到班组长的通知或确认。', 10.5, color=MUTE, lsp=1.1)
    pic(s, DIAG('业务架构'), 4.85, 1.5, w=8.13)

    s = sec(prs, lay, T1, '应用介绍 · 应用核心优势', '五个核心优势：十七张台账同源、四条派工规则可解释、六环闭环可生长、两级同源可协同、所有涉及人的结论由人确认。')
    new[0].append(s)
    for i, (n, u, l, d) in enumerate([('17', '张', '台账同源', '画像、看板、文稿中的每个数字可点开回溯至台账原始行'), ('4', '条', '派工规则可解释', '证书、核心模块授权、本周工时、当日冲突；推荐与排除理由随单存档'), ('6', '环', '闭环可生长', '能力识别 → 精准培养 → 实践锻炼 → 评价反馈 → 激励应用 → 再提升'), ('2', '级', '管理可协同', '班组长与管理者共用数据底座，一步操作即时反映到管理视图'), ('100', '%', '结论由人定', '人员评价、授权、系数、调配、轮岗一律确认后生效、留名留痕')]):
        stat(s, 0.35 + i * 2.57, 1.5, 2.43, 2.75, n, u, l, d)
    label(s, 0.35, 4.5, 1.5, 0.45, '产品定位', NAVY)
    rect(s, 0.35, 5.0, 12.63, 1.85, LIGHT, LINE)
    tb(s, 0.5, 5.08, 12.3, 1.7, [{'t': '面向班组长的班组管理助手：把公司已有的数据变成派工的理由、考评的证据、建设的差距清单和带队伍的参谋', 'bullet': True, 'space': 6}, {'t': '管理者的每个动作（督办、提醒、调配、轮岗建议、后备培养、面谈提纲、文化活动）落到班组长的通知或确认', 'bullet': True, 'space': 6}, {'t': '涉及人员评价的结论一律由班组长或部门确认后使用；依托公司电力人工智能创新平台与云景自助分析工具建设', 'bullet': True}], 12, lsp=1.2, anchor=MSO_ANCHOR.MIDDLE)

    s = sec(prs, lay, T1, '如何贴合公司要求：公司的管理要求在班组一级有了数字化的执行与反馈', '成果贴合公司推进技能人才队伍建设与作业授权管理、星级班组建设、业绩责任书绩效管理、安全生产责任制、基层减负、人工智能应用的要求：评价标准、认证表、责任书在班组一级有了数字化的执行与反馈，班组长的时间回到判断与确认。')
    new[0].append(s)
    table(s, 0.35, 1.5, 12.63, ['公司要求 · 制度依据', '产品如何贴合', '在班组一级的数字化执行与反馈'], [
        ['技能人才队伍建设与作业授权管理\n《技能类岗位胜任能力评价作业授权认证表》', '认证表做成逐人逐格可确认的数字表（7 个技能单元 42 个模块，缺证不能确认），核心业务自主实施能力与 ★ 模块断层风险随确认实时变化', '授权状态按月报主管；高风险模块一键排带教取证；师带徒、骨干培养、后备梯队纳入台账'],
        ['星级班组建设\n《星级班组评价标准》', '20 个评价维度按台账实时初评并标红黄绿，当前等级、目标等级、距目标分、必备条件、差距指标一页呈现', '提升方向排进班组计划；帮扶活动回写得分；自评材料直接取自系统记录'],
        ['绩效管理\n员工年度业绩责任书、工分制考核办法', '考核指标三维度照录责任书实时判定红黄绿；班长绩效按责任书自动取数初评、分档不排名次；班员系数由五类履职证据与工分推导', '督办直达责任班长；确认后下发考评表；激励分配表与确认记录留痕'],
        ['安全生产责任制\n两票、作业授权、关键节点管控', '“有授权才派工、票审过才开工、完工才回写”的刚性流程；关键节点 19 项逐周闭环', '派工理由表、两票审核记录、关键节点闭环记录、安全活动台账'],
        ['基层减负', '班前会材料、月度总结、分配表、面谈提纲、诊断与参谋报告逐段生成，查数即问即答', '班组长每月事务性用时减少约 25 小时，有操作流水为证'],
        ['人工智能应用\n电力人工智能创新平台（大瓦特）', '班组长 AI 助手依托公司平台：查数配图、决策依据、文稿、诊断、经验整理五类能力，人在回路', '可复制的班组级 AI 应用样板；每次确认留名留痕']], rh=0.68, hh=0.4, size=10, widths=[3.1, 5.3, 4.23])
    rect(s, 0.35, 6.12, 12.63, 0.7, LIGHT, LINE); rect(s, 0.35, 6.12, 0.1, 0.7, NAVY)
    tb(s, 0.6, 6.12, 12.2, 0.7, [{'t': '对公司数智化转型的作用：', 'bold': True, 'color': NAVY}, {'t': '班组长的时间从找数、抄数、排版回到判断与确认；班组数据一次产生、局级公司级复用，成为公司人力资源数智化的基础单元——数字化转型落到了最基层的生产组织。'}], 11.5, anchor=MSO_ANCHOR.MIDDLE, lsp=1.15)

    s = sec(prs, lay, T1, '对南方电网集团要求的响应', '对南方电网集团要求的响应：六个方面逐项对应——数字化转型与数字电网建设、人才强企、星级班组建设、业绩责任书与绩效管理、安全生产责任制与基层减负、人力资源数智化创新与人工智能应用。')
    new[0].append(s)
    for i, (t, b) in enumerate([
        ('集团数字化转型与数字电网建设部署', '派工、审票、授权确认、绩效确认、督办、调配结构化留痕，按统一口径接入人资系统与数据平台，班组数据一次产生、局级公司级复用'),
        ('集团人才强企战略与技能人才队伍建设要求', '《作业授权认证表》数字化后，授权状态、核心业务自主实施能力、断层风险按月报主管；师带徒、骨干培养、后备梯队纳入台账，支撑作业授权复审与技能人才评聘'),
        ('集团星级班组建设要求', '《星级班组评价标准》20 个维度按台账实时初评，当前等级、目标等级、差距指标与提升措施按周期自动形成，评定材料直接取自系统记录'),
        ('集团业绩责任书与绩效管理要求', '考核指标红黄绿与督办、班长绩效按责任书季度初评、班员系数由履职证据推导，考评公开、留痕、可追溯'),
        ('集团安全生产责任制与基层减负要求', '“有授权才派工、票审过才开工、完工才回写”的刚性流程把安全责任落到班组一级；文稿逐段生成，班组长每月事务性用时减少约 25 小时'),
        ('集团人力资源数智化创新与人工智能应用（大瓦特）要求', '班组长 AI 助手依托公司电力人工智能创新平台，人在回路、结论由人确认，形成可复制的班组级人工智能应用样板')]):
        x, y = 0.35 + (i % 3) * 4.25, 1.5 + (i // 3) * 2.35
        rect(s, x, y, 4.13, 2.2, LIGHT, LINE); rect(s, x, y, 0.1, 2.2, BLUE)
        tb(s, x + 0.25, y + 0.1, 3.8, 0.55, t, 12.5, True, NAVY, anchor=MSO_ANCHOR.MIDDLE, lsp=1.1)
        tb(s, x + 0.25, y + 0.7, 3.8, 1.45, b, 11, lsp=1.18)
    rect(s, 0.35, 6.25, 12.63, 0.55, LIGHT, LINE); rect(s, 0.35, 6.25, 0.1, 0.55, NAVY)
    tb(s, 0.6, 6.25, 12.2, 0.55, [{'t': '响应是持续的、可检查的：', 'bold': True, 'color': NAVY}, {'t': '结构化留痕 → 按统一口径向上汇聚 → 按周期自动形成结果，机制见下页，逐项对照表见“三、应用成效”。'}], 11.5, anchor=MSO_ANCHOR.MIDDLE)

    s = sec(prs, lay, T1, '成果建成后如何响应公司与集团要求 · 开展示范推广的作用和意义', '成果建成投运后，对公司与集团要求的响应不是一次性对标，而是三步机制：结构化留痕、按统一口径向上汇聚、按周期自动形成结果，每一项都有可检查的输出。示范意义是为公司提供可复制的班组级数字化样板。')
    new[0].append(s)
    chevron_flow(s, 0.35, 1.5, 12.63, 0.6, ['① 结构化留痕：每次派工 / 审票 / 确认 / 督办 / 调配写入台账与流水', '② 按统一口径向上汇聚：人员 · 班组 · 事件三类主题接入人资系统与数据平台', '③ 按周期自动形成结果：星级对标 · 授权盘点 · 班长绩效由一次性工作变为周期输出'], 10.5)
    table(s, 0.35, 2.3, 12.63, ['公司与集团要求', '成果建成后的响应机制', '可检查的输出'], [
        ['数字化转型与数字电网建设', '班组层派工、审票、授权确认、绩效确认、督办、调配全部写入操作流水与台账，按人员、班组、事件三类主题统一口径接入人资系统与数据平台', '操作流水、十七张台账、画像与指标接口；班组数据一次产生、局级公司级复用'],
        ['技能人才队伍建设与作业授权管理', '42 个模块的授权状态、核心业务自主实施能力、断层风险按月形成报表报主管，支撑作业授权复审与技能人才评聘', '月度授权状态报表、带教取证任务、骨干培养计划、后备梯队'],
        ['星级班组建设', '20 个维度的初步评分、必备条件核对、差距指标与提升措施按月自动形成，当前等级与距目标分随台账实时变化', '季度自评材料、差距指标与提升措施、排进班组计划的提升任务'],
        ['业绩责任书与绩效管理', '考核指标实时红黄绿并督办；班长绩效按责任书季度自动取数初评；班员系数逐人确认、分配表留痕', '考核指标看板与督办记录、班长绩效考评表、激励分配表与确认记录'],
        ['安全生产责任制与基层减负', '两票审核、作业授权、断层风险、关键节点在派工环节前置把关；文稿逐段生成、关怀主动提示', '派工理由表、两票审核记录、关键节点闭环记录；每月事务性用时减少约 25 小时的流水证据'],
        ['人工智能应用与数据安全', '班组长 AI 助手人在回路、每次确认留名留痕；内网部署、数据不出域、角色分级授权', '可复制的班组级 AI 助手样板；权限矩阵、确认记录、操作流水']], rh=0.55, hh=0.38, size=9.5, widths=[2.5, 6.0, 4.13])
    rect(s, 0.35, 6.15, 12.63, 0.68, LIGHT, LINE); rect(s, 0.35, 6.15, 0.1, 0.68, NAVY)
    tb(s, 0.6, 6.15, 12.2, 0.68, [{'t': '开展示范推广的作用和意义：', 'bold': True, 'color': NAVY}, {'t': '公司对班组建设、人才队伍、绩效管理、安全生产与基层减负的要求在班组一级有了持续响应的机制；以配置化方式复制到配网、变电、输电专业班组，为公司提供可复制的班组级数字化样板。'}], 11.5, anchor=MSO_ANCHOR.MIDDLE, lsp=1.15)

    # ================= 二、解决方案 =================
    T2 = '二、解决方案'
    s = sec(prs, lay, T2, '应用的设计思路', '设计思路是三层模型：指标层量化、规则层把经验判断转为可解释规则、智能层由大模型承担问答与生成；系统给依据，人作决定。')
    new[1].append(s)
    for i, (t, b) in enumerate([('智能层', '大模型：自然语言问答 · 文稿逐段生成 · 诊断归因 · 经验整理'), ('规则层', '派工四规则 · 断层判定 · 绩效系数 · 考核红黄绿 · 班长计分，可配置、可解释'), ('指标层', '星级评价 20 维 · 作业授权 42 模块 · 综合画像 5 项 / 专业画像 9 项 · 考评口径'), ('数据底座', '十七张班组台账，统一人员与班组主键，每个数字可回溯')]):
        y = 1.5 + i * 1.15
        label(s, 0.35, y, 1.6, 1.0, t, BLUE if i < 3 else DBLUE, WHITE, 14)
        rect(s, 1.95, y, 5.6, 1.0, LIGHT, LINE)
        tb(s, 2.1, y, 5.35, 1.0, b, 12, anchor=MSO_ANCHOR.MIDDLE, lsp=1.15)
    card(s, 7.85, 1.5, 5.13, 4.6, '设计原则', [{'t': '围绕班组长“派得准、带得好、评得公、管得住”和部门“看得全、督得到、配得动”的诉求组织功能', 'bullet': True, 'space': 6}, {'t': '系统给出依据与建议，班组长和管理者作出决定；涉及人的结论一律确认后生效、留名留痕', 'bullet': True, 'space': 6}, {'t': '页面只读状态层、按钮只写状态层，流程不预设，每一个动作都改变后面每一页的数字', 'bullet': True, 'space': 6}, {'t': '画像、看板、文稿中的每个数字可点开回溯至台账原始行', 'bullet': True, 'space': 6}, {'t': '依托公司自主平台建设，内网部署，数据不出域，角色分级授权', 'bullet': True}], 12, tsize=14)
    rect(s, 0.35, 6.3, 12.63, 0.55, LIGHT, LINE)
    tb(s, 0.5, 6.3, 12.3, 0.55, [{'t': '一句话：', 'bold': True, 'color': NAVY}, {'t': '把分散在各系统的班组数据归集为统一台账，在台账之上建指标、立规则、用大模型，让班组长回到判断与确认。'}], 12, anchor=MSO_ANCHOR.MIDDLE)

    s = sec(prs, lay, T2, '应用的实现路径', '实现路径四步：数据归集、模型构建、场景落地、结果回流。')
    new[1].append(s)
    chevron_flow(s, 0.35, 1.5, 12.63, 0.6, ['一  数据归集', '二  模型构建', '三  场景落地', '四  结果回流'], 13)
    for i, b in enumerate(['按工时、资质证书、作业授权认证、任务、缺陷、两票、周报指标、工作量（工分）、违章、安全活动、荣誉、培训（含学时）、派工记录、跨班组调配、值班、通知、操作流水建立十七张台账，统一人员与班组主键。', '依据《技能类岗位胜任能力评价作业授权认证表》（7 个技能单元 42 个模块）、岗位说明书九项与通用素质模型五项、《星级班组评价标准》20 个维度、2026 年度业绩责任书三个维度、工分制考核办法建立指标与评分规则，每项明确来源、阈值、用途和确认人。', '班组长端按“班组整体—人员情况—日常业务”故事线组织 12 页；管理者端覆盖考核指标、班组横向对比、团队画像总览、班长绩效、人员总览、结构对比、团队风险画像、员工关怀、分析参谋 9 页。', '作业完工后工时、两票、缺陷、关键节点与实操量回写本人画像，考评与荣誉进入培养对象排序，帮扶活动改变星级得分；管理者的督办、提醒、调配、轮岗建议全部落到班组长的通知或确认，每一次确认写入操作流水。']):
        x = 0.35 + i * 3.2
        rect(s, x, 2.25, 3.03, 3.3, LIGHT, LINE)
        tb(s, x + 0.12, 2.35, 2.8, 3.1, b, 11, lsp=1.2)
    label(s, 0.35, 5.75, 1.5, 0.45, '交付形态', NAVY)
    tb(s, 1.95, 5.7, 11.0, 0.55, '评审演示为单文件离线高保真原型（双击即开，不依赖外部网络）；正式部署依托公司电力人工智能创新平台与云景自助分析工具，数据经接口对接公司现有系统。', 11.5, anchor=MSO_ANCHOR.MIDDLE, lsp=1.15)
    tb(s, 0.35, 6.35, 12.6, 0.5, '原则：系统给依据与建议，班组长和管理者作决定；页面只读状态层、按钮只写状态层，流程不预设。', 11, color=MUTE)

    s = sec(prs, lay, T2, '数据来源与数据结构', '数据来源为人资系统、OMS、OCS、电网管理平台、党建系统与荣誉台账、周报与责任书；数据结构以人员、班组、事件流水三类主题组织，十七张台账为底座。')
    new[1].append(s)
    table(s, 0.35, 1.5, 7.3, ['来源系统 / 材料', '数据内容', '用于'], [
        ['人资系统', '人员、证书、作业授权、学时、考勤、绩效、工分制考核', '画像、授权认证、绩效系数'],
        ['OMS', '缺陷与工单', '任务池、核心业务管控、业务量趋势'],
        ['OCS', '终端在线状态', '核心业务管控指标'],
        ['电网管理平台', '两票与作业计划、违章记录', '审票、派工冲突、风险'],
        ['党建管理系统 / 荣誉台账', '党建、集体与个人荣誉', '班组名片、星级评价、培养排序'],
        ['运行周报 / 年度业绩责任书', '运行指标、考核指标目标值与评分标准', '考核指标红黄绿、班长绩效']], rh=0.6, size=10.5, widths=[2.0, 3.1, 2.2])
    label(s, 7.85, 1.5, 5.13, 0.42, '十七张班组台账', BLUE)
    items = ['工时', '资质证书', '作业授权认证', '任务', '缺陷', '两票', '周报指标', '工作量（工分）', '违章', '安全活动', '荣誉', '培训', '派工记录', '跨班组调配', '值班', '通知', '操作流水']
    for i, t in enumerate(items):
        label(s, 7.85 + (i % 4) * 1.3, 2.02 + (i // 4) * 0.46, 1.22, 0.38, t, LIGHT, INK, 10, False)
    label(s, 7.85, 4.45, 5.13, 0.42, '数据结构：三类主题', BLUE)
    for i, (t, b) in enumerate([('人员', '证书、作业授权、工时、工作量、作业、两票、绩效、荣誉'), ('班组', '核心指标、星级评价、考核指标、风险'), ('事件流水', '派工 → 审票 → 开工 → 回传 → 完工 → 验收、授权确认、调配确认')]):
        y = 4.95 + i * 0.62
        label(s, 7.85, y, 1.1, 0.52, t, DBLUE, WHITE, 11)
        rect(s, 8.95, y, 4.03, 0.52, LIGHT, LINE); tb(s, 9.05, y, 3.85, 0.52, b, 10, anchor=MSO_ANCHOR.MIDDLE, lsp=1.1)
    tb(s, 0.35, 6.45, 12.6, 0.45, '数据取自公司现有系统，不增加班组数据采集负担；画像、看板、文稿中的每个数字均可点开回溯至台账原始行。', 11, color=MUTE)

    s = sec(prs, lay, T2, '技术架构：依托公司自主平台建设', '技术架构：大瓦特大模型提供对话、生成、问答与诊断能力；云景自助分析工具承载画像与看板；规则引擎与知识库部署于公司内网。')
    new[1].append(s)
    w, h = pic(s, DIAG('技术与数据架构'), 0.35, 1.5, w=9.3)
    for i, (t, b) in enumerate([('电力人工智能创新平台', '大瓦特大模型：对话理解、文稿逐段生成、知识问答、诊断归因、经验整理'), ('云景自助分析工具', '班组画像、指标看板与多维分析图表'), ('业务规则引擎', '派工校验、断层判定、红黄绿预警、绩效系数推导、班长绩效计分'), ('知识库', '制度政策、生产技术、行政办公三类条目及班组案例与骨干经验，问答标注出处'), ('安全与部署', '公司内网部署、数据不出域；按角色分级授权、人员信息最小必要展示；全部操作记入流水')]):
        y = 1.5 + i * 1.05
        label(s, 9.85, y, 3.13, 0.36, t, BLUE, WHITE, 11)
        rect(s, 9.85, y + 0.36, 3.13, 0.6, LIGHT, LINE); tb(s, 9.92, y + 0.38, 3.0, 0.56, b, 9.5, lsp=1.08)

    s = sec(prs, lay, T2, '解决方案的主要功能 · 班组长端', '班组长端 12 页按故事线组织。默认进入班组画像：只讲班组——名片、KPI、核心业务管控、星级评价与发展规划。')
    new[1].append(s)
    for gi, (g, items) in enumerate([('班组整体', ['班组画像']), ('人员情况', ['班员画像', '授权认证', '培养与梯队', '绩效与激励', '关怀与文化', '分析参谋']), ('日常业务', ['今日工作台', '用工安排', '知识库', '台账中心', '问小瓦特'])]):
        y = [1.5, 2.55, 4.55][gi]; hh = [0.9, 1.85, 1.85][gi]
        rect(s, 0.35, y, 4.3, hh, LIGHT, LINE); label(s, 0.45, y + 0.1, 1.1, 0.4, g, BLUE, WHITE, 12)
        for i, t in enumerate(items):
            label(s, 1.7 + (i % 2) * 1.45, y + 0.1 + (i // 2) * 0.57, 1.38, 0.4, t, WHITE, INK, 10.5, False)
        if gi == 0: tb(s, 1.7, y + 0.52, 2.9, 0.35, '名片荣誉 · 核心 KPI · 核心业务管控 · 星级规划', 9.5, color=MUTE)
    tb(s, 0.35, 6.5, 4.3, 0.4, '每页底部有颜色说明；右侧小瓦特面板常驻；顶部指令栏可直接输入要办的事。', 10, color=MUTE, lsp=1.1)
    w, h = pic(s, SHOT('team'), 4.85, 1.5, w=8.13)
    tb(s, 4.85, 1.5 + h + 0.08, 8.13, 0.6, '班组画像：名片荣誉 · 核心 KPI（班长责任书四项）· 核心业务管控 · 星级评价与班组发展规划 · 20 维度表 · 提升措施', 10.5, color=MUTE, lsp=1.1)

    s = sec(prs, lay, T2, '解决方案的主要功能 · 派工推荐与作业授权认证', '派工四条规则逐人判定，理由随单存档，单次派工决策由约 30 分钟降到 5 分钟以内；作业授权认证表数字化，逐格确认，断层风险实时计算。')
    new[1].append(s)
    for i, (name, t, b) in enumerate([('home', '今日工作台 · 派工推荐', '四条规则逐人判定：持有作业所需证书；对应 ★ 模块已授权；本周外勤 ≤ 24 小时（班组约定）；当日无冲突作业。班长不列入、休假不派、学员随队。展开后逐人显示推荐 / 随队 / 排除及理由，理由随派工单存档，工作票与班前会材料随单起草。'), ('auth', '授权认证 · 班员画像', '《作业授权认证表》7 个技能单元 42 个模块逐人逐格确认授权、培训中、撤销，缺证不能确认；核心业务自主实施能力 = 已授权 ★ 模块 ÷ 本岗级应授权 ★ 模块；★ 模块断层风险（已授权 ≤ 2 人）一键排带教取证；确认本期授权报主管。')]):
        x = 0.35 + i * 6.42
        w, h = pic(s, SHOT(name), x, 1.5, w=6.2)
        label(s, x, 1.5 + h + 0.12, 6.2, 0.38, t, BLUE, WHITE, 12)
        rect(s, x, 1.5 + h + 0.5, 6.2, 6.85 - (1.5 + h + 0.5), LIGHT, LINE)
        tb(s, x + 0.1, 1.5 + h + 0.55, 6.0, 6.8 - (1.5 + h + 0.55), b, 10.5, lsp=1.15)

    s = sec(prs, lay, T2, '解决方案的主要功能 · 管理者端', '管理者端的考核指标与班长绩效完全照录年度业绩责任书的指标、权重与评分标准，自动取数初评，部门确认后下发；跨班组调配五步闭环。')
    new[1].append(s)
    for i, (name, t, b) in enumerate([('goals', '考核指标 · 督办', '按 2026 年度业绩责任书分分管副总 / 主管 / 班长三个维度，权重、基础值、满分值、评分标准照录；预计得分实时计算，红黄绿按满分值与基础值判定；点行看评分标准，下钻班组，督办直达责任班长。'), ('lperf', '班长绩效 · 跨班组调配', '考核指标 50% + 重点任务 10% + 综合评价 40% + 加扣分 + 红线，台账自动取数初评，分档不排名次，确认 → 下发 → 面谈 → 评价意见 → 考评表。跨班组调配：横向对比 → 影响测算 → 发起 → 双方班长确认 → 返岗评价。')]):
        x = 0.35 + i * 6.42
        w, h = pic(s, SHOT(name), x, 1.5, w=6.2)
        label(s, x, 1.5 + h + 0.12, 6.2, 0.38, t, BLUE, WHITE, 12)
        rect(s, x, 1.5 + h + 0.5, 6.2, 6.85 - (1.5 + h + 0.5), LIGHT, LINE)
        tb(s, x + 0.1, 1.5 + h + 0.55, 6.0, 6.8 - (1.5 + h + 0.55), b, 10.5, lsp=1.15)

    s = sec(prs, lay, T2, '成果的原创性、创新点与应用场景创新突破点', '五个创新点：经验判断规则化可解释、六环闭环、星级标准与授权认证数字化、两级同源、人在回路的 AI 协作；应用场景突破点是队伍建设六环闭环。')
    new[1].append(s)
    for i, (t, b) in enumerate([('经验判断规则化、可解释', '派工四项考量转化为逐人判定规则，班组约定一并纳入，推荐与排除理由随单存档'), ('六环闭环打通培养、使用与激励', '完工实操量回写授权与画像，画像同时驱动派工推荐、培养排序、绩效系数，一次作业的数据三处复用'), ('星级标准与授权认证数字化', '20 个评价维度台账驱动实时初评，差距直接生成提升方向；42 个模块逐人逐格可确认，断层风险随确认实时变化'), ('班组与部门两级同源', '共用数据底座，班组长每一步即时反映到管理视图；考核指标与班长绩效照录责任书；跨班组调配五步闭环'), ('人在回路的 AI 协作', '涉及人的结论一律确认后生效、留名留痕；骨干经验整理为可检索、可引用的知识库条目，经验可传承')]):
        numrow(s, 0.35, 1.5 + i * 1.06, 6.1, 0.96, i + 1, t, b, 10.5)
    label(s, 6.65, 1.5, 6.33, 0.4, '应用场景创新突破点：队伍建设六环闭环', BLUE, WHITE, 12)
    w, h = pic(s, DIAG('队伍建设六环闭环'), 6.65, 2.0, w=6.33)
    rect(s, 6.65, 2.0 + h + 0.15, 6.33, 6.8 - (2.0 + h + 0.15), LIGHT, LINE)
    tb(s, 6.75, 2.0 + h + 0.2, 6.13, 6.75 - (2.0 + h + 0.2), '一次作业 → 三处复用：完工回写实操量 → 作业授权与画像 → 派工推荐 / 培养对象排序 / 绩效系数；考评与荣誉进入培养排序，帮扶活动改变星级得分，队伍能力随日常工作持续生长。', 10.5, lsp=1.15)

    # ================= 三、应用成效 =================
    T3 = '三、应用成效'
    s = sec(prs, lay, T3, '产生的管理或业务效益：六个业务环节应用前后对比', '六个环节应用前后对比，每一项都有可测算的用时变化。')
    new[2].append(s)
    table(s, 0.35, 1.5, 12.63, ['业务环节', '应用前', '应用后', '测算成效'], [
        ['派工决策', '分别核对证书台账、作业授权认证表、工时记录与作业计划，依经验判断', '一屏给出逐人判定与推荐、随队、排除理由，理由随派工单存档', '30 分钟 → 5 分钟以内'],
        ['月度绩效考评', '人工汇总工时、工作量、学时、荣誉、带徒等履职记录后评定系数', '系数由五类履职证据与工分台账自动推导，证据逐条带出处，一键生成分配表', '4 小时 → 1 小时以内'],
        ['星级班组自评', '对照评价标准分册逐项翻查台账', '20 个维度台账驱动实时初评并标红黄绿，差距指标与提升方向一页呈现', '2 个工作日 → 半天以内'],
        ['作业授权盘点', '按认证表逐人逐格人工核对', '42 个模块逐格确认，缺证不能确认，断层风险实时计算、一键排带教', '1 个工作日 → 1 小时以内'],
        ['班组文稿', '班前会材料、月度总结、分配表、面谈提纲手工汇编', '逐段生成，每个数字可追溯至台账', '月度总结 4 小时 → 1 小时以内'],
        ['季度班长考评', '人工对照责任书汇总三位班长的指标与任务', '按责任书“50 + 10 + 40 + 加扣分 + 红线”自动取数初评，分档不排名次', '1 个工作日 → 2 小时以内'],
        ['风险防控', '证书到期、技能断层、敏感岗位轮岗事后发现', '证书到期前 90 天预警；★ 模块已授权 ≤ 2 人自动识别为断层并排带教；班长任职满 5 年提示轮岗', '事后发现 → 提前处置']], rh=0.6, size=10, widths=[1.6, 4.0, 4.6, 2.43])
    tb(s, 0.35, 6.5, 12.6, 0.4, '注：按试点班组现行业务频次测算；演示数据按班组真实业务框架脱敏构建。', 10, color=MUTE)

    s = sec(prs, lay, T3, '产生的可量化的经济效益或社会效益', '可量化效益：班组长每月事务性用时减少约 25 小时，相当于释放 3 个工作日；部门每季度减少约 3 个工作日。社会效益：依据留痕、经验传承、安全前置。')
    new[2].append(s)
    for i, (n, u, l, d) in enumerate([('25', '小时 / 月', '班组长事务性用时减少', '找数、抄数、排版回到判断与确认'), ('3', '工作日 / 月', '释放回现场与培养', '相当于每月多出三个工作日用于现场管理和人员培养'), ('3', '工作日 / 季', '部门汇总分析用时减少', '指标、对比、结构、风险报告逐段生成'), ('83', '%', '单次派工决策时间下降', '30 分钟降至 5 分钟以内，理由随单存档')]):
        stat(s, 0.35 + i * 3.2, 1.5, 3.03, 2.1, n, u, l, d)
    cd = CategoryChartData(); cd.categories = ['派工决策', '月度考评', '星级自评', '授权盘点', '月度总结', '班长考评']; cd.add_series('用时下降幅度（%）', (83, 75, 75, 87, 75, 75))
    rect(s, 0.35, 3.8, 7.6, 3.05, WHITE, LINE)
    gf = s.shapes.add_chart(XL_CHART_TYPE.COLUMN_CLUSTERED, Inches(0.45), Inches(3.85), Inches(7.4), Inches(2.95), cd); ch = gf.chart
    ch.has_legend = False; ch.has_title = True; ch.chart_title.text_frame.text = '各环节用时下降幅度（%）'
    set_font(ch.chart_title.text_frame.paragraphs[0].runs[0], 12, True, NAVY)
    pl = ch.plots[0]; pl.gap_width = 80; pl.has_data_labels = True; dl = pl.data_labels; dl.number_format = '0"%"'; dl.number_format_is_linked = False; dl.position = XL_LABEL_POSITION.OUTSIDE_END; dl.font.size = Pt(10); dl.font.color.rgb = rgb(INK)
    ser = pl.series[0]; ser.format.fill.solid(); ser.format.fill.fore_color.rgb = rgb(BLUE)
    ca = ch.category_axis; ca.tick_labels.font.size = Pt(10); ca.tick_labels.font.color.rgb = rgb(INK); ca.format.line.color.rgb = rgb(LINE)
    va = ch.value_axis; va.maximum_scale = 100; va.minimum_scale = 0; va.tick_labels.font.size = Pt(9); va.tick_labels.font.color.rgb = rgb(MUTE); va.has_major_gridlines = True; va.major_gridlines.format.line.color.rgb = rgb('E0E0E0'); va.format.line.fill.background()
    label(s, 8.15, 3.8, 4.83, 0.42, '社会效益', BLUE)
    for i, (t, b) in enumerate([('依据留痕、公平透明', '派工、考评、授权、调配的依据全程留痕，队伍建设由经验驱动转为数据驱动'), ('经验可传承', '骨干经验与案例进入知识库，问答带出处，新员工培养有路径'), ('安全前置、风险提前', '证书到期、断层风险、敏感岗位轮岗提前处置，安全责任落到班组一级')]):
        y = 4.3 + i * 0.87
        rect(s, 8.15, y, 4.83, 0.8, LIGHT, LINE); rect(s, 8.15, y, 0.08, 0.8, BLUE)
        tb(s, 8.35, y + 0.04, 4.55, 0.3, t, 12, True, NAVY, anchor=MSO_ANCHOR.MIDDLE)
        tb(s, 8.35, y + 0.34, 4.55, 0.45, b, 10, color=INK, lsp=1.1)

    s = sec(prs, lay, T3, '对南方电网集团要求的响应：成果投运后的机制与可检查的输出（逐项对照）', '成果投运后对集团要求的响应不是一次性对标，而是按周期自动形成、可检查、可向上汇聚的机制，逐项对照八个方面。')
    new[2].append(s)
    table(s, 0.35, 1.5, 12.63, ['南方电网集团要求', '成果建成后的响应机制', '可检查的输出'], [
        ['数字化转型与数字电网建设', '班组层派工、审票、授权确认、绩效确认、督办、调配全部结构化留痕，按人员、班组、事件三类主题统一口径接入人资系统与数据平台', '操作流水、十七张台账、画像与指标接口；班组数据一次产生、局级公司级复用'],
        ['人才强企与技能人才队伍建设', '认证表 42 个模块逐人逐格确认，核心业务自主实施能力实时计算；师带徒、骨干培养、后备梯队纳入台账', '月度授权状态报表报主管、带教取证任务、骨干培养计划、后备梯队'],
        ['星级班组建设', '20 个评价维度台账驱动实时初评，当前等级、目标等级、距目标分、必备条件、差距指标按周期自动形成', '季度自评材料、差距指标与提升措施、排进班组计划的提升任务'],
        ['业绩责任书与绩效管理', '考核指标三维度照录责任书实时红黄绿并督办；班长绩效季度自动取数初评、分档不排名次；班员系数由履职证据与工分推导', '考核指标看板与督办记录、班长绩效考评表、激励分配表与确认记录'],
        ['安全生产责任制与本质安全', '两票审核、作业授权、断层风险、违章与关键节点在派工环节前置把关；关键节点 19 项逐周闭环；安全与帮扶活动回写星级得分', '派工理由表、两票审核记录、关键节点闭环记录、安全活动台账'],
        ['基层减负与员工关怀', '班前会材料、月度总结、分配表、面谈提纲、诊断与参谋报告逐段生成；关键年份、谈心回访、高强度外勤主动提示', '每月事务性用时减少约 25 小时的操作流水证据、关怀提醒与面谈记录'],
        ['人力资源数智化创新与人工智能应用', '班组长 AI 助手依托电力人工智能创新平台与大瓦特大模型，查数、决策依据、文稿、诊断、经验整理五类能力，人在回路', '可复制的班组级 AI 助手样板；每次确认留名留痕'],
        ['数据安全与员工权益保护', '内网部署、数据不出域；角色分级授权、人员信息最小必要展示；涉及人的结论由班组长或部门确认后生效', '权限矩阵、确认记录、操作流水']], rh=0.6, hh=0.38, size=9.5, widths=[2.6, 6.2, 3.83])

    s = sec(prs, lay, T3, '当前的实用化和运营情况', '实用化：应用范围、建设进度、数据对接、运行安排四方面，试点条件已具备。')
    new[2].append(s)
    for i, (t, b) in enumerate([('应用范围', '光明供电局配网资产部三个班组 31 人，班组长与部门管理者两类用户，覆盖班组整体、人员情况、日常业务与部门的业务、管理两条主线'), ('建设进度', '班组长端 12 页、管理者端 9 页、十七张台账、派工与考评规则、作业授权认证表、星级评价初评模型已完成，单文件离线原型可演示；每一次确认留名留痕'), ('数据对接', '人资系统、OMS、OCS、电网管理平台、党建与荣誉台账的接口口径已明确，取自公司现有系统，不增加班组数据采集负担'), ('运行安排', '2026 年四季度在三个班组试点运行；按月形成授权状态、星级差距、班长绩效三类报表报主管；非台账维度的初步得分与另外两个班组底数待客户确认')]):
        y = 1.5 + i * 1.33
        label(s, 0.35, y, 1.4, 1.2, t, BLUE, WHITE, 13)
        rect(s, 1.75, y, 5.75, 1.2, LIGHT, LINE); tb(s, 1.9, y, 5.5, 1.2, b, 11, anchor=MSO_ANCHOR.MIDDLE, lsp=1.18)
    w, h = pic(s, SHOT('ask'), 7.75, 1.5, w=5.23)
    label(s, 7.75, 1.5 + h + 0.12, 5.23, 0.38, '问小瓦特 · 班组长 AI 助手', BLUE, WHITE, 12)
    rect(s, 7.75, 1.5 + h + 0.5, 5.23, 6.8 - (1.5 + h + 0.5), LIGHT, LINE)
    tb(s, 7.85, 1.5 + h + 0.55, 5.03, 6.75 - (1.5 + h + 0.55), '查数配图、决策依据、文稿逐段生成、诊断归因、经验整理五类问法；数字类回答同步配图，名单可下钻；涉及人员评价的结论标注“由班组长确认后使用”；语音为辅，所有语音路径都有等价的点击路径。', 10.5, lsp=1.15)

    # ================= 四、推广价值 =================
    T4 = '四、推广价值'
    s = sec(prs, lay, T4, '推广计划：推广对象、推广模式、预期效果', '推广按部门试点、全局复制、网省推广三级推进；以配置化方式复制，更换专业只需调整口径配置。')
    new[3].append(s)
    rect(s, 1.2, 2.33, 10.9, 0.05, BLUE)
    for i, (p, t, b) in enumerate([('2026 年四季度', '部门试点', '光明供电局配网资产部三个班组试点运行，形成第一轮运行数据与口径修订'), ('2027 年上半年', '全局复制', '推广至深圳供电局配网专业班组，完成变电、输电专业口径配置'), ('2027 年下半年起', '网省推广', '具备向网内其他单位推广的条件，形成公司级班组管理产品')]):
        cx = 2.6 + i * 4.07
        circle(s, cx - 0.3, 2.05, 0.6, str(i + 1), BLUE, 16)
        tb(s, cx - 1.8, 1.5, 3.6, 0.45, p, 15, True, NAVY, PP_ALIGN.CENTER, MSO_ANCHOR.MIDDLE)
        rect(s, cx - 1.85, 2.85, 3.7, 1.3, LIGHT, LINE)
        tb(s, cx - 1.7, 2.92, 3.4, 0.4, t, 14, True, NAVY, PP_ALIGN.CENTER, MSO_ANCHOR.MIDDLE)
        tb(s, cx - 1.7, 3.32, 3.4, 0.8, b, 10.5, align=PP_ALIGN.CENTER, lsp=1.15)
    for i, (t, b) in enumerate([('推广对象', '各供电局配网、变电、输电等专业生产班组的班组长及所在部门管理者'), ('推广模式', '配置化复制：认证表、星级分册、责任书指标、派工规则与班组约定、考评权重均为可配置口径，数据底座、规则框架与页面框架不变；页面与模型按模块组织，可按场景开关'), ('预期效果', '班组长每月事务性用时减少约 25 小时；派工、考评、授权、调配依据全程留痕；各班组星级对标与授权盘点按周期自动形成；队伍建设由经验驱动转为数据驱动')]):
        card(s, 0.35 + i * 4.25, 4.4, 4.13, 2.4, t, b, 11)

    s = sec(prs, lay, T4, '潜在的商业价值和社会价值 · 潜在价值的开发计划', '潜在价值分管理、社会、商业三个层面；开发计划四项：系统对接、专业扩展、能力深化、知识沉淀。')
    new[3].append(s)
    label(s, 0.35, 1.5, 5.9, 0.42, '潜在价值', BLUE)
    for i, (t, b) in enumerate([('管理价值', '班组数据一次产生、局级公司级复用，星级对标、授权盘点、班长考评由一次性工作变为按周期自动形成'), ('社会价值', '技能人才培养有依据、安全责任落到班组一级、基层减负有数据可证、骨干经验可传承'), ('商业价值', '可配置复制到配网、变电、输电专业班组，形成公司级班组管理产品与班组级 AI 助手样板')]):
        y = 2.05 + i * 1.6
        label(s, 0.35, y, 1.3, 1.45, t, DBLUE, WHITE, 13)
        rect(s, 1.65, y, 4.6, 1.45, LIGHT, LINE); tb(s, 1.8, y, 4.35, 1.45, b, 11.5, anchor=MSO_ANCHOR.MIDDLE, lsp=1.18)
    label(s, 6.5, 1.5, 6.48, 0.42, '潜在价值的开发计划', BLUE)
    for i, (t, b) in enumerate([('系统对接', '接入人资系统、OMS、OCS、电网管理平台、党建系统，班组数据自动归集，班组层数据按统一口径向上汇聚'), ('专业扩展', '完成变电、输电专业认证表与岗位说明书口径配置，复制到其他专业班组'), ('能力深化', '文稿、诊断、参谋能力接入大瓦特大模型在线服务，知识库持续沉淀'), ('知识沉淀', '班组案例与骨干经验整理为可检索条目，形成公司级班组知识库')]):
        numrow(s, 6.5, 2.05 + i * 1.2, 6.48, 1.08, i + 1, t, b, 11)
    rect(s, 0.35, 6.85 - 0.5, 12.63, 0.5, LIGHT, LINE)
    tb(s, 0.5, 6.35, 12.3, 0.5, '开发计划与推广计划同步推进：部门试点 → 全局复制 → 网省推广。', 11.5, True, NAVY, anchor=MSO_ANCHOR.MIDDLE)

    s = sec(prs, lay, T4, '价值定位：班组强则公司强', '结尾呼应开篇：班组强则公司强。成果让班组长回到判断与确认、让管理者的决定落到确认、让公司的要求在班组一级有持续响应的机制。')
    new[3].append(s)
    rect(s, 0.35, 1.5, 12.63, 1.3, BLUE)
    tb(s, 0.6, 1.5, 12.1, 1.3, '把公司已有的数据在班组这一级变成了派工的理由、考评的证据、建设的差距清单和带队伍的参谋', 20, True, WHITE, PP_ALIGN.CENTER, MSO_ANCHOR.MIDDLE, lsp=1.3)
    for i, (t, b) in enumerate([('对班组长', '回到判断与确认。时间从找数、抄数、排版回到现场管理和人员培养，每月减少约 25 小时事务性工作'), ('对管理者', '每一个决定落到班组长的确认。看得全、督得到、配得动，班长考评与跨班组调配有同源数据'), ('对公司', '班组数据按统一口径向上汇聚，星级对标与授权盘点按周期自动形成，班长绩效按责任书自动取数，形成可复制的班组级数字化样板')]):
        card(s, 0.35 + i * 4.25, 3.05, 4.13, 2.5, t, b, 12, hh=0.48, tsize=14)
    rect(s, 0.35, 5.8, 12.63, 1.0, LIGHT, LINE); rect(s, 0.35, 5.8, 0.1, 1.0, NAVY)
    tb(s, 0.6, 5.8, 12.1, 1.0, [{'t': '让数字化转型在公司最基层的生产组织里持续运转。', 'bold': True, 'color': NAVY, 'size': 14}, {'t': '投运后班组数据按统一口径向上汇聚、星级对标与授权盘点按周期自动形成、班长绩效按责任书自动取数，公司对班组建设、人才队伍、绩效管理、安全生产与基层减负的要求在班组一级有了持续响应的机制。', 'size': 11.5}], anchor=MSO_ANCHOR.MIDDLE, lsp=1.15)

    # ================= 五、团队介绍 =================
    s = sec(prs, lay, '五、团队介绍', '团队成员相关信息与具体职能分工', '团队成员与分工：业务、技术、项目、演示四位负责人（姓名待填）。')
    new[4].append(s)
    for i, (t, b) in enumerate([('业务负责人', '提出业务需求与规则口径；组织班组长、部门管理者参与验证；确认指标阈值与评价口径'), ('技术负责人', '负责数据归集、指标模型与业务规则实现、平台对接与内网部署'), ('项目负责人', '统筹进度、资源与质量，组织阶段评审与验收'), ('演示负责人', '负责演示路径设计、现场汇报与答辩')]):
        x = 0.35 + i * 3.2
        label(s, x, 1.5, 3.03, 0.5, t, BLUE, WHITE, 14)
        rect(s, x, 2.0, 3.03, 4.3, LIGHT, LINE)
        circle(s, x + 1.515 - 0.55, 2.25, 1.1, '', GRAY)
        tb(s, x, 3.5, 3.03, 0.45, '（填写姓名）', 16, True, INK, PP_ALIGN.CENTER, MSO_ANCHOR.MIDDLE)
        tb(s, x, 3.95, 3.03, 0.35, '单位 · 岗位', 11, False, MUTE, PP_ALIGN.CENTER, MSO_ANCHOR.MIDDLE)
        rect(s, x + 0.9, 4.4, 1.23, 0.03, BLUE)
        tb(s, x + 0.2, 4.55, 2.63, 1.6, b, 11, align=PP_ALIGN.CENTER, lsp=1.2)
    tb(s, 0.35, 6.45, 12.63, 0.4, '申报单位：深圳供电局有限公司　·　业务单位：光明供电局配网资产部', 12.5, False, INK, PP_ALIGN.CENTER, MSO_ANCHOR.MIDDLE)

    # ---------- 删除模板的五张要点页，按“目录 → 本段内容页”重排 ----------
    sldIdLst = prs.slides._sldIdLst
    id_of = {}
    for sid in list(sldIdLst):
        id_of[prs.part.related_part(sid.rId)] = sid
    def sid(slide): return id_of[slide.part]
    for o in outline:
        e = sid(o); prs.part.drop_rel(e.rId); sldIdLst.remove(e)
    order = [sid(cover), sid(decl)]
    for k in range(5):
        order.append(sid(toc[k])); order += [sid(x) for x in new[k]]
    order.append(sid(thanks))
    for e in list(sldIdLst): sldIdLst.remove(e)
    for e in order: sldIdLst.append(e)
    prs.save(OUT); print('ok', OUT, len(order), 'slides')

if __name__ == '__main__':
    main(sys.argv[1])
