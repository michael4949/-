// AI决策 六屏走查：接入 → 驾驶舱（扣积分）→ 归因（切基期 / 选因子 / 证据）→ 方案预演（调参数 / 选方案 / 发起审批）→ 审批（会签 / 批准 / 驳回）→ 执行（节点完成 / 月报发送）
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const url = 'file://' + path.join(__dirname, '..', 'dist', 'index.html');
const out = path.join(__dirname, process.env.OUT || 'shots-m09'); fs.mkdirSync(out, { recursive: true });
const core = require('../../skills/09-ai-decision/core/decide.js');
const lib = require('../../skills/09-ai-decision/scripts/load-data.js')();
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
  const kpiVal = (i) => page.$eval(`.pd-kpis .pd-kpi:nth-child(${i}) .v`, (e) => e.textContent.trim());
  const clickBtn = (scope, label) => page.evaluate(([s, l]) => { const b = [...document.querySelectorAll(s + ' .pd-btn')].find((x) => x.textContent.trim() === l); if (!b) throw new Error('no button ' + l); b.click(); }, [scope, label]);
  const R = core.run(lib.samples.make, lib);

  await page.goto(url + '?station=3'); await page.waitForSelector('.grid');
  await page.click('.card[data-id="m9"]'); await page.waitForSelector('.m9-connect');
  await shot('1-connect'); await lintScreen('接入');
  const spent0 = await text('#cr-spent');
  await page.click('.m9-connect .go .pd-btn.primary');
  await page.waitForSelector('.m9-board'); await page.waitForTimeout(900);
  await shot('2-board'); await lintScreen('驾驶舱');
  const spent1 = await text('#cr-spent');
  if (spent0 !== '0' || spent1 !== '100') errors.push('积分扣减异常 ' + spent0 + ' → ' + spent1);
  if ((await kpiVal(1)).indexOf(core.fmtW(R.kpi.profit)) < 0) errors.push('利润 KPI ' + (await kpiVal(1)));
  const grps = await page.$$eval('.m9-tree .grp', (r) => r.length); if (grps !== lib.metricTree.groups.length) errors.push('指标树组数 ' + grps);
  const nodes = await page.$$eval('.m9-tree .nd', (r) => r.length); if (nodes !== lib.metricTree.nodes.length) errors.push('指标树节点数 ' + nodes);

  // 归因
  await page.click('.c4 .pd-card .pd-list .pd-item'); await page.waitForSelector('.m9-attr'); await page.waitForTimeout(300);   // 偏差榜第一项
  await shot('3-attr'); await lintScreen('归因');
  if (!(await page.$('.pd-waterfall'))) errors.push('无瀑布图');
  await page.click('.pd-kpis .pd-kpi:nth-child(1)').catch(() => {});
  await page.evaluate(() => { [...document.querySelectorAll('.m9-attr .ctl .chips button')].find((b) => b.textContent === '经营利润').click(); }); await page.waitForTimeout(250);
  const A = R.attribution;
  const rows = await page.$$eval('.pd-card.c5 .pd-table tbody tr', (r) => r.length); if (rows !== A.leaves.length) errors.push('因子行数 ' + rows + ' vs ' + A.leaves.length);
  const root = await kpiVal(2); if (root !== A.rootCause.name) errors.push('主因 ' + root + ' vs ' + A.rootCause.name);
  const ev = await page.$$eval('.m9-ev .ev', (r) => r.length); if (ev < 1) errors.push('无证据卡');
  await page.evaluate(() => { [...document.querySelectorAll('.m9-attr .ctl .chips button')].find((b) => b.textContent === '较前三月均值').click(); }); await page.waitForTimeout(250);
  const k1 = await kpiVal(1); await shot('3b-attr-avg3');
  await page.evaluate(() => { [...document.querySelectorAll('.m9-attr .ctl .chips button')].find((b) => b.textContent === '较上期').click(); }); await page.waitForTimeout(250);
  await page.click('.pd-card.c5 .pd-table tbody tr:nth-child(2)'); await page.waitForTimeout(250);   // 第二个因子
  const f2 = await text('.pd-card.c7:nth-of-type(2) .hd .t, .m9-attr .pd-card.c7 ~ .pd-card.c7 .hd .t').catch(() => '');
  await shot('3c-attr-factor2');
  await page.evaluate(() => { [...document.querySelectorAll('.pd-action .pd-btn')].find((b) => b.textContent === '切换').click(); }); await page.waitForTimeout(250);
  await clickBtn('.pd-action.best', '预演方案'); await page.waitForSelector('.m9-options'); await page.waitForTimeout(300);

  // 方案预演
  await shot('4-options'); await lintScreen('方案');
  const opts = await page.$$eval('.pd-compare .pd-option', (r) => r.length);
  const S = core.simulateAll(lib.samples.make, lib, A.rootCause.id);
  if (opts !== S.sims.length) errors.push('方案数 ' + opts + ' vs ' + S.sims.length);
  const net0 = await kpiVal(5);
  await page.$eval('.m9-params input[type=range]', (el) => { el.value = el.max; el.dispatchEvent(new Event('change', { bubbles: true })); }); await page.waitForTimeout(300);
  const net1 = await kpiVal(5); if (net0 === net1) errors.push('调参数后净效益未变化');
  await shot('4b-options-param');
  await page.click('.pd-compare .pd-option:nth-child(1)'); await page.waitForTimeout(250);
  const cur = await kpiVal(4); if (cur.indexOf('A') !== 0) errors.push('切换方案失败 ' + cur);
  await page.click('.pd-compare .pd-option:nth-child(' + (S.sims.findIndex((s) => s.recommended) + 1) + ')'); await page.waitForTimeout(250);
  await clickBtn('.m9-options .pd-card.c4 .ft', '发起审批'); await page.waitForSelector('.m9-approval'); await page.waitForTimeout(300);

  // 审批
  await shot('5-approval'); await lintScreen('审批');
  const signs = await page.$$eval('.m9-sign .s', (r) => r.length); if (signs !== lib.approvalRules.signers.length) errors.push('会签条数 ' + signs);
  if (parseInt(await kpiVal(1), 10) !== 1) errors.push('待终批计数 ' + (await kpiVal(1)));
  await page.fill('.m9-final textarea', '同意，按节点推进');
  await clickBtn('.m9-final', '批准并形成决议'); await page.waitForSelector('.m9-exec'); await page.waitForTimeout(400);

  // 执行
  await shot('6-execute'); await lintScreen('执行');
  const decs = await page.$$eval('.pd-card.c7 .pd-table tbody tr', (r) => r.length); if (decs !== lib.samples.make.decisions.length + 1) errors.push('决议行数 ' + decs);
  const dtitle = await text('.c5 .pd-card.accent .hd .t'); if (dtitle.indexOf('D-2609-01') !== 0) errors.push('新决议未聚焦 ' + dtitle);
  const ms = await page.$$eval('.m9-ms .m', (r) => r.length); if (ms < 2) errors.push('节点数 ' + ms);
  await clickBtn('.m9-ms', '完成'); await page.waitForTimeout(300);
  const doneCnt = await page.$$eval('.m9-ms .m.done', (r) => r.length); if (doneCnt !== 1) errors.push('节点完成未生效 ' + doneCnt);
  await shot('6b-execute-milestone');
  const rep = await text('.pd-pre'); if (rep.indexOf('【决策月报】') !== 0 || rep.indexOf('本期处置') < 0 || rep.indexOf('D-2609-01') < 0) errors.push('月报内容异常');
  await page.evaluate(() => { [...document.querySelectorAll('.pd-card.c7 .pd-table tbody tr')].find((r) => r.textContent.indexOf('复盘未达标') >= 0).click(); }); await page.waitForTimeout(250);
  if (!(await page.$('.m9-review'))) errors.push('复盘决议无复盘块');
  await shot('6c-execute-review');
  await clickBtn('.m9-exec .pd-card .ft', '发送到微信'); await page.waitForSelector('.modal'); await shot('6d-execute-wechat'); await page.click('.modal .btn');
  if (!(await page.$('.rail .qr.ready'))) errors.push('二维码未高亮');

  // 驳回路径：再发起一单并驳回
  await page.click('.pd-tabs .tab:nth-child(4)'); await page.waitForSelector('.m9-options'); await page.waitForTimeout(250);
  await page.click('.pd-compare .pd-option:nth-child(1)'); await page.waitForTimeout(250);
  await clickBtn('.m9-options .pd-card.c4 .ft', '发起审批'); await page.waitForSelector('.m9-approval'); await page.waitForTimeout(300);
  await page.fill('.m9-final textarea', '先解除瓶颈再看'); await clickBtn('.m9-final', '驳回'); await page.waitForTimeout(300);
  const rejected = await page.$('.m9-final .pd-chip.done'); if (!rejected) errors.push('驳回后无标记');
  await shot('5b-approval-rejected');

  // 回驾驶舱：动作写回
  await page.click('.pd-tabs .tab:nth-child(2)'); await page.waitForSelector('.m9-board'); await page.waitForTimeout(300);
  await shot('7-board-after');
  const logs = await page.$$eval('.m9-log .l', (r) => r.length); if (logs < 4) errors.push('驾驶舱动作记录 ' + logs);
  await page.click('#home-link'); await page.waitForSelector('.grid'); await page.click('.card[data-id="m9"]'); await page.waitForSelector('.pd-app');
  if ((await text('#cr-spent')) !== '100') errors.push('重进后积分异常');
  await page.click('.rail .link'); await page.waitForSelector('.rail .menu'); await page.click('.rail .menu button:nth-child(2)'); await page.waitForTimeout(300);
  await shot('8-switch-company'); console.log('切换企业后：' + (await text('.pd-top .co')).split('\n')[0]);
  await browser.close();
  if (errors.length) { console.error('FAIL\n' + errors.join('\n')); process.exit(1); }
  console.log('m9 走查通过 · 截图 ' + fs.readdirSync(out).length + ' 张 → ' + out);
})().catch((e) => { console.error(e); process.exit(1); });
