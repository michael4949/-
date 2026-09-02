/* ================= 教学引导层 ================= */

const MODES = {
  teach: { n: '教学模式', d: '每一步给出指令与标准话术，出错先提醒不判违规' },
  drill: { n: '演练模式', d: '只给方向不给答案，出错照常判定' },
  exam: { n: '考核模式', d: '无提示，全程计分' }
};

/* ---------- 任务指令条：把当前该做的事拆成可勾选的步骤 ---------- */
function guideSteps() {
  const st = STEP();
  if (!st) return [];
  const atLoc = S.loc === st.loc;
  const g = [];
  if (st.act === 'recv') {
    g.push({ t: `前往 ${LOC[st.loc].name}`, ok: atLoc });
    g.push({ t: '填写发令单位与发令人', ok: !!(S.ord.unit && S.ord.from) });
    g.push({ t: '复诵调度下令并核对票令一致', ok: S.beat > 1 });
  } else if (st.act === 'report') {
    g.push({ t: `前往 ${LOC[st.loc].name}`, ok: atLoc });
    g.push({ t: '向调度汇报本段完成情况', ok: S.beat > 1 });
  } else {
    g.push({ t: `前往 ${LOC[st.loc].name}`, ok: atLoc });
    g.push({ t: `手指「${devName(st.target)}」`, ok: !!S.sel });
    g.push({ t: '完整复诵票面内容', ok: S.beat > 2 });
    if (st.act === 'gis') {
      const n = ['hui', 'mech', 'arm', 'line'].filter(k => S.gis[k]).length;
      g.push({ t: `执行并核对四项位置指示（${n}/4）`, ok: S.beat > 3 && n >= 4 });
    } else {
      g.push({ t: '监护人发令后执行', ok: S.beat > 3 });
    }
    g.push({ t: '检查设备状态并回报', ok: S.beat > 4 });
  }
  return g;
}

