/* ---------------- 设备点击 ---------------- */
function devClick(id) {
  if (!id) return;
  if (S.stage === 'wufang') return;
  if (S.stage !== 'run' || S.ended) return;
  const st = STEP();

  // 现场四指示 / 核对类热区
  if (id.startsWith('gis_')) { S.gis[id.slice(4)] = true; renderPanel(); return; }
  if (id.startsWith('cab_hvdisp_')) { S.gis['hv' + id.slice(11)] = true; renderPanel(); return; }
  if (id === 'bay_draw' || id === 'bay_label') { S.gis[id === 'bay_draw' ? 'draw' : 'label'] = true; renderPanel(); return; }

  // 第4拍：执行
  if (S.beat === 3) {
    if (id !== st.target) {
      violation('major', 'dual', '操作对象错误', `发令对象为 ${st.target}，实际操作 ${id}`,
        '风险7：走错间隔、图实不符或标识错误风险。');
      speak('你操作的不是本项设备。请核对双重名称后重新确认。', { pose: 'stop', shake: true });
      return;
    }
    doExecute(st); return;
  }
  // 第2拍：手指口述——先手指
  if (S.beat === 1) {
    if (st.loc !== S.loc) { toast('请先到达 ' + LOC[st.loc].name, 'bad'); return; }
    if (id === st.target) {
      S.sel = id;
      if (id === 'bay_plate') S.gis.plate = true;
      if (id === 'bay_hvdisp') S.gis.hv = true;
      renderPanel();
      $$('#panelwrap [data-dev="' + id + '"]').forEach(n => n.classList.add('sel'));
      say('o', `（手指${devName(id)}）`, '');
      $('#rin').focus();
      toast('已手指操作对象，请复诵票面内容', 'ok');
    } else if (lenient('point')) {
      say('s', `<span class="tag wn">提醒</span>手指的不是本项设备。本项要手指的是「${devName(st.target)}」。教学模式下这一次不计违规。`);
      speak(`手指的不是本项设备。本项要手指的是${devName(st.target)}。口到、眼到、手到，三者必须落在同一个对象上。`, { pose: 'correct' });
    } else {
      violation('minor', 'dual', '手指对象与票面不符', `票面对象为 ${devName(st.target)}，手指对象为 ${devName(id)}`,
        '附录E 变电电气操作行为规范：遵守"手指口述"原则规范唱票复诵，做到口到、眼到、手到。');
      speak('手指的不是本项设备。口到、眼到、手到，三者必须落在同一个对象上。', { pose: 'correct', shake: true });
    }
    return;
  }
  // 未发令即操作
  if (S.beat === 2 && id === st.target) {
    if (lenient('order')) {
      say('s', '<span class="tag wn">提醒</span>监护人还没有发出"对，执行"，此刻不能动设备。教学模式下这一次不计违规。');
      speak('等一下，我还没有发令。监护人确认"对，执行"之后你才可以操作。', { pose: 'stop' });
      return;
    }
    violation('major', 'dual', '未发出执行令即操作',
      '监护人尚未确认"对，执行"，操作人已动作设备', '风险4：每一项均执行监护人完整唱票、操作人手指操作对象并复诵、监护人确认"对，执行"后方可操作。');
    speak('本项我还没有发出执行令，不得操作。等我确认"对，执行"。', { pose: 'stop', shake: true });
    return;
  }
  if (S.beat >= 4) toast('本项已执行，请完成检查回报', '');
}

function devName(id) {
  return ({
    CB1163: '培训三线1163开关', DS11634: '培训三线线路侧11634刀闸', DS11632: '培训三线2M侧11632刀闸',
    ES116340: '培训三线线路侧116340地刀', K1QK: '1QK把手', KZK: 'ZK把手',
    M1DK: '1DK空气开关', M2DK: '2DK空气开关', M4DK: '4DK空气开关', M1K2: '1K2空气开关',
    M1K1: '1K1空气开关', M1ZKK: '1ZKK空气开关',
    T4DK: '4DK空气开关（挂牌位）', T11634: '11634刀闸操作把手（挂牌位）', TCLOSE: '1163开关合闸按钮（挂牌位）',
    hmi_mode: '运行方式', hmi_current: '三相电流遥测', hmi_volt: '线路二次电压',
    bay_plate: '间隔名称牌', bay_hvdisp: '高压带电显示装置', cab_hvdisp: '高压带电显示装置'
  })[id] || id;
}

