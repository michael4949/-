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

/* 口述确认的关键词（监护人问，操作人答；不点选、不打钩） */
const PREP_KW = {
  audit: [/三审|自审|审核|审批|签字|签完|签好/, /资格|有效|授权/, /只执行|本份|一份|本票|一张|这份/],
  dress: [/工作服|着装|扣子|袖口|裤脚|整洁/, /袖章/, /安全帽|帽|下颌带|后箍/],
  auditShort: ['三审签字', '人员资格', '只执行本份票'], dressShort: ['工作服着装', '袖章', '安全帽'],
  mind: /精神|状态良好|良好|饱满|正常|没问题|可以|很好/, mindBad: /不好|不太好|疲劳|不舒服|没休息|困/,
  ack: /明白|清楚|确认|收到|知道|了解|好的|记住|是的|^是|^嗯|^对/
};
function prepPhase() {
  if (!S.prep.audit.every(Boolean)) return 'audit';
  if (!S.prep.dress.every(Boolean)) return 'dress';
  if (!S.prep.mind) return 'mind';
  if (!S.prep.risks.every(Boolean)) return 'risk';
  return 'done';
}
function prepPlaceholder() {
  return ({ audit: '口头报告三审与资格核对情况…', dress: '口头报告着装互检情况…', mind: '回答监护人问询…', risk: '听清一条，口头确认一条（明白 / 清楚 / 确认）…', done: '准备完毕' })[prepPhase()];
}
function renderPrep() {
  const w = $('#panelwrap');
  const ph = prepPhase();
  w.innerHTML = `<div class="prep">
    <div class="exsay prepsay"><span class="exsayl">口述应答</span>
      <button class="mic" id="p_mic" title="语音应答"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v4"/></svg></button>
      <input class="rin" id="p_in" placeholder="${prepPlaceholder()}" ${ph === 'done' ? 'disabled' : ''}>
      <button class="btn pri" id="p_send" ${ph === 'done' ? 'disabled' : ''}>应答</button>
      <span class="tk3" id="p_st">${ph === 'risk' ? `风险交底 ${S.prep.risks.filter(Boolean).length}/12` : ph === 'done' ? '准备完毕' : '监护人问询 · 操作人口头报告'}</span></div>
    <div class="prepgrid">
      <div class="pc"><h5>一、操作票三审与资格核对</h5><div class="sub2">监护人问询，操作人口头报告；说到一项记一项</div>
        <div class="chkrow">${AUDIT.map((t, i) => `<div class="chk ro ${S.prep.audit[i] ? 'on' : ''}" data-p="audit" data-i="${i}"><div class="bx">✓</div><div class="lb">${t}</div></div>`).join('')}</div></div>
      <div class="pc"><h5>二、着装互检</h5><div class="sub2">监护人与操作人互相检查后口头报告</div>
        <div class="chkrow">${DRESS.map((t, i) => `<div class="chk ro ${S.prep.dress[i] ? 'on' : ''}" data-p="dress" data-i="${i}"><div class="bx">✓</div><div class="lb">${t}</div></div>`).join('')}</div></div>
      <div class="pc"><h5>三、操作任务与人员状态确认</h5><div class="sub2">监护人问询，操作人应答</div>
        <div style="background:#f6f7ee;border:1px solid #e2dfd0;border-radius:6px;padding:10px;font-size:11.5px;line-height:1.75;color:#5c6b5f">
          今天我们有一项操作任务：将110kV仿真站110kV培训三线1163线路由运行转检修。你的精神状态是否良好？</div>
        <div class="chk ro ${S.prep.mind ? 'on' : ''}" data-p="mind" data-i="0" style="margin-top:10px"><div class="bx">✓</div><div class="lb">操作人应答：${S.prep.mind ? '精神状态良好' : '待应答'}</div></div>
        <div style="margin-top:10px;font-size:10.5px;color:#98a69c;line-height:1.6">精神不集中、疲劳或身体不适会降低识别设备、复诵和执行操作票的准确性，容易引发误操作。</div>
      </div>
    </div>
    <div class="risks"><h5 style="margin:0 0 4px;font-size:13px;color:#2f4438">四、风险分析及管控措施（12 项）</h5>
      <div class="sub2" style="font-size:10.5px;color:#98a69c;margin-bottom:11px">监护人逐条宣读，操作人听清一条口头确认一条。已确认 <b id="rkn" style="color:var(--ac)">${S.prep.risks.filter(Boolean).length}</b>/12</div>
      ${RISKS.map((r, i) => `<div class="rk ${S.prep.risks[i] ? 'on' : ''} ${S.prep.ri === i ? 'cur open' : ''}" data-r="${i}">
        <div class="rh"><div class="n">${i + 1}</div><div class="t">${r[0]}</div><div class="s">${S.prep.risks[i] ? '已确认 ✓' : S.prep.ri === i ? '宣读中' : '待宣读'}</div></div>
        <div class="rb"><b>管控措施：</b>${r[1]}<br><b>原因及后果：</b>${r[2]}</div></div>`).join('')}
    </div>
  </div>`;
  $$('.rk').forEach(n => { n.querySelector('.rh').onclick = () => n.classList.toggle('open'); });
  $('#p_send').onclick = () => { const i = $('#p_in'); const v = i.value; i.value = ''; prepSay(v); };
  $('#p_in').onkeydown = e => { if (e.key === 'Enter') $('#p_send').onclick(); };
  $('#p_mic').onclick = () => micStart($('#p_mic'), $('#p_in'), prepMicText());
  renderTaskbar();
  if (ph !== 'done') setTimeout(() => { const i = $('#p_in'); if (i) i.focus(); }, 30);
}
/* 语音应答的离线兜底文本：按当前该答的内容 */
function prepMicText() {
  const ph = prepPhase();
  if (ph === 'audit') return '操作票已三审签字完毕，操作人、监护人资格在有效范围内，本时段只执行本份操作票。';
  if (ph === 'dress') return '工作服整洁扣子扣全，操作人、监护人袖章已佩戴，安全帽在有效期内、下颌带已系好。';
  if (ph === 'mind') return '精神状态良好。';
  return '明白。';
}
/* 就地更新：不整页重绘，页面不跳位 */
function prepPaint() {
  const ph = prepPhase();
  $$('.chk[data-p]').forEach(n => { const p = n.dataset.p, i = +n.dataset.i; const on = p === 'mind' ? S.prep.mind : S.prep[p][i]; n.classList.toggle('on', !!on); if (p === 'mind') n.querySelector('.lb').textContent = '操作人应答：' + (on ? '精神状态良好' : '待应答'); });
  $$('.rk').forEach(n => { const i = +n.dataset.r; n.classList.toggle('on', !!S.prep.risks[i]); n.classList.toggle('cur', S.prep.ri === i); if (S.prep.ri === i) n.classList.add('open'); const s = n.querySelector('.rh .s'); if (s) s.textContent = S.prep.risks[i] ? '已确认 ✓' : S.prep.ri === i ? '宣读中' : '待宣读'; if (S.prep.ri === i) n.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); });
  const cnt = $('#rkn'); if (cnt) cnt.textContent = S.prep.risks.filter(Boolean).length;
  const st = $('#p_st'); if (st) st.textContent = ph === 'risk' ? `风险交底 ${S.prep.risks.filter(Boolean).length}/12` : ph === 'done' ? '准备完毕' : '监护人问询 · 操作人口头报告';
  const inp = $('#p_in'); if (inp) { inp.placeholder = prepPlaceholder(); inp.disabled = ph === 'done'; }
  const sd = $('#p_send'); if (sd) sd.disabled = ph === 'done';
  renderTaskbar();
}
/* 操作人开口：按当前环节判定，说对推进、说漏追问 */
async function prepSay(text) {
  text = (text || '').trim(); if (!text || S.stage !== 'prep') return;
  const ph = prepPhase(); if (ph === 'done') return;
  say('o', text);
  const t = text.replace(/\s+/g, '');
  if (ph === 'audit' || ph === 'dress') {
    let hit = 0;
    PREP_KW[ph].forEach((re, i) => { if (!S.prep[ph][i] && re.test(t)) { S.prep[ph][i] = true; hit++; } });
    prepPaint();
    const miss = PREP_KW[ph + 'Short'].filter((_, i) => !S.prep[ph][i]);
    if (!hit) { await speak(`说具体。${ph === 'audit' ? '三审签字了没有，人员资格在不在有效期，本时段是不是只执行这一份票' : '工作服、袖章、安全帽，一项一项报'}。`, { pose: 'listen' }); return; }
    if (miss.length) { await speak(`记下了。${miss.join('、')}还没报。`, { pose: 'listen', nod: 1 }); return; }
    if (ph === 'audit') { await speak('三审和资格核对无误。下面着装互检，互相看一遍，报给我。', { pose: 'confirm', nod: 1 }); }
    else { await speak('着装合格。今天我们有一项操作任务：将110kV仿真站110kV培训三线1163线路由运行转检修。你的精神状态是否良好？', { pose: 'explain' }); }
    return;
  }
  if (ph === 'mind') {
    if (PREP_KW.mindBad.test(t) && !/良好|正常|没问题/.test(t)) { await speak('状态不好就不能上岗操作。今天先休息，换人。', { pose: 'stop', shake: true }); return; }
    if (!PREP_KW.mind.test(t)) { await speak('我问的是你的精神状态，直接回答。', { pose: 'listen' }); return; }
    S.prep.mind = true; prepPaint();
    await speak('好。下面做风险分析，十二条我逐条宣读，你听清一条确认一条。', { pose: 'explain', nod: 1 });
    return prepReadRisk();
  }
  if (ph === 'risk') {
    const i = S.prep.ri;
    if (i == null || i < 0) return prepReadRisk();
    if (/全部|一并|都明白|都清楚|都确认/.test(t) && !/^明白|^清楚|^确认/.test(t)) { await speak('一条一条来。这一条听清了没有？', { pose: 'correct' }); return; }
    if (!(PREP_KW.ack.test(t) || sim(t, RISKS[i][0]) > 0.4)) { await speak(`第${i + 1}条，${RISKS[i][0]}。听清了就确认。`, { pose: 'point' }); return; }
    S.prep.risks[i] = true; S.prep.ri = -1; prepPaint();
    if (S.prep.risks.every(Boolean)) return prepDone();
    return prepReadRisk();
  }
}
/* 监护人宣读下一条风险（数字人开口），操作人口头确认后再读下一条 */
async function prepReadRisk() {
  if (S.stage !== 'prep') return;
  const i = S.prep.risks.findIndex(x => !x); if (i < 0) return prepDone();
  S.prep.ri = i; prepPaint();
  const r = RISKS[i];
  say('j', `风险${i + 1}：${r[0]}。管控措施：${r[1]}`);
  await speak(`第${i + 1}条，${r[0]}。${i === 0 ? '管控措施在屏幕上，看清楚。' : ''}`, { pose: 'call', show: `风险${i + 1}：${r[0]}` });
}
async function prepDone() {
  if (S.stage !== 'prep') return;
  S.prep.ri = -1; prepPaint();
  say('j', '风险交底完毕，准备工作完成。去五防电脑做模拟。');
  await speak('十二条风险交底完毕，准备工作完成。去五防电脑做模拟。', { pose: 'confirm', nod: 1 });
  if (S.stage === 'prep') enterWufang();
}

