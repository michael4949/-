/* ===== 陪练关卡引擎（教练在侧 · 学员先动）=====
   原则：教练只交代情境，不列步骤、不给勾选；学员自己决定看什么、做什么、说什么——
   看：点设备走过去看，放大后用自己的话说出读数 / 状态；做：按住按钮、拖动手柄、转动把手才算操作；说：手指口述、汇报、提问、下结论（语音或文字）。
   教练每一步即时回应：做对 → 肯定并推进；做错 / 漏了 → 逐级提示（方向 → 要点 → 答案），不代替学员做；触及红线 → 训练时当场制止，考核时记一票否决并引用依据。
   记录写本机存储（xwt_exams），成绩落到 8 维能力雷达，组长工作台同步。 */

const LS_EXAMS = 'xwt_exams';
function examRecords() { return lsGet(LS_EXAMS, []); }
function examSaveRec(r) { const l = examRecords(); l.unshift(r); lsSet(LS_EXAMS, l.slice(0, 40)); }
function examTasks() { return lsGet(LS_TASKS, []).filter(t => t.exam); }
const EXAM_MODES = {
  teach: { n: '训练模式', d: '教练全程在侧：做对肯定，做错逐级提示（方向 → 要点 → 答案），红线当场制止；提示不扣分' },
  drill: { n: '演练模式', d: '教练在侧但少说：做错才提示，每级提示计入记录并扣分；红线当场制止' },
  exam: { n: '考核模式', d: '教练只交代情境、不提示；错误与红线全部记录，一票否决引用依据，结束后统一复盘' }
};
const ERR_KIND = { red: '红线', order: '错序', miss: '漏项', id: '识别错误', judge: '判断错误', crit: '关键错误', read: '读数错误', ans: '回答不完整' };
const EX_T = ms => Math.max(30, ms * Math.min(1, window.__DH_SPEED || 1));
const HINT_F = [1, .7, .4, 0];
const PRAISE = ['对。', '很好，就是这样。', '这一步做得规范。', '对，继续。', '好，判断正确。', '没错。'];

const EX = { exam: null, mode: 'teach', si: 0, st: {}, goals: {}, wrongs: 0, hints: 0, track: [], errs: [], red: false, t0: 0, log: [], zoom: null, finished: null, task: null, arm: {}, stDone: false, timer: null, dh: null, loc: null, idleT: null, lastAct: 0, praiseI: 0, speakQ: Promise.resolve(), asked: 0 };

/* ---------------- 教练说话 / 对话记录 ---------------- */
function coachSay(text, opt) {
  opt = opt || {};
  EX.log.push({ who: 'coach', t: text, k: opt.k || '', at: now() });
  renderLog();
  const dh = EX.dh;
  if (!dh) { EX.pending = { plain: text.replace(/<[^>]+>/g, ''), opt }; return Promise.resolve(); }
  if (opt.pose) dh.setPose(opt.pose);
  if (opt.nod) setTimeout(() => dh.nod(opt.nod), 100);
  if (opt.shake) setTimeout(() => dh.shake(), 100);
  const plain = text.replace(/<[^>]+>/g, '');
  const p = new Promise(res => { dh.speak(plain, { onEnd: res }); });
  EX.speakQ = p.then(() => { if (opt.pose && opt.rest !== false) dh.setPose('idle'); });
  return p;
}
function meSay(text, k) { EX.log.push({ who: 'me', t: text, k: k || '', at: now() }); renderLog(); }
function praise() { const p = PRAISE[EX.praiseI++ % PRAISE.length]; return p; }
function renderLog() {
  const box = $('#ex_log'); if (!box) return;
  const c = EX.exam ? EX.exam.coach : { short: '教' };
  box.innerHTML = EX.log.slice(-40).map(m => `<div class="msg ${m.who === 'me' ? 'o' : 'j'} ${m.k}"><div class="av">${m.who === 'me' ? '我' : c.short}</div><div class="bd">${m.t}</div></div>`).join('');
  box.scrollTop = box.scrollHeight;
}

/* ---------------- 开始 / 进入情境 ---------------- */
function examStart(id, mode, opt) {
  const ex = EXAMS.find(e => e.id === id); if (!ex) return;
  if (EX.dh) { EX.dh.destroy(); EX.dh = null; }
  Object.assign(EX, { exam: ex, mode: mode || 'teach', si: 0, goals: {}, wrongs: 0, hints: 0, track: [], errs: [], red: false, t0: Date.now(), log: [], zoom: null, finished: null, task: (opt && opt.task) || null, stDone: false, loc: null, lastAct: Date.now(), praiseI: 0, asked: 0 });
  EX.st = ex.init(EX.arm || {});
  if (location.hash !== '#exam') goPage('exam'); else rerenderExam();
  examEnter();
}
function examStation() { return EX.exam ? EX.exam.stations[EX.si] : null; }
function goalOf(id) { const s = examStation(); return s && s.goals ? s.goals.find(g => g.id === id) : null; }
function gState(id) { return EX.goals[id] || (EX.goals[id] = { done: false, hint: 0, wrong: 0, got: 0 }); }
function examEnter() {
  const s = examStation(); if (!s) return;
  EX.goals = {}; EX.zoom = null; EX.stDone = false; EX.lastAct = Date.now();
  if (s.enter) s.enter(EX.st);
  EX.loc = s.locs ? (s.start || Object.keys(s.locs)[0]) : null;
  rerenderExam();
  const brief = typeof s.brief === 'function' ? s.brief(EX.st, EX.mode) : s.brief;
  if (s.type === 'auto') { coachSay(brief, { pose: 'explain' }); examAutoRun(s); return; }
  coachSay(brief, { pose: s.pose || 'explain' });
}
async function examAutoRun(s) {
  for (let i = 0; i < s.items.length; i++) { await new Promise(r => setTimeout(r, EX_T(420))); EX.goals['a' + i] = { done: true }; if (s.apply) s.apply(EX.st, i); const li = $(`#ex_auto li[data-i="${i}"]`); if (li) li.classList.add('on'); }
  await new Promise(r => setTimeout(r, EX_T(500)));
  EX.track.push({ sid: s.id, title: s.title, auto: true, items: s.items.map(t => ({ n: t, ok: true, got: 0, pts: 0 })) });
  examNext();
}
function examNext() {
  if (!EX.exam) return;
  if (EX.si >= EX.exam.stations.length - 1) return examFinish();
  EX.si += 1; examEnter();
}
function examQuit() { if (EX.timer) { clearInterval(EX.timer); EX.timer = null; } if (EX.dh) { EX.dh.destroy(); EX.dh = null; } EX.exam = null; EX.finished = null; rerenderExam(); }
function touch() { EX.lastAct = Date.now(); }

