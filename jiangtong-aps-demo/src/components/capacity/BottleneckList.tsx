// 产能负荷分析页：瓶颈识别列表 + ✨ 生成缓解方案
import { Flame } from 'lucide-react';
import { BOTTLENECKS, type Bottleneck } from '../../mock/capacityData';
import AIButton from '../ai/AIButton';

interface Props {
  onGenerate: (bn: Bottleneck) => void;
}

export default function BottleneckList({ onGenerate }: Props) {
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
            {BOTTLENECKS.map((bn) => (
              <tr key={bn.resourceId} className="border-t border-line hover:bg-bg">
                <td className="px-3 py-2 font-semibold text-ink">{bn.resourceName}</td>
                <td className="px-3 py-2 text-ink-dim">{bn.workshop}</td>
                <td className="px-3 py-2">
                  <span className="text-[13px]" title={`严重度 ${bn.severity}/3`}>
                    {Array.from({ length: bn.severity }).map(() => '🔥').join('')}
                  </span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-warn font-semibold">{bn.durationDays} 天</td>
                <td className="px-3 py-2 text-right tabular-nums text-ink">{bn.affectedOrders} 张</td>
                <td className="px-3 py-2 text-right tabular-nums text-ink">{bn.queuedTons} 吨</td>
                <td className="px-3 py-2 text-ink-dim tabular-nums">{bn.expectedDelayFrom.slice(5)}</td>
                <td className="px-3 py-2 text-right">
                  <AIButton size="sm" label="生成缓解方案" onClick={() => onGenerate(bn)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
