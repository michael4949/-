import { useEffect, useMemo, useState, type DragEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays, MapPinned, Sparkles, Check, RotateCcw, Smartphone, CalendarPlus, Download, Wand2, X, Clock, Car, Building2,
  Landmark, ListTodo, Lightbulb, Briefcase, Shirt, ShieldCheck, History, GripVertical, ArrowRight, FileText, Newspaper, Users, Send,
} from 'lucide-react';
import { COMPANIES } from '../../data/companies';
import { PERSONAS } from '../../data/personas';
import { rng } from '../../lib/rng';

/* ============================================================ 样式（页面私有，前缀 vp-） */
const CSS = `
.vp-crumb { font-size: 12.5px; color: var(--ink-3); margin-bottom: 6px; display: flex; align-items: center; gap: 6px; }
.vp-crumb a { color: var(--gold-3); font-weight: 700; } .vp-crumb b { color: var(--ink); }
.vp-layout { display: grid; grid-template-columns: 250px minmax(0,1fr) 380px; gap: 16px; align-items: start; }
@media (max-width: 1440px) { .vp-layout { grid-template-columns: 240px minmax(0,1fr); } .vp-layout > .vp-right { grid-column: 1 / -1; } }
@media (max-width: 980px) { .vp-layout { grid-template-columns: 1fr; } }
.vp-right { display: flex; flex-direction: column; gap: 16px; }
.vp-cand { display: flex; align-items: center; gap: 8px; padding: 9px 10px; border-radius: 11px; margin-bottom: 7px; cursor: grab; user-select: none; background: linear-gradient(90deg, rgba(255,255,255,.75), rgba(255,247,236,.6) 60%, rgba(236,248,243,.55)); box-shadow: inset 0 0 0 1px rgba(201,162,77,.16); transition: transform .12s ease, box-shadow .12s ease; }
.vp-cand:hover { box-shadow: inset 0 0 0 1px rgba(201,162,77,.45), var(--shadow-sm); transform: translateX(2px); }
.vp-cand.pick { box-shadow: inset 0 0 0 2px rgba(195,39,43,.55), var(--shadow-sm); background: var(--g-red-soft); }
.vp-cand.done { opacity: .55; cursor: default; }
.vp-cand .grip { color: var(--ink-3); flex-shrink: 0; }
.vp-cand .bd { flex: 1; min-width: 0; }
.vp-cand .t { font-weight: 800; font-size: 12.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.vp-cand .s { font-size: 11px; color: var(--ink-3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.vp-kind { width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; color: #fff; font-size: 11px; font-weight: 900; flex-shrink: 0; }
.vp-kind.red { background: var(--g-red); } .vp-kind.gold { background: var(--g-gold); color: #3a2a08; } .vp-kind.green { background: var(--g-green); } .vp-kind.blue { background: linear-gradient(135deg,#7fb0ff,#3a86ff); } .vp-kind.orange { background: linear-gradient(135deg,#ff9f4a,#d9781b); } .vp-kind.purple { background: linear-gradient(135deg,#c7a4ff,#9b5de5); }
.vp-cal { display: grid; grid-template-columns: 64px repeat(5, minmax(0,1fr)); gap: 6px; }
.vp-cal .hd { padding: 8px 6px; border-radius: 10px; text-align: center; font-weight: 800; font-size: 12.5px; background: var(--g-gold-soft); }
.vp-cal .hd small { display: block; font-size: 10.5px; color: var(--ink-3); font-weight: 700; }
.vp-cal .hd.today { background: var(--g-red-soft); color: var(--red-3); }
.vp-cal .hd.on { box-shadow: inset 0 0 0 2px rgba(195,39,43,.45); }
.vp-cal .rl { display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 10px; font-weight: 800; font-size: 12px; color: var(--ink-2); background: var(--g-holo-2); box-shadow: inset 0 0 0 1px rgba(201,162,77,.16); }
.vp-cal .rl small { font-size: 10px; color: var(--ink-3); font-weight: 700; }
.vp-slot { min-height: 96px; border-radius: 12px; padding: 6px; display: flex; flex-direction: column; gap: 5px; background: linear-gradient(135deg, rgba(255,255,255,.7), rgba(255,247,236,.5) 60%, rgba(236,248,243,.5)); box-shadow: inset 0 0 0 1px rgba(201,162,77,.14); transition: box-shadow .12s ease, background .12s ease; cursor: pointer; }
.vp-slot.over { box-shadow: inset 0 0 0 2px rgba(31,138,90,.55); background: var(--g-green-soft); }
.vp-slot.pickable { box-shadow: inset 0 0 0 1.5px rgba(195,39,43,.4); }
.vp-slot.day { background: var(--g-blue-soft); }
.vp-slot .ph { margin: auto; font-size: 11px; color: var(--ink-3); text-align: center; }
.vp-ev { display: flex; align-items: center; gap: 6px; padding: 6px 7px; border-radius: 9px; font-size: 11.5px; font-weight: 700; color: #fff; cursor: grab; box-shadow: 0 4px 10px rgba(92,64,20,.14); }
.vp-ev.red { background: var(--g-red); } .vp-ev.gold { background: var(--g-gold); color: #3a2a08; } .vp-ev.green { background: var(--g-green); } .vp-ev.blue { background: linear-gradient(135deg,#7fb0ff,#3a86ff); } .vp-ev.orange { background: linear-gradient(135deg,#ff9f4a,#d9781b); } .vp-ev.purple { background: linear-gradient(135deg,#c7a4ff,#9b5de5); }
.vp-ev.sel { outline: 2px solid #1e1b16; outline-offset: 1px; }
.vp-ev .nm { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.vp-ev .tm { font-size: 10.5px; opacity: .9; font-weight: 800; }
.vp-ev .rm { opacity: .75; cursor: pointer; display: inline-flex; } .vp-ev .rm:hover { opacity: 1; }
.vp-days { display: flex; gap: 4px; }
.vp-days button { border: 0; cursor: pointer; font: inherit; font-size: 11.5px; font-weight: 800; padding: 5px 10px; border-radius: 8px; color: var(--ink-2); background: var(--g-holo-2); box-shadow: inset 0 0 0 1px rgba(201,162,77,.2); }
.vp-days button.on { background: var(--g-red); color: #fff; box-shadow: 0 6px 14px rgba(195,39,43,.22); }
.vp-map { display: grid; grid-template-columns: minmax(0,1.25fr) minmax(0,1fr); gap: 14px; }
@media (max-width: 1200px) { .vp-map { grid-template-columns: 1fr; } }
.vp-svgwrap { border-radius: 12px; background: linear-gradient(135deg, #fbf7ee, #eef5f0 60%, #f2eefa); box-shadow: inset 0 0 0 1px rgba(201,162,77,.18); padding: 6px; }
.vp-svgwrap svg { width: 100%; height: auto; display: block; }
.vp-stop { display: flex; gap: 10px; align-items: flex-start; padding: 8px 10px; border-radius: 11px; background: var(--g-holo-2); box-shadow: inset 0 0 0 1px rgba(201,162,77,.16); margin-bottom: 6px; cursor: pointer; font-size: 12px; }
.vp-stop:hover, .vp-stop.on { box-shadow: inset 0 0 0 1.5px rgba(195,39,43,.45), var(--shadow-sm); }
.vp-stop .idx { width: 22px; height: 22px; border-radius: 50%; background: var(--g-iris); color: #fff; font-weight: 900; font-size: 11px; display: grid; place-items: center; flex-shrink: 0; }
.vp-stop .idx.home { background: linear-gradient(135deg, #2b1b1c, #3a2a14 50%, #14342a); }
.vp-stop b { display: block; font-size: 12.5px; }
.vp-stop span { color: var(--ink-3); }
.vp-drive { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--ink-3); padding: 0 0 6px 32px; }
.vp-sum { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 8px; margin-top: 8px; }
.vp-sum .k { padding: 8px 10px; border-radius: 10px; background: var(--g-gold-soft); font-size: 11px; color: var(--ink-3); }
.vp-sum .k b { display: block; font-size: 16px; font-weight: 900; color: var(--ink); }
.vp-sec { display: flex; align-items: center; gap: 8px; font-size: 11.5px; font-weight: 800; letter-spacing: .12em; color: var(--gold-3); margin: 14px 0 7px; }
.vp-sec::after { content: ""; flex: 1; height: 1px; background: linear-gradient(90deg, rgba(201,162,77,.45), rgba(61,187,134,.25), rgba(255,255,255,0)); }
.vp-sec:first-child { margin-top: 0; }
.vp-news { display: flex; gap: 8px; align-items: flex-start; padding: 8px 10px; border-radius: 10px; background: var(--g-blue-soft); font-size: 12px; margin-bottom: 6px; }
.vp-news .chip { flex-shrink: 0; padding: 2px 8px; font-size: 10.5px; }
.vp-clue { display: flex; gap: 8px; align-items: flex-start; padding: 8px 10px; border-radius: 10px; background: linear-gradient(135deg,#fff3e6,#ffdcb8 60%,#fde8d2); font-size: 12px; margin-bottom: 6px; }
.vp-clue .chip { flex-shrink: 0; padding: 2px 8px; font-size: 10.5px; }
.vp-chk { display: flex; gap: 9px; align-items: center; padding: 7px 10px; border-radius: 9px; background: var(--g-holo-2); box-shadow: inset 0 0 0 1px rgba(201,162,77,.16); margin-bottom: 5px; cursor: pointer; font-size: 12px; user-select: none; }
.vp-chk .bx { width: 15px; height: 15px; border-radius: 5px; background: var(--g-gold-soft); box-shadow: inset 0 0 0 1px rgba(201,162,77,.5); display: grid; place-items: center; color: #fff; flex-shrink: 0; }
.vp-chk.done { background: var(--g-green-soft); color: var(--ink-3); text-decoration: line-through; }
.vp-chk.done .bx { background: var(--g-green); box-shadow: none; }
.vp-point { display: flex; gap: 8px; align-items: flex-start; padding: 8px 10px; border-radius: 10px; background: var(--g-gold-soft); font-size: 12px; margin-bottom: 6px; }
.vp-point .n { width: 20px; height: 20px; border-radius: 6px; background: var(--g-gold); color: #3a2a08; font-weight: 900; font-size: 11px; display: grid; place-items: center; flex-shrink: 0; }
.vp-etq { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 8px; }
.vp-etq .e { padding: 10px 12px; border-radius: 11px; background: linear-gradient(135deg, rgba(255,255,255,.12), rgba(255,255,255,.04)); box-shadow: inset 0 0 0 1px rgba(255,248,232,.16); font-size: 12px; color: rgba(255,248,232,.88); }
.vp-etq .e b { display: block; color: #efd48a; margin-bottom: 4px; font-size: 12px; }
.vp-empty { min-height: 200px; display: grid; place-items: center; text-align: center; color: var(--ink-3); font-size: 13px; }
.vp-empty .ring { width: 54px; height: 54px; border-radius: 50%; background: var(--g-iris-soft); display: grid; place-items: center; margin: 0 auto 10px; box-shadow: inset 0 0 0 1px rgba(201,162,77,.3); color: var(--red); }
.vp-hist .h { display: flex; align-items: center; gap: 9px; padding: 8px 10px; border-radius: 10px; background: linear-gradient(90deg, rgba(255,255,255,.7), rgba(255,247,236,.55) 60%, rgba(236,248,243,.5)); box-shadow: inset 0 0 0 1px rgba(201,162,77,.14); font-size: 12px; margin-bottom: 6px; }
.vp-hist .h .d { font-weight: 800; color: var(--ink-3); width: 40px; flex-shrink: 0; font-size: 11.5px; }
.vp-hist .h .t { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 700; }
.vp-note { font-size: 11.5px; color: var(--ink-3); display: flex; align-items: center; gap: 6px; margin-top: 8px; }
.vp-toast { position: fixed; left: 50%; bottom: 46px; transform: translateX(-50%); z-index: 60; padding: 10px 18px; border-radius: 999px; background: var(--g-green); color: #fff; font-weight: 700; font-size: 13px; box-shadow: 0 12px 30px rgba(31,138,90,.3); display: inline-flex; align-items: center; gap: 8px; }
.vp-kv .row span:first-child { color: var(--ink-3); }
`;

