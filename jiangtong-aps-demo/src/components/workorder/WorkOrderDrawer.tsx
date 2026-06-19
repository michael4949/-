// 工单管理页：右侧详情抽屉
//   基础信息 + 工艺路径 + 变更日志 + ✨ AI 推荐 BOM 按钮（仅样品工单）
import { X, Route, Clock, Sparkles, AlertTriangle, ScrollText } from 'lucide-react';
import { WORK_ORDERS } from '../../mock/workOrders';
import { RESOURCES } from '../../mock/productLines';
import { fmtDate, fmtDateTime } from '../../utils/format';
import { PRIORITY_LABEL, STATUS_LABEL } from '../../types/workOrder';
import { getAnomaly } from '../../mock/workOrderAnomalies';
import { getChangeLog, CHANGE_KIND_LABEL } from '../../mock/workOrderChangeLog';
import { isSample } from '../../mock/sampleWorkOrders';
import AIButton from '../ai/AIButton';

interface Props {
  workOrderId: string | null;
  onClose: () => void;
  onRequestBOM: (woId: string) => void;
}

const ROUTE_DESC: Record<string, string[]> = {
  P1: ['粗拉', '中拉', '小拉', '退火 + 涂漆', '检验'],
  P2: ['粗拉', '中拉', '退火 + 镀锡', '收线', '检验'],
  P3: ['粗拉', '退火', '绞合', '收线', '检验'],
  P4: ['粗拉', '中拉', '退火', '收线', '检验'],
  P5: ['连铸', '轧制', '冷却', '检验', '入库'],
};

export default function WorkOrderDrawer({ workOrderId, onClose, onRequestBOM }: Props) {
  if (!workOrderId) return null;
  const wo = WORK_ORDERS.find((w) => w.id === workOrderId);
  if (!wo) return null;

  const res = wo.scheduledResourceId ? RESOURCES.find((r) => r.id === wo.scheduledResourceId) : undefined;
  const ano = getAnomaly(wo.id);
  const sample = isSample(wo.id);
  const log = getChangeLog(wo.id);
  const route = ROUTE_DESC[wo.routeId] ?? [];
  const prioColor =
    wo.priority === 'urgent' ? 'text-danger'
    : wo.priority === 'important' ? 'text-warn'
    : 'text-info';

  return (
    <div className="fixed inset-0 z-[9000] flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-ink/20 backdrop-blur-[1px]" />
      <aside
        onClick={(e) => e.stopPropagation()}
        className="relative w-[460px] max-w-[92vw] h-full bg-card border-l border-line shadow-card flex flex-col animate-slide-in-r"
      >
        {/* 头部 */}
        <div className="px-4 py-3 border-b border-line bg-panel2 flex items-center gap-2">
          <div>
            <div className="text-[10.5px] text-ink-faint tracking-wider uppercase">工单详情</div>
            <div className="text-[15px] font-bold font-mono mt-0.5">{wo.id}</div>
          </div>
          {sample && (
            <span className="ai-chip ml-2">
              <Sparkles size={11} /> 样品工单
            </span>
          )}
          {ano && (
            <span className="inline-flex items-center gap-1 text-[10.5px] px-1.5 py-0.5 rounded bg-warn/15 text-warn font-semibold ml-1">
              <AlertTriangle size={10} /> {ano.kind === 'frequent-change' ? '频繁变更' : '长期未开工'}
            </span>
          )}
          <button onClick={onClose} className="ml-auto w-8 h-8 rounded-md hover:bg-bg flex items-center justify-center text-ink-faint">
            <X size={16} />
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-[12.5px]">
          {/* 异常说明 */}
          {ano && (
            <div className="rounded-md border border-warn/30 bg-warn/5 p-3 text-[12px] text-ink leading-relaxed">
              <span className="font-semibold text-warn">⚠ 异常提示：</span>{ano.detail}
            </div>
          )}

          {/* 基础信息 */}
          <section>
            <SectionTitle>基础信息</SectionTitle>
            <Field label="客户"   value={wo.customer} />
            <Field label="产品"   value={wo.productName} />
            <Field label="数量"   value={`${wo.quantity} kg`} />
            <Field label="交期"   value={fmtDate(wo.dueDate)} />
            <Field label="优先级" value={<span className={`font-semibold ${prioColor}`}>{PRIORITY_LABEL[wo.priority]}</span>} />
            <Field label="状态"   value={STATUS_LABEL[wo.status]} />
            {wo.scheduledStart && (
              <>
                <Field label="排到"     value={res?.name ?? wo.scheduledResourceId} />
                <Field label="计划开工" value={fmtDateTime(wo.scheduledStart)} />
                <Field label="计划完工" value={wo.scheduledEnd ? fmtDateTime(wo.scheduledEnd) : '-'} />
              </>
            )}
          </section>

          {/* 工艺路径 */}
          <section>
            <SectionTitle><Route size={12} className="inline mr-1" />工艺路径（{wo.routeId}）</SectionTitle>
            <div className="flex gap-1 items-center flex-wrap">
              {route.map((step, i) => (
                <span key={i} className="inline-flex items-center">
                  <span className="px-2 py-1 rounded-md bg-panel2 border border-line text-[11.5px] text-ink-dim">
                    {i + 1}. {step}
                  </span>
                  {i < route.length - 1 && <span className="mx-1 text-ink-faint">›</span>}
                </span>
              ))}
            </div>
          </section>

          {/* 变更日志 */}
          <section>
            <SectionTitle><ScrollText size={12} className="inline mr-1" />变更日志（{log.length} 条）</SectionTitle>
            <ol className="relative border-l-2 border-line ml-2 space-y-2.5">
              {log.map((entry, i) => (
                <li key={i} className="pl-3 ml-1">
                  <div className="absolute -left-[5px] mt-1.5 w-2 h-2 rounded-full bg-brand" />
                  <div className="text-[11.5px] text-ink-faint flex items-center gap-2">
                    <Clock size={10} />
                    {fmtDateTime(entry.at)} · {entry.operator}
                    <span className="ml-auto px-1.5 py-0.5 rounded bg-panel2 text-ink-dim text-[10px]">
                      {CHANGE_KIND_LABEL[entry.kind]}
                    </span>
                  </div>
                  <div className="text-[12px] text-ink mt-0.5">{entry.message}</div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {/* 操作按钮 */}
        <div className="border-t border-line p-3 bg-panel2 space-y-2">
          {sample && (
            <AIButton label="AI 推荐 BOM" onClick={() => onRequestBOM(wo.id)} />
          )}
          <div className="flex gap-2">
            <button className="btn flex-1">📝 变更</button>
            <button className="btn flex-1">📂 拆分</button>
            <button className="btn flex-1">🔒 锁定</button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10.5px] text-ink-faint tracking-wider uppercase mb-2">{children}</div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3 mb-1">
      <div className="w-16 flex-none text-[11.5px] text-ink-faint">{label}</div>
      <div className="flex-1 text-ink font-medium">{value}</div>
    </div>
  );
}
