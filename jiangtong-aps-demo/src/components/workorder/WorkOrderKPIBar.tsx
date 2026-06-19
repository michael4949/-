// 工单管理页顶部 KPI 条
import {
  WORK_ORDERS, PENDING_WOS, IN_PROGRESS_WOS,
} from '../../mock/workOrders';
import { ANOMALY_STATS } from '../../mock/workOrderAnomalies';

interface Item { label: string; value: string | number; tone: 'ink' | 'brand' | 'danger' | 'warn' | 'info' }

export default function WorkOrderKPIBar() {
  const urgent = WORK_ORDERS.filter((w) => w.priority === 'urgent' && (w.status === 'pending' || w.status === 'scheduled' || w.status === 'in-progress')).length;
  const items: Item[] = [
    { label: '总工单',  value: WORK_ORDERS.length, tone: 'ink' },
    { label: '待排',   value: PENDING_WOS.length, tone: 'brand' },
    { label: '在制',   value: IN_PROGRESS_WOS.length, tone: 'info' },
    { label: '紧急',   value: urgent, tone: 'danger' },
    { label: '异常',   value: ANOMALY_STATS.total, tone: 'warn' },
  ];
  const toneCls: Record<Item['tone'], string> = {
    ink: 'text-ink',
    brand: 'text-brand',
    danger: 'text-danger',
    warn: 'text-warn',
    info: 'text-info',
  };
  return (
    <div className="card-base p-3 grid grid-cols-2 md:grid-cols-5 gap-3">
      {items.map((it) => (
        <div key={it.label} className="flex items-baseline gap-2">
          <span className="text-[11.5px] text-ink-faint">{it.label}</span>
          <span className={`ml-auto text-[18px] font-bold tabular-nums ${toneCls[it.tone]}`}>{it.value}</span>
        </div>
      ))}
    </div>
  );
}
