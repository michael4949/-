/* ===== 意图路由：命令栏 / 对话框 / 快捷句 / 语音复述之后都走这里（班组长与管理者共用，按角色分流） ===== */
XW.micText = function () { if (role() === 'manager') return '试验班张伟借到自动化班三天，支援田寮站交接试验。'; if (S.page === 'home' && !LS.get('dispatch', {})[MAINLINE]) return '下周一田寮站验收按你的建议安排，班员把吴倩换成李文博。'; if (S.page === 'docs') return '写今天的班前会材料。'; return '李文博这周工时怎么算的。'; };
XW.micYes = function () { const t = XW.micText(); if (/换成李文博/.test(t)) { ensure('home', () => { const host = $('#ppl'); if (host && !host.classList.contains('on')) { ACT['home-swap'](); XW.at(12200, () => DISPATCH.pick('李文博')); } else if (host) DISPATCH.pick('李文博'); }); } else XW.ask(t.replace(/。$/, ''), false); };
XW.wkAnswer = function (t) { const k = /在线率/.test(t) ? 'online' : /遥控/.test(t) ? 'remote' : /自愈/.test(t) ? 'heal' : /闭环|消缺/.test(t) ? 'close' : /光纤/.test(t) ? 'fibersync' : /晨操/.test(t) ? 'morning' : /交换机/.test(t) ? 'switchpwr' : /快速复电/.test(t) ? 'fastmv' : /投运/.test(t) ? 'newrun' : null;
  if (k) { ACT.wk29({ dataset: { k } }); return; }
  const worst = WK29.items.filter(i => WK29.rank(i.k)).map(i => ({ i, r: WK29.rank(i.k) })).sort((a, b) => b.r - a.r).slice(0, 4);
  XW.answer('周报第 ' + WK29.no + ' 期（' + WK29.period + '）光明局排名靠后的是：' + worst.map(x => x.i.n + ' 第 ' + x.r).join('、') + '。星级评价用到的在线率第 ' + WK29.rank('online') + '、遥控成功率第 ' + WK29.rank('remote') + '、缺陷闭环率第 ' + WK29.rank('close') + '。每一项都对着一个关键节点，在用工安排的周关键节点里能看。', null, { confirm: false, chart: CH.mini.bars(worst.map(x => ({ n: x.i.n.slice(0, 9), v: x.r, c: x.r >= 9 ? '#e5484d' : CPAL[0], act: 'wk29', k: x.i.k, tip: x.i.n + ' 第 ' + x.r })), { max: 11, h: 12, x0: 96 }), done() { XW.card('<div class="bt" style="margin-top:0"><button class="g" data-act="nav" data-to="ledger" data-sub="weekly">看周报指标台账</button>' + (role() === 'leader' ? '<button class="g" data-act="nav" data-to="sched" data-sub="nodes">看周关键节点</button>' : '') + '</div>'); } }); };