/* ---------------- 记错 / 提示 / 完成目标 ---------------- */
function exErr(kind, o) {
  const s = examStation();
  EX.wrongs += 1;
  const e = { sid: s.id, part: s.part || '', title: s.title, kind, text: o.text || '', click: o.click || '', right: o.right || '', why: o.why || '', fix: o.fix || '', rule: o.rule || s.rule || '', risk: o.risk || s.risk || '', crit: !!o.crit, goal: o.goal || '', at: now() };
  EX.errs.push(e);
  return e;
}
function exCritDialog(e) {
  const m = el('div', 'mask'); m.innerHTML = `<div class="dlg red" style="width:min(640px,96vw)">
    <div class="dh"><b>${e.kind === 'red' ? '一票否决' : '关键错误'} · ${e.title}</b><span class="cls">×</span></div>
    <div class="db"><div class="excrit">
      <div><label>步骤</label>${e.part ? e.part + ' · ' : ''}${e.title}${e.click ? `　实际操作：${e.click}` : ''}</div>
      <div><label>风险</label>${e.risk || '—'}</div>
      <div><label>依据</label>${e.rule || '—'}</div>
      <div><label>纠正动作</label>${e.fix || '—'}</div>
      ${e.kind === 'red' ? '<div class="tk3">本次成绩按一票否决记 0 分；纠正后继续完成，过程全部进入复盘。</div>' : '<div class="tk3">关键错误已进入记录；回到当前步骤重新操作。</div>'}
    </div></div>
    <div class="df"><button class="btn pri" id="exc_ok">回到当前步骤</button></div></div>`;
  document.body.appendChild(m); m.querySelector('.cls').onclick = m.querySelector('#exc_ok').onclick = () => m.remove();
}
/* 逐级提示：方向 → 要点 → 答案（训练免费；演练计入并扣分；考核不给） */
function exHint(g, auto) {
  if (!g || EX.mode === 'exam') { if (EX.mode === 'exam' && !auto) coachSay('考核模式下我不提示，按你的判断做。', { pose: 'listen' }); return; }
  const gs = gState(g.id); const lv = Math.min(gs.hint, 2);
  gs.hint = Math.min(3, gs.hint + 1); EX.hints += 1;
  const txt = (g.hints || [])[lv] || g.n;
  coachSay(`<i class="exhl">提示 ${lv + 1}</i>${txt}`, { pose: 'point', k: 'hint' });
  if (EX.mode === 'teach' && lv >= 1) { rerenderScene(); }
}
function nextGoal() {
  const s = examStation(); if (!s || !s.goals) return null;
  return s.goals.find(g => !gState(g.id).done && (g.after || []).every(a => gState(a).done)) || s.goals.find(g => !gState(g.id).done);
}
function goalDone(g, txt, o) {
  o = o || {};
  const gs = gState(g.id); gs.done = true;
  const f = HINT_F[Math.min(3, gs.hint + (EX.mode === 'exam' ? Math.min(2, gs.wrong) : 0))];
  gs.got = +((g.pts || 0) * f).toFixed(2);
  const line = `${o.noPraise ? '' : praise()}${txt || g.praise || ''}`;
  coachSay(line, { pose: 'nod', nod: 1 });
  const s = examStation();
  rerenderScene();
  if (s.goals.every(x => gState(x.id).done)) stationDone();
  else if (g.next) { const nx = typeof g.next === 'function' ? g.next(EX.st, EX.mode) : g.next; if (nx) EX.speakQ.then(() => coachSay(nx, { pose: 'explain' })); }
}
function stationDone() {
  const s = examStation(); if (EX.stDone) return;
  EX.stDone = true;
  const items = s.goals.map(g => { const gs = gState(g.id); return { id: g.id, n: g.n, ok: gs.wrong === 0 && gs.hint === 0, hint: gs.hint, wrong: gs.wrong, got: gs.got, pts: g.pts || 0 }; });
  const got = +items.reduce((a, i) => a + i.got, 0).toFixed(2), pts = +items.reduce((a, i) => a + i.pts, 0).toFixed(2);
  const ratio = pts ? got / pts : (items.every(i => i.ok) ? 1 : items.some(i => i.hint < 3 && i.wrong < 2) ? .6 : 0);
  EX.track.push({ sid: s.id, part: s.part || '', title: s.title, items, got, pts, ratio });
  if (s.after) s.after(EX.st);
  const outro = typeof s.outro === 'function' ? s.outro(EX.st, EX.mode) : s.outro;
  const go = () => { if (EX.exam && EX.stDone) examNext(); };
  if (outro) EX.speakQ.then(() => coachSay(outro, { pose: 'confirm' }).then(() => setTimeout(go, EX_T(700))));
  else EX.speakQ.then(() => setTimeout(go, EX_T(700)));
  rerenderScene();
}

/* ---------------- 学员动作 ①：看（走到设备前，放大观察，用自己的话说出读数 / 状态） ---------------- */
function examLook(dev) {
  const s = examStation(); if (!s || EX.stDone) return; touch();
  const sp = s.spots && s.spots[dev]; if (!sp) return;
  if (sp.walk) { sp.walk(EX.st); }
  if (sp.zoom) { EX.zoom = dev; renderZoom(); }
  const g = s.goals.find(x => (x.kind === 'look' || x.kind === 'op') && (x.dev || []).includes(dev) && !gState(x.id).done);
  if (g && g.kind === 'op' && !sp.zoom) return;
  if (!g) {
    if (sp.crit && (sp.critOn ? sp.critOn(EX.st) : true)) { const e = exErr('crit', { text: sp.bad || `${sp.n}不是现在要操作的设备。`, click: sp.n, right: (nextGoal() || {}).n || '', fix: sp.fix || '', risk: sp.risk || '', rule: sp.rule || '', crit: true }); coachSay(sp.bad || '停，这不是你现在要动的设备。', { pose: 'stop', shake: true, k: 'bad' }); exCritDialog(e); return; }
    if (EX.mode !== 'exam') coachSay(sp.bad || `${sp.n}。这不是你现在要看的。`, { pose: 'correct', k: 'bad' });
    else if (sp.bad && sp.always) coachSay(sp.bad, { pose: 'correct', k: 'bad' });
    return;
  }
  if (g.kind === 'op') return;                    // 操作类：在放大画面里按住 / 拖动
  gState(g.id).seen = true;
  if (!sp.zoom) { coachSay(g.ask || '看到什么，说出来。', { pose: 'listen' }); }
}
function renderZoom() {
  const s = examStation(), dev = EX.zoom, sp = s.spots[dev]; const z = $('#ex_zoom'); if (!z) return;
  const g = s.goals.find(x => (x.dev || []).includes(dev) && !gState(x.id).done);
  const title = EX.mode === 'exam' && !sp.plain ? '观察' : sp.n;
  z.hidden = false;
  z.innerHTML = `<div class="exzb"><div class="exzh"><b>${title}</b><span class="tk3">${g && g.kind === 'op' ? (g.opHint || '按住操作') : '看清楚后，用自己的话说出来'}</span><span class="cls" data-zclose="1">×</span></div>${sp.zoom(EX.st, EX.mode)}
    ${g && g.kind === 'op' ? '' : `<div class="exzv"><input id="ex_zsay" class="exin wide" autocomplete="off" placeholder="${g && g.ask ? g.ask : '你看到的读数 / 状态是…'}"><button class="exmic" data-exmic="#ex_zsay" title="语音">●</button><button class="btn pri" data-zsay="1">说</button></div>`}</div>`;
  exBindOps(z);
  const i = $('#ex_zsay'); if (i) setTimeout(() => i.focus(), 30);
}
function exCloseZoom() { EX.zoom = null; const z = $('#ex_zoom'); if (z) { z.hidden = true; z.innerHTML = ''; } }

