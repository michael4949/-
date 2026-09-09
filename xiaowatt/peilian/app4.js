/* ---------------- 准备阶段 ---------------- */
const AUDIT = [
  '操作任务、操作步骤填写正确，操作人自审、监护人审核、值班负责人审批三审签字完毕',
  '操作人、监护人资格在有效范围内，受令人具备相应调度受令资格',
  '一组操作人员本时间段内只执行本份操作票'
];
const DRESS = [
  '纯棉工作服着装整洁完好，扣子扣全，袖口、裤脚不挽起',
  '操作人佩戴操作人袖章，监护人佩戴监护人袖章',
  '安全帽外观正常且在有效期内，双手持帽檐从前至后扣于头顶，调整后箍并系好下颌带'
];

function renderPrep() {
  const w = $('#panelwrap');
  const ok = S.prep.audit.every(Boolean) && S.prep.dress.every(Boolean) && S.prep.mind && S.prep.risks.every(Boolean);
  w.innerHTML = `<div class="prep">
    <div class="prepgrid">
      <div class="pc"><h5>一、操作票三审与资格核对</h5><div class="sub2">接令前执行操作票三审程序</div>
        <div class="chkrow">${AUDIT.map((t, i) => `<div class="chk ${S.prep.audit[i] ? 'on' : ''}" data-p="audit" data-i="${i}"><div class="bx">✓</div><div class="lb">${t}</div></div>`).join('')}</div></div>
      <div class="pc"><h5>二、着装互检</h5><div class="sub2">监护人与操作人互相检查</div>
        <div class="chkrow">${DRESS.map((t, i) => `<div class="chk ${S.prep.dress[i] ? 'on' : ''}" data-p="dress" data-i="${i}"><div class="bx">✓</div><div class="lb">${t}</div></div>`).join('')}</div></div>
      <div class="pc"><h5>三、操作任务与人员状态确认</h5><div class="sub2">监护人问询，操作人应答</div>
        <div style="background:#f6f7ee;border:1px solid #e2dfd0;border-radius:6px;padding:10px;font-size:11.5px;line-height:1.75;color:#5c6b5f">
          今天我们有一项操作任务：将110kV仿真站110kV培训三线1163线路由运行转检修。你的精神状态是否良好？</div>
        <div class="chk ${S.prep.mind ? 'on' : ''}" data-p="mind" data-i="0" style="margin-top:10px"><div class="bx">✓</div><div class="lb">操作人应答：精神状态良好</div></div>
        <div style="margin-top:10px;font-size:10.5px;color:#98a69c;line-height:1.6">精神不集中、疲劳或身体不适会降低识别设备、复诵和执行操作票的准确性，容易引发误操作。</div>
      </div>
    </div>
    <div class="risks"><h5 style="margin:0 0 4px;font-size:13px;color:#2f4438">四、风险分析及管控措施（12 项）</h5>
      <div class="sub2" style="font-size:10.5px;color:#98a69c;margin-bottom:11px">监护人逐条宣读，操作人逐条确认。点击条目展开管控措施与后果。已确认 <b id="rkn" style="color:var(--ac)">${S.prep.risks.filter(Boolean).length}</b>/12</div>
      ${RISKS.map((r, i) => `<div class="rk ${S.prep.risks[i] ? 'on' : ''}" data-r="${i}">
        <div class="rh"><div class="n">${i + 1}</div><div class="t">${r[0]}</div><div class="s">${S.prep.risks[i] ? '已确认 ✓' : '待确认'}</div></div>
        <div class="rb"><b>管控措施：</b>${r[1]}<br><b>原因及后果：</b>${r[2]}</div></div>`).join('')}
    </div>
    <div style="display:flex;gap:10px;margin-top:16px;align-items:center">
      <button class="btn" id="p_all">全部确认</button>
      <div style="flex:1"></div>
      <button class="btn pri" id="p_go" ${ok ? '' : 'disabled'}>准备完毕，进入五防模拟</button>
    </div>
  </div>`;
  $$('.chk[data-p]').forEach(n => n.onclick = () => {
    const p = n.dataset.p, i = +n.dataset.i;
    if (p === 'mind') S.prep.mind = !S.prep.mind; else S.prep[p][i] = !S.prep[p][i];
    n.classList.toggle('on', p === 'mind' ? S.prep.mind : S.prep[p][i]);
    const ok = S.prep.audit.every(Boolean) && S.prep.dress.every(Boolean) && S.prep.mind && S.prep.risks.every(Boolean);
    const go = $('#p_go'); if (go) go.disabled = !ok;
    renderTaskbar();
  });
  $$('.rk').forEach(n => {
    const i = +n.dataset.r;
    n.querySelector('.rh').onclick = () => {
      if (!S.prep.risks[i]) {
        /* 确认后就地更新这一条，不整页重绘，页面不跳位 */
        S.prep.risks[i] = true; n.classList.add('on', 'open');
        const s = n.querySelector('.rh .s'); if (s) s.textContent = '已确认 ✓';
        const cnt = $('#rkn'); if (cnt) cnt.textContent = S.prep.risks.filter(Boolean).length;
        const ok = S.prep.audit.every(Boolean) && S.prep.dress.every(Boolean) && S.prep.mind && S.prep.risks.every(Boolean);
        const go = $('#p_go'); if (go) go.disabled = !ok;
        renderTaskbar();
      } else n.classList.toggle('open');
    };
  });
  $('#p_all').onclick = () => {
    const sc = $('#panelwrap').scrollTop;
    S.prep.audit = [true, true, true]; S.prep.dress = [true, true, true]; S.prep.mind = true;
    S.prep.risks = S.prep.risks.map(() => true); renderPrep();
    const w = $('#panelwrap'); if (w) w.scrollTop = sc;
  };
  $('#p_go').onclick = () => enterWufang();
  renderTaskbar();
}

