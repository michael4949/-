/* ===== 组长工作台：全组 8 维能力雷达 · 短板热力 · 题库考试结果与建议 · 制定下次培训计划 · 作业授权认证表草稿 · 专业规则确认记录 ===== */

/* 组员考试记录：本机记录（学员账号）+ 组内其他人的模拟记录（脱敏） */
const TEAM_EXAM_MOCK = [
  { id: 'T1', ts: Date.now() - 1 * 864e5 - 3e6, who: '李文博', exam: 'e1163', short: '1163 开关与地刀检查', modeName: '考核模式', score: 8.5, max: 10, pass: 6, red: false, dims: { A: 90, B: 80, C: 88, D: 100, E: 82, F: 100, G: 70, H: 100 }, errs: [{ kind: 'miss', text: '检查不完整。就地控制柜已显示合闸，还需要检查机构箱分、合闸指示和刀闸连杆位置。' }], sugg: [{ dim: 'B', t: '「状态核对与确认」出现漏项 1 次：只看就地控制柜就判定', exam: 'e1163', act: '复练 1163 关卡二' }], reviewer: '周建国' },
  { id: 'T2', ts: Date.now() - 2 * 864e5, who: '张雨桐', exam: 'rain', short: '雨淋阀机械手动启动', modeName: '演练模式', score: 7, max: 10, pass: 6, red: false, dims: { A: 50, B: 100, D: 100, E: 75, F: 100, G: 100 }, errs: [{ kind: 'crit', text: '该设备不是 #3主变雨淋阀，请重新确认设备编号。' }, { kind: 'miss', text: '手动阀未完全开启，请继续操作至全开位置。' }], sugg: [{ dim: 'A', t: '「设备辨识与定位」出现关键错误 1 次：火情后选错主变对应的雨淋阀', exam: 'rain', act: '复练场景A 设备辨识' }], reviewer: '' },
  { id: 'T3', ts: Date.now() - 3 * 864e5, who: '刘泽宇', exam: 'e1163', short: '1163 开关与地刀检查', modeName: '教学模式', score: 0, max: 10, pass: 6, red: true, dims: { A: 70, B: 60, C: 64, D: 0, E: 60, F: 100, G: 60, H: 80 }, errs: [{ kind: 'red', text: '未完成两项验电即合上 116340 地刀：一票否决。' }, { kind: 'judge', text: '执行了分闸操作，不等于已经确认分闸成功。' }], sugg: [{ dim: 'D', t: '「安全措施与风险控制」触发红线：未验电即合地刀', exam: 'e1163', act: '专项复练 验电接地' }], reviewer: '' },
  { id: 'T4', ts: Date.now() - 4 * 864e5, who: '周淑仪', exam: 'rain', short: '雨淋阀机械手动启动', modeName: '考核模式', score: 9.5, max: 10, pass: 6, red: false, dims: { A: 100, B: 100, D: 100, E: 92, F: 100, G: 100 }, errs: [], sugg: [{ dim: null, t: '各步骤均一次通过', exam: 'e1163', act: '进入下一考试内容' }], reviewer: '周建国' },
  { id: 'T5', ts: Date.now() - 5 * 864e5, who: '吴俊杰', exam: 'e1163', short: '1163 开关与地刀检查', modeName: '演练模式', score: 6, max: 10, pass: 6, red: false, dims: { A: 80, B: 55, C: 70, D: 100, E: 70, F: 67, G: 50, H: 100 }, errs: [{ kind: 'judge', text: '机械状态确认异常。请检查刀闸连杆位置，确认机械传动机构是否已经实际到位。' }, { kind: 'read', text: '读数与后台遥测不一致。' }], sugg: [{ dim: 'G', t: '「缺陷发现与设备评价」判断错误：连杆未到位却判定已合闸', exam: 'e1163', act: '复练 1163 关卡二 两态判断' }], reviewer: '' },
  { id: 'T6', ts: Date.now() - 6 * 864e5, who: '陈晓萌', exam: 'rain', short: '雨淋阀机械手动启动', modeName: '考核模式', score: 8, max: 10, pass: 6, red: false, dims: { A: 100, B: 90, D: 100, E: 80, F: 83, G: 90 }, errs: [{ kind: 'id', text: '该阀门不是雨淋阀紧急启动阀。' }], sugg: [{ dim: 'E', t: '「异常与应急处置」识别错误：把电磁阀当作紧急启动阀', exam: 'rain', act: '复练场景C 阀盒识别' }], reviewer: '周建国' }
];
const LS_TEAMREV = 'xwt_team_review', LS_CERT = 'xwt_cert_confirm';
function teamExamRecs() {
  const rev = lsGet(LS_TEAMREV, {});
  return examRecords().concat(TEAM_EXAM_MOCK).map(r => Object.assign({}, r, rev[r.id] ? { reviewer: rev[r.id] } : {})).sort((a, b) => b.ts - a.ts);
}
function teamAbility(m) { return m.n === HOME_USER.name ? abilityNow() : m.dims; }
function teamAvgDims() { const act = TEAM.filter(m => m.sess); return DIMS.map((_, i) => Math.round(act.reduce((a, m) => a + teamAbility(m)[i], 0) / act.length)); }
function teamTasks() {
  const base = [{ id: 't0', coach: '倒闸操作 · 陈志远', plan: '完整操作票', mode: '考核模式', due: dateAfter(HOME_TASK.dueDays), pass: 80, who: '全班', done: 7, total: 12 }];
  return base.concat(lsGet(LS_TASKS, []));
}
const TRAIN_CONTENTS = [['e1163', '陪练关卡 · 1163 开关与地刀检查'], ['rain', '陪练关卡 · 雨淋阀机械手动启动'], ['full', '陪练舱 · 完整操作票'], ['sp_gis', '陪练舱 · 专项 GIS 四项核对'], ['sp_vd', '陪练舱 · 专项 验电接地']];
const LD = { dims: [], who: '短板人员' };

