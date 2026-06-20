// §19 异常预警中心完整页
import { useState } from 'react';
import { AlertTriangle, Sparkles, X, Wand2, Loader2, Check } from 'lucide-react';
import AlertKPIBar from '../components/alerts/AlertKPIBar';
import AlertEventTable from '../components/alerts/AlertEventTable';
import AlertCauseExplainModal from '../components/ai/AlertCauseExplainModal';
import AICapabilityBanner from '../components/ai/AICapabilityBanner';
import { mockAIInvoke } from '../utils/mockApi';
import { useCopilotStore } from '../store/useCopilotStore';
import { useAlertOpsStore } from '../store/useAlertOpsStore';
import type { AlertCauseExplainOutput, NoiseFilterCandidate, NoiseFilterOutput } from '../mock/agentResponses.sprint6';
import type { AlertEvent } from '../mock/alerts';

export default function AlertsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [output, setOutput] = useState<AlertCauseExplainOutput | null>(null);
  const [noiseOpen, setNoiseOpen] = useState(false);
  const [noiseLoading, setNoiseLoading] = useState(false);
  const [noiseOutput, setNoiseOutput] = useState<NoiseFilterOutput | null>(null);
  const pushMessage = useCopilotStore((s) => s.pushMessage);
  const applyNoiseFilter = useAlertOpsStore((s) => s.applyNoiseFilter);
  const downgradedKeys = useAlertOpsStore((s) => s.downgradedKeys);
  const markExplained = useAlertOpsStore((s) => s.markExplained);

  async function onExplain(event: AlertEvent) {
    setModalOpen(true);
    setModalLoading(true);
    setOutput(null);
    markExplained(event.id);   // ★ v2.2.2 标记该预警已分析过（行内显示"✓已分析"）
    const { output: r } = await mockAIInvoke({
      agentId: 'alert.cause-explainer',
      input: { alertId: event.id },
    });
    const o = r as AlertCauseExplainOutput;
    setOutput(o);
    setModalLoading(false);
    pushMessage({
      id: 'sys-alert-cause-' + Date.now(),
      role: 'assistant',
      content: `**${o.alertId} 预警归因报告**\n\n类型：${o.alertType}\n${o.causes.length} 个根因因素 · 过去 30 天同类预警 ${o.recurrence.past30days} 次。详见 Modal。`,
      attachments: [{ type: 'alert-cause', data: o }],
      timestamp: new Date(),
    });
  }

  async function onOpenNoiseFilter() {
    setNoiseOpen(true);
    setNoiseLoading(true);
    setNoiseOutput(null);
    const { output: r } = await mockAIInvoke({
      agentId: 'alert.noise-filter',
      input: {},
    });
    setNoiseOutput(r as NoiseFilterOutput);
    setNoiseLoading(false);
  }

  function onApplyNoiseCandidate(c: NoiseFilterCandidate) {
    // ★ 系统真联动：把该类型+对应等级的预警过滤掉
    const lvl = c.alertType === '设备' || c.alertType === '损耗' || c.alertType === '产能' ? 'info'
              : c.alertType === '质量' ? 'important'
              : 'info';
    applyNoiseFilter(c.alertType as AlertEvent['type'], lvl as AlertEvent['level']);
    pushMessage({
      id: 'sys-noise-apply-' + Date.now(),
      role: 'assistant',
      content: `**已应用 #20 噪声过滤** · ${c.id} · ${c.alertType}\n\n动作：${c.suggestedAction === 'downgrade' ? '降级' : c.suggestedAction === 'suppress' ? '抑制' : '合并'}\n\n👉 系统响应：① 顶部 KPI「未处理」即时下降，「本周已处理」上升；② 列表中匹配的预警标 ↓AI 并移至已忽略；③ 后续同类预警将自动按此规则处理`,
      timestamp: new Date(),
    });
  }

  function onApplyAllNoiseCandidates() {
    if (!noiseOutput) return;
    noiseOutput.candidates.forEach(onApplyNoiseCandidate);
    setNoiseOpen(false);
  }

  return (
    <div className="flex flex-col h-full p-4 gap-3 min-h-0">
      <div className="flex items-center gap-3 flex-wrap flex-none">
        <h1 className="text-[18px] font-semibold tracking-wide flex items-center gap-2">
          <AlertTriangle size={20} className="text-warn" />
          异常预警中心
        </h1>
        <span className="text-[12.5px] text-ink-faint ml-2">实时事件 · 每分钟刷新</span>
        <button onClick={onOpenNoiseFilter} className="ml-auto btn btn-ai" title="启动 Agent #20 噪声过滤分析">
          <Sparkles size={13} />AI 噪声过滤
          {downgradedKeys.size > 0 && (
            <span className="ml-1 text-[10px] bg-white/30 rounded-full px-1.5 tabular-nums">已应用 {downgradedKeys.size}</span>
          )}
        </button>
      </div>

      <AICapabilityBanner
        capabilities={[
          { num: 19, name: '预警归因 Agent',   touchpoint: '每条预警右侧 ✨ AI 归因 按钮 → 根因报告 Modal',                   type: 'modal' },
          { num: 20, name: '预警噪声过滤',     touchpoint: '顶部 ✨ AI 噪声过滤 按钮 → 选规则应用 → 列表实时减少',           type: 'modal' },
        ]}
      />

      <AlertKPIBar />

      <div className="flex-1 min-h-0">
        <AlertEventTable onExplain={onExplain} />
      </div>

      <AlertCauseExplainModal
        open={modalOpen}
        loading={modalLoading}
        output={output}
        onClose={() => setModalOpen(false)}
      />

      {/* ★ v2.2.2 噪声过滤 Modal — 真正交互式 */}
      {noiseOpen && (
        <NoiseFilterApplyModal
          loading={noiseLoading}
          output={noiseOutput}
          downgraded={downgradedKeys}
          onClose={() => setNoiseOpen(false)}
          onApplyOne={onApplyNoiseCandidate}
          onApplyAll={onApplyAllNoiseCandidates}
        />
      )}
    </div>
  );
}