async function enterPrep() {
  S.stage = 'prep'; goLoc('phone');
  renderPrep(); updateActbar(); renderTaskbar();
  say('j', '任玲玲，今天我们有一项操作任务：将110kV仿真站110kV培训三线1163线路由运行转检修。开始前先完成三审、着装互检和风险分析。');
  await speak('任玲玲，今天我们有一项操作任务：将110kV仿真站110kV培训三线1163线路由运行转检修。开始前先完成三审、着装互检和风险分析，逐条确认。',
    { pose: 'explain' });
}

async function enterWufang() {
  S.stage = 'wufang'; S.t0 = Date.now(); S.wfdev = Object.assign({}, S.dev);
  if (!S.timer) S.timer = setInterval(tick, 1000);
  goLoc('wufang'); updateActbar(); renderTaskbar();
  say('j', '我们进行五防模拟，检查五防主机、电脑钥匙状态正常，并确认五防系统与后台监控设备状态一致。');
  await speak('我们进行五防模拟，检查五防主机、电脑钥匙状态正常，并确认五防系统与后台监控设备状态一致。', { pose: 'explain' });
  say('o', '收到，五防主机、电脑钥匙状态正常，与后台监控设备状态一致。已输入操作任务，将110kV培训三线1163线路由运行转检修。');
  await speak('正确，开始模拟。请按操作票顺序逐项模拟。', { pose: 'point', nod: 1 });
}

function startRun() {
  S.stage = 'run';
  const go = () => { enterStep(0); if (!S.toured) setTimeout(startTour, 700); };
  if (S.previewed[1]) return go();
  S.previewed[1] = true;
  openPreview(1, go);
}

let recTimer = null;
function micClick() {
  const st = STEP(); if (!st) return;
  const m = $('#a_mic'), r = $('#rin');
  if (recTimer) return;
  m.classList.add('rec'); r.value = ''; r.placeholder = '正在识别…';
  const text = S.beat === 1 ? st.recite : st.report;
  let i = 0;
  recTimer = setInterval(() => {
    i += 2; r.value = text.slice(0, i);
    if (i >= text.length) {
      clearInterval(recTimer); recTimer = null; m.classList.remove('rec');
      r.placeholder = '';
    }
  }, 34);
}

