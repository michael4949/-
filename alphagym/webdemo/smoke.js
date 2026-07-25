#!/usr/bin/env node
/**
 * 浏览器冒烟测试：真的把 demo 打开、真的点一遍、真的截图。
 * 任何 console error / pageerror 都算失败。
 *
 * 有两条断言是被线上问题倒逼出来的，值得单独说明：
 *   · 「导航离开再回来后图表仍有像素」—— 之前只在首次进入时截图，
 *     漏掉了 innerHTML 重建 DOM 导致图表画到孤儿节点上的 bug，页面上是三块白板。
 *     所以现在逐像素采样，确认画布真的画了东西，而不只是「canvas 元素存在」。
 *   · 「上传的文件真的被解析」—— 断言解析出的笔数、单元格内容、PDF 文字，
 *     而不是只看附件卡片有没有出现。
 *
 * 用法: node webdemo/smoke.js
 */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';

const HERE = dirname(fileURLToPath(import.meta.url));
/**
 * 用 localhost 起静态服务，而不是 file:// 直接打开。
 * 浏览器只在安全上下文（https / localhost）下开放麦克风，
 * file:// 下 navigator.mediaDevices 根本不存在 —— 那样语音路径就测不到了。
 */
const PORT = 8731;
const FILE = `http://localhost:${PORT}/alphagym-demo.html`;
const server = createServer((req, res) => {
  try {
    const body = readFileSync(join(HERE, 'dist', 'alphagym-demo.html'));
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(body);
  } catch (e) { res.writeHead(500); res.end(String(e)); }
});
const SHOTS = join(HERE, 'shots');
const TMP = join(SHOTS, 'fixtures');
mkdirSync(SHOTS, { recursive: true });
mkdirSync(TMP, { recursive: true });

const errors = [];
let fails = 0, passes = 0;
function check(name, cond, detail = '') {
  if (cond) { console.log(`  ✅ ${name}${detail ? ' — ' + detail : ''}`); passes++; }
  else { console.log(`  ❌ ${name}${detail ? ' — ' + detail : ''}`); fails++; }
}
const shot = (p, n, o = {}) => p.screenshot({ path: join(SHOTS, n + '.png'), ...o });

/** 逐像素采样：判断这些容器里的画布是不是真的画了东西 */
const inkOf = (page, sel) => page.evaluate((s) => {
  return [...document.querySelectorAll(s)].map(host => {
    let ink = 0;
    for (const c of host.querySelectorAll('canvas')) {
      try {
        const g = c.getContext('2d'); if (!g) continue;
        const d = g.getImageData(0, 0, Math.min(c.width, 300), Math.min(c.height, 200)).data;
        for (let i = 3; i < d.length; i += 40) if (d[i] > 10) ink++;
      } catch (e) {}
    }
    return { id: host.id, ink };
  });
}, sel);

