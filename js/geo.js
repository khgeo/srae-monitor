// Geometry helpers: WGS84 -> UTM projection, polygon area, bbox, point-in-polygon.
// No external dependencies so the app stays light and testable.

const A = 6378137.0;
const F = 1 / 298.257223563;
const E2 = F * (2 - F);
const EP2 = E2 / (1 - E2);
const K0 = 0.9996;
const D2R = Math.PI / 180;

/** UTM zone number for a longitude/latitude (handles Norway/Svalbard exceptions loosely). */
export function utmZone(lon, lat) {
  let z = Math.floor((lon + 180) / 6) + 1;
  if (lat >= 56 && lat < 64 && lon >= 3 && lon < 12) z = 32;
  return Math.min(Math.max(z, 1), 60);
}

/** Parse an EPSG code (32601-32660 north, 32701-32760 south). Returns {zone, south} or null. */
export function parseUtmEpsg(epsg) {
  const n = Number(String(epsg).replace(/^EPSG:/i, ''));
  if (n >= 32601 && n <= 32660) return { zone: n - 32600, south: false };
  if (n >= 32701 && n <= 32760) return { zone: n - 32700, south: true };
  return null;
}

/** Forward transverse Mercator (UTM) on WGS84. Returns [easting, northing] in metres. */
export function toUtm(lon, lat, zone, south) {
  const phi = lat * D2R;
  const lam = lon * D2R;
  const lam0 = ((zone - 1) * 6 - 180 + 3) * D2R;
  const sinP = Math.sin(phi), cosP = Math.cos(phi), tanP = Math.tan(phi);
  const N = A / Math.sqrt(1 - E2 * sinP * sinP);
  const T = tanP * tanP;
  const C = EP2 * cosP * cosP;
  const Aa = (lam - lam0) * cosP;
  const e4 = E2 * E2, e6 = e4 * E2;
  const M = A * ((1 - E2 / 4 - 3 * e4 / 64 - 5 * e6 / 256) * phi
    - (3 * E2 / 8 + 3 * e4 / 32 + 45 * e6 / 1024) * Math.sin(2 * phi)
    + (15 * e4 / 256 + 45 * e6 / 1024) * Math.sin(4 * phi)
    - (35 * e6 / 3072) * Math.sin(6 * phi));
  const A2 = Aa * Aa, A3 = A2 * Aa, A4 = A3 * Aa, A5 = A4 * Aa, A6 = A5 * Aa;
  const x = K0 * N * (Aa + (1 - T + C) * A3 / 6 + (5 - 18 * T + T * T + 72 * C - 58 * EP2) * A5 / 120) + 500000;
  let y = K0 * (M + N * tanP * (A2 / 2 + (5 - T + 9 * C + 4 * C * C) * A4 / 24
    + (61 - 58 * T + T * T + 600 * C - 330 * EP2) * A6 / 720));
  if (south) y += 10000000;
  return [x, y];
}

/** All outer+inner rings of a Polygon / MultiPolygon geometry as arrays of [lon,lat]. */
export function rings(geom) {
  if (!geom) return [];
  if (geom.type === 'Polygon') return geom.coordinates;
  if (geom.type === 'MultiPolygon') return geom.coordinates.flat();
  return [];
}

/** Polygons as list of ring-lists (for area: outer minus holes). */
function polygons(geom) {
  if (!geom) return [];
  if (geom.type === 'Polygon') return [geom.coordinates];
  if (geom.type === 'MultiPolygon') return geom.coordinates;
  return [];
}

export function bbox(geom) {
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  for (const r of rings(geom)) for (const [x, y] of r) {
    if (x < w) w = x; if (x > e) e = x; if (y < s) s = y; if (y > n) n = y;
  }
  return [w, s, e, n];
}

export function centroid(geom) {
  // Area-weighted centroid of outer rings (planar in degrees is fine for field sizes).
  let cx = 0, cy = 0, aSum = 0;
  for (const poly of polygons(geom)) {
    const r = poly[0];
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const f = r[j][0] * r[i][1] - r[i][0] * r[j][1];
      cx += (r[j][0] + r[i][0]) * f;
      cy += (r[j][1] + r[i][1]) * f;
      aSum += f;
    }
  }
  if (Math.abs(aSum) < 1e-15) {
    const [w, s, e, n] = bbox(geom);
    return [(w + e) / 2, (s + n) / 2];
  }
  return [cx / (3 * aSum), cy / (3 * aSum)];
}

