// Srae Monitor — static crop-monitoring web app (GitHub Pages friendly).
import { t, setLang, getLang, applyI18n, fmtDate, cropName, CROPS, NOTE_CATS, indexName, helpHtml } from './i18n.js';
import { store, uid } from './store.js';
import * as geo from './geo.js';
import { INDICES, INDEX_ORDER, valueColor, cssColor, gradientCss, rampColor } from './indices.js';
import { searchScenes } from './stac.js';
import { processScene, mapLimit } from './raster.js';
import { breaks, classify, majority, zoneStats, vectorise, zoneColors } from './zones.js';
import { getWeather, accumulate, getElevation, getPlaceName } from './weather.js';
import { $, $$, h, esc, toast, openModal, closeModal, confirmBox, download, slug, loadScript } from './ui.js';
import { indexChart, weatherChart, accumChart, soilChart, getChart, destroyChart, ts } from './charts.js';
import { openReport } from './report.js';
import { writeGeoTiff } from './tiffwriter.js';
import { growthStage, STAGE_COLORS } from './stages.js';
import { MapView, pathLength } from './mapview.js';

const DAY = 86400000;
const todayIso = () => new Date().toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / DAY);

// ---------------------------------------------------------------- state
const S = {
  fields: store.getFields(),
  notes: store.getNotes(),
  settings: store.getSettings(),
  sel: null,            // selected field id
  grid: null,
  scenes: [],
  sceneIdx: -1,
  index: 'NDVI',
  result: null,         // current processed scene result
  overlay: null,
  zones: null,          // { cls, stats, breaks, n, geojson, rates }
  showZones: false,
  tab: 'overview',
  gen: 0,
  abort: null,
  weather: new Map(),   // fieldId -> weather data
  tsRun: null,          // { abort }
  noteMode: false,
  drawing: null,
  editing: null,
  resultCache: new Map(),
  legendCollapsed: window.matchMedia('(max-width: 860px)').matches,
  compare: { on: false, idx: -1, diff: null },
};

const fieldById = (id) => S.fields.find(f => f.id === id);
const selField = () => fieldById(S.sel);
const saveFields = () => store.saveFields(S.fields);
const saveNotes = () => { if (!store.saveNotes(S.notes)) toast(t('msg.storageFull'), 'error'); };

// ---------------------------------------------------------------- map (MapLibre GL, see mapview.js)
const mv = new MapView('map', {
  onClick: (e) => onMapClick(e),
  onHover: (e) => pixelReadout(e),
  onMoveStart: () => { $('#pixelInfo').hidden = true; },
});

function setBasemap(key) {
  if (!['satellite', 'streets', 'topo'].includes(key)) key = 'satellite';
  mv.setBasemap(key);
  S.settings.basemap = key; store.saveSettings(S.settings);
  $('#basemapSelect').value = key;
}

function renderFieldLayers() { mv.setFields(S.fields, S.sel); }
const restyleFields = renderFieldLayers;

function fieldsBox(list = S.fields) {
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  for (const f of list) { const b = geo.bbox(f.geometry); w = Math.min(w, b[0]); s = Math.min(s, b[1]); e = Math.max(e, b[2]); n = Math.max(n, b[3]); }
  return [w, s, e, n];
}
function mapPadding() {
  const wide = window.innerWidth > 860;
  return { top: 70, bottom: wide ? 110 : 90, left: wide ? 60 : 30, right: wide && !$('#legend').hidden ? 320 : (wide ? 60 : 30) };
}
function fitAllFields(maxZoom = 15) { if (S.fields.length) mv.fitBox(fieldsBox(), { maxZoom, padding: mapPadding() }); }

function onMapClick(e) {
  if (S.noteMode) { setNoteMode(false); noteDialog({ lat: e.lat, lng: e.lng }); return; }
  if (e.fieldId && e.fieldId !== S.sel) selectField(e.fieldId);
}

// ---------------------------------------------------------------- field list
function shapeSvg(geom, fill) {
  const [w, s, e, n] = geo.bbox(geom);
  const k = 40 / Math.max(e - w, (n - s), 1e-9);
  const cos = Math.cos(((s + n) / 2) * Math.PI / 180);
  const d = geo.rings(geom).map(r => 'M' + r.map(([x, y]) => `${((x - w) * k * cos + 2).toFixed(1)},${((n - y) * k + 2).toFixed(1)}`).join('L') + 'Z').join('');
  return `<svg viewBox="0 0 44 44" class="shape" aria-hidden="true"><path d="${d}" fill="${fill}" fill-rule="evenodd" stroke="currentColor" stroke-width="1.2"/></svg>`;
}

function latestTs(fieldId, index = 'NDVI') {
  const recs = Object.values(store.getTs(fieldId, index)).filter(r => r.valid * 100 >= S.settings.tsMinClear && Number.isFinite(r.mean));
  recs.sort((a, b) => b.date.localeCompare(a.date));
  return recs;
}

function renderFieldList() {
  const q = ($('#fieldSearch').value || '').toLowerCase();
  const ul = $('#fieldList');
  ul.innerHTML = '';
  const info = new Map(S.fields.map(f => { const r = latestTs(f.id); return [f.id, { last: r[0], prev: r[1], d: r[0] && r[1] ? r[0].mean - r[1].mean : null }]; }));
  const list = S.fields.filter(f => !q || f.name.toLowerCase().includes(q) || cropName(f.crop).toLowerCase().includes(q));
  const sort = S.settings.sort || 'name';
  const val = (f) => info.get(f.id);
  list.sort((a, b) => {
    if (sort === 'ndvi') return (val(a).last?.mean ?? 9) - (val(b).last?.mean ?? 9);
    if (sort === 'change') return (val(a).d ?? 9) - (val(b).d ?? 9);
    if (sort === 'area') return b.areaM2 - a.areaM2;
    return a.name.localeCompare(b.name);
  });
  let total = 0, alerts = 0;
  for (const f of S.fields) { total += f.areaM2 || 0; if ((val(f).d ?? 0) <= -0.05) alerts++; }
  for (const f of list) {
    const { last, d } = val(f);
    const fill = last ? cssColor(valueColor('NDVI', last.mean)) : 'var(--surface-3)';
    const alert = d != null && d <= -0.05;
    const li = h(`<li class="field-item${alert ? ' alert' : ''}" tabindex="0" data-id="${f.id}" ${alert ? `title="${esc(t('fields.dropTip'))}"` : ''}>
      ${shapeSvg(f.geometry, fill)}
      <div class="fi-main"><div class="fi-name">${esc(f.name)}</div>
      <div class="fi-sub">${esc(cropName(f.crop))} · ${geo.fmtArea(f.areaM2)} ${t('unit.ha')}</div></div>
      <div class="fi-ndvi">${last ? `<b>${alert ? '<span class="warn-ic">⚠</span>' : ''}${last.mean.toFixed(2)}</b><small>${d != null ? deltaHtml(d) : fmtDate(last.date, { day: 'numeric', month: 'short' })}</small>` : '<small>—</small>'}</div>
    </li>`);
    li.addEventListener('click', () => selectField(f.id));
    li.addEventListener('keydown', (e) => { if (e.key === 'Enter') selectField(f.id); });
    li.addEventListener('mouseenter', () => mv.hoverField(f.id));
    li.addEventListener('mouseleave', () => mv.hoverField(null));
    ul.appendChild(li);
  }
  $('#fieldCount').textContent = S.fields.length ? String(S.fields.length) : '';
  $('#emptyState').hidden = S.fields.length > 0;
  if (!S.checkAll) $('#listFoot').innerHTML = S.fields.length ? `${esc(t('fields.total', { n: S.fields.length, ha: geo.fmtArea(total) }))}${alerts ? ` · <b class="alert-txt">⚠ ${esc(t('fields.alerts', { n: alerts }))}</b>` : ''}` : '';
  $('#listTools').hidden = S.fields.length < 1;
}

// ---------------------------------------------------------------- field create / edit
function nextFieldName() {
  let i = S.fields.length + 1;
  while (S.fields.some(f => f.name === t('fields.defaultName', { n: i }))) i++;
  return t('fields.defaultName', { n: i });
}

function cropOptions(sel) {
  return CROPS.map(c => `<option value="${c}" ${c === sel ? 'selected' : ''}>${esc(cropName(c))}</option>`).join('');
}

function fieldForm(f) {
  return h(`<form class="form" onsubmit="return false">
    <label>${t('field.name')}<input name="name" required maxlength="80" value="${esc(f.name)}"></label>
    <div class="row2">
      <label>${t('field.crop')}<select name="crop">${cropOptions(f.crop)}</select></label>
      <label>${t('field.variety')}<input name="variety" maxlength="60" value="${esc(f.variety || '')}" placeholder="${esc(t('field.varietyPh'))}"></label>
    </div>
    <div class="row2">
      <label>${t('field.sowing')}<input type="date" name="sowing" value="${esc(f.sowing || '')}"></label>
      <label>${t('field.harvest')}<input type="date" name="harvest" value="${esc(f.harvest || '')}"></label>
    </div>
    <div class="row2">
      <label>${t('field.owner')}<input name="owner" maxlength="80" value="${esc(f.owner || '')}"></label>
      <label>${t('field.color')}<input type="color" name="color" value="${esc(f.color || '#ffd54a')}"></label>
    </div>
    <label>${t('field.notes')}<textarea name="desc" rows="2" maxlength="500">${esc(f.desc || '')}</textarea></label>
    <p class="hint">${t('field.areaIs', { ha: geo.fmtArea(f.areaM2) })}</p>
  </form>`);
}

function readForm(form, f) {
  const fd = new FormData(form);
  for (const k of ['name', 'crop', 'variety', 'sowing', 'harvest', 'owner', 'color', 'desc']) f[k] = (fd.get(k) || '').toString().trim();
  if (!f.name) f.name = nextFieldName();
  return f;
}

function addField(geometry, props = {}) {
  geometry = geo.toAreal(geometry);
  if (!geometry) return null;
  geometry = geo.cleanGeom(geometry);
  const areaM2 = geo.areaM2(geometry);
  if (areaM2 < 100) { toast(t('msg.tooSmall'), 'error'); return null; }
  if (areaM2 > 2e8) { toast(t('msg.tooLarge'), 'error'); return null; }
  const f = {
    id: uid(), name: props.name || nextFieldName(), crop: CROPS.includes(props.crop) ? props.crop : 'rice_wet',
    variety: props.variety || '', sowing: props.sowing || '', harvest: props.harvest || '', owner: props.owner || '',
    color: props.color || '#ffd54a', desc: props.desc || '', geometry, areaM2, created: new Date().toISOString(),
    location: '', elevation: null,
  };
  S.fields.push(f);
  saveFields();
  autofillField(f);
  return f;
}

async function autofillField(f) {
  const [lon, lat] = geo.centroid(f.geometry);
  const [place, elev] = await Promise.all([getPlaceName(lat, lon, getLang()), getElevation(lat, lon)]);
  const cur = fieldById(f.id); if (!cur) return;
  if (place) cur.location = place;
  if (elev != null) cur.elevation = elev;
  saveFields();
  if (S.sel === f.id && S.tab === 'overview') renderTab();
}

function editFieldDialog(f, isNew = false) {
  const form = fieldForm(f);
  openModal({
    title: isNew ? t('field.newTitle') : t('field.editTitle'),
    body: form,
    actions: [
      ...(isNew ? [] : [{ label: t('ui.delete'), kind: 'danger left', onClick: async () => { await deleteField(f.id); } }]),
      { label: t('ui.cancel'), onClick: () => { if (isNew) { /* keep created field */ } } },
      { label: t('ui.save'), kind: 'primary', onClick: () => {
        readForm(form, f); saveFields(); renderFieldLayers(); renderFieldList();
        if (S.sel === f.id) { renderFieldHeader(); renderTab(); } else selectField(f.id);
      } },
    ],
  });
}

async function deleteField(id) {
  const f = fieldById(id); if (!f) return;
  const ok = await confirmBox(t('field.confirmDelete', { name: f.name }), t('ui.delete'));
  if (!ok) return;
  S.fields = S.fields.filter(x => x.id !== id);
  S.notes = S.notes.filter(n => n.fieldId !== id);
  saveFields(); saveNotes(); store.clearTs(id);
  if (S.sel === id) showList();
  renderFieldLayers(); renderFieldList(); renderNotesLayer();
  toast(t('msg.deleted'));
}

