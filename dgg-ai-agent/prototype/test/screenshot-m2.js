// 模块 2 全流程：画像 → 痛点 → 现状 → 排序台（含权重拖动重排）→ 42 页报告；横竖屏与打印各截图
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const url = 'file://' + path.join(__dirname, '..', 'dist', 'index.html');
const out = path.join(__dirname, 'shots-m2'); fs.mkdirSync(out, { recursive: true });
const ex = path.join(__dirname, '..', '..', 'skills', '02-scene-ranking', 'examples');
const S1 = JSON.parse(fs.readFileSync(path.join(ex, 'S1.input.json'), 'utf8'));
const golden = JSON.parse(fs.readFileSync(path.join(ex, 'S1.output.json'), 'utf8'));
const errors = [];

async function runFlow(page, tag) {
  page.on('pageerror', (e) => errors.push(tag.name + ': ' + e.message));
  await page.goto(url + '?station=' + tag.station);
  await page.waitForSelector('.grid, .form-grid');
  if (tag.station !== '1') { await page.click('.card[data-id="m2"]'); }
  await page.waitForSelector('.form-grid');
  if (tag.station === '1') { await page.click('.mod-head .crumb button'); await page.click('.card[data-id="m2"]'); await page.waitForSelector('.form-grid'); }
  await page.click('.rail .link'); await page.click('.rail .menu button:first-child'); await page.waitForTimeout(200);
  await page.screenshot({ path: `${out}/${tag.name}-1-input.png` });
  await page.click('button:has-text("下一步：选痛点")');
  await page.waitForSelector('.pain-wrap');
  for (const p of S1.pains) {
    await page.click(`.pitem[data-id="${p.id}"] .t`);
    await page.click(`.pitem[data-id="${p.id}"] .dots button[data-sev="${p.severity}"]`);
  }
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${out}/${tag.name}-2-pains.png` });
  await page.click('button:has-text("下一步：现状与目标")');
  await page.waitForSelector('.cond-grid');
  for (const [k, v] of Object.entries(S1.conditions)) await page.click(`.cond .opts button[data-k="${k}"][data-v="${v}"]`);
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${out}/${tag.name}-3-cond.png` });
  await page.click('button:has-text("生成场景排序")');
  await page.waitForSelector('.rank-tbl tbody tr');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}/${tag.name}-4-board.png` });
  return await page.evaluate(() => ({
    rows: document.querySelectorAll('.rank-tbl tbody tr').length,
    top: [...document.querySelectorAll('.rank-tbl tbody tr')].slice(0, 5).map((tr) => tr.querySelector('.nm').textContent.trim() + '|' + tr.querySelector('.sc').textContent.trim()),
    verdict: document.querySelector('.board .bcard div[style*="font-size:19px"]').textContent.trim(),
    spent: document.getElementById('cr-spent').textContent, left: document.getElementById('cr-left').textContent,
    preset: [...document.querySelectorAll('.presets button')].find((b) => b.classList.contains('on'))?.textContent
  }));
}
function pdfPages(file) { const d = fs.readFileSync(file); return (d.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length; }

(async () => {
  const browser = await chromium.launch();
  let page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const land = await runFlow(page, { name: 'land', station: '3' });

  // 权重拖动 → 实时重排
  await page.evaluate(() => {
    const rg = document.querySelector('.wrow[data-k="cycle"] input');
    rg.value = '55'; rg.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => ({
    top: [...document.querySelectorAll('.rank-tbl tbody tr')].slice(0, 5).map((tr) => tr.querySelector('.nm').textContent.trim() + '|' + tr.querySelector('.sc').textContent.trim()),
    preset: [...document.querySelectorAll('.presets button')].find((b) => b.classList.contains('on'))?.textContent
  }));
  await page.screenshot({ path: `${out}/land-5-board-reweighted.png` });

  // 预设按钮 + 切换选中行
  await page.click('.presets button:nth-child(3)');
  await page.waitForTimeout(250);
  const preset3 = await page.evaluate(() => [...document.querySelectorAll('.rank-tbl tbody tr')].slice(0, 3).map((tr) => tr.querySelector('.nm').textContent.trim()));
  await page.click('.presets button:nth-child(1)');
  await page.waitForTimeout(200);
  await page.click('.rank-tbl tbody tr:nth-child(4)');
  await page.waitForTimeout(200);
  const selName = await page.evaluate(() => document.querySelector('.detail .hd .t').textContent.trim());
  await page.click('button:has-text("看全部")');
  await page.waitForTimeout(250);
  const allRows = await page.evaluate(() => document.querySelectorAll('.rank-tbl tbody tr').length);
  await page.click('button:has-text("只看前 8 个")');
  await page.waitForTimeout(150);

  // 报告
  await page.click('button:has-text("出具完整报告")');
  await page.waitForSelector('.report .page[data-page="1"]');
  await page.waitForTimeout(700);
  const rep = await page.evaluate(() => ({
    pages: document.querySelectorAll('.report .page').length,
    brief: document.querySelectorAll('.report .page.brief').length,
    toc: document.querySelectorAll('.toc button').length,
    nav: document.querySelectorAll('#m2-nav-tbl tr').length,
    cover: document.querySelector('.m2-cover .pick .nm').textContent.trim(),
    coverScore: [...document.querySelectorAll('.m2-cover svg[aria-label="综合得分"] text')].map((t) => t.textContent.trim()).find((t) => t.includes('.')) || ''
  }));
  await page.screenshot({ path: `${out}/land-6-report-top.png` });
  const shots = [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 14, 15, 16, 17, 24, 25, 26, 27, 28, 30, 33, 34, 36, 40, 42];
  for (const n of shots) {
    const el = page.locator(`.report .page[data-page="${n}"]`);
    if (!(await el.count())) continue;
    await el.scrollIntoViewIfNeeded(); await page.waitForTimeout(110);
    await el.screenshot({ path: `${out}/land-p${String(n).padStart(2, '0')}.png` });
  }
  await page.emulateMedia({ media: 'print' });
  await page.pdf({ path: `${out}/m2-print-full.pdf`, format: 'A4', printBackground: true, margin: { top: '10mm', bottom: '10mm', left: '12mm', right: '12mm' } });
  await page.evaluate(() => document.body.classList.add('print-brief'));
  await page.pdf({ path: `${out}/m2-print-brief.pdf`, format: 'A4', printBackground: true, margin: { top: '10mm', bottom: '10mm', left: '12mm', right: '12mm' } });
  await page.evaluate(() => document.body.classList.remove('print-brief'));
  await page.emulateMedia({ media: 'screen' });
  await page.close();

  page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const port = await runFlow(page, { name: 'port', station: '1' });
  await page.close();
  await browser.close();

  const gTop = golden.ranked.slice(0, 5).map((s) => s.name + '|' + s.score.toFixed(1));
  const ok1 = JSON.stringify(land.top) === JSON.stringify(gTop);
  const ok2 = land.spent === '20' && land.left === '9,980';
  const ok3 = land.verdict === golden.verdict.headline;
  const ok4 = JSON.stringify(after.top) !== JSON.stringify(land.top) && !after.preset;
  const ok5 = rep.pages === 42 && rep.cover === golden.ranked[0].name;
  console.log('屏上（横屏）:', JSON.stringify(land, null, 0));
  console.log('内核 golden :', JSON.stringify(gTop));
  console.log(ok1 ? '✔ 排序表与内核逐字一致' : '✘ 排序表不一致');
  console.log(ok2 ? '✔ 积分 20 / 剩余 9,980' : '✘ 积分不符');
  console.log(ok3 ? '✔ 结论横幅与内核一致' : '✘ 结论横幅不一致');
  console.log('拖动「见效周期」权重到 55% 后 Top5:', JSON.stringify(after.top));
  console.log(ok4 ? '✔ 权重拖动触发重排，预设自动切到自定义' : '✘ 权重拖动未改变排序');
  console.log('预设「先看条件」Top3:', JSON.stringify(preset3), '| 点第 4 行详情:', selName, '| 看全部行数:', allRows);
  console.log('报告:', JSON.stringify(rep));
  console.log(ok5 ? '✔ 报告 42 页，封面首选场景与内核一致' : '✘ 报告页数或封面不符');
  console.log('PDF 页数：完整', pdfPages(`${out}/m2-print-full.pdf`), '· 速览', pdfPages(`${out}/m2-print-brief.pdf`));
  console.log('竖屏排序表行数:', port.rows, '| 竖屏 Top1:', port.top[0]);
  if (errors.length) { console.log('JS 错误:'); errors.forEach((e) => console.log('  ' + e)); }
  process.exitCode = (ok1 && ok2 && ok3 && ok4 && ok5 && !errors.length) ? 0 : 1;
})();
