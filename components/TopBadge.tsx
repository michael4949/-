import React from 'react';
import { useStore } from '../state/store';
import { COUNTRY_BY_ISO } from '../data/countries';

export const TopBadge: React.FC = () => {
  const stories = useStore(s => s.stories);
  const selectedCountry = useStore(s => s.selectedCountry);
  const lang = useStore(s => s.language);

  // Count distinct countries that have stories
  const distinctCountries = React.useMemo(() => {
    const set = new Set<string>();
    for (const s of stories) set.add(s.country);
    return set.size;
  }, [stories]);

  const country = selectedCountry ? COUNTRY_BY_ISO[selectedCountry] : null;

  return (
    <div className="absolute left-1/2 -translate-x-1/2 top-4 z-30 flex flex-col items-center pointer-events-none animate-float-in">
      <div className="glass-strong rounded-2xl px-7 py-3 flex flex-col items-center gap-1 shadow-2xl shadow-black/40">
        <h1 className="font-display text-base sm:text-lg tracking-[0.32em] gold-text">
          {lang === 'zh' ? '世界神话地图' : 'WORLD MYTHOLOGY MAP'}
        </h1>
        <div className="font-serif text-[11px] sm:text-xs text-parchment-100/70 tracking-widest">
          {stories.length.toLocaleString()} {lang === 'zh' ? '则故事' : 'stories'} · {distinctCountries} {lang === 'zh' ? '种文化' : 'cultures'}
        </div>
        {country && (
          <div className="mt-1 flex items-center gap-2 px-3 py-1 rounded-full bg-parchment-50/5 border border-parchment-200/15">
            <span className="text-lg leading-none">{country.flag}</span>
            <span className="font-display text-sm tracking-[0.15em] text-parchment-100">
              {lang === 'zh' ? country.zh : country.en}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
