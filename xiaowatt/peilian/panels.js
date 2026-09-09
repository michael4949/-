/* ================= 作业面板（v3）：每个作业位置都是一张可操作的设备图，学员在图上动手，图上看到变化 =================
   调度电话：来电 → 接听报名 → 听令 → 记录簿填写 → 复诵 → 调度确认 → 票令核对 → 汇报拨号
   五防电脑：在五防模拟接线图上按票序点击设备，五防主机逐项记录，顺序错误弹出闭锁
   监控后台：一次接线图上点击设备 → 遥控预置/返校/执行 → 图上变位、报文刷新；核对类项目弹出光字/遥测详情
   间隔现场 / 测控屏 / 保护屏 / 就地控制柜：SVG 设备图，把手会转、空开会掉、按钮会亮、标志牌会挂上去 */

const tms = ms => Math.max(20, ms * Math.min(1, window.__DH_SPEED || 1));
const sleepMs = ms => new Promise(r => setTimeout(r, tms(ms)));

/* ---------- SVG 元件库 ---------- */
const SVX = {
  T(id) { return (S.dev._t === id ? 'tgt ' : '') + (S.sel === id ? 'sel ' : '') + (S.lastChg === id ? 'chg ' : ''); },
  hit(x, y, w, h) { return `<rect class="hit" x="${x}" y="${y}" width="${w}" height="${h}" rx="6"/>`; },
  lamp(x, y, on, color, lbl, r) {
    r = r || 9;
    return `<g transform="translate(${x},${y})">
      ${on ? `<circle r="${r + 6}" fill="${color}" opacity=".18"><animate attributeName="opacity" values=".18;.05;.18" dur="1.6s" repeatCount="indefinite"/></circle>` : ''}
      <circle r="${r}" fill="${on ? color : '#e6e8dc'}" stroke="${on ? color : '#c8cfb9'}" stroke-width="1.6"/>
      <circle cx="${-r * .3}" cy="${-r * .3}" r="${r * .32}" fill="#fff" opacity="${on ? .55 : .35}"/>
      ${lbl ? `<text y="${r + 14}" text-anchor="middle" class="svl">${lbl}</text>` : ''}</g>`;
  },
  knob(id, x, y, opts, val, name, desc) {
    const on = val === opts[1];
    /* 转换把手只有两个刻字档位，当前位置由指针指出并把该档位刻字点亮，不再另写一行状态字 */
    const mark = (i, txt) => { const act = (i === 1) === on; const dx = i ? 40 : -40;
      return `<text x="${dx}" y="-30" text-anchor="${i ? 'start' : 'end'}" style="font-size:${act ? 11.5 : 10}px;font-weight:${act ? 700 : 400};fill:${act ? '#a8821b' : '#98a69c'}">${txt}</text>` +
        (act ? `<rect x="${i ? 36 : -40 - txt.length * 12}" y="-42" width="${txt.length * 12 + 8}" height="16" rx="4" fill="none" stroke="#c9a227" stroke-width="1.4"/>` : '');
    };
    return `<g class="dev ${this.T(id)}" data-dev="${id}" transform="translate(${x},${y})">
      ${this.hit(-58, -50, 116, 114)}
      <rect x="-38" y="-38" width="76" height="76" rx="8" fill="#eceee3" stroke="#c8cfb9"/>
      <circle r="24" fill="#f7f8f1" stroke="#b9c3b2" stroke-width="2"/>
      <path d="M -17 -17 A 24 24 0 0 1 17 -17" fill="none" stroke="#c8cfb9" stroke-width="1.2" stroke-dasharray="2 3"/>
      <g class="ptr" transform="rotate(${on ? 40 : -40})"><rect x="-4" y="-25" width="8" height="26" rx="3" fill="${on ? '#e8b22a' : '#1fa06b'}"/><circle r="6" fill="#dcd9c8"/></g>
      ${mark(0, opts[0])}${mark(1, opts[1])}
      <text y="52" text-anchor="middle" class="svn">${name}</text>
      ${desc ? `<text y="64" text-anchor="middle" class="svd">${desc}</text>` : ''}</g>`;
  },
  mcb(id, x, y, name, desc, off) {
    return `<g class="dev ${this.T(id)}" data-dev="${id}" transform="translate(${x},${y})">
      ${this.hit(-34, -46, 68, 108)}
      <rect x="-18" y="-36" width="36" height="72" rx="4" fill="#dfe2d2" stroke="#c8cfb9"/>
      <rect x="-12" y="-30" width="24" height="60" rx="3" fill="#eceee3"/>
      <rect class="lever" x="-9" y="${off ? 4 : -26}" width="18" height="22" rx="3" fill="${off ? '#23b26a' : '#e23b2e'}"/>
      <text x="0" y="-40" text-anchor="middle" class="svn">${name}</text>
      <text x="0" y="50" text-anchor="middle" class="svd">${desc}</text>
      <text x="0" y="62" text-anchor="middle" class="svs ${off ? 'b' : 'a'}">${off ? '断开' : '合闸'}</text></g>`;
  },
  pushbtn(id, x, y, color, lbl, pressed) {
    return `<g class="dev ${this.T(id)}" data-dev="${id}" transform="translate(${x},${y})">
      ${this.hit(-30, -30, 60, 74)}
      <circle r="22" fill="#eceee3" stroke="#c8cfb9" stroke-width="2"/>
      <circle r="15" fill="${color}" stroke="${pressed ? '#fff' : color}" stroke-width="2"/>
      <circle cx="-5" cy="-5" r="4" fill="#fff" opacity=".45"/>
      <text y="38" text-anchor="middle" class="svn">${lbl}</text></g>`;
  },
  hook(id, x, y, hung, lbl) {
    return `<g class="dev ${this.T(id)}" data-dev="${id}" transform="translate(${x},${y})">
      ${this.hit(-40, -12, 80, hung ? 78 : 30)}
      <path d="M -6 0 a 6 6 0 1 1 12 0 v 6" fill="none" stroke="#7a8478" stroke-width="2.4" stroke-linecap="round"/>
      ${hung ? this.tag(0, 10) : `<text y="26" text-anchor="middle" class="svd" style="fill:#a8821b">${lbl || '挂牌位'}</text>`}</g>`;
  },
  tag(x, y) {
    return `<g class="tagcard2" transform="translate(${x},${y})">
      <line x1="0" y1="0" x2="0" y2="8" stroke="#7a8478" stroke-width="1.5"/>
      <rect x="-34" y="8" width="68" height="46" rx="3" fill="#fff8e6" stroke="#b93a2a" stroke-width="2.4"/>
      <text x="0" y="28" text-anchor="middle" style="font-size:11px;font-weight:700;fill:#7a1414">禁止合闸</text>
      <text x="0" y="44" text-anchor="middle" style="font-size:9.5px;font-weight:700;fill:#7a1414">线路有人工作！</text></g>`;
  },
  plate(x, y, w, t1, t2) {
    return `<g transform="translate(${x},${y})"><rect x="0" y="0" width="${w}" height="34" rx="3" fill="#fff" stroke="#7a8478" stroke-width="1.6"/>
      <text x="${w / 2}" y="14" text-anchor="middle" style="font-size:10.5px;fill:#243329;font-weight:700">${t1}</text>
      <text x="${w / 2}" y="27" text-anchor="middle" style="font-size:9.5px;fill:#5c6b5f">${t2}</text></g>`;
  },
  win(id, x, y, txt, color, lbl) {
    return `<g class="dev ${this.T(id)}" data-dev="${id}" transform="translate(${x},${y})">
      ${this.hit(-40, -30, 80, 76)}
      <rect x="-30" y="-22" width="60" height="44" rx="4" fill="#dfe2d2" stroke="#b9c3b2"/>
      <rect x="-18" y="-14" width="36" height="28" rx="3" fill="#1f2d24"/>
      <text y="6" text-anchor="middle" style="font-size:16px;font-weight:700;fill:${color};font-family:monospace">${txt}</text>
      <text y="38" text-anchor="middle" class="svd">${lbl}</text>
      ${S.gis[id.replace('gis_', '')] ? `<circle cx="28" cy="-22" r="7" fill="#0e8f5a"/><path d="M 24.5 -22 l 2.4 2.6 4 -5" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>` : ''}</g>`;
  },
  arm(id, x, y, open, lbl) {
    /* 实物：机构箱输出轴上装一根扁平拐臂，末端带连杆销；拐臂转到"分"或"合"限位块处停住 */
    const a = open ? -52 : 14;
    return `<g class="dev ${this.T(id)}" data-dev="${id}" transform="translate(${x},${y})">
      ${this.hit(-44, -40, 88, 84)}
      <rect x="-30" y="-30" width="60" height="60" rx="5" fill="#e4e6d8" stroke="#b9c3b2"/>
      <path d="M -20 -20 A 28 28 0 0 1 20 -8" fill="none" stroke="#c8cfb9" stroke-width="7" stroke-linecap="round"/>
      <rect x="-24" y="-25" width="7" height="7" rx="1.5" fill="#8b988c"/><text x="-27" y="-27" text-anchor="end" class="svl">分</text>
      <rect x="17" y="-12" width="7" height="7" rx="1.5" fill="#8b988c"/><text x="27" y="-6" class="svl">合</text>
      <g transform="rotate(${a})">
        <rect x="-5.5" y="-25" width="11" height="27" rx="3" fill="#7f8a80" stroke="#5c6b5f" stroke-width="1.2"/>
        <circle cy="-25" r="4.6" fill="#c9a227" stroke="#8a6f18" stroke-width="1.2"/>
        <circle cy="-25" r="1.6" fill="#5c4a10"/>
      </g>
      <circle r="8.5" fill="#b9c3b2" stroke="#7a8478" stroke-width="1.6"/><circle r="3" fill="#8b988c"/>
      <text y="42" text-anchor="middle" class="svd">${lbl}</text>
      ${S.gis[id.replace('gis_', '')] ? `<circle cx="30" cy="-28" r="7" fill="#0e8f5a"/><path d="M 26.5 -28 l 2.4 2.6 4 -5" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>` : ''}</g>`;
  },
  shaft(id, x, y, open, lbl) {
    /* 实物：转轴外露段上刷一道白漆线，壳体上刻"分""合"两个基准线；漆线与哪个基准线对齐即为该位置 */
    const a = open ? -34 : 34;
    return `<g class="dev ${this.T(id)}" data-dev="${id}" transform="translate(${x},${y})">
      ${this.hit(-46, -34, 92, 80)}
      <rect x="-34" y="-7" width="20" height="14" rx="2" fill="#b9c3b2" stroke="#7a8478"/>
      <rect x="14" y="-7" width="20" height="14" rx="2" fill="#b9c3b2" stroke="#7a8478"/>
      <circle r="17" fill="#cfd6c8" stroke="#7a8478" stroke-width="1.6"/>
      <circle r="12" fill="#dfe2d2"/>
      <line x1="-13" y1="-13" x2="-8" y2="-8" stroke="#5c6b5f" stroke-width="2"/><text x="-17" y="-16" text-anchor="end" class="svl">分</text>
      <line x1="13" y1="-13" x2="8" y2="-8" stroke="#5c6b5f" stroke-width="2"/><text x="17" y="-16" class="svl">合</text>
      <g transform="rotate(${a})"><rect x="-2" y="-17" width="4" height="17" rx="1" fill="#f4f6ef" stroke="#8b988c" stroke-width=".8"/></g>
      <circle r="3.4" fill="#8b988c"/>
      <text y="40" text-anchor="middle" class="svd">${lbl}</text>
      <text y="30" text-anchor="middle" class="svl">漆线对准「${open ? '分' : '合'}」</text>
      ${S.gis[id.replace('gis_', '')] ? `<circle cx="32" cy="-24" r="7" fill="#0e8f5a"/><path d="M 28.5 -24 l 2.4 2.6 4 -5" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>` : ''}</g>`;
  },
  face(w, h, title, sub) {
    return `<rect x="8" y="8" width="${w - 16}" height="${h - 16}" rx="6" fill="#e9ebdf" stroke="#c8cfb9" stroke-width="2"/>
      <rect x="8" y="8" width="${w - 16}" height="30" rx="6" fill="#dfe2d2"/>
      <text x="${w / 2}" y="28" text-anchor="middle" style="font-size:12.5px;font-weight:700;fill:#243329;letter-spacing:1px">${title}</text>
      ${sub ? `<text x="${w - 20}" y="28" text-anchor="end" style="font-size:10px;fill:#5c6b5f;font-family:monospace">${sub}</text>` : ''}`;
  }
};

