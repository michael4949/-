/* ===== 陪练关卡定义（两份，反馈与判定文案照客户方案原文；教练台词为监护人 / 值班负责人口吻） =====
   ① 110kV 培训三线 1163 线路陪练关卡方案（开关检查 + 地刀检查修订版）—— 教练：监护人 陈志远
   ② #3主变雨淋阀水喷雾系统机械手动启动实操培训方案（雨淋阀检查版）—— 教练：值班负责人 周建国
   情境（station）只交代任务，不列步骤；goals 是学员要自己做到的事：look 走到设备前看并说出状态 · op 按住 / 拖动才算操作 · say 口述结论或汇报 · qa 口述考问 · drag 拖动手柄 */

const RULE_VD = STEPS.find(s => s.no === '20').rule;             // 细则第十三条（四）先验电再接地
const RULE_VD2 = STEPS.find(s => s.no === '18').rule;            // 附录 G-23 两种非同源指示
const RULE_GIS = STEPS.find(s => s.no === '21').rule;            // 附录 G-5 地刀操作后多重核对
const RULE_CHK = STEPS.find(s => s.no === '6').rule;             // 附录 F 2.11.3 d）检查断路器位置
const RULE_CUR = STEPS.find(s => s.no === '7').rule;             // 附录 F 2.11.3 e）三相无电流
const RISK_VD = RISKS[9][2], RISK_GIS = RISKS[8][2], RISK_ID = RISKS[6][2];
const T = (re, t) => re.test(t);
/* 读「分 / 合」：显示分 / 指示分 / 为分 / 分闸 / 分位 → open；否则含 合 → close */
function readOC(t) { if (/(显示|指示|为|是|在|读)\s*分|分闸|分位|分开|已分/.test(t)) return 'open'; if (/合闸|合位|在合|显示合|指示合|已合|是合/.test(t)) return 'close'; return null; }
function readVolt(t) { t = t.replace(/带电显示/g, ''); if (/有电压|带电|还有电|灯亮|亮着/.test(t)) return 'live'; if (/无电压|没有电压|没电|确无|为零|都是0|0\.0|灯灭|都灭|不亮|没亮/.test(t)) return 'none'; return null; }
function readPress(t) { if (/异常|偏低|太低|过低|红区|不正常|不足|没有压力|无压/.test(t)) return 'low'; if (/正常|绿区|够|有压力|\d/.test(t)) return 'ok'; return null; }
function readValve(t) { if (/关闭|未开|没开|未全开|关着|关位|没打开/.test(t)) return 'closed'; if (/开启|打开|全开|开着|开位|是开|为开/.test(t)) return 'open'; return null; }
const SP1163 = {
  hmi: { cb: { n: '培训三线1163开关', zoom: zoomHmiCb, bad: '这是 1163 开关本身。' }, es: { n: '116340 地刀', zoom: st => zoomHmiRows(st, 'volt').replace('遥测 · 培训三线 1163 线路二次电压', '116340 地刀 · 后台位置'), bad: '这是 116340 地刀的后台位置，不是你现在要看的。' }, cur: { n: '三相电流遥测', zoom: st => zoomHmiRows(st, 'cur'), bad: '这是三相电流。' }, volt: { n: '线路二次电压遥测', zoom: st => zoomHmiRows(st, 'volt'), bad: '这是线路二次电压。' }, sp: { n: '软压板', bad: '这是保护软压板，这关不动它。' }, sig: { n: '信号列表', bad: '信号列表可以看，但结论要从位置和遥测来。' } },
  mech: { ind: { n: '分、合闸指示窗', zoom: zoomMech }, spring: { n: '储能指示', bad: '这是储能指示，不是分合闸指示。' }, cnt: { n: '动作计数器', bad: '这是动作计数器。' }, manual: { n: '手动分合闸按钮', bad: '停，机构箱里的手动按钮不能碰，这一项只看不动。', crit: true, fix: '检查项只看不动，不得触碰机构箱内操作按钮', risk: RISK_ID, rule: RULE_CHK } },
  cab: { esInd: { n: '就地控制柜 116340 位置指示', zoom: zoomEsInd }, hv: { n: '高压带电显示装置', zoom: zoomHv }, cbInd: { n: '1163 开关位置指示', bad: '这是 1163 开关的指示，不是地刀。' }, knob: { n: 'ZK 远方/就地把手', bad: '把手已经在就地位置，这一项不动它。' }, ops: { n: '刀闸 / 地刀就地操作按钮', bad: '就地操作按钮在柜面上，但 116340 的操作在地刀操作面板做。' }, alarm: { n: '光字牌', bad: '光字牌没有告警。' } },
  gnd: { lock: { n: '电气五防锁', bad: '五防钥匙已经下传，锁已解。' }, knob: { n: '15KS 控制方式切换', bad: '控制方式已在就地。' }, stop: { n: '急停按钮', bad: '急停不是这时候按的。', crit: true, fix: '急停只在异常时使用', risk: RISK_ID } },
  pano: { cab: { n: '就地控制柜', zoom: zoomEsInd }, mech: { n: '刀闸机构箱', zoom: zoomMechEs }, rod: { n: '刀闸连杆', zoom: zoomRod }, cb: { n: '1163 断路器筒体', bad: '这是 1163 断路器，你现在要看的是 116340 地刀的位置。' } }
};

