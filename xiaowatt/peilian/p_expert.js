/* ===== 场景 E · 专家选聘答辩页：数字人评委提问 → 学员作答 → 按标准打分 → 逐句点评 + 亮点 + 改进 ===== */

const EP = {
  on: false, i: 0, rounds: [], dh: null, sec: 0, timer: null, stress: false, res: null, asked: [], kind: 'skill', stage: 'intro', perf: {}, perfDone: false, site: {},
  /* 可定制的陪练 AI：性别、性格、年龄、教育背景、角色身份、情绪状态、语言风格 */
  cfg: { sex: 'f', temper: '严谨', age: '45 岁', edu: '硕士 · 电气工程', role: '业务评委', mood: '平静', style: '书面严谨', name: '评委 · 林岚' }
};
const EP_OPT = {
  sex: [['f', '女'], ['m', '男']],
  temper: [['严谨', '严谨'], ['温和', '温和'], ['犀利', '犀利']],
  age: [['38 岁', '38 岁'], ['45 岁', '45 岁'], ['52 岁', '52 岁']],
  edu: [['本科 · 电力系统', '本科 · 电力系统'], ['硕士 · 电气工程', '硕士 · 电气工程'], ['博士 · 高电压技术', '博士 · 高电压技术']],
  role: EXP_PANEL.map(x => [x[0], x[0] + '（' + x[1] + '）']),
  mood: [['平静', '平静'], ['专注', '专注'], ['追问', '追问']],
  style: [['书面严谨', '书面严谨'], ['口语平实', '口语平实'], ['简短直接', '简短直接']]
};
function epChar() { const c = EP.cfg; return { name: c.name.split('·').pop().trim(), role: c.role, sex: c.sex, img: c.sex === 'f' ? 'term' : 'daozha', tint: c.temper === '犀利' ? '#b3541f' : c.temper === '温和' ? '#0e8f5a' : '#1f7fb3' }; }
function epSay(q, extra) {
  const c = EP.cfg;
  const pre = c.style === '简短直接' ? '' : c.style === '口语平实' ? '那我问你一个：' : '请你回答第 ' + (EP.i + 1) + ' 个问题。';
  const tail = c.mood === '追问' ? '　回答完我可能会追问一句。' : '';
  return (extra || '') + pre + q + tail;
}