/* ---------- 当前指令：任意时刻回答「做什么 + 怎么做」 ---------- */
const AICON = {
  listen: '<svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M3 12v-2a7 7 0 0 1 14 0v2"/><rect x="2" y="11.5" width="4" height="6" rx="1.6"/><rect x="14" y="11.5" width="4" height="6" rx="1.6"/></svg>',
  speak: '<svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><rect x="7" y="2.5" width="6" height="10" rx="3"/><path d="M4.5 10a5.5 5.5 0 0 0 11 0M10 15.5v2.4"/></svg>',
  point: '<svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M8 9V3.6a1.4 1.4 0 0 1 2.8 0V9m0-1.2a1.3 1.3 0 0 1 2.6 0V9m0 .3a1.25 1.25 0 0 1 2.5 0V12a5.4 5.4 0 0 1-5.4 5.4H9.7A5 5 0 0 1 5.6 15L3.8 12.4a1.3 1.3 0 0 1 2-1.6L8 12.4"/></svg>',
  walk: '<svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="3.4" r="1.6"/><path d="M8.2 18l1.6-4.6L8 11.2l.9-4.4 2.6-.8 2 2.3 2.3.9M8.9 6.8 6.4 8.5 5.6 11m6.1 1.7 1 1.8 1.9 3.5"/></svg>',
  act: '<svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M11.5 2 4.5 11.5h4L8 18l7.5-9.5h-4z"/></svg>',
  check: '<svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 10.5 8 15 16.5 5.5"/></svg>'
};
/* ---------- 动作示意图：每一步示范"该做的动作" ---------- */
const GPIC = {
  tick: `<svg viewBox="0 0 96 72"><rect x="14" y="14" width="52" height="44" rx="6" fill="#ffffff" stroke="#c6cdb9" stroke-width="2"/>
    <rect x="22" y="24" width="14" height="14" rx="3" fill="var(--acbg)" stroke="var(--ac)" stroke-width="2"/>
    <path d="M25 31 l4 4.5 6-8" fill="none" stroke="var(--ac)" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="18" stroke-dashoffset="18">
      <animate attributeName="stroke-dashoffset" values="18;0;0;18" keyTimes="0;.3;.8;1" dur="2.2s" repeatCount="indefinite"/></path>
    <line x1="42" y1="28" x2="60" y2="28" stroke="#d5d9c6" stroke-width="3" stroke-linecap="round"/><line x1="42" y1="36" x2="56" y2="36" stroke="#e2e5d6" stroke-width="3" stroke-linecap="round"/>
    <circle cx="30" cy="32" r="9" fill="none" stroke="#c9a227" stroke-width="2" opacity="0"><animate attributeName="opacity" values="0;.8;0" dur="2.2s" repeatCount="indefinite"/><animate attributeName="r" values="6;13" dur="2.2s" repeatCount="indefinite"/></circle>
    <path d="M64 46 l-9 -9 v12 l3 -2 2 5 3 -1 -2 -5 z" fill="#33443a"><animateTransform attributeName="transform" type="translate" values="8 8;0 0;0 0;8 8" keyTimes="0;.25;.8;1" dur="2.2s" repeatCount="indefinite"/></path></svg>`,
  press: `<svg viewBox="0 0 96 72"><rect x="16" y="22" width="34" height="30" rx="5" fill="#ffffff" stroke="#c6cdb9" stroke-width="2"/>
    <circle cx="33" cy="37" r="7" fill="var(--acbg)" stroke="var(--ac)" stroke-width="2"/>
    <circle cx="33" cy="37" r="13" fill="none" stroke="#c9a227" stroke-width="3" stroke-linecap="round" stroke-dasharray="62" stroke-dashoffset="62" transform="rotate(-90 33 37)">
      <animate attributeName="stroke-dashoffset" values="62;0;0;62" keyTimes="0;.55;.85;1" dur="2s" repeatCount="indefinite"/></circle>
    <path d="M62 52 c-3 -6 -4 -12 -1 -14 2.4 -1.6 5 0 6 4 l2 6 c4 -1.4 12 -1 13 4 1 6 -3 12 -10 13 -6 1 -9 -3 -10 -13 z" fill="#e8c8a8" stroke="#b98d5e" stroke-width="1.6">
      <animateTransform attributeName="transform" type="translate" values="0 6;0 0;0 0;0 6" keyTimes="0;.2;.85;1" dur="2s" repeatCount="indefinite"/></path>
    <text x="48" y="66" text-anchor="middle" font-size="9.5" fill="#a8821b">按住不放</text></svg>`,
  point: `<svg viewBox="0 0 96 72"><rect x="14" y="20" width="34" height="32" rx="5" fill="#ffffff" stroke="#c6cdb9" stroke-width="2"/>
    <circle cx="31" cy="36" r="7" fill="var(--acbg)" stroke="var(--ac)" stroke-width="2"/>
    <path d="M60 50 c-3 -6 -4 -12 -1 -14 2.4 -1.6 5 0 6 4 l2 6 c4 -1.4 12 -1 13 4 1 6 -3 12 -10 13 -6 1 -9 -3 -10 -13 z" fill="#e8c8a8" stroke="#b98d5e" stroke-width="1.6">
      <animateTransform attributeName="transform" type="translate" values="6 6;0 0;6 6" dur="1.6s" repeatCount="indefinite"/></path>
    <g stroke="var(--ac)" stroke-width="2" fill="none" stroke-linecap="round">
      <path d="M44 26 a10 10 0 0 1 6 -5"><animate attributeName="opacity" values="0;1;0" dur="1.6s" repeatCount="indefinite"/></path>
      <path d="M48 32 a16 16 0 0 1 9 -8"><animate attributeName="opacity" values="0;1;0" begin=".3s" dur="1.6s" repeatCount="indefinite"/></path></g></svg>`,
  speak: `<svg viewBox="0 0 96 72"><rect x="40" y="14" width="16" height="26" rx="8" fill="#ffffff" stroke="var(--ac)" stroke-width="2.4"/>
    <path d="M32 36 a16 16 0 0 0 32 0 M48 52 v8 M40 60 h16" fill="none" stroke="#33443a" stroke-width="2.4" stroke-linecap="round"/>
    <g stroke="#c9a227" stroke-width="2.4" fill="none" stroke-linecap="round">
      <path d="M66 22 a8 8 0 0 1 0 12"><animate attributeName="opacity" values="0;1;0" dur="1.5s" repeatCount="indefinite"/></path>
      <path d="M72 18 a14 14 0 0 1 0 20"><animate attributeName="opacity" values="0;1;0" begin=".25s" dur="1.5s" repeatCount="indefinite"/></path>
      <path d="M30 22 a8 8 0 0 0 0 12"><animate attributeName="opacity" values="0;1;0" dur="1.5s" repeatCount="indefinite"/></path></g></svg>`,
  listen: `<svg viewBox="0 0 96 72"><path d="M30 44 v-6 a18 18 0 0 1 36 0 v6" fill="none" stroke="#33443a" stroke-width="2.6" stroke-linecap="round"/>
    <rect x="24" y="42" width="10" height="16" rx="4" fill="var(--ac)"/><rect x="62" y="42" width="10" height="16" rx="4" fill="var(--ac)"/>
    <g stroke="#c9a227" stroke-width="2.2" fill="none" stroke-linecap="round">
      <path d="M44 30 a6 6 0 0 1 8 0"><animate attributeName="opacity" values="0;1;0" dur="1.4s" repeatCount="indefinite"/></path>
      <path d="M41 25 a11 11 0 0 1 14 0"><animate attributeName="opacity" values="0;1;0" begin=".25s" dur="1.4s" repeatCount="indefinite"/></path></g></svg>`,
  walk: `<svg viewBox="0 0 96 72"><rect x="64" y="18" width="20" height="36" rx="3" fill="#ffffff" stroke="#c6cdb9" stroke-width="2"/><rect x="70" y="24" width="8" height="18" rx="2" fill="#e4f2e9" stroke="var(--ac)" stroke-width="1.6"/>
    <path d="M14 40 h38" stroke="var(--ac)" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="5 7"><animate attributeName="stroke-dashoffset" values="0;-12" dur=".9s" repeatCount="indefinite"/></path>
    <path d="M52 40 l-7 -5 v10 z" fill="var(--ac)"/>
    <g fill="#c9a227"><ellipse cx="24" cy="52" rx="4" ry="2.4"><animate attributeName="opacity" values="1;.2;1" dur="1.2s" repeatCount="indefinite"/></ellipse>
    <ellipse cx="36" cy="58" rx="4" ry="2.4"><animate attributeName="opacity" values=".2;1;.2" dur="1.2s" repeatCount="indefinite"/></ellipse></g></svg>`,
  act: `<svg viewBox="0 0 96 72"><rect x="26" y="16" width="44" height="40" rx="6" fill="#ffffff" stroke="#c6cdb9" stroke-width="2"/>
    <circle cx="48" cy="36" r="12" fill="#f4f5ec" stroke="#98a69c" stroke-width="2"/>
    <line x1="48" y1="36" x2="48" y2="25" stroke="var(--ac)" stroke-width="3.4" stroke-linecap="round">
      <animateTransform attributeName="transform" type="rotate" values="0 48 36;90 48 36;90 48 36;0 48 36" keyTimes="0;.4;.8;1" dur="2.4s" repeatCount="indefinite"/></line>
    <circle cx="48" cy="36" r="3" fill="#33443a"/>
    <text x="48" y="66" text-anchor="middle" font-size="9.5" fill="var(--acd)">分 → 合</text></svg>`,
  report: `<svg viewBox="0 0 96 72"><rect x="14" y="18" width="36" height="30" rx="4" fill="#ffffff" stroke="#c6cdb9" stroke-width="2"/>
    <line x1="20" y1="27" x2="44" y2="27" stroke="#d5d9c6" stroke-width="3" stroke-linecap="round"/><line x1="20" y1="35" x2="38" y2="35" stroke="#e2e5d6" stroke-width="3" stroke-linecap="round"/>
    <circle cx="46" cy="42" r="9" fill="none" stroke="var(--ac)" stroke-width="2.6"/><line x1="53" y1="49" x2="60" y2="56" stroke="var(--ac)" stroke-width="2.6" stroke-linecap="round">
      <animateTransform attributeName="transform" type="translate" values="0 0;3 3;0 0" dur="1.6s" repeatCount="indefinite"/></line>
    <g stroke="#c9a227" stroke-width="2.2" fill="none" stroke-linecap="round">
      <path d="M70 30 a8 8 0 0 1 0 12"><animate attributeName="opacity" values="0;1;0" dur="1.5s" repeatCount="indefinite"/></path></g></svg>`
};
function applyGuideTarget(sel) {
  $$('.gtar').forEach(n => n.classList.remove('gtar'));
  if (!sel) return;
  const n = $(sel); if (n) n.classList.add('gtar');
}

