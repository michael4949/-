/* ══════════════════════════════════════════════════════════════════
   全局智能助手（右下角悬浮，任何页面都能呼出）

   放成悬浮抽屉而不是一个独立页面，是因为它的价值恰恰在「随时」：
   看着 K 线想查一句历史、看着报告想问一句这数字什么意思——
   如果要先跳走到另一个页面，那一半的使用场景就没了。

   三件事都是真的，不是占位：
     · 问数   → src/query.js，中文转查询结构后在真实数据上执行
     · 文件   → src/fileparse.js，CSV / XLSX / PDF 真解析，不是只显示个文件名
     · 语音   → Web Speech API 真识别，并用 getUserMedia 做实时音量指示
   ══════════════════════════════════════════════════════════════════ */

const SUGGESTIONS = [
  '标普500 2008年 跌幅超过5% 的交易日',
  '标普500 历史最大单日振幅',
  '纳斯达克 2000年到2003年 回撤超过40%',
  '纳斯达克 连涨5天 并且 量比超过1.5倍',
  '评估我的交易',
  '找和当前形态相似的历史片段',
];

/* ── 抽屉开合 ───────────────────────────────────────────────────── */
function openChat() {
  $('#drawer').classList.add('on');
  $('#fab').classList.add('on');
  $('#fabDot').classList.remove('show');
  if (!S.chatMsgs.length) chatWelcome();
  setTimeout(() => $('#chatText').focus(), 60);
}
function closeChat() {
  $('#drawer').classList.remove('on');
  $('#fab').classList.remove('on');
}
function toggleChat() {
  $('#drawer').classList.contains('on') ? closeChat() : openChat();
}

/* ── 消息 ───────────────────────────────────────────────────────── */
function chatPush(role, html, opts = {}) {
  S.chatMsgs.push({ role, html });
  const b = $('#chatBody');
  const el = document.createElement('div');
  el.className = 'msg ' + role;
  el.innerHTML = `<span class="av">${role === 'ai' ? '✦' : '我'}</span><div class="bubble">${html}</div>`;
  b.appendChild(el);
  b.scrollTop = b.scrollHeight;
  $$('.sug', el).forEach(s => s.onclick = () => handleUserMessage(s.textContent));
  if (!$('#drawer').classList.contains('on') && role === 'ai') $('#fabDot').classList.add('show');
  return el.querySelector('.bubble');
}
const sugsHtml = (list) => `<div class="sugs">${list.map(s => `<button class="sug">${esc(s)}</button>`).join('')}</div>`;

function chatWelcome() {
  $('#chatBody').innerHTML = '';
  S.chatMsgs = [];
  chatPush('ai', `<p>我能做三件事：</p>
    <p>① <b>查历史行情</b> —— 说出条件，我把它翻译成查询并在真实数据上执行，翻译结果会展示出来供你核对。<br>
    ② <b>解读能力评估</b> —— 把统计结果讲成人话。<br>
    ③ <b>读你上传的文件</b> —— CSV / Excel 交易记录可直接进评估引擎，PDF 会提取文本。</p>
    <p class="cap">我看不到行情原始数据，也不会预测价格或推荐标的。</p>
    ${sugsHtml(SUGGESTIONS)}`);
}

/* ── 意图路由 ──────────────────────────────────────────────────── */
function handleUserMessage(text, attachments = []) {
  const t = String(text || '').trim();
  if (!t && !attachments.length) return;
  openChat();

  const attHtml = attachments.length
    ? `<div class="atts" style="padding:0;margin-top:8px">${attachments.map(a =>
        a.kind === 'image' ? `<span class="att"><img src="${a.url}" alt=""><span class="n">${esc(a.name)}</span></span>`
          : `<span class="att"><span>${a.kind === 'table' ? '▦' : '📄'}</span><span class="n">${esc(a.name)}</span></span>`).join('')}</div>`
    : '';
  chatPush('me', `${t ? `<p>${esc(t)}</p>` : ''}${attHtml}`);
  $('#chatText').value = '';
  autoGrow($('#chatText'));
  clearAtts();

  setTimeout(() => {
    if (attachments.length) { respondToFiles(attachments, t); return; }
    if (/(评估|能力|运气|技能|报告|解读)/.test(t) && !/行情|涨|跌|振幅|回撤/.test(t)) return respondEval();
    if (/(相似|像的|形态)/.test(t)) return respondSimilar();
    if (/^(你好|hi|hello|在吗|帮助|help)/i.test(t)) {
      return chatPush('ai', `<p>直接把查询条件说出来就行，比如：</p>${sugsHtml(SUGGESTIONS.slice(0, 4))}`);
    }
    respondQuery(t);
  }, 200);
}

