/* ===== 案例推送学习（班组长导入通报 → 自动生成案例 → 推送班员学习）· 新场景入口 ===== */

const LS_CASES = 'xwt_cases';
/* 预置推送（脱敏虚构案例，人物与单位全部虚拟） */
const CASE_SEED = [
  { id: 'cp1', t: '10kV 配网线路带电作业触电事故通报', kind: '配网 · 触电', from: '班组长 周建国', ago: 1, dueDays: 3, src: '安监部事故通报（脱敏）', dim: 'rv',
    brief: '某供电局配网运维班在 10kV 线路带电更换避雷器时，作业人员未按要求对相邻带电体设置绝缘遮蔽，身体摆动触及带电导线，造成电弧灼伤。',
    cause: ['直接原因：作业人员未对相邻带电体设置绝缘遮蔽，安全距离不足', '间接原因：工作负责人未逐项核对现场安全措施；班前会风险交底流于形式'],
    rules: ['安规 9.2.1.1 带电作业应设置绝缘遮蔽', '安规 6.1 保证安全的技术措施'],
    lessons: ['带电作业前逐项检查绝缘遮蔽，缺一项不开工', '工作负责人到位监护，不得兼做作业'] },
  { id: 'cp2', t: '变电站误入带电间隔险情通报', kind: '变电 · 误操作', from: '班组长 周建国', ago: 4, dueDays: 2, src: '变电管理一所内部通报（脱敏）', dim: 'rv',
    brief: '某 110kV 变电站检修期间，一名作业人员未经许可离开工作地点，走错间隔靠近运行设备，被监护人及时制止，未造成人身伤害。',
    cause: ['直接原因：作业人员擅自离开工作地点，未辨识带电间隔', '间接原因：现场遮栏与标示牌不完整；监护人未全程监护'],
    rules: ['安规 6.1 停电、验电、接地、悬挂标示牌和装设遮栏', '安规 9.3.5 工作地点与带电部位的隔离'],
    lessons: ['检修现场遮栏、标示牌齐全后才开工', '离开工作地点必须经工作负责人同意并由人陪同'] }
];
function caseList() {
  const st = lsGet(LS_CASES, { done: {}, added: [] });
  const all = CASE_SEED.concat(st.added || []);
  return all.map(c => Object.assign({}, c, { pushed: stampOf(Date.now() - (c.ago || 0) * 864e5), due: dateAfter(c.dueDays || 3), done: st.done[c.id] || null }));
}
function caseDone(id, score) { const st = lsGet(LS_CASES, { done: {}, added: [] }); st.done[id] = { ts: Date.now(), score }; lsSet(LS_CASES, st); }
function caseAdd(c) { const st = lsGet(LS_CASES, { done: {}, added: [] }); st.added.unshift(c); lsSet(LS_CASES, st); }

