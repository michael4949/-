/* ===== 状态层：所有页面读这里，所有操作写这里；数字由流程推导，不预设 =====
   任务：待派 → 已派（自动起草工作票）→ 票已审 → 进行中（回传）→ 已完成（记工时、关联缺陷转待验收）→ 已关闭
   两票：待审 → 已审核 / 已退回 → 已执行；上传的票也进同一张台账
   工时 / 人员去向 / 通知 / 缺陷状态 / 现场进度 / 周计划 / 月度汇总 / 任务台账 / 操作流水 全部由此推导 */
const DB = {
  /* ---------- 任务 ---------- */
  jobs() { const add = LS.get('jobs_add', []); const st = LS.get('jobst', {}); return JOBS.concat(add).map(j => Object.assign({}, j, st[j.id] || {}, { _ov: !!st[j.id] })).filter(j => j.st !== '已删除'); },
  job(id) { return this.jobs().find(j => j.id === id); },
  addJob(j) { const add = LS.get('jobs_add', []); j.id = j.id || 'u' + Date.now().toString(36); j.st = j.st || '待派'; j.added = true; j.ts = Date.now(); if (j.dateIso) j.dayIdx = this.dayIdx(j.dateIso); add.push(j); LS.set('jobs_add', add); this.log('添加任务', j.t + '（' + j.when + '）'); return j; },
  updAdded(id, patch) { const add = LS.get('jobs_add', []); const j = add.find(x => x.id === id); if (j) { Object.assign(j, patch); if (j.dateIso) j.dayIdx = this.dayIdx(j.dateIso); LS.set('jobs_add', add); this.log('修改任务', j.t); } },
  setJob(id, patch) { const st = LS.get('jobst', {}); st[id] = Object.assign(st[id] || {}, patch); LS.set('jobst', st); this.refresh(); },
  removeJob(id) { const j = this.job(id); const add = LS.get('jobs_add', []); if (add.some(x => x.id === id)) { LS.set('jobs_add', add.filter(x => x.id !== id)); const st = LS.get('jobst', {}); delete st[id]; LS.set('jobst', st); } else this.setJob(id, { st: '已删除' }); const ov = LS.get('week_ov', {}); delete ov[id]; LS.set('week_ov', ov); this.log('删除任务', j ? j.t : id); },
  todayJobs() { return this.jobs().filter(j => !j.added || j.dateIso === TODAY || j.dateIso === '2026-09-04'); },
  dayIdx(iso) { const d0 = new Date('2026-09-07'); const d = new Date(iso); const i = Math.round((d - d0) / 86400000); return i >= 0 && i <= 6 ? i : null; },
  typeOf(j) { if (j.type) return j.type; const t = j.t; return /巡视/.test(t) ? '巡视' : /消缺|抢修/.test(t) ? '消缺' : /检查|确认|验收/.test(t) ? '检查' : /更换|检修|试验|检测/.test(t) ? '检修' : /安全日|培训|考/.test(t) ? '培训' : '巡视'; },
  lineOf(j) { return j.line || (j.t.match(/凤凰线|塘尾线|田寮线|志远站|光明变|塘家公用柜/) || [j.t.split(' ')[0]])[0]; },
  /* 任务的作业日期（派工单、周计划、台账都用它） */
  whenOf(j) { if (j.dateIso) return j.dateIso + ' ' + (j.time || '09:00'); const w = j.when || ''; const tm = (w.match(/\d\d:\d\d/) || ['09:00'])[0]; const wk = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']; const nx = wk.findIndex(d => w.includes('下' + d)); if (nx >= 0) return '2026-09-' + String(7 + nx).padStart(2, '0') + ' ' + tm; const th = wk.findIndex(d => w.includes(d)); if (th >= 0) return '2026-0' + (th === 0 ? '8-31' : '9-0' + th) + ' ' + tm; if (/今日|^\d\d:\d\d$/.test(w)) return TODAY + ' ' + tm; return '2026-09-04 ' + tm; },
  crewOf(j) { return typeof j.lead === 'string' ? [j.lead].concat(j.crew || [], j.learn ? [j.learn] : []).filter(Boolean) : (j.who || []).slice(); },
  /* ---------- 工时（完工后写入，本周工时由此推导） ---------- */
  hours() { return HOURS.concat(LS.get('hours_add', [])); },
  addHours(rows) { const a = LS.get('hours_add', []); rows.forEach(r => a.push(r)); LS.set('hours_add', a); this.refresh(); },
  week(name) { return this.hours().filter(r => r.who === name).reduce((s, r) => s + r.h, 0); },
  status(name) { return LS.get('pstatus', {})[name]; },
  setStatus(names, st) { const m = LS.get('pstatus', {}); names.forEach(n => { m[n] = st; }); LS.set('pstatus', m); this.refresh(); },
  refresh() { const ps = LS.get('pstatus', {}); PEOPLE.forEach(p => { p.week = this.week(p.n); if (ps[p.n]) p.status = ps[p.n]; else if (p.status0) p.status = p.status0; }); },
  /* ---------- 通知 ---------- */
  notices() { return LS.get('notices', []).concat(NOTICES); },
  notify(to, text, st, quiet) { const a = LS.get('notices', []); a.unshift({ d: this.now(), to, t: text, st: st || '已发' }); LS.set('notices', a); if (!quiet) XW.fly('已通知 ' + to + ' · ' + text); },
  now() { const d = new Date(); return '09-03 ' + d.toTimeString().slice(0, 5); },
  clock() { return new Date().toTimeString().slice(0, 5); },
  /* ---------- 缺陷 / 隐患 ---------- */
  defects() { const st = LS.get('defects', {}); const hz = LS.get('hazards', {}); const add = LS.get('defects_add', []); return DEFECTS.concat(DEFECTS2, add).map(d => Object.assign({}, d, { st: (st[d.id] || {}).st || (d.photo && hz[d.photo]) || d.st })); },
  defect(id) { return this.defects().find(d => d.id === id); },
  setDefect(id, st, extra) { const df = LS.get('defects', {}); df[id] = Object.assign(df[id] || {}, { st, ts: Date.now() }, extra || {}); LS.set('defects', df); const d = this.defect(id); this.log('缺陷', (d ? d.t : id) + ' → ' + st); },
  addDefect(d) { const a = LS.get('defects_add', []); d.id = d.id || 'x' + Date.now().toString(36); a.push(d); LS.set('defects_add', a); this.log('缺陷', '登记 ' + d.t); return d; },
  STAGES: { 发现: /./, 登记: /^(?!.*(待确认|已撤销))/, 处理中: /处理中|催办|超期|已登记|已入隐患台账|已派|进行中/, 待验收: /待验收/, 已关闭: /已关闭|已消缺/ },
  stageOf(k) { const re = this.STAGES[k] || /./; return this.defects().filter(d => re.test(d.st)); },
  flow() { return Object.keys(this.STAGES).map(k => ({ k, v: this.stageOf(k).length })); },
  /* ---------- 两票 ---------- */
  tickets() { const add = LS.get('tickets_add', []); const st = LS.get('tickets', {}); return TICKETS.concat(add).map(t => Object.assign({}, t, { st: (st[t.no] || {}).st || (t.no === TICKET.no && LS.get('ticket') ? '已审核' : '待审') })); },
  ticket(no) { return this.tickets().find(t => t.no === no); },
  addTicket(t) { const a = LS.get('tickets_add', []); if (!a.some(x => x.no === t.no) && !TICKETS.some(x => x.no === t.no)) { a.push(t); LS.set('tickets_add', a); this.log(t.uploaded ? '上传两票' : '起草工作票', t.no + ' ' + t.task); } return t; },
  putTicket(t) { const a = LS.get('tickets_add', []); const i = a.findIndex(x => x.no === t.no); const c = Object.assign({}, t); delete c.st; if (i >= 0) a[i] = c; else a.push(c); LS.set('tickets_add', a); return t; },
  setTicket(no, st) { const all = LS.get('tickets', {}); all[no] = { st, ts: Date.now() }; LS.set('tickets', all); if (no === TICKET.no && st === '已审核') LS.set('ticket', { no, st, ts: Date.now() }); const j = this.jobs().find(j => j.ticketNo === no); if (j && st === '已审核' && j.st === '已派') this.setJob(j.id, { st: '票已审' }); if (j && st === '已退回' && j.st === '票已审') this.setJob(j.id, { st: '已派' }); if (j && st === '已执行') this.setJob(j.id, { ticketDone: true }); this.log('两票', no + ' → ' + st); },
  nextTicketNo() { const n = this.tickets().filter(t => /2026-0903-/.test(t.no)).length + 1; return '配一 2026-0903-' + String(n).padStart(2, '0'); },
  reviewed() { return this.tickets().filter(t => /已审核|已签发|已执行|已退回/.test(t.st)); },
  ticketM() { const r = this.reviewed(); const n = TICKET_M.n.slice(), ok = TICKET_M.ok.slice(); n[8] += r.length; ok[8] += r.filter(t => t.st !== '已退回').length; return { m: TICKET_M.m, n, ok }; },
  /* 派工后按任务类型起草工作票（含常见缺项，等审票补齐） */
  draftTicket(job, rec) { if (job.ticketNo) return this.ticket(job.ticketNo); const kind = job.ticket && /操作票|第.种工作票/.test(job.ticket) ? job.ticket : (job.lead || (job.need || []).includes('登高作业证') ? '第一种工作票' : '第二种工作票'); const line = this.lineOf(job); const climb = /登杆|杆|拉线|绝缘子|刀闸|导线|鸟巢|树障/.test(job.t); const cab = /柜|站|终端|蓄电池|锁具/.test(job.t); const test = /试验|检测/.test(job.t);
    const t = { no: this.nextTicketNo(), kind, task: job.t, lead: rec.lead, crew: rec.crew.join('、') + (rec.learn ? '、' + rec.learn + '（随队学习）' : ''), time: this.whenOf(job) + ' – 17:00', jobId: job.id, drafted: true,
      measures: climb ? [line + ' 开关分闸并挂"禁止合闸，线路有人工作"标示牌', '装设接地线两组', '作业点设围栏，悬挂"止步，高压危险"标示牌', '登杆前检查杆根、拉线'] : cab ? [line + ' 进出线开关分闸', '柜前设围栏并悬挂标示牌', '使用绝缘工具作业'] : test ? [line + ' 开关分闸并挂标示牌', '两端验电、放电、接地', '试验区设围栏，人员站在安全距离外', '试验完毕充分放电后拆线'] : ['作业点设围栏并悬挂标示牌', '作业前核对设备名称、编号'],
      missing: climb ? [{ item: '验电', why: '装设接地线前应先验电，票面无验电项' }, { item: '接地线位置', why: '写了接地线，未写装在哪一档' }] : cab ? [{ item: '验电', why: '柜内作业前应验明无电，票面无验电项' }] : [],
      rules: climb ? ['停电作业应在验明无电后装设接地线', '接地线装设位置应在工作票上写明', '作业点应装设围栏与标示牌', '登杆前应检查杆根、拉线及登杆工具'] : cab ? ['柜内作业应验明无电', '作业点应装设围栏与标示牌', '使用合格的绝缘工具'] : ['试验前验电、放电、接地', '试验区设围栏，人员站在安全距离外', '试验完毕充分放电并接地后方可拆线', '开关分闸并悬挂标示牌'] };
    this.addTicket(t); this.setJob(job.id, { ticketNo: t.no }); return t; },
  /* ---------- 现场进度（开工后出现） ---------- */
  addProg(g) { const a = LS.get('prog', []); a.push(g); LS.set('prog', a); },
  updProg(id, fn) { const a = LS.get('prog', []); let g = a.find(x => x.id === id); if (g) { fn(g); LS.set('prog', a); return g; } const b = PROGRESS.find(x => x.id === id); if (b) { const ov = LS.get('prog_ov', {}); const c = Object.assign({}, b, ov[id] || {}); fn(c); ov[id] = { pct: c.pct, hrs: c.hrs, ev: c.ev, warn: c.warn, done: c.done, start: c.start }; LS.set('prog_ov', ov); return c; } },
  progressAll() { const ov = LS.get('prog_ov', {}); return PROGRESS.map(b => Object.assign({}, b, ov[b.id] || {})).concat(LS.get('prog', [])); },
  progOf(j) { return this.progressAll().find(x => x.jobId === j.id || x.t === j.t); },
  /* ---------- 周计划（下周任务 + 新增任务 + 覆盖） ---------- */
  weekPlan() { const ov = LS.get('week_ov', {}); const add = this.jobs().filter(j => (j.added || j.dateIso) && !JOBS_WEEK.some(w => w.t.replace(/\s/g, '') === j.t.replace(/\s/g, '')) && this.dayIdx(j.dateIso) != null && j.st !== '已完成' && j.st !== '已关闭'); return JOBS_WEEK.map(j => Object.assign({}, j, ov[j.id] || {})).concat(add.map(j => Object.assign({ id: j.id, t: j.t, d0: this.dayIdx(j.dateIso), d1: this.dayIdx(j.dateIso), h: j.h || 4, type: this.typeOf(j), who: typeof j.lead === 'string' ? [j.lead].concat(j.crew || []) : (j.who && j.who.length ? j.who : ['待派']), added: true }, ov[j.id] || {}))); },
  setWeek(id, patch) { const ov = LS.get('week_ov', {}); ov[id] = Object.assign(ov[id] || {}, patch); LS.set('week_ov', ov); this.log('周计划', id + ' ' + JSON.stringify(patch)); },
  /* ---------- 任务台账 / 月度汇总（推导） ---------- */
  extraJobs() { return this.jobs().filter(j => j.added || j._ov); },
  taskLedger() { return TASKS_M.concat(this.extraJobs().map(j => ({ d: this.whenOf(j).slice(5, 10), t: this.typeOf(j), line: this.lineOf(j), who: this.crewOf(j).join('、') || '待派', st: j.st, id: j.id }))); },
  typeCounts() { const c = {}; this.taskLedger().forEach(t => { c[t.t] = (c[t.t] || 0) + 1; }); return ['巡视', '消缺', '检查', '检修', '培训'].filter(k => c[k]).map(k => [k, c[k]]); },
  month() { const ex = this.extraJobs(); const rv = this.reviewed(); const ds = this.defects(); return { jobs: MONTH_BASE.jobs + ex.length, jobsDone: MONTH_BASE.jobsDone + ex.filter(j => /已完成|已关闭/.test(j.st)).length, tickets: MONTH_BASE.tickets + rv.length, ticketsOK: MONTH_BASE.ticketsOK + rv.filter(t => t.st !== '已退回').length, defectsFound: ds.length, defectsClosed: ds.filter(d => /已关闭|已消缺/.test(d.st)).length, safetyDays: MONTH_BASE.safetyDays + ((LS.get('docs', {})['safetyday'] || {}).adopted ? 1 : 0), safetyDaysPlan: MONTH_BASE.safetyDaysPlan, incidentStudy: MONTH_BASE.incidentStudy, hoursTeam: MONTH_BASE.hoursTeam, honors: MONTH_BASE.honors }; },
  /* ---------- 操作流水（工作日志、班后会、所级月报取数） ---------- */
  log(kind, text) { const a = LS.get('log', []); a.unshift({ ts: Date.now(), d: this.now(), kind, text }); LS.set('log', a.slice(0, 120)); },
  logs() { return LS.get('log', []); },
  /* ---------- 流程动作（页面按钮调用） ---------- */
  dispatch(id, rec) { const j = this.job(id); if (!j) return null; this.setJob(id, { st: '已派', lead: rec.lead, crew: rec.crew, learn: rec.learn, dispatchedTs: Date.now() }); const t = this.draftTicket(this.job(id), rec); const names = [rec.lead].concat(rec.crew, rec.learn ? [rec.learn] : []); this.notify(names.join(' · '), j.t + ' 派工单', names.length + ' 人已收到', true); this.log('派工', j.t + '：' + names.join('、')); return t; },
  start(id) { const j = this.job(id); if (!j) return { ok: false, why: '没有这项任务' }; if (j.ticketNo) { const t = this.ticket(j.ticketNo); if (t && !/已审核|已签发|已执行/.test(t.st)) return { ok: false, why: (t.kind || '工作票') + ' ' + t.no + (t.st === '已退回' ? ' 已退回负责人修改，还没重新送审' : ' 还没审核') + '，不能开工', ticket: t }; } if (!/已派|票已审|待开工/.test(j.st)) return { ok: false, why: j.st === '待派' ? '任务还没派人，先派工' : '任务现在是"' + j.st + '"，不能开工' };
    const who = this.crewOf(j); const g = this.progOf(j); const now = this.clock(); this.setJob(id, { st: '进行中', startTs: Date.now() }); if (g) this.updProg(g.id, x => { x.start = now; x.ev.push([now, who[0], '开工，安措布置完毕']); x.pct = Math.max(x.pct, 5); }); else this.addProg({ id: 'g' + id, jobId: id, t: j.t, who: who.join(' · '), start: now, pct: 5, hrs: 0, ev: [[now, who[0], '开工，安措布置完毕']] }); this.setStatus(who, '外勤'); this.log('开工', j.t + '：' + who.join('、')); return { ok: true, who, job: j }; },
  report(id) { const j = this.job(id); if (!j) return null; const g = this.progOf(j); if (!g) return null; const step = [['安措核对完毕，开始作业', 30], ['作业过半，现场照片 2 张', 65], ['作业完成，拆除安措，自检中', 90], ['清理现场，工器具清点无遗漏', 100]]; const k = Math.min(step.length - 1, Math.floor(g.pct / 30)); const now = this.clock(); const who = g.who.split(' · '); const r = this.updProg(g.id, x => { x.ev.push([now, who[Math.min(1, who.length - 1)], step[k][0]]); x.pct = step[k][1]; x.hrs = +(x.hrs + 1.5).toFixed(1); x.warn = x.hrs >= 3; }); this.log('回传', j.t + '：' + step[k][0]); return r; },
  finish(id) { const j = this.job(id); if (!j || j.st !== '进行中') return null; const who = this.crewOf(j); const hrs = j.h || 6; this.setJob(id, { st: '已完成', doneTs: Date.now() }); this.addHours(who.map(n => ({ d: '9-3', who: n, job: j.t, h: hrs, added: true }))); this.setStatus(who, '在岗'); if (j.ticketNo) this.setTicket(j.ticketNo, '已执行'); const g = this.progOf(j); if (g) this.updProg(g.id, x => { x.pct = 100; x.done = true; x.warn = false; x.ev.push([this.clock(), who[0], '完工，向班长汇报']); }); const linked = this.linkedDefect(j); if (linked) this.setDefect(linked.id, '待验收'); this.log('完工', j.t + '，' + who.join('、') + '各记 ' + hrs + ' 小时'); return { who, hrs, linked, over: who.filter(n => this.week(n) > WEEK_LIMIT) }; },
  close(id) { const j = this.job(id); if (!j) return null; const linked = this.linkedDefect(j); this.setJob(id, { st: '已关闭' }); if (linked) this.setDefect(linked.id, '已关闭 · 验收 韩雪'); this.log('关闭', j.t); return linked; },
  linkedDefect(j) { if (!j) return null; const ds = this.defects(); if (j.defectId) return ds.find(d => d.id === j.defectId) || null; const key = j.t.replace(/10kV |抢修|消缺|更换|处理|复查|拆除/g, '').trim().slice(0, 6); return ds.find(d => d.t.replace(/\s/g, '').includes(key.replace(/\s/g, '')) && !/已关闭|已消缺|已撤销/.test(d.st)) || null; },
  reset() { ['jobs_add', 'jobst', 'hours_add', 'pstatus', 'notices', 'defects', 'defects_add', 'hazards', 'tickets', 'tickets_add', 'ticket', 'prog', 'prog_ov', 'week_ov', 'log', 'dispatch', 'docs', 'mem', 'levels', 'scores', 'grades', 'cases', 'exp', 'duty', 'risk', 'quiz', 'plan', 'sign', 'kbuse'].forEach(k => LS.del(k)); }
};
const MONTH = new Proxy({}, { get: (_, k) => DB.month()[k] });
PEOPLE.forEach(p => { p.status0 = p.status; });
DB.refresh();
