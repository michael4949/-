import React from 'react';
import { useStore, store } from '../state/store';
import { THEMES, ERAS } from '../data/themes';

export const FilterBar: React.FC = () => {
  const themeFilter = useStore(s => s.themeFilter);
  const eraFilter = useStore(s => s.eraFilter);
  const showLabels = useStore(s => s.showLabels);
  const showCross = useStore(s => s.showCrossLines);
  const lang = useStore(s => s.language);

  return (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2 max-w-[calc(100vw-2rem)] animate-float-in">
      <div className="glass-strong rounded-2xl px-3 py-2 flex items-center gap-1.5 overflow-x-auto max-w-full">
        <Chip
          active={themeFilter === null}
          onClick={() => store.setThemeFilter(null)}
        >
          {lang === 'zh' ? '全部' : 'All'}
        </Chip>
        {THEMES.slice(0, 8).map(t => (
          <Chip
            key={t.id}
            active={themeFilter === t.id}
            color={t.color}
            onClick={() => store.setThemeFilter(themeFilter === t.id ? null : t.id)}
          >
            <span className="mr-1">{t.emoji}</span>
            {lang === 'zh' ? t.zh : t.en}
          </Chip>
        ))}
      </div>
      <div className="glass-strong rounded-2xl px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto max-w-full">
        <Chip
          active={eraFilter === null}
          onClick={() => store.setEraFilter(null)}
          small
        >
          {lang === 'zh' ? '所有时代' : 'All Eras'}
        </Chip>
        {ERAS.map(e => (
          <Chip
            key={e.id}
            active={eraFilter === e.id}
            onClick={() => store.setEraFilter(eraFilter === e.id ? null : e.id)}
            small
          >
            {lang === 'zh' ? e.zh : e.en}
          </Chip>
        ))}
        <span className="w-px h-4 bg-parchment-200/20 mx-1" />
        <Toggle on={showLabels} onClick={() => store.toggleLabels()}>
          {lang === 'zh' ? '标签' : 'Labels'}
        </Toggle>
        <Toggle on={showCross} onClick={() => store.toggleCrossLines()}>
          {lang === 'zh' ? '连线' : 'Lines'}
        </Toggle>
      </div>
    </div>
  );
};

const Chip: React.FC<{
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  color?: string;
  small?: boolean;
}> = ({ children, active, onClick, color, small }) => {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full transition-all whitespace-nowrap font-display tracking-wider ${
        small ? 'text-[10px] px-2.5 py-0.5' : 'text-[11px] px-3 py-1'
      } ${
        active
          ? 'bg-parchment-50/15 text-parchment-50 border border-parchment-100/60'
          : 'text-parchment-200/70 hover:text-parchment-50 border border-parchment-200/15 hover:border-parchment-200/40'
      }`}
      style={
        active && color
          ? { boxShadow: `0 0 12px ${color}55`, borderColor: `${color}80`, color: '#fbf6ea' }
          : undefined
      }
    >
      {children}
    </button>
  );
};

const Toggle: React.FC<{
  children: React.ReactNode;
  on: boolean;
  onClick: () => void;
}> = ({ children, on, onClick }) => (
  <button
    onClick={onClick}
    className="shrink-0 flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] tracking-wider font-display text-parchment-200/70 hover:text-parchment-50 transition-colors"
  >
    <span
      className={`inline-block w-7 h-3.5 rounded-full transition-colors relative ${
        on ? 'bg-parchment-300/80' : 'bg-parchment-200/20'
      }`}
    >
      <span
        className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-ink-900 transition-transform ${
          on ? 'translate-x-3.5' : 'translate-x-0.5'
        }`}
      />
    </span>
    {children}
  </button>
);
