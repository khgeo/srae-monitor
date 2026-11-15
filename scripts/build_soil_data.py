#!/usr/bin/env python3
"""
Build the soil data files used by Srae Monitor's Soil tab.

Runs on GitHub Actions (see .github/workflows/update-soil-data.yml) and writes:

  data/soil/soilgrids_cambodia.tif   SoilGrids 2.0 topsoil (0-30 cm) and subsoil (30-60 cm)
                                     properties for Cambodia, ~550 m grid, EPSG:4326
  data/soil/soil_types_crocker1962.geojson
                                     Soil types of Cambodia (Crocker 1962) from Open Development Cambodia
  data/soil/meta.json                band list, units, sources and licences

Sources (both openly licensed, attribution required):
  * ISRIC SoilGrids 2.0, CC BY 4.0 - https://www.isric.org/explore/soilgrids
  * Open Development Cambodia, "Distribution of soil types in Cambodia (Crocker, 1962)", CC BY 4.0

Run locally:  pip install rasterio numpy && python scripts/build_soil_data.py
"""
import datetime as dt
import json
import os
import sys
import tempfile
import time
import urllib.parse
import urllib.request

import numpy as np

# ------------------------------------------------------------------ settings
BBOX = (102.30, 10.30, 107.70, 14.75)          # west, south, east, north (Cambodia + margin)
RES = 0.005                                       # degrees (~550 m)
NODATA = -32768
OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data', 'soil')
RASTER_NAME = 'soilgrids_cambodia.tif'
SOILTYPE_NAME = 'soil_types_crocker1962.geojson'

# SoilGrids property -> (factor from mapped units to conventional units, conventional unit, label)
PROPS = {
    'clay':     (10,  '%',          'Clay'),
    'sand':     (10,  '%',          'Sand'),
    'phh2o':    (10,  'pH',         'pH (H2O)'),
    'soc':      (10,  'g/kg',       'Soil organic carbon'),
    'nitrogen': (100, 'g/kg',       'Total nitrogen'),
    'cec':      (10,  'cmol(+)/kg', 'Cation exchange capacity'),
}
# depth groups: name -> list of (SoilGrids depth label, thickness in cm)
DEPTHS = {
    '0-30cm':  [('0-5cm', 5), ('5-15cm', 10), ('15-30cm', 15)],
    '30-60cm': [('30-60cm', 30)],
}
VRT_URL = 'https://files.isric.org/soilgrids/latest/data/{p}/{p}_{d}_mean.vrt'
WCS_URL = 'https://maps.isric.org/mapserv?map=/map/{p}.map'
IGH = '+proj=igh +lat_0=0 +lon_0=0 +datum=WGS84 +units=m +no_defs'
ODC_WFS = ('https://data.opendevelopmentmekong.net/geoserver/ODCambodia/ows?service=WFS&version=1.0.0'
           '&request=GetFeature&typeName=ODCambodia%3AMap_soil_type&outputFormat=application%2Fjson')


def log(*a):
    print(*a, flush=True)


# ------------------------------------------------------------------ pure helpers (unit-tested)
def grid_shape(bbox=BBOX, res=RES):
    w, s, e, n = bbox
    width = int(round((e - w) / res))
    height = int(round((n - s) / res))
    return width, height


def weighted_depth_mean(layers):
    """layers: list of (array float32 with NaN for nodata, thickness). Thickness-weighted mean ignoring NaN."""
    num = np.zeros_like(layers[0][0], dtype='float64')
    den = np.zeros_like(num)
    for arr, w in layers:
        ok = np.isfinite(arr)
        num[ok] += arr[ok] * w
        den[ok] += w
    out = np.full(num.shape, np.nan, dtype='float32')
    has = den > 0
    out[has] = (num[has] / den[has]).astype('float32')
    return out


def to_int16(arr):
    out = np.full(arr.shape, NODATA, dtype='int16')
    ok = np.isfinite(arr)
    out[ok] = np.clip(np.round(arr[ok]), -32767, 32767).astype('int16')
    return out


def _dp(points, tol):
    """Douglas-Peucker simplification of a list of [x, y]."""
    if len(points) < 3:
        return points
    pts = np.asarray(points, dtype='float64')
    keep = np.zeros(len(pts), dtype=bool)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        i, j = stack.pop()
        if j <= i + 1:
            continue
        a, b = pts[i], pts[j]
        seg = pts[i + 1:j]
        ab = b - a
        L = np.hypot(*ab)
        if L == 0:
            d = np.hypot(*(seg - a).T)
        else:
            d = np.abs(ab[0] * (seg[:, 1] - a[1]) - ab[1] * (seg[:, 0] - a[0])) / L
        k = int(np.argmax(d))
        if d[k] > tol:
            m = i + 1 + k
            keep[m] = True
            stack.append((i, m))
            stack.append((m, j))
    return pts[keep].tolist()


