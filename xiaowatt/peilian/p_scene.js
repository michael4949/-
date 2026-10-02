/* ===== 陪练场景引擎：安规知识 / 保命技能 / 案例分析（题库作答引擎共用）· 制度学习 · 工作票 =====
   每个场景：选题 → 作答 → 判定 → 结果（各自指标体系）→ 记录（recSave）→ 计入对应能力维度。
   10/2 客户意见：安规 / 保命 / 案例三个陪练改用《安规考试题库 0407 更新》（27 个专业，默认变电运行类，可切换）；
   制度学习陪练的文件库换成客户提供的六个主题制度文件，隐患判定、硬措施两个主题用客户题库出题。 */

const SC_DEF = {
  rule: { title: '安规考试题库 · 单选 · 多选 · 判断 · 答错即给制度名称及条款内容', src: '安规考试题库（0407 更新）', how: [['作答', '单选 · 多选 · 判断，答错当场给出制度名称及条款内容，每题再指认依据'], ['出题', '按六个内容类别轮流抽题，也可按类别专练；训练 8 题 · 考核 12 题'], ['依据', '题库「制度名称及条款内容」列 · 题库按专业切换']], chips: QBANK.cats.rule },
  life: { title: '保命题型 · 题库中「是否保命题型 = 是」的题', src: '安规考试题库 · 保命题型', how: [['作答', '单选 · 多选 · 判断，答错当场给出制度名称及条款内容'], ['出题', '只抽保命题型，按六个内容类别轮流抽题，也可按类别专练'], ['依据', '题库「制度名称及条款内容」列 · 题库按专业切换']], chips: QBANK.cats.life },
  case: { title: '小案例 · 大案例 · 读案例逐题作答', src: '安规考试题库 · 案例题 · 班组长推送', how: [['作答', '读案例题干，逐道子题作答（单选 · 多选 · 判断）'], ['判定', '子题逐题判定，按子题内容类别计入雷达'], ['来源', '题库小案例题 / 大案例题 + 班组长推送的通报案例']], chips: [['small', '小案例题'], ['big', '大案例题']] },
  inst: { title: '制度文件 → 课件 → 数字人讲课 → 测验 → 考试分析', src: '客户制度文件 · 六个主题 · 上传文件', how: [['学习', '制度文件自动生成课件，数字人讲课'], ['测验', '隐患判定、硬措施两个主题用客户题库出题；其余主题从课件自动出题，关键条款必考'], ['分析', '考完自动给出个人分析与班组对比']], chips: ZTHEMES },
  wt: { task: '110kV考核站 #3 主变检修 · 第一种工作票 · 安全措施填写' }
};
const SC = { k: null, sub: '', mode: 'teach', timer: null, sec: 0, step: 'form', a: {}, res: null, qs: [], i: 0, retry: null, doc: null, cw: null, rec: null };
function scTimer() {
  if (SC.timer) clearInterval(SC.timer);
  SC.sec = 0; SC.timer = setInterval(() => { SC.sec++; const t = $('#sctimer'); if (t) t.textContent = fmtSec(SC.sec); }, 1000);
}
function scStop() { if (SC.timer) { clearInterval(SC.timer); SC.timer = null; } }
function scStart(k, sub, mode) {
  SC.k = k; SC.sub = sub || ''; SC.mode = mode === 'exam' ? 'exam' : 'teach'; SC.res = null; SC.rec = null; SC.a = {}; SC.step = 'form'; SC.retry = null;
  if (k === 'rule' || k === 'life' || k === 'case') qbBegin();
  else if (k === 'inst') instBegin();
  else if (k === 'wt') wtBegin();
  goPage('scene');
}
function scOpenRec(r) {
  scStop(); SC.k = r.wt ? 'wt' : r.src; SC.mode = /考核|exam/.test(r.mode) ? 'exam' : 'teach'; SC.rec = r; SC.res = r.rs || null; SC.a = r.a || {}; SC.sub = r.subk || ''; SC.step = 'result'; SC.sec = r.sec || 0;
  if (!SC.res) { goPage('review'); return; }
  goPage('scene');
}
function pageScene() {
  if (!SC.k) return pageCenter();
  if (SC.k === 'rule' || SC.k === 'life' || SC.k === 'case') return qbPage();
  if (SC.k === 'inst') return instPage();
  if (SC.k === 'wt') return wtPage();
  return pageCenter();
}
function sceneAfter() { if (SC.k === 'inst' && SC.step === 'exam' && EX.on) examPaint(); }
function scHead(title, sub) {
  const S = SCENE_MAP[SC.k] || SCENE_MAP.tk;
  return `<div class="ph"><h2>${h(SC.k === 'wt' ? '两票填写陪练 · 工作票' : S.n)}</h2><span class="sub">${h(sub || '')}</span>${SC.step !== 'result' ? `<span class="tktimer" id="sctimer">${fmtSec(SC.sec)}</span>` : ''}<span class="tag">${SC.mode === 'teach' ? '训练模式' : '考核模式'}</span><span class="r"><button class="btn s g" data-go="center">返回场景中心</button></span></div>`;
}
/* 记录：各场景统一写入本机记录（评分复盘 / 成长档案 / 能力测算共用） */
function scSave(o) {
  const ts = Date.now();
  const rec = Object.assign({ src: SC.k === 'wt' ? 'tk' : SC.k, wt: SC.k === 'wt', ts, d: stampOf(ts), mode: SC.mode === 'exam' ? '考核模式' : '训练模式', sec: SC.sec, subk: SC.sub }, o);
  recSave(rec); scStop();
  if (typeof taskHit === 'function') taskHit(rec.src, '', rec.score, rec.pass);
  return rec;
}
function scResultHead(res, dimsK) {
  const dims = res.dims;
  return `<div class="card emres ${res.pass ? 'hg' : 'ho'}"><div class="rvhead"><div class="rvbig ${res.pass ? '' : 'wv'}">${res.score}</div><div>
      <div class="hrow">${res.pass ? '<span class="tag ok">合格</span>' : '<span class="tag rl">不合格</span>'} <span class="tag">${SC.mode === 'teach' ? '训练模式' : '考核模式'}</span> 用时 ${fmtSec(SC.sec)}${res.sum && res.sum.length ? ' · 失分点：' + h(res.sum.join('、')) : ' · 没有失分项'}</div>
      <div class="hrow"><em class="ai">AI 点评</em> ${h(res.advice || '')}</div>
      <div class="emdims">${skillsOf(dimsK).map(d => `<span><i>${d.n}</i><b class="mono ${dims[d.k] == null ? '' : dims[d.k] >= 75 ? 'gv' : 'wv'}">${dims[d.k] == null ? '—' : dims[d.k]}</b></span>`).join('')}</div></div></div></div>`;
}
function scResultFoot(again) {
  return `<div class="card"><div class="scgo"><button class="btn pri" data-start="${again}">再练一次</button><button class="btn" data-go="review">评分复盘</button><button class="btn" data-go="growth">成长档案</button><button class="btn g" data-go="center">返回场景中心</button></div></div>`;
}

