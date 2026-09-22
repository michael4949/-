/* ===== 场景 A · 操作票填写考核页 =====
   布局按总体方案 3.4：① 顶部 操作任务 / 考核说明 / 作答要求 ② 中部左 主接线图 ③ 中部右 运行方式说明与必要的空开压板编号 ④ 底部 操作票填写表格。
   场景只给完成写票必须知道的信息，不给标准步骤顺序、不给标准答案全文。 */

const TK = { on: false, rows: [], res: null, sec: 0, timer: null, stress: false, mode: 'exam', rec: null, tab: 'err', no: '', focus: -1, fb: {}, hint: null, hintLv: {}, imported: null };

/* ---------- 主接线图：先定部件标准画法，再整体绘制 ----------
   画法约定（与业务提供的手绘简图一致）：
   · 母线：粗实线。导线：细实线，在部件处断开，不从部件中间穿过。
   · 断路器（开关）：矩形串在回路中，两侧各一个接线端子圆；合位矩形填充，分位矩形空心。
   · 隔离开关（刀闸）：支点画空心圆；合位刀片与回路共线，分位刀片绕支点张开 40°，回路断开。
   · 接地刀闸：自回路垂直引出支线，刀片装在支线上，末端接地符号三条递减短线且垂直于支线。
   · 主变：两个相切圆。电压互感器：单圆。
   每个部件按运行方式的真实位置绘制，合位与分位画法对照见图例。 */
