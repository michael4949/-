/* ===== 平台三大板块页面：场景中心（A–F 全量展示）· AI 智能测评（三维能力地图）· 可视化数据分析 · 系统与权限 ===== */

/* 横向对比与群体统计用的同批次人员（脱敏模拟，人物全部虚拟） */
const PEERS = [
  { n: '任玲玲', dept: '变电管理一所', post: '变电运行高级作业员', tk: 86, ex: 78, exam: 82 },
  { n: '陈志远', dept: '变电管理一所', post: '变电运行值班负责人', tk: 92, ex: 85, exam: 90 },
  { n: '林 岚', dept: '变电管理一所', post: '变电运行中级作业员', tk: 71, ex: 74, exam: 76 },
  { n: '周建国', dept: '变电管理二所', post: '变电运行高级作业员', tk: 88, ex: 69, exam: 85 },
  { n: '吴 倩', dept: '变电管理二所', post: '变电运行初级作业员', tk: 64, ex: 66, exam: 70 },
  { n: '郭子扬', dept: '变电管理二所', post: '变电运行中级作业员', tk: 79, ex: 81, exam: 74 }
];
const PEER_ERR = [['漏项', 31], ['文字不规范', 24], ['顺序错误', 18], ['阶段越界', 7], ['危险操作', 4], ['无关步骤', 9]];
const PEER_WEAK = [['结果指标：没有量化成效', 22], ['流程步骤：缺情境或结果', 19], ['关键词命中不足', 15], ['共情不足：只讲自己', 11], ['合规红线', 3]];

/* ---------- 统一演练记录（三个场景合流，供筛选与分析） ---------- */
function platRecords() {
  const out = [];
  tkRecords().forEach((r, i) => out.push({ id: 'tk' + i, d: r.d, t: +new Date(r.d.replace(/-/g, '/')), scene: 'ticket', sceneN: '操作票填写', cls: 'A', dim: 'skill', score: r.score, pass: r.pass, sec: r.sec, diff: r.stress ? '高' : r.mode === '考核模式' ? '中' : '低', sum: r.sum || [], raw: r }));
  expRecords().forEach((r, i) => out.push({ id: 'ex' + i, d: r.d, t: +new Date(r.d.replace(/-/g, '/')), scene: 'expert', sceneN: '专家选聘答辩', cls: 'E', dim: 'gen', score: r.core, pass: r.core >= 60, sec: r.sec, diff: '中', sum: r.weak || [], raw: r }));
  (typeof examHist === 'function' ? examHist() : []).forEach((r, i) => out.push({ id: 'ea' + i, d: r.d || '', t: +new Date(String(r.d || '').replace(/-/g, '/')), scene: 'exam', sceneN: r.short || '陪练关卡', cls: 'A', dim: 'skill', score: Math.round((r.score / (r.full || 15)) * 100), pass: !r.red && r.score / (r.full || 15) >= 0.6, sec: r.sec || 0, diff: r.mode === '考核模式' ? '中' : '低', sum: [], raw: r }));
  return out.sort((a, b) => b.t - a.t);
}
const PLAT = { f: { scene: '', diff: '', dept: '', post: '', lo: 0, hi: 100, days: 90 }, legend: { skill: true, gen: true, lead: true }, tab: 'me', drill: null };
const PV_KEY = 'xwt_views';
function pvList() { try { return JSON.parse(localStorage.getItem(PV_KEY) || '[]'); } catch (e) { return []; } }
function pvSave(n) { const a = pvList(); a.unshift({ n, f: JSON.parse(JSON.stringify(PLAT.f)), d: stamp() }); localStorage.setItem(PV_KEY, JSON.stringify(a.slice(0, 8))); }
function platFiltered() {
  const f = PLAT.f, now = Date.now();
  return platRecords().filter(r => (!f.scene || r.scene === f.scene) && (!f.diff || r.diff === f.diff) && r.score >= f.lo && r.score <= f.hi && (!r.t || (now - r.t) / 86400000 <= f.days));
}

