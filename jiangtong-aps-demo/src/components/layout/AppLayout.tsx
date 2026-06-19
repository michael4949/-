import { type ReactNode, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import TopBar from './TopBar';
import SideMenu from './SideMenu';
import CopilotPanel from '../ai/CopilotPanel';
import { useCopilotStore } from '../../store/useCopilotStore';

export default function AppLayout({ children }: { children: ReactNode }) {
  const loc = useLocation();
  const setContext = useCopilotStore((s) => s.setContext);

  // 自动绑定当前页 context（§11.1 行为）
  useEffect(() => {
    setContext(loc.pathname);
  }, [loc.pathname, setContext]);

  return (
    <div className="h-screen w-screen flex flex-col bg-bg text-ink overflow-hidden">
      <TopBar />
      <div className="flex-1 flex min-h-0">
        <SideMenu />
        <main className="flex-1 min-w-0 overflow-auto">{children}</main>
      </div>
      <CopilotPanel />
    </div>
  );
}
