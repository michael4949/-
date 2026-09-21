/* ===== 场景 A · 操作票填写考核页 =====
   布局按总体方案 3.4：① 顶部 操作任务 / 考核说明 / 作答要求 ② 中部左 主接线图 ③ 中部右 运行方式说明与必要的空开压板编号 ④ 底部 操作票填写表格。
   场景只给完成写票必须知道的信息，不给标准步骤顺序、不给标准答案全文。 */

const TK = { on: false, rows: [], res: null, sec: 0, timer: null, stress: false, mode: 'exam', rec: null, tab: 'err' };

/* ---------- 主接线图（110kV 仿真站，考核Ⅰ线1161 间隔画全，其余间隔简画） ---------- */
function tkBusSVG() {
  const dev = (x, y, id, n, st, kind) => {
    if (kind === 'cb') return `<g class="tkdev" data-dev="${id}"><rect x="${x - 9}" y="${y - 13}" width="18" height="26" rx="2"/><text class="tkl" x="${x + 14}" y="${y + 4}">${n}</text></g>`;
    if (kind === 'gnd') return `<g class="tkdev gnd" data-dev="${id}"><line x1="${x}" y1="${y}" x2="${x - 26}" y2="${y}"/><line x1="${x - 26}" y1="${y - 7}" x2="${x - 40}" y2="${y + 7}"/><line x1="${x - 44}" y1="${y + 8}" x2="${x - 30}" y2="${y + 8}"/><line x1="${x - 41}" y1="${y + 11}" x2="${x - 33}" y2="${y + 11}"/><text class="tkl e" x="${x - 100}" y="${y + 4}">${n}</text></g>`;
    return `<g class="tkdev" data-dev="${id}"><line x1="${x}" y1="${y + 12}" x2="${x}" y2="${y + 4}"/><line x1="${x}" y1="${y - 12}" x2="${x + 11}" y2="${y + 3}"/><circle cx="${x}" cy="${y + 12}" r="2.2"/><circle cx="${x}" cy="${y - 12}" r="2.2"/><text class="tkl" x="${x + 14}" y="${y + 4}">${n}</text></g>`;
  };
  const feeder = (x, nm, pre, simple) => {
    const s = [`<line class="tkw" x1="${x}" y1="250" x2="${x}" y2="42"/>`];
    if (simple) {
      s.push(dev(x, 228, pre + '1', pre + '1', '', 'ds'), dev(x, 170, pre, pre, '', 'cb'), dev(x, 110, pre + '4', pre + '4', '', 'ds'));
    } else {
      s.push(dev(x, 228, '11611', '11611 · 1M侧刀闸', '', 'ds'));
      s.push(dev(x, 198, '1161B0', '1161B0 · 开关侧地刀', '', 'gnd'));
      s.push(dev(x, 168, '1161', '1161 开关', '', 'cb'));
      s.push(dev(x, 136, '1161C0', '1161C0 · CT侧地刀', '', 'gnd'));
      s.push(dev(x, 104, '11614', '11614 · 线路侧刀闸', '', 'ds'));
      s.push(dev(x, 74, '116140', '116140 · 线路侧地刀', '', 'gnd'));
    }
    s.push(`<path class="tkw" d="M${x - 8} 52 L${x} 38 L${x + 8} 52 Z" fill="none"/><text class="tkn" x="${x}" y="28" text-anchor="middle">${nm}</text>`);
    return s.join('');
  };
  const tr = (x, nm, no) => `<g><line class="tkw" x1="${x}" y1="250" x2="${x}" y2="296"/>${dev(x, 268, no, no, '', 'ds')}<circle class="tkw" cx="${x}" cy="312" r="15" fill="none"/><circle class="tkw" cx="${x}" cy="328" r="15" fill="none"/><text class="tkn" x="${x + 22}" y="322">${nm}</text><line class="tkw" x1="${x}" y1="343" x2="${x}" y2="372"/></g>`;
  const pt = (x, nm) => `<g><line class="tkw" x1="${x}" y1="250" x2="${x}" y2="280"/><circle class="tkw" cx="${x}" cy="292" r="11" fill="none"/><text class="tkn" x="${x + 16}" y="296">${nm}</text></g>`;
  return `<svg viewBox="0 0 980 400" class="tkbus" xmlns="http://www.w3.org/2000/svg">
    <text class="tkt" x="12" y="18">110kV 仿真站主接线图（110kV 为 GIS 设备）</text>
    <line class="tkbus1" x1="55" y1="250" x2="462" y2="250"/><text class="tkn b" x="20" y="255">110kV 1M</text>
    <line class="tkbus1" x1="518" y1="250" x2="935" y2="250"/><text class="tkn b" x="942" y="255">2M</text>
    <g class="tkdev" data-dev="1012"><line class="tkw" x1="462" y1="250" x2="518" y2="250"/><rect x="481" y="240" width="18" height="20" rx="2"/><text class="tkl" x="466" y="232">10121</text><text class="tkl" x="504" y="232">10122</text><text class="tkl" x="472" y="276">分段1012</text></g>
    ${feeder(250, '考核Ⅰ线', '1161', false)}
    ${feeder(640, '考核Ⅱ线', '1162', true)}
    ${feeder(840, '培训三线', '1163', true)}
    ${pt(95, '111PT')}${pt(905, '112PT')}
    ${tr(160, '#1主变 63MVA', '1101')}${tr(580, '#2主变 63MVA', '1102')}${tr(760, '#3主变 63MVA', '1103')}
    <line class="tkbus1" x1="110" y1="372" x2="230" y2="372"/><text class="tkn" x="76" y="377">10kV 1M</text>
    <line class="tkbus1" x1="520" y1="372" x2="650" y2="372"/><text class="tkn" x="486" y="377">2AM</text>
    <line class="tkbus1" x1="700" y1="372" x2="830" y2="372"/><text class="tkn" x="840" y="377">3M</text>
  </svg>`;
}
const TK_DEV = {
  '1161': ['考核Ⅰ线1161开关', '110kV GIS 断路器 · 后台操作 · 现合闸位置'],
  '11611': ['考核Ⅰ线1M侧11611刀闸', '母线侧隔离开关 · 后台操作 · 现合上位置 · 电机电源空开在合闸位置'],
  '11614': ['考核Ⅰ线线路侧11614刀闸', '线路侧隔离开关 · 后台操作 · 现合上位置 · 电机电源空开在合闸位置'],
  '116140': ['考核Ⅰ线线路侧116140地刀', '线路侧接地开关 · 就地汇控柜操作 · 现拉开位置 · 电机电源空开在断开位置'],
  '1161B0': ['考核Ⅰ线开关侧1161B0地刀', '开关侧接地开关 · 就地汇控柜操作 · 现拉开位置 · 站内值班负责人下令'],
  '1161C0': ['考核Ⅰ线CT侧1161C0地刀', 'CT 侧接地开关 · 就地汇控柜操作 · 现拉开位置 · 站内值班负责人下令'],
  '1012': ['110kV1M、2M分段1012开关', '分段断路器 · 现合闸位置 · 两侧10121、10122刀闸在合上位置'],
  '1162': ['考核Ⅱ线1162开关', '挂 110kV2M 运行'], '1163': ['培训三线1163开关', '挂 110kV2M 运行'],
  '1101': ['#1主变变高1101', '挂 110kV1M 运行'], '1102': ['#2主变变高1102', '挂 110kV2M 运行'], '1103': ['#3主变变高1103', '挂 110kV2M 运行']
};

