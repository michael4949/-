/* ===================== 填写操作票（拟票练习）=====================
   位置：进入陪练舱后的第一步，在上岗前准备之前。
   学员按调度预令拟写第一段操作项目，提交后由系统按审票口径逐条判分，
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

/* ---------- 渲染 ---------- */
function renderFill() {
  const w = $('#panelwrap'); if (!w) return;
  const pool = fillRight().concat(fillWrong());
  const chosen = S.fill.rows;
  const rest = pool.filter(s => !chosen.includes(s.no));
  w.innerHTML =
    pnl('倒闸操作作业全过程', '当前环节：拟票', `
      <div class="fflow">${FLOW.map((f, i) => `<div class="ffs ${i === 1 ? 'cur' : i < 1 ? 'done' : ''}"><i>${i + 1}</i><b>${f[0]}</b><span>${f[1]}</span></div>`).join('')}</div>`) +
    pnl('110kV仿真站 · 变电站倒闸操作票', `编号 ${ticketNo()} · 拟票人 任玲玲`, `
      <div class="fhead">
        ${FHEAD.map(f => `<div class="fhr"><div class="k">${f.n}</div><div class="v">
          <select data-fh="${f.k}"><option value="">请选择</option>${f.opt.map(o => `<option${S.fill.head[f.k] === o ? ' selected' : ''}>${o}</option>`).join('')}</select></div></div>`).join('')}
        <div class="fhr"><div class="k">操作开始时间</div><div class="v ro">执行第一项时填写</div></div>
        <div class="fhr"><div class="k">操作结束时间</div><div class="v ro">完成最后一项时填写</div></div>
      </div>`) +
    pnl('操作项目 · 第一段（本次调度令范围：运行 → 热备用）', `已写入 ${chosen.length} 项`, `
      <div class="fbody">
        <div class="fpool">
          <div class="fpt">备选项目　${rest.length} 项未写入</div>
          ${rest.length ? rest.map(s => `<div class="fpi" data-fadd="${s.no}"><b>＋</b><span>${s.ticket}</span></div>`).join('')
            : '<div class="fpe">备选项目已全部写入票面。多写的项目要移出去。</div>'}
        </div>
        <div class="fsheet">
          <div class="fpt">操作票第一段　按执行顺序排列</div>
          ${chosen.length ? chosen.map((no, i) => { const s = STEPS.find(x => x.no === no); return `
            <div class="fsi"><div class="fsn">${i + 1}</div><div class="fst">${s.ticket}</div>
              <div class="fsb"><button class="fbtn" data-fup="${i}" title="上移">↑</button><button class="fbtn" data-fdn="${i}" title="下移">↓</button><button class="fbtn del" data-fdel="${i}" title="移出票面">×</button></div></div>`; }).join('')
            : '<div class="fpe">票面还是空的。从左边把本段应执行的项目按顺序写进来。</div>'}
        </div>
      </div>
      <div class="ffoot">
        <div class="ffh">拟票要求：只写本次调度令范围内的项目；每一项一个动作；执行项与检查项分列；顺序按先断开关、后拉刀闸、先线路侧后母线侧的逻辑排列。</div>
        <button class="btn pri" id="f_go">提交审核</button>
      </div>`);
  $$('#panelwrap [data-fh]').forEach(n => n.onchange = e => { S.fill.head[n.dataset.fh] = e.target.value; renderTaskbar(); });
  $$('#panelwrap [data-fadd]').forEach(n => n.onclick = () => { S.fill.rows.push(n.dataset.fadd); renderFill(); });
  $$('#panelwrap [data-fup]').forEach(n => n.onclick = () => { const i = +n.dataset.fup; if (i > 0) { const r = S.fill.rows; [r[i - 1], r[i]] = [r[i], r[i - 1]]; renderFill(); } });
  $$('#panelwrap [data-fdn]').forEach(n => n.onclick = () => { const i = +n.dataset.fdn, r = S.fill.rows; if (i < r.length - 1) { [r[i + 1], r[i]] = [r[i], r[i + 1]]; renderFill(); } });
  $$('#panelwrap [data-fdel]').forEach(n => n.onclick = () => { S.fill.rows.splice(+n.dataset.fdel, 1); renderFill(); });
  $('#f_go').onclick = auditFill;
  renderTaskbar();
  const tt = $('#sheettitle'); if (tt) tt.textContent = '作业面板 · 填写操作票';
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
    if (v !== f.ok) {
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
  await speak('任玲玲，深圳中调预令：将110kV仿真站110kV培训三线1163线路由运行转检修。调度采用逐项令，你先拟写第一段，由运行转热备用。票头要素填全，项目按执行顺序排，不属于本段的不要写进来。',
    { pose: 'explain', who: '监护人 陈志远' });
}
