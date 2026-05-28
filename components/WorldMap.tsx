import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  geoOrthographic,
  geoNaturalEarth1,
  geoPath,
  geoContains,
  geoDistance,
  geoInterpolate,
  type GeoProjection,
} from 'd3-geo';
import { useStore, store } from '../state/store';
import { loadWorld, type WorldAtlas } from '../services/worldData';
import { COUNTRY_BY_NUMERIC } from '../data/countries';
import { StoryMarker } from './StoryMarker';
import { AuroraRing } from './AuroraRing';
import { CrossCultureLines } from './CrossCultureLines';

interface Size { w: number; h: number; }

/**
 * Project a story's [lng, lat] to screen pixels. Returns null if the
 * point is on the far side of the globe (so we can hide its marker).
 */
function projectPoint(projection: GeoProjection, view: 'flat' | 'globe', lnglat: [number, number]): { x: number; y: number; visible: boolean } | null {
  if (view === 'globe') {
    const rot = projection.rotate();
    const center: [number, number] = [-rot[0], -rot[1]];
    const dist = geoDistance(center, lnglat);
    if (dist > Math.PI / 2) {
      return null;
    }
  }
  const p = projection(lnglat);
  if (!p) return null;
  return { x: p[0], y: p[1], visible: true };
}

export const WorldMap: React.FC = () => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<Size>({ w: 0, h: 0 });
  const [world, setWorld] = useState<WorldAtlas | null>(null);
  const [worldErr, setWorldErr] = useState<string | null>(null);

  const view = useStore(s => s.view);
  const rotation = useStore(s => s.rotation);
  const zoom = useStore(s => s.zoom);
  const stories = useStore(s => s.stories);
  const visible = useStore(s => s.visibleStoryIds);
  const selectedStoryId = useStore(s => s.selectedStoryId);
  const hoverStoryId = useStore(s => s.hoverStoryId);
  const selectedCountry = useStore(s => s.selectedCountry);
  const themeFilter = useStore(s => s.themeFilter);
  const autoRotate = useStore(s => s.autoRotate);
  const showLabels = useStore(s => s.showLabels);
  const showCross = useStore(s => s.showCrossLines);
  const lang = useStore(s => s.language);

  // ResizeObserver to track wrapper dims
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Load world topojson on mount
  useEffect(() => {
    loadWorld().then(setWorld).catch(e => {
      console.error(e);
      setWorldErr(String(e?.message ?? e));
    });
  }, []);

  // Auto-rotate
  useEffect(() => {
    if (!autoRotate || view !== 'globe') return;
    let raf = 0;
    let last = performance.now();
    const tick = (t: number) => {
      const dt = (t - last) / 1000;
      last = t;
      store.rotateBy(dt * 6, 0); // 6 deg/sec
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [autoRotate, view]);

  // When a country gets selected on the globe, smoothly tilt to face it
  const focusTargetRef = useRef<[number, number] | null>(null);
  useEffect(() => {
    if (!selectedCountry || view !== 'globe') return;
    const c = Object.values(COUNTRY_BY_NUMERIC).find(c => c.iso === selectedCountry);
    if (!c) return;
    focusTargetRef.current = [-c.lnglat[0], -c.lnglat[1]];
    store.setAutoRotate(false);
    let raf = 0;
    const step = () => {
      const target = focusTargetRef.current;
      if (!target) return;
      const [tl, tp] = target;
      const cur = store.getState().rotation;
      // Shortest-path interpolation for longitude
      let dl = tl - cur[0];
      dl = ((dl + 180) % 360 + 360) % 360 - 180;
      const dp = tp - cur[1];
      if (Math.abs(dl) < 0.3 && Math.abs(dp) < 0.3) return;
      store.setRotation([cur[0] + dl * 0.12, cur[1] + dp * 0.12, cur[2]]);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [selectedCountry, view]);

  // Build projection based on current view / size / rotation / zoom
  const { projection, pathGen } = useMemo(() => {
    if (size.w === 0 || size.h === 0) return { projection: null, pathGen: null };
    const minSide = Math.min(size.w, size.h);
    let p: GeoProjection;
    if (view === 'globe') {
      p = geoOrthographic()
        .scale(minSide * 0.43 * zoom)
        .translate([size.w / 2, size.h / 2])
        .rotate(rotation)
        .clipAngle(90);
    } else {
      p = geoNaturalEarth1()
        .scale(Math.min(size.w / 5.5, size.h / 2.8) * zoom)
        .translate([size.w / 2, size.h / 2])
        .rotate([rotation[0] * 0.6, 0, 0]);
    }
    return { projection: p, pathGen: geoPath(p) };
  }, [view, rotation, zoom, size]);

  // Drag-to-rotate / pan with inertia
  const dragRef = useRef<{
    lastX: number; lastY: number;
    vx: number; vy: number;
    pointerId: number | null;
  }>({ lastX: 0, lastY: 0, vx: 0, vy: 0, pointerId: null });

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    if ((e.target as Element).closest('.marker')) return; // don't drag when clicking a marker
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragRef.current.lastX = e.clientX;
    dragRef.current.lastY = e.clientY;
    dragRef.current.vx = 0;
    dragRef.current.vy = 0;
    dragRef.current.pointerId = e.pointerId;
    store.setAutoRotate(false);
  };
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const d = dragRef.current;
    if (d.pointerId !== e.pointerId) return;
    const dx = e.clientX - d.lastX;
    const dy = e.clientY - d.lastY;
    d.lastX = e.clientX;
    d.lastY = e.clientY;
    const sensX = 0.35 / zoom;
    const sensY = 0.30 / zoom;
    if (view === 'globe') {
      store.rotateBy(dx * sensX, -dy * sensY);
    } else {
      // flat: pan via rotation lambda
      store.rotateBy(dx * 0.2, 0);
    }
    d.vx = dx;
    d.vy = dy;
  };
  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    const d = dragRef.current;
    if (d.pointerId !== e.pointerId) return;
    d.pointerId = null;
    // Inertia
    const startVx = d.vx;
    const startVy = d.vy;
    if (Math.abs(startVx) < 0.5 && Math.abs(startVy) < 0.5) return;
    let raf = 0;
    let v = { x: startVx, y: startVy };
    const decay = 0.93;
    const step = () => {
      v.x *= decay;
      v.y *= decay;
      if (Math.abs(v.x) < 0.1 && Math.abs(v.y) < 0.1) return;
      const sensX = 0.35 / zoom;
      const sensY = 0.30 / zoom;
      if (view === 'globe') store.rotateBy(v.x * sensX, -v.y * sensY);
      else store.rotateBy(v.x * 0.2, 0);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  };

  // Wheel zoom
  const onWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault?.();
    const factor = e.deltaY < 0 ? 1.08 : 1 / 1.08;
    store.setZoom(zoom * factor);
  };

  // Click a country (background) to select it
  const onSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!projection || !world) return;
    const tgt = e.target as Element;
    const isPath = tgt.tagName === 'path' && tgt.classList.contains('country-path');
    if (!isPath) {
      if (!(tgt as Element).closest('.marker')) {
        store.selectCountry(null);
      }
      return;
    }
    const numeric = tgt.getAttribute('data-numeric');
    if (!numeric) return;
    const c = COUNTRY_BY_NUMERIC[numeric];
    if (c) store.selectCountry(c.iso);
  };

  // Compute story counts per country once
  const countryCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of stories) {
      m.set(s.country, (m.get(s.country) ?? 0) + 1);
    }
    return m;
  }, [stories]);

  // Country -> ISO mapping for highlighting on map
  const selectedNumeric = useMemo(() => {
    if (!selectedCountry) return null;
    const c = Object.values(COUNTRY_BY_NUMERIC).find(c => c.iso === selectedCountry);
    return c?.numeric ?? null;
  }, [selectedCountry]);

  // Story render data
  const storyRender = useMemo(() => {
    if (!projection || size.w === 0) return [] as Array<{
      story: typeof stories[number]; x: number; y: number; dim: boolean;
    }>;
    const out: Array<{ story: typeof stories[number]; x: number; y: number; dim: boolean; }> = [];
    for (const s of stories) {
      if (!visible.has(s.id)) continue;
      const p = projectPoint(projection, view, s.lnglat);
      if (!p) continue;
      const dim = selectedCountry ? s.country !== selectedCountry : false;
      out.push({ story: s, x: p.x, y: p.y, dim });
    }
    return out;
  }, [stories, visible, projection, view, selectedCountry, size.w]);

  return (
    <div ref={wrapperRef} className="absolute inset-0">
      {worldErr && (
        <div className="absolute inset-0 flex items-center justify-center text-parchment-200/70 text-sm pointer-events-none">
          地图数据加载失败：{worldErr}
        </div>
      )}
      {!world && !worldErr && (
        <div className="absolute inset-0 flex items-center justify-center text-parchment-200/40 text-sm pointer-events-none font-display tracking-widest">
          <span className="shimmer px-6 py-2 rounded-full">LOADING THE WORLD</span>
        </div>
      )}

      {projection && size.w > 0 && view === 'globe' && (
        <AuroraRing
          cx={size.w / 2}
          cy={size.h / 2}
          r={Math.min(size.w, size.h) * 0.43 * zoom}
        />
      )}

      <svg
        width={size.w}
        height={size.h}
        viewBox={`0 0 ${size.w} ${size.h}`}
        className="absolute inset-0 select-none"
        style={{ touchAction: 'none', cursor: dragRef.current.pointerId !== null ? 'grabbing' : 'grab' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        onClick={onSvgClick}
      >
        <defs>
          <radialGradient id="sphere-fill" cx="38%" cy="32%" r="78%">
            <stop offset="0%" stopColor="#0d1226" stopOpacity="1" />
            <stop offset="55%" stopColor="#06080f" stopOpacity="1" />
            <stop offset="100%" stopColor="#02030a" stopOpacity="1" />
          </radialGradient>
          <radialGradient id="sphere-rim" cx="50%" cy="50%" r="50%">
            <stop offset="80%" stopColor="rgba(212, 181, 116, 0)" />
            <stop offset="95%" stopColor="rgba(212, 181, 116, 0.32)" />
            <stop offset="100%" stopColor="rgba(212, 181, 116, 0)" />
          </radialGradient>
          <filter id="country-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.2" />
          </filter>
        </defs>

        {/* Sphere */}
        {projection && view === 'globe' && pathGen && (
          <>
            <circle
              cx={size.w / 2}
              cy={size.h / 2}
              r={Math.min(size.w, size.h) * 0.43 * zoom}
              fill="url(#sphere-fill)"
            />
            <circle
              cx={size.w / 2}
              cy={size.h / 2}
              r={Math.min(size.w, size.h) * 0.43 * zoom + 0.5}
              fill="none"
              stroke="rgba(212, 181, 116, 0.18)"
              strokeWidth={0.6}
            />
            {/* Graticule */}
            <Graticule projection={projection} />
          </>
        )}

        {/* Countries */}
        {world && pathGen && (
          <g>
            {world.countries.features.map((feat, i) => {
              const numeric = String(feat.id ?? i).padStart(3, '0');
              const d = pathGen(feat);
              if (!d) return null;
              const isSel = selectedNumeric === numeric;
              const count = COUNTRY_BY_NUMERIC[numeric]
                ? countryCounts.get(COUNTRY_BY_NUMERIC[numeric].iso) ?? 0
                : 0;
              const hasStories = count > 0;
              return (
                <path
                  key={String(feat.id) + i}
                  d={d}
                  className="country-path"
                  data-numeric={numeric}
                  fill={isSel ? 'rgba(212, 181, 116, 0.18)' : hasStories ? 'rgba(212, 181, 116, 0.045)' : 'rgba(255,255,255,0.012)'}
                  stroke={isSel ? 'rgba(251, 191, 36, 0.85)' : hasStories ? 'rgba(212, 181, 116, 0.32)' : 'rgba(212, 181, 116, 0.10)'}
                  strokeWidth={isSel ? 1.2 : 0.4}
                />
              );
            })}
          </g>
        )}

        {/* Cross-culture lines */}
        {showCross && themeFilter && projection && (
          <CrossCultureLines
            projection={projection}
            view={view}
            stories={storyRender.map(s => s.story)}
            themeId={themeFilter}
          />
        )}
      </svg>

      {/* Markers in HTML overlay for crisp emoji rendering */}
      <div className="absolute inset-0 pointer-events-none">
        {storyRender.map(({ story, x, y, dim }) => (
          <StoryMarker
            key={story.id}
            story={story}
            x={x}
            y={y}
            dim={dim}
            highlighted={story.id === selectedStoryId || story.id === hoverStoryId}
            showLabel={showLabels}
            lang={lang}
          />
        ))}
      </div>
    </div>
  );
};

const Graticule: React.FC<{ projection: GeoProjection }> = ({ projection }) => {
  const path = geoPath(projection);
  const lines: string[] = [];
  // Meridians every 30deg
  for (let lon = -180; lon <= 180; lon += 30) {
    const coords: [number, number][] = [];
    for (let lat = -80; lat <= 80; lat += 5) coords.push([lon, lat]);
    const d = path({ type: 'LineString', coordinates: coords } as any);
    if (d) lines.push(d);
  }
  // Parallels every 30deg
  for (let lat = -60; lat <= 60; lat += 30) {
    const coords: [number, number][] = [];
    for (let lon = -180; lon <= 180; lon += 5) coords.push([lon, lat]);
    const d = path({ type: 'LineString', coordinates: coords } as any);
    if (d) lines.push(d);
  }
  return (
    <g stroke="rgba(212, 181, 116, 0.08)" strokeWidth={0.5} fill="none">
      {lines.map((d, i) => <path key={i} d={d} />)}
    </g>
  );
};
