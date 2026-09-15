// 用 Chromium 把集团 logo 缩到 520px 宽，作为内联资源
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
(async () => {
  const src = process.argv[2], dst = process.argv[3], w = +(process.argv[4] || 520);
  const b64 = fs.readFileSync(src).toString('base64');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const out = await page.evaluate(async ({ b64, w }) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + b64;
    await img.decode();
    const h = Math.round(img.height * w / img.width);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    c.getContext('2d').drawImage(img, 0, 0, w, h);
    return c.toDataURL('image/png');
  }, { b64, w });
  fs.writeFileSync(dst, Buffer.from(out.split(',')[1], 'base64'));
  await browser.close();
  console.log('wrote', dst, fs.statSync(dst).size, 'bytes');
})();
