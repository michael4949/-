/* ===================== 填写操作票（拟票练习）=====================
   位置：进入陪练舱后的第一步，在上岗前准备之前。
   学员按调度预令口述拟写第一段操作项目（票头与项目都是说一项写一项，不从卡片里点选），提交后由系统按审票口径逐条判分，
   给出漏项、多项、顺序错误的详解与原理，再按正确票面进入准备阶段。 */

/* 倒闸操作作业全过程（票的一生），当前处在「拟票」 */
const FLOW = [
  ['接受任务', '值班负责人接调度预令，明确操作任务与时间'],
  ['拟票', '按调度预令和现场设备状态逐项拟写操作票'],
  ['审核', '拟票人自审、监护人复审、值班负责人审核'],
  ['签发', '值班负责人签发，注明操作票编号与拟票时间'],
  ['五防模拟', '在五防主机上按票序模拟，通过后下传电脑钥匙'],
  ['现场操作', '监护人唱票、操作人手指口述复诵、执行后检查回报'],
  ['汇报终结', '逐段汇报调度，操作完毕记录结束时间并归档']
];

/* 票头待填项（正确答案取自本次调度预令） */
const FHEAD = [
  { k: 'unit', n: '发令单位', ok: '深圳中调', opt: ['深圳中调', '深圳地调', '本站值班负责人'],
    why: '本次操作任务由深圳中调下令，发令单位应按实际下令单位填写，不得写成本站或其他调度机构。' },
  { k: 'from', n: '发令人', ok: '李明', opt: ['李明', '陈志远', '任玲玲'],
    why: '发令人是调度侧实际下令的值班调度员，陈志远是本站监护人、任玲玲是操作人，都不能填在发令人栏。' },
  { k: 'to', n: '受令人', ok: '陈志远', opt: ['陈志远', '任玲玲', '李明'],
    why: '受令人须是当值值班负责人或经授权的具备接令资格人员，本次由监护人陈志远接令，操作人不得代为接令。' },
  { k: 'task', n: '操作任务', ok: '将110kV仿真站110kV培训三线1163线路由运行转检修',
    opt: ['将110kV仿真站110kV培训三线1163线路由运行转检修', '将110kV仿真站110kV培训三线1163线路由运行转冷备用', '将培训三线1163开关由运行转检修'],
    why: '操作任务须写全变电站名称、电压等级与设备双重名称，操作对象是线路不是开关；本票最终状态是检修，不是冷备用。' }
];

/* 本段应写入的项目＝第一段（运行 → 热备用）；干扰项取自后两段 */
function fillRight() { return STEPS.filter(s => s.phase === 1); }
function fillWrong() { return ['12', '20', '25', '22.1'].map(no => STEPS.find(s => s.no === no)).filter(Boolean); }
const SEGNAME = { 1: '运行 → 热备用', 2: '热备用 → 冷备用', 3: '冷备用 → 检修' };
function wrongWhy(s) {
  const base = `本项属于「${SEGNAME[s.phase]}」段，调度采用逐项令，须再经调度令后才能执行，不应写入本段操作票。`;
  if (s.no === '20') return base + '并且接地操作必须在两种原理验电合格之后进行，写在本段等于把接地提到验电之前。';
  if (s.no === '25' || s.no === '22.1') return base + '安全措施（挂牌、断二次电源）属于转检修阶段，本段线路尚未隔离到位。';
  return base;
}

function ticketNo() {
  if (!S.fill.no) { const d = new Date(); S.fill.no = `${d.getFullYear()}-变电运行-0217`; }
  return S.fill.no;
}

