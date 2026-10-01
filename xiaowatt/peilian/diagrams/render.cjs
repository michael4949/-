/* 架构图渲染：node render.cjs → out/*.png（2 倍分辨率）。改图改同目录 html，再跑一次 */
const { chromium } = require(process.env.PW || '/home/user/-/node_modules/playwright');
const path = require('path');
(async () => {
  const br = await chromium.launch(); const pg = await (await br.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 })).newPage();
  for (const [f, name] of [['arch', '安全学习智能陪练_总体架构'], ['ability', '安全学习智能陪练_能力体系与成长闭环'], ['pipeline', '安全学习智能陪练_内容生产线']]) {
    await pg.goto('file://' + path.join(__dirname, f + '.html')); await pg.waitForTimeout(500);
    await (await pg.$('#board')).screenshot({ path: path.join(__dirname, 'out', name + '.png') });
    console.log('ok', name);
  }
  await br.close();
})();