const TKG = {
  A: 40 * Math.PI / 180,                        /* 刀闸分闸张角 */
  BL: 26,                                       /* 刀片长度 */
  /* 隔离开关：竖直回路 dir='v'（支点在下），水平回路 dir='h'（支点在左） */
  ds(x, y, on, dir) {
    const B = TKG.BL, h = B / 2;
    if (dir === 'h') {
      const px = x - h, fx = x + h;
      const bx = px + B * Math.cos(TKG.A), by = y - B * Math.sin(TKG.A);
      return on
        ? `<line x1="${px}" y1="${y}" x2="${fx}" y2="${y}"/><line x1="${fx}" y1="${y - 5}" x2="${fx}" y2="${y + 5}"/><circle cx="${px}" cy="${y}" r="2.6"/>`
        : `<line x1="${px}" y1="${y}" x2="${bx.toFixed(1)}" y2="${by.toFixed(1)}"/><line x1="${fx}" y1="${y - 5}" x2="${fx}" y2="${y + 5}"/><circle cx="${px}" cy="${y}" r="2.6"/>`;
    }
    const py = y + h, fy = y - h;
    const bx = x + B * Math.sin(TKG.A), by = py - B * Math.cos(TKG.A);
    return on
      ? `<line x1="${x}" y1="${py}" x2="${x}" y2="${fy}"/><line x1="${x - 5}" y1="${fy}" x2="${x + 5}" y2="${fy}"/><circle cx="${x}" cy="${py}" r="2.6"/>`
      : `<line x1="${x}" y1="${py}" x2="${bx.toFixed(1)}" y2="${by.toFixed(1)}"/><line x1="${x - 5}" y1="${fy}" x2="${x + 5}" y2="${fy}"/><circle cx="${x}" cy="${py}" r="2.6"/>`;
  },
  /* 断路器：导线止于两端端子圆，不穿过矩形 */
  cb(x, y, on, dir) {
    const w = 19, hh = 15;
    const r = dir === 'h'
      ? `<rect x="${x - hh}" y="${y - w / 2}" width="${hh * 2}" height="${w}" rx="2" class="${on ? 'fill' : ''}"/><circle cx="${x - hh - 4}" cy="${y}" r="3.6"/><circle cx="${x + hh + 4}" cy="${y}" r="3.6"/>`
      : `<rect x="${x - w / 2}" y="${y - hh}" width="${w}" height="${hh * 2}" rx="2" class="${on ? 'fill' : ''}"/><circle cx="${x}" cy="${y - hh - 4}" r="3.6"/><circle cx="${x}" cy="${y + hh + 4}" r="3.6"/>`;
    return r;
  },
  cbSpan: 19,                                   /* 断路器占位半长（含端子圆） */
  dsSpan: 13,
  /* 接地刀闸：side 'l' 向左引出、'r' 向右引出、'd' 向下引出 */
  gnd(x, y, on, side) {
    const L = 48, B = 20;
    const sx = side === 'r' ? 1 : -1;
    if (side === 'd') {
      const py = y + 14, fy = y + L - 12;
      const bx = x + B * Math.sin(TKG.A), by = py + B * Math.cos(TKG.A);
      const blade = on ? `<line x1="${x}" y1="${py}" x2="${x}" y2="${fy}"/>` : `<line x1="${x}" y1="${py}" x2="${bx.toFixed(1)}" y2="${by.toFixed(1)}"/>`;
      return `<line x1="${x}" y1="${y}" x2="${x}" y2="${py}"/>${blade}<circle cx="${x}" cy="${py}" r="2.6"/>`
        + `<line x1="${x}" y1="${fy}" x2="${x}" y2="${y + L}"/>`
        + `<line class="gb" x1="${x - 11}" y1="${y + L}" x2="${x + 11}" y2="${y + L}"/><line class="gb" x1="${x - 7}" y1="${y + L + 5}" x2="${x + 7}" y2="${y + L + 5}"/><line class="gb" x1="${x - 3}" y1="${y + L + 10}" x2="${x + 3}" y2="${y + L + 10}"/>`;
    }
    const px = x + sx * 14, fx = x + sx * (L - 14), ex = x + sx * L, gy = y + 9;
    const bx = px + sx * B * Math.cos(TKG.A), by = y - B * Math.sin(TKG.A);
    const blade = on ? `<line x1="${px}" y1="${y}" x2="${fx}" y2="${y}"/>` : `<line x1="${px}" y1="${y}" x2="${bx.toFixed(1)}" y2="${by.toFixed(1)}"/>`;
    return `<line x1="${x}" y1="${y}" x2="${px}" y2="${y}"/>${blade}<circle cx="${px}" cy="${y}" r="2.6"/>`
      + `<line x1="${fx}" y1="${y}" x2="${ex}" y2="${y}"/><line x1="${ex}" y1="${y}" x2="${ex}" y2="${gy}"/>`
      + `<line class="gb" x1="${ex - 11}" y1="${gy}" x2="${ex + 11}" y2="${gy}"/><line class="gb" x1="${ex - 7}" y1="${gy + 5}" x2="${ex + 7}" y2="${gy + 5}"/><line class="gb" x1="${ex - 3}" y1="${gy + 10}" x2="${ex + 3}" y2="${gy + 10}"/>`;
  },
  tr(x, y) { return `<circle cx="${x}" cy="${y}" r="15"/><circle cx="${x}" cy="${y + 20}" r="15"/>`; },
  pt(x, y) { return `<circle cx="${x}" cy="${y}" r="11"/>`; }
};
/* 一条竖直间隔：从母线 y0 向上到 y1，items 自下而上排列 */
function tkBay(x, y0, y1, items, lblSide) {
  const out = []; let cur = y0;
  const side = lblSide || 'r';
  items.forEach(it => {
    const span = it.kind === 'cb' ? TKG.cbSpan : it.kind === 'ds' ? TKG.dsSpan : 0;
    if (it.kind === 'gnd') {
      out.push(`<g class="tkdev gnd ${it.on ? 'on' : ''}" data-dev="${it.id}">${TKG.gnd(x, it.y, it.on, side === 'r' ? 'l' : 'r')}` +
        `<text class="tkl ${side === 'r' ? 'e' : ''}" x="${x + (side === 'r' ? -74 : 74)}" y="${it.y + 3.5}">${h(it.n)}</text></g>`);
      return;
    }
    out.push(`<line class="tkw" x1="${x}" y1="${cur}" x2="${x}" y2="${it.y + span}"/>`);
    out.push(`<g class="tkdev ${it.on ? 'on' : 'off'}" data-dev="${it.id}">${it.kind === 'cb' ? TKG.cb(x, it.y, it.on, 'v') : TKG.ds(x, it.y, it.on, 'v')}` +
      `<text class="tkl" x="${x + (side === 'r' ? 16 : -16)}" ${side === 'r' ? '' : 'text-anchor="end"'} y="${it.y + 3.5}">${h(it.n)}</text></g>`);
    cur = it.y - span;
  });
  out.push(`<line class="tkw" x1="${x}" y1="${cur}" x2="${x}" y2="${y1}"/>`);
  return out.join('');
}
function tkBusSVG() {
  const BUS = 300, TOP = 66, LOW = 418;
  /* 考核Ⅰ线1161 间隔：运行方式 开关与两把刀闸在合位，三把地刀在分位 */
  const bay1 = tkBay(250, BUS, TOP + 16, [
    { y: 274, kind: 'ds', id: '11611', n: '11611 · 1M侧刀闸', on: true },
    { y: 246, kind: 'gnd', id: '1161B0', n: '1161B0 · 开关侧地刀', on: false },
    { y: 214, kind: 'cb', id: '1161', n: '1161 开关', on: true },
    { y: 180, kind: 'gnd', id: '1161C0', n: '1161C0 · CT侧地刀', on: false },
    { y: 150, kind: 'ds', id: '11614', n: '11614 · 线路侧刀闸', on: true },
    { y: 118, kind: 'gnd', id: '116140', n: '116140 · 线路侧地刀', on: false }
  ]);
  const bayS = (x, pre) => tkBay(x, BUS, TOP + 16, [
    { y: 270, kind: 'ds', id: pre + '1', n: pre + '1', on: true },
    { y: 222, kind: 'cb', id: pre, n: pre, on: true },
    { y: 172, kind: 'ds', id: pre + '4', n: pre + '4', on: true }
  ]);
  const out = (x, nm) => `<path class="tkw" d="M${x - 8} ${TOP + 16} L${x} ${TOP} L${x + 8} ${TOP + 16} Z"/><text class="tkn" x="${x}" y="${TOP - 8}" text-anchor="middle">${h(nm)}</text>`;
  const trBay = (x, nm, no) => `<line class="tkw" x1="${x}" y1="${BUS}" x2="${x}" y2="${326 - TKG.dsSpan}"/>` +
    `<g class="tkdev on" data-dev="${no}">${TKG.ds(x, 326, true, 'v')}<text class="tkl" x="${x + 15}" y="${329.5}">${no}</text></g>` +
    `<line class="tkw" x1="${x}" y1="${326 + TKG.dsSpan}" x2="${x}" y2="348"/><g class="tkdev">${TKG.tr(x, 363)}</g>` +
    `<text class="tkn" x="${x + 22}" y="${376}">${h(nm)}</text><line class="tkw" x1="${x}" y1="398" x2="${x}" y2="${LOW}"/>`;
  const ptBay = (x, nm) => `<line class="tkw" x1="${x}" y1="${BUS}" x2="${x}" y2="${330}"/><g class="tkdev">${TKG.pt(x, 341)}</g><text class="tkn" x="${x + 16}" y="${345}">${h(nm)}</text>`;
  return `<svg viewBox="0 0 980 452" class="tkbus" xmlns="http://www.w3.org/2000/svg">
    <text class="tkt" x="12" y="18">110kV 仿真站主接线图（110kV 为 GIS 设备）　部件画法见下方图例，图中状态为当前运行方式</text>
    <line class="tkbus1" x1="58" y1="${BUS}" x2="462" y2="${BUS}"/><text class="tkn b" x="58" y="${BUS - 9}">110kV 1M</text>
    <line class="tkbus1" x1="518" y1="${BUS}" x2="936" y2="${BUS}"/><text class="tkn b" x="936" y="${BUS - 9}" text-anchor="end">110kV 2M</text>
    <g class="tkdev on" data-dev="1012">
      <line class="tkw" x1="462" y1="${BUS}" x2="${490 - TKG.cbSpan}" y2="${BUS}"/>
      <line class="tkw" x1="${490 + TKG.cbSpan}" y1="${BUS}" x2="518" y2="${BUS}"/>
      ${TKG.cb(490, BUS, true, 'h')}
      <text class="tkl" x="490" y="${BUS + 32}" text-anchor="middle">分段1012</text></g>
    ${bay1}${out(250, '考核Ⅰ线')}
    ${bayS(640, '1162')}${out(640, '考核Ⅱ线')}
    ${bayS(840, '1163')}${out(840, '培训三线')}
    ${ptBay(100, '111PT')}${ptBay(900, '112PT')}
    ${trBay(160, '#1主变 63MVA', '1101')}${trBay(580, '#2主变 63MVA', '1102')}${trBay(760, '#3主变 63MVA', '1103')}
    <line class="tkbus1" x1="110" y1="${LOW}" x2="230" y2="${LOW}"/><text class="tkn" x="110" y="${LOW + 17}">10kV 1M</text>
    <line class="tkbus1" x1="520" y1="${LOW}" x2="650" y2="${LOW}"/><text class="tkn" x="520" y="${LOW + 17}">10kV 2AM</text>
    <line class="tkbus1" x1="700" y1="${LOW}" x2="830" y2="${LOW}"/><text class="tkn" x="700" y="${LOW + 17}">10kV 3M</text>
  </svg>`;
}
/* 部件标准画法图例：合位 / 分位对照 */
function tkLegendSVG() {
  const cell = (cx, label, body) => `<g class="tkdev">${body}</g><text class="tkl" x="${cx}" y="82" text-anchor="middle">${h(label)}</text>`;
  return `<svg viewBox="0 0 620 96" class="tkbus tklg" xmlns="http://www.w3.org/2000/svg">
    ${cell(46, '刀闸 合位', `<line class="tkw" x1="14" y1="34" x2="${46 - TKG.dsSpan}" y2="34"/><line class="tkw" x1="${46 + TKG.dsSpan}" y1="34" x2="78" y2="34"/>${TKG.ds(46, 34, true, 'h')}`)}
    ${cell(140, '刀闸 分位', `<line class="tkw" x1="108" y1="34" x2="${140 - TKG.dsSpan}" y2="34"/><line class="tkw" x1="${140 + TKG.dsSpan}" y1="34" x2="172" y2="34"/>${TKG.ds(140, 34, false, 'h')}`)}
    ${cell(236, '开关 合位', `<line class="tkw" x1="200" y1="34" x2="${236 - TKG.cbSpan}" y2="34"/><line class="tkw" x1="${236 + TKG.cbSpan}" y1="34" x2="272" y2="34"/>${TKG.cb(236, 34, true, 'h')}`)}
    ${cell(332, '开关 分位', `<line class="tkw" x1="296" y1="34" x2="${332 - TKG.cbSpan}" y2="34"/><line class="tkw" x1="${332 + TKG.cbSpan}" y1="34" x2="368" y2="34"/>${TKG.cb(332, 34, false, 'h')}`)}
    ${cell(420, '地刀 合位', `<line class="tkw" x1="396" y1="14" x2="444" y2="14"/><g class="gnd">${TKG.gnd(420, 14, true, 'd')}</g>`)}
    ${cell(506, '地刀 分位', `<line class="tkw" x1="482" y1="14" x2="530" y2="14"/><g class="gnd">${TKG.gnd(506, 14, false, 'd')}</g>`)}
    ${cell(578, '主变', `${TKG.tr(578, 22)}`)}
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
    <div class="ph"><h2>操作票填写</h2><span class="sub">A 类 · 常态业务　${h(TICKET_META.station)}　标准票 ${h(TICKET_META.ver)}　票号由考核人员填写</span></div>
    <div class="card tkintro">
      <div class="tktask"><b>操作任务</b><p>${h(TICKET_META.task)}</p></div>
      <div class="tkask"><b>作答要求</b><ol>${TICKET_META.ask.map(x => `<li>${h(x)}</li>`).join('')}<li>系统给出工作任务与现场资料，由你自行判断停电范围并逐项填写操作票。</li><li>提交后自动判卷：漏项、错项、顺序错误、阶段越界、危险操作分别判定，并给出依据条款与正确写法。</li></ol></div>
      <div class="tkmodes">
        <label class="tkmd"><input type="radio" name="tkmode" value="teach" checked><b>训练模式</b><span>边写边判：每行当场比对标准票、即时纠错、三级提示、阶段进度，可反复改</span></label>
        <label class="tkmd"><input type="radio" name="tkmode" value="exam"><b>考核模式</b><span>关闭全部提示与进度，计时、一次提交、提交后才给结果</span></label>
        <label class="tkmd stress"><input type="checkbox" id="tkstress"><b>压力模式</b><span>限时 20 分钟 · 中途有调度来电打断</span></label>
      </div>
      <div class="tkgo"><button class="btn pri" id="tkstart">开始填写</button><span class="note">共 ${TICKET.length} 行标准票（48 项，含子项），分三个设备状态阶段</span></div>
    </div>
    <div class="card"><div class="ch"><b>判定逻辑自测</b><span class="note">六种典型答卷一次跑完，用于核对书写正确性的判定是否准确，不用手工录整张票</span>
      <span class="r"><button class="btn s" id="tkself">运行自测</button></span></div>
      <div id="tkselfout" class="tkself"><div class="empty">点「运行自测」：按标准票填完、组内换序、先拉母线侧刀闸、漏写四项、并项且缺双重名称、未验明无电压即合地刀，六种答卷的判定结果并排列出</div></div>
    </div>
    <div class="card"><div class="ch"><b>我的演练档案</b><span class="note">每次演练一份档案，永久保存，可回看全过程</span></div>
      ${recs.length ? `<table class="tb tkrecs"><tr><th>时间</th><th>票号</th><th>模式</th><th>用时</th><th>得分</th><th>结论</th><th>错误</th><th></th></tr>${recs.map((r, i) => `<tr><td>${h(r.d)}</td><td class="mono">${h(r.no || '未填')}</td><td>${h(r.mode)}</td><td>${Math.floor(r.sec / 60)}分${r.sec % 60}秒</td><td class="mono">${r.score}</td><td>${r.pass ? '<span class="tag ok">合格</span>' : r.fatal && r.fatal.length ? '<span class="tag bad">整票不合格</span>' : '<span class="tag bad">不合格</span>'}</td><td class="note">${h((r.sum || []).join('、') || '无')}</td><td><button class="btn s" data-tkopen="${i}">回看</button></td></tr>`).join('')}</table>` : '<div class="empty">还没有演练记录，点上面「开始填写」</div>'}
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
      <div class="card tkleft"><div class="ch"><b>主接线图</b><span class="note">点设备看名称、编号与当前状态</span></div>${tkBusSVG()}<div class="tkpop" id="tkpop"></div>
        <div class="ch2"><b>部件标准画法</b><span class="note">合位与分位对照</span></div>${tkLegendSVG()}</div>
      <div class="card tkright"><div class="ch"><b>运行方式与现场资料</b></div>
        <div class="tkrun">${TICKET_META.runway.map(x => `<p>${h(x)}</p>`).join('')}<p class="tknote">${h(TICKET_META.note)}</p></div>
        <div class="ch2"><b>必要的空气开关与压板编号</b></div>
        ${TICKET_META.gear.map(g => `<div class="tkgear"><b>${h(g.p)}</b><span class="note">${h(g.m)}</span><table class="tb s"><tr><th>编号</th><th>名称</th><th>正常方式</th></tr>${g.rows.map(r => `<tr><td class="mono">${h(r[0])}</td><td>${h(r[1])}</td><td>${h(r[2])}</td></tr>`).join('')}</table></div>`).join('')}
      </div>
    </div>
    <div class="card tkform">
      <div class="ch"><b>现场电气操作票</b><span class="note">一项一个输入框，回车新增一行；子项用「加子项」，加在当前主项下，编为 x.1、x.2</span>
        <span class="r"><label class="btn s g tkup">导入操作票<input type="file" id="tkfile" accept=".docx,.xlsx,.txt" class="tkfile"></label><button class="btn s" id="tkadd">加一项</button><button class="btn s" id="tksub">加子项</button>${TK.mode === 'teach' ? '<button class="btn s g" id="tkhint">要一条提示</button>' : ''}<button class="btn pri" id="tksubmit">提交判卷</button></span></div>
      <div class="tkhead">
        <label>编号<input id="tkno" value="${h(TK.no)}" placeholder="由考核人员填写"></label>
        <span class="note">票号规则 YYMMNNN：两位年份 + 两位月份 + 当月流水号，例如 2609001</span>
        <span class="note r">${TK.imported ? '已导入：' + h(TK.imported) : '可导入 Word / Excel 操作票，按模板解析后填入下表'}</span>
      </div>
      ${TK.mode === 'teach' ? '<div class="tkstep" id="tkstep"></div>' : '<div class="tkexamtip">考核模式：不提供行内提示、阶段进度与教练提示，提交后一次性给出判卷结果。</div>'}
      <div id="tkrows"></div>
      <div class="tkfoot"><span>操作人：不填写</span><span>监护人：不填写</span><span>值班负责人：不填写</span></div>
    </div>
  </div>`;
}

