import { feature, mesh } from 'topojson-client';
import type { Feature, FeatureCollection, Geometry } from 'geojson';

/** Cached world atlas data loaded once on app boot. */
export interface WorldAtlas {
  countries: FeatureCollection<Geometry, { name: string }>;
  borders: Geometry;
  land: Geometry;
}

let cached: Promise<WorldAtlas> | null = null;

const SOURCES = [
  'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json',
  'https://unpkg.com/world-atlas@2/countries-110m.json',
];

async function fetchOne(url: string): Promise<any> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`world-atlas fetch ${r.status} from ${url}`);
  return r.json();
}

export function loadWorld(): Promise<WorldAtlas> {
  if (cached) return cached;
  cached = (async () => {
    let topo: any | null = null;
    let lastErr: unknown = null;
    for (const url of SOURCES) {
      try {
        topo = await fetchOne(url);
        break;
      } catch (e) {
        lastErr = e;
      }
    }
    if (!topo) throw lastErr ?? new Error('world-atlas unreachable');

    const countriesTopo = topo.objects.countries;
    const landTopo = topo.objects.land;
    const countries = feature(topo, countriesTopo) as unknown as FeatureCollection<Geometry, { name: string }>;
    const borders = mesh(topo, countriesTopo, (a, b) => a !== b);
    const landFeat = feature(topo, landTopo) as unknown as Feature<Geometry>;
    return { countries, borders, land: landFeat.geometry };
  })();
  return cached;
}