// ---------------------------------------------------------------- drawing & shape editing
function startDraw() {
  stopModes();
  S.drawing = true;
  showHint(t('draw.hint'));
  mv.startDraw({
    kind: 'polygon',
    onFinish: (geom) => {
      S.drawing = false; hideHint();
      const f = addField(geom);
      if (!f) return;
      renderFieldLayers(); renderFieldList();
      selectField(f.id);
      editFieldDialog(f, true);
    },
    onCancel: () => { S.drawing = false; hideHint(); },
  });
}

function startEditShape() {
  const f = selField(); if (!f) return;
  if (f.geometry.type !== 'Polygon') { toast(t('msg.multiNoEdit'), 'error'); return; }
  stopModes();
  mv.startEdit(f.geometry);
  S.editing = true;
  $('#editBar').hidden = false;
  showHint(t('edit.hint'));
}

function finishEditShape(save) {
  if (!S.editing) return;
  const g = mv.getEditGeometry();
  mv.stopEdit();
  S.editing = false; $('#editBar').hidden = true; hideHint();
  const f = selField();
  if (save && f && g) {
    f.geometry = geo.cleanGeom(g); f.areaM2 = geo.areaM2(f.geometry);
    saveFields(); store.clearTs(f.id);
    S.resultCache.clear();
    renderFieldLayers(); renderFieldList(); selectField(f.id, { force: true });
  }
}

