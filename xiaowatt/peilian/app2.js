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
  const pre = S.stage === 'fill' || S.stage === 'prep' || S.stage === 'wufang';
  $('#beats').innerHTML = BEATS.map((b, i) =>
    `<div class="beat ${!pre && S.beat === i ? 'on' : ''} ${!pre && S.beat > i ? 'done' : ''} ${pre ? 'idle' : ''}"><b>${b[0]}</b><i>${b[1]}</i></div>`).join('');
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
  const tn = $('#tno'); if (tn) tn.textContent = S.stage === 'fill' ? '待签发' : ticketNo();
  if (S.stage === 'fill') {
    b.appendChild(el('div', 'tfill', '操作票尚未拟写。<br>在右侧作业面板按调度预令写第一段，提交审核后签发。'));
    return;
  }
  const segs = { 1: '接调度令：运行 → 热备用', 2: '再经调度令：热备用 → 冷备用', 3: '再经调度令：冷备用 → 检修' };
  let lastPhase = 0;
  STEPS.forEach((s, i) => {
    if (s.phase !== lastPhase) {
      lastPhase = s.phase;
      b.appendChild(el('div', 'trow seg', `<div class="no"></div><div class="tx">${segs[s.phase]}</div><div class="ck"></div>`));
    }
    const r = el('div', 'trow ' + (i === S.idx && S.stage === 'run' ? 'cur ' : '') + (s._done ? 'done ' : '') + (s._bad ? 'bad ' : '') + (s._skip ? 'skip' : ''),
      `<div class="no">${s.no}</div><div class="tx">${s.ticket}</div><div class="ck">${s._done ? '√' : (s._bad ? '×' : '')}</div>`);
    r.dataset.no = s.no;
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
/* 评分维度与扣分标准：与评估报告、评分复盘页同一套口径 */
const DIMN = { rule: '规程符合性', order: '操作顺序与逻辑', dual: '双人核对执行', state: '设备状态核对', risk: '风险辨识与异常处置', term: '调度术语与记录规范' };
const CUT = { red: 100, major: 12, minor: 5 };
function violation(level, dim, title, detail, rule) {
  const cut = CUT[level] || 5;
  S.vio.push({ level, dim, title, detail, rule, cut, dimn: DIMN[dim] || dim, step: STEP() ? STEP().no : '-', t: now() });
  S.score[dim] = (S.score[dim] || 0) - cut;
  const cutTxt = level === 'red' ? `${DIMN[dim]}　一票否决，综合得分记 0` : `${DIMN[dim]} −${cut} 分`;
  say('s', `<span class="tag ${level === 'red' ? 'rl' : 'wn'}">${level === 'red' ? '红线' : level === 'major' ? '严重' : '扣分'}</span>${title}：${detail}<div class="cutln"><b>${cutTxt}</b>${rule ? `<span>依据　${rule}</span>` : ''}</div>`, 'err');
  renderTop();
  toast(`${title}　${level === 'red' ? '一票否决' : DIMN[dim] + ' −' + cut}`, 'bad');
}
function praise(dim, title, detail) {
  S.praise.push({ dim, title, detail, cut: 8, dimn: DIMN[dim] || dim, t: now() });
  S.score[dim] = (S.score[dim] || 0) + 8;
  say('s', `<span class="tag ok">加分</span>${title}：${detail}<div class="cutln ok"><b>${DIMN[dim] || dim} +8 分</b></div>`, 'ok');
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
  if (S.stage === 'fill') return toast('拟票阶段先把操作票写完并提交审核，签发后再到现场', '');
  if (S.loc === k) return;
  if (k === 'bay') S.bay = null;   // 每次进现场都要自己认间隔，系统不预选
  S.loc = k; S.sel = null;
  $('#scene').innerHTML = sceneSVG(k);
  $('#loctag').textContent = LOC[k].name;
  renderLocbar(); renderPanel(); Sheet.sync();
  if (k === 'bay' && S.stage === 'run') say('s', 'GIS 现场三个间隔外观一样，先看间隔名称牌，确认是培训三线1163间隔再进去。');
  else if (S.stage === 'run' && STEP() && STEP().loc === k && S.beat === 1) {
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

/* SVG 元素到根 svg 的平移量（生成器只用 translate 定位） */
function svgOffset(el) {
  let x = 0, y = 0, n = el;
  while (n && n.tagName !== 'svg') { const m = (n.getAttribute('transform') || '').match(/translate\(\s*([-\d.]+)[ ,]+([-\d.]+)/); if (m) { x += +m[1]; y += +m[2]; } n = n.parentNode; }
  return { x, y };
}
function bindDevs() {
  $$('#panelwrap [data-dev]').forEach(n => bindDevHold(n));
  if (S.dev._t) {
    const tn = $(`#panelwrap [data-dev="${S.dev._t}"]`);
    if (tn) {
      tn.classList.add('tgt');
      try { tn.scrollIntoView({ block: 'center' }); } catch (e) { }
      const st = STEP();
      if (st) {
        const verb = S.beat === 1 ? '手指口述' : (st.ticket.match(/^(拉开|合上|断开|检查|核对|悬挂|切换|将|取下|投入|退出)/) || ['执行'])[0];
        const label = S.beat === 1 ? '手指口述' : verb === '将' ? '切换' : verb;
        if (tn.namespaceURI && tn.namespaceURI.indexOf('svg') >= 0) {
          const svg = tn.ownerSVGElement;
          if (svg && !svg.querySelector('.arlabg')) {
            try {
              const bb0 = tn.getBBox(), off = svgOffset(tn), bb = { x: bb0.x + off.x, y: bb0.y + off.y, width: bb0.width, height: bb0.height }, NS = 'http://www.w3.org/2000/svg';
              const g = document.createElementNS(NS, 'g'); g.setAttribute('class', 'arlabg'); g.setAttribute('pointer-events', 'none');
              const vb = (svg.getAttribute('viewBox') || '0 0 760 400').split(/\s+/).map(Number);
              const tx = `第${st.no}项 · ${label}`, w = tx.length * 11 + 18, x = Math.min(vb[0] + vb[2] - w - 4, Math.max(vb[0] + 4, bb.x + bb.width / 2 - w / 2)), y = Math.max(vb[1] + 2, bb.y - 30);
              g.innerHTML = `<rect x="${x}" y="${y}" width="${w}" height="22" rx="11" fill="#17301f"/><path d="M ${x + w / 2 - 5} ${y + 22} l 5 6 5 -6 z" fill="#17301f"/><text x="${x + w / 2}" y="${y + 15}" text-anchor="middle" font-size="11.5" fill="#fff" font-family="inherit">${tx}</text>`;
              svg.appendChild(g);
            } catch (e) { }
          }
        } else if (!tn.querySelector('.arlab')) {
          tn.insertAdjacentHTML('beforeend', `<span class="arlab"><i>第${st.no}项</i>${label}</span>`);
        }
      }
      if (S.sel === S.dev._t && S.beat === 1 && tn.namespaceURI && tn.namespaceURI.indexOf('svg') >= 0) {
        try {
          const bb0 = tn.getBBox(), off = svgOffset(tn), bb = { x: bb0.x + off.x, y: bb0.y + off.y, width: bb0.width, height: bb0.height }, NS = 'http://www.w3.org/2000/svg';
          const f = document.createElementNS(NS, 'g'); f.setAttribute('class', 'finger'); f.setAttribute('pointer-events', 'none');
          f.setAttribute('transform', `translate(${bb.x + bb.width - 10},${bb.y + bb.height - 6})`);
          f.innerHTML = '<path d="M0 0 c-3 -6 -4 -12 -1 -14 2.4 -1.6 5 0 6 4 l2 6 c4 -1.4 12 -1 13 4 1 6 -3 12 -10 13 -6 1 -9 -3 -10 -13 z" fill="#e8c8a8" stroke="#b98d5e" stroke-width="1.4"/><text x="22" y="4" style="font-size:9px;fill:#a8821b;font-weight:700">已手指</text>';
          tn.ownerSVGElement.appendChild(f);
        } catch (e) { }
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
    else if (b === '1163' && S.stage === 'run') { praise('state', '间隔核对正确', '进入 GIS 现场后先核对间隔名称牌，正确选择培训三线1163间隔'); speak('对，是这个间隔。进去先核对设备双重名称。', { pose: 'confirm', nod: 1 }); }
    S.bay = b; renderPanel();
  });
}
