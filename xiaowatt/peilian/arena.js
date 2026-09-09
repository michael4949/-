/* ================= 陪练舱 v2 ================= */

/* ---------- 道具层（底部抽屉） ---------- */
const Sheet = {
  manual: null,   // 用户手动收起/展开后的意愿
  open(force) { const s = $('#sheet'); if (!s) return; s.classList.remove('closed'); $('#sheetpeek').classList.remove('show'); $('.arena').classList.add('sheetopen'); if (force) this.manual = null; },
  close() { const s = $('#sheet'); if (!s) return; s.classList.add('closed'); $('#sheetpeek').classList.add('show'); $('.arena').classList.remove('sheetopen'); },
  want() {
    // 自动规则：准备/五防阶段常开；执行阶段在需要手指、执行、回报时打开
    if (S.stage === 'prep' || S.stage === 'wufang') return true;
    if (S.stage !== 'run') return false;
    const st = STEP(); if (!st) return false;
    if (st.act === 'recv' || st.act === 'report') return S.beat <= 4;
    return S.beat === 1 || S.beat === 3 || S.beat === 4;
  },
  sync() {
    if (this.manual === 'closed') { this.close(); return; }
    if (this.manual === 'open') { this.open(); return; }
    if (this.want()) this.open(); else this.close();
    const st = STEP();
    const pk = $('#sheetpeek');
    if (pk) pk.classList.toggle('need', S.stage === 'run' && !!st && this.want() === false && S.beat === 1);
  },
  bind() {
    $('#sheetfold').onclick = () => { this.manual = 'closed'; this.close(); };
    $('#sheetpeek').onclick = () => { this.manual = 'open'; this.open(); };
  }
};

/* ---------- 练习方式与角色 ---------- */
const PLANS = [
  { id: 'full', n: '完整操作票', d: '29 项全票，含上岗前准备与五防模拟，约 25 分钟', steps: () => STEPS.map((_, i) => i), prep: true },
  { id: 'p1', n: '分段 · 运行 → 热备用', d: '第 1–8 项，接令、核对、断开开关、汇报，约 7 分钟', steps: () => idxOf(s => s.phase === 1), preset: 1 },
  { id: 'p2', n: '分段 · 热备用 → 冷备用', d: '第 9–15 项，拉刀闸与 GIS 四项核对，约 7 分钟', steps: () => idxOf(s => s.phase === 2), preset: 2 },
  { id: 'p3', n: '分段 · 冷备用 → 检修', d: '第 16–27 项，两种验电、接地、二次隔离、挂牌，约 10 分钟', steps: () => idxOf(s => s.phase === 3), preset: 3 },
  { id: 'sp_vd', n: '专项 · 验电接地', d: '只练第 16–21 项：先验电再接地这条红线', steps: () => idxOf(s => ['16', '17', '18', '19', '20', '21'].includes(s.no)), preset: 3 },
  { id: 'sp_gis', n: '专项 · GIS 四项核对', d: '只练第 10–13 项：刀闸操作与四项位置指示', steps: () => idxOf(s => ['10', '11', '12', '13'].includes(s.no)), preset: 2 },
  { id: 'sp_ord', n: '专项 · 接令与票令核对', d: '只练三次接令：复诵、记录、票令不一致的识别（含陷阱）', steps: () => idxOf(s => ['1', '9', '16'].includes(s.no)), preset: 1, trap: true },
  { id: 'wrong', n: '错题重练', d: '重练上一次触发扣分或红线的项目', steps: () => wrongSteps(), preset: 'auto' }
];
function idxOf(f) { return STEPS.map((s, i) => f(s) ? i : -1).filter(i => i >= 0); }
function wrongSteps() {
  try {
    const last = JSON.parse(localStorage.getItem('xwt_lastvio') || '[]');
    const nos = Array.from(new Set(last.map(v => v.step)));
    return idxOf(s => nos.includes(s.no));
  } catch (e) { return []; }
}
function applyPreset(ph) {
  const d = S.dev;
  if (ph >= 2) { d.CB1163 = 'open'; S.ord.cur = '将110kV仿真站110kV培训三线1163线路由运行转热备用'; }
  if (ph >= 3) { d.DS11634 = 'open'; d.DS11632 = 'open'; d.K1QK = '就地'; S.ord.cur = '将110kV培训三线1163线路由热备用转冷备用'; }
  STEPS.forEach((s, i) => { if (!S.plan.steps.includes(i)) s._skip = true; });
  S.ord.unit = ''; S.ord.from = ''; S.ph.log = [];
  if (ph >= 2) S.ph.log.push({ no: '1', phase: 1, recv: '—', unit: '深圳中调', from: '李明', order: '将110kV仿真站110kV培训三线1163线路由运行转热备用', issued: '—', reported: '—' });
  if (ph >= 3) S.ph.log.push({ no: '9', phase: 2, recv: '—', unit: '深圳中调', from: '李明', order: '将110kV培训三线1163线路由热备用转冷备用', issued: '—', reported: '—' });
}

