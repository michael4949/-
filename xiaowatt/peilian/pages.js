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
const RV = { sel: null };
function pageReview() {
  const all = unifySessions();
  if (!RV.sel || !all.find(x => x.id === RV.sel)) RV.sel = all[0].id;
  const idx = all.findIndex(x => x.id === RV.sel), s = all[idx], prev = all[idx + 1];
  const A = homeAgg();
  const red = s.vio.some(v => v.lv === 'red');
  const tagOf = v => `<span class="tag ${v.lv === 'red' ? 'rl' : v.lv === 'major' ? 'wn' : ''}">${v.lv === 'red' ? '一票否决' : v.lv === 'major' ? '严重' : '不规范'}</span>`;
  const stepOf = no => STEPS.find(x => x.no === String(no));
  const weakDims = DIMS6.map((n, i) => [n, s.dims[i]]).filter(x => x[1] < 75).map(x => x[0]);
  const courses = COURSES.filter(c => weakDims.includes(c.tag));
  const lines = s.lines || [];
  return `<div class="ppage">
    <div class="ph"><b>评分复盘</b><span>近30天 ${A.cnt + all.filter(x => x.real).length} 场 · 平均 ${A.avg} 分 · 记录由陪练舱自动留痕</span></div>
    <div class="rvwrap">
      <aside class="rvlist hcard">
        <div class="hch"><b>场次记录</b><span>${all.length} 场</span></div>
        ${all.map(x => `<div class="rvit ${x.id === RV.sel ? 'on' : ''}" data-sess="${x.id}">
          <div class="rv1"><span class="mono">${x.real ? '今天' : dayLabel(x.d)}</span>${x.real ? '<i class="rvloc">本机</i>' : ''}<b class="mono ${x.score < 75 ? 'wv' : 'gv'}">${x.score}</b></div>
          <div class="rv2">${x.plan}</div><div class="rv3">${x.mode} · ${x.dur} 分钟 · 扣分 ${x.vio.length}</div></div>`).join('')}
      </aside>
      <main class="rvmain">
        <section class="hcard rvhead">
          <div class="rvscore"><div class="rvbig ${red ? 'wv' : ''}">${s.score}</div><div class="tk3">综合得分 · ${red ? '触发一票否决' : s.mode}</div>
            <div class="rvkpis"><span><b>${s.dur}</b>分钟</span><span><b>${s.vio.length}</b>扣分项</span><span><b>${(s.hints || []).length}</b>提示</span><span><b>${s.vio.filter(v => v.lv === 'red').length}</b>红线</span></div>
            <div class="rvtags">${DIMS6.map((t, i) => `<i class="${s.dims[i] > 80 ? 'ok' : s.dims[i] > 55 ? 'wn' : 'bad'}">${t} ${s.dims[i] > 80 ? '达标' : s.dims[i] > 55 ? '待提升' : '短板'}</i>`).join('')}</div></div>
          <div class="rvradar">${chRadar(DIMS6, s.dims, prev ? prev.dims : RADAR_PREV, { w: 330, h: 250, l1: '本场', l2: '上一场' })}<div class="tk3" style="text-align:center">本场 vs 上一场</div></div>
        </section>
        <section class="hcard"><div class="hch"><b>AI 复盘</b><span>由本场留痕数据生成</span></div>
          <div class="hcb"><div class="airv">${aiReview(s, prev)}</div></div></section>
        <section class="hcard"><div class="hch"><b>逐句回放</b><span>我的复诵/回报 vs 票面标准话术 · <i class="dm">漏说</i> <i class="dx">说错/多说</i></span></div>
          <div class="hcb">${lines.length ? `<div class="tl">${lines.map(l => `<div class="tlrow">
              <div class="tlk"><b class="mono">第${l.step}项</b><span>${l.beat === 1 ? '复诵' : '回报'}</span><em class="mono ${simPct(l.mine, l.std) < 86 ? 'wv' : 'gv'}">${simPct(l.mine, l.std)}%</em></div>
              <div class="tlb"><div class="tlt">${l.t || ''}</div><div class="tlme">我说：${diffHtml(l.mine, l.std)}</div><div class="tlstd">标准：${l.std}</div></div></div>`).join('')}</div>` : '<div class="tk3">本场无逐句记录。</div>'}</div></section>
        <section class="hcard"><div class="hch"><b>错误卡</b><span>错在哪 · 依据 · 正确做法</span></div>
          <div class="hcb">${s.vio.length ? `<div class="errgrid">${s.vio.map(v => { const st = stepOf(v.step); return `<div class="errc ${v.lv}">
              <div class="err1">${tagOf(v)}<b>第${v.step}项</b><span>${st ? st.ticket : ''}</span></div>
              <div class="err2"><label>错在哪</label>${v.t}</div>
              <div class="err2"><label>依据</label><span class="mono">${v.cite || ''}</span>${st && st.rule ? `<div class="errq">${st.rule}</div>` : ''}</div>
              <div class="err2"><label>正确做法</label>${st ? (st.recite || st.report || '按票面执行') : '按票面执行'}</div>
            </div>`; }).join('')}</div>
            <div class="rvact"><button class="btn pri" data-retry="${s.id}">错题重练（${s.vio.length} 项）</button><button class="btn" data-train="${planId(s.plan)}">重练该方式</button></div>`
            : '<div class="tk3">本场未触发扣分项。</div>'}</div></section>
        <div class="gtwo">
          <section class="hcard"><div class="hch"><b>提示与加分</b><span>留痕不阻断</span></div><div class="hcb">
            ${(s.hints || []).map(h => `<div class="hrow hint">提示 · ${h[0]} · ${h[1]}</div>`).join('') || '<div class="hrow">本场未使用提示。</div>'}
            ${(s.praise || []).map(p => `<div class="hrow"><span class="tag ok">加分</span> ${p.title || p}</div>`).join('')}</div></section>
          <section class="hcard"><div class="hch"><b>下一步建议</b><span>专项 + 课程（知识课堂供给）</span></div><div class="hcb">
            ${weakDims.map(d => DIM_PLAN[d] ? `<div class="hrow"><button class="btn" data-train="${DIM_PLAN[d][0]}" style="padding:5px 11px">练「${DIM_PLAN[d][1]}」专项</button> <span class="tk3">针对「${d}」</span></div>` : '').join('')}
            ${courses.map(c => `<div class="hrow">课程 · ${c.n} <span class="tk3">${c.h} 学时 · ${c.tag}</span></div>`).join('') || '<div class="hrow">各维度均达标，建议进入考核模式。</div>'}
            <div class="hrow"><button class="btn" data-go="growth" style="padding:5px 11px">查看成长档案</button></div></div></section>
        </div>
      </main>
    </div></div>`;
}

