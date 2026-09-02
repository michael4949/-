/* ---------------- 工具 ---------------- */
function norm(s) { return (s || '').replace(/[\s，。、；：？！,.;:?!（）()"'"'·"" ]/g, ''); }
function lcs(a, b) {
  const m = a.length, n = b.length; if (!m || !n) return 0;
  let prev = new Array(n + 1).fill(0), cur = new Array(n + 1).fill(0);
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
    [prev, cur] = [cur, prev];
  }
  return prev[n];
}
function sim(a, b) { a = norm(a); b = norm(b); if (!a || !b) return 0; return lcs(a, b) / Math.max(a.length, b.length); }
function toast(t, k) {
  const e = el('div', 'toast ' + (k || ''), t); document.body.appendChild(e);
  setTimeout(() => { e.style.transition = '.3s'; e.style.opacity = 0; setTimeout(() => e.remove(), 320); }, 2100);
}
function say(who, text, cls) {
  S.chat.push({ who, text, cls });
  const cb = $('#chat'); if (!cb) return;
  const map = { j: ['监', 'j'], o: ['操', 'o'], s: ['系', 's'], d: ['调', 'j'], z: ['值', 's'] };
  const m = map[who] || map.s;
  cb.querySelectorAll('.msg.latest').forEach(x => x.classList.remove('latest'));
  cb.appendChild(el('div', 'msg ' + m[1] + ' ' + (cls || '') + (who === 'j' || who === 'd' || who === 'z' ? ' latest' : ''), `<div class="av">${m[0]}</div><div class="bd">${text}</div>`));
  cb.scrollTop = cb.scrollHeight;
}
function pushMsg(t, k) {
  S.msgs.unshift({ t: now(), x: t, k: k || '' });
  if (S.msgs.length > 40) S.msgs.pop();
  const m = $('#msgs'); if (m) renderMsgs();
}
function renderMsgs() {
  const m = $('#msgs'); if (!m) return;
  m.innerHTML = S.msgs.map((x, i) => `<div class="${i === 0 ? 'new ' : ''}${x.k}"><span class="ts">${x.t}</span>${x.x}</div>`).join('');
}
function subtitle(who, text) {
  $('#subwho').textContent = who;
  $('#subtxt').innerHTML = text + '<span class="dh-wave"><i></i><i></i><i></i><i></i><i></i></span>';
}
function subtitleDone(text) { $('#subtxt').innerHTML = text; }

/* ---------------- 角色切换 ---------------- */
function useChar(k) {
  if (DHkey === k) return;
  DHkey = k; Avatar.stop(); Avatar.switchRole(k);
  DH.char = CHARACTERS[k]; DH.charKey = k; DH.render(); DH.setPose('idle');
  const c = CHARACTERS[k];
  $('#rcname').textContent = c.name;
  $('#rcrole').textContent = 'AI数字人陪练教练 · ' + c.role;
}

/* ---------------- 语音 ---------------- */
function speak(text, opt) {
  opt = opt || {};
  const who = opt.who || CHARACTERS[DHkey].role;
  subtitle(who, opt.show || text);
  if (opt.pose) DH.setPose(opt.pose);
  if (opt.nod) setTimeout(() => DH.nod(opt.nod), 120);
  if (opt.shake) setTimeout(() => DH.shake(), 120);
  return Avatar.speak(text, opt).then(() => {
    subtitleDone(opt.show || text);
    if (opt.pose && opt.rest !== false) DH.setPose('idle');
  });
}

/* ---------------- 五拍 ---------------- */
const BEATS = [['唱票', 'CALL'], ['手指口述', 'POINT+RECITE'], ['对，执行', 'ORDER'], ['执行', 'ACT'], ['检查回报', 'REPORT'], ['标√', 'TICK']];
function renderBeats() {
  $('#beats').innerHTML = BEATS.map((b, i) =>
    `<div class="beat ${S.beat === i ? 'on' : ''} ${S.beat > i ? 'done' : ''}"><b>${b[0]}</b><i>${b[1]}</i></div>`).join('');
}

/* ---------------- KPI ---------------- */
function renderTop() {
  const done = STEPS.filter(s => s._done).length;
  $('#kdone').textContent = done + '/' + (S.plan ? S.plan.steps.length : STEPS.length);
  $('#kvio').textContent = S.vio.length;
  $('#kvio').parentNode.className = 'kpi ' + (S.vio.length ? 'bad' : 'good');
  $('#kstop').textContent = S.abn.handled ? 1 : 0;
  const est = estScore();
  const ke = $('#kest');
  if (ke) { ke.textContent = est; ke.parentNode.className = 'kpi est ' + (est >= 85 ? 'good' : est >= 70 ? 'warn' : 'bad'); }
  const ph = STEP() ? STEP().phase : 3;
  const st = ['运行', '热备用', '冷备用', '检修'];
  let curIdx = 0;
  if (S.stage === 'end') curIdx = 3;
  else curIdx = Math.max(0, ph - 1);
  $('#states').innerHTML = st.map((n, i) =>
    `<div class="stp ${i < curIdx ? 'done' : ''} ${i === curIdx && S.stage !== 'end' ? 'cur' : ''} ${S.stage === 'end' ? 'done' : ''}"><i></i><span>${n}</span></div>`).join('');
}
function tick() {
  if (!S.t0) return;
  const s = Math.floor((Date.now() - S.t0) / 1000);
  $('#ktime').textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  const st = $('#stept');
  if (st && S.stepT0 && S.stage === 'run') {
    const e = Math.floor((Date.now() - S.stepT0) / 1000), ref = stepRef(STEP());
    st.textContent = Math.floor(e / 60) + ':' + String(e % 60).padStart(2, '0');
    st.className = e > ref * 1.5 ? 'wv' : e > ref ? 'mv' : 'gv';
  }
}
/* 每项参考用时（秒）：按动作类型 */
function stepRef(st) {
  if (!st) return 45;
  return ({ recv: 60, report: 40, gis: 90, verify: 60, closeE: 70, tag: 40 })[st.act] || 45;
}
/* 实时预估得分：与评估报告同一算法 */
function estScore() {
  const keys = ['rule', 'order', 'dual', 'state', 'risk', 'term'];
  if (S.vio.some(v => v.level === 'red')) return 0;
  const vals = keys.map(k => Math.max(4, Math.min(100, 100 + Math.min(0, (S.score[k] || 0) * 1.2) + (S.praise.some(p => p.dim === k) ? 6 : 0))));
  return Math.round(vals.reduce((a, b) => a + b, 0) / 6);
}
/* 复诵实时评估：吻合度 + 票面漏说片段（≥2 字） */
function missingSegs(mine, std) {
  const a = Array.from(mine || ''), b = Array.from(std || '');
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  let i = 0, j = 0, cur = '', out = [];
  const flush = () => { if (cur.length >= 2) out.push(cur); cur = ''; };
  while (i < n && j < m) {
    if (a[i] === b[j]) { flush(); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { i++; }
    else { cur += b[j]; j++; }
  }
  while (j < m) cur += b[j++];
  flush();
  return out;
}
function liveMeter() {
  const box = $('#livem'), r = $('#rin'); if (!box || !r) return;
  const st = STEP(); if (!st || S.stage !== 'run' || !(S.beat === 1 || S.beat === 4)) { box.innerHTML = ''; return; }
  const v = r.value.trim();
  if (!v) { box.innerHTML = ''; return; }
  const std = S.beat === 1 ? st.recite : st.report;
  const sc = Math.round(sim(v, std) * 100);
  const miss = S.mode === 'exam' ? [] : missingSegs(v, std).slice(0, 4);
  const lv = sc >= 86 ? 'ok' : sc >= 62 ? 'wn' : 'bad';
  box.innerHTML = `<span class="k">实时吻合度</span><span class="lmbar"><i class="${lv}" style="width:${sc}%"></i></span><b class="${lv}">${sc}%</b>
    ${S.mode === 'teach' && miss.length ? `<span class="lmmiss">还缺：${miss.map(x => `<em>${x}</em>`).join('')}</span>` : S.mode === 'drill' && miss.length ? `<span class="lmmiss">尚有 ${miss.length} 处要素未念到</span>` : sc >= 86 ? '<span class="lmok">要素完整，可以提交</span>' : ''}`;
}

/* ---------------- 操作票 ---------------- */
function renderTicket() {
  const b = $('#trows'); b.innerHTML = '';
  const segs = { 1: '接调度令：运行 → 热备用', 2: '再经调度令：热备用 → 冷备用', 3: '再经调度令：冷备用 → 检修' };
  let lastPhase = 0;
  STEPS.forEach((s, i) => {
    if (s.phase !== lastPhase) {
      lastPhase = s.phase;
      b.appendChild(el('div', 'trow seg', `<div class="no"></div><div class="tx">${segs[s.phase]}</div><div class="ck"></div>`));
    }
    const r = el('div', 'trow ' + (i === S.idx && S.stage === 'run' ? 'cur ' : '') + (s._done ? 'done ' : '') + (s._bad ? 'bad ' : '') + (s._skip ? 'skip' : ''),
      `<div class="no">${s.no}</div><div class="tx">${s.ticket}</div><div class="ck">${s._done ? '√' : (s._bad ? '×' : '')}</div>`);
    r.onclick = () => jumpTo(i);
    b.appendChild(r);
  });
  const cur = b.querySelector('.trow.cur'); if (cur) cur.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

function jumpTo(i) {
  if (S.stage !== 'run' || S.ended) return;
  if (i === S.idx) return;
  if (STEPS[i]._done) { toast('该项已执行完毕', ''); return; }
  if (i < S.idx) { toast('操作票不得回退执行，已执行项不可重做', 'bad'); return; }
  // 跳项
  const skipped = [];
  for (let k = S.idx; k < i; k++) if (!STEPS[k]._done) skipped.push(STEPS[k].no);
  const t = STEPS[i];
  // 红线：未完成两种验电即合地刀
  if (t.redline === 'verify' && !(S.verify.v1 && S.verify.v2)) {
    S.idx = i; renderTicket();
    redlineGround(skipped);
    return;
  }
  violation('major', 'order', '跳项执行',
    `跳过第 ${skipped.join('、')} 项，直接执行第 ${t.no} 项`,
    '附录J 1.4 操作项目有漏项；1.5 操作项目顺序原则错误。附录F 2.13：操作项目完成后由监护人立即标注"√"，不得补打勾或提前打勾。');
  DH.setPose('correct');
  speak('停一下。操作票必须按顺序逐项执行，你跳过了前面的项目。请回到第' + STEPS[S.idx].no + '项。', { pose: 'correct', shake: true });
}

/* ---------------- 违规 ---------------- */
function violation(level, dim, title, detail, rule) {
  S.vio.push({ level, dim, title, detail, rule, step: STEP() ? STEP().no : '-', t: now() });
  S.score[dim] = (S.score[dim] || 0) - (level === 'red' ? 100 : level === 'major' ? 12 : 5);
  say('s', `<span class="tag ${level === 'red' ? 'rl' : 'wn'}">${level === 'red' ? '红线' : level === 'major' ? '严重' : '扣分'}</span>${title}：${detail}`, 'err');
  renderTop();
  toast(title, 'bad');
}
function praise(dim, title, detail) {
  S.praise.push({ dim, title, detail, t: now() });
  S.score[dim] = (S.score[dim] || 0) + 8;
  say('s', `<span class="tag ok">加分</span>${title}：${detail}`, 'ok');
}

/* ---------------- 位置 ---------------- */
const LOCSHORT = { phone: '调度电话旁', wufang: '五防电脑', hmi: '监控后台', bay: '1163间隔现场', p8: '8P测控屏', p20: '20P保护屏', cab: '就地控制柜' };
function renderLocbar() {
  const need = STEP() ? STEP().loc : null;
  $('#locbar').innerHTML = Object.keys(LOC).map(k =>
    `<button class="locbtn ${S.loc === k ? 'cur' : ''} ${(need === k && S.loc !== k && S.stage === 'run') ? 'need' : ''}" data-loc="${k}" title="${LOC[k].name}">${LOCSHORT[k] || LOC[k].name}</button>`).join('');
  $$('#locbar .locbtn').forEach(b => b.onclick = () => goLoc(b.dataset.loc));
}
function goLoc(k) {
  if (S.loc === k) return;
  S.loc = k; S.sel = null;
  $('#scene').innerHTML = sceneSVG(k);
  $('#loctag').textContent = LOC[k].name;
  renderLocbar(); renderPanel(); Sheet.sync();
  if (S.stage === 'run' && STEP() && STEP().loc === k && S.beat === 1) {
    say('s', `已到达${LOC[k].name}。请核对间隔名称与设备双重名称后，手指操作对象并复诵。`);
  }
}

/* ---------------- 设备长按（手指口述/执行需按住，教学模式点按） ---------------- */
function bindDevHold(n) {
  const fire = () => devClick(n.dataset.dev);
  const needHold = () => S.stage === 'run' && (S.beat === 1 || S.beat === 3) && S.mode !== 'teach';
  n.onclick = e => { e.stopPropagation(); if (!needHold()) fire(); };
  let t = null, ring = null, raf = 0, t0 = 0;
  const clean = () => {
    if (t) { clearTimeout(t); t = null; }
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    if (ring) { ring.remove(); ring = null; }
  };
  n.addEventListener('pointerdown', e => {
    if (!needHold()) return;
    e.stopPropagation();
    const ms = S.beat === 3 ? 700 : 500;
    t0 = performance.now();
    ring = el('div', 'holdring');
    ring.style.left = (e.clientX - 23) + 'px'; ring.style.top = (e.clientY - 23) + 'px';
    document.body.appendChild(ring);
    const paint = () => {
      if (!ring) return;
      const f = Math.min(1, (performance.now() - t0) / ms);
      ring.style.setProperty('--p', (f * 360) + 'deg');
      if (f < 1) raf = requestAnimationFrame(paint);
    };
    raf = requestAnimationFrame(paint);
    t = setTimeout(() => { clean(); fire(); }, ms);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => n.addEventListener(ev, () => {
    if (!t) return;
    const held = performance.now() - t0;
    clean();
    if (held > 140) toast(S.beat === 3 ? '长按设备完成执行' : '长按设备完成手指口述');
  }));
}

/* ---------------- 设备面板 ---------------- */
function renderPanel() {
  const w = $('#panelwrap'); w.innerHTML = '';
  const st = STEP();
  S.dev._t = (st && S.stage === 'run' && st.loc === S.loc && (S.beat === 1 || S.beat === 3)) ? st.target : null;
  const P = {
    phone: panelPhone, wufang: panelWufang, hmi: panelHmi,
    bay: panelBay, p8: panelP8, p20: panelP20, cab: panelCab
  }[S.loc];
  P(w);
  bindDevs();
  renderTaskbar(); renderKP();
  const tt = $('#sheettitle'); if (tt) tt.textContent = '作业面板 · ' + LOC[S.loc].name;
}

function pnl(title, right, body) {
  return `<div class="pnl"><h4>${title}${right ? `<span class="r">${right}</span>` : ''}</h4>${body}</div>`;
}

function panelHmi(w) {
  w.innerHTML =
    pnl('监控后台 · 一次接线图', '双击设备可查看双重名称', `<div class="sld">${sld()}</div>`) +
    pnl('操作报文与告警', 'SOE', `<div class="msgs" id="msgs"></div>`);
  renderMsgs();
}
function panelPhone(w) {
  const st = STEP();
  const ringing = S.stage === 'run' && st && st.act === 'recv' && S.beat <= 1;
  w.innerHTML = pnl('调度电话 · 受令席', '110kV仿真站', `
    <div class="phone">
      <div class="handset ${ringing ? 'ringing' : ''}">
        <div class="ring"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#0a6b44" stroke-width="1.8">
          <path d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.6 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.6 3.6a1 1 0 0 1-.25 1z"/></svg></div>
        <div class="nm">${ringing ? '地调值班调度员 来电' : '地调值班调度员'}</div>
        <div class="de">${ringing ? '等待接令' : '通话空闲'}</div>
      </div>
      <div class="reclog">
        <div class="row"><div class="k">发令单位</div><div class="v"><input id="o_unit" value="${S.ord.unit}" placeholder="填写发令单位"></div></div>
        <div class="row"><div class="k">发令人</div><div class="v"><input id="o_from" value="${S.ord.from}" placeholder="填写发令人"></div></div>
        <div class="row"><div class="k">受令人</div><div class="v">${S.ord.to}</div></div>
        <div class="row"><div class="k">受令时间</div><div class="v" id="o_time">${S.ord.time || '—'}</div></div>
        <div class="row"><div class="k">操作任务</div><div class="v">将110kV培训三线1163线路由运行转检修</div></div>
        <div class="row"><div class="k">当前下令</div><div class="v" style="color:#a8821b">${S.ord.cur || '—'}</div></div>
      </div>
    </div>`);
  const u = $('#o_unit'), f = $('#o_from');
  if (u) u.oninput = e => S.ord.unit = e.target.value;
  if (f) f.oninput = e => S.ord.from = e.target.value;
}
function panelWufang(w) {
  w.innerHTML = pnl('五防主机 · 模拟预演', `模拟 ${S.wf}/4`, `
    <div class="wf">
      <div style="font-size:11.5px;color:#5c6b5f;line-height:1.7">
        五防主机、电脑钥匙状态正常，五防系统与后台监控设备状态一致。<br>
        操作任务已输入：<b style="color:#2f4438">将110kV培训三线1163线路由运行转检修</b>
      </div>
      <div class="wfsteps">${WUFANG.map((x, i) =>
      `<div class="wfs ${i < S.wf ? 'done' : ''} ${i === S.wf ? 'tgt' : ''}" data-wf="${i}">${i + 1}. ${x[1]}</div>`).join('')}</div>
      ${S.wf >= 4 ? `<div style="margin-top:12px;font-size:12px;color:#0e8f5a">模拟顺序正确：先断开1163开关，再依次拉开11634、11632刀闸；后合上116340地刀。前几项操作均在后台执行，暂不下传电脑钥匙。</div>` : ''}
    </div>`) + pnl('五防模拟接线图', '', `<div class="sld">${sld()}</div>`);
  $$('.wfs').forEach(b => b.onclick = () => wfClick(+b.dataset.wf));
}
function panelBay(w) {
  const st = STEP();
  w.innerHTML = pnl('110kV GIS 间隔现场 · 选择间隔', '核对间隔名称与设备双重名称', `
    <div class="bays">
      ${['1161', '1162', '1163'].map(n => `<div class="bayc ${S.bay === n ? 'cur' : ''}" data-bay="${n}">
        <div class="n">培训${n === '1161' ? '一' : n === '1162' ? '二' : '三'}线 ${n}</div>
        <div class="d">110kV ${n === '1161' ? '1M' : '2M'} 侧</div>
        <div class="s" style="color:${n === '1163' ? (S.dev.CB1163 === 'open' ? '#23b26a' : '#e23b2e') : '#e23b2e'}">${n === '1163' ? (S.dev.CB1163 === 'open' ? '停电' : '运行中') : '运行中'}</div>
      </div>`).join('')}
    </div>`) +
    pnl(`培训三线1163间隔 · 现场核对`, S.bay === '1163' ? '当前站位正确' : '当前站位：培训' + (S.bay === '1161' ? '一' : '二') + '线间隔', `
    <div class="ind">
      <div class="indc ${S.gis.plate ? 'chk' : ''} ${S.dev._t === 'bay_plate' ? 'tgt' : ''}" data-dev="bay_plate">
        <div class="nm">间隔名称牌<br>双重名称</div>
        <div class="val b">110kV培训三线1163</div><div class="tick">${S.gis.plate ? '已核对 ✓' : ''}</div></div>
      <div class="indc ${S.gis.draw ? 'chk' : ''}" data-dev="bay_draw">
        <div class="nm">接线图 vs 现场实物<br>图实一致性</div>
        <div class="val b">一致</div><div class="tick">${S.gis.draw ? '已核对 ✓' : ''}</div></div>
      <div class="indc ${S.gis.label ? 'chk' : ''}" data-dev="bay_label">
        <div class="nm">设备标签<br>标实一致性</div>
        <div class="val b">清晰准确</div><div class="tick">${S.gis.label ? '已核对 ✓' : ''}</div></div>
      <div class="indc ${S.gis.hv ? 'chk' : ''} ${S.dev._t === 'bay_hvdisp' ? 'tgt' : ''}" data-dev="bay_hvdisp">
        <div class="nm">高压带电显示装置<br>A/B/C 三相</div>
        <div class="val ${S.dev.DS11634 === 'open' ? 'b' : 'a'}">${S.dev.DS11634 === 'open' ? '无电压' : '确有电压'}</div>
        <div class="tick">${S.gis.hv ? '已核对 ✓' : ''}</div></div>
    </div>`) + gisPanel();
}
function gisPanel() {
  const st = STEP(); if (!st || st.act !== 'gis') return '';
  const id = st.target;
  const nm = { DS11634: '11634刀闸', DS11632: '11632刀闸', ES116340: '116340地刀' }[id];
  const target = id === 'ES116340' ? '合上位置' : '拉开位置';
  const anomaly = (S.abn.fired && !S.abn.handled && id === 'DS11634');
  const cells = [
    ['hui', '汇控柜<br>电气指示', target],
    ['mech', '机构箱<br>机械指示', anomaly ? '与后台不一致' : target],
    ['arm', '刀闸拐臂<br>指示', target],
    ['line', '转轴划线<br>标识', target]
  ];
  return pnl(`${nm} · 现场位置四项指示`, anomaly ? '⚠ 指示异常' : '附录G-5 要求逐项核对', `
    <div class="ind">${cells.map(c => `
      <div class="indc ${S.gis[c[0]] ? 'chk' : ''}" data-dev="gis_${c[0]}">
        <div class="nm">${c[1]}</div>
        <div class="val ${c[2].indexOf('不一致') >= 0 ? 'a' : (id === 'ES116340' ? 'g' : 'b')}">${c[2]}</div>
        <div class="tick">${S.gis[c[0]] ? '已核对 ✓' : ''}</div></div>`).join('')}
    </div>
    ${anomaly ? `<div style="margin-top:12px;background:#fbe9e7;border:1px solid #eac1bb;border-radius:6px;padding:11px;font-size:12px;color:#b3372c;line-height:1.7">
      现场机构箱机械指示与监控后台位置显示不一致。<br>
      细则第十四条：一旦发现设备运动方向异常、位置指示不一致等问题，应落实"凡变化必上报"，立即中止操作并上报，严禁盲目重试。</div>` : ''}`);
}
function panelP8(w) {
  w.innerHTML = pnl('8P 110kV培训三线1163线路测控屏', '屏柜名称已核对', `
    <div class="cab c2">
      ${knobHTML('K1QK', '1QK', '培训三线1163开关控制选择把手', ['远控', '就地'])}
      <div class="mcb tagslot ${S.dev._t === 'TCLOSE' ? 'tgt' : ''}" data-dev="TCLOSE">
        <div class="body" style="background:#fbe9e7;border-color:#e0a89f">
          <div style="position:absolute;left:4px;top:12px;width:18px;height:18px;border-radius:50%;background:#e23b2e"></div>
        </div>
        <div class="i"><div class="nm">1163 合闸按钮</div><div class="de">CLOSE · 就地合闸</div>
        <div class="st">${S.tags.TCLOSE ? '已悬挂标志牌' : '未悬挂标志牌'}</div></div>
        ${S.tags.TCLOSE ? `<div class="tagcard">禁止合闸<br>线路有人工作！</div>` : ''}
      </div>
    </div>`);
}
function panelP20(w) {
  w.innerHTML = pnl('20P 110kV培训三线1163线路保护屏', 'RCS-943', `
    <div class="cab c3">
      ${mcbHTML('M1K2', '1K2', '控制电源')}
      ${mcbHTML('M1K1', '1K1', '保护装置电源')}
      ${mcbHTML('M1ZKK', '1ZKK', '保护电压')}
    </div>`);
}
function panelCab(w) {
  w.innerHTML = pnl('110kV培训三线1163间隔就地控制柜', '设备双重名称已核对', `
    <div class="cab c2" style="margin-bottom:10px">
      ${knobHTML('KZK', 'ZK', '远控／就地切换把手', ['远控', '就地'])}
      <div class="knob ${S.dev._t === 'ES116340' ? 'tgt' : ''} dev" data-dev="ES116340">
        <div class="nm">116340</div><div class="de">培训三线线路侧接地刀闸<br>就地电动操作</div>
        <svg width="96" height="56" viewBox="0 0 96 56">
          <rect x="6" y="8" width="84" height="40" rx="5" fill="#eef0e4" stroke="#d3d0bd"/>
          <circle cx="30" cy="28" r="12" fill="none" stroke="${S.dev.ES116340 === 'close' ? '#e8b22a' : '#23b26a'}" stroke-width="2.4"/>
          <line x1="30" y1="28" x2="${S.dev.ES116340 === 'close' ? 30 : 22}" y2="${S.dev.ES116340 === 'close' ? 17 : 20}" stroke="${S.dev.ES116340 === 'close' ? '#e8b22a' : '#23b26a'}" stroke-width="3.4" stroke-linecap="round"/>
          <text x="62" y="24" font-size="9" fill="#8b988c" font-family="monospace">合闸</text>
          <text x="62" y="40" font-size="9" fill="#8b988c" font-family="monospace">分闸</text>
          <circle cx="54" cy="21" r="3" fill="${S.dev.ES116340 === 'close' ? '#e8b22a' : '#dcd9c8'}"/>
          <circle cx="54" cy="37" r="3" fill="${S.dev.ES116340 === 'close' ? '#dcd9c8' : '#23b26a'}"/>
        </svg>
        <div class="st ${S.dev.ES116340 === 'close' ? 'a' : 'b'}">${S.dev.ES116340 === 'close' ? '合上位置' : '拉开位置'}</div>
      </div>
    </div>
    <div class="cab c3">
      ${mcbHTML('M4DK', '4DK', '线路抽取电压（去保护）', 'T4DK')}
      ${mcbHTML('M1DK', '1DK', '刀闸／地刀控制电源')}
      ${mcbHTML('M2DK', '2DK', '刀闸／地刀电机电源')}
    </div>`) +
    pnl('间隔高压带电显示装置', '间接验电 · 第二种原理', `
    <div class="ind" style="grid-template-columns:repeat(3,1fr)">
      ${['A', 'B', 'C'].map(p => `<div class="indc ${S.dev._t === 'cab_hvdisp' ? 'tgt' : ''} ${S.gis['hv' + p] ? 'chk' : ''}" data-dev="cab_hvdisp_${p}">
        <div class="nm">${p} 相带电指示</div>
        <div class="val ${S.dev.DS11634 === 'open' ? 'b' : 'a'}">${S.dev.DS11634 === 'open' ? '确无电压' : '确有电压'}</div>
        <div class="tick">${S.gis['hv' + p] ? '已核对 ✓' : ''}</div></div>`).join('')}
    </div>`) +
    (S.tags.T11634 || STEP() && STEP().target === 'T11634' ? pnl('11634刀闸操作把手', '', `
    <div class="mcb tagslot ${S.dev._t === 'T11634' ? 'tgt' : ''}" data-dev="T11634">
      <div class="body"><div class="lev" style="top:24px;background:#23b26a"></div></div>
      <div class="i"><div class="nm">11634 操作把手</div><div class="de">培训三线线路侧刀闸</div>
      <div class="st">${S.tags.T11634 ? '已悬挂标志牌' : '未悬挂标志牌'}</div></div>
      ${S.tags.T11634 ? `<div class="tagcard">禁止合闸<br>线路有人工作！</div>` : ''}
    </div>`) : '');
}
function knobHTML(id, nm, de, opts) {
  const v = S.dev[id], on = v === opts[1];
  return `<div class="knob dev ${S.dev._t === id ? 'tgt' : ''}" data-dev="${id}">
    <div class="nm">${nm}</div><div class="de">${de}</div>
    <svg width="96" height="60" viewBox="0 0 96 60">
      <circle cx="48" cy="30" r="21" fill="#eef0e4" stroke="#d3d0bd" stroke-width="2"/>
      <g transform="rotate(${on ? 42 : -42},48,30)">
        <rect x="45" y="11" width="6" height="21" rx="3" fill="${on ? '#e8b22a' : '#1fa06b'}"/>
        <circle cx="48" cy="30" r="6" fill="#dcd9c8"/>
      </g>
      <text x="14" y="16" font-size="9" fill="#8b988c" font-family="monospace">${opts[0]}</text>
      <text x="66" y="16" font-size="9" fill="#8b988c" font-family="monospace">${opts[1]}</text>
    </svg>
    <div class="st ${on ? 'a' : 'b'}">${v}</div></div>`;
}
function mcbHTML(id, nm, de, tagId) {
  const off = S.dev[id] === 'off';
  const tg = tagId && S.tags[tagId];
  return `<div class="mcb dev ${off ? 'off' : ''} ${S.dev._t === id || S.dev._t === tagId ? 'tgt' : ''} ${tagId ? 'tagslot' : ''}" data-dev="${tagId && STEP() && STEP().target === tagId ? tagId : id}">
    <div class="body"><div class="lev"></div></div>
    <div class="i"><div class="nm">${nm}</div><div class="de">${de}</div>
    <div class="st">${off ? '断开' : '合闸'}</div></div>
    ${tg ? `<div class="tagcard">禁止合闸<br>线路有人工作！</div>` : ''}</div>`;
}

function bindDevs() {
  $$('#panelwrap [data-dev]').forEach(n => bindDevHold(n));
  if (S.dev._t) {
    const tn = $(`#panelwrap [data-dev="${S.dev._t}"]`);
    if (tn) {
      tn.classList.add('tgt');
      const st = STEP();
      if (st) {
        const verb = S.beat === 1 ? '手指口述' : (st.ticket.match(/^(拉开|合上|断开|检查|核对|悬挂|切换|将|取下|投入|退出)/) || ['执行'])[0];
        const label = S.beat === 1 ? '手指口述' : verb === '将' ? '切换' : verb;
        if (tn.namespaceURI && tn.namespaceURI.indexOf('svg') >= 0) {
          const svg = tn.ownerSVGElement;
          if (svg && !svg.querySelector('.arlabg')) {
            try {
              const bb = tn.getBBox(), NS = 'http://www.w3.org/2000/svg';
              const g = document.createElementNS(NS, 'g'); g.setAttribute('class', 'arlabg'); g.setAttribute('pointer-events', 'none');
              const tx = `第${st.no}项 · ${label}`, w = tx.length * 11 + 18, x = Math.max(4, bb.x + bb.width / 2 - w / 2), y = bb.y - 30;
              g.innerHTML = `<rect x="${x}" y="${y}" width="${w}" height="22" rx="11" fill="#17301f"/><path d="M ${x + w / 2 - 5} ${y + 22} l 5 6 5 -6 z" fill="#17301f"/><text x="${x + w / 2}" y="${y + 15}" text-anchor="middle" font-size="11.5" fill="#fff" font-family="inherit">${tx}</text>`;
              svg.appendChild(g);
            } catch (e) { }
          }
        } else if (!tn.querySelector('.arlab')) {
          tn.insertAdjacentHTML('beforeend', `<span class="arlab"><i>第${st.no}项</i>${label}</span>`);
        }
      }
    }
  }
  $$('#panelwrap [data-bay]').forEach(n => n.onclick = () => {
    const b = n.dataset.bay;
    if (b !== '1163' && S.stage === 'run') {
      violation('major', 'state', '走错间隔',
        `本项操作对象在培训三线1163间隔，实际站位为培训${b === '1161' ? '一' : '二'}线${b}间隔`,
        '风险7：到达每一操作地点后，先核对间隔名称和待操作设备双重名称，同时确认图实一致、标实一致。');
      speak('停。你站错间隔了。这里是培训' + (b === '1161' ? '一' : '二') + '线' + b + '间隔，仍在运行中。到每一个操作地点，先核对间隔名称和设备双重名称。',
        { pose: 'stop', shake: true });
    }
    S.bay = b; renderPanel();
  });
}
