// Chart.js wrappers using a linear time axis (no date adapter needed).

import { fmtDate } from './i18n.js';

const charts = new Map();

function css(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export function destroyChart(id) {
  const c = charts.get(id);
  if (c) { c.destroy(); charts.delete(id); }
}

export function getChart(id) { return charts.get(id); }

const DAY = 86400000;
export const ts = (iso) => Date.parse(`${iso}T00:00:00Z`);

/** Vertical marker lines, e.g. sowing date or "today". */
const markerPlugin = {
  id: 'markers',
  afterDatasetsDraw(chart, _args, opts) {
    const list = (opts && opts.lines) || [];
    const { ctx, chartArea, scales } = chart;
    if (!scales.x) return;
    ctx.save();
    for (const m of list) {
      const x = scales.x.getPixelForValue(m.x);
      if (x < chartArea.left || x > chartArea.right) continue;
      ctx.strokeStyle = m.color || '#888';
      ctx.setLineDash(m.dash || [4, 4]);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, chartArea.top); ctx.lineTo(x, chartArea.bottom); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = m.color || '#888';
      ctx.font = '11px Inter, "Noto Sans Khmer", sans-serif';
      ctx.fillText(m.label || '', Math.min(x + 4, chartArea.right - 60), chartArea.top + 12);
    }
    ctx.restore();
  },
};

/** Shaded forecast region from opts.from to the right edge. */
const shadePlugin = {
  id: 'shade',
  beforeDatasetsDraw(chart, _args, opts) {
    if (!opts || opts.from == null) return;
    const { ctx, chartArea, scales } = chart;
    const x = Math.max(scales.x.getPixelForValue(opts.from), chartArea.left);
    if (x >= chartArea.right) return;
    ctx.save();
    ctx.fillStyle = opts.color || 'rgba(120,120,120,0.08)';
    ctx.fillRect(x, chartArea.top, chartArea.right - x, chartArea.bottom - chartArea.top);
    ctx.restore();
  },
};

function baseOptions({ yTitle, y2Title, yMin, yMax, onClick } = {}) {
  const grid = css('--chart-grid', 'rgba(0,0,0,0.08)');
  const text = css('--muted', '#666');
  const o = {
    responsive: true, maintainAspectRatio: false, animation: false,
    interaction: { mode: 'nearest', intersect: false, axis: 'x' },
    plugins: {
      legend: { labels: { color: text, boxWidth: 12, font: { size: 11 } } },
      tooltip: {
        callbacks: {
          title: (items) => items.length ? fmtDate(new Date(items[0].parsed.x).toISOString().slice(0, 10)) : '',
        },
      },
    },
    scales: {
      x: {
        type: 'linear', grid: { color: grid },
        ticks: { color: text, maxRotation: 0, autoSkipPadding: 14, callback: (v) => fmtDate(new Date(v).toISOString().slice(0, 10), { day: 'numeric', month: 'short' }) },
      },
      y: { grid: { color: grid }, ticks: { color: text }, title: { display: !!yTitle, text: yTitle, color: text }, min: yMin, max: yMax },
    },
    onClick,
  };
  if (y2Title) o.scales.y2 = { position: 'right', grid: { drawOnChartArea: false }, ticks: { color: text }, title: { display: true, text: y2Title, color: text }, beginAtZero: true };
  return o;
}

export function makeChart(id, canvas, config) {
  destroyChart(id);
  const c = new Chart(canvas, { ...config, plugins: [markerPlugin, shadePlugin, ...(config.plugins || [])] });
  charts.set(id, c);
  return c;
}

