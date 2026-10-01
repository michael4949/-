/* ===== 系统首页（工作台）· 路由 · 下钻 · 讲师演示台 · 背景动效 ===== */

let __xwTyped = false;
function goPage(h) { if ((location.hash || '').replace(/^#\/?/, '') === h) route(); else location.hash = '#' + h; }
const PAGES = ['home', 'center', 'ticket', 'emerg', 'scene', 'assess', 'analytics', 'review', 'growth', 'classroom', 'team', 'sys'];

/* ---------------- 路由 ---------------- */
function route() {
  let h = (location.hash || '').replace(/^#\/?/, '') || 'home';
  if (!PAGES.includes(h)) h = 'home';
  if ((h === 'team' || h === 'sys') && ROLE.cur !== 'lead') h = 'home';
  renderHPage(h); HomeFX.on();
  $$('#hnav .hnavi').forEach(a => a.classList.toggle('on', a.dataset.h === h));
  vzNavInd();
}
/* 顶栏当前页签的滑动胶囊：从上一位置滑到新位置（首次直接落位） */
function vzNavInd() {
  const nav = $('#hnav'); if (!nav) return;
  let ind = nav.querySelector('.vzind'); if (!ind) { ind = el('div', 'vzind'); nav.insertBefore(ind, nav.firstChild); }
  const on = nav.querySelector('.hnavi.on');
  if (!on) { ind.style.width = '0px'; return; }
  const first = !ind.dataset.on;
  if (first) ind.style.transition = 'none';
  ind.style.left = on.offsetLeft + 'px'; ind.style.width = on.offsetWidth + 'px'; ind.dataset.on = '1';
  if (first) requestAnimationFrame(() => { ind.style.transition = ''; });
}
addEventListener('resize', () => vzNavInd());

/* 打开场景：tk / tk:exam（操作票）· em / em:<情境>:<模式>（应急处置）· rule / life / case / inst[:<子项>[:<模式>]]（其余四个场景）· wt（工作票） */
function startScene(spec) {
  const [s, a, b] = String(spec || '').split(':');
  if (s === 'tk') { TK.res = null; return tkStart(a === 'exam' ? 'exam' : 'teach', false); }
  if (s === 'em') { if (a && EMGMAP[a]) return emStart(a, b === 'exam' ? 'exam' : 'teach'); EM.id = null; EM.res = null; return goPage('emerg'); }
  if (typeof scStart === 'function' && (SCENE_MAP[s] || s === 'wt')) return scStart(s, a, b);
  goPage('center');
}
/* 打开某次演练的报告（本机记录与模拟记录同一入口） */
function openRec(id) {
  const r = recById(id); if (!r) return;
  if (r.src === 'tk' && !r.wt) {
    TK.res = tkJudge(r.rows || []); TK.on = false; TK.tab = 'err';
    TK.rec = { d: r.d, no: r.mock ? '—' : (r.sub || '').replace('票号 ', ''), mode: r.mode, sec: r.sec, score: r.score, pass: r.pass, fatal: r.fatal, rows: r.rows };
    return goPage('ticket');
  }
  if (r.src === 'em') {
    const e = EMGMAP[r.eid]; if (!e) return;
    if (EM.timer) { clearInterval(EM.timer); EM.timer = null; }
    EM.id = r.eid; EM.rec = { d: r.d, mode: r.mode === '考核模式' || r.mode === 'exam' ? 'exam' : 'teach', sec: r.sec, a: r.a, sit: r.sit }; EM.res = emgScore(e, r.a || {}, r.sec); EM.mode = EM.rec.mode;
    return goPage('emerg');
  }
  if (typeof scOpenRec === 'function') return scOpenRec(r);
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
      <div class="brand"><img src="__LOGO__" alt="中国南方电网 深圳供电局有限公司"><div class="pill">${APP_NAME}</div></div>
      <nav class="hnav" id="hnav">
        <span class="hnavi" data-h="home">工作台</span>
        <span class="hnavi" data-h="center">场景中心</span>
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
    <button data-dm="case_push">案例推送：导入通报 → 生成 → 推送</button>
    <button data-dm="status">功能实现状态清单</button>
    <button data-dm="bound">系统边界表</button>
    <button data-dm="clear">清空本机记录</button></div>
    <button class="tg" id="demo2tg">讲师演示台</button></div>`;
  /* 南网实景照片到位后：为 #bgph1/#bgph2 填入 src 即自动显示（插槽） */
  $('#hnav').onclick = e => {
    const n = e.target.closest('.hnavi'); if (!n) return;
    if (n.dataset.lk && ROLE.cur !== 'lead') return toast('该模块需要班组长及以上权限（当前账号：学员）。点击右上角账号可切换为班组长。');
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
  home: () => pageHome(), center: () => pageCenter(), ticket: () => pageTicket(), emerg: () => pageEmerg(), scene: () => (typeof pageScene === 'function' ? pageScene() : pageCenter()), assess: () => pageAssess(), analytics: () => pageAnalytics(),
  review: () => pageReview(), growth: () => pageGrowth(), classroom: () => pageClassroom(), team: () => pageTeam(), sys: () => pageSys()
};
function renderHPage(h) {
  const pg = $('#hpage'); if (!pg) return;
  const vzNew = pg.dataset.cur !== h; pg.dataset.cur = h;
  pg.innerHTML = PAGE_FN[h]();
  if (vzNew) { pg.classList.add('vzenter'); clearTimeout(renderHPage.__vz); renderHPage.__vz = setTimeout(() => pg.classList.remove('vzenter'), 900); }
  pg.scrollTop = 0; const hm = $('#pg_home'); if (hm && h !== 'home') hm.scrollTop = 0;
  if (h === 'ticket') ticketAfter(); else if (TK.timer) { clearInterval(TK.timer); TK.timer = null; }
  if (h === 'emerg') emerAfter(); else if (EM.timer) { clearInterval(EM.timer); EM.timer = null; }
  if (h === 'scene' && typeof sceneAfter === 'function') sceneAfter(); else if (typeof SC !== 'undefined' && SC.timer) { clearInterval(SC.timer); SC.timer = null; }
  if (h === 'assess' || h === 'analytics') platAfter(h);
  if (typeof pageAfter === 'function') pageAfter(h);
  countUp(pg);
  if (h === 'home' && !__xwTyped) { __xwTyped = true; typeInto($('#xwtxt'), $('#xwtxt').dataset.full); }
}
function rerender(h) { const pg = $('#hpage'); if (!pg) return; pg.innerHTML = PAGE_FN[h](); if (typeof pageAfter === 'function') pageAfter(h); }

function greet() { const h = new Date().getHours(); return h < 6 ? '夜深了' : h < 9 ? '早上好' : h < 12 ? '上午好' : h < 18 ? '下午好' : '晚上好'; }
function todayStr() { const d = new Date(); return `${d.getMonth() + 1}月${d.getDate()}日 ${'周' + '日一二三四五六'[d.getDay()]}`; }

/* ---------------- 工作台推导：短板 → 推荐练什么 ---------------- */
function recoFor(item) {
  const g = item.g, v = item.none ? '尚未练过' : item.v + ' 分';
  if (g === 'tk') return { spec: 'tk:teach', n: '两票填写陪练 · 操作票 · 训练模式', sub: '#3主变运行转检修 · 3M负荷转#2主变代供', why: `「${item.n}」${v}，训练模式边写边判，逐行对标准票` };
  if (g === 'em') {
    const L = allRecs().filter(r => r.src === 'em'); const best = {}; L.forEach(r => { best[r.eid] = Math.max(best[r.eid] || 0, r.score); });
    const pool = EMG.filter(e => item.k === 'e3' ? e.cs : item.k === 'e4' ? (e.rep || []).length : item.k === 'e1' ? e.pts.length <= 5 : true);
    const e = pool.slice().sort((a, b) => (best[a.id] == null ? -1 : best[a.id]) - (best[b.id] == null ? -1 : best[b.id]))[0] || EMG[0];
    return { spec: 'em:' + e.id + ':teach', n: '应急处置陪练 · ' + e.card + (e.sc ? ' · ' + e.sc.replace(/^场景[一二三四]：/, '') : ''), sub: best[e.id] == null ? '尚未练过' : '最好成绩 ' + best[e.id] + ' 分', why: `「${item.n}」${v}，${item.k === 'e3' ? '练事例纠错，找出事例里的问题' : item.k === 'e4' ? '练电话首报与续报' : item.k === 'e1' ? '限时作答，先把要点说出来再补充' : '把处置要点答全，意思对就得分'}` };
  }
  const S = SCENE_MAP[g] || SCENE_MAP.rule;
  return { spec: g + '::teach', n: S.n + ' · 训练模式', sub: S.sub, why: `「${item.n}」${v}，${item.none ? '这个场景还没练过，先练一次拿到基准分' : '针对这一项的题目优先出'}` };
}
/* 安全能力成熟度构成（下钻用） */
function matParts() {
  const M = maturity(), A = homeAgg();
  const lastExam = allRecs().find(r => r.src === 'tk' && !r.wt && /考核/.test(r.mode));
  const parts = M.dims.map(d => ({ n: d.n, v: d.score == null ? '待练' : d.score + ' 分', need: '≥ 75（熟练）', ok: d.score != null && d.score >= 75, gap: d.score == null ? d.missing.join('、') + ' 还没练过' : d.score < 75 ? '再练 ' + d.scenes.filter(x => x.score != null && x.score < 75).map(x => x.n).join('、') : '' }));
  parts.push({ n: '操作票考核模式', v: lastExam ? lastExam.score + ' 分' : '未考', need: '最近一次 ≥ 60 分且无危险操作', ok: !!(lastExam && lastExam.pass), gap: '完成一次操作票考核模式并及格' });
  parts.push({ n: '应急处置卡覆盖', v: A.cards.size + ' / 17 类', need: '17 类全部练过', ok: A.cards.size >= 17, gap: '还有 ' + (17 - A.cards.size) + ' 类应急处置卡没有练过' });
  parts.push({ n: '危险操作', v: A.danger + ' 次', need: '近30天 0 次', ok: A.danger === 0, gap: '近30天出现过整票不合格的危险操作' });
  return { M, parts };
}
/* 员工安全技能提升路径图：四条泳道（四个能力维度）→ 安全能力成熟度认定 */
function growthLanes() {
  const A = abilityCalc(), AG = homeAgg(), M = A.mat, W = weakOrder().filter(x => !x.none)[0];
  const cases = typeof caseList === 'function' ? caseList() : [];
  const sc = k => A.scene[k], cnt = k => sc(k).cnt;
  const lastExam = allRecs().find(r => r.src === 'tk' && !r.wt && /考核/.test(r.mode));
  const st = (ok, started) => ok ? 'done' : started ? 'next' : 'future';
  const lanes = [
    { k: 'kn', nodes: [
      { id: 'kn1', t: '安规考试', v: '92 分', s: 'done' },
      { id: 'kn2', t: '安规知识陪练', v: cnt('rule') ? cnt('rule') + ' 次 · ' + sc('rule').score + ' 分' : '未练', s: st(cnt('rule') >= 3 && sc('rule').score >= 75, cnt('rule')) },
      { id: 'kn3', t: '制度学习陪练', v: cnt('inst') ? cnt('inst') + ' 次 · ' + sc('inst').score + ' 分' : '未练', s: st(cnt('inst') >= 2 && sc('inst').score >= 75, cnt('inst')) }] },
    { k: 'op', nodes: [
      { id: 'op1', t: '操作票填写', v: cnt('tk') + ' 次', s: st(cnt('tk') > 0, cnt('tk')) },
      { id: 'op2', t: '操作票考核及格', v: lastExam ? lastExam.score + ' 分' : '未考', s: st(!!(lastExam && lastExam.pass), !!lastExam) },
      { id: 'op3', t: '保命技能陪练', v: cnt('life') ? cnt('life') + ' 次 · ' + sc('life').score + ' 分' : '未练', s: st(cnt('life') >= 3 && sc('life').score >= 75, cnt('life')) }] },
    { k: 'em', nodes: [
      { id: 'em1', t: '应急处置情境', v: AG.scenes.size + '/' + EMG.length, s: st(AG.scenes.size >= 10, AG.scenes.size) },
      { id: 'em2', t: '处置卡覆盖', v: AG.cards.size + '/17 类', s: st(AG.cards.size >= 17, AG.cards.size) },
      { id: 'em3', t: '应急考核 ≥ 80', v: sc('em').score != null ? '本期 ' + sc('em').score : '未练', s: st(sc('em').score >= 80, cnt('em')) }] },
    { k: 'rv', nodes: [
      { id: 'rv1', t: '推送案例学习', v: cases.filter(c => c.done).length + '/' + cases.length, s: st(cases.length && cases.every(c => c.done), cases.some(c => c.done)) },
      { id: 'rv2', t: '案例分析陪练', v: cnt('case') ? cnt('case') + ' 次 · ' + sc('case').score + ' 分' : '未练', s: st(cnt('case') >= 3 && sc('case').score >= 75, cnt('case')) },
      { id: 'rv3', t: '警示复盘 ≥ 75', v: sc('case').score != null ? '本期 ' + sc('case').score : '未练', s: st(sc('case').score >= 75, cnt('case')) }] }
  ].map(L => { const d = DIM4_MAP[L.k], D = M.dims.find(x => x.k === L.k); return Object.assign(L, { n: d.n, sc: D.score, lv: maturityLv(D.score), scenes: d.scenes.map(k => SCENE_MAP[k].short).join(' · ') }); });
  /* 当前步：最弱维度里第一个没完成的节点 */
  const weakDim = M.dims.filter(d => d.score != null).sort((a, b) => a.score - b.score)[0] || M.dims[0];
  const L = lanes.find(x => x.k === weakDim.k); const cur = L && L.nodes.find(n => n.s !== 'done'); if (cur) cur.s = 'cur';
  const allDone = lanes.every(x => x.nodes.every(n => n.s === 'done')) && M.pct >= 75;
  return { lanes, end: { id: 'end', t: '安全能力成熟度认定', v: '人工审核 · 四维度 ≥ 75', big: M.pct == null ? '—' : M.pct, lv: M.lv, s: allDone ? 'done' : 'future' }, weak: W };
}

/* ---------------- 首页 ---------------- */
const HM = { radar: 'tk' };
function radarBox() {
  const A = abilityCalc(), S = SCENE_MAP[HM.radar], sc = A.scene[HM.radar], dims = skillsOf(HM.radar), T = teamAvgOf();
  const now = dims.map(d => sc.now[d.k] == null ? 0 : sc.now[d.k]), prev = dims.map(d => sc.prev[d.k] == null ? 0 : sc.prev[d.k]);
  return `<div class="chips rdchips">${SCENES.map(x => `<span class="chip ${x.k === HM.radar ? 'on' : ''}" data-radar="${x.k}">${x.short}</span>`).join('')}</div>
    ${sc.cnt ? chRadar(dims.map(d => d.n), now, prev, { w: 330, h: 222, l1: '本期', l2: '上期', key: 'dimk' }).replace(/data-dimk="(\d+)"/g, (m, i2) => `data-dimk="${dims[+i2].k}"`) : `<div class="empty" style="height:200px;display:flex;align-items:center;justify-content:center">「${S.n}」还没有演练记录<br>练一次就有雷达</div>`}
    <div class="tk3" style="text-align:center">${S.n} · ${sc.cnt ? '本期 ' + sc.score + ' 分（最近 3 次）· 班组均值 ' + T.sc[HM.radar] : '尚未练过'} · 取自${S.src} · <span class="lk" onclick="goPage('assess')">看指标体系</span></div>`;
}
function sceneTilesHTML() {
  const A = abilityCalc(), T = teamAvgOf();
  return `<div class="sctiles">${SCENES.map(x => { const sc = A.scene[x.k]; return `<div class="sctile hitv ${sc.cnt ? (sc.score >= 75 ? 'ok' : 'w') : 'na'}" data-scene="${x.k}" data-tip="${x.n} · ${sc.cnt ? '本期 ' + sc.score + ' 分 · 最好 ' + sc.best + ' 分 · 练过 ' + sc.cnt + ' 次' : '尚未练过'}">
    <b>${h(x.n)}</b><em class="mono">${sc.cnt ? sc.score : '—'}</em><span>${sc.cnt ? '练过 ' + sc.cnt + ' 次 · 班组 ' + T.sc[x.k] : '未练 · 点击开始'}</span></div>`; }).join('')}</div>`;
}
function pageHome() {
  const A = homeAgg(), AB = abilityCalc(), M = AB.mat, W = weakOrder();
  const w1 = W[0], w2 = W.find(x => x.g !== w1.g) || W[1];
  const todo = myTodo(), task = todo[0];
  const recent = allRecs().slice(0, 6);
  const R1 = recoFor(w1), R2 = recoFor(w2);
  const played = SCENES.filter(x => AB.scene[x.k].cnt).length;
  const xwFull = `安全能力成熟度 ${M.pct == null ? '待练' : M.pct + '（' + M.lv + '）'}；「${w1.n}」${w1.none ? '尚未练过' : w1.v + ' 分'}、「${w2.n}」${w2.none ? '尚未练过' : w2.v + ' 分'}是当前两项短板；${task ? `班组长下发的「${task.targetN}」${task.due}截止，建议先完成` : `建议先练「${R1.n}」`}，成绩会直接落到安全能力雷达并反馈给班组长。`;
  const taskBtn = task ? `<button class="btn pri" data-start="${task.scene}:${task.scene === 'em' ? (task.target || '') + ':' : ''}${task.mode}">去完成任务</button>` : `<button class="btn pri" data-start="${R1.spec}">去练</button>`;
  return `
  <section class="hero hero2">
    <div class="hgreet">
      <div class="slogan"><b>${APP_SLOGAN}</b><span>${APP_NAME}</span></div>
      <div class="hsub">${greet()}，${HOME_USER.name} · ${HOME_USER.team} · ${HOME_USER.post} · 今天 ${todayStr()}${task ? ` · 待练任务：${h(task.targetN)}（${task.due}截止）` : ''}</div>
      <div class="hkpis hg">
        <div class="kpi"><b>${A.cnt}</b><span>近30天演练 次数</span></div>
        <div class="kpi ${M.pct == null ? 'warn' : M.pct >= 75 ? 'good' : 'warn'}"><b>${M.pct == null ? '—' : M.pct}</b><span>安全能力成熟度 ${M.lv}</span></div>
        <div class="kpi ${played >= SCENES.length ? 'good' : 'warn'}"><b>${played}/${SCENES.length}</b><span>陪练场景 已练</span></div>
        <div class="kpi ${A.passRate >= 80 ? 'good' : 'warn'}"><b>${A.passRate}%</b><span>近30天 及格率</span></div>
      </div>
      <div class="hteam"><span class="lb">班组伙伴</span>${teamRows().map(m => `<i class="tm ${m.n === HOME_USER.name ? 'me' : !m.cnt ? 'idle' : ''}" title="${m.n} · ${m.cnt ? '近30天 ' + m.cnt + ' 次' : '本月未练'}">${m.n.slice(0, 1)}</i>`).join('')}<span class="tmx">${teamRows().filter(m => m.cnt).length}/${TEAM.length} 人本月已练</span></div>
    </div>
    ${caseCardHTML()}
  </section>

  <section class="cockpit cp2">
    <div class="hcard ck tl hg"><div class="hch"><b>安全能力雷达</b><span>六个场景各一份 · 本期 vs 上期</span></div><div class="hcb" id="radarbox">${radarBox()}</div></div>
    <div class="hcard ckc hg"><div class="hch"><b>员工安全技能提升路径图</b><em class="ai">AI</em><span>${HOME_USER.name} · ${HOME_USER.post} · 按四个能力维度生成 · 节点可点</span></div>
      <div class="hcb">${(() => { const G = growthLanes(); return chPath4(G.lanes, G.end); })()}</div></div>
    <div class="hcard ck tr ho"><div class="hch"><b>安全能力成熟度</b><span>${h(HOME_USER.post)} · 四维度综合</span></div><div class="hcb">${chMaturity(M)}</div></div>
    <div class="hcard ck bl ho"><div class="hch"><b>最近演练成绩</b><span>最近 ${recent.length} 次 · 点复盘看报告</span></div><div class="hcb">${recent.map(r => `<div class="hrow rcrow"><span class="mono tk3">${stampOf(r.ts)}</span><b>${h(SCENE_MAP[r.src] ? SCENE_MAP[r.src].short : r.n)}<i class="tk3">${h(r.src === 'em' ? ((EMGMAP[r.eid] || {}).card || '') : (r.sub || '').split(' · ')[0])}</i></b><b class="mono ${r.pass ? 'gv' : 'wv'}">${r.score}</b><button class="btn sm" data-rec="${r.id}">复盘</button></div>`).join('')}</div></div>
    <div class="hcard ck br hg"><div class="hch"><b>六个场景掌握</b><span>本期得分 · 点击直接练</span></div><div class="hcb">${sceneTilesHTML()}</div></div>
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
    <div class="rcard ho">
      <div class="rwhy"><i>${task ? '待练任务' : '本周安排'}</i>${task ? h(task.from) + ' 下发' : '按短板与课程进度'}</div>
      <b>${task ? h(task.targetN) : '生成本周学习计划'}</b>
      <div class="tk3">${task ? `${task.due}截止 · ${task.mode === 'exam' ? '考核模式' : '训练模式'}${task.note ? ' · ' + h(task.note) : ''}` : '课程 · 演练 · 测验各占一天，由本人确认后生效'}</div>
      ${task ? taskBtn : '<button class="btn" data-go="classroom">去知识课堂</button>'}
    </div>
  </section>

  <section class="xwbar hg">
    <div class="xwavt"><i></i>AI 陪练</div>
    <div class="xwtxt" id="xwtxt" data-full="${xwFull}">${__xwTyped ? xwFull : ''}</div>
    <div class="xwbtns">
      ${taskBtn}
      <button class="btn" data-go="review">评分复盘</button><button class="btn" data-go="growth">成长档案</button><button class="btn" data-go="classroom">知识课堂</button>
    </div>
    <div class="xwsrc">由安全能力雷达与演练记录生成</div>
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
    if (n = q('[data-casegen]')) return caseGen();
    if (n = q('[data-dim]')) { m.remove(); return drillDim(n.dataset.dim); }
    if (typeof pagesClick === 'function' && pagesClick(e)) return;
  };
  return m;
}
function recTable(list) {
  return `<table class="htbl"><tr><th>时间</th><th>场景</th><th>情境</th><th>模式</th><th>用时</th><th>得分</th><th>失分点</th><th></th></tr>
    ${list.map(r => `<tr><td class="mono">${stampOf(r.ts)}</td><td>${h(r.n)}</td><td class="tk3">${h(r.sub)}</td><td>${h(r.mode === 'exam' ? '考核模式' : r.mode === 'teach' ? '训练模式' : r.mode)}</td><td class="mono">${Math.round((r.sec || 0) / 60)} 分钟</td>
      <td class="mono ${r.pass ? 'gv' : 'wv'}">${r.score}</td><td class="tk3">${h((r.sum || []).join('、') || '—')}</td><td><button class="btn sm" data-rec="${r.id}">复盘</button></td></tr>`).join('')}</table>`;
}
function drillDim(k) {
  const d = SKILL_MAP[k]; if (!d) return;
  const A = abilityCalc(), sc = A.scene[d.g], T = teamAvgOf();
  const L = allRecs().filter(r => r.src === d.g && r.dims && r.dims[k] != null);
  const low = L.filter(r => r.dims[k] < 80);
  const item = { s: d, k, g: d.g, n: d.n, v: sc.now[k] == null ? 0 : sc.now[k], none: sc.now[k] == null };
  const R = recoFor(item);
  openDrill(`能力明细 · ${d.n}`, `${SCENE_N[d.g]} · 本期 ${sc.now[k] == null ? '待练' : sc.now[k] + ' 分'} · 上期 ${sc.prev[k] == null ? '—' : sc.prev[k] + ' 分'} · 班组均值 ${T.dims[k]} 分`, `
    <div class="hrow">${h(d.d)}</div>
    <div class="sec"><div class="st">这一项低于 80 分的演练（${low.length} 次）</div><div class="sc">${low.length ? recTable(low) : L.length ? '近期各次均不低于 80 分。' : '还没有这个场景的演练记录。'}</div></div>
    <div class="sec"><div class="st">取数口径</div><div class="sc tk3">${d.g === 'tk' ? '取自每次操作票判卷结果：操作顺序按顺序错误与阶段越界扣减，漏项控制按漏项扣减，文字规范按文字与层级错误扣减，危险辨识出现危险操作即降到 30 分以下，二次与压板按屏柜、压板、空开、把手类步骤的写全率。' : d.g === 'em' ? '取自每次应急处置点评：快速决策＝作答用时对基准时长；知识储备＝处置要点得分率（意思对即得分）；风险识别＝事例纠错得分率；高效上报＝报送要求答到率。' : '取自每次' + SCENE_N[d.g] + '的判定结果。'}本期为最近 3 次均值，上期为再往前 3 次。</div></div>`,
    `<button class="btn pri" data-start="${R.spec}">练「${h(R.n)}」</button><button class="btn" data-go="review">打开评分复盘</button>`);
}
function drillScene(k) {
  const S = SCENE_MAP[k]; if (!S) return;
  const A = abilityCalc(), sc = A.scene[k], T = teamAvgOf(), L = allRecs().filter(r => r.src === k);
  openDrill(`场景 · ${S.n}`, `${sc.cnt ? '本期 ' + sc.score + ' 分 · 最好 ' + sc.best + ' 分 · 练过 ' + sc.cnt + ' 次' : '尚未练过'} · 班组均值 ${T.sc[k]}`, `
    <table class="htbl"><tr><th>指标</th><th>上期</th><th>本期</th><th>班组均值</th><th>口径</th></tr>${skillsOf(k).map(d => `<tr><td class="hitv" data-dim="${d.k}" style="cursor:pointer"><b>${d.n}</b></td><td class="mono">${sc.prev[d.k] == null ? '—' : sc.prev[d.k]}</td><td class="mono ${sc.now[d.k] == null ? '' : sc.now[d.k] >= 75 ? 'gv' : 'wv'}">${sc.now[d.k] == null ? '待练' : sc.now[d.k]}</td><td class="mono">${T.dims[d.k]}</td><td class="tk3">${h(d.d)}</td></tr>`).join('')}</table>
    ${L.length ? `<div class="sec" style="margin-top:10px"><div class="st">最近演练</div>${recTable(L.slice(0, 5))}</div>` : ''}`,
    `<button class="btn pri" data-start="${k === 'tk' ? 'tk:teach' : k === 'em' ? 'em' : k + '::teach'}">去练</button>`);
}
function drillDay(d) {
  const list = allRecs().filter(r => dayOf(r) === d);
  openDrill(`演练明细 · ${dayLabel(d)}`, `${list.length} 次`, recTable(list), `<button class="btn" data-go="review">打开评分复盘</button>`);
}
function drillPlan(k) {
  const list = allRecs().filter(r => dayOf(r) <= 30 && SCENE_N[r.src] === k);
  openDrill(`演练明细 · ${k}`, `近30天 ${list.length} 次`, recTable(list), `<button class="btn" data-go="review">打开评分复盘</button>`);
}
function drillMat() {
  const { M, parts } = matParts();
  openDrill(`安全能力成熟度构成 · ${HOME_USER.post}`, `综合 ${M.pct == null ? '待练' : M.pct + ' · ' + M.lv}`, `
    <table class="htbl"><tr><th>构成项</th><th>当前</th><th>要求</th><th>状态</th></tr>
      ${parts.map(p => `<tr><td>${p.n}</td><td class="mono">${p.v}</td><td class="mono">${p.need}</td><td>${p.ok ? '<span class="tag ok">达标</span>' : '<span class="tag wn">待补齐</span>'}</td></tr>`).join('')}</table>
    <div class="sec" style="margin-top:12px"><div class="st">差距项</div><div class="sc">${parts.filter(p => !p.ok).map(p => `<div class="hrow">· ${p.gap}</div>`).join('') || '无'}</div></div>
    <div class="tk3" style="margin-top:10px">成熟度＝四个能力维度得分的平均值；维度得分＝所属场景本期得分（最近 3 次）的平均值。分级：待提升 &lt;60 · 合格 60–74 · 熟练 75–89 · 精通 ≥90。为系统测算参考，任职评定以人工审核结果为准。</div>`,
    `<button class="btn" data-go="growth">查看成长档案</button><button class="btn pri" data-start="tk:exam">去考操作票（考核模式）</button>`);
}
function nodeClick(id) {
  if (id === 'end') return drillMat();
  if (id.indexOf('dim:') === 0) { const d = DIM4_MAP[id.slice(4)]; const S = d.scenes[0]; return openDrill(d.n, d.d, `<table class="htbl"><tr><th>场景</th><th>本期</th><th>练过</th><th></th></tr>${d.scenes.map(k => { const sc = abilityCalc().scene[k]; return `<tr><td>${SCENE_N[k]}</td><td class="mono">${sc.score == null ? '待练' : sc.score}</td><td class="mono">${sc.cnt} 次</td><td><button class="btn sm" data-start="${k === 'tk' ? 'tk:teach' : k === 'em' ? 'em' : k + '::teach'}">去练</button></td></tr>`; }).join('')}</table>`, `<button class="btn pri" data-start="${S === 'tk' ? 'tk:teach' : S === 'em' ? 'em' : S + '::teach'}">练「${SCENE_N[S]}」</button>`); }
  const map = { kn2: 'rule::teach', kn3: 'inst::teach', op1: 'tk:teach', op2: 'tk:exam', op3: 'life::teach', em1: 'em', em2: 'em', em3: 'em', rv2: 'case::teach', rv3: 'case::teach' };
  if (map[id]) return startScene(map[id]);
  if (id === 'rv1') { const c = (typeof caseList === 'function' ? caseList() : []).find(x => !x.done) || (caseList() || [])[0]; return c ? caseOpen(c.id) : goPage('center'); }
  if (id === 'kn1') return openDrill('安规考试 · 变电部分', '年度考试与复训', `
    <table class="htbl"><tr><th>项目</th><th>成绩/状态</th><th>日期</th></tr>
    <tr><td>年度安规笔试</td><td class="mono gv">92 分</td><td class="mono">${dayLabel(80)}</td></tr>
    <tr><td>安规修编后复训</td><td><span class="tag wn">待安排</span></td><td class="mono">—</td></tr></table>`,
    `<button class="btn pri" data-start="rule::teach">去安规知识陪练</button>`);
}

/* ---------------- 事件委托（首页与各薄页共用） ---------------- */
function bindHPage() {
  $('#hpage').oninput = e => { if (typeof pagesInput === 'function') pagesInput(e); };
  $('#hpage').onchange = e => { if (typeof sceneChange === 'function') sceneChange(e); };
  $('#hpage').onclick = e => {
    if (typeof leaderClick === 'function' && leaderClick(e)) return;
    if (typeof pagesClick === 'function' && pagesClick(e)) return;
    const q = s => e.target.closest(s); let n;
    if (n = q('[data-start]')) return startScene(n.dataset.start);
    if (n = q('[data-rec]')) return openRec(n.dataset.rec);
    if (n = q('[data-go]')) return goPage(n.dataset.go);
    if (n = q('[data-dim]')) return drillDim(n.dataset.dim);
    if (n = q('[data-dimk]')) return drillDim(n.dataset.dimk);
    if (n = q('[data-hdim]')) return drillDim(n.dataset.hdim);
    if (n = q('[data-day]')) return drillDay(+n.dataset.day);
    if (n = q('[data-plan]')) return drillPlan(n.dataset.plan);
    if (n = q('[data-mat]')) return drillMat();
    if (n = q('[data-scene]')) return drillScene(n.dataset.scene);
    if (n = q('[data-radar]')) { HM.radar = n.dataset.radar; const b = $('#radarbox'); if (b) b.innerHTML = radarBox(); return; }
    if (n = q('[data-node]')) return nodeClick(n.dataset.node);
    if (n = q('[data-case]')) return caseOpen(n.dataset.case);
    if (n = q('[data-casepush]')) return casePushDlg();
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
  (root || document).querySelectorAll('.kpi b, .rvbig, .sctile em').forEach(b => {
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
  ['产品名与口号', '安全学习智能陪练 · 一切事故都可以预防（10/1 客户意见）；六个陪练场景对应安全能力成熟度四个维度'],
  ['安全能力成熟度', '四维度＝所属场景本期得分（最近 3 次）平均，成熟度＝四维度平均，分级 待提升 / 合格 / 熟练 / 精通 由本平台拟定 · 待业务确认；由班组长确认后使用'],
  ['两票填写 · 操作票试卷与标准票', '照录《110kV考核站操作票考核试卷》运行方式、答题要求与 7 个屏柜附表；步骤内容以典型操作票为准'],
  ['两票填写 · 工作票', '第一种工作票安全措施填写由本平台按安规 6.1 拟定 · 待客户提供票样与判卷标准'],
  ['标准票编号口径', '典型票中屏柜、压板、空开、把手编号与试卷附表不一致的 10 处按附表改正；按典型票原文填写会判编号不符，客户典型票 xlsx 原件导入判卷 90 分 · 待业务确认'],
  ['判卷标注：阶段、换序组、特殊顺序、漏写处理、文字要求、执行原因', '本平台按《电气操作导则》与安规拟定 · 待业务专家确认；扣分值为配置项'],
  ['危险操作 6 条', '本平台拟定 · 待业务专家确认；前三条可检索到安规 / 导则条款，后三条暂无条款原文，显示「建议人工复核」'],
  ['主接线图', '试卷接线图为 CAD 嵌入对象无法读取，按试卷运行方式文字重绘 · 待客户提供接线图截图或 PDF 核对'],
  ['操作票 Word / Excel 上传', '纯浏览器离线解析；Excel 认「操作顺序 / 操作步骤」两列，Word 认操作票表格或逐行'],
  ['应急处置：处置要点与注意事项', '照录场景归类表与 15 张应急处置卡；高温中暑场景一新增「不得让患者独自留下、不能自己继续巡视」要点与对应注意事项（10/1 客户意见，本平台拟写 · 待业务确认）'],
  ['应急处置：AI 生成情境', '同一张处置卡按时间 / 地点 / 人员 / 现场情况组合生成（规则模板，非在线大模型），第 0 版为场景归类表原文；朗读用浏览器语音，没有中文语音时提示阅读'],
  ['应急处置：四项指标', '快速决策＝作答用时对基准时长（每个要点 45 秒、事例纠错 2 分钟、报送 1.5 分钟）；知识储备＝要点得分率（关键词组匹配，意思对即得分）；风险识别＝事例纠错得分率；高效上报＝报送答到率 · 本平台拟定待确认'],
  ['应急处置：事例', '16 个情境的处置经过事例由本平台编写，分句标 ①②③ · 待业务确认'],
  ['应急处置：计分口径', '处置要点 60 + 事例纠错 40（无注意事项的情境处置要点计 100），信息报送每项加 2 分、总分封顶 100 · 本平台拟定待确认'],
  ['安规知识陪练', '题目从安规与导则条文自动生成（单选 / 判断 / 口述填空 + 依据条款指认），答错给条款原文，错题复练；指标：条款理解 / 依据引用 / 作答速度 / 易错巩固 · 口径由本平台拟定待确认'],
  ['保命技能陪练', '停电 / 验电 / 接地 / 遮栏与标示牌 / 触电急救五项：步骤排序 + 要点填空 + 禁止事项多选；标准步骤按安规 6.1～6.3 与应急处置卡由本平台整理 · 待业务确认'],
  ['案例分析陪练', '4 个预置脱敏案例（变电 / 配网 / 通用，人物单位全部虚构）+ 班组长推送案例；四方面作答按关键词组逐项比对（意思对即得分），标准分析由本平台拟定 · 待业务确认'],
  ['制度学习陪练', '制度文件（预置两票管理细则节选 / 应急信息报送指引 / 安规技术措施条文，或本机上传）→ 课件 → 数字人讲课 → 自动出题 → 考试 → 考试分析，全程本机规则生成'],
  ['工作票陪练', '第一种工作票安全措施四栏勾选判定（含干扰项），缺停电 / 接地措施按危险判定；标准措施按安规由本平台拟定 · 待业务确认；成绩与操作票同记入两票填写陪练'],
  ['案例推送学习', '预置 2 个脱敏虚构案例；班组长导入通报（Word / 文本）后按规则抽取经过 / 原因 / 条款 / 要点生成案例课件与 3 道题推送全班；班员学完回写（规则抽取，非在线大模型）'],
  ['课件生成 / 数字人讲课 / 自动出题 / 考试分析', '课件：文件按章节与条款句自动分页并生成讲稿；数字人：内置形象引擎 + 浏览器中文语音朗读（无语音时口型与字幕照常），HeyGen 真人数字人视频预留接口（HEYGEN_CLIPS）；出题：判断（改动情态词）/ 单选（挖空数字或术语）/ 简答（关键词比对），每题附依据原文；考试分析：个人章节掌握 + 关键条款 + 速度，班组对比为脱敏模拟分布'],
  ['近30天记录中的非本机记录、班组其他成员成绩、同批次人员', '脱敏模拟 · 人物全部虚拟；两票 / 应急的模拟记录由判卷引擎与应急计分对合成答卷实时计分'],
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
  if (k === 'case_push') { ROLE.cur = 'lead'; renderRole(); goPage('team'); setTimeout(casePushDlg, 300); return; }
  if (k === 'status') return openDrill('功能实现状态清单', '真实 / 规则 / 预置 / 模拟 / 待确认', `<table class="htbl statlist"><tr><th>功能</th><th>实现状态</th></tr>${IMPL_STATUS.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</table>`);
  if (k === 'bound') return openDrill('系统边界表', '现有平台负责课程、题库、考试、人员主数据；本产品负责情境练习、过程纠错、复训与回写', boundaryHtml());
  if (k === 'clear') { Object.keys(localStorage).filter(x => x.startsWith('xwt_')).forEach(x => localStorage.removeItem(x)); TK.res = null; EM.res = null; EM.id = null; toast('本机记录已清空'); route(); return; }
}
