/* ===== 今日工作台：她先开口，卡片随话浮出；每个按钮都是一段过程 ===== */
const HOMEPG = {
  st() { return { disp: LS.get('dispatch', {})['j5'], urged: LS.get('defects', {})['d1'], d1: (DB.defect('d1') || {}).st || '', hz: LS.get('hazards', {})['p7'], sd: LS.get('docs', {})['safetyday'] }; },
  pending() { const s = this.st(); return (s.disp ? 0 : 1) + (s.urged || /已派|进行中|待验收|已关闭|催办/.test(s.d1) ? 0 : 1) + (s.sd && s.sd.adopted ? 0 : 1); },
  chartsHTML() {
    const card = (t, sub, body) => '<div class="card chart"><div class="h"><b>' + h(t) + '</b><span>' + h(sub) + '</span></div>' + body + '</div>';
    const legend = items => '<div class="legend">' + items.map(([c, n]) => '<span><i style="background:' + c + '"></i>' + h(n) + '</span>').join('') + '</div>';
    const TL = DB.taskLedger(); const types = DB.typeCounts().map(([k, v]) => ({ k, v, done: TL.filter(t => t.t === k && /已完成|已关闭/.test(t.st)).length }));
    const bars = PEOPLE.filter(p => p.post !== '班长').map(p => ({ n: p.n, v: p.week })).sort((a, b) => b.v - a.v);
    const avg = MODS.map((m, i) => PEOPLE.reduce((s, p) => s + PEOPLEPG.lv(p)[i], 0) / PEOPLE.length);
    const hoursPct = PEOPLE.reduce((s, p) => s + p.hours.done / p.hours.req, 0) / PEOPLE.length;
    const meters = [{ k: 'tickets', n: '两票合格率', v: MONTH.ticketsOK / MONTH.tickets, txt: MONTH.ticketsOK + '/' + MONTH.tickets, tip: '本月工作票 ' + MONTH.tickets + ' 张，合格 ' + MONTH.ticketsOK + ' 张 · 点开看两票台账' }, { k: 'hours', n: '年度学时完成', v: hoursPct, txt: Math.round(hoursPct * 100) + '%', tip: '12 人年度学时平均完成 ' + Math.round(hoursPct * 100) + '% · 点开看学时台账' }, { k: 'defects', n: '缺陷闭环', v: MONTH.defectsClosed / MONTH.defectsFound, txt: MONTH.defectsClosed + '/' + MONTH.defectsFound, tip: '本月发现 ' + MONTH.defectsFound + ' 处、闭环 ' + MONTH.defectsClosed + ' 处 · 点开看缺陷台账' }, { k: 'safety', n: '安全日活动', v: MONTH.safetyDays / MONTH.safetyDaysPlan, txt: MONTH.safetyDays + '/' + MONTH.safetyDaysPlan, tip: '本月计划 ' + MONTH.safetyDaysPlan + ' 次，已开展 ' + MONTH.safetyDays + ' 次 · 点开看安全活动台账' }];
    return '<div class="grid3 charts">' +
      card('本月任务 · 按类型', '点一段看明细', CH.donut(types, String(MONTH.jobsDone), '完成 / ' + MONTH.jobs)) +
      card('本周工时', '约定 ' + WEEK_LIMIT + 'h · 点一条照亮台账', CH.bars(bars, WEEK_LIMIT)) +
      card('近 30 天缺陷', '点一天看当天', CH.area(DEF30.days, DEF30.found, DEF30.closed) + legend([[CPAL[0], '发现累计'], [CPAL[2], '闭环累计']])) +
      card('班组能力 · 8 模块', '点一角看短板', CH.radar(MODS.map(m => m.n), avg, 3) + legend([[CPAL[0], '班组均值'], ['#7b849c', '目标 L3'], ['#e8791d', '低于目标']])) +
      card('证书复审 · 未来一年', '点一个看证书台账', CH.certline(CERTS)) +
      card('本月指标', '点一条看台账', CH.meters(meters)) + '</div>';
  },
  jobsHTML() { return '<div class="jobs">' + DB.todayJobs().map(j => { const who = DB.crewOf(j); const cls = /已派|票已审|已完成|已关闭/.test(j.st) ? 'ok' : /进行中/.test(j.st) ? 'c' : ''; return '<div data-act="job-open" data-id="' + j.id + '" style="cursor:pointer"><span style="color:var(--ink);font-size:11.5px">' + h(j.t) + (j.added ? ' <i class="tag v">新</i>' : '') + (who.length ? ' · ' + h(who.join(' ')) : '') + '</span>' + (cls ? '<span class="tag ' + cls + '">' + h(j.st) + '</span>' : j.lv ? '<em>' + h(j.lv) + ' · ' + h(j.st) + '</em>' : '<span>' + h(j.when) + ' · ' + h(j.st) + '</span>') + '</div>'; }).join('') + '</div>'; }
};
PAGES.home = {
  render() {
    const s = HOMEPG.st(); const onsite = PEOPLE.filter(p => p.status === '在岗').length, out = PEOPLE.filter(p => p.status === '外勤').length;
    const dispDef = DISPATCH.defaults();
    return cmdHTML(['安排明天凤凰线换刀闸', '李文博这周工时怎么算的', '三个月内证书到期的有谁', '写本周安全日讲稿']) +
      '<div class="hero' + (XW_IMGS && XW_IMGS.main ? ' hasxw' : '') + '">' + (XW_IMGS && XW_IMGS.main ? '<img class="heroxw" src="' + XW_IMGS.main + '" alt="">' : '') + '<div><div class="g">' + TODAY_CN + ' · ' + WEATHER + ' · <span id="clock">' + new Date().toTimeString().slice(0, 5) + '</span></div><h4>早上好，' + h(TEAM.leader) + ' · <em>小瓦特</em></h4><p class="sub" id="sub"></p></div>' +
      '<div class="nums"><div data-act="nav" data-to="home"><b id="n1">' + HOMEPG.pending() + '</b><span>待拍板</span></div><div data-act="nav" data-to="sched"><b>' + DB.todayJobs().length + '</b><span>今日作业</span></div><div data-act="nav" data-to="people"><b>' + onsite + '/' + out + '</b><span>在岗/外勤</span></div></div></div>' +
      '<div class="sec"><i></i><b>今日待拍板</b><em id="badge2">' + HOMEPG.pending() + '</em><span>决定由班组长作出</span></div>' +
      '<div class="grid3" id="dec">' +
      (s.disp ? '<div class="dc ok" id="d1"><span class="lv">已派 · 明天 09:00</span><b class="t">派工 · 10kV 凤凰线更换 #12 杆刀闸</b><p>工作负责人 ' + h(s.disp.lead) + '；班员 ' + h(s.disp.crew.join('、')) + '；' + h(s.disp.learn) + '随队学习。派工单已发。</p><div class="bt"><button class="g" data-act="nav" data-to="sched">看派工单</button></div></div>'
        : '<div class="dc" id="d1"><span class="lv">紧急 · 明天上午</span><b class="t">派工 · 10kV 凤凰线更换 #12 杆刀闸（第一种工作票）</b><p id="d1p">她的建议：工作负责人 <u class="num" data-act="whylead">' + h(dispDef.lead.n) + '</u>；班员 ' + h(dispDef.crew.map(p => p.n).join('、')) + '；刘一鸣随队学习。</p><div class="ppl" id="ppl"><div class="row"></div><div class="tk"><span class="lbl">小瓦特在想</span><span></span></div></div><div class="bt" id="d1bt"><button data-act="home-go">按她的安排</button><button class="g" data-act="home-swap">换人</button></div></div>') +
      (/已关闭/.test(s.d1) ? '<div class="dc ok" id="d2"><span class="lv">已关闭</span><b class="t">缺陷 · 志远站 F14 志甲线 终端蓄电池锈蚀</b><p>消缺完工并验收，' + h(s.d1) + '，OMS 处理记录已同步。</p><div class="bt"><button class="g" data-act="nav" data-to="safety" data-sub="flow">看闭环</button></div></div>'
        : /待验收/.test(s.d1) ? '<div class="dc w" id="d2"><span class="lv">待验收</span><b class="t">缺陷 · 志远站 F14 志甲线 终端蓄电池锈蚀</b><p>消缺已完工，等验收。验收人建议韩雪。</p><div class="bt" id="d2bt"><button data-act="hz-accept" data-id="d1">验收通过</button><button class="g" data-act="nav" data-to="sched" data-sub="pool">看任务</button></div></div>'
        : /已派|进行中|已排任务/.test(s.d1) ? '<div class="dc ok" id="d2"><span class="lv">' + h(s.d1) + '</span><b class="t">缺陷 · 志远站 F14 志甲线 终端蓄电池锈蚀</b><p>消缺任务已进任务池，在班务日程里跟进度；完工后转待验收。</p><div class="bt"><button class="g" data-act="nav" data-to="sched" data-sub="pool">看进度</button></div></div>'
        : s.urged ? '<div class="dc ok" id="d2"><span class="lv">已催办</span><b class="t">缺陷 · 志远站 F14 志甲线 终端蓄电池锈蚀</b><p>催办已发给吴倩，并入明天巡视。她回传照片后这条自动关闭。</p><div class="bt"><button class="g" disabled>等待回传</button></div></div>'
        : '<div class="dc w" id="d2"><span class="lv">今日</span><b class="t">缺陷 · 志远站 F14 志甲线 终端蓄电池锈蚀 · 超期 3 天</b><p>8-28 登记，时限 3 天。明天吴倩的巡视路线经过志远站，她建议并入。</p><div class="bt" id="d2bt"><button data-act="urge">发出催办</button><button class="g" data-act="later">改期</button></div></div>') +
      (s.sd && s.sd.adopted ? '<div class="dc ok" id="d3"><span class="lv">已安排 · 周五 15:00</span><b class="t">安全日 · 台风季线路巡视与登杆作业</b><p>讲稿已定稿，通知已发全班。</p><div class="bt"><button class="g" data-act="nav" data-to="safety" data-sub="day">看讲稿</button></div></div>'
        : '<div class="dc n" id="d3"><span class="lv">本周</span><b class="t">安全日 · 本周还没安排</b><p>她建议周五 15:00，主题"台风季线路巡视与登杆作业"，讲稿她写了一版。</p><div class="bt" id="d3bt"><button data-act="draft">看讲稿</button><button class="g" data-act="topic">换主题</button></div></div>') +
      '</div>' +
      '<div class="grid2"><div class="card" id="k1"><div class="h"><b id="k1h">今日作业</b><span id="k1s">' + DB.todayJobs().length + ' 项 · 点一行她说进展</span></div><div id="k1b">' + HOMEPG.jobsHTML() + '</div></div>' +
      '<div class="card" id="k2"><div class="h"><b>隐患 · 田寮线 #7 杆 拉线锈断</b><span id="k2s">' + (s.hz ? h(s.hz) : '她从群里照片认出来的') + '</span></div><div class="photo">' + PHOTO.html('p7') + PHOTO.rowsHTML('p7') + '</div><div class="bt" id="k2bt" style="margin-top:8px">' + (s.hz ? '<button class="g" data-act="nav" data-to="safety">去安全管理</button>' : '<button data-act="photo" data-key="p7">核对</button><button class="g" data-act="hz-no" data-key="p7">不是隐患</button>') + '</div></div></div>' +
      '<div class="sec"><i class="v"></i><b>班组一览</b><span>图表可点，点进去她照亮台账</span></div>' + HOMEPG.chartsHTML() +
      '<div class="card"><div class="h"><b>人员去向</b><span>' + onsite + ' 在岗 · ' + out + ' 外勤 · ' + PEOPLE.filter(p => p.status === '休假').length + ' 休假</span></div><div class="ppl on" style="margin:0;border:0;padding:0"><div class="row">' + PEOPLE.map(p => '<div class="chip" data-act="person" data-who="' + p.n + '" style="width:auto;flex-direction:row;align-items:center;gap:6px"><b>' + h(p.n) + '</b><span class="tag ' + (p.status === '在岗' ? 'ok' : p.status === '外勤' ? 'w' : '') + '" style="margin:0">' + h(p.status) + '</span></div>').join('') + '</div></div></div>';
  },
  after() {
    const s = HOMEPG.st(); CH.mount($('#main')); const ar = $('#charea'); if (ar) CH.areaHover(ar, DEF30.days, DEF30.found, DEF30.closed);
    if (s.hz) { $('#ph-p7').classList.add('done'); $('#rd-p7').classList.add('done'); }
    if (S.briefed) { $$('#dec .dc').forEach(d => d.classList.add('in')); if (!s.hz) { $('#ph-p7').classList.add('done'); $('#rd-p7').classList.add('done'); } return; }
    S.briefed = true; XW.clearChat();
    const sub = $('#sub'); const mirror = (t, ms, done) => { XW.state('talk'); XW.type($('#xwsub'), t, ms); XW.type(sub, t, ms, () => { XW.state(''); done && done(); }); };
    XW.at(300, () => mirror('早上好，赵班长。昨晚我看了群里 26 条消息和 OMS 的缺陷表。王安拍的那张照片里，田寮线 #7 杆的拉线锈断了，我先记成了紧急隐患，你核对一下。', 50));
    if (!s.hz) { XW.at(1400, () => { XW.state('look', '正在看照片'); ['0', '1', '2'].forEach((_, i) => XW.at(i * 500, () => $$('#ph-p7 .box')[i].classList.add('on'))); $$('#rd-p7 div').forEach((d, i) => XW.at(600 + i * 450, () => d.classList.add('in'))); XW.at(2400, () => XW.state('talk')); }); }
    XW.at(7600, () => mirror('另外有' + HOMEPG.pending() + '件事要你拍板：' + (s.disp ? '' : '明天凤凰线换刀闸还没派人，我排了个人选；') + (s.urged ? '' : '志远站那条缺陷超期三天了；') + (s.sd && s.sd.adopted ? '' : '这周安全日还没安排。'), 50));
    XW.at(9000, () => $('#d1').classList.add('in')); XW.at(11200, () => $('#d2').classList.add('in')); XW.at(13000, () => $('#d3').classList.add('in'));
    XW.at(14800, () => mirror('你先看哪件？', 60));
    XW.at(16000, () => XW.card('早上说的事都在上面，点哪张卡我就办哪件。'));
  }
};
Object.assign(ACT, {
  'home-swap'() { const host = $('#ppl'); if (!host || host.classList.contains('on')) return; $('#d1').classList.add('wide'); DISPATCH.open(host, DB.job('j5')); },
  'dispatch-pick'(el) { DISPATCH.pick(el.dataset.who); },
  'dispatch-keep'() { XW.answer('好，保留' + DISPATCH.defaults().crew[1].n + '。要办的话点「按她的安排」。', null, { confirm: false }); },
  'home-go'() { ACT['dispatch-go']({ dataset: {} }); },
  'dispatch-go'(el) { if (LS.get('dispatch', {})['j5'] && S.page === 'home') { XW.answer('明天凤凰线的派工单已经发过了，要改的话去班务日程。', null, { confirm: false }); return; } $$('#d1bt button, .msg .bt button').forEach(b => b.disabled = true);
    const host = S.page === 'home' ? $('#k1b') : $('#dform'); if (!DISPATCH.job) DISPATCH.job = DB.job('j5');
    DISPATCH.go(el.dataset.who, host, rec => { if (S.page === 'home') { const d1 = $('#d1'); d1.className = 'dc ok in'; $('.lv', d1).textContent = '已派 · 明天 09:00'; $('#d1p').innerHTML = '工作负责人 ' + h(rec.lead) + '；班员 ' + h(rec.crew.join('、')) + '；刘一鸣随队学习。派工单已发，' + (rec.crew.length + 2) + '人已收到。'; $('#ppl').classList.remove('on'); $('#d1bt').innerHTML = '<button class="g" data-act="nav" data-to="sched">看派工单</button>'; $('#n1').textContent = HOMEPG.pending(); $('#badge2').textContent = HOMEPG.pending(); } else if (S.page === 'sched') { XW.at(200, () => render()); } badgeSync(); }); },
  whylead() { const d = DISPATCH.defaults(); const other = PEOPLE.filter(p => p.cert.includes('工作负责人资格') && p !== d.lead && p.post !== '班长'); XW.answer(d.lead.n + '是这次的工作负责人：有负责人资格，这周 ' + d.lead.week + ' 小时，近一个月带过两次同类作业。' + (other.length ? '另一个有资格的是' + other.map(p => p.n + '，这周 ' + p.week + ' 小时' + (p.week >= WEEK_LIMIT ? '，超了' : '')).join('；') + '。' : ''), null, { confirm: false }); },
  photo(el) { PHOTO.recog(el.dataset.key); },
  'hz-confirm'(el) { const k = el.dataset.key; const hz = LS.get('hazards', {}); hz[k] = '已入隐患台账 · 待现场确认'; LS.set('hazards', hz); const d = DEFECTS.find(x => x.photo === k); if (d) d.st = '已登记'; if ($('#k2s')) $('#k2s').textContent = hz[k]; if ($('#k2bt')) $('#k2bt').innerHTML = '<button class="g" data-act="hz-ask" data-key="' + k + '">让现场确认</button>'; DB.log('隐患', (d ? d.t : k) + ' 确认入台账'); XW.answer('记进隐患台账了' + (k === 'p7' ? '，等王安现场确认断口有没有触地。' : '。'), null, { confirm: false }); badgeSync(); },
  'hz-ask'(el) { const k = el.dataset.key; const who = k === 'p7' ? '王安' : '吴倩'; XW.answer('我给' + who + '发了消息，让他今天路过时看一眼，拍张近照回传。回传后我再更新这条。', null, { confirm: false }); XW.fly('已通知 ' + who + ' · 现场确认'); },
  'hz-no'(el) { const k = el.dataset.key; const hz = LS.get('hazards', {}); hz[k] = '已撤销 · 照片留在群记录'; LS.set('hazards', hz); if ($('#k2s')) $('#k2s').textContent = hz[k]; if ($('#k2bt')) $('#k2bt').innerHTML = '<button class="g" data-act="photo" data-key="' + k + '">重新核对</button>'; XW.answer('好，这条从隐患里撤掉了，照片留在群记录里。', null, { confirm: false }); },
  urge() { XW.state('write'); const d = XW.msg('a', '催办消息我写好了，你看一下：<div class="draft"><span></span></div>'); const txt = '吴倩：志远站 F14 志甲线终端蓄电池锈蚀，8-28 登记，已超期 3 天。明天塘尾线巡视顺路过志远站，请一并处理，处理后拍照回传。—— 赵立群';
    XW.type(d.querySelector('.draft span'), txt, 34, () => { d.insertAdjacentHTML('beforeend', '<div class="bt"><button data-act="urge-send">发送</button><button class="g" data-act="urge-edit">改一下</button></div>'); XW.state(''); XW.scrollChat(); }); XW.type($('#xwsub'), '催办消息我写好了，你看一下。', 45); },
  'urge-send'() { DB.setDefect('d1', '已催办', { who: '吴倩' }); DB.notify('吴倩', '志远站 F14 缺陷催办', '已读', true); XW.fly('催办已送达 · 吴倩'); const d2 = $('#d2'); if (d2) { d2.className = 'dc ok in'; $('.lv', d2).textContent = '已催办'; $('p', d2).textContent = '催办已发给吴倩，并入明天巡视。她回传照片后这条自动关闭。'; $('#d2bt').innerHTML = '<button class="g" disabled>等待回传</button>'; $('#n1').textContent = HOMEPG.pending(); $('#badge2').textContent = HOMEPG.pending(); } XW.answer('发出去了，吴倩已收到。她回传照片后我把这条缺陷关掉，并同步到 OMS 的处理记录。', null, { confirm: false }); badgeSync(); },
  'urge-edit'() { XW.answer('你直接在上面那段里改，改完点发送。', null, { confirm: false }); },
  later() { XW.answer('改到哪天？在班务日程里点那一天，我把催办改成那天并重新算时限。', null, { confirm: false }); },
  draft() { ensure('safety', () => SAFETYPG.draft(), 'day'); },
  topic() { XW.answer('上月的隐患是拉线锈蚀和树障，本周有台风。换成"树障与台风季线路巡视"？', '上月的隐患是拉线锈蚀和树障，本周有台风。换成"树障与台风季线路巡视"？<div class="bt"><button data-act="draft">就这个，看讲稿</button><button class="g">再想想</button></div>', { confirm: false }); },
  person(el) { ensure('people', () => PEOPLEPG.show(el.dataset.who)); },
  /* 图表下钻 */
  'ch-task'(el) { const k = el.dataset.k; const TL = DB.taskLedger(); const rows = TL.map(t => [t.d, t.t, t.line, t.who, t.st]); const me = []; TL.forEach((t, i) => { if (t.t === k) me.push(i); }); const n = me.length, done = TL.filter(t => t.t === k && /已完成|已关闭/.test(t.st)).length; const cnt = {}; TL.filter(t => t.t === k).forEach(t => t.who.split('、').forEach(w => { if (P[w]) cnt[w] = (cnt[w] || 0) + 1; })); const top = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0];
    XW.spot({ title: '任务台账 · 本月 · ' + k, cols: ['日期', '类型', '线路 / 站', '人员', '状态'], rows, me, text: '本月' + k + ' ' + n + ' 项，完成 ' + done + ' 项' + (n - done ? '，没完成的是' + TL.filter(t => t.t === k && !/已完成|已关闭/.test(t.st)).map(t => t.line + '（' + t.st + '）').join('、') : '') + '。' + (top ? k + '做得最多的是' + top + '，' + cnt[top] + ' 次。' : '') }); },
  'ch-hours'(el) { DISPATCH.hours(el.dataset.who); },
  'ch-day'(el) { const i = +el.dataset.i; const d = DEF30.days[i]; const df = DEF30.found[i] - (i ? DEF30.found[i - 1] : 0), dc = DEF30.closed[i] - (i ? DEF30.closed[i - 1] : 0); const last = i === DEF30.days.length - 1;
    XW.answer(d + ' 这天' + (df ? '发现 ' + df + ' 处缺陷' : '没有新发现') + (dc ? '，闭环 ' + dc + ' 处' : '') + '，到这天累计发现 ' + DEF30.found[i] + '、闭环 ' + DEF30.closed[i] + '。' + (last ? '还有 ' + (DEF30.found[i] - DEF30.closed[i]) + ' 处没闭环，志远站那条已经超期。' : ''), null, { confirm: false, done() { XW.card('<div class="bt" style="margin-top:0"><button data-act="nav" data-to="safety" data-sub="photo">去隐患台账</button></div>'); } }); },
  'ch-mod'(el) { const i = +el.dataset.i; const m = MODS[i]; const avg = PEOPLE.reduce((s, p) => s + PEOPLEPG.lv(p)[i], 0) / PEOPLE.length; const weak = PEOPLE.map(p => ({ p, v: PEOPLEPG.lv(p)[i] })).sort((a, b) => a.v - b.v).slice(0, 3); const c = COURSES.find(c => c.mod === m.k);
    XW.answer('"' + m.n + '"班组均值 L' + avg.toFixed(1) + (avg < 3 ? '，低于目标 L3' : '，达到目标') + '。最弱的三个是' + weak.map(w => w.p.n + ' ' + LV[w.v].slice(0, 2)).join('、') + '。' + (c ? '对应的课是《' + c.n + '》，要我排给这三个人吗？' : '这一块没有现成课件，可以安排一次班内带教。'), null, { confirm: false, done() { XW.card('<div class="bt" style="margin-top:0">' + (c ? '<button data-act="ch-mod-plan" data-i="' + i + '">排进培训计划</button>' : '') + '<button class="g" data-act="nav" data-to="people">去班组画像</button></div>'); } }); },
  'ch-mod-plan'(el) { const i = +el.dataset.i; const m = MODS[i]; const c = COURSES.find(c => c.mod === m.k); const weak = PEOPLE.map(p => ({ p, v: PEOPLEPG.lv(p)[i] })).sort((a, b) => a.v - b.v).slice(0, 3); const plan = LS.get('plan', []); weak.forEach(w => plan.push({ who: w.p.n, t: c.n, when: '下周', ts: Date.now() })); LS.set('plan', plan); XW.fly('已加入下周培训计划 · ' + weak.map(w => w.p.n).join(' · ')); XW.answer('排进去了：下周' + weak.map(w => w.p.n).join('、') + '学《' + c.n + '》，学完考一次，成绩回到图谱。', null, { confirm: false }); },
  'ch-cert'() { PEOPLEPG.sixAsk('cert'); },
  'ch-meter'(el) { const k = el.dataset.k; if (k === 'hours') PEOPLEPG.sixAsk('hours'); else if (k === 'safety') PEOPLEPG.sixAsk('safety');
    else if (k === 'defects') { const ds = DB.defects(); XW.spot({ title: '缺陷台账 · 本月', cols: ['缺陷', '等级', '登记', '时限', '状态'], rows: ds.map(d => [d.t, d.lv, d.reg, d.limit + ' 天', d.st]), me: ds.map((d, i) => /已关闭|已消缺|已撤销/.test(d.st) ? -1 : i).filter(i => i >= 0), text: '本月发现 ' + MONTH.defectsFound + ' 处、闭环 ' + MONTH.defectsClosed + ' 处。还没关的我照亮了：' + ds.filter(d => !/已关闭|已消缺|已撤销/.test(d.st)).map(d => d.t.split(' ').slice(0, 2).join(' ') + '（' + d.st + '）').join('、') + '。' }); }
    else { const tk = DB.tickets(); const pend = tk.filter(t => t.st === '待审'); XW.spot({ title: '两票台账 · 本月', cols: ['票号', '类型', '任务', '负责人', '状态'], rows: tk.map(t => [t.no, t.kind, t.task, t.lead, t.st]).concat([['配一 2026-0901-02', '第一种工作票', '凤凰线 #9 杆拉线更换', '黄伟强', '合格'], ['配一 2026-0902-01', '第二种工作票', '志远站 F14 消缺', '黄伟强', '合格'], ['配一 2026-0902-03', '第二种工作票', '光明变出线柜检查', '韩雪', '合格']]), me: tk.map((t, i) => i), text: '本月 ' + MONTH.tickets + ' 张票 ' + MONTH.ticketsOK + ' 张合格。' + (pend.length ? '还有 ' + pend.length + ' 张待审：' + pend.map(t => t.task).join('、') + '，在班务日程的审票里。' : '待审的都审完了。') }); } }
});
