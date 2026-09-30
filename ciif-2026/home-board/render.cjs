// node render.cjs → home-board.png（2000×1125）
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 2000, height: 1125 }, deviceScaleFactor: 1 });
  await p.goto('file://' + path.join(__dirname, 'home-board.html'));
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(800);
  const o = await p.evaluate(() => [...document.querySelectorAll('.card,.meth .c,.card .t')].filter(e => e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1).map(e => e.textContent.trim().slice(0, 14)));
  console.log('overflow:', o.length ? o : 'none');
  await p.screenshot({ path: path.join(__dirname, 'home-board.png') });
  await b.close();
})();