/* ---------- 页面 ---------- */
function pageExpert() {
  if (EP.res) return epResultHTML();
  if (EP.on) return epRunHTML();
  if (EP.stage === 'perf') return epPerfHTML();
  return epIntroHTML();
}
function epIntroHTML() {
  const recs = expRecords();
  const K = expKind(EP.kind);
  const sel = (k, cur) => `<select data-epcfg="${k}">${EP_OPT[k].map(o => `<option value="${h(o[0])}" ${o[0] === cur ? 'selected' : ''}>${h(o[1])}</option>`).join('')}</select>`;
  const pr = EP.perfDone ? perfCalc(EP.perf) : null;
  const ach = EXP_ACH[K.face];
  return `<div class="wrap epwrap">
    <div class="ph"><h2>专家选聘答辩</h2><span class="sub">E 类 · 职业发展　评价标准：《专家选聘面试答辩评价标准》附件6 · 《专家选聘工作方案》附件1 · 《技能专家业绩贡献评价标准》附件5-5</span></div>
    <div class="card"><div class="ch"><b>选择专家类别</b><span class="note">五大类可选，不同类别的面试答辩标准与综合评价权重不同</span></div>
      <div class="epkinds">${EXP_KINDS.map(x => `<div class="epk ${x.k === EP.kind ? 'on' : ''}" data-epkind="${x.k}"><b>${h(x.n)}</b><span>${x.w.map(w => w[0] + ' ' + w[2] + '%').join(' · ')}</span></div>`).join('')}</div>
      <p class="epintro"><b>定位</b>${h(K.pos)}。<b>面试答辩</b>${h(K.faceNote)}。</p>
      <div class="epstd"><b>综合评价各环节分数占比</b>${K.w.map(w => `<span><i>${h(w[0])}</i>${w[2]}%</span>`).join('')}</div>
      ${K.face === 'core' ? `<div class="epstd"><b>核心能力评价标准（100 分）</b>${EXP_STD.core.map(x => `<span><i>${h(x.n)}</i>${x.w} 分</span>`).join('')}</div>` : `<div class="epstd"><b>${h(ach.n)}</b>${ach.items.map(x => `<span><i>${h(x.n)}</i>权重 ${x.w}%</span>`).join('')}</div>`}
      <div class="epstd"><b>${K.face === 'core' ? '招标竞聘评价标准（100 分）' : '发展潜力评价 · 招标竞聘（100 分）'}</b>${EXP_STD.bid.map(x => `<span><i>${h(x.n)}</i>${x.w} 分</span>`).join('')}</div>
    </div>
    <div class="card"><div class="ch"><b>业绩贡献自测</b><span class="note">答辩前先做，按《技能专家业绩贡献评价标准》逐项自评，与面试得分一起折算综合分数</span>
      <span class="r"><button class="btn ${pr ? 's g' : 'pri'}" id="epperf">${pr ? '重新自测 / 修改填报' : '开始业绩自测'}</button></span></div>
      ${pr ? `<div class="epperfsum"><div class="big"><b>${pr.total}</b><span>业绩贡献自评 / 100</span></div>
        ${pr.groups.map(g => `<div class="pg"><span>${h(g.g)}</span><b class="mono">${g.sum}</b>${g.capped ? '<i class="tag w">已达上限</i>' : ''}</div>`).join('')}</div>`
      : '<div class="empty">还没有做业绩自测。业绩评价占比最高（技能专家 40%、专业技术专家 60%），建议先自评再答辩，报告会把两部分合起来给结论与建议。</div>'}
    </div>
    <div class="card"><div class="ch"><b>场景说明</b></div>
      <p class="epintro">${h(EXP_META.intro)}本次共 ${EXP_Q.length} 类问题，抽 5 题作答。系统按硬性指标（关键词命中、合规红线、流程步骤）、软性指标（表达、共情、逻辑、情绪）、结果指标（任务是否达成、是否满意）三类打分，并折算到${K.face === 'core' ? '核心能力评价标准的实用性、先进性、创新性三项' : ach.items.map(x => x.n).join('、') + '三项'}。</p>
      <div class="eppanel"><b>面试答辩专家组</b>${EXP_PANEL.map(x => `<span><i>${h(x[0])}</i>${h(x[1])}</span>`).join('')}</div>
    </div>
    <div class="card"><div class="ch"><b>定制陪练 AI</b><span class="note">性别 · 性格 · 年龄 · 教育背景 · 角色身份 · 情绪状态 · 语言风格</span></div>
      <div class="epcfg">
        <label>性别${sel('sex', EP.cfg.sex)}</label><label>性格${sel('temper', EP.cfg.temper)}</label><label>年龄${sel('age', EP.cfg.age)}</label>
        <label>教育背景${sel('edu', EP.cfg.edu)}</label><label>角色身份${sel('role', EP.cfg.role)}</label><label>情绪状态${sel('mood', EP.cfg.mood)}</label><label>语言风格${sel('style', EP.cfg.style)}</label>
      </div>
      <div class="tkgo"><label class="tkmd stress" style="margin-right:12px"><input type="checkbox" id="epstress"><b>压力模式</b><span>评委追问 · 每题限时 3 分钟</span></label><button class="btn pri" id="epstart">开始答辩</button></div>
    </div>
    <div class="card"><div class="ch"><b>我的答辩档案</b><span class="note">完整保存整场交互内容，可回看</span></div>
      ${recs.length ? `<table class="tb"><tr><th>时间</th><th>类别</th><th>用时</th><th>面试得分</th><th>业绩自评</th><th>综合</th><th>短板</th><th></th></tr>${recs.map((r, i) => `<tr><td>${h(r.d)}</td><td class="note">${h(expKind(r.kind || 'skill').n)}</td><td>${Math.floor(r.sec / 60)}分${r.sec % 60}秒</td><td class="mono">${r.core}</td><td class="mono">${r.perf == null ? '未做' : r.perf}</td><td class="mono">${r.overall == null ? '—' : r.overall}</td><td class="note">${h((r.weak || []).join('、') || '无')}</td><td><button class="btn s" data-epopen="${i}">回看</button></td></tr>`).join('')}</table>` : '<div class="empty">还没有答辩记录</div>'}
    </div>
  </div>`;
}
/* ---------- 业绩贡献自测：按附件5-5 逐项填报，实时算分并给建议 ---------- */
function epPerfHTML() {
  const r = perfCalc(EP.perf);
  const adv = perfAdvice(r, EP.perf);
  const K = expKind(EP.kind);
  const row = (it) => {
    const v = EP.perf[it.c] || {};
    const lvSel = it.type === 'grid' || it.type === 'rank'
      ? `<select data-pf="lv" data-c="${it.c}">${it.lv.map((l, i) => `<option value="${i}" ${(v.lv | 0) === i ? 'selected' : ''}>${h(it.type === 'rank' ? l[0] : l[0])}</option>`).join('')}</select>` : '';
    const roleSel = it.type === 'grid'
      ? `<select data-pf="role" data-c="${it.c}">${it.roles.map((n, i) => `<option value="${i}" ${(v.role | 0) === i ? 'selected' : ''}>${h(n)}</option>`).join('')}</select>` : '';
    const rankSel = it.type === 'rank'
      ? `<select data-pf="rank" data-c="${it.c}">${Array.from({ length: it.lv[(v.lv | 0)] ? it.lv[(v.lv | 0)][3] : 7 }, (x, i) => `<option value="${i + 1}" ${(+v.rank || 1) === i + 1 ? 'selected' : ''}>排名第 ${i + 1}</option>`).join('')}</select>` : '';
    const unit = it.unit || '项';
    return `<tr><td><b>${h(it.n)}</b><span class="note mono"> ${h(it.c)}</span>${it.d ? `<p class="note">${h(it.d)}</p>` : ''}${it.note ? `<p class="pfnote">${h(it.note)}</p>` : ''}</td>
      <td class="pfin">${lvSel}${roleSel}${rankSel}<input type="number" min="0" step="1" data-pf="n" data-c="${it.c}" value="${v.n || 0}"><span class="note">${h(unit)}</span>${it.max ? `<span class="note">限 ${it.max}</span>` : ''}</td>
      <td class="mono pfsc">${perfItemScore(it, v)}</td></tr>`;
  };
  return `<div class="wrap epwrap">
    <div class="ph"><h2>业绩贡献自测</h2><span class="sub">《技能专家业绩贡献评价标准》附件5-5　${h(K.n)}　业绩环节占综合评价 ${K.w[0][2]}%</span>
      <span class="r"><button class="btn s g" id="epperfback">返回</button><button class="btn s g" id="epperfclear">清空重填</button><button class="btn pri" id="epperfok">完成自测，进入答辩</button></span></div>
    <div class="epperf">
      <div>
        ${PERF_STD.map(g => `<div class="card"><div class="ch"><b>${h(g.g)}</b>${g.capNote ? `<span class="note">${h(g.capNote)}</span>` : ''}<span class="r mono">${r.groups.find(x => x.g === g.g).sum} 分</span></div>
          <table class="tb pft"><tr><th>二级指标</th><th style="width:330px">等级 · 角色 · 项数</th><th style="width:56px">得分</th></tr>${g.items.map(row).join('')}</table></div>`).join('')}
      </div>
      <div class="epperfside">
        <div class="card"><div class="ch"><b>自评合计</b></div>
          <div class="big2"><b>${r.total}</b><span>业绩贡献自评 / 100</span></div>
          <table class="tb s">${r.groups.map(g => `<tr><td>${h(g.g)}</td><td class="mono r">${g.sum}${g.capped ? ' <span class="tag w">上限</span>' : ''}</td></tr>`).join('')}
            ${r.linked.map(L => `<tr><td class="note">${h(L.n)} 合计上限 ${L.cap}</td><td class="mono r">${L.raw}${L.over ? ' <span class="tag w">超</span>' : ''}</td></tr>`).join('')}</table>
          <p class="note">自评结果由本人填报，最终得分由评审专家组经组内合议、存疑修正、组织复评确定。</p>
        </div>
        ${expKind(EP.kind).w.some(w => w[1] === 'lab' || w[1] === 'theory') ? `<div class="card"><div class="ch"><b>现场考评成绩</b><span class="note">技能实操与理论水平为集中考评环节，按实际成绩录入</span></div>
          <div class="pfsite"><label>技能实操<input type="number" min="0" max="100" data-site="lab" value="${EP.site.lab == null ? '' : EP.site.lab}" placeholder="0-100"></label>
            <label>理论水平<input type="number" min="0" max="100" data-site="theory" value="${EP.site.theory == null ? '' : EP.site.theory}" placeholder="0-100"></label></div>
          <p class="note">技能实操成绩大于等于 80 分方可进入下一评价环节；高级技师无需参加实操理论考核，成绩按满分计算。</p></div>` : ''}
        <div class="card"><div class="ch"><b>填报建议</b></div>
          ${adv.map(a => `<div class="pfadv"><b>${h(a.t)}</b><span class="tag w">${h(a.s)}</span><p>${h(a.d)}</p></div>`).join('')}
        </div>
      </div>
    </div>
  </div>`;
}
function EP_META_KIND() { return EXP_META.kind; }
function epRunHTML() {
  const r = EP.rounds[EP.i], done = EP.rounds.filter(x => x.ans);
  return `<div class="wrap epwrap">
    <div class="ph"><h2>专家选聘答辩</h2><span class="sub">第 ${EP.i + 1} / ${EP.rounds.length} 题　${h(r.q.n)}</span>
      <span class="tktimer" id="eptimer">00:00</span>${EP.stress ? '<span class="tag bad">压力模式</span>' : ''}</div>
    <div class="eprun">
      <div class="card epdh"><div id="ep_dh" class="dhbox"></div>
        <div class="epwho"><b>${h(EP.cfg.name)}</b><span>${h(EP.cfg.role)} · ${h(EP.cfg.age)} · ${h(EP.cfg.edu)} · ${h(EP.cfg.temper)} · ${h(EP.cfg.style)}</span></div>
        <div class="epsub" id="ep_sub"></div>
        <div class="epprog">${EP.rounds.map((x, i) => `<i class="${i < EP.i ? 'done' : i === EP.i ? 'on' : ''}" title="${h(x.q.n)}"></i>`).join('')}</div>
      </div>
      <div class="card epans">
        <div class="ch"><b>本题</b><span class="tag">${h(r.q.n)}</span><span class="note">对应通用能力：${r.q.dim.join(' / ')}</span></div>
        <div class="epq" id="ep_q"></div>
        <div class="epguide"><i>答辩要点</i><span>${h(r.q.guide)}</span></div>
        <textarea id="ep_in" placeholder="用两三百字回答：先说情境和任务，再说你做了什么，最后给出可检查的结果。"></textarea>
        <div class="bt"><button class="btn g" id="ep_mic">🎙 口述作答</button><button class="btn pri" id="ep_send">提交本题</button>${EP.i ? '<span class="note">已答 ' + done.length + ' 题</span>' : ''}</div>
        <div id="ep_fb"></div>
      </div>
    </div>
  </div>`;
}