/* ---------- 作答行：主项 / 子项只用编号区分，Enter 增行，加子项落在当前主项下 ---------- */
function tkRenum() {
  let main = 0, sub = 0;
  TK.rows.forEach(r => {
    if (r.child) { sub++; r.no = main + '.' + sub; r.parent = String(main); }
    else { main++; sub = 0; r.no = String(main); r.parent = null; }
  });
}
function tkMainOf(i) { let j = Math.min(i, TK.rows.length - 1); while (j >= 0 && TK.rows[j].child) j--; return j; }
function tkFocus(k) { const e = $$('.tkin').find(x => +x.dataset.i === k); if (e) { e.focus(); e.scrollIntoView({ block: 'nearest' }); } }
function tkInsert(after, child) { const k = (after == null ? TK.rows.length - 1 : after) + 1; TK.rows.splice(k, 0, { t: '', child: !!child }); TK.focus = k; tkPaint(); tkFocus(k); }
function tkEnterAt(i) {
  const r = TK.rows[i];
  if (!r) return tkInsert(null, false);
  if (r.child) return tkInsert(i, true);
  let k = i; while (k + 1 < TK.rows.length && TK.rows[k + 1].child) k++;
  return tkInsert(k, false);
}
function tkAddChild() {
  tkRead();
  const m = tkMainOf(TK.focus >= 0 ? TK.focus : TK.rows.length - 1);
  if (m < 0) { toast('先填一个主项，再给它加子项', 'bad'); return; }
  let k = m + 1; while (k < TK.rows.length && TK.rows[k].child) k++;
  TK.rows.splice(k, 0, { t: '', child: true }); TK.focus = k; tkPaint(); tkFocus(k);
}
function tkRowsHTML() {
  tkRenum();
  const teach = TK.mode === 'teach';
  return `<table class="tb tkt"><tr><th style="width:74px">顺序</th><th>操 作 项 目</th><th style="width:80px">操作√</th><th style="width:56px"></th></tr>
    ${TK.rows.map((r, i) => { const fb = teach ? TK.fb[i] : null; return `<tr class="${r.child ? 'sub' : ''}${fb ? ' fb' + fb.cls : ''}" data-row="${i}"><td class="mono">${r.no}</td>
      <td><input class="tkin" data-i="${i}" value="${h(r.t)}" placeholder="${r.child ? '子项内容，如：断开11611刀闸控制电源空气开关' : '填写一个操作项目，一栏只写一个动词；回车新增一行'}">${fb ? `<div class="tkfb ${fb.cls}">${fb.html}</div>` : ''}</td>
      <td class="tkck"><i></i></td>
      <td><button class="btn s g" data-tkdel="${i}">删</button></td></tr>`; }).join('')}</table>`;
}
function tkPaint() { const host = $('#tkrows'); if (host) host.innerHTML = tkRowsHTML(); const st = $('#tkstep'); if (st) st.innerHTML = tkStepHTML(); tkBind(); }
function tkRead() { $$('.tkin').forEach(inp => { const i = +inp.dataset.i; if (TK.rows[i]) TK.rows[i].t = inp.value; }); const n = $('#tkno'); if (n) TK.no = n.value.trim(); }

