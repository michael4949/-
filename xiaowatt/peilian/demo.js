/* ===================== 现场动作示范 =====================
   学员按票执行前，可让数字人把这一项在仿真现场做一遍：
   站位与核对 → 手指口述 → 执行动作 → 检查回报，四步分解，
   设备图跟着动，数字人逐步讲解。看完再自己动手。 */

/* 作业人员（工装 + 安全帽），pose 决定手臂与身体姿态 */
function figSVG(pose, x, y, s) {
  const P = {
    stand: { arm: 8, fore: 12, lean: 0, head: 0 },
    point: { arm: -62, fore: -78, lean: 2, head: -4 },
    act: { arm: -48, fore: -20, lean: 6, head: -6 },
    look: { arm: 4, fore: 26, lean: 10, head: -10 }
  }[pose] || { arm: 8, fore: 12, lean: 0, head: 0 };
  return `<g class="fig" transform="translate(${x},${y}) scale(${s || 1})">
    <ellipse cx="0" cy="2" rx="20" ry="5" fill="#000" opacity=".07"/>
    <g transform="rotate(${P.lean}) translate(0,-2)">
      <path d="M -7 0 l -2 -34 h 6 l 1 34 z" fill="#33414f"/>
      <path d="M 7 0 l 2 -34 h -6 l -1 34 z" fill="#3d4c5c"/>
      <path d="M -12 -34 h 24 l 3 -34 q -15 -6 -30 0 z" fill="#2f6ea8"/>
      <path d="M -12 -50 h 24" stroke="#c9dcee" stroke-width="1.4" opacity=".6"/>
      <rect x="-13" y="-56" width="26" height="5" rx="2" fill="#e8b22a"/>
      <g transform="translate(-10,-64) rotate(${P.arm})">
        <rect x="-3.4" y="0" width="6.8" height="17" rx="3" fill="#2f6ea8"/>
        <g transform="translate(0,17) rotate(${P.fore})">
          <rect x="-3" y="0" width="6" height="16" rx="3" fill="#e2c9a8"/>
          <circle cx="0" cy="18" r="3.6" fill="#e2c9a8"/></g></g>
      <g transform="translate(10,-64) rotate(${-P.arm * .35 + 10})">
        <rect x="-3.4" y="0" width="6.8" height="17" rx="3" fill="#2f6ea8"/>
        <rect x="-3" y="16" width="6" height="15" rx="3" fill="#e2c9a8"/></g>
      <g transform="translate(0,-70) rotate(${P.head})">
        <circle cx="0" cy="-6" r="9" fill="#e2c9a8"/>
        <path d="M -12 -8 a 12 11 0 0 1 24 0 z" fill="#f0c419"/>
        <path d="M -13 -8 h 26" stroke="#c99a12" stroke-width="2.2" stroke-linecap="round"/>
        <path d="M 0 -19 v 4" stroke="#c99a12" stroke-width="2"/></g>
    </g></g>`;
}

/* 屏柜／汇控柜面板底衬 */
function panelBack(w, h, title) {
  return `<rect x="0" y="0" width="${w}" height="${h}" rx="7" fill="#e6e9dd" stroke="#b9c3b2" stroke-width="1.6"/>
    <rect x="7" y="7" width="${w - 14}" height="${h - 14}" rx="5" fill="#f4f6ee" stroke="#cfd6c6"/>
    <text x="${w / 2}" y="19" text-anchor="middle" style="font-size:11px;fill:#5c6b5f;letter-spacing:1px">${title}</text>`;
}

