/* ===== 今日工作台：她先开口，卡片随话浮出；每个按钮都是一段过程 ===== */
const HOMEPG = {
  st() { return { disp: LS.get('dispatch', {})['j5'], urged: LS.get('defects', {})['d1'], hz: LS.get('hazards', {})['p7'], sd: LS.get('docs', {})['safetyday'] }; },
  pending() { const s = this.st(); return (s.disp ? 0 : 1) + (s.urged ? 0 : 1) + (s.sd && s.sd.adopted ? 0 : 1); },
  jobsHTML() { const disp = LS.get('dispatch', {}); return '<div class="jobs">' + JOBS.map(j => { const d = disp[j.id]; return '<div><span style="color:var(--ink);font-size:11.5px">' + h(j.t) + (j.who ? ' · ' + j.who.join(' ') : d ? ' · ' + d.lead + ' ' + d.crew.join(' ') : '') + '</span>' + (d ? '<span class="tag ok">已派</span>' : j.lv ? '<em>' + h(j.lv) + ' · ' + h(j.st) + '</em>' : '<span>' + h(j.when) + ' · ' + h(j.st) + '</span>') + '</div>'; }).join('') + '</div>'; }
};
PAGES.home = {
  render() {
    const s = HOMEPG.st(); const onsite = PEOPLE.filter(p => p.status === '在岗').length, out = PEOPLE.filter(p => p.status === '外勤').length;
    const dispDef = DISPATCH.defaults();
    return cmdHTML(['安排明天凤凰线换刀闸', '李文博这周工时怎么算的', '三个月内证书到期的有谁', '写本周安全日讲稿']) +
      '<div class="hero"><div><div class="g">' + TODAY_CN + ' · ' + WEATHER + ' · <span id="clock">' + new Date().toTimeString().slice(0, 5) + '</span></div><h4>早上好，' + h(TEAM.leader) + ' · <em>小瓦特</em></h4><p class="sub" id="sub"></p></div>' +
      '<div class="nums"><div data-act="nav" data-to="home"><b id="n1">' + HOMEPG.pending() + '</b><span>待拍板</span></div><div data-act="nav" data-to="sched"><b>' + JOBS.length + '</b><span>今日作业</span></div><div data-act="nav" data-to="people"><b>' + onsite + '/' + out + '</b><span>在岗/外勤</span></div></div></div>' +
      '<div class="sec"><i></i><b>今日待拍板</b><em id="badge2">' + HOMEPG.pending() + '</em><span>决定由班组长作出</span></div>' +
      '<div class="grid3" id="dec">' +
      (s.disp ? '<div class="dc ok" id="d1"><span class="lv">已派 · 明天 09:00</span><b class="t">派工 · 10kV 凤凰线更换 #12 杆刀闸</b><p>工作负责人 ' + h(s.disp.lead) + '；班员 ' + h(s.disp.crew.join('、')) + '；' + h(s.disp.learn) + '随队学习。派工单已发。</p><div class="bt"><button class="g" data-act="nav" data-to="sched">看派工单</button></div></div>'
        : '<div class="dc" id="d1"><span class="lv">紧急 · 明天上午</span><b class="t">派工 · 10kV 凤凰线更换 #12 杆刀闸（第一种工作票）</b><p id="d1p">她的建议：工作负责人 <u class="num" data-act="whylead">' + h(dispDef.lead.n) + '</u>；班员 ' + h(dispDef.crew.map(p => p.n).join('、')) + '；刘一鸣随队学习。</p><div class="ppl" id="ppl"><div class="row"></div><div class="tk"><span class="lbl">小瓦特在想</span><span></span></div></div><div class="bt" id="d1bt"><button data-act="home-go">按她的安排</button><button class="g" data-act="home-swap">换人</button></div></div>') +
      (s.urged ? '<div class="dc ok" id="d2"><span class="lv">已催办</span><b class="t">缺陷 · 志远站 F14 志甲线 终端蓄电池锈蚀</b><p>催办已发给吴倩，并入明天巡视。她回传照片后这条自动关闭。</p><div class="bt"><button class="g" disabled>等待回传</button></div></div>'
        : '<div class="dc w" id="d2"><span class="lv">今日</span><b class="t">缺陷 · 志远站 F14 志甲线 终端蓄电池锈蚀 · 超期 3 天</b><p>8-28 登记，时限 3 天。明天吴倩的巡视路线经过志远站，她建议并入。</p><div class="bt" id="d2bt"><button data-act="urge">发出催办</button><button class="g" data-act="later">改期</button></div></div>') +
      (s.sd && s.sd.adopted ? '<div class="dc ok" id="d3"><span class="lv">已安排 · 周五 15:00</span><b class="t">安全日 · 台风季线路巡视与登杆作业</b><p>讲稿已定稿，通知已发全班。</p><div class="bt"><button class="g" data-act="nav" data-to="safety" data-sub="day">看讲稿</button></div></div>'
        : '<div class="dc n" id="d3"><span class="lv">本周</span><b class="t">安全日 · 本周还没安排</b><p>她建议周五 15:00，主题"台风季线路巡视与登杆作业"，讲稿她写了一版。</p><div class="bt" id="d3bt"><button data-act="draft">看讲稿</button><button class="g" data-act="topic">换主题</button></div></div>') +
      '</div>' +
      '<div class="grid2"><div class="card" id="k1"><div class="h"><b id="k1h">今日作业</b><span id="k1s">' + JOBS.length + ' 项</span></div><div id="k1b">' + HOMEPG.jobsHTML() + '</div></div>' +
      '<div class="card" id="k2"><div class="h"><b>隐患 · 田寮线 #7 杆 拉线锈断</b><span id="k2s">' + (s.hz ? h(s.hz) : '她从群里照片认出来的') + '</span></div><div class="photo">' + PHOTO.html('p7') + PHOTO.rowsHTML('p7') + '</div><div class="bt" id="k2bt" style="margin-top:8px">' + (s.hz ? '<button class="g" data-act="nav" data-to="safety">去安全管理</button>' : '<button data-act="photo" data-key="p7">核对</button><button class="g" data-act="hz-no" data-key="p7">不是隐患</button>') + '</div></div></div>' +
      '<div class="card"><div class="h"><b>人员去向</b><span>' + onsite + ' 在岗 · ' + out + ' 外勤 · ' + PEOPLE.filter(p => p.status === '休假').length + ' 休假</span></div><div class="ppl on" style="margin:0;border:0;padding:0"><div class="row">' + PEOPLE.map(p => '<div class="chip" data-act="person" data-who="' + p.n + '" style="width:auto;flex-direction:row;align-items:center;gap:6px"><b>' + h(p.n) + '</b><span class="tag ' + (p.status === '在岗' ? 'ok' : p.status === '外勤' ? 'w' : '') + '" style="margin:0">' + h(p.status) + '</span></div>').join('') + '</div></div></div>';
  },
  after() {
    const s = HOMEPG.st();
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
  'home-swap'() { const host = $('#ppl'); if (!host || host.classList.contains('on')) return; $('#d1').classList.add('wide'); DISPATCH.open(host, JOBS.find(j => j.id === 'j5')); },
  'dispatch-pick'(el) { DISPATCH.pick(el.dataset.who); },
  'dispatch-keep'() { XW.answer('好，保留' + DISPATCH.defaults().crew[1].n + '。要办的话点「按她的安排」。', null, { confirm: false }); },
  'home-go'() { ACT['dispatch-go']({ dataset: {} }); },
  'dispatch-go'(el) { if (LS.get('dispatch', {})['j5'] && S.page === 'home') { XW.answer('明天凤凰线的派工单已经发过了，要改的话去班务日程。', null, { confirm: false }); return; } $$('#d1bt button, .msg .bt button').forEach(b => b.disabled = true);
    const host = S.page === 'home' ? $('#k1b') : $('#dform'); if (!DISPATCH.job) DISPATCH.job = JOBS.find(j => j.id === 'j5');
    DISPATCH.go(el.dataset.who, host, rec => { if (S.page === 'home') { const d1 = $('#d1'); d1.className = 'dc ok in'; $('.lv', d1).textContent = '已派 · 明天 09:00'; $('#d1p').innerHTML = '工作负责人 ' + h(rec.lead) + '；班员 ' + h(rec.crew.join('、')) + '；刘一鸣随队学习。派工单已发，' + (rec.crew.length + 2) + '人已收到。'; $('#ppl').classList.remove('on'); $('#d1bt').innerHTML = '<button class="g" data-act="nav" data-to="sched">看派工单</button>'; $('#n1').textContent = HOMEPG.pending(); $('#badge2').textContent = HOMEPG.pending(); } else if (S.page === 'sched') { XW.at(200, () => render()); } badgeSync(); }); },
  whylead() { const d = DISPATCH.defaults(); XW.answer(d.lead.n + '是这次的工作负责人：有负责人资格，这周 ' + d.lead.week + ' 小时，近一个月带过两次同类作业。另一个有资格的是黄伟强，这周 26 小时，超了。', null, { confirm: false }); },
  photo(el) { PHOTO.recog(el.dataset.key); },
  'hz-confirm'(el) { const k = el.dataset.key; const hz = LS.get('hazards', {}); hz[k] = '已入隐患台账 · 待现场确认'; LS.set('hazards', hz); const d = DEFECTS.find(x => x.photo === k); if (d) d.st = '已登记'; if ($('#k2s')) $('#k2s').textContent = hz[k]; if ($('#k2bt')) $('#k2bt').innerHTML = '<button class="g" data-act="hz-ask" data-key="' + k + '">让现场确认</button>'; XW.answer('记进隐患台账了' + (k === 'p7' ? '，等王安现场确认断口有没有触地。' : '。'), null, { confirm: false }); badgeSync(); },
  'hz-ask'(el) { const k = el.dataset.key; const who = k === 'p7' ? '王安' : '吴倩'; XW.answer('我给' + who + '发了消息，让他今天路过时看一眼，拍张近照回传。回传后我再更新这条。', null, { confirm: false }); XW.fly('已通知 ' + who + ' · 现场确认'); },
  'hz-no'(el) { const k = el.dataset.key; const hz = LS.get('hazards', {}); hz[k] = '已撤销 · 照片留在群记录'; LS.set('hazards', hz); if ($('#k2s')) $('#k2s').textContent = hz[k]; if ($('#k2bt')) $('#k2bt').innerHTML = '<button class="g" data-act="photo" data-key="' + k + '">重新核对</button>'; XW.answer('好，这条从隐患里撤掉了，照片留在群记录里。', null, { confirm: false }); },
  urge() { XW.state('write'); const d = XW.msg('a', '催办消息我写好了，你看一下：<div class="draft"><span></span></div>'); const txt = '吴倩：志远站 F14 志甲线终端蓄电池锈蚀，8-28 登记，已超期 3 天。明天塘尾线巡视顺路过志远站，请一并处理，处理后拍照回传。—— 赵立群';
    XW.type(d.querySelector('.draft span'), txt, 34, () => { d.insertAdjacentHTML('beforeend', '<div class="bt"><button data-act="urge-send">发送</button><button class="g" data-act="urge-edit">改一下</button></div>'); XW.state(''); XW.scrollChat(); }); XW.type($('#xwsub'), '催办消息我写好了，你看一下。', 45); },
  'urge-send'() { const df = LS.get('defects', {}); df['d1'] = { st: '已催办', who: '吴倩', ts: Date.now() }; LS.set('defects', df); DEFECTS[0].st = '已催办'; XW.fly('催办已送达 · 吴倩'); const d2 = $('#d2'); if (d2) { d2.className = 'dc ok in'; $('.lv', d2).textContent = '已催办'; $('p', d2).textContent = '催办已发给吴倩，并入明天巡视。她回传照片后这条自动关闭。'; $('#d2bt').innerHTML = '<button class="g" disabled>等待回传</button>'; $('#n1').textContent = HOMEPG.pending(); $('#badge2').textContent = HOMEPG.pending(); } XW.answer('发出去了，吴倩已收到。她回传照片后我把这条缺陷关掉，并同步到 OMS 的处理记录。', null, { confirm: false }); badgeSync(); },
  'urge-edit'() { XW.answer('你直接在上面那段里改，改完点发送。', null, { confirm: false }); },
  later() { XW.answer('改到哪天？在班务日程里点那一天，我把催办改成那天并重新算时限。', null, { confirm: false }); },
  draft() { ensure('safety', () => SAFETYPG.draft(), 'day'); },
  topic() { XW.answer('上月的隐患是拉线锈蚀和树障，本周有台风。换成"树障与台风季线路巡视"？', '上月的隐患是拉线锈蚀和树障，本周有台风。换成"树障与台风季线路巡视"？<div class="bt"><button data-act="draft">就这个，看讲稿</button><button class="g">再想想</button></div>', { confirm: false }); },
  person(el) { ensure('people', () => PEOPLEPG.show(el.dataset.who)); }
});
