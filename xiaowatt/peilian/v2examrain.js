/* 题库考试回归 · 雨淋阀：① 正确路径满 10 分 ② 关键错误路径（压力异常未发现 / 选错主变 / 错把电磁阀当启动阀 / 手动阀未全开）③ 拖动手柄 DOM 交互 */
const { chromium } = require('playwright');
const F = require('url').pathToFileURL(require('path').resolve(__dirname, 'dist', '小瓦特练_倒闸操作陪练舱_高保真原型.html')).href;
const w = (p, ms) => p.waitForTimeout(ms);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewportSize: { width: 1680, height: 950 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto(F + '#exam'); await w(p, 900);
  await p.evaluate(() => { window.__DH_MUTE = true; window.__DH_SPEED = 0.05; localStorage.clear(); });
  /* ① 正确路径 */
  await p.evaluate(() => { EX.arm.rainAbn = false; examStart('rain', 'teach'); }); await w(p, 300);
  await p.screenshot({ path: './shots/rain_s0.png' });
  await p.evaluate(() => examRun());
  await p.waitForFunction(() => EX.finished, { timeout: 90000 });
  const r1 = await p.evaluate(() => ({ score: EX.finished.score, errs: EX.finished.errs.length, steps: EX.finished.track.length, dims: EX.finished.dims }));
  console.log('run1 ok-path', JSON.stringify(r1));
  await p.screenshot({ path: './shots/rain_review.png', fullPage: true });
  /* ② 关键错误路径（压力异常注入） */
  await p.evaluate(() => { EX.arm.rainAbn = true; examStart('rain', 'exam'); }); await w(p, 300);
  await p.click('.hs[data-hs="pg1"]'); await w(p, 120); await p.click('[data-verdict="ok"]'); await w(p, 120);
  await p.click('.hs[data-hs="pg2"]'); await w(p, 120); await p.click('[data-verdict="ok"]'); await w(p, 120);   // 未发现压力异常 → 关键错误
  await p.evaluate(() => $$('.mask').forEach(m => m.remove()));
  await p.click('.hs[data-hs="pg2"]'); await w(p, 120); await p.click('[data-verdict="low"]'); await w(p, 120);  // 再查：发现异常
  await p.click('.hs[data-hs="vOut"]'); await w(p, 120); await p.click('[data-verdict="open"]'); await w(p, 120);
  await p.click('.hs[data-hs="vIn"]'); await w(p, 120); await p.click('[data-verdict="open"]'); await w(p, 120);
  const s0 = await p.evaluate(() => ({ done: EX.stDone, errs: EX.errs.map(e => e.kind + (e.crit ? '!' : '')) }));
  console.log('s0 abnormal', JSON.stringify(s0));
  await p.click('[data-exnext]'); await w(p, 200);
  await p.evaluate(() => examRun({ sA: 'wrong', sC1: 'wrong', sC2: 'wrong' }));
  await p.waitForFunction(() => EX.finished, { timeout: 90000 });
  const r2 = await p.evaluate(() => ({ score: EX.finished.score, kinds: EX.finished.errs.map(e => e.kind + (e.crit ? '!' : '')), crit: EX.finished.errs.filter(e => e.crit).length }));
  console.log('run2 crit-path', JSON.stringify(r2));
  /* ③ 拖动手柄 DOM 交互 */
  await p.evaluate(() => { EX.arm.rainAbn = false; examStart('rain', 'drill'); }); await w(p, 300);
  await p.evaluate(async () => { const zz = ms => new Promise(r => setTimeout(r, ms)); let g = 0; while (EX.exam && examStation().id !== 'sC2' && g++ < 30) { await examAuto('ok'); await zz(60); if (EX.stDone) examNext(); await zz(60); } });
  await p.waitForFunction(() => EX.exam && examStation().id === 'sC2', { timeout: 30000 });
  await p.screenshot({ path: './shots/rain_box.png' });
  const hb = await p.locator('[data-handle]').boundingBox();
  const svgb = await p.locator('#ex_svgroot').boundingBox();
  const cx = svgb.x + svgb.width * 440 / 960, cy = svgb.y + svgb.height * 300 / 540;
  await p.mouse.move(hb.x + hb.width / 2, hb.y + 10); await p.mouse.down();
  await p.mouse.move(cx + 60, cy - 120, { steps: 6 }); await p.mouse.move(cx + 140, cy - 10, { steps: 8 }); await p.mouse.move(cx + 150, cy + 6, { steps: 4 });
  await p.mouse.up(); await w(p, 300);
  const drag = await p.evaluate(() => ({ handle: Math.round(EX.st.handle), done: EX.stDone }));
  console.log('drag', JSON.stringify(drag));
  await p.screenshot({ path: './shots/rain_box_open.png' });
  await p.evaluate(() => examRun());
  await p.waitForFunction(() => EX.finished, { timeout: 60000 });
  await p.evaluate(() => examStart('rain', 'exam')); await w(p, 300);
  await p.evaluate(async () => { const zz = ms => new Promise(r => setTimeout(r, ms)); let g = 0; while (EX.exam && examStation().id !== 'sD' && g++ < 40) { await examAuto('ok'); await zz(60); if (EX.stDone) examNext(); await zz(60); } });
  await w(p, 300); await p.screenshot({ path: './shots/rain_spray.png' });
  console.log('ERR', errs.length ? errs.join(' | ') : 'none');
  await b.close();
})();