/* ---------------- 执行动作 ---------------- */
function doExecute(st) {
  const d = S.dev;
  switch (st.act) {
    case 'open': d[st.target] = 'open';
      pushMsg('110kV仿真站 培训三线1163开关 分闸 变位', 'new');
      pushMsg('110kV仿真站 培训三线1163开关 保护出口 复归', ''); break;
    case 'pull': d[st.target] = 'open';
      pushMsg(`110kV仿真站 ${st.target.slice(2)}刀闸 分闸 变位`, 'new'); break;
    case 'closeE':
      if (!(S.verify.v1 && S.verify.v2)) { redlineGround([]); return; }
      d[st.target] = 'close';
      pushMsg('110kV仿真站 培训三线线路侧116340地刀 合闸 变位', 'new'); break;
    case 'knob': d[st.target] = (d[st.target] === '远控' ? '就地' : '远控');
      pushMsg(`110kV仿真站 ${devName(st.target)} 切至${d[st.target]}`, ''); break;
    case 'mcb': d[st.target] = 'off';
      pushMsg(`110kV仿真站 ${devName(st.target)} 断开`, ''); break;
    case 'tag': S.tags[st.target] = true; break;
    case 'check': case 'verify': case 'gis':
      if (st.vd === 1) S.verify.v1 = true;
      if (st.vd === 2) S.verify.v2 = true;
      break;
  }
  // 异常注入（第11项 GIS 核对）
  if (st.act === 'gis' && st.target === 'DS11634' && S.abn.armed && !S.abn.fired) {
    S.abn.fired = true;
    pushMsg('110kV仿真站 培训三线11634刀闸 位置指示不一致 告警', 'alm');
  }
  setBeat(4);
  renderPanel(); renderTop();
  say('o', st.act === 'check' || st.act === 'gis' ? `（核对${devName(st.target)}）` : `（执行：${st.ticket}）`);
  if (st.act === 'gis') {
    speak('到现场按设备结构逐项核对四项位置指示，四项一致后再回报。', { pose: 'point' });
    if (st.target !== 'ES116340') goLoc('bay');
  } else {
    speak('执行到位。请检查设备状态并回报。', { pose: 'explain' });
  }
}

/* ---------------- 五拍推进 ---------------- */
function setBeat(b) { S.beat = b; renderBeats(); renderPanel(); updateActbar(); Sheet.sync(); }

async function enterStep(i) {
  const nst = STEPS[i];
  if (nst && !S.previewed[nst.phase]) {
    S.previewed[nst.phase] = true;
    if (nst.phase > 1) { return openPreview(nst.phase, () => enterStep(i)); }
  }
  S.idx = i; S.sel = null; S.gis = {}; S.beat = 0;
  const st = STEP();
  renderTicket(); renderTop(); renderLocbar(); renderBeats(); renderPanel(); updateActbar();
  if (st.act === 'recv' || st.act === 'report') useChar(st.act === 'recv' ? 'diaodu' : 'jianhu');
  else useChar('jianhu');

  if (st.loc !== S.loc) {
    say('j', `去${LOC[st.loc].name}。`);
    await speak(`去${LOC[st.loc].name}。`, { pose: 'point' });
    if (S.mode === 'teach') { goLoc(st.loc); say('s', `教学模式：已跟随监护人到达${LOC[st.loc].name}。`); }
  }
  // 票令陷阱
  let call = st.call;
  if (st.trap === 'order' && S.trap.armed && !S.trap.fired) {
    S.trap.fired = true;
    call = '现在调度下令：将110kV培训三线1163线路由运行转冷备用。';
  }
  if (st.act === 'recv') {
    S.ord.cur = call.replace(/^现在调度下令：/, '').replace(/。$/, '');
    S.ord.time = stamp();
    renderPanel();
  }
  say(st.act === 'recv' ? 'd' : 'j', call);
  await speak(call, { pose: st.act === 'recv' ? 'explain' : 'call', who: st.act === 'recv' ? '值班调度员' : '监护人 陈志远' });
  setBeat(1);
  if (st.act === 'recv') {
    say('s', '请复诵调度下令内容，并核对操作票任务与下令是否一致。');
  } else {
    say('s', `请到 ${LOC[st.loc].name}，手指操作对象「${devName(st.target)}」并完整复诵票面内容。`);
  }
}