/* ---------- 页面 ---------- */
function pageTicket() {
  if (TK.res) return tkResultHTML();
  if (TK.on) return tkFormPage();
  return tkIntroHTML();
}
function tkIntroHTML() {
  const recs = tkRecords();
  return `<div class="wrap tkwrap">
    <div class="ph"><h2>操作票填写</h2><span class="sub">A 类 · 常态业务　${h(TICKET_META.station)}　标准票 ${h(TICKET_META.ver)}　票号规则 YYMMNNN</span></div>
    <div class="card tkintro">
      <div class="tktask"><b>操作任务</b><p>${h(TICKET_META.task)}</p></div>
      <div class="tkask"><b>作答要求</b><ol>${TICKET_META.ask.map(x => `<li>${h(x)}</li>`).join('')}<li>系统给出工作任务与现场资料，由你自行判断停电范围并逐项填写操作票。</li><li>提交后自动判卷：漏项、错项、顺序错误、阶段越界、危险操作分别判定，并给出依据条款与正确写法。</li></ol></div>
      <div class="tkmodes">
        <label class="tkmd"><input type="radio" name="tkmode" value="teach" checked><b>训练模式</b><span>填错当场提示，可反复改</span></label>
        <label class="tkmd"><input type="radio" name="tkmode" value="exam"><b>考核模式</b><span>一次提交，计时计分</span></label>
        <label class="tkmd stress"><input type="checkbox" id="tkstress"><b>压力模式</b><span>限时 20 分钟 · 中途有调度来电打断</span></label>
      </div>
      <div class="tkgo"><button class="btn pri" id="tkstart">开始填写</button><span class="note">共 ${TICKET.length} 行标准票（48 项，含子项），分三个设备状态阶段</span></div>
    </div>
    <div class="card"><div class="ch"><b>我的演练档案</b><span class="note">每次演练一份档案，永久保存，可回看全过程</span></div>
      ${recs.length ? `<table class="tb tkrecs"><tr><th>时间</th><th>模式</th><th>用时</th><th>得分</th><th>结论</th><th>错误</th><th></th></tr>${recs.map((r, i) => `<tr><td>${h(r.d)}</td><td>${h(r.mode)}</td><td>${Math.floor(r.sec / 60)}分${r.sec % 60}秒</td><td class="mono">${r.score}</td><td>${r.pass ? '<span class="tag ok">合格</span>' : r.fatal && r.fatal.length ? '<span class="tag bad">整票不合格</span>' : '<span class="tag bad">不合格</span>'}</td><td class="note">${h((r.sum || []).join('、') || '无')}</td><td><button class="btn s" data-tkopen="${i}">回看</button></td></tr>`).join('')}</table>` : '<div class="empty">还没有演练记录，点上面「开始填写」</div>'}
    </div>
  </div>`;
}
function tkFormPage() {
  return `<div class="wrap tkwrap">
    <div class="ph"><h2>操作票填写</h2><span class="sub">${h(TICKET_META.station)}　${h(TICKET_META.kind)}</span>
      <span class="tktimer" id="tktimer">00:00</span>${TK.stress ? '<span class="tag bad">压力模式</span>' : ''}<span class="tag">${TK.mode === 'exam' ? '考核模式' : '训练模式'}</span></div>
    <div class="card tktop"><div class="tktask"><b>操作任务</b><p>${h(TICKET_META.task)}</p></div>
      <div class="tkask2">${TICKET_META.ask.map(x => `<span>${h(x)}</span>`).join('')}</div></div>
    <div class="tkmid">
      <div class="card tkleft"><div class="ch"><b>主接线图</b><span class="note">点设备看名称、编号与当前状态</span></div>${tkBusSVG()}<div class="tkpop" id="tkpop"></div></div>
      <div class="card tkright"><div class="ch"><b>运行方式与现场资料</b></div>
        <div class="tkrun">${TICKET_META.runway.map(x => `<p>${h(x)}</p>`).join('')}<p class="tknote">${h(TICKET_META.note)}</p></div>
        <div class="ch2"><b>必要的空气开关与压板编号</b></div>
        ${TICKET_META.gear.map(g => `<div class="tkgear"><b>${h(g.p)}</b><span class="note">${h(g.m)}</span><table class="tb s"><tr><th>编号</th><th>名称</th><th>正常方式</th></tr>${g.rows.map(r => `<tr><td class="mono">${h(r[0])}</td><td>${h(r[1])}</td><td>${h(r[2])}</td></tr>`).join('')}</table></div>`).join('')}
      </div>
    </div>
    <div class="card tkform">
      <div class="ch"><b>现场电气操作票</b><span class="note">票号 ${h(TICKET_META.no)}　一项一个输入框；子项用「加子项」，会自动编为 x.1、x.2</span>
        <span class="r"><button class="btn s" id="tkadd">加一项</button><button class="btn s" id="tksub">加子项</button><button class="btn pri" id="tksubmit">提交判卷</button></span></div>
      <div id="tkrows"></div>
      <div class="tkfoot"><span>操作人：不填写</span><span>监护人：不填写</span><span>值班负责人：不填写</span></div>
    </div>
  </div>`;
}

