import { useEffect, useMemo, useState } from 'react';
import {
  Crown, Sparkles, Check, RotateCcw, Search, Users, Route, Gauge as GaugeIcon, Swords, FileText, Send, History, ShieldCheck,
  Building2, ChevronRight, Download, CalendarClock, X, Target, Milestone, Handshake, Landmark, TrendingUp, AlertTriangle, Filter, BadgeCheck,
} from 'lucide-react';
import { COMPANIES } from '../../data/companies';
import { PERSONAS } from '../../data/personas';
import { rng } from '../../lib/rng';

/* ------------------------------------------------------------------ 页面样式（仅本页，前缀 hd-） */
const CSS = `
.hd-crumb{font-size:12.5px;color:var(--ink-3);margin-bottom:2px;display:flex;align-items:center;gap:4px}
.hd-crumb b{color:var(--ink)}
.hd-top{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:14px}
.hd-top h1{font-size:24px;font-weight:900;display:flex;align-items:center;gap:8px;letter-spacing:.01em}
.hd-top p{color:var(--ink-3);font-size:13px;margin-top:4px}
.hd-acts{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;flex-shrink:0}
.hd-note{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:14px}
.hd-filters{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px}
.hd-in{display:flex;align-items:center;gap:6px;padding:6px 10px;border-radius:9px;background:var(--g-holo-2);box-shadow:inset 0 0 0 1px rgba(201,162,77,.3);font-size:12.5px}
.hd-in input,.hd-in select{border:0;outline:0;background:transparent;font-family:inherit;font-size:12.5px;color:var(--ink);min-width:0}
.hd-in input{width:150px}
.hd-in label{color:var(--ink-3);font-weight:700;font-size:11.5px;white-space:nowrap}
.hd-seg{display:inline-flex;gap:4px;padding:3px;border-radius:10px;background:var(--g-holo-2);box-shadow:inset 0 0 0 1px rgba(201,162,77,.2)}
.hd-seg button{border:0;padding:5px 10px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;background:linear-gradient(135deg,rgba(255,255,255,.6),rgba(255,255,255,.25));color:var(--ink-2)}
.hd-seg button.on{background:var(--g-red);color:#fff;box-shadow:0 6px 14px rgba(195,39,43,.22)}
.hd-tw{overflow-x:auto}
.tbl tr.hd-row{cursor:pointer}
.tbl tr.hd-row.sel td{background:var(--g-gold-soft)}
.tbl td .nm{font-weight:800;font-size:13px}
.tbl td .sub{font-size:11px;color:var(--ink-3)}
.hd-rate{display:flex;align-items:center;gap:8px;min-width:110px}
.hd-rate .bar{flex:1;height:6px}
.hd-rate b{width:36px;text-align:right}
.hd-mt{margin-top:16px}
.hd-sec{display:flex;align-items:center;gap:8px;font-size:11.5px;font-weight:800;letter-spacing:.14em;color:var(--gold-3);margin:14px 0 8px}
.hd-sec:first-child{margin-top:0}
.hd-sec::after{content:"";flex:1;height:1px;background:linear-gradient(90deg,rgba(201,162,77,.45),rgba(61,187,134,.25),rgba(255,255,255,0))}
.hd-muted{color:var(--ink-3);font-size:12px}
.hd-g21{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:16px;align-items:start}
.hd-g12{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.5fr);gap:16px;align-items:start}
@media(max-width:1100px){.hd-g21,.hd-g12{grid-template-columns:1fr}}
.hd-hero{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;align-items:start}
.hd-hero h2{font-size:20px;font-weight:900;display:flex;align-items:center;gap:8px}
.hd-hero .facts{margin-top:10px}
.hd-kv{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:10px}
.hd-kv .k{padding:8px 10px;border-radius:10px;background:var(--g-holo-2);box-shadow:inset 0 0 0 1px rgba(201,162,77,.18);font-size:11.5px;color:var(--ink-3)}
.hd-kv .k b{display:block;font-size:14px;color:var(--ink)}
.hd-pot{display:flex;flex-direction:column;gap:8px;min-width:170px}
.hd-pot .p{padding:9px 12px;border-radius:12px;font-size:11.5px;color:var(--ink-3);background:var(--g-gold-soft);box-shadow:inset 0 0 0 1px rgba(201,162,77,.25)}
.hd-pot .p b{display:block;font-size:17px;color:var(--ink)}
.hd-pot .p.green{background:var(--g-green-soft)} .hd-pot .p.blue{background:var(--g-blue-soft)}
.hd-steps{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}
.hd-step{position:relative;padding:12px 12px 10px;border-radius:12px;cursor:pointer;background:var(--g-holo-2);box-shadow:inset 0 0 0 1px rgba(201,162,77,.2);transition:transform .15s}
.hd-step:hover{transform:translateY(-1px)}
.hd-step.on{background:var(--g-gold-soft);box-shadow:inset 0 0 0 2px rgba(201,162,77,.6),var(--shadow-sm)}
.hd-step.done{background:var(--g-green-soft)}
.hd-step.cur{background:var(--g-red-soft)}
.hd-step .k{display:flex;align-items:center;gap:8px;font-weight:900;font-size:13px}
.hd-step .k i{width:22px;height:22px;border-radius:50%;background:var(--g-iris);color:#fff;font-style:normal;font-size:11px;font-weight:800;display:grid;place-items:center;flex-shrink:0}
.hd-step.done .k i{background:var(--g-green)}
.hd-step .w{font-size:11px;color:var(--ink-3);margin-top:2px}
.hd-step .st{position:absolute;right:8px;top:8px;font-size:10px;font-weight:800;padding:1px 6px;border-radius:999px;background:var(--g-iris-soft)}
.hd-detail{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:10px}
.hd-detail .d{padding:10px 12px;border-radius:12px;background:var(--g-holo-2);box-shadow:inset 0 0 0 1px rgba(201,162,77,.18);font-size:12.5px}
.hd-detail .d b{display:block;font-size:11px;color:var(--gold-3);letter-spacing:.1em;margin-bottom:4px}
.hd-detail .d.red{background:var(--g-red-soft)} .hd-detail .d.green{background:var(--g-green-soft)} .hd-detail .d.blue{background:var(--g-blue-soft)} .hd-detail .d.purple{background:var(--g-purple-soft)}
@media(max-width:1100px){.hd-detail{grid-template-columns:repeat(2,minmax(0,1fr))}}
.hd-svg{margin-top:8px;border-radius:12px;background:var(--g-holo-2);box-shadow:inset 0 0 0 1px rgba(201,162,77,.18);padding:8px;overflow-x:auto}
.hd-svg svg{width:100%;height:auto;display:block;min-width:560px}
.hd-legend{display:flex;gap:12px;flex-wrap:wrap;font-size:11.5px;color:var(--ink-2);margin-top:6px}
.hd-legend i{display:inline-block;width:18px;height:0;border-top:3px solid;vertical-align:middle;margin-right:5px;border-radius:2px}
.hd-fac{display:flex;align-items:center;gap:8px;font-size:12px;margin-top:7px}
.hd-fac .l{width:82px;flex-shrink:0;color:var(--ink-2)}
.hd-fac .bar{flex:1}
.hd-fac .v{width:38px;text-align:right;font-weight:800}
.hd-fac .w{width:44px;text-align:right;color:var(--ink-3);font-size:11px}
.hd-gauge{display:grid;place-items:center}
.hd-gauge svg{width:100%;max-width:260px;height:auto}
.hd-empty{min-height:220px;display:grid;place-items:center;text-align:center;color:var(--ink-3);font-size:13px}
.hd-empty .ring{width:54px;height:54px;border-radius:50%;background:var(--g-iris-soft);display:grid;place-items:center;margin:0 auto 10px;box-shadow:inset 0 0 0 1px rgba(201,162,77,.3)}
.hd-step-ai.active{box-shadow:inset 0 0 0 1px rgba(195,39,43,.45),var(--shadow-sm)}
.hd-step-ai.done .n{background:var(--g-green)}
.hd-step-ai .bd{flex:1;min-width:0}
.hd-step-ai .hd{display:flex;align-items:center;gap:8px}
.hd-doc h4{font-size:13px;font-weight:900;margin:12px 0 5px;display:flex;align-items:center;gap:6px}
.hd-doc h4:first-child{margin-top:0}
.hd-doc p{font-size:12.5px;color:var(--ink-2)}
.hd-ul{list-style:none;display:flex;flex-direction:column;gap:5px}
.hd-ul li{position:relative;padding-left:14px;font-size:12.5px;color:var(--ink-2)}
.hd-ul li::before{content:"";position:absolute;left:0;top:8px;width:7px;height:7px;border-radius:50%;background:var(--g-iris)}
.hd-bank{display:flex;align-items:center;gap:10px;padding:9px 11px;border-radius:12px;background:linear-gradient(90deg,rgba(255,255,255,.7),rgba(255,247,236,.55) 60%,rgba(236,248,243,.5));box-shadow:inset 0 0 0 1px rgba(201,162,77,.14);margin-bottom:7px;font-size:12.5px}
.hd-bank .nm{width:100px;font-weight:800;flex-shrink:0}
.hd-bank .nm small{display:block;font-size:10.5px;color:var(--ink-3);font-weight:700}
.hd-bank .pr{flex:1;min-width:0;color:var(--ink-2);font-size:12px}
.hd-bank .sh{width:60px;text-align:right;font-weight:900}
.hd-share{display:flex;height:12px;border-radius:8px;overflow:hidden;box-shadow:inset 0 0 0 1px rgba(201,162,77,.2);margin:6px 0 10px}
.hd-share i{display:block;height:100%}
.hd-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.hd-form .f{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--ink-3);font-weight:700}
.hd-form input,.hd-form select,.hd-form textarea{padding:8px 10px;border-radius:9px;border:0;outline:0;background:var(--g-holo-2);box-shadow:inset 0 0 0 1px rgba(201,162,77,.3);font-family:inherit;font-size:12.5px;color:var(--ink)}
.hd-form textarea{min-height:64px;resize:vertical}
.hd-form .full{grid-column:1/-1}
.hd-toast{position:fixed;left:50%;bottom:46px;transform:translateX(-50%);z-index:60;padding:10px 18px;border-radius:999px;background:var(--g-green);color:#fff;font-weight:700;font-size:13px;box-shadow:0 12px 30px rgba(31,138,90,.3);display:inline-flex;align-items:center;gap:8px}
.hd-badge{font-size:11px;font-weight:800;padding:2px 8px;border-radius:999px;background:var(--g-iris-soft);white-space:nowrap}
.hd-hist .li{align-items:flex-start}
.hd-hist .li .t{font-size:12.5px}
.hd-hist .li .s{font-size:11.5px}
.hd-hist .li .tm{margin-left:auto;font-size:11px;color:var(--ink-3);white-space:nowrap}
`;