function instrNow() {
  const st = STEP();
  if (S.stage === 'prep') {
    const ai = S.prep.audit.findIndex(x => !x);
    if (ai >= 0) return { i: 'check', pic: 'tick', t: `三审：点击勾选「${AUDIT[ai]}」`, h: `三审第 ${ai + 1}/3 项`, sel: `.chk[data-p="audit"][data-i="${ai}"]`, n: `先做操作票三审，点「${AUDIT[ai]}」打勾` };
    const di = S.prep.dress.findIndex(x => !x);
    if (di >= 0) return { i: 'check', pic: 'tick', t: `着装互检：点击勾选「${DRESS[di]}」`, h: `互检第 ${di + 1}/3 项`, sel: `.chk[data-p="dress"][data-i="${di}"]`, n: `着装互检，点「${DRESS[di]}」打勾` };
    if (!S.prep.mind) return { i: 'speak', pic: 'speak', t: '点击「操作人应答：精神状态良好」', h: '监护人问询，操作人应答', sel: '.chk[data-p="mind"]', n: '回应我的问询，点「精神状态良好」' };
    const ri = S.prep.risks.findIndex(x => !x);
    if (ri >= 0) return { i: 'check', pic: 'tick', t: `风险分析：点击第 ${ri + 1} 条「${RISKS[ri][0]}」展开确认`, h: `已确认 ${S.prep.risks.filter(Boolean).length}/12 条`, sel: `.rk[data-r="${ri}"]`, n: `风险要逐条确认，现在点第 ${ri + 1} 条` };
    return { i: 'act', pic: 'tick', t: '点击「准备完毕，进入五防模拟」', h: '准备项已全部确认', sel: '#p_go', n: '准备项都确认了，点「准备完毕，进入五防模拟」' };
  }
  if (S.stage === 'wufang') {
    if (S.wf < 4) return { i: 'act', pic: 'tick', t: `五防模拟第 ${S.wf + 1}/4 步：点击「${WUFANG[S.wf][1]}」`, h: '按操作票顺序逐项模拟', sel: `.wfs[data-wf="${S.wf}"]`, n: `五防模拟按顺序来，现在点第 ${S.wf + 1} 步「${WUFANG[S.wf][1]}」` };
    return { i: 'listen', pic: 'listen', t: '五防模拟完毕，听监护人核对', h: '' };
  }
  if (S.stage !== 'run' || !st || S.ended) return null;
  const teach = S.mode === 'teach';
  const away = st.loc !== S.loc;
  if (S.beat === 0) return { i: 'listen', pic: 'listen', t: '听监护人唱票', h: '唱票完成后进入手指口述', n: '注意听我唱票，准备手指口述' };
  if (S.beat === 1) {
    if (st.act === 'recv') return { i: 'speak', pic: 'speak', sel: '#rin', t: '填写发令单位与发令人，复诵调度下令', h: '复诵后点「复诵」或回车', n: '先填发令单位与发令人，再复诵调度下令，核对票令是否一致' };
    if (st.act === 'report') return { i: 'speak', pic: 'speak', sel: '#rin', t: '向调度汇报本段完成情况', h: '回报后点「回报」', n: '向调度汇报本段完成情况' };
    if (away) return { i: 'walk', pic: 'walk', t: `前往${LOC[st.loc].name}`, h: '点「前往」或位置栏闪烁按钮', go: st.loc, n: `先到${LOC[st.loc].name}去` };
    if (!S.sel) return { i: 'point', pic: teach ? 'point' : 'press', sel: `#panelwrap [data-dev="${st.target}"]`, t: `手指「${devName(st.target)}」并口述`, h: teach ? '点击设备完成手指口述' : '长按设备完成手指口述', n: `手指${devName(st.target)}，核对设备双重名称` };
    return { i: 'speak', pic: 'speak', sel: '#rin', t: '完整复诵票面内容', h: '复诵后点「复诵」或回车', n: '完整复诵票面内容' };
  }
  if (S.beat === 2) return { i: 'listen', pic: 'listen', t: '等待监护人核对发令', h: '听到「对，执行」后再操作', n: '等我核对发令后再操作' };
  if (S.beat === 3) {
    if (st.act === 'gis') return { i: 'act', pic: teach ? 'act' : 'press', sel: st.target ? `#panelwrap [data-dev="${st.target}"]` : null, t: '执行操作并核对四项位置指示', h: teach ? '点击执行，逐项核对' : '长按执行，逐项核对', n: '执行后把四项位置指示逐项核对到位' };
    return { i: 'act', pic: teach ? 'act' : 'press', sel: st.target ? `#panelwrap [data-dev="${st.target}"]` : null, t: st.target ? `执行操作：${devName(st.target)}` : '按监护人发令执行操作', h: teach ? '点击设备执行' : '长按设备执行', n: '执行操作' };
  }
  if (S.beat === 4) return { i: 'speak', pic: 'report', sel: '#rin', t: '检查设备状态并回报', h: '回报后点「回报」', n: '检查设备状态，向我回报' };
  return { i: 'check', t: '本项完成，监护人标"√"', h: '' };
}