function NoiseFilterApplyModal({ loading, output, downgraded, onClose, onApplyOne, onApplyAll }: {
  loading: boolean;
  output: NoiseFilterOutput | null;
  downgraded: Set<string>;
  onClose: () => void;
  onApplyOne: (c: NoiseFilterCandidate) => void;
  onApplyAll: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" />
      <div onClick={(e) => e.stopPropagation()}
           className="relative w-full max-w-[860px] max-h-[88vh] bg-card border border-line rounded-xl shadow-card flex flex-col overflow-hidden animate-modal-in">
        <div className="h-1 bg-gradient-to-r from-ai via-purple-500 to-pink-400" />
        <div className="flex items-center gap-2 px-5 py-3 border-b border-line">
          <span className="ai-chip"><Sparkles size={11} />AI 分析</span>
          <h3 className="text-[14px] font-semibold">预警噪声过滤 · 8 条优化建议</h3>
          <button onClick={onClose} className="ml-auto w-8 h-8 rounded-md hover:bg-bg flex items-center justify-center text-ink-faint">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {loading || !output ? (
            <div className="flex items-center justify-center gap-3 py-20 text-ai">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-[13.5px] font-medium">AI 分析过去 30 天预警响应数据中…</span>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-md bg-ai-bg/40 border-l-4 border-ai p-3 text-[12.5px] text-ink-dim leading-relaxed">
                {output.summary}。点单条「应用」立即生效 → 顶部 KPI 实时下降，列表中对应预警移至已忽略。
              </div>
              <button onClick={onApplyAll} className="btn btn-ai w-full justify-center">
                <Wand2 size={13} />批量应用全部 {output.candidates.length} 条
              </button>
              <table className="w-full text-[12px]">
                <thead className="text-[11px] text-ink-faint">
                  <tr className="text-left">
                    <th className="px-2 py-1.5 font-medium w-12">ID</th>
                    <th className="px-2 py-1.5 font-medium w-12">类型</th>
                    <th className="px-2 py-1.5 font-medium">代表预警</th>
                    <th className="px-2 py-1.5 font-medium text-right">响应率</th>
                    <th className="px-2 py-1.5 font-medium">动作</th>
                    <th className="px-2 py-1.5 font-medium text-right w-20">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {output.candidates.map((c) => {
                    const lvl = c.alertType === '设备' || c.alertType === '损耗' || c.alertType === '产能' ? 'info'
                              : c.alertType === '质量' ? 'important'
                              : 'info';
                    const ap = downgraded.has(`${c.alertType}:${lvl}`);
                    return (
                      <tr key={c.id} className={`border-t border-line ${ap ? 'opacity-60' : 'hover:bg-bg'}`}>
                        <td className="px-2 py-1.5 font-mono text-[10.5px] text-ink-faint">{c.id}</td>
                        <td className="px-2 py-1.5"><span className="tag bg-ink-faint/15 text-ink-dim">{c.alertType}</span></td>
                        <td className="px-2 py-1.5 text-ink-dim text-[11px] truncate max-w-[280px]" title={c.exampleTitle}>{c.exampleTitle}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums text-warn font-semibold">{Math.round(c.responseRate * 100)}%</td>
                        <td className="px-2 py-1.5 text-[11px] text-ai">{c.suggestedAction === 'downgrade' ? '降级' : c.suggestedAction === 'suppress' ? '抑制' : '合并'}</td>
                        <td className="px-2 py-1.5 text-right">
                          {ap ? (
                            <span className="text-[11px] text-ok font-semibold inline-flex items-center gap-0.5"><Check size={10} />已应用</span>
                          ) : (
                            <button onClick={() => onApplyOne(c)} className="btn btn-sm btn-ai">
                              <Check size={10} />应用
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