/* ------------------------------------------------------------------ 数据（本地固定种子） */
type TType = '大型企业' | '集团总部' | '上市公司' | '拟上市企业';
type Rel = '无往来' | '结算户' | '子公司往来' | '贷款客户';
type Board = '主板' | '创业板' | '科创板' | '北交所' | '港股' | '非上市';
type RoleKey = 'chairman' | 'cfo' | 'fd' | 'sec';
type BankKey = 'huang' | 'zhou' | 'wang' | 'lin';
interface Bridge { who: string; desc: string; from: BankKey; to: RoleKey; kind: 'have' | 'lever' }
interface BankRow { name: string; role: string; share: number; products: string; depth: '高' | '中' | '低' }
interface Target {
  id: string; name: string; type: TType; industry: string; revenue: number; boardText: string; board: Board; district: string;
  relation: Rel; chain: number; touch: number; need: number; comp: number; stage: number; window: string;
  tags: string[]; facts: string[]; banks: BankRow[]; entry: string; bridges: Bridge[]; related: string[];
}

const TYPES: TType[] = ['大型企业', '集团总部', '上市公司', '拟上市企业'];
const REV_OPTS = ['全部', '10 亿以下', '10–50 亿', '50–100 亿', '100 亿以上'] as const;
const BOARD_OPTS: Array<'全部' | Board> = ['全部', '主板', '创业板', '科创板', '北交所', '港股', '非上市'];
const REL_OPTS: Array<'全部' | Rel> = ['全部', '无往来', '结算户', '子公司往来', '贷款客户'];
const CHAIN_OPTS = ['全部', '高', '中', '低'] as const;
const PHASE_NAMES = ['认知', '接触', '建立信任', '方案', '落地'];

