import React from 'react';
import { useStore, store } from '../state/store';

export const ViewToggle: React.FC = () => {
  const view = useStore(s => s.view);
  const autoRotate = useStore(s => s.autoRotate);
  const lang = useStore(s => s.language);

  return (
    <div className="absolute top-4 left-4 z-30 flex flex-col gap-2 animate-float-in">
      <div className="glass-strong rounded-2xl p-1 flex shadow-2xl shadow-black/40">
        <Pill active={view === 'flat'} onClick={() => store.setView('flat')}>
          🗺️ {lang === 'zh' ? '平面' : 'Flat'}
        </Pill>
        <Pill active={view === 'globe'} onClick={() => store.setView('globe')}>
          🌐 {lang === 'zh' ? '球体' : 'Globe'}
        </Pill>
      </div>
      {view === 'globe' && (
        <button
          onClick={() => store.setAutoRotate(!autoRotate)}
          className={`glass-strong rounded-xl px-3 py-1.5 text-[10px] tracking-widest font-display transition-colors flex items-center gap-2 ${
            autoRotate
              ? 'text-parchment-50 border border-parchment-100/60'
              : 'text-parchment-200/70 hover:text-parchment-50'
          }`}
          style={autoRotate ? { boxShadow: '0 0 14px rgba(251, 191, 36, 0.4)' } : undefined}
        >
          <span className={autoRotate ? 'animate-pulse-soft' : ''}>↻</span>
          {lang === 'zh' ? '自动旋转' : 'Auto-rotate'}
        </button>
      )}
    </div>
  );
};

const Pill: React.FC<{
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}> = ({ children, active, onClick }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1 rounded-xl text-[11px] tracking-widest font-display transition-colors flex items-center gap-1.5 ${
      active
        ? 'bg-parchment-50/15 text-parchment-50'
        : 'text-parchment-200/60 hover:text-parchment-50'
    }`}
  >
    {children}
  </button>
);
