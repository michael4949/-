/* ══════════════════════════════════════════════════════════════════
   官网。四页：首页 / 版本与价格 / 选拔赛 / 常见问题。

   页面数量是刻意压到这么少的。凡是打开之后只有一堆形容词、
   点不到任何真东西的页面，一律不做 —— 那种页面对学员没有价值，
   只会稀释首页想说的那件事。产品能力全部在训练场里，
   官网负责把人送进去。
   ══════════════════════════════════════════════════════════════════ */

const CORE4 = [
  { ic: '▶', h: '行情回放', p: '任意日期精确重现，自动 / 手动步进，可变速，多周期多品种同步联动。',
    li: ['任选品种与时间段', '倍速回放与逐根步进', '多周期同屏联动', '数据本地缓存，翻页无等待'] },
  { ic: '▤', h: '模拟交易', p: '完整的下单体系：市价、限价、停损触发、止损止盈与跟踪止损。',
    li: ['多模拟账户独立记账', '条件单与止损止盈', '手续费、滑点、合约乘数', '保证金与强制平仓'] },
  { ic: '◫', h: '交易分析', p: '权益曲线、品种 / 多空 / 时段盈亏归因、账户评级，一眼看清短板。',
    li: ['详尽交易统计', '分品种、分方向、分时段归因', 'MAE / MFE 与 R 倍数', '交易记录导入导出'] },
  { ic: '◎', h: '全景数据', p: '横跨二十年的真实历史行情，含互联网泡沫与金融危机两轮完整周期。',
    li: ['1999 年至今日线数据', '指数、个股、外汇多类资产', '真实跳空与停牌处理', '不复权价回放，杜绝未来函数'] },
];

const FEAT3 = [
  { tag: '独创 · 去记忆偏差', h: '双盲测试', ds: 'SPX', off: 900, blind: true,
    cap: '？？？ · 未知品种', cap2: '坐标轴已隐去',
    p: '随机品种、随机时点、隐藏全部标识。彻底去掉「我记得后面怎么走」的记忆影响，客观检验真实判断力。',
    li: ['品种与日期完全隐藏', '价格保形变换，逐根涨跌幅不变', '时间轴同步平移，坐标轴不泄露年代', '结果由真实后续行情判定'] },
  { tag: '独创 · 多周期同步', h: '多周期同步步进', ds: 'IXIC', off: 2400, split: 5,
    cap: 'IXIC 纳斯达克 · 日线', cap2: '周线同屏联动',
    p: '大小周期同屏联动，一键前进后退。大周期趋势与小周期入场时机的关系一目了然。',
    li: ['大小周期同步步进', '自定义步进粒度', '前进 / 后退 / 自动播放', '快捷键操作'] },
  { tag: '独创 · 时光机', h: '任一时点的数据快照', ds: 'GOOG', off: 1200, cursor: true,
    cap: 'GOOG 谷歌 · 日线', cap2: '游标之后无数据',
    p: '回到历史上任意一天，看到的只有那一天之前的信息。数据在架构上就不可能穿越。',
    li: ['游标之后的数据不下发', '越界读取直接抛异常', '决策与成交严格错开一根', '整场会话可逐字节复现'] },
];

const AI6 = [
  { k: '01 · EVALUATE', h: '能力评估', p: '把「运气」和「技能」分开：用条件随机化检验算出你这一轮的成绩有多少能用运气解释。' },
  { k: '02 · ATTRIBUTE', h: '四维决策归因', p: '入场时机、方向、出场时机、仓位——逐维度告诉你哪一块在拖后腿。' },
  { k: '03 · SIMILAR', h: '相似行情检索', p: '把每段走势编码成形态向量，找出历史上长得像的片段，并给出它们之后的走势分布。' },
  { k: '04 · ASK', h: '智能问数', p: '一句话查历史行情。机器把你的话翻译成查询条件并展示出来，取数与计算全程确定性执行。' },
  { k: '05 · BEHAVIOR', h: '行为诊断', p: '处置效应、报复性交易、止损纪律、保本平仓——全部从交易记录直接算出，不含模型推测。' },
  { k: '06 · POWER', h: '样本量测算', p: '告诉你还需要多少笔交易，才能在统计上判定你的优势是真的。' },
];



