/* ══════════════════════════════════════════════════════════════════
   交易课堂

   写这一页的时候定了一条规矩：**每一课都必须能落到一个可以点的东西上**，
   要么是一段真实行情的图，要么是一个立刻能去练的训练项。
   只讲道理不给出口的课，学员看完就忘，等于没写。

   所以每课的结构固定为三块：
     · 一句要点（不超过两行，能记住的才有用）
     · 一张**真实历史行情**的图，配一句「这张图上发生了什么」
     · 一个出口：去练对应的那一项，或者去看它在统计上意味着什么
   ══════════════════════════════════════════════════════════════════ */

const LESSONS = [
  {
    id: 'l1', chapter: '一、先认清对手',
    title: '你的对手不是市场，是运气',
    point: '十几笔交易的成绩几乎完全由运气决定。在样本够之前，盈亏说明不了任何事。',
    body: [
      '一个胜率 50%、盈亏比 1:1 的人，连续赚 5 笔的概率是 3%。一百个这样的人里，有三个会连赚五笔——他们中的某一个会开始写公众号。',
      '这就是为什么这个产品在样本不足时<b>拒绝给结论</b>：不是保守，是给不出。',
    ],
    demo: { kind: 'random', label: '同一个无优势策略，随机跑 6 次的权益曲线' },
    caption: '六条曲线来自同一条毫无优势的规则，只是随机种子不同。挑出最上面那条，就能讲一个「稳定盈利」的故事。',
    cta: { text: '看看能力评估怎么把运气剥掉 →', href: '#app/eval' },
  },
  {
    id: 'l2', chapter: '一、先认清对手',
    title: '为什么要用真实行情，不用模拟数据',
    point: '真实行情有跳空、有波动率聚集、有肥尾。随机数据练出来的手感，到真市场里不成立。',
    body: [
      '随机游走生成的 K 线，涨跌幅是正态的、独立的。真实市场不是：暴跌之后往往跟着暴跌（波动率聚集），极端行情出现的频率远高于正态分布的预测（肥尾）。',
      '在正态世界里练出来的止损距离，到真实市场里会被反复扫掉。',
    ],
    demo: { kind: 'fat', label: '真实日涨跌幅分布 vs 正态分布' },
    caption: '柱子是真实历史的日涨跌幅分布，曲线是同均值同方差的正态。两端明显更厚——那些「不可能发生」的日子，其实经常发生。',
    cta: { text: '去看数据是怎么来的 →', href: '#app/screen' },
  },
  {
    id: 'l3', chapter: '二、把决策拆开',
    title: '一笔交易其实是四个独立决策',
    point: '入场时机、方向、出场时机、仓位。四件事的能力互相独立，必须分开练、分开评。',
    body: [
      '很多人方向判断不差，但拿不住，赢的时候赚一点就跑，输的时候扛到止损——这是<b>出场时机</b>的问题，跟看不看得准方向没关系。',
      '也有人四个维度都平庸，但因为重仓押对了两次，账户曲线很漂亮。这种成绩在换一段行情后不会重现。',
    ],
    demo: { kind: 'chart', sym: 'SPX', off: 1400, len: 160, label: '同一段行情，进出场点差几根，结果差很多' },
    caption: '同一段行情，方向都判对了。差别只在什么时候进、什么时候出。',
    cta: { text: '去做四维专项训练 →', href: '#app/drills' },
  },
  {
    id: 'l4', chapter: '二、把决策拆开',
    title: '止损放多远，是个可以算的问题',
    point: '止损太近会被噪声扫掉，太远则单笔风险失控。用 ATR 把它标准化。',
    body: [
      '固定百分比止损的问题是：同样 3%，在低波动品种上很宽，在高波动品种上很窄。用 ATR（真实波幅均值）的倍数来定，才能在不同品种、不同时期之间可比。',
      '判断自己设得合不合理，看 <b>MAE 散点</b>：如果很多赢单曾经浮亏超过 2R，说明止损放得太远。',
    ],
    demo: { kind: 'chart', sym: 'IXIC', off: 900, len: 140, label: '波动率不同的两段行情' },
    caption: '同一个品种的两段行情，波动幅度差好几倍。固定百分比的止损在这两段里意义完全不同。',
    cta: { text: '去看自己的 MAE / MFE 散点 →', href: '#app/analysis' },
  },
  {
    id: 'l5', chapter: '三、别骗自己',
    title: '记忆偏差：你「记得」的走势不是真的',
    point: '看过的历史行情，大脑会自动补上「当时应该看得出来」的感觉。这让复盘失去意义。',
    body: [
      '这就是双盲测试存在的理由：遮住品种、遮住日期、把价格做保形变换、把时间轴整体平移。你面对的是一段真实行情，但认不出它是哪一段。',
      '只遮标题不够——横轴上的年月同样会唤起记忆。',
    ],
    demo: { kind: 'blind', sym: 'SPX', off: 2100, len: 130, label: '同一段行情，遮码前后' },
    caption: '上面这张图你认不出是哪一年、哪个品种，但逐根涨跌幅和真实历史严格一致。',
    cta: { text: '去做一组双盲测试 →', href: '#app/blind' },
  },
  {
    id: 'l6', chapter: '三、别骗自己',
    title: '多重比较：试一百个指标，总有一个「有效」',
    point: '同时检验很多假设时，出现假阳性几乎是必然的。必须做校正。',
    body: [
      '把一百个随机指标拿去回测，按 5% 显著性水平，平均会有 5 个「显著有效」。这不是发现了规律，是统计的必然。',
      '这个产品在四维归因上用 <b>Holm 校正</b>：四个维度同时检验，p 值要相应收紧。校正前后的值都会显示出来，让你看到差别。',
    ],
    demo: { kind: 'multi', label: '20 个纯随机策略的 p 值分布' },
    caption: '二十条毫无优势的随机规则，按未校正的 p 值，总会有一两条落进「显著」区间。',
    cta: { text: '去公式编辑器亲手试一个 →', href: '#app/formula' },
  },
];