/* ---------- 渲染：口述拟票（说一项写一项，票头也口述），不从备选卡片里点选 ---------- */
function renderFill() {
  const w = $('#panelwrap'); if (!w) return;
  const chosen = S.fill.rows;
  w.innerHTML =
    pnl('倒闸操作作业全过程', '当前环节：拟票', `
      <div class="fflow">${FLOW.map((f, i) => `<div class="ffs ${i === 1 ? 'cur' : i < 1 ? 'done' : ''}"><i>${i + 1}</i><b>${f[0]}</b><span>${f[1]}</span></div>`).join('')}</div>`) +
    pnl('110kV仿真站 · 变电站倒闸操作票', `编号 ${ticketNo()} · 拟票人 任玲玲`, `
      <div class="exsay fsay"><span class="exsayl">口述拟票</span>
        <button class="mic" id="f_mic" title="语音"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v4"/></svg></button>
        <input class="rin" id="f_in" placeholder="票头：「发令单位深圳中调，发令人…」；项目：动作 + 设备双重名称，说一项写一项">
        <button class="btn pri" id="f_say">写入</button>
        ${S.mode !== 'exam' ? '<button class="btn" id="f_hint">提示</button>' : ''}</div>
      <div class="fhead">
        ${FHEAD.map(f => `<div class="fhr"><div class="k">${f.n}</div><div class="v"><input class="fin" data-fh="${f.k}" value="${S.fill.head[f.k] || ''}" placeholder="口述或填写"></div></div>`).join('')}
        <div class="fhr"><div class="k">操作开始时间</div><div class="v ro">执行第一项时填写</div></div>
        <div class="fhr"><div class="k">操作结束时间</div><div class="v ro">完成最后一项时填写</div></div>
      </div>`) +
    pnl('操作项目 · 第一段（本次调度令范围：运行 → 热备用）', `已写入 ${chosen.length} 项`, `
      <div class="fsheet">
        <div class="fpt">操作票第一段　按执行顺序排列（说错的可以移出，顺序可上移下移）</div>
        ${chosen.length ? chosen.map((no, i) => { const s = STEPS.find(x => x.no === no); return `
          <div class="fsi"><div class="fsn">${i + 1}</div><div class="fst">${s.ticket}</div>
            <div class="fsb"><button class="fbtn" data-fup="${i}" title="上移">↑</button><button class="fbtn" data-fdn="${i}" title="下移">↓</button><button class="fbtn del" data-fdel="${i}" title="移出票面">×</button></div></div>`; }).join('')
          : '<div class="fpe">票面还是空的。按执行顺序把本段的操作项目一项一项说出来，系统逐项写入票面。</div>'}
      </div>
      <div class="ffoot">
        <div class="ffh">拟票要求：只写本次调度令范围内的项目；每一项一个动作；执行项与检查项分列；顺序按先断开关、后拉刀闸、先线路侧后母线侧的逻辑排列。</div>
        <button class="btn pri" id="f_go">提交审核</button>
      </div>`);
  $$('#panelwrap [data-fh]').forEach(n => n.onchange = e => { S.fill.head[n.dataset.fh] = fillHeadVal(n.dataset.fh, e.target.value); e.target.value = S.fill.head[n.dataset.fh]; renderTaskbar(); });
  $$('#panelwrap [data-fup]').forEach(n => n.onclick = () => { const i = +n.dataset.fup; if (i > 0) { const r = S.fill.rows; [r[i - 1], r[i]] = [r[i], r[i - 1]]; renderFill(); } });
  $$('#panelwrap [data-fdn]').forEach(n => n.onclick = () => { const i = +n.dataset.fdn, r = S.fill.rows; if (i < r.length - 1) { [r[i + 1], r[i]] = [r[i], r[i + 1]]; renderFill(); } });
  $$('#panelwrap [data-fdel]').forEach(n => n.onclick = () => { S.fill.rows.splice(+n.dataset.fdel, 1); renderFill(); });
  $('#f_say').onclick = () => { const i = $('#f_in'); const v = i.value; i.value = ''; fillSay(v); };
  $('#f_in').onkeydown = e => { if (e.key === 'Enter') $('#f_say').onclick(); };
  $('#f_mic').onclick = () => micStart($('#f_mic'), $('#f_in'), null);
  const fh = $('#f_hint'); if (fh) fh.onclick = fillHint;
  $('#f_go').onclick = auditFill;
  renderTaskbar();
  const tt = $('#sheettitle'); if (tt) tt.textContent = '作业面板 · 填写操作票';
  setTimeout(() => { const i = $('#f_in'); if (i) i.focus(); }, 30);
}
/* 票头取值：口述 / 手填内容归一到最接近的规范写法（判分仍按 FHEAD.ok） */
function fillHeadVal(k, v) {
  v = (v || '').trim(); if (!v) return '';
  const f = FHEAD.find(x => x.k === k); if (!f) return v;
  let best = '', bs = 0; f.opt.forEach(o => { const sc = sim(v, o); if (sc > bs) { bs = sc; best = o; } });
  return bs >= 0.6 ? best : v;
}
/* 口述拟票：票头按要素名拆句；项目按票面文字匹配（全票 29 项都可匹配，段外项目写入后审核时判「多项」） */
function fillSay(text) {
  text = (text || '').trim(); if (!text || S.stage !== 'fill') return;
  say('o', text);
  const t = text.replace(/\s+/g, '');
  const HEADRE = { unit: /发令单位[是为：:]?([^，,。；;]+)/, from: /发令人[是为：:]?([^，,。；;]+)/, to: /受令人[是为：:]?([^，,。；;]+)/, task: /操作任务[是为：:]?(.+?)(?=[，,。；;]?(发令单位|发令人|受令人)|$)/ };
  const got = [];
  Object.keys(HEADRE).forEach(k => { const m = t.match(HEADRE[k]); if (m && m[1]) { S.fill.head[k] = fillHeadVal(k, m[1]); got.push(FHEAD.find(f => f.k === k).n); } });
  if (got.length) {
    $$('#panelwrap [data-fh]').forEach(n => n.value = S.fill.head[n.dataset.fh] || '');
    const miss = FHEAD.filter(f => !S.fill.head[f.k]).map(f => f.n);
    say('j', `票头已记：${got.join('、')}。${miss.length ? miss.join('、') + '还没填。' : '票头齐了，开始说操作项目。'}`);
    speak(miss.length ? `票头记了${got.join('、')}，${miss.join('、')}还没填。` : '票头齐了。第一项，说。', { pose: 'confirm', nod: 1 });
    renderTaskbar(); return;
  }
  const [best, bs] = fillMatch(text);
  if (!best || bs < 0.6) {
    say('j', '没有对应的操作项目。说清楚动作和设备双重名称，例如「断开培训三线1163开关」。');
    speak('没听清是哪一项。动作加设备双重名称，例如：断开培训三线1163开关。', { pose: 'listen' }); return;
  }
  if (S.fill.rows.includes(best.no)) { say('j', `「${best.ticket}」已经写在第 ${S.fill.rows.indexOf(best.no) + 1} 项了。`); speak('这一项已经写过了。下一项。', { pose: 'listen' }); return; }
  S.fill.rows.push(best.no);
  renderFill();
  say('j', `第 ${S.fill.rows.length} 项已写入：${best.ticket}`);
  speak(`第${S.fill.rows.length}项，${best.ticket}，记下了。`, { pose: 'confirm', nod: 1, show: `第 ${S.fill.rows.length} 项已写入：${best.ticket}` });
}
/* 口述与票面的匹配：以说出的话被票面覆盖的比例为主（口语可以比票面短），兼顾整句相近度；说到的设备编号必须在票面里 */
function fillMatch(text) {
  const a = norm(text); if (!a) return [null, 0];
  const nums = a.match(/\d{4,6}/g) || [];
  let best = null, bs = 0;
  STEPS.forEach(st => {
    const b = norm(st.ticket);
    if (nums.some(n => b.indexOf(n) < 0)) return;
    const l = lcs(a, b);
    const sc = l / a.length * 0.6 + l / b.length * 0.4;
    if (sc > bs) { bs = sc; best = st; }
  });
  return [best, bs];
}
/* 提示：逐级（方向 → 设备 → 票面原文），只在教学 / 演练模式 */
function fillHint() {
  const right = fillRight();
  const nx = right.find(s => !S.fill.rows.includes(s.no));
  if (!nx) { speak('本段项目已经说全了。看看顺序，再提交审核。', { pose: 'explain' }); return; }
  S.fill.hint = (S.fill.hint || 0) + 1;
  const lv = Math.min(3, ((S.fill.hintOf = S.fill.hintOf || {})[nx.no] = ((S.fill.hintOf[nx.no] || 0) + 1)));
  const idx = right.indexOf(nx) + 1;
  const txt = lv === 1 ? `第 ${idx} 项想一想：${nx.why.split(/[。；]/)[0]}。`
    : lv === 2 ? `第 ${idx} 项要动的是「${devName(nx.target) || nx.target || '本项设备'}」，动作是${nx.act === 'check' || nx.act === 'verify' ? '核对' : nx.act === 'open' ? '断开' : nx.act === 'pull' ? '拉开' : '执行'}。`
      : `第 ${idx} 项票面原文：${nx.ticket}。`;
  say('s', `<span class="tag wn">提示 ${lv}</span>${txt}`);
  speak(txt, { pose: 'point' });
}

