/* ===== 四个陪练场景引擎（安规知识 / 保命技能 / 案例分析 / 制度学习）与工作票陪练 =====
   每个场景：选题 → 作答 → 判定 → 结果（各自指标体系）→ 记录（recSave）→ 计入对应能力维度。
   题目与标准答案由本平台按安规、处置卡、脱敏案例拟定（讲师演示台状态清单标注），待业务确认。 */

const SC_DEF = {
  rule: { title: '安规条文问答 · 答错即给条款原文', src: '安规（变电部分）· 电气操作导则', how: [['作答', '单选 · 判断 · 口述填空，答错当场给出条款原文，每题再指出依据条款'], ['出题', '从安规与导则条文自动出题，按短板加权'], ['依据', '安规 ' + RULES.filter(r => r.doc === 'aq').length + ' 条 · 导则 ' + RULES.filter(r => r.doc === 'dz').length + ' 条可检索']], chips: [['verify', '验电接地'], ['switch', '倒闸操作'], ['measure', '保证安全的技术措施'], ['secondary', '二次工作']] },
  life: { title: '保命技能 · 步骤排序 · 要点 · 禁止事项', src: '安规保证安全的技术措施 · 现场急救', how: [['作答', '把技能步骤排对顺序，补全关键要点，指出情境中的禁止做法'], ['判定', '顺序、要点、禁止事项逐项比对'], ['依据', '安规 6.1 停电 · 验电 · 接地 · 遮栏与标示牌；应急处置卡急救要点']], chips: [['poweroff', '停电'], ['verify', '验电'], ['ground', '接地'], ['fence', '遮栏与标示牌'], ['cpr', '触电急救']] },
  case: { title: '事故案例分析 · 原因 · 违规 · 教训', src: '事故通报（脱敏案例）· 班组长推送', how: [['作答', '读案例，写直接原因、间接原因、违反条款、防范措施与教训'], ['判定', '与标准分析逐项比对，意思对即得分'], ['来源', '预置脱敏案例（变电 / 配网 / 通用）+ 班组长导入的通报']], chips: [] },
  inst: { title: '制度文件 → 课件 → 数字人讲课 → 测验 → 考试分析', src: '两票管理细则 · 应急信息报送工作指引 · 上传文件', how: [['学习', '制度文件自动生成课件，数字人讲课'], ['测验', '从课件自动出题，关键条款必考'], ['分析', '考完自动给出个人分析与班组对比']], chips: [['d_ticket', '两票管理细则'], ['d_report', '应急信息报送指引'], ['d_aq', '安规技术措施']] },
  wt: { task: '110kV考核站 #3 主变检修 · 第一种工作票 · 安全措施填写' }
};
const SC = { k: null, sub: '', mode: 'teach', timer: null, sec: 0, step: 'form', a: {}, res: null, qs: [], i: 0, retry: null, doc: null, cw: null, rec: null };
function scTimer() {
  if (SC.timer) clearInterval(SC.timer);
  SC.sec = 0; SC.timer = setInterval(() => { SC.sec++; const t = $('#sctimer'); if (t) t.textContent = fmtSec(SC.sec); }, 1000);
}
function scStop() { if (SC.timer) { clearInterval(SC.timer); SC.timer = null; } }
function scStart(k, sub, mode) {
  SC.k = k; SC.sub = sub || ''; SC.mode = mode === 'exam' ? 'exam' : 'teach'; SC.res = null; SC.rec = null; SC.a = {}; SC.step = 'form'; SC.retry = null;
  if (k === 'rule') ruleBegin();
  else if (k === 'life') lifeBegin();
  else if (k === 'case') caseBegin();
  else if (k === 'inst') instBegin();
  else if (k === 'wt') wtBegin();
  goPage('scene');
}
function scOpenRec(r) {
  scStop(); SC.k = r.wt ? 'wt' : r.src; SC.mode = /考核|exam/.test(r.mode) ? 'exam' : 'teach'; SC.rec = r; SC.res = r.rs || null; SC.a = r.a || {}; SC.sub = r.subk || ''; SC.step = 'result'; SC.sec = r.sec || 0;
  if (!SC.res) { goPage('review'); return; }
  goPage('scene');
}
function pageScene() {
  if (!SC.k) return pageCenter();
  if (SC.k === 'rule') return rulePage();
  if (SC.k === 'life') return lifePage();
  if (SC.k === 'case') return casePage();
  if (SC.k === 'inst') return instPage();
  if (SC.k === 'wt') return wtPage();
  return pageCenter();
}
function sceneAfter() { if (SC.k === 'inst' && SC.step === 'exam' && EX.on) examPaint(); }
function scHead(title, sub) {
  const S = SCENE_MAP[SC.k] || SCENE_MAP.tk;
  return `<div class="ph"><h2>${h(SC.k === 'wt' ? '两票填写陪练 · 工作票' : S.n)}</h2><span class="sub">${h(sub || '')}</span>${SC.step !== 'result' ? `<span class="tktimer" id="sctimer">${fmtSec(SC.sec)}</span>` : ''}<span class="tag">${SC.mode === 'teach' ? '训练模式' : '考核模式'}</span><span class="r"><button class="btn s g" data-go="center">返回场景中心</button></span></div>`;
}
/* 记录：各场景统一写入本机记录（评分复盘 / 成长档案 / 能力测算共用） */
function scSave(o) {
  const ts = Date.now();
  const rec = Object.assign({ src: SC.k === 'wt' ? 'tk' : SC.k, wt: SC.k === 'wt', ts, d: stampOf(ts), mode: SC.mode === 'exam' ? '考核模式' : '训练模式', sec: SC.sec, subk: SC.sub }, o);
  recSave(rec); scStop();
  if (typeof taskHit === 'function') taskHit(rec.src, '', rec.score, rec.pass);
  return rec;
}
function scResultHead(res, dimsK) {
  const dims = res.dims;
  return `<div class="card emres ${res.pass ? 'hg' : 'ho'}"><div class="rvhead"><div class="rvbig ${res.pass ? '' : 'wv'}">${res.score}</div><div>
      <div class="hrow">${res.pass ? '<span class="tag ok">合格</span>' : '<span class="tag rl">不合格</span>'} <span class="tag">${SC.mode === 'teach' ? '训练模式' : '考核模式'}</span> 用时 ${fmtSec(SC.sec)}${res.sum && res.sum.length ? ' · 失分点：' + h(res.sum.join('、')) : ' · 没有失分项'}</div>
      <div class="hrow"><em class="ai">AI 点评</em> ${h(res.advice || '')}</div>
      <div class="emdims">${skillsOf(dimsK).map(d => `<span><i>${d.n}</i><b class="mono ${dims[d.k] == null ? '' : dims[d.k] >= 75 ? 'gv' : 'wv'}">${dims[d.k] == null ? '—' : dims[d.k]}</b></span>`).join('')}</div></div></div></div>`;
}
function scResultFoot(again) {
  return `<div class="card"><div class="scgo"><button class="btn pri" data-start="${again}">再练一次</button><button class="btn" data-go="review">评分复盘</button><button class="btn" data-go="growth">成长档案</button><button class="btn g" data-go="center">返回场景中心</button></div></div>`;
}