function pageTeam() {
  const active = TEAM.filter(m => m.sess > 0);
  const cover = Math.round(active.length / TEAM.length * 100);
  const avg = teamAvgDims(); const weakIdx = avg.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]).slice(0, 2).map(x => x[1]);
  const redTotal = REDLINES.reduce((a, r) => a + r[1], 0);
  const recs = teamExamRecs(); const unrev = recs.filter(r => !r.reviewer).length;
  const tasks = teamTasks(); const cl = confirmLog(); const certC = lsGet(LS_CERT, {});
  const heat = v => { if (!v) return '<div class="heatc" style="background:#f4f3ea;color:#b3bfb2">—</div>'; const t = Math.max(0, Math.min(1, (v - 40) / 60)); return `<div class="heatc" style="background:color-mix(in srgb,var(--ac) ${Math.round((.08 + t * .7) * 100)}%,transparent);color:${t > .55 ? '#fff' : 'var(--acd)'}">${v}</div>`; };
  const maxR = Math.max(...REDLINES.map(r => r[1]));
  if (!LD.dims.length) LD.dims = weakIdx.map(i => DIMS[i]);
  const weakPeople = TEAM.filter(m => m.sess && LD.dims.some(d => teamAbility(m)[DIMS.indexOf(d)] < 70)).map(m => m.n);
  return `<div class="ppage">
    <div class="ph"><b>组长工作台</b><span>${LEAD_USER.team} · 班组长 ${LEAD_USER.name} · ${TEAM.length} 人 · 能力维度按作业授权认证表 20 个专业项目与两项实操考试抽取（v1.0 已审定）</span></div>
    <div class="hkpis ho" style="margin-top:-4px">
      <div class="kpi ${cover >= 90 ? 'good' : 'warn'}"><b>${cover}%</b><span>陪练覆盖率 ${active.length}/${TEAM.length}</span></div>
      <div class="kpi"><b>${Math.round(avg.reduce((a, b) => a + b, 0) / avg.length)}</b><span>班组能力均值</span></div>
      <div class="kpi warn"><b>${DIMS[weakIdx[0]]}</b><span>最弱维度 ${avg[weakIdx[0]]}</span></div>
      <div class="kpi warn"><b>${redTotal}</b><span>红线触发 · 本月</span></div>
      <div class="kpi ${unrev ? 'warn' : 'good'}"><b>${unrev}</b><span>考试记录待复核</span></div>
      <div class="kpi"><b>${TEAM.filter(m => !certC[m.n]).length}</b><span>认证表待授权</span></div>
    </div>
    <section class="hcard hg"><div class="hch"><b>全组能力雷达</b><span>8 维 · 本月现值 vs 班组均值 · 点击成员查看明细与考试记录</span></div><div class="hcb"><div class="ldgrid">
      ${TEAM.map((m, i) => { const d = teamAbility(m); const w = m.sess ? DIMS[d.indexOf(Math.min(...d))] : '—'; return `<div class="ldcell ${m.sess ? '' : 'idle'}" data-member="${i}">${m.sess ? chRadar(DIMS, d, avg, { w: 230, h: 176, l1: '本人', l2: '均值', key: 'x' }) : '<div class="ldnone">本月未练 · 无能力数据</div>'}<div class="ldn"><b>${m.n}</b><span>${m.post}</span>${m.sess ? `<i>短板 ${w}</i>` : ''}</div></div>`; }).join('')}
    </div></div></section>
    <div class="tmwrap">
      <section class="hcard hg"><div class="hch"><b>班组短板热力</b><span>成员 × 8 维 · 底行为班组均值</span></div><div class="hcb"><div class="theat" style="grid-template-columns:64px repeat(${DIMS.length},1fr)">
        <div class="heath"></div>${DIMS.map(d => `<div class="heath">${d.replace(/与.*$/, '')}</div>`).join('')}
        ${TEAM.map(m => `<div class="heatn">${m.n}</div>${teamAbility(m).map(v => heat(v)).join('')}`).join('')}
        <div class="heatn"><b>均值</b></div>${avg.map(v => heat(v)).join('')}</div>
        <div class="tk3" style="margin-top:6px">评价数据由陪练舱与题库考试自动记录，用于培训安排参考；正式考评与授权以人工确认为准。</div></div></section>
      <section class="hcard ho"><div class="hch"><b>陪练关卡结果与系统建议</b><em class="ai">AI</em><span>${recs.length} 条 · 组员考完即时同步 · 复核后进入成长记录</span></div><div class="hcb"><table class="htbl ldtbl">
        <tr><th>成员</th><th>考试内容</th><th>模式</th><th>得分</th><th>错误</th><th>针对性训练建议</th><th>复核</th></tr>
        ${recs.slice(0, 8).map(r => `<tr><td><b>${r.who}</b><div class="tk3 mono">${stampOf(r.ts)}</div></td><td>${r.short}</td><td>${r.modeName}</td><td class="mono ${r.red ? 'wv' : r.score >= r.pass ? 'gv' : 'wv'}">${r.red ? '0 否决' : r.score}/${r.max}</td><td>${r.errs.length ? r.errs.map(e => `<i class="tag ${e.kind === 'red' || e.kind === 'crit' ? 'rl' : 'wn'}">${ERR_KIND[e.kind]}</i>`).join('') : '<span class="tag ok">无</span>'}</td><td class="ldsug">${(r.sugg || []).slice(0, 2).map(s => `<div>${s.dim ? `<b>${abilityOf(s.dim).n}</b>` : ''}${s.t.replace(/^「[^」]*」/, '')}</div>`).join('')}</td><td>${r.reviewer ? `<span class="tag ok">${r.reviewer}</span>` : `<button class="btn sm" data-ldrev="${r.id}">复核</button>`}${r.id.startsWith('E') ? `<button class="btn sm" data-exreview="${r.id}">复盘</button>` : ''}</td></tr>`).join('')}</table></div></section>
    </div>
    <div class="tmwrap2">
      <section class="hcard ho"><div class="hch"><b>制定下次培训计划</b><span>由短板与考试建议生成 · 班组长确认后下发</span></div><div class="hcb frm">
        <label>培训内容<select id="ld_plan">${TRAIN_CONTENTS.map(c => `<option value="${c[0]}">${c[1]}</option>`).join('')}</select></label>
        <div class="tk3" style="margin:-4px 0 8px">针对能力点（默认为班组最弱两维，可增减）</div>
        <div class="chips" style="padding:0 0 8px">${DIMS.map(d => `<span class="chip ${LD.dims.includes(d) ? 'on' : ''}" data-lddim="${d}">${d}</span>`).join('')}</div>
        <label>对象<select id="ld_who"><option ${LD.who === '短板人员' ? 'selected' : ''}>短板人员</option><option>全班</option>${TEAM.filter(m => m.sess).map(m => `<option ${LD.who === m.n ? 'selected' : ''}>${m.n}</option>`).join('')}</select></label>
        <div class="tk3" style="margin:-4px 0 8px">短板人员：${weakPeople.join('、') || '无'}（所选维度低于 70 分）</div>
        <div class="frm2"><label>截止<input id="ld_due" type="date" value="${new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10)}"></label><label>模式<select id="ld_mode"><option>考核模式</option><option>演练模式</option><option>教学模式</option></select></label></div>
        <label>及格线<input id="ld_pass" type="number" value="6" min="1" max="100"></label>
        <button class="btn pri" data-ldsend="1">确认并下发培训计划</button></div></section>
      <section class="hcard hg"><div class="hch"><b>本月培训任务</b><span>${tasks.length} 项 · 组员完成即回写</span></div><div class="hcb"><table class="htbl"><tr><th>内容</th><th>模式</th><th>截止</th><th>对象</th><th>完成</th></tr>
        ${tasks.map(t => `<tr><td>${t.examName || t.plan}${t.dims && t.dims.length ? `<div class="tk3">针对 ${t.dims.join('、')}</div>` : ''}</td><td>${t.mode}</td><td class="mono">${t.due}</td><td>${t.who}</td><td class="mono">${t.done || 0}/${t.total}${t.results && t.results.length ? `<div class="tk3">${t.results.map(r => `${r.who} ${r.red ? '否决' : r.score}`).join('、')}</div>` : ''}</td></tr>`).join('')}</table></div></section>
      <section class="hcard ho"><div class="hch"><b>未练与待提醒</b><em class="ai">AI 草稿</em><span>${TEAM.filter(m => m.sess === 0 || m.last > 6).length} 人</span></div><div class="hcb">
        ${TEAM.filter(m => m.sess === 0 || m.last > 6).map(m => `<div class="hrow"><b>${m.n}</b> <span class="tk3">${m.sess === 0 ? '本月未练' : m.last + ' 天未练'} · ${m.task === 'todo' ? '任务未完成' : '任务已完成'}</span></div>`).join('')}
        <button class="btn" data-remind="1" style="margin-top:8px">生成提醒草稿</button>
        <div class="hch" style="padding:12px 0 6px"><b>红线触发统计</b><span>本月</span></div>
        ${REDLINES.map(r => `<div class="bar"><span>${r[0]}</span><div class="btrk"><div class="bfill" style="width:${Math.round(r[1] / maxR * 100)}%"></div></div><b class="mono">${r[1]}</b></div>`).join('')}</div></section>
    </div>
    <div class="gtwo">
      <section class="hcard ho"><div class="hch"><b>作业授权认证表草稿</b><span>${CERT_POST} · 20 个专业项目 · 由班组授权人确认后生效</span></div><div class="hcb">
        <table class="htbl"><tr><th>成员</th><th>建议授权</th><th>依据</th><th>状态</th><th></th></tr>
        ${TEAM.filter(m => m.sess).map((m, i) => { const sug = certSuggest(m); const c = certC[m.n]; return `<tr><td><b>${m.n}</b><div class="tk3">${m.post}</div></td><td class="mono">${sug.filter(x => x.ok).length}/20</td><td class="tk3">雷达 8 维 + 考试记录 ${recs.filter(r => r.who === m.n).length} 条</td><td>${c ? `<span class="tag ok">已授权 ${c.by} ${c.date}</span>` : '<span class="tag wn">待授权人确认</span>'}</td><td><button class="btn sm" data-ldcert="${TEAM.indexOf(m)}">${c ? '查看' : '生成草稿'}</button></td></tr>`; }).join('')}</table></div></section>
      <section class="hcard hg"><div class="hch"><b>专业规则确认记录</b><span>版本 · 审定人 · 日期 · 由安全专家审定后登记</span></div><div class="hcb">
        <table class="htbl"><tr><th>内容</th><th>版本</th><th>审定人</th><th>日期</th><th>状态</th></tr>
        ${cl.map(c => `<tr><td>${c.t}<div class="tk3">${c.role}</div></td><td class="mono">${c.ver}</td><td>${c.who || '—'}</td><td class="mono">${c.date || '—'}</td><td>${c.st === 'ok' ? '<span class="tag ok">已审定</span>' : c.st === 'sent' ? `<span class="tag wn">已提交</span> <button class="btn sm" data-ldconfirm="${c.id}">登记确认结果</button>` : `<span class="tag wn">待审定</span> <button class="btn sm" data-ldsent="${c.id}">提交审定</button>`}</td></tr>`).join('')}</table>
        <div class="tk3" style="margin-top:6px">能力维度、评分表、红线与条款的最终口径以审定记录为准。</div></div></section>
    </div>
  </div>`;
}

