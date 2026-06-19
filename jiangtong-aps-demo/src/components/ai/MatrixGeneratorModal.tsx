// Agent #5 换型矩阵生成 Modal
//   左：N×N 矩阵（可编辑）  右：推理依据 + 差异统计
import { useState, useEffect } from 'react';
import { X, Sparkles, Loader2, Save } from 'lucide-react';
import type { MatrixDraftOutput } from '../../mock/agentResponses.sprint4';

interface Props {
  open: boolean;
  loading: boolean;
  output: MatrixDraftOutput | null;
  onClose: () => void;
  onApply: () => void;
}

function colorOf(value: number): string {
  if (value === 0) return 'bg-bg text-ink-faint';
  if (value <= 30) return 'bg-ok/10 text-ok';
  if (value <= 90) return 'bg-warn/10 text-warn';
  return 'bg-danger/10 text-danger';
}

export default function MatrixGeneratorModal({ open, loading, output, onClose, onApply }: Props) {
  const [cells, setCells] = useState<number[][]>([]);
  const [hoverCell, setHoverCell] = useState<{ i: number; j: number } | null>(null);

  useEffect(() => {
    if (output) setCells(output.cells.map((row) => row.map((c) => c.value)));
  }, [output]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[960px] max-h-[88vh] bg-card border border-line rounded-xl shadow-card flex flex-col overflow-hidden animate-modal-in"
      >
        <div className="h-1 bg-gradient-to-r from-ai via-purple-500 to-pink-400" />
        <div className="flex items-center gap-2 px-5 py-3 border-b border-line">
          <span className="ai-chip">
            <Sparkles size={11} /> AI 生成
          </span>
          <h3 className="text-[14px] font-semibold">换型时间矩阵草稿（分钟）</h3>
          <button onClick={onClose} className="ml-auto w-8 h-8 rounded-md hover:bg-bg flex items-center justify-center text-ink-faint">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {loading || !output ? (
            <div className="flex items-center justify-center gap-3 py-24 text-ai">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-[13.5px] font-medium">AI 正在基于历史数据生成换型矩阵…</span>
            </div>
          ) : (
            <div className="grid grid-cols-[1fr_280px] gap-5 min-h-0">
              {/* 左：矩阵 */}
              <div className="overflow-auto">
                <table className="border-collapse text-[11.5px] tabular-nums">
                  <thead>
                    <tr>
                      <th className="bg-panel2 border border-line px-2 py-1.5 text-[10.5px] text-ink-faint">From ↓ \ To →</th>
                      {output.dimensions.map((d) => (
                        <th key={d} className="bg-panel2 border border-line px-2 py-1.5 text-[10.5px] text-ink-dim whitespace-nowrap">{d}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {output.dimensions.map((rowLabel, i) => (
                      <tr key={rowLabel}>
                        <th className="bg-panel2 border border-line px-2 py-1.5 text-[10.5px] text-ink-dim text-left whitespace-nowrap">{rowLabel}</th>
                        {cells[i]?.map((v, j) => (
                          <td
                            key={j}
                            onMouseEnter={() => setHoverCell({ i, j })}
                            onMouseLeave={() => setHoverCell(null)}
                            className={`border border-line text-center font-semibold ${colorOf(v)}
                                        ${hoverCell?.i === i && hoverCell?.j === j ? 'ring-2 ring-ai' : ''}`}
                            title={output.cells[i][j].reason}
                          >
                            <input
                              type="number"
                              value={v}
                              onChange={(e) => {
                                const next = cells.map((row) => row.slice());
                                next[i][j] = Number(e.target.value);
                                setCells(next);
                              }}
                              className="w-12 h-8 bg-transparent text-center outline-none focus:bg-card focus:ring-1 focus:ring-brand rounded"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-3 text-[10.5px] text-ink-faint">
                  点击数值可编辑；悬停查看 AI 生成依据
                </div>
              </div>

              {/* 右：依据 + 差异统计 + 当前 hover 详解 */}
              <div className="space-y-4 border-l border-line pl-5">
                <div>
                  <div className="text-[11.5px] text-ink-faint mb-1.5">差异统计</div>
                  <div className="flex gap-3 text-[12px]">
                    <Stat label="保留" value={output.diffStats.kept} tone="text-ink" />
                    <Stat label="变更" value={output.diffStats.changed} tone="text-warn" />
                    <Stat label="新增" value={output.diffStats.added} tone="text-ai" />
                  </div>
                </div>

                {hoverCell && cells[hoverCell.i] && (
                  <div className="rounded-md bg-ai-bg/60 border border-ai/30 p-2.5">
                    <div className="text-[11px] text-ai font-semibold mb-1">单元格说明</div>
                    <div className="text-[11px] text-ink-dim">
                      <span className="font-mono">{output.dimensions[hoverCell.i]} → {output.dimensions[hoverCell.j]}</span>
                      <br />
                      {output.cells[hoverCell.i][hoverCell.j].reason}
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-[11.5px] text-ink-faint mb-1.5">AI 推理依据</div>
                  <ul className="space-y-1.5 text-[11.5px] text-ink-dim leading-relaxed">
                    {output.reasoning.map((r, i) => (
                      <li key={i} className="flex gap-1.5">
                        <span className="text-ai">▸</span>{r}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="text-[11px] text-ink-faint border-t border-line pt-3">
                  💡 矩阵确认后将作为算法换型计算基础
                </div>
              </div>
            </div>
          )}
        </div>
        {!loading && output && (
          <div className="p-3 border-t border-line bg-panel2 flex justify-end gap-2">
            <button onClick={onClose} className="btn">取消</button>
            <button onClick={onApply} className="btn btn-ai"><Save size={12} />应用矩阵</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="flex-1 bg-panel2 rounded-md px-2 py-1.5">
      <div className="text-[10.5px] text-ink-faint">{label}</div>
      <div className={`text-[15px] font-bold tabular-nums ${tone}`}>{value}</div>
    </div>
  );
}
