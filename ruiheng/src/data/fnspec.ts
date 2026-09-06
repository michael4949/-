/**
 * 功能页类型规格：决定每个功能用哪种页面引擎呈现，以及上传、联动动作、报告大纲 / 流程步骤等配置。
 * kind：
 *  - analysis  分析预测类：输入（含上传）→ AI 处理 → 结果面板 → 放大醒目的 AI 结论 + 联动动作
 *  - action    动作流程类：流程步骤 / 任务看板 / 表单 / 状态流转，AI 在每一步给建议
 *  - hybrid    分析 + 动作：上半部分析结论，下半部可执行的行动计划与任务
 *  - report    专业报告类：生成完整排版的专业报告，可编辑 / 打印 / 导出 / 转呈
 *  - bespoke   专属页面（在 registry.ts 登记）
 */
export type Kind = 'analysis' | 'action' | 'hybrid' | 'report' | 'bespoke';
export interface FnSpec {
  kind: Kind;
  /** 需要上传的来源文件类型（显示在上传区，支持 word/excel/pdf/ppt/图片等多模态） */
  uploads?: string[];
  /** 是否必须先上传才能生成结果 */
  uploadRequired?: boolean;
  /** 联动动作 id，见 src/lib/actions.ts */
  actions: string[];
  /** 报告类：章节大纲 */
  outline?: string[];
  /** 动作类：流程步骤 */
  flow?: string[];
  /** 动作类：看板列 */
  board?: string[];
  /** 报告类：文书类型（报告 / 方案书 / 建议书 / 测算单） */
  docType?: string;
}

const FIN = ['资产负债表', '利润表', '现金流量表', '审计报告', '纳税申报表'];

