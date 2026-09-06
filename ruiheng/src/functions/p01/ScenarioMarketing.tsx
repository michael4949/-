import { useEffect, useMemo, useState } from 'react';
import {
  Radar, Sparkles, Check, RotateCcw, Search, ShieldCheck, ChevronRight, Download, History, CalendarDays, CalendarClock, Zap, Layers,
  MessageSquareText, Clock, TrendingUp, Building2, Workflow, AlertTriangle, ArrowRight, BadgeCheck, Coins, Send, Bell, Target,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList } from 'recharts';
import { COMPANIES, companyById } from '../../data/companies';
import { PERSONAS } from '../../data/personas';
import { rng, fmtWan } from '../../lib/rng';

/* ------------------------------------------------------------------ 页面样式（仅本页，前缀 sm-） */
const CSS = `
.sm-crumb{font-size:12.5px;color:var(--ink-3);margin-bottom:2px;display:flex;align-items:center;gap:4px}
.sm-crumb b{color:var(--ink)}
.sm-top{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:14px}
.sm-top h1{font-size:24px;font-weight:900;display:flex;align-items:center;gap:8px;letter-spacing:.01em}
.sm-top p{color:var(--ink-3);font-size:13px;margin-top:4px}
.sm-acts{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;flex-shrink:0}
.sm-note{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:14px}
.sm-mt{margin-top:16px}
.sm-muted{color:var(--ink-3);font-size:12px}
.sm-g21{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:16px;align-items:start}
.sm-g12{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.6fr);gap:16px;align-items:start}
@media(max-width:1100px){.sm-g21,.sm-g12{grid-template-columns:1fr}}
.sm-sec{display:flex;align-items:center;gap:8px;font-size:11.5px;font-weight:800;letter-spacing:.14em;color:var(--gold-3);margin:14px 0 8px}
.sm-sec:first-child{margin-top:0}
.sm-sec::after{content:"";flex:1;height:1px;background:linear-gradient(90deg,rgba(201,162,77,.45),rgba(61,187,134,.25),rgba(255,255,255,0))}
.sm-tools{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:10px}
.sm-in{display:flex;align-items:center;gap:6px;padding:6px 10px;border-radius:9px;background:var(--g-holo-2);box-shadow:inset 0 0 0 1px rgba(201,162,77,.3);font-size:12.5px}
.sm-in input{border:0;outline:0;background:transparent;font-family:inherit;font-size:12.5px;color:var(--ink);width:140px}
.sm-tg{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:999px;font-size:11.5px;font-weight:700;cursor:pointer;user-select:none;background:var(--g-holo-2);box-shadow:inset 0 0 0 1px rgba(201,162,77,.22);color:var(--ink-3)}
.sm-tg i{width:8px;height:8px;border-radius:50%;opacity:.35}
.sm-tg.on{color:var(--ink);background:var(--g-gold-soft)}
.sm-tg.on i{opacity:1}
.sm-ev{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:12px;align-items:center;padding:10px 12px;border-radius:13px;margin-bottom:7px;cursor:pointer;background:linear-gradient(90deg,rgba(255,255,255,.75),rgba(255,247,236,.6) 60%,rgba(236,248,243,.55));box-shadow:inset 0 0 0 1px rgba(201,162,77,.15);transition:transform .15s}
.sm-ev:hover{transform:translateX(2px);box-shadow:inset 0 0 0 1px rgba(201,162,77,.45),var(--shadow-sm)}
.sm-ev.sel{box-shadow:inset 0 0 0 2px rgba(195,39,43,.5),var(--shadow-sm)}
.sm-ev.exp{background:linear-gradient(90deg,rgba(255,255,255,.6),rgba(238,244,255,.6) 60%,rgba(245,238,255,.5))}
.sm-ev .ico{width:38px;height:38px;border-radius:11px;display:grid;place-items:center;color:#fff;flex-shrink:0;font-weight:900;font-size:11px}
.sm-ev .t{font-weight:800;font-size:13px;display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.sm-ev .s{font-size:12px;color:var(--ink-2);margin-top:2px}
.sm-ev .m{display:flex;gap:6px;flex-wrap:wrap;margin-top:5px;align-items:center;font-size:11px;color:var(--ink-3)}
.sm-ev .rt{text-align:right;white-space:nowrap;font-size:11px;color:var(--ink-3)}
.sm-ev .rt b{display:block;font-size:12.5px;color:var(--ink)}
.sm-cal{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px}
.sm-cal .h{font-size:11px;font-weight:800;color:var(--ink-3);text-align:center;padding:2px 0}
.sm-cal .d{min-height:54px;padding:5px 6px;border-radius:10px;background:var(--g-holo-2);box-shadow:inset 0 0 0 1px rgba(201,162,77,.14);cursor:pointer;font-size:11.5px;font-weight:700;color:var(--ink-2);position:relative}
.sm-cal .d:hover{box-shadow:inset 0 0 0 1px rgba(201,162,77,.45)}
.sm-cal .d.off{opacity:.35;cursor:default}
.sm-cal .d.today{background:var(--g-red-soft);color:var(--red-3)}
.sm-cal .d.sel{box-shadow:inset 0 0 0 2px rgba(195,39,43,.5)}
.sm-cal .d.fut{background:linear-gradient(135deg,rgba(255,255,255,.7),rgba(238,244,255,.6))}
.sm-cal .dots{display:flex;gap:3px;flex-wrap:wrap;margin-top:4px}
.sm-cal .dots i{width:7px;height:7px;border-radius:50%;display:block}
.sm-cal .n{position:absolute;right:5px;top:4px;font-size:10px;font-weight:800;color:var(--ink-3)}
.sm-legend{display:flex;gap:8px;flex-wrap:wrap;font-size:11px;color:var(--ink-2);margin-top:8px}
.sm-legend i{display:inline-block;width:9px;height:9px;border-radius:50%;vertical-align:-1px;margin-right:3px}
.sm-svg{margin-top:8px;border-radius:12px;background:var(--g-holo-2);box-shadow:inset 0 0 0 1px rgba(201,162,77,.18);padding:6px;overflow-x:auto}
.sm-svg svg{width:100%;height:auto;display:block;min-width:560px}
.sm-kv{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.sm-kv .k{padding:9px 11px;border-radius:11px;background:var(--g-holo-2);box-shadow:inset 0 0 0 1px rgba(201,162,77,.18);font-size:11.5px;color:var(--ink-3)}
.sm-kv .k b{display:block;font-size:17px;color:var(--ink)}
.sm-kv .k.g{background:var(--g-green-soft)} .sm-kv .k.b{background:var(--g-blue-soft)} .sm-kv .k.p{background:var(--g-purple-soft)} .sm-kv .k.o{background:var(--g-gold-soft)}
.sm-empty{min-height:200px;display:grid;place-items:center;text-align:center;color:var(--ink-3);font-size:13px}
.sm-empty .ring{width:54px;height:54px;border-radius:50%;background:var(--g-iris-soft);display:grid;place-items:center;margin:0 auto 10px;box-shadow:inset 0 0 0 1px rgba(201,162,77,.3)}
.sm-step.active{box-shadow:inset 0 0 0 1px rgba(195,39,43,.45),var(--shadow-sm)}
.sm-step.done .n{background:var(--g-green)}
.sm-step .bd{flex:1;min-width:0}
.sm-step .hd{display:flex;align-items:center;gap:8px}
.sm-tw{overflow-x:auto}
.sm-prod td .nm{font-weight:800}
.sm-prod td .nt{font-size:11px;color:var(--ink-3)}
.sm-svc{display:flex;gap:6px;flex-wrap:wrap}
.sm-talk{display:flex;gap:10px;align-items:flex-start;padding:9px 12px;border-radius:12px;background:var(--g-green-soft);margin-bottom:6px;font-size:12.5px;line-height:1.6}
.sm-talk .q{width:22px;height:22px;border-radius:50%;background:var(--g-green);color:#fff;font-weight:900;font-size:11px;display:grid;place-items:center;flex-shrink:0}
.sm-time{display:flex;gap:10px;align-items:center;padding:10px 12px;border-radius:12px;background:var(--g-gold-soft);font-size:12.5px;font-weight:700}
.sm-warn{display:flex;gap:8px;align-items:flex-start;padding:9px 12px;border-radius:12px;background:linear-gradient(135deg,#fff3e6,#ffdcb8 60%,#fde8d2);color:#a34e0a;font-size:12px;margin-top:8px}
.sm-ul{list-style:none;display:flex;flex-direction:column;gap:5px}
.sm-ul li{position:relative;padding-left:14px;font-size:12.5px;color:var(--ink-2)}
.sm-ul li::before{content:"";position:absolute;left:0;top:8px;width:7px;height:7px;border-radius:50%;background:var(--g-iris)}
.sm-toast{position:fixed;left:50%;bottom:46px;transform:translateX(-50%);z-index:60;padding:10px 18px;border-radius:999px;background:var(--g-green);color:#fff;font-weight:700;font-size:13px;box-shadow:0 12px 30px rgba(31,138,90,.3);display:inline-flex;align-items:center;gap:8px}
.sm-tip{padding:8px 11px;border-radius:10px;background:var(--g-holo);box-shadow:var(--shadow),inset 0 0 0 1px rgba(201,162,77,.3);font-size:12px}
.sm-hist .li{align-items:flex-start}
.sm-hist .li .tm{margin-left:auto;font-size:11px;color:var(--ink-3);white-space:nowrap}
.sm-hero{display:flex;align-items:center;gap:14px}
.sm-hero .big{width:52px;height:52px;border-radius:14px;display:grid;place-items:center;color:#fff;font-weight:900;font-size:13px;flex-shrink:0;box-shadow:0 8px 18px rgba(0,0,0,.12)}
.sm-hero h2{font-size:18px;font-weight:900}
`;

