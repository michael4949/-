/* ===== 内容生产线：文件 → 课件 → 数字人讲课 → 自动出题 → 考试 → 自动考试分析 =====
   课件与题目由文件规则抽取（标题层级 / 条款句 / 术语与数字），考试分析由判定结果与班组记录计算；
   知识课堂、制度学习陪练、案例推送学习共用这一条线。 */

const LS_DOCS = 'xwt_docs', LS_EXAMS = 'xwt_exams', LS_CWSEEN = 'xwt_cw_seen';

/* ---------- 文件库：预置制度文件（节选整理，待业务提供正式文件后替换）+ 本机上传 ---------- */
const DOC_LIB = [
  { id: 'd_ticket', n: '两票管理细则（节选）', kind: '制度文件', tag: '两票', src: '预置 · 节选整理', text: `第一章 总则
第一条 为规范操作票、工作票（以下简称“两票”）的填写、审核、执行与管理，保证人身与设备安全，制定本细则。
第二条 本细则适用于变电站内一切倒闸操作与检修、试验、安装工作。两票是保证安全的组织措施，必须严格执行。
第三条 两票实行“谁填写、谁负责，谁审核、谁负责，谁执行、谁负责”的责任制。
第二章 操作票
第四条 倒闸操作必须填写操作票，一张操作票只能填写一个操作任务。
第五条 操作票应由操作人填写，监护人审核，值班负责人批准后方可执行。
第六条 操作票应使用设备双重名称，一个操作项目栏内只能填写一个操作动作，不得并项填写。
第七条 操作票填写可以修改，修改处应清晰、易于辨别，一张操作票修改不得超过 3 处。
第八条 操作中发生疑问时，应立即停止操作并向值班调度员或值班负责人报告，不得擅自更改操作票。
第九条 操作票应保存 1 年。
第三章 工作票
第十条 在变电站电气设备上工作，必须填写工作票。第一种工作票适用于高压设备上工作需要全部停电或部分停电者。
第十一条 工作票应由工作负责人填写，工作票签发人审核签发，工作许可人许可后方可开工。
第十二条 工作票签发人不得兼任该项工作的工作负责人；工作许可人不得签发工作票。
第十三条 第一种工作票应在工作前 1 日送达运行人员，临时工作可在工作开始前直接交给工作许可人。
第十四条 工作票的有效期以批准的检修期为限，最长不超过 5 天；需要延期时应在有效期前 2 小时由工作负责人向工作许可人提出。
第十五条 工作许可人应会同工作负责人到现场检查停电、验电、接地、遮栏与标示牌等安全措施完备后，双方签名，方可开工。
第十六条 工作间断后继续工作，应由工作负责人重新检查安全措施，工作班成员不得擅自进入工作地点。
第十七条 工作终结时，工作负责人应清点人员与工器具，拆除自装的接地线，向工作许可人交代，双方签名后工作票方告终结。
第四章 考核
第十八条 操作票、工作票由班组每月统计合格率，无票操作、无票工作按严重违章处理。
第十九条 填写不规范、审核把关不严的，按规定进行考核。` },
  { id: 'd_report', n: '变电管理一所应急信息报送工作指引', kind: '制度文件', tag: '应急', src: '预置 · 整理', text: `一、报送原则
1. 发生突发事件后，应先用电话口头报告，快报现象，后续再报原因；节点之间信息传递不超过 2 分钟。
2. 人员轻伤及以上、110kV 及以上变电站变压器起火等 7 类重大突发事件，由第一时间获知的员工直接电话向变电一所分管副总经理汇报。
3. 原因（结论）未明确前不得自行对外报送，统一以“在检查中”报送。
二、报送内容
4. 电话首报内容应包括发生时间、地点（变电站、设备）和现象，以及报送人姓名与联系方式。
5. 续报：10 分钟内在 elink 应急信息群报送发生时间、地点及简单经过；1 小时内报送初步原因与已采取措施；3 小时内报送处置进展。
6. 对外沟通应避免使用“爆炸”“着火”等敏感字眼，可用“故障”“冒烟”代替。
三、责任
7. 迟报、漏报、瞒报的，按应急管理有关规定追究责任。
8. 各班组每季度至少组织 1 次信息报送演练。` },
  { id: 'd_aq', n: '安规 · 保证安全的技术措施（条文汇编）', kind: '制度文件', tag: '安规', src: '预置 · 安规条文照录', text: '一、保证安全的技术措施\n' + (typeof RULES !== 'undefined' ? RULES.filter(r => r.doc === 'aq').map(r => r.no + ' ' + r.t + '：' + r.body).join('\n') : '') }
];
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
    const d = { id: 'u' + Date.now(), n: file.name.replace(/\.[^.]+$/, ''), kind: '上传文件', tag: /安规|规程/.test(text) ? '安规' : /应急|报送/.test(text) ? '应急' : /操作票|工作票|两票/.test(text) ? '两票' : '通用', src: '本机上传 · ' + stampOf(Date.now()), text: text.slice(0, 20000) };
    docAdd(d); toast(`已导入「${d.n}」，${docSecs(d.text).length} 节 · ${sentAll(d).length} 句`, 'ok');
    if (after) after(d);
  } catch (e) { toast('导入失败：' + e.message, 'bad'); }
}

