// 城市划分（虚构滨海新区 + 8 区 + 4 县）
export const CITY_NAME = "滨海市";
export const CITY_AKA = "Binhai";

export const DISTRICTS = [
  { code: "BHK", name: "滨海开发区", level: "开发区", lat: 31.18, lng: 121.49, weight: 1.6 },
  { code: "JHQ", name: "金海区", level: "区", lat: 31.23, lng: 121.47, weight: 1.4 },
  { code: "CYQ", name: "潮阳区", level: "区", lat: 31.27, lng: 121.42, weight: 1.2 },
  { code: "XHQ", name: "西湖区", level: "区", lat: 31.20, lng: 121.38, weight: 1.0 },
  { code: "GXQ", name: "高新区", level: "区", lat: 31.32, lng: 121.50, weight: 1.5 },
  { code: "ZGQ", name: "中工区", level: "区", lat: 31.15, lng: 121.45, weight: 0.9 },
  { code: "LYQ", name: "临沂区", level: "区", lat: 31.10, lng: 121.55, weight: 0.7 },
  { code: "HQQ", name: "华侨区", level: "区", lat: 31.28, lng: 121.30, weight: 0.8 },
  { code: "DYX", name: "东屿县", level: "县", lat: 31.40, lng: 121.60, weight: 0.5 },
  { code: "BSX", name: "白沙县", level: "县", lat: 31.05, lng: 121.25, weight: 0.4 },
  { code: "QFX", name: "青枫县", level: "县", lat: 31.45, lng: 121.20, weight: 0.4 },
  { code: "NSX", name: "南山县", level: "县", lat: 31.00, lng: 121.65, weight: 0.3 },
] as const;

export const INDUSTRIES = [
  { code: "MFG", name: "智能制造", color: "#3b82f6", iconKey: "factory" },
  { code: "BIZ", name: "商贸零售", color: "#22d3ee", iconKey: "store" },
  { code: "MED", name: "医疗健康", color: "#10b981", iconKey: "heart" },
  { code: "EDU", name: "教育科研", color: "#f59e0b", iconKey: "graduation" },
  { code: "FIN", name: "金融服务", color: "#a855f7", iconKey: "coin" },
  { code: "CUL", name: "文化创意", color: "#ec4899", iconKey: "palette" },
  { code: "AGR", name: "现代农业", color: "#84cc16", iconKey: "leaf" },
  { code: "LOG", name: "现代物流", color: "#6366f1", iconKey: "truck" },
] as const;

export const ENTERPRISE_SCALES = [
  { code: "MICRO", name: "微型", weight: 0.35, employees: [1, 20], maxToken: 5_000_000 },
  { code: "SMALL", name: "小型", weight: 0.4, employees: [20, 100], maxToken: 50_000_000 },
  { code: "MED", name: "中型", weight: 0.18, employees: [100, 1000], maxToken: 500_000_000 },
  { code: "LARGE", name: "大型", weight: 0.07, employees: [1000, 10000], maxToken: 5_000_000_000 },
] as const;

// 大模型注册表（真实命名 + 虚构 SKU 字段）
export const MODELS = [
  { code: "ds-r1", name: "DeepSeek-R1", vendor: "深度求索", type: "推理", priceIn: 4, priceOut: 16, ctx: 64000, isDomestic: true },
  { code: "ds-v3", name: "DeepSeek-V3", vendor: "深度求索", type: "通用", priceIn: 2, priceOut: 8, ctx: 128000, isDomestic: true },
  { code: "qwen-max", name: "Qwen-Max", vendor: "阿里通义", type: "通用", priceIn: 20, priceOut: 60, ctx: 32000, isDomestic: true },
  { code: "qwen-plus", name: "Qwen-Plus", vendor: "阿里通义", type: "通用", priceIn: 4, priceOut: 12, ctx: 128000, isDomestic: true },
  { code: "glm-4-plus", name: "GLM-4-Plus", vendor: "智谱AI", type: "通用", priceIn: 50, priceOut: 50, ctx: 128000, isDomestic: true },
  { code: "doubao-pro", name: "豆包-Pro-256k", vendor: "字节跳动", type: "长文本", priceIn: 5, priceOut: 9, ctx: 256000, isDomestic: true },
  { code: "moonshot-128k", name: "Moonshot-V1-128k", vendor: "月之暗面", type: "长文本", priceIn: 60, priceOut: 60, ctx: 128000, isDomestic: true },
  { code: "ernie-4-turbo", name: "文心-4.0-Turbo", vendor: "百度", type: "通用", priceIn: 30, priceOut: 60, ctx: 8000, isDomestic: true },
  { code: "spark-4", name: "讯飞星火-4.0", vendor: "科大讯飞", type: "通用", priceIn: 28, priceOut: 28, ctx: 8000, isDomestic: true },
  { code: "minimax-abab6.5", name: "abab6.5s", vendor: "MiniMax", type: "通用", priceIn: 10, priceOut: 10, ctx: 245000, isDomestic: true },
  { code: "baichuan-4", name: "Baichuan-4", vendor: "百川智能", type: "通用", priceIn: 100, priceOut: 100, ctx: 32000, isDomestic: true },
  { code: "sensechat-5", name: "SenseChat-5", vendor: "商汤", type: "通用", priceIn: 40, priceOut: 100, ctx: 128000, isDomestic: true },
  { code: "yi-large", name: "Yi-Large", vendor: "零一万物", type: "通用", priceIn: 20, priceOut: 20, ctx: 32000, isDomestic: true },
  { code: "step-2", name: "Step-2", vendor: "阶跃星辰", type: "通用", priceIn: 38, priceOut: 120, ctx: 16000, isDomestic: true },
] as const;
// 单位：元 / 百万 Token