/* ======================= 安规知识陪练 ======================= */
const RULE_TOPIC = { verify: /验电|接地|无电压/, switch: /倒闸|操作|闭锁|防误|断路器|隔离开关/, measure: /技术措施|停电|遮栏|标志牌|标示牌|围栏/, secondary: /二次|压板|保护|回路/ };
function ruleBegin() {
  const re = RULE_TOPIC[SC.sub];
  let pool = RULES.filter(r => !re || re.test(r.t + r.body + (r.k || []).join('')));
  if (pool.length < 4) pool = RULES.slice();
  const r = rng(Date.now() % 100000 + 7);
  const picked = shuffled(pool, r).slice(0, 6);
  SC.qs = picked.map((ru, i) => {
    const sent = { t: ru.body.split(/(?<=[。；])/).map(x => x.replace(/[。；]$/, '').trim()).filter(x => x.length >= 8)[0] || ru.body, key: true, cl: ru.no, sec: 0, secT: ru.t, cite: (RULE_DOCS.find(d => d.id === ru.doc) || {}).short + ' ' + ru.no + ' ' + ru.t };
    const type = ['choice', 'judge', 'say', 'choice', 'judge', 'choice'][i];
    let q;
    if (type === 'say') {
      const term = (ru.k || []).map(k => k.split('|')[0]).filter(k => sent.t.includes(k)).sort((a, b) => b.length - a.length)[0];
      q = term ? { id: 'rq' + i, type: 'say', stem: sent.t.replace(term, '____'), ans: term, cite: sent.cite, orig: sent.t, key: true } : qFromSent(sent, 'judge', r);
    } else q = qFromSent(sent, type, r);
    const others = shuffled(RULES.filter(x => x.id !== ru.id && x.doc === ru.doc), r).slice(0, 2);
    q.rule = ru; q.citeOpts = shuffled([ru].concat(others), r).map(x => ({ id: x.id, n: x.no + ' ' + x.t }));
    return q;
  });
  SC.i = 0; SC.a = {}; SC.cites = {}; SC.times = {}; SC.retry = null; SC.step = 'form'; scTimer(); SC._t0 = Date.now();
}
function ruleOk(q, a) { if (a == null) return false; if (q.type === 'say') return norm(a).includes(norm(q.ans)) || sim(a, q.ans) >= .7; return qRight(q, a) === true; }
function rulePage() {
  if (SC.step === 'result') return ruleResult();
  const q = SC.qs[SC.i], a = SC.a[q.id], done = a != null, teach = SC.mode === 'teach', retry = SC.retry, last = SC.i === SC.qs.length - 1;
  const ok = done ? ruleOk(q, a) : null;
  const opts = q.type === 'choice' ? `<div class="qzopts">${q.opts.map((o, i) => `<div class="qzo ${done && teach ? (i === q.ans ? 'ok' : a === i ? 'bad' : '') : ''} ${a === i ? 'on' : ''}" data-ruleopt="${i}"><b>${'ABCD'[i]}</b><span>${h(o)}</span></div>`).join('')}</div>`
    : q.type === 'judge' ? `<div class="qzopts row">${[[true, '正确'], [false, '错误']].map(([v, n]) => `<div class="qzo ${done && teach ? (v === q.ans ? 'ok' : a === v ? 'bad' : '') : ''} ${a === v ? 'on' : ''}" data-rulejudge="${v ? 1 : 0}"><b>${v ? '√' : '×'}</b><span>${n}</span></div>`).join('')}</div>`
      : `<div class="exshort"><input id="rule_in" class="rulein" placeholder="把空缺的词说出来或写出来…" value="${h(done ? a : '')}" ${done ? 'disabled' : ''}><div class="embar"><button class="mic" id="rule_mic" title="语音输入"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v4"/></svg></button>${done ? '' : '<button class="btn s" data-rulesay="1">提交这一题</button>'}</div></div>`;
  return `<div class="wrap tkwrap">${scHead('', (SC_DEF.rule.chips.find(c => c[0] === SC.sub) || [])[1] ? '专题 · ' + (SC_DEF.rule.chips.find(c => c[0] === SC.sub) || [])[1] : '安规与电气操作导则 · 随机 6 题')}
    <div class="emsteps"><span class="${retry ? 'done' : 'on'}"><i>1</i>作答 6 题</span><span class="${retry ? 'on' : ''}"><i>2</i>错题复练</span><span><i>3</i>AI 点评</span></div>
    <div class="card emq hg"><div class="exq">
      <div class="exh"><b>${retry ? '错题复练 · ' : ''}第 ${SC.i + 1} / ${SC.qs.length} 题</b><i class="ctag">${q.type === 'choice' ? '单选' : q.type === 'judge' ? '判断' : '口述填空'}</i><span class="tk3">${h(q.rule.t)}</span></div>
      <div class="exprog">${SC.qs.map((x, i) => `<i class="${i === SC.i ? 'on' : SC.a[x.id] != null ? (teach ? (ruleOk(x, SC.a[x.id]) ? 'ok' : 'bad') : 'done') : ''}" data-rulego="${i}"></i>`).join('')}</div>
      <div class="qzq">${h(q.stem)}</div>${opts}
      ${done && teach ? `<div class="tkhintbox ${ok ? '' : 'bad'}"><b>${ok ? '答对' : '答错'}</b>${h(q.type === 'say' ? '标准答案：' + q.ans : q.type === 'choice' ? '正确答案：' + 'ABCD'[q.ans] + '，' + q.opts[q.ans] : q.ans ? '与条文一致。' : '被改动过，' + (q.why || ''))}<div class="tk3" style="margin-top:4px">条款原文 · ${h(q.cite)}：${h(q.rule.body)}</div></div>` : ''}
      <div class="rulecite"><span class="tk3">这一条出自</span>${q.citeOpts.map(c => `<span class="chip ${SC.cites[q.id] === c.id ? 'on' : ''} ${done && teach && SC.cites[q.id] ? (c.id === q.rule.id ? 'okc' : SC.cites[q.id] === c.id ? 'badc' : '') : ''}" data-rulecite="${c.id}">${h(c.n)}</span>`).join('')}</div>
      <div class="embar"><span class="tk3">${teach ? '答错当场给出条款原文；每题再指出依据条款（计入「依据引用」）' : '考核模式：交卷后统一给出条款原文'}</span><span class="r">${SC.i > 0 ? `<button class="btn s" data-rulego="${SC.i - 1}">上一题</button>` : ''}${last ? `<button class="btn pri" data-rulesubmit="1">${retry ? '完成复练 · 看点评' : '交卷'}</button>` : `<button class="btn pri" data-rulego="${SC.i + 1}">下一题</button>`}</span></div>
    </div></div></div>`;
}
function ruleAnswer(v) { const q = SC.qs[SC.i]; if (!q || SC.a[q.id] != null) return; SC.a[q.id] = v; SC.times[q.id] = Math.round((Date.now() - SC._t0) / 1000); SC._t0 = Date.now(); rerender('scene'); }
function ruleSubmit() {
  const miss = SC.qs.filter(q => SC.a[q.id] == null).length;
  if (miss) { toast(`还有 ${miss} 题没答`, 'bad'); return; }
  if (!SC.retry) {
    const wrong = SC.qs.filter(q => !ruleOk(q, SC.a[q.id]));
    SC.first = { qs: SC.qs, a: Object.assign({}, SC.a), cites: Object.assign({}, SC.cites), times: Object.assign({}, SC.times) };
    if (wrong.length && SC.mode === 'teach') {
      SC.retry = { ids: wrong.map(q => q.id) };
      SC.qs = wrong.map(q => Object.assign({}, q, { id: q.id + '_r' })); SC.a = {}; SC.i = 0; SC.times = {};
      toast(`答错 ${wrong.length} 题，马上复练一遍`, ''); rerender('scene'); return;
    }
    SC.retry = { ids: [] , none: true };
  }
  const F = SC.first, firstOk = F.qs.filter(q => ruleOk(q, F.a[q.id])).length;
  const r1 = clamp(firstOk / F.qs.length * 100);
  const citeOk = F.qs.filter(q => F.cites[q.id] === q.rule.id).length, r2 = clamp(citeOk / F.qs.length * 100);
  const base = 30 * F.qs.length, r3 = clamp(100 - Math.max(0, SC.sec - base) / base * 100);
  const r4 = SC.retry.none ? 100 : clamp(SC.qs.filter(q => ruleOk(q, SC.a[q.id])).length / SC.qs.length * 100);
  const dims = { r1, r2, r3, r4 }, score = Math.round(r1 * .55 + r2 * .2 + r4 * .15 + r3 * .1);
  const wrong = F.qs.filter(q => !ruleOk(q, F.a[q.id])).map(q => ({ t: q.stem, cite: q.cite, orig: q.rule.body, a: F.a[q.id], ans: q.type === 'choice' ? q.opts[q.ans] : q.type === 'judge' ? (q.ans ? '正确' : '错误') : q.ans, retry: SC.retry.none ? null : ruleOk(SC.qs.find(x => x.id === q.id + '_r'), SC.a[q.id + '_r']) }));
  const sum = []; if (wrong.length) sum.push('答错 ' + wrong.length + ' 题'); if (r2 < 80) sum.push('依据条款指错 ' + (F.qs.length - citeOk)); if (r3 < 60) sum.push('作答偏慢');
  const advice = wrong.length ? `错在「${wrong.map(w => (F.qs.find(q => q.stem === w.t) || {}).rule.t).filter(Boolean).slice(0, 2).join('」「')}」${SC.retry.none ? '' : '，复练答对 ' + SC.qs.filter(q => ruleOk(q, SC.a[q.id])).length + ' / ' + SC.qs.length}；${r2 < 80 ? '条款编号记不牢，答题时多看一眼出处。' : '条款出处记得清楚。'}` : '六题全对，条款出处' + (r2 >= 100 ? '也全部指对' : '还有指错，再记一记编号') + '。';
  SC.res = { score, pass: score >= 60, dims, sum, wrong, advice, cites: { ok: citeOk, n: F.qs.length } };
  SC.step = 'result';
  const subN = (SC_DEF.rule.chips.find(c => c[0] === SC.sub) || [])[1];
  SC.rec = scSave({ sub: '安规 · ' + (subN || '随机') + ' ' + F.qs.length + ' 题', score, pass: score >= 60, sum, dims, wrong, rs: SC.res, a: F.a });
  rerender('scene');
}
function ruleResult() {
  const R = SC.res;
  return `<div class="wrap tkwrap">${scHead('', '点评')}
    ${scResultHead(R, 'rule')}
    <div class="card"><div class="ch"><b>错题与条款原文</b><span class="note">${R.wrong.length} 题 · 依据条款指对 ${R.cites.ok} / ${R.cites.n}</span></div>
      ${R.wrong.length ? `<table class="tb"><tr><th>题目</th><th>你的答案</th><th>正确答案</th><th>复练</th><th>条款原文</th></tr>${R.wrong.map(w => `<tr><td>${h(w.t)}</td><td class="wv">${h(w.a === true ? '正确' : w.a === false ? '错误' : typeof w.a === 'number' ? 'ABCD'[w.a] : w.a)}</td><td class="gv">${h(w.ans)}</td><td>${w.retry == null ? '—' : w.retry ? '<span class="tag ok">答对</span>' : '<span class="tag rl">仍错</span>'}</td><td class="note">${h(w.cite)}：${h(w.orig)}</td></tr>`).join('')}</table>` : '<div class="note">没有错题。</div>'}</div>
    ${scResultFoot('rule:' + SC.sub + ':' + SC.mode)}</div>`;
}

