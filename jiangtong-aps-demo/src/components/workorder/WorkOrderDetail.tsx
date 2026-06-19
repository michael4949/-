// 右侧详情：选中工单后展示信息 + ✨ Agent #2 解释为何这样排
//                                  + ★ v2.1 Agent #6 推荐配股方案（仅 stranded 工单显示）
import { useScheduleStore } from '../../store/useScheduleStore';
import { useExplainStore } from '../../store/useExplainStore';
import { useCopilotStore } from '../../store/useCopilotStore';
import { fmtDate, fmtDateTime } from '../../utils/format';
import { PRIORITY_LABEL, STATUS_LABEL } from '../../types/workOrder';
import { RESOURCES } from '../../mock/productLines';
import { mockAIInvoke } from '../../utils/mockApi';
import AIButton from '../ai/AIButton';
import StrandingSchemeCard from '../ai/StrandingSchemeCard';
import type { SchemeExplanation, StrandingConfigOutput, StrandingScheme } from '../../mock/agentResponses';

export default function WorkOrderDetail() {
  const selectedId = useScheduleStore((s) => s.selectedId);
  const pending = useScheduleStore((s) => s.pending);
  const scheduled = useScheduleStore((s) => s.scheduled);
  const unschedule = useScheduleStore((s) => s.unschedule);
  const applyStranding = useScheduleStore((s) => s.applyStrandingConfig);
  const show = useExplainStore((s) => s.show);
  const showLoading = useExplainStore((s) => s.showLoading);
  const pushMessage = useCopilotStore((s) => s.pushMessage);
  const setCopOpen = useCopilotStore((s) => s.setOpen);

  const wo = scheduled.find((w) => w.id === selectedId) ?? pending.find((w) => w.id === selectedId);
  const res = wo?.scheduledResourceId ? RESOURCES.find((r) => r.id === wo.scheduledResourceId) : undefined;
  const isScheduled = !!(wo?.scheduledStart && wo?.scheduledEnd && wo?.scheduledResourceId);
  // v2.1 D2 决策：以业务语义判定（productCategory === 'stranded'），不依赖 routeId 数字
  const isStranded = wo?.productCategory === 'stranded';

  if (!wo) {
    return (
      <div className="bg-card border border-line rounded-xl p-6 text-center text-[12.5px] text-ink-faint h-full flex items-center justify-center">
        从甘特图或待排池<br />选择工单查看详情
      </div>
    );
  }

  const prioColor =
    wo.priority === 'urgent' ? 'text-danger'
    : wo.priority === 'important' ? 'text-warn'
    : 'text-info';

  async function onExplain() {
    if (!wo || !res || !isScheduled) return;
    showLoading('排产方案解释');
    const { output } = await mockAIInvoke({
      agentId: 'schedule.scheme-explainer',
      input: { workOrderId: wo.id },
      context: { wo, resourceName: res.name },
    });
    const r = output as SchemeExplanation;
    show({
      title: `${r.workOrder.id} · ${r.workOrder.product}`,
      content: (
        <div className="space-y-4">
          <div className="bg-panel2 rounded-md px-4 py-2.5 text-[12px] leading-relaxed">
            <b className="text-ink">排到：</b>{r.workOrder.resource} ·
            <b className="text-ink"> 时段：</b>{r.workOrder.window} ·
            <b className="text-ink"> 数量：</b>{r.workOrder.quantity}kg
          </div>
          <p>该工单（{r.workOrder.id}，{r.workOrder.product}）被排到 <b className="text-ink">{r.workOrder.resource} 的 {r.workOrder.window}</b> 时段，主要原因是：</p>
          <ol className="space-y-3 pl-1 list-decimal list-inside">
            {r.sections.map((sec, idx) => (
              <li key={idx} className="leading-7">
                <b className="text-ink">{sec.title}</b>：{sec.body}
              </li>
            ))}
          </ol>
        </div>
      ),
    });
  }

  // ★ v2.1 Agent #6 推荐配股方案
  async function onStranding() {
    if (!wo || !isStranded) return;
    // 解析工单产品名中的股数与线径，例 "19 股 ×Φ0.5mm 镀锡铜绞线"
    const m1 = wo.productName.match(/(\d+)\s*股/);
    const m2 = wo.productName.match(/Φ?(\d?\.\d+)\s*mm/);
    const totalStrands = m1 ? Number(m1[1]) : 19;
    const strandDiameter = m2 ? Number(m2[1]) : 0.5;
    const plating: 'tin' | 'bare' | 'enameled' =
      /镀锡/.test(wo.productName) ? 'tin'
      : /漆包/.test(wo.productName) ? 'enameled'
      : 'bare';

    showLoading('AI 推荐配股方案 · 多目标优化中…');
    const { output } = await mockAIInvoke({
      agentId: 'schedule.stranding-config-assistant',
      input: {
        workOrderId: wo.id,
        customer: wo.customer,
        totalStrands, strandDiameter, plating,
        quantity: wo.quantity,
      },
    });
    const r = output as StrandingConfigOutput;
    // D4 决策：Modal 展示方案，同时往 Copilot 推一条系统消息（"同步展开方案对话"）
    pushMessage({
      id: 'sys-stranding-' + Date.now(),
      role: 'assistant',
      content: `**配股建议** · ${r.request.customer} · ${r.request.totalStrands} 股 × Φ${r.request.strandDiameter}mm ${r.request.plating === 'tin' ? '镀锡' : r.request.plating === 'enameled' ? '漆包' : ''}铜绞线 · ${r.request.quantity}kg。三套方案见下方对比卡；选定后可在此追问 "如果以质量为先该选哪个？"`,
      attachments: [{ type: 'stranding-config', data: r }],
      timestamp: new Date(),
    });
    show({
      title: `${wo.id} · 配股方案推荐`,
      content: (
        <div className="space-y-3">
          <div className="bg-panel2 rounded-md px-4 py-2.5 text-[12.5px] leading-relaxed">
            <b className="text-ink">订单：</b>{r.request.customer} · {r.request.quantity}kg · {r.request.totalStrands} 股 × Φ{r.request.strandDiameter}mm{' '}
            {r.request.plating === 'tin' ? '镀锡' : r.request.plating === 'enameled' ? '漆包' : ''}铜绞线 ·
            <b className="text-ink"> 交期：</b>{r.request.dueDate}
          </div>
          <div className="text-[12.5px] text-ink-dim leading-7">{r.decisionFactors}</div>
          <StrandingSchemeCard
            schemes={r.schemes}
            appliedId={null}
            onApply={(s) => onApplyStrandingScheme(s, r)}
          />
          <div className="text-[11.5px] text-ink-faint pt-2 border-t border-line">
            💡 已同步至 AI 助手 · 关闭此窗口后可点击右下角"AI 助手"继续追问
          </div>
        </div>
      ),
    });
  }

  function onApplyStrandingScheme(s: StrandingScheme, r: StrandingConfigOutput) {
    if (!wo) return;
    applyStranding(wo.id, s, r);
    pushMessage({
      id: 'sys-stranding-apply-' + Date.now(),
      role: 'assistant',
      content: `已应用 **${s.label}**：${s.composition.length === 1 ? `单源 ${s.composition[0].from}` : `${s.composition.length} 源（${s.composition.map((c) => c.from).join(' / ')}）`} 已生成 BOM 并锁定，该工单已写入排产甘特图并在闪烁标记中。`,
      timestamp: new Date(),
    });
    useExplainStore.getState().close();
    setCopOpen(true);
  }

  return (
    <div className="bg-card border border-line rounded-xl flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-line bg-panel2">
        <div className="text-[10.5px] text-ink-faint tracking-wider uppercase">选中工单</div>
        <div className="text-[14px] font-bold font-mono mt-0.5">{wo.id}</div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 text-[12.5px]">
        <Field label="客户" value={wo.customer} />
        <Field label="产品" value={wo.productName} />
        <Field label="数量" value={`${wo.quantity} kg`} />
        <Field label="交期" value={fmtDate(wo.dueDate)} />
        <Field label="优先级" value={<span className={`font-semibold ${prioColor}`}>{PRIORITY_LABEL[wo.priority]}</span>} />
        <Field label="状态" value={STATUS_LABEL[wo.status]} />
        {wo.scheduledStart && (
          <>
            <hr className="border-line" />
            <Field label="排到" value={res?.name ?? wo.scheduledResourceId} />
            <Field label="计划开工" value={fmtDateTime(wo.scheduledStart)} />
            <Field label="计划完工" value={wo.scheduledEnd ? fmtDateTime(wo.scheduledEnd) : '-'} />
          </>
        )}
      </div>
      <div className="border-t border-line p-3 bg-panel2 space-y-2">
        <div className="text-[10.5px] text-ink-faint tracking-wider uppercase">AI 推荐</div>

        {/* ★ v2.1 仅 stranded 工单显示 */}
        {isStranded && (
          <AIButton label="推荐配股方案" onClick={onStranding} />
        )}

        <AIButton
          label="解释为何这样排"
          onClick={onExplain}
          disabled={!isScheduled}
        />
        {!isScheduled && !isStranded && (
          <div className="text-[11px] text-ink-faint">待排工单暂无排产解释</div>
        )}
        {!isScheduled && isStranded && (
          <div className="text-[11px] text-ink-faint">配股完成后即可解释排产</div>
        )}
        {isScheduled && (
          <button onClick={() => unschedule(wo.id)} className="btn w-full text-ink-dim">
            ↺ 退回待排池
          </button>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3">
      <div className="w-16 flex-none text-[11.5px] text-ink-faint">{label}</div>
      <div className="flex-1 text-ink font-medium">{value}</div>
    </div>
  );
}