/* ---------- 调度电话 · 受令席 ----------
   与深圳中调的通话由监护人负责：监护人接令、复诵、记录；操作人在记录簿上记录并复诵监护人转述的下令，再核对票令一致。 */
function panelPhone(w) {
  const st = STEP(); const run = S.stage === 'run' && st && !S.ended;
  const isRep = run && st.act === 'report';
  const ring = !!S.ph.ring, conn = !!S.ph.conn;
  const stateTxt = ring ? '来电 · 深圳中调' : conn ? '通话中 · 深圳中调 李明' : '通话空闲';
  const btn = ring ? `<button class="btn pri phbtn" data-ph="answer">监护人接听</button>`
    : (isRep && !conn && S.beat >= 3) ? `<button class="btn pri phbtn" data-ph="dial">请监护人向调度汇报</button>`
      : conn ? `<button class="btn phbtn" disabled>通话中</button>` : `<button class="btn phbtn" disabled>听筒空闲</button>`;
  const taskTxt = '将110kV培训三线1163线路由运行转检修';
  const cmp = S.ph.cmp === 'wait' ? `<div class="cmpcard" data-ph="cmp"><div class="cmph">票令核对 · 第 ${st.no} 项</div>
      <div class="cmprow"><span>操作票任务</span><b>${h(st.recite || taskTxt)}</b></div>
      <div class="cmprow"><span>调度下令</span><b style="color:#a8821b">${h(S.ord.cur || '—')}</b></div>
      <div class="cmpbt"><button class="btn pri" data-ph="cmpok">票令一致，接令</button><button class="btn dan" data-ph="cmpno">不一致，中止汇报</button></div></div>` : '';
  const talk = (S.chat || []).filter(c => c.who === 'd' || (c.who === 'o' && /仿真站|复诵|汇报|已由|已断开|已转/.test(c.text))).slice(-4);
  const talkHTML = `<div class="phtalk"><div class="pht">通话记录 · 与深圳中调</div>${talk.length ? talk.map(c => `<div class="ptl ${c.who}"><i>${c.who === 'd' ? '调' : '站'}</i><span>${h(c.text)}</span></div>`).join('') : '<div class="ptl"><span style="color:#98a69c">—</span></div>'}</div>`;
  const log = S.ph.log || [];
  w.innerHTML = pnl('调度电话 · 受令席', '110kV仿真站 · 与深圳中调的联系由监护人负责', `
    <div class="ph2">
      <div class="handset ${ring ? 'ringing' : ''} ${conn ? 'conn' : ''}">
        <div class="ring"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="${conn ? '#fff' : 'var(--acd)'}" stroke-width="1.8">
          <path d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.6 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.6 3.6a1 1 0 0 1-.25 1z"/></svg></div>
        <div class="nm">${ring ? '深圳中调 来电' : conn ? '深圳中调 · 李明' : '深圳中调'}</div>
        <div class="de">${stateTxt}</div>
        <div class="phact">${btn}</div>
        <div class="phrule">接令规范：先互报单位和姓名。调度报「深圳中调 李明」，本站报「110kV仿真站 陈志远」。</div>
      </div>
      <div class="reclog">
        <div class="row"><div class="k">发令单位</div><div class="v"><select id="o_unit" ${ring ? 'disabled' : ''}><option value="">听令时记录</option>${['深圳中调', '深圳地调', '本站值班负责人'].map(x => `<option${S.ord.unit === x ? ' selected' : ''}>${x}</option>`).join('')}</select></div></div>
        <div class="row"><div class="k">发令人</div><div class="v"><input id="o_from" value="${h(S.ord.from)}" placeholder="调度员姓名" ${ring ? 'disabled' : ''}></div></div>
        <div class="row"><div class="k">受令人</div><div class="v">${h(S.ord.to)}</div></div>
        <div class="row"><div class="k">受令时间</div><div class="v" id="o_time">${S.ord.time || '—'}</div></div>
        <div class="row"><div class="k">发令时间</div><div class="v">${S.ord.issued || '—'}</div></div>
        <div class="row"><div class="k">操作任务</div><div class="v">${taskTxt}</div></div>
        <div class="row"><div class="k">当前下令</div><div class="v" style="color:#a8821b">${h(S.ord.cur || '—')}</div></div>
      </div>
      <div class="phr">${cmp || talkHTML}</div>
    </div>`) +
    pnl('调度操作指令记录簿', `${log.length} 条 · 每次接令、汇报都记在这里`, `
    <table class="logtb"><tr><th>序号</th><th>受令时间</th><th>发令单位 · 发令人</th><th>指令内容</th><th>发令时间</th><th>汇报时间</th></tr>
    ${log.length ? log.map((r, i) => `<tr class="${i === log.length - 1 ? 'cur' : ''}"><td>${i + 1}</td><td>${r.recv || '—'}</td><td>${h(r.unit || '—')} · ${h(r.from || '—')}</td><td>${h(r.order)}</td><td>${r.issued || '—'}</td><td>${r.reported || '—'}</td></tr>`).join('') : '<tr><td colspan="6" style="color:#98a69c;text-align:center">尚无记录 · 接到第一次调度令后自动登记</td></tr>'}
    </table>`);
  const u = $('#o_unit'), f = $('#o_from');
  if (u) u.onchange = e => { S.ord.unit = e.target.value; renderTaskbar(); };
  if (f) f.oninput = e => { S.ord.from = e.target.value; renderTaskbar(); };
  $$('#panelwrap [data-ph]').forEach(n => { if (n.tagName === 'BUTTON') n.onclick = e => { e.stopPropagation(); phoneAct(n.dataset.ph); }; });
}
function phoneAct(k) {
  if (k === 'answer') answerPhone(); else if (k === 'dial') dialPhone(); else if (k === 'cmpok') cmpResult(true); else if (k === 'cmpno') cmpResult(false);
}
/* 监护人接令：互报单位姓名 → 调度下令 → 监护人向调度复诵 → 调度确认 → 监护人转述给操作人 */
async function answerPhone() {
  if (S.ph.ring) return _answerPhone();
}
async function _answerPhone() {
  const st = STEP(); const call = S.ph.pending;
  S.ph.ring = false; S.ph.conn = true; S.ord.time = stamp(); S.ord.issued = '';
  const order = call.replace(/^现在调度下令：/, '').replace(/。$/, '');
  S.ph.log.push({ no: st.no, phase: st.phase, recv: S.ord.time.slice(11), unit: '', from: '', order, issued: '', reported: '' });
  renderPanel();
  useChar('jianhu');
  say('j', '110kV仿真站，陈志远。');
  await speak('110kV仿真站，陈志远。', { pose: 'explain', who: '监护人 陈志远' });
  useChar('diaodu');
  say('d', '深圳中调，李明。' + call);
  await speak('深圳中调，李明。' + call, { pose: 'explain', who: '值班调度员 李明' });
  S.ord.cur = order; renderPanel();
  useChar('jianhu');
  say('j', order + '。');
  await speak(order + '。', { pose: 'call', who: '监护人 陈志远' });
  useChar('diaodu');
  say('d', '复诵正确。');
  await speak('复诵正确。', { pose: 'explain', nod: 1, who: '值班调度员 李明' });
  S.ord.issued = now().slice(0, 5); const lg = S.ph.log[S.ph.log.length - 1]; if (lg) lg.issued = S.ord.issued;
  S.ph.conn = false; renderPanel();
  useChar('jianhu');
  say('j', '任玲玲，' + call);
  await speak('任玲玲，' + call, { pose: 'call', who: '监护人 陈志远' });
  setBeat(1);
  say('s', '把发令单位、发令人记进记录簿，然后复诵调度下令。');
}
/* 汇报：由监护人向调度汇报本段完成情况 */
async function dialPhone() {
  if (S.ph.conn) return;
  const st = STEP();
  S.ph.conn = true; renderPanel();
  useChar('jianhu');
  say('j', '深圳中调，110kV仿真站陈志远。');
  await speak('深圳中调，110kV仿真站陈志远。', { pose: 'call', who: '监护人 陈志远' });
  useChar('diaodu');
  say('d', '深圳中调，李明。');
  await speak('深圳中调，李明。', { pose: 'explain', who: '值班调度员 李明' });
  useChar('jianhu');
  say('j', st.recite + '。');
  await speak(st.recite + '。', { pose: 'call', who: '监护人 陈志远' });
  await doPhone(st);
}
async function cmpResult(ok) {
  if (S.ph.cmp !== 'wait' || S.lock) return;
  const st = STEP();
  S.ph.cmp = ok ? 'ok' : 'no';
  if (st.trap === 'order' && S.trap.fired && S.trap.passed === null) {
    if (!ok) {
      S.trap.passed = true;
      praise('rule', '票令不一致识别正确', '调度下令为"由运行转冷备用"，操作票任务为"由热备用转冷备用"，接令时核出并中止汇报');
      say('o', '票令不一致：调度令是"由运行转冷备用"，操作票本段是"由热备用转冷备用"。中止，汇报值班长。');
      useChar('jianhu');
      await speak('对，票令不一致，不能执行。中止并汇报值班长，请调度核实后重新下令。', { pose: 'confirm', nod: 1, who: '监护人 陈志远' });
    } else {
      S.trap.passed = false;
      violation('major', 'rule', '票令不一致未发现',
        '调度下令为"由运行转冷备用"，操作票任务为"由热备用转冷备用"，票令核对时判为一致',
        '细则第十八条：接到调度正式指令后，应再次"三审"，核实操作票内容是否与调度正式指令一致。');
      useChar('jianhu');
      await speak('等一下。刚才调度下的令是"由运行转冷备用"，我们的操作票这一段是"由热备用转冷备用"。票令不一致，必须中止并汇报值班长。这一项你没有核出来。',
        { pose: 'stop', shake: true, who: '监护人 陈志远' });
    }
    await reissueOrder();
    return;
  }
  if (!ok) {
    S.ph.cmp = 'wait'; renderPanel();
    if (lenient('cmp')) { say('s', '<span class="tag wn">提醒</span>再对一遍：调度下令与操作票任务是一致的。教学模式下这一次不计违规。'); }
    else violation('minor', 'rule', '票令核对误判', '调度下令与操作票任务一致，却判为不一致并中止', '细则第十八条：核实操作票内容是否与调度正式指令一致。');
    useChar('jianhu');
    await speak('你再对一遍，调度令和操作票任务是一致的。', { pose: 'correct' });
    return;
  }
  say('o', '操作票操作任务与调度下令内容一致。');
  useChar('jianhu');
  /* 这一步只是核对票令是否一致，监护人回"收到"，不是发执行令 */
  say('j', '收到。');
  await speak('收到。', { pose: 'confirm', nod: 1, who: '监护人 陈志远' });
  setBeat(3);
  doPhone(st);
}