/* ============================================================ 数据 */
type Tone = 'red' | 'gold' | 'green' | 'blue' | 'orange' | 'purple';
type Kind = '首访' | '尽调' | '续贷' | '维护' | '存款' | '结汇';
interface Cand { id: string; name: string; district: string; kind: Kind; purpose: string; dur: number; tone: Tone; x: number; y: number; contact: string; addr: string }
const KIND_TONE: Record<Kind, Tone> = { 首访: 'red', 尽调: 'orange', 续贷: 'gold', 维护: 'blue', 存款: 'green', 结汇: 'purple' };
const co = (id: string) => COMPANIES.find((c) => c.id === id)!;
const mk = (id: string, kind: Kind, purpose: string, dur: number, contact: string, addr: string, extra?: { name: string; district: string; x: number; y: number }): Cand => {
  const b = extra ?? { name: co(id).name, district: co(id).district, x: co(id).x, y: co(id).y };
  return { id, name: b.name, district: b.district, kind, purpose, dur, tone: KIND_TONE[kind], x: b.x, y: b.y, contact, addr };
};
const CANDS: Cand[] = [
  mk('ninggui', '尽调', '首次授信 · 定点订单排产与资金缺口', 90, '财务总监 陈女士', '高新区创新大道 88 号'),
  mk('caisheng', '维护', '账户维护 · 了解经营，不做主动营销', 45, '负责人 李先生', '城东区东环路 12 号'),
  mk('c06', '续贷', '授信 60 天后到期 · 启动续贷材料', 60, '财务经理 赵先生', '城北区医药园 6 栋'),
  mk('c09', '存款', '结算量上升 · 收单与代发方案', 45, '运营总监 周女士', '城南区商业街 9 号'),
  mk('c05', '结汇', '东盟出口收汇 · 远期结汇方案', 50, '外贸经理 黄先生', '保税区跨境园 A3'),
  mk('c07', '维护', '结算量流失 · 了解分流原因', 40, '会计 刘女士', '城东区建材市场 21 号'),
  mk('c08', '存款', '知识产权质押续作 · 代发工资', 45, '总经理 孙先生', '高新区软件园 2 期'),
  mk('x04', '首访', '定点公告 · 首次接触了解设备投入', 60, '总经理 吴先生', '经开区精工路 5 号', { name: '岭南精工模具', district: '经开区', x: 0.40, y: 0.60 }),
  mk('x01', '首访', '定点公告 · 首贷需求摸底', 60, '财务负责人 郑女士', '高新区智造二路 17 号', { name: '澜科汽车零部件', district: '高新区', x: 0.66, y: 0.36 }),
  mk('x10', '首访', '专精特新 · 科创信用贷', 50, '联合创始人 林博士', '东湖区生物医药港 B2', { name: '蓝湾生物医药', district: '东湖区', x: 0.70, y: 0.20 }),
];
const candById = (id: string) => CANDS.find((c) => c.id === id)!;
const DAYS = [
  { k: 'mon', t: '周一', d: '09-07' }, { k: 'tue', t: '周二', d: '09-08' }, { k: 'wed', t: '周三', d: '09-09' }, { k: 'thu', t: '周四', d: '09-10' }, { k: 'fri', t: '周五', d: '09-11' },
];
const HALVES = [{ k: 'am', t: '上午', s: '09:00' }, { k: 'pm', t: '下午', s: '14:00' }];
type Sched = Record<string, string[]>;
const INIT: Sched = { 'tue-am': ['c06'], 'wed-am': ['ninggui'], 'wed-pm': ['caisheng'], 'thu-pm': ['c09'] };
const BRANCH = { name: '城东支行', x: 0.72, y: 0.62 };
const DISTRICT_C: Record<string, [number, number]> = { 城北区: [0.50, 0.17], 高新区: [0.62, 0.34], 保税区: [0.84, 0.40], 城东区: [0.74, 0.66], 经开区: [0.42, 0.56], 临港区: [0.22, 0.52], 城南区: [0.44, 0.84], 老城区: [0.54, 0.50], 西山区: [0.19, 0.34], 江畔新区: [0.32, 0.22], 东湖区: [0.70, 0.20] };
const D_COLORS = ['#e63946', '#f4b942', '#2dc48d', '#3a86ff', '#9b5de5', '#ff8c42', '#00b4d8', '#ff5da2', '#c9a24d', '#1f8a5a', '#8e1b1b'];

