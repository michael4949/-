/* ===== 意图路由：命令栏 / 对话框 / 快捷句 / 语音复述之后都走这里 ===== */
XW.micText = function () { if (S.page === 'home' && !LS.get('dispatch', {})['j5']) return '明天凤凰线换刀闸，按你的建议安排，班员把郭子扬换成李文博。'; if (S.page === 'docs') return '写今天的班前会材料。'; return '李文博这周工时怎么算的。'; };
XW.micYes = function () { const t = XW.micText(); if (/换成李文博/.test(t)) { ensure('home', () => { const host = $('#ppl'); if (host && !host.classList.contains('on')) { $('#d1').classList.add('wide'); DISPATCH.open(host, JOBS.find(j => j.id === 'j5')); XW.at(12200, () => DISPATCH.pick('李文博')); } else if (host) DISPATCH.pick('李文博'); }); } else XW.ask(t.replace(/。$/, ''), false); };
XW.ask = function (text, voice) {
  if (!text) return; XW.user(text, voice); const delay = voice ? 2600 : 700; const t = text;
  const who = PEOPLE.find(p => t.includes(p.n));
  const go = fn => XW.at(delay, fn);
  if (XW._expWait) { const n = XW._expWait; XW._expWait = n < 3 ? n + 1 : 0; go(() => { if (n === 1) XW.answer('记下了。第二个：杆根有锈蚀的时候，你的判断标准是什么？', null, { confirm: false }); else if (n === 2) XW.answer('明白。最后一个：台风前你会重点看哪几段线路？', null, { confirm: false }); else { XW.answer('三个问题问完了，我整理成一条经验："新人上杆：第一次先看后做，负责人复述每步安措；杆根锈蚀先做杆根检查再上人；台风前重点巡沿海段拉线。"存进班长经验？', '三个问题问完了，我整理成一条经验：<div class="draft">新人上杆：第一次先看后做，负责人复述每步安措；杆根锈蚀先做杆根检查再上人；台风前重点巡沿海段拉线。</div><div class="bt"><button data-act="exp-save" data-body="新人第一次先看后做，负责人复述每步安措；杆根锈蚀先做杆根检查再上人；台风前重点巡沿海段拉线。">存入班长经验</button><button class="g">改一下</button></div>', { confirm: false }); } }); return; }
  if (/下周谁的活最多|工作量.*均衡|均衡/.test(t)) { go(() => ensure('sched', () => ACT['wk-balance'](), 'week')); return; }
  if (/下周计划/.test(t)) { go(() => ensure('docs', () => DOCS.gen('weekplan'))); return; }
  if (/所级月报|所级汇总/.test(t)) { go(() => ensure('office', () => ACT['of-report']())); return; }
  if (/哪条线路隐患最多|线路隐患/.test(t)) { go(() => XW.answer('本月隐患最多的是凤凰线，3 处（#15 树障、#18 绝缘子、#9 拉线）；田寮线 2 处、志远站 2 处、塘尾线 1 处。凤凰线台风季专项巡视已排在下周。', null, { confirm: false, chart: CH.mini.bars([['凤凰线', 3], ['田寮线', 2], ['志远站', 2], ['塘尾线', 1]].map(([n, v], i) => ({ n, v, c: CPAL[i] })), { max: 4, unit: ' 处', h: 14 }) })); return; }
  if (/组一套卷|组卷|短板/.test(t) && who) { go(() => ACT['bank-target']({ dataset: { who: who.n } })); return; }
  if (/换刀闸|派工|凤凰线/.test(t) && !/风险|等级|工时/.test(t)) { go(() => { const d = LS.get('dispatch', {})['j5']; if (d) { XW.answer('凤凰线换刀闸今天早上已经派了：' + d.lead + '、' + d.crew.join('、') + '，刘一鸣随队。要改的话去班务日程的任务池。', null, { confirm: false }); return; } const def = DISPATCH.defaults(); XW.answer('凤凰线换刀闸我早上排过人选：负责人' + def.lead.n + '，班员' + def.crew.map(p => p.n).join('、') + '，刘一鸣随队学习。按这个办，还是换人？', '凤凰线换刀闸我早上排过人选：负责人' + h(def.lead.n) + '，班员' + h(def.crew.map(p => p.n).join('、')) + '，刘一鸣随队学习。按这个办，还是换人？<div class="bt"><button data-act="ask-go">按这个办</button><button class="g" data-act="ask-swap">换人</button></div>'); }); return; }
  if (/工时|小时怎么/.test(t)) { go(() => DISPATCH.hours(who ? who.n : '李文博')); return; }
  if (/证书|到期|复审/.test(t)) { go(() => PEOPLEPG.sixAsk('cert')); return; }
  if (/学时/.test(t)) { go(() => PEOPLEPG.sixAsk('hours')); return; }
  if (/讲稿|安全日/.test(t)) { go(() => ensure('safety', () => SAFETYPG.draft(), 'day')); return; }
  if (/风险|等级/.test(t) && /刀闸|凤凰线|明天/.test(t)) { go(() => ensure('safety', () => ACT['risk-grade']({ dataset: { id: 'r1' } }), 'risk')); return; }
  if (/照片|田寮|认一遍/.test(t)) { go(() => { if (S.page === 'home' || S.page === 'safety') PHOTO.recog('p7'); else ensure('safety', () => PHOTO.recog('p7'), 'photo'); }); return; }
  if (/催办|志远/.test(t)) { go(() => { const st = LS.get('defects', {})['d1']; if (st) XW.answer('志远站 F14 那条缺陷已经催办了，吴倩明天巡视顺路处理，回传照片后自动关闭。', null, { confirm: false }); else if (/状态|什么/.test(t)) XW.answer('志远站 F14 志甲线终端蓄电池锈蚀，8-28 登记、时限 3 天，现在超期 3 天，还没处理。要我发催办吗？', '志远站 F14 志甲线终端蓄电池锈蚀，8-28 登记、时限 3 天，现在超期 3 天，还没处理。要我发催办吗？<div class="bt"><button data-act="urge">发出催办</button><button class="g">先不用</button></div>', { confirm: false }); else ACT.urge(); }); return; }
  if (/值班表|排班/.test(t)) { go(() => ensure('sched', () => DUTY.run(), 'duty')); return; }
  if (/审票|工作票|审一下/.test(t)) { go(() => ensure('sched', () => TICKETREV.run(), 'ticket')); return; }
  if (/干了多久|塘尾线那组|进度/.test(t)) { go(() => ensure('sched', () => ACT['prog-check'](), 'prog')); return; }
  if (/班前会/.test(t)) { go(() => ensure('docs', () => DOCS.gen('premeet'))); return; }
  if (/月度总结|总结/.test(t)) { go(() => ensure('docs', () => DOCS.gen('monthly'))); return; }
  if (/周报/.test(t)) { go(() => ensure('docs', () => DOCS.gen('weekly'))); return; }
  if (/台风应对/.test(t)) { go(() => { if (DOCS.host || $('#sddoc')) DOCS.chip('typhoon'); else XW.answer('先打开一份文稿，我在安全那段加台风应对。', null, { confirm: false }); }); return; }
  if (/出.*题|出五道/.test(t)) { go(() => ensure('train', () => TRAINPG.genQ(/光差/.test(t) ? 'c5' : /整定/.test(t) ? 'c6' : 'c5'), 'course')); return; }
  if (/判.*卷/.test(t)) { go(() => ensure('train', () => TRAINPG.gradeRun(), 'grade')); return; }
  if (/实操|评分表|打.*分/.test(t)) { go(() => ensure('train', () => { TRAINPG.sheet = 's1'; TRAINPG.draw(); XW.answer('倒闸操作的评分表打开了，考评对象我先填了郭子扬，你改数字就行。', null, { confirm: false }); }, 'sheet')); return; }
  if (/谁去合适|检修任务|谁合适/.test(t)) { go(() => { const def = DISPATCH.defaults(); XW.answer('下周凤凰线 #20 杆绝缘子更换，我建议负责人' + def.lead.n + '，班员' + def.crew.map(p => p.n + '（本周 ' + p.week + ' 小时）').join('、') + '。理由：三个人都有登高证，' + def.lead.n + '有负责人资格，' + def.crew[0].n + '和' + def.crew[1].n + '这周工时最少。' + (XW.mem.get('凤凰线备选') ? '上次你把凤凰线的活给了' + XW.mem.get('凤凰线备选') + '，这次我也先想到他，看你定。' : '安排由你决定。'), null, {}); }); return; }
  if (/竞赛|人选/.test(t)) { go(() => XW.answer('技能竞赛人选我会先想到李文博（去年三等奖，"设备运维"L4）和郭子扬（29 岁，"故障分析"L3，这两年进步最快）。韩雪已经是技术能手，可以做指导。人选由你和所里定。', null, { chart: CH.mini.radar(MODS.map(m => m.n.replace('能力', '')), [{ n: '李文博', vals: PEOPLEPG.lv(P['李文博']), c: CPAL[0] }, { n: '郭子扬', vals: PEOPLEPG.lv(P['郭子扬']), c: CPAL[1] }]) + CH.mini.legend([{ n: '李文博', c: CPAL[0] }, { n: '郭子扬', c: CPAL[1] }]) })); return; }
  if (/带电作业资格|谁持有/.test(t)) { go(() => XW.answer('持带电作业资格的是黄伟强和李文博两个人，都在有效期内。登高作业证有六个人：韩雪、黄伟强、李文博、吴倩、郭子扬、赵敏。', null, { confirm: false })); return; }
  if (/两票|合格率/.test(t)) { go(() => { if (S.page === 'office') XW.answer('本月三个班两票：一班 12/12，二班 9/9，抢修班 15/15，都是全部合格。', null, { confirm: false, chart: CH.mini.group(MONTHS6, Object.keys(TEAMS2).map((n, i) => ({ n: n.replace('配电', ''), vals: TEAMS2[n].ticketsM, c: CPAL[i] })), { h: 110 }) }); else XW.answer('本月工作票 12 张，合格 12 张，合格率 100%。明天凤凰线那张第一种工作票我审过，补了验电和接地线档位。', null, { confirm: false, chart: CH.mini.line([{ n: '合格率', vals: TICKET_M.n.map((n, i) => Math.round(TICKET_M.ok[i] / n * 100)), c: CPAL[0], area: true }], TICKET_M.m, { max: 100, pct: true, h: 100 }) }); }); return; }
  if (/三个班|哪个班|所里|人力缺口/.test(t)) { go(() => { if (/培训/.test(t)) XW.answer('三个班本月培训：一班 12 人里 4 人本月学时未完成，年度平均 76%；二班 81%，1 人未完成；抢修班 69%，3 人未完成。都是事实数据，怎么看由所里定。', null, { confirm: false, chart: CH.mini.group(MONTHS6, Object.keys(TEAMS2).map((n, i) => ({ n: n.replace('配电', ''), vals: TEAMS2[n].hoursM, c: CPAL[i] })), { max: 100, unit: '%', h: 110 }) }); else if (/证书/.test(t)) XW.answer('90 天内证书到期：一班 3 人、抢修班 2 人、二班 1 人。一班的三个我已经提醒过本人，复审这周开始报名。', null, { confirm: false, chart: CH.mini.cols([['一班', 3], ['二班', 1], ['抢修班', 2]].map(([n, v], i) => ({ n, v, c: CPAL[i] })), { max: 4, h: 100, labels: true }) }); else XW.answer('下个月人力最紧的是一班：39 周缺 5 人，凤凰线台风季专项巡视加三张证书复审占人。建议所里从二班借两名高级作业员两周。由所长定。', null, { chart: CH.mini.heat(Object.keys(TEAMS2).map(n => n.replace('配电', '')), WEEKS8.map(w => w.replace('第', '').replace('周', '')), Object.keys(TEAMS2).map(n => TEAMS2[n].cap), { max: 5, act: 'of-cap', fmt: v => v ? '缺 ' + v + ' 人' : '够' }) }); }); return; }
  if (/考我|安规题/.test(t)) { go(() => ensure('safety', () => XW.answer('题在上面，选一个。', null, { confirm: false }), 'quiz')); return; }
  if (/经验/.test(t) && /记/.test(t)) { go(() => ACT['exp-start']()); return; }
  if (/存为案例|案例/.test(t)) { go(() => ensure('know', () => ACT['case-new']())); return; }
  if (who && /怎么样|最近|情况/.test(t)) { go(() => ensure('people', () => PEOPLEPG.show(who.n))); return; }
  if (/整定|定值|重合闸|差动|光差|遥控|安措|接地线|验电|电缆|外勤上限|零序/.test(t)) { go(() => { if (S.page === 'know') KNOWPG.ask(t); else ensure('know', () => KNOWPG.ask(t)); }); return; }
  if (/上次口径|按上次/.test(t)) { go(() => ensure('docs', () => DOCS.gen('weekly'))); return; }
  go(() => XW.answer('这件事我还不会办。今天能办的：派工、查工时、查证书和学时、写讲稿和材料、核对照片、催办缺陷、排值班表、审票、出题判卷、打实操分、答规程。', null, { confirm: false }));
};
Object.assign(ACT, {
  'ask-go'() { ensure('home', () => ACT['dispatch-go']({ dataset: {} })); },
  'ask-swap'() { ensure('home', () => ACT['home-swap']()); }
});