// 算力中心类型
export const COMPUTE_CENTER_TYPES = [
  { code: "INTEL", name: "智算中心", color: "#22d3ee" },
  { code: "SUPER", name: "超算中心", color: "#a855f7" },
  { code: "GENER", name: "通算中心", color: "#10b981" },
] as const;

// 芯片型号
export const CHIPS = [
  { code: "h100", name: "NVIDIA H100", vendor: "NVIDIA", type: "GPU", peakTflops: 67, isDomestic: false, premium: 2.5 },
  { code: "h800", name: "NVIDIA H800", vendor: "NVIDIA", type: "GPU", peakTflops: 60, isDomestic: false, premium: 2.0 },
  { code: "a100", name: "NVIDIA A100", vendor: "NVIDIA", type: "GPU", peakTflops: 19.5, isDomestic: false, premium: 1.5 },
  { code: "h20", name: "NVIDIA H20", vendor: "NVIDIA", type: "GPU", peakTflops: 44, isDomestic: false, premium: 1.7 },
  { code: "910b", name: "昇腾 910B", vendor: "华为", type: "NPU", peakTflops: 32, isDomestic: true, premium: 1.4 },
  { code: "910c", name: "昇腾 910C", vendor: "华为", type: "NPU", peakTflops: 40, isDomestic: true, premium: 1.6 },
  { code: "mlu590", name: "思元 590", vendor: "寒武纪", type: "AI芯片", peakTflops: 25, isDomestic: true, premium: 1.3 },
  { code: "dcu-z100", name: "海光 DCU Z100", vendor: "海光", type: "GPU", peakTflops: 22, isDomestic: true, premium: 1.2 },
] as const;

// 券类型
export const VOUCHER_TYPES = [
  { code: "TOKEN", name: "Token 券", desc: "用于抵扣大模型 Token 调用费用", unit: "Token" },
  { code: "COMPUTE", name: "算力券", desc: "用于抵扣 GPU 算力租用费用", unit: "卡时" },
  { code: "MODEL", name: "模型券", desc: "用于抵扣模型 API 调用与微调费用", unit: "次/小时" },
  { code: "DATA", name: "数据券", desc: "用于抵扣公共数据集与数据服务费用", unit: "次" },
  { code: "CORPUS", name: "语料券", desc: "用于抵扣行业语料库使用费用", unit: "GB" },
] as const;

// 政策标签
export const POLICY_TAGS = [
  "中小企业",
  "重点产业链",
  "硬科技",
  "首发首试",
  "国产化替代",
  "创新应用",
  "高新企业",
  "专精特新",
] as const;

