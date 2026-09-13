/* ===== 题库考试引擎：图片选择（大场景点击放大）/ 文字选择 / 填空 / 问答（知识库要点召回）/ 对话式口述汇报（语音或文字）/ 拖动操作
   训练 / 演练 / 考核三种模式；错误记录不退出；关键错误立即弹原因并回到当前步；三类错误（错序 / 漏项 / 红线）反馈含 步骤 · 风险 · 依据 · 纠正动作；
   复盘页给完整轨迹与错误的实际点击位置 / 正确位置 / 原因 / 正确处置；分数落到 8 维能力雷达；记录写本机存储，刷新可回看，组长工作台同步可见。 ===== */

const LS_EXAMS = 'xwt_exams';
function examRecords() { return lsGet(LS_EXAMS, []); }
function examSaveRec(r) { const l = examRecords(); l.unshift(r); lsSet(LS_EXAMS, l.slice(0, 40)); }
function examTasks() { return lsGet(LS_TASKS, []).filter(t => t.exam); }
const EXAM_MODES = {
  teach: { n: '训练模式', d: '鼠标移到设备上出现轮廓高亮；点错显示部件名称；可查看提示；完成后显示标准名称' },
  drill: { n: '演练模式', d: '不高亮；点错显示部件名称；提示计入记录并扣分' },
  exam: { n: '考核模式', d: '无热区高亮、无设备名称提示、无按钮闪烁；只保留任务文字、操作反馈与最终评分' }
};
const ERR_KIND = { red: '红线', order: '错序', miss: '漏项', id: '识别错误', judge: '判断错误', crit: '关键错误', read: '读数错误', ans: '回答不完整' };
const EX_T = ms => Math.max(30, ms * Math.min(1, window.__DH_SPEED || 1));

const EX = { exam: null, mode: 'teach', si: 0, st: {}, done: {}, pend: 0, wrongs: 0, hints: 0, track: [], errs: [], red: false, t0: 0, fb: [], zoom: null, sel: [], talk: [], finished: null, task: null, arm: {}, stDone: false, timer: null, rec: null, weak: false, hintOn: false };

/* ---------------- 开始 / 进入步骤 ---------------- */
function examStart(id, mode, opt) {
  const ex = EXAMS.find(e => e.id === id); if (!ex) return;
  Object.assign(EX, { exam: ex, mode: mode || 'teach', si: 0, done: {}, pend: 0, wrongs: 0, hints: 0, track: [], errs: [], red: false, t0: Date.now(), fb: [], zoom: null, sel: [], talk: [], finished: null, task: (opt && opt.task) || null, stDone: false, rec: null, weak: false, hintOn: false });
  EX.st = ex.init(EX.arm || {});
  examEnter();
  if (location.hash !== '#exam') goPage('exam'); else rerenderExam();
}
function examStation() { return EX.exam ? EX.exam.stations[EX.si] : null; }
function examEnter() {
  const s = examStation(); if (!s) return;
  EX.done = {}; EX.pend = 0; EX.wrongs = 0; EX.zoom = null; EX.sel = []; EX.talk = []; EX.stDone = false; EX.weak = false; EX.hintOn = false; EX.fb = [];
  if (s.enter) s.enter(EX.st);
  if (s.type === 'talk') EX.talk.push({ who: 'sys', t: s.open });
  if (s.type === 'auto') { rerenderExam(); examAutoRun(s); return; }
}
async function examAutoRun(s) {
  for (let i = 0; i < s.items.length; i++) { await new Promise(r => setTimeout(r, EX_T(420))); EX.done['a' + i] = true; if (s.apply) s.apply(EX.st, i); const li = $(`#ex_auto li[data-i="${i}"]`); if (li) li.classList.add('on'); }
  await new Promise(r => setTimeout(r, EX_T(600)));
  EX.track.push({ sid: s.id, title: s.title, auto: true, items: s.items.map(t => ({ n: t, ok: true, got: 0, pts: 0 })) });
  examNext();
}
function examNext() {
  if (!EX.exam) return;
  if (EX.si >= EX.exam.stations.length - 1) return examFinish();
  EX.si += 1; examEnter(); rerenderExam();
}
function examQuit() { if (EX.timer) { clearInterval(EX.timer); EX.timer = null; } EX.exam = null; EX.finished = null; rerenderExam(); }

