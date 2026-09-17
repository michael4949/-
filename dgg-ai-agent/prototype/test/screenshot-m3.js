// 模块 3 全流程：企业与场景 → 投入方案 → 收益端 → 测算台 → 28 页报告；核对屏幕与内核一致
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const url = 'file://' + path.join(__dirname, '..', 'dist', 'index.html');
const out = path.join(__dirname, 'shots-m3'); fs.mkdirSync(out, { recursive: true });
const ex = path.join(__dirname, '..', '..', 'skills', '03-roi-calculator', 'examples');
const S1 = JSON.parse(fs.readFileSync(path.join(ex, 'S1.input.json'), 'utf8'));
const golden = JSON.parse(fs.readFileSync(path.join(ex, 'S1.output.json'), 'utf8'));
const errors = [];
function pdfPages(f) { return (fs.readFileSync(f).toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length; }

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url + '?station=3');
  await page.waitForSelector('.grid, .form-grid');
  await page.click('.card[data-id="m3"]');
  await page.waitForSelector('.m3-pane');
  await page.click('.rail .link'); await page.click('.rail .menu button:first-child'); await page.waitForTimeout(200);
  await page.screenshot({ path: `${out}/land-1-scene.png` });

  // 屏 1：选场景
  await page.evaluate((id) => {
    const btns = [...document.querySelectorAll('.m3-scenes .sc')];
    const i = btns.findIndex((b) => b.querySelector('.n').textContent.trim() === '订单交付预警');
    btns[i >= 0 ? i : 0].click();
  }, S1.plan.sceneId);
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${out}/land-1-scene-picked.png` });
  await page.click('button:has-text("下一步：投入方案")');
  await page.waitForTimeout(200);

  // 屏 2：投入方案 —— 真的去点界面，不走后门
  const setNum = async (label, v) => {
    await page.evaluate(([lb, val]) => {
      const row = [...document.querySelectorAll('.m3-nrow')].find((r) => r.querySelector('.lb').textContent.includes(lb));
      if (!row) throw new Error('找不到输入行: ' + lb);
      const inp = row.querySelector('input');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(inp, String(val));
      inp.dispatchEvent(new Event('input', { bubbles: true }));
    }, [label, v]);
    await page.waitForTimeout(60);
  };
  const pickOpt = async (labelText) => {
    await page.evaluate((t) => {
      const b = [...document.querySelectorAll('.m3-opts .ob')].find((x) => x.querySelector('b').textContent.trim() === t);
      if (!b) throw new Error('找不到选项: ' + t); b.click();
    }, labelText);
    await page.waitForTimeout(80);
  };
  await pickOpt('高级版');
  await setNum('订阅套数', S1.plan.seats);
  await pickOpt('1 天');
  await setNum('另议项预算', S1.plan.customBudget);
  await pickOpt('表格为主');
  await setNum('推进人员数', S1.plan.setupPeople);
  await setNum('推进人员平均月薪', S1.plan.setupSalary);
  await page.screenshot({ path: `${out}/land-2-plan.png` });
  await page.click('button:has-text("下一步：收益端")');
  await page.waitForSelector('.m3-lv');
  await page.screenshot({ path: `${out}/land-3-gain.png` });

  // 屏 3：收益端填数 —— 同样走真实输入
  const GAIN_LABEL = { errorFreqMonthly: '月均发生次数', errorCostPerCase: '单次损失金额',
    opsPeople: '当前投入人数', opsHoursPerDay: '人均每日投入时长', opsSalary: '该岗位平均月薪',
    dealsMonthly: '月均成交单数', dealValue: '单均成交金额', grossMargin: '毛利率',
    relatedRevenueMonthly: '相关业务月营业额', tiedCapital: '占用资金规模',
    spendAnnual: '该科目年度支出', lostOutputMonthly: '月均受影响产值' };
  for (const k of Object.keys(S1.gain)) {
    if (GAIN_LABEL[k]) await setNum(GAIN_LABEL[k], S1.gain[k]);
  }
  await page.screenshot({ path: `${out}/land-3-gain-filled.png` });
  await page.click('button:has-text("进入测算台")');
  await page.waitForSelector('.m3-console');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/land-4-board.png`, fullPage: true });

  const shown = await page.evaluate(() => ({
    verdict: document.querySelector('.m3-console .verd .hl').textContent.trim(),
    figs: [...document.querySelectorAll('.m3-console .kf')].map((b) => b.querySelector('.k').textContent.trim() + '=' + b.querySelector('.v').textContent.trim())
  }));
  console.log('测算台结论:', shown.verdict);
  console.log('关键数字:', shown.figs.join(' | '));
  console.log('内核 golden :', golden.verdict.headline);
  const okVerdict = shown.verdict === golden.verdict.headline;
  console.log(okVerdict ? '✔ 屏幕与内核一致' : '✘ 屏幕与内核不一致');
  if (!okVerdict) process.exitCode = 1;

  await page.click('button:has-text("出具完整报告")');
  await page.waitForSelector('.report .page[data-page="1"]');
  await page.waitForTimeout(700);
  const info = await page.evaluate(() => ({
    pages: document.querySelectorAll('.report .page').length,
    brief: document.querySelectorAll('.report .page.brief').length,
    toc: document.querySelectorAll('.toc button').length
  }));
  console.log('报告:', JSON.stringify(info));
  for (const n of [1, 3, 6, 8, 11, 14, 17, 20, 24]) {
    const el = page.locator(`.report .page[data-page="${n}"]`);
    await el.scrollIntoViewIfNeeded(); await page.waitForTimeout(120);
    await el.screenshot({ path: `${out}/land-p${String(n).padStart(2, '0')}.png` });
  }
  await page.emulateMedia({ media: 'print' });
  const M = { top: '10mm', bottom: '10mm', left: '12mm', right: '12mm' };
  await page.pdf({ path: `${out}/m3-print-full.pdf`, format: 'A4', printBackground: true, margin: M });
  await page.evaluate(() => document.body.classList.add('print-brief'));
  await page.pdf({ path: `${out}/m3-print-brief.pdf`, format: 'A4', printBackground: true, margin: M });
  await page.emulateMedia({ media: 'screen' });
  console.log('PDF 页数：完整', pdfPages(`${out}/m3-print-full.pdf`), '· 速览', pdfPages(`${out}/m3-print-brief.pdf`));
  await browser.close();
  if (errors.length) { console.log('页面报错:'); errors.slice(0, 6).forEach((e) => console.log('  ' + e)); process.exitCode = 1; }
  else console.log('✔ 无页面报错');
})();
