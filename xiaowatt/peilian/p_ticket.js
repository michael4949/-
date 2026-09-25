/* ===== 场景 A · 操作票填写考核页 =====
   布局：① 顶部 操作任务 / 作答要求 ② 中部左 主接线图 ③ 中部右 运行方式与屏柜附表（空开、压板、把手） ④ 底部 操作票填写表格。
   场景只给完成写票必须知道的信息，不给标准步骤顺序、不给标准答案全文。 */

const TK = { on: false, rows: [], res: null, sec: 0, timer: null, stress: false, mode: 'exam', rec: null, tab: 'err', no: '', focus: -1, fb: {}, hint: null, hintLv: {}, imported: null };

/* ---------- 主接线图：先定部件标准画法，再整体绘制 ----------
   画法约定：
   · 母线：粗实线。导线：细实线，在部件处断开，不从部件中间穿过。
   · 断路器（开关）：矩形串在回路中，两侧各一个接线端子圆；合位矩形填充，分位矩形空心。
   · 小车开关：断路器两端各加一对插头符号，表示手车触头。
   · 隔离开关（刀闸）：支点画空心圆；合位刀片与回路共线，分位刀片绕支点张开 40°，回路断开。
   · 接地刀闸：自回路垂直引出支线，刀片装在支线上，末端接地符号三条递减短线且垂直于支线。
   · 主变：两个相切圆。
   每个部件按正常运行方式的真实位置绘制，合位与分位画法对照见图例。 */
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
    return dir === 'h'
      ? `<rect x="${x - hh}" y="${y - w / 2}" width="${hh * 2}" height="${w}" rx="2" class="${on ? 'fill' : ''}"/><circle cx="${x - hh - 4}" cy="${y}" r="3.6"/><circle cx="${x + hh + 4}" cy="${y}" r="3.6"/>`
      : `<rect x="${x - w / 2}" y="${y - hh}" width="${w}" height="${hh * 2}" rx="2" class="${on ? 'fill' : ''}"/><circle cx="${x}" cy="${y - hh - 4}" r="3.6"/><circle cx="${x}" cy="${y + hh + 4}" r="3.6"/>`;
  },
  /* 小车开关：断路器 + 两端插头（工作位置） */
  cart(x, y, on, dir) {
    const e = 19;
    const plug = dir === 'h'
      ? `<path d="M${x - e - 9} ${y - 5} L${x - e - 4} ${y} L${x - e - 9} ${y + 5}"/><path d="M${x + e + 9} ${y - 5} L${x + e + 4} ${y} L${x + e + 9} ${y + 5}"/>`
      : `<path d="M${x - 5} ${y - e - 9} L${x} ${y - e - 4} L${x + 5} ${y - e - 9}"/><path d="M${x - 5} ${y + e + 9} L${x} ${y + e + 4} L${x + 5} ${y + e + 9}"/>`;
    return TKG.cb(x, y, on, dir) + plug;
  },
  /* 刀闸小车：隔离开关 + 两端插头 */
  dcart(x, y, on, dir) {
    const e = 13;
    const plug = dir === 'h'
      ? `<path d="M${x - e - 8} ${y - 5} L${x - e - 3} ${y} L${x - e - 8} ${y + 5}"/><path d="M${x + e + 8} ${y - 5} L${x + e + 3} ${y} L${x + e + 8} ${y + 5}"/>`
      : `<path d="M${x - 5} ${y - e - 8} L${x} ${y - e - 3} L${x + 5} ${y - e - 8}"/><path d="M${x - 5} ${y + e + 8} L${x} ${y + e + 3} L${x + 5} ${y + e + 8}"/>`;
    return TKG.ds(x, y, on, dir) + plug;
  },
  cbSpan: 19,                                   /* 断路器占位半长（含端子圆） */
  cartSpan: 28,
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
const TK_SPAN = { cb: TKG.cbSpan, cart: TKG.cartSpan, ds: TKG.dsSpan, dcart: TKG.dsSpan + 8 };
/* 一条竖直间隔：从母线 y0 画到 y1（向上或向下），items 按离母线由近到远排列 */
function tkBay(x, y0, y1, items, lblSide) {
  const out = []; let cur = y0;
  const dir = y1 > y0 ? 1 : -1;
  const side = lblSide || 'r';
  items.forEach(it => {
    if (it.kind === 'gnd') {
      out.push(`<g class="tkdev gnd ${it.on ? 'on' : ''}" data-dev="${it.id}">${TKG.gnd(x, it.y, it.on, side === 'r' ? 'l' : 'r')}` +
        `<text class="tkl ${side === 'r' ? 'e' : ''}" x="${x + (side === 'r' ? -64 : 64)}" y="${it.y + 3.5}">${h(it.n)}</text></g>`);
      return;
    }
    const span = TK_SPAN[it.kind] || 0;
    out.push(`<line class="tkw" x1="${x}" y1="${cur}" x2="${x}" y2="${it.y - dir * span}"/>`);
    out.push(`<g class="tkdev ${it.on ? 'on' : 'off'}" data-dev="${it.id}">${TKG[it.kind](x, it.y, it.on, 'v')}` +
      `<text class="tkl" x="${x + (side === 'r' ? 14 : -14)}" ${side === 'r' ? '' : 'text-anchor="end"'} y="${it.y + 3.5}">${h(it.n)}</text></g>`);
    cur = it.y + dir * span;
  });
  out.push(`<line class="tkw" x1="${x}" y1="${cur}" x2="${x}" y2="${y1}"/>`);
  return out.join('');
}
function tkBusSVG() {
  const BUS = 160, TOP = 36, TRY = 330, LV = 480;
  const out = (x, nm) => `<path class="tkw" d="M${x - 8} ${TOP + 14} L${x} ${TOP} L${x + 8} ${TOP + 14} Z"/><text class="tkn" x="${x}" y="${TOP - 8}" text-anchor="middle">${h(nm)}</text>`;
  const line = (x, no, bus, nm) => tkBay(x, BUS, TOP + 14, [
    { y: 140, kind: 'ds', id: no + bus, n: no + bus, on: true },
    { y: 104, kind: 'cb', id: no, n: no, on: true },
    { y: 68, kind: 'ds', id: no + '4', n: no + '4', on: true }
  ]) + out(x, nm);
  /* 主变：高压侧间隔 + 本体 + 中性点地刀 */
  const trf = (x, id, nm, nid, nlbl) => `<g class="tkdev" data-dev="${id}">${TKG.tr(x, TRY)}</g><text class="tkn" x="${x - 22}" y="${TRY + 14}" text-anchor="end">${h(nm)}</text>`
    + `<g class="tkdev gnd" data-dev="${nid}">${TKG.gnd(x + 15, TRY, false, 'r')}<text class="tkl" x="${x + 44}" y="${TRY - 7}" text-anchor="middle">${h(nlbl)}</text></g>`;
  const hv = (x, no, bus) => tkBay(x, BUS, TRY - 15, [
    { y: 182, kind: 'ds', id: no + bus, n: no + bus, on: true },
    { y: 218, kind: 'cb', id: no, n: no, on: true },
    { y: 258, kind: 'ds', id: no + '4', n: no + '4', on: true }
  ]);
  const bay3 = tkBay(900, BUS, TRY - 15, [
    { y: 180, kind: 'ds', id: '11032', n: '11032', on: true },
    { y: 200, kind: 'gnd', id: '1103B0', n: '1103B0', on: false },
    { y: 224, kind: 'cb', id: '1103', n: '1103', on: true },
    { y: 250, kind: 'gnd', id: '1103C0', n: '1103C0', on: false },
    { y: 272, kind: 'ds', id: '11034', n: '11034', on: true },
    { y: 294, kind: 'gnd', id: '110340', n: '110340', on: false }
  ]);
  const dxs = `<g class="tkdev" data-dev="dxs"><line class="tkw" x1="900" y1="303" x2="918" y2="303"/><rect x="918" y="295" width="16" height="16" rx="3"/><path d="M928 298 L923 304 L929 304 L924 310"/><text class="tkl" x="938" y="307">带电显示</text></g>`;
  /* 10kV：小车开关回路 */
  const cartV = (x, ya, yb, yc, id, n, on) => `<line class="tkw" x1="${x}" y1="${ya}" x2="${x}" y2="${yb - TKG.cartSpan}"/><g class="tkdev ${on ? 'on' : 'off'}" data-dev="${id}">${TKG.cart(x, yb, on, 'v')}<text class="tkl" x="${x + 14}" y="${yb + 3.5}">${h(n)}</text></g><line class="tkw" x1="${x}" y1="${yb + TKG.cartSpan}" x2="${x}" y2="${yc}"/>`;
  const feeder = (x, id, n, nm) => cartV(x, LV, 516, 552, id, n, true) + `<g class="tkdev" data-dev="${id}"><circle cx="${x}" cy="561" r="9"/></g><text class="tkl" x="${x}" y="584" text-anchor="middle">${h(nm)}</text>`;
  const tieV = (x1, x2, yb) => `<line class="tkw" x1="${x1}" y1="${LV}" x2="${x1}" y2="${yb}"/><line class="tkw" x1="${x2}" y1="${LV}" x2="${x2}" y2="${yb}"/>`;
  return `<svg viewBox="0 0 1000 594" class="tkbus" xmlns="http://www.w3.org/2000/svg">
    <text class="tkt" x="12" y="16">110kV考核站主接线图（110kV 为 GIS 设备，10kV 为小车式设备）　图中状态为正常运行方式</text>
    <line class="tkbus1" x1="40" y1="${BUS}" x2="452" y2="${BUS}"/><text class="tkn b" x="40" y="${BUS - 9}">110kV 1M</text>
    <line class="tkbus1" x1="528" y1="${BUS}" x2="975" y2="${BUS}"/><text class="tkn b" x="975" y="${BUS - 9}" text-anchor="end">110kV 2M</text>
    <g class="tkdev off" data-dev="1012">
      <line class="tkw" x1="452" y1="${BUS}" x2="${490 - TKG.cbSpan}" y2="${BUS}"/><line class="tkw" x1="${490 + TKG.cbSpan}" y1="${BUS}" x2="528" y2="${BUS}"/>
      ${TKG.cb(490, BUS, false, 'h')}<text class="tkl" x="490" y="${BUS + 26}" text-anchor="middle">分段1012</text></g>
    ${line(120, '1734', '1', '考核一线')}${line(250, '1736', '1', '考核三线')}${line(610, '1735', '2', '考核二线')}
    ${hv(340, '1101', '1')}${trf(340, 'T1', '#1主变', 'N1', '中性点')}
    ${hv(700, '1102', '2')}${trf(700, 'T2', '#2主变', 'N2', '中性点')}
    ${bay3}${dxs}${trf(900, 'T3', '#3主变', '113000', '113000')}
    <line class="tkbus1" x1="200" y1="${LV}" x2="440" y2="${LV}"/><text class="tkn" x="200" y="${LV - 8}">10kV 1M</text>
    <line class="tkbus1" x1="560" y1="${LV}" x2="680" y2="${LV}"/><text class="tkn" x="560" y="${LV - 8}">10kV 2AM</text>
    <line class="tkbus1" x1="710" y1="${LV}" x2="780" y2="${LV}"/><text class="tkn" x="710" y="${LV - 8}">10kV 2BM</text>
    <line class="tkbus1" x1="875" y1="${LV}" x2="975" y2="${LV}"/><text class="tkn" x="975" y="${LV - 8}" text-anchor="end">10kV 3M</text>
    ${cartV(340, TRY + 35, 424, LV, '501', '501', true)}
    <line class="tkw" x1="700" y1="${TRY + 35}" x2="700" y2="384"/><line class="tkw" x1="640" y1="384" x2="760" y2="384"/>
    ${cartV(640, 384, 424, LV, '502A', '502A', true)}${cartV(760, 384, 424, LV, '502B', '502B', true)}
    <g class="tkdev" data-dev="mqb"><line class="tkw" x1="900" y1="${TRY + 35}" x2="900" y2="${424 - TKG.cartSpan}" style="stroke-width:3"/><text class="tkl" x="908" y="383">变低母线桥</text></g>
    <g class="tkdev on" data-dev="503">${TKG.cart(900, 424, true, 'v')}<text class="tkl" x="914" y="427.5">503</text></g><line class="tkw" x1="900" y1="${424 + TKG.cartSpan}" x2="900" y2="${LV}"/>
    ${tieV(430, 570, 530)}<line class="tkw" x1="430" y1="530" x2="${500 - TKG.cartSpan}" y2="530"/><line class="tkw" x1="${500 + TKG.cartSpan}" y1="530" x2="570" y2="530"/>
    <g class="tkdev off" data-dev="521">${TKG.cart(500, 530, false, 'h')}<text class="tkl" x="500" y="551" text-anchor="middle">分段521</text></g>
    ${tieV(770, 890, 530)}<line class="tkw" x1="770" y1="530" x2="${805 - TKG.cartSpan}" y2="530"/><line class="tkw" x1="${805 + TKG.cartSpan}" y1="530" x2="${860 - TKG.dsSpan - 8}" y2="530"/><line class="tkw" x1="${860 + TKG.dsSpan + 8}" y1="530" x2="890" y2="530"/>
    <g class="tkdev off" data-dev="532">${TKG.cart(805, 530, false, 'h')}<text class="tkl" x="805" y="551" text-anchor="middle">分段532</text></g>
    <g class="tkdev on" data-dev="5323">${TKG.dcart(860, 530, true, 'h')}<text class="tkl" x="860" y="551" text-anchor="middle">5323</text></g>
    ${feeder(240, 'G1', '', '#1接地变')}${feeder(300, 'ST1', 'ST1', '#1站用变')}${feeder(620, 'D02', 'D02', '#2接地变')}${feeder(740, 'ST2', 'ST2', '#2站用变')}${feeder(950, 'D03', 'D03', '#3接地变')}
  </svg>`;
}
/* 部件标准画法图例：合位 / 分位对照 */
function tkLegendSVG() {
  const cell = (cx, label, body) => `<g class="tkdev">${body}</g><text class="tkl" x="${cx}" y="84" text-anchor="middle">${h(label)}</text>`;
  return `<svg viewBox="0 0 760 96" class="tkbus tklg" xmlns="http://www.w3.org/2000/svg">
    ${cell(46, '刀闸 合位', `<line class="tkw" x1="14" y1="34" x2="${46 - TKG.dsSpan}" y2="34"/><line class="tkw" x1="${46 + TKG.dsSpan}" y1="34" x2="78" y2="34"/>${TKG.ds(46, 34, true, 'h')}`)}
    ${cell(140, '刀闸 分位', `<line class="tkw" x1="108" y1="34" x2="${140 - TKG.dsSpan}" y2="34"/><line class="tkw" x1="${140 + TKG.dsSpan}" y1="34" x2="172" y2="34"/>${TKG.ds(140, 34, false, 'h')}`)}
    ${cell(236, '开关 合位', `<line class="tkw" x1="200" y1="34" x2="${236 - TKG.cbSpan}" y2="34"/><line class="tkw" x1="${236 + TKG.cbSpan}" y1="34" x2="272" y2="34"/>${TKG.cb(236, 34, true, 'h')}`)}
    ${cell(332, '开关 分位', `<line class="tkw" x1="296" y1="34" x2="${332 - TKG.cbSpan}" y2="34"/><line class="tkw" x1="${332 + TKG.cbSpan}" y1="34" x2="368" y2="34"/>${TKG.cb(332, 34, false, 'h')}`)}
    ${cell(436, '小车开关（工作位置）', `<line class="tkw" x1="394" y1="34" x2="${436 - TKG.cartSpan}" y2="34"/><line class="tkw" x1="${436 + TKG.cartSpan}" y1="34" x2="478" y2="34"/>${TKG.cart(436, 34, true, 'h')}`)}
    ${cell(530, '地刀 合位', `<line class="tkw" x1="506" y1="14" x2="554" y2="14"/><g class="gnd">${TKG.gnd(530, 14, true, 'd')}</g>`)}
    ${cell(616, '地刀 分位', `<line class="tkw" x1="592" y1="14" x2="640" y2="14"/><g class="gnd">${TKG.gnd(616, 14, false, 'd')}</g>`)}
    ${cell(700, '主变', `${TKG.tr(700, 22)}`)}
  </svg>`;
}