/* ======================= 题库作答引擎：安规知识 / 保命技能 / 案例分析共用（10/2 客户意见：三个陪练改用《安规考试题库 0407 更新》） =======================
   安规知识 = 单选 + 多选 + 判断；保命技能 = 题库中「是否保命题型 = 是」的题；案例分析 = 小案例 / 大案例（题干 + 子题）。
   依据 = 题库「制度名称及条款内容」列；雷达维度 = 题目内容类别（gen_bank.py 打标），得分 = 该类别答对率。 */
const LS_PRO = 'xwt_pro';
const QB = { pro: lsGet(LS_PRO, null) || QBANK.default };
function qbPro() { return QBANK.pros.find(p => p.id === QB.pro) || QBANK.pros.find(p => p.id === QBANK.default) || QBANK.pros[0]; }
function qbSetPro(id) { if (QBANK.pros.some(p => p.id === id)) { QB.pro = id; lsSet(LS_PRO, id); } }
function qbCatN(k, key) { const c = (QBANK.cats[k] || []).find(x => x[0] === key); return c ? c[1] : key; }
function qbPool(k, cat) {
  const P = qbPro();
  if (k === 'rule') return P.q.filter(q => !cat || q.cat === cat);
  if (k === 'life') return P.q.filter(q => q.life && (!cat || q.lcat === cat));
  return [];
}
function qbNorm(q, i, k) {
  const type = q.t === 'judge' ? 'judge' : q.t === 'multi' ? 'multi' : 'single';
  const L = 'ABCDEFGHI';
  const ans = type === 'judge' ? !!q.ans : type === 'multi' ? String(q.ans).split('').map(c => L.indexOf(c)).filter(x => x >= 0 && x < q.opts.length).sort() : L.indexOf(String(q.ans)[0]);
  const cat = k === 'life' ? q.lcat : q.cat;
  return { id: 'bq' + i, type, stem: q.stem, opts: q.opts || [], ans, basis: q.basis || '', cat, catN: qbCatN(k, cat) };
}
function qbSample(pool, n, r, byCat) {
  if (!byCat) return shuffled(pool, r).slice(0, n);
  const groups = {}; pool.forEach(q => { (groups[q.cat] = groups[q.cat] || []).push(q); });
  const keys = shuffled(Object.keys(groups), r).map(k => shuffled(groups[k], r));
  const out = []; let i = 0;
  while (out.length < n && keys.some(g => g.length)) { const g = keys[i % keys.length]; if (g.length) out.push(g.shift()); i++; }
  return shuffled(out, r);
}
function qbBegin() {
  const k = SC.k, r = rng(Date.now() % 100003 + 11), P = qbPro();
  SC.case = null;
  if (k === 'case') {
    const all = P.cases, byKind = all.filter(c => c.kind === SC.sub);
    const c = byKind.length ? byKind[Math.floor(r() * byKind.length)] : (all.find((x, i) => 'c' + i === SC.sub) || all[Math.floor(r() * all.length)]);
    SC.case = c; SC.sub = c.kind;
    SC.qs = c.qs.map((q, i) => qbNorm(Object.assign({}, q, { lcat: q.cat }), i, 'case'));
  } else {
    const cat = SC.sub && (QBANK.cats[k] || []).some(x => x[0] === SC.sub) ? SC.sub : '';
    SC.sub = cat;
    let pool = qbPool(k, cat); if (pool.length < 4) pool = qbPool(k, '');
    const n = SC.mode === 'exam' ? 12 : 8;
    SC.qs = qbSample(pool.map(q => Object.assign({}, q, { cat: k === 'life' ? q.lcat : q.cat })), n, r, !cat).map((q, i) => qbNorm(Object.assign({}, q, { lcat: q.cat }), i, k));
  }
  /* 依据指认：正确依据 + 两条他题的依据 */
  const basisPool = (k === 'case' ? P.q : qbPool(k, '')).map(q => q.basis).filter(b => b && b.length > 6);
  SC.qs.forEach((q, i) => {
    const others = shuffled(basisPool.filter(b => b !== q.basis), r).slice(0, 2);
    q.citeOpts = q.basis ? shuffled([q.basis].concat(others), r) : [];
  });
  SC.i = 0; SC.a = {}; SC.cites = {}; SC.times = {}; SC.retry = null; SC.first = null; SC.step = 'form'; scTimer(); SC._t0 = Date.now();
}
function qbOk(q, a) {
  if (a == null) return false;
  if (q.type === 'multi') { if (!Array.isArray(a) || !a.length) return false; const x = a.slice().sort(); return x.length === q.ans.length && x.every((v, i) => v === q.ans[i]); }
  return a === q.ans;
}
function qbAnsText(q, a) {
  const L = 'ABCDEFGHI';
  if (a == null) return '未作答';
  if (q.type === 'judge') return a ? '正确' : '错误';
  if (q.type === 'multi') return (Array.isArray(a) ? a : []).slice().sort().map(i => L[i]).join('') || '未作答';
  return L[a] + '，' + (q.opts[a] || '');
}
function qbStdText(q) { return qbAnsText(q, q.ans); }
function qbTitle() {
  const k = SC.k, P = qbPro();
  if (k === 'case') return (SC.case ? (SC.case.kind === 'big' ? '大案例' : '小案例') : '案例') + ' · ' + P.n + ' · ' + SC.qs.length + ' 道子题';
  return (k === 'life' ? '保命题型' : '安规题库') + ' · ' + P.n + ' · ' + (SC.sub ? qbCatN(k, SC.sub) : '按内容类别抽题') + ' · ' + SC.qs.length + ' 题';
}
function qbShort(t, n) { return t.length > n ? t.slice(0, n) + '…' : t; }
function qbPage() {
  if (SC.step === 'result') return qbResult();
  const q = SC.qs[SC.i], a = SC.a[q.id], done = a != null, teach = SC.mode === 'teach', retry = SC.retry, last = SC.i === SC.qs.length - 1, L = 'ABCDEFGHI';
  const ok = done ? qbOk(q, a) : null;
  const pick = SC.mpick || [];
  let opts;
  if (q.type === 'single') opts = `<div class="qzopts">${q.opts.map((o, i) => `<div class="qzo ${done && teach ? (i === q.ans ? 'ok' : a === i ? 'bad' : '') : ''} ${a === i ? 'on' : ''}" data-qbopt="${i}"><b>${L[i]}</b><span>${h(o)}</span></div>`).join('')}</div>`;
  else if (q.type === 'multi') opts = `<div class="qzopts">${q.opts.map((o, i) => { const on = done ? (Array.isArray(a) && a.includes(i)) : pick.includes(i); return `<div class="qzo ${done && teach ? (q.ans.includes(i) ? 'ok' : on ? 'bad' : '') : ''} ${on ? 'on' : ''}" data-qbmulti="${i}"><b>${on ? '✓' : L[i]}</b><span>${h(o)}</span></div>`; }).join('')}</div>${done ? '' : `<div class="embar"><span class="tk3">多选题：勾选全部正确项后确认</span><span class="r"><button class="btn s pri" data-qbcommit="1">确认本题</button></span></div>`}`;
  else opts = `<div class="qzopts row">${[[true, '正确'], [false, '错误']].map(([v, n]) => `<div class="qzo ${done && teach ? (v === q.ans ? 'ok' : a === v ? 'bad' : '') : ''} ${a === v ? 'on' : ''}" data-qbjudge="${v ? 1 : 0}"><b>${v ? '√' : '×'}</b><span>${n}</span></div>`).join('')}</div>`;
  const caseBox = SC.case ? `<div class="card emhead ho"><div class="emh1"><b>${SC.case.kind === 'big' ? '大案例题' : '小案例题'}</b><span class="tag">${h(qbPro().n)}</span><span class="note">读案例，逐题作答</span></div><div class="emsit"><b>案例</b><span>${h(SC.case.stem)}</span></div></div>` : '';
  return `<div class="wrap tkwrap">${scHead('', qbTitle())}
    <div class="emsteps"><span class="${retry ? 'done' : 'on'}"><i>1</i>作答 ${SC.retry ? SC.first.qs.length : SC.qs.length} 题</span><span class="${retry ? 'on' : ''}"><i>2</i>错题复练</span><span><i>3</i>AI 点评</span></div>
    ${caseBox}
    <div class="card emq hg"><div class="exq">
      <div class="exh"><b>${retry ? '错题复练 · ' : ''}第 ${SC.i + 1} / ${SC.qs.length} 题</b><i class="ctag">${q.type === 'single' ? '单选' : q.type === 'multi' ? '多选' : '判断'}</i><i class="ctag key">${h(q.catN)}</i></div>
      <div class="exprog">${SC.qs.map((x, i) => `<i class="${i === SC.i ? 'on' : SC.a[x.id] != null ? (teach ? (qbOk(x, SC.a[x.id]) ? 'ok' : 'bad') : 'done') : ''}" data-qbgo="${i}"></i>`).join('')}</div>
      <div class="qzq">${h(q.stem)}</div>${opts}
      ${done && teach ? `<div class="tkhintbox ${ok ? '' : 'bad'}"><b>${ok ? '答对' : '答错'}</b>${h('正确答案：' + qbStdText(q))}${q.basis ? `<div class="tk3 qbasis" style="margin-top:4px">制度名称及条款内容 · ${h(q.basis)}</div>` : ''}</div>` : ''}
      ${q.citeOpts.length ? `<div class="rulecite"><span class="tk3">这一题的依据是</span>${q.citeOpts.map((c, ci) => `<span class="chip ${SC.cites[q.id] === c ? 'on' : ''} ${done && teach && SC.cites[q.id] ? (c === q.basis ? 'okc' : SC.cites[q.id] === c ? 'badc' : '') : ''}" data-qbcite="${ci}" title="${h(c)}">${h(qbShort(c, 26))}</span>`).join('')}</div>` : ''}
      <div class="embar"><span class="tk3">${teach ? '答错当场给出制度名称及条款内容；每题再指认依据（计入依据指认）' : '考核模式：交卷后统一给出条款原文'}</span><span class="r">${SC.i > 0 ? `<button class="btn s" data-qbgo="${SC.i - 1}">上一题</button>` : ''}${last ? `<button class="btn pri" data-qbsubmit="1">${retry ? '完成复练 · 看点评' : '交卷'}</button>` : `<button class="btn pri" data-qbgo="${SC.i + 1}">下一题</button>`}</span></div>
    </div></div></div>`;
}
function qbAnswer(v) { const q = SC.qs[SC.i]; if (!q || SC.a[q.id] != null) return; SC.a[q.id] = v; SC.mpick = []; SC.times[q.id] = Math.round((Date.now() - SC._t0) / 1000); SC._t0 = Date.now(); rerender('scene'); }
function qbSubmit() {
  const miss = SC.qs.filter(q => SC.a[q.id] == null).length;
  if (miss) { toast(`还有 ${miss} 题没答`, 'bad'); return; }
  if (!SC.retry) {
    const wrong = SC.qs.filter(q => !qbOk(q, SC.a[q.id]));
    SC.first = { qs: SC.qs, a: Object.assign({}, SC.a), cites: Object.assign({}, SC.cites), times: Object.assign({}, SC.times) };
    if (wrong.length && SC.mode === 'teach') {
      SC.retry = { ids: wrong.map(q => q.id) };
      SC.qs = wrong.map(q => Object.assign({}, q, { id: q.id + '_r' })); SC.a = {}; SC.i = 0; SC.times = {};
      toast(`答错 ${wrong.length} 题，马上复练一遍`, ''); rerender('scene'); return;
    }
    SC.retry = { ids: [], none: true };
  }
  const F = SC.first, k = SC.k, n = F.qs.length;
  const firstOk = F.qs.filter(q => qbOk(q, F.a[q.id])).length, rate = clamp(firstOk / n * 100);
  const citeQ = F.qs.filter(q => q.citeOpts.length), citeOk = citeQ.filter(q => F.cites[q.id] === q.basis).length, citeRate = citeQ.length ? clamp(citeOk / citeQ.length * 100) : null;
  const retryRate = SC.retry.none ? 100 : clamp(SC.qs.filter(q => qbOk(q, SC.a[q.id])).length / SC.qs.length * 100);
  /* 维度 = 内容类别答对率（本次没抽到的类别为空） */
  const dims = {}; skillsOf(k).forEach(d => { const qs = F.qs.filter(q => q.cat === d.k); dims[d.k] = qs.length ? clamp(qs.filter(q => qbOk(q, F.a[q.id])).length / qs.length * 100) : null; });
  const score = Math.round(rate * (citeRate == null ? .85 : .7) + (citeRate == null ? 0 : citeRate * .15) + retryRate * .15);
  const wrong = F.qs.filter(q => !qbOk(q, F.a[q.id])).map(q => ({ t: q.stem, catN: q.catN, a: qbAnsText(q, F.a[q.id]), ans: qbStdText(q), cite: q.basis, orig: '', retry: SC.retry.none ? null : qbOk(SC.qs.find(x => x.id === q.id + '_r'), SC.a[q.id + '_r']) }));
  const weakCats = Object.keys(dims).filter(x => dims[x] != null && dims[x] < 70).map(x => qbCatN(k, x));
  const sum = []; if (wrong.length) sum.push('答错 ' + wrong.length + ' 题'); if (weakCats.length) sum.push('薄弱：' + weakCats.join('、')); if (citeRate != null && citeRate < 80) sum.push('依据指错 ' + (citeQ.length - citeOk));
  const advice = (wrong.length ? `错在「${Array.from(new Set(wrong.map(w => w.catN))).slice(0, 3).join('」「')}」${SC.retry.none ? '' : '，复练答对 ' + SC.qs.filter(q => qbOk(q, SC.a[q.id])).length + ' / ' + SC.qs.length}；` : `${n} 题全对；`) + (citeRate == null ? '' : citeRate >= 80 ? '依据条款指得清楚。' : '依据条款记不牢，答题时多看一眼制度名称与条款内容。');
  SC.res = { score, pass: score >= 60, dims, sum, wrong, advice, cites: { ok: citeOk, n: citeQ.length }, rate, retryRate, title: qbTitle(), pro: qbPro().n };
  SC.step = 'result';
  const sub = k === 'case' ? (SC.case.kind === 'big' ? '大案例' : '小案例') + ' · ' + qbShort(SC.case.stem.replace(/^\s*某日[，,]?/, ''), 22) : (k === 'life' ? '保命题 · ' : '安规 · ') + (SC.sub ? qbCatN(k, SC.sub) : '随机') + ' · ' + n + ' 题';
  SC.rec = scSave({ sub, score, pass: score >= 60, sum, dims, wrong, rs: SC.res, a: F.a, pro: qbPro().n });
  rerender('scene');
}
function qbResult() {
  const R = SC.res, k = SC.k, W = R.wrong || [], C = R.cites || {};
  return `<div class="wrap tkwrap">${scHead('', (R.title || qbTitle()) + ' · 点评')}
    ${scResultHead(R, k)}
    <div class="card"><div class="ch"><b>错题与条款原文</b><span class="note">${W.length} 题${C.n ? ' · 依据指对 ' + C.ok + ' / ' + C.n : ''} · 题库：${h(R.pro || qbPro().n)}</span></div>
      ${W.length ? `<table class="tb"><tr><th>题目</th><th>类别</th><th>你的答案</th><th>正确答案</th><th>复练</th><th>制度名称及条款内容</th></tr>${W.map(w => `<tr><td>${h(w.t)}</td><td class="note">${h(w.catN)}</td><td class="wv">${h(w.a)}</td><td class="gv">${h(w.ans)}</td><td>${w.retry == null ? '—' : w.retry ? '<span class="tag ok">答对</span>' : '<span class="tag rl">仍错</span>'}</td><td class="note qbasis">${h(w.cite || '—')}</td></tr>`).join('')}</table>` : '<div class="note">没有错题。</div>'}</div>
    ${scResultFoot(k + ':' + SC.sub + ':' + SC.mode)}</div>`;
}
/* 案例推送学习生成的测验题也按案例子题类别打标（learn.js 用） */
function caseCatOf(stem) {
  const C = [['c_cause', /原因/], ['c_viol', /违反|违章|违规|禁止|严禁|五防|不得|不应/], ['c_measure', /措施|防范|避免|教训|如何|改进|整改|防止/], ['c_duty', /责任|职责|负责人|许可人|监护人|签发人|操作人|应由/], ['c_hazard', /隐患|事故等级|定性|属于|事件|级别|分级/]];
  const hit = C.find(([k, re]) => re.test(stem)); return hit ? hit[0] : 'c_rule';
}