/* ---------- 小图表：瀑布图 / 分组柱 / 三维环 ---------- */
function chWaterfall(base, items, w) {
  w = w || 560; const H = 200, L = 34, B = 34, T = 14;
  const max = base * 1.1 || 100;
  const n = items.length + 2, bw = Math.min(56, (w - L - 12) / n * .66);
  const y = v => T + (1 - v / max) * (H - T - B);
  const x = i => L + (i + .5) * (w - L - 12) / n;
  let run = base, out = '';
  out += `<rect x="${x(0) - bw / 2}" y="${y(base)}" width="${bw}" height="${y(0) - y(base)}" rx="3" class="wfb"/><text class="wl" x="${x(0)}" y="${y(base) - 5}" text-anchor="middle">${base}</text><text class="wx" x="${x(0)}" y="${H - 14}" text-anchor="middle">基准分</text>`;
  items.forEach((it, i) => {
    const top = run, bot = run - it.v; run = bot;
    out += `<rect x="${x(i + 1) - bw / 2}" y="${y(top)}" width="${bw}" height="${Math.max(2, y(bot) - y(top))}" rx="3" class="wfd" data-wf="${h(it.n)}"/>` +
      `<text class="wl d" x="${x(i + 1)}" y="${y(top) - 5}" text-anchor="middle">-${it.v}</text>` +
      `<text class="wx" x="${x(i + 1)}" y="${H - 14}" text-anchor="middle">${h(it.n)}</text>` +
      `<line class="wfl" x1="${x(i) + bw / 2}" y1="${y(top)}" x2="${x(i + 1) - bw / 2}" y2="${y(top)}"/>`;
  });
  out += `<rect x="${x(n - 1) - bw / 2}" y="${y(run)}" width="${bw}" height="${y(0) - y(run)}" rx="3" class="wfe"/><text class="wl" x="${x(n - 1)}" y="${y(run) - 5}" text-anchor="middle">${run}</text><text class="wx" x="${x(n - 1)}" y="${H - 14}" text-anchor="middle">最终得分</text>`;
  return `<svg viewBox="0 0 ${w} ${H}" class="chw">${[0, .5, 1].map(p => `<line class="wg" x1="${L}" y1="${y(max * p)}" x2="${w - 8}" y2="${y(max * p)}"/><text class="wx" x="${L - 5}" y="${y(max * p) + 3}" text-anchor="end">${Math.round(max * p)}</text>`).join('')}${out}</svg>`;
}
function chGroupBar(cats, series, w) {
  w = w || 560; const H = 210, L = 34, B = 42, T = 14;
  const all = series.reduce((a, s) => a.concat(s.v), []); const max = Math.max.apply(null, all) * 1.12 || 100;
  const gw = (w - L - 12) / cats.length, bw = Math.min(16, gw * .72 / series.length);
  const y = v => T + (1 - v / max) * (H - T - B);
  const body = cats.map((c, i) => {
    const cx = L + (i + .5) * gw;
    return series.map((s, si) => {
      const bx = cx - series.length * bw / 2 + si * bw;
      return `<rect x="${bx + 1}" y="${y(s.v[i])}" width="${bw - 2}" height="${y(0) - y(s.v[i])}" rx="2" fill="${s.c}" data-gb="${h(c)}|${h(s.n)}|${s.v[i]}"><title>${h(c)} · ${h(s.n)} ${s.v[i]}</title></rect>`;
    }).join('') + `<text class="wx" x="${cx}" y="${H - 24}" text-anchor="middle">${h(c)}</text><text class="wx s" x="${cx}" y="${H - 12}" text-anchor="middle">${h((PEERS.find(p => p.n === c) || {}).post || '').replace('变电运行', '')}</text>`;
  }).join('');
  return `<svg viewBox="0 0 ${w} ${H}" class="chw">${[0, .5, 1].map(p => `<line class="wg" x1="${L}" y1="${y(max * p)}" x2="${w - 8}" y2="${y(max * p)}"/><text class="wx" x="${L - 5}" y="${y(max * p) + 3}" text-anchor="end">${Math.round(max * p)}</text>`).join('')}${body}</svg>`;
}
function platBars(items, unit) {
  const max = Math.max.apply(null, items.map(i => i.v)) || 1;
  return `<div class="pbars">${items.map(i => `<div class="pbar" data-pb="${h(i.n)}"><span>${h(i.n)}</span><div class="ptrk"><i style="width:${Math.round(i.v / max * 100)}%"></i></div><b>${i.v}${unit || ''}</b></div>`).join('')}</div>`;
}
function chLine(pts, w) {
  w = w || 560; const H = 210, L = 36, R = 14, T = 16, B = 34;
  const n = pts.length, y = v => T + (1 - v / 100) * (H - T - B), x = i => L + (n < 2 ? .5 : i / (n - 1)) * (w - L - R);
  const cols = { ticket: '#1f6fb3', expert: '#0e8f5a', exam: '#a8821b' };
  const d = pts.map((p, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.score).toFixed(1)).join(' ');
  return `<svg viewBox="0 0 ${w} ${H}" class="chw">
    ${[0, 50, 100].map(v => `<line class="wg" x1="${L}" y1="${y(v)}" x2="${w - R}" y2="${y(v)}"/><text class="wx" x="${L - 5}" y="${y(v) + 3}" text-anchor="end">${v}</text>`).join('')}
    <line class="wp" x1="${L}" y1="${y(60)}" x2="${w - R}" y2="${y(60)}"/><text class="wx p" x="${w - R}" y="${y(60) - 4}" text-anchor="end">及格线 60</text>
    <path d="${d}" fill="none" stroke="#1f6fb3" stroke-width="2"/>
    ${pts.map((p, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(p.score).toFixed(1)}" r="4.5" fill="${cols[p.scene] || '#1f6fb3'}" class="lndot" data-goscene="${p.scene}"><title>${h(p.d)} · ${h(p.sceneN)} ${p.score} 分</title></circle>`).join('')}
    ${pts.map((p, i) => (n <= 8 || i % Math.ceil(n / 8) === 0) ? `<text class="wx" x="${x(i).toFixed(1)}" y="${H - 12}" text-anchor="middle">${h(p.d.slice(5, 10))}</text>` : '').join('')}
  </svg>`;
}
function chTri(sum) {
  const R = [58, 44, 30], C = ['#1f6fb3', '#0e8f5a', '#a8821b'], K = ['skill', 'gen', 'lead'], N = ['技能水平', '通用能力', '领导能力'];
  return `<svg viewBox="0 0 260 150" class="chtri">${K.map((k, i) => {
    const v = sum[k], p = v == null ? 0 : v / 100, r = R[i], cir = 2 * Math.PI * r;
    return `<g data-tri="${k}" class="tri ${v == null ? 'na' : ''}"><circle cx="75" cy="75" r="${r}" class="trk"/><circle cx="75" cy="75" r="${r}" stroke="${C[i]}" class="trv" stroke-dasharray="${(cir * p).toFixed(1)} ${cir.toFixed(1)}" transform="rotate(-90 75 75)"/>
      <text x="150" y="${34 + i * 34}" class="trn">${N[i]}</text><text x="252" y="${34 + i * 34}" class="trv2" text-anchor="end" fill="${C[i]}">${v == null ? '暂无实测' : v}</text>
      <rect x="150" y="${40 + i * 34}" width="102" height="5" rx="2.5" class="trk2"/><rect x="150" y="${40 + i * 34}" width="${102 * p}" height="5" rx="2.5" fill="${C[i]}"/></g>`;
  }).join('')}</svg>`;
}

/* ---------- 场景中心 ---------- */
function pageCenter() {
  const open = SCENE_AF.reduce((s, g) => s + g.list.filter(x => x.open).length, 0);
  const all = SCENE_AF.reduce((s, g) => s + g.list.length, 0);
  return `<div class="wrap">
    <div class="ph"><h2>场景中心</h2><span class="sub">A–F 六大类 ${all} 个场景全量展示　可进入演练 ${open} 个　其余展示场景简介、适配岗位与能力培养方向</span></div>
    <div class="card riskrow">${SCENE_RISK.map(r => `<div class="rk"><b>${h(r[0])}</b><span>${h(r[1])}</span><i>${h(r[2])} 类</i></div>`).join('')}<div class="note">风险维度决定场景的容错设置与压力模式强度</div></div>
    ${SCENE_AF.map(g => `<div class="card scg">
      <div class="ch"><b class="cls">${g.k}</b><b>${h(g.n)}</b><span class="note">${h(g.d)}　·　${h(g.f)}</span><span class="r note">${g.list.filter(x => x.open).length}/${g.list.length} 可演练</span></div>
      <div class="scl">${g.list.map(s => `<div class="sc ${s.open ? 'on' : ''}" ${s.open ? `data-scgo="${s.go}" data-scpre="${s.pre || ''}"` : ''}>
        <b>${h(s.n)}</b>${s.open ? '<span class="tag ok">可演练</span>' : '<span class="tag">已纳入场景目录</span>'}
        <p>${h(s.desc)}</p>
        <div class="scm"><span><i>适配岗位</i>${h(s.post)}</span><span><i>能力培养方向</i>${h(s.cap)}</span></div>
      </div>`).join('')}</div></div>`).join('')}
  </div>`;
}

/* ---------- AI 智能测评：一张能力地图，三维分层下钻 ---------- */
function pageAssess() {
  m3Init();
  const S = m3Scores(), d = PLAT.drill;
  const grp = { skill: S.skill, gen: S.gen, lead: S.lead };
  const dim = d ? M3.find(x => x.k === d.k) : null;
  return `<div class="wrap">
    <div class="ph"><h2>AI 智能测评</h2><span class="sub">技能水平 · 通用能力 · 领导能力　三维在一张能力地图上建立映射，各自保留指标体系，分层下钻</span></div>
    <div class="asrow">
      <div class="card"><div class="ch"><b>能力地图</b><span class="note">点环或点维度名下钻到指标体系</span></div>${chTri(S.sum)}
        <div class="asn">演练次数：操作票 ${S.n.tk} · 答辩 ${S.n.ex} · 关卡 ${S.n.exam}</div></div>
      ${M3.map(m => `<div class="card asdim ${m.on ? '' : 'off'}" data-tri="${m.k}">
        <div class="ch"><b>${h(m.n)}</b>${m.on ? '<span class="tag ok">本次落地</span>' : '<span class="tag">仅展示</span>'}</div>
        <p class="note">${h(m.d)}</p>
        <div class="asv">${S.sum[m.k] == null ? '<em>暂无实测数据</em>' : '<b>' + S.sum[m.k] + '</b><span>/100</span>'}</div>
        <div class="asm">对应场景：${h(m.scene)}</div><div class="asm2">${h(m.src)}</div>
        <div class="asl">${(grp[m.k] || []).slice(0, 6).map(it => `<span class="${it.v == null ? 'na' : it.v >= 80 ? 'g' : it.v >= 60 ? 'y' : 'r'}">${h(it.n)}${it.v == null ? '' : ' ' + it.v}</span>`).join('')}${(grp[m.k] || []).length > 6 ? '<span class="more">+' + ((grp[m.k] || []).length - 6) + '</span>' : ''}</div>
      </div>`).join('')}
    </div>
    ${dim ? `<div class="card"><div class="ch"><b>${h(dim.n)} · 指标体系</b><span class="note">${h(dim.src)}</span><span class="r"><button class="btn s g" id="asclose">收起</button></span></div>
      ${dim.k === 'skill' ? `<table class="tb"><tr><th>指标</th><th>来源</th><th>定义</th><th style="width:150px">当前</th></tr>${grp.skill.map(it => `<tr><td><b>${h(it.n)}</b></td><td class="note">${h(it.from)}</td><td class="note">${h(it.d)}</td><td>${it.v == null ? '<span class="note">暂无</span>' : `<div class="bar"><i style="width:${it.v}%"></i></div><span class="mono">${it.v}</span>`}</td></tr>`).join('')}</table>`
      : `<div class="lvgrid">${dim.items.map(it => { const cur = (grp[dim.k].find(x => x.k === it.k) || {}).v; const lv = cur == null ? -1 : Math.min(3, Math.floor(cur / 25)); return `<div class="lvc"><div class="lh"><b>${h(it.n)}</b>${cur == null ? '<span class="tag">暂无实测</span>' : '<span class="tag ok">层级 ' + (lv + 1) + ' · ' + h(it.lv[lv][0]) + '</span>'}</div><p class="note">${h(it.d)}</p>
        <ol class="lvs">${it.lv.map((l, i) => `<li class="${i === lv ? 'on' : ''}"><b>${i + 1} ${h(l[0])}</b><span>${h(l[1])}</span></li>`).join('')}</ol></div>`; }).join('')}</div>`}
    </div>` : ''}
    <div class="card"><div class="ch"><b>最近测评结论</b><span class="note">演练报告（个人版）：演练过程、得分、AI 评语、能力短板、改进建议</span></div>
      ${platRecords().slice(0, 6).map(r => `<div class="asrec"><span class="tag ${r.cls === 'A' ? '' : 'ok'}">${r.cls} 类</span><b>${h(r.sceneN)}</b><span class="note">${h(r.d)}</span>
        <span class="mono">${r.score}</span><span class="tag ${r.pass ? 'ok' : 'bad'}">${r.pass ? '合格' : '不合格'}</span>
        <span class="note">${h(r.sum.join('、') || '无明显短板')}</span>
        <button class="btn s" data-goscene="${r.scene}">看报告</button></div>`).join('') || '<div class="empty">还没有演练记录，先去场景中心选一个场景</div>'}
    </div>
  </div>`;
}

/* ---------- 可视化数据分析 ---------- */
function pageAnalytics() {
  const recs = platFiltered(), S = m3Scores();
  const views = pvList();
  const last = tkRecords()[0];
  let wf = null;
  if (last) {
    const res = tkJudge(last.rows);
    const map = { miss: '漏项', order: '顺序错误', cross: '阶段越界', text: '文字不规范', level: '层级错误', extra: '无关步骤' };
    wf = Object.keys(map).map(k => ({ n: map[k], v: res.errs.filter(e => e.kind === k).reduce((s, e) => s + (e.deduct || 0), 0) })).filter(x => x.v > 0);
  }
  const days = recs.slice().reverse();
  const cats = PEERS.map(p => p.n), me = { n: '本人', c: '#1f6fb3', v: PEERS.map(() => S.sum.skill || 0) };
  const sel = (k, opts) => `<select data-pf="${k}"><option value="">全部</option>${opts.map(o => `<option value="${o[0]}" ${PLAT.f[k] === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')}</select>`;
  return `<div class="wrap">
    <div class="ph"><h2>可视化数据分析</h2><span class="sub">点击下钻 · 拖动时间滑块 · 图例开关 · 多条件组合筛选，筛选后所有图表联动刷新</span>
      <span class="r"><button class="btn s g" id="pvsave">保存为自定义视图</button><button class="btn s g" id="pvexp">导出</button></span></div>
    <div class="card pfil">
      <label>演练场景${sel('scene', [['ticket', '操作票填写'], ['expert', '专家选聘答辩'], ['exam', '陪练关卡']])}</label>
      <label>难度等级${sel('diff', [['低', '低'], ['中', '中'], ['高', '高']])}</label>
      <label>部门${sel('dept', PEERS.map(p => [p.dept, p.dept]).filter((v, i, a) => a.findIndex(x => x[0] === v[0]) === i))}</label>
      <label>岗位${sel('post', PEERS.map(p => [p.post, p.post]).filter((v, i, a) => a.findIndex(x => x[0] === v[0]) === i))}</label>
      <label class="rng">得分区间 <input type="number" id="pflo" value="${PLAT.f.lo}" min="0" max="100"> – <input type="number" id="pfhi" value="${PLAT.f.hi}" min="0" max="100"></label>
      <label class="rng2">时间范围 近 <input type="range" id="pfday" min="7" max="365" value="${PLAT.f.days}"> <b id="pfdayv">${PLAT.f.days}</b> 天</label>
      <span class="note">命中 ${recs.length} 条记录</span>
      ${views.length ? '<span class="pvl">自定义视图：' + views.map((v, i) => `<b data-pvgo="${i}">${h(v.n)}</b>`).join('') + '</span>' : ''}
    </div>
    <div class="anrow">
      <div class="card"><div class="ch"><b>个人能力雷达</b><span class="note">点图例开关数据系列</span></div>
        <div class="lgd">${['skill', 'gen', 'lead'].map((k, i) => `<b data-lg="${k}" class="${PLAT.legend[k] ? '' : 'off'}"><i style="background:${['#1f6fb3', '#0e8f5a', '#a8821b'][i]}"></i>${['技能水平', '通用能力', '领导能力'][i]}</b>`).join('')}</div>
        ${chRadar(S.skill.slice(0, 8).map(x => x.n), S.skill.slice(0, 8).map(x => x.v || 0), S.skill.slice(0, 8).map(() => 72), { l1: '本人', l2: '平台均值' })}
      </div>
      <div class="card"><div class="ch"><b>多次演练能力进步趋势</b><span class="note">点数据点进对应演练报告</span></div>
        ${days.length > 1 ? chLine(days) : '<div class="empty">至少两次演练才能看趋势，先去做一次</div>'}
      </div>
    </div>
    <div class="card"><div class="ch"><b>扣分来源拆解</b><span class="note">瀑布图 · 取最近一次操作票判卷结果</span></div>
      ${wf && wf.length ? chWaterfall(100, wf) : '<div class="empty">最近一次操作票判卷没有扣分项，或还没有操作票演练记录</div>'}
      ${wf && wf.length ? '<div class="note">基准分为业务规则配置项；漏项、顺序错误、阶段越界、文字不规范的分值均可在讲师演示台调整。</div>' : ''}
    </div>
    <div class="anrow">
      <div class="card"><div class="ch"><b>多人员横向对比</b><span class="note">分组柱状图 · 班组内并排对比</span></div>
        ${chGroupBar(cats, [{ n: '操作票填写', c: '#1f6fb3', v: PEERS.map(p => p.tk) }, { n: '专家答辩', c: '#0e8f5a', v: PEERS.map(p => p.ex) }, { n: '陪练关卡', c: '#a8821b', v: PEERS.map(p => p.exam) }])}
        <div class="lgd sm"><b><i style="background:#1f6fb3"></i>操作票填写</b><b><i style="background:#0e8f5a"></i>专家答辩</b><b><i style="background:#a8821b"></i>陪练关卡</b></div>
        <table class="tb s rk"><tr><th>排名</th><th>姓名</th><th>部门</th><th>综合</th></tr>
        ${PEERS.map(p => ({ p, v: Math.round((p.tk + p.ex + p.exam) / 3) })).sort((a, b) => b.v - a.v).map((x, i) => `<tr><td class="mono">${i + 1}</td><td>${h(x.p.n)}</td><td class="note">${h(x.p.dept)}</td><td class="mono">${x.v}</td></tr>`).join('')}</table>
      </div>
      <div class="card"><div class="ch"><b>场景聚合统计</b><span class="note">群体共性错误与普遍能力短板，为培训提供依据</span></div>
        <div class="ch2"><b>操作票填写 · 共性错误</b></div>
        ${platBars(PEER_ERR.map(e => ({ n: e[0], v: e[1] })), ' 人次')}
        <div class="ch2"><b>专家答辩 · 普遍能力短板</b></div>
        ${platBars(PEER_WEAK.map(e => ({ n: e[0], v: e[1] })), ' 人次')}
        <div class="note">结论：写票类失分集中在漏项与文字规范，建议把「操作票应填写的项目」与「一栏一个动词」列为下一轮必训内容；答辩类失分集中在结果指标，建议统一按情境—任务—行动—结果四段作答。</div>
      </div>
    </div>
    <div class="card"><div class="ch"><b>演练原始行为记录</b><span class="note">操作票填写的错误清单、专家选聘的失分点记录</span></div>
      <table class="tb"><tr><th>时间</th><th>场景</th><th>类别</th><th>难度</th><th>用时</th><th>得分</th><th>结论</th><th>失分点</th><th></th></tr>
      ${recs.map(r => `<tr><td>${h(r.d)}</td><td>${h(r.sceneN)}</td><td>${r.cls}</td><td>${h(r.diff)}</td><td>${Math.floor(r.sec / 60)}分${r.sec % 60}秒</td><td class="mono">${r.score}</td><td>${r.pass ? '<span class="tag ok">合格</span>' : '<span class="tag bad">不合格</span>'}</td><td class="note">${h(r.sum.join('、') || '—')}</td><td><button class="btn s" data-goscene="${r.scene}">回看</button></td></tr>`).join('') || '<tr><td colspan="9" class="empty">当前筛选条件下没有记录</td></tr>'}</table></div>
  </div>`;
}

/* ---------- 系统与权限 ---------- */
function pageSys() {
  return `<div class="wrap">
    <div class="ph"><h2>系统与权限</h2><span class="sub">权限与系统管理板块　本次开发普通员工视角，另外两类角色在界面上完整展示</span></div>
    <div class="card"><div class="ch"><b>角色与权限</b></div>
      <table class="tb"><tr><th>角色</th><th>本次</th><th>可以做</th><th>不可以</th></tr>
      ${ROLE_MX.map(r => `<tr><td><b>${h(r.r)}</b></td><td>${r.on ? '<span class="tag ok">本次开发</span>' : '<span class="tag">界面展示</span>'}</td><td>${r.can.map(x => '<div>· ' + h(x) + '</div>').join('')}</td><td class="note">${r.no.map(x => '<div>' + h(x) + '</div>').join('') || '—'}</td></tr>`).join('')}</table></div>
    <div class="card"><div class="ch"><b>标准票与规则版本</b><span class="note">标准票发布后冻结，修改必须生成新版本；历史答卷始终用当时版本复现</span></div>
      <table class="tb"><tr><th>项目</th><th>内容</th></tr>
        <tr><td>标准票</td><td>${h(TICKET_META.task)}　<span class="tag">${h(TICKET_META.ver)} 已发布冻结</span></td></tr>
        <tr><td>业务规则</td><td>${TICKET.length} 行结构化标注：${TICKET_META.stages.length} 个设备状态阶段、${Array.from(new Set(TICKET.map(s => s.grp))).length} 个可换序组、${TICKET.filter(s => s.miss === '整票不合格').length} 处漏写即整票不合格、3 档文字要求</td></tr>
        <tr><td>危险操作规则</td><td>已实现 ${TICKET_DANGER.length} 条（业务已确认部分）；完整清单由业务提供后按配置接入，规则优先级高于普通扣分</td></tr>
        <tr><td>制度文件库</td><td>${RULE_DOCS.map(d => h(d.short)).join(' · ')}　共 ${RULES.length} 条可检索条款，每条可追溯到文件名、条款编号与条文正文</td></tr>
        <tr><td>扣分配置</td><td>漏项 ${TICKET_CFG.miss} · 顺序错误 ${TICKET_CFG.order} · 阶段越界 ${TICKET_CFG.cross} · 文字不规范 ${TICKET_CFG.text} · 无关步骤 ${TICKET_CFG.extra}　<span class="note">业务尚未最终确定，做成配置项，程序不写死</span></td></tr>
      </table></div>
    <div class="card"><div class="ch"><b>案例库与题库</b><span class="note">系统管理员维护；此处展示当前已接入的内容</span></div>
      <table class="tb"><tr><th>类别</th><th>数量</th><th>来源</th></tr>
        <tr><td>标准操作票</td><td class="mono">1 张 / ${TICKET.length} 行</td><td class="note">${h(TICKET_META.src)}</td></tr>
        <tr><td>答辩题库</td><td class="mono">${EXP_Q.length} 类 / ${EXP_Q.reduce((s, q) => s + q.qs.length, 0)} 题</td><td class="note">${h(EXP_META.src)}</td></tr>
        <tr><td>陪练关卡</td><td class="mono">${typeof EXAMS !== 'undefined' ? EXAMS.length : 2} 个</td><td class="note">陪练关卡方案 · 实操培训方案</td></tr>
        <tr><td>制度条款</td><td class="mono">${RULES.length} 条</td><td class="note">安规及释义 · 电气操作导则</td></tr>
      </table></div>
    <div class="card"><div class="ch"><b>通用功能</b></div>
      <div class="sysf">${[['对话 / 演练上下文记忆', '完整保存整场演练全部交互内容，用于后续复盘分析'], ['压力模式开关', '开启后增加突发干扰与时间限制：写票有调度来电、限时 20 分钟；答辩有评委追问'], ['演练计时', '记录用户完成演练耗时，写在演练档案里'], ['演练存档', '每一次演练生成唯一演练档案，本机永久存储，随时调回看完整过程'], ['定制陪练 AI', '性别、性格、年龄、教育背景、角色身份、情绪状态、语言风格七项可选'], ['数据导出', '图表、测评报告、明细表格导出为表格文件，用于测评归档']].map(x => `<div><b>${h(x[0])}</b><span>${h(x[1])}</span></div>`).join('')}</div></div>
  </div>`;
}

/* ---------- 挂载与交互 ---------- */
function platAfter(page) {
  if (page === 'assess') {
    const c = $('#asclose'); if (c) c.onclick = () => { PLAT.drill = null; goPage('assess'); };
  }
  if (page === 'analytics') {
    $$('[data-pf]').forEach(s => s.onchange = () => { PLAT.f[s.dataset.pf] = s.value; goPage('analytics'); });
    const lo = $('#pflo'), hi = $('#pfhi'), dy = $('#pfday');
    if (lo) lo.onchange = () => { PLAT.f.lo = +lo.value || 0; goPage('analytics'); };
    if (hi) hi.onchange = () => { PLAT.f.hi = +hi.value || 100; goPage('analytics'); };
    if (dy) { dy.oninput = () => { $('#pfdayv').textContent = dy.value; }; dy.onchange = () => { PLAT.f.days = +dy.value; goPage('analytics'); }; }
    const sv = $('#pvsave'); if (sv) sv.onclick = () => { const n = prompt('给这个筛选方案起个名字', '近 ' + PLAT.f.days + ' 天 · ' + (PLAT.f.scene ? '单场景' : '全场景')); if (n) { pvSave(n); toast('已保存为自定义视图', 'ok'); goPage('analytics'); } };
    const ep = $('#pvexp'); if (ep) ep.onclick = platExport;
  }
}
function platExport() {
  const recs = platFiltered();
  const L = [['时间', '场景', '类别', '难度', '用时(秒)', '得分', '结论', '失分点']];
  recs.forEach(r => L.push([r.d, r.sceneN, r.cls, r.diff, r.sec, r.score, r.pass ? '合格' : '不合格', r.sum.join('；')]));
  const csv = '﻿' + L.map(x => x.map(c => '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"').join(',')).join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = '演练数据分析.csv'; a.click(); toast('已导出，可用 Excel 打开归档', 'ok');
}
document.addEventListener('click', e => {
  const g = e.target.closest('[data-scgo]');
  if (g) { const go = g.dataset.scgo, pre = g.dataset.scpre; if (go === 'exam' && pre) return examStart(pre, 'teach'); return goPage(go); }
  const t = e.target.closest('[data-tri]');
  if (t && (location.hash || '').includes('assess')) { PLAT.drill = PLAT.drill && PLAT.drill.k === t.dataset.tri ? null : { k: t.dataset.tri }; goPage('assess'); }
  const gs = e.target.closest('[data-goscene]');
  if (gs) { const s = gs.dataset.goscene; return goPage(s === 'ticket' ? 'ticket' : s === 'expert' ? 'expert' : 'review'); }
  const lg = e.target.closest('[data-lg]');
  if (lg) { PLAT.legend[lg.dataset.lg] = !PLAT.legend[lg.dataset.lg]; lg.classList.toggle('off'); }
  const pv = e.target.closest('[data-pvgo]');
  if (pv) { const v = pvList()[+pv.dataset.pvgo]; if (v) { PLAT.f = Object.assign({}, v.f); goPage('analytics'); } }
});
