/* ---------------- 设备点击 ---------------- */
function devClick(id) {
  if (!id) return;
  if (S.stage === 'wufang') { wfDev(id); return; }
  if (S.stage !== 'run' || S.ended) return;
  const st = STEP();

  // 现场四指示 / 核对类热区
  if (id.startsWith('gis_')) { if (S.beat >= 3) gisInspect(id.slice(4)); else toast('先手指本项设备并复诵，执行后再逐项核对指示', ''); return; }
  if (id.startsWith('cab_hvdisp_')) { if (S.beat === 4) { S.gis['hv' + id.slice(11)] = true; renderPanel(); return; } id = 'cab_hvdisp'; }
  if (id === 'bay_draw' || id === 'bay_label') { S.gis[id === 'bay_draw' ? 'draw' : 'label'] = true; renderPanel(); return; }

  // 第4拍：执行
  if (S.beat === 3) {
    if (id !== st.target) {
      violation('major', 'dual', '操作对象错误', `发令对象为 ${st.target}，实际操作 ${id}`,
        '风险7：走错间隔、图实不符或标识错误风险。');
      speak('你操作的不是本项设备。请核对双重名称后重新确认。', { pose: 'stop', shake: true });
      return;
    }
    if (st.act === 'closeE' && !S.key.down) {
      violation('major', 'rule', '未下传电脑钥匙即就地操作', '汇控柜与机构箱的锁具需用电脑钥匙解锁，本次尚未把模拟票下传至电脑钥匙',
        '附录G-2：就地操作应使用与五防模拟一致的电脑钥匙解锁，严禁未经审批私自解锁。');
      speak('钥匙还没下传，这把锁开不了。回五防电脑把模拟票下传到电脑钥匙，再回来操作。', { pose: 'stop', shake: true });
      return;
    }
    if (S.loc === 'hmi' && (st.act === 'open' || st.act === 'pull')) { openRemoteCtl(st); return; }
    if (st.act === 'check' || st.act === 'verify' || st.act === 'gis') { openInspect(st); return; }
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
    hmi_mode: '运行方式光字牌', hmi_current: '三相电流遥测', hmi_volt: '线路二次电压',
    bay_plate: '间隔名称牌', bay_hvdisp: '高压带电显示装置', cab_hvdisp: '高压带电显示装置', bay_draw: '汇控柜模拟接线图', bay_label: '设备标签',
    p8_open: '1163开关分闸按钮', p8_close: '1163开关合闸按钮', ES116340_open: '116340地刀分闸按钮', cab_handle: '11634刀闸操作把手',
    gis_hui: '汇控柜电气指示', gis_mech: '机构箱机械指示', gis_arm: '刀闸拐臂指示', gis_line: '转轴划线标识',
    WFKEY: '电脑钥匙'
  })[id] || id;
}