/* ---------------- 反馈 / 记错 / 完成 ---------------- */
function exFb(t, k) { EX.fb.unshift({ t, k: k || '', at: now() }); const el = $('#ex_fb'); if (el) el.innerHTML = exFbHtml(); }
function exFbHtml() { return EX.fb.slice(0, 8).map(f => `<div class="exfbi ${f.k}"><span class="mono">${f.at}</span>${f.t}</div>`).join('') || '<div class="tk3">按任务提示在画面上操作。</div>'; }
function exNameOf(s, id) { const sp = s.spots && s.spots[id]; return sp ? sp.n : id; }
function exWrong(kind, o) {
  const s = examStation();
  EX.wrongs += 1; EX.pend += 1;
  const e = { sid: s.id, part: s.part || '', title: s.title, kind, text: o.text || '', click: o.click || '', right: o.right || (s.need ? s.need.map(id => exNameOf(s, id)).join('、') : ''), why: o.why || s.why || '', fix: o.fix || s.fix || '', rule: o.rule || s.rule || '', risk: o.risk || s.risk || '', crit: !!o.crit, at: now() };
  EX.errs.push(e);
  const showName = EX.mode !== 'exam' && o.click;
  exFb(`${o.text || ''}${showName ? `<i class="exnm">${o.click}</i>` : ''}`, kind === 'red' ? 'red' : e.crit ? 'crit' : 'bad');
  if (e.crit || kind === 'red') exCritDialog(e);
  if (EX.wrongs >= 3 && EX.mode !== 'exam' && !EX.weak) { EX.weak = true; exFb('已连续多次操作错误，画面上给出弱提示。', ''); }
  rerenderScene();
}
function exCritDialog(e) {
  const m = el('div', 'mask'); m.innerHTML = `<div class="dlg red" style="width:min(640px,96vw)">
    <div class="dh"><b>${e.kind === 'red' ? '一票否决' : '关键错误'} · ${e.title}</b><span class="cls">×</span></div>
    <div class="db"><div class="excrit">
      <div><label>步骤</label>${e.part ? e.part + ' · ' : ''}${e.title}${e.click ? `　实际操作：${e.click}` : ''}</div>
      <div><label>风险</label>${e.risk || '—'}</div>
      <div><label>依据</label>${e.rule || '—'}</div>
      <div><label>纠正动作</label>${e.fix || '—'}</div>
      ${e.kind === 'red' ? '<div class="tk3">本次成绩按一票否决记 0 分；纠正后可继续完成，过程全部进入复盘。</div>' : '<div class="tk3">关键错误已进入考核记录；回到当前步骤重新操作。</div>'}
    </div></div>
    <div class="df"><button class="btn pri" id="exc_ok">回到当前步骤</button></div></div>`;
  document.body.appendChild(m); m.querySelector('.cls').onclick = m.querySelector('#exc_ok').onclick = () => m.remove();
}
function exSpotDone(id, sp, fbText) {
  const s = examStation();
  EX.done[id] = true;
  const f = EX.pend === 0 ? 1 : EX.pend <= 1 ? .5 : 0; EX.pend = 0;
  const pts = s.spotPts ? (s.spotPts[id] || 0) : (s.need && s.need.length ? +(s.pts / s.need.length).toFixed(2) : s.pts);
  EX.done['_' + id] = { got: +(pts * f).toFixed(2), pts };
  exFb(`${fbText || (sp && (sp.okfb || (sp.fb && sp.fb.ok))) || '已完成。'}${EX.mode === 'teach' && sp ? `<i class="exnm">${sp.n}</i>` : ''}`, 'ok');
  const need = s.need || [];
  if (need.every(k => EX.done[k])) { if (s.confirmBtn && !EX.done['_confirm']) { EX.confirmReady = true; } else if (s.judge) { EX.judgeReady = true; } else exStationDone(); }
  rerenderScene(); const l = $('#ex_list'); if (l) l.innerHTML = exListHtml(); const q = $('#ex_q'); if (q) q.innerHTML = exQuestionHtml();
}
function exStationDone(extra) {
  const s = examStation(); if (EX.stDone) return;
  EX.stDone = true; EX.confirmReady = false; EX.judgeReady = false;
  const items = (s.need || []).map(id => ({ id, n: exNameOf(s, id), ok: true, got: (EX.done['_' + id] || {}).got || 0, pts: (EX.done['_' + id] || {}).pts || 0 }));
  if (extra) items.push(...extra);
  const got = +items.reduce((a, i) => a + i.got, 0).toFixed(2), pts = +items.reduce((a, i) => a + i.pts, 0).toFixed(2);
  EX.track.push({ sid: s.id, part: s.part || '', title: s.title, items, got, pts: s.pts != null ? s.pts : pts, ratio: pts ? got / pts : (extra && extra[0] && extra[0].ratio != null ? extra[0].ratio : 1) });
  if (s.onDone) exFb(s.onDone, 'ok');
  if (EX.mode === 'teach' && s.spots && s.need) exFb('标准名称：' + s.need.map(id => exNameOf(s, id)).join('、'), '');
  if (s.after) s.after(EX.st);
  rerenderScene(); const q = $('#ex_q'); if (q) q.innerHTML = exQuestionHtml(); const l = $('#ex_list'); if (l) l.innerHTML = exListHtml();
}

/* ---------------- 图片选择：热区点击 → 放大 → 判断 ---------------- */
function examSpot(id) {
  const s = examStation(); if (!s || EX.stDone) return;
  const sp = s.spots && s.spots[id]; if (!sp) return;
  if (EX.done[id]) return toast('该项已检查', '');
  if (sp.zoom) { EX.zoom = id; renderZoom(); return; }
  examJudgeSpot(id, null);
}
function examJudgeSpot(id, verdict) {
  const s = examStation(), sp = s.spots[id];
  const target = (s.need || []).includes(id);
  if (target && s.order && s.order[id]) {
    const missing = s.order[id].filter(r => !EX.done[r]);
    if (missing.length) {
      exCloseZoom();
      if (s.red && s.red[id]) { const r = s.red[id]; EX.red = true; return exWrong('red', { text: r.text, click: sp.n, right: missing.map(x => exNameOf(s, x)).join('、'), why: r.why, fix: r.fix, rule: r.rule, risk: r.risk, crit: true }); }
      return exWrong('order', { text: s.orderText || '顺序错误：应先完成 ' + missing.map(x => exNameOf(s, x)).join('、'), click: sp.n, right: missing.map(x => exNameOf(s, x)).join('、'), fix: '先完成前置检查，再进行本项操作' });
    }
  }
  if (!target) { exCloseZoom(); return exWrong(sp.crit ? 'crit' : 'id', { text: sp.bad || (s.badText || '该部件不是本项的检查对象。'), click: sp.n, why: sp.why || '', fix: sp.fix || s.fix || '', rule: sp.rule || s.rule || '', risk: sp.risk || s.risk || '', crit: !!sp.crit }); }
  if (sp.verdicts) {
    const truth = sp.truth(EX.st), txt = sp.fb[truth];
    exCloseZoom();
    if (verdict !== truth) return exWrong('judge', { text: txt, click: `${sp.n} · 判断为「${(sp.verdicts.find(v => v.k === verdict) || {}).t}」`, right: `${sp.n} · ${(sp.verdicts.find(v => v.k === truth) || {}).t}`, why: sp.why || '', fix: sp.fix || '', rule: sp.rule || '', risk: sp.risk || '', crit: !!(sp.critOnMiss && truth !== 'ok') });
    if (sp.onTruth) sp.onTruth(EX.st, truth);
    return exSpotDone(id, sp, txt);
  }
  exCloseZoom();
  if (sp.act) sp.act(EX.st);
  exSpotDone(id, sp, sp.okfb);
}
function renderZoom() {
  const s = examStation(), id = EX.zoom, sp = s.spots[id]; const z = $('#ex_zoom'); if (!z) return;
  const title = EX.mode === 'exam' ? '放大查看' : sp.n;
  z.hidden = false;
  z.innerHTML = `<div class="exzb"><div class="exzh"><b>${title}</b><span class="cls" data-zclose="1">×</span></div>${sp.zoom(EX.st)}
    <div class="exzv">${sp.verdicts ? sp.verdicts.map(v => `<button class="btn ${v.pri ? 'pri' : ''}" data-verdict="${v.k}">${v.t}</button>`).join('') : sp.actBtn ? `<button class="btn pri" data-verdict="act">${sp.actBtn}</button>` : `<button class="btn pri" data-verdict="ok">${sp.okBtn || '确认'}</button>`}</div></div>`;
}
function exCloseZoom() { EX.zoom = null; const z = $('#ex_zoom'); if (z) { z.hidden = true; z.innerHTML = ''; } }
function examVerdict(k) {
  const id = EX.zoom; if (!id) return; const s = examStation(), sp = s.spots[id];
  if (k === 'act' || (k === 'ok' && !sp.verdicts)) return examJudgeSpot(id, null);
  examJudgeSpot(id, k);
}
function examConfirm() { const s = examStation(); if (!EX.confirmReady) return; EX.done['_confirm'] = true; exStationDone(); }
function examJudge(i) {
  const s = examStation(); if (!s.judge || EX.stDone) return;
  const need = s.need || [], checked = need.filter(id => EX.done[id]).length, truth = s.judge.truth(EX.st);
  if (checked < need.length) return exWrong('miss', { text: s.judge.incomplete, click: `只检查了 ${checked}/${need.length} 项即判定`, right: need.map(id => exNameOf(s, id)).join('、'), fix: s.judge.fix, rule: s.rule, risk: s.risk, why: s.why });
  if (i !== truth) return exWrong('judge', { text: s.judge.fb[truth], click: `判定为「${s.judge.opts[i]}」`, right: s.judge.opts[truth], fix: s.judge.fix, rule: s.rule, risk: s.risk, why: s.why });
  exFb(s.judge.fb[truth], 'ok');
  if (s.judge.after) s.judge.after(EX.st, truth);
  exStationDone();
}