/* ---------------- 复诵 / 回报 ---------------- */
async function submitInput() {
  if (S.lock) return;
  S.lock = true;
  try { await _submitInput(); } finally { S.lock = false; }
}
async function _submitInput() {
  const v = $('#rin').value.trim();
  if (!v) return;
  const st = STEP();
  $('#rin').value = '';
  if (S.beat === 1) {
    // 复诵
    if (st.act !== 'recv' && st.act !== 'report' && !S.sel) {
      say('o', v);
      violation('minor', 'dual', '只复诵未手指', '复诵前未手指操作对象',
        '附录E：遵守"手指口述"原则规范唱票复诵，做到口到、眼到、手到。');
      await speak('你只复诵了，没有手指操作对象。请手指设备后再复诵一次。', { pose: 'correct', shake: true });
      return;
    }
    say('o', v);
    const sc = sim(v, st.recite);
    if (sc < 0.62 && lenient('recite')) {
      say('s', `<span class="tag wn">提醒</span>复诵与票面不一致（吻合度 ${(sc * 100).toFixed(0)}%）。票面原文：${st.recite}。教学模式下这一次不计违规，请再念一遍。`);
      await speak('复诵与票面不一致。我再念一遍票面，你跟着复诵：' + st.recite, { pose: 'correct' });
      if (S.mode === 'teach') $('#rin').value = '';
      return;
    }
    if (sc < 0.62) {
      violation('minor', 'term', '复诵与票面不一致', `复诵内容与票面文字吻合度 ${(sc * 100).toFixed(0)}%`,
        '风险4：监护人完整唱票、操作人手指操作对象并复诵，监护人确认后方可操作。');
      await speak('复诵与票面不一致，请按票面文字完整复诵一次。', { pose: 'correct', shake: true });
      return;
    }
    if (sc < 0.86) {
      violation('minor', 'term', '复诵不完整', '缺少设备双重名称或电压等级等要素',
        '附录F 2.10：必须注明设备的电压等级，操作项目中设备名称须填写双重称号。');
      await speak('基本正确，但不够完整。设备双重名称要念全。本项先继续，记一次不规范。', { pose: 'correct' });
    }
    // 票令陷阱判定
    if (st.trap === 'order' && S.trap.fired && S.trap.passed === null) {
      S.trap.passed = false;
      violation('major', 'rule', '票令不一致未发现',
        '调度下令为"由运行转冷备用"，操作票任务为"由热备用转冷备用"，复诵后仍继续执行',
        '细则第十八条：接到调度正式指令后，应再次"三审"，核实操作票内容是否与调度正式指令一致。');
      useChar('jianhu');
      await speak('等一下。刚才调度下的令是"由运行转冷备用"，我们的操作票这一段是"由热备用转冷备用"。票令不一致，必须中止并汇报值班长。这一项你没有核出来。',
        { pose: 'stop', shake: true, who: '监护人 陈志远' });
      await reissueOrder();
      return;
    }
    useChar('jianhu');
    say('j', '对，执行。');
    await speak('对，执行。', { pose: 'confirm', nod: 1, who: '监护人 陈志远' });
    setBeat(3);
    if (st.act === 'recv' || st.act === 'report') { doPhone(st); return; }
    say('s', '已发出执行令。请在设备上执行本项操作。');
    return;
  }
  if (S.beat === 4) {
    say('o', v);
    // GIS 四项指示
    if (st.act === 'gis') {
      const need = ['hui', 'mech', 'arm', 'line'];
      const got = need.filter(k => S.gis[k]).length;
      if (S.abn.fired && !S.abn.handled && st.target === 'DS11634') {
        if (S.gis.mech) {
          redlineAbnormal(); return;
        }
      }
      if (got < 4) {
        violation('major', 'state', 'GIS位置确认不充分', `仅核对 ${got}/4 项位置指示即回报到位`,
          '附录G-5：GIS组合电器的刀闸、地刀操作后，应当检查监控后台刀闸位置显示、报文、汇控柜刀闸电气指示、刀闸机构箱机械指示、刀闸拐臂指示、转轴划线标识是否正确。');
        await speak('不行。GIS刀闸位置不能只看一两项。汇控柜电气指示、机构箱机械指示、拐臂指示、转轴划线标识，四项都要核对到。', { pose: 'stop', shake: true });
        return;
      }
    }
    if (st.vd === 2 && !S.verify.v1) {
      violation('major', 'rule', '验电顺序不完整', '未完成后台二次电压核对即进行第二种原理验电',
        '附录G-23：不能直接验电的，应有两个及以上非同样原理或非同源的指示且均已同时发生变化。');
    }
    const sc = sim(v, st.report);
    if (sc < 0.28) {
      violation('minor', 'term', '回报要素不全', '未说明设备位置、信号或报文核对结果',
        '附录G-21.2：操作后应在监控后台核对运行方式与操作结果相符，核对报文与操作过程相符。');
      await speak('回报太简单了。要说清楚设备位置、相关信号和报文的核对结果。本项先记一次不规范。', { pose: 'correct' });
    }
    await tickStep();
  }
}

