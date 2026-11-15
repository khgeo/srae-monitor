#!/usr/bin/env python3
"""Build data/admin/communes.geojson: Cambodia commune boundaries with English and Khmer names.

Boundaries: OCHA COD-AB Cambodia (HDX, cod-ab-khm), admin level 3, CC BY-IGO.
Khmer names and codes: NCDD Gazetteer as published by Open Development Cambodia (cambodia-gazetteer).

The web app uses this file to name a field's location (commune, district, province) without calling
an online geocoder, so many users can create fields at the same time.

Usage:  pip install shapely openpyxl
        python scripts/build_admin_data.py [--hdx-zip khm_admin_boundaries.geojson.zip] [--gazetteer ncdd.xlsx]
"""
import argparse
import difflib
import io
import json
import os
import re
import sys
import unicodedata
import urllib.request
import zipfile

import openpyxl
from shapely.geometry import mapping, shape
from shapely.validation import make_valid

HDX_API = 'https://data.humdata.org/api/3/action/package_show?id=cod-ab-khm'
ODC_API = 'https://data.opendevelopmentcambodia.net/api/3/action/package_show?id=cambodia-gazetteer'
OUT = os.path.join(os.path.dirname(__file__), '..', 'data', 'admin')
TOLERANCE = 0.0012   # degrees (~130 m) — enough to name the commune of a field
DIGITS = 4          # ~11 m

# Khmer province names with their official prefix (រាជធានី for Phnom Penh, ខេត្ត otherwise).
PROVINCE_KM = {
    1: 'បន្ទាយមានជ័យ', 2: 'បាត់ដំបង', 3: 'កំពង់ចាម', 4: 'កំពង់ឆ្នាំង', 5: 'កំពង់ស្ពឺ', 6: 'កំពង់ធំ',
    7: 'កំពត', 8: 'កណ្ដាល', 9: 'កោះកុង', 10: 'ក្រចេះ', 11: 'មណ្ឌលគិរី', 12: 'ភ្នំពេញ', 13: 'ព្រះវិហារ',
    14: 'ព្រៃវែង', 15: 'ពោធិ៍សាត់', 16: 'រតនគិរី', 17: 'សៀមរាប', 18: 'ព្រះសីហនុ', 19: 'ស្ទឹងត្រែង',
    20: 'ស្វាយរៀង', 21: 'តាកែវ', 22: 'ឧត្ដរមានជ័យ', 23: 'កែប', 24: 'ប៉ៃលិន', 25: 'ត្បូងឃ្មុំ',
}