/* ---------------- 学员动作 ②：做（按住 / 拖动 / 转动才算操作） ---------------- */
function exBindOps(root) {
  root.querySelectorAll('[data-op]').forEach(h => {
    if (h._bound) return; h._bound = true;
    let t0 = 0, raf = 0, ring = null;
    const dur = EX_T(900);
    const start = e => {
      const s = examStation(); if (!s || EX.stDone) return;
      e.preventDefault(); try { h.setPointerCapture(e.pointerId); } catch (x) { }
      t0 = performance.now();
      const bb = h.getBBox(); const cx = bb.x + bb.width / 2, cy = bb.y + bb.height / 2, r = Math.max(bb.width, bb.height) / 2 + 8;
      ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      ring.setAttribute('cx', cx); ring.setAttribute('cy', cy); ring.setAttribute('r', r); ring.setAttribute('class', 'opring');
      ring.setAttribute('stroke-dasharray', `${2 * Math.PI * r}`); ring.setAttribute('stroke-dashoffset', `${2 * Math.PI * r}`);
      h.appendChild(ring);
      const step = () => { const p = Math.min(1, (performance.now() - t0) / dur); ring.setAttribute('stroke-dashoffset', `${2 * Math.PI * r * (1 - p)}`); if (p >= 1) { cancel(); exOp(h.dataset.op); return; } raf = requestAnimationFrame(step); };
      raf = requestAnimationFrame(step);
    };
    const cancel = () => { if (raf) cancelAnimationFrame(raf); raf = 0; if (ring && ring.parentNode) ring.remove(); ring = null; };
    h.addEventListener('pointerdown', start);
    h.addEventListener('pointerup', cancel); h.addEventListener('pointercancel', cancel); h.addEventListener('pointerleave', cancel);
  });
}
/* 执行一次操作：op = 'dev:action'。先查前置：训练 / 演练当场制止，考核记红线并复位 */
function exOp(op) {
  const s = examStation(); if (!s || EX.stDone) return; touch();
  const [dev, action] = op.split(':');
  const g = s.goals.find(x => x.kind === 'op' && x.op === op && !gState(x.id).done);
  if (!g) {
    const bad = s.goals.find(x => x.kind === 'op' && x.op === op);
    const sp = s.spots && s.spots[dev];
    if (bad && gState(bad.id).done) return coachSay('这个操作已经做过了。', { pose: 'listen' });
    const text = (s.badOps && s.badOps[op]) || (sp && sp.bad) || '这不是现在该做的操作。';
    const crit = !!(s.critOps && s.critOps[op]);
    const e = exErr(crit ? 'crit' : 'order', { text, click: sp ? sp.n + '·' + action : op, right: (nextGoal() || {}).n || '', fix: s.fix || '', crit });
    exCloseZoom(); coachSay(text, { pose: 'stop', shake: true, k: 'bad' }); if (crit) exCritDialog(e); return;
  }
  const missing = (g.after || []).filter(a => !gState(a).done);
  if (missing.length) {
    exCloseZoom();
    const names = missing.map(a => (goalOf(a) || {}).n).join('、');
    if (g.red) {
      if (EX.mode === 'exam') {
        EX.red = true; if (g.act) g.act(EX.st);
        const e = exErr('red', { text: g.red.text, click: g.n, right: names, why: g.red.why, fix: g.red.fix, rule: g.red.rule, risk: g.red.risk, crit: true, goal: g.id });
        gState(g.id).wrong += 1;
        coachSay(`<b>停。</b>${g.red.text}依据：${g.red.rule}。${g.red.reset || '现在复位，按正确顺序重新来。'}`, { pose: 'stop', shake: true, k: 'red' });
        if (g.red.undo) g.red.undo(EX.st);
        exCritDialog(e); rerenderScene(); return;
      }
      gState(g.id).wrong += 1; gState(g.id).hint = Math.max(gState(g.id).hint, 1);
      exErr('order', { text: g.red.text, click: g.n, right: names, why: g.red.why, fix: g.red.fix, rule: g.red.rule, risk: g.red.risk, goal: g.id });
      coachSay(`<b>停！</b>${g.red.stop || g.red.text}${EX.mode === 'teach' ? ' 先把' + names + '做完。' : ''}`, { pose: 'stop', shake: true, k: 'red' });
      return;
    }
    gState(g.id).wrong += 1;
    exErr('order', { text: `顺序不对：${g.n}之前还有 ${names} 没做。`, click: g.n, right: names, goal: g.id });
    coachSay(EX.mode === 'exam' ? '先想想顺序。' : `先别急。${g.n}之前，${names}还没做。`, { pose: 'correct', shake: true, k: 'bad' });
    return;
  }
  if (g.act) g.act(EX.st);
  exCloseZoom();
  goalDone(g, g.praise);
}
function exBindDrag(svg) {
  const h = svg.querySelector('[data-handle]'); if (!h) return;
  const pt = e => { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()); };
  let on = false; h.style.cursor = 'grab';
  h.onpointerdown = e => { on = true; try { h.setPointerCapture(e.pointerId); } catch (x) { } e.preventDefault(); touch(); };
  h.onpointermove = e => { if (!on) return; const p = pt(e); const ang = Math.atan2(p.x - 440, -(p.y - 300)) * 180 / Math.PI; const pct = Math.max(0, Math.min(100, ang / 90 * 100)); EX.st.handle = pct; h.setAttribute('transform', `rotate(${-90 * pct / 100})`); const f = svg.querySelector('#exbar_fill'), t = svg.querySelector('#exbar_txt'); if (f) { f.setAttribute('width', 272 * pct / 100); f.setAttribute('fill', pct >= 90 ? '#23b26a' : '#e8b22a'); } if (t) t.textContent = pct >= 90 ? '全开位置' : pct > 8 ? `开度 ${Math.round(pct)}%` : '关闭位置'; };
  h.onpointerup = h.onpointercancel = () => { if (!on) return; on = false; examDragEnd(); };
}
function examDragEnd() {
  const s = examStation(); if (!s || EX.stDone) return;
  const g = s.goals.find(x => x.kind === 'drag' && !gState(x.id).done); if (!g) return;
  const h = EX.st.handle || 0;
  if (h >= g.min) { if (g.act) g.act(EX.st); return goalDone(g, g.praise); }
  if (h > 5) { const gs = gState(g.id); if (!gs.wrong) { gs.wrong = 1; exErr('miss', { text: g.part_text || '手动阀未完全开启。', click: `手柄停在 ${Math.round(h)}%`, right: `全开位置（≥ ${g.min}%）`, fix: g.fix || '继续拖到全开', goal: g.id }); } coachSay(g.part_say || '还没到全开，继续。', { pose: 'point', k: 'bad' }); }
}

