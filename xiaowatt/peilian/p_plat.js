/* ===== 平台四页：场景中心（操作票填写 · 应急处置）· AI 智能测评（技能水平九项）· 可视化数据分析 · 系统与权限 ===== */

/* 横向对比与群体统计用的同批次人员（脱敏模拟，人物全部虚拟） */
const PEERS = [
  { n: '任玲玲', dept: '变电管理一所', post: '变电运行值班员', tk: 0, em: 0 },
  { n: '陈志远', dept: '变电管理一所', post: '变电运行值班负责人', tk: 95, em: 90 },
  { n: '林 岚', dept: '变电管理一所', post: '变电运行值班员', tk: 74, em: 79 },
  { n: '周建国', dept: '变电管理一所', post: '班组长', tk: 91, em: 88 },
  { n: '吴 倩', dept: '变电管理二所', post: '变电运行值班员', tk: 62, em: 70 },
  { n: '郭子扬', dept: '变电管理二所', post: '变电运行主值', tk: 83, em: 76 }
];
const PEER_ERR = [['编号与屏柜附表不一致', 34], ['漏项', 29], ['顺序错误', 16], ['危险操作', 6], ['文字不规范', 21], ['阶段越界', 5]];
const PEER_EM = [['信息报送未说“在检查中”', 23], ['事例漏指单人进入高压场所', 14], ['有限空间未先检测就施救', 11], ['处置要点漏答心肺复苏', 9], ['未断开着火设备电源', 6]];
/* 权限矩阵：本次开发普通员工视角，另外两类角色在界面上完整展示 */
const ROLE_MX = [
  { r: '普通参训用户', on: true, can: ['参与操作票填写、应急处置两大场景演练', '查看个人演练报告与个人数据分析视图', '导出本人测评报告'], no: ['不可查看其他用户数据'] },
  { r: '人力资源测评 / 业务负责人', on: false, can: ['查看所辖部门全部人员演练数据', '使用全部筛选、对比分析功能', '导出测评报告'], no: ['不允许修改案例库'] },
  { r: '系统管理员', on: false, can: ['管理标准票、应急处置卡与事例库、用户账号、系统配置', '发布标准票并冻结版本', '维护制度文件库'], no: [] }
];