const PRICES = [
  { h: '免费版', desc: '建立交易认知', cur: '¥', n: '0', per: '/ 永久', pop: false,
    li: ['行情回放与步进', '<em>1 个</em>模拟账户', '基础交易统计', '近 <em>1 年</em>历史数据'],
    no: ['双盲测试', '能力评估与四维归因', '智能助手'], cta: '免费下载', href: '#app/replay' },
  { h: '专业版', desc: '完整训练闭环 + 全部 AI 能力', cur: '¥', n: '698', per: '/ 买断', pop: true,
    li: ['全部回放与模拟交易功能', '<em>不限</em>模拟账户', '双盲测试与自适应出题', '<em>能力评估</em>与四维决策归因',
         '相似行情检索', '智能助手（问数 · 文件 · 语音）', '赠 1 年数据更新服务'],
    no: [], cta: '立即购买', href: '#pricing' },
  { h: '旗舰版', desc: '面向机构与团队', cur: '¥', n: '按需', per: '/ 年', pop: false,
    li: ['专业版全部功能', '成绩服务端权威判定', '操作日志审计与复核', '团队排行榜与横向对比',
         '选拔赛与人才评估后台', '私有化部署与数据对接'],
    no: [], cta: '联系我们', href: '#contest' },
];

const FAQS = [
  ['免费版和专业版的差别在哪？',
   '免费版保留完整的回放与模拟交易内核，差别主要在两处：一是可回放的历史数据范围，二是 AI 能力（能力评估、四维归因、相似行情、智能助手）仅在专业版开放。'],
  ['买断之后还要交年费吗？',
   '不需要。一次购买长期使用，软件功能不会因为不续费而失效。购买时赠送一年的数据更新服务；一年后如果希望继续获取新增行情，可以单独续订数据服务，已下载的历史数据不受影响。'],
  ['为什么回放用的是不复权价？',
   '复权因子是用未来的除权除息事件倒推出来的。如果把前复权价直接喂给回放，你在 2015 年的界面上看到的价格就已经隐含了 2016 年分红的信息——这是一个不报错、不崩溃、只会让训练成绩虚高的未来函数。所以回放一律使用当时盘面真实所见的不复权价，复权因子单独保存，只在做跨期收益率统计时使用。'],
  ['双盲测试是怎么做到「盲」的？',
   '三件事同时做：隐藏品种名称、对价格做乘法保形变换（价格水平变了，但逐根涨跌幅严格不变）、把时间轴整体平移整数天。只遮住标题是不够的——图表横轴上的真实年月同样会暴露是哪一段行情。'],
  ['能力评估的 p 值是什么意思？',
   'p 值回答的是：假设你其实没有任何优势，出现这么好成绩的概率有多大。它不是「你有能力的概率」。p = 0.03 意味着一个毫无判断力、但交易习惯和你完全一样的对照组，每 33 次里也能撞出一次这样的成绩。'],
  ['为什么样本量不够时不给结论？',
   '因为给不出。交易收益的信噪比很低，十几笔交易的成绩几乎完全由运气决定。系统会告诉你按当前的信噪比还需要多少笔样本才能判定，而不是先给一个让人高兴的评价。'],
  ['智能助手能推荐股票吗？',
   '不能，也不会。助手只做两件事：把你的问题翻译成查询条件，以及解释已经算出来的统计结果。它拿不到行情原始数据，也不输出对未来价格的任何判断。'],
  ['模拟成交是怎么假设的？',
   '一律取对用户最不利的假设。下单最早在下一根开盘成交；停损触发后按市价成交并计滑点；同一根 K 线内止损与止盈都可能触发时，判定为止损先成交。任何乐观假设都会系统性高估训练成绩。'],
];