// 应用场景
export const APP_SCENARIOS = [
  { code: "kefu", name: "智能客服", industries: ["BIZ", "FIN", "LOG"], color: "#3b82f6", icon: "headset", baseMaturity: "mature", desc: "替代/辅助人工客服，7×24 自动答疑" },
  { code: "qa", name: "知识问答", industries: ["EDU", "MED", "FIN"], color: "#22d3ee", icon: "book", baseMaturity: "scaling", desc: "企业知识库精确问答 + RAG 引用" },
  { code: "doc", name: "文档智能", industries: ["FIN", "EDU", "MED", "LOG"], color: "#06b6d4", icon: "fileText", baseMaturity: "mature", desc: "合同/报告/票据自动抽取与生成" },
  { code: "qc", name: "工业质检", industries: ["MFG"], color: "#a855f7", icon: "scan", baseMaturity: "scaling", desc: "视觉缺陷识别，替代人眼质检" },
  { code: "design", name: "辅助设计", industries: ["MFG", "CUL"], color: "#ec4899", icon: "wand", baseMaturity: "pilot", desc: "工业/平面/3D 概念设计辅助" },
  { code: "mkt", name: "营销文案", industries: ["BIZ", "CUL"], color: "#f59e0b", icon: "megaphone", baseMaturity: "mature", desc: "电商/广告文案与图文素材生成" },
  { code: "code", name: "智能编程", industries: ["MFG", "FIN", "EDU"], color: "#10b981", icon: "code", baseMaturity: "scaling", desc: "IDE 辅助、代码补全与生成" },
  { code: "med-img", name: "医学影像", industries: ["MED"], color: "#f43f5e", icon: "scan", baseMaturity: "pilot", desc: "CT/MRI/X 光辅助诊断" },
  { code: "edu-tutor", name: "AI 助教", industries: ["EDU"], color: "#8b5cf6", icon: "graduation", baseMaturity: "scaling", desc: "K12/高校个性化辅导与作业批改" },
  { code: "agri", name: "智慧农情", industries: ["AGR"], color: "#84cc16", icon: "leaf", baseMaturity: "pilot", desc: "卫星 + 大模型作物长势监测" },
  { code: "logi", name: "智能调度", industries: ["LOG"], color: "#6366f1", icon: "truck", baseMaturity: "scaling", desc: "运力/路径/库存协同优化" },
  { code: "risk", name: "风控反欺诈", industries: ["FIN"], color: "#dc2626", icon: "shield", baseMaturity: "scaling", desc: "信贷反欺诈、洗钱识别、信用评分" },
  { code: "meeting", name: "智能会议纪要", industries: ["BIZ", "FIN", "EDU", "MFG"], color: "#0891b2", icon: "mic", baseMaturity: "scaling", desc: "会议实时转录、纪要、待办抽取" },
  { code: "rpa", name: "数字员工", industries: ["BIZ", "FIN", "LOG"], color: "#7c3aed", icon: "bot", baseMaturity: "pilot", desc: "RPA + LLM 处理重复性流程" },
  { code: "legal", name: "法律文书", industries: ["FIN", "BIZ"], color: "#475569", icon: "scale", baseMaturity: "pilot", desc: "合同审查、法务问答、起诉状起草" },
  { code: "hr", name: "智能招聘", industries: ["BIZ", "FIN", "MFG", "EDU"], color: "#f97316", icon: "users", baseMaturity: "emerging", desc: "简历筛选、AI 面试、人才画像" },
] as const;

// 场景成熟度
export const MATURITY_LEVELS = [
  { code: "mature", name: "成熟", color: "#10b981", desc: "已大规模应用，效益稳定" },
  { code: "scaling", name: "规模化", color: "#3b82f6", desc: "正在快速推广，效益显著" },
  { code: "pilot", name: "试点", color: "#f59e0b", desc: "试点验证中，少量落地" },
  { code: "emerging", name: "新兴", color: "#a855f7", desc: "前沿探索，待观察" },
] as const;

// 企业名称生成片段
export const ENT_PREFIXES = [
  "滨海", "金海", "潮阳", "高新", "华侨", "东屿", "白沙", "青枫", "南山",
  "智云", "数链", "星河", "未来", "蓝海", "海创", "锐新", "九州", "中科",
  "鼎信", "卓越", "盛世", "万维", "百川", "千帆", "极光", "瀚海", "巨擘",
  "晨曦", "瑞祥", "鸿盛", "凯歌", "天工", "云栖", "翊阳", "腾辉", "睿智",
];

export const ENT_CORES = {
  MFG: ["精密", "智造", "机电", "装备", "工业", "自动化", "重工", "材料"],
  BIZ: ["商贸", "零售", "连锁", "供应链", "电商", "新消费", "好物", "鲜达"],
  MED: ["医疗", "健康", "生物", "医药", "康健", "诊断", "影像", "基因"],
  EDU: ["教育", "学堂", "学馆", "学术", "教研", "智学", "未来学院", "知识"],
  FIN: ["金融", "财富", "金控", "投资", "信用", "信贷", "保险", "支付"],
  CUL: ["文化", "传媒", "动漫", "影视", "设计", "创意", "数艺", "出版"],
  AGR: ["农业", "种业", "牧业", "渔业", "农科", "农场", "鲜农", "丰收"],
  LOG: ["物流", "供应链", "速运", "仓储", "冷链", "智运", "捷达", "通达"],
};

export const ENT_SUFFIXES = ["有限公司", "股份有限公司", "科技有限公司", "集团有限公司", "（中国）有限公司"];

// 大模型应用类型
export const MODEL_USE_CASES = ["对话", "文档", "Embedding", "代码", "图像理解", "Agent", "微调", "RAG"];