/* ---------- 训练模式：边写边判 · 即时纠错 · 三级提示 · 阶段进度 ---------- */
function tkMatchMap() {
  const m = {};
  TK.rows.forEach((r, i) => {
    const t = (r.t || '').trim(); if (!t) return;
    const c = TICKET.map(s => ({ s, sc: tkScore(t, s) })).sort((a, b) => b.sc - a.sc)[0];
    if (c && c.sc >= 42 && m[c.s.no] == null) m[c.s.no] = i;
  });
  return m;
}
function tkCheckAll() {
  TK.fb = {};
  if (TK.mode !== 'teach') return;
  const m = tkMatchMap();
  const hitD = TICKET_DANGER.filter(d => d.id !== 'd4').filter(d => { try { return d.hit(m); } catch (e) { return false; } });
  TK.rows.forEach((r, i) => {
    const t = (r.t || '').trim(); if (!t) return;
    const c = TICKET.map(s => ({ s, sc: tkScore(t, s) })).sort((a, b) => b.sc - a.sc)[0];
    if (!c || c.sc < 42) { TK.fb[i] = { cls: 'w', html: '没认出这一句对应标准票的哪一步。看看是不是一栏写了两个动作，或者设备双重名称没写全。' }; return; }
    const s = c.s;
    const d = hitD.find(x => (({ d1: ['28'], d2: ['15', '18'], d3: ['28', '38', '41'] }[x.id]) || []).includes(s.no) && m[s.no] === i);
    if (d) { TK.fb[i] = { cls: 'r', html: '<b>危险操作 · ' + h(d.n) + '</b>' + h(d.why.split('。')[0]) + '。这一步放在这个位置，整票会判不合格。' }; return; }
    const tx = tkText({ t: t }, s);
    if (tx) { TK.fb[i] = { cls: 'w', html: '对应标准第 ' + s.no + ' 项，但' + h(tx.tip) + '。建议写法：' + h(s.t) }; return; }
    TK.fb[i] = { cls: 'g', html: '对应标准第 ' + s.no + ' 项 · ' + h((TICKET_META.stages.find(x => x.k === s.st) || {}).n || '') + (s.swap !== '否' ? ' · 组内可换序' : '') };
  });
}
function tkStepHTML() {
  if (TK.mode !== 'teach') return '';
  const m = tkMatchMap();
  const strip = TICKET_META.stages.map(st => {
    const all = TICKET.filter(x => x.st === st.k);
    const done = all.filter(x => m[x.no] != null).length;
    return `<div class="tkstg ${done === all.length ? 'ok' : done ? 'go' : ''}"><b>${h(st.n)}</b><div class="bar"><i style="width:${Math.round(done / all.length * 100)}%"></i></div><span class="mono">${done}/${all.length}</span><em>${h(st.watch)}</em></div>`;
  }).join('');
  const bad = Object.keys(TK.fb).filter(k => TK.fb[k].cls === 'r').length, warn = Object.keys(TK.fb).filter(k => TK.fb[k].cls === 'w').length;
  return `<div class="tkstgs">${strip}</div>
    <div class="tkstat"><span class="tag ${bad ? 'bad' : warn ? 'w' : 'ok'}">${bad ? '危险操作 ' + bad + ' 处' : warn ? '待改 ' + warn + ' 处' : '当前无问题'}</span>
      <span class="note">训练模式：每填完一行当场对标准票比对；提示分三级，不直接给整张标准票。</span></div>
    ${TK.hint ? `<div class="tkhintbox"><b>提示 ${TK.hint.lv}/3</b>${h(TK.hint.msg)}</div>` : ''}`;
}
function tkPaintFB() {
  if (TK.mode !== 'teach') return;
  tkCheckAll();
  $$('.tkt tr[data-row]').forEach(tr => {
    const i = +tr.dataset.row, fb = TK.fb[i], r = TK.rows[i];
    tr.className = ((r && r.child) ? 'sub' : '') + (fb ? ' fb' + fb.cls : '');
    let d = tr.querySelector('.tkfb');
    if (!fb) { if (d) d.remove(); return; }
    if (!d) { d = document.createElement('div'); const td = tr.querySelector('td:nth-child(2)'); if (!td) return; td.appendChild(d); }
    d.className = 'tkfb ' + fb.cls; d.innerHTML = fb.html;
  });
  const st = $('#tkstep'); if (st) st.innerHTML = tkStepHTML();
}
function tkHint() {
  if (TK.mode !== 'teach') return;
  tkRead();
  const m = tkMatchMap();
  const next = TICKET.find(s => m[s.no] == null);
  if (!next) { TK.hint = { lv: 3, msg: '标准票的步骤都已经覆盖到了，检查一下顺序和文字规范就可以提交。' }; tkPaint(); return; }
  TK.hintLv[next.no] = Math.min(3, (TK.hintLv[next.no] || 0) + 1);
  const lv = TK.hintLv[next.no];
  const st = TICKET_META.stages.find(x => x.k === next.st) || {};
  const msg = lv === 1 ? '现在缺的这一步在' + st.n + '，这个阶段要盯的是：' + st.watch + '。'
    : lv === 2 ? '这一步涉及' + next.k.slice(0, 3).join('、') + (next.v ? '，动作是「' + next.v + '」' : '') + '，文字要求是「' + next.txt + '」。'
      : '标准写法：' + next.t;
  TK.hint = { no: next.no, lv, msg };
  tkPaint();
}