/* ---------- 五防电脑 · 模拟预演 ---------- */
const WF_LOCK = {
  DS11634: d => d.CB1163 !== 'open' ? ['培训三线1163开关在合闸位置，此时拉开11634刀闸属于带负荷拉刀闸', '刀闸没有灭弧能力，必须先断开开关切断负荷电流，再拉刀闸'] : null,
  DS11632: d => d.CB1163 !== 'open' ? ['培训三线1163开关在合闸位置，此时拉开11632刀闸属于带负荷拉刀闸', '刀闸没有灭弧能力，必须先断开开关切断负荷电流，再拉刀闸'] : d.DS11634 !== 'open' ? ['线路侧11634刀闸尚未拉开，先拉开母线侧刀闸，顺序错误', '停电应先拉开线路侧刀闸、再拉开母线侧刀闸，使检修段两侧依次形成明显断开点'] : null,
  ES116340: d => (d.DS11634 !== 'open' || d.DS11632 !== 'open' || d.CB1163 !== 'open') ? ['11634、11632刀闸未全部拉开，线路可能带电，禁止合上116340地刀', '防止带电合接地刀闸'] : null
};
function panelWufang(w) {
  if (S.stage === 'run') return panelWfKey(w);
  if (!S.wfdev) S.wfdev = Object.assign({}, S.dev);
  const done = WUFANG.slice(0, S.wf).map(x => x[0]);
  const target = S.wf < 4 ? WUFANG[S.wf][0] : null;
  w.innerHTML = pnl('五防主机 · 模拟预演', `已模拟 ${S.wf}/4 · 电脑钥匙在线`, `
    <div class="wfhead">操作任务已输入：<b>将110kV培训三线1163线路由运行转检修</b>
      <span class="r">${S.wf >= 4 ? '<b style="color:var(--ac)">模拟顺序正确 · 操作票已生成</b>' : `第 ${S.wf + 1} 步：在模拟接线图上点击「${devName(target)}」`}</span></div>
    <div class="sld">${sld({ dev: S.wfdev, sim: true, target, done, scada: false, chg: S.lastChg })}</div>
    ${S.wf >= 4 ? `<div class="wfok">模拟顺序正确：先断开1163开关，再依次拉开11634、11632刀闸；后合上116340地刀。前几项操作均在后台执行，暂不下传电脑钥匙。</div>` : ''}`);
}
/* 执行阶段的五防电脑：把已模拟通过的操作票下传到电脑钥匙，汇控柜、机构箱才解得开锁 */
function panelWfKey(w) {
  const st = STEP(); const tgt = st && st.act === 'key';
  const down = S.key.down;
  w.innerHTML = pnl('五防主机 · 电脑钥匙', down ? '已下传 · 钥匙在监护人手上' : '模拟已通过 · 未下传', `
    <div class="scene"><svg viewBox="0 0 760 250">
      ${SVX.face(760, 250, '五防主机 · 微机防误装置', 'PPS-2000')}
      <g transform="translate(40,58)"><rect x="0" y="0" width="330" height="164" rx="5" fill="#2b3a31" stroke="#1f2d24"/>
        <text x="16" y="24" style="font-size:11px;fill:#8fe0b4;font-family:monospace">模拟操作票 · 已通过</text>
        ${(WUFANG || []).map((x, i) => `<text x="16" y="${46 + i * 22}" style="font-size:10.5px;fill:#7ecfa4;font-family:monospace">√ ${i + 1}. ${x[1]}</text>`).join('')}
        <text x="16" y="146" style="font-size:10.5px;fill:${down ? '#8fe0b4' : '#e8b22a'};font-family:monospace">${down ? '● 已下传至电脑钥匙，钥匙按此顺序解锁' : '○ 尚未下传，汇控柜与机构箱无法解锁'}</text>
      </g>
      <g class="dev ${tgt ? 'tgt ' : ''}" data-dev="WFKEY" transform="translate(500,120)">
        ${SVX.hit(-90, -66, 250, 132)}
        <rect x="-70" y="-40" width="120" height="80" rx="6" fill="#dfe2d2" stroke="#b9c3b2" stroke-width="1.6"/>
        <text x="-10" y="-22" text-anchor="middle" class="svn">电脑钥匙</text>
        <rect x="-52" y="-12" width="84" height="30" rx="4" fill="${down ? '#0f1a14' : '#eceee3'}" stroke="#b9c3b2"/>
        <text x="-10" y="8" text-anchor="middle" style="font-size:11px;font-family:monospace;fill:${down ? '#8fe0b4' : '#98a69c'}">${down ? '票已下传' : '空 票'}</text>
        ${SVX.lamp(-10, 30, down, '#23b26a', '', 5)}
        <path d="M 58 0 h 26" stroke="#8b988c" stroke-width="2" stroke-dasharray="${down ? '0' : '4 3'}"/>
        <rect x="86" y="-16" width="20" height="32" rx="3" fill="#c8cfb9" stroke="#7a8478"/><rect x="100" y="-6" width="18" height="12" rx="2" fill="#c8cfb9" stroke="#7a8478"/>
        <text x="100" y="34" text-anchor="middle" class="svd">钥匙口</text>
        <text x="-10" y="58" text-anchor="middle" class="svs ${down ? 'b' : 'a'}">${down ? '已下传 · 监护人保管' : '待下传'}</text>
      </g>
    </svg></div>
    <div class="baytip">汇控柜与机构箱的锁具由电脑钥匙解锁。钥匙里只有下传过的这份票，按模拟顺序逐把开锁，顺序不对开不了，这是防误的最后一道关口。</div>`);
}
function wfDev(id) {
  const idx = WUFANG.findIndex(x => x[0] === id);
  if (idx < 0) { if (/^(CB|DS|ES)/.test(id)) toast('该设备不在本次操作票内', ''); return; }
  if (idx < S.wf) { toast('该项已模拟完成', ''); return; }
  if (idx === S.wf) { wfClick(idx); return; }
  const lk = WF_LOCK[id] ? WF_LOCK[id](S.wfdev) : null;
  openInterlock(WUFANG[idx][1], lk ? lk[0] : `须先模拟第 ${S.wf + 1} 步「${WUFANG[S.wf][1]}」`, lk ? lk[1] : '按操作票顺序逐项模拟');
}
function openInterlock(item, why, rule) {
  if ($('.dlg.lock')) return;
  const m = el('div', 'mask lite');
  m.innerHTML = `<div class="dlg red lock" style="width:min(520px,96vw)">
    <div class="dh"><b>五防闭锁</b><span class="mono">微机防误 · 模拟预演</span><span class="cls">×</span></div>
    <div class="db">
      <div class="sec"><div class="st">操作项目</div><div class="sc quote">${item}</div></div>
      <div class="sec"><div class="st">闭锁原因</div><div class="sc" style="color:#b3372c">${why}</div></div>
      <div class="sec"><div class="st">防误规则</div><div class="sc" style="font-size:12px;color:#5c6b5f">${rule}</div></div>
    </div>
    <div class="df"><button class="btn pri" id="lk_ok">知道了，按顺序模拟</button></div></div>`;
  document.body.appendChild(m);
  const close = () => m.remove();
  m.querySelector('.cls').onclick = close; m.querySelector('#lk_ok').onclick = close;
  say('s', `<span class="tag wn">五防闭锁</span>${item}：${why}。`);
  speak('五防闭锁了。按操作票的顺序来。', { pose: 'correct', shake: true, show: '五防闭锁了。' + why + '。按操作票的顺序来。' });
}

