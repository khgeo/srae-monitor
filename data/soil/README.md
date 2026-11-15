# Soil data

Files in this folder are created by the GitHub Action **Update soil data**
(`.github/workflows/update-soil-data.yml`, script `scripts/build_soil_data.py`).

| File | Content | Source and licence |
|---|---|---|
| `soilgrids_cambodia.tif` | Topsoil (0–30 cm) and subsoil (30–60 cm) clay, sand, pH, organic carbon, nitrogen and CEC; ~550 m grid, EPSG:4326, Int16 in SoilGrids mapped units (see `meta.json` for factors) | ISRIC SoilGrids 2.0, **CC BY 4.0** — Poggio et al. (2021), SOIL 7, 217–240, https://doi.org/10.5194/soil-7-217-2021 |
| `soil_types_crocker1962.geojson` | Soil types of Cambodia (Crocker 1962), simplified | Open Development Cambodia / Save Cambodia's Wildlife, **CC BY 4.0** — https://data.opendevelopmentcambodia.net/dataset/distribution-soil-type-in-cambodia |
| `meta.json` | Band list, units, sources | — |

SoilGrids values are model predictions at 250 m resolution and are indicative only; a laboratory soil test is needed for fertiliser recommendations.
