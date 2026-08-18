/* AI 智能投研平台 · 商务技术方案与模块报价书 */
const fs = require("fs");
const path = require("path");
const D = require("docx");
const {
  Document, Packer, Paragraph, TextRun, ImageRun, PageBreak, AlignmentType,
  HeadingLevel, Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle,
  VerticalAlign, Header, Footer, PageNumber, LevelFormat, convertInchesToTwip,
  PageOrientation, TabStopType, TabStopPosition, ExternalHyperlink
} = D;

const IMG = path.join(__dirname, "img");
const img = (n) => fs.readFileSync(path.join(IMG, n));

/* ─────────── 设计令牌 ─────────── */
const C = {
  navy:   "0A1F44", midnight:"0F2557", ink:"14213C",
  cyan:   "00A8D6", cyanBr:"00D4FF",
  teal:   "0C9C86", tealBr:"00F5D4",
  gold:   "A8853C", goldBr:"C9A961", goldPale:"FBF4E3",
  violet: "6D4AB6", purple:"8B5CF6",
  magenta:"C42E77",
  blue:   "1D4ED8", sky:"0284C7",
  emerald:"0F8F68", amber:"B4780C",
  txt:    "1B2536", body:"2C3A50", mute:"6B7B93", faint:"9AA8BC",
  line:   "D3DCE8", soft:"F2F6FB", soft2:"E8EFF8",
  white:  "FFFFFF", danger:"B3261E",
};
const FONT = { ascii: "Segoe UI", eastAsia: "微软雅黑", hAnsi: "Segoe UI", cs: "Segoe UI" };
const CW = 9906;                       // 正文可用宽度 (DXA)
const IW = 658;                        // 图片宽度 (px)

/* ─────────── 基础构件 ─────────── */
const T = (text, o = {}) => new TextRun({
  text, font: FONT, size: o.size || 21, bold: o.bold || false,
  italics: o.italics || false, color: o.color || C.body,
  break: o.break || 0, allCaps: o.caps || false,
});

const P = (text, o = {}) => new Paragraph({
  children: Array.isArray(text) ? text : [T(text, o)],
  alignment: o.align || AlignmentType.JUSTIFIED,
  spacing: { before: o.before ?? 60, after: o.after ?? 110, line: o.line ?? 320 },
  indent: o.indent || undefined,
  shading: o.fill ? { type: ShadingType.CLEAR, fill: o.fill, color: "auto" } : undefined,
  border: o.border || undefined,
  pageBreakBefore: o.pbb || false,
  keepNext: o.keepNext || false,
});

const SPACER = (h = 90) => new Paragraph({ children: [T("", {})], spacing: { before: 0, after: h } });

/* 章节大标题：整条 3D 彩色凸浮条 */
const CHAPTER = (bar) => [
  new Paragraph({
    children: [new ImageRun({ data: img(bar), type: "png",
      transformation: { width: IW, height: Math.round(IW * 0.1274) } })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 260 },
    pageBreakBefore: true,
  }),
];

/* 二级标题：左侧粗色条 + 浅底 */
const H2 = (text, color = C.cyan) => new Paragraph({
  children: [T(text, { size: 26, bold: true, color: C.navy })],
  spacing: { before: 300, after: 160, line: 300 },
  shading: { type: ShadingType.CLEAR, fill: C.soft, color: "auto" },
  // 仅用 left：docx-js 的 pBdr 输出顺序为 top→bottom→left→right，
  // 与 OOXML 要求的 top→left→bottom→right 冲突，多个边框会触发 schema 错误
  border: {
    left: { style: BorderStyle.SINGLE, size: 26, color, space: 10 },
  },
  keepNext: true,
  heading: HeadingLevel.HEADING_2,
});

/* 三级标题 */
const H3 = (text, color = C.gold) => new Paragraph({
  children: [T("▍ ", { size: 22, bold: true, color }), T(text, { size: 23, bold: true, color: C.navy })],
  spacing: { before: 240, after: 110, line: 300 },
  keepNext: true,
  heading: HeadingLevel.HEADING_3,
});

/* 项目符号 */
const LI = (text, o = {}) => new Paragraph({
  children: [T("●  ", { size: 17, color: o.color || C.cyan }),
             ...(Array.isArray(text) ? text : [T(text, { size: 21 })])],
  spacing: { before: 30, after: 70, line: 300 },
  indent: { left: 340, hanging: 200 },
  alignment: AlignmentType.JUSTIFIED,
});

