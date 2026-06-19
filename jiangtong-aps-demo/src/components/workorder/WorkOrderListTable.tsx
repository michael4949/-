// 工单管理页：分页表格 + 筛选 + 异常高亮
//   仅展示用，列表数据从 WORK_ORDERS 切片取
import { useMemo, useState } from 'react';
import { Search, ChevronLeft, ChevronRight, Sparkles, AlertTriangle, ChevronDown } from 'lucide-react';
import { WORK_ORDERS } from '../../mock/workOrders';
import { CUSTOMERS } from '../../mock/customers';
import { WORK_ORDER_ANOMALIES, getAnomaly } from '../../mock/workOrderAnomalies';
import { SAMPLE_WORK_ORDER_IDS, isSample } from '../../mock/sampleWorkOrders';
import { fmtDate } from '../../utils/format';
import { PRIORITY_LABEL, STATUS_LABEL, type Priority, type WorkOrderStatus, type WorkOrder } from '../../types/workOrder';

interface Props {
  highlightAnomalies: boolean;
  onSelect: (woId: string) => void;
  selectedId: string | null;
}

type StatusFilter = 'all' | WorkOrderStatus;

const STATUS_OPTIONS: { v: StatusFilter; label: string }[] = [
  { v: 'all',          label: '全部' },
  { v: 'pending',      label: '待排' },
  { v: 'scheduled',    label: '已排' },
  { v: 'in-progress',  label: '在制' },
  { v: 'completed',    label: '完工' },
];

const PRIO_TAG: Record<Priority, string> = {
  urgent: 'bg-danger text-white',
  important: 'bg-warn text-white',
  normal: 'bg-info text-white',
};
const STATUS_TAG: Record<WorkOrderStatus, string> = {
  pending: 'bg-ink-faint/15 text-ink-dim',
  scheduled: 'bg-info/15 text-info',
  'in-progress': 'bg-brand/15 text-brand',
  completed: 'bg-ok/15 text-ok',
  closed: 'bg-ink-faint/15 text-ink-faint',
};

const PAGE_SIZE = 20;

