/* ===== 通用组件：派工人员条带、照片识别、文稿流式、审票、值班表 ===== */

/* ---------- 派工：人员条带过滤 → 排序 → 剔除 → 点人 → 她动手填单 ---------- */
const DISPATCH = {
  job: null, host: null, picked: null,
  eligible(p, job) { const need = (job && job.need) || ['登高作业证']; return need.every(c => p.cert.includes(c)) && p.status !== '休假' && p.post !== '班长'; },
  reason(p, job) { if (p.post === '班长') return '班长'; if (p.status === '休假') return '休假'; if (/学员/.test(p.post)) return '学员'; const need = (job && job.need) || ['登高作业证']; const miss = need.find(c => !p.cert.includes(c)); return miss ? '无' + miss.replace('作业', '') : ''; },
  render(host) { const row = $('.row', host); row.innerHTML = ''; PEOPLE.forEach((p, i) => { const d = document.createElement('div'); d.className = 'chip'; d.dataset.i = i; d.dataset.act = 'dispatch-pick'; d.dataset.who = p.n; d.innerHTML = '<b>' + h(p.n) + '</b><div class="hb"><i></i></div><span class="hr">' + p.week + ' h · 本周</span><span class="why"></span>'; row.appendChild(d); XW.at(80 + i * 50, () => { d.querySelector('.hb i').style.width = Math.min(100, p.week / 26 * 100) + '%'; }); }); },
  /* 展开条带并"边想边筛" */
  open(host, job, done) {
    this.host = host; this.job = job || JOBS.find(j => j.id === 'j5'); this.picked = null; host.classList.add('on'); this.render(host);
    const tk = $('.tk', host); tk.classList.add('on'); XW.state('think');
    const el = PEOPLE.filter(p => this.eligible(p, this.job)); const leads = el.filter(p => p.cert.includes('工作负责人资格'));
    const over = leads.filter(p => p.week >= WEEK_LIMIT), okLead = leads.filter(p => p.week < WEEK_LIMIT).sort((a, b) => a.week - b.week)[0];
    const crew = el.filter(p => p !== okLead && !/学员/.test(p.post)).sort((a, b) => a.week - b.week);
    const memo = XW.mem.get('凤凰线备选');
    const txt = (this.job.t.includes('刀闸') ? '换刀闸要登杆' : this.job.t + '要登杆') + '，班员得有登高证……有证的是' + el.map(p => p.n).join('、') + '。工作负责人要有负责人资格，只有' + leads.map(p => p.n).join('和') + '。' + (over.length ? over.map(p => p.n + '这周已经 ' + p.week + ' 小时，超过你定的每周 ' + WEEK_LIMIT + ' 小时').join('；') + '，负责人就是' + okLead.n + '。' : '负责人' + okLead.n + '。') + '剩下的按这周工时从少到多排……' + crew.map(p => p.n + ' ' + p.week).join('、') + '。' + (memo && /凤凰线/.test(this.job.t) ? '上次你把凤凰线的活给了' + memo + '，这次我还是先想到他。' : '') + '你想换谁，点一下就行。';
    XW.type($('span:last-child', tk), txt, 30);
    XW.at(2600, () => $$('.chip', host).forEach(c => { const p = PEOPLE[c.dataset.i]; if (!this.eligible(p, this.job)) { c.classList.add('dim'); c.querySelector('.why').textContent = this.reason(p, this.job); } }));
    XW.at(5400, () => $$('.chip', host).forEach(c => { const p = PEOPLE[c.dataset.i]; if (p === okLead) { c.classList.add('lead'); c.querySelector('.why').textContent = '负责人'; } if (over.includes(p)) { c.classList.add('bad'); c.querySelector('.why').textContent = p.week + 'h 超约定'; } }));
    XW.at(8600, () => flip($('.row', host), () => $$('.chip', host).forEach(c => { const p = PEOPLE[c.dataset.i]; let o = 100 + p.week; if (p === okLead) o = 0; if (!this.eligible(p, this.job)) o = 500 + p.week; if (over.includes(p)) o = 400; c.style.order = o; })));
    XW.at(11800, () => { XW.state(''); XW.answer('人都排在卡片上了，点谁我就说说他。', null, { confirm: false }); done && done({ lead: okLead, crew }); });
    return { lead: okLead, crew };
  },
  pick(name) {
    const p = P[name]; if (!p || !this.host) return; $$('.chip', this.host).forEach(c => c.classList.toggle('pick', c.dataset.who === name)); this.picked = p;
    const job = this.job, def = this.defaults();
    if (!this.eligible(p, job)) { XW.answer(p.n + (p.post === '班长' ? '是班长，' : p.status === '休假' ? '这周休假，' : /学员/.test(p.post) ? '还是学员，没有登高证，' : '没有登高证，') + '这次不能派。' + (/学员/.test(p.post) ? '可以随队学习，我已经把他排上了。' : ''), null, { confirm: false }); return; }
    if (p === def.lead) { XW.answer(p.n + '是这次的工作负责人，有负责人资格，这周 ' + p.week + ' 小时，近一个月带过两次同类作业。', null, { confirm: false }); return; }
    if (p.cert.includes('工作负责人资格') && p.week >= WEEK_LIMIT) { XW.answer(p.n + '有负责人资格，但这周已经 ' + p.week + ' 小时，超过你定的每周 ' + WEEK_LIMIT + ' 小时，我没排他。', p.n + '有负责人资格，但这周已经 <u class="num" data-act="hours" data-who="' + p.n + '">' + p.week + ' 小时</u>，超过你定的每周 ' + WEEK_LIMIT + ' 小时，我没排他。<div class="bt"><button data-act="dispatch-go" data-who="' + p.n + '">仍然换</button><button class="g" data-act="dispatch-keep">保留' + h(def.crew[1].n) + '</button></div>'); return; }
    if (p.week >= WEEK_LIMIT) {
      XW.think('班长点了' + p.n + '。他有登高证，明天没别的安排。这周工时……' + HOURS.filter(r => r.who === p.n).map(r => r.d.replace('9-', '周') .replace('周1', '周一').replace('周2', '周二').replace('周3', '周三') + ' ' + r.h).join('、') + '，已经 ' + p.week + ' 小时，明天再上 6 小时就超过班组约定。等等，上周班长也把凤凰线的活给过他，看来是信任他。那我提醒一句超时，其他照办。', () => {
        XW.answer('可以换成' + p.n + '，他持证、明天也没别的安排。只是提醒你：他这周已经 ' + p.week + ' 小时，明天再上 6 小时会超过班组约定。要按你的安排执行吗？', '可以换成' + p.n + '，他持证、明天也没别的安排。只是提醒你：<b>他这周已经 <u class="num" data-act="hours" data-who="' + p.n + '">' + p.week + ' 小时</u></b>，明天再上 6 小时会超过班组约定。要按你的安排执行吗？<div class="bt"><button data-act="dispatch-go" data-who="' + p.n + '">仍然换</button><button class="g" data-act="dispatch-keep">保留' + h(def.crew[1].n) + '</button></div>');
      }); return;
    }
    XW.answer(p.n + '这周 ' + p.week + ' 小时，有登高证，明天没冲突。把' + def.crew[1].n + '换成' + p.n + '？', h(p.n) + '这周 ' + p.week + ' 小时，有登高证，明天没冲突。把' + h(def.crew[1].n) + '换成' + h(p.n) + '？<div class="bt"><button data-act="dispatch-go" data-who="' + p.n + '">就这样</button><button class="g" data-act="dispatch-keep">保留' + h(def.crew[1].n) + '</button></div>');
  },
  defaults() { const job = this.job || JOBS.find(j => j.id === 'j5'); const el = PEOPLE.filter(p => this.eligible(p, job)); const leads = el.filter(p => p.cert.includes('工作负责人资格') && p.week < WEEK_LIMIT).sort((a, b) => a.week - b.week); const lead = leads[0]; const crew = el.filter(p => p !== lead && !/学员/.test(p.post)).sort((a, b) => a.week - b.week); return { lead, crew: [crew[0], crew[1]], learn: P['刘一鸣'] }; },
  /* 她动手填派工单。formHost：放表单的元素；after(rec) 回调 */
  go(who, formHost, after) {
    const job = this.job || JOBS.find(j => j.id === 'j5'); const def = this.defaults(); const w = who ? P[who] : def.crew[1];
    const crew = [def.crew[0], w].filter(Boolean); if (who && def.crew[0].n === who) crew[1] = def.crew[1];
    XW.answer('好，我来办。', null, { confirm: false });
    const isPh = /凤凰线/.test(job.t);
    XW.at(900, () => { XW.state('work'); formHost.scrollIntoView({ block: 'nearest' }); const hh = $('.h b', formHost.closest('.card') || formHost); if (hh) hh.textContent = '派工单 · ' + job.t;
      formHost.innerHTML = '<div class="form"><label>作业日期</label><div class="f" id="f1"></div><label>工作票</label><div class="f" id="f2"></div><label>工作负责人</label><div class="f" id="f3"></div><label>班员</label><div class="f" id="f4"></div><label>随队学习</label><div class="f" id="f5"></div><label>安措要点</label><div class="f" id="f6"></div><div class="btnrow bt"><button id="fsave">保存并通知</button><button class="g">再改改</button></div></div>'; });
    XW.at(1500, () => XW.cursorTo('#f1', 30, 8)); XW.at(2100, () => XW.fill('#f1', job.when.replace('明日', '2026-09-04') + (job.when.includes(':') ? '' : ' 09:00')));
    XW.at(3200, () => { XW.cursorTo('#f2', 30, 8); XW.fill('#f2', (job.lead ? '第一种工作票 · ' : '') + job.t); });
    XW.at(5200, () => { XW.cursorTo('#f3', 30, 8); XW.fill('#f3', def.lead.n + '（' + def.lead.post.replace('副班长 · ', '') + ' · 工作负责人资格）'); });
    XW.at(7100, () => { XW.cursorTo('#f4', 30, 8); XW.fill('#f4', crew.map(p => p.n + (p.week >= WEEK_LIMIT ? '（本周 ' + p.week + 'h，已提示）' : '')).join(' · ')); });
    XW.at(9100, () => { XW.cursorTo('#f5', 30, 8); XW.fill('#f5', '刘一鸣'); });
    XW.at(10300, () => { XW.cursorTo('#f6', 30, 8); XW.fill('#f6', '验电 → 装设接地线三组（#11、#13 档）→ 悬挂标示牌', 28); });
    XW.at(13100, () => XW.cursorTo('#fsave', 40, 10)); XW.at(13800, () => XW.press('#fsave'));
    XW.at(14200, () => {
      XW.cursorOff(); const names = [def.lead.n].concat(crew.map(p => p.n), ['刘一鸣']); XW.fly('已通知 ' + names.join(' · '));
      const rec = { job: job.id, t: job.t, date: job.when, lead: def.lead.n, crew: crew.map(p => p.n), learn: '刘一鸣', ts: Date.now() };
      const all = LS.get('dispatch', {}); all[job.id] = rec; LS.set('dispatch', all); job.st = '已派';
      if (isPh && w && w.week >= WEEK_LIMIT) XW.mem.set('凤凰线备选', w.n);
      XW.answer('派工单发出去了，' + names.length + '个人都收到了。我明早七点半再提醒你和' + def.lead.n + '一次。' + (isPh && w && w.week >= WEEK_LIMIT ? w.n + '这件事我记下了，凤凰线的活以后也先想着他。' : ''), null, { confirm: false });
      after && after(rec);
    });
    XW.at(16800, () => XW.fly('明早 07:30 提醒你和' + def.lead.n));
  },
  /* 工时聚光 */
  hours(name) { name = name || '李文博'; const rows = HOURS.map(r => [r.d, r.who, r.job, r.h]); const me = []; rows.forEach((r, i) => { if (r[1] === name) me.push(i); }); const mine = HOURS.filter(r => r.who === name); const tot = mine.reduce((s, r) => s + r.h, 0);
    XW.spot({ title: '工时台账 · 本周（9-1 至 9-3）', cols: ['日期', '人员', '作业', '小时'], rows, me, sumCol: 3, unit: 'h', text: '我把' + name + '这周的' + mine.length + '行照亮了：' + mine.map(r => r.d.replace('9-1', '周一').replace('9-2', '周二').replace('9-3', '今天') + r.job + ' ' + r.h + ' 小时').join('、') + '，加起来 ' + tot + ' 小时。你上个月定的约定是每周不超过 ' + WEEK_LIMIT + '。' }); }
};
function flip(container, apply) { const kids = Array.from(container.children); const first = kids.map(k => k.getBoundingClientRect()); apply(); kids.forEach((k, i) => { const l = k.getBoundingClientRect(); const dx = first[i].left - l.left, dy = first[i].top - l.top; if (dx || dy) { k.style.transition = 'none'; k.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; requestAnimationFrame(() => { k.style.transition = 'transform .5s'; k.style.transform = ''; }); } }); }

