// 话术 md → 紧凑版 Word：A4、窄边距、正文 10.5pt、段距压到最小
const fs = require('fs');
const D = require('docx');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType, LevelFormat, AlignmentType } = D;
const src = fs.readFileSync(process.argv[2], 'utf8').split('\n');
const FONT = 'Microsoft YaHei', SZ = 21; // 10.5pt
function runs(text, base = {}) {
  const out = []; const re = /(\*\*[^*]+\*\*|`[^`]+`|_[^_]+_)/g; let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(new TextRun({ text: text.slice(last, m.index), font: FONT, size: SZ, ...base }));
    const t = m[0];
    if (t.startsWith('**')) out.push(new TextRun({ text: t.slice(2, -2), bold: true, font: FONT, size: SZ, ...base }));
    else if (t.startsWith('`')) out.push(new TextRun({ text: t.slice(1, -1), font: 'Consolas', size: SZ - 2, color: '6A3BE0', ...base }));
    else out.push(new TextRun({ text: t.slice(1, -1), italics: true, font: FONT, size: SZ, color: '666666', ...base }));
    last = m.index + t.length;
  }
  if (last < text.length) out.push(new TextRun({ text: text.slice(last), font: FONT, size: SZ, ...base }));
  return out;
}
const tight = { spacing: { before: 0, after: 40, line: 276 } };
const W = 10466; // A4 宽 11906 − 左右边距 720×2
const kids = [];
let i = 0;
while (i < src.length) {
  const l = src[i];
  if (/^\|/.test(l)) {
    const rows = [];
    while (i < src.length && /^\|/.test(src[i])) { if (!/^\|\s*-/.test(src[i])) rows.push(src[i].replace(/^\||\|$/g, '').split('|').map(s => s.trim())); i++; }
    const n = rows[0].length; const cw = Array(n).fill(Math.floor(W / n)); cw[n - 1] = W - cw[0] * (n - 1);
    if (n === 2) { cw[0] = Math.round(W * 0.38); cw[1] = W - cw[0]; }
    const border = { style: BorderStyle.SINGLE, size: 4, color: 'BBBBBB' };
    kids.push(new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: cw,
      rows: rows.map((r, ri) => new TableRow({ children: r.map((c, ci) => new TableCell({ width: { size: cw[ci], type: WidthType.DXA },
        margins: { top: 30, bottom: 30, left: 80, right: 80 },
        borders: { top: border, bottom: border, left: border, right: border },
        shading: ri === 0 ? { type: ShadingType.CLEAR, fill: 'EFE9FE', color: 'auto' } : undefined,
        children: [new Paragraph({ spacing: { before: 0, after: 0, line: 264 }, children: runs(c, ri === 0 ? { bold: true } : {}) })] })) })) }));
    kids.push(new Paragraph({ spacing: { before: 0, after: 40 }, children: [] }));
    continue;
  }
  if (/^---\s*$/.test(l)) { kids.push(new Paragraph({ spacing: { before: 40, after: 40 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'BBBBBB', space: 1 } }, children: [] })); i++; continue; }
  let m;
  if ((m = l.match(/^(#{1,3}) (.*)/))) {
    const lv = m[1].length; const size = lv === 1 ? 32 : lv === 2 ? 26 : 23;
    kids.push(new Paragraph({ heading: [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3][lv - 1], spacing: { before: lv === 1 ? 0 : 160, after: 60 }, keepNext: true,
      children: runs(m[2], { bold: true, size, color: lv === 1 ? '2A1466' : '4A25B5' }) }));
    i++; continue;
  }
  if ((m = l.match(/^(\s*)- (.*)/))) {
    kids.push(new Paragraph({ numbering: { reference: 'b', level: m[1].length >= 2 ? 1 : 0 }, ...tight, children: runs(m[2]) })); i++; continue;
  }
  if ((m = l.match(/^(\d+)\. (.*)/))) { kids.push(new Paragraph({ ...tight, indent: { left: 280, hanging: 280 }, children: runs(m[1] + '. ' + m[2]) })); i++; continue; }
  if (l.trim() === '') { i++; continue; }
  kids.push(new Paragraph({ ...tight, children: runs(l) })); i++;
}
const doc = new Document({
  styles: { default: { document: { run: { font: FONT, size: SZ } } },
    paragraphStyles: [1, 2, 3].map(n => ({ id: 'Heading' + n, name: 'Heading ' + n, basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, bold: true }, paragraph: { outlineLevel: n - 1 } })) },
  numbering: { config: [{ reference: 'b', levels: [
    { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 300, hanging: 220 } } } },
    { level: 1, format: LevelFormat.BULLET, text: '◦', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 620, hanging: 220 } } } }] }] },
  sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 720, bottom: 720, left: 720, right: 720 } } }, children: kids }]
});
Packer.toBuffer(doc).then(b => { fs.writeFileSync(process.argv[3], b); console.log('ok', process.argv[3], b.length); });
