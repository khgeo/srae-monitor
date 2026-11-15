// Field-boundary tracing ("magic wand") on very-high-resolution imagery.
//
// The user clicks inside a field; the region of similar colour around the click is grown until it
// meets strong edges (bunds/levees, roads, canals, tree lines), cleaned with morphology so it cannot
// leak through narrow gaps in a bund, and turned into a simplified polygon.
//
// Pure functions on RGBA pixel arrays, so the same code runs in the browser and in Node tests.
// trace() works in pixel coordinates; the caller converts to lon/lat.

/** sRGB (0–255) → CIE L*a*b* (D65). Returns Float32Array [L,a,b, L,a,b, …]. */
export function toLab(rgba, n) {
  const lin = new Float32Array(256);
  for (let i = 0; i < 256; i++) { const c = i / 255; lin[i] = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const r = lin[rgba[4 * i]], g = lin[rgba[4 * i + 1]], b = lin[rgba[4 * i + 2]];
    const x = f((0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047);
    const y = f(0.2126 * r + 0.7152 * g + 0.0722 * b);
    const z = f((0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883);
    out[3 * i] = 116 * y - 16; out[3 * i + 1] = 500 * (x - y); out[3 * i + 2] = 200 * (y - z);
  }
  return out;
}

/** Separable box blur of a multi-channel float image, `passes` times (≈ Gaussian). */
export function blur(img, W, H, ch, radius = 1, passes = 2) {
  let src = img, tmp = new Float32Array(img.length), dst = new Float32Array(img.length);
  const k = 2 * radius + 1;
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < H; y++) for (let c = 0; c < ch; c++) {
      let s = 0;
      for (let x = -radius; x <= radius; x++) s += src[(y * W + Math.min(W - 1, Math.max(0, x))) * ch + c];
      for (let x = 0; x < W; x++) {
        tmp[(y * W + x) * ch + c] = s / k;
        const xo = Math.max(0, x - radius), xi = Math.min(W - 1, x + radius + 1);
        s += src[(y * W + xi) * ch + c] - src[(y * W + xo) * ch + c];
      }
    }
    for (let x = 0; x < W; x++) for (let c = 0; c < ch; c++) {
      let s = 0;
      for (let y = -radius; y <= radius; y++) s += tmp[(Math.min(H - 1, Math.max(0, y)) * W + x) * ch + c];
      for (let y = 0; y < H; y++) {
        dst[(y * W + x) * ch + c] = s / k;
        const yo = Math.max(0, y - radius), yi = Math.min(H - 1, y + radius + 1);
        s += tmp[(yi * W + x) * ch + c] - tmp[(yo * W + x) * ch + c];
      }
    }
    if (p === 0) { src = dst; dst = new Float32Array(img.length); } else { const t = src; src = dst; dst = t; }
  }
  return src;
}

/** Colour-gradient magnitude (Sobel on L, a, b; a and b weighted ×1.5 to catch green/brown bunds). */
export function gradient(lab, W, H) {
  const g = new Float32Array(W * H);
  const wt = [1, 1.5, 1.5];
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    let m = 0;
    for (let c = 0; c < 3; c++) {
      const v = (dx, dy) => lab[((y + dy) * W + x + dx) * 3 + c];
      const gx = v(1, -1) + 2 * v(1, 0) + v(1, 1) - v(-1, -1) - 2 * v(-1, 0) - v(-1, 1);
      const gy = v(-1, 1) + 2 * v(0, 1) + v(1, 1) - v(-1, -1) - 2 * v(0, -1) - v(1, -1);
      m += wt[c] * wt[c] * (gx * gx + gy * gy);
    }
    g[y * W + x] = Math.sqrt(m) / 8;
  }
  return g;
}

/**
 * Thin-line ("ridge") strength: how much a pixel differs, in the same direction, from both sides at
 * 2–3 px across, in 4 orientations. Picks up narrow bunds and paths that a gradient filter blurs away.
 * Uses L and a* (lightness and green–red), so both pale dry bunds and green grassy bunds count.
 */