/* ---------- 监控后台 ---------- */
function panelHmi(w) {
  w.innerHTML =
    pnl('监控后台 · 一次接线图', '点击设备：遥控操作 / 查看详情', `<div class="sld">${sld({ scada: true, chg: S.lastChg })}</div>`) +
    pnl('操作报文与告警', 'SOE', `<div class="msgs" id="msgs"></div>`);
  renderMsgs();
}
function openRemoteCtl(st) {
  if ($('.dlg.rc')) return;
  const id = st.target, want = st.act === 'closeE' ? 'close' : 'open', cur = S.dev[id];
  const m = el('div', 'mask lite');
  m.innerHTML = `<div class="dlg rc" style="width:min(540px,96vw)">
    <div class="dh"><b>遥控操作</b><span class="mono">110kV仿真站 · 监控后台</span><span class="cls">×</span></div>
    <div class="db">
      <div class="rcrow"><span>设备双重名称</span><b>${devName(id)}</b></div>
      <div class="rcrow"><span>当前位置</span><b class="${cur === 'close' ? 'on' : 'off'}">${cur === 'close' ? '合闸' : '分闸'}</b></div>
      <div class="rcrow"><span>操作性质</span><span class="rcops"><label><input type="radio" name="rcop" value="open"> 分闸</label><label><input type="radio" name="rcop" value="close"> 合闸</label></span></div>
      <div class="rcst" id="rc_st">核对设备双重名称与操作性质，选定后系统自动预置</div>
    </div>
    <div class="df"><button class="btn" id="rc_cancel">取消</button><button class="btn pri" id="rc_exec" disabled>执行</button></div></div>`;
  document.body.appendChild(m);
  const stx = m.querySelector('#rc_st'), ex = m.querySelector('#rc_exec');
  const close = () => m.remove();
  m.querySelector('.cls').onclick = close; m.querySelector('#rc_cancel').onclick = close;
  m.querySelectorAll('input[name=rcop]').forEach(r => r.onchange = async () => {
    if (r.value !== want) {
      r.checked = false;
      violation('major', 'order', '遥控操作性质错误', `本项应${want === 'open' ? '分闸' : '合闸'}${devName(id)}，选择了${r.value === 'open' ? '分闸' : '合闸'}`, '附录F 2.11.3：按操作票项目的操作性质执行，遥控操作前核对设备双重名称与操作性质。');
      stx.innerHTML = '<span style="color:#b3372c">操作性质与票面不符，已拒绝</span>';
      speak('操作性质选错了。再核对一遍票面。', { pose: 'correct', shake: true });
      return;
    }
    /* 预置由系统自动完成，不需要人再点一次 */
    m.querySelectorAll('input[name=rcop]').forEach(x => x.disabled = true);
    stx.textContent = '已选择' + (want === 'open' ? '分闸' : '合闸') + '，正在预置…';
    await sleepMs(700);
    if (!document.body.contains(m)) return;
    stx.innerHTML = '<span style="color:var(--ac)">预置完成，可以执行</span>';
    ex.disabled = false;
  });
  ex.onclick = async () => {
    ex.disabled = true; stx.textContent = '执行中…';
    await sleepMs(500);
    m.remove();
    doExecute(st);
  };
}
/* 核对类项目：把要看的东西放大给学员看，逐项勾选后确认 */
function openInspect(st) {
  if ($('.dlg.insp')) return;
  const id = st.target, d = S.dev;
  const lampRow = (vals, on, color) => `<div class="lamprow">${vals.map(p => `<span class="lp ${on ? 'on' : ''}" style="--c:${color}"><i></i>${p}</span>`).join('')}</div>`;
  let title = '', body = '', chks = [], okTxt = '核对无误', after = null;
  if (id === 'hmi_mode') { title = '光字牌 · 运行方式'; body = `<div class="kv"><span>母线方式</span><b>110kV 1M、2M 并列运行</b></div><div class="kv"><span>培训三线1163</span><b>开关${d.CB1163 === 'open' ? '分闸' : '合闸'}，11632、11634刀闸${d.DS11634 === 'open' ? '拉开' : '合上'}</b></div><div class="kv"><span>告警</span><b>无影响本次操作的光字、告警与报文</b></div>`; chks = ['母线运行方式', '1163间隔设备位置', '光字与告警']; }
  else if (id === 'CB1163') { title = '设备详情 · 培训三线1163开关'; body = `<div class="kv"><span>位置遥信</span><b class="${d.CB1163 === 'open' ? 'off' : 'on'}">${d.CB1163 === 'open' ? '分闸' : '合闸'}</b></div><div class="kv"><span>最近报文</span><b>${(S.msgs[0] || {}).x || '—'}</b></div><div class="kv"><span>三相电流</span><b>${d.CB1163 === 'open' ? 'Ia 0.0 Ib 0.0 Ic 0.0 A' : 'Ia 312 Ib 308 Ic 315 A'}</b></div>`; chks = ['位置遥信', '变位报文']; }
  else if (id === 'hmi_current') { title = '遥测 · 1163开关三相电流'; body = `<div class="kv big"><span>Ia</span><b>${d.CB1163 === 'open' ? '0.0' : '312'} A</b></div><div class="kv big"><span>Ib</span><b>${d.CB1163 === 'open' ? '0.0' : '308'} A</b></div><div class="kv big"><span>Ic</span><b>${d.CB1163 === 'open' ? '0.0' : '315'} A</b></div>`; chks = ['A 相', 'B 相', 'C 相']; }
  else if (id === 'hmi_volt') { title = '遥测 · 培训三线线路二次电压'; body = `<div class="kv big"><span>Uab</span><b>${d.DS11634 === 'open' ? '0.0' : '99.6'} V</b></div><div class="kv big"><span>Uo</span><b>${d.DS11634 === 'open' ? '0.0' : '0.1'} V</b></div><div class="kv"><span>结论</span><b>${d.DS11634 === 'open' ? '二次确无电压（第一种原理）' : '二次有电压'}</b></div>`; chks = ['Uab', 'Uo']; }
  else if (id === 'bay_plate') { title = '间隔名称牌 · 图实、标实核对'; body = `<div class="plate">110kV培训三线1163<small>双重名称：培训三线 · 1163</small></div><div class="kv"><span>接线图 ↔ 现场实物</span><b>汇控柜模拟图与现场设备布置一致</b></div><div class="kv"><span>设备标签</span><b>11632 · 1163 · 11634 · 116340 标签清晰准确</b></div>`; chks = ['间隔名称牌双重名称', '图实一致', '标实一致']; okTxt = '核对完毕'; after = () => { S.gis.plate = S.gis.draw = S.gis.label = true; }; }
  else if (id === 'bay_hvdisp') { title = '高压带电显示装置 · 培训三线1163间隔'; body = lampRow(['A 相', 'B 相', 'C 相'], d.DS11634 !== 'open', '#e23b2e') + `<div class="kv"><span>显示</span><b>${d.DS11634 !== 'open' ? '三相确有电压' : '三相无电压'}</b></div>`; chks = ['A 相', 'B 相', 'C 相']; okTxt = '核对完毕：三相确有电压'; after = () => { S.gis.hv = true; }; }
  else if (id === 'cab_hvdisp') { title = '高压带电显示装置 · 间接验电（第二种原理）'; body = lampRow(['A 相', 'B 相', 'C 相'], d.DS11634 !== 'open', '#e23b2e') + `<div class="kv"><span>显示</span><b>${d.DS11634 === 'open' ? '三相确无电压' : '三相有电压'}</b></div><div class="kv"><span>与后台二次电压</span><b>${S.verify.v1 ? '已核对：两种原理指示均已变化' : '<span style="color:#b3372c">后台二次电压尚未核对</span>'}</b></div>`; chks = ['A 相', 'B 相', 'C 相']; okTxt = '核对完毕：三相确无电压'; after = () => { S.gis.hvA = S.gis.hvB = S.gis.hvC = true; }; }
  else if (st.act === 'gis') { title = `${devName(id)} · 后台位置`; body = `<div class="kv"><span>后台位置</span><b class="${id === 'ES116340' ? 'gnd' : 'off'}">${id === 'ES116340' ? '合上' : '拉开'}</b></div><div class="kv"><span>报文</span><b>${(S.msgs[0] || {}).x || '—'}</b></div><div class="kv"><span>下一步</span><b>到现场按设备结构核对汇控柜电气指示、机构箱机械指示、拐臂指示、转轴划线标识</b></div>`; chks = ['后台位置', '报文']; okTxt = '后台已核对，去现场核对四项指示'; }
  else { title = devName(id); body = `<div class="kv"><span>状态</span><b>${d[id] || '—'}</b></div>`; chks = ['状态']; }
  const m = el('div', 'mask lite');
  m.innerHTML = `<div class="dlg insp" style="width:min(560px,96vw)">
    <div class="dh"><b>${title}</b><span class="mono">第 ${st.no} 项 · 核对</span><span class="cls">×</span></div>
    <div class="db">${body}<div class="chkl">${chks.map((c, i) => `<span data-chk="${i}"><i></i>${c}</span>`).join('')}</div></div>
    <div class="df"><button class="btn" id="ins_cancel">取消</button><button class="btn pri" id="ins_ok" disabled>${okTxt}</button></div></div>`;
  document.body.appendChild(m);
  const close = () => m.remove();
  m.querySelector('.cls').onclick = close; m.querySelector('#ins_cancel').onclick = close;
  const ok = m.querySelector('#ins_ok');
  m.querySelectorAll('[data-chk]').forEach(c => c.onclick = () => { c.classList.toggle('on'); ok.disabled = m.querySelectorAll('[data-chk].on').length < chks.length; });
  ok.onclick = () => { m.remove(); if (after) after(); doExecute(st); };
}
/* GIS 四项指示：点一项，放大看一眼，打钩 */
function gisInspect(k) {
  const st = STEP(); const id = (st && st.act === 'gis') ? st.target : 'DS11634';
  S.gis[k] = true;
  const anomaly = (S.abn.fired && !S.abn.handled && id === 'DS11634' && k === 'mech');
  const want = id === 'ES116340' ? '合上位置' : '拉开位置';
  const nm = { hui: '汇控柜电气指示', mech: '机构箱机械指示', arm: '刀闸拐臂指示', line: '转轴划线标识' }[k];
  renderPanel();
  const old = $('#peek'); if (old) old.remove();
  const p = el('div', 'peek ' + (anomaly ? 'bad' : 'ok'));
  p.id = 'peek';
  p.innerHTML = `<b>${nm}</b><span>${anomaly ? `指示为「合上」，与后台「拉开」<em>不一致</em>` : `${want} · 与后台一致`}</span>` + (anomaly ? `<button class="btn dan" id="pk_stop">中止操作并上报</button>` : '');
  $('#panelwrap').appendChild(p);
  const b = $('#pk_stop'); if (b) b.onclick = () => { p.remove(); clickStop(); };
  if (!anomaly) setTimeout(() => { if (p.parentNode) p.remove(); }, tms(2600));
}