def get(url, timeout=180):
    req = urllib.request.Request(url, headers={'User-Agent': 'srae-monitor-build/1.0 (github.com/khgeo/srae-monitor)'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def resource_url(api, pattern):
    pkg = json.loads(get(api))['result']
    for r in pkg['resources']:
        if re.search(pattern, r['url'], re.I):
            return r['url']
    raise SystemExit(f'No resource matching {pattern} in {api}')


def norm(s):
    s = unicodedata.normalize('NFKD', str(s or '')).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]', '', s)


SPLIT_SUFFIX = re.compile(r'\s*ទី\s*[០-៩0-9]+$')


def closest(index, pcode, name, gz, cutoff=0.82):
    """Units split after the boundaries were drawn (e.g. 'Boeng Tumpun' -> 'Boeng Tumpun 1/2'):
    take the most similar name in the same province and drop the 'ទី១' style suffix."""
    key = norm(name)
    best, score = None, 0
    for (pc, n), codes in index.items():
        if pc != pcode:
            continue
        base = re.sub(r'\d+$', '', n)
        s = max(difflib.SequenceMatcher(None, key, base).ratio(),
                1.0 if base.startswith(key) or (len(base) >= 5 and key.startswith(base)) else 0)
        if s > score:
            best, score = codes[0], s
    if best is None or score < cutoff:
        return None
    return best


PROVINCE_EN = {}


def load_gazetteer(data):
    """{code(int): (type_km, name_km, name_en)} for districts (3–4 digits) and communes (5–6 digits).
    Also fills PROVINCE_EN from the sheet names ("17. Siem Reap")."""
    wb = openpyxl.load_workbook(io.BytesIO(data), read_only=True)
    out = {}
    for ws in wb.worksheets:
        m = re.match(r'\s*(\d+)\.\s*(.+)$', ws.title)
        if m:
            PROVINCE_EN[int(m.group(1))] = m.group(2).strip()
        for row in ws.iter_rows(values_only=True):
            if not row or len(row) < 4 or not row[1] or not str(row[1]).strip().isdigit():
                continue
            typ, code, km, en = (str(v).strip() if v is not None else '' for v in row[:4])
            if typ in ('ភូមិ',) or len(code) > 6:
                continue
            out[int(code)] = (typ, km, en)
    return out


def rnd(obj):
    if isinstance(obj, (list, tuple)):
        if obj and isinstance(obj[0], (int, float)):
            return [round(obj[0], DIGITS), round(obj[1], DIGITS)]
        return [rnd(o) for o in obj]
    return obj


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--hdx-zip')
    ap.add_argument('--gazetteer')
    a = ap.parse_args()

    hdx = open(a.hdx_zip, 'rb').read() if a.hdx_zip else get(resource_url(HDX_API, r'geojson\.zip$'))
    with zipfile.ZipFile(io.BytesIO(hdx)) as z:
        name = next(n for n in z.namelist() if n.endswith('admin3.geojson'))
        adm3 = json.loads(z.read(name))
    gz = load_gazetteer(open(a.gazetteer, 'rb').read() if a.gazetteer else get(resource_url(ODC_API, r'14\.10\.2024\.xlsx$|\.xlsx$')))

    # Latin-name index for codes that changed since the boundaries were drawn
    com_by_name = {}
    for code, v in gz.items():
        if code >= 10000:
            com_by_name.setdefault((code // 10000, norm(v[2])), []).append(code)
    dis_by_name = {}
    for code, v in gz.items():
        if code < 10000:
            dis_by_name.setdefault((code // 100, norm(v[2])), []).append(code)

    feats, miss_c, miss_d = [], 0, 0
    for f in adm3['features']:
        p = f['properties']
        ccode = int(p['adm3_pcode'][2:])
        dcode = int(p['adm2_pcode'][2:])
        pcode = int(p['adm1_pcode'][2:])
        cc = ccode if ccode in gz and difflib.SequenceMatcher(
            None, norm(p['adm3_name']), norm(gz[ccode][2])).ratio() >= 0.6 else None  # guard against reused codes
        split = False
        if cc is None:
            hits = com_by_name.get((pcode, norm(p['adm3_name'])), [])
            if len(hits) == 1:
                cc = hits[0]
            else:
                cc = closest(com_by_name, pcode, p['adm3_name'], gz)
                split = cc is not None
        c = gz[cc] if cc else None
        if c and split:  # the polygon is the old, undivided commune: 'បឹងទំពុនទី១' -> 'បឹងទំពុន'
            c = (c[0], SPLIT_SUFFIX.sub('', c[1]), p['adm3_name'])
        # district: the one the commune belongs to now, else the boundary file's district
        dc = cc // 100 if cc and cc // 100 in gz else (dcode if dcode in gz else None)
        if dc is None:
            hits = dis_by_name.get((pcode, norm(p['adm2_name'])), [])
            dc = hits[0] if len(hits) == 1 else closest(dis_by_name, pcode, p['adm2_name'], gz)
        d = gz[dc] if dc else None
        miss_c += c is None
        miss_d += d is None
        g = make_valid(shape(f['geometry'])).simplify(TOLERANCE, preserve_topology=True)
        if g.is_empty:
            continue
        pkm = PROVINCE_KM.get(pcode, '')
        feats.append({
            'type': 'Feature',
            'properties': {
                'code': p['adm3_pcode'],
                # current (gazetteer) English names, so English and Khmer always name the same units
                'en': c[2] if c else p['adm3_name'], 'den': d[2] if d else p['adm2_name'],
                'pen': PROVINCE_EN.get(pcode) or p['adm1_name'],
                'km': (c[0] + c[1]) if c else '',
                'dkm': (d[0] + d[1]) if d else '',
                'pkm': (('រាជធានី' if pcode == 12 else 'ខេត្ត') + pkm) if pkm else '',
            },
            'geometry': rnd(mapping(g)),
        })

    os.makedirs(OUT, exist_ok=True)
    fc = {
        'type': 'FeatureCollection',
        'name': 'cambodia_communes',
        'attribution': 'Boundaries: OCHA COD-AB Cambodia (HDX), CC BY-IGO. Khmer names: NCDD Gazetteer via Open Development Cambodia.',
        'features': feats,
    }
    path = os.path.join(OUT, 'communes.geojson')
    with open(path, 'w', encoding='utf-8') as fh:
        json.dump(fc, fh, ensure_ascii=False, separators=(',', ':'))
    print(f'{len(feats)} communes -> {path} ({os.path.getsize(path) / 1e6:.2f} MB); '
          f'no Khmer commune name: {miss_c}, no Khmer district name: {miss_d}', file=sys.stderr)


if __name__ == '__main__':
    main()