function renderClassroom() {
  const host = $('#v-class');
  const id = S.lesson;
  if (!id) { host.innerHTML = classLanding(); bindClassLanding(); return; }

  const idx = LESSONS.findIndex(l => l.id === id);
  const L = LESSONS[idx];
  host.innerHTML = `
  <div class="lesson">
    <div class="lesson-head">
      <button class="btn btn-g btn-sm" id="lsBack">← 全部课程</button>
      <span class="chapter">${L.chapter}</span>
    </div>
    <h2>${L.title}</h2>
    <div class="point"><span>要点</span><p>${L.point}</p></div>
    ${L.body.map(p => `<p class="lbody">${p}</p>`).join('')}

    <div class="panel" style="margin-top:20px">
      <div class="ph"><h3>${L.demo.label}</h3><span class="sub">真实历史数据</span></div>
      <div style="padding:8px"><div id="lsDemo" style="width:100%;height:280px;position:relative"></div></div>
      <div class="pb" style="padding-top:0"><p class="mut" style="font-size:13px;line-height:1.65">${L.caption}</p></div>
    </div>

    <div class="lesson-cta">
      <a class="btn btn-p btn-lg" href="${L.cta.href}">${L.cta.text}</a>
    </div>

    <div class="lesson-nav">
      ${idx > 0 ? `<button class="btn btn-g btn-sm" data-go="${LESSONS[idx - 1].id}">← ${LESSONS[idx - 1].title}</button>` : '<span></span>'}
      ${idx < LESSONS.length - 1 ? `<button class="btn btn-g btn-sm" data-go="${LESSONS[idx + 1].id}">${LESSONS[idx + 1].title} →</button>` : '<span></span>'}
    </div>
  </div>`;

  $('#lsBack').onclick = () => { S.lesson = null; renderClassroom(); };
  $$('#v-class [data-go]').forEach(b => b.onclick = () => { S.lesson = b.dataset.go; renderClassroom(); });
  requestAnimationFrame(() => drawLessonDemo(L));
}

function classLanding() {
  const chapters = [];
  for (const l of LESSONS) {
    let c = chapters.find(x => x.name === l.chapter);
    if (!c) chapters.push(c = { name: l.chapter, items: [] });
    c.items.push(l);
  }
  return `
  <div class="drill-head">
    <h2>交易课堂</h2>
    <p>六节课，讲的都是这个产品为什么这么设计。每一课都配一张<b>真实历史行情</b>的图，
      结尾给一个能立刻去练的出口 —— 只讲道理不给出口的课，看完就忘。</p>
  </div>
  ${chapters.map(c => `
    <div class="chapblock">
      <h3 class="chaptitle">${c.name}</h3>
      <div class="grid g3">
        ${c.items.map(l => `
          <div class="drillcard lesscard" data-lesson="${l.id}">
            <div class="dc-h"><span class="dc-ic">✎</span><div><h3>${l.title}</h3></div></div>
            <p>${l.point}</p>
            <button class="btn btn-g">开始学习</button>
          </div>`).join('')}
      </div>
    </div>`).join('')}`;
}

