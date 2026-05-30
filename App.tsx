import React, { useEffect, useState } from 'react';
import { BookOpen, Brain } from 'lucide-react';
import TopBar from './components/TopBar';
import ChatPanel from './components/ChatPanel';
import SkillsPanel from './components/SkillsPanel';
import MemoryPanel from './components/MemoryPanel';
import { getHealth } from './services/mnemoApi';
import type { Health } from './types';

type Tab = 'skills' | 'memory';

const App: React.FC = () => {
  const [health, setHealth] = useState<Health | null>(null);
  const [session, setSession] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('memory');
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = () => setRefreshKey((k) => k + 1);
  const online = health === null ? null : health.ok;

  useEffect(() => {
    let active = true;
    const ping = () => getHealth().then((h) => active && setHealth(h));
    ping();
    const id = setInterval(ping, 5000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  const usingClaude = health?.provider === 'anthropic';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <TopBar
        online={online}
        profile={health?.profile || 'default'}
        provider={usingClaude ? `Claude · ${health?.model || ''}` : health?.provider || 'scripted'}
        onRefresh={refresh}
      />
      {online && !usingClaude && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-800 text-xs px-6 py-2 text-center">
          当前是离线模式（只会记事/回忆）。想让它真正会思考、回答任意问题？在终端运行
          <code className="mx-1 px-1.5 py-0.5 bg-amber-100 rounded">mnemo setup</code>
          接入 Claude。
        </div>
      )}

      <main className="flex-1 p-4 md:p-6">
        <div className="max-w-7xl mx-auto h-[calc(100vh-130px)] grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4">
          {/* Chat */}
          <ChatPanel session={session} setSession={setSession} onActivity={refresh} online={online} />

          {/* Side panel */}
          <aside className="hidden lg:flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex border-b border-slate-200">
              <TabButton active={tab === 'memory'} onClick={() => setTab('memory')} icon={<Brain className="w-4 h-4" />}>
                记忆
              </TabButton>
              <TabButton active={tab === 'skills'} onClick={() => setTab('skills')} icon={<BookOpen className="w-4 h-4" />}>
                技能
              </TabButton>
            </div>
            <div className="flex-1 overflow-y-auto">
              {tab === 'memory' ? (
                <MemoryPanel refreshKey={refreshKey} session={session} />
              ) : (
                <SkillsPanel refreshKey={refreshKey} />
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }> = ({
  active,
  onClick,
  icon,
  children,
}) => (
  <button
    onClick={onClick}
    className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
      active ? 'text-corporate-900 border-b-2 border-corporate-900' : 'text-slate-400 hover:text-slate-600'
    }`}
  >
    {icon}
    {children}
  </button>
);

export default App;