/* ── 生成真实的 XLSX / PDF 测试文件 ─────────────────────────────── */
const enc = (s) => new TextEncoder().encode(s);
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
  return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(cs)).arrayBuffer());
}
async function makeZip(entries) {
  const locals = [], central = [];
  let offset = 0;
  for (const [name, content] of Object.entries(entries)) {
    const raw = enc(content);
    const data = await deflateRaw(raw);
    const nb = enc(name), crc = crc32(raw);
    const lh = new Uint8Array(30 + nb.length); const ldv = new DataView(lh.buffer);
    ldv.setUint32(0, 0x04034b50, true); ldv.setUint16(4, 20, true); ldv.setUint16(8, 8, true);
    ldv.setUint32(14, crc, true); ldv.setUint32(18, data.length, true);
    ldv.setUint32(22, raw.length, true); ldv.setUint16(26, nb.length, true);
    lh.set(nb, 30); locals.push(lh, data);
    const ch = new Uint8Array(46 + nb.length); const cdv = new DataView(ch.buffer);
    cdv.setUint32(0, 0x02014b50, true); cdv.setUint16(4, 20, true); cdv.setUint16(6, 20, true);
    cdv.setUint16(10, 8, true); cdv.setUint32(16, crc, true);
    cdv.setUint32(20, data.length, true); cdv.setUint32(24, raw.length, true);
    cdv.setUint16(28, nb.length, true); cdv.setUint32(42, offset, true);
    ch.set(nb, 46); central.push(ch);
    offset += lh.length + data.length;
  }
  const cdSize = central.reduce((a, b) => a + b.length, 0);
  const eocd = new Uint8Array(22); const edv = new DataView(eocd.buffer);
  edv.setUint32(0, 0x06054b50, true); edv.setUint16(8, central.length, true);
  edv.setUint16(10, central.length, true); edv.setUint32(12, cdSize, true); edv.setUint32(16, offset, true);
  const all = [...locals, ...central, eocd];
  const out = new Uint8Array(all.reduce((a, b) => a + b.length, 0));
  let p = 0; for (const part of all) { out.set(part, p); p += part.length; }
  return Buffer.from(out);
}
async function makePdf(text) {
  const content = enc(`BT /F1 12 Tf 72 700 Td (${text}) Tj ET`);
  const cs = new CompressionStream('deflate');
  const payload = new Uint8Array(await new Response(new Blob([content]).stream().pipeThrough(cs)).arrayBuffer());
  const head = enc(`%PDF-1.4\n1 0 obj\n<< /Length ${payload.length} /Filter /FlateDecode >>\nstream\n`);
  const tail = enc('\nendstream\nendobj\ntrailer\n%%EOF');
  const out = new Uint8Array(head.length + payload.length + tail.length);
  out.set(head, 0); out.set(payload, head.length); out.set(tail, head.length + payload.length);
  return Buffer.from(out);
}

