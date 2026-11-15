# Administrative boundaries

`communes.geojson` — the 1,633 communes/sangkats of Cambodia with English and Khmer names of the
commune, district and province. The app uses it to name a field's location (Overview tab, report,
GeoJSON export) without calling an online geocoder, so many people can create fields at the same time.

| Property | Content |
|---|---|
| `code` | Commune P-code (e.g. `KH050312`) from the boundary file |
| `en`, `den`, `pen` | Commune, district, province — English (NCDD Gazetteer spelling) |
| `km`, `dkm`, `pkm` | Commune, district, province — Khmer with prefix (ឃុំ/សង្កាត់, ស្រុក/ក្រុង/ខណ្ឌ, ខេត្ត/រាជធានី) |

Sources:

- Boundaries: **OCHA COD-AB Cambodia** (HDX dataset `cod-ab-khm`, 2018 boundaries), CC BY-IGO —
  https://data.humdata.org/dataset/cod-ab-khm
- Names: **NCDD Gazetteer** (14 Oct 2024) as published by Open Development Cambodia —
  https://data.opendevelopmentcambodia.net/dataset/cambodia-gazetteer

Communes and districts split after 2018 (e.g. Boeng Tumpun → Boeng Tumpun 1/2, Odongk → Odongk Maechay
and Samkkei Munichay) keep the undivided polygon, named after the current district.
Geometry is simplified (~130 m), which is enough to name a field's commune but not for mapping borders.

Rebuild: `pip install shapely openpyxl && python scripts/build_admin_data.py`