/* ======================= 制度学习陪练：文件 → 课件 → 数字人讲课 → 测验 → 考试分析 ======================= */
function instBegin() {
  const d = docById(SC.sub) || docAll().find(x => x.theme === SC.sub) || docAll().find(x => x.theme) || docAll()[0];
  SC.sub = d.id; SC.doc = d; SC.cw = cwGen(d); SC.step = 'cw'; SC.cwi = 0; cwMark(SC.cw.id, 0); SC.lecDone = false; scTimer();
}
function instPage() {
  if (SC.step === 'result') return instResult();
  const d = SC.doc, cw = SC.cw, docs = docAll();
  const seen = cwSeenRatio(cw);
  const steps = ['看课件', '数字人讲课', '测验', '考试分析'];
  const cur = SC.step === 'cw' ? (SC.lecDone ? 1 : 0) : SC.step === 'exam' ? 2 : 3;
  return `<div class="wrap tkwrap">${scHead('', d.n + ' · ' + cw.nSec + ' 节 · 关键条款 ' + cw.nKey + ' 条')}
    <div class="emsteps">${steps.map((s, i) => `<span class="${i === cur ? 'on' : i < cur ? 'done' : ''}"><i>${i + 1}</i>${s}</span>`).join('')}</div>
    ${SC.step === 'cw' ? `<div class="card hg"><div class="ch"><b>课件</b><span class="note">由「${h(d.n)}」自动生成 · 已看 ${seen}%</span><span class="r"><select id="inst_doc" data-instdoc="1">${instDocGroups(docs).map(g => `<optgroup label="${h(g[0])}">${g[1].map(x => `<option value="${x.id}" ${x.id === d.id ? 'selected' : ''}>${h(x.n)}</option>`).join('')}</optgroup>`).join('')}</select></span></div>
      <div class="cwwrap"><div class="cwnav">${cw.slides.map((s, i) => `<div class="cwth ${i === SC.cwi ? 'on' : ''} ${cwSeen(cw.id)[i] ? 'seen' : ''}" data-instgo="${i}"><i>${i + 1}</i><span>${h(s.t)}</span></div>`).join('')}</div><div class="cwmain">${slideHTML(cw, SC.cwi)}</div></div>
      <div class="embar"><span class="tk3">${d.bank ? '课件由制度文件自动生成；测验从客户题库「' + h(zbName(d.bank)) + '」抽题（单选 · 多选 · 判断）' : '课件由制度文件自动生成；测验从课件自动出题，关键条款必考'}</span><span class="r"><button class="btn s" data-instgo="${SC.cwi - 1}">上一页</button><button class="btn s" data-instgo="${SC.cwi + 1}">下一页</button><button class="btn s g" data-instlec="1">数字人讲课</button><button class="btn pri" data-instexam="1">开始测验</button></span></div></div>`
      : `<div class="card hg"><div class="ch"><b>测验</b><span class="note">${SC.qs.length} 题 · ${d.bank ? '客户题库「' + h(zbName(d.bank)) + '」' : '从课件自动出题'}</span></div><div id="exbox"></div></div>`}
  </div>`;
}
function instDocGroups(docs) {
  return ZTHEMES.map(t => [t[1], docs.filter(x => x.theme === t[0])]).concat([['其他 / 上传文件', docs.filter(x => !x.theme || !ZTHEMES.some(t => t[0] === x.theme))]]).filter(g => g[1].length);
}
function zbName(bank) { return bank === 'z2' ? '41 号令测试题库' : bank === 'z3' ? '事故隐患与安全生产硬措施考试复习资料' : '制度题库'; }
function instExam() {
  const n = SC.doc.bank ? (SC.mode === 'exam' ? 10 : 8) : (SC.mode === 'exam' ? 8 : 6);
  SC.qs = qGen(SC.doc, n, Date.now());
  SC.step = 'exam'; rerender('scene');
  examStart(SC.qs, { title: SC.doc.n, mode: SC.mode, mount: 'exbox', src: 'inst', base: 40, onDone: instDone, meta: { secLabel: SC.doc.bank ? '按题型掌握' : '按章节掌握' } });
}
function instDone(res) {
  /* 得分 = 答对率 60% + 关键条款题 20% + 课件学习完成 10% + 作答速度 10%；雷达维度 = 该制度主题的得分（本次没学的主题为空） */
  const i1 = res.score, i2 = res.keyRate == null ? res.score : res.keyRate, i3 = cwSeenRatio(SC.cw), i4 = res.speed;
  const score = Math.round(i1 * .6 + i2 * .2 + i3 * .1 + i4 * .1);
  const theme = SC.doc.theme && ZTHEMES.some(t => t[0] === SC.doc.theme) ? SC.doc.theme : '';
  const dims = {}; if (theme) dims[theme] = score;
  const sum = []; if (res.wrong.length) sum.push('答错 ' + res.wrong.length + ' 题'); if (i2 < 100) sum.push('关键条款题失分'); if (i3 < 100) sum.push('课件看了 ' + i3 + '%');
  const wrong = res.wrong.map(x => ({ t: x.q.stem, cite: x.q.cite + (x.q.orig ? '：' + x.q.orig : '') }));
  SC.res = { score, pass: score >= 60, dims, sum, wrong, advice: examAdvice(res), exam: res, proc: { i1, i2, i3, i4 } };
  SC.step = 'result';
  SC.rec = scSave({ sub: SC.doc.n, score, pass: score >= 60, sum, dims, wrong, theme, rs: Object.assign({}, SC.res, { exam: null, examLite: { score: res.score, right: res.right, n: res.n, keyRate: res.keyRate, sec: res.sec, secRows: res.secRows, team: res.team, wrongTbl: res.wrong.map(x => ({ stem: x.q.stem, a: x.a, ans: x.q.ans, type: x.q.type, opts: x.q.opts, cite: x.q.cite, orig: x.q.orig, why: x.q.why })) } }) });
  if (typeof hoursAdd === 'function') hoursAdd(SC.doc.n + ' · 制度学习', 0.5);
  rerender('scene');
}
function instResult() {
  const R = SC.res, E = R.exam, L = R.examLite || (SC.rec && SC.rec.rs && SC.rec.rs.examLite);
  return `<div class="wrap tkwrap">${scHead('', SC.doc ? SC.doc.n + ' · 考试分析' : '考试分析')}
    ${scResultHead(R, 'inst')}
    ${R.proc ? `<div class="card"><div class="ch"><b>本次过程指标</b><span class="note">得分 = 答对率 60% + 关键条款题 20% + 课件学习完成 10% + 作答速度 10%</span></div><div class="emdims">${[['答对率', R.proc.i1], ['关键条款题', R.proc.i2], ['课件学习完成', R.proc.i3], ['作答速度', R.proc.i4]].map(x => `<span><i>${x[0]}</i><b class="mono ${x[1] >= 75 ? 'gv' : 'wv'}">${x[1]}</b></span>`).join('')}</div></div>` : ''}
    <div class="card"><div class="ch"><b>自动考试分析</b><em class="ai">AI</em><span class="note">个人分析 + 班组对比（同一套题）</span></div>${E ? examResultHTML(E, { noHead: true }) : L ? instLiteHTML(L) : ''}</div>
    ${scResultFoot('inst:' + SC.sub + ':' + SC.mode)}</div>`;
}
function instLiteHTML(L) {
  const T = L.team || {};
  return `<div class="exres"><div class="hrow">答对 ${L.right} / ${L.n}${L.keyRate != null ? ' · 关键条款题 ' + L.keyRate + '%' : ''} · 用时 ${fmtSec(L.sec || 0)}${T.avg != null ? ' · 班组平均 ' + T.avg + ' · 及格率 ' + T.passRate + '% · 本人第 ' + T.rank + ' / ' + T.total : ''}</div>
    ${(L.secRows || []).map(s => `<div class="exbar"><span>${h(s.t)}</span><div class="btrk"><div class="bfill ${s.pct < 60 ? 'w' : ''}" style="width:${s.pct}%"></div></div><b class="mono">${s.pct}%</b></div>`).join('')}
    ${(L.wrongTbl || []).length ? `<table class="htbl" style="margin-top:8px"><tr><th>错题</th><th>正确答案</th><th>依据</th></tr>${L.wrongTbl.map(w => `<tr><td>${h(w.stem)}</td><td class="gv">${h(exAnsText(w, w.ans))}</td><td class="tk3">${h(w.cite)}<div>${h(w.orig)}</div></td></tr>`).join('')}</table>` : ''}</div>`;
}