/* ---------- 作答行 ---------- */
function tkRenum() {
  let main = 0, sub = 0;
  TK.rows.forEach(r => {
    if (r.child) { sub++; r.no = main + '.' + sub; r.parent = String(main); }
    else { main++; sub = 0; r.no = String(main); r.parent = null; }
  });
}
function tkRowsHTML() {
  tkRenum();
  return `<table class="tb tkt"><tr><th style="width:74px">顺序</th><th>操 作 项 目</th><th style="width:80px">操作√</th><th style="width:56px"></th></tr>
    ${TK.rows.map((r, i) => `<tr class="${r.child ? 'sub' : ''}"><td class="mono">${r.no}</td>
      <td><input class="tkin" data-i="${i}" value="${h(r.t)}" placeholder="${r.child ? '子项内容，如：断开11611刀闸控制电源空气开关' : '填写一个操作项目，一栏只写一个动词'}"></td>
      <td class="tkck"><i></i></td>
      <td><button class="btn s g" data-tkdel="${i}">删</button></td></tr>`).join('')}</table>`;
}
function tkPaint() { const host = $('#tkrows'); if (host) host.innerHTML = tkRowsHTML(); }
function tkRead() { $$('.tkin').forEach(inp => { const i = +inp.dataset.i; if (TK.rows[i]) TK.rows[i].t = inp.value; }); }

