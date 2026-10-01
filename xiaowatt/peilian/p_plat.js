/* ===== 平台四页：场景中心（六个陪练场景）· AI 智能测评（个人安全能力评估报告）· 可视化数据分析（横向对比）· 系统与权限 ===== */

/* 横向对比与群体统计用的同批次人员（脱敏模拟，人物全部虚拟） */
const PEERS = [
  { n: '任玲玲', dept: '变电管理一所', team: '变电运行一班', post: '变电运行值班员', sc: null },
  { n: '陈志远', dept: '变电管理一所', team: '变电运行一班', post: '变电运行值班负责人', sc: { tk: 95, em: 90, rule: 92, life: 90, case: 86, inst: 93 } },
  { n: '林 岚', dept: '变电管理一所', team: '变电运行二班', post: '变电运行值班员', sc: { tk: 74, em: 79, rule: 72, life: 70, case: 66, inst: 80 } },
  { n: '周建国', dept: '变电管理一所', team: '变电运行一班', post: '班组长', sc: { tk: 91, em: 88, rule: 90, life: 88, case: 85, inst: 92 } },
  { n: '吴 倩', dept: '变电管理二所', team: '变电运行三班', post: '变电运行值班员', sc: { tk: 62, em: 70, rule: 64, life: 60, case: 58, inst: 71 } },
  { n: '郭子扬', dept: '变电管理二所', team: '变电运行三班', post: '变电运行主值', sc: { tk: 83, em: 76, rule: 80, life: 78, case: 72, inst: 84 } },
  { n: '黄嘉琪', dept: '配网运维部', team: '配网运维一班', post: '配网运维人员', sc: { tk: 80, em: 84, rule: 78, life: 86, case: 80, inst: 82 } },
  { n: '刘泽宇', dept: '配网运维部', team: '配网运维一班', post: '配网运维人员', sc: { tk: 58, em: 64, rule: 60, life: 55, case: 50, inst: 66 } }
];
/* 班组 / 部门近 8 周四维度均分趋势（脱敏模拟） */
const TREND_W = { labels: ['8 周前', '7 周前', '6 周前', '5 周前', '4 周前', '3 周前', '2 周前', '上周'], kn: [66, 68, 70, 71, 73, 75, 76, 78], op: [70, 71, 73, 74, 74, 76, 78, 79], em: [60, 63, 65, 68, 70, 71, 74, 76], rv: [55, 57, 60, 62, 64, 66, 68, 70] };
const PEER_ERR = [['编号与屏柜附表不一致', 34], ['漏项', 29], ['顺序错误', 16], ['危险操作', 6], ['文字不规范', 21], ['阶段越界', 5]];
const PEER_EM = [['信息报送未说“在检查中”', 23], ['事例漏指单人进入高压场所', 14], ['有限空间未先检测就施救', 11], ['处置要点漏答心肺复苏', 9], ['未断开着火设备电源', 6]];
/* 权限矩阵：本次开发普通员工视角，另外两类角色在界面上完整展示 */
const ROLE_MX = [
  { r: '普通参训用户', on: true, can: ['参与六个陪练场景的演练与案例推送学习', '查看个人安全能力评估报告与自动分析', '导出本人测评报告'], no: ['不可查看其他用户数据'] },
  { r: '班组长 / 业务负责人', on: true, can: ['查看所辖班组全部人员演练数据与横向对比', '导入通报生成案例并推送学习', '下发培训任务、复核演练结果'], no: ['不允许修改标准票与判卷规则'] },
  { r: '系统管理员', on: false, can: ['管理标准票、应急处置卡与事例库、案例库、题库、用户账号、系统配置', '发布标准票并冻结版本', '维护制度文件库'], no: [] }
];

