/* 参赛 PPT 公共库：深色霓虹光环视觉 + 模板骨架（封面 / 声明 / 目录 / 眉题 + 标题 / 团队 / 汇报完毕）
   用法：const K = require('./pptkit/lib.cjs'); const { pres, C, L } = K.create({ product, footer });  */
const fs = require('fs'), path = require('path');
const pptxgen = require('pptxgenjs');
const sharp = require('sharp');
const JSZip = require('jszip');
const OUT = path.join(__dirname, 'out');
const A = n => path.join(OUT, n);

const THEME = {
  name: '小瓦特霓虹', headFontFace: '微软雅黑', bodyFontFace: '微软雅黑',
  colors: { dk1: '0B1230', lt1: 'FFFFFF', dk2: '1B2558', lt2: 'B8C3E6', accent1: '22D3EE', accent2: '3B82F6', accent3: '8B5CF6', accent4: 'EC4899', accent5: 'FBBF24', accent6: '34D399', hlink: '60A5FA', folHlink: 'A78BFA' }
};
const SEC = [['01', '成果介绍', 'star'], ['02', '解决方案', 'layers'], ['03', '应用成效', 'chart'], ['04', '推广价值', 'rocket'], ['05', '团队介绍', 'users']];
const CN = ['一', '二', '三', '四', '五'];

/* 背景 PNG → JPG（无透明，缩小体积） */
async function bgJpg(k) {
  const j = A('bg_' + k + '.jpg');
  if (!fs.existsSync(j)) await sharp(A('bg_' + k + '.png')).jpeg({ quality: 86 }).toFile(j);
  return j;
}
/* 精灵图缩小版（PPT 里每次引用都单独嵌入，必须小） */
async function ensureSmall() {
  const spec = [[/^sp_glow/, 360, 360], [/^sp_orb/, 160, 160], [/^sp_pill/, 600, 100], [/^sp_hair/, 1200, 12], [/^sp_vbar/, 20, 300], [/^ic_/, 160, 160], [/^sp_logo/, 560, 200]];
  for (const f of fs.readdirSync(OUT)) {
    if (!f.endsWith('.png') || f.endsWith('_s.png')) continue;
    const sp = spec.find(([re]) => re.test(f)); if (!sp) continue;
    const dst = A(f.replace(/\.png$/, '_s.png'));
    if (!fs.existsSync(dst)) await sharp(A(f)).resize(sp[1], sp[2]).png({ compressionLevel: 9, palette: false }).toFile(dst);
  }
}
const S = n => /^(sp_|ic_)/.test(n) ? n.replace(/\.png$/, '_s.png') : n;
/* 相框截图缩到 1200 宽（体积） */
async function frame(name) {
  const src = A('fr_' + name + '.png'), dst = A('fr_' + name + '_m.png');
  if (!fs.existsSync(dst)) await sharp(src).resize({ width: 1200 }).png({ compressionLevel: 9 }).toFile(dst);
  return dst;
}

async function create({ footer }) {
  await ensureSmall();
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_WIDE'; // 13.333 × 7.5
  pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
  pres.author = '深圳供电局有限公司'; pres.company = '深圳供电局有限公司'; pres.subject = '人力资源数智化创新产品评优';
  const C = pres.SchemeColor;
  const logo = { image: { x: 11.0, y: 0.3, w: 1.85, h: 0.66, path: A(S('sp_logo.png')) } };
  const num = { x: 12.35, y: 7.02, w: 0.5, h: 0.3, color: THEME.colors.lt2, fontSize: 10, fontFace: 'Arial', align: 'right' };
  pres.defineSlideMaster({ title: 'COVER', background: { path: await bgJpg('cover') }, objects: [logo] });
  pres.defineSlideMaster({ title: 'SECTION', background: { path: await bgJpg('section') }, objects: [logo], slideNumber: { ...num } });
  pres.defineSlideMaster({ title: 'END', background: { path: await bgJpg('end') }, objects: [logo] });
  pres.defineSlideMaster({
    title: 'CONTENT', background: { path: await bgJpg('content') }, slideNumber: { ...num },
    objects: [logo,
      { image: { x: 0.6, y: 0.47, w: 0.06, h: 0.3, path: A(S('sp_vbar.png')) } },
      { placeholder: { options: { name: 'eyebrow', type: 'body', x: 0.76, y: 0.42, w: 8.5, h: 0.4, fontSize: 13, color: C.accent1, bold: true, margin: 0, valign: 'middle', charSpacing: 2 }, text: '' } },
      { placeholder: { options: { name: 'title', type: 'title', x: 0.6, y: 0.8, w: 10.2, h: 0.62, fontSize: 25, color: C.background1, bold: true, margin: 0, valign: 'middle' }, text: '' } },
      { image: { x: 0.6, y: 1.43, w: 6.2, h: 0.045, path: A(S('sp_hair.png')) } },
      { text: { text: footer, options: { x: 0.6, y: 7.02, w: 9, h: 0.3, fontSize: 9.5, color: C.background2, margin: 0, valign: 'middle', isTextBox: true } } }]
  });
  return { pres, C };
}

