/* ===== 台账中心 · 所级视图 · 问小瓦特 ===== */
const LEDGERPG = {
  tabs: [{ k: 'hours', n: '工时' }, { k: 'cert', n: '资质证书' }, { k: 'study', n: '学时' }, { k: 'defect', n: '缺陷' }, { k: 'ticket', n: '两票' }, { k: 'safety', n: '安全活动' }, { k: 'honor', n: '荣誉' }],
  table() { const s = S.sub || 'hours'; const T = (cols, rows) => '<div class="tbl"><table class="t"><tr>' + cols.map(c => '<th>' + h(c) + '</th>').join('') + '</tr>' + rows.map(r => '<tr>' + r.map(c => '<td>' + c + '</td>').join('') + '</tr>').join('') + '</table></div>';
    if (s === 'cert') return T(['姓名', '证书', '取得', '复审期限', '剩余'], CERTS.map(c => [h(c.who), h(c.name), c.got, c.due, c.renewed ? '<span class="tag ok">已复审 ' + c.renewed + '</span>' : daysTo(c.due) <= 90 ? '<span class="tag bad">' + daysTo(c.due) + ' 天</span>' : daysTo(c.due) + ' 天']));
    if (s === 'study') return T(['姓名', '本月', '年度已完成', '年度要求', '进度'], PEOPLE.map(p => [h(p.n), (p.hours.m < 3 ? '<span class="tag bad">' : '<span class="tag ok">') + p.hours.m + '/5</span>', p.hours.done, p.hours.req, Math.round(p.hours.done / p.hours.req * 100) + '%']));
    if (s === 'defect') return T(['缺陷', '等级', '登记', '时限', '状态', '来源'], DEFECTS.map(d => [h(d.t), h(d.lv), d.reg, d.limit + ' 天', h((LS.get('defects', {})[d.id] || {}).st || (d.photo && LS.get('hazards', {})[d.photo]) || d.st), '<span class="note">' + h(d.src) + '</span>']));
    if (s === 'ticket') return T(['票号', '类型', '任务', '负责人', '状态'], [[h(TICKET.no), h(TICKET.kind), h(TICKET.task), h(TICKET.lead), LS.get('ticket') ? '<span class="tag ok">已审核</span>' : '<span class="tag w">待审</span>'], ['配一 2026-0901-02', '第一种工作票', '凤凰线 #9 杆拉线更换', '黄伟强', '<span class="tag ok">已完成 · 合格</span>'], ['配一 2026-0902-01', '第二种工作票', '志远站 F14 消缺', '黄伟强', '<span class="tag ok">已完成 · 合格</span>'], ['配一 2026-0902-03', '第二种工作票', '光明变出线柜检查', '韩雪', '<span class="tag ok">已完成 · 合格</span>']]);
    if (s === 'safety') return T(['日期', '活动', '参加人数'], SAFETY_ACT.map(a => [a.d, h(a.t), a.who]));
    if (s === 'honor') return T(['获得者', '荣誉', '时间'], HONORS.map(a => [h(a.who), h(a.t), a.d]));
    return T(['日期', '人员', '作业', '小时'], HOURS.map(r => [r.d, '<u class="num" data-act="hours" data-who="' + r.who + '">' + h(r.who) + '</u>', h(r.job), r.h])); }
};
PAGES.ledger = {
  render() { return cmdHTML(['李文博这周工时怎么算的', '三个月内证书到期的有谁', '本月学时未完成的名单', '志远站 F14 缺陷现在什么状态']) + pageHead('台账中心', '七张台账 · 点人名她照亮那几行 · 问她任何一个数') + tabsHTML(LEDGERPG.tabs, S.sub || 'hours') + '<div class="card" id="ledbody">' + LEDGERPG.table() + '</div>'; },
  after() {}
};
PAGES.office = {
  render() { return cmdHTML(['三个班本月培训完成情况', '哪个班证书到期的最多', '所里下个月人力缺口在哪']) + pageHead('所级视图', '三个班组的同一套数据汇总 · 不排名 · 点进任一班组') +
    '<div class="teams">' + TEAMS.map(t => '<div class="tc" data-act="team" data-n="' + h(t.n) + '"><h5>' + h(t.n) + ' <span class="note">班长 ' + h(t.leader) + ' · ' + t.size + ' 人</span></h5><div><span>年度学时完成</span><b>' + t.hours + '%</b></div><div><span>证书 90 天内到期</span><b>' + t.certsDue + '</b></div><div><span>两票合格</span><b>' + t.ticketsOK + '</b></div><div><span>本月安全日</span><b>' + t.safety + '</b></div><div><span>本月任务完成</span><b>' + t.jobs + '</b></div></div>').join('') + '</div>' +
    '<div class="card"><div class="h"><b>所长问答</b><span>事实回答，不做评价</span></div><div class="kbq">' + ['三个班本月培训完成情况', '哪个班证书到期的最多', '所里下个月人力缺口在哪', '本月三个班两票合格率'].map(q => '<b data-act="say" data-say="' + h(q) + '">' + h(q) + '</b>').join('') + '</div></div>'; },
  after() {}
};
PAGES.ask = {
  render() { const G = [{ t: '查数', qs: ['三个月内证书到期的有谁', '本月学时未完成的名单', '李文博这周工时怎么算的', '志远站 F14 缺陷现在什么状态', '本月两票合格率', '谁持有带电作业资格'] }, { t: '安排与决策参考', qs: ['安排明天凤凰线换刀闸', '下周检修任务谁去合适', '排下周值班表', '明天凤凰线换刀闸是什么风险等级', '谁适合参加下季度的技能竞赛'] }, { t: '生成', qs: ['写今天的班前会材料', '生成本月的月度总结', '写本周安全日讲稿', '从光差保护课件出五道题'] }, { t: '人', qs: ['刘一鸣最近怎么样', '黄伟强最近怎么样', '给郭子扬打倒闸操作实操分'] }, { t: '知识', qs: ['站内馈线保护定值是多少', '停电作业安措顺序', '遥控失败先查什么', '考我一道安规题'] }];
    return cmdHTML([]) + pageHead('问小瓦特', '能查、能提醒、能生成、能办；涉及人的结论由班组长确认') + '<div class="grid2">' + G.map(g => '<div class="card"><div class="h"><b>' + h(g.t) + '</b></div><div class="kbq">' + g.qs.map(q => '<b data-act="say" data-say="' + h(q) + '">' + h(q) + '</b>').join('') + '</div></div>').join('') + '</div>'; },
  after() { XW.at(300, () => { if (!$$('#chat .msg').length) XW.answer('想办什么点一条，或者直接打字。语音在输入框右边，说完我先复述一遍再办。', null, { confirm: false }); }); }
};
Object.assign(ACT, {
  team(el) { const t = TEAMS.find(x => x.n === el.dataset.n); if (t.n === TEAMS[0].n) { nav('people'); return; } XW.answer(t.n + '的画像口径和一班一样，' + t.size + ' 人，年度学时 ' + t.hours + '%，证书 90 天内到期 ' + t.certsDue + ' 人，两票 ' + t.ticketsOK + '。班长' + t.leader + '那边的明细要他授权才能看。', null, { confirm: false }); }
});