/* ── 智能问数 ──────────────────────────────────────────────────── */
function respondQuery(text) {
  const r = ask(text, datasetsAll(), S.queryCache);
  if (!r.ok) {
    // 解析不出来就明说。绝不硬凑一个「差不多」的答案。
    chatPush('ai', `<p>这句话我没能翻译成可执行的查询 —— <b>${esc(r.reason)}</b>。</p>
      <p class="cap">我不会拿一个相近的结果糊弄过去。换成下面这类写法我就能算：</p>
      ${sugsHtml(r.hints || SUGGESTIONS.slice(0, 4))}`);
    return;
  }
  const res = r.result, F = FIELDS;
  const fmtVal = (f, v) => !Number.isFinite(v) ? '—'
    : F[f].pct ? sg(v * 100) + '%' : F[f].unit === '倍' ? v.toFixed(2) + '×'
    : f === 'volume' ? (v / 1e6).toFixed(1) + 'M' : v.toFixed(2);

  let body;
  if (res.select === 'count') {
    body = `<p>共 <b class="mono" style="font-size:18px">${res.count}</b> 个交易日满足条件。</p>`;
  } else if (!res.rows.length) {
    body = '<p>在这些数据里<b>一条都没有</b>命中。条件可能太严，或这段时间确实没发生过。</p>';
  } else {
    const cols = res.fields;
    body = `<div class="scrollx"><table class="dt"><thead><tr><th>日期</th><th>品种</th>
      ${cols.map(f => `<th>${F[f].label}</th>`).join('')}</tr></thead><tbody>
      ${res.rows.slice(0, 10).map(row => `<tr>
        <td class="txt mono">${ymd(row.t)}</td><td class="txt">${row.display}</td>
        ${cols.map(f => `<td class="${F[f].pct && row.values[f] < 0 ? 'dn' : F[f].pct ? 'up' : ''}">${fmtVal(f, row.values[f])}</td>`).join('')}
      </tr>`).join('')}</tbody></table></div>
      <p class="cap">${res.ranking
        ? `在 ${res.scanned.toLocaleString()} 根 K 线中排序，取前 ${Math.min(res.rows.length, 10)} 条`
        : `命中 ${res.total} 条，显示前 ${Math.min(res.rows.length, 10)} 条`}</p>`;
  }
  chatPush('ai', `<p>我把这句话理解成了：</p>
    <pre class="code">${esc(r.sql)}</pre>
    ${body}
    ${res.usesFuture ? `<div class="note" style="margin-top:9px"><span>⚠</span>
      <span>这个查询用到了<b>后视字段</b>。历史研究没问题，但这类信息在回放训练里绝不可见。</span></div>` : ''}
    <p class="cap">语言理解到此为止：上面的查询条件是确定的，取数与计算全程在真实数据上执行。</p>`);
}

