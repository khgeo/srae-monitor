# Srae Monitor — satellite crop monitoring (ស្រែ Monitor)

A free, open-source crop-monitoring web app in the spirit of EOS Crop Monitoring. It is a **static website**: no server, no database and no API keys, so it runs on **GitHub Pages**. All satellite processing happens in the visitor's browser.

**Language:** English / ខ្មែរ (switch at the top of the page) · **Help** button explains every feature.

## Features

| | |
|---|---|
| **Fields** | Draw boundaries on satellite imagery, or import GeoJSON / KML / zipped Shapefile (drag & drop works). Area, commune / district / province (English and Khmer, from the NCDD Gazetteer) and elevation fill in automatically. |
| **Trace field** | Click inside a paddy on the satellite map and its boundary is found automatically from very-high-resolution imagery (Esri World Imagery, ~0.6 m): bunds, roads and tree lines stop the outline. Tolerance slider, Shift+click to add a missed part, Enter to save and trace the next plot; saved fields block later traces so neighbours never overlap. |
| **Small fields** | Fields under 2 ha use a 2 m grid (5 m under 10 ha) that follows the exact shape and weights each 10 m Sentinel-2 pixel by its share inside the field. Edge pixels (mixed with bunds and neighbours) are left out of the field mean when ≥3 pixels lie fully inside (*Settings → Field-edge pixels*). The Status tab shows the pixel count and advice for small plots. |
| **Vegetation maps** | Sentinel-2 L2A (10 m, ~5-day revisit) clipped to the field: NDVI, EVI, MSAVI, NDRE, ReCI, NDMI, NDWI and true colour. Clouds and shadows are masked with the SCL band. Hover to read pixel values. |
| **Image timeline** | Every Sentinel-2 date with scene cloud cover; the clearest recent image opens automatically. |
| **Legend & statistics** | Mean / min / max and area (ha) per index class, like the EOS histogram. |
| **Index chart** | Field-mean index for every clear image in the season, 10–90 % variability band, sowing/harvest markers, previous-year comparison, CSV export. |
| **Weather** | Open-Meteo: 30-day history + 14-day forecast, rainfall, temperature, soil moisture, ET₀, growing degree days and rain since sowing. |
| **Productivity zones** | 2–7 zones (quantile, equal interval or k-means) from one image or the average of the best images, smoothing, per-zone rates, GeoJSON/CSV export for VRA. |
| **Scouting** | Pin observations (pests, disease, weeds, water, nutrients) with photos; export as GeoJSON. |
| **Compare dates** | Change map between any two images (gain / loss classes with area), for spotting damage, flooding or uneven growth. |
| **Growth stage** | Estimated crop stage from the sowing date (rice, maize, soybean, mung bean, cassava, sugarcane, vegetables) and expected harvest. |
| **GeoTIFF export** | Download the visible layer (index, change map, zones or true colour) as a georeferenced GeoTIFF for QGIS. |
| **Map engine** | MapLibre GL (GPU-rendered): smooth continuous zoom and pan, rotate and tilt, **3D terrain** view with the index draped on the relief. |
| **Map tools** | Place / coordinate search, GPS "my location", full screen, distance / area / perimeter measuring, ← → keys to step through dates. |
| **Portfolio view** | Sort fields by NDVI, NDVI drop or area; **Check all** fetches the latest clear NDVI for every field and flags fields whose NDVI fell (⚠). |
| **Weather alerts** | Heavy rain, heat stress, dry spell and dry spraying days from the 7-day forecast. |
| **Installable** | Web-app manifest and icons, so it can be added to a phone home screen. |
| **Soil** | Per-field topsoil/subsoil texture (with texture triangle), pH, organic carbon, nitrogen and CEC from **ISRIC SoilGrids 2.0**; soil type from the **Crocker (1962)** map (Open Development Cambodia); fertility ratings, management hints and indicative crop suitability; soil-type map layer; CSV export. |
| **Report** | Printable field report (Save as PDF). |
| **Your data** | Stored in the browser (localStorage). Backup / restore as JSON. |

