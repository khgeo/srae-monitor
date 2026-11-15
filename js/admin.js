// Commune / district / province of a point, from data/admin/communes.geojson (built by
// scripts/build_admin_data.py). Works offline from the site's own files, so it is safe when many
// users create fields at the same time. Outside Cambodia the app falls back to Nominatim.

import { bbox, pointInGeom } from './geo.js';

const URL_ = 'data/admin/communes.geojson';
let fcP;

/** Load the commune polygons once (≈0.5 MB compressed); null if the file is missing. */
export function loadCommunes() {
  if (!fcP) {
    fcP = fetch(URL_)
      .then(r => (r.ok ? r.json() : null))
      .then((fc) => {
        if (!fc || !Array.isArray(fc.features)) return null;
        fc.features.forEach((f) => { f._bb = bbox(f.geometry); });
        return fc;
      })
      .catch(() => null);
    fcP.then((fc) => { if (!fc) fcP = null; }); // allow a later retry
  }
  return fcP;
}

/** Rough Cambodia bounding box, to skip loading the file for fields elsewhere. */
export const inCambodia = (lon, lat) => lon > 102.3 && lon < 107.7 && lat > 9.9 && lat < 14.75;

/**
 * Admin units at a point: { code, en, km, den, dkm, pen, pkm } or null.
 * If the point falls in a gap between simplified polygons, the nearest commune within ~2 km is used.
 */
export async function adminAt(lon, lat) {
  if (!inCambodia(lon, lat)) return null;
  const fc = await loadCommunes();
  if (!fc) return null;
  for (const f of fc.features) {
    const [w, s, e, n] = f._bb;
    if (lon < w || lon > e || lat < s || lat > n) continue;
    if (pointInGeom(lon, lat, f.geometry)) return { ...f.properties };
  }
  let best = null, bestD = 0.02 ** 2; // ≈2 km
  for (const f of fc.features) {
    const [w, s, e, n] = f._bb;
    const dx = lon < w ? w - lon : lon > e ? lon - e : 0;
    const dy = lat < s ? s - lat : lat > n ? lat - n : 0;
    if (dx * dx + dy * dy > bestD) continue;
    const d = nearestVertexD2(f.geometry, lon, lat);
    if (d < bestD) { bestD = d; best = f; }
  }
  return best ? { ...best.properties } : null;
}

function nearestVertexD2(geom, lon, lat) {
  let m = Infinity;
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.type === 'MultiPolygon' ? geom.coordinates : [];
  for (const p of polys) for (const ring of p) for (const [x, y] of ring) {
    const d = (x - lon) ** 2 + (y - lat) ** 2;
    if (d < m) m = d;
  }
  return m;
}

/** Location text in the chosen language, e.g. "ឃុំទឹកល្អក់, ស្រុកគងពិសី, ខេត្តកំពង់ស្ពឺ". */
export function adminLabel(a, lang = 'en') {
  if (!a) return '';
  if (lang === 'km' && a.km) return [a.km, a.dkm, a.pkm].filter(Boolean).join(', ');
  return [a.en, a.den, a.pen].filter(Boolean).join(', ');
}

/** Location text for a field: Cambodian admin units when known, else the stored place name. */
export function fieldLocation(f, lang = 'en') {
  return (f && f.admin && adminLabel(f.admin, lang)) || (f && f.location) || '';
}