/* ---------------- 学员动作 ③：说（口述、汇报、提问、下结论） ---------------- */
function examSay(text, fromZoom) {
  const s = examStation(); if (!s || EX.stDone) return; touch();
  text = (text || '').trim(); if (!text) return;
  meSay(text);
  const t = text.replace(/\s+/g, '');
  /* 提问 → 知识库召回 */
  if (/[?？]|为什么|为何|怎么|什么是|是否|能不能|可以吗|要不要/.test(t) && !/^(我|现在|已|确认|检查)/.test(t) && !s.goals.some(g => g.kind === 'qa' && !gState(g.id).done)) {
    const r = typeof retrieve === 'function' ? retrieve(text) : null; EX.asked += 1;
    coachSay(`${r && r.text ? r.text : '这个问题我一时说不准，先按规程做。'}<div class="exkb">依据 ${r && r.src ? r.src : '知识库'}</div>`, { pose: 'explain' });
    return;
  }
  if (/^(提示|给我提示|提示一下|怎么做|下一步|不知道)/.test(t)) { return exHint(nextGoal()); }
  /* 按目标匹配 */
  const zoomDev = fromZoom ? EX.zoom : null;
  const cands = s.goals.filter(g => !gState(g.id).done && (g.kind === 'look' || g.kind === 'say' || g.kind === 'qa'));
  let hit = null, verdict = null;
  for (const g of cands) {
    if (g.kind === 'look' && zoomDev && !(g.dev || []).includes(zoomDev)) continue;
    if (g.kind === 'look' && !zoomDev && !gState(g.id).seen && !(g.re && g.re.test(t))) continue;
    const v = g.val ? g.val(t, EX.st) : (g.re && g.re.test(t) ? 'ok' : null);
    if (v) { hit = g; verdict = v; break; }
  }
  if (!hit) {
    /* 想做的操作先说出来：口述目标 → 教练回应 */
    const opG = s.goals.find(g => g.kind === 'op' && !gState(g.id).done && g.re && g.re.test(t));
    if (opG) { const missing = (opG.after || []).filter(a => !gState(a).done); if (missing.length) { gState(opG.id).wrong += 0; coachSay(EX.mode === 'exam' ? '你确定顺序对了？' : `先别急，${missing.map(a => (goalOf(a) || {}).n).join('、')}还没做。`, { pose: 'correct', k: 'bad' }); } else coachSay(`可以，动手做。`, { pose: 'confirm' }); return; }
    if (fromZoom) { const g = s.goals.find(x => (x.dev || []).includes(zoomDev)); if (g && gState(g.id).done) return coachSay('这一处你已经确认过了。', { pose: 'listen' }); }
    /* 说出想看的设备：走过去（切换地点），看到什么再说 */
    const intent = cands.find(g => g.kind === 'look' && g.re && g.re.test(t));
    if (intent) { if (intent.loc && EX.loc !== intent.loc && s.locs && s.locs[intent.loc]) { EX.loc = intent.loc; exCloseZoom(); rerenderScene(); } coachSay(intent.go || '去看。看到什么，说出来。', { pose: 'point' }); return; }
    coachSay(EX.mode === 'exam' ? '我没听清，说清楚你看的是哪个设备、什么状态。' : `我没听清。说清楚你看的是哪个设备、什么状态${fromZoom ? '' : '，或者先走到设备前看'}。`, { pose: 'listen' });
    return;
  }
  const gs = gState(hit.id);
  if (verdict === 'ok') {
    exCloseZoom();
    if (hit.kind === 'say' && hit.needAll) {
      const missing = (hit.after || []).filter(a => !gState(a).done);
      if (missing.length) { gs.wrong += 1; const names = missing.map(a => (goalOf(a) || {}).n).join('、'); exErr('miss', { text: hit.missText || `下结论前还有 ${names} 没有检查。`, click: text.slice(0, 40), right: names, fix: hit.fix || '', goal: hit.id, rule: s.rule, risk: s.risk }); coachSay(EX.mode === 'exam' ? (hit.missSay || '你确定都看全了？') : `${hit.missSay || '还不能下结论。'}${names}还没看。`, { pose: 'correct', shake: true, k: 'bad' }); return; }
    }
    if (hit.onOk) hit.onOk(EX.st);
    goalDone(hit, typeof hit.praise === 'function' ? hit.praise(EX.st) : hit.praise);
    return;
  }
  /* 说错了：读数 / 判断错误 → 教练纠正 + 自动提示 */
  gs.wrong += 1;
  const crit = !!(hit.critOnBad && (typeof hit.critOnBad === 'function' ? hit.critOnBad(EX.st) : true));
  const e = exErr(hit.kind === 'qa' ? 'ans' : crit ? 'crit' : (hit.badKind || 'judge'), { text: typeof hit.badText === 'function' ? hit.badText(EX.st) : (hit.badText || '判断与实际状态不符。'), click: text.slice(0, 40), right: typeof hit.right === 'function' ? hit.right(EX.st) : (hit.right || hit.n), fix: hit.fix || '', why: hit.why || '', goal: hit.id, crit, rule: hit.rule || s.rule, risk: hit.risk || s.risk });
  const say = typeof hit.badSay === 'function' ? hit.badSay(EX.st) : (hit.badSay || '再看一眼。');
  coachSay(say, { pose: 'correct', shake: true, k: 'bad' });
  if (crit) exCritDialog(e);
  if (EX.mode !== 'exam' && gs.wrong >= 1 && gs.hint < 3) EX.speakQ.then(() => exHint(hit, true));
}

/* ---------------- 语音：联网时浏览器识别（结果可改再说）；离线降级文字 ---------------- */
function examMic(btn, inputSel) {
  const inp = $(inputSel); if (!inp) return;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (EX.rec) { try { EX.rec.stop(); } catch (e) { } EX.rec = null; btn.classList.remove('rec'); return; }
  if (SR && navigator.onLine) {
    try {
      const r = new SR(); r.lang = 'zh-CN'; r.interimResults = true; r.continuous = false;
      r.onresult = e => { inp.value = Array.from(e.results).map(x => x[0].transcript).join(''); };
      r.onend = () => { btn.classList.remove('rec'); EX.rec = null; };
      r.onerror = () => { btn.classList.remove('rec'); EX.rec = null; toast('语音识别未能启动，请改用文字输入', 'bad'); };
      btn.classList.add('rec'); r.start(); EX.rec = r; return;
    } catch (e) { }
  }
  btn.classList.add('rec'); toast('当前离线，语音识别不可用，请在文字框中输入', '');
  setTimeout(() => btn.classList.remove('rec'), 1400); inp.focus();
}