XW.ask = function (text, voice) {
  if (!text) return; XW.user(text, voice); const delay = voice ? 2600 : 700; const t = text;
  const who = PEOPLE.find(p => t.includes(p.n)); const labWho = LAB.people.find(p => t.includes(p.n));
  const go = fn => XW.at(delay, fn);
  if (XW._expWait) { const n = XW._expWait; XW._expWait = n < 3 ? n + 1 : 0; go(() => { if (n === 1) XW.answer('记下了。第二个：交接试验和成套设备验收，新人第一次跟，你让他做什么、不让他做什么？', null, { confirm: false }); else if (n === 2) XW.answer('明白。最后一个：雷雨季前你会重点看哪几类终端？', null, { confirm: false }); else { const body = '遥控失败先看把手位置、刀闸位置，再查通信，三步走完再报缺陷；新人第一次验收先看后做，负责人复述出厂资料审查、外观检查、安装前试验三步；雷雨季前重点看 2000 户以上线路的交换机取电点和永磁驱动终端。'; XW.answer('三个问题问完了，我整理成一条经验："' + body + '"存进班长经验？', '三个问题问完了，我整理成一条经验：<div class="draft">' + h(body) + '</div><div class="bt"><button data-act="exp-save" data-t="遥控失败、新人验收与雷雨季前巡视" data-body="' + h(body) + '">存进班长经验</button><button class="g" data-act="no" data-t="再改改">再改改</button></div>', { confirm: false }); } }); return; }
  /* ---- 管理者视角 ---- */
  if (role() === 'manager') {
    if (/借|调配|借调|支援/.test(t)) { go(() => ensure('risk', () => SUPER.simPreset(labWho ? labWho.n : '张伟', /\d+ ?天/.test(t) ? +(t.match(/(\d+) ?天/) || [0, 3])[1] : 3), 'sim')); return; }
    if (/缺电缆证|电缆证.*怎么办|电缆作业证/.test(t)) { go(() => ensure('talent', () => ACT['tal-cert']({ dataset: {} }), 'cert')); return; }
    if (/履职|班长/.test(t) && !/画像/.test(t)) { go(() => ensure('duty', () => XW.answer('三个班长的履职看这几项客观数：派工及时、两票审核、关键节点周清、缺陷超期、工时均衡、培养在办。不排名，每项点开有台账。', null, { confirm: false }))); return; }
    if (/输出|梯队|断层|五年后/.test(t)) { go(() => ensure('talent', () => XW.answer('人才梯队页：近三年输出 ' + OUTPUT3.length + ' 人；五年后骨干断层最重的是试验班，班长和两名高级作业员五年后都在 41 岁以上，电缆证持证人平均 ' + SUPER.labCertAvg() + ' 岁。', null, { confirm: false }))); return; }
    if (/星级|对标|差距/.test(t)) { go(() => ensure('star', () => ACT['star-gap']())); return; }
    if (/效能|复盘/.test(t)) { go(() => ensure(/复盘/.test(t) ? 'report' : 'effect', () => { if (/复盘/.test(t)) ACT['rep-gen']({ dataset: { k: 'review' } }); })); return; }
    if (/周汇报|汇报/.test(t)) { go(() => ensure('report', () => ACT['rep-gen']({ dataset: { k: 'brief' } }))); return; }
    if (/权限|配置|推广/.test(t)) { go(() => ensure('config')); return; }
    if (/全流程|流程|待确认/.test(t)) { go(() => ensure('flow')); return; }
    if (/两票|合格率/.test(t)) { go(() => XW.answer('本月三个班两票：' + TEAMS.map(x => x.n + ' ' + x.ticketsOK).join('、') + '，都是全合格。', null, { confirm: false, chart: CH.mini.group(MONTHS6, Object.keys(TEAMS2).map((n, i) => ({ n: n.replace('配电', ''), vals: TEAMS2[n].ticketsM, c: CPAL[i] })), { h: 110 }) })); return; }
    if (/工时|均衡/.test(t)) { go(() => XW.answer('工时最不均衡的是试验班：张伟本周 28 小时、刘畅借在配电运维一班，班长周建国自己 10 小时；配电自动化班黄伟强 26 小时超约定。', null, { confirm: false, chart: CH.mini.bars([{ n: '张伟', v: 28, c: '#e5484d', tip: '试验班' }, { n: '黄伟强', v: 26, c: '#e5484d', tip: '配电自动化班' }, { n: '李文博', v: 24, c: CPAL[0] }, { n: '刘畅', v: 22, c: CPAL[0], tip: '试验班 · 借在配电运维一班' }], { limit: WEEK_LIMIT, unit: 'h', max: 32, h: 13 }) })); return; }
    if (/证书|到期/.test(t)) { go(() => XW.answer('90 天内证书到期：配电自动化班 3 人、配电运维一班 2 人、试验班 1 人。配电自动化班的三个已经提醒本人，复审这周报名。', null, { confirm: false, chart: CH.mini.cols(TEAMS.map((x, i) => ({ n: x.n.replace('配电', ''), v: x.certsDue, c: CPAL[i] })), { max: 4, h: 100, labels: true }) })); return; }
    if (/人力缺口|缺口/.test(t)) { go(() => ensure('risk', () => XW.answer('未来八周人力最紧的是配电自动化班第 35 周（田寮站验收加永磁终端排查，缺 5 人）和试验班第 36 周（交接试验高峰，缺 5 人）。缺口从跨班组调配补，我在风险与统筹里给了人选。', null, { confirm: false }))); return; }
    if (/风险|态势|哪个班/.test(t)) { go(() => ensure('super', () => XW.answer('这周三个班组的风险：配电自动化班 华发民公用柜缺陷超期、黄伟强工时超约定；试验班 张伟 28 小时、刘畅借出后电缆证只剩 2 人；配电运维一班 证书到期 2 人。分层不排名，点热力格看明细。', null, { confirm: false }))); return; }
    if (/在线率|周报|遥控|自愈|全市/.test(t)) { go(() => XW.wkAnswer(t)); return; }
    if (/关键节点|清了多少/.test(t)) { go(() => XW.answer('配电自动化班本周关键节点已清 ' + DB.nodeRate().pct + '%，未清的：' + (NODES.filter(n => /周|限时|日日清/.test(n.cyc) && !DB.nodesDone().includes(n.id)).map(n => n.t).join('、') || '无') + '。', null, { confirm: false })); return; }
    if (who && /怎么样|最近|情况/.test(t)) { go(() => ensure('people', () => PEOPLEPG.show(who.n))); return; }
    go(() => XW.answer('这件事我还不会办。管理者这里能办的：看三个班组态势和风险、发起跨班组调配、看班长履职和人才梯队、算星级对标差距、写周汇报和复盘。', null, { confirm: false })); return;
  }
  /* ---- 班组长视角 ---- */
  if (/添加任务|加一个任务|新建任务|加个任务|新增任务/.test(t)) { const name = (t.split(/[:：]/)[1] || '').trim(); go(() => ensure('sched', () => { TASKFORM.open(); if (name && $('#jf-t')) { $('#jf-t').value = name; $('#jf-t').classList.add('fill'); XW.at(500, () => TASKFORM.assist()); } }, 'pool')); return; }
  if (/上传.*票|传.*操作票|传.*工作票/.test(t)) { go(() => ensure('sched', () => XW.answer('把票拖到左下角的上传框，Word、Excel、文本都行，我读完逐条对规程。', null, { confirm: false }), 'ticket')); return; }
  if (/开工/.test(t)) { go(() => { const j = DB.jobs().find(x => /已派|票已审|待开工/.test(x.st) && (!who || DB.crewOf(x).includes(who.n))); if (j) ACT['job-start']({ dataset: { id: j.id } }); else XW.answer('没有等着开工的任务。', null, { confirm: false }); }); return; }
  if (/完工|干完了/.test(t)) { go(() => { const j = DB.jobs().find(x => x.st === '进行中' && (!who || DB.crewOf(x).includes(who.n))); if (j) ACT['job-finish']({ dataset: { id: j.id } }); else XW.answer('现在没有在现场的任务。', null, { confirm: false }); }); return; }
  if (/下周谁的活最多|工作量.*均衡|均衡/.test(t)) { go(() => ensure('sched', () => ACT['wk-balance'](), 'week')); return; }
  if (/下周计划/.test(t)) { go(() => ensure('docs', () => DOCS.gen('weekplan'))); return; }
  if (/关键节点|周周清|日日清|清了多少/.test(t)) { go(() => ensure('sched', () => { const undone = NODES.filter(n => /周|限时|日日清/.test(n.cyc) && !DB.nodesDone().includes(n.id)); XW.answer('本周关键节点已清 ' + DB.nodeRate().pct + '%。' + (undone.length ? '还没清的 ' + undone.length + ' 项：' + undone.map(n => n.t + '（' + n.a + '）').join('、') + '。周报里排名靠后的那几项对应的节点，我在表里加了标记。' : '周周清和日日清的都清完了。'), null, { confirm: false }); }, 'nodes')); return; }
  if (/周报|在线率|遥控成功率|自愈|全市第|排名/.test(t) && !/写|生成/.test(t)) { go(() => XW.wkAnswer(t)); return; }
  if (/组一套卷|组卷|短板/.test(t) && who) { go(() => ACT['bank-target']({ dataset: { who: who.n } })); return; }
  if (/谁去合适|谁合适|谁去/.test(t)) { go(() => { const job = DB.job(MAINLINE); const def = DISPATCH.defaults(job); const e = def.explain; XW.answer(job.t.split(' · ')[0] + '要' + job.need.join('和') + '，有电缆证的是' + certHold('电力电缆作业证').map(p => p.n).join('、') + '。我建议负责人' + (def.lead ? def.lead.n + '（' + (e.lead.why || []).slice(0, 2).join('，') + '）' : '待定') + '，班员' + def.crew.map(p => p.n + '（本周 ' + p.week + ' 小时）').join('、') + (def.learn ? '，' + def.learn.n + '随队学习' : '') + '。排除的人和理由在工作台的派工卡里逐条写着，安排由你定。', null, { done() { XW.card('<div class="bt" style="margin-top:0"><button data-act="ask-go">按这个办</button><button class="g" data-act="ask-swap">换人</button></div>'); } }); }); return; }
  if (/派工|田寮站|验收/.test(t) && !/风险|等级|工时|案例/.test(t)) { go(() => { const d = LS.get('dispatch', {})[MAINLINE]; if (d) { XW.answer('田寮站 F02 验收已经派了：' + d.lead + '、' + d.crew.join('、') + (d.learn ? '，' + d.learn + '随队' : '') + '。要改的话去用工安排的任务池。', null, { confirm: false }); return; } const def = DISPATCH.defaults(DB.job(MAINLINE)); XW.answer('田寮站 F02 验收我排过人选：负责人' + (def.lead ? def.lead.n : '待定') + '，班员' + def.crew.map(p => p.n).join('、') + (def.learn ? '，' + def.learn.n + '随队学习' : '') + '。按这个办，还是换人？', '田寮站 F02 验收我排过人选：负责人' + h(def.lead ? def.lead.n : '待定') + '，班员' + h(def.crew.map(p => p.n).join('、')) + (def.learn ? '，' + h(def.learn.n) + '随队学习' : '') + '。按这个办，还是换人？<div class="bt"><button data-act="ask-go">按这个办</button><button class="g" data-act="ask-swap">换人</button></div>'); }); return; }
  if (/工时|小时怎么/.test(t)) { go(() => DISPATCH.hours(who ? who.n : '李文博')); return; }
  if (/证书|到期|复审/.test(t) && !/持有|谁有/.test(t)) { go(() => PEOPLEPG.sixAsk('cert')); return; }
  if (/学时/.test(t)) { go(() => PEOPLEPG.sixAsk('hours')); return; }
  if (/讲稿|安全日/.test(t)) { go(() => { if (DB.ext()) ensure('safety', () => SAFETYPG.draft(), 'day'); else { XW.state('write'); const d = XW.msg('a', '安全日讲稿我按周报案例 2 写：<div class="draft"><span></span></div>'); XW.type(d.querySelector('.draft span'), SAFETYPG.DOC.join('\n'), 24, () => { XW.state(''); d.insertAdjacentHTML('beforeend', '<div class="bt"><button data-act="doc-save-safety">存到文稿中心</button><button class="g" data-act="no" data-t="改一下">改一下</button></div>'); }); } }); return; }
  if (/风险|等级/.test(t) && /田寮|验收|下周一/.test(t)) { go(() => { const r = SAFETYPG.RISKS[0]; XW.answer(r.t + '：' + r.fac.join('、') + '。交接试验带电缆、高温橙色预警、施工单位在场，4 个人里 1 个学员，这是高风险。管控措施：上午作业、下午 3 点后复工；试验区设围栏，学员只看不做；负责人韩雪现场复核安措。', null, { confirm: false }); }); return; }
  if (/催办|华发民|超期/.test(t)) { go(() => { const d = DB.defect('d5'); if (/已催办/.test(d.st)) XW.answer('华发民公用柜那条已经催办了，韩雪已读，她回传处理照片后自动关闭。', null, { confirm: false }); else if (/已登记|已排任务|待验收|已关闭/.test(d.st)) XW.answer('华发民公用柜电容故障现在「' + d.st + '」。', null, { confirm: false }); else if (/状态|什么/.test(t)) XW.answer('华发民公用柜电容故障，8-2 登记、重大缺陷时限 3 天，现在超期 2 天，还没消缺。要我发催办吗？', '华发民公用柜电容故障，8-2 登记、重大缺陷时限 3 天，现在超期 2 天，还没消缺。要我发催办吗？<div class="bt"><button data-act="urge">发出催办</button><button class="g" data-act="no" data-t="先不用">先不用</button></div>', { confirm: false }); else ensure('home', () => ACT.urge()); }); return; }
  if (/值班表|排班/.test(t)) { go(() => ensure('sched', () => DUTY.run(), 'duty')); return; }
  if (/审票|工作票|审一下/.test(t)) { go(() => ensure('sched', () => ACT['ticket-review'](), 'ticket')); return; }
  if (/干了多久|那组|进度/.test(t)) { go(() => ensure('sched', () => ACT['prog-check'](), 'prog')); return; }
  if (/班前会/.test(t)) { go(() => ensure('docs', () => DOCS.gen('premeet'))); return; }
  if (/月度总结|总结/.test(t)) { go(() => ensure('docs', () => DOCS.gen('monthly'))); return; }
  if (/汇报材料|汇报/.test(t)) { go(() => ensure('docs', () => DOCS.gen('report'))); return; }
  if (/雷雨应对|台风应对/.test(t)) { go(() => { if (DOCS.host || $('#sddoc')) DOCS.chip('typhoon'); else XW.answer('先打开一份文稿，我在安全那段加雷雨应对。', null, { confirm: false }); }); return; }
  if (/出.*题|出五道/.test(t)) { go(() => ensure('train', () => TRAINPG.genQ(/光差/.test(t) ? 'c5' : /整定/.test(t) ? 'c6' : 'c5'), 'course')); return; }
  if (/判.*卷/.test(t)) { go(() => ensure('train', () => TRAINPG.gradeRun(), 'grade')); return; }
  if (/实操|评分表|打.*分/.test(t) && !/实操量/.test(t)) { go(() => ensure('train', () => { TRAINPG.sheet = 's1'; TRAINPG.draw(); XW.answer('倒闸操作的评分表打开了，考评对象我先填了郭子扬，你改数字就行。', null, { confirm: false }); }, 'sheet')); return; }
  if (/竞赛|人选/.test(t)) { go(() => XW.answer('技能竞赛人选我会先想到李文博（去年三等奖，"设备运维"L4）和郭子扬（29 岁，"故障分析"L3，这两年进步最快）。韩雪已经是技术能手，可以做指导。人选由你和部门定。', null, { chart: CH.mini.radar(MODS.map(m => m.n.replace('能力', '')), [{ n: '李文博', vals: PEOPLEPG.lv(P['李文博']), c: CPAL[0] }, { n: '郭子扬', vals: PEOPLEPG.lv(P['郭子扬']), c: CPAL[1] }]) + CH.mini.legend([{ n: '李文博', c: CPAL[0] }, { n: '郭子扬', c: CPAL[1] }]) })); return; }
  if (/谁持有|谁有|持证/.test(t)) { go(() => { const k = CERT_KINDS.find(c => t.includes(c.slice(0, 4))) || '电力电缆作业证'; const hs = certHold(k); XW.answer('持' + k + '的有 ' + hs.length + ' 人：' + hs.map(p => p.n).join('、') + '。' + (k === '电力电缆作业证' ? '田寮站交接试验要这个证，所以只能在这三个人里派。' : ''), null, { confirm: false, done() { XW.card('<div class="bt" style="margin-top:0"><button class="g" data-act="cert-gap" data-k="' + h(k) + '">看这类证的台账</button></div>'); } }); }); return; }
  if (/两票|合格率/.test(t)) { go(() => { const m = DB.month(); const tm = DB.ticketM(); const pend = DB.tickets().filter(t => t.st === '待审'); XW.answer('本月工作票 ' + m.tickets + ' 张，合格 ' + m.ticketsOK + ' 张，合格率 ' + Math.round(m.ticketsOK / m.tickets * 100) + '%。' + (pend.length ? '还有 ' + pend.length + ' 张待审：' + pend.map(t => t.task).join('、') + '。' : '待审的都审完了。'), null, { confirm: false, chart: CH.mini.line([{ n: '合格率', vals: tm.n.map((n, i) => Math.round(tm.ok[i] / n * 100)), c: CPAL[0], area: true }], tm.m, { max: 100, min: 80, h: 100, pct: true }) }); }); return; }
  if (/三个班|哪个班|部门|人力缺口|态势/.test(t)) { go(() => XW.answer('我这里只有本班的数据；三个班组的汇总在管理者的部门态势里。本班要报给部门的数，写汇报材料时我带上。', null, { confirm: false })); return; }
  if (/考我|安规题/.test(t)) { go(() => { const { q } = SAFETYPG.quizQ(); XW.answer('考你一道：' + q.q + ' ' + q.a.map((a, i) => String.fromCharCode(65 + i) + '. ' + a).join(' '), '考你一道：' + h(q.q) + '<div class="bt">' + q.a.map((a, i) => '<button class="g" data-act="ask-quiz" data-i="' + i + '">' + String.fromCharCode(65 + i) + '. ' + h(a) + '</button>').join('') + '</div>', { confirm: false }); }); return; }
  if (/经验/.test(t) && /记/.test(t)) { go(() => ACT['exp-start']()); return; }
  if (/存为案例|案例/.test(t)) { go(() => ensure('know', () => ACT['case-new']())); return; }
  if (who && /怎么样|最近|情况/.test(t)) { go(() => ensure('people', () => PEOPLEPG.show(who.n))); return; }
  if (/整定|定值|重合闸|差动|光差|遥控|安措|接地线|验电|交换机|限时闭环|外勤上限|零序|自主实施|实操量|工作票怎么分|高温/.test(t)) { go(() => { if (S.page === 'know') KNOWPG.ask(t); else ensure('know', () => KNOWPG.ask(t)); }); return; }
  if (/上次口径|按上次/.test(t)) { go(() => ensure('docs', () => DOCS.gen('weekly'))); return; }
  go(() => XW.answer('这件事我还不会办。今天能办的：添加任务、派工、审票和上传两票、开工完工、查工时、查证书和学时、查周报指标和关键节点、写材料、催办缺陷、排值班表、出题判卷、打实操分、答规程。', null, { confirm: false }));
};
Object.assign(ACT, {
  'ask-go'() { ensure('home', () => ACT['dispatch-go']({ dataset: {} })); },
  'ask-swap'() { ensure('home', () => ACT['home-swap']()); },
  'ask-quiz'(el) { const { q } = SAFETYPG.quizQ(); const i = +el.dataset.i; const ok = i === q.k; const done = LS.get('quiz', []); done.push({ ok, ts: Date.now() }); LS.set('quiz', done); XW.answer((ok ? '对。' : '不对，应为 ' + String.fromCharCode(65 + q.k) + '. ' + q.a[q.k] + '。') + '依据：' + (q.pg || q.src || '安规题库') + '。', null, { confirm: false }); },
  'doc-save-safety'() { const docs = LS.get('docs', {}); docs['safetyday'] = { t: '安全日讲稿 · 二次室作业验电与交换机取电复核', ts: Date.now(), body: SAFETYPG.DOC.join('\n'), adopted: true }; LS.set('docs', docs); XW.answer('存到文稿中心了，安全活动台账里本月安全日记为 2 次（含这次）。', null, { confirm: false }); }
});