function bindClassLanding() {
  $$('#v-class [data-lesson]').forEach(el => el.onclick = () => {
    S.lesson = el.dataset.lesson; renderClassroom();
  });
}

/* ── 每节课的配图都用真实数据现算 ─────────────────────────────── */
function drawLessonDemo(L) {
  const host = $('#lsDemo');
  if (!host) return;
  const d = L.demo;

  if (d.kind === 'chart' || d.kind === 'blind') {
    const bars = barsOf(d.sym).slice(d.off, d.off + d.len);
    const c = getChart('lsDemo', { ma: true });
    if (!c) return;
    const rows = d.kind === 'blind'
      ? bars.map(b => ({ t: b.t - 2400 * 86400000, o: b.o * 0.37, h: b.h * 0.37, l: b.l * 0.37, c: b.c * 0.37, v: b.v }))
      : bars;
    c.applyNewData(rows.map(toK));
    c.setPriceVolumePrecision(d.kind === 'blind' ? 2 : dec(d.sym), 0);
    c.setStyles({
      candle: { tooltip: { showRule: 'follow_cross' } },
      indicator: { tooltip: { showRule: 'follow_cross' } },
      ...(d.kind === 'blind' ? { xAxis: { tickText: { show: false }, tickLine: { show: false } } } : {}),
    });
    return;
  }

  // 下面三种是 SVG 小图，数据全部现算
  const w = host.clientWidth || 700, h = 260;
  if (d.kind === 'random') {
    const bars = barsOf('SPX').slice(1200, 1900);
    const curves = [];
    for (let s = 0; s < 6; s++) {
      const t = runBot(ROSTER.find(b => b.id === 'bot-coin'), bars, INSTRUMENTS.SPX, { seed: 1000 + s * 977 });
      const ctx = makeContext(bars, INSTRUMENTS.SPX, { refSize: 20 });
      const ev = evalTrades(ctx, t);
      let cum = 0;
      curves.push(ev.rows.map(r => (cum += r.r)));
    }
    host.innerHTML = svgLines(curves, w, h,
      curves.map((_, i) => i === 0 ? cssv('--brand') : cssv('--faint')), '第 N 笔交易', '累计 R');
    return;
  }

  if (d.kind === 'fat') {
    const bars = barsOf('SPX').bars || barsOf('SPX');
    const rets = [];
    for (let i = 1; i < bars.length; i++) rets.push((bars[i].c - bars[i - 1].c) / bars[i - 1].c);
    const m = rets.reduce((a, b) => a + b, 0) / rets.length;
    const sd = Math.sqrt(rets.reduce((a, b) => a + (b - m) ** 2, 0) / rets.length);
    const LO = -5, HI = 5, BINS = 41;
    const hist = new Array(BINS).fill(0);
    for (const r of rets) {
      const z = (r - m) / sd;
      const k = Math.round((z - LO) / (HI - LO) * (BINS - 1));
      if (k >= 0 && k < BINS) hist[k]++;
    }
    const norm = hist.map((_, k) => {
      const z = LO + (k / (BINS - 1)) * (HI - LO);
      return rets.length * Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI) * ((HI - LO) / (BINS - 1));
    });
    host.innerHTML = svgHist(hist, norm, w, h, rets.length);
    return;
  }

  if (d.kind === 'multi') {
    const bars = barsOf('IXIC').slice(600, 1400);
    const ps = [];
    for (let s = 0; s < 20; s++) {
      const t = runBot({ id: 'x' + s, strategy: 'random', params: { p: 0.05 } }, bars, INSTRUMENTS.IXIC, { seed: 7000 + s * 331 });
      if (t.length < 8) { continue; }
      const r = analyzeSession({ bars, trades: t, instrument: INSTRUMENTS.IXIC, seed: 4242, iterations: 400 });
      if (r.headline?.available) ps.push(r.headline.pValue);
    }
    host.innerHTML = svgPvals(ps, w, h);
    return;
  }
}

