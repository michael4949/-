/* ===== 底座各页：评分复盘 / 成长档案 / 知识课堂 / 班组看板 / 教练编辑器 + 角色切换 ===== */

/* ---------------- 本机场次落盘（陪练舱报告时写入，复盘页读取） ---------------- */
function saveSession(o) {
  const list = lsGet(LS_SESSIONS, []);
  list.unshift(o); lsSet(LS_SESSIONS, list.slice(0, 20));
  RV.sel = 'L0';
}
function unifySessions() {
  const local = lsGet(LS_SESSIONS, []).map((s, i) => Object.assign({}, s, { id: 'L' + i, real: true, d: Math.max(0, Math.round((Date.now() - s.ts) / 864e5)) }));
  const mock = SESSIONS.map((s, i) => Object.assign({}, s, { id: 'M' + i, real: false, dims: estDims(s), lines: mockLines(s), praise: s.praise || [] }));
  return local.concat(mock);
}
/* 模拟场次的逐句记录：按练习方式取前 7 项票面，依据该场扣分制造真实感的偏差 */
function mockLines(s) {
  const P = PLANS.find(p => p.id === planId(s.plan)); if (!P) return [];
  const idx = P.steps().slice(0, 7);
  const out = [];
  idx.forEach((i, k) => {
    const st = STEPS[i]; if (!st || !st.recite) return;
    let mine = st.recite;
    const v = s.vio.find(x => x.step === st.no);
    if (v && /双重名称|复诵/.test(v.t)) mine = mine.replace('培训三线', '').replace('线路侧', '');
    else if (v && /唱读|核对/.test(v.t)) mine = mine.replace(/在(分|合)闸位置$/, '');
    else if (k === 2 && s.mode === '教学模式') mine = mine.replace('110kV仿真站', '');
    out.push({ step: st.no, beat: 1, t: st.ticket, mine, std: st.recite });
    if (st.report && k % 3 === 1) out.push({ step: st.no, beat: 4, t: st.ticket, mine: st.report, std: st.report });
  });
  return out;
}
function planStepsOf(s) {
  const P = PLANS.find(p => p.id === planId(s.plan));
  let idx = P ? P.steps() : [];
  if (!idx.length) idx = STEPS.map((_, i) => i).slice(0, 8);
  return idx.map(i => STEPS[i]);
}
function rerender(h) { const pg = $('#hpage'); if (!pg) return; pg.innerHTML = PAGE_FN[h](); if (typeof pageAfter === 'function') pageAfter(h); }
const PAGE_FN = { review: () => pageReview(), growth: () => pageGrowth(), classroom: () => pageClassroom(), team: () => pageTeam(), editor: () => pageEditor() };