/* ── 渲染 ──────────────────────────────────────────────────────── */
function renderSite(page) {
  const el = $('#site');
  const fn = SITE_PAGES[page] || SITE_PAGES.home;
  // innerHTML 会把旧的图表容器整个换掉，先释放实例，否则它们会继续画在孤儿节点上
  disposeChartsIn(el);
  el.innerHTML = fn() + siteFooter();
  if (page === 'home') requestAnimationFrame(() => { drawHeroChart(); drawFeatCharts(); runAiDemo(); });
  if (page === 'contest') requestAnimationFrame(setupContest);
}

/* ── 首页的 AI 演示：不是配图，是当场算出来的 ──────────────────
   做法：让「趋势跟随」这条真实策略在一段真实行情上跑完，
   把它的成交记录喂进与产品内部完全相同的评估引擎，
   把出来的判语、p 值、四维归因原样显示。
   页面上的每个数字都是这一次加载现算的，刷新会换一段行情、换一组数。 */
function runAiDemo() {
  const host = $('#aiDemo'); if (!host) return;
  setTimeout(() => {
    try {
      // 随机段落有时交易数不够（横盘段趋势策略几乎不动手），
      // 换一段再试，别让首页最重要的一块时有时无。
      const syms = Object.keys(DATASETS);
      const bot = ROSTER.find(b => b.id === 'bot-trend');
      const seed = (Math.random() * 1e9) | 0;
      let sym, seg, trades = [];
      for (let attempt = 0; attempt < 8; attempt++) {
        sym = syms[Math.floor(Math.random() * syms.length)];
        const bars = barsOf(sym);
        const len = Math.min(700, bars.length - 10);
        const off = Math.floor(Math.random() * (bars.length - len));
        seg = bars.slice(off, off + len);
        trades = runBot(bot, seg, INSTRUMENTS[sym], { qty: 20, warmup: 140, seed });
        if (trades.length >= MIN_TRADES_FOR_VERDICT) break;
      }
      if (trades.length < MIN_TRADES_FOR_VERDICT) {
        console.warn('AI 演示：连续 8 段都没凑够样本', trades.length); host.remove(); return;
      }

      const t0 = performance.now();
      const r = analyzeSession({ bars: seg, trades, instrument: INSTRUMENTS[sym], seed, iterations: 800 });
      const ms = Math.round(performance.now() - t0);
      const h = r.headline;
      const worst = [...r.attribution].filter(a => a.available)
        .sort((a, b) => a.edgeR - b.edgeR)[0];
      const lo = Math.min(h.nullP05R, h.observedR), hi = Math.max(h.nullP95R, h.observedR);
      const P = v => ((v - lo) / ((hi - lo) || 1) * 100).toFixed(1);

      host.innerHTML = `
        <div class="aidemo-h">
          <span class="live">现场计算</span>
          一条<b>趋势跟随</b>策略刚在 <b>${DATASETS[sym].display}</b>
          ${ymd(seg[140].t)} → ${ymd(seg[seg.length - 1].t)} 上跑了 <b>${trades.length}</b> 笔。
          <b>换成你的成绩，AI 会这么说：</b>
        </div>
        <div class="aidemo-v">${md(r.verdict.text)}</div>
        <div class="aidemo-bar">
          <i class="band" style="left:${P(h.nullP05R)}%;width:${(P(h.nullP95R) - P(h.nullP05R)).toFixed(1)}%"></i>
          <i class="med" style="left:${P(h.nullMedianR)}%"></i>
          <i class="you" style="left:${P(h.observedR)}%"></i>
        </div>
        <div class="aidemo-lbl">
          <span>随机对照组 5% 分位 ${sg(h.nullP05R)}R</span>
          <span>中位 ${sg(h.nullMedianR)}R</span>
          <span>95% 分位 ${sg(h.nullP95R)}R</span>
        </div>
        <div class="aidemo-g">
          <div><span>这一轮成绩</span><b class="num">${sg(h.observedR)} R</b></div>
          <div><span>百分位</span><b class="num">${(h.percentile * 100).toFixed(0)}%</b></div>
          <div><span>p 值</span><b class="num">${h.pValue.toFixed(3)}</b></div>
          <div><span>最拖后腿的维度</span><b>${worst ? worst.label : '—'}</b></div>
        </div>
        <div class="aidemo-f">
          800 次蒙特卡洛 × 5 个零模型，在你的浏览器里跑了 ${ms} ms。
          刷新这一页会换一段行情、换一组数字 —— 因为它是真算的。
        </div>`;
    } catch (e) {
      // 演示块失败不能拖垮首页，但要留下线索，别让它静悄悄消失
      console.warn('AI 演示未能生成：', e && e.message || e);
      host.remove();
    }
  }, 260);
}