/* ---------------- 文字选择 / 填空 / 问答 / 口述汇报 / 拖动 ---------------- */
function exNorm(t) { return String(t || '').trim().toLowerCase().replace(/[！-～]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/\s+/g, ''); }
function examSubmit() {
  const s = examStation(); if (!s || EX.stDone) return;
  if (s.type === 'choice') {
    const sel = EX.sel.slice().sort(), ans = s.ans.slice().sort();
    if (!sel.length) return toast('请先选择', '');
    const ok = sel.length === ans.length && sel.every((v, i) => v === ans[i]);
    if (!ok) { exWrong('judge', { text: s.fb.bad, click: sel.map(i => s.opts[i]).join('；'), right: ans.map(i => s.opts[i]).join('；'), fix: s.fix, rule: s.rule, risk: s.risk, why: s.why }); EX.answered = true; return exStationDone([{ n: s.title, ok: false, got: 0, pts: s.pts, ratio: 0 }]); }
    exFb(s.fb.ok, 'ok'); return exStationDone([{ n: s.title, ok: true, got: s.pts, pts: s.pts, ratio: 1 }]);
  }
  if (s.type === 'fill') {
    const vals = s.blanks.map((_, i) => ($('#ex_fill_' + i) || {}).value || '');
    const oks = s.blanks.map((b, i) => b.accept.map(exNorm).includes(exNorm(vals[i])));
    const k = oks.filter(Boolean).length, n = s.blanks.length;
    const got = +(s.pts * k / n).toFixed(2);
    if (k < n) exWrong('read', { text: s.fb.bad, click: s.blanks.map((b, i) => `${b.label}=${vals[i] || '空'}`).join('，'), right: s.blanks.map(b => `${b.label}=${b.accept[0]}${b.unit || ''}`).join('，'), fix: s.fix, rule: s.rule, why: s.why });
    else exFb(s.fb.ok, 'ok');
    return exStationDone([{ n: s.title, ok: k === n, got, pts: s.pts, ratio: k / n }]);
  }
  if (s.type === 'qa') {
    const txt = ($('#ex_qa') || {}).value || ''; if (exNorm(txt).length < 4) return toast('请先作答', '');
    const hits = s.keys.filter(k => k.re.test(txt)); const ratio = hits.length / s.keys.length, ok = hits.length >= s.min;
    EX.qaResult = { hits: hits.map(h => h.t), miss: s.keys.filter(k => !k.re.test(txt)).map(k => k.t), txt, ok };
    if (!ok) exWrong('ans', { text: `回答要点不完整：命中 ${hits.length}/${s.keys.length} 项要点。`, click: txt.slice(0, 40), right: s.keys.map(k => k.t).join('、'), fix: s.fix || '按参考答案补齐要点', why: s.why, rule: s.rule });
    else exFb(`回答通过：命中 ${hits.length}/${s.keys.length} 项要点。判分结果由教练确认。`, 'ok');
    return exStationDone([{ n: s.title, ok, got: +(s.pts * ratio).toFixed(2), pts: s.pts, ratio }]);
  }
  if (s.type === 'talk') return examTalkSend();
}
function examTalkSend() {
  const s = examStation(); const inp = $('#ex_talk'); const txt = (inp ? inp.value : '').trim(); if (!txt) return toast('请说出或输入汇报内容', '');
  EX.talk.push({ who: 'me', t: txt }); inp.value = '';
  const keys = typeof s.keys === 'function' ? s.keys(EX.st) : s.keys;
  const miss = keys.filter(k => !k.re.test(txt)); const hits = keys.length - miss.length; const rounds = EX.talk.filter(x => x.who === 'me').length;
  if (!miss.length || rounds >= 3) {
    const ratio = hits / keys.length, ok = !miss.length;
    const reply = ok ? (typeof s.replyOk === 'function' ? s.replyOk(EX.st) : s.replyOk) : `收到，本次汇报仍缺 ${miss.map(m => m.t).join('、')}，先按此记录。`;
    EX.talk.push({ who: 'sys', t: reply });
    if (!ok) exWrong('ans', { text: `汇报要素不完整：缺 ${miss.map(m => m.t).join('、')}。`, click: txt.slice(0, 40), right: keys.map(k => k.t).join('、'), fix: s.fix || '按要素完整汇报', rule: s.rule, why: s.why });
    else exFb('汇报要素完整。', 'ok');
    rerenderTalk();
    return exStationDone([{ n: s.title, ok, got: +(s.pts * ratio).toFixed(2), pts: s.pts, ratio }]);
  }
  /* 类客服知识库召回：先按学员的话检索知识库给一句依据，再追问缺少的要素 */
  const r = typeof retrieve === 'function' ? retrieve(s.kb || txt) : null;
  const ask = EX.mode === 'exam' ? '汇报要素不完整，请补充后再报一遍。' : `还需要说明：${miss.map(m => m.t).join('、')}。请补充后再报一遍。`;
  EX.talk.push({ who: 'sys', t: `${ask}${r && r.text ? `<div class="exkb">知识库：${r.text.slice(0, 90)}${r.text.length > 90 ? '…' : ''}<span>依据 ${r.src}</span></div>` : ''}` });
  rerenderTalk();
}
function rerenderTalk() { const q = $('#ex_q'); if (q) q.innerHTML = exQuestionHtml(); const log = $('#ex_tlog'); if (log) log.scrollTop = log.scrollHeight; const i = $('#ex_talk'); if (i) i.focus(); }
function examDragEnd() {
  const s = examStation(); if (s.type !== 'drag' || EX.stDone) return;
  const h = EX.st.handle || 0;
  if (h >= s.min) { exFb(s.fb.ok, 'ok'); if (s.after) s.after(EX.st); return exStationDone([{ n: s.title, ok: true, got: EX.pend ? s.pts / 2 : s.pts, pts: s.pts, ratio: 1 }]); }
  if (h > 5) { exFb(s.fb.part, 'bad'); if (!EX.dragWarned) { EX.dragWarned = true; EX.errs.push({ sid: s.id, part: s.part || '', title: s.title, kind: 'miss', text: s.fb.part, click: `手柄停在 ${Math.round(h)}%`, right: '全开位置（≥ ' + s.min + '%）', fix: s.fix, rule: s.rule, risk: s.risk, why: s.why, at: now() }); EX.pend = 1; } }
}
function examHint() {
  const s = examStation(); if (EX.mode === 'exam' || !s.hint) return;
  EX.hints += 1; EX.hintOn = true; if (EX.mode === 'drill') EX.pend += .5;
  exFb(`提示：${s.hint}`, 'hint'); rerenderScene();
}
/* 语音输入：联网且浏览器支持时用浏览器语音识别（识别结果可修改后提交）；离线自动降级为文字输入 */
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
  EX.track.forEach(t => { const s = ex.stations.find(x => x.id === t.sid); if (!s || !s.dims) return; const r = t.ratio != null ? t.ratio : (t.pts ? t.got / t.pts : 1); Object.keys(s.dims).forEach(k => { acc[k].w += s.dims[k]; acc[k].v += s.dims[k] * r; }); });
  const dims = {}; DIMK.forEach(k => { dims[k] = acc[k].w ? Math.round(100 * acc[k].v / acc[k].w) : null; });
  const dur = Math.max(1, Math.round((Date.now() - EX.t0) / 60000));
  const rec = { id: 'E' + Date.now(), ts: Date.now(), who: HOME_USER.name, exam: ex.id, examName: ex.n, short: ex.short, mode: EX.mode, modeName: EXAM_MODES[EX.mode].n, dur, raw, score: EX.red ? 0 : raw, max: ex.max, pass: ex.pass, red: EX.red, track: EX.track, errs: EX.errs, hints: EX.hints, dims, ver: versionStamp(ex.id), task: EX.task, reviewer: '', qa: EX.qaResult || null };
  rec.sugg = examSugg(rec);
  examSaveRec(rec);
  if (EX.task) { const l = lsGet(LS_TASKS, []); const t = l.find(x => x.id === EX.task); if (t) { t.done = (t.done || 0) + 1; t.results = (t.results || []).concat([{ who: rec.who, score: rec.score, red: rec.red, id: rec.id }]); lsSet(LS_TASKS, l); } }
  if (typeof hoursAdd === 'function') hoursAdd(`${ex.short}（题库考试学时）`, 1);
  EX.finished = rec; EX.exam = null; if (EX.timer) { clearInterval(EX.timer); EX.timer = null; }
  rerenderExam();
}
function examSugg(rec) {
  const out = [];
  const byDim = {};
  rec.errs.forEach(e => { const s = (EXAMS.find(x => x.id === rec.exam) || { stations: [] }).stations.find(x => x.id === e.sid); const k = s && s.dims ? Object.keys(s.dims).sort((a, b) => s.dims[b] - s.dims[a])[0] : null; if (!k) return; (byDim[k] = byDim[k] || []).push(e); });
  Object.keys(byDim).forEach(k => { const a = abilityOf(k); const kinds = Array.from(new Set(byDim[k].map(e => ERR_KIND[e.kind]))); out.push({ dim: k, t: `「${a.n}」出现${kinds.join('、')} ${byDim[k].length} 次：${byDim[k][0].text.replace(/<[^>]+>/g, '').slice(0, 40)}`, exam: rec.exam, act: `复练「${rec.short}」相关步骤` }); });
  DIMK.forEach(k => { if (rec.dims[k] != null && rec.dims[k] < 70 && !byDim[k]) out.push({ dim: k, t: `「${abilityOf(k).n}」本次 ${rec.dims[k]} 分，低于 70`, exam: DIM_EXAM[abilityOf(k).n] || rec.exam, act: `安排「${(EXAMS.find(x => x.id === (DIM_EXAM[abilityOf(k).n] || rec.exam)) || {}).short}」专项` }); });
  if (!out.length) out.push({ dim: null, t: '各步骤均一次通过，建议转入考核模式或下一考试内容。', exam: rec.exam === 'rain' ? 'e1163' : 'rain', act: '进入下一考试内容' });
  return out;
}

