import React from 'react';
import type { Story } from '../types';
import { colorForStory } from '../data/themes';
import { store } from '../state/store';

interface Props {
  story: Story;
  x: number;
  y: number;
  dim: boolean;
  highlighted: boolean;
  showLabel: boolean;
  lang: 'zh' | 'en';
}

export const StoryMarker: React.FC<Props> = React.memo(({ story, x, y, dim, highlighted, showLabel, lang }) => {
  const color = colorForStory(story.themes, story.color);
  const size = highlighted ? 26 : dim ? 14 : 18;
  const opacity = dim ? 0.45 : 1;

  return (
    <button
      className="marker pointer-events-auto"
      style={{
        left: x,
        top: y,
        opacity,
        fontSize: size,
        color,
        zIndex: highlighted ? 50 : Math.round(20 - size / 4),
        filter: highlighted
          ? `drop-shadow(0 0 6px ${color}) drop-shadow(0 0 14px ${color}) drop-shadow(0 0 22px ${color})`
          : `drop-shadow(0 0 4px ${color}) drop-shadow(0 0 9px ${color}aa)`,
      }}
      onClick={(e) => {
        e.stopPropagation();
        store.selectCountry(story.country);
        store.selectStory(story.id);
      }}
      onMouseEnter={() => store.hoverStory(story.id)}
      onMouseLeave={() => store.hoverStory(null)}
      title={lang === 'zh' ? story.title.zh : story.title.en}
      aria-label={story.title.en}
    >
      <span style={{ display: 'inline-block' }}>{story.emoji}</span>
      {(showLabel || highlighted) && (
        <span
          className="absolute left-1/2 -translate-x-1/2 top-full mt-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide"
          style={{
            background: 'rgba(5, 7, 16, 0.85)',
            border: `1px solid ${color}55`,
            color: '#fbf6ea',
            textShadow: `0 0 6px ${color}55`,
            pointerEvents: 'none',
          }}
        >
          {lang === 'zh' ? story.title.zh : story.title.en}
        </span>
      )}
    </button>
  );
});
StoryMarker.displayName = 'StoryMarker';
