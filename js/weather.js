// Weather from Open-Meteo (free, no key, CORS enabled):
//  - forecast API: last 30 days + 14-day forecast, soil moisture
//  - archive API (ERA5): longer history back to the sowing date

const FORECAST = 'https://api.open-meteo.com/v1/forecast';
const ARCHIVE = 'https://archive-api.open-meteo.com/v1/archive';
const DAILY = 'temperature_2m_max,temperature_2m_min,precipitation_sum,et0_fao_evapotranspiration';

import { getJsonRetry, fetchRetry, rateQueue } from './net.js';

const iso = (d) => d.toISOString().slice(0, 10);

const getJson = (url, signal) => getJsonRetry(url, { signal }, 'Open-Meteo');

// Nominatim allows 1 request per second for the whole site, so calls from this browser are queued
// and answers cached. Inside Cambodia the app names places from its own commune file instead (admin.js).
export const nominatimQueue = rateQueue(1100);
const placeCache = new Map();

function dailyRows(json, forecastFrom) {
  const d = json.daily || {};
  return (d.time || []).map((t, i) => ({
    date: t,
    tmax: d.temperature_2m_max?.[i] ?? null,
    tmin: d.temperature_2m_min?.[i] ?? null,
    rain: d.precipitation_sum?.[i] ?? null,
    et0: d.et0_fao_evapotranspiration?.[i] ?? null,
    forecast: forecastFrom ? t >= forecastFrom : false,
  }));
}

/**
 * Daily weather from `start` (Date) to today + 14 days.
 * Returns { days: [...], soil: [{date, sm}], today }
 */
export async function getWeather(lat, lon, start, { signal } = {}) {
  const now = new Date();
  const today = iso(now);
  const q = `latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&timezone=auto`;
  const fc = await getJson(`${FORECAST}?${q}&daily=${DAILY}&hourly=soil_moisture_3_to_9cm&past_days=31&forecast_days=14`, signal);
  let days = dailyRows(fc, today);

  const firstFc = days.length ? days[0].date : today;
  if (start && iso(start) < firstFc) {
    const end = new Date(Date.parse(firstFc) - 86400000);
    const archEnd = new Date(Math.min(end.getTime(), now.getTime() - 6 * 86400000));
    if (iso(start) <= iso(archEnd)) {
      try {
        const ar = await getJson(`${ARCHIVE}?${q}&daily=${DAILY}&start_date=${iso(start)}&end_date=${iso(archEnd)}`, signal);
        const old = dailyRows(ar, null).filter(r => r.date < firstFc);
        days = old.concat(days);
      } catch (e) { console.warn('archive weather failed', e); }
    }
  }

  // Hourly soil moisture -> daily mean
  const soil = [];
  const h = fc.hourly || {};
  const acc = new Map();
  (h.time || []).forEach((t, i) => {
    const v = h.soil_moisture_3_to_9cm?.[i];
    if (v == null) return;
    const d = t.slice(0, 10);
    const a = acc.get(d) || [0, 0]; a[0] += v; a[1]++; acc.set(d, a);
  });
  for (const [date, [s, c]] of acc) soil.push({ date, sm: s / c, forecast: date >= today });
  return { days, soil, today, elevation: fc.elevation, tz: fc.timezone };
}

/** Growing degree days with base temperature `base` (°C), capped at 30 °C for Tmax. */
export function gdd(day, base = 10, cap = 30) {
  if (day.tmax == null || day.tmin == null) return 0;
  const tmax = Math.max(Math.min(day.tmax, cap), base);
  const tmin = Math.max(Math.min(day.tmin, cap), base);
  return Math.max(0, (tmax + tmin) / 2 - base);
}

/** Accumulations from a start date (inclusive) up to and including today (observed only). */
export function accumulate(days, startIso, base = 10) {
  let g = 0, r = 0, e = 0;
  const series = [];
  for (const d of days) {
    if (d.date < startIso) continue;
    g += gdd(d, base); r += d.rain || 0; e += d.et0 || 0;
    series.push({ date: d.date, gdd: g, rain: r, et0: e, forecast: d.forecast });
  }
  return series;
}

export async function getElevation(lat, lon) {
  try {
    const j = await getJson(`https://api.open-meteo.com/v1/elevation?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}`);
    return Array.isArray(j.elevation) ? j.elevation[0] : null;
  } catch { return null; }
}

/** Reverse-geocode to a short "district, province" style label (OpenStreetMap Nominatim). */
export async function getPlaceName(lat, lon, lang = 'en') {
  const key = `${lat.toFixed(3)},${lon.toFixed(3)},${lang}`;
  if (placeCache.has(key)) return placeCache.get(key);
  try {
    const r = await nominatimQueue(() => fetchRetry(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat.toFixed(5)}&lon=${lon.toFixed(5)}&zoom=12&accept-language=${lang === 'km' ? 'km,en' : 'en'}`, {}, { retries: 2, base: 2000 }));
    if (!r.ok) return null;
    const j = await r.json();
    const a = j.address || {};
    const parts = [a.village || a.hamlet || a.suburb, a.county || a.city_district || a.district || a.town || a.city, a.state || a.province, a.country]
      .filter(Boolean);
    const label = [...new Set(parts)].join(', ') || j.display_name || null;
    placeCache.set(key, label);
    return label;
  } catch { return null; }
}
