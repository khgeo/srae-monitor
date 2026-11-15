// Soil information for a field: SoilGrids 2.0 properties (from data/soil/ built by the GitHub Action,
// or the live SoilGrids REST API as fallback), soil type (Crocker 1962), texture class, fertility
// ratings and indicative crop suitability.

import { bbox, centroid, pointInGeom } from './geo.js';
import { fetchRetry, rateQueue } from './net.js';

// SoilGrids fair use is 5 calls per minute, so live calls from this browser are spaced 12 s apart.
const soilQueue = rateQueue(12000);

const BASE = 'data/soil/';
const REST = 'https://rest.isric.org/soilgrids/v2.0/properties/query';
const PROPS = ['clay', 'sand', 'phh2o', 'soc', 'nitrogen', 'cec'];
const FACTOR = { clay: 10, sand: 10, silt: 10, phh2o: 10, soc: 10, nitrogen: 100, cec: 10 };

let metaP, imageP, typesP;

/** meta.json written by scripts/build_soil_data.py, or null when the data has not been built yet. */
export function loadMeta() {
  if (!metaP) {
    metaP = fetch(`${BASE}meta.json`, { cache: 'no-cache' })
      .then(r => (r.ok ? r.json() : null))
      .catch(() => null);
  }
  return metaP;
}

function loadImage(meta) {
  if (!imageP) {
    imageP = globalThis.GeoTIFF.fromUrl(`${BASE}${meta.raster}?v=${meta.rasterUpdated || ''}`, { allowFullFile: true })
      .then(t => t.getImage());
    imageP.catch(() => { imageP = null; });
  }
  return imageP;
}

/** Soil-type polygons (GeoJSON) with precomputed bounding boxes, or null. */
export function loadSoilTypes() {
  if (!typesP) {
    typesP = loadMeta().then(async (meta) => {
      if (!meta || !meta.soilTypes) return null;
      const r = await fetch(`${BASE}${meta.soilTypes}`);
      if (!r.ok) return null;
      const fc = await r.json();
      fc.features.forEach(f => { f._bb = bbox(f.geometry); });
      return fc;
    }).catch(() => null);
  }
  return typesP;
}

export async function soilTypeAt(lon, lat) {
  const fc = await loadSoilTypes();
  if (!fc) return null;
  for (const f of fc.features) {
    const [w, s, e, n] = f._bb;
    if (lon < w || lon > e || lat < s || lat > n) continue;
    if (pointInGeom(lon, lat, f.geometry)) return f.properties.name;
  }
  return null;
}

/** Read the per-field mean of every band from the GitHub-hosted raster. */
async function fromRaster(meta, geom) {
  const img = await loadImage(meta);
  const [ox, oy] = img.getOrigin();
  const [rx, ry] = img.getResolution();
  const W = img.getWidth(), H = img.getHeight();
  const [w, s, e, n] = bbox(geom);
  const c0 = Math.max(0, Math.floor((w - ox) / rx)), c1 = Math.min(W, Math.floor((e - ox) / rx) + 1);
  const r0 = Math.max(0, Math.floor((n - oy) / ry)), r1 = Math.min(H, Math.floor((s - oy) / ry) + 1);
  if (c1 <= c0 || r1 <= r0) return null;
  const bands = await img.readRasters({ window: [c0, r0, c1, r1], interleave: false });
  const ww = c1 - c0, hh = r1 - r0;
  // pixels whose centre is inside the field; if none (small field) use all pixels touching its bbox
  const idx = [];
  for (let r = 0; r < hh; r++) for (let c = 0; c < ww; c++) {
    const lon = ox + (c0 + c + 0.5) * rx, lat = oy + (r0 + r + 0.5) * ry;
    if (pointInGeom(lon, lat, geom)) idx.push(r * ww + c);
  }
  if (!idx.length) for (let i = 0; i < ww * hh; i++) idx.push(i);
  const nodata = meta.nodata ?? -32768;
  const out = { top: {}, sub: {} };
  let any = false;
  meta.bands.forEach((b, k) => {
    let sum = 0, cnt = 0;
    for (const i of idx) { const v = bands[k][i]; if (v !== nodata) { sum += v; cnt++; } }
    if (!cnt) return;
    any = true;
    out[b.depth === '0-30cm' ? 'top' : 'sub'][b.property] = sum / cnt / b.factor;
  });
  return any ? out : null;
}

