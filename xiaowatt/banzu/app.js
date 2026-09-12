/* ===== 应用框架：两个角色（班组长 / 管理者）、路由、左栏、命令栏、事件委托、讲师演示台（扩展模块 / 功能实现状态清单 / 案例日期） ===== */
const S = { page: 'home', sub: '', pending: null, briefed: false };
const PAGES = {}, ACT = {};
const ROLES = {
  leader: { n: '班组长', who: '赵立群', scope: TEAM.name + ' · 本班 12 人', home: 'home' },
  manager: { n: '管理者', who: '陈国安', scope: TEAM.dept + ' · 管辖 3 个班组 31 人', home: 'super' }
};
function role() { return DB.role(); }
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
  bldg: '<rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M10 21v-3h4v3"/>',
  flow: '<circle cx="5" cy="12" r="2"/><circle cx="12" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><circle cx="19" cy="12" r="2"/><path d="M7 11l3-4M7 13l3 4M14 7l3 4M14 17l3-4"/>',
  warn: '<path d="M12 3l9 16H3z"/><path d="M12 10v4M12 17h.01"/>',
  swap: '<path d="M4 8h12l-3-3M20 16H8l3 3"/>',
  star: '<path d="M12 3l2.7 5.6 6.2.9-4.5 4.3 1.1 6.1L12 17l-5.5 2.9 1.1-6.1L3.1 9.5l6.2-.9z"/>',
  gauge: '<path d="M4 16a8 8 0 0116 0"/><path d="M12 16l4-5"/><circle cx="12" cy="16" r="1.5"/>',
  doc: '<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4M9 12h6M9 16h6"/>',
  cog: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/>',
  tree: '<circle cx="12" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="19" r="2"/><path d="M12 7v5M12 12l-6 5M12 12l6 5"/>'
};
/* 班组长：6 项 + 扩展模块（讲师演示台开关，默认隐藏）；管理者：部门层 9 项 + 可进本班画像与台账 */
function NAV_OF() {
  if (role() === 'manager') return [
    { g: '管理者' }, { k: 'super', n: '部门态势', i: 'v', ic: 'bldg' }, { k: 'flow', n: '全流程俯瞰', i: 'o', ic: 'flow', badge: () => DB.transfers().filter(t => t.st === '待确认').length },
    { k: 'risk', n: '风险与统筹', i: 'r', ic: 'warn' }, { k: 'duty', n: '班长履职', i: 'g', ic: 'check' }, { k: 'talent', n: '人才梯队', i: 'c', ic: 'tree' },
    { k: 'star', n: '星级对标', i: 'v', ic: 'star' }, { k: 'effect', n: '组织效能', i: 'o', ic: 'gauge' }, { k: 'report', n: '参谋输出', i: 'c', ic: 'doc' }, { k: 'config', n: '配置与权限', i: '', ic: 'cog' },
    { g: '班组' }, { k: 'people', n: '班组画像', i: 'g', ic: 'people' }, { k: 'ledger', n: '台账中心', i: '', ic: 'grid' }, { k: 'ask', n: '问小瓦特', i: 'v', ic: 'spark' }
  ];
  const nav = [
    { g: '入口' }, { k: 'home', n: '今日工作台', i: '', ic: 'sun', badge: () => HOMEPG.pending() }, { k: 'ask', n: '问小瓦特', i: 'v', ic: 'spark' },
    { g: '人员' }, { k: 'people', n: '班组画像', i: 'g', ic: 'people' }, { k: 'sched', n: '用工安排', i: 'o', ic: 'cal', badge: () => DB.jobs().filter(j => j.st === '待派').length }, { k: 'train', n: '培养与回写', i: 'v', ic: 'check' },
    { g: '知识与台账' }, { k: 'know', n: '班组知识库', i: 'c', ic: 'book' }, { k: 'ledger', n: '台账中心', i: '', ic: 'grid' }
  ];
  if (DB.ext()) nav.push({ g: '扩展模块' }, { k: 'safety', n: '安全管理', i: 'r', ic: 'shield' }, { k: 'docs', n: '文稿中心', i: 'c', ic: 'pen' });
  return nav;
}
const ALLOW = { leader: ['home', 'ask', 'people', 'sched', 'train', 'know', 'ledger', 'safety', 'docs'], manager: ['super', 'flow', 'risk', 'duty', 'talent', 'star', 'effect', 'report', 'config', 'people', 'ledger', 'ask', 'sched', 'train', 'know'] };
/* 功能实现状态清单（讲师演示台） */
const STATUS_LIST = [
  ['真实实现', ['状态层流程：派工 → 审票 → 开工 → 回传 → 完工 → 验收，每步写入本机、刷新可回看', '两票 Word / Excel / 文本离线读取与逐项审核、补齐、退回', '派工四条规则校验（证书 / 核心技能 / 工时 / 冲突）与逐人推荐、排除理由', '关键节点周闭环记录、核心技能实操量完工回写', '五类画像指标从台账计算，指标模型确认记录', '跨班组调配：发起 → 班长确认 → 返岗评价，两个角色同一份记录']],
  ['规则模拟', ['值班表按四条约束排班', '添加任务按名称推断类型、票种、资质', '周报要点转本周关键节点重点', '文稿逐段生成与局部重写', '调配影响测算（原班节点、工时、资质）', '人才流失与证书到期预测', '班长履职客观指标']],
  ['预设展示', ['照片隐患识别（扩展模块，矢量图）', '语音转写', '试验班与配电运维一班人员明细', '近 30 天出勤与近四季度成长轨迹', '试验班 2025 年试验记录按月聚合']],
  ['待系统对接', ['OMS 缺陷与工单同步', 'OCS 终端在线状态', '电网管理平台两票与作业计划', '人资证书与学时台账', '通知推送到个人', 'PDF 与照片文字读取']]
];
function shell() {
  document.body.innerHTML = '<div id="app"><nav class="sb" id="sb"></nav><section id="main"></section><aside class="side" id="side"></aside></div>' +
    '<button class="stagebtn" data-act="stage">讲师演示台</button><div class="stage" id="stage"><div class="t">讲师演示台 <span class="note">案例日期 ' + TODAY + ' · 周报第 ' + WK29.no + ' 期</span></div><div class="row">语速 <button data-act="stage-speed" data-v="1" class="on">正常</button><button data-act="stage-speed" data-v=".5">快</button><button data-act="stage-speed" data-v=".2">极快</button></div><div class="row">角色 <button data-act="role-set" data-r="leader">班组长</button><button data-act="role-set" data-r="manager">管理者</button></div><div class="row"><button data-act="stage-brief">重播晨间简报</button><button data-act="stage-ext">扩展模块' + (DB.ext() ? '：开' : '：关') + '</button><button data-act="stage-status">功能实现状态清单</button><button data-act="stage-reset">清空本机记录</button></div><div class="row" id="stagenav"></div></div><div class="modal" id="modal" hidden></div>';
  $('#side').innerHTML = XW.sideHTML();
}
function renderNav() {
  const R = ROLES[role()]; const NAV = NAV_OF();
  $('#sb').innerHTML = '<div class="brand"><img src="__LOGO__" alt=""><div><b>小瓦特·班</b><span>' + h(TAGLINE) + '</span></div></div>' +
    NAV.map(n => n.g ? '<div class="grp">' + n.g + '</div>' : '<a class="' + (S.page === n.k ? 'on' : '') + '" data-act="nav" data-to="' + n.k + '"><i class="' + n.i + '">' + '<svg viewBox="0 0 24 24">' + ICO[n.ic] + '</svg></i>' + n.n + (n.badge && n.badge() ? '<em>' + n.badge() + '</em>' : '') + '</a>').join('') +
    '<div class="me" data-act="role-menu"><i>' + h(R.who[0]) + '</i><div>' + h(R.who) + '<span>' + h(R.scope) + ' · ' + h(R.n) + '</span></div><div class="rsw">' + Object.keys(ROLES).map(k => '<button data-act="role-set" data-r="' + k + '" class="' + (k === role() ? 'on' : '') + '">' + ROLES[k].n + '</button>').join('') + '</div></div>';
  const sn = $('#stagenav'); if (sn) sn.innerHTML = NAV.filter(n => n.k).map(n => '<button data-act="nav" data-to="' + n.k + '">' + n.n + '</button>').join('');
}
function cmdHTML(sugs) { return '<div class="cmd"><i class="ic"></i><input id="cmdin" placeholder="输入要办的事，回车"><div class="tools"><em id="mic1" data-act="mic1" title="按住说话">🎙</em><em data-act="up-photo" title="拍照或上传照片">📷</em><em data-act="up-file" title="拖入台账文件">📎</em></div><div class="sug">' + (sugs || []).map(s => '<b data-act="say" data-say="' + h(s) + '">' + h(s) + '</b>').join('') + '</div></div>'; }
function pageHead(title, sub, right) { return '<div class="ph1"><h2>' + h(title) + '</h2><span>' + (sub || '') + '</span><div class="r">' + (right || '') + '</div></div>'; }
function tabsHTML(list, cur) { return '<div class="tabs">' + list.map(t => '<button class="' + (t.k === cur ? 'on' : '') + '" data-act="nav" data-to="' + S.page + '" data-sub="' + t.k + '">' + h(t.n) + '</button>').join('') + '</div>'; }
function route() { const hs = (location.hash || '#' + ROLES[role()].home).slice(1).split('/'); let pg = PAGES[hs[0]] ? hs[0] : ROLES[role()].home; if (!ALLOW[role()].includes(pg)) pg = ROLES[role()].home; if (!DB.ext() && (pg === 'safety' || pg === 'docs') && role() === 'leader') pg = 'home'; S.page = pg; S.sub = hs[1] || ''; render(); }
function render() {
  XW.cancel(); XW.unspot(); const pg = PAGES[S.page]; const m = $('#main');
  m.innerHTML = pg.render() + '<div class="cursor" id="cur"><svg viewBox="0 0 20 20"><path d="M3 2 L17 10 L10 11.5 L7 18 Z" fill="#5a5bf0" stroke="#fff" stroke-width="1.2"/></svg><span class="lbl">小瓦特</span></div>';
  renderNav(); m.scrollTop = 0; pg.after && pg.after();
  if (S.pending) { const f = S.pending; S.pending = null; XW.at(300, f); }
}
function nav(page, sub) { const hsh = '#' + page + (sub ? '/' + sub : ''); if (location.hash === hsh) render(); else location.hash = hsh; }
function ensure(page, fn, sub) { if (S.page === page && (!sub || S.sub === sub)) fn(); else { S.pending = fn; nav(page, sub); } }
function badgeSync() { renderNav(); }
function modal(html) { const m = $('#modal'); m.innerHTML = '<div class="mbox">' + html + '<div class="bt" style="justify-content:flex-end"><button class="g" data-act="modal-close">关闭</button></div></div>'; m.hidden = false; }
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
  hours(el) { DISPATCH.hours(el.dataset.who || '黄伟强'); },
  'up-photo'() { XW.answer('把照片拖进来或者从相册选，我先按文件名对台账，票面上的字要 Word 或 Excel 版才能逐条读。', null, { confirm: false }); },
  'up-file'() { XW.answer('台账表拖进来我自己对表头；两票在用工安排的审票里上传，Word、Excel、文本都能读。最近一次导入是今早 07:30 的周报第 29 期。', '台账表拖进来我自己对表头；两票在用工安排的审票里上传。<div class="bt"><button data-act="nav" data-to="sched" data-sub="ticket">去上传两票</button></div>', { confirm: false }); },
  stage() { $('#stage').classList.toggle('on'); },
  'stage-speed'(el) { XW.speed = +el.dataset.v; $$('#stage [data-act="stage-speed"]').forEach(b => b.classList.toggle('on', b === el)); },
  'stage-brief'() { S.briefed = false; XW.clearChat(); if (role() !== 'leader') { DB.setRole('leader'); } location.hash = '#home'; render(); },
  'stage-ext'(el) { LS.set('ext', !DB.ext()); el.textContent = '扩展模块' + (DB.ext() ? '：开' : '：关'); renderNav(); XW.answer(DB.ext() ? '扩展模块打开了：安全管理、文稿中心的全部文稿类型在左栏里。' : '扩展模块收起了，左栏只留人员主线。', null, { confirm: false, speak: false }); },
  'stage-status'() { modal('<h3>功能实现状态清单</h3><div class="note" style="margin-bottom:8px">案例日期 ' + TODAY + '（周报第 ' + WK29.no + ' 期发布日）· 业务数据内置于单文件，状态保存在本机</div>' + STATUS_LIST.map(([k, list]) => '<div class="stl"><b class="tag ' + ({ 真实实现: 'ok', 规则模拟: 'v', 预设展示: 'w', 待系统对接: 'bad' }[k]) + '">' + k + '</b><ul>' + list.map(x => '<li>' + h(x) + '</li>').join('') + '</ul></div>').join('')); },
  'modal-close'() { $('#modal').hidden = true; },
  'stage-reset'() { DB.reset(); location.reload(); },
  'role-menu'() {},
  'role-set'(el) { const r = el.dataset.r; if (!ROLES[r] || r === role()) return; DB.setRole(r); S.briefed = false; XW.clearChat(); location.hash = '#' + ROLES[r].home; render(); XW.answer(r === 'manager' ? '切到管理者了：看的是' + TEAM.dept + '管辖的三个班组，能发起跨班组调配，涉及人的结论仍由班组长确认。' : '切到班组长了：只看' + TEAM.name + '本班。', null, { confirm: false, speak: false }); }
});
document.addEventListener('click', e => { const el = e.target.closest('[data-act]'); if (!el) return; const a = el.dataset.act; if (ACT[a]) { if (!/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) e.preventDefault(); ACT[a](el, e); } });
document.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.target.id === 'cmdin' || e.target.id === 'chatin')) { const v = e.target.value.trim(); e.target.value = ''; if (v) XW.ask(v, false); } });
window.addEventListener('hashchange', route);
function boot() { shell(); route(); setInterval(() => { const c = $('#clock'); if (c) c.textContent = new Date().toTimeString().slice(0, 5); }, 1000); }