async function enterPrep() {
  S.stage = 'prep'; S.prep.ri = -1; goLoc('phone');
  renderPrep(); updateActbar(); renderTaskbar();
  say('j', '任玲玲，今天我们有一项操作任务：将110kV仿真站110kV培训三线1163线路由运行转检修。开始前先做三审、着装互检和风险分析。先报：操作票三审签字了没有，人员资格在不在有效期？');
  await speak('任玲玲，今天我们有一项操作任务：将110kV仿真站110kV培训三线1163线路由运行转检修。开始前先做三审、着装互检和风险分析。先报：操作票三审签字了没有，人员资格在不在有效期？',
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

let recTimer = null, recNow = null;
/* 语音输入：联网时用浏览器识别（结果可改再发）；离线按当前该说的内容逐字打入（复诵 / 回报的内容本来就在票面上） */
function micStart(btn, inp, fallback) {
  if (!btn || !inp) return;
  if (recNow) { try { recNow.stop(); } catch (e) { } recNow = null; btn.classList.remove('rec'); return; }
  if (recTimer) return;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SR && navigator.onLine && !window.__DH_MUTE) {
    try {
      const r = new SR(); r.lang = 'zh-CN'; r.interimResults = true; r.continuous = false;
      r.onresult = e => { inp.value = Array.from(e.results).map(x => x[0].transcript).join(''); if (inp.oninput) inp.oninput(); };
      r.onend = () => { btn.classList.remove('rec'); recNow = null; };
      r.onerror = () => { btn.classList.remove('rec'); recNow = null; if (fallback) micType(btn, inp, fallback); else toast('语音识别未能启动，请改用文字输入', 'bad'); };
      btn.classList.add('rec'); r.start(); recNow = r; return;
    } catch (e) { }
  }
  if (fallback) return micType(btn, inp, fallback);
  btn.classList.add('rec'); toast('当前离线，语音识别不可用，请在文字框中输入', '');
  setTimeout(() => btn.classList.remove('rec'), 1400); inp.focus();
}
function micType(btn, inp, text) {
  btn.classList.add('rec'); inp.value = ''; inp.placeholder = '正在识别…';
  let i = 0;
  recTimer = setInterval(() => {
    i += 2; inp.value = text.slice(0, i); if (inp.oninput) inp.oninput();
    if (i >= text.length) { clearInterval(recTimer); recTimer = null; btn.classList.remove('rec'); inp.placeholder = ''; }
  }, 34);
}
function micClick() {
  const st = STEP(); if (!st) return;
  micStart($('#a_mic'), $('#rin'), S.beat === 1 ? st.recite : st.report);
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
      dims: arenaTo8(Object.fromEntries(dims.map(([k], i) => [k, vals[i]]))), ver: versionStamp(null),
      vio: S.vio.map(v => ({ lv: v.level === 'red' ? 'red' : v.level === 'major' ? 'major' : 'minor', step: v.step, t: v.title, cut: v.cut || CUT[v.level] || 5, dimn: v.dimn || DIMN[v.dim] || '', detail: v.detail, rule: v.rule, cite: (v.rule || v.detail || '').split('：')[0].slice(0, 24) })),
      hints: S.hints.map(hh => ['提示', `第${hh.step}项 第${hh.lv}级`]), lines: S.lines || [], praise: S.praise.map(p => ({ title: p.title })) });
  } catch (e) { }
  const v8 = arenaTo8(Object.fromEntries(dims.map(([k], i) => [k, vals[i]])));
  const N = DIMS.length, R = 74, cx = 152, cy = 112;
  const pts = v8.map((v, i) => {
    const a = -Math.PI / 2 + i * Math.PI * 2 / N, r = R * v / 100;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  });
  const grid = [1, .75, .5, .25].map(k => {
    const p = DIMS.map((_, i) => { const a = -Math.PI / 2 + i * Math.PI * 2 / N; return `${cx + Math.cos(a) * R * k},${cy + Math.sin(a) * R * k}`; }).join(' ');
    return `<polygon points="${p}" fill="none" stroke="#e2dfd0"/>`;
  }).join('');
  const m = el('div', 'mask');
  m.innerHTML = `<div class="dlg" style="width:min(920px,96vw)">
    <div class="dh"><b>本次陪练评估 · 摘要</b>
      <span style="font-size:11px;color:#5c6b5f;font-family:var(--mono)">完整评分与复盘在「评分复盘」页</span><span class="cls">×</span></div>
    <div class="db">
      <div style="display:grid;grid-template-columns:308px 1fr;gap:20px">
        <div style="text-align:center">
          <svg width="300" height="238" viewBox="-6 -8 316 244">
            ${grid}
            ${DIMS.map((_, i) => { const a = -Math.PI / 2 + i * Math.PI * 2 / N; return `<line x1="${cx}" y1="${cy}" x2="${cx + Math.cos(a) * R}" y2="${cy + Math.sin(a) * R}" stroke="#e2dfd0"/>`; }).join('')}
            <polygon points="${pts.map(p => p.join(',')).join(' ')}" fill="color-mix(in srgb,var(--ac) 28%,transparent)" stroke="#1fa06b" stroke-width="2"/>
            ${pts.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="var(--acd)"/>`).join('')}
            ${DIMS.map((n, i) => { const a = -Math.PI / 2 + i * Math.PI * 2 / N, r = R + 26; const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r; return `<text x="${x}" y="${y}" text-anchor="middle" font-size="9" fill="#5c6b5f">${n}</text><text x="${x}" y="${y + 12}" text-anchor="middle" font-size="11" font-family="monospace" fill="var(--acd)">${v8[i]}</text>`; }).join('')}
          </svg>
          <div style="margin-top:6px"><div style="font-family:var(--mono);font-size:38px;color:${red ? '#b3372c' : 'var(--ac)'};line-height:1">${total}</div>
          <div style="font-size:11px;color:#5c6b5f">综合得分　${red ? '触发一票否决' : '本次评价'}</div></div>
        </div>
        <div>
          <div class="sec"><div class="st">AI 复盘</div><div class="sc" style="font-size:12.5px;background:var(--acbg);border-left:3px solid var(--ac);padding:10px 13px;border-radius:0 5px 5px 0">${genReview()}</div></div>
          <div class="sec"><div class="st">本次过程</div><div class="sc" style="font-size:12.5px">
            用时 ${$('#ktime').textContent}　·　操作项 ${STEPS.filter(s => s._done).length}/${S.plan ? S.plan.steps.length : STEPS.length} 项完成　·　违规 ${S.vio.length} 项　·　主动中止上报 ${S.abn.handled ? 1 : 0} 次
          </div></div>
          <div class="sec"><div class="st">扣分与否决项 · 逐条扣分依据</div><div class="sc" style="font-size:12px">
            ${S.vio.length ? S.vio.map(v => `<div class="viorow">
              <span class="tag ${v.level === 'red' ? 'rl' : 'wn'}">${v.level === 'red' ? '一票否决' : v.level === 'major' ? '严重' : '不规范'}</span>
              <b style="color:#243329">第${v.step}项 ${v.title}</b>
              <b class="viocut ${v.level === 'red' ? 'red' : ''}">${v.level === 'red' ? '综合得分记 0' : (v.dimn || DIMN[v.dim] || '') + ' −' + (v.cut || CUT[v.level] || 5) + ' 分'}</b>
              <div style="color:#5c6b5f;margin-top:3px;line-height:1.6">${v.detail}</div>
              ${v.rule ? `<div class="viorule">依据　${v.rule}</div>` : ''}</div>`).join('') : '<span style="color:var(--ac)">本次未触发扣分项。</span>'}
            ${S.hintCut ? `<div class="viorow"><span class="tag wn">提示</span><b style="color:#243329">使用教练提示 ${S.hints.length} 次</b>
              <b class="viocut">规程符合性 −${S.hintCut} 分</b>
              <div style="color:#5c6b5f;margin-top:3px;line-height:1.6">一级提示每次 −1 分、二级 −2 分、三级（直接给答案）−4 分。</div></div>` : ''}
          </div></div>
          <div class="sec"><div class="st">扣分标准</div><div class="sc cutstd">
            <div><b>一票否决</b><span>触及红线（未验电即接地、带负荷拉合刀闸等），综合得分记 0，本次不计成绩</span></div>
            <div><b>严重 −12 分</b><span>顺序错、状态判断错、越权操作等可能造成后果的违规</span></div>
            <div><b>不规范 −5 分</b><span>复诵不完整、记录漏填、未手指口述等过程不规范</span></div>
            <div><b>教练提示 −1／−2／−4 分</b><span>按一级、二级、三级提示逐级递增，均计入规程符合性</span></div>
            <div><b>主动识别 +8 分</b><span>自己核出票令不一致、异常中止上报等正确处置</span></div>
            <div class="cutmath">维度得分 ＝ 100 ＋ 该维度扣分合计 × 1.2（下限 4 分，有加分项再 +6）；综合得分 ＝ 六个维度算术平均，触发一票否决时直接记 0。</div>
          </div></div>
          ${S.praise.length ? `<div class="sec"><div class="st">加分项</div><div class="sc" style="font-size:12px">
            ${S.praise.map(p => `<div style="padding:5px 0"><span class="tag ok">加分</span><b style="color:#243329">${p.title}</b>
            <div style="color:#5c6b5f;margin-top:3px">${p.detail}</div></div>`).join('')}</div></div>` : ''}
          <div class="sec"><div class="st">能力标签</div><div class="sc">
            ${DIMS.map((t, i) =>
    `<span style="display:inline-block;margin:3px 6px 3px 0;padding:3px 10px;border-radius:12px;font-size:11px;
              background:${v8[i] > 80 ? 'var(--acbg)' : v8[i] > 55 ? '#faf3dc' : '#fbe9e7'};
              border:1px solid ${v8[i] > 80 ? 'var(--acln)' : v8[i] > 55 ? '#e3d49e' : '#eac1bb'};
              color:${v8[i] > 80 ? 'var(--ac)' : v8[i] > 55 ? '#a8821b' : '#b3372c'}">${t} ${v8[i] > 80 ? '达标' : v8[i] > 55 ? '待提升' : '短板'}</span>`).join('')}
            <div style="font-size:10.5px;color:#98a69c;margin-top:6px">维度按作业授权认证表 20 个专业项目与两项实操考试抽取（v1.0，已审定）；维度得分由本场六项计分折算。</div>
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
  $('#dm_voice').onclick = () => { voiceToggle(); toast(TTS.on ? '数字人朗读语音已打开' : '数字人朗读语音已关闭（只保留字幕与口型）'); };
  voiceLabel();
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
    if (S.stage === 'fill') { S.fill.head = { unit: '深圳中调', from: '李明', to: '陈志远', task: '将110kV仿真站110kV培训三线1163线路由运行转检修' }; S.fill.rows = fillRight().map(x => x.no); renderFill(); auditFill(); }
    else if (S.stage === 'prep') { S.prep.audit = [1, 1, 1]; S.prep.dress = [1, 1, 1]; S.prep.mind = 1; S.prep.risks = S.prep.risks.map(() => true); S.prep.ri = -1; renderPrep(); enterWufang(); }
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
    /* 四项指示由回报内容判定：标准回报里四项都说到 */
    $('#rin').value = st.report; await new Promise(r => setTimeout(r, 150)); submitInput();
  }
}