function tkStart(mode, stress) {
  TK.on = true; TK.res = null; TK.mode = mode || 'exam'; TK.stress = !!stress; TK.sec = 0;
  TK.rows = Array.from({ length: 6 }, () => ({ t: '', child: false }));
  goPage('ticket');
  if (TK.timer) clearInterval(TK.timer);
  TK.timer = setInterval(() => {
    TK.sec++; const e = $('#tktimer'); if (!e) return;
    e.textContent = String(Math.floor(TK.sec / 60)).padStart(2, '0') + ':' + String(TK.sec % 60).padStart(2, '0');
    if (TK.stress && TK.sec === 45) tkBreak();
    if (TK.stress && TK.sec >= 1200) { toast('压力模式限时已到，自动提交', 'bad'); tkSubmit(); }
  }, 1000);
}
function tkBreak() {
  const b = el('div', 'tkbreak', `<b>调度来电</b><p>“${h(TICKET_META.station)}，你站考核Ⅰ线1161的票填到哪一步了？另外2M有一条线路告警，等下要你配合，先把这张票填完报我。”</p><div class="bt"><button class="btn pri" id="tkbrk">知道了，继续填票</button></div>`);
  document.body.appendChild(b); $('#tkbrk').onclick = () => b.remove();
}
function tkSubmit() {
  tkRead();
  const rows = TK.rows.filter(r => (r.t || '').trim());
  if (rows.length < 5) { toast('至少填 5 项再提交', 'bad'); return; }
  if (TK.timer) { clearInterval(TK.timer); TK.timer = null; }
  const res = tkJudge(rows);
  TK.res = res; TK.on = false;
  const sum = Object.keys(res.byKind).map(k => ERR_KINDS[k].n + ' ' + res.byKind[k]);
  TK.rec = { d: stamp(), mode: TK.mode === 'exam' ? '考核模式' : '训练模式', stress: TK.stress, sec: TK.sec, score: res.score, pass: res.pass, fatal: res.fatal, sum, rows, ver: TICKET_META.ver };
  tkSave(TK.rec);
  goPage('ticket');
}

