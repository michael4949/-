// 产能负荷分析页：瓶颈识别列表 + ✨ 生成缓解方案
//   ★ v2.2.2：已应用方案的瓶颈打绿色「✓ 已解除」标，列表中保留可见
import { Flame, Check } from 'lucide-react';
import { BOTTLENECKS, type Bottleneck } from '../../mock/capacityData';
import { useCapacityOpsStore } from '../../store/useCapacityOpsStore';
import AIButton from '../ai/AIButton';

interface Props {
  onGenerate: (bn: Bottleneck) => void;
}

export default function BottleneckList({ onGenerate }: Props) {
  const resolved = useCapacityOpsStore((s) => s.resolvedBottlenecks);
  const applied = useCapacityOpsStore((s) => s.appliedMitigations);
  return (
    <div className="card-base">
      <div className="flex items-center px-4 py-3 border-b border-line bg-panel2">
        <Flame size={14} className="text-danger mr-1.5" />
        <span className="text-[13px] font-semibold">瓶颈识别列表</span>
        <span className="ml-auto text-[11.5px] text-ink-faint tabular-nums">{BOTTLENECKS.length} 处</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead className="text-[11.5px] text-ink-faint bg-panel2">
            <tr className="text-left">
              <th className="px-3 py-2 font-medium">瓶颈</th>
              <th className="px-3 py-2 font-medium">车间</th>
              <th className="px-3 py-2 font-medium">严重度</th>
              <th className="px-3 py-2 font-medium text-right">持续天数</th>
              <th className="px-3 py-2 font-medium text-right">影响工单</th>
              <th className="px-3 py-2 font-medium text-right">待排队</th>
              <th className="px-3 py-2 font-medium">预计延期</th>
              <th className="px-3 py-2 font-medium text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {BOTTLENECKS.map((bn) => {
              const isResolved = resolved.has(bn.resourceId);
              const plan = applied.get(bn.resourceId);
              return (
              <tr key={bn.resourceId} className={`border-t border-line hover:bg-bg ${isResolved ? 'bg-ok/5' : ''}`}>
                <td className={`px-3 py-2 font-semibold ${isResolved ? 'text-ink-dim line-through' : 'text-ink'}`}>{bn.resourceName}</td>
                <td className="px-3 py-2 text-ink-dim">{bn.workshop}</td>
                <td className="px-3 py-2">
                  {isResolved ? (
                    <span className="text-[11px] text-ok font-semibold inline-flex items-center gap-0.5"><Check size={11} />已解除</span>
                  ) : (
                    <span className="text-[13px]" title={`严重度 ${bn.severity}/3`}>
                      {Array.from({ length: bn.severity }).map(() => '🔥').join('')}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-warn font-semibold">{isResolved ? '—' : `${bn.durationDays} 天`}</td>
                <td className="px-3 py-2 text-right tabular-nums text-ink">{isResolved ? '—' : `${bn.affectedOrders} 张`}</td>
                <td className="px-3 py-2 text-right tabular-nums text-ink">{isResolved ? '—' : `${bn.queuedTons} 吨`}</td>
                <td className="px-3 py-2 text-ink-dim tabular-nums">{isResolved ? '—' : bn.expectedDelayFrom.slice(5)}</td>
                <td className="px-3 py-2 text-right">
                  {isResolved ? (
                    <span className="tag bg-ok/15 text-ok inline-flex items-center gap-0.5"><Check size={10} />方案 {plan} 已应用</span>
                  ) : (
                    <AIButton size="sm" label="生成缓解方案" onClick={() => onGenerate(bn)} />
                  )}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
