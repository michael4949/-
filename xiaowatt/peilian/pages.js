/* ===== 底座各页：评分复盘 / 成长档案 / 知识课堂 + 角色切换（数据全部取自 recs.js） ===== */

/* ---------- 各页数据（脱敏模拟；人员评价类结论均以人工审核为准） ---------- */
const MILESTONES = [
  { d: '2024-08-30', t: '入职集中培训结业', k: 'done' },
  { d: '2025-02-28', t: '导师带教期通过', k: 'done' },
  { d: '2025-06-12', t: '首次独立完成倒闸操作', k: 'done' },
  { d: '2026-03-18', t: '安规年度考试 92 分', k: 'done' },
  { d: null, ago: 27, t: '首张 #3主变转检修操作票演练', k: 'done' },
  { d: null, ago: 25, t: '首个应急处置情境演练', k: 'done' },
  { d: null, ago: 11, t: '操作票考核模式首次及格', k: 'done' },
  { d: null, ago: -2, t: '操作票考核模式（班组长下发）', k: 'next' },
  { d: null, ago: -30, t: '17 类应急处置卡全部练过', k: 'future' },
  { d: null, ago: -45, t: '岗位胜任度认定（人工审核）', k: 'future' }
];
const LADDER = [
  { post: '变电运行值班员', cur: true, req: ['安规考试 ≥ 80', '操作票考核模式及格', '应急处置卡 17 类覆盖', '年度学时 ≥ 90'], met: () => { const A = homeAgg(); const t = allRecs().find(r => r.src === 'tk' && /考核/.test(r.mode)); return [true, !!(t && t.pass), A.cards.size >= 17, HOME_USER.hours.done >= 90]; } },
  { post: '变电运行主值', cur: false, req: ['胜任度认定通过', '独立值班 ≥ 12 个月', '应急处置考核均分 ≥ 85', '带教新员工 1 名'], met: () => [false, false, false, false] },
  { post: '值长', cur: false, req: ['主值任职 ≥ 24 个月', '事故预案演练组织', '班组管理培训结业'], met: () => [false, false, false] }
];
const HOUR_LOG = [
  { d: 2, n: '变电站防误操作专题', h: 2, src: '知识课堂' },
  { d: 4, n: '各类场所人身事故事件应急处置（演练学时）', h: 0.5, src: '陪练平台回写' },
  { d: 9, n: '安规（变电部分）年度复训', h: 4, src: '知识课堂' },
  { d: 11, n: '#3主变运行转检修操作票（演练学时）', h: 1, src: '陪练平台回写' },
  { d: 15, n: '两票管理细则修编解读', h: 2, src: '知识课堂' }
];
const CLASSROOM = {
  syncAt: '今日 07:30',
  supply: [
    { k: 'course', n: '课程库', v: '1,240 门', dir: 'in' },
    { k: 'quiz', n: '题库', v: '8,600 题', dir: 'in' },
    { k: 'hours', n: '学时', v: '68 / 90', dir: 'out' },
    { k: 'profile', n: '学员画像', v: '36 字段', dir: 'in' }
  ],
  quizLink: [
    { vio: '操作票：先拉母线侧刀闸（顺序错误）', q: '主变停电时，主变侧与母线侧刀闸的拉开顺序是？', mastery: 70, tries: 2 },
    { vio: '操作票：编号与屏柜附表不一致', q: '主变保护屏高压侧控制电源空开的编号在哪里核对？', mastery: 60, tries: 3 },
    { vio: '应急：事例中没指出单人进入高压场所', q: '触电施救时，哪三类做法被明确禁止？', mastery: 80, tries: 2 },
    { vio: '应急：信息报送没说“在检查中”', q: '原因未明确前，对外报送原因应统一怎么说？', mastery: 50, tries: 1 }
  ],
  profileSync: [['岗位与序列', '变电运行值班员 · 运行序列', '已同步'], ['资质证书', '2 项有效', '已同步'], ['年度学时', '68 学时', '已回写'], ['技能水平九项', '本期更新', '已同步'], ['演练次数', '近30天', '已回写']]
};
const ARCH_IF = {
  course: { n: '课程库', dir: '课堂 → 平台', freq: '每日 07:30 增量同步', fields: ['课程编号', '课程名称', '学时', '能力标签', '章节', '适用岗位'], last: '1,240 门 · 今日新增 6 门' },
  quiz: { n: '题库', dir: '课堂 → 平台', freq: '每日 07:30 增量同步', fields: ['题目编号', '题干', '选项', '答案', '解析', '依据条款', '能力标签'], last: '8,600 题 · 错题联动 4 类' },
  hours: { n: '学时回写', dir: '平台 → 课堂', freq: '每次演练结束即时回写', fields: ['学员工号', '演练编号', '场景', '学时', '得分', '完成时间'], last: '本月已回写 3 条' },
  profile: { n: '学员画像', dir: '课堂 ⇄ 平台', freq: '每日 07:30 双向同步', fields: ['岗位与序列', '资质证书', '年度学时', '技能水平九项', '演练次数', '任务完成'], last: '36 字段 · 全部一致' }
};
const COURSE_LIB = [
  { id: 'c1', n: '主变停送电操作顺序与转负荷', h: 2, tag: '操作票填写', lvl: '进阶', ch: ['先转负荷后停主变', '先断变低后断变高', '中性点接地刀闸的合与拉'], done: 1, go: 'tk:teach' },
  { id: 'c2', n: 'GIS 间接验电与带电显示装置', h: 2, tag: '操作票填写', lvl: '进阶', ch: ['两个非同源指示', '带电显示装置有电 / 无电对比', '拐臂与机械指示'], done: 0, go: 'tk:teach' },
  { id: 'c3', n: '备自投、压板与远方 / 就地把手', h: 2, tag: '操作票填写', lvl: '基础', ch: ['备自投充放电', '负荷均分压板', '把手与空开编号核对'], done: 0, go: 'tk:teach' },
  { id: 'c4', n: '操作票文字规范：双重名称与一栏一个动词', h: 1, tag: '操作票填写', lvl: '基础', ch: ['双重名称', '主项与子项', '并项的判定'], done: 2, go: 'tk:teach' },
  { id: 'c5', n: '触电事故现场处置（含社会人员触电）', h: 2, tag: '应急处置', lvl: '基础', ch: ['先断电再施救', '禁止的三类做法', '心肺复苏'], done: 1, go: 'em:shock:teach' },
  { id: 'c6', n: '人身事故与高处坠落、物体打击现场救护', h: 3, tag: '应急处置', lvl: '进阶', ch: ['事故快报', '平托法与止血包扎', '心肺复苏 15:2', '不得擅自判定死亡'], done: 0, go: 'em:injury:teach' },
  { id: 'c7', n: '办公场所与生产设备设施火灾处置', h: 2, tag: '应急处置', lvl: '基础', ch: ['先断电源', '119 与逃生', '上风口撤离'], done: 0, go: 'em:efire:teach' },
  { id: 'c8', n: '有限空间与中毒窒息：先检测再施救', h: 2, tag: '应急处置', lvl: '进阶', ch: ['通风与检测', '正压式呼吸器', '盲目施救的教训'], done: 0, go: 'em:confined:teach' },
  { id: 'c9', n: '自然灾害与野外人身安全威胁', h: 2, tag: '应急处置', lvl: '基础', ch: ['地震逃生', '山体滑坡与山洪', '蜂狗蛇蚁四步原则'], done: 0, go: 'em:quake:teach' },
  { id: 'c10', n: '变电管理一所应急信息报送工作指引', h: 1, tag: '信息报送', lvl: '基础', ch: ['电话首报与 7 类重大事件', '缓报原因与敏感字眼', '10 分钟 / 1 小时 / 3 小时续报'], done: 0, go: 'em:shock:teach' },
  { id: 'c11', n: '安规（变电部分）年度复训', h: 4, tag: '操作票填写', lvl: '基础', ch: ['总则', '倒闸操作', '验电接地', '二次工作'], done: 4, go: 'tk:teach' }
];
/* 随堂测验题库：出处为试卷、典型票、处置卡与报送指引 */
const QUIZ = [
  { id: 'q1', t: '操作票填写', q: '#3主变转检修、10kV 3M 负荷转由 #2主变代供，应先做哪一步？', opts: ['断开#3主变变低503开关', '合上10kV 2BM、3M分段532开关', '断开#3主变变高1103开关', '拉开11034刀闸'], a: 1, why: '先合 532 开关把 3M 并入 #2主变供电并检查负荷分配，再断开 503 开关，3M 才不失压。', cite: '典型操作票第 10～15 项' },
  { id: 'q2', t: '操作票填写', q: '主变停电时，两侧开关的断开顺序是？', opts: ['先断变高 1103，后断变低 503', '先断变低 503，后断变高 1103', '同时断开', '顺序不做要求'], a: 1, why: '先断负荷侧、后断电源侧；先断变高会使主变从 10kV 侧被反充电。', cite: '典型操作票第 15、20 项' },
  { id: 'q3', t: '操作票填写', q: '断开 1103 开关之前，必须先完成的是？', opts: ['合上#3主变变高中性点113000地刀', '拉开11032刀闸', '合上110340地刀', '汇报调度'], a: 0, why: '110kV 主变停送电前应合上中性点接地刀闸，防止操作过电压。', cite: '典型操作票第 18、20 项' },
  { id: 'q4', t: '操作票填写', q: '拉开 #3主变变高两把刀闸的顺序是？', opts: ['先拉 2M 侧 11032，后拉主变侧 11034', '先拉主变侧 11034，后拉 2M 侧 11032', '顺序不做要求', '只拉 11034'], a: 1, why: '主变停电先拉主变侧刀闸、后拉母线侧刀闸。', cite: '典型操作票第 30、33 项' },
  { id: 'q5', t: '操作票填写', q: 'GIS 设备合 110340 地刀前如何确认无电压？', opts: ['直接用验电器验电', '检查高压带电显示装置显示无电压，并结合刀闸拉开位置等非同源指示', '看后台电流为零即可', '不需要确认'], a: 1, why: 'GIS 无法直接验电，采用间接验电，应有两个及以上非同样原理或非同源的指示同时发生对应变化。', cite: '安规 6.3.8' },
  { id: 'q6', t: '操作票填写', q: '#3主变高压侧控制电源空开在 10P #3主变保护屏上的编号是？', opts: ['1-4K', '4K1', '1DK', '3-4K'], a: 1, why: '按试卷屏柜附表：4K1 #3主变高压侧控制电源，4K2 #3主变低压侧控制电源。', cite: '试卷附表 · 10P #3主变保护屏' },
  { id: 'q7', t: '操作票填写', q: '“断开刀闸电源、地刀电机电源空气开关”写在一栏里，属于？', opts: ['符合要求', '并项填写', '顺序错误', '阶段越界'], a: 1, why: '操作项目不得并项填写，一个操作项目栏内应只有一个动词。', cite: '电气操作导则 6.1.8' },
  { id: 'q8', t: '应急处置', q: '发现人员触电，下列哪种做法被明确禁止？', opts: ['断开电源', '用干燥木棒挑开电线', '徒手拉拽触电者', '拨打 120'], a: 2, why: '禁止徒手拉拽触电者、使用金属或潮湿工具、单人进入高压场所。', cite: '各类场所触电应急处置卡 · 注意事项' },
  { id: 'q9', t: '应急处置', q: '有限空间内有人晕倒，正确的做法是？', opts: ['立即下去把人拉上来', '先检测空气质量，满足要求后由专业救援人员佩戴正压式呼吸器施救', '往下喊话等他醒来', '先打扫现场'], a: 1, why: '不得盲目施救，必须先检测空气质量，满足要求后再进行施救。', cite: '有限空间突发事件应急处置卡 · 注意事项' },
  { id: 'q10', t: '应急处置', q: '医护人员到达前，伤员摸不到脉搏，应该？', opts: ['判定死亡停止抢救', '继续心肺复苏直至医护人员到达', '等待 120', '搬动伤员'], a: 1, why: '不能根据观察伤员的呼吸或脉搏心跳擅自判定伤员死亡而中断或放弃抢救。', cite: '各类场所人身事故事件应急处置卡 · 注意事项' },
  { id: 'q11', t: '应急处置', q: '生产设备设施着火，处置时首先要注意？', opts: ['及时断开着火设备设施电源', '先拍照', '先疏散再报警', '等消防到场'], a: 0, why: '注意事项：及时断开着火设备设施电源。', cite: '各类生产设备设施火灾应急处置卡 · 注意事项' },
  { id: 'q12', t: '应急处置', q: '野外遇到多发袭击，四步原则的正确顺序是？', opts: ['精准求救→基础救治→脱离威胁→防二次伤害', '脱离威胁→防二次伤害→基础救治→精准求救', '基础救治→脱离威胁→精准求救→防二次伤害', '防二次伤害→精准求救→脱离威胁→基础救治'], a: 1, why: '遇到多发袭击时，遵循“脱离威胁→防二次伤害→基础救治→精准求救”四步原则。', cite: '各类野外人身安全威胁应急处置卡 · 注意事项' },
  { id: 'q13', t: '信息报送', q: '电话首报时应“快报”的内容是？', opts: ['原因结论', '发生时间、变电站和设备、现象', '损失金额', '责任人'], a: 1, why: '快报现象，报送信息主要包含发生时间、变电站和设备。', cite: '应急信息报送工作指引 二、（一）2.（3）①' },
  { id: 'q14', t: '信息报送', q: '原因未明确前，对外报送原因应统一以什么口径？', opts: ['设备老化', '人为误操作', '在检查中', '不报'], a: 2, why: '生产部 / 安监部未明确原因前，各班站不应自行对外报送原因，统一以“在检查中”报送。', cite: '应急信息报送工作指引 二、（一）2.（3）②' },
  { id: 'q15', t: '信息报送', q: '人员轻伤及以上的重大突发事件，第一时间获知的员工应？', opts: ['只报班站长', '直接电话向变电一所分管副总经理汇报', '先发 elink 文字', '等调查清楚再报'], a: 1, why: '7 类重大突发事件由第一时间获知的员工 / 班站长 / 项目负责人直接电话向分管副总经理汇报。', cite: '应急信息报送工作指引 二、（一）1.' },
  { id: 'q16', t: '信息报送', q: '运行部（巡维中心）在 elink 应急信息群报送时间、地点及简单经过的时限是？', opts: ['10 分钟内', '1 小时内', '3 小时内', '当天'], a: 0, why: '10 分钟内在 elink 应急信息群报送发生时间、地点及简单经过。', cite: '应急信息报送工作指引 二、（二）1.（1）' }
];
const BOUNDARY = [
  ['课程与学时', '提供课程、章节与学时规则', '演练后学时回写', '课程清单、学时规则', '演练学时记录'],
  ['题库', '题目与标准答案由现有平台与安全专家供给', '情境化作答、过程纠错、复训', '操作票试卷与典型票、应急处置卡、报送指引', '逐项判定、错误说明与依据、针对性训练建议'],
  ['考试', '正式考试与成绩管理', '实操演练记录（班组长复核后回写）', '培训任务（场景、模式、截止）', '成绩、失分点、能力项得分'],
  ['人员主数据', '人员、岗位、资质、班组', '只读引用，不维护', '姓名、岗位、班组', '—'],
  ['能力评价', '岗位胜任能力评价体系与作业授权认证', '技能水平九项测算（由班组长确认后使用）', '两大场景演练记录', '能力项得分、短板、培训建议']
];
function boundaryHtml() { return `<table class="htbl bndtbl"><tr><th>事项</th><th>现有平台（南网自学 / 人资域）负责</th><th>本产品负责</th><th>输入</th><th>输出</th></tr>${BOUNDARY.map(r => `<tr>${r.map((c, i) => `<td${i === 0 ? ' style="font-weight:700"' : ''}>${c}</td>`).join('')}</tr>`).join('')}</table>`; }

