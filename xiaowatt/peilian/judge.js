/* ===== 操作票自动判卷引擎 =====
   顺序：步骤匹配 → 状态阶段 → 换序 / 特殊顺序 → 漏项 → 文字 → 危险规则。
   原则：确定性规则优先；不逐行死比；允许换序不判错；漏一项不连锁错位；同一根本错误只算一次；
        危险规则命中直接整票不合格；错误解释只引用真实检索到的条款，检索不到就要求人工复核。 */

const ERR_KINDS = {
  miss: { n: '漏项', c: 'w' }, order: { n: '顺序错误', c: 'o' }, cross: { n: '阶段越界', c: 'r' },
  text: { n: '文字不规范', c: 'y' }, level: { n: '层级错误', c: 'y' }, extra: { n: '无关步骤', c: 'g' }, danger: { n: '危险操作', c: 'r' }
};

const TK_VERBS = ['合上', '断开', '拉开', '投入', '退出', '检查', '切换', '装设', '拆除', '摇至', '调整'];
/* ---------- 步骤匹配：先认出学员这句话对应标准票哪一步 ---------- */
function tkScore(text, s) {
  const n = norm(text); if (!n) return 0;
  let sc = 0;
  const kh = s.k.filter(k => n.includes(norm(k))).length;
  sc += (s.k.length ? kh / s.k.length : 0) * 60;
  if (s.v) { sc += n.includes(s.v) ? 25 : -22; } else sc += TK_VERBS.some(v => n.includes(v)) ? -30 : 6;   // 屏柜抬头行不接带动词的操作项
  sc += sim(text, s.t) * 18;
  return sc;
}
function tkMatchAll(rows) {
  const used = {}, out = [];
  rows.forEach((r, i) => {
    const cands = TICKET.map(s => ({ s, sc: tkScore(r.t, s) })).sort((a, b) => b.sc - a.sc);
    const top = cands[0] ? cands[0].sc : 0;
    if (top < 42) { out.push({ i, row: r, s: null, sc: top }); return; }
    const near = cands.filter(x => x.sc >= top - 6);
    const pick = near.find(x => used[x.s.no] == null) || near[0];
    if (used[pick.s.no] == null) used[pick.s.no] = i;
    out.push({ i, row: r, s: pick.s, sc: pick.sc, dup: used[pick.s.no] !== i });
  });
  return { list: out, used };
}

/* ---------- 文字规则：严格一致 / 仅关键字严格 / 允许规范等价表达 ---------- */
function tkText(row, s) {
  const a = norm(row.t), b = norm(s.t);
  if (s.txt === '严格一致') {
    if (a === b) return null;
    if (sim(row.t, s.t) >= 0.92) return null;
    return { bad: '严格一致', tip: '该步骤要求严格一致，应照标准票原文填写' };
  }
  if (s.txt === '仅关键字严格') {
    const lost = s.k.filter(k => !a.includes(norm(k)));
    if (!lost.length) return null;
    const code = lost.filter(k => /[A-Z]|\d[A-Z]|^\d+P$/.test(k));
    return { bad: '仅关键字严格', tip: code.length ? '屏柜、压板、空开、把手编号应按屏柜附表填写，缺：' + lost.join('、') : '缺关键字：' + lost.join('、') };
  }
  if (sim(row.t, s.t) >= 0.55) return null;
  const lost = s.k.filter(k => !a.includes(norm(k)));
  if (!lost.length) return null;
  return { bad: '允许规范等价表达', tip: '表达与标准写法差异过大，缺：' + lost.join('、') };
}

/* ---------- 换序判定：同组且业务确认可换序的，组内顺序不同不判错 ---------- */
function tkSwappable(a, b) {
  if (a.grp !== b.grp) return false;
  if (a.swap === '否' || b.swap === '否') return false;
  const seq = TICKET_ORD.seq.find(g => g.includes(a.no) && g.includes(b.no));
  if (seq) return false;
  if ((TICKET_ORD.after[b.no] || []).includes(a.no)) return false;
  if ((TICKET_ORD.before[a.no] || []).includes(b.no)) return false;
  return true;
}