/* ── 解读评估报告 ──────────────────────────────────────────────── */
function respondEval() {
  if (!S.lastTrades?.length) {
    chatPush('ai', `<p>还没有可评估的交易记录。三条路：</p>
      <p>① 去<a href="#app/replay">行情回放</a>跑一轮；<br>
      ② 去<a href="#app/blind">双盲测试</a>答一组题；<br>
      ③ 直接把交易记录拖进来（CSV 或 Excel，需要入场 / 出场 / 方向 / 手数四列）。</p>`);
    return;
  }
  if (!S.report) {
    chatPush('ai', '<p><span class="spin"></span> 正在跑蒙特卡洛，稍等……</p>');
    runReportSilent(() => respondEval());
    return;
  }
  const r = S.report, o = r.observed;
  const weakest = r.attribution.filter(a => a.available).sort((a, b) => a.edgeR - b.edgeR)[0];
  const probs = r.behavior.filter(b => b.kind === 'problem' && !['none', 'insufficient'].includes(b.severity));
  const strengths = r.behavior.filter(b => b.kind === 'strength' && b.severity !== 'insufficient');

  chatPush('ai', `
    <p><b>这一轮成绩：</b>${o.trades} 笔，净收益 ${sg(o.totalR)} R，胜率 ${pc1(o.winRate)}，
    盈亏比 ${isFinite(o.profitFactor) ? o.profitFactor.toFixed(2) : '—'}。</p>
    <p><b>有多少能用运气解释：</b>${md(r.verdict.text)}</p>
    ${weakest ? `<p><b>最该优先训练：</b>${weakest.label}（边际贡献 ${sg(weakest.edgeR)} R，
      校正后 p = ${(weakest.pValueAdjusted ?? weakest.pValue).toFixed(3)}）。${weakest.question}</p>` : ''}
    ${strengths.length ? `<p><b>已经做对的：</b>${strengths.map(b => b.label).join('、')}。</p>` : ''}
    ${probs.length ? `<p><b>值得注意：</b>${probs.map(b => `${b.label}（${b.evidence}）`).join('；')}。</p>` : ''}
    <p><b>下一步：</b>${isFinite(r.power.requiredTrades) && r.power.shortfall > 0
      ? `再积累约 ${r.power.shortfall} 笔交易，才能在统计上判定这个优势是不是真的。`
      : '样本量已经够，换品种或换行情状态再验证一遍稳定性。'}</p>
    <p><a href="#app/eval">查看完整报告 →</a></p>
    <p class="cap">以上每个数字都来自评估引擎的输出，我只负责翻译成人话 —— 我看不到你的 K 线和逐笔记录。</p>`);
}

function runReportSilent(done) {
  setTimeout(() => {
    S.report = analyzeSession({
      bars: S.lastBars, trades: S.lastTrades, instrument: S.lastIns,
      seed: (Math.random() * 1e9) | 0, iterations: 2000,
    });
    done();
  }, 60);
}

/* ── 相似行情 ──────────────────────────────────────────────────── */
function respondSimilar() {
  if (!S.simQuery) {
    $('#simDs').value = S.ds in DATASETS ? S.ds : 'SPX';
    simRandomQuery();
  }
  const idx = ensureSimIndex(S.simQuery.win);
  const r = findSimilar(datasetsAll(), S.simQuery.sym, S.simQuery.end, idx, { k: 24 });
  if (!r.ok) { chatPush('ai', `<p>没法检索：${esc(r.reason)}</p>`); return; }
  const s = r.stats;
  chatPush('ai', `<p>以 <b>${DATASETS[S.simQuery.sym].display} ${ymd(barsOf(S.simQuery.sym)[S.simQuery.end].t)}</b>
    往前 ${idx.window} 根为查询形态，在 ${idx.size} 个历史片段中找到最相似的 ${r.matches.length} 个。
    它们之后 ${s.horizon} 根的走势分布：</p>
    <div class="scrollx"><table class="dt"><thead><tr><th>上涨占比</th><th>中位</th><th>5% 分位</th><th>95% 分位</th></tr></thead>
    <tbody><tr><td>${pc1(s.upRate)}</td><td class="${s.median >= 0 ? 'up' : 'dn'}">${sg(s.median * 100)}%</td>
    <td class="dn">${sg(s.p05 * 100)}%</td><td class="up">${sg(s.p95 * 100)}%</td></tr></tbody></table></div>
    <p class="cap">这是<b>条件分布</b>，不是方向判断。注意左尾：最差 5% 的情况下回撤 ${pc1(Math.abs(s.p05))}。</p>
    <p><a href="#app/similar">看完整结果 →</a></p>`);
}