/* ------------------------------------------------------------------ 数据 */
type EvType = '获定点' | '中标' | '旺季备货' | '设备采购' | '出口收汇' | '并购' | '新设子公司' | '政策补贴';
type Src = '公开公告' | '客户告知' | '招投标公告' | '工商登记' | '政府公示';
type Conf = '高' | '中' | '低';
interface Ev { id: string; type: EvType; co: string; title: string; detail: string; src: Src; day: number; time: string; conf: Conf; rule: string; amount: number; expected?: boolean; caution?: string }

const TYPE_COLOR: Record<EvType, string> = { 获定点: '#e63946', 中标: '#3a86ff', 旺季备货: '#f4b942', 设备采购: '#9b5de5', 出口收汇: '#00b4d8', 并购: '#ff5da2', 新设子公司: '#ff8c42', 政策补贴: '#2dc48d' };
const TYPES = Object.keys(TYPE_COLOR) as EvType[];
const CONF_TONE: Record<Conf, string> = { 高: 'green', 中: '', 低: 'red' };
const SRC_TONE: Record<Src, string> = { 公开公告: 'blue', 客户告知: 'purple', 招投标公告: 'blue', 工商登记: 'blue', 政府公示: 'blue' };

const EVENTS: Ev[] = [
  { id: 'e02', type: '中标', co: 'c10', title: '中标某市 120MW 光伏电站组件供货', detail: '合同额约 2.6 亿，交付周期 8 个月，履约保函比例 10%', src: '招投标公告', day: 1, time: '08:15', conf: '高', rule: '规则 S-03：中标公示（公开）+ 客户经理电话确认', amount: 26000 },
  { id: 'e13', type: '政策补贴', co: 'c12', title: '涉农设施补贴 120 万进入公示名单', detail: '区农业农村局公示，公示期 7 天，预计 10 月到账', src: '政府公示', day: 1, time: '10:00', conf: '高', rule: '规则 S-08：政府公示名单（公开）', amount: 120 },
  { id: 'e01', type: '获定点', co: 'ninggui', title: '获某新能源车企定点，SOP 后年供货约 1.2 亿', detail: '定点通知已取得，SOP 预计 2027 年 3 月，模具与设备需提前到位', src: '客户告知', day: 2, time: '09:40', conf: '高', rule: '规则 S-01：客户书面告知 + 公开招标结果交叉验证', amount: 12000 },
  { id: 'e08', type: '新设子公司', co: 'c10', title: '新设储能子公司（100% 持股）', detail: '注册资本 5,000 万，经营范围含储能系统集成，尚未开立基本户', src: '工商登记', day: 2, time: '15:45', conf: '高', rule: '规则 S-06：工商登记信息（公开）', amount: 5000 },
  { id: 'e06', type: '设备采购', co: 'c11', title: '采购 20 台新能源重卡', detail: '公开招标预算约 1,400 万，交付期 60 天', src: '招投标公告', day: 3, time: '11:30', conf: '高', rule: '规则 S-05：公开招标公告 + 客户确认', amount: 1400 },
  { id: 'e12', type: '旺季备货', co: 'c09', title: '国庆中秋备货，采购付款集中于 9 月下旬', detail: '中央厨房原料采购约 600 万，供应商要求款到发货', src: '客户告知', day: 3, time: '13:20', conf: '中', rule: '规则 S-04：客户告知 + 结算规律（近月结算量环比 +28%）', amount: 600 },
  { id: 'e07', type: '政策补贴', co: 'c08', title: '省级专精特新奖补 200 万公示', detail: '省工信厅公示名单，配套可申报知识产权质押贴息', src: '政府公示', day: 3, time: '16:00', conf: '高', rule: '规则 S-08：政府公示名单（公开）', amount: 200 },
  { id: 'e03', type: '并购', co: 'shenghe', title: '拟收购区域乳品企业 51% 股权', detail: '交易对价约 3.2 亿，处于尽调阶段，预计年内交割', src: '公开公告', day: 4, time: '10:20', conf: '中', rule: '规则 S-07：单一公开来源，交易安排尚未与客户确认', amount: 32000 },
  { id: 'e14', type: '中标', co: 'c07', title: '中标某产业园幕墙建材供货', detail: '合同额 1,800 万，账期 90 天，客户结算量此前环比下降 35%', src: '招投标公告', day: 4, time: '15:10', conf: '中', rule: '规则 S-03：中标公示（公开），客户未确认履约安排', amount: 1800 },
  { id: 'e09', type: '新设子公司', co: 'c06', title: '新设医药冷链子公司', detail: '注册资本 2,000 万，续贷 60 天内到期，可同步办理', src: '工商登记', day: 5, time: '09:30', conf: '高', rule: '规则 S-06：工商登记信息（公开）', amount: 2000 },
  { id: 'e04', type: '旺季备货', co: 'caisheng', title: '四季度旺季备货，资金缺口约 800 万', detail: '晟禾食品华南一级经销商，年销售约 2.5 亿，账期 45 天', src: '客户告知', day: 5, time: '14:05', conf: '高', rule: '规则 S-04：客户告知 + 历史同期结算规律（近 2 年 Q4 结算量 +60%）', amount: 800, caution: '客户存在被执行信息 860 万，结算量降 62%：方案须以晟禾发货与回款闭环为依据，先通过准入核查再营销。' },
  { id: 'e15', type: '政策补贴', co: 'c10', title: '新能源技改补贴 600 万公示', detail: '市发改委技改专项公示，配套技改项目总投资 6 亿', src: '政府公示', day: 6, time: '08:30', conf: '高', rule: '规则 S-08：政府公示名单（公开）', amount: 600 },
  { id: 'e05', type: '设备采购', co: 'ninggui', title: '采购 2 台五轴加工中心', detail: '合同额约 1,800 万，需在 SOP 前到位；客户已有融资租赁渠道', src: '客户告知', day: 6, time: '09:10', conf: '低', rule: '规则 S-05：客户口头提及，待设备采购合同印证', amount: 1800 },
  { id: 'e16', type: '旺季备货', co: 'shenghe', title: '中秋国庆旺季，经销商备货款集中回笼', detail: '预计 9 月中下旬回款约 3,000 万，经销商付款方式以票据为主', src: '客户告知', day: 12, time: '预计', conf: '中', rule: '规则 S-04：客户告知 + 近 2 年同期回款规律', amount: 3000, expected: true },
  { id: 'e10', type: '出口收汇', co: 'c05', title: '东盟 9 月收汇高峰，预计收汇 380 万美元', detail: '美元结算，近 12 个月 9 月收汇均为年内高点', src: '客户告知', day: 20, time: '预计', conf: '中', rule: '规则 S-09：客户告知 + 近 12 个月收汇规律', amount: 2700, expected: true },
  { id: 'e11', type: '出口收汇', co: 'ninggui', title: '出口收汇 120 万美元到账', detail: '账期 60–90 天，出口收汇占营收 30%', src: '客户告知', day: 25, time: '预计', conf: '中', rule: '规则 S-09：客户告知 + 出口合同账期推算', amount: 850, expected: true },
];