/* ---------- 统一演练记录（两个场景合流，供筛选与分析） ---------- */
function platRecords() {
  return allRecs().map(r => ({ id: r.id, d: r.d, t: r.ts, scene: r.src, sceneN: (SCENE_MAP[r.src] || {}).short + ' · ' + (r.src === 'em' ? ((EMGMAP[r.eid] || {}).card || '') : (r.sub || '').split(' · ')[0]), score: r.score, pass: r.pass, sec: r.sec || 0,
    diff: /压力/.test(r.mode) ? '高' : /考核|exam/.test(r.mode) ? '中' : '低', sum: r.sum || [], raw: r }));
}
const PLAT = { f: { scene: '', diff: '', dept: '', post: '', lo: 0, hi: 100, days: 90 }, drill: null };
const PV_KEY = 'xwt_views';
function pvList() { try { return JSON.parse(localStorage.getItem(PV_KEY) || '[]'); } catch (e) { return []; } }
function pvSave(n) { const a = pvList(); a.unshift({ n, f: JSON.parse(JSON.stringify(PLAT.f)), d: stamp() }); localStorage.setItem(PV_KEY, JSON.stringify(a.slice(0, 8))); }
function platFiltered() {
  const f = PLAT.f, now = Date.now();
  return platRecords().filter(r => (!f.scene || r.scene === f.scene) && (!f.diff || r.diff === f.diff) && r.score >= f.lo && r.score <= f.hi && (!r.t || (now - r.t) / 86400000 <= f.days));
}
function peersNow() {
  const A = abilityCalc();
  return PEERS.map(p => {
    const sc = p.n === HOME_USER.name ? (() => { const o = {}; SCENES.forEach(x => { o[x.k] = A.scene[x.k].score == null ? 0 : A.scene[x.k].score; }); return o; })() : p.sc;
    const dim4 = dim4FromScene(sc); const vs = Object.keys(dim4).map(k => dim4[k]).filter(v => v != null);
    return Object.assign({}, p, { sc, dim4, mat: vs.length ? Math.round(vs.reduce((a, b) => a + b, 0) / vs.length) : 0 });
  }).filter(p => (!PLAT.f.dept || p.dept === PLAT.f.dept) && (!PLAT.f.post || p.post === PLAT.f.post));
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
  const cols = { tk: '#1f6fb3', em: '#0e8f5a' };
  const d = pts.map((p, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.score).toFixed(1)).join(' ');
  return `<svg viewBox="0 0 ${w} ${H}" class="chw">
    ${[0, 50, 100].map(v => `<line class="wg" x1="${L}" y1="${y(v)}" x2="${w - R}" y2="${y(v)}"/><text class="wx" x="${L - 5}" y="${y(v) + 3}" text-anchor="end">${v}</text>`).join('')}
    <line class="wp" x1="${L}" y1="${y(60)}" x2="${w - R}" y2="${y(60)}"/><text class="wx p" x="${w - R}" y="${y(60) - 4}" text-anchor="end">及格线 60</text>
    <path d="${d}" fill="none" stroke="#1f6fb3" stroke-width="2"/>
    ${pts.map((p, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(p.score).toFixed(1)}" r="4.5" fill="${cols[p.scene] || '#1f6fb3'}" class="lndot" data-rec="${p.id}"><title>${h(p.d)} · ${h(p.sceneN)} ${p.score} 分</title></circle>`).join('')}
    ${pts.map((p, i) => (n <= 8 || i % Math.ceil(n / 8) === 0) ? `<text class="wx" x="${x(i).toFixed(1)}" y="${H - 12}" text-anchor="middle">${h(p.d.slice(5, 10))}</text>` : '').join('')}
  </svg>`;
}
function chTri(sum) {
  const R = [58, 44, 30], C = ['#a8821b', '#1f6fb3', '#0e8f5a'], K = ['all', 'tk', 'em'], N = ['技能水平', '操作票五项', '应急处置四项'];
  return `<svg viewBox="0 0 260 150" class="chtri">${K.map((k, i) => {
    const v = sum[k], p = v == null ? 0 : v / 100, r = R[i], cir = 2 * Math.PI * r;
    return `<g data-tri="${k}" class="tri ${v == null ? 'na' : ''}"><circle cx="75" cy="75" r="${r}" class="trk"/><circle cx="75" cy="75" r="${r}" stroke="${C[i]}" class="trv" stroke-dasharray="${(cir * p).toFixed(1)} ${cir.toFixed(1)}" transform="rotate(-90 75 75)"/>
      <text x="150" y="${34 + i * 34}" class="trn">${N[i]}</text><text x="252" y="${34 + i * 34}" class="trv2" text-anchor="end" fill="${C[i]}">${v == null ? '暂无' : v}</text>
      <rect x="150" y="${40 + i * 34}" width="102" height="5" rx="2.5" class="trk2"/><rect x="150" y="${40 + i * 34}" width="${102 * p}" height="5" rx="2.5" fill="${C[i]}"/></g>`;
  }).join('')}</svg>`;
}

/* ---------- 场景中心：六个陪练场景 ---------- */
function pageCenter() {
  const A = homeAgg(), AB = abilityCalc(), lastTk = allRecs().find(r => r.src === 'tk');
  const cards = new Set(EMG.map(e => e.card)).size;
  const SC_ = typeof SC_DEF !== 'undefined' ? SC_DEF : {};
  const sc = k => AB.scene[k];
  const stat = k => sc(k).cnt ? `本期 ${sc(k).score} 分 · 练过 ${sc(k).cnt} 次` : '尚未练过';
  const dimTag = k => `<span class="tag dim4t">${DIM4_MAP[SCENE_MAP[k].dim].short}</span>`;
  return `<div class="wrap">
    <div class="ph"><h2>场景中心</h2><span class="sub">六个陪练场景 · 对应安全能力成熟度四个维度　选场景进入陪练</span></div>
    <div class="scgrid">
      <div class="card scbig ho">
        <div class="ch"><b>两票填写陪练</b>${dimTag('tk')}<span class="r note">${h(TICKET_META.station)} · 第一种工作票</span></div>
        <div class="scsub"><div class="scsubi"><b>操作票陪练</b><p class="sct">${h(TICKET_META.task)}</p>
          <div class="scm"><span><i>给出</i>主接线图 · 运行方式 · 7 个屏柜附表</span><span><i>判卷</i>标准票 ${TICKET.filter(s => !s.parent).length} 项 · ${TICKET_DANGER.length} 条危险操作 · 依据安规与电气操作导则</span></div>
          <div class="scgo"><button class="btn pri" data-start="tk:teach">训练模式</button><button class="btn" data-start="tk:exam">考核模式</button><button class="btn g" data-go="ticket">上传已填好的票</button></div></div>
          <div class="scsubi"><b>工作票陪练</b><p class="sct">${h((SC_.wt || {}).task || '变电站第一种工作票 · 安全措施填写')}</p>
          <div class="scm"><span><i>给出</i>工作任务 · 工作地点 · 运行方式</span><span><i>判卷</i>停电 · 验电 · 接地 · 遮栏与标示牌逐项比对 · 本平台按安规拟定，待业务确认</span></div>
          <div class="scgo"><button class="btn pri" data-start="wt::teach">训练模式</button><button class="btn" data-start="wt::exam">考核模式</button></div></div></div>
        <div class="scft"><span><i>能力</i>操作顺序 · 漏项控制 · 文字规范 · 危险辨识 · 二次与压板</span><span class="note">${stat('tk')}${lastTk ? ' · 最近 ' + lastTk.score + ' 分' : ''}</span></div>
      </div>
      <div class="card scbig hg">
        <div class="ch"><b>应急处置陪练</b>${dimTag('em')}<span class="r note">变电管理一所巡维中心</span></div>
        <p class="sct">${cards} 类应急处置卡 · ${EMG.length} 个情境 · 情境由 AI 生成，每次不同</p>
        <div class="scm"><span><i>作答</i>处置要点（可口述）→ 事例纠错 → 信息报送</span><span><i>点评</i>逐项判定，意思对即得分，补充遗漏的处置卡原文</span>
          <span><i>依据</i>应急处置卡 · 场景归类表 · 应急信息报送工作指引</span><span><i>能力</i>快速决策 · 知识储备 · 风险识别 · 高效上报</span></div>
        <div class="emcatrow">${EMG_CAT.map(c => `<span class="chip" data-emcat="${c.k}">${c.n} ${EMG.filter(e => e.cat === c.k).length}</span>`).join('')}</div>
        <div class="scgo"><button class="btn pri" data-start="em">选择情境</button><span class="note">已练 ${A.scenes.size}/${EMG.length} 个情境 · ${A.cards.size}/${cards} 类处置卡 · ${stat('em')}</span></div>
      </div>
      ${['rule', 'life', 'case', 'inst'].map(k => { const S = SCENE_MAP[k], D = SC_[k] || {}; return `<div class="card scbig ${k === 'rule' || k === 'inst' ? 'hg' : 'ho'}">
        <div class="ch"><b>${h(S.n)}</b>${dimTag(k)}<span class="r note">${h(D.src || '')}</span></div>
        <p class="sct">${h(D.title || S.sub)}</p>
        <div class="scm">${(D.how || []).map(x => `<span><i>${h(x[0])}</i>${h(x[1])}</span>`).join('')}<span><i>能力</i>${skillsOf(k).map(d => d.n).join(' · ')}</span></div>
        ${D.chips ? `<div class="emcatrow">${D.chips.map(c => `<span class="chip" data-start="${k}:${c[0]}:teach">${h(c[1])}</span>`).join('')}</div>` : ''}
        <div class="scgo"><button class="btn pri" data-start="${k}::teach">训练模式</button><button class="btn" data-start="${k}::exam">考核模式</button><span class="note">${stat(k)}</span></div>
      </div>`; }).join('')}
    </div>
  </div>`;
}

/* ---------- AI 智能测评：个人安全能力评估报告（四维度成熟度 · 六场景雷达 · 每次演练的自动分析） ---------- */
function anaOf(r) {
  /* 一次演练 / 考试的自动分析：指标得分、失分原因与依据、班组对比、建议 */
  const T = teamAvgOf(), dims = skillsOf(r.src).map(d => ({ d, v: r.dims ? r.dims[d.k] : null, team: T.dims[d.k] }));
  let causes = [];
  if (r.src === 'tk') { const res = tkJudge(r.rows || []); causes = res.errs.slice().sort((a, b) => (b.fatalHit ? 1 : 0) - (a.fatalHit ? 1 : 0)).slice(0, 5).map(e => ({ t: ERR_KINDS[e.kind].n + '：' + e.title, at: '第 ' + e.stdNo + ' 项', why: e.fix || '', cite: (e.cites || []).map(c => c.no).join(' / ') })); }
  else if (r.src === 'em') { const e = EMGMAP[r.eid]; const sc = emgScore(e, r.a || {}, r.sec); causes = sc.pts.filter(x => x.st !== 'ok').map(x => ({ t: (x.st === 'part' ? '要点不完整：' : '要点遗漏：') + x.t, at: '处置要点 ' + (x.i + 1), why: '', cite: '应急处置卡' })).concat(sc.bads.filter(x => x.st !== 'ok').map(x => ({ t: '事例问题未指出：' + x.t, at: '事例纠错', why: x.note, cite: '注意事项' }))).concat(sc.rep.filter(x => x.st !== 'ok').map(x => ({ t: '报送未提及：' + x.t, at: '信息报送', why: '', cite: '报送指引' }))).slice(0, 6); if (sc.dims.e1 != null && sc.dims.e1 < 60) causes.push({ t: '作答偏慢：用时 ' + Math.round(r.sec / 60) + ' 分钟，基准 ' + Math.round(emTBase(e) / 60) + ' 分钟', at: '快速决策', why: '先把要点说出来，再补充细节', cite: '' }); }
  else causes = (r.wrong || []).slice(0, 6).map(w => ({ t: w.t, at: w.at || '', why: w.why || '', cite: w.cite || '' }));
  const weak = dims.filter(x => x.v != null).sort((a, b) => a.v - b.v).slice(0, 2);
  const sug = weak.map(x => recoFor({ s: x.d, k: x.d.k, g: x.d.g, n: x.d.n, v: x.v, none: false }));
  return { dims, causes, weak, sug, next: typeof rvNext === 'function' ? rvNext(r) : '' };
}
function anaDrill(id) {
  const r = recById(id); if (!r) return;
  const A = anaOf(r);
  openDrill(`自动分析 · ${r.n}`, `${h(r.sub)} · ${stampOf(r.ts)} · ${h(r.mode)} · ${Math.round((r.sec || 0) / 60)} 分钟`, `
    <div class="rvhead"><div class="rvbig ${r.pass ? '' : 'wv'}">${r.score}</div><div><div class="hrow">${r.pass ? '<span class="tag ok">合格</span>' : '<span class="tag rl">不合格</span>'} ${(r.fatal || []).map(f => '<span class="tag rl">' + h(f) + '</span>').join(' ')}</div><div class="hrow">失分点：${h((r.sum || []).join('、') || '无')}</div></div></div>
    <div class="sec"><div class="st">指标得分 · 本次 vs 班组均值</div><table class="htbl"><tr><th>指标</th><th>本次</th><th>班组均值</th><th>差距</th></tr>${A.dims.map(x => `<tr><td class="hitv" data-dim="${x.d.k}" style="cursor:pointer">${x.d.n}</td><td class="mono ${x.v == null ? '' : x.v >= 75 ? 'gv' : 'wv'}">${x.v == null ? '—' : x.v}</td><td class="mono">${x.team}</td><td class="mono ${x.v == null ? '' : x.v - x.team >= 0 ? 'gv' : 'wv'}">${x.v == null ? '—' : (x.v - x.team >= 0 ? '+' : '') + (x.v - x.team)}</td></tr>`).join('')}</table></div>
    <div class="sec"><div class="st">失分原因与依据</div>${A.causes.length ? `<table class="htbl"><tr><th>问题</th><th>位置</th><th>说明</th><th>依据</th></tr>${A.causes.map(c => `<tr><td>${h(c.t)}</td><td class="mono">${h(c.at)}</td><td class="tk3">${h(c.why)}</td><td class="tk3">${h(c.cite)}</td></tr>`).join('')}</table>` : '<div class="hrow">没有判出失分项。</div>'}</div>
    <div class="sec"><div class="st">改进建议</div><div class="hrow"><em class="ai">AI</em> ${h(A.next)}</div>${A.sug.map(x => `<div class="hrow">· ${h(x.why)} → ${h(x.n)}</div>`).join('')}</div>
    <div class="tk3">分析由判定结果与班组均值自动生成；能力结论由班组长确认后使用。</div>`,
    `<button class="btn" data-rec="${r.id}">打开完整报告</button>${A.sug[0] ? `<button class="btn pri" data-start="${A.sug[0].spec}">去练「${h(A.sug[0].n)}」</button>` : ''}`);
}
function asReportText() {
  const AB = abilityCalc(), M = AB.mat, W = weakOrder(), T = teamAvgOf();
  const strong = W.filter(x => !x.none).slice(-3).reverse(), weak = W.slice(0, 3);
  const L = [`${HOME_USER.name} · 个人安全能力评估报告（${stamp()}）`, `岗位：${HOME_USER.post} · ${HOME_USER.team} · ${HOME_USER.dept}`,
    `安全能力成熟度：${M.pct == null ? '待练' : M.pct + '（' + M.lv + '）'}；班组均值 ${T.mat}${M.prev != null && M.pct != null ? '；较上期 ' + (M.pct - M.prev >= 0 ? '+' : '') + (M.pct - M.prev) : ''}`,
    '四个能力维度：' + M.dims.map(d => `${d.n} ${d.score == null ? '待练' : d.score + '（' + maturityLv(d.score) + '）'}`).join('；'),
    '六个场景：' + SCENES.map(x => `${x.n} ${AB.scene[x.k].score == null ? '未练' : AB.scene[x.k].score + ' 分 · ' + AB.scene[x.k].cnt + ' 次'}`).join('；'),
    '优势项：' + (strong.map(x => `${x.n} ${x.v}`).join('、') || '—'),
    '短板项：' + weak.map(x => `${x.n} ${x.none ? '未练' : x.v}`).join('、'),
    '近期演练：' + allRecs().slice(0, 5).map(r => `${stampOf(r.ts)} ${r.n} ${r.score} 分`).join('；'),
    '建议：' + weak.slice(0, 2).map(x => recoFor(x)).map(R => `${R.why} → ${R.n}`).join('；'),
    '说明：成熟度为系统测算参考，能力结论由班组长确认后使用。'];
  return L.join('\n');
}
function pageAssess() {
  const AB = abilityCalc(), M = AB.mat, T = teamAvgOf(), d = PLAT.drill;
  const recent = allRecs().slice(0, 8);
  const grp = d ? skillsOf(d.k) : null;
  return `<div class="wrap">
    <div class="ph"><h2>AI 智能测评</h2><span class="sub">个人安全能力评估报告 · 四维度成熟度 · 六场景雷达 · 每次演练与考试的自动分析</span>
      <span class="r"><button class="btn s" id="asreport">生成个人评估报告</button><button class="btn s g" id="asexp">导出报告</button></span></div>
    <div class="asrow as3">
      <div class="card"><div class="ch"><b>安全能力成熟度</b><span class="note">${h(HOME_USER.name)} · ${h(HOME_USER.post)} · 点击看构成</span></div>${chMaturity(M)}</div>
      <div class="card"><div class="ch"><b>安全能力雷达</b><span class="note">六个场景各一份 · 点顶点看明细</span></div><div id="radarbox">${radarBox()}</div></div>
      <div class="card"><div class="ch"><b>四个能力维度</b><span class="note">本期 · 上期 · 班组均值 · 点行看指标体系</span></div>
        <table class="tb s"><tr><th>维度</th><th>场景</th><th>上期</th><th>本期</th><th>班组</th><th>等级</th></tr>${M.dims.map(x => `<tr class="dimrow" data-tri="${x.k}" style="cursor:pointer"><td><b>${h(x.short)}</b></td><td class="note">${x.scenes.map(y => SCENE_MAP[y.k].short).join(' · ')}</td><td class="mono">${x.prev == null ? '—' : x.prev}</td><td class="mono ${x.score == null ? '' : x.score >= 75 ? 'gv' : 'wv'}">${x.score == null ? '待练' : x.score}</td><td class="mono">${T.dim[x.k]}</td><td><span class="tag ${x.score == null ? '' : x.score >= 75 ? 'ok' : 'wn'}">${maturityLv(x.score)}</span></td></tr>`).join('')}</table>
        <div class="note" style="margin-top:6px">维度得分＝所属场景本期得分的平均；成熟度＝四维度平均。由班组长确认后使用。</div></div>
    </div>
    ${d ? `<div class="card"><div class="ch"><b>${h(DIM4_MAP[d.k].n)} · 指标体系</b><span class="note">本期为最近 3 次均值，上期为再往前 3 次</span><span class="r"><button class="btn s g" id="asclose">收起</button></span></div>
      <table class="tb"><tr><th>场景</th><th>指标</th><th>定义</th><th style="width:70px">上期</th><th style="width:160px">本期</th><th style="width:70px">班组</th><th></th></tr>${DIM4_MAP[d.k].scenes.map(k => skillsOf(k).map(it => { const sc = AB.scene[k]; const v = sc.now[it.k], pv = sc.prev[it.k]; return `<tr><td class="note">${SCENE_N[k]}</td><td><b>${h(it.n)}</b></td><td class="note">${h(it.d)}</td><td class="mono">${pv == null ? '—' : pv}</td><td><div class="bar"><i style="width:${v == null ? 0 : v}%"></i></div><span class="mono">${v == null ? '待练' : v}</span></td><td class="mono">${T.dims[it.k]}</td><td><button class="btn s" data-dim="${it.k}">明细</button></td></tr>`; }).join('')).join('')}</table>
    </div>` : ''}
    <div class="card"><div class="ch"><b>演练与考试 · 自动分析</b><span class="note">每次提交后自动生成：得分、指标、失分原因与依据、班组对比、改进建议</span></div>
      ${recent.map(r => `<div class="asrec"><span class="tag ${r.src === 'tk' ? '' : 'ok'}">${h(SCENE_MAP[r.src] ? SCENE_MAP[r.src].short : r.src)}</span><b>${h(r.sub)}</b><span class="note">${stampOf(r.ts)} · ${h(r.mode)}</span>
        <span class="mono">${r.score}</span><span class="tag ${r.pass ? 'ok' : 'bad'}">${r.pass ? '合格' : '不合格'}</span>
        <span class="note">${h((r.sum || []).join('、') || '无明显短板')}</span>
        <button class="btn s pri" data-ana="${r.id}">看分析</button><button class="btn s" data-rec="${r.id}">完整报告</button></div>`).join('')}
    </div>
  </div>`;
}

/* ---------- 可视化数据分析：横向对比（班组 / 部门 / 岗位 / 人员） ---------- */
function chLines4(TW, w) {
  w = w || 560; const H = 210, L = 36, R = 14, T = 16, B = 34, n = TW.labels.length;
  const y = v => T + (1 - v / 100) * (H - T - B), x = i => L + i / (n - 1) * (w - L - R);
  const C = { kn: '#1f6fb3', op: '#0e8f5a', em: '#c9a227', rv: '#8a5bb3' };
  return `<svg viewBox="0 0 ${w} ${H}" class="chw">
    ${[40, 60, 80, 100].map(v => `<line class="wg" x1="${L}" y1="${y(v)}" x2="${w - R}" y2="${y(v)}"/><text class="wx" x="${L - 5}" y="${y(v) + 3}" text-anchor="end">${v}</text>`).join('')}
    <line class="wp" x1="${L}" y1="${y(75)}" x2="${w - R}" y2="${y(75)}"/><text class="wx p" x="${w - R}" y="${y(75) - 4}" text-anchor="end">熟练线 75</text>
    ${DIM4.map(d => `<path d="${TW[d.k].map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1)).join(' ')}" fill="none" stroke="${C[d.k]}" stroke-width="2"/>${TW[d.k].map((v, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="3.2" fill="${C[d.k]}"><title>${d.n} · ${TW.labels[i]} ${v}</title></circle>`).join('')}`).join('')}
    ${TW.labels.map((l, i) => `<text class="wx" x="${x(i).toFixed(1)}" y="${H - 12}" text-anchor="middle">${h(l)}</text>`).join('')}
  </svg><div class="lgd sm">${DIM4.map(d => `<b><i style="background:${C[d.k]}"></i>${d.short}</b>`).join('')}</div>`;
}
function pageAnalytics() {
  const recs = platFiltered(), views = pvList(), P = peersNow(), A = homeAgg();
  const sel = (k, opts) => `<select data-pf="${k}"><option value="">全部</option>${opts.map(o => `<option value="${o[0]}" ${PLAT.f[k] === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')}</select>`;
  const uniq = k => PEERS.map(p => [p[k], p[k]]).filter((v, i, a) => a.findIndex(x => x[0] === v[0]) === i);
  const C4 = { kn: '#1f6fb3', op: '#0e8f5a', em: '#c9a227', rv: '#8a5bb3' };
  const byDay = {}; recs.forEach(r => { const d = Math.max(0, Math.round((Date.now() - r.t) / 864e5)); if (d > 29) return; (byDay[d] = byDay[d] || { min: 0, cnt: 0 }); byDay[d].min += Math.max(1, Math.round((r.sec || 0) / 60)); byDay[d].cnt += 1; });
  const heat = v => { const t = Math.max(0, Math.min(1, (v - 40) / 60)); return `<div class="heatc" style="background:color-mix(in srgb,var(--ac) ${Math.round((.08 + t * .7) * 100)}%,transparent);color:${t > .55 ? '#fff' : 'var(--acd)'}">${v}</div>`; };
  const teams = {}; P.forEach(p => { (teams[p.team] = teams[p.team] || []).push(p); });
  return `<div class="wrap">
    <div class="ph"><h2>可视化数据分析</h2><span class="sub">横向对比：班组 / 部门 / 岗位 / 人员之间的四维度与六场景得分 · 多条件筛选，筛选后图表联动刷新</span>
      <span class="r"><button class="btn s g" id="pvsave">保存为自定义视图</button><button class="btn s g" id="pvexp">导出</button></span></div>
    <div class="card pfil">
      <label>陪练场景${sel('scene', SCENES.map(x => [x.k, x.n]))}</label>
      <label>难度等级${sel('diff', [['低', '低'], ['中', '中'], ['高', '高']])}</label>
      <label>部门${sel('dept', uniq('dept'))}</label>
      <label>岗位${sel('post', uniq('post'))}</label>
      <label class="rng">得分区间 <input type="number" id="pflo" value="${PLAT.f.lo}" min="0" max="100"> – <input type="number" id="pfhi" value="${PLAT.f.hi}" min="0" max="100"></label>
      <label class="rng2">时间范围 近 <input type="range" id="pfday" min="7" max="365" value="${PLAT.f.days}"> <b id="pfdayv">${PLAT.f.days}</b> 天</label>
      <span class="note">命中 ${recs.length} 条记录 · ${P.length} 人</span>
      ${views.length ? '<span class="pvl">自定义视图：' + views.map((v, i) => `<b data-pvgo="${i}">${h(v.n)}</b>`).join('') + '</span>' : ''}
    </div>
    <div class="anrow">
      <div class="card"><div class="ch"><b>多人员横向对比 · 四个能力维度</b><span class="note">分组柱状图 · 筛选范围内人员</span></div>
        ${P.length ? chGroupBar(P.map(p => p.n), DIM4.map(d => ({ n: d.short, c: C4[d.k], v: P.map(p => p.dim4[d.k] == null ? 0 : p.dim4[d.k]) }))) : '<div class="empty">筛选范围内没有人员</div>'}
        <div class="lgd sm">${DIM4.map(d => `<b><i style="background:${C4[d.k]}"></i>${d.short}</b>`).join('')}</div>
        <table class="tb s rk"><tr><th>排名</th><th>姓名</th><th>班组</th><th>成熟度</th>${DIM4.map(d => `<th>${d.short}</th>`).join('')}</tr>
        ${P.slice().sort((a, b) => b.mat - a.mat).map((p, i) => `<tr class="${p.n === HOME_USER.name ? 'me' : ''}"><td class="mono">${i + 1}</td><td>${h(p.n)}</td><td class="note">${h(p.team)}</td><td class="mono"><b>${p.mat}</b> <span class="note">${maturityLv(p.mat)}</span></td>${DIM4.map(d => `<td class="mono">${p.dim4[d.k] == null ? '—' : p.dim4[d.k]}</td>`).join('')}</tr>`).join('')}</table>
      </div>
      <div class="card"><div class="ch"><b>班组四维度均分趋势</b><span class="note">近 8 周 · 组织级口径</span></div>${chLines4(TREND_W)}
        <div class="ch2"><b>班组对比 · 成熟度均值</b></div>
        ${platBars(Object.keys(teams).map(t => ({ n: t, v: Math.round(teams[t].reduce((a, p) => a + p.mat, 0) / teams[t].length) })), ' 分')}
      </div>
    </div>
    <div class="anrow">
      <div class="card"><div class="ch"><b>人员 × 六个场景 得分矩阵</b><span class="note">筛选范围内人员 · 颜色越深得分越高</span></div>
        <div class="theat" style="grid-template-columns:72px repeat(${SCENES.length},1fr)"><div class="heath"></div>${SCENES.map(x => `<div class="heath">${x.short}</div>`).join('')}
        ${P.map(p => `<div class="heatn">${h(p.n)}</div>${SCENES.map(x => heat(p.sc[x.k] || 0)).join('')}`).join('')}</div>
      </div>
      <div class="card"><div class="ch"><b>场景聚合统计</b><span class="note">群体共性错误与普遍短板，为培训提供依据</span></div>
        <div class="ch2"><b>两票填写 · 共性错误</b></div>
        ${platBars(PEER_ERR.map(e => ({ n: e[0], v: e[1] })), ' 人次')}
        <div class="ch2"><b>应急处置 · 普遍短板</b></div>
        ${platBars(PEER_EM.map(e => ({ n: e[0], v: e[1] })), ' 人次')}
        <div class="note">结论：写票失分集中在编号与屏柜附表不一致和漏项，建议把「屏柜附表逐项核对」列为下一轮必训内容；应急处置失分集中在信息报送与事例纠错，建议集中学一次《应急信息报送工作指引》并加练触电、有限空间两个情境。</div>
      </div>
    </div>
    <div class="anrow">
      <div class="card"><div class="ch"><b>演练用时与次数</b><span class="note">近30天 · 按日 · 筛选范围内记录 · 点某天看明细</span></div>${chCombo(byDay, { w: 720, h: 190 })}</div>
      <div class="card"><div class="ch"><b>演练原始行为记录</b><span class="note">各场景的失分点</span></div>
        <table class="tb"><tr><th>时间</th><th>场景</th><th>难度</th><th>用时</th><th>得分</th><th>结论</th><th>失分点</th><th></th></tr>
        ${recs.slice(0, 12).map(r => `<tr><td>${h(r.d)}</td><td>${h(r.sceneN)}</td><td>${h(r.diff)}</td><td>${Math.floor(r.sec / 60)}分${r.sec % 60}秒</td><td class="mono">${r.score}</td><td>${r.pass ? '<span class="tag ok">合格</span>' : '<span class="tag bad">不合格</span>'}</td><td class="note">${h(r.sum.join('、') || '—')}</td><td><button class="btn s" data-rec="${r.id}">看报告</button></td></tr>`).join('') || '<tr><td colspan="8" class="note">没有符合条件的记录</td></tr>'}</table>${recs.length > 12 ? `<div class="note">共 ${recs.length} 条，导出可得全部。</div>` : ''}</div>
    </div>
  </div>`;
}

/* ---------- 系统与权限 ---------- */
function pageSys() {
  const nPts = EMG.reduce((s, e) => s + e.pts.length, 0), nCase = EMG.filter(e => e.cs).length;
  return `<div class="wrap">
    <div class="ph"><h2>系统与权限</h2><span class="sub">权限与系统管理板块　本次开发普通员工视角，另外两类角色在界面上完整展示</span></div>
    <div class="card"><div class="ch"><b>角色与权限</b></div>
      <table class="tb"><tr><th>角色</th><th>本次</th><th>可以做</th><th>不可以</th></tr>
      ${ROLE_MX.map(r => `<tr><td><b>${h(r.r)}</b></td><td>${r.on ? '<span class="tag ok">本次开发</span>' : '<span class="tag">界面展示</span>'}</td><td>${r.can.map(x => '<div>· ' + h(x) + '</div>').join('')}</td><td class="note">${r.no.map(x => '<div>' + h(x) + '</div>').join('') || '—'}</td></tr>`).join('')}</table></div>
    <div class="card"><div class="ch"><b>标准票与判卷规则版本</b><span class="note">标准票发布后冻结，修改必须生成新版本；历史答卷始终用当时版本复现</span></div>
      <table class="tb"><tr><th>项目</th><th>内容</th></tr>
        <tr><td>标准票</td><td>${h(TICKET_META.task)}　<span class="tag">${h(TICKET_META.ver)} 已发布冻结</span></td></tr>
        <tr><td>判卷标注</td><td>${TICKET.length} 行：${TICKET_META.stages.length} 个设备状态阶段、${Array.from(new Set(TICKET.map(s => s.grp))).length} 个换序组、${TICKET.filter(s => s.miss === '整票不合格').length} 处漏写即整票不合格、3 档文字要求</td></tr>
        <tr><td>危险操作规则</td><td>${TICKET_DANGER.map(d => h(d.n)).join('；')}　规则优先级高于普通扣分</td></tr>
        <tr><td>制度文件库</td><td>${RULE_DOCS.map(d => h(d.short)).join(' · ')}　共 ${RULES.length} 条可检索条款，每条可追溯到文件名、条款编号与条文正文</td></tr>
        <tr><td>操作票扣分配置</td><td>漏项 ${TICKET_CFG.miss} · 顺序错误 ${TICKET_CFG.order} · 阶段越界 ${TICKET_CFG.cross} · 文字不规范 ${TICKET_CFG.text} · 无关步骤 ${TICKET_CFG.extra} · 及格 ${TICKET_CFG.pass}</td></tr>
        <tr><td>应急处置计分配置</td><td>处置要点 ${EMG_CFG.pts} · 事例纠错 ${EMG_CFG.notes} · 信息报送每项 +${EMG_CFG.bonus}（封顶 100） · 及格 ${EMG_CFG.pass}；四项指标：快速决策（用时对基准）· 知识储备 · 风险识别 · 高效上报</td></tr>
        <tr><td>安全能力成熟度</td><td>四个维度：${DIM4.map(d => d.n + '（' + d.scenes.map(k => SCENE_N[k]).join('、') + '）').join('；')}；分级 待提升 &lt;60 · 合格 60–74 · 熟练 75–89 · 精通 ≥90；由班组长确认后使用</td></tr>
      </table></div>
    <div class="card"><div class="ch"><b>案例库与题库</b><span class="note">系统管理员维护；此处展示当前已接入的内容</span></div>
      <table class="tb"><tr><th>类别</th><th>数量</th><th>来源</th></tr>
        <tr><td>标准操作票</td><td class="mono">1 张 / ${TICKET.length} 行</td><td class="note">${h(TICKET_META.src)}</td></tr>
        <tr><td>屏柜附表</td><td class="mono">${TICKET_META.gear.length} 个屏柜 / ${TICKET_META.gear.reduce((s, g) => s + g.rows.length, 0)} 项</td><td class="note">${h(TICKET_META.src)}</td></tr>
        <tr><td>应急处置卡</td><td class="mono">${new Set(EMG.map(e => e.card)).size} 类 / ${EMG.length} 个情境 / 处置要点 ${nPts} 条</td><td class="note">${h(EMG_SRC)}</td></tr>
        <tr><td>事例纠错</td><td class="mono">${nCase} 个事例</td><td class="note">按注意事项编写</td></tr>
        <tr><td>随堂测验</td><td class="mono">${QUIZ.length} 题</td><td class="note">试卷、典型票、处置卡与报送指引</td></tr>
        <tr><td>制度条款</td><td class="mono">${RULES.length} 条</td><td class="note">安规及释义 · 电气操作导则</td></tr>
      </table></div>
    <div class="card"><div class="ch"><b>通用功能</b></div>
      <div class="sysf">${[['演练上下文记忆', '完整保存整场演练的全部作答，用于后续复盘分析'], ['压力模式开关', '写票开启后有调度来电打断、限时 20 分钟'], ['演练计时', '记录完成演练的耗时，写在演练档案里'], ['演练存档', '每一次演练生成唯一档案，本机存储，随时调回看完整过程'], ['文件上传', 'Word / Excel 操作票离线解析后直接判卷'], ['数据导出', '判卷结果、点评结果、分析明细导出为表格文件，用于测评归档']].map(x => `<div><b>${h(x[0])}</b><span>${h(x[1])}</span></div>`).join('')}</div></div>
  </div>`;
}

/* ---------- 挂载与交互 ---------- */
function platAfter(page) {
  if (page === 'assess') {
    const c = $('#asclose'); if (c) c.onclick = () => { PLAT.drill = null; goPage('assess'); };
    const rp = $('#asreport'); if (rp) rp.onclick = () => openDrill('个人安全能力评估报告', HOME_USER.name + ' · 由系统生成，能力结论由班组长确认后使用', `<div class="draft" id="asrep_txt" style="white-space:pre-line">${h(asReportText())}</div>`, '<button class="btn" data-copy="asrep_txt">复制</button>');
    const ex = $('#asexp'); if (ex) ex.onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + asReportText()], { type: 'text/plain' })); a.download = HOME_USER.name + '_个人安全能力评估报告.txt'; a.click(); toast('评估报告已导出', 'ok'); };
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
  const L = [['时间', '场景', '难度', '用时(秒)', '得分', '结论', '失分点']];
  recs.forEach(r => L.push([r.d, r.sceneN, r.diff, r.sec, r.score, r.pass ? '合格' : '不合格', r.sum.join('；')]));
  const csv = '﻿' + L.map(x => x.map(c => '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"').join(',')).join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = '演练数据分析.csv'; a.click(); toast('已导出，可用 Excel 打开归档', 'ok');
}
document.addEventListener('click', e => {
  const an = e.target.closest('[data-ana]'); if (an) return anaDrill(an.dataset.ana);
  const t = e.target.closest('[data-tri]');
  if (t && (location.hash || '').includes('assess')) { PLAT.drill = PLAT.drill && PLAT.drill.k === t.dataset.tri ? null : { k: t.dataset.tri }; goPage('assess'); }
  const pv = e.target.closest('[data-pvgo]');
  if (pv) { const v = pvList()[+pv.dataset.pvgo]; if (v) { PLAT.f = Object.assign({}, v.f); goPage('analytics'); } }
});