function renderTaskbar() {
  const st = STEP();
  const bar = $('#taskbar');
  if (!bar) return;
  if (S.stage !== 'run' || !st) {
    const ins0 = instrNow();
    const html0 = `<div class="tb1"><span class="tbno">${S.stage === 'prep' ? '准备' : S.stage === 'wufang' ? '五防' : '—'}</span>
      <span class="tbtx">${S.stage === 'prep' ? '上岗前准备 · 三审 / 着装互检 / 风险分析' :
        S.stage === 'wufang' ? '五防模拟预演 · 按操作票顺序逐项模拟' : '本次陪练已结束'}</span>
      ${modeBtn()}</div>
      ${ins0 ? `<div class="tbfoc">
        <span class="tbpic">${GPIC[ins0.pic] || GPIC.tick}</span>
        <div class="tbnow"><b>${ins0.t}</b>${ins0.h ? `<span>${ins0.h}</span>` : ''}</div>
      </div>` : ''}`;
    if (bar.__last !== html0) { bar.__last = html0; bar.innerHTML = html0; bindMode(); }
    applyGuideTarget(ins0 && ins0.sel);
    return;
  }
  const g = guideSteps();
  const cur = g.findIndex(x => !x.ok);
  const ins = instrNow();
  const lv = S.hintLv[st.no] || 0;
  const html = `
    <div class="tb1">
      <span class="tbno">第 ${st.no} 项</span>
      <span class="tbtx">${st.ticket}</span>
      ${modeBtn()}
    </div>
    ${ins ? `<div class="tbfoc">
      <span class="tbpic">${GPIC[ins.pic] || GPIC[ins.i] || GPIC.tick}</span>
      <div class="tbnow"><b>${ins.t}</b>${ins.h ? `<span>${ins.h}</span>` : ''}</div>
      ${ins.go ? `<button class="tbgo" id="tb_go">前往 ${LOC[ins.go].name} →</button>` : ''}
      <button class="tbhint" id="btn_hint">我该做什么<i>提示 ${lv}/3</i></button>
    </div>` : ''}
    <div class="tb2">
      ${g.map((x, i) => `<span class="gs ${x.ok ? 'ok' : (i === cur ? 'now' : '')}">
        <i>${x.ok ? '✓' : i + 1}</i>${x.t}</span>`).join('<b class="ar">›</b>')}
      <span class="tbsp"></span>
      <button class="hintbtn" id="btn_know">知识地图</button>
    </div>`;
  if (bar.__last !== html) {
    bar.__last = html; bar.innerHTML = html;
    bindMode();
    const tg = $('#tb_go'); if (tg) tg.onclick = () => goLoc(ins.go);
    $('#btn_hint').onclick = useHint;
    $('#btn_know').onclick = () => openKnow();
  }
  applyGuideTarget(ins && !ins.go ? ins.sel : null);
}

