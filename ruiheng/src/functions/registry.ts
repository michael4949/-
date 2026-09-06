import type { ComponentType } from 'react';
import PostLoan from '../scenes/PostLoan';
import VisitPrep from '../scenes/VisitPrep';
import FinDiagnosis from '../scenes/FinDiagnosis';
import CreditReport from '../scenes/CreditReport';
import GroupWarRoom from '../scenes/GroupWarRoom';
import Profile from '../scenes/Profile';

/** 功能 id → 专属工作页。未登记的功能走通用功能工作页。 */
export const REGISTRY: Record<string, ComponentType> = {
  'F-FX-001': PostLoan,       // 风险信号早期预警
  'F-FX-007': PostLoan,       // 贷后监控与检查任务中心
  'F-KH-002': VisitPrep,      // 拜访计划与准备包（待专属页替换）
  'F-ZY-005': FinDiagnosis,   // 财报解读与深度分析
  'F-FX-005': CreditReport,   // 尽职调查工作台
  'F-FX-004': CreditReport,   // 授信方案与额度测算
  'F-KH-021': GroupWarRoom,   // 集团关系图谱
  'F-SY-018': Profile,        // 领导力画像与提升路径（能力画像）
};