/* ---------- 路程（确定性） */
const km = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot((a.x - b.x) * 30, (a.y - b.y) * 24);
const driveMin = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.max(8, Math.round(km(a, b) / 0.55) + 6);
const addMin = (hhmm: string, m: number) => { const [h, mm] = hhmm.split(':').map(Number); const t = h * 60 + mm + m; return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };

/* ---------- 准备包 */
interface Pack {
  news: { src: string; text: string }[]; coop: { years: string; deposit: string; settlement: string; credit: string; products: string; last: string };
  todos: string[]; points: string[]; materials: string[]; clues: { src: string; text: string }[];
  etq: { style: string; dress: string; open: string; close: string };
}
const PACKS: Record<string, Pack> = {
  ninggui: {
    news: [
      { src: '招投标公告', text: '2026-06 获某新能源车企定点，SOP 后年供货约 1.2 亿；8 月再中标二期模具项目，交付周期 8 个月。' },
      { src: '工商公示', text: '2026-07 新设东莞子公司（100% 持股），经营范围新增「模具制造」；无被执行、无股权出质。' },
      { src: '企业官网', text: '官网新增产线招聘 40 人（CNC 操作、质检），说明扩产在即。' },
    ],
    coop: { years: '结算户 4 年', deposit: '日均 860 万', settlement: '年结算 4,200 万 · 主办份额约 53%', credit: '无授信 · 首次申请中', products: '3 项（结算 / 代发 / 网银）', last: '08-26 电话 · 财务总监确认有融资需求' },
    todos: ['确认定点订单排产计划与 SOP 时间点', '了解模具与设备投入金额、资金缺口与到位时间', '约定近两年审计报告、定点通知书、主要购销合同的提供时间', '介绍审批时效与供应链票据组合'],
    points: ['首次授信客户对审批时长敏感，开场先讲流程与时间承诺，再谈材料。', '出口收汇 30%，可顺带了解结算币种与账期，为远期结汇铺垫。', '东莞子公司尚无完整报表，不当面追问原因，改为约定补充时间。', '不评价同业方案，只谈本行能做什么。'],
    materials: ['流动资金贷款产品说明', '供应链票据贴现价格表', '首次授信材料清单（打印 2 份）', '远期结汇产品说明', '名片与产品折页'],
    clues: [
      { src: '动产融资统一登记公示', text: '2026-06 将 2 台加工中心向某租赁公司办理融资租赁登记，客户已有设备融资渠道，本行方案需在期限或综合成本上有差异化。' },
      { src: '客户授权提供', text: '上次访谈提及同城两家银行已报价流贷，额度与放款条件尚未落地。' },
    ],
    etq: { style: '民企 · 财务总监在场：先谈生意再谈材料，问题面向财务总监提出。', dress: '商务休闲，深色西装外套不打领带；需进车间，平底鞋 + 一次性鞋套。', open: '「上次您提到定点项目，这两周有新的进展吗？今天主要想把设备与备货的资金节奏对齐。」', close: '「三件事：材料清单今天发您；审批进度每周五同步；下周三前我们给预审意见。」' },
  },
  caisheng: {
    news: [
      { src: '法院公示', text: '2026-07 被执行 860 万（合同纠纷），暂无终结信息。' },
      { src: '本行结算数据', text: '近 6 个月本行结算量下降 62%，对公账户交易对手明显减少。' },
      { src: '工商公示', text: '股权与经营范围近 12 个月无变更；为晟禾食品经销商。' },
    ],
    coop: { years: '结算户 3 年', deposit: '日均 120 万', settlement: '年结算 900 万 · 同比 -62%', credit: '无授信（晟禾担保 500 万系他行）', products: '1 项（结算）', last: '07-30 上门 · 负责人称回款放缓' },
    todos: ['了解被执行案件进展与和解安排', '核对近三月回款来源与主要客户变化', '确认账户是否仍作主要结算账户', '记录晟禾应收往来现状'],
    points: ['本次以了解经营与账户维护为主，不做主动营销、不谈新增授信。', '不提及征信与他行信息，只基于公开信息与客户自述。', '如客户主动提出融资需求，按流程转授信部门评估，不当场承诺。', '会后 2 小时内回填拜访记录，同步贷后团队关注晟禾传导。'],
    materials: ['拜访记录表', '账户服务说明', '名片'],
    clues: [{ src: '法院公示', text: '被执行信息为公开信息，可在会谈中确认客户应对方案，不作评价。' }],
    etq: { style: '负责人情绪可能敏感：多听少说，不追问诉讼细节。', dress: '商务正装，避免过于隆重。', open: '「最近生意上有什么变化？我们过来主要看看账户使用上还有哪些可以帮上忙的。」', close: '「账户这边我们保持服务不变，有需要随时联系我；后续我每月来看您一次。」' },
  },
  c06: {
    news: [
      { src: '企业官网', text: '新增 2 家连锁药房配送合同，覆盖城北、东湖两区。' },
      { src: '工商公示', text: '注册资本由 3,000 万增至 5,000 万（2026-05），无被执行信息。' },
      { src: '招投标公告', text: '中标市属医院药品配送服务（3 年期）。' },
    ],
    coop: { years: '贷款客户 5 年', deposit: '日均 900 万', settlement: '年结算 6,800 万', credit: '授信 1,500 万 · 60 天后到期', products: '4 项（流贷 / 结算 / 代发 / 网银）', last: '08-12 上门 · 财务经理希望提前续贷' },
    todos: ['确认续贷额度与期限需求（是否增额）', '收集近一年财务报表与纳税申报表', '了解应收账款账期变化，评估供应链保理', '约定续贷材料提交时间'],
    points: ['续贷启动越早越好，重点讲无缝衔接安排。', '医院配送账期长，可提出应收账款保理作为补充。', '本行份额 35%，可谈结算集中度提升换取价格空间。'],
    materials: ['续贷材料清单', '供应链保理产品说明', '上次授信批复要点摘录', '名片'],
    clues: [{ src: '客户授权提供', text: '财务经理提到另一家银行在接触，主要谈额度；本行优势在于审批衔接与结算基础。' }],
    etq: { style: '老客户，氛围轻松但要专业；带上续贷时间表。', dress: '商务正装。', open: '「授信还有 60 天到期，我们今天把续贷的节奏定下来，争取到期前 15 天完成审批。」', close: '「材料清单今天发您，下周三前收齐，我们同步推进。」' },
  },
  c09: {
    news: [
      { src: '企业官网', text: '9 月新开 3 家门店，全市门店达 28 家。' },
      { src: '本行结算数据', text: '结算量环比上升 28%，收单交易笔数增加明显。' },
      { src: '工商公示', text: '无被执行、无经营异常。' },
    ],
    coop: { years: '结算户 2 年', deposit: '日均 210 万', settlement: '年结算 2,600 万', credit: '无授信', products: '2 项（结算 / 网银）', last: '08-20 电话 · 运营总监关注收单费率' },
    todos: ['了解新门店收单方式与现有费率', '提出代发工资与员工账户方案（约 600 名员工）', '了解门店装修与备货的短期资金安排', '约定收单方案报价时间'],
    points: ['以「一体化结算 + 收单」为切入，减少门店对账工作量。', '员工代发是存款沉淀的关键，讲清楚对员工的便利。', '门店扩张可能带来装修贷需求，先不主动推，留在下次。'],
    materials: ['收单与聚合支付方案', '代发工资服务说明', '结算套餐价目', '名片'],
    clues: [{ src: '客户授权提供', text: '运营总监表示现用第三方收单，费率约 0.6%，结算 T+1；本行可从费率与到账时效切入。' }],
    etq: { style: '餐饮行业节奏快，把方案讲短讲清。', dress: '商务休闲。', open: '「看到你们 9 月又开了 3 家店，今天想聊聊怎么把 28 家店的收款和发薪管得更省事。」', close: '「收单报价两天内给您，代发方案我们下周一起过一遍。」' },
  },
  c05: {
    news: [
      { src: '企业官网', text: '新增马来西亚与越南两个海外仓，东盟线路占比提升。' },
      { src: '海关公开数据', text: '近 12 个月出口额同比增长 21%，以美元结算为主。' },
    ],
    coop: { years: '结算户 3 年', deposit: '日均 410 万', settlement: '年结算 3,100 万 · 主办份额约 48%', credit: '无授信', products: '2 项（结算 / 跨境收款）', last: '08-18 上门 · 外贸经理咨询结汇价格' },
    todos: ['了解收汇币种、账期与月均结汇量', '介绍远期结汇与期权组合', '了解海外仓备货资金安排', '约定结汇价格与操作流程培训'],
    points: ['先讲汇率波动对利润的影响，再讲锁汇工具。', '出口收汇稳定，可顺带提出出口押汇。', '不承诺具体价格，以当日报价为准。'],
    materials: ['远期结汇产品说明', '出口押汇产品说明', '跨境结算服务手册', '名片'],
    clues: [{ src: '客户授权提供', text: '外贸经理提到目前通过第三方跨境收款平台结汇，手续费偏高。' }],
    etq: { style: '外贸企业习惯快节奏，重视数字与案例。', dress: '商务休闲。', open: '「最近汇率波动比较大，今天想帮你们算一算锁汇能省多少。」', close: '「我把远期结汇方案和报价流程整理后明天发您，并安排操作培训。」' },
  },
  c07: {
    news: [
      { src: '本行结算数据', text: '结算量环比下降 35%，主要流出方向为同城他行账户。' },
      { src: '工商公示', text: '无被执行、无经营异常；经营范围新增「装饰材料」。' },
    ],
    coop: { years: '结算户 4 年', deposit: '日均 75 万', settlement: '年结算 640 万 · 环比 -35%', credit: '无授信', products: '1 项（结算）', last: '07-15 电话 · 会计称在其他银行办理了贷款' },
    todos: ['了解结算分流原因（是否为他行贷款附带结算要求）', '介绍本行结算套餐与手续费优惠', '了解新增装饰材料业务的结算需求'],
    points: ['不评价他行，只讲本行能提供的结算便利。', '目标是保住基本户与主要结算，不急于推融资。'],
    materials: ['结算套餐价目', '账户服务说明', '名片'],
    clues: [{ src: '客户授权提供', text: '会计称他行贷款要求归集部分结算，属客户自述，不涉及征信。' }],
    etq: { style: '小微企业，负责人务实。', dress: '商务休闲。', open: '「最近账户用得少了，是不是我们的服务哪里不方便？」', close: '「结算优惠方案我今天就申请，下周给您答复。」' },
  },
};
function genericPack(c: Cand): Pack {
  const r = rng(c.id.split('').reduce((s, ch) => s + ch.charCodeAt(0), 0));
  const growth = 12 + Math.floor(r() * 30);
  return {
    news: [
      { src: '工商公示', text: `近 12 个月无被执行、无经营异常；成立满 ${3 + Math.floor(r() * 12)} 年，股权结构稳定。` },
      { src: c.kind === '首访' ? '招投标公告' : '企业官网', text: c.kind === '首访' ? '近期有定点 / 中标公告，项目履约期资金需求前置。' : `官网显示业务扩张，近一年营收增速约 ${growth}%。` },
    ],
    coop: { years: c.kind === '首访' ? '结算户 1–2 年' : '结算户 3 年', deposit: `日均 ${(200 + Math.floor(r() * 400)).toLocaleString('zh-CN')} 万`, settlement: `年结算 ${(1500 + Math.floor(r() * 3000)).toLocaleString('zh-CN')} 万`, credit: c.kind === '续贷' ? '授信到期前 60 天' : '无授信', products: `${1 + Math.floor(r() * 3)} 项`, last: '近 30 天有电话联系' },
    todos: ['了解本年经营计划与资金安排', '确认主要上下游账期', c.kind === '首访' ? '介绍首贷流程与所需材料' : '介绍结算与代发一体化方案', '约定下一步时间'],
    points: ['首次接触先建立信任，不急于报价。', '基于公开信息提问，请客户确认后再展开。', '收尾明确下一步与时间点。'],
    materials: ['产品折页', c.kind === '首访' ? '首次授信材料清单' : '结算套餐价目', '名片'],
    clues: [{ src: '公开招聘信息', text: '近期公开招聘岗位增加，扩张信号明确，资金需求可能前置。' }],
    etq: { style: '首次见面：准时、简短、专业。', dress: '商务正装。', open: `「看到贵司最近${c.kind === '首访' ? '有新项目落地' : '业务发展很快'}，今天主要想了解一下资金安排上有没有我们能帮忙的。」`, close: '「今天了解到的信息我整理成方案，三个工作日内给您。」' },
  };
}
const packOf = (c: Cand) => PACKS[c.id] ?? genericPack(c);