def simplify_ring(ring, tol, ndigits=5):
    r = _dp(ring, tol)
    r = [[round(x, ndigits), round(y, ndigits)] for x, y in r]
    dedup = [r[0]]
    for p in r[1:]:
        if p != dedup[-1]:
            dedup.append(p)
    if dedup[0] != dedup[-1]:
        dedup.append(dedup[0])
    return dedup if len(dedup) >= 4 else None


def simplify_geometry(geom, tol=0.0003):
    if not geom:
        return None
    t = geom.get('type')
    polys = [geom['coordinates']] if t == 'Polygon' else geom['coordinates'] if t == 'MultiPolygon' else []
    out = []
    for poly in polys:
        rings = [simplify_ring(r, tol) for r in poly]
        if not rings or rings[0] is None:
            continue
        out.append([rings[0]] + [r for r in rings[1:] if r is not None])
    if not out:
        return None
    return {'type': 'Polygon', 'coordinates': out[0]} if len(out) == 1 else {'type': 'MultiPolygon', 'coordinates': out}


def pick_name_field(features):
    """Choose the attribute that best names the soil type: a text field with several distinct values."""
    preferred = ['soil_type', 'soiltype', 'soil', 'type', 'name', 'name_en', 'descriptio', 'description', 'class', 'legend']
    stats = {}
    for f in features:
        for k, v in (f.get('properties') or {}).items():
            if isinstance(v, str) and v.strip():
                stats.setdefault(k, set()).add(v.strip())
    cands = {k: len(v) for k, v in stats.items() if 2 <= len(v) <= 80}
    if not cands:
        return None
    for p in preferred:
        for k in cands:
            if k.lower() == p:
                return k
    for p in preferred:
        for k in cands:
            if p in k.lower():
                return k
    return max(cands, key=cands.get)


def build_soil_types(fc):
    feats = fc.get('features') or []
    key = pick_name_field(feats)
    log(f'  soil type name field: {key!r} ({len(feats)} features)')
    out = []
    for f in feats:
        g = simplify_geometry(f.get('geometry'))
        if g is None:
            continue
        props = f.get('properties') or {}
        name = str(props.get(key, '')).strip() if key else ''
        out.append({'type': 'Feature', 'properties': {'name': name or 'Unknown'}, 'geometry': g})
    return {'type': 'FeatureCollection', 'features': out}


# ------------------------------------------------------------------ download helpers
def http_get(url, path=None, tries=5, timeout=300):
    last = None
    for k in range(tries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'srae-monitor-data-builder (GitHub Actions)'})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                data = r.read()
            if path:
                with open(path, 'wb') as fh:
                    fh.write(data)
            return data
        except Exception as e:  # noqa: BLE001
            last = e
            log(f'    retry {k + 1}/{tries} after error: {e}')
            time.sleep(10 * (k + 1))
    raise RuntimeError(f'download failed: {url}: {last}')


def target_transform():
    from rasterio.transform import from_origin
    w, s, e, n = BBOX
    return from_origin(w, n, RES, RES)


def read_soilgrids_vrt(prop, depth):
    """Read one SoilGrids layer through its cloud VRT, warped to the target grid (average resampling)."""
    import rasterio
    from rasterio.enums import Resampling
    from rasterio.vrt import WarpedVRT
    width, height = grid_shape()
    url = '/vsicurl/' + VRT_URL.format(p=prop, d=depth)
    env = dict(GDAL_HTTP_MAX_RETRY='5', GDAL_HTTP_RETRY_DELAY='5', GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR',
               CPL_VSIL_CURL_ALLOWED_EXTENSIONS='.vrt,.tif', VSI_CACHE='TRUE', GDAL_HTTP_TIMEOUT='120')
    with rasterio.Env(**env):
        with rasterio.open(url) as src:
            nd = src.nodata if src.nodata is not None else NODATA
            with WarpedVRT(src, crs='EPSG:4326', transform=target_transform(), width=width, height=height,
                           resampling=Resampling.average, src_nodata=nd, nodata=nd) as vrt:
                a = vrt.read(1).astype('float32')
            a[a == nd] = np.nan
            return a


def read_soilgrids_wcs(prop, depth):
    """Fallback: WCS 2.0.1 GetCoverage in the native Homolosine CRS, then reproject to the target grid."""
    import rasterio
    from rasterio.enums import Resampling
    from rasterio.warp import reproject, transform_bounds
    width, height = grid_shape()
    x0, y0, x1, y1 = transform_bounds('EPSG:4326', IGH, *BBOX, densify_pts=41)
    params = [('SERVICE', 'WCS'), ('VERSION', '2.0.1'), ('REQUEST', 'GetCoverage'),
              ('COVERAGEID', f'{prop}_{depth}_mean'), ('FORMAT', 'GEOTIFF_INT16'),
              ('SUBSET', f'X({x0:.0f},{x1:.0f})'), ('SUBSET', f'Y({y0:.0f},{y1:.0f})')]
    url = WCS_URL.format(p=prop) + '&' + urllib.parse.urlencode(params)
    with tempfile.NamedTemporaryFile(suffix='.tif', delete=False) as tmp:
        path = tmp.name
    try:
        http_get(url, path, timeout=600)
        with rasterio.open(path) as src:
            nd = src.nodata if src.nodata is not None else NODATA
            dst = np.full((height, width), nd, dtype='float32')
            reproject(src.read(1).astype('float32'), dst, src_transform=src.transform, src_crs=src.crs or IGH,
                      dst_transform=target_transform(), dst_crs='EPSG:4326', src_nodata=nd, dst_nodata=nd,
                      resampling=Resampling.average)
        dst[dst == nd] = np.nan
        return dst
    finally:
        os.unlink(path)


