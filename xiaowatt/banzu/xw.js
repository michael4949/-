/* ===== 小瓦特引擎：形象、状态、字幕、对话、光标、通知、台账聚光、记忆 ===== */
const XW_IMGS = __XW_IMGS__; // build.py 内联 assets/xiaowatt/*.png（main/talk/think/look/work/listen）；没有则用内置 SVG
const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
function h(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

const XW = {
  speed: (typeof window !== 'undefined' && window.__XW_SPEED) || 1,
  timers: [], state_: '', busy: false,
  at(ms, fn) { const t = setTimeout(fn, Math.max(0, ms * this.speed)); this.timers.push(t); return t; },
  cancel() { this.timers.forEach(t => { clearTimeout(t); clearInterval(t); }); this.timers = []; this.cursorOff(); },
  /* 逐字：同一元素上新的 type 会取消旧的 */
  type(el, text, ms, done) {
    if (el._t) clearInterval(el._t);
    const setT = v => { if ('value' in el && el.tagName === 'INPUT') el.value = v; else el.textContent = v; };
    setT(''); el.classList && el.classList.add('cur');
    let i = 0; const sp = Math.max(1, (ms || 40) * this.speed); const inChat = !!(el.closest && el.closest('#chat'));
    const t = setInterval(() => {
      i += 1; setT(text.slice(0, i)); if (inChat && i % 8 === 0) this.scrollChat();
      if (i >= text.length) { clearInterval(t); el._t = null; el.classList && el.classList.remove('cur'); if (inChat) this.scrollChat(); done && done(); }
    }, sp);
    el._t = t; this.timers.push(t); return t;
  },
  /* 形象与状态 */
  avatarHTML() {
    if (XW_IMGS && XW_IMGS.main) return '<img id="xwimg" class="full" src="' + XW_IMGS.main + '" alt="">';
    return '<svg viewBox="0 0 120 120"><defs><linearGradient id="gxw" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5a5bf0"/><stop offset="1" stop-color="#9a4dff"/></linearGradient></defs><circle cx="60" cy="60" r="50" fill="url(#gxw)"/><circle cx="60" cy="62" r="38" fill="#fff" opacity=".95"/><path class="brow" d="M40 44 q8 -6 16 0 M64 44 q8 -6 16 0" stroke="#5a5bf0" stroke-width="3" fill="none" stroke-linecap="round"/><g class="eye"><circle cx="46" cy="56" r="5" fill="#2a2f6b"/><circle cx="74" cy="56" r="5" fill="#2a2f6b"/><circle cx="48" cy="54" r="1.8" fill="#fff"/><circle cx="76" cy="54" r="1.8" fill="#fff"/></g><path class="mouth" d="M48 76 q12 10 24 0" stroke="#5a5bf0" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M60 8 l-7 16 h9 l-7 16" stroke="#ffd166" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  },
  LABEL: { '': '待命', talk: '正在说', think: '正在想', look: '正在看', work: '正在操作', listen: '正在听', write: '正在写' },
  state(k, label) {
    this.state_ = k || '';
    const x = $('#xw'); if (!x) return; x.className = 'xw breath ' + (k === 'write' ? 'work' : (k || ''));
    const st = $('#xwst'); if (st) st.innerHTML = '<i>' + (label || this.LABEL[k || '']) + '</i> · 由班组长确认后使用';
    const img = $('#xwimg'); if (img && XW_IMGS) { const key = k === 'write' ? 'work' : k; img.src = XW_IMGS[key] || XW_IMGS.main; }
  },
  /* 她说的话（字幕） */
  say(text, ms, done) { this.state('talk'); this.type($('#xwsub'), text, ms || 52, () => { this.state(''); done && done(); }); },
  /* 对话 */
  scrollChat() { const c = $('#chat'); if (c) c.scrollTop = c.scrollHeight; },
  msg(kind, html) { const d = document.createElement('div'); d.className = 'msg ' + kind; d.innerHTML = html || ''; $('#chat').appendChild(d); requestAnimationFrame(() => { d.classList.add('in'); this.scrollChat(); }); return d; },
  user(text, voice) { const d = this.msg('u', (voice ? '<div class="wave">' + '<i></i>'.repeat(16) + '</div>' : '') + '<span></span>'); this.type(d.querySelector('span'), text, voice ? 70 : 28, () => d.classList.add('done')); return d; },
  think(text, done) { this.state('think'); const d = this.msg('t', '<span class="lbl">小瓦特在想</span><span></span>'); this.type(d.querySelector('span:last-child'), text, 34, () => { this.state(''); done && done(); }); return d; },
  /* answer(text, html, opt)：先逐字出 text，完成后若给 html 则替换为 html（含按钮）；opt.speak=false 不上字幕 */
  answer(text, html, opt) { opt = opt || {}; this.state('talk'); const d = this.msg('a', '');
    this.type(d, text, 40, () => { if (html) d.innerHTML = html; if (opt.chart) { const c = document.createElement('div'); c.className = 'mchart'; c.innerHTML = opt.chart; const bt = d.querySelector('.bt'); if (bt) d.insertBefore(c, bt); else d.appendChild(c); } if (opt.confirm !== false && /建议|人选|等级|评价|安排/.test(text) && !/由班组长|由你/.test(text)) d.insertAdjacentHTML('beforeend', '<div class="cf">由班组长确认后使用</div>'); this.state(''); this.scrollChat(); opt.done && opt.done(); });
    if (opt.speak !== false) this.type($('#xwsub'), text.length > 64 ? text.slice(0, 64) + '…' : text, 45);
    return d; },
  card(html) { return this.msg('a', html); },
  chart(svg, caption) { return this.msg('a', (caption ? '<div class="note" style="margin-bottom:4px">' + h(caption) + '</div>' : '') + '<div class="mchart">' + svg + '</div>'); },
  /* 光标（她的手） */
  cursorTo(sel, dx, dy) { const el = typeof sel === 'string' ? $(sel) : sel; if (!el) return; const c = $('#cur'), m = $('#main'); el.scrollIntoView({ block: 'nearest' }); const r = el.getBoundingClientRect(), mr = m.getBoundingClientRect(); c.style.left = (r.left - mr.left + m.scrollLeft + (dx == null ? 10 : dx)) + 'px'; c.style.top = (r.top - mr.top + m.scrollTop + (dy == null ? 10 : dy)) + 'px'; c.classList.add('on'); },
  cursorOff() { const c = $('#cur'); if (c) c.classList.remove('on'); },
  fill(sel, text, ms, done) { const el = typeof sel === 'string' ? $(sel) : sel; if (!el) { done && done(); return; } el.classList.add('fill'); this.type(el, text, ms || 34, done); },
  press(sel) { const el = typeof sel === 'string' ? $(sel) : sel; if (el) { el.classList.add('pressed'); this.at(400, () => el.classList.remove('pressed')); } },
  /* 通知卡 */
  fly(text, kind) { let box = $('#flys'); if (!box) { box = document.createElement('div'); box.id = 'flys'; box.className = 'flys'; document.body.appendChild(box); } const d = document.createElement('div'); d.className = 'fly ' + (kind || ''); d.textContent = text; box.appendChild(d); requestAnimationFrame(() => d.classList.add('in')); this.at(5200, () => { d.classList.remove('in'); this.at(600, () => d.remove()); }); },
  /* 台账聚光：cfg={title, cols, rows:[[...]], me:[rowIdx], sumCol, unit, words:[逐行旁白], text:最后一句} */
  spot(cfg) {
    let sp = $('#spot'); if (!sp) { sp = document.createElement('div'); sp.id = 'spot'; sp.className = 'spot'; document.body.appendChild(sp); }
    sp.classList.remove('lit'); sp.classList.add('on');
    sp.innerHTML = '<div class="box"><div class="h"><b>' + h(cfg.title) + '</b><button data-act="unspot">收起</button></div><div class="tbl"><table class="t"><tr>' + cfg.cols.map(c => '<th>' + h(c) + '</th>').join('') + '</tr>' +
      cfg.rows.map((r, i) => '<tr class="' + ((cfg.me || []).includes(i) ? 'me' : '') + '">' + r.map((c, j) => '<td class="' + (j === cfg.sumCol ? 'v' : '') + '">' + h(c) + '</td>').join('') + '</tr>').join('') + '</table></div><div class="sum" id="spotsum"></div></div>';
    this.state('look', '正在指给你看');
    this.at(200, () => sp.classList.add('lit'));
    const rows = $$('tr.me', sp); let sum = 0;
    rows.forEach((r, i) => this.at(700 + i * 1000, () => { r.classList.add('hl'); r.scrollIntoView({ block: 'nearest' }); if (cfg.sumCol != null) { sum += +cfg.rows[(cfg.me || [])[i]][cfg.sumCol] || 0; $('#spotsum').textContent = '小计 ' + sum + ' ' + (cfg.unit || ''); } }));
    if (cfg.text) this.at(500, () => this.answer(cfg.text, null, { speak: false }));
    this.at(800 + rows.length * 1000, () => this.state(''));
  },
  unspot() { const sp = $('#spot'); if (sp) sp.classList.remove('on', 'lit'); this.state(''); },
  /* 记忆（偏好与约定，本机） */
  mem: { all() { return LS.get('mem', {}); }, get(k, d) { const m = LS.get('mem', {}); return k in m ? m[k] : d; }, set(k, v) { const m = LS.get('mem', {}); m[k] = v; LS.set('mem', m); } },
  /* 麦克风（辅助入口）：录 1.5 秒 → 转写落进输入框 → 复述理解 → 对/不是 */
  mic(btnSel, inputSel, text, onYes) {
    const m = $(btnSel), inp = $(inputSel); if (!m || m.classList.contains('rec')) return; m.classList.add('rec'); this.state('listen');
    this.at(1500, () => { m.classList.remove('rec'); this.type(inp, text, 40, () => this.at(400, () => { inp.value = ''; this.user(text, true); this.at(2400, () => { this.answer('我理解是：' + text.replace(/[。！]$/, '') + '，对吗？', '我理解是：' + h(text.replace(/[。！]$/, '')) + '，对吗？<div class="bt"><button data-act="mic-yes">对</button><button class="g" data-act="mic-no">不是</button></div>', { confirm: false }); XW._micYes = onYes; }); })); });
  },
  /* 右栏结构 */
  sideHTML() {
    return '<div class="sh' + (XW_IMGS && XW_IMGS.main ? ' full' : '') + '"><div class="xw breath" id="xw"><div class="ring"></div>' + this.avatarHTML() + '</div><div class="nm"><b>小瓦特</b><span id="xwst"><i>待命</i> · 由班组长确认后使用</span><span>' + h(TEAM.name) + '</span></div></div>' +
      '<div class="sub" id="xwsub"></div><div class="chat" id="chat"></div>' +
      '<div class="inp"><input id="chatin" placeholder="问她，或点页面上的按钮"><em id="mic2" data-act="mic2">🎙</em><button data-act="send2">发送</button></div>';
  },
  clearChat() { const c = $('#chat'); if (c) c.innerHTML = ''; const s = $('#xwsub'); if (s) s.textContent = ''; }
};
