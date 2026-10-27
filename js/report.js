// Printable field report opened in a new tab (use the browser's "Save as PDF").

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function openReport(o) {
  const { t, fmtDate, field: f } = o;
  const w = window.open('', '_blank');
  if (!w) { alert(t('msg.popup')); return; }
  const r = o.result;
  const binsRows = r && r.bins ? r.bins.filter(b => b.count).reverse().map(b => `<tr><td>${b.lo <= -1 ? '&lt; ' + b.hi : `${b.lo} – ${b.hi}`}</td><td>${(b.count * o.pixelHa).toFixed(2)}</td><td>${((100 * b.count) / (r.valid || 1)).toFixed(0)}%</td></tr>`).join('') : '';
  const zonesRows = o.zones ? o.zones.stats.map((z, k) => `<tr><td><i style="background:${o.zoneColors[k]}"></i> ${z.zone}</td><td>${Number.isFinite(z.mean) ? z.mean.toFixed(3) : '—'}</td><td>${z.areaHa.toFixed(2)}</td><td>${z.pct.toFixed(0)}%</td><td>${esc(o.zones.rates[k] || '')}</td></tr>`).join('') : '';
  const lang = document.documentElement.lang || 'en';
  w.document.write(`<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><title>${esc(f.name)} — ${esc(t('report.title'))}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Noto+Sans+Khmer:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  body{font-family:Inter,"Noto Sans Khmer",system-ui,sans-serif;color:#1d2420;margin:0;background:#f3f1ea}
  .page{max-width:820px;margin:24px auto;background:#fff;padding:36px 40px;box-shadow:0 2px 14px rgba(0,0,0,.08)}
  h1{font-size:24px;margin:0 0 4px} h2{font-size:15px;text-transform:uppercase;letter-spacing:.06em;color:#2e7d4f;border-bottom:1px solid #e4e0d4;padding-bottom:4px;margin:26px 0 10px}
  .sub{color:#6b716c;font-size:13px} table{border-collapse:collapse;width:100%;font-size:13px} td,th{padding:5px 8px;border-bottom:1px solid #eee;text-align:left}
  th{color:#6b716c;font-weight:600} .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
  .k{background:#f6f4ee;border-radius:8px;padding:10px} .k span{display:block;font-size:11px;color:#6b716c} .k b{font-size:17px}
  .two{display:grid;grid-template-columns:1.2fr 1fr;gap:20px;align-items:start} img.map{max-width:100%;border:1px solid #e4e0d4;border-radius:6px}
  img.chart{width:100%} i{display:inline-block;width:12px;height:12px;border-radius:3px;vertical-align:middle}
  .bar{position:sticky;top:0;background:#1f3a2b;color:#fff;padding:10px;text-align:center} .bar button{font:inherit;padding:6px 16px;border-radius:6px;border:0;background:#ffd54a;cursor:pointer}
  .foot{margin-top:28px;font-size:11px;color:#8a8f88}
  @media print{body{background:#fff}.page{box-shadow:none;margin:0;max-width:none;padding:0}.bar{display:none}}
</style></head><body>
<div class="bar"><button onclick="print()">${esc(t('report.print'))}</button></div>
<div class="page">
  <h1>${esc(f.name)}</h1>
  <div class="sub">${esc(t('report.title'))} · ${esc(fmtDate(new Date().toISOString().slice(0, 10)))}${f.location ? ` · ${esc(f.location)}` : ''}</div>
  <h2>${esc(t('ov.info'))}</h2>
  <div class="grid">
    <div class="k"><span>${esc(t('field.crop'))}</span><b>${esc(o.crop)}</b></div>
    <div class="k"><span>${esc(t('ov.area'))}</span><b>${o.area} ${esc(t('unit.ha'))}</b></div>
    <div class="k"><span>${esc(t('field.sowing'))}</span><b>${f.sowing ? esc(fmtDate(f.sowing)) : '—'}</b></div>
    <div class="k"><span>${esc(t('field.variety'))}</span><b>${esc(f.variety || '—')}</b></div>
  </div>
  ${o.stage ? `<p><b>${esc(t('stage.title'))}:</b> ${esc(o.stage)}</p>` : ''}
  ${o.mapImg ? `<h2>${esc(o.mapTitle || (o.mapIsZones ? t('zones.title') : o.indexName))} — ${esc(o.scene ? fmtDate(o.scene.date) : '')}</h2>
  <div class="two"><img class="map" src="${o.mapImg}" alt="">
   <div>${r && r.stats ? `<p><b>${esc(t('legend.mean'))}:</b> ${r.stats.mean.toFixed(3)} &nbsp; <b>${esc(t('legend.min'))}:</b> ${r.stats.min.toFixed(2)} &nbsp; <b>${esc(t('legend.max'))}:</b> ${r.stats.max.toFixed(2)}</p>` : ''}
   <p>${esc(t('legend.clear'))}: ${r ? Math.round(r.validFrac * 100) : 0}%</p>
   ${binsRows ? `<table><tr><th>${esc(o.index)}</th><th>${esc(t('unit.ha'))}</th><th>%</th></tr>${binsRows}</table>` : ''}</div></div>` : ''}
  ${o.recs && o.recs.length ? `<h2>${esc(t('report.history'))}</h2>
   ${o.chartImg ? `<img class="chart" src="${o.chartImg}" alt="">` : ''}
   <table><tr><th>${esc(t('chart.date'))}</th><th>${esc(t('chart.mean'))}</th><th>${esc(t('legend.clear'))}</th></tr>
   ${o.recs.map(x => `<tr><td>${esc(fmtDate(x.date))}</td><td><i style="background:${o.colorFor(x.mean)}"></i> ${x.mean.toFixed(3)}</td><td>${Math.round(x.valid * 100)}%</td></tr>`).join('')}</table>` : ''}
  ${o.wx ? `<h2>${esc(t('ov.weather'))}</h2><div class="grid">
    <div class="k"><span>${esc(t('wx.rainPast7'))}</span><b>${o.wx.rainPast7.toFixed(0)} mm</b></div>
    <div class="k"><span>${esc(t('wx.rainNext7'))}</span><b>${o.wx.rainNext7.toFixed(0)} mm</b></div>
    <div class="k"><span>${esc(t('wx.gdd'))}</span><b>${o.wx.acc ? Math.round(o.wx.acc.gdd) : '—'}</b></div>
    <div class="k"><span>${esc(t('wx.rainSince'))}</span><b>${o.wx.acc ? Math.round(o.wx.acc.rain) + ' mm' : '—'}</b></div></div>` : ''}
  ${zonesRows ? `<h2>${esc(t('zones.title'))}</h2><p class="sub">${esc(o.zones.label)}</p>
   <table><tr><th>${esc(t('zones.zone'))}</th><th>${esc(t('legend.mean'))}</th><th>${esc(t('unit.ha'))}</th><th>%</th><th>${esc(t('zones.rate'))}</th></tr>${zonesRows}</table>` : ''}
  ${o.notes.length ? `<h2>${esc(t('notes.title'))}</h2><table>${o.notes.map(n => `<tr><td>${esc(fmtDate(n.date))}</td><td>${esc(t('cat.' + n.cat))}</td><td>${esc(n.text)}</td><td>${n.photo ? `<img src="${n.photo}" style="max-width:120px;border-radius:4px">` : ''}</td></tr>`).join('')}</table>` : ''}
  <div class="foot">${esc(t('report.sources'))}</div>
</div></body></html>`);
  w.document.close();
}