function openEntry(pre) {
  const m = el('div', 'mask'); m.id = 'en_mask';
  let plan = (pre && PLANS.some(p => p.id === pre)) ? pre : 'full', role = 'op';
  const hasWrong = wrongSteps().length > 0;
  m.innerHTML = `<div class="dlg" style="width:min(820px,96vw)">
    <div class="dh"><b>开始陪练 · 选择练习方式</b><span style="font-size:11px;color:#5c6b5f">110kV培训三线1163线路由运行转检修</span></div>
    <div class="db">
      <div class="sec"><div class="st">你扮演</div>
        <div style="display:flex;gap:10px">
          <label class="cfgopt on" style="flex:1"><input type="radio" name="role" value="op" checked>
            <div><b>操作人</b><span>监护人由 AI 数字人担任：唱票、发令、纠错、标"√"。</span></div></label>
          <label class="cfgopt" style="flex:1;opacity:.55"><input type="radio" name="role" value="mon" disabled>
            <div><b>监护人</b><span>由你唱票与核对，AI 扮演操作人。进阶视角。</span></div></label>
        </div></div>
      <div class="sec"><div class="st">练习方式</div>
        <div class="plans">${PLANS.map(p => `<label class="cfgopt ${p.id === plan ? 'on' : ''} ${p.id === 'wrong' && !hasWrong ? 'dis' : ''}">
          <input type="radio" name="plan" value="${p.id}" ${p.id === plan ? 'checked' : ''} ${p.id === 'wrong' && !hasWrong ? 'disabled' : ''}>
          <div><b>${p.n}</b><span>${p.id === 'wrong' && !hasWrong ? '暂无历史错题' : p.d}</span></div></label>`).join('')}</div></div>
      <div class="sec"><div class="st">教学模式</div>
        <div class="modesw" style="display:inline-flex">${Object.keys(MODES).map(k =>
    `<button data-m="${k}" class="${S.mode === k ? 'on' : ''}">${MODES[k].n}</button>`).join('')}</div>
        <span style="font-size:11px;color:#98a69c;margin-left:10px" id="modedesc">${MODES[S.mode].d}</span></div>
    </div>
    <div class="df"><button class="btn" id="en_back">返回工作台</button><button class="btn pri" id="en_go">进入陪练舱</button></div></div>`;
  document.body.appendChild(m);
  m.querySelector('#en_back').onclick = () => { m.remove(); __arenaEntered = false; goPage('home'); };
  m.querySelectorAll('input[name=plan]').forEach(r => r.onchange = () => {
    plan = r.value; m.querySelectorAll('.plans .cfgopt').forEach(o => o.classList.toggle('on', o.querySelector('input').checked));
  });
  m.querySelectorAll('.modesw button').forEach(b => b.onclick = () => {
    S.mode = b.dataset.m; m.querySelectorAll('.modesw button').forEach(x => x.classList.toggle('on', x === b));
    m.querySelector('#modedesc').textContent = MODES[S.mode].d;
  });
  m.querySelector('#en_go').onclick = () => {
    const P = PLANS.find(p => p.id === plan);
    S.plan = { id: P.id, name: P.n, steps: P.steps() };
    if (P.trap) { S.trap.armed = true; }
    if (P.preset === 'auto') { const ph = Math.min(...S.plan.steps.map(i => STEPS[i].phase)); applyPreset(ph); }
    else if (P.preset) applyPreset(P.preset);
    $('#planline').textContent = `110kV仿真站 · 变电运行 · ${P.n} · 操作人视角 · ${MODES[S.mode].n}`;
    $('#chatmode').textContent = MODES[S.mode].n;
    m.remove();
    renderTicket();
    if (P.prep) enterPrep();
    else { S.stage = 'run'; S.t0 = Date.now(); if (!S.timer) S.timer = setInterval(tick, 1000); S.previewed[STEPS[S.plan.steps[0]].phase] = false; enterStep(S.plan.steps[0]); if (!S.toured) setTimeout(startTour, 900); }
  };
}

