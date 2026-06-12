import {
  AlignmentType, BorderStyle, Document, Footer, Header, HeadingLevel, LineRuleType,
  Packer, PageNumber, Paragraph, ShadingType, Table, TableCell, TableLayoutType,
  TableOfContents, TableRow, TextRun, VerticalAlign, WidthType, convertMillimetersToTwip,
} from "docx";
import { BidRunState, OutlineNode } from "../../bidTypes";
import { LAYOUTS, LayoutSpec, headingNo } from "./budget";
import { Block, parseBlocks, splitBoldRuns } from "./blocks";

/**
 * 工作流阶段⑤：按国标板式把全部章节渲染为 .docx（浏览器本地完成）。
 * 板式参数（页边距/字体/字号/行距/页码样式）全部来自 budget.ts 的 LayoutSpec。
 * 目录使用 Word 目录域：首次打开按提示“更新域”即可生成带页码的目录。
 */

const HEADING_LEVELS = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4] as const;

function fonts(eastAsia: string, ascii: string) {
  return { ascii, hAnsi: ascii, eastAsia };
}

function bodySpacing(spec: LayoutSpec) {
  return spec.lineExactPt > 0
    ? { line: spec.lineExactPt * 20, lineRule: LineRuleType.EXACT }
    : { line: Math.round(spec.lineMultiple * 240), lineRule: LineRuleType.AUTO };
}

function bodyParagraph(spec: LayoutSpec, runs: TextRun[], opts: { indent?: boolean; center?: boolean } = {}): Paragraph {
  return new Paragraph({
    children: runs,
    alignment: opts.center ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
    spacing: bodySpacing(spec),
    indent: opts.indent === false ? undefined : { firstLine: spec.firstLineChars * spec.bodySizePt * 20 },
  });
}

function textRuns(spec: LayoutSpec, text: string, sizePt = spec.bodySizePt): TextRun[] {
  return splitBoldRuns(text).map(
    (r) =>
      new TextRun({
        text: r.text,
        bold: r.bold || undefined,
        size: Math.round(sizePt * 2),
        font: fonts(spec.bodyEastAsia, spec.bodyAscii),
      })
  );
}

function renderTable(spec: LayoutSpec, rows: string[][], headerRows: number): Table {
  const colCount = Math.max(...rows.map((r) => r.length));
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.AUTOFIT,
    rows: rows.map(
      (cells, ri) =>
        new TableRow({
          tableHeader: ri < headerRows,
          children: Array.from({ length: colCount }, (_, ci) => {
            const isHeader = ri < headerRows;
            return new TableCell({
              verticalAlign: VerticalAlign.CENTER,
              shading: isHeader ? { type: ShadingType.CLEAR, fill: "F2F2F2" } : undefined,
              children: [
                new Paragraph({
                  alignment: isHeader ? AlignmentType.CENTER : AlignmentType.LEFT,
                  spacing: { line: 300, lineRule: LineRuleType.AUTO },
                  children: splitBoldRuns(cells[ci] ?? "").map(
                    (r) =>
                      new TextRun({
                        text: r.text,
                        bold: isHeader || r.bold || undefined,
                        size: Math.round(spec.tableSizePt * 2),
                        font: fonts("宋体", spec.bodyAscii),
                      })
                  ),
                }),
              ],
            });
          }),
        })
    ),
  });
}

function renderBlocks(spec: LayoutSpec, blocks: Block[]): Array<Paragraph | Table> {
  const out: Array<Paragraph | Table> = [];
  for (const b of blocks) {
    if (b.t === "table") {
      out.push(renderTable(spec, b.rows, b.headerRows));
      out.push(new Paragraph({ children: [], spacing: { line: 120, lineRule: LineRuleType.AUTO } })); // 表后留白
    } else if (b.t === "li") {
      out.push(bodyParagraph(spec, textRuns(spec, `• ${b.text}`)));
    } else {
      // 被降级的 "#" 标题整段加粗
      const text = b.bold ? `**${b.text.replace(/\*\*/g, "")}**` : b.text;
      out.push(bodyParagraph(spec, textRuns(spec, text)));
    }
  }
  return out;
}

function headingParagraph(spec: LayoutSpec, node: OutlineNode, index1: number): Paragraph {
  const h = spec.h[Math.min(node.level, spec.h.length - 1)];
  return new Paragraph({
    heading: HEADING_LEVELS[Math.min(node.level, 3)],
    pageBreakBefore: node.level === 0,
    alignment: h.center ? AlignmentType.CENTER : AlignmentType.LEFT,
    spacing: { before: node.level === 0 ? 240 : 160, after: node.level === 0 ? 360 : 120, ...bodySpacing(spec) },
    children: [
      new TextRun({
        text: `${headingNo(node.level, index1)}${node.title}`,
        bold: h.bold || undefined,
        size: Math.round(h.sizePt * 2),
        font: fonts(h.eastAsia, spec.bodyAscii),
      }),
    ],
  });
}