/** Live SoilGrids REST API (rate-limited; used only when the GitHub data is missing or the field is outside it). */
async function fromRest(lon, lat) {
  const q = new URLSearchParams({ lon: lon.toFixed(5), lat: lat.toFixed(5), value: 'mean' });
  PROPS.forEach(p => q.append('property', p));
  ['0-5cm', '5-15cm', '15-30cm', '30-60cm'].forEach(d => q.append('depth', d));
  const r = await soilQueue(() => fetchRetry(`${REST}?${q}`, {}, { retries: 2, base: 5000 }));
  if (!r.ok) throw new Error(`SoilGrids ${r.status}`);
  return parseRest(await r.json());
}

/** Parse a SoilGrids v2.0 REST response into {top, sub} conventional units. Exported for tests. */
export function parseRest(json) {
  const W = { '0-5cm': 5, '5-15cm': 10, '15-30cm': 15 };
  const out = { top: {}, sub: {} };
  let any = false;
  for (const L of json?.properties?.layers || []) {
    const f = L.unit_measure?.d_factor || FACTOR[L.name] || 1;
    let s = 0, wsum = 0;
    for (const d of L.depths || []) {
      const v = d.values?.mean;
      if (v == null) continue;
      if (W[d.label]) { s += v * W[d.label]; wsum += W[d.label]; }
      if (d.label === '30-60cm') { out.sub[L.name] = v / f; any = true; }
    }
    if (wsum) { out.top[L.name] = s / wsum / f; any = true; }
  }
  return any ? out : null;
}

/**
 * Soil summary for a field geometry.
 * @returns {Promise<{top, sub, type, source}>} source is 'github' | 'api'
 */
export async function getSoil(geom) {
  const [lon, lat] = centroid(geom);
  const meta = await loadMeta();
  const type = await soilTypeAt(lon, lat);
  let res = null, source = null;
  if (meta && meta.raster && meta.bands) {
    const [w, s, e, n] = meta.bbox;
    if (lon >= w && lon <= e && lat >= s && lat <= n) {
      try { res = await fromRaster(meta, geom); source = 'github'; } catch (err) { console.warn('soil raster failed', err); }
    }
  }
  if (!res) { res = await fromRest(lon, lat); source = 'api'; }
  if (!res) return { top: null, sub: null, type, source: null };
  for (const k of ['top', 'sub']) {
    const v = res[k];
    if (v && v.clay != null && v.sand != null) v.silt = Math.max(0, 100 - v.clay - v.sand);
  }
  return { ...res, type, source };
}

// ------------------------------------------------------------------ interpretation

/** USDA texture class key from % sand, silt, clay. */
export function textureClass(sand, silt, clay) {
  if (![sand, silt, clay].every(Number.isFinite)) return null;
  const tot = sand + silt + clay;
  if (tot > 0 && Math.abs(tot - 100) > 0.5) { sand = (sand * 100) / tot; silt = (silt * 100) / tot; clay = (clay * 100) / tot; }
  if (silt + 1.5 * clay < 15) return 'sand';
  if (silt + 2 * clay < 30) return 'loamySand';
  if ((clay >= 7 && clay < 20 && sand > 52) || (clay < 7 && silt < 50)) return 'sandyLoam';
  if (clay >= 7 && clay < 27 && silt >= 28 && silt < 50 && sand <= 52) return 'loam';
  if (silt >= 80 && clay < 12) return 'silt';
  if ((silt >= 50 && clay >= 12 && clay < 27) || (silt >= 50 && clay < 12)) return 'siltLoam';
  if (clay >= 20 && clay < 35 && silt < 28 && sand > 45) return 'sandyClayLoam';
  if (clay >= 27 && clay < 40 && sand > 20 && sand <= 45) return 'clayLoam';
  if (clay >= 27 && clay < 40 && sand <= 20) return 'siltyClayLoam';
  if (clay >= 35 && sand > 45) return 'sandyClay';
  if (clay >= 40 && silt >= 40) return 'siltyClay';
  if (clay >= 40) return 'clay';
  return 'loam';
}

export const TEXTURE_GROUP = {
  sand: 'coarse', loamySand: 'coarse', sandyLoam: 'moderatelyCoarse',
  loam: 'medium', siltLoam: 'medium', silt: 'medium', sandyClayLoam: 'moderatelyFine', clayLoam: 'moderatelyFine', siltyClayLoam: 'moderatelyFine',
  sandyClay: 'fine', siltyClay: 'fine', clay: 'fine',
};

