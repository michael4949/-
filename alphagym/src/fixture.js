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
export const SP500 = () => loadFixture('sp500_daily.json');
export const NASDAQ = () => loadFixture('nasdaq_daily.json');

/** 全部品种，键为 symbol —— 供 query.js / similar.js 使用 */
export function allDatasets() {
  const out = {};
  for (const f of ['sp500_daily.json', 'nasdaq_daily.json', 'goog_daily.json', 'eurusd_h1.json']) {
    const d = loadFixture(f);
    out[d.symbol] = d;
  }
  return out;
}
