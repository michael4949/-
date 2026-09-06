import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileSignature, Sparkles, Check, ChevronRight, ChevronLeft, Clock, Save, History, CloudUpload, ScanSearch, Grid3x3, ListTree, PenLine, Swords, ShieldCheck, FileOutput,
  AlertTriangle, CircleCheckBig, PencilLine, GripVertical, Trash2, Plus, ArrowUp, ArrowDown, Quote, BadgeCheck, RefreshCw, MapPin, X, Bold, Italic, List, Heading, FileText, Flag, Target, Layers, Scale, Search, Feather, Users,
} from 'lucide-react';
import UploadDocs, { type UDoc } from '../../components/UploadDocs';
import DocActions from '../../components/DocActions';
import AiConclusion from '../../components/AiConclusion';
import { PERSONAS } from '../../data/personas';
import { rng } from '../../lib/rng';
import './bid.css';

/* ============================================================ 基础：日期、种子、项目 */
const R = rng(20260906);
const today = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();
const addDays = (n: number, h = 0, m = 0) => { const d = new Date(today); d.setDate(d.getDate() + n); d.setHours(h, m, 0, 0); return d; };
const pad2 = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const md = (d: Date) => `${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const nowHM = () => { const d = new Date(); return `${md(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
const DEADLINE = addDays(13, 10, 0);
const CN = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十'];
const cn = (n: number) => CN[n - 1] ?? String(n);
const stripHtml = (h: string) => h.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');
const countText = (h: string) => stripHtml(h).replace(/\s+/g, '').length;

const PROJECT = {
  name: '某市国资集团综合金融服务采购项目',
  no: 'ZB-2026-GZJR-017',
  buyer: '某市国有资本运营集团有限公司',
  agent: '某市公共资源交易中心',
  bidder: '远山银行股份有限公司',
  branch: '远山银行 · 分行公司业务部',
};
const ME = PERSONAS[1];
const TEAM = [
  { name: '王志远', role: '主笔 · 客户经理', cls: '' },
  { name: '周慧敏', role: '复核 · 集团客户团队负责人', cls: 'g' },
  { name: '陈志刚', role: '技术方案 · 产品经理', cls: 'b' },
  { name: '黄丽华', role: '合规审核 · 法律合规部', cls: 'p' },
];
const STEPS = [
  { n: 1, t: '上传招标文件', s: '多模态识别', icon: <CloudUpload size={13} /> },
  { n: 2, t: '招标要求解析', s: 'AI 抽取 · 可修正', icon: <ScanSearch size={13} /> },
  { n: 3, t: '评分项响应矩阵', s: '要求 → 响应 → 得分', icon: <Grid3x3 size={13} /> },
  { n: 4, t: '投标书大纲', s: '按评分项组织', icon: <ListTree size={13} /> },
  { n: 5, t: '逐章起草', s: 'AI 起草 · 改写', icon: <PenLine size={13} /> },
  { n: 6, t: '同业对照与差异化', s: '公开信息事实对照', icon: <Swords size={13} /> },
  { n: 7, t: '合规与格式检查', s: '废标项 · 格式 · 术语', icon: <ShieldCheck size={13} /> },
  { n: 8, t: '定稿导出', s: '封面 · 目录 · 导出', icon: <FileOutput size={13} /> },
];

/* ============================================================ 步骤 2：解析结果 */
type Cat = '项目概况' | '资格条件' | '评分办法' | '废标条款' | '关键日期' | '格式要求';
const CATS: Cat[] = ['项目概况', '资格条件', '评分办法', '废标条款', '关键日期', '格式要求'];
interface Req { id: string; cat: Cat; k: string; v: string; page: string; conf: number; edited?: boolean; fatal?: boolean }
const DATES = [
  { k: '招标公告发布', v: ymd(addDays(-9)), page: '招标公告 P1' },
  { k: '招标文件获取截止', v: `${ymd(addDays(-2))} 17:00`, page: '招标文件 P2' },
  { k: '答疑与澄清截止', v: `${ymd(addDays(3))} 17:00`, page: '招标文件 P4' },
  { k: '投标文件递交截止 / 开标', v: `${ymd(DEADLINE)} 10:00`, page: '招标文件 P4' },
  { k: '评标', v: `${ymd(addDays(13))} 至 ${ymd(addDays(15))}`, page: '招标文件 P5' },
  { k: '中标候选人公示', v: ymd(addDays(18)), page: '招标文件 P5' },
  { k: '服务期起始（预计）', v: ymd(addDays(45)), page: '招标文件 P8' },
];
const REQS0: Req[] = [
  { id: 'r01', cat: '项目概况', k: '项目名称', v: PROJECT.name, page: '招标文件 P1', conf: 99 },
  { id: 'r02', cat: '项目概况', k: '招标编号', v: PROJECT.no, page: '招标文件 P1', conf: 99 },
  { id: 'r03', cat: '项目概况', k: '采购人 / 代理机构', v: `${PROJECT.buyer} / ${PROJECT.agent}`, page: '招标文件 P1', conf: 98 },
  { id: 'r04', cat: '项目概况', k: '服务范围', v: '集团本部及 38 家成员单位的资金归集与现金管理、供应链金融（应收账款保理、票据）、跨境结算与汇率避险、代发与结算、投行顾问服务', page: '招标文件 P3', conf: 96 },
  { id: 'r05', cat: '项目概况', k: '服务期限', v: '3 年，自合同签订之日起计算；年度考核合格可续签 1 年', page: '招标文件 P3', conf: 97 },
  { id: 'r06', cat: '项目概况', k: '归集规模', v: '成员单位日均存款余额约 42 亿元，年结算量约 310 亿元，上游供应商约 600 家', page: '技术规范书 P2', conf: 94 },
  { id: 'r07', cat: '项目概况', k: '中标数量', v: '拟确定 2 家合作银行，按综合评分排名分配份额（第一名 60%、第二名 40%）', page: '招标文件 P6', conf: 95 },
  { id: 'r11', cat: '资格条件', k: '主体资格', v: '在中国境内依法设立的商业银行，持有金融许可证与营业执照', page: '资格预审文件 P2', conf: 98 },
  { id: 'r12', cat: '资格条件', k: '分支机构', v: '在本市设有分行级机构，且本市营业网点不少于 20 个', page: '资格预审文件 P2', conf: 96 },
  { id: 'r13', cat: '资格条件', k: '系统能力', v: '具备银企直联与现金管理系统，核心系统通过信息系统安全等级保护三级测评（提供测评报告）', page: '资格预审文件 P3', conf: 95 },
  { id: 'r14', cat: '资格条件', k: '业绩要求', v: '2023 年 1 月以来承担过不少于 3 个集团客户资金管理或供应链金融服务项目（提供合同关键页）', page: '资格预审文件 P3', conf: 93 },
  { id: 'r15', cat: '资格条件', k: '信用要求', v: '近三年无重大违法违规记录，未被列入政府采购严重违法失信行为记录名单', page: '资格预审文件 P4', conf: 97 },
  { id: 'r16', cat: '资格条件', k: '联合体', v: '不接受联合体投标', page: '资格预审文件 P4', conf: 99 },
  { id: 'r21', cat: '评分办法', k: '评分结构', v: '技术 50 分、商务 30 分、价格 20 分，合计 100 分；综合评分法', page: '招标文件 P22', conf: 98 },
  { id: 'r22', cat: '评分办法', k: '技术分项', v: '综合金融服务方案 12、集团资金归集与现金管理系统 10、供应链金融方案 8、系统对接与信息安全 8、服务团队与响应机制 6、实施与过渡方案 6', page: '招标文件 P22–23', conf: 96 },
  { id: 'r23', cat: '评分办法', k: '商务分项', v: '同类项目业绩 10（每个 2 分）、资质与荣誉 6、服务网点与覆盖 6、服务承诺与违约责任 8', page: '招标文件 P24', conf: 96 },
  { id: 'r24', cat: '评分办法', k: '价格分项', v: '综合服务费率 12、存款利率与贷款定价 8；价格分按低价优先法计算，最低报价得满分', page: '招标文件 P25', conf: 95 },
  { id: 'r31', cat: '废标条款', k: '投标有效期', v: '投标有效期不足 90 天的，投标无效', page: '招标文件 P12', conf: 98, fatal: true },
  { id: 'r32', cat: '废标条款', k: '投标保证金', v: '未按要求缴纳投标保证金人民币 20 万元或未提供缴纳凭证的，投标无效', page: '招标文件 P12', conf: 97, fatal: true },
  { id: 'r33', cat: '废标条款', k: '签字盖章', v: '投标文件未经法定代表人或授权代表签字并加盖公章的，投标无效', page: '招标文件 P12', conf: 98, fatal: true },
  { id: 'r34', cat: '废标条款', k: '报价', v: '综合服务费率超出上限 0.35‰ / 年，或出现两个以上报价的，投标无效', page: '招标文件 P13', conf: 96, fatal: true },
  { id: 'r35', cat: '废标条款', k: '承诺口径', v: '服务承诺超出监管规定，或含利率承诺、收益承诺表述的，投标无效', page: '招标文件 P13', conf: 94, fatal: true },
  { id: 'r36', cat: '废标条款', k: '资格文件', v: '资格证明文件缺失、过期或与资格预审文件不一致的，投标无效', page: '招标文件 P13', conf: 97, fatal: true },
  ...DATES.map((d, i) => ({ id: `r4${i}`, cat: '关键日期' as Cat, k: d.k, v: d.v, page: d.page, conf: 96 + Math.round(R() * 3) })),
  { id: 'r51', cat: '格式要求', k: '装订与份数', v: '正本 1 份、副本 4 份、电子版 U 盘 1 份；A4 胶装，封面注明正 / 副本', page: '招标文件 P15', conf: 97 },
  { id: 'r52', cat: '格式要求', k: '字体字号', v: '正文仿宋小四、标题黑体三号、行距 1.5 倍', page: '招标文件 P15', conf: 96 },
  { id: 'r53', cat: '格式要求', k: '页码与目录', v: '全文连续编页码，须有目录并标注起始页码', page: '招标文件 P15', conf: 97 },
  { id: 'r54', cat: '格式要求', k: '章节顺序', v: '按招标文件第六章「投标文件格式」顺序编制：投标函为第一章、附件为最后一章，评分项响应表与评分办法一一对应', page: '招标文件 P16', conf: 95 },
  { id: 'r55', cat: '格式要求', k: '签章', v: '每页加盖投标人公章或骑缝章，涂改处须加盖校正章', page: '招标文件 P16', conf: 96 },
];
const EXTRACT_STEPS = [
  { t: '版面解析与章节切分', p: '识别招标文件 46 页、资格预审文件 9 页、技术规范书 18 页的章节结构，重建 11 张表格，定位评分办法与投标文件格式章。' },
  { t: '评分办法表格重建', p: '将评分办法解析为 12 个评分项，含分值、评审细则与所需支撑材料；技术 50 / 商务 30 / 价格 20。' },
  { t: '废标条款与格式要求抽取', p: '抽取 6 条投标无效情形与 5 条格式要求，逐条标注原文页码，供合规检查阶段逐项核对。' },
  { t: '关键日期识别与倒计时', p: `识别 7 个关键日期，投标截止 ${ymd(DEADLINE)} 10:00，已生成倒计时并同步到工作台。` },
  { t: '与我行材料库初步映射', p: '将 12 个评分项映射到行内投标模板、历史中标案例与资质业绩材料库，发现 6 项缺项，已列入右侧缺项提醒。' },
];

/* ============================================================ 步骤 3：评分项 */
type Part = '技术' | '商务' | '价格';
interface ScoreItem { id: string; part: Part; name: string; max: number; req: string; resp: string; support: string[]; base: number }
const SCORES: ScoreItem[] = [
  { id: 'T1', part: '技术', name: '综合金融服务方案', max: 12, req: '方案完整覆盖资金归集、供应链、跨境、结算与投行服务，针对集团业务特点提出定制安排，逻辑清晰、措施可行', resp: '以「集团资金归集 + 1.2 亿元保理覆盖 30 家供应商 + 进口信用证与远期购汇一体化」打包方案响应；以已建立的 3 亿元授信结构作为落地基础', support: ['综合金融服务方案（第 4 章）', '既有授信批复摘要', '产品说明书'], base: 10.5 },
  { id: 'T2', part: '技术', name: '集团资金归集与现金管理系统', max: 10, req: '支持多级账户体系、内部计价、预算控制、银企直联与集团资金视图，提供系统功能清单与界面', resp: '现金管理系统支持五级账户、内部计价与预算控制，银企直联对接用友 NC / SAP，提供集团资金驾驶舱', support: ['系统功能清单', '直联接口规范', '系统界面截图'], base: 9 },
  { id: 'T3', part: '技术', name: '供应链金融方案', max: 8, req: '面向成员单位上下游提供应收账款保理、票据等融资安排，明确确权方式、放款时效与系统实现', resp: '反向保理线上确权，T+0 放款；首期 1.2 亿元额度覆盖 30 家核心供应商，票据与保理组合使用', support: ['供应链金融方案（第 6 章）', '线上确权流程图'], base: 7.5 },
  { id: 'T4', part: '技术', name: '系统对接与信息安全', max: 8, req: '提供对接方案、数据安全与灾备安排，须提供信息系统安全等级保护三级测评报告', resp: '数据不出行、同城双活 + 异地备份；对接方案已编制，采用加密专线与双向认证', support: ['对接方案', '灾备说明'], base: 5 },
  { id: 'T5', part: '技术', name: '服务团队与响应机制', max: 6, req: '配备专属服务团队并明确响应时限、升级机制与考核安排', resp: '专属团队 6 人（团队负责人 + 产品经理 + 客户经理 + 科技对接），2 小时响应、24 小时处理、季度服务评审', support: ['团队名单与履历', '响应机制说明'], base: 5.5 },
  { id: 'T6', part: '技术', name: '实施与过渡方案', max: 6, req: '明确实施计划、账户迁移与过渡期安排，保障成员单位资金运行不中断', resp: '90 天实施计划：30 天开户与直联、60 天归集上线、90 天全量切换；过渡期双轨运行', support: ['实施甘特图', '过渡期安排'], base: 5 },
  { id: 'B1', part: '商务', name: '同类项目业绩', max: 10, req: '2023 年以来同类项目业绩，每个 2 分，最高 10 分（提供合同关键页）', resp: '已具备 2 个同类项目合同关键页；第 3 个（2025 年某省级交通集团）待补充', support: ['业绩合同关键页 ×2'], base: 7 },
  { id: 'B2', part: '商务', name: '资质与荣誉', max: 6, req: '金融许可证、ISO 27001 认证、监管评级与行业奖项', resp: '金融许可证、监管评级 2 级、现金管理产品行业奖项 2 项', support: ['金融许可证', '荣誉证书'], base: 4.5 },
  { id: 'B3', part: '商务', name: '服务网点与覆盖', max: 6, req: '本市网点数量与成员单位所在区域覆盖情况', resp: '本市网点 27 个，覆盖 38 家成员单位中 34 家所在区县；以专属团队上门 + 线上渠道补足', support: ['网点清单'], base: 4 },
  { id: 'B4', part: '商务', name: '服务承诺与违约责任', max: 8, req: '服务承诺具体可考核，违约责任明确，不得含利率与收益承诺', resp: '承诺归集时效、放款时效与系统可用率 99.9%，违约按合同约定承担', support: ['服务承诺书（第 13 章）'], base: 7.5 },
  { id: 'P1', part: '价格', name: '综合服务费率', max: 12, req: '不高于 0.35‰ / 年（按归集日均余额计），低价优先', resp: '阶梯费率：归集余额 ≤ 30 亿元 0.30‰，超出部分 0.26‰', support: ['报价表'], base: 10 },
  { id: 'P2', part: '价格', name: '存款利率与贷款定价', max: 8, req: '在自律机制上限内报价，贷款定价以 LPR 加点表示', resp: '存款按自律机制上限执行；贷款 LPR(1Y) + 15BP 起（以审批为准）', support: ['定价表'], base: 7 },
];
const PARTS: { p: Part; max: number; cls: string }[] = [{ p: '技术', max: 50, cls: 't' }, { p: '商务', max: 30, cls: 'b' }, { p: '价格', max: 20, cls: 'p' }];

/* ============================================================ 缺项 */
interface Gap { id: string; score: string; item: string; why: string; owner: string; due: string; gain: number; chapter: string }
const GAPS: Gap[] = [
  { id: 'g1', score: 'T4', item: '信息系统安全等级保护三级测评报告与备案证明（扫描件）', why: '资格条件与技术分项 T4 均要求，材料库仅有 2023 年版备案证明，测评报告缺失', owner: '陈志刚 · 产品创新部 / 科技部', due: md(addDays(6)), gain: 2.5, chapter: 'c07' },
  { id: 'g2', score: 'B1', item: '第 3 个同类项目业绩合同关键页（2025 年某省级交通集团资金管理服务）', why: 'B1 按每个业绩 2 分计，当前 2 个；合同关键页在分行档案室待调取', owner: '周慧敏 · 分行公司业务部', due: md(addDays(5)), gain: 2, chapter: 'c10' },
  { id: 'g3', score: 'B2', item: 'ISO 27001 信息安全管理体系认证证书复印件（加盖公章）', why: 'B2 资质分项列明；证书原件在总行，需申请加盖公章的复印件', owner: '运营管理部', due: md(addDays(7)), gain: 1, chapter: 'c11' },
  { id: 'g4', score: 'T3', item: '供应链金融平台与集团 ERP（用友 NC）对接方案技术附件', why: 'T3 评审细则要求说明确权与放款时效的系统实现方式，当前仅有流程图', owner: '陈志刚 · 产品创新部', due: md(addDays(8)), gain: 1.5, chapter: 'c06' },
  { id: 'g5', score: 'P2', item: '分行定价审批意见（存款利率与贷款定价授权）', why: 'P2 报价须在授权范围内，需分行定价委员会出具意见后方可填报', owner: '授信审批部 · 资产负债管理部', due: md(addDays(9)), gain: 1.5, chapter: 'c14' },
  { id: 'g6', score: 'B3', item: '本市营业网点清单（加盖公章）与成员单位所在区县覆盖对照表', why: 'B3 要求按成员单位所在区域列示覆盖情况，当前仅有网点清单', owner: '运营管理部', due: md(addDays(4)), gain: 0.5, chapter: 'c12' },
];

/* ============================================================ 大纲与章节 */
type Kind = '格式' | '技术' | '商务' | '价格' | '附件';
interface Chapter { id: string; title: string; score?: string; kind: Kind; pages: number; required?: boolean }
const CHAPTERS0: Chapter[] = [
  { id: 'c01', title: '投标函及投标函附录', kind: '格式', pages: 3, required: true },
  { id: 'c02', title: '法定代表人身份证明及授权委托书', kind: '格式', pages: 2, required: true },
  { id: 'c03', title: '资格证明文件', kind: '格式', pages: 8, required: true },
  { id: 'c04', title: '综合金融服务方案', score: 'T1', kind: '技术', pages: 14 },
  { id: 'c05', title: '集团资金归集与现金管理系统方案', score: 'T2', kind: '技术', pages: 10 },
  { id: 'c06', title: '供应链金融方案', score: 'T3', kind: '技术', pages: 8 },
  { id: 'c07', title: '系统对接与信息安全方案', score: 'T4', kind: '技术', pages: 7 },
  { id: 'c08', title: '服务团队与响应机制', score: 'T5', kind: '技术', pages: 4 },
  { id: 'c09', title: '实施与过渡方案', score: 'T6', kind: '技术', pages: 5 },
  { id: 'c10', title: '同类项目业绩与案例', score: 'B1', kind: '商务', pages: 6 },
  { id: 'c11', title: '资质与荣誉', score: 'B2', kind: '商务', pages: 5 },
  { id: 'c12', title: '服务网点与区域覆盖', score: 'B3', kind: '商务', pages: 3 },
  { id: 'c13', title: '服务承诺书', score: 'B4', kind: '商务', pages: 3 },
  { id: 'c14', title: '报价文件', score: 'P1 / P2', kind: '价格', pages: 3, required: true },
  { id: 'c15', title: '附件', kind: '附件', pages: 6, required: true },
];
const KIND_CLS: Record<Kind, string> = { 格式: 'f', 技术: 't', 商务: 'b', 价格: 'p', 附件: 'a' };
const INITIAL = new Set(['c01', 'c02', 'c03', 'c04', 'c13', 'c14', 'c15']);

/** 章节初稿：行内投标模板 + 往期投标书 + 本项目解析结果 */
function draftOf(c: Chapter): string {
  switch (c.id) {
    case 'c01': return `<h4>投标函</h4><p>致：${PROJECT.buyer}</p><p>根据贵方「${PROJECT.name}」（招标编号：${PROJECT.no}）招标文件，${PROJECT.bidder}（以下简称"我行"）在研究上述招标文件全部内容后，愿意按招标文件要求提供集团资金归集与现金管理、供应链金融、跨境结算与汇率避险、代发与结算及投行顾问等综合金融服务，服务期 3 年。</p><p>我行承诺：本投标文件自投标截止之日起 120 天内有效；已按要求缴纳投标保证金人民币 20 万元（缴纳凭证编号：　　　　）；本投标文件所载内容真实、准确、完整，如有虚假愿承担相应责任。</p><p>我行同意按招标文件规定提供与本次投标有关的一切数据或资料，并理解贵方不一定接受最低报价或收到的任何投标。</p><h5>投标函附录</h5><table><tr><th>条款</th><th>内容</th></tr><tr><td>投标有效期</td><td>120 天</td></tr><tr><td>投标保证金</td><td>人民币 20 万元（银行保函）</td></tr><tr><td>服务期</td><td>3 年</td></tr><tr><td>综合服务费率报价</td><td>见报价文件（第十四章）</td></tr></table>`;
    case 'c02': return `<h4>法定代表人身份证明</h4><p>${PROJECT.bidder}法定代表人姓名、职务、身份证件号码见附页，特此证明。</p><h4>授权委托书</h4><p>本授权委托书声明：我行法定代表人授权分行行长为我行代理人，以我行名义参加「${PROJECT.name}」（招标编号：${PROJECT.no}）的投标活动，代理人在投标、开标、评标、合同谈判过程中所签署的一切文件和处理与之有关的一切事务，我行均予以承认。</p><p>代理人无转委托权。授权期限：自本授权书签署之日起至本项目合同签订之日止。</p>`;
    case 'c03': return `<h4>资格证明文件</h4><table><tr><th>序号</th><th>资格条件</th><th>证明材料</th><th>状态</th></tr><tr><td>1</td><td>主体资格</td><td>金融许可证、营业执照（副本复印件加盖公章）</td><td>已备</td></tr><tr><td>2</td><td>分支机构</td><td>分行设立批复、本市 27 个营业网点清单</td><td>网点清单待加盖公章</td></tr><tr><td>3</td><td>系统能力</td><td>信息系统安全等级保护三级测评报告、备案证明</td><td>测评报告待补充</td></tr><tr><td>4</td><td>业绩要求</td><td>同类项目合同关键页 ×3</td><td>已备 2 份，第 3 份待调取</td></tr><tr><td>5</td><td>信用要求</td><td>无重大违法违规记录声明、信用中国查询截图</td><td>已备</td></tr><tr><td>6</td><td>联合体</td><td>非联合体投标声明</td><td>已备</td></tr></table>`;
    case 'c04': return `<h4>综合金融服务方案</h4><h5>一、总体思路</h5><p>围绕采购人「资金看得见、管得住、用得好」的管理目标，我行以集团资金归集为主线，以供应链金融与跨境金融为两翼，以结算与代发服务为基础，构建覆盖集团本部及 38 家子公司的一体化金融服务体系。方案以已建立的 3 亿元授信结构为落地基础，首期投入 1.2 亿元反向保理额度覆盖 30 家核心供应商，并将进口信用证与远期购汇一体化安排，为成员单位提供从采购付款到汇率避险的闭环服务。</p><h5>二、服务内容</h5><table><tr><th>服务模块</th><th>主要内容</th><th>对应评分项</th></tr><tr><td>资金归集与现金管理</td><td>五级账户体系、资金集中与内部计价、预算控制、集团资金驾驶舱</td><td>T2</td></tr><tr><td>供应链金融</td><td>反向保理线上确权、供应链票据、经销商订单融资</td><td>T3</td></tr><tr><td>跨境金融</td><td>进口信用证、远期购汇与期权组合、跨境资金池</td><td>T1</td></tr><tr><td>结算与代发</td><td>归集帐户体系、代发工资、收付款直联</td><td>T1</td></tr><tr><td>投行顾问</td><td>并购顾问、债券承销与资金监管</td><td>T1</td></tr></table><h5>三、定制安排</h5><p>针对成员单位分布于 12 个区县、行业涵盖交通、水务、能源与地产的特点，我行按行业设置服务小组，对建设期项目匹配固定资产贷款与保函，对运营期项目匹配现金管理与供应链服务，对境外业务匹配跨境结算与避险产品，确保方案与各成员单位经营节奏相符。</p>`;
    case 'c13': return `<h4>服务承诺书</h4><p>致：${PROJECT.buyer}</p><p>我行就「${PROJECT.name}」作出如下服务承诺：</p><ol><li>资金归集时效：成员单位账户资金按约定规则于每日 17:00 前完成归集，归集成功率不低于 99.9%。</li><li>放款时效：反向保理经线上确权后 T+0 放款，票据贴现当日到账。</li><li>系统可用率：现金管理系统与银企直联年可用率不低于 99.9%，故障 2 小时内响应、24 小时内恢复。</li><li>专属团队：配备 6 人专属服务团队，团队负责人为集团客户团队负责人，服务期内保持稳定。</li><li>合同签定后 30 日内完成开户与直联，90 日内完成全量切换，过渡期双轨运行确保收益不受影响。</li><li>违约责任：未达到上述承诺的，按合同约定承担违约责任并减免当期服务费。</li></ol><p>本承诺书自投标截止之日起生效，并作为合同附件。</p>`;
    case 'c14': return `<h4>报价文件</h4><h5>一、综合服务费率</h5><table><tr><th>归集日均余额区间</th><th>综合服务费率（年）</th><th>说明</th></tr><tr><td>≤ 30 亿元部分</td><td>0.30‰</td><td>不高于招标上限 0.35‰</td></tr><tr><td>> 30 亿元部分</td><td>0.26‰</td><td>阶梯优惠</td></tr></table><h5>二、存款利率与贷款定价</h5><table><tr><th>项目</th><th>报价</th><th>说明</th></tr><tr><td>协定存款 / 通知存款</td><td>按市场利率定价自律机制上限执行</td><td>不高于自律上限</td></tr><tr><td>流动资金贷款</td><td>LPR(1Y) + 15BP 起</td><td>以行内授信审批为准</td></tr><tr><td>反向保理</td><td>LPR(1Y) + 20BP 起</td><td>以核心企业确权为前提</td></tr></table><p>本报价为唯一报价，投标有效期内不作变更；报价未含法律法规规定的税费以外的任何费用。</p>`;
    case 'c15': return `<h4>附件</h4><ol><li>金融许可证、营业执照复印件</li><li>信息系统安全等级保护三级测评报告与备案证明</li><li>ISO 27001 信息安全管理体系认证证书复印件</li><li>同类项目业绩合同关键页（3 份）</li><li>本市营业网点清单与成员单位覆盖对照表</li><li>专属服务团队名单与履历</li><li>现金管理系统功能清单与界面截图</li><li>投标保证金缴纳凭证</li></ol>`;
    default: {
      const s = SCORES.find((x) => x.id === c.score);
      if (!s) return `<h4>${c.title}</h4><p>本章按招标文件第六章「投标文件格式」要求编制，内容围绕采购人在「${PROJECT.name}」中提出的相关要求逐项响应。</p>`;
      return `<h4>${c.title}</h4><h5>一、招标要求理解</h5><p>招标文件评分办法对「${s.name}」（${s.id}，${s.max} 分）的要求为：${s.req}。我行理解采购人关注的核心是可落地、可考核与可持续，本章围绕上述要点逐项响应。</p><h5>二、我行响应</h5><p>${s.resp}。上述安排均在我行现有产品准入与授权范围内，不涉及超出监管规定的承诺。</p><h5>三、支撑材料</h5><ul>${s.support.map((x) => `<li>${x}</li>`).join('')}</ul>`;
    }
  }
}
const AI_LABEL: Record<string, string> = { draft: 'AI 起草', polish: '改写更专业', case: '补充案例', cred: '插入我行资质' };
/** AI 面板建议内容 */
function aiHtml(kind: string, c: Chapter): string {
  const s = SCORES.find((x) => x.id === c.score);
  if (kind === 'draft') return `<div class="ai-ins">${draftOf(c)}</div>`;
  if (kind === 'polish') {
    const p = s
      ? `<p class="ai-ins">针对招标文件评分办法中「${s.name}」（${s.id}，${s.max} 分）的评审要点，我行在充分理解采购人对${c.kind === '技术' ? '方案可落地性与系统能力' : c.kind === '商务' ? '履约能力与服务保障' : '报价合理性与授权合规'}的关注基础上，提出如下响应：${s.resp}。相关安排均已纳入我行现行产品准入与授权范围，并配套明确的考核指标与责任部门，确保服务期内持续、稳定交付。</p>`
      : `<p class="ai-ins">${PROJECT.bidder}谨就「${PROJECT.name}」（招标编号：${PROJECT.no}）作出本章响应。我行在完整理解招标文件、资格预审文件及技术规范书全部要求的基础上，按招标文件第六章规定的格式逐项编制，所载内容真实、准确、完整，并承诺在投标有效期内不作变更。</p>`;
    return p;
  }
  if (kind === 'case') return `<div class="ai-ins"><h5>同类项目案例</h5><p>案例一：2024 年某省级交通投资集团资金管理服务项目。我行为集团本部及 62 家成员单位搭建五级账户体系与资金归集，日均归集余额 18.6 亿元，归集成功率 99.97%，配套反向保理 2.3 亿元覆盖 41 家供应商，年度考核评价为"优秀"。</p><p>案例二：2025 年某市水务集团供应链金融服务项目。我行以线上确权反向保理为核心，首年放款 1.1 亿元、平均放款时效 T+0，供应商融资成本较此前下降约 1.2 个百分点，集团结算归集比例由 35% 提升至 71%。</p><p>以上案例的合同关键页与验收意见见附件，可供采购人核实。</p></div>`;
  return `<div class="ai-ins"><h5>我行资质与荣誉</h5><ul><li>金融许可证（机构编码见附件）、营业执照；监管评级 2 级。</li><li>核心系统通过信息系统安全等级保护三级测评；ISO 27001 信息安全管理体系认证。</li><li>现金管理产品获行业协会"年度现金管理服务奖"（2024、2025 年）。</li><li>本市营业网点 27 个，分行级机构 1 个，专属集团客户团队 12 人。</li><li>2023 年以来承担集团客户资金管理与供应链金融服务项目 3 个，均按合同完成验收。</li></ul></div>`;
}

/* ============================================================ 步骤 6：同业对照（仅公开渠道信息，事实对照） */
const RIVALS = [
  { name: PROJECT.bidder, me: true, type: '全国性股份制银行', platform: '自有供应链平台，反向保理线上确权，API 直连集团 ERP', fee: '0.30‰（阶梯，> 30 亿元部分 0.26‰）', outlets: '本市 27 个', cms: '五级账户、内部计价、预算控制、集团驾驶舱', wins: '3 个', src: '我行产品说明与投标资料' },
  { name: '同业 A', me: false, type: '大型国有银行', platform: '自有供应链平台，API 直连集团 ERP', fee: '0.30‰', outlets: '本市 86 个', cms: '多级账户与内部计价，支持预算控制', wins: '4 个', src: '该行官网产品说明、公开价目表、中标公告' },
  { name: '同业 B', me: false, type: '全国性股份制银行', platform: '与第三方供应链平台合作，票据 + 保理组合', fee: '0.28‰', outlets: '本市 31 个', cms: '多级账户与内部计价', wins: '2 个', src: '该行官网产品说明、公开价目表、中标公告' },
  { name: '同业 C', me: false, type: '本地法人银行', platform: '公开资料未见线上确权功能', fee: '0.25‰', outlets: '本市 112 个', cms: '基础版账户归集', wins: '3 个', src: '该行官网产品说明、公开价目表、中标公告' },
];
const DIAG = {
  adv: [
    { t: '反向保理线上确权与 T+0 放款', s: '对应 T3（8 分）、T1（12 分）；公开资料显示同业 B、C 未具备线上确权', w: 20 },
    { t: '已建立 3 亿元授信结构', s: '对应 T1、T6；可缩短实施周期并作为方案落地基础', w: 18 },
    { t: '跨境一体化（进口信用证 + 远期购汇）', s: '对应 T1；成员单位境外采购付汇需求可一并解决', w: 12 },
    { t: '专属团队与响应机制', s: '对应 T5（6 分）；2 小时响应、24 小时处理已在两个同类项目中执行', w: 6 },
  ],
  dis: [
    { t: '本市网点数量少于同业 A、C', s: '对应 B3（6 分）；27 个网点覆盖 34 / 38 家成员单位所在区县', w: 6 },
    { t: '等保三级测评报告待补充', s: '对应 T4（8 分）与资格条件；缺失将直接影响资格审查', w: 8 },
    { t: '同类业绩数量 3 个，少于同业 A', s: '对应 B1（10 分）；第 3 个业绩合同关键页待调取', w: 10 },
    { t: '综合费率高于同业 B、C 公开价目', s: '对应 P1（12 分）；低价优先法下价格分存在差距', w: 12 },
  ],
};
interface Strategy { id: string; t: string; p: string; chapter: string; score: string; gain: number; html: string }
const STRATEGIES: Strategy[] = [
  { id: 's1', t: '以「1.2 亿元保理覆盖 30 家供应商 + 进口信用证与远期购汇一体化 + 集团资金归集」打包响应', p: '把三项优势整合为一个可量化的总体方案，在 T1 中以数字表述，避免分散在各章。', chapter: 'c04', score: 'T1', gain: 0.5, html: `<p class="ai-ins">差异化安排：我行以「1.2 亿元反向保理额度覆盖 30 家核心供应商 + 进口信用证与远期购汇一体化 + 集团资金归集」作为本方案的整体交付，并承诺在合同签订后 90 日内全部落地；上述三项均以我行已建立的 3 亿元授信结构为基础，不需另行审批授信总量。</p>` },
  { id: 's2', t: '以线上确权时效（T+0）作为供应链方案核心指标', p: '公开资料显示两家同业不具备线上确权，将时效指标写入服务承诺并给出考核口径。', chapter: 'c06', score: 'T3', gain: 0.5, html: `<p class="ai-ins">核心指标：供应商在我行供应链平台完成线上确权后，融资款项当日到账（T+0）；确权环节与集团 ERP 直连，成员单位无需重复录入。上述时效纳入服务承诺并按月向采购人报送执行情况。</p>` },
  { id: 's3', t: '以「专属团队上门 + 线上渠道 + 邻近网点」对冲网点数量劣势', p: '将 B3 的回答从网点数量转为覆盖能力，列示每家成员单位对应的服务网点与上门频次。', chapter: 'c12', score: 'B3', gain: 0.5, html: `<p class="ai-ins">覆盖安排：38 家成员单位均指定 1 个主服务网点与 1 个备用网点，34 家位于网点所在区县，其余 4 家由专属团队每周上门服务 1 次，日常业务通过企业网银、银企直联与远程柜台办理，确保服务覆盖不受网点数量影响。</p>` },
  { id: 's4', t: '补充上年同类中标案例 2 个并给出可核实的数据', p: '在 B1 之外，用案例数据支撑 T1、T3 的可落地性；案例数据须与合同关键页一致。', chapter: 'c10', score: 'B1', gain: 0.5, html: `<p class="ai-ins">案例数据：2024 年某省级交通投资集团项目日均归集余额 18.6 亿元、归集成功率 99.97%；2025 年某市水务集团项目首年保理放款 1.1 亿元、平均放款时效 T+0。以上数据来源于合同验收意见，可供采购人核实。</p>` },
  { id: 's5', t: '价格部分采用阶梯费率，归集余额越高费率越低', p: '在不突破分行定价授权的前提下，以阶梯结构缩小与同业公开价目的差距，并说明费率所包含的服务内容。', chapter: 'c14', score: 'P1', gain: 0.5, html: `<p class="ai-ins">费率说明：本报价采用阶梯结构，归集日均余额 30 亿元以内按 0.30‰ 计，超出部分按 0.26‰ 计；费率已包含现金管理系统、银企直联、集团驾驶舱与专属团队服务，不另收系统对接费与账户管理费。</p>` },
  { id: 's6', t: '信息安全以「等保三级 + 数据不出行 + 独立灾备」三项承诺回应 T4', p: '在等保测评报告补齐前，先以架构与承诺回应评审细则，报告到位后补入附件。', chapter: 'c07', score: 'T4', gain: 0.5, html: `<p class="ai-ins">信息安全承诺：核心系统通过信息系统安全等级保护三级测评；采购人数据全部存储于我行境内数据中心，不向第三方提供；采用同城双活与异地备份，RPO ≤ 5 分钟、RTO ≤ 30 分钟，每年至少开展 1 次灾备切换。</p>` },
];

/* ============================================================ 步骤 7：检查 */
type CkGroup = '废标项核对' | '格式要求核对' | '错漏字' | '术语一致性';
type CkLevel = '致命' | '重要' | '建议' | '通过';
interface Check { id: string; group: CkGroup; level: CkLevel; text: string; sub?: string; chapter?: string; fix?: string }
const LEVEL_CLS: Record<CkLevel, string> = { 致命: 'fatal', 重要: 'major', 建议: 'minor', 通过: 'pass' };
function buildChecks(drafts: Record<string, string>, chapters: Chapter[], gapsDone: Record<string, boolean>, fixed: Record<string, boolean>): Check[] {
  const idx = (id: string) => chapters.findIndex((c) => c.id === id) + 1;
  const T = (id: string) => stripHtml(drafts[id] ?? '');
  const allText = chapters.map((c) => ({ c, t: T(c.id) }));
  const where = (re: RegExp) => allText.filter((x) => re.test(x.t)).map((x) => `第 ${idx(x.c.id)} 章`).join('、');
  const count = (re: RegExp) => allText.reduce((n, x) => n + (x.t.match(re)?.length ?? 0), 0);
  const out: Check[] = [];
  out.push(/120 天/.test(T('c01')) ? { id: 'k1', group: '废标项核对', level: '通过', text: '投标有效期 120 天，满足不少于 90 天的要求', chapter: 'c01' } : { id: 'k1', group: '废标项核对', level: '致命', text: '投标函未载明投标有效期或不足 90 天', sub: '招标文件 P12', chapter: 'c01' });
  out.push(/缴纳凭证编号：[\s　]*[）)]/.test(T('c01')) ? { id: 'k2', group: '废标项核对', level: '致命', text: '投标函未填写投标保证金缴纳凭证编号', sub: '招标文件 P12 · 未提供缴纳凭证的投标无效', chapter: 'c01', fix: 'bond' } : { id: 'k2', group: '废标项核对', level: '通过', text: '投标保证金 20 万元，缴纳凭证编号已填写', chapter: 'c01' });
  out.push(/0\.30‰/.test(T('c14')) ? { id: 'k3', group: '废标项核对', level: '通过', text: '综合服务费率 0.30‰（阶梯），未超出 0.35‰ 上限，报价唯一', chapter: 'c14' } : { id: 'k3', group: '废标项核对', level: '重要', text: '报价文件未填写综合服务费率或格式不符', sub: '招标文件 P13', chapter: 'c14' });
  const promise = allText.find((x) => /确保收益|保证收益|承诺收益/.test(x.t));
  out.push(promise ? { id: 'k4', group: '废标项核对', level: '重要', text: `第 ${idx(promise.c.id)} 章出现「确保收益」类表述，涉及收益承诺，须删除`, sub: '招标文件 P13 · 含收益承诺的投标无效', chapter: promise.c.id, fix: 'promise' } : { id: 'k4', group: '废标项核对', level: '通过', text: '全文未见利率承诺与收益承诺表述' });
  out.push(gapsDone.g1 ? { id: 'k5', group: '废标项核对', level: '通过', text: '资格证明文件齐全：等保三级测评报告已补充', chapter: 'c03' } : { id: 'k5', group: '废标项核对', level: '致命', text: '资格证明文件缺失：信息系统安全等级保护三级测评报告（资格条件第 3 项）', sub: '资格预审文件 P3 · 见右侧缺项提醒', chapter: 'c07' });
  out.push({ id: 'k6', group: '废标项核对', level: '通过', text: '法定代表人授权书已签字，公章页与骑缝章齐全', chapter: 'c02' });
  for (const c of chapters) if (c.score && !T(c.id).trim()) out.push({ id: `ke-${c.id}`, group: '格式要求核对', level: '重要', text: `第 ${idx(c.id)} 章「${c.title}」尚未起草，评分项 ${c.score} 将无响应`, sub: '招标文件 P16 · 评分项响应表须一一对应', chapter: c.id });
  out.push(fixed.pages ? { id: 'k7', group: '格式要求核对', level: '通过', text: '全文页码连续，目录已标注起始页码' } : { id: 'k7', group: '格式要求核对', level: '重要', text: `第 ${idx('c07') || 7} 章缺少页码，全文页码不连续`, sub: '招标文件 P15', chapter: 'c07', fix: 'pages' });
  out.push(fixed.font ? { id: 'k8', group: '格式要求核对', level: '通过', text: '标题黑体三号、正文仿宋小四，符合格式要求' } : { id: 'k8', group: '格式要求核对', level: '建议', text: `第 ${idx('c04') || 4} 章 3 处二级标题使用宋体，应为黑体三号`, sub: '招标文件 P15', chapter: 'c04', fix: 'font' });
  const orderOk = chapters[0]?.id === 'c01' && chapters[chapters.length - 1]?.id === 'c15' && idx('c14') < idx('c15');
  out.push(orderOk ? { id: 'k9', group: '格式要求核对', level: '通过', text: '章节顺序与招标文件第六章格式要求一致' } : { id: 'k9', group: '格式要求核对', level: '重要', text: '章节顺序与招标文件第六章不一致：投标函须为第一章，附件须为最后一章', sub: '招标文件 P16', chapter: 'c01' });
  const n1 = count(/帐户/g);
  out.push(n1 ? { id: 'k10', group: '错漏字', level: '建议', text: `「帐户」应为「账户」（${where(/帐户/)} 共 ${n1} 处）`, fix: 'typo1', chapter: allText.find((x) => /帐户/.test(x.t))?.c.id } : { id: 'k10', group: '错漏字', level: '通过', text: '「账户」用字一致' });
  const n2 = count(/签定/g);
  out.push(n2 ? { id: 'k11', group: '错漏字', level: '建议', text: `「签定」应为「签订」（${where(/签定/)} 共 ${n2} 处）`, fix: 'typo2', chapter: allText.find((x) => /签定/.test(x.t))?.c.id } : { id: 'k11', group: '错漏字', level: '通过', text: '「签订」用字一致' });
  const n3 = count(/资金集中/g);
  out.push(n3 ? { id: 'k12', group: '术语一致性', level: '建议', text: `「资金集中」与「资金归集」混用（${where(/资金集中/)} 共 ${n3} 处），统一为招标文件用语「资金归集」`, fix: 'term1', chapter: allText.find((x) => /资金集中/.test(x.t))?.c.id } : { id: 'k12', group: '术语一致性', level: '通过', text: '「资金归集」术语一致' });
  const n4 = count(/子公司/g);
  out.push(n4 ? { id: 'k13', group: '术语一致性', level: '建议', text: `「子公司」与「成员单位」混用（${where(/子公司/)} 共 ${n4} 处），统一为招标文件用语「成员单位」`, fix: 'term2', chapter: allText.find((x) => /子公司/.test(x.t))?.c.id } : { id: 'k13', group: '术语一致性', level: '通过', text: '「成员单位」术语一致' });
  out.push({ id: 'k14', group: '术语一致性', level: '通过', text: '采购人名称与招标编号全文一致' });
  return out;
}

const VERLOG0 = [
  { v: 'v0.3', t: `${md(addDays(-1))} 17:20`, who: '王志远', what: '按解析结果重排大纲，补充第 4 章定制安排' },
  { v: 'v0.2', t: `${md(addDays(-2))} 15:05`, who: '周慧敏', what: '复核资格条件与废标条款，标注 6 项缺项' },
  { v: 'v0.1', t: `${md(addDays(-3))} 10:40`, who: '王志远', what: '创建投标任务，导入行内投标模板与往期投标书' },
];

function useReveal(token: number, total: number, gap = 520) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    if (!token) return;
    const timers: number[] = [];
    for (let i = 1; i <= total; i++) timers.push(window.setTimeout(() => setN(i), gap * i));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [token, total, gap]);
  return n;
}