/* ══ 文件 ══ */
function respondToFiles(atts, text) {
  const tables = atts.filter(a => a.kind === 'table');
  const imgs = atts.filter(a => a.kind === 'image');
  const docs = atts.filter(a => a.kind === 'doc');
  const bad = atts.filter(a => a.kind === 'error');

  if (tables.length) return respondToTable(tables[0]);

  const parts = [];
  if (docs.length) {
    for (const d of docs) {
      const preview = d.text.slice(0, 700);
      parts.push(`<p>已读取 <b>${esc(d.name)}</b>，提取到 ${d.text.length.toLocaleString()} 个字符${
        d.meta ? `（${esc(d.meta)}）` : ''}。</p>
        <pre class="code">${esc(preview)}${d.text.length > 700 ? '\n……' : ''}</pre>
        <p class="cap">解析在浏览器本地完成，文件没有上传到任何服务器。
        如果这是交易记录，导出成 CSV / Excel 我就能直接算。</p>`);
    }
  }
  if (imgs.length) {
    parts.push(`<p>收到 ${imgs.length} 张图片。</p>
      <p>这个 demo 完全跑在浏览器本地，没有接入视觉模型，所以我<b>看不懂图片内容</b>。
      正式版会把图片交给多模态模型识别 —— 常见用途是把交割单、持仓截图转成结构化交易记录。</p>
      <p class="cap">现在能立刻用起来的路径：把交易记录导出成 CSV 或 Excel 拖进来。</p>`);
  }
  for (const b of bad) {
    parts.push(`<p><b>${esc(b.name)}</b> 没能解析 —— ${esc(b.reason)}。</p>`);
  }
  chatPush('ai', parts.join('') || '<p>文件收到了，但没能识别出可处理的内容。</p>');
  if (text) setTimeout(() => handleUserMessage(text), 400);
}

function respondToTable(att) {
  const parsed = att.parsed;
  if (!parsed?.ok) {
    chatPush('ai', `<p>读到了 <b>${esc(att.name)}</b>${parsed?.rows ? `（${parsed.rows} 行）` : ''}，
      但没能识别成交易记录 —— <b>${esc(parsed?.reason || '格式不符')}</b>。</p>
      <p>需要这几列（中英文都认）：</p>
      <pre class="code">entry / exit / dir / size
或  开仓日期,平仓日期,方向,手数
方向可写 1/-1、多/空、buy/sell；日期会自动对齐到最近的 K 线</pre>
      <p class="cap">识别到的表头：${(parsed?.headers || []).map(h => esc(h)).join(' · ') || '（空）'}</p>`);
    return;
  }
  S.lastTrades = parsed.trades;
  S.lastBars = parsed.bars;
  S.lastIns = INSTRUMENTS[parsed.symbol];
  S.lastLabel = `导入记录 · ${att.name}`;
  S.report = null;

  chatPush('ai', `<p>已从 <b>${esc(att.name)}</b> 解析出 <b>${parsed.trades.length}</b> 笔交易，
    对齐到 <b>${DATASETS[parsed.symbol].display}</b> 的 K 线上。${
    parsed.skipped ? `跳过 ${parsed.skipped} 行无法解析的记录。` : ''}</p>
    <p><span class="spin"></span> 正在跑评估……</p>`);
  runReportSilent(() => {
    respondEval();
    chatPush('ai', `<p><a href="#app/eval">完整评估报告 →</a>　<a href="#app/analysis">交易分析 →</a></p>`);
  });
}

/* ── 附件收集 ───────────────────────────────────────────────────── */
const tradeCtx = () => ({
  barsOf, symbols: Object.keys(DATASETS),
  displayOf: (s) => DATASETS[s]?.display, defaultSymbol: S.ds in DATASETS ? S.ds : 'SPX',
});
const kb = (n) => n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(0) + ' KB' : (n / 1048576).toFixed(1) + ' MB';

function clearAtts() {
  S.atts.forEach(a => { if (a.url) URL.revokeObjectURL(a.url); });
  S.atts = [];
  $('#atts').classList.add('hide');
  $('#atts').innerHTML = '';
  $('#chatHint').textContent = '';
}
function renderAtts() {
  const box = $('#atts');
  box.classList.toggle('hide', !S.atts.length);
  box.innerHTML = S.atts.map((a, i) => `<span class="att ${a.kind === 'table' && a.parsed?.ok ? 'ok' : ''}">
    ${a.kind === 'image' ? `<img src="${a.url}" alt="">`
      : `<span>${a.kind === 'table' ? '▦' : a.kind === 'error' ? '⚠' : '📄'}</span>`}
    <span class="n">${esc(a.name)}</span><span class="sz">${kb(a.size)}</span>
    <button class="x" data-i="${i}" aria-label="移除">×</button></span>`).join('');
  $$('#atts .x').forEach(b => b.onclick = () => {
    const a = S.atts[+b.dataset.i];
    if (a?.url) URL.revokeObjectURL(a.url);
    S.atts.splice(+b.dataset.i, 1);
    renderAtts();
  });
}

