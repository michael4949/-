// 系统设置 → AI Agent 治理 Tab（核心 Sprint 6 feature）
//   顶部：4 类别统计卡（对话式 / 观察式 / 解释器 / 生成器）
//   子页面选择：隐性约束待审 (#7) / 预警优化 (#20) / Agent 日志
import { useState } from 'react';
import { Sparkles, Activity, Lightbulb, ListChecks, MessagesSquare, Eye, FileText, Wand2 } from 'lucide-react';
import { AGENT_REGISTRY, CATEGORY_STATS, type AgentCategory } from '../../mock/agentRegistry';
import ImplicitConstraintsPanel from './ImplicitConstraintsPanel';
import NoiseFilterPanel from './NoiseFilterPanel';
import AgentLogPanel from './AgentLogPanel';

type SubTab = 'overview' | 'implicit' | 'noise' | 'log';

const CATEGORY_ICON: Record<AgentCategory, JSX.Element> = {
  对话式: <MessagesSquare size={14} className="text-ai" />,
  观察式: <Eye size={14} className="text-info" />,
  解释器: <FileText size={14} className="text-warn" />,
  生成器: <Wand2 size={14} className="text-ok" />,
};

export default function AIAgentGovernance() {
  const [sub, setSub] = useState<SubTab>('overview');

  return (
    <div className="space-y-4">
      {/* 4 类别统计卡 */}
      <section>
        <div className="text-[12px] font-semibold tracking-wider text-ink-dim uppercase mb-2.5">
          <Activity size={12} className="inline mr-1" />Agent 运行状态（{AGENT_REGISTRY.length} 个）
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {CATEGORY_STATS.map((s) => (
            <div key={s.category} className="card-base p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                {CATEGORY_ICON[s.category]}
                <span className="text-[12.5px] font-semibold">{s.category}</span>
                <span className="text-[11px] text-ink-faint">({s.total})</span>
                <span className="ml-auto text-[11px] text-ok">✓ {s.active}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11.5px]">
                <div>
                  <div className="text-ink-faint">今日触发</div>
                  <div className="text-[16px] font-bold text-ink tabular-nums">{s.todayTriggers}</div>
                </div>
                <div>
                  <div className="text-ink-faint">采纳率</div>
                  <div className="text-[16px] font-bold text-brand tabular-nums">{Math.round(s.avgAdoption * 100)}%</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 子页面切换 */}
      <section className="card-base">
        <div className="flex items-center px-4 py-2.5 border-b border-line bg-panel2">
          <span className="text-[12.5px] font-semibold mr-3">Agent 子页面：</span>
          <div className="flex gap-1">
            <SubTabBtn icon={<Sparkles size={11} />} label="Agent 总览" active={sub === 'overview'} onClick={() => setSub('overview')} />
            <SubTabBtn icon={<Lightbulb size={11} />} label="隐性约束待审" badge={3} active={sub === 'implicit'} onClick={() => setSub('implicit')} />
            <SubTabBtn icon={<ListChecks size={11} />} label="预警优化建议" badge={8} active={sub === 'noise'} onClick={() => setSub('noise')} />
            <SubTabBtn icon={<FileText size={11} />} label="Agent 日志" active={sub === 'log'} onClick={() => setSub('log')} />
          </div>
        </div>
        <div className="p-4">
          {sub === 'overview' && <AgentOverviewTable />}
          {sub === 'implicit' && <ImplicitConstraintsPanel />}
          {sub === 'noise'    && <NoiseFilterPanel />}
          {sub === 'log'      && <AgentLogPanel />}
        </div>
      </section>
    </div>
  );
}

function SubTabBtn({ icon, label, badge, active, onClick }: { icon: React.ReactNode; label: string; badge?: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`text-[11.5px] px-3 py-1.5 rounded-md font-medium transition-colors inline-flex items-center gap-1.5
                  ${active ? 'bg-ai text-white' : 'bg-card border border-line text-ink-dim hover:border-ai hover:text-ai'}`}
    >
      {icon}{label}
      {badge != null && (
        <span className={`tabular-nums text-[10px] font-bold ${active ? 'bg-white/30 text-white' : 'bg-ai/20 text-ai'} rounded-full px-1.5 py-0.5`}>
          {badge}
        </span>
      )}
    </button>
  );
}

function AgentOverviewTable() {
  return (
    <div>
      <div className="text-[10.5px] text-ink-faint tracking-wider uppercase mb-2">
        全部 {AGENT_REGISTRY.length} 个 Agent 元数据
      </div>
      <table className="w-full text-[12px]">
        <thead className="text-[11px] text-ink-faint bg-panel2">
          <tr className="text-left">
            <th className="px-2 py-1.5 font-medium w-8">#</th>
            <th className="px-2 py-1.5 font-medium">名称</th>
            <th className="px-2 py-1.5 font-medium">类别</th>
            <th className="px-2 py-1.5 font-medium">触点</th>
            <th className="px-2 py-1.5 font-medium">所属页</th>
            <th className="px-2 py-1.5 font-medium text-right">今日触发</th>
            <th className="px-2 py-1.5 font-medium text-right">采纳率</th>
            <th className="px-2 py-1.5 font-medium text-center">状态</th>
          </tr>
        </thead>
        <tbody>
          {AGENT_REGISTRY.map((a) => (
            <tr key={a.id} className="border-t border-line hover:bg-bg">
              <td className="px-2 py-1.5 font-mono text-[11px] text-ink-faint">{a.number}</td>
              <td className="px-2 py-1.5 text-ink font-medium">{a.name}</td>
              <td className="px-2 py-1.5">
                <span className={`tag ${
                  a.category === '对话式' ? 'bg-ai/15 text-ai'
                  : a.category === '观察式' ? 'bg-info/15 text-info'
                  : a.category === '解释器' ? 'bg-warn/15 text-warn'
                  : 'bg-ok/15 text-ok'
                }`}>{a.category}</span>
              </td>
              <td className="px-2 py-1.5 text-ink-dim text-[11.5px]">{a.touchpoint}</td>
              <td className="px-2 py-1.5 text-ink-dim text-[11px] font-mono">{a.page}</td>
              <td className="px-2 py-1.5 text-right tabular-nums text-ink">{a.todayTriggers}</td>
              <td className="px-2 py-1.5 text-right tabular-nums text-brand font-semibold">{Math.round(a.adoptionRate * 100)}%</td>
              <td className="px-2 py-1.5 text-center">
                <span className={`tag ${a.status === 'active' ? 'bg-ok/15 text-ok' : 'bg-ink-faint/15 text-ink-faint'}`}>
                  {a.status === 'active' ? '✓ 运行中' : '已暂停'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
