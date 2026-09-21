/* ===== 应用框架：两个角色（班组长 / 管理者）、路由、左栏、命令栏、事件委托、讲师演示台（扩展模块 / 功能实现状态清单 / 案例日期） ===== */
const S = { page: 'home', sub: '', pending: null, briefed: false };
const PAGES = {}, ACT = {};
const ROLES = {
  leader: { n: '班组长', who: '赵立群', scope: TEAM.name + ' · 本班 12 人', home: 'team' },
  manager: { n: '管理者', who: '陈国安', scope: TEAM.dept + ' · 管辖 3 个班组 31 人', home: 'goals' }
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
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/>',
  cmpr: '<rect x="4" y="10" width="4" height="10"/><rect x="10" y="5" width="4" height="15"/><rect x="16" y="13" width="4" height="7"/>',
  hex: '<path d="M12 3l7.8 4.5v9L12 21l-7.8-4.5v-9z"/><path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9"/>',
  heart: '<path d="M12 20s-7-4.5-7-10a4 4 0 017-2.5A4 4 0 0119 10c0 5.5-7 10-7 10z"/>',
  tree: '<circle cx="12" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="19" r="2"/><path d="M12 7v5M12 12l-6 5M12 12l6 5"/>'
};
/* 班组长：班组管理 6 项在前，日常业务 5 项在后；管理者：业务 2 项 + 管理 6 项 + 班组 2 项（9/21 客户口径：业务减、管理加） */
function NAV_OF() {
  if (role() === 'manager') return [
    { g: '业务' }, { k: 'goals', n: '年度指标任务', ic: 'target', badge: () => goalsAll().filter(g => g.light === 'bad').length }, { k: 'compare', n: '班组横向对比', ic: 'cmpr' },
    { g: '管理' }, { k: 'portrait', n: '团队画像总览', ic: 'star' }, { k: 'staff', n: '人员总览', ic: 'people' }, { k: 'structure', n: '班组结构对比', ic: 'hex' }, { k: 'risks', n: '团队风险画像', ic: 'warn', badge: () => riskAgg().filter(r => r.lv === '高').length }, { k: 'mcare', n: '员工关怀', ic: 'heart' }, { k: 'madvise', n: '分析参谋', ic: 'doc' },
    { g: '班组' }, { k: 'ledger', n: '台账中心', ic: 'grid' }, { k: 'ask', n: '问小瓦特', ic: 'spark' }
  ];
  const nav = [
    { g: '班组管理' }, { k: 'team', n: '班组画像', ic: 'star' }, { k: 'skills', n: '班员画像', ic: 'hex' }, { k: 'grow', n: '培养与梯队', ic: 'tree' }, { k: 'perf', n: '绩效与激励', ic: 'gauge' }, { k: 'care', n: '关怀与文化', ic: 'heart', badge: () => careList().filter(c => !LS.get('care_done', {})[c.k + '|' + c.who + '|' + c.when]).length }, { k: 'advise', n: '分析参谋', ic: 'doc' },
    { g: '日常业务' }, { k: 'home', n: '今日工作台', ic: 'sun', badge: () => HOMEPG.pending() }, { k: 'sched', n: '用工安排', ic: 'cal', badge: () => DB.jobs().filter(j => j.st === '待派').length }, { k: 'know', n: '知识库', ic: 'book' }, { k: 'ledger', n: '台账中心', ic: 'grid' }, { k: 'ask', n: '问小瓦特', ic: 'spark' }
  ];
  if (DB.ext()) nav.push({ g: '扩展模块' }, { k: 'people', n: '人员档案', ic: 'people' }, { k: 'train', n: '培训考评', ic: 'check' }, { k: 'safety', n: '安全管理', ic: 'shield' }, { k: 'docs', n: '文稿中心', ic: 'pen' });
  return nav;
}
const ALLOW = { leader: ['team', 'skills', 'grow', 'perf', 'care', 'advise', 'home', 'ask', 'people', 'sched', 'train', 'know', 'ledger', 'safety', 'docs', 'star'], manager: ['goals', 'compare', 'portrait', 'staff', 'structure', 'risks', 'mcare', 'madvise', 'ledger', 'ask', 'risk', 'star', 'team', 'skills', 'people', 'sched', 'train', 'know', 'super', 'talent'] };
/* 功能实现状态清单（讲师演示台） */
const STATUS_LIST = [
  ['真实实现', ['状态层流程：派工 → 审票 → 开工 → 回传 → 完工 → 验收，每步写入本机、刷新可回看', '两票 Word / Excel / 文本离线读取与逐项审核、补齐、退回', '派工四条规则校验（证书 / 核心技能 / 工时 / 冲突）与逐人推荐、排除理由', '关键节点周闭环记录、核心技能实操量完工回写', '星级班组评价维度初步评分：台账驱动的维度（安全 / 培训 / 台账 / 绩效 / 帮扶 / 关怀 / 作业实施）随操作变化', '绩效系数由履职证据推导，确认、调整、分配表落本机', '关怀提醒、班组活动、文化活动、督办、轮岗建议、面谈提纲全部写通知或文稿', '跨班组调配：横向对比 → 影响测算 → 发起 → 班长确认 → 返岗评价']],
  ['规则模拟', ['六维个人画像（业务技能 / 安全素质 / 领导力 / 沟通 / 写作 / 经验）按图谱、违章、负责人次数、协同、文稿、工龄推导', '班组特色标签（专家型 / 骨干型 / 基础型）按技能等级占比判定', '人才断层风险按可自主实施人数与年龄判定', '培养对象排序按断层技能、成绩、学时、年龄、六维优势加权', '年度指标红黄绿按目标值与时间进度判定', '近五年业务量与人力配置趋势外推', '值班表排班、添加任务推断、文稿逐段生成']],
  ['预设展示', ['星级评价中党建 / 标准化 / 定置 / 作业组织等非台账维度的初步得分', '试验班与配电运维一班人员明细、荣誉、稳定性', '敏感岗位任职、考勤异常、离职与借调等团队风险底数', '近 30 天出勤与近四季度成长轨迹', '照片隐患识别、语音转写']],
  ['待系统对接', ['OMS 缺陷与工单同步', 'OCS 终端在线状态', '电网管理平台两票与作业计划', '人资证书 / 学时 / 考勤 / 绩效台账', '党建管理系统与荣誉台账', '通知推送到个人', 'PDF 与照片文字读取']]
];
function shell() {
  document.body.innerHTML = '<div id="app"><nav class="sb" id="sb"></nav><section id="main"></section><aside class="side" id="side"></aside></div>' +
    '<button class="stagebtn" data-act="stage">讲师演示台</button><div class="stage" id="stage"><div class="t">讲师演示台 <span class="note">案例日期 ' + TODAY + ' · 周报第 ' + WK29.no + ' 期</span></div><div class="row">语速 <button data-act="stage-speed" data-v="1" class="on">正常</button><button data-act="stage-speed" data-v=".5">快</button><button data-act="stage-speed" data-v=".2">极快</button></div><div class="row">角色 <button data-act="role-set" data-r="leader">班组长</button><button data-act="role-set" data-r="manager">管理者</button></div><div class="row"><button data-act="stage-brief">重播晨间简报</button><button data-act="stage-ext">扩展模块' + (DB.ext() ? '：开' : '：关') + '</button><button data-act="stage-status">功能实现状态清单</button><button data-act="stage-reset">清空本机记录</button></div><div class="row" id="stagenav"></div></div><div class="modal" id="modal" hidden></div>';
  $('#side').innerHTML = XW.sideHTML();
}
function renderNav() {
  const R = ROLES[role()]; const NAV = NAV_OF();
  $('#sb').innerHTML = '<div class="brand"><img src="__LOGO__" alt=""><div><b>小瓦特·班</b><span>' + h(TAGLINE) + '</span></div></div>' +
    NAV.map(n => n.g ? '<div class="grp">' + n.g + '</div>' : '<a class="' + (S.page === n.k ? 'on' : '') + '" data-act="nav" data-to="' + n.k + '"><i class="' + (n.i || '') + '">' + '<svg viewBox="0 0 24 24">' + ICO[n.ic] + '</svg></i>' + n.n + (n.badge && n.badge() ? '<em>' + n.badge() + '</em>' : '') + '</a>').join('') +
    '<div class="me" data-act="role-menu"><i>' + h(R.who[0]) + '</i><div>' + h(R.who) + '<span>' + h(R.scope) + ' · ' + h(R.n) + '</span></div><div class="rsw">' + Object.keys(ROLES).map(k => '<button data-act="role-set" data-r="' + k + '" class="' + (k === role() ? 'on' : '') + '">' + ROLES[k].n + '</button>').join('') + '</div></div>';
  const sn = $('#stagenav'); if (sn) sn.innerHTML = NAV.filter(n => n.k).map(n => '<button data-act="nav" data-to="' + n.k + '">' + n.n + '</button>').join('');
}
function cmdHTML(sugs) { return '<div class="cmd"><i class="ic"></i><input id="cmdin" placeholder="输入要办的事，回车"><div class="tools"><em id="mic1" data-act="mic1" title="按住说话">🎙</em><em data-act="up-photo" title="拍照或上传照片">📷</em><em data-act="up-file" title="拖入台账文件">📎</em></div><div class="sug">' + (sugs || []).map(s => '<b data-act="say" data-say="' + h(s) + '">' + h(s) + '</b>').join('') + '</div></div>'; }
function pageHead(title, sub, right) { return '<div class="ph1"><h2>' + h(title) + '</h2><span>' + (sub || '') + '</span><div class="r">' + (right || '') + '</div></div>'; }
function tabsHTML(list, cur) { return '<div class="tabs">' + list.map(t => '<button class="' + (t.k === cur ? 'on' : '') + '" data-act="nav" data-to="' + S.page + '" data-sub="' + t.k + '">' + h(t.n) + '</button>').join('') + '</div>'; }
function route() { const hs = (location.hash || '#' + ROLES[role()].home).slice(1).split('/'); let pg = PAGES[hs[0]] ? hs[0] : ROLES[role()].home; if (!ALLOW[role()].includes(pg)) pg = ROLES[role()].home; if (!DB.ext() && (pg === 'safety' || pg === 'docs') && role() === 'leader') pg = 'home'; S.page = pg; let sub = hs[1] || ''; try { sub = decodeURIComponent(sub); } catch (e) {} S.sub = sub; render(); }
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
  'stage-ext'(el) { LS.set('ext', !DB.ext()); el.textContent = '扩展模块' + (DB.ext() ? '：开' : '：关'); renderNav(); XW.answer(DB.ext() ? '扩展模块打开了：人员档案、培训考评、安全管理、文稿中心在左栏最下面。' : '扩展模块收起了，左栏只留班组管理与日常业务。', null, { confirm: false, speak: false }); },
  'stage-status'() { modal('<h3>功能实现状态清单</h3><div class="note" style="margin-bottom:8px">案例日期 ' + TODAY + '（周报第 ' + WK29.no + ' 期发布日）· 业务数据内置于单文件，状态保存在本机</div>' + STATUS_LIST.map(([k, list]) => '<div class="stl"><b class="tag ' + ({ 真实实现: 'ok', 规则模拟: 'v', 预设展示: 'w', 待系统对接: 'bad' }[k]) + '">' + k + '</b><ul>' + list.map(x => '<li>' + h(x) + '</li>').join('') + '</ul></div>').join('')); },
  'modal-close'() { $('#modal').hidden = true; },
  'stage-reset'() { DB.reset(); location.reload(); },
  'role-menu'() {},
  'role-set'(el) { const r = el.dataset.r; if (!ROLES[r] || r === role()) return; DB.setRole(r); S.briefed = false; XW.clearChat(); location.hash = '#' + ROLES[r].home; render(); XW.answer(r === 'manager' ? '切到管理者了：先看年度指标任务，再看三个班组的画像、人员、结构、风险和关怀；督办、轮岗、调配都落到班长确认。' : '切到班组长了：先看' + TEAM.name + '的荣誉与星级建设差距，再看班员画像、培养、绩效、关怀。', null, { confirm: false, speak: false }); }
});
document.addEventListener('click', e => { const el = e.target.closest('[data-act]'); if (!el) return; const a = el.dataset.act; if (ACT[a]) { if (!/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) e.preventDefault(); ACT[a](el, e); } });
document.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.target.id === 'cmdin' || e.target.id === 'chatin')) { const v = e.target.value.trim(); e.target.value = ''; if (v) XW.ask(v, false); } });
window.addEventListener('hashchange', route);
function boot() { shell(); route(); setInterval(() => { const c = $('#clock'); if (c) c.textContent = new Date().toTimeString().slice(0, 5); }, 1000); }
