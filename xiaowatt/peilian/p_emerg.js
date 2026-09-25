/* ===== 场景 B · 应急处置页：情境列表 → 处置要点 → 事例纠错 → 信息报送 → AI 点评 ===== */

const EM = { id: null, step: 0, mode: 'teach', a: { pts: '', cs: '', rep: '' }, sec: 0, timer: null, res: null, rec: null, hint: null, hintLv: {}, cat: 'all' };
const EM_STEPN = { pts: '处置要点', cs: '事例纠错', rep: '信息报送' };
function emSteps(e) { return ['pts'].concat(e.cs ? ['cs'] : []).concat((e.rep || []).length ? ['rep'] : []); }

function pageEmerg() {
  if (EM.res) return emResultHTML();
  if (EM.id) return emFormHTML();
  return emListHTML();
}

/* ---------- 情境列表 ---------- */
function emListHTML() {
  const recs = emRecords();
  const best = {}; allRecs().filter(r => r.src === 'em').forEach(r => { best[r.eid] = Math.max(best[r.eid] || 0, r.score); });
  const cards = new Set(EMG.map(e => e.card)).size;
  const list = EMG.filter(e => EM.cat === 'all' || e.cat === EM.cat);
  return `<div class="wrap tkwrap emwrap">
    <div class="ph"><h2>应急处置</h2><span class="sub">${cards} 类应急处置卡 · ${EMG.length} 个情境　变电管理一所巡维中心</span></div>
    <div class="card tkintro">
      <div class="tkask"><b>作答说明</b><ol>
        <li>处置要点：看情境，把处置要点逐项写完整（可口述），每项一个得分点；提交后逐项点评，并补充遗漏的要点原文。</li>
        <li>事例纠错：阅读一段处置经过，指出其中违反注意事项的做法；注意事项是关键得分点，没指出的标为关键遗漏。</li>
        <li>信息报送：涉及人身伤害、触电、火灾的情境，写出电话首报与续报内容，按《变电管理一所应急信息报送工作指引》加分。</li>
        <li>计分：处置要点 ${EMG_CFG.pts} 分 + 事例纠错 ${EMG_CFG.notes} 分（没有注意事项的情境，处置要点计 100 分）；信息报送每项加 ${EMG_CFG.bonus} 分，总分封顶 100，及格 ${EMG_CFG.pass} 分。</li></ol></div>
      <div class="tkmodes">
        <label class="tkmd"><input type="radio" name="emmode" value="teach" ${EM.mode === 'teach' ? 'checked' : ''}><b>训练模式</b><span>显示得分点数量，可要三级提示</span></label>
        <label class="tkmd"><input type="radio" name="emmode" value="exam" ${EM.mode === 'exam' ? 'checked' : ''}><b>考核模式</b><span>不给提示，计时，提交后一次性点评</span></label>
      </div>
    </div>
    <div class="chips emcats">${[['all', '全部']].concat(EMG_CAT.map(c => [c.k, c.n])).map(([k, n]) => `<span class="chip ${EM.cat === k ? 'on' : ''}" data-emcat="${k}">${n} ${k === 'all' ? EMG.length : EMG.filter(e => e.cat === k).length}</span>`).join('')}</div>
    <div class="emgrid">${list.map(e => `<div class="emt ${best[e.id] != null ? (best[e.id] >= EMG_CFG.pass ? 'ok' : 'w') : ''}" data-emgo="${e.id}">
      <div class="emt1"><i class="ctag">${h((EMG_CAT.find(c => c.k === e.cat) || {}).n)}</i><b>${h(e.card)}</b></div>
      <div class="emt2">${h(e.sc || e.phen.slice(0, 26) + (e.phen.length > 26 ? '…' : ''))}</div>
      <div class="emt3"><span>要点 ${e.pts.length}</span>${e.cs ? '<span>事例纠错</span>' : ''}${(e.rep || []).length ? '<span>信息报送</span>' : ''}</div>
      <div class="emt4">${best[e.id] != null ? '最好 <b class="mono">' + best[e.id] + '</b>' : '未练'}</div></div>`).join('')}</div>
    <div class="card"><div class="ch"><b>我的演练档案</b><span class="note">每次作答一份档案，可回看点评</span></div>
      ${recs.length ? `<table class="tb tkrecs"><tr><th>时间</th><th>情境</th><th>模式</th><th>用时</th><th>得分</th><th>结论</th><th>关键遗漏</th><th></th></tr>${recs.map((r, i) => { const e = EMGMAP[r.id] || {}; return `<tr><td>${h(r.d)}</td><td>${h(e.card || '')}${e.sc ? ' · ' + h(e.sc) : ''}</td><td>${r.mode === 'exam' ? '考核模式' : '训练模式'}</td><td>${Math.floor((r.sec || 0) / 60)}分${(r.sec || 0) % 60}秒</td><td class="mono">${r.score}</td><td>${r.pass ? '<span class="tag ok">合格</span>' : '<span class="tag bad">不合格</span>'}</td><td>${r.keyMiss ? '<span class="tag w">' + r.keyMiss + ' 处</span>' : '—'}</td><td><button class="btn s" data-emopen="${i}">回看</button></td></tr>`; }).join('')}</table>` : '<div class="empty">还没有应急处置的作答记录，点上面任一情境开始</div>'}
    </div>
  </div>`;
}