const TARGETS: Target[] = [
  { id: 'shenghe', name: '晟禾食品集团', type: '集团总部', industry: '食品加工', revenue: 42, boardText: '非上市', board: '非上市', district: '经开区', relation: '贷款客户', chain: 70, touch: 3, need: 82, comp: 65, stage: 2, window: '并购交易对价支付期（3 个月内）',
    tags: ['6 家子公司', '3 家子公司未开户', 'CFO 出席本行产业沙龙'],
    facts: ['公开公告：拟收购区域乳品企业 51% 股权，交易对价约 3.2 亿', '集团内 6 家子公司，本行已与 3 家建立结算关系', '母公司在本行贷款 2,000 万；全行业授信 4.5 亿，本行份额 4%'],
    banks: [{ name: '某国有大行', role: '主办行', share: 46, products: '流贷 2 亿 · 集团资金池 · 代发', depth: '高' }, { name: '某股份行', role: '协办行', share: 30, products: '票据池 · 供应链融资', depth: '中' }, { name: '本行', role: '参与行', share: 4, products: '流贷 2,000 万 · 3 家子公司结算', depth: '低' }],
    entry: '以子公司账户归集与经销商供应链融资切入，避开主办行流贷价格战',
    bridges: [{ who: '集团财务经理', desc: '本行 2,000 万贷款日常对接人', from: 'wang', to: 'fd', kind: 'have' }, { who: '本行产业沙龙', desc: 'CFO 曾出席并留有联系方式', from: 'zhou', to: 'cfo', kind: 'have' }, { who: '经销商彩晟商贸负责人', desc: '本行结算户，与集团销售总监熟识', from: 'lin', to: 'sec', kind: 'lever' }],
    related: ['caisheng', 'c09'] },
  { id: 'dongling', name: '东岭新能源', type: '拟上市企业', industry: '新能源', revenue: 26, boardText: '科创板辅导备案', board: '科创板', district: '临港区', relation: '贷款客户', chain: 55, touch: 3, need: 76, comp: 50, stage: 3, window: '辅导期规范整改窗口（6 个月）',
    tags: ['科创板辅导', '光伏组件二期扩产', '本行固贷 3,000 万'],
    facts: ['辅导备案公示：已进入上市辅导期，保荐机构已公告', '光伏组件二期产线扩建，总投资约 6 亿', '工商登记：新设储能子公司（100% 持股）'],
    banks: [{ name: '某股份行', role: '主办行', share: 42, products: '固贷 2.5 亿 · 结算主户', depth: '高' }, { name: '本行', role: '协办行', share: 18, products: '固贷 3,000 万 · 结算', depth: '中' }, { name: '某城商行', role: '参与行', share: 12, products: '流贷', depth: '低' }],
    entry: '募投项目配套融资与上市前财务顾问式服务，争取员工持股平台与募集资金专户',
    bridges: [{ who: '公司财务总监', desc: '本行固贷项目对接人，季度对账', from: 'wang', to: 'fd', kind: 'have' }, { who: '保荐机构项目组', desc: '本行投行部合作券商', from: 'zhou', to: 'cfo', kind: 'lever' }, { who: '临港园区管委会', desc: '支行行长为园区金融顾问', from: 'huang', to: 'chairman', kind: 'lever' }],
    related: ['c11', 'beiling'] },
  { id: 'hongyuan', name: '泓远重工集团', type: '大型企业', industry: '重型装备', revenue: 138, boardText: '主板', board: '主板', district: '临港区', relation: '无往来', chain: 20, touch: 1, need: 58, comp: 82, stage: 0, window: '新任 CFO 到任 100 天',
    tags: ['区域龙头', '海外订单 35%', '新任 CFO'],
    facts: ['年报：营收 138 亿，同比 +9%，海外订单占比 35%', '高管变动公告：新任 CFO 于 2026-06 到任', '投资公告：拟在临港建设新能源装备基地，总投资 12 亿'],
    banks: [{ name: '某国有大行', role: '主办行', share: 55, products: '综合授信 20 亿 · 集团资金池 · 出口信贷', depth: '高' }, { name: '某国有大行（二）', role: '协办行', share: 25, products: '出口信保融资 · 保函', depth: '高' }, { name: '某股份行', role: '参与行', share: 12, products: '票据', depth: '中' }],
    entry: '新 CFO 到任窗口期，以海外订单保函与远期结汇差异化切入',
    bridges: [{ who: '汇源物流总经理', desc: '本行贷款客户，承运泓远出口设备', from: 'wang', to: 'cfo', kind: 'lever' }, { who: '临港园区管委会', desc: '支行行长为园区金融顾问', from: 'huang', to: 'chairman', kind: 'lever' }],
    related: ['c11', 'beiling'] },
  { id: 'mingtai', name: '铭泰电子科技', type: '上市公司', industry: '电子制造', revenue: 31, boardText: '创业板', board: '创业板', district: '高新区', relation: '子公司往来', chain: 45, touch: 2, need: 70, comp: 60, stage: 1, window: '定增资金到账后 90 天',
    tags: ['定增 8 亿获批', '子公司在本行开户', '供应商 200+'],
    facts: ['公告：定向增发 8 亿获批，募投智能穿戴产线', '子公司铭泰精密在本行开立结算账户，月均结算 600 万', '年报：供应商超过 200 家，平均账期 90 天'],
    banks: [{ name: '某股份行', role: '主办行', share: 48, products: '流贷 3 亿 · 供应链融资', depth: '高' }, { name: '某城商行', role: '协办行', share: 22, products: '结算 · 代发', depth: '中' }, { name: '本行', role: '参与行', share: 5, products: '子公司结算', depth: '低' }],
    entry: '募集资金监管户与供应商反向保理，从子公司扩展至母公司',
    bridges: [{ who: '铭泰精密财务负责人', desc: '本行开户经办，月度对账', from: 'lin', to: 'fd', kind: 'have' }, { who: '会计师事务所合伙人', desc: '本行合作审计机构，服务铭泰年审', from: 'zhou', to: 'cfo', kind: 'lever' }],
    related: ['c08', 'ninggui'] },
  { id: 'hengyue', name: '恒岳建设集团', type: '集团总部', industry: '建筑工程', revenue: 96, boardText: '非上市', board: '非上市', district: '城北区', relation: '无往来', chain: 15, touch: 1, need: 62, comp: 75, stage: 0, window: '4 个新中标项目开工前',
    tags: ['在建项目 40+', '保函需求大', '9 家子公司'],
    facts: ['公开中标：近 6 个月中标市政项目 4 个，合计 18 亿', '集团内 9 家子公司，业务覆盖 3 个省份', '公开裁判文书：无重大未决诉讼'],
    banks: [{ name: '某国有大行', role: '主办行', share: 50, products: '保函 5 亿 · 流贷', depth: '高' }, { name: '某股份行', role: '协办行', share: 28, products: '工程保理', depth: '中' }, { name: '某城商行', role: '参与行', share: 10, products: '结算', depth: '低' }],
    entry: '以项目保函与农民工工资专户为切口，共同客户澄宇建材可引荐',
    bridges: [{ who: '澄宇建材贸易总经理', desc: '本行结算户，恒岳材料供应商', from: 'lin', to: 'fd', kind: 'lever' }, { who: '建筑业协会秘书长', desc: '支行行长为协会金融顾问', from: 'huang', to: 'chairman', kind: 'lever' }],
    related: ['c07'] },
  { id: 'huayao', name: '华曜生物医药', type: '拟上市企业', industry: '生物医药', revenue: 8.6, boardText: '科创板已受理', board: '科创板', district: '高新区', relation: '无往来', chain: 30, touch: 1, need: 66, comp: 40, stage: 0, window: '问询回复期（募集资金专户待定）',
    tags: ['科创板受理', '研发投入 22%', '两条新产线'],
    facts: ['交易所公告：科创板上市申请已受理', '年报：研发投入占营收 22%', '公开信息：新增两条产线，设备投资约 1.5 亿'],
    banks: [{ name: '某城商行', role: '主办行', share: 60, products: '流贷 1 亿 · 结算', depth: '高' }, { name: '某股份行', role: '参与行', share: 20, products: '科创贷', depth: '中' }],
    entry: '上市前募集资金专户与研发设备融资租赁，竞争强度低',
    bridges: [{ who: '衡瑞医药流通采购总监', desc: '本行贷款客户，华曜下游经销', from: 'wang', to: 'cfo', kind: 'lever' }, { who: '高新区科创服务中心', desc: '本行科创金融合作单位', from: 'zhou', to: 'sec', kind: 'lever' }],
    related: ['c06'] },
  { id: 'changlan', name: '长澜港口集团', type: '集团总部', industry: '港口物流', revenue: 72, boardText: '非上市（国有）', board: '非上市', district: '临港区', relation: '结算户', chain: 50, touch: 2, need: 60, comp: 70, stage: 1, window: '三期码头扩建立项后融资招标',
    tags: ['国有集团', '2 家子公司在本行结算', '码头扩建 28 亿'],
    facts: ['公开信息：三期码头扩建立项，总投资 28 亿', '本行为其 2 家子公司结算行，月均结算 1,200 万', '公开招标：智慧港口信息系统'],
    banks: [{ name: '某国有大行', role: '主办行', share: 52, products: '项目贷 15 亿 · 集团资金池', depth: '高' }, { name: '某国有大行（二）', role: '协办行', share: 25, products: '项目贷', depth: '高' }, { name: '本行', role: '参与行', share: 6, products: '子公司结算', depth: '中' }],
    entry: '扩建项目银团参与与港口供应链金融（堆场货主融资）',
    bridges: [{ who: '子公司结算经办', desc: '本行结算账户日常经办', from: 'lin', to: 'fd', kind: 'have' }, { who: '汇源物流总经理', desc: '本行贷款客户，港口大客户', from: 'wang', to: 'cfo', kind: 'lever' }],
    related: ['c11', 'c05'] },
  { id: 'qiming', name: '启明半导体', type: '上市公司', industry: '半导体', revenue: 19, boardText: '科创板', board: '科创板', district: '高新区', relation: '无往来', chain: 25, touch: 1, need: 72, comp: 55, stage: 0, window: '封测产线设备付汇集中期',
    tags: ['12 英寸封测扩产', '进口设备付汇', '产业基金持股 12%'],
    facts: ['公告：拟投资 9 亿建设 12 英寸封测产线', '公开信息：进口设备占比高，付汇需求集中在 2027 上半年', '产业基金持股 12%，为本行合作机构'],
    banks: [{ name: '某股份行', role: '主办行', share: 45, products: '流贷 2 亿 · 结算', depth: '高' }, { name: '某国有大行', role: '协办行', share: 30, products: '进口信用证', depth: '中' }],
    entry: '进口设备融资租赁与远期购汇，产业基金为共同关系方',
    bridges: [{ who: '产业基金投后负责人', desc: '本行合作机构，定期联席会', from: 'zhou', to: 'sec', kind: 'lever' }, { who: '融岚软件总经理', desc: '本行贷款客户，为启明提供 MES 系统', from: 'wang', to: 'cfo', kind: 'lever' }],
    related: ['c08'] },
  { id: 'yunfan', name: '云帆信息', type: '拟上市企业', industry: '软件服务', revenue: 5.2, boardText: '北交所辅导', board: '北交所', district: '高新区', relation: '贷款客户', chain: 75, touch: 4, need: 68, comp: 30, stage: 3, window: '辅导验收前',
    tags: ['本行主办行', '北交所辅导', '省级专精特新'],
    facts: ['辅导备案：北交所上市辅导已备案', '本行流贷 800 万，结算主户与代发', '年报：营收 5.2 亿，同比 +31%'],
    banks: [{ name: '本行', role: '主办行', share: 55, products: '流贷 800 万 · 结算 · 代发', depth: '高' }, { name: '某城商行', role: '协办行', share: 25, products: '科创贷', depth: '中' }],
    entry: '深化：员工持股平台、募集资金专户、上市后市值管理配套',
    bridges: [{ who: '公司 CFO', desc: '本行主办行，月度沟通', from: 'wang', to: 'cfo', kind: 'have' }, { who: '公司董事长', desc: '支行行长年度拜访', from: 'huang', to: 'chairman', kind: 'have' }, { who: '董秘', desc: '上市辅导材料对接', from: 'zhou', to: 'sec', kind: 'have' }],
    related: ['c08'] },
  { id: 'ruipeng', name: '瑞鹏纺织集团', type: '大型企业', industry: '纺织服装', revenue: 54, boardText: '港股', board: '港股', district: '经开区', relation: '结算户', chain: 40, touch: 2, need: 55, comp: 68, stage: 1, window: '越南二期投产后跨境结算迁移',
    tags: ['出口占比 60%', '境内子公司在本行结算', '越南工厂二期'],
    facts: ['港股年报：营收 54 亿，出口占比 60%', '本行为其境内子公司结算行', '公告：越南工厂二期投产'],
    banks: [{ name: '某国有大行', role: '主办行', share: 48, products: '流贷 · 出口押汇', depth: '高' }, { name: '某外资行', role: '协办行', share: 22, products: '跨境资金池', depth: '高' }, { name: '本行', role: '参与行', share: 8, products: '境内子公司结算', depth: '低' }],
    entry: '跨境结算、远期结汇与出口订单融资',
    bridges: [{ who: '境内子公司财务经理', desc: '本行结算账户经办', from: 'lin', to: 'fd', kind: 'have' }, { who: '桂澜跨境电商总经理', desc: '本行结算户，瑞鹏东盟渠道合作方', from: 'lin', to: 'cfo', kind: 'lever' }],
    related: ['c05'] },
  { id: 'zhongtai', name: '中泰智能装备', type: '上市公司', industry: '智能装备', revenue: 45, boardText: '主板', board: '主板', district: '经开区', relation: '子公司往来', chain: 55, touch: 3, need: 74, comp: 58, stage: 2, window: '并购后整合期（资金归集需求）',
    tags: ['在手订单 38 亿', '子公司在本行授信', '并购扩张'],
    facts: ['公告：完成收购某自动化公司 100% 股权', '子公司中泰机器人在本行授信 1,500 万', '年报：在手订单 38 亿'],
    banks: [{ name: '某股份行', role: '主办行', share: 44, products: '流贷 4 亿 · 并购贷', depth: '高' }, { name: '本行', role: '协办行', share: 10, products: '子公司授信 1,500 万', depth: '中' }, { name: '某城商行', role: '参与行', share: 12, products: '票据', depth: '低' }],
    entry: '并购后整合期：集团资金归集与订单融资，从子公司上探母公司',
    bridges: [{ who: '中泰机器人财务总监', desc: '本行授信对接人', from: 'wang', to: 'fd', kind: 'have' }, { who: '宁桂精密机械董事长', desc: '本行客户，中泰设备采购方', from: 'wang', to: 'chairman', kind: 'lever' }, { who: '集团 CFO', desc: '出席本行产业沙龙', from: 'zhou', to: 'cfo', kind: 'have' }],
    related: ['ninggui', 'c08'] },
  { id: 'jinjiang', name: '锦江商业集团', type: '集团总部', industry: '商业地产', revenue: 63, boardText: '非上市', board: '非上市', district: '城南区', relation: '无往来', chain: 10, touch: 0, need: 50, comp: 78, stage: 0, window: '第 7 个综合体开业前收单招标',
    tags: ['商业综合体 6 个', '租金收入 21 亿', '数字化改造'],
    facts: ['公开信息：新建第 7 个商业综合体，投资 9 亿', '公开招标：智慧停车与会员系统', '债券披露：租金收入 21 亿'],
    banks: [{ name: '某国有大行', role: '主办行', share: 58, products: '经营性物业贷 12 亿', depth: '高' }, { name: '某股份行', role: '协办行', share: 24, products: '流贷 · 收单', depth: '中' }],
    entry: '收单与商户结算生态切入，商户中有本行客户嘉禾连锁餐饮',
    bridges: [{ who: '嘉禾连锁餐饮总经理', desc: '本行结算户，锦江综合体主力商户', from: 'lin', to: 'cfo', kind: 'lever' }, { who: '商业联合会', desc: '支行行长为理事单位代表', from: 'huang', to: 'chairman', kind: 'lever' }],
    related: ['c09'] },
  { id: 'hailan', name: '海澜数据科技', type: '拟上市企业', industry: '数据服务', revenue: 6.8, boardText: '创业板辅导', board: '创业板', district: '保税区', relation: '结算户', chain: 35, touch: 2, need: 60, comp: 35, stage: 1, window: '政务数据平台项目履约期',
    tags: ['创业板辅导', '本行结算户', '中标 1.2 亿'],
    facts: ['辅导备案：创业板上市辅导', '本行结算户，月均结算 300 万', '公开中标：某市政务数据平台 1.2 亿'],
    banks: [{ name: '某城商行', role: '主办行', share: 50, products: '流贷 5,000 万', depth: '高' }, { name: '本行', role: '协办行', share: 20, products: '结算', depth: '中' }],
    entry: '中标项目履约保函与订单融资，升级为主办行',
    bridges: [{ who: '公司财务经理', desc: '本行结算经办', from: 'lin', to: 'fd', kind: 'have' }, { who: '融岚软件总经理', desc: '本行客户，海澜技术合作方', from: 'wang', to: 'cfo', kind: 'lever' }],
    related: ['c08', 'c05'] },
  { id: 'hongyi', name: '弘毅化工集团', type: '大型企业', industry: '精细化工', revenue: 110, boardText: '主板', board: '主板', district: '临港区', relation: '贷款客户', chain: 45, touch: 2, need: 64, comp: 72, stage: 2, window: '环保技改投资落地期',
    tags: ['净利 7.8 亿', '本行流贷 5,000 万', '环保技改 4 亿'],
    facts: ['年报：营收 110 亿，净利 7.8 亿', '公告：环保技改投资 4 亿', '本行流贷 5,000 万，参与行'],
    banks: [{ name: '某国有大行', role: '主办行', share: 50, products: '综合授信 15 亿', depth: '高' }, { name: '某股份行', role: '协办行', share: 25, products: '票据池', depth: '中' }, { name: '本行', role: '参与行', share: 5, products: '流贷 5,000 万', depth: '低' }],
    entry: '技改项目固贷与危化品下游经销商供应链融资',
    bridges: [{ who: '集团资金部经理', desc: '本行流贷对接人', from: 'wang', to: 'fd', kind: 'have' }, { who: '北岭铝材董事长', desc: '本行贷款客户，弘毅下游客户', from: 'wang', to: 'cfo', kind: 'lever' }],
    related: ['beiling'] },
];

