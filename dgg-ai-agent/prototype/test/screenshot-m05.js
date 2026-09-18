// AI人力官 六屏走查：接入 → 驾驶舱（扣积分）→ 招聘（切需求单 / 换版 / 发布 / 筛选 / 初筛 / 安排面试）→ 面试（打分 / 录入 / 发 offer）→ 合规（整改写回 / 日历筛选）→ 成本（选方案 / 采纳 / 月报发送）
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const url = 'file://' + path.join(__dirname, '..', 'dist', 'index.html');
const out = path.join(__dirname, process.env.OUT || 'shots-m05'); fs.mkdirSync(out, { recursive: true });
const core = require('../../skills/05-ai-hr/core/hr.js');
const lib = require('../../skills/05-ai-hr/scripts/load-data.js')();
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
  const clickBtn = (scope, label) => page.evaluate(([s, l]) => { const b = [...document.querySelectorAll(s + ' .pd-btn')].find((x) => x.textContent.trim() === l); if (!b) throw new Error('no button ' + l); b.click(); }, [scope, label]);
  const R = core.run(lib.samples.make, lib);

  await page.goto(url + '?station=3'); await page.waitForSelector('.grid');
  await page.click('.card[data-id="m5"]'); await page.waitForSelector('.m5-connect');
  await shot('1-connect'); await lintScreen('接入');
  const spent0 = await text('#cr-spent');
  await page.click('.m5-connect .go .pd-btn.primary');
  await page.waitForSelector('.m5-board'); await page.waitForTimeout(900);
  await shot('2-board'); await lintScreen('驾驶舱');
  const spent1 = await text('#cr-spent');
  if (spent0 !== '0' || spent1 !== '30') errors.push('积分扣减异常 ' + spent0 + ' → ' + spent1);
  if ((await kpiVal(1)) !== R.kpi.headcount) errors.push('在编 KPI ' + (await kpiVal(1)) + ' vs ' + R.kpi.headcount);
  if ((await kpiVal(7)) !== R.kpi.complianceOpen) errors.push('合规 KPI ' + (await kpiVal(7)) + ' vs ' + R.kpi.complianceOpen);
  const deptRows = await page.$$eval('.pd-card.c7 .pd-table tbody tr', (r) => r.length); if (deptRows !== lib.samples.make.departments.length) errors.push('部门行数 ' + deptRows);
  const needBlocks = await page.$$eval('.m5-needs .nd', (r) => r.length); if (needBlocks !== 3) errors.push('需求单块数 ' + needBlocks);

  // 招聘
  await page.click('.pd-tabs .tab:nth-child(3)'); await page.waitForSelector('.m5-recruit');
  await shot('3-recruit'); await lintScreen('招聘');
  const need0 = R.needs[0];
  const rows0 = await page.$$eval('.pd-card.c7 .pd-table tbody tr', (r) => r.length); if (rows0 !== need0.active) errors.push('候选人行数 ' + rows0 + ' vs ' + need0.active);
  const jd1 = await text('.pd-doc');
  await page.click('.pd-card.c8 .hd .x .chips button:nth-child(2)'); await page.waitForTimeout(200);   // 内推海报版
  const jd2 = await text('.pd-doc'); if (jd1 === jd2 || /\{\w+\}/.test(jd2)) errors.push('JD 换版异常');
  await shot('3b-recruit-poster');
  await page.click('.pd-card.c8 .hd .x .chips button:nth-child(1)'); await page.waitForTimeout(200);
  await clickBtn('.pd-card.c8 .ft', '发布招聘网站版'); await page.waitForTimeout(300);
  if (!(await page.$('.pd-card.c8 .ft .pd-chip.ok'))) errors.push('发布后无标记');
  await page.click('.pd-kpis .pd-kpi:nth-child(3)'); await page.waitForTimeout(200);   // A 级
  const rowsA = await page.$$eval('.pd-card.c7 .pd-table tbody tr', (r) => r.length); if (rowsA !== need0.gradeA) errors.push('A 级筛选 ' + rowsA + ' vs ' + need0.gradeA);
  await page.click('.pd-kpis .pd-kpi:nth-child(4)'); await page.waitForTimeout(200);   // 待初筛
  await page.click('.pd-card.c7 .pd-table tbody tr'); await page.waitForTimeout(200);
  const focus = await text('.pd-card.c5.pd-card.accent .hd .t, .c5 .pd-card.accent .hd .t');
  await shot('3c-recruit-focus');
  await clickBtn('.pd-action.best', '通过'); await page.waitForTimeout(300);
  await page.click('.pd-kpis .pd-kpi:nth-child(4)'); await page.waitForTimeout(200);   // 取消筛选
  const passed = await page.evaluate(() => [...document.querySelectorAll('.pd-card.c7 .pd-table tbody tr')].find((r) => r.querySelector('.pd-chip.handled')));
  if (!passed) errors.push('通过初筛后无初筛通过标记');
  await page.evaluate(() => { [...document.querySelectorAll('.pd-card.c7 .pd-table tbody tr')].find((r) => r.querySelector('.pd-chip.handled')).click(); }); await page.waitForTimeout(200);
  await clickBtn('.pd-action.best', '安排'); await page.waitForTimeout(300);
  await shot('3d-recruit-scheduled');
  const kInt = await kpiVal(5); if (kInt !== need0.stages.interview + need0.stages.done + 1) errors.push('安排面试后面试中计数 ' + kInt);

  // 面试
  await page.click('.pd-tabs .tab:nth-child(4)'); await page.waitForSelector('.m5-interview');
  await shot('4-interview'); await lintScreen('面试');
  const ilist = await page.$$eval('.pd-card.c4 .pd-list .pd-item', (r) => r.length); if (ilist < 4) errors.push('面试安排条数 ' + ilist);
  const abs = await page.$$eval('.m5-qs .ab', (r) => r.length); if (abs !== 4) errors.push('题库能力项 ' + abs);
  // 未评分的第一位：打 4 项分再录入
  await page.evaluate(() => { [...document.querySelectorAll('.pd-card.c4 .pd-list .pd-item')].find((x) => x.textContent.indexOf('待评') >= 0).click(); }); await page.waitForTimeout(200);
  for (let i = 1; i <= 4; i++) await page.click(`.m5-qs .ab:nth-child(${i}) .pick button:nth-child(${i === 1 || i === 4 ? 5 : 4})`);
  await page.waitForTimeout(150); await shot('4b-interview-scoring');
  await clickBtn('.m5-interview .pd-card .ft', '录入评分'); await page.waitForTimeout(400);
  if (!(await page.$('.pd-radar'))) errors.push('录入评分后无雷达');
  const avgTxt = await text('.m5-result .big b'); if (!/^\d\.\d+$|^\d$/.test(avgTxt)) errors.push('综合分显示异常 ' + avgTxt);
  await shot('4c-interview-result');
  await clickBtn('.m5-result .pd-action', '发 offer'); await page.waitForTimeout(300);
  if (!(await page.$('.m5-result .pd-action .pd-chip.ok'))) errors.push('发 offer 后无标记');
  if ((await kpiVal(5)) !== 1) errors.push('已发 offer 计数 ' + (await kpiVal(5)));
  await shot('4d-interview-offer');

  // 合规
  await page.click('.pd-tabs .tab:nth-child(5)'); await page.waitForSelector('.m5-compliance');
  await shot('5-compliance'); await lintScreen('合规');
  const rules = await page.$$eval('.pd-card.c7 .pd-table tbody tr', (r) => r.length); if (rules !== lib.complianceRules.rules.length) errors.push('规则行数 ' + rules);
  const open0 = await kpiVal(1); if (open0 !== R.kpi.complianceOpen) errors.push('待处理 KPI ' + open0 + ' vs ' + R.kpi.complianceOpen);
  await page.evaluate(() => { [...document.querySelectorAll('.pd-card.c7 .pd-table tbody tr')].find((r) => r.textContent.indexOf('H05') >= 0).click(); }); await page.waitForTimeout(200);
  await shot('5b-compliance-h05');
  await clickBtn('.pd-action.best', '执行并写回'); await page.waitForTimeout(400);
  if ((await kpiVal(1)) !== open0 - 1) errors.push('处置后待处理未减一');
  if ((await kpiVal(3)) !== 100) errors.push('调基数后占比 ' + (await kpiVal(3)));
  await page.evaluate(() => { [...document.querySelectorAll('.pd-card.c7 .pd-table tbody tr')].find((r) => r.textContent.indexOf('H06') >= 0).click(); }); await page.waitForTimeout(200);
  await clickBtn('.pd-action.best', '进台账'); await page.waitForTimeout(300);
  if ((await kpiVal(1)) !== open0 - 2) errors.push('台账类处置后待处理未减一');
  await shot('5c-compliance-after');
  const wks = await page.$$eval('.pd-weekgrid .wk', (r) => r.length); if (wks !== 13) errors.push('周格行数 ' + wks);
  await page.click('.m5-compliance .pd-card.c12 .hd .x .chips button:nth-child(2)'); await page.waitForTimeout(250);
  const kindsShown = await page.$$eval('.pd-weekgrid .it i', (r) => [...new Set(r.map((x) => x.textContent))]); if (kindsShown.length !== 1) errors.push('日历筛选混入其他类别 ' + kindsShown.join(','));
  await shot('5d-compliance-calendar');

  // 成本与编制
  await page.click('.pd-tabs .tab:nth-child(6)'); await page.waitForSelector('.m5-cost');
  await shot('6-cost'); await lintScreen('成本');
  const opts = await page.$$eval('.pd-compare .pd-option', (r) => r.length); if (opts !== 3) errors.push('方案数 ' + opts);
  if (!(await page.$('.pd-line'))) errors.push('无成本走势图');
  await page.click('.pd-compare .pd-option:nth-child(3)'); await page.waitForTimeout(250);
  const t3 = await text('.pd-card.c8 .hd .t'); if (t3.indexOf('方案 C') < 0) errors.push('切换方案明细失败 ' + t3);
  await page.click('.pd-compare .pd-option:nth-child(2)'); await page.waitForTimeout(250);
  await clickBtn('.m5-cost .pd-card.c12 .ft', '采纳方案 B'); await page.waitForTimeout(300);
  if (!(await page.$('.m5-cost .pd-card.c12 .ft .pd-chip.ok'))) errors.push('采纳后无标记');
  const rep = await text('.pd-pre'); if (rep.indexOf('【人力月报】') !== 0 || rep.indexOf('已采纳 B') < 0 || rep.indexOf('本期处置') < 0) errors.push('月报内容异常');
  await shot('6b-cost-adopted');
  await clickBtn('.m5-cost .pd-card.c4 .ft', '发送到微信'); await page.waitForSelector('.modal'); await shot('6c-cost-wechat'); await page.click('.modal .btn');
  if (!(await page.$('.rail .qr.ready'))) errors.push('二维码未高亮');

  // 回驾驶舱：动作写回
  await page.click('.pd-tabs .tab:nth-child(2)'); await page.waitForSelector('.m5-board'); await page.waitForTimeout(300);
  await shot('7-board-after');
  const logs = await page.$$eval('.m5-log .l', (r) => r.length); if (logs < 6) errors.push('驾驶舱动作记录 ' + logs);
  if ((await kpiVal(7)) !== R.kpi.complianceOpen - 2) errors.push('驾驶舱合规计数未更新');
  await page.click('#home-link'); await page.waitForSelector('.grid'); await page.click('.card[data-id="m5"]'); await page.waitForSelector('.pd-app');
  if ((await text('#cr-spent')) !== '30') errors.push('重进后积分异常');
  await page.click('.rail .link'); await page.waitForSelector('.rail .menu'); await page.click('.rail .menu button:nth-child(2)'); await page.waitForTimeout(300);
  await shot('8-switch-company'); console.log('切换企业后：' + (await text('.pd-top .co')).split('\n')[0]);
  await browser.close();
  if (errors.length) { console.error('FAIL\n' + errors.join('\n')); process.exit(1); }
  console.log('m5 走查通过 · 截图 ' + fs.readdirSync(out).length + ' 张 → ' + out);
})().catch((e) => { console.error(e); process.exit(1); });
