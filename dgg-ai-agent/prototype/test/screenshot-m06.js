// AI CFO 六屏走查：接入 → 驾驶舱（扣积分）→ 三表勾稽（按建议调整）→ 风险预警（执行处置）→ 现金预测（情景开关 → 按方案执行）→ 政策与月报（加入清单 → 发送）
// 全部走真实界面；每屏截图；扫禁词；核对界面数字与内核一致
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const url = 'file://' + (process.env.HTML || path.join(__dirname, '..', 'dist', 'index.html'));
const out = path.join(__dirname, process.env.OUT || 'shots-m06'); fs.mkdirSync(out, { recursive: true });
const core = require('../../skills/06-ai-cfo/core/fin.js');
const lib = require('../../skills/06-ai-cfo/scripts/load-data.js')();
const lint = require('../../skills/_shared/lint.js')(lib.lintWords);
const errors = [];
const W = +(process.env.W || 1920), H = +(process.env.H || 1080);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  const shot = (n) => page.screenshot({ path: `${out}/${n}.png` });
  const lintScreen = async (n) => { const t = await page.$eval('.pd-app', (e) => e.innerText); const hits = lint.hard(t); if (hits.length) errors.push(n + ' 禁词: ' + hits.join(',')); };
  const text = (sel) => page.$eval(sel, (e) => e.innerText.trim());
  const R = core.run(lib.samples.make, lib);

  await page.goto(url + '?station=3');
  await page.waitForSelector('.grid');
  await page.click('.card[data-id="m6"]');
  await page.waitForSelector('.m6-connect');
  await shot('1-connect'); await lintScreen('接入');
  const spent0 = await text('#cr-spent');
  await page.click('.m6-connect .go .pd-btn.primary');

  // 驾驶舱
  await page.waitForSelector('.pd-kpis'); await page.waitForTimeout(900);
  await shot('2-board'); await lintScreen('驾驶舱');
  const spent1 = await text('#cr-spent');
  if (spent0 !== '0' || spent1 !== '50') errors.push('积分扣减异常 ' + spent0 + ' → ' + spent1);
  const kAnom = await page.$eval('.pd-kpis .pd-kpi:nth-child(5) .v', (e) => parseInt(e.textContent, 10));
  if (kAnom !== R.reconcile.counts.bad) errors.push('勾稽异常 KPI ' + kAnom + ' vs ' + R.reconcile.counts.bad);
  const bars = await page.$$eval('.pd-line rect', (r) => r.length);
  if (bars !== 12) errors.push('趋势柱数 ' + bars);

  // 三表勾稽
  await page.click('.pd-kpis .pd-kpi:nth-child(5)');
  await page.waitForSelector('.m6-entry');
  await shot('3-recon'); await lintScreen('三表勾稽');
  const badRows = await page.$$eval('.m6-sc .pd-table tbody tr', (rows) => rows.filter((r) => r.textContent.indexOf('异常') >= 0).length);
  if (badRows !== R.reconcile.counts.bad) errors.push('勾稽表异常行 ' + badRows + ' vs ' + R.reconcile.counts.bad);
  await page.click('.pd-action.best .pd-btn'); await page.waitForTimeout(400);
  await shot('3b-recon-fixed');
  const fixedChip = await page.$$eval('.m6-sc .pd-table .pd-chip.handled', (c) => c.length);
  if (fixedChip < 1) errors.push('调整后表中无已调整标记');
  // 第二条异常也调
  await page.click('.m6-sc .pd-table tbody tr:nth-child(2)'); await page.waitForTimeout(200);
  const fixBtn = await page.$('.pd-action.best .pd-btn');
  if (fixBtn) { await fixBtn.click(); await page.waitForTimeout(300); }
  const kFixed = await page.$eval('.pd-kpis .pd-kpi:nth-child(5) .v', (e) => parseInt(e.textContent, 10));
  if (kFixed < 1) errors.push('已调整笔数 ' + kFixed);

  // 风险预警
  await page.click('.pd-tabs .tab:nth-child(4)');
  await page.waitForSelector('.pd-matrix');
  await shot('4-risk'); await lintScreen('风险预警');
  const pts = await page.$$eval('.pd-matrix .pt', (p) => p.length);
  if (pts !== R.risks.rows.length) errors.push('矩阵点数 ' + pts + ' vs ' + R.risks.rows.length);
  const riskBtn = await page.$('.pd-action.best .pd-btn');
  if (riskBtn) { const t = await riskBtn.textContent(); if (t.trim() === '执行') { await riskBtn.click(); await page.waitForTimeout(400); await shot('4b-risk-handled'); const hd = await page.$$eval('.m6-risk .pd-table tbody tr', (rs) => rs.filter((r) => r.textContent.indexOf('已处置') >= 0).length); if (hd < 1) errors.push('处置后清单无标记'); } }
  // 点矩阵上的 K01
  await page.evaluate(() => { const g = [...document.querySelectorAll('.pd-matrix .pt')].find((x) => x.textContent.indexOf('应收逾期') >= 0); if (g) g.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
  await page.waitForTimeout(200); await shot('4c-risk-k01');

  // 现金预测
  await page.click('.pd-tabs .tab:nth-child(5)');
  await page.waitForSelector('.pd-cash');
  await shot('5-cash'); await lintScreen('现金预测');
  const weeks = await page.$$eval('.pd-cash circle', (c) => c.length);
  if (weeks !== 13) errors.push('现金曲线点数 ' + weeks);
  await page.click('.pd-field .chips button'); await page.waitForTimeout(300);   // 催收提前
  await shot('5b-cash-scenario');
  await page.click('.pd-field .chips button'); await page.waitForTimeout(200);   // 关掉
  await page.click('.pd-card .ft .pd-btn.primary'); await page.waitForTimeout(400);
  await shot('5c-cash-applied');
  const gapKpi = await page.$eval('.pd-kpis .pd-kpi:nth-child(3) .v', (e) => e.textContent);
  if (gapKpi.indexOf('0元') < 0 && gapKpi.indexOf('0 元') < 0 && !/^0/.test(gapKpi)) errors.push('执行推荐方案后仍有缺口: ' + gapKpi);

  // 政策与月报
  await page.click('.pd-tabs .tab:nth-child(6)');
  await page.waitForSelector('.m6-policy');
  await shot('6-policy'); await lintScreen('政策与月报');
  const addBtns = await page.$$('.c8 .pd-table .pd-btn');
  if (addBtns.length < 2) errors.push('可加入清单的政策不足');
  await addBtns[0].click(); await page.waitForTimeout(250);
  const addBtns2 = await page.$$('.c8 .pd-table .pd-btn');
  await addBtns2[1].click(); await page.waitForTimeout(250);
  const listed = await page.$eval('.pd-kpis .pd-kpi:nth-child(3) .v', (e) => parseInt(e.textContent, 10));
  if (listed !== 2) errors.push('申报清单数 ' + listed);
  await page.click('.c8 .pd-table tbody tr'); await page.waitForSelector('.pd-drawer'); await shot('6b-policy-drawer'); await page.click('.pd-drawer .close');
  await page.click('.m6-policy .pd-card .ft .pd-btn.primary'); await page.waitForSelector('.modal'); await shot('6c-policy-wechat'); await page.click('.modal .btn');
  if (!(await page.$('.rail .qr.ready'))) errors.push('二维码未高亮');
  const rep = await text('.pd-pre');
  if (rep.indexOf('本期处置') < 0) errors.push('月报未包含本期处置');

  // 回驾驶舱看写回
  await page.click('.pd-tabs .tab:nth-child(2)'); await page.waitForSelector('.pd-kpis'); await page.waitForTimeout(300);
  await shot('7-board-after');
  const logs = await page.$$eval('.m6-log .l', (r) => r.length);
  if (logs < 3) errors.push('驾驶舱处置记录 ' + logs);

  // 回首页再进：不重复扣分；切换企业回接入
  await page.click('#home-link'); await page.waitForSelector('.grid');
  await page.click('.card[data-id="m6"]'); await page.waitForSelector('.pd-app');
  if ((await text('#cr-spent')) !== '50') errors.push('重进后积分异常');
  await page.click('.rail .link'); await page.waitForSelector('.rail .menu');
  await page.click('.rail .menu button:nth-child(2)'); await page.waitForTimeout(300);
  await shot('8-switch-company');
  console.log('切换企业后：' + (await text('.pd-top .co')).split('\n')[0]);
  await browser.close();
  if (errors.length) { console.error('FAIL\n' + errors.join('\n')); process.exit(1); }
  console.log('m6 走查通过 · 截图 ' + fs.readdirSync(out).length + ' 张 → ' + out);
})().catch((e) => { console.error(e); process.exit(1); });