/* ======================= 保命技能陪练 ======================= */
const LIFE = {
  poweroff: { n: '停电', base: 240, steps: ['接到检修任务，核对工作票上应停电的设备与范围', '断开检修设备各侧断路器（开关）', '拉开各侧隔离开关（刀闸），形成明显断开点', '断开各侧断路器、隔离开关的控制电源和合闸能源', '闭锁隔离开关操动机构，释放已储存的能量', '在断开点的操作把手上加挂机械锁'], fill: [['停电时不应在只经____断开电源的设备上工作', '断路器'], ['对一经合闸即可送电到停电设备的隔离开关，应断开其控制电源和____电源', '动力']], acts: [['只断开断路器就开始工作，认为已经停电', true], ['断开断路器后再拉开两侧隔离开关形成明显断开点', false], ['隔离开关拉开后不断开其电机电源', true], ['检修设备停电后，相邻带电设备不装设遮栏', true], ['断开控制电源与合闸能源后闭锁操动机构', false], ['停电范围按工作票逐项核对', false]] },
  verify: { n: '验电', base: 240, steps: ['选用与被验设备电压等级相符、试验合格的验电器', '先在有电设备上试验，确认验电器良好', '戴绝缘手套，在检修设备进出线两侧各相分别验电', '确认无电压后，立即装设接地线或合上接地刀闸', 'GIS 等无法直接验电的设备，用两个及以上非同源指示间接验电'], fill: [['间接验电应有____个及以上非同样原理或非同源的指示同时发生对应变化', '两'], ['验电前应先在____设备上试验，确认验电器良好', '有电']], acts: [['用低一电压等级的验电器验电', true], ['验电前先在有电设备上试验验电器', false], ['只验一相，其余各相认为相同', true], ['验明无电压后立即接地', false], ['带电显示装置显示有电，仍按无电处理', true], ['戴绝缘手套、使用绝缘杆验电', false]] },
  ground: { n: '接地', base: 240, steps: ['验明设备确无电压', '先装接地端，接地线与接地网可靠连接', '再装导体端，用绝缘杆或戴绝缘手套操作', '在工作地点两侧可能来电的各侧装设接地线', '记录接地线编号与装设位置，拆除时按编号核对'], fill: [['装设接地线应先接____端，后接导体端', '接地'], ['拆除接地线的顺序与装设____', '相反']], acts: [['未验电直接装设接地线', true], ['先装导体端后装接地端', true], ['接地线用缠绕的方法接地', true], ['在工作地点可能来电的各侧都装设接地线', false], ['拆除接地线时先拆导体端再拆接地端', false], ['接地线编号登记并在拆除时核对', false]] },
  fence: { n: '遮栏与标示牌', base: 200, steps: ['在断开的断路器、隔离开关操作把手上挂「禁止合闸，有人工作」标示牌', '在工作地点装设遮栏（围栏），出入口挂「止步，高压危险」', '在带电设备四周装设遮栏，遮栏与带电部分保持安全距离', '在工作地点悬挂「在此工作」标示牌', '工作结束前不得移动或拆除遮栏与标示牌'], fill: [['在断开的开关操作把手上应挂「____，有人工作」标示牌', '禁止合闸'], ['工作地点出入口应挂「止步，____」标示牌', '高压危险']], acts: [['为方便搬运，临时移开部分遮栏', true], ['在断开的开关把手上挂禁止合闸标示牌', false], ['带电设备四周遮栏与带电部分距离不足仍开工', true], ['工作地点挂「在此工作」标示牌', false], ['工作未结束先拆标示牌', true], ['标示牌只能由装设人或工作许可人拆除', false]] },
  cpr: { n: '触电急救', base: 200, steps: ['立即切断电源，或用干燥木棒、竹竿等绝缘物挑开电线', '施救者站在干燥木板或穿绝缘靴，单手拉触电者干燥衣物脱离电源', '拨打 120，说明人员受伤情况与现场风险', '检查意识与呼吸，无呼吸时立即心肺复苏', '持续抢救至医护人员到达，不得擅自判定死亡'], fill: [['触电急救第一步是使触电者脱离____', '电源'], ['无呼吸时应立即进行____', '心肺复苏']], acts: [['直接用手拉触电者脱离电线', true], ['先切断电源再施救', false], ['触电者无呼吸，等医生来再处理', true], ['用干燥木棒挑开电线', false], ['单人进入高压触电现场直接施救', true], ['持续抢救到医护人员到达', false]] }
};
function lifeBegin() {
  const k = LIFE[SC.sub] ? SC.sub : Object.keys(LIFE)[Math.floor(Math.random() * 5)];
  SC.sub = k; const L = LIFE[k], r = rng(Date.now() % 99991 + 3);
  SC.a = { order: [], fill: ['', ''], acts: {} }; SC.pool = shuffled(L.steps.map((t, i) => ({ t, i })), r); SC.acts = shuffled(L.acts.map((x, i) => ({ t: x[0], bad: x[1], i })), r);
  SC.part = 0; scTimer();
}
function lifePage() {
  if (SC.step === 'result') return lifeResult();
  const L = LIFE[SC.sub], A = SC.a, p = SC.part;
  const parts = ['步骤排序', '关键要点', '禁止事项'];
  let box = '';
  if (p === 0) box = `<div class="ch"><b>步骤排序</b><span class="note">按先后顺序点选下面的步骤（点错可在已选列表里点掉）</span></div>
    <div class="lifeord"><div class="lifepool">${SC.pool.filter(s => !A.order.includes(s.i)).map(s => `<div class="lifest" data-lifepick="${s.i}">${h(s.t)}</div>`).join('') || '<div class="note">全部步骤已排入右侧。</div>'}</div>
      <div class="lifeseq">${A.order.map((i, n) => `<div class="lifest on" data-lifedrop="${i}"><i>${n + 1}</i>${h(L.steps[i])}</div>`).join('') || '<div class="note">从左侧按顺序点选步骤…</div>'}</div></div>`;
  else if (p === 1) box = `<div class="ch"><b>关键要点</b><span class="note">补全空缺的关键词（可口述）</span></div>
    ${L.fill.map((f, i) => `<div class="lifefill"><div class="qzq">${h(f[0])}</div><input class="rulein" data-lifefill="${i}" value="${h(A.fill[i] || '')}" placeholder="填空…"></div>`).join('')}`;
  else box = `<div class="ch"><b>禁止事项辨识</b><span class="note">下面这些做法里，哪些是禁止的？勾选所有禁止做法</span></div>
    <div class="qzopts">${SC.acts.map(a => `<div class="qzo ${A.acts[a.i] ? 'on' : ''}" data-lifeact="${a.i}"><b>${A.acts[a.i] ? '✓' : ''}</b><span>${h(a.t)}</span></div>`).join('')}</div>`;
  return `<div class="wrap tkwrap">${scHead('', L.n + ' · 步骤 ' + L.steps.length + ' 步 · 要点 ' + L.fill.length + ' 项 · 做法 ' + L.acts.length + ' 条')}
    <div class="emsteps">${parts.map((s, i) => `<span class="${i === p ? 'on' : i < p ? 'done' : ''}"><i>${i + 1}</i>${s}</span>`).join('')}<span><i>4</i>AI 点评</span></div>
    <div class="card emq ${p === 2 ? 'ho' : 'hg'}">${box}
      <div class="embar"><span class="tk3">${SC.mode === 'teach' ? '训练模式：提交后逐项比对并给出依据' : '考核模式：计时，提交后一次性点评'}</span><span class="r">${p > 0 ? '<button class="btn s" data-lifepart="' + (p - 1) + '">上一步</button>' : ''}${p < 2 ? `<button class="btn pri" data-lifepart="${p + 1}">下一步</button>` : '<button class="btn pri" data-lifesubmit="1">提交点评</button>'}</span></div>
    </div></div>`;
}
function lifeSubmit() {
  const L = LIFE[SC.sub], A = SC.a, n = L.steps.length;
  if (A.order.length < n) { toast(`步骤还有 ${n - A.order.length} 步没排入`, 'bad'); SC.part = 0; rerender('scene'); return; }
  let pairs = 0, okp = 0; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { pairs++; if (A.order.indexOf(i) < A.order.indexOf(j)) okp++; }
  const exact = A.order.filter((v, i) => v === i).length;
  const l1 = clamp(okp / pairs * 100 * .7 + exact / n * 100 * .3);
  const fillOk = L.fill.map((f, i) => norm(A.fill[i] || '').includes(norm(f[1])) || sim(A.fill[i] || '', f[1]) >= .7);
  const l2 = clamp(fillOk.filter(Boolean).length / L.fill.length * 100);
  const bads = L.acts.map((a, i) => ({ t: a[0], bad: a[1], picked: !!A.acts[i] }));
  const hit = bads.filter(x => x.bad && x.picked).length, falseP = bads.filter(x => !x.bad && x.picked).length, nb = bads.filter(x => x.bad).length;
  const l3 = clamp(hit / nb * 100 - falseP * 15);
  const l4 = clamp(100 - Math.max(0, SC.sec - L.base) / L.base * 100);
  const dims = { l1, l2, l3, l4 }, score = Math.round(l1 * .35 + l2 * .2 + l3 * .35 + l4 * .1);
  const sum = []; if (l1 < 100) sum.push('步骤顺序 ' + (n - exact) + ' 步不对位'); if (l2 < 100) sum.push('要点漏 ' + fillOk.filter(x => !x).length); if (hit < nb) sum.push('禁止做法漏指 ' + (nb - hit)); if (falseP) sum.push('误指 ' + falseP);
  const miss = bads.filter(x => x.bad && !x.picked);
  const advice = (l1 >= 90 ? '步骤顺序清楚' : '顺序还要再捋：' + A.order.map((v, i) => v !== i ? '第 ' + (i + 1) + ' 步应是「' + L.steps[i].slice(0, 12) + '…」' : '').filter(Boolean).slice(0, 2).join('，')) + '；' + (miss.length ? '没认出的禁止做法：' + miss.map(x => x.t).join('、') + '，这些在现场就是要命的。' : '禁止做法全部认出。');
  const wrong = [].concat(A.order.map((v, i) => v !== i ? { t: '第 ' + (i + 1) + ' 步排成了「' + L.steps[v] + '」', cite: '应为「' + L.steps[i] + '」' } : null).filter(Boolean), L.fill.map((f, i) => fillOk[i] ? null : { t: f[0], cite: '应填「' + f[1] + '」' }).filter(Boolean), miss.map(x => ({ t: '未指出禁止做法：' + x.t, cite: '安规 6.1 保证安全的技术措施 / 应急处置卡' })));
  SC.res = { score, pass: score >= 60, dims, sum, wrong, advice, bads, fillOk, order: A.order.slice() };
  SC.step = 'result';
  SC.rec = scSave({ sub: L.n + ' · 保命技能', score, pass: score >= 60, sum, dims, wrong, rs: SC.res, a: A });
  rerender('scene');
}
function lifeResult() {
  const R = SC.res, L = LIFE[SC.sub];
  return `<div class="wrap tkwrap">${scHead('', L.n + ' · 点评')}
    ${scResultHead(R, 'life')}
    <div class="gtwo">
      <div class="card"><div class="ch"><b>步骤顺序</b><span class="note">你的顺序 vs 标准顺序</span></div><table class="tb"><tr><th>#</th><th>你的排序</th><th>标准</th></tr>${R.order.map((v, i) => `<tr class="${v === i ? '' : 'no'}"><td class="mono">${i + 1}</td><td>${h(L.steps[v])}</td><td>${v === i ? '<span class="tag ok">对位</span>' : '<span class="tag rl">应为第 ' + (v + 1) + ' 步</span>'}</td></tr>`).join('')}</table></div>
      <div class="card"><div class="ch"><b>要点与禁止事项</b></div>
        ${L.fill.map((f, i) => `<div class="hrow">${R.fillOk[i] ? '<span class="tag ok">答到</span>' : '<span class="tag rl">漏</span>'} ${h(f[0].replace('____', '「' + f[1] + '」'))}</div>`).join('')}
        <table class="tb" style="margin-top:8px"><tr><th>做法</th><th>性质</th><th>你的判断</th></tr>${R.bads.map(x => `<tr class="${x.bad !== x.picked ? 'no' : ''}"><td>${h(x.t)}</td><td>${x.bad ? '<span class="tag rl">禁止</span>' : '<span class="tag ok">正确做法</span>'}</td><td>${x.picked ? (x.bad ? '指出' : '<span class="wv">误指</span>') : (x.bad ? '<span class="wv">漏指</span>' : '—')}</td></tr>`).join('')}</table></div></div>
    ${scResultFoot('life:' + SC.sub + ':' + SC.mode)}</div>`;
}

