// Persistence in the browser's localStorage (data stays on the user's device).

const KEY = {
  fields: 'srae.fields.v1',
  notes: 'srae.notes.v1',
  settings: 'srae.settings.v1',
  ts: 'srae.ts.v1',
  lang: 'srae.lang',
};

export const DEFAULT_SETTINGS = {
  maxCloud: 60,          // scene-level cloud filter for the timeline (%)
  lookbackDays: 365,     // how far back to list scenes
  collection: 'sentinel-2-l2a',
  tsMaxScenes: 60,       // cap on scenes processed for a time series
  tsMinClear: 50,        // % of field that must be cloud-free for a time-series point
  gddBase: 10,           // base temperature for growing degree days (°C)
  basemap: 'satellite',
  opacity: 0.9,
};

function read(k, fallback) {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function write(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); return true; }
  catch (e) { console.warn('storage full?', e); return false; }
}

export const store = {
  getFields: () => read(KEY.fields, []),
  saveFields: (f) => write(KEY.fields, f),
  getNotes: () => read(KEY.notes, []),
  saveNotes: (n) => write(KEY.notes, n),
  getSettings: () => ({ ...DEFAULT_SETTINGS, ...read(KEY.settings, {}) }),
  saveSettings: (s) => write(KEY.settings, s),
  getLang: () => { try { return localStorage.getItem(KEY.lang) || 'en'; } catch { return 'en'; } },
  saveLang: (l) => { try { localStorage.setItem(KEY.lang, l); } catch { /* ignore */ } },

  // Time-series cache: { "<fieldId>|<index>": { "<sceneId>": {date, mean, ...} } }
  getTs(fieldId, index) { return read(KEY.ts, {})[`${fieldId}|${index}`] || {}; },
  putTs(fieldId, index, sceneId, rec) {
    const all = read(KEY.ts, {});
    const k = `${fieldId}|${index}`;
    all[k] = all[k] || {};
    all[k][sceneId] = rec;
    if (!write(KEY.ts, all)) { // storage full: drop other fields' caches and retry
      for (const kk of Object.keys(all)) if (!kk.startsWith(`${fieldId}|`)) delete all[kk];
      write(KEY.ts, all);
    }
  },
  clearTs(fieldId) {
    const all = read(KEY.ts, {});
    for (const k of Object.keys(all)) if (!fieldId || k.startsWith(`${fieldId}|`)) delete all[k];
    write(KEY.ts, all);
  },

  backup() {
    return { app: 'srae-monitor', version: 1, exported: new Date().toISOString(), fields: this.getFields(), notes: this.getNotes(), settings: this.getSettings() };
  },
  restore(obj) {
    if (!obj || obj.app !== 'srae-monitor') throw new Error('Not a Srae Monitor backup file');
    const ids = new Set(this.getFields().map(f => f.id));
    const fields = this.getFields().concat((obj.fields || []).filter(f => !ids.has(f.id)));
    const nids = new Set(this.getNotes().map(n => n.id));
    const notes = this.getNotes().concat((obj.notes || []).filter(n => !nids.has(n.id)));
    this.saveFields(fields); this.saveNotes(notes);
    if (obj.settings) this.saveSettings({ ...this.getSettings(), ...obj.settings });
    return { fields: fields.length, notes: notes.length };
  },
};

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
