/* ══════════════════════════════════════════════════════════════════
   事件绑定与启动
   ══════════════════════════════════════════════════════════════════ */

function onEnterView(key) {
  if (key !== 'replay') stopPlay();
  if (key === 'replay' && !S.session) newRound();
  if (key === 'blind' && !S.blind) newBlind();
  else if (key === 'blind') renderBlind();
  if (key === 'analysis') renderAnalysis();
  if (key === 'eval') {
    const show = S.report || S.reportPending;
    $('#evalEmpty').classList.toggle('hide', !!show || !S.lastTrades?.length);
    $('#evalBody').classList.toggle('hide', !show);
    if (!S.report && !S.reportPending && S.lastTrades?.length) runReport();
  }
  if (key === 'similar') {
    if (!S.simQuery) { $('#simDs').value = S.ds in DATASETS ? S.ds : 'SPX'; simRandomQuery(); }
    else drawSimQuery();
  }
  if (key === 'assistant' && !S.chatMsgs.length) chatWelcome();
}

/* ── 附件 ───────────────────────────────────────────────────────── */
function clearAtts() {
  S.atts.forEach(a => { if (a.url) URL.revokeObjectURL(a.url); });
  S.atts = [];
  $('#atts').classList.add('hide');
  $('#atts').innerHTML = '';
}
function renderAtts() {
  const box = $('#atts');
  box.classList.toggle('hide', !S.atts.length);
  box.innerHTML = S.atts.map((a, i) => `<span class="att">
    ${a.kind === 'image' ? `<img src="${a.url}" alt="">` : `<span>${a.kind === 'table' ? '▦' : '📄'}</span>`}
    <span class="n">${esc(a.name)}</span><button class="x" data-i="${i}" aria-label="移除">×</button></span>`).join('');
  $$('#atts .x').forEach(b => b.onclick = () => {
    const a = S.atts[+b.dataset.i];
    if (a?.url) URL.revokeObjectURL(a.url);
    S.atts.splice(+b.dataset.i, 1);
    renderAtts();
  });
}

async function addFiles(files) {
  for (const f of files) {
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    if (f.type.startsWith('image/')) {
      S.atts.push({ kind: 'image', name: f.name, url: URL.createObjectURL(f), size: f.size });
    } else if (['csv', 'tsv'].includes(ext)) {
      const text = await f.text();
      S.atts.push({ kind: 'table', name: f.name, text, parsed: parseTradeCsv(text), size: f.size });
    } else if (['txt', 'md', 'json', 'log'].includes(ext)) {
      S.atts.push({ kind: 'doc', name: f.name, text: await f.text(), size: f.size });
    } else {
      S.atts.push({ kind: 'binary', name: f.name, size: f.size });
    }
  }
  renderAtts();
  const hint = S.atts.some(a => a.kind === 'table' && a.parsed?.ok)
    ? '识别到交易记录，发送后直接进评估引擎' : `已附加 ${S.atts.length} 个文件`;
  $('#chatHint').textContent = hint;
  setTimeout(() => { $('#chatHint').textContent = ''; }, 4000);
}

/* ── 语音输入 ───────────────────────────────────────────────────── */
function setupVoice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const btn = $('#micBtn');
  if (!SR) {
    btn.onclick = () => toast('当前浏览器不支持语音识别，请用 Chrome 或 Edge');
    btn.style.opacity = .55;
    return;
  }
  const rec = new SR();
  rec.lang = 'zh-CN';
  rec.continuous = false;
  rec.interimResults = true;
  S.recog = rec;
  let listening = false, base = '';

  rec.onresult = (e) => {
    let txt = '';
    for (let i = e.resultIndex; i < e.results.length; i++) txt += e.results[i][0].transcript;
    $('#chatText').value = (base + txt).trim();
    autoGrow($('#chatText'));
  };
  rec.onerror = (e) => {
    listening = false; btn.classList.remove('rec');
    toast(e.error === 'not-allowed' ? '麦克风权限被拒绝' : '语音识别出错：' + e.error);
  };
  rec.onend = () => { listening = false; btn.classList.remove('rec'); $('#chatHint').textContent = ''; };

  btn.onclick = () => {
    if (listening) { rec.stop(); return; }
    base = $('#chatText').value ? $('#chatText').value + ' ' : '';
    try { rec.start(); } catch (e) { return; }
    listening = true;
    btn.classList.add('rec');
    $('#chatHint').textContent = '正在听……再点一次结束';
  };
}
function autoGrow(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(150, el.scrollHeight) + 'px';
}