/* ── 选拔赛榜单：名字是化名，成绩是真跑出来的 ─────────────────── */
function setupContest() {
  const sel = $('#ctDs'); if (!sel) return;
  sel.innerHTML = Object.entries(DATASETS)
    .map(([k, d]) => `<option value="${k}">${d.display}</option>`).join('');
  // 默认赛题跟随用户最近练过的品种，否则「你的成绩」永远进不了这张榜
  sel.value = (S.ds && S.ds in DATASETS) ? S.ds : Object.keys(DATASETS)[0];
  $('#ctGo').onclick = () => runContestBoard(true);
  sel.onchange = () => runContestBoard(true);
  runContestBoard(false);
}

function runContestBoard(reroll) {
  const sym = $('#ctDs').value;
  const bars = barsOf(sym);
  if (reroll || S.ctSeg == null || S.ctSym !== sym) {
    const len = Math.min(900, bars.length - 10);
    S.ctSeg = Math.floor(Math.random() * (bars.length - len));
    S.ctLen = len;
    S.ctSym = sym;
    S.ctSeed = (Math.random() * 1e9) | 0;
  }
  const seg = bars.slice(S.ctSeg, S.ctSeg + S.ctLen);
  $('#ctSub').textContent = `${DATASETS[sym].display} · ${ymd(seg[0].t)} → ${ymd(seg[seg.length - 1].t)} · ${seg.length} 根`;
  const board = $('#ctBoard');
  board.innerHTML = `<div class="empty" style="padding:30px"><span class="spin"></span> 正在让 6 位陪练把这段行情跑完…</div>`;

  setTimeout(() => {
    const rows = runContest(seg, INSTRUMENTS[sym], { qty: 20, warmup: 140, seed: S.ctSeed });
    // 把用户在这个品种上的历史成绩并进榜单
    const mine = (typeof ACCT !== 'undefined' ? acctCurrent()?.rounds || [] : [])
      .filter(r => r.symbol === sym)
      .map((r, i) => ({ id: 'me' + i, name: `你 · 第 ${i + 1} 轮`, tag: acctCurrent().name, kind: 'me',
        trades: r.trades, totalR: r.totalR, net: r.net, winRate: r.winRate }));
    const all = [...rows, ...mine].sort((a, b) => b.totalR - a.totalR);
    const max = Math.max(1, ...all.map(x => Math.abs(x.totalR)));

    board.innerHTML = `<div class="lb">${all.map((x, i) => {
      const w = (Math.abs(x.totalR) / max * 46).toFixed(1);
      const col = x.kind === 'me' ? 'var(--brand)' : x.totalR >= 0 ? 'var(--up)' : 'var(--dn)';
      return `<div class="lbrow ${x.kind}">
        <span class="rk">${i + 1}</span>
        <span class="nm"><b>${x.name}</b><i>${x.tag}</i></span>
        <span class="tr"><i style="left:${x.totalR >= 0 ? 50 : 50 - w}%;width:${w}%;background:${col}"></i>
          <u style="left:50%"></u></span>
        <span class="num rv" style="color:${col}">${sg(x.totalR)} R</span>
        <span class="num mut nq">${x.trades} 笔 · 胜率 ${(x.winRate * 100).toFixed(0)}%</span>
      </div>`;
    }).join('')}</div>
    ${mine.length ? '' : `<div class="note info" style="margin-top:14px"><span>◎</span>
      <span>你还没有在 ${DATASETS[sym].display} 上跑过。去
      <a href="#app/replay" style="color:var(--brand);font-weight:600">训练场</a>
      跑一轮，成绩会自动出现在这张榜上。</span></div>`}`;
  }, 30);
}