export const FNSPEC: Record<string, FnSpec> = {
  // ---------------- P01 智慧获客引擎（专属页） ----------------
  'F-KH-001': { kind: 'bespoke', actions: ['visit', 'marketing', 'followup'] },
  'F-KH-002': { kind: 'bespoke', actions: ['sparring', 'talk', 'minutes'] },
  'F-KH-003': { kind: 'bespoke', actions: ['visit', 'credit', 'followup'] },
  'F-KH-004': { kind: 'bespoke', actions: ['visit', 'talk', 'forward'] },
  'F-KH-005': { kind: 'bespoke', actions: ['visit', 'sparring', 'forward'] },
  'F-KH-006': { kind: 'bespoke', actions: ['scf', 'visit', 'followup'] },
  'F-YX-002': { kind: 'bespoke', actions: ['visit', 'combo', 'forward'] },

  // ---------------- P02 客户全景洞察 ----------------
  'F-KH-007': { kind: 'analysis', actions: ['visit', 'marketing', 'credit', 'followup'] },
  'F-KH-008': { kind: 'analysis', uploads: ['机构章程或预算文件', '资金管理办法', '往来账户流水'], actions: ['combo', 'visit', 'forward'] },
  'F-KH-009': { kind: 'analysis', actions: ['scenario', 'combo', 'visit', 'followup'] },
  'F-KH-010': { kind: 'action', actions: ['visit', 'talk', 'minutes', 'crm'], flow: ['今日跟进', '本周计划', '逾期提醒', '跟进记录', '同步 CRM'], board: ['待联系', '已联系', '待回访', '已回访', '已转化'] },
  'F-KH-011': { kind: 'analysis', uploads: ['客户回访记录', '投诉工单', '问卷结果 (Excel)'], actions: ['followup', 'plan', 'forward'] },
  'F-KH-012': { kind: 'analysis', actions: ['followup', 'visit', 'combo', 'oa'] },
  'F-KH-013': { kind: 'action', actions: ['marketing', 'combo', 'followup', 'forward'], flow: ['设定分层规则', '运行分层', '核对分层结果', '配置差异化策略', '下发执行'], board: ['战略客户', '核心客户', '成长客户', '基础客户', '观察客户'] },
  'F-KH-014': { kind: 'hybrid', actions: ['combo', 'marketing', 'visit', 'followup'] },
  'F-KH-015': { kind: 'hybrid', actions: ['scenario', 'talk', 'visit', 'followup'] },
  'F-KH-016': { kind: 'analysis', uploads: ['账户流水 (Excel)', '结算凭证影像'], actions: ['alert', 'combo', 'followup'] },
  'F-KH-017': { kind: 'hybrid', actions: ['followup', 'combo', 'visit', 'plan'] },
  'F-KH-018': { kind: 'hybrid', uploads: ['客户资金计划', '理财持仓明细'], actions: ['combo', 'forward', 'visit'] },
  'F-KH-019': { kind: 'hybrid', actions: ['finance', 'visit', 'marketing'] },
  'F-KH-020': { kind: 'hybrid', actions: ['scenario', 'combo', 'visit'] },
  'F-SY-020': { kind: 'hybrid', actions: ['visit', 'minutes', 'followup', 'plan'] },
  'F-YX-001': { kind: 'action', actions: ['scenario', 'combo', 'visit'], flow: ['选择客户与需求来源', '需求特征识别', '产品规则匹配', '匹配结果复核', '转入方案 / 拜访'], board: ['待匹配需求', '已匹配产品', '待复核', '已转方案'] },

  // ---------------- P03 财务智能诊断 ----------------
  'F-ZY-005': { kind: 'bespoke', uploads: FIN, uploadRequired: true, actions: ['credit', 'report', 'visit'] },
  'F-ZY-006': { kind: 'analysis', uploads: FIN, uploadRequired: true, actions: ['report', 'credit', 'alert'] },
  'F-ZY-007': { kind: 'analysis', uploads: [...FIN, '销售合同或订单', '银行流水 (Excel)'], uploadRequired: true, actions: ['credit', 'finance', 'report'] },
  'F-ZY-008': { kind: 'report', uploads: FIN, uploadRequired: true, actions: ['alert', 'credit', 'followup'], docType: '财务风险预警报告', outline: ['风险总评与预警等级', '预警指标扫描表', '偿债能力分析', '盈利与经营质量', '现金流与资金链', '关联与非经营性占用', '预警信号与触发规则', '应对策略与监测计划', '数据来源与口径'] },
  'F-ZY-009': { kind: 'report', uploads: [...FIN, '商业计划书 / 融资材料'], uploadRequired: true, actions: ['finance', 'invest', 'forward'], docType: '企业价值评估报告', outline: ['评估结论与价值区间', '企业与行业概况', '财务基础与调整', '收益法测算', '市场法对标', '资产基础法校验', '敏感性分析', '价值驱动因素与提升建议', '假设与限制条件'] },
  'F-ZY-010': { kind: 'report', uploads: FIN, uploadRequired: true, actions: ['credit', 'forward', 'visit'], docType: '财务诊断报告', outline: ['诊断结论', '企业概况与报表基础', '资产质量分析', '负债结构与偿债能力', '盈利能力与经营质量', '现金流分析', '财务异常与核实事项', '同业对标', '结论与授信建议', '指标附表与数据来源'] },
  'F-ZY-011': { kind: 'analysis', uploads: ['集团合并报表', '成员企业报表', '关联交易清单'], uploadRequired: true, actions: ['group', 'alert', 'credit'] },
  'F-ZY-012': { kind: 'analysis', uploads: ['境外主体审计报告', '外币报表', '汇率与准则说明'], uploadRequired: true, actions: ['fx', 'credit', 'alert'] },
  'F-ZY-013': { kind: 'action', uploads: ['交易背景材料', '意向书 / 条款清单'], actions: ['finance', 'pricing', 'contract', 'forward'], flow: ['录入交易要素', '生成候选结构', '现金流与风险匹配', '监管约束核对', '推荐结构与说明书', '提交内部评审'], board: ['要素录入', '结构生成', '比选中', '评审中', '已定稿'] },
  'F-ZY-014': { kind: 'action', uploads: ['项目可研 / 投资计划', '现有融资合同'], actions: ['finance', 'pricing', 'credit', 'forward'], flow: ['录入投融资需求', '备选方案生成', '成本与现金流测算', '风险条款配置', '推荐方案定稿', '转授信 / 转呈'], board: ['需求录入', '方案备选', '测算中', '已推荐', '已转授信'] },

  // ---------------- P04 行业与宏观研判 ----------------
  'F-FX-016': { kind: 'analysis', actions: ['alert', 'credit', 'forward'] },
  'F-FX-017': { kind: 'analysis', actions: ['alert', 'forward', 'visit'] },
  'F-FX-018': { kind: 'report', uploads: ['核心企业供应商 / 经销商名单', '产业链调研材料'], actions: ['alert', 'scf', 'forward'], docType: '产业链与供应链风险图谱报告', outline: ['风险总评', '产业链结构与本行敞口', '关键节点风险表', '核心企业影响测算', '供应链韧性评分', '风险传导情景', '预警清单与监测规则', '应对策略与业务机会', '数据来源'] },
  'F-FX-019': { kind: 'report', actions: ['alert', 'forward'], docType: '宏观风险监测月报', outline: ['本月要点', '宏观指标看板', '货币与信贷环境', '政策变化与影响', '行业与区域传导', '本行客户组合影响', '市场风险提示', '下月关注清单', '数据来源'] },
  'F-FX-022': { kind: 'analysis', uploads: ['政策文件 (PDF/Word)', '行业通知'], actions: ['alert', 'scenario', 'forward'] },
  'F-ZY-020': { kind: 'analysis', actions: ['credit', 'marketing', 'forward'] },
  'F-ZY-021': { kind: 'analysis', uploads: ['访谈纪要', '企业介绍 / 宣传册', '经营数据 (Excel)'], actions: ['visit', 'credit', 'followup'] },
  'F-ZY-022': { kind: 'analysis', uploads: ['企业战略规划', '年报 / 董事会材料'], actions: ['visit', 'finance', 'forward'] },
  'F-ZY-023': { kind: 'analysis', actions: ['alert', 'forward'] },
  'F-ZY-024': { kind: 'analysis', uploads: ['政策原文 (PDF/Word)'], actions: ['scenario', 'marketing', 'forward'] },
  'F-ZY-025': { kind: 'analysis', actions: ['visit', 'marketing', 'forward'] },
  'F-ZY-026': { kind: 'analysis', actions: ['fx', 'alert', 'forward'] },
  'F-ZY-027': { kind: 'analysis', actions: ['prospect', 'marketing', 'visit'] },
  'F-ZY-028': { kind: 'report', actions: ['scf', 'prospect', 'forward'], docType: '产业链图谱分析报告', outline: ['结论摘要', '产业链全景图', '上游环节分析', '中游环节分析', '下游环节分析', '本行客户覆盖与机会', '协同机会清单', '供应链风险提示', '数据来源'] },
  'F-ZY-029': { kind: 'report', uploads: ['商业计划书', '企业介绍', '财务数据'], actions: ['finance', 'visit', 'forward'], docType: '商业模式评估报告', outline: ['评估结论', '商业模式画布', '价值主张与客户细分', '收入模式与成本结构', '竞争力评分', '创新空间与风险', '金融配套建议', '数据来源'] },

  // ---------------- P05 方案设计与智能定价 ----------------
  'F-FX-028': { kind: 'report', actions: ['pricing', 'credit', 'forward'], docType: '风险定价参考测算单', outline: ['定价结论', '客户与业务概况', '定价构成分解', '风险溢价测算', '参考利率区间', '综合贡献与调整', '同业参考', '定价建议与谈判口径', '参数与口径说明'] },
  'F-YX-003': { kind: 'hybrid', actions: ['marketing', 'pricing', 'visit', 'forward'] },
  'F-YX-004': { kind: 'hybrid', uploads: ['项目资料 / 可研', '现有融资合同'], actions: ['credit', 'pricing', 'forward'] },
  'F-YX-005': { kind: 'report', uploads: ['核心企业应收 / 应付清单 (Excel)', '供应链合作协议', '核心企业财报'], actions: ['credit', 'pricing', 'forward'], docType: '供应链金融方案书', outline: ['方案摘要', '核心企业与链条分析', '融资模式设计', '额度测算（总额度与单户）', '风控措施与操作流程', '定价与综合收益', '风险预警清单', '实施计划与分工', '附件与数据来源'] },
  'F-YX-006': { kind: 'report', uploads: ['贸易合同 / 订单', '信用证 / 报关单', '外币收付明细'], actions: ['fx', 'pricing', 'forward'], docType: '跨境金融方案书', outline: ['方案摘要', '跨境场景与敞口分析', '汇率风险评估', '贸易融资方案', '汇率避险方案', '跨境结构建议', '合规预检清单', '定价与收益', '实施安排'] },
  'F-YX-007': { kind: 'bespoke', uploads: ['招标文件 (PDF/Word)', '资格预审文件', '技术规范书', '往期投标书', '资质证书扫描件'], uploadRequired: true, actions: ['forward', 'oa'] },
  'F-YX-008': { kind: 'report', actions: ['credit', 'pricing', 'forward'], docType: '授信综合定价测算单', outline: ['定价结论', '客户综合贡献', '成本构成瀑布', 'RAROC 与门槛比较', '综合贡献敏感性', '同业公开报价参考', '差异化定价建议', '谈判口径', '参数说明'] },
  'F-YX-009': { kind: 'report', uploads: ['企业融资需求说明', '财务报表'], actions: ['finance', 'pricing', 'forward'], docType: '投行产品建议书', outline: ['建议摘要', '客户需求与目标', '交易结构设计', '产品组合明细', '定价与 RAROC', '风险收益评估', '审批路径与时间表', '合规与信息披露', '附件'] },
  'F-YX-010': { kind: 'report', uploads: ['基础资产清单 (Excel)', '历史回款数据', '合同样本'], actions: ['finance', 'forward'], docType: '资产证券化可行性建议书', outline: ['可行性结论', '基础资产池预筛', '交易结构设计', '分层与现金流测算', '增信方案对比', '定价与成本', '实施条件与时间表', '风险提示', '附件'] },
  'F-YX-011': { kind: 'report', uploads: ['基金设立方案', '出资意向'], actions: ['finance', 'invest', 'forward'], docType: '产业基金架构建议书', outline: ['建议摘要', '基金架构图', '出资与分层安排', '投资策略与标的', '收益分配测算', '风控方案', '银行配套服务', '实施步骤', '附件'] },
  'F-YX-012': { kind: 'report', uploads: ['商业计划书', '股权结构', '财务预测'], actions: ['finance', 'invest', 'forward'], docType: '股权投资顾问报告', outline: ['投资结论', '标的筛选与评分', '估值区间', '投贷联动方案', '退出方案与时间表', '风险预警清单', '推介材料要点', '附件'] },
  'F-YX-013': { kind: 'report', uploads: ['资金计划', '持仓明细 (Excel)'], actions: ['combo', 'forward'], docType: '资金配置方案与组合绩效报告', outline: ['配置结论', '资金结构与流动性需求', '配置比例与产品明细', '到期分布与流动性安排', '预期收益区间', '风险指标', '收益归因', '再平衡建议', '适当性说明'] },
  'F-YX-014': { kind: 'report', uploads: ['行业调研材料', '客户需求清单'], actions: ['marketing', 'combo', 'forward'], docType: '行业解决方案书', outline: ['方案摘要', '行业痛点诊断', '方案模块总览', '产品与服务明细', '最佳实践案例', '分阶段实施路径', '预期效益', '资源与分工', '附件'] },

  // ---------------- P06 授信智能工作台 ----------------
  'F-FX-003': { kind: 'analysis', uploads: [...FIN, '征信授权书', '征信报告'], uploadRequired: true, actions: ['credit', 'dd', 'alert'] },
  'F-FX-004': { kind: 'bespoke', uploads: FIN, actions: ['pricing', 'contract', 'forward'] },
  'F-FX-005': { kind: 'bespoke', uploads: ['尽调材料清单', '访谈纪要', '现场照片'], actions: ['credit', 'minutes', 'forward'] },
  'F-FX-006': { kind: 'action', uploads: ['授信调查报告', '财务报表', '担保材料'], uploadRequired: true, actions: ['credit', 'contract', 'forward'], flow: ['导入授信报告', '要点核对', '风险点标注', '生成审查意见', '附加条件建议', '提交审查会'], board: ['待审查', '审查中', '待补充', '已出具意见'] },
  'F-FX-021': { kind: 'analysis', uploads: ['评估报告', '权证 / 抵押登记', '押品照片'], uploadRequired: true, actions: ['credit', 'alert', 'forward'] },
  'F-FX-027': { kind: 'action', actions: ['credit', 'contract', 'forward'], flow: ['识别风险敞口', '生成缓释组合', '覆盖率与契约阈值', '方案比较', '定稿并写入授信方案'], board: ['待设计', '方案比较', '已推荐', '已写入方案'] },
  'F-ZY-015': { kind: 'action', actions: ['contract', 'report', 'forward'], flow: ['输入检索问题', '法规命中与效力', '条款要点', '实务应用', '引用到报告'], board: ['检索', '命中', '已引用'] },
  'F-ZY-016': { kind: 'action', uploads: ['合同文本 (Word/PDF)', '审批条件 / 批复'], uploadRequired: true, actions: ['credit', 'forward', 'oa'], flow: ['上传合同', '条款识别与对照', '风险标注', '修改建议', '与审批条件一致性核对', '出具审核报告'], board: ['待审核', '审核中', '待修订', '已通过'] },
  'F-ZY-017': { kind: 'analysis', actions: ['alert', 'contract', 'forward'] },
  'F-ZY-018': { kind: 'hybrid', uploads: ['争议相关合同', '往来函件', '证据材料'], actions: ['contract', 'forward', 'plan'] },
  'F-ZY-019': { kind: 'analysis', actions: ['contract', 'report'] },

  // ---------------- P07 贷后风险哨兵 ----------------
  'F-FX-001': { kind: 'bespoke', actions: ['risk', 'followup', 'forward'] },
  'F-FX-002': { kind: 'hybrid', actions: ['alert', 'followup', 'risk'] },
  'F-FX-007': { kind: 'action', actions: ['alert', 'risk', 'visit', 'oa'], flow: ['监控看板', '生成检查计划', '派发检查任务', '现场检查回填', '风险趋势复盘'], board: ['待检查', '检查中', '待复核', '已完成', '已升级'] },
  'F-FX-008': { kind: 'hybrid', actions: ['risk', 'contract', 'forward'] },
  'F-FX-013': { kind: 'analysis', uploads: ['股权结构材料', '关联交易披露'], actions: ['group', 'alert', 'credit'] },
  'F-FX-014': { kind: 'analysis', actions: ['alert', 'risk', 'forward'] },
  'F-FX-015': { kind: 'report', actions: ['alert', 'followup', 'forward'], docType: '舆情研判报告', outline: ['研判结论', '事件时间线', '舆情来源与情绪分布', '事实核实与客户回应', '对本行敞口的影响', '传导与关联风险', '应对建议与口径', '监测计划'] },
  'F-FX-020': { kind: 'analysis', actions: ['credit', 'risk', 'forward'] },
  'F-FX-023': { kind: 'analysis', actions: ['group', 'alert', 'credit'] },
  'F-FX-024': { kind: 'report', uploads: ['境外主体资料', '贸易合同', '外币收付明细'], actions: ['fx', 'alert', 'forward'], docType: '跨境业务风险评估报告', outline: ['评估结论', '业务与国别分布', '国别与主权风险', '汇率敏感性', '交易对手与结算风险', '合规与制裁筛查', '缓释措施', '监测计划'] },
  'F-FX-025': { kind: 'report', uploads: ['创新业务方案', '产品说明书'], actions: ['credit', 'forward'], docType: '创新业务风险评估报告', outline: ['评估结论', '业务模式与流程', '风险识别清单', '量化指标表', '情景测试', '风控方案建议', '准入条件', '附件'] },
  'F-FX-026': { kind: 'analysis', actions: ['alert', 'forward'] },
  'F-KH-030': { kind: 'action', actions: ['alert', 'group', 'risk', 'oa'], flow: ['汇聚集团预警信号', '传导路径与敞口', '影响等级判定', '分发至管户经理', '处置跟踪'], board: ['新预警', '已分发', '处置中', '已闭环'] },

  // ---------------- P08 集团客户作战室 ----------------
  'F-KH-021': { kind: 'bespoke', actions: ['group', 'scf', 'forward'] },
  'F-KH-022': { kind: 'analysis', actions: ['scf', 'marketing', 'forward'] },
  'F-KH-023': { kind: 'report', actions: ['visit', 'forward', 'plan'], docType: '集团联动方案书', outline: ['方案摘要', '集团概况与本行合作现状', '联动路径图', '机构分工与责任', '产品与额度安排', '时间表与里程碑', '协同效益预测', '资源整合建议', '风险与合规'] },
  'F-KH-024': { kind: 'report', uploads: ['境外主体资料', '跨境资金安排'], actions: ['fx', 'forward'], docType: '跨境业务协同方案书', outline: ['方案摘要', '跨境业务机会清单', '境内外分工', '资金配置架构', '产品与定价', '风险预警与合规清单', '实施安排'] },
  'F-KH-025': { kind: 'report', actions: ['scf', 'marketing', 'forward'], docType: '全产业链服务方案书', outline: ['方案摘要', '产业链图与本行覆盖', '各环节金融方案', '准入机制', '服务价值评估', '实施路径', '风险提示'] },
  'F-KH-026': { kind: 'action', actions: ['plan', 'oa', 'forward'], flow: ['项目立项', '里程碑规划', '阻塞点识别', '资源调配', '周复盘'], board: ['规划中', '推进中', '受阻', '待决策', '已落地'] },
  'F-KH-027': { kind: 'hybrid', actions: ['sparring', 'negotiation', 'forward'] },

  // ---------------- P09 智能陪练底座（专属子应用） ----------------
  'F-KH-028': { kind: 'bespoke', actions: [] }, 'F-SY-007': { kind: 'bespoke', actions: [] }, 'F-SY-008': { kind: 'bespoke', actions: [] }, 'F-SY-009': { kind: 'bespoke', actions: [] }, 'F-SY-010': { kind: 'bespoke', actions: [] }, 'F-SY-011': { kind: 'bespoke', actions: [] }, 'F-SY-012': { kind: 'bespoke', actions: [] }, 'F-SY-013': { kind: 'bespoke', actions: [] }, 'F-SY-014': { kind: 'bespoke', actions: [] }, 'F-YX-019': { kind: 'bespoke', actions: [] },

  // ---------------- P10 沟通与话术助手 ----------------
  'F-KH-029': { kind: 'analysis', actions: ['sparring', 'visit', 'oa'] },
  'F-SY-015': { kind: 'hybrid', actions: ['sparring', 'visit', 'oa'] },
  'F-SY-016': { kind: 'analysis', uploads: ['方案陈述稿 (Word/PPT)', '录音文件'], uploadRequired: true, actions: ['sparring', 'report'] },
  'F-SY-017': { kind: 'action', actions: ['oa', 'forward'], flow: ['生成专业名片', '编辑与确认', '会谈着装卡', '导出 / 分享'], board: ['名片草稿', '已确认', '已分享'] },
  'F-YX-015': { kind: 'hybrid', actions: ['sparring', 'visit', 'oa'] },
  'F-YX-016': { kind: 'hybrid', actions: ['sparring', 'visit'] },
  'F-YX-017': { kind: 'analysis', actions: ['sparring', 'pricing', 'visit'] },
  'F-YX-018': { kind: 'report', uploads: ['活动执行数据 (Excel)', '客户反馈记录'], actions: ['marketing', 'forward'], docType: '营销效果复盘报告', outline: ['复盘结论', '活动概况', '漏斗与转化', '客户反应分布', '收益与 ROI', '成功率预测', '问题与改进', '下一步计划'] },

  // ---------------- P11 合规与政策中枢 ----------------
  'F-FX-009': { kind: 'action', uploads: ['业务单据影像', '申请表', '授权文件'], uploadRequired: true, actions: ['oa', 'forward'], flow: ['选择业务节点', '上传单据', '合规检查', '纠错清单', '操作引导', '检查通过'], board: ['待检查', '未通过', '待补', '通过'] },
  'F-FX-010': { kind: 'action', actions: ['oa', 'forward'], flow: ['待办识别', '知识提示', '资料清单', '反馈时限', '完成反馈'], board: ['待处理', '资料收集', '待反馈', '已完成'] },
  'F-FX-011': { kind: 'analysis', uploads: ['账户交易明细 (Excel)'], actions: ['alert', 'forward'] },
  'F-FX-012': { kind: 'action', actions: ['oa'], flow: ['知识推送', '带依据问答', '情景测试', '案例解析', '学习记录'], board: ['本周推送', '待测试', '已完成'] },
  'F-ZY-001': { kind: 'action', actions: ['contract', 'oa'], flow: ['提问', '制度命中', '要素卡', '疑难转办'], board: ['已解答', '待转办', '已转办'] },
  'F-ZY-002': { kind: 'action', actions: ['credit', 'oa', 'plan'], flow: ['选择业务类型', '流程进度', '当前步骤操作', '材料与时限预警', '并行事项'], board: ['未开始', '进行中', '待材料', '已完成'] },
  'F-ZY-003': { kind: 'hybrid', uploads: ['政策法规原文 (PDF/Word)'], actions: ['alert', 'forward', 'oa'] },
  'F-ZY-004': { kind: 'analysis', uploads: ['业务场景说明'], actions: ['credit', 'report'] },

  // ---------------- P12 智能办公协作 ----------------
  'F-SY-001': { kind: 'action', uploads: ['文档草稿 (Word/PDF/PPT)', '参考模板', '数据表 (Excel)'], actions: ['forward', 'oa'], flow: ['上传或新建', 'AI 起草', '四类校对', '结构优化', '导出 / 转呈'], board: ['草稿', '校对中', '待定稿', '已定稿'] },
  'F-SY-002': { kind: 'action', uploads: ['会谈录音', '手写纪要照片', '会议 PPT'], actions: ['followup', 'plan', 'crm'], flow: ['导入录音 / 纪要', '结构化提取', '行动项确认', '到期提醒', '同步 CRM'], board: ['待整理', '待确认', '行动项跟踪', '已闭环'] },
  'F-SY-003': { kind: 'analysis', uploads: ['经营数据 (Excel/CSV)', '报表截图'], uploadRequired: true, actions: ['followup', 'forward', 'report'] },
  'F-SY-004': { kind: 'action', actions: ['visit', 'followup', 'oa'], flow: ['本周目标', '任务分解', '优先级与提醒', '日程执行', '效率周报'], board: ['P1 紧急', 'P2 重要', 'P3 常规', '已完成'] },
  'F-SY-005': { kind: 'action', actions: ['plan', 'forward', 'oa'], flow: ['项目立项', '里程碑与甘特', '关键路径', '延期预警', '资源增援', '复盘'], board: ['准备', '推进中', '受阻', '验收', '完成'] },
  'F-SY-006': { kind: 'action', actions: ['plan', 'oa'], flow: ['任务分配', '负载查看', '卡点处理', '周表现'], board: ['待办', '进行中', '卡点', '完成'] },

  // ---------------- P13 增值方案工坊 ----------------
  'F-SY-021': { kind: 'report', uploads: ['客户现有流程说明', '访谈纪要'], actions: ['visit', 'combo', 'forward'], docType: '流程优化建议书', outline: ['建议摘要', '现状流程图', '痛点清单', '目标流程设计', '收益预测', '实施路线图', '本行产品配套', '附件'] },
  'F-SY-022': { kind: 'report', uploads: ['企业介绍', '经营数据'], actions: ['visit', 'finance', 'forward'], docType: '业务模式创新方案', outline: ['方案摘要', '现有模式画布', '创新机会清单', '方案对比', '可行性与风险', '实施路线', '金融配套', '附件'] },
  'F-SY-023': { kind: 'report', uploads: ['竞品资料', '客户产品资料'], actions: ['visit', 'forward'], docType: '竞品分析与创新建议书', outline: ['建议摘要', '竞品对比矩阵', '竞品优势解读', '差异化策略', '创新点', '改进清单', '金融配套', '引用来源'] },
  'F-SY-024': { kind: 'report', uploads: ['信息化现状调研', 'IT 预算 / 规划'], actions: ['visit', 'finance', 'forward'], docType: '数字化转型建议书', outline: ['建议摘要', '成熟度雷达', '需求清单', '转型路径图', '实施计划', '风险预警', '效果预测', '行内数字化产品配套'] },
  'F-SY-025': { kind: 'report', uploads: ['场景需求说明'], actions: ['forward', 'oa'], docType: '场景金融产品创新提案', outline: ['提案摘要', '需求分析', '产品要素', '组合结构', '风控要点', '业务流程', '效果预测', '合规初筛'] },
  'F-YX-020': { kind: 'report', uploads: ['企业战略材料', '年报'], actions: ['visit', 'finance', 'forward'], docType: '企业战略咨询建议书', outline: ['建议摘要', '战略诊断', '战略规划与发展建议', '实施方案与里程碑', '风险与应对', '银行配套金融服务', '附件'] },
  'F-YX-021': { kind: 'report', uploads: ['商业计划书', '经营数据'], actions: ['visit', 'finance', 'forward'], docType: '商业模式优化建议书', outline: ['建议摘要', '画布诊断', '优化建议', '创新方向', '转型路径与里程碑', '银行配套服务', '附件'] },
  'F-ZY-030': { kind: 'report', uploads: ['流程现状说明', '访谈纪要'], actions: ['visit', 'combo', 'forward'], docType: '业务流程再造建议书', outline: ['建议摘要', '流程现状图', '瓶颈分析', '再造方案', '效果测算', '资源配置建议', '配套金融方案'] },

  // ---------------- P14 能力画像与成长 ----------------
  'F-SY-018': { kind: 'bespoke', actions: ['sparring', 'plan'] },
  'F-SY-019': { kind: 'analysis', actions: ['plan', 'forward'] },
};

export const specOf = (fid: string): FnSpec => FNSPEC[fid] ?? { kind: 'analysis', actions: ['followup', 'forward'] };
