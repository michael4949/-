/* ===== 内容生产线：文件 → 课件 → 数字人讲课 → 自动出题 → 考试 → 自动考试分析 =====
   课件与题目由文件规则抽取（标题层级 / 条款句 / 术语与数字），考试分析由判定结果与班组记录计算；
   知识课堂、制度学习陪练、案例推送学习共用这一条线。 */

const LS_DOCS = 'xwt_docs', LS_EXAMS = 'xwt_exams', LS_CWSEEN = 'xwt_cw_seen';

/* ---------- 文件库：客户提供的六个主题制度文件（zlib.js，由 gen_zlib.py 生成）+ 本机上传 ---------- */
const DOC_LIB = typeof ZDOCS !== 'undefined' ? ZDOCS : [];
function docThemeOf(name, text) {
  const t = String(name || '') + ' ' + String(text || '').slice(0, 3000);
  return /应急处置和调查处理|应急处置条例|调查处理条例/.test(t) ? 'z1' : /隐患判定|重大事故隐患|较大事故隐患|隐患排查治理/.test(t) ? 'z2' : /硬措施/.test(t) ? 'z3' : /有限空间/.test(t) ? 'z4' : /动火/.test(t) ? 'z5' : /高处作业|高坠|防坠|安全带/.test(t) ? 'z6' : '';
}
function docUploads() { return lsGet(LS_DOCS, []); }
function docAll() { return docUploads().concat(DOC_LIB); }
function docById(id) { return docAll().find(d => d.id === id); }
function docAdd(d) { const a = docUploads(); a.unshift(d); lsSet(LS_DOCS, a.slice(0, 8)); }
function docDel(id) { lsSet(LS_DOCS, docUploads().filter(d => d.id !== id)); }
/* 上传：Word / 文本 → 纯文本（复用操作票的离线 docx 解析） */
async function docImport(file, after) {
  try {
    const ext = (file.name.split('.').pop() || '').toLowerCase(); let text = '';
    if (ext === 'docx') { const d = await TKUP.docx(file); text = d.paras.concat(d.rows.map(r => r.join('　'))).join('\n'); }
    else if (ext === 'txt' || ext === 'md') text = await file.text();
    else throw new Error('只支持 Word（.docx）与纯文本（.txt）');
    text = text.replace(/\r/g, '').split('\n').map(x => x.trim()).filter(Boolean).join('\n');
    if (text.length < 40) throw new Error('文件里没有足够的正文');
    const name = file.name.replace(/\.[^.]+$/, ''), theme = docThemeOf(name, text);
    const d = { id: 'u' + Date.now(), n: name, kind: '上传文件', theme, tag: theme ? (ZTHEMES.find(t => t[0] === theme) || [])[1] : /安规|规程/.test(text) ? '安规' : /应急|报送/.test(text) ? '应急' : /操作票|工作票|两票/.test(text) ? '两票' : '通用', src: '本机上传 · ' + stampOf(Date.now()), text: text.slice(0, 20000) };
    docAdd(d); toast(`已导入「${d.n}」，${docSecs(d.text).length} 节 · ${sentAll(d).length} 句${theme ? ' · 归入「' + d.tag + '」主题' : ''}`, 'ok');
    if (after) after(d);
  } catch (e) { toast('导入失败：' + e.message, 'bad'); }
}

/* ---------- 文本结构：章节 → 段落 → 句子；条款句（应 / 必须 / 不得 / 严禁……）为关键句 ---------- */
const HEAD_RE = /^(第[一二三四五六七八九十百]+[章节]|[一二三四五六七八九十]+、|[（(][一二三四五六七八九十]+[)）]|\d{1,2}(\.\d{1,2}){0,2}\s+[^\d\s])/;
const KEY_RE = /应当|应|必须|严禁|不得|不应|禁止|不超过|不少于|至少|方可|只能/;
function docSecs(text) {
  const lines = String(text || '').split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  const secs = []; let cur = null;
  lines.forEach(l => {
    const head = HEAD_RE.test(l) && l.length <= 30;
    if (head || !cur) { cur = { t: head ? l : '正文', ps: [] }; secs.push(cur); if (head) return; }
    cur.ps.push(l);
  });
  return secs;
}
function clauseOf(p) { const m = p.match(/^(第[一二三四五六七八九十百]+条|\d+(?:\.\d+)*)[\s．.、：:]/); return m ? m[1] : ''; }
function sentsOf(p) { return p.replace(/^(第[一二三四五六七八九十百]+条|\d+(?:\.\d+)*)[\s．.、：:]+/, '').split(/(?<=[。；])/).map(x => x.replace(/[。；]$/, '').trim()).filter(x => x.length >= 8); }
function sentAll(doc) {
  const out = []; docSecs(doc.text).forEach((s, si) => s.ps.forEach(p => { const cl = clauseOf(p); sentsOf(p).forEach(t => out.push({ t, key: KEY_RE.test(t), cl, sec: si, secT: s.t, cite: doc.n + ' · ' + s.t + (cl ? ' · ' + cl : '') })); }));
  return out;
}