export function ridge(lab, W, H) {
  const out = new Float32Array(W * H);
  const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
  for (let y = 3; y < H - 3; y++) for (let x = 3; x < W - 3; x++) {
    const i = y * W + x;
    let best = 0;
    for (const [dx, dy] of dirs) for (const d of [2, 3]) {
      const j = (y + dy * d) * W + x + dx * d, k = (y - dy * d) * W + x - dx * d;
      let s2 = 0;
      for (const [c, wt] of [[0, 1], [1, 1.5]]) {
        const v = lab[3 * i + c], a = lab[3 * j + c], b = lab[3 * k + c];
        const da = v - a, db = v - b;
        if (da * db > 0) { const m = Math.min(Math.abs(da), Math.abs(db)) * wt; s2 += m * m; }
      }
      if (s2 > best) best = s2;
    }
    out[i] = Math.sqrt(best);
  }
  return out;
}

/** Two-pass chamfer (3-4) distance to the nearest 0 pixel, in pixel units. */
export function distance(mask, W, H) {
  const INF = 1e9, d = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) d[i] = mask[i] ? INF : 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (!d[i]) continue;
    let v = d[i];
    if (x > 0) v = Math.min(v, d[i - 1] + 3);
    if (y > 0) {
      v = Math.min(v, d[i - W] + 3);
      if (x > 0) v = Math.min(v, d[i - W - 1] + 4);
      if (x < W - 1) v = Math.min(v, d[i - W + 1] + 4);
    }
    d[i] = v;
  }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
    const i = y * W + x; if (!d[i]) continue;
    let v = d[i];
    if (x < W - 1) v = Math.min(v, d[i + 1] + 3);
    if (y < H - 1) {
      v = Math.min(v, d[i + W] + 3);
      if (x < W - 1) v = Math.min(v, d[i + W + 1] + 4);
      if (x > 0) v = Math.min(v, d[i + W - 1] + 4);
    }
    d[i] = v;
  }
  for (let i = 0; i < W * H; i++) d[i] /= 3;
  return d;
}

export function erode(mask, W, H, r) {
  const d = distance(mask, W, H), out = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) out[i] = d[i] > r ? 1 : 0;
  return out;
}
export function dilate(mask, W, H, r) {
  const inv = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) inv[i] = mask[i] ? 0 : 1;
  const d = distance(inv, W, H), out = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) out[i] = d[i] <= r ? 1 : 0;
  return out;
}

/** 4-connected component of `mask` containing `seed` (index), or the nearest set pixel within maxR. */
export function componentAt(mask, W, H, seed, maxR = 12) {
  let s = -1;
  if (mask[seed]) s = seed;
  else {
    const sx = seed % W, sy = (seed / W) | 0;
    let best = Infinity;
    for (let dy = -maxR; dy <= maxR; dy++) for (let dx = -maxR; dx <= maxR; dx++) {
      const x = sx + dx, y = sy + dy;
      if (x < 0 || y < 0 || x >= W || y >= H || !mask[y * W + x]) continue;
      const dd = dx * dx + dy * dy; if (dd < best) { best = dd; s = y * W + x; }
    }
  }
  const out = new Uint8Array(W * H);
  if (s < 0) return { mask: out, count: 0 };
  const q = new Int32Array(W * H); let h = 0, tl = 0, count = 0;
  q[tl++] = s; out[s] = 1;
  while (h < tl) {
    const i = q[h++]; count++;
    const x = i % W;
    if (x > 0 && mask[i - 1] && !out[i - 1]) { out[i - 1] = 1; q[tl++] = i - 1; }
    if (x < W - 1 && mask[i + 1] && !out[i + 1]) { out[i + 1] = 1; q[tl++] = i + 1; }
    if (i >= W && mask[i - W] && !out[i - W]) { out[i - W] = 1; q[tl++] = i - W; }
    if (i < W * (H - 1) && mask[i + W] && !out[i + W]) { out[i + W] = 1; q[tl++] = i + W; }
  }
  return { mask: out, count };
}

/** Fill holes: background pixels not connected to the image border become foreground. */
export function fillHoles(mask, W, H) {
  const outside = new Uint8Array(W * H), q = new Int32Array(W * H);
  let h = 0, tl = 0;
  const push = (i) => { if (!mask[i] && !outside[i]) { outside[i] = 1; q[tl++] = i; } };
  for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x); }
  for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
  while (h < tl) {
    const i = q[h++], x = i % W;
    if (x > 0) push(i - 1); if (x < W - 1) push(i + 1);
    if (i >= W) push(i - W); if (i < W * (H - 1)) push(i + W);
  }
  const out = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) out[i] = outside[i] ? 0 : 1;
  return out;
}

/**
 * Outer boundary of a single 4-connected blob as a closed ring of pixel-corner coordinates
 * (x right, y down). Follows pixel edges keeping the region on the right-hand side.
 */