/* ---------- 随时提问：从知识地图检索 ---------- */
function askCoach() {
  const m = el('div', 'mask');
  const st = STEP();
  const rel = (st && STEPKP[st.no] && STEPKP[st.no].k) || [];
  const sugg = rel.length ? KNOW.filter(k => rel.includes(k.id)).flatMap(k => k.body.slice(0, 2).map(b => b[0])) : ['为什么要先验电再接地', 'GIS 刀闸要核对哪四项', '票令不一致怎么办'];
  m.innerHTML = `<div class="dlg" style="width:min(680px,96vw)">
    <div class="dh"><b>问教练</b><span style="font-size:11px;color:#5c6b5f">基于安规与操作票管理细则知识库</span><span class="cls">×</span></div>
    <div class="db">
      <div style="display:flex;gap:8px;margin-bottom:12px">
        <input class="rin" id="ask_in" placeholder="例如：为什么要先拉线路侧刀闸？" style="flex:1">
        <button class="btn pri" id="ask_go">提问</button></div>
      <div style="font-size:11px;color:#98a69c;margin-bottom:8px">可以直接点：${sugg.map(q => `<a class="klink" data-q="${q}">${q}</a>`).join('　')}</div>
      <div id="ask_out"></div>
    </div></div>`;
  document.body.appendChild(m);
  m.querySelector('.cls').onclick = () => m.remove();
  const run = async q => {
    if (!q.trim()) return;
    const out = m.querySelector('#ask_out');
    out.innerHTML = `<div class="msg o"><div class="av">问</div><div class="bd">${q}</div></div>
      <div class="msg j"><div class="av">监</div><div class="bd" id="ask_ans">检索知识库…</div></div>`;
    const r = retrieve(q);
    S.asks = S.asks || []; S.asks.push({ q, t: now(), step: st ? st.no : '-' });
    await new Promise(r => setTimeout(r, 380));
    const ans = m.querySelector('#ask_ans');
    if (!ans) return;
    ans.innerHTML = `${r.text.replace(/\n/g, '<br>')}<div style="margin-top:8px;font-size:10.5px;color:#98a69c">依据：${r.src}${r.topic ? `　·　<a class="klink" data-k="${r.topic}">查看主题</a>` : ''}</div>`;
    ans.querySelectorAll('.klink').forEach(a => a.onclick = () => openKnow(a.dataset.k));
    speak(r.text.slice(0, 120), { pose: 'explain' });
  };
  m.querySelector('#ask_go').onclick = () => run(m.querySelector('#ask_in').value);
  m.querySelector('#ask_in').onkeydown = e => { if (e.key === 'Enter') run(e.target.value); };
  m.querySelectorAll('.klink[data-q]').forEach(a => a.onclick = () => { m.querySelector('#ask_in').value = a.dataset.q; run(a.dataset.q); });
  setTimeout(() => m.querySelector('#ask_in').focus(), 50);
}

