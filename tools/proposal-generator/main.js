/* 组装并输出 Word 文档（封面/封底为可编辑文字；目录带真实页码） */
const fs = require("fs");
const path = require("path");
const B = require("./build.js");
const { D, C, FONT, T, img } = B;
const {
  Document, Packer, Paragraph, TextRun, ImageRun, AlignmentType, Header, Footer,
  PageNumber, BorderStyle, Table, TableRow, TableCell, WidthType, ShadingType,
  VerticalAlign, TabStopType,
} = D;

const C1 = require("./content.js");
const C2 = require("./content2.js");
const C3 = require("./content3.js");
const { TOC_ENTRIES } = require("./toc.js");

const PAGEMAP = fs.existsSync(path.join(__dirname, "pagemap.json"))
  ? JSON.parse(fs.readFileSync(path.join(__dirname, "pagemap.json"), "utf8"))
  : {};

/* 封面页可用宽度：页宽 11906 − 左右各 720 */
const CWC = 10466;

/* ────────── 页眉 / 页脚 ────────── */
const HDR = new Header({
  children: [new Paragraph({
    children: [
      new TextRun({ text: "AI 智能投研平台", font: FONT, size: 15, color: C.navy, bold: true }),
      new TextRun({ text: "　·　商务技术方案与模块报价书", font: FONT, size: 15, color: C.faint }),
      new TextRun({ text: "\t机密", font: FONT, size: 15, color: C.faint }),
    ],
    tabStops: [{ type: TabStopType.RIGHT, position: 9906 }],
    spacing: { before: 0, after: 40 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.goldBr, space: 5 } },
  })],
});

const FTR = new Footer({
  children: [new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 60, after: 0 },
    border: { top: { style: BorderStyle.SINGLE, size: 6, color: C.line, space: 6 } },
    children: [
      new TextRun({ text: "— ", font: FONT, size: 16, color: C.faint }),
      new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: C.gold, bold: true }),
      new TextRun({ text: " / ", font: FONT, size: 16, color: C.faint }),
      new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 16, color: C.faint }),
      new TextRun({ text: " —", font: FONT, size: 16, color: C.faint }),
    ],
  })],
});
const EMPTY_H = new Header({ children: [new Paragraph({ children: [] })] });
const EMPTY_F = new Footer({ children: [new Paragraph({ children: [] })] });

/* ────────── 封面 / 封底构件（全部为可编辑文字） ────────── */
const banner = (file, ratio) => new Paragraph({
  children: [new ImageRun({ data: img(file), type: "png",
    transformation: { width: 698, height: Math.round(698 * ratio) } })],
  alignment: AlignmentType.CENTER,
  spacing: { before: 0, after: 0 },
});

const cline = (text, o) => new Paragraph({
  children: [new TextRun({ text, font: FONT, size: o.size, bold: o.bold || false,
                           color: o.color, characterSpacing: o.sp || 0 })],
  alignment: AlignmentType.CENTER,
  spacing: { before: o.before ?? 0, after: o.after ?? 90, line: o.line ?? 340 },
  ...(o.rule ? { border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.goldBr, space: 8 } } } : {}),
});

/* 深色标题面板（单元格底色 + 可编辑文字） */
const darkPanel = (children, fill = "0A1F44") => new Table({
  columnWidths: [CWC],
  width: { size: CWC, type: WidthType.DXA },
  borders: {
    top:    { style: BorderStyle.SINGLE, size: 12, color: "00A8D6" },
    left:   { style: BorderStyle.SINGLE, size: 6,  color: "00A8D6" },
    bottom: { style: BorderStyle.SINGLE, size: 6,  color: "00A8D6" },
    right:  { style: BorderStyle.SINGLE, size: 6,  color: "00A8D6" },
    insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "auto" },
    insideVertical:   { style: BorderStyle.NONE, size: 0, color: "auto" },
  },
  rows: [new TableRow({
    cantSplit: true,
    children: [new TableCell({
      width: { size: CWC, type: WidthType.DXA },
      shading: { type: ShadingType.CLEAR, fill, color: "auto" },
      margins: { top: 420, left: 300, bottom: 420, right: 300 },
      verticalAlign: VerticalAlign.CENTER,
      children,
    })],
  })],
});