## Publish on GitHub Pages (5 minutes)

1. Create a new repository on GitHub, e.g. `srae-monitor` (public).
2. Upload the contents of this folder (`index.html`, `manifest.webmanifest`, `css/`, `js/`, `assets/`, `data/`, `scripts/`, `.github/`, `.nojekyll`, `README.md`) to the repository root — **Add file → Upload files**, or with git:
   ```bash
   git init && git add . && git commit -m "Srae Monitor"
   git branch -M main
   git remote add origin https://github.com/<your-user>/srae-monitor.git
   git push -u origin main
   ```
3. On GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main` / `(root)` → Save**.
4. After a minute the site is live at `https://<your-user>.github.io/srae-monitor/`.

To put it inside an existing site (e.g. `<user>.github.io`), copy the folder into a sub-folder such as `crop/` — all paths are relative.

**Test locally:** ES modules need a web server, not `file://`:
```bash
cd srae-monitor && python3 -m http.server 8000   # open http://localhost:8000
```

## Soil data on GitHub

Soil data is stored in this repository under `data/soil/`. It is created by the GitHub Action
**Update soil data** (`.github/workflows/update-soil-data.yml` → `scripts/build_soil_data.py`), which downloads:

- **ISRIC SoilGrids 2.0** (CC BY 4.0): clay, sand, pH, organic carbon, nitrogen and CEC, averaged to 0–30 cm and 30–60 cm and clipped to Cambodia (~550 m grid, one GeoTIFF);
- **Soil types of Cambodia, Crocker 1962** from Open Development Cambodia (CC BY 4.0), simplified GeoJSON.

The workflow runs automatically when the script is pushed, or manually: **Actions → Update soil data → Run workflow**
(takes ~10–30 minutes). Until the files exist, the Soil tab reads SoilGrids directly from its public API.
If the workflow cannot push, enable **Settings → Actions → General → Workflow permissions → Read and write**.

## Many users at the same time

The site has no server and no registration: every visitor's browser downloads its own Sentinel-2 tiles and
calculates indices itself, so users don't slow each other down. What is shared are the free public
services the browser calls. In a classroom or computer lab all students usually reach the internet through
**one** IP address, so their requests count together. The app is built for that:

| Service | Its limit | What the app does |
|---|---|---|
| Field location | — | Named from `data/admin/communes.geojson` (part of this site), not an online geocoder |
| Nominatim (place search; place names outside Cambodia) | 1 request / second for the whole site | Requests queued 1.1 s apart and cached; search only runs on Enter |
| SoilGrids REST | 5 calls / minute | Soil tab reads `data/soil/` from this repository; the live API is only a fallback, spaced 12 s apart |
| Earth Search STAC, Open-Meteo, SoilGrids | Free, occasionally busy | `js/net.js` retries on HTTP 429/502/503/504 after 1 s, 3 s, 7 s (or the server's Retry-After) |
| Sentinel-2 files (AWS) | No per-user limit | — (the campus internet link is usually the bottleneck: lower *images per run* in Settings for a class) |

## How it works

```
Browser ──► Earth Search STAC API (AWS) ──► list of Sentinel-2 scenes for the field
        ──► Sentinel-2 Cloud-Optimized GeoTIFFs (AWS Open Data)  ← HTTP range requests,
            only the tiles covering the field (geotiff.js)
        ──► index computed per pixel, clouds masked (SCL 3, 8, 9, 10), drawn on MapLibre GL
        ──► Open-Meteo (weather), data/admin (commune names), Nominatim (place search)
```

| File | Purpose |
|---|---|
| `js/app.js` | User interface, tabs |
| `js/mapview.js` | Map engine: basemaps, 3D terrain, overlays, drawing, editing, measuring |
| `js/stac.js` | Sentinel-2 scene search (Earth Search STAC) |
| `js/raster.js` | Reads COG windows, cloud mask, index on the field grid |
| `js/indices.js` | Index formulas, colour ramps, classes |
| `js/zones.js` | Zoning: quantile / k-means, smoothing, vectorising |
| `js/trace.js` | Boundary tracing: colour + edge + thin-line (bund) detection, region growing, morphology, outline |
| `js/tracer.js` | Trace-field tool: reads imagery tiles, runs the tracer, preview, save |
| `js/weather.js` | Open-Meteo forecast + ERA5 archive, GDD |
| `js/geo.js` | UTM projection, area, point-in-polygon |
| `js/admin.js` | Commune / district / province of a field (English and Khmer) |
| `js/net.js` | Retry on busy services, request queue for rate-limited services |
| `js/i18n.js` | English and Khmer text (add more languages here) |
| `js/report.js` | Printable report |
| `js/stages.js` | Crop growth-stage calendar |
| `js/tiffwriter.js` | GeoTIFF export |
| `js/soil.js` | Soil data reader, texture class, fertility ratings, crop suitability |
| `scripts/build_soil_data.py` | Builds `data/soil/` (run by the GitHub Action) |
| `scripts/build_admin_data.py` | Builds `data/admin/communes.geojson` (HDX COD-AB + NCDD Gazetteer) |

Libraries (loaded from CDNs): MapLibre GL JS 4.7.1, geotiff.js 2.1.3, Chart.js 4.4; shpjs and togeojson load only when you import a Shapefile or KML.

## Notes and limits

- **First run per field is the slowest.** Each image downloads a few MB of tiles. The index chart caches results, so later visits are quick. Use *Settings* to limit images per run.
- **Clouds:** in the wet season many dates are cloudy; the app skips images where less than 50 % of the field is clear (adjustable).
- **Small plots:** a 0.2 ha paddy covers only ~20 Sentinel-2 pixels; the app weights pixels by their share inside the field and leaves out edge pixels when it can, but treat single values on very small plots as estimates and follow the trend.
- **Trace field** works best on clear bunds and dry-season imagery; textured or flooded fields may need a lower/higher tolerance, a Shift+click or a manual touch-up with *Edit shape*. The base-map imagery date varies by place.
- Weather and imagery services are free public services; heavy use from one site may hit their fair-use limits.
- Data stays in each user's browser. Clearing browser data deletes it — use *Backup*.

## Data sources & credits

Contains modified Copernicus Sentinel-2 data, accessed via [Earth Search](https://earth-search.aws.element84.com/v1) (Element 84) and the [Registry of Open Data on AWS](https://registry.opendata.aws/sentinel-2-l2a-cogs/). Weather: [Open-Meteo](https://open-meteo.com) (CC BY 4.0). Commune boundaries: [OCHA COD-AB Cambodia](https://data.humdata.org/dataset/cod-ab-khm) (CC BY-IGO); Khmer names: [NCDD Gazetteer via Open Development Cambodia](https://data.opendevelopmentcambodia.net/dataset/cambodia-gazetteer). Basemaps: Esri World Imagery, © OpenStreetMap contributors, OpenTopoMap. Place names: OpenStreetMap Nominatim.

---

## ការបោះពុម្ពលើ GitHub Pages (ខ្មែរ)

1. បង្កើត repository ថ្មីលើ GitHub (ឧ. `srae-monitor`) ជាសាធារណៈ។
2. Upload ឯកសារទាំងអស់ក្នុងថតនេះ (`index.html`, `css/`, `js/`, `assets/`, `.nojekyll`) ទៅ root នៃ repository។
3. ចូល **Settings → Pages → Source: Deploy from a branch → `main` / `(root)` → Save**។
4. ប្រហែល ១ នាទីក្រោយ គេហទំព័រនឹងដំណើរការនៅ `https://<ឈ្មោះអ្នក>.github.io/srae-monitor/`។

ទិន្នន័យស្រែ និងកំណត់ត្រារក្សាទុកក្នុងកម្មវិធីរុករករបស់អ្នកប្រើម្នាក់ៗ។ ប្រើប៊ូតុង **បម្រុងទុក** ដើម្បីផ្ទេរទៅកុំព្យូទ័រផ្សេង។

## License

MIT — see `LICENSE`.
