/* ===== 公共工具（底座与陪练关卡共用）：DOM / 文本相近度 / 提示条 / 语音输入 / 知识库召回 / 启动 ===== */

function h(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
const now = () => { const d = new Date(); return d.toTimeString().slice(0, 8); };
const stamp = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${d.toTimeString().slice(0, 5)}`; };


function norm(s) { return (s || '').replace(/[\s，。、；：？！,.;:?!（）()"'“”‘’·「」 ]/g, ''); }
function lcs(a, b) {
  const m = a.length, n = b.length; if (!m || !n) return 0;
  let prev = new Array(n + 1).fill(0), cur = new Array(n + 1).fill(0);
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
    [prev, cur] = [cur, prev];
  }
  return prev[n];
}
function sim(a, b) { a = norm(a); b = norm(b); if (!a || !b) return 0; return lcs(a, b) / Math.max(a.length, b.length); }
function toast(t, k) {
  const e = el('div', 'toast ' + (k || ''), t); document.body.appendChild(e);
  setTimeout(() => { e.style.transition = '.3s'; e.style.opacity = 0; setTimeout(() => e.remove(), 320); }, 2100);
}

/* 语音输入：联网且经 http(s) 打开时浏览器识别（结果可改再发）；本地文件 / 离线 / 失败时兜底识别＝逐字打入当前该说的内容 */
let recTimer = null, recNow = null;
/* 语音输入：联网时用浏览器识别（结果可改再发）；离线按当前该说的内容逐字打入（复诵 / 回报的内容本来就在票面上） */
function micStart(btn, inp, fallback) {
  if (!btn || !inp) return;
  if (recNow) { try { recNow.stop(); } catch (e) { } recNow = null; btn.classList.remove('rec'); return; }
  if (recTimer) return;
  /* 浏览器识别只在联网且经 http(s) 打开时可用（本地文件打开拿不到麦克风权限，内网没有识别服务）；其余情况走兜底识别 */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const canSR = SR && navigator.onLine && location.protocol !== 'file:' && !window.__DH_MUTE;
  if (canSR) {
    try {
      const r = new SR(); r.lang = 'zh-CN'; r.interimResults = true; r.continuous = false;
      let got = false;
      r.onresult = e => { got = true; inp.value = Array.from(e.results).map(x => x[0].transcript).join(''); if (inp.oninput) inp.oninput(); };
      r.onend = () => { btn.classList.remove('rec'); recNow = null; if (!got && fallback) micType(btn, inp, fallback); };
      r.onerror = () => { got = true; btn.classList.remove('rec'); recNow = null; if (fallback) micType(btn, inp, fallback); else { toast('语音识别未能启动，请在文字框中输入', 'bad'); inp.focus(); } };
      btn.classList.add('rec'); r.start(); recNow = r; return;
    } catch (e) { }
  }
  if (fallback) return micType(btn, inp, fallback);
  toast('当前环境不支持语音识别，请在文字框中输入', ''); inp.focus();
}
function micType(btn, inp, text) {
  btn.classList.add('rec'); inp.value = ''; inp.placeholder = '正在识别…';
  let i = 0;
  recTimer = setInterval(() => {
    i += 2; inp.value = text.slice(0, i); if (inp.oninput) inp.oninput();
    if (i >= text.length) { clearInterval(recTimer); recTimer = null; btn.classList.remove('rec'); inp.placeholder = ''; }
  }, 34);
}

/* ---------------- 启动 ---------------- */
function boot() {
  document.body.innerHTML = '<div id="pg_home"></div>';
  homeBoot();
  route();
  window.addEventListener('hashchange', route);
}
