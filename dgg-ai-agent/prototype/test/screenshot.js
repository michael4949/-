// 用 Chromium 走一遍模块 1：首页 → 输入 → 12 题 → 结果；横屏 / 竖屏 / 打印 各截一张
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const url = 'file://' + path.join(__dirname, '..', 'dist', 'index.html');
const out = path.join(__dirname, 'shots'); fs.mkdirSync(out, { recursive: true });
const S1 = [2, 1, 3, 2, 2, 1, 1, 1, 2, 2, 1, 0]; // 与 skills/01-ai-maturity/examples/S1.input.json 一致

async function runFlow(page, tag, answers) {
  await page.goto(url + '?station=' + tag.station);
  await page.waitForSelector('.grid, .form-wrap');
  await page.screenshot({ path: `${out}/${tag.name}-1-landing.png` });
  if (tag.station !== '1') { await page.click('.card[data-id="m1"]'); await page.waitForSelector('.form-wrap'); }
  // 选样例企业 S1（右栏「切换」）
  await page.click('.rail .link'); await page.click('.rail .menu button:first-child');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${out}/${tag.name}-2-input.png` });
  await page.click('button:has-text("开始评估")');
  await page.waitForSelector('.quiz');
  await page.screenshot({ path: `${out}/${tag.name}-3-quiz.png` });
  for (const a of answers) { await page.click(`.opt >> nth=${a}`); await page.waitForTimeout(220); }
  await page.waitForSelector('.result');
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${out}/${tag.name}-4-result.png` });
  // 屏上的数字 vs 内核 golden 输出
  const onScreen = await page.evaluate(() => ({
    level: document.querySelector('.level .code').textContent + ' ' + document.querySelector('.level .lname').textContent,
    total: document.querySelector('.level .total').textContent.replace(/\s/g, ''),
    dims: [...document.querySelectorAll('.dim-table tr')].map((tr) => [...tr.children].map((td) => td.textContent.trim()).join('|')),
    actions: [...document.querySelectorAll('.act .t')].map((t) => t.textContent.trim()),
    spent: document.getElementById('cr-spent').textContent, left: document.getElementById('cr-left').textContent
  }));
  return onScreen;
}
(async () => {
  const browser = await chromium.launch();
  // 横屏 1920×1080（station=3）
  let page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const land = await runFlow(page, { name: 'land', station: '3' }, S1);
  await page.emulateMedia({ media: 'print' });
  await page.pdf({ path: `${out}/land-5-print.pdf`, format: 'A4', printBackground: true });
  await page.emulateMedia({ media: 'screen' });
  // 待机页
  const qrOk = await page.evaluate(() => !!document.querySelector('.rail .qr svg'));
  await page.evaluate(() => { window.DGG_CONFIG.idle.resultMs = 1; document.dispatchEvent(new Event('pointerdown')); });
  await page.waitForTimeout(2200);
  const idleShown = await page.evaluate(() => !document.getElementById('idle').classList.contains('hidden'));
  await page.screenshot({ path: `${out}/land-6-idle.png` });
  await page.mouse.click(960, 540); await page.waitForTimeout(300);
  const afterIdle = await page.evaluate(() => ({ hash: location.hash, left: document.getElementById('cr-left').textContent, company: document.querySelector('.rail .company-name').textContent }));
  console.log('二维码渲染:', qrOk, '| 待机页出现:', idleShown, '| 退出待机后:', JSON.stringify(afterIdle));
  await page.close();
  // 竖屏 1080×1920（station=1）
  page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const port = await runFlow(page, { name: 'port', station: '1' }, S1);
  await page.close();
  await browser.close();
  const golden = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'skills', '01-ai-maturity', 'examples', 'S1.output.json'), 'utf8'));
  console.log('屏上（横屏）:', JSON.stringify(land, null, 1));
  console.log('内核 golden : level', golden.level.code, golden.level.name, '| total', golden.total, '| actions', golden.actions.map((a) => a.dimensionName + a.title));
  const ok = land.level === golden.level.code + ' ' + golden.level.name && land.total.startsWith(String(golden.total)) && land.actions.every((t, i) => t.includes(golden.actions[i].title)) && land.spent === '20' && land.left === '9,980';
  console.log(ok ? '✔ 屏幕与内核一致' : '✘ 不一致');
  console.log('竖屏 level:', port.level, port.total);
  process.exitCode = ok ? 0 : 1;
})();