function svgLines(curves, w, h, colors, xlab, ylab) {
  const maxLen = Math.max(...curves.map(c => c.length), 2);
  const all = curves.flat().concat([0]);
  const lo = Math.min(...all), hi = Math.max(...all), span = (hi - lo) || 1;
  const X = i => 40 + (i / (maxLen - 1)) * (w - 60);
  const Y = v => h - 26 - ((v - lo) / span) * (h - 50);
  return `<svg width="${w}" height="${h}">
    <line x1="40" x2="${w - 20}" y1="${Y(0)}" y2="${Y(0)}" stroke="${cssv('--line2')}" stroke-dasharray="3 3"></line>
    ${curves.map((c, k) => `<path d="${c.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join('')}"
      fill="none" stroke="${colors[k]}" stroke-width="${k === 0 ? 2.2 : 1.2}" opacity="${k === 0 ? 1 : .65}"></path>`).join('')}
    <text x="40" y="${h - 6}" fill="${cssv('--mut')}" font-size="11">${xlab}</text>
    <text x="4" y="16" fill="${cssv('--mut')}" font-size="11">${ylab}</text>
  </svg>`;
}

function svgHist(hist, norm, w, h, total) {
  const max = Math.max(...hist, ...norm);
  const n = hist.length;
  const bw = (w - 60) / n;
  const Y = v => h - 26 - (v / max) * (h - 50);
  return `<svg width="${w}" height="${h}">
    ${hist.map((v, i) => `<rect x="${(40 + i * bw).toFixed(1)}" y="${Y(v).toFixed(1)}"
      width="${(bw - 1).toFixed(1)}" height="${(h - 26 - Y(v)).toFixed(1)}"
      fill="${cssv('--brandSoft2')}"></rect>`).join('')}
    <path d="${norm.map((v, i) => `${i ? 'L' : 'M'}${(40 + i * bw + bw / 2).toFixed(1)},${Y(v).toFixed(1)}`).join('')}"
      fill="none" stroke="${cssv('--up')}" stroke-width="2"></path>
    <text x="40" y="${h - 6}" fill="${cssv('--mut')}" font-size="11">标准差倍数（−5σ 到 +5σ）</text>
    <text x="4" y="16" fill="${cssv('--mut')}" font-size="11">天数 · 共 ${total.toLocaleString()} 天</text>
    <text x="${w - 150}" y="30" fill="${cssv('--up')}" font-size="11">— 正态分布</text>
    <text x="${w - 150}" y="46" fill="${cssv('--brand')}" font-size="11">▇ 真实分布</text>
  </svg>`;
}

function svgPvals(ps, w, h) {
  if (!ps.length) return '<div class="mut" style="padding:20px">样本不足，无法演示</div>';
  const X = p => 50 + p * (w - 90);
  const sig = ps.filter(p => p <= 0.05).length;
  return `<svg width="${w}" height="${h}">
    <rect x="${X(0)}" y="40" width="${(X(0.05) - X(0)).toFixed(1)}" height="${h - 90}"
      fill="${cssv('--upSoft')}"></rect>
    <text x="${X(0.05) + 6}" y="36" fill="${cssv('--up')}" font-size="11">← p ≤ 0.05「显著」区</text>
    ${ps.map((p, i) => `<circle cx="${X(p).toFixed(1)}" cy="${(60 + (i % 10) * 14).toFixed(1)}" r="4.5"
      fill="${p <= 0.05 ? cssv('--up') : cssv('--brand')}" opacity=".8"></circle>`).join('')}
    <line x1="50" x2="${w - 40}" y1="${h - 34}" y2="${h - 34}" stroke="${cssv('--line2')}"></line>
    <text x="46" y="${h - 16}" fill="${cssv('--mut')}" font-size="11">0</text>
    <text x="${X(0.5)}" y="${h - 16}" fill="${cssv('--mut')}" font-size="11">p 值</text>
    <text x="${w - 60}" y="${h - 16}" fill="${cssv('--mut')}" font-size="11">1</text>
    <text x="50" y="24" fill="${cssv('--ink2')}" font-size="12">${ps.length} 条纯随机规则，其中 ${sig} 条落进了「显著」区</text>
  </svg>`;
}