/* ---------------- 结束：评分 · 8 维 · 落盘 · 建议 ---------------- */
function examFinish() {
  const ex = EX.exam;
  const raw = +EX.track.reduce((a, t) => a + (t.got || 0), 0).toFixed(1);
  const acc = {}; DIMK.forEach(k => acc[k] = { w: 0, v: 0 });
  EX.track.forEach(t => { const s = ex.stations.find(x => x.id === t.sid); if (!s || !s.dims) return; const r = t.ratio != null ? t.ratio : 1; Object.keys(s.dims).forEach(k => { acc[k].w += s.dims[k]; acc[k].v += s.dims[k] * r; }); });
  const dims = {}; DIMK.forEach(k => { dims[k] = acc[k].w ? Math.round(100 * acc[k].v / acc[k].w) : null; });
  const dur = Math.max(1, Math.round((Date.now() - EX.t0) / 60000));
  const rec = { id: 'E' + Date.now(), ts: Date.now(), who: HOME_USER.name, exam: ex.id, examName: ex.n, short: ex.short, mode: EX.mode, modeName: EXAM_MODES[EX.mode].n, dur, raw, score: EX.red ? 0 : raw, max: ex.max, pass: ex.pass, red: EX.red, track: EX.track, errs: EX.errs, hints: EX.hints, asked: EX.asked, dims, ver: versionStamp(ex.id), task: EX.task, reviewer: '', log: EX.log.slice(-80) };
  rec.sugg = examSugg(rec);
  examSaveRec(rec);
  if (EX.task) { const l = lsGet(LS_TASKS, []); const t = l.find(x => x.id === EX.task); if (t) { t.done = (t.done || 0) + 1; t.results = (t.results || []).concat([{ who: rec.who, score: rec.score, red: rec.red, id: rec.id }]); lsSet(LS_TASKS, l); } }
  if (typeof hoursAdd === 'function') hoursAdd(`${ex.short}（陪练关卡学时）`, 1);
  EX.finished = rec; EX.exam = null; if (EX.timer) { clearInterval(EX.timer); EX.timer = null; } if (EX.dh) { EX.dh.destroy(); EX.dh = null; }
  rerenderExam();
}
function examSugg(rec) {
  const out = []; const byDim = {};
  rec.errs.forEach(e => { const s = (EXAMS.find(x => x.id === rec.exam) || { stations: [] }).stations.find(x => x.id === e.sid); const k = s && s.dims ? Object.keys(s.dims).sort((a, b) => s.dims[b] - s.dims[a])[0] : null; if (!k) return; (byDim[k] = byDim[k] || []).push(e); });
  Object.keys(byDim).forEach(k => { const a = abilityOf(k); const kinds = Array.from(new Set(byDim[k].map(e => ERR_KIND[e.kind]))); out.push({ dim: k, t: `「${a.n}」出现${kinds.join('、')} ${byDim[k].length} 次：${byDim[k][0].text.replace(/<[^>]+>/g, '').slice(0, 40)}`, exam: rec.exam, act: `复练「${rec.short}」相关步骤` }); });
  const hinted = rec.track.flatMap(t => (t.items || []).filter(i => i.hint >= 2).map(i => i.n));
  if (hinted.length) out.push({ dim: null, t: `以下步骤靠提示才完成：${hinted.slice(0, 3).join('、')}`, exam: rec.exam, act: '不看提示再练一遍' });
  DIMK.forEach(k => { if (rec.dims[k] != null && rec.dims[k] < 70 && !byDim[k]) out.push({ dim: k, t: `「${abilityOf(k).n}」本次 ${rec.dims[k]} 分，低于 70`, exam: DIM_EXAM[abilityOf(k).n] || rec.exam, act: `安排「${(EXAMS.find(x => x.id === (DIM_EXAM[abilityOf(k).n] || rec.exam)) || {}).short}」专项` }); });
  if (!out.length) out.push({ dim: null, t: '各步骤均一次做对、未用提示，建议转入考核模式或下一关卡。', exam: rec.exam === 'rain' ? 'e1163' : 'rain', act: '进入下一关卡' });
  return out;
}

