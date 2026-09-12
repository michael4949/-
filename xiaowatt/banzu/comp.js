/* ===== 通用组件：派工人员条带、照片识别、文稿流式、审票、值班表 ===== */

/* ---------- 派工：四条规则逐人校验（证书 / 核心技能 / 工时 / 冲突）→ 推荐与排除理由 → 人员条带过滤排序 → 点人 → 她动手填单 ---------- */
const DISPATCH = {
  job: null, host: null, picked: null,
  skillOf(job) { return job && job.skill ? SKILL9.find(s => s.k === job.skill) : null; },
  /* 逐人判定：返回 { p, role: lead|crew|follow|out, ok, why:[...] } */
  judge(p, job) {
    job = job || this.job || DB.job(MAINLINE); const why = []; let out = false, follow = false;
    if (p.post === '班长') return { p, role: 'out', ok: false, why: ['班长不列入派工'] };
    if (p.status === '休假') { out = true; why.push('休假'); }
    const need = (job.need || []).filter(c => c !== '工作负责人资格');
    need.forEach(c => { if (!p.cert.includes(c)) { out = true; why.push('无' + c.replace('作业证', '证').replace('资格', '资格')); } else why.push('持' + c.replace('作业证', '证')); });
    const sk = this.skillOf(job); if (sk) { const q = skill9Of(p).q[SKILL9.indexOf(sk)]; if (q === 'A') why.push('「' + sk.n + '」可自主实施，本年 ' + skill9Of(p).n[SKILL9.indexOf(sk)] + ' 次'); else if (q === 'B') { follow = true; why.push('「' + sk.n + '」需带教，只能随队'); } else { out = true; why.push('不具备「' + sk.n + '」资格'); } }
    if (/学员/.test(p.post)) { follow = true; why.push('学员随队学习'); }
    if (p.week >= WEEK_LIMIT) why.push('本周已 ' + p.week + 'h，超约定 ' + WEEK_LIMIT + 'h'); else why.push('本周 ' + p.week + 'h');
    const day = DB.whenOf(job).slice(0, 10); const clash = DB.jobs().find(j => j.id !== job.id && /已派|票已审|进行中|待开工/.test(j.st) && DB.whenOf(j).slice(0, 10) === day && DB.crewOf(j).includes(p.n)); if (clash) { out = true; why.push('当天已派「' + clash.t.slice(0, 12) + '」'); }
    const nodeA = NODES.filter(n => n.a === p.n && /日日清|日管控/.test(n.cyc)); if (nodeA.length && !out) why.push('关键节点 A 责任 ' + nodeA.length + ' 项，当天由 B 顶上');
    if (out) return { p, role: 'out', ok: false, why };
    if (follow) return { p, role: 'follow', ok: true, why };
    return { p, role: 'crew', ok: true, why, over: p.week >= WEEK_LIMIT, leadOk: p.cert.includes('工作负责人资格') };
  },
  explain(job) { job = job || this.job || DB.job(MAINLINE); const all = PEOPLE.map(p => this.judge(p, job)); const okc = all.filter(x => x.role === 'crew'); const leads = okc.filter(x => x.leadOk && !x.over).sort((a, b) => a.p.week - b.p.week); const lead = leads[0] || okc.filter(x => x.leadOk).sort((a, b) => a.p.week - b.p.week)[0] || null; if (lead) lead.role = 'lead'; const crew = okc.filter(x => x !== lead && !x.over).sort((a, b) => a.p.week - b.p.week); const overs = okc.filter(x => x !== lead && x.over); overs.forEach(x => { x.role = 'over'; }); const follows = all.filter(x => x.role === 'follow'); return { all, lead, crew, overs, follows, outs: all.filter(x => x.role === 'out') }; },
  eligible(p, job) { const r = this.judge(p, job); return r.ok && r.role !== 'follow'; },
  reason(p, job) { const r = this.judge(p, job); return r.role === 'out' ? r.why.filter(w => /无|不具备|休假|已派|班长/.test(w))[0] || '不能派' : r.role === 'follow' ? '随队' : ''; },
  defaults(job) { const e = this.explain(job); const crew = e.crew.map(x => x.p); const learn = e.follows.map(x => x.p); return { lead: e.lead ? e.lead.p : null, crew: crew.slice(0, 2), learn: learn[0] || null, follows: learn, explain: e }; },
  /* 推荐 / 排除表 */
  tableHTML(job) { const e = this.explain(job); const row = (x, tag, cls) => '<tr class="' + cls + '"><td><b>' + h(x.p.n) + '</b><br><span class="note">' + h(x.p.post.replace('副班长 · ', '')) + '</span></td><td><span class="tag ' + (cls === 'in' ? 'ok' : cls === 'fo' ? 'v' : cls === 'ov' ? 'w' : 'bad') + '">' + tag + '</span></td><td class="note" style="color:var(--ink)">' + h(x.why.join('；')) + '</td></tr>';
    return '<div class="tbl"><table class="t xpl"><tr><th>人员</th><th>结论</th><th>四条规则逐条对照（证书 · 核心技能 · 工时 · 冲突）</th></tr>' + (e.lead ? row(e.lead, '推荐 · 工作负责人', 'in') : '') + e.crew.map(x => row(x, '推荐 · 班员', 'in')).join('') + e.follows.map(x => row(x, '随队', 'fo')).join('') + e.overs.map(x => row(x, '排除 · 超工时', 'ov')).join('') + e.outs.map(x => row(x, '排除', 'ex')).join('') + '</table></div>'; },
  render(host) { const row = $('.row', host); row.innerHTML = ''; PEOPLE.forEach((p, i) => { const d = document.createElement('div'); d.className = 'chip'; d.dataset.i = i; d.dataset.act = 'dispatch-pick'; d.dataset.who = p.n; d.innerHTML = '<b>' + h(p.n) + '</b><div class="hb"><i></i></div><span class="hr">' + p.week + ' h · 本周</span><span class="why"></span>'; row.appendChild(d); XW.at(80 + i * 50, () => { d.querySelector('.hb i').style.width = Math.min(100, p.week / 26 * 100) + '%'; }); }); },
  /* 展开条带并"边想边筛"：证书 → 核心技能 → 工时 → 冲突 */
  open(host, job, done) {
    this.host = host; this.job = job || DB.job(MAINLINE); this.picked = null; host.classList.add('on'); this.render(host);
    const tk = $('.tk', host); tk.classList.add('on'); XW.state('think');
    const e = this.explain(this.job); const sk = this.skillOf(this.job); const need = (this.job.need || []).filter(c => c !== '工作负责人资格');
    const memo = XW.mem.get('备选-' + DB.typeOf(this.job));
    const txt = '这项' + (need.length ? '要' + need.map(c => c.replace('作业证', '证')).join('和') + '，有证的是' + PEOPLE.filter(p => need.every(c => p.cert.includes(c)) && p.post !== '班长').map(p => p.n).join('、') + '。' : '不要特殊证书。') + (sk ? '核心技能「' + sk.n + '」能自主实施的是' + PEOPLE.filter(p => skill9Of(p).q[SKILL9.indexOf(sk)] === 'A' && p.post !== '班长').map(p => p.n).join('、') + '，' + (e.follows.filter(x => !/学员/.test(x.p.post)).map(x => x.p.n).join('、') || '没有人') + '还在带教，只能随队。' : '') + '工作负责人要有负责人资格' + (e.lead ? '，' + e.lead.p.n + '有，这周 ' + e.lead.p.week + ' 小时。' : '。') + (e.overs.length ? e.overs.map(x => x.p.n + '这周已经 ' + x.p.week + ' 小时，超过你定的每周 ' + WEEK_LIMIT + ' 小时').join('；') + '，我没排。' : '') + (e.crew.length ? '剩下的按这周工时从少到多排……' + e.crew.map(x => x.p.n + ' ' + x.p.week).join('、') + '。' : '') + (memo ? '上次这类活你给了' + memo + '，这次我还是先想到他。' : '') + '每个人为什么推荐、为什么排除，表里都写了。你想换谁，点一下就行。';
    XW.type($('span:last-child', tk), txt, 30);
    XW.at(2600, () => $$('.chip', host).forEach(c => { const r = this.judge(PEOPLE[c.dataset.i], this.job); if (r.role === 'out') { c.classList.add('dim'); c.querySelector('.why').textContent = this.reason(PEOPLE[c.dataset.i], this.job); } if (r.role === 'follow') { c.classList.add('fo'); c.querySelector('.why').textContent = '随队'; } }));
    XW.at(5400, () => $$('.chip', host).forEach(c => { const p = PEOPLE[c.dataset.i]; if (e.lead && p === e.lead.p) { c.classList.add('lead'); c.querySelector('.why').textContent = '负责人'; } if (e.overs.some(x => x.p === p)) { c.classList.add('bad'); c.querySelector('.why').textContent = p.week + 'h 超约定'; } }));
    XW.at(8600, () => flip($('.row', host), () => $$('.chip', host).forEach(c => { const p = PEOPLE[c.dataset.i]; const r = this.judge(p, this.job); let o = 100 + p.week; if (e.lead && p === e.lead.p) o = 0; if (r.role === 'follow') o = 300 + p.week; if (r.role === 'out') o = 500 + p.week; if (e.overs.some(x => x.p === p)) o = 400; c.style.order = o; })));
    XW.at(11800, () => { XW.state(''); const d = $('#xpl'); if (d) { d.innerHTML = this.tableHTML(this.job); d.classList.add('in'); } XW.answer('人都排在卡片上了，推荐和排除的理由在表里逐条写着，点谁我就说说他。', null, { confirm: false }); done && done(this.defaults(this.job)); });
    return this.defaults(this.job);
  },
  pick(name) {
    const p = P[name]; if (!p || !this.host) return; $$('.chip', this.host).forEach(c => c.classList.toggle('pick', c.dataset.who === name)); this.picked = p;
    const job = this.job, def = this.defaults(job); const r = this.judge(p, job); const cur = def.crew[def.crew.length - 1];
    if (r.role === 'out') { XW.answer(p.n + '这次不能派：' + r.why.filter(w => /无|不具备|休假|已派|班长/.test(w)).join('，') + '。', null, { confirm: false }); return; }
    if (r.role === 'follow') { XW.answer(p.n + (/学员/.test(p.post) ? '还是学员，' : '「' + this.skillOf(job).n + '」还在带教，') + '只能随队，不能算工作班成员。我已经把他排在随队里了。', null, { confirm: false }); return; }
    if (def.lead && p === def.lead.p) { XW.answer(p.n + '是这次的工作负责人：有负责人资格，' + r.why.filter(w => /可自主|本周/.test(w)).join('，') + '。', null, { confirm: false }); return; }
    if (r.over) {
      XW.think('班长点了' + p.n + '。证书和核心技能都够。这周工时……' + DB.hours().filter(x => x.who === p.n).map(x => x.d + ' ' + x.h).join('、') + '，已经 ' + p.week + ' 小时，再上 ' + (job.h || 6) + ' 小时就超过班组约定。那我提醒一句超时，其他照办。', () => {
        XW.answer('可以换成' + p.n + '，证书和核心技能都够。只是提醒你：他这周已经 ' + p.week + ' 小时，再上 ' + (job.h || 6) + ' 小时会超过班组约定。要按你的安排执行吗？', '可以换成' + p.n + '，证书和核心技能都够。只是提醒你：<b>他这周已经 <u class="num" data-act="hours" data-who="' + p.n + '">' + p.week + ' 小时</u></b>，再上 ' + (job.h || 6) + ' 小时会超过班组约定。要按你的安排执行吗？<div class="bt"><button data-act="dispatch-go" data-who="' + p.n + '">仍然换</button><button class="g" data-act="dispatch-keep">保留' + h(cur ? cur.n : '原人选') + '</button></div>');
      }); return;
    }
    if (def.crew.some(x => x === p)) { XW.answer(p.n + '已经在推荐里：' + r.why.join('，') + '。', null, { confirm: false }); return; }
    XW.answer(p.n + '：' + r.why.join('，') + '，当天没冲突。把' + (cur ? cur.n : '原人选') + '换成' + p.n + '？', h(p.n) + '：' + h(r.why.join('，')) + '，当天没冲突。把' + h(cur ? cur.n : '原人选') + '换成' + h(p.n) + '？<div class="bt"><button data-act="dispatch-go" data-who="' + p.n + '">就这样</button><button class="g" data-act="dispatch-keep">保留' + h(cur ? cur.n : '原人选') + '</button></div>');
  },
  /* 她动手填派工单。formHost：放表单的元素；after(rec) 回调 */
  go(who, formHost, after) {
    const job = this.job || DB.job(MAINLINE); const def = this.defaults(job); const w = who ? P[who] : null; const tkNo = job.ticketNo || DB.nextTicketNo(); const test = /试验|验收/.test(job.t), cab = /柜|站|终端|交换机|蓄电池/.test(job.t); const meas = test ? '开关分闸挂标示牌 → 两端验电放电接地 → 围栏与安全距离 → 试验完毕放电拆线' : cab ? '一次设备保持运行 → 二次室验电 → 围栏与标示牌 → 绝缘工具与校验仪表' : '核对设备名称编号 → 围栏与标示牌 → 照片回传';
    let crew = def.crew.slice(); if (w) { if (!crew.includes(w)) { if (crew.length >= 2) crew[crew.length - 1] = w; else crew.push(w); } } crew = crew.filter(Boolean); const follows = def.follows.map(p => p.n);
    XW.answer('好，我来办。', null, { confirm: false });
    XW.at(900, () => { XW.state('work'); formHost.scrollIntoView({ block: 'nearest' }); const hh = $('.h b', formHost.closest('.card') || formHost); if (hh) hh.textContent = '派工单 · ' + job.t;
      formHost.innerHTML = '<div class="form"><label>作业日期</label><div class="f" id="f1"></div><label>工作票</label><div class="f" id="f2"></div><label>工作负责人</label><div class="f" id="f3"></div><label>班员</label><div class="f" id="f4"></div><label>随队</label><div class="f" id="f5"></div><label>安措要点</label><div class="f" id="f6"></div><div class="btnrow bt"><button id="fsave" data-act="disp-save">保存并通知</button><button class="g" data-act="no" data-t="再改改">再改改</button></div></div>'; });
    XW.at(1500, () => XW.cursorTo('#f1', 30, 8)); XW.at(2100, () => XW.fill('#f1', DB.whenOf(job)));
    XW.at(3200, () => { XW.cursorTo('#f2', 30, 8); XW.fill('#f2', job.ticket === '' && !job.lead ? '不需要' : (job.ticket || (job.lead ? '第一种工作票' : '第二种工作票')) + ' · ' + tkNo + (job.ticketNo ? '' : '（新起草）')); });
    XW.at(5200, () => { XW.cursorTo('#f3', 30, 8); XW.fill('#f3', def.lead ? def.lead.n + '（' + def.lead.post.replace('副班长 · ', '') + ' · 工作负责人资格）' : '待定'); });
    XW.at(7100, () => { XW.cursorTo('#f4', 30, 8); XW.fill('#f4', crew.map(p => p.n + (p.week >= WEEK_LIMIT ? '（本周 ' + p.week + 'h，已提示）' : '')).join(' · ') || '—'); });
    XW.at(9100, () => { XW.cursorTo('#f5', 30, 8); XW.fill('#f5', follows.map(n => n + (/学员/.test(P[n].post) ? '（学习）' : '（带教）')).join(' · ') || '—'); });
    XW.at(10300, () => { XW.cursorTo('#f6', 30, 8); XW.fill('#f6', meas, 28); });
    XW.at(13100, () => XW.cursorTo('#fsave', 40, 10)); XW.at(13800, () => XW.press('#fsave'));
    XW.at(14200, () => {
      XW.cursorOff(); const names = (def.lead ? [def.lead.n] : []).concat(crew.map(p => p.n), follows); XW.fly('已通知 ' + names.join(' · '));
      const rec = { job: job.id, t: job.t, date: job.when, lead: def.lead ? def.lead.n : crew[0].n, crew: crew.map(p => p.n), learn: follows[0] || '', follows, reasons: def.explain.all.map(x => ({ n: x.p.n, role: x.role, why: x.why })), ts: Date.now() };
      const all = LS.get('dispatch', {}); all[job.id] = rec; LS.set('dispatch', all); const tk = DB.dispatch(job.id, rec);
      if (w && w.week >= WEEK_LIMIT) XW.mem.set('备选-' + DB.typeOf(job), w.n);
      XW.answer('派工单发出去了，' + names.length + '个人都收到了，推荐和排除的理由随单存了。' + (tk && tk.drafted && tk.jobId === job.id ? tk.kind + '草稿我按票号 ' + tk.no + ' 起好了，在审票里等你审，审过才能开工。' : tk ? '这件活的' + tk.kind + ' ' + tk.no + (/已审核|已签发/.test(tk.st) ? '已审核，可以开工。' : '还在待审，开工前要先审。') : '这项不用票。') + '班前会材料我可以按这张单子写。' + (w && w.week >= WEEK_LIMIT ? w.n + '这件事我记下了，这类活以后也先想着他。' : ''), null, { confirm: false, done() { XW.card('<div class="bt" style="margin-top:0"><button data-act="premeet-from" data-id="' + job.id + '">生成班前会材料</button><button class="g" data-act="nav" data-to="sched" data-sub="pool">看任务池</button></div>'); } });
      after && after(rec);
    });
    XW.at(16800, () => XW.fly('明早 07:30 提醒你和' + (def.lead ? def.lead.n : crew[0].n)));
  },
  /* 工时聚光 */
  hours(name) { name = name || '黄伟强'; const H = DB.hours(); const rows = H.map(r => [r.d, r.who, r.job + (r.added ? '（今日完工）' : ''), r.h]); const me = []; rows.forEach((r, i) => { if (r[1] === name) me.push(i); }); const mine = H.filter(r => r.who === name); const tot = mine.reduce((s, r) => s + r.h, 0);
    XW.spot({ title: '工时台账 · 本周（8-3 至 8-7）', cols: ['日期', '人员', '作业', '小时'], rows, me, sumCol: 3, unit: 'h', text: '我把' + name + '这周的' + mine.length + '行照亮了：' + mine.map(r => r.d.replace('8-3', '周一').replace('8-4', '周二').replace('8-5', '周三').replace('8-6', '周四').replace('8-7', '今天') + r.job + ' ' + r.h + ' 小时').join('、') + '，加起来 ' + tot + ' 小时。你上个月定的约定是每周不超过 ' + WEEK_LIMIT + '。' }); XW.at(900 + mine.length * 1000, () => XW.chart(CH.mini.cols(mine.map(r => ({ n: r.d.replace('8-3', '周一').replace('8-4', '周二').replace('8-5', '周三').replace('8-6', '周四').replace('8-7', '周五'), v: r.h, c: CPAL[0] })).concat([{ n: '本周', v: tot, c: tot >= WEEK_LIMIT ? '#e5484d' : CPAL[4] }]), { max: 30, h: 100, labels: true }), name + ' · 本周工时按天')); }
};
function flip(container, apply) { const kids = Array.from(container.children); const first = kids.map(k => k.getBoundingClientRect()); apply(); kids.forEach((k, i) => { const l = k.getBoundingClientRect(); const dx = first[i].left - l.left, dy = first[i].top - l.top; if (dx || dy) { k.style.transition = 'none'; k.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; requestAnimationFrame(() => { k.style.transition = 'transform .5s'; k.style.transform = ''; }); } }); }

