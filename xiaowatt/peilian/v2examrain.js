/* 陪练关卡回归 · 雨淋阀：① 训练模式正确路径满 10 分 ② 考核模式关键错误路径（压力异常未发现 / 走到 #1 却报 #3 / 手动阀未全开）③ 按住盒盖打开 + 拖动手柄的 DOM 交互 */
const { chromium } = require('playwright');
const F = require('url').pathToFileURL(require('path').resolve(__dirname, 'dist', '小瓦特练_倒闸操作陪练舱_高保真原型.html')).href;
const w = (p, ms) => p.waitForTimeout(ms);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewportSize: { width: 1680, height: 950 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto(F + '#exam'); await w(p, 900);
  await p.evaluate(() => { window.__DH_MUTE = true; window.__DH_SPEED = 0.05; localStorage.clear(); });
  /* ① 训练 · 正确路径 */
  await p.evaluate(() => { EX.arm.rainAbn = false; examStart('rain', 'teach'); }); await w(p, 400);
  await p.screenshot({ path: './shots/rain_s0.png' });
  await p.evaluate(() => examRun());
  await p.waitForFunction(() => EX.finished, null, { timeout: 120000 });
  const r1 = await p.evaluate(() => ({ score: EX.finished.score, errs: EX.finished.errs.length, hints: EX.finished.hints, steps: EX.finished.track.length, dims: EX.finished.dims }));
  console.log('run1 teach-ok', JSON.stringify(r1));
  await p.screenshot({ path: './shots/rain_review.png', fullPage: true });
  /* ② 考核 · 关键错误路径（压力异常注入） */
  await p.evaluate(() => { EX.arm.rainAbn = true; examStart('rain', 'exam'); }); await w(p, 400);
  await p.click('.hs[data-hs="pg1"]'); await w(p, 150); await p.fill('#ex_zsay', '供水侧压力正常'); await p.click('[data-zsay]'); await w(p, 150);
  await p.click('.hs[data-hs="pg2"]'); await w(p, 150); await p.fill('#ex_zsay', '控制腔压力正常'); await p.click('[data-zsay]'); await w(p, 200);   // 未发现压力异常 → 关键错误
  await p.evaluate(() => $$('.mask').forEach(m => m.remove()));
  await p.fill('#ex_zsay', '控制腔压力表指针在红区，压力异常'); await p.click('[data-zsay]'); await w(p, 200);   // 放大图仍开着：再看一眼后重答
  const s0 = await p.evaluate(() => ({ pg2: EX.st.pg2, errs: EX.errs.map(e => e.kind + (e.crit ? '!' : '')) }));
  console.log('s0 abnormal', JSON.stringify(s0));
  await p.evaluate(() => examRun({ sA: 'wrong', sC1: 'wrong', sC2: 'wrong' }));
  await p.waitForFunction(() => EX.finished, null, { timeout: 120000 });
  const r2 = await p.evaluate(() => ({ score: EX.finished.score, kinds: EX.finished.errs.map(e => e.kind + (e.crit ? '!' : '')), crit: EX.finished.errs.filter(e => e.crit).length }));
  console.log('run2 exam-crit', JSON.stringify(r2));
  /* ③ DOM 交互：按住盒盖打开 → 拖动手柄 */
  await p.evaluate(() => { EX.arm.rainAbn = false; examStart('rain', 'drill'); }); await w(p, 400);
  await p.evaluate(async () => { const zz = ms => new Promise(r => setTimeout(r, ms)); let g = 0; while (EX.exam && examStation().id !== 'sC1' && g++ < 30) { const s = examStation(); await examAuto('ok'); let k = 0; while (EX.exam && examStation() === s && k++ < 60) await zz(80); } });
  await p.waitForFunction(() => EX.exam && examStation().id === 'sC1', null, { timeout: 40000 });
  await w(p, 200);
  await p.click('.hs[data-hs="box"]'); await w(p, 200); await p.screenshot({ path: './shots/rain_box.png' });
  const lid = await p.locator('#ex_zoom [data-op="box:open"]').boundingBox();
  await p.mouse.move(lid.x + lid.width / 2, lid.y + lid.height / 2); await p.mouse.down(); await w(p, 300); await p.mouse.up(); await w(p, 300);
  const opened = await p.evaluate(() => ({ boxOpen: EX.st.boxOpen, station: examStation().id }));
  console.log('hold-open', JSON.stringify(opened));
  await p.waitForFunction(() => EX.exam && examStation().id === 'sC2', null, { timeout: 20000 }); await w(p, 200);
  const hb = await p.locator('[data-handle]').boundingBox();
  const svgb = await p.locator('#ex_svgroot').boundingBox();
  const cx = svgb.x + svgb.width * 440 / 960, cy = svgb.y + svgb.height * 300 / 540;
  await p.mouse.move(hb.x + hb.width / 2, hb.y + 10); await p.mouse.down();
  await p.mouse.move(cx + 60, cy - 120, { steps: 6 }); await p.mouse.move(cx + 140, cy - 10, { steps: 8 }); await p.mouse.move(cx + 150, cy + 6, { steps: 4 });
  await p.mouse.up(); await w(p, 300);
  console.log('drag', JSON.stringify(await p.evaluate(() => ({ handle: Math.round(EX.st.handle), done: EX.stDone }))));
  await p.screenshot({ path: './shots/rain_box_open.png' });
  await p.waitForFunction(() => EX.exam && examStation().id === 'sD', null, { timeout: 20000 }); await w(p, 300);
  await p.screenshot({ path: './shots/rain_spray.png' });
  await p.evaluate(() => examRun());
  await p.waitForFunction(() => EX.finished, null, { timeout: 60000 });
  console.log('run3 score', await p.evaluate(() => EX.finished.score));
  console.log('ERR', errs.length ? errs.join(' | ') : 'none');
  await b.close();
})();