const SUR = ['陈', '沈', '吴', '何', '赵', '钱', '孙', '郑', '冯', '许', '苏', '程', '韩', '曹', '袁', '邓', '傅', '钟', '姜', '谭'];
const GIV = ['国栋', '雅琴', '建平', '晓菲', '立群', '文静', '海涛', '敏华', '志强', '丽娟', '俊杰', '一鸣', '思远', '宇轩', '慧兰', '振华', '美玲', '承志', '婉婷', '嘉豪'];
function rolesOf(seed: number) {
  const r = rng(seed);
  const used = new Set<string>();
  const pick = () => { let n = ''; do { n = SUR[Math.floor(r() * SUR.length)] + GIV[Math.floor(r() * GIV.length)]; } while (used.has(n)); used.add(n); return n; };
  return { chairman: pick(), cfo: pick(), fd: pick(), sec: pick() } as Record<RoleKey, string>;
}
const ROLE_LABEL: Record<RoleKey, string> = { chairman: '董事长', cfo: 'CFO', fd: '财务总监', sec: '董秘' };
const BANK_LABEL: Record<BankKey, string> = { huang: '支行行长', zhou: '分行公司业务部', wang: '客户经理', lin: '客户经理' };
const P = (id: string) => PERSONAS.find((p) => p.id === id)!;

const successRate = (t: Target) => Math.max(12, Math.min(88, Math.round(8 + t.touch * 6 + t.need * 0.25 + (100 - t.comp) * 0.12 + t.chain * 0.1)));
const chainLabel = (c: number) => (c >= 60 ? '高' : c >= 30 ? '中' : '低');
const revBand = (v: number) => (v < 10 ? '10 亿以下' : v < 50 ? '10–50 亿' : v < 100 ? '50–100 亿' : '100 亿以上');
const wan = (n: number) => `${Math.round(n).toLocaleString('zh-CN')} 万`;
const potential = (t: Target) => ({ deposit: t.revenue * 10000 * 0.028, credit: t.revenue * 10000 * 0.06, settle: t.revenue * 10000 * 0.12 });

const NEEDS: Record<TType, string[]> = {
  集团总部: ['集团现金管理与子公司账户归集', '经销商 / 供应商供应链融资', '集团授信主办行与票据池'],
  上市公司: ['募集资金专户与监管', '供应商反向保理', '并购 / 产业整合融资', '员工持股计划配套'],
  拟上市企业: ['上市前规范：结算归集与专户', '募投项目配套固贷 / 设备租赁', '员工持股平台配套', '上市后市值管理与现金管理'],
  大型企业: ['供应链金融（上游经销 / 下游分销）', '固定资产 / 技改项目融资', '跨境结算与汇率避险', '票据池与集团资金池'],
};
const riskOf = (t: Target) => (t.comp >= 70 ? '现有主办行价格反制、决策链长且多头' : t.comp >= 50 ? '决策链多头，需同时覆盖 CFO 与董事长' : '需求时点把握，避免错过窗口期');

interface Phase { k: string; w: string; goal: string; acts: string[]; owner: string; ms: string }
function phasesOf(t: Target, roles: Record<RoleKey, string>): Phase[] {
  const wang = P('wang').name, zhou = P('zhou').name, huang = P('huang').name;
  const b0 = t.bridges[0];
  const needs = NEEDS[t.type];
  return [
    { k: '认知', w: '第 1–2 周', goal: '完成目标画像与触点盘点，明确切入议题', acts: [`研读年报与公告：${t.facts[0]}`, '梳理集团架构、子公司开户情况与共同客户', `确认切入议题：${t.entry}`], owner: `${wang}（客户经理）`, ms: `触点地图与切入议题经 ${huang}（支行行长）确认` },
    { k: '接触', w: '第 3–4 周', goal: `获得与 ${roles.cfo}（CFO）的首次正式会面`, acts: [`通过「${b0.who}」引荐：${b0.desc}`, '邀请出席本行产业沙龙或行业研讨', '递交一页纸价值主张，不谈价格只谈场景'], owner: `${wang} + ${zhou}`, ms: '首次会面完成，获得下一步议题与时间点' },
    { k: '建立信任', w: '第 2 个月', goal: '以小切口业务证明专业能力与响应速度', acts: [`提供 ${t.industry} 行业与同业对标分析`, '推动子公司 / 关联方结算账户等低门槛业务', '建立对接机制：周度沟通、专属产品经理'], owner: `${zhou}（分行公司业务部）`, ms: '首笔业务落地（结算 / 账户 / 代发）' },
    { k: '方案', w: '第 3 个月', goal: '提交综合金融方案并完成行内方案评审', acts: [...needs.slice(0, 3).map((n) => `方案模块：${n}`), `行领导协访 ${roles.chairman}（董事长）就方案交换意见`], owner: `${zhou} + 产品团队 + ${huang}`, ms: '方案评审通过，客户书面反馈' },
    { k: '落地', w: '第 4–6 个月', goal: '授信审批与首笔业务上线', acts: ['授信申报与审批，准入以行内审批为准', '账户开立、系统直联与资金归集上线', '首笔提款 / 首批结算迁移'], owner: `${wang} + 授信审批 + 运营`, ms: '授信批复；首笔业务落地；纳入重点客户跟踪' },
  ];
}

const AI_TAG = <span className="ai-tag"><Sparkles size={11} /> AI 生成 · 辅助建议 · 需人工复核</span>;

