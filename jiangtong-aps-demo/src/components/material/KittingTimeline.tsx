// 物料齐套页：未来 7 天齐套时间轴热度条
import { KITTING_TIMELINE } from '../../mock/shortageList';

const COLOR = {
  green: { bar: 'bg-ok', text: 'text-ok' },
  amber: { bar: 'bg-warn', text: 'text-warn' },
  red:   { bar: 'bg-danger', text: 'text-danger' },
};

export default function KittingTimeline() {
  return (
    <div className="card-base p-4">
      <div className="flex items-center mb-3">
        <span className="text-[13px] font-semibold">齐套时间轴 · 未来 7 天</span>
        <div className="ml-auto flex items-center gap-3 text-[10.5px] text-ink-dim">
          <Legend color="bg-ok" label="≥85%" />
          <Legend color="bg-warn" label="70-85%" />
          <Legend color="bg-danger" label="<70%" />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {KITTING_TIMELINE.map((day) => (
          <div key={day.date} className="bg-panel2 rounded-md p-2 flex flex-col items-center">
            <div className="text-[11px] font-semibold text-ink-dim">{day.date}</div>
            <div className="my-2 w-full h-20 rounded bg-line/40 flex items-end overflow-hidden">
              <div
                className={`w-full ${COLOR[day.level].bar} transition-all`}
                style={{ height: `${day.percent}%` }}
              />
            </div>
            <div className={`text-[12px] font-bold tabular-nums ${COLOR[day.level].text}`}>{day.percent}%</div>
            <div className="text-[10px] text-ink-faint mt-0.5">{day.risk} 张风险</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`w-2.5 h-2.5 rounded-sm ${color}`} />{label}
    </span>
  );
}
