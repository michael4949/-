/* AI 智能陪练平台回归：场景中心（两大场景）/ 操作票（接线图 · 屏柜附表 · 票号手填 · 子项定位 · 回车增行 · 训练与考核区分 · Word/Excel/文本上传 · 判定自测 · 七种答卷判卷 · 真实条款）/
   应急处置（21 情境 · 三步作答 · 提示 · 点评 · 留痕 · 回看）/ AI 测评九项 / 数据分析 / 系统与权限 / 讲师演示台 / 禁词
   用法：node v2plat.js　期望：ERR none，各断言按注释对照 */
const { chromium } = require(process.env.PW || '/home/user/-/node_modules/playwright');
const path = require('path');
const F = require('url').pathToFileURL(path.resolve(__dirname, 'dist', '小瓦特练_AI智能陪练平台_高保真原型.html')).href;
const SMP = f => path.resolve(__dirname, 'samples', f);
const w = (p, ms) => p.waitForTimeout(ms);
const BAN = /演示环境|本模块展示|待建|下一版本|一期范围|陪练关卡|专家答辩|教练中心/;
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1500, height: 1000 } }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto(F); await w(p, 1000);
  await p.evaluate(() => localStorage.clear());
  const go = async (h, ms) => { await p.evaluate(x => goPage(x), h); await w(p, ms || 500); };
  const clk = sel => p.evaluate(s => { const n = document.querySelector(s); if (n) n.click(); return !!n; }, sel);

  /* ---------- 场景中心：两大场景 ---------- */
  await go('center', 600);
  console.log('场景中心', JSON.stringify(await p.evaluate(() => ({ scenes: document.querySelectorAll('.scbig').length, cats: document.querySelectorAll('.emcatrow .chip').length, nav: Array.from(document.querySelectorAll('#hnav .hnavi')).map(n => n.textContent.replace(/管理$/, '')).join('/') }))), '期望 scenes 2 · cats 6 · 导航 工作台/场景中心/操作票填写/应急处置/AI 测评/数据分析/管理视角/系统与权限');

  /* ---------- 操作票判卷：七种答卷 ---------- */
  const J = await p.evaluate(() => ['ok', 'swap', 'order', 'miss', 'text', 'danger', 'load'].map(k => { const r = tkJudge(tkAuto(k)); return { k, score: r.score, raw: r.raw, fatal: r.fatal.length, kinds: r.byKind }; }));
  J.forEach(x => console.log('判卷', x.k, JSON.stringify(x)));
  console.log('  期望：ok/swap 100 无错 · order 97（仅 1 条顺序错误）· miss 92（4 条漏项不连锁）· text 98（2 条文字：并项 + 缺双重名称）· danger 0（扣分前 100，只 1 条危险）· load 0（只 1 条危险，不重复计顺序）');
  const cite = await p.evaluate(() => { const r = tkJudge(tkAuto('danger')); const d = r.errs.find(e => e.kind === 'danger'); return { title: d.title, at: d.stdNo, no: d.cites.map(c => c.no), body: d.cites.every(c => c.body.length > 20) }; });
  console.log('制度依据', JSON.stringify(cite), '期望 at 41 · no 6.3.1 / 6.3.8 · 条文正文非空');
  const none = await p.evaluate(() => { const r = tkJudge(tkAuto('load')); const d = r.errs.find(e => e.kind === 'danger'); return { title: d.title, cites: d.cites.length }; });
  console.log('无条款的危险规则', JSON.stringify(none), '期望 cites 0（界面显示建议人工复核）');
  const extra = await p.evaluate(() => { const rows = tkAuto('ok'); rows.splice(60, 0, { t: '退出#3主变保护屏低后保护532开关跳闸出口3-2LP3压板' }); const r = tkJudge(rows); const e = r.errs.find(x => x.kind === 'extra'); return { score: r.score, deduct: e && e.deduct, review: e && e.review }; });
  console.log('标准票未列的压板操作', JSON.stringify(extra), '期望 score 100 · deduct 0 · review true');

  /* ---------- 写票页：题目界面 ---------- */
  await go('ticket', 500);
  await clk('#tkstart'); await w(p, 600);
  console.log('题目界面', JSON.stringify(await p.evaluate(() => ({ dev: document.querySelectorAll('.tkbus [data-dev]').length, gear: document.querySelectorAll('details.tkgear').length, runway: document.querySelectorAll('.tkrun p').length, ask: document.querySelectorAll('.tkask2 li').length, legend: document.querySelectorAll('.tklg .tkdev').length, noInput: !!document.querySelector('#tkno'), task: (document.querySelector('.tktask p') || {}).textContent }))), '期望 dev≥40 · gear 7 · runway 4（三段运行方式 + 附表说明）· ask 4 · legend 8');
  await p.evaluate(() => { const n = document.querySelector('[data-dev="1103"]'); n.dispatchEvent(new MouseEvent('click', { bubbles: true })); }); await w(p, 150);
  console.log('设备弹窗', await p.evaluate(() => (document.querySelector('#tkpop') || {}).innerText.replace(/\n/g, ' ')));
  const sub = await p.evaluate(() => { TK.rows = [{ t: '接调度令', child: false }, { t: '在11P 10kV备用电源自投装置屏：', child: false }, { t: '合上#3主变变高中性点113000地刀', child: false }]; TK.focus = 1; tkPaint(); tkAddChild(); return TK.rows.map(r => r.no + (r.child ? '子' : '')); });
  console.log('加子项定位', JSON.stringify(sub), '期望 ["1","2","2.1子","3"]');
  const ent = await p.evaluate(() => { tkPaint(); const inp = document.querySelector('.tkin[data-i="0"]'); inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); return { n: TK.rows.length, focus: TK.focus }; });
  console.log('回车增行', JSON.stringify(ent), '期望 n 5 · focus 1');
  /* 训练模式：边写边判 + 危险操作即时标红 + 三级提示 */
  await p.evaluate(() => { TK.mode = 'teach'; TK.rows = [{ t: '接调度令', child: false }, { t: '核对相关设备的运行方式', child: false }, { t: '断开#3主变变低503开关', child: false }]; tkCheckAll(); });
  console.log('训练即时判定', JSON.stringify(await p.evaluate(() => Object.keys(TK.fb).map(k => TK.fb[k].cls).join(''))), '期望 "ggr"（第 3 行未转负荷就断开 503 标红）');
  const hint = await p.evaluate(() => { TK.hintLv = {}; const a = []; for (let i = 0; i < 3; i++) { tkHint(); a.push(TK.hint.lv + ':' + TK.hint.msg.slice(0, 18)); } return a; });
  console.log('三级提示', JSON.stringify(hint));
  /* 上传：客户典型票 xlsx / Word 表格 / 逐行文本 */
  await p.setInputFiles('#tkfile', SMP('ticket_answer_client.xlsx')); await w(p, 700);
  const up1 = await p.evaluate(() => ({ rows: TK.rows.length, sub: TK.rows.filter(r => r.child).length, imp: TK.imported, score: tkJudge(TK.rows.map(r => ({ t: r.t, parent: r.child ? 'x' : null }))).score }));
  console.log('Excel 上传（客户典型票原件）', JSON.stringify(up1), '期望 rows 58 · sub 10 · score 90（10 处编号与附表不一致）');
  await p.setInputFiles('#tkfile', SMP('ticket_word_table.docx')); await w(p, 700);
  console.log('Word 表格上传', JSON.stringify(await p.evaluate(() => ({ rows: TK.rows.length, sub: TK.rows.filter(r => r.child).length, imp: TK.imported }))), '期望 rows 58 · sub 10');
  await p.setInputFiles('#tkfile', SMP('ticket_lines.txt')); await w(p, 600);
  console.log('文本上传', JSON.stringify(await p.evaluate(() => ({ rows: TK.rows.length, first: TK.rows[0].t }))), '期望 rows 12 · 第一行 接调度令');
  /* 提交判卷（票号未填不给交） */
  await p.evaluate(() => { TK.mode = 'exam'; TK.rows = tkAuto('danger').map(r => ({ t: r.t, child: !!r.parent })); tkPaint(); }); await w(p, 200);
  await clk('#tksubmit'); await w(p, 300);
  const blocked = await p.evaluate(() => !TK.res);
  await p.fill('#tkno', '2609001'); await clk('#tksubmit'); await w(p, 600);
  console.log('提交', JSON.stringify(await p.evaluate(() => ({ score: TK.res.score, fatal: TK.res.fatal, cards: document.querySelectorAll('.tkerr').length, rec: tkRecords().length, cites: document.querySelectorAll('.tkerr .cit').length }))), '未填票号被拦', blocked, '期望 score 0 · 1 张危险操作卡 · cites 2（安规 6.3.1 / 6.3.8 原文）');
  await p.screenshot({ path: './shots/plat_ticket_result.png', fullPage: true });
  await clk('[data-tktab="cmp"]'); await w(p, 300);
  console.log('对照页签', await p.evaluate(() => document.querySelectorAll('.tkcmp tr').length - 1), '期望 57');
  await go('ticket', 300); await clk('#tkagain'); await w(p, 300);
  await clk('#tkself'); await w(p, 400);
  console.log('判定自测', await p.evaluate(() => Array.from(document.querySelectorAll('.tkselft tr')).slice(1).map(tr => tr.children[1].textContent.replace(/（.*）/, '')).join(',')), '期望 100,100,97,92,98,0,0');

  /* ---------- 应急处置 ---------- */
  await go('emerg', 500);
  const el = await p.evaluate(() => ({ tiles: document.querySelectorAll('.emt').length, cards: new Set(EMG.map(e => e.card)).size, cats: document.querySelectorAll('.emcats .chip').length }));
  console.log('应急列表', JSON.stringify(el), '期望 tiles 21 · cards 17 · cats 7');
  const EV = await p.evaluate(() => EMG.map(e => { const r = k => emgScore(e, emgModel(e, k)).score; return e.id + ':' + r('ok') + '/' + r('part') + '/' + r('key'); }).join(' '));
  console.log('应急计分（完整/一半/漏指事例）', EV);
  console.log('  期望：每个情境完整作答 100；无注意事项的情境（poison/food/terror/fall/strike）漏指事例仍 100');
  await clk('[data-emgo="confined"]'); await w(p, 400);
  const st = await p.evaluate(() => ({ steps: document.querySelectorAll('.emsteps span').length, sit: (document.querySelector('.emsit') || {}).innerText }));
  await p.fill('#em_in', '立即停止作业，在外面呼喊\n通风，打120'); await clk('#emhint'); await w(p, 150);
  const h1 = await p.evaluate(() => document.querySelector('.tkhintbox').innerText);
  await clk('#emnext'); await w(p, 250);
  const cs = await p.evaluate(() => !!document.querySelector('.emcase'));
  await p.fill('#em_in', '监护人没检测气体就下去救人，属于盲目施救'); await clk('#emnext'); await w(p, 250);
  await p.fill('#em_in', '电话报告时间地点，原因在检查中，10分钟内elink报送，报分管副总'); await clk('#emsubmit'); await w(p, 500);
  const er = await p.evaluate(() => ({ score: EM.res.score, sp: EM.res.sp, sn: EM.res.sn, sb: EM.res.sb, keyMiss: EM.res.keyMiss, add: document.querySelectorAll('.emadd li').length, rec: emRecords().length }));
  console.log('应急三步作答', JSON.stringify(st), '| 提示', h1.replace(/\n/g, ' ').slice(0, 40), '| 事例', cs, '| 点评', JSON.stringify(er), '期望 steps 4 · sn 40 · keyMiss 0 · rec 1');
  await p.screenshot({ path: './shots/plat_emerg_result.png', fullPage: true });
  await clk('#emlist'); await w(p, 300); await clk('[data-emopen="0"]'); await w(p, 400);
  console.log('回看', await p.evaluate(() => EM.res && EM.res.score));

  /* ---------- AI 测评 / 数据分析 / 系统与权限 ---------- */
  await go('assess', 500);
  const as = await p.evaluate(() => ({ groups: document.querySelectorAll('.asdim').length, chips: document.querySelectorAll('.asl span').length, recs: document.querySelectorAll('.asrec').length }));
  await p.evaluate(() => { const n = document.querySelector('.asdim[data-tri="tk"]'); n.dispatchEvent(new MouseEvent('click', { bubbles: true })); }); await w(p, 400);
  console.log('AI 测评', JSON.stringify(as), '下钻行', await p.evaluate(() => document.querySelectorAll('.card .tb tr').length - 1), '期望 groups 2 · chips 9 · 下钻 5');
  await go('analytics', 500);
  const an0 = await p.evaluate(() => platFiltered().length);
  await p.selectOption('[data-pf="scene"]', 'em'); await w(p, 400);
  console.log('数据分析', JSON.stringify({ all: an0, em: await p.evaluate(() => platFiltered().length), charts: await p.evaluate(() => document.querySelectorAll('.anrow .card svg').length) }), '期望 em < all');
  await p.evaluate(() => { ROLE.cur = 'lead'; renderRole(); }); await go('sys', 400);
  console.log('系统与权限', JSON.stringify(await p.evaluate(() => ({ roles: document.querySelector('.wrap .card .tb').rows.length - 1, text: /17 类/.test(document.querySelector('#hpage').innerText) }))), '期望 roles 3 · text true');

  await p.evaluate(() => { ROLE.cur = 'student'; renderRole(); });
  /* ---------- 讲师演示台 ---------- */
  const dm = await p.evaluate(() => Array.from(document.querySelectorAll('#demo2 [data-dm]')).map(b => b.dataset.dm));
  console.log('讲师演示台', dm.length, dm.join(','));
  await p.evaluate(() => demoAct('em_key')); await w(p, 600); await clk('#emsubmit'); await w(p, 400);
  console.log('演示台 em_key', await p.evaluate(() => [EM.res.score, EM.res.keyMiss]), '期望 68 · keyMiss 3');
  await p.evaluate(() => demoAct('status')); await w(p, 300);
  console.log('状态清单行数', await p.evaluate(() => document.querySelectorAll('.statlist tr').length - 1)); await p.evaluate(() => $$('.mask').forEach(m => m.remove()));

  /* ---------- 禁词（界面文字） ---------- */
  const bad = [];
  for (const h of ['home', 'center', 'ticket', 'emerg', 'assess', 'analytics', 'review', 'growth', 'classroom', 'sys']) { await go(h, 350); const t = await p.evaluate(() => document.querySelector('#hpage').innerText); const m = t.match(BAN); if (m) bad.push(h + ':' + m[0]); }
  console.log('禁词', bad.length ? bad.join(' ') : 'none');
  console.log('ERR', errs.length ? errs.join(' | ') : 'none');
  await b.close();
})();
