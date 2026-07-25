/**
 * 文件解析测试。
 *
 * 这里的关键不是「能不能跑通」，而是**能不能真的读出内容**。
 * 一个只会显示文件名的上传框和一个真的解析了内容的上传框，
 * 差别就在这些断言上：PDF 要真的抽出文字，XLSX 要真的读到单元格。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { unzip, parseXlsx, extractPdfText, parseTradeTable } from '../src/fileparse.js';
import { allDatasets } from '../src/fixture.js';

const enc = (s) => new TextEncoder().encode(s);

/* ── 构造测试用的 ZIP / XLSX ─────────────────────────────────── */
function crc32(buf) {
  let c, crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    c = (crc ^ buf[i]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xEDB88320 : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

async function deflateRaw(bytes) {
  const cs = new CompressionStream('deflate-raw');
  const stream = new Blob([bytes]).stream().pipeThrough(cs);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** 生成一个真 ZIP（可选压缩），用来验证 unzip 的两条路径 */
async function makeZip(entries, compress) {
  const locals = [], central = [];
  let offset = 0;
  for (const [name, content] of Object.entries(entries)) {
    const raw = typeof content === 'string' ? enc(content) : content;
    const data = compress ? await deflateRaw(raw) : raw;
    const method = compress ? 8 : 0;
    const nameBytes = enc(name);
    const crc = crc32(raw);

    const lh = new Uint8Array(30 + nameBytes.length);
    const ldv = new DataView(lh.buffer);
    ldv.setUint32(0, 0x04034b50, true);
    ldv.setUint16(4, 20, true); ldv.setUint16(6, 0, true);
    ldv.setUint16(8, method, true);
    ldv.setUint32(14, crc, true);
    ldv.setUint32(18, data.length, true);
    ldv.setUint32(22, raw.length, true);
    ldv.setUint16(26, nameBytes.length, true);
    lh.set(nameBytes, 30);
    locals.push(lh, data);

    const ch = new Uint8Array(46 + nameBytes.length);
    const cdv = new DataView(ch.buffer);
    cdv.setUint32(0, 0x02014b50, true);
    cdv.setUint16(4, 20, true); cdv.setUint16(6, 20, true);
    cdv.setUint16(10, method, true);
    cdv.setUint32(16, crc, true);
    cdv.setUint32(20, data.length, true);
    cdv.setUint32(24, raw.length, true);
    cdv.setUint16(28, nameBytes.length, true);
    cdv.setUint32(42, offset, true);
    ch.set(nameBytes, 46);
    central.push(ch);
    offset += lh.length + data.length;
  }
  const cdSize = central.reduce((a, b) => a + b.length, 0);
  const eocd = new Uint8Array(22);
  const edv = new DataView(eocd.buffer);
  edv.setUint32(0, 0x06054b50, true);
  edv.setUint16(8, central.length, true);
  edv.setUint16(10, central.length, true);
  edv.setUint32(12, cdSize, true);
  edv.setUint32(16, offset, true);

  const all = [...locals, ...central, eocd];
  const total = all.reduce((a, b) => a + b.length, 0);
  const out = new Uint8Array(total);
  let p = 0;
  for (const part of all) { out.set(part, p); p += part.length; }
  return out.buffer;
}

const XLSX_SHARED = `<?xml version="1.0"?><sst count="4" uniqueCount="4">
<si><t>entry</t></si><si><t>exit</t></si><si><t>dir</t></si><si><t>size</t></si></sst>`;
const XLSX_SHEET = `<?xml version="1.0"?><worksheet><sheetData>
<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c><c r="D1" t="s"><v>3</v></c></row>
<row r="2"><c r="A2"><v>300</v></c><c r="B2"><v>320</v></c><c r="C2"><v>1</v></c><c r="D2"><v>2</v></c></row>
<row r="3"><c r="A3"><v>400</v></c><c r="B3"><v>425</v></c><c r="C3"><v>-1</v></c><c r="D3"><v>1</v></c></row>
</sheetData></worksheet>`;

test('ZIP 读取器支持 store 与 deflate 两种方法', async () => {
  for (const compress of [false, true]) {
    const buf = await makeZip({ 'a.txt': 'hello 世界', 'b/c.txt': 'nested' }, compress);
    const files = await unzip(buf);
    assert.equal(new TextDecoder().decode(files['a.txt']), 'hello 世界',
      `${compress ? 'deflate' : 'store'} 模式解压失败`);
    assert.equal(new TextDecoder().decode(files['b/c.txt']), 'nested');
  }
});

test('XLSX 真的读到了单元格内容（含共享字符串表）', async () => {
  const buf = await makeZip({
    'xl/sharedStrings.xml': XLSX_SHARED,
    'xl/worksheets/sheet1.xml': XLSX_SHEET,
  }, true);
  const r = await parseXlsx(buf);
  assert.ok(r.ok, r.reason);
  assert.deepEqual(r.rows[0], ['entry', 'exit', 'dir', 'size'], '表头应从共享字符串表还原');
  assert.deepEqual(r.rows[1], ['300', '320', '1', '2']);
  assert.equal(r.rows.length, 3);
});

test('不是 ZIP 的文件会明确报错，而不是返回空结果', async () => {
  const r = await parseXlsx(enc('这不是一个 xlsx').buffer);
  assert.equal(r.ok, false);
  assert.match(r.reason, /ZIP/);
});

/* ── PDF ─────────────────────────────────────────────────────── */
function makePdf(content, compressed) {
  const header = '%PDF-1.4\n';
  const body = `1 0 obj\n<< /Length ${content.length}${compressed ? ' /Filter /FlateDecode' : ''} >>\nstream\n`;
  return { header, body, content };
}

async function buildPdf(text, compress) {
  const content = `BT /F1 12 Tf 72 700 Td (${text}) Tj ET`;
  const raw = enc(content);
  let payload = raw;
  if (compress) {
    const cs = new CompressionStream('deflate');
    payload = new Uint8Array(await new Response(
      new Blob([raw]).stream().pipeThrough(cs)).arrayBuffer());
  }
  const { header, body } = makePdf(payload, compress);
  const head = enc(header + body);
  const tail = enc('\nendstream\nendobj\ntrailer\n%%EOF');
  const out = new Uint8Array(head.length + payload.length + tail.length);
  out.set(head, 0); out.set(payload, head.length); out.set(tail, head.length + payload.length);
  return out.buffer;
}

test('PDF 文本提取：未压缩内容流', async () => {
  const r = await extractPdfText(await buildPdf('Hello Trading Journal', false));
  assert.ok(r.ok, r.reason);
  assert.match(r.text, /Hello Trading Journal/);
});

test('PDF 文本提取：FlateDecode 压缩流（靠原生 DecompressionStream 解）', async () => {
  const r = await extractPdfText(await buildPdf('Compressed Content 2008', true));
  assert.ok(r.ok, r.reason);
  assert.match(r.text, /Compressed Content 2008/);
  assert.ok(r.inflated >= 1, '应当有流被真正解压');
});

test('没有文本层的 PDF 明确说明需要 OCR，不返回乱码', async () => {
  const fake = enc('%PDF-1.4\nstream\n\x00\x01\x02\x03\nendstream\n%%EOF');
  const r = await extractPdfText(fake.buffer);
  assert.equal(r.ok, false);
  assert.match(r.reason, /OCR|内容流/);
});

test('非 PDF 文件被拒绝', async () => {
  const r = await extractPdfText(enc('just text').buffer);
  assert.equal(r.ok, false);
  assert.match(r.reason, /不是 PDF/);
});

/* ── 交易记录 ─────────────────────────────────────────────────── */
const DS = allDatasets();
const CTX = {
  barsOf: (s) => DS[s].bars,
  symbols: Object.keys(DS),
  displayOf: (s) => DS[s].display,
  defaultSymbol: 'SPX',
};

test('CSV 交易记录：索引形式', () => {
  const csv = ['entry,exit,dir,size', '300,320,1,2', '400,425,-1,1', '500,530,1,3'].join('\n');
  const r = parseTradeTable(csv, CTX);
  assert.ok(r.ok, r.reason);
  assert.equal(r.trades.length, 3);
  assert.deepEqual(r.trades[0], { entry: 300, exit: 320, dir: 1, size: 2 });
});

test('CSV 交易记录：中文表头 + 日期形式，日期对齐到最近 K 线', () => {
  const csv = ['开仓日期,平仓日期,方向,手数',
    '2008-01-10,2008-02-10,做多,3',
    '2008-06-02,2008-07-01,做空,1'].join('\n');
  const r = parseTradeTable(csv, CTX);
  assert.ok(r.ok, r.reason);
  assert.equal(r.trades.length, 2);
  assert.equal(r.trades[0].dir, 1);
  assert.equal(r.trades[1].dir, -1);
  const bars = DS.SPX.bars;
  assert.match(new Date(bars[r.trades[0].entry].t).toISOString(), /^2008-01/);
  assert.ok(r.trades[0].exit > r.trades[0].entry);
});

test('CSV 交易记录：识别品种列', () => {
  const csv = ['symbol,entry,exit,dir,size', 'IXIC,300,320,1,1'].join('\n');
  const r = parseTradeTable(csv, CTX);
  assert.ok(r.ok, r.reason);
  assert.equal(r.symbol, 'IXIC');
});

test('XLSX 解析出的二维数组可直接进交易记录解析器', async () => {
  const buf = await makeZip({
    'xl/sharedStrings.xml': XLSX_SHARED,
    'xl/worksheets/sheet1.xml': XLSX_SHEET,
  }, true);
  const x = await parseXlsx(buf);
  assert.ok(x.ok);
  const r = parseTradeTable(x.rows, CTX);
  assert.ok(r.ok, r.reason);
  assert.equal(r.trades.length, 2);
  assert.equal(r.trades[1].dir, -1);
});

test('缺列时明确报错并回传识别到的表头', () => {
  const r = parseTradeTable('时间,价格\n2008-01-10,100', CTX);
  assert.equal(r.ok, false);
  assert.match(r.reason, /入场|出场/);
  assert.deepEqual(r.headers, ['时间', '价格']);
});

test('整表无法解析时不返回空交易列表冒充成功', () => {
  const r = parseTradeTable('entry,exit,dir\nfoo,bar,baz', CTX);
  assert.equal(r.ok, false);
  assert.match(r.reason, /解析失败/);
});