const rate = (v, cuts) => (v == null || !Number.isFinite(v) ? null : v < cuts[0] ? 'veryLow' : v < cuts[1] ? 'low' : v < cuts[2] ? 'medium' : 'high');
export function phClass(ph) {
  if (ph == null || !Number.isFinite(ph)) return null;
  return ph < 4.5 ? 'extremelyAcid' : ph < 5.5 ? 'stronglyAcid' : ph < 6.5 ? 'slightlyAcid' : ph <= 7.5 ? 'neutral' : 'alkaline';
}
export const ratings = (v) => ({
  ph: phClass(v.phh2o),
  soc: rate(v.soc, [6, 12, 20]),          // g/kg  (0.6, 1.2, 2 %)
  nitrogen: rate(v.nitrogen, [0.5, 1, 2]), // g/kg
  cec: rate(v.cec, [5, 15, 25]),           // cmol(+)/kg
});

// Indicative soil requirements. tex: texture classes rated good / fair (others = poor); ph: [good range], [acceptable range]
const T = {
  heavy: ['clay', 'siltyClay', 'siltyClayLoam', 'clayLoam', 'sandyClay', 'siltLoam', 'loam'],
  medium: ['loam', 'siltLoam', 'clayLoam', 'sandyClayLoam', 'siltyClayLoam'],
  light: ['sandyLoam', 'loam', 'sandyClayLoam', 'loamySand'],
};
const REQ = {
  rice: { good: T.heavy, fair: ['sandyClayLoam', 'sandyLoam', 'silt'], ph: [[5, 7], [4.5, 7.8]] },
  cassava: { good: T.light, fair: ['clayLoam', 'siltLoam', 'sandyClay', 'sand'], ph: [[5, 7], [4.5, 8]] },
  maize: { good: T.medium, fair: ['sandyLoam', 'clay', 'siltyClay', 'sandyClay', 'silt'], ph: [[5.5, 7.5], [5, 8]] },
  soybean: { good: [...T.medium, 'sandyLoam'], fair: ['clay', 'siltyClay', 'sandyClay', 'silt'], ph: [[6, 7.5], [5.3, 8]] },
  mungbean: { good: [...T.medium, 'sandyLoam'], fair: ['clay', 'siltyClay', 'sandyClay', 'loamySand'], ph: [[6, 7.5], [5.3, 8]] },
  sugarcane: { good: [...T.medium, 'clay'], fair: ['sandyLoam', 'siltyClay', 'sandyClay'], ph: [[5.5, 7.5], [5, 8.5]] },
  cashew: { good: ['sandyLoam', 'loamySand', 'sandyClayLoam', 'loam'], fair: ['sand', 'clayLoam', 'siltLoam'], ph: [[5, 6.5], [4.5, 7.5]] },
  rubber: { good: ['loam', 'clayLoam', 'sandyClayLoam', 'sandyLoam', 'clay'], fair: ['siltyClay', 'siltLoam', 'siltyClayLoam', 'sandyClay'], ph: [[4.5, 6], [4, 6.8]] },
  pepper: { good: ['loam', 'clayLoam', 'sandyClayLoam', 'sandyLoam'], fair: ['clay', 'siltLoam', 'siltyClayLoam'], ph: [[5.5, 6.5], [5, 7.2]] },
  mango: { good: ['loam', 'sandyLoam', 'sandyClayLoam', 'clayLoam'], fair: ['clay', 'siltLoam', 'loamySand'], ph: [[5.5, 7.5], [4.5, 8]] },
  durian: { good: ['loam', 'clayLoam', 'sandyClayLoam', 'sandyLoam'], fair: ['clay', 'siltLoam'], ph: [[5, 6.5], [4.5, 7]] },
  longan: { good: ['loam', 'sandyLoam', 'sandyClayLoam', 'clayLoam'], fair: ['clay', 'siltLoam', 'loamySand'], ph: [[5, 6.5], [4.5, 7.5]] },
  banana: { good: ['loam', 'siltLoam', 'clayLoam', 'sandyClayLoam', 'siltyClayLoam'], fair: ['sandyLoam', 'clay', 'siltyClay'], ph: [[5.5, 7], [4.5, 8]] },
  vegetables: { good: ['loam', 'sandyLoam', 'siltLoam', 'sandyClayLoam'], fair: ['clayLoam', 'siltyClayLoam', 'loamySand'], ph: [[6, 7], [5.5, 7.5]] },
};
export const SUIT_CROPS = ['rice', 'cassava', 'maize', 'soybean', 'mungbean', 'sugarcane', 'cashew', 'rubber', 'vegetables'];
export const cropKey = (crop) => (crop === 'rice_wet' || crop === 'rice_dry' ? 'rice' : crop);