/* ---------------- 执行动作 ---------------- */
function doExecute(st) {
  const d = S.dev;
  S.lastChg = st.target; setTimeout(() => { if (S.lastChg === st.target) S.lastChg = null; }, 1800);
  switch (st.act) {
    case 'open': d[st.target] = 'open';
      pushMsg('110kV仿真站 培训三线1163开关 分闸 变位', 'new');
      pushMsg('110kV仿真站 培训三线1163开关 保护出口 复归', ''); break;
    case 'pull': d[st.target] = 'open';
      pushMsg(`110kV仿真站 ${st.target.slice(2)}刀闸 分闸 变位`, 'new'); break;
    case 'closeE':
      if (!(S.verify.v1 && S.verify.v2)) { redlineGround([]); return; }
      d[st.target] = 'close';
      S.moving = 'ES116340'; setTimeout(() => { S.moving = null; if (S.loc === 'cab') renderPanel(); }, 2200);
      pushMsg('110kV仿真站 培训三线线路侧116340地刀 合闸 变位', 'new'); break;
    case 'knob': d[st.target] = (d[st.target] === '远控' ? '就地' : '远控');
      pushMsg(`110kV仿真站 ${devName(st.target)} 切至${d[st.target]}`, ''); break;
    case 'mcb': d[st.target] = 'off';
      pushMsg(`110kV仿真站 ${devName(st.target)} 断开`, ''); break;
    case 'tag': S.tags[st.target] = true; break;
    case 'key': S.key.down = true; S.key.held = true;
      pushMsg('110kV仿真站 五防主机 模拟操作票下传至电脑钥匙', ''); break;
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
  S.idx = i; S.sel = null; S.gis = {}; S.beat = 0; S.stepT0 = Date.now();
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
  S.ph.ring = false; S.ph.conn = false; S.ph.cmp = null;
  if (st.act === 'recv') {
    S.ph.ring = true; S.ph.pending = call; S.ord.issued = '';
    renderBeats(); renderPanel(); updateActbar(); Sheet.sync(); renderTaskbar();
    say('s', '调度电话来电。接听后先报出单位和姓名，再听令。');
    return;
  }
  say('j', call);
  await speak(call, { pose: 'call', who: '监护人 陈志远' });
  setBeat(1);
  if (st.act === 'report') say('s', '先向监护人复诵本项汇报内容，监护人核对无误后由监护人向深圳中调汇报。');
  else say('s', `请到 ${LOC[st.loc].name}，手指操作对象「${devName(st.target)}」并完整复诵票面内容。`);
}

/* 设备编号读法：调度术语要求按位报读，不按数值报读（1163 读"一一六三"） */
const NUMREAD = [
  ['一十一万六千三百四十', '116340', '一一六三四零'],
  ['十一万六千三百四十', '116340', '一一六三四零'],
  ['一万一千六百三十四', '11634', '一一六三四'],
  ['一万一千六百三十二', '11632', '一一六三二'],
  ['一千一百六十三', '1163', '一一六三']
];
function numReadErr(v) { for (const r of NUMREAD) if (v.indexOf(r[0]) >= 0) return r; return null; }
function checkNumRead(v) {
  const r = numReadErr(v); if (!r) return;
  violation('minor', 'term', '设备编号读法错误', `把 ${r[1]} 读成"${r[0]}"，设备编号应按位报读为"${r[2]}"`,
    '调度术语：设备编号按位报读，不按数值报读，便于与图纸、标签、五防票逐位核对，也避免与相邻间隔编号听混。');
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
  if (S.beat === 1 || S.beat === 4) (S.lines = S.lines || []).push({ step: st.no, beat: S.beat, t: st.ticket, mine: v, std: S.beat === 1 ? st.recite : st.report });
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
    checkNumRead(v);
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
    if (st.act === 'recv') {
      useChar('diaodu');
      say('d', '复诵正确。');
      await speak('复诵正确。', { pose: 'explain', nod: 1, who: '值班调度员 李明' });
      S.ord.issued = now().slice(0, 5); const lg = S.ph.log[S.ph.log.length - 1]; if (lg) lg.issued = S.ord.issued;
      S.ph.cmp = 'wait'; setBeat(2);
      useChar('jianhu');
      say('s', '请核对操作票任务与调度下令是否一致，在受令席上确认。');
      return;
    }
    if (st.act === 'report') {
      useChar('jianhu');
      say('j', '收到。');
      await speak('收到。', { pose: 'confirm', nod: 1, who: '监护人 陈志远' });
      setBeat(3);
      say('s', '汇报内容核对无误。请监护人拨通深圳中调汇报。');
      return;
    }
    useChar('jianhu');
    say('j', '对，执行。');
    await speak('对，执行。', { pose: 'confirm', nod: 1, who: '监护人 陈志远' });
    setBeat(3);
    say('s', '已发出执行令。请在设备上执行本项操作。');
    return;
  }
  if (S.beat === 4) {
    say('o', v);
    checkNumRead(v);
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
  say('j', '收到。');
  await speak('收到。', { pose: 'confirm', nod: 1 });
  tickMark(st);
  S.score.rule += 4; S.score.order += 3; S.score.dual += 3; S.score.state += 3; S.score.term += 3;
  renderTicket(); renderTop();
  coachComment(st);
  const order = S.plan ? S.plan.steps : STEPS.map((_, i) => i);
  const nx = order.find(k => !STEPS[k]._done);
  if (nx === undefined) { finish(); return; }
  setTimeout(() => enterStep(nx), 400);
}

/* 打勾是动作不是台词：在票面对应行上做一个可见的标记 */
function tickMark(st) {
  const row = $(`#trows [data-no="${st.no}"]`);
  if (row) { row.classList.add('ticking'); setTimeout(() => row.classList.remove('ticking'), 1400); }
}

/* 监护人逐项点评：本项完成后按留痕数据给一句针对性提示（考核模式不点评） */
function coachComment(st) {
  if (S.mode === 'exam') return;
  const used = Math.round((Date.now() - (S.stepT0 || Date.now())) / 1000), ref = stepRef(st);
  const vioHere = S.vio.filter(v => v.step === st.no);
  const line = (S.lines || []).filter(l => l.step === st.no && l.beat === 1).pop();
  const sc = line ? sim(line.mine, line.std) : 1;
  S.cleanRun = vioHere.length ? 0 : (S.cleanRun || 0) + 1;
  let txt = '';
  if (vioHere.length) txt = `本项记了 ${vioHere.length} 处：${vioHere.map(v => v.title).join('、')}。下一项先看指令卡再动手。`;
  else if (sc < 0.86 && line) { const miss = missingSegs(line.mine, line.std); txt = `复诵吻合度 ${Math.round(sc * 100)}%${miss.length ? `，漏了「${miss.slice(0, 2).join('」「')}」` : ''}。设备双重名称与位置要念全。`; }
  else if (used > ref * 1.5) txt = `本项用时 ${used} 秒，超出参考 ${ref} 秒较多。到位后先核对间隔名称，再找操作对象。`;
  else if (S.cleanRun === 3 || S.cleanRun === 6 || S.cleanRun === 10) txt = `<span class="tag ok">连续 ${S.cleanRun} 项零失误</span>节奏很稳，保持这个唱票复诵的完整度。`;
  if (txt) say('s', `<span class="tag2">教练点评</span>${txt}`);
}

/* 调度类项目 */
async function doPhone(st) {
  const lg = S.ph.log[S.ph.log.length - 1];
  if (st.act === 'recv') {
    const u = (S.ord.unit || '').trim(), f = (S.ord.from || '').trim();
    if (!u || !f) {
      violation('minor', 'term', '调度记录不完整', '发令单位或发令人未填写',
        '附录F 2.4／2.5／2.7：发令单位、发令人、受令时间应完整记录在调度操作指令记录簿及操作票相应栏。');
    } else if (!/中调/.test(u) || !/李明/.test(f)) {
      violation('minor', 'term', '调度记录有误', `记录簿发令单位"${u}"、发令人"${f}"与来电不符（深圳中调 · 李明）`,
        '附录F 2.4／2.5：发令单位、发令人应按调度实际下令人如实记录。');
    }
    if (lg) { lg.unit = u; lg.from = f; }
    say('o', '调度令已记录：' + (u || '—') + ' ' + (f || '—') + '，受令时间 ' + (S.ord.time || '').slice(11) + '。');
    setBeat(4); renderPanel();
    await tickStep();
  } else {
    useChar('diaodu');
    say('d', st.report);
    await speak('收到。', { pose: 'explain', who: '值班调度员 李明', nod: 1 });
    if (lg) lg.reported = now().slice(0, 5);
    S.ph.conn = false;
    useChar('jianhu');
    setBeat(4); renderPanel();
    await tickStep();
  }
}

async function reissueOrder() {
  /* 调度更正后重新走一遍接令：调度下令 → 监护人复诵 → 调度确认 → 监护人转述 → 操作人复诵。不与监护人同时开口。 */
  S.ord.cur = ''; S.ph.cmp = null; S.ord.issued = ''; S.ph.conn = true;
  const lg = S.ph.log[S.ph.log.length - 1]; if (lg) { lg.order = '（作废）' + lg.order; lg.issued = ''; }
  renderPanel();
  const fixed = '将110kV培训三线1163线路由热备用转冷备用';
  useChar('diaodu');
  say('d', '深圳中调，李明。更正：现在调度下令，' + fixed + '。');
  await speak('深圳中调，李明。更正：现在调度下令，' + fixed + '。', { pose: 'explain', who: '值班调度员 李明' });
  S.ord.cur = fixed; S.ph.log.push({ no: STEP().no, phase: STEP().phase, recv: now().slice(0, 5), unit: '深圳中调', from: '李明', order: fixed + '（更正）', issued: '', reported: '' });
  renderPanel();
  useChar('jianhu');
  say('j', fixed + '。');
  await speak(fixed + '。', { pose: 'call', who: '监护人 陈志远' });
  useChar('diaodu');
  say('d', '复诵正确。');
  await speak('复诵正确。', { pose: 'explain', nod: 1, who: '值班调度员 李明' });
  S.ord.issued = now().slice(0, 5); const lg2 = S.ph.log[S.ph.log.length - 1]; if (lg2) lg2.issued = S.ord.issued;
  S.ph.conn = false; renderPanel();
  useChar('jianhu');
  say('j', '任玲玲，现在调度下令：' + fixed + '。');
  await speak('任玲玲，现在调度下令：' + fixed + '。', { pose: 'call', who: '监护人 陈志远' });
  setBeat(1);
  say('s', '记录簿改成更正后的下令，然后重新复诵。');
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
      '第17项「检查后台机显示培训三线1163线路二次确无电压」' + (S.verify.v1 ? '已执行' : '<b style="color:#b3372c">未执行</b>'),
      '第18项「检查培训三线1163间隔高压带电显示装置显示确无电压」' + (S.verify.v2 ? '已执行' : '<b style="color:#b3372c">未执行</b>')
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
    <div class="dh"><b>${o.title}</b><span style="font-size:11px;color:#5c6b5f;font-family:var(--mono)">RED LINE · 一票否决</span><span class="cls">×</span></div>
    <div class="db">
      <div class="sec"><div class="st">错在哪</div><div class="sc quote">${o.where}<br>${o.why.map(x => '· ' + x).join('<br>')}</div></div>
      <div class="sec"><div class="st">依据哪一条</div><div class="sc" style="font-size:12px;color:#5c6b5f">${o.rule}</div></div>
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
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
    // 设备示意
    g.strokeStyle = '#d5d9c6'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(60, 40); g.lineTo(760, 40); g.stroke();
    g.fillStyle = '#8b988c'; g.font = '12px monospace';
    g.fillText('110kV 培训三线（线路侧仍带电）', 60, 30);
    g.strokeStyle = t > 1.1 ? '#e23b2e' : '#c8cfb9'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(410, 40); g.lineTo(410, 120); g.stroke();
    // 地刀
    const close = Math.min(1, Math.max(0, (t - 0.35) / 0.8));
    g.save(); g.translate(410, 120);
    g.strokeStyle = close >= 1 ? '#e8b22a' : '#23b26a'; g.lineWidth = 5; g.lineCap = 'round';
    g.rotate((1 - close) * -0.9);
    g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 62); g.stroke(); g.restore();
    g.strokeStyle = '#a5b0a1'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(386, 186); g.lineTo(434, 186); g.stroke();
    g.beginPath(); g.moveTo(394, 194); g.lineTo(426, 194); g.stroke();
    g.beginPath(); g.moveTo(402, 202); g.lineTo(418, 202); g.stroke();
    g.fillStyle = '#98a69c'; g.font = '11px monospace';
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
      g.fillStyle = '#b3372c'; g.font = 'bold 15px sans-serif';
      g.fillText('带电合接地刀闸 → 金属性短路', 520, 60);
      g.fillStyle = '#a8821b'; g.font = '12px monospace';
      g.fillText('短路电流 ≈ 21.4 kA', 520, 84);
      g.fillText('电弧温度 > 6000 ℃', 520, 104);
    }
    if (t > 2.1) {
      g.fillStyle = '#b3372c'; g.font = '12px monospace';
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
      <div class="dh"><b>异常处置流程</b><span style="font-size:11px;color:#5c6b5f;font-family:var(--mono)">凡变化必上报 · 细则第十四条</span></div>
      <div class="db">
        <div class="sec"><div class="st">触发条件</div><div class="sc quote">培训三线线路侧11634刀闸：现场机构箱机械指示与监控后台位置显示不一致</div></div>
        ${steps.map((s, i) => `<div style="display:flex;gap:11px;align-items:flex-start;padding:10px 12px;border-radius:6px;margin-bottom:7px;
          background:${i < cur ? '#ecf6ee' : i === cur ? '#f1f3e8' : '#f0f1e9'};border:1px solid ${i < cur ? '#b5d9c0' : i === cur ? '#0e8f5a' : '#e2dfd0'}">
          <div style="width:20px;height:20px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;
            font-size:11px;font-family:monospace;background:${i < cur ? '#0e8f5a' : i === cur ? '#0e8f5a' : '#dcd9c8'};color:${i <= cur ? '#ffffff' : '#98a69c'}">${i < cur ? '✓' : i + 1}</div>
          <div style="flex:1"><div style="font-size:12.5px;color:${i <= cur ? '#243329' : '#98a69c'};font-weight:${i === cur ? 700 : 400}">${s[0]}</div>
          <div style="font-size:11px;color:#5c6b5f;margin-top:3px;line-height:1.6">${s[1]}</div></div>
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
    <div class="sec"><div class="st">说明</div><div class="sc" style="font-size:12px;color:#5c6b5f">
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
  if (i !== S.wf) { toast(`须按顺序模拟：请先在接线图上点「${devName(WUFANG[S.wf][0])}」`, 'bad'); renderTaskbar(); return; }
  const x = WUFANG[i];
  say('j', x[1] + '（监护人根据操作票操作步骤完整念出）');
  await speak(x[1] + '。', { pose: 'call' });
  say('o', `（移动鼠标至五防电脑屏幕${x[1].replace(/^(断开|拉开|合上)/, '')}处并手指）${x[1]}。`);
  await speak('对，执行。', { pose: 'confirm', nod: 1 });
  if (!S.wfdev) S.wfdev = Object.assign({}, S.dev);
  S.wfdev[x[0]] = x[0] === 'ES116340' ? 'close' : 'open'; S.lastChg = x[0]; setTimeout(() => { if (S.lastChg === x[0]) S.lastChg = null; }, 1800);
  S.wf = i + 1; renderPanel(); renderTaskbar();
  if (S.wf >= 4) {
    say('j', '模拟完毕，检查模拟步骤。');
    await speak('模拟完毕，检查模拟步骤。', { pose: 'explain' });
    say('o', '先断开1163开关，再依次拉开11634、11632刀闸；后合上116340地刀，模拟顺序正确。');
    await speak('正确。前几项操作均在后台执行，暂不下传电脑钥匙，保持后台操作准备。现在开始执行操作票。', { pose: 'explain', nod: 1 });
    startRun();
  }
}
