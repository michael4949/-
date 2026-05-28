import React, { useMemo } from 'react';
import { geoPath, geoInterpolate, geoDistance, type GeoProjection } from 'd3-geo';
import type { Story, ThemeId } from '../types';
import { THEME_MAP } from '../data/themes';

interface Props {
  projection: GeoProjection;
  view: 'flat' | 'globe';
  stories: Story[];
  themeId: ThemeId;
}

/**
 * Draw faint glowing arcs between stories that share the active theme,
 * highlighting cross-cultural narrative resonance (e.g. flood myths
 * connecting Mesopotamia, China, India, the Americas).
 */
export const CrossCultureLines: React.FC<Props> = ({ projection, view, stories, themeId }) => {
  const color = THEME_MAP[themeId]?.color ?? '#fbbf24';
  const path = geoPath(projection);

  const arcs = useMemo(() => {
    const points = stories.map(s => s.lnglat);
    if (points.length < 2) return [] as string[];

    // To avoid n^2 spaghetti for large filter sets, connect each point
    // only to its 3 nearest neighbours (great-circle distance).
    const out: string[] = [];
    const limit = 3;
    for (let i = 0; i < points.length; i++) {
      const pi = points[i];
      const dists = points.map((pj, j) => ({ j, d: geoDistance(pi, pj) }));
      dists.sort((a, b) => a.d - b.d);
      for (let k = 1; k <= limit && k < dists.length; k++) {
        const j = dists[k].j;
        if (j <= i) continue; // dedupe
        const interp = geoInterpolate(pi, points[j]);
        const segs: [number, number][] = [];
        const N = 36;
        for (let t = 0; t <= N; t++) segs.push(interp(t / N));
        const d = path({ type: 'LineString', coordinates: segs } as any);
        if (d) out.push(d);
      }
    }
    return out;
  }, [stories, path, view]);

  return (
    <g style={{ pointerEvents: 'none' }}>
      <g
        fill="none"
        stroke={color}
        strokeOpacity={0.10}
        strokeWidth={2.6}
        style={{ filter: `blur(2px) drop-shadow(0 0 6px ${color})` }}
      >
        {arcs.map((d, i) => <path key={`b${i}`} d={d} />)}
      </g>
      <g
        fill="none"
        stroke={color}
        strokeOpacity={0.36}
        strokeWidth={0.7}
      >
        {arcs.map((d, i) => <path key={`f${i}`} d={d} />)}
      </g>
    </g>
  );
};