/* ================= 成长档案 ================= */
const LMAP_MASTERY = { state: 92, sanshen: 88, wufang: 85, changpiao: 90, yandian: 74, gis: 58, erci: 80, yichang: 70, diaodu: 76 };
const LMAP_PLAN = { gis: 'sp_gis', yandian: 'sp_vd', diaodu: 'sp_ord', sanshen: 'sp_ord', changpiao: 'p1', yichang: 'full', erci: 'p3', wufang: 'full', state: 'p1' };
function scoreCurve() {
  const pts = SESSIONS.slice().reverse();
  const W = 640, H = 150, pl = 30, pr = 12, pt = 16, pb = 26, iw = W - pl - pr, ih = H - pt - pb;
  const X = i => pl + iw * i / (pts.length - 1), Y = v => pt + ih - ih * (v - 50) / 50;
  const line = pts.map((s, i) => `${X(i)},${Y(s.score)}`).join(' ');
  return `<svg viewBox="0 0 ${W} ${H}" class="chsvg">
    ${[50, 75, 100].map(v => `<line x1="${pl}" y1="${Y(v)}" x2="${W - pr}" y2="${Y(v)}" stroke="#e9e6d8"/><text x="${pl - 5}" y="${Y(v) + 3}" text-anchor="end" font-size="9" fill="#98a69c">${v}</text>`).join('')}
    <polygon points="${pl},${Y(50)} ${line} ${X(pts.length - 1)},${Y(50)}" fill="rgba(14,143,90,.10)"/>
    <polyline class="anim-line" points="${line}" fill="none" stroke="#0e8f5a" stroke-width="2"/>
    ${pts.map((s, i) => `<g class="hitv" data-tip="${dayLabel(s.d)} · ${s.plan} · ${s.score} 分"><circle cx="${X(i)}" cy="${Y(s.score)}" r="3.6" fill="${s.vio.some(v => v.lv === 'red') ? '#d43a2f' : '#c9a227'}"/>
      <text x="${X(i)}" y="${H - 8}" text-anchor="middle" font-size="9" fill="#98a69c">${dayLabel(s.d)}</text></g>`).join('')}</svg>`;
}
function pageGrowth() {
  const A = homeAgg();
  const done = MILESTONES.filter(m => m.k === 'done').length;
  return `<div class="ppage">
    <div class="ph"><b>成长档案</b><span>${HOME_USER.name} · ${HOME_USER.post} · ${HOME_USER.team}</span></div>
    <section class="hcard gcard"><div class="gav">${HOME_USER.name.slice(0, 1)}</div>
      <div class="gmeta"><b>${HOME_USER.name}</b><span>${HOME_USER.post} · ${HOME_USER.team} · 2024-08 入职 · 带教师傅 陈志远</span></div>
      <div class="gkpis"><div class="kpi"><b>${A.cnt}</b><span>近30天场次</span></div><div class="kpi"><b>${(A.totalMin / 60).toFixed(1)}h</b><span>累计时长</span></div><div class="kpi"><b>${A.avg}</b><span>平均得分</span></div><div class="kpi"><b>${HOME_USER.hours.done}/${HOME_USER.hours.need}</b><span>年度学时</span></div><div class="kpi"><b>${HOME_USER.certs.length}</b><span>有效证书</span></div><div class="kpi good"><b>${done}</b><span>里程碑</span></div></div></section>
    <div class="gtwo">
      <section class="hcard"><div class="hch"><b>能力演进</b><span>本月 vs 上月 · 顶点可查明细</span></div><div class="hcb">${chRadar(DIMS6, RADAR_NOW, RADAR_PREV)}</div></section>
      <section class="hcard"><div class="hch"><b>三期对照</b><span>前月 / 上月 / 本月</span></div><div class="hcb"><table class="htbl"><tr><th>维度</th><th>前月</th><th>上月</th><th>本月</th><th>变化</th></tr>
        ${DIMS6.map((n, i) => `<tr class="hitv" data-dim="${i}"><td>${n}</td><td class="mono">${RADAR_OLD[i]}</td><td class="mono">${RADAR_PREV[i]}</td><td class="mono">${RADAR_NOW[i]}</td><td class="mono ${RADAR_NOW[i] >= RADAR_PREV[i] ? 'gv' : 'wv'}">${RADAR_NOW[i] - RADAR_PREV[i] >= 0 ? '+' : ''}${RADAR_NOW[i] - RADAR_PREV[i]}</td></tr>`).join('')}</table></div></section>
    </div>
    <section class="hcard"><div class="hch"><b>成长曲线</b><span>近30天各场得分 · 红点为触发红线场次</span></div><div class="hcb">${scoreCurve()}</div></section>
    <section class="hcard"><div class="hch"><b>学习地图</b><span>九大知识主题掌握度 · 点亮 = 掌握度 ≥ 75</span></div><div class="hcb">
      <div class="lmap">${KNOW.map(k => { const m = LMAP_MASTERY[k.id] || 0, lit = m >= 75; return `<div class="lmt ${lit ? 'lit' : ''}" data-lmap="${k.id}" data-tip="${k.t} · 掌握度 ${m}">
        <svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="18" fill="none" stroke="#e9e6d8" stroke-width="4"/><circle cx="22" cy="22" r="18" fill="none" stroke="${lit ? '#0e8f5a' : '#c9a227'}" stroke-width="4" stroke-dasharray="${(113 * m / 100).toFixed(1)} 113" transform="rotate(-90 22 22)" stroke-linecap="round"/><text x="22" y="26" text-anchor="middle" font-size="11" font-family="var(--mono)" fill="${lit ? '#0e8f5a' : '#a8821b'}">${m}</text></svg>
        <div><b>${k.t}</b><span>${k.sub}</span></div></div>`; }).join('')}</div></div></section>
    <div class="gtwo">
      <section class="hcard"><div class="hch"><b>晋升通道</b><span>当前 · 变电运行值班员</span></div><div class="hcb"><div class="ladder">
        ${LADDER.map((r, i) => `<div class="rung ${r.cur ? 'cur' : ''}"><div class="rh"><b>${r.post}</b>${r.cur ? '<i>当前</i>' : ''}<span class="mono">${r.met.filter(Boolean).length}/${r.req.length}</span></div>
          <div class="rq">${r.req.map((q, j) => `<span class="${r.met[j] ? 'ok' : ''}">${r.met[j] ? '✓' : '○'} ${q}</span>`).join('')}</div></div>`).join('')}</div>
        <div class="tk3" style="margin-top:8px">晋升资格以人工审核结果为准。</div></div></section>
      <section class="hcard"><div class="hch"><b>成长里程碑</b><span>${done} 项已达成</span></div><div class="hcb"><div class="ms">
        ${MILESTONES.map(m => `<div class="msi ${m.k}"><i></i><span class="mono">${m.d || (m.ago >= 0 ? dayLabel(m.ago) : dateAfter(-m.ago))}</span><b>${m.t}</b></div>`).join('')}</div></div></section>
    </div>
    <div class="gtwo">
      <section class="hcard"><div class="hch"><b>学时记录</b><span>年度 ${HOME_USER.hours.done}/${HOME_USER.hours.need} 学时 · 知识课堂回写</span></div><div class="hcb"><table class="htbl"><tr><th>日期</th><th>内容</th><th>学时</th><th>来源</th></tr>
        ${HOUR_LOG.map(x => `<tr><td class="mono">${dayLabel(x.d)}</td><td>${x.n}</td><td class="mono">${x.h}</td><td>${x.src}</td></tr>`).join('')}</table></div></section>
      <section class="hcard"><div class="hch"><b>资质证书</b><span>${HOME_USER.certs.length} 项有效</span></div><div class="hcb"><table class="htbl"><tr><th>证书</th><th>取得</th><th>复审期限</th><th>状态</th></tr>
        ${HOME_USER.certs.map(c => `<tr><td>${c.n}</td><td class="mono">${c.got}</td><td class="mono">${c.review}</td><td><span class="tag ok">有效</span></td></tr>`).join('')}</table></div></section>
    </div>
    <div class="tk3" style="margin:6px 4px 14px">能力与胜任度数据为系统测算参考，任职资格评定以人工审核结果为准。</div></div>`;
}

