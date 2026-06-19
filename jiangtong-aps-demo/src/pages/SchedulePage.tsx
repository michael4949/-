// §9 智能排产工作台
//   Sprint 1: 甘特 + 待排池 + 详情 + 算法面板
//   Sprint 4 嵌入：
//     #6  矩阵历史复盘 Insight Card（顶部）
//     #5  ✨ AI 生成矩阵草稿  按钮 → MatrixGeneratorModal
//     #18 ✨ 演示约束冲突   按钮 → ConflictExplain via AIExplainModal
import { useState } from 'react';
import { useScheduleStore } from '../store/useScheduleStore';
import { WORKSHOP_LABEL, type Workshop, type GanttView } from '../types/schedule';
import GanttChart from '../components/gantt/GanttChart';
import PendingList from '../components/workorder/PendingList';
import WorkOrderDetail from '../components/workorder/WorkOrderDetail';
import AlgorithmPanel from '../components/schedule/AlgorithmPanel';
import AIInsightCard from '../components/ai/AIInsightCard';
import AIButton from '../components/ai/AIButton';
import MatrixGeneratorModal from '../components/ai/MatrixGeneratorModal';
import DragSuggestionTip from '../components/gantt/DragSuggestionTip';
import { mockAIInvoke } from '../utils/mockApi';
import { useExplainStore } from '../store/useExplainStore';
import { RefreshCw, Play, Send, BarChart3, Download, AlertOctagon } from 'lucide-react';
import type { MatrixDraftOutput, HistoryReviewOutput, ConflictExplainOutput } from '../mock/agentResponses.sprint4';

const WORKSHOP_OPTIONS: Workshop[] = ['enameling', 'drawing', 'stranding'];
const VIEW_OPTIONS: { v: GanttView; label: string }[] = [
  { v: 'week', label: '周视图' },
  { v: 'day',  label: '日视图' },
];