/* ---------- 判分与详解 ---------- */
function fillScore() {
  const right = fillRight().map(s => s.no);
  const rows = S.fill.rows.slice();
  const errs = [];
  // 票头
  let hs = 20;
  FHEAD.forEach(f => {
    const v = S.fill.head[f.k];
    if (norm(v || '') !== norm(f.ok)) {
      hs -= 5;
      errs.push({ g: '票头', t: `${f.n}${v ? `填「${v}」` : '未填写'}`, right: f.ok, why: f.why,
        rule: '附录F 2.4／2.5／2.7：发令单位、发令人、受令人、受令时间应完整、如实记录在调度操作指令记录簿及操作票相应栏。' });
    }
  });
  // 漏项 / 多项
  let ps = 50;
  right.filter(no => !rows.includes(no)).forEach(no => {
    const s = STEPS.find(x => x.no === no); ps -= 7;
    errs.push({ g: '漏项', t: `漏写「${s.ticket}」`, right: `应写在本段第 ${right.indexOf(no) + 1} 项`, why: s.why, rule: s.rule });
  });
  rows.filter(no => !right.includes(no)).forEach(no => {
    const s = STEPS.find(x => x.no === no); ps -= 7;
    errs.push({ g: '多项', t: `多写「${s.ticket}」`, right: '本段不应写入，移出票面', why: wrongWhy(s), rule: s.rule });
  });
  ps = Math.max(0, ps);
  // 顺序（只看正确项之间的相对次序，逐个逆序对判）
  let os = 30;
  const seq = rows.filter(no => right.includes(no));
  for (let i = 0; i < seq.length; i++) for (let j = i + 1; j < seq.length; j++) {
    if (right.indexOf(seq[i]) > right.indexOf(seq[j])) {
      os -= 6;
      const a = STEPS.find(x => x.no === seq[i]), b = STEPS.find(x => x.no === seq[j]);
      errs.push({ g: '顺序', t: `「${b.ticket}」被排在「${a.ticket}」之后`, right: `应先「${b.ticket}」，再「${a.ticket}」`,
        why: b.why, rule: b.rule });
    }
  }
  os = Math.max(0, os);
  return { total: Math.max(0, hs) + ps + os, hs: Math.max(0, hs), ps, os, errs };
}