/* ---------- 基础元件 ---------- */
const H = (pres, C) => {
  const T = (s, text, o = {}) => s.addText(text, { isTextBox: true, margin: 0, color: C.background1, fontSize: 13, valign: 'top', ...o });
  const glass = (s, x, y, w, h, o = {}) => s.addShape(pres.ShapeType.roundRect, {
    x, y, w, h, rectRadius: o.r ?? 0.12, fill: { color: C.background1, transparency: o.ft ?? 91 },
    line: { color: o.lc || C.background1, transparency: o.lt ?? 70, width: o.lw ?? 0.75 }, objectName: o.name || 'card',
    shadow: o.glow ? { type: 'outer', blur: 14, offset: 0, angle: 90, color: o.glow, opacity: 0.45 } : undefined
  });
  const img = (s, name, x, y, w, h, o = {}) => s.addImage({ path: A(S(name)), x, y, w, h, ...o });
  const pill = (s, x, y, w, h, text, o = {}) => { img(s, 'sp_pill' + (o.v ? '_' + o.v : '') + '.png', x, y, w, h); T(s, text, { x, y, w, h, align: 'center', valign: 'middle', bold: true, fontSize: o.fs || 12, color: C.background1 }); };
  const orb = (s, x, y, d, o = {}) => {
    img(s, 'sp_orb' + (o.v ? '_' + o.v : '') + '.png', x, y, d, d);
    if (o.icon) img(s, 'ic_' + o.icon + '.png', x + d * 0.2, y + d * 0.2, d * 0.6, d * 0.6);
    if (o.num != null) T(s, String(o.num), { x, y, w: d, h: d, align: 'center', valign: 'middle', bold: true, fontSize: o.fs || d * 26, fontFace: 'Arial' });
  };
  const chip = (s, x, y, w, h, text, o = {}) => { glass(s, x, y, w, h, { r: h / 2, ft: o.ft ?? 86, lc: o.lc, lt: o.lt ?? 55 }); T(s, text, { x: x + 0.1, y, w: w - 0.2, h, align: o.align || 'center', valign: 'middle', fontSize: o.fs || 11, color: o.color || C.background1, bold: o.bold }); };
  const hair = (s, x, y, w, h = 0.035) => img(s, 'sp_hair.png', x, y, w, h);
  const cap = (s, x, y, w, h, text, o = {}) => T(s, text, { x, y, w, h, fontSize: o.fs || 10.5, color: C.background2, align: o.align || 'left', valign: 'top', ...o });
  /* 大数字 */
  const stat = (s, x, y, w, h, { num, unit, label, desc, v, dfs }) => {
    glass(s, x, y, w, h, { ft: 90 });
    hair(s, x + 0.25, y + 0.02, Math.min(w - 0.5, 2.2), 0.04);
    img(s, 'sp_glow' + (v ? '_' + v : '') + '.png', x - 0.3, y - 0.2, 1.6, 1.6);
    s.addText([{ text: num, options: { fontSize: 38, bold: true, fontFace: 'Arial', color: C.background1 } }, { text: ' ' + unit, options: { fontSize: 14, bold: true, color: C.accent1 } }], { x: x + 0.25, y: y + 0.18, w: w - 0.4, h: 0.8, isTextBox: true, margin: 0, valign: 'middle' });
    T(s, label, { x: x + 0.25, y: y + 1.02, w: w - 0.4, h: 0.38, bold: true, fontSize: 14 });
    if (desc) T(s, desc, { x: x + 0.25, y: y + 1.42, w: w - 0.45, h: h - 1.55, fontSize: dfs || 11, color: C.background2, lineSpacingMultiple: 1.15 });
  };
  /* 图标卡：图标球 + 标题 + 正文 */
  const card = (s, x, y, w, h, { icon, num, title, body, v, fs, tfs, horiz }) => {
    glass(s, x, y, w, h);
    if (horiz) {
      orb(s, x + 0.22, y + (h - 0.62) / 2, 0.62, { icon, num, v });
      T(s, title, { x: x + 1.0, y: y + 0.1, w: w - 1.15, h: 0.34, bold: true, fontSize: tfs || 14 });
      T(s, body, { x: x + 1.0, y: y + 0.44, w: w - 1.15, h: h - 0.5, fontSize: fs || 11.5, color: C.background2, lineSpacingMultiple: 1.15 });
    } else {
      orb(s, x + 0.25, y + 0.25, 0.7, { icon, num, v });
      T(s, title, { x: x + 0.25, y: y + 1.08, w: w - 0.4, h: 0.4, bold: true, fontSize: tfs || 15 });
      T(s, body, { x: x + 0.25, y: y + 1.52, w: w - 0.45, h: h - 1.65, fontSize: fs || 12, color: C.background2, lineSpacingMultiple: 1.2 });
    }
  };
  /* 编号行：球 + 标题 + 说明 */
  const row = (s, x, y, w, h, n, title, body, o = {}) => {
    glass(s, x, y, w, h, { ft: 92 });
    orb(s, x + 0.18, y + (h - 0.5) / 2, 0.5, { num: n, v: o.v, fs: 15, icon: o.icon });
    if (body) { T(s, title, { x: x + 0.85, y: y + 0.1, w: w - 1.0, h: 0.32, bold: true, fontSize: o.tfs || 13.5 }); T(s, body, { x: x + 0.85, y: y + 0.42, w: w - 1.0, h: h - 0.48, fontSize: o.fs || 11, color: C.background2, lineSpacingMultiple: 1.12 }); }
    else T(s, title, { x: x + 0.85, y, w: w - 1.0, h, valign: 'middle', bold: true, fontSize: o.tfs || 13.5 });
  };
  /* 截图相框 */
  const shot = async (s, name, x, y, w, o = {}) => { const p = await frame(name); const h = w * 928 / 1468; s.addImage({ path: p, x, y, w, h, objectName: '截图 ' + name, ...o }); return h; };
  /* 箭头流程（V 形块） */
  const flow = (s, x, y, w, h, items, o = {}) => {
    const g = 0.08, cw = (w - g * (items.length - 1)) / items.length;
    items.forEach((t, i) => {
      const cx = x + i * (cw + g);
      s.addShape(i === 0 ? pres.ShapeType.homePlate : pres.ShapeType.chevron, { x: cx, y, w: cw, h, fill: { color: [C.accent2, C.accent3, C.accent4, C.accent1, C.accent6][i % 5], transparency: 22 }, line: { color: C.background1, transparency: 55, width: 0.75 }, objectName: 'flow' + (i + 1) });
      T(s, t, { x: cx + (i ? 0.3 : 0.15), y, w: cw - 0.45, h, align: 'center', valign: 'middle', bold: true, fontSize: o.fs || 13 });
    });
  };
  /* 表格行（玻璃行，不用原生表格以便发光描边） */
  const grid = (s, x, y, cols, rows, o = {}) => {
    const hh = o.hh || 0.34, rh = o.rh || 0.6, g = o.g ?? 0.07, fs = o.fs || 10.5;
    let cx = x; cols.forEach(c => { T(s, c.t, { x: cx + 0.12, y, w: c.w - 0.2, h: hh, bold: true, fontSize: 11, color: C.accent1, valign: 'middle' }); cx += c.w + 0.08; });
    hair(s, x, y + hh, cols.reduce((a, c) => a + c.w + 0.08, -0.08), 0.03);
    rows.forEach((r, i) => {
      const ry = y + hh + 0.12 + i * (rh + g); const tw = cols.reduce((a, c) => a + c.w + 0.08, -0.08);
      glass(s, x, ry, tw, rh, { ft: 92, lt: 78, r: 0.08 });
      let cx = x; r.forEach((t, j) => { const c = cols[j]; T(s, t, { x: cx + 0.12, y: ry, w: c.w - 0.2, h: rh, fontSize: j === 0 ? fs + 1 : fs, bold: j === 0 || c.bold, color: c.color || (j === 0 ? C.background1 : C.background2), valign: 'middle', lineSpacingMultiple: 1.08 }); cx += c.w + 0.08; });
    });
    return y + hh + 0.12 + rows.length * (rh + g);
  };
  return { T, glass, img, pill, orb, chip, hair, cap, stat, card, row, shot, flow, grid };
};