/* 委托方 / 承制方 / 版本 —— 可编辑占位符 */
const infoTable = (rows) => {
  const w = [2600, CWC - 2600];
  return new Table({
    columnWidths: w,
    width: { size: CWC, type: WidthType.DXA },
    borders: {
      top:    { style: BorderStyle.SINGLE, size: 4, color: C.goldBr },
      left:   { style: BorderStyle.SINGLE, size: 4, color: C.goldBr },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: C.goldBr },
      right:  { style: BorderStyle.SINGLE, size: 4, color: C.goldBr },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: "E4D9BC" },
      insideVertical:   { style: BorderStyle.SINGLE, size: 2, color: "E4D9BC" },
    },
    rows: rows.map(([k, v]) => new TableRow({
      cantSplit: true,
      children: [
        new TableCell({
          width: { size: w[0], type: WidthType.DXA },
          shading: { type: ShadingType.CLEAR, fill: "FBF4E3", color: "auto" },
          margins: { top: 170, left: 260, bottom: 170, right: 160 },
          verticalAlign: VerticalAlign.CENTER,
          children: [new Paragraph({
            children: [new TextRun({ text: k, font: FONT, size: 22, bold: true, color: C.gold })],
            spacing: { before: 0, after: 0, line: 300 },
          })],
        }),
        new TableCell({
          width: { size: w[1], type: WidthType.DXA },
          shading: { type: ShadingType.CLEAR, fill: "FFFFFF", color: "auto" },
          margins: { top: 170, left: 260, bottom: 170, right: 160 },
          verticalAlign: VerticalAlign.CENTER,
          children: [new Paragraph({
            children: [new TextRun({ text: v, font: FONT, size: 22, color: C.navy })],
            spacing: { before: 0, after: 0, line: 300 },
          })],
        }),
      ],
    })),
  });
};

const COVER = [
  banner("banner.png", 640 / 1240),
  new Paragraph({ children: [], spacing: { before: 0, after: 300 } }),
  darkPanel([
    cline("AI 智能投研平台", { size: 60, bold: true, color: "3ED8FF", after: 120 }),
    cline("对标 TryQuant", { size: 26, color: "E8C87E", after: 200, sp: 40 }),
    cline("", { size: 2, color: "0A1F44", after: 160, rule: true }),
    cline("深度调研 · 复刻路径 · 超越方案", { size: 42, bold: true, color: "FFFFFF", after: 150 }),
    cline("境内 A股版　＋　境外 港美股 / 加密版", { size: 27, color: "5CF0DA", after: 150 }),
    cline("商 务 技 术 方 案 与 模 块 报 价 书", { size: 25, color: "CFE0F2", after: 0, sp: 30 }),
  ]),
  new Paragraph({ children: [], spacing: { before: 0, after: 900 } }),
  infoTable([
    ["委 托 方", "【甲方名称】"],
    ["承 制 方", "【乙方名称】"],
    ["版　　本", "V1.0　　|　　2026 年 7 月"],
  ]),
  new Paragraph({ children: [], spacing: { before: 0, after: 900 } }),
  cline("— 机 密 · 仅 供 评 估 使 用 · 未 经 许 可 不 得 外 传 —",
        { size: 18, color: C.faint, after: 0 }),
];

const BACK = [
  banner("banner2.png", 420 / 1240),
  new Paragraph({ children: [], spacing: { before: 0, after: 300 } }),
  darkPanel([
    cline("感 谢 评 阅", { size: 46, bold: true, color: "FFFFFF", after: 180, sp: 60 }),
    cline("期待与【甲方名称】共同构建", { size: 26, color: "5CF0DA", after: 90 }),
    cline("下一代 AI 投研基础设施", { size: 26, color: "5CF0DA", after: 0 }),
  ]),
  new Paragraph({ children: [], spacing: { before: 0, after: 900 } }),
  infoTable([
    ["承 制 方", "【乙方名称】"],
    ["联 系 人", "【姓名】　　电话：【　　　】"],
    ["邮　　箱", "【　　　　　　　　　　】"],
  ]),
  new Paragraph({ children: [], spacing: { before: 0, after: 1000 } }),
  cline("— 本文件为商业秘密，未经书面许可不得复制或披露 —",
        { size: 18, color: C.faint, after: 0 }),
];