async function addFiles(files) {
  openChat();
  for (const f of files) {
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    try {
      if (f.type.startsWith('image/')) {
        S.atts.push({ kind: 'image', name: f.name, size: f.size, url: URL.createObjectURL(f) });
      } else if (['csv', 'tsv'].includes(ext)) {
        const text = await f.text();
        S.atts.push({ kind: 'table', name: f.name, size: f.size, parsed: parseTradeTable(text, tradeCtx()) });
      } else if (ext === 'xlsx') {
        const x = await parseXlsx(await f.arrayBuffer());
        S.atts.push(x.ok
          ? { kind: 'table', name: f.name, size: f.size, parsed: parseTradeTable(x.rows, tradeCtx()) }
          : { kind: 'error', name: f.name, size: f.size, reason: x.reason });
      } else if (ext === 'pdf') {
        const r = await extractPdfText(await f.arrayBuffer());
        S.atts.push(r.ok
          ? { kind: 'doc', name: f.name, size: f.size, text: r.text,
              meta: `${r.streams} 个内容流，其中 ${r.inflated} 个为压缩流` }
          : { kind: 'error', name: f.name, size: f.size, reason: r.reason });
      } else if (['txt', 'md', 'json', 'log'].includes(ext)) {
        S.atts.push({ kind: 'doc', name: f.name, size: f.size, text: await f.text() });
      } else {
        S.atts.push({ kind: 'error', name: f.name, size: f.size,
          reason: `暂不支持 .${ext}（当前支持 CSV / TSV / XLSX / PDF / TXT / MD / JSON / 图片）` });
      }
    } catch (e) {
      S.atts.push({ kind: 'error', name: f.name, size: f.size, reason: '读取失败：' + e.message });
    }
  }
  renderAtts();
  const okTable = S.atts.find(a => a.kind === 'table' && a.parsed?.ok);
  $('#chatHint').textContent = okTable
    ? `识别到 ${okTable.parsed.trades.length} 笔交易，发送后直接进评估引擎`
    : `已附加 ${S.atts.length} 个文件`;
}

/* ── 语音输入 ───────────────────────────────────────────────────
   两条腿走路：
     · Web Speech API 做真识别（Chrome / Edge）
     · getUserMedia + AnalyserNode 做实时音量指示，让用户看见「真的在听」
   识别不可用时明确说清原因和替代做法，而不是装作在录。 */
