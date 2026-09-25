/* ===== 系统首页（工作台）· 路由 · 下钻 · 讲师演示台 · 背景动效 ===== */

let __xwTyped = false;
function goPage(h) { if ((location.hash || '').replace(/^#\/?/, '') === h) route(); else location.hash = '#' + h; }
const PAGES = ['home', 'center', 'ticket', 'emerg', 'assess', 'analytics', 'review', 'growth', 'classroom', 'team', 'sys'];

/* ---------------- 路由 ---------------- */
function route() {
  let h = (location.hash || '').replace(/^#\/?/, '') || 'home';
  if (!PAGES.includes(h)) h = 'home';
  if ((h === 'team' || h === 'sys') && ROLE.cur !== 'lead') h = 'home';
  renderHPage(h); HomeFX.on();
  $$('#hnav .hnavi').forEach(a => a.classList.toggle('on', a.dataset.h === h));
}

/* 打开场景：tk / tk:exam / em / em:<情境>:<模式> */
function startScene(spec) {
  const [s, a, b] = String(spec || '').split(':');
  if (s === 'tk') { TK.res = null; return tkStart(a === 'exam' ? 'exam' : 'teach', false); }
  if (s === 'em') { if (a && EMGMAP[a]) return emStart(a, b === 'exam' ? 'exam' : 'teach'); EM.id = null; EM.res = null; return goPage('emerg'); }
  goPage('center');
}
/* 打开某次演练的报告（本机记录与模拟记录同一入口） */
function openRec(id) {
  const r = recById(id); if (!r) return;
  if (r.src === 'tk') {
    TK.res = tkJudge(r.rows || []); TK.on = false; TK.tab = 'err';
    TK.rec = { d: r.d, no: r.mock ? '—' : (r.sub || '').replace('票号 ', ''), mode: r.mode, sec: r.sec, score: r.score, pass: r.pass, fatal: r.fatal, rows: r.rows };
    return goPage('ticket');
  }
  const e = EMGMAP[r.eid]; if (!e) return;
  if (EM.timer) { clearInterval(EM.timer); EM.timer = null; }
  EM.id = r.eid; EM.rec = { d: r.d, mode: r.mode === '考核模式' || r.mode === 'exam' ? 'exam' : 'teach', sec: r.sec, a: r.a }; EM.res = emgScore(e, r.a || {}); EM.mode = EM.rec.mode;
  goPage('emerg');
}

/* ---------------- 首页框架（boot 时一次性建立） ---------------- */
function homeBoot() {
  const hm = $('#pg_home');
  hm.innerHTML = `
  <canvas id="fxp"></canvas>
  <div class="hsil">${silhouetteSVG()}</div>
  <div class="hpeople">${peopleSVG()}</div>
  <img class="bgph" id="bgph1" alt=""><img class="bgph bgph2" id="bgph2" alt="">
  <div class="hshell">
    <header class="hhead">
      <div class="brand"><img src="__LOGO__" alt="中国南方电网 深圳供电局有限公司"><div class="pill">小瓦特·练　AI 智能陪练平台</div></div>
      <nav class="hnav" id="hnav">
        <span class="hnavi" data-h="home">工作台</span>
        <span class="hnavi" data-h="center">场景中心</span>
        <span class="hnavi" data-h="ticket">操作票填写</span>
        <span class="hnavi" data-h="emerg">应急处置</span>
        <span class="hnavi" data-h="assess">AI 测评</span>
        <span class="hnavi" data-h="analytics">数据分析</span>
        <span class="hnavi lk" data-lk="1" data-h="team">管理视角<i>管理</i></span>
        <span class="hnavi lk" data-lk="1" data-h="sys">系统与权限<i>管理</i></span>
      </nav>
      <div class="huser"><span id="hclock" class="hclk"></span>
        <span class="uchip"><i>${HOME_USER.name.slice(0, 1)}</i>${HOME_USER.name} · ${HOME_USER.team}</span></div>
    </header>
    <main id="hpage"></main>
  </div>
  <div id="htip" hidden></div>
  <div class="demo2" id="demo2"><div class="bd"><div class="t">讲师演示台</div>
    <button data-dm="main">演示主线：组长下发操作票考核 → 学员进入</button>
    <button data-dm="tk_ok">操作票：一键按标准票填完（正确）</button>
    <button data-dm="tk_swap">操作票：组内换序（应当不判错）</button>
    <button data-dm="tk_order">操作票：先拉2M侧刀闸（顺序错误）</button>
    <button data-dm="tk_danger">操作票：未验电即合地刀（整票不合格）</button>
    <button data-dm="tk_load">操作票：未转负荷即断开503（整票不合格）</button>
    <button data-dm="tk_text">操作票：并项与缺双重名称（文字不规范）</button>
    <button data-dm="em_ok">应急处置：触电 · 完整作答</button>
    <button data-dm="em_part">应急处置：触电 · 要点只答一半</button>
    <button data-dm="em_key">应急处置：触电 · 事例没指出问题（关键遗漏）</button>
    <button data-dm="status">功能实现状态清单</button>
    <button data-dm="bound">系统边界表</button>
    <button data-dm="clear">清空本机记录</button></div>
    <button class="tg" id="demo2tg">讲师演示台</button></div>`;
  /* 南网实景照片到位后：为 #bgph1/#bgph2 填入 src 即自动显示（插槽） */
  $('#hnav').onclick = e => {
    const n = e.target.closest('.hnavi'); if (!n) return;
    if (n.dataset.lk && ROLE.cur !== 'lead') return toast('该模块需要班组长及以上权限（当前账号：学员）。点击右上角账号可切换为班组长。');
    if (n.dataset.h === 'emerg') { EM.res = null; if (!EM.timer) EM.id = null; }
    goPage(n.dataset.h);
  };
  $('.uchip').onclick = toggleRole;
  $('#demo2tg').onclick = () => $('#demo2').classList.toggle('open');
  $('#demo2 .bd').onclick = e => { const b = e.target.closest('[data-dm]'); if (b) demoAct(b.dataset.dm); };
  renderRole();
  const clk = () => { const d = new Date(); $('#hclock').textContent = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  clk(); setInterval(clk, 20000);
  bindTip(); bindHPage();
  HomeFX.init();
}

/* ---------------- 页面渲染 ---------------- */
const PAGE_FN = {
  home: () => pageHome(), center: () => pageCenter(), ticket: () => pageTicket(), emerg: () => pageEmerg(), assess: () => pageAssess(), analytics: () => pageAnalytics(),
  review: () => pageReview(), growth: () => pageGrowth(), classroom: () => pageClassroom(), team: () => pageTeam(), sys: () => pageSys()
};
function renderHPage(h) {
  const pg = $('#hpage'); if (!pg) return;
  pg.dataset.cur = h;
  pg.innerHTML = PAGE_FN[h]();
  pg.scrollTop = 0; const hm = $('#pg_home'); if (hm && h !== 'home') hm.scrollTop = 0;
  if (h === 'ticket') ticketAfter(); else if (TK.timer) { clearInterval(TK.timer); TK.timer = null; }
  if (h === 'emerg') emerAfter(); else if (EM.timer) { clearInterval(EM.timer); EM.timer = null; }
  if (h === 'assess' || h === 'analytics') platAfter(h);
  if (typeof pageAfter === 'function') pageAfter(h);
  countUp(pg);
  if (h === 'home' && !__xwTyped) { __xwTyped = true; typeInto($('#xwtxt'), $('#xwtxt').dataset.full); }
}
function rerender(h) { const pg = $('#hpage'); if (!pg) return; pg.innerHTML = PAGE_FN[h](); if (typeof pageAfter === 'function') pageAfter(h); }

function greet() { const h = new Date().getHours(); return h < 6 ? '夜深了' : h < 9 ? '早上好' : h < 12 ? '上午好' : h < 18 ? '下午好' : '晚上好'; }
function todayStr() { const d = new Date(); return `${d.getMonth() + 1}月${d.getDate()}日 ${'周' + '日一二三四五六'[d.getDay()]}`; }

/* ---------------- 工作台推导：短板 → 推荐练什么 ---------------- */
function weakOrder() { const now = abilityNow(); return SKILL9.map((s, i) => ({ s, i, v: now[i] })).sort((a, b) => a.v - b.v); }
function recoFor(item) {
  if (item.s.g === 'tk') return { spec: 'tk:teach', n: '操作票填写 · 训练模式', sub: '#3主变运行转检修 · 3M负荷转#2主变代供', why: `「${item.s.n}」${item.v} 分，训练模式边写边判，逐行对标准票` };
  const L = allRecs().filter(r => r.src === 'em'); const best = {}; L.forEach(r => { best[r.eid] = Math.max(best[r.eid] || 0, r.score); });
  const pool = EMG.filter(e => item.s.k === 'e2' ? e.cs : item.s.k === 'e3' ? (e.rep || []).length : item.s.k === 'e4' ? e.pts.some(p => EMG_AID.test(p.t)) : true);
  const e = pool.slice().sort((a, b) => (best[a.id] == null ? -1 : best[a.id]) - (best[b.id] == null ? -1 : best[b.id]))[0] || EMG[0];
  return { spec: 'em:' + e.id + ':teach', n: '应急处置 · ' + e.card + (e.sc ? ' · ' + e.sc.replace(/^场景[一二三四]：/, '') : ''), sub: best[e.id] == null ? '尚未练过' : '最好成绩 ' + best[e.id] + ' 分', why: `「${item.s.n}」${item.v} 分，${item.s.k === 'e2' ? '练事例纠错，找出违反注意事项的做法' : item.s.k === 'e3' ? '练电话首报与续报' : item.s.k === 'e4' ? '练急救与自我防护要点' : '把处置要点答全'}` };
}
/* 岗位胜任度（测算参考） */
function fitCalc() {
  const A = homeAgg(), now = abilityNow();
  const lastExam = allRecs().find(r => r.src === 'tk' && /考核/.test(r.mode));
  const parts = [
    { n: '规程理论考试', v: '92 分', need: '≥ 80 分', ok: true },
    { n: '操作票考核模式', v: lastExam ? lastExam.score + ' 分' : '未考', need: '最近一次 ≥ 60 分且无危险操作', ok: !!(lastExam && lastExam.pass), gap: '完成一次操作票考核模式并及格' },
    { n: '应急处置卡覆盖', v: A.cards.size + ' / 17 类', need: '17 类全部练过', ok: A.cards.size >= 17, gap: '还有 ' + (17 - A.cards.size) + ' 类应急处置卡没有练过' },
    { n: '危险操作', v: A.danger + ' 次', need: '近30天 0 次', ok: A.danger === 0, gap: '近30天出现过整票不合格的危险操作' },
    { n: '年度培训学时', v: HOME_USER.hours.done + ' 学时', need: '≥ ' + HOME_USER.hours.need + ' 学时', ok: HOME_USER.hours.done >= HOME_USER.hours.need, gap: '知识课堂待修 ' + (HOME_USER.hours.need - HOME_USER.hours.done) + ' 学时' }
  ];
  const avg = Math.round(now.reduce((a, b) => a + b, 0) / now.length);
  return { pct: Math.round(avg * .6 + parts.filter(p => p.ok).length / parts.length * 100 * .4), post: HOME_USER.post, parts };
}
function growthNodes() {
  const A = homeAgg(), w = weakOrder()[0], todo = myTodo()[0];
  const tkN = allRecs().filter(r => r.src === 'tk').length;
  return [
    { id: 'g1', x: 85, y: 505, s: 'done', t: '岗前培训', v: '已完成' },
    { id: 'g2', x: 215, y: 435, s: 'done', t: '安规考试', v: '92 分' },
    { id: 'g3', x: 345, y: 365, s: tkN ? 'done' : 'next', t: '操作票填写', v: tkN + ' 次' },
    { id: 'g4', x: 465, y: 285, s: A.scenes.size ? 'done' : 'next', t: '应急处置情境', v: A.scenes.size + '/' + EMG.length },
    { id: 'g5', x: 585, y: 340, s: 'cur', t: '短板补强·' + w.s.n, v: w.v + ' 分' },
    { id: 'g6', x: 695, y: 250, s: 'next', t: todo ? '培训任务·' + (todo.targetN || '').slice(0, 10) : '操作票考核模式', v: todo ? todo.due + '截止' : '' },
    { id: 'g7', x: 800, y: 165, s: 'ahead', t: '班组长复核', v: '' },
    { id: 'g8', x: 818, y: 88, s: 'future', t: '胜任度认定', v: '人工审核' },
    { id: 'b1', x: 555, y: 88, s: 'feed', t: '年度学时', v: HOME_USER.hours.done + '/' + HOME_USER.hours.need },
    { id: 'b2', x: 425, y: 135, s: 'feed', t: '应急处置卡', v: A.cards.size + '/17 类' }
  ];
}
const GROWTH_EDGES = [
  { d: 'M85,505 C130,478 168,458 215,435', s: 'done' },
  { d: 'M215,435 C258,412 300,388 345,365', s: 'done' },
  { d: 'M345,365 C385,338 425,310 465,285', s: 'done' },
  { d: 'M465,285 C505,303 545,322 585,340', s: 'done', p: 1 },
  { d: 'M585,340 C620,310 658,278 695,250', s: 'act', p: 1 },
  { d: 'M695,250 C730,222 765,192 800,165', s: 'future' },
  { d: 'M800,165 C812,138 816,112 818,88', s: 'future' },
  { d: 'M555,88 C640,98 725,125 795,158', s: 'feed', p: 1 },
  { d: 'M425,135 C550,143 675,150 793,162', s: 'feed', p: 1 }
];

/* ---------------- 首页 ---------------- */
function pageHome() {
  const A = homeAgg(), ab = abilityCalc(), W = weakOrder();
  const w1 = W[0], w2 = W[1];
  const todo = myTodo(), task = todo[0];
  const lastTk = A.tk[0] || allRecs().find(r => r.src === 'tk');
  const cards = Array.from(new Set(EMG.map(e => e.card)));
  const best = {}; allRecs().filter(r => r.src === 'em').forEach(r => { const c = EMGMAP[r.eid].card; best[c] = Math.max(best[c] || 0, r.score); });
  const cardOk = cards.filter(c => (best[c] || 0) >= EMG_CFG.pass).length;
  const recent = allRecs().slice(0, 5);
  const R1 = recoFor(w1), R2 = recoFor(w2.s.g === w1.s.g && W[2] ? W[2] : w2);
  const xwFull = `「${w1.s.n}」${w1.v} 分、「${w2.s.n}」${w2.v} 分是当前两项短板；${task ? `班组长下发的「${task.targetN}」${task.due}截止，建议先完成` : `建议先练「${R1.n}」`}，成绩会直接落到能力雷达并反馈给班组长。`;
  const taskBtn = task ? `<button class="btn pri" data-start="${task.scene}:${task.scene === 'em' ? (task.target || '') + ':' : ''}${task.mode}">开始</button>` : `<button class="btn pri" data-start="tk:exam">去完成</button>`;
  return `
  <section class="hero">
    <div class="hgreet">
      <h1>${greet()}，${HOME_USER.name}</h1>
      <div class="hsub">${HOME_USER.team} · ${HOME_USER.post} · 场景陪练：操作票填写 · 应急处置 · 今天 ${todayStr()}</div>
      <div class="hkpis hg">
        <div class="kpi"><b>${A.cnt}</b><span>近30天演练 次数</span></div>
        <div class="kpi ${lastTk && lastTk.pass ? 'good' : 'warn'}"><b>${lastTk ? lastTk.score : 0}</b><span>操作票 最近得分</span></div>
        <div class="kpi ${A.scenes.size >= EMG.length ? 'good' : 'warn'}"><b>${A.scenes.size}/${EMG.length}</b><span>应急情境 已练</span></div>
        <div class="kpi ${A.passRate >= 80 ? 'good' : 'warn'}"><b>${A.passRate}%</b><span>近30天 及格率</span></div>
      </div>
      <div class="hteam"><span class="lb">班组伙伴</span>${teamRows().map(m => `<i class="tm ${m.n === HOME_USER.name ? 'me' : !m.cnt ? 'idle' : ''}" title="${m.n} · ${m.cnt ? '近30天 ' + m.cnt + ' 次' : '本月未练'}">${m.n.slice(0, 1)}</i>`).join('')}<span class="tmx">${teamRows().filter(m => m.cnt).length}/${TEAM.length} 人本月已练</span></div>
    </div>
    <div class="taskcard ho">
      <div class="tk1">${task ? '待练任务' : '今日待练任务'}</div>
      <div class="tk2">${h(task ? task.targetN : HOME_TASK.targetN)}</div>
      <div class="tk3">${task ? `${h(task.from)} 下发 · ${task.due}截止 · ${task.mode === 'exam' ? '考核模式' : '训练模式'}${task.note ? '<br>' + h(task.note) : ''}` : `${HOME_TASK.from} 下发 · ${dateAfter(HOME_TASK.dueDays)}截止 · ${HOME_TASK.note}`}</div>
      ${taskBtn}
    </div>
    <div class="hourcard ho">
      <div class="tk1">应急处置卡掌握</div>
      <div class="certprog emprog">${cards.map(c => { const e = EMG.find(x => x.card === c); const v = best[c]; return `<i class="${v != null && v >= EMG_CFG.pass ? 'ok' : v != null ? 'star' : ''}" data-start="em:${e.id}:teach" data-tip="${c} · ${v == null ? '未练' : '最好 ' + v + ' 分'}">${EMG_SHORT[c] || c.slice(0, 2)}</i>`; }).join('')}</div>
      <div class="tk3"><b class="mono">${cardOk}</b> / ${cards.length} 类合格 · 已练 ${A.cards.size} 类 · 点方块直接练</div>
      <button class="btn" data-go="emerg">去应急处置</button>
    </div>
  </section>

  <section class="cockpit">
    <div class="hcard ck tl hg"><div class="hch"><b>能力雷达</b><span>技能水平九项 · 本期 vs 上期</span></div><div class="hcb">${chRadar(SK_N, ab.now, ab.prev, { w: 330, h: 236, l1: '本期', l2: '上期' })}<div class="tk3" style="text-align:center">操作票五项取判卷结果，应急四项取处置点评；本期为最近 3 次 · <span class="lk" onclick="goPage('assess')">看指标体系</span></div></div></div>
    <div class="hcard ckc hg"><div class="hch"><b>学员成长地图</b><em class="ai">AI</em><span>${HOME_USER.name} · ${HOME_USER.post} · 演练 → 能力 → 复核</span></div>
      <div class="hcb">${chGrowthMap(growthNodes(), GROWTH_EDGES)}</div></div>
    <div class="hcard ck tr ho"><div class="hch"><b>场景分布</b><span>近30天 · 按次数</span></div><div class="hcb">${chDonut(A.kindCnt)}</div></div>
    <div class="hcard ck bl ho"><div class="hch"><b>最近演练成绩</b><span>最近 ${recent.length} 次</span></div><div class="hcb">${recent.map(r => `<div class="hrow" style="display:flex;gap:8px;align-items:center"><span class="mono tk3">${stampOf(r.ts)}</span><b style="flex:1">${h(r.src === 'tk' ? '操作票填写' : (EMGMAP[r.eid] || {}).card || '应急处置')}</b><b class="mono ${r.pass ? 'gv' : 'wv'}">${r.score}</b><button class="btn sm" data-rec="${r.id}">复盘</button></div>`).join('')}</div></div>
    <div class="hcard ck br hg"><div class="hch"><b>九项对标</b><span>我 vs 班组均值</span></div><div class="hcb">${chHeat(SK_N, ab.now, TEAM_AVG9)}</div></div>
    <div class="hcard ck w hg"><div class="hch"><b>演练用时与次数</b><span>近30天 · 按日</span></div><div class="hcb">${chCombo(A.byDay, { w: 720, h: 190 })}</div></div>
    <div class="hcard ck g ho"><div class="hch"><b>岗位胜任度</b><span>${h(HOME_USER.post)}</span></div><div class="hcb">${chGauge(fitCalc())}</div></div>
  </section>

  <section class="reco">
    ${[R1, R2].map(R => `<div class="rcard hg">
      <div class="rwhy"><i class="ai">AI 推荐</i>${h(R.why)}</div>
      <b>${h(R.n)}</b><div class="tk3">${h(R.sub)}</div>
      <button class="btn pri" data-start="${R.spec}">去练</button></div>`).join('')}
    <div class="rcard lastr ho">
      <div class="rwhy"><i>最近复盘</i>${recent[0] ? stampOf(recent[0].ts) : ''}</div>
      <b>${recent[0] ? h(recent[0].n) + ' · ' + recent[0].score + ' 分' : '尚无记录'}</b>
      <div class="tk3">${recent[0] ? h(recent[0].sub) : ''}</div>
      <div class="tk3">${recent[0] ? h((recent[0].sum || []).join('、') || '没有失分项') : ''}</div>
      ${recent[0] ? `<button class="btn" data-rec="${recent[0].id}">查看复盘</button>` : '<button class="btn" data-go="center">去场景中心</button>'}
    </div>
  </section>

  <section class="xwbar hg">
    <div class="xwavt"><i></i>小瓦特</div>
    <div class="xwtxt" id="xwtxt" data-full="${xwFull}">${__xwTyped ? xwFull : ''}</div>
    <div class="xwbtns">
      ${task ? taskBtn.replace('>开始<', '>去完成任务<') : `<button class="btn pri" data-start="${R1.spec}">去练</button>`}
      <button class="btn" data-go="review">评分复盘</button><button class="btn" data-go="growth">成长档案</button><button class="btn" data-go="classroom">知识课堂</button>
    </div>
    <div class="xwsrc">由能力雷达与演练记录生成</div>
  </section>`;
}

/* ---------------- 下钻弹层 ---------------- */
function openDrill(title, sub, html, foot) {
  const m = el('div', 'mask lite');
  m.innerHTML = `<div class="dlg" style="width:min(760px,95vw)">
    <div class="dh"><b>${title}</b><span style="font-size:11px;color:#93a9c4">${sub || ''}</span><span class="cls">×</span></div>
    <div class="db" style="max-height:64vh;overflow:auto">${html}</div>
    ${foot ? `<div class="df">${foot}</div>` : ''}</div>`;
  document.body.appendChild(m);
  m.querySelector('.cls').onclick = () => m.remove();
  m.onclick = e => {
    if (e.target === m) return m.remove();
    const q = s => e.target.closest(s); let n;
    if (n = q('[data-start]')) { m.remove(); return startScene(n.dataset.start); }
    if (n = q('[data-rec]')) { m.remove(); return openRec(n.dataset.rec); }
    if (n = q('[data-go]')) { m.remove(); return goPage(n.dataset.go); }
    if (typeof pagesClick === 'function' && pagesClick(e)) return;
  };
  return m;
}
function recTable(list) {
  return `<table class="htbl"><tr><th>时间</th><th>场景</th><th>情境</th><th>模式</th><th>用时</th><th>得分</th><th>失分点</th><th></th></tr>
    ${list.map(r => `<tr><td class="mono">${stampOf(r.ts)}</td><td>${h(r.n)}</td><td class="tk3">${h(r.sub)}</td><td>${h(r.mode === 'exam' ? '考核模式' : r.mode === 'teach' ? '训练模式' : r.mode)}</td><td class="mono">${Math.round((r.sec || 0) / 60)} 分钟</td>
      <td class="mono ${r.pass ? 'gv' : 'wv'}">${r.score}</td><td class="tk3">${h((r.sum || []).join('、') || '—')}</td><td><button class="btn sm" data-rec="${r.id}">复盘</button></td></tr>`).join('')}</table>`;
}
function drillDim(i) {
  const s = SKILL9[i], ab = abilityCalc();
  const L = allRecs().filter(r => r.src === s.g && r.dims && r.dims[s.k] != null);
  const low = L.filter(r => r.dims[s.k] < 80);
  const R = recoFor({ s, i, v: ab.now[i] });
  openDrill(`能力明细 · ${s.n}`, `${SCENE_N[s.g]} · 本期 ${ab.now[i]} 分 · 上期 ${ab.prev[i]} 分 · 班组均值 ${TEAM_AVG9[i]} 分`, `
    <div class="hrow">${h(s.d)}</div>
    <div class="sec"><div class="st">这一项低于 80 分的演练（${low.length} 次）</div><div class="sc">${low.length ? recTable(low) : '近期各次均不低于 80 分。'}</div></div>
    <div class="sec"><div class="st">取数口径</div><div class="sc tk3">${s.g === 'tk' ? '取自每次操作票判卷结果：操作顺序按顺序错误与阶段越界扣减，漏项控制按漏项扣减，文字规范按文字与层级错误扣减，危险辨识出现危险操作即降到 30 分以下，二次与压板按屏柜、压板、空开、把手类步骤的写全率。' : '取自每次应急处置点评：处置要点完整＝要点得分率；关键注意事项＝事例纠错得分率；信息报送＝报送要求答到率；现场急救与自我防护＝急救、防护类要点得分率。'}本期为最近 3 次均值，上期为再往前 3 次。</div></div>`,
    `<button class="btn pri" data-start="${R.spec}">练「${h(R.n)}」</button><button class="btn" data-go="review">打开评分复盘</button>`);
}
function drillDay(d) {
  const list = allRecs().filter(r => dayOf(r) === d);
  openDrill(`演练明细 · ${dayLabel(d)}`, `${list.length} 次`, recTable(list), `<button class="btn" data-go="review">打开评分复盘</button>`);
}
function drillPlan(k) {
  const list = allRecs().filter(r => dayOf(r) <= 30 && (r.src === 'tk' ? k === '操作票填写' : k === '应急 · ' + ((EMG_CAT.find(c => c.k === (EMGMAP[r.eid] || {}).cat) || {}).n)));
  openDrill(`演练明细 · ${k}`, `近30天 ${list.length} 次`, recTable(list), `<button class="btn" data-go="review">打开评分复盘</button>`);
}
function drillFit() {
  const F = fitCalc();
  openDrill(`岗位胜任度构成 · ${F.post}`, `综合测算 ${F.pct}%`, `
    <table class="htbl"><tr><th>构成项</th><th>当前</th><th>要求</th><th>状态</th></tr>
      ${F.parts.map(p => `<tr><td>${p.n}</td><td class="mono">${p.v}</td><td class="mono">${p.need}</td><td>${p.ok ? '<span class="tag ok">达标</span>' : '<span class="tag wn">待补齐</span>'}</td></tr>`).join('')}</table>
    <div class="sec" style="margin-top:12px"><div class="st">差距项</div><div class="sc">${F.parts.filter(p => !p.ok).map(p => `<div class="hrow">· ${p.gap}</div>`).join('') || '无'}</div></div>
    <div class="tk3" style="margin-top:10px">胜任度＝九项能力均值 × 60% + 构成项达标率 × 40%，为系统测算参考，任职资格评定以人工审核结果为准。</div>`,
    `<button class="btn" data-go="growth">查看成长档案</button><button class="btn pri" data-start="tk:exam">去考操作票（考核模式）</button>`);
}
function nodeClick(id) {
  const W = weakOrder();
  if (id === 'g3') return drillPlan('操作票填写');
  if (id === 'g4' || id === 'b2') return goPage('emerg');
  if (id === 'g5') return drillDim(W[0].i);
  if (id === 'g6') { const t = myTodo()[0]; return startScene(t ? `${t.scene}:${t.scene === 'em' ? (t.target || '') + ':' : ''}${t.mode}` : 'tk:exam'); }
  if (id === 'g7') return openDrill('班组长复核', '演练成绩由班组长复核后作为能力评价依据', `<div class="hrow">近30天演练 ${homeAgg().cnt} 次，班组长 ${LEAD_USER.name} 在「管理视角」查看全组成绩、短板与危险操作记录，并下发针对性的培训任务。</div><div class="tk3">能力结论由班组长确认后使用。</div>`);
  if (id === 'g8') return drillFit();
  if (id === 'b1') return goPage('classroom');
  if (id === 'g1') return openDrill('岗前培训', '入职培训记录', `
    <table class="htbl"><tr><th>项目</th><th>结果</th><th>日期</th></tr>
    <tr><td>入职集中培训</td><td><span class="tag ok">结业</span></td><td class="mono">2024-08-30</td></tr>
    <tr><td>导师带教期</td><td><span class="tag ok">通过</span></td><td class="mono">2025-02-28</td></tr></table>`,
    `<button class="btn" data-go="growth">查看成长档案</button>`);
  if (id === 'g2') return openDrill('安规考试 · 变电部分', '年度考试与复训', `
    <table class="htbl"><tr><th>项目</th><th>成绩/状态</th><th>日期</th></tr>
    <tr><td>年度安规笔试</td><td class="mono gv">92 分</td><td class="mono">${dayLabel(80)}</td></tr>
    <tr><td>安规修编后复训</td><td><span class="tag wn">待安排</span></td><td class="mono">—</td></tr></table>`,
    `<button class="btn" data-go="classroom">查看知识课堂</button>`);
}

/* ---------------- 事件委托（首页与各薄页共用） ---------------- */
function bindHPage() {
  $('#hpage').oninput = e => { if (typeof pagesInput === 'function') pagesInput(e); };
  $('#hpage').onclick = e => {
    if (typeof leaderClick === 'function' && leaderClick(e)) return;
    if (typeof pagesClick === 'function' && pagesClick(e)) return;
    const q = s => e.target.closest(s); let n;
    if (n = q('[data-start]')) return startScene(n.dataset.start);
    if (n = q('[data-rec]')) return openRec(n.dataset.rec);
    if (n = q('[data-go]')) return goPage(n.dataset.go);
    if (n = q('[data-dim]')) return drillDim(+n.dataset.dim);
    if (n = q('[data-hdim]')) return drillDim(+n.dataset.hdim);
    if (n = q('[data-day]')) return drillDay(+n.dataset.day);
    if (n = q('[data-plan]')) return drillPlan(n.dataset.plan);
    if (n = q('[data-gauge]')) return drillFit();
    if (n = q('[data-node]')) return nodeClick(n.dataset.node);
  };
}

/* ---------------- 悬浮提示 ---------------- */
function bindTip() {
  const tip = $('#htip'), hm = $('#pg_home');
  hm.addEventListener('mousemove', e => {
    const n = e.target.closest('[data-tip]');
    if (!n) { tip.hidden = true; return; }
    tip.textContent = n.dataset.tip; tip.hidden = false;
    const x = Math.min(e.clientX + 14, innerWidth - tip.offsetWidth - 10);
    tip.style.left = x + 'px'; tip.style.top = (e.clientY + 16) + 'px';
  });
  hm.addEventListener('mouseleave', () => { tip.hidden = true; });
}

/* ---------------- KPI 数字滚动（页面首次渲染时） ---------------- */
function countUp(root) {
  (root || document).querySelectorAll('.kpi b, .rvbig').forEach(b => {
    if (b.__cu) return; b.__cu = true;
    const raw = b.textContent.trim(), m = /^(\d+(?:\.\d+)?)(.*)$/.exec(raw); if (!m) return;
    const end = parseFloat(m[1]), dec = (m[1].split('.')[1] || '').length, suf = m[2], t0 = performance.now(), dur = 700 + Math.min(500, end);
    const tick = now => { const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3); b.textContent = (end * e).toFixed(dec) + suf; if (k < 1) requestAnimationFrame(tick); else b.textContent = raw; };
    requestAnimationFrame(tick);
  });
}
/* 背景人力资源元素：缓缓上升的人形（班组成员），随机位置与时长 */
function peopleSVG() {
  const P = '<path d="M17 4a5 5 0 1 1 0 10a5 5 0 0 1 0-10z M6 30c0-6.6 4.9-11 11-11s11 4.4 11 11z"/>';
  const cols = ['var(--gr)', 'var(--or)', 'var(--gold)', 'var(--gr)', 'var(--or)', 'var(--gr)', 'var(--gold)', 'var(--or)', 'var(--gr)', 'var(--or)'];
  return cols.map((c, i) => `<svg viewBox="0 0 34 34" fill="${c}" style="left:${(i * 9.7 + 3) % 96}%;animation-duration:${26 + (i * 7) % 19}s;animation-delay:-${(i * 5.3) % 24}s">${P}</svg>`).join('');
}

/* ---------------- 打字机 ---------------- */
function typeInto(node, text) {
  if (!node) return; let i = 0; node.textContent = '';
  const t = setInterval(() => { i += 1; node.textContent = text.slice(0, i); if (i >= text.length) clearInterval(t); }, 26);
}

/* ---------------- 背景动效：粒子 + 变电站剪影 ---------------- */
const HomeFX = (() => {
  let cv, ctx, raf = 0, active = false, N = [];
  function init() {
    cv = $('#fxp'); if (!cv) return;
    ctx = cv.getContext('2d');
    const rs = () => { cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio; };
    rs(); addEventListener('resize', rs);
    N = Array.from({ length: 56 }, () => ({
      x: Math.random(), y: Math.random(),
      vx: (Math.random() - .5) * 22e-5, vy: (Math.random() - .5) * 22e-5,
      r: 1 + Math.random() * 1.8
    }));
  }
  function tick() {
    if (!active || !ctx) return;
    const W = cv.width, H = cv.height, dp = devicePixelRatio;
    ctx.clearRect(0, 0, W, H);
    N.forEach(p => {
      p.x = (p.x + p.vx + 1) % 1; p.y = (p.y + p.vy + 1) % 1;
      ctx.beginPath(); ctx.arc(p.x * W, p.y * H, p.r * dp, 0, 7);
      ctx.fillStyle = 'color-mix(in srgb,var(--ac) 38%,transparent)'; ctx.fill();
    });
    for (let i = 0; i < N.length; i++) for (let j = i + 1; j < N.length; j++) {
      const dx = (N[i].x - N[j].x) * W, dy = (N[i].y - N[j].y) * H, d2 = dx * dx + dy * dy, lim = (130 * dp) ** 2;
      if (d2 < lim) {
        ctx.beginPath(); ctx.moveTo(N[i].x * W, N[i].y * H); ctx.lineTo(N[j].x * W, N[j].y * H);
        ctx.strokeStyle = `rgba(178,142,32,${(.26 * (1 - d2 / lim)).toFixed(3)})`; ctx.lineWidth = dp * .7; ctx.stroke();
      }
    }
    raf = requestAnimationFrame(tick);
  }
  return {
    init,
    on() { if (active) return; active = true; raf = requestAnimationFrame(tick); },
    off() { active = false; cancelAnimationFrame(raf); }
  };
})();

/* 程序化变电站剪影（实景照片素材到位前的占位层，含能量流动效） */
function silhouetteSVG() {
  const tower = x => `<g transform="translate(${x} 0)">
    <path d="M0 120 L14 0 L28 120 M4 92 L24 92 M2 104 L26 104 M7 60 L21 60 M-12 34 L40 34 M-12 34 L4 60 M40 34 L24 60 M9 30 L19 30" stroke="currentColor" fill="none" stroke-width="1.6"/>
    <circle class="twl" cx="14" cy="6" r="2.2"/></g>`;
  return `<svg viewBox="0 0 1200 130" preserveAspectRatio="xMidYMax slice">
    <g opacity=".5">${tower(90)}${tower(430)}${tower(820)}${tower(1110)}</g>
    <g opacity=".62">
      <path d="M118 34 C 240 78, 330 78, 458 34" class="wire" fill="none"/>
      <path d="M458 34 C 580 78, 690 78, 848 34" class="wire" fill="none"/>
      <path d="M848 34 C 950 74, 1030 74, 1138 34" class="wire" fill="none"/>
      <path d="M118 34 C 240 78, 330 78, 458 34" class="eflow" fill="none"/>
      <path d="M458 34 C 580 78, 690 78, 848 34" class="eflow eflow2" fill="none"/>
      <path d="M848 34 C 950 74, 1030 74, 1138 34" class="eflow" fill="none"/>
    </g>
    <g opacity=".38" stroke="currentColor" fill="none" stroke-width="1.4">
      <rect x="560" y="86" width="86" height="34"/><path d="M568 86 V70 h14 M632 86 V70 h-14 M582 70 h36"/>
      <rect x="250" y="96" width="46" height="24"/><path d="M258 96 v-10 M288 96 v-10"/>
      <rect x="940" y="92" width="60" height="28"/><path d="M950 92 v-12 h40 v12"/>
    </g>
    <line x1="0" y1="120.8" x2="1200" y2="120.8" stroke="currentColor" stroke-width="1.2" opacity=".55"/>
  </svg>`;
}



/* ---------------- 讲师演示台 ---------------- */
const IMPL_STATUS = [
  ['操作票试卷与标准票', '照录《110kV考核站操作票考核试卷》运行方式、答题要求与 7 个屏柜附表；步骤内容以典型操作票为准'],
  ['标准票编号口径', '典型票中屏柜、压板、空开、把手编号与试卷附表不一致的 10 处按附表改正（30P→11P 备自投屏、11LP2 / 11LP3→1FLP5 / 1FLP6、1QK→ZK、断路器控制方式把手→HK1、地刀电机电源→5ZK、27P→10P、1-4K / 3-4K→4K1 / 4K2）；按典型票原文填写会判编号不符，客户典型票 xlsx 原件导入判卷 90 分 · 待业务确认'],
  ['标准票缺号', '典型票 43 之后接 50，缺 44～49、51、52、55，按原样不补、不重排 · 待业务确认是否漏页'],
  ['刀闸电源 2QL 空开', '典型票 50.1「断开QS、QE刀闸电源2QL空气开关」在试卷附表中没有对应编号，暂按关键字「刀闸」「电源」判定 · 待业务确认'],
  ['标准票未列的压板 / 空开操作', '学员写了附表中的压板或空开操作（如 #3主变保护跳532压板）而标准票没有的，不扣分，标「需人工复核」交考评员核对'],
  ['判卷标注：阶段、换序组、特殊顺序、漏写处理、文字要求、执行原因', '本平台按《电气操作导则》与安规拟定 · 待业务专家确认；扣分值为配置项'],
  ['危险操作 6 条：未验电接地、带负荷拉刀闸 / 摇小车、各侧未形成明显断开点即接地、未转负荷即断开503、先断变高后断变低、断开1103前未合中性点地刀', '本平台拟定 · 待业务专家确认；前三条可检索到安规 / 导则条款，后三条暂无条款原文，显示「建议人工复核」'],
  ['主接线图', '试卷接线图为 CAD 嵌入对象无法读取，按试卷运行方式文字重绘；部件画法沿用手绘简图口径 · 待客户提供接线图截图或 PDF 核对'],
  ['操作票 Word / Excel 上传', '纯浏览器离线解析（zip + DecompressionStream）；Excel 认「操作顺序 / 操作步骤」两列，Word 认操作票表格或逐行；格式不符的行指明行号并跳过'],
  ['操作票自动判卷', '确定性规则 · 真实运行：步骤匹配、状态阶段、可换序组、特殊顺序、漏项、三档文字要求、并项识别、危险操作，同一根本错误只计一次'],
  ['操作票制度依据', '真实条款检索（安规及释义、电气操作导则）；检索不到返回「建议人工复核」，不编造'],
  ['应急处置：处置要点与注意事项', '照录场景归类表与 15 张应急处置卡；表中注意事项为空的取处置卡原文（高温中暑、办公场所火灾），处置卡也没有的（中毒窒息、食物中毒、恐怖袭击、高处坠落、物体打击）只考处置要点；办公场所火灾一行的注意事项单元格误贴了整张处置卡，已取卡片注意事项'],
  ['应急处置：事例', '16 个情境的处置经过事例由本平台编写，每个含 1～4 处违反注意事项的做法 · 待业务确认'],
  ['应急处置：计分口径', '处置要点 60 + 事例纠错 40（无注意事项的情境处置要点计 100），信息报送每项加 2 分、总分封顶 100 · 本平台拟定待确认；野外四个情境名称（蜂群 / 犬只 / 毒蛇 / 蚂蚁）按处置卡标题补写'],
  ['应急处置：要点判定与 AI 点评', '关键词组匹配 · 真实运行（非在线大模型）；点评为规则模板生成，遗漏要点补充处置卡原文'],
  ['信息报送加分项', '照录《变电管理一所应急信息报送工作指引》：电话首报快报现象、7 类重大事件直报分管副总、缓报原因、10 分钟 elink 续报、慎用敏感字眼'],
  ['近30天记录中的非本机记录、班组其他成员成绩', '脱敏模拟 · 人物全部虚拟；模拟记录由判卷引擎与应急计分对合成答卷实时计分'],
  ['语音识别', '联网且经 http 打开时浏览器识别（真实）；本地文件打开或内网时为兜底识别（按当前应答内容打入，可改后再发）'],
  ['演练记录保存', '浏览器本地存储：同一浏览器刷新保留；换浏览器或账号不保留 · 入库待对接'],
  ['学习平台、人资域（课程、题库、考试、人员主数据）', '文件导入 + 接口模拟 · 真实联调待对接']
];
function demoAct(k) {
  $('#demo2').classList.remove('open');
  if (k.indexOf('tk_') === 0) {
    const kind = k.slice(3);
    TK.res = null; tkStart('exam', false);
    setTimeout(() => { TK.rows = tkAuto(kind).map(r => ({ t: r.t, child: !!r.parent })); tkPaint(); toast('已按' + ({ ok: '标准票', swap: '组内换序', order: '顺序错误', danger: '危险操作', load: '危险操作', text: '文字不规范' }[kind]) + '填入，填票号后点「提交判卷」看结果', 'ok'); }, 260);
    return;
  }
  if (k.indexOf('em_') === 0) {
    const kind = k.slice(3), e = EMGMAP.shock;
    emStart('shock', 'exam');
    setTimeout(() => { EM.a = emgModel(e, kind); EM.step = emSteps(e).length - 1; emPaint(); toast('三步已按' + ({ ok: '完整作答', part: '只答一半', key: '漏指事例问题' }[kind]) + '填入，点「提交点评」看结果', 'ok'); }, 260);
    return;
  }
  if (k === 'main') {
    const t = { id: 't' + Date.now(), from: '班组长 ' + LEAD_USER.name, scene: 'tk', target: '', targetN: '#3主变运行转检修操作票', mode: 'exam', due: dateAfter(3), who: [HOME_USER.name], note: '考核模式，及格 60 分，危险操作整票不合格', results: [] };
    const list = lsGet(LS_TASKS, []); list.unshift(t); lsSet(LS_TASKS, list.slice(0, 12));
    ROLE.cur = 'student'; renderRole();
    TK.res = null; tkStart('exam', false); toast('已按演示主线下发操作票考核任务并进入考核', 'ok'); return;
  }
  if (k === 'status') return openDrill('功能实现状态清单', '真实 / 规则 / 预置 / 模拟 / 待确认', `<table class="htbl statlist"><tr><th>功能</th><th>实现状态</th></tr>${IMPL_STATUS.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</table>`);
  if (k === 'bound') return openDrill('系统边界表', '现有平台负责课程、题库、考试、人员主数据；本产品负责情境练习、过程纠错、复训与回写', boundaryHtml());
  if (k === 'clear') { Object.keys(localStorage).filter(x => x.startsWith('xwt_')).forEach(x => localStorage.removeItem(x)); TK.res = null; EM.res = null; EM.id = null; toast('本机记录已清空'); route(); return; }
}