/* ---------- 间隔现场 ---------- */
function panelBay(w) {
  const st = STEP(); const d = S.dev;
  const gisId = st && st.act === 'gis' ? st.target : 'DS11634';
  const open = gisId === 'ES116340' ? d.ES116340 === 'close' : d[gisId] === 'open';
  const anomaly = (S.abn.fired && !S.abn.handled && gisId === 'DS11634');
  const es = gisId === 'ES116340';
  const picked = !!S.bay, right = S.bay === '1163';
  const bays = ['1161', '1162', '1163'].map((n, i) => {
    const x = 28 + i * 246, cur = S.bay === n, live = n !== '1163' || d.CB1163 !== 'open';
    return `<g data-bay="${n}" class="bayg ${cur ? 'cur' : ''}" style="cursor:pointer" transform="translate(${x},4)">
      <rect class="bayhit" x="0" y="0" width="222" height="150" rx="8" fill="${cur ? 'rgba(14,143,90,.08)' : 'transparent'}" stroke="${cur ? '#0e8f5a' : '#d7dccb'}" stroke-dasharray="${cur ? '0' : '4 4'}"/>
      <rect x="0" y="26" width="222" height="22" rx="11" fill="#d8dcc9" stroke="#c3c9b6"/>
      <rect x="0" y="26" width="222" height="8" rx="4" fill="#c9c6b0" opacity=".7"/>
      <rect x="86" y="48" width="46" height="66" rx="9" fill="#dcdfcf" stroke="#c3c9b6"/>
      <rect x="96" y="56" width="26" height="12" rx="3" fill="#eceee3"/>
      <circle cx="109" cy="16" r="9" fill="#f1f3e8" stroke="#c3c9b6"/>
      <rect x="150" y="60" width="46" height="54" rx="4" fill="#e4e6d8" stroke="#c3c9b6"/>
      <text x="173" y="76" text-anchor="middle" style="font-size:8.5px;fill:#5c6b5f;font-family:monospace">汇控柜</text>
      ${SVX.lamp(163, 94, live, live ? '#e23b2e' : '#23b26a', '', 4)}${SVX.lamp(183, 94, !live, '#23b26a', '', 4)}
      <text x="109" y="12" text-anchor="middle" style="font-size:9.5px;fill:${cur ? (n === '1163' ? '#0a6b44' : '#b3372c') : '#98a69c'}">${cur ? (n === '1163' ? '当前站位' : '当前站位 · 走错间隔') : '点此走到该间隔'}</text>
      ${SVX.plate(31, 116, 160, `110kV培训${n === '1161' ? '一' : n === '1162' ? '二' : '三'}线 ${n}`, `110kV ${n === '1161' ? '1M' : '2M'} 侧 · ${live ? '运行中' : '停电'}`)}
    </g>`;
  }).join('');
  const Y = 172;
  if (!right) {
    w.innerHTML = pnl('110kV GIS 间隔现场', picked ? `当前站位：培训${S.bay === '1161' ? '一' : '二'}线${S.bay}间隔 · 走错间隔` : '三个间隔外观一样 · 先看间隔名称牌，自己选要进的间隔', `
      <div class="scene"><svg viewBox="0 0 760 172">${bays}</svg></div>
      <div class="baytip ${picked ? 'bad' : ''}">${picked ? '这里是培训' + (S.bay === '1161' ? '一' : '二') + '线' + S.bay + '间隔，仍在运行中。本项的操作对象在培训三线1163间隔，请重新核对间隔名称牌。' : '到达每一个操作地点，先核对间隔名称，再核对设备双重名称。选错间隔会被记为走错间隔。'}</div>`);
    return;
  }
  w.innerHTML = pnl('110kV GIS 间隔现场 · 培训三线1163间隔', '当前站位正确 · 先核对间隔名称与设备双重名称，再找操作对象', `
    <div class="scene"><svg viewBox="0 0 760 412">${bays}
      <line x1="20" y1="${Y - 6}" x2="740" y2="${Y - 6}" stroke="#d7dccb" stroke-dasharray="4 4"/>
      <text x="20" y="${Y + 10}" style="font-size:10px;fill:#5c6b5f;letter-spacing:1px">1163 间隔 · 现场核对</text>
      <g class="dev ${SVX.T('bay_plate')}" data-dev="bay_plate" transform="translate(20,${Y + 22})">${SVX.hit(-4, -6, 178, 46)}${SVX.plate(0, 0, 170, '110kV培训三线1163', '间隔名称牌 · 双重名称')}</g>
      <g class="dev ${SVX.T('bay_label')}" data-dev="bay_label" transform="translate(20,${Y + 78})">${SVX.hit(-4, -6, 178, 40)}
        ${['11632', '1163', '11634', '116340'].map((t, i) => `<rect x="${i * 43}" y="0" width="40" height="24" rx="2" fill="#fff" stroke="#7a8478"/><text x="${i * 43 + 20}" y="16" text-anchor="middle" style="font-size:9px;font-family:monospace;fill:#243329">${t}</text>`).join('')}
        <text x="85" y="38" text-anchor="middle" class="svd">设备标签 · 标实一致</text></g>
      <g class="dev ${SVX.T('bay_draw')}" data-dev="bay_draw" transform="translate(20,${Y + 130})">${SVX.hit(-4, -6, 178, 104)}
        <rect x="0" y="0" width="170" height="82" rx="4" fill="#f7f8f1" stroke="#7a8478"/>
        <text x="85" y="14" text-anchor="middle" style="font-size:9px;fill:#5c6b5f">汇控柜模拟接线图</text>
        <line x1="85" y1="20" x2="85" y2="74" stroke="#5c6b5f" stroke-width="2"/>
        ${[['DS11632', 30], ['CB1163', 46], ['DS11634', 62]].map(([k, y]) => `<circle cx="85" cy="${y}" r="5" fill="${d[k] === 'open' ? '#23b26a' : '#e23b2e'}"/><text x="96" y="${y + 3}" style="font-size:8px;font-family:monospace;fill:#5c6b5f">${k.slice(2)}</text>`).join('')}
        <circle cx="60" cy="68" r="5" fill="${d.ES116340 === 'close' ? '#e8b22a' : '#23b26a'}"/><text x="18" y="71" style="font-size:8px;font-family:monospace;fill:#5c6b5f">116340</text>
        <text x="85" y="96" text-anchor="middle" class="svd">接线图 ↔ 现场实物 · 图实一致</text></g>
      <g class="dev ${SVX.T('bay_hvdisp')}" data-dev="bay_hvdisp" transform="translate(228,${Y + 22})">${SVX.hit(-6, -6, 150, 96)}
        <rect x="0" y="0" width="138" height="84" rx="5" fill="#eceee3" stroke="#b9c3b2"/>
        <text x="69" y="15" text-anchor="middle" style="font-size:9.5px;fill:#243329">高压带电显示装置</text>
        ${['A', 'B', 'C'].map((p, i) => SVX.lamp(28 + i * 41, 44, d.DS11634 !== 'open', '#e23b2e', p + ' 相', 9)).join('')}
        <text x="69" y="78" text-anchor="middle" class="svs ${d.DS11634 !== 'open' ? 'a' : 'b'}">${d.DS11634 !== 'open' ? '确有电压' : '无电压'}</text></g>
      <g transform="translate(228,${Y + 118})"><rect x="0" y="0" width="138" height="114" rx="5" fill="#eceee3" stroke="#b9c3b2"/>
        <text x="69" y="15" text-anchor="middle" style="font-size:9.5px;fill:#243329">汇控柜 · 电气位置指示</text>
        ${[['DS11632', '11632'], ['CB1163', '1163'], ['DS11634', '11634'], ['ES116340', '116340']].map(([k, n], i) => { const on = k === 'ES116340' ? d[k] === 'close' : d[k] !== 'open'; return `<text x="12" y="${38 + i * 20}" style="font-size:9px;font-family:monospace;fill:#5c6b5f">${n}</text>${SVX.lamp(88, 34 + i * 20, on, k === 'ES116340' ? '#e8b22a' : '#e23b2e', '', 5)}${SVX.lamp(112, 34 + i * 20, !on, '#23b26a', '', 5)}`; }).join('')}
        <text x="88" y="108" text-anchor="middle" class="svl">合</text><text x="112" y="108" text-anchor="middle" class="svl">分</text>
        <g class="dev ${SVX.T('gis_hui')}" data-dev="gis_hui" transform="translate(100,${gisId === 'DS11632' ? 34 : gisId === 'DS11634' ? 74 : gisId === 'ES116340' ? 94 : 54})">${SVX.hit(-30, -12, 60, 24)}${S.gis.hui ? `<circle cx="30" cy="-10" r="7" fill="#0e8f5a"/><path d="M 26.5 -10 l 2.4 2.6 4 -5" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>` : ''}</g></g>
      <text x="470" y="${Y + 12}" style="font-size:10.5px;fill:#243329;font-weight:700">${devName(gisId)} · 机构与位置指示</text>
      ${SVX.win('gis_mech', 520, Y + 74, anomaly ? '合' : (es ? '合' : '分'), anomaly ? '#e23b2e' : (es ? '#e8b22a' : '#23b26a'), '机构箱机械指示')}
      ${SVX.arm('gis_arm', 640, Y + 74, es ? false : open, '刀闸拐臂指示')}
      ${SVX.shaft('gis_line', 560, Y + 176, es ? false : open, '转轴划线标识')}
      <text x="660" y="${Y + 152}" text-anchor="middle" style="font-size:9.5px;fill:#98a69c">按设备结构逐项核对</text>
      <text x="660" y="${Y + 166}" text-anchor="middle" style="font-size:9.5px;fill:#98a69c">四项一致后回报</text>
      ${anomaly ? `<g transform="translate(470,${Y + 196})"><rect x="0" y="0" width="276" height="34" rx="4" fill="#fbe9e7" stroke="#eac1bb"/><text x="138" y="14" text-anchor="middle" style="font-size:9.5px;fill:#b3372c">现场机构箱机械指示与监控后台位置显示不一致</text><text x="138" y="27" text-anchor="middle" style="font-size:9px;fill:#b3372c">细则第十四条：凡变化必上报，立即中止操作并上报</text></g>` : ''}
    </svg></div>`);
}