/* 编号条目 */
const NLI = (n, text, color = C.gold) => new Paragraph({
  children: [T(`${n}  `, { size: 21, bold: true, color }),
             ...(Array.isArray(text) ? text : [T(text, { size: 21 })])],
  spacing: { before: 30, after: 70, line: 300 },
  indent: { left: 400, hanging: 260 },
  alignment: AlignmentType.JUSTIFIED,
});

/* 图片 + 图注 */
const FIG = (file, ratio, caption, w = IW) => [
  new Paragraph({
    children: [new ImageRun({ data: img(file), type: "png",
      transformation: { width: w, height: Math.round(w * ratio) } })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 180, after: 70 },
  }),
  new Paragraph({
    children: [T(caption, { size: 17, color: C.mute, italics: true })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 220 },
  }),
];

/* 强调框 */
const CALLOUT = (title, lines, accent = C.cyan, fill = "F4FAFF") => new Table({
  columnWidths: [CW],
  width: { size: CW, type: WidthType.DXA },
  borders: {
    top:    { style: BorderStyle.SINGLE, size: 4,  color: accent },
    left:   { style: BorderStyle.SINGLE, size: 24, color: accent },
    bottom: { style: BorderStyle.SINGLE, size: 4,  color: accent },
    right:  { style: BorderStyle.SINGLE, size: 4,  color: accent },
    insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "auto" },
    insideVertical:   { style: BorderStyle.NONE, size: 0, color: "auto" },
  },
  rows: [new TableRow({
    cantSplit: true,
    children: [new TableCell({
      width: { size: CW, type: WidthType.DXA },
      shading: { type: ShadingType.CLEAR, fill, color: "auto" },
      margins: { top: 150, left: 220, bottom: 150, right: 200 },
      children: [
        ...(title ? [new Paragraph({
          children: [T(title, { size: 22, bold: true, color: accent })],
          spacing: { before: 0, after: 90, line: 300 },
        })] : []),
        ...lines.map((l, i) => new Paragraph({
          children: Array.isArray(l) ? l : [T(l, { size: 20, color: C.body })],
          spacing: { before: 0, after: i === lines.length - 1 ? 0 : 70, line: 300 },
          alignment: AlignmentType.JUSTIFIED,
        })),
      ],
    })],
  })],
});

/* 通用表格 */
function TBL(headers, rows, widths, opt = {}) {
  const accent = opt.accent || C.navy;
  const sum = widths.reduce((a, b) => a + b, 0);
  const w = widths.map(x => Math.round(x / sum * CW));
  w[w.length - 1] = CW - w.slice(0, -1).reduce((a, b) => a + b, 0);

  const hdr = new TableRow({
    tableHeader: true,
    cantSplit: true,
    children: headers.map((h, i) => new TableCell({
      width: { size: w[i], type: WidthType.DXA },
      shading: { type: ShadingType.CLEAR, fill: accent, color: "auto" },
      margins: { top: 110, left: 130, bottom: 110, right: 130 },
      verticalAlign: VerticalAlign.CENTER,
      children: [new Paragraph({
        children: [T(h, { size: 19, bold: true, color: C.white })],
        alignment: (opt.align && opt.align[i]) || AlignmentType.CENTER,
        spacing: { before: 0, after: 0, line: 280 },
      })],
    })),
  });

  const body = rows.map((r, ri) => new TableRow({
    cantSplit: true,
    children: r.map((cell, i) => {
      const isObj = cell && typeof cell === "object" && !Array.isArray(cell);
      const val = isObj ? cell.t : cell;
      return new TableCell({
        width: { size: w[i], type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR,
          fill: (isObj && cell.fill) || (ri % 2 ? C.soft : C.white), color: "auto" },
        margins: { top: 95, left: 130, bottom: 95, right: 130 },
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({
          children: [T(String(val), {
            size: (isObj && cell.size) || 19,
            bold: (isObj && cell.bold) || false,
            color: (isObj && cell.color) || C.body,
          })],
          alignment: (isObj && cell.align) || (opt.align && opt.align[i]) || AlignmentType.LEFT,
          spacing: { before: 0, after: 0, line: 280 },
        })],
      });
    }),
  }));

  return new Table({
    columnWidths: w,
    width: { size: CW, type: WidthType.DXA },
    borders: {
      top:    { style: BorderStyle.SINGLE, size: 4, color: accent },
      left:   { style: BorderStyle.SINGLE, size: 2, color: C.line },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: accent },
      right:  { style: BorderStyle.SINGLE, size: 2, color: C.line },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: C.line },
      insideVertical:   { style: BorderStyle.SINGLE, size: 2, color: C.line },
    },
    rows: [hdr, ...body],
  });
}

