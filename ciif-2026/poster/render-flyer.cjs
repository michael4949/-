// 渲染单页背面修改稿：node render-flyer.cjs → flyer-back.png（A4，约 288dpi）
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 3 });
  await p.goto('file://' + path.join(__dirname, 'flyer-back.html'));
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(800);
  const o = await p.evaluate(() => [...document.querySelectorAll('.card,.pill,.kpi div')].filter(e => e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1).map(e => e.textContent.trim().slice(0, 16)));
  console.log('overflow:', o.length ? o : 'none');
  await p.screenshot({ path: path.join(__dirname, 'flyer-back.png') });
  await b.close();
})();
