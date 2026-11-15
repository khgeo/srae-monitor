// "Trace field" tool: click inside a paddy on the satellite base map and its boundary is found
// automatically from very-high-resolution imagery (Esri World Imagery, ~0.6 m at zoom 18).
// Shift+click adds a missed part, the tolerance slider re-runs instantly, Enter saves and the tool
// stays on so many small plots can be traced one after another. Existing fields act as barriers.

import { prepare, traceAuto, unionRings, rasterize } from './trace.js';

const TILE = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const Z = 18;
const D2R = Math.PI / 180;

const lon2px = (lon, z) => ((lon + 180) / 360) * 256 * 2 ** z;
const lat2px = (lat, z) => ((1 - Math.log(Math.tan(lat * D2R) + 1 / Math.cos(lat * D2R)) / Math.PI) / 2) * 256 * 2 ** z;
const px2lon = (x, z) => (x / (256 * 2 ** z)) * 360 - 180;
const px2lat = (y, z) => Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / (256 * 2 ** z)))) / D2R;

function loadTile(z, x, y) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`tile ${z}/${y}/${x}`));
    img.src = TILE.replace('{z}', z).replace('{y}', y).replace('{x}', x);
  });
}

/** Read an n×n block of imagery tiles centred on (lon, lat) into RGBA pixels. */
async function readWindow(lon, lat, n, z = Z) {
  const tx = Math.floor(lon2px(lon, z) / 256), ty = Math.floor(lat2px(lat, z) / 256);
  const x0 = tx - (n >> 1), y0 = ty - (n >> 1);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = n * 256;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const jobs = [];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    jobs.push(loadTile(z, x0 + i, y0 + j).then(img => ctx.drawImage(img, i * 256, j * 256)));
  }
  const res = await Promise.allSettled(jobs);
  if (res.filter(r => r.status === 'fulfilled').length < (n * n) / 2) throw new Error('imagery');
  const data = ctx.getImageData(0, 0, n * 256, n * 256).data;
  // Esri serves a flat grey "no data" tile where zoom 18 is missing: fall back to zoom 17
  if (z > 16) {
    let s = 0, s2 = 0, k = 0;
    for (let i = 0; i < data.length; i += 4 * 97) { const v = data[i + 1]; s += v; s2 += v * v; k++; }
    if (s2 / k - (s / k) ** 2 < 6) return readWindow(lon, lat, n, z - 1);
  }
  return { z, x0, y0, n, W: n * 256, H: n * 256, rgba: data };
}