/* ---------------- 渲染 ---------------- */
function rerenderExam() { const pg = $('#hpage'); if (!pg || location.hash !== '#exam') return; pg.innerHTML = pageExam(); examAfter(); }
function curScene(s) {
  if (s.locs && EX.loc) return s.locs[EX.loc];
  if (s.scene) return s.scene;
  const prev = EX.exam.stations.slice(0, EX.si).reverse().find(x => x.scene || x.locs);
  if (!prev) return null;
  return prev.locs ? prev.locs[EX.loc && prev.locs[EX.loc] ? EX.loc : Object.keys(prev.locs)[0]] : prev.scene;
}
function exSceneSvg(s) {
  const sc = curScene(s);
  const inner = sc ? sc(EX.st, s.sceneOpt ? s.sceneOpt(EX.st) : undefined) : '';
  return `<svg viewBox="0 0 960 540" class="exsvg" id="ex_svgroot">${inner}</svg>`;
}
function rerenderScene() { const s = examStation(); const box = $('#ex_svg'); if (!s || !box) return; box.innerHTML = exSceneSvg(s); const lb = $('#ex_locbar'); if (lb) lb.innerHTML = exLocBar(s); exMarkScene(); }
function exLocBar(s) {
  if (!s.locs) return '';
  return Object.keys(s.locs).map(k => `<span class="exloc ${EX.loc === k ? 'on' : ''}" data-exloc="${k}">${s.locNames[k]}</span>`).join('');
}
function exMarkScene() {
  const s = examStation(); const svg = $('#ex_svgroot'); if (!svg || !s) return;
  s.goals.forEach(g => { if (!gState(g.id).done) return; (g.dev || []).forEach(dev => { const el = svg.querySelector(`[data-hs="${dev}"]`); if (!el) return; el.classList.add('done'); const r = el.querySelector('.hsr'); if (r) el.insertAdjacentHTML('beforeend', SC.check(+r.getAttribute('x') + +r.getAttribute('width') - 8, +r.getAttribute('y') + 8)); }); });
  if (EX.mode === 'teach') s.goals.forEach(g => { const gs = gState(g.id); if (gs.done || gs.hint < 2) return; (g.dev || []).forEach(dev => { const el = svg.querySelector(`[data-hs="${dev}"]`); if (el) el.classList.add('tgt'); }); });
  exBindOps(svg);
  if (s.goals.some(g => g.kind === 'drag')) exBindDrag(svg);
}
function pageExam() {
  if (EX.finished) return examReviewHtml(EX.finished, true);
  if (!EX.exam) return examEntryHtml();
  const ex = EX.exam, s = examStation(), N = ex.stations.length;
  const got = +EX.track.reduce((a, t) => a + (t.got || 0), 0).toFixed(1);
  return `<div class="exwrap">
    <div class="exhead hg">
      <div class="exh1"><b>${ex.n}</b><span>${s.part ? s.part + ' · ' : ''}第 ${EX.si + 1}/${N} 步 · ${EXAM_MODES[EX.mode].n}</span></div>
      <div class="exkpis"><div class="kpi"><b id="ex_time">00:00</b><span>用时</span></div>${EX.mode !== 'exam' ? `<div class="kpi ${EX.red ? 'bad' : ''}"><b>${EX.red ? 0 : got}/${ex.max}</b><span>得分</span></div><div class="kpi"><b>${EX.hints}</b><span>提示</span></div>` : ''}<div class="kpi ${EX.errs.length ? 'warn' : ''}"><b>${EX.errs.length}</b><span>错误</span></div>${EX.red ? '<div class="kpi bad"><b>否决</b><span>红线</span></div>' : ''}</div>
      <div class="exprog">${ex.stations.map((x, i) => `<i class="${i < EX.si ? 'done' : i === EX.si ? 'cur' : ''}"></i>`).join('')}</div>
      <button class="btn sm" data-exquit="1">退出</button>
    </div>
    <div class="exmain coach">
      <div class="exscene hg ${EX.mode}">
        <div class="exlocbar" id="ex_locbar">${exLocBar(s)}</div>
        <div class="exsvgbox" id="ex_svg">${exSceneSvg(s)}</div><div class="exzoom" id="ex_zoom" hidden></div>
        ${s.type === 'auto' ? `<ol class="exauto" id="ex_auto">${s.items.map((t, i) => `<li data-i="${i}" class="${EX.goals['a' + i] ? 'on' : ''}">${t}</li>`).join('')}</ol>` : `
        <div class="exsay"><span class="exsayl">手指口述 · 汇报</span><input id="ex_say" class="exin wide" autocomplete="off" placeholder="说出你现在要做什么、看到什么、下什么结论（可点麦克风口述）"><button class="exmic" data-exmic="#ex_say" title="语音">●</button><button class="btn pri" data-exsay="1">说</button></div>`}
      </div>
      <aside class="excoach">
        <div class="hcard hg excoachcard"><div class="exdhwrap"><div id="exdh"></div></div><div class="excoachnm"><b>${ex.coach.name}</b><span>${ex.coach.role} · 陪练教练</span></div></div>
        <div class="hcard hg exlogcard"><div class="hch"><b>教练在侧</b><span>做对推进 · 做错提示</span></div><div class="hcb exlog" id="ex_log"></div>
          <div class="exlogbtns">${EX.mode !== 'exam' ? `<button class="btn sm" data-exhint="1">给我提示${EX.mode === 'drill' ? '（计入）' : ''}</button>` : ''}${EX.mode === 'teach' ? `<button class="btn sm" data-exanswer="1">我该做什么</button>` : ''}<button class="btn sm" data-exask="1">问教练</button></div></div>
      </aside>
    </div></div>`;
}
function examAfter() {
  if (!EX.exam) { if (EX.timer) { clearInterval(EX.timer); EX.timer = null; } if (EX.dh) { EX.dh.destroy(); EX.dh = null; } return; }
  exMarkScene();
  const mount = $('#exdh');
  if (mount && (!EX.dh || EX.dh.dead || !mount.contains(EX.dh.n && EX.dh.n.pav))) { if (EX.dh) EX.dh.destroy(); EX.dh = new DigitalHuman('exdh', EX.exam.coach.key); if (EX.pending) { const pd = EX.pending; EX.pending = null; if (pd.opt.pose) EX.dh.setPose(pd.opt.pose); EX.speakQ = new Promise(res => EX.dh.speak(pd.plain, { onEnd: res })).then(() => EX.dh && EX.dh.setPose('idle')); } }
  renderLog();
  if (!EX.timer) EX.timer = setInterval(() => {
    const t = $('#ex_time'); if (!t) return; const d = Math.round((Date.now() - EX.t0) / 1000); t.textContent = `${String(Math.floor(d / 60)).padStart(2, '0')}:${String(d % 60).padStart(2, '0')}`;
    /* 卡住：教练主动开口（训练 / 演练；测试提速时停用） */
    if (EX.exam && !EX.stDone && EX.mode !== 'exam' && (window.__DH_SPEED || 1) >= 1 && Date.now() - EX.lastAct > 26000 && !(EX.dh && EX.dh.speaking) && !document.querySelector('.mask')) { EX.lastAct = Date.now(); const g = nextGoal(); if (g) { coachSay(g.nudge || `${HOME_USER.name}，想一想下一步。`, { pose: 'point' }); } }
  }, 1000);
  const i = $('#ex_say'); if (i) i.focus();
}

