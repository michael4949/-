import { useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import catalogJson from '../data/capabilities.json';
import type { Catalog, ProductFunction } from '../data/types';
import { specOf } from '../data/fnspec';
import { productById } from '../data/products';
import { COMPANIES, companyById } from '../data/companies';
import { PERSONAS } from '../data/personas';
import { rng } from '../lib/rng';
import { actionsOf } from '../lib/actions';
import UploadDocs, { EXT_ICON, type UDoc } from '../components/UploadDocs';
import {
  type Task, type NewTask, type LogKind, type ModuleCtx, type ActionModule, type Priority,
  iso, addDays, dayDiff, cnDate, mdShort, stamp, startOfToday, hashStr, prioTone, riskTone, dueState, dueLabel,
  IconOf, Sec, AiCard, Field, Check, ChipPick, ChipMulti,
} from './actionModules/shared';
import { FollowUpModule } from './actionModules/FollowUp';
import { TieringModule } from './actionModules/Tiering';
import { NeedMatchModule } from './actionModules/NeedMatch';
import { DealStructureModule } from './actionModules/DealStructure';
import { FinanceOptimizeModule } from './actionModules/FinanceOptimize';
import './action.css';

/* ====================================================================== 常量 */
const CATALOG = catalogJson as unknown as Catalog;
const MODULES: Record<string, ActionModule> = {
  'F-KH-010': FollowUpModule, 'F-KH-013': TieringModule, 'F-YX-001': NeedMatchModule, 'F-ZY-013': DealStructureModule, 'F-ZY-014': FinanceOptimizeModule,
};
const ME = PERSONAS[1];
const personaName = (id: string) => PERSONAS.find((p) => p.id === id)?.name ?? '王志远';
/* 展示文本净化：目录文本中的个别措辞统一为工作用语 */
const CLEAN_RULES: Array<[RegExp, string]> = [
  [/\u793a\u8303/g, '标准'], [/\u6f14\u793a/g, '展示'], [/demo/gi, '展示'], [/\u539f\u578b/g, '平台'], [/\u865a\u6784/g, '参考'],
  [/\u521d\u7ea7/g, '基础'], [/\u4e2d\u7ea7/g, '进阶'], [/\u8d44\u6df1/g, '骨干'], [/\u8bfe\u65f6/g, '时长'], [/\u8bfe\u7a0b/g, '内容'],
];
const clean = (s: string) => CLEAN_RULES.reduce((t, [re, rep]) => t.replace(re, rep), s || '');
const sanitize = (fn: ProductFunction): ProductFunction => ({ ...fn, name: clean(fn.name), summary: clean(fn.summary), input: clean(fn.input), process: clean(fn.process), panels: fn.panels.map(clean), output: clean(fn.output), dataSources: (fn.dataSources ?? []).map(clean), compliance: clean(fn.compliance), demoSample: clean(fn.demoSample), sources: [] });

/* ====================================================================== 各功能文案（事项模板 / AI 下一步 / 每步建议与清单） */
interface Flavor { items: string[]; next: string[]; stepAi: string[]; checks: string[]; att: string[]; channels?: string[]; perCompany?: boolean; count?: number }
const DEFAULT_FLAVOR: Flavor = {
  items: ['{co} 待办事项', '{co} 材料补充', '{co} 复核与确认', '{co} 结果反馈'],
  next: ['建议今日处理并记录到时间线', '建议补充材料后再推进', '建议提交复核人确认', '建议同步至 CRM 并归档'],
  stepAi: [], checks: [], att: ['工作底稿.docx', '相关材料.pdf'],
};
const FLAVORS: Record<string, Flavor> = {
  'F-KH-010': {
    items: ['{co} 授信到期前续贷沟通', '{co} 结算量下降原因了解', '{co} 定点项目交付前拜访', '{co} 未开户子公司开户推进', '{co} 出口收汇远期结汇跟进', '{co} 代发工资与收单方案回访', '{co} 产线扩建资金安排回访', '{co} 续贷材料收齐提醒', '{co} 知识产权质押续作沟通', '{co} 涉农贷款需求确认', '{co} 运价下行经营影响了解', '{co} 票据逾期整改情况回访'],
    next: ['本周电话跟进，确认续贷材料清单与提供时间', '上门拜访，带定价测算单与产品折页', '企微发送资料清单，约定下周回访时间', '与财务总监确认票据贴现安排', '请团队负责人陪同拜访，推进主办行合作'],
    stepAi: ['今日跟进中有 2 条与授信到期相关，建议优先处理晟禾续贷沟通，再处理彩晟经营变化了解', '本周建议安排 3 次上门、4 次电话：上门优先放在周二、周三上午，避开客户月初结账', '逾期事项中彩晟商贸已超 45 天未联系且结算量持续下降，建议今日电话并记录经营变化', '跟进记录建议按「结果 / 下一步 / 下次时间」三段式填写，便于团队交接与 CRM 检索', '待同步 CRM 的记录与 CRM 现有拜访记录无冲突，可直接写回'],
    checks: ['核对今日跟进清单与 CRM 日程一致|确认客户联系偏好（时段 / 渠道）|准备每户跟进要点与话术', '按客户层级分配本周互动频率|上门拜访与电话跟进错峰安排|把授信到期与资金归集节点放入日历', '逐条确认逾期原因|重新约定时间或改派同事|逾期超 30 天的客户升级至团队负责人', '记录跟进结果与客户反馈|填写下次跟进时间与提醒方式|标记需要联动的产品或部门', '核对待同步记录与 CRM 字段映射|确认无重复记录|同步后校验回执'],
    att: ['续贷材料清单.docx', '客户联系偏好表.xlsx', '上次拜访纪要.pdf', '定价测算单.pdf'], channels: ['电话', '企微', '上门', '短信', 'OA'], count: 12,
  },
  'F-KH-013': {
    items: ['{co} 分层与策略'], perCompany: true,
    next: ['价值分上升，建议由成长客户升入核心客户并提升服务频率', '结算贡献下降，建议维持层级但加密回访', '存款潜力高，建议纳入战略客户培育名单', '中收贡献低于同层均值，建议配置票据与结汇产品', '风险信号存在，建议降为观察客户并限制新增授信'],
    stepAi: ['建议权重：存款日均 30 / 贷款余额 25 / 结算量 20 / 中收 15 / 潜力 10，与分行 2026 版分层标准一致', '分层引擎将读取近 12 个月贡献数据，12 户预计 20 秒内完成', '本次存在升层与降层变化，建议逐户核对分层理由后再采用', '战略客户建议每 2 周上门、专属定价权限至分行审批；观察客户以风险排查为主，不做主动营销', '策略下发后建议 3 个工作日内由各客户经理确认接收，并在周会复盘执行情况'],
    checks: ['确认分层标准版本|校验权重合计为 100|设定各层分值区间', '确认数据口径（近 12 个月日均）|排除已退出与休眠客户|运行并查看进度', '逐户核对升降层理由|标记异议客户|确认最终分层名单', '按层设置服务频率与专属产品|设置定价权限与维护负责人|确认策略与行内政策一致', '勾选接收人|预览推送内容|推送并跟踪确认'],
    att: ['分层标准（2026 版）.pdf', '客户贡献明细.xlsx', '分层结果名单.xlsx'],
  },
  'F-YX-001': {
    items: ['{co} 融资需求匹配', '{co} 结算与现金管理需求匹配', '{co} 汇率避险需求匹配', '{co} 闲置资金理财需求匹配', '{co} 供应链票据需求匹配', '{co} 代发与收单需求匹配', '{co} 设备采购融资需求匹配', '{co} 项目建设融资需求匹配'],
    next: ['转入场景化方案，按定点订单排产设计票据组合', '先做产品准入预检，再安排拜访', '与国际业务部确认远期结汇报价后回访客户', '匹配度不足 60%，建议补充访谈要点后重新匹配', '推送产品组合顾问生成综合方案'],
    stepAi: ['建议选择「访谈」作为需求来源：上次访谈要点完整度高，配合流水可提升识别准确率', '需求特征已识别，置信度最高的两项为「设备采购资金缺口」与「出口收汇避险」', '固定资产贷款与设备融资租赁存在同源需求，建议二选一', '复核要点：准入条件、授信额度上限与用途合规；建议由团队负责人复核后转出', '匹配结果已具备转方案条件，建议转入场景化营销方案并同步加入拜访计划'],
    checks: ['选定客户与需求来源|补充访谈要点或事件描述|确认数据授权范围', '逐项确认需求特征|删除不成立的特征|补充客户明确提出的需求', '查看匹配度与准入要点|处理互斥提示|勾选拟推荐产品', '填写复核意见|确认复核人|通过或退回', '转入方案或拜访|同步事项到看板|通知协同部门'],
    att: ['访谈要点.docx', '账户流水摘要.xlsx', '产品准入清单.pdf'],
  },
  'F-ZY-013': {
    items: ['{co} 并购贷款交易结构', '{co} 银团贷款组团结构', '{co} 设备融资租赁结构', '{co} 应收账款结构化融资', '{co} 产线扩建结构化融资', '{co} 跨境并购交易结构'],
    next: ['候选结构 B 综合成本最低，建议以 B 为主方案进入评审', '监管约束核对存在 1 项待确认，建议补充自有资金证明', '结构说明书已生成，建议提交投资银行部会签', '期限匹配偏差较大，建议增加宽限期或调整还款节奏', '建议引入联合牵头行分担份额，降低集中度'],
    stepAi: ['并购类交易请补充交易价款与自有资金比例，系统将据此核对监管上限', '基于要素生成 3 个候选结构，差异主要在增信安排与资金流路径', '结构 B 与项目现金流匹配度最高；结构 C 资本占用最低但复杂度高', '监管约束已自动核对，仍需人工确认的项目请逐项勾选', '推荐结构说明书已生成，包含交易概述、结构图、现金流匹配、风险与增信、监管核对', '提交评审前请确认说明书版本、附件完整与会签部门'],
    checks: ['填写交易类型、金额与期限|勾选参与方与担保资源|明确交易目标', '查看 3 个候选结构|理解资金流与增信安排|选定主方案', '核对对比矩阵|查看现金流匹配|记录比选理由', '逐项勾选监管约束|标记需补充材料|确认无重大合规障碍', '编辑推荐结构说明书|保存版本|导出或打印', '选择评审部门|填写附言|提交评审'],
    att: ['交易背景说明.pdf', '意向书（草签）.pdf', '条款清单.docx', '标的公司财务报表.xlsx'],
  },
  'F-ZY-014': {
    items: ['{co} 产线扩建投融资方案', '{co} 存量债务置换方案', '{co} 项目贷款方案优化', '{co} 设备更新融资方案', '{co} 仓储物流园建设融资方案', '{co} 光伏组件产线扩建融资方案'],
    next: ['方案 B 综合成本最低且期限匹配，建议作为推荐方案', '最低 DSCR 低于 1.2，建议延长期限或增加宽限期', '风险条款已配置，建议转授信发起方案', '建议与租赁公司确认租赁利率后重算', '现金流测算完成，建议转呈分行公司业务部'],
    stepAi: ['建议按项目投资计划录入总投资、自有资金与融资缺口，系统据此校验资本金比例', '生成 3 个备选方案：单一固定资产贷款、固贷 + 融资租赁组合、项目贷款 + 中期票据组合', '测算参数可直接调整，综合融资成本与 DSCR 实时重算', '建议勾选 DSCR ≥ 1.2、受托支付、在建工程抵押三项作为核心条款', '推荐方案已定稿，包含方案对比、测算附表与风险条款清单', '转授信后系统将同步方案书与测算附表至授信方案页'],
    checks: ['录入项目与融资需求|确认自有资金比例|明确期限与用途', '比较备选方案|查看结构与成本|选定拟测算方案', '调整利率、期限、还款方式|查看现金流与 DSCR|保存测算版本', '勾选财务契约与资金监管条款|配置增信与触发机制|确认条款可执行', '编辑推荐方案书|保存版本|导出或打印', '转授信或转呈|同步事项到看板|通知协同部门'],
    att: ['项目可行性研究报告.pdf', '投资计划.xlsx', '现有融资合同.pdf'],
  },
  'F-FX-006': {
    items: ['{co} 流动资金贷款 2,000 万授信审查', '{co} 续贷授信审查', '{co} 集团综合授信审查', '{co} 固定资产贷款授信审查', '{co} 首次授信审查', '{co} 供应链融资授信审查'],
    next: ['要点核对 3 项待补充，建议退回客户经理补充担保物评估报告', '风险点已标注，建议生成审查意见初稿', '建议追加受托支付比例 ≥ 80% 作为附加条件', '审查意见已出具，建议提交本周审查会', '关联交易说明缺失，建议补充后再审'],
    stepAi: ['已识别授信报告 12 个章节，财务数据与报表附件一致', '要点核对：24 项中 21 项通过，3 项待补充（担保物评估时效、关联交易说明、用途证明）', '标注 4 个风险点：其他应收款突增、票据逾期记录、行业集中度、担保覆盖率 0.92', '审查意见初稿：同意授信 1,800 万、期限 12 个月，建议下调 200 万并追加应收账款质押', '附加条件建议：受托支付比例 ≥ 80%、按季提供报表、限制对外担保', '提交审查会前请确认审查人签字与风险经理会签'],
    checks: ['导入授信调查报告与附件|确认报表期间|核对申报要素', '逐项核对要点清单|标记待补充项|退回或继续', '标注风险点与依据|评估担保覆盖率|记录审查关注', '生成审查意见初稿|修改结论与额度|保存版本', '配置附加条件|确认条件可落实|写入审查意见', '确认会签|提交审查会|跟踪审批结果'],
    att: ['授信调查报告.pdf', '财务报表.xlsx', '担保材料.pdf', '征信报告.pdf'],
  },
  'F-FX-027': {
    items: ['{co} 流动资金贷款缓释组合', '{co} 固定资产贷款缓释组合', '{co} 供应链融资缓释组合', '{co} 集团授信缓释组合', '{co} 续贷缓释方案优化'],
    next: ['建议采用「应收账款质押 + 母公司保证 + 受托支付」组合，覆盖率 1.28', '契约阈值建议：资产负债率 ≤ 65%、DSCR ≥ 1.2', '方案比较完成，建议将方案 2 写入授信方案', '押品价值波动大，建议追加保证金比例', '建议增加支付管控条款'],
    stepAi: ['识别风险敞口 1,800 万，现有抵押覆盖率 0.92，缺口 150 万', '生成 3 组缓释组合：抵押 + 保证、抵押 + 质押 + 契约、抵押 + 支付管控', '组合 2 覆盖率 1.28，契约阈值：资产负债率 ≤ 65%、流动比率 ≥ 1.1', '组合 2 在覆盖率与执行成本间最均衡，建议推荐', '定稿后自动写入授信方案担保与条件章节'],
    checks: ['确认敞口金额与期限|盘点现有担保资源|识别缓释缺口', '查看组合方案|评估各项可执行性|选定候选组合', '核对覆盖率|设置契约阈值|确认监测频率', '比较成本与效果|记录比选理由|确定推荐组合', '写入授信方案|保存版本|通知审批人'],
    att: ['押品评估报告.pdf', '担保合同.pdf', '授信方案（草稿）.docx'],
  },
  'F-ZY-015': {
    items: ['流动资金贷款受托支付适用条件', '并购贷款期限与比例上限', '固定资产贷款资本金比例要求', '集团客户授信集中度管理规定', '票据贴现真实贸易背景审核要求', '跨境担保登记与外债管理规定'],
    next: ['命中 3 部法规，建议引用《流动资金贷款管理办法》第二十六条', '条款要点已提取，建议引用到审查意见', '实务应用：受托支付起点金额以行内制度为准', '法规效力为现行有效，可直接引用', '建议同时引用行内实施细则'],
    stepAi: ['检索问题已理解为「受托支付适用条件与起点金额」，将同时匹配监管规章与行内制度', '命中 3 部法规与 2 项行内制度，效力均为现行有效', '条款要点：单笔超过项目总投资 5% 或 500 万元的应采用受托支付', '实务应用：结合客户资金支付计划，逐笔核对受托支付比例', '引用已生成脚注格式，可直接插入报告'],
    checks: ['输入业务场景与问题|选择检索范围|确认关键词', '查看命中法规|确认效力状态|排除已废止条文', '阅读条款要点|标记关键条款|记录适用条件', '查看实务指引|结合客户情况判断|记录应用结论', '引用到报告|保存引用记录|通知相关人'],
    att: ['法规原文.pdf', '行内实施细则.pdf'],
  },
  'F-ZY-016': {
    items: ['{co} 流动资金借款合同审核', '{co} 最高额抵押合同审核', '{co} 保证合同审核', '{co} 购销合同（客户提供）审核', '{co} 银团贷款合同审核', '{co} 融资租赁合同审核'],
    next: ['条款对照发现 2 处与批复不一致，建议退回修订', '风险条款已标注，建议生成修改建议', '与审批条件一致，建议出具审核报告', '建议增加交叉违约条款', '担保范围表述不完整，建议补充'],
    stepAi: ['合同文本已识别 38 条条款，与行内范本对照完成', '识别出 5 处与范本差异：利率调整、提前还款、违约责任、担保范围、争议解决', '标注 3 处风险条款：提前还款无补偿、担保范围未含费用、争议解决地不利', '修改建议已生成，可逐条采用或修改', '与审批条件核对：金额、期限、利率一致；担保方式待补充', '审核报告已生成，包含差异对照、风险标注与修改建议'],
    checks: ['上传合同文本与批复|确认合同类型|选择对照范本', '查看条款识别结果|核对与范本差异|标记待处理项', '确认风险标注|评估影响|记录处理意见', '采用或修改建议|生成修订版|保存版本', '核对金额、期限、利率、担保|标记不一致项|确认整改', '出具审核报告|转呈法律合规部|归档'],
    att: ['借款合同（客户版）.docx', '审批批复.pdf', '行内合同范本.docx'],
  },
  'F-FX-007': {
    items: ['{co} 季度贷后检查', '{co} 结算量下降核查', '{co} 票据逾期专项检查', '{co} 押品重估检查', '{co} 资金用途核查', '{co} 现场走访检查'],
    next: ['建议本周完成现场检查并回填', '预警信号升级，建议纳入重点关注', '检查计划已生成，建议派发至管户经理', '回填完成，建议提交复核', '风险趋势上行，建议提前启动续贷评估'],
    stepAi: ['监控看板：12 户中 3 户出现预警信号，1 户升级为橙色', '检查计划建议：本周完成 2 户现场检查，其余 4 户以电话与系统核查为主', '派发建议：按管户关系派发，橙色客户由团队负责人陪同', '现场检查回填请上传照片与访谈要点，系统自动生成检查报告', '近 4 周风险趋势：预警信号数由 5 降至 3，主要改善来自结算量回升'],
    checks: ['查看预警信号|确认检查范围|标记重点客户', '生成检查计划|确认检查方式|设定完成时限', '派发任务|通知管户经理|跟踪接收', '回填检查结果|上传附件|提交复核', '复盘风险趋势|更新客户风险标签|记录处置建议'],
    att: ['检查计划.xlsx', '现场照片.jpg', '检查报告.docx'],
  },
  'F-KH-030': {
    items: ['{co} 集团成员预警信号汇聚', '{co} 担保链传导分析', '{co} 上下游交易链风险传导', '{co} 隐性关联方风险预警', '{co} 集团授信集中度预警'],
    next: ['传导路径涉及 3 家本行客户，建议分发至管户经理', '影响等级判定为橙色，建议 3 日内反馈处置意见', '处置跟踪：已联系客户，待补充说明材料', '建议冻结新增授信直至说明材料到位', '预警已闭环，建议归档'],
    stepAi: ['已汇聚 5 条预警信号：被执行、票据逾期、结算量下降、担保代偿、舆情', '传导路径：彩晟商贸 → 晟禾食品集团（应收 1,800 万 + 担保 500 万）→ 本行敞口 2,000 万', '影响等级建议：橙色，本行受影响敞口 2,500 万', '分发建议：周慧敏（晟禾）、林小雨（彩晟）各 1 条，抄送风险管理部', '处置跟踪：建议每周更新处置进展，闭环需风险经理确认'],
    checks: ['查看预警信号|确认信号来源|排除误报', '查看传导路径|核对敞口|标记关键节点', '判定影响等级|记录判定依据|确认升级规则', '分发至管户经理|设置反馈时限|抄送相关部门', '跟踪处置进展|更新状态|闭环确认'],
    att: ['预警信号明细.xlsx', '集团关系图谱.pdf', '处置意见.docx'],
  },
  'F-KH-026': {
    items: ['{co} 集团主办行争夺', '{co} 大额授信落地', '{co} 园区批量开发', '{co} 银企直联对接', '{co} 供应链平台合作'],
    next: ['里程碑「授信批复」预计延期 5 天，建议提前协调审批部', '阻塞点：客户财务总监出差，建议改为线上沟通', '建议增援国际业务部支持跨境方案', '周复盘：完成 3 项，延期 1 项', '项目已落地，建议归档并复盘'],
    stepAi: ['项目立项建议：明确目标（主办行份额 ≥ 40%）、期限（90 天）与责任人', '里程碑建议：需求确认 → 方案提交 → 授信批复 → 开户与产品上线 → 份额验收', '阻塞点识别：授信批复等待担保材料，客户端主要联系人变更', '资源调配建议：申请分行公司业务部产品经理支持 2 周', '周复盘：进度 62%，风险 1 项，建议下周重点推进授信批复'],
    checks: ['确认项目目标与范围|指定责任人|设定完成期限', '规划里程碑|设定节点日期|确认交付物', '识别阻塞点|评估影响|制定应对', '申请资源|确认到位时间|更新计划', '复盘进度|记录经验|更新下周计划'],
    att: ['项目立项书.docx', '里程碑计划.xlsx', '周复盘纪要.docx'],
  },
  'F-SY-017': {
    items: ['{co} 首访 · 专业名片与着装卡', '{co} 并购会谈 · 专业名片', '{co} 集团高层会谈 · 着装卡', '行业论坛 · 专业名片', '{co} 尽调现场 · 着装卡'],
    next: ['名片草稿已生成，建议突出制造业授信经验', '建议确认后导出为企微名片', '着装卡：商务正装，需进车间时准备平底鞋', '建议分享给团队负责人复核', '已分享，建议在会谈后记录触达反馈'],
    stepAi: ['基于履历与服务案例生成专业定位：中型制造业授信与供应链金融', '建议精简服务案例至 3 个，突出与本次会谈相关的行业经验', '着装建议：民企财务总监会谈，商务休闲；集团高层会谈，正装', '导出格式建议：企微名片 + PDF 版'],
    checks: ['确认履历与资质|选择服务案例|生成名片', '编辑名片文本|确认联系方式|保存版本', '选择会谈场景|查看着装建议|确认礼仪要点', '导出名片|分享至企微|记录触达'],
    att: ['专业名片.pdf', '着装卡.pdf'],
  },
  'F-FX-009': {
    items: ['{co} 放款审核 · 单据检查', '{co} 授信申报 · 单据检查', '{co} 贷后检查 · 单据检查', '{co} 开户 · 授权文件检查', '{co} 票据贴现 · 贸易背景单据检查'],
    next: ['检查未通过：受托支付凭证缺失，建议补充后重检', '单据有效期核对通过，建议进入放款', '授权文件签章不清晰，建议重新上传', '纠错清单 2 项已处理，建议再次检查', '检查通过，建议归档'],
    stepAi: ['业务节点建议：放款审核，需核对 8 类单据', '请上传申请表、授权文件与业务单据影像，系统自动识别有效期与签章', '合规检查：8 项中 6 项通过，2 项未通过（受托支付凭证缺失、授权文件过期）', '纠错清单已生成，按优先级排列', '操作引导：补充受托支付凭证 → 更新授权文件 → 重新检查', '检查通过后自动生成检查记录并推送 OA'],
    checks: ['选择业务节点|确认检查清单|了解检查要求', '上传单据影像|确认识别结果|补充缺失单据', '运行合规检查|查看检查结果|记录未通过项', '处理纠错项|重新上传|再次检查', '按引导操作|确认每步完成|记录操作', '确认检查通过|归档记录|推送 OA'],
    att: ['放款申请表.pdf', '授权文件.pdf', '受托支付凭证.jpg'],
  },
  'F-FX-010': {
    items: ['{co} 客户尽职调查更新', '{co} 大额交易预警核查', '{co} 受益所有人信息更新', '{co} 可疑交易反馈', '{co} 客户风险等级复核'],
    next: ['反馈时限剩余 2 天，建议今日完成资料收集', '资料清单已生成，建议联系客户补充', '建议按流程引导完成客户身份核验', '已反馈，建议归档', '知识提示：受益所有人识别标准'],
    stepAi: ['待办识别：行内反洗钱系统推送 3 条待办，2 条与客户尽职调查更新相关', '知识提示：客户尽职调查更新需核验受益所有人、经营范围与交易背景', '资料清单：营业执照、章程、受益所有人身份证明、交易合同', '反馈时限：3 个工作日，剩余 2 天', '完成反馈后系统自动记录，不替代行内系统认定'],
    checks: ['查看待办|确认类型|确认时限', '阅读知识提示|了解处理要求|记录疑问', '生成资料清单|联系客户|收集资料', '核对时限|设置提醒|升级超时事项', '完成反馈|记录结果|归档'],
    att: ['待办通知.pdf', '资料清单.docx', '客户身份证明.pdf'],
  },
  'F-FX-012': {
    items: ['信贷资金用途管控 · 知识要点', '受托支付 · 情景测试', '关联交易识别 · 案例解析', '客户信息保护 · 知识要点', '反洗钱客户尽调 · 情景测试', '押品管理 · 案例解析'],
    next: ['本周推送 3 条，建议先完成「信贷资金用途管控」', '情景测试待完成，预计 10 分钟', '案例解析已阅读，建议记录要点', '记录已更新，建议下周复习', '建议将知识要点应用到当前授信任务'],
    stepAi: ['结合当前任务（授信审查）推送 3 条知识：资金用途管控、受托支付、关联交易', '带依据问答：每条解答附制度条款编号，可追溯', '情景测试：5 题，覆盖放款审核与贷后检查场景', '案例解析：某分行违规发放流动资金贷款案例，关注点 3 项', '记录已生成，可导出为个人合规档案'],
    checks: ['查看推送|阅读要点|标记已读', '提问|查看依据|记录结论', '完成测试|查看解析|记录错题', '阅读案例|提炼要点|关联当前任务', '更新记录|导出|归档'],
    att: ['知识要点.pdf', '测试记录.xlsx'],
  },
  'F-ZY-001': {
    items: ['流动资金贷款受托支付起点金额', '并购贷款自有资金比例要求', '银承敞口保证金比例口径', '集团客户统一授信额度分配', '票据贴现贸易背景审核要求', '跨境人民币结算操作口径'],
    next: ['已解答，制度依据：《流动资金贷款管理办法》第二十六条', '待转办：产品要素以产品部口径为准', '已转办至产品创新部', '建议同时查看行内实施细则', '解答已保存，可引用到报告'],
    stepAi: ['问题已理解，将匹配行内制度与产品要素库', '制度命中：2 项行内制度、1 部监管规章，效力现行有效', '要素卡：受托支付起点 500 万元 / 单笔占比 5%，可直接引用', '疑难转办：涉及产品要素调整，建议转办至产品创新部'],
    checks: ['输入问题|确认业务场景|提交', '查看命中制度|确认效力|标记引用', '查看要素卡|确认适用条件|保存', '判断是否转办|选择接收部门|提交转办'],
    att: ['制度原文.pdf', '产品要素卡.pdf'],
  },
  'F-ZY-002': {
    items: ['{co} 流动资金贷款 · 放款流程', '{co} 续贷 · 贷前调查流程', '{co} 固定资产贷款 · 审批流程', '{co} 开户 · 尽职调查流程', '{co} 票据贴现 · 操作流程'],
    next: ['当前步骤：审批部审查，预计 3 个工作日', '待材料：担保合同签署，建议今日联系客户', '并行事项：押品评估可同步启动', '流程已完成，建议归档', '时限预警：距材料截止 2 天'],
    stepAi: ['业务类型建议：流动资金贷款（续贷），流程共 9 步', '流程进度：第 5 步「审批部审查」，已完成 4 步，预计还需 6 个工作日', '当前步骤操作：等待审批意见，可提前准备放款材料', '材料与时限预警：担保合同签署截止 2 天，押品评估报告待出具', '并行事项：押品评估、账户开立可同步推进'],
    checks: ['选择业务类型|确认流程版本|开始导航', '查看进度|确认当前步骤|记录', '按提示操作|上传材料|确认完成', '核对材料|处理时限预警|更新状态', '识别并行事项|安排推进|记录'],
    att: ['流程清单.pdf', '材料清单.docx'],
  },
  'F-SY-001': {
    items: ['{co} 授信申报书', '{co} 尽调报告', '精密制造行业简报', '{co} 综合金融服务方案书', '{co} 商业计划书（协助）', '园区批量开发可行性报告', '{co} 投标应答文件'],
    next: ['AI 起草完成，建议进入四类校对', '校对发现 3 处数据不一致，建议核对报表', '结构优化建议：合并第 3、4 章', '已定稿，建议导出 Word 并转呈', '术语校对：「授信敞口」与「风险敞口」统一'],
    stepAi: ['建议选择行内「授信申报书」模板，系统自动填充客户基础信息', 'AI 起草完成 8 章，数据来源已标注', '四类校对：术语 2 处、结构 1 处、数据 3 处、格式 4 处', '结构优化建议：把风险分析前置至第 3 章，合并重复段落', '导出 Word 后可转呈分行公司业务部'],
    checks: ['上传草稿或选择模板|确认文档类型|填写基础信息', '生成初稿|查看数据来源|保存版本', '逐类校对|采用或忽略建议|记录修改', '调整结构|确认章节顺序|保存版本', '导出|转呈|归档'],
    att: ['文档草稿.docx', '参考模板.docx', '数据表.xlsx'],
  },
  'F-SY-002': {
    items: ['{co} 财务总监会谈纪要', '{co} 尽调访谈纪要', '集团客户团队周会纪要', '{co} 续贷沟通纪要', '{co} 跨境方案会谈纪要'],
    next: ['行动项 4 条待确认，建议今日确认', '到期提醒：2 条行动项 3 天内到期', '建议同步 CRM 并挂到客户档案', '纪要已闭环，建议归档', '风险信号 1 条，建议推送风险经理'],
    stepAi: ['录音已转写 42 分钟，识别 3 位发言人', '结构化提取：客户诉求 3 条、风险信号 1 条、行动项 4 条', '行动项建议：材料清单发送（今日）、审批进度同步（每周五）、预审意见（下周三）', '到期提醒：按行动项到期日自动推送企微与 OA', '同步 CRM：纪要与行动项写入客户档案'],
    checks: ['导入录音或纪要|确认会谈信息|开始转写', '查看提取结果|修正错误|确认', '确认行动项|指定负责人|设定到期日', '设置提醒方式|确认时间|保存', '同步 CRM|确认写入|归档'],
    att: ['会谈录音.mp3', '手写纪要.jpg', '会议材料.pptx'],
  },
  'F-SY-004': {
    items: ['{co} 续贷材料收齐', '季度存款目标 · 缺口 1,200 万', '{co} 贷后检查报告', '{co} 首次授信申报', '{co} 结算量流失回访', '团队周会材料', '{co} 远期结汇方案', '{co} 代发工资方案'],
    next: ['P1：今日完成，影响续贷时效', '建议拆分为 3 个子任务', '建议安排在周三上午', '效率周报：本周完成率 78%', '建议合并同客户任务一次拜访完成'],
    stepAi: ['本周目标建议：续贷 2 户、存款新增 800 万、贷后检查 3 户', '任务分解：季度指标拆为 12 项周任务，按到期与商机价值排序', '优先级建议：P1 3 项、P2 5 项、P3 4 项；提醒方式企微 + OA', '日程执行：周二、周三上午安排外出拜访，周四集中处理材料', '效率周报：完成率 78%，逾期 1 项，建议减少周五集中处理'],
    checks: ['确认本周目标|关联季度指标|保存', '拆分任务|指定到期日|确认', '设定优先级|设置提醒|确认', '按日程执行|更新状态|记录', '查看周报|记录改进|归档'],
    att: ['季度指标.xlsx', '周计划.docx'],
  },
  'F-SY-005': {
    items: ['{co} 集团综合授信落地', '{co} 银企直联对接', '{co} 银团贷款组团', '{co} 并购贷款项目', '{co} 供应链金融平台上线'],
    next: ['里程碑「授信批复」延期风险，建议提前协调', '关键路径：担保材料 → 审批 → 放款', '延期预警：预计延期 5 天', '建议申请国际业务部增援', '项目复盘：按期完成率 80%'],
    stepAi: ['项目立项：目标、范围、责任人、期限已生成', '里程碑与甘特：6 个里程碑、90 天，关键节点已标记', '关键路径：担保材料 → 审批 → 放款，任一延期将影响整体', '延期预警：授信批复预计延期 5 天，建议提前与审批部沟通', '资源增援：申请产品经理支持 2 周', '复盘：按期完成率 80%，经验 3 条'],
    checks: ['确认项目信息|指定责任人|保存', '规划里程碑|设定日期|确认', '识别关键路径|标记风险|记录', '查看预警|制定应对|更新计划', '申请资源|确认到位|更新', '复盘|记录经验|归档'],
    att: ['项目计划.xlsx', '里程碑.docx'],
  },
  'F-SY-006': {
    items: ['{co} 授信材料补充 · 等风险经理会签', '{co} 押品评估 · 等评估公司报告', '{co} 方案书 · 等产品经理定价', '{co} 合同签署 · 等法律合规部审核', '{co} 放款 · 等运营管理部复核', '{co} 跨境方案 · 等国际业务部报价'],
    next: ['卡点：等待风险经理会签已 3 天，建议催办', '负载：王志远本周任务 12 项，建议分担 2 项', '建议改派至林小雨', '周表现：周转时效 2.3 天，较上周改善', '卡点已处理，建议更新状态'],
    stepAi: ['任务分配建议：按负载与专长分配，王志远负载偏高', '负载查看：王志远 12 项、周慧敏 8 项、林小雨 6 项', '卡点诊断：3 项卡在会签环节，平均等待 2.5 天，建议催办', '周表现：周转时效 2.3 天，卡点 3 项，完成 15 项'],
    checks: ['查看待分配任务|分配负责人|确认', '查看负载|调整分配|记录', '识别卡点|催办或改派|更新', '查看周表现|记录改进|归档'],
    att: ['任务清单.xlsx', '周表现.pdf'],
  },
};

/* ====================================================================== 任务生成（固定种子） */
const DUE_OFF = [0, -3, 2, 0, 5, -1, 1, 7, 0, 3, -5, 9, 4, 0, 12, -2];
const TIMES = ['09:30', '10:30', '14:00', '15:30', '16:30', '11:00'];
const DEFAULT_CH = ['电话', '企微', '上门', 'OA'];
function buildTasks(fid: string, flavor: Flavor, cols: string[], today: Date, dataSource: string): Task[] {
  const r = rng(hashStr(fid) ^ 0x9e3779b9);
  const last = cols.length - 1;
  const n = flavor.perCompany ? COMPANIES.length : (flavor.count ?? Math.min(11, flavor.items.length + 5));
  const chans = flavor.channels ?? DEFAULT_CH;
  const colWeights = cols.map((_, i) => (i === last ? 1.2 : 3.2 - i * 0.45));
  const pickCol = () => { const tot = colWeights.reduce((a, b) => a + b, 0); let x = r() * tot; for (let i = 0; i < colWeights.length; i++) { x -= colWeights[i]; if (x <= 0) return i; } return 0; };
  const out: Task[] = [];
  for (let i = 0; i < n; i++) {
    const co = flavor.perCompany ? COMPANIES[i] : COMPANIES[(i * 5 + Math.floor(r() * 3)) % COMPANIES.length];
    const tpl = flavor.items[i % flavor.items.length];
    const title = tpl.replace('{co}', co.name);
    const col = flavor.perCompany ? Math.min(last, Math.floor(r() * cols.length)) : pickCol();
    const off = col === last ? -(1 + Math.floor(r() * 6)) : DUE_OFF[i % DUE_OFF.length];
    const due = iso(addDays(today, off));
    const time = TIMES[Math.floor(r() * TIMES.length)];
    const channel = chans[Math.floor(r() * chans.length)];
    const priority: Priority = co.risk === 'red' || co.risk === 'orange' || off <= 0 ? (r() < 0.7 ? 'P1' : 'P2') : off <= 4 ? 'P2' : r() < 0.6 ? 'P3' : 'P2';
    const owner = co.owner;
    const aiNext = col === last ? '已完成，建议归档并同步 CRM 客户档案' : flavor.next[(i + col) % flavor.next.length];
    const created = addDays(today, -(2 + Math.floor(r() * 9)));
    const who = personaName(owner);
    const log = [
      { at: `${String(created.getMonth() + 1).padStart(2, '0')}-${String(created.getDate()).padStart(2, '0')} 09:0${Math.floor(r() * 9)}`, who: '系统', text: `由${dataSource}生成事项，指派 ${who}`, kind: 'sys' as LogKind },
      { at: `${String(created.getMonth() + 1).padStart(2, '0')}-${String(created.getDate()).padStart(2, '0')} 09:3${Math.floor(r() * 9)}`, who: 'AI', text: `建议下一步：${aiNext}`, kind: 'ai' as LogKind },
    ];
    if (col > 0) { const d = addDays(created, 1); log.push({ at: `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} 1${Math.floor(r() * 8)}:${String(Math.floor(r() * 60)).padStart(2, '0')}`, who, text: `状态更新为「${cols[col]}」，${co.note.split(/[；;，,]/)[0]}`, kind: 'user' }); }
    const att = [flavor.att[i % flavor.att.length]].concat(r() < 0.5 ? [flavor.att[(i + 1) % flavor.att.length]] : []);
    out.push({ id: `${fid}-${i + 1}`, coId: co.id, co, title, owner, ownerName: who, due, time, channel, priority, col, aiNext, log, attachments: Array.from(new Set(att)), tags: co.tags.slice(0, 2), synced: col === last });
  }
  return out;
}

/* ====================================================================== 通用工作区 */
function GenericWork({ ctx, flavor }: { ctx: ModuleCtx; flavor: Flavor }) {
  const { step, flow, selected, addLog, toast, tasks, cols, today } = ctx;
  const name = flow[step] ?? '';
  const ai = flavor.stepAi[step] ?? (flavor.stepAi.length ? flavor.stepAi[flavor.stepAi.length - 1] : `已为「${name}」整理输入与建议：优先处理今日到期与逾期事项，处理结果写入时间线`);
  const checks = (flavor.checks[step] ?? `确认「${name}」所需输入齐备|复核 AI 建议并采用或修改|把处理结果写入时间线`).split('|').filter(Boolean);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [note, setNote] = useState('');
  const [adopted, setAdopted] = useState<Record<number, boolean>>({});
  const related = useMemo(() => tasks.filter((t) => t.col < cols.length - 1).sort((a, b) => dayDiff(a.due, today) - dayDiff(b.due, today)).slice(0, 4), [tasks, cols.length, today]);
  const adopt = () => {
    setAdopted((a) => ({ ...a, [step]: true }));
    if (selected) { addLog(selected.id, `采用 AI 建议（${name}）：${ai}`, 'ai'); toast(`已采用 AI 建议并写入「${selected.title}」时间线`); }
    else toast('已采用 AI 建议；在看板选中一条事项可写入其时间线');
  };
  const save = () => {
    if (!note.trim()) { toast('请先填写本步记录'); return; }
    if (selected) { addLog(selected.id, `${name}：${note.trim()}`, 'user'); toast('记录已写入时间线'); setNote(''); }
    else toast('请先在看板中选中一条事项');
  };
  return (
    <>
      <AiCard text={ai} adopted={!!adopted[step]} onAdopt={adopt} />
      <Sec extra={`${checks.filter((_, i) => done[`${step}-${i}`]).length}/${checks.length}`}>本步清单</Sec>
      {checks.map((c, i) => <Check key={c} on={!!done[`${step}-${i}`]} label={c} onClick={() => setDone((d) => ({ ...d, [`${step}-${i}`]: !d[`${step}-${i}`] }))} />)}
      <Sec>本步记录{selected && <span className="chip" style={{ marginLeft: 6 }}><i />{selected.co.name}</span>}</Sec>
      <textarea className="af-inp" placeholder={selected ? `记录「${selected.title}」在本步的处理结果、客户反馈与下一步……` : '在看板中选中一条事项后，这里的记录会写入其时间线'} value={note} onChange={(e) => setNote(e.target.value)} />
      <div className="af-row end" style={{ marginTop: 8 }}><button className="btn ghost sm" onClick={save}><Icons.NotebookPen size={12} />写入时间线</button></div>
      <Sec>待处理事项（按截止排序）</Sec>
      {related.map((t) => (
        <div key={t.id} className={`af-rem${dueState(t, today, cols.length - 1) === 'over' ? ' over' : ''}`} onClick={() => ctx.select(t.id)}>
          <span className="tm">{mdShort(t.due)}</span>
          <div className="bd"><b>{t.title}</b><span>{t.ownerName} · {cols[t.col]} · {dueLabel(t, today, cols.length - 1)}</span></div>
          <span className={`chip ${prioTone(t.priority)}`}><i />{t.priority}</span>
        </div>
      ))}
    </>
  );
}

/* ====================================================================== 看板卡片 */
function BoardCard({ t, sel, cols, today, onSelect, onMove, onDragStart, onDragEnd, dragging }: {
  t: Task; sel: boolean; cols: string[]; today: Date; onSelect: () => void; onMove: (col: number) => void; onDragStart: (e: DragEvent) => void; onDragEnd: () => void; dragging: boolean;
}) {
  const last = cols.length - 1; const ds = dueState(t, today, last);
  return (
    <div className={`af-card ${t.priority}${sel ? ' sel' : ''}${dragging ? ' drag' : ''}`} draggable onDragStart={onDragStart} onDragEnd={onDragEnd} onClick={onSelect}>
      <div className="t">{t.title}</div>
      <div className="m">
        <span className="co">{t.co.name}</span>
        <span className={`due ${ds}`}><Icons.CalendarClock size={11} />{mdShort(t.due)} {t.time} · {dueLabel(t, today, last)}</span>
      </div>
      <div className="ai"><Icons.Sparkles size={11} />{t.aiNext}</div>
      <div className="f">
        <span className="av"><i>{t.ownerName.slice(0, 1)}</i>{t.ownerName}<span className={`pr ${t.priority}`}>{t.priority}</span></span>
        <span className="mv" onClick={(e) => e.stopPropagation()}>
          <button title="移到上一列" disabled={t.col === 0} onClick={() => onMove(t.col - 1)}><Icons.ChevronLeft size={13} /></button>
          <button title="移到下一列" disabled={t.col === last} onClick={() => onMove(t.col + 1)}><Icons.ChevronRight size={13} /></button>
        </span>
      </div>
    </div>
  );
}

/* ====================================================================== 详情面板 */
function DetailPanel({ t, ctx, onClose }: { t: Task; ctx: ModuleCtx; onClose: () => void }) {
  const { cols, today, moveTask, addLog, toast, nav, spec } = ctx;
  const last = cols.length - 1; const ds = dueState(t, today, last);
  const [note, setNote] = useState('');
  const [adopted, setAdopted] = useState(false);
  const acts = actionsOf(spec.actions);
  const adopt = () => { setAdopted(true); addLog(t.id, `采用 AI 建议：${t.aiNext}`, 'ai'); if (t.col < last) moveTask(t.id, t.col + 1); toast(`已采用建议，事项流转至「${cols[Math.min(last, t.col + 1)]}」`); };
  const addAtt = () => { ctx.setTasks((ts) => ts.map((x) => x.id === t.id ? { ...x, attachments: [...x.attachments, `补充材料_${stamp().replace(/[- :]/g, '')}.pdf`] } : x)); addLog(t.id, '上传附件：补充材料', 'user'); toast('附件已加入事项，待归档至行内影像系统'); };
  return (
    <div className="af-detail fade-in">
      <div className="af-d-h"><h3>{t.title}</h3><button className="x" onClick={onClose} title="关闭"><Icons.X size={14} /></button></div>
      <div className="af-d-chips">
        <span className={`chip ${riskTone(t.co.risk)}`}><i />{t.co.name}</span>
        <span className={`chip ${prioTone(t.priority)}`}><i />{t.priority}</span>
        <span className={`chip ${ds === 'over' ? 'red' : ds === 'today' ? 'orange' : ds === 'done' ? 'green' : 'blue'}`}><i />{dueLabel(t, today, last)}</span>
        <span className="chip"><i />{cols[t.col]}</span>
      </div>
      <div className="af-kv">
        <div className="row"><span>负责人</span><span>{t.ownerName}</span></div>
        <div className="row"><span>截止</span><span>{cnDate(t.due)} {t.time}</span></div>
        <div className="row"><span>渠道</span><span>{t.channel}</span></div>
        <div className="row"><span>客户关系</span><span>{t.co.relation}</span></div>
        <div className="row"><span>行业 / 区域</span><span>{t.co.industry} · {t.co.district}</span></div>
      </div>
      <div className="af-d-status">
        <span className="af-mini">状态流转</span>
        <select className="af-inp sm" value={t.col} onChange={(e) => moveTask(t.id, Number(e.target.value))}>{cols.map((c, i) => <option key={c} value={i}>{c}</option>)}</select>
      </div>
      <Sec>AI 建议</Sec>
      <AiCard text={t.aiNext} adopted={adopted} onAdopt={adopt} />
      <Sec extra={`${t.log.length} 条`}>时间线</Sec>
      <div className="af-tl">{[...t.log].reverse().map((l, i) => <div key={i} className={`af-tl-i ${l.kind}`}>{l.text}<small>{l.at} · {l.who}</small></div>)}</div>
      <div className="af-d-note">
        <textarea className="af-inp sm" placeholder="补充记录（客户反馈 / 内部沟通 / 下一步）" value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="af-row end" style={{ marginTop: 6 }}><button className="btn ghost sm" onClick={() => { if (!note.trim()) return; addLog(t.id, note.trim(), 'user'); setNote(''); toast('记录已写入时间线'); }}><Icons.NotebookPen size={12} />记录</button></div>
      </div>
      <Sec extra={<button className="lnk" onClick={addAtt}>+ 上传</button>}>附件</Sec>
      {t.attachments.map((a) => { const ext = (a.split('.').pop() || 'pdf').toLowerCase(); const meta = EXT_ICON[ext] ?? EXT_ICON.pdf; return <div key={a} className="af-att"><span className="fi"><IconOf name={meta.icon} size={14} /></span><span className="nm">{a}</span><span className="af-mini">{meta.kind}</span></div>; })}
      <Sec>关联动作</Sec>
      <div className="af-links">
        {acts.map((a) => <button key={a.id} className={`btn sm ${a.tone === 'red' ? '' : a.tone === 'gold' ? 'gold' : a.tone === 'green' ? 'green' : 'ghost'}`} onClick={() => { addLog(t.id, `触发关联动作：${a.label}`, 'user'); if (a.to) nav(a.to); else toast(a.system === 'oa' ? `已推送行内 OA 待办：${t.title}` : a.system === 'crm' ? `已写回 CRM：${t.co.name} · ${t.title}` : `已转呈相关部门：${t.title}`); }}><IconOf name={a.icon} size={13} />{a.label}</button>)}
      </div>
    </div>
  );
}

/* ====================================================================== 底部：提醒 / 统计 / 趋势 */
function Foot({ ctx, onRemind }: { ctx: ModuleCtx; onRemind: () => void }) {
  const { tasks, cols, today, select, fid } = ctx;
  const last = cols.length - 1;
  const rem = useMemo(() => tasks.filter((t) => t.col < last && dayDiff(t.due, today) <= 0).sort((a, b) => dayDiff(a.due, today) - dayDiff(b.due, today) || a.time.localeCompare(b.time)), [tasks, last, today]);
  const total = tasks.length; const doneN = tasks.filter((t) => t.col === last).length; const over = tasks.filter((t) => t.col < last && dayDiff(t.due, today) < 0).length;
  const rate = total ? Math.round((doneN / total) * 100) : 0;
  const trend = useMemo(() => { const r = rng(hashStr(fid) + 77); return Array.from({ length: 7 }, (_, i) => { const d = addDays(today, i - 6); return { d: `${d.getMonth() + 1}/${d.getDate()}`, 新增: 2 + Math.floor(r() * 5), 完成: 1 + Math.floor(r() * 5) }; }); }, [fid, today]);
  const circ = 2 * Math.PI * 28;
  return (
    <div className="af-foot">
      <div className="card">
        <div className="card-h"><div className="card-t"><span className="dot" />今日提醒</div><button className="btn ghost sm" onClick={onRemind}><Icons.BellRing size={12} />设置提醒</button></div>
        {rem.length === 0 && <div className="af-col-empty">今日无到期事项，看板中 {total - doneN} 条事项在推进中</div>}
        {rem.map((t) => { const over = dayDiff(t.due, today) < 0; return (
          <div key={t.id} className={`af-rem${over ? ' over' : ''}`} onClick={() => select(t.id)}>
            <span className="tm">{over ? mdShort(t.due) : t.time}</span>
            <div className="bd"><b>{t.co.name} · {t.title}</b><span>{t.channel} · {t.ownerName} · {cols[t.col]}</span></div>
            <span className={`chip ${over ? 'red' : 'orange'}`}><i />{over ? `逾期 ${-dayDiff(t.due, today)} 天` : '今日'}</span>
          </div>); })}
      </div>
      <div className="card gold">
        <div className="card-h"><div className="card-t"><span className="dot" />执行统计</div><span className="card-s">{cols[0]} → {cols[last]}</span></div>
        <div className="af-stat">
          <div className="tile"><b className="num">{rate}%</b><span>完成率 · {doneN}/{total}</span></div>
          <div className="tile"><b className={`num ${over ? 'red-text' : 'green-text'}`}>{over}</b><span>逾期事项</span></div>
        </div>
        <div className="af-ring">
          <svg viewBox="0 0 72 72"><defs><linearGradient id="afRing" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#e3a93c" /><stop offset="1" stopColor="#1f8a5a" /></linearGradient></defs>
            <circle cx="36" cy="36" r="28" fill="none" stroke="rgba(201,162,77,.2)" strokeWidth="8" />
            <circle cx="36" cy="36" r="28" fill="none" stroke="url(#afRing)" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(rate / 100) * circ} ${circ}`} transform="rotate(-90 36 36)" />
            <text x="36" y="40" textAnchor="middle" fontSize="13" fontWeight="900" fill="#1e1b16">{rate}%</text></svg>
          <div className="lg">{cols.map((c, i) => <span key={c}><b>{tasks.filter((t) => t.col === i).length}</b> {c}</span>)}</div>
        </div>
      </div>
      <div className="card">
        <div className="card-h"><div className="card-t"><span className="dot" />近 7 日趋势</div><span className="card-s">新增 vs 完成</span></div>
        <div className="af-chart">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend} margin={{ top: 6, right: 6, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="afG1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e3a93c" stopOpacity=".55" /><stop offset="1" stopColor="#e3a93c" stopOpacity=".05" /></linearGradient>
                <linearGradient id="afG2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1f8a5a" stopOpacity=".55" /><stop offset="1" stopColor="#1f8a5a" stopOpacity=".05" /></linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(120,100,60,.12)" vertical={false} />
              <XAxis dataKey="d" tick={{ fontSize: 10.5, fill: '#8c8478' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10.5, fill: '#8c8478' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={({ active, payload, label }) => active && payload?.length ? <div className="af-tip"><b>{label}</b>{payload.map((p) => <div key={String(p.name)}>{p.name}：{p.value}</div>)}</div> : null} />
              <Area type="monotone" dataKey="新增" stroke="#c9a24d" strokeWidth={2} fill="url(#afG1)" />
              <Area type="monotone" dataKey="完成" stroke="#1f8a5a" strokeWidth={2} fill="url(#afG2)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* ====================================================================== 弹窗 */
function Modal({ title, onClose, children, foot }: { title: string; onClose: () => void; children: ReactNode; foot?: ReactNode }) {
  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal card af-modal fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="card-h"><div className="card-t"><span className="dot" />{title}</div><button className="up-x" onClick={onClose}><Icons.X size={14} /></button></div>
        {children}
        {foot && <div className="modal-foot">{foot}</div>}
      </div>
    </div>
  );
}
const PRIOS = ['P1', 'P2', 'P3'] as const;
function NewTaskModal({ ctx, cols, channels, onClose }: { ctx: ModuleCtx; cols: string[]; channels: string[]; onClose: () => void }) {
  const [coId, setCoId] = useState(COMPANIES[0].id);
  const [title, setTitle] = useState('');
  const [owner, setOwner] = useState(ME.id);
  const [due, setDue] = useState(iso(addDays(ctx.today, 2)));
  const [time, setTime] = useState('10:00');
  const [prio, setPrio] = useState<Priority>('P2');
  const [ch, setCh] = useState(channels[0]);
  const [col, setCol] = useState(0);
  const [note, setNote] = useState('');
  const co = companyById(coId);
  const suggest = `${co.name}${co.tags[0] ? ` · ${co.tags[0]}` : ''}跟进`;
  return (
    <Modal title="新建事项" onClose={onClose} foot={<><span className="ai-tag">新建后 AI 自动给出下一步建议</span><button className="btn" onClick={() => { const t = ctx.addTask({ title: title.trim() || suggest, coId, owner, due, time, priority: prio, channel: ch, col, note: note.trim() || undefined }); ctx.select(t.id); onClose(); ctx.toast(`已新建事项「${t.title}」`); }}><Icons.Plus size={13} />创建</button></>}>
      <div className="af-grid2">
        <Field label="客户" req><select className="af-inp" value={coId} onChange={(e) => setCoId(e.target.value)}>{COMPANIES.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.industry}</option>)}</select></Field>
        <Field label="负责人"><select className="af-inp" value={owner} onChange={(e) => setOwner(e.target.value)}>{PERSONAS.filter((p) => p.customers > 0).map((p) => <option key={p.id} value={p.id}>{p.name} · {p.title}</option>)}</select></Field>
      </div>
      <Field label="事项" req hint={`建议：${suggest}`}><input className="af-inp" placeholder={suggest} value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
      <div className="af-grid3">
        <Field label="截止日期"><input className="af-inp" type="date" value={due} onChange={(e) => setDue(e.target.value)} /></Field>
        <Field label="时间"><input className="af-inp" type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
        <Field label="起始列"><select className="af-inp" value={col} onChange={(e) => setCol(Number(e.target.value))}>{cols.map((c, i) => <option key={c} value={i}>{c}</option>)}</select></Field>
      </div>
      <div className="af-grid2">
        <Field label="优先级"><ChipPick options={PRIOS} value={prio} onChange={setPrio} /></Field>
        <Field label="渠道"><ChipPick options={channels} value={ch} onChange={setCh} tone="blue" /></Field>
      </div>
      <Field label="备注"><textarea className="af-inp" placeholder="背景、客户诉求、注意事项……" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
    </Modal>
  );
}
function ImportModal({ ctx, onClose }: { ctx: ModuleCtx; onClose: () => void }) {
  const sample = `晟禾食品集团,母公司 2,000 万贷款续贷沟通,${iso(addDays(ctx.today, 3))},P1\n宁桂精密机械,定点项目首批交付前拜访,${iso(addDays(ctx.today, 6))},P2\n嘉禾连锁餐饮,收单与代发方案回访,${iso(addDays(ctx.today, 8))},P3`;
  const [text, setText] = useState(sample);
  const rows = text.split('\n').map((l) => l.split(/[,，\t]/).map((s) => s.trim())).filter((r) => r[0] && r[1]);
  const doImport = () => {
    let n = 0;
    for (const r of rows) {
      const name = r[0].replace(/[\s（(].*$/, '');
      const co = COMPANIES.find((c) => c.name.includes(name) || name.includes(c.name)) ?? COMPANIES[n % COMPANIES.length];
      const due = /^\d{4}-\d{2}-\d{2}$/.test(r[2] ?? '') ? r[2] : iso(addDays(ctx.today, 3 + n));
      const pr = (['P1', 'P2', 'P3'] as Priority[]).includes(r[3] as Priority) ? (r[3] as Priority) : 'P2';
      ctx.addTask({ title: r[1], coId: co.id, due, priority: pr, note: '批量导入' }); n++;
    }
    onClose(); ctx.toast(`已导入 ${n} 条事项，AI 已逐条生成下一步建议`);
  };
  return (
    <Modal title="批量导入事项" onClose={onClose} foot={<><span className="af-mini">识别到 {rows.length} 条 · 支持从 Excel 直接粘贴（客户, 事项, 截止, 优先级）</span><button className="btn" disabled={!rows.length} onClick={doImport}><Icons.Upload size={13} />导入 {rows.length} 条</button></>}>
      <div className="card-s">每行一条：客户,事项,截止日期(YYYY-MM-DD),优先级(P1/P2/P3)。未识别的客户按名下客户顺序分配，缺省截止为 3 天后。</div>
      <textarea className="af-inp" style={{ minHeight: 150, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12.5 }} value={text} onChange={(e) => setText(e.target.value)} />
    </Modal>
  );
}
const REMIND_WAYS = ['企微', '短信', 'OA 待办', '日历'];
function RemindModal({ ctx, onClose }: { ctx: ModuleCtx; onClose: () => void }) {
  const last = ctx.cols.length - 1;
  const cands = ctx.tasks.filter((t) => t.col < last).sort((a, b) => dayDiff(a.due, ctx.today) - dayDiff(b.due, ctx.today)).slice(0, 8);
  const [picked, setPicked] = useState<string[]>(cands.slice(0, 3).map((t) => t.id));
  const [ways, setWays] = useState<string[]>(['企微', 'OA 待办']);
  const [ahead, setAhead] = useState('提前 1 天 09:00');
  return (
    <Modal title="设置提醒" onClose={onClose} foot={<><span className="ai-tag">提醒遵守客户联系偏好，非工作时间不外发</span><button className="btn" disabled={!picked.length || !ways.length} onClick={() => { picked.forEach((id) => ctx.addLog(id, `设置提醒：${ahead} · ${ways.join(' / ')}`, 'sys')); onClose(); ctx.toast(`已为 ${picked.length} 条事项设置提醒（${ways.join(' / ')}）`); }}><Icons.BellRing size={13} />确认设置</button></>}>
      <div className="af-grid2">
        <Field label="提醒时点"><ChipPick options={['当天 08:30', '提前 1 天 09:00', '提前 3 天 09:00', '提前 7 天 09:00']} value={ahead} onChange={setAhead} tone="orange" /></Field>
        <Field label="提醒方式"><ChipMulti options={REMIND_WAYS} value={ways} onChange={setWays} /></Field>
      </div>
      <Sec extra={`${picked.length}/${cands.length}`}>选择事项</Sec>
      {cands.map((t) => <Check key={t.id} on={picked.includes(t.id)} label={`${t.co.name} · ${t.title}`} sub={`${cnDate(t.due)} ${t.time} · ${t.ownerName}`} onClick={() => setPicked((p) => p.includes(t.id) ? p.filter((x) => x !== t.id) : [...p, t.id])} />)}
    </Modal>
  );
}

/* ====================================================================== 页面 */
export default function ActionFlowPage() {
  const { fid = '' } = useParams();
  const fn = useMemo(() => { const f = CATALOG.functions.find((x) => x.id === fid); return f ? sanitize(f) : undefined; }, [fid]);
  if (!fn) {
    return (
      <div className="card" style={{ maxWidth: 560, margin: '40px auto', textAlign: 'center' }}>
        <div className="af-empty"><div className="ico"><Icons.Search size={20} /></div><b>未找到该功能</b><span>功能编号「{fid || '（空）'}」不在当前功能目录中。</span></div>
        <Link to="/" className="btn ghost"><Icons.ChevronLeft size={14} /> 返回首页驾驶舱</Link>
      </div>
    );
  }
  return <ActionWork key={fn.id} fn={fn} />;
}

function ActionWork({ fn }: { fn: ProductFunction }) {
  const nav = useNavigate();
  const product = productById(fn.product);
  const spec = useMemo(() => specOf(fn.id), [fn.id]);
  const flow = useMemo(() => spec.flow?.length ? spec.flow : ['准备', '处理', '复核', '完成'], [spec]);
  const cols = useMemo(() => spec.board?.length ? spec.board : ['待处理', '进行中', '待复核', '已完成'], [spec]);
  const flavor = FLAVORS[fn.id] ?? DEFAULT_FLAVOR;
  const mod = MODULES[fn.id];
  const today = useMemo(() => startOfToday(), []);
  const uploadStep = useMemo(() => { if (!spec.uploads?.length) return -1; const i = flow.findIndex((s) => /上传|导入/.test(s)); return i < 0 ? 0 : i; }, [spec, flow]);
  const channels = flavor.channels ?? DEFAULT_CH;

  const [tasks, setTasksState] = useState<Task[]>(() => buildTasks(fn.id, flavor, cols, today, fn.dataSources?.[0] ?? '行内业务系统'));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [step, setStepState] = useState(0);
  const [doneSteps, setDoneSteps] = useState<boolean[]>(() => flow.map(() => false));
  const [docs, setDocs] = useState<UDoc[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'mine' | 'today' | 'over'>('all');
  const [modal, setModal] = useState<'new' | 'import' | 'remind' | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);
  const seq = useRef(100);

  const toast = (m: string) => { setToastMsg(m); if (toastTimer.current) window.clearTimeout(toastTimer.current); toastTimer.current = window.setTimeout(() => setToastMsg(null), 2800); };
  useEffect(() => () => { if (toastTimer.current) window.clearTimeout(toastTimer.current); }, []);

  const docsDone = docs.some((d) => d.status === 'done');
  const locked = (n: number) => !!spec.uploadRequired && uploadStep >= 0 && n > uploadStep && !docsDone;
  const setStep = (n: number) => { if (n < 0 || n >= flow.length) return; if (locked(n)) { toast(`请先在「${flow[uploadStep]}」上传并完成识别，再进入「${flow[n]}」`); return; } setStepState(n); };
  const completeStep = (note?: string) => {
    setDoneSteps((d) => d.map((v, i) => (i === step ? true : v)));
    if (selectedId) addLog(selectedId, note ?? `完成「${flow[step]}」`, 'user');
    if (step < flow.length - 1) setStep(step + 1); else toast('流程已全部完成，可导出或转呈');
  };
  const setTasks = (f: (prev: Task[]) => Task[]) => setTasksState(f);
  const addLog = (id: string, text: string, kind: LogKind = 'user') => setTasksState((ts) => ts.map((t) => t.id === id ? { ...t, log: [...t.log, { at: stamp(), who: kind === 'ai' ? 'AI' : kind === 'sys' ? '系统' : ME.name, text, kind }], synced: kind === 'sys' ? t.synced : false } : t));
  const moveTask = (id: string, col: number, note?: string) => setTasksState((ts) => ts.map((t) => {
    if (t.id !== id || col === t.col || col < 0 || col >= cols.length) return t;
    const done = col === cols.length - 1;
    return { ...t, prevCol: t.col, col, synced: false, aiNext: done ? '已完成，建议归档并同步 CRM 客户档案' : t.col === cols.length - 1 ? flavor.next[0] : t.aiNext, log: [...t.log, { at: stamp(), who: ME.name, text: note ?? `状态流转：${cols[t.col]} → ${cols[col]}`, kind: 'user' as LogKind }] };
  }));
  const addTask = (n: NewTask): Task => {
    const co = companyById(n.coId) ?? COMPANIES[0];
    const owner = n.owner ?? co.owner;
    const r = rng(hashStr(n.title) + seq.current);
    const aiNext = n.aiNext ?? flavor.next[Math.floor(r() * flavor.next.length)];
    const t: Task = { id: `${fn.id}-n${seq.current++}`, coId: co.id, co, title: n.title, owner, ownerName: personaName(owner), due: n.due ?? iso(addDays(today, 3)), time: n.time ?? '10:00', channel: n.channel ?? channels[0], priority: n.priority ?? 'P2', col: n.col ?? 0, aiNext, tags: n.tags ?? co.tags.slice(0, 2), attachments: n.attachments ?? [], synced: false,
      log: [{ at: stamp(), who: ME.name, text: `新建事项${n.note ? `：${n.note}` : ''}`, kind: 'user' }, { at: stamp(), who: 'AI', text: `建议下一步：${aiNext}`, kind: 'ai' }] };
    setTasksState((ts) => [t, ...ts]);
    return t;
  };
  const selected = tasks.find((t) => t.id === selectedId);
  const ctx: ModuleCtx = { fid: fn.id, fn, spec, today, cols, flow, step, setStep, completeStep, doneSteps, tasks, setTasks, selected, select: (id) => setSelectedId(id), moveTask, addLog, addTask, toast, nav: (to) => nav(to), docs, docsDone };

  const last = cols.length - 1;
  const shown = tasks.filter((t) => filter === 'all' ? true : filter === 'mine' ? t.owner === ME.id : filter === 'today' ? t.col < last && dayDiff(t.due, today) === 0 : t.col < last && dayDiff(t.due, today) < 0);
  const onDrop = (col: number) => { if (dragId) { moveTask(dragId, col); const t = tasks.find((x) => x.id === dragId); if (t && t.col !== col) toast(`「${t.title}」已移至「${cols[col]}」`); } setDragId(null); setOverCol(null); };
  const exportCsv = () => {
    const head = ['事项', '客户', '负责人', '截止', '时间', '渠道', '优先级', '状态', 'AI 建议下一步'];
    const rows = tasks.map((t) => [t.title, t.co.name, t.ownerName, t.due, t.time, t.channel, t.priority, cols[t.col], t.aiNext].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const blob = new Blob(['﻿' + [head.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${fn.name}_看板_${iso(today)}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1500);
    toast(`已导出看板 ${tasks.length} 条事项（CSV），并存入个人工作台`);
  };
  const wide = !!mod?.wide?.(step);
  const Work = mod?.Component;

  return (
    <div className="af">
      <div className="af-crumb"><Link to="/">首页驾驶舱</Link><Icons.ChevronRight size={12} /><Link to={product?.route ?? '/'}>{product?.name ?? fn.product}</Link><Icons.ChevronRight size={12} /><b>{fn.name}</b></div>
      <div className="af-head">
        <div>
          <h1>{fn.name}<span className="fid">{fn.id}</span><span className="kind">动作流程</span></h1>
          <p>{fn.summary}</p>
        </div>
        <div className="af-actions">
          <button className="btn" onClick={() => setModal('new')}><Icons.Plus size={14} /> 新建</button>
          <button className="btn ghost" onClick={() => setModal('import')}><Icons.Upload size={14} /> 批量导入</button>
          <button className="btn ghost" onClick={() => setModal('remind')}><Icons.BellRing size={14} /> 设置提醒</button>
          <button className="btn gold" onClick={exportCsv}><Icons.Download size={14} /> 导出</button>
        </div>
      </div>

      <div className="af-flow">
        {flow.map((s, i) => {
          const lk = locked(i);
          return (
            <div key={s} className={`af-step${i === step ? ' on' : doneSteps[i] ? ' done' : ''}${lk ? ' locked' : ''}`} onClick={() => setStep(i)} title={lk ? '需先完成上传识别' : s}>
              <span className="n">{doneSteps[i] && i !== step ? <Icons.Check size={13} /> : lk ? <Icons.Lock size={12} /> : i + 1}</span>
              <div className="bd"><b>{s}</b><small>{i === step ? '当前步骤' : doneSteps[i] ? '已完成' : lk ? '待上传识别' : `第 ${i + 1} 步`}</small></div>
            </div>
          );
        })}
      </div>

      <div className={`af-body${wide ? ' wide' : ''}${selected ? ' has-detail' : ''}`}>
        {/* ---------- 工作区 ---------- */}
        <div className="card af-work">
          <div className="af-work-h">
            <h2><span className="n">{step + 1}</span>{flow[step]}</h2>
            <div className="meta">
              {selected && <span className="chip red"><i />当前事项：{selected.co.name}</span>}
              <span className="ai-tag"><span className="pulse" />AI 逐步建议</span>
            </div>
          </div>
          {uploadStep >= 0 && (
            <div hidden={step !== uploadStep} style={{ marginBottom: 12 }}>
              <UploadDocs label="来源材料" types={spec.uploads} presets={spec.uploads?.slice(0, 3).map((u) => `${u.replace(/\s*\(.*?\)/g, '')}.pdf`)} required={spec.uploadRequired} onChange={setDocs} hint={spec.uploadRequired ? '识别完成后才能进入后续步骤；支持影像、Word、Excel、PDF 与录音' : '上传后 AI 自动提取要素并带入本步表单'} />
            </div>
          )}
          {Work ? <Work ctx={ctx} /> : <GenericWork ctx={ctx} flavor={flavor} />}
          <div className="af-work-foot">
            <span className={`hint${locked(step + 1) ? ' warn' : ''}`}>{locked(step + 1) ? <><Icons.Lock size={12} />完成上传识别后可进入下一步</> : step === flow.length - 1 ? <><Icons.Flag size={12} />最后一步：完成后可导出、转呈或写回 CRM</> : <><Icons.Info size={12} />下一步：{flow[step + 1]}</>}</span>
            <div className="af-row">
              <button className="btn ghost sm" disabled={step === 0} onClick={() => setStep(step - 1)}><Icons.ChevronLeft size={13} />上一步</button>
              <button className="btn sm" disabled={locked(step + 1)} onClick={() => completeStep()}>{step === flow.length - 1 ? <><Icons.CheckCheck size={13} />完成流程</> : <>完成本步<Icons.ChevronRight size={13} /></>}</button>
            </div>
          </div>
        </div>

        {/* ---------- 看板 ---------- */}
        <div className="card af-boardwrap">
          <div className="card-h">
            <div className="card-t"><span className="dot" />任务看板<span className="card-s">{shown.length} 条 · 拖拽或点击箭头流转</span></div>
            <div className="af-board-tools">
              {([['all', '全部'], ['mine', '我负责'], ['today', '今日'], ['over', '逾期']] as const).map(([k, l]) => <button key={k} className={`chip${filter === k ? ' red' : ''}`} onClick={() => setFilter(k)}><i />{l}</button>)}
            </div>
          </div>
          <div className="af-board">
            {cols.map((c, i) => {
              const list = shown.filter((t) => t.col === i);
              return (
                <div key={c} className={`af-col${overCol === i ? ' over' : ''}${i === last ? ' last' : ''}`} onDragOver={(e) => { e.preventDefault(); if (overCol !== i) setOverCol(i); }} onDragLeave={() => setOverCol(null)} onDrop={(e) => { e.preventDefault(); onDrop(i); }}>
                  <div className="af-col-h"><span className="dot" />{c}<span className="cnt">{list.length}</span></div>
                  {list.length === 0 && <div className="af-col-empty">拖拽事项到此列</div>}
                  {list.map((t) => <BoardCard key={t.id} t={t} sel={t.id === selectedId} cols={cols} today={today} dragging={dragId === t.id}
                    onSelect={() => setSelectedId(t.id === selectedId ? null : t.id)} onMove={(col) => { moveTask(t.id, col); toast(`「${t.title}」已流转至「${cols[col]}」`); }}
                    onDragStart={(e) => { setDragId(t.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', t.id); }} onDragEnd={() => { setDragId(null); setOverCol(null); }} />)}
                </div>
              );
            })}
          </div>
        </div>

        {/* ---------- 详情 ---------- */}
        {selected && <DetailPanel key={selected.id} t={selected} ctx={ctx} onClose={() => setSelectedId(null)} />}
      </div>

      <Foot ctx={ctx} onRemind={() => setModal('remind')} />

      {modal === 'new' && <NewTaskModal ctx={ctx} cols={cols} channels={channels} onClose={() => setModal(null)} />}
      {modal === 'import' && <ImportModal ctx={ctx} onClose={() => setModal(null)} />}
      {modal === 'remind' && <RemindModal ctx={ctx} onClose={() => setModal(null)} />}
      {toastMsg && <div className="af-toast"><span className="ico"><Icons.CircleCheck size={15} /></span>{toastMsg}</div>}
    </div>
  );
}
