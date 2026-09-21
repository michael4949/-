/* AI 智能陪练平台回归：场景中心 A–F / 操作票填写与判卷六种答卷 / 专家选聘答辩 / 三维能力地图 / 数据分析 / 系统与权限 / 讲师演示台
   用法：node v2plat.js　期望：ERR none，各断言按注释对照 */
const { chromium } = require(process.env.PW || '/home/user/-/node_modules/playwright');
const F = require('url').pathToFileURL(require('path').resolve(__dirname, 'dist', '小瓦特练_AI智能陪练平台_高保真原型.html')).href;
const w = (p, ms) => p.waitForTimeout(ms);
const BAN = /演示环境|本模块展示|待建|下一版本|评委打分演示|一期范围/;
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1500, height: 1000 } }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto(F); await w(p, 1200);
  await p.evaluate(() => { window.__DH_MUTE = true; window.__DH_SPEED = 0.05; localStorage.clear(); });
  const go = async (h, ms) => { await p.evaluate(x => goPage(x), h); await w(p, ms || 500); };

  /* ---------- 场景中心：A–F 六大类全展示，只有 A / E 可进 ---------- */
  await go('center', 700);
  const sc = await p.evaluate(() => ({
    groups: document.querySelectorAll('.scg').length,
    all: document.querySelectorAll('.sc').length,
    open: document.querySelectorAll('.sc.on').length,
    risk: document.querySelectorAll('.riskrow .rk').length,
    cls: Array.from(document.querySelectorAll('.scg .cls')).map(x => x.textContent).join('')
  }));
  console.log('场景中心', JSON.stringify(sc), '期望 groups 6 · open 4 · cls ABCDEF');

  /* ---------- 操作票判卷：六种答卷 ---------- */
  const J = await p.evaluate(() => ['ok', 'swap', 'order', 'miss', 'text', 'danger'].map(k => {
    const r = tkJudge(tkAuto(k));
    return { k, score: r.score, raw: r.raw, pass: r.pass, fatal: r.fatal.length, kinds: r.byKind };
  }));
  J.forEach(x => console.log('判卷', x.k, JSON.stringify(x)));
  console.log('  期望：ok/swap 100 分无错 · order 仅 1 条顺序错误 · miss 4 条漏项不连锁 · text 文字+漏项 · danger 整票不合格计 0 分（扣分前 96）');

  /* ---------- 依据条款：真实条文，检索不到不编造 ---------- */
  const cite = await p.evaluate(() => {
    const r = tkJudge(tkAuto('danger'));
    const d = r.errs.find(e => e.kind === 'danger');
    return { title: d.title, n: d.cites.length, no: d.cites.map(c => c.no), hasBody: d.cites.every(c => c.body && c.body.length > 20), none: RULE_NONE };
  });
  console.log('制度依据', JSON.stringify(cite), '期望 6.3.1 与 6.3.8 且条文正文非空');

  /* ---------- 写票页：题目界面四件套 ---------- */
  await go('ticket', 600);
  await p.click('#tkstart'); await w(p, 700);
  const form = await p.evaluate(() => ({
    rows: document.querySelectorAll('.tkin').length,
    dev: document.querySelectorAll('[data-dev]').length,
    gear: document.querySelectorAll('.tkgear').length,
    runway: document.querySelectorAll('.tkrun p').length,
    task: (document.querySelector('.tktask p') || {}).textContent
  }));
  console.log('题目界面', JSON.stringify(form), '期望 dev≥12（主接线图可点设备）· gear 5（空开压板屏柜）· runway 5');
  await p.evaluate(() => { TK.rows = tkAuto('danger').map(r => ({ t: r.t, child: !!r.parent })); tkPaint(); }); await w(p, 300);
  await p.click('#tksubmit'); await w(p, 1000);
  const res = await p.evaluate(() => ({
    score: TK.res.score, fatal: TK.res.fatal, errCards: document.querySelectorAll('.tkerr').length,
    nine: Array.from(document.querySelectorAll('.tkerr')[0].querySelectorAll('.er i')).map(x => x.textContent),
    stages: document.querySelectorAll('.tkstage .stg').length, rec: JSON.parse(localStorage.getItem('xwt_ticket') || '[]').length
  }));
  console.log('判卷页', JSON.stringify(res), '期望 九要素含 错误位置/正确要求/为什么错/业务执行原因/制度依据/建议写法 · 阶段 3 · 档案 1');
  const tabs = await p.evaluate(() => { document.querySelector('[data-tktab="cmp"]').click(); return 1; }); await w(p, 600);
  const cmp = await p.evaluate(() => ({ rows: document.querySelectorAll('.tkcmp tr').length, miss: document.querySelectorAll('.tkmiss span').length }));
  console.log('答卷对照', JSON.stringify(cmp), '期望 rows = 学员项 + 表头');
  await p.evaluate(() => { document.querySelector('[data-tktab="rule"]').click(); }); await w(p, 500);
  console.log('命中条款', await p.evaluate(() => document.querySelectorAll('.cit.big').length), '期望 ≥ 2');

  /* ---------- 专家选聘答辩 ---------- */
  await p.evaluate(() => { TK.res = null; }); await go('expert', 600);
  const cfg = await p.evaluate(() => document.querySelectorAll('[data-epcfg]').length);
  console.log('数字人定制项', cfg, '期望 7（性别/性格/年龄/教育背景/角色身份/情绪状态/语言风格）');
  await p.click('#epstart'); await w(p, 1200);
  for (let i = 0; i < 5; i++) {
    const has = await p.evaluate(() => !!document.querySelector('#ep_in'));
    if (!has) break;
    await p.evaluate(() => { const q = EP.rounds[EP.i].q; document.querySelector('#ep_in').value = EXP_SAMPLE[q.k] || ''; });
    await p.click('#ep_send'); await w(p, 700);
    const n = await p.evaluate(() => !!document.querySelector('#ep_next')); if (n) { await p.click('#ep_next'); await w(p, 700); }
  }
  const ep = await p.evaluate(() => EP.res ? ({
    core: EP.res.coreSum, bid: EP.res.bidSum, rounds: EP.res.rounds.length,
    coreItems: EP.res.core.map(c => c.item.n + ' ' + c.sc + '/' + c.item.w + ' ' + c.lv[0]),
    dims: EP.res.dims.filter(d => d.v != null).length, rec: JSON.parse(localStorage.getItem('xwt_expert') || '[]').length
  }) : null);
  console.log('答辩测评', JSON.stringify(ep), '期望 5 题 · 核心能力三项分档 · 通用能力至少 3 项有值 · 档案 1');
  const red = await p.evaluate(() => expScore('这个事我们当时先干了再说，反正没出过事。', EXP_Q[5]));
  console.log('合规红线', red.total, red.red.map(r => r.t), '期望 分值低且命中两条红线');

  /* ---------- 三维能力地图 ---------- */
  await go('assess', 900);
  const as = await p.evaluate(() => {
    const S = m3Scores();
    return { sum: S.sum, dims: document.querySelectorAll('.asdim').length, tri: document.querySelectorAll('.chtri .tri').length, skillItems: S.skill.length, genItems: S.gen.length, leadItems: S.lead.length };
  });
  console.log('能力地图', JSON.stringify(as), '期望 三维 · 技能 13 项（八维 + 写票五项）· 通用 5 · 领导 5（无实测）');
  await p.evaluate(() => document.querySelector('.asdim[data-tri="gen"]').click()); await w(p, 600);
  console.log('通用能力下钻层级卡', await p.evaluate(() => document.querySelectorAll('.lvc').length), '层级条目', await p.evaluate(() => document.querySelectorAll('.lvs li').length), '期望 5 张 / 20 条');

  /* ---------- 数据分析 ---------- */
  await go('analytics', 900);
  const an = await p.evaluate(() => ({
    recs: platRecords().length, charts: document.querySelectorAll('svg').length,
    waterfall: document.querySelectorAll('.chw .wfd').length, group: document.querySelectorAll('.chw rect[data-gb]').length,
    filters: document.querySelectorAll('[data-pf]').length, legend: document.querySelectorAll('[data-lg]').length, peers: document.querySelectorAll('.tb.rk tr').length
  }));
  console.log('数据分析', JSON.stringify(an), '期望 瀑布图有扣分段 · 分组柱 18 根（6 人 × 3 场景）· 筛选 4 个下拉 · 图例 3');
  await p.evaluate(() => { PLAT.f.scene = 'ticket'; goPage('analytics'); }); await w(p, 700);
  console.log('筛选联动后记录数', await p.evaluate(() => platFiltered().length), '期望只剩操作票记录');
  await p.evaluate(() => { PLAT.f.scene = ''; goPage('analytics'); }); await w(p, 500);

  /* ---------- 系统与权限 ---------- */
  await go('sys', 700);
  const sys = await p.evaluate(() => ({ roles: document.querySelectorAll('.tb tr').length, funcs: document.querySelectorAll('.sysf>div').length, txt: document.querySelector('#hpage').innerText }));
  console.log('系统与权限', { roles: sys.roles, funcs: sys.funcs }, '期望 通用功能 6 项 · 三类角色');
  console.log('  版本冻结与配置项写到界面?', /发布冻结/.test(sys.txt) && /配置项/.test(sys.txt));

  /* ---------- 讲师演示台 ---------- */
  await p.evaluate(() => document.querySelector('#demo2tg').click()); await w(p, 300);
  const dm = await p.evaluate(() => Array.from(document.querySelectorAll('#demo2 [data-dm]')).map(x => x.dataset.dm));
  console.log('讲师演示台', dm.length, '项', dm.join(','));

  /* ---------- 铁律：界面禁词 ---------- */
  let ban = null;
  for (const h of ['home', 'center', 'ticket', 'expert', 'assess', 'analytics', 'sys']) {
    await go(h, 450);
    const t = await p.evaluate(() => document.querySelector('#hpage').innerText);
    const m = t.match(BAN); if (m) { ban = h + ':' + m[0]; break; }
  }
  console.log('禁词', ban || 'none');
  console.log('ERR', errs.length ? errs.slice(0, 6).join(' | ') : 'none');
  await b.close();
})();
