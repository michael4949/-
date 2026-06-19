// §7.1 工单类型
export type Priority = 'urgent' | 'important' | 'normal';
export type WorkOrderStatus = 'pending' | 'scheduled' | 'in-progress' | 'completed' | 'closed';

export interface WorkOrder {
  id: string;
  productCode: string;
  productName: string;
  productCategory: 'enameled' | 'tinned' | 'stranded' | 'bare' | 'wire';
  quantity: number;
  dueDate: Date;
  customer: string;
  priority: Priority;
  status: WorkOrderStatus;
  routeId: 'P1' | 'P2' | 'P3' | 'P4' | 'P5';
  // 排产信息（仅 status 为 scheduled/in-progress/completed 时有）
  scheduledStart?: Date;
  scheduledEnd?: Date;
  scheduledResourceId?: string;
  // 视觉
  colorCode: string;        // 工单色块颜色（按产品类别）
}

export const PRIORITY_LABEL: Record<Priority, string> = {
  urgent: '紧急',
  important: '重要',
  normal: '普通',
};
export const STATUS_LABEL: Record<WorkOrderStatus, string> = {
  pending: '待排',
  scheduled: '已排',
  'in-progress': '在制',
  completed: '完工',
  closed: '关闭',
};