/* ---------------- 逐句 diff（字符级 LCS）：漏说标黄下划线，说错/多说标红删除线 ---------------- */
function diffHtml(mine, std) {
  const a = Array.from(mine || ''), b = Array.from(std || '');
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  let i = 0, j = 0, out = '';
  const esc = c => c.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  while (i < n && j < m) {
    if (a[i] === b[j]) { out += esc(a[i]); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { out += `<span class="dx">${esc(a[i])}</span>`; i++; }
    else { out += `<span class="dm">${esc(b[j])}</span>`; j++; }
  }
  while (i < n) { out += `<span class="dx">${esc(a[i++])}</span>`; }
  while (j < m) { out += `<span class="dm">${esc(b[j++])}</span>`; }
  return out;
}
function simPct(a, b) { const x = Array.from(a || ''), y = Array.from(b || ''); if (!y.length) return 100; let c = 0; const ys = new Set(y); x.forEach(ch => { if (ys.has(ch)) c++; }); return Math.round(100 * Math.min(1, c / y.length)); }

/* ---------------- AI 复盘段：由本场数据生成 ---------------- */
function aiReview(s, prev) {
  const red = s.vio.find(v => v.lv === 'red');
  const majors = s.vio.filter(v => v.lv === 'major'), minors = s.vio.filter(v => v.lv === 'minor');
  const dimCnt = {}; s.vio.forEach(v => { const d = vioDim(v); dimCnt[d] = (dimCnt[d] || 0) + 1; });
  const worstDim = Object.keys(dimCnt).sort((x, y) => dimCnt[y] - dimCnt[x])[0];
  const best = s.dims.indexOf(Math.max(...s.dims)), weakI = s.dims.indexOf(Math.min(...s.dims));
  const out = [];
  out.push(`本场「${s.plan}」${s.mode}，用时 ${s.dur} 分钟，综合 ${s.score} 分${prev ? `，较上一场${s.score - prev.score >= 0 ? '提升' : '下降'} ${Math.abs(s.score - prev.score)} 分` : ''}。`);
  if (red) out.push(`触发一票否决：${red.t}（第${red.step}项）。这是本场首要纠正项，其余节拍的完成度不作为本场评价依据。`);
  if (majors.length) out.push(`严重扣分 ${majors.length} 项：${majors.map(v => v.t).join('、')}。`);
  if (minors.length) out.push(`不规范 ${minors.length} 项，集中在「${worstDim}」环节（${minors.map(v => '第' + v.step + '项').join('、')}）。`);
  if (!s.vio.length) out.push('全程未触发扣分项，各节拍闭环完整。');
  if (s.hints && s.hints.length) out.push(`使用提示 ${s.hints.length} 次，主要在「${s.hints[0][0]}」，该环节尚未形成不看提示也能完成的稳定性。`);
  out.push(`「${DIMS6[best]}」${s.dims[best]} 分为本场最强项；「${DIMS6[weakI]}」${s.dims[weakI]} 分最弱。`);
  const sp = DIM_PLAN[DIMS6[weakI]];
  out.push(sp ? `建议先安排一轮「${sp[1]}」专项，再回到完整票考核模式验证。` : `建议以错题重练巩固本场扣分项后，进入考核模式验证。`);
  return out.join('');
}

/* ================= 评分复盘 ================= */
const RV = { sel: null, filter: 'all', cmp: 'prev', play: null, follow: {}, tlCur: null };
function rvFiltered(all) {
  if (RV.filter === 'red') return all.filter(s => s.vio.some(v => v.lv === 'red'));
  if (RV.filter === 'exam') return all.filter(s => s.mode === '考核模式');
  if (RV.filter === 'local') return all.filter(s => s.real);
  if (RV.filter === 'low') return all.filter(s => s.score < 80);
  return all;
}
/* 场次回放时间轴：按练习方式的票面项目铺开，扣分/红线/提示落在对应项上 */
function rvTimeline(s) {
  const steps = planStepsOf(s);
  const hintSteps = (s.hints || []).map(h => { const m = /第(\d+)项/.exec(h[1] || ''); return m ? m[1] : null; }).filter(Boolean);
  return `<div class="rvtl" id="rvtl">
    ${steps.map(st => { const v = s.vio.filter(x => String(x.step) === st.no); const lv = v.some(x => x.lv === 'red') ? 'red' : v.some(x => x.lv === 'major') ? 'major' : v.length ? 'minor' : 'ok';
      return `<span class="tlx ${lv} ${RV.tlCur === st.no ? 'cur' : ''}" data-tlstep="${st.no}" data-tip="第${st.no}项 · ${st.ticket}${v.length ? ' · ' + v.map(x => x.t).join('；') : ' · 完成'}">${st.no}${hintSteps.includes(st.no) ? '<i></i>' : ''}</span>`; }).join('')}
  </div>
  <div class="rvtlinfo" id="rvtl_txt">${rvStepInfo(s, RV.tlCur || steps[0].no)}</div>`;
}
function rvStepInfo(s, no) {
  const st = STEPS.find(x => x.no === String(no)); if (!st) return '';
  const v = s.vio.filter(x => String(x.step) === st.no);
  const line = (s.lines || []).find(l => String(l.step) === st.no && l.beat === 1);
  return `<b class="mono">第${st.no}项</b> ${st.ticket}<br>
    ${v.length ? v.map(x => `<span class="tag ${x.lv === 'red' ? 'rl' : 'wn'}">${x.lv === 'red' ? '一票否决' : x.lv === 'major' ? '严重' : '不规范'}</span> ${x.t} <span class="cite">${x.cite || ''}</span>`).join('<br>') : '<span class="tag ok">完成</span> 五拍闭环完整，监护人标"√"'}
    ${line ? `<div class="tk3" style="margin-top:4px">复诵：${diffHtml(line.mine, line.std)}</div>` : ''}`;
}
function rvPlay() {
  const all = unifySessions(), s = all.find(x => x.id === RV.sel); if (!s) return;
  const steps = planStepsOf(s);
  if (RV.play) { clearInterval(RV.play); RV.play = null; const b = $('[data-rvplay]'); if (b) b.textContent = '▶ 回放本场'; return; }
  let i = 0;
  const b = $('[data-rvplay]'); if (b) b.textContent = '■ 停止回放';
  const step = () => {
    if (i >= steps.length) { clearInterval(RV.play); RV.play = null; if (b) b.textContent = '▶ 回放本场'; return; }
    const no = steps[i].no; RV.tlCur = no;
    $$('#rvtl .tlx').forEach(x => x.classList.toggle('cur', x.dataset.tlstep === no));
    const t = $('#rvtl_txt'); if (t) t.innerHTML = rvStepInfo(s, no);
    i++;
  };
  step(); RV.play = setInterval(step, 520);
}
/* 行动清单：由本场扣分 / 提示 / 短板生成，勾选状态本机保存 */
function rvActions(s) {
  const items = [];
  s.vio.forEach(v => { const st = STEPS.find(x => x.no === String(v.step)); items.push({ t: `第${v.step}项 ${v.t} → ${st && st.recite ? '按票面完整复诵：' + st.recite : '按票面顺序执行并核对'}`, cite: v.cite }); });
  (s.hints || []).forEach(h => items.push({ t: `「${h[0]}」不看提示独立完成一次`, cite: h[1] }));
  DIMS6.forEach((d, i) => { if (s.dims[i] < 75 && DIM_PLAN[d]) items.push({ t: `安排一轮「${DIM_PLAN[d][1]}」专项，把「${d}」练到 75 分以上`, plan: DIM_PLAN[d][0] }); });
  if (!items.length) items.push({ t: '本场无扣分，下一场进入考核模式验证稳定性', plan: 'full' });
  return items.slice(0, 8);
}
function rvSummary(s, prev) {
  const acts = rvActions(s);
  return `${HOME_USER.name} · 陪练复盘摘要（${s.real ? '今天' : dayLabel(s.d)}）\n练习方式：${s.plan} · ${s.mode} · 用时 ${s.dur} 分钟\n综合得分：${s.score}${prev ? `（上一场 ${prev.score}）` : ''}\n扣分项：${s.vio.length ? s.vio.map(v => `第${v.step}项 ${v.t}（${v.cite || ''}）`).join('；') : '无'}\n提示使用：${(s.hints || []).length} 次\n六维：${DIMS6.map((d, i) => `${d} ${s.dims[i]}`).join(' / ')}\n下次练习要做到：\n${acts.map((a, i) => `${i + 1}. ${a.t}`).join('\n')}\n\n以上内容由陪练系统按本场留痕数据生成，经本人确认后提交带教师傅。`;
}
function pageReview() {
  const all = unifySessions();
  const list = rvFiltered(all);
  if (!RV.sel || !all.find(x => x.id === RV.sel)) RV.sel = (list[0] || all[0]).id;
  if (list.length && !list.find(x => x.id === RV.sel)) RV.sel = list[0].id;
  const idx = all.findIndex(x => x.id === RV.sel), s = all[idx], prev = all[idx + 1];
  const A = homeAgg();
  const red = s.vio.some(v => v.lv === 'red');
  const tagOf = v => `<span class="tag ${v.lv === 'red' ? 'rl' : v.lv === 'major' ? 'wn' : ''}">${v.lv === 'red' ? '一票否决' : v.lv === 'major' ? '严重' : '不规范'}</span>`;
  const stepOf = no => STEPS.find(x => x.no === String(no));
  const weakDims = DIMS6.map((n, i) => [n, s.dims[i]]).filter(x => x[1] < 75).map(x => x[0]);
  const courses = COURSES.filter(c => weakDims.includes(c.tag));
  const lines = s.lines || [];
  const others = all.filter(x => x.id !== s.id);
  const best = others.slice().sort((a, b) => b.score - a.score)[0];
  const cmpVals = RV.cmp === 'best' && best ? best.dims : RV.cmp === 'avg' ? RADAR_NOW : (prev ? prev.dims : RADAR_PREV);
  const cmpLabel = RV.cmp === 'best' ? '最佳场' : RV.cmp === 'avg' ? '30天均值' : '上一场';
  const acts = rvActions(s), actSt = (lsGet(LS_ACTS, {})[s.id]) || {};
  const actDone = acts.filter((_, i) => actSt['a' + i]).length;
  const better = prev ? DIMS6.map((d, i) => [d, s.dims[i] - prev.dims[i]]).filter(x => x[1] > 0) : [];
  return `<div class="ppage">
    <div class="ph"><b>评分复盘</b><span>近30天 ${A.cnt + all.filter(x => x.real).length} 场 · 平均 ${A.avg} 分 · 记录由陪练舱自动留痕</span>
      <span class="phr"><button class="btn sm" data-rvsum="1">生成复盘摘要</button></span></div>
    <div class="rvwrap">
      <aside class="rvlist hcard hg">
        <div class="hch"><b>场次记录</b><span>${list.length} 场</span></div>
        <div class="chips">${[['all', '全部'], ['local', '本机'], ['exam', '考核'], ['red', '红线'], ['low', '<80']].map(([k, n]) => `<span class="chip ${RV.filter === k ? 'on' : ''}" data-rvf="${k}">${n}</span>`).join('')}</div>
        ${list.map(x => `<div class="rvit ${x.id === RV.sel ? 'on' : ''}" data-sess="${x.id}">
          <div class="rv1"><span class="mono">${x.real ? '今天' : dayLabel(x.d)}</span>${x.real ? '<i class="rvloc">本机</i>' : ''}<b class="mono ${x.score < 75 ? 'wv' : 'gv'}">${x.score}</b></div>
          <div class="rv2">${x.plan}</div><div class="rv3">${x.mode} · ${x.dur} 分钟 · 扣分 ${x.vio.length}</div></div>`).join('') || '<div class="tk3" style="padding:14px">没有符合条件的场次。</div>'}
      </aside>
      <main class="rvmain">
        <section class="hcard rvhead hg">
          <div class="rvscore"><div class="rvbig ${red ? 'wv' : ''}">${s.score}</div><div class="tk3">综合得分 · ${red ? '触发一票否决' : s.mode}</div>
            <div class="rvkpis"><span><b>${s.dur}</b>分钟</span><span><b>${s.vio.length}</b>扣分项</span><span><b>${(s.hints || []).length}</b>提示</span><span><b>${s.vio.filter(v => v.lv === 'red').length}</b>红线</span>${prev ? `<span><b class="${s.score >= prev.score ? 'gv' : 'wv'}">${s.score - prev.score >= 0 ? '+' : ''}${s.score - prev.score}</b>较上一场</span>` : ''}</div>
            <div class="rvtags">${DIMS6.map((t, i) => `<i class="${s.dims[i] > 80 ? 'ok' : s.dims[i] > 55 ? 'wn' : 'bad'}" data-hdim="${i}" title="查看「${t}」明细">${t} ${s.dims[i] > 80 ? '达标' : s.dims[i] > 55 ? '待提升' : '短板'}</i>`).join('')}</div>
            ${better.length ? `<div class="tk3" style="margin-top:8px">较上一场进步：${better.map(x => `${x[0]} +${x[1]}`).join('、')}</div>` : ''}</div>
          <div class="rvradar">
            <div class="chips" style="justify-content:center">${[['prev', '上一场'], ['best', '最佳场'], ['avg', '30天均值']].map(([k, n]) => `<span class="chip ${RV.cmp === k ? 'on' : ''}" data-rvcmp="${k}">${n}</span>`).join('')}</div>
            ${chRadar(DIMS6, s.dims, cmpVals, { w: 330, h: 240, l1: '本场', l2: cmpLabel })}<div class="tk3" style="text-align:center">本场 vs ${cmpLabel} · 顶点可查明细</div></div>
        </section>
        <section class="hcard hg"><div class="hch"><b>AI 复盘</b><em class="ai">AI</em><span>由本场留痕数据生成</span></div>
          <div class="hcb"><div class="airv">${aiReview(s, prev)}</div></div></section>
        <section class="hcard ho"><div class="hch"><b>场次回放</b><span>逐项时间轴 · 绿=完成 金=不规范 橙=严重 红=一票否决 · 小点=用了提示</span>
            <span class="phr"><button class="btn sm" data-rvplay="1">${RV.play ? '■ 停止回放' : '▶ 回放本场'}</button></span></div>
          <div class="hcb">${rvTimeline(s)}</div></section>
        <section class="hcard hg"><div class="hch"><b>逐句回放</b><span>我的复诵/回报 vs 票面标准话术 · <i class="dm">漏说</i> <i class="dx">说错/多说</i> · 点「跟读」当场再练一遍</span></div>
          <div class="hcb">${lines.length ? `<div class="tl">${lines.map((l, i) => `<div class="tlrow ${RV.follow[i] === 'pass' ? 'pass' : ''}">
              <div class="tlk"><b class="mono">第${l.step}项</b><span>${l.beat === 1 ? '复诵' : '回报'}</span><em class="mono ${simPct(l.mine, l.std) < 86 ? 'wv' : 'gv'}">${simPct(l.mine, l.std)}%</em><button class="btn sm" data-follow="${i}">${RV.follow[i] ? '收起' : '跟读'}</button></div>
              <div class="tlb"><div class="tlt">${l.t || ''}</div><div class="tlme">我说：${diffHtml(l.mine, l.std)}</div><div class="tlstd">标准：${l.std}</div>
              ${RV.follow[i] ? `<div class="tlfollow"><input class="tlin" data-followin="${i}" placeholder="照标准话术念一遍（可点麦克风口述）…" autocomplete="off"><span class="tlmeter" id="fm_${i}">${RV.follow[i] === 'pass' ? '<b class="gv">已通过 ✓</b>' : '吻合度 —'}</span></div>` : ''}</div></div>`).join('')}</div>` : '<div class="tk3">本场无逐句记录。</div>'}</div></section>
        <section class="hcard ho"><div class="hch"><b>错误卡</b><span>错在哪 · 依据 · 正确做法</span></div>
          <div class="hcb">${s.vio.length ? `<div class="errgrid">${s.vio.map(v => { const st = stepOf(v.step); return `<div class="errc ${v.lv}">
              <div class="err1">${tagOf(v)}<b>第${v.step}项</b><span>${st ? st.ticket : ''}</span></div>
              <div class="err2"><label>错在哪</label>${v.t}</div>
              <div class="err2"><label>依据</label><span class="mono">${v.cite || ''}</span>${st && st.rule ? `<div class="errq">${st.rule}</div>` : ''}</div>
              <div class="err2"><label>正确做法</label>${st ? (st.recite || st.report || '按票面执行') : '按票面执行'}</div>
            </div>`; }).join('')}</div>
            <div class="rvact"><button class="btn pri" data-retry="${s.id}">错题重练（${s.vio.length} 项）</button><button class="btn" data-train="${planId(s.plan)}">重练该方式</button></div>`
            : '<div class="tk3">本场未触发扣分项。</div>'}</div></section>
        <div class="gtwo">
          <section class="hcard ho"><div class="hch"><b>下次练习要做到</b><em class="ai">AI</em><span>由本场留痕生成 · 已完成 ${actDone}/${acts.length}</span></div><div class="hcb">
            ${acts.map((a, i) => `<label class="actit ${actSt['a' + i] ? 'done' : ''}"><input type="checkbox" data-rvact="${i}" ${actSt['a' + i] ? 'checked' : ''}><span>${a.t}${a.cite ? `<i class="cite">${a.cite}</i>` : ''}</span>${a.plan ? `<button class="btn sm" data-train="${a.plan}">去练</button>` : ''}</label>`).join('')}</div></section>
          <section class="hcard hg"><div class="hch"><b>下一步建议</b><span>专项 + 课程（知识课堂供给）</span></div><div class="hcb">
            ${(s.hints || []).map(h => `<div class="hrow hint">提示 · ${h[0]} · ${h[1]}</div>`).join('')}
            ${(s.praise || []).map(p => `<div class="hrow"><span class="tag ok">加分</span> ${p.title || p}</div>`).join('')}
            ${weakDims.map(d => DIM_PLAN[d] ? `<div class="hrow"><button class="btn sm" data-train="${DIM_PLAN[d][0]}">练「${DIM_PLAN[d][1]}」专项</button> <span class="tk3">针对「${d}」</span></div>` : '').join('')}
            ${courses.map(c => `<div class="hrow">课程 · ${c.n} <span class="tk3">${c.h} 学时 · ${c.tag}</span> <button class="btn sm" data-go="classroom">去学</button></div>`).join('') || '<div class="hrow">各维度均达标，建议进入考核模式。</div>'}
            <div class="hrow"><button class="btn sm" data-go="growth">查看成长档案</button></div></div></section>
        </div>
      </main>
    </div></div>`;
}

/* ================= 成长档案 ================= */
const LMAP_MASTERY = { state: 92, sanshen: 88, wufang: 85, changpiao: 90, yandian: 74, gis: 58, erci: 80, yichang: 70, diaodu: 76 };
const LMAP_PLAN = { gis: 'sp_gis', yandian: 'sp_vd', diaodu: 'sp_ord', sanshen: 'sp_ord', changpiao: 'p1', yichang: 'full', erci: 'p3', wufang: 'full', state: 'p1' };
const GR = { cmp: 'prev', show: { score: true, dur: false, vio: false, hint: false, avg: true, pass: true } };
function goalsGet() { return lsGet(LS_GOALS, {}); }
function goalArr() { const g = goalsGet(); return DIMS10.map((_, i) => g[i] != null ? +g[i] : null); }
function growthPredict(i) { const n = RADAR10_NOW[i], p = RADAR10_PREV[i], o = RADAR10_OLD[i]; return Math.max(0, Math.min(100, Math.round(n + (n - p) * .6 + (p - o) * .2))); }
function growthRadar() {
  const g = goalArr(), hasGoal = g.some(v => v != null);
  const target = hasGoal ? g.map((v, i) => v != null ? v : RADAR10_NOW[i]) : null;
  const cmp = GR.cmp === 'old' ? RADAR10_OLD : GR.cmp === 'team' ? TEAM_AVG10 : RADAR10_PREV;
  const lb = GR.cmp === 'old' ? '前月' : GR.cmp === 'team' ? '班组均值' : '上月';
  return chRadar(DIMS10, RADAR10_NOW, cmp, { w: 440, h: 320, l1: '本月', l2: lb, key: 'gdim', target, c2: GR.cmp === 'team' ? '#7aa0c8' : '#b3bfb2' });
}
function badgeList() { const L = unifySessions(); return BADGES.map(b => Object.assign({}, b, { lit: !!b.test(L) })); }
function pageGrowth() {
  const A = homeAgg();
  const done = MILESTONES.filter(m => m.k === 'done').length;
  const goals = goalArr();
  const pts = unifySessions().slice().sort((a, b) => b.d - a.d);
  const badges = badgeList(), lit = badges.filter(b => b.lit).length;
  const up = DIMS10.filter((_, i) => RADAR10_NOW[i] > RADAR10_PREV[i]).length;
  return `<div class="ppage">
    <div class="ph"><b>成长档案</b><span>${HOME_USER.name} · ${HOME_USER.post} · ${HOME_USER.team}</span><span class="phr"><button class="btn sm" data-print="1">打印 / 导出档案</button></span></div>
    <section class="hcard gcard ho"><div class="gav">${HOME_USER.name.slice(0, 1)}</div>
      <div class="gmeta"><b>${HOME_USER.name}</b><span>${HOME_USER.post} · ${HOME_USER.team} · 2024-08 入职 · 带教师傅 陈志远</span></div>
      <div class="gkpis"><div class="kpi"><b>${A.cnt}</b><span>近30天场次</span></div><div class="kpi"><b>${(A.totalMin / 60).toFixed(1)}h</b><span>累计时长</span></div><div class="kpi"><b>${A.avg}</b><span>平均得分</span></div><div class="kpi"><b>${HOME_USER.hours.done}/${HOME_USER.hours.need}</b><span>年度学时</span></div><div class="kpi good"><b>${up}/10</b><span>维度上升</span></div><div class="kpi good"><b>${lit}/${badges.length}</b><span>能力徽章</span></div><div class="kpi good"><b>${done}</b><span>里程碑</span></div></div></section>
    <div class="gtwo g21">
      <section class="hcard hg"><div class="hch"><b>能力全景</b><span>十维 · 本月 vs 对照 · 顶点可查明细</span>
          <span class="phr chips">${[['prev', '上月'], ['old', '前月'], ['team', '班组均值']].map(([k, n]) => `<span class="chip ${GR.cmp === k ? 'on' : ''}" data-gcmp="${k}">${n}</span>`).join('')}</span></div>
        <div class="hcb" id="gradar">${growthRadar()}</div></section>
      <section class="hcard hg"><div class="hch"><b>三期对照与目标</b><em class="ai">AI 预测</em><span>前月 / 上月 / 本月 · 预测为测算参考 · 目标可直接填写</span></div><div class="hcb"><table class="htbl gtbl"><tr><th>维度</th><th>前月</th><th>上月</th><th>本月</th><th>变化</th><th>预测下月</th><th>本月目标</th><th>差距</th></tr>
        ${DIMS10.map((n, i) => { const d = RADAR10_NOW[i] - RADAR10_PREV[i], g = goals[i]; return `<tr><td class="hitv" data-gdim="${i}" style="cursor:pointer">${n}</td><td class="mono">${RADAR10_OLD[i]}</td><td class="mono">${RADAR10_PREV[i]}</td><td class="mono">${RADAR10_NOW[i]}</td><td class="mono ${d >= 0 ? 'gv' : 'wv'}">${d >= 0 ? '+' : ''}${d}</td><td class="mono">${growthPredict(i)}</td><td><input class="gin" type="number" min="0" max="100" data-goal="${i}" value="${g != null ? g : ''}" placeholder="—"></td><td class="mono ${g != null ? (RADAR10_NOW[i] >= g ? 'gv' : 'wv') : ''}" id="ggap${i}">${g != null ? (RADAR10_NOW[i] >= g ? '已达成' : (RADAR10_NOW[i] - g)) : '—'}</td></tr>`; }).join('')}</table>
        <div class="tk3" style="margin-top:6px">预测按近三期趋势线性外推；目标由本人设定，达成情况以人工审核为准。</div></div></section>
    </div>
    <section class="hcard hg"><div class="hch"><b>成长曲线</b><span>近30天各场 · 点击图例切换序列 · 点击数据点打开该场复盘</span>
        <span class="phr chips">${[['score', '得分'], ['avg', '7日均线'], ['dur', '用时'], ['vio', '扣分项'], ['hint', '提示次数'], ['pass', '及格/考核线']].map(([k, n]) => `<span class="chip ${GR.show[k] ? 'on' : ''}" data-gshow="${k}">${n}</span>`).join('')}</span></div>
      <div class="hcb" id="gcurve">${chSessionCurve(pts, GR.show, { w: 980, h: 250 })}</div></section>
    <section class="hcard ho"><div class="hch"><b>能力徽章</b><span>${lit} 枚已点亮 · 由近30天留痕自动判定 · 点击查看条件</span></div><div class="hcb">
      <div class="bgrid">${badges.map(b => `<div class="badge ${b.lit ? 'lit' : ''}" data-badge="${b.id}" data-tip="${b.d}"><svg viewBox="0 0 48 48"><polygon points="24,3 42,13 42,35 24,45 6,35 6,13" fill="${b.lit ? 'url(#gbadge)' : '#f1efe2'}" stroke="${b.lit ? '#c9a227' : '#d9d6c5'}" stroke-width="1.6"/><path d="M15 25 l6 6 12 -13" fill="none" stroke="${b.lit ? '#fff' : '#c8cfb9'}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><defs><linearGradient id="gbadge" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e3c05a"/><stop offset="1" stop-color="var(--ac)"/></linearGradient></defs></svg><b>${b.n}</b><span>${b.lit ? '已点亮' : '未点亮'}</span></div>`).join('')}</div></div></section>
    <section class="hcard hg"><div class="hch"><b>学习地图</b><span>九大知识主题掌握度 · 点亮 = 掌握度 ≥ 75</span></div><div class="hcb">
      <div class="lmap">${KNOW.map(k => { const m = LMAP_MASTERY[k.id] || 0, lit = m >= 75; return `<div class="lmt ${lit ? 'lit' : ''}" data-lmap="${k.id}" data-tip="${k.t} · 掌握度 ${m}">
        <svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="18" fill="none" stroke="#e9e6d8" stroke-width="4"/><circle cx="22" cy="22" r="18" fill="none" stroke="${lit ? 'var(--ac)' : '#c9a227'}" stroke-width="4" stroke-dasharray="${(113 * m / 100).toFixed(1)} 113" transform="rotate(-90 22 22)" stroke-linecap="round"/><text x="22" y="26" text-anchor="middle" font-size="11" font-family="var(--mono)" fill="${lit ? 'var(--ac)' : '#a8821b'}">${m}</text></svg>
        <div><b>${k.t}</b><span>${k.sub}</span></div></div>`; }).join('')}</div></div></section>
    <div class="gtwo">
      <section class="hcard ho"><div class="hch"><b>晋升通道</b><span>当前 · 变电运行值班员</span></div><div class="hcb"><div class="ladder">
        ${LADDER.map((r, i) => `<div class="rung ${r.cur ? 'cur' : ''}"><div class="rh"><b>${r.post}</b>${r.cur ? '<i>当前</i>' : ''}<span class="mono">${r.met.filter(Boolean).length}/${r.req.length}</span></div>
          <div class="rq">${r.req.map((q, j) => `<span class="${r.met[j] ? 'ok' : ''}">${r.met[j] ? '✓' : '○'} ${q}</span>`).join('')}</div></div>`).join('')}</div>
        <div class="tk3" style="margin-top:8px">晋升资格以人工审核结果为准。</div></div></section>
      <section class="hcard ho"><div class="hch"><b>成长里程碑</b><span>${done} 项已达成</span></div><div class="hcb"><div class="ms">
        ${MILESTONES.map(m => `<div class="msi ${m.k}"><i></i><span class="mono">${m.d || (m.ago >= 0 ? dayLabel(m.ago) : dateAfter(-m.ago))}</span><b>${m.t}</b></div>`).join('')}</div></div></section>
    </div>
    <div class="gtwo">
      <section class="hcard ho"><div class="hch"><b>学时记录</b><span>年度 ${HOME_USER.hours.done}/${HOME_USER.hours.need} 学时 · 知识课堂回写</span></div><div class="hcb"><table class="htbl"><tr><th>日期</th><th>内容</th><th>学时</th><th>来源</th></tr>
        ${hourLog().map(x => `<tr><td class="mono">${x.d === 0 ? '今天' : dayLabel(x.d)}</td><td>${x.n}</td><td class="mono">${x.h}</td><td>${x.src}</td></tr>`).join('')}</table></div></section>
      <section class="hcard ho"><div class="hch"><b>资质证书</b><span>${HOME_USER.certs.length} 项有效</span></div><div class="hcb"><table class="htbl"><tr><th>证书</th><th>取得</th><th>复审期限</th><th>状态</th></tr>
        ${HOME_USER.certs.map(c => `<tr><td>${c.n}</td><td class="mono">${c.got}</td><td class="mono">${c.review}</td><td><span class="tag ok">有效</span></td></tr>`).join('')}</table></div></section>
    </div>
    <div class="tk3" style="margin:6px 4px 14px">能力与胜任度数据为系统测算参考，任职资格评定以人工审核结果为准。</div></div>`;
}
function growthDim(i) {
  const n = DIMS10[i], all = unifySessions();
  const rel = i < 6 ? all.filter(s => s.vio.some(v => vioDim(v) === n)).slice(0, 6) : [];
  const g = goalArr()[i];
  const desc = DIM10_DESC[n] || '';
  openDrill(`能力明细 · ${n}`, `前月 ${RADAR10_OLD[i]} · 上月 ${RADAR10_PREV[i]} · 本月 ${RADAR10_NOW[i]} · 班组均值 ${TEAM_AVG10[i]}`, `
    ${desc ? `<div class="hrow">${desc}</div>` : ''}
    <div class="gtwo"><div>${chRadar(DIMS10, RADAR10_NOW, TEAM_AVG10, { w: 320, h: 240, l1: '本人', l2: '班组均值', key: 'x' })}</div>
    <div><div class="hrow">三期走势：${RADAR10_OLD[i]} → ${RADAR10_PREV[i]} → <b>${RADAR10_NOW[i]}</b>，预测下月 ${growthPredict(i)}</div>
    <div class="hrow">较班组均值 ${RADAR10_NOW[i] - TEAM_AVG10[i] >= 0 ? '+' : ''}${RADAR10_NOW[i] - TEAM_AVG10[i]}</div>
    <div class="hrow">本月目标：${g != null ? `${g}（${RADAR10_NOW[i] >= g ? '已达成' : '差 ' + (g - RADAR10_NOW[i])}）` : '未设定，可在三期对照表中填写'}</div></div></div>
    ${rel.length ? `<div class="sec"><div class="st">相关扣分场次</div>${sessTable(rel)}</div>` : ''}
    <div class="tk3">测算供参考，能力评价以人工审核为准。</div>`,
    DIM_PLAN[n] ? `<button class="btn pri" data-train="${DIM_PLAN[n][0]}">练「${DIM_PLAN[n][1]}」专项</button>` : `<button class="btn pri" data-train="full">去练完整票</button>`);
}
function badgeDrill(id) {
  const b = badgeList().find(x => x.id === id); if (!b) return;
  openDrill(`能力徽章 · ${b.n}`, b.lit ? '已点亮' : '未点亮', `<div class="hrow">点亮条件：${b.d}</div><div class="hrow">判定依据：近30天陪练留痕（含本机场次），系统自动判定。</div>${b.lit ? '<div class="hrow"><span class="tag ok">已点亮</span> 保持即可。</div>' : '<div class="hrow"><span class="tag wn">未点亮</span> 完成条件后自动点亮。</div>'}`,
    b.plan ? `<button class="btn pri" data-train="${b.plan}">去练相关内容</button>` : '');
}

/* ================= 知识课堂（供给层接入 + 课程库 + 随堂测验 + 学习计划） ================= */
const CL = { q: '', tag: '全部', quiz: null, plan: null, syncing: false };
function courseProg() { const p = lsGet(LS_COURSE, {}); return COURSE_LIB.map(c => Object.assign({}, c, { done: Math.max(c.done, p[c.id] || 0) })); }
function hourLog() { return HOUR_LOG.concat(lsGet(LS_HOURS, [])).slice().sort((a, b) => a.d - b.d); }
function hoursAdd(n, h) { const l = lsGet(LS_HOURS, []); l.unshift({ d: 0, n, h, src: '陪练底座回写' }); lsSet(LS_HOURS, l.slice(0, 20)); }
function archSVG() {
  return `<svg viewBox="0 0 900 300" class="chsvg arch">
    <rect x="20" y="30" width="250" height="240" rx="12" fill="#f4f5ec" stroke="#d9d6c5"/>
    <text x="145" y="58" text-anchor="middle" font-size="13" font-weight="700" fill="#33443a">南网人工智能知识课堂</text><text x="145" y="74" text-anchor="middle" font-size="10" fill="#98a69c">供给层</text>
    ${CLASSROOM.supply.map((s, i) => `<g class="hitv" data-arch="${s.k}" data-tip="点击查看「${s.n}」接口字段与同步频率"><rect x="40" y="${88 + i * 44}" width="210" height="34" rx="6" fill="#fff" stroke="#e2dfd0"/><text x="52" y="${109 + i * 44}" font-size="12" fill="#33443a">${s.n}</text><text x="238" y="${109 + i * 44}" text-anchor="end" font-size="11" font-family="var(--mono)" fill="var(--ac)">${s.v}</text></g>`).join('')}
    <rect x="480" y="30" width="400" height="240" rx="12" fill="var(--acbg)" stroke="var(--ac)" stroke-width="1.6"/>
    <text x="680" y="58" text-anchor="middle" font-size="14" font-weight="700" fill="var(--acd)">小瓦特·练 AI 智能陪练底座</text><text x="680" y="74" text-anchor="middle" font-size="10" fill="var(--ac)">主体 · 调用供给数据并回写学时</text>
    ${[['AI 教练中心', 500, 92, 'plaza'], ['陪练舱', 700, 92, 'arena'], ['评分复盘', 500, 150, 'review'], ['成长档案', 700, 150, 'growth'], ['班组看板', 500, 208, 'team'], ['教练编辑器', 700, 208, 'editor']].map(([n, x, y, go]) => `<g class="hitv" data-go="${go}" data-tip="打开${n}"><rect x="${x}" y="${y}" width="180" height="40" rx="6" fill="#fff" stroke="var(--acln)"/><text x="${x + 90}" y="${y + 25}" text-anchor="middle" font-size="12" fill="#17301f">${n}</text></g>`).join('')}
    ${CLASSROOM.supply.map((s, i) => { const y = 105 + i * 44; return s.dir === 'in'
      ? `<path d="M250,${y} C360,${y} 380,${140} 480,${140}" class="gedge gfeed" fill="none"/><circle r="3.4" fill="var(--ac)"><animateMotion dur="${2.6 + i * .4}s" repeatCount="indefinite" path="M250,${y} C360,${y} 380,${140} 480,${140}"/></circle>`
      : `<path d="M480,${160} C380,${160} 360,${y} 250,${y}" class="gedge gact" fill="none"/><circle r="3.4" fill="#c9a227"><animateMotion dur="2.4s" repeatCount="indefinite" path="M480,${160} C380,${160} 360,${y} 250,${y}"/></circle>`; }).join('')}
    <text x="365" y="122" text-anchor="middle" font-size="10.5" fill="var(--ac)">供给 →</text><text x="365" y="188" text-anchor="middle" font-size="10.5" fill="#a8821b">← 学时回写</text>
  </svg>`;
}
function quizHtml() {
  const Q = CL.quiz; if (!Q) return '';
  if (Q.done) {
    const right = Q.ids.filter((id, i) => Q.ans[i] === QUIZ.find(q => q.id === id).a).length;
    const wrong = Q.ids.map((id, i) => [QUIZ.find(q => q.id === id), Q.ans[i]]).filter(([q, a]) => a !== q.a);
    return `<div class="qzdone"><div class="rvbig ${right / Q.ids.length >= .8 ? '' : 'wv'}" style="font-size:44px">${right}<span style="font-size:16px;color:#98a69c">/${Q.ids.length}</span></div>
      <div class="tk3">${Q.topic === '全部' ? '综合测验' : Q.topic} · 学时已回写 0.5 · 记录已写入成长档案</div>
      ${wrong.length ? `<div class="sec"><div class="st">错题</div>${wrong.map(([q]) => `<div class="hrow"><b>${q.q}</b><div class="tk3">正确：${q.opts[q.a]} · ${q.cite}</div></div>`).join('')}</div>` : '<div class="hrow"><span class="tag ok">全部答对</span></div>'}
      <div class="rvact"><button class="btn pri" data-qretry="1">再测一组</button>${wrong.length ? `<button class="btn" data-train="${LMAP_PLAN[wrong[0][0].k] || 'full'}">去练「${KNOW.find(k => k.id === wrong[0][0].k).t}」相关项</button>` : ''}</div></div>`;
  }
  const q = QUIZ.find(x => x.id === Q.ids[Q.i]), a = Q.ans[Q.i];
  return `<div class="qz"><div class="qzh"><span class="tbno">第 ${Q.i + 1}/${Q.ids.length} 题</span><i class="ctag">${q.dim}</i><span class="tk3">${KNOW.find(k => k.id === q.k).t}</span></div>
    <div class="qzq">${q.q}</div>
    <div class="qzopts">${q.opts.map((o, i) => `<div class="qzo ${a != null ? (i === q.a ? 'right' : i === a ? 'wrong' : 'dim') : ''}" data-qopt="${i}"><b>${'ABCD'[i]}</b>${o}</div>`).join('')}</div>
    ${a != null ? `<div class="qzx ${a === q.a ? 'ok' : 'bad'}"><b>${a === q.a ? '回答正确' : '回答错误'}</b> ${q.why} <span class="cite">依据 ${q.cite}</span></div><div class="rvact"><button class="btn pri" data-qnext="1">${Q.i + 1 >= Q.ids.length ? '查看结果' : '下一题'}</button></div>` : '<div class="tk3">选择一个答案，系统立即给出判定与依据。</div>'}</div>`;
}
function planRows() {
  const weak = DIMS6.map((d, i) => [d, RADAR_NOW[i]]).sort((a, b) => a[1] - b[1]).slice(0, 3).map(x => x[0]);
  const cs = courseProg().filter(c => c.done < c.ch.length);
  const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const rows = []; let ci = 0;
  for (let d = 0; d < 7; d++) {
    const dim = weak[d % weak.length];
    if (d % 3 === 0) { const c = cs.find(x => x.tag === dim) || cs[ci++ % cs.length]; if (c) rows.push({ day: days[d], k: '课程', t: `${c.n} · 第 ${c.done + 1} 章「${c.ch[c.done]}」`, min: 30, dim: c.tag }); }
    else if (d % 3 === 1) { const p = DIM_PLAN[dim]; rows.push({ day: days[d], k: '陪练', t: p ? `专项 · ${p[1]}` : '完整操作票 · 演练模式', min: 15, dim, plan: p ? p[0] : 'full' }); }
    else rows.push({ day: days[d], k: '测验', t: `随堂测验 · ${dim} 相关 6 题`, min: 10, dim });
  }
  return rows;
}
function pageClassroom() {
  const cs = courseProg();
  const tags = ['全部'].concat(Array.from(new Set(COURSE_LIB.map(c => c.tag))));
  const list = cs.filter(c => (CL.tag === '全部' || c.tag === CL.tag) && (!CL.q || c.n.includes(CL.q) || c.ch.some(x => x.includes(CL.q))));
  const hist = lsGet(LS_QUIZ, []);
  const plan = CL.plan || lsGet(LS_PLAN, null);
  return `<div class="ppage">
    <div class="ph"><b>知识课堂</b><span>南网人工智能知识课堂 · 上次同步 ${CLASSROOM.syncAt}</span><span class="phr"><button class="btn sm ${CL.syncing ? 'busy' : ''}" data-sync="1">${CL.syncing ? '同步中…' : '立即同步'}</button></span></div>
    <section class="hcard hg"><div class="hch"><b>接入关系</b><span>课程 / 题库 / 学员画像 供给 → 底座；陪练学时 → 课堂回写 · 点击节点查看接口</span></div><div class="hcb">${archSVG()}</div></section>
    <div class="syncline">${CLASSROOM.supply.map(s => `<span class="sy ok ${CL.syncing ? 'busy' : ''}" data-arch="${s.k}">${s.n} ${s.dir === 'in' ? '已同步' : '已回写'} · ${s.v}</span>`).join('')}</div>
    <div class="gtwo g32">
      <section class="hcard ho"><div class="hch"><b>课程库</b><span>${list.length}/${cs.length} 门 · 点击课程查看章节并继续学习</span></div><div class="hcb">
        <div class="clsearch"><input id="cl_q" data-clq="1" placeholder="搜索课程或章节…" value="${CL.q}"><div class="chips">${tags.map(t => `<span class="chip ${CL.tag === t ? 'on' : ''}" data-ctag="${t}">${t}</span>`).join('')}</div></div>
        <div class="clist">${list.map(c => `<div class="crs hitv" data-course="${c.id}"><div class="crs1"><b>${c.n}</b><i class="ctag">${c.tag}</i><span class="tk3">${c.lvl} · ${c.h} 学时</span></div><div class="hbar"><div class="hfill" style="width:${Math.round(c.done / c.ch.length * 100)}%"></div></div><div class="tk3">${c.done}/${c.ch.length} 章${c.done >= c.ch.length ? ' · 已完成，学时已回写' : c.done ? ' · 学习中' : ''}</div></div>`).join('') || '<div class="tk3">没有匹配的课程。</div>'}</div></div></section>
      <section class="hcard hg"><div class="hch"><b>随堂测验</b><em class="ai">AI 出题</em><span>题库联动 · 答错即出依据条款 · 完成回写 0.5 学时</span></div><div class="hcb" id="quizbox">
        ${CL.quiz ? quizHtml() : `<div class="chips">${['全部'].concat(KNOW.map(k => k.t)).map(t => `<span class="chip" data-quiz="${t}">${t}</span>`).join('')}</div>
        <div class="tk3" style="margin-top:8px">按主题抽 6 题（题库 ${QUIZ.length} 题）。${hist.length ? `本机测验 ${hist.length} 次，最近 ${hist[0].right}/${hist[0].n}（${hist[0].topic}）` : ''}</div>`}</div></section>
    </div>
    <div class="gtwo">
      <section class="hcard ho"><div class="hch"><b>错题 → 题库联动</b><span>陪练扣分项自动匹配练习题</span></div><div class="hcb"><table class="htbl"><tr><th>陪练扣分项</th><th>匹配题目</th><th>掌握度</th></tr>
        ${CLASSROOM.quizLink.map(q => `<tr><td>${q.vio}</td><td>${q.q}<div class="tk3">练习 ${q.tries} 次</div></td><td style="width:110px"><div class="hbar"><div class="hfill" style="width:${q.mastery}%;background:${q.mastery >= 80 ? 'var(--ac)' : '#c9a227'}"></div></div><span class="mono tk3">${q.mastery}%</span></td></tr>`).join('')}</table></div></section>
      <section class="hcard ho"><div class="hch"><b>本周学习计划</b><em class="ai">AI</em><span>按能力短板 + 课程进度生成 · 由本人确认后生效</span><span class="phr"><button class="btn sm" data-lplan="1">${plan ? '重新生成' : '生成本周计划'}</button></span></div><div class="hcb">
        ${plan ? `<table class="htbl plantbl" id="plantbl"><tr><th>日</th><th>类型</th><th>内容</th><th>时长</th><th>针对</th></tr>${plan.rows.map(r => `<tr class="erow"><td class="mono">${r.day}</td><td><i class="ctag">${r.k}</i></td><td>${r.t}${r.plan ? ` <button class="btn sm" data-train="${r.plan}">去练</button>` : ''}</td><td class="mono">${r.min} 分钟</td><td class="tk3">${r.dim}</td></tr>`).join('')}</table>
          <div class="rvact">${plan.saved ? '<span class="tag ok">已加入日程</span>' : '<button class="btn pri" data-lplansave="1">确认并加入日程</button>'}<span class="tk3">合计 ${plan.rows.reduce((a, r) => a + r.min, 0)} 分钟 · 计划由系统生成，经本人确认后生效</span></div>` : '<div class="edempty">点「生成本周计划」，系统按当前短板（' + DIMS6.map((d, i) => [d, RADAR_NOW[i]]).sort((a, b) => a[1] - b[1]).slice(0, 3).map(x => x[0]).join('、') + '）与课程进度排出 7 天安排。</div>'}</div></section>
    </div>
    <div class="gtwo">
      <section class="hcard hg"><div class="hch"><b>学员画像同步</b><span>课堂 ⇄ 底座</span></div><div class="hcb"><table class="htbl"><tr><th>字段</th><th>当前值</th><th>状态</th></tr>
        ${CLASSROOM.profileSync.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td><span class="tag ok">${r[2]}</span></td></tr>`).join('')}</table></div></section>
      <section class="hcard ho"><div class="hch"><b>学时回写记录</b><span>近30天</span></div><div class="hcb"><table class="htbl"><tr><th>日期</th><th>内容</th><th>学时</th><th>来源</th></tr>
        ${hourLog().map(x => `<tr><td class="mono">${x.d === 0 ? '今天' : dayLabel(x.d)}</td><td>${x.n}</td><td class="mono">${x.h}</td><td>${x.src}</td></tr>`).join('')}</table></div></section>
    </div></div>`;
}
function courseDrill(id) {
  const c = courseProg().find(x => x.id === id); if (!c) return;
  $$('.mask').forEach(m => m.remove());
  openDrill(`课程 · ${c.n}`, `${c.tag} · ${c.lvl} · ${c.h} 学时 · ${c.done}/${c.ch.length} 章`, `
    <div class="hbar" style="margin-bottom:10px"><div class="hfill" style="width:${Math.round(c.done / c.ch.length * 100)}%"></div></div>
    ${c.ch.map((n, i) => `<div class="chap ${i < c.done ? 'done' : i === c.done ? 'cur' : ''}"><i>${i < c.done ? '✓' : i + 1}</i><b>${n}</b><span>${i < c.done ? '已完成' : i === c.done ? '当前章节' : '待学'}</span></div>`).join('')}
    <div class="tk3" style="margin-top:8px">章节完成后学时按课堂口径回写至成长档案。</div>`,
    c.done < c.ch.length ? `<button class="btn pri" data-cnext="${c.id}">学完本章「${c.ch[c.done]}」</button>` : `<button class="btn" data-train="${LMAP_PLAN[c.k] || 'full'}">去练相关内容</button>`);
}
function courseNext(id) {
  const p = lsGet(LS_COURSE, {}); const c = courseProg().find(x => x.id === id); if (!c) return;
  p[id] = c.done + 1; lsSet(LS_COURSE, p);
  if (p[id] >= c.ch.length) { hoursAdd(c.n, c.h); toast(`「${c.n}」已完成，学时回写 ${c.h}`, 'ok'); }
  else toast(`已完成第 ${p[id]} 章，进度已同步`, 'ok');
  rerender('classroom'); courseDrill(id);
}
function quizStart(topic) {
  const k = topic === '全部' ? null : (KNOW.find(x => x.t === topic) || {}).id;
  let pool = k ? QUIZ.filter(q => q.k === k) : QUIZ.slice();
  if (pool.length < 6) pool = pool.concat(QUIZ.filter(q => !pool.includes(q)));
  const seed = Date.now() % 7; pool = pool.slice(seed).concat(pool.slice(0, seed));
  CL.quiz = { topic, ids: pool.slice(0, 6).map(q => q.id), i: 0, ans: {}, done: false };
  const b = $('#quizbox'); if (b) b.innerHTML = quizHtml();
}
function quizAnswer(i) {
  const Q = CL.quiz; if (!Q || Q.ans[Q.i] != null) return;
  Q.ans[Q.i] = i; const b = $('#quizbox'); if (b) b.innerHTML = quizHtml();
}
function quizNext() {
  const Q = CL.quiz; if (!Q) return;
  Q.i++;
  if (Q.i >= Q.ids.length) {
    Q.done = true;
    const right = Q.ids.filter((id, i) => Q.ans[i] === QUIZ.find(q => q.id === id).a).length;
    const h = lsGet(LS_QUIZ, []); h.unshift({ ts: Date.now(), topic: Q.topic, right, n: Q.ids.length }); lsSet(LS_QUIZ, h.slice(0, 20));
    hoursAdd(`随堂测验 · ${Q.topic === '全部' ? '综合' : Q.topic}（${right}/${Q.ids.length}）`, 0.5);
    rerender('classroom'); return;
  }
  const b = $('#quizbox'); if (b) b.innerHTML = quizHtml();
}
function planGen() {
  CL.plan = { rows: planRows(), saved: false, ts: Date.now() };
  rerender('classroom');
  const rows = $$('#plantbl .erow');
  rows.forEach((r, i) => { r.classList.add('pre'); setTimeout(() => { r.classList.remove('pre'); r.classList.add('in'); }, 110 * i + 60); });
}
function syncNow() {
  if (CL.syncing) return;
  CL.syncing = true; rerender('classroom');
  setTimeout(() => { const d = new Date(); CLASSROOM.syncAt = `今日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; CL.syncing = false; rerender('classroom'); toast('课程库 / 题库 / 学员画像已同步，学时已回写', 'ok'); }, 1100);
}
function archDrill(k) {
  const f = ARCH_IF[k]; if (!f) return;
  openDrill(`接口 · ${f.n}`, `${f.dir} · ${f.freq}`, `<div class="hrow">最近同步：${f.last}</div><div class="sec"><div class="st">字段</div><div class="rvtags">${f.fields.map(x => `<i class="ok">${x}</i>`).join('')}</div></div><div class="hrow">同步方式：增量拉取，失败自动重试，结果写入学时回写记录。</div>`, '');
}