/* ---------- 模板骨架页 ---------- */
function toc(pres, C, h, cur, sectionTitle) {
  const s = pres.addSlide({ masterName: 'SECTION', sectionTitle });
  h.T(s, 'CONTENTS', { x: 0.8, y: 2.35, w: 5.5, h: 0.9, fontSize: 44, bold: true, fontFace: 'Arial', charSpacing: 6 });
  h.hair(s, 0.85, 3.32, 3.2, 0.045);
  h.T(s, '目  录', { x: 0.85, y: 3.45, w: 4, h: 0.6, fontSize: 24, bold: true, color: C.background2 });
  h.T(s, '「高效班组管理助手」班组数字画像与班组长 AI 助手', { x: 0.85, y: 4.1, w: 5.2, h: 0.5, fontSize: 12.5, color: C.background2 });
  SEC.forEach(([n, t, ic], i) => {
    const y = 1.45 + i * 1.0, x = 6.4, w = 6.2, hh = 0.8, on = i === cur;
    if (on) { h.img(s, 'sp_glow.png', x - 0.9, y - 1.3, 3.4, 3.4); h.img(s, 'sp_pill.png', x, y, w, hh); }
    else h.glass(s, x, y, w, hh, { r: 0.4, ft: 90, lt: 72 });
    h.T(s, n, { x: x + 0.35, y, w: 0.9, h: hh, fontSize: 22, bold: true, fontFace: 'Arial', valign: 'middle', color: on ? C.background1 : C.accent1 });
    h.T(s, CN[i] + '、' + t, { x: x + 1.3, y, w: 3.6, h: hh, fontSize: on ? 20 : 17, bold: true, valign: 'middle', color: on ? C.background1 : C.background2 });
    h.img(s, 'ic_' + ic + '.png', x + w - 0.95, y + 0.1, 0.6, 0.6, on ? {} : { transparency: 45 });
  });
  s.addNotes(cur === 0 ? '汇报分五部分：成果介绍、解决方案、应用成效、推广价值、团队介绍。' : '进入第' + CN[cur] + '部分：' + SEC[cur][1] + '。');
  return s;
}
function content(pres, C, sec, title, sectionTitle, eyebrowExtra) {
  const s = pres.addSlide({ masterName: 'CONTENT', sectionTitle });
  s.addText(SEC[sec][0] + '  /  ' + CN[sec] + '、' + SEC[sec][1] + (eyebrowExtra ? '  ·  ' + eyebrowExtra : ''), { placeholder: 'eyebrow' });
  s.addText(title, { placeholder: 'title' });
  return s;
}