/* ======================= 案例分析陪练 ======================= */
/* 预置脱敏案例（变电 / 配网 / 通用）：人物、单位全部虚构；推送案例（CASE_SEED）也可进入分析 */
const CASE_LIB = [
  { id: 'cl1', t: '10kV 配网线路带电作业触电（配网）', kind: '配网 · 触电', brief: '某供电局配网运维班在 10kV 线路带电更换避雷器时，作业人员未按要求对相邻带电体设置绝缘遮蔽，身体摆动触及带电导线，造成电弧灼伤。工作负责人在地面兼做材料整理，未全程监护；班前会风险交底只念了票面。',
    std: { c1: ['未对相邻带电体设置绝缘遮蔽，安全距离不足', '工作负责人兼做其他工作、未全程监护；班前会风险交底流于形式'], c2: ['带电作业未逐项检查绝缘遮蔽即开工', '工作负责人兼做作业，脱离监护'], c3: ['带电作业前逐项检查绝缘遮蔽，缺一项不开工', '工作负责人到位监护，不得兼做作业', '班前会要讲清本次作业的具体风险点'], c4: ['安规 9.2.1.1 带电作业应设置绝缘遮蔽', '安规 6.1 保证安全的技术措施'] },
    kw: { c1: [['绝缘遮蔽', '遮蔽'], ['安全距离', '距离不足'], ['监护', '兼做', '不到位'], ['交底', '班前会', '流于形式']], c2: [['遮蔽'], ['监护', '兼做']], c3: [['逐项检查', '检查遮蔽', '缺一项'], ['监护', '不得兼做', '到位'], ['班前会', '交底', '风险点']], c4: [['9.2.1.1', '9.2', '带电作业'], ['6.1', '技术措施', '安规']] } },
  { id: 'cl2', t: '变电站误入带电间隔险情（变电）', kind: '变电 · 误操作', brief: '某 110kV 变电站检修期间，一名作业人员未经许可离开工作地点去取工具，走错间隔靠近运行设备，被监护人及时制止，未造成人身伤害。事后检查发现检修间隔与相邻运行间隔之间的遮栏不完整，「止步，高压危险」标示牌缺一块。',
    std: { c1: ['作业人员擅自离开工作地点，未辨识带电间隔', '现场遮栏与标示牌不完整；监护人未及时发现人员离开'], c2: ['工作班成员未经工作负责人同意擅自离开工作地点', '安全措施不完备即开工'], c3: ['检修现场遮栏、标示牌齐全后才开工', '离开工作地点必须经工作负责人同意并由人陪同', '监护人全程清点人员'], c4: ['安规 6.1 停电、验电、接地、悬挂标示牌和装设遮栏', '安规 9.3.5 工作地点与带电部位的隔离'] },
    kw: { c1: [['擅自离开', '离开工作地点', '未经许可'], ['走错间隔', '辨识', '带电间隔'], ['遮栏', '标示牌', '不完整'], ['监护']], c2: [['擅自', '未经同意', '离开'], ['安全措施', '不完备', '遮栏']], c3: [['齐全', '完备', '才开工', '补齐'], ['陪同', '经同意', '工作负责人同意'], ['清点', '全程监护']], c4: [['6.1', '技术措施'], ['9.3.5', '9.3', '隔离', '安规']] } },
  { id: 'cl3', t: '台区低压配电箱检修触电（配网）', kind: '配网 · 低压触电', brief: '某供电所台区维护人员处理低压配电箱缺陷时，认为低压不危险，未停电、未验电直接作业，手部触及带电母排触电，经同事断电后送医。现场只有一人作业，未办理工作票。',
    std: { c1: ['未停电、未验电直接在带电低压设备上作业', '单人作业无监护；未办理工作票；侥幸心理，低压作业风险意识不足'], c2: ['无票作业', '低压带电作业不使用绝缘工具、无人监护'], c3: ['低压同样先停电、验电再作业', '任何检修作业必须办票、有人监护', '班组把低压作业风险纳入班前会'], c4: ['安规 6.1 保证安全的技术措施', '两票管理细则 第十条 必须填写工作票'] },
    kw: { c1: [['未停电', '没停电', '带电作业'], ['未验电', '没验电'], ['单人', '无监护', '一人'], ['无票', '未办票', '工作票'], ['侥幸', '意识', '低压不危险']], c2: [['无票', '工作票'], ['绝缘', '监护', '单人']], c3: [['停电', '验电'], ['办票', '工作票', '监护'], ['班前会', '风险', '低压']], c4: [['6.1', '技术措施'], ['第十条', '两票', '细则']] } },
  { id: 'cl4', t: '构架检修高处坠落（通用）', kind: '通用 · 高处坠落', brief: '某变电站构架防腐作业中，作业人员在 6 米高处移动位置时解开安全带挂钩未重新挂牢，脚下踩空坠落致重伤。现场未铺设安全网，作业前未检查安全带，工作负责人未发现违章。',
    std: { c1: ['高处移动时解开安全带且未重新挂牢', '未铺设安全网、作业前未检查安全带；工作负责人监护不力'], c2: ['高处作业安全带未全程系挂', '高处作业未设安全网等防坠落措施'], c3: ['高处作业安全带高挂低用、移动时先挂后解', '作业前检查安全带与安全网，缺一不开工', '工作负责人盯住高处作业全过程'], c4: ['安规 高处作业 应使用安全带', '应急处置卡 高处坠落 平托法搬运、不得随意搬动'] },
    kw: { c1: [['安全带', '未挂', '解开', '没挂'], ['安全网', '未铺设'], ['检查', '未检查'], ['监护', '负责人']], c2: [['安全带', '系挂'], ['安全网', '防坠']], c3: [['高挂低用', '先挂后解', '全程系挂'], ['检查', '缺一不'], ['监护', '盯住', '全过程']], c4: [['高处作业', '安规'], ['高处坠落', '平托', '处置卡']] } }
];
function caseAll() {
  const pushed = (typeof caseList === 'function' ? caseList() : []).map(c => ({ id: c.id, t: c.t, kind: c.kind, brief: c.brief, pushed: true, std: { c1: c.cause, c2: c.rules.map(x => '违反 ' + x), c3: c.lessons, c4: c.rules }, kw: { c1: c.cause.map(x => kwOf(x)), c2: c.rules.map(x => kwOf(x)), c3: c.lessons.map(x => kwOf(x)), c4: c.rules.map(x => kwOf(x)) } }));
  return CASE_LIB.concat(pushed);
}
function kwOf(s) { const m = s.replace(/^(直接原因|间接原因)[：:]/, '').match(/[一-龥]{2,4}/g) || []; const nums = s.match(/\d+(\.\d+)+/g) || []; return nums.concat(m.slice(0, 4)); }
function caseBegin() {
  const all = caseAll();
  const c = all.find(x => x.id === SC.sub) || all[Math.floor(Math.random() * CASE_LIB.length)];
  SC.sub = c.id; SC.case = c; SC.a = { c1: '', c2: '', c3: '', c4: '' }; scTimer();
}
const CASE_FIELDS = [['c1', '直接原因与间接原因', '直接原因是什么？背后的管理、监护、交底等间接原因是什么？'], ['c2', '违反的条款与做法', '案例中哪些做法违反了安规或制度？'], ['c3', '防范措施与教训', '要避免同类事故，现场和班组各要做到什么？'], ['c4', '条款对照', '对应到安规 / 制度的具体条款编号']];
function casePage() {
  if (SC.step === 'result') return caseResult();
  const c = SC.case;
  return `<div class="wrap tkwrap">${scHead('', c.kind + ' · ' + c.t)}
    <div class="card emhead ho"><div class="emh1"><b>${h(c.t)}</b><span class="tag">${h(c.kind)}</span><span class="note">${c.pushed ? '班组长推送' : '预置脱敏案例'}</span></div>
      <div class="emsit"><b>事故经过</b><span>${h(c.brief)}</span></div></div>
    <div class="card emq hg"><div class="ch"><b>案例分析</b><span class="note">四个方面逐项作答（可口述）；提交后与标准分析逐项比对，意思对即得分</span></div>
      ${CASE_FIELDS.map(([k, n, ph]) => `<div class="casefld"><label><b>${n}</b><span class="tk3">${ph}</span></label><textarea data-casein="${k}" rows="${k === 'c4' ? 2 : 3}" placeholder="${ph}">${h(SC.a[k] || '')}</textarea><button class="mic" data-casemic="${k}" title="语音输入"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v4"/></svg></button></div>`).join('')}
      <div class="embar"><span class="tk3">${SC.mode === 'teach' ? '训练模式：可要一条提示' : '考核模式：计时，提交后一次性点评'}</span><span class="r">${SC.mode === 'teach' ? '<button class="btn s g" data-casehint="1">要一条提示</button>' : ''}<button class="btn pri" data-casesubmit="1">提交点评</button></span></div>
    </div></div>`;
}
function caseGroupHit(groups, text) { const t = norm(text); return groups.map(g => g.some(k => t.includes(norm(k)))); }
function caseSubmit() {
  const c = SC.case, A = SC.a;
  const filled = Object.keys(A).filter(k => (A[k] || '').trim().length >= 4).length;
  if (filled < 2) { toast('至少写两个方面再提交', 'bad'); return; }
  const dims = {}, det = {};
  ['c1', 'c2', 'c3', 'c4'].forEach(k => { const hits = caseGroupHit(c.kw[k], A[k] || ''); det[k] = hits; dims[k] = clamp(hits.filter(Boolean).length / hits.length * 100); });
  const score = Math.round(dims.c1 * .35 + dims.c2 * .25 + dims.c3 * .25 + dims.c4 * .15);
  const sum = CASE_FIELDS.filter(([k]) => dims[k] < 70).map(([k, n]) => n + ' ' + dims[k]);
  const wrong = []; ['c1', 'c2', 'c3', 'c4'].forEach(k => det[k].forEach((ok, i) => { if (!ok) wrong.push({ t: CASE_FIELDS.find(f => f[0] === k)[1] + '：没答到「' + c.std[k][Math.min(i, c.std[k].length - 1)] + '」', cite: k === 'c4' ? '条款对照' : c.std.c4.join('；') }); }));
  const advice = (dims.c1 >= 70 ? '原因分析到位' : '原因分析只看到了直接原因，间接原因（监护、交底、管理）没展开') + '；' + (dims.c4 >= 70 ? '条款对得上。' : '没有对应到具体条款编号，分析要落到安规 / 制度条文。') + (wrong.length ? ' 标准分析里没答到的要点见下表。' : '');
  SC.res = { score, pass: score >= 60, dims, sum, wrong, advice, det };
  SC.step = 'result';
  SC.rec = scSave({ sub: c.kind.split(' · ')[0] + ' · ' + c.t, score, pass: score >= 60, sum, dims, wrong, rs: SC.res, a: A, caseId: c.id });
  if (c.pushed && typeof caseDone === 'function') caseDone(c.id, score);
  rerender('scene');
}
function caseHint() {
  const c = SC.case, A = SC.a;
  const k = ['c1', 'c2', 'c3', 'c4'].find(x => caseGroupHit(c.kw[x], A[x] || '').some(v => !v)) || 'c1';
  const i = caseGroupHit(c.kw[k], A[k] || '').findIndex(v => !v);
  const g = c.kw[k][Math.max(0, i)];
  toast(`提示 · ${CASE_FIELDS.find(f => f[0] === k)[1]}：想想“${g[0]}”`, '');
}
function caseResult() {
  const R = SC.res, c = SC.case;
  return `<div class="wrap tkwrap">${scHead('', c.kind + ' · ' + c.t + ' · 点评')}
    ${scResultHead(R, 'case')}
    <div class="card"><div class="ch"><b>你的分析 vs 标准分析</b><span class="note">逐项比对 · 意思对即得分</span></div>
      <table class="tb"><tr><th style="width:120px">方面</th><th>你的作答</th><th>标准分析</th></tr>${CASE_FIELDS.map(([k, n]) => `<tr><td><b>${n}</b><div class="mono ${R.dims[k] >= 70 ? 'gv' : 'wv'}">${R.dims[k]}</div></td><td class="note">${h(SC.a[k] || '（未作答）')}</td><td>${c.std[k].map((s, i) => `<div>${R.det[k][Math.min(i, R.det[k].length - 1)] ? '<span class="tag ok">答到</span>' : '<span class="tag rl">漏</span>'} ${h(s)}</div>`).join('')}</td></tr>`).join('')}</table></div>
    ${scResultFoot('case:' + SC.sub + ':' + SC.mode)}</div>`;
}

/* ======================= 制度学习陪练：文件 → 课件 → 数字人讲课 → 测验 → 考试分析 ======================= */
function instBegin() {
  const d = docById(SC.sub) || docAll()[0];
  SC.sub = d.id; SC.doc = d; SC.cw = cwGen(d); SC.step = 'cw'; SC.cwi = 0; cwMark(SC.cw.id, 0); SC.lecDone = false; scTimer();
}
function instPage() {
  if (SC.step === 'result') return instResult();
  const d = SC.doc, cw = SC.cw, docs = docAll();
  const seen = cwSeenRatio(cw);
  const steps = ['看课件', '数字人讲课', '测验', '考试分析'];
  const cur = SC.step === 'cw' ? (SC.lecDone ? 1 : 0) : SC.step === 'exam' ? 2 : 3;
  return `<div class="wrap tkwrap">${scHead('', d.n + ' · ' + cw.nSec + ' 节 · 关键条款 ' + cw.nKey + ' 条')}
    <div class="emsteps">${steps.map((s, i) => `<span class="${i === cur ? 'on' : i < cur ? 'done' : ''}"><i>${i + 1}</i>${s}</span>`).join('')}</div>
    ${SC.step === 'cw' ? `<div class="card hg"><div class="ch"><b>课件</b><span class="note">由「${h(d.n)}」自动生成 · 已看 ${seen}%</span><span class="r"><select id="inst_doc" data-instdoc="1">${docs.map(x => `<option value="${x.id}" ${x.id === d.id ? 'selected' : ''}>${h(x.n)}</option>`).join('')}</select></span></div>
      <div class="cwwrap"><div class="cwnav">${cw.slides.map((s, i) => `<div class="cwth ${i === SC.cwi ? 'on' : ''} ${cwSeen(cw.id)[i] ? 'seen' : ''}" data-instgo="${i}"><i>${i + 1}</i><span>${h(s.t)}</span></div>`).join('')}</div><div class="cwmain">${slideHTML(cw, SC.cwi)}</div></div>
      <div class="embar"><span class="tk3">学习完成度按看过的页数计入「学习完成」；测验从课件自动出题，关键条款必考</span><span class="r"><button class="btn s" data-instgo="${SC.cwi - 1}">上一页</button><button class="btn s" data-instgo="${SC.cwi + 1}">下一页</button><button class="btn s g" data-instlec="1">数字人讲课</button><button class="btn pri" data-instexam="1">开始测验</button></span></div></div>`
      : `<div class="card hg"><div class="ch"><b>测验</b><span class="note">${SC.qs.length} 题 · 从课件自动出题</span></div><div id="exbox"></div></div>`}
  </div>`;
}
function instExam() {
  SC.qs = qGen(SC.doc, SC.mode === 'exam' ? 8 : 6, Date.now());
  SC.step = 'exam'; rerender('scene');
  examStart(SC.qs, { title: SC.doc.n, mode: SC.mode, mount: 'exbox', src: 'inst', base: 40, onDone: instDone });
}
function instDone(res) {
  const i1 = res.score, i2 = res.keyRate == null ? res.score : res.keyRate, i3 = cwSeenRatio(SC.cw), i4 = res.speed;
  const dims = { i1, i2, i3, i4 }, score = Math.round(i1 * .6 + i2 * .2 + i3 * .1 + i4 * .1);
  const sum = []; if (res.wrong.length) sum.push('答错 ' + res.wrong.length + ' 题'); if (i2 < 100) sum.push('关键条款题失分'); if (i3 < 100) sum.push('课件看了 ' + i3 + '%');
  const wrong = res.wrong.map(x => ({ t: x.q.stem, cite: x.q.cite + '：' + x.q.orig }));
  SC.res = { score, pass: score >= 60, dims, sum, wrong, advice: examAdvice(res), exam: res };
  SC.step = 'result';
  SC.rec = scSave({ sub: SC.doc.n, score, pass: score >= 60, sum, dims, wrong, rs: Object.assign({}, SC.res, { exam: null, examLite: { score: res.score, right: res.right, n: res.n, keyRate: res.keyRate, sec: res.sec, secRows: res.secRows, team: res.team, wrongTbl: res.wrong.map(x => ({ stem: x.q.stem, a: x.a, ans: x.q.ans, type: x.q.type, opts: x.q.opts, cite: x.q.cite, orig: x.q.orig, why: x.q.why })) } }) });
  if (typeof hoursAdd === 'function') hoursAdd(SC.doc.n + ' · 制度学习', 0.5);
  rerender('scene');
}
function instResult() {
  const R = SC.res, E = R.exam, L = R.examLite || (SC.rec && SC.rec.rs && SC.rec.rs.examLite);
  return `<div class="wrap tkwrap">${scHead('', SC.doc ? SC.doc.n + ' · 考试分析' : '考试分析')}
    ${scResultHead(R, 'inst')}
    <div class="card"><div class="ch"><b>自动考试分析</b><em class="ai">AI</em><span class="note">个人分析 + 班组对比（同一套题）</span></div>${E ? examResultHTML(E, { noHead: true }) : L ? instLiteHTML(L) : ''}</div>
    ${scResultFoot('inst:' + SC.sub + ':' + SC.mode)}</div>`;
}
function instLiteHTML(L) {
  const T = L.team || {};
  return `<div class="exres"><div class="hrow">答对 ${L.right} / ${L.n}${L.keyRate != null ? ' · 关键条款题 ' + L.keyRate + '%' : ''} · 用时 ${fmtSec(L.sec || 0)}${T.avg != null ? ' · 班组平均 ' + T.avg + ' · 及格率 ' + T.passRate + '% · 本人第 ' + T.rank + ' / ' + T.total : ''}</div>
    ${(L.secRows || []).map(s => `<div class="exbar"><span>${h(s.t)}</span><div class="btrk"><div class="bfill ${s.pct < 60 ? 'w' : ''}" style="width:${s.pct}%"></div></div><b class="mono">${s.pct}%</b></div>`).join('')}
    ${(L.wrongTbl || []).length ? `<table class="htbl" style="margin-top:8px"><tr><th>错题</th><th>正确答案</th><th>依据</th></tr>${L.wrongTbl.map(w => `<tr><td>${h(w.stem)}</td><td class="gv">${h(w.type === 'choice' ? 'ABCD'[w.ans] + '，' + w.opts[w.ans] : w.type === 'judge' ? (w.ans ? '正确' : '错误') : w.ans)}</td><td class="tk3">${h(w.cite)}<div>${h(w.orig)}</div></td></tr>`).join('')}</table>` : ''}</div>`;
}

/* ======================= 工作票陪练：第一种工作票 · 安全措施填写（本平台按安规拟定，待业务确认） ======================= */
const WT = {
  task: '110kV考核站 #3 主变（含变高 1103 开关、变低 503 开关间隔）检修预试', place: '110kV考核站 #3 主变本体及两侧开关间隔', mode: '#3 主变已由运行转检修，10kV 3M 负荷由 #2 主变经 532 开关代供；110kV 2M 母线、10kV 3M 母线运行',
  secs: [
    { k: 's1', n: '应拉开的断路器（开关）和隔离开关（刀闸）', ok: ['#3主变变高 1103 开关', '#3主变变高 2M 侧 11032 刀闸', '#3主变变高主变侧 11034 刀闸', '#3主变变低 503 开关', '#3主变变低 503 开关小车（拉至试验位置）'], dis: ['10kV 2BM、3M 分段 532 开关', '#2主变变高 1102 开关', '#3主变变高中性点 113000 地刀'] },
    { k: 's2', n: '应装设的接地线、应合上的接地刀闸', ok: ['合上 #3主变变高 110340 地刀（1103 开关主变侧）', '合上 #3主变变低 503 开关主变侧地刀', '#3主变中性点 113000 地刀合上'], dis: ['合上 110kV 2M 母线接地刀闸', '合上 #2主变变高地刀'], must: true },
    { k: 's3', n: '应设遮栏（围栏）、应挂标示牌', ok: ['1103 开关、11032、11034 刀闸操作把手挂「禁止合闸，有人工作」', '503 开关小车及操作把手挂「禁止合闸，有人工作」', '#3 主变检修区域装设围栏，出入口挂「止步，高压危险」', '工作地点挂「在此工作」'], dis: ['#2 主变周围装设围栏并挂「止步，高压危险」', '532 开关操作把手挂「禁止合闸，有人工作」'] },
    { k: 's4', n: '工作地点保留带电部分或注意事项', ok: ['110kV 2M 母线及 11032 刀闸母线侧带电', '10kV 3M 母线由 #2 主变代供，带电', '#3主变变低 503 开关柜母线侧带电'], dis: ['10kV 3M 母线已停电', '#2 主变停电'] }
  ]
};
function wtBegin() { SC.a = {}; SC.pool = {}; const r = rng(Date.now() % 7777 + 11); WT.secs.forEach(s => { SC.pool[s.k] = shuffled(s.ok.map(t => ({ t, ok: true })).concat(s.dis.map(t => ({ t, ok: false }))), r); SC.a[s.k] = {}; }); scTimer(); }
function wtPage() {
  if (SC.step === 'result') return wtResult();
  return `<div class="wrap tkwrap">${scHead('', '第一种工作票 · 安全措施填写')}
    <div class="card emhead ho"><div class="emh1"><b>第一种工作票</b><span class="tag">安全措施</span><span class="note">票面其余栏目由系统带出，本次只填安全措施</span></div>
      <table class="tb s emcardt"><tr><th>工作任务</th><td>${h(WT.task)}</td></tr><tr><th>工作地点</th><td>${h(WT.place)}</td></tr><tr><th>运行方式</th><td>${h(WT.mode)}</td></tr><tr><th>工作负责人</th><td>${h(HOME_USER.name)}（本次由你填写安全措施）</td></tr></table></div>
    <div class="card emq hg"><div class="ch"><b>安全措施</b><span class="note">每栏勾选应填入的措施（含干扰项）；提交后逐项比对，缺少停电 / 接地措施按危险判定</span></div>
      ${WT.secs.map(s => `<div class="wtsec"><div class="qzq">${h(s.n)}</div><div class="qzopts">${SC.pool[s.k].map((o, i) => `<div class="qzo ${SC.a[s.k][i] ? 'on' : ''}" data-wtpick="${s.k}:${i}"><b>${SC.a[s.k][i] ? '✓' : ''}</b><span>${h(o.t)}</span></div>`).join('')}</div></div>`).join('')}
      <div class="embar"><span class="tk3">${SC.mode === 'teach' ? '训练模式：可要一条提示' : '考核模式：计时，提交后一次性点评'}</span><span class="r">${SC.mode === 'teach' ? '<button class="btn s g" data-wthint="1">要一条提示</button>' : ''}<button class="btn pri" data-wtsubmit="1">提交判定</button></span></div>
    </div></div>`;
}
function wtSubmit() {
  const picked = WT.secs.reduce((a, s) => a + Object.keys(SC.a[s.k]).filter(i => SC.a[s.k][i]).length, 0);
  if (picked < 4) { toast('先把各栏安全措施勾上', 'bad'); return; }
  let miss = 0, extra = 0, dangerMiss = 0; const rows = [];
  WT.secs.forEach(s => { SC.pool[s.k].forEach((o, i) => { const p = !!SC.a[s.k][i]; if (o.ok && !p) { miss++; if (s.must || s.k === 's1') dangerMiss++; } if (!o.ok && p) extra++; rows.push({ sec: s.n, t: o.t, ok: o.ok, p }); }); });
  const t2 = clamp(100 - miss * 10), t4 = dangerMiss ? (dangerMiss > 1 ? 10 : 30) : 100, t3 = clamp(100 - extra * 12);
  const fatal = dangerMiss ? ['停电 / 接地措施不完整 ' + dangerMiss + ' 项'] : [];
  const score = fatal.length ? Math.min(59, Math.round(t2 * .5 + t3 * .2 + t4 * .3)) : Math.round(t2 * .5 + t3 * .2 + t4 * .3);
  const dims = { t1: null, t2, t3, t4, t5: null };
  const sum = []; if (miss) sum.push('漏项 ' + miss); if (extra) sum.push('多填 ' + extra); if (fatal.length) sum.push('危险：' + fatal[0]);
  const wrong = rows.filter(r => r.ok !== r.p).map(r => ({ t: (r.ok ? '漏填：' : '多填：') + r.t, cite: r.sec + (r.ok ? '' : ' · 与本次停电范围无关或会扩大停电') }));
  const advice = fatal.length ? '安全措施缺了停电或接地项，这张票不能许可开工：' + rows.filter(r => r.ok && !r.p && /开关|刀闸|地刀|接地/.test(r.t)).map(r => r.t).slice(0, 2).join('、') + '。' : (miss || extra ? '停电接地齐全，' + (miss ? '遮栏标示牌或保留带电部分漏 ' + miss + ' 项，' : '') + (extra ? '多填 ' + extra + ' 项会扩大停电范围或误导作业人员。' : '') : '安全措施填写完整，和标准票一致。');
  SC.res = { score, pass: score >= 60 && !fatal.length, dims, sum, wrong, advice, rows, fatal };
  SC.step = 'result';
  SC.rec = scSave({ sub: '工作票 · #3主变检修 · 安全措施', score, pass: SC.res.pass, sum, dims, wrong, fatal, rs: SC.res, a: SC.a });
  rerender('scene');
}
function wtHint() { const s = WT.secs.find(x => SC.pool[x.k].some((o, i) => o.ok && !SC.a[x.k][i])); if (!s) { toast('各栏应填项都已勾上', 'ok'); return; } const o = SC.pool[s.k].find((o, i) => o.ok && !SC.a[s.k][i]); toast(`提示 · ${s.n}：还缺「${o.t.slice(0, 14)}…」`, ''); }
function wtResult() {
  const R = SC.res;
  return `<div class="wrap tkwrap">${scHead('', '第一种工作票 · 安全措施判定')}
    ${scResultHead(R, 'tk')}
    <div class="card"><div class="ch"><b>逐项比对</b><span class="note">漏填的停电 / 接地措施按危险判定 · 标准措施由本平台按安规拟定</span></div>
      <table class="tb"><tr><th>栏目</th><th>措施</th><th>标准</th><th>你的填写</th></tr>${R.rows.map(r => `<tr class="${r.ok !== r.p ? 'no' : ''}"><td class="note">${h(r.sec)}</td><td>${h(r.t)}</td><td>${r.ok ? '<span class="tag ok">应填</span>' : '<span class="tag">干扰项</span>'}</td><td>${r.p ? (r.ok ? '已填' : '<span class="wv">多填</span>') : (r.ok ? '<span class="wv">漏填</span>' : '—')}</td></tr>`).join('')}</table></div>
    ${scResultFoot('wt::' + SC.mode)}</div>`;
}

/* ---------- 场景页事件 ---------- */
function sceneClick(e) {
  const q = s => e.target.closest(s); let n;
  /* 安规 */
  if (n = q('[data-ruleopt]')) { ruleAnswer(+n.dataset.ruleopt); return true; }
  if (n = q('[data-rulejudge]')) { ruleAnswer(n.dataset.rulejudge === '1'); return true; }
  if (n = q('[data-rulesay]')) { const i = $('#rule_in'); const v = i ? i.value.trim() : ''; if (!v) { toast('先把空缺的词写上', 'bad'); return true; } ruleAnswer(v); return true; }
  if (n = q('#rule_mic')) { const qq = SC.qs[SC.i]; micStart(n, $('#rule_in'), qq ? String(qq.ans) : ''); return true; }
  if (n = q('[data-rulecite]')) { const qq = SC.qs[SC.i]; if (qq) { SC.cites[qq.id] = n.dataset.rulecite; rerender('scene'); } return true; }
  if (n = q('[data-rulego]')) { SC.i = Math.max(0, Math.min(SC.qs.length - 1, +n.dataset.rulego)); rerender('scene'); return true; }
  if (n = q('[data-rulesubmit]')) { ruleSubmit(); return true; }
  /* 保命 */
  if (n = q('[data-lifepick]')) { SC.a.order.push(+n.dataset.lifepick); rerender('scene'); return true; }
  if (n = q('[data-lifedrop]')) { SC.a.order = SC.a.order.filter(x => x !== +n.dataset.lifedrop); rerender('scene'); return true; }
  if (n = q('[data-lifeact]')) { const i = n.dataset.lifeact; SC.a.acts[i] = !SC.a.acts[i]; rerender('scene'); return true; }
  if (n = q('[data-lifepart]')) { $$('[data-lifefill]').forEach(x => { SC.a.fill[+x.dataset.lifefill] = x.value; }); SC.part = +n.dataset.lifepart; rerender('scene'); return true; }
  if (n = q('[data-lifesubmit]')) { $$('[data-lifefill]').forEach(x => { SC.a.fill[+x.dataset.lifefill] = x.value; }); lifeSubmit(); return true; }
  /* 案例 */
  if (n = q('[data-casemic]')) { const k = n.dataset.casemic; const ta = $(`[data-casein="${k}"]`); micStart(n, ta, (SC.case.std[k] || []).join('；')); return true; }
  if (n = q('[data-casehint]')) { $$('[data-casein]').forEach(x => { SC.a[x.dataset.casein] = x.value; }); caseHint(); return true; }
  if (n = q('[data-casesubmit]')) { $$('[data-casein]').forEach(x => { SC.a[x.dataset.casein] = x.value; }); caseSubmit(); return true; }
  /* 制度 */
  if (n = q('[data-instgo]')) { SC.cwi = Math.max(0, Math.min(SC.cw.slides.length - 1, +n.dataset.instgo)); cwMark(SC.cw.id, SC.cwi); rerender('scene'); return true; }
  if (n = q('[data-instlec]')) { lecOpen(SC.cw, { from: SC.cwi, onDone: () => { SC.lecDone = true; }, onExam: () => { rerender('scene'); instExam(); } }); return true; }
  if (n = q('[data-instexam]')) { instExam(); return true; }
  /* 工作票 */
  if (n = q('[data-wtpick]')) { const [k, i] = n.dataset.wtpick.split(':'); SC.a[k][i] = !SC.a[k][i]; rerender('scene'); return true; }
  if (n = q('[data-wthint]')) { wtHint(); return true; }
  if (n = q('[data-wtsubmit]')) { wtSubmit(); return true; }
  return false;
}
function sceneInput(e) {
  let n;
  if (n = e.target.closest('[data-casein]')) { SC.a[n.dataset.casein] = n.value; return true; }
  if (n = e.target.closest('[data-lifefill]')) { SC.a.fill[+n.dataset.lifefill] = n.value; return true; }
  return false;
}
function sceneChange(e) {
  const n = e.target.closest('[data-instdoc]'); if (!n) return false;
  SC.sub = n.value; instBegin(); rerender('scene'); return true;
}