const RANK = { good: 0, fair: 1, poor: 2 };
/** Indicative suitability of topsoil for a crop: {level: good|fair|poor, limits: [...keys]} or null. */
export function suitability(cropK, v) {
  const req = REQ[cropK];
  if (!req || !v) return null;
  const tex = textureClass(v.sand, v.silt, v.clay);
  const limits = [];
  let level = 'good';
  const worse = (l) => { if (RANK[l] > RANK[level]) level = l; };
  if (tex) {
    const tl = req.good.includes(tex) ? 'good' : req.fair.includes(tex) ? 'fair' : 'poor';
    if (tl !== 'good') { limits.push('texture'); worse(tl); }
  }
  if (Number.isFinite(v.phh2o)) {
    const [[g0, g1], [a0, a1]] = req.ph;
    const pl = v.phh2o >= g0 && v.phh2o <= g1 ? 'good' : v.phh2o >= a0 && v.phh2o <= a1 ? 'fair' : 'poor';
    if (pl !== 'good') { limits.push(v.phh2o < g0 ? 'acid' : 'alkaline'); worse(pl); }
  }
  const r = ratings(v);
  if ((r.soc === 'veryLow' || r.soc === 'low') && (r.cec === 'veryLow' || r.cec === 'low')) { limits.push('fertility'); worse('fair'); }
  return { level, limits, texture: tex };
}

/** Management hints (translation keys) from topsoil values. */
export function advice(v, cropK) {
  if (!v) return [];
  const out = [];
  const r = ratings(v);
  const tex = textureClass(v.sand, v.silt, v.clay);
  const grp = TEXTURE_GROUP[tex];
  if (r.ph === 'extremelyAcid' || (r.ph === 'stronglyAcid' && v.phh2o < 5 && cropK !== 'rubber' && cropK !== 'cashew')) out.push('lime');
  if (r.ph === 'alkaline') out.push('alkaline');
  if (r.soc === 'veryLow' || r.soc === 'low') out.push('organic');
  if (r.nitrogen === 'veryLow' || r.nitrogen === 'low') out.push('nitrogen');
  if (grp === 'coarse' || grp === 'moderatelyCoarse') out.push('sandy');
  if (r.cec === 'veryLow' || r.cec === 'low') out.push('lowCec');
  if (grp === 'fine' && cropK && cropK !== 'rice' && cropK !== 'sugarcane') out.push('drainage');
  if (cropK === 'rice' && (grp === 'coarse' || grp === 'moderatelyCoarse')) out.push('riceSandy');
  out.push('soilTest');
  return out;
}

/** Soil-type description key from the Crocker (1962) class name. */
export function soilTypeKey(name) {
  const s = String(name || '').toLowerCase();
  if (!s) return null;
  if (s.includes('regur') || s.includes('black')) return 'regur';
  if (s.includes('latosol') || s.includes('terra') || s.includes('red earth')) return 'latosol';
  if (s.includes('plinth')) return 'plinthite';
  if (s.includes('podzol') || s.includes('podsol')) return 'podzol';
  if (s.includes('planosol')) return 'planosol';
  if (s.includes('hydromorph') || s.includes('gley')) return 'hydromorphic';
  if (s.includes('coastal') || s.includes('mangrove') || s.includes('marine')) return 'coastal';
  if (s.includes('alluv')) return 'alluvial';
  if (s.includes('lithosol') || s.includes('lithic') || s.includes('rock') || s.includes('mountain')) return 'lithosol';
  return null;
}

/** Stable colour for a soil-type name (for the map layer). */
export function soilTypeColor(name) {
  const PAL = { regur: '#4b4036', latosol: '#b5452f', plinthite: '#c98a4b', podzol: '#e8d9a8', planosol: '#c9b98f', hydromorphic: '#8fa7b8', coastal: '#6fb0b0', alluvial: '#9cbf6e', lithosol: '#8c8c8c' };
  const k = soilTypeKey(name);
  if (k) {
    // vary lightness within a group so sub-types remain distinguishable
    let hsh = 0; for (const ch of String(name)) hsh = (hsh * 31 + ch.charCodeAt(0)) >>> 0;
    const base = PAL[k];
    const n = parseInt(base.slice(1), 16), d = ((hsh % 5) - 2) * 10;
    const c = [n >> 16, (n >> 8) & 255, n & 255].map(x => Math.max(0, Math.min(255, x + d)));
    return `rgb(${c.join(',')})`;
  }
  let hsh = 0; for (const ch of String(name)) hsh = (hsh * 31 + ch.charCodeAt(0)) >>> 0;
  return `hsl(${hsh % 360},35%,55%)`;
}