export function outline(mask, W, H) {
  const at = (x, y) => (x >= 0 && y >= 0 && x < W && y < H ? mask[y * W + x] : 0);
  let s = -1;
  for (let i = 0; i < W * H; i++) if (mask[i]) { s = i; break; }
  if (s < 0) return [];
  const sx = s % W, sy = (s / W) | 0;
  const DX = [1, 0, -1, 0], DY = [0, 1, 0, -1]; // 0 east, 1 south, 2 west, 3 north (clockwise)
  const ring = [[sx, sy]];
  let x = sx, y = sy, dir = 0;
  for (let guard = 0; guard < 4 * (W + 1) * (H + 1); guard++) {
    x += DX[dir]; y += DY[dir];
    if (x === sx && y === sy && dir === 0) break;
    if (x === sx && y === sy && at(x, y - 1) === 0 && at(x - 1, y) === 0 && at(x - 1, y - 1) === 0) break;
    // pixels ahead-left / ahead-right of corner (x, y) for the current heading
    let fl, fr;
    if (dir === 0) { fl = at(x, y - 1); fr = at(x, y); }
    else if (dir === 1) { fl = at(x, y); fr = at(x - 1, y); }
    else if (dir === 2) { fl = at(x - 1, y); fr = at(x - 1, y - 1); }
    else { fl = at(x - 1, y - 1); fr = at(x, y - 1); }
    const nd = fl ? (dir + 3) % 4 : fr ? dir : (dir + 1) % 4;
    if (nd !== dir) ring.push([x, y]);
    dir = nd;
  }
  ring.push([sx, sy]);
  return ring;
}

/** Douglas–Peucker simplification of a closed ring (first point repeated at the end). */
export function simplifyRing(ring, eps) {
  if (ring.length <= 5) return ring;
  const pts = ring.slice(0, -1);
  // split at the point farthest from the first so both halves are open polylines
  let far = 0, fd = -1;
  for (let i = 1; i < pts.length; i++) { const d = (pts[i][0] - pts[0][0]) ** 2 + (pts[i][1] - pts[0][1]) ** 2; if (d > fd) { fd = d; far = i; } }
  const dp = (p) => {
    if (p.length < 3) return p;
    const keep = new Uint8Array(p.length); keep[0] = keep[p.length - 1] = 1;
    const st = [[0, p.length - 1]];
    while (st.length) {
      const [i, j] = st.pop();
      const [ax, ay] = p[i], [bx, by] = p[j];
      const L = Math.hypot(bx - ax, by - ay) || 1e-9;
      let m = -1, md = 0;
      for (let k = i + 1; k < j; k++) {
        const d = Math.abs((bx - ax) * (ay - p[k][1]) - (ax - p[k][0]) * (by - ay)) / L;
        if (d > md) { md = d; m = k; }
      }
      if (m >= 0 && md > eps) { keep[m] = 1; st.push([i, m], [m, j]); }
    }
    return p.filter((_, k) => keep[k]);
  };
  const a = dp(pts.slice(0, far + 1)), b = dp([...pts.slice(far), pts[0]]);
  const out = [...a, ...b.slice(1)];
  return out.length >= 4 ? out : ring;
}

/**
 * Prepare an image once (Lab + smoothing + gradient); trace() can then be re-run quickly
 * with other settings or seeds.
 */
export let RIDGE_W = 1.0;
export function setRidgeWeight(w) { RIDGE_W = w; }
export function prepare(rgba, W0, H0, { scale = 1 } = {}) {
  // optional box down-sampling (scale 2 → 2×2 pixels averaged) to calm field texture and speed up
  let W = W0, H = H0, px = rgba;
  if (scale > 1) {
    W = Math.floor(W0 / scale); H = Math.floor(H0 / scale);
    px = new Uint8ClampedArray(W * H * 4);
    const n = scale * scale;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let r = 0, g = 0, b = 0;
      for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
        const k = ((y * scale + dy) * W0 + x * scale + dx) * 4; r += rgba[k]; g += rgba[k + 1]; b += rgba[k + 2];
      }
      const o = (y * W + x) * 4; px[o] = r / n; px[o + 1] = g / n; px[o + 2] = b / n; px[o + 3] = 255;
    }
  }
  const lab = blur(toLab(px, W * H), W, H, 3, 1, 2);
  const grad = gradient(lab, W, H);
  const rd = ridge(lab, W, H);
  for (let i = 0; i < W * H; i++) if (rd[i] * RIDGE_W > grad[i]) grad[i] = rd[i] * RIDGE_W;
  // robust gradient scale: 75th percentile over a sample
  const sample = [];
  for (let i = 0; i < grad.length; i += 37) sample.push(grad[i]);
  sample.sort((a, b) => a - b);
  const gScale = Math.max(1, sample[Math.floor(sample.length * 0.75)]);
  return { W, H, W0, H0, lab, grad, gScale, scale };
}