/* ================= 班组看板（管理端） ================= */
function teamTasks() {
  const base = [{ id: 't0', coach: '倒闸操作 · 陈志远', plan: '完整操作票', mode: '考核模式', due: dateAfter(HOME_TASK.dueDays), pass: 80, who: '全班', done: 7, total: 12 }];
  return base.concat(lsGet(LS_TASKS, []));
}
function pageTeam() {
  const active = TEAM.filter(m => m.sess > 0);
  const cover = Math.round(active.length / TEAM.length * 100);
  const avgAll = Math.round(active.reduce((a, m) => a + m.avg, 0) / active.length);
  const redTotal = REDLINES.reduce((a, r) => a + r[1], 0);
  const idle = TEAM.filter(m => m.sess === 0 || m.last > 6);
  const heat = v => { if (!v) return '<div class="heatc" style="background:#f4f3ea;color:#b3bfb2">—</div>'; const t = Math.max(0, Math.min(1, (v - 40) / 60)); return `<div class="heatc" style="background:color-mix(in srgb,var(--ac) ${Math.round((.08 + t * .7) * 100)}%,transparent);color:${t > .55 ? '#fff' : 'var(--acd)'}">${v}</div>`; };
  const maxR = Math.max(...REDLINES.map(r => r[1]));
  const tasks = teamTasks();
  return `<div class="ppage">
    <div class="ph"><b>班组看板</b><span>${LEAD_USER.team} · 班组长 ${LEAD_USER.name} · ${TEAM.length} 人</span></div>
    <div class="hkpis ho" style="margin-top:-4px">
      <div class="kpi ${cover >= 90 ? 'good' : 'warn'}"><b>${cover}%</b><span>陪练覆盖率 ${active.length}/${TEAM.length}</span></div>
      <div class="kpi"><b>${(TEAM.reduce((a, m) => a + m.sess, 0) / TEAM.length).toFixed(1)}</b><span>人均场次 · 30天</span></div>
      <div class="kpi"><b>${avgAll}</b><span>班组平均分</span></div>
      <div class="kpi warn"><b>${redTotal}</b><span>红线触发 · 本月</span></div>
      <div class="kpi"><b>${TEAM.filter(m => m.task === 'todo').length}</b><span>任务未完成</span></div>
    </div>
    <div class="tmwrap">
      <section class="hcard ho"><div class="hch"><b>成员总览</b><span>点击成员查看能力明细</span></div><div class="hcb"><table class="htbl big2">
        <tr><th>成员</th><th>岗位</th><th>场次</th><th>平均分</th><th>短板</th><th>最近练习</th><th>本月任务</th></tr>
        ${TEAM.map((m, i) => { const w = m.sess ? DIMS6[m.dims.indexOf(Math.min(...m.dims))] : '—'; return `<tr class="rrow" data-member="${i}"><td><b>${m.n}</b></td><td>${m.post}</td><td class="mono">${m.sess || '—'}</td><td class="mono ${m.avg && m.avg < 75 ? 'wv' : 'gv'}">${m.avg || '—'}</td><td>${w}</td><td class="mono">${m.last < 0 ? '未练' : m.last === 0 ? '今天' : m.last + ' 天前'}</td><td>${m.task === 'done' ? '<span class="tag ok">已完成</span>' : '<span class="tag wn">未完成</span>'}</td></tr>`; }).join('')}</table>
        <div class="tk3" style="margin-top:8px">评价数据为陪练系统自动记录，用于培训安排参考；正式考评以人工审核为准。</div></div></section>
      <section class="hcard hg"><div class="hch"><b>班组短板热力</b><span>成员 × 能力项</span></div><div class="hcb"><div class="theat" style="grid-template-columns:70px repeat(6,1fr)">
        <div class="heath"></div>${DIMS6.map(d => `<div class="heath">${d}</div>`).join('')}
        ${TEAM.map(m => `<div class="heatn">${m.n}</div>${m.dims.map(v => heat(v)).join('')}`).join('')}</div></div></section>
    </div>
    <div class="tmwrap2">
      <section class="hcard hg"><div class="hch"><b>红线触发统计</b><span>本月 · 按类型</span></div><div class="hcb">
        ${REDLINES.map(r => `<div class="bar"><span>${r[0]}</span><div class="btrk"><div class="bfill" style="width:${Math.round(r[1] / maxR * 100)}%"></div></div><b class="mono">${r[1]}</b></div>`).join('')}</div></section>
      <section class="hcard ho"><div class="hch"><b>未练与待提醒</b><em class="ai">AI 草稿</em><span>${idle.length} 人</span></div><div class="hcb">
        ${idle.map(m => `<div class="hrow"><b>${m.n}</b> <span class="tk3">${m.sess === 0 ? '本月未练' : m.last + ' 天未练'} · ${m.task === 'todo' ? '任务未完成' : '任务已完成'}</span></div>`).join('')}
        <button class="btn" data-remind="1" style="margin-top:8px">生成提醒草稿</button></div></section>
      <section class="hcard ho"><div class="hch"><b>任务下发</b><span>选教练 · 截止 · 及格线</span></div><div class="hcb frm">
        <label>教练<select id="tk_coach">${COACHES.map(c => `<option value="${c.id}" ${c.open ? '' : 'disabled'}>${c.n}${c.open ? '' : '（未开通）'}</option>`).join('')}</select></label>
        <label>练习方式<select id="tk_plan">${PLANS.filter(p => p.id !== 'wrong').map(p => `<option value="${p.id}">${p.n}</option>`).join('')}</select></label>
        <label>模式<select id="tk_mode"><option>考核模式</option><option>演练模式</option><option>教学模式</option></select></label>
        <div class="frm2"><label>截止<input id="tk_due" type="date" value="${new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10)}"></label><label>及格线<input id="tk_pass" type="number" value="80" min="60" max="100"></label></div>
        <label>对象<select id="tk_who"><option>全班</option><option>未练人员</option>${TEAM.map(m => `<option>${m.n}</option>`).join('')}</select></label>
        <button class="btn pri" data-tasksend="1">下发任务</button></div></section>
    </div>
    <section class="hcard hg"><div class="hch"><b>本月任务</b><span>${tasks.length} 项</span></div><div class="hcb"><table class="htbl"><tr><th>教练</th><th>练习方式</th><th>模式</th><th>截止</th><th>及格线</th><th>对象</th><th>完成</th></tr>
      ${tasks.map(t => `<tr><td>${t.coach}</td><td>${t.plan}</td><td>${t.mode}</td><td class="mono">${t.due}</td><td class="mono">${t.pass}</td><td>${t.who}</td><td class="mono">${t.done}/${t.total}</td></tr>`).join('')}</table></div></section>
  </div>`;
}
function memberDrill(i) {
  const m = TEAM[i];
  openDrill(`成员 · ${m.n}`, `${m.post} · 近30天 ${m.sess} 场 · 平均 ${m.avg || '—'} 分`, m.sess ? `
    <div class="gtwo"><div>${chRadar(DIMS6, m.dims, TEAM_AVG, { w: 320, h: 240, l1: '本人', l2: '班组均值', key: 'x' })}<div class="tk3" style="text-align:center">本人 vs 班组均值</div></div>
    <div>${miniBars(m.dims)}<div class="hrow" style="margin-top:8px">红线触发 ${m.red} 次 · 最近练习 ${m.last === 0 ? '今天' : m.last + ' 天前'} · 本月任务${m.task === 'done' ? '已完成' : '未完成'}</div>
    <div class="tk3">正式考评以人工审核为准。</div></div></div>` : '<div class="hrow">本月尚无陪练记录。</div>',
    `<button class="btn pri" data-tasksend="${m.n}">给 ${m.n} 下发专项任务</button>`);
}
function remindDraft() {
  const idle = TEAM.filter(m => m.sess === 0 || m.last > 6);
  openDrill('提醒草稿', `${idle.length} 人 · 复制后经企业微信发送`, `<div class="draft" id="draft_txt">${idle.map(m => `${m.n}：${m.sess === 0 ? '本月尚未进行陪练' : '已 ' + m.last + ' 天未练习'}，请于${dateAfter(HOME_TASK.dueDays)}前完成班组下发的「${HOME_TASK.name}」。`).join('<br>')}<br><br>—— ${LEAD_USER.team} ${LEAD_USER.name}</div>
    <div class="tk3" style="margin-top:8px">草稿由看板数据生成，发送前由班组长确认。</div>`, '<button class="btn" data-copy="draft_txt">复制草稿</button>');
}
function taskSend(who) {
  const g = id => $(id) ? $(id).value : '';
  const coach = COACHES.find(c => c.id === g('#tk_coach')) || COACHES[0];
  const plan = PLANS.find(p => p.id === g('#tk_plan')) || PLANS[0];
  const t = { id: 't' + Date.now(), coach: coach.n, plan: plan.n, mode: g('#tk_mode') || '考核模式', due: (g('#tk_due') || '').replace(/^\d{4}-0?(\d+)-0?(\d+)$/, '$1月$2日') || dateAfter(3), pass: +(g('#tk_pass') || 80), who: who === '1' ? (g('#tk_who') || '全班') : who, done: 0, total: who === '1' && (g('#tk_who') === '全班') ? TEAM.length : who === '1' && g('#tk_who') === '未练人员' ? TEAM.filter(m => m.sess === 0 || m.last > 6).length : 1 };
  const list = lsGet(LS_TASKS, []); list.unshift(t); lsSet(LS_TASKS, list.slice(0, 10));
  toast(`已下发：${t.plan} · ${t.mode} · ${t.due}截止 · 对象 ${t.who}`, 'ok');
  $$('.mask').forEach(m => m.remove());
  $('#hpage').innerHTML = pageTeam();
}

