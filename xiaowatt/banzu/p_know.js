/* ===== 班组知识库：规程问答带出处、案例沉淀、班长经验访谈 ===== */
const KNOWPG = {
  QS: [{ q: '站内馈线保护定值是多少', k: 'k1' }, { q: '重合闸有哪几种方式', k: 'k2' }, { q: '遥控失败先查什么', k: 'k5' }, { q: '停电作业安措顺序', k: 'k6' }, { q: '差动保护的差电流怎么算', k: 'k4' }, { q: '每周外勤上限是多少', k: 'k8' }, { q: '电缆试验前要做什么', k: 'k7' }],
  find(text) { const hit = this.QS.find(x => text.includes(x.q.slice(0, 4))); if (hit) return KB.find(k => k.id === hit.k); const words = ['整定', '定值', '馈线', '重合闸', '零序', '接地变', '差动', '光差', '遥控', '终端', '二次', '安措', '接地线', '验电', '登杆', '电缆', '试验', '外勤', '工时', '约定']; const w = words.filter(x => text.includes(x)); return KB.find(k => w.some(x => k.tags.includes(x) || k.body.includes(x) || k.t.includes(x))); },
  ask(text) { const k = this.find(text); const host = $('#kba'); if (!k) { XW.answer('这条我在班组知识库里没找到，你可以把规程原文拖进来，我下次就会答。', null, { confirm: false }); return; }
    if (host) { host.innerHTML = '<div id="kbtext"></div><div class="src" data-act="kb-src">出处：' + h(k.src) + '（点开原文）</div><div class="orig">' + h(k.body) + '</div>'; XW.state('talk'); XW.type($('#kbtext'), k.body, 30, () => { XW.state(''); XW.answer('答案在左边，出处是' + k.src + '，点一下能看原文。' + (k.id === 'k1' ? '要不要我顺便看看凤凰线现在的定值单和这个是否一致？' : k.id === 'k6' ? '明天凤凰线那张票我审过，验电和接地线档位补齐了。' : ''), null, { confirm: false, speak: false }); }); XW.type($('#xwsub'), k.body.slice(0, 60) + '…', 45); }
    else XW.answer(k.body + '（出处：' + k.src + '）', null, { confirm: false }); },
  cases() { const cs = CASES.concat(LS.get('cases', [])); return cs.map(c => '<div class="casec"><b>' + h(c.t) + ' <span class="note">' + h(c.d) + ' · ' + h(c.who) + '</span></b><div><i>现象</i><span>' + h(c.sym) + '</span></div><div><i>原因</i><span>' + h(c.cause) + '</span></div><div><i>处理</i><span>' + h(c.fix) + '</span></div><div><i>教训</i><span>' + h(c.lesson) + '</span></div></div>').join(''); }
};
PAGES.know = {
  render() { const exp = EXPERIENCE.concat(LS.get('exp', [])); return cmdHTML(['站内馈线保护定值是多少', '停电作业安措顺序', '把今天田寮线的处理存为案例', '记一条我的经验']) + pageHead('班组知识库', '规程问答有出处 · 案例沉淀 · 班长经验') +
    '<div class="grid2" style="grid-template-columns:1.2fr 1fr"><div class="card"><div class="h"><b>规程问答</b><span>答案逐字出，条款可点开原文</span></div><div class="kbq">' + KNOWPG.QS.map(q => '<b data-act="kb-ask" data-q="' + h(q.q) + '">' + h(q.q) + '</b>').join('') + '</div><div class="kba" id="kba" style="margin-top:8px"><div class="empty">点一个问题，或在上面输入</div></div><div class="h" style="margin-top:12px"><b>规程与约定条目</b><span>' + KB.length + ' 条</span></div><div class="tbl"><table class="t">' + KB.map(k => '<tr><td><b>' + h(k.t) + '</b><br><span class="note">' + h(k.src) + '</span></td><td>' + k.tags.map(t => '<span class="tag">' + h(t) + '</span>').join('') + '</td></tr>').join('') + '</table></div></div>' +
    '<div><div class="card"><div class="h"><b>典型案例</b><span>处理记录一键沉淀</span><div class="r"><button class="s" data-act="case-new">把田寮线 #7 存为案例</button></div></div><div id="cases">' + KNOWPG.cases() + '</div></div>' +
    '<div class="card" style="margin-top:10px"><div class="h"><b>班长经验</b><span>她问，你说，她整理</span><div class="r"><button class="s g" data-act="exp-start">经验访谈</button></div></div>' + exp.map(e => '<div class="casec"><b>' + h(e.t) + ' <span class="note">' + h(e.who) + '</span></b><div><i>要点</i><span>' + h(e.body) + '</span></div></div>').join('') + '</div></div></div>'; },
  after() {}
};
Object.assign(ACT, {
  'kb-ask'(el) { XW.user(el.dataset.q, false); XW.at(400, () => KNOWPG.ask(el.dataset.q)); },
  'kb-src'(el) { el.nextElementSibling.classList.toggle('on'); },
  'case-new'() { XW.state('write'); const d = XW.msg('a', '我把今天田寮线 #7 的处理整理成案例：<div class="draft"><span></span></div>'); const txt = '案例：田寮线 #7 杆拉线锈断\n现象：班组群照片发现拉线离地约 1.2 m 处锈断，杆身未倾斜\n原因：沿海高湿，拉线镀锌层脱落；该段线路 #9 杆一周前同类缺陷\n处理：列紧急隐患，王安现场确认断口未触地，纳入明日凤凰线作业顺路更换\n教训：台风季前对沿海段拉线专项巡视；群里照片当天登记不过夜'; XW.type(d.querySelector('.draft span'), txt, 28, () => { XW.state(''); d.insertAdjacentHTML('beforeend', '<div class="bt"><button data-act="case-save">存入案例库</button><button class="g">改一下</button></div>'); XW.scrollChat(); }); },
  'case-save'() { const cs = LS.get('cases', []); if (!cs.some(c => c.t.includes('田寮线 #7'))) cs.push({ t: '田寮线 #7 杆拉线锈断', d: TODAY, who: '王安', sym: '群照片发现拉线离地约 1.2 m 处锈断', cause: '沿海高湿，镀锌层脱落', fix: '列紧急隐患，现场确认后纳入凤凰线作业顺路更换', lesson: '台风季前沿海段拉线专项巡视；群里照片当天登记' }); LS.set('cases', cs); if ($('#cases')) $('#cases').innerHTML = KNOWPG.cases(); XW.answer('存进案例库了。下次再有拉线的活，派工和审票的时候我会提这条。', null, { confirm: false }); },
  'exp-start'() { XW.answer('那我问你三个问题，你打字答就行。第一个：新人第一次上杆，你一般让他先做什么、不让他做什么？', null, { confirm: false }); XW._expWait = 1; },
  'exp-save'(el) { const ex = LS.get('exp', []); ex.push({ who: '赵立群', t: '新人上杆', body: el.dataset.body }); LS.set('exp', ex); XW.answer('记成一条经验了，放在"班长经验"里，署名赵立群。', null, { confirm: false }); }
});