function heroFacts() {
  const total = Object.values(DATASETS).reduce((a, d) => a + d.count, 0);
  const years = new Set();
  for (const d of Object.values(DATASETS)) {
    years.add(new Date(d.rows[0][0]).getUTCFullYear());
    years.add(new Date(d.rows[d.rows.length - 1][0]).getUTCFullYear());
  }
  const span = Math.max(...years) - Math.min(...years);
  return [
    [`${span}`, '年历史行情跨度', '年'],
    [`${(total / 1000).toFixed(1)}k`, '根真实 K 线', ''],
    [`${Object.keys(DATASETS).length}`, '个可训练品种', ''],
  ];
}

const SITE_PAGES = {
  home: () => `
  <div class="hero"><div class="wrap hero-in">
    <div>
      <span class="eyebrow">交易练习与能力评估</span>
      <h1>交易能力，<em>是可以练出来的</em></h1>
      <p class="lead">回放二十年真实历史行情，在零成本的环境里反复练习。
      每一轮结束，系统用统计方法告诉你：这一次的成绩，有多少能用运气解释，
      以及下一步该练哪一块。</p>
      <div class="cta">
        <a href="#app/replay" class="btn btn-p btn-lg">免费开始复盘</a>
        <a href="#app/drills" class="btn btn-g btn-lg">看看它能做什么</a>
      </div>
      <div class="facts">${heroFacts().map(([b, s, u]) =>
        `<div class="fact"><b>${b}<span style="font-size:13px">${u}</span></b><span>${s}</span></div>`).join('')}</div>
    </div>
    <div>
      <div class="term">
        <div class="term-bar">
          <div class="term-dots"><i></i><i></i><i></i></div>
          <div class="term-t"><b>SPX</b> 标普500 · 日线</div>
          <div class="term-live">回放中</div>
        </div>
        <div class="term-body"><div id="heroChart" style="width:100%;height:270px"></div></div>
        <div class="term-foot">
          <span class="chip on">K线</span><span class="chip">MA</span><span class="chip">成交量</span>
          <span class="chip" style="margin-left:auto">1999–2018 真实行情</span>
        </div>
      </div>
    </div>
  </div></div>

  <div class="strip"><div class="wrap strip-in">
    <span>覆盖 <b>指数 · 个股 · 外汇</b></span>
    <span>数据自 <b>1999 年</b>起</span>
    <span><b>红涨绿跌</b> · A股习惯</span>
    <span>回放使用<b>不复权价</b></span>
  </div></div>

  <div class="aiband"><div class="sec wrap">
    <div class="sechead"><span class="eyebrow" style="color:var(--teal)">AI 赋能 · 这是最大的不同</span>
      <h2>回放工具满大街，会告诉你「这是运气还是本事」的只有这里</h2>
      <p>别家给你一条盈利曲线，剩下的自己悟。这里把它翻译成一句能验证的话，
      而且每一个字都能追到一个算出来的数字。</p></div>

    <!-- 下面这块不是配图，是页面加载时真的算出来的 -->
    <div class="aidemo" id="aiDemo">
      <div class="aidemo-h"><span class="spin"></span> 正在现场跑一遍给你看…</div>
    </div>

    <div class="grid g3" style="margin-top:26px">${AI6.map(a => `
      <div class="aicard"><div class="k">${a.k}</div><h3>${a.h}</h3><p>${a.p}</p></div>`).join('')}</div>
    <div style="text-align:center;margin-top:28px">
      <a href="#app/replay" class="btn btn-p btn-lg">自己跑一轮试试 →</a>
      <a href="#app/similar" class="btn btn-g btn-lg" style="margin-left:9px">看相似形态检索</a></div>
  </div></div>

  <div class="sec"><div class="wrap">
    <div class="sechead"><span class="eyebrow">核心能力</span>
      <h2>一套完整的复盘训练闭环</h2>
      <p>回放行情、做出决策、复盘归因、针对性纠错——每一环都由真实数据支撑。</p></div>
    <div class="grid g4">${CORE4.map(c => `
      <div class="card"><div class="ic">${c.ic}</div><h3>${c.h}</h3><p>${c.p}</p>
      <ul>${c.li.map(x => `<li>${x}</li>`).join('')}</ul></div>`).join('')}</div>
  </div></div>

  <div class="sec tight"><div class="wrap">
    <div class="sechead"><span class="eyebrow">特色功能</span><h2>三个别处没有的设计</h2></div>
    ${FEAT3.map((f, i) => `
      <div class="feat">
        <div><span class="tag">${f.tag}</span><h3>${f.h}</h3><p>${f.p}</p>
          <ul>${f.li.map(x => `<li>${x}</li>`).join('')}</ul></div>
        <div class="feat-media"><div class="box">
          <div class="boxcap"><span>${f.cap}</span>${f.cap2 ? `<span>${f.cap2}</span>` : ''}</div>
          <div id="featChart${i}" style="width:100%;height:${f.split ? 150 : 218}px"></div>
          ${f.split ? `<div id="featChart${i}b" style="width:100%;height:96px"></div>` : ''}
        </div></div>
      </div>`).join('')}
  </div></div>

  <div class="sec"><div class="wrap">
    <div class="sechead"><span class="eyebrow">版本</span><h2>先免费练起来，需要了再升级</h2></div>
    <div class="prices">${priceCards()}</div>
  </div></div>

  <div class="sec tight"><div class="wrap">${ctaBand()}</div></div>`,

  pricing: () => `
  <div class="sec"><div class="wrap">
    <div class="sechead"><span class="eyebrow">版本与价格</span><h2>一次购买，长期使用</h2>
      <p>核心的回放与模拟交易功能永久免费。AI 能力与全部历史数据在专业版开放。</p></div>
    <div class="prices">${priceCards()}</div>
    <div class="panel" style="margin-top:30px"><div class="pb">
      <h3 style="font-size:16px;margin-bottom:12px">关于数据服务</h3>
      <div class="grid g3">
        <div><div class="kv"><span>软件授权</span><span>一次买断</span></div>
          <div class="kv"><span>功能更新</span><span>免费</span></div></div>
        <div><div class="kv"><span>数据更新服务</span><span>赠 1 年</span></div>
          <div class="kv"><span>到期后</span><span>可单独续订</span></div></div>
        <div><div class="kv"><span>不续订的影响</span><span>软件正常可用</span></div>
          <div class="kv"><span>已下载数据</span><span>不受影响</span></div></div>
      </div>
    </div></div>
  </div></div>`,

  contest: () => `
  <div class="sec"><div class="wrap">
    <div class="sechead"><span class="eyebrow">选拔赛</span><h2>把训练成绩变成一份可核验的能力档案</h2>
      <p>三个阶段逐级筛选。所有成绩由服务端权威判定，操作日志完整留存、可逐字节复现。</p></div>
    <div class="grid g3">
      <div class="card"><div class="ic">1</div><h3>模拟初赛</h3>
        <p>免费参加。统一题目、统一行情段，双盲出题，杜绝记忆优势。</p>
        <ul><li>统一起点，成绩可横向对比</li><li>按统计显著性而非单期收益排名</li></ul></div>
      <div class="card"><div class="ic">2</div><h3>复赛</h3>
        <p>延长评估周期，累积到足够样本量后再判定优势是否真实存在。</p>
        <ul><li>样本量达标才出结论</li><li>四维能力档案随赛程更新</li></ul></div>
      <div class="card"><div class="ic">3</div><h3>能力档案输出</h3>
        <p>产出一份可核验的能力报告，供机构在人才评估时参考。</p>
        <ul><li>成绩可审计、可申诉</li><li>操作日志完整留存</li></ul></div>
    </div>
    <div class="panel" style="margin-top:30px">
      <div class="ph"><h3>本期赛题 · 实时榜单</h3>
        <span class="sub" id="ctSub">—</span>
        <div style="margin-left:auto;display:flex;gap:8px;align-items:center">
          <select id="ctDs" style="width:auto"></select>
          <button class="btn btn-g btn-sm" id="ctGo">换一期赛题</button></div></div>
      <div class="pb"><div id="ctBoard"><div class="empty" style="padding:30px">
        <span class="spin"></span> 正在开赛…</div></div></div>
    </div>

    <div class="note info" style="margin-top:16px;max-width:820px;margin-inline:auto"><span>ℹ</span>
      <span><b>关于榜上的陪练：</b>这是单机 demo，还没有真实对手，所以榜上的名字是<b>化名</b>。
      但每个陪练都是一条真实可执行的策略，和你跑<b>同一段行情、同一套手续费滑点、同一个撮合引擎</b>——
      成绩一个数字都不是编的。你在训练场里跑完一轮，成绩会自动进榜。</span></div>

    <div class="note" style="margin-top:16px;max-width:820px;margin-inline:auto"><span>⚠</span>
      <span><b>关于实盘与资金：</b>本平台只做训练与能力评估，不提供实盘账户、不代客理财、不参与盈利分成。
      涉及实盘资金的选拔与资产管理需要相应金融牌照，由持牌机构自行开展。</span></div>
  </div></div>`,

  faq: () => `
  <div class="sec"><div class="wrap">
    <div class="sechead"><span class="eyebrow">常见问题</span><h2>你可能想知道的</h2></div>
    <div class="faq">${FAQS.map(([q, a]) => `
      <details><summary>${q}</summary><div class="ans">${a}</div></details>`).join('')}</div>
  </div></div>`,
};

