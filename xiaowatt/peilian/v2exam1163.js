/* 陪练关卡回归 · 1163（做题 + 操作，15 分制）：① 考核模式正确路径满分 15、轨迹 9 步 ② 训练模式：说错一次（教练纠正+提示）、跳过验电合地刀被教练当场制止（不记红线）、机构箱不一致两态 → 14.7、说错后自动一级提示 hints 1 ③ 考核模式跳过验电合地刀 → 一票否决 ④ 漏项：只看控制柜就下结论 ⑤ 刷新可回看 ⑥ 组长工作台 / 任务下发 / 学员待练 */
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
  /* ① 考核 · 正确路径 */
  await p.evaluate(() => { EX.arm.esCase = 'ok'; examStart('e1163', 'exam'); }); await w(p, 400);
  await p.screenshot({ path: './shots/exam1163_k1.png' });
  await p.evaluate(() => examRun());
  await p.waitForFunction(() => EX.finished, null, { timeout: 120000 });
  const r1 = await p.evaluate(() => ({ score: EX.finished.score, red: EX.finished.red, errs: EX.finished.errs.length, hints: EX.finished.hints, steps: EX.finished.track.length, dims: EX.finished.dims }));
  console.log('run1 exam-ok', JSON.stringify(r1));
  await p.screenshot({ path: './shots/exam1163_review.png', fullPage: true });
  /* ② 训练 · 说错 + 被制止 + 两态 */
  await p.evaluate(() => { EX.arm.esCase = 'mech'; examStart('e1163', 'teach'); }); await w(p, 400);
  await p.evaluate(() => examRun({ k1_check: 'wrong', k2_hub: 'red' }));
  await p.waitForFunction(() => EX.finished, null, { timeout: 120000 });
  const r2 = await p.evaluate(() => ({ score: EX.finished.score, red: EX.finished.red, kinds: EX.finished.errs.map(e => e.kind), hints: EX.finished.hints, coachLines: EX.finished.log.filter(m => m.who === 'coach').length, stopLine: EX.finished.log.some(m => /停！/.test(m.t)), concl: EX.finished.track.find(t => t.sid === 'k2_chk').items.every(i => i.ok) }));
  console.log('run2 teach-mech', JSON.stringify(r2));
  /* ③ 考核 · 红线 */
  await p.evaluate(() => { EX.arm.esCase = 'ok'; examStart('e1163', 'exam'); }); await w(p, 400);
  await p.evaluate(() => examRun({ k2_hub: 'red' }));
  await p.waitForFunction(() => EX.finished, null, { timeout: 120000 });
  const r3 = await p.evaluate(() => ({ score: EX.finished.score, raw: EX.finished.raw, red: EX.finished.red, kinds: EX.finished.errs.map(e => e.kind), rule: (EX.finished.errs.find(e => e.kind === 'red') || {}).rule.slice(0, 30) }));
  console.log('run3 exam-red', JSON.stringify(r3));
  /* ④ 漏项：只看控制柜就下结论 */
  await p.evaluate(() => { EX.arm.esCase = 'ok'; examStart('e1163', 'drill'); }); await w(p, 400);
  await p.evaluate(async () => { const zz = ms => new Promise(r => setTimeout(r, ms)); let g = 0; while (EX.exam && examStation().id !== 'k2_chk' && g++ < 40) { const s = examStation(); if (s.type === 'auto') { await zz(150); continue; } await examAuto('ok'); let k = 0; while (EX.exam && examStation() === s && k++ < 60) await zz(80); } });
  await p.waitForFunction(() => EX.exam && examStation().id === 'k2_chk', null, { timeout: 40000 });
  await w(p, 200); await p.screenshot({ path: './shots/exam1163_pano.png' });
  await p.click('.hs[data-hs="cab"]'); await w(p, 200); await p.screenshot({ path: './shots/exam1163_zoom.png' });
  await p.fill('#ex_zsay', '控制柜 116340 指示合闸'); await p.click('[data-zsay]'); await w(p, 200);
  await p.fill('#ex_say', '116340 地刀已可靠合闸'); await p.click('[data-exsay]'); await w(p, 200);
  const miss = await p.evaluate(() => ({ errs: EX.errs.map(e => e.kind + ':' + e.text.slice(0, 20)), lastCoach: EX.log.filter(m => m.who === 'coach').slice(-1)[0].t.slice(0, 40) }));
  console.log('miss-path', JSON.stringify(miss));
  await p.evaluate(() => examRun());
  await p.waitForFunction(() => EX.finished, null, { timeout: 90000 });
  /* ⑤ 刷新可回看 */
  await p.reload(); await w(p, 800);
  const n = await p.evaluate(() => examRecords().length);
  const listed = await p.evaluate(() => document.querySelectorAll('[data-exreview]').length);
  console.log('records after reload', n, 'listed', listed);
  await p.click('[data-exreview]'); await w(p, 400);
  console.log('review opened', await p.evaluate(() => !!document.querySelector('.extrack')));
  /* ⑥ 首页与组长工作台 */
  await p.evaluate(() => goPage('home')); await w(p, 700);
  await p.screenshot({ path: './shots/home_v2.png', fullPage: true });
  await p.evaluate(() => { ROLE.cur = 'lead'; renderRole(); goPage('team'); }); await w(p, 800);
  const rows = await p.evaluate(() => document.querySelectorAll('.ldtbl tr').length - 1);
  const radars = await p.evaluate(() => document.querySelectorAll('.ldcell svg').length);
  console.log('leader rows', rows, 'radars', radars);
  await p.click('[data-ldrev]'); await w(p, 400);
  await p.click('[data-ldsend]'); await w(p, 400);
  console.log('tasks after send', await p.evaluate(() => lsGet(LS_TASKS, []).length));
  await p.click('[data-ldcert]'); await w(p, 400);
  await p.screenshot({ path: './shots/leader_cert.png' });
  await p.evaluate(() => $$('.mask').forEach(m => m.remove()));
  await p.screenshot({ path: './shots/leader.png', fullPage: true });
  await p.evaluate(() => { ROLE.cur = 'student'; renderRole(); goPage('home'); }); await w(p, 600);
  console.log('student sees exam task', await p.evaluate(() => !!document.querySelector('.taskcard [data-exstart]')));
  console.log('ERR', errs.length ? errs.join(' | ') : 'none');
  await b.close();
})();