/* ---------- 结果页：错误定位 → 正确写法 → 业务执行原因 → 制度依据 → 处理结果 ---------- */
function tkErrCard(e, i) {
  const K = ERR_KINDS[e.kind];
  const cites = (e.cites || []).filter(Boolean);
  return `<div class="tkerr ${K.c}">
    <div class="eh"><span class="tag ${K.c === 'r' ? 'bad' : K.c === 'o' ? 'w' : ''}">${K.n}</span>
      <b>${h(e.title)}</b>
      <span class="r">${e.fatalHit ? '<span class="tag bad">整票不合格</span>' : e.deduct ? '<span class="tag">扣 ' + e.deduct + ' 分</span>' : ''}${e.review ? '<span class="tag w">需人工复核</span>' : ''}</span></div>
    <div class="er"><i>错误位置</i><span>${e.at != null ? '学员第 ' + (e.at + 1) + ' 项' : '答卷中未出现'}${e.stdNo && e.stdNo !== '—' ? '　·　对应标准步骤 ' + h(e.stdNo) : ''}</span></div>
    ${e.std ? `<div class="er"><i>正确要求</i><span>${h(e.std)}</span></div>` : ''}
    <div class="er"><i>为什么错</i><span>${h(e.why)}</span></div>
    <div class="er"><i>业务执行原因</i><span>${e.whyBiz ? h(e.whyBiz) : '<em class="pend">执行原因待业务补充（业务标注表该项为空，系统不自行生成）</em>'}</span></div>
    <div class="er"><i>制度依据</i><span>${cites.length ? cites.map(c => `<div class="cit"><b>${h(c.file)}</b> 第 ${h(c.no)} 条　${h(c.t)}<p>${h(c.body)}</p></div>`).join('') : '<em class="pend">' + RULE_NONE + '</em>'}</span></div>
    <div class="er"><i>建议写法</i><span class="fix">${h(e.fix)}</span></div>
  </div>`;
}
function tkResultHTML() {
  const r = TK.res, rec = TK.rec || {};
  const order = ['danger', 'cross', 'order', 'miss', 'level', 'text', 'extra'];
  const errs = r.errs.slice().sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || ((a.at == null ? 999 : a.at) - (b.at == null ? 999 : b.at)));
  const cnt = k => r.byKind[k] || 0;
  return `<div class="wrap tkwrap">
    <div class="ph"><h2>判卷结果</h2><span class="sub">${h(TICKET_META.task)}　标准票 ${h(TICKET_META.ver)}　用时 ${Math.floor((rec.sec || 0) / 60)} 分 ${(rec.sec || 0) % 60} 秒</span>
      <span class="r"><button class="btn s" id="tkagain">再练一次</button><button class="btn s g" id="tkexport">导出结果</button></span></div>
    <div class="tkres">
      <div class="card tkscore ${r.pass ? 'ok' : 'bad'}"><b>${r.score}</b><span>得分 / ${r.cfg.base}</span>
        <div class="verd">${r.fatal.length ? '整票不合格' : r.pass ? '合格' : '不合格'}</div>
        ${r.fatal.length ? `<div class="fat">${r.fatal.map(x => '<span>' + h(x) + '</span>').join('')}</div>` : ''}
        <div class="note">扣分合计 ${r.deduct}${r.fatal.length ? '　扣分前得分 ' + r.raw + '，整票不合格计 0 分' : ''}　及格线 ${r.cfg.pass}　分值为业务规则配置项</div></div>
      <div class="card tkstage"><div class="ch"><b>设备状态阶段</b><span class="note">后台先判断处于哪个阶段，再判断阶段内步骤是否合法</span></div>
        ${r.stages.map(s => `<div class="stg"><b>${h(s.n)}</b><div class="bar"><i style="width:${s.pct}%"></i></div><span class="mono">${s.done}/${s.n2}</span></div>`).join('')}
        <div class="kinds">${order.filter(k => cnt(k)).map(k => `<span class="tag ${ERR_KINDS[k].c === 'r' ? 'bad' : ERR_KINDS[k].c === 'o' ? 'w' : ''}">${ERR_KINDS[k].n} ${cnt(k)}</span>`).join('') || '<span class="tag ok">未发现错误</span>'}</div></div>
    </div>
    <div class="tabs2" id="tktabs"><span data-tktab="err" class="${TK.tab === 'err' ? 'on' : ''}">错误清单 ${r.errs.length}</span><span data-tktab="cmp" class="${TK.tab === 'cmp' ? 'on' : ''}">答卷与标准票对照</span><span data-tktab="rule" class="${TK.tab === 'rule' ? 'on' : ''}">命中的制度条款</span></div>
    <div id="tkbody">${TK.tab === 'cmp' ? tkCmpHTML() : TK.tab === 'rule' ? tkRuleHTML() : (errs.length ? errs.map(tkErrCard).join('') : '<div class="card"><div class="empty">这张票没有判出错误。换序组内的顺序调整按业务标注不判错。</div></div>')}</div>
  </div>`;
}
function tkCmpHTML() {
  const r = TK.res;
  return `<div class="card"><div class="ch"><b>答卷与标准票对照</b><span class="note">系统先认出每一句对应标准票哪一步，再判断它放在当前位置是否合法</span></div>
    <table class="tb tkcmp"><tr><th>学员项</th><th>学员填写</th><th>匹配到</th><th>标准步骤</th><th>阶段</th><th>换序组</th><th>文字要求</th></tr>
    ${r.match.map(x => `<tr class="${x.s ? '' : 'no'}"><td class="mono">${x.i + 1}</td><td>${h(x.row.t)}</td><td class="mono">${x.s ? x.s.no : '—'}</td><td class="note">${x.s ? h(x.s.t) : '未匹配到标准步骤'}</td><td>${x.s ? x.s.st : ''}</td><td>${x.s ? h(x.s.grp) + (x.s.swap === '否' ? '' : ' · 可换序') : ''}</td><td class="note">${x.s ? h(x.s.txt) : ''}</td></tr>`).join('')}</table>
    <div class="ch2"><b>漏写的标准步骤 ${TICKET.filter(s => r.pos[s.no] == null).length} 项</b></div>
    <div class="tkmiss">${TICKET.filter(s => r.pos[s.no] == null).map(s => `<span class="${s.miss === '整票不合格' ? 'bad' : ''}">${s.no} ${h(s.t.slice(0, 22))}${s.t.length > 22 ? '…' : ''}</span>`).join('') || '<span class="ok">无</span>'}</div></div>`;
}
function tkRuleHTML() {
  const ids = {}; TK.res.errs.forEach(e => (e.cites || []).forEach(c => c && (ids[c.id] = c)));
  const list = Object.values(ids).sort((a, b) => a.pri - b.pri);
  return `<div class="card"><div class="ch"><b>本次判卷命中的制度条款</b><span class="note">检索优先级：安规及释义 → 电气操作导则 → 其他制度文件；检索不到不编造</span></div>
    ${list.length ? list.map(c => `<div class="cit big"><b>${h(c.file)}</b> 第 ${h(c.no)} 条　${h(c.t)}<p>${h(c.body)}</p></div>`).join('') : '<div class="empty">本次没有命中制度条款</div>'}</div>`;
}

