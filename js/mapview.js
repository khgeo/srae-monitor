// Map layer built on MapLibre GL JS (GPU-rendered, continuous zoom/pan, 3D terrain).
// The rest of the app talks to the map only through this class.

import { centroid } from './geo.js';

const EMPTY = { type: 'FeatureCollection', features: [] };

const BASEMAP_LAYERS = {
  satellite: ['bm-satellite', 'bm-labels'],
  streets: ['bm-streets'],
  topo: ['bm-topo'],
};

export function style() {
  // Never put undefined values in the style: MapLibre validates the style and refuses to load it on any error.
  const raster = (tiles, maxzoom, attribution) => ({ type: 'raster', tiles, tileSize: 256, maxzoom, ...(attribution ? { attribution } : {}) });
  return {
    version: 8,
    sources: {
      esri: raster(['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], 18, 'Imagery © Esri, Maxar, Earthstar Geographics'),
      esriLabels: raster(['https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'], 18),
      osm: raster(['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], 19, '© OpenStreetMap contributors'),
      topo: raster(['https://a.tile.opentopomap.org/{z}/{x}/{y}.png', 'https://b.tile.opentopomap.org/{z}/{x}/{y}.png', 'https://c.tile.opentopomap.org/{z}/{x}/{y}.png'], 17, '© OpenTopoMap (CC-BY-SA), © OpenStreetMap'),
      dem: { type: 'raster-dem', tiles: ['https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{z}/{x}/{y}.png'], encoding: 'terrarium', tileSize: 256, maxzoom: 14, attribution: 'Terrain: AWS Terrain Tiles' },
      demHs: { type: 'raster-dem', tiles: ['https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{z}/{x}/{y}.png'], encoding: 'terrarium', tileSize: 256, maxzoom: 14 },
      fields: { type: 'geojson', data: EMPTY },
      draw: { type: 'geojson', data: EMPTY },
      edit: { type: 'geojson', data: EMPTY },
    },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': '#1b2420' } },
      { id: 'bm-satellite', type: 'raster', source: 'esri', paint: { 'raster-fade-duration': 120 } },
      { id: 'bm-streets', type: 'raster', source: 'osm', layout: { visibility: 'none' }, paint: { 'raster-fade-duration': 120 } },
      { id: 'bm-topo', type: 'raster', source: 'topo', layout: { visibility: 'none' }, paint: { 'raster-fade-duration': 120 } },
      { id: 'hillshade', type: 'hillshade', source: 'demHs', layout: { visibility: 'none' }, paint: { 'hillshade-exaggeration': 0.35, 'hillshade-shadow-color': '#0b1a12' } },
      { id: 'bm-labels', type: 'raster', source: 'esriLabels', paint: { 'raster-opacity': 0.85, 'raster-fade-duration': 120 } },
      { id: 'fields-fill', type: 'fill', source: 'fields', paint: { 'fill-color': ['get', 'color'], 'fill-opacity': ['case', ['get', 'sel'], 0, 0.14] } },
      { id: 'fields-line', type: 'line', source: 'fields', layout: { 'line-join': 'round' }, paint: { 'line-color': ['case', ['get', 'sel'], '#ffffff', ['get', 'color']], 'line-width': ['case', ['get', 'sel'], 3, 2] } },
      { id: 'fields-hover', type: 'line', source: 'fields', filter: ['==', ['get', 'id'], ''], paint: { 'line-color': '#ffffff', 'line-width': 4, 'line-opacity': 0.9 } },
      { id: 'draw-fill', type: 'fill', source: 'draw', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': '#ffd54a', 'fill-opacity': 0.18 } },
      { id: 'draw-line', type: 'line', source: 'draw', filter: ['==', ['geometry-type'], 'LineString'], layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#ffd54a', 'line-width': 2.5, 'line-dasharray': [2, 1.5] } },
      { id: 'draw-pt', type: 'circle', source: 'draw', filter: ['==', ['geometry-type'], 'Point'], paint: { 'circle-radius': ['case', ['get', 'first'], 7, 5], 'circle-color': ['case', ['get', 'first'], '#ffd54a', '#ffffff'], 'circle-stroke-color': '#1f3a2b', 'circle-stroke-width': 2 } },
      { id: 'edit-fill', type: 'fill', source: 'edit', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': '#00e5ff', 'fill-opacity': 0.12 } },
      { id: 'edit-line', type: 'line', source: 'edit', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'line-color': '#00e5ff', 'line-width': 2.5 } },
      { id: 'edit-mid', type: 'circle', source: 'edit', filter: ['==', ['get', 'kind'], 'mid'], paint: { 'circle-radius': 4.5, 'circle-color': '#00e5ff', 'circle-opacity': 0.75, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 1 } },
      { id: 'edit-vtx', type: 'circle', source: 'edit', filter: ['==', ['get', 'kind'], 'vtx'], paint: { 'circle-radius': 7, 'circle-color': '#ffffff', 'circle-stroke-color': '#00a3b8', 'circle-stroke-width': 2.5 } },
    ],
  };
}

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export class MapView {
  constructor(container, opts = {}) {
    this.opts = opts;
    this._queue = [];
    this._ready = false;
    this._fieldMarkers = [];
    this._noteMarkers = [];
    this._pins = [];
    this.mode = null; // null | 'draw' | 'edit'
    this.map = new maplibregl.Map({
      container,
      style: style(),
      center: [104.9, 12.65],
      zoom: 6.6,
      maxZoom: 20,
      maxPitch: 75,
      attributionControl: false,
      fadeDuration: 120,
      refreshExpiredTiles: false,
      dragRotate: true,
      pitchWithRotate: true,
      cooperativeGestures: false,
    });
    const m = this.map;
    m.addControl(new maplibregl.NavigationControl({ visualizePitch: true, showCompass: true }), 'top-left');
    m.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');
    m.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    const ready = () => {
      if (this._ready) return;
      this._ready = true; clearTimeout(this._watchdog);
      this._queue.splice(0).forEach(fn => { try { fn(); } catch (err) { console.error(err); } });
      this._bindLayerEvents();
    };
    // 'style.load' fires as soon as the style is parsed; 'load' after the first full render.
    m.on('style.load', ready);
    m.on('load', ready);
    this._watchdog = setTimeout(() => {
      if (!this._ready && this.opts.onError) this.opts.onError(this._lastError || 'The map style did not load.');
    }, 12000);
    m.on('click', (e) => this._onClick(e));
    m.on('dblclick', (e) => { if (this.mode === 'draw') { e.preventDefault(); this._finishDraw(); } });
    let pending = null;
    m.on('mousemove', (e) => {
      if (!pending) requestAnimationFrame(() => { const ev = pending; pending = null; this._onMove(ev); });
      pending = e;
    });
    m.getCanvas().addEventListener('mouseleave', () => { pending = null; this.opts.onHover && this.opts.onHover(null); });
    m.on('movestart', () => this.opts.onMoveStart && this.opts.onMoveStart());
    m.on('zoom', () => this._labelVisibility());
    m.on('error', (e) => {
      const msg = String((e && e.error && (e.error.message || e.error)) || e);
      if (/tile|Failed to fetch|AJAXError|NetworkError|status/i.test(msg)) return; // single tile failures are harmless
      console.error('Map error:', msg);
      this._lastError = msg;
      if (!this._ready && this.opts.onError) this.opts.onError(msg);
    });
  }

  whenReady(fn) { if (this._ready) fn(); else this._queue.push(fn); }

  // ---------------------------------------------------------------- basemap & 3D
  setBasemap(key) {
    this.whenReady(() => {
      for (const [k, ids] of Object.entries(BASEMAP_LAYERS)) for (const id of ids) this.map.setLayoutProperty(id, 'visibility', k === key ? 'visible' : 'none');
    });
  }

  set3D(on) {
    this.is3D = on;
    this.whenReady(() => {
      const m = this.map;
      m.setTerrain(on ? { source: 'dem', exaggeration: 1.6 } : null);
      m.setLayoutProperty('hillshade', 'visibility', on ? 'visible' : 'none');
      m.easeTo({ pitch: on ? 62 : 0, bearing: on ? -18 : 0, duration: 1100 });
    });
  }

  resize() { this.map.resize(); }
  getZoom() { return this.map.getZoom(); }

  // ---------------------------------------------------------------- fields
  setFields(fields, selId) {
    this._fields = fields;
    const data = { type: 'FeatureCollection', features: fields.map(f => ({ type: 'Feature', geometry: f.geometry, properties: { id: f.id, color: f.color || '#ffd54a', sel: f.id === selId } })) };
    this.whenReady(() => this.map.getSource('fields').setData(data));
    // name labels as HTML markers (renders Khmer text with the page font)
    this._fieldMarkers.forEach(mk => mk.remove());
    this._fieldMarkers = fields.map(f => {
      const el = document.createElement('div');
      el.className = `field-label${f.id === selId ? ' sel' : ''}`;
      el.textContent = f.name;
      return new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat(centroid(f.geometry)).addTo(this.map);
    });
    this._labelVisibility();
  }

  _labelVisibility() {
    const c = this.map.getContainer();
    c.classList.toggle('labels-on', this.map.getZoom() >= 12.5);
  }

  hoverField(id) { this.whenReady(() => this.map.setFilter('fields-hover', ['==', ['get', 'id'], id || ''])); }

  /** Fit to [west, south, east, north]. */
  fitBox(box, { maxZoom = 16, padding, duration = 900 } = {}) {
    if (!box || !box.every(Number.isFinite)) return;
    const [w, s, e, n] = box;
    const pad = padding || { top: 70, bottom: 110, left: 50, right: 50 };
    this.map.fitBounds([[w, s], [e, n]], { padding: pad, maxZoom, duration, essential: true });
  }

  flyTo(lat, lng, zoom) { this.map.flyTo({ center: [lng, lat], zoom: zoom ?? Math.max(this.map.getZoom(), 16), speed: 1.4, curve: 1.42, essential: true }); }

  // ---------------------------------------------------------------- raster overlay
  setOverlay(url, g, opacity) {
    const coordinates = [[g.west, g.north], [g.east, g.north], [g.east, g.south], [g.west, g.south]];
    this.whenReady(() => {
      const m = this.map;
      const src = m.getSource('overlay');
      if (src) src.updateImage({ url, coordinates });
      else {
        m.addSource('overlay', { type: 'image', url, coordinates });
        m.addLayer({ id: 'overlay', type: 'raster', source: 'overlay', paint: { 'raster-opacity': opacity, 'raster-resampling': 'nearest', 'raster-fade-duration': 0 } }, 'fields-fill');
      }
      m.setPaintProperty('overlay', 'raster-opacity', opacity);
      m.setLayoutProperty('overlay', 'visibility', 'visible');
    });
  }

  setOverlayOpacity(o) { this.whenReady(() => { if (this.map.getLayer('overlay')) this.map.setPaintProperty('overlay', 'raster-opacity', o); }); }
  clearOverlay() { this.whenReady(() => { if (this.map.getLayer('overlay')) this.map.setLayoutProperty('overlay', 'visibility', 'none'); }); }

  // ---------------------------------------------------------------- markers
  setNotes(notes, { html, icon }) {
    this._noteMarkers.forEach(mk => mk.remove());
    this._noteMarkers = notes.map(n => {
      const el = document.createElement('div');
      el.className = 'note-pin';
      el.innerHTML = `<span>${icon(n)}</span>`;
      const popup = new maplibregl.Popup({ offset: 26, maxWidth: '270px', closeButton: true }).setHTML(html(n));
      return new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([n.lng, n.lat]).setPopup(popup).addTo(this.map);
    });
  }

  clearPins() { this._pins.forEach(mk => mk.remove()); this._pins = []; }
  addPin(lat, lng, { kind = 'search', label } = {}) {
    const el = document.createElement('div');
    el.className = `map-pin ${kind}`;
    if (label) el.title = label;
    const mk = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([lng, lat]).addTo(this.map);
    this._pins.push(mk);
    return mk;
  }

  setCursor(c) { this.map.getCanvas().style.cursor = c || ''; }

  // ---------------------------------------------------------------- events
  _onClick(e) {
    if (this.mode === 'draw') return this._drawClick(e);
    if (this.mode === 'edit') return;
    let fieldId = null;
    if (this._ready) {
      const hit = this.map.queryRenderedFeatures(e.point, { layers: ['fields-fill'] });
      if (hit.length) fieldId = hit[0].properties.id;
    }
    this.opts.onClick && this.opts.onClick({ lat: e.lngLat.lat, lng: e.lngLat.lng, fieldId, point: e.point });
  }

  _onMove(e) {
    if (!e) return;
    if (this.mode === 'draw') { this._draw.cursor = [e.lngLat.lng, e.lngLat.lat]; this._renderDraw(); return; }
    if (this.mode === 'edit') { if (this._drag != null) this._dragTo(e.lngLat); return; }
    if (this._ready && !this.cursorLocked) {
      const hit = this.map.queryRenderedFeatures(e.point, { layers: ['fields-fill'] });
      this.setCursor(hit.length ? 'pointer' : '');
    }
    this.opts.onHover && this.opts.onHover({ lat: e.lngLat.lat, lng: e.lngLat.lng, x: e.point.x, y: e.point.y });
  }

  // ---------------------------------------------------------------- drawing (polygon or measuring line)
  /**
   * kind: 'polygon' (finish on first point / double-click / Enter) or 'measure' (keeps the result on screen).
   */
  startDraw({ kind = 'polygon', onChange, onFinish, onCancel } = {}) {
    this.stopDraw(); this.stopEdit();
    this.mode = 'draw';
    this._draw = { kind, pts: [], cursor: null, done: false, onChange, onFinish, onCancel };
    this.map.doubleClickZoom.disable();
    this.setCursor('crosshair'); this.cursorLocked = true;
    this._key = (ev) => {
      if (/^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement?.tagName || '')) return;
      if (ev.key === 'Enter') { ev.preventDefault(); this._finishDraw(); }
      else if (ev.key === 'Backspace' || (ev.key === 'z' && (ev.ctrlKey || ev.metaKey))) { ev.preventDefault(); this.undoPoint(); }
    };
    document.addEventListener('keydown', this._key);
    this._renderDraw();
  }

  undoPoint() {
    const d = this._draw; if (!d || d.done) return;
    d.pts.pop(); this._renderDraw(); d.onChange && d.onChange(d.pts);
  }

  _drawClick(e) {
    const d = this._draw;
    const p = [e.lngLat.lng, e.lngLat.lat];
    if (d.done) { d.pts = []; d.done = false; }
    if (d.kind === 'polygon' && d.pts.length >= 3 && dist(this.map.project(d.pts[0]), e.point) < 12) return this._finishDraw();
    if (d.pts.length && dist(this.map.project(d.pts[d.pts.length - 1]), e.point) < 4) return; // double-click duplicate
    d.pts.push(p);
    this._renderDraw();
    d.onChange && d.onChange(d.pts);
  }

  _finishDraw() {
    const d = this._draw; if (!d || d.done) return;
    const need = d.kind === 'polygon' ? 3 : 2;
    if (d.pts.length < need) return;
    if (d.kind === 'measure') {
      d.done = true; d.cursor = null; this._renderDraw();
      d.onFinish && d.onFinish(d.pts);
      return;
    }
    const ring = [...d.pts, d.pts[0]];
    const cb = d.onFinish;
    this.stopDraw(true);
    cb && cb({ type: 'Polygon', coordinates: [ring] });
  }

  _renderDraw() {
    const d = this._draw; if (!d) return;
    const pts = d.cursor && !d.done ? [...d.pts, d.cursor] : d.pts;
    const feats = [];
    const closed = d.kind === 'polygon' || (d.kind === 'measure' && pts.length >= 3);
    if (closed && pts.length >= 3) feats.push({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[...pts, pts[0]]] } });
    if (pts.length >= 2) feats.push({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: closed && d.kind === 'polygon' && pts.length >= 3 ? [...pts, pts[0]] : pts } });
    d.pts.forEach((p, i) => feats.push({ type: 'Feature', properties: { first: i === 0 && d.kind === 'polygon' }, geometry: { type: 'Point', coordinates: p } }));
    this.whenReady(() => this.map.getSource('draw').setData({ type: 'FeatureCollection', features: feats }));
    if (d.onChange && d.cursor && !d.done) d.onChange(pts, true);
  }

  stopDraw(silent) {
    if (this.mode !== 'draw') return;
    const d = this._draw;
    this.mode = null; this._draw = null;
    document.removeEventListener('keydown', this._key);
    this.map.doubleClickZoom.enable();
    this.cursorLocked = false; this.setCursor('');
    this.whenReady(() => this.map.getSource('draw').setData(EMPTY));
    if (!silent && d && d.onCancel) d.onCancel();
  }

  // ---------------------------------------------------------------- shape editing
  startEdit(geometry) {
    this.stopDraw(); this.stopEdit();
    this.mode = 'edit';
    this._edit = { ring: geometry.coordinates[0].slice(0, -1).map(p => [...p]), holes: geometry.coordinates.slice(1) };
    this._drag = null;
    this._renderEdit();
  }

  getEditGeometry() {
    const e = this._edit; if (!e) return null;
    return { type: 'Polygon', coordinates: [[...e.ring, e.ring[0]], ...e.holes] };
  }

  stopEdit() {
    if (this.mode !== 'edit') return;
    this.mode = null; this._edit = null; this._drag = null;
    this.map.dragPan.enable();
    this.whenReady(() => this.map.getSource('edit').setData(EMPTY));
  }

  _renderEdit() {
    const e = this._edit; if (!e) return;
    const r = e.ring;
    const feats = [{ type: 'Feature', properties: { kind: 'poly' }, geometry: { type: 'Polygon', coordinates: [[...r, r[0]], ...e.holes] } }];
    r.forEach((p, i) => {
      const q = r[(i + 1) % r.length];
      feats.push({ type: 'Feature', properties: { kind: 'mid', i }, geometry: { type: 'Point', coordinates: [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2] } });
    });
    r.forEach((p, i) => feats.push({ type: 'Feature', properties: { kind: 'vtx', i }, geometry: { type: 'Point', coordinates: p } }));
    this.whenReady(() => this.map.getSource('edit').setData({ type: 'FeatureCollection', features: feats }));
  }

  _dragTo(ll) { if (!this._edit) return; this._edit.ring[this._drag] = [ll.lng, ll.lat]; this._renderEdit(); }

  _bindLayerEvents() {
    const m = this.map;
    const grab = (e, isMid) => {
      if (this.mode !== 'edit' || !e.features || !e.features.length) return;
      e.preventDefault();
      let i = e.features[0].properties.i;
      if (isMid) { this._edit.ring.splice(i + 1, 0, [e.lngLat.lng, e.lngLat.lat]); i += 1; this._renderEdit(); }
      this._drag = i;
      m.dragPan.disable();
      this.setCursor('grabbing');
      const up = () => { this._drag = null; m.dragPan.enable(); this.setCursor(''); m.off('mouseup', up); m.off('touchend', up); };
      m.on('mouseup', up); m.on('touchend', up);
    };
    m.on('mousedown', 'edit-vtx', (e) => grab(e, false));
    m.on('mousedown', 'edit-mid', (e) => grab(e, true));
    m.on('touchstart', 'edit-vtx', (e) => grab(e, false));
    m.on('touchstart', 'edit-mid', (e) => grab(e, true));
    m.on('touchmove', (e) => { if (this.mode === 'edit' && this._drag != null) { e.preventDefault(); this._dragTo(e.lngLat); } });
    m.on('contextmenu', 'edit-vtx', (e) => {
      if (this.mode !== 'edit' || this._edit.ring.length <= 3) return;
      e.preventDefault(); this._edit.ring.splice(e.features[0].properties.i, 1); this._renderEdit();
    });
    m.on('mouseenter', 'edit-vtx', () => { if (this.mode === 'edit' && this._drag == null) this.setCursor('grab'); });
    m.on('mouseleave', 'edit-vtx', () => { if (this.mode === 'edit' && this._drag == null) this.setCursor(''); });
    m.on('mouseenter', 'edit-mid', () => { if (this.mode === 'edit' && this._drag == null) this.setCursor('copy'); });
    m.on('mouseleave', 'edit-mid', () => { if (this.mode === 'edit' && this._drag == null) this.setCursor(''); });
  }
}

/** Great-circle length of a path in metres. */
export function pathLength(pts) {
  let s = 0;
  for (let i = 1; i < pts.length; i++) {
    const [lo1, la1] = pts[i - 1], [lo2, la2] = pts[i];
    const r = Math.PI / 180, dLa = (la2 - la1) * r, dLo = (lo2 - lo1) * r;
    const a = Math.sin(dLa / 2) ** 2 + Math.cos(la1 * r) * Math.cos(la2 * r) * Math.sin(dLo / 2) ** 2;
    s += 2 * 6371008.8 * Math.asin(Math.sqrt(a));
  }
  return s;
}
