import React, { useEffect } from 'react';
import { StarField } from './components/StarField';
import { WorldMap } from './components/WorldMap';
import { TopBadge } from './components/TopBadge';
import { CountryPanel } from './components/CountryPanel';
import { StoryDetail } from './components/StoryDetail';
import { FilterBar } from './components/FilterBar';
import { ViewToggle } from './components/ViewToggle';
import { GenerateButton } from './components/GenerateButton';
import { store, useStore } from './state/store';
import { SEED_STORIES } from './data/seeds';

const App: React.FC = () => {
  const lang = useStore(s => s.language);

  // Bootstrap once
  useEffect(() => {
    store.setStories(SEED_STORIES);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const s = store.getState();
      switch (e.key) {
        case 'g': case 'G': store.setView(s.view === 'globe' ? 'flat' : 'globe'); break;
        case 'r': case 'R': store.setAutoRotate(!s.autoRotate); break;
        case 'l': case 'L': store.toggleLabels(); break;
        case 'Escape': store.selectStory(null); store.selectCountry(null); break;
        case '+': case '=': store.setZoom(s.zoom * 1.15); break;
        case '-': case '_': store.setZoom(s.zoom / 1.15); break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="fixed inset-0 nebula-bg overflow-hidden">
      <StarField />

      <div className="absolute inset-0">
        <WorldMap />
      </div>

      <TopBadge />
      <ViewToggle />
      <CountryPanel />
      <StoryDetail />
      <GenerateButton />
      <FilterBar />

      {/* Subtle bottom-left attribution */}
      <div className="absolute bottom-3 left-3 z-20 text-[9px] font-display tracking-[0.18em] text-parchment-200/30 select-none pointer-events-none">
        ✦ {lang === 'zh' ? '献给所有讲故事的人' : 'FOR ALL WHO TELL STORIES'} ✦
      </div>
      <button
        onClick={() => store.setLanguage(lang === 'zh' ? 'en' : 'zh')}
        className="absolute bottom-3 right-3 z-30 text-[10px] font-display tracking-[0.18em] text-parchment-200/50 hover:text-parchment-50 transition-colors px-2 py-1"
        aria-label="Toggle language"
      >
        {lang === 'zh' ? 'EN · 中' : 'ZH · EN'}
      </button>
    </div>
  );
};

export default App;