function modeBtn() {
  return `<span class="modesw">${Object.keys(MODES).map(k =>
    `<button data-mode="${k}" class="${S.mode === k ? 'on' : ''}" title="${MODES[k].d}">${MODES[k].n}</button>`).join('')}</span>`;
}
function bindMode() {
  $$('.modesw button').forEach(b => b.onclick = () => {
    S.mode = b.dataset.mode;
    toast(MODES[S.mode].n + '：' + MODES[S.mode].d, '');
    renderTaskbar(); renderKP(); updateActbar();
  });
}

/* ---------- 知识点卡 ---------- */
function renderKP() {
  const box = $('#kpbox');
  if (!box) return;
  const st = STEP();
  if (S.stage !== 'run' || !st || S.mode === 'exam') { box.innerHTML = ''; box.style.display = 'none'; return; }
  box.style.display = '';
  const kp = (typeof STEPKP !== 'undefined' && STEPKP[st.no]) || { k: [], pts: [], errs: [] };
  const topics = kp.k.map(id => KNOW.find(x => x.id === id)).filter(Boolean);
  // 只有当本项引入了尚未讲过的主题时才自动展开，避免反复占位
  const fresh = kp.k.filter(id => !S.kpSeen[id]);
  if (S.kpAuto !== st.no) {
    S.kpAuto = st.no;
    S.kpOpen = S.mode === 'teach' && fresh.length > 0;
    kp.k.forEach(id => S.kpSeen[id] = true);
  }
  const open = !!S.kpOpen;
  box.innerHTML = `
    <div class="kp ${open ? 'open' : ''}">
      <div class="kph" id="kph">
        <span class="tag2">知识点</span>
        <b>${topics.map(t => t.t).join(' · ') || '本项要点'}</b>
        <span class="kpsp"></span>
        ${fresh.length ? '<span class="kpnew">新知识点</span>' : ''}
        <span class="kpfold">${open ? '收起' : '展开'}</span>
      </div>
      <div class="kpb">
        <div class="kprow">
          <div class="kpc">
            <div class="kpt">这一项要做什么</div>
            <ul>${kp.pts.map(p => `<li>${p}</li>`).join('')}</ul>
          </div>
          <div class="kpc">
            <div class="kpt warn">常见错误</div>
            <ul class="err">${kp.errs.map(p => `<li>${p}</li>`).join('')}</ul>
          </div>
        </div>
        <div class="kpc">
          <div class="kpt">为什么这样做</div>
          <p>${st.why}</p>
        </div>
        <div class="kpc">
          <div class="kpt">依据条款</div>
          <p class="rule">${st.rule}</p>
        </div>
        ${S.mode === 'teach' && st.recite ? `
        <div class="kpc say">
          <div class="kpt">标准话术</div>
          <p class="stdsay">${st.recite}</p>
          <button class="btn" id="kp_follow">跟读这一句</button>
        </div>` : ''}
        ${topics.length ? `<div class="kplink">相关主题：${topics.map(t =>
        `<a data-k="${t.id}">${t.t}</a>`).join('')}</div>` : ''}
      </div>
    </div>`;
  $('#kph').onclick = () => { S.kpOpen = !open; S.kpAuto = st.no; renderKP(); };
  const f = $('#kp_follow');
  if (f) f.onclick = () => { if (S.beat === 1) { $('#rin').value = st.recite; $('#rin').focus(); } };
  $$('.kplink a').forEach(a => a.onclick = () => openKnow(a.dataset.k));
}