async function tickStep() {
  const st = STEP();
  if (st._done) return;
  st._done = true;
  say('j', '收到。（在本项"操作√"栏标注 √）');
  await speak('收到。本项完成，我已经在操作票上标注对勾。', { pose: 'confirm', nod: 1 });
  S.score.rule += 4; S.score.order += 3; S.score.dual += 3; S.score.state += 3; S.score.term += 3;
  renderTicket(); renderTop();
  const order = S.plan ? S.plan.steps : STEPS.map((_, i) => i);
  const nx = order.find(k => !STEPS[k]._done);
  if (nx === undefined) { finish(); return; }
  setTimeout(() => enterStep(nx), 400);
}

/* 调度类项目 */
async function doPhone(st) {
  if (st.act === 'recv') {
    if (!S.ord.unit || !S.ord.from) {
      violation('minor', 'term', '调度记录不完整', '发令单位或发令人未填写',
        '附录F 2.4／2.5／2.7：发令单位、发令人、受令时间应完整记录在调度操作指令记录簿及操作票相应栏。');
    }
    setBeat(4);
    $('#rin').value = st.report;
    setTimeout(() => submitInput(), 250);
  } else {
    say('o', st.recite);
    setBeat(4);
    useChar('diaodu');
    await speak('收到。', { pose: 'explain', who: '值班调度员', nod: 1 });
    useChar('jianhu');
    $('#rin').value = st.report;
    setTimeout(() => submitInput(), 250);
  }
}

async function reissueOrder() {
  useChar('diaodu');
  S.ord.cur = '将110kV培训三线1163线路由热备用转冷备用';
  renderPanel();
  say('d', '更正：现在调度下令，将110kV培训三线1163线路由热备用转冷备用。');
  await speak('更正：现在调度下令，将110kV培训三线1163线路由热备用转冷备用。', { pose: 'explain', who: '值班调度员' });
  useChar('jianhu');
  setBeat(1);
  say('s', '请重新复诵调度下令内容。');
}

