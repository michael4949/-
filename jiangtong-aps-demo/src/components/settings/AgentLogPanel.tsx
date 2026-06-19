// Agent 日志 · 治理 Tab 子页
import { Clock } from 'lucide-react';
import { AGENT_LOGS } from '../../mock/agentRegistry';
import { fmtDateTime } from '../../utils/format';

const ACTION_TAG: Record<string, string> = {
  trigger: 'bg-info/15 text-info',
  adopt:   'bg-ok/15 text-ok',
  reject:  'bg-danger/15 text-danger',
  dismiss: 'bg-ink-faint/15 text-ink-faint',
};
const ACTION_LABEL: Record<string, string> = {
  trigger: '触发',
  adopt:   '采纳',
  reject:  '驳回',
  dismiss: '忽略',
};

export default function AgentLogPanel() {
  return (
    <div className="space-y-3">
      <div className="flex items-center">
        <Clock size={13} className="text-ai mr-1.5" />
        <span className="text-[12.5px] font-semibold">Agent 调用日志（最近 {AGENT_LOGS.length} 条）</span>
      </div>
      <table className="w-full text-[12px]">
        <thead className="text-[11px] text-ink-faint bg-panel2">
          <tr className="text-left">
            <th className="px-2 py-1.5 font-medium">时间</th>
            <th className="px-2 py-1.5 font-medium w-8">#</th>
            <th className="px-2 py-1.5 font-medium">Agent</th>
            <th className="px-2 py-1.5 font-medium">用户</th>
            <th className="px-2 py-1.5 font-medium">动作</th>
            <th className="px-2 py-1.5 font-medium">结果</th>
          </tr>
        </thead>
        <tbody>
          {AGENT_LOGS.map((log, i) => (
            <tr key={i} className="border-t border-line hover:bg-bg">
              <td className="px-2 py-1.5 text-ink-dim tabular-nums whitespace-nowrap">{fmtDateTime(log.at)}</td>
              <td className="px-2 py-1.5 font-mono text-[11px] text-ink-faint">{log.agentNumber}</td>
              <td className="px-2 py-1.5 text-ink font-medium">{log.agentName}</td>
              <td className="px-2 py-1.5 text-ink-dim">{log.user}</td>
              <td className="px-2 py-1.5">
                <span className={`tag ${ACTION_TAG[log.action]}`}>{ACTION_LABEL[log.action]}</span>
              </td>
              <td className="px-2 py-1.5 text-ink-dim text-[11.5px]">{log.result}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