/* ---------- 照片识别：她看见了（矢量现场图；真实照片到货自动替换） ---------- */
const PHOTO = {
  scenes: {
    p7: { boxes: [{ l: 48, t: 48, w: 12, hh: 8, lbl: '杆号 #7' }, { l: 8, t: 16, w: 26, hh: 10, lbl: '导线' }, { l: 76, t: 66, w: 16, hh: 24, lbl: '拉线锈断', bad: true }],
      rows: ['杆号：<b>田玉四线 #7</b>', '缺陷：<b>拉线锈断，离地约 1.2 m</b>', '来源：班组群 · 王安 昨 18:42', '<em>拿不准：</em>断口是否触地'],
      say: '这是田玉四线 #7 杆，杆号我从杆牌上认的。拉线在离地一米多的位置锈断了，断口那一块我框成了红色，因为看不出有没有触地。这条我按紧急隐患记的，你确认一下。', ask: '让王安现场确认' },
    tree: { boxes: [{ l: 62, t: 45, w: 12, hh: 8, lbl: '杆号 #15' }, { l: 12, t: 18, w: 42, hh: 42, lbl: '树冠' }, { l: 46, t: 16, w: 14, hh: 16, lbl: '距导线约 1.5 m', bad: true }],
      rows: ['杆号：<b>民石线 #15</b>', '缺陷：<b>树障，树冠距导线约 1.5 m</b>', '来源：巡视记录 · 吴倩 8-6', '<em>拿不准：</em>距离是目测，请现场量'],
      say: '民石线 #15 杆，树冠已经长到导线下方，我量出来大约 1.5 米，小于安全距离，记成紧急。距离是从照片估的，现场要再量一次。', ask: '让吴倩现场量' },
    lock: { boxes: [{ l: 24, t: 13, w: 52, hh: 68, lbl: '光侨路 3# 公用柜' }, { l: 45, t: 55, w: 12, hh: 16, lbl: '锁具损坏', bad: true }],
      rows: ['设备：<b>光侨路 3# 公用柜</b>', '缺陷：<b>柜门锁具损坏</b>', '来源：巡视记录 · 吴倩 8-6', '一般缺陷 · 7 天内处理'],
      say: '光侨路 3# 公用柜的柜门锁具坏了，柜门能关但锁不上，我记成一般缺陷，七天内换锁。', ask: '安排换锁' },
    ins: { boxes: [{ l: 45, t: 48, w: 12, hh: 8, lbl: '杆号 #18' }, { l: 55, t: 2, w: 16, hh: 24, lbl: '绝缘子裂纹', bad: true }],
      rows: ['杆号：<b>民石线 #18</b>', '缺陷：<b>绝缘子裂纹，有放电痕迹</b>', '来源：巡视记录 · 韩雪 8-6', '紧急 · 已更换，待验收'],
      say: '民石线 #18 杆的绝缘子表面有两道裂纹，边上有放电留下的黑痕，我判断是紧急。韩雪 8-6 登记的，已经换了新的，等验收。', ask: '安排验收' },
    trench: { boxes: [{ l: 18, t: 24, w: 64, hh: 16, lbl: '电缆' }, { l: 18, t: 42, w: 64, hh: 40, lbl: '积水约 20 cm', bad: true }],
      rows: ['设备：<b>田寮站电缆沟</b>', '缺陷：<b>积水约 20 cm</b>', '来源：OMS 缺陷表 8-1', '已关闭 · 8-6 清淤'],
      say: '田寮站电缆沟积水，水面离电缆下沿大约 20 厘米，排水口堵了。这条 8 月 6 日清淤后已经关闭。', ask: '看处理记录' },
    nest: { boxes: [{ l: 46, t: 48, w: 12, hh: 8, lbl: '杆号 #31' }, { l: 52, t: 18, w: 16, hh: 12, lbl: '鸟巢', bad: true }],
      rows: ['杆号：<b>玉粮线 #31</b>', '缺陷：<b>横担鸟巢</b>', '来源：现场回传 · 刘一鸣 11:05', '一般 · 7 天内处理'],
      say: '玉粮线 #31 杆横担上有个鸟巢，离导线近，刘一鸣今天上午拍的。我记成一般缺陷，建议这周顺路拆了。', ask: '安排拆除' }
  },
  html(key, big) { const s = this.scenes[key]; const img = PHOTOS && PHOTOS[key] ? '<img src="' + PHOTOS[key] + '" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">' : SCENES.svg(key); return '<div class="ph real' + (big ? ' big' : '') + '" id="ph-' + key + '" data-act="photo" data-key="' + key + '">' + img + '<div class="scan"></div>' + s.boxes.map(b => '<div class="box' + (b.bad ? ' bad' : '') + '" style="left:' + b.l + '%;top:' + b.t + '%;width:' + b.w + '%;height:' + b.hh + '%"><i>' + h(b.lbl) + '</i></div>').join('') + '</div>'; },
  rowsHTML(key) { return '<div class="rd" id="rd-' + key + '">' + this.scenes[key].rows.map(r => '<div>' + r + '</div>').join('') + '</div>'; },
  recog(key, opts) { opts = opts || {}; const s = this.scenes[key], ph = $('#ph-' + key), rd = $('#rd-' + key); if (!ph) return; ph.classList.remove('done', 'scan'); $$('.box', ph).forEach(b => b.classList.remove('on')); if (rd) { rd.classList.remove('done'); $$('div', rd).forEach(d => d.classList.remove('in')); }
    XW.state('look', '正在看照片'); XW.at(50, () => ph.classList.add('scan'));
    s.boxes.forEach((b, i) => XW.at(1500 + i * 800, () => { $$('.box', ph)[i].classList.add('on'); if (rd && $$('div', rd)[i]) $$('div', rd)[i].classList.add('in'); }));
    XW.at(1500 + s.boxes.length * 800 + 300, () => { if (rd) $$('div', rd).forEach(d => d.classList.add('in')); });
    XW.at(600, () => XW.answer(s.say, h(s.say) + '<div class="bt"><button data-act="hz-confirm" data-key="' + key + '">确认入隐患台账</button><button class="g" data-act="hz-ask" data-key="' + key + '">' + h(s.ask) + '</button><button class="g" data-act="hz-no" data-key="' + key + '">不是隐患</button></div>', { speak: false, confirm: false }));
  }
};

