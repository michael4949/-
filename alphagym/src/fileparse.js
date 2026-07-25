/**
 * 文件解析：CSV 交易记录 / XLSX / PDF 文本。
 *
 * ── 为什么不引第三方库 ──
 * 这个产品的 demo 是自包含单文件，塞进 pdf.js + SheetJS 会让体积翻几倍。
 * 而浏览器（和 Node 18+）原生就有 DecompressionStream，
 * ZIP 的 deflate 和 PDF 的 FlateDecode 都能直接解 —— 真解析，不是占位符。
 *
 * ── 一条底线 ──
 * 解析不出来就明确说解析不出来，并说清是哪一步失败的。
 * 「假装读到了」比「读不了」糟糕得多：用户会以为系统看懂了他的交割单。
 */

/* ══════════ 通用 ══════════ */

async function inflate(bytes, format) {
  const ds = new DecompressionStream(format);
  const stream = new Blob([bytes]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

const td = (bytes, enc = 'utf-8') => new TextDecoder(enc).decode(bytes);

/* ══════════ ZIP ══════════ */

/**
 * 最小 ZIP 读取器：从中央目录逐条读出文件。
 * 只处理 store(0) 与 deflate(8) 两种方法 —— xlsx / docx 实际只用这两种。
 */
export async function unzip(buffer) {
  const u8 = new Uint8Array(buffer);
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);

  // 从尾部往前找中央目录结束标记 (EOCD, 0x06054b50)
  let eocd = -1;
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65558); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('不是有效的 ZIP：找不到中央目录');

  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const files = {};

  for (let n = 0; n < count; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true);
    const compSize = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const commentLen = dv.getUint16(p + 32, true);
    const localOff = dv.getUint32(p + 42, true);
    const name = td(u8.subarray(p + 46, p + 46 + nameLen));

    // 本地文件头的 extra 长度可能与中央目录不同，必须重新读
    const lNameLen = dv.getUint16(localOff + 26, true);
    const lExtraLen = dv.getUint16(localOff + 28, true);
    const dataStart = localOff + 30 + lNameLen + lExtraLen;
    const raw = u8.subarray(dataStart, dataStart + compSize);

    files[name] = method === 0 ? raw : method === 8 ? await inflate(raw, 'deflate-raw') : null;
    p += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

/* ══════════ XLSX ══════════ */

/** 极简 XML 取值：抓出所有 <tag ...>inner</tag> */
function xmlAll(xml, tag) {
  const out = [];
  const re = new RegExp(`<${tag}(\\s[^>]*)?>([\\s\\S]*?)</${tag}>|<${tag}(\\s[^>]*)?/>`, 'g');
  let m;
  while ((m = re.exec(xml))) out.push({ attrs: m[1] || m[3] || '', inner: m[2] || '' });
  return out;
}
const attr = (s, name) => {
  const m = new RegExp(`${name}="([^"]*)"`).exec(s || '');
  return m ? m[1] : null;
};
const unxml = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

/** A1 → 列序号（0 基） */
function colOf(ref) {
  const m = /^([A-Z]+)/.exec(ref || '');
  if (!m) return 0;
  let n = 0;
  for (const ch of m[1]) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

/**
 * 解析 xlsx，返回第一个工作表的二维字符串数组。
 * @returns {{ok:true, rows:string[][], sheet:string} | {ok:false, reason:string}}
 */
export async function parseXlsx(buffer) {
  let files;
  try { files = await unzip(buffer); }
  catch (e) { return { ok: false, reason: 'ZIP 解压失败：' + e.message }; }

  const sharedRaw = files['xl/sharedStrings.xml'];
  const shared = [];
  if (sharedRaw) {
    for (const si of xmlAll(td(sharedRaw), 'si')) {
      // 富文本会被拆成多个 <t>，要拼起来
      shared.push(xmlAll(si.inner, 't').map(t => unxml(t.inner)).join(''));
    }
  }

  const sheetName = Object.keys(files).find(n => /^xl\/worksheets\/sheet\d+\.xml$/.test(n));
  if (!sheetName || !files[sheetName]) return { ok: false, reason: '找不到工作表（xl/worksheets/sheet1.xml）' };
  const xml = td(files[sheetName]);

  const rows = [];
  for (const row of xmlAll(xml, 'row')) {
    const cells = [];
    for (const c of xmlAll(row.inner, 'c')) {
      const idx = colOf(attr(c.attrs, 'r'));
      const type = attr(c.attrs, 't');
      let val = '';
      if (type === 'inlineStr') {
        val = xmlAll(c.inner, 't').map(t => unxml(t.inner)).join('');
      } else {
        const v = xmlAll(c.inner, 'v')[0];
        val = v ? unxml(v.inner) : '';
        if (type === 's') val = shared[parseInt(val)] ?? '';
      }
      cells[idx] = val;
    }
    for (let i = 0; i < cells.length; i++) if (cells[i] === undefined) cells[i] = '';
    rows.push(cells);
  }
  if (!rows.length) return { ok: false, reason: '工作表里没有数据行' };
  return { ok: true, rows, sheet: sheetName.replace('xl/worksheets/', '') };
}

/* ══════════ PDF ══════════ */

/** PDF 字符串字面量里的转义 */
function pdfUnescape(s) {
  return s.replace(/\\([nrtbf()\\]|[0-7]{1,3})/g, (_, g) => {
    if (/^[0-7]+$/.test(g)) return String.fromCharCode(parseInt(g, 8));
    return { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', '(': '(', ')': ')', '\\': '\\' }[g] ?? g;
  });
}

/**
 * 从 PDF 内容流里抽文本。
 *
 * 覆盖的是「文本可提取的 PDF」：内容流为未压缩或 FlateDecode，
 * 文字用 Tj / TJ / ' / " 绘制。扫描件（图片型 PDF）没有文本层，
 * 抽不出来是正常的，这时会明确告诉用户需要 OCR，而不是返回一堆乱码。
 */
export async function extractPdfText(buffer) {
  const u8 = new Uint8Array(buffer);
  if (td(u8.subarray(0, 5)) !== '%PDF-') return { ok: false, reason: '不是 PDF 文件' };

  const latin = td(u8, 'latin1');
  const chunks = [];
  let streams = 0, inflated = 0;

  const re = /stream\r?\n?/g;
  let m;
  while ((m = re.exec(latin))) {
    const start = m.index + m[0].length;
    let end = latin.indexOf('endstream', start);
    if (end < 0) break;
    streams++;
    // PDF 规范：endstream 关键字之前的那个换行**不属于流数据**。
    // 把它一起截进去，zlib 会因为多出一个尾字节而解压失败 ——
    // 症状是「有流、但一个字都抽不出来」，很容易被误判成扫描件。
    if (latin[end - 1] === '\n') end--;
    if (latin[end - 1] === '\r') end--;

    // 往前找这个流的字典，判断有没有 FlateDecode
    const dict = latin.slice(Math.max(0, m.index - 400), m.index);
    let bytes = u8.subarray(start, end);
    if (/FlateDecode/.test(dict)) {
      try { bytes = await inflate(bytes, 'deflate'); inflated++; }
      catch (e) { continue; }        // 加密或损坏的流，跳过
    }
    const text = td(bytes, 'latin1');
    if (!/(Tj|TJ)/.test(text)) continue;

    // ( ... ) Tj    以及    [ (a) -20 (b) ] TJ
    let t;
    const tj = /\((?:[^()\\]|\\.)*\)\s*Tj|\[((?:[^\[\]\\]|\\.)*)\]\s*TJ/g;
    while ((t = tj.exec(text))) {
      if (t[1] !== undefined) {
        const parts = [...t[1].matchAll(/\((?:[^()\\]|\\.)*\)/g)]
          .map(x => pdfUnescape(x[0].slice(1, -1)));
        chunks.push(parts.join(''));
      } else {
        chunks.push(pdfUnescape(t[0].replace(/\s*Tj$/, '').slice(1, -1)));
      }
    }
    chunks.push('\n');
  }

  const text = chunks.join('').replace(/\n{3,}/g, '\n\n').trim();
  if (!text) {
    return { ok: false, streams, inflated,
      reason: streams === 0 ? 'PDF 里没有内容流'
        : '这份 PDF 没有可提取的文本层（多半是扫描件），需要 OCR 才能读取' };
  }
  return { ok: true, text, streams, inflated };
}

/* ══════════ 交易记录 CSV ══════════ */

/**
 * 把表格（CSV 文本或二维数组）解析成交易记录。
 * 表头中英文都认；日期会对齐到最近的 K 线。
 *
 * @param {string|string[][]} input
 * @param {{barsOf:(sym:string)=>any[], symbols:string[], displayOf:(s:string)=>string, defaultSymbol:string}} ctx
 */
export function parseTradeTable(input, ctx) {
  let table;
  if (typeof input === 'string') {
    const lines = input.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return { ok: false, reason: '内容不足两行', headers: [], rows: lines.length };
    const sep = (lines[0].match(/\t/g) || []).length > (lines[0].match(/,/g) || []).length ? '\t' : ',';
    table = lines.map(l => l.split(sep).map(c => c.trim().replace(/^["']|["']$/g, '')));
  } else {
    table = input;
  }
  if (!table || table.length < 2) return { ok: false, reason: '至少需要表头 + 一行数据', headers: [], rows: 0 };

  const headers = table[0].map(h => String(h || '').trim());
  const norm = headers.map(h => h.toLowerCase());
  const find = (...names) => norm.findIndex(h => names.some(n => h.includes(n)));

  const iEntry = find('entry', '入场', '开仓', '买入日期', '开仓日期', '开仓时间', '建仓');
  const iExit = find('exit', '出场', '平仓', '卖出日期', '平仓日期', '平仓时间');
  const iDir = find('dir', '方向', 'side', '买卖', 'type');
  const iSize = find('size', 'qty', 'quantity', '手数', '数量', '股数', '成交量');
  const iSym = find('symbol', 'code', '品种', '代码', '合约', '股票');

  if (iEntry < 0 || iExit < 0) {
    return { ok: false, reason: '没找到入场 / 出场两列', headers, rows: table.length - 1 };
  }

  let symbol = ctx.defaultSymbol;
  if (iSym >= 0) {
    const v = String(table[1][iSym] || '').toUpperCase();
    for (const k of ctx.symbols) {
      if (v.includes(k) || (ctx.displayOf(k) && v.includes(ctx.displayOf(k)))) { symbol = k; break; }
    }
  }
  const bars = ctx.barsOf(symbol);
  const times = bars.map(b => b.t);

  const toIndex = (raw) => {
    const s = String(raw ?? '').trim();
    if (!s) return -1;
    if (/^\d+$/.test(s) && +s < bars.length) return +s;
    const t = Date.parse(s.replace(/\//g, '-'));
    if (!Number.isFinite(t)) return -1;
    let lo = 0, hi = times.length - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (times[mid] < t) lo = mid + 1; else hi = mid; }
    return lo;
  };
  const toDir = (raw) => {
    const s = String(raw ?? '').trim().toLowerCase();
    if (/^-?1$/.test(s)) return +s;
    if (/多|buy|long|^b$|做多|开多/.test(s)) return 1;
    if (/空|sell|short|^s$|做空|开空/.test(s)) return -1;
    return 0;
  };

  const trades = [];
  let skipped = 0;
  for (let i = 1; i < table.length; i++) {
    const row = table[i];
    if (!row || !row.length) continue;
    const entry = toIndex(row[iEntry]);
    const exit = toIndex(row[iExit]);
    const dir = iDir >= 0 ? toDir(row[iDir]) : 1;
    const size = iSize >= 0 ? Math.max(1, Math.round(parseFloat(row[iSize]) || 1)) : 1;
    if (entry < 0 || exit <= entry || exit >= bars.length || !dir) { skipped++; continue; }
    trades.push({ entry, exit, dir, size });
  }
  if (!trades.length) {
    return { ok: false, reason: '每一行都解析失败（日期格式或方向无法识别）', headers, rows: table.length - 1 };
  }
  trades.sort((a, b) => a.entry - b.entry);
  return { ok: true, trades, bars, symbol, skipped, headers };
}