const PREP_STEPS = [
  { t: '公开信息整理', p: '汇总工商公示、招投标公告、企业官网与法院公示等公开信息，逐条标注来源；不调用征信。' },
  { t: '本行合作梳理', p: '读取存款、结算、授信与产品持有情况（只读），关联上次拜访记录与客户授权提供的资料。' },
  { t: '待办与要点', p: '结合拜访目的生成待办事项、要点提示与需要客户回答的问题；含合规红线检查。' },
  { t: '材料清单与礼仪卡', p: '按拜访类型与在场人员推荐携带材料、着装与开场收尾话术。' },
];
const HISTORY = [
  { d: '09-04', t: '东岭新能源 · 固定资产贷款用款核查', r: '已回填' },
  { d: '09-03', t: '汇源物流 · 贷后走访', r: '已回填' },
  { d: '09-02', t: '融岚软件 · 代发工资方案', r: '已回填' },
  { d: '09-01', t: '晟禾食品集团 · 集团方案沟通', r: '待回填' },
  { d: '08-29', t: '桂澜跨境电商 · 结汇咨询', r: '已回填' },
];

function useSteps(total: number, running: boolean, token: number, gap = 760) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    if (!running) return;
    const timers: number[] = [];
    for (let i = 1; i <= total + 1; i++) timers.push(window.setTimeout(() => setN(i), gap * i));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [running, token, total, gap]);
  return n;
}

