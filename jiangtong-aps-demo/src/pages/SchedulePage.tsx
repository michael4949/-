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

  // ★ 重新排产：复用 applyWeights() 的重算 KPI 逻辑
  async function onReSchedule() {
    setReRunning(true);
    await applyWeights();
    setReRunning(false);
    showToast(`已重新排产 · OTD ${fmtPct(useScheduleStore.getState().kpi.otd)} · 换型损失 ${fmtPct(useScheduleStore.getState().kpi.changeoverLoss)}`);
  }

  // ★ 排产模拟：1.2s 后展示预测 KPI 对比
  async function onSimulate() {
    setSimulateOpen(true);
    setSimulateLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setSimulateLoading(false);
  }

  // ★ 下发计划：确认 Modal → 2s 模拟 MES 推送
  function onDispatch() { setDispatchOpen(true); }
  async function confirmDispatch() {
    setDispatchSending(true);
    await new Promise((r) => setTimeout(r, 1800));
    setDispatchSending(false);
    setDispatchOpen(false);
    showToast(`✓ 已下发 ${scheduled.length} 张工单至 MES（mock）· 计划版本 V0715-1`);
  }

  // ★ 导出：模拟生成 CSV
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

      {/* ★ v2.2.1 排产模拟 Modal */}
      {simulateOpen && (
        <SimulateModal loading={simulateLoading} kpi={kpi} onClose={() => setSimulateOpen(false)} />
      )}

      {/* ★ v2.2.1 下发计划确认 Modal */}
      {dispatchOpen && (
        <DispatchModal
          sending={dispatchSending}
          count={scheduled.length}
          workshop={WORKSHOP_LABEL[workshop]}
          onClose={() => !dispatchSending && setDispatchOpen(false)}
          onConfirm={confirmDispatch}
        />
      )}

      {/* ★ v2.2.1 KPI 对比 Modal */}
      {kpiCompareOpen && (
        <KpiCompareModal current={kpi} onClose={() => setKpiCompareOpen(false)} />
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

function KpiCompareModal({ current, onClose }: { current: { otd: number; changeoverLoss: number; utilization: number; wipValue: number }; onClose: () => void }) {
  // 7 天历史 KPI 趋势（mock）
  const history = [
    { date: '7/09', otd: 89.5, co: 13.8, util: 76.2 },
    { date: '7/10', otd: 90.1, co: 13.4, util: 76.8 },
    { date: '7/11', otd: 90.2, co: 13.1, util: 77.0 },
    { date: '7/12', otd: 90.7, co: 12.9, util: 77.5 },
    { date: '7/13', otd: 91.0, co: 12.8, util: 77.9 },
    { date: '7/14', otd: 91.2, co: 12.7, util: 78.1 },
    { date: '7/15', otd: current.otd, co: current.changeoverLoss, util: current.utilization },
  ];
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" />
      <div onClick={(e) => e.stopPropagation()}
           className="relative w-full max-w-[720px] bg-card border border-line rounded-xl shadow-card overflow-hidden animate-modal-in">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-line">
          <BarChart3 size={14} className="text-brand" />
          <h3 className="text-[14px] font-semibold">KPI 对比 · 近 7 天趋势</h3>
          <button onClick={onClose} className="ml-auto w-8 h-8 rounded-md hover:bg-bg flex items-center justify-center text-ink-faint">
            <X size={16} />
          </button>
        </div>
        <div className="p-5">
          <table className="w-full text-[12.5px]">
            <thead className="text-[11px] text-ink-faint">
              <tr className="text-left">
                <th className="py-1.5 pr-2 font-medium">日期</th>
                <th className="py-1.5 pr-2 font-medium text-right">OTD</th>
                <th className="py-1.5 pr-2 font-medium text-right">换型损失</th>
                <th className="py-1.5 pr-2 font-medium text-right">利用率</th>
                <th className="py-1.5 pr-2 font-medium">趋势条</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h, i) => {
                const isToday = i === history.length - 1;
                return (
                  <tr key={h.date} className={`border-t border-line ${isToday ? 'bg-brand-50' : ''}`}>
                    <td className="py-1.5 pr-2 font-mono text-[11.5px]">{h.date}{isToday && <span className="ml-1 text-brand font-semibold">(今日)</span>}</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums text-ink font-semibold">{h.otd.toFixed(1)}%</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums text-warn">{h.co.toFixed(1)}%</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums text-info">{h.util.toFixed(1)}%</td>
                    <td className="py-1.5 pr-2">
                      <div className="flex items-center gap-1 h-3">
                        <div className="h-full bg-ok rounded" style={{ width: `${(h.otd - 85) * 5}px` }} title="OTD" />
                        <div className="h-full bg-warn rounded" style={{ width: `${(15 - h.co) * 5}px` }} title="换型(反向)" />
                        <div className="h-full bg-info rounded" style={{ width: `${(h.util - 70) * 2.5}px` }} title="利用率" />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="text-[11px] text-ink-faint mt-3 border-t border-line pt-2">
            💡 近 7 天 OTD 稳定上升（+1.7pp），换型损失下降（-1.1pp），表明算法权重调整对生产指标有正向影响
          </div>
        </div>
      </div>
    </div>
  );
}
