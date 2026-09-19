// AI流程提效 六屏走查：接入（报工核验 · 扣积分）→ 工序流看板（约束判断 / 异常处置）→ 工序诊断（时间损失 / 采纳标准工时 / 按瓶颈节拍投料）
// → 改善预演（AI 重排顺序 / 拖参数 / 选方案 / 立项）→ 执行与派工（生成派工单 / 排入保养窗口 / 带教 / 节点完成）→ 提效周报（增效账 / 发送）
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const url = 'file://' + path.join(__dirname, '..', 'dist', 'index.html');
const out = path.join(__dirname, process.env.OUT || 'shots-m08'); fs.mkdirSync(out, { recursive: true });
const core = require('../../skills/08-ai-process/core/flow.js');
const lib = require('../../skills/08-ai-process/scripts/load-data.js')(); lib.erp = require('../../skills/10-ai-erp/core/sim.js');
const lint = require('../../skills/_shared/lint.js')(lib.lintWords);
const errors = [];
const W = +(process.env.W || 1920), H = +(process.env.H || 1080);
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  const shot = (n) => page.screenshot({ path: `${out}/${n}.png` });
  const lintScreen = async (n) => { const t = await page.$eval('.pd-app', (e) => e.innerText); const hits = lint.hard(t); if (hits.length) errors.push(n + ' 禁词: ' + hits.join(',')); if (/\{\w+\}|undefined|NaN/.test(t)) errors.push(n + ' 文本异常（占位符 / undefined / NaN）'); if (t.indexOf('刀') >= 0 || t.indexOf('承诺') >= 0) errors.push(n + ' 用词: 刀 / 承诺'); };
  const text = (sel) => page.$eval(sel, (e) => e.innerText.trim());
  const kpiVal = (i) => page.$eval(`.pd-kpis .pd-kpi:nth-child(${i}) .v`, (e) => e.textContent.trim());
  const clickBtn = (scope, label) => page.evaluate(([s, l]) => { const b = [...document.querySelectorAll(s + ' .pd-btn')].find((x) => x.textContent.trim() === l || x.textContent.trim().indexOf(l) === 0); if (!b) throw new Error('no button ' + l + ' in ' + s); b.click(); }, [scope, label]);
  const hasBtn = (scope, label) => page.evaluate(([s, l]) => !![...document.querySelectorAll(s + ' .pd-btn')].find((x) => x.textContent.trim().indexOf(l) === 0), [scope, label]);
  let d = core.ensure(lib.samples.make); let R = core.run(d, lib);

  await page.goto(url + '?station=3'); await page.waitForSelector('.grid');
  await page.click('.card[data-id="m8"]'); await page.waitForSelector('.m8-connect');
  await shot('1-connect'); await lintScreen('接入');
  const spent0 = await text('#cr-spent');
  const vrows = await page.$$eval('.m8-connect .pd-card.c8 .pd-table tbody tr', (r) => r.length); if (vrows !== R.verify.rows.length) errors.push('核验行数 ' + vrows + ' vs ' + R.verify.rows.length);
  await page.click('.m8-connect .go .pd-btn.primary');
  await page.waitForSelector('.m8-board'); await page.waitForTimeout(800);
  await shot('2-board'); await lintScreen('看板');
  const spent1 = await text('#cr-spent');
  if (spent0 !== '0' || spent1 !== '50') errors.push('积分扣减异常 ' + spent0 + ' → ' + spent1);
  d = core.confirmAllReports(d, lib); R = core.run(d, lib);
  if (parseInt(await kpiVal(1)) !== R.kpi.load7) errors.push('约束负荷 KPI ' + (await kpiVal(1)) + ' vs ' + R.kpi.load7);
  if (parseFloat(await kpiVal(2)) !== R.kpi.queueDays) errors.push('排队 KPI ' + (await kpiVal(2)) + ' vs ' + R.kpi.queueDays);
  const stg = await page.$$eval('.m8-flow .stg', (r) => r.length); if (stg !== R.flow.length) errors.push('工序格数 ' + stg + ' vs ' + R.flow.length);
  if (!(await page.$('.m8-flow .stg.con'))) errors.push('无约束高亮');
  const alertsN = await page.$$eval('.m8-board .pd-card.c6:nth-of-type(3) .pd-list .pd-item, .m8-board .pd-card.c6 .pd-list .pd-item', (r) => r.length); if (alertsN !== R.alerts.length) errors.push('异常条数 ' + alertsN + ' vs ' + R.alerts.length);
  await page.click('.m8-flow .stg.con'); await page.waitForSelector('.pd-drawer'); await page.waitForTimeout(250);
  await shot('2b-board-judge'); await lintScreen('约束判断');
  await page.click('.pd-drawer .close'); await page.waitForTimeout(200);
  // 处置第一条异常
  const exId = R.alerts[0].id;
  await clickBtn('.m8-board .pd-card.c6 .pd-list .pd-item', '处置'); await page.waitForTimeout(400);
  d = core.handleException(d, lib, exId); R = core.run(d, lib);
  const badge = await page.$eval('.pd-tabs .tab:nth-child(2) .badge', (e) => e.textContent.trim()).catch(() => '0');
  if (parseInt(badge) !== R.kpi.alertsOpen) errors.push('看板角标 ' + badge + ' vs ' + R.kpi.alertsOpen);
  await shot('2c-board-handled');

  // 工序诊断
  await page.click('.pd-tabs .tab:nth-child(3)'); await page.waitForSelector('.m8-diag'); await page.waitForTimeout(400);
  await shot('3-diag'); await lintScreen('诊断');
  if (!(await page.$('.pd-waterfall'))) errors.push('无时间损失瀑布');
  const counter = await text('.m8-counter').catch(() => ''); if (counter.indexOf('预计节省') < 0) errors.push('无页头计数器');
  // 采纳第一条过期标准工时
  const exp = R.calibration.filter((c) => c.status === 'expired')[0];
  await clickBtn('.m8-diag .pd-card.c12 .pd-table', '采纳'); await page.waitForTimeout(400);
  d = core.adoptStd(d, lib, exp.product, exp.op); R = core.run(d, lib);
  await shot('3b-diag-adopted');
  // 点换型柱 → 抽屉
  await page.evaluate(() => { const b = document.querySelector('.pd-waterfall .bar, .pd-waterfall rect[data-id="setup"], .pd-waterfall g[data-id="setup"]'); if (b) b.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
  await page.waitForTimeout(300);
  if (await page.$('.pd-drawer')) { await shot('3c-diag-setup-records'); await page.click('.pd-drawer .close'); await page.waitForTimeout(200); }
  // 按瓶颈节拍投料
  if (await hasBtn('.m8-diag', '按')) { await clickBtn('.m8-diag', '按'); await page.waitForTimeout(500); d = core.applyRelease(d, lib); R = core.run(d, lib); await shot('3d-diag-release'); await lintScreen('投料'); }

  // 改善预演
  await page.click('.pd-tabs .tab:nth-child(4)'); await page.waitForSelector('.m8-improve'); await page.waitForTimeout(500);
  await shot('4-improve'); await lintScreen('预演');
  const opts = await page.$$eval('.pd-compare .pd-option', (r) => r.length); if (opts !== lib.improveLib.cards.length + 1) errors.push('方案卡数 ' + opts);
  if (!(await page.$('.pd-compare .pd-option .rec'))) errors.push('无 AI 推荐');
  await clickBtn('.m8-improve', 'AI 重排今日顺序'); await page.waitForTimeout(500);
  d = core.applySequence(d, lib); R = core.run(d, lib);
  await shot('4b-improve-sequence'); await lintScreen('合批');
  // 拖支援人数滑杆到 1
  await page.evaluate(() => { const r = [...document.querySelectorAll('.m8-params input[type=range]')].find((x) => x.max === '2'); if (r) { r.value = '1'; r.dispatchEvent(new Event('input', { bubbles: true })); r.dispatchEvent(new Event('change', { bubbles: true })); } }); await page.waitForTimeout(600);
  await shot('4c-improve-param');
  await page.evaluate(() => { const r = [...document.querySelectorAll('.m8-params input[type=range]')].find((x) => x.max === '2'); if (r) { r.value = '2'; r.dispatchEvent(new Event('input', { bubbles: true })); r.dispatchEvent(new Event('change', { bubbles: true })); } }); await page.waitForTimeout(600);
  // 选组合 → 立项
  await page.evaluate(() => { [...document.querySelectorAll('.pd-compare .pd-option')].pop().click(); }); await page.waitForTimeout(500);
  await clickBtn('.m8-improve .pd-card.c4', '立项'); await page.waitForTimeout(600);
  d = core.commitProject(d, lib, lib.improveLib.combo, { support: 2 }); R = core.run(d, lib);
  const prows = await page.$$eval('.m8-improve .pd-grid > .pd-card:last-child .pd-table tbody tr', (r) => r.length); if (prows !== d.projects.length) errors.push('项目台账行数 ' + prows + ' vs ' + d.projects.length);
  await shot('4d-improve-project'); await lintScreen('立项');

  // 执行与派工
  await page.click('.pd-tabs .tab:nth-child(5)'); await page.waitForSelector('.m8-exec'); await page.waitForTimeout(500);
  await shot('5-exec'); await lintScreen('执行');
  const drows = await page.$$eval('.m8-exec .c7 .pd-card:nth-child(2) .pd-table tbody tr', (r) => r.length); if (drows !== R.dispatch.rows.length) errors.push('派工行数 ' + drows + ' vs ' + R.dispatch.rows.length);
  await clickBtn('.m8-exec', '生成明日'); await page.waitForTimeout(500);
  d = core.applyDispatch(d, lib); R = core.run(d, lib);
  await clickBtn('.m8-exec', '排入窗口'); await page.waitForTimeout(500);
  d = core.scheduleMaint(d, lib, R.maintenance.filter((m) => !m.scheduled && m.window)[0].machine); R = core.run(d, lib);
  if (await hasBtn('.m8-exec', '加入本周带教')) { await clickBtn('.m8-exec', '加入本周带教'); await page.waitForTimeout(400); const p = R.skills.pairs[0]; d = core.addTraining(d, lib, p.trainee, p.op); R = core.run(d, lib); }
  await clickBtn('.m8-exec .m8-ms', '完成'); await page.waitForTimeout(400);
  d = core.setMilestone(d, lib, d.projects[0].id, 0, 'done'); R = core.run(d, lib);
  await shot('5b-exec-dispatched'); await lintScreen('派工');
  const counter2 = await text('.m8-counter'); if (parseFloat(counter2.replace(/[^\d.]/g, '')) !== R.kpi.savedH) errors.push('计数器 ' + counter2 + ' vs ' + R.kpi.savedH);

  // 周报
  await page.click('.pd-tabs .tab:nth-child(6)'); await page.waitForSelector('.m8-report'); await page.waitForTimeout(500);
  await shot('6-report'); await lintScreen('周报');
  if (parseFloat(await kpiVal(1)) !== R.kpi.savedH) errors.push('周报 KPI ' + (await kpiVal(1)) + ' vs ' + R.kpi.savedH);
  const pre = await text('.pd-pre'); if (pre.indexOf('【') !== 0 || pre.indexOf('增效账') < 0 || pre.indexOf(d.projects[0].id) < 0) errors.push('周报文本异常');
  const lrows = await page.$$eval('.m8-report .c7 .pd-card:first-child .pd-table tbody tr', (r) => r.length); if (lrows !== R.ledger.rows.length) errors.push('增效账行数 ' + lrows + ' vs ' + R.ledger.rows.length);
  await clickBtn('.m8-report', '发送到微信'); await page.waitForSelector('.modal'); await page.waitForTimeout(300);
  await shot('6b-report-sent'); await page.click('.modal .btn'); await page.waitForTimeout(300);
  // 回到首页再进：仍在最后一屏，积分不重复扣
  await page.evaluate(() => { location.hash = '#/home'; }); await page.waitForTimeout(400);
  await page.click('.card[data-id="m8"]'); await page.waitForTimeout(500);
  if (!(await page.$('.m8-report'))) errors.push('重进未落回上次屏');
  if ((await text('#cr-spent')) !== '50') errors.push('重进重复扣积分');
  await browser.close();
  if (errors.length) { console.error('走查失败:\n' + errors.join('\n')); process.exit(1); }
  console.log('AI流程提效 六屏走查通过 · 截图 ' + fs.readdirSync(out).length + ' 张 → ' + out);
})().catch((e) => { console.error(e); process.exit(1); });
