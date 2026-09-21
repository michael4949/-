/* ===== 系统首页（工作台）· 路由 · AI 教练中心 · 背景动效 ===== */

let __xwTyped = false;
const COACH_IMGS = __COACH_IMGS__;   // 构建时由 assets/coaches/<id>.png 内联
function goPage(h) { if ((location.hash || '').replace(/^#\/?/, '') === h) route(); else location.hash = '#' + h; }

/* ---------------- 路由 ---------------- */
function route() {
  let h = (location.hash || '').replace(/^#\/?/, '') || 'home';
  if (!['home', 'center', 'ticket', 'expert', 'exam', 'assess', 'analytics', 'sys', 'plaza', 'review', 'growth', 'classroom', 'team', 'editor'].includes(h)) h = 'home';
  renderHPage(h); HomeFX.on();
  $$('#hnav .hnavi').forEach(a => a.classList.toggle('on', a.dataset.h === h));
}

/* 进入教练＝进入该教练的陪练关卡（训练模式）；未开通或未配置关卡的教练只能申请开通 */
function enterCoach(id, pre) {
  const c = ALL_COACHES().find(x => x.id === id);
  if (!c || !c.open) return toast('该教练在本单位尚未开通');
  if (pre && String(pre).startsWith('exam:')) return examStart(pre.slice(5), 'teach');
  if (c.exam) return examStart(c.exam, 'teach');
  return toast('该教练的关卡内容待配置');
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
        <span class="hnavi" data-h="expert">专家答辩</span>
        <span class="hnavi" data-h="exam">陪练关卡</span>
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
    <button data-dm="main">演示主线：组长下发 1163 考核 → 学员进入</button>
    <button data-dm="tk_ok">操作票：一键按标准票填完（正确）</button>
    <button data-dm="tk_swap">操作票：组内换序（应当不判错）</button>
    <button data-dm="tk_order">操作票：先拉母线侧刀闸（顺序错误）</button>
    <button data-dm="tk_danger">操作票：未验明无电压即合地刀（整票不合格）</button>
    <button data-dm="tk_text">操作票：并项与缺双重名称（文字不规范）</button>
    <button data-dm="ep_run">专家答辩：一键按范例作答五题</button>
    <button data-dm="red">触发红线：跳过验电直接合地刀</button>
    <button data-dm="run">一键跑完当前考试（正确路径）</button>
    <button data-dm="es">地刀两态：<b id="dm_es">随机</b></button>
    <button data-dm="rain">雨淋阀压力异常注入：<b id="dm_rain">关</b></button>
    <button data-dm="voice">数字人朗读语音：<b data-voicelbl>关</b></button>
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
  voiceLabel();
  renderRole();
  const clk = () => { const d = new Date(); $('#hclock').textContent = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  clk(); setInterval(clk, 20000);
  bindTip(); bindHPage();
  HomeFX.init();
}

/* ---------------- 页面渲染 ---------------- */
function renderHPage(h) {
  const pg = $('#hpage'); if (!pg) return;
  pg.dataset.cur = h;
  pg.innerHTML = h === 'home' ? pageHome() : h === 'center' ? pageCenter() : h === 'ticket' ? pageTicket() : h === 'expert' ? pageExpert() : h === 'assess' ? pageAssess() : h === 'analytics' ? pageAnalytics() : h === 'sys' ? pageSys()
    : h === 'plaza' ? pagePlaza() : h === 'exam' ? pageExam() : h === 'review' ? pageReview() : h === 'growth' ? pageGrowth() : h === 'classroom' ? pageClassroom() : h === 'team' ? pageTeam() : pageEditor();
  pg.scrollTop = 0; const hm = $('#pg_home'); if (hm && h !== 'home') hm.scrollTop = 0;
  if (typeof pageAfter === 'function') pageAfter(h);
  if (h === 'exam') examAfter(); else if (EX.timer) { clearInterval(EX.timer); EX.timer = null; }
  if (h === 'ticket') ticketAfter(); else if (TK.timer && h !== 'ticket') { clearInterval(TK.timer); TK.timer = null; }
  if (h === 'expert') expertAfter(); else if (EP.timer && h !== 'expert') { clearInterval(EP.timer); EP.timer = null; }
  if (h === 'assess' || h === 'analytics') platAfter(h);
  countUp(pg);
  if (h === 'home' && !__xwTyped) { __xwTyped = true; typeInto($('#xwtxt'), $('#xwtxt').dataset.full); }
}

function greet() { const h = new Date().getHours(); return h < 6 ? '夜深了' : h < 9 ? '早上好' : h < 12 ? '上午好' : h < 18 ? '下午好' : '晚上好'; }
function todayStr() { const d = new Date(); return `${d.getMonth() + 1}月${d.getDate()}日 ${'周' + '日一二三四五六'[d.getDay()]}`; }

/* ---------------- 首页 ---------------- */
function pageHome() {
  const A = homeAgg();
  const now8 = abilityNow();
  const okDims = now8.filter(v => v >= 70).length;
  const recs = examRecords().filter(r => r.who === HOME_USER.name);
  const cert = certSuggest(TEAM[0]); const certOk = cert.filter(x => x.ok).length;
  const certC = lsGet(LS_CERT, {})[HOME_USER.name];
  const todo = examTasks().filter(t => !t.results || !t.results.some(r => r.who === HOME_USER.name));
  const task = todo[0];
  const order = DIMS.map((n, i) => [n, now8[i], i]).sort((x, y) => x[1] - y[1]);
  const w1 = order[0], w2 = order[1];
  const hist = examHist(); const lastEx = hist[0];
  const xwFull = `「${w1[0]}」${w1[1]} 分、「${w2[0]}」${w2[1]} 分是当前两项短板；${task ? `班组长下发的「${task.examName || task.plan}」${task.due}截止，建议先完成考试` : `建议先考「${(EXAMS.find(e => e.id === (DIM_EXAM[w1[0]] || 'e1163')) || {}).short}」`}，教练全程在侧，成绩会直接落到能力雷达并反馈给班组长。`;
  return `
  <section class="hero">
    <div class="hgreet">
      <h1>${greet()}，${HOME_USER.name}</h1>
      <div class="hsub">${HOME_USER.team} · ${HOME_USER.post} · 岗位胜任能力评价：${CERT_POST} · 今天 ${todayStr()}</div>
      <div class="hkpis hg">
        <div class="kpi ${certOk >= 16 ? 'good' : 'warn'}"><b>${certOk}/20</b><span>专业项目 建议授权</span></div>
        <div class="kpi ${okDims < DIMS.length ? 'warn' : 'good'}"><b>${okDims}/${DIMS.length}</b><span>能力维度 达标</span></div>
        <div class="kpi"><b>${A.cnt}</b><span>近30天关卡 次数</span></div>
        <div class="kpi ${A.passRate >= 80 ? 'good' : 'warn'}"><b>${A.passRate}%</b><span>关卡及格率</span></div>
      </div>
      <div class="hteam"><span class="lb">班组伙伴</span>${TEAM.map(m => `<i class="tm ${m.n === HOME_USER.name ? 'me' : m.sess === 0 ? 'idle' : ''}" title="${m.n} · ${m.sess ? '近30天 ' + m.sess + ' 场' : '本月未练'}">${m.n.slice(0, 1)}</i>`).join('')}<span class="tmx">${TEAM.filter(m => m.sess).length}/${TEAM.length} 人本月已练</span></div>
    </div>
    <div class="taskcard ho">
      <div class="tk1">${task ? '待考任务' : '今日待练任务'}</div>
      <div class="tk2">${task ? (task.examName || task.plan) : HOME_TASK.name}</div>
      <div class="tk3">${task ? `${task.from} 下发 · ${task.due}截止 · ${task.mode} · 及格 ${task.pass}${task.dims && task.dims.length ? '<br>针对 ' + task.dims.join('、') : ''}` : `${HOME_TASK.from} 下发 · ${dateAfter(HOME_TASK.dueDays)}截止 · 未完成`}</div>
      ${task ? `<button class="btn pri" data-exstart="${task.exam}" data-exmode="${task.mode === '考核模式' ? 'exam' : task.mode === '演练模式' ? 'drill' : 'teach'}" data-extask="${task.id}">开始考试</button>` : `<button class="btn pri" data-exstart="${HOME_TASK.exam}" data-exmode="${HOME_TASK.mode}">去完成</button>`}
    </div>
    <div class="hourcard ho">
      <div class="tk1">作业授权认证进度</div>
      <div class="certprog">${cert.map(x => `<i class="${x.ok ? 'ok' : ''} ${x.it.star ? 'star' : ''}" data-tip="${x.it.code} ${x.it.n} · ${x.ok ? '建议授权' : '待训练'} · ${x.why}">${x.it.code}</i>`).join('')}</div>
      <div class="tk3"><b class="mono">${certOk}</b> / 20 个专业项目建议授权 · ★ 岗位必备 · ${certC ? `已由班组授权人 ${certC.by} 确认` : '待班组授权人确认'}</div>
      <button class="btn" data-cert="0">查看认证表草稿</button>
    </div>
  </section>

  <section class="cockpit">
    <div class="hcard ck tl hg"><div class="hch"><b>能力雷达</b><span>8 维 · 本月 vs 上月</span></div><div class="hcb">${chRadar(DIMS, now8, RADAR_PREV, { w: 330, h: 236 })}<div class="tk3" style="text-align:center">维度按作业授权认证表 20 个专业项目与两项实操考试抽取 · v1.0 已审定</div></div></div>
    <div class="hcard ckc hg"><div class="hch"><b>学员成长地图</b><em class="ai">AI</em><span>${HOME_USER.name} · ${HOME_USER.post} · 考试 → 能力 → 授权</span></div>
      <div class="hcb">${chGrowthMap(GROWTH_NODES.map(n => n.id === 'g6' ? { ...n, v: task ? task.due + '截止' : '待下发' } : n.id === 'g7' ? { ...n, v: `${certOk}/20` } : n.id === 'b2' ? { ...n, v: `${recs.length} 次` } : n), GROWTH_EDGES)}</div></div>
    <div class="hcard ck tr ho"><div class="hch"><b>关卡分布</b><span>近30天 · 按次数</span></div><div class="hcb">${chDonut(A.kindCnt)}</div></div>
    <div class="hcard ck bl ho"><div class="hch"><b>陪练关卡成绩</b><span>${hist.length ? '最近 ' + Math.min(5, hist.length) + ' 次' : '尚未考试'}</span></div><div class="hcb">${hist.length ? hist.slice(0, 5).map(r => `<div class="hrow" style="display:flex;gap:8px;align-items:center"><span class="mono tk3">${stampOf(r.ts)}</span><b style="flex:1">${r.short}</b><b class="mono ${r.red || r.score < r.pass ? 'wv' : 'gv'}">${r.red ? '否决' : r.score + '/' + r.max}</b><button class="btn sm" data-exreview="${r.id}">复盘</button></div>`).join('') : `<div class="tk3" style="padding:6px">两项考试内容：${EXAMS.map(e => e.short).join('、')}。成绩落到能力雷达并反馈班组长。</div><button class="btn pri" data-go="exam" style="margin:6px">去陪练关卡</button>`}</div></div>
    <div class="hcard ck br hg"><div class="hch"><b>能力对标</b><span>我 vs 班组均值（组织级口径）</span></div><div class="hcb">${chHeat(DIMS, now8, TEAM_AVG)}</div></div>
    <div class="hcard ck w hg"><div class="hch"><b>关卡用时与次数</b><span>近30天 · 按日</span></div><div class="hcb">${chCombo(A.byDay, { w: 720, h: 190 })}</div></div>
    <div class="hcard ck g ho"><div class="hch"><b>岗位胜任度</b><span>${FITNESS.post}</span></div><div class="hcb">${chGauge(FITNESS)}</div></div>
  </section>

  <section class="reco">
    ${recoList().map(r => { if (r.exam) { const e = EXAMS.find(x => x.id === r.exam); return `
      <div class="rcard hg">
        <div class="rwhy"><i class="ai">AI 推荐</i>${r.why}</div>
        <b>${e.n}</b>
        <div class="tk3">陪练关卡 · ${e.max} 分制 · 及格 ${e.pass} · 覆盖 ${e.cover.map(k => abilityOf(k).n).join('、')}</div>
        <button class="btn pri" data-exstart="${e.id}" data-exmode="${r.mode || 'teach'}">${r.act}</button>
      </div>`; } const c = COACHES.find(x => x.id === r.coach); return `
      <div class="rcard hg">
        <div class="rwhy"><i class="ai">AI 推荐</i>${r.why}</div>
        <b>${c.n}</b>
        <div class="tk3">${c.fam} · ${c.min} 分钟 · 已练 ${c.users} 人 · 平均提分 +${c.gain}</div>
        <button class="btn ${c.open ? 'pri' : ''}" data-reco="${r.coach}">${r.act}</button>
      </div>`; }).join('')}
    <div class="rcard lastr ho">
      <div class="rwhy"><i>最近复盘</i>${lastEx ? stampOf(lastEx.ts) : ''}</div>
      <b>${lastEx ? `${lastEx.short} · ${lastEx.red ? '否决' : lastEx.score + '/' + lastEx.max}` : '尚无记录'}</b>
      <div class="tk3">${lastEx ? `${lastEx.modeName} · 用时 ${lastEx.dur} 分钟 · 错误 ${lastEx.errs.length} 项` : ''}</div>
      <div class="tk3">${lastEx && lastEx.sugg && lastEx.sugg[0] ? lastEx.sugg[0].t : ''}</div>
      ${lastEx ? `<button class="btn" data-exreview="${lastEx.id}">查看复盘</button>` : '<button class="btn" data-go="exam">去陪练关卡</button>'}
    </div>
  </section>

  <section class="xwbar hg">
    <div class="xwavt"><i></i>小瓦特</div>
    <div class="xwtxt" id="xwtxt" data-full="${xwFull}">${__xwTyped ? xwFull : ''}</div>
    <div class="xwbtns">
      ${task ? `<button class="btn pri" data-exstart="${task.exam}" data-exmode="${task.mode === '考核模式' ? 'exam' : 'teach'}" data-extask="${task.id}">去完成考试</button>` : `<button class="btn pri" data-exstart="${DIM_EXAM[w1[0]] || 'e1163'}">考「${(EXAMS.find(e => e.id === (DIM_EXAM[w1[0]] || 'e1163')) || {}).short}」</button>`}
      <button class="btn" data-go="classroom">去知识课堂</button>
    </div>
    <div class="xwsrc">由能力雷达与考试记录生成</div>
  </section>

  <section class="mycoach hg">
    <div class="mch"><b>我在练的教练</b><span>本单位已为我开通 ${ALL_COACHES().filter(c => c.open).length} 位 · 开通申请 ${COACH_APPLY.length} 条</span>
      <button class="btn" data-go="plaza">去教练中心</button></div>
    <div class="mcrow">
      ${MYCOACH.map(mc => { const c = ALL_COACHES().find(x => x.id === mc.id); if (!c) return '';
        return `<div class="mcc">
          ${COACH_IMGS[c.avatar || c.id] ? `<img class="cav" src="${COACH_IMGS[c.avatar || c.id]}" alt="${c.n}">` : `<div class="cav">${COACH_GLYPH[c.fam] || '练'}</div>`}
          <div class="mcm"><b>${c.n}</b><span>最近一次 ${mc.last} · 已练 ${mc.cnt} 场 · 最近得分 ${mc.score}</span>
            <div class="mcbar"><i style="width:${mc.prog}%"></i></div><span class="mcp">本教练内容已练 ${mc.prog}%</span></div>
          ${c.exam ? `<button class="btn pri" data-exstart="${c.exam}">继续练</button>` : `<button class="btn" data-go="plaza">查看</button>`}
        </div>`; }).join('')}
      ${COACH_APPLY.map(a => { const c = ALL_COACHES().find(x => x.id === a.id); if (!c) return '';
        return `<div class="mcc apply">
          ${COACH_IMGS[c.avatar || c.id] ? `<img class="cav" src="${COACH_IMGS[c.avatar || c.id]}" alt="${c.n}">` : `<div class="cav">${COACH_GLYPH[c.fam] || '练'}</div>`}
          <div class="mcm"><b>${c.n}</b><span>${a.at} · ${a.st}</span>
            <span class="mcp">开通后出现在本条，可直接开练</span></div>
          <button class="btn" data-go="plaza">查看</button>
        </div>`; }).join('')}
    </div>
  </section>`;
}
function ALL_COACHES() { return COACHES.concat(typeof customCoaches === 'function' ? customCoaches() : []); }

function hcard(t, sub, body) {
  return `<div class="hcard"><div class="hch"><b>${t}</b><span>${sub}</span></div><div class="hcb">${body}</div></div>`;
}

/* ---------------- AI 教练中心 ---------------- */
const PF = { fam: '全部', dom: '全部', tag: '全部' };
const COACH_TYPE = { daozha: 'rule', abn: 'rule', patrol: 'rule', test: 'rule', anco: 'rule', relay: 'rule', dnet: 'rule', live: 'rule', term: 'lang', order: 'lang', cust: 'lang', comp: 'doc', biz: 'lang', angui: 'lang', fire: 'rule', space: 'rule', meet: 'lang', mentor: 'lang' };
const COACH_GLYPH = { '变电运行': '运', '变电检修': '检', '配网': '配', '调度': '调', '营销服务': '营', '安全监督': '安', '班组管理': '班' };
const COACH_GRAD = { '变电运行': ['#1e63b8', '#4d97e8'], '变电检修': ['#0e7a5f', '#2fd08a'], '配网': ['#8a5a14', '#e8b22a'], '调度': ['#5b3a9e', '#c3a8e8'], '营销服务': ['#9e3a5b', '#e88aa8'], '安全监督': ['#9e4a1e', '#ff8a3d'], '班组管理': ['#14648a', '#4dc3e8'] };

function pagePlaza() {
  const ALLC = COACHES.concat(customCoaches());
  const doms = ['全部', ...new Set(ALLC.filter(c => PF.fam === '全部' || c.fam === PF.fam).map(c => c.dom))];
  const tags = ['全部', ...new Set(ALLC.flatMap(c => c.tags))];
  const list = ALLC.filter(c =>
    (PF.fam === '全部' || c.fam === PF.fam) &&
    (PF.dom === '全部' || c.dom === PF.dom) &&
    (PF.tag === '全部' || c.tags.includes(PF.tag)));
  const chip = (f, v, cur) => `<span class="fchip ${v === cur ? 'on' : ''}" data-fchip="${f}" data-v="${v}">${v}</span>`;
  const openN = ALLC.filter(c => c.open).length, cusN = ALLC.length - COACHES.length;
  const hot = ALLC.slice().sort((a, b) => b.users - a.users)[0];
  return `
  <section id="plaza" class="plaza">
    <div class="pzhero ho">
      <div class="pzt"><h1>AI 教练中心</h1>
        <div class="hsub">本单位教练目录 · 开通与自建入口 · 由 ${HOME_USER.team} 培训专责统一管理</div></div>
      <div class="pzk">
        <div class="kpi"><b>${ALLC.length}</b><span>教练总数</span></div>
        <div class="kpi"><b>${COACH_FAMS.length}</b><span>覆盖岗位族</span></div>
        <div class="kpi good"><b>${openN}</b><span>已开通</span></div>
        <div class="kpi warn"><b>${ALLC.length - openN}</b><span>未开通</span></div>
        <div class="kpi"><b>${cusN}</b><span>本单位自建</span></div>
      </div>
      <div class="pzact">
        <button class="btn pri" data-go="editor">新建教练</button>
        <button class="btn" data-go="home">回工作台</button>
      </div>
      <div class="pzhot">本月最多人练：<b>${hot.n}</b> · ${hot.users} 人 · 平均提分 +${hot.gain}　｜　未开通的教练可提交开通申请，审核通过后出现在工作台「我在练的教练」。</div>
    </div>
    <section class="hcard hg"><div class="hch"><b>陪练类型地图</b><span>四类陪练与当前成熟度 · 本轮集中做深程序规则类样板</span></div><div class="hcb"><div class="typemap">${COACH_TYPES.map(t => `<div class="typec"><b>${t.n}</b><div class="lv">${[1, 2, 3].map(i => `<i class="${i <= t.lv ? 'on' : ''}"></i>`).join('')}<em>${t.lvn}</em></div><span>${t.d}</span><em>${t.ex.join(' · ')}</em></div>`).join('')}</div></div></section>
    <div class="pzf"><label>岗位族</label>${['全部', ...COACH_FAMS].map(v => chip('fam', v, PF.fam)).join('')}</div>
    <div class="pzf"><label>业务域</label>${doms.map(v => chip('dom', v, PF.dom)).join('')}</div>
    <div class="pzf"><label>能力项</label>${tags.map(v => chip('tag', v, PF.tag)).join('')}</div>
    <div class="pzcnt">筛选出 ${list.length} 位教练</div>
    <div class="pzgrid">
      ${list.map(c => {
        const g = COACH_GRAD[c.fam];
        return `<div class="ccard hg ${c.open ? 'openc' : 'lockc'}" data-coach="${c.id}">
        <div class="crow1">
          ${COACH_IMGS[c.avatar || c.id] ? `<img class="cav" src="${COACH_IMGS[c.avatar || c.id]}" alt="${c.n}">` : `<div class="cav" style="background:linear-gradient(135deg,${g[0]},${g[1]})">${COACH_GLYPH[c.fam]}</div>`}
          <div class="cmeta"><b>${c.n}</b><span>${c.fam} · ${c.dom}</span></div>
          ${c.open ? '<span class="copen">已开通</span>' : c.custom ? '<span class="copen" style="color:#8a6d15;background:#faf3dc;border-color:#e3d49e">自建 · 待审核</span>' : '<span class="clock">未开通</span>'}
        </div>
        <div class="cdesc">${c.desc}</div>
        <div class="ctags"><i class="ctype">${(COACH_TYPES.find(t => t.k === (COACH_TYPE[c.id] || 'rule')) || {}).n}</i>${c.tags.map(t => `<i>${t}</i>`).join('')}</div>
        <div class="cstat"><span>难度 ${'●'.repeat(c.lvl)}${'○'.repeat(3 - c.lvl)}</span><span>${c.min} 分钟</span><span>已练 ${c.users} 人</span><span>平均提分 +${c.gain}</span></div>
        ${c.open ? (c.exam && c.id !== 'daozha' ? `<button class="btn pri" data-exstart="${c.exam}">开始考试</button>` : c.exam ? `<span class="cgo2"><button class="btn pri" data-exstart="${c.exam}">1163 关卡考试</button><button class="btn cgo" data-coach="${c.id}">完整票练习</button></span>` : `<button class="btn pri cgo" data-coach="${c.id}">开始练习</button>`)
          : c.custom ? `<button class="btn cgo" data-go="editor">在教练编辑器中继续完善</button>`
          : COACH_APPLY.some(a => a.id === c.id) ? `<div class="capply">开通申请 ${COACH_APPLY.find(a => a.id === c.id).at} · ${COACH_APPLY.find(a => a.id === c.id).st}</div>`
          : `<button class="btn cgo" data-apply="${c.id}">申请开通</button>`}
      </div>`; }).join('')}
      ${list.length ? '' : '<div class="pzempty">当前筛选条件下暂无教练</div>'}
    </div>
  </section>`;
}

/* 申请开通：写入本机开通申请，教练中心与工作台同步显示进度 */
function applyCoach(id) {
  const c = ALL_COACHES().find(x => x.id === id); if (!c) return;
  if (COACH_APPLY.some(a => a.id === id)) return toast('该教练的开通申请已提交');
  const d = new Date();
  COACH_APPLY.push({ id, at: `${d.getMonth() + 1}月${d.getDate()}日 提交`, st: '培训专责审核中' });
  try { localStorage.setItem('xwt_coach_apply', JSON.stringify(COACH_APPLY)); } catch (e) { }
  toast(`已向培训专责提交「${c.n}」开通申请`);
  refreshPlaza();
}
function loadCoachApply() {
  try { const a = JSON.parse(localStorage.getItem('xwt_coach_apply') || 'null'); if (Array.isArray(a) && a.length) { COACH_APPLY.length = 0; a.forEach(x => COACH_APPLY.push(x)); } } catch (e) { }
}

function refreshPlaza() {
  const old = $('#plaza'); if (!old) return;
  const tmp = el('div', '', pagePlaza()); old.replaceWith(tmp.firstElementChild);
}

/* ---------------- 事件委托（首页与各薄页共用） ---------------- */
function bindHPage() {
  $('#hpage').oninput = pagesInput;
  $('#hpage').onkeydown = examKey;
  $('#hpage').onclick = e => {
    if (examClick(e)) return;
    if (leaderClick(e)) return;
    if (pagesClick(e)) return;
    const q = s => e.target.closest(s); let n;
    if (n = q('[data-fchip]')) { PF[n.dataset.fchip] = n.dataset.v; if (n.dataset.fchip === 'fam') { PF.dom = '全部'; } refreshPlaza(); return; }
    if (n = q('[data-apply]')) { return applyCoach(n.dataset.apply); }
    if (n = q('.cgo[data-coach]')) return enterCoach(n.dataset.coach, null);
    if (n = q('[data-coach]')) { const c = ALL_COACHES().find(x => x.id === n.dataset.coach); if (c && c.custom) return goPage('editor'); return c && c.open ? enterCoach(c.id, null) : toast('该教练在本单位尚未开通，可在教练中心提交开通申请'); }
    if (n = q('[data-reco]')) return recoAct(n.dataset.reco);
    if (n = q('[data-cert]')) return certDrill(+n.dataset.cert);
    if (n = q('[data-go]')) return goPage(n.dataset.go);
    if (n = q('[data-dim]')) return drillDim(+n.dataset.dim);
    if (n = q('[data-hdim]')) return drillDim(+n.dataset.hdim);
    if (n = q('[data-day]')) return drillDay(+n.dataset.day);
    if (n = q('[data-plan]')) return drillPlan(n.dataset.plan);
    if (n = q('[data-week]')) return drillWeek(+n.dataset.week);
    if (n = q('[data-gauge]')) return drillFit();
    if (n = q('[data-node]')) return nodeClick(n.dataset.node);
    if (n = q('[data-row]')) { const d = $('#rx' + n.dataset.row); if (d) d.hidden = !d.hidden; return; }
  };
}

function recoAct(id) {
  const r = recoList().find(x => x.coach === id), c = COACHES.find(x => x.id === id);
  if (c.open) return enterCoach(id, r.pre);
  PF.fam = c.fam; PF.dom = '全部'; PF.tag = '全部'; refreshPlaza();
  const p = $('#plaza'); if (p) p.scrollIntoView({ behavior: 'smooth' });
}

/* ---------------- 下钻弹层 ---------------- */
function openDrill(title, sub, html, foot) {
  const m = el('div', 'mask lite');
  m.innerHTML = `<div class="dlg" style="width:min(720px,95vw)">
    <div class="dh"><b>${title}</b><span style="font-size:11px;color:#93a9c4">${sub || ''}</span><span class="cls">×</span></div>
    <div class="db" style="max-height:64vh;overflow:auto">${html}</div>
    ${foot ? `<div class="df">${foot}</div>` : ''}</div>`;
  document.body.appendChild(m);
  m.querySelector('.cls').onclick = () => m.remove();
  m.onclick = e => {
    if (e.target === m) return m.remove();
    const q = s => e.target.closest(s); let n;
    if (n = q('[data-exstart]')) { m.remove(); return examStart(n.dataset.exstart, n.dataset.exmode || 'teach'); }
    if (n = q('[data-exreview]')) { m.remove(); return examReviewOpen(n.dataset.exreview); }
    if (n = q('[data-go]')) { m.remove(); return goPage(n.dataset.go); }
    if (typeof pagesClick === 'function' && pagesClick(e)) return;
  };
  return m;
}
function examTable(list) {
  return `<table class="htbl"><tr><th>时间</th><th>关卡</th><th>模式</th><th>用时</th><th>得分</th><th>错误</th><th></th></tr>
    ${list.map(r => `<tr><td class="mono">${stampOf(r.ts)}</td><td>${r.short}</td><td>${r.modeName}</td><td class="mono">${r.dur} 分钟</td>
      <td class="mono ${r.red || r.score < r.pass ? 'wv' : 'gv'}">${r.red ? '0（否决）' : r.score}/${r.max}</td><td>${(r.errs || []).length ? (r.errs.length + ' 项') : '—'}</td><td><button class="btn sm" data-exreview="${r.id}">复盘</button></td></tr>`).join('')}</table>`;
}
/* 记录里某条错误落在哪个能力维度：按情境权重最大的维度 */
function errDimKey(r, e) {
  const ex = EXAMS.find(x => x.id === r.exam); const st = ex && ex.stations.find(x => x.id === e.sid);
  if (!st || !st.dims) return null;
  return Object.keys(st.dims).sort((a, b) => st.dims[b] - st.dims[a])[0];
}
/* 维度 → 陪练关卡内容 */
const DIM_EXAM = { '设备辨识与定位': 'rain', '状态核对与确认': 'e1163', '操作程序与票务规范': 'e1163', '安全措施与风险控制': 'e1163', '异常与应急处置': 'rain', '仪表读数与工器具使用': 'rain', '缺陷发现与设备评价': 'rain', '后台系统与信息应用': 'e1163' };

function drillDim(i) {
  const n = DIMS[i], k = DIMK[i];
  const L = examHist();
  const errs = L.flatMap(r => (r.errs || []).filter(e => errDimKey(r, e) === k).map(e => ({ e, r })));
  const low = L.filter(r => r.dims && r.dims[k] != null && r.dims[k] < 70);
  const ex = EXAMS.find(x => x.id === (DIM_EXAM[n] || 'e1163'));
  openDrill(`能力明细 · ${n}`, `本月 ${RADAR_NOW[i]} 分 · 上月 ${RADAR_PREV[i]} 分 · 班组均值 ${TEAM_AVG[i]} 分`, `
    <div class="sec"><div class="st">相关错误记录（近30天）</div><div class="sc">
      ${errs.length ? `<table class="htbl"><tr><th>时间</th><th>关卡 · 情境</th><th>错误</th><th>依据</th></tr>
        ${errs.map(({ e, r }) => `<tr><td class="mono">${stampOf(r.ts)}</td><td>${r.short} · ${e.title || ''}</td>
        <td><span class="tag ${e.kind === 'red' ? 'rl' : e.crit ? 'wn' : ''}">${ERR_KIND[e.kind] || e.kind}</span> ${e.text.replace(/<[^>]+>/g, '')}</td>
        <td class="mono">${(e.rule || '').slice(0, 24)}</td></tr>`).join('')}</table>` : '近30天该维度无错误记录。'}</div></div>
    <div class="sec"><div class="st">该维度低于 70 分的记录</div><div class="sc">${low.length ? examTable(low) : '近30天该维度各次均不低于 70 分。'}</div></div>`,
    `<button class="btn pri" data-exstart="${ex.id}">练「${ex.short}」</button><button class="btn" data-go="review">打开评分复盘</button>`);
}
function drillDay(d) {
  const list = examHist().filter(r => dayOf(r) === d);
  openDrill(`关卡明细 · ${dayLabel(d)}`, `${list.length} 次 · 合计 ${list.reduce((a, r) => a + r.dur, 0)} 分钟`, examTable(list),
    `<button class="btn" data-go="review">打开评分复盘</button>`);
}
function drillPlan(k) {
  const list = examHist().filter(r => `${r.short} · ${r.modeName.slice(0, 2)}` === k);
  openDrill(`关卡明细 · ${k}`, `近30天 ${list.length} 次`, examTable(list),
    `<button class="btn" data-go="review">打开评分复盘</button>`);
}
function drillWeek(w) {
  const list = examHist().filter(r => Math.min(4, Math.floor(dayOf(r) / 7)) === w && (r.errs || []).length);
  const errs = list.flatMap(r => r.errs.map(e => ({ e, r })));
  openDrill(`错误明细 · ${w === 0 ? '本周' : w + ' 周前'}`, `错误权重 ${homeAgg().weeks[w]} · 红线 ${homeAgg().reds[w]} 次`, `
    ${errs.length ? `<table class="htbl"><tr><th>时间</th><th>关卡</th><th>错误</th><th>依据</th></tr>
      ${errs.map(({ e, r }) => `<tr><td class="mono">${stampOf(r.ts)}</td><td>${r.short}</td>
      <td><span class="tag ${e.kind === 'red' ? 'rl' : e.crit ? 'wn' : ''}">${ERR_KIND[e.kind] || e.kind}</span> ${e.title ? e.title + '：' : ''}${e.text.replace(/<[^>]+>/g, '')}</td>
      <td class="mono">${(e.rule || '').slice(0, 24)}</td></tr>`).join('')}</table>` : '当周无错误记录。'}`,
    `<button class="btn" data-go="review">打开评分复盘</button>`);
}
function drillFit() {
  openDrill(`岗位胜任度构成 · ${FITNESS.post}`, `综合测算 ${FITNESS.pct}%`, `
    <table class="htbl"><tr><th>构成项</th><th>当前</th><th>要求</th><th>状态</th></tr>
      ${FITNESS.parts.map(p => `<tr><td>${p.n}</td><td class="mono">${p.v}</td><td class="mono">${p.need}</td>
        <td>${p.ok ? '<span class="tag ok">达标</span>' : '<span class="tag wn">待补齐</span>'}</td></tr>`).join('')}</table>
    <div class="sec" style="margin-top:12px"><div class="st">差距项</div><div class="sc">
      ${FITNESS.parts.filter(p => !p.ok).map(p => `<div class="hrow">· ${p.gap}</div>`).join('') || '无'}</div></div>
    <div class="tk3" style="margin-top:10px">胜任度为系统测算参考，任职资格评定以人工审核结果为准。</div>`,
    `<button class="btn" data-go="growth">查看成长档案</button><button class="btn pri" data-exstart="rain" data-exmode="exam">去考「雨淋阀机械手动启动」</button>`);
}

/* ---------------- 成长地图节点下钻 ---------------- */
function nodeClick(id) {
  if (id === 'g5') return drillDim(1);
  if (id === 'g6') return examStart('e1163', 'exam');
  if (id === 'g7') return certDrill(0);
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
  if (id === 'g3') { const l = examHist().filter(r => r.exam === 'e1163'); return openDrill('1163 开关与地刀检查', `近30天 ${l.length} 次`, examTable(l), `<button class="btn" data-go="review">打开评分复盘</button>`); }
  if (id === 'g4') { const l = examHist().filter(r => r.exam === 'rain'); return openDrill('雨淋阀机械手动启动', `近30天 ${l.length} 次`, examTable(l), `<button class="btn" data-go="review">打开评分复盘</button>`); }
  if (id === 'g8') return openDrill('作业授权 · 变电运行高级作业员', '当前差距项', `
    <table class="htbl"><tr><th>差距项</th><th>当前</th><th>要求</th></tr>
    ${FITNESS.parts.filter(p => !p.ok).map(p => `<tr><td>${p.n}</td><td class="mono">${p.v}</td><td class="mono">${p.need}</td></tr>`).join('')}</table>
    <div class="tk3" style="margin-top:10px">晋升资格以人工审核结果为准。</div>`,
    `<button class="btn" data-go="growth">查看成长档案</button><button class="btn pri" data-exstart="rain" data-exmode="exam">去考「雨淋阀机械手动启动」</button>`);
  if (id === 'b2') return goPage('exam');
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


/* ---------------- 讲师演示台（底座页面） ---------------- */
const IMPL_STATUS = [
  ['操作票自动判卷：步骤匹配、状态阶段、可换序组、特殊顺序、漏项、三档文字要求、危险操作，同一根本错误只计一次', '确定性规则 · 真实运行（规则取自《操作票结构化标注确认表》70 行业务确认）'],
  ['操作票错误解释的制度依据：文件名、条款编号、条文正文', '真实条款检索（安规及释义、电气操作导则）；检索不到返回「建议人工复核」，不编造'],
  ['操作票扣分值与危险操作规则清单', '扣分值为配置项（业务尚未最终确定，程序不写死）；危险规则已实现业务已确认的 4 条，完整清单待业务提供'],
  ['专家选聘答辩打分：硬性（关键词命中 / 合规红线 / 流程步骤）、软性（表达 / 共情 / 逻辑 / 情绪）、结果（任务达成 / 是否满意）', '确定性规则 · 真实运行；核心能力与招标竞聘分档取自《专家选聘面试答辩评价标准》'],
  ['三维能力地图：技能水平、通用能力、领导能力', '技能水平与通用能力由本机演练记录推导；领导能力本次仅展示，暂无实测数据'],
  ['通用能力 / 领导能力的层级行为指标', '照录《素质模型》宣传册原文'],
  ['多人员横向对比与场景聚合统计的同批次人员数据', '脱敏模拟 · 人物全部虚拟 · 入库待对接'],
  ['标准票的空气开关与压板编号', '按试卷「其他资料」同构给出本间隔编号，实际编号待业务确认'],
  ['陪练关卡：选择 / 填空 / 问答即时判定与回应，操作关步骤提示与做完打分、操作前置与红线、地刀三位置一致性、汇报要素', '规则 · 真实运行'],
  ['知识库召回：问教练、口述汇报追问', '本机检索 · 真实运行（非在线大模型）'],
  ['语音识别：口述、汇报、答题', '联网且经 http 打开时浏览器识别（真实）；本地文件打开或内网时为兜底识别（按当前应答内容打入，可改后再发）'],
  ['能力维度 8 维抽取（认证表 20 项 + 两项考试）', '预置结果 · 已审定 v1.0'],
  ['AI 复盘、针对性训练建议、提醒草稿', '规则模板生成（非在线大模型）'],
  ['数字人语音', '默认字幕 + 口型；浏览器合成语音朗读可在讲师演示台打开（预渲染片段到货后优先用片段）'],
  ['训练与考试记录保存', '浏览器本地存储：同一浏览器刷新保留；换浏览器或账号不保留 · 入库待对接'],
  ['学习平台、人资域（课程、题库、考试、人员主数据）', '文件导入 + 接口模拟 · 真实联调待对接'],
  ['教练目录中 16 位未开通教练', '目录（非可训练功能）'],
  ['图片 / 视频动作识别', '不在本轮范围']
];
function demoAct(k) {
  if (k.indexOf('tk_') === 0) {
    const kind = k.slice(3);
    TK.res = null; tkStart('exam', false);
    setTimeout(() => { TK.rows = tkAuto(kind).map(r => ({ t: r.t, child: !!r.parent })); tkPaint(); toast('已按' + ({ ok: '标准票', swap: '组内换序', order: '顺序错误', danger: '危险操作', text: '文字不规范' }[kind]) + '填入，点「提交判卷」看判卷结果', 'ok'); }, 260);
    $('#demo2').classList.remove('open'); return;
  }
  if (k === 'ep_run') {
    EP.res = null; epStart(false);
    const step = () => setTimeout(() => {
      const inp = $('#ep_in'); if (!inp) return;
      const q = EP.rounds[EP.i].q; inp.value = EXP_SAMPLE[q.k] || '';
      epSend();
      setTimeout(() => { const n = $('#ep_next'); if (n) { n.click(); step(); } }, 420);
    }, 520);
    step(); $('#demo2').classList.remove('open'); return;
  }
  if (k === 'main') {
    const ex = EXAMS.find(e => e.id === 'e1163');
    const t = { id: 't' + Date.now(), from: '班组长 ' + LEAD_USER.name, exam: 'e1163', examName: ex.n, coach: '题库考试', plan: ex.short, mode: '考核模式', due: dateAfter(3), pass: 6, who: HOME_USER.name, dims: ['状态核对与确认', '安全措施与风险控制'], done: 0, total: 1, results: [] };
    const list = lsGet(LS_TASKS, []); list.unshift(t); lsSet(LS_TASKS, list.slice(0, 12));
    ROLE.cur = 'student'; renderRole(); EX.arm.esCase = EX.arm.esCase || 'ok';
    examStart('e1163', 'exam', { task: t.id }); toast('已按演示主线下发考核任务并进入考试', 'ok'); return;
  }
  if (k === 'red') { if (!EX.exam) return toast('请先进入 1163 考试', 'bad'); const s = examStation(); if (s.id !== 'k2_hub') return toast('当前不在关卡二「验电与接地」', 'bad'); examAuto('red'); return; }
  if (k === 'run') { if (!EX.exam) return toast('请先开始一场考试', 'bad'); examRun(); return; }
  if (k === 'es') { const seq = [null, 'ok', 'mech', 'rod']; const i = (seq.indexOf(EX.arm.esCase || null) + 1) % seq.length; EX.arm.esCase = seq[i]; $('#dm_es').textContent = { null: '随机', ok: '正常到位', mech: '机构箱不一致', rod: '连杆未到位' }[String(seq[i])]; return; }
  if (k === 'voice') { voiceToggle(); toast(TTS.on ? '数字人朗读语音已打开' : '数字人朗读语音已关闭（只保留字幕与口型）'); return; }
  if (k === 'rain') { EX.arm.rainAbn = !EX.arm.rainAbn; $('#dm_rain').textContent = EX.arm.rainAbn ? '开（下次开始生效）' : '关'; return; }
  if (k === 'status') return openDrill('功能实现状态清单', '真实 / 规则模拟 / 预置 / 待对接', `<table class="htbl statlist"><tr><th>功能</th><th>实现状态</th></tr>${IMPL_STATUS.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</table>`);
  if (k === 'bound') return openDrill('系统边界表', '现有平台负责课程、题库、考试、人员主数据；本产品负责情境练习、过程纠错、复训与回写', boundaryHtml());
  if (k === 'clear') { Object.keys(localStorage).filter(x => x.startsWith('xwt_')).forEach(x => localStorage.removeItem(x)); toast('本机记录已清空'); route(); return; }
}