interface Need { need: string; amt: number; when: string }
interface Prod { name: string; amt: number; term: string; note: string; kind: '融资' | '结算' | '避险' | '服务' }
interface Plan { scene: string; chain: Need[]; products: Prod[]; services: string[]; talk: string[]; timing: string; base: number; entry: string }

function buildPlan(e: Ev): Plan {
  const a = e.amount;
  switch (e.type) {
    case '获定点': {
      const equip = a * 0.3, stock = (a / 12) * 1.5, fx = a * 0.3;
      return { scene: '定点扩产 · 设备投入 → 放量备货 → 收汇避险', chain: [{ need: '模具与设备投入', amt: equip, when: 'SOP 前 3–6 个月' }, { need: 'SOP 放量后备货', amt: stock, when: 'SOP 后持续，周期 45 天' }, { need: '出口收汇汇率敞口', amt: fx, when: '账期 60–90 天' }],
        products: [{ name: '固定资产贷款 / 设备融资租赁', amt: equip * 0.7, term: '5 年', note: '以定点通知与设备合同为依据，避免短贷长投', kind: '融资' }, { name: '备货流动资金贷款', amt: stock, term: '1 年', note: '按订单排产周期匹配', kind: '融资' }, { name: '供应链票据', amt: stock * 0.6, term: '6 个月', note: '向上游铝材、模具供应商付款', kind: '融资' }, { name: '远期结汇', amt: fx, term: '3–12 个月', note: '锁定汇率，分批叙做', kind: '避险' }],
        services: ['代发工资', '收付款直联', '出口信保对接', '专属产品经理'], talk: ['定点是里程碑，设备与备货资金要在 SOP 前到位，本行可按项目周期匹配 5 年期设备融资，不用短贷养长投。', '放量后的备货可配供应链票据，综合成本随结算量提升还有下调空间。', '出口部分用远期结汇把汇率锁住；利率与担保方式以审批结果为准，争取 30 天内答复。'],
        timing: '定点公告后 2 周内首访；SOP 前 3 个月完成设备融资审批', base: 0.62, entry: '先谈 SOP 排期与设备到位计划，再谈资金安排' };
    }
    case '中标': {
      return { scene: '中标履约 · 保函 → 备料垫资 → 应收周转', chain: [{ need: '履约保函', amt: a * 0.1, when: '合同签订时' }, { need: '备料与生产垫资', amt: a * 0.35, when: '开工后 1–3 个月' }, { need: '应收账款周转', amt: a * 0.5, when: '交付后账期内' }],
        products: [{ name: '履约保函', amt: a * 0.1, term: '合同期', note: '线上开立，保证金比例按审批', kind: '融资' }, { name: '订单融资', amt: a * 0.35 * 0.7, term: '≤ 1 年', note: '以中标通知书与合同为依据', kind: '融资' }, { name: '应收账款保理', amt: a * 0.5 * 0.8, term: '≤ 1 年', note: '买方为政府或大型企业时优先', kind: '融资' }, { name: '回款专户与结算归集', amt: a, term: '合同期', note: '合同回款约定至本行账户', kind: '结算' }],
        services: ['保函在线开立', '回款专户', '项目进度对账'], talk: ['中标后最先用到的是保函，本行可在合同签订前完成审批，不耽误签约。', '备料垫资以订单为依据，交付回款后自动归还，不占用其他授信。', '回款走本行专户，后续保理与续做都更顺畅。'],
        timing: '中标公示后 1 周内、合同签订前完成首访', base: 0.66, entry: '以保函时效切入' };
    }
    case '旺季备货': {
      return { scene: '旺季备货 · 备货缺口 → 向上游付款 → 回款归集', chain: [{ need: '备货资金缺口', amt: a, when: '备货前 3 周' }, { need: '向核心企业 / 供应商付款', amt: a * 0.6, when: '备货期内分批' }, { need: '零售 / 渠道回款归集', amt: a * 2.2, when: '旺季 45–60 天' }],
        products: [{ name: '经销商订单融资', amt: a * 0.625, term: '45 天–6 个月', note: '以核心企业发货与回款闭环为依据', kind: '融资' }, { name: '银行承兑汇票', amt: a * 0.375, term: '6 个月', note: '用于向核心企业付款', kind: '融资' }, { name: '收款码与现金管理', amt: a * 2.2, term: '持续', note: '归集零售回款，对接核心企业平台', kind: '结算' }],
        services: ['收款码', '现金管理', '核心企业平台对接'], talk: ['备货不占用自有资金：以核心企业发货与回款闭环为依据做订单融资，旺季过后自动归还。', '向核心企业付款可用银票，账期相当于延长 6 个月。', '零售回款走本行收款码归集，下季度额度可随结算量上调。'],
        timing: '备货前 3 周首访，两周内完成申请材料', base: 0.6, entry: '先通过核心企业销售总监引荐，以「备货不占用自有资金」为主题' };
    }
    case '设备采购': {
      return { scene: '设备采购 · 设备款支付 → 安装调试 → 折旧期现金流', chain: [{ need: '设备款支付', amt: a, when: '合同签订后 30–90 天' }, { need: '安装调试与配套流动资金', amt: a * 0.15, when: '到货后 1–2 个月' }, { need: '折旧期现金流匹配', amt: a * 0.7, when: '3–5 年' }],
        products: [{ name: '设备融资租赁', amt: a * 0.7, term: '3–5 年', note: '与本行合作租赁公司联合方案', kind: '融资' }, { name: '固定资产贷款', amt: a * 0.7, term: '5 年', note: '二选一，按客户税务与报表偏好', kind: '融资' }, { name: '国内信用证', amt: a * 0.3, term: '6 个月', note: '设备尾款延期支付', kind: '融资' }, { name: '付款直联与对账', amt: a, term: '合同期', note: '设备款走本行支付', kind: '结算' }],
        services: ['付款直联', '设备保险对接'], talk: ['设备款用 3–5 年的融资租赁或固贷匹配折旧期，现金流更平滑。', '尾款可用国内信用证，延后 6 个月支付，不影响供应商交付。', '若客户已有租赁渠道，本行方案在期限或综合成本上给出差异。'],
        timing: '合同签订前（付款条件谈判期）首访', base: 0.55, entry: '以付款条件设计切入' };
    }
    case '出口收汇': {
      return { scene: '出口收汇 · 结汇 → 汇率避险 → 出口垫资', chain: [{ need: '收汇结汇', amt: a, when: '到账后即时' }, { need: '汇率风险敞口', amt: a, when: '账期 60–90 天' }, { need: '出口订单垫资', amt: a * 0.5, when: '发货后至收汇' }],
        products: [{ name: '远期结汇 / 期权组合', amt: a, term: '3–12 个月', note: '分批锁定，保留部分敞口', kind: '避险' }, { name: '出口押汇', amt: a * 0.5, term: '≤ 90 天', note: '发货后凭单据融资', kind: '融资' }, { name: '出口信保融资', amt: a * 0.5, term: '≤ 1 年', note: '已投保客户优先', kind: '融资' }, { name: '跨境收汇结算', amt: a, term: '持续', note: '收汇路径迁至本行', kind: '结算' }],
        services: ['跨境收汇', '外汇账户管理', '出口退税专户'], talk: ['收汇前两周把汇率锁一部分，波动就不会吃掉利润。', '发货后可以先押汇，账期内不用等回款。', '收汇路径迁到本行后，结汇价格与融资额度联动。'],
        timing: '收汇前 2 周锁定汇率；月初安排拜访', base: 0.58, entry: '以汇率走势与锁汇比例讨论切入' };
    }
    case '并购': {
      return { scene: '并购整合 · 交易对价 → 过渡期资金 → 整合归集', chain: [{ need: '交易对价支付', amt: a, when: '交割日' }, { need: '过渡期流动资金', amt: a * 0.1, when: '交割后 6 个月' }, { need: '整合后资金归集', amt: a * 0.3, when: '交割后持续' }],
        products: [{ name: '并购贷款', amt: a * 0.6, term: '≤ 7 年', note: '以行内并购贷款管理办法为准，需并购尽调', kind: '融资' }, { name: '并购顾问与资金监管', amt: a, term: '交易期', note: '监管账户、交割资金安排', kind: '服务' }, { name: '标的企业账户归集', amt: a * 0.3, term: '持续', note: '标的纳入集团现金管理', kind: '结算' }],
        services: ['资金监管账户', '并购顾问', '标的企业开户'], talk: ['并购贷款可覆盖对价的一部分，期限与整合周期匹配；具体比例以审批为准。', '交割资金走本行监管账户，双方都放心。', '标的公司账户纳入集团归集，整合期资金看得见。'],
        timing: '公告后至交割前（尽调期）首访，先谈资金监管再谈并购贷', base: 0.48, entry: '以交割资金监管切入' };
    }
    case '新设子公司': {
      return { scene: '新设子公司 · 实缴开户 → 初期运营 → 母子归集', chain: [{ need: '注册资本实缴与开户', amt: a, when: '登记后 2–4 周' }, { need: '初期运营资金', amt: a * 0.3, when: '开业后 6 个月' }, { need: '母子公司资金往来', amt: a * 0.8, when: '持续' }],
        products: [{ name: '基本户开立与验资', amt: a, term: '即时', note: '上门开户，当日启用', kind: '结算' }, { name: '集团资金归集（母子账户）', amt: a * 0.8, term: '持续', note: '与母公司账户体系打通', kind: '结算' }, { name: '初期流动资金贷款', amt: a * 0.3, term: '1 年', note: '母公司担保或信用', kind: '融资' }],
        services: ['上门开户', '代发工资', '票据与网银'], talk: ['新公司开户我们可以上门办，当天启用，代发与网银一并开通。', '母子公司账户打通后，资金调拨不用来回转账。', '初期运营资金可由母公司担保，额度以审批为准。'],
        timing: '工商登记后 2 周内（开户窗口期）', base: 0.7, entry: '以上门开户切入' };
    }
    case '政策补贴':
    default: {
      return { scene: '政策补贴 · 补贴到账 → 配套项目资金 → 信用增强', chain: [{ need: '补贴资金到账', amt: a, when: '公示期后 2–4 周' }, { need: '配套项目资金', amt: a * 3, when: '项目期 1–3 年' }, { need: '资质认定带来的信用增强', amt: a * 5, when: '认定有效期内' }],
        products: [{ name: '补贴专户与归集', amt: a, term: '即时', note: '补贴指定账户为本行账户', kind: '结算' }, { name: '专精特新 / 涉农信用贷', amt: a * 3, term: '1–3 年', note: '凭认定资质，信用方式', kind: '融资' }, { name: '知识产权质押 / 贴息对接', amt: a * 2, term: '1–3 年', note: '对接政府贴息', kind: '融资' }],
        services: ['补贴专户', '政策申报辅导', '贴息对接'], talk: ['补贴到账账户可以指定本行，后续贴息申报我们帮着对接。', '有了认定资质，本行有对应的信用贷产品，不需要抵押。', '项目配套资金按项目期匹配，额度以审批为准。'],
        timing: '公示期结束后 1 周内', base: 0.64, entry: '以补贴专户与贴息对接切入' };
    }
  }
}
const confFactor: Record<Conf, number> = { 高: 1, 中: 0.82, 低: 0.62 };
function effectOf(e: Ev, p: Plan) {
  const co = companyById(e.co);
  const credit = p.products.filter((x) => x.kind === '融资').reduce((s, x) => s + x.amt, 0);
  const settle = p.products.filter((x) => x.kind === '结算').reduce((s, x) => s + x.amt, 0) || p.chain.reduce((s, x) => s + x.amt, 0) * 0.5;
  const fx = p.products.filter((x) => x.kind === '避险').reduce((s, x) => s + x.amt, 0);
  const income = credit * 0.012 + settle * 0.0015 + fx * 0.004;
  const relF = co.relation.includes('贷款') ? 1.05 : 0.95;
  const riskF = co.risk === 'red' ? 0.6 : co.risk === 'orange' ? 0.85 : 1;
  const prob = Math.round(Math.min(0.9, p.base * confFactor[e.conf] * relF * riskF) * 100);
  return { credit, settle, fx, income, prob };
}
const P = (id: string) => PERSONAS.find((p) => p.id === id)!;
const AI_TAG = <span className="ai-tag"><Sparkles size={11} /> AI 生成 · 辅助建议 · 需人工复核</span>;
const SHORT: Record<EvType, string> = { 获定点: '定点', 中标: '中标', 旺季备货: '备货', 设备采购: '设备', 出口收汇: '收汇', 并购: '并购', 新设子公司: '新设', 政策补贴: '补贴' };
const TODAY = 6;
const HIST0 = [
  { time: '09-05 15:30', text: '彩晟商贸 · 旺季备货 · 方案已生成，待准入核查', tone: 'orange' },
  { time: '09-04 11:10', text: '东岭新能源 · 中标 · 履约保函方案推送至拜访计划（09-08）', tone: 'green' },
  { time: '09-03 16:45', text: '汇源物流 · 设备采购 · 融资租赁方案已导出一页纸', tone: 'blue' },
  { time: '09-02 10:05', text: '宁桂精密机械 · 获定点 · 场景识别完成，方案待生成', tone: 'purple' },
];
const PUSHED0: Record<string, string> = { e02: '09-08 拜访' };

