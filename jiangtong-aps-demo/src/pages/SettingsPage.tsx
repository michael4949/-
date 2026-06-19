// §20 系统设置完整页
//   4 个 Tab：基础数据 / 规则配置 / 用户权限 / ★ AI Agent 治理
//   仅管理员可见 AI 治理 Tab（用户角色判断省略，演示中默认管理员）
import { useState } from 'react';
import { Settings, Database, SlidersHorizontal, Users, Sparkles } from 'lucide-react';
import AIAgentGovernance from '../components/settings/AIAgentGovernance';

type Tab = 'data' | 'rules' | 'users' | 'agents';

const TAB_DEFS: { id: Tab; label: string; icon: JSX.Element; star?: boolean }[] = [
  { id: 'data',   label: '基础数据', icon: <Database size={13} /> },
  { id: 'rules',  label: '规则配置', icon: <SlidersHorizontal size={13} /> },
  { id: 'users',  label: '用户权限', icon: <Users size={13} /> },
  { id: 'agents', label: 'AI Agent 治理', icon: <Sparkles size={13} className="text-ai" />, star: true },
];

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('agents');

  return (
    <div className="flex flex-col h-full p-4 gap-3 min-h-0 max-w-[1500px] w-full mx-auto">
      <div className="flex items-center gap-3 flex-wrap flex-none">
        <h1 className="text-[18px] font-semibold tracking-wide flex items-center gap-2">
          <Settings size={20} className="text-brand" />
          系统设置
        </h1>
      </div>

      {/* Tab 导航 */}
      <div className="flex gap-1 border-b border-line flex-none">
        {TAB_DEFS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative inline-flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium transition-colors
                          ${active ? 'text-ai' : 'text-ink-dim hover:text-ink'}`}
            >
              {t.icon}
              {t.label}
              {t.star && (
                <span className="ml-1 text-[9px] font-bold tracking-wider text-ai">★</span>
              )}
              {active && <span className="absolute left-0 right-0 bottom-0 h-0.5 bg-ai" />}
            </button>
          );
        })}
      </div>

      {/* Tab 内容 */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {tab === 'agents' && <AIAgentGovernance />}
        {tab === 'data'   && <Placeholder title="基础数据" desc="客户 / 产品 / 物料 / 资源 等基础数据维护（演示版仅展示菜单结构）" />}
        {tab === 'rules'  && <Placeholder title="规则配置" desc="工艺路径 / 换型矩阵 / 排产权重 / 优先级策略（演示版仅展示菜单结构）" />}
        {tab === 'users'  && <Placeholder title="用户权限" desc="用户 / 角色 / 权限分配 / 操作审计（演示版仅展示菜单结构）" />}
      </div>
    </div>
  );
}

function Placeholder({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="card-base p-8 flex flex-col items-center justify-center text-center">
      <div className="text-[14px] font-semibold mb-1">{title}</div>
      <div className="text-[12.5px] text-ink-dim leading-relaxed max-w-md">{desc}</div>
      <div className="text-[11px] text-ink-faint mt-4">本 Tab 仅作菜单占位，业务交互已交付至关键 ★ AI Agent 治理 Tab</div>
    </div>
  );
}
