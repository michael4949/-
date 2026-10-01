/* PPT 素材渲染：node render.cjs → out/*.png（背景 2560×1440、图标、徽章、相框截图、深色架构图） */
const { chromium } = require(process.env.PW || '/home/user/-/node_modules/playwright');
const path = require('path'), fs = require('fs');
const OUT = path.join(__dirname, 'out'); fs.mkdirSync(OUT, { recursive: true });
const BG = 'file://' + path.join(__dirname, 'bg.html');
const SHOTS = path.join(__dirname, '..', '..', 'banzu', 'shots', 'vis');
const DIAG = path.join(__dirname, '..', '..', 'banzu', 'diagrams');
const DARK = `html,body{background:transparent!important}
.board{background:linear-gradient(160deg,rgba(13,22,56,.92),rgba(20,16,58,.92))!important;border-radius:36px;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.14),inset 0 1px 0 rgba(255,255,255,.4)}
:root{--navy:#eef2ff;--blue:#93c5fd;--blue2:#60a5fa;--sky:rgba(255,255,255,.07);--sky2:rgba(96,165,250,.16);--line:rgba(255,255,255,.18);--ink:#e5e7eb;--grey:#aab4c8;--gold:#fbbf24;--goldbg:rgba(251,191,36,.1);--goldln:rgba(251,191,36,.45)}
.ttl h1::before{background:linear-gradient(#22d3ee,#8b5cf6)!important}.ttl h1{color:#fff!important}
.chip{background:rgba(255,255,255,.08)!important;border-color:rgba(255,255,255,.18)!important;color:#f1f5f9!important}
.chip.dark{background:linear-gradient(135deg,#2563eb,#7c3aed)!important;border-color:transparent!important}
.chip.src{background:rgba(96,165,250,.14)!important;color:#c7d2fe!important}
.chip small,.node span,.core span,.panel h3 em,.data h3 em,.layer h3 em,.layer .lb small{color:#aab4c8!important}
.rbar{background:linear-gradient(90deg,#1d4ed8,#7c3aed)!important}
.panel,.data{background:rgba(255,255,255,.06)!important;border-color:rgba(255,255,255,.16)!important}
.panel h3,.data h3,.node b,.col h3,.st b,.use b,.lb,.layer h3{color:#fff!important}
.node{background:rgba(13,22,56,.9)!important;border-color:#60a5fa!important}
.core{background:radial-gradient(circle at 40% 35%,#6366f1,#1e3a8a 75%)!important;box-shadow:0 0 60px rgba(99,102,241,.6)!important}
.ai,.loop,.gov{background:rgba(251,191,36,.1)!important;border-color:rgba(251,191,36,.4)!important}.ai span,.loop span,.gov li{color:#fde68a!important}
.ring svg circle{stroke:rgba(147,197,253,.6)!important}
.layer{background:rgba(255,255,255,.05)!important;border-color:rgba(255,255,255,.14)!important}
.cells .chip{color:#f1f5f9!important}
.plat{background:linear-gradient(160deg,#1d4ed8,#6d28d9)!important}
.l1 .lb{background:#1e3a8a!important}.l2 .lb{background:#1d4ed8!important}.l3 .lb{background:#2563eb!important}.l4 .lb{background:#4f46e5!important}.l5 .lb{background:#475569!important}.l6 .lb{background:#64748b!important}
.layer.l6{border-style:dashed!important}
.cell{background:rgba(255,255,255,.07)!important;border-color:rgba(255,255,255,.16)!important}.cell b{color:#fff!important}.cell span{color:#b4bdd0!important}.cell.new{border-color:#60a5fa!important}
.lab{color:#fff!important}.lab small{color:#c7d2fe!important}`;
const ONLY = process.argv[2] || '';
(async () => {
  const br = await chromium.launch();
  const ctx = await br.newContext({ viewport: { width: 2560, height: 1440 }, deviceScaleFactor: 1 });
  const pg = await ctx.newPage();
  if (!ONLY || ONLY === 'bg') for (const k of ['cover', 'section', 'content', 'end']) { await pg.goto(BG + '?k=' + k); await pg.waitForTimeout(400); await pg.screenshot({ path: path.join(OUT, 'bg_' + k + '.png'), clip: { x: 0, y: 0, width: 2560, height: 1440 } }); console.log('bg', k); }
  const shotEl = async (url, name, scale) => { const p = await ctx.newPage(); if (scale) await p.setViewportSize({ width: 2560, height: 1440 }); await p.goto(url); await p.waitForTimeout(300); const el = await p.$('#shot'); await el.screenshot({ path: path.join(OUT, name), omitBackground: true }); await p.close(); };
  if (!ONLY || ONLY === 'icons') for (const n of ['users', 'shield', 'chart', 'clip', 'bolt', 'cog', 'book', 'heart', 'target', 'layers', 'grid', 'check', 'cpu', 'db', 'cycle', 'star', 'hand', 'chat', 'rocket', 'eye', 'flag', 'compass', 'key', 'globe']) await shotEl(BG + '?k=icon&n=' + n, 'ic_' + n + '.png');
  if (!ONLY || ONLY === 'icons') { await shotEl(BG + '?k=badge', 'badge.png'); await shotEl(BG + '?k=dot', 'dot.png'); await shotEl(BG + '?k=glass', 'glass.png'); await shotEl(BG + '?k=ringonly', 'ring.png'); console.log('icons ok'); }
  /* 相框截图 */
  const frames = ['sb_home', 'sb_team', 'sb_skills', 'sb_auth', 'sb_grow', 'sb_perf', 'sb_care', 'sb_advise', 'sb_sched_ticket', 'sb_know', 'sb_ask', 'sb_goals', 'sb_compare', 'sb_portrait', 'sb_lperf', 'sb_staff', 'sb_structure', 'sb_risks', 'sb_mcare', 'sb_madvise'];
  if (!ONLY || ONLY === 'sprites') { const sp = [['pill', ''], ['pill', 'cy'], ['pill', 'am'], ['pill', 'gn'], ['orb', ''], ['orb', 'am'], ['orb', 'gn'], ['hair', ''], ['vbar', ''], ['glow', ''], ['glow', 'cy'], ['glow', 'pk'], ['glow', 'gn'], ['glow', 'am'], ['orb', 'cy'], ['tile', ''], ['tile', 'ac']]; for (const [k, v] of sp) await shotEl(BG + '?k=' + k + '&v=' + v, 'sp_' + k + (v ? '_' + v : '') + '.png'); await shotEl(BG + '?k=logo&img=' + encodeURIComponent('file://' + path.join(__dirname, '..', '..', 'assets', 'logo.png')), 'sp_logo.png'); console.log('sprites ok'); }
  if (!ONLY || ONLY === 'frames') for (const f of frames) { const p = await ctx.newPage(); await p.setViewportSize({ width: 1700, height: 1200 }); await p.goto(BG + '?k=frame&w=1440&img=' + encodeURIComponent('file://' + path.join(SHOTS, f + '.png'))); await p.waitForTimeout(400); const el = await p.$('.frame'); await el.screenshot({ path: path.join(OUT, 'fr_' + f + '.png'), omitBackground: true }); await p.close(); }
  console.log('frames ok');
  /* 深色架构图 */
  if (!ONLY || ONLY === 'diag') for (const [f, name] of [['biz', 'diag_biz'], ['tech', 'diag_tech'], ['loop', 'diag_loop']]) { const p = await ctx.newPage(); await p.setViewportSize({ width: 1700, height: 1200 }); await p.goto('file://' + path.join(DIAG, f + '.html')); await p.addStyleTag({ content: DARK }); await p.waitForTimeout(400); const el = await p.$('#board'); await el.screenshot({ path: path.join(OUT, name + '.png'), omitBackground: true }); await p.close(); console.log('diag', name); }
  await br.close();
})();
