// Sentinel-2 L2A scene search through the public Earth Search STAC API (Element 84, AWS Open Data).
// No API key needed; the API and the COG bucket both allow browser (CORS) access.

import { centroid, pointInGeom, parseUtmEpsg, utmZone } from './geo.js';

export const STAC_URL = 'https://earth-search.aws.element84.com/v1/search';

const BAND_KEYS = ['blue', 'green', 'red', 'rededge1', 'rededge2', 'rededge3', 'nir', 'nir08', 'swir16', 'swir22', 'scl', 'visual'];

function isoDay(d) { return d.toISOString().slice(0, 10); }

/** Pull scale/offset for an asset; falls back to the processing-baseline rule. */
export function assetScaling(asset, props) {
  const rb = asset && asset['raster:bands'] && asset['raster:bands'][0];
  if (rb && (rb.scale !== undefined || rb.offset !== undefined)) {
    return { scale: rb.scale ?? 1e-4, offset: rb.offset ?? 0, nodata: rb.nodata ?? 0 };
  }
  const pb = parseFloat(props['s2:processing_baseline'] || '0');
  return { scale: 1e-4, offset: pb >= 4 ? -0.1 : 0, nodata: 0 };
}

/** Normalise a STAC item into a compact scene record. */
export function normaliseItem(item, fieldCentroid) {
  const p = item.properties || {};
  let epsg = p['proj:epsg'] ?? p['proj:code'];
  if (!epsg && p['mgrs:utm_zone']) {
    const south = p['mgrs:latitude_band'] && p['mgrs:latitude_band'] < 'N';
    epsg = (south ? 32700 : 32600) + Number(p['mgrs:utm_zone']);
  }
  if (!epsg && fieldCentroid) epsg = (fieldCentroid[1] < 0 ? 32700 : 32600) + utmZone(fieldCentroid[0], fieldCentroid[1]);
  const utm = parseUtmEpsg(epsg);
  const assets = {};
  for (const k of BAND_KEYS) {
    const a = item.assets && item.assets[k];
    if (!a) continue;
    const href = a.href.startsWith('s3://') ? a.href.replace(/^s3:\/\/([^/]+)\//, 'https://$1.s3.amazonaws.com/') : a.href;
    assets[k] = k === 'scl' || k === 'visual' ? { href, scale: 1, offset: 0, nodata: 0 } : { href, ...assetScaling(a, p) };
  }
  return {
    id: item.id,
    datetime: p.datetime,
    date: (p.datetime || '').slice(0, 10),
    cloud: p['eo:cloud_cover'] ?? null,
    platform: p.platform || '',
    tile: p['s2:mgrs_tile'] || item.id.split('_')[1] || '',
    zone: utm ? utm.zone : null,
    south: utm ? utm.south : false,
    geometry: item.geometry,
    assets,
  };
}

/**
 * One scene per acquisition date. Prefer the tile whose footprint contains the field centre,
 * then the lowest scene cloud cover.
 */
export function dedupeByDate(scenes, c) {
  const byDate = new Map();
  for (const s of scenes) {
    const covers = c && s.geometry ? pointInGeom(c[0], c[1], s.geometry) : true;
    const cur = byDate.get(s.date);
    const score = (covers ? 0 : 1000) + (s.cloud ?? 50);
    if (!cur || score < cur.score) byDate.set(s.date, { s, score });
  }
  return [...byDate.values()].map(v => v.s).sort((a, b) => b.datetime.localeCompare(a.datetime));
}

/**
 * Search scenes intersecting the field geometry.
 * @returns {Promise<Array>} newest first
 */
export async function searchScenes(geometry, { start, end, maxCloud = 60, collection = 'sentinel-2-l2a', maxItems = 400, signal } = {}) {
  const body = {
    collections: [collection],
    intersects: geometry,
    datetime: `${isoDay(start)}T00:00:00Z/${isoDay(end)}T23:59:59Z`,
    limit: 100,
    query: { 'eo:cloud_cover': { lte: maxCloud } },
    sortby: [{ field: 'properties.datetime', direction: 'desc' }],
  };
  const c = centroid(geometry);
  const items = [];
  let url = STAC_URL, method = 'POST', payload = body, guard = 0;
  while (url && items.length < maxItems && guard++ < 10) {
    const res = await fetch(url, {
      method,
      headers: method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
      body: method === 'POST' ? JSON.stringify(payload) : undefined,
      signal,
    });
    if (!res.ok) throw new Error(`STAC ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const json = await res.json();
    items.push(...(json.features || []));
    const next = (json.links || []).find(l => l.rel === 'next');
    if (!next || !(json.features || []).length) break;
    url = next.href;
    method = (next.method || 'GET').toUpperCase();
    payload = next.body ? (next.merge ? { ...payload, ...next.body } : next.body) : payload;
  }
  return dedupeByDate(items.map(it => normaliseItem(it, c)).filter(s => s.assets.red && s.assets.nir), c);
}
