// v2.2.2 · 异常工单 AI 分析 Modal
//   触发：工单管理列表里点击「✨ AI 异常分析」按钮
//   展示：变更日志时间线 + AI 判断维度 + 建议处置
import { X, Sparkles, Loader2, Check, AlertTriangle, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { WORK_ORDERS } from '../../mock/workOrders';
import { getAnomaly } from '../../mock/workOrderAnomalies';
import { getChangeLog, CHANGE_KIND_LABEL } from '../../mock/workOrderChangeLog';
import { fmtDateTime } from '../../utils/format';

interface Props {
  open: boolean;
  workOrderId: string | null;
  onClose: () => void;
  onApply: (woId: string) => void;
}

export default function AnomalyAnalysisModal({ open, workOrderId, onClose, onApply }: Props) {
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (open && workOrderId) {
      setLoading(true);
      const t = setTimeout(() => setLoading(false), 1400);
      return () => clearTimeout(t);
    }
  }, [open, workOrderId]);

  if (!open || !workOrderId) return null;
  const wo = WORK_ORDERS.find((w) => w.id === workOrderId);
  const ano = getAnomaly(workOrderId);
  if (!wo || !ano) return null;

  const log = getChangeLog(workOrderId);
  // AI 判断维度
  const indicators = ano.kind === 'frequent-change' ? [
    { label: '变更次数', value: `${log.length} 次`, base: '基线 ≤ 3 次', isAbnormal: true },
    { label: '客户经理介入', value: `${Math.min(3, Math.floor(log.length / 2))} 次`, base: '基线 ≤ 1 次', isAbnormal: true },
    { label: '工单创建天数', value: `${ano.detail.match(/(\d+)/)?.[1] ?? '15'} 天`, base: '基线正常', isAbnormal: false },
  ] : [
    { label: '工单年龄', value: ano.detail.match(/(\d+)/)?.[0] + ' 天', base: '基线 ≤ 14 天', isAbnormal: true },
    { label: '排产次数', value: '0 次', base: '基线 ≥ 1 次', isAbnormal: true },
    { label: '物料齐套', value: '部分齐套', base: '需排查物料', isAbnormal: true },
  ];
  const recommendations = ano.kind === 'frequent-change' ? [
    '建议销售部门与客户沟通确认需求稳定性后再启动排产',
    '建议将工单拆分为 2 张子工单分批生产，降低单次变更影响',
    '建议加强排产前的客户确认环节（要求订单冻结 48 小时）',
  ] : [
    '建议优先核查关联物料采购订单 PO-2026-xxx 到货状态',
    '建议触发缺料根因分析（Agent #10）排查上游因素',
    '建议联系客户确认是否仍需此订单，避免占用产能资源',
  ];

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" />
      <div onClick={(e) => e.stopPropagation()}
           className="relative w-full max-w-[760px] max-h-[88vh] bg-card border border-line rounded-xl shadow-card flex flex-col overflow-hidden animate-modal-in">
        <div className="h-1 bg-gradient-to-r from-ai via-purple-500 to-pink-400" />
        <div className="flex items-center gap-2 px-5 py-3 border-b border-line">
          <span className="ai-chip"><Sparkles size={11} />AI 分析</span>
          <h3 className="text-[14px] font-semibold">{workOrderId} · 异常工单识别分析</h3>
          <button onClick={onClose} className="ml-auto w-8 h-8 rounded-md hover:bg-bg flex items-center justify-center text-ink-faint">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-20 text-ai">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-[13.5px] font-medium">AI 基于变更日志 + 工单时序数据分析中…</span>
            </div>
          ) : (
            <div className="space-y-4 text-[12.5px]">
              {/* 摘要 */}
              <div className="rounded-md border-l-4 border-warn bg-warn/5 px-4 py-2.5 leading-relaxed">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle size={13} className="text-warn" />
                  <b className="text-warn">{ano.kind === 'frequent-change' ? '频繁变更' : '长期未开工'}</b>
                  <span className="text-ink-dim">· {wo.customer} · {wo.productName} · {wo.quantity}kg</span>
                </div>
                <div className="text-ink-dim">{ano.detail}</div>
              </div>

              {/* AI 判断维度 */}
              <section>
                <div className="text-[10.5px] text-ink-faint tracking-wider uppercase mb-2">AI 判断维度</div>
                <div className="grid grid-cols-3 gap-2">
                  {indicators.map((ind, i) => (
                    <div key={i} className={`rounded-md border px-3 py-2 ${ind.isAbnormal ? 'border-warn/40 bg-warn/5' : 'border-line'}`}>
                      <div className="text-[10.5px] text-ink-faint">{ind.label}</div>
                      <div className={`text-[14px] font-bold tabular-nums ${ind.isAbnormal ? 'text-warn' : 'text-ink'}`}>{ind.value}</div>
                      <div className="text-[10px] text-ink-faint mt-0.5">{ind.base}</div>
                    </div>
                  ))}
                </div>
              </section>

              {/* 变更日志时间线 */}
              <section>
                <div className="text-[10.5px] text-ink-faint tracking-wider uppercase mb-2">变更时间线（{log.length} 条 · AI 已分析）</div>
                <ol className="relative border-l-2 border-line ml-2 space-y-2">
                  {log.slice(0, 6).map((entry, i) => (
                    <li key={i} className="pl-3 ml-1 relative">
                      <div className="absolute -left-[5px] mt-1 w-2 h-2 rounded-full bg-warn" />
                      <div className="text-[11px] text-ink-faint flex items-center gap-2">
                        <Clock size={10} />{fmtDateTime(entry.at)} · {entry.operator}
                        <span className="ml-auto px-1.5 py-0.5 rounded bg-panel2 text-ink-dim text-[10px]">{CHANGE_KIND_LABEL[entry.kind]}</span>
                      </div>
                      <div className="text-[11.5px] text-ink mt-0.5">{entry.message}</div>
                    </li>
                  ))}
                </ol>
              </section>

              {/* 建议处置 */}
              <section>
                <div className="text-[10.5px] text-ink-faint tracking-wider uppercase mb-2">AI 建议处置</div>
                <ol className="space-y-1.5 pl-1">
                  {recommendations.map((r, i) => (
                    <li key={i} className="flex items-baseline gap-2 leading-relaxed">
                      <span className="text-ai font-bold flex-none w-5">{i + 1}.</span>
                      <span className="text-ink">{r}</span>
                    </li>
                  ))}
                </ol>
              </section>
            </div>
          )}
        </div>
        {!loading && (
          <div className="p-3 border-t border-line bg-panel2 flex justify-end gap-2">
            <button onClick={onClose} className="btn">关闭</button>
            <button
              onClick={() => onApply(workOrderId)}
              className="btn btn-ai"
            >
              <Check size={12} />标记为已处置（异常 KPI -1）
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
