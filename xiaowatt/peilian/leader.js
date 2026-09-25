/* ===== 管理视角（班组长）：全组两大场景成绩 · 九项短板热力 · 演练结果复核 · 培训任务下发 ===== */

/* 组员近期演练结果（脱敏模拟；任玲玲取本机 + 模拟实算） */
const TEAM_REC_MOCK = [
  ['李文博', 'tk', '', '考核模式', 94, ['文字不规范 2'], 1], ['王思远', 'em', 'confined', '考核模式', 96, [], 2],
  ['张雨桐', 'tk', '', '考核模式', 0, ['危险操作 1', '漏项 3'], 1], ['张雨桐', 'em', 'shock', '训练模式', 71, ['关键遗漏 2'], 3],
  ['刘泽宇', 'em', 'injury', '训练模式', 58, ['处置要点未答全 4', '关键遗漏 1'], 9], ['陈晓萌', 'tk', '', '训练模式', 88, ['漏项 2', '文字不规范 2'], 3],
  ['黄嘉琪', 'em', 'efire', '考核模式', 92, [], 6], ['吴俊杰', 'tk', '', '考核模式', 0, ['危险操作 2'], 5], ['周淑仪', 'em', 'ofire', '训练模式', 86, ['信息报送缺 1'], 2]
];
const TEAM_ISSUES = [['编号与屏柜附表不一致', 9], ['信息报送未说“在检查中”', 7], ['漏写拐臂到位检查', 6], ['先拉2M侧刀闸', 4], ['事例纠错漏指单人进入高压场所', 3], ['未转负荷即断开503', 2]];
const LD = { dims: [], who: '短板人员', scene: 'tk' };

function teamRecs() {
  const rev = lsGet(LS_TEAMREV, {});
  const mine = allRecs().slice(0, 3).map(r => ({ id: r.id, who: HOME_USER.name, src: r.src, eid: r.eid, n: r.src === 'tk' ? '操作票填写' : (EMGMAP[r.eid] || {}).card, mode: r.mode, score: r.score, pass: r.pass, sum: r.sum || [], ts: r.ts }));
  const mock = TEAM_REC_MOCK.map((x, i) => ({ id: 'tm' + i, who: x[0], src: x[1], eid: x[2], n: x[1] === 'tk' ? '操作票填写' : EMGMAP[x[2]].card, mode: x[3], score: x[4], pass: x[4] >= 60, sum: x[5], ts: Date.now() - x[6] * 864e5 - i * 36e5 }));
  return mine.concat(mock).sort((a, b) => b.ts - a.ts).map(r => Object.assign(r, { reviewer: rev[r.id] || null }));
}
function teamAvg9() { const act = teamRows().filter(m => m.ab); return SK_N.map((_, i) => Math.round(act.reduce((a, m) => a + m.ab[i], 0) / act.length)); }
function weakPeopleOf(dims) { return teamRows().filter(m => m.ab && dims.some(d => m.ab[SK_N.indexOf(d)] < 70)).map(m => m.n); }

