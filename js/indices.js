// Vegetation index definitions, colour ramps and helpers.
// Band names follow the Earth Search STAC common names for Sentinel-2 L2A.

// EOS-style NDVI ramp: bare/stressed (red-brown) -> yellow -> dense green.
const RAMP_VEG = [
  [0.00, [166, 54, 3]], [0.15, [215, 96, 32]], [0.30, [244, 165, 66]],
  [0.42, [253, 219, 117]], [0.52, [217, 239, 139]], [0.62, [166, 217, 106]],
  [0.74, [102, 189, 99]], [0.86, [26, 152, 80]], [1.00, [0, 94, 47]],
];
const RAMP_MOIST = [
  [0.00, [140, 81, 10]], [0.25, [216, 179, 101]], [0.45, [246, 232, 195]],
  [0.60, [199, 234, 229]], [0.78, [90, 180, 172]], [1.00, [1, 102, 94]],
];
const RAMP_WATER = [
  [0.00, [120, 80, 40]], [0.4, [230, 220, 190]], [0.55, [180, 220, 240]],
  [0.75, [70, 140, 210]], [1.00, [8, 48, 140]],
];

export const INDICES = {
  NDVI: {
    bands: ['red', 'nir'], min: -0.1, max: 0.95, ramp: RAMP_VEG,
    fn: (b) => (b.nir - b.red) / (b.nir + b.red),
    bins: [-1, 0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
  },
  EVI: {
    bands: ['blue', 'red', 'nir'], min: -0.1, max: 0.9, ramp: RAMP_VEG,
    fn: (b) => 2.5 * (b.nir - b.red) / (b.nir + 6 * b.red - 7.5 * b.blue + 1),
    bins: [-1, 0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 1.5],
  },
  MSAVI: {
    bands: ['red', 'nir'], min: -0.1, max: 0.9, ramp: RAMP_VEG,
    fn: (b) => {
      const t = 2 * b.nir + 1;
      return (t - Math.sqrt(Math.max(t * t - 8 * (b.nir - b.red), 0))) / 2;
    },
    bins: [-1, 0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 1],
  },
  NDRE: {
    bands: ['rededge1', 'nir'], min: -0.05, max: 0.6, ramp: RAMP_VEG,
    fn: (b) => (b.nir - b.rededge1) / (b.nir + b.rededge1),
    bins: [-1, 0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 1],
  },
  ReCI: {
    bands: ['rededge1', 'nir'], min: 0, max: 5, ramp: RAMP_VEG,
    fn: (b) => b.nir / b.rededge1 - 1,
    bins: [-10, 0, 0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 50],
  },
  NDMI: {
    bands: ['nir08', 'swir16'], min: -0.3, max: 0.5, ramp: RAMP_MOIST,
    fn: (b) => (b.nir08 - b.swir16) / (b.nir08 + b.swir16),
    bins: [-1, -0.2, -0.1, 0, 0.1, 0.2, 0.3, 0.4, 1],
  },
  NDWI: {
    bands: ['green', 'nir'], min: -0.6, max: 0.4, ramp: RAMP_WATER,
    fn: (b) => (b.green - b.nir) / (b.green + b.nir),
    bins: [-1, -0.5, -0.3, -0.1, 0, 0.1, 0.3, 1],
  },
  TRUE: { bands: ['visual'], trueColor: true },
};

export const INDEX_ORDER = ['NDVI', 'EVI', 'MSAVI', 'NDRE', 'ReCI', 'NDMI', 'NDWI', 'TRUE'];

/** Interpolate a colour ramp at t in [0,1]. */
export function rampColor(ramp, t) {
  if (!(t >= 0)) t = 0; if (t > 1) t = 1;
  for (let i = 1; i < ramp.length; i++) {
    if (t <= ramp[i][0]) {
      const [t0, c0] = ramp[i - 1], [t1, c1] = ramp[i];
      const k = (t - t0) / (t1 - t0 || 1);
      return [c0[0] + (c1[0] - c0[0]) * k, c0[1] + (c1[1] - c0[1]) * k, c0[2] + (c1[2] - c0[2]) * k];
    }
  }
  return ramp[ramp.length - 1][1];
}

export function valueColor(key, v) {
  const d = INDICES[key];
  return rampColor(d.ramp, (v - d.min) / (d.max - d.min));
}

export function cssColor(rgb, a = 1) {
  return `rgba(${Math.round(rgb[0])},${Math.round(rgb[1])},${Math.round(rgb[2])},${a})`;
}

export function gradientCss(key) {
  const d = INDICES[key];
  if (!d || !d.ramp) return 'none';
  return `linear-gradient(90deg, ${d.ramp.map(([t, c]) => `${cssColor(c)} ${Math.round(t * 100)}%`).join(', ')})`;
}

/** Summary statistics over finite values. */
export function stats(values) {
  const v = [];
  for (let i = 0; i < values.length; i++) if (Number.isFinite(values[i])) v.push(values[i]);
  if (!v.length) return null;
  v.sort((a, b) => a - b);
  const q = (p) => v[Math.min(v.length - 1, Math.max(0, Math.round(p * (v.length - 1))))];
  let sum = 0; for (const x of v) sum += x;
  const mean = sum / v.length;
  let ss = 0; for (const x of v) ss += (x - mean) * (x - mean);
  return { n: v.length, mean, min: v[0], max: v[v.length - 1], p10: q(0.1), median: q(0.5), p90: q(0.9), std: Math.sqrt(ss / v.length) };
}

/** Histogram by the index's class bins -> [{lo, hi, count}] */
export function binCounts(key, values) {
  const bins = INDICES[key].bins;
  const out = [];
  for (let i = 0; i < bins.length - 1; i++) out.push({ lo: bins[i], hi: bins[i + 1], count: 0 });
  for (let i = 0; i < values.length; i++) {
    const x = values[i];
    if (!Number.isFinite(x)) continue;
    let k = out.findIndex(b => x < b.hi);
    if (k < 0) k = out.length - 1;
    if (x < out[0].lo) k = 0;
    out[k].count++;
  }
  return out;
}