/* ---------- 8P 测控屏 ---------- */
function panelP8(w) {
  const d = S.dev; const cb = d.CB1163 !== 'open', loc = d.K1QK === '就地';
  w.innerHTML = pnl('8P 110kV培训三线1163线路测控屏', '屏柜名称已核对 · 把手会转、按钮会亮、标志牌挂在按钮上', `
    <div class="scene"><svg viewBox="0 0 760 330">
      ${SVX.face(760, 330, '8P 110kV培训三线1163线路测控屏', 'CSI-200E')}
      <g transform="translate(40,60)"><rect x="0" y="0" width="270" height="132" rx="5" fill="#2b3a31" stroke="#1f2d24"/>
        <rect x="14" y="12" width="242" height="72" rx="3" fill="#0f1a14"/>
        <text x="24" y="32" style="font-size:11px;fill:#8fe0b4;font-family:monospace">培训三线1163  测控装置</text>
        <text x="24" y="50" style="font-size:11px;fill:#8fe0b4;font-family:monospace">开关 ${cb ? '合闸' : '分闸'}   1QK ${d.K1QK}</text>
        <text x="24" y="68" style="font-size:11px;fill:#8fe0b4;font-family:monospace">Ia ${cb ? '312' : '0.0'}  Ib ${cb ? '308' : '0.0'}  Ic ${cb ? '315' : '0.0'} A</text>
        ${SVX.lamp(40, 108, true, '#23b26a', '运行', 6)}${SVX.lamp(90, 108, cb, '#e23b2e', '合位', 6)}${SVX.lamp(140, 108, !cb, '#23b26a', '分位', 6)}${SVX.lamp(190, 108, !loc, '#e8b22a', '远方', 6)}${SVX.lamp(240, 108, loc, '#e8b22a', '就地', 6)}
      </g>
      ${SVX.knob('K1QK', 420, 130, ['远控', '就地'], d.K1QK, '1QK', '培训三线1163开关控制选择把手')}
      ${SVX.pushbtn('p8_open', 560, 130, '#23b26a', '分闸按钮', false)}
      ${SVX.hook('TCLOSE', 662, 66, !!S.tags.TCLOSE, '合闸按钮挂牌位')}
      ${SVX.pushbtn('p8_close', 662, 150, '#e23b2e', '1163 合闸按钮', false)}
      <text x="40" y="228" style="font-size:10px;fill:#5c6b5f">屏柜操作规则：远方 / 就地切换后，方可在屏上就地操作；检修状态下在合闸按钮悬挂"禁止合闸，线路有人工作！"标志牌。</text>
      ${SVX.plate(40, 262, 160, '8P 测控屏', '110kV培训三线1163线路')}
    </svg></div>`);
}