/* ---------- 挂载 ---------- */
function ticketAfter() {
  if (TK.on) {
    tkPaint();
    $('#tkadd').onclick = () => { tkRead(); TK.rows.push({ t: '', child: false }); tkPaint(); };
    $('#tksub').onclick = () => { tkRead(); TK.rows.push({ t: '', child: true }); tkPaint(); };
    $('#tksubmit').onclick = tkSubmit;
    return;
  }
  if (TK.res) {
    const a = $('#tkagain'); if (a) a.onclick = () => { TK.res = null; TK.rec = null; goPage('ticket'); };
    const x = $('#tkexport'); if (x) x.onclick = tkExport;
    return;
  }
  const b = $('#tkstart');
  if (b) b.onclick = () => {
    const m = ($$('input[name=tkmode]').find(i => i.checked) || {}).value || 'exam';
    tkStart(m, $('#tkstress') && $('#tkstress').checked);
  };
}
function tkExport() {
  const r = TK.res; if (!r) return;
  const lines = [['错误类型', '学员项', '标准步骤', '错误说明', '业务执行原因', '依据文件', '条款', '建议写法', '处理结果']];
  r.errs.forEach(e => lines.push([ERR_KINDS[e.kind].n, e.at != null ? e.at + 1 : '', e.stdNo, e.title + '｜' + e.why, e.whyBiz || '执行原因待业务补充',
  (e.cites || []).map(c => c && c.file).filter(Boolean).join(' / '), (e.cites || []).map(c => c && c.no).filter(Boolean).join(' / '), e.fix, e.fatalHit ? '整票不合格' : '扣 ' + (e.deduct || 0) + ' 分']));
  const csv = '﻿' + lines.map(r2 => r2.map(c => '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"').join(',')).join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = '操作票判卷结果_' + TICKET_META.no + '.csv'; a.click();
  toast('判卷结果已导出（CSV，可用 Excel 打开）', 'ok');
}
/* 事件委托：设备点击、行删除、页签、历史回看 */
document.addEventListener('click', e => {
  const d = e.target.closest('[data-dev]');
  if (d && $('#tkpop')) { const v = TK_DEV[d.dataset.dev]; if (v) { $('#tkpop').innerHTML = `<b>${h(v[0])}</b><span>${h(v[1])}</span>`; $('#tkpop').classList.add('on'); } }
  const del = e.target.closest('[data-tkdel]');
  if (del) { tkRead(); TK.rows.splice(+del.dataset.tkdel, 1); if (!TK.rows.length) TK.rows.push({ t: '', child: false }); tkPaint(); }
  const tab = e.target.closest('[data-tktab]');
  if (tab && TK.res) { TK.tab = tab.dataset.tktab; goPage('ticket'); }
  const op = e.target.closest('[data-tkopen]');
  if (op) { const rec = tkRecords()[+op.dataset.tkopen]; if (rec) { TK.res = tkJudge(rec.rows); TK.rec = rec; TK.tab = 'err'; goPage('ticket'); } }
});