/* 每类动作的四步分解：设备图 + 人员姿态 + 讲解词 */
const DEMO = {
  knob: st => ({
    seat: `${LOC[st.loc].name} · ${devName(st.target)}`,
    steps: [
      { pose: 'stand', t: '站位与核对', say: `先站到${LOC[st.loc].name}正面，核对屏柜名称和把手标签，确认是${devName(st.target)}，不是相邻屏上的同名把手。` },
      { pose: 'point', t: '手指口述', say: `伸手指向把手本体，眼睛看着刻字档位，完整念出票面：${st.recite}。` },
      { pose: 'act', t: '执行动作', say: '握住把手转到位，转到底再松手。把手是有档位的，转不到位会停在中间，回路既不通也不断。' },
      { pose: 'look', t: '检查回报', say: '看指针是不是落在票面要求的刻字上，再回报：把手已切换到位，指示与标识一致。' }
    ],
    scene: (i, st) => {
      const opts = ['远控', '就地'];
      const val = opts[i >= 2 ? 1 : 0];
      return `${panelBack(300, 210, LOC[st.loc].name)}
        <g transform="translate(150,110)">${SVX.knob('demo_' + st.target, 0, 0, opts, val, devName(st.target), '')}</g>
        ${i === 1 ? ar(150, 46, '手指这里') : ''}${i === 3 ? ar(214, 62, '看刻字档位') : ''}`;
    }
  }),
  mcb: st => ({
    seat: `${LOC[st.loc].name} · ${devName(st.target)}`,
    steps: [
      { pose: 'stand', t: '站位与核对', say: `找到${devName(st.target)}，核对空开标签与票面一致，注意同一排空开标签很像，别拉错。` },
      { pose: 'point', t: '手指口述', say: `手指空开本体，念出票面：${st.recite}。` },
      { pose: 'act', t: '执行动作', say: '手柄向下扳到底，听到"咔"一声到位。不要只扳一半，半档位置回路状态不确定。' },
      { pose: 'look', t: '检查回报', say: '看手柄位置和状态字是不是"断开"，再回报：空开已断开，位置与状态指示正确。' }
    ],
    scene: (i, st) => `${panelBack(300, 210, LOC[st.loc].name)}
      <g transform="translate(150,105)">${SVX.mcb('demo_' + st.target, 0, 0, devName(st.target), '', i >= 2)}</g>
      ${i === 1 ? ar(150, 46, '手指这里') : ''}${i === 3 ? ar(226, 152, '看手柄位置与状态字') : ''}`
  }),
  tag: st => ({
    seat: `${LOC[st.loc].name} · 标志牌悬挂位`,
    steps: [
      { pose: 'stand', t: '站位与核对', say: '先确认挂牌位置：要挂在可能导致送电的那个操作把手或按钮上，不是挂在柜门上。' },
      { pose: 'point', t: '手指口述', say: `手指挂牌位，念出票面：${st.recite}。` },
      { pose: 'act', t: '执行动作', say: '把"禁止合闸，线路有人工作！"标志牌挂上挂钩，文字朝外。' },
      { pose: 'look', t: '检查回报', say: '检查挂牢、不晃动、不遮挡设备名称和位置指示，再回报挂牌完成。' }
    ],
    scene: (i, st) => `${panelBack(300, 210, LOC[st.loc].name)}
      <g transform="translate(150,72)">${SVX.hook('demo_' + st.target, 0, 0, i >= 2, '挂牌位')}</g>
      ${i === 1 ? ar(150, 46, '手指挂牌位') : ''}${i === 3 ? ar(150, 178, '文字朝外·不遮挡设备名称') : ''}`
  }),
  closeE: st => ({
    seat: '就地控制柜 · 地刀合闸按钮',
    steps: [
      { pose: 'stand', t: '站位与核对', say: '合地刀前先确认两种验电都已完成、电脑钥匙已下传、ZK 把手在就地位置。条件不齐不能按。' },
      { pose: 'point', t: '手指口述', say: `手指合闸按钮，念出票面：${st.recite}。` },
      { pose: 'act', t: '执行动作', say: '按下合闸按钮不松手，直到机构启动。按的同时人站在侧面，不要正对机构。' },
      { pose: 'look', t: '检查回报', say: '全程盯住地刀运动方向、声音和位置指示，走到合闸位置停稳，再回报已合上。' }
    ],
    scene: (i, st) => `${panelBack(300, 210, '110kV培训三线1163间隔就地控制柜')}
      <g transform="translate(88,96)">${SVX.pushbtn('demo_close', 0, 0, '#e23b2e', '地刀合闸', i === 2)}</g>
      <g transform="translate(206,96)">
        <rect x="-34" y="-34" width="68" height="68" rx="5" fill="#f7f8f1" stroke="#c8cfb9"/>
        <line x1="0" y1="24" x2="0" y2="8" stroke="#7a8478" stroke-width="3"/>
        <g transform="rotate(${i >= 2 ? 0 : -62})" style="transition:transform .9s"><line x1="0" y1="8" x2="0" y2="-22" stroke="${i >= 2 ? '#e8b22a' : '#23b26a'}" stroke-width="4.5" stroke-linecap="round"/></g>
        <circle cx="0" cy="-24" r="3.4" fill="#7a8478"/>
        <text y="52" text-anchor="middle" class="svd">116340 地刀 · ${i >= 2 ? '合上' : '拉开'}</text></g>
      ${i === 1 ? ar(88, 52, '手指按钮') : ''}${i >= 2 ? ar(206, 56, '盯住运动方向') : ''}`
  }),
  gis: st => ({
    seat: `现场 · ${devName(st.target)} 四项位置指示`,
    steps: [
      { pose: 'stand', t: '站位与核对', say: 'GIS 设备看不见触头，位置只能靠指示判断，单一遥信不算数，要核对四项。' },
      { pose: 'point', t: '手指口述', say: `手指设备，念出票面：${st.recite}。` },
      { pose: 'act', t: '执行动作', say: '按顺序看四项：汇控柜电气指示、机构箱机械指示、拐臂指示、转轴划线标识，逐项对照。' },
      { pose: 'look', t: '检查回报', say: '四项一致才算到位。有一项对不上就停下来上报，不要自己判断"应该没问题"。' }
    ],
    scene: (i, st) => {
      const on = i >= 2, lit = k => on ? '#23b26a' : '#c8cfb9';
      const box = (x, y, n, k) => `<g transform="translate(${x},${y})">
        <rect x="-68" y="-19" width="136" height="38" rx="5" fill="#f7f8f1" stroke="${on ? '#8fcfae' : '#c8cfb9'}" stroke-width="${on ? 1.8 : 1}"/>
        <circle cx="-54" cy="0" r="5" fill="${lit(k)}"/>
        <text x="-44" y="4" style="font-size:10.5px;fill:#243329">${n}</text>
        ${on ? `<text x="60" y="4" text-anchor="end" style="font-size:11px;fill:#23b26a">√</text>` : ''}</g>`;
      return `${panelBack(300, 214, '现场 · 汇控柜 / 机构箱 / 刀闸本体')}
        ${box(150, 60, '汇控柜电气指示')}${box(150, 102, '机构箱机械指示')}
        ${box(150, 144, '拐臂指示')}${box(150, 186, '转轴划线标识')}`;
    }
  }),
  remote: st => ({
    seat: '监控后台 · 一次接线图',
    steps: [
      { pose: 'stand', t: '站位与核对', say: '先在一次接线图上找到本间隔，核对设备双重名称和当前状态，确认是要操作的那一台。' },
      { pose: 'point', t: '手指口述', say: `手指后台画面上的设备，念出票面：${st.recite}。` },
      { pose: 'act', t: '执行动作', say: '在遥控操作框里先选操作性质，系统自动预置并返校，返校通过后再点执行。选错性质会被判违规。' },
      { pose: 'look', t: '检查回报', say: '看图上变位、光字牌和操作报文三处都刷新，确认与本次操作相符，再回报。' }
    ],
    scene: (i, st) => `${panelBack(300, 210, '监控后台工作站')}
      <rect x="26" y="40" width="248" height="130" rx="4" fill="#1d2b23" stroke="#7a8478"/>
      <line x1="52" y1="70" x2="248" y2="70" stroke="#4a6153" stroke-width="2"/>
      <line x1="150" y1="70" x2="150" y2="${i >= 2 ? 100 : 150}" stroke="${i >= 2 ? '#23b26a' : '#e23b2e'}" stroke-width="3" style="transition:all .8s"/>
      <rect x="140" y="100" width="20" height="20" rx="2" fill="none" stroke="${i >= 2 ? '#23b26a' : '#e23b2e'}" stroke-width="2.6"/>
      ${i >= 2 ? '<line x1="140" y1="100" x2="160" y2="120" stroke="#23b26a" stroke-width="2.2"/>' : ''}
      <text x="176" y="116" style="font-size:10px;fill:#a9c4b5">${devName(st.target)}</text>
      <text x="52" y="160" style="font-size:9.5px;fill:${i >= 3 ? '#8fd6ae' : '#4a6153'}">${i >= 3 ? '操作报文：' + devName(st.target) + ' 变位，与本次操作相符' : '操作报文：—'}</text>
      ${i === 1 ? ar(150, 88, '手指屏上设备') : ''}${i === 3 ? ar(96, 186, '看报文与光字') : ''}`
  }),
  check: st => ({
    seat: `${LOC[st.loc].name}`,
    steps: [
      { pose: 'stand', t: '站位与核对', say: `到${LOC[st.loc].name}，先核对间隔名称和设备双重名称，确认站位没错。` },
      { pose: 'point', t: '手指口述', say: `手指要核对的对象，念出票面：${st.recite}。` },
      { pose: 'act', t: '执行动作', say: '逐项看清楚：数值、位置、信号、报文，一项一项对，不要扫一眼就过。' },
      { pose: 'look', t: '检查回报', say: `按看到的实际情况回报，不照抄票面。核对项的价值就在于说出你真正看到了什么。` }
    ],
    scene: (i, st) => `${panelBack(300, 210, LOC[st.loc].name)}
      <g transform="translate(150,100)">
        <rect x="-92" y="-46" width="184" height="92" rx="6" fill="#f7f8f1" stroke="#c8cfb9"/>
        <text y="-22" text-anchor="middle" style="font-size:10.5px;fill:#5c6b5f">${devName(st.target) || '核对对象'}</text>
        <text y="4" text-anchor="middle" style="font-size:13px;font-family:var(--mono);fill:${i >= 2 ? '#23b26a' : '#98a69c'}">${i >= 2 ? '核对完成' : '待核对'}</text>
        <text y="26" text-anchor="middle" style="font-size:9.5px;fill:#7b6a52">${i >= 3 ? '已按实际所见回报' : '逐项看清再回报'}</text></g>
      ${i === 1 ? ar(150, 46, '手指对象') : ''}`
  }),
  phone: st => ({
    seat: '调度电话 · 受令席',
    steps: [
      { pose: 'stand', t: '站位与核对', say: '受令席前站定，记录簿和操作票都摊开，笔在手上，准备边听边记。' },
      { pose: 'point', t: '手指口述', say: st.act === 'recv' ? '监护人接听后先互报单位姓名，再逐字听令，同时把发令单位、发令人、受令时间记进记录簿。' : `手指票面对应项，念出要汇报的内容：${st.recite}。` },
      { pose: 'act', t: '执行动作', say: st.act === 'recv' ? '向调度逐字复诵下令内容，调度答"复诵正确"才算接令成功。设备编号按位念，1163 念"一一六三"。' : '监护人拨通深圳中调，先互报单位姓名，再按票面内容汇报本段完成情况。' },
      { pose: 'look', t: '检查回报', say: st.act === 'recv' ? '接令后核对操作票任务与调度下令是否一致，不一致就中止并汇报值班长。' : '调度答"收到"后，把汇报时间记进记录簿，本段才算终结。' }
    ],
    scene: (i, st) => `${panelBack(300, 210, '调度电话 · 受令席')}
      <g transform="translate(96,96)">
        <rect x="-34" y="-30" width="68" height="60" rx="6" fill="#f0f2e8" stroke="#c8cfb9"/>
        <rect x="-26" y="-38" width="52" height="14" rx="6" fill="${i >= 1 ? '#1fa06b' : '#c8cfb9'}"/>
        <text y="6" text-anchor="middle" style="font-size:10px;fill:#5c6b5f">${i >= 1 ? '通话中' : '待接听'}</text>
        <text y="46" text-anchor="middle" class="svd">深圳中调 · 李明</text></g>
      <g transform="translate(206,96)">
        <rect x="-44" y="-34" width="88" height="68" rx="4" fill="#fff" stroke="#c8cfb9"/>
        ${[0, 1, 2].map(k => `<line x1="-34" y1="${-16 + k * 16}" x2="${i > k ? 34 : -34}" y2="${-16 + k * 16}" stroke="${i > k ? '#a8821b' : '#e2dfd0'}" stroke-width="2.2" style="transition:all .6s"/>`).join('')}
        <text y="52" text-anchor="middle" class="svd">调度操作指令记录簿</text></g>
      ${i === 2 ? ar(150, 44, '逐字复诵·按位报编号') : ''}`
  }),
  key: st => ({
    seat: '五防电脑 · 电脑钥匙',
    steps: [
      { pose: 'stand', t: '站位与核对', say: '模拟通过之后，票面顺序才被五防主机认可。下传之前先确认模拟票与操作票一致。' },
      { pose: 'point', t: '手指口述', say: `手指电脑钥匙，念出票面：${st.recite}。` },
      { pose: 'act', t: '执行动作', say: '把电脑钥匙插上主机接口，点下传，等主机提示写入成功再拔下来。' },
      { pose: 'look', t: '检查回报', say: '钥匙里只有这份模拟票的开锁顺序。到现场只有按这个顺序才能解锁，这就是防误的最后一道关口。' }
    ],
    scene: (i, st) => `${panelBack(300, 210, '五防电脑')}
      <g transform="translate(110,96)"><rect x="-44" y="-36" width="88" height="72" rx="4" fill="#1d2b23" stroke="#7a8478"/>
        <text y="-8" text-anchor="middle" style="font-size:9.5px;fill:#8fd6ae">五防主机</text>
        <text y="10" text-anchor="middle" style="font-size:9.5px;fill:${i >= 2 ? '#8fd6ae' : '#4a6153'}">${i >= 2 ? '写入成功' : '待下传'}</text>
        <text y="52" text-anchor="middle" class="svd">模拟票已通过</text></g>
      <g transform="translate(212,96) rotate(${i >= 2 ? 0 : -14})" style="transition:transform .7s">
        <rect x="-13" y="-30" width="26" height="52" rx="5" fill="#dfe2d2" stroke="#b9c3b2"/>
        <rect x="-8" y="-24" width="16" height="14" rx="2" fill="${i >= 2 ? '#23b26a' : '#7a8478'}"/>
        <rect x="-4" y="22" width="8" height="12" rx="2" fill="#a8b0a0"/>
        <text y="52" text-anchor="middle" class="svd">电脑钥匙</text></g>
      ${i === 2 ? ar(160, 46, '插上·下传·等提示') : ''}`
  })
};
function ar(x, y, t) {
  return `<g class="dar" transform="translate(${x},${y})">
    <path d="M 0 14 l -5 -9 h 10 z" fill="#c9a227"/>
    <rect x="${-t.length * 5.6 - 7}" y="-15" width="${t.length * 11.2 + 14}" height="20" rx="10" fill="#fff6da" stroke="#c9a227"/>
    <text y="-1" text-anchor="middle" style="font-size:10.5px;fill:#8a6d15">${t}</text></g>`;
}