/* ================= 教练编辑器（底座技术证据：一张操作票 → 一个新教练） ================= */
const ED = { tab: 'steps', text: SAMPLE_TICKET, steps: null, name: '培训二线 1162 检修转运行 · 陈志远', role: '监护人', avatar: 'daozha', tone: '沉稳', opening: '任玲玲，今天的操作任务是将培训二线1162线路由检修转运行。开始前先完成三审、着装互检和风险分析。', weights: [20, 20, 20, 15, 15, 10], reds: [true, true, true, true, true, true], hintCost: [1, 2, 4], kb: KNOW.map(k => k.id), files: [], lint: null, pv: null, kbq: '' };
const RED_NAMES = ['未验电即合接地刀闸', '发现异常未中止', '跳项操作', '走错间隔', 'GIS 只看后台未核对就地', '票令不一致未识别'];
const KB_FILES = [['110kV培训三线1163线路由运行转检修操作细则及流程图', '已解析 · 27 项 / 5 页流程图'], ['模拟操作脚本 V7', '已解析 · 117 条台词'], ['操作票试卷 2（含答案）', '已解析 · 27 项 + 三段调度令'], ['变电现场电气操作票管理细则（脱敏版）', '已解析 · 附录 G/J 判据 38 条']];
const ED_TPL = { exam: { n: '考核', w: [20, 20, 20, 15, 15, 10], reds: [1, 1, 1, 1, 1, 1], hint: [2, 4, 8] }, teach: { n: '教学', w: [15, 25, 20, 10, 15, 15], reds: [1, 1, 0, 1, 1, 0], hint: [0, 1, 2] }, special: { n: '专项 · 设备核对', w: [10, 15, 35, 10, 10, 20], reds: [1, 1, 1, 1, 1, 1], hint: [1, 2, 4] } };
const ED_SAMPLE_VIO = [[2, 12, 'GIS 位置确认不充分'], [1, 5, '复诵不完整'], [4, 5, '接令记录不完整']];
function parseTicket(text) {
  const lines = text.split(/\n+/).map(l => l.trim()).filter(Boolean);
  return lines.map((raw, i) => {
    const t = raw.replace(/^\d+[\.\、\s]+/, '');
    let act = 'check', an = '状态核对', loc = '间隔现场', judge = ['状态核对'], cite = '附录J', red = false;
    if (/接.*调度令|接调度令/.test(t)) { act = 'recv'; an = '接令'; loc = '调度电话旁'; judge = ['复诵与调度令一致', '记录发令单位/发令人/时间']; cite = '细则第十八条'; }
    else if (/^汇报/.test(t)) { act = 'report'; an = '汇报'; loc = '调度电话旁'; judge = ['汇报口径完整'] ; cite = '附录J'; }
    else if (/五防|模拟/.test(t)) { act = 'wufang'; an = '五防模拟'; loc = '五防电脑旁'; judge = ['按票面顺序模拟']; }
    else if (/地刀/.test(t) && /^合上/.test(t)) { act = 'ground'; an = '合接地刀闸'; loc = '就地控制柜'; judge = ['红线：合地刀前须完成两种非同源验电', '检查地刀合闸位置']; cite = '细则第十三条（四）/ 附录G-23'; red = true; }
    else if (/地刀/.test(t) && /^拉开/.test(t)) { act = 'ground'; an = '拉接地刀闸'; loc = '就地控制柜'; judge = ['确认工作票终结、人员撤离', '检查地刀分闸位置']; cite = '附录J'; }
    else if (/刀闸/.test(t) && /^(拉开|合上)/.test(t)) { act = 'gis'; an = 'GIS 刀闸操作'; loc = '监控后台旁'; judge = ['GIS 四项位置指示核对：后台/汇控柜/机构箱/拐臂'] ; cite = '附录G-5'; }
    else if (/开关/.test(t) && /^(断开|合上)/.test(t)) { act = 'switch'; an = '开关操作'; loc = '监控后台旁'; judge = ['监控后台执行', '检查开关位置指示与三相电流']; cite = '附录J'; }
    else if (/验电|确无电压/.test(t)) { act = 'verify'; an = '验电'; loc = '间隔现场'; judge = ['两种非同源指示均已变化'] ; cite = '附录G-23'; }
    else if (/空气开关|压板|把手/.test(t)) { act = 'secondary'; an = '二次操作'; loc = '保护/测控屏'; judge = ['核对屏柜名称防走错屏', '操作后核对指示']; }
    else if (/标示牌|标志牌|挂.*牌/.test(t)) { act = 'tag'; an = '标示牌'; loc = '间隔现场'; judge = ['悬挂/收回位置与记录一致']; }
    else if (/^检查/.test(t)) { act = 'check'; an = '检查核对'; loc = /后台|电流/.test(t) ? '监控后台旁' : /地刀|刀闸/.test(t) ? '就地控制柜' : '间隔现场'; judge = ['核对实际位置与票面一致']; }
    return { no: i + 1, raw, t, act, an, loc, judge, cite, red, recite: t, ok: false };
  });
}
/* 剧本一致性检查：按规程关系核查步骤之间的先后 */
function lintSteps(S0) {
  const out = [];
  if (!S0 || !S0.length) return out;
  if (S0[0].act !== 'recv') out.push({ lv: 'wn', t: '首项不是接调度令，操作票应以接令开始', cite: '细则第十八条' });
  S0.forEach((s, i) => {
    if (s.red) { const prev = S0.slice(Math.max(0, i - 4), i); if (!prev.some(p => p.act === 'verify')) out.push({ lv: 'rl', t: `第${s.no}项合接地刀闸前 4 项内无验电项，须先验电再接地`, cite: '细则第十三条（四）' }); }
    if (s.act === 'gis' && !(S0[i + 1] && S0[i + 1].act === 'check')) out.push({ lv: 'wn', t: `第${s.no}项刀闸操作后缺少位置核对项`, cite: '附录G-5' });
    if (s.act === 'switch' && !(S0[i + 1] && S0[i + 1].act === 'check')) out.push({ lv: 'wn', t: `第${s.no}项开关操作后缺少位置与电流核对项`, cite: '附录J' });
    if (s.act === 'recv') { let j = i + 1, hasRep = false; while (j < S0.length && S0[j].act !== 'recv') { if (S0[j].act === 'report') hasRep = true; j++; } if (!hasRep) out.push({ lv: 'wn', t: `第${s.no}项接令后本段没有汇报调度项`, cite: '附录J' }); }
    const dup = S0.findIndex((x, k) => k < i && x.t === s.t); if (dup >= 0) out.push({ lv: 'wn', t: `第${s.no}项与第${S0[dup].no}项票面重复`, cite: '' });
  });
  const un = S0.filter(s => !s.ok).length; if (un) out.push({ lv: 'ok', t: `${un} 项尚未人工校核`, cite: '' });
  if (!out.length) out.push({ lv: 'ok', t: '未发现顺序与缺项问题，可校核后发布', cite: '' });
  return out;
}
function edSample() {
  const W = ED.weights, sum = W.reduce((a, b) => a + b, 0) || 1;
  const pen = [0, 0, 0, 0, 0, 0]; ED_SAMPLE_VIO.forEach(([d, p]) => pen[d] -= p * 1.2);
  const vals = pen.map(p => Math.max(4, Math.min(100, 100 + p)));
  const score = Math.round(vals.reduce((a, v, i) => a + v * W[i] / sum, 0));
  return { score, vals };
}
function edOpening() {
  const task = (ED.text.split(/\n/)[0] || '').replace(/^\d+[\.\、\s]+/, '').replace(/^接.*?调度令[:：]?/, '').trim() || '本次操作任务';
  const T = { '沉稳': ['今天我们有一项操作任务：', '开始前先完成三审、着装互检和风险分析，逐条确认。'], '亲和': ['我们一起来完成今天的操作任务：', '别急，先把三审、着装互检和风险分析过一遍，有不清楚的随时问我。'], '严格': ['本次操作任务：', '三审、着装互检、风险分析缺一项不得开始。每一项唱票复诵到位，出错即记。'] }[ED.tone] || ['', ''];
  const R = { '监护人': '任玲玲，', '值班调度员': '110kV仿真站，我是中调值班调度员。', '值班负责人': '任玲玲、陈志远，我是值班负责人。', '客户': '你好，我是这次停电施工的现场客户代表。' }[ED.role] || '';
  return `${R}${T[0]}${task}。${T[1]}`;
}
function pageEditor() {
  const tabs = [['role', '角色设定'], ['steps', '剧本步骤'], ['score', '评分规则'], ['kb', '知识库挂载'], ['pub', '已发布']];
  const custom = lsGet(LS_COACHES, []);
  let body = '';
  if (ED.tab === 'role') body = `<div class="edrole">
    <div class="frm edfrm">
      <label>教练名称<input id="ed_name" value="${ED.name}"></label>
      <label>扮演角色<select id="ed_role">${['监护人', '值班调度员', '值班负责人', '客户'].map(r => `<option ${ED.role === r ? 'selected' : ''}>${r}</option>`).join('')}</select></label>
      <label>形象（${COACHES.length} 位）<div class="avpick">${COACHES.map(c => `<figure class="${ED.avatar === c.id ? 'on' : ''}" data-avatar="${c.id}" title="${c.n}"><img src="${COACH_IMGS[c.id] || ''}" alt="${c.n}"><figcaption>${c.n.replace(/ · .*$/, '')}</figcaption></figure>`).join('')}</div></label>
      <label>语气<div class="seg">${['沉稳', '亲和', '严格'].map(t => `<span class="${ED.tone === t ? 'on' : ''}" data-tone="${t}">${t}</span>`).join('')}</div></label>
      <label>开场白<textarea id="ed_open" rows="3">${ED.opening}</textarea></label>
      <div class="rvact"><button class="btn" data-ed="genopen">按角色与语气生成开场白</button><button class="btn pri" data-ed="listen">试听开场白</button></div>
    </div>
    <div class="edprev"><div class="hch" style="padding:0 0 8px"><b>数字人预览</b><span>形象 · 语气 · 开场白 即时生效</span></div>
      <div class="edpav" id="ed_pav"></div>
      <div class="edname"><b>${ED.name}</b><span>AI数字人陪练教练 · ${ED.role}</span></div>
      <div class="edcap" id="ed_cap">点「试听开场白」，数字人按当前设定开口。</div></div></div>`;
  else if (ED.tab === 'steps') body = `<div class="edsteps">
      <div class="edsrc"><div class="hch" style="padding:0 0 6px"><b>操作票原文</b><span>粘贴票面文本，每行一项</span></div>
        <textarea id="ed_text" rows="17">${ED.text}</textarea>
        <div class="rvact"><button class="btn pri" data-ed="gen">生成剧本</button><button class="btn" data-ed="sample">载入样例票</button><span class="tk3" id="ed_prog"></span></div></div>
      <div class="edout"><div class="hch" style="padding:0 0 6px"><b>剧本草稿</b><em class="ai">AI 解析</em><span>${ED.steps ? `${ED.steps.length} 项 · 判定点 ${ED.steps.reduce((a, s) => a + s.judge.length, 0)} · 红线 ${ED.steps.filter(s => s.red).length} · 已校核 ${ED.steps.filter(s => s.ok).length}` : '待生成'}</span></div>
        ${ED.steps ? `<table class="htbl edtbl"><tr><th>序</th><th>票面</th><th>动作</th><th>作业位置</th><th>判定点</th><th>依据</th><th>校核</th><th></th></tr>
          ${ED.steps.map((s, i) => `<tr class="erow ${s.red ? 'red' : ''}" data-erow="${i}"><td class="mono">${s.no}</td><td>${s.t}</td><td><i class="ctag">${s.an}</i></td><td contenteditable="true" class="edcell" data-edloc="${i}">${s.loc}</td><td>${s.judge.map(j => `<span class="jchip ${/红线/.test(j) ? 'rl' : ''}">${j}</span>`).join('')}</td><td class="mono tk3">${s.cite}</td><td><input type="checkbox" data-edok="${i}" ${s.ok ? 'checked' : ''}></td>
            <td class="edtools"><button data-edmv="${i},-1" title="上移">↑</button><button data-edmv="${i},1" title="下移">↓</button><button data-edred="${i}" class="${s.red ? 'on' : ''}" title="设为红线项">红线</button><button data-eddel="${i}" title="删除">✕</button></td></tr>`).join('')}</table>
          ${ED.lint ? `<div class="edlint">${ED.lint.map(l => `<div class="hrow"><span class="tag ${l.lv}">${l.lv === 'rl' ? '红线' : l.lv === 'wn' ? '提醒' : '通过'}</span>${l.t}${l.cite ? `<i class="cite">${l.cite}</i>` : ''}</div>`).join('')}</div>` : ''}
          <div class="rvact"><button class="btn" data-ed="lint">一致性检查</button><button class="btn" data-ed="rehearse">剧本试演</button><button class="btn" data-ed="okall">全部校核通过</button><button class="btn pri" data-ed="publish" ${ED.steps.every(s => s.ok) ? '' : 'disabled'}>发布为新教练</button></div>`
          : '<div class="edempty">粘贴操作票后点「生成剧本」，系统按票面逐项解析动作类型、作业位置、判定点与依据条款；随后可逐项校核、调整顺序、标记红线，并做一致性检查与试演。</div>'}</div></div>`;
  else if (ED.tab === 'score') { const sm = edSample(); body = `<div class="edscore"><div class="frm edfrm">
      <div class="hch" style="padding:0 0 6px"><b>六维权重</b><span>合计 <b id="ed_wsum">${ED.weights.reduce((a, b) => a + b, 0)}</b></span><span class="phr chips">${Object.keys(ED_TPL).map(k => `<span class="chip" data-edtpl="${k}">${ED_TPL[k].n}模板</span>`).join('')}<span class="chip" data-ed="norm">归一到 100</span></span></div>
      ${DIMS6.map((d, i) => `<label class="wrow">${d}<input type="range" min="0" max="40" value="${ED.weights[i]}" data-w="${i}"><b class="mono">${ED.weights[i]}</b></label>`).join('')}
      <div class="hch" style="padding:10px 0 6px"><b>红线（一票否决）</b><span>${ED.reds.filter(Boolean).length}/6 启用</span></div>
      <div class="redlist">${RED_NAMES.map((r, i) => `<label class="tog ${ED.reds[i] ? 'on' : ''}" data-red="${i}"><i></i>${r}</label>`).join('')}</div>
      <div class="hch" style="padding:10px 0 6px"><b>提示扣分</b><span>三级递进 · 留痕不阻断</span></div>
      <div class="hrow">方向提示 −${ED.hintCost[0]} · 要点提示 −${ED.hintCost[1]} · 标准答案 −${ED.hintCost[2]}</div></div>
    <div class="edsample" id="ed_sample"><div class="hch" style="padding:0 0 8px"><b>示例场次试算</b><span>拖动权重即时重算</span></div>
      <div class="rvbig" id="ed_sscore" style="font-size:44px">${sm.score}</div><div class="tk3">示例扣分：${ED_SAMPLE_VIO.map(v => `${DIMS6[v[0]]} −${v[1]}（${v[2]}）`).join('；')}</div>
      <div id="ed_sbars">${miniBars(sm.vals.map(Math.round))}</div></div></div>`; }
  else if (ED.tab === 'kb') body = `<div class="frm edfrm">
      <div class="hch" style="padding:0 0 6px"><b>知识主题</b><span>${ED.kb.length}/${KNOW.length} 已挂载</span></div>
      <div class="kblist">${KNOW.map(k => `<label class="tog ${ED.kb.includes(k.id) ? 'on' : ''}" data-kb="${k.id}"><i></i>${k.t}<span>${k.sub}</span></label>`).join('')}</div>
      <div class="hch" style="padding:12px 0 6px"><b>检索测试</b><span>按挂载的知识库回答，与陪练舱「问教练」同一检索</span></div>
      <div class="kbq"><input id="ed_q" data-kbq="1" placeholder="例如：GIS 刀闸要核对哪四项" value="${ED.kbq}"><div id="ed_kbr" class="kbr">${ED.kbq ? kbAnswer(ED.kbq) : '<span class="tk3">输入问题即时检索。</span>'}</div></div>
      <div class="hch" style="padding:12px 0 6px"><b>规程与素材</b><span>${KB_FILES.length + ED.files.length} 份</span><span class="phr"><label class="btn sm" style="cursor:pointer">上传规程文本<input type="file" id="ed_file" accept=".txt,.md,.csv" hidden></label></span></div>
      <table class="htbl"><tr><th>文件</th><th>解析状态</th></tr>${ED.files.map(f => `<tr><td>${f[0]}</td><td class="tk3">${f[1]}</td></tr>`).join('')}${KB_FILES.map(f => `<tr><td>${f[0]}</td><td class="tk3">${f[1]}</td></tr>`).join('')}</table></div>`;
  else body = `<div class="frm edfrm">
      <div class="hch" style="padding:0 0 6px"><b>已发布教练</b><span>${custom.length} 个 · 待班组长审核开通</span></div>
      ${custom.length ? `<table class="htbl"><tr><th>教练</th><th>形象</th><th>步骤</th><th>红线</th><th>发布时间</th><th></th></tr>${custom.map(c => `<tr><td><b>${c.n}</b></td><td><img class="cav" style="width:32px;height:32px" src="${COACH_IMGS[c.avatar] || ''}" alt=""></td><td class="mono">${c.steps}</td><td class="mono">${c.reds}</td><td class="mono">${new Date(c.ts).toLocaleString('zh-CN', { hour12: false }).slice(0, 16)}</td><td><button class="btn sm" data-edload="${c.id}">载入编辑</button> <button class="btn sm" data-edoff="${c.id}">下架</button></td></tr>`).join('')}</table>` : '<div class="edempty">尚未发布自建教练。在「剧本步骤」生成并校核后发布。</div>'}</div>`;
  return `<div class="ppage">
    <div class="ph"><b>教练编辑器</b><span>从一张操作票生成一个新教练 · 已发布 ${custom.length} 个</span></div>
    <div class="tabs">${tabs.map(([k, n]) => `<span class="${ED.tab === k ? 'on' : ''}" data-tab="${k}">${n}</span>`).join('')}</div>
    <section class="hcard hg"><div class="hcb edbody">${body}</div></section>
  </div>`;
}
function kbAnswer(q) {
  if (!q || q.trim().length < 2) return '<span class="tk3">输入问题即时检索。</span>';
  const r = retrieve(q);
  return `<div class="airv" style="font-size:12.5px">${r.text.replace(/\n/g, '<br>')}</div><div class="tk3" style="margin-top:4px">依据：${r.src}</div>`;
}
function edMountPreview() {
  const m = $('#ed_pav'); if (!m) return;
  if (ED.pv) { ED.pv.destroy(); ED.pv = null; }
  const c = COACHES.find(x => x.id === ED.avatar) || COACHES[0];
  ED.pv = new DigitalHuman('ed_pav', { name: ED.name, role: ED.role, img: c.id, tint: '#0e8f5a' });
}
function edListen() {
  if (!ED.pv) edMountPreview();
  const op = $('#ed_open'); if (op) ED.opening = op.value;
  const cap = $('#ed_cap'); if (cap) typeInto(cap, ED.opening);
  ED.pv.speak(ED.opening, { pose: 'explain', rate: 0.115 });
  setTimeout(() => { if (ED.pv) ED.pv.nod(1); }, 600);
}
function edRehearse() {
  if (!ED.steps || !ED.steps.length) return toast('先生成剧本', 'bad');
  let i = 0; const c = COACHES.find(x => x.id === ED.avatar) || COACHES[0];
  const m = openDrill(`剧本试演 · ${ED.name}`, `${ED.steps.length} 项 · 监护人唱票 → 判定点`, '<div id="rh_body"></div>', '<button class="btn" data-rh="-1">上一项</button><button class="btn pri" data-rh="1">下一项</button>');
  const paint = () => {
    const s = ED.steps[i];
    const call = s.act === 'recv' ? `现在调度下令：${s.t.replace(/^接.*?调度令[:：]?/, '')}。` : s.act === 'report' ? `${s.t}。` : `第${s.no}项，${s.t}。`;
    $('#rh_body').innerHTML = `<div class="rh"><div class="rhav"><div id="rh_pav" class="edpav sm"></div><div class="tk3" style="text-align:center">${s.act === 'recv' ? '值班调度员' : ED.role} · ${ED.tone}</div></div>
      <div class="rhb"><div class="hbar"><div class="hfill" style="width:${Math.round((i + 1) / ED.steps.length * 100)}%"></div></div>
        <div class="tk3" style="margin:6px 0">第 ${i + 1}/${ED.steps.length} 项 · ${s.an} · ${s.loc}</div>
        <div class="rhcall">${call}</div>
        <div class="tk3">操作人应：手指「${s.t.replace(/^(拉开|合上|断开|检查|核对)/, '').slice(0, 18)}」并复诵 → 监护人「对，执行」→ 执行 → 检查回报</div>
        <div class="rvtags" style="margin-top:8px">${s.judge.map(j => `<i class="${/红线/.test(j) ? 'bad' : 'ok'}">${j}</i>`).join('')}</div>
        <div class="tk3" style="margin-top:6px">依据 ${s.cite}</div></div></div>`;
    if (ED.rh) ED.rh.destroy();
    ED.rh = new DigitalHuman('rh_pav', { name: ED.name, role: ED.role, img: s.act === 'recv' ? 'term' : c.id, tint: '#0e8f5a' });
    ED.rh.speak(call, { pose: s.act === 'recv' ? 'explain' : 'call' });
  };
  m.addEventListener('click', e => { const n = e.target.closest('[data-rh]'); if (!n) return; i = Math.max(0, Math.min(ED.steps.length - 1, i + (+n.dataset.rh))); paint(); });
  paint();
}
function editorGen() {
  const ta = $('#ed_text'); if (ta) ED.text = ta.value;
  ED.steps = parseTicket(ED.text).map(s => Object.assign(s, { ok: false })); ED.lint = null;
  rerender('editor');
  const rows = $$('.erow'); const prog = $('#ed_prog');
  rows.forEach((r, i) => { r.classList.add('pre'); setTimeout(() => { r.classList.remove('pre'); r.classList.add('in'); if (prog) prog.textContent = `解析中 ${i + 1}/${rows.length}`; if (i === rows.length - 1 && prog) setTimeout(() => prog.textContent = `解析完成 · ${rows.length} 项`, 200); }, 120 * i + 80); });
}
function editorPublish() {
  const nm = ED.name.trim() || '自建教练';
  const list = lsGet(LS_COACHES, []);
  list.unshift({ id: 'c' + Date.now(), n: nm, fam: '变电运行', dom: '倒闸操作', steps: ED.steps.length, reds: ED.steps.filter(s => s.red).length, avatar: ED.avatar, role: ED.role, tone: ED.tone, text: ED.text, ts: Date.now() });
  lsSet(LS_COACHES, list.slice(0, 10));
  toast(`已发布「${nm}」，教练中心可见，待班组长审核开通`, 'ok');
  goPage('plaza');
}
function customCoaches() {
  return lsGet(LS_COACHES, []).map(c => ({ id: c.id, n: c.n, fam: c.fam, dom: c.dom, open: false, custom: true, lvl: 2, min: Math.max(10, Math.round(c.steps * 1.6)), users: 0, gain: 0, tags: ['唱票复诵', '设备状态核对'], desc: `由教练编辑器发布 · ${c.steps} 项操作票 · 红线 ${c.reds} 条 · 待班组长审核开通`, avatar: c.avatar }));
}
function edSyncForm() {
  const ta = $('#ed_text'); if (ta) ED.text = ta.value;
  const nm = $('#ed_name'); if (nm) ED.name = nm.value;
  const op = $('#ed_open'); if (op) ED.opening = op.value;
  const rl = $('#ed_role'); if (rl) ED.role = rl.value;
  $$('[data-edloc]').forEach(n => { if (ED.steps && ED.steps[+n.dataset.edloc]) ED.steps[+n.dataset.edloc].loc = n.textContent.trim(); });
}

