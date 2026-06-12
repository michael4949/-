/**
 * 浏览器本地解析上传的招标文件：
 *  - .docx：自带的极简 ZIP 读取器（DecompressionStream 解压）抽取 word/document.xml 纯文本，零依赖；
 *  - .txt / .md：按 UTF-8 解码，失败回退 GBK（国内 Windows 导出常见编码）。
 * PDF 请先在 Word/WPS 中另存为 docx，或直接粘贴文字。
 */

function u16(v: DataView, off: number): number { return v.getUint16(off, true); }
function u32(v: DataView, off: number): number { return v.getUint32(off, true); }

async function inflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream("deflate-raw");
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** 从 zip 中读出指定文件（按中央目录定位，支持 stored/deflate） */
async function readZipEntry(buf: ArrayBuffer, wanted: string): Promise<Uint8Array | null> {
  const bytes = new Uint8Array(buf);
  const view = new DataView(buf);
  // 从尾部搜索 EOCD（签名 0x06054b50），注释最长 64K
  let eocd = -1;
  const minEocd = Math.max(0, bytes.length - 65557);
  for (let i = bytes.length - 22; i >= minEocd; i--) {
    if (u32(view, i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) return null;
  const cdCount = u16(view, eocd + 10);
  let off = u32(view, eocd + 16); // 中央目录起始偏移
  const dec = new TextDecoder();
  for (let n = 0; n < cdCount; n++) {
    if (u32(view, off) !== 0x02014b50) break;
    const method = u16(view, off + 10);
    const compSize = u32(view, off + 20);
    const nameLen = u16(view, off + 28);
    const extraLen = u16(view, off + 30);
    const commentLen = u16(view, off + 32);
    const localOff = u32(view, off + 42);
    const name = dec.decode(bytes.subarray(off + 46, off + 46 + nameLen));
    off += 46 + nameLen + extraLen + commentLen;
    if (name !== wanted) continue;
    // 本地文件头：跳过自身的 name/extra 找到数据区
    const lNameLen = u16(view, localOff + 26);
    const lExtraLen = u16(view, localOff + 28);
    const dataStart = localOff + 30 + lNameLen + lExtraLen;
    const data = bytes.subarray(dataStart, dataStart + compSize);
    if (method === 0) return data.slice();
    if (method === 8) return inflateRaw(data);
    throw new Error(`docx 内部使用了不支持的压缩方式（${method}）`);
  }
  return null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'").replace(/&amp;/g, "&");
}

/** word/document.xml → 纯文本（保留段落换行与制表） */
export function documentXmlToText(xml: string): string {
  const re = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<\/w:p>|<w:tab\b[^>]*\/>|<w:br\b[^>]*\/>/g;
  let out = "";
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    if (m[1] !== undefined) out += decodeEntities(m[1]);
    else if (m[0].startsWith("<w:tab")) out += "\t";
    else out += "\n";
  }
  return out.replace(/\n{3,}/g, "\n\n").trim();
}

export async function extractDocxText(buf: ArrayBuffer): Promise<string> {
  const entry = await readZipEntry(buf, "word/document.xml");
  if (!entry) throw new Error("无法读取该 .docx（未找到正文）。可尝试在 Word 中另存为 .docx 后重试，或直接粘贴文字。");
  return documentXmlToText(new TextDecoder().decode(entry));
}

function decodeTextFile(buf: ArrayBuffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch {
    try { return new TextDecoder("gbk").decode(buf); }
    catch { return new TextDecoder("utf-8").decode(buf); }
  }
}

/** 上传文件 → 文本。支持 .docx / .txt / .md */
export async function extractFileText(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const name = file.name.toLowerCase();
  if (name.endsWith(".docx")) return extractDocxText(buf);
  if (name.endsWith(".txt") || name.endsWith(".md")) return decodeTextFile(buf).trim();
  if (name.endsWith(".doc") || name.endsWith(".pdf")) {
    throw new Error("暂不支持 .doc / .pdf 直接解析：请用 Word/WPS 另存为 .docx，或复制文字后粘贴。");
  }
  throw new Error("不支持的文件类型，请上传 .docx / .txt，或直接粘贴文字。");
}
