import React from 'react';
import { useStore, store } from '../state/store';
import { THEME_MAP, ERAS } from '../data/themes';
import { COUNTRY_BY_ISO } from '../data/countries';

export const StoryDetail: React.FC = () => {
  const selectedStoryId = useStore(s => s.selectedStoryId);
  const stories = useStore(s => s.stories);
  const lang = useStore(s => s.language);

  const story = React.useMemo(
    () => stories.find(s => s.id === selectedStoryId) ?? null,
    [stories, selectedStoryId]
  );

  if (!story) return null;
  const themePrimary = THEME_MAP[story.themes[0]];
  const era = ERAS.find(e => e.id === story.era);
  const country = COUNTRY_BY_ISO[story.country];

  return (
    <div className="absolute left-4 bottom-28 z-30 w-[min(420px,calc(100vw-2rem))] glass-strong rounded-2xl overflow-hidden animate-float-in shadow-2xl shadow-black/50">
      <button
        onClick={() => store.selectStory(null)}
        className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-parchment-200/60 hover:text-parchment-50 hover:bg-parchment-50/8 text-xs z-10"
        aria-label="Close"
      >
        ✕
      </button>
      <div className="flex">
        <div
          className="w-[120px] h-[160px] flex-shrink-0 relative"
          style={{
            background: story.image
              ? `url(${story.image}) center/cover no-repeat`
              : `radial-gradient(ellipse at 40% 35%, ${themePrimary?.color ?? '#fbbf24'}55 0%, transparent 65%), #0a0c18`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-ink-900/60" />
          <span
            className="absolute left-2 top-2 text-2xl leading-none"
            style={{ filter: `drop-shadow(0 0 6px ${themePrimary?.color ?? '#fbbf24'})` }}
          >
            {story.emoji}
          </span>
        </div>
        <div className="flex-1 px-4 pt-4 pb-3 min-w-0">
          <div className="flex flex-wrap items-baseline gap-2">
            <h2 className="font-display text-base sm:text-lg text-parchment-50 tracking-wider">
              {lang === 'zh' ? story.title.zh : story.title.en}
            </h2>
            <span className="text-[11px] text-parchment-200/60 italic">
              ({lang === 'zh' ? story.title.en : story.title.zh})
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {country && (
              <Tag>
                <span className="mr-1">{country.flag}</span>
                {lang === 'zh' ? country.zh : country.en}
              </Tag>
            )}
            <Tag color={themePrimary?.color}>
              <span className="mr-1">{themePrimary?.emoji}</span>
              {lang === 'zh' ? themePrimary?.zh : themePrimary?.en}
            </Tag>
            {era && <Tag>{lang === 'zh' ? era.zh : era.en}</Tag>}
            {story.generated && <Tag color="#a5b4fc">✨ AI</Tag>}
          </div>
          <p className="mt-3 text-[12.5px] leading-relaxed text-parchment-100/85 font-serif">
            {lang === 'zh' ? story.description.zh : story.description.en}
          </p>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => store.setLanguage('zh')}
              className={`px-2.5 py-1 rounded-md text-[10px] tracking-wider font-display border transition-colors ${
                lang === 'zh'
                  ? 'bg-parchment-100/15 border-parchment-100/60 text-parchment-50'
                  : 'border-parchment-200/15 text-parchment-200/60 hover:border-parchment-200/40'
              }`}
            >
              中文
            </button>
            <button
              onClick={() => store.setLanguage('en')}
              className={`px-2.5 py-1 rounded-md text-[10px] tracking-wider font-display border transition-colors ${
                lang === 'en'
                  ? 'bg-parchment-100/15 border-parchment-100/60 text-parchment-50'
                  : 'border-parchment-200/15 text-parchment-200/60 hover:border-parchment-200/40'
              }`}
            >
              ENGLISH
            </button>
            {story.year !== undefined && (
              <div className="ml-auto text-[10px] text-parchment-200/40 font-display tracking-widest">
                ≈ {story.year < 0 ? `${Math.abs(story.year).toLocaleString()} BCE` : `${story.year} CE`}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const Tag: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color }) => (
  <span
    className="px-2 py-0.5 rounded-full text-[10px] font-display tracking-wider border"
    style={{
      color: color ?? '#e7d3a3',
      borderColor: color ? `${color}55` : 'rgba(231, 211, 163, 0.22)',
      background: color ? `${color}10` : 'rgba(231, 211, 163, 0.04)',
    }}
  >
    {children}
  </span>
);