const EXAM_1163 = {
  id: 'e1163', n: '110kV 培训三线 1163 线路由运行转检修 · 开关检查与地刀检查', short: '1163 开关与地刀检查', src: '陪练关卡方案 · 地刀状态检查修订版',
  coach: { key: 'jianhu', name: '陈志远', role: '监护人', short: '监' },
  bg: '基于「将 110kV 培训三线 1163 线路由运行转检修」操作票简化，只保留两个关键能力：断开开关后的状态检查；验电、接地及接地后的状态检查。监护人在侧，你先动手：走到设备前看、说出你看到的、按住才算操作。中间非重点步骤由系统完成。',
  max: 10, pass: 6, crit: 3, cover: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
  init(arm) { const cases = ['ok', 'ok', 'mech', 'rod']; return { cb: 'close', d4: 'close', d2: 'close', es: 'open', loc: '远方', unlocked: false, esCase: arm.esCase || cases[Math.floor(Math.random() * cases.length)] }; },
  stations: [
    { id: 'k1_open', part: '关卡一 · 断开开关后的状态检查', title: '断开培训三线 1163 开关', dims: { C: 1, H: .5 }, locs: { hmi: svgHmi1163 }, locNames: { hmi: '监控后台' }, spots: SP1163.hmi,
      brief: '任玲玲，调度令已经下了：将 110kV 培训三线 1163 线路由运行转检修。第一项，断开培训三线 1163 开关。你来做，做的时候手指口述。',
      goals: [{ id: 'open', kind: 'op', n: '断开培训三线 1163 开关', dev: ['cb'], loc: 'hmi', op: 'cb:open', re: /断开|分闸|拉开/, pts: 0, act: st => { st.cb = 'open'; }, praise: '分闸命令发出，后台报文：1163 开关 分闸 变位。', hints: ['开关在后台分图的一次接线上。', '点开 1163 开关，用遥控操作分闸。', '点一次接线上的 1163 方块，按住「分闸」直到执行完成。'], nudge: '任玲玲，第一项还没做。' }],
      badOps: { 'cb:close': '开关本来就在合位，这一项是断开。' },
      outro: (st, mode) => mode === 'exam' ? '命令发出去了。接下来你来。' : '命令是发出去了。但是记住——执行了分闸操作，不等于已经确认分闸成功。现在你来确认，1163 开关是不是真的分开了。' },
    { id: 'k1_check', part: '关卡一 · 断开开关后的状态检查', title: '确认 1163 开关可靠分闸', dims: { B: 1.5, H: .5, F: 1, A: .5 }, locs: { hmi: svgHmi1163, mech: svgMechBox }, locNames: { hmi: '监控后台', mech: '1163 开关机构箱（现场）' }, start: 'hmi', spots: Object.assign({}, SP1163.hmi, SP1163.mech), rule: RULE_CHK, risk: RISK_GIS,
      locSay: { mech: '到现场了。机构箱门已经打开。' },
      brief: (st, mode) => mode === 'exam' ? '分闸命令已经执行。接下来你来。' : '开关分没分开，不能靠命令，要靠你自己去确认。想到哪里就去哪里看，看到什么就说出来。',
      goals: [
        { id: 'hmiPos', kind: 'look', re: /后台|监控|遥信|开关位置/,  n: '后台显示 1163 开关在分闸位置', dev: ['cb'], loc: 'hmi', pts: 1, val: t => { const r = readOC(t); return r ? (r === 'open' ? 'ok' : 'bad') : null; }, sample: '后台显示 1163 开关在分闸位置，分闸变位报文正确', sampleBad: '1163 开关在合闸位置', praise: '后台位置遥信是分闸，变位报文也对。这是第一处。', badText: '后台显示分闸，却判断为合闸。', badSay: '再看方块的颜色和信号栏的报文。', right: '后台显示 1163 开关在分闸位置', hints: ['开关分没分开，后台画面本身就能告诉你。', '看一次接线上 1163 方块的颜色，再看信号栏的变位报文。', '点开 1163 开关看位置遥信：绿色空心方块就是分闸。'], ask: '开关在什么位置？' },
        { id: 'mech', kind: 'look', n: '现场机构箱内部分、合闸指示显示分闸', re: /机构箱|机械指示/,  dev: ['ind'], loc: 'mech', pts: 1.5, val: t => { const r = readOC(t); return r ? (r === 'open' ? 'ok' : 'bad') : null; }, sample: '机构箱内分合闸指示窗显示分', sampleBad: '机构箱指示合闸', praise: '机械指示也是分。这是与后台不同原理的第二处确认。', badText: '机构箱指示显示分，却判断为合。', badSay: '指示窗里到底是哪个字？再看。', right: '机构箱分、合闸指示显示分', hints: ['后台是电气信号，现场机构上还有一处机械的指示。', '到现场，1163 开关机构箱里有分、合闸指示窗。', '切到「1163 开关机构箱」，点左侧黑色指示窗，读出是分还是合。'], ask: '指示窗显示什么？' },
        { id: 'cur', kind: 'look', re: /电流/,  n: '1163 开关三相无电流', dev: ['cur'], loc: 'hmi', pts: 1, val: t => { if (/有电流|带负荷/.test(t)) return 'bad'; const nums = (t.match(/\d+(\.\d+)?/g) || []).map(Number); if (/无电流|为零|都是零|都是0|零/.test(t) || (nums.length && nums.every(n => n === 0))) return 'ok'; if (nums.some(n => n > 0)) return 'bad'; return null; }, sample: '三相电流 Ia 0.00、Ib 0.00、Ic 0.00 A，三相无电流', sampleBad: '三相电流 312 安', praise: 'A、B、C 三相电流都是零。第三处。', badText: '三相电流读数与后台遥测不一致。', badSay: '遥测栏 Ia、Ib、Ic 三行现在是多少？', right: 'Ia/Ib/Ic 均为 0.00 A', badKind: 'read', hints: ['开关真分开了，负荷电流应该是多少？', '去后台遥测信息里看 Ia、Ib、Ic。', '点后台遥测信息栏的 Ia/Ib/Ic 三行，把读数说出来。'], ask: '三相电流各是多少？' },
        { id: 'concl', kind: 'say', n: '综合确认 1163 开关可靠分闸', pts: .5, needAll: true, after: ['hmiPos', 'mech', 'cur'], re: /可靠分闸|分闸成功|确认.{0,6}分闸|已分闸|开关已分|分闸到位/, val: t => /可靠分闸|分闸成功|确认.{0,8}分闸|已分闸|开关已分|分闸到位/.test(t) ? 'ok' : null, sample: '后台分闸位置、机构箱分闸指示、三相无电流三处一致，确认培训三线 1163 开关已可靠分闸', sampleBad: '分闸命令已经执行，1163 开关分闸成功', praise: '三处独立指示一致，这才叫确认分闸成功。', missSay: '还不能下结论。', missText: '只凭部分检查就判定开关可靠分闸。', fix: '后台位置、机构箱指示、三相电流三处都确认后再下结论', hints: ['三处都看完了，可以下结论了。', '把三处一起说：后台位置、机构箱指示、三相电流。', '说：三处一致，确认 1163 开关已可靠分闸。'], nudge: '三处都看过了，你的结论是什么？' }
      ],
      outro: (st, mode) => mode === 'exam' ? '好。' : '好。执行了分闸操作，不等于已经确认分闸成功——这句话记牢。' },
    { id: 'k1_qa', part: '关卡一 · 口述考问', title: '口述考问', dims: { B: 1, C: 1 }, locs: { hmi: svgHmi1163 }, locNames: { hmi: '监控后台' }, spots: SP1163.hmi,
      brief: '我问你一个问题：为什么执行了分闸操作，不等于已经确认分闸成功？用你自己的话说。',
      goals: [{ id: 'qa', kind: 'qa', n: '口述：为什么执行了分闸操作不等于已确认分闸成功', pts: 0, keys: [{ t: '后台位置遥信', re: /后台|监控|遥信|画面/ }, { t: '机构箱分合闸指示', re: /机构箱|机械|指示/ }, { t: '三相无电流', re: /电流/ }, { t: '开关可能拒动或未到位，要确认实际状态', re: /实际|状态|拒动|没到位|未到位|可靠|真的/ }], val(t) { const h = this.keys.filter(k => k.re.test(t)).length; return h >= 3 ? 'ok' : 'bad'; }, sample: '分闸命令发出后，开关可能拒动或没到位，所以要看后台位置、现场机构箱的机械指示和三相电流，三处都确认了，才能说开关实际已经可靠分闸。', sampleBad: '因为规程要求。', praise: '说到点子上了。', badText: '回答要点不全。', badSay(st) { return EX.mode === 'exam' ? '再想想。' : '再想想，刚才你确认了哪三处？为什么要确认？'; }, right: '后台位置、机构箱机械指示、三相电流三处独立确认，因为开关可能拒动或未到位', hints: ['想想刚才你确认了哪三处。', '开关可能拒动、可能没到位——所以不能只信命令。', '答：后台位置、机构箱机械指示、三相电流三处独立确认，才能判定实际已分闸。'] }],
      outro: '好，往下走。' },
    { id: 'mid', title: '系统完成中间非重点步骤', type: 'auto', locs: { hmi: svgHmi1163 }, locNames: { hmi: '监控后台' }, spots: SP1163.hmi, goals: [],
      brief: '中间这几项不是这一关的重点，我替你走完：汇报调度、再经调度令、拉开两把刀闸并检查四项指示、1QK 切就地、再经调度令、五防钥匙下传。',
      items: ['汇报调度：培训三线 1163 开关已断开', '再经调度令：热备用转冷备用', '拉开培训三线线路侧 11634 刀闸并检查四项指示', '拉开培训三线 2M 侧 11632 刀闸并检查四项指示', '1QK 切至就地并汇报调度', '再经调度令：冷备用转检修', '五防模拟下传至电脑钥匙'],
      apply: (st, i) => { if (i === 2) st.d4 = 'open'; if (i === 3) st.d2 = 'open'; if (i === 4) st.loc = '就地'; if (i === 6) st.unlocked = true; } },
    { id: 'k2_hub', part: '关卡二 · 验电、接地及接地后的状态检查', title: '验电与接地', dims: { D: 1.5, F: 1, H: .5, B: .5 }, locs: { hmi: svgHmi1163, cab: svgCabFace, gnd: svgGroundPanel }, locNames: { hmi: '监控后台', cab: '就地控制柜', gnd: '地刀操作面板' }, start: 'hmi', spots: Object.assign({}, SP1163.hmi, SP1163.cab, SP1163.gnd), rule: RULE_VD, risk: RISK_VD, fix: '先验电再接地',
      brief: (st, mode) => mode === 'exam' ? '线路已转冷备用，五防钥匙已下传。下一项：合上培训三线线路侧 116340 地刀。你来。' : '线路已经转到冷备用，五防钥匙也下传了。下一项是合上培训三线线路侧 116340 地刀。接地之前该做什么、怎么做，你自己来，我看着。',
      goals: [
        { id: 'volt', kind: 'look', re: /二次电压|后台.{0,4}电压|遥测/,  n: '后台线路二次确无电压', dev: ['volt'], loc: 'hmi', pts: 1, val: (t, st) => { const r = readVolt(t); if (!r) return null; return r === (st.d4 === 'open' ? 'none' : 'live') ? 'ok' : 'bad'; }, sample: '后台 Uab、Ubc、Uca 都是 0.00 kV，培训三线 1163 线路二次确无电压', sampleBad: '后台线路还有电压', praise: '第一种原理：后台二次电压确无电压。', badText: '后台二次电压判断与实际不符。', badSay: 'Uab、Ubc、Uca 三行现在是多少？', right: '培训三线 1163 线路二次确无电压', hints: ['接地之前，第一件事是什么？', '验电。GIS 不能直接验电，要用两种不同原理的间接指示，先看后台。', '点后台遥测信息栏的 Uab/Ubc/Uca，读数说出来。'], ask: '线路二次电压多少？' },
        { id: 'hv', kind: 'look', re: /带电显示|显示装置/,  n: '1163 间隔高压带电显示装置显示确无电压', dev: ['hv'], loc: 'cab', pts: 1, val: (t, st) => { const r = readVolt(t); if (!r) return null; return r === (st.d4 === 'open' ? 'none' : 'live') ? 'ok' : 'bad'; }, sample: '就地控制柜高压带电显示装置三相灯都灭，显示确无电压', sampleBad: '带电显示装置灯亮着，有电压', praise: '第二种原理：带电显示装置也确无电压。两种非同源指示都变了，可以接地了。', badText: '带电显示装置判断与实际不符。', badSay: '三相指示灯亮没亮？再看。', right: '高压带电显示装置显示确无电压', hints: ['一种指示还不够，规程要两种不同原理。', '就地控制柜上有高压带电显示装置。', '切到「就地控制柜」，点带电显示装置，看三相灯灭没灭。'], ask: '带电显示装置显示什么？' },
        { id: 'gnd', kind: 'op', n: '合上培训三线线路侧 116340 地刀', loc: 'gnd', op: 'gnd:close', re: /合上|合闸|接地|合地刀|116340/, pts: 1, after: ['volt', 'hv'], act: st => { st.es = 'close'; }, praise: '地刀合上了。操作时盯住运动方向、声音和指示的变化。',
          red: { text: '未完成两项验电即合上 116340 地刀，一票否决。', stop: '地刀不能合！你还没验电。', why: '线路可能仍带电', fix: '先完成后台二次电压与高压带电显示装置两项验电，两种非同源指示均已变化后再合地刀', rule: `${RULE_VD}　${RULE_VD2}`, risk: RISK_VD, reset: '地刀已复位到分闸，把验电做完再来。', undo: st => { st.es = 'open'; } },
          hints: ['两项验电都做完了？做完就可以接地了。', '116340 地刀的合闸按钮在地刀操作面板上。', '切到「地刀操作面板」，按住 116340 合闸按钮直到执行完成。'], nudge: '验完电了吗？接下来呢？' }
      ],
      badOps: { 'gnd:open': '地刀本来就在分位，现在要合。' },
      outro: (st, mode) => mode === 'exam' ? '地刀已合上。接下来你来。' : '地刀合上了。但操作完成，不等于地刀合闸到位——现在你去确认它真的合到位了。' },
    { id: 'k2_chk', part: '关卡二 · 验电、接地及接地后的状态检查', title: '116340 地刀合上后的状态检查', dims: { B: 1.5, A: .5, G: 1, E: .5 }, locs: { pano: svgBayPanorama, cab: svgCabFace }, locNames: { pano: '现场全景', cab: '就地控制柜柜面' }, start: 'pano', spots: Object.assign({}, SP1163.pano, SP1163.cab), rule: RULE_GIS, risk: RISK_GIS,
      brief: (st, mode) => mode === 'exam' ? '116340 地刀操作已完成。接下来你来。' : '地刀操作完成了，不能只凭"命令已执行"就算数。到底合没合到位，你自己去看，看完再给我结论。',
      goals: [
        { id: 'cab', kind: 'look', re: /控制柜|汇控/,  n: '就地控制柜显示合闸', dev: ['cab', 'esInd'], loc: 'pano', pts: 1, val: t => { const r = readOC(t); return r ? (r === 'close' ? 'ok' : 'bad') : null; }, sample: '就地控制柜上 116340 地刀位置指示为合闸', sampleBad: '就地控制柜显示分闸', praise: '电气位置指示是合闸。这是第一处。', badText: '就地控制柜显示合闸，却判断为分闸。', badSay: '116340 的红灯亮没亮？', right: '就地控制柜 116340 位置指示为合闸', hints: ['地刀到没到位，先从哪里看起？', '就地控制柜上有 116340 的位置指示灯。', '点全景左侧的就地控制柜，看 116340 红灯亮没亮。'], ask: '116340 位置指示是什么？' },
        { id: 'mech', kind: 'look', n: '刀闸机构箱分、合闸指示显示合闸', re: /机构箱|机械指示/,  dev: ['mech'], loc: 'pano', pts: 1, val: (t, st) => { const r = readOC(t); if (!r) return null; return r === (st.esCase === 'mech' ? 'open' : 'close') ? 'ok' : 'bad'; }, sample: st => st.esCase === 'mech' ? '机构箱分合闸指示显示分' : '机构箱分合闸指示显示合', sampleBad: '机构箱显示合', praise: st => st.esCase === 'mech' ? '你看得对，机构箱显示的是分。控制柜说合、机构箱说分，这就不一致了。' : '机械指示也是合。第二处。', badText: '机构箱机械指示判断与实际不符。', badSay: '指示窗里到底是哪个字？再看。', right: st => st.esCase === 'mech' ? '机构箱显示分（与控制柜不一致）' : '机构箱显示合', hints: ['电气指示只是一处，机构箱上还有机械指示。', '机构箱在 GIS 出线侧下方，指示窗显示分或合。', '点全景右下的刀闸机构箱，读指示窗。'], ask: '机构箱指示显示什么？' },
        { id: 'rod', kind: 'look', re: /连杆/,  n: '刀闸连杆位置符合合闸状态', dev: ['rod'], loc: 'pano', pts: 1, val: (t, st) => { let r = null; if (/未到位|没到|中途|异常|不符|没到位|停在/.test(t)) r = 'bad'; else if (/到位|符合|限位|合位|正常|入槽/.test(t)) r = 'ok'; if (!r) return null; return r === (st.esCase === 'rod' ? 'bad' : 'ok') ? 'ok' : 'bad'; }, sample: st => st.esCase === 'rod' ? '连杆停在中途，没有到合闸限位，位置异常' : '连杆转到了合闸限位，销钉入槽，符合合闸状态', sampleBad: '连杆到位了', praise: st => st.esCase === 'rod' ? '对，连杆停在中途，没到合闸限位。' : '连杆到了合闸限位，销钉入槽。第三处。', badText: '连杆位置判断与实际不符。', badSay: '连杆和合闸限位线重合了吗？再看。', right: st => st.esCase === 'rod' ? '连杆未到合闸限位（异常）' : '连杆位置符合合闸状态', hints: ['机械传动到底到位没有，看什么最直接？', '看地刀操作机构的连杆是不是转到了合闸限位。', '点机构箱旁边的连杆，看它和合闸限位线是否重合。'], ask: '连杆位置怎么样？' },
        { id: 'concl', kind: 'say', n: '判定 116340 地刀状态', pts: 0, needAll: true, after: ['cab', 'mech', 'rod'], re: /可靠合闸|合闸到位|已到位|检查完成|已合上|不一致|不能确认|异常|未到位/,
          val: (t, st) => { const A = /可靠合闸|合闸到位|已到位|检查完成|已合上|合好了|到位了/.test(t) && !/不能|未|没/.test(t), B = /不一致|不能确认|不能判定/.test(t), C = /机械.{0,4}异常|连杆.{0,6}(异常|未到位|没到位)|传动/.test(t); const truth = st.esCase === 'mech' ? 'B' : st.esCase === 'rod' ? 'C' : 'A'; const got = C ? 'C' : B ? 'B' : A ? 'A' : null; if (!got) return null; return got === truth ? 'ok' : 'bad'; },
          sample: st => st.esCase === 'mech' ? '控制柜指示合闸，但机构箱指示分闸，状态不一致，不能确认地刀已可靠合闸，请求中止上报' : st.esCase === 'rod' ? '机构箱显示合闸，但连杆没到合闸限位，机械状态确认异常，请求中止上报' : '就地控制柜、机构箱指示、连杆位置三处一致，116340 地刀已可靠合闸',
          sampleBad: '116340 地刀已可靠合闸',
          praise: st => st.esCase === 'mech' ? '状态不一致。就地控制柜指示与现场机构箱机械位置不一致，当前不能确认地刀已经可靠合闸。判断正确，凡变化必上报。' : st.esCase === 'rod' ? '机械状态确认异常。请检查刀闸连杆位置，确认机械传动机构是否已经实际到位。判断正确，立即中止上报。' : '116340 地刀状态检查完成，已确认地刀合闸到位。',
          missSay: '检查不完整。', missText: '检查不完整。就地控制柜已显示合闸，还需要检查机构箱分、合闸指示和刀闸连杆位置。', fix: '三个位置全部检查、三项一致后再判定；不一致时不得判定为已合闸，应中止并汇报',
          badText: st => st.esCase === 'mech' ? '状态不一致。就地控制柜指示与现场机构箱机械位置不一致，当前不能确认地刀已经可靠合闸。' : st.esCase === 'rod' ? '机械状态确认异常。请检查刀闸连杆位置，确认机械传动机构是否已经实际到位。' : '三项一致却未判定为已合闸到位。',
          badSay: st => st.esCase === 'mech' ? '三处一致吗？控制柜说合、机构箱说分——这能算合闸到位？' : st.esCase === 'rod' ? '连杆停在中途，你还判它到位？' : '三处都一致，你的结论呢？',
          right: st => st.esCase === 'mech' ? '状态不一致，不能确认地刀已可靠合闸' : st.esCase === 'rod' ? '机械状态确认异常' : '116340 地刀已可靠合闸',
          hints: ['三处都看了，一致吗？', '三处一致才能判到位；任何一处对不上，都不能确认。', st => st.esCase === 'mech' ? '答：状态不一致，不能确认地刀已可靠合闸。' : st.esCase === 'rod' ? '答：机械状态确认异常。' : '答：三处一致，116340 地刀已可靠合闸。'], nudge: '看完了吗？给我结论。' }
      ],
      outro: '好。现在向我正式汇报一遍。' },
    { id: 'k2_talk', part: '关卡二 · 口述汇报', title: '向监护人汇报 116340 地刀检查结果', dims: { C: 1, B: .5, E: .5 }, locs: { pano: svgBayPanorama }, locNames: { pano: '现场全景' }, spots: SP1163.pano, rule: RULE_GIS,
      brief: '任玲玲，116340 地刀的检查情况，向我汇报。设备编号按位报读。',
      goals: [{ id: 'rep', kind: 'say', n: '向监护人汇报 116340 地刀检查结果', pts: 0, re: /./,
        keys: st => [{ t: '设备双重名称（培训三线线路侧 116340 地刀）', re: /116340|一一六三四零/ }, { t: '就地控制柜指示', re: /控制柜|汇控/ }, { t: '机构箱指示', re: /机构箱|机械/ }, { t: '连杆位置', re: /连杆/ }, st.esCase === 'ok' ? { t: '结论：已合闸到位', re: /到位|可靠合闸|已合闸|合上位置/ } : { t: '结论：状态不一致，中止并上报', re: /不一致|异常|中止|上报/ }],
        val(t, st) { const ks = this.keys(st); return ks.every(k => k.re.test(t)) ? 'ok' : 'bad'; },
        sample: st => st.esCase === 'ok' ? '报告，培训三线线路侧一一六三四零地刀已合上：就地控制柜位置指示合闸，机构箱分合闸指示合闸，连杆位置符合合闸状态，三项一致，地刀已合闸到位。' : '报告，培训三线线路侧一一六三四零地刀操作后：就地控制柜指示合闸，但机构箱指示与连杆位置不一致，不能确认已可靠合闸，请求中止操作并上报。',
        sampleBad: '地刀已经合好了。',
        praise: st => st.esCase === 'ok' ? '收到。培训三线线路侧 116340 地刀已可靠合闸，继续执行。' : '收到。凡变化必上报，立即中止操作，我向值班负责人汇报。',
        badText: '汇报要素不完整。', badSay(st) { const miss = this.keys(st).filter(k => !k.re.test(EX.log.filter(m => m.who === 'me').slice(-1)[0].t)).map(k => k.t); return EX.mode === 'exam' ? '汇报要素不完整，再报一遍。' : `还缺：${miss.join('、')}。再报一遍。`; }, right: '设备双重名称 + 三个位置 + 结论',
        hints: ['汇报要说清设备双重名称、三个位置各是什么、结论。', '按顺序：培训三线线路侧一一六三四零地刀，控制柜、机构箱、连杆，然后结论。', st => st.esCase === 'ok' ? '照这样报：培训三线线路侧一一六三四零地刀已合上，控制柜指示合闸、机构箱指示合闸、连杆到位，三项一致，已合闸到位。' : '照这样报：培训三线线路侧一一六三四零地刀操作后，控制柜指示合闸，但机构箱或连杆不一致，不能确认已可靠合闸，请求中止上报。'] }],
      outro: '这一关到这里。' }
  ]
};