/* ---------- 文件 → 课件：封面 + 每节一页（每页 ≤ 6 条）+ 关键条款回顾；每页带讲稿 ---------- */
function cwGen(doc) {
  const secs = docSecs(doc.text), slides = [];
  slides.push({ t: doc.n, sub: '课件由文件自动生成 · ' + secs.length + ' 节', bullets: secs.map(s => ({ t: s.t + '　' + s.ps.length + ' 条' })), script: `今天我们学习${doc.n}。全文共 ${secs.length} 个部分：${secs.map(s => s.t).join('，')}。请重点关注带有“应”“必须”“不得”“严禁”的条款，这些是测验的必考点。`, cover: true });
  secs.forEach((s, si) => {
    const items = []; s.ps.forEach(p => { const cl = clauseOf(p); sentsOf(p).forEach(t => items.push({ t, key: KEY_RE.test(t), cl })); });
    for (let i = 0; i < items.length; i += 6) {
      const part = items.slice(i, i + 6), k = Math.floor(i / 6) + 1;
      slides.push({ t: s.t + (items.length > 6 ? `（${k}）` : ''), bullets: part, sec: si, script: (i === 0 ? `接下来是${s.t}。` : '') + part.map(b => (b.cl ? b.cl + '，' : '') + b.t).join('。') + '。' });
    }
  });
  const keys = []; slides.forEach(s => (s.bullets || []).forEach(b => { if (b.key && keys.length < 8) keys.push(b); }));
  slides.push({ t: '关键条款回顾', bullets: keys.map(b => ({ t: b.t, key: true, cl: b.cl })), end: true, script: '最后回顾本次课的关键条款。' + keys.map(b => b.t).join('。') + '。这些条款在测验中必考，请记牢。' });
  return { id: 'cw_' + doc.id, docId: doc.id, n: doc.n, slides, nKey: keys.length, nSec: secs.length, nSent: slides.reduce((a, s) => a + (s.bullets || []).length, 0) };
}
function cwSeen(cwId) { return lsGet(LS_CWSEEN, {})[cwId] || {}; }
function cwMark(cwId, i) { const m = lsGet(LS_CWSEEN, {}); m[cwId] = m[cwId] || {}; m[cwId][i] = 1; lsSet(LS_CWSEEN, m); }
function cwSeenRatio(cw) { const s = cwSeen(cw.id); return Math.round(Object.keys(s).length / cw.slides.length * 100); }
function slideHTML(cw, i) {
  const s = cw.slides[i];
  return `<div class="slide ${s.cover ? 'cover' : ''} ${s.end ? 'end' : ''}"><div class="slh"><b>${h(s.t)}</b>${s.sub ? `<span>${h(s.sub)}</span>` : ''}<i class="mono">${i + 1} / ${cw.slides.length}</i></div>
    <ul class="slb">${(s.bullets || []).map((b, bi) => `<li class="${b.key ? 'key' : ''}" data-bi="${bi}">${b.cl ? `<em>${h(b.cl)}</em>` : ''}${h(b.t)}</li>`).join('') || '<li class="tk3">本节没有可抽取的条款。</li>'}</ul>
    <div class="slf"><span>${s.cover ? '课件封面' : s.end ? '关键条款 ' + (s.bullets || []).length + ' 条' : '条款句 ' + (s.bullets || []).length + ' 条 · 标黄为关键条款'}</span><span class="mono">${h(cw.n)}</span></div></div>`;
}

/* ---------- 课件查看（对话框）：翻页 · 数字人讲课 · 自动出题考试 ---------- */
const CW = { cw: null, i: 0, mask: null, onExam: null };
function cwOpen(cw, opt) {
  opt = opt || {}; CW.cw = cw; CW.i = 0; CW.onExam = opt.onExam || null; cwMark(cw.id, 0);
  $$('.mask').forEach(m => m.remove());
  const m = openDrill(`课件 · ${cw.n}`, `${cw.nSec} 节 · ${cw.nSent} 条 · 关键条款 ${cw.nKey} 条 · 由文件自动生成`, `<div id="cwbox">${cwBoxHTML()}</div>`,
    `<button class="btn" data-cwpage="-1">上一页</button><button class="btn" data-cwpage="1">下一页</button><button class="btn" data-cwlec="1">数字人讲课</button><button class="btn pri" data-cwexam="1">自动出题 · 开始测验</button>`);
  m.querySelector('.dlg').style.width = 'min(980px,96vw)'; CW.mask = m;
}
function cwBoxHTML() {
  const cw = CW.cw;
  return `<div class="cwwrap"><div class="cwnav">${cw.slides.map((s, i) => `<div class="cwth ${i === CW.i ? 'on' : ''} ${cwSeen(cw.id)[i] ? 'seen' : ''}" data-cwgo="${i}"><i>${i + 1}</i><span>${h(s.t)}</span></div>`).join('')}</div><div class="cwmain">${slideHTML(cw, CW.i)}</div></div>`;
}
function cwGo(i) { const cw = CW.cw; if (!cw) return; CW.i = Math.max(0, Math.min(cw.slides.length - 1, i)); cwMark(cw.id, CW.i); const b = $('#cwbox'); if (b) b.innerHTML = cwBoxHTML(); }