// ---------------------------------------------------------------- measuring tool
function fmtLen(m) { return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`; }
function showMeasure(pts) {
  if (!pts || pts.length < 2) { showHint(t('measure.hint')); return; }
  let txt = `${t('measure.dist')}: ${fmtLen(pathLength(pts))}`;
  if (pts.length >= 3) {
    const ring = [...pts, pts[0]];
    const a = geo.areaM2({ type: 'Polygon', coordinates: [ring] });
    txt += ` · ${t('measure.area')}: ${(a / 10000).toFixed(2)} ${t('unit.ha')} · ${t('measure.perim')}: ${fmtLen(pathLength(ring))}`;
  }
  showHint(txt);
}
function startMeasure() {
  stopModes();
  S.measure = true;
  $('#btnMeasure').classList.add('active');
  showHint(t('measure.hint'));
  mv.startDraw({ kind: 'measure', onChange: showMeasure, onFinish: showMeasure, onCancel: () => {} });
}
function stopMeasure() {
  if (!S.measure) return;
  S.measure = false;
  mv.stopDraw(true);
  $('#btnMeasure').classList.remove('active');
  hideHint();
}

function stopModes() {
  if (S.drawing) { mv.stopDraw(); S.drawing = false; }
  if (S.editing) finishEditShape(false);
  stopMeasure();
  setNoteMode(false);
  hideHint();
}

function showHint(msg) { const el = $('#drawHint'); el.textContent = msg; el.hidden = false; }
function hideHint() { $('#drawHint').hidden = true; }

// ---------------------------------------------------------------- selection
function showList() {
  S.gen++; if (S.abort) S.abort.abort();
  stopTs();
  S.sel = null; S.scenes = []; S.result = null; S.zones = null; S.showZones = false; S.compare.idx = -1; S.compare.diff = null;
  clearOverlay();
  $('#viewField').hidden = true; $('#viewList').hidden = false;
  $('#timeline').hidden = true; $('#legend').hidden = true;
  document.body.classList.remove('has-field');
  restyleFields(); renderFieldList(); renderNotesLayer();
  fitAllFields();
}

function selectField(id, { force = false } = {}) {
  const f = fieldById(id); if (!f) return;
  if (S.sel === id && !force) { zoomToField(); return; }
  S.gen++; if (S.abort) S.abort.abort();
  stopTs();
  S.abort = new AbortController();
  S.sel = id; S.scenes = []; S.sceneIdx = -1; S.result = null; S.zones = null; S.showZones = false; S.compare.idx = -1; S.compare.diff = null;
  clearOverlay();
  S.grid = geo.makeGrid(f.geometry);
  if (S.grid.count === 0) S.grid = geo.makeGrid(f.geometry, 5);
  $('#viewList').hidden = true; $('#viewField').hidden = false;
  document.body.classList.add('has-field');
  renderFieldHeader();
  setTab(S.tab || 'overview');
  restyleFields(); renderNotesLayer();
  zoomToField();
  if (f.areaM2 > 2e7) toast(t('msg.largeField'), 'warn', 7000);
  loadScenes();
  loadWeather(f);
}

function zoomToField() {
  const f = selField();
  if (f) mv.fitBox(geo.bbox(f.geometry), { maxZoom: 17.5, padding: mapPadding() });
}

function renderFieldHeader() {
  const f = selField(); if (!f) return;
  $('#fName').textContent = f.name;
  $('#fSub').textContent = `${cropName(f.crop)} · ${geo.fmtArea(f.areaM2)} ${t('unit.ha')}`;
}

// ---------------------------------------------------------------- scenes + timeline
async function loadScenes() {
  const f = selField(); if (!f) return;
  const gen = S.gen;
  const tl = $('#timeline'); tl.hidden = false;
  $('#scenes').innerHTML = `<div class="tl-msg"><span class="spinner"></span> ${t('scenes.searching')}</div>`;
  const end = new Date();
  let start = new Date(Date.now() - S.settings.lookbackDays * DAY);
  if (f.sowing) { const s = new Date(Date.parse(f.sowing) - 30 * DAY); if (s < start) start = s; }
  try {
    const scenes = await searchScenes(f.geometry, { start, end, maxCloud: S.settings.maxCloud, collection: S.settings.collection, signal: S.abort.signal });
    if (gen !== S.gen) return;
    S.scenes = scenes;
    renderTimeline();
    if (!scenes.length) { $('#scenes').innerHTML = `<div class="tl-msg">${t('scenes.none')}</div>`; return; }
    await autoPickScene(gen);
  } catch (e) {
    if (gen !== S.gen || e.name === 'AbortError') return;
    console.error(e);
    $('#scenes').innerHTML = `<div class="tl-msg error">${t('scenes.error')} <button class="link" id="retryScenes">${t('ui.retry')}</button></div>`;
    $('#retryScenes').onclick = () => loadScenes();
  }
}

/** Show the newest scene with most of the field clear; try a few candidates. */
async function autoPickScene(gen) {
  const cands = S.scenes.slice(0, 12).filter(s => (s.cloud ?? 0) <= 70).slice(0, 6);
  if (!cands.length) cands.push(S.scenes[0]);
  let best = null;
  for (const sc of cands) {
    if (gen !== S.gen) return;
    const i = S.scenes.indexOf(sc);
    setMapLoading(true);
    try {
      const r = await getResult(sc, 'NDVI');
      if (gen !== S.gen) return;
      if (!best || r.validFrac > best.r.validFrac) best = { i, r };
      if (r.validFrac >= 0.6) break;
    } catch (e) { console.warn('scene failed', sc.id, e); }
  }
  setMapLoading(false);
  if (gen !== S.gen) return;
  if (best) await showScene(best.i);
  else { toast(t('scenes.loadError'), 'error', 7000); }
}

function sceneKey(sc, index) { return `${S.sel}|${sc.id}|${index}`; }

async function getResult(sc, index) {
  const k = sceneKey(sc, index);
  if (S.resultCache.has(k)) return S.resultCache.get(k);
  const p = processScene(S.grid, sc, index, { signal: S.abort && S.abort.signal });
  S.resultCache.set(k, p);
  p.then((r) => {
    if (index !== 'TRUE' && r.stats) {
      store.putTs(S.sel, index, sc.id, { date: sc.date, mean: r.stats.mean, p10: r.stats.p10, p90: r.stats.p90, std: r.stats.std, valid: r.validFrac, cloud: r.cloudFrac });
    }
  }).catch(() => S.resultCache.delete(k));
  while (S.resultCache.size > 24) S.resultCache.delete(S.resultCache.keys().next().value);
  return p;
}

async function showScene(i) {
  const sc = S.scenes[i]; if (!sc) return;
  const gen = S.gen;
  S.sceneIdx = i;
  markTimeline();
  setMapLoading(true);
  try {
    const r = await getResult(sc, S.index);
    if (gen !== S.gen || S.sceneIdx !== i) return;
    S.result = r;
    S.showZones = false;
    if (S.compare.on) await updateCompare();
    if (gen !== S.gen || S.sceneIdx !== i) return;
    drawResult();
    renderLegend();
    updateTimelineValues();
    if (S.tab === 'overview') renderTab();
  } catch (e) {
    if (gen !== S.gen || e.name === 'AbortError') return;
    console.error(e);
    toast(t('scenes.loadError'), 'error', 7000);
  } finally {
    if (gen === S.gen) setMapLoading(false);
  }
}

function setMapLoading(on) { $('#mapLoading').hidden = !on; }

function renderTimeline() {
  const box = $('#scenes');
  box.innerHTML = '';
  const tsCache = store.getTs(S.sel, S.index === 'TRUE' ? 'NDVI' : S.index);
  let lastYear = null;
  S.scenes.forEach((sc, i) => {
    const y = sc.date.slice(0, 4);
    const rec = tsCache[sc.id];
    const chip = h(`<button class="chip" data-i="${i}" title="${esc(sc.id)}">
      ${y !== lastYear ? `<span class="yr">${y}</span>` : ''}
      <span class="d">${fmtDate(sc.date, { day: 'numeric', month: 'short' })}</span>
      <span class="c">☁ ${sc.cloud != null ? Math.round(sc.cloud) : '?'}%</span>
      <span class="v">${chipValue(rec)}</span>
    </button>`);
    lastYear = y;
    chip.addEventListener('click', () => showScene(i));
    box.appendChild(chip);
  });
  markTimeline();
}

function chipValue(rec) {
  if (!rec || !Number.isFinite(rec.mean)) return '';
  const idx = S.index === 'TRUE' ? 'NDVI' : S.index;
  const clear = Math.round(rec.valid * 100);
  return `<i style="background:${cssColor(valueColor(idx, rec.mean))}"></i>${rec.mean.toFixed(2)}${clear < 90 ? ` <em>${clear}%</em>` : ''}`;
}

function updateTimelineValues() {
  const tsCache = store.getTs(S.sel, S.index === 'TRUE' ? 'NDVI' : S.index);
  $$('#scenes .chip').forEach(ch => {
    const sc = S.scenes[+ch.dataset.i];
    ch.querySelector('.v').innerHTML = chipValue(tsCache[sc.id]);
  });
}

function markTimeline() {
  $$('#scenes .chip').forEach(ch => ch.classList.toggle('active', +ch.dataset.i === S.sceneIdx));
  const a = $('#scenes .chip.active');
  if (a) a.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
}

// ---------------------------------------------------------------- overlay rendering
function clearOverlay() {
  if (S.overlay) { mv.clearOverlay(); S.overlay = false; }
}

function canvasFor(res, zoneCls, colorFn) {
  const g = S.grid;
  const c = document.createElement('canvas');
  c.width = g.W; c.height = g.H;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(g.W, g.H);
  const zc = zoneCls ? zoneColors(S.zones.n) : null;
  for (let i = 0; i < g.W * g.H; i++) {
    const st = res.status[i];
    if (!st) continue;
    const k = i * 4;
    if (zoneCls) {
      const z = zoneCls[i];
      if (z) { const col = zc[z - 1]; img.data[k] = col[0]; img.data[k + 1] = col[1]; img.data[k + 2] = col[2]; img.data[k + 3] = 245; continue; }
    }
    if (st === 1 && !zoneCls) {
      if (res.rgb) { img.data[k] = res.rgb[i * 3]; img.data[k + 1] = res.rgb[i * 3 + 1]; img.data[k + 2] = res.rgb[i * 3 + 2]; }
      else { const col = colorFn ? colorFn(res.values[i]) : valueColor(res.indexKey, res.values[i]); img.data[k] = col[0]; img.data[k + 1] = col[1]; img.data[k + 2] = col[2]; }
      img.data[k + 3] = 255;
    } else if (st === 2) {
      const row = Math.floor(i / g.W), col = i % g.W;
      const stripe = (row + col) % 6 < 2;
      img.data[k] = stripe ? 150 : 236; img.data[k + 1] = stripe ? 160 : 240; img.data[k + 2] = stripe ? 175 : 245; img.data[k + 3] = 215;
    } else {
      img.data[k] = 90; img.data[k + 1] = 90; img.data[k + 2] = 90; img.data[k + 3] = 110;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** Canvas for whatever layer is active: zones, change map or index. */
function currentCanvas() {
  if (S.showZones && S.zones) return canvasFor(S.result, S.zones.cls);
  if (compareActive()) return canvasFor(S.compare.diff, null, diffColor);
  return canvasFor(S.result, null);
}

function drawResult() {
  clearOverlay();
  if (!S.result) return;
  const g = S.grid;
  const cv = currentCanvas();
  mv.setOverlay(cv.toDataURL(), g, S.settings.opacity);
  S.overlay = true;
}

// ---------------------------------------------------------------- legend
function renderLegend() {
  const lg = $('#legend');
  const r = S.result; const sc = S.scenes[S.sceneIdx];
  if (!r || !sc) { lg.hidden = true; return; }
  lg.hidden = false;
  const clear = Math.round(r.validFrac * 100), cloud = Math.round((r.cloud / (r.inside || 1)) * 100);
  const cmp = compareActive();
  const title = S.showZones ? t('zones.title') : cmp ? t('cmp.title', { idx: S.index }) : esc(indexName(S.index));
  const sub = cmp ? `${fmtDate(S.scenes[S.compare.idx].date)} → ${fmtDate(sc.date)}` : `${fmtDate(sc.date)} · Sentinel-2${sc.platform ? ` ${esc(sc.platform.slice(-1).toUpperCase())}` : ''}`;
  const head = `<div class="lg-head"><b>${title}</b><span>${sub}</span>
    <button class="icon-btn sm" id="lgToggle" aria-label="${esc(t('ui.collapse'))}">▾</button></div>`;
  let body = '';
  if (S.compare.on && !S.showZones) body = compareLegendBody();
  else if (S.showZones && S.zones) {
    const zc = zoneColors(S.zones.n);
    body = `<table class="bins">${S.zones.stats.map((z, k) => `<tr><td><i style="background:${cssColor(zc[k])}"></i>${t('zones.zone')} ${z.zone}</td><td>${Number.isFinite(z.mean) ? z.mean.toFixed(2) : '—'}</td><td>${z.areaHa.toFixed(2)} ${t('unit.ha')}</td><td>${z.pct.toFixed(0)}%</td></tr>`).join('')}</table>`;
  } else if (S.index === 'TRUE') {
    body = `<p class="muted small">${t('legend.trueColor')}</p>`;
  } else if (r.stats) {
    const d = INDICES[S.index];
    const ha = S.grid.pixelAreaM2 / 10000;
    const max = Math.max(...r.bins.map(b => b.count), 1);
    const rows = r.bins.filter(b => b.count > 0 || (b.lo >= d.min - 0.1 && b.hi <= d.max + 0.1)).reverse().map(b => {
      const mid = (Math.max(b.lo, d.min) + Math.min(b.hi, d.max)) / 2;
      const lo = b.lo <= -1 ? '<' : fmtNum(b.lo);
      return `<tr><td><i style="background:${cssColor(valueColor(S.index, mid))}"></i>${lo === '<' ? `&lt; ${fmtNum(b.hi)}` : `${lo} – ${fmtNum(b.hi)}`}</td>
        <td class="bar"><span style="width:${(100 * b.count / max).toFixed(0)}%"></span></td>
        <td>${(b.count * ha).toFixed(2)} ${t('unit.ha')}</td><td>${r.valid ? ((100 * b.count) / r.valid).toFixed(0) : 0}%</td></tr>`;
    }).join('');
    body = `<div class="ramp" style="background:${gradientCss(S.index)}"></div>
      <div class="ramp-l"><span>${fmtNum(d.min)}</span><span>${fmtNum((d.min + d.max) / 2)}</span><span>${fmtNum(d.max)}</span></div>
      <div class="lg-stats"><span>${t('legend.mean')} <b>${r.stats.mean.toFixed(2)}</b></span><span>${t('legend.min')} ${r.stats.min.toFixed(2)}</span><span>${t('legend.max')} ${r.stats.max.toFixed(2)}</span></div>
      <table class="bins">${rows}</table>`;
  } else {
    body = `<p class="muted small">${t('legend.noValid')}</p>`;
  }
  lg.innerHTML = `${head}<div class="lg-body">${body}
    <div class="lg-foot"><span><i class="sw clear"></i>${t('legend.clear')} ${clear}%</span><span><i class="sw cloud"></i>${t('legend.cloud')} ${cloud}%</span>
      <button class="btn sm dl" id="lgTiff" title="${esc(t('legend.geotiffTitle'))}"><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19h14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>GeoTIFF</button></div></div>`;
  lg.classList.toggle('collapsed', !!S.legendCollapsed);
  $('#lgTiff').onclick = exportGeoTiff;
  const cs = $('#cmpWith');
  if (cs) cs.onchange = async () => { S.compare.idx = +cs.value; setMapLoading(true); try { await updateCompare(); drawResult(); renderLegend(); } finally { setMapLoading(false); } };
  $('#lgToggle').onclick = () => { S.legendCollapsed = !S.legendCollapsed; lg.classList.toggle('collapsed', S.legendCollapsed); };
}

function fmtNum(v) { return Math.abs(v) >= 10 ? v.toFixed(0) : (Math.round(v * 100) / 100).toString(); }

// pixel readout (MapView already throttles hover events to one per frame)
function pixelReadout(e) {
  const box = $('#pixelInfo');
  const r = S.result, g = S.grid;
  if (!e || !r || !g || S.drawing || S.editing || S.measure) { box.hidden = true; return; }
  const col = Math.floor((e.lng - g.west) / g.dLon), row = Math.floor((g.north - e.lat) / g.dLat);
  if (col < 0 || row < 0 || col >= g.W || row >= g.H) { box.hidden = true; return; }
  const i = row * g.W + col, st = r.status[i];
  if (!st) { box.hidden = true; return; }
  let txt;
  const dv = compareActive() && !S.showZones ? S.compare.diff.values[i] : NaN;
  if (Number.isFinite(dv)) txt = `Δ ${S.index} ${dv > 0 ? '+' : ''}${dv.toFixed(3)}`;
  else if (S.showZones && S.zones && S.zones.cls[i]) txt = `${t('zones.zone')} ${S.zones.cls[i]}${Number.isFinite(r.values[i]) ? ` · ${r.values[i].toFixed(3)}` : ''}`;
  else if (st === 2) txt = t('legend.cloud');
  else if (st === 3) txt = t('legend.nodata');
  else if (r.rgb) txt = `RGB ${r.rgb[i * 3]}, ${r.rgb[i * 3 + 1]}, ${r.rgb[i * 3 + 2]}`;
  else txt = `${r.indexKey} ${r.values[i].toFixed(3)}`;
  box.textContent = txt;
  box.style.left = `${e.x + 14}px`; box.style.top = `${e.y + 14}px`;
  box.hidden = false;
}

// ---------------------------------------------------------------- tabs
const TABS = ['overview', 'chart', 'weather', 'zones', 'notes'];
function setTab(tab) {
  S.tab = TABS.includes(tab) ? tab : 'overview';
  $$('#tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === S.tab));
  renderTab();
}

function renderTab() {
  const f = selField(); if (!f) return;
  const body = $('#tabBody');
  for (const id of ['index', 'weather', 'accum', 'soil']) destroyChart(id);
  body.innerHTML = '';
  ({ overview: renderOverview, chart: renderChartTab, weather: renderWeatherTab, zones: renderZonesTab, notes: renderNotesTab })[S.tab](body, f);
}

// ---- overview
function statusText(mean, cv) {
  let k = 'status.bare';
  if (mean >= 0.8) k = 'status.veryDense'; else if (mean >= 0.6) k = 'status.dense'; else if (mean >= 0.4) k = 'status.moderate'; else if (mean >= 0.2) k = 'status.sparse';
  let s = t(k);
  if (cv != null) s += ' ' + (cv > 0.2 ? t('status.uneven') : cv > 0.1 ? t('status.someVar') : t('status.uniform'));
  return s;
}

function renderOverview(body, f) {
  const recs = latestTs(f.id);
  const last = recs[0], prev = recs[1];
  const sowAgo = f.sowing ? daysBetween(f.sowing, todayIso()) : null;
  const ndviCard = last ? `<b class="ndvi-val"><i class="sw big" style="background:${cssColor(valueColor('NDVI', last.mean))}"></i>${last.mean.toFixed(2)}</b>
      <small>${fmtDate(last.date)}${prev ? ` · ${deltaHtml(last.mean - prev.mean)} ${t('ov.since', { d: fmtDate(prev.date, { day: 'numeric', month: 'short' }) })}` : ''}</small>`
    : `<b>—</b><small>${S.scenes.length ? t('ov.loading') : t('ov.noData')}</small>`;
  const [lon, lat] = geo.centroid(f.geometry);
  body.appendChild(h(`<div>
    <div class="kpis">
      <div class="kpi"><span>${t('ov.ndvi')}</span>${ndviCard}</div>
      <div class="kpi"><span>${t('field.crop')}</span><b>${esc(cropName(f.crop))}</b><small>${esc(f.variety || '')}</small></div>
      <div class="kpi"><span>${t('field.sowing')}</span><b>${f.sowing ? fmtDate(f.sowing) : '—'}</b><small>${sowAgo != null ? (sowAgo >= 0 ? t('ov.daysAgo', { n: sowAgo }) : t('ov.inDays', { n: -sowAgo })) : `<button class="link" data-act="edit">${t('ov.setSowing')}</button>`}</small></div>
      <div class="kpi"><span>${t('ov.area')}</span><b>${geo.fmtArea(f.areaM2)} ${t('unit.ha')}</b><small>${Math.round(f.areaM2).toLocaleString('en')} m²</small></div>
    </div>
    ${last ? `<div class="card status"><h3>${t('ov.status')}</h3><p>${statusText(last.mean, last.std && last.mean ? last.std / last.mean : null)}</p>
      ${recs.length > 1 ? '<div class="spark-wrap"><canvas id="spark" height="70"></canvas></div>' : ''}
      <button class="btn sm" data-act="chart">${t('ov.openChart')}</button></div>` : ''}
    ${stageCard(f)}
    <div class="card" id="ovWeather"><h3>${t('ov.weather')}</h3><p class="muted small"><span class="spinner"></span> ${t('ui.loading')}</p></div>
    <div class="card"><h3>${t('ov.info')}</h3>
      <dl class="info">
        <dt>${t('field.location')}</dt><dd>${esc(f.location || '—')}</dd>
        <dt>${t('field.elevation')}</dt><dd>${f.elevation != null ? `${Math.round(f.elevation)} m` : '—'}</dd>
        <dt>${t('field.coords')}</dt><dd>${lat.toFixed(5)}, ${lon.toFixed(5)}</dd>
        ${f.owner ? `<dt>${t('field.owner')}</dt><dd>${esc(f.owner)}</dd>` : ''}
        ${f.harvest ? `<dt>${t('field.harvest')}</dt><dd>${fmtDate(f.harvest)}</dd>` : ''}
        ${f.desc ? `<dt>${t('field.notes')}</dt><dd>${esc(f.desc)}</dd>` : ''}
      </dl></div>
    <div class="actions-grid">
      <button class="btn" data-act="report">${t('ov.report')}</button>
      <button class="btn" data-act="shape">${t('ov.editShape')}</button>
      <button class="btn" data-act="export">${t('ov.exportField')}</button>
      <button class="btn danger" data-act="delete">${t('ui.delete')}</button>
    </div></div>`));
  body.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => {
    const a = b.dataset.act;
    if (a === 'edit') editFieldDialog(f);
    if (a === 'chart') setTab('chart');
    if (a === 'report') makeReport();
    if (a === 'shape') startEditShape();
    if (a === 'export') download(`${slug(f.name)}.geojson`, fieldsGeoJSON([f]), 'application/geo+json');
    if (a === 'delete') deleteField(f.id);
  }));
  if (last && recs.length > 1) drawSpark(recs.slice().reverse());
  renderOvWeather(f);
}

function deltaHtml(d) {
  const cls = d > 0.02 ? 'up' : d < -0.02 ? 'down' : 'flat';
  return `<span class="delta ${cls}">${d > 0 ? '▲' : d < 0 ? '▼' : '•'} ${d > 0 ? '+' : ''}${d.toFixed(2)}</span>`;
}

function drawSpark(recs) {
  const cv = $('#spark'); if (!cv) return;
  const w = cv.parentElement.clientWidth || 300; cv.width = w * devicePixelRatio; cv.height = 70 * devicePixelRatio; cv.style.width = `${w}px`; cv.style.height = '70px';
  const ctx = cv.getContext('2d'); ctx.scale(devicePixelRatio, devicePixelRatio);
  const xs = recs.map(r => Date.parse(r.date)), x0 = Math.min(...xs), x1 = Math.max(...xs);
  const X = (x) => 6 + (w - 12) * (x - x0) / ((x1 - x0) || 1), Y = (v) => 64 - 58 * Math.max(0, Math.min(1, v));
  ctx.strokeStyle = 'rgba(46,125,79,0.9)'; ctx.lineWidth = 2; ctx.beginPath();
  recs.forEach((r, i) => { const x = X(Date.parse(r.date)), y = Y(r.mean); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
  ctx.stroke();
  recs.forEach(r => { ctx.fillStyle = cssColor(valueColor('NDVI', r.mean)); ctx.beginPath(); ctx.arc(X(Date.parse(r.date)), Y(r.mean), 3, 0, 7); ctx.fill(); });
}

// ---- weather
async function loadWeather(f, force = false) {
  if (S.weather.has(f.id) && !force) return S.weather.get(f.id);
  const [lon, lat] = geo.centroid(f.geometry);
  let start = new Date(Date.now() - 90 * DAY);
  if (f.sowing && Date.parse(f.sowing) < start.getTime()) start = new Date(Date.parse(f.sowing));
  const p = getWeather(lat, lon, start).catch((e) => { S.weather.delete(f.id); throw e; });
  S.weather.set(f.id, p);
  p.then(() => { if (S.sel === f.id && (S.tab === 'weather' || S.tab === 'overview')) { if (S.tab === 'weather') renderTab(); else renderOvWeather(f); } }).catch(() => {});
  return p;
}

function weatherSummary(w) {
  const today = w.today;
  const past7 = w.days.filter(d => d.date < today && daysBetween(d.date, today) <= 7);
  const next7 = w.days.filter(d => d.date >= today && daysBetween(today, d.date) < 7);
  const td = w.days.find(d => d.date === today) || {};
  const sum = (a, k) => a.reduce((s, d) => s + (d[k] || 0), 0);
  return { td, rainPast7: sum(past7, 'rain'), rainNext7: sum(next7, 'rain'), et0Next7: sum(next7, 'et0'), sm: (w.soil.find(s => s.date === today) || {}).sm };
}

/** Simple agronomic weather alerts from the forecast and recent rain. */
function weatherAlerts(w) {
  const out = [];
  const next = w.days.filter(d => d.date >= w.today && daysBetween(w.today, d.date) < 7);
  const past10 = w.days.filter(d => d.date < w.today && daysBetween(d.date, w.today) <= 10);
  const heavy = next.filter(d => (d.rain || 0) >= 50);
  if (heavy.length) out.push({ kind: 'rain', ic: '🌧', text: t('alert.rain', { d: fmtDate(heavy[0].date, { day: 'numeric', month: 'short' }), mm: Math.round(heavy[0].rain) }) });
  const hot = next.filter(d => (d.tmax ?? 0) >= 36);
  if (hot.length) out.push({ kind: 'heat', ic: '🌡', text: t('alert.heat', { n: hot.length, t: Math.round(Math.max(...hot.map(d => d.tmax))) }) });
  const sum = (a) => a.reduce((s, d) => s + (d.rain || 0), 0);
  if (past10.length >= 8 && sum(past10) < 5 && sum(next) < 5) out.push({ kind: 'dry', ic: '☀', text: t('alert.dry') });
  const sprayDays = next.filter(d => (d.rain || 0) < 1).slice(0, 3);
  if (!out.length) out.push({ kind: 'ok', ic: '✓', text: t('alert.none') });
  if (sprayDays.length && !hot.length) out.push({ kind: 'info', ic: '🧴', text: t('alert.spray', { d: sprayDays.map(d => fmtDate(d.date, { day: 'numeric', month: 'short' })).join(', ') }) });
  return out;
}
const alertsHtml = (w) => `<ul class="alerts">${weatherAlerts(w).map(a => `<li class="${a.kind}"><span>${a.ic}</span>${esc(a.text)}</li>`).join('')}</ul>`;

function forecastStrip(w) {
  const next = w.days.filter(d => d.date >= w.today).slice(0, 7);
  const ic = (d) => (d.rain || 0) >= 20 ? '🌧' : (d.rain || 0) >= 5 ? '🌦' : (d.rain || 0) >= 1 ? '⛅' : '☀';
  return `<div class="fc-strip">${next.map(d => `<div class="fc-day"><span>${fmtDate(d.date, { day: 'numeric', month: 'short' })}</span><i>${ic(d)}</i><b>${Math.round(d.tmax)}°</b><small>${Math.round(d.tmin)}°</small><em>${(d.rain || 0).toFixed(0)} mm</em></div>`).join('')}</div>`;
}

async function renderOvWeather(f) {
  const card = $('#ovWeather'); if (!card) return;
  try {
    const w = await S.weather.get(f.id);
    if (!w || S.sel !== f.id || !$('#ovWeather')) return;
    const s = weatherSummary(w);
    $('#ovWeather').innerHTML = `<h3>${t('ov.weather')}</h3>
      <div class="wx-mini">
        <div><span>${t('wx.today')}</span><b>${s.td.tmax != null ? `${Math.round(s.td.tmax)}° / ${Math.round(s.td.tmin)}°` : '—'}</b></div>
        <div><span>${t('wx.rainPast7')}</span><b>${s.rainPast7.toFixed(0)} mm</b></div>
        <div><span>${t('wx.rainNext7')}</span><b>${s.rainNext7.toFixed(0)} mm</b></div>
        <div><span>${t('wx.soil')}</span><b>${s.sm != null ? `${(s.sm * 100).toFixed(0)}%` : '—'}</b></div>
      </div>${alertsHtml(w)}<button class="btn sm" id="ovWxMore">${t('ov.openWeather')}</button>`;
    $('#ovWxMore').onclick = () => setTab('weather');
  } catch {
    if ($('#ovWeather')) $('#ovWeather').innerHTML = `<h3>${t('ov.weather')}</h3><p class="muted small">${t('wx.error')}</p>`;
  }
}

async function renderWeatherTab(body, f) {
  body.innerHTML = `<p class="muted"><span class="spinner"></span> ${t('ui.loading')}</p>`;
  let w;
  try { w = await loadWeather(f); } catch { body.innerHTML = `<p class="error">${t('wx.error')}</p><button class="btn" id="wxRetry">${t('ui.retry')}</button>`; $('#wxRetry').onclick = () => { loadWeather(f, true); renderTab(); }; return; }
  if (S.sel !== f.id || S.tab !== 'weather') return;
  const s = weatherSummary(w);
  const accStart = f.sowing && f.sowing <= w.today ? f.sowing : w.days[0]?.date;
  const acc = accumulate(w.days, accStart, S.settings.gddBase).filter(a => !a.forecast);
  const lastAcc = acc[acc.length - 1];
  const recent = w.days.filter(d => daysBetween(d.date, w.today) <= 30);
  body.innerHTML = `
    <div class="kpis">
      <div class="kpi"><span>${t('wx.today')}</span><b>${s.td.tmax != null ? `${Math.round(s.td.tmax)}° / ${Math.round(s.td.tmin)}°C` : '—'}</b><small>${s.td.rain != null ? `${s.td.rain.toFixed(1)} mm` : ''}</small></div>
      <div class="kpi"><span>${t('wx.rainPast7')}</span><b>${s.rainPast7.toFixed(0)} mm</b></div>
      <div class="kpi"><span>${t('wx.rainNext7')}</span><b>${s.rainNext7.toFixed(0)} mm</b><small>ET₀ ${s.et0Next7.toFixed(0)} mm</small></div>
      <div class="kpi"><span>${t('wx.soil')}</span><b>${s.sm != null ? `${(s.sm * 100).toFixed(0)}%` : '—'}</b><small>3–9 cm</small></div>
    </div>
    <div class="card"><h3>${t('alert.title')}</h3>${alertsHtml(w)}</div>
    <div class="card"><h3>${t('wx.forecast7')}</h3>${forecastStrip(w)}</div>
    <div class="card"><h3>${t('wx.chartTitle')}</h3><div class="chart-box"><canvas id="wxChart"></canvas></div></div>
    <div class="card"><h3>${t('wx.accTitle', { d: fmtDate(accStart) })}</h3>
      ${lastAcc ? `<p class="small">${t('wx.accSummary', { gdd: Math.round(lastAcc.gdd), rain: Math.round(lastAcc.rain), et0: Math.round(lastAcc.et0), base: S.settings.gddBase })}</p>` : ''}
      <div class="chart-box"><canvas id="accChart"></canvas></div></div>
    <div class="card"><h3>${t('wx.soilTitle')}</h3><div class="chart-box sm"><canvas id="soilChart"></canvas></div></div>
    <p class="source">${t('wx.source')}</p>`;
  const labels = { rain: t('wx.rain'), tmax: t('wx.tmax'), tmin: t('wx.tmin'), today: t('wx.today'), gdd: t('wx.gdd'), gddUnit: t('wx.gddUnit') };
  weatherChart($('#wxChart'), { days: recent, today: w.today, labels });
  accumChart($('#accChart'), { series: acc, labels, today: w.today });
  soilChart($('#soilChart'), { soil: w.soil, label: t('wx.soilLabel'), today: w.today });
}

// ---- index chart (time series)
function seasonRange(f, mode) {
  const now = new Date();
  if (mode === 'sowing' && f.sowing) {
    const s = new Date(Date.parse(f.sowing) - 20 * DAY);
    const e = f.harvest ? new Date(Math.min(Date.parse(f.harvest) + 20 * DAY, now.getTime())) : now;
    return { start: s, end: e };
  }
  if (mode === 'year') return { start: new Date(now.getFullYear(), 0, 1), end: now };
  return { start: new Date(now.getTime() - 365 * DAY), end: now };
}

function tsIndex() { return S.index === 'TRUE' ? 'NDVI' : S.index; }

function renderChartTab(body, f) {
  const idx = tsIndex();
  const mode = S.tsMode || (f.sowing ? 'sowing' : '12m');
  body.appendChild(h(`<div>
    <div class="controls">
      <label>${t('chart.period')}<select id="tsMode">
        <option value="12m">${t('chart.last12')}</option>
        <option value="year">${t('chart.thisYear')}</option>
        <option value="sowing" ${f.sowing ? '' : 'disabled'}>${t('chart.season')}</option>
      </select></label>
      <label class="check"><input type="checkbox" id="tsPrev" ${S.tsPrev ? 'checked' : ''}> ${t('chart.comparePrev')}</label>
    </div>
    <div class="ts-run">
      <button class="btn primary" id="tsGo">${t('chart.calc', { idx })}</button>
      <button class="btn" id="tsStop" hidden>${t('ui.stop')}</button>
      <div class="progress" id="tsProg" hidden><span></span></div>
      <small id="tsMsg" class="muted"></small>
    </div>
    <div class="card"><div class="chart-box tall"><canvas id="tsChart"></canvas></div>
      <p class="muted small">${t('chart.help')}</p></div>
    <details class="card"><summary>${t('chart.table')}</summary><div id="tsTable"></div>
      <button class="btn sm" id="tsCsv">${t('chart.csv')}</button></details>
  </div>`));
  $('#tsMode').value = mode;
  $('#tsMode').onchange = (e) => { S.tsMode = e.target.value; drawTsChart(); };
  $('#tsPrev').onchange = (e) => { S.tsPrev = e.target.checked; drawTsChart(); };
  $('#tsGo').onclick = () => runTimeSeries();
  $('#tsStop').onclick = () => stopTs();
  $('#tsCsv').onclick = () => exportTsCsv();
  drawTsChart();
  if (S.tsRun) setTsRunning(true);
}

function tsPoints(f, idx, range) {
  const cache = store.getTs(f.id, idx);
  const s = range.start.toISOString().slice(0, 10), e = range.end.toISOString().slice(0, 10);
  return Object.entries(cache)
    .filter(([, r]) => r.date >= s && r.date <= e && r.valid * 100 >= S.settings.tsMinClear && Number.isFinite(r.mean))
    .map(([id, r]) => ({ id, x: ts(r.date), y: +r.mean.toFixed(4), p10: r.p10, p90: r.p90, date: r.date, valid: r.valid }))
    .sort((a, b) => a.x - b.x);
}

function drawTsChart() {
  const f = selField(); const cv = $('#tsChart'); if (!f || !cv) return;
  const idx = tsIndex();
  const range = seasonRange(f, S.tsMode || (f.sowing ? 'sowing' : '12m'));
  const pts = tsPoints(f, idx, range);
  let prev = null;
  if (S.tsPrev) {
    const pr = { start: new Date(range.start.getTime() - 365 * DAY), end: new Date(range.end.getTime() - 365 * DAY) };
    prev = tsPoints(f, idx, pr).map(p => ({ x: p.x + 365 * DAY, y: p.y }));
  }
  const markers = [];
  if (f.sowing) markers.push({ x: ts(f.sowing), label: t('field.sowing'), color: '#2e7d4f' });
  if (f.harvest) markers.push({ x: ts(f.harvest), label: t('field.harvest'), color: '#b26a00' });
  else { const gs = growthStage(f.crop, f.sowing, null, todayIso()); if (gs) markers.push({ x: ts(gs.harvestIso), label: t('stage.harvestShort'), color: '#b26a00', dash: [2, 3] }); }
  const d = INDICES[idx];
  indexChart(cv, {
    label: `${idx} (${t('chart.mean')})`, points: pts, prev, prevLabel: t('chart.prevYear'), color: '#2e7d4f', markers,
    yMin: Math.min(d.min, ...pts.map(p => p.p10 ?? p.y)), yMax: Math.max(d.max, ...pts.map(p => p.p90 ?? p.y)),
    onPoint: (p) => { const i = S.scenes.findIndex(s => s.id === p.id); if (i >= 0) showScene(i); },
  });
  $('#tsMsg').textContent = pts.length ? t('chart.points', { n: pts.length }) : t('chart.empty');
  $('#tsTable').innerHTML = pts.length ? `<table class="data"><tr><th>${t('chart.date')}</th><th>${idx}</th><th>p10</th><th>p90</th><th>${t('legend.clear')}</th></tr>
    ${pts.slice().reverse().map(p => `<tr><td>${fmtDate(p.date)}</td><td>${p.y.toFixed(3)}</td><td>${p.p10?.toFixed(3) ?? ''}</td><td>${p.p90?.toFixed(3) ?? ''}</td><td>${Math.round(p.valid * 100)}%</td></tr>`).join('')}</table>` : '';
}

function setTsRunning(on) {
  if (!$('#tsGo')) return;
  $('#tsGo').disabled = on; $('#tsStop').hidden = !on; $('#tsProg').hidden = !on;
}

function stopTs() { if (S.tsRun) { S.tsRun.stopped = true; S.tsRun.abort.abort(); S.tsRun = null; } setTsRunning(false); }

async function runTimeSeries() {
  const f = selField(); if (!f || S.tsRun) return;
  const idx = tsIndex();
  const gen = S.gen;
  const run = { abort: new AbortController(), stopped: false };
  S.tsRun = run;
  setTsRunning(true);
  const mode = S.tsMode || (f.sowing ? 'sowing' : '12m');
  const range = seasonRange(f, mode);
  if (S.tsPrev) range.start = new Date(range.start.getTime() - 365 * DAY);
  const msg = (m) => { if ($('#tsMsg')) $('#tsMsg').textContent = m; };
  try {
    msg(t('scenes.searching'));
    let scenes = await searchScenes(f.geometry, { start: range.start, end: range.end, maxCloud: S.settings.maxCloud, collection: S.settings.collection, signal: run.abort.signal });
    const cache = store.getTs(f.id, idx);
    let todo = scenes.filter(s => !cache[s.id]);
    if (todo.length > S.settings.tsMaxScenes) {
      todo = todo.slice().sort((a, b) => (a.cloud ?? 0) - (b.cloud ?? 0)).slice(0, S.settings.tsMaxScenes);
    }
    let done = 0;
    const total = todo.length;
    const prog = () => {
      const bar = $('#tsProg span'); if (bar) bar.style.width = `${total ? (100 * done / total) : 100}%`;
      msg(t('chart.progress', { done, total }));
    };
    prog();
    await mapLimit(todo, 3, async (sc) => {
      if (run.stopped || gen !== S.gen) return;
      try {
        const r = await processScene(S.grid, sc, idx, { signal: run.abort.signal });
        store.putTs(f.id, idx, sc.id, { date: sc.date, mean: r.stats ? r.stats.mean : NaN, p10: r.stats?.p10, p90: r.stats?.p90, std: r.stats?.std, valid: r.validFrac, cloud: r.cloudFrac });
      } catch (e) {
        if (e.name !== 'AbortError') { console.warn('ts scene failed', sc.id, e); store.putTs(f.id, idx, sc.id, { date: sc.date, mean: NaN, valid: 0, cloud: 1, error: true }); }
      }
      done++;
      if (gen === S.gen && S.tab === 'chart') { prog(); if (done % 3 === 0 || done === total) drawTsChart(); }
    });
    if (gen !== S.gen) return;
    if (S.tab === 'chart') drawTsChart();
    updateTimelineValues(); renderFieldList();
    if (!run.stopped) toast(t('chart.done', { n: total }), 'ok');
  } catch (e) {
    if (e.name !== 'AbortError') { console.error(e); toast(t('scenes.error'), 'error'); }
  } finally {
    if (S.tsRun === run) S.tsRun = null;
    setTsRunning(false);
  }
}

function exportTsCsv() {
  const f = selField(); if (!f) return;
  const idx = tsIndex();
  const rows = Object.entries(store.getTs(f.id, idx)).map(([id, r]) => ({ id, ...r })).sort((a, b) => a.date.localeCompare(b.date));
  const csv = ['date,scene_id,index,mean,p10,p90,std,clear_fraction,cloud_fraction',
    ...rows.map(r => [r.date, r.id, idx, r.mean, r.p10 ?? '', r.p90 ?? '', r.std ?? '', r.valid, r.cloud].join(','))].join('\n');
  download(`${slug(f.name)}_${idx}_timeseries.csv`, csv, 'text/csv');
}

// ---- zones
function renderZonesTab(body, f) {
  const z = S.zones;
  body.appendChild(h(`<div>
    <p class="muted small">${t('zones.intro')}</p>
    <div class="controls">
      <label>${t('zones.count')}<select id="zN">${[2, 3, 4, 5, 6, 7].map(n => `<option ${n === (z?.n || 4) ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <label>${t('zones.method')}<select id="zMethod">
        <option value="quantile">${t('zones.quantile')}</option><option value="equal">${t('zones.equal')}</option><option value="kmeans">${t('zones.kmeans')}</option></select></label>
      <label>${t('zones.source')}<select id="zSrc"><option value="current">${t('zones.current')}</option><option value="avg">${t('zones.avg')}</option></select></label>
      <label class="check"><input type="checkbox" id="zSmooth" checked> ${t('zones.smooth')}</label>
    </div>
    <button class="btn primary" id="zGo">${t('zones.create')}</button> <small class="muted" id="zMsg"></small>
    <div id="zOut"></div>
  </div>`));
  if (z) { $('#zMethod').value = z.method; $('#zSrc').value = z.source; $('#zSmooth').checked = z.smooth; }
  $('#zGo').onclick = () => createZones();
  renderZoneTable();
}