/* ---------------- 红线：带电合地刀 ---------------- */
function redlineGround(skipped) {
  violation('red', 'rule', '带电合接地刀闸（一票否决）',
    '在未完成两种非同源验电的情况下合上116340地刀',
    '细则第十三条（四）：所有接地操作前均应规范验电，确保"先验电再接地"。附录G-23：不能直接验电的，应有两个及以上非同样原理或非同源的指示且均已同时发生变化，才能确认该设备已无电。');
  STEPS[S.idx]._bad = true; renderTicket();
  useChar('jianhu');
  speak('停！你还没有完成验电就要合地刀。这是红线。', { pose: 'stop', shake: true });
  openRedline({
    title: '红线触发 · 未验电即合接地刀闸',
    where: `第 ${STEP().no} 项：${STEP().ticket}${skipped && skipped.length ? `<br>并跳过了第 ${skipped.join('、')} 项` : ''}`,
    why: [
      '第17项「检查后台机显示培训三线1163线路二次确无电压」' + (S.verify.v1 ? '已执行' : '<b style="color:#ff9aa8">未执行</b>'),
      '第18项「检查培训三线1163间隔高压带电显示装置显示确无电压」' + (S.verify.v2 ? '已执行' : '<b style="color:#ff9aa8">未执行</b>')
    ],
    rule: '《变电现场电气操作票管理细则》第十三条（四）：所有接地操作前均应规范验电，确保接地刀闸静触头得到安全有效的"先验电再接地"。<br>附录G-23：严格落实"凡触碰必验电、接地后才许可"原则，对于不能直接验电的，按《安规》要求应有两个及以上非同样原理或非同源的指示且均已同时发生变化，才能确认该设备已无电。<br>风险第10条管控措施：GIS设备不具备直接验电条件时，按操作票分别核对后台二次电压和高压带电显示装置，确认两种不同原理或非同源指示均已发生应有变化且同时显示无电压后，方可合上116340地刀。',
    right: '先执行第17项核对后台二次电压确无电压，再执行第18项逐相核对高压带电显示装置确无电压；两项交叉核对一致且变化逻辑正确后，方可将ZK切至就地并合上116340地刀。任一指示异常或两种结果不一致，立即中止操作并按变化管理要求上报。',
    chain: [
      ['线路仍带电', '11634刀闸已拉开但线路侧仍有感应电压／对侧未断开时，线路带电'],
      ['带电合地刀', '接地刀闸在带电状态下合闸，触头间产生金属性短路'],
      ['相间／对地短路', '短路电流经接地回路入地，产生强烈电弧与冲击'],
      ['保护动作跳闸', '线路保护、母差保护动作，扩大停电范围'],
      ['人身与设备后果', '电弧灼伤、GIS设备损坏，构成人为责任事件，按公司处分清单追责']
    ]
  });
}

/* ---------------- 红线：异常未中止 ---------------- */
function redlineAbnormal() {
  violation('red', 'risk', '发现异常未中止操作（一票否决）',
    '现场机构箱机械指示与监控后台位置显示不一致，仍按后台位置回报到位并继续操作',
    '细则第十四条（一）：一旦发现设备运动方向异常、五防锁具无法正常开启等问题，应落实"凡变化必上报"要求，立即中止操作并上报至本单位运行部门负责人。');
  STEPS[S.idx]._bad = true; renderTicket();
  speak('停！现场指示和后台不一致，你还要往下走？凡变化必上报，必须立即中止。', { pose: 'stop', shake: true });
  openRedline({
    title: '红线触发 · 发现异常未中止上报',
    where: `第 ${STEP().no} 项：${STEP().ticket}`,
    why: ['监控后台显示 11634 刀闸在拉开位置', '现场机构箱机械指示与后台不一致', '在指示不一致的情况下按后台位置回报"已到位"'],
    rule: '《变电现场电气操作票管理细则》第十四条（一）：一旦发现设备运动方向异常、五防锁具无法正常开启等问题，应落实"凡变化必上报"要求，立即中止操作并上报至本单位运行部门负责人，经综合研判重新核实处置完毕后方可恢复操作。<br>第十四条（二）："五防锁具无法正常开启"应视同已发生"走错间隔"。<br>附录G-21.1：当监控后台存在异常时，运行方式须以现场设备实际位置为准。',
    right: '立即中止操作，不得盲目重试；先汇报值班负责人，并按变化管理要求逐级上报至本单位运行部门负责人；经综合研判、重新核实处置完毕后，返回被中止的操作项目，重新核对后恢复操作。',
    chain: [
      ['刀闸未真正到位', '机械指示与遥信不一致，说明刀闸可能卡涩或未分闸到位'],
      ['隔离措施不可靠', '检修工作面与带电部位之间未形成有效明显断开点'],
      ['继续接地操作', '在隔离不可靠的情况下合上接地刀闸'],
      ['短路与设备损坏', '带电合地刀，引发短路电弧、GIS设备损坏'],
      ['人身伤害', '检修人员在"已停电"设备上作业，存在触电风险']
    ]
  });
}

