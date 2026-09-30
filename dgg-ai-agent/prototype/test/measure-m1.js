// 模块 1：打印模拟下逐页量高，找 A4 溢出
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const url = 'file://' + path.join(__dirname, '..', 'dist', 'index.html');
const SAMPLE = process.argv[2] || 'S1';
const S1 = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'skills', '01-ai-maturity', 'examples', SAMPLE + '.input.json'), 'utf8'));
(async () => {
  const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 703, height: 1123 } });
  await page.goto(url + '?station=3'); await page.click('.card[data-id="m1"]'); await page.waitForSelector('.form-grid');
  await page.click('.rail .link'); await page.click(`.rail .menu button:nth-child(${Number(SAMPLE.slice(1))})`);
  await page.click('button:has-text("开始评估")'); await page.waitForSelector('.quiz');
  for (const a of S1.answers) { await page.click(`.opt >> nth=${a}`); await page.waitForTimeout(200); }
  await page.waitForSelector('.report .page[data-page="1"]'); await page.waitForTimeout(500);
  await page.emulateMedia({ media: 'print' });
  const LIMIT = Math.round((297 - 20) * 96 / 25.4);
  const rows = await page.evaluate((LIMIT) => [...document.querySelectorAll('.report .page')].map((el) => {
    const hd = el.querySelector('.m1-head');
    const h = Math.round(el.getBoundingClientRect().height);
    return { n: el.getAttribute('data-page'), h, over: h > LIMIT, ch: hd ? hd.querySelector('.ch').textContent.trim() : (el.classList.contains('m1-front') ? '封面' : '封底') };
  }), LIMIT);
  await b.close();
  console.log(SAMPLE + ' · A4 可打印高度 ≈ ' + LIMIT + 'px');
  const over = rows.filter((r) => r.over);
  rows.forEach((r) => { if (r.over) console.log(`  ✘ p${String(r.n).padStart(2, '0')} ${r.h}px  +${r.h - LIMIT}  ${r.ch}`); });
  console.log(`逐页量高：${rows.length} 页，溢出 ${over.length} 页，最高 ${Math.max(...rows.map((r) => r.h))}px`);
  process.exitCode = over.length ? 1 : 0;
})();