/* ---------------- 渲染 ---------------- */
function rerenderExam() { const pg = $('#hpage'); if (!pg || location.hash !== '#exam') return; pg.innerHTML = pageExam(); examAfter(); }
function rerenderScene() {
  const s = examStation(); const box = $('#ex_svg'); if (!s || !box) return;
  box.innerHTML = exSceneSvg(s); exMarkScene();
}
function exSceneSvg(s) {
  let sc = s;
  if (!sc.scene) sc = EX.exam.stations.slice(0, EX.si).reverse().find(x => x.scene) || s;
  const inner = sc.scene ? sc.scene(EX.st, sc.sceneOpt ? sc.sceneOpt(EX.st) : undefined) : '';
  return `<svg viewBox="0 0 960 540" class="exsvg" id="ex_svgroot">${inner}</svg>`;
}
function exMarkScene() {
  const s = examStation(); const svg = $('#ex_svgroot'); if (!svg || !s) return;
  Object.keys(EX.done).filter(k => !k.startsWith('_') && !k.startsWith('a')).forEach(id => { const g = svg.querySelector(`[data-hs="${id}"]`); if (!g) return; g.classList.add('done'); const r = g.querySelector('.hsr'); if (r) g.insertAdjacentHTML('beforeend', SC.check(+r.getAttribute('x') + +r.getAttribute('width') - 8, +r.getAttribute('y') + 8)); });
  if (EX.mode !== 'exam' && (EX.weak || (EX.hintOn && EX.mode === 'teach'))) (s.need || []).forEach(id => { if (EX.done[id]) return; const g = svg.querySelector(`[data-hs="${id}"]`); if (g) g.classList.add(EX.hintOn && EX.mode === 'teach' ? 'tgt' : 'weak'); });
  if (s.type === 'drag') exBindDrag(svg);
}
function exBindDrag(svg) {
  const h = svg.querySelector('[data-handle]'); if (!h) return;
  const pt = e => { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()); };
  let on = false;
  h.style.cursor = 'grab';
  h.onpointerdown = e => { on = true; h.setPointerCapture(e.pointerId); e.preventDefault(); };
  h.onpointermove = e => { if (!on) return; const p = pt(e); const ang = Math.atan2(p.x - 440, -(p.y - 300)) * 180 / Math.PI; const pct = Math.max(0, Math.min(100, ang / 90 * 100)); EX.st.handle = pct; h.setAttribute('transform', `rotate(${-90 * pct / 100})`); const f = svg.querySelector('#exbar_fill'), t = svg.querySelector('#exbar_txt'); if (f) { f.setAttribute('width', 272 * pct / 100); f.setAttribute('fill', pct >= 90 ? '#23b26a' : '#e8b22a'); } if (t) t.textContent = pct >= 90 ? '全开位置' : pct > 8 ? `开度 ${Math.round(pct)}%` : '关闭位置'; };
  h.onpointerup = h.onpointercancel = e => { if (!on) return; on = false; examDragEnd(); };
}
function exListHtml() {
  const s = examStation(); if (!s) return '';
  if (s.type === 'auto') return `<ol class="exauto" id="ex_auto">${s.items.map((t, i) => `<li data-i="${i}" class="${EX.done['a' + i] ? 'on' : ''}">${t}</li>`).join('')}</ol>`;
  const need = s.need || [];
  if (!need.length) return `<div class="exck"><span class="${EX.stDone ? 'on' : ''}"><i></i>${s.title}</span></div>`;
  const hide = EX.mode === 'exam' && s.hideList;
  return `<div class="exck">${need.map(id => `<span class="${EX.done[id] ? 'on' : ''}"><i></i>${hide ? '检查项' : (s.listNames ? s.listNames[id] : exNameOf(s, id))}</span>`).join('')}</div>`;
}
function exQuestionHtml() {
  const s = examStation(); if (!s) return '';
  const nextBtn = EX.stDone ? `<div class="exq-next"><button class="btn pri" data-exnext="1">${EX.si >= EX.exam.stations.length - 1 ? '完成并查看复盘' : '继续'}</button></div>` : '';
  if (s.type === 'pick') return `${EX.confirmReady && !EX.stDone ? `<div class="exq-next"><button class="btn pri" data-exconfirm="1">${s.confirmBtn}</button></div>` : ''}${s.judge && !EX.stDone ? `<div class="exjudge"><b>判定</b>${s.judge.opts.map((o, i) => `<button class="btn" data-exjudge="${i}">${o}</button>`).join('')}</div>` : ''}${nextBtn}`;
  if (s.type === 'drag') return nextBtn;
  if (s.type === 'auto') return '';
  if (s.type === 'choice') return `<div class="exqa"><div class="exqt">${s.q}<span class="tk3">${s.ans.length > 1 ? '多选' : '单选'}</span></div><div class="exopts">${s.opts.map((o, i) => `<label class="exopt ${EX.sel.includes(i) ? 'on' : ''} ${EX.stDone ? (s.ans.includes(i) ? 'ans' : '') : ''}"><input type="${s.ans.length > 1 ? 'checkbox' : 'radio'}" data-opt="${i}" ${EX.sel.includes(i) ? 'checked' : ''} ${EX.stDone ? 'disabled' : ''}><span>${o}</span></label>`).join('')}</div>${EX.stDone ? '' : '<button class="btn pri" data-exsubmit="1">提交</button>'}${nextBtn}</div>`;
  if (s.type === 'fill') return `<div class="exqa"><div class="exqt">${s.q}</div><div class="exfills">${s.blanks.map((b, i) => `<label>${b.label}<input id="ex_fill_${i}" class="exin" autocomplete="off" placeholder="${b.ph || ''}" ${EX.stDone ? 'disabled' : ''}>${b.unit ? `<em>${b.unit}</em>` : ''}</label>`).join('')}</div>${EX.stDone ? (EX.mode !== 'exam' ? `<div class="tk3">正确值：${s.blanks.map(b => `${b.label} ${b.accept[0]}${b.unit || ''}`).join('　')}</div>` : '') : '<button class="btn pri" data-exsubmit="1">提交</button>'}${nextBtn}</div>`;
  if (s.type === 'qa') return `<div class="exqa"><div class="exqt">${s.q}<span class="tk3">问答题 · 按要点判分，结果由教练确认</span></div>${EX.stDone ? `<div class="exqres">${EX.qaResult ? `<div>命中要点：${EX.qaResult.hits.map(h => `<i class="ok">${h}</i>`).join('') || '—'}　缺少：${EX.qaResult.miss.map(h => `<i class="bad">${h}</i>`).join('') || '—'}</div>` : ''}${EX.mode !== 'exam' ? `<div class="tk3">参考答案：${s.model}</div>` : ''}</div>` : `<div class="exta"><textarea id="ex_qa" rows="3" placeholder="可点麦克风口述，识别结果可修改后提交"></textarea><button class="exmic" data-exmic="#ex_qa" title="语音输入">●</button></div><button class="btn pri" data-exsubmit="1">提交</button>`}${nextBtn}</div>`;
  if (s.type === 'talk') return `<div class="exqa extalk"><div class="exqt">${s.q || '口述汇报'}<span class="tk3">对话式 · 语音或文字 · 按知识库召回作答</span></div><div class="extlog" id="ex_tlog">${EX.talk.map(m => `<div class="msg ${m.who === 'me' ? 'o' : 'j'}"><div class="av">${m.who === 'me' ? '我' : (s.role || '监')}</div><div class="bd">${m.t}</div></div>`).join('')}</div>${EX.stDone ? '' : `<div class="exta"><input id="ex_talk" class="exin" autocomplete="off" placeholder="说出你的汇报（可点麦克风口述）…"><button class="exmic" data-exmic="#ex_talk" title="语音输入">●</button><button class="btn pri" data-exsubmit="1">汇报</button></div>`}${nextBtn}</div>`;
  return nextBtn;
}
function pageExam() {
  if (EX.finished) return examReviewHtml(EX.finished, true);
  if (!EX.exam) return examEntryHtml();
  const ex = EX.exam, s = examStation(), N = ex.stations.length;
  const got = +EX.track.reduce((a, t) => a + (t.got || 0), 0).toFixed(1);
  return `<div class="exwrap">
    <div class="exhead hg">
      <div class="exh1"><b>${ex.n}</b><span>${s.part ? s.part + ' · ' : ''}第 ${EX.si + 1}/${N} 步 · ${s.title} · ${EXAM_MODES[EX.mode].n}</span></div>
      <div class="exkpis"><div class="kpi"><b id="ex_time">00:00</b><span>用时</span></div>${EX.mode !== 'exam' ? `<div class="kpi ${EX.red ? 'bad' : ''}"><b>${EX.red ? 0 : got}/${ex.max}</b><span>得分</span></div>` : ''}<div class="kpi ${EX.errs.length ? 'warn' : ''}"><b>${EX.errs.length}</b><span>错误</span></div>${EX.red ? '<div class="kpi bad"><b>否决</b><span>红线</span></div>' : ''}</div>
      <div class="exprog">${ex.stations.map((x, i) => `<i class="${i < EX.si ? 'done' : i === EX.si ? 'cur' : ''}" title="${x.title}"></i>`).join('')}</div>
      <button class="btn sm" data-exquit="1">退出考试</button>
    </div>
    <div class="exmain">
      <div class="exscene hg ${EX.mode}"><div class="exsvgbox" id="ex_svg">${exSceneSvg(s)}</div><div class="exzoom" id="ex_zoom" hidden></div><div class="exq" id="ex_q">${exQuestionHtml()}</div></div>
      <aside class="exside">
        <div class="hcard ho"><div class="hch"><b>任务</b><span>${s.part || ''}</span></div><div class="hcb extask">${s.task}</div></div>
        <div class="hcard hg"><div class="hch"><b>检查清单</b><span>${s.type === 'auto' ? '系统完成' : (s.need || []).length ? `${(s.need || []).filter(id => EX.done[id]).length}/${(s.need || []).length}` : ''}</span></div><div class="hcb" id="ex_list">${exListHtml()}</div></div>
        <div class="hcard hg exfbc"><div class="hch"><b>操作反馈</b><span>错误不退出，全部进入复盘</span></div><div class="hcb exfb" id="ex_fb">${exFbHtml()}</div></div>
        ${EX.mode !== 'exam' && s.hint ? `<button class="btn" data-exhint="1">查看提示${EX.mode === 'drill' ? '（计入记录）' : ''}</button>` : ''}
      </aside>
    </div></div>`;
}
function examAfter() {
  if (!EX.exam) { if (EX.timer) { clearInterval(EX.timer); EX.timer = null; } return; }
  exMarkScene();
  if (!EX.timer) EX.timer = setInterval(() => { const t = $('#ex_time'); if (!t) return; const d = Math.round((Date.now() - EX.t0) / 1000); t.textContent = `${String(Math.floor(d / 60)).padStart(2, '0')}:${String(d % 60).padStart(2, '0')}`; }, 1000);
  const i = $('#ex_talk') || $('#ex_qa'); if (i) i.focus();
}