/* ---------------- 红线弹层 + 事故推演 ---------------- */
function openRedline(o) {
  const m = el('div', 'mask');
  m.innerHTML = `<div class="dlg red">
    <div class="dh"><b>${o.title}</b><span style="font-size:11px;color:#93a9c4;font-family:var(--mono)">RED LINE · 一票否决</span><span class="cls">×</span></div>
    <div class="db">
      <div class="sec"><div class="st">错在哪</div><div class="sc quote">${o.where}<br>${o.why.map(x => '· ' + x).join('<br>')}</div></div>
      <div class="sec"><div class="st">依据哪一条</div><div class="sc" style="font-size:12px;color:#93a9c4">${o.rule}</div></div>
      <div class="sec"><div class="st">正确做法</div><div class="sc">${o.right}</div></div>
      <div class="sec"><div class="st">事故后果推演</div>
        <canvas id="arc" width="820" height="230"></canvas>
        <div class="chain">${o.chain.map(c => `<div class="cn"><b>${c[0]}</b><span>${c[1]}</span></div>`).join('')}</div>
      </div>
    </div>
    <div class="df"><button class="btn" id="rl_replay">重放推演</button><button class="btn pri" id="rl_ok">返回被中止的项目</button></div>
  </div>`;
  document.body.appendChild(m);
  const close = () => { m.remove(); resumeAfterRedline(); };
  m.querySelector('.cls').onclick = close;
  m.querySelector('#rl_ok').onclick = close;
  m.querySelector('#rl_replay').onclick = () => arcAnim();
  setTimeout(arcAnim, 260);
}

function arcAnim() {
  const c = $('#arc'); if (!c) return;
  const g = c.getContext('2d'), W = c.width, H = c.height;
  let t = 0;
  const draw = () => {
    if (!document.body.contains(c)) return;
    t += 1 / 60;
    g.clearRect(0, 0, W, H);
    g.fillStyle = '#05090f'; g.fillRect(0, 0, W, H);
    // 设备示意
    g.strokeStyle = '#20344c'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(60, 40); g.lineTo(760, 40); g.stroke();
    g.fillStyle = '#7f9cbb'; g.font = '12px monospace';
    g.fillText('110kV 培训三线（线路侧仍带电）', 60, 30);
    g.strokeStyle = t > 1.1 ? '#e23b2e' : '#2b4767'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(410, 40); g.lineTo(410, 120); g.stroke();
    // 地刀
    const close = Math.min(1, Math.max(0, (t - 0.35) / 0.8));
    g.save(); g.translate(410, 120);
    g.strokeStyle = close >= 1 ? '#e8b22a' : '#23b26a'; g.lineWidth = 5; g.lineCap = 'round';
    g.rotate((1 - close) * -0.9);
    g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 62); g.stroke(); g.restore();
    g.strokeStyle = '#4a637f'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(386, 186); g.lineTo(434, 186); g.stroke();
    g.beginPath(); g.moveTo(394, 194); g.lineTo(426, 194); g.stroke();
    g.beginPath(); g.moveTo(402, 202); g.lineTo(418, 202); g.stroke();
    g.fillStyle = '#5f7794'; g.font = '11px monospace';
    g.fillText('116340 接地刀闸', 448, 158);
    // 弧光
    if (t > 1.1 && t < 3.4) {
      const k = Math.min(1, (t - 1.1) / .35);
      const flick = .55 + .45 * Math.sin(t * 47) * Math.sin(t * 13);
      const R = (70 + 130 * k) * flick;
      const gr = g.createRadialGradient(410, 130, 4, 410, 130, R);
      gr.addColorStop(0, 'rgba(255,255,255,' + (.95 * flick) + ')');
      gr.addColorStop(.16, 'rgba(255,236,170,' + (.85 * flick) + ')');
      gr.addColorStop(.42, 'rgba(255,140,60,' + (.45 * flick) + ')');
      gr.addColorStop(1, 'rgba(255,60,40,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(410, 130, R, 0, 7); g.fill();
      g.strokeStyle = 'rgba(255,255,255,' + (.85 * flick) + ')'; g.lineWidth = 2;
      for (let i = 0; i < 7; i++) {
        g.beginPath(); g.moveTo(410, 108);
        let x = 410, y = 108;
        for (let j = 0; j < 6; j++) { x += (Math.random() - .5) * 30; y += 12; g.lineTo(x, y); }
        g.stroke();
      }
      g.fillStyle = 'rgba(255,255,255,' + (.10 * flick) + ')'; g.fillRect(0, 0, W, H);
    }
    if (t > 1.35) {
      g.fillStyle = '#ff9aa8'; g.font = 'bold 15px sans-serif';
      g.fillText('带电合接地刀闸 → 金属性短路', 520, 60);
      g.fillStyle = '#ffcf7a'; g.font = '12px monospace';
      g.fillText('短路电流 ≈ 21.4 kA', 520, 84);
      g.fillText('电弧温度 > 6000 ℃', 520, 104);
    }
    if (t > 2.1) {
      g.fillStyle = '#ff9aa8'; g.font = '12px monospace';
      g.fillText('T+0.08s  线路保护动作', 60, 100);
      g.fillText('T+0.12s  母差保护动作', 60, 120);
      g.fillText('T+0.20s  110kV 2M 失压', 60, 140);
      g.fillText('后果      设备损坏 · 人身电弧灼伤 · 人为责任事件', 60, 160);
    }
    if (t < 4.6) requestAnimationFrame(draw);
  };
  draw();
}

