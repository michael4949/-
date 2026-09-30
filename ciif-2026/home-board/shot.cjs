// node shot.cjs → 三种视口截图，并检查卡片是否落在底图画好的卡片上
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch();
  for (const [name, w, h] of [['tv', 1920, 1080], ['arc', 2000, 1142], ['laptop', 1440, 900]]) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('file://' + path.join(__dirname, 'index.html')); await p.waitForTimeout(6500);
    const r = await p.evaluate(() => {
      const st = document.getElementById('stage').getBoundingClientRect();
      const img = document.querySelector('#stage img.bg').getBoundingClientRect();
      const c = [...document.querySelectorAll('.card')].map(e => { const b = e.getBoundingClientRect(); return [Math.round(b.left - st.left), Math.round(b.top - st.top), Math.round(b.width), Math.round(b.height)]; });
      return { stage: [Math.round(st.left), Math.round(st.width), Math.round(st.height)], img: [Math.round(img.width), Math.round(img.height)], firstCard: c[0], lastCard: c[8], overflow: [...document.querySelectorAll('.card')].filter(e => e.scrollWidth > e.clientWidth + 1).length };
    });
    console.log(name, JSON.stringify(r), errs.length ? errs : '');
    await p.screenshot({ path: `shot-${name}.png` }); await p.close();
  }
  await b.close();
})();