/* 认证表建议：维度 ≥ 75 且相关考试已及格 → 建议授权；否则待训练 */
function certSuggest(m) {
  const d = teamAbility(m); const recs = teamExamRecs().filter(r => r.who === m.n);
  return CERT_ITEMS.map(it => {
    const dims = dimsOfItem(it.code); const vals = dims.map(a => d[DIMK.indexOf(a.k)]);
    const avg = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
    const exOk = recs.some(r => !r.red && r.score >= r.pass && (EXAM_COVER[r.exam] || { dims: [] }).dims.some(k => dims.some(a => a.k === k)));
    const ok = it.star ? (avg >= 75 && (exOk || avg >= 85)) : avg >= 80;
    return { it, avg, dims: dims.map(a => a.n), exOk, ok, why: ok ? `相关维度均值 ${avg}${exOk ? '，实操考试已及格' : ''}` : `相关维度均值 ${avg}${it.star && !exOk ? '，实操考试未及格或未考' : ''}` };
  });
}
function certDrill(i) {
  const m = TEAM[i]; const sug = certSuggest(m); const c = lsGet(LS_CERT, {})[m.n];
  openDrill(`技能类岗位胜任能力评价作业授权认证表 · ${m.n}`, `${CERT_POST} · 建议授权 ${sug.filter(x => x.ok).length}/20 · ★ 为岗位必备项`, `
    <table class="htbl certtbl"><tr><th>技能单元</th><th>专业项目</th><th>对应能力</th><th>建议</th><th>依据</th></tr>
    ${sug.map(x => `<tr class="${x.ok ? '' : 'dim'}"><td class="tk3">${x.it.unit}</td><td>${x.it.star ? '<b class="star">★</b>' : ''}${x.it.code} ${x.it.n}</td><td class="tk3">${x.dims.join('、')}</td><td>${x.ok ? '<span class="tag ok">建议授权 √</span>' : '<span class="tag wn">待训练</span>'}</td><td class="tk3">${x.why}</td></tr>`).join('')}</table>
    <div class="certfoot"><div><label>姓名</label>${m.n}</div><div><label>班组授权人</label>${c ? c.by : LEAD_USER.name}</div><div><label>授权时间</label>${c ? c.date : '—'}</div><div><label>负责人签名 / 单位盖章</label>${c ? '待人力资源部备案' : '待授权后办理'}</div></div>
    <div class="tk3" style="margin-top:8px">草稿由能力雷达与陪练关卡记录生成，授权结论由班组授权人确认；正式认证以人力资源部备案为准。</div>`,
    `<button class="btn" data-print="1">打印</button>${c ? '' : `<button class="btn pri" data-ldcertok="${i}">由班组授权人确认</button>`}`);
}
function memberDrill(i) {
  const m = TEAM[i]; const d = teamAbility(m); const recs = teamExamRecs().filter(r => r.who === m.n);
  openDrill(`成员 · ${m.n}`, `${m.post} · 近30天陪练 ${m.sess} 场 · 题库考试 ${recs.length} 次`, m.sess ? `
    <div class="gtwo"><div>${chRadar(DIMS, d, teamAvgDims(), { w: 320, h: 240, l1: '本人', l2: '班组均值', key: 'x' })}<div class="tk3" style="text-align:center">本人 vs 班组均值</div></div>
    <div>${miniBars(d)}<div class="hrow" style="margin-top:8px">红线触发 ${m.red} 次 · 最近练习 ${m.last === 0 ? '今天' : m.last + ' 天前'} · 本月任务${m.task === 'done' ? '已完成' : '未完成'}</div></div></div>
    ${recs.length ? `<div class="sec" style="margin-top:10px"><div class="st">陪练关卡记录</div>${recs.map(r => `<div class="hrow"><span class="mono">${stampOf(r.ts)}</span> ${r.short} · ${r.modeName} · <b class="${r.red ? 'wv' : 'gv'}">${r.red ? '否决' : r.score + '/' + r.max}</b>${r.sugg && r.sugg[0] ? ` <span class="tk3">${r.sugg[0].t}</span>` : ''}</div>`).join('')}</div>` : ''}
    <div class="tk3">正式考评以人工审核为准。</div>` : '<div class="hrow">本月尚无陪练与考试记录。</div>',
    `<button class="btn" data-ldcert="${i}">认证表草稿</button><button class="btn pri" data-ldplanfor="${m.n}">给 ${m.n} 制定培训计划</button>`);
}
function remindDraft() {
  const idle = TEAM.filter(m => m.sess === 0 || m.last > 6);
  openDrill('提醒草稿', `${idle.length} 人 · 复制后经企业微信发送`, `<div class="draft" id="draft_txt">${idle.map(m => `${m.n}：${m.sess === 0 ? '本月尚未进行陪练' : '已 ' + m.last + ' 天未练习'}，请于${dateAfter(HOME_TASK.dueDays)}前完成班组下发的「${HOME_TASK.name}」。`).join('<br>')}<br><br>—— ${LEAD_USER.team} ${LEAD_USER.name}</div>
    <div class="tk3" style="margin-top:8px">草稿由看板数据生成，发送前由班组长确认。</div>`, '<button class="btn" data-copy="draft_txt">复制草稿</button>');
}
function ldSend() {
  const g = id => $(id) ? $(id).value : '';
  const plan = g('#ld_plan') || 'e1163'; const ex = EXAMS.find(e => e.id === plan); const pl = PLANS.find(p => p.id === plan);
  const who = g('#ld_who') || LD.who;
  const weakPeople = TEAM.filter(m => m.sess && LD.dims.some(d => teamAbility(m)[DIMS.indexOf(d)] < 70)).map(m => m.n);
  const total = who === '全班' ? TEAM.length : who === '短板人员' ? weakPeople.length : 1;
  const t = { id: 't' + Date.now(), from: '班组长 ' + LEAD_USER.name, exam: ex ? ex.id : null, examName: ex ? ex.n : null, coach: ex ? '陪练关卡' : '倒闸操作 · 陈志远', plan: pl ? pl.n : (ex ? ex.short : plan), mode: g('#ld_mode') || '考核模式', due: (g('#ld_due') || '').replace(/^\d{4}-0?(\d+)-0?(\d+)$/, '$1月$2日') || dateAfter(5), pass: +(g('#ld_pass') || 6), who: who === '短板人员' ? `短板人员（${weakPeople.join('、') || '无'}）` : who, dims: LD.dims.slice(), done: 0, total, results: [] };
  const list = lsGet(LS_TASKS, []); list.unshift(t); lsSet(LS_TASKS, list.slice(0, 12));
  toast(`已下发：${t.examName || t.plan} · ${t.mode} · ${t.due}截止 · 对象 ${t.who}`, 'ok');
  $$('.mask').forEach(m => m.remove()); rerender('team');
}
function leaderClick(e) {
  const q = s => e.target.closest(s); let n;
  if (n = q('[data-member]')) { memberDrill(+n.dataset.member); return true; }
  if (n = q('[data-remind]')) { remindDraft(); return true; }
  if (n = q('[data-lddim]')) { const d = n.dataset.lddim; LD.dims = LD.dims.includes(d) ? LD.dims.filter(x => x !== d) : LD.dims.concat(d); rerender('team'); return true; }
  if (n = q('[data-ldsend]')) { LD.who = ($('#ld_who') || {}).value || LD.who; ldSend(); return true; }
  if (n = q('[data-ldplanfor]')) { LD.who = n.dataset.ldplanfor; $$('.mask').forEach(m => m.remove()); rerender('team'); const f = $('#ld_plan'); if (f) f.scrollIntoView({ block: 'center', behavior: 'smooth' }); return true; }
  if (n = q('[data-ldrev]')) { const rev = lsGet(LS_TEAMREV, {}); rev[n.dataset.ldrev] = LEAD_USER.name; lsSet(LS_TEAMREV, rev); const l = examRecords(); const r = l.find(x => x.id === n.dataset.ldrev); if (r) { r.reviewer = LEAD_USER.name; lsSet(LS_EXAMS, l); } toast('已复核，进入成员成长记录', 'ok'); rerender('team'); return true; }
  if (n = q('[data-ldcert]')) { certDrill(+n.dataset.ldcert); return true; }
  if (n = q('[data-ldcertok]')) { const m = TEAM[+n.dataset.ldcertok]; const c = lsGet(LS_CERT, {}); c[m.n] = { by: LEAD_USER.name, date: stamp().slice(0, 10) }; lsSet(LS_CERT, c); $$('.mask').forEach(x => x.remove()); toast(`${m.n} 的作业授权认证表已由班组授权人确认`, 'ok'); rerender('team'); return true; }
  if (n = q('[data-ldsent]')) { confirmSet(n.dataset.ldsent, { st: 'sent' }); toast('已提交安全专家审定', 'ok'); rerender('team'); return true; }
  if (n = q('[data-ldconfirm]')) { const id = n.dataset.ldconfirm; openDrill('登记审定结果', '按安全专家签回的确认单登记', `<div class="frm"><label>审定人姓名<input id="cf_who" placeholder="安全专家姓名"></label><label>审定日期<input id="cf_date" type="date" value="${new Date().toISOString().slice(0, 10)}"></label><label>版本<input id="cf_ver" value="${confirmLog().find(c => c.id === id).ver}"></label></div>`, `<button class="btn pri" data-ldconfirmok="${id}">登记</button>`); return true; }
  if (n = q('[data-ldconfirmok]')) { const who = ($('#cf_who') || {}).value || ''; if (!who.trim()) return toast('请填写审定人姓名', 'bad'); confirmSet(n.dataset.ldconfirmok, { st: 'ok', who: who.trim(), date: ($('#cf_date') || {}).value || stamp().slice(0, 10), ver: ($('#cf_ver') || {}).value }); $$('.mask').forEach(x => x.remove()); toast('审定结果已登记', 'ok'); rerender('team'); return true; }
  return false;
}