function resumeAfterRedline() {
  const st = STEP();
  st._bad = true;
  // 回到被中止的项目：重置本项
  S.gis = {}; S.sel = null;
  if (S.abn.fired && !S.abn.handled) { openAbnormal(); return; }
  setBeat(1);
  say('s', '本项已记录一票否决。请回到被中止的操作项目，重新核对后按正确顺序执行。');
  renderTicket();
}

/* ---------------- 异常处置支线 ---------------- */
function openAbnormal() {
  const steps = [
    ['立即中止操作', '不得盲目重试或强行操作。保持设备现状，不再进行任何操作。', 'stop'],
    ['汇报值班负责人', '向巡维中心当值值班负责人报告：11634刀闸现场机构箱机械指示与后台位置显示不一致。', 'zhiban'],
    ['逐级上报', '按变化管理要求，由值班负责人上报至本单位运行部门负责人。', 'zhiban'],
    ['综合研判与处置', '专业班组到场核实，确认刀闸实际位置并完成处置，出具可恢复操作的结论。', 'zhiban'],
    ['具备恢复条件', '重新核对后台位置、报文、汇控柜电气指示、机构箱机械指示、拐臂与转轴划线标识，全部一致。', 'jianhu']
  ];
  let cur = 0;
  const m = el('div', 'mask');
  const paint = () => {
    m.innerHTML = `<div class="dlg" style="width:min(680px,96vw)">
      <div class="dh"><b>异常处置流程</b><span style="font-size:11px;color:#93a9c4;font-family:var(--mono)">凡变化必上报 · 细则第十四条</span></div>
      <div class="db">
        <div class="sec"><div class="st">触发条件</div><div class="sc quote">培训三线线路侧11634刀闸：现场机构箱机械指示与监控后台位置显示不一致</div></div>
        ${steps.map((s, i) => `<div style="display:flex;gap:11px;align-items:flex-start;padding:10px 12px;border-radius:6px;margin-bottom:7px;
          background:${i < cur ? '#0b2018' : i === cur ? '#12233a' : '#0a1524'};border:1px solid ${i < cur ? '#1c4a35' : i === cur ? '#2a6fbe' : '#1c3350'}">
          <div style="width:20px;height:20px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;
            font-size:11px;font-family:monospace;background:${i < cur ? '#2fd08a' : i === cur ? '#2a6fbe' : '#1d3350'};color:${i <= cur ? '#061018' : '#5f7794'}">${i < cur ? '✓' : i + 1}</div>
          <div style="flex:1"><div style="font-size:12.5px;color:${i <= cur ? '#e6edf6' : '#5f7794'};font-weight:${i === cur ? 700 : 400}">${s[0]}</div>
          <div style="font-size:11px;color:#93a9c4;margin-top:3px;line-height:1.6">${s[1]}</div></div>
        </div>`).join('')}
      </div>
      <div class="df">${cur < steps.length ? `<button class="btn pri" id="ab_next">${steps[cur][0]}</button>` : `<button class="btn pri" id="ab_done">返回被中止的操作项目</button>`}</div>
    </div>`;
    const n = m.querySelector('#ab_next');
    if (n) n.onclick = async () => {
      const s = steps[cur];
      if (s[2] === 'zhiban' && DHkey !== 'zhiban') useChar('zhiban');
      if (s[2] === 'stop') { useChar('jianhu'); await speak('立即中止操作，不得盲目重试。保持现状，我们先汇报。', { pose: 'stop', who: '监护人 陈志远' }); }
      else if (cur === 1) { useChar('zhiban'); await speak('我是值班负责人周建国。收到你们的汇报，11634刀闸机械指示与后台不一致，我立即按变化管理要求向运行部门负责人上报。', { pose: 'explain', who: '值班负责人 周建国' }); }
      else if (cur === 3) { useChar('zhiban'); await speak('专业班组已到场核实，刀闸实际在拉开位置，机构箱指示牌松动已处置完毕，具备恢复操作条件。', { pose: 'explain', who: '值班负责人 周建国' }); }
      cur++; paint();
    };
    const d = m.querySelector('#ab_done');
    if (d) d.onclick = async () => {
      m.remove(); S.abn.handled = true; S.gis = {};
      useChar('jianhu');
      praise('risk', '异常处置正确', '发现指示不一致后立即中止、汇报值班负责人并逐级上报，处置完毕后恢复操作');
      renderTop(); renderPanel();
      await speak('处置完毕，具备恢复条件。回到被中止的第11项，重新逐项核对四项位置指示。', { pose: 'explain' });
      setBeat(4);
      say('s', '异常已处置。请重新核对四项位置指示后回报。');
    };
  };
  paint(); document.body.appendChild(m);
}

