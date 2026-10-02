/* 视觉巡检：学员 10 页 + 组长 2 页 + 作答态 / 结果态 / 弹层 截图 · node vis.cjs [宽x高] [前缀] → shots/vis/<前缀><页>.png */
const { chromium } = require(process.env.PW || '/home/user/-/node_modules/playwright');
const path = require('path'); const fs = require('fs');
const F = require('url').pathToFileURL(path.resolve(__dirname, 'dist', '安全学习智能陪练_高保真原型.html')).href;
const [vp, prefix] = [process.argv[2] || '1440x900', process.argv[3] || ''];
const [W, H] = vp.split('x').map(Number);
const OUT = path.join(__dirname, 'shots', 'vis'); fs.mkdirSync(OUT, { recursive: true });
const w = (p, ms) => p.waitForTimeout(ms);
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto(F); await w(p, 1200); await p.evaluate(() => localStorage.clear());
  const shot = async (name, full) => { await w(p, 900); await p.screenshot({ path: path.join(OUT, prefix + name + '.png'), fullPage: !!full }); };
  const go = async k => { await p.evaluate(k => goPage(k), k); await w(p, 300); };
  const closeMasks = () => p.evaluate(() => $$('.mask').forEach(m => m.remove()));
  for (const k of ['home', 'center', 'assess', 'analytics', 'review', 'growth', 'classroom']) { await go(k); await shot(k); }
  await go('home'); await p.evaluate(() => { document.querySelector('#pg_home').scrollTop = 900; }); await shot('home2');
  await p.evaluate(() => { document.querySelector('#pg_home').scrollTop = 1800; }); await shot('home3');
  /* 操作票：介绍页 → 写票 → 判卷 */
  await go('ticket'); await shot('ticket');
  await p.evaluate(() => { TK.res = null; tkStart('teach', false); }); await w(p, 500); await p.evaluate(() => { TK.rows = tkAuto('order').map(r => ({ t: r.t, child: !!r.parent })); tkPaint(); }); await shot('ticket_form');
  await p.evaluate(() => { document.querySelector('#tkno').value = '2609001'; $('#tksubmit').click(); }); await w(p, 500); await shot('ticket_res');
  /* 应急：列表 → 作答 → 点评 */
  await p.evaluate(() => { TK.res = null; if (TK.timer) { clearInterval(TK.timer); TK.timer = null; } EM.id = null; EM.res = null; goPage('emerg'); }); await shot('emerg');
  await p.evaluate(() => emStart('heat1', 'teach')); await w(p, 400); await shot('emerg_form');
  await p.evaluate(() => { EM.a = emgModel(EMGMAP.heat1, 'part'); EM.step = emSteps(EMGMAP.heat1).length - 1; emPaint(); }); await w(p, 200); await p.evaluate(() => $('#emsubmit').click()); await shot('emerg_res');
  /* 五个场景 */
  await p.evaluate(() => { if (EM.timer) { clearInterval(EM.timer); EM.timer = null; } EM.id = null; EM.res = null; startScene('rule:r_tech:teach'); }); await shot('sc_rule');
  await p.evaluate(() => startScene('life::teach')); await shot('sc_life');
  await p.evaluate(() => startScene('case:small:teach')); await shot('sc_case');
  await p.evaluate(() => startScene('inst:z2a:teach')); await shot('sc_inst');
  await p.evaluate(() => startScene('wt::teach')); await shot('sc_wt');
  await p.evaluate(() => { WT.secs.forEach(s => { SC.pool[s.k].forEach((o, i) => { if (o.ok) SC.a[s.k][i] = true; }); }); wtSubmit(); }); await shot('sc_wt_res');
  /* 讲课弹层与测验 */
  await p.evaluate(() => startScene('inst:z1:teach')); await w(p, 300); await p.evaluate(() => { lecOpen(SC.cw, { from: 1 }); }); await w(p, 1200); await shot('lecture'); await p.evaluate(() => lecClose());
  await p.evaluate(() => instExam()); await w(p, 400); await shot('exam');
  await p.evaluate(() => { EX.qs.forEach(q => { EX.ans[q.id] = q.ans; }); examGrade(); }); await w(p, 300); await shot('exam_res');
  /* 下钻弹层 */
  await p.evaluate(() => { scStop(); goPage('home'); }); await w(p, 500); await p.evaluate(() => drillMat()); await w(p, 400); await shot('drill_mat'); await closeMasks();
  await p.evaluate(() => drillScene('em')); await w(p, 400); await shot('drill_scene'); await closeMasks();
  await p.evaluate(() => { const c = caseList()[0]; caseOpen(c.id); }); await w(p, 500); await shot('casepush'); await closeMasks();
  /* 组长 */
  await p.evaluate(() => { ROLE.cur = 'lead'; renderRole(); goPage('team'); }); await shot('team');
  await p.evaluate(() => { document.querySelector('#pg_home').scrollTop = 900; }); await shot('team2');
  await go('sys'); await shot('sys');
  await p.evaluate(() => { ROLE.cur = 'student'; renderRole(); goPage('home'); });
  console.log('shots', OUT, vp, 'ERR', errs.length ? errs.join(' | ').slice(0, 400) : 'none'); await b.close();
})();