/* ---------------- 入口页 ---------------- */
function examEntryHtml() {
  const recs = examRecords().filter(r => r.who === HOME_USER.name);
  const tasks = examTasks().filter(t => !t.results || !t.results.some(r => r.who === HOME_USER.name));
  const cl = confirmLog();
  return `<div class="ppage">
    <div class="ph"><b>陪练关卡</b><span>教练全程在侧：你先动手、先开口，做对推进，做错提示 · 语音或文字口述 · 按住 / 拖动才算操作 · 成绩落到能力雷达并同步组长工作台</span></div>
    ${tasks.length ? `<section class="hcard ho"><div class="hch"><b>待练任务</b><span>班组长下发</span></div><div class="hcb">${tasks.map(t => `<div class="hrow"><b>${t.examName || t.plan}</b> <span class="tk3">${t.from} 下发 · ${t.due}截止 · ${t.mode} · 及格 ${t.pass}${t.dims && t.dims.length ? ' · 针对 ' + t.dims.join('、') : ''}</span> <button class="btn sm pri" data-exstart="${t.exam}" data-exmode="${t.mode === '考核模式' ? 'exam' : t.mode === '演练模式' ? 'drill' : 'teach'}" data-extask="${t.id}">开始</button></div>`).join('')}</div></section>` : ''}
    <div class="exgrid">
      ${EXAMS.map(ex => { const c = cl.find(x => x.id === ex.id); const my = recs.filter(r => r.exam === ex.id); const best = my.length ? Math.max(...my.map(r => r.score)) : null; return `
      <section class="hcard hg excard"><div class="hch"><b>${ex.n}</b><span>${ex.src}</span></div><div class="hcb">
        <div class="exbg">${ex.bg}</div>
        <div class="exmeta"><span>教练：${ex.coach.name} · ${ex.coach.role}</span><span>${ex.stations.filter(s => s.type !== 'auto').length} 个情境</span><span>${ex.max} 分制 · 及格 ${ex.pass}</span><span>${my.length ? `已练 ${my.length} 次 · 最高 ${best}` : '未练'}</span></div>
        <div class="exdims">${ex.cover.map(k => `<i>${abilityOf(k).n}</i>`).join('')}</div>
        <div class="tk3">评分表 ${c.ver} · ${c.st === 'ok' ? `已审定：${c.who} ${c.date}` : c.st === 'sent' ? '已提交审定，待安全专家确认' : '待安全专家审定'}</div>
        <div class="exmodes">${Object.keys(EXAM_MODES).map(k => `<label class="exmode"><input type="radio" name="exm_${ex.id}" value="${k}" ${k === 'teach' ? 'checked' : ''}><b>${EXAM_MODES[k].n}</b><span>${EXAM_MODES[k].d}</span></label>`).join('')}</div>
        <button class="btn pri" data-exstart="${ex.id}">开始</button>
      </div></section>`; }).join('')}
    </div>
    <section class="hcard ho"><div class="hch"><b>我的陪练记录</b><span>${recs.length} 条 · 本机保存，刷新后可回看 · 已同步到组长工作台</span></div><div class="hcb">
      ${recs.length ? `<table class="htbl"><tr><th>时间</th><th>关卡</th><th>模式</th><th>得分</th><th>提示</th><th>错误</th><th>复核</th><th></th></tr>${recs.map(r => `<tr><td class="mono">${stampOf(r.ts)}</td><td>${r.short}</td><td>${r.modeName}</td><td class="mono ${r.red ? 'wv' : r.score >= r.pass ? 'gv' : 'wv'}">${r.red ? '0（否决）' : r.score}/${r.max}</td><td class="mono">${r.hints || 0}</td><td class="mono">${r.errs.length}</td><td>${r.reviewer ? `<span class="tag ok">${r.reviewer}</span>` : '<span class="tag wn">待班组长复核</span>'}</td><td><button class="btn sm" data-exreview="${r.id}">查看复盘</button></td></tr>`).join('')}</table>` : '<div class="tk3">还没有陪练记录。</div>'}</div></section>
  </div>`;
}
function stampOf(ts) { const d = new Date(ts); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }

/* ---------------- 复盘页 ---------------- */
function examReviewHtml(r, fresh) {
  const dimsArr = DIMK.map(k => r.dims[k] == null ? 0 : r.dims[k]);
  const ex = EXAMS.find(x => x.id === r.exam) || { coach: { short: '教' } };
  return `<div class="ppage">
    <div class="ph"><b>${fresh ? '本次陪练复盘' : '陪练复盘'}</b><span>${r.examName} · ${r.modeName} · ${stampOf(r.ts)} · ${r.who}</span>
      <span class="phr">${fresh ? `<button class="btn" data-exstart="${r.exam}" data-exmode="${r.mode}">再练一次</button>` : ''}<button class="btn" data-exquit="1">回关卡列表</button>${ROLE.cur === 'lead' ? '<button class="btn" data-go="team">回组长工作台</button>' : '<button class="btn" data-go="home">回工作台</button>'}</span></div>
    <section class="hcard rvhead hg"><div class="rvscore"><div class="rvbig ${r.red || r.score < r.pass ? 'wv' : ''}">${r.red ? 0 : r.score}<small>/${r.max}</small></div><div class="tk3">${r.red ? '触发一票否决，成绩记 0' : r.score >= r.pass ? '及格' : '未及格'} · 及格线 ${r.pass}</div>
        <div class="rvkpis"><span><b>${r.dur}</b>分钟</span><span><b>${r.hints || 0}</b>提示</span><span><b>${r.errs.length}</b>错误</span><span><b>${r.errs.filter(e => e.crit).length}</b>关键错误</span><span><b>${r.asked || 0}</b>提问</span></div>
        <div class="exver"><div><label>操作票版本</label>${r.ver.ticket}</div><div><label>规则版本</label>${r.ver.rule}</div><div><label>知识依据版本</label>${r.ver.kb}</div><div><label>训练时间</label>${r.ver.time}</div><div><label>复核人</label>${r.reviewer || '待班组长复核'}</div></div></div>
      <div class="rvradar">${chRadar(DIMS, dimsArr, RADAR_PREV, { w: 330, h: 240, l1: '本次', l2: '上月', key: 'x' })}<div class="tk3" style="text-align:center">本次落到 8 维能力 · 未覆盖维度记 0 不计入现值</div></div></section>
    <div class="gtwo">
      <section class="hcard hg"><div class="hch"><b>完整操作轨迹</b><span>一次做对 / 提示后完成 / 出错</span></div><div class="hcb"><table class="htbl extrack">
        ${r.track.map(t => t.auto ? `<tr class="auto"><td colspan="3">系统完成：${t.items.map(i => i.n).join('、')}</td></tr>` : `<tr><td><b>${t.part ? t.part + ' · ' : ''}${t.title}</b><div class="tk3">${t.items.map(i => `<i class="${i.ok ? 'ok' : i.hint >= 3 || i.wrong >= 2 ? 'bad' : 'wn'}">${i.ok ? '√' : i.hint >= 3 || i.wrong >= 2 ? '×' : '△'} ${i.n}${i.hint ? `（提示 ${i.hint} 级）` : ''}${i.wrong ? `（错 ${i.wrong} 次）` : ''}</i>`).join(' ')}</div></td><td class="mono">${t.pts ? `${t.got}/${t.pts}` : (t.ratio != null ? Math.round(t.ratio * 100) + '%' : '—')}</td><td>${t.items.every(i => i.ok) ? '<span class="tag ok">一次做对</span>' : t.items.some(i => i.wrong >= 2 || i.hint >= 3) ? '<span class="tag rl">靠答案完成</span>' : '<span class="tag wn">提示后完成</span>'}</td></tr>`).join('')}</table></div></section>
      <section class="hcard ho"><div class="hch"><b>错误步骤</b><span>实际操作 · 正确做法 · 原因 · 处置</span></div><div class="hcb">
        ${r.errs.length ? r.errs.map(e => `<div class="exerr ${e.kind}"><div class="err1"><span class="tag ${e.kind === 'red' || e.crit ? 'rl' : 'wn'}">${ERR_KIND[e.kind] || e.kind}${e.crit && e.kind !== 'red' ? ' · 关键' : ''}</span><b>${e.part ? e.part + ' · ' : ''}${e.title}</b></div>
          <div class="err2"><label>实际操作</label>${e.click || '—'}</div><div class="err2"><label>正确做法</label>${e.right || '—'}</div>
          <div class="err2"><label>错误原因</label>${e.text.replace(/<[^>]+>/g, '')}${e.why ? '　' + e.why : ''}</div>${e.risk ? `<div class="err2"><label>风险</label>${e.risk}</div>` : ''}${e.rule ? `<div class="err2"><label>依据</label><span class="errq">${e.rule}</span></div>` : ''}<div class="err2"><label>正确处置</label>${e.fix || '—'}</div></div>`).join('') : '<div class="tk3">全部步骤一次做对，未记录错误。</div>'}</div></section>
    </div>
    <div class="gtwo">
      <section class="hcard hg"><div class="hch"><b>针对性训练建议</b><em class="ai">AI</em><span>由本次错误、提示与维度得分生成 · 已反馈到组长工作台</span></div><div class="hcb">${r.sugg.map(s => `<div class="hrow">${s.dim ? `<i class="tag wn">${abilityOf(s.dim).n}</i>` : ''}${s.t} <button class="btn sm" data-exstart="${s.exam}">${s.act}</button></div>`).join('')}</div></section>
      <section class="hcard ho"><div class="hch"><b>教练对话回放</b><span>${(r.log || []).length} 条</span></div><div class="hcb exlog rv">${(r.log || []).map(m => `<div class="msg ${m.who === 'me' ? 'o' : 'j'} ${m.k || ''}"><div class="av">${m.who === 'me' ? '我' : ex.coach.short}</div><div class="bd"><span class="mono tk3">${m.at}</span> ${m.t}</div></div>`).join('') || '<div class="tk3">无对话记录。</div>'}</div></section>
    </div>
  </div>`;
}

