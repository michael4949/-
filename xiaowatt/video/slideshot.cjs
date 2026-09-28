const { chromium } = require('/home/user/-/node_modules/playwright');
const path = require('path');
(async () => {
  const br = await chromium.launch(); const pg = await (await br.newContext({ viewport: { width: 1440, height: 810 } })).newPage();
  for (const [f, js] of [['title', ''], ['bg', 'show(0);show(1);show(2)'], ['arch', 'reveal()'], ['end', 'show(0);show(1)']]) {
    await pg.goto('file://' + path.resolve(__dirname, 'slides', f + '.html')); await pg.waitForTimeout(300);
    if (js) await pg.evaluate(js); await pg.waitForTimeout(4500);
    await pg.screenshot({ path: path.join(__dirname, 'out', 'slide_' + f + '.png') });
  }
  await br.close();
})();
