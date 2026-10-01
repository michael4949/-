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
/* 案例学习（点开案例）：看通报要点 → 进入案例分析陪练 */
function caseOpen(id) {
  const c = caseList().find(x => x.id === id); if (!c) return;
  openDrill(`案例学习 · ${c.t}`, `${c.kind} · ${c.src} · ${c.from} 推送`, `
    <div class="sec"><div class="st">事故经过</div><div class="sc quote">${h(c.brief)}</div></div>
    <div class="sec"><div class="st">原因分析</div><div class="sc">${c.cause.map(x => `<div>· ${h(x)}</div>`).join('')}</div></div>
    <div class="sec"><div class="st">违反条款</div><div class="sc">${c.rules.map(x => `<div>· ${h(x)}</div>`).join('')}</div></div>
    <div class="sec"><div class="st">警示要点</div><div class="sc">${c.lessons.map(x => `<div>· ${h(x)}</div>`).join('')}</div></div>
    <div class="tk3">学完后进入案例分析陪练作答，成绩计入「警示复盘能力」。</div>`,
    `<button class="btn pri" data-start="case:${c.id}">进入案例分析陪练</button>`);
}
/* 班组长：导入通报（文件或粘贴）→ 自动生成案例 → 推送 */
function casePushDlg() {
  openDrill('导入通报 · 生成案例 · 推送', '支持 Word / 文本；生成的案例由班组长确认后推送', `
    <div class="frm"><label>通报标题<input id="cp_t" placeholder="如 10kV 配网线路带电作业触电事故通报"></label>
      <label>通报正文（或上传文件）<textarea id="cp_body" rows="6" placeholder="粘贴通报正文：事故经过、原因、暴露问题……"></textarea></label>
      <label class="btn tkup" style="align-self:flex-start">选择文件<input type="file" id="cp_file" accept=".docx,.txt" class="tkfile"></label>
      <div class="tk3">系统从正文里抽取事故经过、直接 / 间接原因、违反条款与警示要点，生成案例课件与 3 道测验题。</div></div>`,
    `<button class="btn pri" data-casegen="1">生成并推送给全班</button>`);
}
function caseGen() {
  const t = ($('#cp_t') || {}).value || '', body = ($('#cp_body') || {}).value || '';
  if (t.trim().length < 4) { toast('先写通报标题', 'bad'); return; }
  const sents = body.replace(/\s+/g, '').split(/[。；;]/).filter(x => x.length > 6);
  const pick = re => sents.filter(s => re.test(s)).slice(0, 2);
  const c = { id: 'cp' + Date.now(), t: t.trim(), kind: /配网|线路|台区/.test(t + body) ? '配网' : /变电|站/.test(t + body) ? '变电' : '通用', from: '班组长 ' + LEAD_USER.name, ago: 0, dueDays: 3, src: '班组长导入', dim: 'rv',
    brief: sents[0] || t, cause: pick(/原因|未|没有|违反/).map((s, i) => (i ? '间接原因：' : '直接原因：') + s), rules: pick(/规程|安规|条|规定/).length ? pick(/规程|安规|条|规定/) : ['待对照安规条款（由安全员补充）'], lessons: pick(/应|必须|严禁|不得/).length ? pick(/应|必须|严禁|不得/) : ['按通报要求整改，纳入班前会学习'] };
  if (!c.cause.length) c.cause = ['直接原因：待从通报正文确认', '间接原因：待从通报正文确认'];
  caseAdd(c); $$('.mask').forEach(m => m.remove());
  toast(`已生成案例「${c.t}」并推送给全班 ${TEAM.length} 人`, 'ok');
  if (location.hash === '#home' || !location.hash) rerender('home'); else rerender((location.hash || '').replace('#', '') || 'home');
}