/* ---------- 文稿流式：逐段长出、取数停顿、局部重写、版本 ---------- */
const DOCGEN = {
  stream(host, paras, opts) { opts = opts || {}; host.innerHTML = (opts.title ? '<h5>' + h(opts.title) + '</h5>' : ''); XW.state('write'); let i = 0; const self = this;
    function next() { if (i >= paras.length) { host.insertAdjacentHTML('beforeend', '<div class="chips">' + (opts.chips || []).map(c => '<b data-act="doc-chip" data-chip="' + h(c.k) + '">' + h(c.n) + '</b>').join('') + '</div><div class="foot">以上内容为初稿与参考，由班组长确认后使用 · 版本 v' + ((opts.ver || 0) + 1) + '</div>'); XW.state(''); opts.done && opts.done(); return; }
      const p = document.createElement('p'); p.dataset.i = i; host.appendChild(p); const raw = paras[i]; i++; const m = raw.match(/\[(.*?)\]/);
      if (m) { const pre = raw.slice(0, m.index), post = raw.slice(m.index + m[0].length); XW.type(p, pre, 30, () => { const f = document.createElement('span'); f.className = 'fetch'; p.appendChild(f); XW.type(f, m[1], 40, () => XW.at(500, () => { f.remove(); const s = document.createElement('span'); p.appendChild(s); XW.type(s, post, 30, () => XW.at(250, next)); })); }); }
      else XW.type(p, raw, 30, () => XW.at(250, next)); }
    next(); },
  rewrite(host, idx, text, say) { const ps = $$('p', host); const old = ps[idx]; if (!old) return; old.classList.add('old'); const np = document.createElement('p'); np.className = 'new'; np.dataset.i = idx; old.after(np); XW.state('write'); XW.type(np, text, 30, () => { XW.state(''); if (say) XW.answer(say, null, { speak: false, confirm: false }); }); },
  shorten(host, say) { const ps = $$('p', host).filter(p => !p.classList.contains('old')); XW.state('write'); let k = 0; ps.forEach((p, i) => { const t = p.textContent; if (t.length > 36) { XW.at(k * 800, () => { p.classList.add('old'); const np = document.createElement('p'); np.className = 'new'; p.after(np); XW.type(np, t.replace(/，[^，。]{4,12}。$/, '。').replace(/（[^）]*）/g, ''), 26); }); k++; } }); XW.at(k * 800 + 700, () => { XW.state(''); XW.answer(say || '每段都缩短了。', null, { speak: false, confirm: false }); }); },
  text(host) { return $$('p', host).filter(p => !p.classList.contains('old')).map(p => p.textContent).join('\n'); }
};