function tkStart(mode, stress) {
  TK.on = true; TK.res = null; TK.mode = mode || 'exam'; TK.stress = !!stress; TK.sec = 0; TK.no = ''; TK.focus = -1; TK.fb = {}; TK.hint = null; TK.hintLv = {}; TK.imported = null;
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
  if (!TK.no) { toast('票号由考核人员填写，请先填编号', 'bad'); const n = $('#tkno'); if (n) n.focus(); return; }
  if (TK.timer) { clearInterval(TK.timer); TK.timer = null; }
  const res = tkJudge(rows);
  TK.res = res; TK.on = false;
  const sum = Object.keys(res.byKind).map(k => ERR_KINDS[k].n + ' ' + res.byKind[k]);
  TK.rec = { d: stamp(), no: TK.no, mode: TK.mode === 'exam' ? '考核模式' : '训练模式', stress: TK.stress, sec: TK.sec, score: res.score, pass: res.pass, fatal: res.fatal, sum, rows, ver: TICKET_META.ver };
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
    <div class="ph"><h2>判卷结果</h2><span class="sub">票号 ${h(rec.no || TK.no || '未填')}　${h(TICKET_META.task)}　标准票 ${h(TICKET_META.ver)}　用时 ${Math.floor((rec.sec || 0) / 60)} 分 ${(rec.sec || 0) % 60} 秒</span>
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

/* ---------- 上传导入：Word / Excel 操作票，按既定模板解析（zip + DecompressionStream，纯浏览器离线） ---------- */
const TKUP = {
  async zipEntries(buf) {
    const dv = new DataView(buf), u8 = new Uint8Array(buf); let eocd = -1;
    for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 66000); i--) { if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; } }
    if (eocd < 0) throw new Error('不是有效的 Word / Excel 文件');
    const n = dv.getUint16(eocd + 10, true); let off = dv.getUint32(eocd + 16, true); const out = {}; const td = new TextDecoder();
    for (let i = 0; i < n; i++) {
      if (dv.getUint32(off, true) !== 0x02014b50) break;
      const method = dv.getUint16(off + 10, true), csize = dv.getUint32(off + 20, true), nlen = dv.getUint16(off + 28, true), elen = dv.getUint16(off + 30, true), clen = dv.getUint16(off + 32, true), loc = dv.getUint32(off + 42, true);
      out[td.decode(u8.subarray(off + 46, off + 46 + nlen))] = { method, csize, loc }; off += 46 + nlen + elen + clen;
    }
    return { entries: out, u8, dv };
  },
  async zipRead(z, name) {
    const e = z.entries[name]; if (!e) return null;
    const nlen = z.dv.getUint16(e.loc + 26, true), elen = z.dv.getUint16(e.loc + 28, true);
    const data = z.u8.subarray(e.loc + 30 + nlen + elen, e.loc + 30 + nlen + elen + e.csize);
    if (e.method === 0) return new TextDecoder().decode(data);
    const ds = new DecompressionStream('deflate-raw'); const w = ds.writable.getWriter(); w.write(data); w.close();
    return new TextDecoder().decode(await new Response(ds.readable).arrayBuffer());
  },
  un(t) { return t.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'"); },
  async docx(file) {
    const z = await this.zipEntries(await file.arrayBuffer());
    const xml = await this.zipRead(z, 'word/document.xml'); if (!xml) throw new Error('Word 文档里没有正文');
    const paras = (xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || []).map(p => (p.match(/<w:t[^>]*>[^<]*<\/w:t>/g) || []).map(t => t.replace(/<[^>]+>/g, '')).join(''));
    return paras.map(x => this.un(x));
  },
  async xlsx(file) {
    const z = await this.zipEntries(await file.arrayBuffer());
    const ss = await this.zipRead(z, 'xl/sharedStrings.xml');
    const strs = ss ? (ss.match(/<si>[\s\S]*?<\/si>/g) || []).map(si => (si.match(/<t[^>]*>[^<]*<\/t>/g) || []).map(t => t.replace(/<[^>]+>/g, '')).join('')) : [];
    const sheet = await this.zipRead(z, 'xl/worksheets/sheet1.xml'); if (!sheet) throw new Error('Excel 里没有工作表');
    return (sheet.match(/<row[ >][\s\S]*?<\/row>/g) || []).map(r => (r.match(/<c [^>]*?(?:\/>|>[\s\S]*?<\/c>)/g) || []).map(c => {
      const t = (c.match(/ t="([^"]+)"/) || [])[1], v = (c.match(/<v>([^<]*)<\/v>/) || [])[1], is = (c.match(/<is><t[^>]*>([^<]*)<\/t>/) || [])[1];
      if (is != null) return this.un(is); if (v == null) return ''; return t === 's' ? this.un(strs[+v] || '') : v;
    }));
  },
  /* Word 模板：第一行操作任务，空一行后每行一项，子项行首标 $
     Excel 模板：两列（序号、操作步骤），序号带小数点的是子项 */
  parseWord(paras) {
    const skip = /^#|填写操作任务|例子如下|作为参考|每一步占一行|标记标出|空一行接/;
    const lines = paras.map(x => (x || '').trim()).filter(x => !skip.test(x));
    let i = 0; while (i < lines.length && !lines[i]) i++;
    if (i >= lines.length) throw new Error('Word 文档是空的');
    const task = lines[i]; const rows = []; const bad = [];
    for (let j = i + 1; j < lines.length; j++) {
      let t = lines[j]; if (!t) continue;
      const child = t.charAt(0) === '$' || t.charAt(0) === '＄';
      t = t.replace(/^[$＄]\s*/, '').replace(/^\d+(\.\d+)?[、.．\s]\s*/, '').trim();
      if (!t) { bad.push(j + 1); continue; }
      if (child && !rows.length) { bad.push(j + 1); continue; }
      rows.push({ t, child });
    }
    return { task, rows, bad };
  },
  parseExcel(cells) {
    const rows = [], bad = [];
    cells.forEach((c, j) => {
      const no = String(c[0] == null ? '' : c[0]).trim(), t = String(c[1] == null ? '' : c[1]).trim();
      if (!no && !t) return;
      if (/^序号$/.test(no) || /^操作步骤$/.test(t)) return;
      if (!/^\d+(\.\d+)?$/.test(no)) { bad.push(j + 1); return; }
      if (!t) { bad.push(j + 1); return; }
      const child = no.includes('.');
      if (child && !rows.length) { bad.push(j + 1); return; }
      rows.push({ t, child });
    });
    return { task: '', rows, bad };
  },
  async load(file) {
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (ext === 'docx') return this.parseWord(await this.docx(file));
    if (ext === 'xlsx') return this.parseExcel(await this.xlsx(file));
    if (ext === 'txt') return this.parseWord((await file.text()).split(/\r?\n/));
    throw new Error('只支持 Word（.docx）、Excel（.xlsx）与纯文本（.txt）');
  }
};
async function tkImport(file) {
  try {
    const r = await TKUP.load(file);
    if (!r.rows.length) throw new Error('按模板没解析到操作步骤，请对照《操作票上传模板》检查格式');
    tkRead();
    TK.rows = r.rows.map(x => ({ t: x.t, child: x.child }));
    const alias = r.rows.some(x => /1892/.test(x.t));
    const taskDiff = r.task && r.task.replace(/\s/g, '') !== TICKET_META.task.replace(/\s/g, '');
    TK.imported = file.name + '（' + r.rows.length + ' 行' + (r.bad.length ? '，第 ' + r.bad.slice(0, 5).join('、') + ' 行不符合模板已跳过' : '') + '）'
      + (taskDiff ? '　文件里的操作任务是「' + r.task + '」，本场考核任务为「' + TICKET_META.task + '」' : '')
      + (alias ? '　文件中出现「考核Ⅱ线1892」，与主接线图的 1162 编号不一致，已按同一设备处理，该处编号口径待业务确认' : '');
    TK.focus = -1; TK.hint = null;
    tkCheckAll(); tkPaint();
    const hd = $('#tkhead2'); if (hd) hd.textContent = TK.imported;
    goPage('ticket');
    toast('已按模板导入 ' + r.rows.length + ' 行' + (r.bad.length ? '，跳过 ' + r.bad.length + ' 行' : ''), r.bad.length ? 'w' : 'ok');
  } catch (e) { toast('导入失败：' + (e && e.message ? e.message : e), 'bad'); }
}

