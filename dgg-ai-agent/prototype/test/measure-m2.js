// 打印模拟下逐页量高，找 A4 溢出（A4 内容区高度：297 - 20mm 页边距 = 277mm）
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const url = 'file://' + path.join(__dirname, '..', 'dist', 'index.html');
const ex = path.join(__dirname, '..', '..', 'skills', '02-scene-ranking', 'examples');
const SAMPLE = process.argv[2] || 'S1';
const S1 = JSON.parse(fs.readFileSync(path.join(ex, SAMPLE + '.input.json'), 'utf8'));
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 794, height: 1123 } }); // A4 @96dpi
  await page.goto(url + '?station=3');
  await page.click('.card[data-id="m2"]'); await page.waitForSelector('.form-grid');
  await page.click('.rail .link'); await page.click(`.rail .menu button:nth-child(${Number(SAMPLE.slice(1))})`);
  await page.click('button:has-text("下一步：选痛点")'); await page.waitForSelector('.pain-wrap');
  for (const p of S1.pains) { await page.click(`.pitem[data-id="${p.id}"] .t`); await page.click(`.pitem[data-id="${p.id}"] .dots button[data-sev="${p.severity}"]`); }
  await page.click('button:has-text("下一步：现状与目标")'); await page.waitForSelector('.cond-grid');
  for (const [k, v] of Object.entries(S1.conditions)) await page.click(`.cond .opts button[data-k="${k}"][data-v="${v}"]`);
  await page.click('button:has-text("生成场景排序")'); await page.waitForSelector('.rank-tbl tbody tr');
  await page.click('button:has-text("出具完整报告")'); await page.waitForSelector('.report .page[data-page="1"]');
  await page.waitForTimeout(600);
  await page.emulateMedia({ media: 'print' });
  const LIMIT = Math.round((297 - 20) * 96 / 25.4);
  const rows = await page.evaluate((LIMIT) => [...document.querySelectorAll('.report .page')].map((el) => {
    const hd = el.querySelector('.m2-head') || el.querySelector('.page-head');
    const h = Math.round(el.getBoundingClientRect().height);
    return { n: el.getAttribute('data-page'), h, over: h > LIMIT,
      ch: hd ? hd.querySelector('.ch').textContent.trim() : (el.classList.contains('m2-front') ? '封面' : '封底') };
  }), LIMIT);
  console.log(SAMPLE + ' · A4 可打印高度 ≈ ' + LIMIT + 'px');
  await browser.close();
  const over = rows.filter((r) => r.over);
  rows.forEach((r) => { if (r.over) console.log(`  ✘ p${String(r.n).padStart(2, '0')} ${r.h}px  +${r.h - LIMIT}  ${r.ch}`); });
  console.log(`逐页量高：${rows.length} 页，溢出 ${over.length} 页，最高 ${Math.max(...rows.map((r) => r.h))}px`);
  process.exitCode = over.length ? 1 : 0;
})();
