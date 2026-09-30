// 15 分钟动线走查：首页 → 数据接入 → m2(下一步到底) → m3(下一步到底) → 选场景 → 深潜到交付物 → 登记表单 → 对话坞问积分
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const f = 'file://' + path.join(__dirname, '..', 'dist', 'index.html'); const log = (...a) => console.log(...a);
  await p.goto(f + '#/home'); await p.waitForTimeout(800);
  await p.click('.boardbox .hot.src'); await p.waitForTimeout(600); log('1 首页→接入', location => 0, await p.evaluate(() => location.hash));
  await p.click('.cn-all'); await p.waitForTimeout(300);
  await p.click('.boardbox, .topbar .home-link').catch(() => {}); await p.goto(f + '#/home'); await p.waitForTimeout(500);
  await p.click('.boardbox .hot[aria-label="场景优先级规划"]'); await p.waitForTimeout(700); log('2 首页→m2', await p.evaluate(() => location.hash));
  for (let i = 0; i < 12; i++) { const t = await p.evaluate(() => { const g = document.querySelector('.pd-next .go'); return g ? g.innerText.replace(/\s+/g, ' ') : null; }); log('   m2/m3 next:', t, await p.evaluate(() => location.hash)); if (!t) break; await p.click('.pd-next .go'); await p.waitForTimeout(900); if (await p.evaluate(() => location.hash.startsWith('#/connect'))) break; }
  log('3 m3 末屏→', await p.evaluate(() => location.hash));
  await p.click('.cn-scene.ok'); await p.waitForTimeout(800); log('4 接入页→场景', await p.evaluate(() => location.hash));
  for (let i = 0; i < 8; i++) { const done = await p.evaluate(() => !!document.querySelector('.dl-bar')); if (done) break; await p.click('.pd-next .go'); await p.waitForTimeout(700); }
  log('5 深潜到交付物条', await p.evaluate(() => ({ hash: location.hash, dl: (document.querySelector('.dl-bar') || {}).innerText })));
  await p.click('.dl-btn'); await p.waitForTimeout(300); await p.fill('.lf input[type=text]', '测试汽配有限公司'); await p.fill('.lf input[type=tel]', '13800000000'); await p.check('.lf-agree input'); await p.click('.lf button[type=submit]'); await p.waitForTimeout(300);
  log('6 登记', await p.evaluate(() => ({ done: !!document.querySelector('.lf-done'), n: window.DGG.lead.count() })));
  await p.click('.lf-done .btn'); await p.waitForTimeout(200);
  const ask = await p.evaluate(async () => { const inp = document.querySelector('.chat input, .chat textarea, [class*=chat] input'); if (!inp) return 'no chat input'; inp.value = '多少积分'; inp.dispatchEvent(new Event('input', { bubbles: true })); inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await new Promise(r => setTimeout(r, 1800)); const bs = [...document.querySelectorAll('[class*=chat] .bubble, .chat .ai, .cd-bubble')]; return bs.slice(-1).map(x => x.innerText.slice(0, 120)); });
  log('7 对话坞问积分 →', ask);
  await p.screenshot({ path: path.join(__dirname, 'shots-ciif', 'flow-end.png') });
  log('ERRORS', errs.length, errs.slice(0, 3)); await b.close();
})();