/* ---------------- 页面渲染后的挂载（数字人预览、文件上传） ---------------- */
function pageAfter(h) {
  if (ED.pv && h !== 'editor') { ED.pv.destroy(); ED.pv = null; }
  if (h === 'editor') {
    if (ED.tab === 'role') edMountPreview();
    const f = $('#ed_file'); if (f) f.onchange = () => {
      const file = f.files[0]; if (!file) return;
      const rd = new FileReader();
      rd.onload = () => { const n = String(rd.result || '').split(/\n+/).filter(l => l.trim()).length; ED.files.unshift([file.name, `已解析 · ${n} 段`]); toast(`「${file.name}」已解析 ${n} 段，挂载到知识库`, 'ok'); rerender('editor'); };
      rd.readAsText(file);
    };
    const rl = $('#ed_role'); if (rl) rl.onchange = () => { ED.role = rl.value; const nm = $('.edname span'); if (nm) nm.textContent = 'AI数字人陪练教练 · ' + ED.role; };
  }
  if (h === 'review' && RV.play) { clearInterval(RV.play); RV.play = null; }
}

/* ================= 角色切换（学员 ⇄ 班组长） ================= */
function renderRole() {
  const u = ROLE.cur === 'lead' ? LEAD_USER : HOME_USER;
  const chip = $('.uchip'); if (chip) chip.innerHTML = `<i>${u.name.slice(0, 1)}</i>${u.name} · ${ROLE.cur === 'lead' ? '班组长' : u.team}<em>切换</em>`;
  $$('#hnav .hnavi.lk').forEach(n => n.classList.toggle('unlocked', ROLE.cur === 'lead'));
}
function toggleRole() {
  ROLE.cur = ROLE.cur === 'lead' ? 'student' : 'lead';
  renderRole();
  toast(ROLE.cur === 'lead' ? `已切换为班组长 ${LEAD_USER.name} 视角` : `已切换为学员 ${HOME_USER.name} 视角`);
  const h = (location.hash || '').replace('#', '');
  if (ROLE.cur === 'student' && (h === 'team' || h === 'editor')) goPage('home');
  else if (ROLE.cur === 'lead' && h === 'home') goPage('team');
}