/* ---------------- 中止上报按钮 ---------------- */
async function clickStop() {
  if (S.stage !== 'run') return;
  if (S.abn.fired && !S.abn.handled) {
    praise('risk', '及时中止上报', '发现设备位置指示不一致，主动中止操作并启动上报流程');
    openAbnormal(); return;
  }
  const m = el('div', 'mask');
  m.innerHTML = `<div class="dlg" style="width:min(560px,96vw)">
    <div class="dh"><b>中止操作并上报</b><span class="cls">×</span></div>
    <div class="db"><div class="sec"><div class="st">当前判断</div>
    <div class="sc">当前未检出设备运动方向异常、五防锁具异常、后台与现场指示不一致等触发条件。</div></div>
    <div class="sec"><div class="st">说明</div><div class="sc" style="font-size:12px;color:#93a9c4">
    细则第十四条要求"凡变化必上报"；但无依据地中止操作会打断作业连续性。中止判断本身也是被评价的能力项。</div></div></div>
    <div class="df"><button class="btn" id="sp_c">取消</button><button class="btn dan" id="sp_y">仍然中止并上报</button></div></div>`;
  document.body.appendChild(m);
  m.querySelector('.cls').onclick = m.querySelector('#sp_c').onclick = () => m.remove();
  m.querySelector('#sp_y').onclick = () => {
    m.remove();
    violation('minor', 'risk', '无依据中止操作', '当前不存在异常触发条件，中止操作打断作业连续性',
      '细则第十四条：发现设备运动方向异常、五防锁具无法正常开启等问题时立即中止；中止应有明确依据。');
    speak('这一处没有异常触发条件。中止是对的能力，但要有依据。', { pose: 'correct' });
  };
}

/* ---------------- 五防模拟 ---------------- */
async function wfClick(i) {
  if (i !== S.wf) { toast('五防模拟须按操作票顺序逐项进行', 'bad'); return; }
  const x = WUFANG[i];
  say('j', x[1] + '（监护人根据操作票操作步骤完整念出）');
  await speak(x[1] + '。', { pose: 'call' });
  say('o', `（移动鼠标至五防电脑屏幕${x[1].replace(/^(断开|拉开|合上)/, '')}处并手指）${x[1]}。`);
  await speak('对，执行。', { pose: 'confirm', nod: 1 });
  S.wf = i + 1; renderPanel();
  if (S.wf >= 4) {
    say('j', '模拟完毕，检查模拟步骤。');
    await speak('模拟完毕，检查模拟步骤。', { pose: 'explain' });
    say('o', '先断开1163开关，再依次拉开11634、11632刀闸；后合上116340地刀，模拟顺序正确。');
    await speak('正确。前几项操作均在后台执行，暂不下传电脑钥匙，保持后台操作准备。现在开始执行操作票。', { pose: 'explain', nod: 1 });
    startRun();
  }
}