function retrieve(q) {
  const qs = norm(q);
  const grams = new Set();
  for (let i = 0; i < qs.length - 1; i++) grams.add(qs.slice(i, i + 2));
  let best = null, bs = 0;
  const cur = STEP();
  for (const k of KNOW) {
    k.body.forEach((b, bi) => {
      const tt = norm(k.t), th = norm(b[0]), tb = norm(b[1]);
      let sc = 0;
      grams.forEach(g => { if (tt.includes(g)) sc += 3; if (th.includes(g)) sc += 2; if (tb.includes(g)) sc += 1; });
      if (bi === 0) sc += 2;
      if (cur && STEPKP[cur.no] && STEPKP[cur.no].k.includes(k.id)) sc *= 1.25;
      if (sc > bs) { bs = sc; best = { text: b[1], src: k.t + '（' + k.sub + '）', topic: k.id }; }
    });
  }
  if (cur) {
    const t = norm(cur.ticket + cur.why + cur.rule);
    let sc = 0; grams.forEach(g => { if (t.includes(g)) sc++; });
    if (sc * 2.2 > bs) best = { text: cur.why, src: cur.rule, topic: (STEPKP[cur.no].k || [])[0] };
  }
  if (!best || bs < 6) best = { text: '这个问题知识库里没有直接对应的条款。你可以问我关于设备状态、三审票令、五防、唱票复诵、验电接地、GIS 位置核对、二次隔离、异常处置、调度记录这九类内容。', src: '知识地图', topic: null };
  return best;
}

/* ---------- 生成式复盘：依据本场真实过程 ---------- */
function genReview() {
  const done = STEPS.filter(s => s._done).length;
  const red = S.vio.filter(v => v.level === 'red');
  const major = S.vio.filter(v => v.level === 'major');
  const minor = S.vio.filter(v => v.level === 'minor');
  const hints = S.hints.length, asks = (S.asks || []).length;
  const p = [];
  p.push(`本次以操作人视角完成「${S.plan ? S.plan.name : '完整操作票'}」，用时 ${$('#ktime').textContent}，执行 ${done} 项。`);
  if (red.length) p.push(`触发一票否决 ${red.length} 次：${red.map(v => `第${v.step}项${v.title.replace(/（.*?）/, '')}`).join('；')}。这类错误在现场对应的是人身、设备或电网事故，任何一次都不允许发生，本次评价按否决处理。`);
  else p.push('全程未触碰红线，验电接地顺序与异常处置判断均正确。');
  if (major.length) p.push(`严重扣分 ${major.length} 项，集中在${Array.from(new Set(major.map(v => ({ order: '操作顺序', dual: '双人核对', state: '设备状态核对', rule: '规程符合', risk: '风险辨识', term: '术语记录' })[v.dim]))).join('、')}。${major[0] ? `例如第${major[0].step}项：${major[0].detail}。` : ''}`);
  if (minor.length) p.push(`不规范 ${minor.length} 处，主要是${Array.from(new Set(minor.map(v => v.title))).slice(0, 3).join('、')}，属于习惯问题，多练几次即可固化。`);
  if (S.praise.length) p.push(`值得肯定的是：${S.praise.map(x => x.title).join('、')}。`);
  if (hints || asks) p.push(`过程中使用提示 ${hints} 次、提问 ${asks} 次，说明对${hints > 2 ? '流程顺序' : '个别要点'}还不够熟练，建议在演练模式下再走一遍。`);
  if (S.abn.handled) p.push('发现指示不一致后按"凡变化必上报"处置，这是本次最有价值的表现。');
  return p.join('');
}

