/* 视觉巡检：两角色全页截图（不跑业务断言）· node vis.cjs [宽x高] [前缀]  → shots/vis/<前缀><页>.png */
const { chromium } = require(process.env.PW || '/home/user/-/node_modules/playwright');
const path = require('path'); const fs = require('fs');
const file = 'file://' + path.join(__dirname, 'dist', '高效班组管理助手_班组长_高保真原型.html');
const [vp, prefix] = [process.argv[2] || '1440x900', process.argv[3] || ''];
const [W, H] = vp.split('x').map(Number);
const OUT = path.join(__dirname, 'shots', 'vis'); fs.mkdirSync(OUT, { recursive: true });
const LEADER = ['team', 'skills', 'auth', 'grow', 'perf', 'care', 'advise', 'home', 'sched', 'know', 'ledger', 'ask'];
const MANAGER = ['goals', 'compare', 'portrait', 'lperf', 'staff', 'structure', 'risks', 'mcare', 'madvise'];
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 }); const pg = await ctx.newPage();
  const errs = []; pg.on('pageerror', e => errs.push('pageerror ' + e.message)); pg.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text()); });
  await pg.addInitScript(() => { window.__XW_SPEED = 0.03; });
  await pg.goto(file); await pg.waitForTimeout(1800);
  const shoot = async (k, full) => { await pg.evaluate(x => { location.hash = x; }, '#' + k); await pg.waitForTimeout(1300); await pg.screenshot({ path: path.join(OUT, prefix + k + (full ? '_full' : '') + '.png'), fullPage: false }); if (full) { const h = await pg.evaluate(() => { const m = document.querySelector('#main'); return m.scrollHeight; }); await pg.evaluate(() => { document.querySelector('#main').scrollTop = 99999; }); await pg.waitForTimeout(500); await pg.screenshot({ path: path.join(OUT, prefix + k + '_end.png') }); await pg.evaluate(() => { document.querySelector('#main').scrollTop = 0; }); } };
  for (const k of LEADER) await shoot(k, process.argv.includes('full'));
  await pg.evaluate(() => { DB.setRole('manager'); location.hash = '#goals'; render(); }); await pg.waitForTimeout(1200);
  for (const k of MANAGER) await shoot(k, process.argv.includes('full'));
  await pg.evaluate(() => { DB.setRole('leader'); });
  console.log('shots', OUT, vp, 'ERR', errs.length ? errs.join(' | ') : 'none'); await br.close();
})();
