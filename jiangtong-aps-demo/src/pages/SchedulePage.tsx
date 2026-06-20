// §9 智能排产工作台
//   Sprint 1: 甘特 + 待排池 + 详情 + 算法面板
//   Sprint 4 嵌入：#5 矩阵生成 / #6 矩阵复盘 / #18 冲突解释
//   Sprint 5 嵌入：#16 自然语言搜索（Copilot）/ #17 拖拽建议
//   ★ v2.2.1：5 个工具栏按钮全部接入功能（重新排产 / 排产模拟 / 下发计划 / KPI 对比 / 导出）
import { useState } from 'react';
import { useScheduleStore } from '../store/useScheduleStore';
import { WORKSHOP_LABEL, type Workshop, type GanttView } from '../types/schedule';
import GanttChart from '../components/gantt/GanttChart';
import PendingList from '../components/workorder/PendingList';
import WorkOrderDetail from '../components/workorder/WorkOrderDetail';
import AlgorithmPanel from '../components/schedule/AlgorithmPanel';
import AIInsightCard from '../components/ai/AIInsightCard';
import ActionableInsightCard from '../components/ai/ActionableInsightCard';
import AIButton from '../components/ai/AIButton';
import MatrixGeneratorModal from '../components/ai/MatrixGeneratorModal';
import DragSuggestionTip from '../components/gantt/DragSuggestionTip';
import { mockAIInvoke } from '../utils/mockApi';
import { useExplainStore } from '../store/useExplainStore';
import { RefreshCw, Play, Send, BarChart3, Download, AlertOctagon, CheckCircle2, X, Loader2 } from 'lucide-react';
import { fmtPct, fmtMoney } from '../utils/format';
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
  const applyWeights = useScheduleStore((s) => s.applyWeights);
  const kpi = useScheduleStore((s) => s.kpi);
  const scheduled = useScheduleStore((s) => s.scheduled);
  const dispatchedIds = useScheduleStore((s) => s.dispatchedIds);
  const simulateMode = useScheduleStore((s) => s.simulateMode);
  const conflictHighlightIds = useScheduleStore((s) => s.conflictHighlightIds);
  const reSchedule = useScheduleStore((s) => s.reSchedule);
  const dispatchAll = useScheduleStore((s) => s.dispatchAll);
  const triggerConflictDemo = useScheduleStore((s) => s.triggerConflictDemo);
  const clearConflictHighlight = useScheduleStore((s) => s.clearConflictHighlight);
  const setSimulateMode = useScheduleStore((s) => s.setSimulateMode);
  const kpiHistory = useScheduleStore((s) => s.kpiHistory);
  const select = useScheduleStore((s) => s.select);
  const applyMatrixCorrection = useScheduleStore((s) => s.applyMatrixCorrection);
  const matrixCorrectionApplied = useScheduleStore((s) => s.matrixCorrectionApplied);
  const [openMenu, setOpenMenu] = useState<'workshop' | 'view' | null>(null);
  const [matrixOpen, setMatrixOpen] = useState(false);
  const [matrixLoading, setMatrixLoading] = useState(false);
  const [matrixOutput, setMatrixOutput] = useState<MatrixDraftOutput | null>(null);
  const [matrixInsightDismissed, setMatrixInsightDismissed] = useState(false);
  const [toast, setToast] = useState<{ msg: string; kind: 'ok' | 'info' } | null>(null);
  const [simulateOpen, setSimulateOpen] = useState(false);
  const [simulateLoading, setSimulateLoading] = useState(false);
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [dispatchSending, setDispatchSending] = useState(false);
  const [kpiCompareOpen, setKpiCompareOpen] = useState(false);
  const [reRunning, setReRunning] = useState(false);
  const showExplain = useExplainStore((s) => s.show);
  const showExplainLoading = useExplainStore((s) => s.showLoading);
  const closeExplain = useExplainStore((s) => s.close);

  function showToast(msg: string, kind: 'ok' | 'info' = 'ok') {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 2400);
  }

  // ★ v2.2.2 真正系统联动版：重新排产 = 真的把 20% 的工单换机台 / 换时段 + KPI 实时变
  async function onReSchedule() {
    setReRunning(true);
    const r = await reSchedule();
    setReRunning(false);
    showToast(`✓ AI 已重排 ${r.moved} 张工单 · OTD ${fmtPct(r.newKpi.otd)} · 换型 ${fmtPct(r.newKpi.changeoverLoss)} · 利用率 ${fmtPct(r.newKpi.utilization)}`);
  }

  // ★ 排产模拟：打开模拟模式（甘特图覆盖紫色斜纹） + 预测 KPI Modal；关闭时退出模拟模式
  async function onSimulate() {
    setSimulateMode(true);
    setSimulateOpen(true);
    setSimulateLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setSimulateLoading(false);
  }
  function closeSimulate() {
    setSimulateOpen(false);
    setSimulateMode(false);
  }

  function onDispatch() { setDispatchOpen(true); }
  async function confirmDispatch() {
    setDispatchSending(true);
    await new Promise((r) => setTimeout(r, 1800));
    const n = dispatchAll();
    setDispatchSending(false);
    setDispatchOpen(false);
    showToast(`✓ 已下发 ${n} 张工单至 MES · 甘特图上 🔒 已锁定 · 计划版本 V0715-${(Math.floor(Math.random() * 9) + 1)}`);
  }

  function onExport() {
    showToast(`✓ 已生成 schedule_2026-07-15.csv · ${scheduled.length} 行工单 · ${WORKSHOP_LABEL[workshop]}`);
  }

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

  async function onShowConflict() {
    // 切到漆包车间 + 真正闪烁标红 WO-2026-1248 + 切到该工单的所在机台行
    setWorkshop('enameling');
    showExplainLoading('约束冲突分析');
    const { output } = await mockAIInvoke({
      agentId: 'constraint.conflict-explainer',
      input: { workOrderId: 'WO-2026-1248' },
    });
    const r = output as ConflictExplainOutput;
    // 在甘特图中标红闪烁该工单（如不在 scheduled 中则不闪）+ 选中
    triggerConflictDemo(['WO-2026-1248']);
    select('WO-2026-1248');
    showExplain({
      title: `${r.workOrderId} · 排产无解`,
      content: (
        <div className="space-y-3">
          <div className="bg-red-50 border border-danger/30 rounded-md px-4 py-2.5 text-[12.5px] leading-relaxed">
            <span className="font-semibold text-danger">⚠ {r.conflictReason}：</span>
            <div className="mt-1 text-ink-dim">{r.conflictDetail}</div>
          </div>
          <div className="text-[10.5px] text-ink-faint tracking-wider uppercase">建议处置方案（点采用 → 系统立即应用）</div>
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
                <div className="text-[11px] text-ink-faint mb-2">代价：{res.cost}</div>
                <button
                  onClick={() => {
                    closeExplain();
                    clearConflictHighlight();
                    showToast(`✓ 已采用${res.label.split('：')[0]}：${res.label.split('：')[1] ?? ''}`);
                  }}
                  className={`btn btn-sm ${res.recommended ? 'btn-ai' : ''}`}
                >
                  采用此方案
                </button>
              </div>
            ))}
          </div>
        </div>
      ),
    });
  }

  return (
    <div className="flex flex-col h-full p-4 gap-3 min-h-0">
      {/* ★ v2.2.4 #6 矩阵历史复盘 改交互式 — 双按钮 Insight Card */}
      {!matrixInsightDismissed && !matrixCorrectionApplied && (
        <ActionableInsightCard
          id="sched-matrix-history"
          agentNumber={6}
          agentName="矩阵历史复盘"
          message="🔁 本周发现 5 处换型时间偏差超 20%（QA→QZ 90→112 分钟 / QY→QA 90→108 分钟等），AI 建议立即应用修正矩阵"
          primaryAction={{
            label: '一键应用建议矩阵',
            apply: async () => {
              const r = await applyMatrixCorrection();
              return `✓ 矩阵已修正 5 处偏差 · 触发 ${r.corrected} 张工单微调（甘特图紫色闪烁中）· 换型损失 ${r.coLossBefore}% → ${r.coLossAfter}% · OTD +0.4pp`;
            },
          }}
          secondaryAction={{ label: '查看明细', route: '/schedule' }}
          onDismiss={() => setMatrixInsightDismissed(true)}
        />
      )}
      {matrixCorrectionApplied && !matrixInsightDismissed && (
        <AIInsightCard
          insight={{
            id: 'sched-matrix-applied',
            severity: 'success',
            agentSource: 'schedule-rule.history-reviewer',
            message: '✅ 换型矩阵建议已应用 · 甘特图已微调 · Agent #6 进入待机',
            primaryAction: { label: '查看历史', route: '/schedule' },
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
          {/* ★ v2.2.1 工具栏 5 按钮全部接入 */}
          <button onClick={onReSchedule} disabled={reRunning} className="btn" title="基于当前权重重新计算排产方案">
            {reRunning ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}重新排产
          </button>
          <button onClick={onSimulate} className="btn" title="预演排产效果，不影响正式计划">
            <Play size={13} />排产模拟
          </button>
          <button onClick={onDispatch} className="btn btn-primary" title="将当前排产计划下发至 MES 执行">
            <Send size={13} />下发计划
          </button>
          <button onClick={() => setKpiCompareOpen(true)} className="btn" title="对比 7 天 KPI 趋势">
            <BarChart3 size={13} />KPI 对比
          </button>
          <button onClick={onExport} className="btn" title="导出当前排产为 CSV">
            <Download size={13} />导出
          </button>
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

      <DragSuggestionTip />

      {/* ★ v2.2.1 排产模拟 Modal · 模拟模式下甘特图覆盖紫色斜纹 */}
      {simulateOpen && (
        <SimulateModal loading={simulateLoading} kpi={kpi} onClose={closeSimulate} />
      )}

      {/* ★ v2.2.1 下发计划确认 Modal */}
      {dispatchOpen && (
        <DispatchModal
          sending={dispatchSending}
          count={scheduled.length - dispatchedIds.size}
          workshop={WORKSHOP_LABEL[workshop]}
          onClose={() => !dispatchSending && setDispatchOpen(false)}
          onConfirm={confirmDispatch}
        />
      )}

      {/* ★ v2.2.2 KPI 对比 Modal · 实时读取 kpiHistory（每次重排会追加一条） */}
      {kpiCompareOpen && (
        <KpiCompareModal history={kpiHistory} onClose={() => setKpiCompareOpen(false)} />
      )}

      {/* ★ v2.2.1 全局 Toast */}
      {toast && (
        <div className="fixed bottom-24 right-6 z-[10001] animate-modal-in">
          <div className={`flex items-center gap-2 px-4 py-2.5 rounded-md shadow-card border
                          ${toast.kind === 'ok' ? 'bg-ok text-white border-ok' : 'bg-card border-line text-ink'}`}>
            <CheckCircle2 size={14} />
            <span className="text-[12.5px] font-medium">{toast.msg}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============ 内嵌的 3 个工具栏 Modal ============ */
function SimulateModal({ loading, kpi, onClose }: { loading: boolean; kpi: { otd: number; changeoverLoss: number; utilization: number; wipValue: number }; onClose: () => void }) {
  const simulated = {
    otd: +(kpi.otd + 1.2).toFixed(1),
    changeoverLoss: +(kpi.changeoverLoss - 0.6).toFixed(1),
    utilization: +(kpi.utilization + 0.8).toFixed(1),
    wipValue: kpi.wipValue + 60_000,
  };
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" />
      <div onClick={(e) => e.stopPropagation()}
           className="relative w-full max-w-[560px] bg-card border border-line rounded-xl shadow-card overflow-hidden animate-modal-in">
        <div className="h-1 bg-gradient-to-r from-ai via-purple-500 to-pink-400" />
        <div className="flex items-center gap-2 px-5 py-3 border-b border-line">
          <Play size={14} className="text-ai" />
          <h3 className="text-[14px] font-semibold">排产模拟 · KPI 预测</h3>
          <button onClick={onClose} className="ml-auto w-8 h-8 rounded-md hover:bg-bg flex items-center justify-center text-ink-faint">
            <X size={16} />
          </button>
        </div>
        <div className="p-5">
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-12 text-ai">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-[13.5px] font-medium">基于当前权重模拟排产中…</span>
            </div>
          ) : (
            <>
              <div className="text-[12.5px] text-ink-dim mb-3">
                按当前算法权重模拟一次完整排产（不影响正式计划），预测如下：
              </div>
              <table className="w-full text-[12.5px]">
                <thead className="text-[11px] text-ink-faint">
                  <tr className="text-left">
                    <th className="py-1.5 pr-2 font-medium">KPI</th>
                    <th className="py-1.5 pr-2 font-medium text-right">当前</th>
                    <th className="py-1.5 pr-2 font-medium text-right">模拟</th>
                    <th className="py-1.5 pr-2 font-medium text-right">差值</th>
                  </tr>
                </thead>
                <tbody>
                  <KpiSimRow label="OTD"        cur={fmtPct(kpi.otd)}            sim={fmtPct(simulated.otd)}            delta="+ 1.2pp" good />
                  <KpiSimRow label="换型损失"   cur={fmtPct(kpi.changeoverLoss)} sim={fmtPct(simulated.changeoverLoss)} delta="- 0.6pp" good />
                  <KpiSimRow label="利用率"     cur={fmtPct(kpi.utilization)}    sim={fmtPct(simulated.utilization)}    delta="+ 0.8pp" good />
                  <KpiSimRow label="在制库存"   cur={fmtMoney(kpi.wipValue)}     sim={fmtMoney(simulated.wipValue)}     delta="+ ¥6 万" good={false} />
                </tbody>
              </table>
              <div className="text-[11px] text-ink-faint mt-3">💡 此为预演结果，未写入正式计划。如满意可点「下发计划」</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiSimRow({ label, cur, sim, delta, good }: { label: string; cur: string; sim: string; delta: string; good: boolean }) {
  return (
    <tr className="border-t border-line">
      <td className="py-1.5 pr-2 text-ink-dim">{label}</td>
      <td className="py-1.5 pr-2 text-right tabular-nums text-ink-faint">{cur}</td>
      <td className="py-1.5 pr-2 text-right tabular-nums text-ink font-semibold">{sim}</td>
      <td className={`py-1.5 pr-2 text-right tabular-nums font-semibold ${good ? 'text-ok' : 'text-warn'}`}>{delta}</td>
    </tr>
  );
}

function DispatchModal({ sending, count, workshop, onClose, onConfirm }: { sending: boolean; count: number; workshop: string; onClose: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" />
      <div onClick={(e) => e.stopPropagation()}
           className="relative w-full max-w-[460px] bg-card border border-line rounded-xl shadow-card overflow-hidden animate-modal-in">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-line">
          <Send size={14} className="text-brand" />
          <h3 className="text-[14px] font-semibold">下发排产计划</h3>
          <button onClick={onClose} disabled={sending} className="ml-auto w-8 h-8 rounded-md hover:bg-bg flex items-center justify-center text-ink-faint disabled:opacity-30">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 text-[12.5px] leading-7 text-ink-dim">
          确认将当前 <b className="text-ink">{workshop}</b> 共 <b className="text-ink tabular-nums">{count}</b> 张排产工单下发至 MES？
          <br />
          下发后将通知车间班组开始执行，已下发工单不可再编辑（可申请变更）。
        </div>
        <div className="p-3 border-t border-line bg-panel2 flex justify-end gap-2">
          <button onClick={onClose} disabled={sending} className="btn">取消</button>
          <button onClick={onConfirm} disabled={sending} className="btn btn-primary">
            {sending ? <><Loader2 size={13} className="animate-spin" />下发中…</> : '确认下发'}
          </button>
        </div>
      </div>
    </div>
  );
}

function KpiCompareModal({ history, onClose }: { history: Array<{ at: Date; label: string; otd: number; changeoverLoss: number; utilization: number; wipValue: number }>; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" />
      <div onClick={(e) => e.stopPropagation()}
           className="relative w-full max-w-[760px] bg-card border border-line rounded-xl shadow-card overflow-hidden animate-modal-in">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-line">
          <BarChart3 size={14} className="text-brand" />
          <h3 className="text-[14px] font-semibold">KPI 对比 · 近 7 天 + 实时重排记录</h3>
          <button onClick={onClose} className="ml-auto w-8 h-8 rounded-md hover:bg-bg flex items-center justify-center text-ink-faint">
            <X size={16} />
          </button>
        </div>
        <div className="p-5">
          <div className="text-[11.5px] text-ink-dim mb-2.5">每次「重新排产」或「应用 A/B/C 方案」都会追加一条新记录，可直观对比算法效果：</div>
          <table className="w-full text-[12.5px]">
            <thead className="text-[11px] text-ink-faint">
              <tr className="text-left">
                <th className="py-1.5 pr-2 font-medium">时点</th>
                <th className="py-1.5 pr-2 font-medium text-right">OTD</th>
                <th className="py-1.5 pr-2 font-medium text-right">换型损失</th>
                <th className="py-1.5 pr-2 font-medium text-right">利用率</th>
                <th className="py-1.5 pr-2 font-medium">趋势</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h, i) => {
                const isLatest = i === history.length - 1;
                const isReSchedule = h.label.includes('*') || h.label.includes(':');
                return (
                  <tr key={i} className={`border-t border-line ${isLatest ? 'bg-brand-50' : ''}`}>
                    <td className="py-1.5 pr-2 font-mono text-[11.5px]">
                      {h.label}
                      {isLatest && <span className="ml-1 text-brand font-semibold">(最新)</span>}
                      {isReSchedule && <span className="ml-1 text-ai font-semibold text-[10px]">[重排]</span>}
                    </td>
                    <td className="py-1.5 pr-2 text-right tabular-nums text-ink font-semibold">{h.otd.toFixed(1)}%</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums text-warn">{h.changeoverLoss.toFixed(1)}%</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums text-info">{h.utilization.toFixed(1)}%</td>
                    <td className="py-1.5 pr-2">
                      <div className="flex items-center gap-1 h-3">
                        <div className="h-full bg-ok rounded" style={{ width: `${(h.otd - 85) * 5}px` }} title="OTD" />
                        <div className="h-full bg-warn rounded" style={{ width: `${(15 - h.changeoverLoss) * 5}px` }} title="换型(反向)" />
                        <div className="h-full bg-info rounded" style={{ width: `${(h.utilization - 70) * 2.5}px` }} title="利用率" />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="text-[11px] text-ink-faint mt-3 border-t border-line pt-2">
            💡 表格中带 [重排] 的行是 AI 实时重排产生的对比点；可点「重新排产」按钮再生成几条对比
          </div>
        </div>
      </div>
    </div>
  );
}