/* ---------- 统一演练记录（两个场景合流，供筛选与分析） ---------- */
function platRecords() {
  return allRecs().map(r => ({ id: r.id, d: r.d, t: r.ts, scene: r.src, sceneN: r.src === 'tk' ? '操作票填写' : '应急处置 · ' + ((EMGMAP[r.eid] || {}).card || ''), score: r.score, pass: r.pass, sec: r.sec || 0,
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
function peersNow() { const L = allRecs(); const avg = s => { const a = L.filter(r => r.src === s); return a.length ? Math.round(a.reduce((x, r) => x + r.score, 0) / a.length) : 0; }; return PEERS.map(p => p.n === HOME_USER.name ? Object.assign({}, p, { tk: avg('tk'), em: avg('em') }) : p).filter(p => (!PLAT.f.dept || p.dept === PLAT.f.dept) && (!PLAT.f.post || p.post === PLAT.f.post)); }
/* 能力测评取数：九项 + 两组汇总 */
function m9Scores() {
  const ab = abilityCalc();
  const items = SKILL9.map((s, i) => Object.assign({ v: ab.now[i], p: ab.prev[i] }, s));
  const avg = l => Math.round(l.reduce((a, x) => a + x.v, 0) / l.length);
  const tk = items.filter(x => x.g === 'tk'), em = items.filter(x => x.g === 'em');
  return { items, tk, em, sum: { all: avg(items), tk: avg(tk), em: avg(em) }, n: { tk: allRecs().filter(r => r.src === 'tk').length, em: allRecs().filter(r => r.src === 'em').length } };
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

/* ---------- 场景中心 ---------- */
function pageCenter() {
  const A = homeAgg(), lastTk = allRecs().find(r => r.src === 'tk');
  const cards = new Set(EMG.map(e => e.card)).size;
  return `<div class="wrap">
    <div class="ph"><h2>场景中心</h2><span class="sub">两大场景：操作票填写 · 应急处置　选场景进入演练</span></div>
    <div class="scduo">
      <div class="card scbig ho">
        <div class="ch"><b>操作票填写</b><span class="tag ok">可演练</span><span class="r note">${h(TICKET_META.station)}</span></div>
        <p class="sct">${h(TICKET_META.task)}</p>
        <div class="scm"><span><i>给出</i>主接线图 · 正常运行方式 · 7 个屏柜附表（空开、压板、把手）</span><span><i>作答</i>逐项填写或上传 Word / Excel 操作票</span>
          <span><i>判卷</i>标准票 ${TICKET.filter(s => !s.parent).length} 项 · 子项 ${TICKET.filter(s => s.parent).length} 项 · ${TICKET_META.stages.length} 个状态阶段 · ${TICKET_DANGER.length} 条危险操作 · 依据安规与电气操作导则</span>
          <span><i>能力</i>操作顺序 · 漏项控制 · 文字规范 · 危险辨识 · 二次与压板</span></div>
        <div class="scgo"><button class="btn pri" data-start="tk:teach">训练模式</button><button class="btn" data-start="tk:exam">考核模式</button><button class="btn g" data-go="ticket">上传已填好的票</button><span class="note">${lastTk ? '最近 ' + lastTk.score + ' 分' : '尚未练过'}</span></div>
      </div>
      <div class="card scbig hg">
        <div class="ch"><b>应急处置</b><span class="tag ok">可演练</span><span class="r note">变电管理一所巡维中心</span></div>
        <p class="sct">${cards} 类应急处置卡 · ${EMG.length} 个情境</p>
        <div class="scm"><span><i>作答</i>处置要点（可口述）→ 事例纠错 → 信息报送</span><span><i>点评</i>逐项判定，补充遗漏的处置卡原文；注意事项为关键得分点</span>
          <span><i>依据</i>应急处置卡 · 场景归类表 · 应急信息报送工作指引</span><span><i>能力</i>处置要点完整 · 关键注意事项 · 信息报送 · 现场急救与自我防护</span></div>
        <div class="emcatrow">${EMG_CAT.map(c => `<span class="chip" data-emcat="${c.k}">${c.n} ${EMG.filter(e => e.cat === c.k).length}</span>`).join('')}</div>
        <div class="scgo"><button class="btn pri" data-start="em">选择情境</button><span class="note">已练 ${A.scenes.size}/${EMG.length} 个情境 · ${A.cards.size}/${cards} 类处置卡</span></div>
      </div>
    </div>
  </div>`;
}

/* ---------- AI 智能测评：技能水平九项，两个场景分组，分层下钻 ---------- */
function pageAssess() {
  const S = m9Scores(), d = PLAT.drill;
  const grp = d && d.k !== 'all' ? S[d.k] : d ? S.items : null;
  const tag = v => v >= 80 ? 'g' : v >= 60 ? 'y' : 'r';
  return `<div class="wrap">
    <div class="ph"><h2>AI 智能测评</h2><span class="sub">技能水平 · 操作票填写五项 + 应急处置四项　每项都能追到具体演练记录</span></div>
    <div class="asrow as3">
      <div class="card"><div class="ch"><b>能力地图</b><span class="note">点环或点分组下钻到指标</span></div>${chTri(S.sum)}
        <div class="asn">演练次数：操作票 ${S.n.tk} · 应急处置 ${S.n.em}</div></div>
      ${[['tk', '操作票填写 · 五项', '取自每次操作票判卷结果', '《110kV考核站操作票考核试卷》· 安规 · 电气操作导则'], ['em', '应急处置 · 四项', '取自每次应急处置点评', '应急处置卡 · 场景归类表 · 应急信息报送工作指引']].map(([k, n, src, doc]) => `<div class="card asdim" data-tri="${k}">
        <div class="ch"><b>${n}</b><span class="tag ok">本次落地</span></div>
        <p class="note">${src}</p>
        <div class="asv"><b>${S.sum[k]}</b><span>/100</span></div>
        <div class="asm2">${doc}</div>
        <div class="asl">${S[k].map(it => `<span class="${tag(it.v)}">${h(it.n)} ${it.v}</span>`).join('')}</div>
      </div>`).join('')}
    </div>
    ${grp ? `<div class="card"><div class="ch"><b>${d.k === 'tk' ? '操作票填写' : d.k === 'em' ? '应急处置' : '技能水平'} · 指标体系</b><span class="note">本期为最近 3 次均值，上期为再往前 3 次</span><span class="r"><button class="btn s g" id="asclose">收起</button></span></div>
      <table class="tb"><tr><th>指标</th><th>场景</th><th>定义</th><th style="width:70px">上期</th><th style="width:160px">本期</th><th></th></tr>${grp.map(it => `<tr><td><b>${h(it.n)}</b></td><td class="note">${SCENE_N[it.g]}</td><td class="note">${h(it.d)}</td><td class="mono">${it.p}</td><td><div class="bar"><i style="width:${it.v}%"></i></div><span class="mono">${it.v}</span></td><td><button class="btn s" data-dim="${SK_K.indexOf(it.k)}">明细</button></td></tr>`).join('')}</table>
    </div>` : ''}
    <div class="card"><div class="ch"><b>最近测评结论</b><span class="note">演练报告（个人版）：演练过程、得分、AI 点评、能力短板、改进建议</span></div>
      ${platRecords().slice(0, 8).map(r => `<div class="asrec"><span class="tag ${r.scene === 'tk' ? '' : 'ok'}">${r.scene === 'tk' ? '操作票' : '应急'}</span><b>${h(r.sceneN)}</b><span class="note">${h(r.d)}</span>
        <span class="mono">${r.score}</span><span class="tag ${r.pass ? 'ok' : 'bad'}">${r.pass ? '合格' : '不合格'}</span>
        <span class="note">${h(r.sum.join('、') || '无明显短板')}</span>
        <button class="btn s" data-rec="${r.id}">看报告</button></div>`).join('')}
    </div>
  </div>`;
}

/* ---------- 可视化数据分析 ---------- */
function pageAnalytics() {
  const recs = platFiltered(), S = m9Scores(), views = pvList(), P = peersNow();
  const lastTk = allRecs().find(r => r.src === 'tk');
  let wf = null;
  if (lastTk) {
    const res = tkJudge(lastTk.rows || []);
    const map = { miss: '漏项', order: '顺序错误', cross: '阶段越界', text: '文字不规范', level: '层级错误', extra: '无关步骤' };
    wf = Object.keys(map).map(k => ({ n: map[k], v: res.errs.filter(e => e.kind === k).reduce((s, e) => s + (e.deduct || 0), 0) })).filter(x => x.v > 0);
  }
  const emR = recs.filter(r => r.scene === 'em').map(r => r.raw);
  const emLoss = emR.length ? (() => { const s = emR.map(r => emgScore(EMGMAP[r.eid], r.a || {})); const av = f => Math.round(s.reduce((a, x) => a + f(x), 0) / s.length * 10) / 10; return [{ n: '处置要点失分', v: av(x => x.ptot - x.sp) }, { n: '事例纠错失分', v: av(x => x.hasN ? EMG_CFG.notes - x.sn : 0) }, { n: '信息报送未得', v: av(x => x.rep.length * EMG_CFG.bonus - x.sb) }]; })() : [];
  const days = recs.slice().reverse().map(r => ({ id: r.id, d: r.d, scene: r.scene, sceneN: r.sceneN, score: r.score }));
  const sel = (k, opts) => `<select data-pf="${k}"><option value="">全部</option>${opts.map(o => `<option value="${o[0]}" ${PLAT.f[k] === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')}</select>`;
  const uniq = k => PEERS.map(p => [p[k], p[k]]).filter((v, i, a) => a.findIndex(x => x[0] === v[0]) === i);
  return `<div class="wrap">
    <div class="ph"><h2>可视化数据分析</h2><span class="sub">点击下钻 · 拖动时间滑块 · 多条件组合筛选，筛选后图表联动刷新</span>
      <span class="r"><button class="btn s g" id="pvsave">保存为自定义视图</button><button class="btn s g" id="pvexp">导出</button></span></div>
    <div class="card pfil">
      <label>演练场景${sel('scene', [['tk', '操作票填写'], ['em', '应急处置']])}</label>
      <label>难度等级${sel('diff', [['低', '低'], ['中', '中'], ['高', '高']])}</label>
      <label>部门${sel('dept', uniq('dept'))}</label>
      <label>岗位${sel('post', uniq('post'))}</label>
      <label class="rng">得分区间 <input type="number" id="pflo" value="${PLAT.f.lo}" min="0" max="100"> – <input type="number" id="pfhi" value="${PLAT.f.hi}" min="0" max="100"></label>
      <label class="rng2">时间范围 近 <input type="range" id="pfday" min="7" max="365" value="${PLAT.f.days}"> <b id="pfdayv">${PLAT.f.days}</b> 天</label>
      <span class="note">命中 ${recs.length} 条记录</span>
      ${views.length ? '<span class="pvl">自定义视图：' + views.map((v, i) => `<b data-pvgo="${i}">${h(v.n)}</b>`).join('') + '</span>' : ''}
    </div>
    <div class="anrow">
      <div class="card"><div class="ch"><b>个人能力雷达</b><span class="note">技能水平九项 · 本人 vs 班组均值 · 点顶点看明细</span></div>
        ${chRadar(SK_N, S.items.map(x => x.v), TEAM_AVG9, { l1: '本人', l2: '班组均值' })}
      </div>
      <div class="card"><div class="ch"><b>多次演练得分趋势</b><span class="note">蓝点操作票 · 绿点应急处置 · 点数据点进对应报告</span></div>
        ${days.length > 1 ? chLine(days) : '<div class="empty">至少两次演练才能看趋势</div>'}
      </div>
    </div>
    <div class="anrow">
      <div class="card"><div class="ch"><b>操作票扣分来源拆解</b><span class="note">瀑布图 · 取最近一次操作票判卷结果</span></div>
        ${wf && wf.length ? chWaterfall(100, wf) : '<div class="empty">最近一次操作票判卷没有扣分项（整票不合格的危险操作不计入瀑布图）</div>'}
        <div class="note">分值为判卷配置项：漏项 ${TICKET_CFG.miss} · 顺序错误 ${TICKET_CFG.order} · 阶段越界 ${TICKET_CFG.cross} · 文字不规范 ${TICKET_CFG.text}。</div>
      </div>
      <div class="card"><div class="ch"><b>应急处置失分构成</b><span class="note">筛选范围内各次点评的平均失分</span></div>
        ${emLoss.length ? platBars(emLoss, ' 分') : '<div class="empty">筛选范围内没有应急处置记录</div>'}
        <div class="note">处置要点满分 ${EMG_CFG.pts}（无注意事项的情境 100），事例纠错满分 ${EMG_CFG.notes}，信息报送每项 ${EMG_CFG.bonus} 分。</div>
      </div>
    </div>
    <div class="anrow">
      <div class="card"><div class="ch"><b>多人员横向对比</b><span class="note">分组柱状图 · 两个场景并排对比</span></div>
        ${P.length ? chGroupBar(P.map(p => p.n), [{ n: '操作票填写', c: '#1f6fb3', v: P.map(p => p.tk) }, { n: '应急处置', c: '#0e8f5a', v: P.map(p => p.em) }]) : '<div class="empty">筛选范围内没有人员</div>'}
        <div class="lgd sm"><b><i style="background:#1f6fb3"></i>操作票填写</b><b><i style="background:#0e8f5a"></i>应急处置</b></div>
        <table class="tb s rk"><tr><th>排名</th><th>姓名</th><th>部门</th><th>综合</th></tr>
        ${P.map(p => ({ p, v: Math.round((p.tk + p.em) / 2) })).sort((a, b) => b.v - a.v).map((x, i) => `<tr><td class="mono">${i + 1}</td><td>${h(x.p.n)}</td><td class="note">${h(x.p.dept)}</td><td class="mono">${x.v}</td></tr>`).join('')}</table>
      </div>
      <div class="card"><div class="ch"><b>场景聚合统计</b><span class="note">群体共性错误与普遍短板，为培训提供依据</span></div>
        <div class="ch2"><b>操作票填写 · 共性错误</b></div>
        ${platBars(PEER_ERR.map(e => ({ n: e[0], v: e[1] })), ' 人次')}
        <div class="ch2"><b>应急处置 · 普遍短板</b></div>
        ${platBars(PEER_EM.map(e => ({ n: e[0], v: e[1] })), ' 人次')}
        <div class="note">结论：写票失分集中在编号与屏柜附表不一致和漏项，建议把「屏柜附表逐项核对」列为下一轮必训内容；应急处置失分集中在信息报送与事例纠错，建议集中学一次《应急信息报送工作指引》并加练触电、有限空间两个情境。</div>
      </div>
    </div>
    <div class="card"><div class="ch"><b>演练原始行为记录</b><span class="note">操作票的错误清单、应急处置的失分点</span></div>
      <table class="tb"><tr><th>时间</th><th>场景</th><th>难度</th><th>用时</th><th>得分</th><th>结论</th><th>失分点</th><th></th></tr>
      ${recs.map(r => `<tr><td>${h(r.d)}</td><td>${h(r.sceneN)}</td><td>${h(r.diff)}</td><td>${Math.floor(r.sec / 60)}分${r.sec % 60}秒</td><td class="mono">${r.score}</td><td>${r.pass ? '<span class="tag ok">合格</span>' : '<span class="tag bad">不合格</span>'}</td><td class="note">${h(r.sum.join('、') || '—')}</td><td><button class="btn s" data-rec="${r.id}">看报告</button></td></tr>`).join('') || '<tr><td colspan="8" class="note">没有符合条件的记录</td></tr>'}</table></div>
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
        <tr><td>应急处置计分配置</td><td>处置要点 ${EMG_CFG.pts} · 事例纠错 ${EMG_CFG.notes} · 信息报送每项 +${EMG_CFG.bonus}（封顶 100） · 及格 ${EMG_CFG.pass}</td></tr>
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
  if (page === 'assess') { const c = $('#asclose'); if (c) c.onclick = () => { PLAT.drill = null; goPage('assess'); }; }
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
  const t = e.target.closest('[data-tri]');
  if (t && (location.hash || '').includes('assess')) { PLAT.drill = PLAT.drill && PLAT.drill.k === t.dataset.tri ? null : { k: t.dataset.tri }; goPage('assess'); }
  const pv = e.target.closest('[data-pvgo]');
  if (pv) { const v = pvList()[+pv.dataset.pvgo]; if (v) { PLAT.f = Object.assign({}, v.f); goPage('analytics'); } }
});