/* ---------------- 页面点击 / 键盘 ---------------- */
function examClick(e) {
  const q = s => e.target.closest(s); let n;
  if (n = q('[data-exstart]')) { const modeEl = $(`input[name="exm_${n.dataset.exstart}"]:checked`); examStart(n.dataset.exstart, n.dataset.exmode || (modeEl ? modeEl.value : 'teach'), { task: n.dataset.extask || null }); return true; }
  if (n = q('[data-exreview]')) { const r = examRecords().find(x => x.id === n.dataset.exreview); if (r) { EX.finished = r; EX.exam = null; if (location.hash !== '#exam') goPage('exam'); else rerenderExam(); } return true; }
  if (n = q('[data-exquit]')) { examQuit(); return true; }
  if (n = q('[data-exloc]')) { touch(); EX.loc = n.dataset.exloc; exCloseZoom(); rerenderScene(); const s = examStation(); if (s.locSay && s.locSay[EX.loc] && EX.mode !== 'exam') coachSay(s.locSay[EX.loc], { pose: 'listen' }); return true; }
  if (n = q('.hs[data-hs]')) { examLook(n.dataset.hs); return true; }
  if (n = q('[data-zclose]')) { exCloseZoom(); return true; }
  if (n = q('[data-zsay]')) { const i = $('#ex_zsay'); examSay(i ? i.value : '', true); return true; }
  if (n = q('[data-exsay]')) { const i = $('#ex_say'); const v = i ? i.value : ''; if (i) i.value = ''; examSay(v, false); return true; }
  if (n = q('[data-exhint]')) { touch(); exHint(nextGoal()); return true; }
  if (n = q('[data-exanswer]')) { touch(); const g = nextGoal(); if (g) { gState(g.id).hint = 2; exHint(g); } return true; }
  if (n = q('[data-exask]')) { touch(); const i = $('#ex_say'); if (i) { i.placeholder = '把问题说出来，例如：为什么要先验电再接地？'; i.focus(); } return true; }
  if (n = q('[data-exnext]')) { examNext(); return true; }
  if (n = q('[data-exmic]')) { examMic(n, n.dataset.exmic); return true; }
  return false;
}
function examKey(e) {
  if (e.key !== 'Enter') return;
  if (e.target.id === 'ex_say') { e.preventDefault(); const v = e.target.value; e.target.value = ''; examSay(v, false); }
  else if (e.target.id === 'ex_zsay') { e.preventDefault(); examSay(e.target.value, true); }
}

/* ---------------- 自动驾驶（讲师演示台 / 回归）：ok 正确完成当前情境 · wrong 说错一次 · red 跳过验电直接合地刀 ---------------- */
async function examAuto(kind) {
  const s = examStation(); if (!s) return;
  const zz = ms => new Promise(r => setTimeout(r, EX_T(ms)));
  if (EX.stDone) return;
  kind = kind || 'ok';
  if (s.type === 'auto') return;
  if (kind === 'red') { const g = s.goals.find(x => x.red); if (g) { if (g.loc) { EX.loc = g.loc; rerenderScene(); } exOp(g.op); } return; }
  if (kind === 'wrong') { const g = nextGoal(); if (!g) return; if (g.kind === 'look') { if (g.loc) { EX.loc = g.loc; rerenderScene(); } examLook(g.wrongDev || g.dev[0]); await zz(40); examSay(g.sampleBad || '看不清', true); } else if (g.kind === 'say' || g.kind === 'qa') examSay(g.sampleBad || '不知道', false); else if (g.kind === 'op') { const sp = Object.keys(s.spots || {}).find(k => !(g.dev || []).includes(k) && s.spots[k].bad && !s.spots[k].crit); if (sp) examLook(sp); } else if (g.kind === 'drag') { EX.st.handle = 40; rerenderScene(); examDragEnd(); } return; }
  let guard = 0;
  while (EX.exam && examStation() === s && !EX.stDone && guard++ < 20) {
    const g = nextGoal(); if (!g) break;
    if (g.loc && EX.loc !== g.loc) { EX.loc = g.loc; rerenderScene(); }
    if (g.kind === 'look') { examLook(g.target || g.dev[0]); await zz(40); examSay(typeof g.sample === 'function' ? g.sample(EX.st) : g.sample, true); }
    else if (g.kind === 'say' || g.kind === 'qa') examSay(typeof g.sample === 'function' ? g.sample(EX.st) : g.sample, false);
    else if (g.kind === 'op') { if (g.dev && s.spots && s.spots[g.dev[0]] && s.spots[g.dev[0]].zoom) { examLook(g.dev[0]); await zz(40); } exOp(g.op); }
    else if (g.kind === 'drag') { EX.st.handle = 100; rerenderScene(); examDragEnd(); }
    await zz(60);
  }
}
async function examRun(plan) {
  const zz = ms => new Promise(r => setTimeout(r, EX_T(ms)));
  let guard = 0;
  while (EX.exam && guard++ < 60) {
    const s = examStation();
    if (s.type === 'auto') { while (EX.exam && examStation() === s) await zz(120); continue; }
    const k = (plan && plan[s.id]) || 'ok';
    if (k !== 'ok') { await examAuto(k); await zz(80); $$('.mask').forEach(m => m.remove()); }
    await examAuto('ok');
    let g2 = 0; while (EX.exam && examStation() === s && g2++ < 80) await zz(100);
  }
}