/* ---------- 底部操作条（v2） ---------- */
function updateActbar() {
  const a = $('#actbar');
  if (S.stage === 'prep') {
    a.innerHTML = `<div class="actrow"><div style="flex:1;font-size:12px;color:#5c6b5f">
      上岗前准备：在作业面板完成三审与资格核对、着装互检、人员状态确认与 12 项风险分析后，进入五防模拟。</div>
      <button class="btn askbtn" id="a_ask">问教练</button></div>`;
    $('#a_ask').onclick = askCoach; Sheet.sync(); return;
  }
  if (S.stage === 'wufang') {
    a.innerHTML = `<div class="actrow"><div style="flex:1;font-size:12px;color:#5c6b5f">
      五防模拟：在模拟接线图上按操作票顺序点击设备，监护人唱票、你复诵后五防主机逐项记录。顺序错误会被防误逻辑闭锁。</div>
      <button class="btn askbtn" id="a_ask">问教练</button></div>`;
    $('#a_ask').onclick = askCoach; Sheet.sync(); return;
  }
  if (S.stage === 'end') {
    a.innerHTML = `<div class="actrow"><button class="btn pri" id="a_rep">查看本次陪练评估报告</button>
      <button class="btn" id="a_again">再练一次</button></div>`;
    $('#a_rep').onclick = openReport; $('#a_again').onclick = () => location.reload();
    Sheet.sync(); return;
  }
  const st = STEP();
  const ph = [S.ph.ring ? '调度来电，先在受令席接听' : '等待监护人唱票…', st && st.act === 'recv' ? '记录发令单位与发令人后，复诵调度下令' : st && st.act === 'report' ? '复诵向调度汇报的内容' : '手指操作对象后，复诵票面内容', st && st.act === 'recv' ? '在受令席核对票令是否一致' : st && st.act === 'report' ? '请监护人拨通深圳中调汇报' : '等待监护人发出执行令…', '已发令，请在设备图上执行', '检查设备状态并回报', ''][S.beat];
  const canInput = S.beat === 1 || S.beat === 4;
  a.innerHTML = `<div class="actrow">
      <button class="mic" id="a_mic" title="语音复诵"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9">
        <rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v4"/></svg></button>
      <input class="rin" id="rin" placeholder="${S.beat === 1 ? '复诵票面内容…（点麦克风可语音复诵）' : S.beat === 4 ? '回报检查结果…' : ph}" ${canInput ? '' : 'disabled'}>
      <button class="btn pri" id="a_send" ${canInput ? '' : 'disabled'}>${S.beat === 1 ? '复诵' : '回报'}</button>
      <button class="btn askbtn" id="a_ask">问教练</button>
      <button class="btn dan" id="a_stop">中止操作并上报</button>
      <button class="btn" id="a_rule">规程依据</button>
    </div>
    <div class="hintrow livem" id="livem"></div>
    <div class="hintrow"><span class="k">当前节拍</span>${BEATS[S.beat] ? BEATS[S.beat][0] : '—'}
      <span style="color:#b9bfae">|</span><span class="k">操作对象</span>${st && st.target ? devName(st.target) : '本项为调度联系'}
      <span style="color:#b9bfae">|</span><span class="k">所在位置</span>${LOC[S.loc].name}
      ${S.beat === 1 && st && st.loc !== S.loc ? `<span style="color:#a8821b">→ 需前往 ${LOC[st.loc].name}</span>` : ''}
      <span style="color:#b9bfae">|</span><span class="k">本项用时</span><span id="stept" class="mono gv">0:00</span><span class="tk3">参考 ${Math.floor(stepRef(st) / 60)}:${String(stepRef(st) % 60).padStart(2, '0')}</span>
    </div>`;
  $('#a_send').onclick = submitInput;
  $('#rin').oninput = liveMeter;
  $('#a_stop').onclick = clickStop;
  $('#a_rule').onclick = openRule;
  $('#a_mic').onclick = micClick;
  $('#a_ask').onclick = askCoach;
  const r = $('#rin');
  r.onkeydown = e => { if (e.key === 'Enter') submitInput(); };
  if (canInput) setTimeout(() => r.focus(), 30);
  Sheet.sync();
}