function auditFill() {
  if (!S.fill.rows.length) return toast('票面还是空的，先写入本段操作项目', 'bad');
  if (FHEAD.some(f => !S.fill.head[f.k])) return toast('票头还有未填项，先把发令单位、发令人、受令人、操作任务填完', 'bad');
  S.fill.tries = (S.fill.tries || 0) + 1;
  const r = fillScore();
  S.fill.last = r;
  const grp = ['票头', '漏项', '多项', '顺序'];
  const m = el('div', 'mask');
  m.innerHTML = `<div class="dlg" style="width:min(880px,96vw)">
    <div class="dh"><b>拟票审核结果 · 第 ${S.fill.tries} 次提交</b><span class="cls">×</span></div>
    <div class="db">
      <div class="fsc">
        <div class="fscn ${r.total >= 85 ? 'good' : r.total >= 60 ? 'warn' : 'bad'}">${r.total}</div>
        <div class="fscd">
          <div><b>票头要素</b><i>${r.hs}</i><span>/ 20 分 · 发令单位、发令人、受令人、操作任务各 5 分</span></div>
          <div><b>项目完整性</b><i>${r.ps}</i><span>/ 50 分 · 漏一项或多一项各扣 7 分</span></div>
          <div><b>执行顺序</b><i>${r.os}</i><span>/ 30 分 · 每处前后颠倒扣 6 分</span></div>
        </div>
      </div>
      ${r.errs.length ? grp.map(g => {
        const es = r.errs.filter(e => e.g === g); if (!es.length) return '';
        return `<div class="sec"><div class="st">${g} · ${es.length} 处</div><div class="sc">
          ${es.map(e => `<div class="ferr">
            <div class="fet"><span class="tag wn">${g}</span><b>${e.t}</b></div>
            <div class="fex"><i>应为</i>${e.right}</div>
            <div class="fex"><i>为什么</i>${e.why}</div>
            <div class="fex rule"><i>依据</i>${e.rule}</div>
          </div>`).join('')}</div></div>`; }).join('')
        : '<div class="sec"><div class="st">审核意见</div><div class="sc" style="color:var(--ac)">票头要素完整，本段项目无漏项无多项，执行顺序正确。监护人复审通过。</div></div>'}
      <div class="sec"><div class="st">正确票面 · 第一段</div><div class="sc"><ol class="fok">
        ${fillRight().map(s => `<li>${s.ticket}<em>${s.rule}</em></li>`).join('')}</ol></div></div>
    </div>
    <div class="df">${r.errs.length ? '<button class="btn" id="f_re">改一遍再交</button>' : ''}
      <button class="btn pri" id="f_next">按正确票面签发，进入上岗前准备</button></div>`;
  document.body.appendChild(m);
  m.querySelector('.cls').onclick = () => m.remove();
  const re = m.querySelector('#f_re'); if (re) re.onclick = () => m.remove();
  m.querySelector('#f_next').onclick = () => { m.remove(); finishFill(r); };
}

function finishFill(r) {
  S.fill.done = true; S.fill.score = r.total;
  S.ord.unit = ''; S.ord.from = '';
  if (r.errs.length) {
    r.errs.slice(0, 3).forEach(e => S.fillErr.push({ g: e.g, t: e.t, right: e.right, rule: e.rule }));
  }
  enterPrep();
}

async function enterFill() {
  S.stage = 'fill'; S.loc = 'phone';
  $('#scene').innerHTML = sceneSVG('phone');
  $('#loctag').textContent = LOC.phone.name;
  renderLocbar(); renderTicket(); renderFill(); updateActbar(); Sheet.sync();
  say('j', '任玲玲，深圳中调预令：将110kV仿真站110kV培训三线1163线路由运行转检修。调度采用逐项令，先拟写第一段——由运行转热备用。');
  await speak('任玲玲，深圳中调预令：将110kV仿真站110kV培训三线1163线路由运行转检修。调度采用逐项令，你先拟写第一段，由运行转热备用。票头要素先报全，项目按执行顺序一项一项说，我逐项记，不属于本段的不要写进来。',
    { pose: 'explain', who: '监护人 陈志远' });
}
