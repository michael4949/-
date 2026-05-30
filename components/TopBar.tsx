import React from 'react';
import { Brain, RefreshCw } from 'lucide-react';

interface Props {
  online: boolean | null;
  profile?: string;
  provider?: string;
  onRefresh?: () => void;
}

const TopBar: React.FC<Props> = ({ online, profile, provider, onRefresh }) => {
  const dot = online === null ? 'bg-slate-300' : online ? 'bg-emerald-500' : 'bg-red-500';
  const label = online === null ? '连接中…' : online ? '已连接' : '未连接';
  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div className="px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-corporate-900 rounded-xl flex items-center justify-center">
            <Brain className="w-5 h-5 text-corporate-accent" />
          </div>
          <div>
            <div className="font-semibold text-corporate-900 leading-tight tracking-tight">Mnemo 控制台</div>
            <div className="text-[11px] text-slate-400 uppercase tracking-widest">会成长的 AI 助理</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
            <span className={`w-2 h-2 rounded-full ${dot} ${online ? 'animate-pulse' : ''}`} />
            <span>{label}</span>
            {profile && <span className="text-slate-300">·</span>}
            {profile && <span className="text-slate-400">profile: {profile}</span>}
            {provider && <span className="text-slate-300">·</span>}
            {provider && <span className="text-slate-400">{provider}</span>}
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="text-slate-400 hover:text-corporate-900 transition-colors"
              title="刷新"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopBar;