function setupVoice() {
  const btn = $('#micBtn');
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null, listening = false, base = '', audio = null, transcribing = false;

  // 提示文字和音量条共处一个容器：直接写 textContent 会把音量条一并抹掉，
  // 所以文字单独放在一个 <span> 里，音量条挂在它后面互不干扰。
  function setHint(text) {
    const host = $('#chatHint');
    let span = host.querySelector('.hintText');
    if (!span) { span = document.createElement('span'); span.className = 'hintText'; host.prepend(span); }
    span.textContent = text;
  }
  function clearHint() { $('#chatHint').textContent = ''; }
  function degrade(msg) { setHint(msg); toast(msg); }

  if (SR) {
    rec = new SR();
    rec.lang = 'zh-CN';
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let txt = '';
      for (let i = e.resultIndex; i < e.results.length; i++) txt += e.results[i][0].transcript;
      $('#chatText').value = (base + txt).trim();
      autoGrow($('#chatText'));
    };
    // 关键：语音**转文字**和语音**采集**是两件事。
    // 转写跑在云端（Chrome 把音频发给 Google 的服务），断网、企业策略、
    // 无头浏览器都会让它失败；但此时 getUserMedia 拿到的麦克风流仍然是好的。
    // 所以识别出错只降级转写，不能把整个录音会话拆掉。
    rec.onerror = (e) => {
      transcribing = false;
      const why = {
        'not-allowed': '麦克风权限被拒绝，请在地址栏左侧允许麦克风',
        'service-not-allowed': '浏览器拒绝了云端语音服务，录音仍在继续，但无法自动转文字',
        'no-speech': '没听到声音',
        'network': '语音转文字需要联网（Chrome 的识别在云端完成），录音仍在继续',
      }[e.error] || ('语音转文字出错：' + e.error);
      if (e.error === 'not-allowed' || !audio) { stopListen(); toast(why); return; }
      degrade(why);
    };
    rec.onend = () => {
      transcribing = false;
      // 云端识别会自己超时断开。麦克风还活着就继续录，别让用户白按。
      if (!listening) return;
      if (audio) degrade('录音进行中；云端转写已断开，可手动补充文字');
      else stopListen();
    };
  }

  async function startMeter() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const src = ctx.createMediaStreamSource(stream);
      const an = ctx.createAnalyser();
      an.fftSize = 256;
      src.connect(an);
      const data = new Uint8Array(an.frequencyBinCount);
      const meter = document.createElement('span');
      meter.className = 'vumeter';
      meter.innerHTML = '<i></i><i></i><i></i><i></i><i></i>';
      setHint('正在听……再点一次结束');
      $('#chatHint').appendChild(meter);
      const bars = [...meter.querySelectorAll('i')];
      // 时域波形比频谱更能反映「有没有人在说话」：静音时贴着 128 不动，
      // 出声就立刻张开。频谱在假麦克风（测试环境）下常年接近 0。
      const wave = new Uint8Array(an.fftSize);
      let frames = 0;
      const tick = () => {
        if (!listening) return;
        an.getByteFrequencyData(data);
        an.getByteTimeDomainData(wave);
        let peak = 0;
        for (let i = 0; i < wave.length; i++) peak = Math.max(peak, Math.abs(wave[i] - 128));
        const spec = data.reduce((a, b) => a + b, 0) / data.length;
        const level = Math.max(peak / 128, spec / 255);
        frames++;
        bars.forEach((b, i) => {
          const w = 0.55 + 0.45 * Math.sin(i * 1.1 + frames * 0.25);
          b.style.height = (3 + Math.min(1, level) * 13 * w).toFixed(2) + 'px';
        });
        meter.dataset.frames = frames;
        requestAnimationFrame(tick);
      };
      tick();
      audio = { stream, ctx };
      return true;
    } catch (e) {
      return false;
    }
  }
  function stopMeter() {
    if (!audio) return;
    try { audio.stream.getTracks().forEach(t => t.stop()); audio.ctx.close(); } catch (e) {}
    audio = null;
  }
  function stopListen() {
    listening = false;
    transcribing = false;
    btn.classList.remove('rec');
    clearHint();
    stopMeter();
    try { rec?.abort(); } catch (e) {}
  }

  btn.onclick = async () => {
    if (listening) { stopListen(); return; }

    // 浏览器只在**安全上下文**（https 或 localhost）下开放麦克风。
    // 直接双击打开的 file:// 页面拿不到 navigator.mediaDevices，
    // 这不是代码问题，是浏览器的硬约束 —— 所以要把原因说清楚，而不是静默失败。
    const canMic = !!navigator.mediaDevices?.getUserMedia;
    if (!SR && !canMic) {
      toast(window.isSecureContext
        ? '当前浏览器不支持语音输入，请用 Chrome 或 Edge'
        : '麦克风需要 https 或 localhost 才能使用；当前是 file:// 打开的本地文件');
      return;
    }

    base = $('#chatText').value ? $('#chatText').value + ' ' : '';
    listening = true;
    btn.classList.add('rec');
    setHint('正在听……再点一次结束');

    // 先起麦克风：它决定「录音」这件事成不成立。
    // 云端转写起不来只是少了自动填字，不影响录音本身。
    const gotMic = canMic ? await startMeter() : false;
    if (!listening) return;                       // 等待期间用户又点了一次
    let recStarted = false;
    if (rec) { try { rec.start(); recStarted = true; transcribing = true; } catch (e) {} }

    if (!gotMic && !recStarted) {
      stopListen();
      toast('麦克风不可用：' + (window.isSecureContext ? '权限被拒绝' : '需要通过 https 或 localhost 打开'));
      return;
    }
    if (!gotMic) setHint('正在听……（音量指示需要麦克风权限）');
    else if (!recStarted) setHint('正在录音；本浏览器不支持自动转文字，可直接打字');
  };
}

function autoGrow(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(132, el.scrollHeight) + 'px';
}

function sendChat() {
  const t = $('#chatText').value.trim();
  const atts = [...S.atts];
  if (!t && !atts.length) return;
  handleUserMessage(t, atts);
}