export default function WorkOrderListTable({ highlightAnomalies, onSelect, selectedId }: Props) {
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [openMenu, setOpenMenu] = useState<'status' | 'customer' | null>(null);

  const anomalyIds = useMemo(
    () => new Set(WORK_ORDER_ANOMALIES.map((a) => a.workOrderId)),
    [],
  );

  const filtered = useMemo(() => {
    // 排序：样品/异常/紧急/待排在前；时间倒序
    return WORK_ORDERS
      .filter((w) => {
        if (statusFilter !== 'all' && w.status !== statusFilter) return false;
        if (customerFilter !== 'all' && w.customer !== customerFilter) return false;
        if (highlightAnomalies && !anomalyIds.has(w.id) && !isSample(w.id)) return false;
        if (q) {
          const s = `${w.id} ${w.productName} ${w.customer}`.toLowerCase();
          if (!s.includes(q.toLowerCase())) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const pinA = isSample(a.id) || anomalyIds.has(a.id) ? -1 : 0;
        const pinB = isSample(b.id) || anomalyIds.has(b.id) ? -1 : 0;
        if (pinA !== pinB) return pinA - pinB;
        const prioOrder: Record<Priority, number> = { urgent: 0, important: 1, normal: 2 };
        if (a.priority !== b.priority) return prioOrder[a.priority] - prioOrder[b.priority];
        return b.dueDate.getTime() - a.dueDate.getTime();
      });
  }, [q, statusFilter, customerFilter, highlightAnomalies, anomalyIds]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="card-base flex flex-col flex-1 min-h-0">
      {/* 筛选条 */}
      <div className="flex items-center gap-2 p-3 border-b border-line flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-[280px]">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(0); }}
            placeholder="搜索工单号/产品/客户"
            className="w-full h-8 pl-7 pr-3 rounded-md bg-card border border-line text-[12px] placeholder:text-ink-faint outline-none focus:border-brand"
          />
        </div>
        <Dropdown
          label={`状态：${STATUS_OPTIONS.find((s) => s.v === statusFilter)?.label}`}
          open={openMenu === 'status'}
          onToggle={() => setOpenMenu(openMenu === 'status' ? null : 'status')}
        >
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.v}
              onClick={() => { setStatusFilter(opt.v); setPage(0); setOpenMenu(null); }}
              className={`w-full text-left px-3 py-1.5 text-[12.5px] hover:bg-bg ${opt.v === statusFilter ? 'text-brand font-semibold' : ''}`}
            >
              {opt.label}
            </button>
          ))}
        </Dropdown>
        <Dropdown
          label={`客户：${customerFilter === 'all' ? '全部' : customerFilter}`}
          open={openMenu === 'customer'}
          onToggle={() => setOpenMenu(openMenu === 'customer' ? null : 'customer')}
        >
          <button
            onClick={() => { setCustomerFilter('all'); setPage(0); setOpenMenu(null); }}
            className={`w-full text-left px-3 py-1.5 text-[12.5px] hover:bg-bg ${customerFilter === 'all' ? 'text-brand font-semibold' : ''}`}
          >全部</button>
          {CUSTOMERS.slice(0, 12).map((c) => (
            <button
              key={c.id}
              onClick={() => { setCustomerFilter(c.name); setPage(0); setOpenMenu(null); }}
              className={`w-full text-left px-3 py-1.5 text-[12.5px] hover:bg-bg ${customerFilter === c.name ? 'text-brand font-semibold' : ''}`}
            >{c.name}</button>
          ))}
        </Dropdown>
        <span className="ml-auto text-[11.5px] text-ink-faint tabular-nums">
          共 {filtered.length} 条 · 第 {page + 1}/{totalPages} 页
        </span>
      </div>

      {/* 表格 */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-[12.5px]">
          <thead className="text-[11.5px] text-ink-faint sticky top-0 bg-panel2 z-10">
            <tr className="text-left">
              <th className="px-3 py-2 font-medium">工单号</th>
              <th className="px-3 py-2 font-medium">客户</th>
              <th className="px-3 py-2 font-medium">产品</th>
              <th className="px-3 py-2 font-medium text-right">数量</th>
              <th className="px-3 py-2 font-medium">交期</th>
              <th className="px-3 py-2 font-medium">优先级</th>
              <th className="px-3 py-2 font-medium">状态</th>
              <th className="px-3 py-2 font-medium text-right pr-4">标记</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((w: WorkOrder) => {
              const ano = getAnomaly(w.id);
              const sample = isSample(w.id);
              const selected = selectedId === w.id;
              return (
                <tr
                  key={w.id}
                  onClick={() => onSelect(w.id)}
                  className={`border-t border-line hover:bg-bg cursor-pointer transition-colors
                              ${selected ? 'bg-brand-50' : ''}
                              ${ano ? 'bg-warn/5' : ''}`}
                >
                  <td className="px-3 py-1.5 font-mono text-[11.5px] text-ink">{w.id}</td>
                  <td className="px-3 py-1.5 text-ink-dim truncate max-w-[120px]">{w.customer}</td>
                  <td className="px-3 py-1.5 text-ink truncate max-w-[200px]">{w.productName}</td>
                  <td className="px-3 py-1.5 text-right text-ink-dim tabular-nums">{w.quantity}kg</td>
                  <td className="px-3 py-1.5 text-ink-dim tabular-nums">{fmtDate(w.dueDate)}</td>
                  <td className="px-3 py-1.5">
                    <span className={`tag ${PRIO_TAG[w.priority]}`}>{PRIORITY_LABEL[w.priority]}</span>
                  </td>
                  <td className="px-3 py-1.5">
                    <span className={`tag ${STATUS_TAG[w.status]}`}>{STATUS_LABEL[w.status]}</span>
                  </td>
                  <td className="px-3 py-1.5 text-right pr-4">
                    <div className="inline-flex items-center gap-1">
                      {ano && (
                        <span title={ano.detail} className="inline-flex items-center gap-0.5 text-[10.5px] text-warn font-semibold">
                          <AlertTriangle size={10} />异常
                        </span>
                      )}
                      {sample && (
                        <span className="inline-flex items-center gap-0.5 text-[10.5px] text-ai font-semibold">
                          <Sparkles size={10} />样品
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {pageItems.length === 0 && (
              <tr><td colSpan={8} className="text-center text-ink-faint py-10 text-[12.5px]">无匹配工单</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      <div className="flex items-center justify-end gap-1 px-3 py-2 border-t border-line bg-panel2">
        <button
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
          className="btn btn-sm"
        ><ChevronLeft size={13} />上一页</button>
        <span className="text-[11.5px] text-ink-faint tabular-nums px-2">第 {page + 1} / {totalPages} 页</span>
        <button
          onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          disabled={page >= totalPages - 1}
          className="btn btn-sm"
        >下一页<ChevronRight size={13} /></button>
      </div>
    </div>
  );
}

function Dropdown({ label, open, onToggle, children }: { label: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="relative">
      <button onClick={onToggle} className="btn btn-sm">
        {label}<ChevronDown size={12} />
      </button>
      {open && (
        <div className="absolute left-0 mt-1 w-44 bg-card border border-line rounded-md shadow-card py-1 z-30 max-h-80 overflow-y-auto">
          {children}
        </div>
      )}
    </div>
  );
}