/* ======================= 工作票陪练：第一种工作票 · 安全措施填写（本平台按安规拟定，待业务确认） ======================= */
const WT = {
  task: '110kV考核站 #3 主变（含变高 1103 开关、变低 503 开关间隔）检修预试', place: '110kV考核站 #3 主变本体及两侧开关间隔', mode: '#3 主变已由运行转检修，10kV 3M 负荷由 #2 主变经 532 开关代供；110kV 2M 母线、10kV 3M 母线运行',
  secs: [
    { k: 's1', n: '应拉开的断路器（开关）和隔离开关（刀闸）', ok: ['#3主变变高 1103 开关', '#3主变变高 2M 侧 11032 刀闸', '#3主变变高主变侧 11034 刀闸', '#3主变变低 503 开关', '#3主变变低 503 开关小车（拉至试验位置）'], dis: ['10kV 2BM、3M 分段 532 开关', '#2主变变高 1102 开关', '#3主变变高中性点 113000 地刀'] },
    { k: 's2', n: '应装设的接地线、应合上的接地刀闸', ok: ['合上 #3主变变高 110340 地刀（1103 开关主变侧）', '合上 #3主变变低 503 开关主变侧地刀', '#3主变中性点 113000 地刀合上'], dis: ['合上 110kV 2M 母线接地刀闸', '合上 #2主变变高地刀'], must: true },
    { k: 's3', n: '应设遮栏（围栏）、应挂标示牌', ok: ['1103 开关、11032、11034 刀闸操作把手挂「禁止合闸，有人工作」', '503 开关小车及操作把手挂「禁止合闸，有人工作」', '#3 主变检修区域装设围栏，出入口挂「止步，高压危险」', '工作地点挂「在此工作」'], dis: ['#2 主变周围装设围栏并挂「止步，高压危险」', '532 开关操作把手挂「禁止合闸，有人工作」'] },
    { k: 's4', n: '工作地点保留带电部分或注意事项', ok: ['110kV 2M 母线及 11032 刀闸母线侧带电', '10kV 3M 母线由 #2 主变代供，带电', '#3主变变低 503 开关柜母线侧带电'], dis: ['10kV 3M 母线已停电', '#2 主变停电'] }
  ]
};
function wtBegin() { SC.a = {}; SC.pool = {}; const r = rng(Date.now() % 7777 + 11); WT.secs.forEach(s => { SC.pool[s.k] = shuffled(s.ok.map(t => ({ t, ok: true })).concat(s.dis.map(t => ({ t, ok: false }))), r); SC.a[s.k] = {}; }); scTimer(); }
function wtPage() {
  if (SC.step === 'result') return wtResult();
  return `<div class="wrap tkwrap">${scHead('', '第一种工作票 · 安全措施填写')}
    <div class="card emhead ho"><div class="emh1"><b>第一种工作票</b><span class="tag">安全措施</span><span class="note">票面其余栏目由系统带出，本次只填安全措施</span></div>
      <table class="tb s emcardt"><tr><th>工作任务</th><td>${h(WT.task)}</td></tr><tr><th>工作地点</th><td>${h(WT.place)}</td></tr><tr><th>运行方式</th><td>${h(WT.mode)}</td></tr><tr><th>工作负责人</th><td>${h(HOME_USER.name)}（本次由你填写安全措施）</td></tr></table></div>
    <div class="card emq hg"><div class="ch"><b>安全措施</b><span class="note">每栏勾选应填入的措施（含干扰项）；提交后逐项比对，缺少停电 / 接地措施按危险判定</span></div>
      ${WT.secs.map(s => `<div class="wtsec"><div class="qzq">${h(s.n)}</div><div class="qzopts">${SC.pool[s.k].map((o, i) => `<div class="qzo ${SC.a[s.k][i] ? 'on' : ''}" data-wtpick="${s.k}:${i}"><b>${SC.a[s.k][i] ? '✓' : ''}</b><span>${h(o.t)}</span></div>`).join('')}</div></div>`).join('')}
      <div class="embar"><span class="tk3">${SC.mode === 'teach' ? '训练模式：可要一条提示' : '考核模式：计时，提交后一次性点评'}</span><span class="r">${SC.mode === 'teach' ? '<button class="btn s g" data-wthint="1">要一条提示</button>' : ''}<button class="btn pri" data-wtsubmit="1">提交判定</button></span></div>
    </div></div>`;
}
function wtSubmit() {
  const picked = WT.secs.reduce((a, s) => a + Object.keys(SC.a[s.k]).filter(i => SC.a[s.k][i]).length, 0);
  if (picked < 4) { toast('先把各栏安全措施勾上', 'bad'); return; }
  let miss = 0, extra = 0, dangerMiss = 0; const rows = [];
  WT.secs.forEach(s => { SC.pool[s.k].forEach((o, i) => { const p = !!SC.a[s.k][i]; if (o.ok && !p) { miss++; if (s.must || s.k === 's1') dangerMiss++; } if (!o.ok && p) extra++; rows.push({ sec: s.n, t: o.t, ok: o.ok, p }); }); });
  const t2 = clamp(100 - miss * 10), t4 = dangerMiss ? (dangerMiss > 1 ? 10 : 30) : 100, t3 = clamp(100 - extra * 12);
  const fatal = dangerMiss ? ['停电 / 接地措施不完整 ' + dangerMiss + ' 项'] : [];
  const score = fatal.length ? Math.min(59, Math.round(t2 * .5 + t3 * .2 + t4 * .3)) : Math.round(t2 * .5 + t3 * .2 + t4 * .3);
  const dims = { t1: null, t2, t3, t4, t5: null };
  const sum = []; if (miss) sum.push('漏项 ' + miss); if (extra) sum.push('多填 ' + extra); if (fatal.length) sum.push('危险：' + fatal[0]);
  const wrong = rows.filter(r => r.ok !== r.p).map(r => ({ t: (r.ok ? '漏填：' : '多填：') + r.t, cite: r.sec + (r.ok ? '' : ' · 与本次停电范围无关或会扩大停电') }));
  const advice = fatal.length ? '安全措施缺了停电或接地项，这张票不能许可开工：' + rows.filter(r => r.ok && !r.p && /开关|刀闸|地刀|接地/.test(r.t)).map(r => r.t).slice(0, 2).join('、') + '。' : (miss || extra ? '停电接地齐全，' + (miss ? '遮栏标示牌或保留带电部分漏 ' + miss + ' 项，' : '') + (extra ? '多填 ' + extra + ' 项会扩大停电范围或误导作业人员。' : '') : '安全措施填写完整，和标准票一致。');
  SC.res = { score, pass: score >= 60 && !fatal.length, dims, sum, wrong, advice, rows, fatal };
  SC.step = 'result';
  SC.rec = scSave({ sub: '工作票 · #3主变检修 · 安全措施', score, pass: SC.res.pass, sum, dims, wrong, fatal, rs: SC.res, a: SC.a });
  rerender('scene');
}
function wtHint() { const s = WT.secs.find(x => SC.pool[x.k].some((o, i) => o.ok && !SC.a[x.k][i])); if (!s) { toast('各栏应填项都已勾上', 'ok'); return; } const o = SC.pool[s.k].find((o, i) => o.ok && !SC.a[s.k][i]); toast(`提示 · ${s.n}：还缺「${o.t.slice(0, 14)}…」`, ''); }
function wtResult() {
  const R = SC.res;
  return `<div class="wrap tkwrap">${scHead('', '第一种工作票 · 安全措施判定')}
    ${scResultHead(R, 'tk')}
    <div class="card"><div class="ch"><b>逐项比对</b><span class="note">漏填的停电 / 接地措施按危险判定 · 标准措施由本平台按安规拟定</span></div>
      <table class="tb"><tr><th>栏目</th><th>措施</th><th>标准</th><th>你的填写</th></tr>${R.rows.map(r => `<tr class="${r.ok !== r.p ? 'no' : ''}"><td class="note">${h(r.sec)}</td><td>${h(r.t)}</td><td>${r.ok ? '<span class="tag ok">应填</span>' : '<span class="tag">干扰项</span>'}</td><td>${r.p ? (r.ok ? '已填' : '<span class="wv">多填</span>') : (r.ok ? '<span class="wv">漏填</span>' : '—')}</td></tr>`).join('')}</table></div>
    ${scResultFoot('wt::' + SC.mode)}</div>`;
}