function priceCards() {
  return PRICES.map(p => `
    <div class="price ${p.pop ? 'pop' : ''}">
      ${p.pop ? '<div class="badge">最受欢迎</div>' : ''}
      <h3>${p.h}</h3><div class="desc">${p.desc}</div>
      <div class="amt"><span class="cur">${p.cur}</span><span class="n">${p.n}</span><span class="per">${p.per}</span></div>
      <ul>${p.li.map(x => `<li>${x}</li>`).join('')}${p.no.map(x => `<li class="no">${x}</li>`).join('')}</ul>
      <a href="${p.href}" class="btn ${p.pop ? 'btn-p' : 'btn-g'}">${p.cta}</a>
    </div>`).join('');
}

function ctaBand() {
  return `<div class="ctaband">
    <h2>今天就开始第一轮复盘</h2>
    <p>免费版永久可用，注册即可开始。</p>
    <div class="row">
      <a href="#app/replay" class="btn btn-p btn-lg">进入训练场</a>
      <a href="#pricing" class="btn btn-g btn-lg">查看专业版</a>
    </div></div>`;
}

function siteFooter() {
  return `<div class="foot"><div class="wrap">
    <div class="foot-in">
      <div>
        <div class="brand" style="margin-bottom:10px"><span class="mark">◆</span>
          <span>练盘 AlphaGym<small>交易练习与能力评估</small></span></div>
        <p class="mut" style="font-size:13.5px;max-width:320px">
          回放真实历史行情，在零成本环境中反复练习，并用统计方法客观评估交易能力。</p>
      </div>
      <div><h4>训练</h4><ul>
        <li><a href="#app/replay">行情回放</a></li><li><a href="#app/drills">专项训练</a></li>
        <li><a href="#app/blind">双盲测试</a></li></ul></div>
      <div><h4>AI 能力</h4><ul>
        <li><a href="#app/eval">能力评估</a></li><li><a href="#app/similar">相似行情</a></li>
        <li><a href="#app/screen">条件筛选</a></li></ul></div>
      <div><h4>其他</h4><ul>
        <li><a href="#pricing">版本与价格</a></li><li><a href="#contest">选拔赛</a></li>
        <li><a href="#faq">常见问题</a></li></ul></div>
    </div>
    <div class="legal">
      <b>风险提示与免责声明：</b>本产品是交易训练与能力评估工具，不提供投资建议、不推荐任何具体标的、
      不对未来价格作出预测。历史行情表现不代表未来收益。训练成绩与统计评估结果仅反映在特定历史区间上的
      决策质量，不构成对实盘结果的任何承诺。市场有风险，决策请自行判断。<br>
    </div>
  </div></div>`;
}

