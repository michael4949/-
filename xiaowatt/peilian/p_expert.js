/* ===== 场景 E · 专家选聘答辩页：数字人评委提问 → 学员作答 → 按标准打分 → 逐句点评 + 亮点 + 改进 ===== */

const EP = {
  on: false, i: 0, rounds: [], dh: null, sec: 0, timer: null, stress: false, res: null, asked: [],
  /* 可定制的陪练 AI：性别、性格、年龄、教育背景、角色身份、情绪状态、语言风格 */
  cfg: { sex: 'f', temper: '严谨', age: '45 岁', edu: '硕士 · 电气工程', role: '技术评委', mood: '平静', style: '书面严谨', name: '评委 · 林岚' }
};
const EP_OPT = {
  sex: [['f', '女'], ['m', '男']],
  temper: [['严谨', '严谨'], ['温和', '温和'], ['犀利', '犀利']],
  age: [['38 岁', '38 岁'], ['45 岁', '45 岁'], ['52 岁', '52 岁']],
  edu: [['本科 · 电力系统', '本科 · 电力系统'], ['硕士 · 电气工程', '硕士 · 电气工程'], ['博士 · 高电压技术', '博士 · 高电压技术']],
  role: [['评委长', '评委长'], ['技术评委', '技术评委'], ['人资评委', '人资评委']],
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
  return epIntroHTML();
}
function epIntroHTML() {
  const recs = expRecords();
  const sel = (k, cur) => `<select data-epcfg="${k}">${EP_OPT[k].map(o => `<option value="${h(o[0])}" ${o[0] === cur ? 'selected' : ''}>${h(o[1])}</option>`).join('')}</select>`;
  return `<div class="wrap epwrap">
    <div class="ph"><h2>专家选聘答辩</h2><span class="sub">E 类 · 职业发展　${h(EP_META_KIND())}　评价标准：${h(EXP_META.src)}</span></div>
    <div class="card"><div class="ch"><b>场景说明</b></div>
      <p class="epintro">${h(EXP_META.intro)}本次共 ${EXP_Q.length} 类问题，抽 5 题作答。系统按硬性指标（关键词命中、合规红线、流程步骤）、软性指标（表达、共情、逻辑、情绪）、结果指标（任务是否达成、是否满意）三类打分，并折算到核心能力评价标准的实用性、先进性、创新性三项。</p>
      <div class="epstd"><b>核心能力评价标准（100 分）</b>${EXP_STD.core.map(s => `<span><i>${h(s.n)}</i>${s.w} 分</span>`).join('')}</div>
      <div class="epstd"><b>招标竞聘评价标准（100 分）</b>${EXP_STD.bid.map(s => `<span><i>${h(s.n)}</i>${s.w} 分</span>`).join('')}</div>
    </div>
    <div class="card"><div class="ch"><b>定制陪练 AI</b><span class="note">性别 · 性格 · 年龄 · 教育背景 · 角色身份 · 情绪状态 · 语言风格</span></div>
      <div class="epcfg">
        <label>性别${sel('sex', EP.cfg.sex)}</label><label>性格${sel('temper', EP.cfg.temper)}</label><label>年龄${sel('age', EP.cfg.age)}</label>
        <label>教育背景${sel('edu', EP.cfg.edu)}</label><label>角色身份${sel('role', EP.cfg.role)}</label><label>情绪状态${sel('mood', EP.cfg.mood)}</label><label>语言风格${sel('style', EP.cfg.style)}</label>
      </div>
      <div class="tkgo"><label class="tkmd stress" style="margin-right:12px"><input type="checkbox" id="epstress"><b>压力模式</b><span>评委追问 · 每题限时 3 分钟</span></label><button class="btn pri" id="epstart">开始答辩</button></div>
    </div>
    <div class="card"><div class="ch"><b>我的答辩档案</b><span class="note">完整保存整场交互内容，可回看</span></div>
      ${recs.length ? `<table class="tb"><tr><th>时间</th><th>用时</th><th>核心能力得分</th><th>结论</th><th>短板</th><th></th></tr>${recs.map((r, i) => `<tr><td>${h(r.d)}</td><td>${Math.floor(r.sec / 60)}分${r.sec % 60}秒</td><td class="mono">${r.core}</td><td>${r.core >= 60 ? '<span class="tag ok">通过</span>' : '<span class="tag bad">未通过</span>'}</td><td class="note">${h((r.weak || []).join('、') || '无')}</td><td><button class="btn s" data-epopen="${i}">回看</button></td></tr>`).join('')}</table>` : '<div class="empty">还没有答辩记录</div>'}
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
  EP.res = { core, bid, coreSum, bidSum, dims, rounds: EP.rounds, avg, weak, sec: EP.sec };
  EP.on = false;
  expSave({ d: stamp(), sec: EP.sec, core: coreSum, bid: bidSum, weak, dims, rounds: EP.rounds.map(r => ({ qn: r.q.n, qt: r.qt, ans: r.ans, total: r.sc.total, good: r.sc.good, bad: r.sc.bad })) });
  goPage('expert');
}
function epResultHTML() {
  const r = EP.res;
  const lvTag = l => `<span class="tag ${l[0] === '优秀' ? 'ok' : l[0] === '良好' ? '' : 'w'}">${l[0]}</span>`;
  return `<div class="wrap epwrap">
    <div class="ph"><h2>答辩测评报告</h2><span class="sub">${h(EXP_META.kind)}　用时 ${Math.floor(r.sec / 60)} 分 ${r.sec % 60} 秒　评委 ${h(EP.cfg.name)}（${h(EP.cfg.role)}）</span>
      <span class="r"><button class="btn s" id="epagain">再答一次</button><button class="btn s g" id="epexport">导出报告</button></span></div>
    <div class="epres">
      <div class="card epsc ${r.coreSum >= 60 ? 'ok' : 'bad'}"><b>${r.coreSum}</b><span>核心能力评价 / 100</span><div class="verd">${r.coreSum >= 80 ? '优秀' : r.coreSum >= 60 ? '通过' : '未通过'}</div>
        <div class="note">招标竞聘评价标准折算 ${r.bidSum} 分</div></div>
      <div class="card"><div class="ch"><b>核心能力评价标准</b><span class="note">实用性 40 · 先进性 30 · 创新性 30</span></div>
        ${r.core.map(c => `<div class="epline"><b>${h(c.item.n)}</b>${lvTag(c.lv)}<div class="bar"><i style="width:${Math.round(c.sc / c.item.w * 100)}%"></i></div><span class="mono">${c.sc}/${c.item.w}</span><p class="note">${h(c.lv[1])}</p></div>`).join('')}</div>
      <div class="card"><div class="ch"><b>通用能力</b><span class="note">素质模型五项 · 由各题得分映射</span></div>
        ${r.dims.map(d => `<div class="epline"><b>${h(d.n)}</b><div class="bar"><i style="width:${d.v == null ? 0 : d.v}%"></i></div><span class="mono">${d.v == null ? '本次未考' : d.v}</span></div>`).join('')}</div>
    </div>
    <div class="card"><div class="ch"><b>招标竞聘评价标准</b><span class="note">必要性 20 · 可行性 45 · 价值性 20 · 创新性 15</span></div>
      <table class="tb"><tr><th>评价指标</th><th>得分</th><th>档次</th><th>评分标准</th></tr>
      ${r.bid.map(c => `<tr><td><b>${h(c.item.n)}</b>（${c.item.w} 分）</td><td class="mono">${c.sc}</td><td>${lvTag(c.lv)}</td><td class="note">${h(c.lv[1])}</td></tr>`).join('')}</table></div>
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
  $$('[data-epcfg]').forEach(s => s.onchange = () => {
    EP.cfg[s.dataset.epcfg] = s.value;
    EP.cfg.name = (EP.cfg.sex === 'f' ? '评委 · 林岚' : '评委 · 周建国');
  });
  const b = $('#epstart'); if (b) b.onclick = () => epStart($('#epstress') && $('#epstress').checked);
}
function epExport() {
  const r = EP.res; if (!r) return;
  const L = [['题目类别', '问题', '作答', '得分', '亮点', '改进']];
  r.rounds.forEach(x => L.push([x.q.n, x.qt, x.ans, x.sc.total, x.sc.good.join('；'), x.sc.bad.join('；')]));
  L.push([]); L.push(['核心能力评价标准', '得分', '档次', '评分标准']);
  r.core.forEach(c => L.push([c.item.n + '（' + c.item.w + '分）', c.sc, c.lv[0], c.lv[1]]));
  const csv = '﻿' + L.map(x => x.map(c => '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"').join(',')).join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = '专家选聘答辩测评报告.csv'; a.click(); toast('测评报告已导出', 'ok');
}
document.addEventListener('click', e => {
  const op = e.target.closest('[data-epopen]');
  if (!op) return;
  const rec = expRecords()[+op.dataset.epopen]; if (!rec) return;
  EP.res = { core: EXP_STD.core.map(it => Object.assign({ pct: 0 }, expLevel(it.k, rec.core))), bid: EXP_STD.bid.map(it => Object.assign({ pct: 0 }, expLevel(it.k, rec.bid))), coreSum: rec.core, bidSum: rec.bid, dims: rec.dims, sec: rec.sec, weak: rec.weak,
    rounds: rec.rounds.map(x => ({ q: EXP_Q.find(q => q.n === x.qn) || EXP_Q[0], qt: x.qt, ans: x.ans, sc: { total: x.total, good: x.good, bad: x.bad, hitKeys: [], star: [], red: [], len: (x.ans || '').length }, follow: null })) };
  EP.on = false; goPage('expert');
});
