# -*- coding: utf-8 -*-
"""客户制度文件（materials/1002客户修改意见/制度文件）→ zlib.js（ZDOCS：制度学习陪练文件库，六个制度主题）。
用法：python3 gen_zlib.py    需要 poppler（pdftotext）；扫描版《国务院令 599 号》用预先 OCR 的文本（制度文件/1-…_OCR文本.txt）。
每份文件取正文（清洗页码、水印、断行），按主题裁到 ≤ 12000 字，章节标题保留，供 pipe.js 的 docSecs / cwGen / qGen 使用。"""
import os, re, json, subprocess, glob
B = os.path.dirname(os.path.abspath(__file__))
ZD = os.path.join(B, 'materials', '1002客户修改意见', '制度文件')
OUT = os.path.join(B, 'zlib.js')
HEAD = r'^(第[一二三四五六七八九十百零〇\d]+[章节条款]|[一二三四五六七八九十]+、|[（(][一二三四五六七八九十\d]+[)）]|\d+(\.\d+)+\s*[^\d]|附录|附件|前\s*言|一、|二、)'
WM = re.compile(r'^[\s培训宣贯年月版０-９0-9２３０\-－—·.．、]+$')

def pdf_text(path):
    try:
        return subprocess.run(['pdftotext', path, '-'], capture_output=True, text=True, timeout=300).stdout
    except Exception as e:
        print('pdftotext fail', path, e); return ''

def clean(t, maxlen=12000, start=None, drop=None):
    t = t.replace('\x0c', '\n').replace('　', ' ')
    lines = [re.sub(r'\s+', ' ', l).strip() for l in t.split('\n')]
    out = []
    for l in lines:
        if not l or WM.match(l) or re.fullmatch(r'[—\-－]?\s*\d{1,3}\s*[—\-－]?', l): continue
        if drop and re.search(drop, l): continue
        l = re.sub(r'(?<=[一-鿿])\s+(?=[一-鿿])', '', l)   # 汉字间空格
        l = re.sub(r'^[”“"\'‘’「」『』\s]+', '', l)         # OCR 行首多余引号
        if out and not re.match(HEAD, l) and not re.search(r'[。；：！？]$', out[-1]) and len(out[-1]) < 260:
            out[-1] += l
        else:
            out.append(l)
    text = '\n'.join(out)
    if start:
        i = text.find(start)
        if i > 0: text = text[i:]
    if len(text) > maxlen:
        cut = text.rfind('\n', 0, maxlen)
        text = text[:cut if cut > maxlen * .6 else maxlen]
    return text

def find(sub, pat):
    fs = glob.glob(os.path.join(ZD, sub, pat))
    if not fs: raise SystemExit('missing ' + sub + '/' + pat)
    return fs[0]

DOCS = []
def add(id_, n, theme, tag, src, text, bank=None):
    if not text or len(text) < 400: print('!! 文本过短', id_, len(text or '')); return
    d = {'id': id_, 'n': n, 'kind': '制度文件', 'tag': tag, 'theme': theme, 'src': src, 'text': text}
    if bank: d['bank'] = bank
    DOCS.append(d); print('%-6s %-44s %6d 字 %2d 节' % (id_, n, len(text), len([l for l in text.split('\n') if re.match(HEAD, l)])))

# z1 国务院令 599 号（扫描版，OCR 文本）
ocr = glob.glob(os.path.join(ZD, '*OCR文本.txt'))
if ocr:
    t = open(ocr[0], encoding='utf-8').read()
    add('z1', '电力安全事故应急处置和调查处理条例（国务院令第 599 号）', 'z1', '应急条例', '客户提供 · 扫描件 OCR 文本', clean(t, 12000, '第一章', r'^(中华人民共和国国务院令|第\s*5\s*9\s*9\s*号)$'))
# z2 事故隐患判定标准
add('z2a', '电力重大事故隐患判定标准及治理监督管理规定（国家发改委 41 号令）', 'z2', '隐患判定', '客户提供 · 全文', clean(pdf_text(find('2-事故隐患判定标准', '【2-0】*.pdf')), 12000, '第一章'), bank='z2')
add('z2b', '南方电网公司重大和较大事故隐患判定标准（2026 版）', 'z2', '隐患判定', '客户提供 · 南方电网安监〔2026〕8 号附件 · 节选', clean(pdf_text(find('2-事故隐患判定标准', '【5-0】*.pdf')), 12000, '一、'), bank='z2')
# z3 加强安全生产工作硬措施
add('z3a', '南方电网公司加强安全生产工作硬措施', 'z3', '硬措施', '客户提供 · 南方电网安监〔2026〕16 号', clean(pdf_text(find('3-加强安全生产工作硬措施', '【3-0】*.pdf')), 12000), bank='z3')
add('z3b', '关于全面落实国务院国资委安全生产工作“十条硬措施”进一步加强安全生产工作的通知', 'z3', '硬措施', '客户提供 · 办安监〔2026〕9 号', clean(pdf_text(find('3-加强安全生产工作硬措施', '【1】*.pdf')), 9000), bank='z3')
# z4 有限空间作业
add('z4a', '深圳供电局有限公司有限空间作业安全管控指引', 'z4', '有限空间', '客户提供 · 全文', clean(pdf_text(find('4-有限空间作业', '【9-3】*.pdf')), 12000))
add('z4b', '有限空间作业安全技术规范（GB 46768-2025）', 'z4', '有限空间', '客户提供 · 节选', clean(pdf_text(find('4-有限空间作业', '【9-0】*.pdf')), 12000, '1 范围'))
# z5 动火作业
add('z5a', '安规 第 3 部分：配电部分 · 21 动火作业', 'z5', '动火作业', '客户提供 · 培训宣贯版 · 节选', clean(pdf_text(find('5-动火作业', '【10-0】*.pdf')), 12000, '21'))
add('z5b', '动火作业相关安规释义', 'z5', '动火作业', '客户提供 · 节选', clean(pdf_text(find('5-动火作业', '【10-1】*.pdf')), 12000, '动火'))
# z6 高处作业防高坠
add('z6', '电力行业高处作业防高坠安全措施图册（v7）', 'z6', '高处作业', '客户提供 · 图册文字部分', clean(pdf_text(find('6-高处作业防高坠', '【11】*.pdf')), 12000, '前'))

THEMES = [['z1', '应急处置条例'], ['z2', '隐患判定标准'], ['z3', '安全生产硬措施'], ['z4', '有限空间作业'], ['z5', '动火作业'], ['z6', '高处作业防高坠']]
js = '/* 由 gen_zlib.py 从客户制度文件生成（制度学习陪练文件库），勿手改 */\nconst ZTHEMES = ' + json.dumps(THEMES, ensure_ascii=False) + ';\nconst ZDOCS = ' + json.dumps(DOCS, ensure_ascii=False, separators=(',', ':')) + ';\n'
open(OUT, 'w', encoding='utf-8').write(js)
print('zlib.js', len(js), 'bytes', len(DOCS), 'docs')