function walkOutline(spec: LayoutSpec, state: BidRunState, nodes: OutlineNode[], out: Array<Paragraph | Table>): void {
  nodes.forEach((node, i) => {
    out.push(headingParagraph(spec, node, i + 1));
    if (!node.children.length) {
      const draft = state.sections[node.id];
      if (draft?.content?.trim()) out.push(...renderBlocks(spec, parseBlocks(draft.content)));
    } else {
      walkOutline(spec, state, node.children, out);
    }
  });
}

function coverChildren(spec: LayoutSpec, state: BidRunState): Paragraph[] {
  const t = state.tender!;
  const c = state.company!;
  const line = (text: string, sizePt: number, eastAsia: string, opts: { before?: number; after?: number; bold?: boolean } = {}) =>
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: opts.before ?? 120, after: opts.after ?? 120 },
      children: [new TextRun({ text, bold: opts.bold || undefined, size: Math.round(sizePt * 2), font: fonts(eastAsia, spec.bodyAscii) })],
    });
  return [
    new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 600 }, children: [new TextRun({ text: "（正本）", size: 32, font: fonts("黑体", spec.bodyAscii) })] }),
    line(t.projectName || "（项目名称）", 22, "黑体", { before: 600 }),
    line(t.tenderNo ? `（招标编号：${t.tenderNo}）` : "", 16, spec.bodyEastAsia),
    line("投  标  文  件", 36, "黑体", { before: 1200, after: 1800, bold: true }),
    line(`投标人：${c.name || "（投标人全称）"}（盖章）`, 16, spec.bodyEastAsia, { before: 1800 }),
    line("法定代表人或其委托代理人：　　　　　　（签字）", 16, spec.bodyEastAsia),
    line("日期：　　　　年　　月　　日", 16, spec.bodyEastAsia),
  ].filter((p) => p);
}

function pageFooter(spec: LayoutSpec): Footer {
  const runProps = { size: Math.round(spec.metaSizePt * 2), font: fonts("宋体", spec.bodyAscii) };
  const children =
    spec.pageNoStyle === "gb"
      ? [new TextRun({ text: "— ", ...runProps }), new TextRun({ children: [PageNumber.CURRENT], ...runProps }), new TextRun({ text: " —", ...runProps })]
      : [
          new TextRun({ text: "第 ", ...runProps }),
          new TextRun({ children: [PageNumber.CURRENT], ...runProps }),
          new TextRun({ text: " 页  共 ", ...runProps }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], ...runProps }),
          new TextRun({ text: " 页", ...runProps }),
        ];
  return new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children })] });
}

function pageHeader(spec: LayoutSpec, state: BidRunState): Header {
  return new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, space: 2 } },
        children: [
          new TextRun({
            text: `${state.tender!.projectName || ""}　投标文件`,
            size: Math.round(spec.metaSizePt * 2),
            font: fonts("宋体", spec.bodyAscii),
          }),
        ],
      }),
    ],
  });
}

export function buildBidDocument(state: BidRunState): Document {
  const spec = LAYOUTS[state.options.layout];
  const margin = {
    top: convertMillimetersToTwip(spec.marginMm.top),
    bottom: convertMillimetersToTwip(spec.marginMm.bottom),
    left: convertMillimetersToTwip(spec.marginMm.left),
    right: convertMillimetersToTwip(spec.marginMm.right),
  };
  const pageSize = { width: convertMillimetersToTwip(210), height: convertMillimetersToTwip(297) }; // A4

  const body: Array<Paragraph | Table> = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 360 },
      children: [new TextRun({ text: "目　　录", size: 32, font: fonts("黑体", spec.bodyAscii) })],
    }),
    new TableOfContents("目录", { hyperlink: true, headingStyleRange: "1-3" }),
  ];
  walkOutline(spec, state, state.outline!, body);

  return new Document({
    creator: state.company?.name || "标书智能工厂",
    title: `${state.tender?.projectName || ""} 投标文件`,
    features: { updateFields: true }, // 打开时提示更新目录页码
    styles: {
      default: {
        document: {
          run: { size: Math.round(spec.bodySizePt * 2), font: fonts(spec.bodyEastAsia, spec.bodyAscii) },
        },
      },
    },
    sections: [
      { properties: { page: { size: pageSize, margin } }, children: coverChildren(spec, state) }, // 封面：无页眉页码
      {
        properties: { page: { size: pageSize, margin, pageNumbers: { start: 1 } } },
        headers: { default: pageHeader(spec, state) },
        footers: { default: pageFooter(spec) },
        children: body,
      },
    ],
  });
}

export async function renderToBlob(state: BidRunState): Promise<{ blob: Blob; fileName: string }> {
  const doc = buildBidDocument(state);
  const blob = await Packer.toBlob(doc);
  const date = new Date().toISOString().slice(0, 10);
  const safeName = (state.tender?.projectName || "投标项目").replace(/[\\/:*?"<>|]/g, "").slice(0, 40);
  return { blob, fileName: `投标文件-${safeName}-${date}.docx` };
}

/** Node 冒烟测试用：渲染为 Buffer（浏览器内不调用） */
export async function renderToBuffer(state: BidRunState): Promise<Uint8Array> {
  return Packer.toBuffer(buildBidDocument(state));
}