/* ============================================================ 页面 */
export default function BidWriter() {
  const [step, setStep] = useState(1);
  const [unlocked, setUnlocked] = useState(1);
  const [docs, setDocs] = useState<UDoc[]>([]);
  const [reqs, setReqs] = useState<Req[]>(REQS0);
  const [cat, setCat] = useState<Cat>('项目概况');
  const [editReq, setEditReq] = useState<string | null>(null);
  const [editVal, setEditVal] = useState('');
  const [extractTok, setExtractTok] = useState(0);
  const [mxTok, setMxTok] = useState(0);
  const [gapsDone, setGapsDone] = useState<Record<string, boolean>>({});
  const [chapters, setChapters] = useState<Chapter[]>(CHAPTERS0);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newKind, setNewKind] = useState<Kind>('技术');
  const [curCh, setCurCh] = useState('c04');
  const [drafts, setDrafts] = useState<Record<string, string>>(() => Object.fromEntries(CHAPTERS0.filter((c) => INITIAL.has(c.id)).map((c) => [c.id, draftOf(c)])));
  const [finals, setFinals] = useState<Record<string, boolean>>({});
  const [aiBusy, setAiBusy] = useState<string | null>(null);
  const [sug, setSug] = useState<{ kind: string; html: string } | null>(null);
  const [adopted, setAdopted] = useState<Record<string, boolean>>({});
  const [checking, setChecking] = useState(false);
  const [ran, setRan] = useState(false);
  const [fixed, setFixed] = useState<Record<string, boolean>>({});
  const [ver, setVer] = useState({ major: 0, minor: 3 });
  const [verLog, setVerLog] = useState(VERLOG0);
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const edRef = useRef<HTMLDivElement>(null);
  const aiTimer = useRef<number | null>(null);

  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(t); }, []);
  useEffect(() => { if (!toast) return; const t = window.setTimeout(() => setToast(null), 2600); return () => window.clearTimeout(t); }, [toast]);
  useEffect(() => () => { if (aiTimer.current) window.clearTimeout(aiTimer.current); }, []);
  useEffect(() => { if (step === 2 && extractTok === 0) setExtractTok(1); if (step === 3 && mxTok === 0) setMxTok(1); }, [step, extractTok, mxTok]);
  const extractN = useReveal(extractTok, EXTRACT_STEPS.length, 620);
  const extracted = extractTok > 0 && extractN >= EXTRACT_STEPS.length;
  const mxN = useReveal(mxTok, SCORES.length, 110);

  /* ---------- 派生 ---------- */
  const flash = (m: string) => setToast(m);
  const docsReady = docs.length > 0 && docs.every((d) => d.status === 'done');
  const hasTender = docs.some((d) => d.name.includes('招标'));
  const gapsOpen = GAPS.filter((g) => !gapsDone[g.id]);
  const scoreOf = (s: ScoreItem) => Math.min(s.max, s.base + GAPS.filter((g) => g.score === s.id && gapsDone[g.id]).reduce((a, g) => a + g.gain, 0) + STRATEGIES.filter((x) => x.score === s.id && adopted[x.id]).reduce((a, x) => a + x.gain, 0));
  const potentialOf = (s: ScoreItem) => Math.min(s.max, s.base + GAPS.filter((g) => g.score === s.id).reduce((a, g) => a + g.gain, 0) + STRATEGIES.filter((x) => x.score === s.id).reduce((a, x) => a + x.gain, 0));
  const total = SCORES.reduce((a, s) => a + scoreOf(s), 0);
  const potential = SCORES.reduce((a, s) => a + potentialOf(s), 0);
  const partScore = (p: Part) => SCORES.filter((s) => s.part === p).reduce((a, s) => a + scoreOf(s), 0);
  const left = Math.max(0, DEADLINE.getTime() - now);
  const cd = { d: Math.floor(left / 864e5), h: Math.floor((left % 864e5) / 36e5), m: Math.floor((left % 36e5) / 6e4), s: Math.floor((left % 6e4) / 1000) };
  const verStr = `v${ver.major}.${ver.minor}`;
  const cur = chapters.find((c) => c.id === curCh) ?? chapters[0];
  const curIdx = chapters.findIndex((c) => c.id === cur.id) + 1;
  const statusOf = (id: string) => (finals[id] ? '已定稿' : stripHtml(drafts[id] ?? '').trim() ? '草稿' : '待起草');
  const doneCh = chapters.filter((c) => statusOf(c.id) !== '待起草').length;
  const checks = useMemo(() => buildChecks(drafts, chapters, gapsDone, fixed), [drafts, chapters, gapsDone, fixed]);
  const ckCount = (lv: CkLevel) => checks.filter((c) => c.level === lv).length;
  const pageStart = useMemo(() => { let p = 3; return chapters.map((c) => { const s = p; p += c.pages; return s; }); }, [chapters]);
  const totalPages = chapters.reduce((a, c) => a + c.pages, 2);

  /* ---------- 动作 ---------- */
  const saveVersion = (what: string, major = false) => {
    const nv = major ? { major: ver.major + 1, minor: 0 } : { major: ver.major, minor: ver.minor + 1 };
    setVer(nv); setVerLog((l) => [{ v: `v${nv.major}.${nv.minor}`, t: nowHM(), who: ME.name, what }, ...l]);
    return `v${nv.major}.${nv.minor}`;
  };
  const flushEditor = () => { const el = edRef.current; if (!el) return; const html = el.innerHTML; setDrafts((d) => (d[curCh] === html ? d : { ...d, [curCh]: html })); };
  const goto = (s: number) => { if (s > unlocked) { flash('请先完成当前步骤，再进入后续步骤'); return; } flushEditor(); setStep(s); };
  const next = () => { flushEditor(); const s = Math.min(8, step + 1); setUnlocked((u) => Math.max(u, s)); setStep(s); };
  const locate = (chId: string, msg?: string) => { flushEditor(); setUnlocked((u) => Math.max(u, 5)); setSug(null); setCurCh(chId); setStep(5); const i = chapters.findIndex((c) => c.id === chId) + 1; const c = chapters.find((x) => x.id === chId); flash(msg ?? `已定位到第 ${i} 章「${c?.title ?? ''}」`); };
  const markGap = (g: Gap) => { setGapsDone((d) => ({ ...d, [g.id]: !d[g.id] })); if (!gapsDone[g.id]) { flash(`已登记补充：${g.item.slice(0, 18)}…，预计得分 +${g.gain}`); setVerLog((l) => [{ v: verStr, t: nowHM(), who: ME.name, what: `补充材料：${g.item.slice(0, 22)}` }, ...l]); } };
  const saveReq = (id: string) => { setReqs((rs) => rs.map((r) => (r.id === id && r.v !== editVal ? { ...r, v: editVal, edited: true, conf: 100 } : r))); setEditReq(null); flash('已保存人工修正，将同步到响应矩阵与合规检查'); };
  const move = (from: string, to: string) => setChapters((arr) => { const a = [...arr]; const i = a.findIndex((x) => x.id === from), j = a.findIndex((x) => x.id === to); if (i < 0 || j < 0) return arr; const [it] = a.splice(i, 1); a.splice(j, 0, it); return a; });
  const shift = (id: string, dir: -1 | 1) => setChapters((arr) => { const i = arr.findIndex((x) => x.id === id); const j = i + dir; if (i < 0 || j < 0 || j >= arr.length) return arr; const a = [...arr]; [a[i], a[j]] = [a[j], a[i]]; return a; });
  const removeCh = (c: Chapter) => { if (c.required) { flash('招标文件格式要求的章节不可删除'); return; } setChapters((arr) => arr.filter((x) => x.id !== c.id)); if (curCh === c.id) setCurCh('c04'); flash(`已删除章节「${c.title}」`); };
  const addCh = () => { const t = newTitle.trim(); if (!t) return; const id = `cx${Date.now()}`; setChapters((arr) => { const a = [...arr]; const last = a.findIndex((x) => x.id === 'c15'); a.splice(last < 0 ? a.length : last, 0, { id, title: t, kind: newKind, pages: 3 }); return a; }); setNewTitle(''); flash(`已新增章节「${t}」，可拖动调整位置`); };
  const selectChapter = (id: string) => { flushEditor(); setSug(null); setCurCh(id); };
  const runAi = (kind: string) => {
    flushEditor(); setAiBusy(kind); setSug(null);
    if (aiTimer.current) window.clearTimeout(aiTimer.current);
    aiTimer.current = window.setTimeout(() => { setAiBusy(null); setSug({ kind, html: aiHtml(kind, cur) }); }, 900);
  };
  const adopt = () => {
    if (!sug) return;
    const el = edRef.current; const curHtml = el ? el.innerHTML : (drafts[curCh] ?? '');
    let nextHtml: string;
    if (sug.kind === 'polish') { const m = curHtml.match(/<p[^>]*>[\s\S]*?<\/p>/); nextHtml = m ? curHtml.replace(m[0], sug.html) : sug.html + curHtml; }
    else if (sug.kind === 'draft' && !stripHtml(curHtml).trim()) nextHtml = sug.html;
    else nextHtml = curHtml + sug.html;
    setDrafts((d) => ({ ...d, [curCh]: nextHtml })); setSug(null); flash(`已采用「${AI_LABEL[sug.kind]}」并写入第 ${curIdx} 章`);
  };
  const exec = (cmd: string, arg?: string) => { edRef.current?.focus(); document.execCommand(cmd, false, arg); };
  const toggleStrategy = (s: Strategy) => {
    const on = !adopted[s.id];
    setAdopted((a) => ({ ...a, [s.id]: on }));
    if (on) { setDrafts((d) => ({ ...d, [s.chapter]: (d[s.chapter] ?? '') + s.html })); const i = chapters.findIndex((c) => c.id === s.chapter) + 1; flash(`已采纳并写入第 ${i} 章，评分项 ${s.score} 预计 +${s.gain}`); }
    else { setDrafts((d) => ({ ...d, [s.chapter]: (d[s.chapter] ?? '').replace(s.html, '') })); }
  };
  const runChecks = () => { flushEditor(); setChecking(true); setRan(false); window.setTimeout(() => { setChecking(false); setRan(true); saveVersion('合规与格式检查'); }, 1400); };
  const applyFix = (ck: Check) => {
    const rep = (re: RegExp, to: string) => setDrafts((d) => Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v.replace(re, to)])));
    switch (ck.fix) {
      case 'bond': rep(/缴纳凭证编号：[\s　]*）/g, '缴纳凭证编号：BG-2026-0917-0142）'); break;
      case 'promise': rep(/确保收益不受影响|确保收益|保证收益|承诺收益/g, '不承诺收益'); break;
      case 'typo1': rep(/帐户/g, '账户'); break;
      case 'typo2': rep(/签定/g, '签订'); break;
      case 'term1': rep(/资金集中/g, '资金归集'); break;
      case 'term2': rep(/子公司/g, '成员单位'); break;
      case 'pages': case 'font': setFixed((f) => ({ ...f, [ck.fix as string]: true })); break;
    }
    flash('已修正，检查结果已同步更新');
  };
  const finalHtml = () => {
    const css = '<style>body{font-family:"SimSun","Songti SC",serif;font-size:12pt;line-height:1.7;color:#000}h1{text-align:center;font-size:20pt}h2{font-size:15pt;margin:16pt 0 6pt}h4{font-size:14pt}h5{font-size:12.5pt}p{text-indent:2em;margin:0 0 6pt;text-align:justify}table{border-collapse:collapse;width:100%;margin:4pt 0 8pt}td,th{border:1pt solid #000;padding:3pt 5pt;font-size:10.5pt}.toc li{list-style:none;display:flex;justify-content:space-between}.cover{text-align:center;page-break-after:always}</style>';
    const cover = `<div class="cover"><p style="text-indent:0;letter-spacing:.3em">${PROJECT.bidder}</p><h1>${PROJECT.name}</h1><h1>投 标 文 件</h1><p style="text-indent:0">招标编号：${PROJECT.no}</p><p style="text-indent:0">投标人：${PROJECT.bidder}</p><p style="text-indent:0">投标日期：${ymd(addDays(12))}</p><p style="text-indent:0">版本：${verStr}</p></div>`;
    const toc = `<h2>目 录</h2><ol class="toc">${chapters.map((c, i) => `<li><span>第${cn(i + 1)}章 ${c.title}</span><span>${pageStart[i]}</span></li>`).join('')}</ol>`;
    const body = chapters.map((c, i) => `<h2>第${cn(i + 1)}章 ${c.title}</h2>${drafts[c.id] || '<p>（本章待起草）</p>'}`).join('');
    return css + cover + toc + body;
  };
  const finalize = () => {
    const fatal = checks.filter((c) => c.level === '致命').length;
    if (fatal) { flash(`仍有 ${fatal} 项致命问题未处理，请先完成合规与格式检查`); setStep(7); return; }
    const v = saveVersion('定稿', true); flash(`已定稿 ${v}，进入投标审批流程；可转呈分行公司业务部与法律合规部`);
  };

  /* ---------- 渲染：步骤内容 ---------- */
  const foot = (prevOk: boolean, nextLabel: string, nextOk = true, onNext?: () => void) => (
    <div className="bw-foot">
      <div>{prevOk && step > 1 && <button className="btn ghost sm" onClick={() => goto(step - 1)}><ChevronLeft size={13} />上一步</button>}</div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span className="ai-tag"><Sparkles size={11} /> AI 生成 · 辅助建议 · 需人工复核</span>
        {step < 8 && <button className="btn" disabled={!nextOk} onClick={onNext ?? next}>{nextLabel}<ChevronRight size={13} /></button>}
      </div>
    </div>
  );

  const renderStep = () => {
    switch (step) {
      case 1: return (
        <>
          <UploadDocs label="招标相关文件" required types={['招标文件（PDF / Word）', '资格预审文件', '技术规范书', '往期投标书', '资质证书扫描件']}
            hint="上传招标文件、资格预审文件与技术规范书（必需），往期投标书与资质证书扫描件用于素材复用；识别评分办法表格、废标条款、印章与扫描件文字"
            presets={[`${PROJECT.name}_招标文件.pdf`, '资格预审文件.docx', '技术规范书.pdf', '2025年某集团资金管理服务_投标书.docx', '金融许可证_扫描件.jpg', '等保三级备案证明_2023.jpg']}
            onChange={setDocs} />
          <div className="card fade-in">
            <div className="card-h"><div className="card-t"><Sparkles size={14} />AI 识别说明</div><span className="card-s">{docsReady ? `${docs.length} 份文件识别完成` : docs.length ? `${docs.filter((d) => d.status === 'done').length} / ${docs.length} 份已识别` : '等待上传'}</span></div>
            {!docsReady ? (
              <div className="bw-ai"><div className="h"><ScanSearch size={15} />识别引擎就绪</div><p>版面分析 + 表格重建 + 印章 / 手写检测。招标文件识别完成后，系统将自动抽取项目概况、资格条件、评分办法、废标条款、关键日期与格式要求，并逐项标注原文页码，供下一步人工修正。</p></div>
            ) : (
              <div className="bw-ai fade-in"><div className="h"><CircleCheckBig size={15} color="var(--green)" />识别完成，可进入招标要求解析</div>
                <ul>
                  <li><Check size={12} />招标文件：识别 46 页，定位评分办法（P22–25）、投标无效情形（P12–13）、投标文件格式（P15–16）</li>
                  <li><Check size={12} />资格预审文件与技术规范书：抽取资格条件 6 项、技术指标 23 项，其中 2 项与我行材料库存在差异</li>
                  <li><Check size={12} />往期投标书：解析 8 章 62 页，可复用段落 27 段（服务承诺、实施方案、团队介绍）</li>
                  <li><Check size={12} />资质证书扫描件：印章检测通过；等保备案证明为 2023 年版，招标要求提供测评报告，已列入缺项</li>
                  {!hasTender && <li><AlertTriangle size={12} color="var(--red)" />未检测到招标文件正文，建议补充后再解析</li>}
                </ul>
              </div>
            )}
            {foot(false, '进入招标要求解析', docsReady)}
          </div>
        </>
      );
      case 2: return (
        <div className="card fade-in">
          <div className="card-h"><div className="card-t"><span className="dot" />② 招标要求解析{!extracted && <span className="pulse" />}</div><span className="card-s">AI 抽取 · 每项带原文页码 · 可人工修正</span></div>
          {!extracted ? (
            <div className="think">
              {EXTRACT_STEPS.map((s, i) => { const st = i < extractN - 1 ? 'done' : i === extractN - 1 ? 'active' : 'pending'; if (st === 'pending' && i >= extractN) return null; return (
                <div key={s.t} className="step fade-in"><div className="n" style={i < extractN - 1 || extractN >= EXTRACT_STEPS.length ? { background: 'var(--g-green)' } : undefined}>{i < extractN - 1 ? <Check size={12} /> : i + 1}</div><div style={{ flex: 1 }}><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><b>{s.t}</b>{st === 'active' && <span className="pulse" />}</div><p>{s.p}</p></div></div>
              ); })}
            </div>
          ) : (
            <div className="fade-in">
              <div className="bw-weights">
                {PARTS.map((p) => <div key={p.p} className={`bw-w ${p.cls}`}><b>{p.max} 分</b><span>{p.p}部分 · 权重 {p.max}%</span><div className="sub">{SCORES.filter((s) => s.part === p.p).map((s) => `${s.name} ${s.max}`).join(' · ')}</div></div>)}
              </div>
              <div className="bw-cats">{CATS.map((c) => <button key={c} className={`bw-cat${cat === c ? ' on' : ''}`} onClick={() => setCat(c)}>{c}<span className="c">{reqs.filter((r) => r.cat === c).length}</span></button>)}</div>
              {reqs.filter((r) => r.cat === cat).map((r) => (
                <div key={r.id} className={`bw-req${r.fatal ? ' fatal' : ''}`}>
                  <div className="k">{r.fatal && <AlertTriangle size={12} color="var(--red)" style={{ verticalAlign: -2, marginRight: 4 }} />}{r.k}</div>
                  <div className="v">{editReq === r.id ? <input autoFocus value={editVal} onChange={(e) => setEditVal(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') saveReq(r.id); if (e.key === 'Escape') setEditReq(null); }} /> : r.v}</div>
                  <div className="m">
                    <span className="bw-ref" onClick={() => flash(`已打开原文定位：${r.page}`)}><MapPin size={10} />{r.page}</span>
                    {r.edited ? <span className="chip green" style={{ padding: '1px 8px', fontSize: 10.5 }}><i />人工修正</span> : <span className={`chip${r.conf < 95 ? ' orange' : ''}`} style={{ padding: '1px 8px', fontSize: 10.5 }}><i />置信 {r.conf}%</span>}
                    {editReq === r.id
                      ? <><button className="btn sm green" onClick={() => saveReq(r.id)}><Check size={12} />保存</button><button className="btn sm ghost" onClick={() => setEditReq(null)}><X size={12} /></button></>
                      : <button className="btn sm ghost" onClick={() => { setEditReq(r.id); setEditVal(r.v); }}><PencilLine size={12} />修正</button>}
                  </div>
                </div>
              ))}
              <div className="bw-ai" style={{ marginTop: 10 }}><div className="h"><Sparkles size={14} />AI 解析说明</div><p>评分办法解析为 12 个评分项（技术 50 / 商务 30 / 价格 20），6 条投标无效情形已标红并将在第 ⑦ 步逐项核对；{reqs.filter((r) => r.edited).length > 0 ? `已人工修正 ${reqs.filter((r) => r.edited).length} 项。` : '低置信项（< 95%）建议对照原文页码核对。'}投标截止 {ymd(DEADLINE)} 10:00，倒计时见顶部。</p></div>
              {foot(true, '确认解析结果，生成响应矩阵')}
            </div>
          )}
        </div>
      );
      case 3: return (
        <div className="card fade-in">
          <div className="card-h"><div className="card-t"><span className="dot" />③ 评分项响应矩阵{mxN < SCORES.length && <span className="pulse" />}</div><span className="card-s">要求 → 我行响应要点 → 支撑材料 → 预计得分 · 缺项标红</span></div>
          <div className="bw-tiles" style={{ marginBottom: 12 }}>
            <div className="tile gold"><b className="num">{total.toFixed(1)}<small>/ 100</small></b><span>预计总分 · 补齐缺项与采纳策略后可达 {potential.toFixed(1)}</span></div>
            {PARTS.map((p) => <div key={p.p} className={`tile ${p.cls === 't' ? 'red' : p.cls === 'b' ? 'gold' : 'green'}`}><b className="num">{partScore(p.p).toFixed(1)}<small>/ {p.max}</small></b><span>{p.p}部分 · {SCORES.filter((s) => s.part === p.p && GAPS.some((g) => g.score === s.id && !gapsDone[g.id])).length} 项存在缺项</span></div>)}
          </div>
          <div className="bw-tw">
            <table className="bw-mx">
              <thead><tr><th>评分项</th><th>招标要求</th><th>我行响应要点</th><th>支撑材料</th><th>预计得分</th></tr></thead>
              <tbody>
                {PARTS.map((p) => (
                  <PartRows key={p.p} part={p} rows={SCORES.filter((s) => s.part === p.p)} shown={mxN} all={SCORES} scoreOf={scoreOf} gapsDone={gapsDone} onLocate={locate} chapters={chapters} />
                ))}
              </tbody>
            </table>
          </div>
          <div className="bw-ai" style={{ marginTop: 12 }}><div className="h"><Sparkles size={14} />AI 诊断</div><p>当前预计 {total.toFixed(1)} 分，其中 {gapsOpen.length} 个评分项因材料缺失未得满分（合计可补 {gapsOpen.reduce((a, g) => a + g.gain, 0).toFixed(1)} 分）；同类项目历史中标线约 85–88 分，建议优先补齐等保测评报告（资格条件，缺失即废标）与第 3 份业绩合同。</p></div>
          {foot(true, '按评分项生成投标书大纲')}
        </div>
      );
      case 4: return (
        <div className="card fade-in">
          <div className="card-h"><div className="card-t"><span className="dot" />④ 投标书大纲</div><span className="card-s">按评分项自动组织 · 拖动排序 · 增删章节 · 预计 {totalPages} 页</span></div>
          <div className="bw-ol">
            {chapters.map((c, i) => (
              <div key={c.id} className={`bw-oli${dragId === c.id ? ' drag' : ''}${overId === c.id && dragId !== c.id ? ' over' : ''}`} draggable
                onDragStart={() => setDragId(c.id)} onDragOver={(e) => { e.preventDefault(); if (overId !== c.id) setOverId(c.id); }} onDragLeave={() => setOverId(null)}
                onDrop={(e) => { e.preventDefault(); if (dragId && dragId !== c.id) move(dragId, c.id); setDragId(null); setOverId(null); }} onDragEnd={() => { setDragId(null); setOverId(null); }}>
                <span className="hd"><GripVertical size={14} /></span>
                <span className={`no ${KIND_CLS[c.kind]}`}>{i + 1}</span>
                <div>
                  <div className="tt">{c.title}{c.score && <span className="chip" style={{ padding: '0 7px', fontSize: 10.5 }}><i />评分项 {c.score}</span>}{c.required && <span className="chip blue" style={{ padding: '0 7px', fontSize: 10.5 }}><i />格式要求</span>}<span className={`chip ${statusOf(c.id) === '已定稿' ? 'green' : statusOf(c.id) === '草稿' ? '' : 'red'}`} style={{ padding: '0 7px', fontSize: 10.5 }}><i />{statusOf(c.id)}</span></div>
                  <div className="ss">{c.kind}部分 · 预计 {c.pages} 页 · 起始第 {pageStart[i]} 页{c.score && ` · 对应 ${SCORES.filter((s) => c.score!.includes(s.id)).map((s) => `${s.name} ${s.max} 分`).join('、')}`}</div>
                </div>
                <div className="ac">
                  <button title="上移" disabled={i === 0} onClick={() => shift(c.id, -1)}><ArrowUp size={13} /></button>
                  <button title="下移" disabled={i === chapters.length - 1} onClick={() => shift(c.id, 1)}><ArrowDown size={13} /></button>
                  <button title="起草" onClick={() => locate(c.id)}><PenLine size={13} /></button>
                  <button title={c.required ? '格式要求章节不可删除' : '删除'} disabled={c.required} onClick={() => removeCh(c)}><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
          </div>
          <div className="bw-ol-add">
            <Plus size={14} color="var(--ink-3)" />
            <input value={newTitle} placeholder="新增章节标题，例如：数字化协同与数据服务" onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addCh(); }} />
            <select value={newKind} onChange={(e) => setNewKind(e.target.value as Kind)}>{(['技术', '商务', '价格', '格式', '附件'] as Kind[]).map((k) => <option key={k} value={k}>{k}部分</option>)}</select>
            <button className="btn sm gold" onClick={addCh}><Plus size={12} />新增章节</button>
          </div>
          <div className="bw-ai" style={{ marginTop: 12 }}><div className="h"><Sparkles size={14} />AI 组织说明</div><p>大纲按招标文件第六章格式要求排列：投标函、授权书与资格文件在前，技术、商务、价格章节按评分项顺序组织，附件置末；每章标注对应评分项与分值，便于评审专家对照。拖动或上下移动可调整顺序，合规检查将核对投标函须为第一章、附件须为最后一章。</p></div>
          {foot(true, '进入逐章起草')}
        </div>
      );
      case 5: return (
        <div className="card fade-in" style={{ overflow: 'visible' }}>
          <div className="card-h"><div className="card-t"><span className="dot" />⑤ 逐章起草</div><span className="card-s">{doneCh} / {chapters.length} 章已有内容 · {Object.values(finals).filter(Boolean).length} 章已定稿</span></div>
          <div className="bw-draft">
            <div className="bw-tree">
              {chapters.map((c, i) => { const st = statusOf(c.id); return <div key={c.id} className={`bw-tn${c.id === curCh ? ' on' : ''}`} onClick={() => selectChapter(c.id)}><span className="no">{i + 1}</span><span className="t">{c.title}</span><span className={`st ${st === '已定稿' ? 'f' : st === '草稿' ? 'd' : ''}`} title={st} /></div>; })}
            </div>
            <div className="bw-edwrap">
              <div className="bw-edhead">
                <b>第{cn(curIdx)}章 {cur.title}</b>
                {cur.score && <span className="chip" style={{ padding: '1px 8px', fontSize: 10.5 }}><i />评分项 {cur.score}</span>}
                <span className={`chip ${statusOf(cur.id) === '已定稿' ? 'green' : statusOf(cur.id) === '草稿' ? '' : 'red'}`} style={{ padding: '1px 8px', fontSize: 10.5 }}><i />{statusOf(cur.id)}</span>
                <span className="spacer" />
                <div className="bw-edtools">
                  <button title="加粗" onClick={() => exec('bold')}><Bold size={13} /></button>
                  <button title="斜体" onClick={() => exec('italic')}><Italic size={13} /></button>
                  <button title="小标题" onClick={() => exec('formatBlock', 'h5')}><Heading size={13} /></button>
                  <button title="列表" onClick={() => exec('insertUnorderedList')}><List size={13} /></button>
                </div>
                <button className={`btn sm ${finals[cur.id] ? 'ghost' : 'green'}`} onClick={() => { flushEditor(); setFinals((f) => ({ ...f, [cur.id]: !f[cur.id] })); flash(finals[cur.id] ? '已取消定稿标记' : `第 ${curIdx} 章已标记定稿`); }}><Flag size={12} />{finals[cur.id] ? '取消定稿' : '标记定稿'}</button>
              </div>
              <div key={curCh} ref={edRef} className="bw-editor" contentEditable suppressContentEditableWarning data-ph="本章尚未起草。可在右侧点击「AI 起草」生成初稿，或直接在此输入。" dangerouslySetInnerHTML={{ __html: drafts[curCh] ?? '' }} onBlur={flushEditor} />
              <div className="bw-edfoot"><FileText size={12} />约 {countText(drafts[curCh] ?? '')} 字 · 预计 {cur.pages} 页<span style={{ marginLeft: 'auto' }}>格式：正文仿宋小四 · 标题黑体三号 · 1.5 倍行距（导出时应用）</span></div>
            </div>
            <div className="bw-aipanel">
              <div className="bw-ctx"><b>本章上下文</b>
                {cur.score ? SCORES.filter((s) => cur.score!.includes(s.id)).map((s) => <div key={s.id} className="row"><span>{s.id} {s.name}</span><span>{scoreOf(s).toFixed(1)} / {s.max}</span></div>) : <div className="row"><span>类型</span><span>{cur.kind}章节</span></div>}
                {GAPS.filter((g) => g.chapter === cur.id).map((g) => <div key={g.id} className="row"><span>缺项</span><span style={{ color: gapsDone[g.id] ? 'var(--green-3)' : 'var(--red-3)' }}>{gapsDone[g.id] ? '已补充' : g.item.slice(0, 14) + '…'}</span></div>)}
                <div className="row"><span>素材</span><span>行内模板 · 往期投标书 · 案例库</span></div>
              </div>
              <div className="bw-aiact">
                <button disabled={!!aiBusy} onClick={() => runAi('draft')}><span className="ic"><Sparkles size={13} /></span>AI 起草</button>
                <button disabled={!!aiBusy} onClick={() => runAi('polish')}><span className="ic"><Feather size={13} /></span>改写更专业</button>
                <button disabled={!!aiBusy} onClick={() => runAi('case')}><span className="ic"><Quote size={13} /></span>补充案例</button>
                <button disabled={!!aiBusy} onClick={() => runAi('cred')}><span className="ic"><BadgeCheck size={13} /></span>插入我行资质</button>
              </div>
              {aiBusy && <div className="bw-ai-busy fade-in"><span className="pulse" />{AI_LABEL[aiBusy]}中：读取评分细则、行内模板与材料库……</div>}
              {sug && (
                <div className="bw-sug fade-in">
                  <div className="h"><Sparkles size={13} />{AI_LABEL[sug.kind]} · 建议内容</div>
                  <div className="bd" dangerouslySetInnerHTML={{ __html: sug.html }} />
                  <div className="ft"><button className="btn sm green" onClick={adopt}><Check size={12} />一键采用</button><button className="btn sm ghost" onClick={() => runAi(sug.kind)}><RefreshCw size={12} />再生成</button><button className="btn sm ghost" onClick={() => setSug(null)}><X size={12} />放弃</button></div>
                  <div className="bw-muted" style={{ marginTop: 6 }}>采用后段落带「AI 起草」标识，须人工复核；不含利率与收益承诺。</div>
                </div>
              )}
              {!aiBusy && !sug && <div className="bw-ai"><div className="h"><Target size={14} />起草提示</div><p>{cur.score ? `评审细则：${SCORES.find((s) => cur.score!.includes(s.id))?.req ?? ''}` : '本章为格式要求章节，请核对签字、盖章与日期。'}</p></div>}
            </div>
          </div>
          {foot(true, '进入同业对照与差异化策略')}
        </div>
      );
      case 6: return (
        <div className="card fade-in">
          <div className="card-h"><div className="card-t"><span className="dot" />⑥ 竞争对手对照与差异化策略</div><span className="chip green" style={{ padding: '2px 9px' }}><ShieldCheck size={11} />仅公开渠道信息 · 事实对照 · 不评价同业</span></div>
          <div className="bw-sec"><Search size={12} />同业公开信息对照表</div>
          <div className="bw-tw">
            <table className="bw-rv">
              <thead><tr><th>机构</th><th>类型</th><th>供应链平台对接方式</th><th>公开综合服务费率</th><th>本市网点</th><th>现金管理系统</th><th>近三年公开中标同类项目</th></tr></thead>
              <tbody>{RIVALS.map((r) => <tr key={r.name} className={r.me ? 'me' : ''}><td>{r.name}<span className="src">{r.src}</span></td><td>{r.type}</td><td>{r.platform}</td><td>{r.fee}</td><td>{r.outlets}</td><td>{r.cms}</td><td>{r.wins}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="bw-sec"><Scale size={12} />优劣势诊断 · 按评分权重加权<span className="r">权重 = 相关评分项分值</span></div>
          <div className="bw-diag">
            <div>{DIAG.adv.map((d) => <div key={d.t} className="bw-dg adv"><div className="w"><b>+{d.w}</b><span>权重</span></div><div className="b"><b>{d.t}</b><span>{d.s}</span></div></div>)}</div>
            <div>{DIAG.dis.map((d) => <div key={d.t} className="bw-dg dis"><div className="w"><b>−{d.w}</b><span>权重</span></div><div className="b"><b>{d.t}</b><span>{d.s}</span></div></div>)}</div>
          </div>
          <div className="bw-sec"><Layers size={12} />差异化策略清单<span className="r">采纳后自动写入对应章节 · 已采纳 {Object.values(adopted).filter(Boolean).length} / {STRATEGIES.length}</span></div>
          {STRATEGIES.map((s) => { const i = chapters.findIndex((c) => c.id === s.chapter) + 1; return (
            <div key={s.id} className={`bw-st${adopted[s.id] ? ' on' : ''}`}>
              <span className="cb" onClick={() => toggleStrategy(s)}>{adopted[s.id] && <Check size={13} />}</span>
              <div className="b"><b>{s.t}</b><p>{s.p}</p><div className="to"><span className="chip blue" style={{ padding: '0 7px', fontSize: 10.5 }}><i />写入第 {i || '—'} 章</span><span className="chip" style={{ padding: '0 7px', fontSize: 10.5 }}><i />评分项 {s.score}</span>{adopted[s.id] && <button className="lnk" onClick={() => locate(s.chapter)}>查看章节 →</button>}</div></div>
              <div className="g">预计<b>+{s.gain}</b></div>
            </div>
          ); })}
          <div className="bw-ai" style={{ marginTop: 6 }}><div className="h"><Sparkles size={14} />AI 说明</div><p>对照表数据来源于同业官网产品说明、公开价目与中标公告，仅作事实列示；优劣势按相关评分项分值加权，不对同业作主观评价。价格差距建议通过阶梯费率与服务内容说明缩小，不建议突破分行定价授权。</p></div>
          {foot(true, '进入合规与格式检查')}
        </div>
      );
      case 7: return (
        <div className="card fade-in">
          <div className="card-h"><div className="card-t"><span className="dot" />⑦ 合规与格式检查{checking && <span className="pulse" />}</div><div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><span className="card-s">废标项核对 · 格式要求核对 · 错漏字 · 术语一致性</span><button className="btn sm" onClick={runChecks} disabled={checking}><RefreshCw size={12} />{ran ? '重新检查' : '开始检查'}</button></div></div>
          {!ran ? (
            <div className="bw-chk-run">{checking ? <div><div className="ring"><ShieldCheck size={22} /></div>正在逐条核对 6 条投标无效情形、5 条格式要求与 {chapters.length} 章正文……</div> : <div><div className="ring"><ShieldCheck size={22} /></div>点击「开始检查」，系统将按招标文件废标条款与格式要求逐项核对，并检查错漏字与术语一致性。</div>}</div>
          ) : (
            <div className="fade-in">
              <div className="bw-chk-sum">
                <div className="tile red"><b className="num">{ckCount('致命')}</b><span>致命 · 触发投标无效</span></div>
                <div className="tile gold"><b className="num">{ckCount('重要')}</b><span>重要 · 影响评分或格式</span></div>
                <div className="tile"><b className="num">{ckCount('建议')}</b><span>建议 · 错漏字与术语</span></div>
                <div className="tile green"><b className="num">{ckCount('通过')}</b><span>通过 · 共 {checks.length} 项</span></div>
              </div>
              {(['废标项核对', '格式要求核对', '错漏字', '术语一致性'] as CkGroup[]).map((g) => (
                <div key={g}>
                  <div className="bw-sec">{g === '废标项核对' ? <AlertTriangle size={12} /> : g === '格式要求核对' ? <FileText size={12} /> : g === '错漏字' ? <PencilLine size={12} /> : <Scale size={12} />}{g}<span className="r">{checks.filter((c) => c.group === g && c.level !== '通过').length} 项待处理</span></div>
                  {checks.filter((c) => c.group === g).map((c) => (
                    <div key={c.id} className={`bw-ck ${LEVEL_CLS[c.level]}`} onClick={() => c.chapter && locate(c.chapter)}>
                      <span className="lv">{c.level}</span>
                      <div className="tx">{c.text}{c.sub && <small>{c.sub}</small>}</div>
                      <div className="ac" onClick={(e) => e.stopPropagation()}>
                        {c.chapter && <button className="btn sm ghost" onClick={() => locate(c.chapter!)}><MapPin size={12} />定位</button>}
                        {c.fix && c.level !== '通过' && <button className="btn sm green" onClick={() => applyFix(c)}><Check size={12} />一键修正</button>}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              <div className="bw-ai" style={{ marginTop: 6 }}><div className="h"><Sparkles size={14} />AI 说明</div><p>{ckCount('致命') ? `仍有 ${ckCount('致命')} 项致命问题：` + checks.filter((c) => c.level === '致命').map((c) => c.text).join('；') + '。处理完成前不建议定稿。' : '未发现触发投标无效的问题。'}检查结果随正文修改实时更新；点击条目可定位到章节。</p></div>
              {foot(true, '进入定稿导出', true)}
            </div>
          )}
        </div>
      );
      default: return (
        <>
          <AiConclusion tone={ckCount('致命') ? 'red' : 'green'} confidence={0.84}
            headline={ckCount('致命') ? `投标文件 ${verStr} 尚有 ${ckCount('致命')} 项致命问题与 ${gapsOpen.length} 项缺项，暂不具备定稿条件；预计得分 ${total.toFixed(1)} 分。` : `投标文件 ${verStr} 已通过废标项核对，预计得分 ${total.toFixed(1)} 分（补齐缺项后 ${potential.toFixed(1)} 分），建议定稿并转入投标审批流程。`}
            points={[`${chapters.length} 章约 ${totalPages} 页，${doneCh} 章已有内容、${Object.values(finals).filter(Boolean).length} 章已定稿`, `差异化策略已采纳 ${Object.values(adopted).filter(Boolean).length} / ${STRATEGIES.length} 项`, `缺项 ${gapsOpen.length} 项待补充，合计可补 ${gapsOpen.reduce((a, g) => a + g.gain, 0).toFixed(1)} 分`, `距投标截止 ${cd.d} 天 ${cd.h} 小时`]}
            evidence={['招标文件评分办法 P22–25', '废标条款 P12–13', '行内投标模板与案例库', '分行定价授权']}
            actions={['pricing', 'forward', 'oa']} onSystem={(_id, label) => flash(`${label}：已连同投标文件 ${verStr} 与 AI 参与记录推送`)} />
          <div className="bw-dockbar">
            <span className="lab"><FileText size={13} />投标文件 · {verStr} · {editing ? '编辑中' : ckCount('致命') ? '待处理' : '可定稿'}</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <DocActions title={`${PROJECT.name}_投标文件_${verStr}`} editing={editing} onEdit={() => setEditing((v) => !v)} getHtml={finalHtml} onToast={flash} compact />
              <button className="btn gold sm" onClick={finalize}><Flag size={12} />定稿</button>
            </div>
          </div>
          <div className="bw-final-grid">
            <div>
              <div className="bw-cover">
                <div className="org">{PROJECT.bidder}</div>
                <div className="pj">{PROJECT.name}</div>
                <div className="bid">投标文件</div>
                <div className="vol">正 本</div>
                <div className="rule" />
                <div className="kv">
                  <span><i>招标编号</i><b>{PROJECT.no}</b></span>
                  <span><i>采购人</i><b>{PROJECT.buyer}</b></span>
                  <span><i>投标人</i><b>{PROJECT.bidder}</b></span>
                  <span><i>投标日期</i><b>{ymd(addDays(12))}</b></span>
                </div>
                <div className="seal">投标专用章</div>
              </div>
              <div className="card" style={{ marginTop: 12 }}>
                <div className="card-h"><div className="card-t"><ListTree size={14} />目录</div><span className="card-s">共 {totalPages} 页</span></div>
                <div className="bw-toc">{chapters.map((c, i) => <div key={c.id} className="r" onClick={() => locate(c.id)}><span className="n">第{cn(i + 1)}章</span><span className="t">{c.title}</span><span className="dots" /><span className="p">{pageStart[i]}</span></div>)}</div>
              </div>
            </div>
            <div className="bw-final" data-editing={editing ? 'true' : 'false'}>
              {editing && <div className="bw-muted bw-noprint" style={{ marginBottom: 10 }}>编辑模式：点击任意章节直接修改，修改的章节标黄；失焦后自动保存到章节草稿。</div>}
              {chapters.map((c, i) => (
                <section key={c.id} contentEditable={editing || undefined} suppressContentEditableWarning
                  onInput={(e) => e.currentTarget.classList.add('bw-mod')}
                  onBlur={(e) => { const body = e.currentTarget.querySelector('.bw-body-html'); if (body) { const html = body.innerHTML; setDrafts((d) => (d[c.id] === html ? d : { ...d, [c.id]: html })); } }}>
                  <h4>第{cn(i + 1)}章 {c.title}</h4>
                  <div className="bw-body-html" dangerouslySetInnerHTML={{ __html: drafts[c.id] || '<p class="empty">（本章待起草，请在「逐章起草」中完成）</p>' }} />
                </section>
              ))}
            </div>
          </div>
          <div className="card bw-noprint">
            <div className="card-h"><div className="card-t"><History size={14} />版本记录</div><span className="card-s">当前 {verStr} · 保存版本后自动递增</span></div>
            <div className="bw-verlog">{verLog.slice(0, 6).map((v, i) => <div key={i} className="r"><span className="v">{v.v}</span><span className="w">{v.who}</span><span className="t">{v.what}</span><span className="tm">{v.t}</span></div>)}</div>
            {foot(true, '', false)}
          </div>
        </>
      );
    }
  };

  return (
    <div className="bw">
      <div className="bw-crumb"><Link to="/p/P05">方案设计与智能定价</Link><span>›</span><b>投标书生成与优化</b></div>
      <div className="bw-top">
        <div>
          <h1><FileSignature size={22} color="var(--red)" />投标书生成与优化</h1>
          <p>从招标文件到定稿投标书的全流程工作台：解析招标要求、生成评分项响应矩阵与大纲、逐章起草、同业公开信息对照与差异化策略、合规与格式检查、定稿导出。竞争对手信息仅来源公开渠道且仅做事实对照；投标承诺不得超出行内授权与产品准入。</p>
        </div>
        <div className="acts">
          <button className="btn ghost" onClick={() => { flushEditor(); const v = saveVersion('手动保存'); flash(`已保存版本 ${v}`); }}><Save size={14} />保存版本</button>
          <button className="btn gold" onClick={() => goto(Math.min(unlocked, 8))}><ChevronRight size={14} />继续第 {Math.min(unlocked, 8)} 步</button>
        </div>
      </div>

      <div className="bw-verbar">
        <div className="it"><span className="k">项目</span><b>{PROJECT.name}</b><span className="chip" style={{ padding: '1px 8px', fontSize: 10.5 }}><i />{PROJECT.no}</span></div>
        <span className="sep" />
        <div className="it"><span className="k">版本</span><span className="bw-ver"><History size={12} />{verStr}</span><span className="bw-muted">{verLog[0]?.t} · {verLog[0]?.who}</span></div>
        <span className="sep" />
        <div className="it"><span className="k">参与人</span><span className="bw-people">{TEAM.map((t) => <span key={t.name} className={`av ${t.cls}`} title={`${t.name} · ${t.role}`}>{t.name[0]}</span>)}</span><span className="bw-people-names">{TEAM.map((t) => `${t.name}（${t.role.split(' · ')[0]}）`).join(' · ')}</span></div>
        <span className="spacer" />
        <div className="it"><span className="k">投标截止</span><span className="bw-muted">{ymd(DEADLINE)} 10:00</span><span className={`bw-count${cd.d < 3 ? ' warn' : ''}`}><Clock size={13} />{left > 0 ? <>{cd.d} <small>天</small> {pad2(cd.h)}:{pad2(cd.m)}:{pad2(cd.s)}</> : '已截止'}</span></div>
      </div>

      <div className="bw-steps">
        {STEPS.map((s) => <div key={s.n} className={`bw-step${step === s.n ? ' active' : s.n < step || (s.n <= unlocked && s.n !== step) ? ' done' : ''}${s.n > unlocked ? ' locked' : ''}`} onClick={() => goto(s.n)}><span className="n">{s.n < step ? <Check size={12} /> : s.n}</span><div style={{ minWidth: 0 }}><div className="t">{s.t}</div><div className="s">{s.s}</div></div></div>)}
      </div>

      <div className="bw-body">
        <div className="bw-main">{renderStep()}</div>
        <div className="bw-aside">
          <div className="bw-score">
            <div className="k">预计得分 · 综合评分法</div>
            <div className="v">{total.toFixed(1)}<small> / 100</small></div>
            <div className="bar"><i style={{ width: `${total}%` }} /></div>
            <div className="row"><span>补齐缺项 + 采纳策略后</span><b>{potential.toFixed(1)}</b></div>
            <div className="row"><span>技术 / 商务 / 价格</span><b>{partScore('技术').toFixed(1)} / {partScore('商务').toFixed(1)} / {partScore('价格').toFixed(1)}</b></div>
            <div className="row"><span>同类项目历史中标线</span><b>约 85–88</b></div>
          </div>
          <div className="card">
            <div className="card-h"><div className="card-t"><AlertTriangle size={14} color="var(--red)" />缺项提醒</div><span className={`chip ${gapsOpen.length ? 'red' : 'green'}`} style={{ padding: '1px 8px' }}><i />{gapsOpen.length ? `${gapsOpen.length} 项待补` : '已补齐'}</span></div>
            {GAPS.map((g) => (
              <div key={g.id} className={`bw-gap${gapsDone[g.id] ? ' done' : ''}`}>
                <span className="ic">{gapsDone[g.id] ? <Check size={13} /> : <AlertTriangle size={13} />}</span>
                <div className="b">
                  <b>{g.item}</b>
                  <span>{g.why}</span>
                  <span>责任：{g.owner} · 截止 {g.due}</span>
                  <div className="acts">
                    <button className="btn sm ghost" onClick={() => locate(g.chapter)}><MapPin size={11} />去补充</button>
                    <button className={`btn sm ${gapsDone[g.id] ? 'ghost' : 'green'}`} onClick={() => markGap(g)}><Check size={11} />{gapsDone[g.id] ? '撤销' : '已补充'}</button>
                  </div>
                </div>
                <span className="gain">{g.score} +{g.gain}</span>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="card-h"><div className="card-t"><Users size={14} />协作</div><span className="card-s">{TEAM.length} 人</span></div>
            {TEAM.map((t) => <div key={t.name} className="li" style={{ padding: '7px 10px', marginBottom: 6 }}><span className={`bw-people`}><span className={`av ${t.cls}`}>{t.name[0]}</span></span><div style={{ flex: 1, minWidth: 0 }}><div className="t" style={{ fontSize: 12.5 }}>{t.name}</div><div className="s">{t.role}</div></div></div>)}
          </div>
        </div>
      </div>

      {toast && <div className="bw-toast fade-in"><Check size={14} />{toast}</div>}
    </div>
  );
}

/* 响应矩阵分部行 */
function PartRows({ part, rows, shown, all, scoreOf, gapsDone, onLocate, chapters }: { part: { p: Part; max: number; cls: string }; rows: ScoreItem[]; shown: number; all: ScoreItem[]; scoreOf: (s: ScoreItem) => number; gapsDone: Record<string, boolean>; onLocate: (chId: string) => void; chapters: Chapter[] }) {
  const sum = rows.reduce((a, s) => a + scoreOf(s), 0);
  return (
    <>
      <tr className="part"><td colSpan={4}>{part.p}部分 · {part.max} 分</td><td>{sum.toFixed(1)} / {part.max}</td></tr>
      {rows.map((s) => {
        const gi = all.findIndex((x) => x.id === s.id);
        if (gi >= shown) return null;
        const gaps = GAPS.filter((g) => g.score === s.id && !gapsDone[g.id]);
        const ch = chapters.find((c) => c.score?.includes(s.id));
        const sc = scoreOf(s);
        return (
          <tr key={s.id} className={`fade-in${gaps.length ? ' miss' : ''}`}>
            <td><div className="nm">{s.id} {s.name}</div><div className="mx">{s.max} 分{ch && <> · <button className="lnk" style={{ fontSize: 11, padding: 0 }} onClick={() => onLocate(ch.id)}>第 {chapters.indexOf(ch) + 1} 章</button></>}</div></td>
            <td>{s.req}</td>
            <td>{s.resp}</td>
            <td><div className="sup">{s.support.map((x) => <span key={x}>{x}</span>)}{gaps.map((g) => <span key={g.id} className="no">缺：{g.item.length > 16 ? g.item.slice(0, 16) + '…' : g.item}</span>)}</div></td>
            <td><div className="sc">{sc.toFixed(1)}<small> / {s.max}</small></div><div className="scbar"><i style={{ width: `${(sc / s.max) * 100}%` }} /></div>{gaps.length > 0 && <div className="mx" style={{ color: 'var(--red-3)' }}>补齐后 +{gaps.reduce((a, g) => a + g.gain, 0)}</div>}</td>
          </tr>
        );
      })}
    </>
  );
}
