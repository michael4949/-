import type { ComponentType } from 'react';
import PostLoan from '../scenes/PostLoan';
import FinDiagnosis from '../scenes/FinDiagnosis';
import CreditReport from '../scenes/CreditReport';
import GroupWarRoom from '../scenes/GroupWarRoom';
import Profile from '../scenes/Profile';
import TargetScreening from './p01/TargetScreening';
import VisitPlan from './p01/VisitPlan';
import DealProbability from './p01/DealProbability';
import MarketingPlan from './p01/MarketingPlan';
import HighEndDevelopment from './p01/HighEndDevelopment';
import ResourceMatching from './p01/ResourceMatching';
import ScenarioMarketing from './p01/ScenarioMarketing';

/** 功能 id → 专属工作页。未登记的功能走通用功能工作页。 */
export const REGISTRY: Record<string, ComponentType> = {
  'F-FX-001': PostLoan,       // 风险信号早期预警
  'F-FX-007': PostLoan,       // 贷后监控与检查任务中心
  'F-KH-001': TargetScreening, // 目标客户筛选与客群定位
  'F-KH-002': VisitPlan,       // 拜访计划与准备包
  'F-KH-003': DealProbability, // 商机成交概率预测
  'F-KH-004': MarketingPlan,   // 精准营销方案与效果预测
  'F-KH-005': HighEndDevelopment, // 高端客户开发策略
  'F-KH-006': ResourceMatching,   // 客户资源整合与撮合
  'F-YX-002': ScenarioMarketing,  // 场景化营销方案
  'F-ZY-005': FinDiagnosis,   // 财报解读与深度分析
  'F-FX-005': CreditReport,   // 尽职调查工作台
  'F-FX-004': CreditReport,   // 授信方案与额度测算
  'F-KH-021': GroupWarRoom,   // 集团关系图谱
  'F-SY-018': Profile,        // 领导力画像与提升路径（能力画像）
};