/* ---------- 流程 ---------- */
function epStart(stress) {
  EP.on = true; EP.res = null; EP.i = 0; EP.sec = 0; EP.stress = !!stress;
  const first = EXP_Q[0];
  const rest = EXP_Q.slice(1).sort(() => Math.random() - 0.5).slice(0, 4);
  EP.rounds = [first].concat(rest).map(q => ({ q, qt: q.qs[Math.floor(Math.random() * q.qs.length)], ans: '', sc: null, follow: null }));
  goPage('expert');
  if (EP.timer) clearInterval(EP.timer);
  EP.timer = setInterval(() => { EP.sec++; const e = $('#eptimer'); if (e) e.textContent = String(Math.floor(EP.sec / 60)).padStart(2, '0') + ':' + String(EP.sec % 60).padStart(2, '0'); }, 1000);
}
function epAsk() {
  const r = EP.rounds[EP.i];
  const q = $('#ep_q'); if (q) q.textContent = '';
  if (EP.dh) { EP.dh.destroy(); EP.dh = null; }
  EP.dh = new DigitalHuman('ep_dh', epChar());
  const line = epSay(r.qt, EP.i === 0 ? '各位好，答辩开始。' : '');
  const sub = $('#ep_sub'); if (sub) sub.textContent = '';
  EP.dh.speak(line, { onEnd: () => { } });
  let i = 0; const tm = setInterval(() => { i += 2; if (q) q.textContent = r.qt.slice(0, i); if (sub) sub.textContent = line.slice(0, i + 10); if (i >= line.length) clearInterval(tm); }, 26);
}
function epSend() {
  const inp = $('#ep_in'); if (!inp) return;
  const v = inp.value.trim();
  if (v.length < 15) { toast('回答太短，评委看不出内容', 'bad'); return; }
  const r = EP.rounds[EP.i];
  r.ans = v; r.sc = expScore(v, r.q);
  const fb = $('#ep_fb');
  const line = r.sc.total >= 75 ? '这个回答我听明白了。' : r.sc.total >= 55 ? '大致清楚，有两处还要再说细一点。' : '这个回答还不够，评委抓不到你的成果。';
  if (fb) fb.innerHTML = `<div class="epfb"><b>${h(line)}</b>
    <div class="epbar"><span>硬性 ${Math.round((r.sc.hard.key + r.sc.hard.red + r.sc.hard.flow) / 3)}</span><span>软性 ${Math.round((r.sc.soft.say + r.sc.soft.emp + r.sc.soft.logic + r.sc.soft.mood) / 4)}</span><span>结果 ${Math.round((r.sc.outc.done + r.sc.outc.sat) / 2)}</span></div>
    ${r.sc.good.length ? '<div class="epgd"><i>亮点</i>' + r.sc.good.map(x => '<span>' + h(x) + '</span>').join('') + '</div>' : ''}
    ${r.sc.bad.length ? '<div class="epbd"><i>改进</i>' + r.sc.bad.map(x => '<span>' + h(x) + '</span>').join('') + '</div>' : ''}
    <div class="bt"><button class="btn pri" id="ep_next">${EP.i < EP.rounds.length - 1 ? '下一题' : '结束答辩，看评分'}</button>${EP.stress && r.sc.total < 75 ? '<button class="btn g" id="ep_more">评委追问</button>' : ''}</div></div>`;
  if (EP.dh) EP.dh.speak(line, {});
  const nx = $('#ep_next'); if (nx) nx.onclick = epNext;
  const mo = $('#ep_more'); if (mo) mo.onclick = () => {
    const miss = r.sc.bad[0] || '再具体一点';
    r.follow = '你刚才说的这一段，' + miss.replace(/^合规红线：/, '涉及合规的地方，') + '。就这一点再讲一遍。';
    if (EP.dh) EP.dh.speak(r.follow, {});
    fb.insertAdjacentHTML('beforeend', `<div class="epfollow"><b>追问</b><span>${h(r.follow)}</span></div>`);
    inp.value = ''; inp.focus();
  };
}
function epNext() {
  if (EP.i < EP.rounds.length - 1) { EP.i++; goPage('expert'); return; }
  if (EP.timer) { clearInterval(EP.timer); EP.timer = null; }
  if (EP.dh) { EP.dh.destroy(); EP.dh = null; }
  const avg = Math.round(EP.rounds.reduce((s, r) => s + r.sc.total, 0) / EP.rounds.length);
  const core = EXP_STD.core.map(it => {
    const rs = EP.rounds.filter(r => r.q.std === it.k);
    const pct = rs.length ? Math.round(rs.reduce((s, r) => s + r.sc.total, 0) / rs.length) : avg;
    return Object.assign({ pct }, expLevel(it.k, pct));
  });
  const bid = EXP_STD.bid.map(it => {
    const rs = EP.rounds.filter(r => r.q.std === it.k);
    const pct = rs.length ? Math.round(rs.reduce((s, r) => s + r.sc.total, 0) / rs.length) : avg;
    return Object.assign({ pct }, expLevel(it.k, pct));
  });
  const coreSum = core.reduce((s, c) => s + c.sc, 0), bidSum = bid.reduce((s, c) => s + c.sc, 0);
  const dims = expDims(EP.rounds);
  const weak = EP.rounds.slice().sort((a, b) => a.sc.total - b.sc.total).slice(0, 2).map(r => r.q.n);
  const ach = expAch(EP.kind, EP.rounds);
  const pf = EP.perfDone ? perfCalc(EP.perf) : null;
  const ov = expOverall(EP.kind, pf ? pf.total : null, { core: coreSum, bid: bidSum, ach: ach ? ach.sum : null, site: EP.site });
  EP.res = { core, bid, coreSum, bidSum, dims, rounds: EP.rounds, avg, weak, sec: EP.sec, kind: EP.kind, ach, perf: pf, ov };
  EP.on = false;
  expSave({ d: stamp(), kind: EP.kind, site: EP.site, sec: EP.sec, core: coreSum, bid: bidSum, perf: pf ? pf.total : null, overall: ov.sum, weak, dims, rounds: EP.rounds.map(r => ({ qn: r.q.n, qt: r.qt, ans: r.ans, total: r.sc.total, good: r.sc.good, bad: r.sc.bad })) });
  goPage('expert');
}
function epResultHTML() {
  const r = EP.res;
  const lvTag = l => `<span class="tag ${l[0] === '优秀' ? 'ok' : l[0] === '良好' ? '' : 'w'}">${l[0]}</span>`;
  return `<div class="wrap epwrap">
    <div class="ph"><h2>答辩测评报告</h2><span class="sub">${h(expKind(r.kind).n)}　用时 ${Math.floor(r.sec / 60)} 分 ${r.sec % 60} 秒　评委 ${h(EP.cfg.name)}（${h(EP.cfg.role)}）</span>
      <span class="r"><button class="btn s" id="epagain">再答一次</button><button class="btn s g" id="epexport">导出报告</button></span></div>
    <div class="epres">
      <div class="card epsc ${r.coreSum >= 60 ? 'ok' : 'bad'}"><b>${r.coreSum}</b><span>核心能力评价 / 100</span><div class="verd">${r.coreSum >= 80 ? '优秀' : r.coreSum >= 60 ? '通过' : '未通过'}</div>
        <div class="note">招标竞聘评价标准折算 ${r.bidSum} 分</div></div>
      <div class="card"><div class="ch"><b>核心能力评价标准</b><span class="note">实用性 40 · 先进性 30 · 创新性 30${expKind(r.kind).face === 'core' ? '' : '（本类别的面试答辩以代表性成果评价为准，见下表）'}</span></div>
        ${r.core.map(c => `<div class="epline"><b>${h(c.item.n)}</b>${lvTag(c.lv)}<div class="bar"><i style="width:${Math.round(c.sc / c.item.w * 100)}%"></i></div><span class="mono">${c.sc}/${c.item.w}</span><p class="note">${h(c.lv[1])}</p></div>`).join('')}</div>
      <div class="card"><div class="ch"><b>通用能力</b><span class="note">素质模型五项 · 由各题得分映射</span></div>
        ${r.dims.map(d => `<div class="epline"><b>${h(d.n)}</b><div class="bar"><i style="width:${d.v == null ? 0 : d.v}%"></i></div><span class="mono">${d.v == null ? '本次未考' : d.v}</span></div>`).join('')}</div>
    </div>
    <div class="card"><div class="ch"><b>招标竞聘评价标准</b><span class="note">必要性 20 · 可行性 45 · 价值性 20 · 创新性 15</span></div>
      <table class="tb"><tr><th>评价指标</th><th>得分</th><th>档次</th><th>评分标准</th></tr>
      ${r.bid.map(c => `<tr><td><b>${h(c.item.n)}</b>（${c.item.w} 分）</td><td class="mono">${c.sc}</td><td>${lvTag(c.lv)}</td><td class="note">${h(c.lv[1])}</td></tr>`).join('')}</table></div>
    <div class="card"><div class="ch"><b>综合评价 · ${h(expKind(r.kind).n)}</b><span class="note">按《专家选聘工作方案》附件1 三、（二）的环节占比折算　${r.ov.wSum < 100 ? '现场考评环节未录入，下表按已完成环节归一化' : ''}</span></div>
      <table class="tb"><tr><th>评价环节</th><th>占比</th><th>得分</th><th>折合</th><th>取数</th></tr>
      ${r.ov.rows.map(x => `<tr class="${x.part == null ? 'no' : ''}"><td><b>${h(x.n)}</b></td><td class="mono">${x.w}%</td><td class="mono">${x.v == null ? '未录入' : x.v}</td><td class="mono">${x.part == null ? '—' : x.part}</td><td class="note">${h(x.src)}</td></tr>`).join('')}
      <tr><td><b>综合得分</b></td><td class="mono">${r.ov.wSum}%</td><td></td><td class="mono"><b>${r.ov.sum}</b></td><td class="note">已完成环节归一化后 ${r.ov.norm} 分</td></tr></table>
      ${r.perf && r.perf.groups && r.perf.groups.length ? `<div class="ch2"><b>业绩贡献情况与建议</b></div><div class="pfadvs">${perfAdvice(r.perf, EP.perf).map(a => `<div class="pfadv"><b>${h(a.t)}</b><span class="tag w">${h(a.s)}</span><p>${h(a.d)}</p></div>`).join('')}</div>`
        : '<div class="empty">本次没有做业绩自测。业绩环节占比最高，建议回到答辩首页先完成业绩贡献自测，报告才能给出完整的综合得分与业绩建议。</div>'}</div>
    ${r.ach ? `<div class="card"><div class="ch"><b>${h(r.ach.sheet.n)}</b><span class="note">各指标按权重折算，分档与含义照录标准原文</span></div>
      <table class="tb"><tr><th>评价指标</th><th>权重</th><th>得分</th><th>档次</th><th>指标含义</th></tr>
      ${r.ach.items.map(x => `<tr><td><b>${h(x.item.n)}</b></td><td class="mono">${x.item.w}%</td><td class="mono">${x.v == null ? '本次未考' : x.v}</td><td>${x.lv ? `<span class="tag ${x.lv[0] === '优秀' ? 'ok' : x.lv[0] === '良好' ? '' : 'w'}">${x.lv[0]}</span><span class="note"> ${h(x.lv[1])}</span>` : ''}</td><td class="note">${h(x.item.mean)}</td></tr>`).join('')}
      <tr><td><b>合计</b></td><td></td><td class="mono"><b>${r.ach.sum}</b></td><td colspan="2" class="note">按权重加权平均</td></tr></table></div>` : ''}
    <div class="card"><div class="ch"><b>逐题点评</b><span class="note">逐句点评 + 亮点 + 改进</span></div>
      ${r.rounds.map((x, i) => `<div class="eprv"><div class="rh"><span class="tag">${h(x.q.n)}</span><b>${h(x.qt)}</b><span class="r mono">${x.sc.total} 分</span></div>
        <div class="ra">${h(x.ans)}</div>
        <div class="rk"><span>关键词命中 ${x.sc.hitKeys.length}/${x.q.keys.length}</span><span>结构 ${x.sc.star.join('→') || '缺'}</span><span>合规 ${x.sc.red.length ? '<em class="bad">命中红线 ' + x.sc.red.length + '</em>' : '无红线'}</span><span>字数 ${x.sc.len}</span></div>
        ${x.sc.good.length ? '<div class="epgd"><i>亮点</i>' + x.sc.good.map(y => '<span>' + h(y) + '</span>').join('') + '</div>' : ''}
        ${x.sc.bad.length ? '<div class="epbd"><i>改进</i>' + x.sc.bad.map(y => '<span>' + h(y) + '</span>').join('') + '</div>' : ''}
        ${x.follow ? '<div class="epfollow"><b>追问</b><span>' + h(x.follow) + '</span></div>' : ''}</div>`).join('')}</div>
  </div>`;
}

