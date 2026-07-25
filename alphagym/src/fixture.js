/** 读取 data/ 下的真实行情夹具（Node 环境） */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { normalizeBars } from './bars.js';

const HERE = dirname(fileURLToPath(import.meta.url));

export function loadFixture(name) {
  const raw = JSON.parse(readFileSync(join(HERE, '..', 'data', name), 'utf8'));
  const bars = raw.rows.map(([t, o, h, l, c, v]) => ({ t, o, h, l, c, v }));
  return { ...raw, bars: normalizeBars(bars) };
}

export const GOOG = () => loadFixture('goog_daily.json');
export const EURUSD = () => loadFixture('eurusd_h1.json');
