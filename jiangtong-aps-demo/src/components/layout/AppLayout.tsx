import { type ReactNode, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import TopBar from './TopBar';
import SideMenu from './SideMenu';
import CopilotPanel from '../ai/CopilotPanel';
import AIExplainModal from '../ai/AIExplainModal';
import { useCopilotStore } from '../../store/useCopilotStore';

export default function AppLayout({ children }: { children: ReactNode }) {
  const loc = useLocation();
  const setContext = useCopilotStore((s) => s.setContext);

  useEffect(() => {
    setContext(loc.pathname + loc.hash);
  }, [loc.pathname, loc.hash, setContext]);

  return (
    <div className="h-screen w-screen flex flex-col bg-bg text-ink overflow-hidden">
      <TopBar />
      <div className="flex-1 flex min-h-0">
        <SideMenu />
        <main className="flex-1 min-w-0 overflow-auto">{children}</main>
      </div>
      <CopilotPanel />
      <AIExplainModal />
    </div>
  );
}
