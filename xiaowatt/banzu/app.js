/* ===== 应用框架：路由、左栏、命令栏、事件委托、讲师演示台 ===== */
const S = { page: 'home', sub: '', pending: null, briefed: false };
const PAGES = {}, ACT = {};
const ICO = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>',
  spark: '<path d="M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2z"/>',
  cal: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M8 3v4M16 3v4"/>',
  shield: '<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><path d="M12 9v4M12 16h.01"/>',
  pen: '<path d="M4 20l4-1 10-10-3-3L5 16z"/><path d="M13 7l3 3"/>',
  people: '<circle cx="9" cy="8" r="3.2"/><circle cx="17" cy="9.5" r="2.4"/><path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5M14.5 18.5c.3-2.2 1.8-3.5 4-3.5 1.2 0 2.2.4 3 1"/>',
  check: '<path d="M4 12.5l5 5L20 7"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 016.5 3H20v15H6.5A2.5 2.5 0 004 20.5z"/><path d="M4 18.5A2.5 2.5 0 016.5 16H20M8 7h8"/>',
  grid: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 10h16M4 15h16M10 4v16"/>',
  bldg: '<rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M10 21v-3h4v3"/>'
};
const NAV = [
  { g: '入口' }, { k: 'home', n: '今日工作台', i: '', ic: 'sun', badge: () => HOMEPG.pending() }, { k: 'ask', n: '问小瓦特', i: 'v', ic: 'spark' },
  { g: '班务' }, { k: 'sched', n: '班务日程', i: 'o', ic: 'cal' }, { k: 'safety', n: '安全管理', i: 'r', ic: 'shield', badge: () => DB.defects().filter(d => /超期|待确认/.test(d.st)).length }, { k: 'docs', n: '文稿中心', i: 'c', ic: 'pen' },
  { g: '人员' }, { k: 'people', n: '班组画像', i: 'g', ic: 'people' }, { k: 'train', n: '培训考评', i: 'v', ic: 'check' },
  { g: '知识' }, { k: 'know', n: '班组知识库', i: 'c', ic: 'book' }, { k: 'ledger', n: '台账中心', i: '', ic: 'grid' },
  { g: '管理' }, { k: 'office', n: '所级视图', i: 'o', ic: 'bldg' }
];
function shell() {
  document.body.innerHTML = '<div id="app"><nav class="sb" id="sb"></nav><section id="main"></section><aside class="side" id="side"></aside></div>' +
    '<button class="stagebtn" data-act="stage">讲师演示台</button><div class="stage" id="stage"><div class="t">讲师演示台</div><div class="row">语速 <button data-act="stage-speed" data-v="1" class="on">正常</button><button data-act="stage-speed" data-v=".5">快</button><button data-act="stage-speed" data-v=".2">极快</button></div><div class="row"><button data-act="stage-brief">重播晨间简报</button><button data-act="stage-reset">清空本机记录</button></div><div class="row">' + NAV.filter(n => n.k).map(n => '<button data-act="nav" data-to="' + n.k + '">' + n.n + '</button>').join('') + '</div></div>';
  $('#side').innerHTML = XW.sideHTML();
}
function renderNav() {
  $('#sb').innerHTML = '<div class="brand"><img src="__LOGO__" alt=""><div><b>小瓦特·班</b><span>班组长 AI 助手</span></div></div>' +
    NAV.map(n => n.g ? '<div class="grp">' + n.g + '</div>' : '<a class="' + (S.page === n.k ? 'on' : '') + '" data-act="nav" data-to="' + n.k + '"><i class="' + n.i + '">' + '<svg viewBox="0 0 24 24">' + ICO[n.ic] + '</svg></i>' + n.n + (n.badge && n.badge() ? '<em>' + n.badge() + '</em>' : '') + '</a>').join('') +
    '<div class="me"><i>赵</i><div>' + h(TEAM.leader) + '<span>' + h(TEAM.name) + ' · 班长</span></div></div>';
}
function cmdHTML(sugs) { return '<div class="cmd"><i class="ic"></i><input id="cmdin" placeholder="输入要办的事，回车"><div class="tools"><em id="mic1" data-act="mic1" title="按住说话">🎙</em><em data-act="up-photo" title="拍照或上传照片">📷</em><em data-act="up-file" title="拖入台账文件">📎</em></div><div class="sug">' + (sugs || []).map(s => '<b data-act="say" data-say="' + h(s) + '">' + h(s) + '</b>').join('') + '</div></div>'; }
function pageHead(title, sub, right) { return '<div class="ph1"><h2>' + h(title) + '</h2><span>' + (sub || '') + '</span><div class="r">' + (right || '') + '</div></div>'; }
function tabsHTML(list, cur) { return '<div class="tabs">' + list.map(t => '<button class="' + (t.k === cur ? 'on' : '') + '" data-act="nav" data-to="' + S.page + '" data-sub="' + t.k + '">' + h(t.n) + '</button>').join('') + '</div>'; }
function route() { const hs = (location.hash || '#home').slice(1).split('/'); S.page = PAGES[hs[0]] ? hs[0] : 'home'; S.sub = hs[1] || ''; render(); }
function render() {
  XW.cancel(); XW.unspot(); const pg = PAGES[S.page]; const m = $('#main');
  m.innerHTML = pg.render() + '<div class="cursor" id="cur"><svg viewBox="0 0 20 20"><path d="M3 2 L17 10 L10 11.5 L7 18 Z" fill="#5a5bf0" stroke="#fff" stroke-width="1.2"/></svg><span class="lbl">小瓦特</span></div>';
  renderNav(); m.scrollTop = 0; pg.after && pg.after();
  if (S.pending) { const f = S.pending; S.pending = null; XW.at(300, f); }
}
function nav(page, sub) { const hsh = '#' + page + (sub ? '/' + sub : ''); if (location.hash === hsh) render(); else location.hash = hsh; }
function ensure(page, fn, sub) { if (S.page === page && (!sub || S.sub === sub)) fn(); else { S.pending = fn; nav(page, sub); } }
function badgeSync() { renderNav(); }
/* 通用动作 */
Object.assign(ACT, {
  nav(el) { nav(el.dataset.to, el.dataset.sub || ''); },
  say(el) { XW.ask(el.dataset.say, false); },
  send2() { const i = $('#chatin'); const v = i.value.trim(); i.value = ''; if (v) XW.ask(v, false); },
  mic1() { XW.mic('#mic1', '#cmdin', XW.micText(), XW.micYes); },
  mic2() { XW.mic('#mic2', '#chatin', XW.micText(), XW.micYes); },
  'mic-yes'() { if (XW._micYes) { const f = XW._micYes; XW._micYes = null; f(); } },
  'mic-no'() { XW.answer('那你直接打字告诉我，或者点页面上的按钮。', null, { confirm: false }); },
  unspot() { XW.unspot(); },
  hours(el) { DISPATCH.hours(el.dataset.who || '李文博'); },
  'up-photo'() { XW.answer('把照片拖进来或者从相册选，我认完给你看。今天群里那张田寮线的照片我已经认过了，在安全管理里。', null, { confirm: false }); },
  'up-file'() { XW.answer('台账表拖进来我自己对表头；两票在班务日程的审票里上传，Word、Excel、文本都能读。上一次导入是昨晚 23:10 的缺陷表。', '台账表拖进来我自己对表头；两票在班务日程的审票里上传。<div class="bt"><button data-act="nav" data-to="sched" data-sub="ticket">去上传两票</button></div>', { confirm: false }); },
  stage() { $('#stage').classList.toggle('on'); },
  'stage-speed'(el) { XW.speed = +el.dataset.v; $$('#stage [data-act="stage-speed"]').forEach(b => b.classList.toggle('on', b === el)); },
  'stage-brief'() { S.briefed = false; XW.clearChat(); ensure('home', () => {}); if (S.page === 'home') render(); },
  'stage-reset'() { DB.reset(); location.reload(); }
});
document.addEventListener('click', e => { const el = e.target.closest('[data-act]'); if (!el) return; const a = el.dataset.act; if (ACT[a]) { if (!/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) e.preventDefault(); ACT[a](el, e); } });
document.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.target.id === 'cmdin' || e.target.id === 'chatin')) { const v = e.target.value.trim(); e.target.value = ''; if (v) XW.ask(v, false); } });
window.addEventListener('hashchange', route);
function boot() { shell(); route(); setInterval(() => { const c = $('#clock'); if (c) c.textContent = new Date().toTimeString().slice(0, 5); }, 1000); }