/* ---------- 课件 → 自动出题：判断（改动情态词）/ 单选（挖空数字或术语）/ 简答（说出要求），每题带依据原文 ---------- */
const TERM_ROLE = ['工作负责人', '工作票签发人', '工作许可人', '监护人', '操作人', '值班负责人', '值班调度员', '分管副总经理', '班组长', '安全员', '运维人员', '工作班成员'];
const TERM_ACT = ['停电', '验电', '接地', '遮栏', '标示牌', '双重名称', '操作票', '工作票', '续报', '首报', '电话', 'elink 应急信息群', '在检查中', '接地线', '接地刀闸', '带电显示装置', '闭锁', '机械锁'];
/* 同一组内互为干扰项：防护用品 / 作业程序 / 隐患与事故等级 */
const TERM_PPE = ['安全带', '安全帽', '安全绳', '速差自控器', '攀登自锁器', '安全网', '呼吸器', '绝缘手套', '绝缘靴', '灭火器', '气体检测仪'];
const TERM_PROC = ['气体检测', '通风', '置换', '隔离', '围栏', '警戒线', '动火证', '作业许可', '审批', '备案', '应急预案', '安全教育', '风险辨识', '专家论证', '监护'];
const TERM_GRADE = ['重大隐患', '较大隐患', '一般隐患', '特别重大事故', '重大事故', '较大事故', '一般事故'];
const TERM_GROUPS = [TERM_ROLE, TERM_ACT, TERM_PPE, TERM_PROC, TERM_GRADE];
const MODAL_SWAP = [['不得', '可以'], ['严禁', '可以'], ['不应', '应'], ['不超过', '不少于'], ['不少于', '不超过'], ['至少', '最多'], ['必须', '可以不'], ['应当', '不必'], ['方可', '即可'], ['只能', '可以'], ['应', '不应']];
function rng(seed) { let a = (seed >>> 0) || 1; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function shuffled(arr, r) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function qFromSent(s, type, r, pool) {
  const base = { id: 'q' + Math.floor(r() * 1e9), cite: s.cite, orig: s.t, key: !!s.key, sec: s.sec, secT: s.secT };
  if (type === 'choice') {
    const num = s.t.match(/(\d+)\s*(分钟|小时|天|日|年|处|次|人|类|kV|米|m|mm|%|℃|级|秒|个工作日|工作日|日内|万元)/);
    if (num) {
      const v = +num[1], u = num[2], cand = Array.from(new Set([v * 2, Math.max(1, Math.floor(v / 2)), v + 1, v + 5, v * 10].filter(x => x !== v))).slice(0, 3);
      const opts = shuffled([v].concat(cand).map(x => x + ' ' + u), r);
      return Object.assign(base, { type: 'choice', stem: s.t.replace(num[0], '____ ' + u), opts, ans: opts.indexOf(v + ' ' + u), blank: num[1] + ' ' + u });
    }
    let grp = null, term = '';
    TERM_GROUPS.forEach(G => { const hit = G.filter(t => s.t.includes(t)).sort((a, b) => b.length - a.length); if (hit.length && (!term || hit[0].length > term.length)) { grp = G; term = hit[0]; } });
    if (grp && grp.filter(t => t !== term && !s.t.includes(t)).length >= 3) {
      const dis = shuffled(grp.filter(t => t !== term && !s.t.includes(t)), r).slice(0, 3);
      const opts = shuffled([term].concat(dis), r);
      return Object.assign(base, { type: 'choice', stem: s.t.replace(term, '____'), opts, ans: opts.indexOf(term), blank: term });
    }
    type = 'judge';
  }
  if (type === 'judge') {
    const sw = MODAL_SWAP.find(([a]) => s.t.includes(a));
    if (sw && r() < .55) return Object.assign(base, { type: 'judge', stem: s.t.replace(sw[0], sw[1]), ans: false, why: '原文为“' + sw[0] + '”' });
    return Object.assign(base, { type: 'judge', stem: s.t, ans: true });
  }
  return Object.assign(base, { type: 'short', stem: `请说出${s.secT && s.secT !== '正文' ? '「' + s.secT + '」中' : ''}关于“${(s.t.match(/[一-龥]{2,6}/) || [''])[0]}”的要求（口述或文字作答，意思对即得分）`, ans: s.t });
}
/* 客户制度题库（bank.js ZBANK：41 号令测试题库 / 事故隐患与安全生产硬措施考试复习资料）→ 考试题：单选 / 多选 / 判断，题型轮流抽 */
const Q_L = 'ABCDEFGHI';
function zbQs(theme, n, r) {
  const pool = (typeof ZBANK !== 'undefined' ? ZBANK : []).filter(q => q.theme === theme);
  const by = { single: [], multi: [], judge: [] }; shuffled(pool, r).forEach(q => { (by[q.t] || by.single).push(q); });
  const keys = ['single', 'multi', 'judge'], out = []; let i = 0;
  while (out.length < n && keys.some(k => by[k].length)) { const g = by[keys[i % 3]]; if (g.length) out.push(g.shift()); i++; }
  return shuffled(out, r).map((q, j) => {
    const type = q.t === 'judge' ? 'judge' : q.t === 'multi' ? 'multi' : 'choice', opts = q.opts || [];
    const ans = type === 'judge' ? !!q.ans : type === 'multi' ? String(q.ans).split('').map(c => Q_L.indexOf(c)).filter(x => x >= 0 && x < opts.length).sort((a, b) => a - b) : Q_L.indexOf(String(q.ans)[0]);
    return { id: 'z' + j + '_' + Math.floor(r() * 1e6), type, stem: q.stem, opts, ans, cite: q.src, orig: q.basis || '', key: /严禁|不得|应当|必须|禁止/.test(q.stem), secT: type === 'choice' ? '单选题' : type === 'multi' ? '多选题' : '判断题', bank: theme };
  });
}
function qGen(doc, n, seed, opt) {
  opt = opt || {}; const r = rng(seed || Date.now());
  if (doc.bank && !opt.noBank) { const zq = zbQs(doc.bank, n, r); if (zq.length >= Math.min(n, 4)) return zq; }
  const all = sentAll(doc), keys = shuffled(all.filter(s => s.key), r), rest = shuffled(all.filter(s => !s.key), r);
  const picked = keys.concat(rest).slice(0, n);
  const types = opt.types || ['choice', 'judge', 'choice', 'judge', 'short', 'choice', 'judge', 'choice'];
  const qs = picked.map((s, i) => qFromSent(s, types[i % types.length], r));
  if (!opt.short) { qs.forEach((q, i) => { if (q.type === 'short' && i < picked.length) qs[i] = qFromSent(picked[i], 'judge', r); }); }
  return qs;
}

/* ---------- 考试：对话框或页面内挂载同一套作答 UI；训练模式答错即给依据原文，考核模式交卷后统一分析 ---------- */
const EX = { on: false, qs: [], i: 0, ans: {}, sec: 0, timer: null, mode: 'teach', title: '', mount: 'exbox', onDone: null, res: null, src: '', showWhy: false };
function examStart(qs, opt) {
  opt = opt || {};
  if (EX.timer) clearInterval(EX.timer);
  Object.assign(EX, { on: true, qs, i: 0, ans: {}, pick: [], sec: 0, mode: opt.mode || 'teach', title: opt.title || '测验', mount: opt.mount || 'exbox', onDone: opt.onDone || null, res: null, src: opt.src || '', showWhy: false, base: opt.base || 40, meta: opt.meta || {} });
  EX.timer = setInterval(() => { EX.sec++; const t = $('#extimer'); if (t) t.textContent = fmtSec(EX.sec); }, 1000);
  examPaint();
}
function fmtSec(s) { return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }
function examPaint() { const m = document.getElementById(EX.mount); if (m) m.innerHTML = EX.res ? examResultHTML(EX.res) : examHTML(); }
function examHTML() {
  const q = EX.qs[EX.i], a = EX.ans[q.id], done = a != null, teach = EX.mode === 'teach', last = EX.i === EX.qs.length - 1;
  const ok = done ? qRight(q, a) : null;
  const pick = EX.pick || [];
  const opts = q.type === 'choice' ? `<div class="qzopts">${q.opts.map((o, i) => `<div class="qzo ${done ? (i === q.ans ? 'ok' : a === i ? 'bad' : '') : ''} ${a === i ? 'on' : ''}" data-exopt="${i}"><b>${Q_L[i]}</b><span>${h(o)}</span></div>`).join('')}</div>`
    : q.type === 'multi' ? `<div class="qzopts">${q.opts.map((o, i) => { const on = done ? (Array.isArray(a) && a.includes(i)) : pick.includes(i); return `<div class="qzo ${done ? (q.ans.includes(i) ? 'ok' : on ? 'bad' : '') : ''} ${on ? 'on' : ''}" data-exmulti="${i}"><b>${on ? '✓' : Q_L[i]}</b><span>${h(o)}</span></div>`; }).join('')}</div>${done ? '' : `<div class="embar"><span class="tk3">多选题：勾选全部正确项后确认</span><span class="r"><button class="btn s pri" data-excommit="1">确认本题</button></span></div>`}`
    : q.type === 'judge' ? `<div class="qzopts row">${[[true, '正确'], [false, '错误']].map(([v, n]) => `<div class="qzo ${done ? (v === q.ans ? 'ok' : a === v ? 'bad' : '') : ''} ${a === v ? 'on' : ''}" data-exjudge="${v ? 1 : 0}"><b>${v ? '√' : '×'}</b><span>${n}</span></div>`).join('')}</div>`
      : `<div class="exshort"><textarea id="ex_in" rows="3" placeholder="写出要求的内容，可按麦克风口述…" ${done ? 'disabled' : ''}>${h(done ? a : '')}</textarea><div class="embar"><button class="mic" id="ex_mic" title="语音输入"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v4"/></svg></button>${done ? '' : '<button class="btn s" data-exsay="1">提交这一题</button>'}</div></div>`;
  return `<div class="exq">
    <div class="exh"><span class="tag">${teach ? '训练模式' : '考核模式'}</span><b>第 ${EX.i + 1} / ${EX.qs.length} 题</b><i class="ctag">${q.type === 'choice' ? '单选' : q.type === 'multi' ? '多选' : q.type === 'judge' ? '判断' : '简答'}</i>${q.key ? '<i class="ctag key">关键条款</i>' : ''}<span class="tktimer" id="extimer">${fmtSec(EX.sec)}</span></div>
    <div class="exprog">${EX.qs.map((x, i) => `<i class="${i === EX.i ? 'on' : EX.ans[x.id] != null ? (qRight(x, EX.ans[x.id]) ? 'ok' : (teach ? 'bad' : 'done')) : ''}" data-exgo="${i}"></i>`).join('')}</div>
    <div class="qzq">${h(q.stem)}</div>
    ${opts}
    ${done && teach ? `<div class="tkhintbox ${ok === false || ok === 'part' ? 'bad' : ''}"><b>${ok === true ? '答对' : ok === 'part' ? '基本答到' : '答错'}</b>${h(q.type === 'short' ? '标准答案：' + q.ans : q.type === 'choice' || q.type === 'multi' ? '正确答案：' + exAnsText(q, q.ans) : q.bank ? '正确答案：' + (q.ans ? '正确' : '错误') : q.ans ? '这句话与原文一致。' : '这句话被改动过，' + (q.why || ''))}<div class="tk3 qbasis" style="margin-top:4px">依据 · ${h(q.cite)}${q.orig ? '：' + h(q.orig) : ''}</div></div>` : ''}
    <div class="embar"><span class="tk3">${teach ? '答错当场给出依据原文' : '交卷后统一分析'}</span><span class="r">${EX.i > 0 ? '<button class="btn s" data-exgo="' + (EX.i - 1) + '">上一题</button>' : ''}${last ? `<button class="btn pri" data-exsubmit="1">交卷 · 自动分析</button>` : `<button class="btn pri" data-exgo="${EX.i + 1}">下一题</button>`}</span></div>
  </div>`;
}
function shortScore(q, a) { const s = sim(a, q.ans); const kw = (q.ans.match(/[一-龥]{2,}/g) || []).filter(w => w.length >= 2); const hit = kw.filter(w => norm(a).includes(w.slice(0, 2))).length / (kw.length || 1); return Math.max(s, hit); }
function qRight(q, a) { if (a == null) return false; if (q.type === 'short') { const v = shortScore(q, a); return v >= .55 ? true : v >= .3 ? 'part' : false; } if (q.type === 'multi') { if (!Array.isArray(a)) return false; const x = a.slice().sort((p, q2) => p - q2); return x.length === q.ans.length && x.every((v, i) => v === q.ans[i]); } return a === q.ans; }
/* 答案文本：单选 字母＋选项；多选 字母串；判断 正确 / 错误；简答 原文 */
function exAnsText(q, a) {
  if (a == null) return '未作答';
  if (q.type === 'judge') return a ? '正确' : '错误';
  if (q.type === 'multi') return (Array.isArray(a) ? a : []).slice().sort((p, q2) => p - q2).map(i => Q_L[i]).join('') || '未作答';
  if (q.type === 'choice') return Q_L[a] + '，' + ((q.opts || [])[a] || '');
  return String(a);
}
function examAnswer(v) {
  const q = EX.qs[EX.i]; if (!q || EX.ans[q.id] != null) return;
  EX.ans[q.id] = v; EX.pick = []; examPaint();
}
function examGrade() {
  if (EX.timer) { clearInterval(EX.timer); EX.timer = null; }
  const per = EX.qs.map(q => { const a = EX.ans[q.id], ok = qRight(q, a); return { q, a, ok, pt: ok === true ? 1 : ok === 'part' ? .5 : 0 }; });
  const n = EX.qs.length, right = per.reduce((s, x) => s + x.pt, 0), score = Math.round(right / n * 100);
  const keyQ = per.filter(x => x.q.key), keyRate = keyQ.length ? Math.round(keyQ.reduce((s, x) => s + x.pt, 0) / keyQ.length * 100) : null;
  const secs = {}; per.forEach(x => { const k = x.q.secT || '正文'; secs[k] = secs[k] || { n: 0, pt: 0 }; secs[k].n++; secs[k].pt += x.pt; });
  const secRows = Object.keys(secs).map(k => ({ t: k, n: secs[k].n, pct: Math.round(secs[k].pt / secs[k].n * 100) })).sort((a, b) => a.pct - b.pct);
  const base = EX.base * n, speed = clamp(100 - Math.max(0, EX.sec - base) / base * 100);
  const wrong = per.filter(x => x.ok !== true);
  const res = { title: EX.title, src: EX.src, mode: EX.mode, ts: Date.now(), n, right, score, pass: score >= 60, keyRate, keyN: keyQ.length, secRows, sec: EX.sec, speed, per, wrong, meta: EX.meta, unanswered: per.filter(x => x.a == null).length };
  res.team = examTeamSim(res);
  const hist = lsGet(LS_EXAMS, []); hist.unshift({ ts: res.ts, title: res.title, src: res.src, score: res.score, n: res.n, right: res.right, keyRate: res.keyRate, sec: res.sec, secRows: res.secRows, wrong: res.wrong.map(x => ({ t: x.q.stem, cite: x.q.cite, orig: x.q.orig })), team: res.team }); lsSet(LS_EXAMS, hist.slice(0, 12));
  EX.res = res; EX.on = false; examPaint();
  if (EX.onDone) EX.onDone(res);
  return res;
}
/* 班组对比（脱敏模拟：按成员制度掌握水平生成本套题的成绩分布与各题答对率） */
function examTeamSim(res) {
  const H = s => { let x = 0; for (const c of s) x = Math.imul(x ^ c.charCodeAt(0), 2654435761) >>> 0; return x; };
  const seed = H(res.title + res.n), r = rng(seed);
  const rows = TEAM.filter(m => m.sc).map(m => { const base = m.sc.inst || 70; const sc = clamp(base + (r() - .5) * 24); return { n: m.n, score: sc, pass: sc >= 60 }; });
  const mine = { n: HOME_USER.name, score: res.score, pass: res.pass, me: true };
  const all = rows.filter(x => x.n !== HOME_USER.name).concat(mine).sort((a, b) => b.score - a.score);
  const qRates = res.per.map((x, i) => { const diff = x.q.key ? .12 : 0; const rate = clamp((.55 + r() * .4 - diff) * 100); return { i, stem: x.q.stem, rate, me: x.ok === true }; }).sort((a, b) => a.rate - b.rate);
  const dist = [['90 分以上', all.filter(x => x.score >= 90).length], ['75–89', all.filter(x => x.score >= 75 && x.score < 90).length], ['60–74', all.filter(x => x.score >= 60 && x.score < 75).length], ['60 分以下', all.filter(x => x.score < 60).length]];
  return { avg: Math.round(all.reduce((a, x) => a + x.score, 0) / all.length), passRate: Math.round(all.filter(x => x.pass).length / all.length * 100), rank: all.findIndex(x => x.me) + 1, total: all.length, dist, hardest: qRates.slice(0, 3), rows: all };
}
function examResultHTML(res, opt) {
  opt = opt || {}; const T = res.team;
  return `<div class="exres">
    ${opt.noHead ? '' : `<div class="rvhead"><div class="rvbig ${res.pass ? '' : 'wv'}">${res.score}</div><div>
      <div class="hrow">${res.pass ? '<span class="tag ok">合格</span>' : '<span class="tag rl">不合格</span>'} <span class="tag">${res.mode === 'teach' ? '训练模式' : '考核模式'}</span> 答对 ${res.right} / ${res.n}${res.keyRate != null ? ' · 关键条款题 ' + res.keyRate + '%' : ''} · 用时 ${fmtSec(res.sec)}${res.unanswered ? ' · 未作答 ' + res.unanswered : ''}</div>
      <div class="hrow"><em class="ai">AI 考试分析</em> ${h(examAdvice(res))}</div></div></div>`}
    <div class="gtwo">
      <div><div class="st">${(res.meta || {}).secLabel || '按章节掌握'}</div>${res.secRows.map(s => `<div class="exbar"><span>${h(s.t)}</span><div class="btrk"><div class="bfill ${s.pct < 60 ? 'w' : ''}" style="width:${s.pct}%"></div></div><b class="mono">${s.pct}%</b></div>`).join('')}
        <div class="st" style="margin-top:10px">作答速度</div><div class="exbar"><span>用时对基准</span><div class="btrk"><div class="bfill" style="width:${res.speed}%"></div></div><b class="mono">${res.speed}</b></div></div>
      <div><div class="st">班组对比 · 同一套题</div>
        <div class="hrow">班组平均 <b class="mono">${T.avg}</b> · 及格率 <b class="mono">${T.passRate}%</b> · 本人排第 <b class="mono">${T.rank}</b> / ${T.total}</div>
        ${T.dist.map(d => `<div class="exbar"><span>${d[0]}</span><div class="btrk"><div class="bfill" style="width:${Math.round(d[1] / T.total * 100)}%"></div></div><b class="mono">${d[1]} 人</b></div>`).join('')}
        <div class="st" style="margin-top:8px">全班最容易错的题</div>${T.hardest.map(x => `<div class="hrow tk3">答对率 <b class="mono">${x.rate}%</b> · ${h(x.stem.slice(0, 40))}${x.stem.length > 40 ? '…' : ''}${x.me ? '' : ' <i class="tag wn">本人也错</i>'}</div>`).join('')}</div>
    </div>
    ${res.wrong.length ? `<div class="st" style="margin-top:10px">错题与依据原文（${res.wrong.length} 题）</div><table class="htbl"><tr><th>题目</th><th>你的答案</th><th>正确答案</th><th>依据</th></tr>${res.wrong.map(x => `<tr><td>${h(x.q.stem)}</td><td class="wv">${h(exAnsText(x.q, x.a))}</td><td class="gv">${h(x.q.type === 'judge' && !x.q.ans && x.q.why ? '错误（' + x.q.why + '）' : exAnsText(x.q, x.q.ans))}</td><td class="tk3 qbasis">${h(x.q.cite)}<div>${h(x.q.orig)}</div></td></tr>`).join('')}</table>` : '<div class="hrow"><span class="tag ok">全部答对</span></div>'}
    <div class="tk3" style="margin-top:8px">分析由判定结果自动生成；班组对比为同一套题的班组成绩分布，正式考评以人工审核为准。</div>
  </div>`;
}
function examAdvice(res) {
  const weak = res.secRows.filter(s => s.pct < 60).map(s => s.t);
  const parts = [];
  if (res.score >= 90) parts.push('掌握扎实');
  else if (res.score >= 60) parts.push('基本掌握');
  else parts.push('还没掌握');
  if (res.keyRate != null && res.keyRate < 100) parts.push('关键条款题还有失分，先把带“应 / 必须 / 不得”的条款背熟');
  if (weak.length) parts.push('「' + weak.join('」「') + '」掌握不到六成，建议回到课件重学这几节再测一次');
  if (res.speed < 60) parts.push('作答偏慢，熟悉条款后速度会上来');
  if (res.team.rank > Math.ceil(res.team.total / 2)) parts.push('本次成绩在班组后半段'); else parts.push('本次成绩在班组前半段');
  return parts.join('；') + '。';
}
function examHist() { return lsGet(LS_EXAMS, []); }
function examHistOpen(i) {
  const e = examHist()[i]; if (!e) return;
  openDrill(`考试分析 · ${e.title}`, `${stampOf(e.ts)} · ${e.right} / ${e.n} 题 · ${fmtSec(e.sec)}`, `<div class="exres"><div class="rvhead"><div class="rvbig ${e.score >= 60 ? '' : 'wv'}">${e.score}</div><div><div class="hrow">${e.keyRate != null ? '关键条款题 ' + e.keyRate + '% · ' : ''}班组平均 ${e.team.avg} · 及格率 ${e.team.passRate}% · 本人第 ${e.team.rank} / ${e.team.total}</div></div></div>
    ${e.secRows.map(s => `<div class="exbar"><span>${h(s.t)}</span><div class="btrk"><div class="bfill ${s.pct < 60 ? 'w' : ''}" style="width:${s.pct}%"></div></div><b class="mono">${s.pct}%</b></div>`).join('')}
    ${e.wrong.length ? `<table class="htbl" style="margin-top:8px"><tr><th>错题</th><th>依据</th></tr>${e.wrong.map(w => `<tr><td>${h(w.t)}</td><td class="tk3">${h(w.cite)}<div>${h(w.orig)}</div></td></tr>`).join('')}</table>` : ''}</div>`);
}

/* ---------- 数字人讲课：左讲师 · 右课件 · 下字幕；逐句朗读，讲完一页翻下一页 ---------- */
const HEYGEN_CLIPS = {};   /* { 文件 id: 'clip.mp4' }：有预渲染真人数字人视频时优先播放 */
const LEC = { cw: null, i: 0, si: 0, sents: [], dh: null, playing: false, mask: null, onDone: null, char: 'lecturer', fast: false };
function lecOpen(cw, opt) {
  opt = opt || {}; lecClose();
  LEC.cw = cw; LEC.i = opt.from || 0; LEC.onDone = opt.onDone || null; LEC.char = opt.char || 'lecturer'; LEC.playing = true; LEC.fast = false;
  window.__DH_SPEED = 1;
  const m = el('div', 'mask lite');
  const clip = HEYGEN_CLIPS[cw.docId];
  m.innerHTML = `<div class="dlg lec" style="width:min(1120px,97vw)">
    <div class="dh"><b>数字人讲课 · ${h(cw.n)}</b><span style="font-size:11px;color:#93a9c4">${CHARACTERS[LEC.char].name} · ${CHARACTERS[LEC.char].role} · 讲稿由课件自动生成</span><span class="cls">×</span></div>
    <div class="db" style="padding:12px 16px">
      <div class="lecwrap"><div class="lecstage">${clip ? `<video src="${clip}" controls autoplay style="width:100%;border-radius:12px"></video>` : '<div id="lec_dh" class="lecdh"></div>'}<div class="lecsub" id="lecsub">…</div></div>
        <div class="lecslide" id="lecslide">${slideHTML(cw, LEC.i)}</div></div>
      <div class="lecbar"><button class="btn s" data-lec="play" id="lecplay">暂停</button><button class="btn s" data-lec="prev">上一页</button><button class="btn s" data-lec="next">下一页</button><button class="btn s" data-lec="fast" id="lecfast">快速预览</button><button class="btn s" data-lec="voice">语音 <span data-voicelbl>${TTS.on ? '开' : '关'}</span></button>
        <span class="lecst" id="lecst">第 ${LEC.i + 1} / ${cw.slides.length} 页</span><span class="r">${opt.after || ''}</span></div>
    </div></div>`;
  document.body.appendChild(m); LEC.mask = m;
  m.querySelector('.cls').onclick = () => lecClose();
  m.onclick = e => {
    if (e.target === m) return lecClose();
    const q = s => e.target.closest(s); let n;
    if (n = q('[data-lec]')) return lecCtl(n.dataset.lec);
    if (n = q('[data-start]')) { lecClose(); return startScene(n.dataset.start); }
    if (n = q('[data-go]')) { lecClose(); return goPage(n.dataset.go); }
    if (n = q('[data-lecexam]')) { const cb = LEC.onExam; lecClose(); if (cb) cb(); return; }
    if (typeof pagesClick === 'function' && pagesClick(e)) return;
  };
  LEC.onExam = opt.onExam || null;
  if (!clip) { LEC.dh = new DigitalHuman('lec_dh', LEC.char); window.DH = LEC.dh; }
  lecSlide(LEC.i);
}
function lecSlide(i) {
  const cw = LEC.cw; if (!cw) return;
  LEC.i = Math.max(0, Math.min(cw.slides.length - 1, i)); cwMark(cw.id, LEC.i);
  const s = cw.slides[LEC.i]; LEC.sents = (s.script || '').split(/(?<=[。！？])/).map(x => x.trim()).filter(Boolean); LEC.si = 0;
  const sl = $('#lecslide'); if (sl) sl.innerHTML = slideHTML(cw, LEC.i);
  const st = $('#lecst'); if (st) st.textContent = `第 ${LEC.i + 1} / ${cw.slides.length} 页`;
  if (LEC.dh) LEC.dh.stopSpeak();
  lecSay();
}
function lecSay() {
  if (!LEC.cw || !LEC.playing) return;
  const s = LEC.sents[LEC.si];
  if (!s) { if (LEC.i < LEC.cw.slides.length - 1) return lecSlide(LEC.i + 1); return lecEnd(); }
  const sub = $('#lecsub'); if (sub) sub.textContent = s;
  $$('#lecslide .slb li').forEach(li => li.classList.toggle('say', s.includes(li.textContent.replace(/^[^，]*，/, '').slice(0, 10)) || li.textContent.includes(s.slice(0, 10))));
  const pose = LEC.si === 0 ? 'point' : LEC.si % 3 === 2 ? 'confirm' : 'explain';
  if (LEC.dh) LEC.dh.speak(s, { pose, onEnd: () => { if (!LEC.playing) return; LEC.si++; setTimeout(lecSay, LEC.fast ? 60 : 320); } });
  else { setTimeout(() => { LEC.si++; lecSay(); }, Math.max(800, s.length * (LEC.fast ? 30 : 110))); }
}
function lecEnd() {
  LEC.playing = false; const b = $('#lecplay'); if (b) b.textContent = '重新播放';
  const sub = $('#lecsub'); if (sub) sub.textContent = '本次课讲完了。' + (LEC.onExam ? '接下来做测验。' : '');
  if (LEC.dh) LEC.dh.setPose('nod');
  const st = $('#lecst'); if (st) st.innerHTML = `讲完 ${LEC.cw.slides.length} 页${LEC.onExam ? ' <button class="btn s pri" data-lecexam="1">开始测验</button>' : ''}`;
  if (LEC.onDone) LEC.onDone(cwSeenRatio(LEC.cw));
}
function lecCtl(k) {
  if (k === 'play') { if (!LEC.playing) { LEC.playing = true; const b = $('#lecplay'); if (b) b.textContent = '暂停'; if (LEC.si >= LEC.sents.length) lecSlide(0); else lecSay(); } else { LEC.playing = false; if (LEC.dh) LEC.dh.stopSpeak(); const b = $('#lecplay'); if (b) b.textContent = '继续'; } return; }
  if (k === 'prev') { LEC.playing = true; const b = $('#lecplay'); if (b) b.textContent = '暂停'; return lecSlide(LEC.i - 1); }
  if (k === 'next') { LEC.playing = true; const b = $('#lecplay'); if (b) b.textContent = '暂停'; if (LEC.i >= LEC.cw.slides.length - 1) return lecEnd(); return lecSlide(LEC.i + 1); }
  if (k === 'fast') { LEC.fast = !LEC.fast; window.__DH_SPEED = LEC.fast ? .25 : 1; const b = $('#lecfast'); if (b) b.textContent = LEC.fast ? '正常速度' : '快速预览'; if (LEC.dh) { LEC.dh.stopSpeak(); } if (LEC.playing) lecSay(); return; }
  if (k === 'voice') { TTS.set(!TTS.on); if (LEC.dh && LEC.playing) { LEC.dh.stopSpeak(); lecSay(); } return; }
}
function lecClose() {
  LEC.playing = false;
  if (LEC.dh) { LEC.dh.destroy(); LEC.dh = null; window.DH = null; }
  TTS.cancel(); window.__DH_SPEED = 1;
  if (LEC.mask) { LEC.mask.remove(); LEC.mask = null; }
  LEC.cw = null;
}

/* ---------- 知识课堂 · 课件生产线板块 ---------- */
function pipeHTML() {
  const docs = docAll(), hist = examHist();
  const steps = [['文件', '制度 / 通报 / 课程文档'], ['课件', '按章节自动生成'], ['数字人讲课', '讲稿逐句讲解'], ['自动出题', '单选 · 多选 · 判断'], ['考试', '训练 / 考核'], ['考试分析', '个人 + 班组']];
  return `<section class="hcard ho"><div class="hch"><b>课件生产线</b><em class="ai">AI</em><span>导入文件 → 生成课件 → 数字人讲课 → 自动出题 → 考试 → 考试分析 · 制度学习陪练与案例推送学习走同一条线 · 隐患判定、硬措施两个主题用客户题库出题</span></div><div class="hcb">
    <div class="pipesteps">${steps.map((s, i) => `<div class="pst"><i>${i + 1}</i><b>${s[0]}</b><span>${s[1]}</span></div>`).join('<em>→</em>')}</div>
    <div class="gtwo g32">
      <div><div class="st">文件库 · ${docs.length} 份</div><div class="doclist">${docs.map(d => { const cw = cwGen(d); const seen = cwSeenRatio(cw); return `<div class="docit"><div class="doc1"><i class="ctag">${h(d.tag)}</i><b>${h(d.n)}</b><span class="tk3">${h(d.kind)} · ${h(d.src)} · ${cw.nSec} 节 ${cw.nSent} 条 · 关键条款 ${cw.nKey}${d.bank ? ' · 客户题库出题' : ''}${seen ? ' · 课件已看 ' + seen + '%' : ''}</span></div>
        <div class="doc2"><button class="btn sm" data-doccw="${d.id}">生成课件</button><button class="btn sm" data-doclec="${d.id}">数字人讲课</button><button class="btn sm pri" data-docexam="${d.id}">出题考试</button>${d.kind === '上传文件' ? `<button class="btn sm" data-docdel="${d.id}">删除</button>` : ''}</div></div>`; }).join('')}</div>
        <div class="tkupb" style="margin-top:8px"><label class="btn tkup">导入文件<input type="file" class="tkfile pipefile" accept=".docx,.txt"></label><span class="tk3">Word（.docx）或文本（.txt）：制度文件、事故通报、培训讲义；导入后即可生成课件与题目</span></div></div>
      <div><div class="st">最近考试分析 · ${hist.length} 次</div>${hist.length ? `<table class="htbl nw"><tr><th>时间</th><th>内容</th><th>得分</th><th>关键条款</th><th>班组</th><th></th></tr>${hist.slice(0, 5).map((e, i) => `<tr><td class="mono">${stampOf(e.ts)}</td><td>${h(e.title)}</td><td class="mono ${e.score >= 60 ? 'gv' : 'wv'}">${e.score}</td><td class="mono">${e.keyRate == null ? '—' : e.keyRate + '%'}</td><td class="tk3">均 ${e.team.avg} · 第 ${e.team.rank}/${e.team.total}</td><td><button class="btn sm" data-examhist="${i}">看分析</button></td></tr>`).join('')}</table>` : '<div class="tk3">还没有考试记录：在左侧选一份文件「出题考试」，交卷后自动生成个人分析与班组对比。</div>'}</div>
    </div></div></section>`;
}
function pipeAfter(h) { $$('.pipefile').forEach(f => { f.onchange = e => { const file = e.target.files[0]; if (file) docImport(file, () => rerender((location.hash || '').replace('#', '') || 'home')); }; }); }
function docExam(doc, mode, opt) {
  opt = opt || {};
  const qs = qGen(doc, opt.n || 6, opt.seed);
  $$('.mask').forEach(m => m.remove());
  const m = openDrill(`测验 · ${doc.n}`, `${qs.length} 题 · ${doc.bank ? '客户题库抽题 · 单选 多选 判断' : '从文件自动出题 · 关键条款必考'}`, `<div id="exbox"></div>`);
  m.querySelector('.dlg').style.width = 'min(900px,96vw)';
  examStart(qs, { title: doc.n, mode: mode || 'teach', mount: 'exbox', src: 'doc', onDone: opt.onDone, meta: { secLabel: doc.bank ? '按题型掌握' : '按章节掌握' } });
}
function pipeClick(e) {
  const q = s => e.target.closest(s); let n;
  if (n = q('[data-doccw]')) { const d = docById(n.dataset.doccw); if (d) cwOpen(cwGen(d), { onExam: () => docExam(d, 'teach') }); return true; }
  if (n = q('[data-doclec]')) { const d = docById(n.dataset.doclec); if (d) lecOpen(cwGen(d), { onExam: () => docExam(d, 'teach') }); return true; }
  if (n = q('[data-docexam]')) { const d = docById(n.dataset.docexam); if (d) docExam(d, 'teach'); return true; }
  if (n = q('[data-docdel]')) { docDel(n.dataset.docdel); toast('已删除上传文件'); rerender((location.hash || '').replace('#', '') || 'home'); return true; }
  if (n = q('[data-examhist]')) { examHistOpen(+n.dataset.examhist); return true; }
  if (n = q('[data-cwgo]')) { cwGo(+n.dataset.cwgo); return true; }
  if (n = q('[data-cwpage]')) { cwGo(CW.i + (+n.dataset.cwpage)); return true; }
  if (n = q('[data-cwlec]')) { const cw = CW.cw, cb = CW.onExam; if (cw) lecOpen(cw, { from: CW.i, onExam: cb }); return true; }
  if (n = q('[data-cwexam]')) { const cb = CW.onExam; if (cb) cb(); return true; }
  if (n = q('[data-exopt]')) { examAnswer(+n.dataset.exopt); return true; }
  if (n = q('[data-exmulti]')) { const qq = EX.qs[EX.i]; if (qq && EX.ans[qq.id] == null) { const i = +n.dataset.exmulti; EX.pick = (EX.pick || []).includes(i) ? EX.pick.filter(x => x !== i) : (EX.pick || []).concat([i]); examPaint(); } return true; }
  if (n = q('[data-excommit]')) { if (!(EX.pick || []).length) { toast('先勾选正确项', 'bad'); return true; } examAnswer(EX.pick.slice().sort((a, b) => a - b)); return true; }
  if (n = q('[data-exjudge]')) { examAnswer(n.dataset.exjudge === '1'); return true; }
  if (n = q('[data-exsay]')) { const i = $('#ex_in'); const v = i ? i.value.trim() : ''; if (!v) { toast('先写一句', 'bad'); return true; } examAnswer(v); return true; }
  if (n = q('#ex_mic')) { const qq = EX.qs[EX.i]; micStart(n, $('#ex_in'), qq ? qq.ans : ''); return true; }
  if (n = q('[data-exgo]')) { EX.i = Math.max(0, Math.min(EX.qs.length - 1, +n.dataset.exgo)); examPaint(); return true; }
  if (n = q('[data-exsubmit]')) { const miss = EX.qs.filter(x => EX.ans[x.id] == null).length; if (miss && !n.dataset.sure) { n.dataset.sure = '1'; n.textContent = `还有 ${miss} 题未答，再点一次直接交卷`; return true; } examGrade(); return true; }
  return false;
}
