// 模块 3：打印态下逐页量高，A4 版心 703px，溢出即报
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const ex = path.join(__dirname, '..', '..', 'skills', '03-roi-calculator', 'examples');
const key = process.argv[2] || 'S1';
const S = JSON.parse(fs.readFileSync(path.join(ex, key + '.input.json'), 'utf8'));
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 703, height: 1123 } });
  await p.goto('file://' + path.join(__dirname, '..', 'dist', 'index.html') + '?station=3');
  await p.waitForSelector('.grid, .form-grid');
  await p.click('.card[data-id="m3"]'); await p.waitForSelector('.m3-pane');
  // 直接把状态灌进去再出报告：量高只关心版式，不重复走输入流程
  await p.evaluate((inp) => {
    const core = window.DGG.coreM3, D = window.DGG_DATA;
    const bundle = { fields: D.fields, industries: D.industries, sectors: D.m3.sectors, constants: D.m3.constants,
      levers: D.m3.levers, sceneLevers: D.m3.sceneLevers, benchmarks: D.m3.benchmarks, investmentProfile: D.m3.investmentProfile, reportText: D.m3.reportText,
      credits: D.credits, lintWords: D.lintWords, promptTemplate: D.m3.promptTemplate };
    const out = core.compute(inp, bundle);
    if (!out.ok) throw new Error(JSON.stringify(out.errors));
    out.meta.date = '20260917';
    window.__M3_INJECT(inp, out);
  }, S);
  await p.waitForSelector('.report .page[data-page="1"]', { timeout: 20000 });
  await p.waitForTimeout(500);
  await p.emulateMedia({ media: 'print' });
  await p.waitForTimeout(300);
  // 与模块 1 / 2 同一口径：A4 高 297mm 减上下各 10mm 页边距
  const A4 = Math.round((297 - 20) * 96 / 25.4);
  const rows = await p.evaluate(() => [...document.querySelectorAll('.report .page')].map((el, i) => ({
    n: i + 1, h: Math.round(el.getBoundingClientRect().height)
  })));
  await b.close();
  const over = rows.filter((r) => r.h > A4);
  console.log(`${key} · A4 可打印高度 ≈ ${A4}px`);
  console.log(`逐页量高：${rows.length} 页，溢出 ${over.length} 页，最高 ${Math.max(...rows.map((r) => r.h))}px`);
  over.forEach((r) => console.log(`  ✘ 第 ${r.n} 页 ${r.h}px（超出 ${r.h - A4}px）`));
  process.exitCode = over.length ? 1 : 0;
})();
