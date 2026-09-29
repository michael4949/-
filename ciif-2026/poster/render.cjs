// 渲染海报示意稿：node render.cjs  →  poster-preview.png（1200×3000）
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 800, height: 2000 }, deviceScaleFactor: 1.5 });
  await page.goto('file://' + path.join(__dirname, 'poster.html'));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);
  const overflow = await page.evaluate(() => [...document.querySelectorAll('.card,.start,.trust div,.extra div')]
    .filter(e => e.scrollHeight > e.clientHeight + 1 || e.scrollWidth > e.clientWidth + 1)
    .map(e => (e.className || e.tagName) + ': ' + e.textContent.trim().slice(0, 20)));
  console.log('overflow:', overflow.length ? overflow : 'none');
  console.log('fonts:', await page.evaluate(() => [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family).slice(0, 3)));
  await page.screenshot({ path: path.join(__dirname, 'poster-preview.png'), fullPage: false });
  await browser.close();
})();
