# -*- coding: utf-8 -*-
"""生成可上传的两票样例（Word / Excel / 文本）到 samples/：
  操作票_10kV凤凰线F03开关由运行转检修_规范.docx      —— 完整规范，审核应通过
  操作票_10kV凤凰线F03开关由运行转检修_待审.docx/.xlsx/.txt —— 含四处问题：顺序反、缺验电、接地开关无编号、监护人空
依据：客户技能评价试题"环网柜 #1 开关由运行状态转检修状态"，票面格式按配电倒闸操作票通用要素。纯标准库。"""
import os, zipfile, datetime
B = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'samples'); os.makedirs(B, exist_ok=True)
HEAD = [('单位', '光明供电局凤凰供电所配电运维一班'), ('编号', '配一 2026-0904-01'), ('发令人', '陈国安（配调）'), ('受令人', '韩雪'), ('发令时间', '2026 年 09 月 04 日 08 时 40 分'), ('操作开始时间', '2026 年 09 月 04 日 09 时 00 分'), ('操作结束时间', '    年   月   日   时   分'), ('操作方式', '（√）监护下操作  （ ）单人操作  （ ）检修人员操作'), ('操作任务', '10kV 凤凰线 F03 开关（塘家公用柜 #1 单元）由运行转检修')]
GOOD = ['核对设备名称、编号及运行方式，检查 10kV 凤凰线 F03 开关在合闸位置、带电指示器三相指示正常', '断开 10kV 凤凰线 F03 开关', '检查 10kV 凤凰线 F03 开关确已断开（分闸位置指示、带电指示器熄灭）', '拉开 10kV 凤凰线 F03 开关负荷侧隔离开关（F03-2）', '检查 F03-2 隔离开关确已拉开', '拉开 10kV 凤凰线 F03 开关电源侧隔离开关（F03-1）', '检查 F03-1 隔离开关确已拉开', '在 10kV 凤凰线 F03 开关线路侧验电，确认三相无电', '合上 10kV 凤凰线 F03 开关线路侧接地开关（F03-4）', '检查 F03-4 接地开关确已合上', '在 F03 开关操作把手上悬挂"禁止合闸，线路有人工作！"标示牌，操作孔加锁', '检查现场安措布置完毕，向配调汇报操作完毕']
BAD = ['核对设备名称、编号及运行方式，检查 10kV 凤凰线 F03 开关在合闸位置', '拉开 10kV 凤凰线 F03 开关负荷侧隔离开关（F03-2）', '断开 10kV 凤凰线 F03 开关', '检查 10kV 凤凰线 F03 开关确已断开', '拉开 10kV 凤凰线 F03 开关电源侧隔离开关（F03-1）', '检查 F03-1 隔离开关确已拉开', '合上 10kV 凤凰线 F03 开关线路侧接地开关', '检查接地开关确已合上', '在 F03 开关操作把手上悬挂"禁止合闸，线路有人工作！"标示牌，操作孔加锁']
FOOT_GOOD = [('备注', '塘家公用柜 #1 单元为断路器单元；操作全过程穿戴防电弧服、绝缘手套；操作前核对配调令与本票一致。'), ('操作人', '赵敏'), ('监护人', '韩雪'), ('值班负责人（值长）', '赵立群')]
FOOT_BAD = [('备注', '塘家公用柜 #1 单元为断路器单元；操作全过程穿戴防电弧服、绝缘手套。'), ('操作人', '赵敏'), ('监护人', ''), ('值班负责人（值长）', '赵立群')]

def esc(s): return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
def p(text, b=False, sz=None, center=False):
    rpr = ('<w:rPr>' + ('<w:b/>' if b else '') + ('<w:sz w:val="%d"/>' % sz if sz else '') + '</w:rPr>') if (b or sz) else ''
    ppr = '<w:pPr><w:jc w:val="center"/></w:pPr>' if center else ''
    return '<w:p>%s<w:r>%s<w:t xml:space="preserve">%s</w:t></w:r></w:p>' % (ppr, rpr, esc(text))
def tc(text, w=None, b=False):
    tcpr = '<w:tcPr>%s<w:tcBorders><w:top w:val="single" w:sz="4"/><w:left w:val="single" w:sz="4"/><w:bottom w:val="single" w:sz="4"/><w:right w:val="single" w:sz="4"/></w:tcBorders></w:tcPr>' % ('<w:tcW w:w="%d" w:type="dxa"/>' % w if w else '')
    return '<w:tc>%s%s</w:tc>' % (tcpr, p(text, b))