async function zoneSourceValues(src) {
  const idx = tsIndex();
  if (src === 'avg') {
    const cache = store.getTs(S.sel, idx);
    const good = S.scenes.filter(s => cache[s.id] && cache[s.id].valid >= 0.9 && Number.isFinite(cache[s.id].mean))
      .sort((a, b) => cache[b.id].mean - cache[a.id].mean).slice(0, 5);
    if (good.length >= 2) {
      const results = await mapLimit(good, 2, (sc) => getResult(sc, idx));
      const n = S.grid.W * S.grid.H;
      const out = new Float32Array(n).fill(NaN);
      for (let i = 0; i < n; i++) {
        let s = 0, c = 0;
        for (const r of results) { const v = r.values[i]; if (Number.isFinite(v)) { s += v; c++; } }
        if (c) out[i] = s / c;
      }
      return { values: out, label: t('zones.avgOf', { n: good.length, dates: good.map(g => fmtDate(g.date, { day: 'numeric', month: 'short', year: '2-digit' })).join(', ') }) };
    }
    toast(t('zones.needTs'), 'warn', 6000);
  }
  if (!S.result || S.index === 'TRUE') {
    const sc = S.scenes[S.sceneIdx]; if (!sc) return null;
    const r = await getResult(sc, idx);
    return { values: r.values, label: `${idx} ${fmtDate(sc.date)}` };
  }
  return { values: S.result.values, label: `${S.index} ${fmtDate(S.scenes[S.sceneIdx].date)}` };
}

