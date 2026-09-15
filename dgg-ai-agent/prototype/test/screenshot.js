// 用 Chromium 走一遍模块 1：首页 → 企业画像 → 36 题 → 30 页报告；横屏 / 竖屏 / 打印（速览 + 完整）各截图
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const url = 'file://' + path.join(__dirname, '..', 'dist', 'index.html');
const out = path.join(__dirname, 'shots'); fs.mkdirSync(out, { recursive: true });
const S1 = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'skills', '01-ai-maturity', 'examples', 'S1.input.json'), 'utf8'));
const golden = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'skills', '01-ai-maturity', 'examples', 'S1.output.json'), 'utf8'));
const errors = [];

async function runFlow(page, tag) {
  page.on('pageerror', (e) => errors.push(tag.name + ': ' + e.message));
  await page.goto(url + '?station=' + tag.station);
  await page.waitForSelector('.grid, .form-grid');
  await page.screenshot({ path: `${out}/${tag.name}-1-landing.png` });
  if (tag.station !== '1') { await page.click('.card[data-id="m1"]'); await page.waitForSelector('.form-grid'); }
  await page.click('.rail .link'); await page.click('.rail .menu button:first-child'); await page.waitForTimeout(200);
  await page.screenshot({ path: `${out}/${tag.name}-2-input.png` });
  await page.click('button:has-text("开始评估")');
  await page.waitForSelector('.quiz');
  await page.screenshot({ path: `${out}/${tag.name}-3-quiz.png` });
  for (const a of S1.answers) { await page.click(`.opt >> nth=${a}`); await page.waitForTimeout(200); }
  await page.waitForSelector('.report .page[data-page="1"]');
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${out}/${tag.name}-4-report-top.png` });
  const info = await page.evaluate(() => ({
    pages: document.querySelectorAll('.report .page').length,
    level: document.querySelector('.cover .badge .code').textContent + ' ' + document.querySelector('.cover .badge .lname').textContent,
    pct: document.querySelector('.cover .lv .big').firstChild.textContent,
    top3: [...document.querySelectorAll('.acts-mini .act-card .t')].map((t) => t.textContent.trim()),
    spent: document.getElementById('cr-spent').textContent, left: document.getElementById('cr-left').textContent,
    tocCount: document.querySelectorAll('#toc-list li').length
  }));
  return info;
}
async function shootPages(page, list, prefix) {
  for (const n of list) {
    const el = page.locator(`.report .page[data-page="${n}"]`);
    await el.scrollIntoViewIfNeeded(); await page.waitForTimeout(120);
    await el.screenshot({ path: `${out}/${prefix}-p${String(n).padStart(2, '0')}.png` });
  }
}
function pdfPages(file) { const d = fs.readFileSync(file); return (d.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length; }

(async () => {
  const browser = await chromium.launch();
  let page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const land = await runFlow(page, { name: 'land', station: '3' });
  await shootPages(page, [1, 3, 4, 5, 6, 7, 8, 9, 10, 21, 22, 23, 25, 26, 27, 28, 31], 'land');
  await page.emulateMedia({ media: 'print' });
  await page.pdf({ path: `${out}/land-print-full.pdf`, format: 'A4', printBackground: true, margin: { top: '10mm', bottom: '10mm', left: '12mm', right: '12mm' } });
  await page.evaluate(() => document.body.classList.add('print-brief'));
  await page.pdf({ path: `${out}/land-print-brief.pdf`, format: 'A4', printBackground: true, margin: { top: '10mm', bottom: '10mm', left: '12mm', right: '12mm' } });
  await page.evaluate(() => document.body.classList.remove('print-brief'));
  await page.emulateMedia({ media: 'screen' });
  await page.close();
  page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const port = await runFlow(page, { name: 'port', station: '1' });
  await shootPages(page, [3, 22], 'port');
  await page.close();
  await browser.close();

  console.log('屏上（横屏）:', JSON.stringify(land));
  console.log('内核 golden : ', golden.level.code, golden.level.name, golden.pct + '%', golden.actions.slice(0, 3).map((a) => a.title));
  const ok = land.level === golden.level.code + ' ' + golden.level.name && land.pct === golden.pct + '%' && land.top3.every((t, i) => t === golden.actions[i].title) && land.spent === '20' && land.left === '9,980';
  console.log(ok ? '✔ 屏幕与内核一致' : '✘ 不一致');
  console.log('报告页数（屏）:', land.pages, '| 竖屏页数:', port.pages, '| 目录条目:', land.tocCount);
  console.log('PDF 页数：完整', pdfPages(`${out}/land-print-full.pdf`), '· 速览', pdfPages(`${out}/land-print-brief.pdf`));
  if (errors.length) { console.log('JS 错误:'); errors.forEach((e) => console.log('  ' + e)); }
  process.exitCode = ok && !errors.length ? 0 : 1;
})();