interface Hist { time: string; target: string; action: string; result: string; tone: 'green' | 'blue' | 'orange' | 'purple' }
const HIST0: Hist[] = [
  { time: '09-03 16:20', target: '中泰智能装备', action: '生成开发策略', result: '成功率 61% · 协访已完成', tone: 'green' },
  { time: '08-27 10:05', target: '东岭新能源', action: '行领导协访申请', result: '周慧敏协访 CFO · 已完成', tone: 'blue' },
  { time: '08-19 14:40', target: '铭泰电子科技', action: '生成开发策略', result: '接触阶段 · 待引荐', tone: 'orange' },
  { time: '08-05 09:12', target: '泓远重工集团', action: '目标入池', result: '认知阶段 · 新 CFO 窗口', tone: 'purple' },
];

/* ------------------------------------------------------------------ 思考流 */
function useSteps(total: number, running: boolean, token: number, gap = 800) {
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

function stepsOf(t: Target, roles: Record<RoleKey, string>, rate: number) {
  const main = t.banks[0];
  const b0 = t.bridges[0];
  return [
    { t: '目标画像', p: `${t.name}：${t.type} · ${t.industry} · 营收 ${t.revenue} 亿 · ${t.boardText} · 总部${t.district}。公开信息要点：${t.facts[0]}。` },
    { t: '触点盘点', p: `已识别 ${t.touch} 个可用触点：${t.bridges.map((b) => `${b.who}（${b.kind === 'have' ? '已有关系' : '可借力'}）`).join('、')}；与本行关系：${t.relation}。` },
    { t: '需求匹配', p: `按 ${t.type} 标准需求包匹配：${NEEDS[t.type].slice(0, 3).join(' / ')}；匹配度 ${t.need}%，当前窗口：${t.window}。` },
    { t: '竞争评估', p: `主办行 ${main.name} 份额 ${main.share}%（${main.products}），竞争强度 ${t.comp}%。差异化切入点：${t.entry}。` },
    { t: '分阶段策略', p: '认知（触点地图）→ 接触（引荐会面）→ 建立信任（小切口业务）→ 方案（综合方案与协访）→ 落地（审批与上线），周期约 6 个月。' },
    { t: '接触方案', p: `由「${b0.who}」引荐，${P(b0.from).name}（${BANK_LABEL[b0.from]}）拜访 ${roles[b0.to]}（${ROLE_LABEL[b0.to]}），议题「${t.entry.split('，')[0]}」。` },
    { t: '成功率与风险', p: `预估成功率 ${rate}%；关键风险：${riskOf(t)}。已按合规要求剔除征信与未授权个人信息。` },
  ];
}

/* ------------------------------------------------------------------ 成功率仪表 */
function Gauge({ v }: { v: number }) {
  const cx = 130, cy = 120, r = 92;
  const pt = (deg: number) => ({ x: cx + r * Math.cos((deg * Math.PI) / 180), y: cy - r * Math.sin((deg * Math.PI) / 180) });
  const arc = (a0: number, a1: number) => { const p0 = pt(a0), p1 = pt(a1); return `M ${p0.x} ${p0.y} A ${r} ${r} 0 0 1 ${p1.x} ${p1.y}`; };
  const end = 180 - (v / 100) * 180;
  const needle = pt(end);
  return (
    <div className="hd-gauge">
      <svg viewBox="0 0 260 150" role="img" aria-label="成功率预估">
        <defs>
          <linearGradient id="hd-g-track" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#c3272b" stopOpacity=".18" /><stop offset=".5" stopColor="#e3a93c" stopOpacity=".2" /><stop offset="1" stopColor="#3dbb86" stopOpacity=".2" /></linearGradient>
          <linearGradient id="hd-g-arc" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#e63946" /><stop offset=".5" stopColor="#f4b942" /><stop offset="1" stopColor="#2dc48d" /></linearGradient>
          <radialGradient id="hd-g-pin" cx=".35" cy=".35" r="1"><stop offset="0" stopColor="#ffd9d6" /><stop offset="1" stopColor="#8e1b1b" /></radialGradient>
        </defs>
        <path d={arc(180, 0)} stroke="url(#hd-g-track)" strokeWidth="18" fill="none" strokeLinecap="round" />
        <path d={arc(180, Math.max(end, 1))} stroke="url(#hd-g-arc)" strokeWidth="18" fill="none" strokeLinecap="round" />
        {[0, 25, 50, 75, 100].map((k) => { const p = pt(180 - k * 1.8); const q = { x: cx + (r - 16) * Math.cos(((180 - k * 1.8) * Math.PI) / 180), y: cy - (r - 16) * Math.sin(((180 - k * 1.8) * Math.PI) / 180) }; return <line key={k} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke="#fff" strokeWidth="2" opacity=".8" />; })}
        <line x1={cx} y1={cy} x2={needle.x} y2={needle.y} stroke="#8e1b1b" strokeWidth="3" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="9" fill="url(#hd-g-pin)" />
        <text x={cx} y={cy - 26} textAnchor="middle" fontSize="30" fontWeight="900" fill="#1e1b16">{v}%</text>
        <text x={cx} y={cy + 30} textAnchor="middle" fontSize="11" fill="#8c8478">开发成功率预估（前端确定性计算）</text>
        <text x={cx - r} y={cy + 16} textAnchor="middle" fontSize="10" fill="#8c8478">0</text>
        <text x={cx + r} y={cy + 16} textAnchor="middle" fontSize="10" fill="#8c8478">100</text>
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ 接触路径图 */
function PathMap({ t, roles }: { t: Target; roles: Record<RoleKey, string> }) {
  const bankY: Record<BankKey, number> = { huang: 70, zhou: 170, wang: 270, lin: 370 };
  const cliY: Record<RoleKey, number> = { chairman: 60, cfo: 160, fd: 260, sec: 360 };
  const BX = 150, MX = 480, CX = 810, W = 250, H = 46;
  const mids = t.bridges.map((b, i) => ({ ...b, y: 90 + i * (300 / Math.max(1, t.bridges.length - 1 || 1)) }));
  const curve = (x0: number, y0: number, x1: number, y1: number) => `M ${x0} ${y0} C ${(x0 + x1) / 2} ${y0}, ${(x0 + x1) / 2} ${y1}, ${x1} ${y1}`;
  const direct = t.relation !== '无往来';
  const bankOrder: BankKey[] = ['huang', 'zhou', 'wang', 'lin'];
  const cliOrder: RoleKey[] = ['chairman', 'cfo', 'fd', 'sec'];
  return (
    <div className="hd-svg">
      <svg viewBox="0 0 960 430" role="img" aria-label="接触路径图">
        <defs>
          <linearGradient id="hd-n-bank" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#e85d55" /><stop offset="1" stopColor="#8e1b1b" /></linearGradient>
          <linearGradient id="hd-n-mid" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f7e2a5" /><stop offset="1" stopColor="#a9843a" /></linearGradient>
          <linearGradient id="hd-n-cli" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7fb0ff" /><stop offset="1" stopColor="#1d4ed8" /></linearGradient>
          <linearGradient id="hd-e-have" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#5fd3a0" /><stop offset="1" stopColor="#1f8a5a" /></linearGradient>
          <linearGradient id="hd-e-lever" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#f4b942" /><stop offset="1" stopColor="#d9781b" /></linearGradient>
          <marker id="hd-arr-g" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#1f8a5a" /></marker>
          <marker id="hd-arr-o" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#d9781b" /></marker>
        </defs>
        <text x={BX} y={26} textAnchor="middle" fontSize="12" fontWeight="800" fill="#8e1b1b" letterSpacing="2">本 行</text>
        <text x={MX} y={26} textAnchor="middle" fontSize="12" fontWeight="800" fill="#9c7a2e" letterSpacing="2">中 间 人 · 触 点</text>
        <text x={CX} y={26} textAnchor="middle" fontSize="12" fontWeight="800" fill="#1d4ed8" letterSpacing="2">客 户 决 策 链</text>
        {/* 客户内部汇报线 */}
        <path d={`M ${CX} ${cliY.chairman + H / 2} L ${CX} ${cliY.sec - H / 2}`} stroke="rgba(29,78,216,.25)" strokeWidth="2" strokeDasharray="2 4" fill="none" />
        {/* 边 */}
        {mids.map((b, i) => (
          <g key={i}>
            <path d={curve(BX + W / 2, bankY[b.from], MX - W / 2 + 10, b.y)} stroke={b.kind === 'have' ? 'url(#hd-e-have)' : 'url(#hd-e-lever)'} strokeWidth="3" fill="none" strokeDasharray={b.kind === 'have' ? undefined : '7 5'} markerEnd={b.kind === 'have' ? 'url(#hd-arr-g)' : 'url(#hd-arr-o)'} />
            <path d={curve(MX + W / 2 - 10, b.y, CX - W / 2, cliY[b.to])} stroke="url(#hd-e-lever)" strokeWidth="3" fill="none" strokeDasharray="7 5" markerEnd="url(#hd-arr-o)" />
          </g>
        ))}
        {direct && (
          <g>
            <path d={curve(BX + W / 2, bankY.wang, CX - W / 2, cliY.fd)} stroke="url(#hd-e-have)" strokeWidth="3" fill="none" markerEnd="url(#hd-arr-g)" opacity=".9" />
            <text x={(BX + CX) / 2} y={(bankY.wang + cliY.fd) / 2 - 8} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#155e3e">已有关系 · {t.relation}</text>
          </g>
        )}
        {/* 本行节点 */}
        {bankOrder.map((k) => (
          <g key={k}>
            <rect x={BX - W / 2} y={bankY[k] - H / 2} width={W} height={H} rx="12" fill="url(#hd-n-bank)" opacity=".95" />
            <text x={BX} y={bankY[k] - 3} textAnchor="middle" fontSize="12.5" fontWeight="800" fill="#fff">{BANK_LABEL[k]} · {P(k).name}</text>
            <text x={BX} y={bankY[k] + 13} textAnchor="middle" fontSize="10" fill="rgba(255,255,255,.85)">{P(k).focus}</text>
          </g>
        ))}
        {/* 中间人节点 */}
        {mids.map((b, i) => (
          <g key={i}>
            <rect x={MX - W / 2 + 10} y={b.y - H / 2} width={W - 20} height={H} rx="12" fill="url(#hd-n-mid)" />
            <text x={MX} y={b.y - 3} textAnchor="middle" fontSize="12.5" fontWeight="800" fill="#3a2a08">{b.who}</text>
            <text x={MX} y={b.y + 13} textAnchor="middle" fontSize="10" fill="#5a4410">{b.desc.length > 20 ? b.desc.slice(0, 20) + '…' : b.desc}</text>
            <rect x={MX + W / 2 - 66} y={b.y - H / 2 - 9} width="56" height="16" rx="8" fill={b.kind === 'have' ? '#1f8a5a' : '#d9781b'} />
            <text x={MX + W / 2 - 38} y={b.y - H / 2 + 3} textAnchor="middle" fontSize="9.5" fontWeight="800" fill="#fff">{b.kind === 'have' ? '已有关系' : '可借力'}</text>
          </g>
        ))}
        {/* 客户节点 */}
        {cliOrder.map((k) => (
          <g key={k}>
            <rect x={CX - W / 2} y={cliY[k] - H / 2} width={W} height={H} rx="12" fill="url(#hd-n-cli)" />
            <text x={CX} y={cliY[k] - 3} textAnchor="middle" fontSize="12.5" fontWeight="800" fill="#fff">{ROLE_LABEL[k]} · {roles[k]}</text>
            <text x={CX} y={cliY[k] + 13} textAnchor="middle" fontSize="10" fill="rgba(255,255,255,.85)">{k === 'chairman' ? '最终决策 · 战略议题' : k === 'cfo' ? '融资与银行关系决策' : k === 'fd' ? '账户 / 结算 / 日常对接' : '信息披露 · 资本市场事务'}</text>
          </g>
        ))}
      </svg>
      <div className="hd-legend">
        <span><i style={{ borderColor: '#1f8a5a' }} />已有关系（实线）</span>
        <span><i style={{ borderColor: '#d9781b', borderTopStyle: 'dashed' }} />可借力引荐（虚线）</span>
        <span><i style={{ borderColor: 'rgba(29,78,216,.4)', borderTopStyle: 'dotted' }} />客户内部汇报线</span>
        <span className="hd-muted">中间人信息来自本行客户关系与公开活动记录，不含征信与未授权个人信息</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ 页面 */
export default function HighEndDevelopment() {
  const [q, setQ] = useState('');
  const [type, setType] = useState<'全部' | TType>('全部');
  const [rev, setRev] = useState<(typeof REV_OPTS)[number]>('全部');
  const [board, setBoard] = useState<'全部' | Board>('全部');
  const [dist, setDist] = useState('全部');
  const [rel, setRel] = useState<'全部' | Rel>('全部');
  const [chain, setChain] = useState<(typeof CHAIN_OPTS)[number]>('全部');
  const [selId, setSelId] = useState<string>('shenghe');
  const [phase, setPhase] = useState(1);
  const [run, setRun] = useState(0);
  const [applyOpen, setApplyOpen] = useState(false);
  const [applied, setApplied] = useState<Record<string, string>>({ dongling: '08-27 已协访', zhongtai: '09-03 已协访' });
  const [toast, setToast] = useState('');
  const [hist, setHist] = useState<Hist[]>(HIST0);
  const [form, setForm] = useState({ leader: 'huang', role: 'cfo' as RoleKey, topic: '', date: '2026-09-18', note: '' });

  const districts = useMemo(() => ['全部', ...Array.from(new Set(TARGETS.map((t) => t.district)))], []);
  const list = useMemo(() => TARGETS.filter((t) =>
    (type === '全部' || t.type === type) && (rev === '全部' || revBand(t.revenue) === rev) && (board === '全部' || t.board === board) &&
    (dist === '全部' || t.district === dist) && (rel === '全部' || t.relation === rel) && (chain === '全部' || chainLabel(t.chain) === chain) &&
    (!q || t.name.includes(q) || t.industry.includes(q) || t.tags.some((x) => x.includes(q))),
  ), [type, rev, board, dist, rel, chain, q]);

  const t = TARGETS.find((x) => x.id === selId) ?? TARGETS[0];
  const idx = TARGETS.indexOf(t);
  const roles = useMemo(() => rolesOf(4100 + idx * 17), [idx]);
  const rate = successRate(t);
  const phases = useMemo(() => phasesOf(t, roles), [t, roles]);
  const steps = useMemo(() => stepsOf(t, roles, rate), [t, roles, rate]);
  const n = useSteps(steps.length, run > 0, run);
  const finished = run > 0 && n > steps.length;
  const pot = potential(t);
  const timing = useMemo(() => 40 + Math.round(rng(900 + idx)() * 55), [idx]);
  const factors = [
    { l: '已知触点', v: Math.round((t.touch / 5) * 100), w: '30%' },
    { l: '需求匹配', v: t.need, w: '25%' },
    { l: '竞争强度', v: 100 - t.comp, w: '12%', note: `他行强度 ${t.comp}%` },
    { l: '决策链已知', v: t.chain, w: '10%' },
    { l: '时机窗口', v: timing, w: '参考' },
  ];
  const ph = phases[phase];

  const select = (id: string) => { setSelId(id); setRun(0); setApplyOpen(false); const tt = TARGETS.find((x) => x.id === id)!; setPhase(Math.min(4, tt.stage)); };
  const flash = (m: string) => { setToast(m); window.setTimeout(() => setToast(''), 2600); };
  const openApply = () => { setForm((f) => ({ ...f, topic: t.entry, role: t.bridges[0].to })); setApplyOpen(true); };
  const submitApply = () => {
    const leader = P(form.leader);
    setApplied((a) => ({ ...a, [t.id]: `${form.date.slice(5)} 待确认` }));
    setHist((h) => [{ time: '09-06 ' + new Date().toTimeString().slice(0, 5), target: t.name, action: '行领导协访申请', result: `${leader.name}协访 ${ROLE_LABEL[form.role]} · 待行领导确认`, tone: 'blue' }, ...h]);
    setApplyOpen(false);
    flash(`协访申请已提交：${leader.name} · ${form.date} · 待确认`);
  };
  const generate = () => { setRun((r) => r + 1); setHist((h) => [{ time: '09-06 ' + new Date().toTimeString().slice(0, 5), target: t.name, action: '生成开发策略', result: `成功率 ${rate}% · ${PHASE_NAMES[t.stage]}阶段`, tone: 'green' }, ...h]); };
  const share = (name: string) => { const b = t.banks.find((x) => x.name === '本行'); return name === '本行' ? b?.share ?? 0 : 0; };
  const stateOf = (i: number) => (i < n - 1 ? 'done' : i === n - 1 && n <= steps.length ? 'active' : 'pending');
  const SHARE_COLORS = ['linear-gradient(90deg,#3a86ff,#1d4ed8)', 'linear-gradient(90deg,#9b5de5,#6d28d9)', 'linear-gradient(90deg,#e63946,#8e1b1b)', 'linear-gradient(90deg,#00b4d8,#0077b6)'];

  return (
    <div className="hd">
      <style>{CSS}</style>
      <div className="hd-crumb">智慧获客引擎 <ChevronRight size={12} /> <b>高端客户开发策略</b></div>
      <div className="hd-top">
        <div>
          <h1><Crown size={22} color="var(--gold-3)" />高端客户开发策略</h1>
          <p>面向大型企业、集团总部、上市公司与拟上市企业：筛选目标、盘点触点、生成分阶段开发策略与接触路径，并给出成功率预估。</p>
        </div>
        <div className="hd-acts">
          <button className="btn ghost" onClick={() => flash('策略书已导出（PDF）· 已归档至客户档案')}><Download size={14} />导出策略书</button>
          <button className="btn gold" onClick={openApply}><Send size={14} />提交行领导协访申请</button>
          <button className="btn" onClick={generate}>{run > 0 ? <><RotateCcw size={14} />重新生成策略</> : <><Sparkles size={14} />生成开发策略</>}</button>
        </div>
      </div>
      <div className="hd-note">
        <span className="chip green"><ShieldCheck size={12} />线索仅用公开信息与本行客户数据 · 不使用征信 · 高管个人信息须客户授权</span>
        <span className="chip"><i />目标池 {TARGETS.length} 户</span>
        <span className="chip blue"><i />已启动开发 {TARGETS.filter((x) => x.stage > 0).length} 户</span>
        <span className="chip purple"><i />平均成功率 {Math.round(TARGETS.reduce((s, x) => s + successRate(x), 0) / TARGETS.length)}%</span>
      </div>

      {/* 目标池 */}
      <div className="card fade-in">
        <div className="card-h">
          <div className="card-t"><span className="dot" />目标池 · 大型企业 / 集团总部 / 上市公司 / 拟上市企业</div>
          <span className="card-s">{list.length} / {TARGETS.length} 户 · 点击行选择目标</span>
        </div>
        <div className="hd-filters">
          <div className="hd-seg">
            {(['全部', ...TYPES] as const).map((x) => <button key={x} className={type === x ? 'on' : ''} onClick={() => setType(x)}>{x}</button>)}
          </div>
          <div className="hd-in"><Search size={13} color="var(--ink-3)" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="企业名 / 行业 / 标签" /></div>
          <div className="hd-in"><label>营收规模</label><select value={rev} onChange={(e) => setRev(e.target.value as (typeof REV_OPTS)[number])}>{REV_OPTS.map((x) => <option key={x}>{x}</option>)}</select></div>
          <div className="hd-in"><label>上市板块</label><select value={board} onChange={(e) => setBoard(e.target.value as '全部' | Board)}>{BOARD_OPTS.map((x) => <option key={x}>{x}</option>)}</select></div>
          <div className="hd-in"><label>总部所在区</label><select value={dist} onChange={(e) => setDist(e.target.value)}>{districts.map((x) => <option key={x}>{x}</option>)}</select></div>
          <div className="hd-in"><label>与本行关系</label><select value={rel} onChange={(e) => setRel(e.target.value as '全部' | Rel)}>{REL_OPTS.map((x) => <option key={x}>{x}</option>)}</select></div>
          <div className="hd-in"><label>决策链已知</label><select value={chain} onChange={(e) => setChain(e.target.value as (typeof CHAIN_OPTS)[number])}>{CHAIN_OPTS.map((x) => <option key={x}>{x}</option>)}</select></div>
          <span className="hd-muted"><Filter size={12} style={{ verticalAlign: -2 }} /> 条件可叠加</span>
        </div>
        <div className="hd-tw">
          <table className="tbl">
            <thead><tr><th>企业</th><th>类型</th><th>营收</th><th>板块</th><th>总部</th><th>与本行关系</th><th>决策链</th><th>触点</th><th>阶段</th><th>预估成功率</th><th>协访</th></tr></thead>
            <tbody>
              {list.map((x) => {
                const r = successRate(x);
                return (
                  <tr key={x.id} className={`hd-row${x.id === t.id ? ' sel' : ''}`} onClick={() => select(x.id)}>
                    <td><div className="nm">{x.name}</div><div className="sub">{x.industry} · {x.tags[0]}</div></td>
                    <td><span className={`chip ${x.type === '集团总部' ? 'purple' : x.type === '上市公司' ? 'blue' : x.type === '拟上市企业' ? 'green' : 'orange'}`}><i />{x.type}</span></td>
                    <td className="num"><b>{x.revenue} 亿</b></td>
                    <td>{x.boardText}</td>
                    <td>{x.district}</td>
                    <td>{x.relation}</td>
                    <td><span className={`chip ${chainLabel(x.chain) === '高' ? 'green' : chainLabel(x.chain) === '中' ? '' : 'red'}`}><i />{chainLabel(x.chain)} · {x.chain}</span></td>
                    <td className="num">{x.touch} 个</td>
                    <td><span className="hd-badge">{PHASE_NAMES[x.stage]}</span></td>
                    <td><div className="hd-rate"><div className="bar"><i style={{ width: `${r}%` }} /></div><b className="num">{r}%</b></div></td>
                    <td>{applied[x.id] ? <span className="chip blue"><i />{applied[x.id]}</span> : <span className="hd-muted">—</span>}</td>
                  </tr>
                );
              })}
              {list.length === 0 && <tr><td colSpan={11} className="hd-muted" style={{ textAlign: 'center', padding: 20 }}>无符合条件的目标，请调整筛选条件</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* 选中目标：画像 + 成功率 */}
      <div className="hd-g21 hd-mt">
        <div className="card gold fade-in">
          <div className="hd-hero">
            <div>
              <h2><Building2 size={18} />{t.name} <span className="chip purple"><i />{t.type}</span>{applied[t.id] && <span className="chip blue"><i />协访 {applied[t.id]}</span>}</h2>
              <div className="hd-muted" style={{ marginTop: 4 }}>{t.industry} · {t.boardText} · 总部{t.district} · 与本行关系：{t.relation} · 当前阶段：{PHASE_NAMES[t.stage]}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>{t.tags.map((x) => <span key={x} className="chip"><i />{x}</span>)}</div>
              <div className="hd-kv">
                <div className="k">营收规模<b>{t.revenue} 亿</b></div>
                <div className="k">主办行<b>{t.banks[0].name}</b></div>
                <div className="k">本行份额<b>{share('本行')}%</b></div>
                <div className="k">需求匹配度<b>{t.need}%</b></div>
                <div className="k">竞争强度<b>{t.comp}%</b></div>
                <div className="k">时机窗口<b style={{ fontSize: 12.5 }}>{t.window}</b></div>
              </div>
              <div className="hd-sec facts"><FileText size={12} />公开信息要点</div>
              <ul className="hd-ul">{t.facts.map((f) => <li key={f}>{f}</li>)}</ul>
              {t.related.length > 0 && (
                <>
                  <div className="hd-sec"><Users size={12} />本行既有触点 · 关联客户</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {t.related.map((id) => { const c = COMPANIES.find((x) => x.id === id); return c ? <span key={id} className="chip green"><i />{c.name} · {c.relation.split(' · ')[0]}</span> : null; })}
                  </div>
                </>
              )}
            </div>
            <div className="hd-pot">
              <div className="p">存款潜力<b className="num">{wan(pot.deposit)}</b></div>
              <div className="p green">授信潜力<b className="num">{wan(pot.credit)}</b></div>
              <div className="p blue">结算潜力 / 年<b className="num">{wan(pot.settle)}</b></div>
              <span className="hd-muted">按营收规模与行内参数确定性测算</span>
            </div>
          </div>
        </div>
        <div className="card fade-in" style={{ animationDelay: '80ms' }}>
          <div className="card-h"><div className="card-t"><GaugeIcon size={14} />成功率预估与影响因素</div><span className="card-s">权重为规则引擎参数</span></div>
          <Gauge v={rate} />
          {factors.map((f) => (
            <div className="hd-fac" key={f.l}>
              <span className="l">{f.l}</span>
              <div className="bar"><i style={{ width: `${f.v}%` }} /></div>
              <span className="v num">{f.v}</span>
              <span className="w">{f.w}</span>
            </div>
          ))}
          <div className="hd-muted" style={{ marginTop: 8 }}><AlertTriangle size={11} style={{ verticalAlign: -2 }} /> 关键风险：{riskOf(t)}</div>
        </div>
      </div>

      {/* 分阶段开发策略 */}
      <div className="card hd-mt fade-in">
        <div className="card-h"><div className="card-t"><Milestone size={14} />分阶段开发策略 · {t.name}</div>{AI_TAG}</div>
        <div className="hd-steps">
          {phases.map((p, i) => (
            <div key={p.k} className={`hd-step${i === phase ? ' on' : ''}${i < t.stage ? ' done' : i === t.stage ? ' cur' : ''}`} onClick={() => setPhase(i)}>
              <div className="k"><i>{i < t.stage ? <Check size={11} /> : i + 1}</i>{p.k}</div>
              <div className="w">{p.w} · {p.owner.split('（')[0].split(' + ')[0]}</div>
              {i < t.stage && <span className="st">已完成</span>}
              {i === t.stage && <span className="st" style={{ background: 'var(--g-red-soft)', color: 'var(--red-3)' }}>进行中</span>}
            </div>
          ))}
        </div>
        <div className="hd-detail">
          <div className="d gold"><b><Target size={11} style={{ verticalAlign: -1 }} /> 阶段目标</b>{ph.goal}</div>
          <div className="d blue"><b><Route size={11} style={{ verticalAlign: -1 }} /> 关键动作</b><ul className="hd-ul">{ph.acts.map((a) => <li key={a}>{a}</li>)}</ul></div>
          <div className="d purple"><b><Users size={11} style={{ verticalAlign: -1 }} /> 负责人</b>{ph.owner}</div>
          <div className="d green"><b><BadgeCheck size={11} style={{ verticalAlign: -1 }} /> 里程碑</b>{ph.ms}</div>
        </div>
      </div>

      {/* 接触路径 + 竞争态势 */}
      <div className="hd-g21 hd-mt">
        <div className="card fade-in">
          <div className="card-h"><div className="card-t"><Route size={14} />接触路径图 · 本行 → 中间人 → 客户决策链</div><span className="card-s">{t.bridges.length} 条引荐路径</span></div>
          <PathMap t={t} roles={roles} />
        </div>
        <div className="card blue fade-in" style={{ animationDelay: '80ms' }}>
          <div className="card-h"><div className="card-t"><Swords size={14} />竞争态势 · 他行合作情况</div><span className="card-s">份额按公开信息与客户告知估算</span></div>
          <div className="hd-share">
            {t.banks.map((b, i) => <i key={b.name} style={{ width: `${b.share}%`, background: b.name === '本行' ? SHARE_COLORS[2] : SHARE_COLORS[i % 2 === 0 ? 0 : 1] }} title={`${b.name} ${b.share}%`} />)}
            <i style={{ flex: 1, background: 'linear-gradient(90deg,rgba(201,162,77,.15),rgba(61,187,134,.12))' }} />
          </div>
          {t.banks.map((b, i) => (
            <div className="hd-bank" key={b.name}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: b.name === '本行' ? SHARE_COLORS[2] : SHARE_COLORS[i % 2 === 0 ? 0 : 1], flexShrink: 0 }} />
              <div className="nm">{b.name}<small>{b.role} · 关系{b.depth}</small></div>
              <div className="pr">{b.products}</div>
              <div className="sh num">{b.share}%</div>
            </div>
          ))}
          <div className="hd-sec"><TrendingUp size={12} />差异化切入点</div>
          <p style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{t.entry}。</p>
          <p className="hd-muted" style={{ marginTop: 6 }}>合规：不评价同业、不承诺审批结果，价格以行内定价审批为准。</p>
        </div>
      </div>

      {/* 生成策略 思考流 + 策略书 */}
      <div className="hd-g12 hd-mt">
        <div className="card fade-in">
          <div className="card-h"><div className="card-t"><span className="dot" />生成开发策略 · 思考流{run > 0 && !finished && <span className="pulse" />}</div><span className="card-s">{steps.length} 步</span></div>
          {run === 0 && <div className="hd-empty"><div><div className="ring"><Sparkles size={22} /></div>点击「生成开发策略」<br />按「画像 → 触点 → 需求 → 竞争 → 策略 → 接触 → 成功率」推理。</div></div>}
          {run > 0 && (
            <div className="think">
              {steps.map((s, i) => {
                const st = stateOf(i);
                if (st === 'pending') return null;
                return (
                  <div key={s.t} className={`step hd-step-ai fade-in ${st}`}>
                    <div className="n">{st === 'done' ? <Check size={12} /> : i + 1}</div>
                    <div className="bd"><div className="hd"><b>{s.t}</b>{st === 'active' && <span className="pulse" />}</div><p>{s.p}</p></div>
                  </div>
                );
              })}
              {finished && <div style={{ marginTop: 4 }}>{AI_TAG}</div>}
            </div>
          )}
        </div>
        <div className="card gold fade-in hd-doc" style={{ animationDelay: '80ms' }}>
          <div className="card-h"><div className="card-t"><FileText size={14} />高端客户开发策略书 · {t.name}</div>{finished ? AI_TAG : <span className="card-s">{run > 0 ? '生成中……' : '等待生成'}</span>}</div>
          {!finished && <div className="hd-empty" style={{ minHeight: 180 }}><div>{run > 0 ? '正在整理目标画像、触点地图、分阶段策略、接触方案与成功率……' : '策略书将在推理完成后显示。'}</div></div>}
          {finished && (
            <div className="fade-in">
              <h4><Building2 size={13} />一、目标画像</h4>
              <p>{t.name}，{t.type}，{t.industry}，营收 {t.revenue} 亿，{t.boardText}，总部{t.district}。{t.facts.join('；')}。当前与本行关系：{t.relation}，本行份额 {share('本行')}%。</p>
              <h4><Users size={13} />二、触点地图</h4>
              <ul className="hd-ul">{t.bridges.map((b) => <li key={b.who}>{P(b.from).name}（{BANK_LABEL[b.from]}）→ {b.who}（{b.kind === 'have' ? '已有关系' : '可借力'}：{b.desc}）→ {roles[b.to]}（{ROLE_LABEL[b.to]}）</li>)}</ul>
              <h4><Milestone size={13} />三、分阶段策略</h4>
              <ul className="hd-ul">{phases.map((p) => <li key={p.k}><b>{p.k}</b>（{p.w}）：{p.goal}；里程碑：{p.ms}。</li>)}</ul>
              <h4><Handshake size={13} />四、接触方案</h4>
              <p>拜访对象：{roles[t.bridges[0].to]}（{ROLE_LABEL[t.bridges[0].to]}）与 {roles.cfo}（CFO）；引荐路径：{t.bridges[0].who}；见面议题：「{t.entry}」；建议 {P('huang').name}（支行行长）或 {P('zhou').name}（分行公司业务部）协访，携产品团队。</p>
              <h4><Landmark size={13} />五、价值测算</h4>
              <p>存款潜力 {wan(pot.deposit)}，授信潜力 {wan(pot.credit)}，年结算潜力 {wan(pot.settle)}（按营收规模与行内参数确定性测算，最终以审批为准）。</p>
              <h4><GaugeIcon size={13} />六、成功率与关键风险</h4>
              <p>预估成功率 {rate}%（触点 {t.touch} 个、需求匹配 {t.need}%、竞争强度 {t.comp}%、决策链已知 {t.chain}）。关键风险：{riskOf(t)}。应对：以 {NEEDS[t.type][0]} 为非价格切口，先建立对接机制再谈综合授信。</p>
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                <button className="btn sm gold" onClick={openApply}><Send size={12} />提交行领导协访申请</button>
                <button className="btn sm ghost" onClick={() => flash('已加入本周拜访计划 · 待排期')}><CalendarClock size={12} />加入拜访计划</button>
                <button className="btn sm ghost" onClick={() => flash('策略书已导出（PDF）· 已归档至客户档案')}><Download size={12} />导出 PDF</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 协访申请 + 历史记录 */}
      <div className="hd-g21 hd-mt">
        {applyOpen ? (
          <div className="card red fade-in">
            <div className="card-h"><div className="card-t"><Send size={14} />行领导协访申请 · {t.name}</div><button className="btn sm ghost" onClick={() => setApplyOpen(false)}><X size={12} />取消</button></div>
            <div className="hd-form">
              <label className="f">协访领导<select value={form.leader} onChange={(e) => setForm({ ...form, leader: e.target.value })}><option value="huang">{P('huang').name} · 支行行长</option><option value="zhou">{P('zhou').name} · 分行公司业务部</option></select></label>
              <label className="f">拜访对象<select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as RoleKey })}>{(Object.keys(ROLE_LABEL) as RoleKey[]).map((k) => <option key={k} value={k}>{ROLE_LABEL[k]} · {roles[k]}</option>)}</select></label>
              <label className="f">拟定时间<input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
              <label className="f">引荐路径<input value={t.bridges[0].who} readOnly /></label>
              <label className="f full">拜访议题<input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} /></label>
              <label className="f full">备注（材料准备、注意事项）<textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="例：携带行业分析、一页纸价值主张；不谈价格；避免询问未公开并购细节" /></label>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <button className="btn" onClick={submitApply}><Send size={14} />提交申请</button>
              <span className="hd-muted">提交后进入行领导审批队列，确认后自动同步至拜访计划。</span>
            </div>
          </div>
        ) : (
          <div className="card fade-in">
            <div className="card-h"><div className="card-t"><Handshake size={14} />开发要点提示</div><span className="card-s">{t.name}</span></div>
            <ul className="hd-ul">
              <li>决策链已知程度 {chainLabel(t.chain)}（{t.chain}）：{t.chain >= 60 ? '可直接约见 CFO 层级，重点推进方案阶段。' : t.chain >= 30 ? '先通过中间人补齐 CFO 与董事长信息，再安排正式接触。' : '优先通过共同客户与园区 / 协会等公开渠道建立第一触点。'}</li>
              <li>{t.type === '拟上市企业' ? '辅导期对合规与结算规范要求高，可提供上市前财务规范服务作为非价格切口。' : t.type === '上市公司' ? '关注公告中的募投与并购动向，募集资金专户是高价值切口。' : t.type === '集团总部' ? '从子公司与经销体系上探集团，账户归集与供应链融资先行。' : '以供应链金融与跨境结算切入，避免与主办行正面价格竞争。'}</li>
              <li>合规提示：接触高管前确认信息来源为公开公告、行内客户关系或客户授权，不使用征信数据营销。</li>
            </ul>
            <button className="btn gold sm" style={{ marginTop: 10 }} onClick={openApply}><Send size={12} />提交行领导协访申请</button>
          </div>
        )}
        <div className="card fade-in hd-hist" style={{ animationDelay: '80ms' }}>
          <div className="card-h"><div className="card-t"><History size={14} />历史记录</div><span className="card-s">最近 {hist.length} 条</span></div>
          {hist.slice(0, 6).map((h, i) => (
            <div className="li" key={i}>
              <span className={`chip ${h.tone}`}><i />{h.action}</span>
              <div style={{ flex: 1, minWidth: 0 }}><div className="t">{h.target}</div><div className="s">{h.result}</div></div>
              <span className="tm">{h.time}</span>
            </div>
          ))}
        </div>
      </div>

      {toast && <div className="hd-toast fade-in"><Check size={14} />{toast}</div>}
    </div>
  );
}