def read_layer(prop, depth):
    for fn in (read_soilgrids_vrt, read_soilgrids_wcs):
        for attempt in range(3):
            try:
                a = fn(prop, depth)
                valid = np.isfinite(a).mean()
                log(f'    {prop} {depth} via {fn.__name__}: {valid:.0%} valid')
                if valid < 0.05:
                    raise RuntimeError('almost no valid pixels')
                return a
            except Exception as e:  # noqa: BLE001
                log(f'    {fn.__name__} {prop} {depth} attempt {attempt + 1} failed: {e}')
                time.sleep(15 * (attempt + 1))
    raise RuntimeError(f'could not read SoilGrids {prop} {depth}')


# ------------------------------------------------------------------ main
def build_soilgrids():
    import rasterio
    width, height = grid_shape()
    bands, meta_bands = [], []
    for group, parts in DEPTHS.items():
        for prop, (factor, unit, label) in PROPS.items():
            log(f'  SoilGrids {prop} {group}')
            layers = [(read_layer(prop, d), w) for d, w in parts]
            bands.append(to_int16(weighted_depth_mean(layers)))
            meta_bands.append({'band': len(bands), 'property': prop, 'depth': group, 'factor': factor,
                               'unit': unit, 'label': label})
    path = os.path.join(OUT_DIR, RASTER_NAME)
    profile = dict(driver='GTiff', dtype='int16', count=len(bands), width=width, height=height,
                   crs='EPSG:4326', transform=target_transform(), nodata=NODATA, tiled=True,
                   blockxsize=128, blockysize=128, compress='deflate', predictor=2, interleave='pixel')
    with rasterio.open(path, 'w', **profile) as dst:
        for i, b in enumerate(bands, 1):
            dst.write(b, i)
            dst.set_band_description(i, f"{meta_bands[i - 1]['property']}_{meta_bands[i - 1]['depth']}")
    log(f'  wrote {path} ({os.path.getsize(path) / 1e6:.1f} MB)')
    return meta_bands


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    meta_path = os.path.join(OUT_DIR, 'meta.json')
    meta = {}
    if os.path.exists(meta_path):
        with open(meta_path, encoding='utf-8') as fh:
            meta = json.load(fh)
    ok = False

    log('Soil types (Open Development Cambodia)...')
    try:
        fc = json.loads(http_get(ODC_WFS).decode('utf-8'))
        st = build_soil_types(fc)
        with open(os.path.join(OUT_DIR, SOILTYPE_NAME), 'w', encoding='utf-8') as fh:
            json.dump(st, fh, ensure_ascii=False, separators=(',', ':'))
        meta['soilTypes'] = SOILTYPE_NAME
        meta['soilTypesUpdated'] = dt.date.today().isoformat()
        ok = True
    except Exception as e:  # noqa: BLE001
        log(f'  FAILED soil types: {e}')

    log('SoilGrids 2.0 (ISRIC)...')
    try:
        meta['bands'] = build_soilgrids()
        meta['raster'] = RASTER_NAME
        meta['rasterUpdated'] = dt.date.today().isoformat()
        ok = True
    except Exception as e:  # noqa: BLE001
        log(f'  FAILED SoilGrids: {e}')

    meta.update({
        'version': 1,
        'bbox': list(BBOX), 'res': RES, 'nodata': NODATA,
        'sources': [
            {'name': 'SoilGrids 2.0 (ISRIC - World Soil Information)', 'licence': 'CC BY 4.0',
             'url': 'https://www.isric.org/explore/soilgrids',
             'citation': 'Poggio, L., de Sousa, L. M., et al. (2021). SoilGrids 2.0. SOIL 7, 217-240. https://doi.org/10.5194/soil-7-217-2021'},
            {'name': 'Distribution of soil types in Cambodia (Crocker, 1962) - Open Development Cambodia', 'licence': 'CC BY 4.0',
             'url': 'https://data.opendevelopmentcambodia.net/dataset/distribution-soil-type-in-cambodia'},
        ],
    })
    with open(meta_path, 'w', encoding='utf-8') as fh:
        json.dump(meta, fh, ensure_ascii=False, indent=1)
    log('done' if ok else 'nothing could be downloaded')
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