function openRule() {
  const st = STEP(); if (!st) return;
  const m = el('div', 'mask');
  m.innerHTML = `<div class="dlg" style="width:min(640px,96vw)">
    <div class="dh"><b>第 ${st.no} 项 · 规程依据</b><span class="cls">×</span></div>
    <div class="db">
      <div class="sec"><div class="st">票面文字</div><div class="sc quote">${st.ticket}</div></div>
      <div class="sec"><div class="st">依据条款</div><div class="sc" style="font-size:12.5px;color:#5c6b5f">${st.rule}</div></div>
      <div class="sec"><div class="st">为什么这样做</div><div class="sc">${st.why}</div></div>
    </div></div>`;
  document.body.appendChild(m);
  m.querySelector('.cls').onclick = () => m.remove();
  m.onclick = e => { if (e.target === m) m.remove(); };
}

/* ---------------- 收尾 ---------------- */
async function finish() {
  S.stage = 'end'; S.ended = true;
  renderTop(); updateActbar(); renderBeats();
  say('j', '所有操作项目已逐项完成并复核正确，操作完毕，向调度汇报。');
  await speak('所有操作项目已逐项完成并复核正确，无跳项、漏项。操作完毕，向调度汇报，并填写操作结束时间。', { pose: 'explain', nod: 1 });
  say('j', '退出五防账号、监控后台账号。');
  await speak('最后一步，退出五防账号和监控后台账号，防止账号被他人继续使用。', { pose: 'point' });
  say('s', `本次陪练结束，用时 ${$('#ktime').textContent}，共 ${STEPS.length} 项，违规 ${S.vio.length} 项。正在生成评估报告。`);
  await speak('本次陪练结束，正在生成评估报告。', { pose: 'explain' });
  openReport();
}

