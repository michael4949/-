// AI软件开发 六屏走查：接入（需求句解析 · 改词实时重算 · 扣积分）→ 生成应用（页面逐条点亮 / 怎么生成的 / 推荐字段写回）→ 试用（校验失败 / 三步走单 / 角色切换 · PC 看板联动）
// → 测试与产物（用例逐行执行 / 采纳权限建议 / 数据字典 / 接口清单）→ 发布（屏内二维码 / 发布流水 / 发布记录）→ 迭代交付（追加需求 → V1.1.0 / 变更清单 / 交付报告 / 发送）；重进落回上次屏、积分不重复扣
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const url = 'file://' + (process.env.HTML || path.join(__dirname, '..', 'dist', 'index.html'));
const out = path.join(__dirname, process.env.OUT || 'shots-m11'); fs.mkdirSync(out, { recursive: true });
const core = require('../../skills/11-ai-dev/core/build.js');
const lib = require('../../skills/11-ai-dev/scripts/load-data.js')(); lib.qrBase = 'https://platform.dgg.cn';
const lint = require('../../skills/_shared/lint.js')(lib.lintWords);
const errors = [];
const W = +(process.env.W || 1920), H = +(process.env.H || 1080);
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  const shot = (n) => page.screenshot({ path: `${out}/${n}.png` });
  const lintScreen = async (n) => { const t = await page.$eval('.pd-app', (e) => e.innerText); const hits = lint.hard(t); if (hits.length) errors.push(n + ' 禁词: ' + hits.join(',')); if (/\{\w+\}|undefined|NaN/.test(t)) errors.push(n + ' 文本异常（占位符 / undefined / NaN）'); if (t.indexOf('刀') >= 0 || t.indexOf('承诺') >= 0) errors.push(n + ' 用词: 刀 / 承诺'); };
  const text = (sel) => page.$eval(sel, (e) => e.innerText.trim());
  const kpiVal = (i) => page.$eval(`.pd-kpis .pd-kpi:nth-child(${i}) .v`, (e) => e.textContent.trim());
  const clickBtn = (scope, label) => page.evaluate(([s, l]) => { const b = [...document.querySelectorAll(s + ' .pd-btn')].find((x) => x.textContent.trim() === l || x.textContent.trim().indexOf(l) === 0); if (!b) throw new Error('no button ' + l + ' in ' + s); b.click(); }, [scope, label]);
  const hasBtn = (scope, label) => page.evaluate(([s, l]) => !![...document.querySelectorAll(s + ' .pd-btn')].find((x) => x.textContent.trim().indexOf(l) === 0), [scope, label]);
  const num = (s) => parseInt(String(s).replace(/[^\d]/g, ''), 10);
  let d = core.ensure(lib.samples.make); let R = core.run(d, lib);

  await page.goto(url + '?station=3'); await page.waitForSelector('.grid');
  await page.click('.card[data-id="m11"]'); await page.waitForSelector('.m11-connect');
  await shot('1-connect'); await lintScreen('接入');
  const spent0 = await text('#cr-spent');
  const presetN = await page.$$eval('.m11-req .pd-list .pd-item', (r) => r.length); if (presetN !== R.presets.length) errors.push('预置句行数 ' + presetN + ' vs ' + R.presets.length);
  if (!(await page.$('.m11-chip.obj'))) errors.push('无业务对象芯片');
  // 改词：设备员 → 维修工，芯片实时重算
  const variant = R.text.replace('设备员', '维修工');
  await page.evaluate((v) => { const ta = document.querySelector('.m11-req textarea'); ta.value = v; ta.dispatchEvent(new Event('input', { bubbles: true })); }, variant); await page.waitForTimeout(300);
  const chipsTxt = await text('.m11-chips'); if (chipsTxt.indexOf('设备员') < 0 || chipsTxt.indexOf('维修工') < 0) errors.push('改词后角色芯片未命中 维修工 → 设备员');
  await shot('1b-connect-variant');
  await page.click('.m11-req .pd-list .pd-item:nth-child(1)'); await page.waitForTimeout(300);
  await page.click('.m11-go .pd-btn.primary');
  await page.waitForSelector('.m11-build'); await page.waitForTimeout(2400);
  d = core.generate(core.pickPreset(d, lib, 0), lib); R = core.run(d, lib);
  await shot('2-build'); await lintScreen('生成应用');
  const spent1 = await text('#cr-spent');
  if (spent0 !== '0' || spent1 !== '100') errors.push('积分扣减异常 ' + spent0 + ' → ' + spent1);
  if (num(await kpiVal(1)) !== R.kpi.pages || num(await kpiVal(2)) !== R.kpi.fields || num(await kpiVal(6)) !== R.kpi.tests) errors.push('生成屏 KPI ' + (await kpiVal(1)) + '/' + (await kpiVal(2)) + '/' + (await kpiVal(6)) + ' vs ' + R.kpi.pages + '/' + R.kpi.fields + '/' + R.kpi.tests);
  const pageRows = await page.$$eval('.m11-pages .pd-item', (r) => r.length); if (pageRows !== R.pages.length) errors.push('页面清单行数 ' + pageRows + ' vs ' + R.pages.length);
  if (await page.$('.m11-pages .pd-item.m11-pending')) errors.push('页面清单未全部点亮');
  if (!(await page.$('.m11-phone .fld'))) errors.push('手机表单未渲染');
  await clickBtn('.m11-build', '怎么生成的'); await page.waitForSelector('.pd-drawer'); await page.waitForTimeout(250);
  await shot('2b-build-judge'); await lintScreen('怎么生成的');
  await page.click('.pd-drawer .close'); await page.waitForTimeout(200);
  // 推荐字段写回
  const recKey = R.recommended[0].key;
  await page.click('.m11-rec button'); await page.waitForTimeout(500);
  d = core.addField(d, lib, recKey); R = core.run(d, lib);
  if (num(await kpiVal(2)) !== R.kpi.fields || num(await kpiVal(6)) !== R.kpi.tests) errors.push('推荐字段后 KPI ' + (await kpiVal(2)) + '/' + (await kpiVal(6)) + ' vs ' + R.kpi.fields + '/' + R.kpi.tests);
  if (!(await page.$('.m11-phone .fld.new'))) errors.push('手机表单未出现新字段');
  const tag = await text('.m11-tags'); if (tag.indexOf(R.spec.specVer) < 0) errors.push('页头规格版本 ' + tag + ' 不含 ' + R.spec.specVer);
  await shot('2c-build-field');

  // 试用
  await page.click('.pd-tabs .tab:nth-child(3)'); await page.waitForSelector('.m11-try'); await page.waitForTimeout(400);
  await shot('3-try'); await lintScreen('试用');
  if (num(await kpiVal(2)) !== R.stats.open) errors.push('看板待接单 ' + (await kpiVal(2)) + ' vs ' + R.stats.open);
  // 手动清空必填字段提交 → 字段下方出错
  await page.evaluate(() => { const ta = document.querySelector('.m11-phone textarea[data-key]'); if (ta) ta.value = ''; }); await page.click('.m11-phone .btn'); await page.waitForTimeout(300);
  if (!(await page.$('.m11-phone .fld.bad .err'))) errors.push('校验失败未在字段下方提示');
  await shot('3a-try-error');
  // 三步走单
  const stepsN = R.script.length;
  for (let i = 0; i < stepsN; i++) { await clickBtn('.m11-try', '走一步'); await page.waitForTimeout(500); d = core.nextScript(d, lib); R = core.run(d, lib); if (!d.state.lastResult.ok) errors.push('脚本第 ' + (i + 1) + ' 步失败 ' + d.state.lastResult.error); if (num(await kpiVal(2)) !== R.stats.open) errors.push('第 ' + (i + 1) + ' 步后待接单 ' + (await kpiVal(2)) + ' vs ' + R.stats.open); await shot('3' + 'bcd'[i] + '-try-step' + (i + 1)); }
  await lintScreen('走单');
  if (await hasBtn('.m11-try', '走一步')) errors.push('脚本走完后仍可点走一步');
  if (num(await page.$eval('.pd-kpis .pd-kpi:nth-child(4) .v', (e) => e.textContent)) !== R.stats.done) errors.push('看板已完成 vs ' + R.stats.done);
  // 切主管视角
  await page.click('.m11-seg button:nth-child(3)'); await page.waitForTimeout(300);
  if (!(await page.$('.m11-phone .kpis'))) errors.push('主管视角手机看板未渲染');
  await shot('3e-try-lead');

  // 测试与产物
  await page.click('.pd-tabs .tab:nth-child(4)'); await page.waitForSelector('.m11-test'); await page.waitForTimeout(80 * R.testResult.total + 600);
  await shot('4-test'); await lintScreen('测试');
  const trows = await page.$$eval('.m11-tests tbody tr', (r) => r.length); if (trows !== R.testResult.total) errors.push('用例行数 ' + trows + ' vs ' + R.testResult.total);
  if (await page.$('.m11-tests tbody tr.hide')) errors.push('用例未全部揭示');
  const failChips = await page.$$eval('.m11-tests .res .pd-chip.late', (r) => r.length); if (failChips !== R.testResult.failed) errors.push('失败用例 chip ' + failChips + ' vs ' + R.testResult.failed);
  const mrows = await page.$$eval('.m11-matrix tbody tr', (r) => r.length); if (mrows !== R.spec.roles.length) errors.push('权限矩阵行数 ' + mrows + ' vs ' + R.spec.roles.length);
  await clickBtn('.m11-sugg', '采纳'); await page.waitForTimeout(600);
  d = core.grantPermission(d, lib, R.suggestion.role, R.suggestion.page, '查看'); R = core.run(d, lib);
  if (num(await kpiVal(1)) !== R.testResult.total) errors.push('采纳后用例数 ' + (await kpiVal(1)) + ' vs ' + R.testResult.total);
  if (!(await page.$('.m11-matrix .ops i.new'))) errors.push('矩阵未出现新勾');
  await shot('4b-test-granted'); await lintScreen('采纳');
  await page.click('.m11-test .pd-list .pd-item:nth-child(1)'); await page.waitForSelector('.pd-drawer'); await page.waitForTimeout(250);
  const dictRows = await page.$$eval('.pd-drawer .pd-table tbody tr', (r) => r.length); if (dictRows !== R.schema.columns.length) errors.push('数据字典行数 ' + dictRows + ' vs ' + R.schema.columns.length);
  await shot('4c-test-dict'); await lintScreen('数据字典'); await page.click('.pd-drawer .close'); await page.waitForTimeout(200);
  await page.click('.m11-test .pd-list .pd-item:nth-child(2)'); await page.waitForSelector('.pd-drawer'); await page.waitForTimeout(250);
  await page.click('.pd-drawer .pd-table tbody tr:nth-child(4)'); await page.waitForTimeout(250);
  const apiTxt = await text('.pd-drawer'); if (apiTxt.indexOf(R.suggestion.roleTitle) < 0) errors.push('接口清单未含开放后的角色');
  await shot('4d-test-api'); await lintScreen('接口'); await page.click('.pd-drawer .close'); await page.waitForTimeout(200);

  // 发布
  await page.click('.pd-tabs .tab:nth-child(5)'); await page.waitForSelector('.m11-ship'); await page.waitForTimeout(400);
  await shot('5-ship'); await lintScreen('发布');
  if (!(await page.$('.m11-phone .entry .qr svg'))) errors.push('屏内二维码未生成');
  const qrFoot = await text('.m11-ship .c5 .pd-card .ft'); if (qrFoot !== R.qrText) errors.push('二维码内容 ' + qrFoot + ' vs ' + R.qrText);
  const checks = await page.$$eval('.m11-checks .c', (r) => r.length); if (checks !== R.checklist.total) errors.push('检查项 ' + checks);
  await clickBtn('.m11-ship', '发布到正式环境'); await page.waitForTimeout(2400);
  d = core.publish(d, lib); R = core.run(d, lib);
  if (!d.state.lastResult.ok) errors.push('发布失败 ' + d.state.lastResult.error);
  const relRows = await page.$$eval('.m11-ship .pd-table tbody tr', (r) => r.length); if (relRows !== R.releases.length) errors.push('发布记录行数 ' + relRows + ' vs ' + R.releases.length);
  const shipTxt = await text('.m11-ship'); if (shipTxt.indexOf('已上线') < 0) errors.push('发布后未显示已上线');
  await shot('5b-ship-live'); await lintScreen('上线');

  // 迭代交付
  await page.click('.pd-tabs .tab:nth-child(6)'); await page.waitForSelector('.m11-iterate'); await page.waitForTimeout(400);
  await shot('6-iterate'); await lintScreen('迭代');
  const fuRows = await page.$$eval('.m11-follow .pd-item', (r) => r.length); if (fuRows !== R.followUps.length) errors.push('追加句行数 ' + fuRows);
  await page.click('.m11-follow .pd-item:nth-child(1)'); await page.waitForTimeout(300);
  const taVal = await page.$eval('.m11-iterate textarea', (e) => e.value); if (taVal !== R.followUps[0].text) errors.push('点追加句未填入文本框');
  await clickBtn('.m11-iterate', '生成 V1.1.0'); await page.waitForTimeout(700);
  d = core.applyDelta(d, lib, R.followUps[0].text); R = core.run(d, lib);
  if (!d.state.lastResult.ok) errors.push('追加失败 ' + d.state.lastResult.error);
  if (!(await page.$('.pd-compare'))) errors.push('无版本对比');
  const last = R.changes[R.changes.length - 1];
  const bgRows = await page.$$eval('.m11-iterate .c7 .pd-table tbody tr', (r) => r.length); if (bgRows !== last.items.length) errors.push('变更清单行数 ' + bgRows + ' vs ' + last.items.length);
  if (!(await page.$('.m11-phone .stars'))) errors.push('手机未落在评价页');
  const tag2 = await text('.m11-tags'); if (tag2.indexOf('V1.1.0') < 0) errors.push('页头版本未更新 ' + tag2);
  await shot('6b-iterate-v110'); await lintScreen('V1.1.0');
  await clickBtn('.m11-iterate', '交付报告'); await page.waitForSelector('.pd-drawer'); await page.waitForTimeout(250);
  const pre = await text('.pd-drawer .pd-pre'); if (pre.indexOf('【') !== 0 || pre.indexOf('V1.1.0') < 0 || /E-\d{3}/.test(pre.split('【收件】')[1] || '')) errors.push('交付报告文本异常');
  await shot('6c-iterate-report'); await lintScreen('交付报告'); await page.click('.pd-drawer .close'); await page.waitForTimeout(200);
  await clickBtn('.m11-iterate', '发送到微信'); await page.waitForSelector('.modal'); await page.waitForTimeout(300);
  await shot('6d-iterate-sent'); await page.click('.modal .btn'); await page.waitForTimeout(300);
  // 回到首页再进：仍在最后一屏，积分不重复扣
  await page.evaluate(() => { location.hash = '#/home'; }); await page.waitForTimeout(400);
  await page.click('.card[data-id="m11"]'); await page.waitForTimeout(500);
  if (!(await page.$('.m11-iterate'))) errors.push('重进未落回上次屏');
  if ((await text('#cr-spent')) !== '100') errors.push('重进重复扣积分');
  await browser.close();
  if (errors.length) { console.error('走查失败:\n' + errors.join('\n')); process.exit(1); }
  console.log('AI软件开发 六屏走查通过 · 截图 ' + fs.readdirSync(out).length + ' 张 → ' + out);
})().catch((e) => { console.error(e); process.exit(1); });