/* ---------------- 雨淋阀 ---------------- */
const SPRAIN = {
  vg: { pg1: { n: '管网/供水侧压力表', zoom: st => zoomGauge(st, 'pg1') }, pg2: { n: '隔膜/控制腔压力表', zoom: st => zoomGauge(st, 'pg2') }, vOut: { n: '最上方出水阀门', zoom: st => zoomValve(st, 'vOut') }, vIn: { n: '进水阀门', zoom: st => zoomValve(st, 'vIn') }, body: { n: '雨淋阀本体', bad: '这是雨淋阀本体。' }, box: { n: '紧急启动阀盒', zoom: zoomBox }, sol: { n: '电磁阀', bad: '这是电磁阀。' }, test: { n: '试验阀', bad: '这是试验阀。' }, drain: { n: '主排水阀', bad: '停，主排水阀不能动，一动管网压力就泄掉了。', crit: true, fix: '不得操作主排水阀', risk: '误开主排水阀会泄放管网压力，雨淋阀无法正常投入' }, small: { n: '泄压小阀', bad: '这是泄压小阀。' } },
  pano: { v1: { n: '#1主变雨淋阀', zoom: st => zoomPlate(st, 1), plain: true }, v2: { n: '#2主变雨淋阀', zoom: st => zoomPlate(st, 2), plain: true }, v3: { n: '#3主变雨淋阀', zoom: st => zoomPlate(st, 3), plain: true }, v4: { n: '#4主变雨淋阀', zoom: st => zoomPlate(st, 4), plain: true } },
  tr: { spray: { n: '#3主变水喷雾区域', zoom: st => `<svg viewBox="0 0 960 540" class="zsvg">${svgTransformerSpray(st)}</svg>` }, body: { n: '#3主变本体', bad: '看主变周围的喷头和水雾。' } }
};
const EXAM_RAIN = {
  id: 'rain', n: '#3主变雨淋阀水喷雾系统机械手动启动', short: '雨淋阀机械手动启动', src: '实操培训方案 · 雨淋阀检查版',
  coach: { key: 'zhiban', name: '周建国', role: '值班负责人', short: '值' },
  bg: '#3主变防护区发生火灾，且消防报警主机故障、无法通过主机远程启动。两阶段：雨淋阀正常状态检查 → 火情发生后的机械应急启动。值班负责人在侧，你自己看、自己判断、自己动手；不设消防水泵房检查，不安排水泵控制柜操作。',
  max: 10, pass: 6, crit: 7, cover: ['A', 'B', 'D', 'E', 'F', 'G'],
  init(arm) { return { pg1: 'ok', pg2: arm.rainAbn ? 'low' : 'ok', vIn: 'open', vOut: 'open', boxOpen: false, handle: 0, spray: false }; },
  stations: [
    { id: 's0', part: '场景0 · 正常状态检查', title: '#3主变雨淋阀组正常状态检查', dims: { F: 1, B: 1, G: .5 }, locs: { vg: svgValveGroup }, locNames: { vg: '#3主变雨淋阀组' }, spots: SPRAIN.vg, risk: '阀组未处于正常备用状态时，火情发生后雨淋阀无法投入或无法喷水',
      brief: (st, mode) => mode === 'exam' ? '巡视到 #3 主变雨淋阀。阀组是否处于正常备用状态，你来判断。' : '任玲玲，今天巡视到 #3 主变雨淋阀。阀组是不是处于正常备用状态，你自己看，看到什么就说什么，我在旁边。',
      goals: [
        { id: 'pg1', kind: 'look', re: /供水|管网/,  n: '管网/供水侧压力正常', dev: ['pg1'], pts: 1.5, val: (t, st) => { const r = readPress(t); if (!r) return null; return r === (st.pg1 === 'low' ? 'low' : 'ok') ? 'ok' : 'bad'; }, sample: st => st.pg1 === 'low' ? '供水侧压力表指针在红区，压力异常' : '管网供水侧压力 0.6 MPa，指针在绿区，压力正常', sampleBad: '供水侧压力异常', praise: st => st.pg1 === 'low' ? '压力异常，请确认雨淋阀组是否具备正常投入条件。发现得对。' : '压力正常。', badText: st => st.pg1 === 'low' ? '未发现雨淋阀压力异常。' : '压力正常却判断为异常。', badSay: '指针在绿区还是红区？再看。', critOnBad: st => st.pg1 === 'low', right: st => st.pg1 === 'low' ? '压力异常' : '压力正常', fix: '指针在绿区为正常，在红区为异常', hints: ['正常备用状态，先看什么？压力。', '阀组左下角是管网/供水侧压力表。', '点供水侧压力表，看指针在绿区还是红区，读数说出来。'], ask: '供水侧压力多少？' },
        { id: 'pg2', kind: 'look', re: /控制腔|隔膜/,  n: '隔膜/控制腔压力正常', dev: ['pg2'], pts: 1.5, val: (t, st) => { const r = readPress(t); if (!r) return null; return r === (st.pg2 === 'low' ? 'low' : 'ok') ? 'ok' : 'bad'; }, sample: st => st.pg2 === 'low' ? '控制腔压力表指针在红区，压力异常' : '隔膜控制腔压力 0.55 MPa，指针在绿区，压力正常', sampleBad: '控制腔压力正常', praise: st => st.pg2 === 'low' ? '压力异常，请确认雨淋阀组是否具备正常投入条件。发现得对，已通知消防专业处理；阀组恢复备用后我们继续。' : '压力正常。', onOk: st => { if (st.pg2 === 'low') st.pg2 = 'ok'; }, badText: st => st.pg2 === 'low' ? '未发现雨淋阀压力异常。' : '压力正常却判断为异常。', badSay: '指针在哪个区？再看清楚。', critOnBad: st => st.pg2 === 'low', right: st => st.pg2 === 'low' ? '压力异常' : '压力正常', fix: '指针在绿区为正常，在红区为异常', hints: ['隔膜式雨淋阀还有一只表，看的是什么？', '控制腔压力表在阀体左上。', '点隔膜/控制腔压力表，看指针在哪个区。'], ask: '控制腔压力多少？' },
        { id: 'vOut', kind: 'look', re: /出水/,  n: '最上方出水阀门处于开启位置', dev: ['vOut'], pts: 1, val: (t, st) => { const r = readValve(t); if (!r) return null; return r === (st.vOut === 'closed' ? 'closed' : 'open') ? 'ok' : 'bad'; }, sample: '最上方出水蝶阀手柄与管道平行，处于开启位置', sampleBad: '出水阀门是关闭的', praise: '出水阀门处于正常开启位置。', badText: st => st.vOut === 'closed' ? '未发现最上方出水阀门未开启。' : '出水阀门开启却判断为关闭。', badSay: '手柄和管道是平行还是垂直？', critOnBad: st => st.vOut === 'closed', right: '出水阀门开启', fix: '手柄与管道平行为开', hints: ['压力之外，还要看什么？阀门位置。', '最上方的出水蝶阀，看阀位指示。', '点最上方出水阀门，看手柄方向和阀位牌。'], ask: '出水阀门什么位置？' },
        { id: 'vIn', kind: 'look', re: /进水/,  n: '进水阀门处于开启位置', dev: ['vIn'], pts: 1, val: (t, st) => { const r = readValve(t); if (!r) return null; return r === (st.vIn === 'closed' ? 'closed' : 'open') ? 'ok' : 'bad'; }, sample: '进水蝶阀处于开启位置', sampleBad: '进水阀门没开', praise: '进水阀门处于正常开启位置。', badText: st => st.vIn === 'closed' ? '未发现进水阀门未开启。' : '进水阀门开启却判断为关闭。', badSay: '手柄和管道是平行还是垂直？', critOnBad: st => st.vIn === 'closed', right: '进水阀门开启', fix: '手柄与管道平行为开', hints: ['出水阀看了，进水呢？', '进水蝶阀在阀体下方。', '点阀体下方的进水阀门，看阀位。'], ask: '进水阀门什么位置？' },
        { id: 'concl', kind: 'say', n: '判定阀组处于正常备用状态', pts: 0, needAll: true, after: ['pg1', 'pg2', 'vOut', 'vIn'], re: /正常备用|备用状态|可以投入|具备.{0,4}条件|状态正常|都正常/, val: t => /正常备用|备用状态|可以投入|具备.{0,4}条件|状态正常|都正常/.test(t) ? 'ok' : null, sample: '两只压力表正常、进出水阀门都开启，#3 主变雨淋阀组处于正常备用状态', sampleBad: '阀组处于正常备用状态', praise: '#3主变雨淋阀组处于正常备用状态。', missSay: '还没看全。', missText: '未完成四项检查即判定阀组处于正常备用状态。', fix: '四项检查全部完成后再下结论', hints: ['四处都看了，结论呢？', '两只压力表加两个阀门，一起说。', '说：压力正常、阀门开启，阀组处于正常备用状态。'], nudge: '四处都看过了，你的结论？' }
      ],
      outro: '好。这就是正常备用状态的四个检查点。' },
    { id: 's0q', part: '场景0 · 口述考问', title: '口述考问', dims: { F: 1, D: .5 }, locs: { vg: svgValveGroup }, locNames: { vg: '#3主变雨淋阀组' }, spots: SPRAIN.vg,
      brief: '问你一个问题：进水蝶阀和最上方出水蝶阀，为什么必须处于开启位置？',
      goals: [{ id: 'qa', kind: 'qa', n: '口述：进、出水阀门为什么必须开启', pts: 0, keys: [{ t: '进水侧供水通路', re: /供水|进水|水源|管网|压力/ }, { t: '出水侧喷雾通路', re: /喷|出水|喷雾|喷头|主变/ }, { t: '启动后才能出水', re: /启动|投入|动作|打开|开启/ }], val(t) { return this.keys.filter(k => k.re.test(t)).length >= 2 ? 'ok' : 'bad'; }, sample: '进水蝶阀开着才有压力水源，出水蝶阀开着雨淋阀启动后水才能送到主变水喷雾管网；任何一个关着，启动了也喷不出水。', sampleBad: '规程要求。', praise: '对，两条通路都得通。', badText: '回答要点不全。', badSay: '想想水从哪里来、往哪里去。', right: '进水侧供水通路和出水侧喷雾通路都要通', hints: ['水从哪里来？往哪里去？', '进水阀管水源，出水阀管喷雾管网。', '答：进水阀开才有压力水，出水阀开雨淋阀启动后才能喷到主变。'] }],
      outro: '好。' },
    { id: 'sA', part: '场景A · 火情发生后正确找到 #3主变雨淋阀', title: '找到 #3主变雨淋阀', dims: { A: 1, E: .5 }, locs: { pano: svgRainPanorama }, locNames: { pano: '主变雨淋阀区域' }, spots: SPRAIN.pano, risk: '火情发生后选择错误主变对应的雨淋阀，会向无火主变喷水而着火主变得不到保护',
      brief: (st, mode) => mode === 'exam' ? '#3 主变防护区火灾，消防报警主机故障。到阀室，找到 #3 主变雨淋阀。' : '火警：#3 主变防护区火灾，消防报警主机故障，远程启动不了。你马上到阀室，找到 #3 主变雨淋阀，找到了告诉我编号。',
      goals: [{ id: 'find', kind: 'look', re: /雨淋阀|编号/,  n: '找到 #3主变雨淋阀', dev: ['v1', 'v2', 'v3', 'v4'], target: 'v3', wrongDev: 'v1', pts: 1, val: t => { const z = EX.zoom; if (!z) return null; const n = (t.match(/[#＃]?\s*([1-4一二三四])/) || [])[1]; const num = { '一': 1, '二': 2, '三': 3, '四': 4 }[n] || +n; if (!num) return null; if (z === 'v3' && num === 3) return 'ok'; if (z !== 'v3' && num === 3) return 'bad'; if (z !== 'v3' && num === +z.slice(1)) return 'note'; return 'bad'; }, noteSay: '看清了，这不是 #3。', sample: '编号牌 #3主变雨淋阀，确认是 #3', sampleBad: '#3主变雨淋阀', praise: '已确认 #3主变雨淋阀，请检查阀组状态。', badText: '该设备不是 #3主变雨淋阀，请重新确认设备编号。', badSay: '该设备不是 #3主变雨淋阀，请重新确认设备编号。', critOnBad: true, right: '#3主变雨淋阀（第三套，编号牌 #3）', fix: '按现场编号牌确认设备对象不选错', hints: ['每套阀组上方都有现场编号牌。', '火警是 #3 主变，找编号牌写着 #3 的那套。', '第三套，编号牌 #3主变雨淋阀。'], ask: '编号牌上写的是几号？' }],
      outro: '就是这套。设备对象不能选错，这是应急处置的第一步。' },
    { id: 'sC1', part: '场景C · 机械手动启动 #3雨淋阀', title: '找到紧急启动阀盒', dims: { A: 1, E: 1 }, locs: { vg: svgValveGroup }, locNames: { vg: '#3主变雨淋阀组' }, sceneOpt: () => ({ fire: true, title: '#3主变雨淋阀组 · 火情处置' }), spots: Object.assign({}, SPRAIN.vg, { vOut: { n: '最上方出水阀门', bad: '停，出水蝶阀不能动，一关喷雾通路就断了。', crit: true, fix: '不得操作与紧急启动无关的主要控制阀', risk: '误操作出水蝶阀会切断喷雾通路' }, vIn: { n: '进水阀门', bad: '停，进水蝶阀不能动。', crit: true, fix: '不得操作与紧急启动无关的主要控制阀', risk: '误操作进水蝶阀会切断供水' }, pg1: { n: '管网/供水侧压力表', bad: '火情发生后不再重复完整检查，直接机械启动。' }, pg2: { n: '隔膜/控制腔压力表', bad: '火情发生后不再重复完整检查，直接机械启动。' }, sol: { n: '电磁阀', bad: '该阀门不是雨淋阀紧急启动阀。' }, test: { n: '试验阀', bad: '该阀门不是雨淋阀紧急启动阀。' }, small: { n: '泄压小阀', bad: '该阀门不是雨淋阀紧急启动阀。' } }), risk: '错把其他阀门当作紧急启动阀，机械启动失败或影响系统正常工作',
      brief: (st, mode) => mode === 'exam' ? '消防报警主机故障，在 #3 雨淋阀本体处实施机械手动启动。你来。' : '编号无误，外观也没异常，刚才的状态检查已经确认阀组备用正常，不用再查一遍。报警主机坏了，得在阀本体上机械手动启动。怎么启动，你来。',
      goals: [{ id: 'box', kind: 'op', n: '找到并打开紧急启动阀盒', dev: ['box'], op: 'box:open', re: /阀盒|启动盒|打开.{0,4}盒|紧急启动/, pts: 1, act: st => { st.boxOpen = true; }, praise: '找对了。盒盖打开，里面就是手动阀手柄。', hints: ['机械手动启动的部件在阀本体上，不是电磁阀。', '找贴着"手动应急启动"标签的小盒。', '阀体右侧那个带盖的小盒，点开它，按住盒盖打开。'], nudge: '在阀体上找，哪个是紧急启动阀盒？' }],
      outro: '' },
    { id: 'sC2', part: '场景C · 机械手动启动 #3雨淋阀', title: '将盒内手动阀操作至全开', dims: { E: 1, D: .5 }, locs: { box: svgBoxOpen }, locNames: { box: '紧急启动阀盒' }, spots: {}, risk: '未将紧急启动手动阀操作至全开，雨淋阀不能可靠启动',
      brief: (st, mode) => mode === 'exam' ? '手柄在里面。你来。' : '手柄就在里面。把手动阀操作到位——不是点一下就算，要动手。',
      goals: [{ id: 'drag', kind: 'drag', n: '将盒内手动阀操作至全开', pts: 2, min: 90, praise: '#3雨淋阀手动应急阀已全开，雨淋阀系统启动。', part_say: '手动阀未完全开启，请继续操作至全开位置。', part_text: '手动阀未完全开启。', fix: '继续拖动手柄直到全开区域', hints: ['不是点一下，要把手柄拖到底。', '顺时针拖到"全开"刻度。', '按住黄色手柄，拖到右侧"全开"位置再松手。'], nudge: '手柄还没动呢。' }],
      after: st => { st.spray = true; }, outro: '' },
    { id: 'sD', part: '场景D · 确认 #3主变水喷雾正常喷水', title: '确认 #3主变水喷雾正常', dims: { B: 1, E: .5 }, locs: { tr: svgTransformerSpray }, locNames: { tr: '#3主变本体' }, spots: SPRAIN.tr, enter: st => { st.spray = true; }, risk: '未确认 #3主变水喷雾状态，无法判断处置是否有效',
      brief: (st, mode) => mode === 'exam' ? '雨淋阀已启动。#3 主变那边，你去看。' : '雨淋阀启动了。启动不等于喷了水，#3 主变那边喷没喷，你去看，看到了就说。',
      goals: [{ id: 'spray', kind: 'look', re: /喷/,  n: '确认 #3主变水喷雾正常', dev: ['spray'], pts: 1, val: (t, st) => { if (/没喷|无水|不喷|没水|没有水|喷不出/.test(t)) return 'bad'; if (/喷水|喷雾|在喷|正常|覆盖|出水了/.test(t)) return 'ok'; return null; }, sample: '#3 主变周围喷头都在喷水，水雾覆盖本体，水喷雾正常', sampleBad: '没有喷水', praise: '#3主变水喷雾系统喷水正常。', badText: '未正确确认 #3主变水喷雾状态。', badSay: '你再看主变四周的喷头。', right: '#3主变水喷雾正常', fix: '先看喷雾区域再确认', hints: ['启动了不算完，要看结果。', '看主变四周红色管网上的喷头。', '点主变周围的喷雾区域，看到喷水就说出来。'], ask: '喷没喷？' }],
      outro: '#3主变雨淋阀水喷雾系统机械手动启动处置完成。' },
    { id: 'sTalk', part: '汇报', title: '向值班负责人汇报处置情况', dims: { C: 1, E: .5 }, locs: { tr: svgTransformerSpray }, locNames: { tr: '#3主变本体' }, spots: SPRAIN.tr,
      brief: '任玲玲，#3 主变那边处置情况怎么样，向我汇报。',
      goals: [{ id: 'rep', kind: 'say', n: '向值班负责人汇报处置情况', pts: 0, re: /./, keys: () => [{ t: '设备对象（#3主变雨淋阀）', re: /3.?主变|三号主变|#3|＃3/ }, { t: '机械手动启动（手动阀全开）', re: /手动|全开|机械/ }, { t: '水喷雾正常', re: /喷雾|喷水|喷淋/ }], val(t, st) { return this.keys(st).every(k => k.re.test(t)) ? 'ok' : 'bad'; }, sample: '报告，#3主变雨淋阀已在本体处机械手动启动，紧急启动手动阀已全开，#3主变水喷雾系统喷水正常，处置完成。', sampleBad: '已经处理好了。', praise: '收到。#3主变雨淋阀已机械手动启动、水喷雾正常，我通知消防专业到水泵房检查大泵运行。', badText: '汇报要素不完整。', badSay(st) { const miss = this.keys(st).filter(k => !k.re.test(EX.log.filter(m => m.who === 'me').slice(-1)[0].t)).map(k => k.t); return EX.mode === 'exam' ? '汇报要素不完整，再报一遍。' : `还缺：${miss.join('、')}。再报一遍。`; }, right: '设备对象 + 启动方式 + 喷雾结果', hints: ['汇报要说清：哪台主变的雨淋阀、怎么启动的、喷雾结果。', '设备对象、启动方式、结果，三句话。', '照这样报：#3主变雨淋阀已机械手动启动，手动阀全开，水喷雾正常。'] }],
      outro: '这一关到这里。' }
  ]
};

const EXAMS = [EXAM_1163, EXAM_RAIN];