/* ── 首页图表：真实数据 ─────────────────────────────────────────── */
/** 展示型图表：关掉默认图例与 tooltip。
 *  KLineCharts 默认会在左上角常驻一行 OHLC + 均线数值，
 *  在营销页里那行字直接压在 K 线上，像没做完。 */
const SHOWCASE_STYLE = {
  candle: { tooltip: { showRule: 'none' } },
  indicator: { tooltip: { showRule: 'none' } },
};

function drawHeroChart() {
  if (!$('#heroChart')) return;
  const bars = barsOf('SPX');
  const c = getChart('heroChart', { ma: true });
  c.applyNewData(bars.slice(2200, 2560).map(toK));
  c.setPriceVolumePrecision(2, 0);
  c.setStyles(SHOWCASE_STYLE);
}
/** 双盲展示：横轴不能出现任何年代信息，否则这张图正好在打自己文案的脸 */
const BLIND_STYLE = {
  ...SHOWCASE_STYLE,
  xAxis: { tickText: { show: false }, tickLine: { show: false } },
};
/** 副图（周线）：省掉重复的横轴与各种价签，只留形态 */
const SUB_STYLE = {
  ...SHOWCASE_STYLE,
  xAxis: { tickText: { show: false }, tickLine: { show: false } },
  candle: {
    ...SHOWCASE_STYLE.candle,
    priceMark: { high: { show: false }, low: { show: false }, last: { text: { show: false } } },
  },
};

