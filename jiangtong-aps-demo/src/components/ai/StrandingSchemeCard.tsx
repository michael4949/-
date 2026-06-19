// Agent #6 铜绞线配股方案对比卡
//   配股组合可视化（色块条状）+ 成本/质量/排产协同三维 + 应用按钮
//   UI 风格与 InsertSchemeCard 一致（紫色推荐角标 + 应用态绿色）
import { Check, Crown, Star } from 'lucide-react';
import type { StrandingScheme, StrandingSource } from '../../mock/agentResponses';

interface Props {
  schemes: StrandingScheme[];
  appliedId?: string | null;
  onApply: (s: StrandingScheme) => void;
}

const SOURCE_COLOR: Record<StrandingSource['kind'], { bg: string; label: string }> = {
  bin:   { bg: '#3B82F6', label: '完工余料' },           // 蓝
  stock: { bg: '#10B981', label: '库存半成品' },         // 绿
  new:   { bg: '#FF6B35', label: '新拉' },               // 橙
};

export default function StrandingSchemeCard({ schemes, appliedId, onApply }: Props) {
  // 三方案最大成本用于横向条对比
  const maxCost = Math.max(...schemes.map((s) => s.cost));

  return (
    <div className="space-y-2.5">
      {/* 图例 */}
      <div className="flex gap-3 flex-wrap text-[10.5px] text-ink-dim">
        {Object.entries(SOURCE_COLOR).map(([k, v]) => (
          <span key={k} className="inline-flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm" style={{ background: v.bg }} />
            {v.label}
          </span>
        ))}
      </div>

      {schemes.map((s) => {
        const applied = appliedId === s.id;
        const totalStrands = s.composition.reduce((sum, c) => sum + c.strands, 0);
        const costPct = (s.cost / maxCost) * 100;
        return (
          <div
            key={s.id}
            className={`relative rounded-lg border bg-card p-3 transition-colors
                       ${s.recommended ? 'border-ai shadow-[0_0_0_1px_rgba(124,58,237,0.2)]' : 'border-line'}
                       ${applied ? 'ring-2 ring-ok ring-offset-1 ring-offset-card' : ''}`}
          >
            {s.recommended && (
              <span className="absolute -top-2.5 right-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-white bg-ai rounded px-1.5 py-0.5">
                <Crown size={10} /> AI 推荐
              </span>
            )}

            <div className="text-[13px] font-semibold mb-2">{s.label}</div>

            {/* 配股组合可视化（色块条状图，按 strands 比例） */}
            <div className="mb-2">
              <div className="flex h-5 rounded-md overflow-hidden border border-line">
                {s.composition.map((c, i) => (
                  <div
                    key={i}
                    title={`${c.from} · ${c.strands} 股 × Φ${c.diameter}mm`}
                    className="flex items-center justify-center text-[10px] font-bold text-white truncate px-1"
                    style={{
                      background: SOURCE_COLOR[c.kind].bg,
                      width: `${(c.strands / totalStrands) * 100}%`,
                    }}
                  >
                    {c.strands}
                  </div>
                ))}
              </div>
              <div className="mt-1 space-y-0.5">
                {s.composition.map((c, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[10.5px] text-ink-dim">
                    <span className="w-2 h-2 rounded-sm flex-none" style={{ background: SOURCE_COLOR[c.kind].bg }} />
                    <span className="font-mono text-ink">{c.strands} 股</span>
                    <span className="text-ink-faint truncate">{c.from}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 三维指标：成本柱 + 质量星 + 排产协同星 */}
            <div className="grid grid-cols-3 gap-2 mb-2 text-[10.5px]">
              {/* 成本 */}
              <div className="bg-panel2 rounded px-2 py-1.5">
                <div className="text-ink-faint mb-0.5">成本</div>
                <div className="font-bold tabular-nums text-ink">¥{s.cost.toLocaleString()}</div>
                <div className="mt-0.5 h-1 bg-line/60 rounded overflow-hidden">
                  <div className={`h-full ${s.recommended ? 'bg-ai' : 'bg-brand'}`}
                       style={{ width: `${costPct}%` }} />
                </div>
                {s.costSaving != null && s.costSaving < 0 && (
                  <div className="text-ok text-[10px] mt-0.5">较方案 B 省 ¥{Math.abs(s.costSaving).toLocaleString()}</div>
                )}
              </div>
              {/* 质量 */}
              <div className="bg-panel2 rounded px-2 py-1.5">
                <div className="text-ink-faint mb-0.5">质量</div>
                <StarRow value={s.qualityRating} />
              </div>
              {/* 排产协同 */}
              <div className="bg-panel2 rounded px-2 py-1.5">
                <div className="text-ink-faint mb-0.5">排产协同</div>
                <StarRow value={s.schedulingFit} />
              </div>
            </div>

            <div className="text-[11.5px] text-ink-faint mb-2 leading-relaxed">{s.reason}</div>

            <button
              onClick={() => onApply(s)}
              disabled={applied}
              className={`btn btn-sm w-full justify-center ${applied ? 'bg-ok text-white border-ok hover:bg-ok hover:text-white' : 'btn-ai'}`}
            >
              {applied ? <><Check size={12} /> 已应用</> : '应用此方案'}
            </button>
          </div>
        );
      })}
    </div>
  );
}

function StarRow({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={11}
              className={i <= value ? 'fill-warn text-warn' : 'text-line'} />
      ))}
    </div>
  );
}
