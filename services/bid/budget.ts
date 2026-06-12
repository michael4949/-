import { LayoutId, OutlineNode } from "../../bidTypes";

/**
 * 板式规格：既是页数估算的依据，也是 docx 排版的唯一参数来源。
 *
 * gbGov  —— 按 GB/T 9704-2012《党政机关公文格式》衍生的“国标公文式”标书板式：
 *           A4，页边距上 3.7 / 下 3.5 / 左 2.8 / 右 2.6 cm；
 *           正文仿宋_GB2312 三号（16pt），固定行距 28 磅 → 每页约 22 行 × 28 字。
 * general —— 工程/政采实践中最常见的“通用标书式”：
 *           A4，页边距上下 2.54 / 左右 3.18 cm；正文宋体小四（12pt），1.5 倍行距。
 */
export interface LayoutSpec {
  id: LayoutId;
  label: string;
  desc: string;
  // —— 页面容量（用于预算与页数估算）——
  charsPerLine: number;
  linesPerPage: number;
  /** 折算了段落间隙、小标题、表格留白后的“有效字数/页” */
  charsPerPageEffective: number;
  // —— 版面 ——
  marginMm: { top: number; bottom: number; left: number; right: number };
  // —— 正文 ——
  bodyEastAsia: string;
  bodyAscii: string;
  bodySizePt: number;
  /** 固定行距（磅）；为 0 时用 lineMultiple 倍数行距 */
  lineExactPt: number;
  lineMultiple: number;
  firstLineChars: number; // 首行缩进字符数
  // —— 标题（章 / 一、 / （一） / 1.）——
  h: Array<{ eastAsia: string; sizePt: number; bold: boolean; center: boolean }>;
  // —— 表格 / 页眉页脚 ——
  tableSizePt: number;
  metaSizePt: number; // 页眉页脚字号
  /** 页码样式：gb = “— 1 —”，plain = “第 1 页 共 N 页” */
  pageNoStyle: "gb" | "plain";
}

export const LAYOUTS: Record<LayoutId, LayoutSpec> = {
  gbGov: {
    id: "gbGov",
    label: "国标公文式（GB/T 9704）",
    desc: "仿宋_GB2312 三号 · 28磅行距 · 每页约22行×28字 · 页码“— 1 —”",
    charsPerLine: 28,
    linesPerPage: 22,
    charsPerPageEffective: 520,
    marginMm: { top: 37, bottom: 35, left: 28, right: 26 },
    bodyEastAsia: "仿宋_GB2312",
    bodyAscii: "Times New Roman",
    bodySizePt: 16,
    lineExactPt: 28,
    lineMultiple: 0,
    firstLineChars: 2,
    h: [
      { eastAsia: "黑体", sizePt: 18, bold: false, center: true },        // 章：小二黑体居中
      { eastAsia: "黑体", sizePt: 16, bold: false, center: false },       // 一、 黑体三号
      { eastAsia: "楷体_GB2312", sizePt: 16, bold: false, center: false },// （一） 楷体三号
      { eastAsia: "仿宋_GB2312", sizePt: 16, bold: true, center: false }, // 1. 仿宋三号加粗
    ],
    tableSizePt: 10.5,
    metaSizePt: 10.5,
    pageNoStyle: "gb",
  },
  general: {
    id: "general",
    label: "通用标书式（宋体小四）",
    desc: "宋体小四 · 1.5倍行距 · 每页约30行×34字 · 页码“第 1 页 共 N 页”",
    charsPerLine: 34,
    linesPerPage: 30,
    charsPerPageEffective: 820,
    marginMm: { top: 25.4, bottom: 25.4, left: 31.8, right: 31.8 },
    bodyEastAsia: "宋体",
    bodyAscii: "Times New Roman",
    bodySizePt: 12,
    lineExactPt: 0,
    lineMultiple: 1.5,
    firstLineChars: 2,
    h: [
      { eastAsia: "黑体", sizePt: 18, bold: false, center: true }, // 章：小二黑体居中
      { eastAsia: "黑体", sizePt: 15, bold: false, center: false },// 一、 黑体小三
      { eastAsia: "黑体", sizePt: 14, bold: false, center: false },// （一） 黑体四号
      { eastAsia: "宋体", sizePt: 12, bold: true, center: false }, // 1. 宋体小四加粗
    ],
    tableSizePt: 10.5,
    metaSizePt: 9,
    pageNoStyle: "plain",
  },
};

const CN_DIGITS = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];