/* ---------- 审票：票与规程并排，目光来回，缺项圈出（支持多张票） ---------- */
const TICKETREV = {
  t: null,
  render(host, ticket) { const t = ticket || TICKET; this.t = t; const st0 = (DB.ticket(t.no) || t).st; const st = /已审核|已签发|已执行|已退回/.test(st0 || '') ? st0 : null; host.innerHTML = '<div class="ticket" id="tk"><div class="pane"><h5>' + h(t.kind) + ' · ' + h(t.no) + '</h5><div class="note">' + h(t.task) + ' · 负责人 ' + h(t.lead) + ' · 班员 ' + h(t.crew) + ' · ' + h(t.time) + '</div><div style="margin-top:6px;font-weight:600">安全措施</div>' + t.measures.map((m, i) => '<div class="it" id="tm' + i + '">' + (i + 1) + '. ' + h(m) + '</div>').join('') + '<div id="tmiss"></div></div><div class="pane"><h5>作业指导书 · 对应条目</h5>' + t.rules.map((r, i) => '<div class="it" id="tr' + i + '">' + h(r) + '</div>').join('') + '</div><svg class="gaze"></svg></div><div class="bt" id="tkbt" style="margin-top:8px">' + (st ? '<span class="tag ' + (st === '已退回' ? 'bad' : 'ok') + '">' + h(st) + ' · ' + h(t.no) + '</span>' : '<button data-act="ticket-review">审票</button><button class="g" data-act="ticket-back" disabled>退回修改</button>') + '</div>'; if (st && st !== '已退回') this.applyFix(); },
  line(a, b) { const svg = $('#tk svg.gaze'), tk = $('#tk'); if (!svg || !tk) return; const r0 = tk.getBoundingClientRect(), ra = $(a).getBoundingClientRect(), rb = $(b).getBoundingClientRect(); const l = document.createElementNS('http://www.w3.org/2000/svg', 'line'); l.setAttribute('x1', ra.right - r0.left); l.setAttribute('y1', ra.top + ra.height / 2 - r0.top); l.setAttribute('x2', rb.left - r0.left); l.setAttribute('y2', rb.top + rb.height / 2 - r0.top); svg.appendChild(l); requestAnimationFrame(() => l.classList.add('on')); XW.at(900, () => l.classList.remove('on')); },
  run() { const t = this.t || TICKET; XW.state('look', '正在审票'); $$('#tk .it').forEach(d => d.classList.remove('lit', 'miss')); $('#tmiss').innerHTML = ''; $('#tk svg.gaze').innerHTML = '';
    const pairs = t.measures.map((m, i) => [i, Math.min(i, t.rules.length - 1)]); pairs.forEach((pr, i) => XW.at(400 + i * 900, () => { $$('#tk .it').forEach(d => d.classList.remove('lit')); $('#tm' + pr[0]).classList.add('lit'); $('#tr' + pr[1]).classList.add('lit'); this.line('#tm' + pr[0], '#tr' + pr[1]); }));
    XW.at(400 + pairs.length * 900, () => { $$('#tk .it').forEach(d => d.classList.remove('lit')); t.missing.forEach(m => { const mi = t.measures.findIndex(x => x.includes(m.item.replace('位置', ''))); if (mi >= 0) $('#tm' + mi).classList.add('miss'); else $('#tmiss').insertAdjacentHTML('beforeend', '<div class="it miss">' + h(m.item) + '（票面无此项）</div>'); const ri = t.rules.findIndex(r => r.includes(m.item.slice(0, 2))); if (ri >= 0) $('#tr' + ri).classList.add('lit'); }); });
    XW.at(1200 + pairs.length * 900, () => { XW.state(''); if (!t.missing.length) { const txt = '安措我对了一遍，' + t.measures.length + '条都和指导书对上了，验电、放电、接地、围栏都写清楚了，可以签发。'; XW.answer(txt, h(txt) + '<div class="bt"><button data-act="ticket-fix">签发</button><button class="g" data-act="ticket-back">退回负责人</button></div>', { speak: false, confirm: false }); } else { const txt = '安措我对了一遍：' + t.missing.map(m => m.why).join('；') + '。这' + (t.missing.length > 1 ? '几' : '一') + '处得补，其他 ' + (t.measures.length - t.missing.filter(m => t.measures.some(x => x.includes(m.item.replace('位置', '')))).length) + ' 条没问题。'; XW.answer(txt, h(txt) + '<div class="bt"><button data-act="ticket-fix">补齐并通过</button><button class="g" data-act="ticket-back">退回负责人</button></div>', { speak: false, confirm: false }); } const b = $('#tkbt button.g'); if (b) b.disabled = false; });
  },
  applyFix() { const t = this.t || TICKET; t.missing.forEach(m => { const mi = t.measures.findIndex(x => x.includes(m.item.replace('位置', ''))); if (mi >= 0) { const el = $('#tm' + mi); if (el) { el.classList.remove('miss'); el.textContent = (mi + 1) + '. ' + t.measures[mi] + (m.item.includes('位置') ? '（#11、#13 档）' : '（已补）'); } } else { $('#tmiss').insertAdjacentHTML('beforeend', '<div class="it" style="background:var(--okbg)">' + (t.measures.length + 1) + '. ' + h(m.item) + '：作业前验明无电</div>'); } }); const g = $('#tk svg.gaze'); if (g) g.innerHTML = ''; $$('#tmiss .miss').forEach(e => e.remove()); },
  fix() { const t = this.t || TICKET; this.applyFix(); DB.setTicket(t.no, '已审核'); DB.notify(t.lead, t.kind + ' ' + t.no + ' 审核通过', '已读', true); const j = DB.jobs().find(x => x.ticketNo === t.no); XW.fly('工作票 ' + t.no + ' 已审核 · 已通知' + t.lead); XW.answer((t.missing.length ? '缺的补上了，' : '') + '票已经通过审核，' + t.lead + '那边收到通知。开工前她要在现场再核一遍安措。' + (j ? '任务 + j.t + 现在可以开工了。' : ''), null, { confirm: false, done() { if (j) XW.card('<div class="bt" style="margin-top:0"><button data-act="job-start" data-id="' + j.id + '">开工</button><button class="g" data-act="nav" data-to="sched" data-sub="pool">回任务池</button></div>'); } }); $('#tkbt').innerHTML = '<span class="tag ok">已审核 · ' + h(t.no) + '</span>'; TASKS.redraw(); }
};

