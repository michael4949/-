import { LayoutSpec } from "./budget";

/**
 * 模型产出的 Markdown-lite 正文 → 排版块。
 * 支持：普通段落、`| a | b |` 表格、`- ` 列表项；`#` 标题降级为加粗段（叶子内不允许再分标题）。
 */
export type Block =
  | { t: "p"; text: string; bold?: boolean }
  | { t: "li"; text: string }
  | { t: "table"; rows: string[][]; headerRows: number };

const TABLE_SEP = /^\s*\|?[\s:-]+\|[\s|:-]*$/; // | --- | --- |

function splitRow(line: string): string[] {
  return line.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map((c) => c.trim());
}

export function parseBlocks(content: string): Block[] {
  const lines = content.replace(/\r/g, "").split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trim();
    if (!line) { i++; continue; }

    if (line.startsWith("|") && line.includes("|", 1)) {
      const rows: string[][] = [];
      let headerRows = 0;
      while (i < lines.length) {
        const l = lines[i].trim();
        if (!l.startsWith("|")) break;
        if (TABLE_SEP.test(l)) { headerRows = Math.max(headerRows, Math.min(rows.length, 1)); i++; continue; }
        rows.push(splitRow(l));
        i++;
      }
      if (rows.length) blocks.push({ t: "table", rows, headerRows });
      continue;
    }

    if (/^[-•·]\s+/.test(line)) {
      blocks.push({ t: "li", text: line.replace(/^[-•·]\s+/, "") });
      i++;
      continue;
    }

    // 模型偶发输出 "#### 小标"：降级为加粗独立段
    const h = line.match(/^#{1,6}\s+(.*)$/);
    if (h) {
      blocks.push({ t: "p", text: h[1].trim(), bold: true });
      i++;
      continue;
    }

    blocks.push({ t: "p", text: line });
    i++;
  }
  return blocks;
}

/** 把 **加粗** 切成 [文本, 是否加粗] 片段，供 docx 渲染内联样式 */
export function splitBoldRuns(text: string): Array<{ text: string; bold: boolean }> {
  const out: Array<{ text: string; bold: boolean }> = [];
  const re = /\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), bold: false });
    out.push({ text: m[1], bold: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), bold: false });
  return out.length ? out : [{ text, bold: false }];
}

/** 去除 Markdown 痕迹后的可读纯文本（用于字数统计） */
export function plainText(content: string): string {
  return content
    .replace(/\*\*/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*\|[\s:|-]+\|\s*$/gm, "")
    .replace(/\|/g, " ");
}

/** 按板式估算这些块占用的行数（页数估算的基础） */
export function estimateLines(blocks: Block[], layout: LayoutSpec): number {
  let lines = 0;
  for (const b of blocks) {
    if (b.t === "table") {
      lines += b.rows.length * 1.6 + 1; // 表格行更高 + 前后留白
    } else {
      const len = b.text.replace(/\*\*/g, "").length;
      lines += Math.ceil(Math.max(1, len) / layout.charsPerLine) + 0.25;
    }
  }
  return lines;
}
