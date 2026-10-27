// Productivity zoning: classify an index raster into N zones, smooth, and vectorise to GeoJSON.

/** Class breaks (N-1 inner thresholds) for finite values. */
export function breaks(values, n, method = 'quantile') {
  const v = [];
  for (let i = 0; i < values.length; i++) if (Number.isFinite(values[i])) v.push(values[i]);
  if (v.length < n) return null;
  v.sort((a, b) => a - b);
  if (method === 'equal') {
    const lo = v[Math.floor(v.length * 0.02)], hi = v[Math.ceil(v.length * 0.98) - 1];
    return Array.from({ length: n - 1 }, (_, k) => lo + ((hi - lo) * (k + 1)) / n);
  }
  if (method === 'kmeans') return kmeansBreaks(v, n);
  return Array.from({ length: n - 1 }, (_, k) => v[Math.floor((v.length * (k + 1)) / n)]);
}

function kmeansBreaks(sorted, n) {
  // 1-D k-means initialised from quantiles; returns midpoints between sorted centres.
  let c = Array.from({ length: n }, (_, k) => sorted[Math.floor((sorted.length * (k + 0.5)) / n)]);
  for (let it = 0; it < 30; it++) {
    const sum = new Array(n).fill(0), cnt = new Array(n).fill(0);
    let k = 0;
    for (const x of sorted) {
      while (k < n - 1 && Math.abs(x - c[k + 1]) < Math.abs(x - c[k])) k++;
      sum[k] += x; cnt[k]++;
    }
    const nc = c.map((ci, i) => (cnt[i] ? sum[i] / cnt[i] : ci));
    const moved = nc.some((x, i) => Math.abs(x - c[i]) > 1e-6);
    c = nc.sort((a, b) => a - b);
    if (!moved) break;
  }
  return c.slice(0, -1).map((ci, i) => (ci + c[i + 1]) / 2);
}

/** Zone index per pixel: 0 = none, 1..n = low..high */
export function classify(values, br) {
  const out = new Uint8Array(values.length);
  for (let i = 0; i < values.length; i++) {
    const x = values[i];
    if (!Number.isFinite(x)) continue;
    let k = 0; while (k < br.length && x >= br[k]) k++;
    out[i] = k + 1;
  }
  return out;
}

/** 3x3 majority filter (only over classified pixels), repeated `passes` times. */
export function majority(cls, W, H, n, passes = 1) {
  let cur = cls;
  for (let p = 0; p < passes; p++) {
    const next = new Uint8Array(cur);
    const counts = new Uint16Array(n + 1);
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
      const i = r * W + c;
      if (!cur[i]) continue;
      counts.fill(0);
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const rr = r + dr, cc = c + dc;
        if (rr < 0 || cc < 0 || rr >= H || cc >= W) continue;
        const z = cur[rr * W + cc]; if (z) counts[z]++;
      }
      let best = cur[i], bc = counts[best];
      for (let z = 1; z <= n; z++) if (counts[z] > bc) { best = z; bc = counts[z]; }
      next[i] = best;
    }
    cur = next;
  }
  return cur;
}

/** Per-zone pixel count and mean index. */
export function zoneStats(cls, values, n, pixelAreaM2) {
  const z = Array.from({ length: n }, (_, k) => ({ zone: k + 1, count: 0, sum: 0, min: Infinity, max: -Infinity }));
  let total = 0;
  for (let i = 0; i < cls.length; i++) {
    const k = cls[i]; if (!k) continue;
    const s = z[k - 1]; const v = values[i];
    s.count++; total++;
    if (Number.isFinite(v)) { s.sum += v; if (v < s.min) s.min = v; if (v > s.max) s.max = v; }
  }
  return z.map(s => ({
    zone: s.zone, count: s.count,
    mean: s.count ? s.sum / s.count : NaN,
    min: s.min, max: s.max,
    areaHa: (s.count * pixelAreaM2) / 10000,
    pct: total ? (100 * s.count) / total : 0,
  }));
}

/**
 * Vectorise zones into GeoJSON: merge horizontal runs per row, then stack identical runs
 * across consecutive rows into rectangles. One MultiPolygon feature per zone.
 */
export function vectorise(cls, grid, n) {
  const { W, H, west, north, dLon, dLat } = grid;
  const open = new Map(); // key c0:c1:z -> {r0, r1}
  const rects = Array.from({ length: n + 1 }, () => []);
  const flush = (key, rec) => { const [c0, c1, z] = key.split(':').map(Number); rects[z].push([c0, rec.r0, c1, rec.r1]); };
  for (let r = 0; r <= H; r++) {
    const runs = new Set();
    if (r < H) {
      let c = 0;
      while (c < W) {
        const z = cls[r * W + c];
        if (!z) { c++; continue; }
        let e = c; while (e + 1 < W && cls[r * W + e + 1] === z) e++;
        runs.add(`${c}:${e + 1}:${z}`);
        c = e + 1;
      }
    }
    for (const [key, rec] of open) if (!runs.has(key)) { flush(key, rec); open.delete(key); }
    for (const key of runs) {
      if (open.has(key)) open.get(key).r1 = r + 1; else open.set(key, { r0: r, r1: r + 1 });
    }
  }
  const round = (x) => Math.round(x * 1e7) / 1e7;
  const features = [];
  for (let z = 1; z <= n; z++) {
    if (!rects[z].length) continue;
    const coords = rects[z].map(([c0, r0, c1, r1]) => {
      const x0 = round(west + c0 * dLon), x1 = round(west + c1 * dLon);
      const y0 = round(north - r0 * dLat), y1 = round(north - r1 * dLat);
      return [[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]];
    });
    features.push({ type: 'Feature', properties: { zone: z }, geometry: { type: 'MultiPolygon', coordinates: coords } });
  }
  return { type: 'FeatureCollection', features };
}

/** Red (low) -> yellow -> green (high) colours for N zones. */
export function zoneColors(n) {
  const stops = [[215, 48, 39], [252, 141, 89], [254, 224, 139], [145, 207, 96], [26, 152, 80]];
  return Array.from({ length: n }, (_, k) => {
    const t = n === 1 ? 1 : k / (n - 1);
    const p = t * (stops.length - 1); const i = Math.min(Math.floor(p), stops.length - 2); const f = p - i;
    return stops[i].map((v, j) => Math.round(v + (stops[i + 1][j] - v) * f));
  });
}
