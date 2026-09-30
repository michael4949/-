// node shot.cjs → shot-1.png(入场中) shot-2.png(数字到位) shot-3.png(轮巡点亮)，1920×1080
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const errs=[]; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
  await p.goto('file://' + path.join(__dirname, 'index.html')); await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(350); await p.screenshot({ path: 'shot-1.png' });
  await p.waitForTimeout(1900); await p.screenshot({ path: 'shot-2.png' });
  await p.waitForTimeout(4200); await p.screenshot({ path: 'shot-3.png' });
  console.log('errors:', errs.length ? errs : 'none'); await b.close();
})();
