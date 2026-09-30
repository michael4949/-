// 模块 3 全流程：企业画像（现场输入）→ 场景组合多选 → 逐场景收益参数 → 投入方案 → 测算台 → 34 页报告
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const url = 'file://' + (process.env.HTML || path.join(__dirname, '..', 'dist', 'index.html'));
const out = path.join(__dirname, process.env.OUT || 'shots-m3'); fs.mkdirSync(out, { recursive: true });
const ex = path.join(__dirname, '..', '..', 'skills', '03-roi-calculator', 'examples');
const S1 = JSON.parse(fs.readFileSync(path.join(ex, 'S1.input.json'), 'utf8'));
const golden = JSON.parse(fs.readFileSync(path.join(ex, 'S1.output.json'), 'utf8'));
const errors = [];
function pdfPages(f) { return (fs.readFileSync(f).toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length; }
const setVal = (el, v) => el.evaluate((e, x) => {
  const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  s.call(e, String(x)); e.dispatchEvent(new Event('input', { bubbles: true }));
}, v);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 1100 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url + '?station=3');
  await page.waitForSelector('.grid, .form-grid');
  await page.click('.card[data-id="m3"]');
  await page.waitForSelector('.m3-pane');

  // 屏 1：企业画像全部走界面输入，不走后门
  await setVal(await page.$('.m3-txt'), S1.profile.name);
  await page.evaluate((prof) => {
    const byLabel = (lb) => [...document.querySelectorAll('.m3-field')]
      .find((x) => x.querySelector('label') && x.querySelector('label').textContent.startsWith(lb));
    const clickIn = (fieldEl, text) => {
      if (!fieldEl) return;
      const chips = [...fieldEl.querySelectorAll('.ch')];
      const hit = text ? chips.find((c) => c.textContent.trim() === text) : null;
      (hit || chips[0]).click();
    };
    const D = window.DGG_DATA;
    const opt = (key, v) => { const f = D.fields.find((x) => x.key === key); const o = f && f.options && f.options.find((x) => x.v === v); return o ? o.t : null; };
    clickIn(byLabel('人员规模'), opt('size', prof.size));
    clickIn(byLabel('上年营收'), opt('revenue', prof.revenue));
    clickIn(byLabel('成立年限'), opt('years', prof.years));
    clickIn(byLabel('企业性质'), opt('ownership', prof.ownership));
    clickIn(byLabel('主要客户类型'), opt('customers', prof.customers));
    clickIn(byLabel('数字化专职人员'), opt('itStaff', prof.itStaff));
    clickIn(byLabel('分支机构'), opt('branches', prof.branches));
    clickIn(byLabel('海外业务'), opt('overseas', prof.overseas));
    clickIn(byLabel('填表人'), opt('role', prof.role));
    const sysField = byLabel('现有业务系统');
    (prof.systems || []).forEach((s) => clickIn(sysField, opt('systems', s)));
  }, S1.profile);
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${out}/land-1-profile.png`, fullPage: true });
  const nx1 = await page.$('#m3-next1');
  if (await nx1.isDisabled()) throw new Error('屏 1 下一步被禁用：' + await page.$$eval('.m3-block', (n) => n.map((x) => x.textContent).join(' | ')));
  await nx1.click(); await page.waitForTimeout(300);

  // 屏 2：按 golden 的组合逐个勾选
  await page.evaluate((ids) => {
    const D = window.DGG_DATA;
    const nameOf = (id) => { let n = null; Object.keys(D.m3.sectors).forEach((k) => (D.m3.sectors[k].scenes || []).forEach((s) => { if (s.id === id) n = s.name; })); return n; };
    ids.forEach((id) => {
      const nm = nameOf(id);
      const card = [...document.querySelectorAll('.m3-scenes .sc')].find((c) => c.querySelector('.n').textContent.trim() === nm);
      if (!card) throw new Error('找不到场景卡：' + nm);
      if (!card.classList.contains('on')) card.click();
    });
  }, S1.scenes.map((x) => x.sceneId));
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}/land-2-scenes.png`, fullPage: true });
  const picked = await page.$$eval('.m3-scenes .sc.on', (n) => n.length);
  console.log('场景组合：已选', picked, '个（期望', S1.scenes.length, '）');
  await page.click('.m3-act .btn:not(.ghost)'); await page.waitForTimeout(300);

  // 屏 3：逐场景填收益参数
  await page.evaluate((scenes) => {
    const D = window.DGG_DATA;
    const nameOf = (id) => { let n = null; Object.keys(D.m3.sectors).forEach((k) => (D.m3.sectors[k].scenes || []).forEach((s) => { if (s.id === id) n = s.name; })); return n; };
    const labelOf = (key) => { let l = key; D.m3.levers.items.forEach((it) => it.fields.forEach((f) => { if (f.key === key) l = f.label; })); return l; };
    const cards = [...document.querySelectorAll('.m3-lv')];
    scenes.forEach((sc) => {
      const nm = nameOf(sc.sceneId);
      const card = cards.find((c) => c.querySelector('.hd b').textContent.trim() === nm);
      if (!card) throw new Error('找不到场景卡：' + nm);
      Object.keys(sc.gain || {}).forEach((k) => {
        const row = [...card.querySelectorAll('.m3-nrow')].find((r) => r.querySelector('.lb').textContent.startsWith(labelOf(k)));
        if (!row) return;
        const inp = row.querySelector('input');
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(inp, String(sc.gain[k])); inp.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });
  }, S1.scenes);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}/land-3-gain.png`, fullPage: true });
  await page.click('.m3-act .btn:not(.ghost)'); await page.waitForTimeout(400);

  // 屏 4：投入方案（全部留空，走规模推导）
  await page.screenshot({ path: `${out}/land-4-plan.png`, fullPage: true });
  const nx4 = await page.$('.m3-act .btn:not(.ghost)');
  if (await nx4.isDisabled()) throw new Error('屏 4 进入测算台被禁用：' + await page.$$eval('.m3-block', (n) => n.map((x) => x.textContent).join(' | ')));
  await nx4.click();
  await page.waitForSelector('.m3-console');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/land-5-board.png`, fullPage: true });

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
  for (const n of [1, 3, 5, 6, 12, 14, 17, 22, 29]) {
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