async function createZones() {
  const n = +$('#zN').value, method = $('#zMethod').value, source = $('#zSrc').value, smooth = $('#zSmooth').checked;
  $('#zMsg').innerHTML = `<span class="spinner"></span>`;
  try {
    const src = await zoneSourceValues(source);
    if (!src) { $('#zMsg').textContent = t('zones.noScene'); return; }
    const br = breaks(src.values, n, method);
    if (!br) { $('#zMsg').textContent = t('zones.tooFew'); return; }
    let cls = classify(src.values, br);
    if (smooth) cls = majority(cls, S.grid.W, S.grid.H, n, 2);
    const stats = zoneStats(cls, src.values, n, S.grid.pixelAreaM2);
    S.zones = { n, method, source, smooth, cls, stats, breaks: br, label: src.label, rates: (S.zones?.n === n ? S.zones.rates : null) || stats.map(() => '') };
    S.showZones = true;
    if (!S.result) { const sc = S.scenes[S.sceneIdx]; if (sc) S.result = await getResult(sc, tsIndex()); }
    drawResult(); renderLegend();
    $('#zMsg').textContent = '';
    renderZoneTable();
  } catch (e) {
    console.error(e); $('#zMsg').textContent = t('scenes.loadError');
  }
}

function renderZoneTable() {
  const out = $('#zOut'); const z = S.zones; if (!out || !z) return;
  const zc = zoneColors(z.n);
  const total = z.stats.reduce((s, x) => s + x.areaHa, 0);
  out.innerHTML = `<div class="card"><h3>${t('zones.result')}</h3><p class="muted small">${esc(z.label)}</p>
    <table class="data zones"><tr><th>${t('zones.zone')}</th><th>${t('legend.mean')}</th><th>${t('ov.area')}</th><th>%</th><th>${t('zones.rate')}</th></tr>
    ${z.stats.map((s, k) => `<tr><td><i class="sw" style="background:${cssColor(zc[k])}"></i>${s.zone}</td><td>${Number.isFinite(s.mean) ? s.mean.toFixed(3) : '—'}</td><td>${s.areaHa.toFixed(2)} ${t('unit.ha')}</td><td>${s.pct.toFixed(0)}</td>
      <td><input class="rate" type="number" min="0" step="any" data-k="${k}" value="${esc(z.rates[k])}" placeholder="kg/ha"></td></tr>`).join('')}
    <tr class="tot"><td colspan="2">${t('zones.total')}</td><td>${total.toFixed(2)} ${t('unit.ha')}</td><td>100</td><td id="zTotRate"></td></tr></table>
    <label class="check"><input type="checkbox" id="zShow" ${S.showZones ? 'checked' : ''}> ${t('zones.showOnMap')}</label>
    <div class="actions-grid">
      <button class="btn" id="zGeo">${t('zones.exportGeo')}</button>
      <button class="btn" id="zCsv">${t('zones.exportCsv')}</button>
    </div><p class="muted small">${t('zones.rateHelp')}</p></div>`;
  const totRate = () => {
    let sum = 0, any = false;
    z.stats.forEach((s, k) => { const r = parseFloat(z.rates[k]); if (Number.isFinite(r)) { sum += r * s.areaHa; any = true; } });
    $('#zTotRate').textContent = any ? `${sum.toFixed(1)} ${t('zones.totalProduct')}` : '';
  };
  totRate();
  out.querySelectorAll('.rate').forEach(inp => inp.addEventListener('input', () => { z.rates[+inp.dataset.k] = inp.value; totRate(); }));
  $('#zShow').onchange = (e) => { S.showZones = e.target.checked; drawResult(); renderLegend(); };
  $('#zGeo').onclick = () => {
    const f = selField();
    const fc = vectorise(z.cls, S.grid, z.n);
    fc.features.forEach(ft => {
      const s = z.stats[ft.properties.zone - 1];
      Object.assign(ft.properties, { field: f.name, mean: +s.mean.toFixed(4), area_ha: +s.areaHa.toFixed(3), rate: z.rates[ft.properties.zone - 1] === '' ? null : +z.rates[ft.properties.zone - 1], source: z.label });
    });
    download(`${slug(f.name)}_zones.geojson`, fc, 'application/geo+json');
  };
  $('#zCsv').onclick = () => {
    const f = selField();
    const csv = ['zone,mean,area_ha,percent,rate', ...z.stats.map((s, k) => [s.zone, s.mean.toFixed(4), s.areaHa.toFixed(3), s.pct.toFixed(1), z.rates[k]].join(','))].join('\n');
    download(`${slug(f.name)}_zones.csv`, csv, 'text/csv');
  };
}