/* ================= 页面内点击（在 bindHPage 之前拦截） ================= */
function pagesClick(e) {
  const q = s => e.target.closest(s); let n;
  /* 复盘 */
  if (n = q('[data-sess]')) { RV.sel = n.dataset.sess; if (location.hash === '#review') rerender('review'); else goPage('review'); return true; }
  if (n = q('[data-rvf]')) { RV.filter = n.dataset.rvf; rerender('review'); return true; }
  if (n = q('[data-rvcmp]')) { RV.cmp = n.dataset.rvcmp; rerender('review'); return true; }
  if (n = q('[data-rvplay]')) { rvPlay(); return true; }
  if (n = q('[data-tlstep]')) { const all = unifySessions(), s = all.find(x => x.id === RV.sel); RV.tlCur = n.dataset.tlstep; $$('#rvtl .tlx').forEach(x => x.classList.toggle('cur', x === n)); const t = $('#rvtl_txt'); if (t && s) t.innerHTML = rvStepInfo(s, RV.tlCur); return true; }
  if (n = q('[data-follow]')) { const i = n.dataset.follow; RV.follow[i] = RV.follow[i] ? null : 'open'; rerender('review'); const inp = $(`[data-followin="${i}"]`); if (inp) inp.focus(); return true; }
  if (n = q('[data-rvact]')) { const st = lsGet(LS_ACTS, {}); st[RV.sel] = st[RV.sel] || {}; st[RV.sel]['a' + n.dataset.rvact] = n.checked; lsSet(LS_ACTS, st); const lab = n.closest('.actit'); if (lab) lab.classList.toggle('done', n.checked); const h = n.closest('.hcard').querySelector('.hch span'); if (h) h.textContent = `由本场留痕生成 · 已完成 ${Object.values(st[RV.sel]).filter(Boolean).length}/${n.closest('.hcb').querySelectorAll('.actit').length}`; return true; }
  if (n = q('[data-rvsum]')) { const all = unifySessions(), i = all.findIndex(x => x.id === RV.sel); openDrill('复盘摘要', '提交带教师傅前由本人确认', `<div class="draft" id="rvsum_txt" style="white-space:pre-line">${rvSummary(all[i], all[i + 1])}</div>`, '<button class="btn" data-copy="rvsum_txt">复制摘要</button>'); return true; }
  if (n = q('[data-copy]')) { const t = $('#' + n.dataset.copy); const txt = t ? t.innerText : ''; try { navigator.clipboard.writeText(txt); } catch (err) { } n.textContent = '已复制'; return true; }
  if (n = q('[data-retry]')) { const all = unifySessions(), s = all.find(x => x.id === n.dataset.retry); if (s) { lsSet('xwt_lastvio', s.vio.map(v => ({ step: v.step, title: v.t }))); enterCoach('daozha', 'wrong'); } return true; }
  /* 档案 */
  if (n = q('[data-gcmp]')) { GR.cmp = n.dataset.gcmp; $$('[data-gcmp]').forEach(x => x.classList.toggle('on', x === n)); const g = $('#gradar'); if (g) g.innerHTML = growthRadar(); return true; }
  if (n = q('[data-gshow]')) { const k = n.dataset.gshow; GR.show[k] = !GR.show[k]; n.classList.toggle('on', GR.show[k]); const c = $('#gcurve'); if (c) c.innerHTML = chSessionCurve(unifySessions().slice().sort((a, b) => b.d - a.d), GR.show, { w: 980, h: 250 }); return true; }
  if (n = q('[data-gdim]')) { growthDim(+n.dataset.gdim); return true; }
  if (n = q('[data-badge]')) { badgeDrill(n.dataset.badge); return true; }
  if (n = q('[data-print]')) { window.print(); return true; }
  if (n = q('[data-lmap]')) { const k = KNOW.find(x => x.id === n.dataset.lmap); const m = LMAP_MASTERY[k.id]; openDrill(`知识主题 · ${k.t}`, `${k.sub} · 掌握度 ${m}`, `<div class="sec"><div class="st">知识点</div><div class="sc">${k.body.map(b => `<div class="hrow"><b>${b[0]}</b><div class="tk3" style="white-space:pre-line">${b[1]}</div></div>`).join('')}</div></div>`, `<button class="btn" data-quizk="${k.t}">测 6 题</button><button class="btn pri" data-train="${LMAP_PLAN[k.id] || 'full'}">去练相关内容</button>`); return true; }
  if (n = q('[data-quizk]')) { $$('.mask').forEach(m => m.remove()); CL.quiz = null; goPage('classroom'); setTimeout(() => { quizStart(n.dataset.quizk); const b = $('#quizbox'); if (b) b.scrollIntoView({ block: 'center' }); }, 120); return true; }
  /* 课堂 */
  if (n = q('[data-arch]')) { archDrill(n.dataset.arch); return true; }
  if (n = q('[data-sync]')) { syncNow(); return true; }
  if (n = q('[data-ctag]')) { CL.tag = n.dataset.ctag; rerender('classroom'); return true; }
  if (n = q('[data-course]')) { courseDrill(n.dataset.course); return true; }
  if (n = q('[data-cnext]')) { courseNext(n.dataset.cnext); return true; }
  if (n = q('[data-quiz]')) { quizStart(n.dataset.quiz); return true; }
  if (n = q('[data-qopt]')) { quizAnswer(+n.dataset.qopt); return true; }
  if (n = q('[data-qnext]')) { quizNext(); return true; }
  if (n = q('[data-qretry]')) { const t = CL.quiz ? CL.quiz.topic : '全部'; quizStart(t); return true; }
  if (n = q('[data-lplan]')) { planGen(); return true; }
  if (n = q('[data-lplansave]')) { const p = CL.plan || lsGet(LS_PLAN, null); if (p) { p.saved = true; CL.plan = p; lsSet(LS_PLAN, p); } toast('本周计划已加入日程，每日待练任务将按计划提醒', 'ok'); rerender('classroom'); return true; }
  /* 班组 */
  if (n = q('[data-member]')) { memberDrill(+n.dataset.member); return true; }
  if (n = q('[data-remind]')) { remindDraft(); return true; }
  if (n = q('[data-tasksend]')) { taskSend(n.dataset.tasksend); return true; }
  /* 编辑器 */
  if (n = q('[data-tab]')) { edSyncForm(); ED.tab = n.dataset.tab; rerender('editor'); return true; }
  if (n = q('[data-ed]')) {
    const a = n.dataset.ed; edSyncForm();
    if (a === 'gen') editorGen();
    else if (a === 'sample') { ED.text = SAMPLE_TICKET; rerender('editor'); }
    else if (a === 'okall') { ED.steps.forEach(s => s.ok = true); rerender('editor'); }
    else if (a === 'publish') editorPublish();
    else if (a === 'lint') { ED.lint = lintSteps(ED.steps); rerender('editor'); }
    else if (a === 'rehearse') edRehearse();
    else if (a === 'listen') edListen();
    else if (a === 'genopen') { ED.opening = edOpening(); const op = $('#ed_open'); if (op) { op.value = ''; let i = 0; const t = setInterval(() => { i += 2; op.value = ED.opening.slice(0, i); if (i >= ED.opening.length) clearInterval(t); }, 22); } }
    else if (a === 'norm') { const s = ED.weights.reduce((x, y) => x + y, 0) || 1; ED.weights = ED.weights.map(w => Math.round(w / s * 100)); const d = 100 - ED.weights.reduce((x, y) => x + y, 0); ED.weights[0] += d; rerender('editor'); }
    return true;
  }
  if (n = q('[data-edtpl]')) { const t = ED_TPL[n.dataset.edtpl]; ED.weights = t.w.slice(); ED.reds = t.reds.map(Boolean); ED.hintCost = t.hint.slice(); rerender('editor'); toast(`已套用「${t.n}」模板`); return true; }
  if (n = q('[data-edok]')) { ED.steps[+n.dataset.edok].ok = n.checked; const pb = $('[data-ed="publish"]'); if (pb) pb.disabled = !ED.steps.every(s => s.ok); return true; }
  if (n = q('[data-edmv]')) { edSyncForm(); const [i, d] = n.dataset.edmv.split(',').map(Number); const j = i + d; if (j < 0 || j >= ED.steps.length) return true; [ED.steps[i], ED.steps[j]] = [ED.steps[j], ED.steps[i]]; ED.steps.forEach((s, k) => s.no = k + 1); rerender('editor'); return true; }
  if (n = q('[data-edred]')) { edSyncForm(); const s = ED.steps[+n.dataset.edred]; s.red = !s.red; if (s.red && !s.judge.some(j => /红线/.test(j))) s.judge.unshift('红线：本项错误一票否决'); if (!s.red) s.judge = s.judge.filter(j => !/^红线：本项/.test(j)); rerender('editor'); return true; }
  if (n = q('[data-eddel]')) { edSyncForm(); ED.steps.splice(+n.dataset.eddel, 1); ED.steps.forEach((s, k) => s.no = k + 1); rerender('editor'); return true; }
  if (n = q('[data-edoff]')) { lsSet(LS_COACHES, lsGet(LS_COACHES, []).filter(c => c.id !== n.dataset.edoff)); toast('已下架'); rerender('editor'); return true; }
  if (n = q('[data-edload]')) { const c = lsGet(LS_COACHES, []).find(x => x.id === n.dataset.edload); if (c) { ED.name = c.n; ED.avatar = c.avatar; ED.role = c.role || ED.role; ED.tone = c.tone || ED.tone; if (c.text) { ED.text = c.text; ED.steps = parseTicket(c.text).map(s => Object.assign(s, { ok: true })); } ED.tab = 'steps'; rerender('editor'); toast(`已载入「${c.n}」`); } return true; }
  if (n = q('[data-avatar]')) { ED.avatar = n.dataset.avatar; $$('.avpick figure').forEach(i => i.classList.toggle('on', i === n)); edMountPreview(); return true; }
  if (n = q('[data-tone]')) { ED.tone = n.dataset.tone; $$('.seg span').forEach(i => i.classList.toggle('on', i === n)); return true; }
  if (n = q('[data-red]')) { const i = +n.dataset.red; ED.reds[i] = !ED.reds[i]; rerender('editor'); return true; }
  if (n = q('[data-kb]')) { const k = n.dataset.kb; ED.kb = ED.kb.includes(k) ? ED.kb.filter(x => x !== k) : ED.kb.concat(k); rerender('editor'); return true; }
  return false;
}
function pagesInput(e) {
  let n;
  if (n = e.target.closest('[data-w]')) {
    ED.weights[+n.dataset.w] = +n.value; n.nextElementSibling.textContent = n.value;
    const h = $('#ed_wsum'); if (h) h.textContent = ED.weights.reduce((a, b) => a + b, 0);
    const sm = edSample(); const sc = $('#ed_sscore'); if (sc) sc.textContent = sm.score; const sb = $('#ed_sbars'); if (sb) sb.innerHTML = miniBars(sm.vals.map(Math.round));
    return;
  }
  if (n = e.target.closest('[data-goal]')) {
    const i = +n.dataset.goal, g = goalsGet(); if (n.value === '') delete g[i]; else g[i] = Math.max(0, Math.min(100, +n.value)); lsSet(LS_GOALS, g);
    const gap = $('#ggap' + i); if (gap) { const v = g[i]; gap.textContent = v != null ? (RADAR10_NOW[i] >= v ? '已达成' : RADAR10_NOW[i] - v) : '—'; gap.className = 'mono ' + (v != null ? (RADAR10_NOW[i] >= v ? 'gv' : 'wv') : ''); }
    const r = $('#gradar'); if (r) r.innerHTML = growthRadar();
    return;
  }
  if (n = e.target.closest('[data-followin]')) {
    const i = n.dataset.followin, all = unifySessions(), s = all.find(x => x.id === RV.sel); const l = s && (s.lines || [])[+i]; if (!l) return;
    const pct = Math.round(sim(n.value, l.std) * 100), miss = missingSegs(n.value, l.std).slice(0, 3);
    const m = $('#fm_' + i); if (!m) return;
    if (pct >= 86) { RV.follow[i] = 'pass'; n.closest('.tlrow').classList.add('pass'); m.innerHTML = `<b class="gv">吻合度 ${pct}% · 通过 ✓</b>`; }
    else m.innerHTML = `吻合度 <b class="${pct >= 62 ? 'wv' : 'bad'}">${pct}%</b>${miss.length ? ' · 还缺 ' + miss.map(x => `<em>${x}</em>`).join('') : ''}`;
    return;
  }
  if (n = e.target.closest('[data-clq]')) { CL.q = n.value.trim(); const pos = n.selectionStart; rerender('classroom'); const q2 = $('#cl_q'); if (q2) { q2.focus(); q2.setSelectionRange(pos, pos); } return; }
  if (n = e.target.closest('[data-kbq]')) { ED.kbq = n.value; const r = $('#ed_kbr'); if (r) r.innerHTML = kbAnswer(ED.kbq); return; }
}