/* ---------- 作答 ---------- */
function emStart(id, mode) {
  const e = EMGMAP[id]; if (!e) return;
  EM.id = id; EM.step = 0; EM.mode = mode || EM.mode; EM.a = { pts: '', cs: '', rep: '' }; EM.res = null; EM.rec = null; EM.sec = 0; EM.hint = null; EM.hintLv = {};
  if (EM.timer) clearInterval(EM.timer);
  EM.timer = setInterval(() => { EM.sec++; const t = $('#emtimer'); if (t) t.textContent = String(Math.floor(EM.sec / 60)).padStart(2, '0') + ':' + String(EM.sec % 60).padStart(2, '0'); }, 1000);
  goPage('emerg');
}
function emFormHTML() {
  const e = EMGMAP[EM.id], steps = emSteps(e), k = steps[EM.step], teach = EM.mode === 'teach';
  const catN = (EMG_CAT.find(c => c.k === e.cat) || {}).n;
  const box = k === 'pts' ? `<div class="ch"><b>处置要点</b><span class="note">一条一行，把你会怎么处置写完整；可按麦克风口述${teach ? '　本情境共 ' + e.pts.length + ' 个得分点' : ''}</span></div>`
    : k === 'cs' ? `<div class="ch"><b>事例纠错</b><span class="note">阅读下面的处置经过，指出其中做得不对的地方（一条一行）</span></div><blockquote class="emcase">${h(e.cs.text)}</blockquote>`
      : `<div class="ch"><b>信息报送</b><span class="note">假设你第一时间获知这起事件：写出电话首报的内容，以及接下来怎么续报</span></div>`;
  return `<div class="wrap tkwrap emwrap">
    <div class="ph"><h2>应急处置</h2><span class="sub">${h(catN)} · ${h(e.card)}${e.sc ? ' · ' + h(e.sc) : ''}</span>
      <span class="tktimer" id="emtimer">${String(Math.floor(EM.sec / 60)).padStart(2, '0')}:${String(EM.sec % 60).padStart(2, '0')}</span><span class="tag">${teach ? '训练模式' : '考核模式'}</span>
      <span class="r"><button class="btn s g" id="emback">返回情境列表</button></span></div>
    <div class="card emhead ho">
      <div class="emh1"><b>${h(e.card)}</b>${e.sc ? `<span class="tag">${h(e.sc)}</span>` : ''}<span class="note">应急处置卡</span></div>
      <table class="tb s emcardt"><tr><th>事故现象</th><td>${h(e.phen)}</td></tr>${e.who ? `<tr><th>适用人员</th><td>${h(e.who)}</td></tr>` : ''}</table>
      <div class="emsit"><b>情境</b><span>${h(e.sit)}</span></div>
    </div>
    <div class="emsteps">${steps.map((s, i) => `<span class="${i === EM.step ? 'on' : i < EM.step ? 'done' : ''}"><i>${i + 1}</i>${EM_STEPN[s]}</span>`).join('')}<span><i>${steps.length + 1}</i>AI 点评</span></div>
    <div class="card emq ${k === 'cs' ? 'ho' : 'hg'}">${box}
      <textarea id="em_in" rows="${k === 'pts' ? 10 : 6}" placeholder="${k === 'pts' ? '例：1、立即……\n2、……' : k === 'cs' ? '例：……没有……，违反了……' : '例：×时×分，××站……；在检查中……'}">${h(EM.a[k] || '')}</textarea>
      <div class="embar"><button class="mic" id="em_mic" title="语音输入"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v4"/></svg></button>
        ${teach && k !== 'rep' ? '<button class="btn s g" id="emhint">要一条提示</button>' : ''}
        <span class="r">${EM.step > 0 ? '<button class="btn s" id="emprev">上一步</button>' : ''}${EM.step < steps.length - 1 ? '<button class="btn pri" id="emnext">下一步</button>' : '<button class="btn pri" id="emsubmit">提交点评</button>'}</span></div>
      ${EM.hint && EM.hint.k === k ? `<div class="tkhintbox"><b>提示 ${EM.hint.lv}/3</b>${h(EM.hint.msg)}</div>` : ''}
    </div>
  </div>`;
}
function emRead() { const i = $('#em_in'); if (!i || !EM.id) return; const e = EMGMAP[EM.id]; EM.a[emSteps(e)[EM.step]] = i.value; }
function emHint() {
  emRead();
  const e = EMGMAP[EM.id], k = emSteps(e)[EM.step];
  if (k === 'pts') {
    const r = emgScore(e, EM.a);
    const p = r.pts.find(x => x.st !== 'ok');
    if (!p) { EM.hint = { k, lv: 3, msg: '处置要点都答到了，可以进入下一步。' }; return emPaint(); }
    const lv = EM.hintLv['p' + p.i] = Math.min(3, (EM.hintLv['p' + p.i] || 0) + 1);
    const src = e.pts[p.i];
    EM.hint = { k, lv, msg: lv === 1 ? '还有要点没写到，想想这几个关键词：' + src.k.map(g => g.split('|')[0]).join('、') + '。' : lv === 2 ? '这一项的前半句是：' + src.t.slice(0, Math.ceil(src.t.length / 2)) + '……' : '处置卡原文：' + src.t };
  } else if (k === 'cs') {
    const r = emgScore(e, EM.a);
    const b = r.bads.find(x => x.st !== 'ok');
    if (!b) { EM.hint = { k, lv: 3, msg: '事例里的问题都指出了。' }; return emPaint(); }
    const lv = EM.hintLv['b' + b.i] = Math.min(3, (EM.hintLv['b' + b.i] || 0) + 1);
    EM.hint = { k, lv, msg: lv === 1 ? '对照注意事项再读一遍：' + b.note : lv === 2 ? '重点看事例里这一段：' + b.t.slice(0, Math.ceil(b.t.length / 2)) + '……' : '问题所在：' + b.t };
  }
  emPaint();
}
function emPaint() { const pg = $('#hpage'); if (!pg || !EM.id) return; pg.innerHTML = pageEmerg(); emerAfter(); }
function emSubmit() {
  emRead();
  const e = EMGMAP[EM.id];
  if (!(EM.a.pts || '').trim()) { toast('先把处置要点写上再提交', 'bad'); return; }
  if (EM.timer) { clearInterval(EM.timer); EM.timer = null; }
  const r = emgScore(e, EM.a);
  const rec = { d: stamp(), ts: Date.now(), id: e.id, mode: EM.mode, sec: EM.sec, a: Object.assign({}, EM.a), score: r.score, pass: r.pass, keyMiss: r.keyMiss, dims: r.dims, sum: emSumOf(r) };
  emSave(rec);
  const t = taskHit('em', e.id, r.score, r.pass);
  EM.res = r; EM.rec = rec;
  goPage('emerg');
  if (t) toast('成绩已回写到「' + (t.targetN || '应急处置') + '」培训任务', 'ok');
}