/* ---------------- 入口页：考试内容 · 模式 · 待考任务 · 我的记录 ---------------- */
function examEntryHtml() {
  const recs = examRecords().filter(r => r.who === HOME_USER.name);
  const tasks = examTasks().filter(t => !t.results || !t.results.some(r => r.who === HOME_USER.name));
  const cl = confirmLog();
  return `<div class="ppage">
    <div class="ph"><b>题库考试</b><span>考试内容由本单位实操培训方案与陪练关卡方案生成 · 图片选择 / 文字选择 / 填空 / 问答 / 口述汇报 / 拖动操作 · 成绩落到能力雷达并同步组长工作台</span></div>
    ${tasks.length ? `<section class="hcard ho"><div class="hch"><b>待考任务</b><span>班组长下发</span></div><div class="hcb">${tasks.map(t => `<div class="hrow"><b>${t.examName || t.plan}</b> <span class="tk3">${t.from} 下发 · ${t.due}截止 · ${t.mode} · 及格 ${t.pass}${t.dims && t.dims.length ? ' · 针对 ' + t.dims.join('、') : ''}</span> <button class="btn sm pri" data-exstart="${t.exam}" data-exmode="${t.mode === '考核模式' ? 'exam' : t.mode === '演练模式' ? 'drill' : 'teach'}" data-extask="${t.id}">开始</button></div>`).join('')}</div></section>` : ''}
    <div class="exgrid">
      ${EXAMS.map(ex => { const c = cl.find(x => x.id === ex.id); const my = recs.filter(r => r.exam === ex.id); const best = my.length ? Math.max(...my.map(r => r.score)) : null; return `
      <section class="hcard hg excard"><div class="hch"><b>${ex.n}</b><span>${ex.src}</span></div><div class="hcb">
        <div class="exbg">${ex.bg}</div>
        <div class="exmeta"><span>${ex.stations.filter(s => s.type !== 'auto').length} 个考核步骤</span><span>${ex.max} 分制 · 及格 ${ex.pass}</span><span>${ex.crit} 条关键错误</span><span>${my.length ? `已考 ${my.length} 次 · 最高 ${best}` : '未考'}</span></div>
        <div class="exdims">${ex.cover.map(k => `<i>${abilityOf(k).n}</i>`).join('')}</div>
        <div class="tk3">评分表 ${c.ver} · ${c.st === 'ok' ? `已审定：${c.who} ${c.date}` : c.st === 'sent' ? '已提交审定，待安全专家确认' : '待安全专家审定'}</div>
        <div class="exmodes">${Object.keys(EXAM_MODES).map(k => `<label class="exmode"><input type="radio" name="exm_${ex.id}" value="${k}" ${k === 'teach' ? 'checked' : ''}><b>${EXAM_MODES[k].n}</b><span>${EXAM_MODES[k].d}</span></label>`).join('')}</div>
        <button class="btn pri" data-exstart="${ex.id}">开始考试</button>
      </div></section>`; }).join('')}
    </div>
    <section class="hcard ho"><div class="hch"><b>我的考试记录</b><span>${recs.length} 条 · 本机保存，刷新后可回看 · 已同步到组长工作台</span></div><div class="hcb">
      ${recs.length ? `<table class="htbl"><tr><th>时间</th><th>考试内容</th><th>模式</th><th>得分</th><th>错误</th><th>复核</th><th></th></tr>${recs.map(r => `<tr><td class="mono">${stampOf(r.ts)}</td><td>${r.short}</td><td>${r.modeName}</td><td class="mono ${r.red ? 'wv' : r.score >= r.pass ? 'gv' : 'wv'}">${r.red ? '0（否决）' : r.score}/${r.max}</td><td class="mono">${r.errs.length}</td><td>${r.reviewer ? `<span class="tag ok">${r.reviewer}</span>` : '<span class="tag wn">待班组长复核</span>'}</td><td><button class="btn sm" data-exreview="${r.id}">查看复盘</button></td></tr>`).join('')}</table>` : '<div class="tk3">还没有考试记录。</div>'}</div></section>
  </div>`;
}
function stampOf(ts) { const d = new Date(ts); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }

/* ---------------- 复盘页 ---------------- */
function examReviewHtml(r, fresh) {
  const ex = EXAMS.find(x => x.id === r.exam);
  const dimsArr = DIMK.map(k => r.dims[k] == null ? 0 : r.dims[k]);
  const base = RADAR_PREV;
  return `<div class="ppage">
    <div class="ph"><b>${fresh ? '本次考试复盘' : '考试复盘'}</b><span>${r.examName} · ${r.modeName} · ${stampOf(r.ts)} · ${r.who}</span>
      <span class="phr">${fresh ? `<button class="btn" data-exstart="${r.exam}" data-exmode="${r.mode}">再考一次</button>` : ''}<button class="btn" data-exquit="1">回题库</button>${ROLE.cur === 'lead' ? '<button class="btn" data-go="team">回组长工作台</button>' : '<button class="btn" data-go="home">回工作台</button>'}</span></div>
    <section class="hcard rvhead hg"><div class="rvscore"><div class="rvbig ${r.red || r.score < r.pass ? 'wv' : ''}">${r.red ? 0 : r.score}<small>/${r.max}</small></div><div class="tk3">${r.red ? '触发一票否决，成绩记 0' : r.score >= r.pass ? '及格' : '未及格'} · 及格线 ${r.pass}</div>
        <div class="rvkpis"><span><b>${r.dur}</b>分钟</span><span><b>${r.errs.length}</b>错误</span><span><b>${r.errs.filter(e => e.crit).length}</b>关键错误</span><span><b>${r.hints}</b>提示</span></div>
        <div class="exver"><div><label>操作票版本</label>${r.ver.ticket}</div><div><label>规则版本</label>${r.ver.rule}</div><div><label>知识依据版本</label>${r.ver.kb}</div><div><label>训练时间</label>${r.ver.time}</div><div><label>复核人</label>${r.reviewer || '待班组长复核'}</div></div></div>
      <div class="rvradar">${chRadar(DIMS, dimsArr, base, { w: 330, h: 240, l1: '本次', l2: '上月', key: 'x' })}<div class="tk3" style="text-align:center">本次考试落到 8 维能力 · 未覆盖维度记 0 不计入现值</div></div></section>
    <div class="gtwo">
      <section class="hcard hg"><div class="hch"><b>完整操作轨迹</b><span>${r.track.filter(t => !t.auto).length} 步</span></div><div class="hcb"><table class="htbl extrack">
        ${r.track.map(t => t.auto ? `<tr class="auto"><td colspan="3">系统完成：${t.items.map(i => i.n).join('、')}</td></tr>` : `<tr><td><b>${t.part ? t.part + ' · ' : ''}${t.title}</b><div class="tk3">${t.items.map(i => `<i class="${i.ok ? 'ok' : 'bad'}">${i.ok ? '√' : '×'} ${i.n}</i>`).join(' ')}</div></td><td class="mono">${t.pts ? `${t.got}/${t.pts}` : (t.ratio != null ? Math.round(t.ratio * 100) + '%' : '—')}</td><td>${t.items.every(i => i.ok) ? '<span class="tag ok">通过</span>' : '<span class="tag wn">有错误</span>'}</td></tr>`).join('')}</table></div></section>
      <section class="hcard ho"><div class="hch"><b>错误步骤</b><span>实际点击位置 · 正确位置 · 错误原因 · 正确处置</span></div><div class="hcb">
        ${r.errs.length ? r.errs.map(e => `<div class="exerr ${e.kind}"><div class="err1"><span class="tag ${e.kind === 'red' ? 'rl' : e.crit ? 'rl' : 'wn'}">${ERR_KIND[e.kind] || e.kind}${e.crit && e.kind !== 'red' ? ' · 关键' : ''}</span><b>${e.part ? e.part + ' · ' : ''}${e.title}</b></div>
          <div class="err2"><label>实际操作</label>${e.click || '—'}</div><div class="err2"><label>正确位置</label>${e.right || '—'}</div>
          <div class="err2"><label>错误原因</label>${e.text.replace(/<[^>]+>/g, '')}${e.why ? '　' + e.why : ''}</div>${e.risk ? `<div class="err2"><label>风险</label>${e.risk}</div>` : ''}${e.rule ? `<div class="err2"><label>依据</label><span class="errq">${e.rule}</span></div>` : ''}<div class="err2"><label>正确处置</label>${e.fix || '—'}</div></div>`).join('') : '<div class="tk3">全部步骤一次通过，未记录错误。</div>'}</div></section>
    </div>
    <section class="hcard hg"><div class="hch"><b>针对性训练建议</b><em class="ai">AI</em><span>由本次错误与维度得分生成 · 已反馈到组长工作台</span></div><div class="hcb">${r.sugg.map(s => `<div class="hrow">${s.dim ? `<i class="tag wn">${abilityOf(s.dim).n}</i>` : ''}${s.t} <button class="btn sm" data-exstart="${s.exam}">${s.act}</button></div>`).join('')}</div></section>
  </div>`;
}