const run = async () => {
  await new Promise(r => server.listen(PORT, r));
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium',
    args: ['--no-sandbox', '--disable-dev-shm-usage',
      '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
  });
  const ctx = await browser.newContext({
    viewport: { width: 1500, height: 980 }, deviceScaleFactor: 2, permissions: ['microphone'],
  });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));

  await page.goto(FILE, { waitUntil: 'load' });
  await page.waitForTimeout(1600);

  /* ── 营销站 ── */
  console.log('\n▌营销站');
  check('首页标题正确', (await page.title()).includes('AlphaGym'));
  check('四大核心能力卡片齐全', (await page.locator('#site .g4 .card').count()) === 4);
  check('AI 能力区块齐全', (await page.locator('#site .aicard').count()) === 6);
  check('页脚含风险提示', (await page.locator('.foot .legal').textContent()).includes('不提供投资建议'));
  const ink1 = await inkOf(page, '#site [id^=featChart], #site #heroChart');
  // 5 张：主视觉 + 三个特色卡（多周期那张是日线 + 周线两屏）
  check('首页每一张图都真的画了内容', ink1.length === 5 && ink1.every(x => x.ink > 100),
    ink1.map(x => `${x.id}:${x.ink}`).join(' '));
  await shot(page, '01-home');

  for (const [hash, sel, label] of [
    ['features', '#site .card', '功能全景'], ['data', '#site table.dt tbody tr', '数据说明'],
    ['pricing', '#site .price', '版本与价格'], ['mobile', '#site .card', '手机版'],
    ['contest', '#site .card', '选拔赛'], ['faq', '#site .faq details', '常见问题'],
  ]) {
    await page.goto(FILE + '#' + hash); await page.waitForTimeout(420);
    check(`${label}页有内容`, (await page.locator(sel).count()) > 0, `${await page.locator(sel).count()} 项`);
  }

  // 这条是那三块白板的回归防线
  await page.goto(FILE + '#home'); await page.waitForTimeout(1600);
  const ink2 = await inkOf(page, '#site [id^=featChart], #site #heroChart');
  check('离开再回到首页，图表依然有内容（白板 bug 回归防线）',
    ink2.length === 5 && ink2.every(x => x.ink > 100), ink2.map(x => `${x.id}:${x.ink}`).join(' '));
  await shot(page, '02-home-revisit');

  /* ── 决策训练台 ── */
  console.log('\n▌决策训练台');
  await page.goto(FILE + '#app/replay');
  await page.waitForTimeout(1500);
  check('主图已渲染', (await inkOf(page, '#chart'))[0].ink > 100);
  check('副图（多周期同屏）已渲染', (await inkOf(page, '#chartMtf'))[0].ink > 50);
  check('决策按钮在图表正下方', await page.locator('#v-replay .deckbar .act.buy').isVisible());

  // 纯键盘完成一轮决策
  await page.locator('#chart').click({ position: { x: 40, y: 40 } });
  await page.keyboard.press('Space');
  await page.waitForTimeout(180);
  const dec0 = await page.locator('#tDec').textContent();
  await page.keyboard.press('ArrowUp');           // 做多
  await page.waitForTimeout(420);
  const pos = await page.locator('#tPos').textContent();
  check('键盘 ↑ 直接建仓', pos.includes('多'), `持仓=${pos}`);
  check('决策计数器递增', (await page.locator('#tDec').textContent()) !== dec0,
    `${dec0} → ${await page.locator('#tDec').textContent()}`);
  check('图上显示持仓与成本（HUD）',
    (await page.locator('#hud').textContent()).includes('@'), (await page.locator('#hud').textContent()).slice(0, 40));
  check('自动止损已挂出', (await page.locator('#sSL').textContent()) !== '—',
    await page.locator('#sSL').textContent());
  const overlays = await page.evaluate(() => {
    const el = document.querySelector('#chart');
    return [...el.querySelectorAll('canvas')].length;
  });
  check('主图有独立覆盖层用于标注', overlays >= 4, `${overlays} 层`);
  await shot(page, '03-replay-position');

  for (let i = 0; i < 6; i++) { await page.keyboard.press('Space'); await page.waitForTimeout(70); }
  await page.keyboard.press('KeyX');              // 平仓
  await page.waitForTimeout(420);
  check('键盘 X 平仓', (await page.locator('#tPos').textContent()).includes('空仓'));
  check('成交记录已生成', !(await page.locator('#fills').textContent()).includes('还没有成交'));

  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(500);
  check('可以后退一根（确定性重放）', (await page.locator('#tPrgD').textContent()).length > 0);

  const before = await page.locator('#tPrgD').textContent();
  await page.keyboard.press('Tab');
  await page.waitForTimeout(700);
  check('跳到下一波动会真的推进', (await page.locator('#tPrgD').textContent()) !== before);

  // grid 的 1fr 默认 min-width:auto，操作条一宽就会把右侧持仓面板整个推出屏幕，
  // 数字全被裁掉、看上去就是「一片空白」。这里逐项确认它们真的在视口内。
  const sideOk = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const bad = ['sFloat', 'sAvg', 'sSL', 'sLast', 'sCash', 'sPend']
      .filter(id => document.getElementById(id).getBoundingClientRect().right > vw);
    return { over: document.documentElement.scrollWidth - vw, bad };
  });
  check('桌面端无横向溢出，持仓数值未被裁出屏幕', sideOk.over <= 0 && !sideOk.bad.length,
    `溢出 ${sideOk.over}px，越界字段 ${sideOk.bad.join(',') || '无'}`);

  await page.click('#autoBtn');
  await page.waitForTimeout(3200);
  check('机械策略产生足够样本', parseInt(await page.locator('#fillCount').textContent()) >= 20,
    await page.locator('#fillCount').textContent());
  await shot(page, '04-replay-auto');

  /* ── 交易分析 / 能力评估 ── */
  console.log('\n▌交易分析与能力评估');
  await page.click('#endBtn');
  await page.waitForTimeout(900);
  check('结束本轮进入交易分析', page.url().includes('app/analysis'));
  check('权益曲线已渲染', await page.locator('#v-analysis svg polyline').first().isVisible());
  check('多空/时段/持仓时长归因都有输出', (await page.locator('#v-analysis .brow').count()) >= 5);
  await shot(page, '05-analysis');

  await page.click('.rail a[data-v="eval"]');
  await page.waitForTimeout(5200);
  const verdict = await page.locator('.verdict p').first().textContent();
  const pv = /p=([0-9.]+)/.exec(verdict);
  check('生成了结论', verdict.length > 10, verdict.slice(0, 50) + '…');
  check('p 值在合法区间', pv && +pv[1] > 0 && +pv[1] <= 1, pv ? `p=${pv[1]}` : '未找到');
  check('四个维度都有输出', (await page.locator('#evalBody table.dt tbody tr').count()) >= 4);
  check('局限声明随报告下发', (await page.locator('#evalBody ol.cav li').count()) >= 3);
  await shot(page, '06-eval');

  /* ── 双盲 ── */
  console.log('\n▌双盲测试');
  await page.click('.rail a[data-v="blind"]');
  await page.waitForTimeout(1300);
  check('品种与日期已打码', (await page.locator('#bMask').textContent()).includes('██'));
  let sawDate = false, consistent = 0, checked = 0;
  for (let i = 0; i < 6; i++) {
    await page.locator(`#v-blind .act[data-a="${i % 3 === 2 ? -1 : 1}"]`).click();
    await page.waitForTimeout(620);
    const rv = (await page.locator('#bReveal').textContent()).replace(/\s+/g, ' ');
    if (/\d{4}-\d{2}-\d{2}/.test(rv)) sawDate = true;
    const m = /实际\s*([+-][\d.]+)%/.exec(rv);
    const ok = /正确\s*✓/.test(rv), bad = /错误\s*✗/.test(rv);
    if (m && (ok || bad)) { checked++; if ((Math.sign(parseFloat(m[1])) === (i % 3 === 2 ? -1 : 1)) === ok) consistent++; }
    if (i === 0) await shot(page, '07-blind');
    await page.waitForTimeout(1000);
  }
  check('揭晓真实品种与日期', sawDate);
  check('每题判定与真实涨跌幅严格一致（非随机数）', checked >= 5 && consistent === checked, `${consistent}/${checked}`);

  /* ── 相似行情 ── */
  console.log('\n▌相似行情');
  await page.click('.rail a[data-v="similar"]');
  await page.waitForTimeout(1300);
  await page.click('#simGo');
  await page.waitForTimeout(4200);
  check('返回了相似片段', (await page.locator('.simcard').count()) >= 8);
  const simText = await page.locator('#simOut').textContent();
  check('输出条件分布而非方向结论',
    simText.includes('上涨占比') && simText.includes('5% 分位') && !/建议(买|卖)|后市看/.test(simText));
  check('检索跨品种', (await page.evaluate(() =>
    new Set([...document.querySelectorAll('.simcard')].map(e => e.dataset.sym)).size)) >= 2);
  await shot(page, '08-similar');

  /* ── 全局助手 ── */
  console.log('\n▌全局智能助手');
  await page.goto(FILE + '#home');
  await page.waitForTimeout(1000);
  check('悬浮球在官网页也存在', await page.locator('#fab').isVisible());
  await page.click('#fab');
  await page.waitForTimeout(500);
  check('官网页也能呼出助手', await page.locator('#drawer.on').isVisible());
  check('欢迎语与建议问题已渲染', (await page.locator('#chatBody .sug').count()) >= 4);
  await shot(page, '09-chat-on-home');

  await page.fill('#chatText', '标普500 2008年 跌幅超过5% 的交易日');
  await page.click('#sendBtn');
  await page.waitForTimeout(1300);
  let last = await page.locator('#chatBody .msg.ai .bubble').last().textContent();
  check('智能问数返回查询结构', last.includes('SELECT') && last.includes('SPX'));
  check('返回真实数据行',
    (await page.locator('#chatBody .msg.ai').last().locator('table.dt tbody tr').count()) > 0);
  check('结果日期落在 2008 年',
    (await page.locator('#chatBody .msg.ai').last().locator('table.dt tbody tr td').first().textContent()).startsWith('2008'));

  await page.fill('#chatText', '帮我推荐几只能涨的股票');
  await page.click('#sendBtn');
  await page.waitForTimeout(900);
  last = await page.locator('#chatBody .msg.ai .bubble').last().textContent();
  check('无法解析时诚实拒答', last.includes('没能翻译') && !last.includes('SELECT'));

  // Esc 与 Ctrl+K
  await page.keyboard.press('Escape');
  await page.waitForTimeout(350);
  check('Esc 关闭助手', !(await page.locator('#drawer').evaluate(e => e.classList.contains('on'))));
  await page.keyboard.press('Control+k');
  await page.waitForTimeout(350);
  check('Ctrl+K 呼出助手', await page.locator('#drawer').evaluate(e => e.classList.contains('on')));

  /* ── 文件上传：真解析 ── */
  console.log('\n▌文件上传（真解析）');
  const csvPath = join(TMP, 'trades.csv');
  writeFileSync(csvPath, ['开仓日期,平仓日期,方向,手数',
    ...Array.from({ length: 24 }, (_, i) => {
      const d1 = new Date(Date.UTC(2005 + (i % 10), (i * 3) % 12, 5 + (i % 20)));
      const d2 = new Date(d1.getTime() + 20 * 86400000);
      return `${d1.toISOString().slice(0, 10)},${d2.toISOString().slice(0, 10)},${i % 3 ? '做多' : '做空'},${1 + (i % 3)}`;
    })].join('\n'));
  await page.setInputFiles('#fileInput', csvPath);
  await page.waitForTimeout(800);
  check('CSV 附件被识别为交易记录',
    (await page.locator('#chatHint').textContent()).includes('笔交易'),
    await page.locator('#chatHint').textContent());
  await page.click('#sendBtn');
  await page.waitForTimeout(6500);
  let chatAll = (await page.locator('#chatBody').textContent()).replace(/\s+/g, ' ');
  check('CSV 交易记录真的进了评估引擎', /解析出 24 笔交易/.test(chatAll),
    /解析出[^，。]*/.exec(chatAll)?.[0] || '未匹配');
  check('随后给出了统计结论', /运气解释|分位|样本/.test(chatAll));
  await shot(page, '10-chat-csv');

  const xlsxPath = join(TMP, 'trades.xlsx');
  writeFileSync(xlsxPath, await makeZip({
    'xl/sharedStrings.xml': `<?xml version="1.0"?><sst><si><t>entry</t></si><si><t>exit</t></si><si><t>dir</t></si><si><t>size</t></si></sst>`,
    'xl/worksheets/sheet1.xml': `<?xml version="1.0"?><worksheet><sheetData>
      <row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c><c r="D1" t="s"><v>3</v></c></row>
      ${Array.from({ length: 22 }, (_, i) => `<row r="${i + 2}"><c r="A${i + 2}"><v>${200 + i * 40}</v></c><c r="B${i + 2}"><v>${218 + i * 40}</v></c><c r="C${i + 2}"><v>${i % 3 ? 1 : -1}</v></c><c r="D${i + 2}"><v>${1 + i % 3}</v></c></row>`).join('')}
      </sheetData></worksheet>`,
  }));
  await page.setInputFiles('#fileInput', xlsxPath);
  await page.waitForTimeout(900);
  check('XLSX 被真的解开并识别成交易记录',
    (await page.locator('#chatHint').textContent()).includes('笔交易'),
    await page.locator('#chatHint').textContent());
  await page.click('#sendBtn');
  await page.waitForTimeout(6500);
  chatAll = (await page.locator('#chatBody').textContent()).replace(/\s+/g, ' ');
  check('XLSX 记录进入评估引擎', /解析出 22 笔交易/.test(chatAll),
    /解析出 \d+ 笔交易/.exec(chatAll)?.[0] || '未匹配');

  const pdfPath = join(TMP, 'note.pdf');
  writeFileSync(pdfPath, await makePdf('AlphaGym trade journal 2008 review'));
  await page.setInputFiles('#fileInput', pdfPath);
  await page.waitForTimeout(900);
  await page.click('#sendBtn');
  await page.waitForTimeout(1300);
  last = await page.locator('#chatBody .msg.ai .bubble').last().textContent();
  check('PDF 文本被真的提取出来', last.includes('AlphaGym trade journal'),
    last.replace(/\s+/g, ' ').slice(0, 70));
  await shot(page, '11-chat-files');

  /* ── 语音 ── */
  console.log('\n▌语音输入');
  const env = await page.evaluate(() => ({
    secure: window.isSecureContext,
    sr: !!(window.SpeechRecognition || window.webkitSpeechRecognition),
    mic: !!navigator.mediaDevices?.getUserMedia,
  }));
  check('页面处于安全上下文，麦克风 API 可用', env.secure && env.mic,
    `secure=${env.secure} mediaDevices=${env.mic} SpeechRecognition=${env.sr}`);
  await page.click('#micBtn');
  await page.waitForTimeout(1500);
  const recOn = await page.locator('#micBtn').evaluate(e => e.classList.contains('rec'));
  check('点击麦克风真的开始采集音频', recOn, `录音态=${recOn}`);
  check('录音时显示实时音量指示（来自真实音频流）', (await page.locator('.vumeter').count()) > 0);
  // 强断言：不看「有没有元素」，看采样循环是不是真的在从音频流里读数据。
  // frames 由 requestAnimationFrame 里每次 getByteTimeDomainData 之后 +1。
  const meter = await page.evaluate(async () => {
    const m = document.querySelector('.vumeter');
    if (!m) return null;
    const bars = [...m.querySelectorAll('i')];
    const f0 = +m.dataset.frames || 0, h0 = bars.map(b => b.style.height).join(',');
    await new Promise(r => setTimeout(r, 700));
    return { df: (+m.dataset.frames || 0) - f0, moved: bars.map(b => b.style.height).join(',') !== h0 };
  });
  check('音量条随音频流刷新', !!meter && meter.df > 10 && meter.moved,
    meter ? `700ms 内采样 ${meter.df} 帧，波形有变化=${meter.moved}` : '没有音量条');
  await shot(page, '12-chat-voice');
  await page.click('#micBtn');
  await page.waitForTimeout(400);
  check('再点一次停止录音', !(await page.locator('#micBtn').evaluate(e => e.classList.contains('rec'))));

  /* ── 主题与响应式 ── */
  console.log('\n▌主题与响应式');
  await page.click('#dClose');
  await page.click('#themeBtn');
  await page.waitForTimeout(600);
  check('深色主题生效', (await page.locator('html').getAttribute('data-theme')) === 'dark');
  await page.goto(FILE + '#app/replay');
  await page.waitForTimeout(1500);
  check('深色下主图仍有内容', (await inkOf(page, '#chart'))[0].ink > 100);
  await shot(page, '13-replay-dark');
  await page.goto(FILE + '#home');
  await page.waitForTimeout(1300);
  await shot(page, '14-home-dark');

  await page.setViewportSize({ width: 430, height: 900 });
  await page.waitForTimeout(900);
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check('移动端无横向溢出', overflow <= 2, `溢出 ${overflow}px`);
  check('移动端悬浮球仍可见', await page.locator('#fab').isVisible());
  await shot(page, '15-mobile');

  await browser.close();
  server.close();

  console.log('\n' + '─'.repeat(62));
  if (errors.length) {
    console.log(`❌ 捕获 ${errors.length} 条页面错误：`);
    [...new Set(errors)].slice(0, 10).forEach(e => console.log('   ' + e.slice(0, 190)));
    fails += errors.length;
  } else console.log('✅ 无 console error / pageerror');
  console.log(fails === 0 ? `✅ 冒烟测试全部通过（${passes} 项）` : `❌ ${fails} 项失败 / ${passes} 项通过`);
  process.exit(fails === 0 ? 0 : 1);
};

run().catch(e => { console.error('测试崩溃:', e); process.exit(1); });