/** Vegetation-index time series with p10–p90 band and optional previous-year comparison. */
export function indexChart(canvas, { label, points, prev, prevLabel, color, markers, yMin, yMax, onPoint }) {
  const band = 'rgba(46,125,79,0.14)';
  const datasets = [
    { label: 'p90', data: points.map(p => ({ x: p.x, y: p.p90 })), borderWidth: 0, pointRadius: 0, fill: false, backgroundColor: band, hidden: false },
    { label: 'p10', data: points.map(p => ({ x: p.x, y: p.p10 })), borderWidth: 0, pointRadius: 0, fill: '-1', backgroundColor: band },
    { label, data: points.map(p => ({ x: p.x, y: p.y, id: p.id })), borderColor: color, backgroundColor: color, pointRadius: 3.5, pointHoverRadius: 6, borderWidth: 2, tension: 0.3 },
  ];
  if (prev && prev.length) {
    datasets.push({ label: prevLabel, data: prev.map(p => ({ x: p.x, y: p.y })), borderColor: '#8a8f98', backgroundColor: '#8a8f98', borderDash: [5, 4], pointRadius: 2, borderWidth: 1.5, tension: 0.3 });
  }
  const opts = baseOptions({ yMin, yMax, onClick: (evt, els, chart) => {
    const el = els.find(e => e.datasetIndex === 2);
    if (el && onPoint) onPoint(chart.data.datasets[2].data[el.index]);
  } });
  opts.plugins.legend.labels.filter = (item) => item.text !== 'p10' && item.text !== 'p90';
  opts.plugins.markers = { lines: markers || [] };
  return makeChart('index', canvas, { type: 'line', data: { datasets }, options: opts });
}

export function weatherChart(canvas, { days, today, labels }) {
  const x = (d) => ts(d.date);
  const datasets = [
    { type: 'bar', label: labels.rain, data: days.map(d => ({ x: x(d), y: d.rain })), backgroundColor: days.map(d => d.forecast ? 'rgba(66,133,244,0.35)' : 'rgba(66,133,244,0.75)'), yAxisID: 'y2', barThickness: 'flex', maxBarThickness: 10 },
    { type: 'line', label: labels.tmax, data: days.map(d => ({ x: x(d), y: d.tmax })), borderColor: '#e0593c', backgroundColor: '#e0593c', pointRadius: 0, borderWidth: 2, tension: 0.3, yAxisID: 'y' },
    { type: 'line', label: labels.tmin, data: days.map(d => ({ x: x(d), y: d.tmin })), borderColor: '#f0a33a', backgroundColor: '#f0a33a', pointRadius: 0, borderWidth: 2, tension: 0.3, yAxisID: 'y' },
  ];
  const opts = baseOptions({ yTitle: '°C', y2Title: 'mm' });
  opts.plugins.shade = { from: ts(today) - DAY / 2 };
  opts.plugins.markers = { lines: [{ x: ts(today), label: labels.today, color: '#555' }] };
  return makeChart('weather', canvas, { type: 'bar', data: { datasets }, options: opts });
}

export function accumChart(canvas, { series, labels, today }) {
  const datasets = [
    { label: labels.gdd, data: series.map(s => ({ x: ts(s.date), y: Math.round(s.gdd) })), borderColor: '#d9822b', backgroundColor: '#d9822b', pointRadius: 0, borderWidth: 2, yAxisID: 'y' },
    { label: labels.rain, data: series.map(s => ({ x: ts(s.date), y: Math.round(s.rain) })), borderColor: '#3b7dd8', backgroundColor: '#3b7dd8', pointRadius: 0, borderWidth: 2, yAxisID: 'y2' },
  ];
  const opts = baseOptions({ yTitle: labels.gddUnit, y2Title: 'mm' });
  opts.plugins.shade = { from: ts(today) + DAY / 2 };
  return makeChart('accum', canvas, { type: 'line', data: { datasets }, options: opts });
}

export function soilChart(canvas, { soil, label, today }) {
  const datasets = [{ label, data: soil.map(s => ({ x: ts(s.date), y: +(s.sm * 100).toFixed(1) })), borderColor: '#7a5c3a', backgroundColor: 'rgba(122,92,58,0.15)', fill: true, pointRadius: 0, borderWidth: 2, tension: 0.3 }];
  const opts = baseOptions({ yTitle: '%' });
  opts.plugins.shade = { from: ts(today) - DAY / 2 };
  return makeChart('soil', canvas, { type: 'line', data: { datasets }, options: opts });
}