/* ---------- 三级提示 ---------- */
async function useHint() {
  const st = STEP(); if (!st) return;
  const lv = (S.hintLv[st.no] || 0) + 1;
  if (lv > 3) { toast('本项提示已用完', ''); return; }
  S.hintLv[st.no] = lv;
  S.hints.push({ step: st.no, lv, t: now() });
  const kp = STEPKP[st.no] || { hints: [] };
  const txt = kp.hints[lv - 1] || '';
  const label = ['方向提示', '要点提示', '标准答案'][lv - 1];
  say('s', `<span class="tag wn">${label}</span>${txt}`);
  if (lv === 3 && S.beat === 1) { $('#rin').value = st.recite; }
  S.score.rule -= (lv === 3 ? 4 : lv === 2 ? 2 : 1);
  renderTaskbar();
  await speak(txt, { pose: lv === 3 ? 'correct' : 'explain' });
}

/* ---------- 知识地图抽屉 ---------- */
function openKnow(focus) {
  const st = STEP();
  const rel = (st && STEPKP[st.no] && STEPKP[st.no].k) || [];
  let cur = focus || rel[0] || KNOW[0].id;
  const m = el('div', 'mask');
  const paint = () => {
    const k = KNOW.find(x => x.id === cur) || KNOW[0];
    m.innerHTML = `<div class="dlg" style="width:min(940px,96vw)">
      <div class="dh"><b>倒闸操作知识地图</b>
        <span style="font-size:11px;color:#5c6b5f">当前第 ${st ? st.no : '—'} 项关联的主题已高亮</span>
        <span class="cls">×</span></div>
      <div class="db" style="display:grid;grid-template-columns:216px 1fr;gap:18px;padding:0">
        <div class="knav">${KNOW.map(x => `<div class="kn ${x.id === cur ? 'on' : ''} ${rel.includes(x.id) ? 'rel' : ''}" data-k="${x.id}">
          <b>${x.t}</b><span>${x.sub}</span></div>`).join('')}</div>
        <div class="kbody">
          <h3>${k.t}<em>${k.sub}</em></h3>
          ${k.body.map(b => `<div class="kb"><div class="kbt">${b[0]}</div><p>${b[1].replace(/\n/g, '<br>')}</p></div>`).join('')}
        </div>
      </div></div>`;
    m.querySelector('.cls').onclick = () => m.remove();
    m.querySelectorAll('.kn').forEach(n => n.onclick = () => { cur = n.dataset.k; paint(); });
  };
  paint();
  m.onclick = e => { if (e.target === m) m.remove(); };
  document.body.appendChild(m);
}