/* KPI 数字卡片行 */
function KPI(items, accent = C.cyan) {
  const n = items.length;
  const w = Array(n).fill(Math.floor(CW / n));
  w[n - 1] = CW - w.slice(0, -1).reduce((a, b) => a + b, 0);
  return new Table({
    columnWidths: w,
    width: { size: CW, type: WidthType.DXA },
    borders: {
      top:{style:BorderStyle.NONE,size:0,color:"auto"}, left:{style:BorderStyle.NONE,size:0,color:"auto"},
      bottom:{style:BorderStyle.NONE,size:0,color:"auto"}, right:{style:BorderStyle.NONE,size:0,color:"auto"},
      insideHorizontal:{style:BorderStyle.NONE,size:0,color:"auto"},
      insideVertical:{style:BorderStyle.SINGLE,size:8,color:C.white},
    },
    rows: [new TableRow({
      cantSplit: true,
      children: items.map((it, i) => new TableCell({
        width: { size: w[i], type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, fill: it.fill || C.soft, color: "auto" },
        margins: { top: 150, left: 90, bottom: 150, right: 90 },
        verticalAlign: VerticalAlign.CENTER,
        children: [
          new Paragraph({ children: [T(it.v, { size: 32, bold: true, color: it.color || accent })],
            alignment: AlignmentType.CENTER, spacing: { before: 0, after: 50, line: 320 } }),
          new Paragraph({ children: [T(it.k, { size: 17, color: C.mute })],
            alignment: AlignmentType.CENTER, spacing: { before: 0, after: 0, line: 260 } }),
        ],
      })),
    })],
  });
}

/* 目录卡片（两列） */
function TOCGRID(items) {
  const rows = [];
  for (let i = 0; i < items.length; i += 2) {
    const pair = [items[i], items[i + 1]].filter(Boolean);
    rows.push(new TableRow({
      cantSplit: true,
      children: [0, 1].map(k => {
        const it = pair[k];
        const cw = Math.floor(CW / 2);
        if (!it) return new TableCell({
          width: { size: CW - cw, type: WidthType.DXA },
          shading: { type: ShadingType.CLEAR, fill: C.white, color: "auto" },
          margins: { top: 120, left: 140, bottom: 120, right: 140 },
          children: [P("", { after: 0 })],
        });
        return new TableCell({
          width: { size: k === 0 ? cw : CW - cw, type: WidthType.DXA },
          shading: { type: ShadingType.CLEAR, fill: C.soft, color: "auto" },
          margins: { top: 140, left: 150, bottom: 140, right: 150 },
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              children: [T(it.n + "   ", { size: 26, bold: true, color: it.c }),
                         T(it.t, { size: 21, bold: true, color: C.navy })],
              spacing: { before: 0, after: 60, line: 300 },
            }),
            new Paragraph({ children: [T(it.d, { size: 17, color: C.mute })],
              spacing: { before: 0, after: 0, line: 270 } }),
          ],
        });
      }),
    }));
  }
  return new Table({
    columnWidths: [Math.floor(CW / 2), CW - Math.floor(CW / 2)],
    width: { size: CW, type: WidthType.DXA },
    borders: {
      top:{style:BorderStyle.NONE,size:0,color:"auto"}, left:{style:BorderStyle.NONE,size:0,color:"auto"},
      bottom:{style:BorderStyle.NONE,size:0,color:"auto"}, right:{style:BorderStyle.NONE,size:0,color:"auto"},
      insideHorizontal:{style:BorderStyle.SINGLE,size:10,color:C.white},
      insideVertical:{style:BorderStyle.SINGLE,size:10,color:C.white},
    },
    rows,
  });
}

module.exports = { D, C, FONT, CW, IW, T, P, SPACER, CHAPTER, H2, H3, LI, NLI,
                   FIG, CALLOUT, TBL, KPI, TOCGRID, img };
