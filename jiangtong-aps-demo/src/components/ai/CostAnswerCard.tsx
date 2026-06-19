// Agent #5 答案在 Copilot 内的统一渲染
import type { CostAnswerAttachment, CostAnswerOutput } from '../../mock/agentResponses';
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell,
  PieChart, Pie, LineChart, Line, Legend, CartesianGrid,
} from 'recharts';

export default function CostAnswerCard({ data, onFollowup }: {
  data: CostAnswerOutput;
  onFollowup: (q: string) => void;
}) {
  return (
    <div className="space-y-2.5">
      {data.attachments.map((att, i) => <Attachment key={i} att={att} />)}
      {data.followup && data.followup.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {data.followup.map((q) => (
            <button key={q} onClick={() => onFollowup(q)} className="ai-chip cursor-pointer hover:bg-ai-soft">
              {q.length > 22 ? q.slice(0, 22) + '…' : q}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Attachment({ att }: { att: CostAnswerAttachment }) {
  if (att.type === 'table') {
    return (
      <div className="border border-line rounded-md overflow-hidden bg-card">
        <table className="w-full text-[11.5px]">
          <thead>
            <tr className="bg-panel2">
              {att.columns.map((c) => <th key={c} className="text-left px-2.5 py-1.5 text-ink-dim font-semibold">{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {att.rows.map((row, i) => (
              <tr key={i} className="border-t border-line/80">
                {row.map((cell, j) => (
                  <td key={j} className={`px-2.5 py-1.5 ${j === 0 ? 'font-semibold text-ink' : 'text-ink-dim tabular-nums'}`}>
                    {String(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (att.type === 'bar') {
    return (
      <ChartWrap title={att.title}>
        <ResponsiveContainer width="100%" height={att.items.length > 10 ? 220 : 180}>
          <BarChart data={att.items} margin={{ top: 8, right: 8, left: -10, bottom: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6B7280' }} angle={att.items.length > 8 ? -30 : 0} textAnchor={att.items.length > 8 ? 'end' : 'middle'} height={36} />
            <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} />
            <Tooltip formatter={(v: number) => `${v}${att.valueLabel ?? ''}`}
              contentStyle={{ fontSize: 11, padding: '4px 8px', borderRadius: 6 }} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {att.items.map((it, i) => (
                <Cell key={i} fill={it.color ?? '#7C3AED'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartWrap>
    );
  }
  if (att.type === 'pie') {
    return (
      <ChartWrap title={att.title}>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={att.items} dataKey="value" nameKey="name" cx="40%" cy="50%" outerRadius={70} innerRadius={30}>
              {att.items.map((it, i) => <Cell key={i} fill={it.color ?? '#7C3AED'} />)}
            </Pie>
            <Tooltip formatter={(v: number) => `${v}%`} contentStyle={{ fontSize: 11, padding: '4px 8px', borderRadius: 6 }} />
            <Legend layout="vertical" align="right" verticalAlign="middle"
              wrapperStyle={{ fontSize: 11, lineHeight: '18px' }}
              formatter={(value, _entry, i) => `${value} ${att.items[i].value}%`}
            />
          </PieChart>
        </ResponsiveContainer>
      </ChartWrap>
    );
  }
  if (att.type === 'line') {
    const data = att.xLabels.map((x, i) => {
      const row: Record<string, string | number> = { x };
      att.series.forEach((s) => row[s.name] = s.data[i]);
      return row;
    });
    return (
      <ChartWrap title={att.title}>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data} margin={{ top: 8, right: 12, left: -10, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="x" tick={{ fontSize: 10, fill: '#6B7280' }} />
            <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} />
            <Tooltip formatter={(v: number) => `${v}${att.valueLabel ?? ''}`}
              contentStyle={{ fontSize: 11, padding: '4px 8px', borderRadius: 6 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {att.series.map((s) => (
              <Line key={s.name} type="monotone" dataKey={s.name} stroke={s.color ?? '#7C3AED'} strokeWidth={2} dot={{ r: 3 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </ChartWrap>
    );
  }
  if (att.type === 'workorders') {
    return (
      <div className="border border-line rounded-md overflow-hidden bg-card">
        {att.items.map((wo) => (
          <div key={wo.id} className="flex items-center gap-2 px-2.5 py-1.5 text-[11.5px] border-b border-line/80 last:border-b-0">
            <span className="font-mono text-ink">{wo.id}</span>
            <span className="text-ink-dim flex-1 truncate">{wo.product}</span>
            <span className={`tag ${wo.tag === 'completed' ? 'tag-ok' : 'tag-warn'}`}>{wo.status}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

function ChartWrap({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="border border-line rounded-md p-2 bg-card">
      {title && <div className="text-[11px] text-ink-dim font-semibold mb-1 px-1">{title}</div>}
      {children}
    </div>
  );
}
