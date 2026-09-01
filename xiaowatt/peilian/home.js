/* ===== 系统首页（工作台）· 路由 · AI 教练中心 · 背景动效 ===== */

let __arenaEntered = false, __planPre = null, __xwTyped = false;
const COACH_IMGS = __COACH_IMGS__;   // 构建时由 assets/coaches/<id>.png 内联
function goPage(h) { location.hash = '#' + h; }

/* ---------------- 路由 ---------------- */
function route() {
  let h = (location.hash || '').replace(/^#\/?/, '') || 'home';
  const toPlaza = h === 'plaza'; if (toPlaza) h = 'home';
  if (!['home', 'arena', 'review', 'growth', 'classroom'].includes(h)) h = 'home';
  $('#pg_arena').style.display = h === 'arena' ? '' : 'none';
  $('#pg_home').style.display = h === 'arena' ? 'none' : '';
  if (h === 'arena') {
    HomeFX.off();
    if (!__arenaEntered) { __arenaEntered = true; openEntry(__planPre); __planPre = null; }
  } else {
    const em = $('#en_mask'); if (em) { em.remove(); __arenaEntered = false; }
    renderHPage(h); HomeFX.on();
    if (toPlaza) setTimeout(() => { const p = $('#plaza'); if (p) p.scrollIntoView({ behavior: 'smooth' }); }, 80);
  }
  $$('#hnav .hnavi').forEach(a => a.classList.toggle('on', a.dataset.h === (toPlaza ? 'plaza' : h)));
}

function enterCoach(id, pre) {
  const c = COACHES.find(x => x.id === id);
  if (!c || !c.open) return toast('该教练在本单位尚未开通');
  __planPre = pre || null;
  if (location.hash === '#arena') { if (!__arenaEntered) { __arenaEntered = true; openEntry(__planPre); __planPre = null; } }
  else goPage('arena');
}

/* ---------------- 首页框架（boot 时一次性建立） ---------------- */
function homeBoot() {
  const hm = $('#pg_home');
  hm.innerHTML = `
  <canvas id="fxp"></canvas>
  <div class="hsil">${silhouetteSVG()}</div>
  <img class="bgph" id="bgph1" alt=""><img class="bgph bgph2" id="bgph2" alt="">
  <div class="hshell">
    <header class="hhead">
      <div class="brand"><img src="__LOGO__" alt="中国南方电网 深圳供电局有限公司"><div class="pill">小瓦特·练　AI智能陪练底座</div></div>
      <nav class="hnav" id="hnav">
        <span class="hnavi" data-h="home">工作台</span>
        <span class="hnavi" data-h="plaza">教练中心</span>
        <span class="hnavi" data-h="arena">陪练舱</span>
        <span class="hnavi" data-h="review">评分复盘</span>
        <span class="hnavi" data-h="growth">成长档案</span>
        <span class="hnavi" data-h="classroom">知识课堂</span>
        <span class="hnavi lk" data-lk="1">班组看板<i>管理</i></span>
        <span class="hnavi lk" data-lk="1">教练编辑器<i>管理</i></span>
      </nav>
      <div class="huser"><span id="hclock" class="hclk"></span>
        <span class="uchip"><i>${HOME_USER.name.slice(0, 1)}</i>${HOME_USER.name} · ${HOME_USER.team}</span></div>
    </header>
    <main id="hpage"></main>
  </div>
  <div id="htip" hidden></div>`;
  /* 南网实景照片到位后：为 #bgph1/#bgph2 填入 src 即自动显示（插槽） */
  $('#hnav').onclick = e => {
    const n = e.target.closest('.hnavi'); if (!n) return;
    if (n.dataset.lk) return toast('该模块需要班组长及以上权限（当前账号：学员）');
    goPage(n.dataset.h);
  };
  const clk = () => { const d = new Date(); $('#hclock').textContent = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  clk(); setInterval(clk, 20000);
  bindTip(); bindHPage();
  HomeFX.init();
}

/* ---------------- 页面渲染 ---------------- */
function renderHPage(h) {
  const pg = $('#hpage'); if (!pg) return;
  if (pg.dataset.cur === h && h !== 'home') return;      // 首页允许重渲染（提醒打字机守卫在内部）
  pg.dataset.cur = h;
  pg.innerHTML = h === 'home' ? pageHome() : h === 'review' ? pageReview() : h === 'growth' ? pageGrowth() : pageClassroom();
  if (h === 'home' && !__xwTyped) { __xwTyped = true; typeInto($('#xwtxt'), $('#xwtxt').dataset.full); }
}

function greet() { const h = new Date().getHours(); return h < 6 ? '夜深了' : h < 9 ? '早上好' : h < 12 ? '上午好' : h < 18 ? '下午好' : '晚上好'; }
function todayStr() { const d = new Date(); return `${d.getMonth() + 1}月${d.getDate()}日 ${'周' + '日一二三四五六'[d.getDay()]}`; }

/* ---------------- 首页 ---------------- */
function pageHome() {
  const A = homeAgg();
  const okDims = RADAR_NOW.filter(v => v >= 70).length;
  const xwFull = `近两场「设备状态核对」都使用了提示，短板集中在 GIS 四项位置指示；班组长下发的${HOME_TASK.name}${dateAfter(HOME_TASK.dueDays)}截止，建议先完成任务，再加练一轮「GIS 四项核对」专项。`;
  const last = SESSIONS[0];
  return `
  <section class="hero">
    <div class="hgreet">
      <h1>${greet()}，${HOME_USER.name}</h1>
      <div class="hsub">${HOME_USER.team} · ${HOME_USER.post} · 今天 ${todayStr()}</div>
      <div class="hkpis">
        <div class="kpi"><b>${A.cnt}</b><span>近30天场次</span></div>
        <div class="kpi"><b>${(A.totalMin / 60).toFixed(1)}h</b><span>累计时长</span></div>
        <div class="kpi"><b>${A.avg}</b><span>平均得分</span></div>
        <div class="kpi ${okDims < 6 ? 'warn' : 'good'}"><b>${okDims}/6</b><span>达标维度</span></div>
      </div>
    </div>
    <div class="taskcard">
      <div class="tk1">今日待练任务</div>
      <div class="tk2">${HOME_TASK.name}</div>
      <div class="tk3">${HOME_TASK.from} 下发 · ${dateAfter(HOME_TASK.dueDays)}截止 · 未完成</div>
      <button class="btn pri" data-train="${HOME_TASK.plan}">去完成</button>
    </div>
    <div class="hourcard">
      <div class="tk1">年度培训学时</div>
      <div class="hbar"><div class="hfill" style="width:${Math.round(HOME_USER.hours.done / HOME_USER.hours.need * 100)}%"></div></div>
      <div class="tk3"><b class="mono">${HOME_USER.hours.done}</b> / ${HOME_USER.hours.need} 学时 · 知识课堂回写</div>
      <button class="btn" data-go="classroom">学时明细</button>
    </div>
  </section>

  <section class="grid6">
    ${hcard('能力六维', '本月 vs 上月 · 顶点可查明细', chRadar(DIMS6, RADAR_NOW, RADAR_PREV))}
    ${hcard('练习时长与次数', '近30天 · 按日', chCombo(A.byDay))}
    ${hcard('练习方式分布', '近30天 · 按场次', chDonut(A.planCnt))}
    ${hcard('扣分与红线趋势', '近5周 · 周合计', chArea(A.weeks, A.reds))}
    ${hcard('能力对标', '我 vs 班组均值（组织级口径）', chHeat(DIMS6, RADAR_NOW, TEAM_AVG))}
    ${hcard('岗位胜任度', FITNESS.post + ' · 点击查看构成', chGauge(FITNESS))}
  </section>

  <section class="reco">
    ${RECO.map(r => { const c = COACHES.find(x => x.id === r.coach); return `
      <div class="rcard">
        <div class="rwhy"><i>AI 推荐</i>${r.why}</div>
        <b>${c.n}</b>
        <div class="tk3">${c.fam} · ${c.min} 分钟 · 已练 ${c.users} 人 · 平均提分 +${c.gain}</div>
        <button class="btn ${c.open ? 'pri' : ''}" data-reco="${r.coach}">${r.act}</button>
      </div>`; }).join('')}
    <div class="rcard lastr">
      <div class="rwhy"><i>最近复盘</i>${dayLabel(last.d)}</div>
      <b>${last.plan} · ${last.score} 分</b>
      <div class="tk3">${last.mode} · 用时 ${last.dur} 分钟 · 扣分 ${last.vio.length} 项</div>
      <div class="tk3">GIS 四项核对仍依赖提示，其余节拍完整。</div>
      <button class="btn" data-go="review">查看复盘</button>
    </div>
  </section>

  <section class="xwbar">
    <div class="xwavt"><i></i>小瓦特</div>
    <div class="xwtxt" id="xwtxt" data-full="${xwFull}">${__xwTyped ? xwFull : ''}</div>
    <div class="xwbtns">
      <button class="btn pri" data-train="full">去完成任务</button>
      <button class="btn" data-train="sp_gis">练 GIS 专项</button>
    </div>
    <div class="xwsrc">由近30天练习数据生成</div>
  </section>

  ${pagePlaza()}`;
}

function hcard(t, sub, body) {
  return `<div class="hcard"><div class="hch"><b>${t}</b><span>${sub}</span></div><div class="hcb">${body}</div></div>`;
}

/* ---------------- AI 教练中心 ---------------- */
const PF = { fam: '全部', dom: '全部', tag: '全部' };
const COACH_GLYPH = { '变电运行': '运', '变电检修': '检', '配网': '配', '调度': '调', '营销服务': '营', '安全监督': '安', '班组管理': '班' };
const COACH_GRAD = { '变电运行': ['#1e63b8', '#4d97e8'], '变电检修': ['#0e7a5f', '#2fd08a'], '配网': ['#8a5a14', '#e8b22a'], '调度': ['#5b3a9e', '#c3a8e8'], '营销服务': ['#9e3a5b', '#e88aa8'], '安全监督': ['#9e4a1e', '#ff8a3d'], '班组管理': ['#14648a', '#4dc3e8'] };

function pagePlaza() {
  const doms = ['全部', ...new Set(COACHES.filter(c => PF.fam === '全部' || c.fam === PF.fam).map(c => c.dom))];
  const tags = ['全部', ...new Set(COACHES.flatMap(c => c.tags))];
  const list = COACHES.filter(c =>
    (PF.fam === '全部' || c.fam === PF.fam) &&
    (PF.dom === '全部' || c.dom === PF.dom) &&
    (PF.tag === '全部' || c.tags.includes(PF.tag)));
  const chip = (f, v, cur) => `<span class="fchip ${v === cur ? 'on' : ''}" data-fchip="${f}" data-v="${v}">${v}</span>`;
  return `
  <section id="plaza" class="plaza">
    <div class="pzh"><b>AI 教练中心</b><span>${COACHES.length} 位预设教练 · 覆盖 ${COACH_FAMS.length} 个岗位族 · 本单位已开通 ${COACHES.filter(c => c.open).length} 位</span></div>
    <div class="pzf"><label>岗位族</label>${['全部', ...COACH_FAMS].map(v => chip('fam', v, PF.fam)).join('')}</div>
    <div class="pzf"><label>业务域</label>${doms.map(v => chip('dom', v, PF.dom)).join('')}</div>
    <div class="pzf"><label>能力项</label>${tags.map(v => chip('tag', v, PF.tag)).join('')}</div>
    <div class="pzgrid">
      ${list.map(c => {
        const g = COACH_GRAD[c.fam];
        return `<div class="ccard ${c.open ? 'openc' : 'lockc'}" data-coach="${c.id}">
        <div class="crow1">
          ${COACH_IMGS[c.id] ? `<img class="cav" src="${COACH_IMGS[c.id]}" alt="${c.n}">` : `<div class="cav" style="background:linear-gradient(135deg,${g[0]},${g[1]})">${COACH_GLYPH[c.fam]}</div>`}
          <div class="cmeta"><b>${c.n}</b><span>${c.fam} · ${c.dom}</span></div>
          ${c.open ? '<span class="copen">已开通</span>' : '<span class="clock">未开通</span>'}
        </div>
        <div class="cdesc">${c.desc}</div>
        <div class="ctags">${c.tags.map(t => `<i>${t}</i>`).join('')}</div>
        <div class="cstat"><span>难度 ${'●'.repeat(c.lvl)}${'○'.repeat(3 - c.lvl)}</span><span>${c.min} 分钟</span><span>已练 ${c.users} 人</span><span>平均提分 +${c.gain}</span></div>
        ${c.open ? `<button class="btn pri cgo" data-coach="${c.id}">开始练习</button>` : ''}
      </div>`; }).join('')}
      ${list.length ? '' : '<div class="pzempty">当前筛选条件下暂无教练</div>'}
    </div>
  </section>`;
}

function refreshPlaza() {
  const old = $('#plaza'); if (!old) return;
  const tmp = el('div', '', pagePlaza()); old.replaceWith(tmp.firstElementChild);
}

/* ---------------- 事件委托（首页与各薄页共用） ---------------- */
function bindHPage() {
  $('#hpage').onclick = e => {
    const q = s => e.target.closest(s); let n;
    if (n = q('[data-fchip]')) { PF[n.dataset.fchip] = n.dataset.v; if (n.dataset.fchip === 'fam') { PF.dom = '全部'; } refreshPlaza(); return; }
    if (n = q('.cgo')) return enterCoach(n.dataset.coach, null);
    if (n = q('[data-coach]')) { const c = COACHES.find(x => x.id === n.dataset.coach); return c && c.open ? enterCoach(c.id, null) : toast('该教练在本单位尚未开通'); }
    if (n = q('[data-reco]')) return recoAct(n.dataset.reco);
    if (n = q('[data-train]')) return enterCoach('daozha', n.dataset.train === 'full' ? null : n.dataset.train);
    if (n = q('[data-go]')) return goPage(n.dataset.go);
    if (n = q('[data-dim]')) return drillDim(+n.dataset.dim);
    if (n = q('[data-hdim]')) return drillDim(+n.dataset.hdim);
    if (n = q('[data-day]')) return drillDay(+n.dataset.day);
    if (n = q('[data-plan]')) return drillPlan(n.dataset.plan);
    if (n = q('[data-week]')) return drillWeek(+n.dataset.week);
    if (n = q('[data-gauge]')) return drillFit();
    if (n = q('[data-row]')) { const d = $('#rx' + n.dataset.row); if (d) d.hidden = !d.hidden; return; }
  };
}

function recoAct(id) {
  const r = RECO.find(x => x.coach === id), c = COACHES.find(x => x.id === id);
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
    if (n = q('[data-train]')) { m.remove(); return enterCoach('daozha', n.dataset.train === 'full' ? null : n.dataset.train); }
    if (n = q('[data-go]')) { m.remove(); return goPage(n.dataset.go); }
  };
  return m;
}
function sessTable(list) {
  return `<table class="htbl"><tr><th>日期</th><th>练习方式</th><th>模式</th><th>用时</th><th>得分</th><th>扣分项</th></tr>
    ${list.map(s => `<tr><td class="mono">${dayLabel(s.d)}</td><td>${s.plan}</td><td>${s.mode}</td><td class="mono">${s.dur} 分钟</td>
      <td class="mono ${s.score < 75 ? 'wv' : ''}">${s.score}</td><td>${s.vio.length ? s.vio.length + ' 项' : '—'}</td></tr>`).join('')}</table>`;
}
function vioDim(v) {
  const t = v.t;
  if (/核对|指示/.test(t)) return '设备状态核对';
  if (/复诵|唱票|双重名称/.test(t)) return '唱票复诵';
  if (/接令|术语|用语|汇报/.test(t)) return '调度术语';
  if (/验电|接地|规程|记录/.test(t)) return '规程记忆';
  if (/异常|中止/.test(t)) return '异常处置';
  return '风险辨识';
}
const DIM_PLAN = { '设备状态核对': ['sp_gis', 'GIS 四项核对'], '调度术语': ['sp_ord', '接令与票令核对'], '规程记忆': ['sp_vd', '验电接地'], '唱票复诵': ['sp_vd', '验电接地'] };

function drillDim(i) {
  const n = DIMS6[i];
  const hints = SESSIONS.filter(s => s.hints.some(h => h[0] === n));
  const vios = SESSIONS.flatMap(s => s.vio.filter(v => vioDim(v) === n).map(v => ({ ...v, d: s.d })));
  const sp = DIM_PLAN[n];
  openDrill(`能力明细 · ${n}`, `本月 ${RADAR_NOW[i]} 分 · 上月 ${RADAR_PREV[i]} 分 · 班组均值 ${TEAM_AVG[i]} 分`, `
    <div class="sec"><div class="st">相关扣分记录（近30天）</div><div class="sc">
      ${vios.length ? `<table class="htbl"><tr><th>日期</th><th>第几项</th><th>扣分内容</th><th>依据</th></tr>
        ${vios.map(v => `<tr><td class="mono">${dayLabel(v.d)}</td><td class="mono">第${v.step}项</td>
        <td><span class="tag ${v.lv === 'red' ? 'rl' : v.lv === 'major' ? 'wn' : ''}">${v.lv === 'red' ? '一票否决' : v.lv === 'major' ? '严重' : '不规范'}</span> ${v.t}</td>
        <td class="mono">${v.cite}</td></tr>`).join('')}</table>` : '近30天该维度无扣分记录。'}</div></div>
    <div class="sec"><div class="st">提示使用记录</div><div class="sc">
      ${hints.length ? hints.map(s => `<div class="hrow"><span class="mono">${dayLabel(s.d)}</span> ${s.plan} · ${s.hints.filter(h => h[0] === n).map(h => h[1]).join('、')}</div>`).join('') : '近30天该维度未使用提示。'}</div></div>`,
    `${sp ? `<button class="btn pri" data-train="${sp[0]}">练「${sp[1]}」专项</button>` : ''}<button class="btn" data-go="review">打开评分复盘</button>`);
}
function drillDay(d) {
  const list = SESSIONS.filter(s => s.d === d);
  openDrill(`练习明细 · ${dayLabel(d)}`, `${list.length} 场 · 合计 ${list.reduce((a, s) => a + s.dur, 0)} 分钟`, sessTable(list),
    `<button class="btn" data-go="review">打开评分复盘</button>`);
}
function drillPlan(k) {
  const match = s => (k === '专项练习' && s.plan.startsWith('专项')) || (k === '分段练习' && s.plan.startsWith('分段')) || (k === '完整操作票' && s.plan.startsWith('完整')) || (k === '错题重练' && s.plan.startsWith('错题'));
  const list = SESSIONS.filter(match);
  openDrill(`练习方式明细 · ${k}`, `近30天 ${list.length} 场`, sessTable(list),
    `<button class="btn" data-go="review">打开评分复盘</button>`);
}
function drillWeek(w) {
  const list = SESSIONS.filter(s => Math.min(4, Math.floor(s.d / 7)) === w && s.vio.length);
  const vios = list.flatMap(s => s.vio.map(v => ({ ...v, d: s.d, plan: s.plan })));
  openDrill(`扣分明细 · ${w === 0 ? '本周' : w + ' 周前'}`, `扣分 ${homeAgg().weeks[w]} · 红线 ${homeAgg().reds[w]} 次`, `
    ${vios.length ? `<table class="htbl"><tr><th>日期</th><th>场次</th><th>扣分内容</th><th>依据</th></tr>
      ${vios.map(v => `<tr><td class="mono">${dayLabel(v.d)}</td><td>${v.plan}</td>
      <td><span class="tag ${v.lv === 'red' ? 'rl' : v.lv === 'major' ? 'wn' : ''}">${v.lv === 'red' ? '一票否决' : v.lv === 'major' ? '严重' : '不规范'}</span> 第${v.step}项 ${v.t}</td>
      <td class="mono">${v.cite}</td></tr>`).join('')}</table>` : '当周无扣分记录。'}`,
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
    `<button class="btn" data-go="growth">查看成长档案</button><button class="btn pri" data-train="full">去完成演练场次</button>`);
}

/* ---------------- 评分复盘（记录列表） ---------------- */
function estDims(s) {
  const A = homeAgg();
  return RADAR_NOW.map((v, i) => Math.max(30, Math.min(100, Math.round(v + (s.score - A.avg) * .7 + ((s.d * 7 + i * 13) % 7) - 3))));
}
const PLAN2ID = [['完整', 'full'], ['分段 · 运行', 'p1'], ['分段 · 热备用', 'p2'], ['分段 · 冷备用', 'p3'], ['专项 · GIS', 'sp_gis'], ['专项 · 验电', 'sp_vd'], ['专项 · 接令', 'sp_ord'], ['错题', 'wrong']];
function planId(name) { const hit = PLAN2ID.find(([p]) => name.startsWith(p)); return hit ? hit[1] : 'full'; }

function pageReview() {
  const A = homeAgg();
  return `<div class="ppage">
    <div class="ph"><b>评分复盘</b><span>近30天 ${A.cnt} 场 · 平均 ${A.avg} 分 · 记录由陪练舱自动留痕</span></div>
    <table class="htbl big">
      <tr><th>日期</th><th>练习方式</th><th>模式</th><th>用时</th><th>得分</th><th>扣分</th><th>红线</th><th></th></tr>
      ${SESSIONS.map((s, i) => `
      <tr class="rrow" data-row="${i}"><td class="mono">${dayLabel(s.d)}</td><td>${s.plan}</td><td>${s.mode}</td>
        <td class="mono">${s.dur} 分钟</td><td class="mono ${s.score < 75 ? 'wv' : 'gv'}">${s.score}</td>
        <td class="mono">${s.vio.length || '—'}</td><td>${s.vio.some(v => v.lv === 'red') ? '<span class="tag rl">1</span>' : '—'}</td><td class="exp">▾</td></tr>
      <tr hidden id="rx${i}"><td colspan="8" class="rxcell">
        <div class="rxwrap">
          <div>${miniBars(estDims(s))}</div>
          <div>
            <div class="st">扣分与提示</div>
            ${s.vio.map(v => `<div class="hrow"><span class="tag ${v.lv === 'red' ? 'rl' : v.lv === 'major' ? 'wn' : ''}">${v.lv === 'red' ? '一票否决' : v.lv === 'major' ? '严重' : '不规范'}</span> 第${v.step}项 ${v.t}<span class="mono cite">${v.cite}</span></div>`).join('') || '<div class="hrow">本场无扣分。</div>'}
            ${s.hints.map(h => `<div class="hrow hint">提示 · ${h[0]} · ${h[1]}</div>`).join('')}
            <button class="btn" data-train="${planId(s.plan)}" style="margin-top:10px">重练该方式</button>
          </div>
        </div></td></tr>`).join('')}
    </table></div>`;
}

/* ---------------- 成长档案 ---------------- */
function pageGrowth() {
  return `<div class="ppage">
    <div class="ph"><b>成长档案</b><span>${HOME_USER.name} · ${HOME_USER.post}</span></div>
    <div class="gtwo">
      <div class="hcard"><div class="hch"><b>能力演进</b><span>本月 vs 上月</span></div><div class="hcb">${chRadar(DIMS6, RADAR_NOW, RADAR_PREV)}</div></div>
      <div class="hcard"><div class="hch"><b>三期对照</b><span>逐维度</span></div><div class="hcb">
        <table class="htbl"><tr><th>维度</th><th>前月</th><th>上月</th><th>本月</th><th>变化</th></tr>
        ${DIMS6.map((n, i) => `<tr><td>${n}</td><td class="mono">${RADAR_OLD[i]}</td><td class="mono">${RADAR_PREV[i]}</td>
          <td class="mono">${RADAR_NOW[i]}</td><td class="mono ${RADAR_NOW[i] >= RADAR_PREV[i] ? 'gv' : 'wv'}">${RADAR_NOW[i] - RADAR_PREV[i] >= 0 ? '+' : ''}${RADAR_NOW[i] - RADAR_PREV[i]}</td></tr>`).join('')}</table>
      </div></div>
    </div>
    <div class="hcard"><div class="hch"><b>学时记录</b><span>年度 ${HOME_USER.hours.done}/${HOME_USER.hours.need} 学时</span></div><div class="hcb">
      <table class="htbl"><tr><th>日期</th><th>内容</th><th>学时</th><th>来源</th></tr>
      ${HOUR_LOG.map(x => `<tr><td class="mono">${dayLabel(x.d)}</td><td>${x.n}</td><td class="mono">${x.h}</td><td>${x.src}</td></tr>`).join('')}</table></div></div>
    <div class="hcard"><div class="hch"><b>资质证书</b><span>${HOME_USER.certs.length} 项</span></div><div class="hcb">
      <table class="htbl"><tr><th>证书</th><th>取得日期</th><th>复审期限</th><th>状态</th></tr>
      ${HOME_USER.certs.map(c => `<tr><td>${c.n}</td><td class="mono">${c.got}</td><td class="mono">${c.review}</td>
        <td><span class="tag ok">有效</span></td></tr>`).join('')}</table></div></div>
    <div class="tk3" style="margin:14px 4px">能力与胜任度数据为系统测算参考，任职资格评定以人工审核结果为准。</div>
  </div>`;
}

/* ---------------- 知识课堂 ---------------- */
function pageClassroom() {
  return `<div class="ppage">
    <div class="ph"><b>知识课堂</b><span>南网人工智能知识课堂 · 数据同步正常</span></div>
    <div class="syncline">
      <span class="sy ok">课程库 已同步</span><span class="sy ok">题库 已同步</span>
      <span class="sy ok">学时回写 已同步</span><span class="sy ok">学员画像 已同步</span>
      <span class="mono" style="color:#5f7794">上次同步 今日 07:30</span></div>
    <div class="hcard"><div class="hch"><b>推荐课程</b><span>按能力短板匹配</span></div><div class="hcb">
      <table class="htbl"><tr><th>课程</th><th>学时</th><th>关联能力项</th></tr>
      ${COURSES.map(c => `<tr><td>${c.n}</td><td class="mono">${c.h}</td><td><i class="ctag">${c.tag}</i></td></tr>`).join('')}</table></div></div>
    <div class="hcard"><div class="hch"><b>学时回写记录</b><span>近30天</span></div><div class="hcb">
      <table class="htbl"><tr><th>日期</th><th>内容</th><th>学时</th><th>来源</th></tr>
      ${HOUR_LOG.map(x => `<tr><td class="mono">${dayLabel(x.d)}</td><td>${x.n}</td><td class="mono">${x.h}</td><td>${x.src}</td></tr>`).join('')}</table></div></div>
  </div>`;
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
      ctx.fillStyle = 'rgba(14,143,90,.38)'; ctx.fill();
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