/* ---------- 挂载 ---------- */
function tkBind() {
  $$('.tkin').forEach(inp => {
    inp.onfocus = () => { TK.focus = +inp.dataset.i; };
    inp.onkeydown = ev => {
      if (ev.key !== 'Enter') return;
      ev.preventDefault(); tkRead(); if (TK.mode === 'teach') tkCheckAll();
      tkEnterAt(+inp.dataset.i);
    };
    inp.onblur = () => { tkRead(); tkPaintFB(); };
  });
}
function ticketAfter() {
  if (TK.on) {
    tkPaint();
    const f = $('#tkfile'); if (f) f.onchange = e => { const x = e.target.files[0]; if (x) tkImport(x); e.target.value = ''; };
    $('#tkadd').onclick = () => { tkRead(); tkInsert(TK.focus >= 0 ? TK.focus : null, false); };
    $('#tksub').onclick = tkAddChild;
    const hb = $('#tkhint'); if (hb) hb.onclick = tkHint;
    $('#tksubmit').onclick = tkSubmit;
    const no = $('#tkno'); if (no) no.oninput = () => { TK.no = no.value.trim(); };
    return;
  }
  if (TK.res) {
    const a = $('#tkagain'); if (a) a.onclick = () => { TK.res = null; TK.rec = null; goPage('ticket'); };
    const x = $('#tkexport'); if (x) x.onclick = tkExport;
    return;
  }
  const sf = $('#tkself'); if (sf) sf.onclick = () => { const o = $('#tkselfout'); if (o) o.innerHTML = tkSelfTest(); toast('自测完成，六种答卷的判定结果已列出', 'ok'); };
  const b = $('#tkstart');
  if (b) b.onclick = () => {
    const m = ($$('input[name=tkmode]').find(i => i.checked) || {}).value || 'exam';
    tkStart(m, $('#tkstress') && $('#tkstress').checked);
  };
}