/* ── 启动 ───────────────────────────────────────────────────────── */
function init() {
  // 宿主页面可能已经标好了 data-theme（如嵌入式容器），沿用它而不是本地偏好
  const preset = document.documentElement.getAttribute('data-theme');
  let want = preset;
  if (!want) { try { want = localStorage.getItem('ag-theme'); } catch (e) {} }
  if (!want) want = matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light';
  setTheme(want, !preset);
  new MutationObserver(restyleCharts)
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  const opts = Object.entries(DATASETS)
    .map(([k, d]) => `<option value="${k}">${d.display} · ${TF_LABEL[d.timeframe] || d.timeframe}</option>`).join('');
  $('#dsSel').innerHTML = opts;
  $('#simDs').innerHTML = opts;
  $('#dsSel').value = 'SPX';
  $('#tfSeg').innerHTML = ['1分', '5分', '30分', '日线'].map((t, i) =>
    `<button class="${i === 3 ? 'on' : ''}">${t}</button>`).join('');

  $('#themeBtn').onclick = () => setTheme(themeNow() === 'dark' ? 'light' : 'dark');
  $('#navToggle').onclick = () => $('#nav').classList.toggle('open');
  window.addEventListener('hashchange', route);
  window.addEventListener('resize', resizeCharts);

  // 行情回放
  $('#newRound').onclick = newRound;
  $('#dsSel').onchange = () => { newRound(); S.blind = null; };
  $('#playBtn').onclick = () => S.playing ? stopPlay() : startPlay();
  $('#stepBtn').onclick = () => { stopPlay(); stepOnce(); };
  $('#autoBtn').onclick = autoRun;
  $('#endBtn').onclick = endRound;
  $('#submitBtn').onclick = submitOrder;
  $('#flatBtn').onclick = () => {
    const e = S.session?.engine;
    if (!e || e.position === 0) { toast('当前没有持仓'); return; }
    S.session.submitOrder({ type: 'market', dir: -Math.sign(e.position), qty: Math.abs(e.position), reduceOnly: true });
    toast('平仓单已提交，下一根开盘成交');
    refreshReplay();
  };
  $('#dBuy').onclick = () => { S.dir = 1; $('#dBuy').classList.add('on'); $('#dSell').classList.remove('on'); };
  $('#dSell').onclick = () => { S.dir = -1; $('#dSell').classList.add('on'); $('#dBuy').classList.remove('on'); };
  $('#oType').onchange = (e) => $('#priceField').classList.toggle('hide', e.target.value === 'market');
  $$('#spdSeg button').forEach(b => b.onclick = () => {
    $$('#spdSeg button').forEach(x => x.classList.remove('on'));
    b.classList.add('on'); S.speed = +b.dataset.s;
    if (S.playing) { stopPlay(); startPlay(); }
  });
  $$('#tfSeg button').forEach(b => b.onclick = () => {
    $$('#tfSeg button').forEach(x => x.classList.remove('on'));
    b.classList.add('on');
    if (b.textContent !== '日线') toast('本 demo 内置日线与小时线数据，更细周期需接入分钟级数据源');
  });

  // 双盲
  $('#newBlind').onclick = newBlind;
  $('#bCount').onchange = newBlind;
  $('#bHorizon').onchange = newBlind;
  $$('.ans button').forEach(b => b.onclick = () => answerBlind(+b.dataset.a));
  $('#bEval').onclick = evalBlind;

  // 相似行情
  $('#simGo').onclick = runSimilar;
  $('#simRefresh').onclick = () => { simRandomQuery(); };
  $('#simDs').onchange = () => { simRandomQuery(); };
  $('#simWin').onchange = () => { if (S.simQuery) { S.simQuery.win = parseInt($('#simWin').value); drawSimQuery(); } };

  // 智能助手
  const ta = $('#chatText');
  ta.oninput = () => autoGrow(ta);
  ta.onkeydown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
  };
  $('#sendBtn').onclick = sendChat;
  $('#fileBtn').onclick = () => $('#fileInput').click();
  $('#fileInput').onchange = (e) => { addFiles([...e.target.files]); e.target.value = ''; };
  const box = $('#chatIn');
  ['dragenter', 'dragover'].forEach(ev => box.addEventListener(ev, e => {
    e.preventDefault(); box.classList.add('drag');
  }));
  ['dragleave', 'drop'].forEach(ev => box.addEventListener(ev, e => {
    e.preventDefault(); box.classList.remove('drag');
  }));
  box.addEventListener('drop', e => { if (e.dataTransfer?.files?.length) addFiles([...e.dataTransfer.files]); });
  setupVoice();

  // 键盘快捷键
  window.addEventListener('keydown', (e) => {
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
    if (S.view === 'replay') {
      if (e.key === ' ') { e.preventDefault(); S.playing ? stopPlay() : startPlay(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); stopPlay(); stepOnce(); }
    }
    if (S.view === 'blind') {
      if (e.key === 'ArrowUp') { e.preventDefault(); answerBlind(1); }
      if (e.key === 'ArrowDown') { e.preventDefault(); answerBlind(-1); }
    }
  });

  route();
}

function sendChat() {
  const t = $('#chatText').value.trim();
  const atts = [...S.atts];
  if (!t && !atts.length) return;
  handleUserMessage(t, atts);
  autoGrow($('#chatText'));
}

init();