/* ---------- 20P 保护屏 ---------- */
function panelP20(w) {
  const d = S.dev;
  w.innerHTML = pnl('20P 110kV培训三线1163线路保护屏', 'RCS-943 · 空气开关在屏内右侧', `
    <div class="scene"><svg viewBox="0 0 760 330">
      ${SVX.face(760, 330, '20P 110kV培训三线1163线路保护屏', 'RCS-943A')}
      <g transform="translate(40,60)"><rect x="0" y="0" width="330" height="150" rx="5" fill="#2b3a31" stroke="#1f2d24"/>
        <rect x="14" y="12" width="200" height="90" rx="3" fill="#0f1a14"/>
        <text x="24" y="32" style="font-size:11px;fill:#8fe0b4;font-family:monospace">RCS-943A 线路保护</text>
        <text x="24" y="50" style="font-size:11px;fill:#8fe0b4;font-family:monospace">培训三线1163  ${d.M1K1 === 'off' ? '装置失电' : '运行正常'}</text>
        <text x="24" y="68" style="font-size:11px;fill:#8fe0b4;font-family:monospace">控制回路 ${d.M1K2 === 'off' ? '断线' : '正常'}</text>
        <text x="24" y="86" style="font-size:11px;fill:#8fe0b4;font-family:monospace">PT 电压 ${d.M1ZKK === 'off' ? '失压' : '正常'}</text>
        ${[['运行', d.M1K1 !== 'off', '#23b26a'], ['报警', d.M1K2 === 'off' || d.M1ZKK === 'off', '#e8b22a'], ['跳A', false, '#e23b2e'], ['跳B', false, '#e23b2e'], ['跳C', false, '#e23b2e'], ['重合闸', false, '#e23b2e']].map((l, i) => SVX.lamp(240 + (i % 2) * 44, 28 + Math.floor(i / 2) * 32, l[1], l[2], l[0], 6)).join('')}
        ${['差动', '距离', '零序', '重合闸', '远跳'].map((t, i) => `<rect x="${16 + i * 40}" y="114" width="30" height="22" rx="2" fill="#eceee3" stroke="#b9c3b2"/><rect x="${25 + i * 40}" y="118" width="12" height="14" rx="1" fill="#e8b22a"/><text x="${31 + i * 40}" y="147" text-anchor="middle" style="font-size:8px;fill:#c8cfb9">${t}</text>`).join('')}
      </g>
      <text x="470" y="62" style="font-size:10.5px;fill:#243329;font-weight:700">屏内空气开关</text>
      ${SVX.mcb('M1K1', 500, 140, '1K1', '保护装置电源', d.M1K1 === 'off')}
      ${SVX.mcb('M1K2', 600, 140, '1K2', '控制电源', d.M1K2 === 'off')}
      ${SVX.mcb('M1ZKK', 700, 140, '1ZKK', '保护电压', d.M1ZKK === 'off')}
      <text x="40" y="236" style="font-size:10px;fill:#5c6b5f">仅涉及一次设备检修的停电操作：断开该一次设备的控制电源，保护装置电源与保护电压保持投入。</text>
      ${SVX.plate(40, 262, 160, '20P 保护屏', '110kV培训三线1163线路')}
    </svg></div>`);
}