/* ================= 知识课堂（供给层接入） ================= */
function archSVG() {
  return `<svg viewBox="0 0 900 300" class="chsvg arch">
    <rect x="20" y="30" width="250" height="240" rx="12" fill="#f4f5ec" stroke="#d9d6c5"/>
    <text x="145" y="58" text-anchor="middle" font-size="13" font-weight="700" fill="#33443a">南网人工智能知识课堂</text><text x="145" y="74" text-anchor="middle" font-size="10" fill="#98a69c">供给层</text>
    ${CLASSROOM.supply.map((s, i) => `<g><rect x="40" y="${88 + i * 44}" width="210" height="34" rx="6" fill="#fff" stroke="#e2dfd0"/><text x="52" y="${109 + i * 44}" font-size="12" fill="#33443a">${s.n}</text><text x="238" y="${109 + i * 44}" text-anchor="end" font-size="11" font-family="var(--mono)" fill="#0e8f5a">${s.v}</text></g>`).join('')}
    <rect x="480" y="30" width="400" height="240" rx="12" fill="#eef6f0" stroke="#0e8f5a" stroke-width="1.6"/>
    <text x="680" y="58" text-anchor="middle" font-size="14" font-weight="700" fill="#0a5c3c">小瓦特·练 AI 智能陪练底座</text><text x="680" y="74" text-anchor="middle" font-size="10" fill="#0e8f5a">主体 · 调用供给数据并回写学时</text>
    ${[['AI 教练中心', 500, 92], ['陪练舱', 700, 92], ['评分复盘', 500, 150], ['成长档案', 700, 150], ['班组看板', 500, 208], ['教练编辑器', 700, 208]].map(([n, x, y]) => `<rect x="${x}" y="${y}" width="180" height="40" rx="6" fill="#fff" stroke="#b5d9c0"/><text x="${x + 90}" y="${y + 25}" text-anchor="middle" font-size="12" fill="#17301f">${n}</text>`).join('')}
    ${CLASSROOM.supply.map((s, i) => { const y = 105 + i * 44; return s.dir === 'in'
      ? `<path d="M250,${y} C360,${y} 380,${140} 480,${140}" class="gedge gfeed" fill="none"/><circle r="3.4" fill="#0e8f5a"><animateMotion dur="${2.6 + i * .4}s" repeatCount="indefinite" path="M250,${y} C360,${y} 380,${140} 480,${140}"/></circle>`
      : `<path d="M480,${160} C380,${160} 360,${y} 250,${y}" class="gedge gact" fill="none"/><circle r="3.4" fill="#c9a227"><animateMotion dur="2.4s" repeatCount="indefinite" path="M480,${160} C380,${160} 360,${y} 250,${y}"/></circle>`; }).join('')}
    <text x="365" y="122" text-anchor="middle" font-size="10.5" fill="#0e8f5a">供给 →</text><text x="365" y="188" text-anchor="middle" font-size="10.5" fill="#a8821b">← 学时回写</text>
  </svg>`;
}
function pageClassroom() {
  return `<div class="ppage">
    <div class="ph"><b>知识课堂</b><span>南网人工智能知识课堂 · 上次同步 ${CLASSROOM.syncAt}</span></div>
    <section class="hcard"><div class="hch"><b>接入关系</b><span>课程 / 题库 / 学员画像 供给 → 底座；陪练学时 → 课堂回写</span></div><div class="hcb">${archSVG()}</div></section>
    <div class="syncline">${CLASSROOM.supply.map(s => `<span class="sy ok">${s.n} ${s.dir === 'in' ? '已同步' : '已回写'} · ${s.v}</span>`).join('')}</div>
    <div class="gtwo">
      <section class="hcard"><div class="hch"><b>在学课程</b><span>按能力短板匹配推荐</span></div><div class="hcb">
        ${CLASSROOM.learning.map(c => `<div class="crs"><div class="crs1"><b>${c.n}</b><i class="ctag">${c.tag}</i></div><div class="hbar"><div class="hfill" style="width:${Math.round(c.done / c.h * 100)}%"></div></div><div class="tk3">${c.done}/${c.h} 学时${c.done >= c.h ? ' · 已完成，学时已回写' : ''}</div></div>`).join('')}</div></section>
      <section class="hcard"><div class="hch"><b>错题 → 题库联动</b><span>陪练扣分项自动匹配练习题</span></div><div class="hcb"><table class="htbl"><tr><th>陪练扣分项</th><th>匹配题目</th><th>掌握度</th></tr>
        ${CLASSROOM.quizLink.map(q => `<tr><td>${q.vio}</td><td>${q.q}<div class="tk3">练习 ${q.tries} 次</div></td><td style="width:110px"><div class="hbar"><div class="hfill" style="width:${q.mastery}%;background:${q.mastery >= 80 ? '#0e8f5a' : '#c9a227'}"></div></div><span class="mono tk3">${q.mastery}%</span></td></tr>`).join('')}</table></div></section>
    </div>
    <div class="gtwo">
      <section class="hcard"><div class="hch"><b>学员画像同步</b><span>课堂 ⇄ 底座</span></div><div class="hcb"><table class="htbl"><tr><th>字段</th><th>当前值</th><th>状态</th></tr>
        ${CLASSROOM.profileSync.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td><span class="tag ok">${r[2]}</span></td></tr>`).join('')}</table></div></section>
      <section class="hcard"><div class="hch"><b>学时回写记录</b><span>近30天</span></div><div class="hcb"><table class="htbl"><tr><th>日期</th><th>内容</th><th>学时</th><th>来源</th></tr>
        ${HOUR_LOG.map(x => `<tr><td class="mono">${dayLabel(x.d)}</td><td>${x.n}</td><td class="mono">${x.h}</td><td>${x.src}</td></tr>`).join('')}</table></div></section>
    </div></div>`;
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
  const heat = v => { if (!v) return '<div class="heatc" style="background:#f4f3ea;color:#b3bfb2">—</div>'; const t = Math.max(0, Math.min(1, (v - 40) / 60)); return `<div class="heatc" style="background:rgba(14,143,90,${(.08 + t * .7).toFixed(2)});color:${t > .55 ? '#fff' : '#2d5c40'}">${v}</div>`; };
  const maxR = Math.max(...REDLINES.map(r => r[1]));
  const tasks = teamTasks();
  return `<div class="ppage">
    <div class="ph"><b>班组看板</b><span>${LEAD_USER.team} · 班组长 ${LEAD_USER.name} · ${TEAM.length} 人</span></div>
    <div class="hkpis" style="margin-top:-4px">
      <div class="kpi ${cover >= 90 ? 'good' : 'warn'}"><b>${cover}%</b><span>陪练覆盖率 ${active.length}/${TEAM.length}</span></div>
      <div class="kpi"><b>${(TEAM.reduce((a, m) => a + m.sess, 0) / TEAM.length).toFixed(1)}</b><span>人均场次 · 30天</span></div>
      <div class="kpi"><b>${avgAll}</b><span>班组平均分</span></div>
      <div class="kpi warn"><b>${redTotal}</b><span>红线触发 · 本月</span></div>
      <div class="kpi"><b>${TEAM.filter(m => m.task === 'todo').length}</b><span>任务未完成</span></div>
    </div>
    <div class="tmwrap">
      <section class="hcard"><div class="hch"><b>成员总览</b><span>点击成员查看能力明细</span></div><div class="hcb"><table class="htbl big2">
        <tr><th>成员</th><th>岗位</th><th>场次</th><th>平均分</th><th>短板</th><th>最近练习</th><th>本月任务</th></tr>
        ${TEAM.map((m, i) => { const w = m.sess ? DIMS6[m.dims.indexOf(Math.min(...m.dims))] : '—'; return `<tr class="rrow" data-member="${i}"><td><b>${m.n}</b></td><td>${m.post}</td><td class="mono">${m.sess || '—'}</td><td class="mono ${m.avg && m.avg < 75 ? 'wv' : 'gv'}">${m.avg || '—'}</td><td>${w}</td><td class="mono">${m.last < 0 ? '未练' : m.last === 0 ? '今天' : m.last + ' 天前'}</td><td>${m.task === 'done' ? '<span class="tag ok">已完成</span>' : '<span class="tag wn">未完成</span>'}</td></tr>`; }).join('')}</table>
        <div class="tk3" style="margin-top:8px">评价数据为陪练系统自动记录，用于培训安排参考；正式考评以人工审核为准。</div></div></section>
      <section class="hcard"><div class="hch"><b>班组短板热力</b><span>成员 × 能力项</span></div><div class="hcb"><div class="theat" style="grid-template-columns:70px repeat(6,1fr)">
        <div class="heath"></div>${DIMS6.map(d => `<div class="heath">${d}</div>`).join('')}
        ${TEAM.map(m => `<div class="heatn">${m.n}</div>${m.dims.map(v => heat(v)).join('')}`).join('')}</div></div></section>
    </div>
    <div class="tmwrap2">
      <section class="hcard"><div class="hch"><b>红线触发统计</b><span>本月 · 按类型</span></div><div class="hcb">
        ${REDLINES.map(r => `<div class="bar"><span>${r[0]}</span><div class="btrk"><div class="bfill" style="width:${Math.round(r[1] / maxR * 100)}%"></div></div><b class="mono">${r[1]}</b></div>`).join('')}</div></section>
      <section class="hcard"><div class="hch"><b>未练与待提醒</b><span>${idle.length} 人</span></div><div class="hcb">
        ${idle.map(m => `<div class="hrow"><b>${m.n}</b> <span class="tk3">${m.sess === 0 ? '本月未练' : m.last + ' 天未练'} · ${m.task === 'todo' ? '任务未完成' : '任务已完成'}</span></div>`).join('')}
        <button class="btn" data-remind="1" style="margin-top:8px">生成提醒草稿</button></div></section>
      <section class="hcard"><div class="hch"><b>任务下发</b><span>选教练 · 截止 · 及格线</span></div><div class="hcb frm">
        <label>教练<select id="tk_coach">${COACHES.map(c => `<option value="${c.id}" ${c.open ? '' : 'disabled'}>${c.n}${c.open ? '' : '（未开通）'}</option>`).join('')}</select></label>
        <label>练习方式<select id="tk_plan">${PLANS.filter(p => p.id !== 'wrong').map(p => `<option value="${p.id}">${p.n}</option>`).join('')}</select></label>
        <label>模式<select id="tk_mode"><option>考核模式</option><option>演练模式</option><option>教学模式</option></select></label>
        <div class="frm2"><label>截止<input id="tk_due" type="date" value="${new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10)}"></label><label>及格线<input id="tk_pass" type="number" value="80" min="60" max="100"></label></div>
        <label>对象<select id="tk_who"><option>全班</option><option>未练人员</option>${TEAM.map(m => `<option>${m.n}</option>`).join('')}</select></label>
        <button class="btn pri" data-tasksend="1">下发任务</button></div></section>
    </div>
    <section class="hcard"><div class="hch"><b>本月任务</b><span>${tasks.length} 项</span></div><div class="hcb"><table class="htbl"><tr><th>教练</th><th>练习方式</th><th>模式</th><th>截止</th><th>及格线</th><th>对象</th><th>完成</th></tr>
      ${tasks.map(t => `<tr><td>${t.coach}</td><td>${t.plan}</td><td>${t.mode}</td><td class="mono">${t.due}</td><td class="mono">${t.pass}</td><td>${t.who}</td><td class="mono">${t.done}/${t.total}</td></tr>`).join('')}</table></div></section>
  </div>`;
}
function memberDrill(i) {
  const m = TEAM[i];
  openDrill(`成员 · ${m.n}`, `${m.post} · 近30天 ${m.sess} 场 · 平均 ${m.avg || '—'} 分`, m.sess ? `
    <div class="gtwo"><div>${chRadar(DIMS6, m.dims, TEAM_AVG, { w: 320, h: 240, l1: '本人', l2: '班组均值' })}<div class="tk3" style="text-align:center">本人 vs 班组均值</div></div>
    <div>${miniBars(m.dims)}<div class="hrow" style="margin-top:8px">红线触发 ${m.red} 次 · 最近练习 ${m.last === 0 ? '今天' : m.last + ' 天前'} · 本月任务${m.task === 'done' ? '已完成' : '未完成'}</div>
    <div class="tk3">正式考评以人工审核为准。</div></div></div>` : '<div class="hrow">本月尚无陪练记录。</div>',
    `<button class="btn pri" data-tasksend="${m.n}">给 ${m.n} 下发专项任务</button>`);
}
function remindDraft() {
  const idle = TEAM.filter(m => m.sess === 0 || m.last > 6);
  openDrill('提醒草稿', `${idle.length} 人 · 复制后经企业微信发送`, `<div class="draft">${idle.map(m => `${m.n}：${m.sess === 0 ? '本月尚未进行陪练' : '已 ' + m.last + ' 天未练习'}，请于${dateAfter(HOME_TASK.dueDays)}前完成班组下发的「${HOME_TASK.name}」。`).join('<br>')}<br><br>—— ${LEAD_USER.team} ${LEAD_USER.name}</div>
    <div class="tk3" style="margin-top:8px">草稿由看板数据生成，发送前由班组长确认。</div>`, '');
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
const ED = { tab: 'steps', text: SAMPLE_TICKET, steps: null, name: '培训二线 1162 检修转运行 · 陈志远', avatar: 'daozha', tone: '沉稳', opening: '任玲玲，今天的操作任务是将培训二线1162线路由检修转运行。开始前先完成三审、着装互检和风险分析。', weights: [20, 20, 20, 15, 15, 10], reds: [true, true, true, true, true, true], hintCost: [1, 2, 4], kb: KNOW.map(k => k.id) };
const RED_NAMES = ['未验电即合接地刀闸', '发现异常未中止', '跳项操作', '走错间隔', 'GIS 只看后台未核对就地', '票令不一致未识别'];
const KB_FILES = [['110kV培训三线1163线路由运行转检修操作细则及流程图', '已解析 · 27 项 / 5 页流程图'], ['模拟操作脚本 V7', '已解析 · 117 条台词'], ['操作票试卷 2（含答案）', '已解析 · 27 项 + 三段调度令'], ['变电现场电气操作票管理细则（脱敏版）', '已解析 · 附录 G/J 判据 38 条']];
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
function pageEditor() {
  const tabs = [['role', '角色设定'], ['steps', '剧本步骤'], ['score', '评分规则'], ['kb', '知识库挂载']];
  const custom = lsGet(LS_COACHES, []);
  let body = '';
  if (ED.tab === 'role') body = `<div class="frm edfrm">
      <label>教练名称<input id="ed_name" value="${ED.name}"></label>
      <label>扮演角色<select id="ed_role"><option>监护人</option><option>值班调度员</option><option>值班负责人</option><option>客户</option></select></label>
      <label>形象<div class="avpick">${Object.keys(COACH_IMGS).slice(0, 8).map(k => `<img src="${COACH_IMGS[k]}" class="${ED.avatar === k ? 'on' : ''}" data-avatar="${k}" alt="">`).join('')}</div></label>
      <label>语气<div class="seg">${['沉稳', '亲和', '严格'].map(t => `<span class="${ED.tone === t ? 'on' : ''}" data-tone="${t}">${t}</span>`).join('')}</div></label>
      <label>开场白<textarea id="ed_open" rows="3">${ED.opening}</textarea></label></div>`;
  else if (ED.tab === 'steps') body = `<div class="edsteps">
      <div class="edsrc"><div class="hch" style="padding:0 0 6px"><b>操作票原文</b><span>粘贴票面文本，每行一项</span></div>
        <textarea id="ed_text" rows="17">${ED.text}</textarea>
        <div class="rvact"><button class="btn pri" data-ed="gen">生成剧本</button><span class="tk3" id="ed_prog"></span></div></div>
      <div class="edout"><div class="hch" style="padding:0 0 6px"><b>剧本草稿</b><span>${ED.steps ? `${ED.steps.length} 项 · 判定点 ${ED.steps.reduce((a, s) => a + s.judge.length, 0)} · 红线 ${ED.steps.filter(s => s.red).length}` : '待生成'}</span></div>
        ${ED.steps ? `<table class="htbl edtbl"><tr><th>序</th><th>票面</th><th>动作</th><th>作业位置</th><th>判定点</th><th>依据</th><th>校核</th></tr>
          ${ED.steps.map((s, i) => `<tr class="erow ${s.red ? 'red' : ''}" data-erow="${i}"><td class="mono">${s.no}</td><td>${s.t}</td><td><i class="ctag">${s.an}</i></td><td contenteditable="true" class="edcell">${s.loc}</td><td>${s.judge.map(j => `<span class="jchip ${/红线/.test(j) ? 'rl' : ''}">${j}</span>`).join('')}</td><td class="mono tk3">${s.cite}</td><td><input type="checkbox" data-edok="${i}" ${s.ok ? 'checked' : ''}></td></tr>`).join('')}</table>
          <div class="rvact"><button class="btn" data-ed="okall">全部校核通过</button><button class="btn pri" data-ed="publish" ${ED.steps.every(s => s.ok) ? '' : 'disabled'}>发布为新教练</button></div>`
          : '<div class="edempty">粘贴操作票后点「生成剧本」，系统按票面逐项解析动作类型、作业位置、判定点与依据条款。</div>'}</div></div>`;
  else if (ED.tab === 'score') body = `<div class="frm edfrm">
      <div class="hch" style="padding:0 0 6px"><b>六维权重</b><span>合计 ${ED.weights.reduce((a, b) => a + b, 0)}</span></div>
      ${DIMS6.map((d, i) => `<label class="wrow">${d}<input type="range" min="0" max="40" value="${ED.weights[i]}" data-w="${i}"><b class="mono">${ED.weights[i]}</b></label>`).join('')}
      <div class="hch" style="padding:10px 0 6px"><b>红线（一票否决）</b><span>${ED.reds.filter(Boolean).length}/6 启用</span></div>
      <div class="redlist">${RED_NAMES.map((r, i) => `<label class="tog ${ED.reds[i] ? 'on' : ''}" data-red="${i}"><i></i>${r}</label>`).join('')}</div>
      <div class="hch" style="padding:10px 0 6px"><b>提示扣分</b><span>三级递进 · 留痕不阻断</span></div>
      <div class="hrow">方向提示 −${ED.hintCost[0]} · 要点提示 −${ED.hintCost[1]} · 标准答案 −${ED.hintCost[2]}</div></div>`;
  else body = `<div class="frm edfrm">
      <div class="hch" style="padding:0 0 6px"><b>知识主题</b><span>${ED.kb.length}/${KNOW.length} 已挂载</span></div>
      <div class="kblist">${KNOW.map(k => `<label class="tog ${ED.kb.includes(k.id) ? 'on' : ''}" data-kb="${k.id}"><i></i>${k.t}<span>${k.sub}</span></label>`).join('')}</div>
      <div class="hch" style="padding:12px 0 6px"><b>规程与素材</b><span>${KB_FILES.length} 份</span></div>
      <table class="htbl"><tr><th>文件</th><th>解析状态</th></tr>${KB_FILES.map(f => `<tr><td>${f[0]}</td><td class="tk3">${f[1]}</td></tr>`).join('')}</table></div>`;
  return `<div class="ppage">
    <div class="ph"><b>教练编辑器</b><span>从一张操作票生成一个新教练 · 已发布 ${custom.length} 个</span></div>
    <div class="tabs">${tabs.map(([k, n]) => `<span class="${ED.tab === k ? 'on' : ''}" data-tab="${k}">${n}</span>`).join('')}</div>
    <section class="hcard"><div class="hcb edbody">${body}</div></section>
  </div>`;
}
function editorGen() {
  const ta = $('#ed_text'); if (ta) ED.text = ta.value;
  ED.steps = parseTicket(ED.text).map(s => Object.assign(s, { ok: false }));
  $('#hpage').innerHTML = pageEditor();
  const rows = $$('.erow'); const prog = $('#ed_prog');
  rows.forEach((r, i) => { r.classList.add('pre'); setTimeout(() => { r.classList.remove('pre'); r.classList.add('in'); if (prog) prog.textContent = `解析中 ${i + 1}/${rows.length}`; if (i === rows.length - 1 && prog) setTimeout(() => prog.textContent = `解析完成 · ${rows.length} 项`, 200); }, 120 * i + 80); });
}
function editorPublish() {
  const nm = ED.name.trim() || '自建教练';
  const list = lsGet(LS_COACHES, []);
  list.unshift({ id: 'c' + Date.now(), n: nm, fam: '变电运行', dom: '倒闸操作', steps: ED.steps.length, reds: ED.steps.filter(s => s.red).length, avatar: ED.avatar, ts: Date.now() });
  lsSet(LS_COACHES, list.slice(0, 10));
  toast(`已发布「${nm}」，教练中心可见，待班组长审核开通`, 'ok');
  goPage('plaza');
}
function customCoaches() {
  return lsGet(LS_COACHES, []).map(c => ({ id: c.id, n: c.n, fam: c.fam, dom: c.dom, open: false, custom: true, lvl: 2, min: Math.max(10, Math.round(c.steps * 1.6)), users: 0, gain: 0, tags: ['唱票复诵', '设备状态核对'], desc: `由教练编辑器发布 · ${c.steps} 项操作票 · 红线 ${c.reds} 条 · 待班组长审核开通`, avatar: c.avatar }));
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
  if (n = q('[data-sess]')) { RV.sel = n.dataset.sess; $('#hpage').innerHTML = pageReview(); return true; }
  if (n = q('[data-retry]')) { const all = unifySessions(), s = all.find(x => x.id === n.dataset.retry); if (s) { lsSet('xwt_lastvio', s.vio.map(v => ({ step: v.step, title: v.t }))); enterCoach('daozha', 'wrong'); } return true; }
  if (n = q('[data-lmap]')) { const k = KNOW.find(x => x.id === n.dataset.lmap); const m = LMAP_MASTERY[k.id]; openDrill(`知识主题 · ${k.t}`, `${k.sub} · 掌握度 ${m}`, `<div class="sec"><div class="st">知识点</div><div class="sc">${k.body.map(b => `<div class="hrow"><b>${b[0]}</b><div class="tk3" style="white-space:pre-line">${b[1]}</div></div>`).join('')}</div></div>`, `<button class="btn pri" data-train="${LMAP_PLAN[k.id] || 'full'}">去练相关内容</button>`); return true; }
  if (n = q('[data-member]')) { memberDrill(+n.dataset.member); return true; }
  if (n = q('[data-remind]')) { remindDraft(); return true; }
  if (n = q('[data-tasksend]')) { taskSend(n.dataset.tasksend); return true; }
  if (n = q('[data-tab]')) { const ta = $('#ed_text'); if (ta) ED.text = ta.value; const nm = $('#ed_name'); if (nm) ED.name = nm.value; const op = $('#ed_open'); if (op) ED.opening = op.value; ED.tab = n.dataset.tab; $('#hpage').innerHTML = pageEditor(); return true; }
  if (n = q('[data-ed]')) { const a = n.dataset.ed; if (a === 'gen') editorGen(); else if (a === 'okall') { ED.steps.forEach(s => s.ok = true); $('#hpage').innerHTML = pageEditor(); } else if (a === 'publish') editorPublish(); return true; }
  if (n = q('[data-edok]')) { ED.steps[+n.dataset.edok].ok = n.checked; const pb = $('[data-ed="publish"]'); if (pb) pb.disabled = !ED.steps.every(s => s.ok); return true; }
  if (n = q('[data-avatar]')) { ED.avatar = n.dataset.avatar; $$('.avpick img').forEach(i => i.classList.toggle('on', i === n)); return true; }
  if (n = q('[data-tone]')) { ED.tone = n.dataset.tone; $$('.seg span').forEach(i => i.classList.toggle('on', i === n)); return true; }
  if (n = q('[data-red]')) { const i = +n.dataset.red; ED.reds[i] = !ED.reds[i]; $('#hpage').innerHTML = pageEditor(); return true; }
  if (n = q('[data-kb]')) { const k = n.dataset.kb; ED.kb = ED.kb.includes(k) ? ED.kb.filter(x => x !== k) : ED.kb.concat(k); $('#hpage').innerHTML = pageEditor(); return true; }
  return false;
}
function pagesInput(e) {
  const n = e.target.closest('[data-w]'); if (!n) return;
  ED.weights[+n.dataset.w] = +n.value; n.nextElementSibling.textContent = n.value;
  const h = n.closest('.edfrm').querySelector('.hch span'); if (h) h.textContent = `合计 ${ED.weights.reduce((a, b) => a + b, 0)}`;
}