/* ---------- 值班表：一格格填，冲突处停下来问 ---------- */
const DUTY = {
  plan() { const rows = ['白班 A', '白班 B', '夜班']; const grid = {}; const order = ['韩雪', '黄伟强', '李文博', '吴倩', '郭子扬', '赵敏', '王安', '陈浩', '周明', '刘一鸣']; let k = 0; const cnt = {}; order.forEach(n => cnt[n] = 0);
    DUTY_DAYS.forEach((d, di) => rows.forEach((r, ri) => { let tries = 0, pick; while (tries < 20) { const n = order[k % order.length]; k++; tries++; const conf = (DUTY_CONFLICT[n] || []).includes(d); if (!conf && cnt[n] < 3 && !(ri === 2 && P[n].week >= WEEK_LIMIT)) { pick = n; break; } } if (!pick) pick = order[k % order.length]; cnt[pick]++; grid[di + '-' + ri] = pick; })); return { rows, grid }; },
  render(host) { const rows = ['白班 A', '白班 B', '夜班']; host.innerHTML = '<div class="duty" id="dutyg"><div></div>' + DUTY_DAYS.map(d => '<div class="hd">' + h(d) + '</div>').join('') + rows.map((r, ri) => '<div class="rn">' + h(r) + '</div>' + DUTY_DAYS.map((d, di) => '<div class="cell" id="dc' + di + '-' + ri + '"></div>').join('')).join('') + '</div><div class="bt" style="margin-top:8px"><button data-act="duty-run">排下周值班表</button><button class="g" data-act="duty-save" disabled>保存并发布</button></div>'; const saved = LS.get('duty'); if (saved) { Object.keys(saved.grid).forEach(k => { const c = $('#dc' + k); if (c) { c.textContent = saved.grid[k]; c.classList.add('fill'); } }); $('[data-act="duty-save"]').disabled = false; } },
  run() { const pl = this.plan(); $$('#dutyg .cell').forEach(c => { c.textContent = ''; c.classList.remove('fill', 'conf'); }); XW.state('work', '正在排班'); XW.answer('我按四条约束排：有资质、每人每周不超过三班、夜班不排本周已超 24 小时的人、避开每个人报的冲突。排到有冲突的地方我停下来问你。', null, { confirm: false });
    const keys = Object.keys(pl.grid); keys.forEach((k, i) => XW.at(1200 + i * 320, () => { const c = $('#dc' + k); XW.cursorTo(c, 20, 6); c.textContent = pl.grid[k]; c.classList.add('fill'); if (k === '2-0') { c.classList.add('conf'); } }));
    XW.at(1200 + keys.length * 320 + 200, () => { XW.cursorOff(); XW.state(''); const c = $('#dc2-0'); const who = c.textContent; XW.answer('排好了。周三白班 A 我本来想排韩雪，她那天有培训，换成了' + who + '，其他都按约束排的。黄伟强周末不排，他报了家里有事。可以的话我就发布。', null, { confirm: false, html: null }); XW.card('<div class="bt" style="margin-top:0"><button data-act="duty-save">发布值班表</button><button class="g" data-act="duty-adjust">我再调一下</button></div>'); this.last = pl; $('[data-act="duty-save"]').disabled = false; });
  },
  save() { if (!this.last) { const g = {}; $$('#dutyg .cell').forEach(c => { if (c.textContent) g[c.id.slice(2)] = c.textContent; }); this.last = { grid: g }; } LS.set('duty', this.last); XW.fly('下周值班表已发布 · 10 人已收到'); XW.answer('值班表发出去了，十个人都收到了。有人换班的话在表上点那一格，我来改。', null, { confirm: false }); }
};