/**
 * Grow the field around a seed pixel.
 * @param prep    result of prepare()
 * @param seedX, seedY  click position in pixels
 * @param opts.tolerance  1–10: how different a pixel may be from the clicked colour (default 5)
 * @param opts.gapPx      bund gaps narrower than ~2× this are closed (pixels, default 2)
 * @param opts.maxPixels  stop if the region grows larger than this
 * @returns {{ring:number[][], areaPx:number, touchesEdge:boolean, mask:Uint8Array}|null}
 */
export function trace(prep, seedX, seedY, opts = {}) {
  const { tolerance = 5, gapPx = 2, maxPixels = Infinity, simplify = 1.2 } = opts;
  const { W, H, lab, grad, gScale } = prep;
  const sc = prep.scale || 1;
  const sx = Math.round(seedX / sc - 0.5), sy = Math.round(seedY / sc - 0.5);
  if (sx < 2 || sy < 2 || sx >= W - 2 || sy >= H - 2) return null;
  if (opts.exclude && opts.exclude[Math.round(seedY) * prep.W0 + Math.round(seedX)]) return { insideExisting: true };

  // reference colour: median of a 9×9 window around the click
  const win = [[], [], []];
  for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
    const x = Math.min(W - 1, Math.max(0, sx + dx)), y = Math.min(H - 1, Math.max(0, sy + dy));
    for (let c = 0; c < 3; c++) win[c].push(lab[(y * W + x) * 3 + c]);
  }
  const ref = win.map(v => v.sort((a, b) => a - b)[v.length >> 1]);
  let spread = 0;
  for (let k = 0; k < win[0].length; k++) spread += Math.hypot(win[0][k] - ref[0], win[1][k] - ref[1], win[2][k] - ref[2]);
  spread /= win[0].length;

  const tol = Math.max(1, Math.min(10, tolerance));
  const maxDE = Math.max(3, spread * 1.2) + tol * 1.6;   // colour distance (ΔE) from the clicked colour
  const maxG = gScale * (0.55 + tol * 0.09);             // edge strength that stops the growth
  const r = Math.max(1, gapPx);
  // barrier: strong edges, thickened by r so gaps in a bund narrower than ~2r are closed
  const strong = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) strong[i] = grad[i] > maxG ? 1 : 0;
  const barrier = dilate(strong, W, H, r);
  // pixels of fields the user already has are off limits, so neighbouring traces never overlap
  const ex = opts.exclude;
  const ok = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    if (barrier[i]) continue;
    if (ex) { const x = i % W, y = (i / W) | 0; if (ex[Math.min(prep.H0 - 1, Math.round((y + 0.5) * sc - 0.5)) * prep.W0 + Math.min(prep.W0 - 1, Math.round((x + 0.5) * sc - 0.5))]) continue; }
    const dL = lab[3 * i] - ref[0], da = lab[3 * i + 1] - ref[1], db = lab[3 * i + 2] - ref[2];
    if (dL * dL * 0.5 + da * da + db * db <= maxDE * maxDE) ok[i] = 1; // brightness counts less (shadows, wet patches)
  }
  const seed = sy * W + sx;
  const grown = componentAt(ok, W, H, seed, 3 * r + 4);
  if (!grown.count) return null;
  if (grown.count > maxPixels) return { ring: [], areaPx: grown.count, touchesEdge: true, tooLarge: true, mask: grown.mask };
  // give back the margin taken by the thickened barrier (but not across strong edges),
  // cut thin leaks, fill holes and smooth
  let m = dilate(grown.mask, W, H, r);
  for (let i = 0; i < W * H; i++) if (m[i] && strong[i] && !grown.mask[i]) m[i] = 0;
  m = dilate(erode(m, W, H, r), W, H, r);
  m = fillHoles(componentAt(m, W, H, seed, 4 * r).mask, W, H);
  const comp = componentAt(m, W, H, seed, 4 * r);
  if (!comp.count) return null;
  let touchesEdge = false;
  for (let x = 0; x < W && !touchesEdge; x++) touchesEdge = !!(comp.mask[x] || comp.mask[(H - 1) * W + x]);
  for (let y = 0; y < H && !touchesEdge; y++) touchesEdge = !!(comp.mask[y * W] || comp.mask[y * W + W - 1]);
  const ring = simplifyRing(outline(comp.mask, W, H), simplify).map(([x, y]) => [x * sc, y * sc]);
  return { ring, areaPx: comp.count * sc * sc, touchesEdge, mask: comp.mask };
}