function useSteps(total: number, running: boolean, token: number, gap = 780) {
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
function stepsOf(e: Ev, p: Plan, eff: ReturnType<typeof effectOf>) {
  const co = companyById(e.co);
  return [
    { t: '场景信号核验', p: `${co.name} · ${e.type}：${e.title}。来源 ${e.src}，${e.rule}，置信 ${e.conf}。` },
    { t: '资金需求链推演', p: p.chain.map((c) => `${c.need}（${fmtWan(c.amt)}，${c.when}）`).join(' → ') + '。' },
    { t: '产品准入匹配', p: `匹配行内场景产品包「${p.scene.split(' · ')[0]}」：${p.products.map((x) => x.name).join(' / ')}；既有持有产品：${co.relation}，${co.tags.join('、')}。` },
    { t: '额度与期限测算', p: `按行内产品参数确定性测算：融资类合计 ${fmtWan(eff.credit)}，结算归集 ${fmtWan(eff.settle)}${eff.fx ? `，避险名义金额 ${fmtWan(eff.fx)}` : ''}；准入与额度以审批为准。` },
    { t: '触达策略', p: `${p.entry}；最佳触达时点：${p.timing}。关键人：财务负责人 + 业务负责人；客户经理 ${P(co.owner).name}。` },
    { t: '效果预估', p: `转化概率 ${eff.prob}%（场景基准 ${Math.round(p.base * 100)}% × 置信 ${confFactor[e.conf]} × 关系与风险系数），预计中收 ${fmtWan(eff.income)}。${e.caution ? '准入提示：' + e.caution : ''}` },
  ];
}

/* ------------------------------------------------------------------ 需求链图 */
function ChainMap({ e, p }: { e: Ev; p: Plan }) {
  const col = TYPE_COLOR[e.type];
  const rows = p.chain.map((_, i) => 40 + i * 78);
  const prods = p.products.slice(0, 3);
  const curve = (x0: number, y0: number, x1: number, y1: number) => `M ${x0} ${y0} C ${(x0 + x1) / 2} ${y0}, ${(x0 + x1) / 2} ${y1}, ${x1} ${y1}`;
  const evY = rows[Math.floor(rows.length / 2)];
  return (
    <div className="sm-svg">
      <svg viewBox="0 0 920 280" role="img" aria-label="资金需求链">
        <defs>
          <linearGradient id="sm-c-ev" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={col} /><stop offset="1" stopColor={col} stopOpacity=".6" /></linearGradient>
          <linearGradient id="sm-c-need" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f7e2a5" /><stop offset="1" stopColor="#c9a24d" /></linearGradient>
          <linearGradient id="sm-c-prod" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#5fd3a0" /><stop offset="1" stopColor="#1f8a5a" /></linearGradient>
          <linearGradient id="sm-c-line" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor={col} /><stop offset="1" stopColor="#c9a24d" /></linearGradient>
          <linearGradient id="sm-c-line2" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#c9a24d" /><stop offset="1" stopColor="#1f8a5a" /></linearGradient>
          <marker id="sm-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#9c7a2e" /></marker>
        </defs>
        <text x={110} y={18} textAnchor="middle" fontSize="11" fontWeight="800" fill="#8c8478" letterSpacing="2">经营事件</text>
        <text x={440} y={18} textAnchor="middle" fontSize="11" fontWeight="800" fill="#8c8478" letterSpacing="2">触发的资金需求</text>
        <text x={790} y={18} textAnchor="middle" fontSize="11" fontWeight="800" fill="#8c8478" letterSpacing="2">本行产品</text>
        {rows.map((y, i) => <path key={i} d={curve(215, evY, 320, y + 30)} stroke="url(#sm-c-line)" strokeWidth="2.5" fill="none" markerEnd="url(#sm-arr)" />)}
        {prods.map((_, i) => <path key={i} d={curve(560, rows[Math.min(i, rows.length - 1)] + 30, 670, rows[Math.min(i, rows.length - 1)] + 30)} stroke="url(#sm-c-line2)" strokeWidth="2.5" fill="none" markerEnd="url(#sm-arr)" />)}
        <rect x={10} y={evY - 36} width={205} height={72} rx="14" fill="url(#sm-c-ev)" />
        <text x={112} y={evY - 12} textAnchor="middle" fontSize="12.5" fontWeight="900" fill="#fff">{e.type} · {companyById(e.co).name}</text>
        <text x={112} y={evY + 6} textAnchor="middle" fontSize="10.5" fill="rgba(255,255,255,.92)">{e.title.length > 18 ? e.title.slice(0, 18) + '…' : e.title}</text>
        <text x={112} y={evY + 22} textAnchor="middle" fontSize="10.5" fontWeight="800" fill="#fff">{fmtWan(e.amount)}</text>
        {p.chain.map((c, i) => (
          <g key={c.need}>
            <rect x={320} y={rows[i]} width={240} height={60} rx="12" fill="url(#sm-c-need)" />
            <text x={440} y={rows[i] + 22} textAnchor="middle" fontSize="12" fontWeight="900" fill="#3a2a08">{i + 1}. {c.need}</text>
            <text x={440} y={rows[i] + 40} textAnchor="middle" fontSize="10.5" fill="#5a4410">{fmtWan(c.amt)} · {c.when}</text>
          </g>
        ))}
        {prods.map((x, i) => (
          <g key={x.name}>
            <rect x={670} y={rows[Math.min(i, rows.length - 1)]} width={240} height={60} rx="12" fill="url(#sm-c-prod)" />
            <text x={790} y={rows[Math.min(i, rows.length - 1)] + 22} textAnchor="middle" fontSize="12" fontWeight="900" fill="#fff">{x.name.length > 14 ? x.name.slice(0, 14) + '…' : x.name}</text>
            <text x={790} y={rows[Math.min(i, rows.length - 1)] + 40} textAnchor="middle" fontSize="10.5" fill="rgba(255,255,255,.92)">额度参考 {fmtWan(x.amt)} · {x.term}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function ChartTip({ active, payload }: { active?: boolean; payload?: ReadonlyArray<{ payload?: unknown }> }) {
  const d = payload?.[0]?.payload as { name: string; amt: number; term: string } | undefined;
  if (!active || !d) return null;
  return <div className="sm-tip"><b>{d.name}</b><div className="sm-muted">额度参考 {fmtWan(d.amt)} · {d.term}</div></div>;
}

/* ------------------------------------------------------------------ 页面 */
export default function ScenarioMarketing() {
  const [q, setQ] = useState('');
  const [types, setTypes] = useState<Record<EvType, boolean>>(() => Object.fromEntries(TYPES.map((t) => [t, true])) as Record<EvType, boolean>);
  const [day, setDay] = useState<number | null>(null);
  const [sel, setSel] = useState<string>('e01');
  const [run, setRun] = useState(0);
  const [pushed, setPushed] = useState<Record<string, string>>(PUSHED0);
  const [toast, setToast] = useState('');
  const [hist, setHist] = useState(HIST0);

  const ev = EVENTS.find((x) => x.id === sel) ?? EVENTS[0];
  const co = companyById(ev.co);
  const plan = useMemo(() => buildPlan(ev), [ev]);
  const eff = useMemo(() => effectOf(ev, plan), [ev, plan]);
  const steps = useMemo(() => stepsOf(ev, plan, eff), [ev, plan, eff]);
  const n = useSteps(steps.length, run > 0, run);
  const finished = run > 0 && n > steps.length;
  const list = EVENTS.filter((e) => types[e.type] && (day == null || e.day === day) && (!q || companyById(e.co).name.includes(q) || e.title.includes(q) || e.type.includes(q)))
    .sort((a, b) => (a.expected === b.expected ? (a.day === b.day ? a.time.localeCompare(b.time) : a.day - b.day) : a.expected ? 1 : -1));
  const firstDow = (new Date(2026, 8, 1).getDay() + 6) % 7; // 周一为 0
  const cells = useMemo(() => { const arr: (number | null)[] = []; for (let i = 0; i < firstDow; i++) arr.push(null); for (let d = 1; d <= 30; d++) arr.push(d); while (arr.length % 7) arr.push(null); return arr; }, [firstDow]);
  const flash = (m: string) => { setToast(m); window.setTimeout(() => setToast(''), 2600); };
  const now = () => '09-06 ' + new Date().toTimeString().slice(0, 5);
  const pick = (id: string) => { setSel(id); setRun(0); };
  const generate = () => { setRun((r) => r + 1); setHist((h) => [{ time: now(), text: `${co.name} · ${ev.type} · 一键生成方案`, tone: 'purple' }, ...h]); };
  const push = () => {
    const d = ev.expected ? Math.max(TODAY + 2, ev.day - 10) : TODAY + 2 + (rng(ev.day * 7)() > 0.5 ? 1 : 0);
    const label = `09-${String(d).padStart(2, '0')} 拜访`;
    setPushed((p) => ({ ...p, [ev.id]: label }));
    setHist((h) => [{ time: now(), text: `${co.name} · ${ev.type} · 方案推送至拜访计划（${label.slice(0, 5)}）`, tone: 'green' }, ...h]);
    flash(`已推送到拜访计划：${co.name} · ${label} · 客户经理 ${P(co.owner).name}`);
  };
  const stateOf = (i: number) => (i < n - 1 ? 'done' : i === n - 1 && n <= steps.length ? 'active' : 'pending');
  const chartData = plan.products.filter((x) => x.amt > 0).map((x) => ({ name: x.name.length > 9 ? x.name.slice(0, 9) + '…' : x.name, amt: Math.round(x.amt), term: x.term, kind: x.kind }));
  const KIND_G: Record<Prod['kind'], string> = { 融资: 'sm-b-fin', 结算: 'sm-b-set', 避险: 'sm-b-fx', 服务: 'sm-b-svc' };
  const highConf = EVENTS.filter((e) => e.conf === '高').length;

  return (
    <div className="sm">
      <style>{CSS}</style>
      <div className="sm-crumb">智慧获客引擎 <ChevronRight size={12} /> <b>场景化营销方案</b></div>
      <div className="sm-top">
        <div>
          <h1><Radar size={22} color="var(--red)" />场景化营销方案</h1>
          <p>按企业经营事件（获定点、中标、旺季备货、设备采购、出口收汇、并购、新设子公司、政策补贴）识别营销场景，生成定制方案与触达策略。</p>
        </div>
        <div className="sm-acts">
          <button className="btn ghost" onClick={() => flash('一页纸拜访材料已导出（PDF）')}><Download size={14} />导出一页纸</button>
          <button className="btn gold" onClick={push}><Send size={14} />推送到拜访计划</button>
          <button className="btn" onClick={generate}>{run > 0 ? <><RotateCcw size={14} />重新生成方案</> : <><Sparkles size={14} />一键生成方案</>}</button>
        </div>
      </div>
      <div className="sm-note">
        <span className="chip green"><ShieldCheck size={12} />事件仅来自公开公告、登记公示与客户告知 · 不使用征信营销 · 方案为营销建议，准入与额度以行内审批为准</span>
      </div>

      <div className="grid g4">
        <div className="tile"><b className="num">{EVENTS.length}</b><span>本月识别事件 · 其中预计发生 {EVENTS.filter((e) => e.expected).length} 条</span></div>
        <div className="tile"><b className="num">{highConf}</b><span>高置信事件 · 两源交叉验证</span></div>
        <div className="tile"><b className="num">{Object.keys(pushed).length + 3}</b><span>已生成方案 · 推送拜访 {Object.keys(pushed).length}</span></div>
        <div className="tile"><b className="num" style={{ fontSize: 22 }}>{fmtWan(EVENTS.reduce((s, e) => s + effectOf(e, buildPlan(e)).credit, 0))}</b><span>本月场景融资额度参考合计</span></div>
      </div>

      {/* 事件雷达 + 日历 */}
      <div className="sm-g21 sm-mt">
        <div className="card fade-in">
          <div className="card-h"><div className="card-t"><span className="dot" />经营事件雷达</div><span className="card-s">{list.length} / {EVENTS.length} 条 · 按识别时间{day ? ` · 9 月 ${day} 日` : ''}</span></div>
          <div className="sm-tools">
            <div className="sm-in"><Search size={13} color="var(--ink-3)" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="企业 / 事件" /></div>
            {TYPES.map((t) => <span key={t} className={`sm-tg${types[t] ? ' on' : ''}`} onClick={() => setTypes({ ...types, [t]: !types[t] })}><i style={{ background: TYPE_COLOR[t] }} />{t}</span>)}
            {day != null && <span className="chip red" style={{ cursor: 'pointer' }} onClick={() => setDay(null)}><i />清除日期筛选</span>}
          </div>
          {list.map((e) => {
            const c = companyById(e.co);
            return (
              <div key={e.id} className={`sm-ev${e.id === sel ? ' sel' : ''}${e.expected ? ' exp' : ''}`} onClick={() => pick(e.id)}>
                <div className="ico" style={{ background: `linear-gradient(135deg,${TYPE_COLOR[e.type]},${TYPE_COLOR[e.type]}99)` }}>{SHORT[e.type]}</div>
                <div>
                  <div className="t"><Building2 size={12} />{c.name}<span className="chip" style={{ padding: '1px 8px', background: `linear-gradient(135deg,${TYPE_COLOR[e.type]}22,${TYPE_COLOR[e.type]}44)`, color: 'var(--ink)', boxShadow: `inset 0 0 0 1px ${TYPE_COLOR[e.type]}66` }}>{e.type}</span>{e.expected && <span className="chip blue" style={{ padding: '1px 8px' }}><i />预计</span>}{pushed[e.id] && <span className="chip green" style={{ padding: '1px 8px' }}><i />{pushed[e.id]}</span>}</div>
                  <div className="s">{e.title}</div>
                  <div className="m">
                    <span className={`chip ${SRC_TONE[e.src]}`} style={{ padding: '1px 8px' }}><i />来源：{e.src}</span>
                    <span className={`chip ${CONF_TONE[e.conf]}`} style={{ padding: '1px 8px' }}><i />置信 {e.conf}</span>
                    <span>{e.rule}</span>
                  </div>
                </div>
                <div className="rt"><b>9-{String(e.day).padStart(2, '0')} {e.time}</b>{e.expected ? '预计发生' : '识别时间'}<br />客户经理 {P(c.owner).name}</div>
              </div>
            );
          })}
          {list.length === 0 && <div className="sm-empty" style={{ minHeight: 120 }}><div>当前筛选下没有事件</div></div>}
        </div>
        <div>
          <div className="card blue fade-in" style={{ animationDelay: '80ms' }}>
            <div className="card-h"><div className="card-t"><CalendarDays size={14} />事件日历 · 2026 年 9 月</div><span className="card-s">点击日期筛选</span></div>
            <div className="sm-cal">
              {['一', '二', '三', '四', '五', '六', '日'].map((w) => <div key={w} className="h">{w}</div>)}
              {cells.map((d, i) => {
                if (d == null) return <div key={i} className="d off" />;
                const evs = EVENTS.filter((e) => e.day === d);
                return (
                  <div key={i} className={`d${d === TODAY ? ' today' : ''}${day === d ? ' sel' : ''}${d > TODAY ? ' fut' : ''}`} onClick={() => setDay(day === d ? null : d)}>
                    {d}{evs.length > 0 && <span className="n">{evs.length}</span>}
                    <div className="dots">{evs.map((e) => <i key={e.id} style={{ background: TYPE_COLOR[e.type] }} title={`${companyById(e.co).name} ${e.type}`} />)}</div>
                  </div>
                );
              })}
            </div>
            <div className="sm-legend">{TYPES.map((t) => <span key={t}><i style={{ background: TYPE_COLOR[t] }} />{t}</span>)}</div>
            <div className="sm-muted" style={{ marginTop: 6 }}><Bell size={11} style={{ verticalAlign: -2 }} /> 今日 9 月 {TODAY} 日；{TODAY} 日后为按规律预计发生的事件，用于提前安排触达。</div>
          </div>
          <div className="card fade-in sm-hist sm-mt" style={{ animationDelay: '160ms' }}>
            <div className="card-h"><div className="card-t"><History size={14} />历史记录</div><span className="card-s">最近 {hist.length} 条</span></div>
            {hist.slice(0, 6).map((h, i) => (
              <div className="li" key={i}>
                <span className={`chip ${h.tone}`} style={{ padding: '2px 8px' }}><i /><Zap size={10} /></span>
                <div style={{ flex: 1, minWidth: 0 }} className="t" >{h.text}</div>
                <span className="tm">{h.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 场景识别 + 效果预估 */}
      <div className="sm-g21 sm-mt">
        <div className="card gold fade-in">
          <div className="card-h">
            <div className="sm-hero">
              <div className="big" style={{ background: `linear-gradient(135deg,${TYPE_COLOR[ev.type]},${TYPE_COLOR[ev.type]}99)` }}>{SHORT[ev.type]}</div>
              <div><h2>{co.name} · {ev.type}</h2><div className="sm-muted">{ev.title} · {co.industry} · {co.district} · {co.relation}</div></div>
            </div>
            <span className="chip"><Target size={12} />场景识别 · 规则引擎</span>
          </div>
          <div className="sm-sec"><Workflow size={12} />识别场景：{plan.scene}</div>
          <p style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{ev.detail}。信号：{ev.rule}（置信 {ev.conf}）。既有产品：{co.relation}；标签：{co.tags.join('、')}。</p>
          <ChainMap e={ev} p={plan} />
          {ev.caution && <div className="sm-warn"><AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2 }} /><span><b>准入提示：</b>{ev.caution}</span></div>}
        </div>
        <div className="card green fade-in" style={{ animationDelay: '80ms' }}>
          <div className="card-h"><div className="card-t"><TrendingUp size={14} />效果预估</div><span className="card-s">前端确定性计算 · 不构成承诺</span></div>
          <div className="sm-kv">
            <div className="k g">预计新增授信 / 融资<b className="num">{fmtWan(eff.credit)}</b></div>
            <div className="k b">预计结算归集<b className="num">{fmtWan(eff.settle)}</b></div>
            <div className="k o">预计中收<b className="num">{fmtWan(eff.income)}</b></div>
            <div className="k p">转化概率<b className="num">{eff.prob}%</b></div>
          </div>
          <div className="bar" style={{ marginTop: 10 }}><i style={{ width: `${eff.prob}%` }} /></div>
          <div className="sm-muted" style={{ marginTop: 4 }}>场景基准 {Math.round(plan.base * 100)}% × 置信系数 {confFactor[ev.conf]} × 关系 / 风险系数</div>
          <div className="sm-sec"><Coins size={12} />分产品额度参考（万）</div>
          <ResponsiveContainer width="100%" height={Math.max(120, chartData.length * 34)}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 64, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="sm-b-fin" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#6ee3ad" /><stop offset="1" stopColor="#155e3e" /></linearGradient>
                <linearGradient id="sm-b-set" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#7fb0ff" /><stop offset="1" stopColor="#1d4ed8" /></linearGradient>
                <linearGradient id="sm-b-fx" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#7fe3f5" /><stop offset="1" stopColor="#0077b6" /></linearGradient>
                <linearGradient id="sm-b-svc" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#c7a4ff" /><stop offset="1" stopColor="#6d28d9" /></linearGradient>
              </defs>
              <CartesianGrid horizontal={false} stroke="rgba(120,100,60,.14)" strokeDasharray="3 3" />
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={96} tick={{ fontSize: 11, fill: '#5f5850' }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: 'rgba(201,162,77,.08)' }} content={<ChartTip />} />
              <Bar dataKey="amt" radius={[0, 6, 6, 0]} barSize={14} isAnimationActive={false}>
                {chartData.map((d, i) => <Cell key={i} fill={`url(#${KIND_G[d.kind]})`} />)}
                <LabelList dataKey="amt" position="right" formatter={(v) => fmtWan(Number(v))} fontSize={11} fill="#5f5850" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="sm-legend"><span><i style={{ background: 'linear-gradient(90deg,#6ee3ad,#155e3e)' }} />融资</span><span><i style={{ background: 'linear-gradient(90deg,#7fb0ff,#1d4ed8)' }} />结算</span><span><i style={{ background: 'linear-gradient(90deg,#7fe3f5,#0077b6)' }} />避险</span><span><i style={{ background: 'linear-gradient(90deg,#c7a4ff,#6d28d9)' }} />服务</span></div>
        </div>
      </div>

      {/* 思考流 + 定制方案 */}
      <div className="sm-g12 sm-mt">
        <div className="card fade-in">
          <div className="card-h"><div className="card-t"><span className="dot" />一键生成方案 · 思考流{run > 0 && !finished && <span className="pulse" />}</div><span className="card-s">{steps.length} 步</span></div>
          {run === 0 && <div className="sm-empty"><div><div className="ring"><Sparkles size={22} /></div>点击「一键生成方案」<br />按「信号核验 → 需求链 → 准入匹配 → 额度测算 → 触达 → 效果」推理。</div></div>}
          {run > 0 && (
            <div className="think">
              {steps.map((s, i) => {
                const st = stateOf(i);
                if (st === 'pending') return null;
                return (
                  <div key={s.t} className={`step sm-step fade-in ${st}`}>
                    <div className="n">{st === 'done' ? <Check size={12} /> : i + 1}</div>
                    <div className="bd"><div className="hd"><b>{s.t}</b>{st === 'active' && <span className="pulse" />}</div><p>{s.p}</p></div>
                  </div>
                );
              })}
              {finished && <div style={{ marginTop: 4 }}>{AI_TAG}</div>}
            </div>
          )}
        </div>
        <div className="card fade-in" style={{ animationDelay: '80ms' }}>
          <div className="card-h"><div className="card-t"><Layers size={14} />定制方案 · {co.name} · {ev.type}</div><div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><span className="card-s">{run > 0 && !finished ? '生成中……' : finished ? '已生成' : '标准产品包已按规则预填'}</span>{AI_TAG}</div></div>
          <div className="sm-sec"><Layers size={12} />产品组合{finished ? '（已优化）' : '（标准产品包）'}</div>
          <div className="sm-tw">
            <table className="tbl sm-prod">
              <thead><tr><th>产品</th><th>额度参考</th><th>期限</th><th>类型</th><th>说明</th></tr></thead>
              <tbody>
                {plan.products.map((x) => (
                  <tr key={x.name}>
                    <td><div className="nm">{x.name}</div></td>
                    <td className="num"><b>{x.amt > 0 ? fmtWan(x.amt) : '—'}</b></td>
                    <td>{x.term}</td>
                    <td><span className={`chip ${x.kind === '融资' ? 'green' : x.kind === '结算' ? 'blue' : x.kind === '避险' ? 'orange' : 'purple'}`} style={{ padding: '1px 8px' }}><i />{x.kind}</span></td>
                    <td><div className="nt">{x.note}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="sm-sec"><BadgeCheck size={12} />配套服务</div>
          <div className="sm-svc">{plan.services.map((s) => <span key={s} className="chip"><i />{s}</span>)}</div>
          {finished ? (
            <div className="fade-in">
              <div className="sm-sec"><MessageSquareText size={12} />话术要点</div>
              {plan.talk.map((t, i) => <div className="sm-talk" key={i}><span className="q">{i + 1}</span><span>{t}</span></div>)}
              <div className="sm-sec"><Clock size={12} />最佳触达时点与策略</div>
              <div className="sm-time"><CalendarClock size={16} /><span>{plan.timing}</span></div>
              <ul className="sm-ul" style={{ marginTop: 8 }}>
                <li>触达顺序：{plan.entry}；先业务负责人后财务负责人，行领导按需协访。</li>
                <li>关键人：{co.name} 财务负责人、业务负责人；本行客户经理 {P(co.owner).name}{co.owner !== 'zhou' ? `，集团类由 ${P('zhou').name} 支持` : ''}。</li>
                <li>准入要点：{ev.caution ? ev.caution : '以公开信息与客户提供材料为依据，方案不承诺审批结果与收益；额度与定价以行内审批为准。'}</li>
                <li>行动清单：① 电话预约 ② 携一页纸方案拜访 ③ 收集申请材料 ④ 提交产品部出具正式方案。</li>
              </ul>
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                <button className="btn sm gold" onClick={push}><Send size={12} />推送到拜访计划</button>
                <button className="btn sm ghost" onClick={() => flash('一页纸拜访材料已导出（PDF）')}><Download size={12} />导出一页纸</button>
                <button className="btn sm ghost" onClick={() => flash('已同步产品部：出具正式方案')}><ArrowRight size={12} />同步产品部</button>
              </div>
            </div>
          ) : (
            <div className="sm-muted" style={{ marginTop: 12 }}>话术要点、触达时点与行动清单将在「一键生成方案」完成后显示。</div>
          )}
        </div>
      </div>

      {toast && <div className="sm-toast fade-in"><Check size={14} />{toast}</div>}
    </div>
  );
}