/* ---------- 场景页事件 ---------- */
function sceneClick(e) {
  const q = s => e.target.closest(s); let n;
  /* 题库作答（安规 / 保命 / 案例） */
  if (n = q('[data-qbopt]')) { qbAnswer(+n.dataset.qbopt); return true; }
  if (n = q('[data-qbmulti]')) { const qq = SC.qs[SC.i]; if (qq && SC.a[qq.id] == null) { const i = +n.dataset.qbmulti; SC.mpick = SC.mpick || []; SC.mpick = SC.mpick.includes(i) ? SC.mpick.filter(x => x !== i) : SC.mpick.concat([i]); rerender('scene'); } return true; }
  if (n = q('[data-qbcommit]')) { if (!(SC.mpick || []).length) { toast('先勾选正确项', 'bad'); return true; } qbAnswer(SC.mpick.slice().sort((x, y) => x - y)); return true; }
  if (n = q('[data-qbjudge]')) { qbAnswer(n.dataset.qbjudge === '1'); return true; }
  if (n = q('[data-qbcite]')) { const qq = SC.qs[SC.i]; if (qq) { SC.cites[qq.id] = qq.citeOpts[+n.dataset.qbcite]; rerender('scene'); } return true; }
  if (n = q('[data-qbgo]')) { SC.i = Math.max(0, Math.min(SC.qs.length - 1, +n.dataset.qbgo)); rerender('scene'); return true; }
  if (n = q('[data-qbsubmit]')) { qbSubmit(); return true; }
  /* 制度 */
  if (n = q('[data-instgo]')) { SC.cwi = Math.max(0, Math.min(SC.cw.slides.length - 1, +n.dataset.instgo)); cwMark(SC.cw.id, SC.cwi); rerender('scene'); return true; }
  if (n = q('[data-instlec]')) { lecOpen(SC.cw, { from: SC.cwi, onDone: () => { SC.lecDone = true; }, onExam: () => { rerender('scene'); instExam(); } }); return true; }
  if (n = q('[data-instexam]')) { instExam(); return true; }
  /* 工作票 */
  if (n = q('[data-wtpick]')) { const [k, i] = n.dataset.wtpick.split(':'); SC.a[k][i] = !SC.a[k][i]; rerender('scene'); return true; }
  if (n = q('[data-wthint]')) { wtHint(); return true; }
  if (n = q('[data-wtsubmit]')) { wtSubmit(); return true; }
  return false;
}
function sceneInput(e) { return false; }
function sceneChange(e) {
  let n;
  if (n = e.target.closest('[data-instdoc]')) { SC.sub = n.value; instBegin(); rerender('scene'); return true; }
  if (n = e.target.closest('[data-qbpro]')) { qbSetPro(n.value); toast('题库已切换为「' + qbPro().n + '」', 'ok'); rerender('center'); return true; }
  return false;
}