/* ---------- 点评 ---------- */
function emResultHTML() {
  const e = EMGMAP[EM.id], r = EM.res, rec = EM.rec || {}, rv = emgReview(e, r);
  const stTag = st => st === 'ok' ? '<span class="tag ok">答到</span>' : st === 'part' ? '<span class="tag w">不完整</span>' : '<span class="tag bad">遗漏</span>';
  const f1 = v => Math.round(v * 10) / 10;
  return `<div class="wrap tkwrap emwrap">
    <div class="ph"><h2>点评结果</h2><span class="sub">${h(e.card)}${e.sc ? ' · ' + h(e.sc) : ''}　${rec.mode === 'exam' ? '考核模式' : '训练模式'}　用时 ${Math.floor((rec.sec || 0) / 60)} 分 ${(rec.sec || 0) % 60} 秒</span>
      <span class="r"><button class="btn s" id="emagain">再练一次</button><button class="btn s" id="emlist">换一个情境</button><button class="btn s g" id="emexp">导出结果</button></span></div>
    <div class="tkres">
      <div class="card tkscore ${r.pass ? 'ok' : 'bad'}"><b>${r.score}</b><span>得分 / 100</span>
        <div class="verd">${r.pass ? '合格' : '不合格'}</div>
        ${r.keyMiss ? `<div class="fat"><span>关键遗漏 ${r.keyMiss} 处</span></div>` : ''}
        <div class="note">处置要点 ${r.sp}/${r.ptot}${r.hasN ? '　事例纠错 ' + r.sn + '/' + EMG_CFG.notes : ''}${r.rep.length ? '　信息报送 +' + r.sb : ''}　及格线 ${EMG_CFG.pass}</div></div>
      <div class="card emai hg"><div class="ch"><b>AI 点评</b><em class="ai">AI</em><span class="note">按处置卡逐项比对后生成</span></div>
        <p>${h(rv.sum)}</p>
        ${rv.add.length ? `<div class="ch2"><b>补充遗漏（处置卡原文）</b></div><ol class="emadd">${rv.add.map(t => `<li>${h(t)}</li>`).join('')}</ol>` : '<div class="note">处置要点没有遗漏。</div>'}
      </div>
    </div>
    <div class="card"><div class="ch"><b>处置要点逐项</b><span class="note">每项 ${f1(r.pts[0] ? r.pts[0].per : 0)} 分 · 答到得全分，不完整得一半</span></div>
      <table class="tb emtb"><tr><th style="width:36px">#</th><th>处置要点（处置卡原文）</th><th style="width:76px">结果</th><th style="width:60px">得分</th></tr>
      ${r.pts.map(x => `<tr class="${x.st}"><td class="mono">${x.i + 1}</td><td>${h(x.t)}</td><td>${stTag(x.st)}</td><td class="mono">${f1(x.got)}</td></tr>`).join('')}</table>
      ${e.ex ? `<div class="note" style="margin-top:6px">附注：${h(e.ex)}</div>` : ''}</div>
    ${r.hasN ? `<div class="card ho"><div class="ch"><b>事例纠错</b><span class="note">注意事项是关键得分点，没指出的记为关键遗漏</span></div>
      <blockquote class="emcase">${h(e.cs.text)}</blockquote>
      <table class="tb emtb"><tr><th>事例中的做法</th><th>违反的注意事项</th><th style="width:84px">结果</th><th style="width:60px">得分</th></tr>
      ${r.bads.map(x => `<tr class="${x.st}"><td>${h(x.t)}</td><td class="note">${h(x.note)}</td><td>${x.st === 'ok' ? '<span class="tag ok">已指出</span>' : '<span class="tag bad">关键遗漏</span>'}</td><td class="mono">${f1(x.got)}</td></tr>`).join('')}</table>
      <div class="ch2"><b>注意事项原文</b><span class="note">出自${e.nsrc === '处置卡' ? '《' + h(e.card) + '应急处置卡》' : '场景归类表'}</span></div>
      <ol class="emnotes">${e.notes.map(n => `<li>${h(n)}</li>`).join('')}</ol></div>` : ''}
    ${r.rep.length ? `<div class="card"><div class="ch"><b>信息报送</b><span class="note">加分项 · 依据《变电管理一所应急信息报送工作指引》</span></div>
      <table class="tb emtb"><tr><th>报送要求</th><th style="width:84px">结果</th><th style="width:60px">加分</th></tr>
      ${r.rep.map(x => `<tr class="${x.st}"><td>${h(x.t)}</td><td>${x.st === 'ok' ? '<span class="tag ok">答到</span>' : '<span class="tag">未提及</span>'}</td><td class="mono">+${x.got}</td></tr>`).join('')}</table></div>` : ''}
    <div class="card"><div class="ch"><b>我的作答</b></div>
      ${emSteps(e).map(k => `<div class="emans"><b>${EM_STEPN[k]}</b><pre>${h((rec.a || EM.a)[k] || '（未作答）')}</pre></div>`).join('')}</div>
  </div>`;
}
function emExport() {
  const e = EMGMAP[EM.id], r = EM.res; if (!r) return;
  const L = [['类别', '内容', '结果', '得分']];
  r.pts.forEach(x => L.push(['处置要点', x.t, { ok: '答到', part: '不完整', miss: '遗漏' }[x.st], Math.round(x.got * 10) / 10]));
  r.bads.forEach(x => L.push(['事例纠错', x.t + '｜' + x.note, x.st === 'ok' ? '已指出' : '关键遗漏', Math.round(x.got * 10) / 10]));
  r.rep.forEach(x => L.push(['信息报送', x.t, x.st === 'ok' ? '答到' : '未提及', x.got]));
  L.push(['总分', e.card + (e.sc ? ' · ' + e.sc : ''), r.pass ? '合格' : '不合格', r.score]);
  const csv = '﻿' + L.map(x => x.map(c => '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"').join(',')).join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = '应急处置点评_' + e.card + '.csv'; a.click(); toast('点评结果已导出（CSV，可用 Excel 打开）', 'ok');
}

