import type { ThemeDef, EraDef, ThemeId } from '../types';

export const THEMES: ThemeDef[] = [
  { id: 'sun',       emoji: '☀️', zh: '太阳',   en: 'Sun',       color: '#fbbf24' },
  { id: 'moon',      emoji: '🌙', zh: '月亮',   en: 'Moon',      color: '#a5b4fc' },
  { id: 'flood',     emoji: '🌊', zh: '洪水',   en: 'Flood',     color: '#38bdf8' },
  { id: 'fire',      emoji: '🔥', zh: '火',     en: 'Fire',      color: '#ff6a2c' },
  { id: 'dragon',    emoji: '🐉', zh: '龙',     en: 'Dragon',    color: '#34d399' },
  { id: 'love',      emoji: '❤️', zh: '爱情',   en: 'Love',      color: '#fb7185' },
  { id: 'princess',  emoji: '👸', zh: '公主',   en: 'Princess',  color: '#f472b6' },
  { id: 'death',     emoji: '💀', zh: '死亡',   en: 'Death',     color: '#cbd5e1' },
  { id: 'war',       emoji: '⚔️', zh: '战争',   en: 'War',       color: '#ef4444' },
  { id: 'creation',  emoji: '🌌', zh: '创世',   en: 'Creation',  color: '#8b5cf6' },
  { id: 'hero',      emoji: '🛡️', zh: '英雄',   en: 'Hero',      color: '#fcd34d' },
  { id: 'trickster', emoji: '🦊', zh: '诡神',   en: 'Trickster', color: '#fb923c' },
  { id: 'underworld',emoji: '🕯️', zh: '冥界',   en: 'Underworld',color: '#9ca3af' },
  { id: 'beast',     emoji: '🐺', zh: '神兽',   en: 'Beast',     color: '#84cc16' },
  { id: 'magic',     emoji: '✨', zh: '魔法',   en: 'Magic',     color: '#22d3ee' },
];

export const THEME_MAP: Record<ThemeId, ThemeDef> = THEMES.reduce((m, t) => {
  m[t.id] = t;
  return m;
}, {} as Record<ThemeId, ThemeDef>);

export const ERAS: EraDef[] = [
  { id: 'ancient',   zh: '远古',    en: 'Ancient',   range: [-100000, -1000] },
  { id: 'classical', zh: '古代',    en: 'Classical', range: [-1000, 500] },
  { id: 'medieval',  zh: '中世纪',  en: 'Medieval',  range: [500, 1500] },
  { id: 'modern',    zh: '近代',    en: 'Modern',    range: [1500, 2100] },
];

export function eraForYear(year?: number): EraDef['id'] {
  if (year === undefined) return 'classical';
  for (const e of ERAS) {
    if (year >= e.range[0] && year < e.range[1]) return e.id;
  }
  return 'modern';
}

export function colorForStory(themes: ThemeId[], override?: string): string {
  if (override) return override;
  return THEME_MAP[themes[0]]?.color ?? '#fbbf24';
}