/* ---------- 主判卷 ---------- */
function tkJudge(rows, cfg) {
  cfg = Object.assign({}, TICKET_CFG, cfg || {});
  rows = rows.map((r, i) => ({ no: r.no || String(i + 1), t: (r.t || '').trim(), parent: r.parent || null })).filter(r => r.t);
  const M = tkMatchAll(rows);
  const pos = {};                                   // 标准步骤号 → 学员行下标
  M.list.forEach(x => { if (x.s && pos[x.s.no] == null) pos[x.s.no] = x.i; });
  const errs = [], fatal = [];
  const add = e => { errs.push(e); };
  const cite = (ref, words) => { const c = ruleFind(words, ref); return c.length ? c : (ref || []).map(ruleCite).filter(Boolean).slice(0, 2); };

  /* 1. 危险操作：确定性规则，优先级最高，命中即整票不合格；同一漏写项只在第一条命中的规则里计一次 */
  const covered = new Set();
  TICKET_DANGER.forEach(d => {
    const hits = tkDangerHits(d, pos);
    if (!hits.length) return;
    const fresh = hits.filter(x => !(x.lack && covered.has(x.a)));
    if (!fresh.length) return;
    fresh.forEach(x => { if (x.lack) covered.add(x.a); });
    const h0 = fresh[0], S = TSTEP[h0.b];
    fatal.push(d.n);
    add({
      kind: 'danger', at: pos[h0.b], stdNo: h0.b, std: S ? S.t : '',
      title: d.n, why: fresh.map(x => (x.lack ? '未写' : '把') + '第' + x.a + '项「' + TSTEP[x.a].t + '」' + (x.lack ? '，就' : '写在了') + '第' + x.b + '项「' + TSTEP[x.b].t + '」' + (x.lack ? '。' : '之后。')).join('') + d.why,
      whyBiz: d.src, cites: (d.ref || []).map(ruleCite).filter(Boolean), fix: d.fix,
      deduct: 0, fatalHit: true, cover: fresh.filter(x => x.lack).map(x => x.a), pairs: fresh.map(x => x.a + '>' + x.b)
    });
  });

  /* 2. 阶段越界：前一阶段必要条件未完成就出现下一阶段受限操作 */
  TICKET_META.stages.forEach(stg => {
    const st = stg.k, need = stg.need || [];
    if (!need.length) return;
    const first = TICKET.filter(s => s.st === st && !s.head).map(s => pos[s.no]).filter(v => v != null).sort((a, b) => a - b)[0];
    if (first == null) return;
    const lack = need.filter(no => (pos[no] == null || pos[no] > first) && !covered.has(no));
    if (!lack.length) return;
    const s0 = TICKET.filter(s => s.st === st && pos[s.no] === first)[0];
    add({
      kind: 'cross', at: first, stdNo: s0 ? s0.no : '', std: s0 ? s0.t : '',
      title: '阶段越界：' + (TICKET_META.stages.find(x => x.k === st) || {}).n,
      why: '进入该阶段前，上一阶段的必要操作「' + lack.map(no => '第' + no + '项 ' + TSTEP[no].t).join('；') + '」尚未完成，属于阶段越界，不是普通行号不一致。',
      whyBiz: (TICKET_META.stages.find(x => x.k === st) || {}).watch,
      cites: cite(['dz454', 'dz451'], ['操作顺序', '隔离开关', '断路器']),
      fix: '先补齐上一阶段的必要操作，再写本阶段步骤。', deduct: cfg.cross, cover: lack.filter(no => pos[no] == null)
    });
  });

  /* 3. 顺序错误：只在两步都写了的情况下判，按事件计一次，允许换序的不判 */
  const seen = {};
  const pair = (a, b) => {                       // 标准要求 a 在 b 之前
    if (pos[a] == null || pos[b] == null) return;
    if (pos[a] < pos[b]) return;
    const A = TSTEP[a], B = TSTEP[b];
    if (tkSwappable(A, B)) return;
    const key = a + '>' + b; if (seen[key]) return; seen[key] = 1;
    if (errs.some(e => (e.kind === 'cross' || e.kind === 'danger') && e.stdNo === b)) return;
    add({
      kind: 'order', at: pos[b], stdNo: b, std: B.t,
      title: '第' + b + '项写在了第' + a + '项之前',
      why: '标准票要求「' + A.t + '」在「' + B.t + '」之前。' + (B.ord ? '顺序要求：' + B.ord + '。' : ''),
      whyBiz: B.why || A.why || '', cites: cite((B.ref || []).concat(A.ref || []), [B.v, A.v].concat(B.k, A.k)),
      fix: '把第' + b + '项移到第' + a + '项之后。', deduct: cfg.order
    });
  };
  TICKET_ORD.seq.forEach(g => { for (let i = 0; i < g.length - 1; i++) pair(g[i], g[i + 1]); });
  Object.keys(TICKET_ORD.after).forEach(b => TICKET_ORD.after[b].forEach(a => pair(a, b)));
  Object.keys(TICKET_ORD.before).forEach(a => TICKET_ORD.before[a].forEach(b => pair(a, b)));
  if (pos[TICKET_ORD.last] != null) {
    const lastAt = pos[TICKET_ORD.last];
    const after = M.list.filter(x => x.s && x.i > lastAt);
    if (after.length) add({
      kind: 'order', at: lastAt, stdNo: TICKET_ORD.last, std: TSTEP[TICKET_ORD.last].t,
      title: '「' + TSTEP[TICKET_ORD.last].t + '」不是最后一项', why: '该项为全票最后一步，其后不应再有操作项目。', whyBiz: TSTEP[TICKET_ORD.last].why,
      cites: cite(['dz6119'], ['汇报', '巡维中心']), fix: '把该项移到全票最后。', deduct: cfg.order
    });
  }
  Object.keys(TICKET_ORD.tight).forEach(x => {
    const a = TICKET_ORD.tight[x];
    if (pos[x] == null || pos[a] == null || pos[x] < pos[a]) return;
    const between = M.list.filter(y => y.s && y.i > pos[a] && y.i < pos[x] && !TICKET_ORD.child[y.s.no]);
    if (!between.length) return;
    add({
      kind: 'order', at: pos[x], stdNo: x, std: TSTEP[x].t, title: '第' + x + '项未紧贴第' + a + '项之后',
      why: '顺序要求：' + TSTEP[x].ord + '。中间插入了「' + between.map(y => y.row.t).slice(0, 2).join('」「') + '」。',
      whyBiz: TSTEP[x].why, cites: cite(TSTEP[x].ref, TSTEP[x].k), fix: '把第' + x + '项紧接在第' + a + '项之后。', deduct: cfg.order
    });
  });

  /* 4. 漏项：优先按该步骤的漏写处理执行，不再因缺失制造后续顺序错误 */
  const coveredAll = new Set(); errs.forEach(e => (e.cover || []).forEach(no => coveredAll.add(no)));
  TICKET.forEach(s => {
    if (pos[s.no] != null || coveredAll.has(s.no)) return;
    const merged = M.list.find(x => x.s && x.s.no !== s.no && /[、和及]/.test(x.row.t) && s.k.every(k => norm(x.row.t).includes(norm(k))) && (!s.v || norm(x.row.t).includes(s.v)));
    if (merged) {                                  // 两项写进一行：按并项计文字错误，不再重复计漏项
      add({
        kind: 'text', at: merged.i, stdNo: s.no, std: s.t, title: '第' + merged.s.no + '项与第' + s.no + '项并项填写',
        why: '一个操作项目栏内只应有一个动词、一个操作对象，「' + merged.row.t + '」把两项合在了一行。',
        whyBiz: s.why, cites: cite(['dz618'], ['并项', '一个动词']), fix: merged.s.t + '　/　' + s.t, deduct: cfg.text
      });
      return;
    }
    const isFatal = s.miss === '整票不合格';
    if (isFatal && !fatal.includes('漏写整票不合格项')) fatal.push('漏写整票不合格项');
    add({
      kind: 'miss', at: null, stdNo: s.no, std: s.t, title: '漏写第' + s.no + '项' + (isFatal ? '（漏写即整票不合格）' : ''),
      why: '标准票第' + s.no + '项未在答卷中出现。该项漏写处理为「' + s.miss + '」。',
      whyBiz: s.why, cites: cite(s.ref, s.k.concat([s.v])), fix: s.t, deduct: cfg.miss, fatalHit: isFatal
    });
  });

  /* 5. 文字与层级 */
  M.list.forEach(x => {
    if (!x.s) {
      const lp = tkGearHit(x.row.t);
      if (lp) {
        add({
          kind: 'extra', at: x.i, stdNo: '—', std: '—', title: '标准票未列的压板 / 空开操作：' + lp.c + ' ' + lp.n,
          why: '这一项在标准票中没有，但「' + lp.c + ' ' + lp.n + '」是本任务相关屏柜（' + lp.p + '）上的设备，是否需要操作请由考评员核对。',
          whyBiz: '', cites: cite(['dz618'], ['压板', '连接片']), fix: '请考评员核对后确定是否保留。', deduct: 0, review: true
        });
        return;
      }
      add({
        kind: 'extra', at: x.i, stdNo: '—', std: '—', title: '无关步骤 / 未能匹配到标准步骤',
        why: '这一项在标准票中找不到对应步骤，可能是多写、写法偏离过大或设备编号写错。',
        whyBiz: '', cites: cite(['dz612'], ['双重名称', '术语']), fix: '核对设备双重名称与操作术语后重写，或删除该项。', deduct: cfg.extra, review: true
      });
      return;
    }
    const t = tkText(x.row, x.s);
    if (t) add({
      kind: 'text', at: x.i, stdNo: x.s.no, std: x.s.t, title: '第' + x.s.no + '项文字不符合「' + x.s.txt + '」要求',
      why: t.tip + '。该步骤的文字要求为「' + x.s.txt + '」。', whyBiz: x.s.why,
      cites: cite((x.s.ref || []).concat(['dz612', 'dz618']), ['双重名称', '术语', '并项']), fix: x.s.t, deduct: cfg.text
    });
    const p = TICKET_ORD.child[x.s.no];
    if (p && pos[p] != null && pos[p] > x.i) add({
      kind: 'level', at: x.i, stdNo: x.s.no, std: x.s.t, title: '第' + x.s.no + '项写在了父项第' + p + '项之前',
      why: '该项必须作为第' + p + '项的子步骤。' + (x.s.ord || ''), whyBiz: x.s.why,
      cites: cite(['dz6120'], ['主项', '子项', '汇控柜']), fix: '先写父项「' + TSTEP[p].t + '」，再把该项作为其子步骤。', deduct: cfg.text
    });
  });

  /* 6. 汇总 */
  const deduct = errs.reduce((s, e) => s + (e.deduct || 0), 0);
  const raw = Math.max(0, cfg.base - deduct);
  const score = fatal.length ? 0 : raw;
  const ok = !fatal.length && raw >= cfg.pass;
  const stages = TICKET_META.stages.map(st => {
    const all = TICKET.filter(s => s.st === st.k);
    const done = all.filter(s => pos[s.no] != null).length;
    return { k: st.k, n: st.n, done, n2: all.length, pct: Math.round(done / all.length * 100) };
  });
  const byKind = {}; errs.forEach(e => { byKind[e.kind] = (byKind[e.kind] || 0) + 1; });
  return { errs, fatal, score, raw, deduct, pass: ok, stages, byKind, match: M.list, pos, cfg, rows };
}

