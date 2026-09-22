/* AI 智能陪练平台回归：场景中心 A–F / 操作票（标准画法主接线图 · 票号手填 · 子项定位 · 回车增行 · 训练与考核区分 · Word/Excel 导入 · 判定自测 · 六种答卷判卷）/ 专家选聘答辩 / 三维能力地图 / 数据分析 / 系统与权限 / 讲师演示台
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
  /* 09-21 反馈：主接线图标准画法 / 票号手填 / 子项定位 / Enter 增行 / 训练与考核区分 / 上传导入 */
  const sym = await p.evaluate(() => ({ legend: document.querySelectorAll('.tklg .tkdev').length, gnd: document.querySelectorAll('.tkbus .tkdev.gnd').length, fill: document.querySelectorAll('.tkbus rect.fill').length, noInput: !!document.querySelector('#tkno'), fixedNo: /票号 2609001/.test(document.querySelector('#hpage').innerText) }));
  console.log('部件画法与票号', JSON.stringify(sym), '期望 legend 7（刀闸/开关/地刀 合分 + 主变）· gnd 3 · 票号为输入框且页面不再印死票号');
  const sub = await p.evaluate(() => {
    TK.rows = [{ t: '接调度令', child: false }, { t: '在110kV考核Ⅰ线1161间隔智能柜：', child: false }, { t: '汇报调度', child: false }];
    TK.focus = 1; tkPaint(); tkAddChild();
    return TK.rows.map(r => r.no + (r.child ? '子' : ''));
  });
  console.log('加子项定位', JSON.stringify(sub), '期望 ["1","2","2.1子","3"]：子项加在当前主项下，不落到最后一行');
  const ent = await p.evaluate(() => { TK.focus = 0; tkEnterAt(0); return TK.rows.map(r => r.no + (r.child ? '子' : '')); });
  console.log('回车增行', JSON.stringify(ent), '期望在第 1 项下方插入新的主项');
  const teach = await p.evaluate(() => {
    TK.mode = 'teach'; TK.rows = [{ t: '接调度令', child: false }, { t: '拉开11614刀闸', child: false }, { t: '合上考核Ⅰ线线路侧116140地刀', child: false }, { t: '随便写一句话', child: false }];
    tkCheckAll();
    return { fb: Object.keys(TK.fb).map(k => TK.fb[k].cls).join(''), step: /阶段A/.test(tkStepHTML()) };
  });
  console.log('训练模式即时判定', JSON.stringify(teach), '期望 fb = g r r w（对 / 未先断开关就拉刀闸属带负荷拉刀闸 / 未验电就合地刀 / 认不出）· 阶段进度可见');
  const exam = await p.evaluate(() => { TK.mode = 'exam'; tkCheckAll(); return { fb: Object.keys(TK.fb).length, step: tkStepHTML() }; });
  console.log('考核模式关闭提示', JSON.stringify({ fb: exam.fb, step: exam.step }), '期望 fb 0 且阶段条为空');
  await p.evaluate(() => { TK.mode = 'exam'; TK.rows = tkAuto('danger').map(r => ({ t: r.t, child: !!r.parent })); tkPaint(); }); await w(p, 300);
  await p.click('#tksubmit'); await w(p, 500);
  console.log('未填票号不给提交', await p.evaluate(() => TK.res == null), '期望 true');
  await p.evaluate(() => { TK.no = '2609001'; const n = document.querySelector('#tkno'); if (n) n.value = '2609001'; });
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

  /* ---------- 上传导入：Word / Excel 按模板解析 ---------- */
  await p.evaluate(() => { TK.res = null; TK.rec = null; goPage('ticket'); }); await w(p, 400);
  const self = await p.evaluate(() => { document.querySelector('#tkself').click(); return 1; }); await w(p, 600);
  console.log('判定逻辑自测', await p.evaluate(() => document.querySelectorAll('.tkselft tr').length), '期望 7（表头 + 六种答卷）');
  await p.click('#tkstart'); await w(p, 500);
  const up = await p.evaluate(async () => {
    const mk = rows => rows.map(r => `<row><c t="inlineStr"><is><t>${r[0]}</t></is></c><c t="inlineStr"><is><t>${r[1]}</t></is></c></row>`).join('');
    const rows = TICKET.map(s => [s.no, s.t]);
    const sheet = `<worksheet><sheetData><row><c t="inlineStr"><is><t>序号</t></is></c><c t="inlineStr"><is><t>操作步骤</t></is></c></row>${mk(rows)}</sheetData></worksheet>`;
    const r = TKUP.parseExcel((sheet.match(/<row[ >][\s\S]*?<\/row>/g) || []).map(x => (x.match(/<c [^>]*?(?:\/>|>[\s\S]*?<\/c>)/g) || []).map(c => (c.match(/<is><t[^>]*>([^<]*)<\/t>/) || [])[1] || '')));
    TK.rows = r.rows.map(x => ({ t: x.t, child: x.child })); TK.no = '2609002'; tkPaint();
    const j = tkJudge(TK.rows.filter(x => x.t.trim()));
    return { rows: r.rows.length, sub: r.rows.filter(x => x.child).length, bad: r.bad.length, score: j.score, errs: j.errs.length };
  });
  console.log('Excel 模板导入 → 判卷', JSON.stringify(up), '期望 rows 70 · sub 22 · bad 0 · score 100 · errs 0');
  const wd = await p.evaluate(() => {
    const paras = ['#第一行填写操作任务', '将110kV考核Ⅰ线1161线路及开关由运行转检修', '', '接调度令', '在110kV考核Ⅰ线1161间隔智能柜：', '$检查11614刀闸合位指示灯灭', '$检查11614刀闸分位指示灯亮', '上方只截取了一部分操作票内容作为参考'];
    const r = TKUP.parseWord(paras);
    return { task: r.task, rows: r.rows.length, sub: r.rows.filter(x => x.child).length };
  });
  console.log('Word 模板解析', JSON.stringify(wd), '期望 task 为操作任务 · rows 4 · sub 2（$ 标记的是子项，说明文字被跳过）');

  /* ---------- 专家选聘：五类专家 · 业绩自测 · 综合评价 ---------- */
  await p.evaluate(() => { TK.res = null; TK.rec = null; TK.on = false; }); await go('expert', 700);
  const kinds = await p.evaluate(() => ({
    cards: document.querySelectorAll('.epk').length,
    names: EXP_KINDS.map(x => x.n),
    w: EXP_KINDS.map(x => x.n + '：' + x.w.map(y => y[0] + ' ' + y[2] + '%').join(' + ')),
    role: EP_OPT.role.map(x => x[0]),
    panel: EXP_PANEL.length
  }));
  console.log('五类专家', JSON.stringify(kinds.names), '期望 技能专家 + 科研 / 技术 / 专业-职能 / 专业-市场 四类专业技术专家');
  kinds.w.forEach(x => console.log('  权重', x));
  console.log('角色身份', JSON.stringify(kinds.role), '期望按附件1 四、（三）面试答辩专家组：组长 / 人资评委 / 业务评委 / 专家评委');
  const ach = await p.evaluate(() => Object.keys(EXP_ACH).map(k => EXP_ACH[k].n + '：' + EXP_ACH[k].items.map(i => i.n + ' ' + i.w + '%').join('、')));
  ach.forEach(x => console.log('  代表性成果标准', x));
  const pf = await p.evaluate(() => {
    EP.perf = { '101-104': { lv: 1, role: 0, n: 2 }, '501': { n: 260 }, '504': { n: 2 }, '1701': { n: 3 }, '1101-1107': { lv: 4, role: 0, n: 1 } };
    const r = perfCalc(EP.perf);
    return { total: r.total, g: r.groups.filter(x => x.sum).map(x => x.g + ' ' + x.sum), items: PERF_STD.reduce((a, g) => a + g.items.length, 0), groups: PERF_STD.length };
  });
  console.log('业绩贡献自评', JSON.stringify(pf), '期望 一级指标 9 类 · 南网级解决问题排名第1×2=20 · 两票 260 张=10（本项上限 10）· 绩效A 2 次=8 · 省级竞赛一等=14 · 带徒 3 名按上限计 2 · 合计 54');
  const ov = await p.evaluate(() => {
    EP.kind = 'skill'; EP.perfDone = true; EP.site = { lab: 86, theory: 78 };
    const o1 = expOverall('skill', 54, { core: 80, bid: 75, ach: null, site: EP.site });
    const o2 = expOverall('tech', 54, { core: 80, bid: 75, ach: 82, site: {} });
    return { skill: o1.rows.map(r => r.n + ' ' + r.w + '% ' + (r.v == null ? '未录入' : r.v) + '→' + r.part), sum1: o1.sum, tech: o2.rows.map(r => r.n + ' ' + r.w + '% ' + r.v + '→' + r.part), sum2: o2.sum };
  });
  console.log('综合评价 · 技能专家', JSON.stringify(ov.skill), '合计', ov.sum1, '期望 业绩 40% + 实操 30% + 理论 15% + 答辩 15%');
  console.log('综合评价 · 技术序列', JSON.stringify(ov.tech), '合计', ov.sum2, '期望 业绩 60% + 代表性成果 25% + 发展潜力 15%');
  const xls = await p.evaluate(() => { let name = null; const c = document.createElement.bind(document); document.createElement = t => { const e = c(t); if (t === 'a') { e.click = () => { name = e.download; }; } return e; };
    const blocks = [{ t: '测试', head: ['a'], rows: [['b']] }]; xlsDownload('x.xls', 'T', 'S', blocks); document.createElement = c; return name; });
  console.log('导出格式', xls, '期望 .xls（HTML 表格 + Excel MIME，离线带格式）');

  /* ---------- 首页与成长档案：能力项改为通用素质模型 ---------- */
  await go('home', 700);
  const rad = await p.evaluate(() => ({ head: document.querySelector('.ck.tl .hch').innerText.replace(/\n/g, ' '), dims: GEN_DIMS, skillCard: document.querySelector('.ck.br .hch').innerText.replace(/\n/g, ' ') }));
  console.log('首页能力雷达', JSON.stringify(rad), '期望主雷达为通用素质模型五项，技能八维降为对标卡');
  await go('growth', 700);
  const gr = await p.evaluate(() => ({ model: GR.model, chips: document.querySelectorAll('[data-gmodel]').length, dims: Array.from(document.querySelectorAll('#gradar text')).map(t => t.textContent).filter(x => GEN_DIMS.includes(x)).length }));
  console.log('成长档案能力全景', JSON.stringify(gr), '期望默认通用素质模型五维，可切换技能水平八维');

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
