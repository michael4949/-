import { feature, mesh } from 'topojson-client';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import bundled from '../data/atlas/countries-110m.json';

/** Cached world atlas data loaded once on app boot. */
export interface WorldAtlas {
  countries: FeatureCollection<Geometry, { name: string }>;
  borders: Geometry;
  land: Geometry;
}

let cached: Promise<WorldAtlas> | null = null;

export function loadWorld(): Promise<WorldAtlas> {
  if (cached) return cached;
  cached = (async () => {
    const topo: any = bundled;
    const countriesTopo = topo.objects.countries;
    const landTopo = topo.objects.land;
    const countries = feature(topo, countriesTopo) as unknown as FeatureCollection<Geometry, { name: string }>;
    const borders = mesh(topo, countriesTopo, (a, b) => a !== b);
    const landFeat = feature(topo, landTopo) as unknown as Feature<Geometry>;
    return { countries, borders, land: landFeat.geometry };
  })();
  return cached;
}