export function createTracer({ mv, t, toast, getFields, onSave, setBusy, panel }) {
  const st = { addMode: false, active: false, win: null, preps: null, exclude: null, ring: null, seeds: [], tol: 5, busy: false };

  const toPx = (lon, lat) => [lon2px(lon, st.win.z) - st.win.x0 * 256, lat2px(lat, st.win.z) - st.win.y0 * 256];
  const toLonLat = ([x, y]) => [+px2lon(x + st.win.x0 * 256, st.win.z).toFixed(7), +px2lat(y + st.win.y0 * 256, st.win.z).toFixed(7)];
  const geomOf = (ring) => ({ type: 'Polygon', coordinates: [ring.map(toLonLat)] });
  const inWindow = (lon, lat, margin = 64) => {
    if (!st.win) return false;
    const [x, y] = toPx(lon, lat);
    return x > margin && y > margin && x < st.win.W - margin && y < st.win.H - margin;
  };

  function excludeMask() {
    const { W, H } = st.win;
    const m = new Uint8Array(W * H);
    for (const f of getFields()) {
      const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
      for (const p of polys) rasterize(p.map(r => r.map(([lon, lat]) => toPx(lon, lat))), W, H, m);
    }
    return m;
  }

  async function ensureWindow(lon, lat, n = 3) {
    if (st.win && st.win.n >= n && inWindow(lon, lat)) return;
    setBusy(true, t('trace.loading'));
    await new Promise(r => setTimeout(r, 30)); // let the spinner paint
    try {
      st.win = await readWindow(lon, lat, n);
      st.preps = { fine: prepare(st.win.rgba, st.win.W, st.win.H), coarse: prepare(st.win.rgba, st.win.W, st.win.H, { scale: 2 }) };
      st.exclude = excludeMask();
    } finally { setBusy(false); }
  }

  function render() {
    mv.setSketch(st.ring ? geomOf(st.ring) : null);
    const ha = st.ring ? areaHa(st.ring) : 0;
    panel.area.textContent = st.ring ? t('trace.area', { ha: ha >= 10 ? ha.toFixed(1) : ha.toFixed(2) }) : '';
    panel.save.disabled = !st.ring;
    panel.add.disabled = !st.ring;
    if (!st.ring) st.addMode = false;
    panel.add.classList.toggle('active', st.addMode);
    panel.add.setAttribute('aria-pressed', String(st.addMode));
    panel.clear.disabled = !st.ring;
  }

  function areaHa(ring) {
    // pixel area × ground pixel size (Web Mercator scale at the window's latitude)
    let a = 0;
    for (let i = 0; i < ring.length - 1; i++) a += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
    const lat = px2lat(st.win.y0 * 256 + st.win.H / 2, st.win.z);
    const m = (156543.03392 * Math.cos(lat * D2R)) / 2 ** st.win.z;
    return (Math.abs(a) / 2) * m * m / 10000;
  }

  async function runSeed(lon, lat, add) {
    if (!add) { st.ring = null; st.seeds = []; }
    await ensureWindow(lon, lat, 3);
    let r = traceOnce(lon, lat);
    if (r && r.touchesEdge && st.win.n < 5) { // the field may be larger than the window: widen once
      const keep = st.seeds.slice(), ring = st.ring && st.ring.map(toLonLat);
      await ensureWindow(lon, lat, 5);
      st.seeds = keep; st.ring = ring ? ring.map(([a, b]) => toPx(a, b)) : null;
      r = traceOnce(lon, lat);
    }
    if (!r) { toast(t('trace.none'), 'error'); return; }
    if (r.insideExisting) { toast(t('trace.existing'), 'error'); return; }
    if (r.touchesEdge) { toast(t('trace.edge'), 'error'); return; }
    if (areaHa(r.ring) < 0.004) { toast(t('trace.none'), 'error'); return; } // < 40 m²: a bund, tree or path
    if (add && st.ring) {
      const u = unionRings(st.ring, r.ring, st.win.W, st.win.H);
      if (!u) { toast(t('trace.apart'), 'error'); return; }
      st.ring = u;
    } else st.ring = r.ring;
    st.seeds.push([lon, lat]);
    render();
  }

  function traceOnce(lon, lat) {
    const [x, y] = toPx(lon, lat);
    const maxPixels = (st.win.W * st.win.H) * 0.6;
    const r = traceAuto(st.preps, x, y, { tolerance: st.tol, gapPx: 3, maxPixels, exclude: st.exclude, simplify: 1.6 });
    if (r && r.tooLarge) return { touchesEdge: true };
    return r && (r.insideExisting || (r.ring && r.ring.length >= 4)) ? r : null;
  }

  async function retraceAll() {
    if (!st.seeds.length || st.busy) return;
    const seeds = st.seeds.slice();
    st.ring = null; st.seeds = [];
    st.busy = true;
    try { for (let i = 0; i < seeds.length; i++) await runSeed(seeds[i][0], seeds[i][1], i > 0); } finally { st.busy = false; }
  }

  function save() {
    if (!st.ring) return;
    const geom = geomOf(st.ring);
    const f = onSave(geom);
    if (f) {
      // the new field becomes a barrier for the next trace
      if (st.win) rasterize([st.ring], st.win.W, st.win.H, st.exclude);
      st.ring = null; st.seeds = [];
      render();
      toast(t('trace.saved'), 'ok');
    }
  }

  const key = (e) => {
    if (!st.active || /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement?.tagName || '')) return;
    if (e.key === 'Enter') { e.preventDefault(); save(); }
    else if (e.key === 'Escape') { e.preventDefault(); stop(); }
  };

  panel.tol.addEventListener('input', () => { st.tol = +panel.tol.value; });
  panel.tol.addEventListener('change', () => retraceAll());
  panel.save.addEventListener('click', save);
  panel.clear.addEventListener('click', () => { st.ring = null; st.seeds = []; render(); });
  panel.add.addEventListener('click', () => { st.addMode = !st.addMode; render(); });
  panel.done.addEventListener('click', () => stop());

  function start() {
    if (mv.map.getZoom() < 15) { toast(t('trace.zoomIn'), 'error', 6000); }
    st.active = true;
    panel.box.hidden = false;
    panel.tol.value = st.tol;
    mv.lockCursor('crosshair');
    document.addEventListener('keydown', key);
    render();
  }

  function stop() {
    if (!st.active) return;
    st.active = false;
    st.ring = null; st.seeds = [];
    panel.box.hidden = true;
    mv.setSketch(null);
    mv.lockCursor(null);
    document.removeEventListener('keydown', key);
    if (panel.onStop) panel.onStop();
  }

  async function click(e) {
    if (st.busy) return;
    if (mv.map.getZoom() < 15) { toast(t('trace.zoomIn'), 'error', 6000); return; }
    // clicking inside an existing field selects nothing while tracing
    st.busy = true;
    const add = (e.shift || st.addMode) && !!st.ring;
    st.addMode = false;
    try { await runSeed(e.lng, e.lat, add); render(); }
    catch (err) { console.warn('trace failed', err); toast(t('trace.imgFail'), 'error'); }
    finally { st.busy = false; }
  }

  /** Fields changed elsewhere (deleted/edited): rebuild the barrier mask. */
  function fieldsChanged() { if (st.win) st.exclude = excludeMask(); }

  return { start, stop, click, fieldsChanged, get active() { return st.active; } };
}