/* 工作台 · 案例推送学习卡 */
function caseCardHTML() {
  const L = caseList(), todo = L.filter(c => !c.done), done = L.filter(c => c.done);
  if (ROLE.cur === 'lead') {
    return `<div class="casecard ho"><div class="tk1">案例推送学习</div>
      <div class="tk2">本月已推送 ${L.length} 个案例 · 完成 ${Math.round(L.reduce((a, c) => a + (c.done ? 1 : 0), 0) / (L.length || 1) * 100)}%</div>
      <div class="caselist">${L.map(c => `<div class="caseit"><i class="ctag">${h(c.kind)}</i><b>${h(c.t)}</b><span class="tk3">${h(c.pushed)} 推送 · ${h(c.due)}截止</span></div>`).join('')}</div>
      <div class="casebtns"><button class="btn pri" data-casepush="1">导入通报 · 生成案例 · 推送</button><button class="btn" data-go="team">看完成情况</button></div></div>`;
  }
  return `<div class="casecard ho"><div class="tk1">案例推送学习</div>
    <div class="tk2">${todo.length ? `待学习 ${todo.length} 个案例` : '推送的案例都学完了'}<span class="tk3" style="margin-left:8px">已完成 ${done.length} · 班组长推送</span></div>
    <div class="caselist">${L.slice(0, 3).map(c => `<div class="caseit ${c.done ? 'done' : ''}" data-case="${c.id}"><i class="ctag">${h(c.kind)}</i><b>${h(c.t)}</b><span class="tk3">${c.done ? '已完成 · ' + stampOf(c.done.ts) + (c.done.score != null ? ' · ' + c.done.score + ' 分' : '') : h(c.from) + ' 推送 · ' + h(c.due) + '截止'}</span></div>`).join('')}</div>
    <div class="casebtns">${todo.length ? `<button class="btn pri" data-case="${todo[0].id}">开始学习</button>` : `<button class="btn pri" data-start="case">去案例分析陪练</button>`}<button class="btn" data-go="center">去场景中心</button></div></div>`;
}
/* 案例学习（点开案例）：看课件 → 数字人讲课 → 答 3 题 → 完成回写；成绩计入「警示复盘能力」 */
const CP = { c: null, cw: null, step: 0, res: null };
function caseDocOf(c) { return { id: c.id, n: c.t, text: `一、事故经过\n${c.brief}\n二、原因分析\n${c.cause.map(x => x + '。').join('\n')}\n三、违反条款\n${c.rules.map(x => '违反 ' + x + '。').join('\n')}\n四、警示要点\n${c.lessons.map(x => x + '。').join('\n')}` }; }
function caseOpen(id) {
  const c = caseList().find(x => x.id === id); if (!c) return;
  CP.c = c; CP.cw = cwGen(caseDocOf(c)); CP.step = 0; CP.res = null;
  $$('.mask').forEach(m => m.remove());
  const m = openDrill(`案例学习 · ${c.t}`, `${c.kind} · ${c.src} · ${c.from} 推送 · ${c.due}截止`, `<div id="cpbox">${caseStepHTML()}</div>`);
  m.querySelector('.dlg').style.width = 'min(980px,96vw)';
}
function caseStepHTML() {
  const c = CP.c, cw = CP.cw, steps = ['看案例课件', '数字人讲课', '答 3 题', '完成'];
  const head = `<div class="emsteps" style="margin:0 0 10px">${steps.map((s, i) => `<span class="${i === CP.step ? 'on' : i < CP.step ? 'done' : ''}"><i>${i + 1}</i>${s}</span>`).join('')}</div>`;
  if (CP.step === 0 || CP.step === 1) return head + `<div class="cwwrap"><div class="cwnav">${cw.slides.map((s, i) => `<div class="cwth ${i === (CP.i || 0) ? 'on' : ''} ${cwSeen(cw.id)[i] ? 'seen' : ''}" data-cpgo="${i}"><i>${i + 1}</i><span>${h(s.t)}</span></div>`).join('')}</div><div class="cwmain">${slideHTML(cw, CP.i || 0)}</div></div>
    <div class="embar"><span class="tk3">课件由通报自动生成：经过 → 原因 → 条款 → 要点；学完答 3 题，成绩计入「警示复盘能力」并回写给班组长</span><span class="r"><button class="btn s" data-cpgo="${(CP.i || 0) - 1}">上一页</button><button class="btn s" data-cpgo="${(CP.i || 0) + 1}">下一页</button><button class="btn s g" data-cplec="1">数字人讲课</button><button class="btn pri" data-cpexam="1">开始答题</button></span></div>`;
  if (CP.step === 2) return head + `<div id="cpex"></div>`;
  const r = CP.res;
  return head + `<div class="exres"><div class="rvhead"><div class="rvbig ${r.pass ? '' : 'wv'}">${r.score}</div><div><div class="hrow">${r.pass ? '<span class="tag ok">完成</span>' : '<span class="tag wn">完成 · 建议再学一遍</span>'} 答对 ${r.right} / ${r.n} · 用时 ${fmtSec(r.sec)} · 已回写给 ${h(c.from)}</div><div class="hrow"><em class="ai">AI</em> ${h(r.score >= 80 ? '案例要点掌握了，记住：' + c.lessons[0] + '。' : '原因和条款还没记牢，回到课件再看一遍「原因分析」与「违反条款」。')}</div></div></div>
    ${r.wrong.length ? `<table class="htbl"><tr><th>错题</th><th>正确答案</th><th>依据</th></tr>${r.wrong.map(x => `<tr><td>${h(x.q.stem)}</td><td class="gv">${h(exAnsText(x.q, x.q.ans))}</td><td class="tk3">${h(x.q.orig)}</td></tr>`).join('')}</table>` : '<div class="hrow"><span class="tag ok">三题全对</span></div>'}
    <div class="scgo" style="margin-top:10px"><button class="btn pri" data-start="case::teach">进入案例分析陪练（题库案例题）</button><button class="btn" data-go="home">回工作台</button></div></div>`;
}
function casePaint() { const b = $('#cpbox'); if (b) b.innerHTML = caseStepHTML(); }
function caseExam() {
  CP.step = 2; casePaint();
  const qs = qGen(caseDocOf(CP.c), 3, Date.now(), { types: ['judge', 'choice', 'judge'] });
  examStart(qs, { title: '案例学习 · ' + CP.c.t, mode: 'teach', mount: 'cpex', src: 'case', base: 40, onDone: res => {
    CP.res = res; CP.step = 3;
    /* 维度 = 子题内容类别答对率：课件章节（经过 / 原因 / 条款 / 要点）对应 事故定性 / 原因分析 / 违规辨识 / 防范措施，其余按题干分类 */
    const SEC_CAT = { '一、事故经过': 'c_hazard', '二、原因分析': 'c_cause', '三、违反条款': 'c_viol', '四、警示要点': 'c_measure' };
    const by = {}; res.per.forEach(x => { const c = SEC_CAT[x.q.secT] || caseCatOf(x.q.stem); (by[c] = by[c] || []).push(x.pt); });
    const dims = {}; skillsOf('case').forEach(d => { dims[d.k] = by[d.k] ? clamp(by[d.k].reduce((a, b) => a + b, 0) / by[d.k].length * 100) : null; });
    recSave({ src: 'case', ts: Date.now(), d: stampOf(Date.now()), sub: '案例推送 · ' + CP.c.t, mode: '训练模式', score: res.score, pass: res.score >= 60, sec: res.sec, sum: res.wrong.length ? ['答错 ' + res.wrong.length + ' 题'] : [], dims, wrong: res.wrong.map(x => ({ t: x.q.stem, cite: x.q.orig })), caseId: CP.c.id, push: true });
    caseDone(CP.c.id, res.score);
    toast(`案例学习完成 · ${res.score} 分，已回写给${CP.c.from}`, 'ok');
    casePaint();
    const cur = (location.hash || '').replace('#', '') || 'home'; if (cur === 'home' || cur === 'team') rerender(cur);
  } });
}
function caseClick(e) {
  const q = s => e.target.closest(s); let n;
  if (n = q('[data-cpgo]')) { CP.i = Math.max(0, Math.min(CP.cw.slides.length - 1, +n.dataset.cpgo)); cwMark(CP.cw.id, CP.i); casePaint(); return true; }
  if (n = q('[data-cplec]')) { CP.step = 1; lecOpen(CP.cw, { from: CP.i || 0, char: 'leader', onExam: () => { caseOpen(CP.c.id); caseExam(); } }); return true; }
  if (n = q('[data-cpexam]')) { caseExam(); return true; }
  return false;
}
/* 班组长：导入通报（文件或粘贴）→ 自动生成案例 → 推送 */
function casePushDlg() {
  openDrill('导入通报 · 生成案例 · 推送', '支持 Word / 文本；生成的案例由班组长确认后推送', `
    <div class="frm"><label>通报标题<input id="cp_t" placeholder="如 10kV 配网线路带电作业触电事故通报"></label>
      <label>通报正文（或上传文件）<textarea id="cp_body" rows="6" placeholder="粘贴通报正文：事故经过、原因、暴露问题……"></textarea></label>
      <label class="btn tkup" style="align-self:flex-start">选择文件<input type="file" id="cp_file" accept=".docx,.txt" class="tkfile"></label><span class="tk3" id="cp_fn"></span>
      <div class="tk3">系统从正文里抽取事故经过、直接 / 间接原因、违反条款与警示要点，生成案例课件与 3 道测验题。</div></div>`,
    `<button class="btn pri" data-casegen="1">生成并推送给全班</button>`);
  const f = $('#cp_file'); if (f) f.onchange = async e => { const file = e.target.files[0]; if (!file) return; try { const ext = (file.name.split('.').pop() || '').toLowerCase(); let text = ''; if (ext === 'docx') { const d = await TKUP.docx(file); text = d.paras.concat(d.rows.map(r => r.join('　'))).join('\n'); } else text = await file.text(); const t = $('#cp_t'), b = $('#cp_body'); if (b) b.value = text.trim(); if (t && !t.value) t.value = (text.split('\n').map(x => x.trim()).find(x => x.length >= 6) || file.name.replace(/\.[^.]+$/, '')); const fn = $('#cp_fn'); if (fn) fn.textContent = '已读入 ' + file.name; } catch (err) { toast('读取失败：' + err.message, 'bad'); } };
}
function caseGen() {
  const t = ($('#cp_t') || {}).value || '', body = ($('#cp_body') || {}).value || '';
  if (t.trim().length < 4) { toast('先写通报标题', 'bad'); return; }
  const sents = body.replace(/\s+/g, '').split(/[。；;]/).filter(x => x.length > 6);
  const used = new Set();
  const take = (re, n, strip) => sents.filter(s => !used.has(s) && re.test(s)).slice(0, n).map(s => { used.add(s); return strip ? s.replace(strip, '') : s; });
  const direct = take(/直接原因/, 1, /^.*?直接原因(是|为|：|:)?/), indirect = take(/间接原因|管理原因/, 1, /^.*?(间接|管理)原因(是|为|：|:)?/);
  const cause = [].concat(direct.map(s => '直接原因：' + s), indirect.map(s => '间接原因：' + s));
  if (!direct.length) { const d = take(/未|没有|违反|擅自/, 1); if (d.length) cause.unshift('直接原因：' + d[0]); }
  if (!indirect.length) { const d = take(/监护|交底|管理|班前会|审核|培训/, 1); if (d.length) cause.push('间接原因：' + d[0]); }
  const rules = take(/违反|规程|安规|条|规定/, 2, /^.*?违反(了)?/), lessons = take(/应|必须|严禁|不得/, 3);
  const c = { id: 'cp' + Date.now(), t: t.trim(), kind: /配网|线路|台区|杆/.test(t + body) ? '配网' : /变电|站/.test(t + body) ? '变电' : '通用', from: '班组长 ' + LEAD_USER.name, ago: 0, dueDays: 3, src: '班组长导入', dim: 'rv',
    brief: sents[0] || t, cause, rules: rules.length ? rules : ['待对照安规条款（由安全员补充）'], lessons: lessons.length ? lessons : ['按通报要求整改，纳入班前会学习'] };
  if (!c.cause.length) c.cause = ['直接原因：待从通报正文确认', '间接原因：待从通报正文确认'];
  caseAdd(c); $$('.mask').forEach(m => m.remove());
  toast(`已生成案例「${c.t}」并推送给全班 ${TEAM.length} 人`, 'ok');
  if (location.hash === '#home' || !location.hash) rerender('home'); else rerender((location.hash || '').replace('#', '') || 'home');
}