/* ---------- 挂载 ---------- */
function emerAfter() {
  if (EM.res) {
    const a = $('#emagain'); if (a) a.onclick = () => emStart(EM.id, EM.mode);
    const l = $('#emlist'); if (l) l.onclick = () => { EM.id = null; EM.res = null; goPage('emerg'); };
    const x = $('#emexp'); if (x) x.onclick = emExport;
    return;
  }
  if (EM.id) {
    const e = EMGMAP[EM.id], steps = emSteps(e), k = steps[EM.step];
    const inp = $('#em_in'); if (inp) inp.oninput = () => { EM.a[k] = inp.value; };
    const m = $('#em_mic'); if (m) m.onclick = () => micStart(m, inp, emgModel(e, 'ok')[k]);
    const hb = $('#emhint'); if (hb) hb.onclick = emHint;
    const nx = $('#emnext'); if (nx) nx.onclick = () => { emRead(); EM.step++; EM.hint = null; emPaint(); };
    const pv = $('#emprev'); if (pv) pv.onclick = () => { emRead(); EM.step--; EM.hint = null; emPaint(); };
    const sb = $('#emsubmit'); if (sb) sb.onclick = emSubmit;
    const bk = $('#emback'); if (bk) bk.onclick = () => { if (EM.timer) { clearInterval(EM.timer); EM.timer = null; } EM.id = null; goPage('emerg'); };
    return;
  }
  $$('input[name=emmode]').forEach(i => i.onchange = () => { EM.mode = i.value; });
}
document.addEventListener('click', ev => {
  const g = ev.target.closest('[data-emgo]');
  if (g) { const m = ($$('input[name=emmode]').find(i => i.checked) || {}).value; return emStart(g.dataset.emgo, m || EM.mode); }
  const c = ev.target.closest('[data-emcat]');
  if (c) { EM.cat = c.dataset.emcat; EM.res = null; if (!EM.timer) EM.id = null; return goPage('emerg'); }
  const o = ev.target.closest('[data-emopen]');
  if (o) { const rec = emRecords()[+o.dataset.emopen]; const e = rec && EMGMAP[rec.id]; if (e) { EM.id = rec.id; EM.rec = rec; EM.res = emgScore(e, rec.a); EM.mode = rec.mode; goPage('emerg'); } }
});