/* ---------- 阶段预习卡 ---------- */
function openPreview(phase, done) {
  const P = PREVIEW[phase];
  if (!P || S.mode === 'exam') { done(); return; }
  const m = el('div', 'mask');
  m.innerHTML = `<div class="dlg" style="width:min(660px,96vw)">
    <div class="dh"><b>开始前 · ${P.t}</b><span style="font-size:11px;color:#5c6b5f">本段必须掌握的三个知识点</span></div>
    <div class="db">
      ${P.pts.map((p, i) => `<div style="display:flex;gap:12px;padding:12px;border-radius:7px;margin-bottom:9px;background:#f7f8f1;border:1px solid #e2dfd0">
        <div style="width:22px;height:22px;border-radius:50%;flex:none;background:var(--acbg);color:var(--acd);
          display:flex;align-items:center;justify-content:center;font-size:11px;font-family:var(--mono)">${i + 1}</div>
        <div><div style="font-size:13px;color:#243329;font-weight:600;margin-bottom:4px">${p[0]}</div>
        <div style="font-size:12px;color:#5c6b5f;line-height:1.75">${p[1]}</div></div>
      </div>`).join('')}
      <div style="font-size:11.5px;color:#98a69c;margin-top:6px">相关主题：${P.k.map(id => {
    const k = KNOW.find(x => x.id === id); return k ? `<a class="klink" data-k="${id}">${k.t}</a>` : '';
  }).join('　')}</div>
    </div>
    <div class="df"><button class="btn pri" id="pv_go">明白了，开始本段</button></div></div>`;
  document.body.appendChild(m);
  m.querySelectorAll('.klink').forEach(a => a.onclick = () => openKnow(a.dataset.k));
  m.querySelector('#pv_go').onclick = () => { m.remove(); done(); };
}