/* ============================================================ 页面 */
export default function VisitPlan() {
  const [sched, setSched] = useState<Sched>(INIT);
  const [pick, setPick] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [day, setDay] = useState('wed');
  const [sel, setSel] = useState<{ id: string; slot: string } | null>({ id: 'ninggui', slot: 'wed-am' });
  const [run, setRun] = useState(0);
  const [runFor, setRunFor] = useState<string | null>(null);
  const [todoDone, setTodoDone] = useState<Record<string, boolean>>({});
  const [matDone, setMatDone] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);
  const me = PERSONAS[1];

  const n = useSteps(PREP_STEPS.length, run > 0, run);
  const finished = run > 0 && n > PREP_STEPS.length && runFor === sel?.id;

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(t);
  }, [toast]);

  const scheduledIds = useMemo(() => new Set(Object.values(sched).flat()), [sched]);
  const pending = CANDS.filter((c) => !scheduledIds.has(c.id));

  const place = (id: string, slot: string) => {
    setSched((s) => {
      const next: Sched = {};
      Object.entries(s).forEach(([k, v]) => { next[k] = v.filter((x) => x !== id); });
      const cur = next[slot] ?? [];
      if (cur.length >= 2) { setToast('该时段已排满（最多 2 户）'); return s; }
      next[slot] = [...cur, id];
      return next;
    });
    setPick(null);
    setSel({ id, slot });
    setDay(slot.split('-')[0]);
  };
  const remove = (id: string) => {
    setSched((s) => { const next: Sched = {}; Object.entries(s).forEach(([k, v]) => { next[k] = v.filter((x) => x !== id); }); return next; });
    if (sel?.id === id) setSel(null);
  };
  const onDragStart = (e: DragEvent, id: string) => { e.dataTransfer.setData('text/plain', id); e.dataTransfer.effectAllowed = 'move'; };
  const onDrop = (e: DragEvent, slot: string) => { e.preventDefault(); const id = e.dataTransfer.getData('text/plain'); if (id) place(id, slot); setOver(null); };

  const autoPlan = () => {
    const next: Sched = { ...sched };
    const free = DAYS.flatMap((d) => HALVES.map((h) => `${d.k}-${h.k}`)).filter((k) => (next[k]?.length ?? 0) < 2);
    // 按行政区聚类：同区客户尽量安排在同一天
    const byDist = new Map<string, Cand[]>();
    pending.forEach((c) => byDist.set(c.district, [...(byDist.get(c.district) ?? []), c]));
    const groups = Array.from(byDist.values()).sort((a, b) => b.length - a.length);
    let fi = 0;
    groups.forEach((g) => g.forEach((c) => {
      // 若已有同区客户排在某个空余时段，优先同一时段
      const same = free.find((k) => (next[k]?.length ?? 0) < 2 && (next[k] ?? []).some((id) => candById(id).district === c.district));
      const slot = same ?? free[fi++ % free.length];
      if (!slot) return;
      if ((next[slot]?.length ?? 0) >= 2) return;
      next[slot] = [...(next[slot] ?? []), c.id];
    }));
    setSched(next);
    setToast(`已按行政区聚类自动排入 ${pending.length} 户`);
  };

  /* 路线 */
  const route = useMemo(() => {
    const stops: { c: Cand; half: string; start: string; end: string; drive: number; from: string }[] = [];
    let total = 0;
    HALVES.forEach((h) => {
      let cur: { x: number; y: number; name: string } = BRANCH;
      let t = h.s;
      (sched[`${day}-${h.k}`] ?? []).forEach((id) => {
        const c = candById(id);
        const d = driveMin(cur, c);
        total += d;
        const start = addMin(t, d);
        const end = addMin(start, c.dur);
        stops.push({ c, half: h.t, start, end, drive: d, from: cur.name });
        cur = c; t = end;
      });
      if (cur !== BRANCH) total += driveMin(cur, BRANCH);
    });
    const visitMin = stops.reduce((s, x) => s + x.c.dur, 0);
    return { stops, total, visitMin };
  }, [sched, day]);

  const selCand = sel ? candById(sel.id) : null;
  const pack = selCand ? packOf(selCand) : null;
  const gen = () => { if (!sel) return; setRunFor(sel.id); setRun((r) => r + 1); setTodoDone({}); setMatDone({}); };
  const weekCount = scheduledIds.size;
  const weekDrive = useMemo(() => DAYS.reduce((s, d) => {
    let tot = 0;
    HALVES.forEach((h) => { let cur: { x: number; y: number } = BRANCH; (sched[`${d.k}-${h.k}`] ?? []).forEach((id) => { const c = candById(id); tot += driveMin(cur, c); cur = c; }); if (cur !== BRANCH) tot += driveMin(cur, BRANCH); });
    return s + tot;
  }, 0), [sched]);

  const W = 520, H = 400;
  const px = (x: number, y: number): [number, number] => [x * W, y * H];

  return (
    <div>
      <style>{CSS}</style>
      <div className="vp-crumb"><Link to="/p/P01">智慧获客引擎</Link><span>›</span><b>拜访计划与准备包</b></div>
      <div className="page-h">
        <div>
          <h1><CalendarDays size={20} style={{ verticalAlign: -3, marginRight: 6 }} />拜访计划与准备包</h1>
          <p>把本周待访客户排进时段与路线，按行政区聚类减少路上时间；每次拜访自动整理准备包，拜访前 1 小时推送要点提示。</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn ghost sm" onClick={autoPlan}><Wand2 size={13} />自动排程</button>
          <button className="btn ghost sm" onClick={() => setToast('本周计划已导出（PDF）')}><Download size={13} />导出周计划</button>
          <button className="btn gold sm" onClick={() => setToast(`本周 ${weekCount} 次拜访已同步到手机日程`)}><Smartphone size={13} />推送本周计划</button>
        </div>
      </div>

      <div className="vp-layout">
        {/* ---------------- 左：待访客户 ---------------- */}
        <div className="card fade-in">
          <div className="card-h"><div className="card-t"><Users size={14} />待访客户</div><span className="card-s">{pending.length} 户待排</span></div>
          <p style={{ fontSize: 11.5, color: 'var(--ink-3)', marginBottom: 8 }}>拖入右侧时段，或先点选再点时段。</p>
          {pending.map((c) => (
            <div key={c.id} draggable className={`vp-cand${pick === c.id ? ' pick' : ''}`} onDragStart={(e) => onDragStart(e, c.id)} onClick={() => setPick((p) => (p === c.id ? null : c.id))}>
              <GripVertical size={13} className="grip" />
              <span className={`vp-kind ${c.tone}`}>{c.kind}</span>
              <div className="bd"><div className="t">{c.name}</div><div className="s">{c.district} · {c.dur} 分钟 · {c.purpose}</div></div>
            </div>
          ))}
          {pending.length === 0 && <div className="vp-empty" style={{ minHeight: 90 }}><div>本周待访客户已全部排入。</div></div>}
          <div className="vp-sec">已排入</div>
          {CANDS.filter((c) => scheduledIds.has(c.id)).map((c) => {
            const slot = Object.entries(sched).find(([, v]) => v.includes(c.id))?.[0] ?? '';
            const [dk, hk] = slot.split('-');
            return (
              <div key={c.id} className="vp-cand done" onClick={() => { setSel({ id: c.id, slot }); setDay(dk); }} style={{ cursor: 'pointer' }}>
                <span className={`vp-kind ${c.tone}`}>{c.kind}</span>
                <div className="bd"><div className="t">{c.name}</div><div className="s">{DAYS.find((d) => d.k === dk)?.t} {HALVES.find((h) => h.k === hk)?.t} · {c.district}</div></div>
              </div>
            );
          })}
          <div className="vp-note"><ShieldCheck size={12} /> 地址来自工商登记 / CRM 备案</div>
        </div>

        {/* ---------------- 中：日历 + 路线 ---------------- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <div className="card fade-in" style={{ animationDelay: '60ms' }}>
            <div className="card-h">
              <div className="card-t"><CalendarDays size={14} />本周日程 · 2026-09-07 至 09-11</div>
              <span className="card-s">{weekCount} 次拜访 · 预计路上 {Math.round(weekDrive / 60 * 10) / 10} 小时 · {me.name}</span>
            </div>
            <div className="vp-cal">
              <div />
              {DAYS.map((d) => <div key={d.k} className={`hd${day === d.k ? ' on' : ''}`} onClick={() => setDay(d.k)} style={{ cursor: 'pointer' }}>{d.t}<small>{d.d}</small></div>)}
              {HALVES.map((h) => (
                <div key={h.k} style={{ display: 'contents' }}>
                  <div className="rl">{h.t}<small>{h.s} 起</small></div>
                  {DAYS.map((d) => {
                    const key = `${d.k}-${h.k}`;
                    const ids = sched[key] ?? [];
                    return (
                      <div key={key} className={`vp-slot${over === key ? ' over' : ''}${pick ? ' pickable' : ''}${day === d.k ? ' day' : ''}`}
                        onDragOver={(e) => { e.preventDefault(); setOver(key); }} onDragLeave={() => setOver(null)} onDrop={(e) => onDrop(e, key)}
                        onClick={() => { if (pick) place(pick, key); else setDay(d.k); }}>
                        {ids.map((id) => {
                          const c = candById(id);
                          return (
                            <div key={id} draggable className={`vp-ev ${c.tone}${sel?.id === id ? ' sel' : ''}`} onDragStart={(e) => { e.stopPropagation(); onDragStart(e, id); }} onClick={(e) => { e.stopPropagation(); setSel({ id, slot: key }); setDay(d.k); }}>
                              <span className="nm">{c.name}</span><span className="tm">{c.dur}′</span>
                              <span className="rm" onClick={(e) => { e.stopPropagation(); remove(id); }}><X size={11} /></span>
                            </div>
                          );
                        })}
                        {ids.length === 0 && <div className="ph">{pick ? '点击排入' : '拖入客户'}</div>}
                        {ids.length === 1 && <div className="ph" style={{ margin: '2px auto 0' }}>可再排 1 户</div>}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="vp-note"><Clock size={12} /> 每个时段最多 2 户；上午 09:00 / 下午 14:00 从城东支行出发，车程按行政区距离估算。</div>
          </div>

          <div className="card fade-in" style={{ animationDelay: '120ms' }}>
            <div className="card-h">
              <div className="card-t"><MapPinned size={14} />路线示意 · {DAYS.find((d) => d.k === day)?.t} {DAYS.find((d) => d.k === day)?.d}</div>
              <div className="vp-days">{DAYS.map((d) => <button key={d.k} className={day === d.k ? 'on' : ''} onClick={() => setDay(d.k)}>{d.t}</button>)}</div>
            </div>
            <div className="vp-map">
              <div className="vp-svgwrap">
                <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="拜访路线示意">
                  <defs>
                    {D_COLORS.map((c, i) => <radialGradient key={i} id={`vp-d${i}`}><stop offset="0" stopColor={c} stopOpacity=".28" /><stop offset="1" stopColor={c} stopOpacity=".05" /></radialGradient>)}
                    <linearGradient id="vp-route" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#c3272b" /><stop offset=".5" stopColor="#e3a93c" /><stop offset="1" stopColor="#1f8a5a" /></linearGradient>
                    <linearGradient id="vp-home" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#3a2a14" /><stop offset="1" stopColor="#14342a" /></linearGradient>
                    <linearGradient id="vp-pin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#e85d55" /><stop offset="1" stopColor="#8e1b1b" /></linearGradient>
                    <linearGradient id="vp-pin2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f7e2a5" /><stop offset="1" stopColor="#a9843a" /></linearGradient>
                    <marker id="vp-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#c3272b" /></marker>
                  </defs>
                  {Object.entries(DISTRICT_C).map(([name, [x, y]], i) => {
                    const [cx, cy] = px(x, y);
                    const cnt = (sched[`${day}-am`] ?? []).concat(sched[`${day}-pm`] ?? []).filter((id) => candById(id).district === name).length;
                    return (
                      <g key={name}>
                        <ellipse cx={cx} cy={cy} rx={64} ry={44} fill={`url(#vp-d${i % D_COLORS.length})`} stroke={D_COLORS[i % D_COLORS.length]} strokeOpacity={cnt ? .55 : .2} strokeWidth={cnt ? 2 : 1} strokeDasharray={cnt ? undefined : '3 3'} />
                        <text x={cx} y={cy + (cnt ? -26 : 4)} textAnchor="middle" fontSize="11" fontWeight="800" fill="#4a3f2e">{name}{cnt ? ` · ${cnt}` : ''}</text>
                      </g>
                    );
                  })}
                  {(() => {
                    const pts: [number, number][] = [px(BRANCH.x, BRANCH.y)];
                    route.stops.forEach((s) => pts.push(px(s.c.x, s.c.y)));
                    pts.push(px(BRANCH.x, BRANCH.y));
                    if (route.stops.length === 0) return null;
                    return <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke="url(#vp-route)" strokeWidth="3" strokeLinejoin="round" strokeDasharray="7 5" markerMid="url(#vp-arr)" />;
                  })()}
                  {route.stops.map((s, i) => {
                    const [cx, cy] = px(s.c.x, s.c.y);
                    const on = sel?.id === s.c.id;
                    return (
                      <g key={s.c.id} style={{ cursor: 'pointer' }} onClick={() => setSel({ id: s.c.id, slot: `${day}-${s.half === '上午' ? 'am' : 'pm'}` })}>
                        <circle cx={cx} cy={cy} r={on ? 15 : 12} fill={on ? 'url(#vp-pin)' : 'url(#vp-pin2)'} stroke="#fff" strokeWidth="2.5" />
                        <text x={cx} y={cy + 4} textAnchor="middle" fontSize="11" fontWeight="900" fill={on ? '#fff' : '#3a2a08'}>{i + 1}</text>
                        <text x={cx} y={cy + 28} textAnchor="middle" fontSize="10.5" fontWeight="800" fill="#1e1b16" style={{ paintOrder: 'stroke', stroke: 'rgba(255,255,255,.9)', strokeWidth: 3 }}>{s.c.name} {s.start}</text>
                      </g>
                    );
                  })}
                  {(() => { const [cx, cy] = px(BRANCH.x, BRANCH.y); return (<g><rect x={cx - 11} y={cy - 11} width={22} height={22} rx={6} fill="url(#vp-home)" stroke="#fff" strokeWidth="2" /><text x={cx} y={cy + 4} textAnchor="middle" fontSize="10" fontWeight="900" fill="#fff8e8">行</text><text x={cx} y={cy - 16} textAnchor="middle" fontSize="10.5" fontWeight="800" fill="#1e1b16" style={{ paintOrder: 'stroke', stroke: 'rgba(255,255,255,.9)', strokeWidth: 3 }}>{BRANCH.name}</text></g>); })()}
                </svg>
              </div>
              <div>
                {route.stops.length === 0 && <div className="vp-empty" style={{ minHeight: 160 }}><div><div className="ring"><Car size={20} /></div>该日尚未排入拜访。</div></div>}
                {route.stops.map((s, i) => (
                  <div key={s.c.id}>
                    <div className="vp-drive"><Car size={11} /> 自{s.from}出发 · 车程约 {s.drive} 分钟</div>
                    <div className={`vp-stop${sel?.id === s.c.id ? ' on' : ''}`} onClick={() => setSel({ id: s.c.id, slot: `${day}-${s.half === '上午' ? 'am' : 'pm'}` })}>
                      <span className="idx">{i + 1}</span>
                      <div style={{ flex: 1, minWidth: 0 }}><b>{s.start}–{s.end} {s.c.name}</b><span>{s.c.district} · {s.c.addr} · {s.c.contact}</span></div>
                      <span className={`chip ${s.c.tone === 'gold' ? '' : s.c.tone}`} style={{ padding: '2px 8px', fontSize: 10.5, flexShrink: 0 }}><i />{s.c.kind}</span>
                    </div>
                  </div>
                ))}
                {route.stops.length > 0 && <div className="vp-drive"><Car size={11} /> 返回{BRANCH.name} · 车程约 {driveMin(route.stops[route.stops.length - 1].c, BRANCH)} 分钟</div>}
                <div className="vp-sum">
                  <div className="k"><b className="num">{route.stops.length}</b>拜访户数</div>
                  <div className="k"><b className="num">{route.visitMin}′</b>会谈时长</div>
                  <div className="k"><b className="num">{route.total}′</b>路上时间</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ---------------- 右：准备包 + 历史 ---------------- */}
        <div className="vp-right">
          <div className="card fade-in" style={{ animationDelay: '160ms' }}>
            <div className="card-h">
              <div className="card-t"><Briefcase size={14} />拜访准备包{selCand ? ` · ${selCand.name}` : ''}{run > 0 && !finished && runFor === sel?.id && <span className="pulse" />}</div>
              {selCand && <button className="btn sm" onClick={gen}>{finished ? <><RotateCcw size={12} />重新生成</> : <><Sparkles size={12} />生成准备包</>}</button>}
            </div>
            {!selCand && <div className="vp-empty"><div><div className="ring"><Briefcase size={20} /></div>在日程或路线中选中一次拜访，<br />生成该户的准备包。</div></div>}
            {selCand && (
              <>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
                  <span className={`chip ${selCand.tone === 'gold' ? '' : selCand.tone}`}><i />{selCand.kind}</span>
                  <span className="chip blue"><i />{selCand.district}</span>
                  <span className="chip"><i />{DAYS.find((d) => d.k === sel?.slot.split('-')[0])?.t} {HALVES.find((h) => h.k === sel?.slot.split('-')[1])?.t}</span>
                  <span className="chip green"><i />{selCand.contact}</span>
                </div>
                <p style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{selCand.purpose}</p>
                {run > 0 && runFor === sel?.id && !finished && (
                  <div className="think" style={{ marginTop: 10 }}>
                    {PREP_STEPS.map((s, i) => {
                      const st = i < n - 1 ? 'done' : i === n - 1 && n <= PREP_STEPS.length ? 'active' : 'pending';
                      if (st === 'pending') return null;
                      return (
                        <div key={s.t} className={`step fade-in ${st}`}>
                          <div className="n" style={st === 'done' ? { background: 'var(--g-green)' } : undefined}>{st === 'done' ? <Check size={12} /> : i + 1}</div>
                          <div style={{ flex: 1 }}><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><b>{s.t}</b>{st === 'active' && <span className="pulse" />}</div><p>{s.p}</p></div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {(run === 0 || runFor !== sel?.id) && <div className="vp-empty" style={{ minHeight: 120 }}><div>点击「生成准备包」，按「公开信息 → 本行合作 → 待办要点 → 材料礼仪」四步整理。</div></div>}
                {finished && pack && (
                  <div className="fade-in">
                    <div style={{ marginTop: 8 }}><span className="ai-tag"><Sparkles size={11} /> AI 生成 · 辅助建议 · 需人工复核</span></div>
                    <div className="vp-sec"><Newspaper size={12} />企业公开信息近况</div>
                    {pack.news.map((x) => <div key={x.text} className="vp-news"><span className="chip blue"><i />{x.src}</span><span>{x.text}</span></div>)}
                    <div className="vp-sec"><Landmark size={12} />本行合作情况</div>
                    <div className="kv vp-kv">
                      <div className="row"><span>合作年限</span><span>{pack.coop.years}</span></div>
                      <div className="row"><span>存款</span><span className="num">{pack.coop.deposit}</span></div>
                      <div className="row"><span>结算</span><span className="num">{pack.coop.settlement}</span></div>
                      <div className="row"><span>授信</span><span>{pack.coop.credit}</span></div>
                      <div className="row"><span>持有产品</span><span>{pack.coop.products}</span></div>
                      <div className="row"><span>上次联系</span><span>{pack.coop.last}</span></div>
                    </div>
                    <div className="vp-sec"><ListTodo size={12} />待办事项</div>
                    {pack.todos.map((t) => <div key={t} className={`vp-chk${todoDone[t] ? ' done' : ''}`} onClick={() => setTodoDone((d) => ({ ...d, [t]: !d[t] }))}><span className="bx">{todoDone[t] && <Check size={10} />}</span>{t}</div>)}
                    <div className="vp-sec"><Lightbulb size={12} />拜访要点提示</div>
                    {pack.points.map((p, i) => <div key={p} className="vp-point"><span className="n">{i + 1}</span><span>{p}</span></div>)}
                    <div className="vp-sec"><FileText size={12} />材料清单</div>
                    {pack.materials.map((m) => <div key={m} className={`vp-chk${matDone[m] ? ' done' : ''}`} onClick={() => setMatDone((d) => ({ ...d, [m]: !d[m] }))}><span className="bx">{matDone[m] && <Check size={10} />}</span>{m}</div>)}
                    <div className="vp-sec"><Building2 size={12} />竞品线索</div>
                    {pack.clues.map((x) => <div key={x.text} className="vp-clue"><span className="chip orange"><i />{x.src}</span><span>{x.text}</span></div>)}
                    <div className="vp-note"><ShieldCheck size={12} /> 线索均来自公开信息或客户授权信息，征信不用于营销准备。</div>
                    <div className="card dark" style={{ marginTop: 12, padding: '14px 16px' }}>
                      <div className="card-h" style={{ marginBottom: 8 }}><div className="card-t"><Shirt size={14} />会谈礼仪与着装卡</div><span className="card-s" style={{ color: 'rgba(255,248,232,.7)' }}>{selCand.kind} · {selCand.contact}</span></div>
                      <div className="vp-etq">
                        <div className="e"><b>会谈风格</b>{pack.etq.style}</div>
                        <div className="e"><b>着装建议</b>{pack.etq.dress}</div>
                        <div className="e"><b>开场</b>{pack.etq.open}</div>
                        <div className="e"><b>收尾</b>{pack.etq.close}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                      <button className="btn sm" onClick={() => setToast(`${selCand.name} 准备包已推送到手机，拜访前 1 小时提醒`)}><Smartphone size={12} />推送到手机</button>
                      <button className="btn sm gold" onClick={() => setToast(`已加入日程：${DAYS.find((d) => d.k === sel?.slot.split('-')[0])?.d} ${selCand.name}`)}><CalendarPlus size={12} />加入日程</button>
                      <button className="btn sm ghost" onClick={() => setToast('拜访后回填模板已生成，会后 2 小时内填写')}><Send size={12} />回填模板</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="card fade-in vp-hist" style={{ animationDelay: '220ms' }}>
            <div className="card-h"><div className="card-t"><History size={14} />历史记录</div><span className="card-s">最近拜访</span></div>
            {HISTORY.map((h) => <div key={h.d + h.t} className="h"><span className="d">{h.d}</span><span className="t">{h.t}</span><span className={`chip ${h.r === '已回填' ? 'green' : 'orange'}`} style={{ padding: '1px 8px', fontSize: 11 }}><i />{h.r}</span><ArrowRight size={12} color="var(--ink-3)" /></div>)}
          </div>
        </div>
      </div>

      {toast && <div className="vp-toast fade-in"><Check size={14} />{toast}</div>}
    </div>
  );
}
