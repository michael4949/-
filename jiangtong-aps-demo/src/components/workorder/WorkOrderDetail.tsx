// 右侧详情：选中工单后展示信息 + ✨ Agent #2 解释为何这样排
import { useScheduleStore } from '../../store/useScheduleStore';
import { useExplainStore } from '../../store/useExplainStore';
import { fmtDate, fmtDateTime } from '../../utils/format';
import { PRIORITY_LABEL, STATUS_LABEL } from '../../types/workOrder';
import { RESOURCES } from '../../mock/productLines';
import { Sparkles } from 'lucide-react';
import { mockAIInvoke } from '../../utils/mockApi';
import AIButton from '../ai/AIButton';
import type { SchemeExplanation } from '../../mock/agentResponses';

export default function WorkOrderDetail() {
  const selectedId = useScheduleStore((s) => s.selectedId);
  const pending = useScheduleStore((s) => s.pending);
  const scheduled = useScheduleStore((s) => s.scheduled);
  const unschedule = useScheduleStore((s) => s.unschedule);
  const show = useExplainStore((s) => s.show);
  const showLoading = useExplainStore((s) => s.showLoading);

  const wo = scheduled.find((w) => w.id === selectedId) ?? pending.find((w) => w.id === selectedId);
  const res = wo?.scheduledResourceId ? RESOURCES.find((r) => r.id === wo.scheduledResourceId) : undefined;
  const isScheduled = !!(wo?.scheduledStart && wo?.scheduledEnd && wo?.scheduledResourceId);

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
        <AIButton
          label="解释为何这样排"
          onClick={onExplain}
          disabled={!isScheduled}
        />
        {!isScheduled && (
          <div className="text-[11px] text-ink-faint">待排工单暂无排产解释</div>
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