function expertAfter() {
  if (EP.on) { epAsk();
    const m = $('#ep_mic'); if (m) m.onclick = () => micStart(m, $('#ep_in'), EXP_SAMPLE[EP.rounds[EP.i].q.k] || '');
    const s = $('#ep_send'); if (s) s.onclick = epSend;
    return; }
  if (EP.res) {
    const a = $('#epagain'); if (a) a.onclick = () => { EP.res = null; goPage('expert'); };
    const x = $('#epexport'); if (x) x.onclick = epExport;
    return;
  }
  if (EP.stage === 'perf') {
    $$('[data-pf]').forEach(el => {
      const f = el.dataset.pf, c = el.dataset.c;
      const set = () => { const v = EP.perf[c] = EP.perf[c] || {}; v[f] = f === 'n' ? Math.max(0, +el.value || 0) : +el.value; goPage('expert'); };
      if (el.tagName === 'SELECT') el.onchange = set; else { el.onchange = set; el.onkeydown = ev => { if (ev.key === 'Enter') { ev.preventDefault(); set(); } }; }
    });
    $$('[data-site]').forEach(el => { el.onchange = () => { const v = el.value === '' ? null : Math.max(0, Math.min(100, +el.value || 0)); EP.site[el.dataset.site] = v; goPage('expert'); }; });
    const bk = $('#epperfback'); if (bk) bk.onclick = () => { EP.stage = 'intro'; goPage('expert'); };
    const cl = $('#epperfclear'); if (cl) cl.onclick = () => { EP.perf = {}; EP.perfDone = false; goPage('expert'); };
    const ok = $('#epperfok'); if (ok) ok.onclick = () => { EP.perfDone = true; EP.stage = 'intro'; goPage('expert'); toast('业绩自测已记录，综合报告会把业绩与面试按权重合起来', 'ok'); };
    return;
  }
  $$('[data-epkind]').forEach(el => el.onclick = () => { EP.kind = el.dataset.epkind; goPage('expert'); });
  const pf = $('#epperf'); if (pf) pf.onclick = () => { EP.stage = 'perf'; goPage('expert'); };
  $$('[data-epcfg]').forEach(s => s.onchange = () => {
    EP.cfg[s.dataset.epcfg] = s.value;
    EP.cfg.name = (EP.cfg.sex === 'f' ? '评委 · 林岚' : '评委 · 周建国');
  });
  const b = $('#epstart'); if (b) b.onclick = () => epStart($('#epstress') && $('#epstress').checked);
}
function epExport() {
  const r = EP.res; if (!r) return;
  const K = expKind(r.kind);
  const blocks = [];
  blocks.push({ t: '综合评价', sub: '按《专家选聘工作方案》附件1 三、（二）的环节占比折算', head: ['评价环节', '占比', '得分', '折合', '取数'],
    rows: r.ov.rows.map(x => [x.n, x.w + '%', x.v == null ? '未录入' : x.v, x.part == null ? '—' : x.part, x.src])
      .concat([['综合得分', r.ov.wSum + '%', '', r.ov.sum, '已完成环节归一化后 ' + r.ov.norm + ' 分']]),
    mark: (ri, ci) => ci === 3 && ri === r.ov.rows.length ? 'ok' : '' });
  if (r.perf && r.perf.groups && r.perf.groups.length) blocks.push({ t: '业绩贡献自评', sub: '《技能专家业绩贡献评价标准》附件5-5 · 自评结果由本人填报，最终得分以评审专家组复评为准', head: ['一级指标', '得分', '是否触上限'],
    rows: r.perf.groups.map(g => [g.g, g.sum, g.capped ? '是（' + (g.capNote || '') + '）' : '否']).concat([['合计', r.perf.total, '']]) });
  if (r.perf && r.perf.groups && r.perf.groups.length) blocks.push({ t: '业绩贡献情况与建议', head: ['方面', '结论', '建议'], rows: perfAdvice(r.perf, EP.perf).map(a => [a.t, a.s, a.d]) });
  if (K.face === 'core') blocks.push({ t: '核心能力评价标准（100 分）', sub: '实用性 40 · 先进性 30 · 创新性 30', head: ['评价指标', '分值', '得分', '档次', '评分标准'],
    rows: r.core.map(c => [c.item.n, c.item.w, c.sc, c.lv[0], c.lv[1]]).concat([['合计', 100, r.coreSum, r.coreSum >= 80 ? '优秀' : r.coreSum >= 60 ? '通过' : '未通过', '']]),
    mark: (ri, ci, v) => ci === 3 ? (v === '优秀' || v === '通过' ? 'ok' : v === '未通过' ? 'bad' : 'w') : '' });
  if (r.ach) blocks.push({ t: r.ach.sheet.n, head: ['评价指标', '权重', '得分', '档次', '指标含义'],
    rows: r.ach.items.map(x => [x.item.n, x.item.w + '%', x.v == null ? '本次未考' : x.v, x.lv ? x.lv[0] : '', x.item.mean]).concat([['合计', '100%', r.ach.sum, '', '按权重加权平均']]),
    mark: (ri, ci, v) => ci === 3 ? (v === '优秀' ? 'ok' : v === '一般' ? 'w' : '') : '' });
  blocks.push({ t: '招标竞聘评价标准（100 分）', sub: '必要性 20 · 可行性 45 · 价值性 20 · 创新性 15', head: ['评价指标', '分值', '得分', '档次', '评分标准'],
    rows: r.bid.map(c => [c.item.n, c.item.w, c.sc, c.lv[0], c.lv[1]]).concat([['合计', 100, r.bidSum, '', '']]),
    mark: (ri, ci, v) => ci === 3 ? (v === '优秀' ? 'ok' : v === '一般' ? 'w' : '') : '' });
  blocks.push({ t: '通用能力（素质模型五项）', sub: '由各题得分映射', head: ['能力项', '得分'], rows: r.dims.map(d => [d.n, d.v == null ? '本次未考' : d.v]) });
  blocks.push({ t: '逐题点评', head: ['题目类别', '问题', '作答', '得分', '亮点', '改进'],
    rows: r.rounds.map(x => [x.q.n, x.qt, x.ans, x.sc.total, (x.sc.good || []).join('；'), (x.sc.bad || []).join('；')]),
    mark: (ri, ci, v) => ci === 3 ? (v >= 80 ? 'ok' : v < 60 ? 'bad' : 'w') : '' });
  xlsDownload('专家选聘答辩测评报告_' + K.n + '.xls', '专家选聘答辩测评报告', K.n + '　' + new Date().toLocaleString('zh-CN') + '　评委 ' + EP.cfg.name + '（' + EP.cfg.role + '）　评价标准：附件1 选聘工作方案 · 附件5-5 业绩贡献评价标准 · 附件6 面试答辩评价标准', blocks);
  toast('测评报告已导出（.xls，Excel 打开带格式）', 'ok');
}
document.addEventListener('click', e => {
  const op = e.target.closest('[data-epopen]');
  if (!op) return;
  const rec = expRecords()[+op.dataset.epopen]; if (!rec) return;
  const rounds = rec.rounds.map(x => ({ q: EXP_Q.find(q => q.n === x.qn) || EXP_Q[0], qt: x.qt, ans: x.ans, sc: { total: x.total, good: x.good, bad: x.bad, hitKeys: [], star: [], red: [], len: (x.ans || '').length }, follow: null }));
  const kind = rec.kind || 'skill';
  const ach = expAch(kind, rounds);
  const pf = rec.perf == null ? null : { total: rec.perf, groups: [], linked: [] };
  EP.kind = kind; EP.stage = 'intro';
  EP.res = { core: EXP_STD.core.map(it => Object.assign({ pct: 0 }, expLevel(it.k, rec.core))), bid: EXP_STD.bid.map(it => Object.assign({ pct: 0 }, expLevel(it.k, rec.bid))), coreSum: rec.core, bidSum: rec.bid, dims: rec.dims, sec: rec.sec, weak: rec.weak, kind, ach, perf: pf,
    ov: expOverall(kind, rec.perf, { core: rec.core, bid: rec.bid, ach: ach ? ach.sum : null, site: rec.site || {} }), rounds: rounds };
  EP.on = false; goPage('expert');
});