/* ---------- 照片识别：她看见了 ---------- */
const PHOTO = {
  scenes: {
    p7: { boxes: [{ l: 55, t: 4, w: 12, hh: 28, lbl: '杆号 #7' }, { l: 14, t: 18, w: 24, hh: 16, lbl: '导线' }, { l: 36, t: 26, w: 34, hh: 30, lbl: '拉线锈断', bad: true }], bg: '<div class="pole"></div><div class="wire"></div><div class="wire2"></div',
      rows: ['杆号：<b>田寮线 #7</b>', '缺陷：<b>拉线锈断，离地约 1.2 m</b>', '来源：班组群 · 王安 昨 18:42', '<em>拿不准：</em>断口是否触地'],
      say: '这是田寮线 #7 杆，杆号我从杆牌上认的。拉线在离地一米多的位置锈断了，断口那一块我框成了红色，因为看不出有没有触地。这条我按紧急隐患记的，你确认一下。', ask: '让王安现场确认' },
    tree: { boxes: [{ l: 55, t: 4, w: 12, hh: 26, lbl: '杆号 #15' }, { l: 10, t: 28, w: 44, hh: 40, lbl: '树冠', bad: false }, { l: 40, t: 20, w: 26, hh: 14, lbl: '距导线约 1.5 m', bad: true }], bg: '<div class="pole"></div><div class="wire"></div><div class="tree"></div',
      rows: ['杆号：<b>凤凰线 #15</b>', '缺陷：<b>树障，树冠距导线约 1.5 m</b>', '来源：巡视记录 · 吴倩 8-30', '<em>拿不准：</em>距离是目测，请现场量'],
      say: '凤凰线 #15 杆，树冠已经长到导线下方，我量出来大约 1.5 米，小于安全距离，记成紧急。距离是从照片估的，现场要再量一次。', ask: '让吴倩现场量' },
    lock: { boxes: [{ l: 22, t: 14, w: 56, hh: 80, lbl: '塘家公用柜' }, { l: 44, t: 50, w: 14, hh: 16, lbl: '锁具损坏', bad: true }], bg: '<div class="cab"></div',
      rows: ['设备：<b>塘家公用柜</b>', '缺陷：<b>柜门锁具损坏</b>', '来源：巡视记录 · 吴倩 8-30', '一般缺陷 · 7 天内处理'],
      say: '塘家公用柜的柜门锁具坏了，柜门能关但锁不上，我记成一般缺陷，七天内换锁。', ask: '安排换锁' }
  },
  html(key, big) { const s = this.scenes[key]; return '<div class="ph' + (big ? ' big' : '') + '" id="ph-' + key + '" data-act="photo" data-key="' + key + '">' + s.bg + '><div class="scan"></div>' + s.boxes.map((b, i) => '<div class="box' + (b.bad ? ' bad' : '') + '" style="left:' + b.l + '%;top:' + b.t + '%;width:' + b.w + '%;height:' + b.hh + '%"><i>' + h(b.lbl) + '</i></div>').join('') + '</div>'; },
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

/* ---------- 审票：票与规程并排，目光来回，缺项圈出 ---------- */
const TICKETREV = {
  render(host) { host.innerHTML = '<div class="ticket" id="tk"><div class="pane"><h5>' + h(TICKET.kind) + ' · ' + h(TICKET.no) + '</h5><div class="note">' + h(TICKET.task) + ' · 负责人 ' + h(TICKET.lead) + ' · ' + h(TICKET.time) + '</div><div style="margin-top:6px;font-weight:600">安全措施</div>' + TICKET.measures.map((m, i) => '<div class="it" id="tm' + i + '">' + (i + 1) + '. ' + h(m) + '</div>').join('') + '<div id="tmiss"></div></div><div class="pane"><h5>作业指导书 · 停电作业安措</h5>' + TICKET.rules.map((r, i) => '<div class="it" id="tr' + i + '">' + h(r) + '</div>').join('') + '</div><svg class="gaze"></svg></div><div class="bt" id="tkbt" style="margin-top:8px"><button data-act="ticket-review">审票</button><button class="g" data-act="ticket-back" disabled>退回修改</button></div>'; },
  line(a, b, on) { const svg = $('#tk svg.gaze'), tk = $('#tk'); if (!svg || !tk) return; const r0 = tk.getBoundingClientRect(), ra = $(a).getBoundingClientRect(), rb = $(b).getBoundingClientRect(); const l = document.createElementNS('http://www.w3.org/2000/svg', 'line'); l.setAttribute('x1', ra.right - r0.left); l.setAttribute('y1', ra.top + ra.height / 2 - r0.top); l.setAttribute('x2', rb.left - r0.left); l.setAttribute('y2', rb.top + rb.height / 2 - r0.top); svg.appendChild(l); requestAnimationFrame(() => l.classList.add('on')); XW.at(900, () => l.classList.remove('on')); },
  run() { XW.state('look', '正在审票'); $$('#tk .it').forEach(d => d.classList.remove('lit', 'miss')); $('#tmiss').innerHTML = ''; $('#tk svg.gaze').innerHTML = '';
    const pairs = [[0, 0], [1, 0], [1, 1], [2, 2], [3, 3]]; pairs.forEach((pr, i) => XW.at(400 + i * 900, () => { $$('#tk .it').forEach(d => d.classList.remove('lit')); $('#tm' + pr[0]).classList.add('lit'); $('#tr' + pr[1]).classList.add('lit'); this.line('#tm' + pr[0], '#tr' + pr[1]); }));
    XW.at(400 + pairs.length * 900, () => { $$('#tk .it').forEach(d => d.classList.remove('lit')); $('#tm1').classList.add('miss'); $('#tr1').classList.add('lit'); $('#tmiss').innerHTML = '<div class="it miss">验电（票面无此项）</div>'; $('#tr0').classList.add('lit'); });
    XW.at(1200 + pairs.length * 900, () => { XW.state(''); const t = '安措我对了一遍：三组接地线写了，但没写装在哪一档，应该是 #11、#13 档；还有验电这一项票面上没有，指导书要求验明无电后才能装接地线。这两处得补，其他四条没问题。'; XW.answer(t, h(t) + '<div class="bt"><button data-act="ticket-fix">补齐两项并通过</button><button class="g" data-act="ticket-back">退回负责人</button></div>', { speak: false, confirm: false }); $('#tkbt button.g').disabled = false; });
  },
  fix() { $('#tm1').classList.remove('miss'); $('#tm1').textContent = '2. 装设接地线三组（#11、#13 档）'; $('#tmiss').innerHTML = '<div class="it" style="background:var(--okbg)">5. 验电：作业前在 #11、#13 档验明无电</div>'; $('#tk svg.gaze').innerHTML = ''; LS.set('ticket', { no: TICKET.no, st: '已审核', ts: Date.now() }); XW.fly('工作票 ' + TICKET.no + ' 已审核 · 已通知韩雪'); XW.answer('两项补上了，票已经通过审核，韩雪那边收到通知。明天开工前她要在现场再核一遍安措。', null, { confirm: false }); }
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