/* ================= 评分复盘 ================= */
const RV = { sel: null, filter: 'all' };
function rvFiltered(all) {
  if (RV.filter === 'tk') return all.filter(r => r.src === 'tk');
  if (RV.filter === 'em') return all.filter(r => r.src === 'em');
  if (RV.filter === 'local') return all.filter(r => !r.mock);
  if (RV.filter === 'fail') return all.filter(r => !r.pass);
  return all;
}
function rvSummary(r) {
  return `${HOME_USER.name} · 演练复盘摘要（${stampOf(r.ts)}）\n场景：${r.n} · ${r.sub} · ${r.mode} · 用时 ${Math.round((r.sec || 0) / 60)} 分钟\n得分：${r.score}（及格 60）${r.pass ? '，合格' : '，不合格'}${(r.fatal || []).length ? '（整票不合格：' + r.fatal.join('、') + '）' : ''}\n失分点：${(r.sum || []).join('；') || '无'}\n下一步：${rvNext(r)}`;
}
function rvNext(r) {
  if (r.src === 'tk') return (r.fatal || []).length ? '先把危险操作对应的顺序写对（验电在前、断开开关在前、先转负荷），再做一次考核模式。' : r.score < 90 ? '按错误清单逐条改，用训练模式再写一遍，重点看漏项与编号。' : '保持，下一次用考核模式计时完成。';
  return r.keyMiss ? '把注意事项背熟，再练一次事例纠错。' : r.score < 80 ? '对照处置卡原文把遗漏的要点补上，再练一次。' : '换一个没练过的情境。';
}
function rvDetail(r) {
  if (r.src === 'tk') {
    const res = tkJudge(r.rows || []);
    const top = res.errs.slice().sort((a, b) => (b.fatalHit ? 1 : 0) - (a.fatalHit ? 1 : 0)).slice(0, 6);
    return `<div class="rvstg">${res.stages.map(s => `<div class="stg"><b>${h(s.n)}</b><div class="bar"><i style="width:${s.pct}%"></i></div><span class="mono">${s.done}/${s.n2}</span></div>`).join('')}</div>
      <table class="htbl"><tr><th>错误</th><th>位置</th><th>处理</th><th>建议写法</th></tr>${top.map(e => `<tr><td><span class="tag ${e.kind === 'danger' ? 'rl' : ''}">${ERR_KINDS[e.kind].n}</span> ${h(e.title)}</td><td class="mono">${e.stdNo}</td><td>${e.fatalHit ? '整票不合格' : e.deduct ? '扣 ' + e.deduct : '复核'}</td><td class="tk3">${h(e.fix)}</td></tr>`).join('') || '<tr><td colspan="4">没有判出错误</td></tr>'}</table>`;
  }
  const e = EMGMAP[r.eid], s = emgScore(e, r.a || {});
  return `<table class="htbl"><tr><th>处置要点</th><th>结果</th></tr>${s.pts.map(x => `<tr><td class="tk3">${h(x.t)}</td><td>${x.st === 'ok' ? '<span class="tag ok">答到</span>' : x.st === 'part' ? '<span class="tag wn">不完整</span>' : '<span class="tag rl">遗漏</span>'}</td></tr>`).join('')}</table>
    ${s.bads.length ? `<table class="htbl" style="margin-top:8px"><tr><th>事例中的问题</th><th>结果</th></tr>${s.bads.map(x => `<tr><td class="tk3">${h(x.t)}</td><td>${x.st === 'ok' ? '<span class="tag ok">已指出</span>' : '<span class="tag rl">关键遗漏</span>'}</td></tr>`).join('')}</table>` : ''}`;
}
function pageReview() {
  const all = allRecs(), list = rvFiltered(all), A = homeAgg();
  if (!RV.sel || !all.find(x => x.id === RV.sel)) RV.sel = (list[0] || all[0]).id;
  if (list.length && !list.find(x => x.id === RV.sel)) RV.sel = list[0].id;
  const r = all.find(x => x.id === RV.sel);
  return `<div class="ppage">
    <div class="ph"><b>评分复盘</b><span>近30天 ${A.cnt} 次 · 平均 ${A.avg} 分 · 及格率 ${A.passRate}% · 记录由两大场景自动留痕</span>
      <span class="phr"><button class="btn sm" data-rvsum="1">生成复盘摘要</button><button class="btn sm" data-start="${r.src === 'tk' ? 'tk:teach' : 'em:' + r.eid + ':teach'}">再练一次</button></span></div>
    <div class="rvwrap">
      <aside class="rvlist hcard hg">
        <div class="hch"><b>演练记录</b><span>${list.length} 次</span></div>
        <div class="chips">${[['all', '全部'], ['tk', '操作票'], ['em', '应急处置'], ['local', '本机'], ['fail', '未及格']].map(([k, n]) => `<span class="chip ${RV.filter === k ? 'on' : ''}" data-rvf="${k}">${n}</span>`).join('')}</div>
        ${list.map(x => `<div class="rvit ${x.id === RV.sel ? 'on' : ''}" data-sess="${x.id}">
          <div class="rv1"><span class="mono">${stampOf(x.ts)}</span>${x.mock ? '' : '<i class="rvloc">本机</i>'}<b class="mono ${x.pass ? 'gv' : 'wv'}">${x.score}</b></div>
          <div class="rv2">${h(x.src === 'tk' ? '操作票填写' : (EMGMAP[x.eid] || {}).card)}</div><div class="rv3">${h(x.mode)} · ${Math.round((x.sec || 0) / 60)} 分钟 · ${h((x.sum || []).join('、') || '无失分')}</div></div>`).join('') || '<div class="tk3" style="padding:14px">没有符合条件的记录。</div>'}
      </aside>
      <main class="rvmain"><section class="hcard ${r.src === 'tk' ? 'ho' : 'hg'}"><div class="hch"><b>${h(r.n)} · ${h(r.sub)}</b><span>${stampOf(r.ts)} · ${h(r.mode)} · 用时 ${Math.round((r.sec || 0) / 60)} 分钟</span><span class="phr"><button class="btn sm pri" data-rec="${r.id}">打开完整报告</button></span></div>
        <div class="hcb"><div class="rvhead"><div class="rvbig ${r.pass ? '' : 'wv'}">${r.score}</div><div><div class="hrow">${r.pass ? '<span class="tag ok">合格</span>' : '<span class="tag rl">不合格</span>'} ${(r.fatal || []).map(f => '<span class="tag rl">' + h(f) + '</span>').join(' ')}${r.keyMiss ? '<span class="tag wn">关键遗漏 ' + r.keyMiss + ' 处</span>' : ''}</div>
          <div class="hrow">失分点：${h((r.sum || []).join('、') || '无')}</div><div class="hrow"><em class="ai">AI</em> 下一步：${h(rvNext(r))}</div></div></div>
          ${rvDetail(r)}</div></section></main>
    </div></div>`;
}

