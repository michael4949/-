import { useSyncExternalStore } from 'react';
import type { Story, ThemeId, EraId } from '../types';

export type ViewMode = 'flat' | 'globe';

export interface AppState {
  stories: Story[];
  /** Stories filtered by current theme + era + country selection. */
  visibleStoryIds: Set<string>;

  view: ViewMode;
  /** Globe rotation: [lambda, phi, gamma] in degrees. */
  rotation: [number, number, number];
  autoRotate: boolean;
  /** Map zoom scale multiplier. */
  zoom: number;

  selectedCountry: string | null;
  selectedStoryId: string | null;
  hoverStoryId: string | null;

  themeFilter: ThemeId | null;
  eraFilter: EraId | null;
  showLabels: boolean;
  /** Show faint great-circle arcs between stories sharing the active theme. */
  showCrossLines: boolean;

  language: 'zh' | 'en';

  generating: boolean;
  /** Last error message from Gemini call, if any. */
  generationError: string | null;
}

type Listener = () => void;

let state: AppState = {
  stories: [],
  visibleStoryIds: new Set(),
  view: 'flat',
  rotation: [-15, -20, 0],
  autoRotate: false,
  zoom: 1,
  selectedCountry: null,
  selectedStoryId: null,
  hoverStoryId: null,
  themeFilter: null,
  eraFilter: null,
  showLabels: false,
  showCrossLines: true,
  language: 'zh',
  generating: false,
  generationError: null,
};

const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l();
}

function recomputeVisible(s: AppState): Set<string> {
  const out = new Set<string>();
  for (const story of s.stories) {
    if (s.themeFilter && !story.themes.includes(s.themeFilter)) continue;
    if (s.eraFilter && story.era !== s.eraFilter) continue;
    out.add(story.id);
  }
  return out;
}

function set(patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)) {
  const p = typeof patch === 'function' ? patch(state) : patch;
  const next: AppState = { ...state, ...p };
  // Recompute derived caches when relevant inputs change.
  if (p.stories || p.themeFilter !== undefined || p.eraFilter !== undefined) {
    next.visibleStoryIds = recomputeVisible(next);
  }
  state = next;
  emit();
}

export const store = {
  getState: (): AppState => state,
  subscribe(l: Listener) {
    listeners.add(l);
    return () => { listeners.delete(l); };
  },

  setStories(stories: Story[]) {
    set({ stories });
  },
  appendStories(extra: Story[]) {
    set(s => ({ stories: [...s.stories, ...extra] }));
  },

  setView(view: ViewMode) {
    set({ view, autoRotate: view === 'globe' ? state.autoRotate : false });
  },
  setRotation(r: [number, number, number]) {
    set({ rotation: r });
  },
  rotateBy(dl: number, dp: number) {
    const [l, p, g] = state.rotation;
    const nextP = Math.max(-85, Math.min(85, p + dp));
    set({ rotation: [l + dl, nextP, g] });
  },
  setAutoRotate(v: boolean) { set({ autoRotate: v }); },
  setZoom(z: number) { set({ zoom: Math.max(0.6, Math.min(3.2, z)) }); },

  selectCountry(iso: string | null) {
    set({ selectedCountry: iso, selectedStoryId: null });
  },
  selectStory(id: string | null) { set({ selectedStoryId: id }); },
  hoverStory(id: string | null) { set({ hoverStoryId: id }); },

  setThemeFilter(t: ThemeId | null) { set({ themeFilter: t, selectedStoryId: null }); },
  setEraFilter(e: EraId | null) { set({ eraFilter: e, selectedStoryId: null }); },
  toggleLabels() { set(s => ({ showLabels: !s.showLabels })); },
  toggleCrossLines() { set(s => ({ showCrossLines: !s.showCrossLines })); },

  setLanguage(l: 'zh' | 'en') { set({ language: l }); },

  setGenerating(v: boolean) { set({ generating: v }); },
  setGenerationError(msg: string | null) { set({ generationError: msg }); },
};

export function useStore<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(state),
    () => selector(state),
  );
}