/* ---------- 就地控制柜 ---------- */
function panelCab(w) {
  const d = S.dev; const st = STEP();
  const esC = d.ES116340 === 'close', loc = d.KZK === '就地';
  w.innerHTML = pnl('110kV培训三线1163间隔就地控制柜', '设备双重名称已核对 · 柜内元件按实物布置', `
    <div class="scene"><svg viewBox="0 0 760 430">
      ${SVX.face(760, 430, '110kV培训三线1163间隔就地控制柜（LCP）', '柜门已打开')}
      <text x="40" y="60" style="font-size:10.5px;fill:#243329;font-weight:700">设备位置指示</text>
      ${[['DS11632', '11632', '#e23b2e'], ['CB1163', '1163', '#e23b2e'], ['DS11634', '11634', '#e23b2e'], ['ES116340', '116340', '#e8b22a']].map(([k, n, c], i) => { const on = k === 'ES116340' ? d[k] === 'close' : d[k] !== 'open'; return `<g transform="translate(${64 + i * 84},92)">${k === 'ES116340' ? `<g class="dev ${SVX.T('gis_hui')}" data-dev="gis_hui">${SVX.hit(-34, -22, 68, 60)}${S.gis.hui ? `<circle cx="30" cy="-18" r="7" fill="#0e8f5a"/><path d="M 26.5 -18 l 2.4 2.6 4 -5" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>` : ''}</g>` : ''}${SVX.lamp(-12, 0, on, c, '合', 7)}${SVX.lamp(12, 0, !on, '#23b26a', '分', 7)}<text y="-16" text-anchor="middle" class="svn">${n}</text></g>`; }).join('')}
      <g class="dev ${SVX.T('cab_hvdisp')}" data-dev="cab_hvdisp" transform="translate(560,50)">${SVX.hit(-6, -6, 176, 96)}
        <rect x="0" y="0" width="164" height="84" rx="5" fill="#eceee3" stroke="#b9c3b2"/>
        <text x="82" y="15" text-anchor="middle" style="font-size:9.5px;fill:#243329">高压带电显示装置 · 间接验电</text>
        ${['A', 'B', 'C'].map((p, i) => `<g class="dev ${SVX.T('cab_hvdisp_' + p)}" data-dev="cab_hvdisp_${p}" transform="translate(${34 + i * 48},44)">${SVX.hit(-18, -14, 36, 40)}${SVX.lamp(0, 0, d.DS11634 !== 'open', '#e23b2e', p + ' 相', 9)}${S.gis['hv' + p] ? `<circle cx="14" cy="-12" r="6" fill="#0e8f5a"/><path d="M 11 -12 l 2 2.2 3.5 -4.4" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>` : ''}</g>`).join('')}
        <text x="82" y="78" text-anchor="middle" class="svs ${d.DS11634 !== 'open' ? 'a' : 'b'}">${d.DS11634 !== 'open' ? '确有电压' : '确无电压'}</text></g>
      ${SVX.knob('KZK', 90, 226, ['远控', '就地'], d.KZK, 'ZK', '远控／就地切换把手')}
      <g transform="translate(180,152)"><rect x="0" y="0" width="230" height="150" rx="5" fill="#eceee3" stroke="#b9c3b2"/>
        <text x="115" y="16" text-anchor="middle" style="font-size:9.5px;fill:#243329">116340 培训三线线路侧接地刀闸 · 就地电动操作</text>
        <text x="115" y="30" text-anchor="middle" class="svs ${esC ? 'g' : 'b'}">${esC ? '合上位置' : '拉开位置'}</text>
        ${SVX.pushbtn('ES116340', 60, 76, '#e8b22a', '合闸', esC)}
        ${SVX.pushbtn('ES116340_open', 150, 76, '#23b26a', '分闸', !esC)}
        ${SVX.lamp(210, 52, loc, '#e8b22a', '就地允许', 5)}
        <g transform="translate(115,124)">
          <text y="-4" text-anchor="middle" class="svl">地刀运动方向</text>
          <line x1="-46" y1="6" x2="38" y2="6" stroke="#c8cfb9" stroke-width="6" stroke-linecap="round"/>
          <path d="M -46 6 h 84" stroke="${esC ? '#e8b22a' : '#dfe2d2'}" stroke-width="6" stroke-linecap="round"/>
          <polygon points="38,0 48,6 38,12" fill="${esC ? '#e8b22a' : '#c8cfb9'}"/>
          <text x="-52" y="10" text-anchor="end" class="svl">分</text><text x="52" y="10" class="svl">合</text>
          ${S.moving === 'ES116340' ? '<circle cx="-46" cy="6" r="4.5" fill="#e8b22a"><animate attributeName="cx" values="-46;38" dur="1.4s" repeatCount="indefinite"/></circle>' : ''}
        </g></g>
      ${SVX.hook('T11634', 520, 168, !!S.tags.T11634, '操作把手挂牌位')}
      <g class="dev ${SVX.T('cab_handle')}" data-dev="cab_handle" transform="translate(520,250)">${SVX.hit(-60, -30, 120, 70)}
        <rect x="-50" y="-14" width="100" height="28" rx="4" fill="#dfe2d2" stroke="#b9c3b2"/>
        <rect x="-40" y="-8" width="14" height="16" rx="2" fill="#5c6b5f"/><rect x="-20" y="-4" width="56" height="8" rx="4" fill="#7a8478"/>
        <text y="32" text-anchor="middle" class="svn">11634 刀闸操作把手</text></g>
      <text x="40" y="318" style="font-size:10.5px;fill:#243329;font-weight:700">柜内空气开关</text>
      ${SVX.hook('T4DK', 110, 350, !!S.tags.T4DK, '4DK 挂牌位')}
      ${SVX.mcb('M4DK', 200, 364, '4DK', '线路抽取电压（去保护）', d.M4DK === 'off')}
      ${SVX.mcb('M1DK', 300, 364, '1DK', '刀闸／地刀控制电源', d.M1DK === 'off')}
      ${SVX.mcb('M2DK', 400, 364, '2DK', '刀闸／地刀电机电源', d.M2DK === 'off')}
      <text x="470" y="318" style="font-size:10.5px;fill:#243329;font-weight:700">116340 地刀机构 · 位置指示</text>
      <text x="470" y="332" style="font-size:9.5px;fill:#98a69c">合闸方向：拐臂由「分」向「合」转到限位块，转轴漆线随之对准「合」</text>
      ${SVX.win('gis_mech', 520, 374, esC ? '合' : '分', esC ? '#e8b22a' : '#23b26a', '机构箱机械指示')}
      ${SVX.arm('gis_arm', 616, 374, !esC, '拐臂指示')}
      ${SVX.shaft('gis_line', 704, 374, !esC, '转轴划线')}
    </svg></div>`);
}