const TK_SELF = [
  ['ok', '按标准票填完', '100 分 · 无错误'],
  ['swap', '组内换序（7/8、17.1/17.2、32/33 互换）', '100 分 · 业务确认可换序，不判错'],
  ['order', '先拉母线侧刀闸', '仅 1 条顺序错误，不连锁'],
  ['miss', '漏写 4 项（11、19、31.3、47）', '4 条漏项，不产生连锁顺序错误'],
  ['text', '并项 + 缺双重名称', '1 条文字不规范 + 1 条漏项'],
  ['danger', '未验明无电压即合地刀', '整票不合格计 0 分，扣分前得分仍展示']
];
function tkSelfTest() {
  const out = TK_SELF.map(([k, n, exp]) => {
    const r = tkJudge(tkAuto(k));
    const kinds = Object.keys(r.byKind).map(x => ERR_KINDS[x].n + ' ' + r.byKind[x]).join('、') || '无';
    return { k, n, exp, score: r.score, raw: r.raw, fatal: r.fatal, errs: r.errs.length, kinds, pass: r.pass };
  });
  return `<table class="tb tkselft"><tr><th>答卷</th><th>得分</th><th>结论</th><th>错误</th><th>判出的错误类型</th><th>业务预期</th></tr>
    ${out.map(x => `<tr><td>${h(x.n)}</td><td class="mono">${x.score}${x.fatal.length ? '<span class="note">（扣分前 ' + x.raw + '）</span>' : ''}</td>
      <td>${x.fatal.length ? '<span class="tag bad">整票不合格</span>' : x.pass ? '<span class="tag ok">合格</span>' : '<span class="tag w">不合格</span>'}</td>
      <td class="mono">${x.errs}</td><td class="note">${h(x.kinds)}</td><td class="note">${h(x.exp)}</td></tr>`).join('')}</table>
    <div class="note" style="margin-top:6px">六种答卷由标准票按业务标注自动变形生成，可与右列的业务预期逐行对照；扣分值为配置项，改了配置这张表会跟着变。</div>`;
}
function tkExport() {
  const r = TK.res; if (!r) return;
  const lines = [['错误类型', '学员项', '标准步骤', '错误说明', '业务执行原因', '依据文件', '条款', '建议写法', '处理结果']];
  r.errs.forEach(e => lines.push([ERR_KINDS[e.kind].n, e.at != null ? e.at + 1 : '', e.stdNo, e.title + '｜' + e.why, e.whyBiz || '执行原因待业务补充',
  (e.cites || []).map(c => c && c.file).filter(Boolean).join(' / '), (e.cites || []).map(c => c && c.no).filter(Boolean).join(' / '), e.fix, e.fatalHit ? '整票不合格' : '扣 ' + (e.deduct || 0) + ' 分']));
  const csv = '﻿' + lines.map(r2 => r2.map(c => '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"').join(',')).join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = '操作票判卷结果_' + (TK.rec && TK.rec.no ? TK.rec.no : TICKET_META.ver) + '.csv'; a.click();
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
