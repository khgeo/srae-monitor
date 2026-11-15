// Network helpers shared by every module that calls a free public service.
//
//  fetchRetry — retries when a service is busy (HTTP 429 / 502 / 503 / 504) or the connection drops,
//               waiting 1 s, 3 s, 7 s … (or the server's Retry-After), so short busy spells are invisible.
//  rateQueue  — runs calls one after another with a minimum gap, for services with a per-application
//               limit such as Nominatim (1 request per second for all users of the site together).

const RETRY_STATUS = new Set([429, 502, 503, 504]);
const sleep = (ms, signal) => new Promise((resolve, reject) => {
  if (signal?.aborted) { reject(signal.reason || new DOMException('Aborted', 'AbortError')); return; }
  const id = setTimeout(resolve, ms);
  signal?.addEventListener('abort', () => { clearTimeout(id); reject(signal.reason || new DOMException('Aborted', 'AbortError')); }, { once: true });
});

function retryDelay(res, attempt, base) {
  const ra = res && res.headers && res.headers.get('Retry-After');
  if (ra) {
    const s = Number(ra);
    const ms = Number.isFinite(s) ? s * 1000 : Date.parse(ra) - Date.now();
    if (ms > 0) return Math.min(ms, 30000);
  }
  // 1 s, 3 s, 7 s … with ±25 % jitter so many users don't retry in lock-step
  return base * (2 ** (attempt + 1) - 1) * (0.75 + Math.random() * 0.5);
}

/**
 * fetch() that retries on busy / temporary errors. Other HTTP errors (400, 404 …) are returned as-is.
 * @param {string} url
 * @param {RequestInit} [init]
 * @param {{retries?: number, base?: number, onRetry?: (attempt:number, delay:number, why:string)=>void}} [opt]
 */
export async function fetchRetry(url, init = {}, { retries = 3, base = 1000, onRetry } = {}) {
  for (let attempt = 0; ; attempt++) {
    let res, err;
    try { res = await fetch(url, init); } catch (e) { err = e; }
    if (err && (err.name === 'AbortError' || init.signal?.aborted)) throw err;
    const busy = err || RETRY_STATUS.has(res.status);
    if (!busy || attempt >= retries) {
      if (err) throw err;
      return res;
    }
    const delay = retryDelay(res, attempt, base);
    if (onRetry) onRetry(attempt + 1, delay, err ? err.message : `HTTP ${res.status}`);
    await sleep(delay, init.signal);
  }
}

/** fetchRetry + JSON, throwing `${label} <status>` on an HTTP error. */
export async function getJsonRetry(url, init, label = 'HTTP', opt) {
  const r = await fetchRetry(url, init, opt);
  if (!r.ok) throw new Error(`${label} ${r.status}`);
  return r.json();
}

/**
 * Serialise calls with at least `gapMs` between their starts.
 * const q = rateQueue(1100); q(() => fetch(...))
 */
export function rateQueue(gapMs) {
  let chain = Promise.resolve();
  let last = 0;
  return (fn) => {
    const run = chain.then(async () => {
      const wait = last + gapMs - Date.now();
      if (wait > 0) await sleep(wait);
      last = Date.now();
      return fn();
    });
    chain = run.catch(() => {}); // one failure must not block the queue
    return run;
  };
}
