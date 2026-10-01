// 页面底部检查：模块框架是否铺到底、是否还有重叠的引导条；预约表单走一遍
const { chromium } = require('playwright'); const path = require('path');
const S = '/tmp/claude-0/-home-user--/8b9fdfb0-e553-527d-8570-16ed7f7d062d/scratchpad/';
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const [w, hgt] of [[2000, 1142], [1920, 1080], [1440, 900]]) {
    const p = await b.newPage({ viewport: { width: w, height: hgt } }); p.on('pageerror', e => errs.push(e.message));
    for (const r of ['m2', 'm3', 'm3/scenes', 'm4', 'm6', 'm10', 'm5', 'm8', 'm9', 'm7']) {
      await p.goto('file://' + path.join(__dirname, '..', 'dist', 'index.html') + '#/' + r); await p.waitForTimeout(900);
      const x = await p.evaluate(() => {
        const a = document.querySelector('.pd-app'); const ab = a && a.getBoundingClientRect();
        return { gap: a ? Math.round(innerHeight - ab.bottom) : null, stickyBars: [...document.querySelectorAll('.main > .pd-next')].length, bars: document.querySelectorAll('.pd-next').length };
      });
      console.log(w + 'x' + hgt, r.padEnd(10), JSON.stringify(x));
      if (w === 2000 && ['m3/scenes', 'm10'].includes(r)) await p.screenshot({ path: S + 'fix-' + r.replace('/', '-') + '.png', clip: { x: 0, y: 860, width: 2000, height: 282 } });
    }
    await p.close();
  }
  const p = await b.newPage({ viewport: { width: 2000, height: 1142 } }); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.join(__dirname, '..', 'dist', 'index.html') + '#/m6'); await p.waitForTimeout(900);
  await p.screenshot({ path: S + 'fix-rail.png', clip: { x: 1630, y: 90, width: 370, height: 600 } });
  await p.click('.rail .btn.lead'); await p.waitForTimeout(300);
  await p.click('.lf-mode .opt:nth-child(2)'); await p.click('.lf-when .pill:nth-child(2)');
  await p.screenshot({ path: S + 'fix-form.png' });
  await p.fill('.lf input[type=text]', '常州某汽配有限公司'); await p.fill('.lf input[type=tel]', '13900000000'); await p.check('.lf-agree input'); await p.click('.lf button[type=submit]'); await p.waitForTimeout(300);
  console.log('done:', await p.evaluate(() => document.querySelector('.lf-done').innerText.replace(/\s+/g, ' ').slice(0, 90)));
  console.log('rec:', await p.evaluate(() => JSON.stringify(JSON.parse(localStorage.getItem('dgg.ciif2026.leads')).slice(-1)[0])));
  await p.click('.lf-done .btn'); await p.waitForTimeout(200);
  console.log('rail:', await p.evaluate(() => document.querySelector('.rail .btn.lead').innerText.replace(/\s+/g, ' ') + ' | ' + document.querySelector('.rail .lead-cnt').innerText));
  await p.goto('file://' + path.join(__dirname, '..', 'dist', 'index.html') + '#/m2/board'); await p.waitForTimeout(400);
  console.log('ERRORS', errs.length, errs.slice(0, 3)); await b.close();
})();
