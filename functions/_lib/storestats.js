/**
 * First-party storefront analytics (free, KV). One rollup key per UTC day:
 *   storestats:{YYYYMMDD} { n, pv, s, c, pages{}, refs{}, clicks{}, dev{m,d} }
 * One beacon per page visit (sent on page hide) = one KV write. To stay inside the free
 * 1,000 writes/day shared with the rest of the site, after SOFT_CAP writes in a day we keep
 * 1 in SAMPLE beacons and weight them by SAMPLE, so totals stay roughly right.
 */
import { utcDay } from "./creator.js";

const PREFIX = "storestats:";
export const SOFT_CAP = 350;
export const SAMPLE = 5;
const MAX_KEYS = 60;

function bump(map, key, w) {
  if (!key) return;
  key = String(key).slice(0, 80);
  if (!(key in map) && Object.keys(map).length >= MAX_KEYS) key = "(other)";
  map[key] = (map[key] || 0) + w;
}

export async function recordStoreBeacon(kv, b) {
  const key = PREFIX + utcDay();
  const row = (await kv.get(key, "json")) || { n: 0, pv: 0, s: 0, c: 0, pages: {}, refs: {}, clicks: {}, dev: { m: 0, d: 0 } };
  let w = 1;
  if (row.n >= SOFT_CAP) { if (Math.random() >= 1 / SAMPLE) return false; w = SAMPLE; }
  row.n += 1;
  if (b.pv) {
    row.pv += w;
    bump(row.pages, b.path || "/store/", w);
    bump(row.refs, b.ref || "direct", w);
    row.dev[b.m ? "m" : "d"] = (row.dev[b.m ? "m" : "d"] || 0) + w;
    if (b.s) row.s += w;
  }
  for (const c of (b.clicks || []).slice(0, 10)) { row.c += w; bump(row.clicks, c, w); }
  await kv.put(key, JSON.stringify(row), { expirationTtl: 400 * 86400 });
  return true;
}

function top(map, n = 10) {
  return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => ({ k, v }));
}

export async function readStoreStats(kv, days = 30) {
  const now = Date.now(), keys = [];
  for (let d = days - 1; d >= 0; d--) keys.push(utcDay(now - d * 86400000));
  const rows = await Promise.all(keys.map((k) => kv.get(PREFIX + k, "json")));
  const pages = {}, refs = {}, clicks = {}, dev = { m: 0, d: 0 };
  const chart = keys.map((k, i) => {
    const r = rows[i] || {};
    for (const [m, src] of [[pages, r.pages], [refs, r.refs], [clicks, r.clicks]]) for (const [kk, v] of Object.entries(src || {})) m[kk] = (m[kk] || 0) + v;
    dev.m += (r.dev && r.dev.m) || 0; dev.d += (r.dev && r.dev.d) || 0;
    return { d: k, pv: r.pv || 0, s: r.s || 0, c: r.c || 0 };
  });
  return { chart, pages: top(pages), refs: top(refs), clicks: top(clicks, 15), dev, since: keys[0] };
}