function pageTeam() {
  const T = teamRows(), active = T.filter(m => m.cnt > 0), cover = Math.round(active.length / T.length * 100);
  const avg = teamAvg9(), weakIdx = avg.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]).slice(0, 2).map(x => x[1]);
  const recs = teamRecs(), unrev = recs.filter(r => !r.reviewer).length, tasks = taskList();
  const heat = v => { if (v == null) return '<div class="heatc" style="background:#f4f3ea;color:#b3bfb2">—</div>'; const t = Math.max(0, Math.min(1, (v - 40) / 60)); return `<div class="heatc" style="background:color-mix(in srgb,var(--ac) ${Math.round((.08 + t * .7) * 100)}%,transparent);color:${t > .55 ? '#fff' : 'var(--acd)'}">${v}</div>`; };
  const maxI = Math.max(...TEAM_ISSUES.map(r => r[1]));
  if (!LD.dims.length) LD.dims = weakIdx.map(i => SK_N[i]);
  const weakPeople = weakPeopleOf(LD.dims);
  const avgOf = k => Math.round(active.reduce((a, m) => a + m[k], 0) / (active.length || 1));
  return `<div class="ppage">
    <div class="ph"><b>组长工作台</b><span>${LEAD_USER.team} · 班组长 ${LEAD_USER.name} · ${T.length} 人 · 场景：操作票填写 · 应急处置</span></div>
    <div class="hkpis ho" style="margin-top:-4px">
      <div class="kpi ${cover >= 90 ? 'good' : 'warn'}"><b>${cover}%</b><span>演练覆盖率 ${active.length}/${T.length}</span></div>
      <div class="kpi"><b>${avgOf('tk')}</b><span>操作票 班组均分</span></div>
      <div class="kpi"><b>${avgOf('em')}</b><span>应急处置 班组均分</span></div>
      <div class="kpi warn"><b>${SK_N[weakIdx[0]]}</b><span>最弱能力项 ${avg[weakIdx[0]]}</span></div>
      <div class="kpi ${T.reduce((a, m) => a + (m.danger || 0), 0) ? 'warn' : 'good'}"><b>${T.reduce((a, m) => a + (m.danger || 0), 0)}</b><span>危险操作 · 近30天</span></div>
      <div class="kpi ${unrev ? 'warn' : 'good'}"><b>${unrev}</b><span>演练结果待复核</span></div>
    </div>
    <section class="hcard hg"><div class="hch"><b>全组能力雷达</b><span>技能水平九项 · 本人 vs 班组均值 · 点击成员查看明细</span></div><div class="hcb"><div class="ldgrid">
      ${T.map((m, i) => { const w = m.ab ? SK_N[m.ab.indexOf(Math.min(...m.ab))] : '—'; return `<div class="ldcell ${m.ab ? '' : 'idle'}" data-member="${i}">${m.ab ? chRadar(SK_N, m.ab, avg, { w: 230, h: 176, l1: '本人', l2: '均值', key: 'x' }) : '<div class="ldnone">本月未练 · 无能力数据</div>'}<div class="ldn"><b>${m.n}</b><span>${m.post}</span>${m.ab ? `<i>短板 ${w}</i>` : ''}</div></div>`; }).join('')}
    </div></div></section>
    <div class="tmwrap">
      <section class="hcard hg"><div class="hch"><b>班组短板热力</b><span>成员 × 九项 · 底行为班组均值</span></div><div class="hcb"><div class="theat" style="grid-template-columns:64px repeat(${SK_N.length},1fr)">
        <div class="heath"></div>${SK_N.map(d => `<div class="heath">${d.slice(0, 4)}</div>`).join('')}
        ${T.map(m => `<div class="heatn">${m.n}</div>${SK_N.map((_, i) => heat(m.ab ? m.ab[i] : null)).join('')}`).join('')}
        <div class="heatn"><b>均值</b></div>${avg.map(v => heat(v)).join('')}</div>
        <div class="tk3" style="margin-top:6px">能力数据由两大场景演练自动记录，用于培训安排参考；正式考评以人工确认为准。</div></div></section>
      <section class="hcard ho"><div class="hch"><b>演练结果与系统建议</b><em class="ai">AI</em><span>${recs.length} 条 · 组员提交即同步 · 复核后进入成长记录</span></div><div class="hcb"><table class="htbl ldtbl">
        <tr><th>成员</th><th>场景</th><th>模式</th><th>得分</th><th>失分点</th><th>针对性训练建议</th><th>复核</th></tr>
        ${recs.slice(0, 9).map(r => `<tr><td><b>${r.who}</b><div class="tk3 mono">${stampOf(r.ts)}</div></td><td>${h(r.n)}</td><td>${h(r.mode)}</td><td class="mono ${r.pass ? 'gv' : 'wv'}">${r.score}</td><td>${r.sum.length ? r.sum.map(s => `<i class="tag ${/危险|关键/.test(s) ? 'rl' : 'wn'}">${h(s)}</i>`).join('') : '<span class="tag ok">无</span>'}</td>
          <td class="tk3">${r.src === 'tk' ? (r.score === 0 ? '先练危险操作对应的顺序，再考一次考核模式' : r.score < 90 ? '训练模式重写一遍，重点核对屏柜附表编号' : '保持，改用压力模式') : (r.sum.some(s => /关键/.test(s)) ? '背熟注意事项，再练事例纠错' : r.score < 80 ? '对照处置卡补全遗漏的要点' : '换一个没练过的情境')}</td>
          <td>${r.reviewer ? `<span class="tag ok">${r.reviewer} 已复核</span>` : `<button class="btn sm" data-ldrev="${r.id}">复核</button>`}</td></tr>`).join('')}</table></div></section>
    </div>
    <div class="tmwrap2">
      <section class="hcard ho"><div class="hch"><b>制定下次培训计划</b><span>由短板与演练结果生成 · 班组长确认后下发</span></div><div class="hcb frm">
        <label>培训内容<select id="ld_scene">${[['tk', '操作票填写 · #3主变运行转检修']].concat([['em:', '应急处置 · 不限情境']]).concat(EMG.map(e => ['em:' + e.id, '应急处置 · ' + e.card + (e.sc ? ' · ' + e.sc : '')])).map(([v, n]) => `<option value="${v}" ${LD.scene === v ? 'selected' : ''}>${h(n)}</option>`).join('')}</select></label>
        <div class="tk3" style="margin:-4px 0 8px">针对能力项（默认为班组最弱两项，可增减）</div>
        <div class="chips" style="padding:0 0 8px">${SK_N.map(d => `<span class="chip ${LD.dims.includes(d) ? 'on' : ''}" data-lddim="${d}">${d}</span>`).join('')}</div>
        <label>对象<select id="ld_who"><option ${LD.who === '短板人员' ? 'selected' : ''}>短板人员</option><option ${LD.who === '全班' ? 'selected' : ''}>全班</option>${T.map(m => `<option ${LD.who === m.n ? 'selected' : ''}>${m.n}</option>`).join('')}</select></label>
        <div class="tk3" style="margin:-4px 0 8px">短板人员：${weakPeople.join('、') || '无'}（所选能力项低于 70 分）</div>
        <div class="frm2"><label>截止<input id="ld_due" type="date" value="${new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10)}"></label><label>模式<select id="ld_mode"><option value="exam">考核模式</option><option value="teach">训练模式</option></select></label></div>
        <button class="btn pri" data-ldsend="1">确认并下发培训计划</button></div></section>
      <section class="hcard hg"><div class="hch"><b>本月培训任务</b><span>${tasks.length} 项 · 组员完成即回写</span></div><div class="hcb">${tasks.length ? `<table class="htbl"><tr><th>内容</th><th>模式</th><th>截止</th><th>对象</th><th>完成</th></tr>
        ${tasks.map(t => `<tr><td>${h(t.targetN)}${t.dims && t.dims.length ? `<div class="tk3">针对 ${t.dims.join('、')}</div>` : ''}</td><td>${t.mode === 'exam' ? '考核模式' : '训练模式'}</td><td class="mono">${t.due}</td><td class="tk3">${h((t.who || []).join('、') || '全班')}</td><td class="mono">${(t.results || []).length}/${(t.who || []).length || T.length}${(t.results || []).length ? `<div class="tk3">${t.results.map(r => `${r.who} ${r.score}`).join('、')}</div>` : ''}</td></tr>`).join('')}</table>` : '<div class="tk3">本月还没有下发培训任务，左侧确认后下发。</div>'}</div></section>
      <section class="hcard ho"><div class="hch"><b>未练与待提醒</b><em class="ai">AI 草稿</em><span>${T.filter(m => !m.cnt || m.last > 6).length} 人</span></div><div class="hcb">
        ${T.filter(m => !m.cnt || m.last > 6).map(m => `<div class="hrow"><b>${m.n}</b> <span class="tk3">${!m.cnt ? '本月未练' : m.last + ' 天未练'}</span></div>`).join('') || '<div class="tk3">全员近一周都练过。</div>'}
        <button class="btn" data-remind="1" style="margin-top:8px">生成提醒草稿</button>
        <div class="hch" style="padding:12px 0 6px"><b>班组共性失分</b><span>近30天 · 人次</span></div>
        ${TEAM_ISSUES.map(r => `<div class="bar"><span>${r[0]}</span><div class="btrk"><div class="bfill" style="width:${Math.round(r[1] / maxI * 100)}%"></div></div><b class="mono">${r[1]}</b></div>`).join('')}</div></section>
    </div>
  </div>`;
}
function memberDrill(i) {
  const m = teamRows()[i]; const recs = teamRecs().filter(r => r.who === m.n);
  openDrill(`成员 · ${m.n}`, `${m.post} · 近30天演练 ${m.cnt || 0} 次`, m.ab ? `
    <div class="gtwo"><div>${chRadar(SK_N, m.ab, teamAvg9(), { w: 320, h: 240, l1: '本人', l2: '班组均值', key: 'x' })}<div class="tk3" style="text-align:center">本人 vs 班组均值</div></div>
    <div><table class="htbl"><tr><th>能力项</th><th>得分</th></tr>${SK_N.map((n, j) => `<tr><td>${n}</td><td class="mono ${m.ab[j] < 70 ? 'wv' : 'gv'}">${m.ab[j]}</td></tr>`).join('')}</table>
      <div class="hrow" style="margin-top:8px">操作票均分 ${m.tk} · 应急处置均分 ${m.em} · 危险操作 ${m.danger} 次 · 关键遗漏 ${m.keyMiss} 处 · 最近练习 ${m.last === 0 ? '今天' : m.last + ' 天前'}</div></div></div>
    ${recs.length ? `<div class="sec" style="margin-top:10px"><div class="st">近期演练</div>${recs.map(r => `<div class="hrow"><span class="mono">${stampOf(r.ts)}</span> ${h(r.n)} · ${h(r.mode)} · <b class="${r.pass ? 'gv' : 'wv'}">${r.score}</b> <span class="tk3">${h(r.sum.join('、'))}</span></div>`).join('')}</div>` : ''}
    <div class="tk3">正式考评以人工审核为准。</div>` : '<div class="hrow">本月尚无演练记录。</div>',
    `<button class="btn pri" data-ldplanfor="${m.n}">给 ${m.n} 制定培训计划</button>`);
}
function remindDraft() {
  const idle = teamRows().filter(m => !m.cnt || m.last > 6);
  openDrill('提醒草稿', `${idle.length} 人 · 复制后经企业微信发送`, `<div class="draft" id="draft_txt">${idle.map(m => `${m.n}：${!m.cnt ? '本月尚未进行演练' : '已 ' + m.last + ' 天未练习'}，请于${dateAfter(HOME_TASK.dueDays)}前完成班组下发的「${HOME_TASK.targetN}」（${HOME_TASK.note}）。`).join('<br>')}<br><br>—— ${LEAD_USER.team} ${LEAD_USER.name}</div>
    <div class="tk3" style="margin-top:8px">草稿由看板数据生成，发送前由班组长确认。</div>`, '<button class="btn" data-copy="draft_txt">复制草稿</button>');
}
function ldSend() {
  const g = id => $(id) ? $(id).value : '';
  const sc = g('#ld_scene') || 'tk', who = g('#ld_who') || LD.who;
  const [scene, eid] = sc.split(':');
  const e = eid ? EMGMAP[eid] : null;
  const names = who === '全班' ? TEAM.map(m => m.n) : who === '短板人员' ? weakPeopleOf(LD.dims) : [who];
  const t = { id: 't' + Date.now(), from: '班组长 ' + LEAD_USER.name, scene, target: eid || '', targetN: scene === 'tk' ? '#3主变运行转检修操作票' : e ? '应急处置 · ' + e.card + (e.sc ? ' · ' + e.sc : '') : '应急处置（不限情境）', mode: g('#ld_mode') || 'exam', due: (g('#ld_due') || '').replace(/^\d{4}-0?(\d+)-0?(\d+)$/, '$1月$2日') || dateAfter(5), who: names, dims: LD.dims.slice(), note: '针对 ' + LD.dims.join('、'), results: [] };
  const list = lsGet(LS_TASKS, []); list.unshift(t); lsSet(LS_TASKS, list.slice(0, 12));
  toast(`已下发：${t.targetN} · ${t.mode === 'exam' ? '考核模式' : '训练模式'} · ${t.due}截止 · ${names.length} 人`, 'ok');
  $$('.mask').forEach(m => m.remove()); rerender('team');
}
function leaderClick(e) {
  const q = s => e.target.closest(s); let n;
  if (n = q('[data-member]')) { memberDrill(+n.dataset.member); return true; }
  if (n = q('[data-remind]')) { remindDraft(); return true; }
  if (n = q('[data-lddim]')) { const d = n.dataset.lddim; LD.scene = ($('#ld_scene') || {}).value || LD.scene; LD.dims = LD.dims.includes(d) ? LD.dims.filter(x => x !== d) : LD.dims.concat(d); rerender('team'); return true; }
  if (n = q('[data-ldsend]')) { LD.who = ($('#ld_who') || {}).value || LD.who; ldSend(); return true; }
  if (n = q('[data-ldplanfor]')) { LD.who = n.dataset.ldplanfor; $$('.mask').forEach(m => m.remove()); rerender('team'); const f = $('#ld_scene'); if (f) f.scrollIntoView({ block: 'center', behavior: 'smooth' }); return true; }
  if (n = q('[data-ldrev]')) { const rev = lsGet(LS_TEAMREV, {}); rev[n.dataset.ldrev] = LEAD_USER.name; lsSet(LS_TEAMREV, rev); toast('已复核，进入成员成长记录', 'ok'); rerender('team'); return true; }
  return false;
}