const TK_DEV = {
  '1734': ['110kV考核一线1734开关', '运行于110kV 1M'], '17341': ['考核一线1M侧17341刀闸', '合上位置'], '17344': ['考核一线线路侧17344刀闸', '合上位置'],
  '1736': ['110kV考核三线1736开关', '运行于110kV 1M'], '17361': ['考核三线1M侧17361刀闸', '合上位置'], '17364': ['考核三线线路侧17364刀闸', '合上位置'],
  '1735': ['110kV考核二线1735开关', '运行于110kV 2M'], '17352': ['考核二线2M侧17352刀闸', '合上位置'], '17354': ['考核二线线路侧17354刀闸', '合上位置'],
  '1012': ['110kV 1M、2M分段1012开关', '分闸位置 · 110kV 1M、2M 分列运行'],
  '1101': ['#1主变变高1101开关', '运行于110kV 1M'], '11011': ['#1主变变高1M侧11011刀闸', '合上位置'], '11014': ['#1主变变高主变侧11014刀闸', '合上位置'],
  '1102': ['#2主变变高1102开关', '运行于110kV 2M'], '11022': ['#2主变变高2M侧11022刀闸', '合上位置'], '11024': ['#2主变变高主变侧11024刀闸', '合上位置'],
  '1103': ['#3主变变高1103开关', 'GIS 断路器 · 运行于110kV 2M · 合闸位置 · 1103开关远方/就地转换把手 HK1 在「远方」'],
  '11032': ['#3主变变高2M侧11032刀闸', '电动刀闸 · 合上位置 · 电机电源 1ZK、控制电源 6ZK 在合闸位置'],
  '11034': ['#3主变变高主变侧11034刀闸', '电动刀闸 · 合上位置 · 电机电源 3ZK、控制电源 8ZK 在合闸位置'],
  '1103B0': ['#3主变变高1103B0地刀', '拉开位置 · 电机电源 2ZK、控制电源 7ZK 在分闸位置'],
  '1103C0': ['#3主变变高1103C0地刀', '拉开位置 · 电机电源 4ZK、控制电源 9ZK 在分闸位置'],
  '110340': ['#3主变变高主变侧110340地刀', '拉开位置 · 电机电源 5ZK、控制电源 10ZK 在分闸位置'],
  'dxs': ['#3主变变高主变侧高压带电显示装置', '已配置高压带电显示闭锁装置 · 当前显示有电压'],
  'T1': ['#1主变', '运行 · 约带30%负荷'], 'T2': ['#2主变', '运行 · 约带30%负荷 · 变低分 A、B 两个分支'], 'T3': ['#3主变', '运行 · 约带30%负荷'],
  'N1': ['#1主变中性点接地刀闸', '拉开位置'], 'N2': ['#2主变中性点接地刀闸', '拉开位置'],
  '113000': ['#3主变变高中性点113000地刀', '拉开位置 · 遥控压板 7LP5 在 12P #3主变测控屏'],
  '501': ['#1主变变低501开关', '小车式 · 工作位置 · 带10kV 1M运行'],
  '502A': ['#2主变变低A分支502A开关', '小车式 · 工作位置 · 带10kV 2AM运行'],
  '502B': ['#2主变变低B分支502B开关', '小车式 · 工作位置 · 带10kV 2BM运行'],
  '503': ['#3主变变低503开关', '小车式 · 工作位置 · 带10kV 3M运行 · 开关柜就地/远方转换把手 ZK 在「远方」'],
  'mqb': ['#3主变变低母线桥', '#3主变低压侧至503开关柜之间的母线桥'],
  '521': ['10kV 1M、2AM分段521开关', '小车式 · 热备用'],
  '532': ['10kV 2BM、3M分段532开关', '小车式 · 热备用（开关小车在工作位置，开关在分闸位置）'],
  '5323': ['10kV 2BM、3M分段3M侧5323刀闸小车', '工作位置'],
  'G1': ['#1接地变', '接10kV 1M运行'], 'D02': ['10kV #2接地变D02开关', '接10kV 2AM · 合闸位置'], 'D03': ['10kV #3接地变D03开关', '接10kV 3M运行 · 合闸位置'],
  'ST1': ['#1站用变ST1开关', '接10kV 1M'], 'ST2': ['#2站用变ST2开关', '接10kV 2BM']
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
    <div class="ph"><h2>操作票填写</h2><span class="sub">${h(TICKET_META.station)}　标准票 ${h(TICKET_META.ver)}　票号由考核人员填写</span></div>
    <div class="card tkintro">
      <div class="tktask"><b>操作任务</b><p>${h(TICKET_META.task)}</p></div>
      <div class="tkask"><b>作答要求</b><ol>${TICKET_META.ask.map(x => `<li>${h(x)}</li>`).join('')}</ol></div>
      <div class="tkask"><b>判卷说明</b><ol><li>系统给出操作任务、主接线图、运行方式与屏柜附表，由你自行判断操作范围并逐项填写操作票。</li><li>提交后自动判卷：漏项、顺序错误、阶段越界、文字不规范、危险操作分别判定，并给出依据条款与正确写法。</li><li>危险操作（未验电接地、带负荷拉刀闸、未转负荷即停主变等）一经出现整票不合格。</li></ol></div>
      <div class="tkmodes">
        <label class="tkmd"><input type="radio" name="tkmode" value="teach" checked><b>训练模式</b><span>边写边判：每行当场比对标准票、即时纠错、三级提示、阶段进度，可反复改</span></label>
        <label class="tkmd"><input type="radio" name="tkmode" value="exam"><b>考核模式</b><span>关闭全部提示与进度，计时、一次提交、提交后才给结果</span></label>
        <label class="tkmd stress"><input type="checkbox" id="tkstress"><b>压力模式</b><span>限时 20 分钟 · 中途有调度来电打断</span></label>
      </div>
      <div class="tkgo"><button class="btn pri" id="tkstart">开始填写</button><span class="note">标准票 ${TICKET.filter(s => !s.parent).length} 项、子项 ${TICKET.filter(s => s.parent).length} 项，分 ${TICKET_META.stages.length} 个设备状态阶段</span></div>
    </div>
    <div class="card tkupc"><div class="ch"><b>上传已填好的操作票</b><span class="note">线下已写好的票直接上传判卷，按考核模式计分</span></div>
      <div class="tkupb"><label class="btn pri tkup">选择文件上传<input type="file" id="tkfile0" accept=".docx,.xlsx,.txt" class="tkfile"></label>
        <ul class="note"><li>Excel（.xlsx）：「操作顺序」「操作步骤」两列，与典型操作票格式相同；17.1 这类带小数点的顺序号为子项</li>
          <li>Word（.docx）：操作票表格（顺序 / 操作项目），或每行一项、行首写顺序号；也可在子项行首标 $</li>
          <li>老版 Word（.doc）请先另存为 .docx 再上传</li></ul></div></div>
    <div class="card"><div class="ch"><b>判定逻辑自测</b><span class="note">七种典型答卷一次跑完，用于核对判定是否准确，不用手工录整张票</span>
      <span class="r"><button class="btn s" id="tkself">运行自测</button></span></div>
      <div id="tkselfout" class="tkself"><div class="empty">点「运行自测」：按标准票填完、组内换序、先拉2M侧刀闸、漏写四项、并项且缺双重名称、未验电即合地刀、未转负荷即断开503，七种答卷的判定结果并排列出</div></div>
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
      <ol class="tkask2">${TICKET_META.ask.map(x => `<li>${h(x)}</li>`).join('')}</ol></div>
    <div class="tkmid">
      <div class="card tkleft"><div class="ch"><b>主接线图</b><span class="note">点设备看名称、编号与当前状态</span></div>${tkBusSVG()}<div class="tkpop" id="tkpop"></div>
        <div class="ch2"><b>部件标准画法</b><span class="note">合位与分位对照</span></div>${tkLegendSVG()}</div>
      <div class="card tkright"><div class="ch"><b>正常运行方式</b></div>
        <div class="tkrun">${TICKET_META.runway.map(x => `<p>${h(x)}</p>`).join('')}<p class="tknote">${h(TICKET_META.note)}</p></div>
        <div class="ch2"><b>屏柜附表</b><span class="note">空气开关、压板、把手的编号与正常位置，点屏柜名展开</span></div>
        ${TICKET_META.gear.map(g => `<details class="tkgear"><summary><b>${h(g.p)}</b><span class="note">${g.m ? h(g.m) + ' · ' : ''}${g.rows.length} 项</span></summary><table class="tb s"><tr><th>编号</th><th>名称</th><th>属性</th><th>位置状态</th></tr>${g.rows.map(r => `<tr><td class="mono">${h(r[0])}</td><td>${h(r[1])}</td><td>${h(r[2])}</td><td>${h(r[3])}</td></tr>`).join('')}</table></details>`).join('')}
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
      <td><input class="tkin" data-i="${i}" value="${h(r.t)}" placeholder="${r.child ? '子项内容，如：断开#3主变高压侧控制电源4K1空气开关' : '填写一个操作项目，一栏只写一个动词；回车新增一行'}">${fb ? `<div class="tkfb ${fb.cls}">${fb.html}</div>` : ''}</td>
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
  const redAt = {};                                   // 学员行 → 命中的危险规则
  TICKET_DANGER.forEach(d => tkDangerHits(d, m).forEach(x => { if (m[x.b] != null && !redAt[m[x.b]]) redAt[m[x.b]] = { d, x }; }));
  TK.rows.forEach((r, i) => {
    const t = (r.t || '').trim(); if (!t) return;
    const c = TICKET.map(s => ({ s, sc: tkScore(t, s) })).sort((a, b) => b.sc - a.sc)[0];
    if (!c || c.sc < 42) { TK.fb[i] = { cls: 'w', html: '没认出这一句对应标准票的哪一步。看看是不是一栏写了两个动作，或者设备双重名称没写全。' }; return; }
    const s = c.s;
    const rd = redAt[i];
    if (rd) { TK.fb[i] = { cls: 'r', html: '<b>危险操作 · ' + h(rd.d.n) + '</b>' + (rd.x.lack ? '前面还没有「' + h(TSTEP[rd.x.a].t) + '」' : '「' + h(TSTEP[rd.x.a].t) + '」写在了这一步之后') + '，这一步放在这个位置，整票会判不合格。' }; return; }
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
    if (TK.stress && TK.sec >= 1200) { toast('压力模式限时已到，自动提交', 'bad'); tkSubmit(true); }
  }, 1000);
}
function tkBreak() {
  const b = el('div', 'tkbreak', `<b>调度来电</b><p>“${h(TICKET_META.station)}，#3主变转检修的票填到哪一步了？10kV 3M 的负荷怎么转、先断哪个开关，想清楚再写。2M 上考核二线1735有告警，等下要你配合，先把这张票填完报我。”</p><div class="bt"><button class="btn pri" id="tkbrk">知道了，继续填票</button></div>`);
  document.body.appendChild(b); $('#tkbrk').onclick = () => b.remove();
}
function tkSubmit(force) {
  tkRead();
  const rows = TK.rows.filter(r => (r.t || '').trim());
  if (rows.length < 5 && !force) { toast('至少填 5 项再提交', 'bad'); return; }
  if (!TK.no && !force) { toast('票号由考核人员填写，请先填编号', 'bad'); const n = $('#tkno'); if (n) n.focus(); return; }
  if (TK.timer) { clearInterval(TK.timer); TK.timer = null; }
  const res = tkJudge(rows);
  TK.res = res; TK.on = false;
  const sum = Object.keys(res.byKind).map(k => ERR_KINDS[k].n + ' ' + res.byKind[k]);
  TK.rec = { d: stamp(), no: TK.no, mode: TK.mode === 'exam' ? '考核模式' : '训练模式', stress: TK.stress, sec: TK.sec, score: res.score, pass: res.pass, fatal: res.fatal, sum, rows, ver: TICKET_META.ver };
  tkSave(TK.rec);
  const t = typeof taskHit === 'function' ? taskHit('tk', '', res.score, res.pass) : null;
  goPage('ticket');
  if (t) toast('成绩已回写到「' + t.targetN + '」培训任务', 'ok');
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
    <div class="er"><i>${e.kind === 'danger' ? '判定依据' : '执行原因'}</i><span>${e.whyBiz ? h(e.whyBiz) : '—'}</span></div>
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
        <div class="note">扣分合计 ${r.deduct}${r.fatal.length ? '　扣分前得分 ' + r.raw + '，整票不合格计 0 分' : ''}　及格线 ${r.cfg.pass}　分值为判卷配置项</div></div>
      <div class="card tkstage"><div class="ch"><b>设备状态阶段</b><span class="note">后台先判断处于哪个阶段，再判断阶段内步骤是否合法</span></div>
        ${r.stages.map(s => `<div class="stg"><b>${h(s.n)}</b><div class="bar"><i style="width:${s.pct}%"></i></div><span class="mono">${s.done}/${s.n2}</span></div>`).join('')}
        <div class="kinds">${order.filter(k => cnt(k)).map(k => `<span class="tag ${ERR_KINDS[k].c === 'r' ? 'bad' : ERR_KINDS[k].c === 'o' ? 'w' : ''}">${ERR_KINDS[k].n} ${cnt(k)}</span>`).join('') || '<span class="tag ok">未发现错误</span>'}</div></div>
    </div>
    <div class="tabs2" id="tktabs"><span data-tktab="err" class="${TK.tab === 'err' ? 'on' : ''}">错误清单 ${r.errs.length}</span><span data-tktab="cmp" class="${TK.tab === 'cmp' ? 'on' : ''}">答卷与标准票对照</span><span data-tktab="rule" class="${TK.tab === 'rule' ? 'on' : ''}">命中的制度条款</span></div>
    <div id="tkbody">${TK.tab === 'cmp' ? tkCmpHTML() : TK.tab === 'rule' ? tkRuleHTML() : (errs.length ? errs.map(tkErrCard).join('') : '<div class="card"><div class="empty">这张票没有判出错误。组内可换序的步骤调整顺序不判错。</div></div>')}</div>
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

/* ---------- 上传导入：Word / Excel 操作票（zip + DecompressionStream，纯浏览器离线解析） ---------- */
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
  ptext(p) { return this.un((p.match(/<w:t[^>]*>[^<]*<\/w:t>/g) || []).map(t => t.replace(/<[^>]+>/g, '')).join('')); },
  /* Word：正文段落 + 表格行（每行的单元格文字） */
  async docx(file) {
    const z = await this.zipEntries(await file.arrayBuffer());
    const xml = await this.zipRead(z, 'word/document.xml'); if (!xml) throw new Error('Word 文档里没有正文');
    const rows = (xml.match(/<w:tr[ >][\s\S]*?<\/w:tr>/g) || []).map(tr => (tr.match(/<w:tc>[\s\S]*?<\/w:tc>|<w:tc [\s\S]*?<\/w:tc>/g) || []).map(tc => (tc.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || []).map(p => this.ptext(p)).join('').trim()));
    const body = xml.replace(/<w:tbl>[\s\S]*?<\/w:tbl>/g, '');
    const paras = (body.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || []).map(p => this.ptext(p));
    return { paras, rows };
  },
  /* Excel：第一个工作表，按单元格列号取值（空单元格不错位） */
  async xlsx(file) {
    const z = await this.zipEntries(await file.arrayBuffer());
    const ss = await this.zipRead(z, 'xl/sharedStrings.xml');
    const strs = ss ? (ss.match(/<si>[\s\S]*?<\/si>/g) || []).map(si => this.un((si.match(/<t[^>]*>[^<]*<\/t>/g) || []).map(t => t.replace(/<[^>]+>/g, '')).join(''))) : [];
    const sheet = await this.zipRead(z, 'xl/worksheets/sheet1.xml'); if (!sheet) throw new Error('Excel 里没有工作表');
    const col = ref => { const L = (ref.match(/^[A-Z]+/) || ['A'])[0]; let n = 0; for (const ch of L) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };
    return (sheet.match(/<row[ >][\s\S]*?<\/row>/g) || []).map(r => {
      const out = [];
      (r.match(/<c [^>]*?(?:\/>|>[\s\S]*?<\/c>)/g) || []).forEach((c, k) => {
        const ref = (c.match(/ r="([A-Z]+\d+)"/) || [])[1];
        const t = (c.match(/ t="([^"]+)"/) || [])[1], v = (c.match(/<v>([^<]*)<\/v>/) || [])[1], is = (c.match(/<is>([\s\S]*?)<\/is>/) || [])[1];
        let val = '';
        if (is != null) val = this.un((is.match(/<t[^>]*>[^<]*<\/t>/g) || []).map(x => x.replace(/<[^>]+>/g, '')).join(''));
        else if (v != null) val = t === 's' ? strs[+v] || '' : v;
        out[ref ? col(ref) : k] = val;
      });
      return out;
    });
  },
  NO: /^\d{1,3}(\.\d{1,2})?$/,
  /* 表格行（Excel 行或 Word 表格行）：认出「顺序」「操作项目」两列；表头之前的整段文字当作操作任务 */
  parseTable(cells) {
    const rows = [], bad = []; let task = '', cNo = -1, cT = -1;
    const hdr = cells.findIndex(c => c.some(x => /^(操作)?顺序$|^序号$/.test(String(x || '').trim())) && c.some(x => /操作(步骤|项目)/.test(String(x || '').replace(/\s/g, ''))));
    if (hdr >= 0) {
      cNo = cells[hdr].findIndex(x => /^(操作)?顺序$|^序号$/.test(String(x || '').trim()));
      cT = cells[hdr].findIndex(x => /操作(步骤|项目)/.test(String(x || '').replace(/\s/g, '')));
      cells.slice(0, hdr).forEach(c => { c.forEach(x => { const v = String(x || '').trim(); if (/操作任务/.test(v)) return; if (v.length > task.length && v.length >= 8) task = v; }); });
    } else { cNo = 0; cT = 1; }
    cells.forEach((c, j) => {
      if (j <= hdr) return;
      let no = String(c[cNo] == null ? '' : c[cNo]).trim(), t = String(c[cT] == null ? '' : c[cT]).trim();
      if (!no && !t) return;
      if (/操作任务/.test(no) && t) { task = t; return; }
      if (!no && t) { const m = t.match(/^(\d{1,3}(?:\.\d{1,2})?)[、.．\s]+(.+)$/); if (m) { no = m[1]; t = m[2].trim(); } }
      if (/^\d+\.0+$/.test(no)) no = String(parseInt(no, 10));
      if (/^\d+\.\d{3,}$/.test(no)) no = String(Math.round(parseFloat(no) * 10) / 10);
      if (!this.NO.test(no) || !t) { bad.push(j + 1); return; }
      const child = no.includes('.');
      if (child && !rows.length) { bad.push(j + 1); return; }
      rows.push({ no, t, child });
    });
    return { task, rows, bad };
  },
  /* 逐行文本：第一行（不带顺序号）为操作任务；「17.1 检查……」带小数点的是子项，行首 $ 也是子项 */
  parseLines(paras) {
    const skip = /^#|填写操作任务|例子如下|作为参考|每一步占一行|标记标出|空一行接/;
    const lines = paras.map(x => (x || '').trim()).filter(x => x && !skip.test(x));
    if (!lines.length) throw new Error('文档是空的');
    let task = '', i = 0;
    const m0 = lines[0].match(/^操作任务[：:]\s*(.*)$/);
    const NUM = /^(\d{1,3}(?:\.\d{1,2})?)(?:[、.．\s]+|(?=[\u4e00-\u9fa5#]))(.*)$/;
    if (m0) { task = m0[1]; i = 1; } else if (!NUM.test(lines[0]) && !/^[$＄]/.test(lines[0])) { task = lines[0]; i = 1; }
    const rows = [], bad = [];
    for (let j = i; j < lines.length; j++) {
      let t = lines[j]; let child = t.charAt(0) === '$' || t.charAt(0) === '＄';
      t = t.replace(/^[$＄]\s*/, '');
      const m = t.match(NUM);
      let no = '';
      if (m) { no = m[1]; t = m[2].trim(); if (no.includes('.')) child = true; }
      if (!t) { bad.push(j + 1); continue; }
      if (/^(操作)?顺序|^操作项目/.test(t)) continue;
      if (child && !rows.length) { bad.push(j + 1); continue; }
      rows.push({ no, t, child });
    }
    return { task, rows, bad };
  },
  async load(file) {
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (ext === 'docx') {
      const d = await this.docx(file);
      const tr = d.rows.filter(c => c.length >= 2);
      if (tr.length >= 3) { const r = this.parseTable(tr); if (r.rows.length >= 3) { if (!r.task) r.task = (this.parseLines(d.paras.length ? d.paras : ['x']).task || ''); return r; } }
      return this.parseLines(d.paras);
    }
    if (ext === 'xlsx') return this.parseTable(await this.xlsx(file));
    if (ext === 'txt') return this.parseLines((await file.text()).split(/\r?\n/));
    if (ext === 'doc' || ext === 'xls') throw new Error('老版 Office 文件请先另存为 .' + ext + 'x 再上传');
    throw new Error('只支持 Word（.docx）、Excel（.xlsx）与纯文本（.txt）');
  }
};
async function tkImport(file) {
  try {
    const r = await TKUP.load(file);
    if (!r.rows.length) throw new Error('没有解析到操作步骤：Excel 需要「操作顺序」「操作步骤」两列，Word 需要操作票表格或逐行填写的操作项目');
    if (!TK.on) tkStart('exam', false);
    tkRead();
    TK.rows = r.rows.map(x => ({ t: x.t, child: x.child }));
    const taskDiff = r.task && sim(r.task, TICKET_META.task) < 0.6;
    const renum = r.rows.some((x, k) => x.no && !x.child && x.no !== String(r.rows.slice(0, k + 1).filter(y => !y.child).length));
    TK.imported = file.name + '（' + r.rows.length + ' 行' + (r.bad.length ? '，第 ' + r.bad.slice(0, 5).join('、') + ' 行格式不符已跳过' : '') + (renum ? '，顺序号已按主项 / 子项重新连续编排' : '') + '）'
      + (taskDiff ? '　文件里的操作任务是「' + r.task + '」，本场考核任务为「' + TICKET_META.task + '」' : '');
    TK.focus = -1; TK.hint = null;
    goPage('ticket');
    tkCheckAll(); tkPaint();
    toast('已导入 ' + r.rows.length + ' 行' + (r.bad.length ? '，跳过 ' + r.bad.length + ' 行' : '') + '，填好票号后提交判卷', r.bad.length ? 'w' : 'ok');
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
    $('#tksubmit').onclick = () => tkSubmit();
    const no = $('#tkno'); if (no) no.oninput = () => { TK.no = no.value.trim(); };
    return;
  }
  if (TK.res) {
    const a = $('#tkagain'); if (a) a.onclick = () => { TK.res = null; TK.rec = null; goPage('ticket'); };
    const x = $('#tkexport'); if (x) x.onclick = tkExport;
    return;
  }
  const f0 = $('#tkfile0'); if (f0) f0.onchange = e => { const x = e.target.files[0]; if (x) tkImport(x); e.target.value = ''; };
  const sf = $('#tkself'); if (sf) sf.onclick = () => { const o = $('#tkselfout'); if (o) o.innerHTML = tkSelfTest(); toast('自测完成，七种答卷的判定结果已列出', 'ok'); };
  const b = $('#tkstart');
  if (b) b.onclick = () => {
    const m = ($$('input[name=tkmode]').find(i => i.checked) || {}).value || 'exam';
    tkStart(m, $('#tkstress') && $('#tkstress').checked);
  };
}

const TK_SELF = [
  ['ok', '按标准票填完', '100 分 · 无错误'],
  ['swap', '组内换序（4/5、17.1/17.2、56.1/56.2 互换）', '100 分 · 可换序，不判错'],
  ['order', '先拉2M侧11032刀闸、后拉主变侧11034刀闸', '仅 1 条顺序错误，不连锁'],
  ['miss', '漏写 4 项（12、17.3、25、43）', '4 条漏项，不产生连锁顺序错误'],
  ['text', '并项 + 缺双重名称', '2 条文字不规范（并项不再重复计漏项）'],
  ['danger', '未检查带电显示装置无电压即合110340地刀', '整票不合格计 0 分，扣分前得分仍展示'],
  ['load', '未合532开关转负荷就断开503开关', '整票不合格计 0 分，不再重复计顺序错误']
];
function tkSelfTest() {
  const out = TK_SELF.map(([k, n, exp]) => {
    const r = tkJudge(tkAuto(k));
    const kinds = Object.keys(r.byKind).map(x => ERR_KINDS[x].n + ' ' + r.byKind[x]).join('、') || '无';
    return { k, n, exp, score: r.score, raw: r.raw, fatal: r.fatal, errs: r.errs.length, kinds, pass: r.pass };
  });
  return `<table class="tb tkselft"><tr><th>答卷</th><th>得分</th><th>结论</th><th>错误</th><th>判出的错误类型</th><th>预期</th></tr>
    ${out.map(x => `<tr><td>${h(x.n)}</td><td class="mono">${x.score}${x.fatal.length ? '<span class="note">（扣分前 ' + x.raw + '）</span>' : ''}</td>
      <td>${x.fatal.length ? '<span class="tag bad">整票不合格</span>' : x.pass ? '<span class="tag ok">合格</span>' : '<span class="tag w">不合格</span>'}</td>
      <td class="mono">${x.errs}</td><td class="note">${h(x.kinds)}</td><td class="note">${h(x.exp)}</td></tr>`).join('')}</table>
    <div class="note" style="margin-top:6px">七种答卷由标准票自动变形生成，可与右列的预期逐行对照；扣分值为配置项，改了配置这张表会跟着变。</div>`;
}
function tkExport() {
  const r = TK.res; if (!r) return;
  const lines = [['错误类型', '学员项', '标准步骤', '错误说明', '执行原因', '依据文件', '条款', '建议写法', '处理结果']];
  r.errs.forEach(e => lines.push([ERR_KINDS[e.kind].n, e.at != null ? e.at + 1 : '', e.stdNo, e.title + '｜' + e.why, e.whyBiz || '',
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
