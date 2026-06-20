// 产能负荷分析页：车间 × 14 天 负荷热力图
import { useMemo, useState } from 'react';
import { cellsOf, heatmapDates, type CapacityCell } from '../../mock/capacityData';
import { RESOURCES } from '../../mock/productLines';
import { useCapacityOpsStore } from '../../store/useCapacityOpsStore';

type WorkshopFilter = 'all' | 'enameling' | 'drawing' | 'stranding';

const WS_OPTIONS: { v: WorkshopFilter; label: string }[] = [
  { v: 'all',         label: '全部' },
  { v: 'enameling',   label: '漆包车间' },
  { v: 'drawing',     label: '拉丝车间' },
  { v: 'stranding',   label: '绞线车间' },
];

const LEVEL_BG: Record<CapacityCell['level'], string> = {
  idle:  'bg-line/40',
  green: 'bg-ok/50',
  amber: 'bg-warn/65',
  red:   'bg-danger/75',
};
const LEVEL_LABEL: Record<CapacityCell['level'], string> = {
  idle:  '空闲',
  green: '正常',
  amber: '高负荷',
  red:   '过载',
};

export default function CapacityHeatmap() {
  const [ws, setWs] = useState<WorkshopFilter>('enameling');
  const dates = useMemo(() => heatmapDates(), []);
  // ★ v2.2.2：已解除瓶颈的资源 → 热力图相应单元格降级（red→amber, amber→green）
  const resolved = useCapacityOpsStore((s) => s.resolvedBottlenecks);

  const resources = useMemo(() =>
    ws === 'all' ? RESOURCES : RESOURCES.filter((r) => r.workshop === ws),
  [ws]);

  function effectiveCell(c: CapacityCell): CapacityCell {
    if (!resolved.has(c.resourceId)) return c;
    // 已应用缓解方案 → utilization 下降 15-25%
    const newUtil = Math.max(40, c.utilization - 18);
    const newLevel: CapacityCell['level'] =
      newUtil < 40 ? 'idle' :
      newUtil < 70 ? 'green' :
      newUtil < 90 ? 'amber' :
      'red';
    return { ...c, utilization: newUtil, level: newLevel };
  }

  return (
    <div className="card-base flex flex-col h-full min-h-0">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-line bg-panel2">
        <span className="text-[13px] font-semibold">车间负荷热力图 · 未来 14 天</span>
        <div className="ml-3 flex gap-1">
          {WS_OPTIONS.map((opt) => (
            <button
              key={opt.v}
              onClick={() => setWs(opt.v)}
              className={`text-[10.5px] px-2 py-1 rounded-md font-medium transition-colors
                          ${ws === opt.v ? 'bg-brand text-white' : 'bg-card border border-line text-ink-dim hover:border-brand'}`}
            >{opt.label}</button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2 text-[10.5px] text-ink-dim">
          <Legend cls="bg-ok/50"     label="<70% 正常" />
          <Legend cls="bg-warn/65"   label="70-90% 高" />
          <Legend cls="bg-danger/75" label=">90% 过载" />
          <Legend cls="bg-line/40"   label="<40% 空闲" />
        </div>
      </div>
      <div className="flex-1 overflow-auto p-3">
        <div className="inline-block min-w-full">
          <table className="border-collapse text-[10.5px]">
            <thead>
              <tr>
                <th className="sticky left-0 bg-card text-left px-2 py-1 text-ink-faint font-medium z-10">资源 / 日期</th>
                {dates.map((d) => (
                  <th key={d.dayOffset} className="px-1 py-1 text-ink-faint font-normal text-center min-w-[36px]" title={d.date}>
                    {d.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {resources.map((r) => {
                const cs = cellsOf(r.id).map(effectiveCell);
                const wasResolved = resolved.has(r.id);
                return (
                  <tr key={r.id} className="hover:bg-bg">
                    <th className="sticky left-0 bg-card text-left px-2 py-1 text-[11px] text-ink-dim font-medium z-10 whitespace-nowrap">
                      {r.name}
                      {wasResolved && <span className="ml-1 text-ai text-[10px] font-bold">✓</span>}
                    </th>
                    {cs.map((c) => (
                      <td
                        key={c.dayOffset}
                        title={`${r.name} · ${c.date} · ${c.utilization}%（${LEVEL_LABEL[c.level]}）${wasResolved ? ' · 已应用 AI 缓解' : ''}`}
                        className={`px-1 py-1 text-center text-[10px] font-semibold text-white tabular-nums ${LEVEL_BG[c.level]} border border-card`}
                      >
                        {c.utilization}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Legend({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`w-2.5 h-2.5 rounded-sm ${cls}`} />{label}
    </span>
  );
}