/* ---------- 文本结构：章节 → 段落 → 句子；条款句（应 / 必须 / 不得 / 严禁……）为关键句 ---------- */
const HEAD_RE = /^(第[一二三四五六七八九十百]+[章节]|[一二三四五六七八九十]+、|[（(][一二三四五六七八九十]+[)）])/;
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
const MODAL_SWAP = [['不得', '可以'], ['严禁', '可以'], ['不应', '应'], ['不超过', '不少于'], ['不少于', '不超过'], ['至少', '最多'], ['必须', '可以不'], ['应当', '不必'], ['方可', '即可'], ['只能', '可以'], ['应', '不应']];
function rng(seed) { let a = (seed >>> 0) || 1; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function shuffled(arr, r) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function qFromSent(s, type, r, pool) {
  const base = { id: 'q' + Math.floor(r() * 1e9), cite: s.cite, orig: s.t, key: !!s.key, sec: s.sec, secT: s.secT };
  if (type === 'choice') {
    const num = s.t.match(/(\d+)\s*(分钟|小时|天|日|年|处|次|人|类|kV|米)/);
    if (num) {
      const v = +num[1], u = num[2], cand = Array.from(new Set([v * 2, Math.max(1, Math.floor(v / 2)), v + 1, v + 5, v * 10].filter(x => x !== v))).slice(0, 3);
      const opts = shuffled([v].concat(cand).map(x => x + ' ' + u), r);
      return Object.assign(base, { type: 'choice', stem: s.t.replace(num[0], '____ ' + u), opts, ans: opts.indexOf(v + ' ' + u), blank: num[1] + ' ' + u });
    }
    const roles = TERM_ROLE.filter(t => s.t.includes(t)).sort((a, b) => b.length - a.length);
    const acts = TERM_ACT.filter(t => s.t.includes(t)).sort((a, b) => b.length - a.length);
    const grp = roles.length ? TERM_ROLE : acts.length ? TERM_ACT : null, term = roles[0] || acts[0];
    if (grp) {
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
function qGen(doc, n, seed, opt) {
  opt = opt || {}; const r = rng(seed || Date.now());
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
  Object.assign(EX, { on: true, qs, i: 0, ans: {}, sec: 0, mode: opt.mode || 'teach', title: opt.title || '测验', mount: opt.mount || 'exbox', onDone: opt.onDone || null, res: null, src: opt.src || '', showWhy: false, base: opt.base || 40, meta: opt.meta || {} });
  EX.timer = setInterval(() => { EX.sec++; const t = $('#extimer'); if (t) t.textContent = fmtSec(EX.sec); }, 1000);
  examPaint();
}
function fmtSec(s) { return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }
function examPaint() { const m = document.getElementById(EX.mount); if (m) m.innerHTML = EX.res ? examResultHTML(EX.res) : examHTML(); }
function examHTML() {
  const q = EX.qs[EX.i], a = EX.ans[q.id], done = a != null, teach = EX.mode === 'teach', last = EX.i === EX.qs.length - 1;
  const ok = done ? qRight(q, a) : null;
  const opts = q.type === 'choice' ? `<div class="qzopts">${q.opts.map((o, i) => `<div class="qzo ${done ? (i === q.ans ? 'ok' : a === i ? 'bad' : '') : ''} ${a === i ? 'on' : ''}" data-exopt="${i}"><b>${'ABCD'[i]}</b><span>${h(o)}</span></div>`).join('')}</div>`
    : q.type === 'judge' ? `<div class="qzopts row">${[[true, '正确'], [false, '错误']].map(([v, n]) => `<div class="qzo ${done ? (v === q.ans ? 'ok' : a === v ? 'bad' : '') : ''} ${a === v ? 'on' : ''}" data-exjudge="${v ? 1 : 0}"><b>${v ? '√' : '×'}</b><span>${n}</span></div>`).join('')}</div>`
      : `<div class="exshort"><textarea id="ex_in" rows="3" placeholder="写出要求的内容，可按麦克风口述…" ${done ? 'disabled' : ''}>${h(done ? a : '')}</textarea><div class="embar"><button class="mic" id="ex_mic" title="语音输入"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v4"/></svg></button>${done ? '' : '<button class="btn s" data-exsay="1">提交这一题</button>'}</div></div>`;
  return `<div class="exq">
    <div class="exh"><span class="tag">${teach ? '训练模式' : '考核模式'}</span><b>第 ${EX.i + 1} / ${EX.qs.length} 题</b><i class="ctag">${q.type === 'choice' ? '单选' : q.type === 'judge' ? '判断' : '简答'}</i>${q.key ? '<i class="ctag key">关键条款</i>' : ''}<span class="tktimer" id="extimer">${fmtSec(EX.sec)}</span></div>
    <div class="exprog">${EX.qs.map((x, i) => `<i class="${i === EX.i ? 'on' : EX.ans[x.id] != null ? (qRight(x, EX.ans[x.id]) ? 'ok' : (teach ? 'bad' : 'done')) : ''}" data-exgo="${i}"></i>`).join('')}</div>
    <div class="qzq">${h(q.stem)}</div>
    ${opts}
    ${done && teach ? `<div class="tkhintbox ${ok === false || ok === 'part' ? 'bad' : ''}"><b>${ok === true ? '答对' : ok === 'part' ? '基本答到' : '答错'}</b>${h(q.type === 'short' ? '标准答案：' + q.ans : q.type === 'choice' ? '正确答案：' + 'ABCD'[q.ans] + '，' + q.opts[q.ans] : q.ans ? '这句话与原文一致。' : '这句话被改动过，' + (q.why || ''))}<div class="tk3" style="margin-top:4px">依据 · ${h(q.cite)}：${h(q.orig)}</div></div>` : ''}
    <div class="embar"><span class="tk3">${teach ? '答错当场给出依据原文' : '交卷后统一分析'}</span><span class="r">${EX.i > 0 ? '<button class="btn s" data-exgo="' + (EX.i - 1) + '">上一题</button>' : ''}${last ? `<button class="btn pri" data-exsubmit="1">交卷 · 自动分析</button>` : `<button class="btn pri" data-exgo="${EX.i + 1}">下一题</button>`}</span></div>
  </div>`;
}
function shortScore(q, a) { const s = sim(a, q.ans); const kw = (q.ans.match(/[一-龥]{2,}/g) || []).filter(w => w.length >= 2); const hit = kw.filter(w => norm(a).includes(w.slice(0, 2))).length / (kw.length || 1); return Math.max(s, hit); }
function qRight(q, a) { if (a == null) return false; if (q.type === 'short') { const v = shortScore(q, a); return v >= .55 ? true : v >= .3 ? 'part' : false; } return a === q.ans; }
function examAnswer(v) {
  const q = EX.qs[EX.i]; if (!q || EX.ans[q.id] != null) return;
  EX.ans[q.id] = v; examPaint();
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
      <div><div class="st">按章节掌握</div>${res.secRows.map(s => `<div class="exbar"><span>${h(s.t)}</span><div class="btrk"><div class="bfill ${s.pct < 60 ? 'w' : ''}" style="width:${s.pct}%"></div></div><b class="mono">${s.pct}%</b></div>`).join('')}
        <div class="st" style="margin-top:10px">作答速度</div><div class="exbar"><span>用时对基准</span><div class="btrk"><div class="bfill" style="width:${res.speed}%"></div></div><b class="mono">${res.speed}</b></div></div>
      <div><div class="st">班组对比 · 同一套题</div>
        <div class="hrow">班组平均 <b class="mono">${T.avg}</b> · 及格率 <b class="mono">${T.passRate}%</b> · 本人排第 <b class="mono">${T.rank}</b> / ${T.total}</div>
        ${T.dist.map(d => `<div class="exbar"><span>${d[0]}</span><div class="btrk"><div class="bfill" style="width:${Math.round(d[1] / T.total * 100)}%"></div></div><b class="mono">${d[1]} 人</b></div>`).join('')}
        <div class="st" style="margin-top:8px">全班最容易错的题</div>${T.hardest.map(x => `<div class="hrow tk3">答对率 <b class="mono">${x.rate}%</b> · ${h(x.stem.slice(0, 40))}${x.stem.length > 40 ? '…' : ''}${x.me ? '' : ' <i class="tag wn">本人也错</i>'}</div>`).join('')}</div>
    </div>
    ${res.wrong.length ? `<div class="st" style="margin-top:10px">错题与依据原文（${res.wrong.length} 题）</div><table class="htbl"><tr><th>题目</th><th>你的答案</th><th>正确答案</th><th>依据</th></tr>${res.wrong.map(x => `<tr><td>${h(x.q.stem)}</td><td class="wv">${h(x.a == null ? '未作答' : x.q.type === 'choice' ? 'ABCD'[x.a] + '，' + x.q.opts[x.a] : x.q.type === 'judge' ? (x.a ? '正确' : '错误') : x.a)}</td><td class="gv">${h(x.q.type === 'choice' ? 'ABCD'[x.q.ans] + '，' + x.q.opts[x.q.ans] : x.q.type === 'judge' ? (x.q.ans ? '正确' : '错误（' + (x.q.why || '') + '）') : x.q.ans)}</td><td class="tk3">${h(x.q.cite)}<div>${h(x.q.orig)}</div></td></tr>`).join('')}</table>` : '<div class="hrow"><span class="tag ok">全部答对</span></div>'}
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
  const steps = [['文件', '制度 / 通报 / 课程文档'], ['课件', '按章节自动生成'], ['数字人讲课', '讲稿逐句讲解'], ['自动出题', '判断 · 单选 · 简答'], ['考试', '训练 / 考核'], ['考试分析', '个人 + 班组']];
  return `<section class="hcard ho"><div class="hch"><b>课件生产线</b><em class="ai">AI</em><span>导入文件 → 生成课件 → 数字人讲课 → 自动出题 → 考试 → 考试分析 · 制度学习陪练与案例推送学习走同一条线</span></div><div class="hcb">
    <div class="pipesteps">${steps.map((s, i) => `<div class="pst"><i>${i + 1}</i><b>${s[0]}</b><span>${s[1]}</span></div>`).join('<em>→</em>')}</div>
    <div class="gtwo g32">
      <div><div class="st">文件库 · ${docs.length} 份</div><div class="doclist">${docs.map(d => { const cw = cwGen(d); const seen = cwSeenRatio(cw); return `<div class="docit"><div class="doc1"><i class="ctag">${h(d.tag)}</i><b>${h(d.n)}</b><span class="tk3">${h(d.kind)} · ${h(d.src)} · ${cw.nSec} 节 ${cw.nSent} 条 · 关键条款 ${cw.nKey}${seen ? ' · 课件已看 ' + seen + '%' : ''}</span></div>
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
  const m = openDrill(`测验 · ${doc.n}`, `${qs.length} 题 · 从文件自动出题 · 关键条款必考`, `<div id="exbox"></div>`);
  m.querySelector('.dlg').style.width = 'min(900px,96vw)';
  examStart(qs, { title: doc.n, mode: mode || 'teach', mount: 'exbox', src: 'doc', onDone: opt.onDone });
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
  if (n = q('[data-exjudge]')) { examAnswer(n.dataset.exjudge === '1'); return true; }
  if (n = q('[data-exsay]')) { const i = $('#ex_in'); const v = i ? i.value.trim() : ''; if (!v) { toast('先写一句', 'bad'); return true; } examAnswer(v); return true; }
  if (n = q('#ex_mic')) { const qq = EX.qs[EX.i]; micStart(n, $('#ex_in'), qq ? qq.ans : ''); return true; }
  if (n = q('[data-exgo]')) { EX.i = Math.max(0, Math.min(EX.qs.length - 1, +n.dataset.exgo)); examPaint(); return true; }
  if (n = q('[data-exsubmit]')) { const miss = EX.qs.filter(x => EX.ans[x.id] == null).length; if (miss && !n.dataset.sure) { n.dataset.sure = '1'; n.textContent = `还有 ${miss} 题未答，再点一次直接交卷`; return true; } examGrade(); return true; }
  return false;
}
