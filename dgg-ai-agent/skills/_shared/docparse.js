/*
 * 离线文档解析 · 11 个模块共用
 * ------------------------------------------------------------------
 * 平台中立、全同步、零依赖。Word / Excel / PPT / PDF / 邮件 / 纯文本 六类文件，
 * 全部按字节在本机解析：不发网络请求、不读时钟、不取随机数、不碰任何存储 API。
 *
 *   .docx  OOXML 压缩包 → word/document.xml → 段落与表格
 *   .xlsx  OOXML 压缩包 → sharedStrings + 各 sheet → 工作表与单元格
 *   .pptx  OOXML 压缩包 → ppt/slides/slideN.xml → 每页文字
 *   .pdf   解 FlateDecode 流 → 文本算子 Tj / TJ → 文字层（无文字层时如实说明）
 *   .eml   RFC 822 头（含 encoded-word）+ 多部分正文（base64 / quoted-printable）
 *   .txt / .csv / .md / .json  直接按文本读
 *   .doc / .xls / .ppt  Office 97 老格式，给改存提示
 *
 * 之所以全同步：通用包契约（universal/SPEC.md §5）要求 invoke(action, input, ctx)
 * 同步返回信封、永不抛异常。所以解压不用宿主的 DecompressionStream（异步），
 * 自带一份 RFC 1951 raw-DEFLATE 解码器 + RFC 1950 zlib 包装，见下方「解压」一节。
 *
 * 对外（全部同步，绝不抛异常）：
 *   ACCEPT                     建议的 accept 串
 *   kindOf(name) / label(kind) / sizeText(n)
 *   parse({ name, bytes })     bytes 可以是 Uint8Array / Node Buffer / base64 串 / 普通数组 / ArrayBuffer
 *                              也可以写成 parse(name, bytes)
 *   低层件（别的 skill 与自测用得上，不进 manifest.actions）：
 *     inflateRaw / inflateZlib / zipEntries / zipRead / zipText
 *     toBytes / utf8 / utf8self / latin1 / b64bytes / VERSION
 *
 * 确定性：base64 与 UTF-8 解码都是包内自实现，同一份字节在任何宿主上得到同一份结果。
 * 唯一的例外是 .eml 里声明为 GBK / Big5 等非 UTF-8 字符集的正文 —— 码表上百 KB，没法零依赖实现，
 * 宿主有 TextDecoder 就借用，没有就退回 latin1，这一处会随宿主而异，已在 decodeCharset 处标注。
 *
 * 返回（纯数据，可直接 JSON 序列化）：
 *   { ok, kind, name, size, sizeText, ext, text, paragraphs[], tables[[[]]],
 *     sheets[{name,rows[[]]}], slides[{no,title,lines[]}],
 *     mail{from,to,cc,subject,date,attaches[]}, stats{}, note }
 *   失败返回 { ok:false, note:'原因' }，其余字段保持同一形状（空值）。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.DGG = root.DGG || {}; root.DGG.docparse = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VERSION = '1.0.0';

  var ACCEPT = '.docx,.xlsx,.pptx,.pdf,.eml,.txt,.csv,.md,.json';
  var KIND = {
    docx: 'word', doc: 'word', xlsx: 'excel', xls: 'excel', csv: 'excel',
    pptx: 'ppt', ppt: 'ppt', pdf: 'pdf', eml: 'eml', msg: 'eml',
    txt: 'text', md: 'text', json: 'text'
  };
  var LABEL = { word: 'Word', excel: 'Excel', ppt: 'PPT', pdf: 'PDF', eml: '邮件', text: '文本' };

  function extOf(name) { var m = /\.([A-Za-z0-9]+)$/.exec(name || ''); return m ? m[1].toLowerCase() : ''; }
  function kindOf(name) { return KIND[extOf(name)] || 'text'; }
  function label(kind) { return LABEL[kind] || '文件'; }
  function sizeText(n) {
    n = n || 0;
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1048576).toFixed(2) + ' MB';
  }

  /* ========================================================================
     字节与编码
     ====================================================================== */

  var B64CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  var B64IDX = null;

  /* base64 → 字节。容忍换行、= 填充、data: 前缀与 URL-safe 变体 */
  function b64bytes(s) {
    if (!B64IDX) { B64IDX = {}; for (var k = 0; k < 64; k++) B64IDX[B64CHARS.charAt(k)] = k; }
    var str = String(s).replace(/^data:[^,]*,/, '').replace(/-/g, '+').replace(/_/g, '/');
    var n = str.length, out = new Uint8Array(((n * 3) >> 2) + 3), o = 0, acc = 0, nb = 0, i, v;
    for (i = 0; i < n; i++) {
      v = B64IDX[str.charAt(i)];
      if (v === undefined) continue;                 /* 空白、= 与杂字符一律跳过 */
      acc = (acc << 6) | v; nb += 6;
      if (nb >= 8) { nb -= 8; out[o++] = (acc >> nb) & 255; }
    }
    return out.subarray(0, o);
  }
  function looksBase64(s) {
    var t = String(s).replace(/^data:[^,]*,/, '').replace(/[\s\r\n]/g, '');
    return t.length > 0 && /^[A-Za-z0-9+/_=-]+$/.test(t);
  }

  /* 把各种入参统一成 Uint8Array（不复制已经是 Uint8Array / Buffer 的入参） */
  function toBytes(b) {
    if (b == null) return new Uint8Array(0);
    if (b instanceof Uint8Array) return b;                                   /* Node Buffer 也走这里 */
    if (typeof ArrayBuffer !== 'undefined' && b instanceof ArrayBuffer) return new Uint8Array(b);
    if (typeof b === 'string') return looksBase64(b) ? b64bytes(b) : utf8bytes(b);
    if (b && typeof b.length === 'number') {                                 /* 普通数组 / 类数组 */
      var a = new Uint8Array(b.length), i;
      for (i = 0; i < b.length; i++) a[i] = b[i] & 255;
      return a;
    }
    if (b && b.data && typeof b.data.length === 'number') return toBytes(b.data);   /* Buffer 的 JSON 形态 */
    return new Uint8Array(0);
  }

  /* 字符串 → UTF-8 字节（只在入参是普通文本时用得上） */
  function utf8bytes(s) {
    var str = String(s), out = [], i, c, c2;
    for (i = 0; i < str.length; i++) {
      c = str.charCodeAt(i);
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
      else if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length) {
        c2 = str.charCodeAt(++i);
        var u = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
        out.push(0xf0 | (u >> 18), 0x80 | ((u >> 12) & 63), 0x80 | ((u >> 6) & 63), 0x80 | (u & 63));
      } else out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
    return new Uint8Array(out);
  }

  /* 自带的 UTF-8 解码：不依赖宿主，跨平台逐字一致（含剥 BOM、非法字节补 U+FFFD）。
     码元先写进定长 Uint16Array 再整片 fromCharCode —— 比逐个 Array.push 快一倍多，
     15 MB 的 sheet XML 也在百毫秒量级。 */
  /* UTF-8 解码（自带实现，逐字对齐 WHATWG Encoding 标准，与 TextDecoder / Node Buffer 结果完全相同）。
     非法字节一律换成 U+FFFD，并且「把出错的那个字节退回去当新的首字节重读」——这三件事必须照做，
     否则会出两类真问题：超长编码 E0 80 80 被解成 U+0000（经典的超长 NUL），
     以及 ED A0 80 被解成落单的代理码元（落单代理不是合法字符串，JSON 出网时会被各家运行时改写，
     确定性就断了）。另外首字节判错时不退回，会顺手吃掉后面一个正常汉字。 */
  function utf8self(bytes) {
    var i = 0, n = bytes.length, parts = [], buf = new Uint16Array(8192), bl = 0;
    var c, need, lo, hi, cp, k, b2, u;
    if (n >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) i = 3;
    while (i < n) {
      c = bytes[i++];
      if (c < 0x80) { buf[bl++] = c; }
      else {
        /* 首字节定长度，并定第一个续字节的合法区间（这一步就把超长编码与代理区挡掉） */
        if (c >= 0xc2 && c <= 0xdf) { need = 1; lo = 0x80; hi = 0xbf; cp = c & 0x1f; }
        else if (c === 0xe0) { need = 2; lo = 0xa0; hi = 0xbf; cp = 0; }
        else if (c >= 0xe1 && c <= 0xec) { need = 2; lo = 0x80; hi = 0xbf; cp = c & 0x0f; }
        else if (c === 0xed) { need = 2; lo = 0x80; hi = 0x9f; cp = 0x0d; }
        else if (c >= 0xee && c <= 0xef) { need = 2; lo = 0x80; hi = 0xbf; cp = c & 0x0f; }
        else if (c === 0xf0) { need = 3; lo = 0x90; hi = 0xbf; cp = 0; }
        else if (c >= 0xf1 && c <= 0xf3) { need = 3; lo = 0x80; hi = 0xbf; cp = c & 0x07; }
        else if (c === 0xf4) { need = 3; lo = 0x80; hi = 0x8f; cp = 4; }
        else { buf[bl++] = 0xfffd; need = -1; }                    /* C0 / C1 / F5–FF / 孤立续字节 */
        if (need > 0) {
          for (k = 0; k < need; k++) {
            if (i >= n) { buf[bl++] = 0xfffd; need = -1; break; }  /* 截断在结尾 */
            b2 = bytes[i];
            if (b2 < lo || b2 > hi) { buf[bl++] = 0xfffd; need = -1; break; }   /* 出错的字节退回去重读 */
            i++; cp = (cp << 6) | (b2 & 63);
            lo = 0x80; hi = 0xbf;
          }
          if (need > 0) {
            if (cp < 0x10000) buf[bl++] = cp;
            else { u = cp - 0x10000; buf[bl++] = 0xd800 + (u >> 10); buf[bl++] = 0xdc00 + (u & 0x3ff); }
          }
        }
      }
      if (bl >= 8190) { parts.push(String.fromCharCode.apply(String, buf.subarray(0, bl))); bl = 0; }
    }
    if (bl) parts.push(String.fromCharCode.apply(String, buf.subarray(0, bl)));
    return parts.length === 1 ? parts[0] : parts.join('');
  }

  /* UTF-8 解码。自带实现已逐字对齐 WHATWG 标准，与宿主 TextDecoder 在任意字节串上结果都相同，
     所以大块文本直接借宿主的（快约五倍），小块或没有 TextDecoder 时走自带的，两条路等价。 */
  var TD_UTF8, TD_TRIED = false;
  function utf8(bytes) {
    var b = toBytes(bytes), s;
    if (!TD_TRIED) {
      TD_TRIED = true;
      try { TD_UTF8 = (typeof TextDecoder !== 'undefined') ? new TextDecoder('utf-8') : null; } catch (e) { TD_UTF8 = null; }
    }
    if (TD_UTF8 && b.length > 4096) {
      try { return TD_UTF8.decode(b); } catch (e2) { /* 落回自带 */ }
    }
    return utf8self(b);
  }

  /* latin1：字节值即码位，PDF 与邮件里靠它保证「字符串下标 == 字节下标」 */
  function latin1(bytes) {
    var parts = [], i = 0, n = bytes.length, end;
    while (i < n) { end = Math.min(i + 4096, n); parts.push(String.fromCharCode.apply(String, bytes.subarray(i, end))); i = end; }
    return parts.join('');
  }
  function binToBytes(s) { var a = new Uint8Array(s.length), i; for (i = 0; i < s.length; i++) a[i] = s.charCodeAt(i) & 255; return a; }

  /* 按 charset 解码。UTF-8 / ASCII 自己解，跨平台逐字一致；
     GBK、Big5 这类字符集没法零依赖实现（码表上百 KB），宿主有 TextDecoder 就借用一下，
     没有就退回 latin1 —— 这是全文件唯一一处结果可能随宿主而异的地方，只出现在 .eml 的非 UTF-8 正文里 */
  function decodeCharset(bytes, cs) {
    var name = String(cs || 'utf-8').toLowerCase();
    if (name === 'utf-8' || name === 'utf8' || name === 'us-ascii' || name === 'ascii') return utf8(bytes);
    if (typeof TextDecoder !== 'undefined') { try { return new TextDecoder(name).decode(bytes); } catch (e) { /* 继续 */ } }
    if (name === 'iso-8859-1' || name === 'latin1' || name === 'windows-1252') return latin1(bytes);
    return utf8(bytes);
  }

  /* ========================================================================
     解压 · RFC 1951 raw-DEFLATE（stored / 固定 Huffman / 动态 Huffman + LZ77 回溯）
     ------------------------------------------------------------------
     实现要点：
       · 位流 LSB 优先，bitbuf 里最多压 24 位；单次最多取 13 位（距离码的最大附加位数），
         所以移位量恒 < 24，不会碰 32 位符号位。
       · Huffman 用「一次查表」：按码表最大码长 maxLen 建 1<<maxLen 的查找表，
         表项 = (码长 << 16) | 符号；码字按规范是 MSB 优先写入，建表时逐个反转后
         以 step = 1<<len 填满所有高位组合，解码时取 bitbuf 的低 maxLen 位直接命中。
         比逐位走树快一个量级，代价是每个动态块建一次表（≤32K 次写，可忽略）。
       · 输出缓冲按需翻倍；每轮循环先保证 259 字节余量（一个字面量 + 最长匹配 258），
         省掉逐字节的边界检查。
       · stored 块：先把缓冲里整字节退回 pos，再按字节读 LEN/NLEN 并校验 LEN ^ 0xFFFF。
       · 流尾允许补零（over 计数兜底），避免最后一个短码因缺位误报。
     ====================================================================== */

  var MAXOUT = 0x10000000;                       /* 单个流解压后的上限：256 MB */
  var LBASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
  var LEXT = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
  var DBASE = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577];
  var DEXT = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
  var CLORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
  var FIXLIT = null, FIXDIST = null;

  function revBits(v, n) { var r = 0, i; for (i = 0; i < n; i++) { r = (r << 1) | (v & 1); v >>= 1; } return r; }

  /* 由码长表建一次查表结构；over-subscribed 的码表直接判非法 */
  function huffTable(lens, n) {
    var maxLen = 0, i, len;
    for (i = 0; i < n; i++) if (lens[i] > maxLen) maxLen = lens[i];
    if (!maxLen) return { maxLen: 0, mask: 0, table: null };
    if (maxLen > 15) throw new Error('码长超出 15 位');
    var count = new Int32Array(maxLen + 1);
    for (i = 0; i < n; i++) count[lens[i]]++;
    count[0] = 0;
    var left = 1;
    for (len = 1; len <= maxLen; len++) { left <<= 1; left -= count[len]; if (left < 0) throw new Error('Huffman 码表超额'); }
    var next = new Int32Array(maxLen + 2), code = 0;
    for (len = 1; len <= maxLen; len++) { code = (code + count[len - 1]) << 1; next[len] = code; }
    var size = 1 << maxLen, table = new Int32Array(size), step, j, rev;
    for (i = 0; i < n; i++) {
      len = lens[i]; if (!len) continue;
      rev = revBits(next[len]++, len);
      step = 1 << len;
      for (j = rev; j < size; j += step) table[j] = (len << 16) | i;
    }
    return { maxLen: maxLen, mask: size - 1, table: table };
  }
  function fixedTrees() {
    if (FIXLIT) return;
    var l = new Int32Array(288), i;
    for (i = 0; i < 144; i++) l[i] = 8;
    for (; i < 256; i++) l[i] = 9;
    for (; i < 280; i++) l[i] = 7;
    for (; i < 288; i++) l[i] = 8;
    FIXLIT = huffTable(l, 288);
    var d = new Int32Array(30);
    for (i = 0; i < 30; i++) d[i] = 5;
    FIXDIST = huffTable(d, 30);
  }

  /* 裸 deflate 解码。hint 给出已知的解压后长度时可一次开够缓冲 */
  function inflateRaw(src, hint) {
    src = toBytes(src);
    /* hint = 已知的解压后长度（ZIP 中央目录给的 usize），一次开够；异常值（ZIP64 的 0xFFFFFFFF）退回按需翻倍 */
    var out = new Uint8Array((hint > 0 && hint < 0x10000000) ? hint : (src.length * 4 + 64));
    var olen = 0, pos = 0, bitbuf = 0, bitcnt = 0, over = 0;

    function need(n) {
      while (bitcnt < n) {
        if (pos < src.length) bitbuf |= src[pos++] << bitcnt;
        else { over++; if (over > 64) throw new Error('压缩数据不完整'); }
        bitcnt += 8;
      }
    }
    function bits(n) { if (!n) return 0; need(n); var v = bitbuf & ((1 << n) - 1); bitbuf >>>= n; bitcnt -= n; return v; }
    function sym(h) {
      if (!h.table) throw new Error('Huffman 码表为空');
      need(h.maxLen);
      var e = h.table[bitbuf & h.mask], l = e >>> 16;
      if (!l) throw new Error('无效的 Huffman 编码');
      bitbuf >>>= l; bitcnt -= l;
      return e & 0xffff;
    }
    function grow(n) {
      if (olen + n <= out.length) return;
      /* 解压后封顶 256 MB。没有这一道，一份 300 KB 的畸形包就能解出上 GB 数据，
         把宿主的堆撑爆 —— 堆溢出是进程级中止，catch 不住，「绝不抛异常」的承诺当场失效，
         HTTP / MCP 这类常驻宿主会被一个上传的文件直接打死。超限在这里抛，由 parse 兜成 ok:false。
         口径与上面 hint 的 0x10000000 上限一致；真实 OOXML 差得远（2 MB xlsx 解出约 20 MB） */
      if (olen + n > MAXOUT) throw new Error('解压后超过 256 MB 上限，疑似异常压缩包');
      var cap = out.length || 64;
      while (cap < olen + n) cap *= 2;
      if (cap > MAXOUT) cap = MAXOUT;
      var nb = new Uint8Array(cap);
      nb.set(out.subarray(0, olen));
      out = nb;
    }
    function block(lit, dist) {
      var s, l, d, dd, p, k;
      for (;;) {
        if (olen + 259 > out.length) grow(259);
        s = sym(lit);
        if (s < 256) { out[olen++] = s; continue; }
        if (s === 256) return;
        s -= 257;
        if (s > 28) throw new Error('无效的长度码');
        l = LBASE[s] + bits(LEXT[s]);
        d = sym(dist);
        if (d > 29) throw new Error('无效的距离码');
        dd = DBASE[d] + bits(DEXT[d]);
        if (dd > olen) throw new Error('回溯距离超出已解数据');
        p = olen - dd;
        for (k = 0; k < l; k++) out[olen++] = out[p++];
      }
    }
    function dynamicTrees() {
      var hlit = bits(5) + 257, hdist = bits(5) + 1, hclen = bits(4) + 4;
      if (hlit > 286 || hdist > 30) throw new Error('动态码表长度非法');
      var clen = new Int32Array(19), i;
      for (i = 0; i < hclen; i++) clen[CLORDER[i]] = bits(3);
      var cl = huffTable(clen, 19);
      var total = hlit + hdist, lens = new Int32Array(total), n = 0, s, rep, v;
      while (n < total) {
        s = sym(cl);
        if (s < 16) { lens[n++] = s; continue; }
        if (s === 16) { if (!n) throw new Error('码长重复码位置非法'); v = lens[n - 1]; rep = 3 + bits(2); }
        else if (s === 17) { v = 0; rep = 3 + bits(3); }
        else { v = 0; rep = 11 + bits(7); }
        if (n + rep > total) throw new Error('码长重复越界');
        while (rep--) lens[n++] = v;
      }
      return [huffTable(lens.subarray(0, hlit), hlit), huffTable(lens.subarray(hlit), hdist)];
    }
    function stored() {
      var back = bitcnt >> 3;                       /* 缓冲里的整字节退回源流，剩余不足一字节的丢弃 */
      pos -= back; if (pos < 0) pos = 0;
      bitbuf = 0; bitcnt = 0;
      if (pos + 4 > src.length) throw new Error('stored 块头不完整');
      var len = src[pos] | (src[pos + 1] << 8), nlen = src[pos + 2] | (src[pos + 3] << 8);
      pos += 4;
      if ((len ^ 0xffff) !== nlen) throw new Error('stored 块长度校验失败');
      if (pos + len > src.length) throw new Error('stored 块数据不完整');
      grow(len);
      out.set(src.subarray(pos, pos + len), olen);
      olen += len; pos += len;
    }

    var last = 0, type, tr;
    do {
      last = bits(1); type = bits(2);
      if (type === 0) stored();
      else if (type === 1) { fixedTrees(); block(FIXLIT, FIXDIST); }
      else if (type === 2) { tr = dynamicTrees(); block(tr[0], tr[1]); }
      else throw new Error('无效的块类型 3');
    } while (!last);
    return new Uint8Array(out.subarray(0, olen));
  }

  /* RFC 1950 zlib 包装（PDF 的 FlateDecode 用它）。少数生成器写的是裸流，两种都试 */
  function inflateZlib(src, hint) {
    src = toBytes(src);
    var zlibish = src.length > 1 && (src[0] & 0x0f) === 8 && (((src[0] << 8) | src[1]) % 31) === 0;
    if (zlibish) {
      var off = (src[1] & 0x20) ? 6 : 2;            /* FDICT 置位时再跳 4 字节字典 ID */
      try { return inflateRaw(src.subarray(off), hint); } catch (e) { return inflateRaw(src, hint); }
    }
    try { return inflateRaw(src, hint); }
    catch (e2) { if (src.length > 2) return inflateRaw(src.subarray(2), hint); throw e2; }
  }

  /* ========================================================================
     ZIP：中央目录 + 条目解压（OOXML 三兄弟共用）
     ====================================================================== */
  function u16(b, p) { return b[p] | (b[p + 1] << 8); }
  function u32(b, p) { return (b[p] | (b[p + 1] << 8) | (b[p + 2] << 16) | (b[p + 3] << 24)) >>> 0; }

  function zipEntries(buf) {
    var i, eocd = -1, min = Math.max(0, buf.length - 66000);
    for (i = buf.length - 22; i >= min; i--) { if (u32(buf, i) === 0x06054b50) { eocd = i; break; } }
    if (eocd < 0) throw new Error('不是有效的压缩包');
    var count = u16(buf, eocd + 10), off = u32(buf, eocd + 16), list = [], p = off, k;
    for (k = 0; k < count && p + 46 <= buf.length; k++) {
      if (u32(buf, p) !== 0x02014b50) break;
      var nameLen = u16(buf, p + 28), extraLen = u16(buf, p + 30), cmtLen = u16(buf, p + 32);
      var method = u16(buf, p + 10), csize = u32(buf, p + 20), usize = u32(buf, p + 24), lho = u32(buf, p + 42);
      var name = utf8(buf.subarray(p + 46, p + 46 + nameLen));
      list.push({ name: name, method: method, csize: csize, usize: usize, lho: lho });
      p += 46 + nameLen + extraLen + cmtLen;
    }
    return list;
  }
  function zipRead(buf, e) {
    if (u32(buf, e.lho) !== 0x04034b50) throw new Error('压缩包条目损坏');
    var nameLen = u16(buf, e.lho + 26), extraLen = u16(buf, e.lho + 28);
    var start = e.lho + 30 + nameLen + extraLen;
    var raw = buf.subarray(start, start + e.csize);
    if (e.method === 0) return raw;
    if (e.method === 8) return inflateRaw(raw, e.usize);
    throw new Error('不支持的压缩方式 ' + e.method);
  }
  function zipFind(list, name) { var i; for (i = 0; i < list.length; i++) if (list[i].name === name) return list[i]; return null; }
  function zipText(buf, list, name) {
    var hit = zipFind(list, name);
    if (!hit) return '';
    try { return utf8(zipRead(buf, hit)); } catch (e) { return ''; }
  }
  function zipPick(list, re) {
    return list.filter(function (e) { return re.test(e.name); })
               .sort(function (a, b) { return (+/(\d+)\.xml$/.exec(a.name)[1]) - (+/(\d+)\.xml$/.exec(b.name)[1]); });
  }

  /* ========================================================================
     XML 小工具（不建 DOM，正则够用且快；正则缓存，避免每个单元格重建）
     ====================================================================== */
  var RE_TAG = {};
  function tagRe(tag) {
    var re = RE_TAG[tag];
    if (!re) re = RE_TAG[tag] = new RegExp('<' + tag + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/' + tag + '>', 'g');
    re.lastIndex = 0;
    return re;
  }
  function unesc(s) {
    if (s.indexOf('&') < 0) return s;
    return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
            .replace(/&#(\d+);/g, function (_, d) { return String.fromCharCode(+d); })
            .replace(/&#x([0-9a-fA-F]+);/g, function (_, d) { return String.fromCharCode(parseInt(d, 16)); })
            .replace(/&amp;/g, '&');
  }
  function allTags(xml, tag) {
    var re = tagRe(tag), out = [], m;
    while ((m = re.exec(xml))) out.push(m[1]);
    return out;
  }
  function plainOf(frag, textTag) {
    var re = tagRe(textTag), s = '', m;
    while ((m = re.exec(frag))) s += unesc(m[1]);
    return s;
  }

  /* ========================================================================
     Word
     ====================================================================== */
  function parseDocx(buf) {
    var list = zipEntries(buf);
    var xml = zipText(buf, list, 'word/document.xml');
    if (!xml) throw new Error('压缩包里没有 word/document.xml');
    var body = xml, paragraphs = [], tables = [];
    /* 表格：先抽出来，再从正文里去掉，避免重复计入段落 */
    var tbls = allTags(body, 'w:tbl'), i, j, k;
    for (i = 0; i < tbls.length; i++) {
      var rows = allTags(tbls[i], 'w:tr'), grid = [];
      for (j = 0; j < rows.length; j++) {
        var cells = allTags(rows[j], 'w:tc'), line = [];
        for (k = 0; k < cells.length; k++) line.push(plainOf(cells[k], 'w:t').trim());
        if (line.join('').length) grid.push(line);
      }
      if (grid.length) tables.push(grid);
    }
    body = body.replace(/<w:tbl>[\s\S]*?<\/w:tbl>/g, '');
    var ps = allTags(body, 'w:p');
    for (i = 0; i < ps.length; i++) {
      var t = plainOf(ps[i], 'w:t').replace(/\s+$/, '');
      if (t.trim()) paragraphs.push(t.trim());
    }
    var text = paragraphs.join('\n');
    return {
      kind: 'word', paragraphs: paragraphs, tables: tables, text: text,
      stats: { 段落: paragraphs.length, 表格: tables.length, 字数: text.replace(/\s/g, '').length }
    };
  }

  /* ========================================================================
     Excel
     ====================================================================== */
  function colIndex(ref) {                       /* "BC12" → 54 */
    var m = /^([A-Z]+)/.exec(ref || ''); if (!m) return 0;
    var s = m[1], n = 0, i;
    for (i = 0; i < s.length; i++) n = n * 26 + (s.charCodeAt(i) - 64);
    return n - 1;
  }
  function parseXlsx(buf) {
    var list = zipEntries(buf);
    var ssXml = zipText(buf, list, 'xl/sharedStrings.xml'), shared = [], i;
    if (ssXml) {
      var sis = allTags(ssXml, 'si');
      for (i = 0; i < sis.length; i++) shared.push(plainOf(sis[i], 't'));
    }
    var wbXml = zipText(buf, list, 'xl/workbook.xml'), names = [], m;
    var re = /<sheet[^>]*name="([^"]*)"[^>]*\/?>/g;
    while ((m = re.exec(wbXml || ''))) names.push(unesc(m[1]));
    var files = zipPick(list, /^xl\/worksheets\/sheet\d+\.xml$/);
    var sheets = [];
    files.forEach(function (e, idx) {
      var nm = names[idx] || ('Sheet' + (idx + 1));
      var xml;
      try { xml = utf8(zipRead(buf, e)); } catch (err) { sheets.push({ name: nm, rows: [] }); return; }
      var rows = allTags(xml, 'row'), grid = [], r;
      for (r = 0; r < rows.length; r++) {
        var cells = [], cre = /<c\b([^>]*)(?:\/>|>([\s\S]*?)<\/c>)/g, cm, line = [];
        while ((cm = cre.exec(rows[r]))) cells.push({ attr: cm[1] || '', inner: cm[2] || '' });
        var c;
        for (c = 0; c < cells.length; c++) {
          var attr = cells[c].attr, inner = cells[c].inner;
          var rm = /r="([A-Z]+\d+)"/.exec(attr), ci = rm ? colIndex(rm[1]) : c;
          var tm = /t="([^"]+)"/.exec(attr), type = tm ? tm[1] : 'n';
          var v = '';
          if (type === 's') { var vi = plainOf(inner, 'v'); v = shared[+vi] != null ? shared[+vi] : ''; }
          else if (type === 'inlineStr') v = plainOf(inner, 't');
          else v = plainOf(inner, 'v');
          while (line.length < ci) line.push('');
          line[ci] = (v || '').trim();
        }
        if (line.join('').length) grid.push(line);
      }
      sheets.push({ name: nm, rows: grid });
    });
    var cellCount = 0, text = [];
    sheets.forEach(function (s) {
      s.rows.forEach(function (r) { cellCount += r.filter(function (x) { return x !== ''; }).length; text.push(r.join('\t')); });
    });
    return {
      kind: 'excel', sheets: sheets, text: text.join('\n'),
      stats: { 工作表: sheets.length, 行: sheets.reduce(function (n, s) { return n + s.rows.length; }, 0), 非空单元格: cellCount }
    };
  }

  /* ========================================================================
     PPT
     ====================================================================== */
  function parsePptx(buf) {
    var list = zipEntries(buf);
    var files = zipPick(list, /^ppt\/slides\/slide\d+\.xml$/);
    if (!files.length) throw new Error('压缩包里没有幻灯片');
    var slides = [];
    files.forEach(function (e, idx) {
      var xml;
      try { xml = utf8(zipRead(buf, e)); } catch (err) { slides.push({ no: idx + 1, title: '', lines: [] }); return; }
      var paras = allTags(xml, 'a:p'), lines = [], i;
      for (i = 0; i < paras.length; i++) { var t = plainOf(paras[i], 'a:t').trim(); if (t) lines.push(t); }
      slides.push({ no: idx + 1, title: lines[0] || '', lines: lines });
    });
    var text = slides.map(function (s) { return s.lines.join('\n'); }).join('\n');
    return {
      kind: 'ppt', slides: slides, text: text,
      stats: { 页: slides.length, 文本行: slides.reduce(function (n, s) { return n + s.lines.length; }, 0), 字数: text.replace(/\s/g, '').length }
    };
  }

  /* ========================================================================
     PDF
     ====================================================================== */
  function pdfStrings(content) {
    /* 从内容流里取 Tj / TJ 的字符串实参 */
    var out = [], m, buf2 = '';
    var opRe = /(\[(?:[^\][]|\[[^\][]*\])*\]|\((?:\\.|[^\\()])*\))\s*(TJ|Tj)|T\*|'|"/g;
    while ((m = opRe.exec(content))) {
      if (!m[1]) { if (buf2.trim()) { out.push(buf2.trim()); buf2 = ''; } continue; }
      var arg = m[1], s = '';
      var sre = /\((?:\\.|[^\\()])*\)/g, sm;
      while ((sm = sre.exec(arg))) {
        var lit = sm[0].slice(1, -1);
        /* 绝大多数串里没有反斜杠转义，先看一眼再决定要不要走三趟带回调的 replace。
           这是纯快路径：有反斜杠时走的还是下面同一段代码，结果逐字不变 */
        if (lit.indexOf('\\') >= 0) lit = lit
          .replace(/\\([nrtbf])/g, function (_, c) { return { n: '\n', r: '\r', t: '\t', b: '', f: '' }[c]; })
          .replace(/\\([0-7]{1,3})/g, function (_, o) { return String.fromCharCode(parseInt(o, 8)); })
          .replace(/\\(.)/g, '$1');
        s += lit;
      }
      buf2 += s;
      if (/\]\s*TJ$/.test(m[0]) || /\)\s*Tj$/.test(m[0])) { if (buf2.trim()) { out.push(buf2.trim()); buf2 = ''; } }
    }
    if (buf2.trim()) out.push(buf2.trim());
    return out;
  }
  function parsePdf(buf) {
    var raw = latin1(buf);
    var pages = 0, pm = /\/Type\s*\/Page[^s]/g, x;
    while ((x = pm.exec(raw))) pages++;
    if (!pages) { var cm = /\/Count\s+(\d+)/.exec(raw); pages = cm ? +cm[1] : 0; }
    /* 逐个 stream：Flate 的解压，其余按明文 */
    var streams = [], sre = /stream\r?\n?/g, m2;
    while ((m2 = sre.exec(raw))) {
      var start = m2.index + m2[0].length;
      var end = raw.indexOf('endstream', start);
      if (end < 0) break;
      var head = raw.slice(Math.max(0, m2.index - 400), m2.index);
      var stop = end;                     /* endstream 前的换行不属于流数据，带上会让解压报「多余字节」 */
      while (stop > start && (buf[stop - 1] === 10 || buf[stop - 1] === 13)) stop--;
      var body = buf.subarray(start, stop);
      if (/\/FlateDecode/.test(head)) { try { streams.push(latin1(inflateZlib(body))); } catch (e) { streams.push(''); } }
      else if (/\/Filter/.test(head)) streams.push('');                  /* 其它滤镜跳过 */
      else streams.push(latin1(body));
      /* 必须跳过整个 endstream（9 个字符）。只写 = end 的话，下一轮会命中 endstream 里自带的
         那个 stream，把「本流结尾 → 下一个流结尾」当成一段假流，于是真正的下一个流被整段吞掉 ——
         结果是多流 PDF 只读得出第一个内容流的文字（字体流在前时甚至一个字都读不到） */
      sre.lastIndex = end + 9;
    }
    var lines = [], i, j, part;
    for (i = 0; i < streams.length; i++) {
      if (streams[i].indexOf('BT') < 0) continue;
      /* 原地 push，不用 concat —— concat 每轮都整份复制已有的 lines，
         几百个内容流的 PDF 会退化成平方级（实测 460 页时光这一步就 250 ms） */
      part = pdfStrings(streams[i]);
      for (j = 0; j < part.length; j++) lines.push(part[j]);
    }
    var text = lines.join('\n');
    var note = '';
    if (!text.replace(/\s/g, '').length) note = '这份 PDF 没有可提取的文字层（扫描件或全部为图形），只读到页数与结构';
    else if (!/[一-龥]/.test(text) && /[\x00-\x08\x0e-\x1f]/.test(text)) note = '这份 PDF 的中文字体未内嵌映射表，文字层只能部分还原';
    return {
      kind: 'pdf', paragraphs: lines, text: text, note: note,
      stats: { 页: pages, 文本块: lines.length, 字数: text.replace(/\s/g, '').length }
    };
  }

  /* ========================================================================
     邮件
     ====================================================================== */
  function decodeQP(s) {
    return s.replace(/=\r?\n/g, '').replace(/=([0-9A-Fa-f]{2})/g, function (_, h) { return String.fromCharCode(parseInt(h, 16)); });
  }
  function decodeWords(s) {
    return String(s).replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, function (_, cs, enc, data) {
      try {
        var bytes = enc.toUpperCase() === 'B' ? b64bytes(data) : binToBytes(decodeQP(data.replace(/_/g, ' ')));
        return decodeCharset(bytes, cs);
      } catch (e) { return data; }
    });
  }
  function charsetOf(ct) { var m = /charset="?([\w-]+)"?/i.exec(ct || ''); return m ? m[1].toLowerCase() : 'utf-8'; }
  function decodeBody(body, enc, cs) {
    var bytes;
    if (/base64/i.test(enc)) bytes = b64bytes(body);
    else if (/quoted-printable/i.test(enc)) bytes = binToBytes(decodeQP(body));
    else bytes = binToBytes(body);
    try { return decodeCharset(bytes, cs); } catch (e) { return body; }
  }
  function parseEml(buf) {
    var raw = latin1(buf);
    var sep = raw.indexOf('\r\n\r\n'), sepLen = 4;
    if (sep < 0) { sep = raw.indexOf('\n\n'); sepLen = 2; }
    if (sep < 0) { sep = raw.length; sepLen = 0; }
    var head = raw.slice(0, sep).replace(/\r?\n[ \t]+/g, ' '), body = raw.slice(sep + sepLen);
    function hdr(name) { var m = new RegExp('^' + name + ':\\s*(.*)$', 'im').exec(head); return m ? decodeWords(m[1].trim()) : ''; }
    var ct = hdr('Content-Type'), enc = (new RegExp('^Content-Transfer-Encoding:\\s*(.*)$', 'im').exec(head) || [])[1] || '';
    var plain = '', attaches = [];
    var bm = /boundary="?([^";\r\n]+)"?/i.exec(ct);
    if (bm) {
      var parts = body.split('--' + bm[1]), i;
      for (i = 0; i < parts.length; i++) {
        var p = parts[i], ps = p.indexOf('\r\n\r\n'), pl = 4;
        if (ps < 0) { ps = p.indexOf('\n\n'); pl = 2; }
        if (ps < 0) continue;
        var ph = p.slice(0, ps).replace(/\r?\n[ \t]+/g, ' '), pb = p.slice(ps + pl);
        var pct = (/Content-Type:\s*([^\r\n;]+)/i.exec(ph) || [])[1] || '';
        var penc = (/Content-Transfer-Encoding:\s*([^\r\n]+)/i.exec(ph) || [])[1] || '';
        var fn = /(?:filename|name)="?([^";\r\n]+)"?/i.exec(ph);
        if (fn) { attaches.push(decodeWords(fn[1])); continue; }
        if (/text\/plain/i.test(pct) && !plain) plain = decodeBody(pb, penc, charsetOf(ph));
        else if (/text\/html/i.test(pct) && !plain) plain = decodeBody(pb, penc, charsetOf(ph)).replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ');
      }
    } else plain = decodeBody(body, enc, charsetOf(ct));
    plain = plain.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    var lines = plain.split('\n').filter(function (x) { return x.trim(); });
    var mail = { from: hdr('From'), to: hdr('To'), cc: hdr('Cc'), subject: hdr('Subject'), date: hdr('Date'), attaches: attaches };
    return {
      kind: 'eml', mail: mail, paragraphs: lines, text: plain,
      stats: { 正文行: lines.length, 附件: attaches.length, 字数: plain.replace(/\s/g, '').length }
    };
  }

  /* ========================================================================
     纯文本
     ====================================================================== */
  function parseText(buf, ext) {
    var text = utf8(buf).replace(/\r\n/g, '\n');
    var lines = text.split('\n').filter(function (x) { return x.trim(); });
    if (ext === 'csv') {
      var rows = lines.map(function (l) { return l.split(','); });
      return {
        kind: 'excel', sheets: [{ name: 'CSV', rows: rows }], text: text,
        stats: { 工作表: 1, 行: rows.length, 非空单元格: rows.reduce(function (n, r) { return n + r.filter(function (x) { return x.trim(); }).length; }, 0) }
      };
    }
    return {
      kind: 'text', paragraphs: lines, text: text,
      stats: { 行: lines.length, 字数: text.replace(/\s/g, '').length }
    };
  }

  /* ========================================================================
     入口
     ====================================================================== */
  function shape(r, name, size, ext, kind) {
    r.name = name; r.size = size; r.sizeText = sizeText(size); r.ext = ext;
    r.kind = r.kind || kind;
    r.note = r.note || '';
    r.text = r.text || '';
    r.paragraphs = r.paragraphs || [];
    r.tables = r.tables || [];
    r.sheets = r.sheets || [];
    r.slides = r.slides || [];
    r.mail = r.mail || null;
    r.stats = r.stats || {};
    return r;
  }

  /* parse({ name, bytes }) 或 parse(name, bytes)。同步返回，绝不抛异常 */
  function parse(file, maybeBytes) {
    var o = (typeof file === 'string') ? { name: file, bytes: maybeBytes } : (file || {});
    var name = String(o.name || ''), ext = extOf(name), kind = kindOf(name), bytes, size = 0;
    try {
      bytes = toBytes(o.bytes != null ? o.bytes : o.data);
      size = (typeof o.size === 'number') ? o.size : bytes.length;
      var r;
      if (ext === 'docx') r = parseDocx(bytes);
      else if (ext === 'xlsx') r = parseXlsx(bytes);
      else if (ext === 'pptx') r = parsePptx(bytes);
      else if (ext === 'pdf') r = parsePdf(bytes);
      else if (ext === 'eml') r = parseEml(bytes);
      else if (ext === 'doc' || ext === 'xls' || ext === 'ppt')
        throw new Error('这是 Office 97 的老格式（.' + ext + '），请另存为 .' + ext + 'x 再上传');
      else r = parseText(bytes, ext);
      r.ok = true;
      return shape(r, name, size, ext, kind);
    } catch (e) {
      return shape({ ok: false, note: (e && e.message) || '解析失败' }, name, size, ext, kind);
    }
  }

  return {
    VERSION: VERSION,
    ACCEPT: ACCEPT,
    kindOf: kindOf,
    label: label,
    sizeText: sizeText,
    parse: parse,
    /* 低层件：其它 skill 与自测用得上 */
    toBytes: toBytes,
    utf8: utf8,
    utf8self: utf8self,
    latin1: latin1,
    b64bytes: b64bytes,
    inflateRaw: inflateRaw,
    inflateZlib: inflateZlib,
    zipEntries: zipEntries,
    zipRead: zipRead,
    zipText: zipText
  };
});