def tr(cells): return '<w:tr>' + ''.join(cells) + '</w:tr>'
def head(no): return [(k, no if k == '编号' else v) for k, v in HEAD]
def docx(path, items, foot, no='配一 2026-0904-01'):
    body = [p('中国南方电网　深圳供电局有限公司', True, 28, True), p('配 电 倒 闸 操 作 票', True, 36, True)]
    for k, v in head(no): body.append(p(k + '：' + v))
    rows = [tr([tc('顺序', 900, True), tc('操 作 项 目', 7200, True), tc('执行', 900, True)])]
    for i, it in enumerate(items): rows.append(tr([tc(str(i + 1), 900), tc(it, 7200), tc('', 900)]))
    body.append('<w:tbl><w:tblPr><w:tblW w:w="9000" w:type="dxa"/></w:tblPr>' + ''.join(rows) + '</w:tbl>')
    for k, v in foot: body.append(p(k + '：' + v))
    doc = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + ''.join(body) + '<w:sectPr/></w:body></w:document>'
    ct = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'
    rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'
    with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml', ct); z.writestr('_rels/.rels', rels); z.writestr('word/document.xml', doc)
def xlsx(path, items, foot):
    rows = [['中国南方电网 深圳供电局有限公司 · 配电倒闸操作票']] + [[k + '：' + v] for k, v in HEAD] + [['顺序', '操作项目', '执行']] + [[str(i + 1), it, ''] for i, it in enumerate(items)] + [[k + '：' + v] for k, v in foot]
    strs = []; idx = {}
    def sidx(s):
        if s not in idx: idx[s] = len(strs); strs.append(s)
        return idx[s]
    def col(j): return chr(65 + j)
    sheet_rows = []
    for r, row in enumerate(rows):
        cells = ''.join('<c r="%s%d" t="s"><v>%d</v></c>' % (col(j), r + 1, sidx(v)) for j, v in enumerate(row) if v != '')
        sheet_rows.append('<row r="%d">%s</row>' % (r + 1, cells))
    sheet = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' + ''.join(sheet_rows) + '</sheetData></worksheet>'
    ss = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="%d" uniqueCount="%d">' % (len(strs), len(strs)) + ''.join('<si><t xml:space="preserve">%s</t></si>' % esc(s) for s in strs) + '</sst>'
    wb = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="操作票" sheetId="1" r:id="rId1"/></sheets></workbook>'
    wbrels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>'
    ct = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/></Types>'
    rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'
    with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml', ct); z.writestr('_rels/.rels', rels); z.writestr('xl/workbook.xml', wb); z.writestr('xl/_rels/workbook.xml.rels', wbrels); z.writestr('xl/worksheets/sheet1.xml', sheet); z.writestr('xl/sharedStrings.xml', ss)
def txt(path, items, foot):
    lines = ['中国南方电网 深圳供电局有限公司', '配电倒闸操作票'] + [k + '：' + v for k, v in HEAD] + ['顺序 | 操作项目 | 执行'] + ['%d | %s | ' % (i + 1, it) for i, it in enumerate(items)] + [k + '：' + v for k, v in foot]
    open(path, 'w', encoding='utf-8').write('\n'.join(lines) + '\n')
docx(os.path.join(B, '操作票_10kV凤凰线F03开关由运行转检修_规范.docx'), GOOD, FOOT_GOOD, '配一 2026-0904-02')
docx(os.path.join(B, '操作票_10kV凤凰线F03开关由运行转检修_待审.docx'), BAD, FOOT_BAD)
xlsx(os.path.join(B, '操作票_10kV凤凰线F03开关由运行转检修_待审.xlsx'), BAD, FOOT_BAD)
txt(os.path.join(B, '操作票_10kV凤凰线F03开关由运行转检修_待审.txt'), BAD, FOOT_BAD)
open(os.path.join(B, 'README.txt'), 'w', encoding='utf-8').write('两票上传样例（虚拟数据）。\n_规范：完整规范的配电倒闸操作票，审核应通过。\n_待审：含四处问题（隔离开关先于开关拉开、缺验电、接地开关无编号、监护人空），审核应逐条指出并可补齐。\n在「班务日程 → 审票 → 上传两票」里选择文件即可；Word / Excel / 文本三种都能读，照片只能按票号匹配电子票。\n')
print('samples ok', os.listdir(B))
