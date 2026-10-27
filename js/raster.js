// Reads small windows from Sentinel-2 Cloud-Optimized GeoTIFFs with geotiff.js (HTTP range requests)
// and computes a vegetation index on the field's lon/lat grid, masking clouds with the SCL band.

import { gridToUtm } from './geo.js';
import { INDICES, stats, binCounts } from './indices.js';

// SCL classes treated as cloud: 3 shadow, 8 medium, 9 high probability, 10 thin cirrus.
const CLOUD = new Set([3, 8, 9, 10]);
// SCL classes treated as no usable data: 0 no data, 1 saturated/defective.
const BAD = new Set([0, 1]);

let loader = (url) => globalThis.GeoTIFF.fromUrl(url, { cacheSize: 16 });
export function setTiffLoader(fn) { loader = fn; }

let pool;
function getPool() {
  if (pool === undefined) {
    try {
      pool = globalThis.GeoTIFF && globalThis.GeoTIFF.Pool && typeof Worker !== 'undefined'
        ? new globalThis.GeoTIFF.Pool(Math.min(4, (globalThis.navigator && navigator.hardwareConcurrency) || 2))
        : null;
    } catch { pool = null; }
  }
  return pool || undefined;
}

const imgCache = new Map();
function getImage(url) {
  if (imgCache.has(url)) {
    const p = imgCache.get(url);
    imgCache.delete(url); imgCache.set(url, p); // LRU bump
    return p;
  }
  const p = Promise.resolve(loader(url)).then(t => t.getImage());
  p.catch(() => imgCache.delete(url));
  imgCache.set(url, p);
  while (imgCache.size > 30) imgCache.delete(imgCache.keys().next().value);
  return p;
}

export function clearImageCache() { imgCache.clear(); }

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

async function readWindow(asset, xmin, ymin, xmax, ymax, signal) {
  const img = await getImage(asset.href);
  const [ox, oy] = img.getOrigin();
  const [rx, ry] = img.getResolution(); // ry is negative (north-up)
  const W = img.getWidth(), H = img.getHeight();
  const c0 = clamp(Math.floor((xmin - ox) / rx) - 1, 0, W);
  const c1 = clamp(Math.ceil((xmax - ox) / rx) + 1, 0, W);
  const r0 = clamp(Math.floor((ymax - oy) / ry) - 1, 0, H);
  const r1 = clamp(Math.ceil((ymin - oy) / ry) + 1, 0, H);
  if (c1 <= c0 || r1 <= r0) return null;
  const opts = { window: [c0, r0, c1, r1], interleave: false };
  const p = getPool(); if (p) opts.pool = p;
  if (signal) opts.signal = signal;
  const bands = await img.readRasters(opts);
  return { bands, c0, r0, w: c1 - c0, h: r1 - r0, ox, oy, rx, ry };
}

function sample(win, x, y, band = 0) {
  const col = Math.floor((x - win.ox) / win.rx) - win.c0;
  const row = Math.floor((y - win.oy) / win.ry) - win.r0;
  if (col < 0 || row < 0 || col >= win.w || row >= win.h) return NaN;
  return win.bands[band][row * win.w + col];
}

function gridUtm(grid, zone, south) {
  grid._utm = grid._utm || {};
  const key = `${zone}${south ? 'S' : 'N'}`;
  if (!grid._utm[key]) {
    const xy = gridToUtm(grid, zone, south);
    let xmin = Infinity, ymin = Infinity, xmax = -Infinity, ymax = -Infinity;
    for (let i = 0; i < grid.W * grid.H; i++) {
      if (!grid.inside[i]) continue;
      const x = xy[2 * i], y = xy[2 * i + 1];
      if (x < xmin) xmin = x; if (x > xmax) xmax = x; if (y < ymin) ymin = y; if (y > ymax) ymax = y;
    }
    grid._utm[key] = { xy, box: [xmin - 30, ymin - 30, xmax + 30, ymax + 30] };
  }
  return grid._utm[key];
}

/**
 * Compute an index for one scene on the field grid.
 * status per pixel: 0 outside field, 1 valid, 2 cloud/shadow, 3 no data
 */
export async function processScene(grid, scene, indexKey, { signal } = {}) {
  const def = INDICES[indexKey];
  if (!def) throw new Error(`Unknown index ${indexKey}`);
  if (scene.zone == null) throw new Error('Scene has no UTM projection');
  const { xy, box } = gridUtm(grid, scene.zone, scene.south);
  const names = [...new Set([...def.bands, 'scl'])];
  for (const b of names) if (!scene.assets[b]) throw new Error(`Band ${b} missing in ${scene.id}`);
  const wins = {};
  await Promise.all(names.map(async (b) => { wins[b] = await readWindow(scene.assets[b], ...box, signal); }));

  const n = grid.W * grid.H;
  const values = new Float32Array(n).fill(NaN);
  const status = new Uint8Array(n);
  const rgb = def.trueColor ? new Uint8ClampedArray(n * 3) : null;
  let valid = 0, cloud = 0, nodata = 0;
  const missing = names.some(b => !wins[b]);
  const bv = {};

  for (let i = 0; i < n; i++) {
    if (!grid.inside[i]) continue;
    if (missing) { status[i] = 3; nodata++; continue; }
    const x = xy[2 * i], y = xy[2 * i + 1];
    const scl = sample(wins.scl, x, y);
    if (!(scl >= 0) || BAD.has(scl)) { status[i] = 3; nodata++; continue; }
    if (CLOUD.has(scl)) { status[i] = 2; cloud++; continue; }
    if (def.trueColor) {
      const r = sample(wins.visual, x, y, 0), g = sample(wins.visual, x, y, 1), b = sample(wins.visual, x, y, 2);
      if (!(r + g + b > 0)) { status[i] = 3; nodata++; continue; }
      rgb[i * 3] = r; rgb[i * 3 + 1] = g; rgb[i * 3 + 2] = b;
      status[i] = 1; valid++;
      continue;
    }
    let ok = true;
    for (const b of def.bands) {
      const raw = sample(wins[b], x, y);
      const a = scene.assets[b];
      if (!(raw > 0) || raw === a.nodata) { ok = false; break; }
      bv[b] = raw * a.scale + a.offset;
    }
    if (!ok) { status[i] = 3; nodata++; continue; }
    const v = def.fn(bv);
    if (Number.isFinite(v)) { values[i] = v; status[i] = 1; valid++; } else { status[i] = 3; nodata++; }
  }

  const covered = grid.count - nodata;
  return {
    sceneId: scene.id, date: scene.date, indexKey,
    values, status, rgb,
    valid, cloud, nodata, inside: grid.count,
    validFrac: grid.count ? valid / grid.count : 0,
    cloudFrac: covered > 0 ? cloud / covered : 1,
    stats: def.trueColor ? null : stats(values),
    bins: def.trueColor ? null : binCounts(indexKey, values),
  };
}

/** Run async fn over items with limited concurrency. */
export async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}
