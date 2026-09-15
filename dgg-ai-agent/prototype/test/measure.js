// 打印模拟下量每一页高度，找出超过 A4 可打印高度的页
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const url = 'file://' + path.join(__dirname, '..', 'dist', 'index.html');
const S1 = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'skills', '01-ai-maturity', 'examples', 'S1.input.json'), 'utf8'));
(async () => {
  const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 794, height: 1123 } }); // A4 @96dpi
  await page.goto(url + '?station=3'); await page.click('.card[data-id="m1"]'); await page.waitForSelector('.form-grid');
  await page.click('.rail .link'); await page.click('.rail .menu button:first-child'); await page.click('button:has-text("开始评估")');
  for (const a of S1.answers) { await page.click(`.opt >> nth=${a}`); await page.waitForTimeout(200); }
  await page.waitForSelector('.report .page[data-page="1"]'); await page.waitForTimeout(300);
  await page.emulateMedia({ media: 'print' });
  const LIMIT = Math.round((297 - 20) * 96 / 25.4); // 可打印高度 px（上下各 10mm）
  const rows = await page.evaluate(() => [...document.querySelectorAll('.report .page')].map((p) => ({ n: p.dataset.page, ch: p.querySelector('.page-head') ? p.querySelector('.page-head').textContent.split('企业AI')[0].trim() : (p.classList.contains('cover') ? '封面' : '封底'), h: Math.round(p.getBoundingClientRect().height) })));
  console.log('A4 可打印高度 ≈ ' + LIMIT + 'px');
  rows.forEach((r) => console.log(`${r.h > LIMIT ? '✘' : ' '} p${String(r.n).padStart(2, '0')} ${String(r.h).padStart(5)}px  ${r.h > LIMIT ? '+' + (r.h - LIMIT) : ''}  ${r.ch}`));
  await b.close();
})();