// ---- notes (scouting)
function catIcon(c) { return ({ disease: '🦠', pest: '🐛', weed: '🌿', water: '💧', nutrient: '🧪', damage: '⚠️', other: '📍' })[c] || '📍'; }

function renderNotesLayer() {
  const list = S.notes.filter(n => !S.sel || n.fieldId === S.sel);
  mv.setNotes(list, {
    icon: (n) => catIcon(n.cat),
    html: (n) => `<div class="note-pop"><b>${catIcon(n.cat)} ${esc(t(`cat.${n.cat}`))}</b> · ${fmtDate(n.date)}<p>${esc(n.text)}</p>${n.photo ? `<img src="${n.photo}" alt="">` : ''}</div>`,
  });
}

function setNoteMode(on) {
  S.noteMode = on;
  document.body.classList.toggle('note-mode', on);
  mv.setCursor(on ? 'crosshair' : ''); mv.cursorLocked = on;
  if (on) showHint(t('notes.hint')); else if (!S.drawing && !S.editing && !S.measure) hideHint();
  const b = $('#noteAdd'); if (b) b.classList.toggle('active', on);
}


function resizePhoto(file, max = 640) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL('image/jpeg', 0.72));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function noteDialog(pos, existing) {
  const n = existing || { id: uid(), fieldId: S.sel, lat: pos.lat, lng: pos.lng, date: todayIso(), cat: 'other', text: '', photo: '' };
  const form = h(`<form class="form" onsubmit="return false">
    <div class="row2"><label>${t('notes.cat')}<select name="cat">${NOTE_CATS.map(c => `<option value="${c}" ${c === n.cat ? 'selected' : ''}>${catIcon(c)} ${esc(t(`cat.${c}`))}</option>`).join('')}</select></label>
    <label>${t('notes.date')}<input type="date" name="date" value="${esc(n.date)}"></label></div>
    <label>${t('notes.text')}<textarea name="text" rows="4" maxlength="1000">${esc(n.text)}</textarea></label>
    <label>${t('notes.photo')}<input type="file" name="photo" accept="image/*" capture="environment"></label>
    <p class="hint">${n.lat.toFixed(5)}, ${n.lng.toFixed(5)}</p></form>`);
  openModal({
    title: existing ? t('notes.edit') : t('notes.new'), body: form,
    actions: [{ label: t('ui.cancel') }, { label: t('ui.save'), kind: 'primary', onClick: async () => {
      const fd = new FormData(form);
      n.cat = fd.get('cat'); n.date = fd.get('date') || todayIso(); n.text = (fd.get('text') || '').toString().trim();
      const file = form.querySelector('[name=photo]').files[0];
      if (file) { try { n.photo = await resizePhoto(file); } catch { toast(t('notes.photoErr'), 'error'); } }
      if (!existing) S.notes.push(n);
      saveNotes(); renderNotesLayer(); if (S.tab === 'notes') renderTab();
    } }],
  });
}

function renderNotesTab(body, f) {
  const list = S.notes.filter(n => n.fieldId === f.id).sort((a, b) => b.date.localeCompare(a.date));
  body.appendChild(h(`<div>
    <div class="ts-run"><button class="btn primary" id="noteAdd">＋ ${t('notes.add')}</button>
      <button class="btn" id="noteExport" ${list.length ? '' : 'disabled'}>${t('notes.export')}</button></div>
    <p class="muted small">${t('notes.intro')}</p>
    <ul class="notes">${list.map(n => `<li data-id="${n.id}">
      <div class="n-ic">${catIcon(n.cat)}</div>
      <div class="n-main"><b>${esc(t(`cat.${n.cat}`))}</b> <small>${fmtDate(n.date)}</small><p>${esc(n.text)}</p></div>
      ${n.photo ? `<img src="${n.photo}" alt="">` : ''}
      <div class="n-act"><button class="icon-btn sm" data-a="go" title="${esc(t('notes.zoom'))}">⌖</button><button class="icon-btn sm" data-a="edit" title="${esc(t('ui.edit'))}">✎</button><button class="icon-btn sm" data-a="del" title="${esc(t('ui.delete'))}">🗑</button></div>
    </li>`).join('') || `<li class="empty">${t('notes.empty')}</li>`}</ul></div>`));
  $('#noteAdd').onclick = () => setNoteMode(!S.noteMode);
  $('#noteExport').onclick = () => {
    const fc = { type: 'FeatureCollection', features: list.map(n => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [n.lng, n.lat] }, properties: { field: f.name, date: n.date, category: n.cat, text: n.text } })) };
    download(`${slug(f.name)}_scouting.geojson`, fc, 'application/geo+json');
  };
  body.querySelectorAll('.notes li[data-id]').forEach(li => li.addEventListener('click', async (e) => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    const n = S.notes.find(x => x.id === li.dataset.id); if (!n) return;
    if (a === 'del') { if (await confirmBox(t('notes.confirmDel'), t('ui.delete'))) { S.notes = S.notes.filter(x => x.id !== n.id); saveNotes(); renderNotesLayer(); renderTab(); } }
    else if (a === 'edit') noteDialog(n, n);
    else { mv.flyTo(n.lat, n.lng, Math.max(mv.getZoom(), 17)); }
  }));
}

// ---------------------------------------------------------------- import / export
function fieldsGeoJSON(list) {
  return { type: 'FeatureCollection', features: list.map(f => ({ type: 'Feature', geometry: f.geometry, properties: { id: f.id, name: f.name, crop: f.crop, variety: f.variety, sowing: f.sowing, harvest: f.harvest, owner: f.owner, area_ha: +(f.areaM2 / 10000).toFixed(3), location: f.location } })) };
}

function propName(p, i) {
  if (!p) return null;
  for (const k of ['name', 'Name', 'NAME', 'field', 'Field', 'FIELD', 'field_name', 'FIELD_NAME', 'title', 'id', 'ID']) if (p[k] != null && String(p[k]).trim()) return String(p[k]).trim();
  return null;
}

async function importFiles(files) {
  let added = 0, skipped = 0;
  for (const file of files) {
    try {
      let fcs = [];
      const name = file.name.toLowerCase();
      if (name.endsWith('.zip')) {
        await loadScript('https://unpkg.com/shpjs@4.0.4/dist/shp.js');
        const out = await globalThis.shp(await file.arrayBuffer());
        fcs = Array.isArray(out) ? out : [out];
      } else if (name.endsWith('.kml')) {
        await loadScript('https://unpkg.com/@mapbox/togeojson@0.16.2/togeojson.js');
        const xml = new DOMParser().parseFromString(await file.text(), 'text/xml');
        fcs = [globalThis.toGeoJSON.kml(xml)];
      } else {
        const j = JSON.parse(await file.text());
        if (j.app === 'srae-monitor') { const r = store.restore(j); S.fields = store.getFields(); S.notes = store.getNotes(); S.settings = store.getSettings(); toast(t('msg.restored', r), 'ok'); added += 0; continue; }
        fcs = [j.type === 'FeatureCollection' ? j : j.type === 'Feature' ? { type: 'FeatureCollection', features: [j] } : { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: j, properties: {} }] }];
      }
      for (const fc of fcs) for (const ft of fc.features || []) {
        const g = geo.toAreal(ft.geometry);
        if (!g) { skipped++; continue; }
        const p = ft.properties || {};
        const f = addField(g, { name: propName(p) || undefined, crop: p.crop, sowing: p.sowing, harvest: p.harvest, variety: p.variety, owner: p.owner });
        if (f) added++; else skipped++;
        if (added > 500) break;
      }
    } catch (e) {
      console.error(e); toast(t('msg.importFail', { name: file.name }), 'error', 7000);
    }
  }
  renderFieldLayers(); renderFieldList(); renderNotesLayer();
  if (added) { toast(t('msg.imported', { n: added }) + (skipped ? ` ${t('msg.skipped', { n: skipped })}` : ''), 'ok'); fitAllFields(16); }
  else if (skipped) toast(t('msg.noPolygons'), 'warn');
}

function addDemoField() {
  // A rice field block in Battambang province (wet-season rice).
  const g = { type: 'Polygon', coordinates: [[[103.1352, 13.0905], [103.1418, 13.0909], [103.1421, 13.0861], [103.1356, 13.0856], [103.1352, 13.0905]]] };
  const y = new Date().getFullYear();
  const f = addField(g, { name: t('demo.name'), crop: 'rice_wet', sowing: `${y}-07-10`, variety: 'Phka Rumduol' });
  if (!f) return;
  renderFieldLayers(); renderFieldList(); selectField(f.id);
}

// ---------------------------------------------------------------- report
async function makeReport() {
  const f = selField(); if (!f) return;
  const sc = S.scenes[S.sceneIdx];
  let mapImg = null;
  if (S.result) mapImg = reportCanvas().toDataURL('image/png');
  let wx = null;
  try { const w = await S.weather.get(f.id); if (w) wx = { ...weatherSummary(w), acc: accumulate(w.days, f.sowing && f.sowing <= w.today ? f.sowing : w.days[0].date, S.settings.gddBase).filter(a => !a.forecast).pop() }; } catch { /* no weather */ }
  const chart = getChart('index');
  const recs = latestTs(f.id, tsIndex()).slice(0, 12);
  openReport({
    t, fmtDate, field: f, area: geo.fmtArea(f.areaM2), crop: cropName(f.crop), index: S.index, indexName: indexName(S.index),
    scene: sc, result: S.result, mapImg, mapIsZones: !!(S.showZones && S.zones), mapTitle: compareActive() ? `${t('cmp.title', { idx: S.index })} (${fmtDate(S.scenes[S.compare.idx].date)} → ${sc ? fmtDate(sc.date) : ''})` : null,
    stage: (() => { const gs = growthStage(f.crop, f.sowing, f.harvest, todayIso()); return gs ? stageSummary(gs) : null; })(), chartImg: chart ? chart.toBase64Image() : null, wx, gddBase: S.settings.gddBase,
    zones: S.zones, zoneColors: S.zones ? zoneColors(S.zones.n).map(c => cssColor(c)) : null,
    recs, notes: S.notes.filter(n => n.fieldId === f.id), pixelHa: S.grid.pixelAreaM2 / 10000,
    colorFor: (v) => cssColor(valueColor(tsIndex(), v)),
  });
}