function demoKind(st) {
  if (st.act === 'recv' || st.act === 'report') return 'phone';
  if (st.act === 'open' || st.act === 'pull') return 'remote';
  if (st.act === 'check' || st.act === 'verify') return 'check';
  return DEMO[st.act] ? st.act : 'check';
}

let __demoT = null;
function openDemo() {
  const st = STEP();
  if (!st || S.stage !== 'run') return toast('本项没有现场动作可示范', '');
  const D = DEMO[demoKind(st)](st);
  const m = el('div', 'mask demomask');
  m.innerHTML = `<div class="dlg demodlg">
    <div class="dh"><b>第 ${st.no} 项 · 现场动作示范</b><span class="dhs">${D.seat}</span><span class="cls">×</span></div>
    <div class="db">
      <div class="dmsteps">${D.steps.map((s, i) => `<span class="dms" data-dstep="${i}"><i>${i + 1}</i>${s.t}</span>`).join('')}</div>
      <div class="dmstage"><svg id="dmsvg" width="520" height="230" viewBox="0 0 520 230"></svg></div>
      <div class="dmcap" id="dmcap"></div>
      <div class="dmtip">示范只演示动作要领，不代替你自己做。看完关掉，按票面自己走一遍五拍。</div>
    </div>
    <div class="df"><button class="btn" id="dm_prev">上一步</button><button class="btn" id="dm_next">下一步</button>
      <button class="btn" id="dm_replay">重放</button><button class="btn pri" id="dm_close">我来做一遍</button></div>`;
  document.body.appendChild(m);
  let i = 0;
  const draw = () => {
    const sc = D.scene(i, st);
    $('#dmsvg').innerHTML = `<g transform="translate(190,10)">${sc}</g>${figSVG(D.steps[i].pose, 92, 214, 1.28)}
      <text x="92" y="228" text-anchor="middle" style="font-size:10px;fill:#7b6a52">操作人 任玲玲</text>`;
    $('#dmcap').innerHTML = `<b>${i + 1}. ${D.steps[i].t}</b><span>${D.steps[i].say}</span>`;
    m.querySelectorAll('.dms').forEach((n, k) => n.classList.toggle('on', k === i));
    $('#dm_prev').disabled = i === 0; $('#dm_next').disabled = i === D.steps.length - 1;
    useChar('jianhu');
    speak(D.steps[i].say, { pose: i === 1 ? 'point' : i === 3 ? 'explain' : 'explain', who: '监护人 陈志远' });
  };
  const go = k => { i = Math.max(0, Math.min(D.steps.length - 1, k)); draw(); };
  m.querySelector('.cls').onclick = m.querySelector('#dm_close').onclick = () => { clearTimeout(__demoT); m.remove(); };
  $('#dm_prev').onclick = () => go(i - 1);
  $('#dm_next').onclick = () => go(i + 1);
  $('#dm_replay').onclick = () => { clearTimeout(__demoT); go(0); auto(); };
  m.querySelectorAll('.dms').forEach((n, k) => n.onclick = () => { clearTimeout(__demoT); go(k); });
  const auto = () => {
    const step = () => {
      if (!document.body.contains(m)) return;
      if (i >= D.steps.length - 1) return;
      go(i + 1); __demoT = setTimeout(step, 3200 * (window.__DH_SPEED || 1));
    };
    __demoT = setTimeout(step, 3200 * (window.__DH_SPEED || 1));
  };
  go(0); auto();
}
