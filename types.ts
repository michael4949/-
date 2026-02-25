// ===== 全网情报挖掘及分析系统 - 类型定义 =====

// 情报来源
export interface IntelSource {
  title: string;
  uri: string;
  credibility: 'high' | 'medium' | 'low';
  type: string; // 新闻、论坛、社交媒体、官方报告等
}

// 威胁/风险条目
export interface ThreatItem {
  name: string;
  level: 'critical' | 'high' | 'medium' | 'low';
  score: number; // 0-100
  category: string;
  description: string;
}

// 趋势数据点
export interface TrendDataPoint {
  date: string;
  热度: number;
  正面: number;
  负面: number;
}

// 关键实体
export interface EntityInfo {
  name: string;
  type: 'person' | 'organization' | 'location' | 'event' | 'technology' | 'policy';
  relevance: number; // 0-100
  description: string;
  connections: string[]; // 关联实体名称
}

// 情感分析数据
export interface SentimentData {
  category: string;
  positive: number;
  neutral: number;
  negative: number;
}

// 事件时间线
export interface TimelineEvent {
  date: string;
  title: string;
  description: string;
  importance: 'critical' | 'high' | 'medium' | 'low';
  source: string;
}

// 威胁雷达维度
export interface RadarDimension {
  dimension: string;
  score: number; // 0-100
  description: string;
}

// 核心发现
export interface KeyFinding {
  title: string;
  content: string;
  category: 'threat' | 'opportunity' | 'trend' | 'insight';
  priority: 'critical' | 'high' | 'medium' | 'low';
}

// 行动建议
export interface ActionRecommendation {
  title: string;
  description: string;
  urgency: 'immediate' | 'short_term' | 'medium_term' | 'long_term';
  category: string;
}

// 完整情报报告
export interface IntelligenceReport {
  topic: string;
  reportTitle: string;
  executiveSummary: string;
  generatedAt: string;
  overviewStats: {
    totalSources: number;
    threatLevel: string;
    sentimentScore: number; // -100 到 100
    keyEntities: number;
    timeSpan: string;
  };
  radarAnalysis: {
    title: string;
    description: string;
    dimensions: RadarDimension[];
  };
  threats: ThreatItem[];
  trendData: TrendDataPoint[];
  entities: EntityInfo[];
  sentimentBreakdown: SentimentData[];
  timeline: TimelineEvent[];
  keyFindings: KeyFinding[];
  recommendations: ActionRecommendation[];
  conclusion: string;
}

// 情报响应（包含来源）
export interface IntelligenceResponse {
  report: IntelligenceReport;
  sources: IntelSource[];
}

// 细化问题
export interface RefinementOption {
  label: string;
  value: string;
}

export interface RefinementQuestion {
  id: string;
  question: string;
  allowMultiple: boolean;
  options: RefinementOption[];
}

export interface RefinementResponse {
  questions: RefinementQuestion[];
}