function reportCanvas() {
  const g = S.grid; const src = currentCanvas();
  const k = Math.max(1, Math.floor(600 / Math.max(g.W, g.H)));
  const c = document.createElement('canvas'); c.width = g.W * k + 20; c.height = g.H * k + 20;
  const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.imageSmoothingEnabled = false; ctx.drawImage(src, 10, 10, g.W * k, g.H * k);
  ctx.strokeStyle = '#222'; ctx.lineWidth = 1.5;
  for (const r of geo.rings(selField().geometry)) {
    ctx.beginPath();
    r.forEach(([x, y], i) => { const px = 10 + (x - g.west) / g.dLon * k, py = 10 + (g.north - y) / g.dLat * k; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
    ctx.closePath(); ctx.stroke();
  }
  return c;
}

// ---------------------------------------------------------------- settings & help
function settingsDialog() {
  const s = S.settings;
  const form = h(`<form class="form" onsubmit="return false">
    <div class="row2">
      <label>${t('set.maxCloud')}<input type="number" name="maxCloud" min="0" max="100" value="${s.maxCloud}"></label>
      <label>${t('set.lookback')}<input type="number" name="lookbackDays" min="30" max="1500" value="${s.lookbackDays}"></label>
    </div>
    <div class="row2">
      <label>${t('set.tsMax')}<input type="number" name="tsMaxScenes" min="5" max="300" value="${s.tsMaxScenes}"></label>
      <label>${t('set.tsMinClear')}<input type="number" name="tsMinClear" min="10" max="100" value="${s.tsMinClear}"></label>
    </div>
    <div class="row2">
      <label>${t('set.gddBase')}<input type="number" name="gddBase" min="0" max="20" step="0.5" value="${s.gddBase}"></label>
      <label>${t('set.collection')}<select name="collection">
        <option value="sentinel-2-l2a" ${s.collection === 'sentinel-2-l2a' ? 'selected' : ''}>Sentinel-2 L2A</option>
        <option value="sentinel-2-c1-l2a" ${s.collection === 'sentinel-2-c1-l2a' ? 'selected' : ''}>Sentinel-2 L2A Collection 1</option></select></label>
    </div>
    <div class="danger-zone"><button type="button" class="btn sm" id="clrTs">${t('set.clearCache')}</button>
      <button type="button" class="btn sm" id="bk">${t('set.backup')}</button>
      <button type="button" class="btn sm" id="rs">${t('set.restore')}</button>
      <button type="button" class="btn sm danger" id="wipe">${t('set.wipe')}</button></div>
  </form>`);
  openModal({
    title: t('set.title'), body: form,
    actions: [{ label: t('ui.cancel') }, { label: t('ui.save'), kind: 'primary', onClick: () => {
      const fd = new FormData(form);
      for (const k of ['maxCloud', 'lookbackDays', 'tsMaxScenes', 'tsMinClear', 'gddBase']) { const v = parseFloat(fd.get(k)); if (Number.isFinite(v)) s[k] = v; }
      const coll = fd.get('collection'); const changed = coll !== s.collection; s.collection = coll;
      store.saveSettings(s);
      if (changed) { store.clearTs(); S.resultCache.clear(); }
      if (S.sel) selectField(S.sel, { force: true }); else renderFieldList();
    } }],
  });
  $('#clrTs').onclick = () => { store.clearTs(); S.resultCache.clear(); toast(t('msg.cacheCleared'), 'ok'); };
  $('#bk').onclick = () => download(`srae-monitor-backup-${todayIso()}.json`, store.backup());
  $('#rs').onclick = () => $('#fileImport').click();
  $('#wipe').onclick = async () => {
    if (!(await confirmBox(t('set.wipeConfirm'), t('set.wipe')))) return;
    S.fields = []; S.notes = []; saveFields(); saveNotes(); store.clearTs();
    showList(); renderFieldLayers(); renderFieldList(); renderNotesLayer();
  };
}

function helpDialog() { openModal({ title: t('help.title'), body: `<div class="help">${helpHtml()}</div>`, wide: true, actions: [{ label: t('ui.close'), kind: 'primary' }] }); }

// ---------------------------------------------------------------- index select & toolbar
function renderIndexSelect() {
  const sel = $('#indexSelect');
  sel.innerHTML = INDEX_ORDER.map(k => `<option value="${k}">${esc(indexName(k))}</option>`).join('');
  sel.value = S.index;
  sel.title = t(`idxd.${S.index}`);
}

$('#indexSelect').addEventListener('change', (e) => {
  S.index = e.target.value;
  e.target.title = t(`idxd.${S.index}`);
  S.showZones = false;
  if (S.index === 'TRUE' && S.compare.on) setCompare(false);
  updateTimelineValues();
  if (S.sceneIdx >= 0) showScene(S.sceneIdx);
  if (S.tab === 'chart' || S.tab === 'zones') renderTab();
});
$('#opacity').addEventListener('input', (e) => { S.settings.opacity = +e.target.value; mv.setOverlayOpacity(S.settings.opacity); });
$('#opacity').addEventListener('change', () => store.saveSettings(S.settings));
$('#basemapSelect').addEventListener('change', (e) => setBasemap(e.target.value));
$('#tlPrev').addEventListener('click', () => { if (S.sceneIdx < S.scenes.length - 1) showScene(S.sceneIdx + 1); });
$('#tlNext').addEventListener('click', () => { if (S.sceneIdx > 0) showScene(S.sceneIdx - 1); });


// ---------------------------------------------------------------- compare two dates (change map)
const DIFF_RAMP = [[0, [127, 39, 4]], [0.25, [217, 95, 14]], [0.42, [254, 217, 142]], [0.5, [246, 245, 238]], [0.58, [199, 233, 192]], [0.75, [65, 171, 93]], [1, [0, 90, 50]]];
const DIFF_CLASSES = [[-Infinity, -0.2, 'strongDec'], [-0.2, -0.1, 'dec'], [-0.1, -0.03, 'slightDec'], [-0.03, 0.03, 'stable'], [0.03, 0.1, 'slightInc'], [0.1, 0.2, 'inc'], [0.2, Infinity, 'strongInc']];
const diffColor = (d) => rampColor(DIFF_RAMP, (d + 0.3) / 0.6);
const compareActive = () => !!(S.compare.on && S.compare.diff && S.compare.idx >= 0 && S.scenes[S.compare.idx]);

function defaultCompareIdx() {
  const cache = store.getTs(S.sel, S.index);
  const cur = S.scenes[S.sceneIdx];
  for (let j = S.sceneIdx + 1; j < S.scenes.length; j++) {
    const r = cache[S.scenes[j].id];
    if (r && r.valid >= 0.7 && daysBetween(S.scenes[j].date, cur.date) >= 5) return j;
  }
  for (let j = S.sceneIdx + 1; j < S.scenes.length; j++) if ((S.scenes[j].cloud ?? 100) < 30) return j;
  return S.sceneIdx + 1 < S.scenes.length ? S.sceneIdx + 1 : -1;
}

async function updateCompare() {
  S.compare.diff = null;
  if (!S.compare.on || !S.result || S.index === 'TRUE') return;
  let j = S.compare.idx;
  if (j < 0 || j === S.sceneIdx || !S.scenes[j]) j = defaultCompareIdx();
  S.compare.idx = j;
  if (j < 0) return;
  const r0 = await getResult(S.scenes[j], S.index);
  const r1 = S.result;
  const n = r1.values.length;
  const values = new Float32Array(n).fill(NaN);
  const status = new Uint8Array(n);
  let valid = 0, sum = 0;
  const counts = DIFF_CLASSES.map(() => 0);
  for (let i = 0; i < n; i++) {
    const a = r1.status[i], b = r0.status[i];
    if (!a) continue;
    if (a === 1 && b === 1) {
      const d = r1.values[i] - r0.values[i];
      values[i] = d; status[i] = 1; valid++; sum += d;
      counts[DIFF_CLASSES.findIndex(([lo, hi]) => d >= lo && d < hi)]++;
    } else status[i] = (a === 2 || b === 2) ? 2 : 3;
  }
  S.compare.diff = { values, status, rgb: null, indexKey: S.index, valid, mean: valid ? sum / valid : NaN, counts };
}

function compareLegendBody() {
  if (S.index === 'TRUE') return `<p class="muted small">${t('cmp.trueColor')}</p>`;
  const d = S.compare.diff;
  const opts = S.scenes.map((sc, j) => j === S.sceneIdx ? '' : `<option value="${j}" ${j === S.compare.idx ? 'selected' : ''}>${fmtDate(sc.date)} · ☁ ${Math.round(sc.cloud ?? 0)}%</option>`).join('');
  const pick = `<label class="cmp-pick">${t('cmp.with')}<select id="cmpWith">${opts}</select></label>`;
  if (!d) return pick;
  if (!d.valid) return `${pick}<p class="muted small">${t('cmp.noOverlap')}</p>`;
  const ha = S.grid.pixelAreaM2 / 10000;
  const max = Math.max(...d.counts, 1);
  const rows = DIFF_CLASSES.map(([lo, hi, key], k) => {
    const mid = Number.isFinite(lo) && Number.isFinite(hi) ? (lo + hi) / 2 : (Number.isFinite(lo) ? lo + 0.05 : hi - 0.05);
    return `<tr><td><i style="background:${cssColor(diffColor(mid))}"></i>${t(`cmp.${key}`)}</td>
      <td class="bar"><span style="width:${(100 * d.counts[k] / max).toFixed(0)}%"></span></td>
      <td>${(d.counts[k] * ha).toFixed(2)} ${t('unit.ha')}</td><td>${((100 * d.counts[k]) / d.valid).toFixed(0)}%</td></tr>`;
  }).reverse().join('');
  const m = d.mean;
  return `${pick}<div class="ramp" style="background:linear-gradient(90deg, ${DIFF_RAMP.map(([p, c]) => `${cssColor(c)} ${p * 100}%`).join(', ')})"></div>
    <div class="ramp-l"><span>−0.3</span><span>0</span><span>+0.3</span></div>
    <div class="lg-stats"><span>${t('cmp.mean')} <b class="${m > 0.03 ? 'up' : m < -0.03 ? 'down' : ''}">${m > 0 ? '+' : ''}${m.toFixed(3)}</b></span></div>
    <table class="bins">${rows}</table>`;
}

async function setCompare(on) {
  S.compare.on = on;
  $('#btnCompare').classList.toggle('active', on);
  $('#btnCompare').setAttribute('aria-pressed', on);
  if (on && S.index === 'TRUE') { toast(t('cmp.trueColor'), 'warn'); }
  if (on) S.showZones = false;
  if (!S.result) return;
  if (on) { setMapLoading(true); try { await updateCompare(); } catch (e) { console.error(e); toast(t('scenes.loadError'), 'error'); } finally { setMapLoading(false); } }
  drawResult(); renderLegend();
}

// ---------------------------------------------------------------- GeoTIFF export of the visible layer
function exportGeoTiff() {
  const f = selField(); const r = S.result; const g = S.grid; const sc = S.scenes[S.sceneIdx];
  if (!f || !r || !sc) return;
  const base = { width: g.W, height: g.H, west: g.west, north: g.north, dLon: g.dLon, dLat: g.dLat };
  let buf, name;
  if (S.showZones && S.zones) {
    const z = new Float32Array(g.W * g.H).map((_, i) => S.zones.cls[i] || NaN);
    buf = writeGeoTiff({ ...base, bands: [z], nodata: 'nan' }); name = `${slug(f.name)}_zones_${sc.date}.tif`;
  } else if (compareActive()) {
    buf = writeGeoTiff({ ...base, bands: [S.compare.diff.values], nodata: 'nan' });
    name = `${slug(f.name)}_${S.index}_change_${S.scenes[S.compare.idx].date}_${sc.date}.tif`;
  } else if (r.rgb) {
    const n = g.W * g.H; const bands = [0, 1, 2].map(b => new Uint8Array(n).map((_, i) => r.status[i] === 1 ? r.rgb[i * 3 + b] : 0));
    buf = writeGeoTiff({ ...base, bands, type: 'uint8', nodata: '0' }); name = `${slug(f.name)}_truecolor_${sc.date}.tif`;
  } else {
    buf = writeGeoTiff({ ...base, bands: [r.values], nodata: 'nan' }); name = `${slug(f.name)}_${S.index}_${sc.date}.tif`;
  }
  download(name, new Blob([buf], { type: 'image/tiff' }));
}

// ---------------------------------------------------------------- growth stage
function stageSummary(gs) {
  if (gs.day < 0) return t('stage.beforeSowing', { n: -gs.day });
  if (gs.current >= gs.stages.length) return t('stage.done');
  return `${t(`stage.${gs.stages[gs.current].key}`)} · ${t('stage.day', { n: gs.day })}`;
}

function stageCard(f) {
  if (!f.sowing) return STAGE_CROPS.has(f.crop) ? `<div class="card"><h3>${t('stage.title')}</h3><p class="muted small">${t('stage.noSowing')} <button class="link" data-act="edit">${t('ov.setSowing')}</button></p></div>` : '';
  const gs = growthStage(f.crop, f.sowing, f.harvest, todayIso());
  if (!gs) return '';
  const pos = Math.max(0, Math.min(100, (100 * gs.day) / gs.total));
  const toHarvest = daysBetween(todayIso(), gs.harvestIso);
  return `<div class="card stage"><h3>${t('stage.title')}</h3>
    <p class="stage-now"><b>${esc(stageSummary(gs))}</b></p>
    <div class="stage-bar" role="img" aria-label="${esc(stageSummary(gs))}">
      ${gs.stages.map((s, i) => `<span class="seg ${i === gs.current ? 'cur' : ''}" style="flex:${Math.max(s.end - s.start, 1)};background:${STAGE_COLORS[s.key]}" title="${esc(t(`stage.${s.key}`))}: ${s.start}–${s.end}"></span>`).join('')}
      ${gs.day >= 0 ? `<i class="today" style="left:${pos}%"></i>` : ''}
    </div>
    <div class="stage-legend">${gs.stages.map((s, i) => `<span class="${i === gs.current ? 'cur' : ''}"><i style="background:${STAGE_COLORS[s.key]}"></i>${t(`stage.${s.key}`)}</span>`).join('')}</div>
    <p class="muted small">${f.harvest ? t('field.harvest') + ': ' + fmtDate(f.harvest) : t('stage.expected', { d: fmtDate(gs.harvestIso) })}${toHarvest > 0 ? ` (${t('ov.inDays', { n: toHarvest })})` : ''} · ${t('stage.note')}</p></div>`;
}
const STAGE_CROPS = new Set(['rice_wet', 'rice_dry', 'maize', 'soybean', 'mungbean', 'cassava', 'sugarcane', 'vegetables']);

// ---------------------------------------------------------------- place search, location, full screen
function parseLatLon(q) {
  const m = q.trim().match(/^(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)$/);
  if (!m) return null;
  let a = +m[1], b = +m[2];
  if (Math.abs(a) > 90 && Math.abs(b) <= 90) [a, b] = [b, a];
  if (Math.abs(a) > 90 || Math.abs(b) > 180) return null;
  return [a, b];
}

function showSearchPin(lat, lon, label) {
  mv.clearPins();
  mv.addPin(lat, lon, { kind: 'search', label: label || `${lat.toFixed(5)}, ${lon.toFixed(5)}` });
}

async function placeSearch(q) {
  const list = $('#placeResults');
  q = q.trim(); if (!q) { list.hidden = true; return; }
  const ll = parseLatLon(q);
  if (ll) { mv.flyTo(ll[0], ll[1], 16); showSearchPin(ll[0], ll[1]); list.hidden = true; return; }
  list.innerHTML = `<li class="muted"><span class="spinner"></span></li>`; list.hidden = false;
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&q=${encodeURIComponent(q)}&accept-language=${getLang() === 'km' ? 'km,en' : 'en'}`);
    const res = r.ok ? await r.json() : [];
    if (!res.length) { list.innerHTML = `<li class="muted">${t('map.noResults')}</li>`; return; }
    list.innerHTML = '';
    for (const p of res) {
      const li = h(`<li tabindex="0">${esc(p.display_name)}</li>`);
      const go = () => {
        list.hidden = true;
        const bb = p.boundingbox && p.boundingbox.map(Number);
        if (bb && bb[1] - bb[0] > 0.002) mv.fitBox([bb[2], bb[0], bb[3], bb[1]], { maxZoom: 16, duration: 1600 });
        else mv.flyTo(+p.lat, +p.lon, 16);
        showSearchPin(+p.lat, +p.lon, p.display_name);
      };
      li.addEventListener('click', go); li.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
      list.appendChild(li);
    }
  } catch { list.innerHTML = `<li class="muted">${t('map.noResults')}</li>`; }
}

function locateMe() {
  if (!navigator.geolocation) return toast(t('map.locError'), 'error');
  const btn = $('#btnLocate'); btn.classList.add('busy');
  navigator.geolocation.getCurrentPosition((pos) => {
    btn.classList.remove('busy');
    const { latitude: lat, longitude: lon, accuracy } = pos.coords;
    mv.clearPins();
    mv.addPin(lat, lon, { kind: 'gps', label: `±${Math.round(accuracy)} m` });
    mv.flyTo(lat, lon, Math.max(mv.getZoom(), 16));
  }, () => { btn.classList.remove('busy'); toast(t('map.locError'), 'error'); }, { enableHighAccuracy: true, timeout: 15000 });
}

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.();
}
document.addEventListener('fullscreenchange', () => { $('#btnFull').classList.toggle('active', !!document.fullscreenElement); setTimeout(() => mv.resize(), 150); });
if (!document.documentElement.requestFullscreen) $('#btnFull').hidden = true;

$('#placeSearch').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); placeSearch(e.target.value); } if (e.key === 'Escape') $('#placeResults').hidden = true; });
$('#placeGo').addEventListener('click', () => placeSearch($('#placeSearch').value));
document.addEventListener('click', (e) => { if (!e.target.closest('.map-search')) $('#placeResults').hidden = true; });
$('#btnLocate').addEventListener('click', locateMe);
$('#btnFull').addEventListener('click', toggleFullscreen);
$('#btnCompare').addEventListener('click', () => setCompare(!S.compare.on));

// ---------------------------------------------------------------- check all fields (latest NDVI for every field)
async function checkAllFields() {
  if (S.checkAll || !S.fields.length) return;
  const run = { stop: false };
  S.checkAll = run;
  const btn = $('#btnCheckAll'); btn.disabled = true;
  const foot = $('#listFoot');
  const end = new Date(), start = new Date(Date.now() - 45 * DAY);
  let done = 0, updated = 0;
  try {
    for (const f of S.fields.slice()) {
      if (run.stop) break;
      foot.innerHTML = `<span class="spinner"></span> ${esc(t('fields.checking', { done, total: S.fields.length, name: f.name }))}`;
      try {
        const scenes = (await searchScenes(f.geometry, { start, end, maxCloud: 80, collection: S.settings.collection })).slice(0, 5);
        const cache = store.getTs(f.id, 'NDVI');
        const grid = geo.makeGrid(f.geometry);
        for (const sc of scenes) {
          let rec = cache[sc.id];
          if (!rec) {
            const r = await processScene(grid, sc, 'NDVI');
            rec = { date: sc.date, mean: r.stats ? r.stats.mean : NaN, p10: r.stats?.p10, p90: r.stats?.p90, std: r.stats?.std, valid: r.validFrac, cloud: r.cloudFrac };
            store.putTs(f.id, 'NDVI', sc.id, rec);
          }
          if (rec.valid >= 0.6 && Number.isFinite(rec.mean)) { updated++; break; }
        }
      } catch (e) { console.warn('check failed', f.name, e); }
      done++;
      renderFieldList();
    }
    toast(t('fields.checkDone', { n: updated, total: S.fields.length }), 'ok');
  } finally {
    S.checkAll = null; btn.disabled = false;
    renderFieldList();
  }
}

// ---------------------------------------------------------------- 3D terrain
function toggle3D() {
  S.is3D = !S.is3D;
  mv.set3D(S.is3D);
  $('#btn3D').classList.toggle('active', S.is3D);
  $('#btn3D').setAttribute('aria-pressed', S.is3D);
  if (S.is3D) toast(t('map.tip3d'), 'info', 5000);
}
$('#btn3D').addEventListener('click', toggle3D);
$('#btnMeasure').addEventListener('click', () => (S.measure ? stopMeasure() : startMeasure()));
$('#btnCheckAll').addEventListener('click', checkAllFields);
$('#fieldSort').addEventListener('change', (e) => { S.settings.sort = e.target.value; store.saveSettings(S.settings); renderFieldList(); });

// ---------------------------------------------------------------- wiring
$('#btnDraw').addEventListener('click', startDraw);
$('#btnImport').addEventListener('click', () => $('#fileImport').click());
$('#btnDemo').addEventListener('click', addDemoField);
$('#btnExportAll').addEventListener('click', () => { if (!S.fields.length) return toast(t('msg.noFields'), 'warn'); download(`fields_${todayIso()}.geojson`, fieldsGeoJSON(S.fields), 'application/geo+json'); });
$('#btnBackup').addEventListener('click', () => download(`srae-monitor-backup-${todayIso()}.json`, store.backup()));
$('#fileImport').addEventListener('change', async (e) => { const files = [...e.target.files]; e.target.value = ''; closeModal(); if (files.length) await importFiles(files); });
$('#fieldSearch').addEventListener('input', renderFieldList);
$$('.menu-list button').forEach(b => b.addEventListener('click', () => b.closest('details').removeAttribute('open')));
document.addEventListener('click', (e) => { $$('details.menu[open]').forEach(d => { if (!d.contains(e.target)) d.removeAttribute('open'); }); });
$('#btnBack').addEventListener('click', showList);
$('#btnEditField').addEventListener('click', () => { const f = selField(); if (f) editFieldDialog(f); });
$('#btnZoomField').addEventListener('click', zoomToField);
$('#tabs').addEventListener('click', (e) => { const b = e.target.closest('button[data-tab]'); if (b) setTab(b.dataset.tab); });
$('#btnHelp').addEventListener('click', helpDialog);
$('#btnSettings').addEventListener('click', settingsDialog);
$('#editSave').addEventListener('click', () => finishEditShape(true));
$('#editCancel').addEventListener('click', () => finishEditShape(false));
$('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal' || e.target.closest('[data-close]')) closeModal(); });
document.addEventListener('keydown', (e) => {
  const typing = /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement?.tagName || '');
  if (!typing && $('#modal').hidden && S.sel && S.scenes.length) {
    if (e.key === 'ArrowLeft' && S.sceneIdx < S.scenes.length - 1) { e.preventDefault(); showScene(S.sceneIdx + 1); return; }
    if (e.key === 'ArrowRight' && S.sceneIdx > 0) { e.preventDefault(); showScene(S.sceneIdx - 1); return; }
  }
  if (e.key !== 'Escape') return;
  if (!$('#modal').hidden) closeModal(); else stopModes();
});
$('#langSelect').addEventListener('change', (e) => { setLang(e.target.value); store.saveLang(e.target.value); refreshLanguage(); });

// drag & drop import onto the map
const mapWrap = $('.map-wrap');
mapWrap.addEventListener('dragover', (e) => { e.preventDefault(); mapWrap.classList.add('drop'); });
mapWrap.addEventListener('dragleave', () => mapWrap.classList.remove('drop'));
mapWrap.addEventListener('drop', (e) => { e.preventDefault(); mapWrap.classList.remove('drop'); if (e.dataTransfer.files.length) importFiles([...e.dataTransfer.files]); });

function refreshLanguage() {
  applyI18n(document);
  renderIndexSelect();
  renderFieldList();
  if (S.sel) { renderFieldHeader(); renderTab(); renderTimeline(); renderLegend(); }
  renderNotesLayer();
}

// ---------------------------------------------------------------- boot
(function boot() {
  const lang = store.getLang();
  setLang(lang);
  $('#langSelect').value = lang;
  applyI18n(document);
  renderIndexSelect();
  $('#opacity').value = S.settings.opacity;
  $('#fieldSort').value = S.settings.sort || 'name';
  setBasemap(S.settings.basemap);
  renderFieldLayers();
  renderFieldList();
  renderNotesLayer();
  if (S.fields.length) fitAllFields();
  if (!globalThis.GeoTIFF || !globalThis.maplibregl) toast(t('msg.libFail'), 'error', 10000);
  const hash = new URLSearchParams(location.hash.slice(1));
  if (hash.get('field') && fieldById(hash.get('field'))) selectField(hash.get('field'));
})();
