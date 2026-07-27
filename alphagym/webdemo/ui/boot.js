/* ══════════════════════════════════════════════════════════════════
   事件绑定与启动
   ══════════════════════════════════════════════════════════════════ */

function onEnterView(key) {
  if (key !== 'replay') stopPlay();
  if (key === 'replay' && !S.session) newRound();
  else if (key === 'replay') { refreshReplay(); drawMtf(); }
  if (key === 'blind') { if (!S.blind) newBlind(); else renderBlind(); }
  if (key === 'analysis') renderAnalysis();
  if (key === 'eval') {
    const show = S.report || S.reportPending;
    $('#evalEmpty').classList.toggle('hide', !!show || !S.lastTrades?.length);
    $('#evalBody').classList.toggle('hide', !show);
    // 报告可能是教练栏算出来的，那次只渲染进了教练栏。
    // 不补这一句，从教练栏跑完再点「能力评估」会看到一片空白。
    if (S.report && !$('#evalBody').children.length) renderEval(S.report, 0);
    else if (!S.report && !S.reportPending && S.lastTrades?.length) runReport();
  }
  if (key === 'similar') {
    if (!S.simQuery) { $('#simDs').value = S.ds in DATASETS ? S.ds : 'SPX'; simRandomQuery(); }
    else drawSimQuery();
  }
}

function setQty(v) {
  $('#oQty').value = Math.max(1, Math.round(v));
}

function init() {
  // 宿主页面可能已经标好 data-theme（嵌入式容器），沿用它而不是本地偏好
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

  $('#themeBtn').onclick = () => setTheme(themeNow() === 'dark' ? 'light' : 'dark');
  $('#navToggle').onclick = () => $('#nav').classList.toggle('open');
  window.addEventListener('hashchange', route);
  window.addEventListener('resize', resizeCharts);

  /* ── 模拟账户 ── */
  acctLoad();
  acctRender();
  $('#acctSel').onchange = (e) => acctSwitch(e.target.value);
  $('#expCsv').onclick = exportTradesCsv;

  $('#railAsk').onclick = () => { openChat(); };

  /* ── AI 教练 ── */
  $('#hintBtn').onclick = coachHint;
  $('#coachBack').onclick = coachCollapse;

  /* ── 高级委托 ── */
  $('#advBuy').onclick = () => advSubmit(1);
  $('#advSell').onclick = () => advSubmit(-1);
  $('#advCancel').onclick = advCancel;
  $('#oType').onchange = (e) => {
    const need = e.target.value !== 'market';
    $('#oPrice').placeholder = need ? '必填' : '留空＝市价';
  };

  /* ── 决策训练台 ── */
  $('#newRound').onclick = newRound;
  $('#dsSel').onchange = () => { newRound(); S.blind = null; };
  $('#aBuy').onclick = () => act(1);
  $('#aSell').onclick = () => act(-1);
  $('#aFlat').onclick = flatten;
  $('#qMinus').onclick = () => setQty((parseInt($('#oQty').value) || 20) - 10);
  $('#qPlus').onclick = () => setQty((parseInt($('#oQty').value) || 20) + 10);
  $('#slRange').oninput = (e) => {
    $('#slMult').textContent = e.target.value;
    if (!$('#autoSL').checked) $('#autoSL').checked = true;
  };
  $('#stepBtn').onclick = () => { stopPlay(); stepOnce(); };
  $('#backBtn').onclick = stepBack;
  $('#jumpBtn').onclick = jumpToAction;
  $('#playBtn').onclick = () => S.playing ? stopPlay() : startPlay();
  $('#autoBtn').onclick = autoRun;
  $('#endBtn').onclick = endRound;
  $$('#spdSeg button').forEach(b => b.onclick = () => {
    $$('#spdSeg button').forEach(x => x.classList.remove('on'));
    b.classList.add('on'); S.speed = +b.dataset.s;
    if (S.playing) { stopPlay(); startPlay(); }
  });

  /* ── 双盲 ── */
  $('#newBlind').onclick = newBlind;
  $('#bCount').onchange = newBlind;
  $('#bHorizon').onchange = newBlind;
  $$('#v-blind .act').forEach(b => b.onclick = () => answerBlind(+b.dataset.a));
  $('#bEval').onclick = evalBlind;

  /* ── 相似行情 ── */
  $('#simGo').onclick = runSimilar;
  $('#simRefresh').onclick = simRandomQuery;
  $('#simDs').onchange = simRandomQuery;
  $('#simWin').onchange = () => { if (S.simQuery) { S.simQuery.win = parseInt($('#simWin').value); drawSimQuery(); } };

  /* ── 全局助手 ── */
  $('#fab').onclick = toggleChat;
  $('#dClose').onclick = closeChat;
  $('#dExpand').onclick = () => $('#drawer').classList.toggle('wide');
  $('#sendBtn').onclick = sendChat;
  const ta = $('#chatText');
  ta.oninput = () => autoGrow(ta);
  ta.onkeydown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
    if (e.key === 'Escape') closeChat();
  };
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
  // 整页拖放也接住，省得用户非要精准拖到那个小框里
  ['dragover', 'drop'].forEach(ev => window.addEventListener(ev, e => {
    if (!e.dataTransfer?.types?.includes('Files')) return;
    e.preventDefault();
    if (ev === 'drop') addFiles([...e.dataTransfer.files]);
  }));
  setupVoice();

  /* ── 快捷键 ── */
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); toggleChat(); return; }
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
    if (e.key === 'Escape') { closeChat(); return; }
    if ($('#drawer').classList.contains('on')) return;

    if (S.view === 'replay' && S.session) {
      if (e.key === ' ') { e.preventDefault(); stopPlay(); stepOnce(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); act(1); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); act(-1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); stepBack(); }
      else if (e.key.toLowerCase() === 'x') { e.preventDefault(); flatten(); }
      else if (e.key === 'Tab') { e.preventDefault(); jumpToAction(); }
      else if (e.key.toLowerCase() === 'p') { e.preventDefault(); S.playing ? stopPlay() : startPlay(); }
      else if (/^[1-5]$/.test(e.key)) { setQty(QTY_PRESETS[+e.key - 1]); toast(`手数 ${QTY_PRESETS[+e.key - 1]}`); }
    }
    if (S.view === 'blind' && S.blind) {
      if (e.key === 'ArrowUp') { e.preventDefault(); answerBlind(1); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); answerBlind(-1); }
      else if (e.key === ' ') { e.preventDefault(); answerBlind(0); }
    }
  });

  route();
}

init();