function openReport() {
  try { localStorage.setItem('xwt_lastvio', JSON.stringify(S.vio)); } catch (e) { }
  const dims = [
    ['rule', '规程符合性'], ['order', '操作顺序与逻辑'], ['dual', '双人核对执行'],
    ['state', '设备状态核对'], ['risk', '风险辨识与异常处置'], ['term', '调度术语与记录规范']
  ];
  const base = { rule: 100, order: 100, dual: 100, state: 100, risk: 100, term: 100 };
  const red = S.vio.some(v => v.level === 'red');
  const vals = dims.map(([k]) => Math.max(4, Math.min(100, base[k] + Math.min(0, S.score[k] * 1.2) + (S.praise.some(p => p.dim === k) ? 6 : 0))));
  const total = red ? 0 : Math.round(vals.reduce((a, b) => a + b, 0) / 6);
  try {
    saveSession({ ts: Date.now(), plan: S.plan ? S.plan.name : '完整操作票', mode: MODES[S.mode].n,
      dur: Math.max(1, Math.round((Date.now() - (S.t0 || Date.now())) / 60000)), score: total,
      dims: [0, 2, 3, 1, 5, 4].map(i => Math.round(vals[i])),
      vio: S.vio.map(v => ({ lv: v.level === 'red' ? 'red' : v.level === 'major' ? 'major' : 'minor', step: v.step, t: v.title, cite: (v.rule || v.detail || '').split('：')[0].slice(0, 24) })),
      hints: S.hints.map(hh => ['提示', `第${hh.step}项 第${hh.lv}级`]), lines: S.lines || [], praise: S.praise.map(p => ({ title: p.title })) });
  } catch (e) { }
  const R = 74, cx = 152, cy = 112;
  const pts = vals.map((v, i) => {
    const a = -Math.PI / 2 + i * Math.PI / 3, r = R * v / 100;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  });
  const grid = [1, .75, .5, .25].map(k => {
    const p = dims.map((_, i) => { const a = -Math.PI / 2 + i * Math.PI / 3; return `${cx + Math.cos(a) * R * k},${cy + Math.sin(a) * R * k}`; }).join(' ');
    return `<polygon points="${p}" fill="none" stroke="#e2dfd0"/>`;
  }).join('');
  const m = el('div', 'mask');
  m.innerHTML = `<div class="dlg" style="width:min(920px,96vw)">
    <div class="dh"><b>本次陪练评估 · 摘要</b>
      <span style="font-size:11px;color:#5c6b5f;font-family:var(--mono)">完整评分与复盘在「评分复盘」页</span><span class="cls">×</span></div>
    <div class="db">
      <div style="display:grid;grid-template-columns:308px 1fr;gap:20px">
        <div style="text-align:center">
          <svg width="300" height="238" viewBox="0 0 304 232">
            ${grid}
            ${dims.map((_, i) => { const a = -Math.PI / 2 + i * Math.PI / 3; return `<line x1="${cx}" y1="${cy}" x2="${cx + Math.cos(a) * R}" y2="${cy + Math.sin(a) * R}" stroke="#e2dfd0"/>`; }).join('')}
            <polygon points="${pts.map(p => p.join(',')).join(' ')}" fill="color-mix(in srgb,var(--ac) 28%,transparent)" stroke="#1fa06b" stroke-width="2"/>
            ${pts.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="var(--acd)"/>`).join('')}
            ${dims.map(([k, n], i) => { const a = -Math.PI / 2 + i * Math.PI / 3, r = R + 24; const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r; return `<text x="${x}" y="${y}" text-anchor="middle" font-size="10" fill="#5c6b5f">${n}</text><text x="${x}" y="${y + 12}" text-anchor="middle" font-size="11" font-family="monospace" fill="var(--acd)">${Math.round(vals[i])}</text>`; }).join('')}
          </svg>
          <div style="margin-top:6px"><div style="font-family:var(--mono);font-size:38px;color:${red ? '#b3372c' : 'var(--ac)'};line-height:1">${total}</div>
          <div style="font-size:11px;color:#5c6b5f">综合得分　${red ? '触发一票否决' : '本次评价'}</div></div>
        </div>
        <div>
          <div class="sec"><div class="st">AI 复盘</div><div class="sc" style="font-size:12.5px;background:var(--acbg);border-left:3px solid var(--ac);padding:10px 13px;border-radius:0 5px 5px 0">${genReview()}</div></div>
          <div class="sec"><div class="st">本次过程</div><div class="sc" style="font-size:12.5px">
            用时 ${$('#ktime').textContent}　·　操作项 ${STEPS.filter(s => s._done).length}/${S.plan ? S.plan.steps.length : STEPS.length} 项完成　·　违规 ${S.vio.length} 项　·　主动中止上报 ${S.abn.handled ? 1 : 0} 次
          </div></div>
          <div class="sec"><div class="st">扣分与否决项</div><div class="sc" style="font-size:12px">
            ${S.vio.length ? S.vio.map(v => `<div style="padding:6px 0;border-bottom:1px dashed #e9e6d8">
              <span class="tag ${v.level === 'red' ? 'rl' : 'wn'}">${v.level === 'red' ? '一票否决' : v.level === 'major' ? '严重' : '不规范'}</span>
              <b style="color:#243329">第${v.step}项 ${v.title}</b>
              <div style="color:#5c6b5f;margin-top:3px;line-height:1.6">${v.detail}</div></div>`).join('') : '<span style="color:var(--ac)">本次未触发扣分项。</span>'}
          </div></div>
          ${S.praise.length ? `<div class="sec"><div class="st">加分项</div><div class="sc" style="font-size:12px">
            ${S.praise.map(p => `<div style="padding:5px 0"><span class="tag ok">加分</span><b style="color:#243329">${p.title}</b>
            <div style="color:#5c6b5f;margin-top:3px">${p.detail}</div></div>`).join('')}</div></div>` : ''}
          <div class="sec"><div class="st">能力标签</div><div class="sc">
            ${['规程记忆', '唱票复诵', '设备状态核对', '异常处置', '调度术语', '风险辨识'].map((t, i) =>
    `<span style="display:inline-block;margin:3px 6px 3px 0;padding:3px 10px;border-radius:12px;font-size:11px;
              background:${vals[i] > 80 ? 'var(--acbg)' : vals[i] > 55 ? '#faf3dc' : '#fbe9e7'};
              border:1px solid ${vals[i] > 80 ? 'var(--acln)' : vals[i] > 55 ? '#e3d49e' : '#eac1bb'};
              color:${vals[i] > 80 ? 'var(--ac)' : vals[i] > 55 ? '#a8821b' : '#b3372c'}">${t} ${vals[i] > 80 ? '达标' : vals[i] > 55 ? '待提升' : '短板'}</span>`).join('')}
          </div></div>
        </div>
      </div>
    </div>
    <div class="df"><button class="btn" id="rp_c">关闭</button><button class="btn pri" id="rp_n">进入评分复盘</button></div>
  </div>`;
  document.body.appendChild(m);
  m.querySelector('.cls').onclick = m.querySelector('#rp_c').onclick = () => m.remove();
  m.querySelector('#rp_n').onclick = () => { m.remove(); goPage('review'); };
}

/* ---------------- 讲师台 ---------------- */
function bindDemo() {
  const d = $('#demo');
  $('#demotg').onclick = () => d.classList.toggle('open');
  $('#dm_auto').onclick = () => autoStep();
  $('#dm_red').onclick = () => {
    if (S.stage !== 'run') return toast('请先进入操作票执行阶段', 'bad');
    const i = STEPS.findIndex(s => s.no === '20');
    S.verify.v1 = false; S.verify.v2 = false; jumpTo(i);
  };
  $('#dm_abn').onclick = () => {
    S.abn.armed = true; S.abn.fired = true; S.abn.handled = false;
    pushMsg('110kV仿真站 培训三线11634刀闸 位置指示不一致 告警', 'alm');
    renderPanel(); toast('已注入异常：11634刀闸机构箱机械指示与后台不一致', 'bad');
  };
  $('#dm_skip').onclick = () => {
    if (S.stage === 'prep') { S.prep.audit = [1, 1, 1]; S.prep.dress = [1, 1, 1]; S.prep.mind = 1; S.prep.risks = S.prep.risks.map(() => true); renderPrep(); enterWufang(); }
    else if (S.stage === 'wufang') { S.wf = 4; renderPanel(); startRun(); }
    else if (S.stage === 'run') toast('已在执行阶段', '');
  };
}

async function autoStep() {
  if (S.stage !== 'run' || S.ended) return toast('请先进入操作票执行阶段', 'bad');
  const st = STEP();
  const zz = ms => new Promise(r => setTimeout(r, ms));
  if (S.beat === 0) {
    if (st.act === 'recv' && S.ph.ring) { if (st.loc !== S.loc) goLoc(st.loc); await answerPhone(); }
    return;
  }
  if (S.beat === 1) {
    if (st.loc !== S.loc) goLoc(st.loc);
    if (st.loc === 'bay' && S.bay !== '1163') { const b = $('#panelwrap [data-bay="1163"]'); if (b) b.onclick(); await zz(200); }
    if (st.act !== 'recv' && st.act !== 'report' && st.target) {
      await zz(250);
      devClick(st.target);
    }
    if (st.act === 'recv' && !S.ord.unit) { S.ord.unit = '深圳中调'; S.ord.from = '李明'; renderPanel(); }
    $('#rin').value = st.recite; await zz(150); submitInput();
  } else if (S.beat === 2) {
    if (st.act === 'recv' && S.ph.cmp === 'wait') cmpResult(true);
  } else if (S.beat === 3) {
    if (st.act === 'report') { await dialPhone(); return; }
    if (st.target) { devClick(st.target); await autoDialog(st); }
  } else if (S.beat === 4) {
    if (st.act === 'gis') { ['hui', 'mech', 'arm', 'line'].forEach(k => S.gis[k] = true); renderPanel(); }
    if (st.act === 'verify' || st.act === 'check') { }
    $('#rin').value = st.report; await new Promise(r => setTimeout(r, 150)); submitInput();
  }
}

/* 自动执行：把遥控 / 核对弹层按正确路径点完 */
async function autoDialog(st) {
  const zz = ms => new Promise(r => setTimeout(r, ms));
  for (let k = 0; k < 12; k++) {
    await zz(90);
    const rc = document.querySelector('.dlg.rc');
    if (rc) {
      const want = st.act === 'closeE' ? 'close' : 'open';
      const r = rc.querySelector(`input[name=rcop][value="${want}"]`);
      if (r && !r.checked) { r.checked = true; r.onchange(); continue; }
      const pre = rc.querySelector('#rc_pre'), ex = rc.querySelector('#rc_exec');
      if (pre && !pre.disabled) { pre.click(); continue; }
      if (ex && !ex.disabled) { ex.click(); continue; }
      await zz(120); continue;
    }
    const ins = document.querySelector('.dlg.insp');
    if (ins) {
      ins.querySelectorAll('[data-chk]:not(.on)').forEach(c => c.click());
      const ok = ins.querySelector('#ins_ok'); if (ok && !ok.disabled) { ok.click(); }
      continue;
    }
    break;
  }
}

/* ---------------- 唇形·动作同步指示 ---------------- */
const VNAME = { X: '静止', M: '闭唇 m/b/p', F: '唇齿 f', A: '开口 a', E: '半开 e', I: '扁唇 i', O: '圆唇 o', U: '撮唇 u', V: '圆扁 ü', N: '微闭 n/ng' };
const PNAME = { idle: '待命', call: '唱票', confirm: '发令·点头确认', point: '指向作业面板', explain: '讲解', stop: '制止·前倾', correct: '纠错·摇头', listen: '倾听·侧头', nod: '确认' };
function syncLoop() {
  const sp = !!DH.speaking;
  $('#sy_v').textContent = sp ? '正在说话' : '待命';
  $('#sy_c').textContent = sp ? (DH.curCh || '—') : '—';
  $('#sy_g').textContent = PNAME[DH.pose] || DH.pose;
  $('#sy_b').style.width = Math.round((sp ? DH.progress || 0 : 0) * 100) + '%';
  requestAnimationFrame(syncLoop);
}

/* ---------------- 初始化 ---------------- */
function boot() {
  document.body.innerHTML = `<div id="pg_arena">${LAYOUT}</div><div id="pg_home"></div>`;
  DH = new DigitalHuman('dh', 'jianhu');
  Avatar.init();
  $('#dhcfg').onclick = openAvatarCfg;
  $('#rcname').textContent = CHARACTERS.jianhu.name;
  $('#rcrole').textContent = 'AI数字人陪练教练 · 监护人';
  renderBeats(); renderTop(); renderTicket(); renderLocbar();
  bindDemo();
  syncLoop();
  pushMsg('110kV仿真站 监控后台 登录成功 用户:任玲玲', '');
  pushMsg('110kV仿真站 1M、2M 并列运行 方式正常', '');
  pushMsg('110kV仿真站 培训三线1163开关 合闸位置', '');
  Sheet.bind();
  $('#tohome').onclick = () => goPage('home');
  /* 卡住时监护人主动开口：一段时间无操作，陈志远按当前指令提醒 */
  S.lastAct = Date.now();
  ['pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, () => { S.lastAct = Date.now(); }, true));
  setInterval(() => {
    if (!['prep', 'wufang', 'run'].includes(S.stage) || S.ended) return;
    if (S.stage === 'run' && S.mode === 'exam') return;
    if (location.hash !== '#arena') return;
    if ((window.__DH_SPEED || 1) < 1) return;
    if (DH && DH.speaking) return;
    if (document.querySelector('.mask')) return;
    if (Date.now() - S.lastAct < 24000) return;
    S.lastAct = Date.now();
    const g = instrNow(); if (!g || !g.n) return;
    const txt = `任玲玲，${g.n}。`;
    say('j', txt); speak(txt, { pose: 'point' });
  }, 5000);
  homeBoot();
  route();
  window.addEventListener('hashchange', route);
}
