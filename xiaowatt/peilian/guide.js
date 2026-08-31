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

function renderTaskbar() {
  const st = STEP();
  const bar = $('#taskbar');
  if (!bar) return;
  if (S.stage !== 'run' || !st) {
    bar.innerHTML = `<div class="tb1"><span class="tbno">—</span>
      <span class="tbtx">${S.stage === 'prep' ? '上岗前准备 · 三审 / 着装互检 / 风险分析' :
        S.stage === 'wufang' ? '五防模拟预演 · 按操作票顺序逐项模拟' : '本次陪练已结束'}</span>
      ${modeBtn()}</div>`;
    bindMode(); return;
  }
  const g = guideSteps();
  const cur = g.findIndex(x => !x.ok);
  bar.innerHTML = `
    <div class="tb1">
      <span class="tbno">第 ${st.no} 项</span>
      <span class="tbtx">${st.ticket}</span>
      ${modeBtn()}
    </div>
    <div class="tb2">
      ${g.map((x, i) => `<span class="gs ${x.ok ? 'ok' : (i === cur ? 'now' : '')}">
        <i>${x.ok ? '✓' : i + 1}</i>${x.t}</span>`).join('<b class="ar">›</b>')}
      <span class="tbsp"></span>
      <button class="hintbtn" id="btn_hint">提示 ${S.hintLv[st.no] || 0}/3</button>
      <button class="hintbtn" id="btn_know">知识地图</button>
    </div>`;
  bindMode();
  $('#btn_hint').onclick = useHint;
  $('#btn_know').onclick = () => openKnow();
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
        <span style="font-size:11px;color:#93a9c4">当前第 ${st ? st.no : '—'} 项关联的主题已高亮</span>
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
    <div class="dh"><b>开始前 · ${P.t}</b><span style="font-size:11px;color:#93a9c4">本段必须掌握的三个知识点</span></div>
    <div class="db">
      ${P.pts.map((p, i) => `<div style="display:flex;gap:12px;padding:12px;border-radius:7px;margin-bottom:9px;background:#0b1729;border:1px solid #1c3350">
        <div style="width:22px;height:22px;border-radius:50%;flex:none;background:#123763;color:#9ecbff;
          display:flex;align-items:center;justify-content:center;font-size:11px;font-family:var(--mono)">${i + 1}</div>
        <div><div style="font-size:13px;color:#e6edf6;font-weight:600;margin-bottom:4px">${p[0]}</div>
        <div style="font-size:12px;color:#93a9c4;line-height:1.75">${p[1]}</div></div>
      </div>`).join('')}
      <div style="font-size:11.5px;color:#5f7794;margin-top:6px">相关主题：${P.k.map(id => {
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
    ring.style.cssText = `position:fixed;z-index:90;pointer-events:none;border:2px solid #4d97e8;border-radius:8px;
      box-shadow:0 0 0 9999px rgba(3,8,15,.74),0 0 24px rgba(77,151,232,.7);transition:.28s;
      left:${r.left - 4}px;top:${r.top - 4}px;width:${r.width + 8}px;height:${r.height + 8}px`;
    const tall = r.height > innerHeight * 0.5;
    box.style.cssText = `position:fixed;z-index:92;width:330px;background:#0c1727;border:1px solid #2a6fbe;
      border-radius:9px;padding:14px 16px;box-shadow:0 24px 60px rgba(0,0,0,.7);transition:.28s;
      left:0px;top:0px`;
    box.innerHTML = `<div style="font-size:10.5px;color:#4d97e8;font-family:var(--mono);letter-spacing:1px">
        界面导览 ${i + 1}/${TOUR.length}</div>
      <div style="font-size:15px;font-weight:700;margin:6px 0 7px">${t}</div>
      <div style="font-size:12.5px;color:#93a9c4;line-height:1.75">${d}</div>
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
