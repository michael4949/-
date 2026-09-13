/* 题库考试回归 · 1163 关卡：① 正确路径（考核模式，地刀正常）满分 ② 红线路径（跳过验电直接合地刀 → 一票否决 → 纠正后继续，机构箱不一致两态）③ 漏项（只看控制柜即判定）④ 记录刷新可回看 ⑤ 组长工作台可见 */
const { chromium } = require('playwright');
const F = require('url').pathToFileURL(require('path').resolve(__dirname, 'dist', '小瓦特练_倒闸操作陪练舱_高保真原型.html')).href;
const w = (p, ms) => p.waitForTimeout(ms);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewportSize: { width: 1680, height: 950 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto(F + '#exam'); await w(p, 900);
  await p.evaluate(() => { window.__DH_MUTE = true; window.__DH_SPEED = 0.05; localStorage.clear(); });
  await p.screenshot({ path: './shots/exam_entry.png', fullPage: true });
  /* ① 正确路径 */
  await p.evaluate(() => { EX.arm.esCase = 'ok'; examStart('e1163', 'exam'); }); await w(p, 300);
  await p.screenshot({ path: './shots/exam1163_k1.png' });
  await p.evaluate(() => examRun());
  await p.waitForFunction(() => EX.finished, { timeout: 90000 });
  const r1 = await p.evaluate(() => ({ score: EX.finished.score, red: EX.finished.red, errs: EX.finished.errs.length, steps: EX.finished.track.length, dims: EX.finished.dims }));
  console.log('run1 ok-path', JSON.stringify(r1));
  await p.screenshot({ path: './shots/exam1163_review.png', fullPage: true });
  /* ② 红线路径 + 机构箱不一致 */
  await p.evaluate(() => { EX.arm.esCase = 'mech'; examStart('e1163', 'teach'); }); await w(p, 300);
  await p.evaluate(() => examRun({ k2_hub: 'red', k1_hmi: 'wrong' }));
  await p.waitForFunction(() => EX.finished, { timeout: 90000 });
  const r2 = await p.evaluate(() => ({ score: EX.finished.score, raw: EX.finished.raw, red: EX.finished.red, kinds: EX.finished.errs.map(e => e.kind), talkOk: EX.finished.track.find(t => t.sid === 'k2_talk').items[0].ok, judge: EX.finished.track.find(t => t.sid === 'k2_chk').items.every(i => i.ok) }));
  console.log('run2 red-path', JSON.stringify(r2));
  /* ③ 漏项 */
  await p.evaluate(() => { EX.arm.esCase = 'ok'; examStart('e1163', 'drill'); }); await w(p, 300);
  await p.evaluate(async () => { const zz = ms => new Promise(r => setTimeout(r, ms)); let g = 0; while (EX.exam && examStation().id !== 'k2_chk' && g++ < 40) { const s = examStation(); if (s.type === 'auto') { await zz(150); continue; } await examAuto('ok'); await zz(60); if (EX.stDone) examNext(); await zz(60); } });
  await p.waitForFunction(() => EX.exam && examStation().id === 'k2_chk', { timeout: 30000 });
  await p.screenshot({ path: './shots/exam1163_pano.png' });
  await p.click('.hs[data-hs="cab"]'); await w(p, 150);
  await p.screenshot({ path: './shots/exam1163_zoom.png' });
  await p.click('[data-verdict="close"]'); await w(p, 150);
  await p.click('[data-exjudge="0"]'); await w(p, 150);
  const miss = await p.evaluate(() => EX.errs.map(e => e.kind + ':' + e.text.slice(0, 22)));
  console.log('miss-path', JSON.stringify(miss));
  await p.evaluate(() => examRun());
  await p.waitForFunction(() => EX.finished, { timeout: 60000 });
  /* ④ 刷新可回看 */
  await p.reload(); await w(p, 800);
  const n = await p.evaluate(() => examRecords().length);
  const listed = await p.evaluate(() => document.querySelectorAll('[data-exreview]').length);
  console.log('records after reload', n, 'listed', listed);
  await p.click('[data-exreview]'); await w(p, 400);
  const rv = await p.evaluate(() => !!document.querySelector('.extrack'));
  console.log('review opened', rv);
  /* ⑤ 首页与组长工作台 */
  await p.evaluate(() => goPage('home')); await w(p, 700);
  await p.screenshot({ path: './shots/home_v2.png', fullPage: true });
  await p.evaluate(() => { ROLE.cur = 'lead'; renderRole(); goPage('team'); }); await w(p, 800);
  const rows = await p.evaluate(() => document.querySelectorAll('.ldtbl tr').length - 1);
  const radars = await p.evaluate(() => document.querySelectorAll('.ldcell svg').length);
  console.log('leader rows', rows, 'radars', radars);
  await p.click('[data-ldrev]'); await w(p, 400);
  await p.click('[data-ldsend]'); await w(p, 400);
  const tasks = await p.evaluate(() => lsGet(LS_TASKS, []).length);
  console.log('tasks after send', tasks);
  await p.click('[data-ldcert]'); await w(p, 400);
  await p.screenshot({ path: './shots/leader_cert.png' });
  await p.evaluate(() => $$('.mask').forEach(m => m.remove()));
  await p.screenshot({ path: './shots/leader.png', fullPage: true });
  /* 学员端看到待考任务 */
  await p.evaluate(() => { ROLE.cur = 'student'; renderRole(); goPage('home'); }); await w(p, 600);
  const todo = await p.evaluate(() => !!document.querySelector('.taskcard [data-exstart]'));
  console.log('student sees exam task', todo);
  console.log('ERR', errs.length ? errs.join(' | ') : 'none');
  await b.close();
})();