/* 写文件后：把主题色与中文字体写进 theme1.xml（pptxgenjs 不写主题色） */
async function finish(pres, file) {
  await pres.writeFile({ fileName: file });
  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  const tp = 'ppt/theme/theme1.xml'; let x = await zip.file(tp).async('string');
  const c = THEME.colors;
  const cs = `<a:clrScheme name="${THEME.name}"><a:dk1><a:srgbClr val="${c.dk1}"/></a:dk1><a:lt1><a:srgbClr val="${c.lt1}"/></a:lt1><a:dk2><a:srgbClr val="${c.dk2}"/></a:dk2><a:lt2><a:srgbClr val="${c.lt2}"/></a:lt2><a:accent1><a:srgbClr val="${c.accent1}"/></a:accent1><a:accent2><a:srgbClr val="${c.accent2}"/></a:accent2><a:accent3><a:srgbClr val="${c.accent3}"/></a:accent3><a:accent4><a:srgbClr val="${c.accent4}"/></a:accent4><a:accent5><a:srgbClr val="${c.accent5}"/></a:accent5><a:accent6><a:srgbClr val="${c.accent6}"/></a:accent6><a:hlink><a:srgbClr val="${c.hlink}"/></a:hlink><a:folHlink><a:srgbClr val="${c.folHlink}"/></a:folHlink></a:clrScheme>`;
  x = x.replace(/<a:clrScheme[\s\S]*?<\/a:clrScheme>/, cs);
  x = x.replace(/<a:ea typeface="[^"]*"\/>/g, '<a:ea typeface="微软雅黑"/>');
  x = x.replace(/<a:theme([^>]*) name="[^"]*"/, '<a:theme$1 name="' + THEME.name + '"');
  zip.file(tp, x);
  fs.writeFileSync(file, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
}

module.exports = { THEME, SEC, CN, A, create, H, toc, content, finish, frame };