/** 1 → 一，12 → 十二，23 → 二十三（支持 1-99，标书章节编号足够） */
export function toCn(n: number): string {
  if (n <= 0 || n > 99) return String(n);
  if (n < 10) return CN_DIGITS[n];
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return (tens === 1 ? "" : CN_DIGITS[tens]) + "十" + (ones ? CN_DIGITS[ones] : "");
}

/** 标题编号：第X章 / 一、 / （一） / 1. */
export function headingNo(level: number, index1: number): string {
  switch (level) {
    case 0: return `第${toCn(index1)}章　`;
    case 1: return `${toCn(index1)}、`;
    case 2: return `（${toCn(index1)}）`;
    default: return `${index1}.`;
  }
}

export function flattenLeaves(outline: OutlineNode[]): OutlineNode[] {
  const out: OutlineNode[] = [];
  const walk = (n: OutlineNode) => {
    if (!n.children.length) out.push(n);
    else n.children.forEach(walk);
  };
  outline.forEach(walk);
  return out;
}

export function countNodes(outline: OutlineNode[]): { headings: number; chapters: number } {
  let headings = 0, chapters = 0;
  const walk = (n: OutlineNode) => {
    headings += 1;
    if (n.level === 0) chapters += 1;
    n.children.forEach(walk);
  };
  outline.forEach(walk);
  return { headings, chapters };
}

/**
 * 标题与“每章另起一页”的版面开销（页）。
 * 章标题平均浪费半页（前一章末尾留白）+ 自身占 3 行；其余标题约 1.6 行。
 */
export function overheadPages(outline: OutlineNode[], layout: LayoutSpec): number {
  const { headings, chapters } = countNodes(outline);
  const headingLines = chapters * 3 + (headings - chapters) * 1.6;
  return chapters * 0.5 + headingLines / layout.linesPerPage + 3; // +3：封面、目录(约2页)
}

/** 由“已写字数”快速估算成品页数（用于进度展示与达标判断） */
export function estimatePagesFromChars(chars: number, outline: OutlineNode[], layout: LayoutSpec): number {
  return Math.round(chars / layout.charsPerPageEffective + overheadPages(outline, layout));
}

/** 目标页数 → 需要写出的正文总字数 */
export function targetTotalChars(targetPages: number, outline: OutlineNode[], layout: LayoutSpec): number {
  const pages = Math.max(10, targetPages - overheadPages(outline, layout));
  return Math.round(pages * layout.charsPerPageEffective);
}

export const LEAF_MIN_CHARS = 600;
export const LEAF_MAX_CHARS = 6000;

/**
 * 把目标总字数按叶子节点现有 targetChars 的比例重新缩放（保持模型给出的轻重关系），
 * 并夹在 [LEAF_MIN, LEAF_MAX] 内。原地修改 outline，返回分配后的总字数。
 */
export function allocateBudgets(outline: OutlineNode[], targetPages: number, layout: LayoutSpec): number {
  const leaves = flattenLeaves(outline);
  if (!leaves.length) return 0;
  const total = targetTotalChars(targetPages, outline, layout);
  let weightSum = leaves.reduce((s, l) => s + Math.max(1, l.targetChars || 1), 0);
  let remaining = total;
  // 两轮分配：先按权重比例并夹紧，再把因夹紧产生的余量摊给未触顶的叶子
  leaves.forEach((l) => {
    const share = Math.round((Math.max(1, l.targetChars || 1) / weightSum) * total);
    l.targetChars = Math.min(LEAF_MAX_CHARS, Math.max(LEAF_MIN_CHARS, share));
    remaining -= l.targetChars;
  });
  if (remaining > 0) {
    const room = leaves.filter((l) => l.targetChars < LEAF_MAX_CHARS);
    const per = Math.ceil(remaining / Math.max(1, room.length));
    room.forEach((l) => { l.targetChars = Math.min(LEAF_MAX_CHARS, l.targetChars + per); });
  }
  // 叶子数量太少（如审阅时大量删节）导致全部触顶仍不够时，取消上限均摊，保证页数目标
  const allocated = leaves.reduce((s, l) => s + l.targetChars, 0);
  if (allocated < total * 0.98) {
    const per = Math.ceil((total - allocated) / leaves.length);
    leaves.forEach((l) => { l.targetChars += per; });
  }
  return leaves.reduce((s, l) => s + l.targetChars, 0);
}

/** 中文字符数（标书页数按汉字密度估，忽略空白） */
export function countChars(text: string): number {
  return text.replace(/\s/g, "").length;
}
