// Minimal GeoTIFF writer (uncompressed, single strip, EPSG:4326) so layers open directly in QGIS.

const T = { SHORT: 3, LONG: 4, DOUBLE: 12, ASCII: 2 };
const SIZE = { 3: 2, 4: 4, 12: 8, 2: 1 };

/**
 * @param {object} o
 * @param {number} o.width
 * @param {number} o.height
 * @param {ArrayLike<number>[]} o.bands  one array per band, row-major
 * @param {'float32'|'uint8'} o.type
 * @param {number} o.west  @param {number} o.north  @param {number} o.dLon  @param {number} o.dLat
 * @param {string} [o.nodata]  e.g. "nan"
 * @returns {ArrayBuffer}
 */
export function writeGeoTiff({ width, height, bands, type = 'float32', west, north, dLon, dLat, nodata }) {
  const spp = bands.length;
  const bps = type === 'float32' ? 32 : 8;
  const bytesPer = bps / 8;
  const imageBytes = width * height * spp * bytesPer;
  const rgb = type === 'uint8' && spp === 3;

  const entries = [
    [256, T.LONG, [width]],
    [257, T.LONG, [height]],
    [258, T.SHORT, Array(spp).fill(bps)],
    [259, T.SHORT, [1]],
    [262, T.SHORT, [rgb ? 2 : 1]],
    [273, T.LONG, [0]],             // strip offset, patched below
    [277, T.SHORT, [spp]],
    [278, T.LONG, [height]],
    [279, T.LONG, [imageBytes]],
    [284, T.SHORT, [1]],
    [339, T.SHORT, Array(spp).fill(type === 'float32' ? 3 : 1)],
    [33550, T.DOUBLE, [dLon, dLat, 0]],
    [33922, T.DOUBLE, [0, 0, 0, west, north, 0]],
    [34735, T.SHORT, [1, 1, 0, 3, 1024, 0, 1, 2, 1025, 0, 1, 1, 2048, 0, 1, 4326]],
  ];
  if (nodata != null) entries.push([42113, T.ASCII, `${nodata}\0`]);

  const ifdSize = 2 + entries.length * 12 + 4;
  let extra = 8 + ifdSize;
  const layout = entries.map(([tag, type_, vals]) => {
    const count = vals.length;
    const bytes = count * SIZE[type_];
    let off = null;
    if (bytes > 4) { off = extra; extra += bytes + (bytes % 2); }
    return { tag, type: type_, vals, count, bytes, off };
  });
  const dataOff = extra + ((8 - (extra % 8)) % 8);
  layout.find(e => e.tag === 273).vals = [dataOff];

  const buf = new ArrayBuffer(dataOff + imageBytes);
  const dv = new DataView(buf);
  dv.setUint16(0, 0x4949); dv.setUint16(2, 42, true); dv.setUint32(4, 8, true);
  let p = 8;
  dv.setUint16(p, layout.length, true); p += 2;
  const put = (o, type_, v) => {
    if (type_ === T.SHORT) dv.setUint16(o, v, true);
    else if (type_ === T.LONG) dv.setUint32(o, v, true);
    else if (type_ === T.DOUBLE) dv.setFloat64(o, v, true);
    else dv.setUint8(o, v.charCodeAt(0));
  };
  for (const e of layout) {
    dv.setUint16(p, e.tag, true); dv.setUint16(p + 2, e.type, true); dv.setUint32(p + 4, e.count, true);
    const target = e.off ?? p + 8;
    if (e.off != null) dv.setUint32(p + 8, e.off, true);
    for (let k = 0; k < e.count; k++) put(target + k * SIZE[e.type], e.type, e.type === T.ASCII ? e.vals[k] : e.vals[k]);
    p += 12;
  }
  dv.setUint32(p, 0, true);

  let o = dataOff;
  const n = width * height;
  for (let i = 0; i < n; i++) {
    for (let b = 0; b < spp; b++) {
      if (type === 'float32') { dv.setFloat32(o, bands[b][i], true); o += 4; }
      else { dv.setUint8(o, bands[b][i]); o += 1; }
    }
  }
  return buf;
}
