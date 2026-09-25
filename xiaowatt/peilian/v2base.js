/* 底座冒烟：十一个页面渲染无错 · 首页下钻（能力项 / 天 / 场景分布 / 胜任度 / 成长地图节点 / 最近成绩）· 复盘筛选、摘要与打开报告 ·
   档案（曲线点 / 徽章 / 目标）· 课堂（测验 / 计划 / 课程）· 组长（复核 / 下发任务）→ 学员待练 → 完成回写 · 角色切换 */
const { chromium } = require(process.env.PW || '/home/user/-/node_modules/playwright');
const F = require('url').pathToFileURL(require('path').resolve(__dirname, 'dist', '小瓦特练_AI智能陪练平台_高保真原型.html')).href;
const w = (p, ms) => p.waitForTimeout(ms);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1680, height: 950 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto(F); await w(p, 900);
  await p.evaluate(() => localStorage.clear());
  const closeMasks = () => p.evaluate(() => $$('.mask').forEach(m => m.remove()));
  const fire = sel => p.evaluate(sel => { const n = document.querySelector(sel); if (!n) return -1; n.dispatchEvent(new MouseEvent('click', { bubbles: true })); return 1; }, sel);
  const pages = ['home', 'center', 'ticket', 'emerg', 'assess', 'analytics', 'review', 'growth', 'classroom'];
  const out = {};
  for (const h of pages) { await p.evaluate(h => goPage(h), h); await w(p, 450); out[h] = await p.evaluate(() => document.querySelector('#hpage').innerText.length); }
  console.log('pages', JSON.stringify(out), '| 旧模块已删', await p.evaluate(() => ['pageExpert', 'pageExam', 'pagePlaza', 'pageEditor', 'examStart', 'epStart'].filter(f => typeof window[f] === 'function').length === 0), '| 记录', await p.evaluate(() => allRecs().length));
  /* 首页下钻 */
  await p.evaluate(() => goPage('home')); await w(p, 500);
  const dr = {};
  for (const sel of ['[data-dim]', '[data-hdim]', '[data-day]', '[data-plan]', '[data-gauge]', '[data-node="g3"]', '[data-node="g5"]', '[data-node="g8"]', '[data-node="g7"]']) { await fire(sel); await w(p, 200); dr[sel] = await p.evaluate(() => document.querySelectorAll('.mask').length); await closeMasks(); }
  console.log('home drills (弹层数)', JSON.stringify(dr), '期望全部 1');
  await fire('.hcard.bl [data-rec]'); await w(p, 400); console.log('最近成绩 → 报告', await p.evaluate(() => location.hash));
  await p.evaluate(() => goPage('home')); await w(p, 400);
  await fire('.emprog i'); await w(p, 400); console.log('应急处置卡方块 → 情境', await p.evaluate(() => location.hash + ' ' + EM.id));
  await p.evaluate(() => { if (EM.timer) { clearInterval(EM.timer); EM.timer = null; } EM.id = null; goPage('home'); }); await w(p, 400);
  /* 复盘 */
  await p.evaluate(() => goPage('review')); await w(p, 500);
  const rv = await p.evaluate(() => document.querySelectorAll('.rvit').length);
  await p.click('[data-rvf="em"]'); await w(p, 300); const rvEm = await p.evaluate(() => document.querySelectorAll('.rvit').length);
  await p.click('[data-rvf="fail"]'); await w(p, 300); const rvF = await p.evaluate(() => document.querySelectorAll('.rvit').length);
  await p.click('[data-rvf="all"]'); await w(p, 300); await p.locator('.rvit').nth(1).click(); await w(p, 300);
  await p.click('[data-rvsum]'); await w(p, 300); const sum = await p.evaluate(() => (document.querySelector('#rvsum_txt') || {}).innerText || ''); await closeMasks();
  console.log('review', rv, 'em', rvEm, 'fail', rvF, 'summary lines', sum.split('\n').length);
  await p.screenshot({ path: './shots/base_review.png', fullPage: true });
  await fire('.rvmain [data-rec]'); await w(p, 400); console.log('复盘 → 完整报告', await p.evaluate(() => location.hash));
  /* 档案 */
  await p.evaluate(() => goPage('growth')); await w(p, 500);
  const gr = await p.evaluate(() => ({ pts: document.querySelectorAll('#gcurve .hitv').length, badges: document.querySelectorAll('.badge').length, lit: document.querySelectorAll('.badge.lit').length, cards: document.querySelectorAll('.emc').length }));
  await p.click('[data-gshow="dur"]'); await w(p, 200);
  await p.click('.badge'); await w(p, 200); const bd = await p.evaluate(() => document.querySelectorAll('.mask').length); await closeMasks();
  await p.fill('[data-goal="0"]', '95'); await w(p, 200); const gl = await p.evaluate(() => goalArr()[0]);
  await fire('[data-gdim="3"]'); await w(p, 200); const gd = await p.evaluate(() => document.querySelectorAll('.mask').length); await closeMasks();
  await fire('#gcurve .hitv[data-sess]'); await w(p, 400);
  console.log('growth', JSON.stringify(gr), 'badge', bd, 'goal', gl, 'dim', gd, '曲线点 →', await p.evaluate(() => location.hash), '期望 cards 17');
  /* 课堂 */
  await p.evaluate(() => goPage('classroom')); await w(p, 500);
  await p.evaluate(() => quizStart('信息报送')); await w(p, 200); await p.evaluate(() => quizSay('A')); await w(p, 200);
  const qz = await p.evaluate(() => !!document.querySelector('.qzx'));
  await p.click('[data-lplan]'); await w(p, 300);
  await p.click('[data-course="c5"]'); await w(p, 300); const cd = await p.evaluate(() => document.querySelectorAll('.mask .chap').length); await closeMasks();
  console.log('classroom', JSON.stringify(await p.evaluate(() => ({ plan: document.querySelectorAll('#plantbl tr').length - 1, planGo: document.querySelectorAll('#plantbl [data-start]').length, arch: document.querySelectorAll('.arch .hitv[data-go]').length }))), 'quiz', qz, 'course chapters', cd);
  await p.screenshot({ path: './shots/base_classroom.png', fullPage: true });
  /* 组长：复核 + 下发 → 学员待练 → 完成 → 回写 */
  await p.evaluate(() => { ROLE.cur = 'lead'; renderRole(); goPage('team'); }); await w(p, 600);
  const tm = await p.evaluate(() => ({ cells: document.querySelectorAll('.ldcell').length, rows: document.querySelectorAll('.ldtbl tr').length - 1 }));
  await p.click('[data-ldrev]'); await w(p, 300);
  await p.selectOption('#ld_scene', 'tk'); await p.selectOption('#ld_who', '任玲玲'); await p.click('[data-ldsend]'); await w(p, 400);
  const t0 = await p.evaluate(() => { const t = taskList()[0]; return { n: t.targetN, who: t.who, mode: t.mode }; });
  await p.screenshot({ path: './shots/base_team.png', fullPage: true });
  await p.evaluate(() => { ROLE.cur = 'student'; renderRole(); goPage('home'); }); await w(p, 500);
  const todo = await p.evaluate(() => ({ task: document.querySelector('.taskcard .tk2').innerText, todo: myTodo().length }));
  await p.click('.taskcard [data-start]'); await w(p, 500);
  await p.evaluate(() => { TK.rows = tkAuto('ok').map(r => ({ t: r.t, child: !!r.parent })); tkPaint(); }); await p.fill('#tkno', '2609002'); await p.evaluate(() => $('#tksubmit').click()); await w(p, 500);
  const back = await p.evaluate(() => ({ todo: myTodo().length, res: (taskList()[0].results || []).map(r => r.who + ' ' + r.score) }));
  console.log('team', JSON.stringify(tm), '下发', JSON.stringify(t0), '学员待练', JSON.stringify(todo), '完成回写', JSON.stringify(back), '期望 cells 10 · 回写 任玲玲 100 · todo 0');
  /* 角色切换 */
  await p.evaluate(() => goPage('home')); await w(p, 300);
  console.log('学员进管理视角被拦', await p.evaluate(() => { document.querySelector('#hnav [data-h="team"]').click(); location.hash = '#sys'; return document.querySelector('#hpage').dataset.cur; }), '期望 home');
  await p.evaluate(() => goPage('home')); await w(p, 600);
  await p.screenshot({ path: './shots/base_home.png', fullPage: true });
  console.log('ERR', errs.length ? errs.join(' | ') : 'none');
  await b.close();
})();
