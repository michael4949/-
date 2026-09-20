/* ==========================================================================
   docparse.js · 浏览器内的离线文档解析
   ------------------------------------------------------------------
   现场观众可以直接选自己的文件，全部在本机解析，不发任何网络请求、不落任何存储。
   支持：
     .docx  OOXML 压缩包 → word/document.xml → 段落与表格
     .xlsx  OOXML 压缩包 → sharedStrings + 各 sheet → 工作表与单元格
     .pptx  OOXML 压缩包 → ppt/slides/slideN.xml → 每页文字
     .pdf   解 FlateDecode 流 → 文本算子 Tj / TJ → 文字层（无文字层时如实说明）
     .eml   RFC 822 头 + 多部分正文（base64 / quoted-printable / encoded-word 解码）
     .txt / .csv / .md / .json  直接按文本读
   解压用浏览器内置 DecompressionStream('deflate-raw')，不引入任何第三方库。

   对外：window.DGG.docparse = { ACCEPT, kindOf(name), label(kind), parse(file) → Promise<结果> }
   结果：{ ok, kind, name, size, ext, text, paragraphs[], tables[], sheets[], slides[], mail{}, stats{}, note }
   失败不抛异常，返回 { ok:false, note:'原因' }。
   ========================================================================== */
(function () {
  'use strict';
  window.DGG = window.DGG || {};

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
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1048576).toFixed(2) + ' MB';
  }

  /* ---------- 基础：读文件 ---------- */
  function readBuf(file) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { res(new Uint8Array(r.result)); };
      r.onerror = function () { rej(new Error('文件读取失败')); };
      r.readAsArrayBuffer(file);
    });
  }
  function utf8(bytes) {
    try { return new TextDecoder('utf-8').decode(bytes); }
    catch (e) { var s = '', i; for (i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]); return s; }
  }
  function latin1(bytes) { var s = '', i, n = bytes.length; for (i = 0; i < n; i++) s += String.fromCharCode(bytes[i]); return s; }

  /* ---------- ZIP：中央目录 + deflate-raw 解压（OOXML 三兄弟共用） ---------- */
  function u16(b, p) { return b[p] | (b[p + 1] << 8); }
  function u32(b, p) { return (b[p] | (b[p + 1] << 8) | (b[p + 2] << 16) | (b[p + 3] << 24)) >>> 0; }

  function inflate(bytes, format) {
    if (typeof DecompressionStream === 'undefined') return Promise.reject(new Error('当前浏览器不支持内置解压'));
    var ds = new DecompressionStream(format);
    var w = ds.writable.getWriter();
    w.write(bytes); w.close();
    return new Response(ds.readable).arrayBuffer().then(function (ab) { return new Uint8Array(ab); });
  }
  function inflateRaw(bytes) { return inflate(bytes, 'deflate-raw'); }            /* ZIP 里是裸 deflate */
  /* PDF 的 FlateDecode 是 zlib 包装（0x78 开头），少数生成器写成裸流，两种都试 */
  function inflateZlib(bytes) {
    var zlibish = bytes.length > 1 && (bytes[0] & 0x0f) === 8 && ((bytes[0] << 8 | bytes[1]) % 31) === 0;
    return inflate(bytes, zlibish ? 'deflate' : 'deflate-raw')
      .catch(function () { return inflate(bytes, zlibish ? 'deflate-raw' : 'deflate'); });
  }

  function zipEntries(buf) {
    /* 从尾部找 EOCD（0x06054b50），再走中央目录（0x02014b50） */
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
    if (u32(buf, e.lho) !== 0x04034b50) return Promise.reject(new Error('压缩包条目损坏'));
    var nameLen = u16(buf, e.lho + 26), extraLen = u16(buf, e.lho + 28);
    var start = e.lho + 30 + nameLen + extraLen;
    var raw = buf.subarray(start, start + e.csize);
    if (e.method === 0) return Promise.resolve(raw);
    if (e.method === 8) return inflateRaw(raw);
    return Promise.reject(new Error('不支持的压缩方式 ' + e.method));
  }
  function zipText(buf, list, name) {
    var hit = null, i;
    for (i = 0; i < list.length; i++) if (list[i].name === name) { hit = list[i]; break; }
    if (!hit) return Promise.resolve('');
    return zipRead(buf, hit).then(utf8).catch(function () { return ''; });
  }

  /* ---------- XML 小工具（不建 DOM，正则够用且快） ---------- */
  function unesc(s) {
    return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
            .replace(/&#(\d+);/g, function (_, d) { return String.fromCharCode(+d); })
            .replace(/&#x([0-9a-fA-F]+);/g, function (_, d) { return String.fromCharCode(parseInt(d, 16)); })
            .replace(/&amp;/g, '&');
  }
  function allTags(xml, tag) {
    var re = new RegExp('<' + tag + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/' + tag + '>', 'g'), out = [], m;
    while ((m = re.exec(xml))) out.push(m[1]);
    return out;
  }
  function plainOf(frag, textTag) {
    var parts = allTags(frag, textTag), i, s = '';
    for (i = 0; i < parts.length; i++) s += unesc(parts[i]);
    return s;
  }

  /* ---------- Word ---------- */
  function parseDocx(buf) {
    var list = zipEntries(buf);
    return zipText(buf, list, 'word/document.xml').then(function (xml) {
      if (!xml) throw new Error('压缩包里没有 word/document.xml');
      var body = xml, paragraphs = [], tables = [];
      /* 表格：先抽出来，再从正文里去掉，避免重复计入段落 */
      var tbls = allTags(body, 'w:tbl'), i, j;
      for (i = 0; i < tbls.length; i++) {
        var rows = allTags(tbls[i], 'w:tr'), grid = [];
        for (j = 0; j < rows.length; j++) {
          var cells = allTags(rows[j], 'w:tc'), line = [], k;
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
    });
  }

  /* ---------- Excel ---------- */
  function colIndex(ref) {                       /* "BC12" → 54 */
    var m = /^([A-Z]+)/.exec(ref || ''); if (!m) return 0;
    var s = m[1], n = 0, i;
    for (i = 0; i < s.length; i++) n = n * 26 + (s.charCodeAt(i) - 64);
    return n - 1;
  }
  function parseXlsx(buf) {
    var list = zipEntries(buf);
    return zipText(buf, list, 'xl/sharedStrings.xml').then(function (ssXml) {
      var shared = [];
      if (ssXml) {
        var sis = allTags(ssXml, 'si'), i;
        for (i = 0; i < sis.length; i++) shared.push(plainOf(sis[i], 't'));
      }
      return zipText(buf, list, 'xl/workbook.xml').then(function (wbXml) {
        var names = [], m, re = /<sheet[^>]*name="([^"]*)"[^>]*\/?>/g;
        while ((m = re.exec(wbXml || ''))) names.push(unesc(m[1]));
        var files = list.filter(function (e) { return /^xl\/worksheets\/sheet\d+\.xml$/.test(e.name); })
                        .sort(function (a, b) { return (+/(\d+)\.xml$/.exec(a.name)[1]) - (+/(\d+)\.xml$/.exec(b.name)[1]); });
        var sheets = [];
        return files.reduce(function (chain, e, idx) {
          return chain.then(function () {
            return zipRead(buf, e).then(utf8).then(function (xml) {
              var rows = allTags(xml, 'row'), grid = [], r;
              for (r = 0; r < rows.length; r++) {
                var cells = [], cre = /<c\b([^>]*)(?:\/>|>([\s\S]*?)<\/c>)/g, cm, line = [];
                while ((cm = cre.exec(rows[r]))) cells.push({ attr: cm[1] || '', inner: cm[2] || '' });
                var c, maxi = -1;
                for (c = 0; c < cells.length; c++) {
                  var attr = cells[c].attr, inner = cells[c].inner;
                  var rm = /r="([A-Z]+\d+)"/.exec(attr), ci = rm ? colIndex(rm[1]) : c;
                  var tm = /t="([^"]+)"/.exec(attr), type = tm ? tm[1] : 'n';
                  var v = '';
                  if (type === 's') { var vi = plainOf(inner, 'v'); v = shared[+vi] != null ? shared[+vi] : ''; }
                  else if (type === 'inlineStr') v = plainOf(inner, 't');
                  else if (type === 'str') v = plainOf(inner, 'v');
                  else v = plainOf(inner, 'v');
                  while (line.length < ci) line.push('');
                  line[ci] = (v || '').trim();
                  if (ci > maxi) maxi = ci;
                }
                if (line.join('').length) grid.push(line);
              }
              sheets.push({ name: names[idx] || ('Sheet' + (idx + 1)), rows: grid });
            }).catch(function () { sheets.push({ name: names[idx] || ('Sheet' + (idx + 1)), rows: [] }); });
          });
        }, Promise.resolve()).then(function () {
          var cellCount = 0, text = [];
          sheets.forEach(function (s) {
            s.rows.forEach(function (r) { cellCount += r.filter(function (x) { return x !== ''; }).length; text.push(r.join('\t')); });
          });
          return {
            kind: 'excel', sheets: sheets, text: text.join('\n'),
            stats: { 工作表: sheets.length, 行: sheets.reduce(function (n, s) { return n + s.rows.length; }, 0), 非空单元格: cellCount }
          };
        });
      });
    });
  }

  /* ---------- PPT ---------- */
  function parsePptx(buf) {
    var list = zipEntries(buf);
    var files = list.filter(function (e) { return /^ppt\/slides\/slide\d+\.xml$/.test(e.name); })
                    .sort(function (a, b) { return (+/(\d+)\.xml$/.exec(a.name)[1]) - (+/(\d+)\.xml$/.exec(b.name)[1]); });
    if (!files.length) return Promise.reject(new Error('压缩包里没有幻灯片'));
    var slides = [];
    return files.reduce(function (chain, e, idx) {
      return chain.then(function () {
        return zipRead(buf, e).then(utf8).then(function (xml) {
          var paras = allTags(xml, 'a:p'), lines = [], i;
          for (i = 0; i < paras.length; i++) { var t = plainOf(paras[i], 'a:t').trim(); if (t) lines.push(t); }
          slides.push({ no: idx + 1, title: lines[0] || '', lines: lines });
        }).catch(function () { slides.push({ no: idx + 1, title: '', lines: [] }); });
      });
    }, Promise.resolve()).then(function () {
      var text = slides.map(function (s) { return s.lines.join('\n'); }).join('\n');
      return {
        kind: 'ppt', slides: slides, text: text,
        stats: { 页: slides.length, 文本行: slides.reduce(function (n, s) { return n + s.lines.length; }, 0), 字数: text.replace(/\s/g, '').length }
      };
    });
  }

  /* ---------- PDF ---------- */
  function pdfStrings(content) {
    /* 从内容流里取 Tj / TJ 的字符串实参 */
    var out = [], re = /\((?:\\.|[^\\()])*\)|<[0-9A-Fa-f\s]+>/g, m, buf2 = '';
    var opRe = /(\[(?:[^\][]|\[[^\][]*\])*\]|\((?:\\.|[^\\()])*\))\s*(TJ|Tj)|T\*|'|"/g;
    while ((m = opRe.exec(content))) {
      if (!m[1]) { if (buf2.trim()) { out.push(buf2.trim()); buf2 = ''; } continue; }
      var arg = m[1], s = '';
      var sre = /\((?:\\.|[^\\()])*\)/g, sm;
      while ((sm = sre.exec(arg))) {
        var lit = sm[0].slice(1, -1)
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
    /* 逐个 stream，Flate 的解压，其余按明文 */
    var jobs = [], sre = /stream\r?\n?/g, m2;
    while ((m2 = sre.exec(raw))) {
      var start = m2.index + m2[0].length;
      var end = raw.indexOf('endstream', start);
      if (end < 0) break;
      var head = raw.slice(Math.max(0, m2.index - 400), m2.index);
      var stop = end;                                   /* endstream 前的换行不属于流数据，带上会让解压报「多余字节」 */
      while (stop > start && (buf[stop - 1] === 10 || buf[stop - 1] === 13)) stop--;
      var body = buf.subarray(start, stop);
      if (/\/FlateDecode/.test(head)) jobs.push(inflateZlib(body).then(function (b) { return latin1(b); }).catch(function () { return ''; }));
      else if (/\/Filter/.test(head)) jobs.push(Promise.resolve(''));           /* 其它滤镜跳过 */
      else jobs.push(Promise.resolve(latin1(body)));
      sre.lastIndex = end;
    }
    return Promise.all(jobs).then(function (streams) {
      var lines = [], i;
      for (i = 0; i < streams.length; i++) {
        if (streams[i].indexOf('BT') < 0) continue;
        lines = lines.concat(pdfStrings(streams[i]));
      }
      var text = lines.join('\n');
      var note = '';
      if (!text.replace(/\s/g, '').length) note = '这份 PDF 没有可提取的文字层（扫描件或全部为图形），只读到页数与结构';
      else if (!/[一-龥]/.test(text) && /[\x00-\x08\x0e-\x1f]/.test(text)) note = '这份 PDF 的中文字体未内嵌映射表，文字层只能部分还原';
      return {
        kind: 'pdf', paragraphs: lines, text: text, note: note,
        stats: { 页: pages, 文本块: lines.length, 字数: text.replace(/\s/g, '').length }
      };
    });
  }

  /* ---------- 邮件 ---------- */
  function decodeQP(s) {
    return s.replace(/=\r?\n/g, '').replace(/=([0-9A-Fa-f]{2})/g, function (_, h) { return String.fromCharCode(parseInt(h, 16)); });
  }
  function bytesFromBinary(s) { var a = new Uint8Array(s.length), i; for (i = 0; i < s.length; i++) a[i] = s.charCodeAt(i) & 255; return a; }
  function decodeWords(s) {
    return String(s).replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, function (_, cs, enc, data) {
      try {
        var bin = enc.toUpperCase() === 'B' ? atob(data) : decodeQP(data.replace(/_/g, ' '));
        return new TextDecoder(cs.toLowerCase()).decode(bytesFromBinary(bin));
      } catch (e) { return data; }
    });
  }
  function charsetOf(ct) { var m = /charset="?([\w-]+)"?/i.exec(ct || ''); return m ? m[1].toLowerCase() : 'utf-8'; }
  function decodeBody(body, enc, cs) {
    var bin = body;
    if (/base64/i.test(enc)) { try { bin = atob(body.replace(/\s/g, '')); } catch (e) { bin = body; } }
    else if (/quoted-printable/i.test(enc)) bin = decodeQP(body);
    try { return new TextDecoder(cs || 'utf-8').decode(bytesFromBinary(bin)); } catch (e) { return bin; }
  }
  function parseEml(buf) {
    var raw = latin1(buf);
    var sep = raw.indexOf('\r\n\r\n'); var sepLen = 4;
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
        var p = parts[i], ps = p.indexOf('\r\n\r\n'); var pl = 4;
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
    return Promise.resolve({
      kind: 'eml', mail: mail, paragraphs: lines, text: plain,
      stats: { 正文行: lines.length, 附件: attaches.length, 字数: plain.replace(/\s/g, '').length }
    });
  }

  /* ---------- 纯文本 ---------- */
  function parseText(buf, ext) {
    var text = utf8(buf).replace(/\r\n/g, '\n');
    var lines = text.split('\n').filter(function (x) { return x.trim(); });
    if (ext === 'csv') {
      var rows = lines.map(function (l) { return l.split(','); });
      return Promise.resolve({
        kind: 'excel', sheets: [{ name: 'CSV', rows: rows }], text: text,
        stats: { 工作表: 1, 行: rows.length, 非空单元格: rows.reduce(function (n, r) { return n + r.filter(function (x) { return x.trim(); }).length; }, 0) }
      });
    }
    return Promise.resolve({
      kind: 'text', paragraphs: lines, text: text,
      stats: { 行: lines.length, 字数: text.replace(/\s/g, '').length }
    });
  }

  /* ---------- 入口 ---------- */
  function parse(file) {
    var ext = extOf(file.name), kind = kindOf(file.name);
    return readBuf(file).then(function (buf) {
      if (ext === 'docx') return parseDocx(buf);
      if (ext === 'xlsx') return parseXlsx(buf);
      if (ext === 'pptx') return parsePptx(buf);
      if (ext === 'pdf') return parsePdf(buf);
      if (ext === 'eml') return parseEml(buf);
      if (ext === 'doc' || ext === 'xls' || ext === 'ppt')
        return Promise.reject(new Error('这是 Office 97 的老格式（.' + ext + '），请另存为 .' + ext + 'x 再上传'));
      return parseText(buf, ext);
    }).then(function (r) {
      r.ok = true; r.name = file.name; r.size = file.size; r.sizeText = sizeText(file.size); r.ext = ext;
      r.kind = r.kind || kind; r.note = r.note || '';
      r.paragraphs = r.paragraphs || []; r.tables = r.tables || []; r.sheets = r.sheets || []; r.slides = r.slides || [];
      r.text = r.text || '';
      return r;
    }).catch(function (e) {
      return { ok: false, kind: kind, name: file.name, size: file.size, sizeText: sizeText(file.size), ext: ext,
               note: (e && e.message) || '解析失败', paragraphs: [], tables: [], sheets: [], slides: [], text: '', stats: {} };
    });
  }

  window.DGG.docparse = { ACCEPT: ACCEPT, kindOf: kindOf, label: label, sizeText: sizeText, parse: parse };
})();