function ringAreaPlanar(r) {
  let a = 0;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] + r[i][0]) * (r[j][1] - r[i][1]);
  return Math.abs(a / 2);
}

/** Area in square metres, computed in the UTM zone of the geometry's centroid. */
export function areaM2(geom) {
  const [clon, clat] = centroid(geom);
  const zone = utmZone(clon, clat);
  const south = clat < 0;
  let total = 0;
  for (const poly of polygons(geom)) {
    poly.forEach((ring, k) => {
      const a = ringAreaPlanar(ring.map(([x, y]) => toUtm(x, y, zone, south)));
      total += k === 0 ? a : -a;
    });
  }
  return Math.max(total, 0);
}

/** Even-odd ray casting across all rings (so holes work). */
export function pointInGeom(lon, lat, geom) {
  let inside = false;
  for (const r of rings(geom)) {
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const xi = r[i][0], yi = r[i][1], xj = r[j][0], yj = r[j][1];
      if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}

/** Normalise a GeoJSON geometry to Polygon/MultiPolygon, or null if it has no area. */
export function toAreal(geom) {
  if (!geom) return null;
  if (geom.type === 'Polygon' || geom.type === 'MultiPolygon') return geom;
  if (geom.type === 'GeometryCollection') {
    const polys = [];
    for (const g of geom.geometries || []) {
      const a = toAreal(g);
      if (!a) continue;
      if (a.type === 'Polygon') polys.push(a.coordinates); else polys.push(...a.coordinates);
    }
    if (!polys.length) return null;
    return polys.length === 1 ? { type: 'Polygon', coordinates: polys[0] } : { type: 'MultiPolygon', coordinates: polys };
  }
  return null;
}

/** Strip Z values and round coordinates to ~1 cm to keep storage small. */
export function cleanGeom(geom) {
  const r = (c) => [Math.round(c[0] * 1e7) / 1e7, Math.round(c[1] * 1e7) / 1e7];
  if (geom.type === 'Polygon') return { type: 'Polygon', coordinates: geom.coordinates.map(ring => ring.map(r)) };
  return { type: 'MultiPolygon', coordinates: geom.coordinates.map(p => p.map(ring => ring.map(r))) };
}

/**
 * Regular lon/lat grid covering a field at ~targetRes metres per pixel.
 * Pixel size grows automatically if the field is very large, capping the pixel count.
 */
export function makeGrid(geom, targetRes = 10, maxPixels = 400000) {
  const [w, s, e, n] = bbox(geom);
  const lat0 = (s + n) / 2;
  const mPerDegLat = 111320;
  const mPerDegLon = 111320 * Math.cos(lat0 * D2R);
  let res = targetRes;
  let W, H;
  for (;;) {
    W = Math.max(1, Math.ceil(((e - w) * mPerDegLon) / res));
    H = Math.max(1, Math.ceil(((n - s) * mPerDegLat) / res));
    if (W * H <= maxPixels) break;
    res *= 1.25;
  }
  const dLon = (e - w) / W || res / mPerDegLon;
  const dLat = (n - s) / H || res / mPerDegLat;
  const inside = new Uint8Array(W * H);
  let count = 0;
  for (let row = 0; row < H; row++) {
    const lat = n - (row + 0.5) * dLat;
    for (let col = 0; col < W; col++) {
      const lon = w + (col + 0.5) * dLon;
      if (pointInGeom(lon, lat, geom)) { inside[row * W + col] = 1; count++; }
    }
  }
  const pixelAreaM2 = (dLon * mPerDegLon) * (dLat * mPerDegLat);
  return { west: w, south: s, east: e, north: n, W, H, dLon, dLat, inside, count, pixelAreaM2, res };
}

/** UTM coordinates of every grid pixel centre (Float64Array x,y interleaved). */
export function gridToUtm(grid, zone, south) {
  const out = new Float64Array(grid.W * grid.H * 2);
  for (let row = 0; row < grid.H; row++) {
    const lat = grid.north - (row + 0.5) * grid.dLat;
    for (let col = 0; col < grid.W; col++) {
      const lon = grid.west + (col + 0.5) * grid.dLon;
      const [x, y] = toUtm(lon, lat, zone, south);
      const k = (row * grid.W + col) * 2;
      out[k] = x; out[k + 1] = y;
    }
  }
  return out;
}

export function fmtArea(m2, unit = 'ha') {
  const ha = m2 / 10000;
  if (unit === 'ha') return ha >= 100 ? ha.toFixed(0) : ha >= 10 ? ha.toFixed(1) : ha.toFixed(2);
  return ha.toFixed(2);
}
