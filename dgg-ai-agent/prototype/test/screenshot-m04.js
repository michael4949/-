// AI获客 六屏走查：接入 → 驾驶舱（扣积分）→ 画像（切细分 / 调权重）→ 脚本（换一版 / 采用）→ 线索池（分派 / 加入计划 / 一键分派）→ 跟进与周报（发送）
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const url = 'file://' + (process.env.HTML || path.join(__dirname, '..', 'dist', 'index.html'));
const out = path.join(__dirname, process.env.OUT || 'shots-m04'); fs.mkdirSync(out, { recursive: true });
const core = require('../../skills/04-ai-lead/core/lead.js');
const lib = require('../../skills/04-ai-lead/scripts/load-data.js')();
const lint = require('../../skills/_shared/lint.js')(lib.lintWords);
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
  const R = core.run(lib.samples.make, lib);

  await page.goto(url + '?station=3'); await page.waitForSelector('.grid');
  await page.click('.card[data-id="m4"]'); await page.waitForSelector('.m4-connect');
  await shot('1-connect'); await lintScreen('接入');
  const spent0 = await text('#cr-spent');
  await page.click('.m4-connect .go .pd-btn.primary');
  await page.waitForSelector('.pd-funnel'); await page.waitForTimeout(900);
  await shot('2-board'); await lintScreen('驾驶舱');
  const spent1 = await text('#cr-spent');
  if (spent0 !== '0' || spent1 !== '30') errors.push('积分扣减异常 ' + spent0 + ' → ' + spent1);
  const kLeads = await page.$eval('.pd-kpis .pd-kpi:first-child .v', (e) => parseInt(e.textContent, 10));
  if (kLeads !== R.kpi.leads) errors.push('在手线索 KPI ' + kLeads + ' vs ' + R.kpi.leads);
  const fRows = await page.$$eval('.pd-funnel .row', (r) => r.length); if (fRows !== 5) errors.push('漏斗级数 ' + fRows);

  // 画像
  await page.click('.pd-tabs .tab:nth-child(3)'); await page.waitForSelector('.m4-segs');
  await shot('3-profile'); await lintScreen('画像');
  const segs = await page.$$eval('.m4-segs .seg', (s) => s.length); if (segs !== 3) errors.push('细分卡数 ' + segs);
  await page.click('.m4-segs .seg:nth-child(2)'); await page.waitForTimeout(300);
  const onSeg = await page.$eval('.m4-segs .seg.on .id', (e) => e.textContent); if (onSeg !== 'S2') errors.push('切换细分失败 ' + onSeg);
  await shot('3b-profile-focus-s2');
  await page.click('.m4-segs .seg:nth-child(1)'); await page.waitForTimeout(200);
  await page.click('.m4-dist .dim:first-child .adj button:nth-child(3)'); await page.waitForTimeout(300);   // 行业权重 ×1.5
  await shot('3c-profile-weight');

  // 脚本
  await page.click('.pd-tabs .tab:nth-child(4)'); await page.waitForSelector('.m4-script');
  await shot('4-script'); await lintScreen('脚本');
  const t1 = await text('.pd-doc');
  await page.click('.m4-script .pd-field .chips .pd-btn'); await page.waitForTimeout(200);   // 换一版
  const t2 = await text('.pd-doc'); if (t1 === t2) errors.push('换一版无变化');
  if (/\{\w+\}/.test(t2)) errors.push('脚本有未替换占位符');
  await page.click('.m4-script .pd-card .ft .pd-btn.primary'); await page.waitForTimeout(300);
  const adopted = await page.$('.m4-script .pd-card .ft .pd-chip.ok'); if (!adopted) errors.push('采用后无标记');
  await shot('4b-script-adopted');
  // 切换渠道 + 阶段
  await page.evaluate(() => { [...document.querySelectorAll('.m4-script .pd-field')].find((f) => f.textContent.indexOf('触达渠道') >= 0).querySelectorAll('.chips button')[1].click(); });
  await page.waitForTimeout(150);
  await page.evaluate(() => { [...document.querySelectorAll('.m4-script .pd-field')].find((f) => f.textContent.indexOf('阶段') >= 0).querySelectorAll('.chips button')[3].click(); });
  await page.waitForTimeout(200); await shot('4c-script-wechat-wake');

  // 线索池
  await page.click('.pd-tabs .tab:nth-child(5)'); await page.waitForSelector('.m4-lhead');
  await shot('5-leads'); await lintScreen('线索池');
  const rows0 = await page.$$eval('.c8 .pd-table tbody tr', (r) => r.length);
  if (rows0 !== R.leads.filter((l) => l.stage !== 'won').length) errors.push('线索行数 ' + rows0);
  await page.click('.pd-kpis .pd-kpi:nth-child(4)'); await page.waitForTimeout(200);   // 未分派筛选
  const un = await page.$$eval('.c8 .pd-table tbody tr', (r) => r.length); if (un !== R.kpi.unassigned) errors.push('未分派筛选 ' + un + ' vs ' + R.kpi.unassigned);
  await page.click('.c8 .pd-table tbody tr'); await page.waitForTimeout(200);
  await shot('5b-lead-unassigned');
  await page.click('.pd-action.best .pd-btn'); await page.waitForTimeout(300);   // 分派
  const un2 = await page.$$eval('.c8 .pd-table tbody tr', (r) => r.length); if (un2 !== un - 1) errors.push('单条分派后未分派数 ' + un2);
  await page.click('.pd-card .hd .x .pd-btn.primary'); await page.waitForTimeout(400);   // 一键分派
  await shot('5c-leads-assigned');
  const un3 = await page.$eval('.pd-kpis .pd-kpi:nth-child(4) .v', (e) => parseInt(e.textContent, 10)); if (un3 !== 0) errors.push('一键分派后仍有未分派 ' + un3);
  await page.click('.pd-kpis .pd-kpi:nth-child(2)'); await page.waitForTimeout(200);   // A 级
  await page.click('.c8 .pd-table tbody tr'); await page.waitForTimeout(200);
  const planBtn = await page.$('.pd-action.best .pd-btn');
  if (planBtn) { await planBtn.click(); await page.waitForTimeout(300); }
  await shot('5d-lead-planned');

  // 跟进与周报
  await page.click('.pd-tabs .tab:nth-child(6)'); await page.waitForSelector('.m4-plan');
  await shot('6-plan'); await lintScreen('跟进');
  const dayCols = await page.$$eval('.m4-plan .day', (d) => d.length); if (dayCols !== 5) errors.push('日程列数 ' + dayCols);
  const rep = await text('.pd-pre'); if (rep.indexOf('本周动作') < 0) errors.push('周报未包含本周动作');
  await page.click('.m4-plan .pd-card .ft .pd-btn.primary'); await page.waitForSelector('.modal'); await shot('6b-plan-wechat'); await page.click('.modal .btn');
  if (!(await page.$('.rail .qr.ready'))) errors.push('二维码未高亮');

  // 回驾驶舱：动作写回
  await page.click('.pd-tabs .tab:nth-child(2)'); await page.waitForSelector('.pd-funnel'); await page.waitForTimeout(300);
  await shot('7-board-after');
  const logs = await page.$$eval('.m4-log .l', (r) => r.length); if (logs < 4) errors.push('驾驶舱动作记录 ' + logs);
  await page.click('#home-link'); await page.waitForSelector('.grid'); await page.click('.card[data-id="m4"]'); await page.waitForSelector('.pd-app');
  if ((await text('#cr-spent')) !== '30') errors.push('重进后积分异常');
  await page.click('.rail .link'); await page.waitForSelector('.rail .menu'); await page.click('.rail .menu button:nth-child(2)'); await page.waitForTimeout(300);
  await shot('8-switch-company'); console.log('切换企业后：' + (await text('.pd-top .co')).split('\n')[0]);
  await browser.close();
  if (errors.length) { console.error('FAIL\n' + errors.join('\n')); process.exit(1); }
  console.log('m4 走查通过 · 截图 ' + fs.readdirSync(out).length + ' 张 → ' + out);
})().catch((e) => { console.error(e); process.exit(1); });