/* ---------------- 页面点击 ---------------- */
function examClick(e) {
  const q = s => e.target.closest(s); let n;
  if (n = q('[data-exstart]')) { const modeEl = $(`input[name="exm_${n.dataset.exstart}"]:checked`); examStart(n.dataset.exstart, n.dataset.exmode || (modeEl ? modeEl.value : 'teach'), { task: n.dataset.extask || null }); return true; }
  if (n = q('[data-exreview]')) { const r = examRecords().find(x => x.id === n.dataset.exreview); if (r) { EX.finished = r; EX.exam = null; if (location.hash !== '#exam') goPage('exam'); else rerenderExam(); } return true; }
  if (n = q('[data-exquit]')) { examQuit(); return true; }
  if (n = q('.hs[data-hs]')) { examSpot(n.dataset.hs); return true; }
  if (n = q('[data-verdict]')) { examVerdict(n.dataset.verdict); return true; }
  if (n = q('[data-zclose]')) { exCloseZoom(); return true; }
  if (n = q('[data-opt]')) { const i = +n.dataset.opt; const s = examStation(); if (s.ans.length > 1) { EX.sel = EX.sel.includes(i) ? EX.sel.filter(x => x !== i) : EX.sel.concat(i); } else EX.sel = [i]; $$('.exopt').forEach(l => l.classList.toggle('on', EX.sel.includes(+l.querySelector('[data-opt]').dataset.opt))); return true; }
  if (n = q('[data-exsubmit]')) { examSubmit(); return true; }
  if (n = q('[data-exconfirm]')) { examConfirm(); return true; }
  if (n = q('[data-exjudge]')) { examJudge(+n.dataset.exjudge); return true; }
  if (n = q('[data-exhint]')) { examHint(); return true; }
  if (n = q('[data-exnext]')) { examNext(); return true; }
  if (n = q('[data-exmic]')) { examMic(n, n.dataset.exmic); return true; }
  return false;
}
function examKey(e) { if (e.key !== 'Enter') return; if (e.target.id === 'ex_talk') { e.preventDefault(); examTalkSend(); } else if (e.target.id && e.target.id.startsWith('ex_fill_')) { e.preventDefault(); examSubmit(); } }

