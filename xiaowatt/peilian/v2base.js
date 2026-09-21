/* 底座冒烟：八个页面渲染无错 · 首页下钻（维度 / 天 / 关卡分布 / 周 / 胜任度 / 成长地图节点）· 复盘筛选与摘要 · 档案曲线点与徽章 · 课堂测验与计划 · 组长工作台 · 编辑器试演 · 教练中心进入关卡 */
const { chromium } = require('playwright');
const F = require('url').pathToFileURL(require('path').resolve(__dirname, 'dist', '小瓦特练_AI智能陪练平台_高保真原型.html')).href;
const w = (p, ms) => p.waitForTimeout(ms);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewportSize: { width: 1680, height: 950 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto(F); await w(p, 900);
  await p.evaluate(() => { window.__DH_MUTE = true; window.__DH_SPEED = 0.05; localStorage.clear(); });
  const closeMasks = () => p.evaluate(() => $$('.mask').forEach(m => m.remove()));
  const pages = ['home', 'center', 'ticket', 'expert', 'exam', 'assess', 'analytics', 'sys', 'plaza', 'review', 'growth', 'classroom'];
  const out = {};
  for (const h of pages) { await p.evaluate(h => goPage(h), h); await w(p, 500); out[h] = await p.evaluate(() => document.querySelector('#hpage').innerHTML.length); }
  console.log('pages', JSON.stringify(out), '| nav has arena?', await p.evaluate(() => !!document.querySelector('[data-h="arena"]')), '| hist', await p.evaluate(() => examHist().length));
  /* 首页下钻 */
  await p.evaluate(() => goPage('home')); await w(p, 500);
  const drills = ['[data-hdim]', '[data-day]', '[data-plan]', '[data-week]', '[data-gauge]', '[data-node="g3"]', '[data-node="g4"]', '[data-node="g8"]', '[data-cert]', '[data-exreview]'];
  const dr = {};
  for (const sel of drills) { const n = await p.evaluate(sel => { const n = document.querySelector(sel); if (!n) return -1; n.dispatchEvent(new MouseEvent('click', { bubbles: true })); return document.querySelectorAll('.mask').length + (location.hash === '#exam' ? 10 : 0); }, sel); dr[sel] = n; await w(p, 200); await closeMasks(); if (await p.evaluate(() => location.hash) === '#exam') { await p.evaluate(() => { examQuit(); goPage('home'); }); await w(p, 400); } }
  console.log('home drills (mask count / 10=opened exam)', JSON.stringify(dr));
  /* 复盘 */
  await p.evaluate(() => goPage('review')); await w(p, 500);
  const rv = await p.evaluate(() => ({ items: document.querySelectorAll('.rvit').length, body: !!document.querySelector('.rvmain .extrack') }));
  await p.click('[data-rvf="red"]'); await w(p, 300); const rv2 = await p.evaluate(() => document.querySelectorAll('.rvit').length);
  await p.click('[data-rvf="all"]'); await w(p, 200); await p.click('.rvit:nth-child(4)'); await w(p, 300);
  await p.click('[data-rvsum]'); await w(p, 300); const sum = await p.evaluate(() => (document.querySelector('#rvsum_txt') || {}).innerText || '');
  console.log('review', JSON.stringify(rv), 'red-filter', rv2, 'summary lines', sum.split('\n').length); await closeMasks();
  await p.screenshot({ path: './shots/base_review.png', fullPage: true });
  /* 档案 */
  await p.evaluate(() => goPage('growth')); await w(p, 500);
  const gr = await p.evaluate(() => ({ pts: document.querySelectorAll('#gcurve .hitv').length, badges: document.querySelectorAll('.badge').length, lit: document.querySelectorAll('.badge.lit').length }));
  await p.click('[data-gshow="dur"]'); await w(p, 200);
  await p.click('.badge'); await w(p, 200); const bd = await p.evaluate(() => document.querySelectorAll('.mask').length); await closeMasks();
  await p.click('[data-gdim="1"]'); await w(p, 200); const gd = await p.evaluate(() => document.querySelectorAll('.mask').length); await closeMasks();
  await p.evaluate(() => { const n = document.querySelector('#gcurve .hitv[data-sess]'); n.dispatchEvent(new MouseEvent('click', { bubbles: true })); }); await w(p, 400);
  console.log('growth', JSON.stringify(gr), 'badge drill', bd, 'dim drill', gd, 'curve point → review?', await p.evaluate(() => location.hash));
  /* 课堂 */
  await p.evaluate(() => goPage('classroom')); await w(p, 500);
  await p.evaluate(() => quizStart('全部')); await w(p, 200); await p.evaluate(() => quizSay('A')); await w(p, 200);
  await p.click('[data-lplan]'); await w(p, 300);
  console.log('classroom', JSON.stringify(await p.evaluate(() => ({ quiz: !!document.querySelector('.qzx'), plan: document.querySelectorAll('#plantbl tr').length, planBtn: document.querySelectorAll('#plantbl [data-exstart]').length, arch: document.querySelectorAll('.arch .hitv[data-go]').length }))));
  await p.screenshot({ path: './shots/base_classroom.png', fullPage: true });
  /* 组长 */
  await p.evaluate(() => { ROLE.cur = 'lead'; renderRole(); goPage('team'); }); await w(p, 700);
  console.log('team rows', await p.evaluate(() => document.querySelectorAll('.ldtbl tr').length - 1));
  await p.click('[data-ldrev]'); await w(p, 300); await p.click('[data-ldsend]'); await w(p, 400);
  console.log('tasks after send', await p.evaluate(() => lsGet(LS_TASKS, []).length), JSON.stringify(await p.evaluate(() => lsGet(LS_TASKS, [])[0].plan)));
  /* 编辑器 */
  await p.evaluate(() => goPage('editor')); await w(p, 500);
  await p.evaluate(() => editorGen()); await w(p, 300); await p.evaluate(() => edRehearse()); await w(p, 400);
  console.log('editor rehearse', await p.evaluate(() => !!document.querySelector('#rh_body'))); await closeMasks();
  /* 教练中心 → 进关卡 */
  await p.evaluate(() => { ROLE.cur = 'student'; renderRole(); goPage('plaza'); }); await w(p, 500);
  await p.evaluate(() => enterCoach('daozha')); await w(p, 500);
  console.log('plaza → exam', await p.evaluate(() => location.hash + ' ' + (EX.exam && EX.exam.id)));
  await p.evaluate(() => examQuit());
  await p.evaluate(() => goPage('home')); await w(p, 600);
  await p.screenshot({ path: './shots/base_home.png', fullPage: true });
  console.log('ERR', errs.length ? errs.join(' | ') : 'none');
  await b.close();
})();