/** Polygon area (shoelace, absolute) of a ring of [x, y]. */
export function ringArea(r) {
  let a = 0;
  for (let i = 0; i < r.length - 1; i++) a += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1];
  return Math.abs(a) / 2;
}

/** Convex hull (monotone chain) of points. */
export function convexHull(pts) {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  const h = lo.slice(0, -1).concat(up.slice(0, -1));
  return [...h, h[0]];
}

/** Solidity = area / convex-hull area (1 for convex shapes; ragged leaks and fragments score low). */
export function solidity(ring) {
  if (!ring || ring.length < 4) return 0;
  const ha = ringArea(convexHull(ring.slice(0, -1)));
  return ha > 0 ? ringArea(ring) / ha : 0;
}

/**
 * Trace at full resolution (keeps thin bunds) and at half resolution (calms textured fields) and
 * keep the better field: the smaller result if it is compact, otherwise the more compact one.
 * @param preps {fine, coarse} from prepare(…, {scale: 1}) and prepare(…, {scale: 2})
 */
export function traceAuto(preps, seedX, seedY, opts = {}) {
  const a = preps.fine ? trace(preps.fine, seedX, seedY, opts) : null;
  const b = preps.coarse ? trace(preps.coarse, seedX, seedY, { ...opts, gapPx: Math.max(1, Math.round((opts.gapPx || 2) / 2)) }) : null;
  const ok = (r) => r && r.ring && r.ring.length >= 4;
  if (!ok(a)) return b; if (!ok(b)) return a;
  a.solidity = solidity(a.ring); b.solidity = solidity(b.ring);
  const [small, big] = a.areaPx <= b.areaPx ? [a, b] : [b, a];
  const minPx = opts.minPixels || 200;
  if (small.areaPx >= minPx && small.solidity >= 0.86) return small;
  return big.solidity >= small.solidity ? big : small;
}

/** Rasterise polygon rings (pixel coordinates, even–odd rule) into a W×H mask; pixel centres are tested. */
export function rasterize(rings, W, H, into) {
  const m = into || new Uint8Array(W * H);
  let y0 = Infinity, y1 = -Infinity;
  for (const r of rings) for (const p of r) { if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
  y0 = Math.max(0, Math.floor(y0)); y1 = Math.min(H - 1, Math.ceil(y1));
  const xs = [];
  for (let y = y0; y <= y1; y++) {
    const cy = y + 0.5; xs.length = 0;
    for (const r of rings) for (let i = 0; i < r.length - 1; i++) {
      const [ax, ay] = r[i], [bx, by] = r[i + 1];
      if ((ay <= cy) !== (by <= cy)) xs.push(ax + ((cy - ay) / (by - ay)) * (bx - ax));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const a = Math.max(0, Math.ceil(xs[k] - 0.5)), b = Math.min(W - 1, Math.floor(xs[k + 1] - 0.5));
      for (let x = a; x <= b; x++) m[y * W + x] = 1;
    }
  }
  return m;
}

/**
 * Union of two traced shapes (pixel rings). Shapes that touch or almost touch (≤ 2 px) are joined;
 * returns the simplified outer ring, or null if they are apart.
 */
export function unionRings(a, b, W, H, simplify = 1.2) {
  const ma = rasterize([a], W, H), mb = rasterize([b], W, H);
  const m = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) m[i] = ma[i] | mb[i];
  const joined = erode(dilate(m, W, H, 2), W, H, 2);
  for (let i = 0; i < W * H; i++) joined[i] |= m[i];
  let seed = -1;
  for (let i = 0; i < W * H; i++) if (ma[i]) { seed = i; break; }
  const comp = componentAt(fillHoles(joined, W, H), W, H, seed);
  let bIn = false;
  for (let i = 0; i < W * H && !bIn; i++) bIn = !!(mb[i] && comp.mask[i]);
  if (!bIn) return null;
  return simplifyRing(outline(comp.mask, W, H), simplify);
}