/* 答卷里出现的压板 / 空开编号是否属于本任务屏柜附表（标准票未列时交考评员核对，不扣分） */
function tkGearHit(text) {
  const n = norm(text);
  for (const g of TICKET_META.gear) for (const r of g.rows) {
    if (!/LP|K/.test(r[0]) || r[0].length < 3) continue;
    if (n.includes(norm(r[0])) && /压板|空气开关|空开/.test(n)) return { c: r[0], n: r[1], p: g.p };
  }
  return null;
}

/* ---------- 自动填票（讲师演示台用：一键生成七种典型答卷） ---------- */
function tkAuto(kind) {
  const base = TICKET.map(s => ({ no: s.no, t: s.t, parent: s.parent }));
  const a = base.slice();
  const at = no => a.findIndex(r => r.no === no);
  const sw = (x, y) => { const i = at(x), j = at(y); const t = a[i]; a[i] = a[j]; a[j] = t; };
  const moveBefore = (nos, target) => { const rows = nos.map(no => a.splice(at(no), 1)[0]); a.splice(at(target), 0, ...rows); };
  if (kind === 'ok') return base;
  if (kind === 'miss') return base.filter(r => !['12', '17.3', '25', '43'].includes(r.no));
  if (kind === 'order') { moveBefore(['33', '34', '35'], '30'); return a; }          // 一般顺序错误：先拉母线侧11032、后拉主变侧11034
  if (kind === 'swap') { sw('4', '5'); sw('17.1', '17.2'); sw('56.1', '56.2'); return a; }   // 允许换序：应当不判错
  if (kind === 'danger') return base.filter(r => r.no !== '40');                      // 危险操作：未检查带电显示装置无电压即合地刀
  if (kind === 'load') { moveBefore(['15', '16'], '10'); return a; }                 // 危险操作：未合532转负荷就断开503
  if (kind === 'text') {                                                              // 文字不规范：并项、缺双重名称
    a[at('50.1')] = { no: '50.1', t: '断开QS、QE刀闸电源2QL、110340地刀电机电源5ZK空气开关', parent: '50' };
    a[at('20')] = { no: '20', t: '断开1103开关', parent: null };
    return a.filter(r => r.no !== '50.2');
  }
  return base;
}