/* 自动执行：遥控弹层口述操作性质并按住执行；核对弹层口述核对结果 */
async function autoDialog(st) {
  const zz = ms => new Promise(r => setTimeout(r, ms));
  for (let k = 0; k < 40; k++) {
    await zz(90);
    const rc = document.querySelector('.dlg.rc');
    if (rc) {
      if (!S.rc) { await zz(60); continue; }
      if (!S.rc.nat) { rcSay(S.rc.want === 'open' ? `${devName(S.rc.id)}，分闸` : `${devName(S.rc.id)}，合闸`); continue; }
      if (S.rc.ready) { rcExecNow(); continue; }
      await zz(120); continue;
    }
    const ins = document.querySelector('.dlg.insp');
    if (ins) { if (S.ins && !S.ins.said) { S.ins.said = true; insSay(S.ins.okSay); } await zz(120); continue; }
    break;
  }
}

/* 上岗前准备：按口述路径自动走完（讲师演示台 / 回归用） */
async function prepAuto() {
  const zz = ms => new Promise(r => setTimeout(r, ms));
  await prepSay(prepMicText()); await prepSay(prepMicText()); await prepSay(prepMicText());
  let g = 0; while (S.stage === 'prep' && g++ < 20) { await zz(60); await prepSay('明白'); }
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
    if (!['fill', 'prep', 'wufang', 'run'].includes(S.stage) || S.ended) return;
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
  loadCoachApply();
  homeBoot();
  route();
  window.addEventListener('hashchange', route);
}