/* ────────── 目录 ────────── */
function tocRow(e) {
  const isCh = e.level === 1;
  const w = [1100, 7600, CWC - 1100 - 7600];
  const pg = PAGEMAP[e.key];
  return new TableRow({
    cantSplit: true,
    children: [
      new TableCell({
        width: { size: w[0], type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, fill: isCh ? C.soft : "FFFFFF", color: "auto" },
        margins: { top: isCh ? 130 : 70, left: isCh ? 180 : 420, bottom: isCh ? 130 : 70, right: 60 },
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({
          children: [new TextRun({ text: e.no, font: FONT,
            size: isCh ? 24 : 19, bold: true, color: isCh ? e.color : C.mute })],
          spacing: { before: 0, after: 0, line: 280 },
        })],
      }),
      new TableCell({
        width: { size: w[1], type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, fill: isCh ? C.soft : "FFFFFF", color: "auto" },
        margins: { top: isCh ? 130 : 70, left: 60, bottom: isCh ? 130 : 70, right: 120 },
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({
          children: [new TextRun({ text: e.title, font: FONT,
            size: isCh ? 23 : 19, bold: isCh, color: isCh ? C.navy : C.body })],
          spacing: { before: 0, after: 0, line: 280 },
        })],
      }),
      new TableCell({
        width: { size: w[2], type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, fill: isCh ? C.soft : "FFFFFF", color: "auto" },
        margins: { top: isCh ? 130 : 70, left: 60, bottom: isCh ? 130 : 70, right: 180 },
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({
          children: [new TextRun({ text: pg ? String(pg) : "　", font: FONT,
            size: isCh ? 22 : 19, bold: isCh, color: isCh ? e.color : C.mute })],
          alignment: AlignmentType.RIGHT,
          spacing: { before: 0, after: 0, line: 280 },
        })],
      }),
    ],
  });
}

const TOC_BLOCK = [
  new Paragraph({
    children: [new TextRun({ text: "目　　录", font: FONT, size: 40, bold: true, color: C.navy, characterSpacing: 40 })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 90, line: 400 },
  }),
  new Paragraph({
    children: [new TextRun({ text: "CONTENTS", font: FONT, size: 18, color: C.gold, characterSpacing: 90 })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 60, line: 260 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 10, color: C.goldBr, space: 8 } },
  }),
  new Paragraph({ children: [], spacing: { before: 0, after: 220 } }),
  new Table({
    columnWidths: [1100, 7600, CWC - 8700],
    width: { size: CWC, type: WidthType.DXA },
    borders: {
      top:    { style: BorderStyle.NONE, size: 0, color: "auto" },
      left:   { style: BorderStyle.NONE, size: 0, color: "auto" },
      bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
      right:  { style: BorderStyle.NONE, size: 0, color: "auto" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "FFFFFF" },
      insideVertical:   { style: BorderStyle.NONE, size: 0, color: "auto" },
    },
    rows: TOC_ENTRIES.map(tocRow),
  }),
];

/* ────────── 文档 ────────── */
const doc = new Document({
  creator: "【乙方名称】",
  title: "AI 智能投研平台 · 商务技术方案与模块报价书",
  description: "对标 TryQuant 的深度调研、复刻路径与超越方案",
  styles: {
    default: {
      document: { run: { font: FONT, size: 21, color: C.body } },
      heading1: { run: { font: FONT, size: 30, bold: true, color: C.navy } },
      heading2: { run: { font: FONT, size: 26, bold: true, color: C.navy } },
      heading3: { run: { font: FONT, size: 23, bold: true, color: C.navy } },
    },
  },
  sections: [
    /* 封面 + 目录（无页眉页脚） */
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 900, right: 720, bottom: 720, left: 720, header: 0, footer: 0 },
        },
      },
      headers: { default: EMPTY_H },
      footers: { default: EMPTY_F },
      children: [
        ...COVER,
        new Paragraph({ children: [], pageBreakBefore: true }),
        ...TOC_BLOCK,
      ],
    },
    /* 正文 */
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1080, right: 1000, bottom: 1000, left: 1000, header: 620, footer: 480 },
          pageNumbers: { start: 1 },
        },
      },
      headers: { default: HDR },
      footers: { default: FTR },
      children: [
        ...C1.CH01,
        ...C1.CH02,
        ...C1.CH03,
        ...C1.CH04,
        ...C1.CH05, ...C3.CH05X,
        ...C2.CH06, ...C3.CH06X,
        ...C2.CH07,
        ...C2.CH08, ...C3.CH08X,
        ...C2.CH09,
        ...C2.CH10, ...C3.CH10X,
      ],
    },
    /* 封底 */
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 900, right: 720, bottom: 720, left: 720, header: 0, footer: 0 },
        },
      },
      headers: { default: EMPTY_H },
      footers: { default: EMPTY_F },
      children: BACK,
    },
  ],
});

const OUT = "/home/user/-/AI智能投研平台_商务技术方案与模块报价书_V1.0.docx";
Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(OUT, buf);
  console.log("✓ " + OUT);
  console.log("  " + (buf.length / 1024 / 1024).toFixed(2) + " MB  |  目录页码条目 " +
    Object.keys(PAGEMAP).length + " 项");
});