/* ---------- 首次进入的界面导览 ---------- */
const TOUR = [
  ['.stage', 'AI 数字人陪练教练', '监护人陈志远在这里唱票、发令、纠错。三个角色会随场景自动切换：接令时是值班调度员，异常上报时是值班负责人。'],
  ['#beats', '五拍动作闭环', '每一项操作都走这五拍：唱票 → 手指口述 → 对，执行 → 执行 → 检查回报 → 标√。当前进行到哪一拍，这里会亮。'],
  ['#taskbar', '任务指令条', '你现在该做什么，这里永远有答案。做完一步打一个勾。卡住了点「提示」，分三级给到标准答案。'],
  ['#kpbox', '知识点卡', '每一项自动展开：这一项在做什么、常见错在哪、为什么这么做、依据哪一条规程。教学模式下还会直接给出标准话术。'],
  ['#locbar', '八个作业位置', '调度电话、五防电脑、监控后台、间隔现场、屏柜、就地控制柜。需要去哪里，按钮会闪。走错间隔会被判违规。'],
  ['#trows', '现场电气操作票', '27 项票面原文，执行一项标一个"√"。可以点任意一项跳过去，但跳项会被判定。'],
  ['#actbar', '复诵与回报', '手指设备后在这里复诵票面内容，点麦克风可以语音输入。发现异常随时点「中止操作并上报」。']
];
function startTour() {
  let i = 0;
  const box = el('div', 'tour');
  const ring = el('div', 'tourring');
  document.body.appendChild(ring); document.body.appendChild(box);
  const paint = () => {
    const [sel, t, d] = TOUR[i];
    const n = document.querySelector(sel);
    if (!n) { i++; return i < TOUR.length ? paint() : fin(); }
    const r = n.getBoundingClientRect();
    ring.style.cssText = `position:fixed;z-index:90;pointer-events:none;border:2px solid #1fa06b;border-radius:8px;
      box-shadow:0 0 0 9999px rgba(44,52,42,.74),0 0 24px color-mix(in srgb,var(--ac) 70%,transparent);transition:.28s;
      left:${r.left - 4}px;top:${r.top - 4}px;width:${r.width + 8}px;height:${r.height + 8}px`;
    const tall = r.height > innerHeight * 0.5;
    box.style.cssText = `position:fixed;z-index:92;width:330px;background:#ffffff;border:1px solid var(--ac);
      border-radius:9px;padding:14px 16px;box-shadow:0 24px 60px rgba(100,108,88,.7);transition:.28s;
      left:0px;top:0px`;
    box.innerHTML = `<div style="font-size:10.5px;color:#1fa06b;font-family:var(--mono);letter-spacing:1px">
        界面导览 ${i + 1}/${TOUR.length}</div>
      <div style="font-size:15px;font-weight:700;margin:6px 0 7px">${t}</div>
      <div style="font-size:12.5px;color:#5c6b5f;line-height:1.75">${d}</div>
      <div style="display:flex;gap:8px;margin-top:13px">
        <button class="btn" id="tr_skip" style="padding:7px 12px">跳过</button>
        <span style="flex:1"></span>
        ${i > 0 ? '<button class="btn" id="tr_prev" style="padding:7px 12px">上一步</button>' : ''}
        <button class="btn pri" id="tr_next" style="padding:7px 14px">${i === TOUR.length - 1 ? '开始陪练' : '下一步'}</button>
      </div>`;
    box.querySelector('#tr_skip').onclick = fin;
    box.querySelector('#tr_next').onclick = () => { i++; i < TOUR.length ? paint() : fin(); };
    const pv = box.querySelector('#tr_prev'); if (pv) pv.onclick = () => { i--; paint(); };
    // 定位：先渲染再量高，保证不超出视口
    const bh = box.offsetHeight || 200, bw = 330;
    let bx, by;
    if (tall) {                       // 目标很高（如舞台）→ 放在其右侧
      bx = r.right + 16; by = r.top + Math.min(60, r.height * .2);
    } else if (r.top < innerHeight * .5) {
      bx = r.left + r.width / 2 - bw / 2; by = r.bottom + 14;
    } else {
      bx = r.left + r.width / 2 - bw / 2; by = r.top - bh - 14;
    }
    bx = Math.min(Math.max(12, bx), innerWidth - bw - 12);
    by = Math.min(Math.max(12, by), innerHeight - bh - 12);
    box.style.left = bx + 'px'; box.style.top = by + 'px';
  };
  const fin = () => { box.remove(); ring.remove(); S.toured = true; };
  paint();
}

/* ---------- 教学模式的宽容判定 ---------- */
function lenient(kind) {
  // 教学模式下，同类错误第一次只提醒不计违规
  if (S.mode !== 'teach') return false;
  S.warned = S.warned || {};
  if (S.warned[kind]) return false;
  S.warned[kind] = true;
  return true;
}
