import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Crown, Sparkles, Check, RotateCcw, Search, Users, Route, Gauge as GaugeIcon, Swords, FileText, Send, History, ShieldCheck,
  Building2, ChevronRight, X, Target, Milestone, Handshake, Landmark, AlertTriangle, Filter, BadgeCheck, Lightbulb, CalendarRange, Columns2, SlidersHorizontal, Upload,
} from 'lucide-react';
import { COMPANIES } from '../../data/companies';
import { PERSONAS } from '../../data/personas';
import { rng } from '../../lib/rng';
import UploadDocs, { type UDoc } from '../../components/UploadDocs';
import DocActions from '../../components/DocActions';
import AiConclusion from '../../components/AiConclusion';
import { AI_CSS } from './ai/styles';
import type { Answer, ApplyAction, Chain, Constraint, Evidence, EvSource, Phase, Version } from './ai/types';
import { VERSION_LABEL, hashStr } from './ai/types';
import { parseIntent, isOn, valueOf } from './ai/parse';
import { docEvidence, relevanceWith, dateOf } from './ai/evidence';
import IntentBox from './ai/IntentBox';
import EvidencePanel from './ai/EvidencePanel';
import ReasoningChain, { EvRefs } from './ai/ReasoningChain';
import AskAi from './ai/AskAi';

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
.hd-tw{overflow-x:auto;max-height:300px;overflow-y:auto}
.tbl tr.hd-row{cursor:pointer}
.tbl tr.hd-row.sel td{background:var(--g-gold-soft)}
.tbl td .nm{font-weight:800;font-size:13px}
.tbl td .sub{font-size:11px;color:var(--ink-3)}
.hd-rate{display:flex;align-items:center;gap:8px;min-width:110px}
.hd-rate .bar{flex:1;height:6px}
.hd-rate b{width:36px;text-align:right}
.hd-mt{margin-top:16px}
.hd-g21{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:16px;align-items:start}
.hd-g12{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.5fr);gap:16px;align-items:start}
@media(max-width:1100px){.hd-g21,.hd-g12{grid-template-columns:1fr}}
.hd-hero h2{font-size:19px;font-weight:900;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.hd-kv{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:10px}
.hd-kv .k{padding:8px 10px;border-radius:10px;background:var(--g-holo-2);box-shadow:inset 0 0 0 1px rgba(201,162,77,.18);font-size:11.5px;color:var(--ink-3)}
.hd-kv .k b{display:block;font-size:14px;color:var(--ink)}
.hd-pot{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:10px}
.hd-pot .p{padding:9px 12px;border-radius:12px;font-size:11.5px;color:var(--ink-3);background:var(--g-gold-soft);box-shadow:inset 0 0 0 1px rgba(201,162,77,.25)}
.hd-pot .p b{display:block;font-size:17px;color:var(--ink)}
.hd-pot .p.green{background:var(--g-green-soft)} .hd-pot .p.blue{background:var(--g-blue-soft)}
.hd-steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px}
.hd-step{position:relative;padding:12px 12px 10px;border-radius:12px;cursor:pointer;background:var(--g-holo-2);box-shadow:inset 0 0 0 1px rgba(201,162,77,.2);transition:transform .15s}
.hd-step:hover{transform:translateY(-1px)}
.hd-step.on{background:var(--g-gold-soft);box-shadow:inset 0 0 0 2px rgba(201,162,77,.6),var(--shadow-sm)}
.hd-step .k{display:flex;align-items:center;gap:8px;font-weight:900;font-size:13px}
.hd-step .k i{width:22px;height:22px;border-radius:50%;background:var(--g-iris);color:#fff;font-style:normal;font-size:11px;font-weight:800;display:grid;place-items:center;flex-shrink:0}
.hd-step .w{font-size:11px;color:var(--ink-3);margin-top:2px}
.hd-detail{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:10px}
.hd-detail .d{padding:10px 12px;border-radius:12px;background:var(--g-holo-2);box-shadow:inset 0 0 0 1px rgba(201,162,77,.18);font-size:12.5px}
.hd-detail .d b{display:block;font-size:11px;color:var(--gold-3);letter-spacing:.1em;margin-bottom:4px}
.hd-detail .d.red{background:var(--g-red-soft)} .hd-detail .d.green{background:var(--g-green-soft)} .hd-detail .d.blue{background:var(--g-blue-soft)} .hd-detail .d.purple{background:var(--g-purple-soft)}
@media(max-width:1100px){.hd-detail{grid-template-columns:repeat(2,minmax(0,1fr))}}
.hd-svg{margin-top:8px;border-radius:12px;background:var(--g-holo-2);box-shadow:inset 0 0 0 1px rgba(201,162,77,.18);padding:8px;overflow-x:auto}
.hd-svg svg{width:100%;height:auto;display:block;min-width:560px}
.hd-legend{display:flex;gap:12px;flex-wrap:wrap;font-size:11.5px;color:var(--ink-2);margin-top:6px}
.hd-legend i{display:inline-block;width:18px;height:0;border-top:3px solid;vertical-align:middle;margin-right:5px;border-radius:2px}
.hd-gauge{display:grid;place-items:center}
.hd-gauge svg{width:100%;max-width:240px;height:auto}
.hd-bank{display:flex;align-items:center;gap:10px;padding:8px 11px;border-radius:12px;background:linear-gradient(90deg,rgba(255,255,255,.7),rgba(255,247,236,.55) 60%,rgba(236,248,243,.5));box-shadow:inset 0 0 0 1px rgba(201,162,77,.14);margin-bottom:6px;font-size:12.5px}
.hd-bank .nm{width:100px;font-weight:800;flex-shrink:0}
.hd-bank .nm small{display:block;font-size:10.5px;color:var(--ink-3);font-weight:700}
.hd-bank .pr{flex:1;min-width:0;color:var(--ink-2);font-size:12px}
.hd-bank .sh{width:60px;text-align:right;font-weight:900}
.hd-share{display:flex;height:12px;border-radius:8px;overflow:hidden;box-shadow:inset 0 0 0 1px rgba(201,162,77,.2);margin:6px 0 10px}
.hd-share i{display:block;height:100%}
.hd-sel{padding:8px 10px;border-radius:9px;border:0;outline:0;background:var(--g-holo-2);box-shadow:inset 0 0 0 1px rgba(201,162,77,.3);font-family:inherit;font-size:12.5px;color:var(--ink)}
.hd-doc h4{font-size:13.5px;font-weight:900;margin:14px 0 6px;display:flex;align-items:center;gap:6px}
.hd-doc h4:first-child{margin-top:0}
.hd-doc p{font-size:12.5px;color:var(--ink-2)}
.hd-days{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
@media(max-width:1100px){.hd-days{grid-template-columns:1fr}}
.hd-day{padding:10px 12px;border-radius:12px;background:var(--g-holo-2);box-shadow:inset 0 0 0 1px rgba(201,162,77,.18)}
.hd-day.d30{background:var(--g-red-soft)} .hd-day.d60{background:var(--g-gold-soft)} .hd-day.d90{background:var(--g-green-soft)}
.hd-day b{display:block;font-size:12px;letter-spacing:.1em;margin-bottom:6px}
.hd-badge{font-size:11px;font-weight:800;padding:2px 8px;border-radius:999px;background:var(--g-iris-soft);white-space:nowrap}
.hd-hist .li{align-items:flex-start}
.hd-hist .li .tm{margin-left:auto;font-size:11px;color:var(--ink-3);white-space:nowrap}
.hd-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.hd-form .f{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--ink-3);font-weight:700}
.hd-form input,.hd-form select,.hd-form textarea{padding:8px 10px;border-radius:9px;border:0;outline:0;background:var(--g-holo-2);box-shadow:inset 0 0 0 1px rgba(201,162,77,.3);font-family:inherit;font-size:12.5px;color:var(--ink)}
.hd-form .full{grid-column:1/-1}
.hd-live{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:700;color:var(--green-3);padding:3px 9px;border-radius:999px;background:var(--g-green-soft)}
`;

/* ------------------------------------------------------------------ 目标池数据（公开信息 + 行内客户关系） */
type TType = '大型企业' | '集团总部' | '上市公司' | '拟上市企业';
type Rel = '无往来' | '结算户' | '子公司往来' | '贷款客户';
type RoleKey = 'chairman' | 'cfo' | 'fd' | 'sec';
type BankKey = 'huang' | 'zhou' | 'wang' | 'lin';
interface Bridge { who: string; desc: string; from: BankKey; to: RoleKey; kind: 'have' | 'lever' }
interface BankRow { name: string; role: string; share: number; products: string }
interface Target {
  id: string; name: string; type: TType; industry: string; revenue: number; boardText: string; district: string;
  relation: Rel; chain: number; touch: number; need: number; comp: number; stage: number; window: string;
  tags: string[]; facts: string[]; banks: BankRow[]; entry: string; bridges: Bridge[]; related: string[];
}
const TYPES: TType[] = ['大型企业', '集团总部', '上市公司', '拟上市企业'];
const REL_OPTS: Array<'全部' | Rel> = ['全部', '无往来', '结算户', '子公司往来', '贷款客户'];
const PHASE_NAMES = ['认知', '接触', '建立信任', '方案', '落地'];

const TARGETS: Target[] = [
  { id: 'shenghe', name: '晟禾食品集团', type: '集团总部', industry: '食品加工', revenue: 42, boardText: '非上市', district: '经开区', relation: '贷款客户', chain: 70, touch: 3, need: 82, comp: 65, stage: 2, window: '并购交易对价支付期（3 个月内）',
    tags: ['6 家子公司', '3 家子公司未开户', 'CFO 出席本行产业沙龙'],
    facts: ['公开公告：拟收购区域乳品企业 51% 股权，交易对价约 3.2 亿', '集团内 6 家子公司，本行已与 3 家建立结算关系', '母公司在本行贷款 2,000 万；全行业授信 4.5 亿，本行份额 4%'],
    banks: [{ name: '某国有大行', role: '主办行', share: 46, products: '流贷 2 亿 · 集团资金池 · 代发' }, { name: '某股份行', role: '协办行', share: 30, products: '票据池 · 供应链融资' }, { name: '本行', role: '参与行', share: 4, products: '流贷 2,000 万 · 3 家子公司结算' }],
    entry: '以子公司账户归集与经销商供应链融资切入，避开主办行流贷价格战',
    bridges: [{ who: '集团财务经理', desc: '本行 2,000 万贷款日常对接人', from: 'wang', to: 'fd', kind: 'have' }, { who: '本行产业沙龙', desc: 'CFO 曾出席并留有联系方式', from: 'zhou', to: 'cfo', kind: 'have' }, { who: '经销商彩晟商贸负责人', desc: '本行结算户，与集团销售总监熟识', from: 'lin', to: 'sec', kind: 'lever' }],
    related: ['caisheng', 'c09'] },
  { id: 'dongling', name: '东岭新能源', type: '拟上市企业', industry: '新能源', revenue: 26, boardText: '科创板辅导备案', district: '临港区', relation: '贷款客户', chain: 55, touch: 3, need: 76, comp: 50, stage: 3, window: '辅导期规范整改窗口（6 个月）',
    tags: ['科创板辅导', '光伏组件二期扩产', '本行固贷 3,000 万'],
    facts: ['辅导备案公示：已进入上市辅导期，保荐机构已公告', '光伏组件二期产线扩建，总投资约 6 亿', '工商登记：新设储能子公司（100% 持股）'],
    banks: [{ name: '某股份行', role: '主办行', share: 42, products: '固贷 2.5 亿 · 结算主户' }, { name: '本行', role: '协办行', share: 18, products: '固贷 3,000 万 · 结算' }, { name: '某城商行', role: '参与行', share: 12, products: '流贷' }],
    entry: '募投项目配套融资与上市前财务顾问式服务，争取员工持股平台与募集资金专户',
    bridges: [{ who: '公司财务总监', desc: '本行固贷项目对接人，季度对账', from: 'wang', to: 'fd', kind: 'have' }, { who: '保荐机构项目组', desc: '本行投行部合作券商', from: 'zhou', to: 'cfo', kind: 'lever' }, { who: '临港园区管委会', desc: '支行行长为园区金融顾问', from: 'huang', to: 'chairman', kind: 'lever' }],
    related: ['c11', 'beiling'] },
  { id: 'hongyuan', name: '泓远重工集团', type: '大型企业', industry: '重型装备', revenue: 138, boardText: '主板', district: '临港区', relation: '无往来', chain: 20, touch: 1, need: 58, comp: 82, stage: 0, window: '新任 CFO 到任 100 天',
    tags: ['区域龙头', '海外订单 35%', '新任 CFO'],
    facts: ['年报：营收 138 亿，同比 +9%，海外订单占比 35%', '高管变动公告：新任 CFO 于 2026-06 到任', '投资公告：拟在临港建设新能源装备基地，总投资 12 亿'],
    banks: [{ name: '某国有大行', role: '主办行', share: 55, products: '综合授信 20 亿 · 集团资金池 · 出口信贷' }, { name: '某国有大行（二）', role: '协办行', share: 25, products: '出口信保融资 · 保函' }, { name: '某股份行', role: '参与行', share: 12, products: '票据' }],
    entry: '新 CFO 到任窗口期，以海外订单保函与远期结汇差异化切入',
    bridges: [{ who: '汇源物流总经理', desc: '本行贷款客户，承运泓远出口设备', from: 'wang', to: 'cfo', kind: 'lever' }, { who: '临港园区管委会', desc: '支行行长为园区金融顾问', from: 'huang', to: 'chairman', kind: 'lever' }],
    related: ['c11', 'beiling'] },
  { id: 'mingtai', name: '铭泰电子科技', type: '上市公司', industry: '电子制造', revenue: 31, boardText: '创业板', district: '高新区', relation: '子公司往来', chain: 45, touch: 2, need: 70, comp: 60, stage: 1, window: '定增资金到账后 90 天',
    tags: ['定增 8 亿获批', '子公司在本行开户', '供应商 200+'],
    facts: ['公告：定向增发 8 亿获批，募投智能穿戴产线', '子公司铭泰精密在本行开立结算账户，月均结算 600 万', '年报：供应商超过 200 家，平均账期 90 天'],
    banks: [{ name: '某股份行', role: '主办行', share: 48, products: '流贷 3 亿 · 供应链融资' }, { name: '某城商行', role: '协办行', share: 22, products: '结算 · 代发' }, { name: '本行', role: '参与行', share: 5, products: '子公司结算' }],
    entry: '募集资金监管户与供应商反向保理，从子公司扩展至母公司',
    bridges: [{ who: '铭泰精密财务负责人', desc: '本行开户经办，月度对账', from: 'lin', to: 'fd', kind: 'have' }, { who: '会计师事务所合伙人', desc: '本行合作审计机构，服务铭泰年审', from: 'zhou', to: 'cfo', kind: 'lever' }],
    related: ['c08', 'ninggui'] },
  { id: 'hengyue', name: '恒岳建设集团', type: '集团总部', industry: '建筑工程', revenue: 96, boardText: '非上市', district: '城北区', relation: '无往来', chain: 15, touch: 1, need: 62, comp: 75, stage: 0, window: '4 个新中标项目开工前',
    tags: ['在建项目 40+', '保函需求大', '9 家子公司'],
    facts: ['公开中标：近 6 个月中标市政项目 4 个，合计 18 亿', '集团内 9 家子公司，业务覆盖 3 个省份', '公开裁判文书：无重大未决诉讼'],
    banks: [{ name: '某国有大行', role: '主办行', share: 50, products: '保函 5 亿 · 流贷' }, { name: '某股份行', role: '协办行', share: 28, products: '工程保理' }, { name: '某城商行', role: '参与行', share: 10, products: '结算' }],
    entry: '以项目保函与农民工工资专户为切口，共同客户澄宇建材可引荐',
    bridges: [{ who: '澄宇建材贸易总经理', desc: '本行结算户，恒岳材料供应商', from: 'lin', to: 'fd', kind: 'lever' }, { who: '建筑业协会秘书长', desc: '支行行长为协会金融顾问', from: 'huang', to: 'chairman', kind: 'lever' }],
    related: ['c07'] },
  { id: 'huayao', name: '华曜生物医药', type: '拟上市企业', industry: '生物医药', revenue: 8.6, boardText: '科创板已受理', district: '高新区', relation: '无往来', chain: 30, touch: 1, need: 66, comp: 40, stage: 0, window: '问询回复期（募集资金专户待定）',
    tags: ['科创板受理', '研发投入 22%', '两条新产线'],
    facts: ['交易所公告：科创板上市申请已受理', '年报：研发投入占营收 22%', '公开信息：新增两条产线，设备投资约 1.5 亿'],
    banks: [{ name: '某城商行', role: '主办行', share: 60, products: '流贷 1 亿 · 结算' }, { name: '某股份行', role: '参与行', share: 20, products: '科创贷' }],
    entry: '上市前募集资金专户与研发设备融资租赁，竞争强度低',
    bridges: [{ who: '衡瑞医药流通采购总监', desc: '本行贷款客户，华曜下游经销', from: 'wang', to: 'cfo', kind: 'lever' }, { who: '高新区科创服务中心', desc: '本行科创金融合作单位', from: 'zhou', to: 'sec', kind: 'lever' }],
    related: ['c06'] },
  { id: 'changlan', name: '长澜港口集团', type: '集团总部', industry: '港口物流', revenue: 72, boardText: '非上市（国有）', district: '临港区', relation: '结算户', chain: 50, touch: 2, need: 60, comp: 70, stage: 1, window: '三期码头扩建立项后融资招标',
    tags: ['国有集团', '2 家子公司在本行结算', '码头扩建 28 亿'],
    facts: ['公开信息：三期码头扩建立项，总投资 28 亿', '本行为其 2 家子公司结算行，月均结算 1,200 万', '公开招标：智慧港口信息系统'],
    banks: [{ name: '某国有大行', role: '主办行', share: 52, products: '项目贷 15 亿 · 集团资金池' }, { name: '某国有大行（二）', role: '协办行', share: 25, products: '项目贷' }, { name: '本行', role: '参与行', share: 6, products: '子公司结算' }],
    entry: '扩建项目银团参与与港口供应链金融（堆场货主融资）',
    bridges: [{ who: '子公司结算经办', desc: '本行结算账户日常经办', from: 'lin', to: 'fd', kind: 'have' }, { who: '汇源物流总经理', desc: '本行贷款客户，港口大客户', from: 'wang', to: 'cfo', kind: 'lever' }],
    related: ['c11', 'c05'] },
  { id: 'qiming', name: '启明半导体', type: '上市公司', industry: '半导体', revenue: 19, boardText: '科创板', district: '高新区', relation: '无往来', chain: 25, touch: 1, need: 72, comp: 55, stage: 0, window: '封测产线设备付汇集中期',
    tags: ['12 英寸封测扩产', '进口设备付汇', '产业基金持股 12%'],
    facts: ['公告：拟投资 9 亿建设 12 英寸封测产线', '公开信息：进口设备占比高，付汇需求集中在 2027 上半年', '产业基金持股 12%，为本行合作机构'],
    banks: [{ name: '某股份行', role: '主办行', share: 45, products: '流贷 2 亿 · 结算' }, { name: '某国有大行', role: '协办行', share: 30, products: '进口信用证' }],
    entry: '进口设备融资租赁与远期购汇，产业基金为共同关系方',
    bridges: [{ who: '产业基金投后负责人', desc: '本行合作机构，定期联席会', from: 'zhou', to: 'sec', kind: 'lever' }, { who: '融岚软件总经理', desc: '本行贷款客户，为启明提供 MES 系统', from: 'wang', to: 'cfo', kind: 'lever' }],
    related: ['c08'] },
  { id: 'yunfan', name: '云帆信息', type: '拟上市企业', industry: '软件服务', revenue: 5.2, boardText: '北交所辅导', district: '高新区', relation: '贷款客户', chain: 75, touch: 4, need: 68, comp: 30, stage: 3, window: '辅导验收前',
    tags: ['本行主办行', '北交所辅导', '省级专精特新'],
    facts: ['辅导备案：北交所上市辅导已备案', '本行流贷 800 万，结算主户与代发', '年报：营收 5.2 亿，同比 +31%'],
    banks: [{ name: '本行', role: '主办行', share: 55, products: '流贷 800 万 · 结算 · 代发' }, { name: '某城商行', role: '协办行', share: 25, products: '科创贷' }],
    entry: '深化：员工持股平台、募集资金专户、上市后市值管理配套',
    bridges: [{ who: '公司 CFO', desc: '本行主办行，月度沟通', from: 'wang', to: 'cfo', kind: 'have' }, { who: '公司董事长', desc: '支行行长年度拜访', from: 'huang', to: 'chairman', kind: 'have' }, { who: '董秘', desc: '上市辅导材料对接', from: 'zhou', to: 'sec', kind: 'have' }],
    related: ['c08'] },
  { id: 'ruipeng', name: '瑞鹏纺织集团', type: '大型企业', industry: '纺织服装', revenue: 54, boardText: '港股', district: '经开区', relation: '结算户', chain: 40, touch: 2, need: 55, comp: 68, stage: 1, window: '越南二期投产后跨境结算迁移',
    tags: ['出口占比 60%', '境内子公司在本行结算', '越南工厂二期'],
    facts: ['港股年报：营收 54 亿，出口占比 60%', '本行为其境内子公司结算行', '公告：越南工厂二期投产'],
    banks: [{ name: '某国有大行', role: '主办行', share: 48, products: '流贷 · 出口押汇' }, { name: '某外资行', role: '协办行', share: 22, products: '跨境资金池' }, { name: '本行', role: '参与行', share: 8, products: '境内子公司结算' }],
    entry: '跨境结算、远期结汇与出口订单融资',
    bridges: [{ who: '境内子公司财务经理', desc: '本行结算账户经办', from: 'lin', to: 'fd', kind: 'have' }, { who: '桂澜跨境电商总经理', desc: '本行结算户，瑞鹏东盟渠道合作方', from: 'lin', to: 'cfo', kind: 'lever' }],
    related: ['c05'] },
  { id: 'zhongtai', name: '中泰智能装备', type: '上市公司', industry: '智能装备', revenue: 45, boardText: '主板', district: '经开区', relation: '子公司往来', chain: 55, touch: 3, need: 74, comp: 58, stage: 2, window: '并购后整合期（资金归集需求）',
    tags: ['在手订单 38 亿', '子公司在本行授信', '并购扩张'],
    facts: ['公告：完成收购某自动化公司 100% 股权', '子公司中泰机器人在本行授信 1,500 万', '年报：在手订单 38 亿'],
    banks: [{ name: '某股份行', role: '主办行', share: 44, products: '流贷 4 亿 · 并购贷' }, { name: '本行', role: '协办行', share: 10, products: '子公司授信 1,500 万' }, { name: '某城商行', role: '参与行', share: 12, products: '票据' }],
    entry: '并购后整合期：集团资金归集与订单融资，从子公司上探母公司',
    bridges: [{ who: '中泰机器人财务总监', desc: '本行授信对接人', from: 'wang', to: 'fd', kind: 'have' }, { who: '宁桂精密机械董事长', desc: '本行客户，中泰设备采购方', from: 'wang', to: 'chairman', kind: 'lever' }, { who: '集团 CFO', desc: '出席本行产业沙龙', from: 'zhou', to: 'cfo', kind: 'have' }],
    related: ['ninggui', 'c08'] },
  { id: 'jinjiang', name: '锦江商业集团', type: '集团总部', industry: '商业地产', revenue: 63, boardText: '非上市', district: '城南区', relation: '无往来', chain: 10, touch: 0, need: 50, comp: 78, stage: 0, window: '第 7 个综合体开业前收单招标',
    tags: ['商业综合体 6 个', '租金收入 21 亿', '数字化改造'],
    facts: ['公开信息：新建第 7 个商业综合体，投资 9 亿', '公开招标：智慧停车与会员系统', '债券披露：租金收入 21 亿'],
    banks: [{ name: '某国有大行', role: '主办行', share: 58, products: '经营性物业贷 12 亿' }, { name: '某股份行', role: '协办行', share: 24, products: '流贷 · 收单' }],
    entry: '收单与商户结算生态切入，商户中有本行客户嘉禾连锁餐饮',
    bridges: [{ who: '嘉禾连锁餐饮总经理', desc: '本行结算户，锦江综合体主力商户', from: 'lin', to: 'cfo', kind: 'lever' }, { who: '商业联合会', desc: '支行行长为理事单位代表', from: 'huang', to: 'chairman', kind: 'lever' }],
    related: ['c09'] },
  { id: 'hailan', name: '海澜数据科技', type: '拟上市企业', industry: '数据服务', revenue: 6.8, boardText: '创业板辅导', district: '保税区', relation: '结算户', chain: 35, touch: 2, need: 60, comp: 35, stage: 1, window: '政务数据平台项目履约期',
    tags: ['创业板辅导', '本行结算户', '中标 1.2 亿'],
    facts: ['辅导备案：创业板上市辅导', '本行结算户，月均结算 300 万', '公开中标：某市政务数据平台 1.2 亿'],
    banks: [{ name: '某城商行', role: '主办行', share: 50, products: '流贷 5,000 万' }, { name: '本行', role: '协办行', share: 20, products: '结算' }],
    entry: '中标项目履约保函与订单融资，升级为主办行',
    bridges: [{ who: '公司财务经理', desc: '本行结算经办', from: 'lin', to: 'fd', kind: 'have' }, { who: '融岚软件总经理', desc: '本行客户，海澜技术合作方', from: 'wang', to: 'cfo', kind: 'lever' }],
    related: ['c08', 'c05'] },
  { id: 'hongyi', name: '弘毅化工集团', type: '大型企业', industry: '精细化工', revenue: 110, boardText: '主板', district: '临港区', relation: '贷款客户', chain: 45, touch: 2, need: 64, comp: 72, stage: 2, window: '环保技改投资落地期',
    tags: ['净利 7.8 亿', '本行流贷 5,000 万', '环保技改 4 亿'],
    facts: ['年报：营收 110 亿，净利 7.8 亿', '公告：环保技改投资 4 亿', '本行流贷 5,000 万，参与行'],
    banks: [{ name: '某国有大行', role: '主办行', share: 50, products: '综合授信 15 亿' }, { name: '某股份行', role: '协办行', share: 25, products: '票据池' }, { name: '本行', role: '参与行', share: 5, products: '流贷 5,000 万' }],
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
const wan = (n: number) => `${Math.round(n).toLocaleString('zh-CN')} 万`;
const NEEDS: Record<TType, string[]> = {
  集团总部: ['集团现金管理与子公司账户归集', '经销商 / 供应商供应链融资', '集团授信主办行与票据池'],
  上市公司: ['募集资金专户与监管', '供应商反向保理', '并购 / 产业整合融资', '员工持股计划配套'],
  拟上市企业: ['上市前规范：结算归集与专户', '募投项目配套固贷 / 设备租赁', '员工持股平台配套', '上市后市值管理与现金管理'],
  大型企业: ['供应链金融（上游经销 / 下游分销）', '固定资产 / 技改项目融资', '跨境结算与汇率避险', '票据池与集团资金池'],
};
const riskOf = (t: Target) => (t.comp >= 70 ? '现有主办行价格反制、决策链长且多头' : t.comp >= 50 ? '决策链多头，需同时覆盖 CFO 与董事长' : '需求时点把握，避免错过窗口期');

/* ------------------------------------------------------------------ 证据：由目标公开信息、行内触点与上传材料构造 */
const TAG_DICT = ['结算', '账户', '归集', '代发', '收单', '出口', '跨境', '结汇', '付汇', '海外', '进口', '供应', '经销', '供应链', '账期', '上市', '辅导', '募集', '定增', '受理', '中标', '保函', '项目', '投标', '招标', '主办行', '份额', '董事长', '技术', '研发', '产线', 'CFO', '财务', '授信', '贷款', '融资', '沙龙', '引荐', '协会', '行长', '管委会', '并购', '收购', '扩产', '子公司', '存款', '到任', '投资', '基金', '持股', '被执行', '逾期', '诉讼'];
const tagsOf = (s: string) => TAG_DICT.filter((k) => s.includes(k));
function srcOfFact(f: string): EvSource {
  if (/年报|营收|净利|研发投入|租金收入|供应商超过|债券披露/.test(f)) return '年报';
  if (/工商|新设|持股|到任|高管变动|变更|注册/.test(f)) return '工商变更';
  if (/公告|中标|招标|受理|辅导|定增|获批|立项|拟投资|拟收购|裁判/.test(f)) return '招投标公告';
  if (/本行|结算|贷款|授信|沙龙|开户|开立/.test(f)) return '行内合作记录';
  return '舆情';
}
const SECTOR_NEWS: Array<{ re: RegExp; text: string; tags: string[] }> = [
  { re: /食品|餐饮|农业/, text: '区域食品加工企业加速整合，并购后普遍存在多子公司账户分散、集团资金归集需求上升的情况', tags: ['并购', '子公司', '归集', '结算'] },
  { re: /新能源|光伏|储能/, text: '光伏组件扩产潮下，同业对拟上市新能源企业竞争激烈，募集资金专户与员工持股平台成为争夺焦点', tags: ['扩产', '上市', '募集', '主办行', '份额'] },
  { re: /装备|机械|重工|半导体|电子/, text: '高端装备与电子制造企业出口占比提升，保函、远期结汇与进口设备付汇需求集中释放', tags: ['出口', '保函', '结汇', '付汇', '技术', '产线'] },
  { re: /建筑|工程|地产|商业/, text: '市政项目集中开工带来履约保函与农民工工资专户需求，主办行多为国有大行', tags: ['中标', '保函', '项目', '主办行'] },
  { re: /医药|生物/, text: '科创板受理企业在问询期通常同步确定募集资金专户开户行，竞争窗口短', tags: ['上市', '受理', '募集', '研发'] },
  { re: /港口|物流|纺织|化工|软件|数据/, text: '行业龙头集团三期扩建与跨境布局带动银团与跨境结算需求，同业以集团资金池切入', tags: ['项目', '跨境', '主办行', '份额', '投资'] },
];
function buildEvidence(t: Target, docs: UDoc[], cons: Constraint[]): Evidence[] {
  const seed = hashStr(t.id);
  const r = rng(seed);
  const out: Evidence[] = [];
  let n = 0;
  const push = (e: Omit<Evidence, 'id' | 'relevance'> & { base: number }) => { n += 1; out.push({ ...e, id: `E${n}`, relevance: relevanceWith(e.base, e.tags, cons) }); };
  t.facts.forEach((f, i) => {
    const source = srcOfFact(f);
    push({ source, title: `${t.name} · ${f.split('：')[0]}`, time: dateOf(seed + i * 7, source === '行内合作记录' ? 3 : 8), excerpt: f, tags: [...tagsOf(f), source === '行内合作记录' ? '本行' : '公开'], entity: t.name, base: 66 + r() * 20,
      detail: source === '年报' ? '取自最近一期年度报告 / 债券募集说明书披露段落。' : source === '招投标公告' ? '取自交易所 / 公共资源交易平台公告全文，含时间节点。' : source === '工商变更' ? '取自企业信用信息公示的变更记录。' : source === '行内合作记录' ? '取自本行 CRM 与账户系统，属客户已建立业务关系的数据。' : '取自公开媒体报道。' });
  });
  t.bridges.forEach((b, i) => {
    const inner = b.kind === 'have' || /本行/.test(b.desc);
    push({ source: inner ? '行内合作记录' : '舆情', title: `触点 · ${b.who}`, time: dateOf(seed + 100 + i * 5, inner ? 4 : 10), excerpt: `${P(b.from).name}（${BANK_LABEL[b.from]}）→ ${b.who}：${b.desc}；可通达 ${ROLE_LABEL[b.to]}`, tags: ['触点', '引荐', ROLE_LABEL[b.to], ...tagsOf(b.desc), ...(b.from === 'huang' ? ['行长'] : [])], entity: t.name, base: (b.kind === 'have' ? 74 : 62) + r() * 12,
      detail: inner ? '关系来自本行客户经理维护记录与活动签到，联系方式为客户主动留存。' : '关系来自公开活动 / 合作机构名单，接触前须取得对方同意。' });
  });
  const main = t.banks[0]; const mine = t.banks.find((b) => b.name === '本行');
  push({ source: '行内合作记录', title: `${t.name} · 同业合作情况`, time: dateOf(seed + 300, 5), excerpt: `主办行 ${main.name} 份额约 ${main.share}%（${main.products}）；本行${mine ? `${mine.role}，份额 ${mine.share}%（${mine.products}）` : '暂无往来'}`, tags: ['主办行', '份额', '他行', '竞争', ...(mine ? ['本行'] : [])], entity: t.name, base: 70 + r() * 10, detail: '份额为公开披露的银行借款明细与客户告知信息的估算，不含征信数据。' });
  const news = SECTOR_NEWS.find((s) => s.re.test(t.industry)) ?? SECTOR_NEWS[5];
  push({ source: '舆情', title: `${t.industry} · 行业动态`, time: dateOf(seed + 400, 3), excerpt: news.text, tags: [...news.tags, '行业'], entity: t.industry, base: 52 + r() * 14, detail: '行业层面信息，用于判断需求时点与同业竞争方式，不针对单一主体。' });
  if (!t.facts.some((f) => srcOfFact(f) === '工商变更')) {
    const v = ['近 12 个月无股权与法定代表人变更', '近 12 个月新增对外投资 1 家（全资子公司）', '近 6 个月完成高管备案变更（新增副总经理 1 名）'][seed % 3];
    push({ source: '工商变更', title: `${t.name} · 工商信息`, time: dateOf(seed + 500, 6), excerpt: v, tags: ['工商', '子公司', '变更', ...(v.includes('高管') ? ['到任'] : [])], entity: t.name, base: 48 + r() * 12, detail: '取自企业信用信息公示系统。' });
  }
  docs.filter((d) => d.status === 'done').forEach((d, i) => out.push(docEvidence(d, `U${i + 1}`, t.name, cons)));
  return out;
}

/* ------------------------------------------------------------------ 成功率：计算构成随约束 / 参数 / 证据实时变化 */
interface Part { label: string; v: number; note: string }
interface Params { stageTo: number; win: number; res: '轻' | '标准' | '重' }
function rateParts(t: Target, cons: Constraint[], p: Params, ev: Evidence[], excluded: Set<string>, version: Version): { parts: Part[]; total: number } {
  const inc = ev.filter((e) => !excluded.has(e.id));
  const exN = ev.length - inc.length;
  const strong = inc.filter((e) => e.relevance >= 70).length;
  const ups = inc.filter((e) => e.source === '上传材料').length;
  const parts: Part[] = [
    { label: '基础值', v: 8, note: '规则引擎起点' },
    { label: '已知触点', v: t.touch * 6, note: `${t.touch} 个触点 × 6` },
    { label: '需求匹配', v: Math.round(t.need * 0.25), note: `匹配度 ${t.need}% × 0.25` },
    { label: '竞争强度', v: Math.round((100 - t.comp) * 0.12), note: `(100 − ${t.comp}) × 0.12` },
    { label: '决策链已知', v: Math.round(t.chain * 0.1), note: `${t.chain} × 0.10` },
    { label: '证据支撑', v: Math.min(12, strong * 2), note: `${strong} 条高相关证据 × 2${exN ? `（已排除 ${exN} 条）` : ''}` },
    { label: '上传材料', v: Math.min(9, ups * 3), note: ups ? `${ups} 份已识别 × 3` : '未上传（可上传年报 / 邮件 / 名片）' },
    { label: '已排除证据', v: -2 * exN, note: exN ? `${exN} 条标记不采信 × −2` : '无排除' },
  ];
  const cm: Array<[number, string]> = [];
  if (isOn(cons, 'noCredit')) cm.push([4, '不做授信：无需审批，落地门槛低']);
  if (isOn(cons, 'settlementFirst')) cm.push([3, '结算切入：非价格竞争']);
  if (isOn(cons, 'lowCost')) cm.push([-3, '预算有限：触达频次受限']);
  if (isOn(cons, 'leaderVisit')) cm.push([3, '行领导协访']);
  if (isOn(cons, 'chairTech') && t.bridges.some((b) => b.to === 'chairman')) cm.push([2, '董事长议题可对路']);
  if (isOn(cons, 'conservative')) cm.push([2, '稳健路径']);
  if (isOn(cons, 'fast')) cm.push([-3, '节奏过快']);
  if (isOn(cons, 'noPriceWar')) cm.push([1, '避免价格比较']);
  if (isOn(cons, 'fx') && !/出口|跨境|海外|进口/.test(t.facts.join())) cm.push([-2, '跨境诉求与目标证据不匹配']);
  if (isOn(cons, 'ipo') && t.type !== '拟上市企业' && t.type !== '上市公司') cm.push([-2, '上市配套与目标类型不匹配']);
  parts.push({ label: '约束修正', v: cm.reduce((s, x) => s + x[0], 0), note: cm.length ? cm.map((x) => `${x[1]} ${x[0] > 0 ? '+' : ''}${x[0]}`).join('；') : '无生效约束' });
  const pm: Array<[number, string]> = [];
  pm.push([p.win === 3 ? -6 : p.win === 12 ? 4 : p.win > 12 ? 5 : 0, `时间窗 ${p.win} 个月`]);
  pm.push([p.res === '轻' ? -4 : p.res === '重' ? 5 : 0, `资源投入「${p.res}」`]);
  const gap = p.stageTo - t.stage;
  if (gap > 2) pm.push([-3 * (gap - 2), `目标阶段跨 ${gap} 级`]);
  parts.push({ label: '参数修正', v: pm.reduce((s, x) => s + x[0], 0), note: pm.map((x) => `${x[1]} ${x[0] > 0 ? '+' : ''}${x[0]}`).join('；') });
  parts.push({ label: `版本 · ${VERSION_LABEL[version]}`, v: version === 'B' ? 5 : 0, note: version === 'B' ? '假设行领导早期介入、产品全量投放 +5' : '按现有触点稳步推进 +0' });
  const total = Math.max(8, Math.min(92, parts.reduce((s, x) => s + x.v, 0)));
  return { parts, total };
}

/* ------------------------------------------------------------------ 策略生成：证据 → 洞察 → 分阶段 → 路径 → 风险 → 30/60/90 */
interface Item { key: string; title: string; body: string; chain: Chain; variants: number }
interface PhaseItem extends Item { k: string; w: string; goal: string; acts: string[]; owner: string; ms: string }
interface Plan { insights: Item[]; phases: PhaseItem[]; risks: Item[]; d30: string[]; d60: string[]; d90: string[]; potential: { deposit: number; credit: number; settle: number }; pathRef: Record<number, string>; chairNote: string; leaderPath: boolean }
function buildPlan(t: Target, roles: Record<RoleKey, string>, cons: Constraint[], p: Params, ev: Evidence[], excluded: Set<string>, version: Version, alt: Record<string, number>): Plan {
  const pick = <T,>(key: string, vs: T[]) => vs[(alt[key] ?? 0) % vs.length];
  const inc = ev.filter((e) => !excluded.has(e.id));
  const evTag = (...tags: string[]) => inc.filter((e) => tags.some((tg) => e.tags.some((x) => x.includes(tg)))).sort((a, b) => b.relevance - a.relevance).slice(0, 3).map((e) => e.id);
  const evUp = inc.filter((e) => e.source === '上传材料').map((e) => e.id);
  const first = inc[0]?.id;
  const on = (k: string) => isOn(cons, k);
  const B = version === 'B';
  const huang = P('huang').name, zhou = P('zhou').name, wang = P('wang').name;
  const have = t.bridges.filter((b) => b.kind === 'have'); const lever = t.bridges.filter((b) => b.kind === 'lever');
  const b0 = t.bridges[0]; const bl = lever[0] ?? b0;
  const entryShort = t.entry.split('，')[0];
  const main = t.banks[0]; const mine = t.banks.find((b) => b.name === '本行');
  const pathRef: Record<number, string> = {};
  t.bridges.forEach((b, i) => { const e = inc.find((x) => x.title === `触点 · ${b.who}`); if (e) pathRef[i] = e.id; });

  const insights: Item[] = [];
  {
    const evs = [...evTag('公告', '中标', '辅导', '定增', '项目', '招标', '到任', '并购', '受理', '扩产'), ...evUp.slice(0, 1)].filter((x, i, a) => a.indexOf(x) === i).slice(0, 3);
    const vs = [
      `在窗口内以「${entryShort}」作为首次接触议题，先给方案框架，不谈价格`,
      `先递交一页纸 ${t.industry} 行业对标简报作为敲门砖，第二次会面再切入「${entryShort}」`,
      `借「${bl.who}」引荐直接约见 ${roles[bl.to]}（${ROLE_LABEL[bl.to]}），把议题压缩为一个 30 天内可落地的动作`,
    ];
    insights.push({ key: 'win', title: '时机窗口', variants: vs.length, body: `${t.window}；${evUp.length ? '上传材料与公开公告互相印证' : '公开公告给出明确时间节点'}`, chain: { evidence: evs.length ? evs : first ? [first] : [], judgement: `需求时点明确：${t.window}。${on('fast') ? '用户要求加快，窗口内需完成首次正式会面。' : `建议在 ${Math.min(p.win, 3)} 个月内完成首次正式会面。`}`, suggestion: pick('win', vs), confidence: B ? 0.78 : 0.84, counter: `若客户已在窗口内完成他行方案比选，需求可能被锁定；反例：${main.name} 作为主办行通常享有优先报价权。` } });
  }
  {
    const evs = [...evTag('主办行', '份额', '他行'), ...evTag('结算', '账户', '子公司')].filter((x, i, a) => a.indexOf(x) === i).slice(0, 3);
    const vs = on('noCredit')
      ? ['以子公司结算账户与资金归集为非价格切口，先做账户体系再谈综合合作', '以代发 / 收单等运营类产品建立日常黏性，用服务响应速度而非价格竞争', '以现金管理系统直联作为切入，争取成为结算协办行']
      : on('fx') ? ['以远期结汇 / 付汇与出口订单融资切入，主办行在该场景响应较慢', '以跨境资金池与境内外联动方案切入，避开境内流贷比价', `以「${NEEDS[t.type][0]}」为主、跨境产品为辅组合切入`]
        : NEEDS[t.type].slice(0, 3).map((n, i) => (i === 0 ? `以「${n}」为非价格切口，先建立对接机制再谈综合授信` : `以「${n}」切入，与主办行形成互补而非替代`));
    insights.push({ key: 'gap', title: '切入口与竞争', variants: vs.length, body: `主办行 ${main.name} 份额 ${main.share}%，本行 ${mine ? mine.share : 0}%`, chain: { evidence: evs, judgement: `${main.name} 以「${main.products}」占据主办行地位；${on('noPriceWar') ? '用户约束不打价格战，' : ''}本行在流贷价格上无优势，差异化应来自${on('noCredit') || on('settlementFirst') ? '账户与结算服务' : '场景类产品'}。`, suggestion: pick('gap', vs), confidence: 0.76, counter: `${main.name} 可能以降价反制；若本行产品在该场景无明显差异，切口会退化为价格比较。` } });
  }
  {
    const evs = [...Object.values(pathRef), ...evUp.filter((id) => inc.find((e) => e.id === id)?.tags.includes('名片'))].slice(0, 3);
    const chairTech = on('chairTech');
    const vs = chairTech
      ? [`以「技术改造 / 产线投资的资金安排」为议题，由 ${huang} 陪同拜访 ${roles.chairman}（董事长），携产业研究员出席`, `邀请 ${roles.chairman} 出席本行制造业技术金融沙龙，以同行案例引发交流，少用金融术语`, `先与 ${roles.fd}（财务总监）建立对接，请其引荐董事长谈技术投资规划`]
      : on('chairFocus') ? [`决策集中于董事长：由 ${huang} 出面，以战略议题（${t.window.split('（')[0]}）约见 ${roles.chairman}`, `先由 ${roles.cfo}（CFO）背书方案，再由行领导拜访董事长确认`, `通过「${bl.who}」引荐，安排非正式场合与董事长首次接触`]
        : [`以 ${roles.cfo}（CFO）为主攻，${roles.fd}（财务总监）为日常对接，${have.length ? `由「${have[0].who}」引荐` : `借「${bl.who}」引荐`}`, `先做通 ${roles.fd}（财务总监）的账户 / 结算需求，再上探 CFO`, `${B ? `由 ${huang} 直接致函 ${roles.chairman}（董事长）` : `邀请 CFO 出席本行产业沙龙`}，并请 ${zhou} 带产品团队跟进`];
    insights.push({ key: 'key', title: '关键人与路径', variants: vs.length, body: chairTech ? '董事长技术出身，议题应从产业与技术投入切入' : `${have.length} 条已有关系、${lever.length} 条可借力引荐`, chain: { evidence: evs, judgement: chairTech ? `董事长技术出身：对产线、技改与研发投入议题敏感，对金融术语兴趣低；CFO 为执行层。` : on('cfoFocus') ? `CFO / 财务总监为融资与银行关系决策人，需先建立日常对接。` : `${ROLE_LABEL.cfo} 决定银行关系，${ROLE_LABEL.fd} 负责账户与结算日常对接；决策链已知程度 ${t.chain}。`, suggestion: pick('key', vs), confidence: chairTech ? 0.7 : 0.74, counter: '关键人信息来自公开报道、名片与行内记录，若职务已变更将误导议题；反例：技术型董事长可能把银行事务完全授权 CFO。' } });
  }

  const from = t.stage, to = Math.max(p.stageTo, from);
  const idxs = from === to ? [to] : Array.from({ length: to - from + 1 }, (_, i) => from + i);
  const weight = [1, 1, 2, 1.5, 2];
  const totalW = idxs.reduce((s, i) => s + weight[i], 0);
  const weeks = Math.round(p.win * 4.3);
  let cursor = 1;
  const phases: PhaseItem[] = idxs.map((i) => {
    const k = PHASE_NAMES[i];
    const span = Math.max(1, Math.round((weight[i] / totalW) * weeks));
    const w = `第 ${cursor}–${cursor + span - 1} 周`; cursor += span;
    const lowCost = on('lowCost');
    let goal = '', acts: string[][] = [], owner = '', ms = '', evs: string[] = [];
    if (k === '认知') { goal = '完成目标画像与触点盘点，明确切入议题'; evs = evTag('公告', '年报', '工商'); owner = `${wang}（客户经理）`; ms = `触点地图与切入议题经 ${huang}（支行行长）确认`;
      acts = [[`研读公开信息：${inc[0]?.excerpt ?? t.facts[0]}`, '梳理集团架构、子公司开户情况与共同客户', `确认切入议题：${entryShort}`, ...(lowCost ? ['仅用公开信息与行内数据完成画像，不采购外部数据'] : [])], [`按上传材料与公告核对时间节点${evUp.length ? `（${evUp.join('、')}）` : ''}`, '列出 3 个可引荐的中间人并排序', `与 ${zhou} 商定产品团队配置`]]; }
    else if (k === '接触') { goal = `获得与 ${roles[b0.to]}（${ROLE_LABEL[b0.to]}）的首次正式会面`; evs = Object.values(pathRef).slice(0, 2); owner = `${wang} + ${zhou}`; ms = '首次会面完成，获得下一步议题与时间点';
      acts = [[B ? `由 ${huang} 直接致函 / 约见 ${roles.chairman}（董事长），客户经理随访` : `通过「${b0.who}」引荐：${b0.desc}`, lowCost ? '邀请出席本行产业沙龙（零边际成本触达）' : '安排行业专场交流或到访本行', '递交一页纸价值主张，不谈价格只谈场景'], [`借「${bl.who}」引荐，在对方主场做一次非正式沟通`, '以行业对标简报换取第二次会面', `${on('leaderVisit') || B ? `${huang} 行长` : zhou} 出席首次正式会面`]]; }
    else if (k === '建立信任') { goal = '以小切口业务证明专业能力与响应速度'; evs = evTag('结算', '账户', '子公司', '代发'); owner = `${zhou}（分行公司业务部）`; ms = on('noCredit') || on('settlementFirst') ? '首笔结算 / 账户类业务落地' : '首笔业务落地（结算 / 账户 / 代发）';
      acts = [[on('noCredit') || on('settlementFirst') ? '推动子公司 / 关联方结算账户、代发等低门槛业务' : '推动小额票据 / 结算业务先行', `提供 ${t.industry} 行业与同业对标分析`, '建立对接机制：周度沟通、专属产品经理'], ['先解决客户当前一个具体痛点（对账 / 归集 / 付汇时效）', '组织一次产品团队与客户财务部的工作坊', '以季度为周期给客户递交行业简报']]; }
    else if (k === '方案') { goal = on('noCredit') ? '提交账户与现金管理方案并完成行内评审' : '提交综合金融方案并完成行内方案评审'; evs = [...evTag('主办行', '份额'), ...evUp.slice(0, 1)].slice(0, 3); owner = `${zhou} + 产品团队 + ${huang}`; ms = '方案评审通过，客户书面反馈';
      const mods = on('noCredit') ? ['方案模块：账户体系与资金归集', '方案模块：现金管理系统直联', '方案模块：代发 / 收单 / 票据池（不含授信）'] : NEEDS[t.type].slice(0, 3).map((n) => `方案模块：${n}`);
      acts = [[...mods, `${on('leaderVisit') || B ? `${huang} 协访 ${roles.chairman}（董事长）就方案交换意见` : `${zhou} 与 ${roles.cfo}（CFO）逐条过方案`}`], [`先提交单一模块（${mods[0].replace('方案模块：', '')}）试点方案，通过后再扩展`, '邀请客户参加同业案例交流会', '行内预审通过后再正式提交，避免反复']]; }
    else { goal = on('noCredit') ? '账户开立、系统直联与资金归集上线' : '授信审批与首笔业务上线'; evs = evTag('本行', '结算', '授信'); owner = `${wang} + ${on('noCredit') ? '运营' : '授信审批 + 运营'}`; ms = on('noCredit') ? '首批结算迁移；纳入重点客户跟踪' : '授信批复；首笔业务落地；纳入重点客户跟踪';
      acts = [on('noCredit') ? ['账户开立与系统直联上线', '首批结算迁移与代发切换', '纳入重点客户跟踪，择机评估授信'] : ['授信申报与审批，准入以行内审批为准', '账户开立、系统直联与资金归集上线', '首笔提款 / 首批结算迁移'], ['以一家子公司作为试点先行上线', '设定 30 天运行复盘点', '复盘后再扩展至集团其他成员']]; }
    const chosen = pick(`ph:${k}`, acts);
    return { key: `ph:${k}`, k, w, goal, acts: chosen, owner, ms, title: k, body: goal, variants: acts.length, chain: { evidence: evs, judgement: goal, suggestion: chosen[0], confidence: Math.max(0.5, 0.86 - 0.06 * (i - from)), counter: i === from ? '当前阶段信息最充分；若中间人关系弱于记录，接触会延后 2–4 周。' : `越靠后的阶段越依赖前序里程碑；若「${PHASE_NAMES[i - 1]}」未达成，本阶段动作不应启动。` } };
  });

  const risks: Item[] = [];
  {
    const vs = ['以非价格产品先行，价格由行内定价审批后再谈', '引入分行产品团队组合报价，避免单产品比价', '暂缓综合授信，先做结算沉淀 6 个月再评估'];
    risks.push({ key: 'r1', title: riskOf(t), variants: vs.length, body: '', chain: { evidence: evTag('主办行', '份额', '他行'), judgement: `竞争强度 ${t.comp}%、决策链已知 ${t.chain}`, suggestion: `备选：${pick('r1', vs)}`, confidence: 0.7, counter: '若主办行关系稳固且客户无换行动机，本行短期只能做参与行。' } });
  }
  {
    const c = on('noCredit') ? { t: '不做授信可能削弱综合方案吸引力，客户可能仅把本行视为账户行', vs: ['把授信作为第二阶段选项写入方案，明确触发条件（结算沉淀达标）', '以现金管理增值服务弥补，如集团对账与资金可视化', '争取协办行地位而非主办行，降低期望'] }
      : on('lowCost') ? { t: '低成本触达频次不足，关系升温慢', vs: ['行内沙龙 + 引荐叠加，每月至少 1 次有效接触', '用行业简报维持存在感，以内容换会面', '集中资源于单一关键人，不铺开'] }
        : on('fast') ? { t: '节奏过快易越过合规与授权环节', vs: ['把授权确认设为每阶段前置条件', '并行推进但不跳过行内评审', '压缩内部流程而非客户流程'] }
          : { t: '决策链信息不完整，可能找错对接人', vs: [`先通过 ${roles.fd}（财务总监）确认决策流程`, '以名片交换与邮件往来补齐授权联系人', '通过共同客户侧面核实分工'] };
    risks.push({ key: 'r2', title: c.t, variants: c.vs.length, body: '', chain: { evidence: evUp.length ? evUp.slice(0, 2) : evTag('触点', '董事长', 'CFO'), judgement: '来自用户约束与触点记录的推断', suggestion: `备选：${pick('r2', c.vs)}`, confidence: 0.66, counter: '约束本身可能随客户反馈调整，备选方案需预留切换点。' } });
  }
  {
    const neg = inc.find((e) => e.tags.some((x) => ['被执行', '逾期', '诉讼'].includes(x)));
    const vs = ['设定 B 计划：以日常结算业务维持接触频次', '同步跟进关联客户，从子公司 / 供应商侧保持信息流', '将窗口延后判断写入 60 天复盘点'];
    risks.push({ key: 'r3', title: neg ? `舆情提示：${neg.excerpt.slice(0, 24)}…，需先核实` : `窗口期依赖单一事件（${t.window.split('（')[0]}），事件延期则节奏失效`, variants: vs.length, body: '', chain: { evidence: neg ? [neg.id] : evTag('公告', '项目', '中标'), judgement: neg ? '负面信息未核实前不宜推进授信类议题' : '公开公告给出的时间点可能延后', suggestion: `备选：${pick('r3', vs)}`, confidence: 0.62, counter: '事件延期也可能带来更长的窗口，需持续跟踪公告更新。' } });
  }

  const ph0 = phases[0];
  const d30 = [ph0.acts[0], '完成触点确认与联系人授权（名片 / 邮件往来）', on('lowCost') ? '邀请出席 9 月本行产业沙龙' : '安排首次正式会面', ...(B ? [`${huang} 致函 ${roles.chairman}（董事长）`] : [])];
  const d60 = ['完成首次 / 第二次会面，确认议题与时间表', on('settlementFirst') || on('noCredit') ? '提交子公司账户 / 归集方案框架' : '提交一页纸方案框架', '建立周度沟通机制与专属产品经理', ...(on('fx') ? ['出具汇率避险测算'] : [])];
  const d90 = [on('noCredit') ? '首批结算账户开立与归集上线' : '综合方案行内评审并提交客户', on('leaderVisit') || B ? `行领导协访 ${roles.cfo}（CFO）/ ${roles.chairman}（董事长）` : '产品团队专项交流', '复盘并决定是否推进至下一阶段'];
  const mult = B ? 1.25 : 1;
  const potential = { deposit: t.revenue * 10000 * 0.028 * mult, credit: on('noCredit') ? 0 : t.revenue * 10000 * 0.06 * mult, settle: t.revenue * 10000 * 0.12 * mult };
  return { insights, phases, risks, d30, d60, d90, potential, pathRef, chairNote: on('chairTech') ? '技术出身 · 以技术 / 产线议题切入' : '最终决策 · 战略议题', leaderPath: B || on('leaderVisit') };
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
        <line x1={cx} y1={cy} x2={needle.x} y2={needle.y} stroke="url(#hd-g-arc)" strokeWidth="3" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="9" fill="url(#hd-g-pin)" />
        <text x={cx} y={cy - 26} textAnchor="middle" fontSize="30" fontWeight="900" fill="#1e1b16">{v}%</text>
        <text x={cx} y={cy + 30} textAnchor="middle" fontSize="11" fill="#8c8478">开发成功率预估 · 随约束与证据实时重算</text>
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ 接触路径图（节点带证据引用） */
function PathMap({ t, roles, plan, evidence, excluded }: { t: Target; roles: Record<RoleKey, string>; plan: Plan; evidence: Evidence[]; excluded: Set<string> }) {
  const bankY: Record<BankKey, number> = { huang: 70, zhou: 170, wang: 270, lin: 370 };
  const cliY: Record<RoleKey, number> = { chairman: 60, cfo: 160, fd: 260, sec: 360 };
  const BX = 150, MX = 480, CX = 810, W = 250, H = 46;
  const mids = t.bridges.map((b, i) => ({ ...b, i, y: t.bridges.length === 1 ? 215 : 100 + i * (240 / (t.bridges.length - 1)) }));
  const curve = (x0: number, y0: number, x1: number, y1: number) => `M ${x0} ${y0} C ${(x0 + x1) / 2} ${y0}, ${(x0 + x1) / 2} ${y1}, ${x1} ${y1}`;
  const direct = t.relation !== '无往来';
  const bankOrder: BankKey[] = ['huang', 'zhou', 'wang', 'lin'];
  const cliOrder: RoleKey[] = ['chairman', 'cfo', 'fd', 'sec'];
  const card = evidence.find((e) => e.tags.includes('名片') && !excluded.has(e.id));
  return (
    <div className="hd-svg">
      <svg viewBox="0 0 960 430" role="img" aria-label="接触路径图">
        <defs>
          <linearGradient id="hd-n-bank" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#e85d55" /><stop offset="1" stopColor="#8e1b1b" /></linearGradient>
          <linearGradient id="hd-n-mid" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f7e2a5" /><stop offset="1" stopColor="#a9843a" /></linearGradient>
          <linearGradient id="hd-n-cli" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7fb0ff" /><stop offset="1" stopColor="#1d4ed8" /></linearGradient>
          <linearGradient id="hd-e-have" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#5fd3a0" /><stop offset="1" stopColor="#1f8a5a" /></linearGradient>
          <linearGradient id="hd-e-lever" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#f4b942" /><stop offset="1" stopColor="#d9781b" /></linearGradient>
          <linearGradient id="hd-e-lead" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#e85d55" /><stop offset="1" stopColor="#8e1b1b" /></linearGradient>
          <linearGradient id="hd-b-g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#3dbb86" /><stop offset="1" stopColor="#1f6b48" /></linearGradient>
          <linearGradient id="hd-b-o" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#ff9f4a" /><stop offset="1" stopColor="#d9781b" /></linearGradient>
          <linearGradient id="hd-b-e" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#7fb0ff" /><stop offset="1" stopColor="#1d4ed8" /></linearGradient>
          <linearGradient id="hd-b-x" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#e85d55" /><stop offset="1" stopColor="#8e1b1b" /></linearGradient>
          <marker id="hd-arr-g" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#1f8a5a" /></marker>
          <marker id="hd-arr-o" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#d9781b" /></marker>
          <marker id="hd-arr-r" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#c3272b" /></marker>
        </defs>
        <text x={BX} y={26} textAnchor="middle" fontSize="12" fontWeight="800" fill="#8e1b1b" letterSpacing="2">本 行</text>
        <text x={MX} y={26} textAnchor="middle" fontSize="12" fontWeight="800" fill="#9c7a2e" letterSpacing="2">中 间 人 · 触 点</text>
        <text x={CX} y={26} textAnchor="middle" fontSize="12" fontWeight="800" fill="#1d4ed8" letterSpacing="2">客 户 决 策 链</text>
        <path d={`M ${CX} ${cliY.chairman + H / 2} L ${CX} ${cliY.sec - H / 2}`} stroke="rgba(29,78,216,.25)" strokeWidth="2" strokeDasharray="2 4" fill="none" />
        {mids.map((b) => {
          const ref = plan.pathRef[b.i]; const off = ref ? excluded.has(ref) : false;
          return (
            <g key={b.i} opacity={off ? 0.3 : 1}>
              <path d={curve(BX + W / 2, bankY[b.from], MX - W / 2 + 10, b.y)} stroke={b.kind === 'have' ? 'url(#hd-e-have)' : 'url(#hd-e-lever)'} strokeWidth="3" fill="none" strokeDasharray={b.kind === 'have' ? undefined : '7 5'} markerEnd={b.kind === 'have' ? 'url(#hd-arr-g)' : 'url(#hd-arr-o)'} />
              <path d={curve(MX + W / 2 - 10, b.y, CX - W / 2, cliY[b.to])} stroke="url(#hd-e-lever)" strokeWidth="3" fill="none" strokeDasharray="7 5" markerEnd="url(#hd-arr-o)" />
            </g>
          );
        })}
        {direct && (
          <g>
            <path d={curve(BX + W / 2, bankY.wang, CX - W / 2, cliY.fd)} stroke="url(#hd-e-have)" strokeWidth="3" fill="none" markerEnd="url(#hd-arr-g)" opacity=".9" />
            <text x={(BX + CX) / 2} y={(bankY.wang + cliY.fd) / 2 - 8} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#155e3e">已有关系 · {t.relation}</text>
          </g>
        )}
        {plan.leaderPath && (
          <g>
            <path d={curve(BX + W / 2, bankY.huang, CX - W / 2, cliY.chairman)} stroke="url(#hd-e-lead)" strokeWidth="3.5" fill="none" strokeDasharray="3 4" markerEnd="url(#hd-arr-r)" />
            <text x={(BX + CX) / 2} y={(bankY.huang + cliY.chairman) / 2 - 10} textAnchor="middle" fontSize="10.5" fontWeight="800" fill="#8e1b1b">行领导直达 · 本版本建议</text>
          </g>
        )}
        {bankOrder.map((k) => (
          <g key={k}>
            <rect x={BX - W / 2} y={bankY[k] - H / 2} width={W} height={H} rx="12" fill="url(#hd-n-bank)" opacity=".95" />
            <text x={BX} y={bankY[k] - 3} textAnchor="middle" fontSize="12.5" fontWeight="800" fill="#fff">{BANK_LABEL[k]} · {P(k).name}</text>
            <text x={BX} y={bankY[k] + 13} textAnchor="middle" fontSize="10" fill="rgba(255,255,255,.85)">{P(k).focus}</text>
          </g>
        ))}
        {mids.map((b) => {
          const ref = plan.pathRef[b.i]; const off = ref ? excluded.has(ref) : false;
          return (
            <g key={b.i} opacity={off ? 0.4 : 1}>
              <rect x={MX - W / 2 + 10} y={b.y - H / 2} width={W - 20} height={H} rx="12" fill="url(#hd-n-mid)" />
              <text x={MX} y={b.y - 3} textAnchor="middle" fontSize="12.5" fontWeight="800" fill="#3a2a08">{b.who}</text>
              <text x={MX} y={b.y + 13} textAnchor="middle" fontSize="10" fill="#5a4410">{b.desc.length > 20 ? b.desc.slice(0, 20) + '…' : b.desc}</text>
              <rect x={MX + W / 2 - 66} y={b.y - H / 2 - 9} width="56" height="16" rx="8" fill={b.kind === 'have' ? 'url(#hd-b-g)' : 'url(#hd-b-o)'} />
              <text x={MX + W / 2 - 38} y={b.y - H / 2 + 3} textAnchor="middle" fontSize="9.5" fontWeight="800" fill="#fff">{b.kind === 'have' ? '已有关系' : '可借力'}</text>
              {ref && <><rect x={MX - W / 2 + 14} y={b.y - H / 2 - 9} width="34" height="16" rx="8" fill={off ? 'url(#hd-b-x)' : 'url(#hd-b-e)'} /><text x={MX - W / 2 + 31} y={b.y - H / 2 + 3} textAnchor="middle" fontSize="9.5" fontWeight="800" fill="#fff">{ref}{off ? '✕' : ''}</text></>}
            </g>
          );
        })}
        {cliOrder.map((k) => (
          <g key={k}>
            <rect x={CX - W / 2} y={cliY[k] - H / 2} width={W} height={H} rx="12" fill="url(#hd-n-cli)" />
            <text x={CX} y={cliY[k] - 3} textAnchor="middle" fontSize="12.5" fontWeight="800" fill="#fff">{ROLE_LABEL[k]} · {roles[k]}</text>
            <text x={CX} y={cliY[k] + 13} textAnchor="middle" fontSize="10" fill="rgba(255,255,255,.85)">{k === 'chairman' ? plan.chairNote : k === 'cfo' ? '融资与银行关系决策' : k === 'fd' ? '账户 / 结算 / 日常对接' : '信息披露 · 资本市场事务'}</text>
            {card && (k === 'chairman' || k === 'cfo') && <><rect x={CX + W / 2 - 44} y={cliY[k] - H / 2 - 9} width="34" height="16" rx="8" fill="url(#hd-b-o)" /><text x={CX + W / 2 - 27} y={cliY[k] - H / 2 + 3} textAnchor="middle" fontSize="9.5" fontWeight="800" fill="#fff">{card.id}</text></>}
          </g>
        ))}
      </svg>
      <div className="hd-legend">
        <span><i style={{ borderColor: '#1f8a5a' }} />已有关系（实线）</span>
        <span><i style={{ borderColor: '#d9781b', borderTopStyle: 'dashed' }} />可借力引荐（虚线）</span>
        {plan.leaderPath && <span><i style={{ borderColor: '#c3272b', borderTopStyle: 'dotted' }} />行领导直达</span>}
        <span className="ai-evref">E#</span><span className="ai-muted">节点上的证据编号可在证据面板核对；被标记不采信的路径将淡出</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ 页面 */
interface Hist { time: string; target: string; action: string; result: string; tone: 'green' | 'blue' | 'orange' | 'purple' }
const HIST0: Hist[] = [
  { time: '09-03 16:20', target: '中泰智能装备', action: '生成开发策略', result: '成功率 61% · 协访已完成', tone: 'green' },
  { time: '08-27 10:05', target: '东岭新能源', action: '行领导协访申请', result: '周慧敏协访 CFO · 已完成', tone: 'blue' },
  { time: '08-19 14:40', target: '铭泰电子科技', action: '生成开发策略', result: '接触阶段 · 待引荐', tone: 'orange' },
];
const MANUAL_CONS: Record<string, { label: string; group: Constraint['group'] }> = {
  lowCost: { label: '预算有限：优先低成本触达（引荐 / 沙龙 / 线上）', group: '资源' }, noPriceWar: { label: '不打价格战：以非价格因素竞争', group: '约束' },
  chairFocus: { label: '关键决策人：董事长', group: '关键人' }, leaderVisit: { label: '需要行领导协访', group: '资源' }, settlementFirst: { label: '以结算 / 账户类业务切入', group: '目标' },
  noCredit: { label: '不做授信：本轮不涉及授信 / 融资类产品', group: '约束' }, conservative: { label: '风格：稳健，优先风险可控路径', group: '约束' }, fx: { label: '涉及跨境结算 / 汇率避险', group: '目标' },
};
const EXAMPLES = ['半年内切入结算，不做授信', '董事长是技术出身', '预算有限，优先低成本触达', '不打价格战', '需要行长协访', '目标升级为协办行'];
const PRESET_Q = ['预算有限怎么做？', '能不能压缩到 3 个月？', '主办行会怎么反制？', '董事长该怎么接触？', '先做结算还是先谈授信？', '最大风险是什么？', '成功率是怎么算的？', '下一步先做什么？'];

export default function HighEndDevelopment() {
  const [q, setQ] = useState('');
  const [type, setType] = useState<'全部' | TType>('全部');
  const [rel, setRel] = useState<'全部' | Rel>('全部');
  const [selId, setSelId] = useState('shenghe');
  const [intent, setIntent] = useState('');
  const [manual, setManual] = useState<Constraint[]>([]);
  const [offKeys, setOffKeys] = useState<Set<string>>(new Set());
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [params, setParams] = useState<Params>({ stageTo: 3, win: 6, res: '标准' });
  const [docs, setDocs] = useState<UDoc[]>([]);
  const [phase, setPhase] = useState<Phase>('idle');
  const [token, setToken] = useState(0);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [alt, setAlt] = useState<Record<string, number>>({});
  const [version, setVersion] = useState<Version>('A');
  const [compare, setCompare] = useState(false);
  const [keep, setKeep] = useState<Record<Version, boolean>>({ A: true, B: false });
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [editing, setEditing] = useState(false);
  const [hl, setHl] = useState('');
  const [askReq, setAskReq] = useState<{ q: string; n: number } | null>(null);
  const [toast, setToast] = useState('');
  const [hist, setHist] = useState<Hist[]>(HIST0);
  const [applyOpen, setApplyOpen] = useState(false);
  const [form, setForm] = useState({ leader: 'huang', role: 'cfo' as RoleKey, topic: '', date: '2026-09-18' });
  const docRef = useRef<HTMLDivElement>(null);

  const list = useMemo(() => TARGETS.filter((t) => (type === '全部' || t.type === type) && (rel === '全部' || t.relation === rel) && (!q || t.name.includes(q) || t.industry.includes(q) || t.tags.some((x) => x.includes(q)))), [type, rel, q]);
  const t = TARGETS.find((x) => x.id === selId) ?? TARGETS[0];
  const idx = TARGETS.indexOf(t);
  const roles = useMemo(() => rolesOf(4100 + idx * 17), [idx]);
  const constraints = useMemo(() => {
    const parsed = parseIntent(intent);
    const all = [...parsed, ...manual.filter((m) => !parsed.some((x) => x.key === m.key))];
    return all.filter((c) => !removed.has(c.key)).map((c) => ({ ...c, on: !offKeys.has(c.key) }));
  }, [intent, manual, offKeys, removed]);
  const winFromText = valueOf(constraints, 'window');
  const lastWin = useRef<number | undefined>(undefined);
  useEffect(() => { if (typeof winFromText === 'number' && winFromText !== lastWin.current) { lastWin.current = winFromText; setParams((p) => ({ ...p, win: winFromText })); } }, [winFromText]);

  const evidence = useMemo(() => buildEvidence(t, docs, constraints), [t, docs, constraints]);
  const rateA = useMemo(() => rateParts(t, constraints, params, evidence, excluded, 'A'), [t, constraints, params, evidence, excluded]);
  const rateB = useMemo(() => rateParts(t, constraints, params, evidence, excluded, 'B'), [t, constraints, params, evidence, excluded]);
  const planA = useMemo(() => buildPlan(t, roles, constraints, params, evidence, excluded, 'A', alt), [t, roles, constraints, params, evidence, excluded, alt]);
  const planB = useMemo(() => buildPlan(t, roles, constraints, params, evidence, excluded, 'B', alt), [t, roles, constraints, params, evidence, excluded, alt]);
  const plan = version === 'A' ? planA : planB;
  const rate = version === 'A' ? rateA : rateB;
  const incN = evidence.filter((e) => !excluded.has(e.id)).length;
  const exN = evidence.length - incN;
  const done = phase === 'done';
  const ph = plan.phases[Math.min(phaseIdx, plan.phases.length - 1)];
  const myShare = t.banks.find((x) => x.name === '本行')?.share ?? 0;
  const SHARE_COLORS = ['linear-gradient(90deg,#3a86ff,#1d4ed8)', 'linear-gradient(90deg,#9b5de5,#6d28d9)', 'linear-gradient(90deg,#e63946,#8e1b1b)'];

  const flash = (m: string) => { setToast(m); window.setTimeout(() => setToast(''), 2600); };
  const flashHl = (k: string) => { setHl(k); window.setTimeout(() => setHl(''), 2600); };
  const now = () => '09-06 ' + new Date().toTimeString().slice(0, 5);
  const select = (id: string) => { setSelId(id); setPhase('idle'); setExcluded(new Set()); setAlt({}); setPhaseIdx(0); setDocs([]); setApplyOpen(false); };
  const generate = () => { setPhase('retrieving'); setToken((x) => x + 1); setPhaseIdx(0); setHist((h) => [{ time: now(), target: t.name, action: '生成开发策略', result: `约束 ${constraints.filter((c) => c.on).length} 项 · 材料 ${docs.length} 份 · 时间窗 ${params.win} 个月`, tone: 'green' }, ...h]); };
  const toggleEv = (id: string) => { setExcluded((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; }); flashHl('rate'); };
  const addCons = (key: string) => {
    const m = MANUAL_CONS[key]; if (!m) return;
    setRemoved((s) => { const n = new Set(s); n.delete(key); return n; }); setOffKeys((s) => { const n = new Set(s); n.delete(key); return n; });
    setManual((ms) => (ms.some((x) => x.key === key) ? ms : [...ms, { key, label: m.label, group: m.group, from: '追问对话', on: true }]));
    flashHl('intent');
  };
  const onApply = (a: ApplyAction) => {
    if (a.id === 'addCons' && a.payload) { addCons(a.payload); flash(`已应用：${a.label}`); }
    else if (a.id === 'removeCons' && a.payload) { const k = a.payload; setRemoved((s) => new Set(s).add(k)); setManual((ms) => ms.filter((x) => x.key !== k)); flashHl('intent'); flash(`已应用：${a.label}`); }
    else if (a.id === 'setWindow' && a.payload) { setParams((p) => ({ ...p, win: Number(a.payload) })); flashHl('params'); flash(`已应用：${a.label}`); }
    else if (a.id === 'setResource' && a.payload) { setParams((p) => ({ ...p, res: a.payload as Params['res'] })); flashHl('params'); flash(`已应用：${a.label}`); }
    else if (a.id === 'setVersion' && a.payload) { setVersion(a.payload as Version); setKeep((k) => ({ ...k, [a.payload as Version]: true })); flashHl('doc'); flash(`已应用：${a.label}`); }
    else if (a.id === 'plan') { setHist((h) => [{ time: now(), target: t.name, action: '加入拜访计划', result: plan.d30[0], tone: 'blue' }, ...h]); flashHl('days'); flash('30 天行动已加入拜访计划'); }
    else if (a.id === 'altKey') { setAlt((x) => ({ ...x, key: (x.key ?? 0) + 1 })); flashHl('insights'); flash('已换一种关键人接触思路'); }
    window.setTimeout(() => { if (a.id === 'plan') document.getElementById('hd-days')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100);
  };
  const answer = (qs: string): Answer => {
    const inc = evidence.filter((e) => !excluded.has(e.id));
    const byTag = (...tags: string[]) => inc.filter((e) => tags.some((tg) => e.tags.some((x) => x.includes(tg)))).sort((a, b) => b.relevance - a.relevance).slice(0, 3).map((e) => e.id);
    const items = [...plan.insights, ...plan.risks, ...plan.phases];
    const hit = items.find((it) => qs.includes(it.title));
    if (hit && /证据|依据|支持|反例|为什么/.test(qs)) return { text: `「${hit.title}」的判断：${hit.chain.judgement}\n支持证据 ${hit.chain.evidence.length} 条，其中 ${hit.chain.evidence.filter((id) => excluded.has(id)).length} 条已被你排除。反例 / 风险：${hit.chain.counter}\n如需不同角度，可点该条的「换一种思路」（共 ${hit.variants} 种）。`, evidence: hit.chain.evidence };
    if (/预算|成本|费用|花钱|便宜/.test(qs)) return { text: `按「预算有限」处理时，我会把接触方式改为三条低成本路径：① 通过已有关系「${t.bridges.find((b) => b.kind === 'have')?.who ?? t.bridges[0].who}」引荐（零成本）；② 邀请关键人出席本行 9 月产业沙龙；③ 以月度行业简报维持触达。成功率会因触达频次下降约 3 个点，但落地成本最低。`, evidence: byTag('触点', '沙龙', '引荐'), apply: isOn(constraints, 'lowCost') ? undefined : { id: 'addCons', label: '加入约束「预算有限」', payload: 'lowCost' } };
    if (/时间|多久|周期|几个月|压缩|加快|快|提前/.test(qs)) return { text: `当前时间窗 ${params.win} 个月，从「${PHASE_NAMES[t.stage]}」推进到「${PHASE_NAMES[params.stageTo]}」共 ${plan.phases.length} 个阶段。${params.win > 3 ? `压缩到 3 个月需要跳过「建立信任」的小切口业务，直接进入方案阶段，成功率会下降约 6 个点，且依赖行领导早期介入。` : `3 个月已是最紧节奏；放宽到 6 个月可保留小切口业务，成功率回升约 6 个点。`}`, evidence: byTag('公告', '项目', '到任'), apply: params.win > 3 ? { id: 'setWindow', label: '把时间窗改为 3 个月', payload: '3' } : { id: 'setWindow', label: '把时间窗放宽为 6 个月', payload: '6' } };
    if (/竞品|同业|他行|对手|主办行|份额|反制/.test(qs)) return { text: `${t.banks[0].name} 为主办行（份额 ${t.banks[0].share}%，${t.banks[0].products}）${t.banks[1] ? `，${t.banks[1].name} 为${t.banks[1].role}（${t.banks[1].share}%）` : ''}；本行 ${myShare}%。主办行最可能的反制是降价与捆绑集团资金池。建议避开流贷比价，以「${plan.insights[1].chain.suggestion}」形成互补。`, evidence: byTag('主办行', '份额', '他行'), apply: isOn(constraints, 'noPriceWar') ? undefined : { id: 'addCons', label: '加入约束「不打价格战」', payload: 'noPriceWar' } };
    if (/董事长|老板|实控人|一把手/.test(qs)) { const cb = t.bridges.find((b) => b.to === 'chairman'); return { text: `${roles.chairman}（董事长）${cb ? `可经「${cb.who}」（${cb.kind === 'have' ? '已有关系' : '可借力'}：${cb.desc}）触达` : '目前没有直达触点，需经 CFO 或行领导致函'}。${isOn(constraints, 'chairTech') ? '你已标注董事长技术出身，议题应围绕技改 / 产线投资的资金安排，少用金融术语。' : '若董事长有技术背景，可在约束里写明「董事长是技术出身」，我会改写议题。'}`, evidence: [...(cb ? [plan.pathRef[t.bridges.indexOf(cb)]] : []), ...byTag('董事长', '名片')].filter(Boolean).slice(0, 3), apply: isOn(constraints, 'chairFocus') || isOn(constraints, 'chairTech') ? { id: 'altKey', label: '换一种董事长接触思路' } : { id: 'addCons', label: '把董事长设为关键决策人', payload: 'chairFocus' } }; }
    if (/结算|账户|归集|代发/.test(qs)) return { text: `${t.name} 目前${myShare ? `在本行有${t.banks.find((b) => b.name === '本行')?.products}` : '与本行无结算往来'}。以结算切入的好处是不经授信审批、不与主办行比价；先做子公司 / 关联方账户与归集，再谈综合合作。成功率修正 +3。`, evidence: byTag('结算', '账户', '子公司'), apply: isOn(constraints, 'settlementFirst') ? undefined : { id: 'addCons', label: '加入目标「以结算切入」', payload: 'settlementFirst' } };
    if (/授信|贷款|融资|放款/.test(qs)) return isOn(constraints, 'noCredit')
      ? { text: `当前约束为「不做授信」：方案已去掉授信模块，授信潜力显示为 0，落地阶段改为账户与归集上线。若客户在方案阶段主动提出融资需求，可解除该约束，我会把「${NEEDS[t.type][1]}」作为第二阶段写入。`, evidence: byTag('授信', '贷款', '主办行'), apply: { id: 'removeCons', label: '解除「不做授信」约束', payload: 'noCredit' } }
      : { text: `${t.name} 全行业授信由 ${t.banks[0].name} 主导；本行先谈授信会直接进入价格比较。建议把授信放在结算沉淀之后，或明确本轮不做授信，成功率反而 +4（无需审批、门槛低）。`, evidence: byTag('授信', '贷款', '主办行'), apply: { id: 'addCons', label: '加入约束「不做授信」', payload: 'noCredit' } };
    if (/风险|反例|不确定|失败|问题/.test(qs)) return { text: `三条主要风险：${plan.risks.map((r, i) => `${i + 1}）${r.title}`).join('；')}。每条在策略书里都附有备选动作。${version === 'B' ? '当前为进取型版本，假设行领导早期介入；若不确定，可切换到稳健型。' : '当前为稳健型版本，已优先风险可控路径。'}`, evidence: plan.risks.flatMap((r) => r.chain.evidence).slice(0, 3), apply: version === 'B' ? { id: 'setVersion', label: '切换到稳健型版本', payload: 'A' } : isOn(constraints, 'conservative') ? undefined : { id: 'addCons', label: '加入约束「稳健」', payload: 'conservative' } };
    if (/下一步|怎么做|行动|先做什么|开始|第一步/.test(qs)) return { text: `未来 30 天：${plan.d30.map((x, i) => `${i + 1}）${x}`).join('；')}。`, evidence: plan.phases[0].chain.evidence, apply: { id: 'plan', label: '把 30 天行动加入拜访计划' } };
    if (/成功率|概率|把握|多少分/.test(qs)) return { text: `成功率 ${rate.total}% 的构成：${rate.parts.filter((p) => p.v !== 0).map((p) => `${p.label} ${p.v > 0 ? '+' : ''}${p.v}`).join('，')}。它不是固定值：排除一条高相关证据 −2，上传一份材料 +3，时间窗 3 个月 −6，资源投入「重」+5。`, evidence: inc.filter((e) => e.relevance >= 70).slice(0, 3).map((e) => e.id), apply: params.res === '重' ? undefined : { id: 'setResource', label: '资源投入调为「重」', payload: '重' } };
    if (/材料|上传|年报|名片|邮件/.test(qs)) return { text: `已读取上传材料 ${inc.filter((e) => e.source === '上传材料').length} 份。年报可校准银行借款与主办行份额；名片可确认授权联系人并标注到接触路径；邮件往来可提取客户原话诉求。上传后证据面板会新增 U 编号证据，成功率每份 +3。`, evidence: inc.filter((e) => e.source === '上传材料').map((e) => e.id).slice(0, 3) };
    if (/跨境|外汇|结汇|汇率/.test(qs)) return { text: `${/出口|跨境|海外|进口/.test(t.facts.join()) ? `${t.name} 的公开信息含跨境要素，可把远期结汇 / 付汇与出口订单融资作为切口。` : `${t.name} 的公开信息未见明显跨境要素，加入跨境目标会使证据不匹配（成功率 −2）。`}`, evidence: byTag('出口', '跨境', '付汇'), apply: isOn(constraints, 'fx') ? undefined : { id: 'addCons', label: '加入目标「跨境结算」', payload: 'fx' } };
    return { text: `我在 ${inc.length} 条证据里没有找到与「${qs}」直接相关的内容。可以：① 上传相关材料（年报 / 邮件 / 招标公告 / 名片）；② 在「我的目标 / 约束」里写明，我会重新检索并改写方案；③ 用快捷追问查看预算、时间、竞争、董事长、结算、授信、风险与下一步。`, evidence: inc.slice(0, 2).map((e) => e.id) };
  };
  const askItem = (it: Item) => setAskReq({ q: `「${it.title}」这条判断的证据和反例是什么？`, n: Date.now() });
  const altItem = (key: string, sec: string) => { setAlt((x) => ({ ...x, [key]: (x[key] ?? 0) + 1 })); flashHl(sec); };
  const submitApply = () => { const leader = P(form.leader); setHist((h) => [{ time: now(), target: t.name, action: '行领导协访申请', result: `${leader.name}协访 ${ROLE_LABEL[form.role]} · 待确认`, tone: 'blue' }, ...h]); setApplyOpen(false); flash(`协访申请已提交：${leader.name} · ${form.date}`); };
  const vsum = (v: Version) => { const pl = v === 'A' ? planA : planB; const rt = v === 'A' ? rateA : rateB; return { pl, rt }; };
  const HL = (k: string) => (hl === k ? ' ai-hl' : '');

  return (
    <div className="hd">
      <style>{AI_CSS}{CSS}</style>
      <div className="hd-crumb">智慧获客引擎 <ChevronRight size={12} /> <b>高端客户开发策略</b></div>
      <div className="hd-top">
        <div>
          <h1><Crown size={22} color="var(--gold-3)" />高端客户开发策略</h1>
          <p>面向大型企业、集团总部、上市公司与拟上市企业：输入目标与约束、上传材料，AI 检索证据、给出带推理链的分阶段策略；每一项输入都会实时改变结果。</p>
        </div>
        <div className="hd-acts">
          <button className="btn gold" onClick={() => { setForm((f) => ({ ...f, topic: t.entry, role: t.bridges[0].to })); setApplyOpen(true); }}><Send size={14} />提交行领导协访申请</button>
          <button className="btn" onClick={generate} disabled={phase === 'retrieving'}>{phase === 'retrieving' ? <><Search size={14} />检索证据中…</> : done ? <><RotateCcw size={14} />重新检索并生成</> : <><Sparkles size={14} />检索证据并生成策略</>}</button>
        </div>
      </div>
      <div className="hd-note">
        <span className="chip green"><ShieldCheck size={12} />线索仅用公开信息与客户授权信息 · 征信不用于营销 · 高管个人信息须客户授权</span>
        <span className="chip"><i />目标池 {TARGETS.length} 户</span>
        <span className="chip blue"><i />证据 {evidence.length} 条{exN ? ` · 已排除 ${exN} 条` : ''}</span>
        <span className="chip purple"><i />生效约束 {constraints.filter((c) => c.on).length} 项</span>
      </div>

      {/* 目标池 */}
      <div className="card fade-in">
        <div className="card-h">
          <div className="card-t"><span className="dot" />目标池 · 大型企业 / 集团总部 / 上市公司 / 拟上市企业</div>
          <span className="card-s">{list.length} / {TARGETS.length} 户 · 点击行选择目标 · 成功率按当前约束与参数计算</span>
        </div>
        <div className="hd-filters">
          <div className="ai-seg">{(['全部', ...TYPES] as const).map((x) => <button key={x} className={type === x ? 'on' : ''} onClick={() => setType(x)}>{x}</button>)}</div>
          <div className="hd-in"><Search size={13} color="var(--ink-3)" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="企业名 / 行业 / 标签" /></div>
          <div className="hd-in"><label>与本行关系</label><select value={rel} onChange={(e) => setRel(e.target.value as '全部' | Rel)}>{REL_OPTS.map((x) => <option key={x}>{x}</option>)}</select></div>
          <span className="ai-muted"><Filter size={12} style={{ verticalAlign: -2 }} /> 条件可叠加</span>
        </div>
        <div className="hd-tw">
          <table className="tbl">
            <thead><tr><th>企业</th><th>类型</th><th>营收</th><th>板块</th><th>总部</th><th>与本行关系</th><th>触点</th><th>阶段</th><th>预估成功率</th></tr></thead>
            <tbody>
              {list.map((x) => {
                const r = x.id === t.id ? rate.total : rateParts(x, constraints, params, [], new Set(), version).total;
                return (
                  <tr key={x.id} className={`hd-row${x.id === t.id ? ' sel' : ''}`} onClick={() => select(x.id)}>
                    <td><div className="nm">{x.name}</div><div className="sub">{x.industry} · {x.tags[0]}</div></td>
                    <td><span className={`chip ${x.type === '集团总部' ? 'purple' : x.type === '上市公司' ? 'blue' : x.type === '拟上市企业' ? 'green' : 'orange'}`}><i />{x.type}</span></td>
                    <td className="num"><b>{x.revenue} 亿</b></td><td>{x.boardText}</td><td>{x.district}</td><td>{x.relation}</td>
                    <td className="num">{x.touch} 个</td><td><span className="hd-badge">{PHASE_NAMES[x.stage]}</span></td>
                    <td><div className="hd-rate"><div className="bar"><i style={{ width: `${r}%` }} /></div><b className="num">{r}%</b></div></td>
                  </tr>
                );
              })}
              {list.length === 0 && <tr><td colSpan={9} className="ai-muted" style={{ textAlign: 'center', padding: 20 }}>无符合条件的目标，请调整筛选条件</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* 选中目标 + 输入 */}
      <div className="hd-g21 hd-mt">
        <div className="card gold fade-in">
          <div className="hd-hero">
            <h2><Building2 size={18} />{t.name} <span className="chip purple"><i />{t.type}</span><span className="chip"><i />{PHASE_NAMES[t.stage]}阶段</span></h2>
            <div className="ai-muted" style={{ marginTop: 4 }}>{t.industry} · {t.boardText} · 总部{t.district} · 与本行关系：{t.relation} · 时机窗口：{t.window}</div>
            <div className="hd-kv">
              <div className="k">营收规模<b>{t.revenue} 亿</b></div><div className="k">主办行<b>{t.banks[0].name}</b></div><div className="k">本行份额<b>{myShare}%</b></div>
            </div>
            <div className="hd-pot">
              <div className="p">存款潜力<b className="num">{wan(plan.potential.deposit)}</b></div>
              <div className="p green">授信潜力<b className="num">{plan.potential.credit ? wan(plan.potential.credit) : '本轮不涉及'}</b></div>
              <div className="p blue">结算潜力 / 年<b className="num">{wan(plan.potential.settle)}</b></div>
            </div>
            <div className="ai-muted" style={{ marginTop: 6 }}>潜力按营收规模、行内参数与当前版本（{VERSION_LABEL[version]}）测算；{t.related.length > 0 && <>关联客户：{t.related.map((id) => COMPANIES.find((c) => c.id === id)?.name).filter(Boolean).join('、')}</>}</div>
          </div>
          <div className={`hd-mt${HL('intent')}`} style={{ borderRadius: 12 }}>
            <IntentBox value={intent} onChange={setIntent} constraints={constraints} examples={EXAMPLES}
              onToggle={(k) => setOffKeys((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; })}
              onRemove={(k) => { setRemoved((s) => new Set(s).add(k)); setManual((ms) => ms.filter((x) => x.key !== k)); }} />
          </div>
          <div className={`hd-mt${HL('params')}`} style={{ borderRadius: 12 }}>
            <div className="ai-sec"><SlidersHorizontal size={12} />参数 <span className="ai-muted" style={{ letterSpacing: 0, fontWeight: 600 }}>改变后策略、阶段周数与成功率即时重算</span></div>
            <div className="ai-form">
              <label className="f">目标阶段<select className="hd-sel" value={params.stageTo} onChange={(e) => setParams({ ...params, stageTo: Number(e.target.value) })}>{[1, 2, 3, 4].map((i) => <option key={i} value={i}>{PHASE_NAMES[i]}{i <= t.stage ? '（深化）' : ''}</option>)}</select></label>
              <label className="f">时间窗<select className="hd-sel" value={params.win} onChange={(e) => setParams({ ...params, win: Number(e.target.value) })}>{[3, 6, 9, 12, 18].map((m) => <option key={m} value={m}>{m} 个月</option>)}</select></label>
              <label className="f">资源投入<div className="ai-seg">{(['轻', '标准', '重'] as const).map((r) => <button key={r} className={params.res === r ? 'on' : ''} onClick={() => setParams({ ...params, res: r })}>{r}</button>)}</div></label>
            </div>
          </div>
          <div className="hd-mt">
            <UploadDocs key={t.id} label="上传材料（年报 / 名片 / 往来邮件 / 招标公告等）" hint="材料识别后进入证据面板，成为带编号的引用；不留存原件" types={['企业年报', '名片', '往来邮件', '招标公告', '组织架构']} presets={[`${t.name}_2025年度报告.pdf`, `${roles.cfo}_CFO名片.jpg`, `${t.name}_往来邮件摘录.docx`, `${t.name}_采购招标公告.pdf`]} onChange={setDocs} />
          </div>
        </div>
        <div>
          <div className={`card fade-in${HL('rate')}`}>
            <div className="card-h"><div className="card-t"><GaugeIcon size={14} />成功率与计算构成</div><span className="hd-live"><Check size={11} />实时重算</span></div>
            <Gauge v={rate.total} />
            <table className="ai-formula">
              <tbody>
                {rate.parts.map((p) => <tr key={p.label}><td>{p.label}</td><td className={p.v < 0 ? 'neg' : p.v > 0 ? 'pos' : ''}>{p.v > 0 ? '+' : ''}{p.v}</td><td>{p.note}</td></tr>)}
                <tr className="sum"><td>合计（8–92 封顶）</td><td>{rate.total}%</td><td>版本 {version} · {VERSION_LABEL[version]}</td></tr>
              </tbody>
            </table>
          </div>
          <div className="card blue fade-in hd-mt">
            <div className="card-h"><div className="card-t"><Swords size={14} />竞争态势</div><span className="card-s">份额按公开信息与客户告知估算</span></div>
            <div className="hd-share">{t.banks.map((b, i) => <i key={b.name} style={{ width: `${b.share}%`, background: b.name === '本行' ? SHARE_COLORS[2] : SHARE_COLORS[i % 2] }} title={`${b.name} ${b.share}%`} />)}<i style={{ flex: 1, background: 'linear-gradient(90deg,rgba(201,162,77,.15),rgba(61,187,134,.12))' }} /></div>
            {t.banks.map((b, i) => <div className="hd-bank" key={b.name}><span style={{ width: 10, height: 10, borderRadius: 3, background: b.name === '本行' ? SHARE_COLORS[2] : SHARE_COLORS[i % 2], flexShrink: 0 }} /><div className="nm">{b.name}<small>{b.role}</small></div><div className="pr">{b.products}</div><div className="sh num">{b.share}%</div></div>)}
          </div>
        </div>
      </div>

      {/* 证据检索 */}
      <div className="card hd-mt fade-in"><EvidencePanel evidence={evidence} phase={phase} token={token} excluded={excluded} onToggle={toggleEv} onDone={() => setPhase('done')} title={`证据检索 · ${t.name}`} /></div>

      {/* 结果 */}
      {done && (
        <div className="fade-in">
          <div className="hd-mt">
            <AiConclusion tone={rate.total >= 60 ? 'green' : rate.total >= 40 ? 'gold' : 'red'} confidence={rate.total / 100}
              headline={`建议以「${t.entry.split('，')[0]}」为切口，${params.win} 个月内推进至「${PHASE_NAMES[Math.max(params.stageTo, t.stage)]}」；预估成功率 ${rate.total}%（${VERSION_LABEL[version]}）`}
              points={[`证据 ${incN} 条（上传材料 ${evidence.filter((e) => e.source === '上传材料').length} 份）${exN ? `，已排除 ${exN} 条` : ''}`, `关键人：${plan.insights[2].chain.judgement.split('：')[0].split('，')[0]}`, `首个动作：${plan.d30[0]}`, `主要风险：${plan.risks[0].title}`]}
              evidence={evidence.filter((e) => !excluded.has(e.id)).sort((a, b) => b.relevance - a.relevance).slice(0, 3).map((e) => `${e.id} ${e.title}`)}
              actions={['visit', 'sparring', 'forward']} onSystem={(_, label) => flash(`已${label}`)} />
          </div>

          {/* 版本 */}
          <div className={`card hd-mt${HL('doc')}`}>
            <div className="card-h">
              <div className="card-t"><Columns2 size={14} />方案版本 · A 稳健型 / B 进取型</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <div className="ai-seg">{(['A', 'B'] as Version[]).map((v) => <button key={v} className={version === v ? `on${v === 'B' ? ' gold' : ''}` : ''} onClick={() => setVersion(v)}>{v} · {VERSION_LABEL[v]}</button>)}</div>
                <button className={`btn sm ${compare ? 'gold' : 'ghost'}`} onClick={() => setCompare((c) => !c)}><Columns2 size={12} />{compare ? '收起对比' : '并排对比'}</button>
                <span className="ai-muted">已保留：{(['A', 'B'] as Version[]).filter((v) => keep[v]).map((v) => `${v} ${VERSION_LABEL[v]}`).join('、') || '无'}</span>
              </div>
            </div>
            {compare && (
              <div className="ai-vers fade-in">
                {(['A', 'B'] as Version[]).map((v) => { const { pl, rt } = vsum(v); return (
                  <div key={v} className={`ai-ver ${v}${version === v ? ' on' : ''}`} onClick={() => setVersion(v)}>
                    <div className="vh"><b>{v} · {VERSION_LABEL[v]}</b><span className={`chip ${v === 'A' ? 'green' : 'orange'}`}><i />{v === 'A' ? '按现有触点稳步推进' : '行领导早期介入 · 产品全量'}</span>
                      <label className="keep" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={keep[v]} onChange={(e) => setKeep({ ...keep, [v]: e.target.checked })} />保留</label></div>
                    <div className="vk"><div>成功率<b className="num">{rt.total}%</b></div><div>阶段数<b className="num">{pl.phases.length}</b></div><div>存款潜力<b className="num" style={{ fontSize: 12.5 }}>{wan(pl.potential.deposit)}</b></div></div>
                    <ul className="ai-ul vl"><li>切入：{pl.insights[1].chain.suggestion}</li><li>关键人：{pl.insights[2].chain.suggestion}</li><li>30 天首个动作：{pl.d30[0]}</li><li>主要风险：{pl.risks[0].title}</li></ul>
                  </div>
                ); })}
              </div>
            )}
          </div>

          {/* 策略书 */}
          <div className="card gold hd-mt hd-doc">
            <div className="card-h">
              <div className="card-t"><FileText size={14} />高端客户开发策略书 · {t.name} · {version} {VERSION_LABEL[version]}</div>
              <DocActions title={`高端客户开发策略书_${t.name}_${version}`} editing={editing} onEdit={() => { setEditing((e) => !e); flash(editing ? '已保存编辑' : '进入编辑：可直接修改策略书正文'); }} getHtml={() => docRef.current?.innerHTML ?? ''} onToast={flash} />
            </div>
            <div ref={docRef} className="ai-editable" contentEditable={editing} suppressContentEditableWarning>
              <h4><Search size={13} />一、证据（{incN} 条采信{exN ? `，${exN} 条已排除` : ''}）</h4>
              <p>{evidence.filter((e) => !excluded.has(e.id)).sort((a, b) => b.relevance - a.relevance).slice(0, 5).map((e) => `${e.id}《${e.title}》（${e.source}，${e.time}，相关度 ${e.relevance}%）`).join('；')}。{docs.length > 0 && `上传材料 ${docs.filter((d) => d.status === 'done').length} 份已纳入。`}</p>

              <h4><Lightbulb size={13} />二、洞察</h4>
              <div className={HL('insights')} style={{ borderRadius: 14 }}>
                {plan.insights.map((it) => (
                  <div key={it.key} className={`ai-item${(alt[it.key] ?? 0) > 0 ? ' alt' : ''}`}>
                    <div className="ih"><b>{it.title}</b><span className="ai-muted">{it.body}</span></div>
                    <ReasoningChain chain={it.chain} evidence={evidence} excluded={excluded} altIndex={alt[it.key] ?? 0} onAlt={() => altItem(it.key, 'insights')} onAsk={() => askItem(it)} />
                  </div>
                ))}
              </div>

              <h4><Milestone size={13} />三、分阶段策略（{params.win} 个月 · {plan.phases.length} 个阶段）</h4>
              <div className={HL('phases')} style={{ borderRadius: 14 }}>
                <div className="hd-steps">{plan.phases.map((p, i) => <div key={p.k} className={`hd-step${i === Math.min(phaseIdx, plan.phases.length - 1) ? ' on' : ''}`} onClick={() => setPhaseIdx(i)}><div className="k"><i>{i + 1}</i>{p.k}</div><div className="w">{p.w} · {p.owner.split('（')[0].split(' + ')[0]}</div></div>)}</div>
                <div className="hd-detail">
                  <div className="d gold"><b><Target size={11} style={{ verticalAlign: -1 }} /> 阶段目标</b>{ph.goal}</div>
                  <div className="d blue"><b><Route size={11} style={{ verticalAlign: -1 }} /> 关键动作</b><ul className="ai-ul">{ph.acts.map((a) => <li key={a}>{a}</li>)}</ul></div>
                  <div className="d purple"><b><Users size={11} style={{ verticalAlign: -1 }} /> 负责人</b>{ph.owner}</div>
                  <div className="d green"><b><BadgeCheck size={11} style={{ verticalAlign: -1 }} /> 里程碑</b>{ph.ms}</div>
                </div>
                <div className={`ai-item hd-mt${(alt[ph.key] ?? 0) > 0 ? ' alt' : ''}`}>
                  <div className="ih"><b>为什么这样安排「{ph.k}」</b></div>
                  <ReasoningChain chain={ph.chain} evidence={evidence} excluded={excluded} altIndex={alt[ph.key] ?? 0} onAlt={() => altItem(ph.key, 'phases')} onAsk={() => askItem(ph)} />
                </div>
              </div>

              <h4><Route size={13} />四、接触路径（节点带证据引用）</h4>
              <PathMap t={t} roles={roles} plan={plan} evidence={evidence} excluded={excluded} />
              <p style={{ marginTop: 6 }}>{t.bridges.map((b, i) => <span key={b.who}>{P(b.from).name}（{BANK_LABEL[b.from]}）→ {b.who} → {roles[b.to]}（{ROLE_LABEL[b.to]}）{plan.pathRef[i] && <EvRefs ids={[plan.pathRef[i]]} evidence={evidence} excluded={excluded} />}{i < t.bridges.length - 1 ? '；' : '。'}</span>)}</p>

              <h4><AlertTriangle size={13} />五、风险与备选</h4>
              <div className={HL('risks')} style={{ borderRadius: 14 }}>
                {plan.risks.map((it) => (
                  <div key={it.key} className={`ai-item${(alt[it.key] ?? 0) > 0 ? ' alt' : ''}`}>
                    <div className="ih"><b>{it.title}</b></div>
                    <ReasoningChain chain={it.chain} evidence={evidence} excluded={excluded} altIndex={alt[it.key] ?? 0} onAlt={() => altItem(it.key, 'risks')} onAsk={() => askItem(it)} />
                  </div>
                ))}
              </div>

              <h4 id="hd-days"><CalendarRange size={13} />六、30 / 60 / 90 天行动{params.win <= 3 && <span className="ai-muted" style={{ fontWeight: 600 }}>（覆盖全周期）</span>}</h4>
              <div className={`hd-days${HL('days')}`} style={{ borderRadius: 14 }}>
                <div className="hd-day d30"><b>前 30 天</b><ul className="ai-ul">{plan.d30.map((x) => <li key={x}>{x}</li>)}</ul></div>
                <div className="hd-day d60"><b>31–60 天</b><ul className="ai-ul">{plan.d60.map((x) => <li key={x}>{x}</li>)}</ul></div>
                <div className="hd-day d90"><b>61–90 天</b><ul className="ai-ul">{plan.d90.map((x) => <li key={x}>{x}</li>)}</ul></div>
              </div>
              <h4><Landmark size={13} />七、价值测算与合规</h4>
              <p>存款潜力 {wan(plan.potential.deposit)}，授信潜力 {plan.potential.credit ? wan(plan.potential.credit) : '本轮不涉及（约束：不做授信）'}，年结算潜力 {wan(plan.potential.settle)}；最终以行内审批为准。线索仅用公开信息与客户授权信息，征信不用于营销；不评价同业、不承诺审批结果，价格以行内定价审批为准。</p>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <span className="ai-tag"><Sparkles size={11} /> AI 生成 · 辅助建议 · 需人工复核</span>
              <button className="btn sm gold" onClick={() => { setForm((f) => ({ ...f, topic: t.entry, role: t.bridges[0].to })); setApplyOpen(true); }}><Send size={12} />提交行领导协访申请</button>
              <button className="btn sm ghost" onClick={() => onApply({ id: 'plan', label: '' })}><CalendarRange size={12} />30 天行动加入拜访计划</button>
            </div>
          </div>
        </div>
      )}

      {/* 协访申请 + 历史 */}
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
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}><button className="btn" onClick={submitApply}><Send size={14} />提交申请</button><span className="ai-muted">提交后进入行领导审批队列，确认后自动同步至拜访计划。</span></div>
          </div>
        ) : (
          <div className="card fade-in">
            <div className="card-h"><div className="card-t"><Handshake size={14} />如何让结果更可靠</div><span className="card-s">{t.name}</span></div>
            <ul className="ai-ul">
              <li><Upload size={11} style={{ verticalAlign: -1 }} /> 上传年报 / 名片 / 邮件往来 / 招标公告：每份材料成为带编号的证据并计入成功率。</li>
              <li>在「我的目标 / 约束」写明不做什么、时间窗与关键人背景：AI 解析后即时改写切入口、阶段与议题。</li>
              <li>对不认可的证据点「不采信」：推理链、路径图与成功率随之重算并注明排除数量。</li>
              <li>对任一条策略点「换一种思路」或「追问」：右下角对话会引用证据并允许一键应用到方案。</li>
            </ul>
          </div>
        )}
        <div className="card fade-in hd-hist">
          <div className="card-h"><div className="card-t"><History size={14} />历史记录</div><span className="card-s">最近 {hist.length} 条</span></div>
          {hist.slice(0, 6).map((h, i) => <div className="li" key={i}><span className={`chip ${h.tone}`}><i />{h.action}</span><div style={{ flex: 1, minWidth: 0 }}><div className="t">{h.target}</div><div className="s">{h.result}</div></div><span className="tm">{h.time}</span></div>)}
        </div>
      </div>

      <AskAi presets={PRESET_Q} answer={answer} evidence={evidence} excluded={excluded} onApply={onApply} request={askReq} evidenceCount={incN}
        intro={`我是 ${t.name} 开发策略的 AI 助手。我会基于证据面板中的证据回答，并在可以时给出「应用到方案」按钮。你可以问：预算、时间、竞品、董事长、结算、授信、风险、下一步。`} />
      {toast && <div className="ai-toast fade-in"><Check size={14} />{toast}</div>}
    </div>
  );
}
