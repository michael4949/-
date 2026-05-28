import React, { useMemo, useState } from 'react';
import { useStore, store } from '../state/store';
import { COUNTRIES, COUNTRY_BY_ISO } from '../data/countries';
import { THEME_MAP } from '../data/themes';
import type { Story } from '../types';

const PLACEHOLDER_THUMB = (color: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'><defs><radialGradient id='g' cx='50%' cy='40%' r='60%'><stop offset='0%' stop-color='${color}' stop-opacity='0.55'/><stop offset='100%' stop-color='${color}' stop-opacity='0.08'/></radialGradient></defs><rect width='80' height='80' fill='%230a0c18'/><circle cx='40' cy='38' r='30' fill='url(%23g)'/></svg>`
  )}`;

export const CountryPanel: React.FC = () => {
  const stories = useStore(s => s.stories);
  const selectedCountry = useStore(s => s.selectedCountry);
  const lang = useStore(s => s.language);
  const generating = useStore(s => s.generating);
  const [search, setSearch] = useState('');

  // Tally counts per country
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of stories) m.set(s.country, (m.get(s.country) ?? 0) + 1);
    return m;
  }, [stories]);

  // Rank countries by story count
  const ranked = useMemo(() => {
    return COUNTRIES
      .map(c => ({ c, n: counts.get(c.iso) ?? 0 }))
      .filter(x => x.n > 0)
      .sort((a, b) => b.n - a.n);
  }, [counts]);

  const filteredRanked = useMemo(() => {
    if (!search.trim()) return ranked;
    const q = search.toLowerCase().trim();
    return ranked.filter(({ c }) =>
      c.en.toLowerCase().includes(q) ||
      c.zh.includes(q) ||
      c.iso.toLowerCase().includes(q)
    );
  }, [ranked, search]);

  const countryStories = useMemo(() => {
    if (!selectedCountry) return [] as Story[];
    return stories.filter(s => s.country === selectedCountry);
  }, [stories, selectedCountry]);

  const topType = useMemo(() => {
    if (!countryStories.length) return null;
    const counter = new Map<string, number>();
    for (const s of countryStories) {
      for (const t of s.themes) counter.set(t, (counter.get(t) ?? 0) + 1);
    }
    const [winner] = [...counter.entries()].sort((a, b) => b[1] - a[1]);
    return winner?.[0] ?? null;
  }, [countryStories]);

  return (
    <aside className="absolute top-4 right-4 bottom-32 w-[280px] md:w-[300px] glass-strong rounded-2xl flex flex-col z-30 overflow-hidden animate-float-in shadow-2xl shadow-black/40">
      {selectedCountry ? (
        <CountryDetail
          iso={selectedCountry}
          stories={countryStories}
          topTheme={topType}
          lang={lang}
        />
      ) : (
        <>
          <div className="px-4 pt-4 pb-3 border-b border-parchment-200/10">
            <div className="text-[11px] tracking-[0.18em] uppercase text-parchment-200/60 font-display mb-2">
              {lang === 'zh' ? '神话故事 · 按国家' : 'Stories by Country'}
            </div>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={lang === 'zh' ? '搜索国家…' : 'Search country…'}
              className="w-full px-3 py-1.5 rounded-lg bg-ink-700/60 border border-parchment-200/10 text-sm text-parchment-100 placeholder:text-parchment-200/30 focus:outline-none focus:border-parchment-200/40"
            />
          </div>
          <div className="flex-1 overflow-y-auto px-2 py-2 scroll-fade">
            {filteredRanked.map(({ c, n }) => (
              <button
                key={c.iso}
                onClick={() => store.selectCountry(c.iso)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-parchment-50/5 transition-colors text-left group"
              >
                <span className="text-xl leading-none">{c.flag}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-parchment-100 truncate font-medium tracking-wide">
                    {lang === 'zh' ? c.zh : c.en}
                  </div>
                  <div className="text-[10px] text-parchment-200/40 truncate tracking-widest uppercase font-display">
                    {lang === 'zh' ? c.en : c.zh}
                  </div>
                </div>
                <div className="text-parchment-200/80 text-sm font-display tracking-wider tabular-nums">
                  {n}
                </div>
              </button>
            ))}
            {!ranked.length && !generating && (
              <div className="px-3 py-6 text-center text-parchment-200/40 text-sm">
                {lang === 'zh' ? '暂无故事' : 'No stories yet'}
              </div>
            )}
          </div>
        </>
      )}
    </aside>
  );
};

const CountryDetail: React.FC<{
  iso: string;
  stories: Story[];
  topTheme: string | null;
  lang: 'zh' | 'en';
}> = ({ iso, stories, topTheme, lang }) => {
  const c = COUNTRY_BY_ISO[iso];
  if (!c) return null;
  const theme = topTheme ? THEME_MAP[topTheme as any] : null;

  return (
    <>
      <div className="px-4 pt-4 pb-3 border-b border-parchment-200/10">
        <button
          onClick={() => store.selectCountry(null)}
          className="text-[10px] text-parchment-200/60 hover:text-parchment-200 tracking-widest uppercase mb-2 flex items-center gap-1"
        >
          ← {lang === 'zh' ? '返回' : 'Back'}
        </button>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl leading-none">{c.flag}</span>
          <div>
            <div className="font-display text-base text-parchment-100 tracking-wider">
              {lang === 'zh' ? c.zh : c.en}
            </div>
            <div className="text-[10px] text-parchment-200/40 tracking-widest uppercase">
              {lang === 'zh' ? c.en : c.zh} · {c.iso}
            </div>
          </div>
        </div>
        <div className="flex items-end gap-4 mt-3">
          <div>
            <div className="font-display text-2xl text-parchment-50 tabular-nums">
              {stories.length}
            </div>
            <div className="text-[9px] text-parchment-200/40 tracking-widest uppercase font-display mt-0.5">
              {lang === 'zh' ? '故事数' : 'Stories'}
            </div>
          </div>
          {theme && (
            <div className="ml-auto">
              <div className="font-display text-sm flex items-center gap-1 tracking-wider" style={{ color: theme.color }}>
                <span>{theme.emoji}</span>
                <span>{lang === 'zh' ? theme.zh : theme.en}</span>
              </div>
              <div className="text-[9px] text-parchment-200/40 tracking-widest uppercase font-display mt-0.5">
                {lang === 'zh' ? '主题' : 'Top Type'}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 scroll-fade">
        <div className="grid grid-cols-2 gap-2">
          {stories.map(s => (
            <StoryCard key={s.id} story={s} lang={lang} />
          ))}
        </div>
      </div>
    </>
  );
};

const StoryCard: React.FC<{ story: Story; lang: 'zh' | 'en' }> = ({ story, lang }) => {
  const color = THEME_MAP[story.themes[0]]?.color ?? '#fbbf24';
  const selected = useStore(s => s.selectedStoryId === story.id);
  return (
    <button
      onClick={() => store.selectStory(story.id)}
      className={`group flex flex-col rounded-lg overflow-hidden bg-ink-700/40 border transition-all text-left ${
        selected ? 'border-parchment-200/70 scale-[1.02]' : 'border-parchment-200/8 hover:border-parchment-200/30'
      }`}
      style={selected ? { boxShadow: `0 0 14px ${color}33` } : undefined}
    >
      <div
        className="relative w-full aspect-square overflow-hidden"
        style={{
          background: story.image
            ? `url(${story.image}) center/cover no-repeat`
            : `radial-gradient(circle at 50% 40%, ${color}55 0%, transparent 70%), #0a0c18`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900/80 via-ink-900/20 to-transparent" />
        <span
          className="absolute right-1 top-1 text-base leading-none"
          style={{ filter: `drop-shadow(0 0 4px ${color})` }}
        >
          {story.emoji}
        </span>
      </div>
      <div className="px-2 py-1.5">
        <div className="text-[11px] text-parchment-100 leading-tight font-medium truncate">
          {lang === 'zh' ? story.title.zh : story.title.en}
        </div>
        <div className="text-[9px] text-parchment-200/40 truncate font-display tracking-widest uppercase mt-0.5">
          {lang === 'zh' ? story.title.en : story.title.zh}
        </div>
      </div>
    </button>
  );
};