export default function SchedulePage() {
  const workshop = useScheduleStore((s) => s.workshop);
  const setWorkshop = useScheduleStore((s) => s.setWorkshop);
  const view = useScheduleStore((s) => s.view);
  const setView = useScheduleStore((s) => s.setView);
  const [openMenu, setOpenMenu] = useState<'workshop' | 'view' | null>(null);
  const [matrixOpen, setMatrixOpen] = useState(false);
  const [matrixLoading, setMatrixLoading] = useState(false);
  const [matrixOutput, setMatrixOutput] = useState<MatrixDraftOutput | null>(null);
  const [matrixInsightDismissed, setMatrixInsightDismissed] = useState(false);
  const showExplain = useExplainStore((s) => s.show);
  const showExplainLoading = useExplainStore((s) => s.showLoading);
  const closeExplain = useExplainStore((s) => s.close);

  async function onGenerateMatrix() {
    setMatrixOpen(true);
    setMatrixLoading(true);
    setMatrixOutput(null);
    const { output } = await mockAIInvoke({
      agentId: 'schedule-rule.matrix-generator',
      input: {},
    });
    setMatrixOutput(output as MatrixDraftOutput);
    setMatrixLoading(false);
  }

  // #6 复用 AIExplainModal 展示历史复盘报告
  async function onMatrixHistory() {
    showExplainLoading('矩阵历史复盘');
    const { output } = await mockAIInvoke({
      agentId: 'schedule-rule.history-reviewer',
      input: {},
    });
    const r = output as HistoryReviewOutput;
    showExplain({
      title: '换型矩阵 · 历史复盘',
      content: (
        <div className="space-y-3">
          <div className="bg-panel2 rounded-md px-4 py-2.5 text-[12.5px] leading-relaxed">
            <b className="text-ink">概览：</b>{r.summary}
            <div className="text-[11px] text-ink-faint mt-0.5">{r.runAt}</div>
          </div>
          <div className="text-[10.5px] text-ink-faint tracking-wider uppercase">偏差大于 20% 的换型组合</div>
          <table className="w-full text-[12px]">
            <thead className="text-[11px] text-ink-faint">
              <tr className="text-left">
                <th className="py-1.5 pr-2 font-medium">From → To</th>
                <th className="py-1.5 pr-2 font-medium text-right">矩阵</th>
                <th className="py-1.5 pr-2 font-medium text-right">实际中位</th>
                <th className="py-1.5 pr-2 font-medium text-right">P90</th>
                <th className="py-1.5 pr-2 font-medium text-right">样本</th>
                <th className="py-1.5 pr-2 font-medium text-right">建议</th>
              </tr>
            </thead>
            <tbody>
              {r.deviations.map((d, i) => {
                const dev = d.actualMedian - d.matrixValue;
                return (
                  <tr key={i} className="border-t border-line">
                    <td className="py-1.5 pr-2 text-ink"><span className="font-mono">{d.from}</span> → <span className="font-mono">{d.to}</span></td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">{d.matrixValue}</td>
                    <td className={`py-1.5 pr-2 text-right tabular-nums font-semibold ${dev > 0 ? 'text-danger' : 'text-ok'}`}>
                      {d.actualMedian}
                      <span className="text-[10px] ml-0.5">({dev > 0 ? '+' : ''}{dev})</span>
                    </td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">{d.actualP90}</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums text-ink-faint">{d.sampleCount}</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums font-semibold text-ai">{d.suggestedValue}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="text-[11px] text-ink-faint border-t border-line pt-2">💡 应用建议值后，算法将以新矩阵进行下次排产</div>
        </div>
      ),
      primaryAction: { label: '应用建议矩阵', onClick: () => closeExplain() },
    });
  }

  // #18 演示约束冲突
  async function onShowConflict() {
    showExplainLoading('约束冲突分析');
    const { output } = await mockAIInvoke({
      agentId: 'constraint.conflict-explainer',
      input: { workOrderId: 'WO-2026-1248' },
    });
    const r = output as ConflictExplainOutput;
    showExplain({
      title: `${r.workOrderId} · 排产无解`,
      content: (
        <div className="space-y-3">
          <div className="bg-red-50 border border-danger/30 rounded-md px-4 py-2.5 text-[12.5px] leading-relaxed">
            <span className="font-semibold text-danger">⚠ {r.conflictReason}：</span>
            <div className="mt-1 text-ink-dim">{r.conflictDetail}</div>
          </div>
          <div className="text-[10.5px] text-ink-faint tracking-wider uppercase">建议处置方案</div>
          <div className="space-y-2">
            {r.resolutions.map((res) => (
              <div
                key={res.id}
                className={`rounded-md border p-3 ${res.recommended ? 'border-ai bg-ai-bg/40' : 'border-line'}`}
              >
                <div className="flex items-baseline mb-1">
                  <b className="text-ink text-[12.5px]">{res.label}</b>
                  {res.recommended && (
                    <span className="ml-auto text-[10px] font-bold text-ai uppercase tracking-wider bg-ai/15 px-1.5 py-0.5 rounded">★ AI 推荐</span>
                  )}
                </div>
                <div className="text-[12px] text-ink-dim mb-1">{res.detail}</div>
                <div className="text-[11px] text-ink-faint">代价：{res.cost}</div>
              </div>
            ))}
          </div>
        </div>
      ),
    });
  }

  return (
    <div className="flex flex-col h-full p-4 gap-3 min-h-0">
      {/* #6 矩阵历史复盘 Insight Card */}
      {!matrixInsightDismissed && (
        <AIInsightCard
          insight={{
            id: 'sched-matrix-history',
            severity: 'info',
            agentSource: 'schedule-rule.history-reviewer',
            message: '🔁  本周发现 5 处换型时间偏差超 20%，AI 建议修正矩阵',
            primaryAction: { label: '查看对比', route: '/schedule' },
            dismissible: true,
            generatedAt: new Date(),
          }}
          onDismiss={() => setMatrixInsightDismissed(true)}
          onAction={onMatrixHistory}
        />
      )}

      {/* 顶部工具栏 */}
      <div className="flex items-center gap-3 flex-wrap flex-none">
        <h1 className="text-[18px] font-semibold tracking-wide">📅 智能排产</h1>
        <span className="text-ink-faint">·</span>

        {/* 车间下拉 */}
        <div className="relative">
          <button onClick={() => setOpenMenu(openMenu === 'workshop' ? null : 'workshop')}
                  className="btn">
            {WORKSHOP_LABEL[workshop]} ▼
          </button>
          {openMenu === 'workshop' && (
            <div className="absolute left-0 mt-1 w-32 bg-card border border-line rounded-md shadow-card py-1 z-30">
              {WORKSHOP_OPTIONS.map((w) => (
                <button key={w}
                        onClick={() => { setWorkshop(w); setOpenMenu(null); }}
                        className={`w-full text-left px-3 py-1.5 text-[12.5px] hover:bg-bg
                                   ${w === workshop ? 'text-brand font-semibold' : ''}`}>
                  {WORKSHOP_LABEL[w]}
                </button>
              ))}
            </div>
          )}
        </div>

        <span className="text-[12.5px] text-ink-faint">2026-07-15 ~ 07-22</span>

        {/* 视图切换 */}
        <div className="relative">
          <button onClick={() => setOpenMenu(openMenu === 'view' ? null : 'view')}
                  className="btn">
            {VIEW_OPTIONS.find((v) => v.v === view)?.label} ▼
          </button>
          {openMenu === 'view' && (
            <div className="absolute left-0 mt-1 w-28 bg-card border border-line rounded-md shadow-card py-1 z-30">
              {VIEW_OPTIONS.map((v) => (
                <button key={v.v}
                        onClick={() => { setView(v.v); setOpenMenu(null); }}
                        className={`w-full text-left px-3 py-1.5 text-[12.5px] hover:bg-bg
                                    ${v.v === view ? 'text-brand font-semibold' : ''}`}>
                  {v.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <span className="text-ink-faint">·</span>
        <span className="text-[12.5px] text-ink-dim">设备维度</span>

        {/* 右侧按钮组 */}
        <div className="ml-auto flex items-center gap-2">
          {/* #5 AI 生成矩阵草稿 */}
          <AIButton label="AI 生成矩阵草稿" onClick={onGenerateMatrix} size="sm" />
          {/* #18 演示约束冲突 */}
          <button onClick={onShowConflict} className="btn btn-sm" title="演示：约束冲突解释器">
            <AlertOctagon size={12} />演示冲突
          </button>
          <button className="btn"><RefreshCw size={13} />重新排产</button>
          <button className="btn"><Play size={13} />排产模拟</button>
          <button className="btn btn-primary"><Send size={13} />下发计划</button>
          <button className="btn"><BarChart3 size={13} />KPI 对比</button>
          <button className="btn"><Download size={13} />导出</button>
        </div>
      </div>

      {/* 主区：左 待排池 / 中 甘特 / 右 详情 */}
      <div className="flex-1 grid grid-cols-[240px_1fr_300px] gap-3 min-h-0">
        <PendingList />
        <div className="min-w-0 overflow-hidden">
          <GanttChart />
        </div>
        <WorkOrderDetail />
      </div>

      {/* 算法决策面板 */}
      <div className="flex-none">
        <AlgorithmPanel />
      </div>

      {/* #5 换型矩阵 Modal */}
      <MatrixGeneratorModal
        open={matrixOpen}
        loading={matrixLoading}
        output={matrixOutput}
        onClose={() => setMatrixOpen(false)}
        onApply={() => setMatrixOpen(false)}
      />

      {/* ★ Sprint 5 #17 拖拽建议悬浮提示（document 级监听，无侵入） */}
      <DragSuggestionTip />
    </div>
  );
}
