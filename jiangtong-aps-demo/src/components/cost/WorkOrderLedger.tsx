// §10.1 工单成本台账（表格 + ✨ AI 诊断按钮）
import { useState } from 'react';
import type { WorkOrderCostRow } from '../../types/cost';
import { Search, TrendingUp } from 'lucide-react';
import AIButton from '../ai/AIButton';

interface Props {
  rows: WorkOrderCostRow[];
  onDiagnose: (row: WorkOrderCostRow) => void;
  highlightId?: string | null;
}

export default function WorkOrderLedger({ rows, onDiagnose, highlightId }: Props) {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 12;
  const filtered = rows.filter((r) => {
    if (!q) return true;
    const s = `${r.workOrderId} ${r.customer} ${r.productName}`.toLowerCase();
    return s.includes(q.toLowerCase());
  });
  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);
  const view = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="card-base overflow-hidden">
      <div className="flex items-center px-4 py-3 border-b border-line gap-3">
        <h3 className="text-[14px] font-semibold">工单成本台账</h3>
        <span className="text-[11.5px] text-ink-faint">共 {filtered.length} 张</span>
        <div className="ml-auto relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(0); }}
            placeholder="搜索工单 / 客户 / 产品"
            className="w-60 h-8 pl-8 pr-3 rounded-md bg-panel2 border border-line text-[12px] placeholder:text-ink-faint outline-none focus:border-brand"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="grid-tbl">
          <thead>
            <tr>
              <th>工单号</th>
              <th>客户</th>
              <th>产品</th>
              <th className="text-right">单位成本</th>
              <th className="text-right">损耗率</th>
              <th>对比基线</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {view.map((r) => {
              const dev = r.lossRate - r.baselineLossRate;
              const isAnomaly = dev > 0.10;
              const highlighted = r.workOrderId === highlightId;
              return (
                <tr key={r.workOrderId}
                    className={`${highlighted ? 'bg-ai-bg' : ''}`}>
                  <td>
                    <span className={`font-mono text-[12px] ${highlighted ? 'text-ai font-bold' : ''}`}>{r.workOrderId}</span>
                  </td>
                  <td>{r.customer}</td>
                  <td className="text-ink-dim truncate max-w-[180px]">{r.productName}</td>
                  <td className="text-right tabular-nums">¥{r.unitCost.toLocaleString()}</td>
                  <td className={`text-right tabular-nums font-semibold ${isAnomaly ? 'text-danger' : 'text-ink'}`}>
                    {r.lossRate.toFixed(2)}%
                  </td>
                  <td>
                    <span className={`inline-flex items-center gap-1 tabular-nums text-[11.5px] font-semibold
                                    ${isAnomaly ? 'text-danger' : 'text-ok'}`}>
                      {isAnomaly && <TrendingUp size={11} />}
                      {dev >= 0 ? '+' : ''}{dev.toFixed(2)}pp
                    </span>
                  </td>
                  <td>
                    {isAnomaly
                      ? <AIButton size="sm" label="AI 损耗诊断" onClick={() => onDiagnose(r)} />
                      : <span className="text-ink-faint text-[11px]">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {/* 分页 */}
      <div className="flex items-center px-4 py-2.5 border-t border-line text-[11.5px] text-ink-dim">
        第 {page + 1} / {pageCount} 页
        <div className="ml-auto flex gap-1">
          <button className="btn btn-sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>上一页</button>
          <button className="btn btn-sm" disabled={page >= pageCount - 1} onClick={() => setPage((p) => p + 1)}>下一页</button>
        </div>
      </div>
    </div>
  );
}
