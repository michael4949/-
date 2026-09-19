// AI法务 六屏走查：接入 → 驾驶舱（扣积分）→ 合同审查（筛选 / 采纳修订 / 审查意见 / 条款全文 / 一键采纳）→ 新设主体（换类型 / 股权预设 / 确认）→ 知识产权（加入续展 / 申请清单）→ 台账与提醒（日历 / 发送月报）
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const url = 'file://' + (process.env.HTML || path.join(__dirname, '..', 'dist', 'index.html'));
const out = path.join(__dirname, process.env.OUT || 'shots-m07'); fs.mkdirSync(out, { recursive: true });
const core = require('../../skills/07-ai-legal/core/legal.js');
const lib = require('../../skills/07-ai-legal/scripts/load-data.js')();
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
  const kpiVal = (i) => page.$eval(`.pd-kpis .pd-kpi:nth-child(${i}) .v`, (e) => parseInt(e.textContent, 10));
  const R = core.run(lib.samples.make, lib);

  await page.goto(url + '?station=3'); await page.waitForSelector('.grid');
  await page.click('.card[data-id="m7"]'); await page.waitForSelector('.m7-connect');
  await shot('1-connect'); await lintScreen('接入');
  const spent0 = await text('#cr-spent');
  await page.click('.m7-connect .go .pd-btn.primary');
  await page.waitForSelector('.m7-board'); await page.waitForTimeout(900);
  await shot('2-board'); await lintScreen('驾驶舱');
  const spent1 = await text('#cr-spent');
  if (spent0 !== '0' || spent1 !== '30') errors.push('积分扣减异常 ' + spent0 + ' → ' + spent1);
  if ((await kpiVal(1)) !== R.kpi.compliance) errors.push('合规分 KPI ' + (await kpiVal(1)) + ' vs ' + R.kpi.compliance);
  if ((await kpiVal(3)) !== R.kpi.highRisk) errors.push('高风险 KPI ' + (await kpiVal(3)) + ' vs ' + R.kpi.highRisk);
  const boardRows = await page.$$eval('.c7 .pd-table tbody tr', (r) => r.length); if (boardRows !== 6) errors.push('风险榜行数 ' + boardRows);

  // 合同审查
  await page.click('.pd-tabs .tab:nth-child(3)'); await page.waitForSelector('.m7-contracts');
  await shot('3-contracts'); await lintScreen('合同审查');
  const rows0 = await page.$$eval('.c7 .pd-table tbody tr', (r) => r.length); if (rows0 !== R.contracts.length) errors.push('合同行数 ' + rows0 + ' vs ' + R.contracts.length);
  await page.click('.pd-kpis .pd-kpi:nth-child(2)'); await page.waitForTimeout(200);   // 高风险筛选
  const rowsHi = await page.$$eval('.c7 .pd-table tbody tr', (r) => r.length); if (rowsHi !== R.kpi.highRisk) errors.push('高风险筛选 ' + rowsHi + ' vs ' + R.kpi.highRisk);
  await page.click('.c7 .pd-table tbody tr'); await page.waitForTimeout(200);
  const focusId = await text('.c5 .pd-card.accent .hd .t');
  const score0 = parseInt(await text('.m7-chead .score'), 10);
  const findings0 = await page.$$eval('.m7-findings .f', (r) => r.length);
  const top = R.contracts[0]; if (focusId.indexOf(top.id) !== 0) errors.push('焦点合同 ' + focusId + ' vs ' + top.id);
  if (score0 !== top.score || findings0 !== top.findings.length) errors.push('焦点合同分数/问题数 ' + score0 + '/' + findings0 + ' vs ' + top.score + '/' + top.findings.length);
  await shot('3b-contract-focus');
  await page.click('.m7-findings .f .fix .pd-btn.primary'); await page.waitForTimeout(400);   // 采纳第一处修订
  const score1 = parseInt(await text('.m7-chead .score'), 10);
  const d1 = core.applyFix(lib.samples.make, top.id, top.findings[0].id, lib); const R1 = core.run(d1, lib);
  if (score1 !== R1.byId[top.id].score) errors.push('采纳后分数 ' + score1 + ' vs ' + R1.byId[top.id].score);
  if (!(await page.$('.m7-rev'))) errors.push('采纳后无修订记录');
  await shot('3c-contract-fixed');
  await page.click('.c5 .pd-card.accent .ft .pd-btn.primary'); await page.waitForSelector('.pd-drawer'); await page.waitForTimeout(200);   // 审查意见
  const op = await text('.pd-drawer .pd-pre'); if (op.indexOf('【合同审查意见】') !== 0 || op.indexOf('已采纳修订 1 处') < 0) errors.push('审查意见内容异常');
  await shot('3d-opinion'); await page.click('.pd-drawer .close'); await page.waitForTimeout(150);
  await page.evaluate(() => { [...document.querySelectorAll('.c5 .pd-card.accent .ft .pd-btn')].find((b) => b.textContent === '条款全文').click(); }); await page.waitForSelector('.pd-drawer'); await page.waitForTimeout(200);
  const revK = await page.$$eval('.m7-clauses .k.rev', (r) => r.length); if (revK !== 1) errors.push('条款全文修订标记 ' + revK);
  await shot('3e-clauses'); await page.click('.pd-drawer .close'); await page.waitForTimeout(150);
  await page.click('.pd-card.c7 .hd .x .pd-btn.primary'); await page.waitForTimeout(500);   // 采纳全部高风险修订
  const hiAfter = await kpiVal(2); if (hiAfter !== 0) errors.push('一键采纳后仍有高风险合同 ' + hiAfter);
  await shot('3f-contracts-after');

  // 新设主体
  await page.click('.pd-tabs .tab:nth-child(4)'); await page.waitForSelector('.m7-setup');
  await shot('4-setup'); await lintScreen('新设主体');
  if ((await kpiVal(1)) !== R.setup.totalDays) errors.push('设立总天数 ' + (await kpiVal(1)) + ' vs ' + R.setup.totalDays);
  const lines = await page.$$eval('.m7-lines .ln', (r) => r.length); if (lines !== 3) errors.push('控制线数 ' + lines);
  await page.click('.m7-setup .pd-field .chips button:nth-child(3)'); await page.waitForTimeout(300);   // 新公司
  await page.evaluate(() => { [...document.querySelectorAll('.m7-setup .presets button')].find((b) => b.textContent === '50 / 50').click(); }); await page.waitForTimeout(300);
  if (!(await page.$('.pd-judge .verdict.late'))) errors.push('对半分未提示僵局');
  await shot('4b-setup-deadlock');
  await page.evaluate(() => { [...document.querySelectorAll('.m7-setup .presets button')].find((b) => b.textContent === '70 / 30').click(); }); await page.waitForTimeout(300);
  await page.click('.m7-setup .pd-field .chips button:nth-child(1)'); await page.waitForTimeout(300);   // 子公司
  await page.evaluate(() => { [...document.querySelectorAll('.m7-setup .pd-card .ft .pd-btn')].find((b) => b.textContent === '确认方案').click(); }); await page.waitForTimeout(400);
  if ((await text('.pd-kpis .pd-kpi:nth-child(6) .v')) !== '已确认') errors.push('确认方案未生效');
  await shot('4c-setup-confirmed');

  // 知识产权
  await page.click('.pd-tabs .tab:nth-child(5)'); await page.waitForSelector('.m7-ip');
  await shot('5-ip'); await lintScreen('知识产权');
  const ipRows = await page.$$eval('.c7 .pd-table tbody tr', (r) => r.length); if (ipRows !== R.ip.assets.length) errors.push('知产行数 ' + ipRows + ' vs ' + R.ip.assets.length);
  if ((await kpiVal(3)) !== R.ip.coverage) errors.push('覆盖率 KPI ' + (await kpiVal(3)) + ' vs ' + R.ip.coverage);
  await page.click('.c7 .pd-table tbody tr .pd-btn'); await page.waitForTimeout(300);   // 加入续展清单
  if ((await kpiVal(5)) !== 1) errors.push('续展清单计数 ' + (await kpiVal(5)));
  await page.click('.m7-classes .cl .pd-btn'); await page.waitForTimeout(300);   // 加入申请
  if ((await kpiVal(6)) !== 1) errors.push('申请清单计数 ' + (await kpiVal(6)));
  const listed = await page.$$eval('.m7-lists .pd-item', (r) => r.length); if (listed !== 2) errors.push('清单条目 ' + listed);
  await shot('5b-ip-listed');

  // 台账与提醒
  await page.click('.pd-tabs .tab:nth-child(6)'); await page.waitForSelector('.m7-register');
  await shot('6-register'); await lintScreen('台账');
  const wks = await page.$$eval('.pd-weekgrid .wk', (r) => r.length); if (wks !== 13) errors.push('周格行数 ' + wks);
  if (!(await page.$('.pd-weekgrid .day.today'))) errors.push('日历无今天');
  const setupItems = await page.$$eval('.pd-weekgrid .it.accent', (r) => r.length); if (!setupItems) errors.push('确认后设立节点未进日历');
  if ((await kpiVal(1)) < R.register.counts.total) errors.push('台账总数 ' + (await kpiVal(1)) + ' < ' + R.register.counts.total);
  await page.click('.pd-kpis .pd-kpi:nth-child(7)'); await page.waitForTimeout(250);   // 只看设立节点
  const onlySetup = await page.$$eval('.pd-weekgrid .it', (r) => r.map((x) => x.className)); if (onlySetup.some((c) => c.indexOf('accent') < 0)) errors.push('设立筛选混入其他条目');
  await shot('6b-register-setup');
  await page.click('.pd-kpis .pd-kpi:nth-child(1)'); await page.waitForTimeout(250);
  const rep = await text('.pd-pre'); if (rep.indexOf('【法务月报】') !== 0 || rep.indexOf('本期处置') < 0) errors.push('月报内容异常');
  await page.evaluate(() => { [...document.querySelectorAll('.m7-register .pd-card .ft .pd-btn')].find((b) => b.textContent === '发送到微信').click(); }); await page.waitForSelector('.modal'); await shot('6c-register-wechat'); await page.click('.modal .btn');
  if (!(await page.$('.rail .qr.ready'))) errors.push('二维码未高亮');
  await page.click('.pd-weekgrid button.it'); await page.waitForTimeout(300);   // 点条目跳转
  const after = await page.$('.m7-contracts, .m7-ip, .m7-setup, .pd-drawer'); if (!after) errors.push('日历条目未跳转');
  await shot('6d-register-jump');

  // 回驾驶舱：动作写回
  await page.click('.pd-tabs .tab:nth-child(2)'); await page.waitForSelector('.m7-board'); await page.waitForTimeout(300);
  await shot('7-board-after');
  const logs = await page.$$eval('.m7-log .l', (r) => r.length); if (logs < 4) errors.push('驾驶舱动作记录 ' + logs);
  if ((await kpiVal(3)) !== 0) errors.push('驾驶舱高风险未清零');
  await page.click('#home-link'); await page.waitForSelector('.grid'); await page.click('.card[data-id="m7"]'); await page.waitForSelector('.pd-app');
  if ((await text('#cr-spent')) !== '30') errors.push('重进后积分异常');
  await page.click('.rail .link'); await page.waitForSelector('.rail .menu'); await page.click('.rail .menu button:nth-child(2)'); await page.waitForTimeout(300);
  await shot('8-switch-company'); console.log('切换企业后：' + (await text('.pd-top .co')).split('\n')[0]);
  await browser.close();
  if (errors.length) { console.error('FAIL\n' + errors.join('\n')); process.exit(1); }
  console.log('m7 走查通过 · 截图 ' + fs.readdirSync(out).length + ' 张 → ' + out);
})().catch((e) => { console.error(e); process.exit(1); });