function drawFeatCharts() {
  FEAT3.forEach((f, i) => {
    const id = `featChart${i}`;
    if (!$('#' + id)) return;
    const bars = barsOf(f.ds);
    // 多周期那张要两屏覆盖**同一段**时间，所以取的根数必须能被周期整除，
    // 且要把主图缩到全段可见 —— 否则主图只显示最后几十根，两张图对不上，
    // 「同屏联动」这句话就成了假的。
    const n = f.split ? 90 : 170;
    const seg = bars.slice(f.off, f.off + n);
    const c = getChart(id, { ma: !f.split });

    if (f.blind) {
      // 与真实双盲一致：价格保形缩放（逐根涨跌幅不变）+ 整段时间平移，
      // 再把横轴刻度整个关掉 —— 这才叫「坐标轴不泄露年代」。
      c.applyNewData(seg.map(b => toK({
        t: b.t - 1500 * 86400000,
        o: b.o * 0.42, h: b.h * 0.42, l: b.l * 0.42, c: b.c * 0.42, v: b.v,
      })));
      c.setStyles(BLIND_STYLE);
    } else {
      c.applyNewData(seg.map(toK));
      c.setStyles(f.split ? SUB_STYLE : SHOWCASE_STYLE);
    }
    c.setPriceVolumePrecision(2, 0);

    // 「多周期同步」必须真的同屏出现两个周期，否则图片没有在演示这个功能
    if (f.split) {
      const wk = resample(seg, f.split).bars;
      const px = ($('#' + id).clientWidth || 460) - 62;   // 减去右侧价格轴
      const fit = (ch, len) => {
        ch.setOffsetRightDistance(0);
        ch.setBarSpace(Math.max(2, px / len));
        ch.scrollToRealTime();      // 改了 barSpace 之后要重新贴回右端，否则整段偏在左边
      };
      fit(c, seg.length);
      const w = getChart(id + 'b', { ma: false });
      if (w) {
        w.applyNewData(wk.map(toK));
        w.setPriceVolumePrecision(2, 0);
        w.setStyles(SUB_STYLE);
        fit(w, wk.length);
      }
    }
    // 「时光机」画一条游标：右侧留白 = 那一天之后的数据根本没下发
    if (f.cursor) {
      const cut = Math.round(seg.length * 0.68);
      c.applyNewData(seg.slice(0, cut).map(toK));
      // 竖线才是「游标」；横线会被读成价位线，说的不是一回事
      c.createOverlay({
        name: 'verticalStraightLine', lock: true,
        points: [{ timestamp: seg[cut - 1].t, value: seg[cut - 1].c }],
        styles: { line: { color: '#f59e0b', style: 'dashed', size: 1.5 } },
      });
      // 右侧留出空位，视觉上就是「后面是空的」
      c.setOffsetRightDistance(120);
    }
  });
}