/* ================= 成长档案 ================= */
const GR = { cmp: 'prev', show: { score: true, dur: false, vio: false, hint: false, avg: true, pass: true } };
function goalsGet() { return lsGet(LS_GOALS, {}); }
function goalArr() { const g = goalsGet(); return SK_N.map((_, i) => g[i] != null ? +g[i] : null); }
function growthRadar() {
  const ab = abilityCalc(), g = goalArr(), hasGoal = g.some(v => v != null);
  const target = hasGoal ? g.map((v, i) => v != null ? v : ab.now[i]) : null;
  const cmp = GR.cmp === 'team' ? TEAM_AVG9 : ab.prev;
  return chRadar(SK_N, ab.now, cmp, { w: 440, h: 320, l1: '本期', l2: GR.cmp === 'team' ? '班组均值' : '上期', key: 'gdim', target, c2: GR.cmp === 'team' ? '#7aa0c8' : '#b3bfb2' })
    + `<div class="tk3" style="text-align:center;margin-top:4px">操作票五项取判卷结果，应急处置四项取处置点评；本期为最近 3 次</div>`;
}
function curvePts() {
  return allRecs().filter(r => dayOf(r) <= 30).slice().reverse().map(r => ({
    id: r.id, d: dayOf(r), score: Math.max(50, r.score), dur: Math.max(1, Math.round((r.sec || 0) / 60)),
    vio: ((r.fatal || []).map(() => ({ lv: 'red' }))).concat(Array.from({ length: r.keyMiss || 0 }, () => ({ lv: 'w' }))), hints: [],
    plan: r.src === 'tk' ? '操作票' : ((EMGMAP[r.eid] || {}).card || '应急').slice(0, 6), mode: /考核/.test(r.mode) || r.mode === 'exam' ? '考核模式' : '训练模式'
  }));
}
const BADGES = [
  { id: 'b1', n: '首张操作票', d: '完成一次操作票填写', test: (L) => L.some(r => r.src === 'tk'), go: 'tk:teach' },
  { id: 'b2', n: '零危险操作 · 3 次', d: '最近 3 次操作票没有危险操作', test: L => { const t = L.filter(r => r.src === 'tk').slice(0, 3); return t.length >= 3 && t.every(r => !(r.fatal || []).length); }, go: 'tk:teach' },
  { id: 'b3', n: '满分票', d: '操作票得 100 分', test: L => L.some(r => r.src === 'tk' && r.score >= 100), go: 'tk:exam' },
  { id: 'b4', n: '考核及格', d: '操作票考核模式及格', test: L => L.some(r => r.src === 'tk' && /考核/.test(r.mode) && r.pass), go: 'tk:exam' },
  { id: 'b5', n: '应急入门', d: '练过 3 个及以上应急情境', test: L => new Set(L.filter(r => r.src === 'em').map(r => r.eid)).size >= 3, go: 'em' },
  { id: 'b6', n: '17 类全覆盖', d: '17 类应急处置卡全部练过', test: L => new Set(L.filter(r => r.src === 'em').map(r => (EMGMAP[r.eid] || {}).card)).size >= 17, go: 'em' },
  { id: 'b7', n: '关键点全中', d: '一次事例纠错没有关键遗漏', test: L => L.some(r => r.src === 'em' && r.dims && r.dims.e2 === 100), go: 'em:shock:teach' },
  { id: 'b8', n: '报送规范', d: '信息报送要求全部答到', test: L => L.some(r => r.src === 'em' && r.dims && r.dims.e3 === 100), go: 'em:shock:teach' },
  { id: 'b9', n: '急救能手', d: '急救与自我防护类要点得分率 ≥ 90', test: L => L.some(r => r.src === 'em' && r.dims && r.dims.e4 >= 90), go: 'em:confined:teach' },
  { id: 'b10', n: '双场景', d: '近 7 天两个场景都练过', test: L => { const w = L.filter(r => dayOf(r) <= 7); return w.some(r => r.src === 'tk') && w.some(r => r.src === 'em'); }, go: 'center' },
  { id: 'b11', n: '月练 10 次', d: '近 30 天演练 ≥ 10 次', test: L => L.filter(r => dayOf(r) <= 30).length >= 10, go: 'center' },
  { id: 'b12', n: '学时达标', d: '年度学时 ≥ 90', test: () => HOME_USER.hours.done >= 90, go: 'classroom' }
];
function badgeList() { const L = allRecs(); return BADGES.map(b => Object.assign({}, b, { lit: !!b.test(L) })); }
function hourLog() { return HOUR_LOG.concat(lsGet(LS_HOURS, [])).slice().sort((a, b) => a.d - b.d); }
function hoursAdd(n, hh) { const l = lsGet(LS_HOURS, []); l.unshift({ d: 0, n, h: hh, src: '陪练平台回写' }); lsSet(LS_HOURS, l.slice(0, 20)); }
function pageGrowth() {
  const A = homeAgg(), ab = abilityCalc(), goals = goalArr();
  const badges = badgeList(), lit = badges.filter(b => b.lit).length;
  const up = SK_N.filter((_, i) => ab.now[i] > ab.prev[i]).length;
  const cards = Array.from(new Set(EMG.map(e => e.card)));
  const best = {}; allRecs().filter(r => r.src === 'em').forEach(r => { const c = EMGMAP[r.eid].card; best[c] = Math.max(best[c] || 0, r.score); });
  return `<div class="ppage">
    <div class="ph"><b>成长档案</b><span>${HOME_USER.name} · ${HOME_USER.post} · ${HOME_USER.team}</span><span class="phr"><button class="btn sm" data-print="1">打印 / 导出档案</button></span></div>
    <section class="hcard gcard ho"><div class="gav">${HOME_USER.name.slice(0, 1)}</div>
      <div class="gmeta"><b>${HOME_USER.name}</b><span>${HOME_USER.post} · ${HOME_USER.team} · ${HOME_USER.join} 入职 · 带教师傅 ${HOME_USER.mentor}</span></div>
      <div class="gkpis"><div class="kpi"><b>${A.cnt}</b><span>近30天演练次数</span></div><div class="kpi"><b>${(A.totalMin / 60).toFixed(1)}h</b><span>累计时长</span></div><div class="kpi"><b>${A.avg}</b><span>平均得分</span></div><div class="kpi"><b>${HOME_USER.hours.done}/${HOME_USER.hours.need}</b><span>年度学时</span></div><div class="kpi good"><b>${up}/9</b><span>能力项提升</span></div></div></section>
    <div class="gtwo g21">
      <section class="hcard hg"><div class="hch"><b>能力全景</b><span>技能水平九项 · 本期 vs 对照 · 顶点可查明细</span>
          <span class="phr chips">${[['prev', '上期'], ['team', '班组均值']].map(([k, n]) => `<span class="chip ${GR.cmp === k ? 'on' : ''}" data-gcmp="${k}">${n}</span>`).join('')}</span></div>
        <div class="hcb" id="gradar">${growthRadar()}</div></section>
      <section class="hcard hg"><div class="hch"><b>两期对照与目标</b><span>上期 / 本期 · 目标可直接填写</span></div><div class="hcb"><table class="htbl gtbl"><tr><th>能力项</th><th>场景</th><th>上期</th><th>本期</th><th>变化</th><th>本期目标</th><th>差距</th></tr>
        ${SKILL9.map((s, i) => { const d = ab.now[i] - ab.prev[i], g = goals[i]; return `<tr><td class="hitv" data-gdim="${i}" style="cursor:pointer">${s.n}</td><td class="tk3">${SCENE_N[s.g]}</td><td class="mono">${ab.prev[i]}</td><td class="mono">${ab.now[i]}</td><td class="mono ${d >= 0 ? 'up' : 'dn'}">${d >= 0 ? '+' : ''}${d}</td><td><input class="goalin" data-goal="${i}" type="number" min="0" max="100" value="${g != null ? g : ''}" placeholder="—"></td><td id="ggap${i}" class="mono ${g != null ? (ab.now[i] >= g ? 'gv' : 'wv') : ''}">${g != null ? (ab.now[i] >= g ? '已达成' : ab.now[i] - g) : '—'}</td></tr>`; }).join('')}
      </table><div class="tk3" style="margin-top:6px">目标由本人设定，达成情况以人工审核为准。</div></div></section>
    </div>
    <section class="hcard hg"><div class="hch"><b>成长曲线</b><span>近30天各次演练得分 · 点击图例切换序列 · 点击数据点打开该次复盘</span>
        <span class="phr chips">${[['score', '得分'], ['avg', '7日均线'], ['dur', '用时'], ['vio', '危险操作 / 关键遗漏'], ['pass', '及格/考核线']].map(([k, n]) => `<span class="chip ${GR.show[k] ? 'on' : ''}" data-gshow="${k}">${n}</span>`).join('')}</span></div>
      <div class="hcb" id="gcurve">${chSessionCurve(curvePts(), GR.show, { w: 980, h: 250 })}</div></section>
    <section class="hcard ho"><div class="hch"><b>应急处置卡掌握</b><span>${Object.keys(best).length}/${cards.length} 类已练 · 最好成绩 · 点击直接练</span></div><div class="hcb">
      <div class="emcov">${cards.map(c => { const e = EMG.find(x => x.card === c), v = best[c]; return `<div class="emc ${v == null ? '' : v >= EMG_CFG.pass ? 'ok' : 'w'}" data-start="em:${e.id}:teach"><b>${h(c)}</b><span>${EMG.filter(x => x.card === c).length} 个情境</span><em class="mono">${v == null ? '未练' : v}</em></div>`; }).join('')}</div></div></section>
    <section class="hcard ho"><div class="hch"><b>能力徽章</b><span>${lit} 枚已点亮 · 由演练记录自动判定 · 点击查看条件</span></div><div class="hcb">
      <div class="bgrid">${badges.map(b => `<div class="badge ${b.lit ? 'lit' : ''}" data-badge="${b.id}" data-tip="${b.d}"><svg viewBox="0 0 48 48"><polygon points="24,3 42,13 42,35 24,45 6,35 6,13" fill="${b.lit ? 'url(#gbadge)' : '#f1efe2'}" stroke="${b.lit ? '#c9a227' : '#d9d6c5'}" stroke-width="1.6"/><path d="M15 25 l6 6 12 -13" fill="none" stroke="${b.lit ? '#fff' : '#c8cfb9'}" stroke-width="3" stroke-linecap="round"/><defs><linearGradient id="gbadge" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e3c05a"/><stop offset="1" stop-color="#c9a227"/></linearGradient></defs></svg><b>${b.n}</b></div>`).join('')}</div></div></section>
    <div class="gtwo">
      <section class="hcard ho"><div class="hch"><b>晋升通道</b><span>当前 · ${HOME_USER.post}</span></div><div class="hcb"><div class="ladder">
        ${LADDER.map(r => { const met = r.met(); return `<div class="rung ${r.cur ? 'cur' : ''}"><div class="rh"><b>${r.post}</b>${r.cur ? '<i>当前</i>' : ''}<span class="mono">${met.filter(Boolean).length}/${r.req.length}</span></div>
          <div class="rq">${r.req.map((q, j) => `<span class="${met[j] ? 'ok' : ''}">${met[j] ? '✓' : '○'} ${q}</span>`).join('')}</div></div>`; }).join('')}</div>
        <div class="tk3" style="margin-top:8px">晋升资格以人工审核结果为准。</div></div></section>
      <section class="hcard ho"><div class="hch"><b>成长里程碑</b><span>${MILESTONES.filter(m => m.k === 'done').length} 项已达成</span></div><div class="hcb"><div class="ms">
        ${MILESTONES.map(m => `<div class="msi ${m.k}"><i></i><span class="mono">${m.d || (m.ago >= 0 ? dayLabel(m.ago) : dateAfter(-m.ago))}</span><b>${m.t}</b></div>`).join('')}</div></div></section>
    </div>
    <div class="gtwo">
      <section class="hcard ho"><div class="hch"><b>学时记录</b><span>年度 ${HOME_USER.hours.done}/${HOME_USER.hours.need} 学时 · 知识课堂回写</span></div><div class="hcb"><table class="htbl"><tr><th>日期</th><th>内容</th><th>学时</th><th>来源</th></tr>
        ${hourLog().map(x => `<tr><td class="mono">${x.d === 0 ? '今天' : dayLabel(x.d)}</td><td>${h(x.n)}</td><td class="mono">${x.h}</td><td>${x.src}</td></tr>`).join('')}</table></div></section>
      <section class="hcard ho"><div class="hch"><b>资质证书</b><span>${HOME_USER.certs.length} 项有效</span></div><div class="hcb"><table class="htbl"><tr><th>证书</th><th>取得</th><th>复审期限</th><th>状态</th></tr>
        ${HOME_USER.certs.map(c => `<tr><td>${c.n}</td><td class="mono">${c.got}</td><td class="mono">${c.review}</td><td><span class="tag ok">有效</span></td></tr>`).join('')}</table></div></section>
    </div>
    <div class="tk3" style="margin:6px 4px 14px">能力与胜任度数据为系统测算参考，任职资格评定以人工审核结果为准。</div></div>`;
}
function badgeDrill(id) {
  const b = badgeList().find(x => x.id === id); if (!b) return;
  openDrill(`能力徽章 · ${b.n}`, b.lit ? '已点亮' : '未点亮', `<div class="hrow">点亮条件：${b.d}</div><div class="hrow">判定依据：两大场景演练记录（含本机记录），系统自动判定。</div>${b.lit ? '<div class="hrow"><span class="tag ok">已点亮</span> 保持即可。</div>' : '<div class="hrow"><span class="tag wn">未点亮</span> 完成条件后自动点亮。</div>'}`,
    b.go ? `<button class="btn pri" data-start="${b.go}">去练</button>` : '');
}

/* ================= 知识课堂 ================= */
const CL = { q: '', tag: '全部', quiz: null, plan: null, syncing: false };
function courseProg() { const p = lsGet(LS_COURSE, {}); return COURSE_LIB.map(c => Object.assign({}, c, { done: Math.max(c.done, p[c.id] || 0) })); }
function archSVG() {
  return `<svg viewBox="0 0 900 300" class="chsvg arch">
    <rect x="20" y="30" width="250" height="240" rx="12" fill="#f4f5ec" stroke="#d9d6c5"/>
    <text x="145" y="58" text-anchor="middle" font-size="13" font-weight="700" fill="#33443a">南网人工智能知识课堂</text><text x="145" y="74" text-anchor="middle" font-size="10" fill="#98a69c">供给层</text>
    ${CLASSROOM.supply.map((s, i) => `<g class="hitv" data-arch="${s.k}" data-tip="点击查看「${s.n}」接口字段与同步频率"><rect x="40" y="${88 + i * 44}" width="210" height="34" rx="6" fill="#fff" stroke="#e2dfd0"/><text x="52" y="${109 + i * 44}" font-size="12" fill="#33443a">${s.n}</text><text x="238" y="${109 + i * 44}" text-anchor="end" font-size="11" font-family="var(--mono)" fill="#98a69c">${s.v}</text></g>`).join('')}
    <rect x="480" y="30" width="400" height="240" rx="12" fill="var(--acbg)" stroke="var(--ac)" stroke-width="1.6"/>
    <text x="680" y="58" text-anchor="middle" font-size="14" font-weight="700" fill="var(--acd)">小瓦特·练 AI 智能陪练平台</text><text x="680" y="74" text-anchor="middle" font-size="10" fill="var(--ac)">主体 · 调用供给数据并回写学时</text>
    ${[['场景中心', 500, 92, 'center'], ['操作票填写', 700, 92, 'ticket'], ['应急处置', 500, 150, 'emerg'], ['评分复盘', 700, 150, 'review'], ['成长档案', 500, 208, 'growth'], ['AI 测评', 700, 208, 'assess']].map(([n, x, y, go]) => `<g class="hitv" data-go="${go}" data-tip="打开${n}"><rect x="${x}" y="${y}" width="170" height="44" rx="8" fill="#fff" stroke="var(--acln)"/><text x="${x + 85}" y="${y + 27}" text-anchor="middle" font-size="12.5" fill="var(--acd)">${n}</text></g>`).join('')}
    ${CLASSROOM.supply.map((s, i) => { const y = 105 + i * 44; return s.dir === 'in'
      ? `<path d="M250,${y} C360,${y} 380,${140} 480,${140}" class="gedge gfeed" fill="none"/><circle r="3.4" fill="var(--ac)"><animateMotion dur="${2.6 + i * .4}s" repeatCount="indefinite" path="M250,${y} C360,${y} 380,${140} 480,${140}"/></circle>`
      : `<path d="M480,${160} C380,${160} 360,${y} 250,${y}" class="gedge gact" fill="none"/><circle r="3.4" fill="#c9a227"><animateMotion dur="2.4s" repeatCount="indefinite" path="M480,${160} C380,${160} 360,${y} 250,${y}"/></circle>`; }).join('')}
    <text x="365" y="122" text-anchor="middle" font-size="10.5" fill="var(--ac)">供给 →</text><text x="365" y="188" text-anchor="middle" font-size="10.5" fill="#a8821b">← 学时回写</text>
  </svg>`;
}
function quizHtml() {
  const Q = CL.quiz; if (!Q) return '';
  if (Q.done) {
    const right = Q.ids.filter((id, i) => Q.ans[i] === QUIZ.find(q => q.id === id).a).length;
    const wrong = Q.ids.map((id, i) => [QUIZ.find(q => q.id === id), Q.ans[i]]).filter(([q, a]) => a !== q.a);
    return `<div class="qzdone"><div class="rvbig ${right / Q.ids.length >= .8 ? '' : 'wv'}" style="font-size:44px">${right}<span style="font-size:16px;color:#98a69c">/${Q.ids.length}</span></div>
      <div class="tk3">${Q.topic === '全部' ? '综合测验' : Q.topic} · 学时已回写 0.5 · 记录已写入成长档案</div>
      ${wrong.length ? `<div class="sec"><div class="st">错题</div>${wrong.map(([q]) => `<div class="hrow"><b>${q.q}</b><div class="tk3">正确：${q.opts[q.a]} · ${q.cite}</div></div>`).join('')}</div>` : '<div class="hrow"><span class="tag ok">全部答对</span></div>'}
      <div class="rvact"><button class="btn pri" data-qretry="1">再测一组</button>${wrong.length ? `<button class="btn" data-start="${wrong[0][0].t === '操作票填写' ? 'tk:teach' : 'em'}">去练「${wrong[0][0].t === '操作票填写' ? '操作票填写' : '应急处置'}」</button>` : ''}</div></div>`;
  }
  const q = QUIZ.find(x => x.id === Q.ids[Q.i]), a = Q.ans[Q.i];
  return `<div class="qz"><div class="qzh"><span class="tbno">第 ${Q.i + 1}/${Q.ids.length} 题</span><i class="ctag">${q.t}</i><span class="tk3">${q.cite}</span></div>
    <div class="qzq">${q.q}</div>
    <div class="qzopts">${q.opts.map((o, i) => `<div class="qzo ${a != null ? 'ro ' + (i === q.a ? 'right' : i === a ? 'wrong' : 'dim') : ''}" ${a == null ? `data-qpick="${i}"` : ''}><b>${'ABCD'[i]}</b>${o}</div>`).join('')}</div>
    ${a != null ? `<div class="qzx ${a === q.a ? 'ok' : 'bad'}"><b>${a === q.a ? '回答正确' : '回答错误'}</b> ${q.why} <span class="cite">依据 ${q.cite}</span></div><div class="rvact"><button class="btn pri" data-qnext="1">${Q.i + 1 >= Q.ids.length ? '查看结果' : '下一题'}</button></div>`
      : `<div class="exsay qzsay"><span class="exsayl">口答</span><button class="mic" id="qz_mic" title="语音"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v4"/></svg></button><input id="qz_in" placeholder="点选项，或说 A / B / C / D，也可以用自己的话说"><button class="btn pri" data-qsay="1">提交</button></div>${Q.note ? `<div class="tk3 wv">${Q.note}</div>` : ''}`}</div>`;
}
function planRows() {
  const W = weakOrder().slice(0, 3);
  const cs = courseProg().filter(c => c.done < c.ch.length);
  const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const rows = [];
  for (let d = 0; d < 7; d++) {
    const w = W[d % W.length], R = recoFor(w);
    if (d % 3 === 0) { const c = cs.find(x => (w.s.g === 'tk' ? x.tag === '操作票填写' : x.tag !== '操作票填写')) || cs[0]; if (c) rows.push({ day: days[d], k: '课程', t: `${c.n} · 第 ${c.done + 1} 章「${c.ch[c.done]}」`, min: 30, dim: w.s.n }); }
    else if (d % 3 === 1) rows.push({ day: days[d], k: '演练', t: R.n, min: w.s.g === 'tk' ? 25 : 10, dim: w.s.n, go: R.spec });
    else rows.push({ day: days[d], k: '测验', t: `随堂测验 · ${w.s.g === 'tk' ? '操作票填写' : w.s.k === 'e3' ? '信息报送' : '应急处置'} 6 题`, min: 10, dim: w.s.n });
  }
  return rows;
}
function pageClassroom() {
  const cs = courseProg();
  const tags = ['全部'].concat(Array.from(new Set(COURSE_LIB.map(c => c.tag))));
  const list = cs.filter(c => (CL.tag === '全部' || c.tag === CL.tag) && (!CL.q || c.n.includes(CL.q) || c.ch.some(x => x.includes(CL.q))));
  const hist = lsGet(LS_QUIZ, []);
  const plan = CL.plan || lsGet(LS_PLAN, null);
  return `<div class="ppage">
    <section class="hcard ho"><div class="hch"><b>系统边界</b><span>现有平台负责课程、题库、考试、人员主数据；本产品负责情境练习、过程纠错、复训与回写</span></div><div class="hcb">${boundaryHtml()}</div></section>
    <div class="ph"><b>知识课堂</b><span>南网人工智能知识课堂 · 上次同步 ${CLASSROOM.syncAt}</span><span class="phr"><button class="btn sm ${CL.syncing ? 'busy' : ''}" data-sync="1">${CL.syncing ? '同步中…' : '立即同步'}</button></span></div>
    <section class="hcard hg"><div class="hch"><b>接入关系</b><span>课程 / 题库 / 学员画像 供给 → 平台；演练学时 → 课堂回写 · 点击节点查看接口</span></div><div class="hcb">${archSVG()}</div></section>
    <div class="syncline">${CLASSROOM.supply.map(s => `<span class="sy ok ${CL.syncing ? 'busy' : ''}" data-arch="${s.k}">${s.n} ${s.dir === 'in' ? '已同步' : '已回写'} · ${s.v}</span>`).join('')}</div>
    <div class="gtwo g32">
      <section class="hcard ho"><div class="hch"><b>课程库</b><span>${list.length}/${cs.length} 门 · 点击课程查看章节并继续学习</span></div><div class="hcb">
        <div class="clsearch"><input id="cl_q" data-clq="1" placeholder="搜索课程或章节…" value="${h(CL.q)}"><div class="chips">${tags.map(t => `<span class="chip ${CL.tag === t ? 'on' : ''}" data-ctag="${t}">${t}</span>`).join('')}</div></div>
        <div class="clist">${list.map(c => `<div class="crs hitv" data-course="${c.id}"><div class="crs1"><b>${c.n}</b><i class="ctag">${c.tag}</i><span class="tk3">${c.lvl} · ${c.h} 学时</span></div><div class="hbar"><div class="hfill" style="width:${Math.round(c.done / c.ch.length * 100)}%"></div></div><div class="tk3">${c.done}/${c.ch.length} 章${c.done >= c.ch.length ? ' · 已完成，学时已回写' : c.done ? ' · 学习中' : ''}</div></div>`).join('') || '<div class="tk3">没有匹配的课程。</div>'}</div></div></section>
      <section class="hcard hg"><div class="hch"><b>随堂测验</b><em class="ai">AI 出题</em><span>答错即出依据 · 完成回写 0.5 学时</span></div><div class="hcb" id="quizbox">
        ${CL.quiz ? quizHtml() : `<div class="chips">${['全部', '操作票填写', '应急处置', '信息报送'].map(t => `<span class="chip" data-quiz="${t}">${t}</span>`).join('')}</div>
        <div class="tk3" style="margin-top:8px">按主题抽 6 题（题库 ${QUIZ.length} 题）。${hist.length ? `本机测验 ${hist.length} 次，最近 ${hist[0].right}/${hist[0].n}（${hist[0].topic}）` : ''}</div>`}</div></section>
    </div>
    <div class="gtwo">
      <section class="hcard ho"><div class="hch"><b>错题 → 题库联动</b><span>演练失分点自动匹配练习题</span></div><div class="hcb"><table class="htbl"><tr><th>演练失分点</th><th>匹配题目</th><th>掌握度</th></tr>
        ${CLASSROOM.quizLink.map(q => `<tr><td>${q.vio}</td><td>${q.q}<div class="tk3">练习 ${q.tries} 次</div></td><td style="width:110px"><div class="hbar"><div class="hfill" style="width:${q.mastery}%;background:${q.mastery >= 80 ? 'var(--ac)' : '#c9a227'}"></div></div><span class="mono tk3">${q.mastery}%</span></td></tr>`).join('')}</table></div></section>
      <section class="hcard ho"><div class="hch"><b>本周学习计划</b><em class="ai">AI</em><span>按能力短板 + 课程进度生成 · 由本人确认后生效</span><span class="phr"><button class="btn sm" data-lplan="1">${plan ? '重新生成' : '生成本周计划'}</button></span></div><div class="hcb">
        ${plan ? `<table class="htbl plantbl" id="plantbl"><tr><th>日</th><th>类型</th><th>内容</th><th>时长</th><th>针对</th></tr>${plan.rows.map(r => `<tr class="erow"><td class="mono">${r.day}</td><td><i class="ctag">${r.k}</i></td><td>${h(r.t)}${r.go ? ` <button class="btn sm" data-start="${r.go}">去练</button>` : ''}</td><td class="mono">${r.min} 分钟</td><td class="tk3">${h(r.dim)}</td></tr>`).join('')}</table>
          <div class="rvact">${plan.saved ? '<span class="tag ok">已加入日程</span>' : '<button class="btn pri" data-lplansave="1">确认并加入日程</button>'}<span class="tk3">合计 ${plan.rows.reduce((a, r) => a + r.min, 0)} 分钟 · 计划由系统生成，经本人确认后生效</span></div>` : '<div class="tk3">按九项能力中最弱的三项，结合课程进度生成一周计划。</div>'}</div></section>
    </div>
    <div class="gtwo">
      <section class="hcard hg"><div class="hch"><b>学员画像同步</b><span>课堂 ⇄ 平台</span></div><div class="hcb"><table class="htbl"><tr><th>字段</th><th>当前值</th><th>状态</th></tr>
        ${CLASSROOM.profileSync.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td><span class="tag ok">${r[2]}</span></td></tr>`).join('')}</table></div></section>
      <section class="hcard ho"><div class="hch"><b>学时回写记录</b><span>近30天</span></div><div class="hcb"><table class="htbl"><tr><th>日期</th><th>内容</th><th>学时</th><th>来源</th></tr>
        ${hourLog().map(x => `<tr><td class="mono">${x.d === 0 ? '今天' : dayLabel(x.d)}</td><td>${h(x.n)}</td><td class="mono">${x.h}</td><td>${x.src}</td></tr>`).join('')}</table></div></section>
    </div></div>`;
}
function courseDrill(id) {
  const c = courseProg().find(x => x.id === id); if (!c) return;
  $$('.mask').forEach(m => m.remove());
  openDrill(`课程 · ${c.n}`, `${c.tag} · ${c.lvl} · ${c.h} 学时 · ${c.done}/${c.ch.length} 章`, `
    <div class="hbar" style="margin-bottom:10px"><div class="hfill" style="width:${Math.round(c.done / c.ch.length * 100)}%"></div></div>
    ${c.ch.map((n, i) => `<div class="chap ${i < c.done ? 'done' : i === c.done ? 'cur' : ''}"><i>${i < c.done ? '✓' : i + 1}</i><b>${n}</b><span>${i < c.done ? '已完成' : i === c.done ? '当前章节' : '待学'}</span></div>`).join('')}
    <div class="tk3" style="margin-top:8px">章节完成后学时按课堂口径回写至成长档案。</div>`,
    (c.done < c.ch.length ? `<button class="btn pri" data-cnext="${c.id}">学完本章「${c.ch[c.done]}」</button>` : '') + `<button class="btn" data-start="${c.go}">去练相关场景</button>`);
}
function courseNext(id) {
  const p = lsGet(LS_COURSE, {}); const c = courseProg().find(x => x.id === id); if (!c) return;
  p[id] = c.done + 1; lsSet(LS_COURSE, p);
  if (p[id] >= c.ch.length) { hoursAdd(c.n, c.h); toast(`「${c.n}」已完成，学时回写 ${c.h}`, 'ok'); }
  else toast(`已完成第 ${p[id]} 章，进度已同步`, 'ok');
  rerender('classroom'); courseDrill(id);
}
function quizStart(topic) {
  let pool = topic === '全部' ? QUIZ.slice() : QUIZ.filter(q => q.t === topic);
  if (pool.length < 6) pool = pool.concat(QUIZ.filter(q => !pool.includes(q)));
  const seed = Date.now() % 5; pool = pool.slice(seed).concat(pool.slice(0, seed));
  CL.quiz = { topic, ids: pool.slice(0, 6).map(q => q.id), i: 0, ans: {}, done: false };
  const b = $('#quizbox'); if (b) b.innerHTML = quizHtml();
}
function quizAnswer(i) { const Q = CL.quiz; if (!Q || Q.ans[Q.i] != null) return; Q.ans[Q.i] = i; Q.note = ''; const b = $('#quizbox'); if (b) b.innerHTML = quizHtml(); }
/* 口答：说字母 / 第几个 / 用自己的话说，按文字相近度对到选项 */
function quizSay(text) {
  const Q = CL.quiz; if (!Q || Q.ans[Q.i] != null) return;
  text = (text || '').trim(); if (!text) return;
  const q = QUIZ.find(x => x.id === Q.ids[Q.i]);
  const t = text.replace(/\s+/g, '');
  let pick = -1;
  const m = t.match(/^(?:选|答案是|答案|是|我选|选择)?([ABCDabcd])(?:[项。.，]|$)/) || t.match(/第([一二三四1234])(?:个|项|条)/);
  if (m) { const c = m[1].toUpperCase(); pick = 'ABCD'.indexOf(c); if (pick < 0) pick = '一二三四'.indexOf(c); if (pick < 0) pick = '1234'.indexOf(c); }
  if (pick < 0) { let best = -1, bs = 0; q.opts.forEach((o, i) => { const sc = sim(text, o); if (sc > bs) { bs = sc; best = i; } }); if (bs >= 0.3) pick = best; }
  if (pick < 0) { Q.note = `没有对应到答案：「${text.slice(0, 24)}」。说具体一点，或直接说 A / B / C / D。`; const b = $('#quizbox'); if (b) b.innerHTML = quizHtml(); return; }
  quizAnswer(pick);
}
function quizNext() {
  const Q = CL.quiz; if (!Q) return;
  Q.i++;
  if (Q.i >= Q.ids.length) {
    Q.done = true;
    const right = Q.ids.filter((id, i) => Q.ans[i] === QUIZ.find(q => q.id === id).a).length;
    const hh = lsGet(LS_QUIZ, []); hh.unshift({ ts: Date.now(), topic: Q.topic, right, n: Q.ids.length }); lsSet(LS_QUIZ, hh.slice(0, 20));
    hoursAdd(`随堂测验 · ${Q.topic === '全部' ? '综合' : Q.topic}（${right}/${Q.ids.length}）`, 0.5);
    rerender('classroom'); return;
  }
  const b = $('#quizbox'); if (b) b.innerHTML = quizHtml();
}
function planGen() {
  CL.plan = { rows: planRows(), saved: false, ts: Date.now() };
  rerender('classroom');
  $$('#plantbl .erow').forEach((r, i) => { r.classList.add('pre'); setTimeout(() => { r.classList.remove('pre'); r.classList.add('in'); }, 110 * i + 60); });
}
function syncNow() {
  if (CL.syncing) return;
  CL.syncing = true; rerender('classroom');
  setTimeout(() => { const d = new Date(); CLASSROOM.syncAt = `今日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; CL.syncing = false; rerender('classroom'); toast('课程库 / 题库 / 学员画像已同步，学时已回写', 'ok'); }, 1100);
}
function archDrill(k) {
  const f = ARCH_IF[k]; if (!f) return;
  openDrill(`接口 · ${f.n}`, `${f.dir} · ${f.freq}`, `<div class="hrow">最近同步：${f.last}</div><div class="sec"><div class="st">字段</div><div class="rvtags">${f.fields.map(x => `<i class="ok">${x}</i>`).join('')}</div></div><div class="hrow">同步方式：增量拉取，失败自动重试，结果写入学时回写记录。</div>`);
}

/* ================= 页面渲染后的挂载 ================= */
function pageAfter(h) { }

/* ================= 角色切换（学员 ⇄ 班组长） ================= */
function renderRole() {
  const u = ROLE.cur === 'lead' ? LEAD_USER : HOME_USER;
  const chip = $('.uchip'); if (chip) chip.innerHTML = `<i>${u.name.slice(0, 1)}</i>${u.name} · ${ROLE.cur === 'lead' ? '班组长' : u.team}<em>切换</em>`;
  $$('#hnav .hnavi.lk').forEach(n => n.classList.toggle('unlocked', ROLE.cur === 'lead'));
}
function toggleRole() {
  ROLE.cur = ROLE.cur === 'lead' ? 'student' : 'lead';
  renderRole();
  toast(ROLE.cur === 'lead' ? `已切换为班组长 ${LEAD_USER.name} 视角` : `已切换为学员 ${HOME_USER.name} 视角`);
  const hh = (location.hash || '').replace('#', '');
  if (ROLE.cur === 'student' && (hh === 'team' || hh === 'sys')) goPage('home');
  else if (ROLE.cur === 'lead' && (hh === 'home' || !hh)) goPage('team');
}

/* ================= 页面内点击（在 bindHPage 之前拦截） ================= */
function pagesClick(e) {
  const q = s => e.target.closest(s); let n;
  /* 复盘 */
  if (n = q('[data-sess]')) { RV.sel = n.dataset.sess; if (location.hash === '#review') rerender('review'); else goPage('review'); return true; }
  if (n = q('[data-rvf]')) { RV.filter = n.dataset.rvf; rerender('review'); return true; }
  if (n = q('[data-rvsum]')) { const r = allRecs().find(x => x.id === RV.sel); if (!r) return true; openDrill('复盘摘要', '提交班组长前由本人确认', `<div class="draft" id="rvsum_txt" style="white-space:pre-line">${h(rvSummary(r))}</div>`, '<button class="btn" data-copy="rvsum_txt">复制</button>'); return true; }
  if (n = q('[data-copy]')) { const t = $('#' + n.dataset.copy); const txt = t ? t.innerText : ''; try { navigator.clipboard.writeText(txt); } catch (err) { } n.textContent = '已复制'; return true; }
  /* 档案 */
  if (n = q('[data-gcmp]')) { GR.cmp = n.dataset.gcmp; $$('[data-gcmp]').forEach(x => x.classList.toggle('on', x === n)); const g = $('#gradar'); if (g) g.innerHTML = growthRadar(); return true; }
  if (n = q('[data-gshow]')) { const k = n.dataset.gshow; GR.show[k] = !GR.show[k]; n.classList.toggle('on', GR.show[k]); const c = $('#gcurve'); if (c) c.innerHTML = chSessionCurve(curvePts(), GR.show, { w: 980, h: 250 }); return true; }
  if (n = q('[data-gdim]')) { drillDim(+n.dataset.gdim); return true; }
  if (n = q('[data-badge]')) { badgeDrill(n.dataset.badge); return true; }
  if (n = q('[data-print]')) { window.print(); return true; }
  /* 课堂 */
  if (n = q('[data-arch]')) { archDrill(n.dataset.arch); return true; }
  if (n = q('[data-sync]')) { syncNow(); return true; }
  if (n = q('[data-ctag]')) { CL.tag = n.dataset.ctag; rerender('classroom'); return true; }
  if (n = q('[data-course]')) { courseDrill(n.dataset.course); return true; }
  if (n = q('[data-cnext]')) { courseNext(n.dataset.cnext); return true; }
  if (n = q('[data-quiz]')) { quizStart(n.dataset.quiz); return true; }
  if (n = q('[data-qpick]')) { quizAnswer(+n.dataset.qpick); return true; }
  if (n = q('[data-qsay]')) { const i = $('#qz_in'); quizSay(i ? i.value : ''); return true; }
  if (n = q('#qz_mic')) { const Q = CL.quiz; const qq = Q ? QUIZ.find(x => x.id === Q.ids[Q.i]) : null; micStart(n, $('#qz_in'), qq ? 'ABCD'[qq.a] + '，' + qq.opts[qq.a] : ''); return true; }
  if (n = q('[data-qnext]')) { quizNext(); return true; }
  if (n = q('[data-qretry]')) { const t = CL.quiz ? CL.quiz.topic : '全部'; quizStart(t); return true; }
  if (n = q('[data-lplan]')) { planGen(); return true; }
  if (n = q('[data-lplansave]')) { const p = CL.plan || lsGet(LS_PLAN, null); if (p) { p.saved = true; CL.plan = p; lsSet(LS_PLAN, p); } toast('本周计划已加入日程，每日待练任务将按计划提醒', 'ok'); rerender('classroom'); return true; }
  return false;
}
function pagesInput(e) {
  let n;
  if (n = e.target.closest('[data-goal]')) {
    const i = +n.dataset.goal, g = goalsGet(); if (n.value === '') delete g[i]; else g[i] = Math.max(0, Math.min(100, +n.value)); lsSet(LS_GOALS, g);
    const now = abilityNow();
    const gap = $('#ggap' + i); if (gap) { const v = g[i]; gap.textContent = v != null ? (now[i] >= v ? '已达成' : now[i] - v) : '—'; gap.className = 'mono ' + (v != null ? (now[i] >= v ? 'gv' : 'wv') : ''); }
    const r = $('#gradar'); if (r) r.innerHTML = growthRadar();
    return;
  }
  if (n = e.target.closest('[data-clq]')) { CL.q = n.value.trim(); const pos = n.selectionStart; rerender('classroom'); const q2 = $('#cl_q'); if (q2) { q2.focus(); q2.setSelectionRange(pos, pos); } return; }
}
