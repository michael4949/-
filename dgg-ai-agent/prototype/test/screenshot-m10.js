// AI ERP 六屏走查：接入 → 指挥室（扣积分）→ 订单下钻（执行处置）→ 插单模拟（三方案 → 落单）→ 物料与库存（生成采购单）→ 交付日报（发送）
// 全部走真实界面；每屏截图；扫禁词；核对界面数字与内核一致
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const url = 'file://' + (process.env.HTML || path.join(__dirname, '..', 'dist', 'index.html'));
const out = path.join(__dirname, process.env.OUT || 'shots-m10'); fs.mkdirSync(out, { recursive: true });
const core = require('../../skills/10-ai-erp/core/sim.js');
const data = require('../../skills/10-ai-erp/scripts/load-data.js')();
const lint = require('../../skills/_shared/lint.js')(data.lintWords);
const errors = [];
const W = +(process.env.W || 1920), H = +(process.env.H || 1080);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  const shot = (n) => page.screenshot({ path: `${out}/${n}.png` });
  const lintScreen = async (n) => { const t = await page.$eval('.pd-app', (e) => e.innerText); const hits = lint.hard(t); if (hits.length) errors.push(n + ' 禁词: ' + hits.join(',')); };
  const text = (sel) => page.$eval(sel, (e) => e.innerText.trim());

  await page.goto(url + '?station=3');
  await page.waitForSelector('.grid');
  await page.click('.card[data-id="m10"]');
  await page.waitForSelector('.pd-app');

  // 屏 1 接入
  await page.waitForSelector('.m10-connect');
  await shot('1-connect'); await lintScreen('接入');
  const nameVal = await page.$eval('.m10-connect input[type=text]', (e) => e.value);
  if (!nameVal) errors.push('企业名称为空');
  const spent0 = await text('#cr-spent');
  await page.click('.m10-connect .go .pd-btn.primary');

  // 屏 2 指挥室
  await page.waitForSelector('.pd-kpis');
  await page.waitForTimeout(900);
  await shot('2-room'); await lintScreen('指挥室');
  const spent1 = await text('#cr-spent');
  if (spent0 !== '0' || spent1 !== '100') errors.push('积分扣减异常 ' + spent0 + ' → ' + spent1);
  const S = core.schedule(data.samples.make);
  const kpiOpen = await page.$eval('.pd-kpis .pd-kpi:first-child .v', (e) => parseInt(e.textContent, 10));
  if (kpiOpen !== S.kpi.open) errors.push('在手订单 KPI 与内核不一致 ' + kpiOpen + ' vs ' + S.kpi.open);
  const rowCount = await page.$$eval('.c8 .pd-table tbody tr', (r) => r.length);
  // 点延期筛选 → 行数应等于延期数
  await page.click('.pd-kpis .pd-kpi:nth-child(3)');
  await page.waitForTimeout(200);
  const lateRows = await page.$$eval('.c8 .pd-table tbody tr', (r) => r.length);
  if (lateRows !== S.kpi.late) errors.push('延期筛选行数 ' + lateRows + ' vs ' + S.kpi.late);
  await shot('2b-room-late-filter');
  await page.click('.pd-kpis .pd-kpi:nth-child(3)'); await page.waitForTimeout(200);
  // 预警榜第一条 → 下钻
  await page.click('.c4 .pd-list .pd-item');
  await page.waitForSelector('.m10-head');

  // 屏 3 订单下钻
  await page.waitForTimeout(200);
  const focusId = await text('.m10-head .id');
  await shot('3-order'); await lintScreen('订单下钻');
  const ganttBars = await page.$$eval('.pd-gantt rect[rx]', (r) => r.length);
  if (!ganttBars) errors.push('甘特无条');
  const best = await page.$('.pd-action.best .pd-btn');
  if (best) {
    await best.click(); await page.waitForTimeout(400);
    const toast = await page.$('.pd-toast'); if (!toast) errors.push('处置后无提示'); /* 先查提示（提示 2.6 秒后自动消失，截图可能更慢） */
    await shot('3b-order-after-action');
    const chips = await page.$$eval('.m10-head .pd-chip', (c) => c.map((x) => x.textContent));
    if (!chips.some((c) => c.indexOf('已处置') >= 0)) errors.push('处置后头部无已处置标记: ' + chips.join('|'));
  } else errors.push('无推荐动作可执行');
  // 下一张预警
  const nextBtn = (await page.$$('.m10-head .btns .pd-btn'))[1];
  if (nextBtn) { await nextBtn.click(); await page.waitForTimeout(200); await shot('3c-order-next'); }

  // 屏 4 插单模拟
  await page.click('.pd-tabs .tab:nth-child(4)');
  await page.waitForSelector('.m10-insert');
  await shot('4-insert-form');
  await page.click('.m10-insert .pd-btn.primary.big');
  await page.waitForSelector('.pd-compare');
  await page.waitForTimeout(200);
  await shot('4b-insert-compare'); await lintScreen('插单模拟');
  const optCount = await page.$$eval('.pd-option', (o) => o.length);
  if (optCount !== 3) errors.push('方案卡数量 ' + optCount);
  // 切到方案 C 看拆分甘特，再切回推荐方案落单
  await page.click('.pd-option:nth-child(3)'); await page.waitForTimeout(200); await shot('4c-insert-option-C');
  const rec = await page.$eval('.pd-option .rec', (e) => e.parentElement.querySelector('.key').textContent);
  await page.click('.pd-option:nth-child(' + ({ A: 1, B: 2, C: 3 })[rec] + ')'); await page.waitForTimeout(200);
  await page.click('.pd-card .ft .pd-btn.primary');
  await page.waitForSelector('.pd-kpis'); await page.waitForTimeout(400);
  await shot('4d-room-after-insert');
  const rows2 = await page.$$eval('.c8 .pd-table tbody tr', (r) => r.length);
  if (rows2 !== rowCount + 1) errors.push('落单后订单数 ' + rows2 + ' 应为 ' + (rowCount + 1));
  const logCard = await page.$$eval('.m10-log .l', (r) => r.length);
  if (logCard < 2) errors.push('处置日志条数 ' + logCard);

  // 屏 5 物料与库存
  await page.click('.pd-tabs .tab:nth-child(5)');
  await page.waitForSelector('.m10-po');
  await shot('5-stock'); await lintScreen('物料与库存');
  await page.click('.c8 .pd-table tbody tr');
  await page.waitForSelector('.pd-drawer');
  await page.waitForTimeout(200);
  await shot('5b-stock-drawer');
  await page.click('.pd-drawer .close');
  const poBtn = await page.$('.m10-po') && await page.$('.pd-card .ft .pd-btn.primary');
  if (poBtn) { await poBtn.click(); await page.waitForTimeout(400); await shot('5c-stock-po-issued'); }
  else errors.push('无采购单可生成');
  const kShort = await page.$eval('.pd-kpis .pd-kpi:first-child .v', (e) => parseInt(e.textContent, 10));
  if (kShort !== 0) errors.push('生成采购单后缺口应为 0，实际 ' + kShort);

  // 屏 6 交付日报
  await page.click('.pd-tabs .tab:nth-child(6)');
  await page.waitForSelector('.m10-daily');
  await shot('6-daily'); await lintScreen('交付日报');
  await page.click('.m10-daily .pd-card .ft .pd-btn.primary');
  await page.waitForSelector('.modal');
  await shot('6b-daily-wechat');
  await page.click('.modal .btn');
  const qr = await page.$('.rail .qr.ready'); if (!qr) errors.push('二维码未高亮');

  // 回到首页再进来：状态保留，不重复扣分
  await page.click('#home-link'); await page.waitForSelector('.grid');
  await page.click('.card[data-id="m10"]'); await page.waitForSelector('.pd-app');
  const spent2 = await text('#cr-spent');
  if (spent2 !== '100') errors.push('重进后积分 ' + spent2);

  // 切换企业：应回到接入屏且换名
  await page.click('.rail .link'); await page.waitForSelector('.rail .menu');
  await page.click('.rail .menu button:nth-child(2)'); await page.waitForTimeout(300);
  await shot('7-switch-company');
  const co2 = await text('.pd-top .co');
  console.log('切换企业后：' + co2.split('\n')[0]);

  await browser.close();
  if (errors.length) { console.error('FAIL\n' + errors.join('\n')); process.exit(1); }
  console.log('m10 走查通过 · 焦点订单 ' + focusId.split('\n')[0] + ' · 截图 ' + fs.readdirSync(out).length + ' 张 → ' + out);
})().catch((e) => { console.error(e); process.exit(1); });
