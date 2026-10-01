/* 第二批冒烟：安规知识 / 保命技能 / 案例分析 / 制度学习（课件 → 数字人讲课 → 测验 → 考试分析）/ 工作票 五个引擎走通并留痕 ·
   案例推送学习（课件 → 3 题 → 回写）· 知识课堂课件生产线（文件库 / 课件 / 出题考试 / 考试分析）· 班组考试分析 · 复盘打开新记录 */
const { chromium } = require(process.env.PW || '/home/user/-/node_modules/playwright');
const F = require('url').pathToFileURL(require('path').resolve(__dirname, 'dist', '安全学习智能陪练_高保真原型.html')).href;
const w = (p, ms) => p.waitForTimeout(ms);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1680, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto(F); await w(p, 900);
  await p.evaluate(() => localStorage.clear());
  const fire = sel => p.evaluate(sel => { const n = document.querySelector(sel); if (!n) return -1; n.dispatchEvent(new MouseEvent('click', { bubbles: true })); return 1; }, sel);
  const n0 = await p.evaluate(() => allRecs().length);
  const shot = (f) => p.screenshot({ path: './shots/' + f, fullPage: true });
  /* 安规知识 */
  await p.evaluate(() => startScene('rule:verify:teach')); await w(p, 500);
  await shot('sc_rule.png');
  for (let i = 0; i < 6; i++) {
    await p.evaluate(() => { const q = SC.qs[SC.i]; if (q.type === 'say') ruleAnswer(q.ans); else ruleAnswer(q.ans); SC.cites[q.id] = q.rule.id; });
    await w(p, 150); if (i < 5) await fire('[data-rulego="' + (i + 1) + '"]'); await w(p, 150);
  }
  await fire('[data-rulesubmit]'); await w(p, 400);
  const rule = await p.evaluate(() => ({ step: SC.step, score: SC.res.score, dims: SC.res.dims, recs: allRecs().length, n: allRecs()[0].n, sub: allRecs()[0].sub }));
  console.log('安规', JSON.stringify(rule), '期望 score 100 · r1 r2 r4 100');
  /* 安规：答错 → 复练 */
  await p.evaluate(() => startScene('rule:switch:teach')); await w(p, 300);
  await p.evaluate(() => { SC.qs.forEach((q, i) => { SC.a[q.id] = q.type === 'say' ? '随便' : q.type === 'choice' ? (q.ans + 1) % 4 : !q.ans; }); SC.i = 5; rerender('scene'); }); await w(p, 100);
  await fire('[data-rulesubmit]'); await w(p, 300);
  const retry = await p.evaluate(() => ({ retry: !!SC.retry, n: SC.qs.length, step: SC.step }));
  await p.evaluate(() => { SC.qs.forEach(q => { SC.a[q.id] = q.ans; }); SC.i = SC.qs.length - 1; rerender('scene'); }); await fire('[data-rulesubmit]'); await w(p, 300);
  console.log('安规错题复练', JSON.stringify(retry), '→', await p.evaluate(() => SC.step + ' ' + SC.res.score + ' r4=' + SC.res.dims.r4), '期望 retry true · n 6 · r4 100');
  /* 保命技能 */
  await p.evaluate(() => startScene('life:verify:teach')); await w(p, 400);
  await shot('sc_life.png');
  const nst = await p.evaluate(() => LIFE[SC.sub].steps.length);
  for (let i = 0; i < nst; i++) { await fire('[data-lifepick="' + i + '"]'); await w(p, 80); }
  await fire('[data-lifepart="1"]'); await w(p, 150);
  await p.evaluate(() => { LIFE[SC.sub].fill.forEach((f, i) => { document.querySelector('[data-lifefill="' + i + '"]').value = f[1]; }); });
  await fire('[data-lifepart="2"]'); await w(p, 150);
  await p.evaluate(() => { SC.acts.forEach(a => { if (a.bad) SC.a.acts[a.i] = true; }); rerender('scene'); }); await w(p, 100);
  await fire('[data-lifesubmit]'); await w(p, 400);
  console.log('保命', await p.evaluate(() => JSON.stringify({ score: SC.res.score, dims: SC.res.dims, recs: allRecs().length })), '期望 score 100');
  await shot('sc_life_res.png');
  /* 案例分析 */
  await p.evaluate(() => startScene('case:cl1:teach')); await w(p, 400);
  await shot('sc_case.png');
  await p.evaluate(() => { const c = SC.case; ['c1', 'c2', 'c3', 'c4'].forEach(k => { document.querySelector('[data-casein="' + k + '"]').value = c.std[k].join('；'); }); });
  await fire('[data-casesubmit]'); await w(p, 400);
  console.log('案例', await p.evaluate(() => JSON.stringify({ score: SC.res.score, dims: SC.res.dims, recs: allRecs().length })), '期望 score ≥ 90');
  await shot('sc_case_res.png');
  /* 制度学习：课件 → 讲课 → 测验 → 分析 */
  await p.evaluate(() => startScene('inst:d_ticket:teach')); await w(p, 400);
  const inst0 = await p.evaluate(() => ({ step: SC.step, slides: SC.cw.slides.length, nKey: SC.cw.nKey, th: document.querySelectorAll('.cwth').length }));
  await fire('[data-instgo="2"]'); await w(p, 150);
  await shot('sc_inst_cw.png');
  await fire('[data-instlec]'); await w(p, 900);
  const lec = await p.evaluate(() => ({ mask: document.querySelectorAll('.mask.lec, .dlg.lec').length, pav: !!document.querySelector('#lec_dh .pav'), sub: (document.querySelector('#lecsub') || {}).textContent, speaking: !!(LEC.dh && LEC.dh.speaking), st: (document.querySelector('#lecst') || {}).textContent }));
  await p.screenshot({ path: './shots/sc_lecture.png' });
  await fire('[data-lec="next"]'); await w(p, 400);
  const lec2 = await p.evaluate(() => (document.querySelector('#lecst') || {}).textContent);
  await p.evaluate(() => lecEnd()); await w(p, 200);
  const lecBtn = await p.evaluate(() => !!document.querySelector('[data-lecexam]'));
  await fire('[data-lecexam]'); await w(p, 500);
  console.log('制度课件', JSON.stringify(inst0), '讲课', JSON.stringify(lec), '翻页', lec2, '讲完→测验按钮', lecBtn, '期望 pav true · 字幕非空 · 翻页 第 4');
  const ex0 = await p.evaluate(() => ({ step: SC.step, on: EX.on, n: EX.qs.length, types: EX.qs.map(q => q.type).join(','), box: !!document.querySelector('#exbox .exq') }));
  await shot('sc_inst_exam.png');
  for (let i = 0; i < ex0.n; i++) { await p.evaluate(() => { const q = EX.qs[EX.i]; examAnswer(q.type === 'short' ? q.ans : q.ans); }); await w(p, 100); if (i < ex0.n - 1) await fire('[data-exgo="' + (i + 1) + '"]'); await w(p, 100); }
  await fire('[data-exsubmit]'); await w(p, 500);
  const inst = await p.evaluate(() => ({ step: SC.step, score: SC.res.score, dims: SC.res.dims, team: !!document.querySelector('.exres'), hist: examHist().length, recs: allRecs().length, hours: hourLog()[0].n }));
  console.log('制度测验', JSON.stringify(ex0), '→', JSON.stringify(inst), '期望 n 6 · score ≥ 90 · hist 1');
  await shot('sc_inst_res.png');
  /* 工作票 */
  await p.evaluate(() => startScene('wt::teach')); await w(p, 400);
  await shot('sc_wt.png');
  await p.evaluate(() => { WT.secs.forEach(s => { SC.pool[s.k].forEach((o, i) => { if (o.ok && s.k !== 's2') SC.a[s.k][i] = true; }); }); rerender('scene'); });
  await fire('[data-wtsubmit]'); await w(p, 300);
  const wt1 = await p.evaluate(() => ({ score: SC.res.score, fatal: SC.res.fatal, pass: SC.res.pass }));
  await p.evaluate(() => startScene('wt::exam')); await w(p, 300);
  await p.evaluate(() => { WT.secs.forEach(s => { SC.pool[s.k].forEach((o, i) => { if (o.ok) SC.a[s.k][i] = true; }); }); rerender('scene'); });
  await fire('[data-wtsubmit]'); await w(p, 300);
  const wt2 = await p.evaluate(() => ({ score: SC.res.score, pass: SC.res.pass, dims: SC.res.dims, rec: allRecs()[0].src + ' ' + allRecs()[0].wt + ' ' + allRecs()[0].n }));
  console.log('工作票 缺接地', JSON.stringify(wt1), '全对', JSON.stringify(wt2), '期望 缺接地 ≤ 59 且 fatal · 全对 100 · rec tk true 两票填写陪练');
  await shot('sc_wt_res.png');
  /* 复盘打开工作票记录 → 场景结果页 */
  await p.evaluate(() => goPage('review')); await w(p, 400);
  await fire('.rvmain [data-rec]'); await w(p, 400);
  console.log('复盘 → 工作票记录', await p.evaluate(() => location.hash + ' ' + SC.k + ' ' + SC.step), '期望 #scene wt result');
  /* 案例推送学习：课件 → 3 题 → 回写 */
  await p.evaluate(() => goPage('home')); await w(p, 500);
  await fire('.casecard [data-case]'); await w(p, 400);
  const cp0 = await p.evaluate(() => ({ mask: document.querySelectorAll('.mask').length, th: document.querySelectorAll('#cpbox .cwth').length, slide: !!document.querySelector('#cpbox .slide') }));
  await p.screenshot({ path: './shots/sc_casepush.png' });
  await fire('[data-cpexam]'); await w(p, 400);
  const cpn = await p.evaluate(() => EX.qs.length);
  for (let i = 0; i < cpn; i++) { await p.evaluate(() => { const q = EX.qs[EX.i]; examAnswer(q.ans); }); await w(p, 80); if (i < cpn - 1) await fire('[data-exgo="' + (i + 1) + '"]'); await w(p, 80); }
  await fire('[data-exsubmit]'); await w(p, 500);
  const cp = await p.evaluate(() => ({ step: CP.step, score: CP.res.score, done: !!caseList()[0].done, doneScore: (caseList()[0].done || {}).score, card: document.querySelector('.casecard').innerText.includes('已完成'), rec: allRecs()[0].sub }));
  await p.screenshot({ path: './shots/sc_casepush_done.png' });
  console.log('案例推送', JSON.stringify(cp0), '→', JSON.stringify(cp), '期望 th ≥ 4 · step 3 · done true · 卡片 已完成');
  await p.evaluate(() => $$('.mask').forEach(m => m.remove()));
  /* 知识课堂 · 课件生产线 */
  await p.evaluate(() => goPage('classroom')); await w(p, 500);
  const pipe = await p.evaluate(() => ({ docs: document.querySelectorAll('.docit').length, steps: document.querySelectorAll('.pst').length, hist: document.querySelectorAll('[data-examhist]').length }));
  await shot('sc_classroom.png');
  await fire('[data-doccw="d_report"]'); await w(p, 300);
  const cw = await p.evaluate(() => ({ mask: document.querySelectorAll('.mask').length, slides: document.querySelectorAll('.cwth').length, cur: CW.i }));
  await fire('[data-cwpage="1"]'); await w(p, 150); const cw2 = await p.evaluate(() => CW.i);
  await p.screenshot({ path: './shots/sc_cw.png' });
  await fire('[data-cwexam]'); await w(p, 400);
  const dex = await p.evaluate(() => ({ on: EX.on, n: EX.qs.length, src: EX.src, box: !!document.querySelector('.mask #exbox .exq') }));
  await p.evaluate(() => { EX.qs.forEach(q => { EX.ans[q.id] = q.ans; }); EX.i = EX.qs.length - 1; examPaint(); }); await fire('[data-exsubmit]'); await w(p, 400);
  const dres = await p.evaluate(() => ({ score: EX.res.score, team: EX.res.team.total, hist: examHist().length }));
  await p.screenshot({ path: './shots/sc_exam_res.png' });
  await p.evaluate(() => $$('.mask').forEach(m => m.remove()));
  console.log('课件生产线', JSON.stringify(pipe), '课件', JSON.stringify(cw), '翻页', cw2, '出题', JSON.stringify(dex), '→', JSON.stringify(dres), '期望 docs 3 · steps 6 · slides ≥ 4 · n 6 · hist 2');
  /* 导入文本文件 → 文件库 +1 */
  await p.setInputFiles('.pipefile', { name: '班组安全学习材料.txt', mimeType: 'text/plain', buffer: Buffer.from('第一章 总则\n第一条 作业前必须开班前会，交代风险点。\n第二条 进入作业现场应正确佩戴安全帽，不得穿拖鞋。\n第二章 现场\n第三条 高处作业必须系安全带，安全带应高挂低用。\n第四条 作业结束后应在 10 分钟内清点工器具。\n第五条 发现隐患应立即报告班组长，不得隐瞒。') }); await w(p, 600);
  console.log('导入文件', await p.evaluate(() => document.querySelectorAll('.docit').length + ' 份 · ' + docAll()[0].n + ' · 题 ' + qGen(docAll()[0], 6, 1).length), '期望 4 份 · 班组安全学习材料');
  /* 组长：班组考试分析 */
  await p.evaluate(() => { ROLE.cur = 'lead'; renderRole(); goPage('team'); }); await w(p, 600);
  console.log('组长 班组考试分析', await p.evaluate(() => document.querySelectorAll('[data-examhist]').length), '期望 ≥ 2 · 案例完成', await p.evaluate(() => document.querySelector('#hpage').innerText.includes('本人已完成')));
  await fire('[data-examhist="0"]'); await w(p, 300); console.log('看分析弹层', await p.evaluate(() => document.querySelectorAll('.mask').length)); await p.evaluate(() => $$('.mask').forEach(m => m.remove()));
  /* 班组长导入通报 → 生成 → 推送 */
  await fire('[data-casepush]'); await w(p, 300);
  await p.fill('#cp_t', '10kV 某线路杆上作业高处坠落事故通报'); await p.fill('#cp_body', '某供电所作业人员在杆上作业时未系安全带，移动位置时坠落受伤。直接原因是作业人员未按规定使用安全带。间接原因是工作负责人未履行监护职责，班前会未交代风险。违反安规高处作业应使用安全带的规定。各班组应立即组织学习，高处作业必须系安全带，严禁无监护作业。');
  await fire('[data-casegen]'); await w(p, 400);
  console.log('导入通报生成案例', await p.evaluate(() => caseList().length + ' 个 · ' + caseList().find(c => /坠落/.test(c.t)).cause.join(' / ').slice(0, 60)), '期望 3 个');
  /* 新记录在复盘 / 档案 / 首页六场景中可见 */
  await p.evaluate(() => { ROLE.cur = 'student'; renderRole(); goPage('home'); }); await w(p, 500);
  console.log('记录', await p.evaluate(() => (allRecs().length - 0) + ' 条（新增 ' + (allRecs().length) + ')'), '起始', n0, '· 六场景本期', await p.evaluate(() => JSON.stringify(Object.fromEntries(SCENES.map(s => [s.k, abilityCalc().scene[s.k].score])))));
  /* 禁词 */
  const banned = await p.evaluate(() => { const t = document.body.innerText; return ['手术', '骨架', '门禁', '模拟', '预设', 'mock'].filter(x => t.includes(x)); });
  console.log('禁词（首页）', banned.join(',') || 'none');
  console.log('ERR', errs.length ? errs.join(' | ') : 'none');
  await b.close();
})();