/* ---------------- 自动驾驶（讲师演示台 / 回归）：ok 正确完成当前步 · wrong 点一次错误部件 · red 触发红线 ---------------- */
async function examAuto(kind) {
  const s = examStation(); if (!s) return;
  const zz = ms => new Promise(r => setTimeout(r, EX_T(ms)));
  if (EX.stDone) { examNext(); return; }
  kind = kind || 'ok';
  if (s.type === 'auto') return;
  if (s.type === 'pick') {
    if (kind === 'red' && s.red) { const id = Object.keys(s.red)[0]; examSpot(id); await zz(60); if (EX.zoom) examVerdict('act'); return; }
    if (kind === 'wrong') { const id = Object.keys(s.spots).find(k => !(s.need || []).includes(k)); if (id) { examSpot(id); await zz(60); if (EX.zoom) examVerdict(s.spots[id].verdicts ? s.spots[id].verdicts[0].k : 'ok'); } return; }
    for (const id of (s.need || [])) { if (EX.done[id]) continue; examSpot(id); await zz(60); if (EX.zoom) { const sp = s.spots[id]; examVerdict(sp.verdicts ? sp.truth(EX.st) : 'act'); } await zz(60); }
    if (s.confirmBtn && EX.confirmReady) examConfirm();
    if (s.judge && !EX.stDone) examJudge(s.judge.truth(EX.st));
    return;
  }
  if (s.type === 'choice') { EX.sel = kind === 'wrong' ? [s.opts.findIndex((_, i) => !s.ans.includes(i))] : s.ans.slice(); examSubmit(); return; }
  if (s.type === 'fill') { s.blanks.forEach((b, i) => { const el = $('#ex_fill_' + i); if (el) el.value = kind === 'wrong' ? '999' : b.accept[0]; }); examSubmit(); return; }
  if (s.type === 'qa') { const el = $('#ex_qa'); if (el) el.value = kind === 'wrong' ? '不知道，直接下一步。' : s.model; examSubmit(); return; }
  if (s.type === 'talk') { const el = $('#ex_talk'); if (el) el.value = kind === 'wrong' ? '已经操作完了。' : (typeof s.sample === 'function' ? s.sample(EX.st) : s.sample); examTalkSend(); return; }
  if (s.type === 'drag') { EX.st.handle = kind === 'wrong' ? 40 : 100; rerenderScene(); examDragEnd(); return; }
}
/* 一键跑完（回归用）：按 plan 数组逐步执行，如 ['ok','ok','red','ok'…]，未指定的步骤按 ok */
async function examRun(plan) {
  const zz = ms => new Promise(r => setTimeout(r, EX_T(ms)));
  let guard = 0;
  while (EX.exam && guard++ < 80) {
    const s = examStation();
    if (s.type === 'auto') { while (EX.exam && examStation() === s) await zz(120); continue; }
    const k = (plan && plan[s.id]) || 'ok';
    if (k === 'red') { await examAuto('red'); await zz(80); $$('.mask').forEach(m => m.remove()); await examAuto('ok'); }
    else if (k === 'wrong') { await examAuto('wrong'); await zz(80); $$('.mask').forEach(m => m.remove()); await examAuto('ok'); }
    else await examAuto('ok');
    await zz(80);
    if (EX.exam && EX.stDone) examNext();
    await zz(80);
  }
}
